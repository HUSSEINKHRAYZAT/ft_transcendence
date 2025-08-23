import { Sound } from "@babylonjs/core/Audio/sound";
import { Engine, Scene } from "@babylonjs/core";
import type { GameConfig } from "../types";

export class AudioManager {
  private sounds: {
    paddle: Sound[];
    obstacle: Sound[];
    win: Sound[];
    lose: Sound[];
  } = { paddle: [], obstacle: [], win: [], lose: [] };
  private toneCtx?: AudioContext;

  constructor(private scene: Scene, private config: GameConfig) {
    this.initAudio();
    this.setupUnlockListeners();
  }

  private initAudio(): void {
    const load = (name: string, url: string, vol = 0.6) =>
      new Sound(name, url, this.scene, undefined, {
        autoplay: false,
        loop: false,
        volume: vol,
      });

    // Pools for slight variety
    this.sounds.paddle = [
      load("paddle1", "/sounds/paddle1.mp3", 0.7),
      load("paddle2", "/sounds/paddle2.mp3", 0.7),
    ];
    this.sounds.obstacle = [
      load("obst1", "/sounds/obstacle1.mp3", 0.65),
      load("obst2", "/sounds/obstacle2.mp3", 0.65),
    ];
    this.sounds.win = [load("win", "/sounds/win.mp3", 0.8)];
    this.sounds.lose = [load("lose", "/sounds/lose.mp3", 0.8)];
  }

  private setupUnlockListeners(): void {
    const unlock = () => this.unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
  }

  private unlockAudio(): void {
    try {
      (Engine as any).audioEngine?.unlock?.();
    } catch {}
    try {
      if (!this.toneCtx) {
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) this.toneCtx = new Ctx();
      }
      this.toneCtx?.resume?.();
    } catch {}
  }

  public playHit(kind: "paddle" | "obstacle"): void {
    if (kind === "paddle") this.playFrom(this.sounds.paddle, 700, 70);
    else this.playFrom(this.sounds.obstacle, 520, 85);
  }

  public playWin(): void {
    const s = this.sounds.win[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    if (ready) {
      (s as any).setPlaybackRate?.(1);
      s.play();
    } else {
      // little triumphant beep fallback
      this.beepFallback(600, 120, 0.06);
      setTimeout(() => this.beepFallback(900, 160, 0.06), 130);
    }
  }

  public playLose(): void {
    const s = this.sounds.lose[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    if (ready) {
      (s as any).setPlaybackRate?.(1);
      s.play();
    } else {
      // descending tones fallback
      this.beepFallback(700, 90, 0.06);
      setTimeout(() => this.beepFallback(420, 150, 0.06), 100);
    }
  }

  public handleGameEndAudio(winnerIdx: number): void {
    const locals = this.getLocalControlledIndices();
    const isLocalWinner = locals.includes(winnerIdx);

    // If both players are on the same machine (local 2P), play both cues
    if (this.config.connection === "local" && locals.length >= 2) {
      this.playWin();
      this.playLose();
      return;
    }

    // Otherwise choose based on perspective
    if (isLocalWinner) this.playWin();
    else this.playLose();
  }

  private playFrom(arr: Sound[], fallbackHz = 440, durMs = 80): void {
    const s = arr[(Math.random() * arr.length) | 0];
    const ready =
      s &&
      (((s as any).isReadyToPlay === true && !(s as any).isPlaying) ||
        (s as any).isReady?.());
    if (ready) {
      const rate = 0.95 + Math.random() * 0.1; // subtle pitch variance
      (s as any).setPlaybackRate?.(rate);
      s.play();
      return;
    }
    this.beepFallback(fallbackHz, durMs, 0.05);
  }

  private beepFallback(freq = 440, durMs = 80, vol = 0.05): void {
    try {
      if (!this.toneCtx) {
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        this.toneCtx = new Ctx();
      }
      const ctx = this.toneCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, durMs);
    } catch {}
  }

  private getLocalControlledIndices(): number[] {
    // Figure out which paddles are controlled from this browser
    if (this.config.connection === "ai") return [0];
    if (this.config.connection === "local") return [0, 1];
    if (this.config.connection === "remoteHost") return [0];
    if (this.config.connection === "remoteGuest") return [1]; // simplified
    if (this.config.connection === "remote4Host") return [0];
    if (this.config.connection === "remote4Guest") return [1]; // simplified
    if (this.config.connection === "ai3") return [0];
    return [0];
  }
}