// Emberwake — the chasm itself: what spawns, where, and how it
// moves. The world is an endless downward scroll measured in depth;
// entities are born below the view and drift up past the ember as it
// descends. Three zones change the palette and the hazard mix.

import { BRAZIERS_TOTAL, TUNING, VIEW, ZONES } from './config.js';

export class World {
  constructor(rng) {
    this.rng = rng;
    this.reset(0);
  }

  reset(kindled) {
    this.shards = [];    // jagged falling rock: the main hazard
    this.sparks = [];    // light to gather: fuel and score
    this.braziers = [];  // the seven rings to kindle
    this.gusts = [];     // wind bands that push the ember sideways
    this.wisps = [];     // zone III only: pale drifters that home in
    this.depth = 0;      // pixels descended this run
    this.shardTimer = 1.1;
    this.sparkTimer = 0.4;
    this.gustTimer = 9;
    this.wispTimer = 5;
    this.brazierTimer = 7;   // the first ring comes early: first reward
    this.gate = null;        // the Dawn Gate, once all seven burn
    this.gateTimer = -1;
    this.updateZone(kindled);
  }

  updateZone(kindled) {
    this.zoneIndex = kindled < 2 ? 0 : kindled < 5 ? 1 : 2;
    this.zone = ZONES[this.zoneIndex];
  }

  scrollSpeed(kindled) {
    return TUNING.scrollBase + kindled * TUNING.scrollPerKindle;
  }

  // Called after a brazier lights: count down to the Dawn Gate.
  armGate() {
    this.gateTimer = 6;
  }

  update(dt, kindled, player) {
    const scroll = this.scrollSpeed(kindled);
    this.depth += scroll * dt;
    this.updateZone(kindled);
    const zone = this.zoneIndex;

    // --- spawning -------------------------------------------------
    this.shardTimer -= dt;
    if (this.shardTimer <= 0) {
      this.spawnShard(zone);
      const base = zone === 0 ? 1.05 : zone === 1 ? 0.88 : 0.74;
      this.shardTimer = base * this.rng.range(0.7, 1.3) * Math.max(0.62, 1 - kindled * 0.035);
    }
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.spawnSparkTrail(zone);
      this.sparkTimer = this.rng.range(1.5, 2.6);
    }
    this.brazierTimer -= dt;
    if (this.brazierTimer <= 0 && kindled + this.braziers.length < BRAZIERS_TOTAL && !this.gate) {
      this.spawnBrazier();
      this.brazierTimer = this.rng.range(15, 20);
    }
    if (zone >= 1) {
      this.gustTimer -= dt;
      if (this.gustTimer <= 0) {
        this.spawnGust(zone);
        this.gustTimer = this.rng.range(9, 14);
      }
    }
    if (zone >= 2) {
      this.wispTimer -= dt;
      if (this.wispTimer <= 0) {
        this.spawnWisp();
        this.wispTimer = this.rng.range(4.5, 7);
      }
    }
    if (this.gateTimer > 0) {
      this.gateTimer -= dt;
      if (this.gateTimer <= 0 && !this.gate) {
        this.gate = { x: VIEW.w / 2, y: VIEW.h + 130, radius: 74, pulse: 0 };
      }
    }

