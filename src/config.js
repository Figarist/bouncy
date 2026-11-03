export const CONFIG = {
  // Meter & calibration
  calibrationMs: 3000,
  calibrationPercentile: 0.25, // 25th percentile ignores spikes and accurately captures ambient room floor
  minBaselineDb: -75,          // Baseline minimum limit
  maxBaselineDb: -44,          // Never allow baseline above -44 dB (prevents app from becoming deaf)
  smoothing: {
    attack: 0.04,  // Fast rise (~40ms) so sudden speech & noise spikes are caught immediately
    release: 0.35, // Smooth release prevents visual flickering while staying responsive
  },
  sfxMicMuteMs: 750,     // Ignore microphone when game sfx is playing to prevent TV speaker loop
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

  // Mic Profiles for hardware adaptation (Webcam, Laptop, Studio/Headset)
  micProfiles: {
    webcam: {
      id: 'webcam',
      name: 'Веб-камера (відстань 2-4м)',
      gain: 2.2, // Digital boost for quiet distant webcam mic
      highpassHz: 120, // Filter out PC fans, AC hum and table bumps
      presenceHz: 2200, // Boost speech presence
      presenceGain: 3.5,
    },
    laptop: {
      id: 'laptop',
      name: 'Ноутбук / Вбудований',
      gain: 1.5,
      highpassHz: 100,
      presenceHz: 2000,
      presenceGain: 2.0,
    },
    close: {
      id: 'close',
      name: 'Близький / Гарнітура',
      gain: 1.0,
      highpassHz: 80,
      presenceHz: 2000,
      presenceGain: 0,
    },
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
