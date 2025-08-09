// src/main.ts
// Vanilla TypeScript + Babylon.js only (no extra libs).

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
  FresnelParameters,
} from "@babylonjs/core";

// ---------------- Types & config ----------------
type Connection =
  | "local"
  | "ai" // 2P vs AI
  | "ai3" // 4P: human + 3 AI
  | "remoteHost"
  | "remoteGuest"
  | "remote4Host"
  | "remote4Guest";

type PlayerCount = 2 | 4;

interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
  aiDifficulty?: number; // 1..10
  wsUrl?: string; // remote only
  roomId?: string; // remote only
  winScore?: number; // default 10
}

// Messages for the tiny relay
type RemoteMsg =
  | { t: "hello"; roomId: string; mode: "2p" | "4p" }
  | { t: "join"; roomId: string; idx?: 0 | 1 | 2 | 3 } // relay echoes join to host
  | { t: "assign"; idx: number } // relay -> guest
  | { t: "input"; idx: number; up: boolean; down: boolean } // guest -> host
  | {
      t: "state"; // host -> guests
      ball: {
        x: number;
        y: number;
        z: number;
        vx: number;
        vy: number;
        vz: number;
      };
      paddles: { x: number; y: number; z: number }[];
      scores: number[];
    };

// ---------------- Utilities for UI cleanup ----------------
function clearPongUI() {
  document
    .querySelectorAll<HTMLElement>("[data-pong-ui='1']")
    .forEach((n) => n.remove());
}
function markUI(el: HTMLElement) {
  el.setAttribute("data-pong-ui", "1");
  return el;
}

// ---------------- Menu UI (vanilla DOM) ----------------
class Menu {
  static render(): Promise<GameConfig> {
    return new Promise((resolve) => {
      clearPongUI();

      const root = markUI(document.createElement("div"));
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
        <div style="background:#111; padding:20px 24px; border-radius:12px; width:min(760px, 92vw); box-shadow:0 10px 30px rgba(0,0,0,.45);">
          <h1 style="margin:0 0 12px; font-size:22px;">3D Pong — Setup</h1>

          <fieldset style="border:none; margin:0; padding:0;">
            <legend style="margin-bottom:8px;">Mode</legend>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="2p" checked> 2 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="ai2"> 1 Player vs AI (2P)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="4p"> 4 Players (local)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="4pai"> 4 Players: You vs 3 AI</label>

            <div style="height:8px"></div>
            <div style="opacity:.9; font-size:13px; margin:6px 0 2px;">Remote</div>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="remote"> 2 Players (Remote)</label>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="remote4"> 4 Players (Remote)</label>

            <div style="height:8px"></div>
            <div style="opacity:.9; font-size:13px; margin:6px 0 2px;">Tournament (Remote only)</div>
            <label style="display:block; margin:.25rem 0;"><input type="radio" name="mode" value="tourn"> Tournament Bracket (8/16 players, remote 2P)</label>
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
          </div>

          <div id="tournRow" style="margin-top:10px; display:none;">
            <label>Size:
              <select id="tournSize">
                <option value="8" selected>8</option>
                <option value="16">16</option>
              </select>
            </label>
            <label style="margin-left:10px;">Win score:
              <input id="tournScore" type="number" min="1" max="21" value="10" style="width:60px;">
            </label>
            <div style="margin-top:8px; font-size:12px; opacity:.8;">
              Tournament runs as sequential 2P **remote** matches. Each match uses its own room id.
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
      const tournRow = root.querySelector("#tournRow") as HTMLDivElement;
      const aiSlider = root.querySelector("#aiSlider") as HTMLInputElement;
      const aiVal = root.querySelector("#aiVal") as HTMLSpanElement;
      const startBtn = root.querySelector("#startBtn") as HTMLButtonElement;
      const wsUrl = root.querySelector("#wsUrl") as HTMLInputElement;
      const roomId = root.querySelector("#roomId") as HTMLInputElement;
      const tournSizeSel = root.querySelector(
        "#tournSize"
      ) as HTMLSelectElement;
      const tournScoreInput = root.querySelector(
        "#tournScore"
      ) as HTMLInputElement;

      const modeInputs =
        root.querySelectorAll<HTMLInputElement>('input[name="mode"]');
      const showRows = () => {
        const mode =
          Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p";
        aiRow.style.display =
          mode === "ai2" || mode === "4pai" ? "block" : "none";
        remoteRow.style.display =
          mode === "remote" || mode === "remote4" || mode === "tourn"
            ? "block"
            : "none";
        tournRow.style.display = mode === "tourn" ? "block" : "none";
      };
      modeInputs.forEach((r) => r.addEventListener("change", showRows));
      aiSlider.addEventListener(
        "input",
        () => (aiVal.textContent = aiSlider.value)
      );
      showRows();

      startBtn.addEventListener("click", () => {
        const mode =
          Array.from(modeInputs).find((i) => i.checked)?.value ?? "2p";
        let cfg: GameConfig;

        if (mode === "4p") {
          cfg = { playerCount: 4, connection: "local", winScore: 10 };
        } else if (mode === "4pai") {
          cfg = {
            playerCount: 4,
            connection: "ai3",
            aiDifficulty: parseInt(aiSlider.value, 10),
            winScore: 10,
          };
        } else if (mode === "ai2") {
          cfg = {
            playerCount: 2,
            connection: "ai",
            aiDifficulty: parseInt(aiSlider.value, 10),
            winScore: 10,
          };
        } else if (mode === "remote") {
          const role =
            (
              root.querySelector(
                'input[name="remoteRole"]:checked'
              ) as HTMLInputElement
            )?.value ?? "host";
          cfg = {
            playerCount: 2,
            connection: role === "host" ? "remoteHost" : "remoteGuest",
            wsUrl: wsUrl.value.trim(),
            roomId: roomId.value.trim(),
            winScore: 10,
          };
        } else if (mode === "remote4") {
          const role =
            (
              root.querySelector(
                'input[name="remoteRole"]:checked'
              ) as HTMLInputElement
            )?.value ?? "host";
          cfg = {
            playerCount: 4,
            connection: role === "host" ? "remote4Host" : "remote4Guest",
            wsUrl: wsUrl.value.trim(),
            roomId: roomId.value.trim(),
            winScore: 10,
          };
        } else if (mode === "tourn") {
          const n = parseInt(tournSizeSel.value, 10) as 8 | 16;
          const names: string[] = [];
          for (let i = 0; i < n; i++)
            names.push(
              prompt(`Alias for player ${i + 1}:`, `P${i + 1}`) || `P${i + 1}`
            );

          const role =
            (
              root.querySelector(
                'input[name="remoteRole"]:checked'
              ) as HTMLInputElement
            )?.value ?? "host";
          cfg = {
            playerCount: 2,
            connection: role === "host" ? "remoteHost" : "remoteGuest",
            wsUrl: wsUrl.value.trim(),
            roomId: roomId.value.trim(),
            winScore: parseInt(tournScoreInput.value, 10) || 10,
          };
          (window as any).__TOURNAMENT__ = { size: n, names };
        } else {
          cfg = { playerCount: 2, connection: "local", winScore: 10 };
        }

        root.remove();
        resolve(cfg);
      });
    });
  }
}

