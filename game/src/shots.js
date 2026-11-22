// shots.js - deterministic screenshot modes for VAULTBREAK.
//
// Usage: open the game with ?shot=play|vault|escape|end (optional &seed=N,
// default 1). stageShotScene() puts every entity into a FIXED representative
// scene by direct assignment only — no randomness beyond the seed, no
// simulation — so a screenshot taken at load is exactly the staged scene,
// every time. main.js freezes the update loop in shot mode and renders the
// staged scene unchanged.

import { LOOT, VAULT_DOOR, VAULT_TARGET, VAN } from "./level.js";

export const SHOT_MODES = ["play", "vault", "escape", "end"];

// parseShotMode(search?) -> { mode, seed } | null
// Reads ?shot= and &seed= from the given query string, or from
// location.search when no argument is given. Returns null when there is
// no (valid) shot parameter, so normal play is untouched.
export function parseShotMode(search) {
  let raw = search;
  if (typeof raw !== "string") {
    raw = typeof location !== "undefined" ? location.search : "";
  }
  const params = new URLSearchParams(raw || "");
  const mode = params.get("shot");
  if (!mode || !SHOT_MODES.includes(mode)) return null;
  const seedRaw = parseInt(params.get("seed") || "", 10);
  const seed = Number.isFinite(seedRaw) ? seedRaw : 1;
  return { mode, seed };
}

// --- small staging helpers (direct assignment only) -----------------------

function setPlayer(player, opts) {
  Object.assign(player, {
    moving: false, sneaking: false, running: false, noiseRadius: 0,
    carriedLoot: [], carriedValue: 0, carriedWeight: 0,
  }, opts);
  if (typeof player.x === "number" && typeof player.y === "number") {
    player.facing = Math.atan2(player.dirY || 0, player.dirX || 1);
  }
}

function setGuard(guard, x, y, facing, state, suspicion) {
  if (!guard) return;
  guard.x = x; guard.y = y; guard.facing = facing;
  guard.baseFacing = facing;
  guard.state = state; guard.suspicion = suspicion || 0;
  guard.seesPlayer = state === "alert";
  guard.lastSeen = null; guard.loseTimer = 0; guard.lookTimer = 0;
  guard.pauseTimer = 0;
}

function setCamera(cam, facing, disabled, seesPlayer) {
  if (!cam) return;
  cam.facing = facing; cam.baseAngle = facing;
  cam.disabled = !!disabled; cam.disabledTimer = disabled ? 25 : 0;
  cam.seesPlayer = !!seesPlayer; cam.blink = 0;
}

function setAlarm(bundle, opts) {
  const a = bundle.alarmState;
  if (a) Object.assign(a, opts);
  const g = bundle.game;
  g.alarm = opts.alarm; g.wanted = opts.wanted;
  g.tripped = !!opts.tripped; g.ghost = !!opts.ghost;
  g.policeTimer = opts.tripped ? opts.policeTimer : null;
  g.camerasDisabledTimer = 0;
}

function resetCrack(bundle) {
  const c = bundle.crack;
  if (!c) return;
  c.active = false; c.done = false; c.tumblers = 0;
  c.needleAngle = -2.2; c.dir = 1; c.zoneStart = 0.4; c.zoneWidth = 0.6;
  c.sweepSpeed = 1.6; c.burstTimer = 0;
}

function takeLoot(bundle, predicate) {
  // Mark matching staged loot as taken and rebuild the carried tally.
  const carried = [];
  for (const item of bundle.game.loot) {
    if (predicate(item, carried)) {
      item.taken = true;
      carried.push({ ...item });
    }
  }
  return carried;
}

function applyCarried(bundle, carried) {
  bundle.player.carriedLoot = carried;
  bundle.player.carriedValue = carried.reduce((s, i) => s + i.value, 0);
  bundle.player.carriedWeight = carried.reduce((s, i) => s + i.weight, 0);
}

// --- the four staged scenes -------------------------------------------------

function stagePlay(bundle) {
  const { game, player, guards, cameras } = bundle;
  game.state = "playing"; game.phase = "infiltrate";
  game.vaultOpen = false; game.objective = "Reach the vault";
  game.elapsed = 42; game.time = 1.0; game.score = null; game.seenNow = false;
  setAlarm(bundle, { alarm: 35, wanted: 1, tripped: false, ghost: true, everTripped: false, policeTimer: null, spottedEver: false, maxAlarm: 35 });
  resetCrack(bundle);

  // Thief mid-crossing of the teller hall, in the open between the counters,
  // walking (not sneaking, not running) toward the vault.
  setPlayer(player, {
    x: 730, y: 344, dirX: -0.83, dirY: -0.55,
    moving: true, sneaking: false, running: false, noiseRadius: 26, speed: 155,
  });

  // Two-plus guards on patrol. Guard 0 faces down the hall so his cone is
  // visibly clipped by the teller counter at (520,300). Guard 1 patrols the
  // east hall facing west. Neither currently sees the thief.
  setGuard(guards[0], 620, 268, Math.PI / 2, "patrol", 0);
  setGuard(guards[1], 985, 382, Math.PI, "patrol", 0);
  setGuard(guards[2], 205, 520, 0, "patrol", 0);
  setGuard(guards[3], 700, 545, -Math.PI / 2, "patrol", 0);

  // Cameras all active, sweep facings fixed mid-sweep.
  setCamera(cameras[0], 0.7, false, false);
  setCamera(cameras[1], Math.PI / 2, false, false);
  setCamera(cameras[2], -0.7, false, false);
  setCamera(cameras[3], 2.6, false, false);
  setCamera(cameras[4], Math.PI / 2, false, false);
  void VAULT_TARGET;
}

