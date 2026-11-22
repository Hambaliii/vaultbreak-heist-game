// input.js - keyboard state tracker and mouse position/click for VAULTBREAK.

export const keys = new Set();
export const mouse = { x: 0, y: 0, clicked: false, down: false };

let targetCanvas = null;

function onKeyDown(event) {
  keys.add(event.code);
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(event.code)) {
    event.preventDefault();
  }
}

function onKeyUp(event) {
  keys.delete(event.code);
}

function onMouseMove(event) {
  if (!targetCanvas) return;
  const rect = targetCanvas.getBoundingClientRect();
  const scaleX = targetCanvas.width / rect.width;
  const scaleY = targetCanvas.height / rect.height;
  mouse.x = (event.clientX - rect.left) * scaleX;
  mouse.y = (event.clientY - rect.top) * scaleY;
}

function onMouseDown(event) {
  onMouseMove(event);
  mouse.clicked = true;
  mouse.down = true;
}

function onMouseUp() {
  mouse.down = false;
}

export function isDown(code) {
  return keys.has(code);
}

export function attach(canvas) {
  targetCanvas = canvas || null;
  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  if (targetCanvas) {
    targetCanvas.addEventListener("mousemove", onMouseMove);
    targetCanvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);
  }
}

export function detach() {
  window.removeEventListener("keydown", onKeyDown);
  window.removeEventListener("keyup", onKeyUp);
  if (targetCanvas) {
    targetCanvas.removeEventListener("mousemove", onMouseMove);
    targetCanvas.removeEventListener("mousedown", onMouseDown);
    window.removeEventListener("mouseup", onMouseUp);
  }
  targetCanvas = null;
  keys.clear();
}

export function consumeClick() {
  const was = mouse.clicked;
  mouse.clicked = false;
  return was;
}

export const input = { keys, mouse, isDown, attach, detach, consumeClick };