    // --- motion ---------------------------------------------------
    const rise = (e, extra = 0) => { e.y -= (scroll + extra) * dt; };
    for (const s of this.shards) {
      rise(s, s.fall);
      s.x += s.drift * dt;
      s.rot += s.spin * dt;
    }
    for (const s of this.sparks) {
      rise(s);
      s.bob += dt * 3;
      // A gentle magnet: sparks lean toward a near ember.
      const dx = player.x - s.x, dy = player.y - s.y;
      const d = Math.hypot(dx, dy);
      if (d < TUNING.magnetRadius && d > 1) {
        const pull = (1 - d / TUNING.magnetRadius) * 340;
        s.x += (dx / d) * pull * dt;
        s.y += (dy / d) * pull * dt;
      }
    }
    for (const b of this.braziers) { rise(b); b.flame += dt; }
    for (const g of this.gusts) { rise(g); g.age += dt; }
    for (const w of this.wisps) {
      rise(w, -30);
      w.phase += dt * 1.7;
      // Wisps drift toward the ember, slowly and predictably.
      const dx = player.x - w.x, dy = player.y - w.y;
      const d = Math.hypot(dx, dy) || 1;
      const hunt = 34;
      w.x += (dx / d) * hunt * dt + Math.sin(w.phase) * 26 * dt;
      w.y += (dy / d) * hunt * dt;
    }
    if (this.gate) {
      rise(this.gate);
      this.gate.pulse += dt;
      // A missed gate is not a lost run: it circles back below.
      if (this.gate.y < -140) this.gate.y = VIEW.h + 130;
    }

    // --- culling --------------------------------------------------
    const off = (e, m = 90) => e.y < -m || e.y > VIEW.h + 260 || e.x < -120 || e.x > VIEW.w + 120;
    this.shards = this.shards.filter((s) => !off(s));
    this.sparks = this.sparks.filter((s) => !off(s, 60));
    this.braziers = this.braziers.filter((b) => !off(b, 160));
    this.gusts = this.gusts.filter((g) => g.y > -g.h - 80);
    this.wisps = this.wisps.filter((w) => !off(w));
  }

  spawnShard(zone) {
    const r = this.rng.range(TUNING.shardRadiusMin, TUNING.shardRadiusMax) * (zone === 2 ? 1.08 : 1);
    const points = [];
    const n = this.rng.int(6, 8);
    for (let i = 0; i < n; i++) points.push(this.rng.range(0.62, 1.12));
    this.shards.push({
      x: this.rng.range(150, VIEW.w - 150),
      y: VIEW.h + 70,
      radius: r,
      fall: this.rng.range(6, 42),
      drift: this.rng.range(-16, 16),
      rot: this.rng.range(0, Math.PI * 2),
      spin: this.rng.range(-0.9, 0.9),
      points,
    });
  }

  spawnSparkTrail() {
    // A short arc or line of sparks: a route worth taking.
    const cx = this.rng.range(190, VIEW.w - 190);
    const cy = VIEW.h + 60;
    const count = this.rng.int(4, 6);
    const arc = this.rng.range(-0.7, 0.7);
    for (let i = 0; i < count; i++) {
      this.sparks.push({
        x: cx + Math.sin(i * 0.62 + arc) * 34 + (i - count / 2) * 17,
        y: cy + i * 40,
        bob: this.rng.range(0, Math.PI * 2),
        radius: 9,
      });
    }
  }

  spawnBrazier() {
    this.braziers.push({
      x: this.rng.range(230, VIEW.w - 230),
      y: VIEW.h + 150,
      radius: 56,
      lit: false,
      flame: this.rng.range(0, 6),
    });
  }

  spawnGust(zone) {
    const dir = this.rng.sign();
    this.gusts.push({
      x: dir > 0 ? 96 : VIEW.w - 96,
      y: VIEW.h + 120,
      w: VIEW.w - 192,
      h: this.rng.range(120, 190),
      dir,
      strength: (zone === 1 ? 300 : 390) * dir,
      age: 0,
    });
  }

  spawnWisp() {
    this.wisps.push({
      x: this.rng.range(170, VIEW.w - 170),
      y: VIEW.h + 60,
      radius: 17,
      phase: this.rng.range(0, Math.PI * 2),
    });
  }

  // The wind force on a point right now, or null outside every band.
  gustAt(x, y) {
    for (const g of this.gusts) {
      if (y > g.y - g.h / 2 && y < g.y + g.h / 2) {
        return { x: g.strength, y: 0 };
      }
    }
    return null;
  }
}
