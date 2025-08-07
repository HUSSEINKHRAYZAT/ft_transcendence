// src/main.ts
// Vanilla TS + Babylon.js. No extra libs, no Three.js.

// ================== Babylon Imports ==================
import {
  Engine,
  Scene,
  ArcRotateCamera,
  HemisphericLight,
  DirectionalLight,
  MeshBuilder,
  StandardMaterial,
  Texture,
  Vector3,
  Color3,
  Color4,
} from "@babylonjs/core";

// ================== Types & Config ====================
type Connection = "local" | "ai" | "remoteHost" | "remoteGuest";
type PlayerCount = 2 | 4;

interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
  aiDifficulty?: number;    // 1..10 (only when connection==='ai')
  wsUrl?: string;           // only for remote
  roomId?: string;          // only for remote
}

type RemoteMsg =
  | { t: "hello"; roomId: string }
  | { t: "join"; roomId: string }
  | { t: "assign"; side: "left" | "right" }
  | { t: "input"; up: boolean; down: boolean } // guest -> host
  | {
      t: "state";                                 // host -> guest authoritative
      ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
      paddles: { x: number; y: number; z: number }[];
      scores: number[];
    };

// ================== Menu UI (vanilla DOM) =============
class Menu {
  static render(): Promise<GameConfig> {
    return new Promise((resolve) => {
      const root = document.createElement("div");
      Object.assign(root.style, {
        position: "fixed",
        inset: "0",
        display: "grid",
        placeItems: "center",
        background: "rgba(0,0,0,0.85)",
        color: "#fff",
        fontFamily: "system-ui, sans-serif",
        zIndex: "10000",
      });

      root.innerHTML = `
        <div style="background:#111; padding:20px 24px; border-radius:12px; width:min(560px, 92vw);">
          <h1 style="margin:0 0 12px; font-size:22px;">3D Pong — Setup</h1>

          <fieldset style="border:none; margin:0; padding:0;">
            <legend style="margin-bottom:8px;">Mode</legend>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="2p" checked> 2 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="ai"> 1 Player vs AI</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="4p"> 4 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="remote"> 2 Players (Remote)</label>
          </fieldset>

          <div id="aiRow" style="margin-top:10px; display:none;">
            <label>AI Difficulty:
              <input id="aiSlider" type="range" min="1" max="10" step="1" value="5" style="vertical-align:middle;">
              <span id="aiVal">5</span>/10
            </label>
          </div>

          <div id="remoteRow" style="margin-top:10px; display:none;">
            <div style="display:flex; gap:8px; flex-wrap:wrap;">
              <label style="flex:1 1 200px;">WebSocket URL
                <input id="wsUrl" type="text" value="ws://localhost:8080" style="width:100%;">
              </label>
              <label style="flex:1 1 120px;">Room
                <input id="roomId" type="text" value="room1" style="width:100%;">
              </label>
            </div>
            <div style="margin-top:8px;">
              <label><input type="radio" name="remoteRole" value="host" checked> Host</label>
              <label style="margin-left:10px;"><input type="radio" name="remoteRole" value="guest"> Join</label>
            </div>
            <div style="font-size:12px;opacity:.8;margin-top:6px;">
              Remote mode is a minimal demo using vanilla WebSocket. Run any ws server that echoes/broadcasts per room.
            </div>
          </div>

          <div style="margin-top:14px; display:flex; gap:8px; justify-content:flex-end;">
            <button id="startBtn" style="padding:.5rem .8rem; font-weight:600;">Start</button>
          </div>
        </div>
      `;
      document.body.appendChild(root);

      const aiRow = root.querySelector("#aiRow") as HTMLDivElement;
      const remoteRow = root.querySelector("#remoteRow") as HTMLDivElement;
      const aiSlider = root.querySelector("#aiSlider") as HTMLInputElement;
      const aiVal = root.querySelector("#aiVal") as HTMLSpanElement;
      const startBtn = root.querySelector("#startBtn") as HTMLButtonElement;
      const wsUrl = root.querySelector("#wsUrl") as HTMLInputElement;
      const roomId = root.querySelector("#roomId") as HTMLInputElement;

      const modeInputs = root.querySelectorAll<HTMLInputElement>('input[name="mode"]');
      modeInputs.forEach((r) =>
        r.addEventListener("change", () => {
          const mode = (Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p");
          aiRow.style.display = mode === "ai" ? "block" : "none";
          remoteRow.style.display = mode === "remote" ? "block" : "none";
        })
      );

      aiSlider.addEventListener("input", () => (aiVal.textContent = aiSlider.value));

      startBtn.addEventListener("click", () => {
        const mode = (Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p");
        let cfg: GameConfig;
        if (mode === "4p") {
          cfg = { playerCount: 4, connection: "local" };
        } else if (mode === "ai") {
          cfg = { playerCount: 2, connection: "ai", aiDifficulty: parseInt(aiSlider.value, 10) };
        } else if (mode === "remote") {
          const role = (root.querySelector('input[name="remoteRole"]:checked') as HTMLInputElement)?.value ?? "host";
          cfg = {
            playerCount: 2,
            connection: role === "host" ? "remoteHost" : "remoteGuest",
            wsUrl: wsUrl.value.trim(),
            roomId: roomId.value.trim(),
          };
        } else {
          cfg = { playerCount: 2, connection: "local" };
        }
        root.remove();
        resolve(cfg);
      });
    });
  }
}

// ================== Game ==============================
class Pong3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private ball!: import("@babylonjs/core").Mesh;
  private ballVelocity = new Vector3();

  private paddles: import("@babylonjs/core").Mesh[] = [];
  private obstacles: import("@babylonjs/core").Mesh[] = [];
  private keys: Record<string, boolean> = {};

  // Scores: [left, right, bottom, top] (top/bottom used only in 4P)
  private scores = [0, 0, 0, 0];

  // UI
  private scoreElems: HTMLSpanElement[] = [];

  // Physics / gameplay
  private speedIncrement = 1.0005;      // gradual speed up
  private cornerBuffer = 1.0;           // keep paddles off the extreme corners
  private ballRadius = 0.6 / 2;

  // AI parameters (computed from difficulty)
  private aiError = 0;       // set each serve
  private aiErrorRange = 2;  // higher means worse aim
  private aiLerp = 0.08;     // reaction speed

  // Remote (optional)
  private ws?: WebSocket;
  private remoteSide: "left" | "right" = "right"; // guest will be assigned by host
  private guestInput = { up: false, down: false }; // host reads this
  private lastStateSent = 0;

  constructor(private config: GameConfig) {
    // AI difficulty mapping
    if (config.connection === "ai") {
      const d = Math.min(10, Math.max(1, config.aiDifficulty ?? 5));
      const t = (d - 1) / 9; // 0..1
      // High difficulty -> smaller error, faster reaction
      this.aiErrorRange = lerp(2.5, 0.2, t);
      this.aiLerp = lerp(0.05, 0.16, t);
    }

    // Engine/Scene
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.08, 0.08, 0.14, 1);

    // Camera (fixed-ish top-down)
    this.camera = new ArcRotateCamera("cam", Math.PI / 2, Math.PI / 4.2, 28, Vector3.Zero(), this.scene);
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraPointersInput");
    this.camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // Keyboard
    window.addEventListener("keydown", (e) => (this.keys[e.key.toLowerCase()] = true));
    window.addEventListener("keyup", (e) => (this.keys[e.key.toLowerCase()] = false));

    this.createScoreUI();
    this.init();

    // Remote connect if needed
    if (this.config.connection === "remoteHost" || this.config.connection === "remoteGuest") {
      this.initRemote();
    }
  }

