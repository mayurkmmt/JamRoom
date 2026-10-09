"use client";

import { Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ArrowRight } from "lucide-react";
import { useRoomStore } from "@/stores/roomStore";

function JoinRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setIsHost = useRoomStore((state) => state.setIsHost);

  const initialCode = searchParams.get("code") || "";
  const [code, setCode] = useState<string[]>(Array(6).fill(""));
  const [displayName, setDisplayName] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    const storeRoomId = useRoomStore.getState().roomId;
    const userName = useRoomStore.getState().userName;
    if (initialCode && storeRoomId === initialCode && userName) {
      router.replace(`/room/${initialCode}`);
    }
  }, [initialCode, router]);

  useEffect(() => {
    if (initialCode && initialCode.length > 0) {
      if (code.join("") === "") {
        setCode(initialCode.split("").concat(Array(Math.max(0, 6 - initialCode.length)).fill("")));
      }
      if (inputRefs.current[initialCode.length] && initialCode.length < 6) {
        inputRefs.current[initialCode.length]?.focus();
      }
    } else if (inputRefs.current[0] && !initialCode) {
      inputRefs.current[0].focus();
    }
  }, [initialCode]);

  const handleChange = (index: number, value: string) => {
    const newCode = [...code];
    newCode[index] = value.toUpperCase();
    setCode(newCode);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const codeString = code.join("");

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isJoining) return;
    if (codeString.length === 6 && displayName) {
      setIsJoining(true);
      try {
        const res = await fetch(`/api/rooms/${codeString}/join`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: displayName }),
        });
        if (res.ok) {
          const data = await res.json();
          useRoomStore.getState().setRoomName(data.name || "Jam Room");
          useRoomStore.getState().setUserName(displayName);
          useRoomStore.getState().setRoomId(codeString);
          setIsHost(false);
          router.push(`/room/${codeString}`);
        } else {
          alert("Room not found or unavailable.");
          setIsJoining(false);
        }
      } catch (err) {
        console.error("Failed to join room:", err);
        setIsJoining(false);
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-8 font-sans">
      <div className="w-full max-w-md bg-[#0A0A0E] border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.03] to-transparent pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">Join a Live Room</h2>
          <p className="text-sm text-neutral-400 mb-8 text-center max-w-[250px]">
            Have a room code? Enter it below and join the jam right away.
          </p>

          <form onSubmit={handleJoin} className="space-y-6 w-full">
            <div className="space-y-3">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 block text-center">
                Room Code
              </label>
              <div className="flex items-center justify-center gap-2 sm:gap-3">
                {code.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-10 h-12 sm:w-12 sm:h-14 bg-white/5 border border-white/10 rounded-xl text-center text-xl font-bold text-white focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all uppercase"
                  />
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                Display Name (Guest)
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Sam"
                className="w-full bg-white/5 border border-white/10 rounded-xl py-3 px-4 text-white placeholder-neutral-600 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-all text-sm outline-none"
                required
              />
            </div>

            <div className="pt-4 flex flex-col items-center gap-4">
              <button
                type="submit"
                disabled={codeString.length < 6 || !displayName || isJoining}
                className="w-full py-3.5 px-4 rounded-xl font-semibold text-white bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] flex items-center justify-center gap-2"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </button>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="text-xs font-semibold text-neutral-500 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function JoinRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0A0E]" />}>
      <JoinRoomContent />
    </Suspense>
  );
}
