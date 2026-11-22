// vault.js - vault cracking minigame: lock 3 tumblers in the green zone.
export function createVaultCrack() {
  return {
    active: false, tumblers: 0, needleAngle: -2.2, dir: 1,
    zoneStart: 0.4, zoneWidth: 0.6, sweepSpeed: 1.6, burstTimer: 0, done: false,
  };
}
function newZone(crack) {
  // Deterministic-ish placement varying by tumbler + needle position.
  const seed = Math.sin((crack.tumblers + 1) * 12.9898) * 43758.5453;
  const frac = seed - Math.floor(seed);
  crack.zoneStart = -2.0 + frac * 3.4;
  crack.zoneWidth = Math.max(0.34, 0.6 - crack.tumblers * 0.1);
}
export function startVaultCrack(crack) {
  crack.active = true; crack.tumblers = 0; crack.done = false;
  crack.needleAngle = -2.2; crack.dir = 1; crack.sweepSpeed = 1.6; crack.burstTimer = 0;
  newZone(crack); return crack;
}
export function cancelVaultCrack(crack) { crack.active = false; return crack; }
export function needleInZone(crack) {
  return crack.needleAngle >= crack.zoneStart && crack.needleAngle <= crack.zoneStart + crack.zoneWidth;
}
export function updateVaultCrack(crack, input, dt, events = {}) {
  if (!crack.active) return crack;
  const burst = crack.burstTimer > 0 ? 1.9 : 1;
  if (crack.burstTimer > 0) crack.burstTimer -= dt;
  const speed = crack.sweepSpeed * burst;
  crack.needleAngle += crack.dir * speed * dt;
  const LIM = 2.35;
  if (crack.needleAngle > LIM) { crack.needleAngle = LIM; crack.dir = -1; }
  if (crack.needleAngle < -LIM) { crack.needleAngle = -LIM; crack.dir = 1; }

  const pressed = input && (input.ePressed || (typeof input.wasPressed === "function" && input.wasPressed("KeyE")));
  if (pressed) {
    if (needleInZone(crack)) {
      crack.tumblers += 1;
      crack.sweepSpeed += 0.55;
      if (events.onAlarm) events.onAlarm(4);
      if (events.onTumbler) events.onTumbler(crack.tumblers);
      if (crack.tumblers >= 3) {
        crack.active = false; crack.done = true;
        if (events.onOpened) events.onOpened();
      } else newZone(crack);
    } else {
      if (events.onAlarm) events.onAlarm(8);
      if (events.onMiss) events.onMiss();
      crack.burstTimer = 0.7; crack.dir = crack.dir * -1;
    }
  }
  return crack;
}
