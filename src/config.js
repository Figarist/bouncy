export const CONFIG = {
  // Meter, silence & calibration engine (surgical tuning guide in historical-AGENTS.md)
  level: {
    blockMs: 100,                // Fallback polling block size (ms) when AudioWorklet is unavailable
    workletBlockMs: 32,          // Contiguous RMS integration window on audio thread (20–50 ms safe)
    hpfFrequencyHz: 180,         // 4th-order Butterworth HPF cutoff; raise (200–220) to cut more desk/HVAC bass
    lpfFrequencyHz: 4000,        // 2nd-order LPF cutoff; rejects mic hiss & ultrasonic noise (3500–5000 Hz)
    speechSplitHz: 300,          // Worklet 1-pole split between low rumble (<300 Hz) and speech formants (>=300 Hz)
    calibrationMs: 3000,         // Quick "Запам'ятати тишу" duration (ms)
    wizardSilenceMs: 4000,       // Setup wizard step-1 silence sampling duration (ms)
    voiceCheckMs: 4000,          // Setup wizard step-2 voice check window (ms)
    calibrationPercentile: 0.20, // Lower percentile for baseline floor (ignores coughs/clicks during calibration)
    noisySpreadDb: 10,           // Calibration p80-p20 spread above which room is flagged as noisy
    thresholdFloorDb: -70,       // Minimum effective floor (protects against digital-zero noise-gate headsets)
    hotFloorDb: -25,             // Floor above this warns that OS mic gain is overloaded
    newNoiseDb: 6,               // Steady floor rise (+dB) required to start counting toward recalibration hint
    newNoiseSec: 60,             // Seconds of sustained stationary noise before pulsing "Запам'ятати тишу"
    stationarySpreadDb: 7,       // Max p85-p15 spread (dB) considered stationary hum (projector/AC) vs speech
    smoothingAttack: 0.04,       // Visual envelope rise tau (s); fast so HUD & balls feel alive
    smoothingRelease: 0.35,      // Visual envelope fall tau (s); smooth so bar doesn't flicker
    detectorAttack: 0.035,       // Detector channel rise tau (s); catches real speech quickly
    detectorRelease: 0.085,      // Detector channel fall tau (s); fast decay prevents short impulses stretching into Red
    impulseCrestDb: 11.5,        // Peak-to-RMS Crest Factor gate (dB); lower (9.5–10.5) = stricter click rejection, raise (12.5–14) = more sensitive
    impulseJumpDb: 12.0,         // Reference sudden-jump delta (dB) for impulse diagnostics
    impulseMaxMs: 180,           // Max duration (ms) an impulse gate suppresses before opening for sustained loud noise (120–240 ms)
    rumbleMarginDb: 4.0,         // How many dB rumbleDb must exceed speechDb before rumble penalty applies
    rumblePenaltyDb: 6.0,        // Max attenuation (dB) applied to low-frequency non-speech desk thuds (0–10 dB)
    zeroSignalWarnMs: 2500,      // Continuous digital-zero duration (ms) before flagging hardware mute
    minYellowMarginDb: 2.0,      // Yellow threshold is never closer to ambient than 2.0 dB
    minRedMarginDb: 3.0,         // Red threshold is never closer to yellow than 3.0 dB
  },
  calibrationMs: 3000,
  minBaselineDb: -75,
  smoothing: {
    attack: 0.04,  // Fast rise (~40ms) so sudden speech & noise spikes are caught immediately
    release: 0.35, // Smooth release prevents visual flickering while staying responsive
  },
  sfxMicMuteMs: 1200,    // Ignore microphone for 1200ms when game sfx plays to prevent TV speaker loop
  alertCooldownMs: 1200, // Minimum gap on initial red-zone entry
  defaultAlertRepeatSec: 8, // Repeat interval while class stays in Red Zone (0 = play once)

  // Lesson modes and zone threshold offsets relative to ambient background noise (dB)
  modes: {
    quiet: {
      id: 'quiet',
      name: 'Тиха робота',
      icon: 'quiet',
      yellowOffsetDb: 4.5, // Whispers, murmurs or desk shuffling trigger yellow & stir balls
      redOffsetDb: 9.0,    // Normal talking / shouts trigger red alert
      rewardsEnabled: true,
      physicsBounceOnVoice: false,
    },
    groups: {
      id: 'groups',
      name: 'Робота в групах',
      icon: 'groups',
      yellowOffsetDb: 8.0, // Mild group discussion allowed
      redOffsetDb: 15.0,   // Loud shouting triggers red
      rewardsEnabled: true,
      physicsBounceOnVoice: false,
    },
    breaktime: {
      id: 'breaktime',
      name: 'Перерва / Класика',
      icon: 'breaktime',
      yellowOffsetDb: 12.0,
      redOffsetDb: 20.0,
      rewardsEnabled: false,
      physicsBounceOnVoice: true, // Classic bouncy balls: scream and bounce!
    },
  },

  // State transitions: debounce and hysteresis
  zones: {
    enterYellowMs: 120,  // Fast response to whisper/noise (~120ms)
    exitYellowMs: 600,   // Fast recovery when quiet returns
    enterRedMs: 250,     // Fast response to speech/shouts (~250ms), rejects single click
    exitRedMs: 1000,
    hysteresisDb: 2.0,   // 2 dB hysteresis prevents rapid zone oscillation
  },

  // Stars & rewards
  stars: {
    secondsPerStar: 30,
    goldenComboSeconds: 120, // 2 minutes of continuous green enables glowing dreams
    bonusForCleanTimer: 1,
  },

  // Ball counts & physics
  balls: {
    min: 10,
    max: 150,
    default: 40, // Optimal for TV readability
  },

  physics: {
    hz: 60,
    subSteps: 3,
    gravity: 0.46,
    restitution: 0.82, // Higher bounciness for lively visual response
    friction: 0.993,
  },

  // Background tab execution, watchdog & sleep recovery
  background: {
    workerTickMs: 100,
    maxStepDtSec: 0.25,
    audioFreezeDetectMs: 2500,
    sleepGapMs: 2500,
    resumeRetryCooldownMs: 3000,
  },
};
