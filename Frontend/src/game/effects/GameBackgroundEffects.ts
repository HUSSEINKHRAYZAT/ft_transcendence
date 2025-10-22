import { markUI } from "../../ui";

export class GameBackgroundEffects {
  private gameContainer!: HTMLElement;
  private primaryHex: string;

  constructor(primaryHex: string = '#84cc16') {
    this.primaryHex = primaryHex;
    this.createGameContainer();
  }

  private createGameContainer(): void {
    // Create simple game container that will wrap the canvas
    this.gameContainer = markUI(document.createElement("div"));
    this.gameContainer.id = "game-effects-container";
    this.gameContainer.className = "fixed inset-0 w-full h-full";
    this.gameContainer.style.cssText = `
      background: radial-gradient(circle at 50% 50%, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.98) 100%);
      overflow: hidden;
      z-index: -1;
    `;
    
    // Insert before any existing canvas
    const existingCanvas = document.getElementById("gameCanvas");
    if (existingCanvas && existingCanvas.parentNode) {
      existingCanvas.parentNode.insertBefore(this.gameContainer, existingCanvas);
    } else {
      document.body.appendChild(this.gameContainer);
    }
  }

  // Public methods for game event reactions (simplified - no animations)
  public onBallHit(x: number, y: number): void {
    // No animation effects
  }

  public onScore(playerIndex: number): void {
    // No animation effects
  }

  public updateBallPosition(x: number, y: number): void {
    // No animation effects
  }

  public destroy(): void {
    this.gameContainer.remove();
  }
}