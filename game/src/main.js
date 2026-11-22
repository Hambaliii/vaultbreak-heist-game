// main.js - core loop and state machine for VAULTBREAK.

import { LOOT, VAULT_DOOR, VAN, rectsOverlap } from "./level.js";
import { createPlayer, updatePlayer, addLoot } from "./player.js";
import { isDown, attach, consumeClick } from "./input.js";
import {
  drawFloor, drawWalls, drawCover, drawVault, drawLoot, drawCameras,
  drawPanel, drawVan, drawPlayer, drawHUD, drawTitleScreen, drawPauseOverlay,
} from "./render.js";

const params = new URLSearchParams(location.search);
const seed = params.get("seed");

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function freshLoot() {
  return LOOT.map((item) => ({ ...item, taken: false }));
}

function createGame() {
  return {
    state: "title",
    phase: "infiltrate",
    alarm: 0,
    wanted: 0,
    time: 0,
    elapsed: 0,
    policeTimer: null,
    muted: false,
    vaultOpen: false,
    crackProgress: 0,
    loot: freshLoot(),
    seed,
    objective: null,
  };
}

let game = createGame();
let player = createPlayer();
let lastTime = performance.now();
const pressedOnce = new Set();

function wasPressed(code) {
  const down = isDown(code);
  if (down && !pressedOnce.has(code)) {
    pressedOnce.add(code);
    return true;
  }
  if (!down) pressedOnce.delete(code);
  return false;
}

function restart() {
  game = createGame();
  game.state = "playing";
  player = createPlayer();
}

function startGame() {
  if (game.state === "title" || game.state === "won" || game.state === "caught") {
    restart();
  }
}

function nearVaultDoor() {
  const expanded = { x: VAULT_DOOR.x - 26, y: VAULT_DOOR.y - 26, w: VAULT_DOOR.w + 52, h: VAULT_DOOR.h + 52 };
  const playerRect = { x: player.x - player.r, y: player.y - player.r, w: player.r * 2, h: player.r * 2 };
  return rectsOverlap(playerRect, expanded);
}

function insideVan() {
  return player.x >= VAN.x && player.x <= VAN.x + VAN.w && player.y >= VAN.y && player.y <= VAN.y + VAN.h;
}

function update(dt) {
  if (wasPressed("KeyM")) game.muted = !game.muted;

  if (game.state === "title") {
    if (isDown("Enter") || consumeClick()) startGame();
    return;
  }
  if (game.state === "won" || game.state === "caught") {
    if (wasPressed("KeyR") || isDown("Enter")) restart();
    return;
  }
  if (wasPressed("KeyP")) {
    game.state = game.state === "paused" ? "playing" : "paused";
    return;
  }
  if (game.state === "paused") return;
  if (wasPressed("KeyR")) { restart(); return; }

  game.time += dt;
  game.elapsed += dt;

  updatePlayer(player, { isDown }, dt);

  // Locked vault door blocks entry into the chamber until it is cracked open
  if (!game.vaultOpen) {
    const inChamber = player.x > 46 && player.x < 308 && player.y > 46 && player.y < 168;
    if (inChamber) {
      player.x = VAULT_DOOR.x + VAULT_DOOR.w + player.r + 4;
    }
  }

  // Vault cracking (simple hold-E version for session 1)
  if (!game.vaultOpen && nearVaultDoor()) {
    if (game.phase === "infiltrate") game.phase = "crack";
    if (isDown("KeyE")) {
      game.crackProgress += dt;
      if (game.crackProgress >= 2) {
        game.vaultOpen = true;
        game.phase = "loot";
        game.crackProgress = 0;
      }
    } else {
      game.crackProgress = Math.max(0, game.crackProgress - dt);
    }
  }

  // When the vault is open its doorway must not block the thief:
  // the door rect itself is visual only in session 1, walls around it leave a gap
  // through the chamber side handled by level geometry for the open state.

  // Loot pickup
  if (game.vaultOpen) {
    for (const item of game.loot) {
      if (item.taken) continue;
      const dist = Math.hypot(player.x - item.x, player.y - item.y);
      if (dist < player.r + 14) {
        item.taken = true;
        addLoot(player, item);
        if (game.phase !== "escape") game.phase = "escape";
      }
    }
  }

  // Win check
  if (player.carriedValue > 0 && insideVan()) {
    game.state = "won";
  }
}

function drawScoreScreen() {
  ctx.fillStyle = "rgba(5,8,14,0.88)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ffd94d";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("CLEAN GETAWAY", 640, 280);
  ctx.fillStyle = "#ffffff";
  ctx.font = "26px sans-serif";
  ctx.fillText("Loot value: $" + player.carriedValue, 640, 340);
  ctx.fillText("Time: " + game.elapsed.toFixed(1) + "s", 640, 385);
  ctx.fillText("Weight carried: " + player.carriedWeight + " kg", 640, 430);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#7fd4ff";
  ctx.fillText("Press R or Enter to play again", 640, 500);
  ctx.textAlign = "left";
}

function drawCaughtScreen() {
  ctx.fillStyle = "rgba(20,5,5,0.88)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ff5147";
  ctx.font = "bold 56px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("BUSTED", 640, 320);
  ctx.fillStyle = "#ffffff";
  ctx.font = "20px sans-serif";
  ctx.fillText("Press R or Enter to try again", 640, 380);
  ctx.textAlign = "left";
}

function drawCrackProgress() {
  if (game.vaultOpen || game.crackProgress <= 0) return;
  const ratio = Math.min(1, game.crackProgress / 2);
  ctx.fillStyle = "#2a3247";
  ctx.fillRect(VAULT_DOOR.x - 30, VAULT_DOOR.y - 24, 80, 10);
  ctx.fillStyle = "#ffd94d";
  ctx.fillRect(VAULT_DOOR.x - 30, VAULT_DOOR.y - 24, 80 * ratio, 10);
}

function render() {
  if (game.state === "title") {
    drawTitleScreen(ctx);
    return;
  }
  drawFloor(ctx);
  drawCover(ctx);
  drawPanel(ctx);
  drawVan(ctx);
  drawLoot(ctx, game.loot, game);
  drawVault(ctx, game);
  drawWalls(ctx);
  // Re-draw the vault door over the walls so it stays visible
  drawVault(ctx, game);
  drawCameras(ctx);
  drawPlayer(ctx, player);
  drawCrackProgress();
  drawHUD(ctx, game, player);
  if (game.state === "paused") drawPauseOverlay(ctx);
  if (game.state === "won") drawScoreScreen();
  if (game.state === "caught") drawCaughtScreen();
}

function frame(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastTime) / 1000));
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

attach(canvas);
requestAnimationFrame(frame);
