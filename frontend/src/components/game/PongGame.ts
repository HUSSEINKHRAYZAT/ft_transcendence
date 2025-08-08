// pong3d.ts

import * as THREE from 'three';
import { TournamentManager } from './TournamentManager';

// Game configuration types
enum GameMode { Simple = 'simple', Tournament = 'tournament' }
enum PlayerConnection { Local = 'local', Remote = 'remote', AI = 'ai' }
type PlayerCount = 2 | 4;
interface GameConfig {
  mode: GameMode;
  playerCount: PlayerCount;
  connection: PlayerConnection;
}

class Pong3D {
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private planeWidth!: number;
  private planeHeight!: number;

  private ball!: THREE.Mesh;
  private ballVelocity = new THREE.Vector3();

  private paddles: THREE.Mesh[] = [];
  private obstacles: THREE.Mesh[] = [];
  private keys: Record<string, boolean> = {};

  private scoreLeft    = 0;
  private scoreRight   = 0;
  private scoreTop     = 0;
  private scoreBottom  = 0;
  private scoreElemLeft!: HTMLSpanElement;
  private scoreElemRight!: HTMLSpanElement;
  private scoreElemTop!: HTMLSpanElement;
  private scoreElemBottom!: HTMLSpanElement;

  constructor(private config: GameConfig, private tm?: TournamentManager) {
    // Camera & Renderer setup
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth/window.innerHeight, 0.1, 1000);
    this.camera.position.set(0,25,20);
    this.camera.lookAt(0,0,0);

