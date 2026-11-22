// render.js - all canvas drawing for VAULTBREAK.

import { WALLS, COVER, CAMERAS, ROOM_LABELS, VAULT_DOOR, VAULT_TARGET, PANEL, VAN } from "./level.js";

export const COLOURS = {
  floorA: "#1c2331",
  floorB: "#232d40",
  wall: "#55628a",
  street: "#14181f",
  player: "#ffb347",
  gold: "#ffd94d",
  alarmRed: "#ff5147",
  van: "#7fd4ff",
};

export function drawFloor(ctx) {
  ctx.fillStyle = COLOURS.street;
  ctx.fillRect(0, 0, 1280, 720);
  // Bank interior floor with a subtle checker per room area
  const tile = 40;
  for (let y = 16; y < 624; y += tile) {
    for (let x = 16; x < 1264; x += tile) {
      const checker = ((x / tile) | 0) + ((y / tile) | 0);
      ctx.fillStyle = checker % 2 === 0 ? COLOURS.floorA : COLOURS.floorB;
      ctx.fillRect(x, y, tile, tile);
    }
  }
  // Street strip
  ctx.fillStyle = COLOURS.street;
  ctx.fillRect(0, 640, 1280, 80);
  ctx.strokeStyle = "#e8e8e8";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 640);
  ctx.lineTo(1280, 640);
  ctx.stroke();
  ctx.strokeStyle = "#3a4356";
  ctx.beginPath();
  ctx.moveTo(0, 700);
  ctx.lineTo(1280, 700);
  ctx.stroke();
  // Room labels
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.font = "bold 13px sans-serif";
  ctx.textAlign = "left";
  for (const label of ROOM_LABELS) {
    ctx.fillText(label.text, label.x, label.y);
  }
}

export function drawWalls(ctx) {
  for (const wall of WALLS) {
    ctx.fillStyle = COLOURS.wall;
    ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
    ctx.fillStyle = "rgba(255,255,255,0.18)";
    ctx.fillRect(wall.x, wall.y, wall.w, 2);
  }
}

export function drawCover(ctx) {
  for (const item of COVER) {
    ctx.fillStyle = "#2e3a52";
    ctx.fillRect(item.x, item.y, item.w, item.h);
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 2;
    ctx.strokeRect(item.x + 1, item.y + 1, item.w - 2, item.h - 2);
    ctx.fillStyle = "rgba(255,255,255,0.14)";
    ctx.fillRect(item.x, item.y, item.w, 3);
  }
}

