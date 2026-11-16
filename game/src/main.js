// Emberwake — the game itself: state machine, fixed-step loop,
// collisions and scoring. Rendering is render.js, the chasm is
// world.js, the ember and its effects are entities.js.
//
// States: title → playing ⇄ paused → over | win → (Enter) → title
// of the next descent. One fixed step is 1/60 s; rendering happens
// once per animation frame after as many steps as the clock owes.

import { BRAZIERS_TOTAL, TUNING, ZONES } from './config.js';
import { Rng, seedFromText } from './random.js';
import { Input } from './input.js';
import { Sound } from './audio.js';
import { Player, Particles, Floaters } from './entities.js';
import { World } from './world.js';
import { Renderer } from './render.js';
import { applyShot } from './shots.js';

const STEP = 1 / 60;
const BEST_KEY = 'emberwake-best';

class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.sound = new Sound();
    this.renderer = new Renderer(this.ctx);
    this.player = new Player();
    this.rng = new Rng(seedFromText('emberwake-run'));
    this.fxRng = new Rng(seedFromText('emberwake-fx'));
    this.world = new World(this.rng);
    this.particles = new Particles();
    this.floaters = new Floaters();
    this.state = 'title';
    this.time = 0;
    this.best = 0;
    try { this.best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { this.best = 0; }
    this.resetRun();
    this.trailClock = 0;
  }

  resetRun() {
    this.player.reset();
    this.world.reset(0);
    this.score = 0;
    this.kindled = 0;
    this.combo = 1;
    this.chain = 0;
    this.comboTimer = 0;
    this.sparksTaken = 0;
    this.runTime = 0;
    this.shake = 0;
    this.endCause = null;
    this.lastZone = 0;
    this.zoneBanner = { numeral: '', name: '', sub: '', t: 0 };
  }

  startRun() {
    this.resetRun();
    this.state = 'playing';
    this.showZoneBanner(0);
    this.sound.uiStart();
    this.sound.setKindled(0);
  }

  showZoneBanner(zoneIndex) {
    const subs = [
      'Gather sparks. Light the rings. Mind the stone.',
      'The stone falls red here, and the wind picks sides.',
      'Pale wisps hunt in the dark. The gate is close.',
    ];
    const zone = ZONES[zoneIndex];
    this.zoneBanner = { numeral: zone.numeral, name: zone.name, sub: subs[zoneIndex], t: 2.8 };
  }

  gameOver(cause) {
    this.state = 'over';
    this.endCause = cause;
    this.saveBest();
    if (cause === 'shards') {
      this.particles.burst(this.fxRng, this.player.x, this.player.y, { count: 42, color: '#ff8a5c', speed: 260, life: 1.0, size: 4, glow: 12 });
      this.particles.burst(this.fxRng, this.player.x, this.player.y, { count: 18, color: '#8f7ff5', speed: 180, life: 0.9, size: 3 });
      this.shake = 16;
    } else {
      this.particles.burst(this.fxRng, this.player.x, this.player.y, { count: 22, color: '#7a6a55', speed: 90, life: 1.4, size: 3 });
    }
    this.sound.lose();
  }

  winRun() {
    this.score += TUNING.scoreWinBonus + Math.round(this.player.fuel) * TUNING.scoreFuelBonus;
    this.state = 'win';
    this.saveBest();
    this.sound.gate();
    this.sound.win();
    for (let i = 0; i < 3; i++) {
      this.particles.burst(this.fxRng, this.player.x + (i - 1) * 90, this.player.y + 30, { count: 26, color: '#ffd76b', speed: 240, life: 1.2, size: 4, glow: 14 });
    }
  }

  saveBest() {
    if (this.score > this.best) {
      this.best = this.score;
      try { localStorage.setItem(BEST_KEY, String(this.best)); } catch { /* private mode: play on */ }
    }
  }

  handlePresses() {
    for (const code of this.input.takePresses()) {
      if (code === 'KeyM') {
        const muted = this.sound.toggleMute();
        this.floaters.add(this.player.x, this.player.y - 40, muted ? 'SOUND OFF' : 'SOUND ON', { size: 15, color: '#cdd5f0' });
        continue;
      }
      if (this.input.anyGesture) this.sound.unlock();
      if (this.state === 'title' && (code === 'Enter' || code === 'Space' || code === 'PointerDown')) {
        this.startRun();
      } else if ((this.state === 'over' || this.state === 'win') && (code === 'Enter' || code === 'Space' || code === 'PointerDown')) {
        this.startRun();
      } else if (this.state === 'playing' && (code === 'KeyP' || code === 'Escape')) {
        this.state = 'paused';
      } else if (this.state === 'paused' && (code === 'KeyP' || code === 'Escape' || code === 'Enter')) {
        this.state = 'playing';
      }
    }
  }

  update(dt) {
    this.time += dt;
    this.handlePresses();
    if (this.zoneBanner.t > 0) this.zoneBanner.t -= dt;
    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 26);

    if (this.state === 'paused') return;

    if (this.state === 'title') {
      // Attract mode: the chasm scrolls and sparks drift, no stakes.
      // The ember hovers in the clear band under the subtitle.
      this.player.y = 392 + Math.sin(this.time * 1.3) * 10;
      this.world.update(dt * 0.55, 0, this.player);
      this.particles.update(dt, this.world.scrollSpeed(0) * 0.55);
      this.emitTrail(dt, 0.5);
      return;
    }

    if (this.state === 'over' || this.state === 'win') {
      this.world.update(dt * 0.3, this.kindled, this.player);
      this.particles.update(dt, this.world.scrollSpeed(this.kindled) * 0.3);
      this.floaters.update(dt);
      return;
    }

    // playing ------------------------------------------------------
    this.runTime += dt;
    const gust = this.world.gustAt(this.player.x, this.player.y);
    if (gust && !this.wasInGust) this.sound.gust();
    this.wasInGust = !!gust;
    this.player.update(dt, this.input, gust);
    this.world.update(dt, this.kindled, this.player);
    this.particles.update(dt, this.world.scrollSpeed(this.kindled));
    this.floaters.update(dt);
    this.emitTrail(dt, 1);

    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) { this.combo = 1; this.chain = 0; }
    }

    this.collide();
    if (this.state !== 'playing') return;

    if (this.player.fuel <= 0) {
      this.player.fuel = 0;
      this.gameOver('fuel');
    }
    const zoneNow = this.world.zoneIndex;
    if (zoneNow !== this.lastZone) {
      this.lastZone = zoneNow;
      this.showZoneBanner(zoneNow);
    }
  }

  emitTrail(dt, rate) {
    this.trailClock -= dt;
    if (this.trailClock <= 0) {
      this.trailClock = 0.024;
      const p = this.player;
      this.particles.spawn({
        x: p.x + this.fxRng.range(-4, 4), y: p.y + 12,
        vx: -p.vx * 0.12, vy: 40,
        life: this.fxRng.range(0.3, 0.55) * rate + 0.15,
        size: this.fxRng.range(2, 3.6),
        color: this.fxRng.chance(0.7) ? '#ffb03a' : '#ff7a2f',
        drag: 1.4, glow: 8,
      });
    }
  }

  collide() {
    const p = this.player;
    const w = this.world;

    for (const s of w.sparks) {
      const d = Math.hypot(s.x - p.x, s.y - p.y);
      if (d < TUNING.collectRadius) {
        s.y = -9999; // collected; the cull in world.update removes it next step
        this.sparksTaken += 1;
        this.chain += 1;
        this.comboTimer = TUNING.comboWindow;
        const next = Math.min(TUNING.comboMax, 1 + Math.floor(this.chain / 3));
        if (next > this.combo) {
          this.combo = next;
          this.floaters.add(p.x, p.y - 34, `COMBO ×${this.combo}`, { size: 19, color: '#ffd76b' });
        }
        const gained = TUNING.scorePerSpark * this.combo;
        this.score += gained;
        p.fuel = Math.min(TUNING.fuelMax, p.fuel + TUNING.fuelPerSpark);
        this.sound.spark(this.combo);
        this.particles.burst(this.fxRng, s.x, s.y, { count: 5, color: '#ffd76b', speed: 90, life: 0.4, size: 2.4, glow: 10 });
      }
    }

    for (const b of w.braziers) {
      if (b.lit) continue;
      const d = Math.hypot(b.x - p.x, b.y - p.y);
      if (d < TUNING.kindleRadius + 12) {
        b.lit = true;
        this.kindled += 1;
        const gained = TUNING.scorePerKindle * this.combo;
        this.score += gained;
        p.fuel = Math.min(TUNING.fuelMax, p.fuel + TUNING.fuelPerKindle);
        this.sound.kindle();
        this.sound.setKindled(this.kindled);
        this.shake = Math.max(this.shake, 5);
        this.particles.burst(this.fxRng, b.x, b.y, { count: 40, color: '#ffb03a', speed: 280, life: 1.0, size: 4, glow: 14 });
        this.particles.burst(this.fxRng, b.x, b.y, { count: 16, color: '#fff3c4', speed: 150, life: 0.7, size: 3, glow: 12 });
        this.floaters.add(b.x, b.y - 84, this.kindled >= BRAZIERS_TOTAL ? 'THE LAST BRAZIER BURNS' : `BRAZIER KINDLED +${gained}`, { size: 24, color: '#ffd76b' });
        if (this.kindled >= BRAZIERS_TOTAL) {
          w.armGate();
          this.floaters.add(p.x, p.y - 60, 'THE DAWN GATE OPENS ABOVE THE FLOOR', { size: 18, color: '#fff3d0' });
        }
      }
    }

    if (p.invulnerable <= 0) {
      for (const s of w.shards) {
        const d = Math.hypot(s.x - p.x, s.y - p.y);
        if (d < s.radius * 0.74 + p.radius * 0.72) { this.takeHit(s.x, s.y, '#e5564b'); break; }
      }
    }
    if (this.state === 'playing' && p.invulnerable <= 0) {
      for (const wsp of w.wisps) {
        const d = Math.hypot(wsp.x - p.x, wsp.y - p.y);
        if (d < wsp.radius + p.radius * 0.7) { this.takeHit(wsp.x, wsp.y, '#a8ecff'); break; }
      }
    }

    if (w.gate) {
      const d = Math.hypot(w.gate.x - p.x, w.gate.y - p.y);
      if (d < w.gate.radius) this.winRun();
    }
  }

  takeHit(x, y, color) {
    const p = this.player;
    p.hurt();
    this.combo = 1;
    this.chain = 0;
    this.comboTimer = 0;
    this.shake = 13;
    this.sound.hit();
    this.particles.burst(this.fxRng, x, y, { count: 20, color, speed: 220, life: 0.7, size: 3.4, glow: 10 });
    this.floaters.add(p.x, p.y - 40, p.hearts > 0 ? 'THE EMBER CRACKS' : 'SHATTERED', { size: 19, color: '#ff9a8a' });
    if (!p.alive) this.gameOver('shards');
  }
}

// Boot ----------------------------------------------------------------

const canvas = document.getElementById('game');
const game = new Game(canvas);
window.__emberwake = game;

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
if (shotName) {
  // Screenshot mode: compose the scene, step it a fixed number of
  // fixed steps, draw once, and say so. No loop, no sound.
  const steps = applyShot(game, shotName);
  for (let i = 0; i < steps; i++) game.update(STEP);
  game.renderer.draw(game, 0);
  window.__shotReady = true;
} else {
  let last = performance.now();
  let owed = 0;
  const frame = (now) => {
    owed += Math.min(0.1, (now - last) / 1000);
    last = now;
    while (owed >= STEP) {
      game.update(STEP);
      owed -= STEP;
    }
    game.renderer.draw(game, Math.min(0.05, owed + STEP));
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
