// Emberwake — synthesized sound. No audio files: a small WebAudio
// engine builds every effect and the ambient score from oscillators
// and filtered noise, so the game ships as code alone.
//
// The ambient pad is two detuned triangles under a low-pass filter.
// Kindling braziers raises the filter cutoff, so the chasm literally
// sounds brighter the more of it you have lit.

export class Sound {
  constructor() {
    this.ctx = null;
    this.muted = false;
    this.padFilter = null;
    this.padGain = null;
    this.noiseBuffer = null;
  }

  // Browsers only let audio start after a gesture; call this from the
  // first key press or click. Safe to call again.
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    this.ctx = ctx;

    this.master = ctx.createGain();
    this.master.gain.value = this.muted ? 0 : 0.8;
    const comp = ctx.createDynamicsCompressor();
    this.master.connect(comp);
    comp.connect(ctx.destination);

    // A shared buffer of white noise for wind and impacts.
    const len = ctx.sampleRate * 1.2;
    this.noiseBuffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.startPad();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.8, this.ctx.currentTime, 0.03);
    }
  }

  toggleMute() {
    this.setMuted(!this.muted);
    return this.muted;
  }

  startPad() {
    const ctx = this.ctx;
    this.padFilter = ctx.createBiquadFilter();
    this.padFilter.type = 'lowpass';
    this.padFilter.frequency.value = 240;
    this.padFilter.Q.value = 0.6;
    this.padGain = ctx.createGain();
    this.padGain.gain.value = 0.05;
    this.padFilter.connect(this.padGain);
    this.padGain.connect(this.master);
    // A low root and its fifth, slightly detuned against each other.
    for (const [freq, detune] of [[110, 0], [110, 7], [164.81, -5]]) {
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(this.padFilter);
      osc.start();
    }
    // A slow swell so the pad breathes.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 0.018;
    lfo.connect(lfoGain);
    lfoGain.connect(this.padGain.gain);
    lfo.start();
  }

  // Braziers lit so far, 0..7: brighten the pad as the chasm lights.
  setKindled(n) {
    if (!this.padFilter || !this.ctx) return;
    const target = 240 + n * 150;
    this.padFilter.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.8);
  }

  tone({ freq, freqEnd = null, type = 'sine', dur = 0.18, vol = 0.2, delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.3, vol = 0.25, freq = 800, freqEnd = null, type = 'bandpass', delay = 0 }) {
    if (!this.ctx) return;
    const ctx = this.ctx;
    const t0 = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (freqEnd) filter.frequency.exponentialRampToValueAtTime(Math.max(30, freqEnd), t0 + dur);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  // Effects -------------------------------------------------------

  spark(combo) {
    // Each link of a combo climbs a pentatonic step.
    const steps = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5];
    const f = steps[Math.min(combo, steps.length - 1)];
    this.tone({ freq: f, type: 'sine', dur: 0.16, vol: 0.16 });
    this.tone({ freq: f * 2, type: 'sine', dur: 0.1, vol: 0.05 });
  }

  kindle() {
    // A warm major swell: root, third, fifth, octave, plus shimmer.
    for (const [f, d] of [[261.63, 0], [329.63, 0.05], [392.0, 0.1], [523.25, 0.16]]) {
      this.tone({ freq: f, type: 'triangle', dur: 0.9, vol: 0.16, delay: d });
    }
    this.noise({ dur: 0.7, vol: 0.05, freq: 2400, freqEnd: 4800, type: 'highpass' });
  }

  hit() {
    this.noise({ dur: 0.28, vol: 0.3, freq: 900, freqEnd: 140 });
    this.tone({ freq: 130, freqEnd: 48, type: 'sawtooth', dur: 0.3, vol: 0.22 });
  }

  gust() {
    this.noise({ dur: 0.8, vol: 0.1, freq: 500, freqEnd: 1600 });
  }

  gate() {
    for (const [f, d] of [[392.0, 0], [523.25, 0.09], [659.25, 0.18], [783.99, 0.27]]) {
      this.tone({ freq: f, type: 'triangle', dur: 0.5, vol: 0.15, delay: d });
    }
  }

  win() {
    const seq = [523.25, 659.25, 783.99, 1046.5, 783.99, 1046.5, 1318.5];
    seq.forEach((f, i) => this.tone({ freq: f, type: 'triangle', dur: 0.42, vol: 0.16, delay: i * 0.11 }));
  }

  lose() {
    const seq = [392.0, 329.63, 261.63, 196.0];
    seq.forEach((f, i) => this.tone({ freq: f, freqEnd: f * 0.94, type: 'triangle', dur: 0.5, vol: 0.15, delay: i * 0.16 }));
  }

  uiStart() {
    this.tone({ freq: 659.25, type: 'sine', dur: 0.12, vol: 0.12 });
    this.tone({ freq: 987.77, type: 'sine', dur: 0.2, vol: 0.1, delay: 0.07 });
  }
}