// ---------------- Tournament (remote only) ----------------
type Match = { a: string; b: string; winner?: string };
class TournamentManager {
  private size: 8 | 16;
  private aliases: string[] = [];
  private matches: Match[] = [];
  private round = 1;
  private currentIndex = 0;
  constructor(size: 8 | 16, aliases: string[]) {
    this.size = size;
    this.aliases = aliases.slice(0, size);
    const arr = this.aliases.slice();
    while (arr.length) {
      const a = arr.shift()!,
        b = arr.pop()!;
      this.matches.push({ a, b });
    }
  }
  current(): Match | null {
    return this.matches[this.currentIndex] ?? null;
  }
  nextRound() {
    const winners = this.matches.map((m) => m.winner!).filter(Boolean);
    if (winners.length === 1) return winners[0];
    const next: Match[] = [];
    for (let i = 0; i < winners.length; i += 2)
      next.push({ a: winners[i], b: winners[i + 1] });
    this.matches = next;
    this.currentIndex = 0;
    this.round++;
    return null;
  }
  reportWinner(who: string): string | null {
    const m = this.current();
    if (!m) return null;
    m.winner = who;
    this.currentIndex++;
    if (this.currentIndex >= this.matches.length) return this.nextRound();
    return null;
  }
  getRound() {
    return this.round;
  }
  getIndex() {
    return this.currentIndex;
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

  // who controls each paddle: 'human' | 'ai' | 'remoteGuest'
  private control: ("human" | "ai" | "remoteGuest")[] = [];

  // per-AI params
  private aiError: number[] = [0, 0, 0, 0];
  private aiErrorRangePerPaddle: number[] = [2, 2, 2, 2];
  private aiLerpPerPaddle: number[] = [0.08, 0.08, 0.08, 0.08];

  // scores [L, R, B, T]
  private scores = [0, 0, 0, 0];
  private scoreElems: HTMLSpanElement[] = [];
  private lastScorer = -1;
  private lastHitter = -1;
  private touchedOnce = false;

  // dimensions / physics
  private ballRadius = 0.3;
  private speedIncrement = 1.0005;
  private wallThickness = 0.1;
  private cornerSize = this.wallThickness * 5;

  // remote
  private ws?: WebSocket;
  private remoteIndex: 0 | 1 | 2 | 3 = 1;
  private guestInputs: Record<number, { up: boolean; down: boolean }> = {};
  private lastStateSent = 0;

  // host waiting gate
  private isHost = false;
  private isGuest = false;
  private requiredGuests = 0; // 1 (2P) or 3 (4P)
  private connectedGuests = 0; // host's count
  private matchReady = true; // pause sim until true
  private waitUI?: HTMLDivElement;

  constructor(private config: GameConfig) {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.08, 0.08, 0.14, 1);

    // Camera (top-ish, locked)
    this.camera = new ArcRotateCamera(
      "cam",
      Math.PI / 2,
      Math.PI / 4.2,
      28,
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraPointersInput");
    this.camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // Input
    window.addEventListener(
      "keydown",
      (e) => (this.keys[e.key.toLowerCase()] = true)
    );
    window.addEventListener(
      "keyup",
      (e) => (this.keys[e.key.toLowerCase()] = false)
    );

    // Remote gate
    this.isHost =
      this.config.connection === "remoteHost" ||
      this.config.connection === "remote4Host";
    this.isGuest =
      this.config.connection === "remoteGuest" ||
      this.config.connection === "remote4Guest";
    if (this.isHost) {
      this.requiredGuests = this.config.connection === "remote4Host" ? 3 : 1;
      this.connectedGuests = 0;
      this.matchReady = this.requiredGuests === 0;
      this.showWaitingOverlay(`Waiting for players… 0/${this.requiredGuests}`);
    } else if (this.isGuest) {
      this.matchReady = false;
      this.showWaitingOverlay("Waiting for host…");
    }

    this.createScoreUI();
    this.init();

    if (this.isHost || this.isGuest) this.initRemote();
  }

  // ---------- UI ----------
  private createScoreUI() {
    const hud = markUI(document.createElement("div"));
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
      boxShadow:
        "0 6px 16px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.06)",
    });

