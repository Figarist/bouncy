import './styles/main.css';
import { CONFIG } from './config.js';
import { evaluateLevel } from './audio/meter.js';
import { MicrophoneInput } from './audio/mic.js';
import { sfx } from './audio/sfx.js';
import { ZoneStateMachine } from './game/zones.js';
import { StarManager } from './game/stars.js';
import { SessionManager } from './game/session.js';
import { StorageManager, createClassRecord } from './game/storage.js';
import { PhysicsWorld } from './world/physics.js';
import { CanvasRenderer } from './render/renderer.js';
import { HUD } from './ui/hud.js';
import { TeacherPanel } from './ui/teacher-panel.js';
import { HotkeyManager } from './ui/hotkeys.js';
import { IntroOverlay } from './ui/intro.js';
import { iconLab } from './ui/icons.js';

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
    this.mic.profile = this.state.settings.micProfile || 'webcam';
    this.mic.gainMultiplier = this.state.settings.micGain || 2.2;

    // Game state
    const modeCfg = CONFIG.modes[this.state.settings.mode] || CONFIG.modes.quiet;
    this.session = new SessionManager({ initialMode: modeCfg.id });

    const activeClass = this.state.activeClass;
    const classData = this.state.classes[activeClass] || createClassRecord();

    this.stars = new StarManager({
      secondsPerStar: CONFIG.stars.secondsPerStar,
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
    this.hud = new HUD(
      {
        onModeChange: (modeId) => this.switchMode(modeId),
        onClassChange: (className) => this.switchClass(className),
        onQuickCalibrate: () => this.calibrateMic(),
        onPanelToggle: () => this.panel.toggle(),
        onTimerToggle: () => this.session.toggleTimer(),
        onResetGoal: () => this.resetCurrentStars(),
      },
      this.state.classes,
      this.state.activeClass
    );

    this.panel = new TeacherPanel(this.state, this.getPanelCallbacks());

    // Sound volume init
    sfx.setVolume(this.state.settings.volume);

    // Initial setup
    this.renderer.setTheme(this.state.settings.theme);
    this.applyLightRoom(this.state.settings.lightRoom);

    // State
    this.lastFrameTime = performance.now();
    this.lastAlertTime = 0;
    this.quietStatSaveTimer = 0;
    this.isPaused = false;
    this.wasCalibrating = false;
    this.cursorTimer = null;
    this.pointerTarget = { x: null, y: null };
    this.displayedStars = classData.stars;
    this.hasCelebratedGoal = classData.stars >= classData.goal;

    // Debug Simulator (?debug)
    this.simulatedDb = null;
    this.checkDebugMode();

    // Bindings
    this.initPointers();
    this.initResize();
    this.initHotkeys();
    this.initCursorHide();

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
    this.stars.resetProgress();
    this.displayedStars = cData.stars;
    this.hasCelebratedGoal = cData.stars >= cData.goal;
    this.saveState();
    this.hud.renderClassSwitcher(this.state.classes, className);
    this.hud.updateStars(this.displayedStars, this.stars.goal, 0, false, cData.reward);
    this.panel.refreshClassList();
  }

  getPanelCallbacks() {
    return {
      onModeChange: (modeId) => {
        this.switchMode(modeId);
      },
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
      onProfileChange: (profileId) => {
        this.state.settings.micProfile = profileId;
        this.mic.setProfile(profileId);
        this.state.settings.micGain = this.mic.gainMultiplier;
        this.panel.setGainValue(this.mic.gainMultiplier);
        this.saveState();
      },
      onGainChange: (gain) => {
        this.state.settings.micGain = gain;
        this.mic.setGain(gain);
        this.saveState();
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
      onTheme: (theme) => {
        this.state.settings.theme = theme;
        this.renderer.setTheme(theme);
        this.saveState();
      },
      onSound: (sound, preview = false) => {
        this.state.settings.alertSound = sound;
        this.saveState();
        if (preview && sound !== 'none') {
          sfx.playAlert(sound);
        }
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
          const sound = this.state.settings.alertSound;
          if (sound && sound !== 'none') {
            sfx.playAlert(sound);
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
      onTimerStart: (minutes) => {
        this.session.startTimer(minutes);
        this.panel.toggle(false);
      },
      onClassChange: (className) => {
        this.switchClass(className);
      },
      onAddClass: (className) => {
        if (!this.state.classes[className]) {
          this.state.classes[className] = createClassRecord();
        }
        this.switchClass(className);
      },
      onDeleteClass: (className) => {
        const keys = Object.keys(this.state.classes);
        if (keys.length <= 1) return;
        delete this.state.classes[className];
        const nextClass = Object.keys(this.state.classes)[0];
        this.switchClass(nextClass);
      },
      onAddTask: () => {
        const cData = this.state.classes[this.state.activeClass];
        if (cData) {
          cData.tasksCompleted = (cData.tasksCompleted || 0) + 1;
          sfx.playChime();
          this.saveState();
          this.hud.renderClassSwitcher(this.state.classes, this.state.activeClass);
        }
      },
      onResetGoal: () => {
        this.resetCurrentStars();
      },
      onAddStar: () => {
        this.awardStarWithFlight();
      },
      onGoalChange: (goal, reward) => {
        const cData = this.state.classes[this.state.activeClass];
        if (cData) {
          cData.goal = goal;
          cData.reward = reward;
          this.stars.goal = goal;
          this.hasCelebratedGoal = this.stars.stars >= goal;
          this.saveState();
          this.hud.updateStars(this.stars.stars, this.stars.goal, 0, false, reward);
        }
      },
    };
  }

  switchMode(modeId) {
    this.session.setMode(modeId);
    this.state.settings.mode = modeId;
    const modeCfg = this.session.getModeConfig();
    this.hud.updateMode(modeCfg.id);
    this.panel.setModeState(modeCfg.id);
    this.saveState();
  }

  applyLightRoom(isLight) {
    this.state.settings.lightRoom = Boolean(isLight);
    document.body.classList.toggle('light-room', Boolean(isLight));
    this.renderer.setLightRoom(Boolean(isLight));
  }

  calibrateMic() {
    this.mic.startCalibration(CONFIG.calibrationMs);
    this.wasCalibrating = this.mic.isCalibrating;
    this.panel.setCalibrateButtonState(this.mic.isCalibrating);
  }

  awardStarWithFlight() {
    this.stars.awardManualStar();
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.totalStars = (cData.totalStars || 0) + 1;
    }
    this.saveClassStars();

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

  resetCurrentStars() {
    const cData = this.state.classes[this.state.activeClass];
    if (cData) {
      cData.stars = 0;
    }
    this.stars.resetAll(cData?.goal || 20);
    this.displayedStars = 0;
    this.hasCelebratedGoal = false;
    this.saveState();
    this.hud.updateStars(0, this.stars.goal, 0, false, cData?.reward || 'Нагорода');
    this.panel.updateClassStatsUI();
  }

  checkGoalReached() {
    const cData = this.state.classes[this.state.activeClass];
    if (this.stars.stars >= this.stars.goal && !this.hasCelebratedGoal) {
      this.hasCelebratedGoal = true;
      if (cData) {
        cData.goalsReached = (cData.goalsReached || 0) + 1;
        this.saveState();
        this.panel.updateClassStatsUI();
      }
      sfx.playFanfare();
      this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      this.hud.showGoalReachedModal(cData?.reward || '5 хв мультика', () => {
        this.resetCurrentStars();
      });
    }
  }

  onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.resize(w, h);
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
      this.calibrateMic();
    } else {
      this.hud.showMicBlockedHelp();
    }

    this.requestWakeLock();
  }

  async requestWakeLock() {
    if ('wakeLock' in navigator) {
      try {
        await navigator.wakeLock.request('screen');
      } catch {
        // wakeLock might fail if unsupported or battery saver
      }
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
        if (this.panel.panel.classList.contains('closed')) {
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
      this.panel.updateClassStatsUI();
    }
  }

  saveState() {
    this.state.settings.ambientBaselineDb = this.mic.ambientBaselineDb;
    this.state.settings.micDeviceId = this.mic.deviceId;
    this.state.settings.micProfile = this.mic.profile;
    this.state.settings.micGain = this.mic.gainMultiplier;
    StorageManager.save(this.state);
  }

  loop(now) {
    requestAnimationFrame(this.loop.bind(this));

    const dt = Math.min(0.1, (now - this.lastFrameTime) / 1000);
    this.lastFrameTime = now;

    if (this.fpsEl) {
      this.frameCount++;
      if (now - this.fpsTimer >= 1000) {
        this.fpsEl.textContent = `FPS: ${this.frameCount}`;
        this.frameCount = 0;
        this.fpsTimer = now;
      }
    }

    if (this.isPaused) return;

    // 1. Audio Sampling
    const sample = this.mic.sample(this.simulatedDb);
    if (sample.isCalibrating !== this.wasCalibrating) {
      this.wasCalibrating = sample.isCalibrating;
      this.panel.setCalibrateButtonState(sample.isCalibrating);
      if (!sample.isCalibrating) {
        this.saveState();
      }
    }

    // 2. Zone Evaluation
    const modeConfig = this.session.getModeConfig();
    const evalResult = evaluateLevel(
      sample.db,
      sample.ambientDb,
      modeConfig.yellowOffsetDb,
      modeConfig.redOffsetDb,
      this.state.settings.sensitivity
    );

    // Live VU meter in Teacher Panel
    const isSignalActive = this.mic.isListening || this.simulatedDb !== null;
    this.panel.updateMicLiveMeter(
      sample.rawDb,
      sample.db,
      sample.ambientDb,
      evalResult.yellowDb,
      evalResult.redDb,
      isSignalActive
    );

    // 3. Zone State Machine Update
    const zoneState = this.zones.update(
      sample.db,
      evalResult.yellowDb,
      evalResult.redDb,
      dt * 1000
    );

    const currentZone = zoneState.zone;
    const activeClassData = this.state.classes[this.state.activeClass];

    // Track quiet time statistics for active class when mic is active
    if (isSignalActive && currentZone === 'green' && activeClassData) {
      activeClassData.quietSeconds = (activeClassData.quietSeconds || 0) + dt;
      this.quietStatSaveTimer += dt;
      if (this.quietStatSaveTimer >= 15) {
        this.quietStatSaveTimer = 0;
        this.saveState();
        this.panel.updateClassStatsUI();
      }
    }

    // 4. Physical reaction to voice across modes (Significantly boosted!)
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
        if (zoneState.changed) {
          this.physics.scareBounce(1.75);
          this.hud.triggerScreenShake();
          this.hud.triggerJarBounce();
        } else {
          this.physics.chaosAgitate(Math.max(1.0, evalResult.progress * 1.35));
        }
      }
    }

    // 4b. Alert Sound & Repeating Signal during sustained Red Zone noise
    if (currentZone === 'red') {
      const repeatSec = this.state.settings.alertRepeatSec ?? CONFIG.defaultAlertRepeatSec;
      const repeatMs = repeatSec > 0 ? repeatSec * 1000 : 0;
      const shouldPlayInitial = zoneState.changed && (now - this.lastAlertTime > CONFIG.alertCooldownMs);
      const shouldPlayRepeat = !zoneState.changed && repeatMs > 0 && (now - this.lastAlertTime >= repeatMs);

      if (shouldPlayInitial || shouldPlayRepeat) {
        this.lastAlertTime = now;
        this.hud.showAlert();
        sfx.playAlert(this.state.settings.alertSound);

        if (shouldPlayRepeat) {
          // Give an extra strong bounce & shake on each repeat alert so kids notice!
          this.physics.scareBounce(1.55);
          this.hud.triggerScreenShake();
        }
      }
    }

    // 5. Star Rewards Update
    const starRes = this.stars.update(currentZone, dt, modeConfig.rewardsEnabled);
    if (starRes.starAwarded) {
      if (activeClassData) {
        activeClassData.totalStars = (activeClassData.totalStars || 0) + 1;
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
      this.saveClassStars();
    }

    // 6. Task Timer Update (+1 task statistic on completion!)
    const timerRes = this.session.update(dt, currentZone);
    if (timerRes.completed) {
      if (activeClassData) {
        activeClassData.tasksCompleted = (activeClassData.tasksCompleted || 0) + 1;
        if (timerRes.cleanStreak) {
          activeClassData.cleanTasks = (activeClassData.cleanTasks || 0) + 1;
        }
        this.saveState();
        this.hud.renderClassSwitcher(this.state.classes, this.state.activeClass);
        this.panel.updateClassStatsUI();
      }
      sfx.playFanfare();
      this.renderer.particles.spawnConfetti(this.renderer.width, this.renderer.height);
      if (timerRes.cleanStreak && modeConfig.rewardsEnabled) {
        this.awardStarWithFlight();
      }
    }

    // 7. Physics Simulation Step
    this.physics.update(dt, currentZone, starRes.isGolden);

    // 8. Canvas Render
    this.renderer.render(
      this.physics,
      currentZone,
      starRes.isGolden,
      dt,
      this.pointerTarget.x,
      this.pointerTarget.y
    );

    // 9. HUD Updates
    this.hud.updateNoiseMeter(
      currentZone,
      evalResult.progress,
      sample.isCalibrating,
      sample.calibrationProgress
    );
    this.hud.updateStars(
      this.displayedStars,
      this.stars.goal,
      starRes.progress,
      starRes.isGolden,
      activeClassData?.reward || '5 хв мультика'
    );
    this.hud.updateTimer(timerRes.remaining, timerRes.running);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