  // -------------------- UI ----------------------------
  private createScoreUI() {
    const hud = document.createElement("div");
    Object.assign(hud.style, {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      fontSize: "18px",
      zIndex: "10",
      whiteSpace: "nowrap",
      background: "rgba(0,0,0,.35)",
      padding: "6px 10px",
      borderRadius: "10px",
    });

    const slots = this.config.playerCount === 4 ? ["L", "R", "B", "T"] : ["L", "R"];
    for (let i = 0; i < slots.length; i++) {
      const label = document.createElement("span");
      label.textContent = `${slots[i]} `;
      const score = document.createElement("span");
      score.textContent = "0";
      this.scoreElems.push(score);
      hud.append(label, score);
      if (i !== slots.length - 1) {
        const sep = document.createElement("span");
        sep.textContent = "  |  ";
        hud.append(sep);
      }
    }
    document.body.appendChild(hud);
  }

  private updateScoreUI() {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++) {
      this.scoreElems[i].textContent = this.scores[i].toString();
    }
  }

  // -------------------- Init Scene --------------------
  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 0.9;

    // Ground
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseColor = new Color3(0.28, 0.28, 0.32);
    const field = MeshBuilder.CreateGround("field", { width, height }, this.scene);
    field.material = fieldMat;

    // Walls
    const wallMat = new StandardMaterial("wallMat", this.scene);
    wallMat.diffuseColor = new Color3(0.53, 0.26, 0.13);
    const t = 0.1, h = 1;
    const wall = (w: number, d: number, x: number, z: number, id: string) => {
      const m = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, this.scene);
      m.position.set(x, h / 2, z);
      m.material = wallMat;
    };
    wall(width + t, t, 0, height / 2 + t / 2, "wallTop");
    wall(width + t, t, 0, -height / 2 - t / 2, "wallBottom");
    wall(t, height + t, -width / 2 - t / 2, 0, "wallLeft");
    wall(t, height + t, width / 2 + t / 2, 0, "wallRight");

    // Ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseTexture = new Texture("textures/1954-mondial-ball.jpg", this.scene);
    this.ball = MeshBuilder.CreateSphere("ball", { diameter: this.ballRadius * 2, segments: 16 }, this.scene);
    this.ball.material = ballMat;
    this.ball.position = new Vector3(0, 0.3, 0);

    // Paddles
    const dAxis = (this.config.playerCount === 4 ? height : width) / 2 - 0.3;
    const newPaddle = (x: number, z: number, rotY: number, idx: number) => {
      const p = MeshBuilder.CreateBox(`paddle${idx}`, { width: 0.2, height: 1, depth: 2 }, this.scene);
      p.position.set(x, 0.5, z);
      p.rotation.y = rotY;
      const mat = new StandardMaterial(`paddleMat${idx}`, this.scene);
      mat.diffuseColor = new Color3(0, 1, 0.667);
      p.material = mat;
      this.paddles.push(p);
    };

    if (this.config.playerCount === 4) {
      newPaddle(-dAxis, 0, 0, 0);           // left   (moves Z)
      newPaddle( dAxis, 0, 0, 1);           // right  (moves Z)
      newPaddle(0, -dAxis, Math.PI / 2, 2); // bottom (moves X)
      newPaddle(0,  dAxis, Math.PI / 2, 3); // top    (moves X)
    } else {
      newPaddle(-dAxis, 0, 0, 0);
      newPaddle( dAxis, 0, 0, 1);
    }

    // Obstacles (random count)
    this.spawnObstacles(width, height);

    // Serve
    this.resetBall();

    // Main Loop
    this.engine.runRenderLoop(() => {
      this.update(width, height);
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private spawnObstacles(width: number, height: number) {
    // 3 to 7 random obstacles, avoid immediate center
    const count = 3 + Math.floor(Math.random() * 5);
    const mat = new StandardMaterial("obsMat", this.scene);
    mat.diffuseColor = new Color3(0.18, 0.18, 0.03);

    for (let i = 0; i < count; i++) {
      const radius = 0.3 + Math.random() * 0.2;
      const h = 1;
      const m = MeshBuilder.CreateCylinder(`obs${i}`, { diameter: radius * 2, height: h, tessellation: 16 }, this.scene);
      // spread out
      let x = 0, z = 0, attempts = 0;
      do {
        x = (Math.random() * 2 - 1) * (width / 2 - 2);
        z = (Math.random() * 2 - 1) * (height / 2 - 2);
        attempts++;
      } while ((Math.abs(x) < 2 && Math.abs(z) < 2) && attempts < 20);
      m.position.set(x, h / 2, z);
      m.material = mat;
      this.obstacles.push(m);
    }
  }

  // -------------------- Serve / Difficulty -------------
  private resetBall(dirX = Math.random() < 0.5 ? 1 : -1) {
    this.ball.position.set(0, 0.3, 0);
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
    const speed = 0.15;
    this.ballVelocity = new Vector3(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random() * 0.05,
      speed * Math.sin(angle)
    );

    // AI mis-aim per rally (so AI can miss)
    if (this.config.connection === "ai") {
      this.aiError = (Math.random() * 2 - 1) * this.aiErrorRange;
    }
  }

  // -------------------- Remote -------------------------
  private initRemote() {
    if (!this.config.wsUrl || !this.config.roomId) return;
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      this.ws.onopen = () => {
        const hello: RemoteMsg = {
          t: this.config.connection === "remoteHost" ? "hello" : "join",
          roomId: this.config.roomId!,
        };
        this.ws?.send(JSON.stringify(hello));
      };
      this.ws.onmessage = (ev) => {
        const msg = safeParse<RemoteMsg>(ev.data);
        if (!msg) return;
        if (msg.t === "assign" && this.config.connection === "remoteGuest") {
          this.remoteSide = msg.side; // 'right' by default
        } else if (msg.t === "state" && this.config.connection === "remoteGuest") {
          // Apply authoritative state
          this.ball.position.set(msg.ball.x, msg.ball.y, msg.ball.z);
          this.ballVelocity.set(msg.ball.vx, msg.ball.vy, msg.ball.vz);
          msg.paddles.forEach((pp, i) => this.paddles[i]?.position.set(pp.x, pp.y, pp.z));
          for (let i = 0; i < this.scores.length && i < msg.scores.length; i++) this.scores[i] = msg.scores[i];
          this.updateScoreUI();
        }
      };
      // Track local guest input: WASD/up/down
      if (this.config.connection === "remoteGuest") {
        const sendInputs = () => {
          const up = !!this.keys["w"] || !!this.keys["arrowup"];
          const down = !!this.keys["s"] || !!this.keys["arrowdown"];
          const pkt: RemoteMsg = { t: "input", up, down };
          this.ws?.send(JSON.stringify(pkt));
          requestAnimationFrame(sendInputs);
        };
        requestAnimationFrame(sendInputs);
      }
    } catch {
      // ignore — remote is best-effort
    }
  }

  private sendStateToGuest(now: number) {
    if (!this.ws || this.config.connection !== "remoteHost") return;
    // Send at ~30 Hz
    if (now - this.lastStateSent < 33) return;
    this.lastStateSent = now;

    const msg: RemoteMsg = {
      t: "state",
      ball: {
        x: this.ball.position.x, y: this.ball.position.y, z: this.ball.position.z,
        vx: this.ballVelocity.x, vy: this.ballVelocity.y, vz: this.ballVelocity.z,
      },
      paddles: this.paddles.map((p) => ({ x: p.position.x, y: p.position.y, z: p.position.z })),
      scores: [...this.scores],
    };
    try { this.ws.send(JSON.stringify(msg)); } catch { /* ignore */ }
  }

  // -------------------- Frame Update -------------------
  private update(width: number, height: number) {
    const dtNow = performance.now();
    const speed = 0.2;
    const [p1, p2, p3, p4] = this.paddles;

    // ------------ Input -------------
    if (this.config.playerCount === 4) {
      // Left (W/S), Right (Arrows), Bottom (I/K), Top (N/M)
      if (this.keys["w"]) p1.position.z -= speed;
      if (this.keys["s"]) p1.position.z += speed;

      if (this.keys["arrowup"]) p2.position.z -= speed;
      if (this.keys["arrowdown"]) p2.position.z += speed;

      if (this.keys["i"]) p3.position.x -= speed;
      if (this.keys["k"]) p3.position.x += speed;

      if (this.keys["n"]) p4.position.x += speed;
      if (this.keys["m"]) p4.position.x -= speed;
    } else {
      // 2P local or AI or Remote
      // Left paddle (p1): Arrows
      if (this.keys["arrowup"]) p1.position.z -= speed;
      if (this.keys["arrowdown"]) p1.position.z += speed;

      // Right paddle (p2): W/S, or AI, or Remote-Guest input supplied to host
      if (this.config.connection === "ai") {
        const limZ = height / 2 - 1 - this.cornerBuffer;
        const targetZ = clamp(this.ball.position.z + this.aiError, -limZ, limZ);
        p2.position.z = Vector3.Lerp(p2.position, new Vector3(0, 0, targetZ), this.aiLerp).z;
      } else if (this.config.connection === "remoteGuest") {
        // Guest does not simulate; host sends authoritative state
        // (inputs are already being sent in initRemote via RAF)
      } else if (this.config.connection === "remoteHost") {
        // Host: also read guest inputs from websocket
        // We can't block here, so just read last known input and apply to p2
        if (this.guestInput.up) p2.position.z -= speed;
        if (this.guestInput.down) p2.position.z += speed;
      } else {
        if (this.keys["w"]) p2.position.z -= speed;
        if (this.keys["s"]) p2.position.z += speed;
      }
    }

    // If host, update guestInput when input messages arrive
    if (this.ws && this.config.connection === "remoteHost") {
      this.ws.onmessage = (ev) => {
        const msg = safeParse<RemoteMsg>(ev.data);
        if (!msg) return;
        if (msg.t === "join") {
          // assign right side to guest
          const assign: RemoteMsg = { t: "assign", side: "right" };
          try { this.ws?.send(JSON.stringify(assign)); } catch {}
        } else if (msg.t === "input") {
          this.guestInput.up = !!msg.up;
          this.guestInput.down = !!msg.down;
        }
      };
    }

    // ------------ Clamp paddles with corner buffers ------------
    const limZ = height / 2 - 1 - this.cornerBuffer;
    const limX = width / 2 - 1 - this.cornerBuffer;
    this.paddles.forEach((p, idx) => {
      if (idx < 2) {
        p.position.z = clamp(p.position.z, -limZ, limZ);
      } else {
        p.position.x = clamp(p.position.x, -limX, limX);
      }
    });

    // ------------ Ball physics ------------
    this.ballVelocity.scaleInPlace(this.speedIncrement); // ramp
    this.ballVelocity.y -= 0.006;                         // gravity
    this.ball.position.addInPlace(this.ballVelocity);

    // Floor bounce
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }

    // Side walls (top/bottom on Z)
    if (Math.abs(this.ball.position.z) > height / 2 - this.ballRadius - 0.1) {
      this.ballVelocity.z *= -1;
      this.ball.position.z = clamp(this.ball.position.z, -height / 2 + this.ballRadius + 0.1, height / 2 - this.ballRadius - 0.1);
    }

    // ------------ Paddle collisions (accounting for rotation) ------------
    const padHalfW = 0.2 / 2; // width dimension (unrotated) — along X for left/right paddles
    const padHalfD = 2.0 / 2; // depth dimension (unrotated) — along Z for left/right paddles

    // Left (idx 0) & Right (idx 1): move on Z; collide on X
    for (let idx = 0; idx < Math.min(2, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = padHalfW + this.ballRadius;  // contact on X
      const zThr = padHalfD + this.ballRadius;  // within paddle span on Z
      const movingIn = (idx === 0 && this.ballVelocity.x < 0) || (idx === 1 && this.ballVelocity.x > 0);
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.x = -this.ballVelocity.x * 1.05;
        const sign = idx === 0 ? +1 : -1;
        this.ball.position.x = p.position.x + sign * xThr;
        this.flashPaddle(p);
      }
    }

    // Bottom (idx 2) & Top (idx 3): rotated 90°, so their width/depth swap roles
    for (let idx = 2; idx < Math.min(4, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = padHalfD + this.ballRadius;  // along X span after rotation
      const zThr = padHalfW + this.ballRadius;  // contact on Z after rotation
      const movingIn = (idx === 2 && this.ballVelocity.z < 0) || (idx === 3 && this.ballVelocity.z > 0);
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.z = -this.ballVelocity.z * 1.05;
        const sign = idx === 2 ? +1 : -1; // push towards center
        this.ball.position.z = p.position.z + sign * zThr;
        this.flashPaddle(p);
      }
    }

    // ------------ Obstacles: random-angle bounce ------------
    for (const o of this.obstacles) {
      const dist = Vector3.Distance(this.ball.position, o.position);
      const hitR = this.ballRadius + (o.getBoundingInfo()?.boundingSphere?.radius ?? 0.35);
      if (dist < hitR) {
        const sp = this.ballVelocity.length();
        const ang = Math.random() * Math.PI * 2;
        this.ballVelocity.x = Math.cos(ang) * sp;
        this.ballVelocity.z = Math.sin(ang) * sp;
        // nudge out
        const dir = this.ball.position.subtract(o.position).normalize();
        this.ball.position = o.position.add(dir.scale(hitR + 0.02));
      }
    }

    // ------------ Scoring / Reset ------------
    const halfW = width / 2 - this.ballRadius;
    const halfH = height / 2 - this.ballRadius;

    if (this.ball.position.x > halfW) {
      // Right wall passed: point to Left (index 0)
      this.scores[0]++; this.resetBall(-1);
    } else if (this.ball.position.x < -halfW) {
      // Left wall passed: point to Right (index 1)
      this.scores[1]++; this.resetBall(1);
    } else if (this.config.playerCount === 4 && this.ball.position.z > halfH) {
      // Top passed: point to Bottom (index 2)
      this.scores[2]++; this.resetBall(0);
    } else if (this.config.playerCount === 4 && this.ball.position.z < -halfH) {
      // Bottom passed: point to Top (index 3)
      this.scores[3]++; this.resetBall(0);
    }
    this.updateScoreUI();

    // ------------ Remote host broadcast ------------
    if (this.config.connection === "remoteHost") {
      this.sendStateToGuest(dtNow);
    }
  }

  private flashPaddle(p: import("@babylonjs/core").Mesh) {
    const mat = p.material as StandardMaterial;
    const prev = mat.diffuseColor.clone();
    mat.diffuseColor = new Color3(1, 0, 0);
    setTimeout(() => (mat.diffuseColor = prev), 100);
  }
}

// ================== Helpers ===========================
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function safeParse<T>(x: any): T | null { try { return JSON.parse(x) as T; } catch { return null; } }

// ================== Bootstrap =========================
window.addEventListener("load", async () => {
  const config = await Menu.render();
  new Pong3D(config);
});
