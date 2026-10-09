"use client";
import { useEffect, useState, useRef } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Play, Pause, SkipForward, SkipBack } from 'lucide-react';
import ReactPlayer from 'react-player';

export default function MusicPlayer({ roomId }: { roomId: string }) {
  const { track, status, position, serverTime, isHost, skipVotes, addSkipVote } = useRoomStore();
  const { sendEvent } = useWebSocket(roomId);
  const [displayPos, setDisplayPos] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasInteracted, setHasInteracted] = useState(false);
  
  const playerRef = useRef<any>(null);

  useEffect(() => {
    const handleInteraction = () => setHasInteracted(true);
    window.addEventListener('click', handleInteraction, { once: true });
    window.addEventListener('touchstart', handleInteraction, { once: true });
    return () => {
      window.removeEventListener('click', handleInteraction);
      window.removeEventListener('touchstart', handleInteraction);
    };
  }, []);

  useEffect(() => {
    if (!playerRef.current) return;
    
    // Handle drift correction and playback state changes
    if (status === 'playing') {
      const now = Date.now();
      const elapsedSinceServer = (now - serverTime) / 1000;
      const expectedPosition = position + elapsedSinceServer;
      
      const currentPos = typeof playerRef.current.getCurrentTime === 'function' ? playerRef.current.getCurrentTime() : 0;
      const drift = Math.abs(currentPos - expectedPosition);
      
      if (drift > 1 && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(expectedPosition, 'seconds');
      }
    } else {
      if (typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(position, 'seconds');
      }
    }
  }, [status, position, serverTime]);

  const handleProgress = (state: any) => {
    if (status === 'playing') {
      setDisplayPos(state.playedSeconds);
      
      const now = Date.now();
      const elapsedSinceServer = (now - serverTime) / 1000;
      const expectedPosition = position + elapsedSinceServer;
      const drift = Math.abs(state.playedSeconds - expectedPosition);
      
      if (drift > 1.5 && playerRef.current && typeof playerRef.current.seekTo === 'function') {
        playerRef.current.seekTo(expectedPosition, 'seconds');
      }
    }
  };
  
  const handleDuration = (d: number) => {
    setDuration(d);
    useRoomStore.getState().setTrackDuration(Math.floor(d));
  };

  const handlePlayPause = () => {
    const newStatus = status === 'playing' ? 'paused' : 'playing';
    const currentPos = (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') ? playerRef.current.getCurrentTime() : displayPos || 0;
    sendEvent(newStatus === 'playing' ? 'PLAY' : 'PAUSE', { position: currentPos, trackId: track?.id });
    
    // Optimistic UI update for host
    useRoomStore.getState().updatePlaybackState(newStatus, currentPos, Date.now(), track || undefined);
  };

  // We use duration from ReactPlayer if available, else track.duration
  const currentDisplayPosition = displayPos;
  const totalDuration = duration || (track?.duration || 0);
  const progressPercent = totalDuration ? (currentDisplayPosition / totalDuration) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden p-6 shadow-2xl relative" onClick={() => setHasInteracted(true)}>
      {!hasInteracted && (
        <div className="absolute inset-0 z-50 bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm cursor-pointer transition-opacity">
          <div className="p-4 bg-purple-600 rounded-full mb-4 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.5)]">
            <Play className="w-8 h-8 text-white translate-x-0.5" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Tap to Join Audio</h3>
          <p className="text-neutral-300 text-sm text-center px-6">Your browser requires interaction to synchronize playback</p>
        </div>
      )}
      <div className="flex-1 flex flex-col items-center justify-center space-y-6">
        <div className="w-64 h-64 bg-neutral-800 rounded-xl shadow-lg border border-neutral-700/50 flex items-center justify-center overflow-hidden">
          {/* Cover Art */}
          {track?.coverUrl ? (
            <img src={track.coverUrl} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <span className="text-neutral-600 text-6xl">🎵</span>
          )}
        </div>
        
        <div className="text-center w-full px-4">
          <h2 className="text-2xl font-bold text-white truncate">{track?.title || 'No Track Selected'}</h2>
          <p className="text-neutral-400 text-sm mt-1">{track?.artist || 'Ready to Jam'}</p>
        </div>
      </div>
      
      {track && (
        <div className="absolute -top-[9999px] -left-[9999px] w-[300px] h-[300px] pointer-events-none overflow-hidden">
           {(() => {
              const Player: any = ReactPlayer;
              return (
                <Player
                  ref={playerRef}
                  url={(track as any)?.url || track?.providerTrackId || (track as any)?.provider_track_id || ''}
                  playing={status === 'playing' && hasInteracted}
                  onProgress={handleProgress}
                  onDuration={handleDuration}
                  width="100%"
                  height="100%"
                  style={{ display: 'none' }}
                  playsinline
                  config={{ file: { forceAudio: true } }}
                />
              );
           })()}
        </div>
      )}

      <div className="mt-8 space-y-4 relative z-10">
        {/* Progress bar */}
        <div className="space-y-2">
          <div 
            className="h-1.5 bg-neutral-800 w-full rounded-full overflow-hidden cursor-pointer"
            onClick={(e) => {
              if (!isHost || !totalDuration || totalDuration <= 0) return;
              const rect = e.currentTarget.getBoundingClientRect();
              const clickX = Math.max(0, e.clientX - rect.left);
              const percent = clickX / rect.width;
              const newPos = percent * totalDuration;
              if (playerRef.current?.seekTo) {
                playerRef.current.seekTo(newPos, 'seconds');
              }
              setDisplayPos(newPos);
              sendEvent('SEEK', { position: newPos, trackId: track?.id });
              useRoomStore.getState().updatePlaybackState(status, newPos, Date.now(), track || undefined);
            }}
          >
            <div className="h-full bg-purple-500 transition-all duration-300" style={{ width: `${Math.min(progressPercent, 100)}%` }} />
          </div>
          <div className="flex justify-between text-xs text-neutral-500 font-mono">
            <span>{Math.floor(currentDisplayPosition / 60)}:{(Math.floor(currentDisplayPosition % 60) + '').padStart(2, '0')}</span>
            <span>{totalDuration ? `${Math.floor(totalDuration / 60)}:${(Math.floor(totalDuration % 60) + '').padStart(2, '0')}` : '0:00'}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex justify-center items-center space-x-6">
          {isHost ? (
            <>
              <button 
                className="text-neutral-400 hover:text-white transition"
                onClick={() => {
                   if (!isHost || !track) return;
                   const newPos = 0;
                   if (playerRef.current?.seekTo) playerRef.current.seekTo(newPos, 'seconds');
                   sendEvent("SEEK", { position: newPos, trackId: track.id, status });
                   useRoomStore.getState().updatePlaybackState(status, newPos, Date.now(), track);
                }}
              >
                <SkipBack className="w-6 h-6" fill="currentColor" />
              </button>
              <button 
                onClick={handlePlayPause}
                className="w-16 h-16 bg-white text-black hover:bg-neutral-200 transition-transform rounded-full flex items-center justify-center shadow-lg active:scale-95"
              >
                {status === 'playing' ? (
                  <Pause className="w-7 h-7" fill="currentColor" />
                ) : (
                  <Play className="w-7 h-7 translate-x-1" fill="currentColor" />
                )}
              </button>
              <button 
                className="text-neutral-400 hover:text-white transition"
                onClick={() => {
                   if (!isHost) return;
                   const { queue } = useRoomStore.getState();
                   const currentIndex = queue.findIndex((q: any) => q.track.id === track?.id);
                   if (currentIndex >= 0 && currentIndex < queue.length - 1) {
                      const nextItem = queue[currentIndex + 1];
                      sendEvent("SONG_CHANGED", { trackId: nextItem.track.id, position: 0, status: "playing" });
                      useRoomStore.getState().updatePlaybackState("playing", 0, Date.now(), nextItem.track);
                   }
                }}
              >
                <SkipForward className="w-6 h-6" fill="currentColor" />
              </button>
            </>
          ) : (
            <button 
              onClick={addSkipVote}
              className="px-6 py-2 bg-neutral-800 hover:bg-neutral-700/80 rounded-full text-sm font-medium transition"
            >
              Skip Vote ({skipVotes}/3)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
