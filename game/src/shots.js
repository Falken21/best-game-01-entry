// Emberwake — deterministic screenshot scenes.
// The game is handed in with renders of itself, taken by loading
// game/index.html?shot=<scene>&seed=<n>: each scene below composes
// one honest moment of play from the game's own systems, steps the
// simulation a fixed number of fixed steps, and the page then sets
// window.__shotReady. Nothing here is drawn that the game cannot
// draw in real play.

import { TUNING, VIEW } from './config.js';

function placeSparkTrail(game, cx, cy, count, lean) {
  for (let i = 0; i < count; i++) {
    game.world.sparks.push({
      x: cx + Math.sin(i * 0.62 + lean) * 34 + (i - count / 2) * 17,
      y: cy + i * 40,
      bob: i * 0.7,
      radius: 9,
    });
  }
}

function placeShard(game, x, y, radius, points) {
  game.world.shards.push({
    x, y, radius, fall: 20, drift: 0, rot: 0.7, spin: 0.3,
    points: points || [0.9, 1.05, 0.7, 1.1, 0.8, 0.95, 1.0, 0.75],
  });
}

function baseRun(game) {
  game.player.reset();
  game.world.reset(0);
  game.score = 0;
  game.kindled = 0;
  game.combo = 1;
  game.comboTimer = 0;
  game.chain = 0;
  game.sparksTaken = 0;
  game.runTime = 0;
  game.shake = 0;
  game.zoneBanner.t = 0;
}

const SCENES = {
  // The cover: mid-descent in the Twilight Canopy, a spark trail
  // curving away below, shards closing in, the next brazier's
  // beacon already visible.
  descent(game) {
    baseRun(game);
    game.state = 'playing';
    game.kindled = 1;
    game.world.updateZone(1);
    game.score = 1240;
    game.sparksTaken = 41;
    game.runTime = 64;
    game.world.depth = 4600;
    game.player.x = 520;
    game.player.y = 300;
    game.player.vx = 150;
    game.player.fuel = 68;
    game.combo = 4;
    game.comboTimer = 2.6;
    game.world.braziers.push({ x: 905, y: 655, radius: 56, lit: false, flame: 2 });
    game.world.braziers.push({ x: 330, y: 130, radius: 56, lit: true, flame: 5 });
    placeSparkTrail(game, 620, 430, 6, 0.4);
    placeSparkTrail(game, 300, 620, 4, -0.3);
    placeShard(game, 815, 190, 34);
    placeShard(game, 250, 430, 26);
    placeShard(game, 1010, 480, 40);
    placeShard(game, 690, 90, 20);
    return 26;
  },

  // The title over a living chasm: one brazier already burning
  // behind the wordmark, sparks drifting up.
  title(game) {
    baseRun(game);
    game.state = 'title';
    game.world.depth = 1500;
    game.player.x = VIEW.w / 2;
    game.player.y = 392;
    game.world.braziers.push({ x: 240, y: 560, radius: 56, lit: true, flame: 3 });
    game.world.braziers.push({ x: 1060, y: 620, radius: 56, lit: false, flame: 1 });
    placeSparkTrail(game, 880, 120, 5, 0.2);
    placeShard(game, 180, 180, 28);
    placeShard(game, 1120, 260, 32);
    return 40;
  },

  // The kindling moment in the Cinder Depths: the ring has just
  // caught, the burst is still in the air, the combo is banked.
  kindle(game) {
    baseRun(game);
    game.state = 'playing';
    game.kindled = 4;
    game.world.updateZone(4);
    game.score = 3860;
    game.sparksTaken = 87;
    game.runTime = 121;
    game.world.depth = 12900;
    game.player.x = 600;
    game.player.y = 330;
    game.player.fuel = 74;
    game.combo = 5;
    game.comboTimer = 3.1;
    const b = { x: 660, y: 350, radius: 56, lit: true, flame: 0.4 };
    game.world.braziers.push(b);
    game.world.braziers.push({ x: 300, y: 90, radius: 56, lit: true, flame: 8 });
    placeSparkTrail(game, 430, 560, 5, -0.4);
    placeShard(game, 940, 200, 36);
    placeShard(game, 260, 470, 24);
    placeShard(game, 1050, 560, 30);
    game.particles.burst(game.fxRng, b.x, b.y, { count: 46, color: '#ffb03a', speed: 300, life: 1.1, size: 4, glow: 14 });
    game.particles.burst(game.fxRng, b.x, b.y, { count: 20, color: '#fff3c4', speed: 170, life: 0.8, size: 3, glow: 12 });
    game.floaters.add(b.x, b.y - 84, 'BRAZIER KINDLED ×5', { color: '#ffd76b', size: 26 });
    return 7;
  },

  // The end of a good run: dawn over the Hollow Dark, the grade
  // and the full tally on the results panel.
  victory(game) {
    baseRun(game);
    game.state = 'win';
    game.kindled = 7;
    game.world.updateZone(7);
    game.score = 9340;
    game.sparksTaken = 132;
    game.runTime = 187;
    game.best = 9340;
    game.world.depth = 21400;
    game.player.x = VIEW.w / 2;
    game.player.y = 120;
    game.player.fuel = 41;
    game.world.gate = { x: VIEW.w / 2, y: 120, radius: 74, pulse: 2 };
    game.world.braziers.push({ x: 250, y: 640, radius: 56, lit: true, flame: 6 });
    game.world.braziers.push({ x: 1030, y: 660, radius: 56, lit: true, flame: 2 });
    return 12;
  },
};

export function applyShot(game, name) {
  const scene = SCENES[name];
  if (!scene) return 0;
  return scene(game);
}

export const SHOT_NAMES = Object.keys(SCENES);