    const slots =
      this.config.playerCount === 4 ? ["L", "R", "B", "T"] : ["L", "R"];
    const colors = ["#58d68d", "#5dade2", "#f7dc6f", "#ec7063"];
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
      Object.assign(label.style, {
        fontSize: "13px",
        opacity: ".85",
        letterSpacing: ".4px",
      });
      label.textContent = slots[i];

      const score = document.createElement("span");
      Object.assign(score.style, {
        fontWeight: "700",
        fontSize: "18px",
        minWidth: "20px",
        textAlign: "right",
      });
      score.textContent = "0";

      badge.append(dot, label, score);
      hud.appendChild(badge);
      this.scoreElems.push(score);
    }
    document.body.appendChild(hud);
  }
  private pulseScorer(idx: number) {
    if (idx < 0) return;
    const badge = this.scoreElems[idx].parentElement as HTMLDivElement;
    if (!badge) return;
    badge.style.boxShadow =
      "inset 0 0 0 1px rgba(255,255,255,.12), 0 0 16px rgba(255,255,255,.25)";
    badge.style.transform = "scale(1.05)";
    setTimeout(() => {
      badge.style.boxShadow = "inset 0 0 0 1px rgba(255,255,255,.08)";
      badge.style.transform = "scale(1.0)";
    }, 180);
  }
  private updateScoreUI() {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++)
      this.scoreElems[i].textContent = this.scores[i].toString();
    if (this.lastScorer >= 0) this.pulseScorer(this.lastScorer);
  }

  // waiting overlay
  private showWaitingOverlay(text: string) {
    const d = markUI(document.createElement("div"));
    Object.assign(d.style, {
      position: "fixed",
      inset: "0",
      display: "grid",
      placeItems: "center",
      background: "rgba(0,0,0,.65)",
      color: "#fff",
      zIndex: "9999",
      fontFamily: "system-ui,sans-serif",
    });
    d.innerHTML = `<div style="padding:16px 20px; background:#111; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,.5);">
      <div id="waitText" style="font-size:16px;">${text}</div>
    </div>`;
    document.body.appendChild(d);
    this.waitUI = d as HTMLDivElement;
  }
  private updateWaitingOverlay(text: string) {
    if (!this.waitUI) return;
    const el = this.waitUI.querySelector<HTMLDivElement>("#waitText");
    if (el) el.textContent = text;
  }

  private hideWaitingOverlay() {
    this.waitUI?.remove();
    this.waitUI = undefined;
  }
  private beginMatch() {
    this.matchReady = true;
    this.hideWaitingOverlay();
    this.resetBall(Math.random() < 0.5 ? 1 : -1);
  }

  // ---------- Scene setup ----------
  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 0.9;

    // Field
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseColor = new Color3(0.25, 0.25, 0.28);
    const field = MeshBuilder.CreateGround(
      "field",
      { width, height },
      this.scene
    );
    field.material = fieldMat;

    // Walls
    const wallMat = shinyMat(this.scene, new Color3(0.45, 0.24, 0.12), 0.2);
    const t = this.wallThickness,
      h = 1;
    const wall = (w: number, d: number, x: number, z: number, id: string) => {
      const m = MeshBuilder.CreateBox(
        id,
        { width: w, height: h, depth: d },
        this.scene
      );
      m.position.set(x, h / 2, z);
      m.material = wallMat;
    };
    wall(width + t, t, 0, height / 2 + t / 2, "wallTop");
    wall(width + t, t, 0, -height / 2 - t / 2, "wallBottom");
    wall(t, height + t, -width / 2 - t / 2, 0, "wallLeft");
    wall(t, height + t, width / 2 + t / 2, 0, "wallRight");

    // Corner blocks (thicker & shiny)
    this.cornerSize = t * 5;
    const cH = 1.0,
      cS = this.cornerSize;
    const cx = width / 2 - t / 2 - cS / 2;
    const cz = height / 2 - t / 2 - cS / 2;
    const cornerMat = shinyMat(this.scene, new Color3(0.45, 0.24, 0.12), 0.4);
    const makeCornerBox = (x: number, z: number, id: string) => {
      const box = MeshBuilder.CreateBox(
        id,
        { width: cS, height: cH, depth: cS },
        this.scene
      );
      box.position.set(x, cH / 2, z);
      box.material = cornerMat;
      this.corners.push(box);
    };
    makeCornerBox(+cx, +cz, "cornerTR");
    makeCornerBox(+cx, -cz, "cornerBR");
    makeCornerBox(-cx, +cz, "cornerTL");
    makeCornerBox(-cx, -cz, "cornerBL");

    // Ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseTexture = new Texture("textures/ball.jpg", this.scene);
    this.ball = MeshBuilder.CreateSphere(
      "ball",
      { diameter: this.ballRadius * 2, segments: 16 },
      this.scene
    );
    this.ball.material = ballMat;
    this.ball.position = new Vector3(0, 0.3, 0);

    // Paddles (shiny “rounded” look via fresnel+emissive; geometry remains box)
    const dAxis = (this.config.playerCount === 4 ? height : width) / 2 - 0.3;
    const newPaddle = (
      x: number,
      z: number,
      rotY: number,
      idx: number,
      color: Color3
    ) => {
      const p = MeshBuilder.CreateBox(
        `paddle${idx}`,
        { width: 0.2, height: 1, depth: 2 },
        this.scene
      );
      p.position.set(x, 0.5, z);
      p.rotation.y = rotY;
      p.material = shinyMat(this.scene, color, 0.6, /*glow*/ true);
      this.paddles.push(p);
    };
    if (this.config.playerCount === 4) {
      newPaddle(-dAxis, 0, 0, 0, new Color3(0.35, 0.9, 0.6)); // left
      newPaddle(+dAxis, 0, 0, 1, new Color3(0.36, 0.63, 0.92)); // right
      newPaddle(0, +dAxis, Math.PI / 2, 2, new Color3(0.97, 0.85, 0.35)); // bottom (+Z)
      newPaddle(0, -dAxis, Math.PI / 2, 3, new Color3(0.92, 0.44, 0.39)); // top (-Z)
    } else {
      newPaddle(-dAxis, 0, 0, 0, new Color3(0.35, 0.9, 0.6));
      newPaddle(+dAxis, 0, 0, 1, new Color3(0.36, 0.63, 0.92));
    }

    // Control roles
    if (this.config.playerCount === 4) {
      if (this.config.connection === "ai3") {
        this.control = ["human", "ai", "ai", "ai"]; // you control LEFT
        this.applyAIDifficulty([1, 2, 3], this.config.aiDifficulty ?? 5);
      } else if (this.config.connection === "remote4Host") {
        this.control = ["human", "remoteGuest", "remoteGuest", "remoteGuest"];
      } else if (this.config.connection === "remote4Guest") {
        this.control = ["human", "human", "human", "human"]; // guest renders only
      } else {
        this.control = ["human", "human", "human", "human"];
      }
    } else {
      if (this.config.connection === "ai") {
        this.control = ["human", "ai"];
        this.applyAIDifficulty([1], this.config.aiDifficulty ?? 5);
      } else if (this.config.connection === "remoteHost") {
        this.control = ["human", "remoteGuest"]; // host = left
      } else if (this.config.connection === "remoteGuest") {
        this.control = ["human", "human"]; // render only
      } else {
        this.control = ["human", "human"];
      }
    }

    // Obstacles (colored, shiny, non-overlapping)
    this.spawnObstacles(width, height);

    // If remote waiting: park ball still until beginMatch()
    if (this.matchReady) this.resetBall(Math.random() < 0.5 ? 1 : -1);
    else {
      this.ball.position.set(0, 0.3, 0);
      this.ballVelocity.set(0, 0, 0);
    }

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
    const count = 3 + Math.floor(Math.random() * 3); // 3..5
    const chosen: Vector3[] = [];
    const minGap = 1.0;

    for (let i = 0; i < count; i++) {
      let x = 0,
        z = 0,
        ok = false,
        tries = 0;
      const radius = 0.25 + Math.random() * 0.15;
      while (!ok && tries++ < 40) {
        x = (Math.random() * 2 - 1) * (width / 2 - 2);
        z = (Math.random() * 2 - 1) * (height / 2 - 2);
        ok = Math.abs(x) > 1.2 || Math.abs(z) > 1.2; // avoid dead-center
        if (ok) {
          for (const p of chosen) {
            if (Vector3.Distance(new Vector3(x, 0, z), p) < minGap + radius) {
              ok = false;
              break;
            }
          }
        }
      }
      chosen.push(new Vector3(x, 0, z));

      const h = 1;
      const m = MeshBuilder.CreateCylinder(
        `obs${i}`,
        { diameter: radius * 2, height: h, tessellation: 24 },
        this.scene
      );
      m.position.set(x, h / 2, z);
      m.material = shinyMat(this.scene, randColor(), 0.7, true);
      (m as any).metadata = { radius };
      this.obstacles.push(m);
    }
  }

  private resetBall(dirX = Math.random() < 0.5 ? 1 : -1) {
    this.ball.position.set(0, 0.3, 0);
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
    const speed = 0.15;
    this.ballVelocity = new Vector3(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random() * 0.05,
      speed * Math.sin(angle)
    );
    // refresh AI errors
    this.control.forEach((c, i) => {
      if (c === "ai")
        this.aiError[i] =
          (Math.random() * 2 - 1) * this.aiErrorRangePerPaddle[i];
    });
    this.lastHitter = -1;
    this.touchedOnce = false;
  }

  // ---------- Remote ----------
  private initRemote() {
    if (!this.config.wsUrl || !this.config.roomId) return;
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      this.ws.onopen = () => {
        const hello: RemoteMsg = {
          t: this.isHost ? "hello" : "join",
          roomId: this.config.roomId!,
          mode: this.config.playerCount === 4 ? "4p" : "2p",
        };
        this.ws?.send(JSON.stringify(hello));
      };
      this.ws.onmessage = (ev) => {
        const msg = safeParse<RemoteMsg>(ev.data);
        if (!msg) return;

        // Host sees joins -> count & maybe start
        if (msg.t === "join" && this.isHost) {
          this.connectedGuests = Math.min(
            this.requiredGuests,
            this.connectedGuests + 1
          );
          this.updateWaitingOverlay(
            `Waiting for players… ${this.connectedGuests}/${this.requiredGuests}`
          );
          if (this.connectedGuests >= this.requiredGuests && !this.matchReady)
            this.beginMatch();
          return;
        }

        // Guest learns index
        if (msg.t === "assign" && this.isGuest) {
          this.remoteIndex = (msg.idx as 0 | 1 | 2 | 3) ?? 1;
          return;
        }

        // Guest receives state -> hide overlay first time
        if (msg.t === "state" && this.isGuest) {
          this.ball.position.set(msg.ball.x, msg.ball.y, msg.ball.z);
          this.ballVelocity.set(msg.ball.vx, msg.ball.vy, msg.ball.vz);
          msg.paddles.forEach((pp, i) =>
            this.paddles[i]?.position.set(pp.x, pp.y, pp.z)
          );
          for (let i = 0; i < this.scores.length && i < msg.scores.length; i++)
            this.scores[i] = msg.scores[i];
          this.updateScoreUI();
          if (!this.matchReady) {
            this.matchReady = true;
            this.hideWaitingOverlay();
          }
          return;
        }

        // Host receives guest inputs
        if (msg.t === "input" && this.isHost) {
          this.guestInputs[msg.idx] = { up: !!msg.up, down: !!msg.down };
          return;
        }
      };

      // Guests: send inputs continuously
      if (this.isGuest) {
        const sendInputs = () => {
          const up = !!this.keys["w"] || !!this.keys["arrowup"];
          const down = !!this.keys["s"] || !!this.keys["arrowdown"];
          const pkt: RemoteMsg = {
            t: "input",
            idx: this.remoteIndex,
            up,
            down,
          };
          try {
            this.ws?.send(JSON.stringify(pkt));
          } catch {}
          requestAnimationFrame(sendInputs);
        };
        requestAnimationFrame(sendInputs);
      }
    } catch {
      // best effort
    }
  }
  private broadcastState(now: number) {
    if (!this.ws || !this.isHost) return;
    if (now - this.lastStateSent < 33) return; // ~30Hz
    this.lastStateSent = now;
    const msg: RemoteMsg = {
      t: "state",
      ball: {
        x: this.ball.position.x,
        y: this.ball.position.y,
        z: this.ball.position.z,
        vx: this.ballVelocity.x,
        vy: this.ballVelocity.y,
        vz: this.ballVelocity.z,
      },
      paddles: this.paddles.map((p) => ({
        x: p.position.x,
        y: p.position.y,
        z: p.position.z,
      })),
      scores: [...this.scores],
    };
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {}
  }

  // ---------- Per-frame update ----------
  private update(width: number, height: number) {
    const now = performance.now();

    // Pause everything until match is ready
    if (!this.matchReady) {
      if (this.isHost) this.broadcastState(now);
      return;
    }

    const move = 0.2;
    const [p1, p2, p3, p4] = this.paddles;

    // Input / AI / Remote
    if (this.config.playerCount === 4) {
      if (this.control[0] === "human") {
        if (this.keys["arrowup"]) p1.position.z -= move;
        if (this.keys["arrowdown"]) p1.position.z += move;
      }
      if (this.control[1] === "human") {
        if (this.keys["w"]) p2.position.z -= move;
        if (this.keys["s"]) p2.position.z += move;
      }
      if (this.control[2] === "human") {
        if (this.keys["i"]) p3.position.x -= move;
        if (this.keys["k"]) p3.position.x += move;
      }
      if (this.control[3] === "human") {
        if (this.keys["n"]) p4.position.x += move;
        if (this.keys["m"]) p4.position.x -= move;
      }

      if (this.config.connection === "remote4Host") {
        if (this.guestInputs[1]?.up) this.paddles[1].position.z -= move;
        if (this.guestInputs[1]?.down) this.paddles[1].position.z += move;
        if (this.guestInputs[2]?.up) this.paddles[2].position.x -= move;
        if (this.guestInputs[2]?.down) this.paddles[2].position.x += move;
        if (this.guestInputs[3]?.up) this.paddles[3].position.x += move;
        if (this.guestInputs[3]?.down) this.paddles[3].position.x -= move;
      }

      [0, 1, 2, 3].forEach((i) => {
        if (this.control[i] !== "ai") return;
        const p = this.paddles[i];
        const err = this.aiError[i];
        const lerpAmt = this.aiLerpPerPaddle[i];
        if (i < 2) {
          const limZ = height / 2 - 1;
          const targetZ = clamp(this.ball.position.z + err, -limZ, limZ);
          p.position.z = Vector3.Lerp(
            p.position,
            new Vector3(p.position.x, 0, targetZ),
            lerpAmt
          ).z;
        } else {
          const limX = width / 2 - 1;
          const targetX = clamp(this.ball.position.x + err, -limX, limX);
          p.position.x = Vector3.Lerp(
            p.position,
            new Vector3(targetX, 0, p.position.z),
            lerpAmt
          ).x;
        }
      });
    } else {
      if (this.keys["arrowup"]) p1.position.z -= move;
      if (this.keys["arrowdown"]) p1.position.z += move;

      if (this.control[1] === "ai") {
        const limZ = height / 2 - 1;
        const targetZ = clamp(
          this.ball.position.z + this.aiError[1],
          -limZ,
          limZ
        );
        p2.position.z = Vector3.Lerp(
          p2.position,
          new Vector3(0, 0, targetZ),
          this.aiLerpPerPaddle[1]
        ).z;
      } else if (this.config.connection === "remoteHost") {
        if (this.guestInputs[1]?.up) p2.position.z -= move;
        if (this.guestInputs[1]?.down) p2.position.z += move;
      } else {
        if (this.keys["w"]) p2.position.z -= move;
        if (this.keys["s"]) p2.position.z += move;
      }
    }

    // Clamp paddles within walls and keep out of corners
    const padW2 = 0.1,
      padD2 = 1.0; // half extents (box width=0.2, depth=2)
    const margin = 0.02,
      t = this.wallThickness;
    const limZ = height / 2 - padD2 - t / 2 - margin;
    const limX = width / 2 - padD2 - t / 2 - margin;
    this.paddles.forEach((p, i) => {
      if (i < 2) p.position.z = clamp(p.position.z, -limZ, limZ);
      else p.position.x = clamp(p.position.x, -limX, limX);
    });

    const cHalf = this.cornerSize / 2,
      padMargin = 0.01;
    for (let i = 0; i < Math.min(2, this.paddles.length); i++) {
      // left/right paddles
      const p = this.paddles[i];
      for (const c of this.corners) {
        const overlapX = Math.abs(p.position.x - c.position.x) < 0.1 + cHalf;
        const overlapZ = Math.abs(p.position.z - c.position.z) < 1.0 + cHalf;
        if (overlapX && overlapZ) {
          const signZ = p.position.z - c.position.z >= 0 ? 1 : -1;
          p.position.z = c.position.z + signZ * (1.0 + cHalf + padMargin);
        }
      }
    }
    for (let i = 2; i < Math.min(4, this.paddles.length); i++) {
      // bottom/top paddles
      const p = this.paddles[i];
      for (const c of this.corners) {
        const overlapX = Math.abs(p.position.x - c.position.x) < 1.0 + cHalf;
        const overlapZ = Math.abs(p.position.z - c.position.z) < 0.1 + cHalf;
        if (overlapX && overlapZ) {
          const signX = p.position.x - c.position.x >= 0 ? 1 : -1;
          p.position.x = c.position.x + signX * (1.0 + cHalf + padMargin);
        }
      }
    }

    // Physics
    this.ballVelocity.scaleInPlace(this.speedIncrement);
    this.ballVelocity.y -= 0.006;
    this.ball.position.addInPlace(this.ballVelocity);

    // Ground
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }

    // Corner collisions (reverse X & Z)
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

    // Z walls bounce only in 2P (in 4P Z edges are goals)
    if (this.config.playerCount !== 4) {
      if (
        Math.abs(this.ball.position.z) >
        height / 2 - this.ballRadius - t / 2
      ) {
        this.ballVelocity.z *= -1;
        this.ball.position.z = clamp(
          this.ball.position.z,
          -height / 2 + this.ballRadius + t / 2,
          height / 2 - this.ballRadius - t / 2
        );
      }
    }

    // Paddle collisions with angle
    const clamp01 = (v: number) => Math.max(-1, Math.min(1, v));

    // Left(0)/Right(1): collide in X
    for (let idx = 0; idx < Math.min(2, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = 0.1 + this.ballRadius,
        zThr = 1.0 + this.ballRadius;
      const movingIn =
        (idx === 0 && this.ballVelocity.x < 0) ||
        (idx === 1 && this.ballVelocity.x > 0);
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.x = -this.ballVelocity.x * 1.05;
        const sign = idx === 0 ? +1 : -1;
        this.ball.position.x = p.position.x + sign * xThr;
        const dzNorm = clamp01(dz / 1.0);
        this.ballVelocity.z += dzNorm * 0.18;
        clampHorizontal(this.ballVelocity, 0.6);

        this.lastHitter = idx;
        this.touchedOnce = true;
        flashPaddle(p);
      }
    }

    // Bottom(2,+Z)/Top(3,-Z): collide in Z
    for (let idx = 2; idx < Math.min(4, this.paddles.length); idx++) {
      const p = this.paddles[idx];
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      const xThr = 1.0 + this.ballRadius,
        zThr = 0.1 + this.ballRadius;
      const movingIn =
        (idx === 2 && this.ballVelocity.z > 0) ||
        (idx === 3 && this.ballVelocity.z < 0);
      if (Math.abs(dx) < xThr && Math.abs(dz) < zThr && movingIn) {
        this.ballVelocity.z = -this.ballVelocity.z * 1.05;
        const sign = idx === 2 ? -1 : +1; // bottom pushes -Z, top pushes +Z
        this.ball.position.z = p.position.z + sign * zThr;
        const dxNorm = clamp01(dx / 1.0);
        this.ballVelocity.x += dxNorm * 0.18;
        clampHorizontal(this.ballVelocity, 0.6);

        this.lastHitter = idx;
        this.touchedOnce = true;
        flashPaddle(p);
      }
    }

    // Obstacles: precise cylinder in XZ
    for (const o of this.obstacles) {
      const oR = ((o as any).metadata?.radius as number) ?? 0.25;
      const dx = this.ball.position.x - o.position.x;
      const dz = this.ball.position.z - o.position.z;
      const R = this.ballRadius + oR;
      const d2 = dx * dx + dz * dz;
      if (d2 < R * R) {
        const d = Math.sqrt(d2) || 0.0001,
          nx = dx / d,
          nz = dz / d;
        this.ball.position.x = o.position.x + nx * R;
        this.ball.position.z = o.position.z + nz * R;
        const dot = this.ballVelocity.x * nx + this.ballVelocity.z * nz;
        this.ballVelocity.x -= 2 * dot * nx;
        this.ballVelocity.z -= 2 * dot * nz;
        this.ballVelocity.x *= 1.02;
        this.ballVelocity.z *= 1.02;
      }
    }

    // Scoring
    const halfW = width / 2 - this.ballRadius;
    const halfH = height / 2 - this.ballRadius;
    const target = this.config.winScore ?? 10;

    if (this.config.playerCount === 4) {
      const outX = Math.abs(this.ball.position.x) > halfW;
      const outZ = Math.abs(this.ball.position.z) > halfH;
      if (outX || outZ) {
        if (this.touchedOnce && this.lastHitter >= 0) {
          this.scores[this.lastHitter]++;
          this.lastScorer = this.lastHitter;
          this.updateScoreUI();
          if (this.scores[this.lastHitter] >= target)
            this.endAndToast(
              `Player ${["L", "R", "B", "T"][this.lastHitter]} wins!`
            );
          this.resetBall(
            this.lastHitter === 0
              ? 1
              : this.lastHitter === 1
              ? -1
              : (undefined as any)
          );
        } else {
          this.lastScorer = -1;
          this.updateScoreUI();
          this.resetBall();
        }
      }
    } else {
      if (this.ball.position.x > halfW) {
        if (this.touchedOnce) {
          this.scores[1]++;
          this.lastScorer = 1;
          this.updateScoreUI();
          if (this.scores[1] >= target) this.endAndToast("Right wins!");
        }
        this.resetBall(-1);
      } else if (this.ball.position.x < -halfW) {
        if (this.touchedOnce) {
          this.scores[0]++;
          this.lastScorer = 0;
          this.updateScoreUI();
          if (this.scores[0] >= target) this.endAndToast("Left wins!");
        }
        this.resetBall(1);
      }
    }

    // Remote broadcast
    if (this.isHost) this.broadcastState(now);
  }

  private endAndToast(text: string) {
    const t = markUI(document.createElement("div"));
    Object.assign(t.style, {
      position: "fixed",
      top: "20px",
      left: "50%",
      transform: "translateX(-50%)",
      background: "rgba(0,0,0,.7)",
      color: "#fff",
      padding: "10px 14px",
      borderRadius: "10px",
      zIndex: "10001",
      fontFamily: "system-ui,sans-serif",
      boxShadow: "0 10px 24px rgba(0,0,0,.45)",
    });
    t.textContent = text;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 1600);
  }
}

