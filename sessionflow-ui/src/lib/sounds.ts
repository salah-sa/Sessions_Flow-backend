/**
 * UI Sound effects library for SessionFlow.
 * Uses Web Audio API to synthesize clean, non-intrusive sounds.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private ringtoneInterval: ReturnType<typeof setInterval> | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  /**
   * Soft UI click - used for sending messages
   */
  playClick() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, this.ctx.currentTime + 0.1);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.1);
  }

  /**
   * Subtle bubble pop - used for receiving messages
   */
  playPop() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(400, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.05);

    gain.gain.setValueAtTime(0.1, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.15);
  }

  /**
   * Extremely subtle hover tick - ~30ms duration
   */
  playHover() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    // Quick downsweep for a "tick" sound
    osc.frequency.setValueAtTime(1200, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.03);

    // Very quiet
    gain.gain.setValueAtTime(0.03, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.03);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.03);
  }

  /**
   * Warm, pleasant two-tone chime for pop-up notifications
   */
  playNotification() {
    this.init();
    if (!this.ctx) return;

    // First note (C5)
    const osc1 = this.ctx.createOscillator();
    const gain1 = this.ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(523.25, this.ctx.currentTime); // C5
    gain1.gain.setValueAtTime(0, this.ctx.currentTime);
    gain1.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    // Second note (E5) delayed slightly
    const osc2 = this.ctx.createOscillator();
    const gain2 = this.ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(659.25, this.ctx.currentTime + 0.1); // E5
    gain2.gain.setValueAtTime(0, this.ctx.currentTime + 0.1);
    gain2.gain.linearRampToValueAtTime(0.15, this.ctx.currentTime + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.5);

    osc1.connect(gain1);
    gain1.connect(this.ctx.destination);
    
    osc2.connect(gain2);
    gain2.connect(this.ctx.destination);

    osc1.start(this.ctx.currentTime);
    osc1.stop(this.ctx.currentTime + 0.3);
    
    osc2.start(this.ctx.currentTime + 0.1);
    osc2.stop(this.ctx.currentTime + 0.5);
  }

  /**
   * Repeating three-note ringtone for incoming calls.
   * Plays every 2 seconds until stopRingtone() is called.
   */
  playRingtone() {
    this.stopRingtone(); // Clear any existing
    this._playRingOnce();
    this.ringtoneInterval = setInterval(() => {
      this._playRingOnce();
    }, 2000);
  }

  private _playRingOnce() {
    this.init();
    if (!this.ctx) return;

    const notes = [
      { freq: 587.33, start: 0, dur: 0.15 },     // D5
      { freq: 783.99, start: 0.2, dur: 0.15 },    // G5
      { freq: 880.00, start: 0.4, dur: 0.25 },    // A5
    ];

    for (const note of notes) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(note.freq, this.ctx.currentTime + note.start);

      gain.gain.setValueAtTime(0, this.ctx.currentTime + note.start);
      gain.gain.linearRampToValueAtTime(0.18, this.ctx.currentTime + note.start + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + note.start + note.dur);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(this.ctx.currentTime + note.start);
      osc.stop(this.ctx.currentTime + note.start + note.dur);
    }
  }

  /**
   * Stop the repeating ringtone.
   */
  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * Short descending tone for call rejection/end.
   */
  playCallEnd() {
    this.init();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(600, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.3);

    gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start();
    osc.stop(this.ctx.currentTime + 0.3);
  }
}

export const sounds = new SoundEngine();

