// alarm.js - alarm level, police response and GHOST tracking.
export function createAlarm() {
  return {
    alarm: 0, tripped: false, policeTimer: null, wanted: 0,
    ghost: true, everTripped: false, spottedEver: false, maxAlarm: 0,
  };
}
export function raiseAlarm(state, amount) {
  if (!amount) return state;
  state.alarm = Math.max(0, Math.min(100, state.alarm + amount));
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  if (state.alarm >= 40) state.ghost = false;
  if (state.alarm >= 100) tripAlarm(state);
  return state;
}
export function tripAlarm(state) {
  if (!state.tripped) {
    state.tripped = true; state.everTripped = true; state.policeTimer = 75;
  }
  state.wanted = 3; state.alarm = 100; state.ghost = false;
  return state;
}
export function markSpotted(state) {
  state.spottedEver = true; state.ghost = false;
  state.wanted = Math.max(state.wanted, 1);
  if (state.alarm < 60) state.alarm = 60;
  state.maxAlarm = Math.max(state.maxAlarm, state.alarm);
  return state;
}
export function updateAlarm(state, dt, detecting) {
  if (!detecting) {
    // Slow decay, but a tripped alarm stays tripped.
    state.alarm = Math.max(state.tripped ? 60 : 0, state.alarm - 1.5 * dt);
  }
  if (state.tripped && typeof state.policeTimer === "number") {
    state.policeTimer -= dt;
  }
  return state;
}
