import { PlayerControls, Track } from '@/types/track';

export class DemoMusicPlayer implements PlayerControls {
  private currentTrack: Track | null = null;
  private position: number = 0;
  private isPlaying: boolean = false;
  private lastUpdate: number = Date.now();

  setTrack(track: Track) {
    this.currentTrack = track;
    this.position = 0;
  }

  async play() {
    this.isPlaying = true;
    this.lastUpdate = Date.now();
  }

  async pause() {
    this.syncPosition();
    this.isPlaying = false;
  }

  async seek(position: number) {
    this.position = position;
    this.lastUpdate = Date.now();
  }

  getCurrentTrack() {
    return this.currentTrack;
  }

  getPosition() {
    if (this.isPlaying) {
      this.syncPosition();
    }
    return this.position;
  }
  
  private syncPosition() {
    const now = Date.now();
    const elapsed = (now - this.lastUpdate) / 1000;
    this.position += elapsed;
    this.lastUpdate = now;
  }
}

export const player = new DemoMusicPlayer();
