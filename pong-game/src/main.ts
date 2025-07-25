// src/main.ts
import "./style.css";
import { Paddle } from "./game/Paddle";
import { Ball }   from "./game/Ball";

// ─── 1) INPUT TRACKING ───────────────────────────
const keysPressed: Record<string, boolean> = {};
window.addEventListener("keydown", e => { keysPressed[e.key] = true; });
window.addEventListener("keyup",   e => { keysPressed[e.key] = false; });

// ─── 2) SCORE STATE & RESET ──────────────────────
let leftScore  = 0;
let rightScore = 0;
// src/main.ts
 function resetBall(lastScoredRight: boolean) {
   ball.x  = canvas.width  / 2;
   ball.y  = canvas.height / 2;
    ball.vx = lastScoredRight ? -6 : 6;      // match new vx
    ball.vy = 6 * (Math.random() > 0.5 ? 1 : -1);
 }


// ─── 3) CANVAS SETUP ─────────────────────────────
const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
const ctx    = canvas.getContext("2d")!;

// ─── 4) GAME OBJECTS ─────────────────────────────
const leftPaddle  = new Paddle(10, 0);
const rightPaddle = new Paddle(0, 0);
const ball        = new Ball(canvas.width/2, canvas.height/2);

// ─── 5) RESIZE / INITIAL POSITION ───────────────
function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;

  leftPaddle.y  = canvas.height/2 - leftPaddle.height/2;
  rightPaddle.x = canvas.width - 10 - rightPaddle.width;
  rightPaddle.y = canvas.height/2 - rightPaddle.height/2;
}
window.addEventListener("resize", resize);
resize();

// ─── 6) INPUT HANDLER ────────────────────────────
function handleInput() {
  // Left paddle (W/S)
  if (keysPressed["w"] || keysPressed["W"]) leftPaddle.move(-1);
  if (keysPressed["s"] || keysPressed["S"]) leftPaddle.move(1);
  // Right paddle (Arrows)
  if (keysPressed["ArrowUp"])   rightPaddle.move(-1);
  if (keysPressed["ArrowDown"]) rightPaddle.move(1);
}

// ─── 7) GAME LOOP ────────────────────────────────
function loop() {
  handleInput();
  ball.update(canvas.width, canvas.height);

  // ─ Paddle collisions ─────────────────────────
  // Left paddle
  if (
    ball.x - ball.radius < leftPaddle.x + leftPaddle.width &&
    ball.y > leftPaddle.y &&
    ball.y < leftPaddle.y + leftPaddle.height
  ) {
    ball.vx *= -1;
    ball.x = leftPaddle.x + leftPaddle.width + ball.radius;
  }
  // Right paddle
  if (
    ball.x + ball.radius > rightPaddle.x &&
    ball.y > rightPaddle.y &&
    ball.y < rightPaddle.y + rightPaddle.height
  ) {
    ball.vx *= -1;
    ball.x = rightPaddle.x - ball.radius;
  }

  // ─ Scoring ────────────────────────────────────
  if (ball.x - ball.radius < 0) {
    rightScore++;
    resetBall(true);
  } else if (ball.x + ball.radius > canvas.width) {
    leftScore++;
    resetBall(false);
  }

  // ─ Drawing ────────────────────────────────────
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // draw scores
  ctx.font      = "48px sans-serif";
  ctx.fillStyle = "#fff";
  ctx.fillText(leftScore.toString(),  canvas.width * 0.25, 50);
  ctx.fillText(rightScore.toString(), canvas.width * 0.75, 50);

  leftPaddle.draw(ctx);
  rightPaddle.draw(ctx);
  ball.draw(ctx);

  requestAnimationFrame(loop);
}

loop();
