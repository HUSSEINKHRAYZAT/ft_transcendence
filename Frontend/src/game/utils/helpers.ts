import {
  Animation,
  Color3,
  FresnelParameters,
  EasingFunction,
  ExponentialEase,
  Scene,
  StandardMaterial,
  Vector3,
  AbstractMesh,
} from "@babylonjs/core";
import type { RemoteMsgShort as RemoteMsg } from "../../types";
// Example Color3 and Vector3 for reference (used for type checking)
// let c: Color3 = new Color3(1, 0, 0);
// let v: Vector3 = new Vector3(0, 1, 0);

// math
export function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}
export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
export function safeParse<T>(x: any): T | null {
  try {
    return JSON.parse(x) as T;
  } catch {
    return null;
  }
}

// velocity helpers
export function clampHorizontal(v: Vector3, maxH: number) {
  const h = Math.hypot(v.x, v.z);
  if (h > maxH) {
    const s = maxH / h;
    v.x *= s;
    v.z *= s;
  }
}
export function ensureMinHorizontalSpeed(v: Vector3, minH: number) {
  const h = Math.hypot(v.x, v.z);
  if (h < minH) {
    const s = (minH + 1e-6) / (h + 1e-6);
    v.x *= s;
    v.z *= s;
  }
}

// materials & visuals
export function shinyMat(
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
  m.emissiveFresnelParameters = f;

  return m;
}

export function randColor() {
  const palette = [
    new Color3(0.9, 0.4, 0.4),
    new Color3(0.4, 0.9, 0.6),
    new Color3(0.4, 0.7, 0.95),
    new Color3(0.95, 0.85, 0.4),
    new Color3(0.8, 0.5, 0.9),
  ];
  return palette[(Math.random() * palette.length) | 0];
}

export function pickWeighted<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    if ((r -= weights[i]) <= 0) return items[i];
  }
  return items[items.length - 1];
}

function animateEaseOut<T extends Color3 | Vector3 | number>(
  target: any,
  property: string,
  from: T,
  to: T,
  durationMs: number,
  easing: EasingFunction = new ExponentialEase()
) {
  const scene = target.getScene ? target.getScene() : target._scene;
  if (!scene) return;

  const fps = 60;
  const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

  let type: number;
  if (from instanceof Color3) {
    type = Animation.ANIMATIONTYPE_COLOR3;
  } else if (from instanceof Vector3) {
    type = Animation.ANIMATIONTYPE_VECTOR3;
  } else {
    type = Animation.ANIMATIONTYPE_FLOAT;
  }

  const anim = new Animation(
    `${property}-easeOut`,
    property,
    fps,
    type,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  anim.setEasingFunction(easing);

  anim.setKeys([
    { frame: 0, value: from },
    { frame: totalFrames, value: to },
  ]);

  scene.stopAnimation(target);

  return scene.beginDirectAnimation(target, [anim], 0, totalFrames, false, 1.0);
}


/** Smooth flash across ALL faces, easing the emissive back down. */
export function flashPaddle(
  p: AbstractMesh,
  color = new Color3(0.53, 0.81, 0.92),
  ms = 120
) {
  const mat = p.material as StandardMaterial;
  if (!mat) return;

  mat.metadata ||= {};
  if (mat.metadata.flashTimeout) {
    clearTimeout(mat.metadata.flashTimeout);
    mat.metadata.flashTimeout = null;
  }
  mat.metadata.flashVer = (mat.metadata.flashVer ?? 0) + 1;
  const ver = mat.metadata.flashVer;

  const prevEmissive = mat.emissiveColor.clone();
  const prevBackFaceCulling = mat.backFaceCulling;
  const prevDisableLighting = mat.disableLighting;
  const prevSpec = mat.specularColor?.clone();

  mat.backFaceCulling = false;
  mat.disableLighting = true;
  if (mat.specularColor) mat.specularColor.set(0, 0, 0);

  mat.emissiveColor.set(color.r, color.g, color.b);
  animateEaseOut<Color3>(mat, "emissiveColor", color.clone(), prevEmissive, ms);

  mat.metadata.flashTimeout = setTimeout(() => {
    if (mat.metadata && mat.metadata.flashVer === ver) {
      mat.backFaceCulling = prevBackFaceCulling;
      mat.disableLighting = prevDisableLighting;
      if (prevSpec) mat.specularColor.set(prevSpec.r, prevSpec.g, prevSpec.b);
      mat.metadata.flashTimeout = null;
    }
  }, ms + 10);
}

/** Smooth pulse: pop scale up instantly, then ease back to base scale. */
export function pulseObstacle(
  m: AbstractMesh,
  scale = 1.35,
  durationMs = 120
) {
  const meta: any = m.metadata || {};
  m.metadata = meta;

  if (!meta.baseScale) meta.baseScale = m.scaling.clone();

  if (meta.pulseTimeout) {
    clearTimeout(meta.pulseTimeout as any);
    meta.pulseTimeout = null;
  }

  m.scaling.set(
    meta.baseScale.x * scale,
    meta.baseScale.y * scale,
    meta.baseScale.z * scale
  );

  animateEaseOut(
    m,
    "scaling",
    m.scaling.clone(),
    meta.baseScale.clone(),
    durationMs
  );

  meta.pulseTimeout = setTimeout(() => {
    m.scaling.copyFrom(meta.baseScale);
    meta.pulseTimeout = null;
  }, durationMs + 10);
}

export type { RemoteMsg };
