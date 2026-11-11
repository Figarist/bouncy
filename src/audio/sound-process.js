/**
 * Audio preprocessing & WAV encoding utilities for custom alert sounds.
 * Pure functions: safe for Node/Vitest tests and Web Audio runtime.
 */

export const MAX_CUSTOM_DURATION_SEC = 5.0;
export const TARGET_SAMPLE_RATE = 22050; // Compact, clear for alerts
export const MAX_CUSTOM_SOUNDS = 12;

/**
 * Mixes channels to mono, resamples/truncates to maxDuration,
 * applies fade-in/fade-out, and normalizes peak to targetPeak (default -6 dB = 0.501).
 *
 * @param {Float32Array[]} channelDataArray - Array of channel Float32Arrays
 * @param {number} srcSampleRate - Source sample rate (e.g. 44100 or 48000)
 * @param {object} [options]
 * @param {number} [options.maxDurationSec=5.0]
 * @param {number} [options.targetSampleRate=22050]
 * @param {number} [options.targetPeakDb=-6.0]
 * @returns {Float32Array} Processed mono samples
 */
export function prepareSamples(channelDataArray, srcSampleRate, options = {}) {
  const maxDurationSec = options.maxDurationSec ?? MAX_CUSTOM_DURATION_SEC;
  const targetRate = options.targetSampleRate ?? TARGET_SAMPLE_RATE;
  const targetPeakDb = options.targetPeakDb ?? -6.0;

  if (!channelDataArray || channelDataArray.length === 0 || !channelDataArray[0] || channelDataArray[0].length === 0) {
    return new Float32Array(0);
  }

  const numChannels = channelDataArray.length;
  const srcLength = channelDataArray[0].length;

  // 1. Mono downmix
  const mono = new Float32Array(srcLength);
  for (let ch = 0; ch < numChannels; ch++) {
    const chData = channelDataArray[ch];
    for (let i = 0; i < srcLength; i++) {
      mono[i] += (chData[i] || 0) / numChannels;
    }
  }

  // 2. Resample / linear interpolation & truncate to maxDuration
  const maxSrcSamples = Math.min(srcLength, Math.floor(srcSampleRate * maxDurationSec));
  const outLength = Math.max(1, Math.floor((maxSrcSamples / srcSampleRate) * targetRate));
  const resampled = new Float32Array(outLength);

  const ratio = (maxSrcSamples - 1) / Math.max(1, outLength - 1);
  for (let i = 0; i < outLength; i++) {
    const srcIdx = i * ratio;
    const i0 = Math.floor(srcIdx);
    const i1 = Math.min(i0 + 1, maxSrcSamples - 1);
    const frac = srcIdx - i0;
    resampled[i] = mono[i0] * (1 - frac) + mono[i1] * frac;
  }

  // 3. Peak normalization to targetPeakDb
  let maxAbs = 0;
  for (let i = 0; i < outLength; i++) {
    const abs = Math.abs(resampled[i]);
    if (abs > maxAbs) maxAbs = abs;
  }

  const targetPeak = Math.pow(10, targetPeakDb / 20); // -6 dB ≈ 0.501
  if (maxAbs > 0.0001) {
    const scale = targetPeak / maxAbs;
    for (let i = 0; i < outLength; i++) {
      resampled[i] *= scale;
    }
  }

  // 4. Fade in (20ms) and fade out (150ms) to avoid clicks
  const fadeInSamples = Math.min(Math.floor(targetRate * 0.02), Math.floor(outLength / 4));
  for (let i = 0; i < fadeInSamples; i++) {
    resampled[i] *= i / fadeInSamples;
  }

  const fadeOutSamples = Math.min(Math.floor(targetRate * 0.15), Math.floor(outLength / 2));
  for (let i = 0; i < fadeOutSamples; i++) {
    const idx = outLength - 1 - i;
    resampled[idx] *= i / fadeOutSamples;
  }

  return resampled;
}

/**
 * Encodes Float32Array mono samples into a standard 16-bit PCM WAV ArrayBuffer.
 *
 * @param {Float32Array} samples
 * @param {number} [sampleRate=22050]
 * @returns {ArrayBuffer}
 */
export function encodeWav(samples, sampleRate = TARGET_SAMPLE_RATE) {
  const numChannels = 1;
  const bytesPerSample = 2; // 16-bit
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // Helper to write ASCII chars
  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  /* RIFF chunk descriptor */
  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');

  /* "fmt " sub-chunk */
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size for PCM
  view.setUint16(20, 1, true);  // AudioFormat 1 = PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true); // BitsPerSample = 16

  /* "data" sub-chunk */
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Write 16-bit clamped samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const val = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(offset, Math.round(val), true);
    offset += 2;
  }

  return buffer;
}

/**
 * Converts ArrayBuffer / Uint8Array to base64 string.
 * @param {ArrayBuffer|Uint8Array} buffer
 * @returns {string}
 */
export function bufferToBase64(buffer) {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return typeof btoa !== 'undefined'
    ? btoa(binary)
    : Buffer.from(binary, 'binary').toString('base64');
}

/**
 * Converts base64 string to ArrayBuffer.
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToBuffer(base64) {
  const binary = typeof atob !== 'undefined'
    ? atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
