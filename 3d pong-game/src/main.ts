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

/* =========================================================
   TYPES
   ========================================================= */

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
  // When using backend APIs, these are filled automatically:
  wsUrl?: string;
  roomId?: string; // opaque ID from backend; code is human-readable
  winScore?: number; // default 10
  // Metadata for DB recording:
  matchId?: string; // returned by API when creating/joining online game
  tournament?: {
    tournamentId: string;
    round: number;
    matchIndex: number;
    leftUserId: string;
    rightUserId: string;
  };
  currentUser?: User | null;
  sessionId?: string | null; // for socket auth/telemetry
  // UI:
  displayNames?: string[]; // e.g., ["You", "AI lvl 7"] or players' names
}

// Relay messages. Server is pass-through; host is authoritative.
type RemoteMsg =
  | { t: "hello"; roomId: string; mode: "2p" | "4p"; sid?: string }
  | { t: "join"; roomId: string; idx?: 0 | 1 | 2 | 3 } // echoed to host on guest join
  | { t: "assign"; idx: number } // relay -> guest
  | { t: "start" } // host -> guests
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
      obstacles: {
        x: number;
        z: number;
        radius: number;
        color: [number, number, number];
        cap: [number, number, number];
      }[];
    }
  // guest -> host: “neg/pos” = along paddle axis (Z for L/R; X for B/T)
  | { t: "input"; idx: number; neg: boolean; pos: boolean; sid?: string };

/* =========================================================
   LIGHTWEIGHT SITE INTEGRATION (API CLIENT)
   Replace endpoints with yours. These are minimal, robust stubs.
   Every call uses credentials: 'include' (cookie sessions OK).
   ========================================================= */

type User = { id: string; name: string; avatarUrl?: string };
type Session = { user: User; sessionId: string };

class ApiClient {
  // ---- Auth
  static async me(): Promise<Session | null> {
    try {
      const r = await fetch("/api/auth/me", { credentials: "include" });
      if (!r.ok) return null;
      return (await r.json()) as Session;
    } catch {
      return null;
    }
  }

  // ---- Online Matchmaking
  static async createOnlineMatch(params: {
    playerCount: PlayerCount;
  }): Promise<{
    wsUrl: string;
    roomId: string;
    code: string;
    matchId: string;
  }> {
    const r = await fetch("/api/pong/matches", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playerCount: params.playerCount }),
    });
    if (!r.ok) throw new Error("Failed to create match");
    return r.json();
  }

  static async joinOnlineMatch(params: {
    code: string;
  }): Promise<{ wsUrl: string; roomId: string; matchId: string }> {
    const r = await fetch(`/api/pong/matches/join`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: params.code }),
    });
    if (!r.ok) throw new Error("Failed to join match");
    return r.json();
  }

  static async postMatchResult(params: {
    matchId: string;
    winnerUserId?: string | null;
    scores: number[];
  }) {
    await fetch(
      `/api/pong/matches/${encodeURIComponent(params.matchId)}/result`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    ).catch(() => {});
  }

  // ---- Tournament
  static async listOnlinePlayers(): Promise<User[]> {
    const r = await fetch("/api/pong/players/online", {
      credentials: "include",
    });
    if (!r.ok) return [];
    return r.json();
  }

  static async createTournament(params: {
    size: 8 | 16;
    participants: string[]; // userIds
  }): Promise<{ tournamentId: string; code: string }> {
    const r = await fetch("/api/pong/tournaments", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });
    if (!r.ok) throw new Error("Failed to create tournament");
    return r.json();
  }

  static async reportTournamentMatch(params: {
    tournamentId: string;
    round: number;
    matchIndex: number;
    leftUserId: string;
    rightUserId: string;
    leftScore: number;
    rightScore: number;
    winnerUserId: string;
  }) {
    await fetch(
      `/api/pong/tournaments/${encodeURIComponent(params.tournamentId)}/report`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params),
      }
    ).catch(() => {});
  }
}

/* =========================================================
   UI HELPERS
   ========================================================= */

function clearPongUI() {
  document
    .querySelectorAll<HTMLElement>("[data-pong-ui='1']")
    .forEach((n) => n.remove());
}
function markUI(el: HTMLElement) {
  el.setAttribute("data-pong-ui", "1");
  return el;
}
function genCode(len = 6) {
  const a = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < len; i++) s += a[(Math.random() * a.length) | 0];
  return s;
}

/* =========================================================
   MENU
   ========================================================= */

