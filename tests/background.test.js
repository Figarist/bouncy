import { describe, expect, it } from 'vitest';
import { NoiseMeterProcessor } from '../src/audio/mic-worklet.js';
import {
  BackgroundWatchdog,
  clampSimulationDt,
} from '../src/game/bg-watchdog.js';

describe('NoiseMeterProcessor (AudioWorklet)', () => {
  it('accumulates 128-sample quanta without drops and posts exact RMS dBFS', () => {
    const proc = new NoiseMeterProcessor({
      processorOptions: { blockMs: 10, sampleRate: 48000 },
    });
    const messages = [];
    proc.port.postMessage = (msg) => messages.push(msg);

    // targetSamples at 10ms @ 48kHz = 480 samples -> 4 quanta of 128 = 512 samples
    const quantum = new Float32Array(128).fill(0.5);
    expect(proc.process([[quantum]])).toBe(true);
    expect(proc.process([[quantum]])).toBe(true);
    expect(proc.process([[quantum]])).toBe(true);
    expect(messages.length).toBe(0);

    expect(proc.process([[quantum]])).toBe(true);
    expect(messages.length).toBe(1);
    expect(messages[0].type).toBe('rms');
    // 20 * log10(0.5) = -6.0206 dBFS
    expect(messages[0].rawDb).toBeCloseTo(-6.02, 2);
    expect(messages[0].dtMs).toBeCloseTo((512 / 48000) * 1000, 3);
  });

  it('clamps digital silence to -100 dBFS and ignores empty inputs safely', () => {
    const proc = new NoiseMeterProcessor({
      processorOptions: { blockMs: 5, sampleRate: 48000 },
    });
    const messages = [];
    proc.port.postMessage = (msg) => messages.push(msg);

    expect(proc.process([])).toBe(true);
    const silence = new Float32Array(128);
    proc.process([[silence]]);
    proc.process([[silence]]);
    expect(messages.length).toBe(1);
    expect(messages[0].rawDb).toBeCloseTo(-100, 3);
  });

  it('stops processing after receiving stop message', () => {
    const proc = new NoiseMeterProcessor();
    proc.port.onmessage({ data: { type: 'stop' } });
    expect(proc.process([[new Float32Array(128)]])).toBe(false);
  });
});

describe('clampSimulationDt', () => {
  it('clamps OS sleep gaps while preserving normal frame steps', () => {
    expect(clampSimulationDt(0.032, 0.25)).toBeCloseTo(0.032, 5);
    expect(clampSimulationDt(600, 0.25)).toBe(0.25);
    expect(clampSimulationDt(-1, 0.25)).toBe(0);
    expect(clampSimulationDt(Number.NaN, 0.25)).toBe(0);
  });
});

describe('BackgroundWatchdog', () => {
  it('stays quiet when AudioWorklet delivers regular frames', () => {
    const wd = new BackgroundWatchdog({
      audioFreezeDetectMs: 2500,
      sleepGapMs: 2500,
      resumeRetryCooldownMs: 3000,
    });
    wd.enterBackground(1000);
    wd.recordWorkletActivity(1500);

    const res = wd.evaluateHeartbeat({
      now: 1600,
      isListening: true,
      isWorkletActive: true,
      isSimulated: false,
      audioContextState: 'running',
    });

    expect(res.osSlept).toBe(false);
    expect(res.audioFrozenInBackground).toBe(false);
    expect(res.shouldAttemptResume).toBe(false);
    expect(res.shouldDriveFallbackTick).toBe(false);
    expect(wd.consumeFrozenWarning()).toBe(false);
  });

  it('detects browser background audio freeze when worker ticks normally but worklet stalls', () => {
    const wd = new BackgroundWatchdog({
      audioFreezeDetectMs: 2500,
      sleepGapMs: 2500,
      resumeRetryCooldownMs: 3000,
    });
    wd.enterBackground(1000);

    // Worker keeps ticking every 100ms up to 3600ms, but worklet stopped at 1000ms
    let res = wd.evaluateHeartbeat({
      now: 2000,
      isListening: true,
      isWorkletActive: true,
      isSimulated: false,
      audioContextState: 'running',
    });
    expect(res.audioFrozenInBackground).toBe(false);

    wd.lastWorkerAt = 3500;
    res = wd.evaluateHeartbeat({
      now: 3600,
      isListening: true,
      isWorkletActive: true,
      isSimulated: false,
      audioContextState: 'suspended',
    });
    expect(res.osSlept).toBe(false);
    expect(res.audioFrozenInBackground).toBe(true);
    expect(res.shouldAttemptResume).toBe(true);

    wd.markResumeAttempt(3600);
    const second = wd.evaluateHeartbeat({
      now: 3700,
      isListening: true,
      isWorkletActive: true,
      isSimulated: false,
      audioContextState: 'suspended',
    });
    expect(second.shouldAttemptResume).toBe(false);
    expect(wd.consumeFrozenWarning()).toBe(true);
    expect(wd.consumeFrozenWarning()).toBe(false);
  });

  it('distinguishes full OS sleep from browser background audio freeze', () => {
    const wd = new BackgroundWatchdog({
      audioFreezeDetectMs: 2500,
      sleepGapMs: 2500,
      resumeRetryCooldownMs: 3000,
    });
    wd.enterBackground(1000);

    // Device slept for 10 minutes (worker itself jumped 600s)
    const res = wd.evaluateHeartbeat({
      now: 601000,
      isListening: true,
      isWorkletActive: true,
      isSimulated: false,
      audioContextState: 'running',
    });

    expect(res.osSlept).toBe(true);
    expect(res.audioFrozenInBackground).toBe(false);
    expect(wd.consumeFrozenWarning()).toBe(false);
  });

  it('requests fallback worker ticks when mic is off or ?debug simulation is active', () => {
    const wd = new BackgroundWatchdog();
    wd.enterBackground(1000);

    expect(
      wd.evaluateHeartbeat({
        now: 1100,
        isListening: false,
        isWorkletActive: false,
        isSimulated: false,
      }).shouldDriveFallbackTick
    ).toBe(true);

    expect(
      wd.evaluateHeartbeat({
        now: 1200,
        isListening: true,
        isWorkletActive: true,
        isSimulated: true,
      }).shouldDriveFallbackTick
    ).toBe(true);
  });
});