// ---------------- Helpers ----------------
function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
function safeParse<T>(x: any): T | null {
  try {
    return JSON.parse(x) as T;
  } catch {
    return null;
  }
}
function clampHorizontal(v: Vector3, maxH: number) {
  const h = Math.hypot(v.x, v.z);
  if (h > maxH) {
    const s = maxH / h;
    v.x *= s;
    v.z *= s;
  }
}
function shinyMat(
  scene: Scene,
  base: Color3,
  glowStrength = 0.5,
  glow = false
) {
  const m = new StandardMaterial("m", scene);
  m.diffuseColor = base;
  m.specularColor = new Color3(1, 1, 1);
  m.specularPower = 64;
  if (glow) {
    m.emissiveColor = base.scale(glowStrength * 0.6);
  }
  const f = new FresnelParameters();
  f.bias = 0.2;
  f.power = 2;
  f.leftColor = new Color3(1, 1, 1);
  f.rightColor = base;
  (m as any).emissiveFresnelParameters = f;
  return m;
}
function randColor() {
  const palette = [
    new Color3(0.9, 0.4, 0.4),
    new Color3(0.4, 0.9, 0.6),
    new Color3(0.4, 0.7, 0.95),
    new Color3(0.95, 0.85, 0.4),
    new Color3(0.8, 0.5, 0.9),
  ];
  return palette[Math.floor(Math.random() * palette.length)];
}
function flashPaddle(p: import("@babylonjs/core").Mesh) {
  const mat = p.material as StandardMaterial;
  const prev = mat.emissiveColor.clone();
  mat.emissiveColor = new Color3(1, 0.2, 0.2);
  setTimeout(() => (mat.emissiveColor = prev), 100);
}

