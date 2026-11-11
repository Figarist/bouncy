import './styles/main.css';
import { CONFIG } from './config.js';
import { evaluateLevel } from './audio/meter.js';
import { MicrophoneInput } from './audio/mic.js';
import { sfx } from './audio/sfx.js';
import { ZoneStateMachine } from './game/zones.js';
import { StarManager } from './game/stars.js';
import { SessionManager } from './game/session.js';
import {
  StorageManager,
  createClassRecord,
  renameClassRecord,
  reorderClassRecord,
  classNames,
  nextClassColor,
  recordPrize,
  resolveAlertSound,
  MAX_CLASS_NAME_LENGTH,
} from './game/storage.js';
import {
  getAllCustomSounds,
  addCustomSoundFile,
  deleteCustomSound,
} from './audio/sound-library.js';
import { PhysicsWorld } from './world/physics.js';
import { CanvasRenderer } from './render/renderer.js';
import { HUD } from './ui/hud.js';
import { TeacherPanel } from './ui/teacher-panel.js';
import { ClassSidebar } from './ui/class-sidebar.js';
import { getOpenPopover } from './ui/popover.js';
import { HotkeyManager } from './ui/hotkeys.js';
import { SetupWizard } from './ui/setup-wizard.js';
import { IntroOverlay } from './ui/intro.js';
import { iconLab } from './ui/icons.js';
import { initServiceWorker } from './ui/update-notice.js';
import { TabIndicator } from './ui/tab-indicator.js';
import {
  BackgroundWatchdog,
  BackgroundTicker,
  clampSimulationDt,
} from './game/bg-watchdog.js';

class GameApp {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.state = StorageManager.load();

    // Core engines
    this.physics = new PhysicsWorld();
    this.renderer = new CanvasRenderer(this.canvas);
    this.mic = new MicrophoneInput();
    this.mic.ambientBaselineDb = this.state.settings.ambientBaselineDb || -55;
    this.mic.deviceId = this.state.settings.micDeviceId || '';
    this.setupWizard = null;

    // Game state
    const modeCfg = CONFIG.modes[this.state.settings.mode] || CONFIG.modes.quiet;
    this.session = new SessionManager({ initialMode: modeCfg.id });

    const activeClass = this.state.activeClass;
    const classData = this.state.classes[activeClass] || createClassRecord();

    this.stars = new StarManager({
      secondsPerStar: classData.secondsPerStar || CONFIG.stars.secondsPerStar,
      goldenComboSeconds: CONFIG.stars.goldenComboSeconds,
      initialStars: classData.stars,
      goal: classData.goal,
    });

    this.zones = new ZoneStateMachine({
      enterYellowMs: CONFIG.zones.enterYellowMs,
      exitYellowMs: CONFIG.zones.exitYellowMs,
      enterRedMs: CONFIG.zones.enterRedMs,
      exitRedMs: CONFIG.zones.exitRedMs,
      hysteresisDb: CONFIG.zones.hysteresisDb,
    });

    // UI
    this.hud = new HUD({
      onModeChange: (modeId) => this.switchMode(modeId),
      onQuickCalibrate: () => this.calibrateMic(),
      onPanelToggle: () => this.panel.toggle(),
      onTimerToggle: () => this.session.toggleTimer(),
      onTimerStart: (minutes) => this.session.startTimer(minutes),
      onTimerCancel: () => this.session.cancelTimer(),
      onResetGoal: () => this.resetCurrentStars(),
    });
    this.hud.updateMode(modeCfg.id);
    this.hud.setClassName(activeClass, classData.color);

    this.panel = new TeacherPanel(this.state, this.getPanelCallbacks());
    this.sidebar = new ClassSidebar(this.state, this.getSidebarCallbacks());

    // Sound volume init
    sfx.setVolume(this.state.settings.volume);
    this.alertEscalationStep = 0;
    this.customSoundIds = new Set();
    this.initCustomSounds();

    // Initial setup
    this.renderer.setTheme(this.state.settings.theme);
    this.physics.setTheme(this.state.settings.theme);
    this.physics.setBallScale(this.state.settings.ballScale ?? 1.0);
    this.applyLightRoom(this.state.settings.lightRoom);

    // Request persistent storage protection
    StorageManager.requestPersistentStorage();

