import { useRoomStore } from '@/stores/roomStore';
import { useEffect, useState } from 'react';
import { Heart, Flame, ThumbsUp, Laugh, PartyPopper } from 'lucide-react';

export default function ReactionOverlay({ roomId }: { roomId: string }) {
  const { reactions } = useRoomStore();

  const handleReact = async (reactionStr: string) => {
    await fetch(`/api/rooms/${roomId}/reactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reaction: reactionStr })
    });
  };

  return (
    <>
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-40">
        {reactions.map((react: any) => (
          <div 
            key={react.id} 
            className="absolute bottom-24 text-4xl animate-float-up opacity-0"
            style={{ left: `${20 + Math.random() * 60}%` }}
          >
            {react.reaction === 'heart' && '❤️'}
            {react.reaction === 'fire' && '🔥'}
            {react.reaction === 'laugh' && '😂'}
            {react.reaction === 'party' && '🎉'}
          </div>
        ))}
      </div>

      <div className="absolute bottom-6 right-1/4 left-1/4 flex justify-center space-x-4 z-50">
        <button onClick={() => handleReact('heart')} className="p-3 bg-neutral-800 rounded-full hover:bg-red-500/20 hover:text-red-400 transition shadow-lg text-neutral-300">
          <Heart size={24} />
        </button>
        <button onClick={() => handleReact('fire')} className="p-3 bg-neutral-800 rounded-full hover:bg-orange-500/20 hover:text-orange-400 transition shadow-lg text-neutral-300">
          <Flame size={24} />
        </button>
        <button onClick={() => handleReact('party')} className="p-3 bg-neutral-800 rounded-full hover:bg-yellow-500/20 hover:text-yellow-400 transition shadow-lg text-neutral-300">
          <PartyPopper size={24} />
        </button>
      </div>
    </>
  );
}
