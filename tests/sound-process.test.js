import { describe, it, expect } from 'vitest';
import {
  prepareSamples,
  encodeWav,
  bufferToBase64,
  base64ToBuffer,
  MAX_CUSTOM_DURATION_SEC,
  TARGET_SAMPLE_RATE,
} from '../src/audio/sound-process.js';

describe('sound-process', () => {
  it('mixes stereo channels to mono and limits duration to 5s', () => {
    const srcRate = 44100;
    // 7 seconds of stereo audio
    const left = new Float32Array(srcRate * 7);
    const right = new Float32Array(srcRate * 7);
    for (let i = 0; i < left.length; i++) {
      left[i] = 0.5;
      right[i] = 0.3;
    }

    const processed = prepareSamples([left, right], srcRate, {
      maxDurationSec: 5.0,
      targetSampleRate: TARGET_SAMPLE_RATE,
    });

    const expectedSamples = 5.0 * TARGET_SAMPLE_RATE;
    expect(processed.length).toBe(expectedSamples);
    // Peak normalized
    let maxAbs = 0;
    for (let i = 0; i < processed.length; i++) {
      if (Math.abs(processed[i]) > maxAbs) maxAbs = Math.abs(processed[i]);
    }
    // targetPeakDb: -6 dB ≈ 0.501187
    expect(maxAbs).toBeCloseTo(0.501, 2);
  });

  it('applies fade-in and fade-out smoothly without clicks', () => {
    const srcRate = 22050;
    const len = srcRate * 2; // 2 seconds constant 1.0
    const chan = new Float32Array(len).fill(1.0);

    const processed = prepareSamples([chan], srcRate, {
      maxDurationSec: 5.0,
      targetSampleRate: srcRate,
    });

    expect(processed[0]).toBe(0); // Fade in starts at 0
    expect(processed[processed.length - 1]).toBe(0); // Fade out ends at 0
  });

  it('encodes valid 16-bit PCM WAV with correct RIFF header', () => {
    const samples = new Float32Array([0, 0.5, -0.5, 0]);
    const wavBuffer = encodeWav(samples, TARGET_SAMPLE_RATE);

    expect(wavBuffer.byteLength).toBe(44 + samples.length * 2);

    const view = new DataView(wavBuffer);
    const readStr = (offset, len) => {
      let s = '';
      for (let i = 0; i < len; i++) s += String.fromCharCode(view.getUint8(offset + i));
      return s;
    };

    expect(readStr(0, 4)).toBe('RIFF');
    expect(readStr(8, 4)).toBe('WAVE');
    expect(readStr(12, 4)).toBe('fmt ');
    expect(view.getUint16(20, true)).toBe(1); // PCM
    expect(view.getUint16(22, true)).toBe(1); // Mono
    expect(view.getUint32(24, true)).toBe(TARGET_SAMPLE_RATE);
    expect(view.getUint16(34, true)).toBe(16); // 16-bit
    expect(readStr(36, 4)).toBe('data');
    expect(view.getUint32(40, true)).toBe(samples.length * 2);
  });

  it('converts buffer to base64 and back losslessly', () => {
    const original = new Uint8Array([0, 255, 128, 42, 64, 1, 99]);
    const b64 = bufferToBase64(original.buffer);
    expect(typeof b64).toBe('string');
    const restored = new Uint8Array(base64ToBuffer(b64));
    expect(Array.from(restored)).toEqual(Array.from(original));
  });
});
