import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Track } from '@/types/track';

interface RoomState {
  roomId: string | null;
  roomName: string | null;
  userName: string | null;
  clientId: string;
  track: Track | null;
  status: 'playing' | 'paused';
  globalStatus: 'playing' | 'paused';
  position: number;
  serverTime: number;
  participants: any[];
  queue: any[];
  messages: any[];
  reactions: any[];
  isHost: boolean;
  skipVotes: number;
  unreadMessages: number;
  isChatOpen: boolean;
  popupMessage: any | null;
  liveStream: any | null;
  setChatOpen: (isOpen: boolean) => void;
  clearPopupMessage: () => void;
  setLiveStream: (stream: any | null) => void;
  clearRoom: () => void;
  setRoomId: (id: string) => void;
  setRoomName: (name: string) => void;
  setUserName: (name: string) => void;
  setIsHost: (isHost: boolean) => void;
  addSkipVote: () => void;
  updatePlaybackState: (status: 'playing' | 'paused', position: number, serverTime: number, track?: Track) => void;
  addMessage: (msg: any) => void;
  setQueue: (queue: any[]) => void;
  setMessages: (messages: any[]) => void;
  setParticipants: (participants: any[]) => void;
  addReaction: (react: any) => void;
  setTrackDuration: (duration: number) => void;
}

export const useRoomStore = create<RoomState>()(
  persist(
    (set) => ({
      roomId: null,
      roomName: null,
      userName: null,
      clientId: Math.random().toString(36).substring(2, 15),
      track: null,
      status: 'paused',
      globalStatus: 'paused',
      position: 0,
      serverTime: Date.now(),
      participants: [],
      queue: [],
      messages: [],
      reactions: [],
      isHost: false,
      skipVotes: 0,
      unreadMessages: 0,
      isChatOpen: false,
      popupMessage: null,
      liveStream: null,
      setLiveStream: (stream) => set({ liveStream: stream }),
      setChatOpen: (isOpen) => set((state) => ({ isChatOpen: isOpen, unreadMessages: isOpen ? 0 : state.unreadMessages })),
      clearPopupMessage: () => set({ popupMessage: null }),
      clearRoom: () => set({
        roomId: null,
        roomName: null,
        userName: null,
        isHost: false,
        participants: [],
        queue: [],
        messages: [],
        reactions: [],
      }),
      setRoomId: (id) => set({ roomId: id }),
      setRoomName: (name) => set({ roomName: name }),
      setUserName: (name) => set({ userName: name }),
      setIsHost: (isHost) => set({ isHost }),
      addSkipVote: () => set((state) => ({ skipVotes: state.skipVotes + 1 })),
      updatePlaybackState: (status, position, serverTime, track?) => 
        set((state) => ({
          status,
          globalStatus: status,
          position,
          serverTime,
          track: track || state.track,
        })),
      addMessage: (msg) => set((state) => {
        const isMe = (msg.author || msg.author_name) === state.userName || (state.isHost && (msg.author || msg.author_name) === "Host");
        const isUnread = !state.isChatOpen && !isMe;
        return { 
          messages: [...state.messages, msg],
          unreadMessages: isUnread ? state.unreadMessages + 1 : state.unreadMessages,
          popupMessage: isUnread ? msg : state.popupMessage
        };
      }),
      setQueue: (queue) => set({ queue }),
      setMessages: (messages) => set({ messages }),
      setParticipants: (participants) => set({ participants }),
      setTrackDuration: (duration) => set((state) => ({ track: state.track ? { ...state.track, duration } : null })),
      addReaction: (react) => {
        set((state) => ({ reactions: [...state.reactions, react] }));
        setTimeout(() => {
          set((state) => ({ reactions: state.reactions.filter(r => r.id !== react.id) }));
        }, 3000);
      }
    }),
    {
      name: 'jamroom-storage',
      partialize: (state) => ({ 
        isHost: state.isHost, 
        roomId: state.roomId,
        roomName: state.roomName,
        userName: state.userName 
      }),
    }
  )
);
