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
import { SHAPES, SHAPE_WEIGHTS } from "../config/constants";
import { themeBridge, type GameThemeColors } from "../utils/ThemeBridge";
import { GameChat } from "../ui/GameChat";
import { socketManager } from "../../services/SocketManager";
import { GameCountdown } from "../ui/GameCountdown";
import { CameraConfig } from "../config/camconfig";
import * as Frontend from "./Pong3D.frontend";






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

  // Chat system
  private gameChat: GameChat | null = null;

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
      this.gameState.matchReady = this.requiredGuests === 0;
      this.showWaitingOverlay(`Waiting for players… 0/${this.requiredGuests}`);
      this.remoteIndex = 0; // host is index 0 (Left)
      this.setViewRotationForIndex(0);
    } else if (this.isGuest) {
      this.gameState.matchReady = false;
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
  Frontend.createScoreUI(this);
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
        this.gameState.matchReady = true;
        this.resetBall(Math.random() < 0.5 ? 1 : -1);
      },
    });

    await countdown.start();
  }

  private async beginMatch() {
    this.hideWaitingOverlay();

    // For multiplayer games, show countdown and then start
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
        this.gameState.setControl(["human", "ai", "ai", "ai"]);
        this.applyAIDifficulty([1, 2, 3], 10);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remote4Host") {
        this.gameState.setControl(["human", "remoteGuest", "remoteGuest", "remoteGuest"]);
        this.setViewRotationForIndex(0);
      } else if (this.config.connection === "remote4Guest") {
        this.gameState.setControl(["human", "human", "human", "human"]); // render only; your input is sent to host
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
        this.gameState.setControl(["human", "human"]); // render only
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
      if (this.isGuest && !this.gameState.matchReady) {
        this.gameState.matchReady = true;
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

    this.gameState.setScores(stateMsg.scores);
    this.updateScoreUI();

    if (!this.gameState.matchReady) {
      this.gameState.matchReady = true;
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
          if (this.connectedGuests >= this.requiredGuests && !this.gameState.matchReady) {
            this.beginMatch(); // Fire and forget for WebSocket flow
          }
          return;
        }

        if (msg.t === "assign" && this.isGuest) {
          this.remoteIndex = (msg.idx as 0 | 1 | 2 | 3) ?? 1;
          // Always rotate so *your* paddle is on the left
          this.setViewRotationForIndex(this.remoteIndex);
          if (!this.gameState.matchReady) this.updateWaitingOverlay("Waiting for start…");
          return;
        }

        if (msg.t === "start" && this.isGuest) {
          if (!this.gameState.matchReady) {
            this.gameState.matchReady = true;
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
      scores: [...this.gameState.scores],
      obstacles: this.obstacleInfo.map((o) => ({ ...o })), // includes shape
    };
    this.sendRemoteMessage(msg);
  }

  /* ---------------- Tick ---------------- */

  private update(width: number, height: number) {
    const now = performance.now();
    if (!this.gameState.matchReady) {
      if (this.isHost) this.broadcastState(now);
      return;
    }

    const move = 0.2;
    const [p1, p2, p3] = this.paddles;

    // Arrow-only control for local/host
    // L/R paddles use Up/Down for Z. Bottom uses Left/Right for X. Top uses Right/Left mirrored.
    if (this.config.playerCount === 4) {
      // Left (host or local)
      if (this.gameState.control[0] === "human") {
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
        if (this.gameState.control[2] === "human") {
          if (this.keys["arrowleft"]) p3.position.x -= move;
          if (this.keys["arrowright"]) p3.position.x += move;
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
    this.ballVelocity.y -= 0.008;
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
        this.gameState.lastHitter = idx;
        this.gameState.touchedOnce = true;
        this.gameState.obstacleAfterHit = false;
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
        this.gameState.lastHitter = idx;
        this.gameState.touchedOnce = true;
        this.gameState.obstacleAfterHit = false;
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

          // Add chat notification for scoring
          if (this.gameChat) {
            const playerName = this.getPlayerName(this.gameState.lastHitter);
            this.gameChat.addSystemMessage(
              `🎯 ${playerName} scores! Current score: ${
                this.gameState.scores[this.gameState.lastHitter]
              }`
            );
          }

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
        if (this.gameState.touchedOnce) {
          applyPenaltyIfNeeded(1);
          this.gameState.addScore(1);
          this.gameState.lastScorer = 1;
          // Add damage to right wall where ball hit
          this.addWallDamage(
            "right",
            this.ball.position.x,
            this.ball.position.z
          );
          this.updateScoreUI();
          const winResult = this.gameState.isWinConditionMet();
          if (winResult.hasWinner) {
            this.finishAndReport(winResult.winner);
            return;
          }
        }
        this.resetBall(-1);
      } else if (this.ball.position.x < -halfW) {
        if (this.gameState.touchedOnce) {
          applyPenaltyIfNeeded(0);
          this.gameState.addScore(0);
          this.gameState.lastScorer = 0;
          // Add damage to left wall where ball hit
          this.addWallDamage(
            "left",
            this.ball.position.x,
            this.ball.position.z
          );
          this.updateScoreUI();
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
    this.gameState.isPaused = !this.gameState.isPaused;

    if (this.gameState.isPaused) {
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
    this.endAndToast(text);

    // Add chat notification for game end
    if (this.gameChat) {
      const winnerName = this.getPlayerName(winnerIdx);
      this.gameChat.addSystemMessage(
        `🏆 Game Over! ${winnerName} wins the match!`
      );
      this.gameChat.addSystemMessage(
        `Final Score: ${this.gameState.scores
          .slice(0, this.config.playerCount === 4 ? 4 : 2)
          .join(" - ")}`
      );
    }

    // Play correct win/lose cue from local perspective
    this.handleGameEndAudio(winnerIdx);

    // Post to DB if this is an online match or tournament. Host does the reporting.
    if (this.isHost) {
      const scores = [...this.gameState.scores];
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
  Frontend.endAndToast(this, text);
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
