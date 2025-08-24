import {
  Animation,
  Color3,
  FresnelParameters,
  EasingFunction,
  ExponentialEase,
  Scene,
  StandardMaterial,
  Vector3,
} from "@babylonjs/core";
import type { RemoteMsg } from "../types";

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
  (m as any).specularColor = new Color3(1, 1, 1);
  (m as any).specularPower = 64;
  if (glow) (m as any).emissiveColor = base.scale(glowStrength * 0.6);
  const f = new FresnelParameters();
  f.bias = 0.2;
  f.power = 2;
  f.leftColor = new Color3(1, 1, 1);
  f.rightColor = base;
  (m as any).emissiveFresnelParameters = f;
  return m;
}

export function randColor() {
  // Fallback colors if theme bridge isn't available
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

/** helper: one-shot ease-out animation on any target.property */
function animateEaseOut<T>(
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
  const anim = new Animation(
    `${property}-easeOut`,
    property,
    fps,
    // infer type from value
    from instanceof Color3
      ? Animation.ANIMATIONTYPE_COLOR3
      : property.endsWith("scaling") || from?.x !== undefined
      ? Animation.ANIMATIONTYPE_VECTOR3
      : Animation.ANIMATIONTYPE_FLOAT,
    Animation.ANIMATIONLOOPMODE_CONSTANT
  );

  // ease-out
  easing.setEasingMode(EasingFunction.EASINGMODE_EASEOUT);
  anim.setEasingFunction(easing);

  anim.setKeys([
    { frame: 0, value: from },
    { frame: totalFrames, value: to },
  ]);

  // stop any previous animation on the same property
  scene.stopAnimation(target);

  return scene.beginDirectAnimation(target, [anim], 0, totalFrames, false, 1.0);
}

/** Smooth flash across ALL faces, easing the emissive back down. */
export function flashPaddle(
  p: BABYLON.AbstractMesh,
  color = new Color3(1, 0.3, 0.3),
  ms = 2 // a bit longer so you notice the decay
) {
  const mat = p.material as StandardMaterial;
  if (!mat) return;

  // metadata + cancel previous restore
  mat.metadata ||= {};
  if (mat.metadata.flashTimeout) {
    clearTimeout(mat.metadata.flashTimeout);
    mat.metadata.flashTimeout = null;
  }
  mat.metadata.flashVer = (mat.metadata.flashVer ?? 0) + 1;
  const ver = mat.metadata.flashVer;

  // capture state
  const prevEmissive = mat.emissiveColor.clone();
  const prevBackFaceCulling = mat.backFaceCulling;
  const prevDisableLighting = mat.disableLighting;
  const prevSpec = mat.specularColor?.clone();

  // make it pop on all sides, independent of lights
  mat.backFaceCulling = false;
  mat.disableLighting = true;
  if (mat.specularColor) mat.specularColor.set(0, 0, 0);

  // jump to flash color instantly, then ease back to original
  mat.emissiveColor.set(color.r, color.g, color.b);
  animateEaseOut<Color3>(mat, "emissiveColor", color.clone(), prevEmissive, ms);

  // restore flags after the fade completes (guarded by version)
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
  m: BABYLON.AbstractMesh,
  scale = 1.35,
  durationMs = 2
) {
  const meta: any = m.metadata || {};
  m.metadata = meta;

  if (!meta.baseScale) meta.baseScale = m.scaling.clone();

  // stop any previous pulse timer
  if (meta.pulseTimeout) {
    clearTimeout(meta.pulseTimeout as any);
    meta.pulseTimeout = null;
  }
  // set to enlarged immediately
  m.scaling.set(
    meta.baseScale.x * scale,
    meta.baseScale.y * scale,
    meta.baseScale.z * scale
  );

  // ease back to base
  animateEaseOut(
    m,
    "scaling",
    m.scaling.clone(),
    meta.baseScale.clone(),
    durationMs
  );

  // small guard to ensure final value is exact
  meta.pulseTimeout = setTimeout(() => {
    m.scaling.copyFrom(meta.baseScale);
    meta.pulseTimeout = null;
  }, durationMs + 10);
}

export type { RemoteMsg };
