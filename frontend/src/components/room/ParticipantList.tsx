import { useRoomStore } from '@/stores/roomStore';
import { Users } from 'lucide-react';

export default function ParticipantList() {
  const { participants } = useRoomStore();

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex-1 overflow-hidden flex flex-col shadow-2xl">
      <div className="flex items-center space-x-2 text-neutral-400 mb-4 border-b border-neutral-800 pb-3">
        <Users size={18} />
        <h3 className="font-semibold text-white">People ({participants.length})</h3>
      </div>
      <div className="flex-1 overflow-y-auto space-y-3">
        {participants.length === 0 && (
          <div className="text-neutral-500 text-sm italic">You are the only one here.</div>
        )}
        {participants.map((p: any, idx: number) => (
          <div key={idx} className="flex items-center space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ring-2 ring-neutral-900 ${idx === 0 ? 'bg-purple-600' : 'bg-blue-600'}`}>
              {p.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-neutral-300">{p.name}</p>
            </div>
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]"></div>
          </div>
        ))}
      </div>
    </div>
  );
}
