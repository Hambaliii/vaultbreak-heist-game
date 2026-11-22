// player.js - the thief: movement, collision sliding, carry weight and noise.

import { PLAYER_START, isBlocked } from "./level.js";

export const WALK_SPEED = 155;
export const SNEAK_SPEED = 80;
export const RUN_SPEED = 245;

export function createPlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    r: 11,
    radius: 11,
    carriedLoot: [],
    carriedValue: 0,
    carriedWeight: 0,
    dirX: 1,
    dirY: 0,
    facing: 0,
    moving: false,
    sneaking: false,
    running: false,
    noiseRadius: 0,
    speed: WALK_SPEED,
  };
}

function keyDown(input, code) {
  if (!input) return false;
  if (typeof input.isDown === "function") return input.isDown(code);
  if (input.keys && typeof input.keys.has === "function") return input.keys.has(code);
  return false;
}

export function updatePlayer(player, input, dt) {
  let dx = 0;
  let dy = 0;
  if (keyDown(input, "KeyA") || keyDown(input, "ArrowLeft")) dx -= 1;
  if (keyDown(input, "KeyD") || keyDown(input, "ArrowRight")) dx += 1;
  if (keyDown(input, "KeyW") || keyDown(input, "ArrowUp")) dy -= 1;
  if (keyDown(input, "KeyS") || keyDown(input, "ArrowDown")) dy += 1;

  player.moving = dx !== 0 || dy !== 0;
  player.sneaking = keyDown(input, "ShiftLeft") || keyDown(input, "ShiftRight");
  player.running = keyDown(input, "Space") && player.moving && !player.sneaking;

  if (!player.moving) {
    player.noiseRadius = 0;
    player.speed = WALK_SPEED;
    return player;
  }

  const length = Math.hypot(dx, dy) || 1;
  dx /= length;
  dy /= length;
  player.dirX = dx;
  player.dirY = dy;
  player.facing = Math.atan2(dy, dx);

  let baseSpeed = WALK_SPEED;
  if (player.sneaking) baseSpeed = SNEAK_SPEED;
  else if (player.running) baseSpeed = RUN_SPEED;

  const weightMultiplier = Math.max(0.55, 1 - 0.05 * player.carriedWeight);
  const speed = baseSpeed * weightMultiplier;
  player.speed = speed;

  if (player.sneaking) player.noiseRadius = 0;
  else if (player.running) player.noiseRadius = 85;
  else player.noiseRadius = 26;

  const nextX = player.x + dx * speed * dt;
  if (!isBlocked(nextX, player.y, player.r)) {
    player.x = nextX;
  }
  const nextY = player.y + dy * speed * dt;
  if (!isBlocked(player.x, nextY, player.r)) {
    player.y = nextY;
  }
  return player;
}

export function addLoot(player, item) {
  player.carriedLoot.push(item);
  player.carriedValue += item.value;
  player.carriedWeight += item.weight;
}
