"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { useRoomStore } from "@/stores/roomStore";

export default function CreateRoom() {
  const router = useRouter();
  const setIsHost = useRoomStore((state) => state.setIsHost);

  const [roomName, setRoomName] = useState("");
  const [hostName, setHostName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreating || !roomName || !hostName) return;

    setIsCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: roomName, is_private: true, host_name: hostName }),
      });
      const data = await res.json();
      setIsHost(true);
      useRoomStore.getState().setRoomName(data.name || roomName);
      useRoomStore.getState().setUserName(hostName);
      useRoomStore.getState().setRoomId(data.room_code);
      router.push(`/room/${data.room_code}`);
    } catch (err) {
      console.error(err);
      // Fallback for UI POC if backend is down
      setIsHost(true);
      router.push(`/room/DEMO12`);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md bg-[#0A0A0E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

        <div className="relative z-10">
          <h2 className="text-2xl font-bold text-white mb-2">Create a Listening Jam</h2>
          <p className="text-sm text-neutral-400 mb-8">Setup your shared room to enjoy music with others.</p>

          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Room Name
              </label>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Friday Night Jam"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm outline-none"
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Host Display Name
              </label>
              <input
                type="text"
                value={hostName}
                onChange={(e) => setHostName(e.target.value)}
                placeholder="e.g. Alex"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm outline-none"
                required
              />
            </div>


            <div className="pt-4 flex items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => router.push("/")}
                className="px-4 py-3 text-sm font-semibold text-neutral-400 hover:text-white transition-colors flex items-center gap-2"
              >
                <ChevronLeft className="w-4 h-4" /> Back to Home
              </button>
              <button
                type="submit"
                disabled={!roomName || !hostName || isCreating}
                className="flex-1 py-3 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2"
              >
                {isCreating ? "Creating..." : "Create Room"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
