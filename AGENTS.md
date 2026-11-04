# AGENTS.md — guide for AI agents and developers

«Тихий клас» (Quiet Class) is a classroom noise meter for smart boards, TVs and projectors.
Kids see sleeping ball-monsters; silence fills a per-class star jar, noise wakes the balls and plays an alert.
Live at **https://sivochka.com/bouncy/**. Teacher-facing docs: [docs/TEACHER_GUIDE.md](docs/TEACHER_GUIDE.md).

The audience is **teachers with little tech experience**, often on a projector 3–8 m from the kids.
Every UI decision should pass the test "a teacher understands it in one second, a kid can read it from the back row".

## Ground rules

- **Work on `main`.** Commit straight to `main` and push; the owner does not use feature branches.
- **UI language is Ukrainian.** Write user-visible text in plain Ukrainian a non-technical teacher understands
  ("Запам'ятати тишу", not "Калібрування DSP"). Keep technical terms (dB, HPF, RMS) out of the main UI.
- **No runtime dependencies.** Vanilla JS modules + Vite. Fonts come from `@fontsource`. Don't add frameworks.
- **No system emoji in the UI.** Icons are inline SVG from `src/ui/icons.js` (emoji in docs are fine).
- **Escape anything the teacher typed** (class names, prizes, device labels, snapshot labels) with `escapeHtml` from `src/ui/popover.js`
  before putting it into `innerHTML`. Remember that `el.dataset.x` returns the *unescaped* value.
