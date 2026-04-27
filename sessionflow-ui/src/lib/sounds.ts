/**
 * Premium UI Sound Engine for SessionFlow.
 * Synthesizes rich, harmonic, and non-intrusive audio using Web Audio API.
 * Inspired by modern OS sounds (visionOS, iOS, macOS).
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
   * Helper to create a master output node with a limiter/compressor
   */
  private createOutput() {
    if (!this.ctx) return null;
    const compressor = this.ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, this.ctx.currentTime);
    compressor.knee.setValueAtTime(40, this.ctx.currentTime);
    compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
    compressor.attack.setValueAtTime(0, this.ctx.currentTime);
    compressor.release.setValueAtTime(0.25, this.ctx.currentTime);
    compressor.connect(this.ctx.destination);
    return compressor;
  }

  /**
   * playClick - Soft "woosh-pop" for outgoing messages.
   */
  playClick() {
    this.init();
    if (!this.ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = this.ctx.currentTime;
    
    // Core tone
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(110, time + 0.15);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    // Harmonic layer
    const harm = this.ctx.createOscillator();
    const hGain = this.ctx.createGain();
    harm.type = "triangle";
    harm.frequency.setValueAtTime(440, time);
    harm.frequency.exponentialRampToValueAtTime(220, time + 0.1);
    
    hGain.gain.setValueAtTime(0, time);
    hGain.gain.linearRampToValueAtTime(0.03, time + 0.01);
    hGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(output);
    harm.connect(hGain);
    hGain.connect(output);

    osc.start(time);
    harm.start(time);
    osc.stop(time + 0.2);
    harm.stop(time + 0.2);
  }

  /**
   * playPop - Water droplet / soft glass chime for incoming messages.
   */
  playPop() {
    this.init();
    if (!this.ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = this.ctx.currentTime;

    // Body of the pop
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, time);
    osc.frequency.exponentialRampToValueAtTime(440, time + 0.1);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.12, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.25);

    // High shimmer
    const chime = this.ctx.createOscillator();
    const cGain = this.ctx.createGain();
    chime.type = "sine";
    chime.frequency.setValueAtTime(1760, time);
    cGain.gain.setValueAtTime(0, time);
    cGain.gain.linearRampToValueAtTime(0.05, time + 0.005);
    cGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(output);
    chime.connect(cGain);
    cGain.connect(output);

    osc.start(time);
    chime.start(time);
    osc.stop(time + 0.3);
    chime.stop(time + 0.3);
  }

  /**
   * playHover - Ultra-subtle "felt" tick.
   */
  playHover() {
    this.init();
    if (!this.ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(1000, time);
    osc.frequency.exponentialRampToValueAtTime(100, time + 0.02);

    gain.gain.setValueAtTime(0.02, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.02);

    osc.connect(gain);
    gain.connect(output);

    osc.start(time);
    osc.stop(time + 0.02);
  }

  /**
   * playNotification - Complex harmonic chime (major triad).
   */
  playNotification() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    const chords = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    chords.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = time + (i * 0.04);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.08, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.8);

      osc.connect(gain);
      gain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + 1.0);
    });
  }

  /**
   * playRingtone - Layered, rhythmic session alert.
   */
  playRingtone() {
    this.stopRingtone();
    this._playRingOnce();
    this.ringtoneInterval = setInterval(() => this._playRingOnce(), 3000);
  }

  private _playRingOnce() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    // Elegant minor-9th sequence
    const notes = [
      { f: 440, t: 0, d: 0.4 },     // A4
      { f: 523.25, t: 0.2, d: 0.4 },  // C5
      { f: 659.25, t: 0.4, d: 0.6 },  // E5
      { f: 830.61, t: 0.6, d: 0.8 },  // G#5
    ];

    notes.forEach(note => {
      const osc = ctx.createOscillator();
      const sub = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = time + note.t;

      osc.type = "sine";
      osc.frequency.setValueAtTime(note.f, startTime);
      
      sub.type = "triangle";
      sub.frequency.setValueAtTime(note.f / 2, startTime);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + note.d);

      osc.connect(gain);
      sub.connect(gain);
      gain.connect(output);

      osc.start(startTime);
      sub.start(startTime);
      osc.stop(startTime + note.d);
      sub.stop(startTime + note.d);
    });
  }

  stopRingtone() {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }
  }

  /**
   * playCallEnd - Elegant descending sequence.
   */
  playCallEnd() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    const sequence = [783.99, 523.25]; // G5 to C5

    sequence.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = time + (i * 0.1);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq / 2, startTime + 0.2);

      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.1, startTime + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * playSessionLaunch - Rising arpeggio for starting a session.
   */
  playSessionLaunch() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    const arpeggio = [261.63, 329.63, 392.00, 523.25]; // C4, E4, G4, C5

    arpeggio.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const startTime = time + (i * 0.08);

      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, startTime);
      
      gain.gain.setValueAtTime(0, startTime);
      gain.gain.linearRampToValueAtTime(0.06, startTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

      osc.connect(gain);
      gain.connect(output);

      osc.start(startTime);
      osc.stop(startTime + 0.5);
    });
  }

  /**
   * playSessionComplete - Celebratory major chord for successful completion.
   */
  playSessionComplete() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5

    notes.forEach(freq => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(0.1, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 1.2);

      osc.connect(gain);
      gain.connect(output);

      osc.start(time);
      osc.stop(time + 1.5);
    });
    
    // Add a high sparkle
    const sparkle = ctx.createOscillator();
    const sGain = ctx.createGain();
    sparkle.type = "sine";
    sparkle.frequency.setValueAtTime(2093.00, time + 0.1); // C7
    sGain.gain.setValueAtTime(0, time + 0.1);
    sGain.gain.linearRampToValueAtTime(0.03, time + 0.15);
    sGain.gain.exponentialRampToValueAtTime(0.001, time + 0.6);
    sparkle.connect(sGain);
    sGain.connect(output);
    sparkle.start(time + 0.1);
    sparkle.stop(time + 0.7);
  }

  /**
   * playArchive - Soft sweep for moving to completed zone.
   */
  playArchive() {
    this.init();
    const ctx = this.ctx;
    if (!ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = ctx.currentTime;
    const filter = ctx.createBiquadFilter();
    const noise = ctx.createBufferSource();
    const bufferSize = ctx.sampleRate * 0.3;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);

    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    noise.buffer = buffer;
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(100, time + 0.3);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.05, time + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.3);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(output);

    noise.start(time);
    noise.stop(time + 0.3);
  }
  /**
   * playChatSend - "Mercury Whoosh": Rising sine sweep for outgoing messages.
   */
  playChatSend() {
    this.init();
    if (!this.ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = this.ctx.currentTime;
    
    // Core rising sweep
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(220, time);
    osc.frequency.exponentialRampToValueAtTime(880, time + 0.12);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.08, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    // Harmonic friction layer
    const harm = this.ctx.createOscillator();
    const hGain = this.ctx.createGain();
    harm.type = "triangle";
    harm.frequency.setValueAtTime(440, time);
    harm.frequency.exponentialRampToValueAtTime(1760, time + 0.1);
    
    hGain.gain.setValueAtTime(0, time);
    hGain.gain.linearRampToValueAtTime(0.02, time + 0.01);
    hGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);

    osc.connect(gain);
    gain.connect(output);
    harm.connect(hGain);
    hGain.connect(output);

    osc.start(time);
    harm.start(time);
    osc.stop(time + 0.2);
    harm.stop(time + 0.2);
  }

  /**
   * playChatReceive - "Luminous Drop": Descending chime for incoming messages.
   */
  playChatReceive() {
    this.init();
    if (!this.ctx) return;
    const output = this.createOutput();
    if (!output) return;

    const time = this.ctx.currentTime;

    // Bell body
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(1200, time);
    osc.frequency.exponentialRampToValueAtTime(600, time + 0.15);

    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(0.1, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

    // Shimmer overtone
    const shimmer = this.ctx.createOscillator();
    const sGain = this.ctx.createGain();
    shimmer.type = "sine";
    shimmer.frequency.setValueAtTime(2400, time);
    sGain.gain.setValueAtTime(0, time);
    sGain.gain.linearRampToValueAtTime(0.04, time + 0.005);
    sGain.gain.exponentialRampToValueAtTime(0.001, time + 0.2);

    // Sub-bass thud
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(100, time);
    subGain.gain.setValueAtTime(0, time);
    subGain.gain.linearRampToValueAtTime(0.05, time + 0.01);
    subGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    osc.connect(gain);
    gain.connect(output);
    shimmer.connect(sGain);
    sGain.connect(output);
    sub.connect(subGain);
    subGain.connect(output);

    osc.start(time);
    shimmer.start(time);
    sub.start(time);
    osc.stop(time + 0.5);
    shimmer.stop(time + 0.5);
    sub.stop(time + 0.2);
  }
}

export const sounds = new SoundEngine();

