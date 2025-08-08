// src/main.ts
// Vanilla TypeScript + Babylon.js (no other libs).

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

// ---------------- Types & config ----------------
type Connection = "local" | "ai" | "ai3" | "remoteHost" | "remoteGuest";
type PlayerCount = 2 | 4;

interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
  aiDifficulty?: number; // 1..10 for AI mode(s)
  wsUrl?: string;        // remote only
  roomId?: string;       // remote only
}

type RemoteMsg =
  | { t: "hello"; roomId: string }             // host announces room
  | { t: "join"; roomId: string }              // guest joins room
  | { t: "assign"; side: "left" | "right" }    // host -> guest assign
  | { t: "input"; up: boolean; down: boolean } // guest -> host inputs
  | {
      t: "state";                               // host -> guest state
      ball: { x: number; y: number; z: number; vx: number; vy: number; vz: number };
      paddles: { x: number; y: number; z: number }[];
      scores: number[];
    };

// ---------------- Menu UI (vanilla DOM) ----------------
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
        <div style="background:#111; padding:20px 24px; border-radius:12px; width:min(640px, 92vw); box-shadow:0 10px 30px rgba(0,0,0,.45);">
          <h1 style="margin:0 0 12px; font-size:22px;">3D Pong — Setup</h1>

          <fieldset style="border:none; margin:0; padding:0;">
            <legend style="margin-bottom:8px;">Mode</legend>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="2p" checked> 2 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="ai2"> 1 Player vs AI (2P)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="4p"> 4 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="4pai"> 4 Players: You vs 3 AI</label>
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
              <label style="flex:1 1 260px;">WebSocket URL
                <input id="wsUrl" type="text" value="ws://localhost:8080" style="width:100%;">
              </label>
              <label style="flex:1 1 160px;">Room
                <input id="roomId" type="text" value="room1" style="width:100%;">
              </label>
            </div>
            <div style="margin-top:8px;">
              <label><input type="radio" name="remoteRole" value="host" checked> Host</label>
              <label style="margin-left:10px;"><input type="radio" name="remoteRole" value="guest"> Join</label>
            </div>
            <div style="font-size:12px;opacity:.8;margin-top:6px;">
              Remote mode uses vanilla WebSocket. Point it at any tiny broadcast server keyed by room. (2P only here.)
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
      const showRows = () => {
        const mode = (Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p");
        aiRow.style.display = (mode === "ai2" || mode === "4pai") ? "block" : "none";
        remoteRow.style.display = mode === "remote" ? "block" : "none";
      };
      modeInputs.forEach((r) => r.addEventListener("change", showRows));
      aiSlider.addEventListener("input", () => (aiVal.textContent = aiSlider.value));
      showRows();

      startBtn.addEventListener("click", () => {
        const mode = (Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p");
        let cfg: GameConfig;
        if (mode === "4p") {
          cfg = { playerCount: 4, connection: "local" };
        } else if (mode === "4pai") {
          cfg = { playerCount: 4, connection: "ai3", aiDifficulty: parseInt(aiSlider.value, 10) };
        } else if (mode === "ai2") {
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

// ---------------- Game ----------------
class Pong3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private ball!: import("@babylonjs/core").Mesh;
  private ballVelocity = new Vector3();

  private paddles: import("@babylonjs/core").Mesh[] = [];
  private obstacles: import("@babylonjs/core").Mesh[] = [];
  private corners: import("@babylonjs/core").Mesh[] = [];

  private keys: Record<string, boolean> = {};

  // control roles per paddle: 'human' | 'ai' | 'remoteGuest'
  private control: ("human" | "ai" | "remoteGuest")[] = [];

  // per-AI parameters (index-matched to paddles)
  private aiError: number[] = [0, 0, 0, 0];
  private aiErrorRangePerPaddle: number[] = [2, 2, 2, 2];
  private aiLerpPerPaddle: number[] = [0.08, 0.08, 0.08, 0.08];

  // Scores: [left, right, bottom, top] (B/T used in 4P)
  private scores = [0, 0, 0, 0];
  private scoreElems: HTMLSpanElement[] = [];
  private lastScorer: number = -1; // for UI highlight
  private lastHitter: number = -1; // 0..3, -1 means none
  private touchedOnce: boolean = false; // for 2P/4P: must touch a paddle before any goal counts

  // Dimensions / physics
  private ballRadius = 0.6 / 2;
  private speedIncrement = 1.0005;  // slight ramp-up
  private wallThickness = 0.1;      // used everywhere
  private cornerSize = this.wallThickness * 5; // thicker corner blocks

  // Remote (2P only)
  private ws?: WebSocket;
  private remoteSide: "left" | "right" = "right";
  private guestInput = { up: false, down: false }; // host reads this
  private lastStateSent = 0;

  constructor(private config: GameConfig) {
    // Engine / Scene
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.08, 0.08, 0.14, 1);

    // Camera (top-down-ish, locked)
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

    if (this.config.connection === "remoteHost" || this.config.connection === "remoteGuest") {
      this.initRemote();
    }
  }

  // -------------- HUD --------------
  private createScoreUI() {
    const hud = document.createElement("div");
    Object.assign(hud.style, {
      position: "absolute",
      top: "10px",
      left: "50%",
      transform: "translateX(-50%)",
      color: "#fff",
      fontFamily: "system-ui, sans-serif",
      zIndex: "10",
      display: "flex",
      gap: "10px",
      alignItems: "center",
      padding: "8px 10px",
      borderRadius: "12px",
      background: "linear-gradient(180deg, rgba(0,0,0,.45), rgba(0,0,0,.25))",
      boxShadow: "0 6px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)",
    });

    const slots = this.config.playerCount === 4 ? ["L", "R", "B", "T"] : ["L", "R"];
    const colors = [ "#58d68d", "#5dade2", "#f7dc6f", "#ec7063" ]; // L,R,B,T

    for (let i = 0; i < slots.length; i++) {
      const badge = document.createElement("div");
      Object.assign(badge.style, {
        display: "flex",
        alignItems: "center",
        gap: "6px",
        padding: "6px 10px",
        borderRadius: "999px",
        background: "rgba(255,255,255,.07)",
        boxShadow: "inset 0 0 0 1px rgba(255,255,255,.08)",
        transition: "transform 120ms ease, box-shadow 120ms ease",
      });

      const dot = document.createElement("span");
      Object.assign(dot.style, {
        width: "10px",
        height: "10px",
        borderRadius: "50%",
        background: colors[i],
        boxShadow: `0 0 8px ${colors[i]}80`,
        display: "inline-block",
      });

      const label = document.createElement("span");
      Object.assign(label.style, { fontSize: "13px", opacity: ".85", letterSpacing: ".4px" });
      label.textContent = slots[i];

      const score = document.createElement("span");
      Object.assign(score.style, { fontWeight: "700", fontSize: "18px", minWidth: "20px", textAlign: "right" });
      score.textContent = "0";

      badge.append(dot, label, score);
      hud.appendChild(badge);
      this.scoreElems.push(score);
    }

    document.body.appendChild(hud);
  }

  private pulseScorer(idx: number) {
    if (idx < 0) return;
    const hud = this.scoreElems[idx].parentElement as HTMLDivElement;
    if (!hud) return;
    hud.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.12), 0 0 16px rgba(255,255,255,.25)";
    hud.style.transform = "scale(1.05)";
    setTimeout(() => {
      hud.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.08)";
      hud.style.transform = "scale(1.0)";
    }, 180);
  }

  private updateScoreUI() {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++) this.scoreElems[i].textContent = this.scores[i].toString();
    if (this.lastScorer >= 0) this.pulseScorer(this.lastScorer);
  }

  // -------------- Scene setup --------------
  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 0.9;

    // Field
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseColor = new Color3(0.28, 0.28, 0.32);
    const field = MeshBuilder.CreateGround("field", { width, height }, this.scene);
    field.material = fieldMat;

    // Walls
    const wallMat = new StandardMaterial("wallMat", this.scene);
    wallMat.diffuseColor = new Color3(0.53, 0.26, 0.13);
    const t = this.wallThickness, h = 1;
    const wall = (w: number, d: number, x: number, z: number, id: string) => {
      const m = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, this.scene);
      m.position.set(x, h / 2, z);
      m.material = wallMat;
    };
    wall(width + t, t, 0, height / 2 + t / 2, "wallTop");
    wall(width + t, t, 0, -height / 2 - t / 2, "wallBottom");
    wall(t, height + t, -width / 2 - t / 2, 0, "wallLeft");
    wall(t, height + t, width / 2 + t / 2, 0, "wallRight");

    // Corner blocks (same material as walls, but thicker)
    this.cornerSize = t * 5; // chunkier than walls
    const cH = 1.0, cS = this.cornerSize;
    const cx = (width / 2) - (t / 2) - (cS / 2);
    const cz = (height / 2) - (t / 2) - (cS / 2);
    const makeCornerBox = (x: number, z: number, id: string) => {
      const box = MeshBuilder.CreateBox(id, { width: cS, height: cH, depth: cS }, this.scene);
      box.position.set(x, cH / 2, z);
      box.material = wallMat;
      this.corners.push(box);
    };
    makeCornerBox(+cx, +cz, "cornerTR");
    makeCornerBox(+cx, -cz, "cornerBR");
    makeCornerBox(-cx, +cz, "cornerTL");
    makeCornerBox(-cx, -cz, "cornerBL");

    // Ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseTexture = new Texture("textures/1954-mondial-ball.jpg", this.scene);
    this.ball = MeshBuilder.CreateSphere("ball", { diameter: this.ballRadius * 2, segments: 16 }, this.scene);
    this.ball.material = ballMat;
    this.ball.position = new Vector3(0, 0.3, 0);

    // Paddles (each with its own material, so we can flash)
    // NOTE: reversed Top/Bottom from previous: Top = -Z, Bottom = +Z
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
      // left (Z), right (Z), TOP at -Z (X), BOTTOM at +Z (X)  <-- reversed vs previous
      newPaddle(-dAxis, 0, 0, 0);             // left
      newPaddle(+dAxis, 0, 0, 1);             // right
      newPaddle(0, -dAxis, Math.PI / 2, 3);   // TOP (idx 3) at -Z
      newPaddle(0, +dAxis, Math.PI / 2, 2);   // BOTTOM (idx 2) at +Z
      // paddles[] order is [0:L,1:R,2:Bottom,+Z,3:Top,-Z]
      // (we created idx 3 before idx 2 to place them visually first)
    } else {
      newPaddle(-dAxis, 0, 0, 0);
      newPaddle(+dAxis, 0, 0, 1);
    }

    // Determine control roles
    if (this.config.playerCount === 4) {
      if (this.config.connection === "ai3") {
        // You control LEFT (idx 0) with Arrows; others are AI
        this.control = ["human", "ai", "ai", "ai"];
        this.applyAIDifficulty([1, 2, 3], this.config.aiDifficulty ?? 5);
      } else {
        // 4P Local: all human (Arrows / W-S / I-K / N-M)
        this.control = ["human", "human", "human", "human"];
      }
    } else {
      // 2P modes
      if (this.config.connection === "ai") {
        this.control = ["human", "ai"];
        this.applyAIDifficulty([1], this.config.aiDifficulty ?? 5);
      } else if (this.config.connection === "remoteHost") {
        // host controls left locally; right is remote guest
        this.control = ["human", "remoteGuest"];
      } else if (this.config.connection === "remoteGuest") {
        // guest renders; movement is driven by host via state packets
        this.control = ["human", "human"]; // keys captured and sent
      } else {
        this.control = ["human", "human"];
      }
    }

    // Obstacles
    this.spawnObstacles(width, height);

    // Serve
    this.resetBall();

    // Loop
    this.engine.runRenderLoop(() => {
      this.update(width, height);
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private applyAIDifficulty(idxs: number[], difficulty: number) {
    const d = Math.min(10, Math.max(1, difficulty));
    const t = (d - 1) / 9; // 0..1
    const errRange = lerp(2.5, 0.2, t);
    const lerpAmt = lerp(0.05, 0.16, t);
    idxs.forEach((i) => {
      this.aiErrorRangePerPaddle[i] = errRange;
      this.aiLerpPerPaddle[i] = lerpAmt;
    });
  }

  private spawnObstacles(width: number, height: number) {
    // 3–7 cylinders, avoid very center
    const count = 1 + Math.floor(Math.random() * 3);
    const mat = new StandardMaterial("obsMat", this.scene);
    mat.diffuseColor = new Color3(0.18, 0.18, 0.03);

    for (let i = 0; i < count; i++) {
      const radius = 0.25 + Math.random() * 0.15; // a bit larger for clearer hits
      const h = 1;
      const m = MeshBuilder.CreateCylinder(`obs${i}`, { diameter: radius * 2, height: h, tessellation: 16 }, this.scene);

      let x = 0, z = 0, attempts = 0;
      do {
        x = (Math.random() * 2 - 1) * (width / 2 - 2);
        z = (Math.random() * 2 - 1) * (height / 2 - 2);
        attempts++;
      } while ((Math.abs(x) < 2 && Math.abs(z) < 2) && attempts < 20);

      m.position.set(x, h / 2, z);
      m.material = mat;
      // store the *real* cylinder radius for accurate collision
      (m as any).metadata = { radius };
      this.obstacles.push(m);
    }
  }

  // -------------- Serve & AI difficulty --------------
  private resetBall(dirX = Math.random() < 0.5 ? 1 : -1) {
    this.ball.position.set(0, 0.3, 0);
    const angle = (Math.random() * Math.PI / 4) - Math.PI / 8;
    const speed = 0.15;
    this.ballVelocity = new Vector3(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random() * 0.05,
      speed * Math.sin(angle)
    );
    // repick AI error offsets for any AI paddle
    this.control.forEach((c, i) => {
      if (c === "ai") {
        this.aiError[i] = (Math.random() * 2 - 1) * this.aiErrorRangePerPaddle[i];
      }
    });
    this.lastHitter = -1;
    this.touchedOnce = false;
  }

  // -------------- Remote (2P only) -----------------
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
          this.remoteSide = msg.side; // FYI
        } else if (msg.t === "state" && this.config.connection === "remoteGuest") {
          // Apply host state
          this.ball.position.set(msg.ball.x, msg.ball.y, msg.ball.z);
          this.ballVelocity.set(msg.ball.vx, msg.ball.vy, msg.ball.vz);
          msg.paddles.forEach((pp, i) => this.paddles[i]?.position.set(pp.x, pp.y, pp.z));
          for (let i = 0; i < this.scores.length && i < msg.scores.length; i++) this.scores[i] = msg.scores[i];
          this.updateScoreUI();
        } else if (msg.t === "join" && this.config.connection === "remoteHost") {
          // Assign right to guest
          const assign: RemoteMsg = { t: "assign", side: "right" };
          try { this.ws?.send(JSON.stringify(assign)); } catch {}
        } else if (msg.t === "input" && this.config.connection === "remoteHost") {
          this.guestInput.up = !!msg.up;
          this.guestInput.down = !!msg.down;
        }
      };

      // Guest: continuously send inputs each frame
      if (this.config.connection === "remoteGuest") {
        const sendInputs = () => {
          const up = !!this.keys["w"] || !!this.keys["arrowup"];
          const down = !!this.keys["s"] || !!this.keys["arrowdown"];
          const pkt: RemoteMsg = { t: "input", up, down };
          try { this.ws?.send(JSON.stringify(pkt)); } catch {}
          requestAnimationFrame(sendInputs);
        };
        requestAnimationFrame(sendInputs);
      }
    } catch {
      // best-effort only
    }
  }

  private sendStateToGuest(now: number) {
    if (!this.ws || this.config.connection !== "remoteHost") return;
    if (now - this.lastStateSent < 33) return; // ~30Hz
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
    try { this.ws.send(JSON.stringify(msg)); } catch {}
  }

  // -------------- Per-frame update --------------
  private update(width: number, height: number) {
    const now = performance.now();
    const moveSpeed = 0.2;
    const [p1, p2, p3, p4] = this.paddles;

    // --- Player / AI / Remote input ---
    if (this.config.playerCount === 4) {
      // idx 0 (left, human arrows), idx 1 (right), idx 2 (BOTTOM +Z), idx 3 (TOP -Z)
      // Humans
      if (this.control[0] === "human") {
        if (this.keys["arrowup"]) p1.position.z -= moveSpeed;
        if (this.keys["arrowdown"]) p1.position.z += moveSpeed;
      }
      if (this.control[1] === "human") {
        if (this.keys["w"]) p2.position.z -= moveSpeed;
        if (this.keys["s"]) p2.position.z += moveSpeed;
      }
      if (this.control[2] === "human") {
        if (this.keys["i"]) p3.position.x -= moveSpeed;
        if (this.keys["k"]) p3.position.x += moveSpeed;
      }
      if (this.control[3] === "human") {
        if (this.keys["n"]) p4.position.x += moveSpeed;
        if (this.keys["m"]) p4.position.x -= moveSpeed;
      }
      // AIs
      [0,1,2,3].forEach((idx) => {
        if (this.control[idx] !== "ai") return;
        const paddle = this.paddles[idx];
        const err = this.aiError[idx];
        const lerpAmt = this.aiLerpPerPaddle[idx];
        if (idx < 2) {
          // move on Z towards ball.z + error
          const limZ = height / 2 - 1;
          const targetZ = clamp(this.ball.position.z + err, -limZ, limZ);
          paddle.position.z = Vector3.Lerp(paddle.position, new Vector3(paddle.position.x, 0, targetZ), lerpAmt).z;
        } else {
          // move on X towards ball.x + error
          const limX = width / 2 - 1;
          const targetX = clamp(this.ball.position.x + err, -limX, limX);
          paddle.position.x = Vector3.Lerp(paddle.position, new Vector3(targetX, 0, paddle.position.z), lerpAmt).x;
        }
      });
    } else {
      // 2P local / AI / Remote
      if (this.keys["arrowup"]) p1.position.z -= moveSpeed;
      if (this.keys["arrowdown"]) p1.position.z += moveSpeed;

      if (this.control[1] === "ai") {
        const limZ = height / 2 - 1;
        const targetZ = clamp(this.ball.position.z + this.aiError[1], -limZ, limZ);
        p2.position.z = Vector3.Lerp(p2.position, new Vector3(0, 0, targetZ), this.aiLerpPerPaddle[1]).z;
      } else if (this.config.connection === "remoteHost") {
        if (this.guestInput.up) p2.position.z -= moveSpeed;
        if (this.guestInput.down) p2.position.z += moveSpeed;
      } else if (this.config.connection === "remoteGuest") {
        // guest renders; host sends authoritative state
      } else {
        if (this.keys["w"]) p2.position.z -= moveSpeed;
        if (this.keys["s"]) p2.position.z += moveSpeed;
      }
    }

    // --- Clamp paddles to walls (tight, geometry-aware) ---
    const padHalfW = 0.2 / 2; // paddle width (X)
    const padHalfD = 2.0 / 2; // paddle depth (Z)
    const margin = 0.02;
    const t = this.wallThickness;

    const limZ = (height / 2) - padHalfD - (t / 2) - margin; // left/right paddles slide on Z
    const limX = (width  / 2) - padHalfD - (t / 2) - margin; // top/bottom paddles slide on X

    this.paddles.forEach((p, idx) => {
      if (idx < 2) p.position.z = clamp(p.position.z, -limZ, limZ);
      else         p.position.x = clamp(p.position.x, -limX, limX);
    });

    // --- Keep paddles out of thick corner blocks ---
    const cHalf = this.cornerSize / 2;
    const padMargin = 0.01;

    // Left (0) & Right (1): resolve overlap along Z
    for (let idx = 0; idx < Math.min(2, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      for (const c of this.corners) {
        const overlapX = Math.abs(p.position.x - c.position.x) < (padHalfW + cHalf);
        const overlapZ = Math.abs(p.position.z - c.position.z) < (padHalfD + cHalf);
        if (overlapX && overlapZ) {
          const signZ = (p.position.z - c.position.z) >= 0 ? 1 : -1;
          p.position.z = c.position.z + signZ * (padHalfD + cHalf + padMargin);
        }
      }
    }
    // Bottom (2) & Top (3): resolve overlap along X
    for (let idx = 2; idx < Math.min(4, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      for (const c of this.corners) {
        const overlapX = Math.abs(p.position.x - c.position.x) < (padHalfD + cHalf);
        const overlapZ = Math.abs(p.position.z - c.position.z) < (padHalfW + cHalf);
        if (overlapX && overlapZ) {
          const signX = (p.position.x - c.position.x) >= 0 ? 1 : -1;
          p.position.x = c.position.x + signX * (padHalfD + cHalf + padMargin);
        }
      }
    }

    // --- Ball physics ---
    this.ballVelocity.scaleInPlace(this.speedIncrement); // ramp up slowly
    this.ballVelocity.y -= 0.006;                        // gravity
    this.ball.position.addInPlace(this.ballVelocity);

    // Ground bounce
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }

    // Corner collisions (reverse both X and Z)
    const cornerRadius = (this.cornerSize * Math.SQRT2) / 2;
    for (const c of this.corners) {
      const dist = Vector3.Distance(this.ball.position, c.position);
      const hitR = this.ballRadius + cornerRadius;
      if (dist < hitR) {
        this.ballVelocity.x *= -1;
        this.ballVelocity.z *= -1;
        const n = this.ball.position.subtract(c.position).normalize();
        this.ball.position = c.position.add(n.scale(hitR + 0.02));
      }
    }

    // Top/bottom walls (Z) — bounce only in 2P; in 4P Z edges are goals
    if (this.config.playerCount !== 4) {
      if (Math.abs(this.ball.position.z) > height / 2 - this.ballRadius - t / 2) {
        this.ballVelocity.z *= -1;
        this.ball.position.z = clamp(
          this.ball.position.z,
          -height / 2 + this.ballRadius + t / 2,
          height / 2 - this.ballRadius - t / 2
        );
      }
    }

    // Paddle collisions + last hitter / touchedOnce
    const [padW2, padD2] = [0.2 / 2, 2.0 / 2];

    // Left (0) & Right (1): collide in X
    for (let idx = 0; idx < Math.min(2, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = padW2 + this.ballRadius;
      const zThr = padD2 + this.ballRadius;
      const movingIn = (idx === 0 && this.ballVelocity.x < 0) || (idx === 1 && this.ballVelocity.x > 0);
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.x = -this.ballVelocity.x * 1.05;
        const sign = idx === 0 ? +1 : -1;
        this.ball.position.x = p.position.x + sign * xThr;
        this.lastHitter = idx;
        this.touchedOnce = true;
        this.flashPaddle(p);
      }
    }
    // Bottom (2, +Z) & Top (3, -Z): collide in Z
    for (let idx = 2; idx < Math.min(4, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = padD2 + this.ballRadius; // span along X after rotation
      const zThr = padW2 + this.ballRadius; // contact along Z
      const movingIn = (idx === 2 && this.ballVelocity.z > 0) || (idx === 3 && this.ballVelocity.z < 0); // note signs (bottom/top reversed)
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.z = -this.ballVelocity.z * 1.05;
        const sign = idx === 2 ? -1 : +1; // push away: bottom(+Z) shove to -Z, top(-Z) shove to +Z
        this.ball.position.z = p.position.z + sign * zThr;
        this.lastHitter = idx;
        this.touchedOnce = true;
        this.flashPaddle(p);
      }
    }

    // Obstacles: accurate cylinder collision (XZ)
    for (const o of this.obstacles) {
      const oR = ((o as any).metadata?.radius as number) ?? 0.25; // true cyl radius from spawn
      const dx = this.ball.position.x - o.position.x;
      const dz = this.ball.position.z - o.position.z;

      const R = this.ballRadius + oR;
      const d2 = dx * dx + dz * dz;
      if (d2 < R * R) {
        const d = Math.sqrt(d2) || 0.0001;
        const nx = dx / d;
        const nz = dz / d;

        // snap ball to exact contact ring
        this.ball.position.x = o.position.x + nx * R;
        this.ball.position.z = o.position.z + nz * R;

        // reflect horizontal velocity about the normal (keep Y component)
        const vX = this.ballVelocity.x;
        const vZ = this.ballVelocity.z;
        const dot = vX * nx + vZ * nz;
        this.ballVelocity.x = vX - 2 * dot * nx;
        this.ballVelocity.z = vZ - 2 * dot * nz;

        // slight restitution
        const bounce = 1.02;
        this.ballVelocity.x *= bounce;
        this.ballVelocity.z *= bounce;
      }
    }

    // --- Scoring ---
    const halfW = width / 2 - this.ballRadius;
    const halfH = height / 2 - this.ballRadius;

    if (this.config.playerCount === 4) {
      // All four edges are goals; credit last hitter
      const outX = this.ball.position.x > halfW || this.ball.position.x < -halfW;
      const outZ = this.ball.position.z > halfH || this.ball.position.z < -halfH;
      if (outX || outZ) {
        if (this.lastHitter >= 0) {
          this.scores[this.lastHitter]++;
          this.lastScorer = this.lastHitter;
        } else {
          // no one touched: no score
          this.lastScorer = -1;
        }
        this.lastHitter = -1;
        this.resetBall(); // random re-serve
        this.updateScoreUI();
        if (this.config.connection === "remoteHost") this.sendStateToGuest(now);
        return;
      }
    } else {
      // 2P classic: goals on left/right edges, but only if someone touched
      if (this.ball.position.x > halfW) {
        if (this.touchedOnce) { this.scores[0]++; this.lastScorer = 0; }
        else { this.lastScorer = -1; }
        this.resetBall(-1);
      } else if (this.ball.position.x < -halfW) {
        if (this.touchedOnce) { this.scores[1]++; this.lastScorer = 1; }
        else { this.lastScorer = -1; }
        this.resetBall(1);
      }
      this.updateScoreUI();
    }

    // Remote host broadcast
    if (this.config.connection === "remoteHost") this.sendStateToGuest(now);
  }

  private flashPaddle(p: import("@babylonjs/core").Mesh) {
    const mat = p.material as StandardMaterial;
    const prev = mat.diffuseColor.clone();
    mat.diffuseColor = new Color3(1, 0, 0);
    setTimeout(() => (mat.diffuseColor = prev), 100);
  }
}

// ---------------- Helpers ----------------
function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
function safeParse<T>(x: any): T | null { try { return JSON.parse(x) as T; } catch { return null; } }

// ---------------- Bootstrap ----------------
window.addEventListener("load", async () => {
  const config = await Menu.render();
  new Pong3D(config);
});



// note : the score must be reverted , 



