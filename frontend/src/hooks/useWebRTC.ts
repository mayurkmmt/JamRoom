import { useEffect, useRef, useCallback } from 'react';
import { useRoomStore } from '@/stores/roomStore';

const ICE_SERVERS = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

export function useWebRTC(sendEvent: (type: string, payload: any) => void) {
  const { isHost, clientId, setLiveStream, track, liveStream } = useRoomStore();
  const connections = useRef<Record<string, RTCPeerConnection>>({});
  const iceCandidatesQueue = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const localStream = useRef<MediaStream | null>(null);

  // Host creates connection, adds tracks, creates offer, sends to target
  const initiateConnection = useCallback(async (targetClientId: string) => {
    if (!localStream.current) return;

    if (connections.current[targetClientId]) {
       connections.current[targetClientId].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    connections.current[targetClientId] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendEvent("WEBRTC_ICE", { sender: clientId, target: targetClientId, candidate: event.candidate });
      }
    };

    localStream.current.getTracks().forEach(track => {
       pc.addTrack(track, localStream.current!);
    });

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendEvent("WEBRTC_OFFER", { sender: clientId, target: targetClientId, sdp: offer });
    } catch (err) {
      console.error("Failed to create offer", err);
    }
  }, [clientId, sendEvent]);

  // Listener receives offer, creates connection, sets remote, creates answer, sends to host
  const handleOffer = useCallback(async (data: any) => {
    if (data.target !== clientId) return; // Only process if meant for me
    
    // Cleanup old connection if it exists
    if (connections.current[data.sender]) {
       connections.current[data.sender].close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    connections.current[data.sender] = pc;

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendEvent("WEBRTC_ICE", { sender: clientId, target: data.sender, candidate: event.candidate });
      }
    };

    pc.ontrack = (event) => {
      const stream = event.streams && event.streams[0] ? event.streams[0] : new MediaStream([event.track]);
      setLiveStream(stream);
    };

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      if (iceCandidatesQueue.current[data.sender]) {
        for (const candidate of iceCandidatesQueue.current[data.sender]) {
          await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
        }
        delete iceCandidatesQueue.current[data.sender];
      }
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      sendEvent("WEBRTC_ANSWER", { sender: clientId, target: data.sender, sdp: answer });
    } catch (err) {
      console.error("Error generating answer", err);
    }
  }, [clientId, sendEvent, setLiveStream]);

  // Host receives answer
  const handleAnswer = useCallback(async (data: any) => {
    if (data.target !== clientId) return;
    const pc = connections.current[data.sender];
    if (pc) {
      if (pc.signalingState !== 'have-local-offer') {
        return;
      }
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        if (iceCandidatesQueue.current[data.sender]) {
          for (const candidate of iceCandidatesQueue.current[data.sender]) {
            await pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(console.error);
          }
          delete iceCandidatesQueue.current[data.sender];
        }
      } catch (err) {
        console.error("Error setting answer", err);
      }
    }
  }, [clientId]);

  // Both handle ICE candidates
  const handleIceCandidate = useCallback(async (data: any) => {
    if (data.target !== clientId) return;
    const pc = connections.current[data.sender];
    
    if (pc && pc.remoteDescription) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      } catch (err) {}
    } else {
      if (!iceCandidatesQueue.current[data.sender]) {
         iceCandidatesQueue.current[data.sender] = [];
      }
      iceCandidatesQueue.current[data.sender].push(data.candidate);
    }
  }, [clientId]);

  const lastRequest = useRef<Record<string, number>>({});

  // Global listener for decoupled window events spawned by useWebSocket
  useEffect(() => {
    const handleSignal = (e: any) => {
      const data = e.detail;
      if (data.type === "WEBRTC_OFFER") handleOffer(data);
      else if (data.type === "WEBRTC_ANSWER") handleAnswer(data);
      else if (data.type === "WEBRTC_ICE") handleIceCandidate(data);
      else if (data.type === "STOP_BROADCAST") stopBroadcasting();
      else if (data.type === "BROADCAST_STARTED" && !useRoomStore.getState().isHost) {
         sendEvent("REQUEST_WEBRTC", { target: useRoomStore.getState().clientId });
      }
      else if (data.type === "REQUEST_WEBRTC" && useRoomStore.getState().isHost && localStream.current) {
         const now = Date.now();
         if (!lastRequest.current[data.target] || now - lastRequest.current[data.target] > 2000) {
            lastRequest.current[data.target] = now;
            initiateConnection(data.target);
         }
      }
    };

    window.addEventListener('webrtc_signal', handleSignal);
    return () => window.removeEventListener('webrtc_signal', handleSignal);
  }, [handleOffer, handleAnswer, handleIceCandidate, initiateConnection, sendEvent]);

  // Self-Healing WebRTC Resilience Loop: Auto-recover stale or missed connections for late joiners
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (!isHost && track?.id === "live_audio" && !liveStream) {
      // Fire payload safely
      sendEvent("REQUEST_WEBRTC", { target: clientId });
      interval = setInterval(() => {
        const pcs = Object.values(connections.current);
        if (pcs.length > 0) {
           const state = pcs[0].connectionState;
           if (state === "new" || state === "connecting" || state === "connected") {
             return; // Do not interrupt an active or pending connection on slower networks
           }
        }
        sendEvent("REQUEST_WEBRTC", { target: clientId });
      }, 5000);
    }
    return () => {
      if (interval) clearInterval(interval);
    }
  }, [isHost, track?.id, !!liveStream, clientId, sendEvent]);

  const stopBroadcasting = () => {
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    setLiveStream(null);
    Object.values(connections.current).forEach(c => c.close());
    connections.current = {};
    
    // Resume to first valid track or clear if none
    const nextItem = useRoomStore.getState().queue[0];
    if (nextItem) {
      sendEvent("SONG_CHANGED", { trackId: nextItem.track.id, position: 0, status: "paused" });
      useRoomStore.getState().updatePlaybackState("paused", 0, Date.now(), nextItem.track);
    } else {
      sendEvent("SONG_CHANGED", { trackId: "none", position: 0, status: "paused" });
      useRoomStore.getState().updatePlaybackState("paused", 0, Date.now(), { id: "none", provider: "local", providerTrackId: "", title: "", artist: "", duration: 0, url: "", thumbnail_url: "" } as any);
    }
  };

  const startBroadcasting = async () => {
    try {
      if (!navigator.mediaDevices) {
        alert("Your browser blocks audio sharing! You must be on a secure connection (localhost or HTTPS).");
        return;
      }
      
      let stream: MediaStream;
      if (navigator.mediaDevices.getDisplayMedia) {
         stream = await navigator.mediaDevices.getDisplayMedia({ audio: true, video: true });
      } else {
        // Fallback for mobile devices which do not support getDisplayMedia
        // Disabling AEC/NR forces "Media" audio focus instead of "Communication", preventing the OS from pausing Spotify on Android.
        stream = await navigator.mediaDevices.getUserMedia({ 
          audio: { 
            echoCancellation: false, 
            noiseSuppression: false, 
            autoGainControl: false 
          } 
        });
      }

      const audioTrack = stream.getAudioTracks()[0];
      if (!audioTrack) {
         stream.getTracks().forEach(t => t.stop());
         alert("No audio track detected! Please make sure to allow audio sharing.");
         return;
      }

      audioTrack.onended = () => stopBroadcasting();
      
      stream.getVideoTracks().forEach(t => t.stop());
      const audioOnlyStream = new MediaStream([audioTrack]);
      
      localStream.current = audioOnlyStream;
      setLiveStream(audioOnlyStream);

      sendEvent("BROADCAST_STARTED", {});
      
      // Update global queue state to represent live broadcast
      sendEvent("SONG_CHANGED", { trackId: "live_audio", position: 0, status: "playing" });
      useRoomStore.getState().updatePlaybackState("playing", 0, Date.now(), {
          id: "live_audio",
          provider: "local",
          providerTrackId: "live_audio",
          title: "Live System Audio",
          artist: "Host Broadcast",
          duration: 0,
          url: "live_audio",
          thumbnail_url: ""
      } as any);

    } catch (e: any) {
      if (e.name !== 'NotAllowedError') {
        console.error("Failed to start WebRTC:", e);
        alert("Failed to start broadcasting.");
      }
    }
  };

  return { startBroadcasting, stopBroadcasting };
}
