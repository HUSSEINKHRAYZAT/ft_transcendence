import {
  ArcRotateCamera,
  Color3,
  DirectionalLight,
  Engine,
  HemisphericLight,
  MeshBuilder,
  Scene,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import { Sound } from "@babylonjs/core/Audio/sound";
import "@babylonjs/core/Audio/audioEngine";

import { ApiClient } from "../api";
import { markUI } from "../ui";
import type { GameConfig, ObstacleShape } from "../types";
import type { RemoteMsg } from "./helpers";
import {
  clamp,
  clampHorizontal,
  ensureMinHorizontalSpeed,
  flashPaddle,
  lerp,
  pickWeighted,
  pulseObstacle,
  safeParse,
  shinyMat,
} from "./helpers";
import { SHAPES, SHAPE_WEIGHTS } from "./constants";
import { themeBridge, type GameThemeColors } from "./ThemeBridge";
import { GameChat, type ChatUser } from "../components/GameChat";
import { socketManager } from "../network/SocketManager";
import { GameCountdown } from "./GameCountdown";

export class Pong3D {
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
    shape?: ObstacleShape; // NEW
  }[] = [];
  private builtObstaclesFromNet = false;
  private corners: import("@babylonjs/core").Mesh[] = [];
  private leftWall?: import("@babylonjs/core").Mesh;
  private rightWall?: import("@babylonjs/core").Mesh;
  private leftWallTiles: import("@babylonjs/core").Mesh[] = [];
  private rightWallTiles: import("@babylonjs/core").Mesh[] = [];
  private wallDamagePoints: Array<{x: number, z: number, wall: 'left' | 'right'}> = [];

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
  private isPaused = false;

  // Theme system
  private currentGameTheme: GameThemeColors;
  private themeUnsubscribe?: () => void;

  // Chat system
  private gameChat: GameChat | null = null;
  private lastHitter = -1;
  private touchedOnce = false;
  private obstacleAfterHit = false;

  private ballRadius = 0.2;
  private speedIncrement = 1.0001;
  private minHorizontalSpeed = 0.12;
  private wallThickness = 0.1;
  private cornerSize = this.wallThickness * 5;

  private ws?: WebSocket;
  private usingSocketIO = false; // Track if using Socket.IO vs raw WebSocket
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

  // Optional: fixed obstacle shape (if set in GameConfig); else random per obstacle
  private fixedObstacleShape?: ObstacleShape;

  // --- AUDIO
  private sounds: {
    paddle: Sound[];
    obstacle: Sound[];
    win: Sound[];
    lose: Sound[];
  } = { paddle: [], obstacle: [], win: [], lose: [] };
  private toneCtx?: AudioContext;


  constructor(private config: GameConfig) {
    const canvas =
      (document.getElementById("gameCanvas") as HTMLCanvasElement) ||
      (() => {
        const c = document.createElement("canvas");
        c.id = "gameCanvas";
        c.className = "fixed inset-0 w-full h-full block bg-slate-900";
        document.body.appendChild(c);
        return c;
      })();

    this.engine = new Engine(canvas, true);
    this.scene = new Scene(this.engine);
    // Initialize theme system
    this.currentGameTheme = themeBridge.getCurrentTheme();
    this.scene.clearColor = this.currentGameTheme.background;

    // Listen for theme changes
    this.themeUnsubscribe = themeBridge.onThemeChange((newTheme) => {
      this.updateGameTheme(newTheme);
    });

    this.camera = new ArcRotateCamera(
      "cam",
      this.baseAlpha, // alpha
      Math.PI / 5, // beta
      20, // radius
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    this.camera.inputs.removeByType("ArcRotateCameraPointersInput");
    this.camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // Audio init & unlock (user gesture)
    this.initAudio();
    const unlock = () => this.unlockAudio();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    // Optional: fixed shape from GameConfig
    this.fixedObstacleShape = this.config.obstacleShape;

    // Input — track arrows + W/S (and Shift if you still use it elsewhere)
    const onKey = (v: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      
      // Handle pause toggle (only on keydown)
      if (k === "p" && v) {
        this.togglePause();
        e.preventDefault();
        return;
      }
      
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
    this.initializeChat();
    this.init();
    if (this.isHost || this.isGuest) this.initRemote();
  }

  /* ---------------- UI ---------------- */

  private createScoreUI() {
    const hud = markUI(document.createElement("div"));
    hud.className =
      "absolute top-20 left-1/2 -translate-x-1/2 text-white font-bold z-10 flex gap-4 items-center px-6 py-4 rounded-3xl bg-gradient-to-br from-gray-800/95 to-gray-900/95 border border-lime-500/30 shadow-2xl backdrop-blur-xl";
    hud.style.fontFamily = "'Orbitron', system-ui, sans-serif";
    hud.style.boxShadow =
      "0 25px 50px rgba(0,0,0,0.4), 0 0 0 1px rgba(132, 204, 22, 0.1), inset 0 1px 0 rgba(255,255,255,0.1)";

    const slots = this.config.playerCount === 4 ? 4 : 2;
    const colors = ["lime-500", "blue-500", "purple-500", "red-500"];
    const hexColors = ["#84cc16", "#3b82f6", "#a855f7", "#ef4444"];

    for (let i = 0; i < slots; i++) {
      const badge = document.createElement("div");
      badge.className = `flex items-center gap-2 px-4 py-2.5 rounded-xl border transition-all duration-300 min-w-20 justify-center bg-gradient-to-br from-${colors[i]}/10 to-${colors[i]}/5 border-${colors[i]}/25`;
      badge.style.boxShadow = `0 4px 12px ${hexColors[i]}20, inset 0 1px 0 rgba(255,255,255,0.1)`;

      const dot = document.createElement("span");
      dot.className = `w-3 h-3 rounded-full inline-block flex-shrink-0 bg-gradient-to-br from-${colors[i]} to-${colors[i]}/80`;
      dot.style.boxShadow = `0 0 12px ${hexColors[i]}60, inset 0 1px 0 rgba(255,255,255,0.3)`;

      const playerInfo = document.createElement("div");
      playerInfo.className = "flex flex-col items-center gap-0.5";

      const label = document.createElement("span");
      label.className = `text-xs font-semibold text-${colors[i]} tracking-wider uppercase`;
      label.textContent = ["Player 1", "Player 2", "Player 3", "Player 4"][i];

      const name = document.createElement("span");
      name.className = "text-xs opacity-70 text-zinc-400";
      name.textContent =
        (this.config.displayNames && this.config.displayNames[i]) || "";

      const score = document.createElement("span");
      score.className = `font-black text-2xl min-w-8 text-center text-${colors[i]} leading-none`;
      score.style.textShadow = `0 2px 8px ${hexColors[i]}40`;
      score.textContent = "0";

      // Assemble the player info
      if (name.textContent) {
        playerInfo.append(label, name);
      } else {
        playerInfo.append(label);
      }

      badge.append(dot, playerInfo, score);
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
    d.className =
      "fixed inset-0 grid place-items-center bg-black/65 text-white z-[9999] font-sans";
    d.innerHTML = `<div class="px-5 py-4 bg-gray-900 rounded-xl shadow-2xl border border-lime-500/20">
      <div id="waitText" class="text-lg text-center">${text}</div>
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

  private updateGameTheme(newTheme: GameThemeColors) {
    console.log("🎮 Updating game colors for new theme");

    this.currentGameTheme = newTheme;

    // Update scene background
    this.scene.clearColor = newTheme.background;

    // Update ball color
    if (this.ball && this.ball.material) {
      const ballMat = this.ball.material as StandardMaterial;
      if (ballMat.emissiveColor) {
        ballMat.emissiveColor = newTheme.ball.scale(0.3);
      }
    }

    // Update paddle colors
    this.paddles.forEach((paddle, index) => {
      if (paddle.material) {
        const paddleMat = paddle.material as StandardMaterial;
        const newColor = themeBridge.getPaddleColor(index);

        // Update the material colors
        if (paddleMat.diffuseColor) {
          paddleMat.diffuseColor = newColor;
        }
        if (paddleMat.emissiveColor) {
          paddleMat.emissiveColor = newColor.scale(0.6);
        }
      }
    });

    // Update obstacle colors
    this.obstacles.forEach((obstacle, index) => {
      if (obstacle.material) {
        const obstacleMat = obstacle.material as StandardMaterial;
        const newColor = themeBridge.getObstacleColor(index);

        if (obstacleMat.diffuseColor) {
          obstacleMat.diffuseColor = newColor;
        }
        if (obstacleMat.emissiveColor) {
          obstacleMat.emissiveColor = newColor.scale(0.3);
        }
      }
    });

    console.log("✅ Game colors updated successfully");
  }

  private initializeChat() {
    // Skip chat for AI mode (single player vs AI)
    if (this.config.connection === "ai") {
      console.log("💬 Chat disabled for AI mode");
      return;
    }

    // Get current user info from localStorage (set by frontend auth)
    let currentUser: ChatUser = {
      id: "player-" + Date.now(),
      name: "Player",
      isConnected: true,
    };

    try {
      const userData = localStorage.getItem("ft_pong_user_data");
      if (userData) {
        const user = JSON.parse(userData);
        currentUser = {
          id: user.id || currentUser.id,
          name: user.firstName
            ? `${user.firstName} ${user.lastName || ""}`.trim()
            : user.userName || user.email || "Player",
          isConnected: true,
        };
      }
    } catch (error) {
      console.warn("Could not load user data for chat:", error);
    }

    // Get game container for chat
    const gameContainer =
      document.querySelector("#gameContainer") || document.body;

    // Initialize chat with WebSocket if available
    this.gameChat = new GameChat(
      gameContainer as HTMLElement,
      currentUser,
      this.ws || undefined
    );

    // Show welcome message
    this.gameChat.addSystemMessage(
      `Welcome to the game, ${currentUser.name}! 🎮`
    );

    // Add game-specific system messages
    if (this.config.playerCount > 1) {
      this.gameChat.addSystemMessage(
        "Chat with other players during the game!"
      );
    }

    console.log("💬 Game chat initialized for user:", currentUser.name);
  }

  private getPlayerName(playerIndex: number): string {
    if (this.config.displayNames && this.config.displayNames[playerIndex]) {
      return this.config.displayNames[playerIndex];
    }
    return `Player ${playerIndex + 1}`;
  }

  // Cleanup method for theme and chat subscription
  public dispose() {
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = undefined;
    }

    // Cleanup chat
    if (this.gameChat) {
      this.gameChat.destroy();
      this.gameChat = null;
    }

    // Cleanup pause overlay
    this.hidePauseOverlay();

    // Dispose engine and scene
    if (this.engine) {
      this.engine.dispose();
    }
  }

  private async startGameWithCountdown() {
    // Show countdown before starting the game
    const countdown = new GameCountdown({
      onComplete: () => {
        this.matchReady = true;
        this.resetBall(Math.random() < 0.5 ? 1 : -1);
      }
    });
    
    await countdown.start();
  }

  private async beginMatch() {
    this.hideWaitingOverlay();
    
    // For multiplayer games, show countdown and then start
    const countdown = new GameCountdown({
      onComplete: () => {
        this.matchReady = true;
        this.resetBall(Math.random() < 0.5 ? 1 : -1);
        if (this.isHost) {
          this.sendRemoteMessage({ t: "start" } as RemoteMsg);
        }
      }
    });
    
    await countdown.start();
  }

  /* ---------------- Scene ---------------- */

  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights
    new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 0.9;

    // Field (picture floor)
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseTexture = new Texture("/textures/floor2.jpg", this.scene);
    const texF = fieldMat.diffuseTexture as Texture;
    texF.wrapU = Texture.WRAP_ADDRESSMODE;
    texF.wrapV = Texture.WRAP_ADDRESSMODE;
    texF.uScale = 1;
    texF.vScale = 1;
    fieldMat.diffuseColor = new Color3(1, 1, 1);
    fieldMat.specularColor = new Color3(0, 0, 0);
    texF.anisotropicFilteringLevel = 8;

    const field = MeshBuilder.CreateGround(
      "field",
      { width, height },
      this.scene
    );
    field.material = fieldMat;

    function wallTextureMat(scene: Scene, url: string, tilesU = 4, tilesV = 1) {
      const mat = new StandardMaterial("wallMat", scene);
      const tex = new Texture(url, scene);
      tex.wrapU = Texture.WRAP_ADDRESSMODE;
      tex.wrapV = Texture.WRAP_ADDRESSMODE;
      tex.uScale = tilesU; // how many times the image repeats horizontally
      tex.vScale = tilesV; // vertically
      tex.anisotropicFilteringLevel = 8;
      mat.diffuseTexture = tex;
      // optional: make walls matte so the picture isn’t shiny
      mat.specularColor = new Color3(0, 0, 0);
      return mat;
    }

    // Walls (pictures)
    const t = this.wallThickness,
      h = 1;

    const wall = (
      w: number,
      d: number,
      x: number,
      z: number,
      id: string,
      mat: StandardMaterial
    ) => {
      const m = MeshBuilder.CreateBox(
        id,
        { width: w, height: h, depth: d },
        this.scene
      );
      m.position.set(x, h / 2, z);
      m.material = mat;
      return m;
    };

    const wallUrl = "/textures/brick.jpeg";
    const topMat = wallTextureMat(this.scene, wallUrl, 12, 1);
    const bottomMat = wallTextureMat(this.scene, wallUrl, 12, 1);
    const leftMat = wallTextureMat(this.scene, wallUrl, 1, 50);
    const rightMat = wallTextureMat(this.scene, wallUrl, 1, 50);
    (leftMat.diffuseTexture as Texture).wAng = Math.PI / 2;
    (rightMat.diffuseTexture as Texture).wAng = Math.PI / 2;

    wall(width + t, t, 0, height / 2 + t / 2, "wallTop", topMat);
    wall(width + t, t, 0, -height / 2 - t / 2, "wallBottom", bottomMat);
    this.leftWall = wall(t, height + t, -width / 2 - t / 2, 0, "wallLeft", leftMat);
    this.rightWall = wall(t, height + t, width / 2 + t / 2, 0, "wallRight", rightMat);
    
    // Also create tiled walls for damage system
    this.createTiledWalls(width, height, t, leftMat, rightMat);

    // Corners as picture boxes with custom texture
    function cornerTextureMat(scene: Scene, textureUrl: string, rotationAngle: number = 0) {
      const mat = new StandardMaterial("cornerTextureMat", scene);
      const tex = new Texture(textureUrl, scene);
      
      // Rotate texture to always face upward
      tex.wAng = rotationAngle;
      
      mat.diffuseTexture = tex;
      // Optionally add some glow effect
      mat.emissiveColor = new Color3(0.1, 0.1, 0.1); // Slight glow
      mat.specularColor = new Color3(0, 0, 0); // No shiny highlights
      return mat;
    }

    this.cornerSize = t * 5;
    const cS = this.cornerSize; // Use same size for all dimensions to make perfect squares
    const cx = width / 2 - t / 2 - cS / 2;
    const cz = height / 2 - t / 2 - cS / 2;

    const makeCornerBox = (x: number, z: number, id: string, textureRotation: number = 0) => {
      const box = MeshBuilder.CreateBox(
        id,
        { width: cS, height: cS, depth: cS }, // All dimensions equal = perfect cube
        this.scene
      );
      box.position.set(x, cS / 2, z); // Adjust Y position since height changed
      
      // Create material with proper texture rotation for this corner
      const cornerMat = cornerTextureMat(this.scene, '/textures/42.png', textureRotation);
      box.material = cornerMat;
      
      this.corners.push(box);
    };

    // Create corner boxes with appropriate texture rotations to keep images upward
    makeCornerBox(+cx, +cz, "cornerTR", 0);           // Top-Right: no rotation
    makeCornerBox(+cx, -cz, "cornerBR", 0);           // Bottom-Right: no rotation  
    makeCornerBox(-cx, +cz, "cornerTL", 0);           // Top-Left: no rotation
    makeCornerBox(-cx, -cz, "cornerBL", 0);           // Bottom-Left: no rotation

    // Ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseTexture = new Texture("/textures/ball.jpg", this.scene);
    ballMat.emissiveColor = this.currentGameTheme.ball.scale(0.3); // Add glow with theme color
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
      newPaddle(-dAxis, 0, 0, 0, this.currentGameTheme.paddle1);
      newPaddle(+dAxis, 0, 0, 1, this.currentGameTheme.paddle2);
      newPaddle(0, +dAxis, Math.PI / 2, 2, this.currentGameTheme.paddle3);
      newPaddle(0, -dAxis, Math.PI / 2, 3, this.currentGameTheme.paddle4);
    } else {
      newPaddle(-dAxis, 0, 0, 0, this.currentGameTheme.paddle1);
      newPaddle(+dAxis, 0, 0, 1, this.currentGameTheme.paddle2);
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
        // Local 2P
        this.control = ["human", "human"];
        this.camera.alpha = this.baseAlpha;
      }
    }

    // Obstacles: host/local spawns; guests build from net
    if (!this.isGuest) this.spawnObstacles(width, height);

    if (this.matchReady) {
      // For local games, show countdown before starting
      this.startGameWithCountdown();
    } else {
      this.ball.position.set(0, 0.3, 0);
      this.ballVelocity.set(0, 0, 0);
    }

    this.engine.runRenderLoop(() => {
      // Only update game logic if not paused, but always render the scene
      if (!this.isPaused) {
        this.update(width, height);
      }
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
    const count = 3; // ≤3 obstacles
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
      const bodyCol = themeBridge.getObstacleColor(i);
      const capCol = bodyCol; // kept for net schema compatibility (not used by spheres)
      const bodyArr: [number, number, number] = [
        bodyCol.r,
        bodyCol.g,
        bodyCol.b,
      ];
      const capArr: [number, number, number] = [
        bodyCol.r,
        bodyCol.g,
        bodyCol.b,
      ];

      // Choose shape: fixed via config OR random per obstacle
      const shape: ObstacleShape = this.fixedObstacleShape
        ? this.fixedObstacleShape
        : pickWeighted(SHAPES, SHAPE_WEIGHTS);

      this.obstacleInfo.push({
        x,
        z,
        radius,
        color: bodyArr,
        cap: capArr,
        shape,
      });
      this.buildObstacleMesh(x, z, radius, bodyCol, capCol, shape);
    }
  }

  // Build obstacle in a specific shape; keep 2D circular collision via metadata.radius
  private buildObstacleMesh(
    x: number,
    z: number,
    radius: number,
    bodyCol: Color3,
    _capCol: Color3, // not used for spheres
    shape?: ObstacleShape
  ) {
    const sh = shape || this.fixedObstacleShape || "sphere";
    let m: import("@babylonjs/core").Mesh;
    let hitRadius = radius;

    if (sh === "sphere") {
      m = MeshBuilder.CreateSphere(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { diameter: radius * 2, segments: 20 },
        this.scene
      );
      m.position.set(x, radius, z); // sit on ground
    } else if (sh === "cylinder") {
      const height = Math.max(0.8, radius * 1.6);
      m = MeshBuilder.CreateCylinder(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { diameter: radius * 2, height, tessellation: 24 },
        this.scene
      );
      m.position.set(x, height / 2, z);
      hitRadius = radius;
    } else if (sh === "cone") {
      const height = Math.max(1.0, radius * 2.2);
      m = MeshBuilder.CreateCylinder(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { diameter: radius * 2, diameterTop: 0, height, tessellation: 24 },
        this.scene
      );
      m.position.set(x, height / 2, z);
      hitRadius = radius;
    } else if (sh === "capsule") {
      const height = Math.max(radius * 2.8, 1.2);
      m = MeshBuilder.CreateCapsule(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { radius, height, tessellation: 12, capSubdivisions: 6 },
        this.scene
      );
      m.position.set(x, height / 2, z);
      hitRadius = radius;
    } else if (sh === "disc") {
      const height = Math.max(0.1, radius * 0.18);
      m = MeshBuilder.CreateCylinder(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { diameter: radius * 2, height, tessellation: 36 },
        this.scene
      );
      m.position.set(x, height / 2, z);
      hitRadius = radius;
    } else {
      // box
      const width = radius * 2.2;
      const depth = radius * 2.2;
      const height = Math.max(0.8, radius * 1.2);
      m = MeshBuilder.CreateBox(
        `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
        { width, depth, height },
        this.scene
      );
      m.position.set(x, height / 2, z);
      hitRadius = Math.hypot(width / 2, depth / 2); // circular approx for collision
    }

    m.material = shinyMat(this.scene, bodyCol, 0.7, true);
    (m as any).metadata = {
      radius: hitRadius,
      baseScale: m.scaling.clone(),
      pulseTimeout: 0 as any,
      shape: sh,
    };
    this.obstacles.push(m);
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
    ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);
  }

  /* ---------------- Remote ---------------- */

  private sendRemoteMessage(msg: RemoteMsg) {
    if (this.usingSocketIO) {
      switch (msg.t) {
        case "state":
          socketManager.sendGameState(msg);
          break;
        case "input":
          socketManager.sendPlayerInput({
            idx: msg.idx,
            neg: msg.neg,
            pos: msg.pos,
            sid: msg.sid,
          });
          break;
        case "chat_message":
          socketManager.sendChatMessage(msg.message.message);
          break;
        case "start":
          socketManager.startGame();
          break;
        default:
          console.log("Unhandled Socket.IO message type:", msg.t);
      }
    } else if (this.ws) {
      try {
        this.ws.send(JSON.stringify(msg));
      } catch (error) {
        console.error("Failed to send WebSocket message:", error);
      }
    }
  }

  private initSocketIO() {
    if (!socketManager.connected) {
      console.error("Socket.IO not connected");
      return;
    }

    console.log("Initializing Socket.IO for game...", {
      isHost: this.isHost,
      isGuest: this.isGuest,
      roomId: socketManager.roomId,
      playerId: socketManager.id,
    });

    // Set up Socket.IO event listeners
    socketManager.on("game_state", (state) => {
      if (this.isGuest) {
        this.handleRemoteState(state);
      }
    });

    socketManager.on("player_input", (data) => {
      if (this.isHost && data.playerId !== socketManager.id) {
        // Convert Socket.IO input format to our internal format
        this.guestInputs[data.input.idx] = {
          neg: data.input.neg,
          pos: data.input.pos,
        };
      }
    });

    socketManager.on("chat_message", (message) => {
      if (this.gameChat) {
        this.gameChat.addMessage(message);
      }
    });

    socketManager.on("player_joined", (player) => {
      console.log("Player joined:", player);
      if (this.isHost) {
        this.connectedGuests = Math.min(
          this.requiredGuests,
          this.connectedGuests + 1
        );
        // Update display names
        if (this.config.displayNames && this.config.displayNames.length > 1) {
          this.config.displayNames[1] = player.name || "Player 2";
        }
        this.updateScoreUI();
        this.updateWaitingUI();
      }
    });

    socketManager.on("player_left", (playerId) => {
      console.log("Player left:", playerId);
      if (this.isHost) {
        this.connectedGuests = Math.max(0, this.connectedGuests - 1);
        // Reset display names
        if (this.config.displayNames && this.config.displayNames.length > 1) {
          this.config.displayNames[1] = "Waiting…";
        }
        this.updateScoreUI();
        this.updateWaitingUI();
      }
    });

    socketManager.on("room_state", (state) => {
      console.log("Room state received:", state);
      if (this.isHost) {
        // Update connected guests count based on actual room state
        this.connectedGuests = state.playerCount - 1; // Subtract 1 for the host
        console.log("Host: Updated connected guests to", this.connectedGuests);
        this.updateWaitingUI();
      }
    });

    socketManager.on("game_started", () => {
      console.log("Game started signal received");
      if (this.isGuest && !this.matchReady) {
        this.matchReady = true;
        this.hideWaitingOverlay();
      }
    });

    // For Socket.IO, we know both players are already connected when game starts
    // So we can immediately set the correct connection count
    if (this.isHost) {
      // Since we're starting the game, we know the guest is connected
      this.connectedGuests = this.requiredGuests;
      console.log("Host: Setting connected guests to", this.connectedGuests);
      this.checkMatchReady();
    } else if (this.isGuest) {
      // Guest should wait for game_started signal
      console.log("Guest: Waiting for game start signal");
    }
  }

  private async checkMatchReady() {
    // Check if we have enough players to start the match
    if (this.connectedGuests >= this.requiredGuests) {
      await this.beginMatch();
    } else {
      this.showWaitingOverlay(`Waiting for players… ${this.connectedGuests}/${this.requiredGuests}`);
    }
  }

  private updateWaitingUI() {
    // Update the waiting overlay if it exists
    if (this.waitUI) {
      const statusText = this.waitUI.querySelector(".status-text");
      if (statusText) {
        statusText.textContent = `Waiting for players… (${this.connectedGuests}/${this.requiredGuests})`;
      }
    }

    // Check if we can start the match
    this.checkMatchReady();
  }

  private handleRemoteState(stateMsg: any) {
    // Handle state updates from Socket.IO or WebSocket
    this.ball.position.set(stateMsg.ball.x, stateMsg.ball.y, stateMsg.ball.z);
    this.ballVelocity.set(stateMsg.ball.vx, stateMsg.ball.vy, stateMsg.ball.vz);

    if (!this.builtObstaclesFromNet && stateMsg.obstacles?.length) {
      this.obstacles.forEach((m) => m.dispose());
      this.obstacles = [];
      this.obstacleInfo = [];
      for (const o of stateMsg.obstacles) {
        const body = new Color3(o.color[0], o.color[1], o.color[2]);
        const cap = new Color3(o.cap[0], o.cap[1], o.cap[2]);
        this.obstacleInfo.push(o);
        this.buildObstacleMesh(o.x, o.z, o.radius, body, cap, o.shape);
      }
      this.builtObstaclesFromNet = true;
    }

    stateMsg.paddles.forEach((pp: any, i: number) =>
      this.paddles[i]?.position.set(pp.x, pp.y, pp.z)
    );

    for (let i = 0; i < this.scores.length && i < stateMsg.scores.length; i++)
      this.scores[i] = stateMsg.scores[i];
    this.updateScoreUI();

    if (!this.matchReady) {
      this.matchReady = true;
      this.hideWaitingOverlay();
    }
  }

  private initRemote() {
    // Check if we should use Socket.IO instead of raw WebSocket
    if (this.config.roomId && !this.config.wsUrl) {
      this.usingSocketIO = true;
      this.initSocketIO();
      return;
    }

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
          if (this.connectedGuests >= this.requiredGuests && !this.matchReady) {
            this.beginMatch(); // Fire and forget for WebSocket flow
          }
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
          this.handleRemoteState(msg);
          return;
        }

        // Handle chat messages
        if (msg.t === "chat_message") {
          if (this.gameChat) {
            this.gameChat.addMessage(msg.message);
          }
          return;
        }

        if (msg.t === "user_joined") {
          if (this.gameChat) {
            this.gameChat.addMessage({
              id: Date.now().toString(),
              playerId: "system",
              playerName: "System",
              message: `${msg.user.name} joined the game`,
              timestamp: Date.now(),
              type: "join",
            });
          }
          return;
        }

        if (msg.t === "user_left") {
          if (this.gameChat) {
            this.gameChat.addMessage({
              id: Date.now().toString(),
              playerId: "system",
              playerName: "System",
              message: `Player left the game`,
              timestamp: Date.now(),
              type: "leave",
            });
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
          this.sendRemoteMessage(pkt);
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
      obstacles: this.obstacleInfo.map((o) => ({ ...o })), // includes shape
    };
    this.sendRemoteMessage(msg);
  }

  /* ---------------- Tick ---------------- */

  private update(width: number, height: number) {
    const now = performance.now();
    if (!this.matchReady) {
      if (this.isHost) this.broadcastState(now);
      return;
    }

    const move = 0.2;
    const [p1, p2, p3] = this.paddles;

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
        // Left paddle (p1) = Arrow Up/Down
        if (this.keys["arrowup"]) p1.position.z -= move;
        if (this.keys["arrowdown"]) p1.position.z += move;

        // Right paddle (p2) = W/S
        if (this.keys["w"]) p2.position.z -= move;
        if (this.keys["s"]) p2.position.z += move;
      }
    }

    // Clamp paddles and keep out of corners
    const padD2 = 1.0;
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

    ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);

    // Ground
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }

    // Corners
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

    // Z bounces for 2P only
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
        ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);
        this.lastHitter = idx;
        this.touchedOnce = true;
        this.obstacleAfterHit = false;
        flashPaddle(p);
        this.playHit("paddle"); // SOUND
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
        clampHorizontal(this.ballVelocity, 0.6);
        ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);
        const sign = idx === 2 ? -1 : +1;
        this.ball.position.z = p.position.z + sign * zThr;
        const dxNorm = clamp01(dx / 1.0);
        this.ballVelocity.x += dxNorm * 0.18;
        clampHorizontal(this.ballVelocity, 0.6);
        ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);
        this.lastHitter = idx;
        this.touchedOnce = true;
        this.obstacleAfterHit = false;
        flashPaddle(p);
        this.playHit("paddle"); // SOUND
      }
    }

    // Obstacles (spheres/others) — 2D XZ collision, pulse on hit
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
        ensureMinHorizontalSpeed(this.ballVelocity, this.minHorizontalSpeed);
        if (this.lastHitter >= 0 && this.touchedOnce)
          this.obstacleAfterHit = true;

        // Splash/flash like paddles
        flashPaddle(o);

        // Visual pulse for 1 ms, then snap back (no gameplay radius change)
        pulseObstacle(o, 1.35, 1);

        this.playHit("obstacle"); // SOUND
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

          // Add chat notification for scoring
          if (this.gameChat) {
            const playerName = this.getPlayerName(this.lastHitter);
            this.gameChat.addSystemMessage(
              `🎯 ${playerName} scores! Current score: ${
                this.scores[this.lastHitter]
              }`
            );
          }

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
          // Add damage to right wall where ball hit
          this.addWallDamage('right', this.ball.position.x, this.ball.position.z);
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
          // Add damage to left wall where ball hit
          this.addWallDamage('left', this.ball.position.x, this.ball.position.z);
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

  private addWallDamage(wall: 'left' | 'right', hitX: number, hitZ: number) {
    // Only add damage in 2P mode
    if (this.config.playerCount !== 2) return;

    const wallMesh = wall === 'left' ? this.leftWall : this.rightWall;
    if (!wallMesh) return;

    // Store damage point
    this.wallDamagePoints.push({
      x: hitX,
      z: hitZ,
      wall: wall
    });

    // Create damage texture effect
    this.applyDamageToWall(wallMesh, hitX, hitZ);
  }

  private createTiledWalls(width: number, height: number, thickness: number, leftMat: StandardMaterial, rightMat: StandardMaterial) {
    // Configuration for wall tiles
    const tilesPerWall = 10; // Number of tiles per wall (vertically)
    const tileHeight = height / tilesPerWall;
    
    // Clear existing tile arrays
    this.leftWallTiles = [];
    this.rightWallTiles = [];
    
    // Create left wall tiles
    for (let i = 0; i < tilesPerWall; i++) {
      const tileZ = -height/2 + (i + 0.5) * tileHeight; // Center position of each tile
      
      const leftTile = MeshBuilder.CreateBox(
        `leftWallTile_${i}`,
        { width: thickness, height: tileHeight, depth: thickness },
        this.scene
      );
      leftTile.position.set(-width / 2 - thickness / 2, 1 / 2, tileZ);
      leftTile.material = leftMat.clone(`leftTileMat_${i}`);
      
      this.leftWallTiles.push(leftTile);
    }
    
    // Create right wall tiles  
    for (let i = 0; i < tilesPerWall; i++) {
      const tileZ = -height/2 + (i + 0.5) * tileHeight; // Center position of each tile
      
      const rightTile = MeshBuilder.CreateBox(
        `rightWallTile_${i}`,
        { width: thickness, height: tileHeight, depth: thickness },
        this.scene
      );
      rightTile.position.set(width / 2 + thickness / 2, 1 / 2, tileZ);
      rightTile.material = rightMat.clone(`rightTileMat_${i}`);
      
      this.rightWallTiles.push(rightTile);
    }
    
    // Note: Main wall references (this.leftWall, this.rightWall) are kept from original wall creation
    // Tiles are used only for damage system
    
    console.log(`🧱 Created ${tilesPerWall} tiles per wall (${tilesPerWall * 2} total wall tiles)`);
  }

  private applyDamageToWall(wallMesh: import("@babylonjs/core").Mesh, _hitX: number, hitZ: number) {
    // This method now needs to find which specific tile was hit and damage only that tile
    
    // Determine which wall was hit (left or right)
    const isLeftWall = wallMesh === this.leftWall || this.leftWallTiles.includes(wallMesh);
    const isRightWall = wallMesh === this.rightWall || this.rightWallTiles.includes(wallMesh);
    
    if (!isLeftWall && !isRightWall) {
      console.log('❌ Wall mesh not recognized');
      return;
    }
    
    // Get the appropriate tile array
    const wallTiles = isLeftWall ? this.leftWallTiles : this.rightWallTiles;
    const wallName = isLeftWall ? 'left' : 'right';
    
    // Find which tile the ball hit based on hitZ position
    const tileHeight = 10 / wallTiles.length; // 10 is the total height from createTiledWalls
    const hitTileIndex = Math.floor((hitZ + 5) / tileHeight); // +5 to offset from center, 5 = height/2
    const clampedIndex = Math.max(0, Math.min(hitTileIndex, wallTiles.length - 1));
    
    const targetTile = wallTiles[clampedIndex];
    
    if (!targetTile) {
      console.log('❌ Could not find target tile');
      return;
    }
    
    // Check if this specific tile is already damaged
    if ((targetTile as any)._isDamaged) {
      console.log(`⚠️ Tile ${clampedIndex} on ${wallName} wall already damaged`);
      return;
    }
    
    // Mark this specific tile as damaged
    (targetTile as any)._isDamaged = true;
    
    // Create a new damaged material using the b2 damage texture for this tile only
    const material = targetTile.material as StandardMaterial;
    const damagedMaterial = material.clone(`damagedTile_${wallName}_${clampedIndex}_${Date.now()}`);
    
    // Load the damage wall texture (b2.png)
    const damageTexture = new Texture('/textures/b2.png', this.scene);
    
    // Apply the damage texture to only this specific tile
    damagedMaterial.diffuseTexture = damageTexture;
    targetTile.material = damagedMaterial;
    
    console.log(`🔥 Tile ${clampedIndex} on ${wallName} wall damaged with b2 texture at position:`, { hitZ, tileHeight });
  }

  private togglePause() {
    this.isPaused = !this.isPaused;
    
    if (this.isPaused) {
      // Show pause overlay
      this.showPauseOverlay();
      console.log("⏸️ Game paused");
    } else {
      // Hide pause overlay
      this.hidePauseOverlay();
      console.log("▶️ Game resumed");
    }
  }

  private showPauseOverlay() {
    // Remove existing pause overlay if any
    this.hidePauseOverlay();
    
    const overlay = document.createElement('div');
    overlay.id = 'pause-overlay';
    overlay.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50';
    overlay.innerHTML = `
      <div class="bg-gray-800 rounded-lg p-8 text-center border-2 border-lime-500">
        <div class="text-6xl mb-4">⏸️</div>
        <div class="text-2xl font-bold text-lime-500 mb-2">PAUSED</div>
        <div class="text-gray-300">Press P to resume</div>
      </div>
    `;
    
    document.body.appendChild(overlay);
  }

  private hidePauseOverlay() {
    const overlay = document.getElementById('pause-overlay');
    if (overlay) {
      overlay.remove();
    }
  }

  private runAI(i: number, _width: number, height: number, maxStep: number) {
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

    // Add chat notification for game end
    if (this.gameChat) {
      const winnerName = this.getPlayerName(winnerIdx);
      this.gameChat.addSystemMessage(
        `🏆 Game Over! ${winnerName} wins the match!`
      );
      this.gameChat.addSystemMessage(
        `Final Score: ${this.scores
          .slice(0, this.config.playerCount === 4 ? 4 : 2)
          .join(" - ")}`
      );
    }

    // Play correct win/lose cue from local perspective
    this.handleGameEndAudio(winnerIdx);

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
    t.className =
      "fixed top-5 left-1/2 -translate-x-1/2 bg-black/70 text-white px-4 py-3 rounded-xl z-[10001] font-sans shadow-2xl border border-lime-500/20";
    t.innerHTML = `${text} &nbsp; <button id="re" class="ml-2 bg-lime-500 hover:bg-lime-600 text-black px-3 py-1 rounded-lg font-semibold transition-colors">Play again</button>`;
    document.body.appendChild(t);
    (t.querySelector("#re") as HTMLButtonElement).onclick = () =>
      location.reload();
  }

  /* ---------------- AUDIO ---------------- */

  private initAudio() {
    const load = (name: string, url: string, vol = 0.6) =>
      new Sound(name, url, this.scene, undefined, {
        autoplay: false,
        loop: false,
        volume: vol,
      });

    // Pools for slight variety
    this.sounds.paddle = [
      load("paddle1", "/sounds/paddle1.mp3", 0.7),
      load("paddle2", "/sounds/paddle2.mp3", 0.7),
    ];
    this.sounds.obstacle = [
      load("obst1", "/sounds/obstacle1.mp3", 0.65),
      load("obst2", "/sounds/obstacle2.mp3", 0.65),
    ];
    this.sounds.win = [load("win", "/sounds/win.mp3", 0.8)];
    this.sounds.lose = [load("lose", "/sounds/lose.mp3", 0.8)];
  }

  private unlockAudio() {
    try {
      (Engine as any).audioEngine?.unlock?.();
    } catch {}
    try {
      if (!this.toneCtx) {
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (Ctx) this.toneCtx = new Ctx();
      }
      this.toneCtx?.resume?.();
    } catch {}
  }

  private playFrom(arr: Sound[], fallbackHz = 440, durMs = 80) {
    const s = arr[(Math.random() * arr.length) | 0];
    const ready =
      s &&
      (((s as any).isReadyToPlay === true && !(s as any).isPlaying) ||
        (s as any).isReady?.());
    if (ready) {
      const rate = 0.95 + Math.random() * 0.1; // subtle pitch variance
      (s as any).setPlaybackRate?.(rate);
      s.play();
      return;
    }
    this.beepFallback(fallbackHz, durMs, 0.05);
  }

  private playHit(kind: "paddle" | "obstacle") {
    if (kind === "paddle") this.playFrom(this.sounds.paddle, 700, 70);
    else this.playFrom(this.sounds.obstacle, 520, 85);
  }

  private playWin() {
    const s = this.sounds.win[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    if (ready) {
      (s as any).setPlaybackRate?.(1);
      s.play();
    } else {
      // little triumphant beep fallback
      this.beepFallback(600, 120, 0.06);
      setTimeout(() => this.beepFallback(900, 160, 0.06), 130);
    }
  }

  private playLose() {
    const s = this.sounds.lose[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    if (ready) {
      (s as any).setPlaybackRate?.(1);
      s.play();
    } else {
      // descending tones fallback
      this.beepFallback(700, 90, 0.06);
      setTimeout(() => this.beepFallback(420, 150, 0.06), 100);
    }
  }

  private beepFallback(freq = 440, durMs = 80, vol = 0.05) {
    try {
      if (!this.toneCtx) {
        const Ctx =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        this.toneCtx = new Ctx();
      }
      const ctx = this.toneCtx!;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = freq;
      gain.gain.value = vol;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, durMs);
    } catch {}
  }

  private getLocalControlledIndices(): number[] {
    // Figure out which paddles are controlled from this browser
    if (this.config.connection === "ai") return [0];
    if (this.config.connection === "local") return [0, 1];
    if (this.config.connection === "remoteHost") return [0];
    if (this.config.connection === "remoteGuest")
      return [this.remoteIndex || 1];
    if (this.config.connection === "remote4Host") return [0];
    if (this.config.connection === "remote4Guest") return [this.remoteIndex];
    if (this.config.connection === "ai3") return [0];
    return [0];
  }

  private handleGameEndAudio(winnerIdx: number) {
    const locals = this.getLocalControlledIndices();
    const isLocalWinner = locals.includes(winnerIdx);

    // If both players are on the same machine (local 2P), play both cues
    if (this.config.connection === "local" && locals.length >= 2) {
      this.playWin();
      this.playLose();
      return;
    }

    // Otherwise choose based on perspective
    if (isLocalWinner) this.playWin();
    else this.playLose();
  }
}
