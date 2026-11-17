// Synthesized WebAudio sounds. No audio assets. Audio only starts
// after a user gesture; M toggles mute.
export class SoundBank {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return true;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      return true;
    } catch (e) { return false; }
  }
  tone(freq, dur, type, gain, slideTo) {
    if (this.muted || !this.ensure()) return;
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(gain || 0.12, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(t); osc.stop(t + dur + 0.02);
  }
  pickup() { this.tone(880, 0.14, 'sine', 0.10, 1320); }
  kindle() { this.tone(392, 0.3, 'triangle', 0.14, 784); setTimeout(() => this.tone(587, 0.35, 'triangle', 0.12, 1175), 70); }
  hit() { this.tone(160, 0.25, 'sawtooth', 0.14, 60); }
  gate() { this.tone(523, 0.4, 'sine', 0.12, 1046); }
  gameOver() { this.tone(330, 0.7, 'triangle', 0.14, 82); }
  win() {
    this.tone(523, 0.25, 'triangle', 0.13);
    setTimeout(() => this.tone(659, 0.25, 'triangle', 0.13), 130);
    setTimeout(() => this.tone(784, 0.5, 'triangle', 0.14, 1046), 270);
  }
  toggleMute() { this.muted = !this.muted; return this.muted; }
}
