// Emberwake — state machine, fixed-step loop, collisions, scoring.
import {
  VIEW_W, START_LIGHT, MAX_LIGHT, LIGHT_DRAIN, SPARK_LIGHT, KINDLE_LIGHT,
  START_HEARTS, HIT_INVULN_MS, BRAZIERS_TO_WIN, COMBO_WINDOW_MS, FIXED_STEP,
  PLAYER_SPEED, PLAYER_X_MIN, PLAYER_X_MAX, PLAYER_Y_MIN, PLAYER_Y_MAX,
} from './config.js';
import { Rng, seedFromUrl } from './random.js';
import { Input } from './input.js';
import { SoundBank } from './audio.js';
import { World } from './world.js';
import { Ember, Particles, FloatTexts, touches } from './entities.js';
import { Renderer } from './render.js';
import { shotFromUrl, setupShot } from './shots.js';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.renderer = new Renderer(this.ctx);
    this.input = new Input(canvas);
    this.sound = new SoundBank();
    this.seed = seedFromUrl(20261117);
    this.reset(this.seed);
    this.state = 'title';
  }
  reset(seed) {
    this.seed = seed;
    this.rng = new Rng(seed);
    this.world = new World(this.rng);
    this.player = new Ember(VIEW_W / 2, 300);
    this.player.light = START_LIGHT;
    this.player.hearts = START_HEARTS;
    this.particles = new Particles();
    this.floats = new FloatTexts();
    this.score = 0;
    this.sparks = 0;
    this.kindled = 0;
    this.combo = 0;
    this.comboUntil = 0;
    this.timeMs = 0;
    this.elapsed = 0;
    this.grade = 'C';
    this.overReason = '';
  }
  startRun() {
    const fresh = (Date.now() % 90000) + 1000;
    this.reset(this.shotMode ? this.seed : fresh);
    this.state = 'playing';
    this.sound.ensure();
  }
  computeGrade() {
    const total = this.score + this.sparks * 10 + this.player.hearts * 300 - Math.floor(this.elapsed) * 2;
    if (total >= 3200) return 'S';
    if (total >= 2400) return 'A';
    if (total >= 1600) return 'B';
    return 'C';
  }
  endRun(reason) {
    this.state = 'gameover';
    this.overReason = reason;
    this.sound.gameOver();
  }
  stepFixed(n) {
    for (let i = 0; i < n; i++) this.update(FIXED_STEP);
    this.renderer.draw(this);
  }
  update(dt) {
    this.timeMs += dt * 1000;
    const inp = this.input;
    // Global keys
    if (inp.wasPressed('m')) this.sound.toggleMute();
    if (this.state === 'title' || this.state === 'gameover' || this.state === 'victory') {
      this.world.update(dt * 0.35, this.kindled);
      this.particles.update(dt); this.floats.update(dt);
      if (inp.wasPressed('enter', ' ', 'click')) this.startRun();
      inp.endFrame();
      return;
    }
    if (inp.wasPressed('p', 'escape')) {
      this.state = this.state === 'paused' ? 'playing' : 'paused';
      inp.endFrame();
      return;
    }
    if (this.state === 'paused') { inp.endFrame(); return; }
    // Playing
    this.elapsed += dt;
    const p = this.player;
    let mx = inp.axisX(); let my = inp.axisY();
    if (inp.mouseX !== null && (mx === 0 && my === 0)) {
      const dx = inp.mouseX - p.x; const dy = inp.mouseY - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) { mx = dx / d; my = dy / d; }
    } else if (inp.mouseX !== null && inp.mouseDown) {
      const dx = inp.mouseX - p.x; const dy = inp.mouseY - p.y;
      const d = Math.hypot(dx, dy);
      if (d > 12) { mx = dx / d; my = dy / d; }
    }
    const len = Math.hypot(mx, my) || 1;
    p.x += (mx / len) * PLAYER_SPEED * dt * (mx === 0 && my === 0 ? 0 : 1);
    p.y += (my / len) * PLAYER_SPEED * dt * (mx === 0 && my === 0 ? 0 : 1);
    p.x = Math.max(PLAYER_X_MIN, Math.min(PLAYER_X_MAX, p.x));
    p.y = Math.max(PLAYER_Y_MIN, Math.min(PLAYER_Y_MAX, p.y));
    p.flicker += dt * 9;
    p.updateTrail();
    this.world.update(dt, this.kindled);
    // Light drain
    p.light -= LIGHT_DRAIN * this.world.palette().drainMul * dt;
    if (this.combo > 0 && this.timeMs > this.comboUntil) this.combo = 0;
    this.collide();
    this.particles.update(dt); this.floats.update(dt);
    if (p.light <= 0) { p.light = 0; this.endRun('Your light guttered and went out.'); }
    inp.endFrame();
  }
  collide() {
    const p = this.player;
    for (const e of this.world.items) {
      if (e.dead) continue;
      if (e.kind === 'spark' && touches(p, e, 6)) {
        e.dead = true;
        this.sparks += 1;
        this.combo += 1;
        this.comboUntil = this.timeMs + COMBO_WINDOW_MS;
        const gain = 10 + Math.min(40, (this.combo - 1) * 5);
        this.score += gain;
        p.light = Math.min(MAX_LIGHT, p.light + SPARK_LIGHT);
        this.floats.add(e.x, e.y - 14, `+${gain}`, '#ffd76a');
        this.particles.burst(this.rng, e.x, e.y, '#ffcf5e', 7, 120);
        this.sound.pickup();
      } else if ((e.kind === 'shard' || e.kind === 'wisp') && touches(p, e, -2)) {
        if (this.timeMs < p.invulnUntil) continue;
        e.dead = true;
        p.hearts -= 1;
        p.invulnUntil = this.timeMs + HIT_INVULN_MS;
        this.combo = 0;
        this.floats.add(p.x, p.y - 26, 'HIT!', '#ff7a8a');
        this.particles.burst(this.rng, p.x, p.y, '#ff5d73', 16, 200);
        this.sound.hit();
        if (p.hearts <= 0) { this.endRun('Shattered by the things in the dark.'); return; }
      } else if (e.kind === 'brazier' && !e.lit && touches(p, e, 4)) {
        e.lit = true;
        this.kindled += 1;
        this.score += 250;
        p.light = Math.min(MAX_LIGHT, p.light + KINDLE_LIGHT);
        this.floats.add(e.x, e.y - 44, `KINDLED ${this.kindled}/${BRAZIERS_TO_WIN}`, '#ffd76a');
        this.particles.burst(this.rng, e.x, e.y - 8, '#ffb84d', 26, 210);
        this.sound.kindle();
        if (this.kindled >= BRAZIERS_TO_WIN) {
          this.floats.add(p.x, p.y - 60, 'THE DAWN GATE OPENS!', '#fff3b0');
          this.sound.gate();
        }
      } else if (e.kind === 'gate' && touches(p, e, 10)) {
        this.state = 'victory';
        this.score += 500 + p.hearts * 100;
        this.grade = this.computeGrade();
        this.sound.win();
        return;
      }
    }
    this.world.items = this.world.items.filter((e) => !e.dead);
  }
}

// Boot: normal mode runs the rAF loop; ?shot= mode renders one
// deterministic scene and flags readiness for screenshot tooling.
const canvas = document.getElementById('game');
const game = new Game(canvas);
const shot = shotFromUrl();
game.shotMode = Boolean(shot);
if (shot) {
  setupShot(game, shot);
  game.renderer.draw(game);
  window.__SHOT_READY__ = true;
} else {
  let last = performance.now();
  let acc = 0;
  const frame = (now) => {
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    while (acc >= FIXED_STEP) { game.update(FIXED_STEP); acc -= FIXED_STEP; }
    game.renderer.draw(game);
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}
// Test hooks: a scripted bot can read state and steer via these.
window.__EMBER__ = game;
