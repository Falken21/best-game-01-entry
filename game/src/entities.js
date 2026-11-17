// Entities: the ember (player), particles, floating text, and the
// pickups / hazards / braziers that drift up the chasm as you fall.
import { PLAYER_RADIUS } from './config.js';

export class Ember {
  constructor(x, y) {
    this.x = x; this.y = y;
    this.vx = 0; this.vy = 0;
    this.radius = PLAYER_RADIUS;
    this.light = 0; this.hearts = 0;
    this.invulnUntil = 0;
    this.trail = [];
    this.flicker = 0;
  }
  lightRadius() { return 90 + this.light * 1.9; }
  updateTrail() {
    this.trail.unshift({ x: this.x, y: this.y });
    if (this.trail.length > 22) this.trail.pop();
    for (const p of this.trail) p.y += 3.2;
  }
}

export function makeSpark(rng, x, y) {
  return { kind: 'spark', x, y, r: 9, vx: rng.range(-14, 14), phase: rng.range(0, Math.PI * 2), dead: false };
}
export function makeShard(rng, x, y) {
  return { kind: 'shard', x, y, r: 15, vx: rng.range(-30, 30), rot: rng.range(0, Math.PI * 2), spin: rng.range(-2.4, 2.4), dead: false };
}
export function makeWisp(rng, x, y) {
  return { kind: 'wisp', x, y, r: 14, baseX: x, phase: rng.range(0, Math.PI * 2), sway: rng.range(36, 74), dead: false };
}
export function makeBrazier(rng, x, y) {
  return { kind: 'brazier', x, y, r: 30, lit: false, phase: rng.range(0, Math.PI * 2), dead: false };
}
export function makeGate(x, y) {
  return { kind: 'gate', x, y, r: 52, dead: false };
}

export class Particles {
  constructor() { this.list = []; }
  burst(rng, x, y, color, n, speed) {
    for (let i = 0; i < n; i++) {
      const a = rng.range(0, Math.PI * 2);
      const s = rng.range(speed * 0.3, speed);
      this.list.push({
        x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 30,
        life: rng.range(0.35, 0.8), age: 0, color,
        r: rng.range(1.6, 3.6),
      });
    }
  }
  update(dt) {
    for (const p of this.list) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += 60 * dt;
    }
    this.list = this.list.filter((p) => p.age < p.life);
  }
}

export class FloatTexts {
  constructor() { this.list = []; }
  add(x, y, text, color) { this.list.push({ x, y, text, color, age: 0, life: 1.1 }); }
  update(dt) {
    for (const t of this.list) { t.age += dt; t.y -= 42 * dt; }
    this.list = this.list.filter((t) => t.age < t.life);
  }
}

export function dist2(a, b) {
  const dx = a.x - b.x; const dy = a.y - b.y;
  return dx * dx + dy * dy;
}
export function touches(player, e, pad) {
  const rr = player.radius + e.r + (pad || 0);
  return dist2(player, e) < rr * rr;
}