export function drawVault(ctx, game) {
  const open = game ? game.vaultOpen : false;
  const cx = VAULT_TARGET.x;
  const cy = VAULT_TARGET.y;
  // Vault door: a big circle at the door position when closed, swung aside when open
  const doorX = VAULT_DOOR.x + VAULT_DOOR.w / 2;
  const doorY = VAULT_DOOR.y + VAULT_DOOR.h / 2;
  ctx.save();
  if (open) {
    ctx.fillStyle = "#39445e";
    ctx.fillRect(VAULT_DOOR.x, VAULT_DOOR.y, VAULT_DOOR.w, VAULT_DOOR.h);
    ctx.beginPath();
    ctx.arc(doorX - 26, doorY, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#8a97b5";
    ctx.fill();
    ctx.strokeStyle = "#c7d0e4";
    ctx.lineWidth = 3;
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(doorX, doorY, 20, 0, Math.PI * 2);
    ctx.fillStyle = "#8a97b5";
    ctx.fill();
    ctx.strokeStyle = "#c7d0e4";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.strokeStyle = "#55628a";
    ctx.lineWidth = 3;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(doorX, doorY);
      ctx.lineTo(doorX + Math.cos(a) * 17, doorY + Math.sin(a) * 17);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(doorX, doorY, 5, 0, Math.PI * 2);
    ctx.fillStyle = COLOURS.gold;
    ctx.fill();
  }
  ctx.restore();
  void cx; void cy;
}

export function drawLoot(ctx, lootItems, game) {
  const now = game && typeof game.time === "number" ? game.time : 0;
  for (const item of lootItems) {
    if (item.taken) continue;
    ctx.save();
    ctx.translate(item.x, item.y);
    if (item.kind === "gold") {
      ctx.fillStyle = COLOURS.gold;
      ctx.fillRect(-10, -4, 20, 7);
      ctx.fillRect(-7, -11, 14, 7);
    } else if (item.kind === "cash") {
      ctx.fillStyle = "#3fae5a";
      ctx.fillRect(-10, -6, 20, 12);
      ctx.fillStyle = "#bff0c8";
      ctx.fillRect(-3, -3, 6, 6);
    } else if (item.kind === "jewels") {
      ctx.fillStyle = "#57e6e6";
      ctx.beginPath();
      ctx.moveTo(0, -9); ctx.lineTo(8, 0); ctx.lineTo(0, 9); ctx.lineTo(-8, 0);
      ctx.closePath(); ctx.fill();
    } else if (item.kind === "bonds") {
      ctx.fillStyle = "#e8e2d0";
      ctx.fillRect(-9, -7, 18, 14);
      ctx.fillStyle = "#9a927c";
      ctx.fillRect(-9, -2, 18, 2);
    } else if (item.kind === "art") {
      ctx.fillStyle = "#7a4a21";
      ctx.fillRect(-11, -9, 22, 18);
      ctx.fillStyle = "#7fb2d9";
      ctx.fillRect(-8, -6, 16, 12);
    }
    ctx.restore();
  }
  // Glowing marker at the vault centre
  const pulse = 14 + Math.sin(now * 3) * 3;
  ctx.save();
  ctx.strokeStyle = COLOURS.gold;
  ctx.lineWidth = 3;
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(VAULT_TARGET.x, VAULT_TARGET.y, pulse, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.fillStyle = COLOURS.gold;
  ctx.font = "bold 11px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VAULT", VAULT_TARGET.x, VAULT_TARGET.y - pulse - 6);
  ctx.restore();
}

export function drawCameraCones(ctx, cameras) {
  // Session 2 adds sweep cones; cameras are passed in for that work.
  void ctx; void cameras;
}

export function drawCameras(ctx) {
  drawCameraCones(ctx, CAMERAS);
  for (const camera of CAMERAS) {
    ctx.fillStyle = "#10131a";
    ctx.fillRect(camera.x - 7, camera.y - 7, 14, 14);
    ctx.strokeStyle = "#55628a";
    ctx.lineWidth = 2;
    ctx.strokeRect(camera.x - 7, camera.y - 7, 14, 14);
    ctx.beginPath();
    ctx.arc(camera.x, camera.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLOURS.alarmRed;
    ctx.fill();
  }
}

export function drawPanel(ctx) {
  ctx.fillStyle = "#10131a";
  ctx.fillRect(PANEL.x, PANEL.y, PANEL.w, PANEL.h);
  ctx.fillStyle = "#1f6f4a";
  ctx.fillRect(PANEL.x + 5, PANEL.y + 5, PANEL.w - 10, PANEL.h - 16);
  ctx.fillStyle = "#d7ffe8";
  ctx.font = "9px monospace";
  ctx.textAlign = "center";
  ctx.fillText("CAM", PANEL.x + PANEL.w / 2, PANEL.y + PANEL.h - 3);
}

export function drawVan(ctx) {
  ctx.save();
  ctx.fillStyle = COLOURS.van;
  const r = 10;
  ctx.beginPath();
  ctx.roundRect(VAN.x, VAN.y, VAN.w, VAN.h, r);
  ctx.fill();
  ctx.fillStyle = "#17384a";
  ctx.fillRect(VAN.x + 18, VAN.y + 10, 42, 18);
  ctx.fillRect(VAN.x + 72, VAN.y + 10, 42, 18);
  ctx.fillStyle = "rgba(10,20,30,0.55)";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("GETAWAY", VAN.x + VAN.w / 2, VAN.y + VAN.h - 8);
  ctx.fillStyle = "#10131a";
  ctx.beginPath(); ctx.arc(VAN.x + 36, VAN.y + VAN.h, 10, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(VAN.x + VAN.w - 36, VAN.y + VAN.h, 10, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

export function drawPlayer(ctx, player) {
  ctx.save();
  ctx.translate(player.x, player.y);
  // Loot bag on the back, growing with carried weight
  if (player.carriedWeight > 0) {
    const bagSize = 7 + Math.min(10, player.carriedWeight);
    ctx.fillStyle = "#6b4f1d";
    ctx.beginPath();
    ctx.arc(-player.dirX * 12, -player.dirY * 12, bagSize, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = COLOURS.gold;
    ctx.font = "bold 10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("$", -player.dirX * 12, -player.dirY * 12 + 3);
  }
  ctx.beginPath();
  ctx.arc(0, 0, player.r, 0, Math.PI * 2);
  ctx.fillStyle = COLOURS.player;
  ctx.fill();
  ctx.strokeStyle = "#7a3b00";
  ctx.lineWidth = 2;
  ctx.stroke();
  // Mask stripe
  ctx.save();
  ctx.rotate(player.facing);
  ctx.fillStyle = "#1c2331";
  ctx.fillRect(1, -7, 9, 5);
  ctx.restore();
  // Direction tick
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(player.dirX * 15, player.dirY * 15);
  ctx.stroke();
  ctx.restore();
}

function objectiveForPhase(phase) {
  if (phase === "infiltrate") return "Reach the vault";
  if (phase === "crack") return "Crack the vault: hold E at the door";
  if (phase === "loot") return "Grab loot \u2014 heavier is slower";
  if (phase === "escape") return "Escape to the van!";
  return "Reach the vault";
}

export function drawHUD(ctx, game, player) {
  // Top bar background
  ctx.fillStyle = "rgba(8,11,18,0.88)";
  ctx.fillRect(0, 0, 1280, 44);
  // Alarm meter
  const alarm = Math.max(0, Math.min(100, game.alarm || 0));
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText("ALARM", 16, 27);
  ctx.fillStyle = "#2a3247";
  ctx.fillRect(70, 14, 220, 16);
  ctx.fillStyle = alarm >= 80 ? COLOURS.alarmRed : alarm >= 40 ? "#ffb347" : "#3fae5a";
  ctx.fillRect(70, 14, 220 * (alarm / 100), 16);
  ctx.strokeStyle = "#55628a";
  ctx.strokeRect(70, 14, 220, 16);
  // Wanted stars
  const wanted = game.wanted || 0;
  ctx.font = "18px sans-serif";
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < wanted ? COLOURS.gold : "rgba(255,255,255,0.25)";
    ctx.fillText("\u2605", 306 + i * 22, 29);
  }
  // Loot tally
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 14px sans-serif";
  ctx.fillText("LOOT $" + (player.carriedValue || 0) + " (" + (player.carriedWeight || 0) + " kg)", 400, 28);
  // Police timer
  if (typeof game.policeTimer === "number") {
    ctx.fillStyle = COLOURS.alarmRed;
    ctx.textAlign = "right";
    ctx.fillText("POLICE " + Math.max(0, Math.ceil(game.policeTimer)) + "s", 1264, 28);
    ctx.textAlign = "left";
  }
  // Objective line
  ctx.fillStyle = COLOURS.gold;
  ctx.font = "bold 14px sans-serif";
  ctx.textAlign = "center";
  const objective = game.objective || objectiveForPhase(game.phase);
  ctx.fillText(objective, 840, 28);
  ctx.textAlign = "left";
  // Controls hint at the bottom
  ctx.fillStyle = "rgba(255,255,255,0.55)";
  ctx.font = "12px sans-serif";
  ctx.fillText("WASD move \u00b7 Shift sneak \u00b7 Space run \u00b7 E interact \u00b7 P pause \u00b7 M mute", 16, 712);
  if (game.muted) {
    ctx.fillStyle = COLOURS.alarmRed;
    ctx.textAlign = "right";
    ctx.fillText("MUTED", 1264, 712);
    ctx.textAlign = "left";
  }
}

export function drawTitleScreen(ctx) {
  ctx.fillStyle = "#0b0f16";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = COLOURS.gold;
  ctx.font = "bold 84px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("VAULTBREAK", 640, 280);
  ctx.fillStyle = "#d7deee";
  ctx.font = "24px sans-serif";
  ctx.fillText("one night, one vault, no witnesses", 640, 325);
  ctx.font = "18px sans-serif";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("WASD move \u00b7 Shift sneak \u00b7 Space run \u00b7 E interact \u00b7 P pause \u00b7 M mute", 640, 410);
  ctx.fillStyle = COLOURS.van;
  ctx.font = "bold 20px sans-serif";
  ctx.fillText("Click or press Enter to start", 640, 470);
  ctx.textAlign = "left";
}

export function drawPauseOverlay(ctx) {
  ctx.fillStyle = "rgba(5,8,14,0.72)";
  ctx.fillRect(0, 0, 1280, 720);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 48px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("PAUSED", 640, 350);
  ctx.font = "18px sans-serif";
  ctx.fillText("Press P to resume \u00b7 R to restart", 640, 395);
  ctx.textAlign = "left";
}
