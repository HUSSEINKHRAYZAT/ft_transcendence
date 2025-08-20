// src/game/Paddle.ts

export class Paddle {
  x: number;
  y: number;
  width = 20;
  height = 100;
  speed = 7;
  radius = 500; // border-radius in px

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
  }

  draw(ctx: CanvasRenderingContext2D) {
    // console.log("🖌 Drawing paddle at", this.x, this.y);
    ctx.fillStyle = "#fff";

    if ("roundRect" in ctx) {
      // Modern API: ctx.roundRect(x, y, w, h, radius)
      ctx.beginPath();
      (ctx as any).roundRect(this.x, this.y, this.width, this.height, this.radius);
      ctx.fill();
    } else {
      // Fallback for older browsers
      roundedRectPath(ctx, this.x, this.y, this.width, this.height, this.radius);
      ctx.fill();
    }
  }

  move(direction: -1 | 1) {
    this.y += direction * this.speed;
    const maxY = window.innerHeight - this.height;
    if (this.y < 0) this.y = 0;
    if (this.y > maxY) this.y = maxY;
  }
}

// Helper: build a rounded-rect path (fallback)
function roundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}
