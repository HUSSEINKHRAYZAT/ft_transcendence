import { Color3, FresnelParameters, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import type { RemoteMsg } from "../types";

// math
export function clamp(v: number, a: number, b: number) { return Math.max(a, Math.min(b, v)); }
export function lerp(a: number, b: number, t: number) { return a + (b - a) * t; }
export function safeParse<T>(x: any): T | null { try { return JSON.parse(x) as T; } catch { return null; } }

// velocity helpers
export function clampHorizontal(v: Vector3, maxH: number) {
  const h = Math.hypot(v.x, v.z);
  if (h > maxH) { const s = maxH / h; v.x *= s; v.z *= s; }
}
export function ensureMinHorizontalSpeed(v: Vector3, minH: number) {
  const h = Math.hypot(v.x, v.z);
  if (h < minH) { const s = (minH + 1e-6) / (h + 1e-6); v.x *= s; v.z *= s; }
}

// materials & visuals
export function shinyMat(scene: Scene, base: Color3, glowStrength = 0.5, glow = false) {
  const m = new StandardMaterial("m", scene);
  m.diffuseColor = base;
  (m as any).specularColor = new Color3(1, 1, 1);
  (m as any).specularPower = 64;
  if (glow) (m as any).emissiveColor = base.scale(glowStrength * 0.6);
  const f = new FresnelParameters();
  f.bias = 0.2; f.power = 2; f.leftColor = new Color3(1, 1, 1); f.rightColor = base;
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
  for (let i = 0; i < items.length; i++) { if ((r -= weights[i]) <= 0) return items[i]; }
  return items[items.length - 1];
}
export function flashPaddle(p: any) {
  const mat = p.material;
  const prev = mat.emissiveColor.clone();
  mat.emissiveColor = new Color3(1, 0.3, 0.3);
  setTimeout(() => (mat.emissiveColor = prev), 100);
}
export function pulseObstacle(m: any, scale = 1.35, durationMs = 1) {
  const meta: any = m.metadata || {};
  if (!meta.baseScale) meta.baseScale = m.scaling.clone();
  if (meta.pulseTimeout) clearTimeout(meta.pulseTimeout as any);
  m.scaling.set(meta.baseScale.x * scale, meta.baseScale.y * scale, meta.baseScale.z * scale);
  meta.pulseTimeout = setTimeout(() => { m.scaling.copyFrom(meta.baseScale); meta.pulseTimeout = 0; }, durationMs);
  m.metadata = meta;
}

export type { RemoteMsg };