- **Privacy:** audio never leaves the browser; nothing is sent anywhere. Don't add analytics or network calls.
- **Size for TV:** HUD and the class sidebar scale with `vmin`/`clamp()`. Settings panel and popovers use `px` (teacher-only, close range).
- **Light room:** every new color must work under `body.light-room` too (tokens at the top of `main.css`).
- **Style = Friendly Arcade** ([github.com/Figarist/friendly-arcade](https://github.com/Figarist/friendly-arcade)): solid tiles,
  2px borders on controls / 3px on cards and windows, radii `--r-sm/md/lg/pill`, green primary buttons with `--on-green` text,
  cyan `:focus-visible` ring, touch targets ≥ 44px. Use the arcade tokens (`--surface`, `--card`, `--green`…); the older names
  (`--ink`, `--panel`, `--glass-*`) are aliases declared on `body` so they follow `body.light-room`. Fonts stay Rubik/Nunito.
- **Class order** lives in `state.classOrder` (integer-like names such as "7" would otherwise jump to the top of an object);
  read it through `classNames(state)` from `storage.js`.

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 — add ?debug for a noise simulator bar (no mic needed)
npm run dev:test     # Vite dev server opening /?debug automatically
npm run serve:test   # Zero-dependency Node static server serving dist/ with ?debug
npm test             # Vitest, all pure logic
npm run build        # -> dist/
```

**Releasing = pushing to `main`.** `.github/workflows/deploy.yml` runs `npm test`, builds and publishes `dist/`
to GitHub Pages at https://sivochka.com/bouncy/ (this repo's own Pages site; `figarist.github.io` no longer holds a copy).
`dist/` is not committed. The service worker cache name and its precache list are filled in at build time by the
`sw-manifest` plugin in `vite.config.js`, so there is nothing to bump by hand. See [DEPLOY.md](DEPLOY.md).

## Architecture

```
src/main.js              GameApp: owns state, wires every module, runs the rAF loop
src/config.js            Mode thresholds, mic profiles, zone timings, star timing, physics constants
src/audio/               mic.js (Web Audio DSP chain + calibration), meter.js (dB → zone progress), sfx.js (synth)
src/game/zones.js        Green/yellow/red state machine with debounce + hysteresis
src/game/stars.js        StarManager: star progress per zone, golden combo, manual stars
src/game/session.js      Lesson mode + task timer (start / toggle / cancel)
src/game/storage.js      localStorage load/save, rolling snapshots, JSON backup import/export, pure class helpers
src/world/, src/render/  Verlet physics, particles, canvas renderer, 10 procedural themes
src/ui/hud.js            Top bar: traffic light + label, mode tabs, timer button/menu, big timer, star jar, gear
src/ui/class-sidebar.js  Draggable physical class window: cards, leaderboard sort, medals, drag reorder, class editor
src/ui/teacher-panel.js  Settings drawer: mic card, sensitivity, popovers (balls/scale, sound, backup, PWA install)
src/ui/popover.js        openPopover / closePopover / getOpenPopover / escapeHtml — one popover at a time
src/ui/icons.js          All SVG icons and theme preview illustrations
src/styles/main.css      Friendly Arcade tokens + light-room overrides, HUD, sidebar, panel, popovers
```

### State (`localStorage['tyhyi-klas:v1']`)

```js
{
  activeClass: '4-Б',
  classOrder: ['4-Б'],            // the teacher's manual order (see classNames())
  classes: {                       // object key order = the teacher's manual order
    '4-Б': {
      stars, goal, reward,         // current jar
      color, secondsPerStar,       // per-class look and difficulty (30 | 60 | 90)
      totalStars, tasksCompleted, cleanTasks, goalsReached, quietSeconds,
      prizeHistory: [{ reward, date /* ISO */ }],   // newest first, capped at 30
    },
  },
  settings: {
    mode, theme, sensitivity, balls,
    ballScale,                     // 0.2 .. 2.0 (step 0.1), default 1.0
    sidebarPos,                    // { x, y } in px or null for default CSS placement
    alertSound, alertRepeatSec, volume, lightRoom,
    ambientBaselineDb, micDeviceId, micProfile, micGain,
    sidebarCollapsed, sidebarSort,
  },
}
```

`StorageManager.load()`, `restoreSnapshot()` and `importBackup()` all go through `normalizeState()`: settings keep only keys
from `DEFAULT_STATE.settings` with the same type (numbers clamped), class records are rebuilt field by field with numbers
coerced. That is the XSS guard for backups shared between teachers, so new fields must get a default in `DEFAULT_STATE`
and a line in `normalizeClassRecord` / `normalizeSettings`. The class name is the key, so renaming and reordering
rebuild the object — use `renameClassRecord` / `reorderClassRecord`, never mutate keys in place.
`main.js` mutates `this.state` in-place on `onStateReload` so UI modules keep their shared `state` reference intact.

Backup & resilience features in `storage.js` (unit-tested in `tests/storage.test.js`):
- **Rolling snapshots (`localStorage['tyhyi-klas:snapshots']`)**: up to `MAX_SNAPSHOTS` (5) automatic restore points
  created via `StorageManager.takeSnapshot(state, label)` on class creation, deletion, star reset, goal completion,
  and before restoring or importing backups.
- **JSON file export/import**: `StorageManager.exportBackup(state)` and `StorageManager.importBackup(jsonString)`
  allow teachers to save and restore `.json` backups on a USB drive.
- **Persistent storage**: `StorageManager.requestPersistentStorage()` requests `navigator.storage.persist()` on startup.

### Physics & Dynamic Obstacles (`src/world/physics.js`, `src/world/ball.js`)

- **Fixed 60 Hz Verlet integration** with 3 substeps per frame and a spatial hash grid (`cellSize` adapts dynamically to ball radius).
- **Scale & stack stability**: `setBallScale(scale)` clamps scale to `0.2x..2.0x` and preserves damped Verlet velocities `(x - px, y - py)`
  when clamping positions so scale changes never inject phantom kinetic energy. `resolveBallCollisions()` sorts balls bottom-up (`_rank`),
  shifts both current `(x, y)` and previous `(px, py)` positions during overlap separation, applies floor-support mass weighting,
  and sandwiches ball-to-ball collisions between pre- and post-boundary passes so dense piles settle without infinite bounce.
- **Sub-stepped squash & roly-poly springs (`src/world/ball.js`)**: `updateAnimation()` integrates squash-and-stretch (`[0.72, 1.28]`)
  and upright roly-poly tilt (`±0.45 rad`) with 120 Hz sub-stepped semi-implicit Euler so frame drops up to `0.1 s` never cause spring resonance.
- **Shape-aware spheres & cubes**: `getBallExtent(b)` uses exact circle radius for spherical themes and a rotated rounded-square
  Minkowski support function for blocky themes (`craft`, `blox`), plus flat-face alignment torque on horizontal surfaces.
- **Interactive UI obstacles**:
  - `ClassSidebar` (`sidebarObstacle`): draggable floating window with interpolated substep movement, Minkowski rounded-rectangle
    corners (`border-radius: 20px`), and `computeUnpinchedEscape()` anti-crush protection when positioned close to arena walls.
  - `TeacherPanel` (`rightWallObstacle`): sliding right wall that pushes balls leftward when opening and bounds the arena while open.

## Verifying changes

- `npm test` must pass. Put new pure logic in `src/game/*` or `src/world/*` with a test in `tests/`.
- Check the UI in a browser with `?debug` (the built-in browser can't grant mic access; the debug bar's
  «Тиша / Шепіт / Крик!» buttons simulate levels). Check: dark and light room, sidebar dragging/expanded/collapsed/leaderboard,
  ball scale `0.2x..2.0x` across sphere and cube themes, class editor, settings popovers, backup export/import, and timer.
- Clear `localStorage['tyhyi-klas:v1']` after testing with fake classes.
