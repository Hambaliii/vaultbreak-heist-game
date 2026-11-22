// audio.js - WebAudio synth only, no files. Lazy context on first gesture.
let ctx = null, master = null, muted = false;
function ensure() {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC(); master = ctx.createGain(); master.gain.value = muted ? 0 : 0.5; master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : 0.5; }
export function isMuted() { return muted; }
function tone(freq, dur, vol, type = "sine", slideTo = null, delay = 0) {
  const ac = ensure(); if (!ac || muted) return;
  const t0 = ac.currentTime + delay;
  const o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
  o.connect(g); g.connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
export function playFootstep(quiet) { tone(quiet ? 90 : 120, 0.07, quiet ? 0.03 : 0.06, "triangle"); }
export function playSuspicionTick() { tone(880, 0.06, 0.05, "square"); }
export function playAlertSting() { tone(520, 0.28, 0.12, "sawtooth", 180); tone(520, 0.28, 0.08, "square", 180, 0.05); }
export function playCameraBeep() { tone(1320, 0.07, 0.05, "sine"); }
export function playTumblerClunk() { tone(220, 0.09, 0.12, "square", 140); tone(90, 0.08, 0.08, "triangle"); }
export function playVaultOpen() { tone(160, 0.5, 0.12, "sawtooth", 60); tone(440, 0.3, 0.08, "sine", 660, 0.35); }
export function playLootPickup() { tone(740, 0.09, 0.07, "sine", 990); }
export function playSuccessChime() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, 0.09, "sine", null, i * 0.11)); }
export function playCaughtSting() { tone(300, 0.6, 0.14, "sawtooth", 70); tone(200, 0.6, 0.1, "square", 55, 0.08); }
