// level.js - hand-designed bank level for VAULTBREAK: geometry, loot and helpers.

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const WALLS = [
  // Outer walls
  { x: 0, y: 0, w: 1280, h: 16 },
  { x: 0, y: 0, w: 16, h: 640 },
  { x: 1264, y: 0, w: 16, h: 640 },
  { x: 0, y: 624, w: 80, h: 16 },
  { x: 140, y: 624, w: 1124, h: 16 },
  // Top rooms horizontal divider (y = 220), door gaps at 216-280, 540-600, 1040-1100
  { x: 16, y: 220, w: 200, h: 14 },
  { x: 280, y: 220, w: 80, h: 14 },
  { x: 360, y: 220, w: 180, h: 14 },
  { x: 600, y: 220, w: 280, h: 14 },
  { x: 880, y: 220, w: 160, h: 14 },
  { x: 1100, y: 220, w: 164, h: 14 },
  // Top vertical dividers
  { x: 360, y: 16, w: 14, h: 204 },
  { x: 880, y: 16, w: 14, h: 204 },
  // Vault chamber thick walls (inside the vault room)
  { x: 40, y: 40, w: 280, h: 18 },
  { x: 40, y: 40, w: 18, h: 140 },
  { x: 302, y: 40, w: 18, h: 78 },
  { x: 302, y: 146, w: 18, h: 34 },
  { x: 40, y: 162, w: 280, h: 18 },
  // Left vertical divider between lobby / entrance hall and the centre (x = 360)
  { x: 360, y: 234, w: 14, h: 106 },
  { x: 360, y: 400, w: 14, h: 224 },
  // Lower horizontal divider (y = 420) between teller hall and lower corridor
  { x: 374, y: 420, w: 186, h: 14 },
  { x: 620, y: 420, w: 300, h: 14 },
  { x: 980, y: 420, w: 284, h: 14 },
];

export const COVER = [
  // Teller counters in the centre
  { x: 520, y: 300, w: 180, h: 28 },
  { x: 760, y: 300, w: 180, h: 28 },
  { x: 520, y: 360, w: 180, h: 28 },
  // Office desks along the top
  { x: 440, y: 80, w: 90, h: 36 },
  { x: 620, y: 80, w: 90, h: 36 },
  { x: 700, y: 140, w: 90, h: 36 },
  { x: 440, y: 140, w: 90, h: 36 },
  // Security office desk
  { x: 960, y: 80, w: 110, h: 36 },
  // Pillars in the lower hall
  { x: 480, y: 480, w: 36, h: 36 },
  { x: 800, y: 480, w: 36, h: 36 },
  { x: 1050, y: 480, w: 36, h: 36 },
  // Planters in the lobby
  { x: 60, y: 480, w: 60, h: 24 },
  { x: 200, y: 560, w: 60, h: 24 },
  { x: 60, y: 300, w: 60, h: 24 },
];

export const CAMERAS = [
  { x: 180, y: 440, baseAngle: 0.7 },
  { x: 700, y: 250, baseAngle: Math.PI / 2 },
  { x: 1000, y: 450, baseAngle: -0.7 },
  { x: 390, y: 250, baseAngle: 2.6 },
  { x: 1150, y: 250, baseAngle: Math.PI / 2 },
];

export const LOOT = [
  { x: 80, y: 80, kind: "gold", value: 5000, weight: 3 },
  { x: 130, y: 80, kind: "cash", value: 2000, weight: 1 },
  { x: 180, y: 75, kind: "jewels", value: 4000, weight: 1 },
  { x: 240, y: 80, kind: "gold", value: 5000, weight: 3 },
  { x: 80, y: 130, kind: "bonds", value: 1500, weight: 1 },
  { x: 130, y: 135, kind: "art", value: 3500, weight: 2 },
  { x: 185, y: 130, kind: "cash", value: 2000, weight: 1 },
  { x: 245, y: 130, kind: "jewels", value: 4000, weight: 1 },
  { x: 180, y: 105, kind: "gold", value: 5000, weight: 3 },
  { x: 100, y: 105, kind: "bonds", value: 1500, weight: 1 },
];

export const VAULT_DOOR = { x: 302, y: 118, w: 18, h: 28 };
export const VAULT_TARGET = { x: 180, y: 110 };
export const PANEL = { x: 1150, y: 60, w: 56, h: 36 };
export const VAN = { x: 1020, y: 652, w: 200, h: 52 };
export const PLAYER_START = { x: 110, y: 590 };

export const ROOM_LABELS = [
  { x: 80, y: 470, text: "LOBBY" },
  { x: 620, y: 270, text: "TELLER HALL" },
  { x: 560, y: 50, text: "OFFICES" },
  { x: 980, y: 50, text: "SECURITY" },
  { x: 130, y: 205, text: "VAULT" },
];

export function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function circleHitsRect(x, y, r, rect) {
  const closestX = Math.max(rect.x, Math.min(x, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(y, rect.y + rect.h));
  const dx = x - closestX;
  const dy = y - closestY;
  return dx * dx + dy * dy < r * r;
}

export function isBlocked(x, y, r) {
  for (const wall of WALLS) {
    if (circleHitsRect(x, y, r, wall)) return true;
  }
  for (const cover of COVER) {
    if (circleHitsRect(x, y, r, cover)) return true;
  }
  return false;
}

function pointInRect(x, y, rect) {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function segmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const d1x = x2 - x1, d1y = y2 - y1;
  const d2x = x4 - x3, d2y = y4 - y3;
  const denom = d1x * d2y - d1y * d2x;
  if (denom === 0) return false;
  const t = ((x3 - x1) * d2y - (y3 - y1) * d2x) / denom;
  const u = ((x3 - x1) * d1y - (y3 - y1) * d1x) / denom;
  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

function segmentHitsRect(x1, y1, x2, y2, rect) {
  if (pointInRect(x1, y1, rect) || pointInRect(x2, y2, rect)) return true;
  const left = rect.x, right = rect.x + rect.w, top = rect.y, bottom = rect.y + rect.h;
  return (
    segmentsIntersect(x1, y1, x2, y2, left, top, right, top) ||
    segmentsIntersect(x1, y1, x2, y2, right, top, right, bottom) ||
    segmentsIntersect(x1, y1, x2, y2, right, bottom, left, bottom) ||
    segmentsIntersect(x1, y1, x2, y2, left, bottom, left, top)
  );
}

export function segmentBlocked(x1, y1, x2, y2) {
  for (const wall of WALLS) {
    if (segmentHitsRect(x1, y1, x2, y2, wall)) return true;
  }
  for (const cover of COVER) {
    if (segmentHitsRect(x1, y1, x2, y2, cover)) return true;
  }
  return false;
}
