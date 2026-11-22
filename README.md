# VAULTBREAK

VAULTBREAK is a top-down stealth heist game played on a single 1280×720 canvas. You are a lone thief inside a bank at night: cross the lobby and teller hall without being seen, crack the vault's tumbler lock, load up on gold, cash and jewels — every kilo slows you down — and get back out to the getaway van before the guards, the cameras or the arriving police end the night. Stay unseen and unheard and you earn the GHOST bonus; never trip the alarm at all and you earn the CLEAN bonus on top.

## Systems

All of the following are implemented in plain JavaScript under `game/src/` — no engine, no assets, no build step:

1. **Hand-built bank level** (`level.js`) — a designed floor plan with 6 labelled areas (VAULT, OFFICES, SECURITY, TELLER HALL, LOBBY and the street/getaway strip): outer and interior walls with door gaps, a thick-walled vault chamber, teller counters, desks, pillars and planters that all block both movement and sight.
2. **Occluded guard vision cones** (`vision.js`) — each guard's cone is raycast against walls and cover, so cones visibly stop at counters and corners; line-of-sight checks use segment-vs-rectangle blocking, not just distance and angle.
3. **Guard AI** (`guards.js`) — four guards on hand-authored patrol routes with waypoint pauses, layered through five states: **patrol → pause → suspicious → investigate → alert**. Suspicion builds faster up close, while running, and slower while sneaking; guards also react to noise (running has a hearing radius, walking a small one, sneaking none), investigate last-seen positions, chase on alert and catch you on contact.
4. **Sweeping security cameras with a hackable control panel** (`cameras.js`) — five cameras sweep ±40° on a 6-second cycle with their own occluded cones; hold E at the security-office panel for 1.5 s to disable every camera for 25 s (40 s panel cooldown).
5. **3-tumbler vault cracking minigame** (`vault.js`) — at the vault door a dial opens: a needle sweeps back and forth, faster after each lock, and you press E inside the green zone to set each of the 3 tumblers. A miss reverses and speeds up the needle and nudges the alarm.
6. **Loot weight-vs-value carrying** (`player.js`, `level.js`) — ten loot stacks in the vault (gold, cash, jewels, bonds, art) each with a value and a weight; carried weight cuts your speed by 5% per kilo (55% floor) and grows the loot bag drawn on the thief's back.
7. **Alarm meter, wanted stars and police arrival timer** (`alarm.js`) — being seen feeds a 0–100 alarm meter; at 100 the alarm trips, wanted jumps to 3 stars and a 75-second police countdown starts — reach the van before it hits zero or the street is sealed. Partial sightings raise wanted and suspicion without tripping it.
8. **GHOST and CLEAN score bonuses** (`main.js`) — finish with a score breakdown: loot value, a time bonus that decays as the run lengthens, +$5,000 GHOST if you were never spotted and the alarm stayed under 40, and +$2,500 CLEAN if the alarm never tripped. Missed bonuses are shown as missed on the score screen.
9. **WebAudio synth sound + mute** (`audio.js`) — footsteps, suspicion ticks, alert and caught stings, camera beeps, tumbler clunks, the vault opening and the success chime are all synthesised with oscillators; no audio files. M toggles mute.
10. **Deterministic screenshot modes** (`shots.js`) — `?shot=play|vault|escape|end` (with optional `&seed=N`, default 1) stages a fixed representative scene by direct assignment and freezes the simulation, so screenshots are reproducible frame-for-frame. The first rendered frame sets `window.__shotReady = true`.

On top of that, the HUD shows a live **HIDDEN / SEEN!** eye indicator and an **off-screen objective marker** — an arrow pinned to the screen edge pointing at the vault, the nearest loot, or the van, depending on the phase.

## How to play

Serve the `game/` folder statically and open `index.html` in a browser, for example:

```sh
cd game
python3 -m http.server 8000
# then open http://localhost:8000/
```

Click or press Enter on the title screen to start. Sneak or walk past the guards and cameras, press E at the vault door and time three E presses inside the dial's green zone, walk over loot inside the vault to pick it up, then stand in the getaway van on the street to finish. Get caught — or let the police timer run out after tripping the alarm — and the run ends.

Screenshot modes: append `?shot=play`, `?shot=vault`, `?shot=escape` or `?shot=end` to the URL (optionally `&seed=2`) to load straight into that frozen scene.

## Controls

| Key | Action |
| --- | --- |
| WASD / Arrow keys | Move |
| Shift | Sneak (slower, silent, shorter detection range) |
| Space | Run (faster, noisy — guards hear you) |
| E | Interact: start/stop the vault dial, time a tumbler press, hold to hack the camera panel |
| P | Pause / resume |
| M | Mute / unmute |
| R | Restart (on end screens, or during play) |
| Enter / Click | Start from the title screen |

## Hand-in

`main.ts` is the hand-in program: it copies `game/` and (when present) `screenshots/` into the output directory (`MAKEFUN_OUTPUT_DIR`, default `/output`) and writes the `dossier.json` produced by `buildDossier` from `vendor/makefun-game.ts` as raw bytes.