function stageVault(bundle) {
  const { game, player, guards, cameras } = bundle;
  game.state = "playing"; game.phase = "crack";
  game.vaultOpen = false;
  game.objective = "Crack the vault: press E in the green zone";
  game.elapsed = 78; game.time = 1.0; game.score = null; game.seenNow = false;
  setAlarm(bundle, { alarm: 55, wanted: 1, tripped: false, ghost: false, everTripped: false, policeTimer: null, spottedEver: false, maxAlarm: 55 });

  // Cracking minigame ACTIVE at the door: 2 of 3 tumblers locked, needle
  // sitting inside the green zone.
  const c = bundle.crack;
  resetCrack(bundle);
  c.active = true; c.tumblers = 2; c.done = false;
  c.zoneStart = 0.4; c.zoneWidth = 0.6; c.needleAngle = 0.68;
  c.dir = 1; c.sweepSpeed = 2.7;

  // Thief at the vault door, facing it.
  setPlayer(player, {
    x: VAULT_DOOR.x + VAULT_DOOR.w + 26, y: VAULT_DOOR.y + VAULT_DOOR.h / 2,
    dirX: -1, dirY: 0, moving: false, sneaking: false, running: false, noiseRadius: 0,
  });

  // One guard patrolling nearby with his cone visible but facing AWAY
  // from the door (east, down the offices strip); the rest are far off.
  setGuard(guards[0], 445, 185, 0.35, "patrol", 0);
  setGuard(guards[1], 820, 320, Math.PI, "patrol", 0);
  setGuard(guards[2], 205, 520, 0, "patrol", 0);
  setGuard(guards[3], 1060, 320, Math.PI / 2, "patrol", 0);

  setCamera(cameras[0], 0.7, false, false);
  setCamera(cameras[1], Math.PI / 2, false, false);
  setCamera(cameras[2], -0.7, false, false);
  setCamera(cameras[3], 2.6, false, false);
  setCamera(cameras[4], Math.PI / 2, false, false);
}

function stageEscape(bundle) {
  const { game, player, guards, cameras } = bundle;
  game.state = "playing"; game.phase = "escape";
  game.vaultOpen = true; game.objective = "Escape to the van!";
  game.elapsed = 95; game.time = 1.0; game.score = null; game.seenNow = true;
  setAlarm(bundle, { alarm: 100, wanted: 3, tripped: true, ghost: false, everTripped: true, policeTimer: 41, spottedEver: true, maxAlarm: 100 });
  const c = bundle.crack;
  resetCrack(bundle); c.done = true;

  // Loot carried: gold + cash + jewels + bonds + cash = $14,500, 7 kg.
  let goldTaken = false;
  const carried = takeLoot(bundle, (item) => {
    if (item.kind === "gold" && !goldTaken) { goldTaken = true; return true; }
    return item.kind === "cash" || item.kind === "jewels" || item.kind === "bonds";
  });
  // takeLoot above grabs every cash/jewels/bonds stack; trim to the exact
  // staged set (gold x1, cash x2, jewels x1, bonds x1) if it grabbed more.
  const wantedKinds = { gold: 1, cash: 2, jewels: 1, bonds: 1 };
  const exact = [];
  for (const item of carried) {
    if (wantedKinds[item.kind] > 0) { wantedKinds[item.kind] -= 1; exact.push(item); }
    else {
      const live = bundle.game.loot.find((l) => l.x === item.x && l.y === item.y && l.kind === item.kind);
      if (live) live.taken = false;
    }
  }
  applyCarried(bundle, exact);
  player.carriedValue = 14500;
  player.carriedWeight = 7;

  // Thief running for the van (bottom-right), bag on his back.
  setPlayer(player, {
    x: 880, y: 560, dirX: 0.86, dirY: 0.51,
    moving: true, sneaking: false, running: true, noiseRadius: 85, speed: 220,
    carriedLoot: exact, carriedValue: 14500, carriedWeight: 7,
  });

  // One guard in alert, chasing with a red cone right behind the thief.
  setGuard(guards[0], 782, 516, Math.atan2(560 - 516, 880 - 782), "alert", 1);
  guards[0].seesPlayer = true; guards[0].lastSeen = { x: 880, y: 560 };
  setGuard(guards[1], 1010, 382, Math.PI / 2, "suspicious", 0.6);
  setGuard(guards[2], 205, 405, 0, "patrol", 0);
  setGuard(guards[3], 620, 140, Math.PI / 2, "patrol", 0);

  setCamera(cameras[0], 0.7, false, false);
  setCamera(cameras[1], Math.PI / 2, false, false);
  setCamera(cameras[2], -0.7, false, true);
  setCamera(cameras[3], 2.6, false, false);
  setCamera(cameras[4], Math.PI / 2, false, false);
  void VAN;
}

