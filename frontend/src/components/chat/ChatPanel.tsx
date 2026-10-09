import { useState } from 'react';
import { useRoomStore } from '@/stores/roomStore';
import { MessageSquare, Send } from 'lucide-react';

export default function ChatPanel({ roomId }: { roomId: string }) {
  const { messages } = useRoomStore();
  const [text, setText] = useState('');

  const sendMsg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    await fetch(`/api/rooms/${roomId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        author_name: 'Me',
        message: text
      })
    });
    setText('');
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex flex-col h-72 shadow-2xl">
      <div className="flex items-center space-x-2 text-neutral-400 mb-4 border-b border-neutral-800 pb-3">
        <MessageSquare size={18} />
        <h3 className="font-semibold text-white">Room Chat</h3>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1 text-sm custom-scrollbar flex flex-col-reverse">
        {messages.map((m: any, idx: number) => (
          <div key={idx} className="flex flex-col">
            <span className="text-xs text-neutral-500 font-semibold">{m.author}</span>
            <p className="text-neutral-300 bg-neutral-800/60 p-2 rounded-lg mt-1 break-words">{m.message}</p>
          </div>
        ))}
      </div>

      <form onSubmit={sendMsg} className="relative mt-auto flex items-center">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Say something..."
          className="w-full bg-neutral-800 border-none rounded-full py-2.5 pl-4 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 transition-all text-white"
        />
        <button type="submit" className="absolute right-2 text-purple-400 hover:text-purple-300 transition">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
}
