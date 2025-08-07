// src/main.ts
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

type Connection = "local" | "ai";
type PlayerCount = 2 | 4;
interface GameConfig {
  playerCount: PlayerCount;
  connection: Connection;
}

class Pong3D {
  private engine: Engine;
  private scene: Scene;
  private camera: ArcRotateCamera;

  private ball!: import("@babylonjs/core").Mesh;
  private ballVelocity = new Vector3();

  private paddles: import("@babylonjs/core").Mesh[] = [];
  private keys: Record<string, boolean> = {};

  private scoreLeft = 0;
  private scoreRight = 0;
  private scoreElemLeft!: HTMLSpanElement;
  private scoreElemRight!: HTMLSpanElement;

  // Gradual speed ramp
  private speedIncrement = 1.0005;

  constructor(private config: GameConfig) {
    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    this.engine = new Engine(canvas, true);
    this.scene  = new Scene(this.engine);
    this.scene.clearColor = new Color4(0.1, 0.1, 0.3, 1);

    // Fixed overhead camera
    this.camera = new ArcRotateCamera(
      "cam",
      Math.PI/2,      // alpha
      Math.PI/5,      // beta (more top-down)
      25,             // radius
      Vector3.Zero(),
      this.scene
    );
    this.camera.attachControl(canvas, true);
    // disable user rotation/zoom
    this.camera.inputs.removeByType("ArcRotateCameraPointersInput");
    this.camera.inputs.removeByType("ArcRotateCameraMouseWheelInput");
    this.camera.inputs.removeByType("ArcRotateCameraKeyboardMoveInput");

    // keyboard
    window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup",   e => this.keys[e.key.toLowerCase()] = false);

    this.createScoreUI();
    this.init();
  }

  private createScoreUI() {
    const c = document.createElement("div");
    Object.assign(c.style, {
      position: "absolute", top: "20px", left: "50%",
      transform: "translateX(-50%)",
      color: "#fff", fontFamily: "sans-serif", fontSize: "24px", zIndex: "10"
    });
    this.scoreElemLeft  = document.createElement("span");
    this.scoreElemRight = document.createElement("span");
    this.scoreElemLeft.textContent  = "0";
    this.scoreElemRight.textContent = "0";
    const sep = () => { const s = document.createElement("span"); s.textContent = "  |  "; return s; };
    c.append(
      document.createTextNode("L "), this.scoreElemLeft, sep(),
      document.createTextNode("R "), this.scoreElemRight
    );
    document.body.appendChild(c);
  }

  private init() {
    // square field if 4 players, otherwise 20×10
    const width  = 20;
    const height = this.config.playerCount === 4 ? 20 : 10;

    // lights
    new HemisphericLight("hemi", new Vector3(0,1,0), this.scene);
    const dir = new DirectionalLight("dir", new Vector3(0,-1,1), this.scene);
    dir.intensity = 0.8;

    // ground
    const fieldMat = new StandardMaterial("fieldMat", this.scene);
    fieldMat.diffuseColor = new Color3(0.266,0.266,0.266);
    const field = MeshBuilder.CreateGround("field", { width, height }, this.scene);
    field.material = fieldMat;

    // walls
    const wallMat = new StandardMaterial("wallMat", this.scene);
    wallMat.diffuseColor = new Color3(0.533,0.259,0.133);
    const t = 0.1, h = 1;
    const makeWall = (w:number, d:number, x:number, z:number, id:string) => {
      const m = MeshBuilder.CreateBox(id, { width: w, height: h, depth: d }, this.scene);
      m.position.set(x, h/2, z);
      m.material = wallMat;
    };
    makeWall(width + t, t,   0,  height/2 + t/2, "wallTop");
    makeWall(width + t, t,   0, -height/2 - t/2, "wallBottom");
    makeWall(t, height + t, -width/2 - t/2, 0, "wallLeft");
    makeWall(t, height + t,  width/2 + t/2, 0, "wallRight");

    // ball
    const ballMat = new StandardMaterial("ballMat", this.scene);
    ballMat.diffuseTexture = new Texture("textures/1954-mondial-ball.jpg", this.scene);
    this.ball = MeshBuilder.CreateSphere("ball", { diameter:0.6, segments:16 }, this.scene);
    this.ball.material = ballMat;
    this.ball.position = new Vector3(0,0.3,0);

    // paddles
    const dAxis = (this.config.playerCount === 4 ? height : width)/2 - 0.3;
    const makePaddle = (x:number, z:number, rotY:number, idx:number) => {
      const p = MeshBuilder.CreateBox(
        `paddle${idx}`,
        { width: 0.2, height: 1, depth: 2 },
        this.scene
      );
      p.position.set(x, 0.5, z);
      p.rotation.y = rotY;
      const mat = new StandardMaterial(`paddleMat${idx}`, this.scene);
      mat.diffuseColor = new Color3(0,1,0.667);
      p.material = mat;
      this.paddles.push(p);
    };

    if (this.config.playerCount === 4) {
      makePaddle(-dAxis, 0,      0,       0); // left
      makePaddle( dAxis, 0,      0,       1); // right
      makePaddle( 0,    -dAxis,  Math.PI/2,2); // bottom
      makePaddle( 0,     dAxis,  Math.PI/2,3); // top
    } else {
      makePaddle(-dAxis, 0, 0, 0);
      makePaddle( dAxis, 0, 0, 1);
    }

    // initial serve
    this.resetBall();

    // game loop
    this.engine.runRenderLoop(() => {
      this.update(width, height);
      this.scene.render();
    });

    window.addEventListener("resize", () => this.engine.resize());
  }

