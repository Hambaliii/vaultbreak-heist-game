// guards.js - patrol / suspicious / investigate / alert guard AI.
import { isBlocked } from "./level.js";
import { canSeePoint, hearingCheck, normalizeAngle } from "./vision.js";

export const GUARD_VIEW_RANGE = 230;
export const GUARD_SNEAK_RANGE = 150;
export const GUARD_HALF_ANGLE = 35;
export const PATROL_SPEED = 85;
export const CHASE_SPEED = 170;

const ROUTES = [
  // Lobby -> vault room south strip -> vault door approach (east strip x=340)
  [{ x: 110, y: 520 }, { x: 300, y: 520, pause: true }, { x: 300, y: 300 }, { x: 110, y: 300, pause: true }, { x: 248, y: 200 }, { x: 340, y: 200 }, { x: 340, y: 132, pause: true }],
  // Teller hall -> corridor via the y=420 gaps at x=590 and x=950
  [{ x: 460, y: 320 }, { x: 980, y: 320, pause: true }, { x: 950, y: 380 }, { x: 950, y: 500 }, { x: 590, y: 500, pause: true }, { x: 590, y: 380 }],
  // Offices -> security (via strip below the x=880 divider) -> teller hall
  [{ x: 500, y: 120 }, { x: 820, y: 120, pause: true }, { x: 860, y: 205 }, { x: 1060, y: 205 }, { x: 1060, y: 320, pause: true }, { x: 700, y: 320 }],
  // Lobby <-> teller hall via the x=360 gap, corridor via the x=590 gap
  [{ x: 180, y: 560 }, { x: 180, y: 370, pause: true }, { x: 500, y: 370 }, { x: 590, y: 370 }, { x: 590, y: 560, pause: true }],
];

function makeGuard(route, idx) {
  const start = route[0];
  return {
    x: start.x, y: start.y, r: 11, facing: 0, suspicion: 0,
    state: "patrol", route, wpIndex: 1 % route.length,
    pauseTimer: 0, loseTimer: 0, lookTimer: 0, tickTimer: 0,
    lastSeen: null, seesPlayer: false, id: idx, speed: PATROL_SPEED,
    baseFacing: 0,
  };
}
export function createGuards() { return ROUTES.map((r, i) => makeGuard(r, i)); }

function moveToward(g, tx, ty, speed, dt) {
  const dx = tx - g.x, dy = ty - g.y, dist = Math.hypot(dx, dy);
  if (dist < 2) return true;
  const step = Math.min(dist, speed * dt);
  const nx = g.x + (dx / dist) * step, ny = g.y + (dy / dist) * step;
  g.facing = Math.atan2(dy, dx);
  if (!isBlocked(nx, g.y, g.r)) g.x = nx;
  if (!isBlocked(g.x, ny, g.r)) g.y = ny;
  return dist <= 6;
}

export function updateGuards(guards, player, dt, events = {}) {
  let anyDetecting = false;
  for (const g of guards) {
    const range = player.sneaking ? GUARD_SNEAK_RANGE : GUARD_VIEW_RANGE;
    const sees = canSeePoint(g.x, g.y, g.facing, GUARD_HALF_ANGLE, range, player.x, player.y);
    const hears = hearingCheck(g, player);
    g.seesPlayer = sees;
    if (hears && !sees) {
      g.lastSeen = { x: player.x, y: player.y };
      if (g.state === "patrol" || g.state === "pause") { g.state = "suspicious"; g.suspicion = Math.max(g.suspicion, 0.35); }
    }
    if (sees) {
      anyDetecting = true;
      g.lastSeen = { x: player.x, y: player.y };
      g.loseTimer = 0;
      const dist = Math.hypot(player.x - g.x, player.y - g.y);
      let rate = 0.55;
      if (dist < 90) rate = 1.4; else if (dist < 160) rate = 0.9;
      if (player.running) rate *= 1.7;
      if (player.sneaking) rate *= 0.55;
      const was = g.suspicion;
      g.suspicion = Math.min(1, g.suspicion + rate * dt);
      if (was < 0.5 && g.suspicion >= 0.5) { /* tick handled below */ }
      g.tickTimer -= dt;
      if (g.suspicion > 0.15 && g.suspicion < 1 && g.tickTimer <= 0) { g.tickTimer = 0.45; if (events.onSuspicionTick) events.onSuspicionTick(g); }
      if (events.onAlarm) events.onAlarm((player.running ? 11 : 7) * dt);
      if (g.suspicion >= 1 && g.state !== "alert") {
        g.state = "alert";
        if (events.onSpotted) events.onSpotted(g);
        if (events.onAlert) events.onAlert(g);
      } else if (g.suspicion >= 0.3 && g.state !== "alert") {
        g.state = "suspicious";
      }
    } else {
      g.loseTimer += dt;
      if (g.state === "alert") {
        if (g.loseTimer > 4) { g.state = "investigate"; g.lookTimer = 2; g.suspicion = 0.6; }
      } else {
        g.suspicion = Math.max(0, g.suspicion - 0.28 * dt);
        if (g.state === "suspicious" && g.suspicion <= 0.05) g.state = g.lastSeen ? "investigate" : "patrol";
        if (g.state === "suspicious" && g.suspicion <= 0.35 && g.lastSeen) { g.state = "investigate"; g.lookTimer = 2; }
      }
    }

    // Movement by state
    if (g.state === "patrol") {
      const wp = g.route[g.wpIndex];
      if (moveToward(g, wp.x, wp.y, PATROL_SPEED, dt)) {
        if (wp.pause) { g.state = "pause"; g.pauseTimer = 1.2; g.baseFacing = g.facing; }
        g.wpIndex = (g.wpIndex + 1) % g.route.length;
      }
    } else if (g.state === "pause") {
      g.pauseTimer -= dt;
      g.facing = g.baseFacing + Math.sin((1.2 - g.pauseTimer) * 2.2) * 0.7;
      if (g.pauseTimer <= 0) g.state = "patrol";
    } else if (g.state === "suspicious") {
      // Freeze and stare toward the player / last seen.
      const t = sees ? player : g.lastSeen;
      if (t) g.facing = Math.atan2(t.y - g.y, t.x - g.x);
    } else if (g.state === "investigate") {
      if (g.lastSeen && moveToward(g, g.lastSeen.x, g.lastSeen.y, 115, dt)) {
        g.lookTimer -= dt;
        g.facing += Math.sin(g.lookTimer * 3.5) * 1.6 * dt;
        if (g.lookTimer <= 0) { g.state = "patrol"; g.lastSeen = null; g.suspicion = 0; }
      } else if (!g.lastSeen) g.state = "patrol";
    } else if (g.state === "alert") {
      const t = sees ? player : g.lastSeen;
      if (t) {
        moveToward(g, t.x, t.y, CHASE_SPEED, dt);
        if (sees && Math.hypot(player.x - g.x, player.y - g.y) < 22 && events.onCaught) events.onCaught(g);
      } else g.state = "investigate";
    }
    void normalizeAngle;
  }
  return anyDetecting;
}
