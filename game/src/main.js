// main.js - core loop and state machine for VAULTBREAK.
import { LOOT, VAULT_DOOR, VAN, PANEL, rectsOverlap } from "./level.js";
import { createPlayer, updatePlayer, addLoot } from "./player.js";
import { isDown, attach, consumeClick } from "./input.js";
import {
  drawFloor, drawWalls, drawCover, drawVault, drawLoot, drawCameras,
  drawPanel, drawVan, drawPlayer, drawHUD, drawTitleScreen, drawPauseOverlay,
  drawVisionCones, drawGuards, drawVaultCrack,
} from "./render.js";
import { createGuards, updateGuards } from "./guards.js";
import { createCameras, updateCameras, createPanelState, hackPanel, nearPanel } from "./cameras.js";
import { createVaultCrack, startVaultCrack, cancelVaultCrack, updateVaultCrack } from "./vault.js";
import { createAlarm, updateAlarm, raiseAlarm, markSpotted } from "./alarm.js";
import * as audio from "./audio.js";

const params = new URLSearchParams(location.search);
const seed = params.get("seed");
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function freshLoot() { return LOOT.map((item) => ({ ...item, taken: false })); }

function createGame() {
  return {
    state: "title", phase: "infiltrate",
    alarm: 0, wanted: 0, tripped: false, ghost: true,
    time: 0, elapsed: 0, policeTimer: null, muted: false,
    vaultOpen: false, crackProgress: 0, loot: freshLoot(), seed, objective: null,
    caughtReason: "", score: null, camerasDisabledTimer: 0, footstepTimer: 0,
  };
}

let game = createGame();
let player = createPlayer();
let guards = createGuards();
let cameras = createCameras();
let alarmState = createAlarm();
let crack = createVaultCrack();
let panelState = createPanelState();
let spottedFired = false;
let lastTime = performance.now();
const pressedOnce = new Set();

function wasPressed(code) {
  const down = isDown(code);
  if (down && !pressedOnce.has(code)) { pressedOnce.add(code); return true; }
  if (!down) pressedOnce.delete(code);
  return false;
}
function syncAlarm() {
  game.alarm = alarmState.alarm; game.wanted = alarmState.wanted;
  game.tripped = alarmState.tripped; game.ghost = alarmState.ghost;
  game.policeTimer = alarmState.tripped ? alarmState.policeTimer : null;
}
function restart() {
  game = createGame(); game.state = "playing"; player = createPlayer();
  guards = createGuards(); cameras = createCameras(); alarmState = createAlarm();
  crack = createVaultCrack(); panelState = createPanelState(); spottedFired = false;
  syncAlarm();
}
function startGame() {
  if (game.state === "title" || game.state === "won" || game.state === "caught") restart();
}
function nearRect(rect, pad) {
  const expanded = { x: rect.x - pad, y: rect.y - pad, w: rect.w + pad * 2, h: rect.h + pad * 2 };
  const pr = { x: player.x - player.r, y: player.y - player.r, w: player.r * 2, h: player.r * 2 };
  return rectsOverlap(pr, expanded);
}
function nearVaultDoor() { return nearRect(VAULT_DOOR, 26); }
function insideVan() { return player.x >= VAN.x && player.x <= VAN.x + VAN.w && player.y >= VAN.y && player.y <= VAN.y + VAN.h; }

function becomeCaught(reason) {
  if (game.state !== "playing") return;
  game.state = "caught"; game.caughtReason = reason || "Caught by a guard";
  audio.playCaughtSting();
}
function computeScore() {
  const lootValue = player.carriedValue;
  const timeBonus = Math.max(0, 3000 - 10 * Math.floor(game.elapsed));
  const ghostBonus = alarmState.ghost ? 5000 : 0;
  const cleanBonus = !alarmState.everTripped ? 2500 : 0;
  return { lootValue, timeBonus, ghostBonus, cleanBonus, total: lootValue + timeBonus + ghostBonus + cleanBonus };
}

