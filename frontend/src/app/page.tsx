"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PlayCircle, ArrowRight, UserPlus, Sparkles } from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [roomCode, setRoomCode] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNavigating) return;
    if (roomCode.trim().length >= 5) {
      setIsNavigating(true);
      router.push(`/join?code=${roomCode.toUpperCase()}`);
    }
  };

  const handleCreate = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    router.push("/create");
  };

  return (
    <div className="min-h-screen flex flex-col relative font-sans">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between px-4 sm:px-8 py-4 sm:py-6 w-full max-w-7xl mx-auto gap-4">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-fuchsia-500 to-indigo-600 p-2 rounded-xl">
            <PlayCircle className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">
            JamRoom
          </span>
        </div>
        <div>
          <button
            onClick={handleCreate}
            className="text-xs font-semibold px-4 py-2 rounded-full border border-white/10 hover:bg-white/5 transition-colors text-white"
          >
            HOST A JAM
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center pt-8 pb-16 px-4 sm:px-8">
        <div className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-8 items-center">

          {/* Left Column (Hero Text) */}
          <div className="space-y-8">
            <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold tracking-tight text-white leading-[1.1]">
              Listen together, <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-pink-500 via-fuchsia-500 to-indigo-500">
                in perfect sync.
              </span>
            </h1>

            <p className="text-lg text-neutral-400 max-w-lg leading-relaxed">
              JamRoom is a real-time collaborative music player designed to let you enjoy audio perfectly in step.
              No auto-syncing clashes, simply link a track, and everyone listens, on one shared wavelength.
            </p>

            <div className="flex items-center gap-4 pt-4">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500 border-2 border-[#09090b] flex items-center justify-center text-[10px] font-bold text-white">A</div>
                <div className="w-8 h-8 rounded-full bg-fuchsia-500 border-2 border-[#09090b] flex items-center justify-center text-[10px] font-bold text-white">S</div>
                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-[#09090b] overflow-hidden">
                  <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=Felix" alt="avatar" className="w-full h-full object-cover" />
                </div>
              </div>
              <p className="text-sm text-neutral-500 font-medium">Join 100+ active jams today.</p>
            </div>
          </div>

          {/* Right Column (Form Card) */}
          <div className="flex justify-center lg:justify-end">
            <div className="w-full max-w-md bg-[#0A0A0E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
              {/* Card subtle shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

              <div className="relative z-10">
                <h2 className="text-2xl font-bold text-white mb-2">Step into the room</h2>
                <p className="text-sm text-neutral-400 mb-8">Join a scheduled or live shared session.</p>

                <form onSubmit={handleJoin} className="space-y-4" suppressHydrationWarning>
                  <div className="space-y-2">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                      Jam Code
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={roomCode}
                        onChange={(e) => setRoomCode(e.target.value)}
                        placeholder="Enter 6-character room code"
                        className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm uppercase tracking-wider font-mono outline-none"
                        maxLength={6}
                        autoComplete="off"
                        suppressHydrationWarning
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={roomCode.trim().length === 0 || isNavigating}
                    className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2"
                  >
                    {isNavigating ? "Loading..." : <>Join Room <ArrowRight className="w-4 h-4" /></>}
                  </button>
                </form>

                <div className="my-8 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent relative">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#0A0A0E] px-4 text-xs font-medium text-neutral-600">
                    OR
                  </div>
                </div>

                <div className="space-y-2 text-center">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block text-left">
                    START FROM SCRATCH
                  </label>
                  <button
                    onClick={handleCreate}
                    disabled={isNavigating}
                    className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <UserPlus className="w-4 h-4" /> {isNavigating ? "Loading..." : "Create a New Jam"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 px-4 sm:px-8 flex flex-col sm:flex-row justify-between items-center text-xs text-neutral-600 max-w-7xl mx-auto w-full gap-4 sm:gap-0">
        <div>© 2026 JamRoom OS. All rights reserved.</div>
        <div className="flex gap-4 mt-4 sm:mt-0">
          <a href="#" className="hover:text-neutral-300 transition-colors">Help Center</a>
          <a href="#" className="hover:text-neutral-300 transition-colors">API Docs</a>
          <a href="#" className="hover:text-neutral-300 transition-colors">Privacy Policy</a>
        </div>
      </footer>
    </div>
  );
}
