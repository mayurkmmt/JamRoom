import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/stores/roomStore';

export function useWebSocket(roomId: string | null) {
  const ws = useRef<WebSocket | null>(null);
  const { updatePlaybackState, addMessage, setQueue, setMessages, addReaction, setParticipants } = useRoomStore();

  useEffect(() => {
    if (!roomId) return;
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const WS_BASE = `${wsProtocol}//${window.location.host}`;

    let socket: WebSocket | null = null;
    let isMounted = true;

    fetch(`/api/rooms/${roomId}/messages`)
      .then(r => r.json())
      .then(data => {
        if (isMounted) setMessages(Array.isArray(data) ? data : []);
      })
      .catch(e => console.error(e));

    // Connect WebSocket only AFTER queue is securely loaded so track IDs match
    fetch(`/api/rooms/${roomId}/queue`)
      .then(r => {
        if (!r.ok) {
           if (r.status === 404) {
             useRoomStore.getState().clearRoom();
             window.location.href = '/';
           }
           throw new Error('Failed fetching queue');
        }
        return r.json();
      })
      .then(qData => {
        if (!isMounted) return;
        setQueue(Array.isArray(qData) ? qData : []);
        socket = new WebSocket(`${WS_BASE}/ws/rooms/${roomId}`);
        ws.current = socket;

        socket.onopen = () => {
          const state = useRoomStore.getState();
          if (!state.isHost && state.userName) {
             socket!.send(JSON.stringify({ type: "REQUEST_WEBRTC", target: state.clientId }));
          }
        };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      console.log('WS Event', data);

      if (['ROOM_STATE', 'PLAY', 'PAUSE', 'SEEK', 'SONG_CHANGED'].includes(data.type)) {
        if (data.type === 'ROOM_STATE' && data.participants) {
          setParticipants(data.participants);
        }
        
        let resolvedTrack = undefined;
        
        if (data.trackId) {
           if (data.trackId === 'live_audio') {
             resolvedTrack = {
               id: 'live_audio',
               provider: 'local',
               providerTrackId: 'live_audio',
               title: 'Live System Audio',
               artist: 'Host Broadcast',
               duration: 0,
               url: 'live_audio',
               thumbnail_url: ''
             } as any;
           } else {
             const cachedTrackNode = useRoomStore.getState().queue.find((q: any) => q.track.id === data.trackId || q.track.provider_track_id === data.trackId);
             let cachedTrack = cachedTrackNode ? cachedTrackNode.track : undefined;
             if (cachedTrack) {
               const currentTrack = useRoomStore.getState().track;
               if (currentTrack && currentTrack.id === cachedTrack.id && currentTrack.duration && currentTrack.duration !== cachedTrack.duration) {
                  cachedTrack = { ...cachedTrack, duration: currentTrack.duration };
               }
               resolvedTrack = cachedTrack;
             } else {
               fetch(`/api/library/${data.trackId}`)
                 .then(r => r.ok && r.json())
                 .then(t => {
                    useRoomStore.getState().updatePlaybackState(
                       data.status || useRoomStore.getState().status,
                       data.position || 0,
                       data.serverTime || Date.now(),
                       t
                    );
                 });
             }
           }
        }
        
        // Calculate relative age of the state using backend's timeline difference, completely bypassing PC clock differences
        let stateAgeMs = 0;
        if (data.currentServerTime && data.serverTime) {
          stateAgeMs = (data.currentServerTime - data.serverTime) * 1000;
        }
        const localEffectiveStartTime = Date.now() - stateAgeMs;
        const currentState = useRoomStore.getState();
        // Prevent host backwards rollback from network ping echoing
        if (currentState.isHost && data.type !== 'ROOM_STATE') {
           if (data.status === currentState.status && data.position === currentState.position) {
              if (!(data.type === 'SONG_CHANGED' && currentState.track?.id !== resolvedTrack?.id)) {
                 return; // Silently ignore the network echo and preserve original optimistic Date.now() timestamp without skipping
              }
           }
        }
        
        updatePlaybackState(
          data.status,
          data.position,
          localEffectiveStartTime,
          resolvedTrack
        );
      } else if (data.type === 'CHAT_MESSAGE') {
        const { messages } = useRoomStore.getState();
        if (!messages.some(m => m.id === data.id)) {
           addMessage({ message: data.message, author: data.author, id: data.id });
        }
      } else if (data.type === 'QUEUE_UPDATED') {
        fetch(`/api/rooms/${roomId}/queue`)
          .then(r => r.json())
          .then(q => setQueue(q));
      } else if (data.type === 'REACTION') {
        addReaction({ id: Date.now(), reaction: data.reaction });
      } else if (data.type === 'USER_JOINED' && data.user) {
        useRoomStore.setState((state) => {
           if (state.participants.some(p => p.name === data.user.name)) return state;
           return { participants: [...state.participants, data.user] };
        });
      } else if (data.type === 'USER_LEFT') {
        if (data.user && data.user.name) {
          useRoomStore.setState((state) => ({
            participants: state.participants.filter(p => p.name !== data.user.name)
          }));
        }
      } else if (data.type === 'HOST_TRANSFERRED') {
         const { userName } = useRoomStore.getState();
         useRoomStore.setState({
            participants: data.participants,
            isHost: userName === data.newHostName
         });
         
         if (userName !== data.newHostName) {
            window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: { type: 'STOP_BROADCAST' } }));
         }
      } else if (data.type === 'ROOM_ENDED') {
        useRoomStore.getState().clearRoom();
        window.location.href = '/';
      } else if (data.type.startsWith('WEBRTC_') || data.type === 'REQUEST_WEBRTC' || data.type === 'BROADCAST_STARTED') {
        window.dispatchEvent(new CustomEvent('webrtc_signal', { detail: data }));
      }
    };

    socket.onclose = () => {
      console.log('WebSocket disconnected, reconnecting in 2s...');
      setTimeout(() => {
        // Simple reconnect logic
      }, 2000);
    };
  })
  .catch(e => console.error("Queue fetch failure on mount", e));

  return () => {
    isMounted = false;
    if (socket) {
      socket.close();
    }
  };
}, [roomId, updatePlaybackState]);

  const sendEvent = useCallback((type: string, payload: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type, ...payload }));
    }
  }, []);

  return { sendEvent };
}
