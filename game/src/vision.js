// vision.js - shared vision-cone geometry for guards and cameras.
import { WALLS, COVER, segmentBlocked } from "./level.js";

export const DEFAULT_BLOCKERS = [...WALLS, ...COVER];

export function normalizeAngle(a) {
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  return a;
}

function rayRectT(ox, oy, dx, dy, rect) {
  // Slab method: returns smallest positive t where ray hits rect, or Infinity.
  let tmin = 0, tmax = Infinity;
  if (Math.abs(dx) < 1e-9) { if (ox < rect.x || ox > rect.x + rect.w) return Infinity; }
  else {
    let t1 = (rect.x - ox) / dx, t2 = (rect.x + rect.w - ox) / dx;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  if (Math.abs(dy) < 1e-9) { if (oy < rect.y || oy > rect.y + rect.h) return Infinity; }
  else {
    let t1 = (rect.y - oy) / dy, t2 = (rect.y + rect.h - oy) / dy;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2);
    if (tmin > tmax) return Infinity;
  }
  return tmin > 1e-6 ? tmin : Infinity;
}

export function rayRange(x, y, angle, maxRange, blockers) {
  const list = blockers && blockers.length ? blockers : DEFAULT_BLOCKERS;
  const dx = Math.cos(angle), dy = Math.sin(angle);
  let best = maxRange;
  for (const r of list) {
    const t = rayRectT(x, y, dx, dy, r);
    if (t < best) best = t;
  }
  return best;
}

export function conePolygon(x, y, facing, halfAngleDeg, range, blockers) {
  const half = (halfAngleDeg * Math.PI) / 180;
  const rays = 28;
  const pts = [{ x, y }];
  for (let i = 0; i <= rays; i++) {
    const a = facing - half + (2 * half * i) / rays;
    const d = rayRange(x, y, a, range, blockers);
    pts.push({ x: x + Math.cos(a) * d, y: y + Math.sin(a) * d });
  }
  return pts;
}

export function canSeePoint(x, y, facing, halfAngleDeg, range, px, py, blockers) {
  const dx = px - x, dy = py - y;
  const dist = Math.hypot(dx, dy);
  if (dist > range) return false;
  if (dist < 4) return true;
  const half = (halfAngleDeg * Math.PI) / 180;
  const diff = Math.abs(normalizeAngle(Math.atan2(dy, dx) - facing));
  if (diff > half) return false;
  // LOS: prefer segmentBlocked (level walls+cover) when no custom blockers given.
  if (!blockers || !blockers.length) {
    return !segmentBlocked(x, y, px, py);
  }
  // Custom blockers: sample ray distance vs target distance.
  return rayRange(x, y, Math.atan2(dy, dx), dist, blockers) >= dist - 1;
}

export function hearingCheck(guard, player) {
  if (!player || !player.noiseRadius) return false;
  const dist = Math.hypot(player.x - guard.x, player.y - guard.y);
  return dist <= player.noiseRadius;
}
