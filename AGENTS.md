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
- **Escape anything the teacher typed** (class names, prizes, device labels) with `escapeHtml` from `src/ui/popover.js`
  before putting it into `innerHTML`. Remember that `el.dataset.x` returns the *unescaped* value.
- **Privacy:** audio never leaves the browser; nothing is sent anywhere. Don't add analytics or network calls.
- **Size for TV:** HUD and the class sidebar scale with `vmin`/`clamp()`. Settings panel and popovers use `px` (teacher-only, close range).
- **Light room:** every new color must work under `body.light-room` too (tokens at the top of `main.css`).

## Commands

```bash
npm install
npm run dev          # http://localhost:5173 — add ?debug for a noise simulator bar (no mic needed)
npm test             # Vitest, all pure logic
npm run build        # -> dist/
npm run deploy:site  # build + rsync dist/ into ../figarist.github.io/bouncy/ (then commit & push that repo)
```

Release checklist: bump `CACHE_NAME` in `public/sw.js` (otherwise teachers' offline PWA keeps the old version),
`npm test`, `npm run build`, commit `dist/` here, `npm run deploy:site`, commit + push `../figarist.github.io`.
See [DEPLOY.md](DEPLOY.md).

## Architecture

```
src/main.js              GameApp: owns state, wires every module, runs the rAF loop
src/config.js            Mode thresholds, mic profiles, zone timings, star timing, physics constants
src/audio/               mic.js (Web Audio DSP chain + calibration), meter.js (dB → zone progress), sfx.js (synth)
src/game/zones.js        Green/yellow/red state machine with debounce + hysteresis
src/game/stars.js        StarManager: star progress per zone, golden combo, manual stars
src/game/session.js      Lesson mode + task timer (start / toggle / cancel)
src/game/storage.js      localStorage load/save + pure class helpers (see below)
src/world/, src/render/  Verlet physics, particles, canvas renderer, 10 procedural themes
src/ui/hud.js            Top bar: traffic light + label, mode tabs, timer button/menu, big timer, star jar, gear
src/ui/class-sidebar.js  Left class list: cards, leaderboard sort, medals, drag reorder, class editor popover
src/ui/teacher-panel.js  Settings drawer: mic card, sensitivity, rows that open popovers
src/ui/popover.js        openPopover / closePopover / getOpenPopover / escapeHtml — one popover at a time
src/ui/icons.js          All SVG icons and theme preview illustrations
src/styles/main.css      Tokens, Liquid Glass surfaces, HUD, sidebar, panel, popovers
```

### State (`localStorage['tyhyi-klas:v1']`)

```js
{
  activeClass: '4-Б',
  classes: {                       // object key order = the teacher's manual order
    '4-Б': {
      stars, goal, reward,         // current jar
      color, secondsPerStar,       // per-class look and difficulty (30 | 60 | 90)
      totalStars, tasksCompleted, cleanTasks, goalsReached, quietSeconds,
      prizeHistory: [{ reward, date /* ISO */ }],   // newest first, capped at 30
    },
  },
  settings: { mode, theme, sensitivity, balls, alertSound, alertRepeatSec, volume, lightRoom,
              ambientBaselineDb, micDeviceId, micProfile, micGain, sidebarCollapsed, sidebarSort },
}
```

`StorageManager.load()` normalizes old saves (fills `color`, `secondsPerStar`, `prizeHistory`), so new fields
must get a default there **and** in `createClassRecord`. The class name is the key, so renaming and reordering
rebuild the object — use `renameClassRecord` / `reorderClassRecord`, never mutate keys in place.
`main.js` replaces `state.classes` on rename/reorder; UI modules keep a reference to `state`, not to `state.classes`.

Pure helpers in `storage.js` (all unit-tested in `tests/storage.test.js`):
`createClassRecord`, `renameClassRecord`, `reorderClassRecord`, `rankClasses` (top-3 by `totalStars`, ties share a place),
`recordPrize`, `nextClassColor`, plus `CLASS_COLORS`, `STAR_SPEEDS`, `MAX_CLASS_NAME_LENGTH`.

### Data flow

- The loop in `main.js` samples the mic → `evaluateLevel` → `ZoneStateMachine` → physics/alerts → `StarManager`
  → timer → render → HUD. A star or a finished timer updates the active class record, calls `saveState()`
  and `sidebar.update()`.
- UI modules never touch storage. They get `state` (read-only by convention) and call back into `main.js`
  (`getSidebarCallbacks()`, `getPanelCallbacks()`, the HUD callbacks object), which mutates state and saves.
- `sidebar.update()` re-renders the cards (skipped while the teacher types a new class or drags a card) and
  refreshes numbers in an open class editor without rebuilding it, so inputs keep focus.
- Popovers live on `document.body` (z-index 200). The class sidebar sits *below* the HUD layer (z 9 < 10)
  so alert banners and the goal modal cover it; the HUD container is `pointer-events: none`, so cards stay clickable.
- `TeacherPanel.$(selector)` searches the panel and the popover it opened (mic gain/meter live in a popover).

## Verifying changes

- `npm test` must pass. Put new pure logic in `src/game/*` with a test next to the existing ones.
- Check the UI in a browser with `?debug` (the built-in browser can't grant mic access; the debug bar's
  «Тиша / Шепіт / Крик!» buttons simulate levels). Check: dark and light room, sidebar expanded/collapsed/leaderboard,
  class editor, settings popovers, timer + big timer, and a ~375 px wide viewport.
- Clear `localStorage['tyhyi-klas:v1']` after testing with fake classes.