  private resetBall(dirX = Math.random() < 0.5 ? 1 : -1) {
    this.ball.position.set(0,0.3,0);
    const angle = (Math.random()*Math.PI/4) - Math.PI/8;
    const speed = 0.15;
    this.ballVelocity = new Vector3(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random()*0.05,
      speed * Math.sin(angle)
    );
  }

  private update(width:number, height:number) {
    const speed = 0.2;
    const [p1, p2, p3, p4] = this.paddles;

    // — PLAYER or AI INPUT —
    if (this.config.playerCount === 4) {
      // 4-player local only
      if (this.keys["arrowup"]) p1.position.z -= speed;
      if (this.keys["arrowdown"]) p1.position.z += speed;

      if (this.keys["w"])   p2.position.z -= speed;
      if (this.keys["s"]) p2.position.z += speed;

      if (this.keys["o"]) p3.position.x -= speed;
      if (this.keys["i"]) p3.position.x += speed;

      if (this.keys["n"]) p4.position.x += speed;
      if (this.keys["m"]) p4.position.x -= speed;
    } else {
      // 2-player or vs-AI
      // left = arrows
      if (this.keys["arrowup"])   p1.position.z -= speed;
      if (this.keys["arrowdown"]) p1.position.z += speed;
      // right = local W/S or AI
      if (this.config.connection === "ai") {
        // simple AI lerp
        p2.position.z = Vector3.Lerp(
          p2.position, new Vector3(0,0,this.ball.position.z), 0.08
        ).z;
      } else {
        if (this.keys["w"]) p2.position.z -= speed;
        if (this.keys["s"]) p2.position.z += speed;
      }
    }

    // clamp paddles in their axis
    const lim = (this.config.playerCount === 4 ? height : height)/2 - 1;
    this.paddles.forEach((p, idx) => {
      if (idx < 2) {
        // left/right move on Z
        p.position.z = Math.min(Math.max(p.position.z, -lim), lim);
      } else {
        // top/bottom move on X
        p.position.x = Math.min(Math.max(p.position.x, -lim), lim);
      }
    });

    // — SPEED RAMP & BASIC PHYSICS —
    this.ballVelocity.scaleInPlace(this.speedIncrement);
    this.ballVelocity.y -= 0.006;
    this.ball.position.addInPlace(this.ballVelocity);

    // bounce floor
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }
    // bounce top/bottom walls (Z)
    if (Math.abs(this.ball.position.z) > lim + 0.5) {
      this.ballVelocity.z *= -1;
    }

    // — PADDLE COLLISIONS (precise) —
    const ballR  = 0.6/2;
    const padW2  = 0.2/2, padD2 = 2.0/2;
    const xThr   = padW2 + ballR, zThr = padD2 + ballR;
    const halfW  = width/2 - ballR;

    this.paddles.forEach((p, idx) => {
      const dx = this.ball.position.x - p.position.x;
      const dz = this.ball.position.z - p.position.z;
      if (Math.abs(dz) < zThr && Math.abs(dx) < xThr) {
        const movingIn = 
          (idx === 0 && this.ballVelocity.x < 0) ||
          (idx === 1 && this.ballVelocity.x > 0);
        if (movingIn) {
          // bounce + speed boost
          this.ballVelocity.x = -this.ballVelocity.x * 1.05;
          // snap to contact
          const sign = idx < 2 ? (idx===0?+1:-1) : (idx===2?+1:-1);
          this.ball.position.x = p.position.x + sign * xThr;
          // flash red
          const mat = p.material as StandardMaterial;
          mat.diffuseColor = new Color3(1,0,0);
          setTimeout(() => mat.diffuseColor = new Color3(0,1,0.667), 100);
        }
      }
    });

    // — SCORING & RESET —
    if      (this.ball.position.x > halfW) { this.scoreLeft++;  this.resetBall(-1); }
    else if (this.ball.position.x < -halfW){ this.scoreRight++; this.resetBall( 1); }
    this.scoreElemLeft.textContent  = this.scoreRight.toString();
    this.scoreElemRight.textContent = this.scoreLeft.toString();
  }
}

// — BOOTSTRAP WITH USER CHOICE —
window.addEventListener("load", () => {
  const choice = prompt(
    "Choose mode:\n" +
    "  4 →  4-player local\n" +
    "  ai → 1-player vs AI\n" +
    "  (anything else) → 2-player local",
    "ai"
  ) || "";
  let config: GameConfig;
  if (choice.trim() === "4") {
    config = { playerCount: 4, connection: "local" };
  } else if (choice.trim().toLowerCase() === "ai") {
    config = { playerCount: 2, connection: "ai" };
  } else {
    config = { playerCount: 2, connection: "local" };
  }
  new Pong3D(config);
});
