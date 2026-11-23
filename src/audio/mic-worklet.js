/**
 * AudioWorkletProcessor that measures contiguous RMS dBFS, Peak/Crest Factor,
 * speech-vs-rumble band energy, and mic health flags directly on the browser's
 * real-time audio thread so background tabs never drop samples.
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
    const splitHz = options?.processorOptions?.speechSplitHz ?? 300;
    this.targetSamples = Math.max(128, Math.round((this.sampleRateHz * blockMs) / 1000));

    // 1-pole low-pass coefficient for separating low rumble (< splitHz) from speech band (>= splitHz)
    this.lowAlpha = 1 - Math.exp((-2 * Math.PI * splitHz) / this.sampleRateHz);
    this.lowState = 0;

    this.sumSq = 0;
    this.speechSumSq = 0;
    this.rumbleSumSq = 0;
    this.maxAbs = 0;
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
      let speechSum = 0;
      let rumbleSum = 0;
      let maxAbs = this.maxAbs;
      let low = this.lowState;
      const alpha = this.lowAlpha;

      for (let i = 0; i < channel.length; i++) {
        const raw = channel[i];
        const s = Number.isFinite(raw) ? raw : 0;
        const abs = s < 0 ? -s : s;
        if (abs > maxAbs) maxAbs = abs;
        sum += s * s;

        low += alpha * (s - low);
        const speech = s - low;
        rumbleSum += low * low;
        speechSum += speech * speech;
      }

      this.lowState = low;
      this.maxAbs = maxAbs;
      this.sumSq += sum;
      this.speechSumSq += speechSum;
      this.rumbleSumSq += rumbleSum;
      this.sampleCount += channel.length;

      if (this.sampleCount >= this.targetSamples) {
        const invN = 1 / this.sampleCount;
        const rms = Math.sqrt(this.sumSq * invN);
        const speechRms = Math.sqrt(this.speechSumSq * invN);
        const rumbleRms = Math.sqrt(this.rumbleSumSq * invN);

        const rawDb = 20 * Math.log10(rms > 1e-5 ? rms : 1e-5);
        const peakDb = 20 * Math.log10(this.maxAbs > 1e-5 ? this.maxAbs : 1e-5);
        const speechDb = 20 * Math.log10(speechRms > 1e-5 ? speechRms : 1e-5);
        const rumbleDb = 20 * Math.log10(rumbleRms > 1e-5 ? rumbleRms : 1e-5);
        const crestDb = Math.max(0, peakDb - rawDb);
        const dtMs = (this.sampleCount / this.sampleRateHz) * 1000;

        this.port.postMessage({
          type: 'rms',
          rawDb,
          dtMs,
          peakDb,
          crestDb,
          speechDb,
          rumbleDb,
          isZeroBlock: this.maxAbs < 1e-6,
          isClipping: this.maxAbs >= 0.98,
        });

        this.sumSq = 0;
        this.speechSumSq = 0;
        this.rumbleSumSq = 0;
        this.maxAbs = 0;
        this.sampleCount = 0;
      }
    }

    return true;
  }
}

if (typeof registerProcessor === 'function') {
  registerProcessor('noise-meter-processor', NoiseMeterProcessor);
}
