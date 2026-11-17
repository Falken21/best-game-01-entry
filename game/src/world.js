// The chasm: scrolling walls, zone tracking, and spawning of sparks,
// shards, wisps and braziers as the ember descends.
import { ZONES, zoneForDepth, VIEW_W, BRAZIERS_TO_WIN } from './config.js';
import { makeSpark, makeShard, makeWisp, makeBrazier, makeGate } from './entities.js';

export class World {
  constructor(rng) {
    this.rng = rng;
    this.depth = 0;
    this.zone = 0;
    this.items = [];
    this.sparkTimer = 0;
    this.hazardTimer = 1.2;
    this.braziersSpawned = 0;
    this.nextBrazierAt = 260;
    this.gateSpawned = false;
    this.wallSeed = [];
    for (let i = 0; i < 64; i++) this.wallSeed.push(rng.float());
    this.motes = [];
    for (let i = 0; i < 46; i++) {
      this.motes.push({ x: rng.range(60, VIEW_W - 60), y: rng.range(0, 720), s: rng.range(0.4, 1.6), v: rng.range(12, 42) });
    }
  }
  palette() { return ZONES[this.zone]; }
  wallInset(side, y) {
    // Deterministic jagged walls from depth + y band.
    const band = Math.floor((y + this.depth) / 90);
    const idx = ((band % 64) + 64) % 64;
    const base = side === 0 ? this.wallSeed[idx] : this.wallSeed[(idx + 31) % 64];
    return 26 + base * 44;
  }
  update(dt, kindled) {
    const pal = this.palette();
    this.depth += pal.scroll * dt;
    this.zone = zoneForDepth(this.depth);
    const scroll = this.palette().scroll;
    for (const m of this.motes) {
      m.y -= (scroll * 0.35 + m.v) * dt;
      if (m.y < -6) { m.y = 726; m.x = this.rng.range(60, VIEW_W - 60); }
    }
    for (const e of this.items) {
      e.y -= scroll * dt;
      if (e.kind === 'spark') { e.x += e.vx * dt; e.phase += dt * 4; }
      if (e.kind === 'shard') { e.x += e.vx * dt; e.rot += e.spin * dt; }
      if (e.kind === 'wisp') { e.phase += dt * 1.7; e.x = e.baseX + Math.sin(e.phase) * e.sway; }
      if (e.kind === 'brazier') { e.phase += dt * 2.2; }
      if (e.y < -80) e.dead = true;
    }
    this.items = this.items.filter((e) => !e.dead);
    this.spawn(dt, kindled);
  }
  spawnX() { return this.rng.range(110, VIEW_W - 110); }
  spawn(dt, kindled) {
    const pal = this.palette();
    this.sparkTimer -= dt;
    if (this.sparkTimer <= 0) {
      this.sparkTimer = this.rng.range(0.45, 0.95);
      // Occasionally drop a friendly cluster a bot can chase.
      if (this.rng.chance(0.3)) {
        const cx = this.spawnX();
        for (let i = 0; i < 3; i++) this.items.push(makeSpark(this.rng, cx + (i - 1) * 34, 760 + i * 36));
      } else {
        this.items.push(makeSpark(this.rng, this.spawnX(), 752));
      }
    }
    this.hazardTimer -= dt;
    if (this.hazardTimer <= 0) {
      this.hazardTimer = this.rng.range(1.5, 2.6) / pal.hazardMul;
      if (this.rng.chance(0.55)) this.items.push(makeShard(this.rng, this.spawnX(), 756));
      else this.items.push(makeWisp(this.rng, this.spawnX(), 756));
    }
    if (this.braziersSpawned < BRAZIERS_TO_WIN && this.depth >= this.nextBrazierAt) {
      this.items.push(makeBrazier(this.rng, this.spawnX(), 770));
      this.braziersSpawned += 1;
      this.nextBrazierAt = this.depth + this.rng.range(430, 560);
    }
    if (kindled >= BRAZIERS_TO_WIN && !this.gateSpawned) {
      this.items.push(makeGate(VIEW_W / 2, 790));
      this.gateSpawned = true;
    }
  }
}
