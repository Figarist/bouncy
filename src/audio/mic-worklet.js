/**
 * AudioWorkletProcessor that measures contiguous RMS dBFS blocks directly
 * on the browser's real-time audio thread so background tabs never drop samples.
 * Self-contained (no imports) so it loads cleanly via Blob URL offline.
 */
const BaseProcessor =
  typeof AudioWorkletProcessor === 'function'
    ? AudioWorkletProcessor
    : class {
        constructor() {
          this.port = { postMessage() {}, onmessage: null };
        }
      };

export class NoiseMeterProcessor extends BaseProcessor {
  constructor(options = {}) {
    super(options);
    const blockMs = options?.processorOptions?.blockMs ?? 32;
    const rate = typeof sampleRate === 'number' && sampleRate > 0 ? sampleRate : 48000;
    this.sampleRateHz = options?.processorOptions?.sampleRate || rate;
    this.targetSamples = Math.max(128, Math.round((this.sampleRateHz * blockMs) / 1000));
    this.sumSq = 0;
    this.sampleCount = 0;
    this.stopped = false;

    this.port.onmessage = (event) => {
      if (event?.data?.type === 'stop') {
        this.stopped = true;
      }
    };
  }

  process(inputs) {
    if (this.stopped) return false;

    const channel = inputs?.[0]?.[0];
    if (channel && channel.length > 0) {
      let sum = 0;
      for (let i = 0; i < channel.length; i++) {
        const s = channel[i];
        sum += s * s;
      }
      this.sumSq += sum;
      this.sampleCount += channel.length;

      if (this.sampleCount >= this.targetSamples) {
        const rms = Math.sqrt(this.sumSq / this.sampleCount);
        const clamped = rms > 1e-5 ? rms : 1e-5;
        const rawDb = 20 * Math.log10(clamped);
        const dtMs = (this.sampleCount / this.sampleRateHz) * 1000;

        this.port.postMessage({ type: 'rms', rawDb, dtMs });
        this.sumSq = 0;
        this.sampleCount = 0;
      }
    }

    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('noise-meter-processor', NoiseMeterProcessor);
}
