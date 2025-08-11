// src/game/Paddle.ts


export class Paddle {
  x: number;
  y: number;
  width = 20;
  height = 100;
  speed = 7;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    console.log("🖌 Drawing paddle at", this.x, this.y);
    ctx.fillStyle = "#fff";
    ctx.fillRect(this.x, this.y, this.width, this.height);
  }

  move(direction: -1 | 1) {
    this.y += direction * this.speed;
    console.log("➡️ Moved paddle to y =", this.y);
    // clamp…
    const maxY = window.innerHeight - this.height;
    if (this.y < 0) this.y = 0;
    if (this.y > maxY) this.y = maxY;
  }
  // center of canvas


}
