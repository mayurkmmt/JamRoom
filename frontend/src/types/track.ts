export interface Track {
  id: string;
  provider: string;
  providerTrackId: string;
  title: string;
  artist: string;
  album?: string;
  duration: number;
  coverUrl?: string;
}

export interface PlayerControls {
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(position: number): Promise<void>;
  getCurrentTrack(): Track | null;
  getPosition(): number;
}