class Menu {
  static async render(): Promise<GameConfig> {
    clearPongUI();

    const session = await ApiClient.me(); // may be null
    const you = session?.user;

    return new Promise((resolve) => {
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
        <div style="background:#0f1115; padding:22px 24px; border-radius:14px; width:min(880px, 94vw); box-shadow:0 10px 36px rgba(0,0,0,.5);">
          <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">
            <h1 style="margin:0; font-size:22px; letter-spacing:.3px;">3D Pong — Match Setup</h1>
            <div style="font-size:13px; opacity:.9;">${
              you
                ? `Signed in as <b>${you.name}</b>`
                : `<span style="opacity:.8">Not signed in</span>`
            }</div>
          </div>

          <div style="display:grid; grid-template-columns: repeat(auto-fit,minmax(220px,1fr)); gap:14px;">
            <div style="background:#12141b; border-radius:12px; padding:12px;">
              <div style="font-size:13px; opacity:.8; margin-bottom:6px;">Local</div>
              <button data-action="local2" class="btn">2P Local (Player One vs Player Two)</button>
              <div style="height:6px"></div>
              <div>
                <label style="font-size:12px; opacity:.85;">Vs AI Difficulty</label>
                <div style="display:flex; align-items:center; gap:8px;">
                  <input id="aiSlider" type="range" min="1" max="10" step="1" value="6" style="flex:1;">
                  <span id="aiVal" style="width:22px; text-align:center;">6</span>
                </div>
                <button data-action="ai2" class="btn" style="margin-top:8px;">1P vs AI</button>
              </div>
            </div>

            <div style="background:#12141b; border-radius:12px; padding:12px;">
              <div style="font-size:13px; opacity:.8; margin-bottom:6px;">Online</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap;">
                <button data-action="host2" class="btn">Create 2P Match</button>
                <button data-action="join2" class="btn btn-subtle">Join 2P (Enter Code)</button>
                <button data-action="host4" class="btn">Create 4P Match</button>
                <button data-action="join4" class="btn btn-subtle">Join 4P (Enter Code)</button>
              </div>
              <div style="font-size:12px; opacity:.8; margin-top:8px;">Online modes require login.</div>
            </div>

            <div style="background:#12141b; border-radius:12px; padding:12px;">
              <div style="font-size:13px; opacity:.8; margin-bottom:6px;">Tournament</div>
              <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                <label>Size:
                  <select id="tSize">
                    <option value="8" selected>8</option>
                    <option value="16">16</option>
                  </select>
                </label>
                <button data-action="tourn" class="btn">Create Tournament</button>
              </div>
              <div style="font-size:12px; opacity:.8; margin-top:8px;">Players must be online to join. Results are posted to DB.</div>
            </div>
          </div>
        </div>
      `;

      const css = document.createElement("style");
      css.setAttribute("data-pong-ui", "1");
      css.textContent = `
        .btn{background:#1a1d27; border:1px solid #262b3a; color:#fff; padding:.5rem .7rem; border-radius:10px; cursor:pointer; font-weight:600;}
        .btn:hover{background:#202536;}
        .btn-subtle{background:transparent;}
        .ov{position:fixed; inset:0; display:grid; place-items:center; background:rgba(0,0,0,.7); z-index:10001; font-family:system-ui,sans-serif; color:#fff;}
        .card{background:#0f1115; border:1px solid #252a38; padding:16px; border-radius:12px; min-width:320px;}
        .muted{opacity:.85; font-size:12px;}
        input,select{background:#0c0e13; color:#fff; border:1px solid #252a38; border-radius:8px; padding:.35rem .5rem;}
        code{background:#0c0e13; padding:.15rem .35rem; border-radius:6px; border:1px solid #232836;}
      ";
      `;
      document.head.appendChild(css);
      document.body.appendChild(root);

      const aiSlider = root.querySelector("#aiSlider") as HTMLInputElement;
      const aiVal = root.querySelector("#aiVal") as HTMLSpanElement;
      aiSlider.addEventListener(
        "input",
        () => (aiVal.textContent = aiSlider.value)
      );

      const tSizeSel = root.querySelector("#tSize") as HTMLSelectElement;

      const ensureLogin = async (): Promise<Session> => {
        const s = await ApiClient.me();
        if (!s) {
          overlay(`<div class="card">
            <div style="font-weight:700; margin-bottom:6px;">Sign in required</div>
            <div class="muted">Please sign in on the website, then come back.</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>OK</button></div>
          </div>`);
          throw new Error("not-signed-in");
        }
        return s;
      };

      function overlay(html: string) {
        const ov = markUI(document.createElement("div"));
        ov.className = "ov";
        ov.innerHTML = html;
        ov.addEventListener("click", (e) => {
          const t = e.target as HTMLElement;
          if (t && t.hasAttribute("data-close")) ov.remove();
        });
        document.body.appendChild(ov);
        return ov;
      }

      async function startLocal2P() {
        const cfg: GameConfig = {
          playerCount: 2,
          connection: "local",
          winScore: 10,
          currentUser: you || null,
          displayNames: ["Player One", "Player Two"],
        };
        root.remove();
        new Pong3D(cfg);
      }

      async function startVsAI() {
        const lvl = parseInt(aiSlider.value, 10);
        const cfg: GameConfig = {
          playerCount: 2,
          connection: "ai",
          aiDifficulty: lvl,
          winScore: 10,
          currentUser: you || null,
          displayNames: [you?.name || "You", `AI (lvl ${lvl})`],
        };
        root.remove();
        new Pong3D(cfg);
      }

      async function createOnline(playerCount: PlayerCount) {
        const s = await ensureLogin();
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Creating ${playerCount}P Match…</div>
          <div class="muted">Please wait…</div>
        </div>`);

        try {
          const { wsUrl, roomId, code, matchId } =
            await ApiClient.createOnlineMatch({ playerCount });
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">Match Created</div>
            <div class="muted">Share this code with your friend(s):</div>
            <div style="font-size:20px; font-weight:800; margin:6px 0;"><code>${code}</code></div>
            <div class="muted">Waiting for players to join…</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-go>Launch</button></div>
          </div>`;

          (ov.querySelector("[data-go]") as HTMLButtonElement).onclick = () => {
            ov.remove();
            const cfg: GameConfig = {
              playerCount,
              connection: playerCount === 4 ? "remote4Host" : "remoteHost",
              wsUrl,
              roomId,
              winScore: 10,
              matchId,
              currentUser: s.user,
              sessionId: s.sessionId,
              displayNames:
                playerCount === 2
                  ? [s.user.name, "Waiting…"]
                  : [s.user.name, "…", "…", "…"],
            };
            root.remove();
            new Pong3D(cfg);
          };
        } catch (e: any) {
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">Unable to create match</div>
            <div class="muted">${e?.message || "Please try again."}</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
          </div>`;
        }
      }

      async function joinOnline(playerCount: PlayerCount) {
        const s = await ensureLogin();
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Join ${playerCount}P Match</div>
          <div class="muted">Enter the code:</div>
          <div style="display:flex; gap:8px; margin-top:8px;">
            <input id="joinCode" placeholder="ABC123" style="flex:1; text-transform:uppercase;">
            <button class="btn" id="joinBtn">Join</button>
          </div>
        </div>`);
        const btn = ov.querySelector("#joinBtn") as HTMLButtonElement;
        const inp = ov.querySelector("#joinCode") as HTMLInputElement;
        btn.onclick = async () => {
          btn.disabled = true;
          try {
            const { wsUrl, roomId, matchId } = await ApiClient.joinOnlineMatch({
              code: inp.value.trim().toUpperCase(),
            });
            ov.remove();
            const cfg: GameConfig = {
              playerCount,
              connection: playerCount === 4 ? "remote4Guest" : "remoteGuest",
              wsUrl,
              roomId,
              winScore: 10,
              matchId,
              currentUser: s.user,
              sessionId: s.sessionId,
              displayNames:
                playerCount === 2
                  ? [s.user.name, "Host"]
                  : [s.user.name, "…", "…", "…"],
            };
            root.remove();
            new Pong3D(cfg);
          } catch (e: any) {
            btn.disabled = false;
            (ov.querySelector(".muted") as HTMLElement).textContent =
              "Invalid code or match is full.";
          }
        };
      }

      async function createTournament() {
        const s = await ensureLogin();
        const size = parseInt(tSizeSel.value, 10) as 8 | 16;
        const ov = overlay(`<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Create Tournament (${size})</div>
          <div class="muted">Fetching online players…</div>
        </div>`);

        const players = await ApiClient.listOnlinePlayers();
        if (!players.length) {
          ov.innerHTML = `<div class="card">
            <div style="font-weight:700; margin-bottom:8px;">No online players</div>
            <div class="muted">Ask players to sign in and come online.</div>
            <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
          </div>`;
          return;
        }

        ov.innerHTML = `<div class="card">
          <div style="font-weight:700; margin-bottom:8px;">Select ${size} players</div>
          <div style="max-height:280px; overflow:auto; margin:8px 0;">
            ${players
              .map(
                (
                  p
                ) => `<label style="display:flex; align-items:center; gap:8px; margin:6px 0;">
                  <input type="checkbox" value="${p.id}"> ${p.name}
                </label>`
              )
              .join("")}
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center;">
            <div class="muted">You’re included automatically if selected.</div>
            <button class="btn" id="go">Create</button>
          </div>
        </div>`;

        (ov.querySelector("#go") as HTMLButtonElement).onclick = async () => {
          const ids = Array.from(
            ov.querySelectorAll<HTMLInputElement>(
              'input[type="checkbox"]:checked'
            )
          ).map((i) => i.value);
          if (ids.length !== size) {
            alert(`Please select exactly ${size} players.`);
            return;
          }
          try {
            const { tournamentId, code } = await ApiClient.createTournament({
              size,
              participants: ids,
            });
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:6px;">Tournament Created</div>
              <div class="muted">Share this code with participants:</div>
              <div style="font-size:20px; font-weight:800; margin:6px 0;"><code>${code}</code></div>
              <div class="muted">When each match starts, this app will post results to your DB automatically.</div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Done</button></div>
            </div>`;
          } catch (e: any) {
            ov.innerHTML = `<div class="card">
              <div style="font-weight:700; margin-bottom:8px;">Couldn’t create tournament</div>
              <div class="muted">${e?.message || "Please try again."}</div>
              <div style="margin-top:10px; text-align:right;"><button class="btn" data-close>Close</button></div>
            </div>`;
          }
        };
      }

      root.addEventListener("click", (e) => {
        const t = e.target as HTMLElement;
        if (!t || !t.dataset.action) return;
        const a = t.dataset.action;
        if (a === "local2") startLocal2P();
        if (a === "ai2") startVsAI();
        if (a === "host2") createOnline(2);
        if (a === "join2") joinOnline(2);
        if (a === "host4") createOnline(4);
        if (a === "join4") joinOnline(4);
        if (a === "tourn") createTournament();
      });
    });
  }
}

/* =========================================================
   TOURNAMENT (light bracket manager used when needed)
   ========================================================= */

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

/* =========================================================
   GAME
   ========================================================= */

class Pong3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private ball!: import("@babylonjs/core").Mesh;
  private ballVelocity = new Vector3();

  private paddles: import("@babylonjs/core").Mesh[] = [];
  private obstacles: import("@babylonjs/core").Mesh[] = [];
  private obstacleInfo: {
    x: number;
    z: number;
    radius: number;
    color: [number, number, number];
    cap: [number, number, number];
  }[] = [];
  private builtObstaclesFromNet = false;
  private corners: import("@babylonjs/core").Mesh[] = [];

  private keys: Record<string, boolean> = {};
  private control: ("human" | "ai" | "remoteGuest")[] = [];

  private aiError: number[] = [0, 0, 0, 0];
  private aiErrorRangePerPaddle: number[] = [2, 2, 2, 2];
  private aiLerpPerPaddle: number[] = [0.08, 0.08, 0.08, 0.08];
  private aiVel: number[] = [0, 0, 0, 0];

  private scores = [0, 0, 0, 0];
  private scoreElems: HTMLSpanElement[] = [];
  private nameElems: HTMLSpanElement[] = [];
  private lastScorer = -1;
  private lastHitter = -1;
  private touchedOnce = false;
  private obstacleAfterHit = false;

  private ballRadius = 0.2;
  private speedIncrement = 1.0001;
  private wallThickness = 0.1;
  private cornerSize = this.wallThickness * 5;

  private ws?: WebSocket;
  private remoteIndex: 0 | 1 | 2 | 3 = 0; // your assigned index online
  private guestInputs: Record<number, { neg: boolean; pos: boolean }> = {};
  private lastStateSent = 0;

  private isHost = false;
  private isGuest = false;
  private requiredGuests = 0; // 1 (2P) or 3 (4P)
  private connectedGuests = 0;
  private matchReady = true;
  private waitUI?: HTMLDivElement;

  // camera “always my paddle on the left”:
  private baseAlpha = Math.PI / 2; // default
  private viewTheta = 0; // extra Y rotation so my paddle becomes left

  constructor(private config: GameConfig) {
    const canvas =
      (document.getElementById("gameCanvas") as HTMLCanvasElement) ||
      (() => {
        const c = document.createElement("canvas");
        c.id = "gameCanvas";
        Object.assign(c.style, {
          position: "fixed",
          inset: "0",
          width: "100%",
          height: "100%",
          display: "block",
          background: "#0a0c12",
        });
        document.body.appendChild(c);
        return c;
      })();

    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.06, 0.07, 0.1, 1);

    this.camera = new ArcRotateCamera(
      "cam",
      this.baseAlpha, // alpha
      Math.PI / 4.2, // beta
      28, // radius
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraPointersInput");
    this.camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // Input — track arrows + W/S (and Shift if you still use it elsewhere)
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
        ].includes(k)
      ) {
        this.keys[k] = v;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey(true));
    window.addEventListener("keyup", onKey(false));

