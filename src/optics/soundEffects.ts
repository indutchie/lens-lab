// Procedural Web Audio API synthesizer for subtle mechanical camera optics sounds & UI-synced synth arpeggio notes

const ARP_NOTES = [523.25, 659.25, 783.99, 987.77, 1174.66]; // C5, E5, G5, B5, D6

class OpticsSoundEngine {
  private ctx: AudioContext | null = null;
  public muted: boolean = false;
  private lastTickTime: number = 0;
  private arpIndex: number = 0;

  private getContext(): AudioContext | null {
    if (this.muted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  /**
   * Subtle damped brass gear tick when rotating the focus ring
   */
  public playFocusTick() {
    const now = performance.now();
    if (now - this.lastTickTime < 42) return;
    this.lastTickTime = now;

    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = ctx.currentTime;
      osc.frequency.setValueAtTime(620 + Math.random() * 80, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.018);

      gain.gain.setValueAtTime(0.035, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.018);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.02);
    } catch {
      // Ignore audio errors on restricted autoplay
    }
  }

  /**
   * Crisp metallic iris blade click + soft synth arpeggio note synced to UI interaction
   */
  public playApertureClick(aperture: number) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = aperture === 2 ? 480 : aperture === 5.6 ? 680 : 920;
      osc.frequency.setValueAtTime(baseFreq, t);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.45, t + 0.035);

      gain.gain.setValueAtTime(0.055, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.038);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.04);

      this.playSyncedArpeggioNote();
    } catch {
      // Ignore
    }
  }

  /**
   * Smooth mechanical barrel slide sound + synth arpeggio chord when toggling Assembled vs Exploded
   */
  public playLensSlide(exploded: boolean) {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(exploded ? 220 : 340, t);
      osc.frequency.exponentialRampToValueAtTime(
        exploded ? 360 : 190,
        t + 0.14
      );

      gain.gain.setValueAtTime(0.04, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.16);

      this.playSyncedArpeggioNote();
    } catch {
      // Ignore
    }
  }

  /**
   * Soft ambient synth arpeggio tone synced to UI clicks
   */
  public playSyncedArpeggioNote() {
    const ctx = this.getContext();
    if (!ctx) return;

    try {
      const t = ctx.currentTime;
      const freq = ARP_NOTES[this.arpIndex % ARP_NOTES.length];
      this.arpIndex++;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(0.045, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.48);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.5);
    } catch {
      // Ignore
    }
  }
}

export const soundEngine = new OpticsSoundEngine();