function update(dt) {
  if (wasPressed("KeyM")) { game.muted = !game.muted; audio.setMuted(game.muted); }
  if (game.state === "title") { if (isDown("Enter") || consumeClick()) startGame(); return; }
  if (game.state === "won" || game.state === "caught") { if (wasPressed("KeyR") || isDown("Enter")) restart(); return; }
  if (wasPressed("KeyP")) { game.state = game.state === "paused" ? "playing" : "paused"; return; }
  if (game.state === "paused") return;
  if (wasPressed("KeyR")) { restart(); return; }

  game.time += dt; game.elapsed += dt;
  const ePressed = wasPressed("KeyE");
  const eDown = isDown("KeyE");

  updatePlayer(player, { isDown }, dt);
  if (player.moving) {
    game.footstepTimer -= dt;
    if (game.footstepTimer <= 0) { game.footstepTimer = player.running ? 0.22 : 0.38; audio.playFootstep(player.sneaking); }
  }

  if (!game.vaultOpen) {
    const inChamber = player.x > 46 && player.x < 308 && player.y > 46 && player.y < 168;
    if (inChamber && !crack.active) player.x = VAULT_DOOR.x + VAULT_DOOR.w + player.r + 4;
    if (inChamber && crack.active) { /* cracking at the door from inside edge is allowed */ }
  }

  // --- Vault cracking minigame ---
  if (!game.vaultOpen) {
    if (!crack.active && nearVaultDoor() && ePressed) {
      startVaultCrack(crack);
      if (game.phase === "infiltrate") game.phase = "crack";
    } else if (crack.active) {
      if (!nearVaultDoor()) cancelVaultCrack(crack);
      else {
        updateVaultCrack(crack, { ePressed }, dt, {
          onAlarm: (a) => raiseAlarm(alarmState, a),
          onTumbler: () => audio.playTumblerClunk(),
          onMiss: () => audio.playSuspicionTick(),
          onOpened: () => {
            game.vaultOpen = true; game.phase = "loot"; audio.playVaultOpen();
          },
        });
      }
    }
  }

  // --- Panel hack ---
  hackPanel(panelState, cameras, player, eDown, dt, { onDisabled: () => audio.playCameraBeep() });
  game.panelHold = panelState.hold; game.panelCooldown = panelState.cooldown;
  void PANEL; void nearPanel;

  // --- Guards & cameras ---
  let detecting = false;
  const guardDetect = updateGuards(guards, player, dt, {
    onAlarm: (a) => raiseAlarm(alarmState, a),
    onSuspicionTick: () => audio.playSuspicionTick(),
    onSpotted: () => {
      markSpotted(alarmState);
      if (!spottedFired) { spottedFired = true; }
      audio.playAlertSting();
    },
    onCaught: () => becomeCaught("Caught by a guard"),
  });
  const camDetect = updateCameras(cameras, player, dt, {
    onAlarm: (a) => raiseAlarm(alarmState, a),
    onBeep: () => audio.playCameraBeep(),
  });
  detecting = guardDetect || camDetect;
  game.camerasDisabledTimer = cameras.length ? Math.max(0, cameras[0].disabledTimer || 0) : 0;

  updateAlarm(alarmState, dt, detecting);
  syncAlarm();
  if (alarmState.tripped && alarmState.policeTimer <= 0) {
    becomeCaught("The police sealed the street");
  }
  if (game.state !== "playing") return;

  // --- Loot ---
  if (game.vaultOpen) {
    for (const item of game.loot) {
      if (item.taken) continue;
      if (Math.hypot(player.x - item.x, player.y - item.y) < player.r + 14) {
        item.taken = true; addLoot(player, item); audio.playLootPickup();
        if (game.phase !== "escape") game.phase = "escape";
      }
    }
  }

  // --- Objective ---
  if (alarmState.tripped) game.objective = "RUN \u2014 police in " + Math.max(0, Math.ceil(alarmState.policeTimer)) + "s";
  else if (game.phase === "escape") game.objective = "Escape to the van!";
  else if (game.phase === "crack") game.objective = "Crack the vault: press E in the green zone";
  else if (game.phase === "loot") game.objective = "Grab loot \u2014 heavier is slower";
  else game.objective = "Reach the vault";

  if (player.carriedValue > 0 && insideVan()) {
    game.score = computeScore(); game.state = "won"; audio.playSuccessChime();
  }
}

function drawScoreScreen() {
  const s = game.score || computeScore();
  ctx.fillStyle = "rgba(5,8,14,0.88)"; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ffd94d"; ctx.font = "bold 56px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("CLEAN GETAWAY", 640, 230);
  ctx.fillStyle = "#ffffff"; ctx.font = "24px sans-serif";
  ctx.fillText("Loot value: $" + s.lootValue, 640, 290);
  ctx.fillText("Time bonus: $" + s.timeBonus + "  (" + game.elapsed.toFixed(1) + "s)", 640, 330);
  ctx.fillText("GHOST bonus: $" + s.ghostBonus, 640, 370);
  ctx.fillText("CLEAN bonus (alarm never tripped): $" + s.cleanBonus, 640, 410);
  ctx.fillStyle = "#ffd94d"; ctx.font = "bold 30px sans-serif";
  ctx.fillText("TOTAL SCORE: $" + s.total, 640, 465);
  ctx.font = "20px sans-serif"; ctx.fillStyle = "#ffffff";
  let stars = ""; for (let i = 0; i < 3; i++) stars += i < game.wanted ? "\u2605" : "\u2606";
  ctx.fillText("Wanted: " + stars, 640, 505);
  ctx.font = "18px sans-serif"; ctx.fillStyle = "#7fd4ff";
  ctx.fillText("Press R to play again", 640, 555); ctx.textAlign = "left";
}
function drawCaughtScreen() {
  ctx.fillStyle = "rgba(20,5,5,0.88)"; ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ff5147"; ctx.font = "bold 56px sans-serif"; ctx.textAlign = "center";
  ctx.fillText("BUSTED", 640, 300);
  ctx.fillStyle = "#ffffff"; ctx.font = "20px sans-serif";
  ctx.fillText(game.caughtReason || "Caught", 640, 345);
  ctx.fillText("Press R to play again", 640, 390); ctx.textAlign = "left";
}
function drawPanelProgress() {
  if (!panelState || panelState.hold <= 0) return;
  const ratio = Math.min(1, panelState.hold / 1.5);
  ctx.fillStyle = "#2a3247"; ctx.fillRect(PANEL.x - 10, PANEL.y - 20, 76, 10);
  ctx.fillStyle = "#3fae5a"; ctx.fillRect(PANEL.x - 10, PANEL.y - 20, 76 * ratio, 10);
}

function render() {
  if (game.state === "title") { drawTitleScreen(ctx); return; }
  drawFloor(ctx); drawCover(ctx); drawPanel(ctx); drawVan(ctx);
  drawLoot(ctx, game.loot, game);
  drawVault(ctx, game); drawWalls(ctx); drawVault(ctx, game);
  drawVisionCones(ctx, guards);
  drawCameras(ctx, cameras);
  drawGuards(ctx, guards);
  drawPlayer(ctx, player);
  drawVaultCrack(ctx, crack);
  drawPanelProgress();
  drawHUD(ctx, game, player);
  if (game.state === "paused") drawPauseOverlay(ctx);
  if (game.state === "won") drawScoreScreen();
  if (game.state === "caught") drawCaughtScreen();
}
function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now; update(dt); render(); requestAnimationFrame(frame);
}
attach(canvas);
requestAnimationFrame(frame);