    // Remote role
    this.isHost =
      this.config.connection === "remoteHost" ||
      this.config.connection === "remote4Host";
    this.isGuest =
      this.config.connection === "remoteGuest" ||
      this.config.connection === "remote4Guest";

    // Waiting overlay text
    if (this.isHost) {
      this.requiredGuests = this.config.playerCount === 4 ? 3 : 1;
      this.connectedGuests = 0;
      this.matchReady = this.requiredGuests === 0;
      this.showWaitingOverlay(`Waiting for players… 0/${this.requiredGuests}`);
      this.remoteIndex = 0; // host is index 0 (Left)
      this.setViewRotationForIndex(0);
    } else if (this.isGuest) {
      this.matchReady = false;
      this.showWaitingOverlay("Connecting to host…");
      // index will be set after "assign"
    }

    this.createScoreUI();
    this.init();
    if (this.isHost || this.isGuest) this.initRemote();
  }

  /* ---------------- UI ---------------- */

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

    const slots = this.config.playerCount === 4 ? 4 : 2;
    const colors = ["#58d68d", "#5dade2", "#f7dc6f", "#ec7063"];
    for (let i = 0; i < slots; i++) {
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
      label.textContent = ["L", "R", "B", "T"][i];

      const name = document.createElement("span");
      Object.assign(name.style, { fontSize: "12px", opacity: ".85" });
      name.textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";

      const score = document.createElement("span");
      Object.assign(score.style, {
        fontWeight: "800",
        fontSize: "18px",
        minWidth: "26px",
        textAlign: "right",
      });
      score.textContent = "0";

      const wrap = document.createElement("div");
      wrap.style.display = "flex";
      wrap.style.flexDirection = "column";
      wrap.append(label, name);

      badge.append(dot, wrap, score);
      hud.appendChild(badge);
      this.nameElems.push(name);
      this.scoreElems.push(score);
    }
    document.body.appendChild(hud);
  }
  private updateNamesUI() {
    const slots = this.config.playerCount === 4 ? 4 : 2;
    for (let i = 0; i < slots; i++) {
      if (!this.nameElems[i]) continue;
      this.nameElems[i].textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";
    }
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
    if (this.isHost) {
      try {
        this.ws?.send(JSON.stringify({ t: "start" } as RemoteMsg));
      } catch {}
    }
  }

  /* ---------------- Scene ---------------- */

  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 0.9;

    // Field
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseColor = new Color3(0.18, 0.2, 0.26);
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

    // Corners
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
    ballMat.diffuseTexture = new Texture("textures/ball.png", this.scene);
    this.ball = MeshBuilder.CreateSphere(
      "ball",
      { diameter: this.ballRadius * 2, segments: 16 },
      this.scene
    );
    this.ball.material = ballMat;
    this.ball.position = new Vector3(0, 0.3, 0);

    // Paddles (L,R,B,T indices)
    const dAxis = (this.config.playerCount === 4 ? height : width) / 2 - 0.3;
    const newPaddle = (
      x: number,
      z: number,
      rotY: number,
      idx: number,
      color: Color3,
      name?: string
    ) => {
      const p = MeshBuilder.CreateBox(
        `paddle${idx}`,
        { width: 0.2, height: 1, depth: 2 },
        this.scene
      );
      p.position.set(x, 0.5, z);
      p.rotation.y = rotY;
      p.material = shinyMat(this.scene, color, 0.6, true);
      this.paddles.push(p);
      if (name && this.config.displayNames)
        this.config.displayNames[idx] = name;
    };
    if (this.config.playerCount === 4) {
      newPaddle(-dAxis, 0, 0, 0, new Color3(0.35, 0.9, 0.6));
      newPaddle(+dAxis, 0, 0, 1, new Color3(0.36, 0.63, 0.92));
      newPaddle(0, +dAxis, Math.PI / 2, 2, new Color3(0.97, 0.85, 0.35));
      newPaddle(0, -dAxis, Math.PI / 2, 3, new Color3(0.92, 0.44, 0.39));
    } else {
      newPaddle(-dAxis, 0, 0, 0, new Color3(0.35, 0.9, 0.6));
      newPaddle(+dAxis, 0, 0, 1, new Color3(0.36, 0.63, 0.92));
    }
    this.updateNamesUI();

    // Control roles
    if (this.config.playerCount === 4) {
      if (this.config.connection === "ai3") {
        this.control = ["human", "ai", "ai", "ai"];
        this.applyAIDifficulty([1, 2, 3], this.config.aiDifficulty ?? 6);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remote4Host") {
        this.control = ["human", "remoteGuest", "remoteGuest", "remoteGuest"];
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remote4Guest") {
        this.control = ["human", "human", "human", "human"]; // render only; your input is sent to host
      } else {
        this.control = ["human", "human", "human", "human"];
        this.setViewRotationForIndex(0);
      }
    } else {
      if (this.config.connection === "ai") {
        this.control = ["human", "ai"];
        this.applyAIDifficulty([1], this.config.aiDifficulty ?? 6);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remoteHost") {
        this.control = ["human", "remoteGuest"];
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remoteGuest") {
        this.control = ["human", "human"]; // render only
      } else {
        // Local 2P: neutral camera so both players see a standard field
        this.control = ["human", "human"];
        this.camera.alpha = this.baseAlpha;
      }
    }

    // Obstacles: host/local spawns; guests build from net
    if (!this.isGuest) this.spawnObstacles(width, height);

    if (this.matchReady) this.resetBall(Math.random() < 0.5 ? 1 : -1);
    else {
      this.ball.position.set(0, 0.3, 0);
      this.ballVelocity.set(0, 0, 0);
    }

    this.engine.runRenderLoop(() => {
      this.update(width, height);
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private setViewRotationForIndex(idx: 0 | 1 | 2 | 3) {
    // Rotate camera so your paddle appears on the LEFT
    const map: Record<number, number> = {
      0: 0, // Left stays left
      1: Math.PI, // Right → left
      2: -Math.PI / 2, // Bottom(+Z) → left
      3: +Math.PI / 2, // Top(-Z) → left
    };
    this.viewTheta = map[idx] ?? 0;
    this.camera.alpha = this.baseAlpha + this.viewTheta;
  }

  private applyAIDifficulty(idxs: number[], d: number) {
    const t = Math.min(10, Math.max(1, d));
    const s = (t - 1) / 9; // 0..1
    const errRange = lerp(2.2, 0.0, s);
    const lerpAmt = lerp(0.06, 0.18, s);
    idxs.forEach((i) => {
      this.aiErrorRangePerPaddle[i] = errRange;
      this.aiLerpPerPaddle[i] = lerpAmt;
    });
  }

  private spawnObstacles(width: number, height: number) {
    const count = 5;
    const chosen: Vector3[] = [];
    const minGap = 1.0;

    this.obstacleInfo = [];
    for (let i = 0; i < count; i++) {
      let x = 0,
        z = 0,
        ok = false,
        tries = 0;
      const radius = 0.26 + Math.random() * 0.2;
      while (!ok && tries++ < 60) {
        x = (Math.random() * 2 - 1) * (width / 2 - 2);
        z = (Math.random() * 2 - 1) * (height / 2 - 2);
        ok = Math.abs(x) > 1.2 || Math.abs(z) > 1.2;
        if (ok)
          for (const p of chosen)
            if (Vector3.Distance(new Vector3(x, 0, z), p) < minGap + radius) {
              ok = false;
              break;
            }
      }
      chosen.push(new Vector3(x, 0, z));
      const bodyCol = randColor();
      const capCol = randWhiteTint(); // <-- different white-ish per obstacle
      const bodyArr: [number, number, number] = [
        bodyCol.r,
        bodyCol.g,
        bodyCol.b,
      ];
      const capArr: [number, number, number] = [capCol.r, capCol.g, capCol.b];
      this.obstacleInfo.push({ x, z, radius, color: bodyArr, cap: capArr });
      this.buildObstacleMesh(x, z, radius, bodyCol, capCol);
    }
  }

  private buildObstacleMesh(
    x: number,
    z: number,
    radius: number,
    bodyCol: Color3,
    capCol: Color3
  ) {
    const h = 1;
    const body = MeshBuilder.CreateCylinder(
      `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
      { diameter: radius * 2, height: h, tessellation: 24 },
      this.scene
    );
    body.position.set(x, h / 2, z);
    body.material = shinyMat(this.scene, bodyCol, 0.7, true);
    (body as any).metadata = { radius };
    this.obstacles.push(body);

    const cap = MeshBuilder.CreateCylinder(
      `cap-${x.toFixed(3)}-${z.toFixed(3)}`,
      { diameter: radius * 2 * 0.96, height: 0.06, tessellation: 24 },
      this.scene
    );
    cap.position.set(x, h + 0.03, z);
    const capMat = shinyMat(this.scene, capCol, 1.0, true);
    capMat.emissiveColor = capCol.scale(1.15);
    cap.material = capMat;
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
    this.control.forEach((c, i) => {
      if (c === "ai")
        this.aiError[i] =
          (Math.random() * 2 - 1) * this.aiErrorRangePerPaddle[i];
      this.aiVel[i] = 0;
    });
    this.lastHitter = -1;
    this.touchedOnce = false;
    this.obstacleAfterHit = false;
  }

  // Randomize the rebound direction a bit, then clamp horizontal speed
  private jitterBounce(axis: "x" | "z" | "xz", amount = 0.08) {
    const rx = (Math.random() * 2 - 1) * amount;
    const rz = (Math.random() * 2 - 1) * (amount * 0.6);
    if (axis === "x" || axis === "xz") this.ballVelocity.x += rx;
    if (axis === "z" || axis === "xz") this.ballVelocity.z += rz;
    clampHorizontal(this.ballVelocity, 0.6);
  }

  /* ---------------- Remote ---------------- */

  private initRemote() {
    if (!this.config.wsUrl || !this.config.roomId) return;
    try {
      this.ws = new WebSocket(this.config.wsUrl);
      this.ws.onopen = () => {
        const hello: RemoteMsg = {
          t: this.isHost ? "hello" : "join",
          roomId: this.config.roomId!,
          mode: this.config.playerCount === 4 ? "4p" : "2p",
          sid: this.config.sessionId || undefined,
        };
        this.ws?.send(JSON.stringify(hello));
      };
      this.ws.onmessage = (ev) => {
        const msg = safeParse<RemoteMsg>(ev.data);
        if (!msg) return;

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

        if (msg.t === "assign" && this.isGuest) {
          this.remoteIndex = (msg.idx as 0 | 1 | 2 | 3) ?? 1;
          // Always rotate so *your* paddle is on the left
          this.setViewRotationForIndex(this.remoteIndex);
          if (!this.matchReady) this.updateWaitingOverlay("Waiting for start…");
          return;
        }

        if (msg.t === "start" && this.isGuest) {
          if (!this.matchReady) {
            this.matchReady = true;
            this.hideWaitingOverlay();
          }
          return;
        }

        if (msg.t === "state" && this.isGuest) {
          this.ball.position.set(msg.ball.x, msg.ball.y, msg.ball.z);
          this.ballVelocity.set(msg.ball.vx, msg.ball.vy, msg.ball.vz);

          if (!this.builtObstaclesFromNet && msg.obstacles?.length) {
            this.obstacles.forEach((m) => m.dispose());
            this.obstacles = [];
            this.obstacleInfo = [];
            for (const o of msg.obstacles) {
              const body = new Color3(o.color[0], o.color[1], o.color[2]);
              const cap = new Color3(o.cap[0], o.cap[1], o.cap[2]);
              this.obstacleInfo.push(o);
              this.buildObstacleMesh(o.x, o.z, o.radius, body, cap);
            }
            this.builtObstaclesFromNet = true;
          }

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

        if (msg.t === "input" && this.isHost) {
          this.guestInputs[msg.idx] = {
            neg: !!(msg as any).neg,
            pos: !!(msg as any).pos,
          };
          return;
        }
      };

      if (this.isGuest) {
        const sendInputs = () => {
          // Map arrows to generic axis (neg/pos) based on your assigned paddle index.
          let neg = false,
            pos = false;
          const idx = this.remoteIndex;
          if (idx === 0 || idx === 1) {
            // L/R → move Z (neg=up, pos=down)
            neg = !!this.keys["arrowup"];
            pos = !!this.keys["arrowdown"];
          } else if (idx === 2) {
            // Bottom(+Z) → move X (neg=left, pos=right)
            neg = !!this.keys["arrowleft"];
            pos = !!this.keys["arrowright"];
          } else if (idx === 3) {
            // Top(-Z) → move X mirrored (neg=right, pos=left)
            neg = !!this.keys["arrowright"];
            pos = !!this.keys["arrowleft"];
          }

          const pkt: RemoteMsg = {
            t: "input",
            idx,
            neg,
            pos,
            sid: this.config.sessionId || undefined,
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
      obstacles: this.obstacleInfo.map((o) => ({ ...o })),
    };
    try {
      this.ws.send(JSON.stringify(msg));
    } catch {}
  }

  /* ---------------- Tick ---------------- */

  private update(width: number, height: number) {
    const now = performance.now();
    if (!this.matchReady) {
      if (this.isHost) this.broadcastState(now);
      return;
    }

    const move = 0.2;
    const [p1, p2, p3, p4] = this.paddles;

    // Arrow-only control for local/host
    // L/R paddles use Up/Down for Z. Bottom uses Left/Right for X. Top uses Right/Left mirrored.
    if (this.config.playerCount === 4) {
      // Left (host or local)
      if (this.control[0] === "human") {
        if (this.keys["arrowup"]) p1.position.z -= move;
        if (this.keys["arrowdown"]) p1.position.z += move;
      }

      if (this.config.connection === "remote4Host") {
        if (this.guestInputs[1]?.neg) this.paddles[1].position.z -= move; // right Z-
        if (this.guestInputs[1]?.pos) this.paddles[1].position.z += move; // right Z+
        if (this.guestInputs[2]?.neg) this.paddles[2].position.x -= move; // bottom X-
        if (this.guestInputs[2]?.pos) this.paddles[2].position.x += move; // bottom X+
        if (this.guestInputs[3]?.neg) this.paddles[3].position.x += move; // top X+ (mirrored)
        if (this.guestInputs[3]?.pos) this.paddles[3].position.x -= move; // top X-
      } else {
        // local 4P (fallback): allow arrow-left/right to move Bottom, arrow-up/down Left
        if (this.control[2] === "human") {
          if (this.keys["arrowleft"]) p3.position.x -= move;
          if (this.keys["arrowright"]) p3.position.x += move;
        }
      }

      // AI for the rest (if any)
      [0, 1, 2, 3].forEach((i) => this.runAI(i, width, height, move));
    } else {
      // ---------- 2P ----------
      if (this.control[1] === "ai") {
        // P1 (you) on Up/Down
        if (this.keys["arrowup"]) p1.position.z -= move;
        if (this.keys["arrowdown"]) p1.position.z += move;
        // P2 is AI
        this.runAI(1, width, height, move);
      } else if (this.config.connection === "remoteHost") {
        // P1 (host) on Up/Down
        if (this.keys["arrowup"]) p1.position.z -= move;
        if (this.keys["arrowdown"]) p1.position.z += move;
        // P2 from guest
        if (this.guestInputs[1]?.neg) p2.position.z -= move;
        if (this.guestInputs[1]?.pos) p2.position.z += move;
      } else if (this.config.connection === "remoteGuest") {
        // Guest renders only; inputs are sent in initRemote()
      } else {
        // ---- LOCAL 2P ----
        // Left paddle (p1) = W/S
        if (this.keys["w"]) p1.position.z -= move;
        if (this.keys["s"]) p1.position.z += move;

        // Right paddle (p2) = Arrow Up/Down
        if (this.keys["arrowup"]) p2.position.z -= move;
        if (this.keys["arrowdown"]) p2.position.z += move;
      }
    }

    // Clamp paddles and keep out of corners
    const padW2 = 0.1,
      padD2 = 1.0;
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

    // Corners (optional tiny randomness here too)
    const cornerRadius = (this.cornerSize * Math.SQRT2) / 2;
    for (const c of this.corners) {
      const dist = Vector3.Distance(this.ball.position, c.position);
      const hitR = this.ballRadius + cornerRadius;
      if (dist < hitR) {
        this.ballVelocity.x *= -1;
        this.ballVelocity.z *= -1;
        const n = this.ball.position.subtract(c.position).normalize();
        this.ball.position = c.position.add(n.scale(hitR + 0.02));
        this.jitterBounce("xz", 0.05);
      }
    }

    // Z bounces for 2P only (randomize every time)
    if (this.config.playerCount !== 4) {
      const zLimit = height / 2 - this.ballRadius - t / 2;
      if (Math.abs(this.ball.position.z) > zLimit) {
        this.ballVelocity.z *= -1;
        this.jitterBounce("xz", 0.08);
        this.ball.position.z = clamp(this.ball.position.z, -zLimit, zLimit);
      }
    }

    // Paddles collisions
    const clamp01 = (v: number) => Math.max(-1, Math.min(1, v));
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
        this.obstacleAfterHit = false;
        flashPaddle(p);
      }
    }
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
        const sign = idx === 2 ? -1 : +1;
        this.ball.position.z = p.position.z + sign * zThr;
        const dxNorm = clamp01(dx / 1.0);
        this.ballVelocity.x += dxNorm * 0.18;
        clampHorizontal(this.ballVelocity, 0.6);
        this.lastHitter = idx;
        this.touchedOnce = true;
        this.obstacleAfterHit = false;
        flashPaddle(p);
      }
    }

    // Obstacles
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
        if (this.lastHitter >= 0 && this.touchedOnce)
          this.obstacleAfterHit = true;
      }
    }

    // Scoring + penalty
    const halfW = width / 2 - this.ballRadius;
    const halfH = height / 2 - this.ballRadius;
    const target = this.config.winScore ?? 10;

    const applyPenaltyIfNeeded = (idx: number) => {
      if (this.obstacleAfterHit && this.lastHitter === idx) {
        this.scores[idx] -= 1;
        this.lastScorer = idx;
        this.updateScoreUI();
      }
      this.obstacleAfterHit = false;
    };

    if (this.config.playerCount === 4) {
      const outX = Math.abs(this.ball.position.x) > halfW;
      const outZ = Math.abs(this.ball.position.z) > halfH;
      if (outX || outZ) {
        if (this.touchedOnce && this.lastHitter >= 0) {
          if (this.ball.position.x < -halfW) applyPenaltyIfNeeded(0);
          if (this.ball.position.x > +halfW) applyPenaltyIfNeeded(1);
          if (this.ball.position.z > +halfH) applyPenaltyIfNeeded(2);
          if (this.ball.position.z < -halfH) applyPenaltyIfNeeded(3);

          this.scores[this.lastHitter]++;
          this.lastScorer = this.lastHitter;
          this.updateScoreUI();

          if (this.scores[this.lastHitter] >= target) {
            this.finishAndReport(this.lastHitter);
            return;
          }
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
          applyPenaltyIfNeeded(1);
          this.scores[1]++;
          this.lastScorer = 1;
          this.updateScoreUI();
          if (this.scores[1] >= target) {
            this.finishAndReport(1);
            return;
          }
        }
        this.resetBall(-1);
      } else if (this.ball.position.x < -halfW) {
        if (this.touchedOnce) {
          applyPenaltyIfNeeded(0);
          this.scores[0]++;
          this.lastScorer = 0;
          this.updateScoreUI();
          if (this.scores[0] >= target) {
            this.finishAndReport(0);
            return;
          }
        }
        this.resetBall(1);
      }
    }

    if (this.isHost) this.broadcastState(now);
  }

  private runAI(i: number, width: number, height: number, maxStep: number) {
    if (this.control[i] !== "ai") return;
    const lerpAmt = this.aiLerpPerPaddle[i];
    const err = this.aiError[i];

    const isLR = i < 2;
    const axisPos = isLR
      ? this.paddles[i].position.x
      : this.paddles[i].position.z;
    const ballPos = this.ball.position.clone();
    const ballVel = this.ballVelocity.clone();

    let target = isLR ? ballPos.z : ballPos.x;
    {
      const simulate = ballPos.clone();
      const v = ballVel.clone();
      const limitZ = height / 2 - this.ballRadius - this.wallThickness / 2;
      const horizon = 60;
      for (let k = 0; k < horizon; k++) {
        simulate.addInPlace(v);
        if (this.config.playerCount === 2) {
          if (simulate.z > limitZ || simulate.z < -limitZ) v.z *= -1;
        }
        if (isLR) {
          if (
            (i === 0 && simulate.x < axisPos) ||
            (i === 1 && simulate.x > axisPos)
          ) {
            target = simulate.z;
            break;
          }
        } else {
          if (
            (i === 2 && simulate.z > axisPos) ||
            (i === 3 && simulate.z < axisPos)
          ) {
            target = simulate.x;
            break;
          }
        }
      }
    }
    target += err;

    const p = this.paddles[i];
    const current = isLR ? p.position.z : p.position.x;
    const delta = target - current;
    const accel = delta * lerpAmt;
    this.aiVel[i] = this.aiVel[i] * 0.8 + accel * 0.2;
    let step = this.aiVel[i];
    if (step > maxStep) step = maxStep;
    if (step < -maxStep) step = -maxStep;
    if (isLR) p.position.z += step;
    else p.position.x += step;
  }

  private async finishAndReport(winnerIdx: number) {
    this.matchReady = false;
    const text =
      this.config.playerCount === 4
        ? `Player ${["L", "R", "B", "T"][winnerIdx]} wins!`
        : winnerIdx === 0
        ? (this.config.displayNames?.[0] || "Left") + " wins!"
        : (this.config.displayNames?.[1] || "Right") + " wins!";
    this.endAndToast(text);

    // Post to DB if this is an online match or tournament. Host does the reporting.
    if (this.isHost) {
      const scores = [...this.scores];
      try {
        if (this.config.tournament) {
          const t = this.config.tournament;
          const leftScore = scores[0] || 0,
            rightScore = scores[1] || 0;
          const winnerUserId = winnerIdx === 0 ? t.leftUserId : t.rightUserId;
          await ApiClient.reportTournamentMatch({
            tournamentId: t.tournamentId,
            round: t.round,
            matchIndex: t.matchIndex,
            leftUserId: t.leftUserId,
            rightUserId: t.rightUserId,
            leftScore,
            rightScore,
            winnerUserId,
          });
        } else if (this.config.matchId) {
          const winnerUserId = this.config.currentUser?.id || null;
          await ApiClient.postMatchResult({
            matchId: this.config.matchId,
            winnerUserId,
            scores,
          });
        }
      } catch {}
    }
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
    t.innerHTML = `${text} &nbsp; <button id="re" style="margin-left:8px;">Play again</button>`;
    document.body.appendChild(t);
    (t.querySelector("#re") as HTMLButtonElement).onclick = () =>
      location.reload();
  }
}

/* =========================================================
   HELPERS
   ========================================================= */

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
  if (glow) m.emissiveColor = base.scale(glowStrength * 0.6);
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
  return palette[(Math.random() * palette.length) | 0];
}
function randWhiteTint() {
  // varied “white” caps: warm/cool, slight brightness variation
  const choices = [
    new Color3(1.0, 1.0, 1.0),
    new Color3(0.98, 0.98, 1.0),
    new Color3(1.0, 0.98, 0.98),
    new Color3(0.97, 1.0, 0.97),
    new Color3(0.96, 0.99, 1.0),
  ];
  return choices[(Math.random() * choices.length) | 0];
}
function flashPaddle(p: import("@babylonjs/core").Mesh) {
  const mat = p.material as StandardMaterial;
  const prev = mat.emissiveColor.clone();
  mat.emissiveColor = new Color3(1, 0.3, 0.3);
  setTimeout(() => (mat.emissiveColor = prev), 100);
}

/* =========================================================
   BOOTSTRAP
   ========================================================= */

window.addEventListener("load", async () => {
  clearPongUI();
  const cfg = await Menu.render();
  new Pong3D(cfg);
});
