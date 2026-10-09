"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Settings, LogOut,
  Music, Plus, Users, Crown, MessageSquare, ChevronDown, Mic, Copy, Check
} from "lucide-react";
import { useRoomStore } from "@/stores/roomStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { DemoMusicPlayer } from "@/components/DemoMusicPlayer";
import { TrackSelectorModal } from "@/components/TrackSelectorModal";
import { useWebRTC } from "@/hooks/useWebRTC";

export default function RoomPage() {
  const router = useRouter();
  const rawParams = useParams();
  const roomId = rawParams.roomId as string;
  const { isHost, status, updatePlaybackState, queue, participants, track, messages, reactions, position, serverTime, userName, roomName, setChatOpen, unreadMessages, popupMessage, clearPopupMessage } = useRoomStore();
  const { sendEvent } = useWebSocket(roomId);
  const { startBroadcasting, stopBroadcasting } = useWebRTC(sendEvent);

  const isLiveAudio = track?.id === "live_audio";

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const storeRoomId = useRoomStore.getState().roomId;
    if (mounted && (!userName || (storeRoomId && storeRoomId.toUpperCase() !== roomId.toUpperCase()))) {
      router.replace(`/`);
    }
  }, [mounted, userName, roomId, router]);

  const [activeTab, setActiveTab] = useState<"queue" | "listeners" | "chat">("queue");
  const [chatInput, setChatInput] = useState("");
  const [isTrackModalOpen, setIsTrackModalOpen] = useState(false);

  const progressBarRef = useRef<HTMLDivElement>(null);
  const currentTimeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    setChatOpen(activeTab === "chat");
  }, [activeTab, setChatOpen]);

  useEffect(() => {
    if (popupMessage) {
      const timer = setTimeout(() => clearPopupMessage(), 4000);
      return () => clearTimeout(timer);
    }
  }, [popupMessage, clearPopupMessage]);

  // Intelligently inject the local host to the top of the participant list 
  const displayParticipants = [
    ...(isHost && !participants.some(p => p.role === 'host') ? [{ name: userName || "Host", role: "host", id: "host" }] : []),
    ...participants
  ].sort((a, b) => {
    if (a.role === 'host' && b.role !== 'host') return -1;
    if (b.role === 'host' && a.role !== 'host') return 1;
    return 0;
  });

  const formatTime = (secs: number) => {
    if (!secs || isNaN(secs)) return "0:00";
    const hours = Math.floor(secs / 3600);
    const minutes = Math.floor((secs % 3600) / 60);
    const seconds = Math.floor(secs % 60);
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const trackDuration = track?.duration || 180;

  // Sync UI progress natively without suffocating React's main thread on mobile iOS Safari
  useEffect(() => {
    if (!track) return;

    const syncProgress = () => {
      const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
      const timeElapsed = status === 'playing' ? (Date.now() - normalizedServerTime) / 1000 : 0;
      const expectedSeconds = position + timeElapsed;
      const newPercent = Math.max(0, Math.min((expectedSeconds / trackDuration) * 100, 100));

      // Mutate native DOM directly, bypassing React tree diffing
      if (progressBarRef.current) {
        progressBarRef.current.style.width = `${newPercent}%`;
      }
      if (currentTimeRef.current) {
        currentTimeRef.current.textContent = formatTime(expectedSeconds);
      }
    };

    syncProgress(); // execute instantly on state load

    let interval: NodeJS.Timeout;
    if (status === 'playing') {
      interval = setInterval(syncProgress, 250); // CSS transition-duration 300ms handles the sub-frame tweening flawlessly
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [position, serverTime, status, track, trackDuration]);

  const togglePlay = () => {
    if (!track) {
      alert("Please add a track to the queue and click on it to start playing!");
      return;
    }
    const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
    const timeElapsed = status === 'playing' ? (Date.now() - normalizedServerTime) / 1000 : 0;
    const exactPos = position + timeElapsed;
    const newStatus = status === "playing" ? "PAUSE" : "PLAY";

    // Normal listener can only toggle locally; host controls broadcast
    if (isHost) {
      sendEvent(newStatus, {
        position: exactPos,
        trackId: track.id
      });
      // Optimistic update
      updatePlaybackState(status === "playing" ? "paused" : "playing", exactPos, Date.now(), track);
    } else {
      // Allow listener to pause just their own local audio synchronously
      if (newStatus === "PLAY") {
        const { globalStatus } = useRoomStore.getState();
        if (globalStatus === "paused") {
          alert("The host has paused the session. You cannot resume playback until the host starts playing again.");
          return;
        } else {
          // Host is actively playing so switch local flag to snap audio perfectly back to the host live position
          useRoomStore.setState({ status: "playing" });
        }
      } else {
        useRoomStore.setState({ status: "paused", position: exactPos, serverTime: Date.now() });
      }
    }
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isHost) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));

    if (progressBarRef.current) progressBarRef.current.style.width = `${percent}%`;

    const targetSeconds = (percent / 100) * trackDuration;
    sendEvent("SEEK", { position: targetSeconds });
    updatePlaybackState(status, targetSeconds, Date.now(), track || undefined);
  };

  const handleSkip = () => {
    if (!isHost) return;
    if (queue.length > 0) {
      const currentIndex = queue.findIndex((q: any) => q.track.id == track?.id);
      const nextItem = currentIndex >= 0 && currentIndex < queue.length - 1 ? queue[currentIndex + 1] : queue[0];
      sendEvent("SONG_CHANGED", { trackId: nextItem.track.id, position: 0, status: "playing" });
      updatePlaybackState("playing", 0, Date.now(), nextItem.track);
      if (progressBarRef.current) progressBarRef.current.style.width = '0%';
      if (currentTimeRef.current) currentTimeRef.current.textContent = '0:00';
    }
  };

  const handlePrevious = () => {
    if (!isHost) return;
    const normalizedServerTime = serverTime > 1e10 ? serverTime : serverTime * 1000;
    const timeElapsed = status === 'playing' ? (Date.now() - normalizedServerTime) / 1000 : 0;
    const exactPos = position + timeElapsed;

    // Restart if played for more than 3 seconds or if alone in queue
    if (exactPos > 3 || queue.length === 0) {
      sendEvent("SEEK", { position: 0 });
      updatePlaybackState(status, 0, Date.now(), track || undefined);
      if (progressBarRef.current) progressBarRef.current.style.width = '0%';
      if (currentTimeRef.current) currentTimeRef.current.textContent = '0:00';
    } else {
      const currentIndex = queue.findIndex((q: any) => q.track.id == track?.id);
      const prevItem = currentIndex > 0 ? queue[currentIndex - 1] : queue[queue.length - 1];
      if (prevItem) {
        sendEvent("SONG_CHANGED", { trackId: prevItem.track.id, position: 0, status: "playing" });
        updatePlaybackState("playing", 0, Date.now(), prevItem.track);
        if (progressBarRef.current) progressBarRef.current.style.width = '0%';
        if (currentTimeRef.current) currentTimeRef.current.textContent = '0:00';
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    try {
      await fetch(`/api/rooms/${roomId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author_name: userName || (isHost ? "Host" : "Anonymous"), message: chatInput })
      });
      setChatInput("");
    } catch { }
  };

  const sendReaction = async (emoji: string) => {
    try {
      await fetch(`/api/rooms/${roomId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reaction: emoji, track_id: track?.id ? track.id.toString() : undefined })
      });
    } catch { }
  };

  const handleAddTrack = async (selectedTrack: any) => {
    if (isLiveAudio) {
      alert("Please stop the live broadcast before modifying the queue.");
      return;
    }
    try {
      await fetch(`/api/rooms/${roomId}/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          track: selectedTrack,
          added_by: userName || (isHost ? "Host" : "Anonymous")
        })
      });
      setIsTrackModalOpen(false);
    } catch (err) {
      console.error("Add track failed:", err);
    }
  };

  const storeRoomId = useRoomStore.getState().roomId;
  if (!mounted || !userName || !storeRoomId || storeRoomId.toUpperCase() !== roomId.toUpperCase()) {
    return <div className="min-h-screen bg-[#0A0A0E]" />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-[#0A0A0E] text-white">
      {/* Background Ambience */}
      <div className="fixed inset-0 z-0 pointer-events-none flex items-center justify-center">
        <div className="absolute top-0 w-full h-[80vh] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-fuchsia-900/20 via-indigo-900/5 to-transparent" />
      </div>

      {popupMessage && (
        <div
          onClick={() => { setActiveTab("chat"); clearPopupMessage(); }}
          className="fixed bottom-6 right-6 z-50 bg-[#1A1A24] border border-fuchsia-500/30 p-4 rounded-xl shadow-2xl animate-in slide-in-from-bottom-5 w-72 flex flex-col gap-1 cursor-pointer hover:scale-105 transition-transform"
        >
          <div className="text-xs font-bold text-fuchsia-400">New message from {popupMessage.author || popupMessage.author_name}</div>
          <div className="text-sm text-white truncate">{popupMessage.message}</div>
        </div>
      )}

      {/* Top Navigation */}
      <header className="relative z-10 flex flex-wrap items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-white/5 bg-[#05030A]/80 backdrop-blur-xl gap-4">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold tracking-tight">{roomName || "Jam Room"}</h1>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold tracking-widest uppercase">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Live
          </div>
          <div className="flex items-center gap-2 ml-2">
            <span className="text-neutral-500 text-sm font-medium">Code: <span className="text-white tracking-wider">{roomId}</span></span>
            <button
              onClick={() => {
                if (navigator.clipboard && window.isSecureContext) {
                  navigator.clipboard.writeText(roomId);
                } else {
                  const textArea = document.createElement("textarea");
                  textArea.value = roomId;
                  document.body.appendChild(textArea);
                  textArea.select();
                  try { document.execCommand('copy'); } catch (err) {}
                  document.body.removeChild(textArea);
                }
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
              title="Copy Room Code"
              className="p-1.5 rounded-md bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-neutral-400 hover:text-white flex items-center justify-center"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isHost && (
            <>
              {isLiveAudio ? (
                <button
                  onClick={stopBroadcasting}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-rose-500/20 border border-rose-500/30 hover:bg-rose-500/40 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-rose-400"
                >
                  <Mic className="w-4 h-4 animate-pulse" /> <span className="hidden sm:inline">Stop Broadcast</span>
                </button>
              ) : (
                <button
                  onClick={startBroadcasting}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/40 rounded-lg text-xs sm:text-sm font-semibold transition-colors text-emerald-400"
                >
                  <Mic className="w-4 h-4" /> <span className="hidden sm:inline">Live System Audio</span>
                </button>
              )}

            </>
          )}
          <button
            onClick={async () => {
              try {
                if (isHost) {
                  await fetch(`/api/rooms/${roomId}`, { method: 'DELETE' });
                } else {
                  await fetch(`/api/rooms/${roomId}/leave`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: userName })
                  });
                }
              } catch (e) { }
              useRoomStore.getState().clearRoom();
              router.push("/");
            }}
            className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-white/5 border border-white/10 hover:bg-white/10 hover:text-rose-400 rounded-lg text-xs sm:text-sm font-semibold transition-colors"
          >
            <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">{isHost ? "End Jam" : "Leave Jam"}</span>
          </button>
        </div>
      </header>

      <DemoMusicPlayer sendEvent={sendEvent} />
      <TrackSelectorModal isOpen={isTrackModalOpen} onClose={() => setIsTrackModalOpen(false)} onSelect={handleAddTrack} />

      <main className="relative z-10 flex-1 grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 p-4 md:p-6 overflow-hidden max-w-[1600px] w-full mx-auto">

        {/* Left Area - Player (takes 2 columns on lg) */}
        <section className="lg:col-span-2 relative flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8">

          {/* Render Active Reactions as Floating Particles across entire left col */}
          <style>{`
            @keyframes floatUp {
              0% { transform: translateY(100px) scale(0.5) rotate(0deg); opacity: 0; }
              10% { transform: translateY(0px) scale(1.3); opacity: 1; text-shadow: 0 0 20px rgba(236,72,153,0.8); }
              100% { transform: translateY(-400px) scale(1.5) rotate(25deg); opacity: 0; }
            }
          `}</style>
          <div className="absolute bottom-32 left-0 w-full h-[500px] pointer-events-none z-50 flex justify-center overflow-visible">
            {reactions.map((r: any) => {
              const scatter = ((r.id % 120) - 60);
              return (
                <div
                  key={r.id}
                  className="absolute text-5xl sm:text-6xl pointer-events-none drop-shadow-2xl"
                  style={{
                    left: `calc(50% + ${scatter}px - 30px)`,
                    bottom: '0',
                    animation: `floatUp 3s ease-out forwards`,
                  }}
                >
                  {r.reaction}
                </div>
              );
            })}
          </div>

          {/* Album Art Container */}
          <div className="relative w-full max-w-[320px] 2xl:max-w-[380px] aspect-square rounded-3xl overflow-hidden shadow-2xl mb-6 group bg-[#111118] flex items-center justify-center">
            {/* Glowing shadow outline */}
            <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-600/30 to-indigo-600/30 blur-2xl opacity-50 group-hover:opacity-70 transition-opacity duration-1000 -z-10" />

            {isLiveAudio ? (
              <div className="flex flex-col items-center justify-center animate-pulse">
                 <Mic className="w-32 h-32 text-emerald-400 mb-6 drop-shadow-[0_0_20px_rgba(52,211,153,0.8)]" />
                 <p className="text-emerald-400 font-bold uppercase tracking-widest text-sm">Broadcasting Audio</p>
              </div>
            ) : (
              <img
                src="https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?auto=format&fit=crop&q=80&w=1000"
                alt="Album Artwork"
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
              />
            )}
            {/* Inner gloss */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none mix-blend-overlay" />
          </div>

          {/* Track Info */}
          <div className="w-full max-w-[600px] text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <span className={`text-xs font-bold tracking-widest px-2.5 py-1 rounded-full uppercase border ${isLiveAudio ? 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' : 'text-[#00E5FF] bg-[#00E5FF]/10 border-[#00E5FF]/20'}`}>
                {isLiveAudio ? "LIVE BROADCAST" : "Live Syncing"}
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-white mb-2 tracking-tight">{track?.title || "No Track Selected"}</h2>
            <p className="text-sm sm:text-lg text-neutral-400 font-medium">{track?.artist || "Add a track from the queue to start"}</p>
          </div>

          {/* Progress Bar */}
          <div className={`w-full max-w-[600px] mb-6 group ${isLiveAudio ? 'opacity-50 pointer-events-none' : 'cursor-pointer'}`} onClick={handleSeek}>
            <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden relative">
              <div
                ref={progressBarRef}
                className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${isLiveAudio ? 'bg-emerald-500 animate-pulse w-full' : 'bg-gradient-to-r from-fuchsia-500 to-indigo-500'}`}
                style={{ width: isLiveAudio ? '100%' : '0%' }}
              />
            </div>
            <div className="flex justify-between text-xs text-neutral-500 font-medium mt-3">
              {isLiveAudio ? (
                 <span className="w-full text-center tracking-[0.2em]">CONTROLS DISABLED</span>
              ) : (
                 <>
                   <span ref={currentTimeRef}>0:00</span>
                   <span>{trackDuration > 0 ? formatTime(trackDuration) : "--:--"}</span>
                 </>
              )}
            </div>
          </div>

          {/* Controls */}
          <div className={`flex items-center justify-center gap-6 lg:gap-10 ${isLiveAudio ? 'opacity-30 pointer-events-none' : ''}`}>
            <button onClick={handlePrevious} className="text-neutral-400 hover:text-white transition-colors" disabled={!isHost}>
              <SkipBack className="w-8 h-8 focus:scale-95 transition-transform" />
            </button>

            <button
              onClick={togglePlay}
              className={`w-16 h-16 flex items-center justify-center rounded-full bg-gradient-to-tr from-fuchsia-600 to-pink-500 hover:scale-105 shadow-[0_0_20px_rgba(236,72,153,0.4)] text-white transition-all transform`}
            >
              {status === "playing" ? <Pause className="w-7 h-7" fill="currentColor" /> : <Play className="w-7 h-7 ml-1" fill="currentColor" />}
            </button>

            <button onClick={handleSkip} className="text-neutral-400 hover:text-white transition-colors" disabled={!isHost}>
              <SkipForward className="w-8 h-8 focus:scale-95 transition-transform" />
            </button>
          </div>

          {/* Quick Reaction Bar */}
          <div className="mt-6 flex justify-center gap-4 bg-white/5 backdrop-blur-md px-6 py-3 rounded-full border border-white/5">
            {["❤️", "🔥", "😍", "👏", "😂"].map(emoji => (
              <button key={emoji} type="button" onClick={() => sendReaction(emoji)} className="hover:bg-fuchsia-500/20 p-2 rounded-full text-2xl transition-all hover:scale-125 focus:scale-95 shadow-sm">
                {emoji}
              </button>
            ))}
          </div>
        </section>


        {/* Right Area - Sidebar Panel */}
        <aside className="lg:col-span-1 flex flex-col bg-white/[0.02] border border-white/5 rounded-3xl overflow-hidden shadow-2xl max-h-[85vh]">
          {/* Tabs */}
          <div className="flex p-4 gap-2 border-b border-white/5">
            <button
              onClick={() => setActiveTab("queue")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === "queue" ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5"}`}
            >
              <Music className="w-4 h-4" /> Shared Queue
            </button>
            <button
              onClick={() => setActiveTab("listeners")}
              className={`flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === "listeners" ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5"}`}
            >
              <Users className="w-4 h-4" /> Listeners
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`relative flex-1 py-2.5 text-sm font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors ${activeTab === "chat" ? "bg-white/10 text-white" : "text-neutral-500 hover:bg-white/5"}`}
            >
              <MessageSquare className="w-4 h-4" /> Chat
              {unreadMessages > 0 && (
                <div className="absolute top-1 right-2 bg-rose-500 text-white text-[10px] font-bold px-1.5 min-w-[20px] rounded-full shadow border border-[#0A0A0E]">
                  {unreadMessages}
                </div>
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 pt-6">

            {activeTab === "queue" && (
              <>
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-neutral-500">Up Next</h3>
                  <button onClick={() => setIsTrackModalOpen(true)} className="text-xs font-semibold px-3 py-1.5 bg-fuchsia-500/20 text-fuchsia-400 rounded-lg hover:bg-fuchsia-500/30 transition-colors flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> ADD
                  </button>
                </div>

                <div className="space-y-2">
                  {queue.map((t: any, idx: number) => (
                    <div
                      key={t.id}
                      onClick={() => {
                        if (isLiveAudio) {
                           alert("Please stop the live broadcast before modifying the queue.");
                           return;
                        }
                        if (!isHost) return;
                        if (track?.id === t.track.id) {
                          sendEvent("SEEK", { position: 0 });
                          updatePlaybackState("playing", 0, Date.now(), track || undefined);
                          if (progressBarRef.current) progressBarRef.current.style.width = '0%';
                          if (currentTimeRef.current) currentTimeRef.current.textContent = '0:00';
                          return;
                        }
                        sendEvent("SONG_CHANGED", { trackId: t.track.id, position: 0, status: "playing" });
                        updatePlaybackState("playing", 0, Date.now(), t.track);
                        if (progressBarRef.current) progressBarRef.current.style.width = '0%';
                        if (currentTimeRef.current) currentTimeRef.current.textContent = '0:00';
                      }}
                      className={`flex items-center gap-4 p-3 rounded-xl ${track?.id === t.track.id ? 'bg-fuchsia-500/10 border border-fuchsia-500/20' : 'hover:bg-white/5'} transition-colors group cursor-pointer`}
                    >
                      <div className={`w-6 h-6 flex items-center justify-center text-xs font-bold ${track?.id === t.track.id ? 'text-fuchsia-400' : 'text-neutral-500'}`}>
                        {track?.id === t.track.id ? <Play className="w-3.5 h-3.5" fill="currentColor" /> : (idx + 1)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${track?.id === t.track.id ? 'text-white' : 'text-neutral-300'} truncate`}>{t.track?.title || t.title}</p>
                        <p className="text-xs text-neutral-500 truncate">{t.track?.artist || t.artist}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "listeners" && (
              <>
                <div className="space-y-1">
                  {displayParticipants.map((l: any, i: number) => (
                    <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-white/5 transition-colors">
                      <div className="relative">
                        <img
                          src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${l.avatar || l.name}`}
                          alt={l.name}
                          className="w-10 h-10 rounded-full bg-white/10"
                        />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-[#0A0A0E] rounded-full" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-white">
                            {l.name} {l.name === userName && <span className="text-neutral-500 font-normal ml-1">(You)</span>}
                          </p>
                          {l.role === "host" && <Crown className="w-3.5 h-3.5 text-amber-500" />}
                        </div>
                        <p className="text-xs text-neutral-500 capitalize">{l.role || "listener"}</p>
                      </div>
                      {isHost && l.role !== "host" && (
                        <div className="flex gap-2">
                            <button 
                                onClick={() => sendEvent("TRANSFER_HOST", { newHostName: l.name })}
                                className="text-[10px] font-bold px-2 py-1 bg-amber-500/20 text-amber-500 rounded hover:bg-amber-500/30 transition-colors uppercase"
                            >
                                Make Host
                            </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {activeTab === "chat" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 overflow-y-auto space-y-3 mb-4">
                  {messages.map((m: any, i: number) => {
                    const isMe = (m.author || m.author_name) === userName || (isHost && (m.author || m.author_name) === "Host");
                    return (
                      <div key={i} className={`flex flex-col max-w-[85%] ${isMe ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                        <p className={`text-xs font-bold mb-1 px-1 ${isMe ? 'text-fuchsia-300' : 'text-fuchsia-400'}`}>
                          {isMe ? "You" : (m.author || m.author_name)}
                        </p>
                        <div className={`p-3 rounded-xl ${isMe ? 'bg-fuchsia-500/20 border border-fuchsia-500/30' : 'bg-white/5'}`}>
                          <p className={`text-sm ${isMe ? 'text-white' : 'text-neutral-200'}`}>{m.message}</p>
                        </div>
                      </div>
                    );
                  })}
                  {messages.length === 0 && <p className="text-sm text-neutral-500 text-center py-10">No messages yet. Say hello!</p>}
                </div>

                <form onSubmit={handleSendMessage} className="mt-auto relative">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Say something..."
                    className="w-full bg-[#0A0A0E] border border-white/10 rounded-xl py-3 px-4 pr-12 text-sm focus:outline-none focus:border-fuchsia-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-fuchsia-600 text-white rounded-lg hover:bg-fuchsia-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                  </button>
                </form>
              </div>
            )}
          </div>

        </aside>
      </main>
    </div>
  );
}
