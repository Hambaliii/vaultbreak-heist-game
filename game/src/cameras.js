// cameras.js - sweeping security cameras + security-office panel hack.
import { CAMERAS, PANEL } from "./level.js";
import { canSeePoint } from "./vision.js";

export const CAM_RANGE = 200;
export const CAM_HALF_ANGLE = 28;
export const CAM_DISABLED_SECONDS = 25;
export const PANEL_COOLDOWN = 40;
export const PANEL_HOLD = 1.5;

export function createCameras() {
  return CAMERAS.map((c, i) => ({
    x: c.x, y: c.y, baseAngle: c.baseAngle, facing: c.baseAngle,
    disabled: false, disabledTimer: 0, seesPlayer: false, id: i, time: i * 1.3, blink: 0,
  }));
}
export function disableAllCameras(cameras, seconds = CAM_DISABLED_SECONDS) {
  for (const c of cameras) { c.disabledTimer = seconds; c.disabled = true; c.seesPlayer = false; }
}
export function updateCameras(cameras, player, dt, events = {}) {
  let detecting = false;
  for (const c of cameras) {
    c.time += dt;
    if (c.disabledTimer > 0) { c.disabledTimer -= dt; c.disabled = c.disabledTimer > 0; }
    else c.disabled = false;
    c.facing = c.baseAngle + Math.sin((c.time * Math.PI * 2) / 6) * ((40 * Math.PI) / 180);
    c.blink += dt;
    if (c.disabled) { c.seesPlayer = false; continue; }
    const sees = canSeePoint(c.x, c.y, c.facing, CAM_HALF_ANGLE, CAM_RANGE, player.x, player.y);
    c.seesPlayer = sees;
    if (sees) {
      detecting = true;
      if (events.onAlarm) events.onAlarm(18 * dt);
      if (events.onBeep && c.blink > 0.8) { c.blink = 0; events.onBeep(c); }
    }
  }
  return detecting;
}
export function createPanelState() { return { hold: 0, cooldown: 0 }; }
export function nearPanel(player) {
  return player.x >= PANEL.x - 30 && player.x <= PANEL.x + PANEL.w + 30 && player.y >= PANEL.y - 30 && player.y <= PANEL.y + PANEL.h + 42;
}
// Call every frame. Returns true on the frame the hack completes.
export function hackPanel(panelState, cameras, player, holdingE, dt, events = {}) {
  if (panelState.cooldown > 0) panelState.cooldown -= dt;
  const anyDisabled = cameras.some((c) => c.disabled);
  if (!nearPanel(player) || !holdingE || panelState.cooldown > 0 || anyDisabled) {
    panelState.hold = Math.max(0, panelState.hold - dt * 2);
    return false;
  }
  panelState.hold += dt;
  if (panelState.hold >= PANEL_HOLD) {
    panelState.hold = 0; panelState.cooldown = PANEL_COOLDOWN;
    disableAllCameras(cameras, CAM_DISABLED_SECONDS);
    if (events.onDisabled) events.onDisabled();
    return true;
  }
  return false;
}
