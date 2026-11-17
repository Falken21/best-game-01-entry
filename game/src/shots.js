// Deterministic screenshot scenes. When the URL carries
// ?shot=<scene>&seed=<n>, main.js builds one fixed scene and renders
// it with fixed steps only — no wall-clock dependence.
import { VIEW_W } from './config.js';
import { makeSpark, makeShard, makeWisp, makeBrazier, makeGate } from './entities.js';

export const SHOT_SCENES = ['descent', 'title', 'kindle', 'victory'];

export function shotFromUrl() {
  try {
    return new URLSearchParams(window.location.search).get('shot');
  } catch (e) { return null; }
}

function seedField(game) {
  const rng = game.rng;
  const items = game.world.items;
  items.push(makeSpark(rng, 430, 300)); items.push(makeSpark(rng, 470, 372));
  items.push(makeSpark(rng, 840, 250)); items.push(makeSpark(rng, 905, 430));
  items.push(makeShard(rng, 700, 180)); items.push(makeWisp(rng, 300, 470));
  items.push(makeSpark(rng, 620, 520)); items.push(makeSpark(rng, 1010, 330));
}

export function setupShot(game, scene) {
  const rng = game.rng;
  game.reset(game.seed);
  if (scene === 'title') {
    game.state = 'title';
    game.world.depth = 120;
    seedField(game);
    game.stepFixed(24);
    return;
  }
  if (scene === 'descent') {
    game.state = 'playing';
    game.world.depth = 1750; game.world.zone = 1;
    game.score = 640; game.sparks = 11; game.kindled = 2;
    game.player.light = 64; game.player.hearts = 3;
    game.player.x = 520; game.player.y = 330;
    seedField(game);
    game.world.items.push(makeBrazier(rng, 880, 560));
    game.stepFixed(30);
    return;
  }
  if (scene === 'kindle') {
    game.state = 'playing';
    game.world.depth = 2450; game.world.zone = 1;
    game.score = 1180; game.sparks = 17; game.kindled = 3;
    game.player.light = 82; game.player.hearts = 2;
    const b = makeBrazier(rng, 660, 360); b.lit = true;
    game.world.items.push(b);
    game.player.x = 600; game.player.y = 352;
    seedField(game);
    game.particles.burst(rng, 660, 330, '#ffb84d', 26, 190);
    game.floats.add(660, 280, 'KINDLED!', '#ffd76a');
    game.stepFixed(18);
    return;
  }
  // victory
  game.state = 'victory';
  game.world.depth = 3900; game.world.zone = 2;
  game.score = 3420; game.sparks = 31; game.kindled = 7;
  game.player.light = 70; game.player.hearts = 2;
  game.elapsed = 148;
  game.grade = game.computeGrade();
  game.world.items.push(makeGate(VIEW_W / 2, 300));
  seedField(game);
  game.stepFixed(20);
}
