// Emberwake — the things that move: the ember itself, a pooled
// particle system, and floating score text. Rendering lives in
// render.js; this file only owns state and motion.

import { TUNING, VIEW } from './config.js';

export class Player {
  constructor() {
    this.reset();
  }

  reset() {
    this.x = VIEW.w / 2;
    this.y = 300;
    this.vx = 0;
    this.vy = 0;
    this.radius = TUNING.playerRadius;
    this.fuel = TUNING.fuelMax;
    this.hearts = TUNING.heartsMax;
    this.invulnerable = 0;   // seconds of post-hit grace left
    this.tilt = 0;           // visual lean, follows horizontal speed
    this.alive = true;
  }

  update(dt, input, gustForce) {
    const t = TUNING;
    const axis = input.axis();
    this.vx += axis.x * t.thrust * dt;
    this.vy += axis.y * t.thrust * dt;

    // The pointer is a lean, not a teleport: the ember is pulled
    // toward it and the pull fades as it arrives.
    if (input.pointer.active) {
      const dx = input.pointer.x - this.x;
      const dy = input.pointer.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 12) {
        const pull = Math.min(1, dist / 190) * t.pointerPull * 10;
        this.vx += dx * pull * dt;
        this.vy += dy * pull * dt;
      }
    }

    if (gustForce) {
      this.vx += gustForce.x * dt;
      this.vy += gustForce.y * dt;
    }

    const damp = Math.exp(-t.drag * dt);
    this.vx *= damp;
    this.vy *= damp;

    const speed = Math.hypot(this.vx, this.vy);
    if (speed > t.maxSpeed) {
      this.vx = this.vx / speed * t.maxSpeed;
      this.vy = this.vy / speed * t.maxSpeed;
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // The chasm walls and the top and bottom of the view.
    this.x = Math.max(118, Math.min(VIEW.w - 118, this.x));
    this.y = Math.max(84, Math.min(VIEW.h - 46, this.y));

    this.tilt += ((this.vx / t.maxSpeed) * 0.5 - this.tilt) * Math.min(1, dt * 10);
    if (this.invulnerable > 0) this.invulnerable -= dt;
    this.fuel -= t.fuelBurn * dt;
  }

  hurt() {
    this.hearts -= 1;
    this.invulnerable = TUNING.invulnerableSeconds;
    if (this.hearts <= 0) this.alive = false;
  }
}

// One pooled particle store: effects ask for bursts, the pool
// recycles dead slots, and nothing allocates in the hot loop.
const PARTICLE_MAX = 520;

export class Particles {
  constructor() {
    this.items = [];
    for (let i = 0; i < PARTICLE_MAX; i++) {
      this.items.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 1, size: 2, color: '#fff', drag: 0, gravity: 0, glow: 0 });
    }
    this.cursor = 0;
  }

  spawn({ x, y, vx = 0, vy = 0, life = 0.6, size = 3, color = '#ffc46b', drag = 0, gravity = 0, glow = 0 }) {
    const p = this.items[this.cursor];
    this.cursor = (this.cursor + 1) % PARTICLE_MAX;
    p.live = true;
    p.x = x; p.y = y; p.vx = vx; p.vy = vy;
    p.life = life; p.maxLife = life;
    p.size = size; p.color = color;
    p.drag = drag; p.gravity = gravity; p.glow = glow;
  }

  burst(rng, x, y, { count = 12, color = '#ffc46b', speed = 160, life = 0.6, size = 3, glow = 0 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(speed * 0.25, speed);
      this.spawn({
        x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rng.range(life * 0.5, life * 1.2),
        size: rng.range(size * 0.5, size * 1.4),
        color, drag: 2.2, glow,
      });
    }
  }

  update(dt, scrollSpeed) {
    for (const p of this.items) {
      if (!p.live) continue;
      p.life -= dt;
      if (p.life <= 0) { p.live = false; continue; }
      const damp = Math.exp(-p.drag * dt);
      p.vx *= damp;
      p.vy = p.vy * damp + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += (p.vy - scrollSpeed) * dt;
    }
  }
}

// Short-lived text that rises and fades: "+10", "KINDLED ×4".
export class Floaters {
  constructor() {
    this.items = [];
  }

  add(x, y, text, { color = '#ffe9a8', size = 22, life = 1.1 } = {}) {
    if (this.items.length > 24) this.items.shift();
    this.items.push({ x, y, text, color, size, life, maxLife: life });
  }

  update(dt) {
    for (const f of this.items) {
      f.life -= dt;
      f.y -= 34 * dt;
    }
    this.items = this.items.filter((f) => f.life > 0);
  }
}