    // Listen for PWA installation prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      this.panel.setDeferredInstallPrompt(e);
    });

    // State
    this.lastFrameTime = performance.now();
    this.lastTimerWallTime = this.lastFrameTime;
    this.lastWorkerStepTime = this.lastFrameTime;
    this.lastAlertTime = 0;
    this.quietStatSaveTimer = 0;
    this.isPaused = false;
    this.wasCalibrating = false;
    this.cursorTimer = null;
    this.pointerTarget = { x: null, y: null };
    this.displayedStars = classData.stars;
    this.hasCelebratedGoal = classData.stars >= classData.goal;
    this.latestTickState = null;

    // Background execution: real-time AudioWorklet + Web Worker fallback/watchdog + tab indicator
    this.tabIndicator = new TabIndicator();
    this.watchdog = new BackgroundWatchdog(CONFIG.background);
    this.bgTicker = new BackgroundTicker(CONFIG.background.workerTickMs, () => {
      this.onBackgroundWorkerTick();
    });
    this.mic.onAudioBlock = (rawDb, dtMs) => {
      this.onMicAudioBlock(rawDb, dtMs);
    };

    // Debug Simulator (?debug)
    this.simulatedDb = null;
    this.checkDebugMode();

    // Bindings
    this.initPointers();
    this.initResize();
    this.initHotkeys();
    this.initCursorHide();
    this.initVisibilityHandling();

    // Start with Intro
    new IntroOverlay(() => {
      this.startLesson();
    });

    // Start animation loop
    requestAnimationFrame(this.loop.bind(this));
  }

  async toggleMicrophone() {
    const listening = await this.mic.toggle();
    this.panel.setMicButtonState(listening);
    if (listening) {
      const devices = await this.mic.listDevices();
      this.panel.populateAudioDevices(devices, this.mic.deviceId);
    } else if (this.mic.error) {
      this.hud.showMicBlockedHelp();
    }
    return listening;
  }

  switchClass(className) {
    if (!this.state.classes[className]) return;
    this.state.activeClass = className;
    const cData = this.state.classes[className];
    this.stars.stars = cData.stars;
    this.stars.goal = cData.goal;
    this.stars.secondsPerStar = cData.secondsPerStar || CONFIG.stars.secondsPerStar;
    this.stars.resetProgress();
    this.displayedStars = cData.stars;
    this.hasCelebratedGoal = cData.stars >= cData.goal;
    this.saveState();
    this.hud.setClassName(className, cData.color);
    this.hud.updateStars(this.displayedStars, this.stars.goal, 0, false, cData.reward);
    this.sidebar.update();
  }

  getSidebarCallbacks() {
    return {
      onSelect: (className) => this.switchClass(className),
      onAdd: (rawName) => {
        const name = rawName.trim().slice(0, MAX_CLASS_NAME_LENGTH);
        if (!name || Object.hasOwn(this.state.classes, name)) return false;
        this.state.classes[name] = createClassRecord({ color: nextClassColor(this.state.classes) });
        this.state.classOrder = [...classNames(this.state).filter((n) => n !== name), name];
        this.switchClass(name);
        StorageManager.takeSnapshot(this.state, `Додано «${name}»`);
        return true;
      },
      onRename: (oldName, newName) => {
        const next = renameClassRecord(this.state.classes, oldName, newName);
        if (!next) return false;
        const renamed = Object.keys(next).find((n) => !Object.hasOwn(this.state.classes, n)) || oldName;
        this.state.classOrder = classNames(this.state).map((n) => (n === oldName ? renamed : n));
        this.state.classes = next;
        if (this.state.activeClass === oldName) this.state.activeClass = renamed;
        this.saveState();
        this.hud.setClassName(this.state.activeClass, next[this.state.activeClass]?.color);
        return true;
      },
      onReorder: (className, toIndex) => {
        const next = reorderClassRecord(classNames(this.state), className, toIndex);
        if (!next) return;
        this.state.classOrder = next;
        this.saveState();
      },
      onColorChange: (color) => {
        const cData = this.state.classes[this.state.activeClass];
        if (!cData) return;
        cData.color = color;
        this.saveState();
        this.hud.setClassName(this.state.activeClass, color);
      },
      onStarSpeedChange: (seconds) => {
        const cData = this.state.classes[this.state.activeClass];
        if (!cData) return;
        cData.secondsPerStar = seconds;
        this.stars.secondsPerStar = seconds;
        this.saveState();
      },
      onDelete: (className) => {
        const keys = Object.keys(this.state.classes);
        if (keys.length <= 1) return;
        StorageManager.takeSnapshot(this.state, `Перед видаленням «${className}»`);
        delete this.state.classes[className];
        this.state.classOrder = classNames(this.state);
        this.switchClass(this.state.classOrder[0]);
      },
      onGoalChange: (goal, reward) => {
        const cData = this.state.classes[this.state.activeClass];
        if (!cData) return;
        cData.goal = goal;
        cData.reward = reward;
        this.stars.goal = goal;
        this.hasCelebratedGoal = this.stars.stars >= goal;
        this.saveState();
        this.hud.updateStars(this.stars.stars, this.stars.goal, 0, false, reward);
      },
      onAddStar: () => this.awardStarWithFlight(),
      onClassSoundChange: (className, soundId) => {
        const cData = this.state.classes[className];
        if (!cData) return;
        cData.alertSound = soundId;
        this.saveState();
      },
      onPreviewSound: (soundId) => {
        if (soundId && soundId !== 'none') {
          sfx.playAlert(soundId, 1.0);
        }
      },
      onAddTask: () => {
        const cData = this.state.classes[this.state.activeClass];
        if (!cData) return;
        cData.tasksCompleted = (cData.tasksCompleted || 0) + 1;
        sfx.playChime();
        this.saveState();
        this.sidebar.update();
      },
      onResetStars: () => this.resetCurrentStars(),
      onCollapseChange: (collapsed) => {
        this.state.settings.sidebarCollapsed = collapsed;
        this.saveState();
      },
      onSortChange: (sort) => {
        this.state.settings.sidebarSort = sort;
        this.saveState();
      },
      onSaveState: () => {
        this.saveState();
      },
    };
  }

  getPanelCallbacks() {
    return {
      onMicToggle: async () => {
        await this.toggleMicrophone();
      },
      onCalibrate: () => {
        this.calibrateMic();
      },
      onDeviceChange: async (deviceId) => {
        this.state.settings.micDeviceId = deviceId;
        this.saveState();
        await this.mic.switchDevice(deviceId);
      },
      onRunWizard: () => {
        this.openSetupWizard();
      },
      onSensitivity: (val) => {
        this.state.settings.sensitivity = val;
        this.saveState();
      },
      onBalls: (val) => {
        this.state.settings.balls = val;
        this.physics.setBallCount(val);
        this.saveState();
      },
      onBallScale: (scale) => {
        this.state.settings.ballScale = scale;
        this.physics.setBallScale(scale);
        this.saveState();
      },
      onStateReload: (nextState) => {
        // Mutate in-place so UI modules keep their shared `this.state` reference intact
        this.state.activeClass = nextState.activeClass;
        this.state.classes = nextState.classes;
        this.state.classOrder = nextState.classOrder;
        Object.assign(this.state.settings, nextState.settings);

        const s = this.state.settings;
        const modeCfg = this.session.setMode(s.mode);
        this.hud.updateMode(modeCfg.id);

        this.renderer.setTheme(s.theme);
        this.physics.setTheme(s.theme);
        this.physics.setBallScale(s.ballScale ?? 1.0);
        this.physics.setBallCount(s.balls);

        this.applyLightRoom(s.lightRoom);
        sfx.setVolume(s.volume);

        this.mic.ambientBaselineDb = s.ambientBaselineDb || -55;
        this.mic.deviceId = s.micDeviceId || '';

        this.switchClass(this.state.activeClass);
        this.sidebar.render();
        this.sidebar.applySavedPosition();

        this.panel.render();
        this.panel.bindEvents();
        this.panel.setMicButtonState(this.mic.isListening);
        this.saveState();
      },
      onTheme: (theme) => {
        this.state.settings.theme = theme;
        this.renderer.setTheme(theme);
        this.physics.setTheme(theme);
        this.saveState();
      },
      onSound: (sound, preview = false) => {
        this.state.settings.alertSound = sound;
        this.saveState();
        if (preview && sound !== 'none') {
          sfx.playAlert(sound, 1.0);
        }
      },
      onAddCustomSound: async (file) => {
        sfx.ensureContext();
        const res = await addCustomSoundFile(file, sfx.ctx);
        if (res?.id) {
          await this.initCustomSounds();
          this.state.settings.alertSound = res.id;
          this.saveState();
          sfx.playAlert(res.id, 1.0);
        }
        return res;
      },
      onDeleteCustomSound: async (soundId) => {
        await deleteCustomSound(soundId);
        await this.initCustomSounds();
        if (this.state.settings.alertSound === soundId) {
          this.state.settings.alertSound = 'shush';
        }
        // Also cleanup class sound references if deleted
        Object.values(this.state.classes).forEach((c) => {
          if (c.alertSound === soundId) c.alertSound = '';
        });
        this.saveState();
      },
      onRepeatChange: (sec) => {
        this.state.settings.alertRepeatSec = sec;
        this.saveState();
      },
      onVolume: (vol, preview = false) => {
        this.state.settings.volume = vol;
        sfx.setVolume(vol);
        this.saveState();
        if (preview && vol > 0) {
          const sound = resolveAlertSound(this.state, this.customSoundIds);
          if (sound && sound !== 'none') {
            sfx.playAlert(sound, 1.0);
          } else {
            sfx.playChime();
          }
        }
      },
      onLightRoom: (isLight) => {
        this.applyLightRoom(isLight);
        this.saveState();
      },
      onFullscreen: () => {
        this.toggleFullscreen();
      },
    };
  }

  async initCustomSounds() {
    try {
      const records = await getAllCustomSounds();
      this.customSoundIds = new Set((records || []).map((r) => r.id));
      if (!records || records.length === 0) {
        sfx.setCustomBuffers(new Map());
        return;
      }
      sfx.ensureContext();
      const map = new Map();
      for (const rec of records) {
        try {
          if (rec.wav && sfx.ctx) {
            const buf = await sfx.ctx.decodeAudioData(rec.wav.slice(0));
            map.set(rec.id, buf);
          }
        } catch {
          // Ignore un-decodable sound, shush fallback handles it
        }
      }
      sfx.setCustomBuffers(map);
    } catch {
      this.customSoundIds = new Set();
      sfx.setCustomBuffers(new Map());
    }
  }

  switchMode(modeId) {
    this.session.setMode(modeId);
    this.state.settings.mode = modeId;
    const modeCfg = this.session.getModeConfig();
    this.hud.updateMode(modeCfg.id);
    this.saveState();
  }

  applyLightRoom(isLight) {
    this.state.settings.lightRoom = Boolean(isLight);
    document.body.classList.toggle('light-room', Boolean(isLight));
    // Friendly Arcade light tokens
    if (isLight) document.documentElement.dataset.theme = 'light';
    else delete document.documentElement.dataset.theme;
    this.renderer.setLightRoom(Boolean(isLight));
  }

  async calibrateMic() {
    if (!this.mic.isListening) {
      const ok = await this.mic.start(this.state.settings.micDeviceId);
      this.panel.setMicButtonState(ok);
      if (!ok) {
        this.hud.showMicBlockedHelp();
        return;
      }
    }
    this.zones.reset();
    this.mic.startCalibration(CONFIG.calibrationMs);
    this.wasCalibrating = this.mic.isCalibrating;
    this.panel.setCalibrateButtonState(this.mic.isCalibrating);
  }

  async openSetupWizard() {
    if (this.setupWizard) {
      this.setupWizard.close();
    }
    this.setupWizard = new SetupWizard({
      mic: this.mic,
      currentSensitivity: this.state.settings.sensitivity,
      onEnsureMic: async () => {
        const ok = await this.mic.start(this.state.settings.micDeviceId);
        this.panel.setMicButtonState(ok);
        return ok;
      },
      onSensitivityChange: (val) => {
        this.state.settings.sensitivity = val;
        this.panel.setSensitivityValue(val);
        this.saveState();
      },
      onFinish: (suggestedSensitivity) => {
        this.state.settings.sensitivity = suggestedSensitivity;
        this.state.settings.setupDone = true;
        this.state.settings.ambientBaselineDb = this.mic.ambientBaselineDb;
        this.saveState();
        this.panel.setSensitivityValue(suggestedSensitivity);
        this.setupWizard = null;
      },
      onSkip: () => {
        this.state.settings.setupDone = true;
        this.saveState();
        this.setupWizard = null;
      },
    });
    await this.setupWizard.open();
  }

  deliverStarFeedback() {
    if (document.hidden) {
      this.displayedStars = this.stars.stars;
      sfx.playChime();
      this.checkGoalReached();
      return;
    }

    const jarCoords = this.hud.getJarMouthCoords();
    this.renderer.particles.spawnFlyingStar(
      this.renderer.width * 0.5,
      this.renderer.height * 0.45,
      jarCoords.x,
      jarCoords.y,
      () => {
        this.displayedStars = this.stars.stars;
        sfx.playChime();
        this.hud.triggerJarBounce();
        this.checkGoalReached();
      }
    );
  }

  awardStarWithFlight() {
    this.stars.awardManualStar();
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.totalStars = (cData.totalStars || 0) + 1;
    }
    this.saveClassStars();
    this.deliverStarFeedback();
  }

  resetCurrentStars() {
    const cData = this.state.classes[this.state.activeClass];
    if (cData && cData.stars > 0) {
      StorageManager.takeSnapshot(this.state, `Перед скиданням банки «${this.state.activeClass}»`);
    }
    if (cData) {
      cData.stars = 0;
    }
    this.stars.resetAll(cData?.goal || 20);
    this.displayedStars = 0;
    this.hasCelebratedGoal = false;
    this.saveState();
    this.hud.updateStars(0, this.stars.goal, 0, false, cData?.reward || 'Нагорода');
    this.sidebar.update();
  }

  checkGoalReached() {
    const cData = this.state.classes[this.state.activeClass];
    if (this.stars.stars >= this.stars.goal && !this.hasCelebratedGoal) {
      this.hasCelebratedGoal = true;
      if (cData) {
        cData.goalsReached = (cData.goalsReached || 0) + 1;
        recordPrize(cData, cData.reward);
        this.saveState();
        StorageManager.takeSnapshot(this.state, `Ціль досягнуто: «${this.state.activeClass}»`);
        this.sidebar.update();
      }
      sfx.playFanfare();
      if (!document.hidden) {
        this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      }
      this.hud.showGoalReachedModal(cData?.reward || '5 хв мультика', () => {
        this.resetCurrentStars();
      });
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
    this.sidebar?.applySavedPosition();
    this.physics.resize(w, h);
    this.physics.setBallCount(this.state.settings.balls);
  }

  async startLesson() {
    this.onResize();

    const ok = await this.mic.start(this.state.settings.micDeviceId);
    this.panel.setMicButtonState(ok);

    if (ok) {
      const devices = await this.mic.listDevices();
      this.panel.populateAudioDevices(devices, this.mic.deviceId);
      // No automatic calibration on startup: keeps saved baseline intact so noisy classroom arrivals don't pollute it.
    } else {
      this.hud.showMicBlockedHelp();
    }

    this.requestWakeLock();
  }

  // The browser drops the lock whenever the tab is hidden or the projector input switches,
  // so it is taken again on every return to the tab while the lesson runs.
  async requestWakeLock() {
    if (!('wakeLock' in navigator)) return;
    if (this.wakeLock || document.visibilityState !== 'visible') return;
    try {
      this.wakeLock = await navigator.wakeLock.request('screen');
      this.wakeLock.addEventListener('release', () => {
        this.wakeLock = null;
      });
    } catch {
      // Unsupported, battery saver or no user activation yet: the next visibility change retries
    }
  }

  initVisibilityHandling() {
    document.addEventListener('visibilitychange', () => {
      this.onVisibilityChange();
    });
  }

  async onVisibilityChange() {
    const now = performance.now();
    if (document.hidden) {
      this.lastWorkerStepTime = now;
      this.watchdog.enterBackground(now);
      this.bgTicker.start();
      this.updateTabIndicator();
      return;
    }

    this.bgTicker.stop();
    this.tabIndicator.reset();
    this.lastFrameTime = now;
    this.mic.lastUpdateTime = now;

    if (!this.wakeLock) {
      this.requestWakeLock();
    }
    await this.mic.resumeContextIfNeeded();
    if (sfx.ctx?.state === 'suspended') {
      sfx.ensureContext();
    }

    if (this.latestTickState) {
      this.syncBackgroundTimerOnly(now);
      this.syncHudFromState(this.latestTickState);
    }
    this.sidebar.update();

    if (this.watchdog.consumeFrozenWarning() && this.mic.isListening) {
      this.hud.showBackgroundAudioPausedToast();
    }
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  }

  initResize() {
    this.onResizeHandler = () => this.onResize();
    window.addEventListener('resize', this.onResizeHandler);
    this.onResize();
  }

  initPointers() {
    const canvas = this.canvas;

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    canvas.addEventListener('pointerdown', (e) => {
      const { x, y } = getPos(e);
      this.pointerTarget = { x, y };
      const touchedBall = this.physics.onPointerDown(e.pointerId, x, y);

      if (touchedBall && this.renderer.theme === 'bubbles') {
        sfx.playPop();
        this.renderer.particles.spawnPop(touchedBall.x, touchedBall.y, touchedBall.radius);
        touchedBall.y = -touchedBall.radius;
        touchedBall.py = touchedBall.y;
      }
    });

    canvas.addEventListener('pointermove', (e) => {
      const { x, y } = getPos(e);
      this.pointerTarget = { x, y };
      this.physics.onPointerMove(e.pointerId, x, y);
    });

    canvas.addEventListener('pointerup', (e) => {
      this.physics.onPointerUp(e.pointerId);
    });
    canvas.addEventListener('pointercancel', (e) => {
      this.physics.onPointerUp(e.pointerId);
    });
  }

  initHotkeys() {
    new HotkeyManager({
      onSpace: () => {
        this.isPaused = !this.isPaused;
        const now = performance.now();
        this.lastTimerWallTime = now;
        if (!this.isPaused) {
          this.mic.lastUpdateTime = now;
        }
        if (document.hidden) {
          this.updateTabIndicator();
        }
      },
      onM: async () => {
        await this.toggleMicrophone();
      },
      onC: () => {
        this.calibrateMic();
      },
      onF: () => {
        this.toggleFullscreen();
      },
      onMode1: () => this.switchMode('quiet'),
      onMode2: () => this.switchMode('groups'),
      onMode3: () => this.switchMode('breaktime'),
      onT: () => this.session.toggleTimer(),
      onS: () => this.awardStarWithFlight(),
      onH: () => this.panel.toggle(),
    });
  }

  initCursorHide() {
    const showCursor = () => {
      document.body.classList.remove('hide-cursor');
      clearTimeout(this.cursorTimer);
      this.cursorTimer = setTimeout(() => {
        if (!this.panel.isOpen && !getOpenPopover()) {
          document.body.classList.add('hide-cursor');
        }
      }, 3500);
    };

    window.addEventListener('mousemove', showCursor);
    window.addEventListener('pointerdown', showCursor);
  }

  checkDebugMode() {
    const params = new URLSearchParams(window.location.search);
    if (params.has('debug')) {
      const debugBar = document.createElement('div');
      debugBar.className = 'debug-bar';
      debugBar.innerHTML = `
        <span>${iconLab()} СИМУЛЯТОР ШУМУ:</span>
        <input type="range" id="sim-slider" min="-80" max="-10" step="1" value="-60">
        <span id="sim-val">-60 dB</span>
        <button id="sim-zero-btn">Тиша</button>
        <button id="sim-stir-btn">Шепіт</button>
        <button id="sim-shout-btn">Крик!</button>
        <span id="fps-counter" style="margin-left: auto;">FPS: 60</span>
      `;
      document.body.appendChild(debugBar);

      const slider = debugBar.querySelector('#sim-slider');
      const valSpan = debugBar.querySelector('#sim-val');
      const zeroBtn = debugBar.querySelector('#sim-zero-btn');
      const stirBtn = debugBar.querySelector('#sim-stir-btn');
      const shoutBtn = debugBar.querySelector('#sim-shout-btn');

      this.simulatedDb = -60;

      slider.addEventListener('input', () => {
        this.simulatedDb = parseFloat(slider.value);
        valSpan.textContent = `${this.simulatedDb} dB`;
      });
      zeroBtn.addEventListener('click', () => {
        slider.value = -70;
        this.simulatedDb = -70;
        valSpan.textContent = '-70 dB';
      });
      stirBtn.addEventListener('click', () => {
        slider.value = -42;
        this.simulatedDb = -42;
        valSpan.textContent = '-42 dB';
      });
      shoutBtn.addEventListener('click', () => {
        slider.value = -25;
        this.simulatedDb = -25;
        valSpan.textContent = '-25 dB';
      });

      this.fpsEl = debugBar.querySelector('#fps-counter');
      this.frameCount = 0;
      this.fpsTimer = performance.now();
    }
  }

  saveClassStars() {
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.stars = this.stars.stars;
      this.saveState();
      this.sidebar.update();
    }
  }

  saveState() {
    this.state.settings.ambientBaselineDb = this.mic.ambientBaselineDb;
    this.state.settings.micDeviceId = this.mic.deviceId;
    StorageManager.save(this.state);
  }

  isMicWorkletFeeding() {
    return Boolean(this.mic.isListening && this.mic.isWorkletActive && this.simulatedDb === null);
  }

  onMicAudioBlock(rawDb, dtMs) {
    const now = performance.now();
    this.watchdog.recordWorkletActivity(now);
    if (this.isPaused || this.simulatedDb !== null) return;
    const sample = this.mic.processBlock(rawDb, dtMs);
    this.processSimulationStep({ sample, dtSec: dtMs / 1000, now });
  }

  onBackgroundWorkerTick() {
    if (!document.hidden) return;
    const now = performance.now();
    const hb = this.watchdog.evaluateHeartbeat({
      now,
      isListening: this.mic.isListening,
      isWorkletActive: this.mic.isWorkletActive,
      isSimulated: this.simulatedDb !== null,
      audioContextState: this.mic.audioContext?.state || 'running',
    });

    if (hb.shouldAttemptResume) {
      this.watchdog.markResumeAttempt(now);
      this.mic.resumeContextIfNeeded();
    }

    if (this.isPaused) {
      this.lastTimerWallTime = Math.max(this.lastTimerWallTime, now);
      this.updateTabIndicator();
      return;
    }

    if (hb.shouldDriveFallbackTick) {
      const sample = this.mic.sample(this.simulatedDb);
      const rawDtSec = this.lastWorkerStepTime ? (now - this.lastWorkerStepTime) / 1000 : 0.1;
      this.lastWorkerStepTime = now;
      this.processSimulationStep({ sample, dtSec: rawDtSec, now });
    } else {
      this.lastWorkerStepTime = now;
      this.syncBackgroundTimerOnly(now);
      this.updateTabIndicator();
    }
  }

  updateTaskTimer(now, isBusyEngine, currentZone, modeConfig, activeClassData) {
    const wallDtSec = Math.max(0, (now - this.lastTimerWallTime) / 1000);
    this.lastTimerWallTime = Math.max(this.lastTimerWallTime, now);
    const timerRes = this.session.update(isBusyEngine ? 0 : wallDtSec, currentZone);
    if (timerRes.completed) {
      if (activeClassData) {
        activeClassData.tasksCompleted = (activeClassData.tasksCompleted || 0) + 1;
        if (timerRes.cleanStreak) {
          activeClassData.cleanTasks = (activeClassData.cleanTasks || 0) + 1;
        }
        this.saveState();
        this.sidebar.update();
      }
      sfx.playFanfare();
      if (!document.hidden) {
        this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      }
      if (timerRes.cleanStreak && modeConfig.rewardsEnabled) {
        this.awardStarWithFlight();
      }
    }
    return timerRes;
  }

  syncBackgroundTimerOnly(now) {
    const modeConfig = this.session.getModeConfig();
    const activeClassData = this.state.classes[this.state.activeClass];
    const snap = this.latestTickState;
    const isBusy = snap ? snap.isBusyEngine : false;
    const zone = snap ? snap.currentZone : 'green';
    const timerRes = this.updateTaskTimer(now, isBusy, zone, modeConfig, activeClassData);
    if (snap) {
      snap.timerRes = timerRes;
    }
  }

  updateTabIndicator() {
    if (!document.hidden) return;
    const snap = this.latestTickState;
    this.tabIndicator.update({
      zone: snap?.currentZone || 'green',
      remainingSeconds: this.session.timerRemainingSeconds,
      timerRunning: this.session.timerRunning,
      isListening: this.mic.isListening,
      isSimulated: this.simulatedDb !== null,
      isPaused: this.isPaused,
    });
  }

  syncHudFromState(snap) {
    const activeClassData = this.state.classes[this.state.activeClass];
    this.hud.updateNoiseMeter(
      snap.currentZone,
      snap.evalResult.progress,
      snap.sample.isCalibrating,
      snap.sample.calibrationProgress,
      snap.sample.newNoiseHint
    );
    this.hud.updateStars(
      this.displayedStars,
      this.stars.goal,
      snap.starRes.progress,
      snap.starRes.isGolden,
      activeClassData?.reward || '5 хв мультика'
    );
    this.hud.updateTimer(
      snap.timerRes.remaining,
      snap.timerRes.running,
      this.session.timerTotalSeconds
    );
  }

  /**
   * Advances core audio evaluation, zone transitions, alerts, stars, and task timer.
   * Runs both in foreground (rAF or AudioWorklet) and in background tabs.
   */
  processSimulationStep({ sample, dtSec, now }) {
    const safeDtSec = clampSimulationDt(dtSec, CONFIG.background.maxStepDtSec);
    const isBusyEngine = sample.isCalibrating || sample.isVoiceCheck;

    if (sample.isCalibrating !== this.wasCalibrating) {
      this.wasCalibrating = sample.isCalibrating;
      this.panel.setCalibrateButtonState(sample.isCalibrating);
      if (!sample.isCalibrating) {
        this.zones.reset();
        this.lastAlertTime = now + 1500;
        this.saveState();
      }
    }

    // Zone Evaluation
    const modeConfig = this.session.getModeConfig();
    const evalResult = evaluateLevel(
      sample.db,
      sample.ambientDb,
      modeConfig.yellowOffsetDb,
      modeConfig.redOffsetDb,
      this.state.settings.sensitivity
    );

    // Zone State Machine Update
    if (isBusyEngine) {
      this.zones.reset();
    }
    const zoneDtMs = isBusyEngine || sample.frozen ? 0 : safeDtSec * 1000;
    const zoneState = this.zones.update(
      sample.db,
      evalResult.yellowDb,
      evalResult.redDb,
      zoneDtMs
    );
    const currentZone = isBusyEngine ? 'green' : zoneState.zone;

    // Live update setup wizard when visible so completion results are never missed between rAF frames
    if (!document.hidden && this.setupWizard?.isOpen) {
      this.setupWizard.update(sample, evalResult, currentZone, safeDtSec);
    }

    const isSignalActive = this.mic.isListening || this.simulatedDb !== null;
    const activeClassData = this.state.classes[this.state.activeClass];

    // Quiet time statistics
    if (isSignalActive && currentZone === 'green' && activeClassData) {
      activeClassData.quietSeconds = (activeClassData.quietSeconds || 0) + safeDtSec;
      this.quietStatSaveTimer += safeDtSec;
      if (this.quietStatSaveTimer >= 15) {
        this.quietStatSaveTimer = 0;
        this.saveState();
        if (!document.hidden) {
          this.sidebar.refreshEditor();
        }
      }
    }

    // One-shot Red Zone entry shock on visible screen
    if (!document.hidden && !isBusyEngine && modeConfig.id !== 'breaktime' && currentZone === 'red' && zoneState.changed) {
      this.physics.scareBounce(1.75);
      this.hud.triggerScreenShake();
      this.hud.triggerJarBounce();
    }

    // Alert Sound & Repeating Signal during sustained Red Zone noise (runs in background too)
    if (currentZone === 'red' && !isBusyEngine && !sample.frozen) {
      const repeatSec = this.state.settings.alertRepeatSec ?? CONFIG.defaultAlertRepeatSec;
      const repeatMs = repeatSec > 0 ? repeatSec * 1000 : 0;
      const shouldPlayInitial = zoneState.changed && (now - this.lastAlertTime > CONFIG.alertCooldownMs);
      const shouldPlayRepeat = !zoneState.changed && repeatMs > 0 && (now - this.lastAlertTime >= repeatMs);

      if (zoneState.changed) {
        this.alertEscalationStep = 0;
      }

      if (shouldPlayInitial || shouldPlayRepeat) {
        this.lastAlertTime = now;
        if (!document.hidden) {
          this.hud.showAlert();
        }
        // Escalation: 45% -> 65% -> 85% -> 100% max
        const escalationLevel = Math.min(1.0, 0.45 + this.alertEscalationStep * 0.2);
        this.alertEscalationStep++;

        const alertSound = resolveAlertSound(this.state, this.customSoundIds);
        sfx.playAlert(alertSound, escalationLevel);

        if (shouldPlayRepeat && !document.hidden) {
          this.physics.scareBounce(1.55);
          this.hud.triggerScreenShake();
        }
      }
    } else if (currentZone !== 'red') {
      this.alertEscalationStep = 0;
    }

    // Star Rewards Update
    const starRes = this.stars.update(currentZone, isBusyEngine ? 0 : safeDtSec, modeConfig.rewardsEnabled);
    if (starRes.starAwarded) {
      if (activeClassData) {
        activeClassData.totalStars = (activeClassData.totalStars || 0) + 1;
      }
      this.saveClassStars();
      this.deliverStarFeedback();
    }

    // Task Timer Update
    const timerRes = this.updateTaskTimer(now, isBusyEngine, currentZone, modeConfig, activeClassData);

    this.latestTickState = {
      sample,
      evalResult,
      currentZone,
      modeConfig,
      isBusyEngine,
      isSignalActive,
      starRes,
      timerRes,
    };

    if (document.hidden) {
      this.updateTabIndicator();
    }
  }

  loop(now) {
    requestAnimationFrame(this.loop.bind(this));

    // Physics and animation get a capped step; the task timer follows the wall clock,
    // so a slow projector PC or a throttled background tab doesn't make it lag behind.
    const realDt = Math.max(0, (now - this.lastFrameTime) / 1000);
    const dt = Math.min(0.1, realDt);
    this.lastFrameTime = now;

    if (this.fpsEl) {
      this.frameCount++;
      if (now - this.fpsTimer >= 1000) {
        this.fpsEl.textContent = `FPS: ${this.frameCount}`;
        this.frameCount = 0;
        this.fpsTimer = now;
      }
    }

    if (this.isPaused) {
      this.lastTimerWallTime = Math.max(this.lastTimerWallTime, now);
      return;
    }

    if (!this.isMicWorkletFeeding()) {
      const sample = this.mic.sample(this.simulatedDb);
      this.processSimulationStep({ sample, dtSec: dt, now });
    } else {
      this.syncBackgroundTimerOnly(now);
    }

    const snap = this.latestTickState;
    if (!snap) return;

    const { sample, evalResult, currentZone, modeConfig, isBusyEngine, isSignalActive, starRes } = snap;

    // Live VU meter in Teacher Panel (synchronized with currentZone)
    this.panel.updateMicLiveMeter(
      sample.rawDb,
      sample.db,
      sample.ambientDb,
      evalResult.yellowDb,
      evalResult.redDb,
      currentZone,
      isSignalActive,
      sample.isHot,
      sample.processing,
      dt
    );

    // Continuous physical reaction to voice across modes (paused while calibrating)
    if (!isBusyEngine) {
      if (modeConfig.id === 'breaktime') {
        if (evalResult.progress > 0.2) {
          const impulse = (evalResult.progress - 0.18) * 38;
          this.physics.bounceBalls(impulse);
        }
      } else {
        if (evalResult.progress > 0.25 && currentZone === 'green') {
          this.physics.voicePulse(evalResult.progress);
        }

        if (currentZone === 'yellow' || (evalResult.progress >= 0.55 && currentZone !== 'red')) {
          this.physics.stirBalls(evalResult.progress * 1.25);
        }

        if (currentZone === 'red') {
          this.physics.chaosAgitate(Math.max(1.0, evalResult.progress * 1.35));
        }
      }
    }

    // Dynamic UI Obstacles (Sidebar and sliding Settings Panel)
    const sidebarObstacle = this.sidebar.getPhysicalRect();
    this.physics.setSidebarObstacle(sidebarObstacle);

    const rightWallObstacle = this.panel.getPhysicalWall();
    this.physics.setRightWallObstacle(rightWallObstacle);

    // Physics Simulation Step
    this.physics.update(dt, currentZone, starRes.isGolden);

    // Canvas Render
    this.renderer.render(
      this.physics,
      currentZone,
      starRes.isGolden,
      dt,
      this.pointerTarget.x,
      this.pointerTarget.y
    );

    // HUD Updates
    this.syncHudFromState(snap);
  }
}

initServiceWorker();

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
