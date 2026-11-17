// All canvas drawing: zones, entities, light/flicker, HUD, screens.
import { VIEW_W, VIEW_H, MAX_LIGHT, BRAZIERS_TO_WIN } from './config.js';

export class Renderer {
  constructor(ctx) { this.ctx = ctx; }
  draw(game) {
    const { ctx } = this;
    const world = game.world;
    const pal = world.palette();
    // Sky
    const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    g.addColorStop(0, pal.skyTop); g.addColorStop(1, pal.skyBottom);
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Motes drifting up (the fall illusion)
    ctx.fillStyle = pal.glow;
    for (const m of world.motes) {
      ctx.globalAlpha = 0.16 + m.s * 0.12;
      ctx.fillRect(m.x, m.y, 2.4 * m.s, 7 * m.s);
    }
    ctx.globalAlpha = 1;
    // Walls
    ctx.fillStyle = pal.wall;
    ctx.beginPath(); ctx.moveTo(0, 0);
    for (let y = 0; y <= VIEW_H + 90; y += 45) ctx.lineTo(world.wallInset(0, y), y);
    ctx.lineTo(0, VIEW_H); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(VIEW_W, 0);
    for (let y = 0; y <= VIEW_H + 90; y += 45) ctx.lineTo(VIEW_W - world.wallInset(1, y), y);
    ctx.lineTo(VIEW_W, VIEW_H); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = pal.wallEdge; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let y = 0; y <= VIEW_H + 90; y += 45) { const x = world.wallInset(0, y); if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    ctx.beginPath();
    for (let y = 0; y <= VIEW_H + 90; y += 45) { const x = VIEW_W - world.wallInset(1, y); if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }
    ctx.stroke();
    this.drawItems(game);
    this.drawEmber(game);
    this.drawParticles(game);
    this.drawDarkness(game);
    this.drawFloats(game);
    if (game.state === 'playing' || game.state === 'paused') this.drawHUD(game);
    if (game.state === 'title') this.drawTitle(game);
    if (game.state === 'paused') this.drawPause(game);
    if (game.state === 'gameover') this.drawGameOver(game);
    if (game.state === 'victory') this.drawVictory(game);
  }
  drawItems(game) {
    const { ctx } = this;
    const pal = game.world.palette();
    for (const e of game.world.items) {
      if (e.kind === 'spark') {
        const tw = 0.75 + Math.sin(e.phase) * 0.25;
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 20 * tw);
        rg.addColorStop(0, '#fff6c9'); rg.addColorStop(0.4, pal.accent); rg.addColorStop(1, 'rgba(255,200,80,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(e.x, e.y, 20 * tw, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fffbe8';
        ctx.beginPath(); ctx.arc(e.x, e.y, 4.4, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'shard') {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.rot);
        ctx.fillStyle = '#9fb6c9';
        ctx.beginPath();
        ctx.moveTo(0, -17); ctx.lineTo(11, 9); ctx.lineTo(-3, 15); ctx.lineTo(-12, -6);
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = '#d7ecfa'; ctx.lineWidth = 1.6; ctx.stroke();
        ctx.restore();
      } else if (e.kind === 'wisp') {
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 26);
        rg.addColorStop(0, 'rgba(190,160,255,0.9)'); rg.addColorStop(1, 'rgba(120,70,220,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(e.x, e.y, 26, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#efe8ff';
        ctx.beginPath(); ctx.arc(e.x - 4, e.y - 2, 3, 0, Math.PI * 2); ctx.arc(e.x + 5, e.y - 2, 3, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'brazier') {
        const lit = e.lit;
        ctx.fillStyle = '#5a4632';
        ctx.fillRect(e.x - 26, e.y + 12, 52, 9);
        ctx.fillRect(e.x - 4, e.y + 21, 8, 20);
        ctx.beginPath(); ctx.ellipse(e.x, e.y + 10, 30, 10, 0, 0, Math.PI * 2);
        ctx.fillStyle = lit ? '#8a6a3a' : '#3d3a44'; ctx.fill();
        const fl = lit ? 1 : 0.45 + Math.sin(e.phase) * 0.1;
        const rg = ctx.createRadialGradient(e.x, e.y - 6, 0, e.x, e.y - 6, 44 * fl);
        rg.addColorStop(0, lit ? '#fff3b0' : '#ffb37a');
        rg.addColorStop(0.5, lit ? '#ffb84d' : '#c96a2e');
        rg.addColorStop(1, 'rgba(255,140,40,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(e.x, e.y - 6, 44 * fl, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff8dc';
        ctx.beginPath(); ctx.ellipse(e.x, e.y - 8, 6, 11 * fl + 3, 0, 0, Math.PI * 2); ctx.fill();
      } else if (e.kind === 'gate') {
        const rg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, 86);
        rg.addColorStop(0, 'rgba(255,250,215,0.95)'); rg.addColorStop(0.55, 'rgba(255,214,120,0.55)'); rg.addColorStop(1, 'rgba(255,214,120,0)');
        ctx.fillStyle = rg;
        ctx.beginPath(); ctx.arc(e.x, e.y, 86, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#ffeeb8'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(e.x, e.y, 50, 0, Math.PI * 2); ctx.stroke();
        ctx.fillStyle = '#7a5a12';
        ctx.font = 'bold 15px Georgia, serif'; ctx.textAlign = 'center';
        ctx.fillText('DAWN GATE', e.x, e.y + 5);
      }
    }
  }
  drawEmber(game) {
    const { ctx } = this;
    const p = game.player;
    // Trail
    p.trail.forEach((tp, i) => {
      const a = 0.2 * (1 - i / p.trail.length);
      ctx.fillStyle = `rgba(255,170,60,${a.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(tp.x, tp.y, p.radius * (1 - i / (p.trail.length * 1.6)), 0, Math.PI * 2); ctx.fill();
    });
    const blink = game.timeMs < p.invulnUntil && Math.floor(game.timeMs / 110) % 2 === 0;
    if (blink) return;
    const fl = 1 + Math.sin(p.flicker) * 0.07;
    const rg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 44 * fl);
    rg.addColorStop(0, '#fffbe8'); rg.addColorStop(0.35, '#ffd76a'); rg.addColorStop(0.7, '#ff8f2e'); rg.addColorStop(1, 'rgba(255,110,20,0)');
    ctx.fillStyle = rg;
    ctx.beginPath(); ctx.arc(p.x, p.y, 44 * fl, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fffdf4';
    ctx.beginPath(); ctx.arc(p.x, p.y, 8.5, 0, Math.PI * 2); ctx.fill();
  }
  drawParticles(game) {
    const { ctx } = this;
    for (const pt of game.particles.list) {
      const a = 1 - pt.age / pt.life;
      ctx.globalAlpha = Math.max(0, a);
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.r, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  drawFloats(game) {
    const { ctx } = this;
    ctx.textAlign = 'center';
    ctx.font = 'bold 19px Georgia, serif';
    for (const t of game.floats.list) {
      ctx.globalAlpha = Math.max(0, 1 - t.age / t.life);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }
  drawDarkness(game) {
    if (game.state === 'title') return;
    const { ctx } = this;
    const p = game.player;
    const r = Math.max(120, p.lightRadius());
    const g = ctx.createRadialGradient(p.x, p.y, r * 0.55, p.x, p.y, r * 2.1);
    g.addColorStop(0, 'rgba(2,2,10,0)');
    g.addColorStop(1, 'rgba(2,2,10,0.88)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // Brazier glows punch through the dark.
    for (const e of game.world.items) {
      if (e.kind !== 'brazier' && e.kind !== 'gate') continue;
      const rr = e.kind === 'gate' ? 130 : 74;
      const gg = ctx.createRadialGradient(e.x, e.y, 4, e.x, e.y, rr);
      gg.addColorStop(0, 'rgba(255,190,90,0.28)'); gg.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = gg;
      ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, Math.PI * 2); ctx.fill();
    }
  }
  drawHUD(game) {
    const { ctx } = this;
    const p = game.player;
    // Light bar
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(24, 20, 264, 20);
    const frac = Math.max(0, p.light / MAX_LIGHT);
    const lg = ctx.createLinearGradient(24, 0, 288, 0);
    lg.addColorStop(0, '#ff8f2e'); lg.addColorStop(1, '#ffe27a');
    ctx.fillStyle = frac < 0.25 ? '#ff5040' : lg;
    ctx.fillRect(27, 23, 258 * frac, 14);
    ctx.strokeStyle = '#ffe9a8'; ctx.lineWidth = 1.5; ctx.strokeRect(24, 20, 264, 20);
    ctx.fillStyle = '#fff3d0'; ctx.font = 'bold 13px Georgia, serif'; ctx.textAlign = 'left';
    ctx.fillText('LIGHT', 24, 58);
    // Hearts
    ctx.font = '22px Georgia, serif';
    for (let i = 0; i < 3; i++) {
      ctx.fillStyle = i < p.hearts ? '#ff5d73' : 'rgba(255,255,255,0.22)';
      ctx.fillText('♥', 330 + i * 30, 40);
    }
    // Braziers + score + depth
    ctx.font = 'bold 20px Georgia, serif'; ctx.fillStyle = '#ffe9a8';
    ctx.fillText(`Braziers ${game.kindled}/${BRAZIERS_TO_WIN}`, 470, 40);
    ctx.textAlign = 'right';
    ctx.fillText(`Score ${game.score}`, VIEW_W - 24, 40);
    ctx.font = '16px Georgia, serif'; ctx.fillStyle = '#cfe8ef';
    ctx.fillText(`Depth ${Math.floor(game.world.depth)} m`, VIEW_W - 24, 64);
    ctx.fillText(game.world.palette().name, VIEW_W - 24, 88);
    if (game.combo > 1) {
      ctx.fillStyle = '#ffd76a'; ctx.font = 'bold 18px Georgia, serif'; ctx.textAlign = 'left';
      ctx.fillText(`Combo x${game.combo}`, 24, 84);
    }
    if (game.sound.muted) {
      ctx.fillStyle = '#9fb6c9'; ctx.font = '14px Georgia, serif'; ctx.textAlign = 'left';
      ctx.fillText('muted (M)', 24, VIEW_H - 16);
    }
  }
  panel(alpha) {
    const { ctx } = this;
    ctx.fillStyle = `rgba(3,4,14,${alpha})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  centerText(text, y, font, color) {
    const { ctx } = this;
    ctx.font = font; ctx.fillStyle = color; ctx.textAlign = 'center';
    ctx.fillText(text, VIEW_W / 2, y);
  }
  drawTitle(game) {
    this.panel(0.45);
    this.centerText('EMBERWAKE', 268, 'bold 84px Georgia, serif', '#ffd76a');
    this.centerText('The last ember of a drowned sun is falling.', 330, '24px Georgia, serif', '#ffeeda');
    this.centerText('Gather sparks to keep your light alive. Kindle the seven braziers.', 368, '21px Georgia, serif', '#cfe8ef');
    this.centerText('Open the Dawn Gate — before the dark takes you.', 400, '21px Georgia, serif', '#cfe8ef');
    this.centerText('Steer: Arrow keys / WASD / Mouse      Pause: P or Esc      Mute: M', 478, '19px Georgia, serif', '#9fc6d4');
    this.centerText('Press Enter, Space, or Click to fall', 528, 'bold 24px Georgia, serif', '#fff3b0');
  }
  drawPause(game) {
    this.panel(0.55);
    this.centerText('PAUSED', 330, 'bold 56px Georgia, serif', '#ffe9a8');
    this.centerText('Press P or Esc to resume', 386, '22px Georgia, serif', '#cfe8ef');
  }
  drawGameOver(game) {
    this.panel(0.62);
    this.centerText('THE DARK TAKES YOU', 300, 'bold 58px Georgia, serif', '#8fb8cc');
    this.centerText(game.overReason || '', 352, '22px Georgia, serif', '#ffeeda');
    this.centerText(`Score ${game.score}   ·   Sparks ${game.sparks}   ·   Braziers ${game.kindled}/7   ·   Depth ${Math.floor(game.world.depth)} m`, 404, '21px Georgia, serif', '#cfe8ef');
    this.centerText('Press Enter, Space, or Click to fall again', 470, 'bold 23px Georgia, serif', '#fff3b0');
  }
  drawVictory(game) {
    this.panel(0.4);
    this.centerText('DAWN BREAKS', 262, 'bold 68px Georgia, serif', '#fff3b0');
    this.centerText('The ember reaches the Dawn Gate and the sun is reborn.', 322, '23px Georgia, serif', '#ffeeda');
    this.centerText(`Grade ${game.grade}`, 396, 'bold 64px Georgia, serif', '#ffd76a');
    this.centerText(`Score ${game.score}   ·   Sparks ${game.sparks}   ·   Hearts ${game.player.hearts}/3   ·   Time ${Math.floor(game.elapsed)}s`, 452, '21px Georgia, serif', '#cfe8ef');
    this.centerText('Press Enter, Space, or Click to fall again', 516, 'bold 23px Georgia, serif', '#fff3b0');
  }
}
