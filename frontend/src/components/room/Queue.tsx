import { useRoomStore } from '@/stores/roomStore';
import { LayoutList, Plus } from 'lucide-react';
import { Track } from '@/types/track';

export default function Queue({ roomId }: { roomId: string }) {
  const { queue } = useRoomStore();

  const handleAddMockTrack = async () => {
    await fetch(`/api/rooms/${roomId}/queue`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        track: {
          provider: 'demo',
          provider_track_id: `song_${Math.floor(Math.random() * 1000)}`,
          title: 'Awesome Song ' + Math.floor(Math.random() * 100),
          artist: 'The Band',
          duration: 210,
        },
        added_by: 'Me'
      })
    });
  };

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 flex-1 overflow-hidden flex flex-col h-full shadow-2xl">
      <div className="flex items-center justify-between text-neutral-400 mb-4 border-b border-neutral-800 pb-3">
        <div className="flex items-center space-x-2">
          <LayoutList size={18} />
          <h3 className="font-semibold text-white">Up Next</h3>
        </div>
        <button 
          onClick={handleAddMockTrack}
          className="text-neutral-400 hover:text-white p-1 rounded hover:bg-neutral-800 transition"
          title="Add a mockup track"
        >
          <Plus size={16} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
        {queue && queue.length > 0 ? (
          queue.map((item: any, idx: number) => (
            <div key={item.id} className="flex items-center bg-neutral-800/50 hover:bg-neutral-800 p-2 rounded-lg transition-colors group">
              <span className="text-xs text-neutral-500 w-4">{idx + 1}</span>
              <div className="flex-1 ml-3 truncate">
                <p className="text-sm font-medium text-neutral-200 truncate">{item.track.title}</p>
                <p className="text-xs text-neutral-500 truncate">{item.track.artist}</p>
              </div>
            </div>
          ))
        ) : (
          <div className="h-full flex items-center justify-center text-sm text-neutral-600">
            Queue is empty
          </div>
        )}
      </div>
    </div>
  );
}
