export const CONFIG = {
  // Meter, silence & calibration engine
  level: {
    blockMs: 100,
    calibrationMs: 3000,
    wizardSilenceMs: 4000,
    voiceCheckMs: 4000,
    calibrationPercentile: 0.20,
    noisySpreadDb: 10,
    thresholdFloorDb: -70,
    hotFloorDb: -25,
    newNoiseDb: 6,
    newNoiseSec: 60,
    smoothingAttack: 0.04,
    smoothingRelease: 0.35,
    minYellowMarginDb: 2.0, // Yellow threshold is never closer to ambient than 2.0 dB
    minRedMarginDb: 3.0,    // Red threshold is never closer to yellow than 3.0 dB
  },
  calibrationMs: 3000,
  minBaselineDb: -75,
  smoothing: {
    attack: 0.04,  // Fast rise (~40ms) so sudden speech & noise spikes are caught immediately
    release: 0.35, // Smooth release prevents visual flickering while staying responsive
  },
  sfxMicMuteMs: 1200,    // Ignore microphone for 1200ms when game sfx plays to prevent TV speaker loop
  alertCooldownMs: 1200, // Minimum gap on initial red-zone entry
  defaultAlertRepeatSec: 4, // Repeat interval while class stays in Red Zone (0 = play once)

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
};
