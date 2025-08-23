export class InputHandler {
  private keys: Record<string, boolean> = {};
  private onPauseToggle?: () => void;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    const onKey = (v: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (
        [
          "arrowup",
          "arrowdown",
          "arrowleft",
          "arrowright",
          "w",
          "s",
          "shift",
          "p",
        ].includes(k)
      ) {
        this.keys[k] = v;
        e.preventDefault();
      }
    };

    window.addEventListener("keydown", onKey(true));
    window.addEventListener("keyup", onKey(false));

    // Pause toggle on 'p'
    window.addEventListener("keydown", (e) => {
      if (e.repeat) return;
      if (e.key.toLowerCase() === "p") {
        this.onPauseToggle?.();
        e.preventDefault();
      }
    });
  }

  public isKeyPressed(key: string): boolean {
    return !!this.keys[key.toLowerCase()];
  }

  public getPlayerInput(playerIndex: number, isRemote: boolean = false): { neg: boolean; pos: boolean } {
    if (isRemote) {
      // For remote players, input is handled by the network layer
      return { neg: false, pos: false };
    }

    // Map different control schemes based on player index
    switch (playerIndex) {
      case 0: // Left paddle - Arrow keys
        return {
          neg: this.isKeyPressed("arrowup"),
          pos: this.isKeyPressed("arrowdown")
        };
      case 1: // Right paddle - W/S keys for local play, arrow keys for AI/remote
        return {
          neg: this.isKeyPressed("w") || this.isKeyPressed("arrowup"),
          pos: this.isKeyPressed("s") || this.isKeyPressed("arrowdown")
        };
      case 2: // Bottom paddle (4P mode) - Left/Right arrows
        return {
          neg: this.isKeyPressed("arrowleft"),
          pos: this.isKeyPressed("arrowright")
        };
      case 3: // Top paddle (4P mode) - Right/Left arrows (mirrored)
        return {
          neg: this.isKeyPressed("arrowright"),
          pos: this.isKeyPressed("arrowleft")
        };
      default:
        return { neg: false, pos: false };
    }
  }

  public setOnPauseToggle(callback: () => void): void {
    this.onPauseToggle = callback;
  }

  public getRemoteInputForIndex(remoteIndex: number): { neg: boolean; pos: boolean } {
    switch (remoteIndex) {
      case 0:
      case 1: // L/R paddles use arrows for Z movement
        return {
          neg: this.isKeyPressed("arrowup"),
          pos: this.isKeyPressed("arrowdown")
        };
      case 2: // Bottom paddle uses left/right for X movement
        return {
          neg: this.isKeyPressed("arrowleft"),
          pos: this.isKeyPressed("arrowright")
        };
      case 3: // Top paddle uses right/left mirrored for X movement
        return {
          neg: this.isKeyPressed("arrowright"),
          pos: this.isKeyPressed("arrowleft")
        };
      default:
        return { neg: false, pos: false };
    }
  }
}