    const canvas = document.getElementById("gameCanvas") as HTMLCanvasElement;
    Object.assign(canvas.style, { width:"100vw", height:"100vh", position:"fixed", top:"0", left:"0", display:"block" });
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias:true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);

    // Input
    window.addEventListener("keydown", e => this.keys[e.key.toLowerCase()] = true);
    window.addEventListener("keyup",   e => this.keys[e.key.toLowerCase()] = false);

    this.createScoreUI();
  }

  private createScoreUI() {
    const c = document.createElement("div");
    Object.assign(c.style, {
      position:"absolute", top:"20px", left:"50%", transform:"translateX(-50%)",
      color:"#fff", fontFamily:"sans-serif", fontSize:"24px", zIndex:"10"
    });
    this.scoreElemLeft   = document.createElement("span");
    this.scoreElemRight  = document.createElement("span");
    this.scoreElemTop    = document.createElement("span");
    this.scoreElemBottom = document.createElement("span");
    const sep = () => { const s = document.createElement("span"); s.textContent = " | "; return s; };

    this.scoreElemLeft.textContent   = "0";
    this.scoreElemRight.textContent  = "0";
    this.scoreElemTop.textContent    = "0";
    this.scoreElemBottom.textContent = "0";

    c.append(
      document.createTextNode("L "), this.scoreElemLeft, sep(),
      document.createTextNode("R "), this.scoreElemRight, sep(),
      document.createTextNode("T "), this.scoreElemTop, sep(),
      document.createTextNode("B "), this.scoreElemBottom
    );
    document.body.appendChild(c);
  }

  init() {
    this.planeWidth  = this.config.playerCount === 4 ? 20 : 20;
    this.planeHeight = this.config.playerCount === 4 ? 20 : 10;
    this.initLights();
    this.initField();
    this.initBall();
    this.initPaddles();
    this.spawnObstacles();
    // initial serve: random X/Z direction
    const dirX = Math.random() < 0.5 ?  1 : -1;
    const dirZ = Math.random() < 0.5 ?  1 : -1;
    this.resetBall(dirX, dirZ);
  }

  private initLights() {
    this.scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const dl = new THREE.DirectionalLight(0xffffff, 0.8);
    dl.position.set(0,20,10);
    this.scene.add(dl);
  }

  private initField() {
    // playfield
    const field = new THREE.Mesh(
      new THREE.PlaneGeometry(this.planeWidth, this.planeHeight),
      new THREE.MeshStandardMaterial({ color:0x444444 })
    );
    field.rotation.x = -Math.PI/2;
    this.scene.add(field);
    // walls
    const wallMat = new THREE.MeshStandardMaterial({ color:0x884422 });
    const t = 0.1, h = 1;
    const cw = (w:number,d:number,x:number,z:number) => {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), wallMat);
      m.position.set(x,h/2,z);
      this.scene.add(m);
    };
    cw(this.planeWidth + t, t,  0,  this.planeHeight/2 + t/2);  // top
    cw(this.planeWidth + t, t,  0, -this.planeHeight/2 - t/2);  // bottom
    cw(t, this.planeHeight + t, -this.planeWidth/2 - t/2, 0);   // left
    cw(t, this.planeHeight + t,  this.planeWidth/2 + t/2, 0);   // right
  }

  private initBall() {
    const geom = new THREE.SphereGeometry(0.3,16,16);
    const mat = new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load("textures/1954-mondial-ball.jpg")
    });
    this.ball = new THREE.Mesh(geom, mat);
    this.ball.position.set(0,0.3,0);
    this.scene.add(this.ball);
  }

  private initPaddles() {
    const geom = new THREE.BoxGeometry(0.06,1,2);
    const mat  = new THREE.MeshStandardMaterial({ color:0x00ffaa });
    const d = this.planeWidth/2 - 0.03;
    const add = (x:number,z:number,rotY=0) => {
      const m = new THREE.Mesh(geom,mat);
      m.position.set(x,0.5,z);
      m.rotation.y = rotY;
      this.scene.add(m);
      this.paddles.push(m);
    };
    if (this.config.playerCount === 4) {
      add(-d,0); add(d,0);
      add(0,-d,Math.PI/2); add(0,d,Math.PI/2);
    } else {
      add(-d,0); add(d,0);
    }
  }

  private spawnObstacles() {
    const num = Math.floor(Math.random()*10);
    const size = 0.5, r = size/2, h = 1;
    const mat = new THREE.MeshStandardMaterial({ color:0x222200 });
    const halfW = this.planeWidth/3, halfH = this.planeHeight/3;
    const minSpacing = 2, maxA=20;

    for (let i=0;i<num;i++) {
      let x,z,ok=false,a=0;
      do {
        x = (Math.random()*2-1)*halfW;
        z = (Math.random()*2-1)*halfH;
        ok = this.obstacles.every(o => {
          const dx = o.position.x-x, dz = o.position.z-z;
          return Math.hypot(dx,dz) > minSpacing;
        });
        a++;
      } while(!ok && a<maxA);
      if (!ok) continue;

      const geom = new THREE.CylinderGeometry(r,r,h,16);
      const m = new THREE.Mesh(geom,mat);
      m.position.set(x,h/2,z);
      this.scene.add(m);
      this.obstacles.push(m);
    }
  }

  private resetBall(dirX:number, dirZ:number) {
    this.ball.position.set(0,0.3,0);
    const angle = (Math.random()*Math.PI/4) - Math.PI/8;
    const speed = 0.15;
    this.ballVelocity.set(
      speed * dirX * Math.cos(angle),
      0.07 + Math.random()*0.05,
      speed * dirZ * Math.sin(angle)
    );
  }

  private updateScoreUI() {
    this.scoreElemLeft.textContent   = this.scoreLeft.toString();
    this.scoreElemRight.textContent  = this.scoreRight.toString();
    this.scoreElemTop.textContent    = this.scoreTop.toString();
    this.scoreElemBottom.textContent = this.scoreBottom.toString();
  }

  animate = () => {
    requestAnimationFrame(this.animate);
    const speed = 0.2;

    // — PLAYER INPUT or AI —
    if (this.config.playerCount === 4) {
      const [p1,p2,p3,p4] = this.paddles;
      if (this.keys["s"]) p1.position.z += speed;
      if (this.keys["w"]) p1.position.z -= speed;
      if (this.keys["arrowdown"]) p2.position.z += speed;
      if (this.keys["arrowup"])   p2.position.z -= speed;
      if (this.keys["k"]) p3.position.x += speed;
      if (this.keys["i"]) p3.position.x -= speed;
      if (this.keys["n"]) p4.position.x += speed;
      if (this.keys["y"]) p4.position.x -= speed;
      [p1,p2].forEach(p => {
        p.position.z = THREE.MathUtils.clamp(p.position.z, -this.planeHeight/2+1.5, this.planeHeight/2-1.5);
      });
      [p3,p4].forEach(p => {
        p.position.x = THREE.MathUtils.clamp(p.position.x, -this.planeWidth/2+1.5, this.planeWidth/2-1.5);
      });
    } else {
      const [p1,p2] = this.paddles;
      if (this.keys["s"]) p1.position.z += speed;
      if (this.keys["w"]) p1.position.z -= speed;

      if (this.config.connection === "ai") {
        // smooth AI
        const tZ = this.ball.position.z;
        const f = 0.1, a = 0.8;
        p2.position.z = THREE.MathUtils.lerp(p2.position.z, tZ, f*a);
      } else {
        if (this.keys["arrowdown"]) p2.position.z += speed;
        if (this.keys["arrowup"])   p2.position.z -= speed;
      }
      const limZ = this.planeHeight/2 - 1;
      p1.position.z = THREE.MathUtils.clamp(p1.position.z, -limZ, limZ);
      p2.position.z = THREE.MathUtils.clamp(p2.position.z, -limZ, limZ);
    }

    // — physics —
    this.ballVelocity.y -= 0.006;                    // gravity
    this.ballVelocity.x *= 0.999; this.ballVelocity.z *= 0.999;  // friction
    this.ball.position.add(this.ballVelocity);

    // ground bounce
    if (this.ball.position.y < 0.3) {
      this.ball.position.y = 0.3;
      this.ballVelocity.y *= -0.6;
    }
    // top/bottom wall bounce (Z)
    const halfH = this.planeHeight/2 - 0.5;
    if (Math.abs(this.ball.position.z) > halfH) {
      this.ballVelocity.z *= -1;
    }
    // cap speed
    const maxSp = 0.4;
    if (this.ballVelocity.length() > maxSp) this.ballVelocity.setLength(maxSp);

    // — paddle collisions (random bounce) —
    const halfW = this.planeWidth/2 - 0.5;
    this.paddles.forEach(p => {
      const dx = Math.abs(this.ball.position.x - p.position.x);
      const dz = Math.abs(this.ball.position.z - p.position.z);
      if (dx < 0.6 && dz < 1.2) {
        const sp = this.ballVelocity.length();
        const ang = Math.random()*2*Math.PI;
        this.ballVelocity.x = sp * Math.cos(ang);
        this.ballVelocity.z = sp * Math.sin(ang);
        this.ballVelocity.multiplyScalar(1.05);
        // clamp back inside field
        this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, -halfW, halfW);
        this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -halfH, halfH);
      }
    });

    // — obstacle collisions (random bounce) —
    this.obstacles.forEach(o => {
      if (this.ball.position.distanceTo(o.position) < 0.7) {
        const sp = this.ballVelocity.length();
        const ang = Math.random()*2*Math.PI;
        this.ballVelocity.x = sp * Math.cos(ang);
        this.ballVelocity.z = sp * Math.sin(ang);
        this.ball.position.x = THREE.MathUtils.clamp(this.ball.position.x, -halfW, halfW);
        this.ball.position.z = THREE.MathUtils.clamp(this.ball.position.z, -halfH, halfH);
      }
    });

    // — scoring & reset —
    if      (this.ball.position.x >  halfW) { this.scoreLeft++;   this.resetBall(-1,  0); }
    else if (this.ball.position.x < -halfW) { this.scoreRight++;  this.resetBall( 1,  0); }
    else if (this.config.playerCount===4 && this.ball.position.z >  halfH) {
      this.scoreBottom++; this.resetBall( 0, -1);
    }
    else if (this.config.playerCount===4 && this.ball.position.z < -halfH) {
      this.scoreTop++;    this.resetBall( 0,  1);
    }
    this.updateScoreUI();

    this.renderer.render(this.scene, this.camera);
  };
}