function stageEnd(bundle) {
  const { game, player, guards, cameras } = bundle;
  game.state = "won"; game.phase = "escape";
  game.vaultOpen = true; game.objective = "Escape to the van!";
  game.elapsed = 150; game.time = 1.0; game.seenNow = false;
  // Alarm WAS tripped during the run (so no GHOST, no CLEAN), but the thief
  // got out before the police arrived: not currently tripped.
  setAlarm(bundle, { alarm: 100, wanted: 3, tripped: false, ghost: false, everTripped: true, policeTimer: null, spottedEver: true, maxAlarm: 100 });
  game.tripped = false; game.policeTimer = null;
  const c = bundle.crack;
  resetCrack(bundle); c.done = true;

  // Loot tally: gold x2, cash x3, jewels x1 — $21,500, 10 kg.
  const carried = [
    { x: 80, y: 80, kind: "gold", value: 5000, weight: 3, taken: true },
    { x: 240, y: 80, kind: "gold", value: 5000, weight: 3, taken: true },
    { x: 130, y: 80, kind: "cash", value: 2500, weight: 1, taken: true },
    { x: 185, y: 130, kind: "cash", value: 2500, weight: 1, taken: true },
    { x: 100, y: 105, kind: "cash", value: 2500, weight: 1, taken: true },
    { x: 180, y: 75, kind: "jewels", value: 4000, weight: 1, taken: true },
  ];
  applyCarried(bundle, carried);
  player.carriedValue = 21500; player.carriedWeight = 10;
  // Backdrop world: mark the first six vault stacks as taken.
  bundle.game.loot.forEach((item, i) => { item.taken = i < 6; });

  setPlayer(player, {
    x: VAN.x + VAN.w / 2, y: VAN.y + VAN.h / 2, dirX: 1, dirY: 0,
    moving: false, sneaking: false, running: false, noiseRadius: 0,
    carriedLoot: carried, carriedValue: 21500, carriedWeight: 10,
  });

  // Score exactly as computeScore() in main.js would produce it:
  // loot $21,500 + time bonus (3000 - 10 * 150s = $1,500), no bonuses.
  game.score = {
    lootValue: 21500, timeBonus: 1500, ghostBonus: 0, cleanBonus: 0,
    total: 21500 + 1500,
  };

  setGuard(guards[0], 620, 268, Math.PI / 2, "patrol", 0);
  setGuard(guards[1], 985, 382, Math.PI, "patrol", 0);
  setGuard(guards[2], 205, 520, 0, "patrol", 0);
  setGuard(guards[3], 700, 545, -Math.PI / 2, "patrol", 0);
  setCamera(cameras[0], 0.7, false, false);
  setCamera(cameras[1], Math.PI / 2, false, false);
  setCamera(cameras[2], -0.7, false, false);
  setCamera(cameras[3], 2.6, false, false);
  setCamera(cameras[4], Math.PI / 2, false, false);
  void LOOT;
}

// stageShotScene(bundle, mode)
// bundle: { game, player, guards, cameras, alarmState, crack, panelState }
// (a game object carrying those same fields also works). Mutates the bundle
// in place into the fixed scene for `mode`. Unknown modes are ignored.
export function stageShotScene(bundle, mode) {
  if (!bundle) return;
  const b = bundle.game ? bundle : {
    game: bundle, player: bundle.player, guards: bundle.guards,
    cameras: bundle.cameras, alarmState: bundle.alarmState,
    crack: bundle.crack, panelState: bundle.panelState,
  };
  if (!b.game || !b.player || !b.guards || !b.cameras) return;
  if (typeof b.game.seed === "number") b.game.shotSeed = b.game.seed;
  // Start every scene from a clean loot table.
  if (Array.isArray(b.game.loot)) for (const item of b.game.loot) item.taken = false;
  if (mode === "play") stagePlay(b);
  else if (mode === "vault") stageVault(b);
  else if (mode === "escape") stageEscape(b);
  else if (mode === "end") stageEnd(b);
}
