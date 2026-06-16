
const AMBIENT_SRC = "/ambient-rain.ogg";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private uiGain: GainNode | null = null;
  private ambientEl: HTMLAudioElement | null = null;
  private ambientNode: MediaElementAudioSourceNode | null = null;
  private muted = false;
  private started = false;

  setMuted(value: boolean) {
    this.muted = value;
    if (!this.ctx || !this.masterGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setTargetAtTime(value ? 0 : 1, now, 0.08);
  }

  isMuted() {
    return this.muted;
  }

  isStarted() {
    return this.started;
  }
  async startOnGesture() {
    if (this.started) return;

    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;

    this.ctx = new AudioCtor();
    if (this.ctx.state === "suspended") {
      try {
        await this.ctx.resume();
      } catch {
        return;
      }
    }

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = this.muted ? 0 : 1;
    this.masterGain.connect(this.ctx.destination);

    this.uiGain = this.ctx.createGain();
    this.uiGain.gain.value = 0.18;
    this.uiGain.connect(this.masterGain);

    this.startAmbient();
    this.started = true;
  }
  private startAmbient() {
    if (!this.ctx || !this.masterGain) return;

    const el = new Audio(AMBIENT_SRC);
    el.loop = true;
    el.preload = "auto";
    el.crossOrigin = "anonymous";
    this.ambientEl = el;

    const source = this.ctx.createMediaElementSource(el);
    const ambientGain = this.ctx.createGain();
    ambientGain.gain.value = 0;
    source.connect(ambientGain).connect(this.masterGain);
    this.ambientNode = source;
    ambientGain.gain.setTargetAtTime(0.18, this.ctx.currentTime, 1.4);

    el.play().catch(() => {
    });
  }
  private blip(opts: {
    frequency: number;
    duration?: number;
    type?: OscillatorType;
    sweepTo?: number;
    volume?: number;
  }) {
    if (!this.ctx || !this.uiGain || this.muted || !this.started) return;

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const duration = opts.duration ?? 0.12;
    const volume = opts.volume ?? 0.5;

    const osc = ctx.createOscillator();
    osc.type = opts.type ?? "sine";
    osc.frequency.setValueAtTime(opts.frequency, now);
    if (opts.sweepTo !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(opts.sweepTo, now + duration);
    }

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    osc.connect(gain).connect(this.uiGain);
    osc.start(now);
    osc.stop(now + duration + 0.05);
  }

  click() {
    this.blip({ frequency: 880, sweepTo: 620, duration: 0.06, type: "sine", volume: 0.18 });
  }

  send() {
    this.blip({ frequency: 740, sweepTo: 988, duration: 0.13, type: "sine", volume: 0.22 });
  }

  success() {
    this.blip({ frequency: 660, duration: 0.22, type: "sine", volume: 0.24 });
    window.setTimeout(
      () => this.blip({ frequency: 988, duration: 0.28, type: "sine", volume: 0.22 }),
      120
    );
  }
}

export const sound = new SoundEngine();