// Menu for configuration
class Menu {
  static render(): Promise<GameConfig> {
    return new Promise(res => {
      const o = document.createElement('div');
      Object.assign(o.style, {
        position:'fixed',top:'0',left:'0',width:'100%',height:'100%',
        background:'rgba(0,0,0,0.8)',color:'#fff',display:'flex',
        flexDirection:'column',alignItems:'center',justifyContent:'center',zIndex:'1000'
      });
      o.innerHTML = `
        <h1>3D Pong Setup</h1>
        <div id="s1"><button data-m="simple">Simple</button><button data-m="tournament">Tournament</button></div>
        <div id="s2" style="display:none"><button data-p="2">2P</button><button data-p="4">4P</button></div>
        <div id="s3" style="display:none"><button data-c="local">Local</button><button data-c="remote">Remote</button><button data-c="ai">AI</button></div>
      `;
      document.body.appendChild(o);
      const cfg:Partial<GameConfig> = {};
      const s1=o.querySelector('#s1')!, s2=o.querySelector('#s2')!, s3=o.querySelector('#s3')!;
      s1.querySelectorAll('button').forEach(b=>{
        b.addEventListener('click',()=>{
          cfg.mode = b.getAttribute('data-m') as GameMode;
          s1.style.display='none'; s2.style.display='block';
        });
      });
      s2.querySelectorAll('button').forEach(b=>{
        b.addEventListener('click',()=>{
          cfg.playerCount = parseInt(b.getAttribute('data-p')!) as PlayerCount;
          s2.style.display='none';
          if(cfg.playerCount>2){ cfg.connection='local'; o.remove(); res(cfg as GameConfig); }
          else { s3.style.display='block'; }
        });
      });
      s3.querySelectorAll('button').forEach(b=>{
        b.addEventListener('click',()=>{
          cfg.connection = b.getAttribute('data-c') as PlayerConnection;
          o.remove(); res(cfg as GameConfig);
        });
      });
    });
  }
}

// Start everything
window.addEventListener('load', async ()=>{
  const config = await Menu.render();
  const tm     = new TournamentManager();
  if(config.mode==='tournament'){
    await tm.collectAliases(config.playerCount);
    tm.displayCurrentMatch();
  }
  const game = new Pong3D(config, tm);
  game.init();
  game.animate();
});


// At the end of your PongGame.ts file, add:
export { Pong3D };