// ---------------- Bootstrap ----------------
window.addEventListener("load", async () => {
  clearPongUI();

  const config = await Menu.render();
  const tdata = (window as any).__TOURNAMENT__ as
    | { size: 8 | 16; names: string[] }
    | undefined;

  if (!tdata) {
    clearPongUI();
    new Pong3D(config);
    return;
  }

  // Remote-only tournament bracket (each match is a separate room)
  const t = new TournamentManager(tdata.size, tdata.names);
  const baseRoom = config.roomId || "room1";

  const showOverlay = (html: string) => {
    const ov = markUI(document.createElement("div"));
    Object.assign(ov.style, {
      position: "fixed",
      inset: "0",
      display: "grid",
      placeItems: "center",
      background: "rgba(0,0,0,.75)",
      color: "#fff",
      zIndex: "9999",
      fontFamily: "system-ui,sans-serif",
    });
    ov.innerHTML = html;
    document.body.appendChild(ov);
    return ov;
  };

  const nextMatch = () => {
    clearPongUI();
    const m = t.current();
    if (!m) return;
    const roomId = `${baseRoom}-r${t.getRound()}-m${t.getIndex() + 1}`;
    const html = `<div style="padding:18px 22px; background:#111; border-radius:12px;">
      <div style="font-size:13px; opacity:.8; margin-bottom:6px;">Round ${t.getRound()}</div>
      <div style="font-size:20px; font-weight:700; margin-bottom:6px;">${
        m.a
      } vs ${m.b}</div>
      <div style="font-size:12px; opacity:.85; margin-bottom:8px;">Room: <code>${roomId}</code></div>
      <div style="margin-top:10px; text-align:right;"><button id="goBtn">Start match</button></div>
    </div>`;
    const ov = showOverlay(html);
    (ov.querySelector("#goBtn") as HTMLButtonElement).onclick = () => {
      ov.remove();
      clearPongUI();
      const matchCfg: GameConfig = {
        ...config,
        playerCount: 2,
        roomId,
        winScore: config.winScore ?? 10,
      };
      const game = new Pong3D(matchCfg);

      // A very simple way for the host to select winner: we decide by left/right score reaching winScore.
      // If you want manual override UI, you can add it here.
      const interval = setInterval(() => {
        // If the overlay for victory shows and you want to capture, you can extend Pong3D to expose scores.
        // For simplicity, we rebuild next match when someone hits winScore (handled inside the game toast).
        // We'll just poll UI presence as a signal-free approach is more code. Keep lightweight.
        const hudGone = !document.querySelector("[data-pong-ui='1']"); // crude, but we show next screen anyway
        if (hudGone) {
          clearInterval(interval);
        }
      }, 1500);

      // When the tab is reloaded or you want to continue, call:
      const checkLoop = setInterval(() => {
        // after a little while post-win, show next
        // (You can replace w/ a cleaner event from Pong3D if you expose one)
        // To keep it robust, just offer a "Next" button on top on demand.
      }, 2000);

      // After a short delay, ask who won and move bracket. You can hook into your own signal here.
      // For now, we provide a manual "Continue" button to pick the winner:
      const cont =
        showOverlay(`<div style="padding:18px 22px; background:#111; border-radius:12px; text-align:center;">
        <div style="font-size:14px; opacity:.85;">Match finished?</div>
        <div style="margin-top:8px;">
          <button id="leftW" style="margin-right:8px;">Left won</button>
          <button id="rightW">Right won</button>
        </div>
      </div>`);
      (cont.querySelector("#leftW") as HTMLButtonElement).onclick = () => {
        cont.remove();
        const champ = t.reportWinner(m.a);
        champ ? showChampion(champ) : nextMatch();
      };
      (cont.querySelector("#rightW") as HTMLButtonElement).onclick = () => {
        cont.remove();
        const champ = t.reportWinner(m.b);
        champ ? showChampion(champ) : nextMatch();
      };
    };
  };

  const showChampion = (name: string) => {
    clearPongUI();
    const ov =
      showOverlay(`<div style="padding:22px 26px; background:#111; border-radius:12px; text-align:center;">
      <div style="font-size:14px; opacity:.8; margin-bottom:6px;">Champion</div>
      <div style="font-size:24px; font-weight:800; letter-spacing:.4px;">${name}</div>
      <div style="margin-top:12px;"><button id="okBtn">Done</button></div>
    </div>`);
    (ov.querySelector("#okBtn") as HTMLButtonElement).onclick = () =>
      location.reload();
  };

  nextMatch();
});
