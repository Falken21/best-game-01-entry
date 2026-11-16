// Emberwake — everything the player sees. Canvas 2D, layered:
// sky, two parallax rock walls, wind bands, braziers with their
// beacon columns, sparks, hazards, the ember, particles, HUD, and
// the screens (title, pause, game over, victory) drawn over the top.
//
// The palette belongs to the current zone and cross-fades when the
// descent crosses into a new depth, so zone changes feel like
// sinking into a different place rather than a cut.

import { BRAZIERS_TOTAL, TUNING, VIEW, gradeFor } from './config.js';

function hexRgb(hex) {
  return [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

function css(rgb, alpha = 1) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

// A tiny deterministic hash for background detail: the walls must
// look the same whenever the same depth scrolls past, in play and
// in screenshot scenes alike.
function hash(n) {
  let x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

export class Renderer {
  constructor(ctx) {
    this.ctx = ctx;
    this.palette = null; // lerped copy of the zone palette
  }

  draw(game, dt) {
    const ctx = this.ctx;
    const zone = game.world.zone;
    this.blendPalette(zone, dt);
    const pal = this.palette;

    ctx.save();
    if (game.shake > 0.2) {
      ctx.translate((hash(game.time * 91) - 0.5) * game.shake, (hash(game.time * 57 + 4) - 0.5) * game.shake);
    }
    this.drawSky(pal);
    this.drawWallLayer(game, pal, 0.45, pal.rockFar, 64);
    this.drawWallLayer(game, pal, 1.0, pal.rockNear, 104);
    this.drawAmbientEmbers(game, pal);
    this.drawGusts(game, pal);
    this.drawGate(game);
    this.drawBraziers(game, pal);
    this.drawSparks(game, pal);
    this.drawShards(game, pal);
    this.drawWisps(game, pal);
    this.drawParticles(game);
    this.drawPlayer(game, pal);
    this.drawFloaters(game);
    ctx.restore();

    this.drawVignette(game);
    if (game.state === 'playing' || game.state === 'paused') this.drawHud(game, pal);
    if (game.zoneBanner.t > 0 && game.state === 'playing') this.drawZoneBanner(game);
    if (game.state === 'title') this.drawTitle(game, pal);
    if (game.state === 'paused') this.drawPause(game);
    if (game.state === 'over') this.drawGameOver(game, pal);
    if (game.state === 'win') this.drawVictory(game, pal);
  }

  blendPalette(zone, dt) {
    const keys = ['skyTop', 'skyBottom', 'rockFar', 'rockNear', 'shard', 'shardEdge', 'spark', 'accent', 'wisp'];
    if (!this.palette) {
      this.palette = {};
      for (const k of keys) this.palette[k] = hexRgb(zone[k]);
      return;
    }
    const t = Math.min(1, dt * 1.6);
    for (const k of keys) this.palette[k] = mix(this.palette[k], hexRgb(zone[k]), t);
  }

  drawSky(pal) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, css(pal.skyTop));
    g.addColorStop(1, css(pal.skyBottom));
    ctx.fillStyle = g;
    ctx.fillRect(-24, -24, VIEW.w + 48, VIEW.h + 48);
  }

  // One jagged chasm wall. Segments of 120 px, each with a hashed
  // bite taken out of the wall's inner edge; far layer scrolls at a
  // fraction of the descent so the depths separate.
  drawWallLayer(game, pal, factor, colorKey, baseWidth) {
    const ctx = this.ctx;
    const depth = game.world.depth * factor;
    const seg = 120;
    const first = Math.floor(depth / seg) - 1;
    ctx.fillStyle = css(colorKey);
    for (const side of [0, 1]) {
      ctx.beginPath();
      if (side === 0) ctx.moveTo(-24, -seg); else ctx.moveTo(VIEW.w + 24, -seg);
      for (let i = 0; i <= VIEW.h / seg + 2; i++) {
        const idx = first + i;
        const y = idx * seg - depth - seg;
        const bite = hash(idx * 3 + side * 57 + factor * 100) * 46;
        const wdt = baseWidth + bite;
        const x = side === 0 ? wdt : VIEW.w - wdt;
        ctx.lineTo(x, y);
        const bite2 = hash(idx * 7 + side * 31 + factor * 100) * 30;
        const x2 = side === 0 ? baseWidth * 0.55 + bite2 : VIEW.w - baseWidth * 0.55 - bite2;
        ctx.lineTo(x2, y + seg / 2);
      }
      if (side === 0) { ctx.lineTo(-24, VIEW.h + seg); } else { ctx.lineTo(VIEW.w + 24, VIEW.h + seg); }
      ctx.closePath();
      ctx.fill();
    }
  }

  drawAmbientEmbers(game, pal) {
    const ctx = this.ctx;
    ctx.save();
    for (let i = 0; i < 26; i++) {
      const speed = 12 + hash(i * 3.3) * 22;
      const x = hash(i * 13.7) * VIEW.w;
      const y = VIEW.h - ((game.time * speed + hash(i * 7.1) * VIEW.h) % (VIEW.h + 30)) + 15;
      const r = 1 + hash(i * 5.9) * 1.8;
      ctx.globalAlpha = 0.16 + hash(i * 9.4) * 0.22;
      ctx.fillStyle = css(pal.spark);
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  drawGusts(game, pal) {
    const ctx = this.ctx;
    for (const g of game.world.gusts) {
      const fade = Math.min(1, g.age / 0.7);
      // The band itself, wall to wall.
      ctx.save();
      ctx.globalAlpha = 0.07 * fade;
      ctx.fillStyle = css(pal.wisp);
      ctx.fillRect(104, g.y - g.h / 2, VIEW.w - 208, g.h);
      ctx.globalAlpha = 0.5 * fade;
      ctx.strokeStyle = css(pal.wisp);
      ctx.lineWidth = 2;
      const dir = g.dir;
      for (let row = 0; row < 3; row++) {
        const y = g.y - g.h / 2 + (row + 0.5) * (g.h / 3);
        const off = (game.time * 260 * dir + row * 90) % 150;
        ctx.beginPath();
        for (let x = 130 - 150 + off; x < VIEW.w - 110; x += 150) {
          ctx.moveTo(x, y);
          ctx.lineTo(x + 44 * dir, y);
          ctx.lineTo(x + 34 * dir, y - 6);
          ctx.moveTo(x + 44 * dir, y);
          ctx.lineTo(x + 34 * dir, y + 6);
        }
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  drawGate(game) {
    const gate = game.world.gate;
    if (!gate) return;
    const ctx = this.ctx;
    const pulse = 1 + Math.sin(gate.pulse * 2.4) * 0.05;
    const r = gate.radius * pulse;
    ctx.save();
    const glow = ctx.createRadialGradient(gate.x, gate.y, 4, gate.x, gate.y, r * 2.4);
    glow.addColorStop(0, 'rgba(255,244,214,0.85)');
    glow.addColorStop(0.35, 'rgba(255,205,110,0.35)');
    glow.addColorStop(1, 'rgba(255,170,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, r * 2.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.95)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,190,90,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(gate.x, gate.y, r * 0.78, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,246,220,0.95)';
    ctx.font = '600 17px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('THE DAWN GATE', gate.x, gate.y - r - 18);
    ctx.restore();
  }

  drawBraziers(game, pal) {
    const ctx = this.ctx;
    for (const b of game.world.braziers) {
      // The beacon: a soft column of light above an unlit ring, so
      // the next decision is visible before the brazier arrives.
      if (!b.lit) {
        const grad = ctx.createLinearGradient(0, 0, 0, b.y);
        grad.addColorStop(0, css(pal.accent, 0));
        grad.addColorStop(1, css(pal.accent, 0.13));
        ctx.fillStyle = grad;
        ctx.fillRect(b.x - 3, 0, 6, b.y);
        const core = ctx.createLinearGradient(0, 0, 0, b.y);
        core.addColorStop(0, 'rgba(255,255,255,0)');
        core.addColorStop(1, 'rgba(255,255,255,0.20)');
        ctx.fillStyle = core;
        ctx.fillRect(b.x - 1, 0, 2, b.y);
      }
      // Stone ring: a dark annulus with a lit rim.
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#0a0a14';
      ctx.fill();
      ctx.lineWidth = 9;
      ctx.strokeStyle = b.lit ? css(pal.accent) : '#3a3f55';
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.strokeStyle = b.lit ? 'rgba(255,240,200,0.9)' : '#59607e';
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius - 7, 0, Math.PI * 2);
      ctx.stroke();
      // Stone notches around the rim.
      ctx.fillStyle = b.lit ? css(pal.accent) : '#454b66';
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 + 0.4;
        ctx.beginPath();
        ctx.arc(b.x + Math.cos(a) * b.radius, b.y + Math.sin(a) * b.radius, 4.5, 0, Math.PI * 2);
        ctx.fill();
      }
      if (b.lit) {
        // The flame: layered teardrops that lean and flicker.
        const flick = Math.sin(b.flame * 11) * 3 + Math.sin(b.flame * 23) * 1.6;
        const glow = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.radius * 1.9);
        glow.addColorStop(0, css(pal.accent, 0.5));
        glow.addColorStop(1, css(pal.accent, 0));
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(b.x, b.y, b.radius * 1.9, 0, Math.PI * 2);
        ctx.fill();
        for (const [w, h, color, alpha] of [
          [17, 44, '#ff7a2f', 0.9],
          [11, 32, '#ffb03a', 0.95],
          [6, 20, '#fff3c4', 1],
        ]) {
          ctx.globalAlpha = alpha;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.moveTo(b.x - w, b.y + 8);
          ctx.quadraticCurveTo(b.x - w * 0.7, b.y - h * 0.4, b.x + flick, b.y - h);
          ctx.quadraticCurveTo(b.x + w * 0.7, b.y - h * 0.4, b.x + w, b.y + 8);
          ctx.quadraticCurveTo(b.x, b.y + 14, b.x - w, b.y + 8);
          ctx.fill();
        }
        ctx.globalAlpha = 1;
      } else {
        // A cold heart: one dim ember waiting.
        const pulse = 0.5 + Math.sin(b.flame * 2.2) * 0.2;
        ctx.fillStyle = `rgba(140,160,220,${pulse})`;
        ctx.beginPath();
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  drawSparks(game, pal) {
    const ctx = this.ctx;
    for (const s of game.world.sparks) {
      const bobY = Math.sin(s.bob) * 3;
      const glow = ctx.createRadialGradient(s.x, s.y + bobY, 1, s.x, s.y + bobY, 20);
      glow.addColorStop(0, css(pal.spark, 0.55));
      glow.addColorStop(1, css(pal.spark, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(s.x, s.y + bobY, 20, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff6da';
      ctx.beginPath();
      ctx.arc(s.x, s.y + bobY, 3.4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(pal.spark);
      ctx.beginPath();
      ctx.arc(s.x, s.y + bobY, s.radius - 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawShards(game, pal) {
    const ctx = this.ctx;
    for (const s of game.world.shards) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.rotate(s.rot);
      ctx.beginPath();
      const n = s.points.length;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const r = s.radius * s.points[i];
        if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
        else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      ctx.closePath();
      ctx.fillStyle = css(pal.shard, 0.92);
      ctx.fill();
      ctx.strokeStyle = css(pal.shardEdge);
      ctx.lineWidth = 2;
      ctx.stroke();
      // A bright facet line so the rock reads as rock, not blob.
      ctx.beginPath();
      ctx.moveTo(-s.radius * 0.4, -s.radius * 0.2);
      ctx.lineTo(s.radius * 0.25, s.radius * 0.1);
      ctx.lineTo(-s.radius * 0.05, s.radius * 0.45);
      ctx.strokeStyle = css(pal.shardEdge, 0.5);
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  drawWisps(game, pal) {
    const ctx = this.ctx;
    for (const w of game.world.wisps) {
      const glow = ctx.createRadialGradient(w.x, w.y, 1, w.x, w.y, 34);
      glow.addColorStop(0, css(pal.wisp, 0.5));
      glow.addColorStop(1, css(pal.wisp, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(w.x, w.y, 34, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = css(pal.wisp, 0.95);
      ctx.beginPath();
      ctx.arc(w.x, w.y, w.radius * 0.55, 0, Math.PI * 2);
      ctx.fill();
      // Two dark eyes: a wisp is a someone, not a bullet.
      ctx.fillStyle = '#0b1620';
      const look = Math.sin(w.phase) * 2;
      ctx.beginPath();
      ctx.arc(w.x - 4 + look, w.y - 1, 1.8, 0, Math.PI * 2);
      ctx.arc(w.x + 4 + look, w.y - 1, 1.8, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawParticles(game) {
    const ctx = this.ctx;
    for (const p of game.particles.items) {
      if (!p.live) continue;
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      if (p.glow > 0) {
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.glow;
      }
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.4, p.size * t), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }
    ctx.globalAlpha = 1;
  }

  drawPlayer(game, pal) {
    const p = game.player;
    const ctx = this.ctx;
    if (game.state === 'over' && game.endCause === 'shards') return; // it broke apart
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    // Blink while invulnerable.
    if (p.invulnerable > 0 && Math.floor(game.time * 14) % 2 === 0) ctx.globalAlpha = 0.35;
    // Halo sized by remaining light: a dimming ember looks dimmer.
    const fuelT = Math.max(0.12, p.fuel / TUNING.fuelMax);
    const halo = ctx.createRadialGradient(0, 0, 2, 0, 0, 54 * fuelT + 12);
    halo.addColorStop(0, css(pal.accent, 0.55 * fuelT + 0.15));
    halo.addColorStop(1, css(pal.accent, 0));
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, 0, 54 * fuelT + 12, 0, Math.PI * 2);
    ctx.fill();
    // Wings: two soft ellipses that beat as the ember flies.
    const beat = Math.sin(game.time * 26) * 0.35;
    ctx.fillStyle = 'rgba(255,214,150,0.75)';
    for (const s of [-1, 1]) {
      ctx.save();
      ctx.rotate(s * (0.7 + beat));
      ctx.beginPath();
      ctx.ellipse(s * 13, -3, 13, 5.5, s * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    // Body: a bright core in a warm shell.
    const body = ctx.createRadialGradient(-3, -4, 1, 0, 0, p.radius);
    body.addColorStop(0, '#fff8e2');
    body.addColorStop(0.45, '#ffc46b');
    body.addColorStop(1, '#ff7a2f');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    // Eyes, looking along the motion.
    ctx.fillStyle = '#40200a';
    const lookX = Math.max(-3, Math.min(3, p.vx * 0.008));
    const lookY = Math.max(-2, Math.min(3, p.vy * 0.008));
    ctx.beginPath();
    ctx.arc(-5 + lookX, -2 + lookY, 2.1, 0, Math.PI * 2);
    ctx.arc(5 + lookX, -2 + lookY, 2.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawFloaters(game) {
    const ctx = this.ctx;
    ctx.save();
    ctx.textAlign = 'center';
    for (const f of game.floaters.items) {
      const t = f.life / f.maxLife;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.font = `700 ${f.size}px system-ui, sans-serif`;
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.restore();
  }

  drawVignette(game) {
    const ctx = this.ctx;
    const g = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.42, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.86);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.42)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    // Low light closes in at the edges.
    if (game.state === 'playing' && game.player.fuel < 26) {
      const pulse = 0.16 + Math.sin(game.time * 5) * 0.05;
      const r = ctx.createRadialGradient(VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.3, VIEW.w / 2, VIEW.h / 2, VIEW.h * 0.8);
      r.addColorStop(0, 'rgba(60,0,0,0)');
      r.addColorStop(1, `rgba(70,4,0,${pulse + 0.14})`);
      ctx.fillStyle = r;
      ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    }
  }

  drawHud(game, pal) {
    const ctx = this.ctx;
    const p = game.player;
    ctx.save();
    // Light (fuel), top left: a bar with a flame cap.
    ctx.fillStyle = 'rgba(5,6,12,0.55)';
    ctx.fillRect(24, 20, 252, 40);
    const fuelT = Math.max(0, p.fuel / TUNING.fuelMax);
    const fg = ctx.createLinearGradient(24, 0, 276, 0);
    fg.addColorStop(0, '#ff7a2f');
    fg.addColorStop(1, '#ffd76b');
    ctx.fillStyle = fuelT < 0.26 ? (Math.floor(game.time * 6) % 2 ? '#e5564b' : '#ff8a5c') : fg;
    ctx.fillRect(52, 32, 212 * fuelT, 16);
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.strokeRect(52, 32, 212, 16);
    ctx.fillStyle = css(pal.accent);
    ctx.beginPath();
    ctx.moveTo(38, 26);
    ctx.quadraticCurveTo(30, 38, 38, 50);
    ctx.quadraticCurveTo(46, 38, 38, 26);
    ctx.fill();
    ctx.fillStyle = 'rgba(240,244,255,0.85)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('LIGHT', 52, 27);

    // Brazier pips, top centre: diamonds that fill with gold.
    const cx = VIEW.w / 2 - (BRAZIERS_TOTAL - 1) * 19;
    for (let i = 0; i < BRAZIERS_TOTAL; i++) {
      const x = cx + i * 38;
      ctx.save();
      ctx.translate(x, 38);
      ctx.rotate(Math.PI / 4);
      const lit = i < game.kindled;
      ctx.fillStyle = lit ? '#ffc46b' : 'rgba(20,22,38,0.8)';
      ctx.strokeStyle = lit ? '#ffe9a8' : 'rgba(160,170,210,0.5)';
      ctx.lineWidth = 1.5;
      ctx.fillRect(-8, -8, 16, 16);
      ctx.strokeRect(-8, -8, 16, 16);
      ctx.restore();
    }
    ctx.fillStyle = 'rgba(240,244,255,0.85)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('BRAZIERS', VIEW.w / 2, 27);

    // Score, top right.
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(240,244,255,0.85)';
    ctx.font = '600 11px system-ui, sans-serif';
    ctx.fillText('SCORE', VIEW.w - 28, 27);
    ctx.fillStyle = '#fff6da';
    ctx.font = '700 26px system-ui, sans-serif';
    ctx.fillText(String(game.score).padStart(6, '0'), VIEW.w - 28, 54);
    ctx.fillStyle = 'rgba(200,208,235,0.7)';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText(`BEST ${Math.max(game.best, game.score)}`, VIEW.w - 28, 72);

    // Hearts, bottom left: ember hearts for the hits left.
    for (let i = 0; i < TUNING.heartsMax; i++) {
      const x = 44 + i * 34, y = VIEW.h - 34;
      ctx.save();
      ctx.translate(x, y);
      ctx.fillStyle = i < p.hearts ? '#ff6a5c' : 'rgba(30,32,48,0.85)';
      ctx.strokeStyle = i < p.hearts ? '#ffc4b8' : 'rgba(150,158,190,0.4)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(0, 9);
      ctx.bezierCurveTo(-13, -2, -8, -13, 0, -6);
      ctx.bezierCurveTo(8, -13, 13, -2, 0, 9);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // Combo, bottom right: the multiplier and its draining window.
    if (game.combo > 1) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffd76b';
      ctx.font = '800 30px system-ui, sans-serif';
      ctx.fillText(`×${game.combo}`, VIEW.w - 28, VIEW.h - 40);
      const w = 110 * Math.max(0, game.comboTimer / TUNING.comboWindow);
      ctx.fillStyle = 'rgba(255,215,107,0.75)';
      ctx.fillRect(VIEW.w - 28 - w, VIEW.h - 32, w, 4);
    }

    // Depth, bottom centre.
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(190,198,228,0.65)';
    ctx.font = '500 12px system-ui, sans-serif';
    ctx.fillText(`DEPTH ${Math.floor(game.world.depth / 10)} m — ${game.world.zone.name.toUpperCase()}`, VIEW.w / 2, VIEW.h - 16);
    ctx.restore();
  }

  drawZoneBanner(game) {
    const ctx = this.ctx;
    const b = game.zoneBanner;
    const alpha = Math.min(1, b.t / 0.5, (2.8 - b.t) / 0.7);
    if (alpha <= 0) return;
    ctx.save();
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '700 34px Georgia, serif';
    ctx.fillText(`${b.numeral} — ${b.name}`, VIEW.w / 2, 150);
    ctx.fillStyle = 'rgba(230,236,255,0.85)';
    ctx.font = '400 16px system-ui, sans-serif';
    ctx.fillText(b.sub, VIEW.w / 2, 178);
    ctx.restore();
  }

  panel(game, w, h) {
    const ctx = this.ctx;
    const x = VIEW.w / 2 - w / 2, y = VIEW.h / 2 - h / 2;
    ctx.fillStyle = 'rgba(6,7,14,0.78)';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = 'rgba(255,196,107,0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    return { x, y };
  }

  statRows(game, cx, y, rows) {
    const ctx = this.ctx;
    ctx.font = '500 17px system-ui, sans-serif';
    for (const [label, value] of rows) {
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(205,213,240,0.85)';
      ctx.fillText(label, cx - 14, y);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff6da';
      ctx.font = '700 17px system-ui, sans-serif';
      ctx.fillText(value, cx + 14, y);
      ctx.font = '500 17px system-ui, sans-serif';
      y += 30;
    }
    return y;
  }

  runStats(game) {
    return [
      ['Score', String(game.score)],
      ['Braziers kindled', `${game.kindled} of ${BRAZIERS_TOTAL}`],
      ['Sparks gathered', String(game.sparksTaken)],
      ['Time in the chasm', `${Math.floor(game.runTime / 60)}:${String(Math.floor(game.runTime % 60)).padStart(2, '0')}`],
      ['Best score', String(Math.max(game.best, game.score))],
    ];
  }

  drawTitle(game, pal) {
    const ctx = this.ctx;
    const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
    g.addColorStop(0, 'rgba(4,4,10,0.25)');
    g.addColorStop(0.55, 'rgba(4,4,10,0.45)');
    g.addColorStop(1, 'rgba(4,4,10,0.72)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.save();
    ctx.textAlign = 'center';
    // The wordmark, drawn twice: a wide warm glow, then the face.
    ctx.shadowColor = css(pal.accent);
    ctx.shadowBlur = 42;
    ctx.fillStyle = '#ffd76b';
    ctx.font = '700 104px Georgia, serif';
    ctx.fillText('EMBERWAKE', VIEW.w / 2, 268);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff3d0';
    ctx.fillText('EMBERWAKE', VIEW.w / 2, 268);
    ctx.fillStyle = 'rgba(235,240,255,0.92)';
    ctx.font = '400 21px Georgia, serif';
    ctx.fillText('You are the last ember of a drowned sun.', VIEW.w / 2, 312);
    ctx.fillText('Fall. Kindle the seven braziers. Reach the dawn.', VIEW.w / 2, 340);

    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(205,213,240,0.9)';
    ctx.fillText('Steer with the arrow keys, WASD, or your mouse', VIEW.w / 2, 428);
    ctx.fillText('Gather sparks to feed your light — it burns away as you fall', VIEW.w / 2, 454);
    ctx.fillText('Fly through a brazier ring to kindle it. Stone shards break you; three hits end the fall', VIEW.w / 2, 480);

    const pulse = 0.72 + Math.sin(game.time * 3.2) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd76b';
    ctx.font = '700 22px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER OR CLICK TO DESCEND', VIEW.w / 2, 548);
    ctx.globalAlpha = 1;
    if (game.best > 0) {
      ctx.fillStyle = 'rgba(200,208,235,0.75)';
      ctx.font = '500 14px system-ui, sans-serif';
      ctx.fillText(`Best score so far: ${game.best}`, VIEW.w / 2, 584);
    }
    ctx.fillStyle = 'rgba(160,168,200,0.55)';
    ctx.font = '400 12px system-ui, sans-serif';
    ctx.fillText('P pauses · M mutes · a game of light, wind and falling stone', VIEW.w / 2, VIEW.h - 22);
    ctx.restore();
  }

  drawPause(game) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3,3,8,0.55)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    this.panel(game, 430, 190);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '700 38px Georgia, serif';
    ctx.fillText('PAUSED', VIEW.w / 2, VIEW.h / 2 - 34);
    ctx.fillStyle = 'rgba(225,232,250,0.9)';
    ctx.font = '500 16px system-ui, sans-serif';
    ctx.fillText('P or Esc to resume · M to mute', VIEW.w / 2, VIEW.h / 2 + 8);
    ctx.fillText(`Braziers lit: ${game.kindled} of ${BRAZIERS_TOTAL} · Score ${game.score}`, VIEW.w / 2, VIEW.h / 2 + 38);
    ctx.restore();
  }

  drawGameOver(game, pal) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(3,3,8,0.5)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    this.panel(game, 520, 430);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ff9a8a';
    ctx.font = '700 44px Georgia, serif';
    ctx.fillText('THE LIGHT GOES OUT', VIEW.w / 2, 216);
    ctx.fillStyle = 'rgba(235,240,255,0.92)';
    ctx.font = '400 18px Georgia, serif';
    ctx.fillText(game.endCause === 'fuel' ? 'Your light faded before the dawn.' : 'The shards broke the ember apart.', VIEW.w / 2, 252);
    this.statRows(game, VIEW.w / 2, 306, this.runStats(game));
    ctx.textAlign = 'center';
    const pulse = 0.72 + Math.sin(game.time * 3.2) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd76b';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER TO DESCEND AGAIN', VIEW.w / 2, 512);
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  drawVictory(game, pal) {
    const ctx = this.ctx;
    // Dawn breaks: a warm wash over the whole chasm.
    const g = ctx.createLinearGradient(0, VIEW.h, 0, 0);
    g.addColorStop(0, 'rgba(255,150,60,0.34)');
    g.addColorStop(0.6, 'rgba(255,190,90,0.16)');
    g.addColorStop(1, 'rgba(20,16,40,0.30)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    this.panel(game, 560, 470);
    ctx.save();
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd76b';
    ctx.font = '700 46px Georgia, serif';
    ctx.fillText('DAWN, REKINDLED', VIEW.w / 2, 196);
    const grade = gradeFor(game.score);
    ctx.shadowColor = '#ffb03a';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#fff3d0';
    ctx.font = '700 92px Georgia, serif';
    ctx.fillText(grade.letter, VIEW.w / 2, 292);
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(235,240,255,0.92)';
    ctx.font = '400 18px Georgia, serif';
    ctx.fillText(`Grade ${grade.letter} — ${grade.word}. All seven braziers burn.`, VIEW.w / 2, 326);
    this.statRows(game, VIEW.w / 2, 372, this.runStats(game));
    ctx.textAlign = 'center';
    const pulse = 0.72 + Math.sin(game.time * 3.2) * 0.28;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#ffd76b';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('PRESS ENTER TO DESCEND AGAIN', VIEW.w / 2, 556);
    ctx.globalAlpha = 1;
    ctx.restore();
  }
}
