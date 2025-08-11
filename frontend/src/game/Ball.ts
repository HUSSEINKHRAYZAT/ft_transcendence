// src/game/Ball.ts
export class Ball {
  x: number;
  y: number;
  radius = 10;
  vx = 7;
  vy = 7;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  update(canvasWidth: number, canvasHeight: number) {
    this.x += this.vx;
    this.y += this.vy;
    if (this.y - this.radius < 0 || this.y + this.radius > canvasHeight) {
      this.vy *= -1;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = "#fff";
    ctx.fill();
    ctx.closePath();
  }
}
