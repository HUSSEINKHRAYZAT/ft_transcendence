import {
  ArcRotateCamera,
  Color3,
  Color4,
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

import { ApiClient } from "../../api";
import type { GameConfig, ObstacleShape } from "../../types";
import type { RemoteMsg } from "../utils/helpers";
import { GameState } from "./GameState";
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
} from "../utils/helpers";
import { showConfirmDialog } from "../../components/modals/ConfirmDialog";
import { SHAPES, SHAPE_WEIGHTS } from "../config/constants";
import { themeBridge, type GameThemeColors } from "../utils/ThemeBridge";
import { socketManager } from "../../services/SocketManager";
import { GameCountdown } from "../ui/GameCountdown";
import { CameraConfig } from "../config/camconfig";
import * as Frontend from "./Pong3D.frontend";
import { GameBackgroundEffects } from "../effects/GameBackgroundEffects";

type TournamentResultSummary = {
  tournamentId: string;
  matchId: string;
  winnerIdx: number;
  scores: number[];
  players?: Array<{ id?: string; name?: string; side?: string }>;
  isWinner: boolean;
};






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
    shape?: ObstacleShape;
    textureIndex?: number;
  }[] = [];
  private builtObstaclesFromNet = false;
  private corners: import("@babylonjs/core").Mesh[] = [];
  private leftWall?: import("@babylonjs/core").Mesh;
  private rightWall?: import("@babylonjs/core").Mesh;
  private leftWallTiles: import("@babylonjs/core").Mesh[] = [];
  private rightWallTiles: import("@babylonjs/core").Mesh[] = [];
  private wallDamagePoints: Array<{
    x: number;
    z: number;
    wall: "left" | "right";
  }> = [];

  private keys: Record<string, boolean> = {};

  // Game state - single source of truth
  private gameState: GameState;

  private scoreElems: HTMLSpanElement[] = [];
  private nameElems: HTMLSpanElement[] = [];

  // Theme system
  private currentGameTheme: GameThemeColors;
  private themeUnsubscribe?: () => void;
  private floorTextureIndex?: number;

  // Background effects system
  private backgroundEffects?: GameBackgroundEffects;

  // Chat system removed

  private ballRadius = 0.2;
  private speedIncrement = 1.0001;
  private minHorizontalSpeed = 0.12;
  private wallThickness = 0.1;
  private cornerSize = this.wallThickness * 5;

  private ws?: WebSocket;
  private usingSocketIO = false; // Track if using Web socket vs raw WebSocket
  private remoteIndex: 0 | 1 | 2 | 3 = 0; // your assigned index online
  private guestInputs: Record<number, { neg: boolean; pos: boolean }> = {};
  private lastGuestInputKey: string = "";
  private lastGameEndAudioTime: number = 0;
  private lastStateSent = 0;

  private isHost = false;
  private isGuest = false;
  private requiredGuests = 0; // 1 (2P) or 3 (4P)
  private connectedGuests = 0;
  private waitUI?: HTMLDivElement;
  private latestTournamentSummary: TournamentResultSummary | null = null;
  private tournamentOverlay: HTMLElement | null = null;

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
    // Initialize game state
    this.gameState = new GameState(config);
  // These arrays are populated/used by the frontend helpers module (Pong3D.frontend).
  // Keep harmless reads here so TypeScript doesn't flag them as unused.
  void this.scoreElems;
  void this.nameElems;

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
    
    // Initialize theme system first
    this.currentGameTheme = themeBridge.getCurrentTheme();
    this.scene.clearColor = this.currentGameTheme.background;
    
    // Set ambient color for better overall scene brightness
    this.scene.ambientColor = new Color3(0.4, 0.4, 0.4); // Increased ambient light
    
    // Initialize background effects with theme color
    const primaryHex = `#${Math.round(this.currentGameTheme.primary.r * 255).toString(16).padStart(2, '0')}${Math.round(this.currentGameTheme.primary.g * 255).toString(16).padStart(2, '0')}${Math.round(this.currentGameTheme.primary.b * 255).toString(16).padStart(2, '0')}`;
    this.backgroundEffects = new GameBackgroundEffects(primaryHex);

    // Listen for theme changes
    this.themeUnsubscribe = themeBridge.onThemeChange((newTheme) => {
      this.updateGameTheme(newTheme);
    });

    this.camera = new ArcRotateCamera(
      "cam",
      this.baseAlpha, // alpha
      Math.PI / 5, // beta
      CameraConfig.radius, // radius
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

  // Input — track ArrowUp/ArrowDown globally; add W/S only for local 2P
    const onKey = (v: boolean) => (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();

      // Handle pause toggle (only on keydown)
      if (k === "p" && v) {
        this.togglePause();
        e.preventDefault();
        return;
      }

      // Handle exit game (only on keydown)
      if (k === "escape" && v) {
        this.exitGame();
        e.preventDefault();
        return;
      }

  if (["arrowup", "arrowdown"].includes(k) ||
          (this.config.connection === "local" && ["w", "s"].includes(k))) {
        this.keys[k] = v;
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey(true));
    window.addEventListener("keyup", onKey(false));

    // Handle visibility change (tab switch/minimize)
    // Note: beforeunload handler removed - players should use ESC key to exit gracefully
    document.addEventListener("visibilitychange", this.handleVisibilityChange.bind(this));

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
      this.gameState.matchReady = this.requiredGuests === 0;
      // Host should not see a waiting overlay per request
      this.remoteIndex = 0; // host is index 0 (Left) - rotation will be set by Socket.IO events
    } else if (this.isGuest) {
      this.gameState.matchReady = false;
      // Show a waiting overlay to all non-host players until the game starts
      this.showWaitingOverlay("Waiting for host to start…");
      // index will be set after "assign"
    }

    this.createScoreUI();
    this.initializeChat();
    this.init();
    if (this.isHost || this.isGuest) this.initRemote();
  }

  /* ---------------- Utility Methods ---------------- */
  
  private hashString(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  private hsvToRgb(h: number, s: number, v: number): Color3 {
    const c = v * s;
    const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
    const m = v - c;
    
    let r = 0, g = 0, b = 0;
    
    if (h >= 0 && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (h >= 1/6 && h < 2/6) {
      r = x; g = c; b = 0;
    } else if (h >= 2/6 && h < 3/6) {
      r = 0; g = c; b = x;
    } else if (h >= 3/6 && h < 4/6) {
      r = 0; g = x; b = c;
    } else if (h >= 4/6 && h < 5/6) {
      r = x; g = 0; b = c;
    } else {
      r = c; g = 0; b = x;
    }
    
    return new Color3(r + m, g + m, b + m);
  }

  /* ---------------- UI ---------------- */

  private createScoreUI() {
  Frontend.createScoreUI(this);
  this.createControlsHint();
  }

  private createControlsHint() {
    // Create a subtle controls hint in the corner
    const hint = document.createElement('div');
    hint.className = 'game-controls-hint';
    hint.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(0, 0, 0, 0.7);
        color: #84cc16;
        padding: 8px 12px;
        border-radius: 8px;
        font-size: 12px;
        font-family: monospace;
        border: 1px solid rgba(132, 204, 22, 0.3);
        z-index: 1000;
        pointer-events: none;
        opacity: 0.8;
        transition: opacity 0.3s ease;
      ">
        <div style="margin-bottom: 4px;"><strong>CONTROLS:</strong></div>
        <div>P - Pause/Resume</div>
        <div style="color: #f59e0b;">ESC - Exit Game</div>
      </div>
    `;
    document.body.appendChild(hint);

    // Auto-hide after 5 seconds
    setTimeout(() => {
      hint.style.opacity = '0.3';
    }, 5000);

    // Store reference for cleanup
    (this as any).controlsHint = hint;
  }
  private updateNamesUI() {
  Frontend.updateNamesUI(this);
  }
  
  private updateScoreUI() {
  Frontend.updateScoreUI(this);
  }

  private showWaitingOverlay(text: string) {
  Frontend.showWaitingOverlay(this, text);
  }
  private updateWaitingOverlay(text: string) {
  Frontend.updateWaitingOverlay(this, text);
  }
  private hideWaitingOverlay() {
  Frontend.hideWaitingOverlay(this);
  }

  private updateGameTheme(newTheme: GameThemeColors) {
  Frontend.updateGameTheme(this, newTheme);
  }

  private initializeChat() {
  Frontend.initializeChat(this);
  }

  private getPlayerName(playerIndex: number): string {
  return Frontend.getPlayerName(this, playerIndex);
  }

  // Cleanup method for theme and chat subscription
  public dispose() {
    if (this.themeUnsubscribe) {
      this.themeUnsubscribe();
      this.themeUnsubscribe = undefined;
    }

    // Clean up background effects
    if (this.backgroundEffects) {
      this.backgroundEffects.destroy();
      this.backgroundEffects = undefined;
    }

    // Chat system removed

    // Stop all audio to prevent loops
    this.stopAllAudio();

    // Cleanup pause overlay
    this.hidePauseOverlay();

    // Cleanup controls hint
    const controlsHint = (this as any).controlsHint;
    if (controlsHint && controlsHint.parentNode) {
      controlsHint.parentNode.removeChild(controlsHint);
    }

    // Dispose engine and scene
    if (this.engine) {
      this.engine.dispose();
    }
  }

  private stopAllAudio() {
    console.log("🔇 Stopping all audio to prevent loops");
    
    // Stop all sound categories
    Object.values(this.sounds).forEach(soundArray => {
      soundArray.forEach(sound => {
        try {
          if (sound && sound.isPlaying) {
            sound.stop();
          }
        } catch (e) {
          console.log("⚠️ Could not stop sound:", e);
        }
      });
    });
  }

  private async startGameWithCountdown() {
    if (this.config.skipCountdown) {
      console.log("⏭️ Skipping countdown overlay (config.skipCountdown)");
      this.gameState.matchReady = true;
      this.resetBall(Math.random() < 0.5 ? 1 : -1);
      return;
    }

    // Show countdown before starting the game
    const countdown = new GameCountdown({
      onComplete: () => {
        this.gameState.matchReady = true;
        this.resetBall(Math.random() < 0.5 ? 1 : -1);
      },
    });

    await countdown.start();
  }

  private async beginMatch() {
    this.hideWaitingOverlay();

    // For Socket.IO games (4P), notify other players to start game
    if (socketManager.connected) {
      console.log("🎮 Host beginMatch() - starting Socket.IO game flow");
      
      // Notify other players to start the game (countdown will be handled in game_started event)
      console.log("🎮 Host calling socketManager.startGame()");
      socketManager.startGame();
      
      // Host will start countdown when receiving game_started confirmation
      return;
    }

    // For WebSocket games (2P), show countdown and then start
    if (this.config.skipCountdown) {
      console.log("⏭️ beginMatch skipping countdown");
      this.gameState.matchReady = true;
      this.resetBall(Math.random() < 0.5 ? 1 : -1);
      if (this.isHost) {
        this.sendRemoteMessage({ t: "start" } as RemoteMsg);
      }
      return;
    }

    const countdown = new GameCountdown({
      onComplete: () => {
        this.gameState.matchReady = true;
        this.resetBall(Math.random() < 0.5 ? 1 : -1);
        if (this.isHost) {
          this.sendRemoteMessage({ t: "start" } as RemoteMsg);
        }
      },
    });

    await countdown.start();
  }

  /* ---------------- Scene ---------------- */

  private init() {
    const width = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // Lights - Increased brightness for better visibility
    const hemi = new HemisphericLight("hemi", new Vector3(0, 1, 0), this.scene);
    hemi.intensity = 1.2; // Increased ambient lighting
    const dir = new DirectionalLight("dir", new Vector3(0, -1, 1), this.scene);
    dir.intensity = 1.5; // Increased directional lighting for tournament visibility

    // Field (picture floor)
    const textures = [
      "/textures/floor.jpeg",
      "/textures/floor1.jpg",
      "/textures/floor2.jpg",
      "/textures/floor3.jpg",
      "/textures/floor4.jpg",
      "/textures/floor5.jpg",
      "/textures/floor6.png",
      "/textures/floor7.png"
    ];

    // Floor texture selection
    // - Remote games: deterministic based on roomId (so all clients match)
    // - Local/AI games: random each session
    let floorIdx: number;
    if (this.isHost || this.isGuest || this.config.roomId) {
      const floorSeed = this.config.roomId ? this.hashString(this.config.roomId) : 0;
      floorIdx = Math.abs(floorSeed) % textures.length;
    } else {
      floorIdx = Math.floor(Math.random() * textures.length);
    }
    this.floorTextureIndex = floorIdx;
    const randomTex = textures[floorIdx];

    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseTexture = new Texture(randomTex, this.scene);
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

const wallUrl = "/textures/44.jpg";
// const wallUrl = "/textures/brick.jpeg";
const topMat = wallTextureMat(this.scene, wallUrl, 12, 1);   // repeat horizontally
const bottomMat = wallTextureMat(this.scene, wallUrl, 12, 1);
const wallUrl2 = "/textures/45.jpg";
const leftMat = wallTextureMat(this.scene, wallUrl2, 1, 6);  // repeat vertically
const rightMat = wallTextureMat(this.scene, wallUrl2, 1, 6);

// No need for wAng rotation
// (leftMat.diffuseTexture as Texture).wAng = Math.PI / 2;
// (rightMat.diffuseTexture as Texture).wAng = Math.PI / 2;

wall(width + t, t, 0, height / 2 + t / 2, "wallTop", topMat);
wall(width + t, t, 0, -height / 2 - t / 2, "wallBottom", bottomMat);

this.leftWall = wall(
  t,
  height + t,
  -width / 2 - t / 2,
  0,
  "wallLeft",
  leftMat
);
this.rightWall = wall(
  t,
  height + t,
  width / 2 + t / 2,
  0,
  "wallRight",
  rightMat
);

    // Also create tiled walls for damage system
    this.createTiledWalls(width, height, t, leftMat, rightMat);

    // Reuse materials per rotation so we don't create duplicates
    const cornerMats = new Map<number, StandardMaterial>();

    function cornerTextureMat(
      scene: Scene,
      textureUrl: string,
      rotationAngle: number = 0
    ) {
      if (cornerMats.has(rotationAngle)) return cornerMats.get(rotationAngle)!;

      const mat = new StandardMaterial(
        `cornerTextureMat_${rotationAngle}`,
        scene
      );
      const tex = new Texture(textureUrl, scene);
      tex.wAng = rotationAngle; // keep image upright per corner
      mat.diffuseTexture = tex;
      mat.emissiveColor = new Color3(0.1, 0.1, 0.1);
      mat.specularColor = new Color3(0, 0, 0);
      cornerMats.set(rotationAngle, mat);
      return mat;
    }

    this.cornerSize = t * 5;
    const cS = this.cornerSize;
    const cx = width / 2 - t / 2 - cS / 2;
    const cz = height / 2 - t / 2 - cS / 2;

    // Create N stacked boxes at a corner
    const makeCornerStack = (
      x: number,
      z: number,
      idBase: string,
      textureRotation: number = 0,
      count = 3,
      gap = cS * 0.08 // small gap between cubes; set 0 for flush stack
    ) => {
      const mat = cornerTextureMat(
        this.scene,
        "/textures/42.png",
        textureRotation
      );

      for (let i = 0; i < count; i++) {
        const box = MeshBuilder.CreateBox(
          `${idBase}_${i}`,
          { width: cS, height: cS, depth: cS },
          this.scene
        );
        // base cube sits at y=cS/2; each next cube is one height + gap above
        box.position.set(x, cS / 2 + i * (cS + gap), z);
        box.material = mat;
        this.corners.push(box);
      }
    };

    // Four corners — stack of three each
    makeCornerStack(+cx, +cz, "cornerTR", 0);
    makeCornerStack(+cx, -cz, "cornerBR", 0);
    makeCornerStack(-cx, +cz, "cornerTL", 0);
    makeCornerStack(-cx, -cz, "cornerBL", 0);

    // Ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    // ballMat.diffuseTexture = new Texture("/textures/ball.png", this.scene);

    // Generate deterministic shining color based on room/game config
    const ballSeed = this.config.roomId ? this.hashString(this.config.roomId + "ball") : 42;
    const hue = (ballSeed % 360) / 360; // Convert to 0-1 range for hue
    // Use HSV to RGB conversion for better color distribution
    const saturation = 0.8;
    const value = 1.0;
    const randomColor = this.hsvToRgb(hue, saturation, value);
    ballMat.emissiveColor = randomColor.scale(0.6); // Scale to control brightness

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
        this.gameState.setControl(["human", "ai", "ai", "ai"]);
        this.applyAIDifficulty([1, 2, 3], 10);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remote4Host") {
        this.gameState.setControl(["human", "remoteGuest", "remoteGuest", "remoteGuest"]);
        // Don't set rotation here - will be set by Socket.IO game_started event
      } else if (this.config.connection === "remote4Guest") {
        this.gameState.setControl(["human", "human", "human", "human"]); // render only; your input is sent to host
        // Don't set rotation here - will be set by Socket.IO game_started event
      } else {
        this.gameState.setControl(["human", "human", "human", "human"]);
        this.setViewRotationForIndex(0);
      }
    } else {
      if (this.config.connection === "ai") {
        this.gameState.setControl(["human", "ai"]);
        this.applyAIDifficulty([1], this.config.aiDifficulty ?? 6);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remoteHost") {
        this.gameState.setControl(["human", "remoteGuest"]);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remoteGuest") {
        this.gameState.setControl(["human", "human"]); // render only, receive state from host
        this.setViewRotationForIndex(1); // Guest is player 1 (right side)
      } else {
        // Local 2P
        this.gameState.setControl(["human", "human"]);
        this.camera.alpha = this.baseAlpha;
      }
    }

    // Obstacles: host/local spawns; guests build from net
    if (!this.isGuest) this.spawnObstacles(width, height);

    if (this.gameState.matchReady) {
      // For local games, show countdown before starting
      this.startGameWithCountdown();
    } else {
      this.ball.position.set(0, 0.3, 0);
      this.ballVelocity.set(0, 0, 0);
    }

    this.engine.runRenderLoop(() => {
      // Only update game logic if not paused, but always render the scene
      if (!this.gameState.isPaused) {
        this.update(width, height);
      }
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private setViewRotationForIndex(idx: 0 | 1 | 2 | 3) {
    // Rotate camera so your paddle appears on the LEFT side of the screen
    // The field rotates, not just the paddle orientation
    const map: Record<number, number> = {
      0: 0,            // Player 0 (left paddle): No rotation, already on left
      1: Math.PI,      // Player 1 (right paddle): Rotate 180° so right becomes left
      2: -Math.PI / 2, // Player 2 (bottom paddle): Rotate -90° so bottom becomes left  
      3: Math.PI / 2,  // Player 3 (top paddle): Rotate 90° so top becomes left
    };
    this.viewTheta = map[idx] ?? 0;
    this.camera.alpha = this.baseAlpha + this.viewTheta;
    console.log(`🔄 ROTATION DEBUG: Player ${idx} -> viewTheta: ${this.viewTheta}, camera.alpha: ${this.camera.alpha}, baseAlpha: ${this.baseAlpha}`);
  }
// ai --------------------------------------------------------------------------------------- aiii
  private applyAIDifficulty(idxs: number[], d: number) {
    // clamp 1..10 and normalize to 0..1
    const t = Math.min(10, Math.max(1, d));
    const s = (t - 1) / 9;

    // Non-linear easing for more dramatic difficulty curve
    const sg = Math.pow(s, 0.7); // slightly steeper curve

    // ⬇️ Enhanced error range: Easy=8 → Hard=0.1 (more dramatic)
    const errRange = lerp(8.0, 0.1, sg);

    // ⬇️ Improved response speed: Easy=0.008 → Hard=0.35 (much more responsive at high levels)
    const lerpAmt = lerp(0.008, 0.35, sg);

    idxs.forEach((i) => {
      this.gameState.setAIErrorRange(i, errRange);
      this.gameState.setAILerp(i, lerpAmt);
    });
  }
//=====================================================================================obstacles

  private spawnObstacles(width: number, height: number) {
    const count = 3; // ≤3 obstacles
    const chosen: Vector3[] = [];
    const minGap = 4.0;

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

      // Calculate deterministic texture index for network synchronization
      const textures = ["/textures/42.png", "/textures/40.jpg", "/textures/41.jpg"];
      const textureIndex = this.hashString(`${x.toFixed(3)}-${z.toFixed(3)}`) % textures.length;

      this.obstacleInfo.push({
        x,
        z,
        radius,
        color: bodyArr,
        cap: capArr,
        shape,
        textureIndex,
      });
      this.buildObstacleMesh(x, z, radius, bodyCol, capCol, shape, textureIndex);
    }
  }

  // Build obstacle in a specific shape; keep 2D circular collision via metadata.radius
  private buildObstacleMesh(
  x: number,
  z: number,
  radius: number,
  _bodyCol: Color3, // not used anymore since we use textures
  _capCol: Color3, // not used anymore
  _shape?: ObstacleShape, // ignored, we always use "box"
  textureIndex?: number // optional explicit texture index for network sync
) {
  // Always box
  let m: import("@babylonjs/core").Mesh;
  let hitRadius = radius;

  const width = radius * 2.2;
  const depth = radius * 2.2;
  const height = Math.max(0.8, radius * 1.2);

  m = MeshBuilder.CreateBox(
    `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
    { width, depth, height },
    this.scene
  );
  m.position.set(x, height / 2, z);
  hitRadius = Math.hypot(width / 2, depth / 2);

  // Pick deterministic texture based on explicit index or position for consistency across remote players
  const textures = [
    "/textures/42.png",
    "/textures/40.jpg",
    "/textures/41.jpg",
  ];
  const actualTextureIndex = textureIndex !== undefined 
    ? textureIndex 
    : this.hashString(`${x.toFixed(3)}-${z.toFixed(3)}`) % textures.length;
  const randomTexture = textures[actualTextureIndex];

  // Apply material with texture
  const mat = new StandardMaterial(`mat-${x.toFixed(3)}-${z.toFixed(3)}`, this.scene);
  mat.diffuseTexture = new Texture(randomTexture, this.scene);
  mat.backFaceCulling = false;
  mat.specularColor = new Color3(0.2, 0.2, 0.2); // slight shininess
  m.material = mat;

  // Optional metadata if you need it later
  (m as any).metadata = {
    radius: hitRadius,
    baseScale: m.scaling.clone(),
    pulseTimeout: 0 as any,
    shape: "box",
  };

  this.obstacles.push(m);
}

//   private buildObstacleMesh(
//   x: number,
//   z: number,
//   radius: number,
//   bodyCol: Color3,
//   _capCol: Color3, // not used for spheres
//   shape?: ObstacleShape
// ) {
//   const sh = shape || this.fixedObstacleShape || "sphere";
//   let m: import("@babylonjs/core").Mesh;
//   let hitRadius = radius;

//   // if (sh === "sphere") {
//   //   m = MeshBuilder.CreateSphere(
//   //     `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//   //     { diameter: radius * 2, segments: 20 },
//   //     this.scene
//   //   );
//   //   m.position.set(x, radius, z);
//   // } else if (sh === "cylinder") {
//   //   const height = Math.max(0.8, radius * 1.6);
//   //   m = MeshBuilder.CreateCylinder(
//   //     `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//   //     { diameter: radius * 2, height, tessellation: 24 },
//   //     this.scene
//   //   );
//   //   m.position.set(x, height / 2, z);
//   //   hitRadius = radius;
//   // } else if (sh === "cone") {
//   //   const height = Math.max(1.0, radius * 2.2);
//   //   m = MeshBuilder.CreateCylinder(
//   //     `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//   //     { diameter: radius * 2, diameterTop: 0, height, tessellation: 24 },
//   //     this.scene
//   //   );
//   //   m.position.set(x, height / 2, z);
//   //   hitRadius = radius;
//   // } else if (sh === "capsule") {
//   //   const height = Math.max(radius * 2.8, 1.2);
//   //   m = MeshBuilder.CreateCapsule(
//   //     `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//   //     { radius, height, tessellation: 12, capSubdivisions: 6 },
//   //     this.scene
//   //   );
//   //   m.position.set(x, height / 2, z);
//   //   hitRadius = radius;
//   // } else if (sh === "disc") {
//   //   const height = Math.max(0.1, radius * 0.18);
//   //   m = MeshBuilder.CreateCylinder(
//   //     `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//   //     { diameter: radius * 2, height, tessellation: 36 },
//   //     this.scene
//   //   );
//   //   m.position.set(x, height / 2, z);
//   //   hitRadius = radius;
//   // } else {
//     // BOX: apply image texture
//     const width = radius * 2.2;
//     const depth = radius * 2.2;
//     const height = Math.max(0.8, radius * 1.2);
//     m = MeshBuilder.CreateBox(
//       `obs-${x.toFixed(3)}-${z.toFixed(3)}`,
//       { width, depth, height },
//       this.scene
//     );
//     m.position.set(x, height / 2, z);
//     hitRadius = Math.hypot(width / 2, depth / 2);

//     // Create material with texture
//     const mat = new StandardMaterial(`mat-${x.toFixed(3)}-${z.toFixed(3)}`, this.scene);
//     mat.diffuseTexture = new Texture("/textures/42.png", this.scene);
//     mat.backFaceCulling = false;
//     mat.specularColor = new Color3(0.2, 0.2, 0.2); // slight shininess
//     m.material = mat;
//   }

//   // For non-box shapes, keep the old shinyMat
//   // if (sh !== "box") {
//   //   m.material = shinyMat(this.scene, bodyCol, 0.7, true);
//   // }

//   // (m as any).metadata = {
//   //   radius: hitRadius,
//   //   baseScale: m.scaling.clone(),
//   //   pulseTimeout: 0 as any,
//   //   shape: sh,
//   // };
//   // this.obstacles.push(m);
// // }
  //======================================================================================
  private resetBall(dirX = Math.random() < 0.5 ? 1 : -1) {
    this.ball.position.set(0, 0.3, 0);
    const angle = (Math.random() * Math.PI) / 4 - Math.PI / 8;
    const speed = 0.15;
    this.ballVelocity = new Vector3(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random() * 0.05,
      speed * Math.sin(angle)
    );
    this.gameState.setBallVelocity(this.ballVelocity);
    this.gameState.control.forEach((c, i) => {
      if (c === "ai")
        this.gameState.setAIError(i, (Math.random() * 2 - 1) * this.gameState.aiErrorRangePerPaddle[i]);
      this.gameState.setAIVelocity(i, 0);
    });
    this.gameState.resetBallState();
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
        // Chat system removed
        case "start":
          socketManager.startGame();
          break;
        default:
          console.log("Unhandled Web socket message type:", msg.t);
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
      console.error("Web socket not connected");
      return;
    }

    console.log("Initializing Web socket for game...", {
      isHost: this.isHost,
      isGuest: this.isGuest,
      roomId: socketManager.roomId,
      playerId: socketManager.id,
    });

    // Set up Web socket event listeners
    socketManager.on("game_state", (state) => {
      if (this.isGuest) {
        this.handleRemoteState(state);
      }
    });
    
    // Listen for game exit messages via Socket.IO
    socketManager.on("game_exit", (data) => {
      console.log("🚪 Received game exit signal via Socket.IO:", data);
      this.handleRemoteState({ gameExit: true, ...data });
    });

    socketManager.on("player_input", (data) => {
      if (this.isHost && data.playerId !== socketManager.id) {
        console.log("Host received guest input:", data);
        // Allow pause request from any player
        if ((data as any).input?.type === "pauseToggle" || (data as any).type === "pauseToggle") {
          this.togglePause();
          return;
        }
        const payload = data.input || data;
        const playerIdx = (data as any).playerIndex ?? payload.idx ?? payload.playerIndex;
        if (playerIdx !== undefined) {
          this.guestInputs[playerIdx] = {
            neg: !!payload.neg,
            pos: !!payload.pos,
          };
        }
      }
    });

    // Chat system removed

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
      
      // Only end the active game if it's in progress
      if (this.gameState.matchReady) {
        // Report current game state before ending
        this.reportGameInterruption();
        
        // End the game immediately when any player leaves during gameplay
        this.gameState.matchReady = false;
        
        // For tournament matches, handle disconnection specially
        if (this.config.tournament) {
          console.log('🏆 Tournament match - opponent disconnected');
          // Determine if local player wins by forfeit
          const localPlayerIndex = this.getLocalControlledIndices()[0] || 0;
          const localPlayerName = this.getPlayerName(localPlayerIndex);
          
          // Award victory to remaining player by forfeit
          const newScores = [...this.gameState.scores];
          if (localPlayerIndex === 0) {
            newScores[0] = this.config.winScore || 5;
            newScores[1] = 0;
          } else {
            newScores[0] = 0;
            newScores[1] = this.config.winScore || 5;
          }
          (this.gameState as any).scores = newScores;
          
          this.endAndToast(`Opponent disconnected - ${localPlayerName} wins by forfeit!`);
        } else {
          this.endAndToast("Game ended - Player disconnected");
        }
      } else if (this.isHost) {
        // If game hasn't started yet, just update the waiting status
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

    socketManager.on("game_started", (data) => {
      console.log("Game started signal received", data);
      
      // Update player assignments if provided
      if (data && data.players) {
        const myPlayer = data.players.find((p: any) => p.id === socketManager.id);
        if (myPlayer) {
          this.remoteIndex = myPlayer.playerIndex;
          console.log(`🎮 My player index: ${this.remoteIndex} (isHost: ${this.isHost})`);
          
          // Set view rotation so this player's paddle appears on the right side
          this.setViewRotationForIndex(this.remoteIndex);
          console.log(`🎮 Assigned player index ${this.remoteIndex}; camera set. (alpha=${this.camera.alpha}, theta=${this.viewTheta})`);
          
          // Update display names with correct order for all players
        } else {
          console.log(`🎮 WARNING: Could not find my player in data.players. Available players:`, data.players);
          // Fallback: if host is not found in players array, assume they are player 0
          if (this.isHost) {
            this.remoteIndex = 0;
            this.setViewRotationForIndex(0);
            console.log(`🎮 Fallback: Set host as player 0 with rotation`);
          }
        }
        
        // Update display names with correct order for all players
        if (this.config.displayNames && data.players) {
            // Clear existing names first
            for (let i = 0; i < 4; i++) {
              this.config.displayNames[i] = "";
            }
            
            // Set actual player names
            data.players.forEach((player: any, index: number) => {
              if (index < 4 && player.name && this.config.displayNames) {
                this.config.displayNames[index] = player.name;
              }
            });
            
            // For any remaining slots without names, set appropriate defaults
            for (let i = 0; i < 4; i++) {
              if (this.config.displayNames && !this.config.displayNames[i]) {
                this.config.displayNames[i] = `Player ${i + 1}`;
              }
            }
          }
          
          this.updateNamesUI();
        }
      
      // Both host and guests show countdown on game_started event for synchronization
      if (!this.gameState.matchReady) {
        console.log(`🎮 Player ${this.isHost ? 'host' : 'guest'} received game_started - showing countdown (remoteIndex: ${this.remoteIndex})`);
        this.hideWaitingOverlay();
        
        // Show countdown for all Socket.IO players simultaneously  
        if (this.config.skipCountdown) {
          console.log("⏭️ game_started skipping countdown");
          this.gameState.matchReady = true;
          this.resetBall(Math.random() < 0.5 ? 1 : -1);
        } else {
          const countdown = new GameCountdown({
            onComplete: () => {
              console.log(`🎮 Player ${this.isHost ? 'host' : 'guest'} countdown complete - starting game`);
              this.gameState.matchReady = true;
              this.resetBall(Math.random() < 0.5 ? 1 : -1);
            },
          });
          countdown.start(); // Synchronized countdown for all players
        }
      } else {
        console.log(`🎮 Player received game_started but game already ready`);
      }
    });

    socketManager.on("game_ready", (data) => {
      console.log("Game ready signal received:", data);
      
      // Update display names based on proper player positions
      if (this.config.displayNames) {
        this.config.displayNames[0] = data.hostPlayer.name;
        this.config.displayNames[1] = data.joinerPlayer.name;
      }
      
      // Determine if this client is host or joiner and set remote index accordingly
      if (socketManager.id === data.hostPlayer.id) {
        this.remoteIndex = 0; // Host is always player 0
        console.log("This client is the host (player 0)");
      } else if (socketManager.id === data.joinerPlayer.id) {
        this.remoteIndex = 1; // Joiner is always player 1 (second score)
        console.log("This client is the joiner (player 1)");
        // For guests, keep waiting overlay until game_started; set view rotation only
        if (this.isGuest) {
          this.setViewRotationForIndex(this.remoteIndex);
        }
      }
      
      // Update UI with correct names and positions
      this.updateNamesUI();
      this.updateScoreUI();
      
      // If both players are ready, allow game to start
      if (this.isHost && this.connectedGuests >= this.requiredGuests) {
        this.checkMatchReady();
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
      this.showWaitingOverlay(
        `Waiting for players… ${this.connectedGuests}/${this.requiredGuests}`
      );
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
    // Handle game exit message
    if (stateMsg.gameExit) {
      console.log("🚪 Received game exit signal from:", stateMsg.exitedBy);
      this.gameState.matchReady = false;
      this.stopAllAudio();
      
      const exitMessage = stateMsg.playerRole === 'Host' 
        ? `🏠 Game ended by Host - ${stateMsg.exitedBy || 'Host'} left the game` 
        : `🔗 Game ended by Joiner - ${stateMsg.exitedBy || 'Joiner'} left the game`;
      
      // For tournament matches, don't show toast or reload
      if (this.config.tournament) {
        console.log("🏆 Tournament match - opponent exited. Checking for forfeit...");
        // The opponent left, so local player wins by forfeit
        const localPlayerIndex = this.getLocalControlledIndices()[0] || 0;
        
        // Create tournament summary for forfeit win
        const summary: TournamentResultSummary = {
          tournamentId: this.config.tournament.id,
          matchId: this.config.tournament.matchId,
          scores: [localPlayerIndex === 0 ? (this.config.winScore || 5) : 0, 
                   localPlayerIndex === 1 ? (this.config.winScore || 5) : 0],
          winnerIdx: localPlayerIndex,
          players: (this.config.tournament.players || []).map((player, idx) => ({
            id: player.id,
            name: player.name,
            side: player.side ?? (idx === 0 ? 'left' : 'right'),
          })),
          isWinner: true,
        };
        
        this.latestTournamentSummary = summary;

        void this.showTournamentWinnerScreen(summary);
        return;
      }
      
      this.endAndToast(exitMessage);
      
      // Auto-return to menu after 3 seconds (non-tournament only)
      setTimeout(() => {
        console.log("🕐 3 seconds elapsed - exiting game session automatically");
        this.gameState.matchReady = false;
        this.stopAllAudio();
        window.location.reload();
      }, 3000);
      return;
    }

    // Handle game end message
    if (stateMsg.gameEnd) {
      this.gameState.matchReady = false;
      
      // Determine the appropriate message for this player
      const isLocalWinner = this.getLocalControlledIndices().includes(stateMsg.winnerIdx);
      const text = isLocalWinner ? "You win!" : "You lose!";
      
      this.endAndToast(text);

      // Chat system removed

      // Play correct win/lose cue from local perspective
      // Only play audio if this is a joiner receiving the message, not the host
      if (!this.isHost) {
        this.handleGameEndAudio(stateMsg.winnerIdx);
      }

      // Check if this is a tournament match
      if (this.config.tournament) {
        console.log("🏆 Tournament match ended");
        this.stopAllAudio();
        
        const summary: TournamentResultSummary = {
          tournamentId: this.config.tournament.id,
          matchId: this.config.tournament.matchId,
          scores: [...this.gameState.scores],
          winnerIdx: stateMsg.winnerIdx,
          players: (this.config.tournament.players || []).map((player, idx) => ({
            id: player.id,
            name: player.name,
            side: player.side ?? (idx === 0 ? 'left' : 'right'),
          })),
          isWinner: isLocalWinner,
        };

        this.latestTournamentSummary = summary;

        try {
          sessionStorage.setItem('ft_pong_tournament_match_ended', JSON.stringify(summary));
        } catch (error) {
          console.warn('Unable to cache tournament result summary:', error);
        }

        this.dispatchTournamentMatchEvent(isLocalWinner ? 'victory' : 'eliminated', summary, 'auto');

        // Show appropriate screen based on match outcome
        if (isLocalWinner) {
          void this.showTournamentWinnerScreen(summary);
        } else {
          this.showTournamentGameOverScreen(summary);
        }
      } else {
        // Non-tournament game: auto-exit after 3 seconds
        setTimeout(() => {
          console.log("🕐 3 seconds elapsed - ending game session automatically");
          this.gameState.matchReady = false;
          this.stopAllAudio();
          window.location.reload();
        }, 3000);
      }
      return;
    }

    // Handle pause toggle message
    if (stateMsg.pauseToggle) {
      this.gameState.isPaused = stateMsg.isPaused;
      
      if (this.gameState.isPaused) {
        this.showPauseOverlay();
        console.log(`⏸️ Game paused by ${stateMsg.pausedBy}`);
        
        // Chat system removed
      } else {
        this.hidePauseOverlay();
        console.log(`▶️ Game resumed by ${stateMsg.pausedBy}`);
        
        // Chat system removed
      }
      return;
    }

    // Handle regular state updates from Web socket or WebSocket
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
        this.buildObstacleMesh(o.x, o.z, o.radius, body, cap, o.shape, o.textureIndex);
      }
      this.builtObstaclesFromNet = true;
    }

    stateMsg.paddles.forEach((pp: any, i: number) =>
      this.paddles[i]?.position.set(pp.x, pp.y, pp.z)
    );

    this.gameState.setScores(stateMsg.scores);
    this.updateScoreUI();

    if (!this.gameState.matchReady) {
      this.gameState.matchReady = true;
      this.hideWaitingOverlay();
    }
  }

  private initRemote() {
    // Check if we should use Web socket instead of raw WebSocket
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
          if (this.connectedGuests >= this.requiredGuests && !this.gameState.matchReady) {
            this.beginMatch(); // Fire and forget for WebSocket flow
          }
          return;
        }

        if (msg.t === "assign" && this.isGuest) {
          this.remoteIndex = (msg.idx as 0 | 1 | 2 | 3) ?? 1;
          // Always rotate so *your* paddle is on the right side
          this.setViewRotationForIndex(this.remoteIndex);
          if (!this.gameState.matchReady) this.updateWaitingOverlay("Waiting for start…");
          return;
        }

        if (msg.t === "start" && this.isGuest) {
          if (!this.gameState.matchReady) {
            this.hideWaitingOverlay();
            // Show countdown for joiner too
            if (this.config.skipCountdown) {
              console.log("⏭️ Guest received start - skipping countdown");
              this.gameState.matchReady = true;
              this.resetBall(Math.random() < 0.5 ? 1 : -1);
            } else {
              const countdown = new GameCountdown({
                onComplete: () => {
                  this.gameState.matchReady = true;
                  this.resetBall(Math.random() < 0.5 ? 1 : -1);
                },
              });
              countdown.start(); // Fire and forget, synchronized with host
            }
          }
          return;
        }

        if (msg.t === "state" && this.isGuest) {
          this.handleRemoteState(msg);
          return;
        }

        if (msg.t === "gameExit") {
          this.handleRemoteState(msg);
          return;
        }

        // Chat system removed

        if (msg.t === "input" && this.isHost) {
          if ((msg as any).type === "pauseToggle") {
            this.togglePause();
            return;
          }
          this.guestInputs[msg.idx] = {
            neg: !!(msg as any).neg,
            pos: !!(msg as any).pos,
          };
          return;
        }
      };

      // Handle WebSocket close (player disconnect)
      this.ws.onclose = () => {
        console.log("WebSocket connection closed");
        // End the game immediately when connection is lost
        this.gameState.matchReady = false;
        this.endAndToast("Game ended - Connection lost");
      };

      // Handle WebSocket errors
      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        // End the game immediately on connection error
        this.gameState.matchReady = false;
        this.endAndToast("Game ended - Connection error");
      };

      if (this.isGuest) {
        const sendInputs = () => {
          // Map arrows to generic axis (neg/pos) based on your assigned paddle index.
          let neg = false,
            pos = false;
          const idx = this.remoteIndex;
          
          // ALL players use UP/DOWN arrows only
          // UP should always move the paddle "up" from the player's rotated perspective
          neg = !!this.keys["arrowup"];   // UP arrow is "neg" (move towards goal)
          pos = !!this.keys["arrowdown"]; // DOWN arrow is "pos" (move away from goal)

          const inputData = {
            idx,
            neg,
            pos,
          };
          
          // For Web socket connections, use socketManager
          if (socketManager.connected) {
            socketManager.sendPlayerInput(inputData);
          } else if (this.ws) {
            // For WebSocket connections, use the original method
            const pkt: RemoteMsg = {
              t: "input",
              idx,
              neg,
              pos,
              sid: this.config.sessionId || undefined,
            };
            this.sendRemoteMessage(pkt);
          }
          requestAnimationFrame(sendInputs);
        };
        requestAnimationFrame(sendInputs);
      }
    } catch {
      // best effort
    }
  }

  private broadcastState(now: number) {
    if (!this.isHost) return;
    if (now - this.lastStateSent < 33) return; // ~30Hz
    this.lastStateSent = now;
    
    const gameState = {
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
      scores: [...this.gameState.scores],
      obstacles: this.obstacleInfo.map((o) => ({ ...o })), // includes shape
    };
    
    // For Web socket connections, use socketManager
    if (socketManager.connected) {
      socketManager.sendGameState(gameState);
    } else if (this.ws) {
      // For WebSocket connections, use the original method
      const msg: RemoteMsg = {
        t: "state",
        ...gameState
      };
      this.sendRemoteMessage(msg);
    }
  }

  /* ---------------- Tick ---------------- */

  private update(width: number, height: number) {
    const now = performance.now();
    if (!this.gameState.matchReady) {
      if (this.isHost) this.broadcastState(now);
      return;
    }

  const move = 0.2;
  const [p1, p2] = this.paddles;

    // Arrow-only control for local/host
    // ALL players use UP/DOWN arrows, but the movement maps to different axes based on their rotated view
    if (this.config.playerCount === 4) {
      // Handle local controlled paddles (usually just player 0 for host)
      const localIndices = this.getLocalControlledIndices();
      for (const idx of localIndices) {
        if (this.gameState.control[idx] === "human") {
          const paddle = this.paddles[idx];
          if (!paddle) continue;

          // All players use UP/DOWN arrows, movement maps to correct axis and direction
          // UP should move paddle towards player's goal from their rotated perspective
          if (idx === 0) {
            // Player 0 (left paddle): reverse mapping per request
            if (this.keys["arrowup"]) paddle.position.z -= move;
            if (this.keys["arrowdown"]) paddle.position.z += move;
          } else if (idx === 1) {
            // Player 1 (right paddle): normal mapping
            if (this.keys["arrowup"]) paddle.position.z -= move;
            if (this.keys["arrowdown"]) paddle.position.z += move;
          } else if (idx === 2) {
            // Player 2 (bottom paddle): UP from rotated view = move towards center (-X)
            if (this.keys["arrowup"]) paddle.position.x -= move;
            if (this.keys["arrowdown"]) paddle.position.x += move;
          } else if (idx === 3) {
            // Player 3 (top paddle): UP from rotated view = move towards center (+X)
            if (this.keys["arrowup"]) paddle.position.x += move;
            if (this.keys["arrowdown"]) paddle.position.x -= move;
          }
        }
      }

      if (this.config.connection === "remote4Host") {
        // Player 1: normal mapping (neg => Z-, pos => Z+)
        if (this.guestInputs[1]?.neg) this.paddles[1].position.z -= move; // right Z-
        if (this.guestInputs[1]?.pos) this.paddles[1].position.z += move; // right Z+
        if (this.guestInputs[2]?.neg) this.paddles[2].position.x -= move; // bottom X-
        if (this.guestInputs[2]?.pos) this.paddles[2].position.x += move; // bottom X+
        if (this.guestInputs[3]?.neg) this.paddles[3].position.x += move; // top X+ (mirrored)
        if (this.guestInputs[3]?.pos) this.paddles[3].position.x -= move; // top X-
      } else if (this.config.connection === "remote4Guest") {
        // 4P guest: send only, no local movement
        const idx = this.remoteIndex;
        if (idx !== undefined && idx >= 0 && idx <= 3) {
          // Keep ArrowUp semantics consistent for all seats
          // Seat 1 (right paddle) has 180° rotation, so invert UP/DOWN when sending
          const invertUpDown = idx === 1 || Math.abs(Math.abs(this.viewTheta) - Math.PI) < 0.1;
          const neg = invertUpDown ? !!this.keys["arrowdown"] : !!this.keys["arrowup"];   // UP
          const pos = invertUpDown ? !!this.keys["arrowup"]   : !!this.keys["arrowdown"]; // DOWN
          // Send via Socket.IO path; raw WebSocket guests already send from initRemote() loop
          if (socketManager.connected) {
            socketManager.sendPlayerInput({ idx, neg, pos });
          }
        }
      }

      // AI for the rest (if any)
      [0, 1, 2, 3].forEach((i) => this.runAI(i, width, height, move));
    } else {
      // ---------- 2P ----------
      if (this.gameState.control[1] === "ai") {
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
  // Player 2: normal mapping
  if (this.guestInputs[1]?.neg) p2.position.z -= move;
  if (this.guestInputs[1]?.pos) p2.position.z += move;
      } else if (this.config.connection === "remoteGuest") {
        // Guest can send input for their paddle (player 1, right side)
        // Send arrow key inputs to the host for paddle 1 (right paddle)
        // Check if view is rotated (Math.PI rotation for joiner) and invert controls accordingly
        const isViewRotated = Math.abs(this.viewTheta - Math.PI) < 0.1; // Check if rotated 180 degrees
        const guestInputState = {
          neg: isViewRotated ? !!this.keys["arrowdown"] : !!this.keys["arrowup"],
          pos: isViewRotated ? !!this.keys["arrowup"] : !!this.keys["arrowdown"]
        };
        
        // Only send if input has changed to avoid spamming
        const currentInputKey = `${guestInputState.neg}-${guestInputState.pos}`;
        if (this.lastGuestInputKey !== currentInputKey) {
          this.lastGuestInputKey = currentInputKey;
          
          if (socketManager.connected) {
            socketManager.sendPlayerInput({
              playerIndex: 1,
              neg: guestInputState.neg,
              pos: guestInputState.pos
            });
          } else if (this.ws) {
            this.sendRemoteMessage({
              t: "input",
              idx: 1,
              neg: guestInputState.neg,
              pos: guestInputState.pos,
              sid: this.config.sessionId || undefined,
            });
          }
        }
        
        // Guest renders only; the actual game state comes from the host via handleRemoteState()
        // Don't run any game logic here, just render what we receive from the host
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
    this.ballVelocity.y -= 0.008;
    this.ball.position.addInPlace(this.ballVelocity);

    // Update background effects with ball position
    const ballScreenX = ((this.ball.position.x + width/2) / width) * 100;
    const ballScreenY = ((this.ball.position.z + height/2) / height) * 100;
    this.backgroundEffects?.updateBallPosition(ballScreenX, ballScreenY);

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
        this.gameState.lastHitter = idx;
        this.gameState.touchedOnce = true;
        this.gameState.obstacleAfterHit = false;
        flashPaddle(p);
        this.playHit("paddle"); // SOUND
        
        // Trigger background effects for ball hit
        const ballScreenX = ((this.ball.position.x + width/2) / width) * 100;
        const ballScreenY = ((this.ball.position.z + height/2) / height) * 100;
        this.backgroundEffects?.onBallHit(ballScreenX, ballScreenY);
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
        this.gameState.lastHitter = idx;
        this.gameState.touchedOnce = true;
        this.gameState.obstacleAfterHit = false;
        flashPaddle(p);
        this.playHit("paddle"); // SOUND
        
        // Trigger background effects for ball hit
        const ballScreenX = ((this.ball.position.x + width/2) / width) * 100;
        const ballScreenY = ((this.ball.position.z + height/2) / height) * 100;
        this.backgroundEffects?.onBallHit(ballScreenX, ballScreenY);
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
        if (this.gameState.lastHitter >= 0 && this.gameState.touchedOnce)
          this.gameState.obstacleAfterHit = true;

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

    const applyPenaltyIfNeeded = (idx: number) => {
      if (this.gameState.obstacleAfterHit && this.gameState.lastHitter === idx) {
        this.gameState.subtractScore(idx);
        this.gameState.lastScorer = idx;
        this.updateScoreUI();
      }
      this.gameState.obstacleAfterHit = false;
    };

    if (this.config.playerCount === 4) {
      const outX = Math.abs(this.ball.position.x) > halfW;
      const outZ = Math.abs(this.ball.position.z) > halfH;
      if (outX || outZ) {
        if (this.gameState.touchedOnce && this.gameState.lastHitter >= 0) {
          if (this.ball.position.x < -halfW) applyPenaltyIfNeeded(0);
          if (this.ball.position.x > +halfW) applyPenaltyIfNeeded(1);
          if (this.ball.position.z > +halfH) applyPenaltyIfNeeded(2);
          if (this.ball.position.z < -halfH) applyPenaltyIfNeeded(3);

          this.gameState.addScore(this.gameState.lastHitter);
          this.gameState.lastScorer = this.gameState.lastHitter;
          this.updateScoreUI();
          
          // Trigger background effects for scoring
          this.backgroundEffects?.onScore(this.gameState.lastHitter);

          // Chat system removed

          const winResult = this.gameState.isWinConditionMet();
          if (winResult.hasWinner) {
            this.finishAndReport(winResult.winner);
            return;
          }
          this.resetBall(
            this.gameState.lastHitter === 0
              ? 1
              : this.gameState.lastHitter === 1
              ? -1
              : (undefined as any)
          );
        } else {
          this.gameState.lastScorer = -1;
          this.updateScoreUI();
          this.resetBall();
        }
      }
    } else {
      if (this.ball.position.x > halfW) {
        if (this.gameState.touchedOnce && this.gameState.lastHitter === 0) {
          // Ball went past right wall and was last hit by player 0 (left paddle) - player 0 scores!
          applyPenaltyIfNeeded(1);
          this.gameState.addScore(0);
          this.gameState.lastScorer = 0;
          // Add damage to right wall where ball hit
          this.addWallDamage(
            "right",
            this.ball.position.x,
            this.ball.position.z
          );
          this.updateScoreUI();
          
          // Trigger background effects for scoring
          this.backgroundEffects?.onScore(0);
          
          const winResult = this.gameState.isWinConditionMet();
          if (winResult.hasWinner) {
            this.finishAndReport(winResult.winner);
            return;
          }
        }
        this.resetBall(-1);
      } else if (this.ball.position.x < -halfW) {
        if (this.gameState.touchedOnce && this.gameState.lastHitter === 1) {
          // Ball went past left wall and was last hit by player 1 (right paddle) - player 1 scores!
          applyPenaltyIfNeeded(0);
          this.gameState.addScore(1);
          this.gameState.lastScorer = 1;
          // Add damage to left wall where ball hit
          this.addWallDamage(
            "left",
            this.ball.position.x,
            this.ball.position.z
          );
          this.updateScoreUI();
          
          // Trigger background effects for scoring
          this.backgroundEffects?.onScore(1);
          
          const winResult = this.gameState.isWinConditionMet();
          if (winResult.hasWinner) {
            this.finishAndReport(winResult.winner);
            return;
          }
        }
        this.resetBall(1);
      }
    }

    if (this.isHost) this.broadcastState(now);
  }

  private addWallDamage(wall: "left" | "right", hitX: number, hitZ: number) {
    // Only add damage in 2P mode
    if (this.config.playerCount !== 2) return;

    const wallMesh = wall === "left" ? this.leftWall : this.rightWall;
    if (!wallMesh) return;

    // Store damage point
    this.wallDamagePoints.push({
      x: hitX,
      z: hitZ,
      wall: wall,
    });

    // Create damage texture effect
    this.applyDamageToWall(wallMesh, hitX, hitZ);
  }

  private createTiledWalls(
    width: number,
    height: number,
    thickness: number,
    leftMat: StandardMaterial,
    rightMat: StandardMaterial
  ) {
    // Configuration for wall tiles
    const tilesPerWall = 10; // Number of tiles per wall (vertically)
    const tileHeight = height / tilesPerWall;

    // Clear existing tile arrays
    this.leftWallTiles = [];
    this.rightWallTiles = [];

    // Create left wall tiles
    for (let i = 0; i < tilesPerWall; i++) {
      const tileZ = -height / 2 + (i + 0.5) * tileHeight; // Center position of each tile

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
      const tileZ = -height / 2 + (i + 0.5) * tileHeight; // Center position of each tile

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

    console.log(
      `🧱 Created ${tilesPerWall} tiles per wall (${
        tilesPerWall * 2
      } total wall tiles)`
    );
  }

  private applyDamageToWall(
    wallMesh: import("@babylonjs/core").Mesh,
    _hitX: number,
    hitZ: number
  ) {
    // This method now needs to find which specific tile was hit and damage only that tile

    // Determine which wall was hit (left or right)
    const isLeftWall =
      wallMesh === this.leftWall || this.leftWallTiles.includes(wallMesh);
    const isRightWall =
      wallMesh === this.rightWall || this.rightWallTiles.includes(wallMesh);

    if (!isLeftWall && !isRightWall) {
      console.log("❌ Wall mesh not recognized");
      return;
    }

    // Get the appropriate tile array
    const wallTiles = isLeftWall ? this.leftWallTiles : this.rightWallTiles;
    const wallName = isLeftWall ? "left" : "right";

    // Find which tile the ball hit based on hitZ position
    const tileHeight = 10 / wallTiles.length; // 10 is the total height from createTiledWalls
    const hitTileIndex = Math.floor((hitZ + 5) / tileHeight); // +5 to offset from center, 5 = height/2
    const clampedIndex = Math.max(
      0,
      Math.min(hitTileIndex, wallTiles.length - 1)
    );

    const targetTile = wallTiles[clampedIndex];

    if (!targetTile) {
      console.log("❌ Could not find target tile");
      return;
    }

    // Check if this specific tile is already damaged
    if ((targetTile as any)._isDamaged) {
      console.log(
        `⚠️ Tile ${clampedIndex} on ${wallName} wall already damaged`
      );
      return;
    }

    // Mark this specific tile as damaged
    (targetTile as any)._isDamaged = true;

    // Create a new damaged material using the b2 damage texture for this tile only
    const material = targetTile.material as StandardMaterial;
    const damagedMaterial = material.clone(
      `damagedTile_${wallName}_${clampedIndex}_${Date.now()}`
    );

    // Load the damage wall texture (b2.png)
    const damageTexture = new Texture("/textures/b2.png", this.scene);

    // Apply the damage texture to only this specific tile
    damagedMaterial.diffuseTexture = damageTexture;
    targetTile.material = damagedMaterial;

    console.log(
      `🔥 Tile ${clampedIndex} on ${wallName} wall damaged with b2 texture at position:`,
      { hitZ, tileHeight }
    );
  }

  private togglePause() {
    // Multiplayer: guests request pause from host; host toggles and broadcasts
    if (socketManager.connected || this.ws) {
      if (this.isHost) {
        // Host toggles state and broadcasts
        this.gameState.isPaused = !this.gameState.isPaused;
        const pauseData = {
          isPaused: this.gameState.isPaused,
          pausedBy: this.getPlayerName(this.getLocalControlledIndices()[0] || 0)
        };
        if (socketManager.connected) {
          socketManager.sendGameState({ pauseToggle: true, ...pauseData });
        } else if (this.ws) {
          this.sendRemoteMessage({ t: "pauseToggle", ...pauseData } as any);
        }
        if (this.gameState.isPaused) {
          this.showPauseOverlay();
          console.log("⏸️ Game paused");
        } else {
          this.hidePauseOverlay();
          console.log("▶️ Game resumed");
        }
      } else {
        // Guest: request host to toggle pause
        if (socketManager.connected) {
          socketManager.sendPlayerInput({ type: "pauseToggle" });
        } else if (this.ws) {
          this.sendRemoteMessage({ t: "input", type: "pauseToggle", sid: this.config.sessionId || undefined } as any);
        }
        // Don’t toggle locally; wait for host broadcast
      }
      return;
    }

    // Offline/local games: toggle immediately
    this.gameState.isPaused = !this.gameState.isPaused;
    if (this.gameState.isPaused) {
      this.showPauseOverlay();
      console.log("⏸️ Game paused");
    } else {
      this.hidePauseOverlay();
      console.log("▶️ Game resumed");
    }
  }

  public async exitGame() {
    console.log("🚪 Exit game requested by player");

    // Show confirmation dialog for multiplayer games
    if (this.isHost || this.isGuest) {
      const playerName = this.getPlayerName(this.getLocalControlledIndices()[0] || 0);
      const playerRole = this.isHost ? "Host" : "Joiner";
      const confirmed = await showConfirmDialog(
        `This will end the match for all players.`,
        'Exit Game?',
        'Yes, Exit',
        'Stay in Game'
      );

      if (!confirmed) {
        return; // Player cancelled, don't exit
      }

      // Broadcast exit game to all players
      const exitData = {
        gameExit: true,
        exitedBy: `${playerName} (${playerRole})`,
        playerRole: playerRole,
        reason: `${playerRole} exited the game`,
        finalScores: [...this.gameState.scores],
        timestamp: Date.now()
      };

      if (socketManager.connected) {
        // Broadcast via Web socket and leave room properly
        socketManager.sendGameState(exitData);
        console.log("📡 Broadcast game exit via Web socket");

        // Leave the room to clean up server-side session
        socketManager.leaveRoom();
        console.log("🚪 Left Web socket room");
      } else if (this.ws) {
        // Broadcast via WebSocket
        this.sendRemoteMessage({
          t: "gameExit",
          ...exitData
        } as any);
        console.log("📡 Broadcast game exit via WebSocket");

        // Send leave room message for WebSocket sessions
        this.sendRemoteMessage({
          t: "leave",
          reason: "Player exited game"
        } as any);
        console.log("🚪 Sent leave message via WebSocket");
      }

      // Report current game state before exiting
      await this.reportGameInterruption();

      // Clean up API session if exists
      try {
        if (this.config.currentUser?.id) {
          await ApiClient.endSession(this.config.currentUser.id);
          console.log("🔐 API session ended");
        }
      } catch (error) {
        console.warn("⚠️ Could not end API session:", error);
      }
    }

    // End the game immediately
    this.gameState.matchReady = false;
    this.stopAllAudio();

    // Show exit message and provide option to return to menu
    this.endAndToast("Game exited - Returning to menu");

    // Auto-return to menu after a short delay
    setTimeout(() => {
      window.location.reload();
    }, 2000);
  }

  private showPauseOverlay() {
  Frontend.showPauseOverlay(this);
  }

  private hidePauseOverlay() {
  Frontend.hidePauseOverlay(this);
  }

  private runAI(i: number, width: number, height: number, maxStep: number) {
    if (this.gameState.control[i] !== "ai") return;
    const lerpAmt = this.gameState.aiLerpPerPaddle[i];
    const err = this.gameState.aiError[i];

    const isLR = i < 2; // paddles 0,1 are left/right (move in Z), paddles 2,3 are bottom/top (move in X)
    const ballPos = this.ball.position.clone();
    const ballVel = this.ballVelocity.clone();

    // Get the paddle's fixed position (the axis it doesn't move along)
    const paddleFixedPos = isLR ? this.paddles[i].position.x : this.paddles[i].position.z;

    // Start with current ball position as target
    let target = isLR ? ballPos.z : ballPos.x;

    // Predictive simulation to find where ball will be when it reaches this paddle
    const simulate = ballPos.clone();
    const v = ballVel.clone();
    const limitZ = height / 2 - this.ballRadius - this.wallThickness / 2;
    const horizon = 120; // increased for better prediction

    for (let k = 0; k < horizon; k++) {
      simulate.addInPlace(v);

      // Handle wall bounces in simulation
      if (this.config.playerCount === 2) {
        if (simulate.z > limitZ || simulate.z < -limitZ) v.z *= -1;
      }
      if (this.config.playerCount === 4) {
        // No wall bounces in 4P mode, but still consider boundaries
      }

      // Check if ball has reached this paddle's X/Z plane
      if (isLR) {
        // For left/right paddles (0,1): check if ball reached paddle's X position
        const reachedPaddle = (i === 0 && simulate.x <= paddleFixedPos + 0.5) ||
                              (i === 1 && simulate.x >= paddleFixedPos - 0.5);
        if (reachedPaddle &&
            ((i === 0 && v.x < 0) || (i === 1 && v.x > 0))) { // ball moving toward paddle
          target = simulate.z;
          break;
        }
      } else {
        // For bottom/top paddles (2,3): check if ball reached paddle's Z position
        const reachedPaddle = (i === 2 && simulate.z >= paddleFixedPos - 0.5) ||
                              (i === 3 && simulate.z <= paddleFixedPos + 0.5);
        if (reachedPaddle &&
            ((i === 2 && v.z > 0) || (i === 3 && v.z < 0))) { // ball moving toward paddle
          target = simulate.x;
          break;
        }
      }

      // Safety check: if simulation goes too far, break
      if (Math.abs(simulate.x) > width || Math.abs(simulate.z) > height) {
        break;
      }
    }

    // Apply AI error/difficulty
    target += err;

    // Move paddle toward target with smooth acceleration
    const p = this.paddles[i];
    const current = isLR ? p.position.z : p.position.x;
    const delta = target - current;

    // Enhanced responsiveness: larger deltas get faster response
    const urgency = Math.min(1.0, Math.abs(delta) / 2.0); // urgency factor based on distance
    const responsiveness = lerpAmt * (1.0 + urgency * 0.5); // boost response when far from target

    const accel = delta * responsiveness;
    this.gameState.setAIVelocity(i, this.gameState.aiVel[i] * 0.82 + accel * 0.18); // slightly more responsive interpolation

    let step = this.gameState.aiVel[i];

    // Clamp step size
    if (step > maxStep) step = maxStep;
    if (step < -maxStep) step = -maxStep;

    // Apply movement
    if (isLR) {
      p.position.z += step;
    } else {
      p.position.x += step;
    }
  }

  private async finishAndReport(winnerIdx: number) {
    this.gameState.matchReady = false;
    const text =
      this.config.playerCount === 4
        ? `Player ${["L", "R", "B", "T"][winnerIdx]} wins!`
        : winnerIdx === 0
        ? (this.config.displayNames?.[0] || "Left") + " wins!"
        : (this.config.displayNames?.[1] || "Right") + " wins!";
    
    // Show win message immediately
    this.endAndToast(text);

    // For multiplayer games, broadcast game end to all players
    if (this.isHost && (socketManager.connected || this.ws)) {
      const gameEndData = {
        winnerIdx,
        winnerName: this.getPlayerName(winnerIdx),
        finalScores: [...this.gameState.scores],
        displayNames: [...(this.config.displayNames || [])]
      };
      
      if (socketManager.connected) {
        // Broadcast via Socket.IO
        socketManager.sendGameState({
          gameEnd: true,
          ...gameEndData
        });
      } else if (this.ws) {
        // Broadcast via WebSocket
        this.sendRemoteMessage({
          t: "gameEnd",
          ...gameEndData
        } as any);
      }
    }

    // Handle tournament match end for host
    if (this.config.tournament) {
      console.log("🏆 Tournament match ended (host) - showing tournament UI");
      this.stopAllAudio();
      
      const isLocalWinner = this.getLocalControlledIndices().includes(winnerIdx);
      const summary: TournamentResultSummary = {
        tournamentId: this.config.tournament.id,
        matchId: this.config.tournament.matchId,
        scores: [...this.gameState.scores],
        winnerIdx: winnerIdx,
        players: (this.config.tournament.players || []).map((player: any, idx: number) => ({
          id: player.id,
          name: player.name,
          side: player.side ?? (idx === 0 ? 'left' : 'right'),
        })),
        isWinner: isLocalWinner,
      };

      this.latestTournamentSummary = summary;

      try {
        sessionStorage.setItem('ft_pong_tournament_match_ended', JSON.stringify(summary));
      } catch (error) {
        console.warn('Unable to cache tournament result summary:', error);
      }

      this.dispatchTournamentMatchEvent(isLocalWinner ? 'victory' : 'eliminated', summary, 'auto');

      // Show appropriate screen based on match outcome
      if (isLocalWinner) {
        void this.showTournamentWinnerScreen(summary);
      } else {
        this.showTournamentGameOverScreen(summary);
      }
      
      return; // Don't continue with non-tournament logic
    }

    // Wait 3 seconds then automatically exit session (NON-TOURNAMENT ONLY)
    if (!this.config.tournament) {
      setTimeout(() => {
        console.log("🕐 3 seconds elapsed - ending game session automatically");
        this.gameState.matchReady = false;
        this.stopAllAudio();
        window.location.reload();
      }, 3000);
    }

    // Chat system removed

    // Play correct win/lose cue from local perspective
    this.handleGameEndAudio(winnerIdx);

    // Post to DB if this is an online match or tournament. Host does the reporting.
    if (this.isHost) {
      const scores = [...this.gameState.scores];
      try {
        // Tournament support
        if (this.config.matchId) {
          const winnerUserId = this.config.currentUser?.id || null;
          await ApiClient.postMatchResult({
            matchId: this.config.matchId,
            winnerUserId,
            scores,
          });
        }

        // Handle tournament match completion
        const tMeta: any = (this.config as any).tournament; // safe cast to avoid TS narrowing to never
        if (tMeta && tMeta.id && tMeta.matchId) {
          try {
            const { tournamentService } = await import("../../tournament/TournamentService");

            // Determine winner ID
            const winScore = this.config.winScore || 5;
            const winners = this.gameState.scores
              .map((score, idx) => ({ score, idx }))
              .filter(({ score }) => score === winScore);

            if (winners.length === 1) {
              const wIdx = winners[0].idx;
              const players = tMeta.players || [];
              const winner = players[wIdx];

              if (winner && winner.id) {
                await tournamentService.completeMatch(
                  tMeta.id,
                  tMeta.matchId,
                  winner.id,
                  this.gameState.scores[0] || 0,
                  this.gameState.scores[1] || 0
                );

                console.log(`Tournament match completed: ${winner.name} wins ${this.gameState.scores[0]}-${this.gameState.scores[1]}`);
              }
            }
          } catch (error) {
            console.error('Failed to complete tournament match:', error);
          }
        }
      } catch {}
    }
  }

  private endAndToast(text: string) {
    // For tournament matches, don't show the generic "Return to Menu" toast
    // Tournament matches handle their own UI (winner screen, loser screen, etc.)
    if (this.config.tournament) {
      console.log(`🏆 Tournament match ended: ${text} - Handled by tournament UI`);

      // Ensure ALL players get redirected to tournament brackets after 15 seconds
      // This is a safety fallback in case bracket overlay fails
      setTimeout(() => {
        console.log('🏆 Fallback tournament redirect after 15 seconds');
        window.dispatchEvent(new CustomEvent('ft:tournament:showTournamentHub', {
          detail: {
            action: 'fallback_redirect',
            source: 'endAndToast_timeout'
          }
        }));
      }, 15000);

      return;
    }

    Frontend.endAndToast(this, text);
  }

  /* ---------------- TOURNAMENT SCREENS ---------------- */

  private async showTournamentGameOverScreen(summary: TournamentResultSummary) {
    console.log('❌ Showing Game Over screen for loser - will transition to bracket');

    this.latestTournamentSummary = summary;
    this.engine.stopRenderLoop();
    this.cleanupTournamentOverlay();

    const [scoreLeft = 0, scoreRight = 0] = summary.scores ?? [];

    const overlay = document.createElement('div');
    overlay.id = 'tournament-game-over-overlay';
    overlay.className = 'tournament-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; animation: fadeIn 1s;">
        <div style="font-size: 120px; margin-bottom: 30px;">💀</div>
        <h1 style="color: #ef4444; font-size: 72px; font-weight: bold; margin-bottom: 20px; text-shadow: 0 0 30px rgba(239, 68, 68, 0.8);">
          GAME OVER
        </h1>
        <p style="color: #94a3b8; font-size: 24px; margin-bottom: 24px;">
          You have been eliminated from the tournament
        </p>
        <p style="color: #64748b; font-size: 20px; margin-bottom: 40px;">
          Final Score: <strong>${scoreLeft}</strong> - <strong>${scoreRight}</strong>
        </p>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      </style>
    `;

    document.body.appendChild(overlay);
    this.tournamentOverlay = overlay;

    // Show game over message for 2 seconds, then return to main menu
    setTimeout(() => {
      console.log('❌ Loser returning to main menu after 2 seconds');
      
      // Clean up overlay
      if (overlay.parentElement) {
        overlay.parentElement.removeChild(overlay);
      }
      this.tournamentOverlay = null;
      
      // Stop game and return to main menu
      this.gameState.matchReady = false;
      this.stopAllAudio();
      window.location.reload();
    }, 2000);
  }

  private async showTournamentWinnerScreen(summary: TournamentResultSummary) {
    console.log('🏆 Showing Victory screen - will transition to bracket');

    this.latestTournamentSummary = summary;

    if (summary.isWinner) {
      await this.reportTournamentMatchCompletion(summary);
    }

    this.engine.stopRenderLoop();
    this.cleanupTournamentOverlay();

    const [scoreLeft = 0, scoreRight = 0] = summary.scores ?? [];
    const players = summary.players ?? [];
    const winner = players[summary.winnerIdx]?.name || 'You';

    const overlay = document.createElement('div');
    overlay.id = 'tournament-winner-overlay';
    overlay.className = 'tournament-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      z-index: 10000;
    `;

    overlay.innerHTML = `
      <div style="text-align: center; animation: fadeIn 1s;">
        <div style="font-size: 120px; margin-bottom: 30px;">🏆</div>
        <h1 style="color: #84cc16; font-size: 72px; font-weight: bold; margin-bottom: 20px; text-shadow: 0 0 30px rgba(132, 204, 22, 0.8);">
          VICTORY!
        </h1>
        <p style="color: #94a3b8; font-size: 24px; margin-bottom: 24px;">
          ${winner} wins the match!
        </p>
        <p style="color: #64748b; font-size: 20px; margin-bottom: 40px;">
          Final Score: <strong>${scoreLeft}</strong> - <strong>${scoreRight}</strong>
        </p>
        <p id="transition-message" style="color: #84cc16; font-size: 18px; margin-bottom: 20px;">
          Loading tournament bracket...
        </p>
      </div>

      <style>
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.9); }
          to { opacity: 1; transform: scale(1); }
        }
      </style>
    `;

    document.body.appendChild(overlay);
    this.tournamentOverlay = overlay;

    // Show victory message for 2 seconds, then show bracket
    setTimeout(async () => {
      console.log('🏆 Winner viewing tournament bracket');
      
      try {
        // Clear the overlay content and show bracket
        overlay.innerHTML = '';
        overlay.style.background = 'rgba(0, 0, 0, 0.95)';
        overlay.style.padding = '40px 20px';
        overlay.style.overflowY = 'auto';
        
        // Show bracket/next match screen
        this.checkForNextTournamentMatch(overlay, summary);
      } catch (error) {
        console.error('❌ Failed to show bracket:', error);
      }
    }, 2000);
  }

  private async reportTournamentMatchCompletion(summary: TournamentResultSummary) {
    if (!summary.isWinner) {
      return;
    }

    try {
      const { tournamentService } = await import('../../tournament/TournamentService');
      const [score1 = 0, score2 = 0] = summary.scores ?? [];
      const winner = summary.players?.[summary.winnerIdx] ?? this.config.tournament?.players?.[summary.winnerIdx];

      if (!winner?.id) {
        console.warn('🏆 Cannot determine winner ID for match completion');
        return;
      }

      await tournamentService.completeMatch(
        summary.tournamentId,
        summary.matchId,
        winner.id,
        score1,
        score2
      );

      console.log('✅ Match completion reported successfully');
    } catch (error) {
      console.error('❌ Failed to report match completion:', error);
    }
  }

  private async checkForNextTournamentMatch(overlay: HTMLElement, summary?: TournamentResultSummary) {
    try {
      const matchSummary = summary ?? this.getCachedTournamentSummary();
      if (!matchSummary) {
        this.showBracketWaitingScreen(overlay);
        return;
      }

      console.log('🏆[loop-fix] Checking for next tournament match...');
      const { tournamentService } = await import('../../tournament/TournamentService');
      const tournament = await tournamentService.getTournament(matchSummary.tournamentId);

      if (tournament.status === 'completed' || tournament.isComplete) {
        this.showTournamentCompleteScreen(overlay);
        return;
      }

      const { authService } = await import('../../');
      const currentUser = authService.getUser();
      const userId = currentUser?.id || currentUser?.email;

      // Identify the just-finished match to enforce round advancement
      const prevMatch = tournament.matches.find((m: any) => m.id === matchSummary.matchId);
      const prevRound = prevMatch?.round ?? -1;

      // Active match = not complete & actively flagged (backend uses isActive)
      const activeMatch = tournament.matches.find((m: any) =>
        !m.isComplete && m.isActive && (m.player1?.id === userId || m.player2?.id === userId) && m.round > prevRound
      );
      if (activeMatch) {
        console.log('🚀[loop-fix] Active next-round match found -> auto start path', { matchId: activeMatch.id, round: activeMatch.round, prevRound });
        this.autoStartNextMatch(overlay, tournament, activeMatch);
        return;
      }

      // Pending next match (both players assigned, not complete, not active yet, higher round)
      const pendingNext = tournament.matches.find((m: any) =>
        !m.isComplete && !m.isActive && (m.player1 && m.player2) && (m.player1.id === userId || m.player2.id === userId) && m.round > prevRound
      );
      if (pendingNext) {
        const isPlayer1 = pendingNext.player1?.id === userId;
        console.log('⏳[loop-fix] Pending next-round match located', { matchId: pendingNext.id, round: pendingNext.round, prevRound, isPlayer1 });
        // Both players see same ready screen (host/guest distinction handled in ready logic)
        this.showNextMatchScreen(overlay, tournament, pendingNext);
        return;
      }

      console.log('⌛[loop-fix] No next-round match yet -> bracket waiting');
      this.showBracketWaitingScreen(overlay, tournament);
    } catch (error) {
      console.error('❌[loop-fix] Failed to check next match:', error);
      this.showBracketWaitingScreen(overlay);
    }
  }

  private async showNextMatchScreen(overlay: HTMLElement, tournament: any, match: any) {
    this.tournamentOverlay = overlay;
    
    // Clear overlay and show bracket with ready button
    overlay.innerHTML = '';
    overlay.style.background = 'rgba(0, 0, 0, 0.95)';
    overlay.style.padding = '40px 20px';
    overlay.style.overflowY = 'auto';
    
    const container = document.createElement('div');
    container.style.cssText = 'max-width: 1400px; margin: 0 auto;';
    
    const opponent = match.player1?.id === (this.config.currentUser?.id || this.config.currentUser?.email) 
      ? match.player2 
      : match.player1;
    
    container.innerHTML = `
      <div style="text-align: center; margin-bottom: 32px;">
        <div style="font-size: 80px; margin-bottom: 16px;">🏆</div>
        <h1 style="color: #84cc16; font-size: 48px; font-weight: bold; margin-bottom: 16px; text-shadow: 0 0 20px rgba(132, 204, 22, 0.5);">
          Victory!
        </h1>
        <p style="color: #94a3b8; font-size: 20px; margin-bottom: 24px;">
          You won your match! Get ready for your next opponent
        </p>
        <h2 style="color: #84cc16; font-size: 32px; font-weight: bold; margin-bottom: 12px;">
          Next Match: vs ${opponent?.name || 'Opponent'}
        </h2>
        <p id="ready-status" style="color: #64748b; font-size: 18px; margin-bottom: 24px;">
          Click "Ready" when you're prepared to play
        </p>
      </div>

      <div id="tournament-bracket-container" style="
        width: 100%;
        background: rgba(15, 23, 42, 0.9);
        border: 2px solid rgba(132, 204, 22, 0.3);
        border-radius: 16px;
        padding: 24px;
        margin-bottom: 24px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
      ">
        <div style="text-align: center; color: #64748b; padding: 40px;">
          <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
          <div style="font-size: 18px;">Loading tournament bracket...</div>
        </div>
      </div>

      <div style="text-align: center;">
        <button id="ready-btn" style="
          padding: 20px 60px;
          font-size: 24px;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          box-shadow: 0 8px 24px rgba(132, 204, 22, 0.3);
        ">
          ✓ Ready to Play
        </button>
      </div>
    `;
    
    overlay.appendChild(container);
    await this.renderTournamentBracket(tournament);
    
    // Set up ready button handler
    const readyBtn = container.querySelector('#ready-btn') as HTMLButtonElement;
    const readyStatus = container.querySelector('#ready-status');
    let isReady = false;
    
    readyBtn?.addEventListener('click', async () => {
      if (isReady) return;
      
      isReady = true;
      readyBtn.disabled = true;
      readyBtn.style.background = 'linear-gradient(135deg, #64748b, #475569)';
      readyBtn.innerHTML = '✓ Waiting for opponent...';
      
      if (readyStatus) {
        readyStatus.innerHTML = `
          <div style="display: flex; align-items: center; justify-content: center; gap: 12px;">
            <div style="
              width: 20px;
              height: 20px;
              border: 2px solid #374151;
              border-top-color: #84cc16;
              border-radius: 50%;
              animation: spin 1s linear infinite;
            "></div>
            <span style="color: #84cc16;">You're ready! Waiting for ${opponent?.name || 'opponent'}...</span>
          </div>
          <style>
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          </style>
        `;
      }
      
      // Mark player as ready
      try {
        const { tournamentService } = await import('../../tournament/TournamentService');
        await tournamentService.markPlayerReady(tournament.tournamentId, match.id);
        console.log('✅ Marked as ready for match:', match.id);
      } catch (error) {
        console.error('❌ Failed to mark ready:', error);
      }
    });
    
    // Listen for when both players are ready
    this.setupBothPlayersReadyListener(overlay, tournament, match);
  }

  private async setupBothPlayersReadyListener(overlay: HTMLElement, tournament: any, match: any) {
    const { tournamentService } = await import('../../tournament/TournamentService');
    const { authService } = await import('../../');
    
    const currentUser = authService.getUser();
    const userId = currentUser?.id || currentUser?.email;
    const isPlayer1 = match.player1?.id === userId;
    
    const handleBothReady = ({ matchId, players }: any) => {
      if (matchId !== match.id) return;
      
      console.log('🎮 Both players ready! Starting match...', players);
      tournamentService.off('bothPlayersReady', handleBothReady);
      
      // Show transition and start match
      const readyStatus = overlay.querySelector('#ready-status');
      if (readyStatus) {
        readyStatus.innerHTML = `
          <div style="color: #84cc16; font-size: 20px; font-weight: bold; animation: pulse 1s infinite;">
            🎮 Both players ready! Starting match...
          </div>
        `;
      }
      
      setTimeout(() => {
        // Both players call startNextTournamentMatch
        // The TournamentMatchService handles host/guest logic internally
        // Player1 becomes host and creates room
        // Player2 becomes guest and waits for room announcement
        console.log(`🏆 ${isPlayer1 ? 'Player 1 (Host)' : 'Player 2 (Guest)'} starting match flow`);
        this.startNextTournamentMatch(tournament, match);
      }, 1500);
    };
    
    tournamentService.on('bothPlayersReady', handleBothReady);
    
    // Clean up listener if overlay is removed
    const overlayObserver = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        tournamentService.off('bothPlayersReady', handleBothReady);
        overlayObserver.disconnect();
      }
    });
    overlayObserver.observe(document.body, { childList: true, subtree: true });
  }

  private async showBracketWaitingScreen(overlay: HTMLElement, tournament?: any) {
    this.tournamentOverlay = overlay;
    let statusEl = overlay.querySelector('#tournament-status');
    let actionEl = overlay.querySelector('#tournament-action');
    
    // Create structure if it doesn't exist
    if (!statusEl || !actionEl) {
      overlay.innerHTML = `
        <div style="max-width: 1400px; margin: 0 auto; padding: 20px;">
          <div id="tournament-status"></div>
          <div id="tournament-action"></div>
        </div>
      `;
      statusEl = overlay.querySelector('#tournament-status');
      actionEl = overlay.querySelector('#tournament-action');
    }
    
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="display: flex; flex-direction: column; align-items: center; gap: 16px;">
          <div style="font-size: 80px; margin-bottom: 8px;">🏆</div>
          <div style="font-size: 42px; font-weight: bold; color: #84cc16; text-shadow: 0 0 20px rgba(132, 204, 22, 0.5);">
            Victory!
          </div>
          <div style="font-size: 20px; color: #94a3b8; margin-bottom: 8px;">
            You won your match! Waiting for other matches to complete...
          </div>
          <div style="font-size: 16px; color: #64748b; font-style: italic;">
            You'll be automatically notified when your next match is ready
          </div>
        </div>
      `;
    }
    
    if (actionEl) {
      actionEl.innerHTML = `
        <div id="tournament-bracket-container" style="
          width: 100%;
          max-width: 1200px;
          max-height: 70vh;
          overflow: auto;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid rgba(132, 204, 22, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin: 24px auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        ">
          <div style="text-align: center; color: #64748b; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 18px;">Loading tournament bracket...</div>
          </div>
        </div>
        <div style="display: flex; gap: 16px; justify-content: center; margin-top: 20px;">
          <button id="refresh-bracket-btn" style="
            padding: 14px 36px;
            font-size: 16px;
            font-weight: bold;
            color: #84cc16;
            background: rgba(132, 204, 22, 0.1);
            border: 2px solid rgba(132, 204, 22, 0.4);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
          ">
            � Refresh Bracket
          </button>
          <button id="exit-tournament-btn" style="
            padding: 14px 36px;
            font-size: 16px;
            font-weight: bold;
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
            border: 2px solid rgba(239, 68, 68, 0.4);
            border-radius: 10px;
            cursor: pointer;
            transition: all 0.3s;
          ">
            ❌ Exit Tournament
          </button>
        </div>
      `;
      
      // Render bracket if tournament data available
      if (tournament) {
        this.renderTournamentBracket(tournament);
      }
      
      const exitBtn = actionEl.querySelector('#exit-tournament-btn');
      exitBtn?.addEventListener('click', async () => {
        const confirmed = await import('../../components/modals/ConfirmDialog').then(m => 
          m.showConfirmDialog(
            'Are you sure you want to leave the tournament?',
            'Exit Tournament',
            'Yes, Exit',
            'Stay'
          )
        );
        if (confirmed) {
          const summary = this.getCachedTournamentSummary();
          void this.finishTournamentMatch(summary?.isWinner ? 'victory' : 'eliminated', summary || undefined);
        }
      });
      
      const refreshBtn = actionEl.querySelector('#refresh-bracket-btn');
      refreshBtn?.addEventListener('click', async () => {
        try {
          const summary = this.getCachedTournamentSummary();
          if (!summary) return;
          
          const { tournamentService } = await import('../../tournament/TournamentService');
          const updatedTournament = await tournamentService.getTournament(summary.tournamentId);
          
          this.renderTournamentBracket(updatedTournament);
          
          // Show brief feedback
          const btn = refreshBtn as HTMLButtonElement;
          const originalText = btn.innerHTML;
          btn.innerHTML = '✅ Updated!';
          btn.disabled = true;
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.disabled = false;
          }, 1500);
        } catch (error) {
          console.error('❌ Failed to refresh bracket:', error);
        }
      });
    }
    
    // Set up real-time WebSocket listeners for bracket updates
    const { tournamentService } = await import('../../tournament/TournamentService');
    const { authService } = await import('../../');
    
    const handleTournamentUpdate = (updatedTournament: any) => {
      // Only update if overlay is still visible
      if (!document.body.contains(overlay)) return;
      
      console.log('🔄 Real-time bracket update received');
      this.renderTournamentBracket(updatedTournament);
      
      // Check if tournament is completed
      if (updatedTournament.status === 'completed') {
        tournamentService.off('tournamentUpdated', handleTournamentUpdate);
        tournamentService.off('matchCompleted', handleMatchCompleted);
        if (pollingInterval) clearInterval(pollingInterval);
        this.showTournamentCompleteScreen(overlay);
        return;
      }
      
      // Check for active match for this player
      const currentUser = authService.getUser();
      const userId = currentUser?.id || currentUser?.email;
      
      const activeMatch = updatedTournament.matches.find((m: any) =>
        m.isActive &&
        (m.player1?.id === userId || m.player2?.id === userId)
      );
      
      if (activeMatch) {
        tournamentService.off('tournamentUpdated', handleTournamentUpdate);
        tournamentService.off('matchCompleted', handleMatchCompleted);
        if (pollingInterval) clearInterval(pollingInterval);
        if (statusEl) {
          statusEl.innerHTML = `
            <div style="font-size: 28px; color: #84cc16; font-weight: bold; animation: pulse 1s infinite;">
              🎮 Your next match is ready!
            </div>
          `;
        }
        // Show ready screen with slight delay for dramatic effect
        setTimeout(() => {
          this.showNextMatchScreen(overlay, updatedTournament, activeMatch);
        }, 1500);
      }
    };
    
    const handleMatchCompleted = ({ tournament: updatedTournament }: any) => {
      console.log('✅ Match completed event received');
      handleTournamentUpdate(updatedTournament);
    };
    
    // Subscribe to real-time events
    tournamentService.on('tournamentUpdated', handleTournamentUpdate);
    tournamentService.on('matchCompleted', handleMatchCompleted);
    
    // AGGRESSIVE POLLING: Fetch tournament state every 2 seconds as backup
    const summary = this.getCachedTournamentSummary();
    let pollingInterval: any = null;
    
    if (summary) {
      console.log('🔄 Starting aggressive polling (every 2 seconds) for tournament updates');
      pollingInterval = setInterval(async () => {
        try {
          // Check if overlay still exists
          if (!document.body.contains(overlay)) {
            if (pollingInterval) clearInterval(pollingInterval);
            return;
          }
          
          // Fetch latest tournament state
          const updatedTournament = await tournamentService.getTournament(summary.tournamentId);
          
          // Update bracket display
          this.renderTournamentBracket(updatedTournament);
          console.log('🔄 Polling: Bracket updated');
          
          // Check for tournament completion
          if (updatedTournament.status === 'completed') {
            if (pollingInterval) clearInterval(pollingInterval);
            tournamentService.off('tournamentUpdated', handleTournamentUpdate);
            tournamentService.off('matchCompleted', handleMatchCompleted);
            this.showTournamentCompleteScreen(overlay);
            return;
          }
          
          // Check for active match
          const currentUser = authService.getUser();
          const userId = currentUser?.id || currentUser?.email;
          
          const activeMatch = updatedTournament.matches.find((m: any) =>
            m.isActive &&
            (m.player1?.id === userId || m.player2?.id === userId)
          );
          
          if (activeMatch) {
            if (pollingInterval) clearInterval(pollingInterval);
            tournamentService.off('tournamentUpdated', handleTournamentUpdate);
            tournamentService.off('matchCompleted', handleMatchCompleted);
            console.log('🎮 Polling detected: Next match is ready!');
            
            if (statusEl) {
              statusEl.innerHTML = `
                <div style="font-size: 28px; color: #84cc16; font-weight: bold; animation: pulse 1s infinite;">
                  🎮 Your next match is ready!
                </div>
              `;
            }
            
            setTimeout(() => {
              this.showNextMatchScreen(overlay, updatedTournament, activeMatch);
            }, 1500);
          }
        } catch (error) {
          console.error('❌ Polling error:', error);
        }
      }, 2000); // Poll every 2 seconds
    }
    
    // Clean up event listeners and polling when overlay is removed
    const overlayObserver = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        tournamentService.off('tournamentUpdated', handleTournamentUpdate);
        tournamentService.off('matchCompleted', handleMatchCompleted);
        if (pollingInterval) clearInterval(pollingInterval);
        overlayObserver.disconnect();
        console.log('🧹 Cleaned up bracket WebSocket listeners and polling');
      }
    });
    overlayObserver.observe(document.body, { childList: true, subtree: true });
  }

  private showTournamentCompleteScreen(overlay: HTMLElement) {
    this.tournamentOverlay = overlay;
    const statusEl = overlay.querySelector('#tournament-status');
    const actionEl = overlay.querySelector('#tournament-action');
    
    if (statusEl) {
      statusEl.innerHTML = `
        <div style="font-size: 32px; margin-bottom: 20px;">🎊🏆🎊</div>
        <div style="color: #84cc16;">You won the tournament!</div>
      `;
    }
    
    if (actionEl) {
      actionEl.innerHTML = `
        <button id="exit-tournament-btn" style="
          padding: 20px 60px;
          font-size: 24px;
          font-weight: bold;
          color: white;
          background: linear-gradient(135deg, #84cc16, #65a30d);
          border: none;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
        ">
          🏠 Return Home
        </button>
      `;
      
      const btn = actionEl.querySelector('#exit-tournament-btn');
      btn?.addEventListener('click', () => {
        const summary = this.getCachedTournamentSummary();
        void this.finishTournamentMatch('victory', summary || undefined);
      });
    }
  }

  private getCachedTournamentSummary(): TournamentResultSummary | null {
    if (this.latestTournamentSummary) {
      return this.latestTournamentSummary;
    }

    try {
      const raw = sessionStorage.getItem('ft_pong_tournament_match_ended');
      if (!raw) return null;
      return JSON.parse(raw) as TournamentResultSummary;
    } catch (error) {
      console.warn('Failed to restore cached tournament summary:', error);
      return null;
    }
  }

  private cleanupTournamentOverlay() {
    if (this.tournamentOverlay) {
      try {
        this.tournamentOverlay.remove();
      } catch {}
      this.tournamentOverlay = null;
    }
  }

  private dispatchTournamentMatchEvent(
    outcome: 'victory' | 'eliminated',
    summary: TournamentResultSummary,
    source: 'auto' | 'action'
  ) {
    try {
      window.dispatchEvent(new CustomEvent('ft:tournament:matchFinished', {
        detail: { outcome, summary, source },
      }));
    } catch (error) {
      console.warn('Failed to dispatch tournament match event:', error);
    }
  }

  private finishTournamentMatch(
    outcome: 'victory' | 'eliminated',
    summary?: TournamentResultSummary
  ) {
    const effectiveSummary = summary ?? this.getCachedTournamentSummary();

    if (effectiveSummary) {
      this.latestTournamentSummary = effectiveSummary;
      this.dispatchTournamentMatchEvent(outcome, effectiveSummary, 'action');
    }

    this.cleanupTournamentOverlay();
    this.stopAllAudio();
    this.dispose();
  }

  private async renderTournamentBracket(tournament: any) {
    try {
      const container = document.getElementById('tournament-bracket-container');
      if (!container) return;
      
      const { TournamentBracket } = await import('../../tournament/TournamentBracket');
      new TournamentBracket(container as HTMLElement, tournament);
    } catch (error) {
      console.error('❌ Failed to render bracket:', error);
    }
  }

  private async showEliminatedPlayerBracketView(overlay: HTMLElement, tournament: any) {
    overlay.innerHTML = `
      <div style="max-width: 1400px; margin: 0 auto;">
        <div style="text-align: center; margin-bottom: 32px;">
          <h1 style="color: #ef4444; font-size: 42px; font-weight: bold; margin-bottom: 12px;">
            You've been eliminated
          </h1>
          <p style="color: #94a3b8; font-size: 20px; margin-bottom: 24px;">
            Watch the tournament bracket to see who advances
          </p>
        </div>

        <div id="tournament-bracket-container" style="
          width: 100%;
          background: rgba(15, 23, 42, 0.9);
          border: 2px solid rgba(239, 68, 68, 0.3);
          border-radius: 16px;
          padding: 24px;
          margin-bottom: 24px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        ">
          <div style="text-align: center; color: #64748b; padding: 40px;">
            <div style="font-size: 48px; margin-bottom: 16px;">⏳</div>
            <div style="font-size: 18px;">Loading tournament bracket...</div>
          </div>
        </div>

        <div style="text-align: center;">
          <button id="exit-tournament-btn" style="
            padding: 16px 48px;
            font-size: 18px;
            font-weight: bold;
            color: white;
            background: linear-gradient(135deg, #ef4444, #dc2626);
            border: none;
            border-radius: 12px;
            cursor: pointer;
            transition: all 0.3s;
          ">
            🚪 Leave Tournament
          </button>
        </div>
      </div>
    `;

    this.tournamentOverlay = overlay;
    await this.renderTournamentBracket(tournament);

    // Set up real-time WebSocket listeners for bracket updates
    const { tournamentService } = await import('../../tournament/TournamentService');
    
    const handleEliminatedUpdate = (updatedTournament: any) => {
      // Only update if overlay is still visible
      if (!document.body.contains(overlay)) return;
      
      console.log('🔄 Real-time bracket update for eliminated player');
      this.renderTournamentBracket(updatedTournament);
      
      // Check if tournament is completed
      if (updatedTournament.status === 'completed') {
        tournamentService.off('tournamentUpdated', handleEliminatedUpdate);
        tournamentService.off('matchCompleted', handleEliminatedMatchCompleted);
        
        // Show tournament completed message
        const container = overlay.querySelector('#tournament-bracket-container');
        if (container) {
          container.innerHTML = `
            <div style="text-align: center; padding: 40px;">
              <div style="font-size: 64px; margin-bottom: 20px;">🏆</div>
              <div style="color: #84cc16; font-size: 32px; font-weight: bold; margin-bottom: 16px;">
                Tournament Complete!
              </div>
              <div style="color: #94a3b8; font-size: 20px;">
                Winner: ${updatedTournament.winner?.name || 'Unknown'}
              </div>
            </div>
          `;
        }
      }
    };
    
    const handleEliminatedMatchCompleted = ({ tournament: updatedTournament }: any) => {
      console.log('✅ Match completed event received (eliminated player view)');
      handleEliminatedUpdate(updatedTournament);
    };
    
    // Subscribe to real-time events
    tournamentService.on('tournamentUpdated', handleEliminatedUpdate);
    tournamentService.on('matchCompleted', handleEliminatedMatchCompleted);
    
    // Clean up event listeners when overlay is removed
    const overlayObserver = new MutationObserver(() => {
      if (!document.body.contains(overlay)) {
        tournamentService.off('tournamentUpdated', handleEliminatedUpdate);
        tournamentService.off('matchCompleted', handleEliminatedMatchCompleted);
        overlayObserver.disconnect();
        console.log('🧹 Cleaned up eliminated player bracket WebSocket listeners');
      }
    });
    overlayObserver.observe(document.body, { childList: true, subtree: true });

    overlay.querySelector('#exit-tournament-btn')?.addEventListener('click', async () => {
      const confirmed = await import('../../components/modals/ConfirmDialog').then(m => 
        m.showConfirmDialog(
          'Are you sure you want to leave the tournament?',
          'Leave Tournament',
          'Yes, Leave',
          'Stay'
        )
      );
      
      if (confirmed) {
        console.log('🚪 Eliminated player leaving tournament');
        
        // Disconnect from tournament
        try {
          const { newTournamentService } = await import('../../tournament/NewTournamentService');
          newTournamentService.leaveTournament();
          console.log('✅ Successfully disconnected from tournament');
        } catch (error) {
          console.warn('⚠️ Failed to disconnect from tournament:', error);
        }
        
        // Clean up and return to main menu
        this.cleanupTournamentOverlay();
        this.stopAllAudio();
        this.dispose();
        
        try {
          sessionStorage.removeItem('ft_pong_tournament_match_ended');
        } catch (error) {
          console.warn('Failed to clear cached tournament summary:', error);
        }
        
        window.location.reload();
      }
    });
  }

  private async startNextTournamentMatch(tournament: any, match: any) {
    try {
      console.log('🎮 Starting next tournament match:', match);
      
      // Clean up current game
      this.dispose();
      
      // Import and start match service
      const { TournamentMatchService } = await import('../../tournament/TournamentMatchService');
      const { authService } = await import('../../');
      
      const matchService = TournamentMatchService.getInstance();
      const currentUser = authService.getUser();
      
      if (!currentUser) {
        throw new Error('User not authenticated');
      }
      
      const currentPlayer = {
        id: currentUser.id || currentUser.email,
        name: currentUser.userName || currentUser.firstName || currentUser.email,
        isOnline: true,
        isAI: false
      };
      
      await matchService.startTournamentMatch(
        tournament,
        match,
        currentPlayer,
        (gameConfig) => {
          console.log('🏆 Starting next match with config:', gameConfig);
          // Reload to start fresh game
          sessionStorage.setItem('ft_pong_starting_tournament_match', JSON.stringify(gameConfig));
          window.location.reload();
        }
      );
    } catch (error) {
      console.error('❌ Failed to start next match:', error);
      window.location.reload();
    }
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
    console.log("🏆 Playing WIN sound");
    const s = this.sounds.win[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    
    if (ready) {
      // Stop any currently playing sound first to prevent overlap
      try {
        if ((s as any).isPlaying || (s as any)._isPlaying) {
          s.stop();
          console.log("🛑 Stopped existing WIN sound to prevent loop");
        }
      } catch (e) {
        console.log("⚠️ Could not stop existing sound:", e);
      }
      
      // Ensure sound doesn't loop
      (s as any).loop = false;
      (s as any).setPlaybackRate?.(1);
      
      // Play the sound once
      s.play();
      console.log("🎵 WIN sound started playing (no loop)");
      
      // Automatically stop after expected duration to prevent hanging
      setTimeout(() => {
        try {
          if (s.isPlaying) {
            s.stop();
            console.log("� Auto-stopped WIN sound after timeout");
          }
        } catch (e) {
          console.log("⚠️ Could not auto-stop sound:", e);
        }
      }, 5000); // 5 second safety timeout
      
    } else {
      console.log("🔊 WIN sound not ready, using fallback beeps");
      // little triumphant beep fallback
      this.beepFallback(600, 120, 0.06);
      setTimeout(() => this.beepFallback(900, 160, 0.06), 130);
    }
  }

  private playLose() {
    console.log("💔 Playing LOSE sound");
    const s = this.sounds.lose[0];
    const ready =
      s && ((s as any).isReadyToPlay === true || (s as any).isReady?.());
    
    if (ready) {
      // Stop any currently playing sound first to prevent overlap
      try {
        if ((s as any).isPlaying || (s as any)._isPlaying) {
          s.stop();
          console.log("🛑 Stopped existing LOSE sound to prevent loop");
        }
      } catch (e) {
        console.log("⚠️ Could not stop existing sound:", e);
      }
      
      // Ensure sound doesn't loop
      (s as any).loop = false;
      (s as any).setPlaybackRate?.(1);
      
      // Play the sound once
      s.play();
      console.log("🎵 LOSE sound started playing (no loop)");
      
      // Automatically stop after expected duration to prevent hanging
      setTimeout(() => {
        try {
          if (s.isPlaying) {
            s.stop();
            console.log("� Auto-stopped LOSE sound after timeout");
          }
        } catch (e) {
          console.log("⚠️ Could not auto-stop sound:", e);
        }
      }, 5000); // 5 second safety timeout
      
    } else {
      console.log("🔊 LOSE sound not ready, using fallback beeps");
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
    if (this.config.connection === "remoteGuest") return [1]; // guest controls paddle 1 (right side)
    if (this.config.connection === "remote4Host") return [0];
    if (this.config.connection === "remote4Guest") return [1]; // 4P guest controls paddle 1
    if (this.config.connection === "ai3") return [0];
    return [0];
  }

  // Note: handleWindowClose removed - use ESC key to exit game gracefully with custom dialog

  private handleVisibilityChange() {
    // Pause the game when the tab becomes hidden in multiplayer
    if (document.hidden && (this.isHost || this.isGuest) && this.gameState.matchReady && !this.gameState.isPaused) {
      console.log("📱 Tab hidden, auto-pausing multiplayer game");
      this.togglePause();
    }
  }

  private async reportGameInterruption() {
    try {
      // If this is a host, determine winner based on current scores
      if (this.isHost && this.gameState.matchReady) {
        const scores = [...this.gameState.scores];
        let winnerIdx = -1;
        
        // Determine winner by highest score, or -1 if tie
        if (scores.length >= 2) {
          if (scores[0] > scores[1]) {
            winnerIdx = 0;
          } else if (scores[1] > scores[0]) {
            winnerIdx = 1;
          }
          // If tie, no winner (-1)
        }

        // Tournament support removed - now handle match results if needed
        if (this.config.matchId && winnerIdx >= 0) {
          const winnerUserId = this.config.currentUser?.id || null;
          await ApiClient.postMatchResult({
            matchId: this.config.matchId,
            winnerUserId,
            scores,
          });
          
          console.log("🎮 Match results reported due to game interruption");
        }

        // Notify other players that game ended due to disconnection
        if (socketManager.connected || this.ws) {
          const gameEndData = {
            gameEnd: true,
            interrupted: true,
            winnerIdx: winnerIdx >= 0 ? winnerIdx : null,
            winnerName: winnerIdx >= 0 ? this.getPlayerName(winnerIdx) : null,
            reason: "Player disconnected",
            finalScores: scores,
            displayNames: [...(this.config.displayNames || [])]
          };
          
          if (socketManager.connected) {
            socketManager.sendGameState(gameEndData);
          } else if (this.ws) {
            this.sendRemoteMessage({
              t: "gameEnd",
              ...gameEndData
            } as any);
          }
        }
      }
      
      // Clean up connections
      if (socketManager.connected) {
        socketManager.leaveRoom();
      }
      if (this.ws) {
        this.ws.close();
      }
      
    } catch (error) {
      console.error("❌ Error reporting game interruption:", error);
    }
  }

  private handleGameEndAudio(winnerIdx: number) {
    // Prevent multiple audio calls within a short time frame (debounce)
    const now = Date.now();
    if (now - this.lastGameEndAudioTime < 1000) {
      console.log("🔇 Game end audio debounced - too soon since last call");
      return;
    }
    this.lastGameEndAudioTime = now;

    const locals = this.getLocalControlledIndices();
    const isLocalWinner = locals.includes(winnerIdx);

    console.log(`🔊 Playing game end audio - isLocalWinner: ${isLocalWinner}, winnerIdx: ${winnerIdx}, locals: ${locals}`);

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
