import { useEffect, useRef, useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';

export function DemoMusicPlayer({ sendEvent }: { sendEvent: (type: string, payload: any) => void }) {
  const playerRef = useRef<HTMLAudioElement | null>(null);
  const { status, position, serverTime, track, isHost, roomId, setTrackDuration } = useRoomStore();
  const [needsInteraction, setNeedsInteraction] = useState(false);

  const rawSrc = (track as any)?.url || track?.providerTrackId || (track as any)?.provider_track_id;
  const baseSrc = track?.id === 'live_audio' ? undefined : rawSrc;
  const src = baseSrc ? encodeURI(baseSrc) : undefined;

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.muted = Boolean(isHost && track?.id === 'live_audio');
    }
    if (!playerRef.current || (!src && track?.id !== 'live_audio')) return;

    // Check drift manually on play loops
    const currentPos = playerRef.current.currentTime;

    if (status === 'playing') {
      // Normalize serverTime to milliseconds handle both Date.now() and time.time()
      const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
      const timeElapsed = (Date.now() - normalizedServerTime) / 1000;
      const expectedPosition = position + timeElapsed;

      const isLiveStream = track?.duration === 0;
      // Prevent hard iOS stutters by snapping only on large skips, adjusting tempo otherwise
      if (!isLiveStream) {
        const drift = expectedPosition - currentPos;
        if (Math.abs(drift) > 1.0) {
          playerRef.current.currentTime = expectedPosition;
        }
      }

      // Attempt play and capture strict browser restrictions unconditionally 
      // Force `.play()` here even if not internally `paused` to circumvent iOS Safari instantly suspending streams upon long scrubs
      const playPromise = playerRef.current.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          if (error.name === 'AbortError') {
            return;
          }
          if (error.name === 'NotAllowedError') {
            setNeedsInteraction(true);
            return;
          }
        });
      }
    } else {
      playerRef.current.pause();
      const isLiveStream = track?.duration === 0;
      if (!isLiveStream && Math.abs(currentPos - position) > 0.1) {
        playerRef.current.currentTime = position;
      }
    }
  }, [status, position, serverTime, src, track]);

  // Bind OS Media Session API to broadcast controls rather than local halts
  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.setActionHandler('play', () => {
        if (isHost && track) {
          const currentPos = playerRef.current ? playerRef.current.currentTime : position;
          sendEvent("PLAY", { position: currentPos, trackId: track.id });
          useRoomStore.getState().updatePlaybackState("playing", currentPos, Date.now(), track);
        }
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        if (isHost && track) {
          const currentPos = playerRef.current ? playerRef.current.currentTime : position;
          sendEvent("PAUSE", { position: currentPos, trackId: track.id });
          useRoomStore.getState().updatePlaybackState("paused", currentPos, Date.now(), track);
        }
      });
    }
  }, [isHost, track, position, roomId]);

  // Force unmute on normal tracks, but strictly suppress for host broadcast
  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.volume = 1.0;
      playerRef.current.muted = Boolean(isHost && track?.id === 'live_audio');
      console.log("Audio source updated to:", src);
    }
  }, [src, isHost, track?.id]);

  const { liveStream } = useRoomStore();

  useEffect(() => {
    if (playerRef.current && track?.id === "live_audio" && liveStream) {
      console.log("Mounting WebRTC live stream srcObject");
      playerRef.current.srcObject = liveStream;
      playerRef.current.play().catch(e => {
        console.warn("Blocked Autoplay:", e);
        setNeedsInteraction(true);
      });
    } else if (playerRef.current && playerRef.current.srcObject) {
      playerRef.current.srcObject = null;
    }
  }, [track?.id, liveStream]);

  const handleAudioLoaded = () => {
    if (playerRef.current) {
      // Extrapolate exact duration natively directly from the mp3 metadata to fix 180s default fallbacks for Custom Streams
      const nativeDuration = playerRef.current.duration;
      if (nativeDuration && nativeDuration !== Infinity && track && track.duration !== nativeDuration) {
        setTrackDuration(nativeDuration);
      }

      if (status === 'playing') {
        const isLiveStream = track?.id === 'live_audio';
        
        if (!isLiveStream) {
          const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
          const timeElapsed = (Date.now() - normalizedServerTime) / 1000;
          const expectedPosition = position + timeElapsed;
          if (Math.abs(playerRef.current.currentTime - expectedPosition) > 2.0) {
            playerRef.current.currentTime = expectedPosition;
          }
        }
        
        playerRef.current.volume = 1.0;
        playerRef.current.muted = Boolean(isHost && track?.id === 'live_audio');
        playerRef.current.play().catch(e => {
          if (e.name === 'NotAllowedError') setNeedsInteraction(true);
        });
      }
    }
  };

  const handleTimeUpdate = () => {
    if (status === 'playing' && playerRef.current) {
      const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
      const timeElapsed = (Date.now() - normalizedServerTime) / 1000;
      const expectedPosition = position + timeElapsed;
      const isLiveStream = track?.duration === 0;

      if (!isLiveStream) {
        const drift = expectedPosition - playerRef.current.currentTime;
        if (Math.abs(drift) > 1.0) {
          playerRef.current.currentTime = expectedPosition;
        } else {
          // Keep strict 1.0 rate. iOS Safari severely stutters ("starts and stops") if playbackRate is dynamically modulated.
          if (playerRef.current.playbackRate !== 1.0) {
            playerRef.current.playbackRate = 1.0;
          }
        }
      }
    }
  };

  const handleNativePlay = () => {};
  const handleNativePause = () => {};

  const handleCanPlay = () => {
    // A strict safety net: if the browser aborted a scrub via DOMException but is now buffered and ready, resurrect it natively
    if (status === 'playing' && playerRef.current && playerRef.current.paused) {
      playerRef.current.play().catch(e => {
        console.warn("Blocked Autoplay:", e);
        setNeedsInteraction(true);
      });
    }
  };

  const handleEnded = () => {
    if (!isHost) return;
    const { queue } = useRoomStore.getState();
    if (queue && queue.length > 0) {
      const currentIndex = queue.findIndex((q: any) => q.track.id == track?.id);
      const nextItem = currentIndex >= 0 && currentIndex < queue.length - 1 ? queue[currentIndex + 1] : queue[0];
      sendEvent("SONG_CHANGED", { trackId: nextItem.track.id, position: 0, status: "playing" });
      useRoomStore.getState().updatePlaybackState("playing", 0, Date.now(), nextItem.track);
    }
  };

  // Invisible Global Unlocker seamlessly overrides strict Safari/Chrome Autoplay policies
  useEffect(() => {
    const unlockAudio = () => {
      if (needsInteraction && playerRef.current && status === 'playing') {
        setNeedsInteraction(false);
        playerRef.current.volume = 1.0;
        playerRef.current.muted = Boolean(isHost && track?.id === 'live_audio');
        playerRef.current.play().catch(() => {});
      }
    };

    if (needsInteraction) {
      document.addEventListener('click', unlockAudio, { once: true });
      document.addEventListener('touchstart', unlockAudio, { once: true });
      return () => {
        document.removeEventListener('click', unlockAudio);
        document.removeEventListener('touchstart', unlockAudio);
      };
    }
  }, [needsInteraction, status, track?.id, isHost]);

  return (
    <>
      <audio
        ref={playerRef}
        {...(src ? { src } : {})}
        preload="metadata"
        autoPlay
        playsInline
        muted={isHost && track?.id === 'live_audio'}
        onLoadedMetadata={handleAudioLoaded}

        onTimeUpdate={handleTimeUpdate}
        onPlay={handleNativePlay}
        onPause={handleNativePause}
        onCanPlay={handleCanPlay}
        onEnded={handleEnded}
        className="hidden"
      />
      {needsInteraction && (
        <div 
          className="fixed inset-0 z-[9999] bg-black/80 flex flex-col items-center justify-center backdrop-blur-sm cursor-pointer transition-opacity" 
          onClick={() => {
            if (playerRef.current && status === 'playing') {
              setNeedsInteraction(false);
              playerRef.current.volume = 1.0;
              playerRef.current.muted = Boolean(isHost && track?.id === 'live_audio');
              playerRef.current.play().catch(e => console.error("Final play error: ", e));
            }
          }}
        >
          <div className="p-4 bg-purple-600 rounded-full mb-4 animate-pulse shadow-[0_0_30px_rgba(168,85,247,0.5)]">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-white translate-x-0.5"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Tap to Join Audio</h3>
          <p className="text-neutral-300 text-sm text-center px-6">Your browser requires interaction to synchronize playback</p>
        </div>
      )}
    </>
  );
}
