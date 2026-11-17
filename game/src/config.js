// Emberwake tuning constants and zone palettes.
export const VIEW_W = 1280;
export const VIEW_H = 720;
export const PLAYER_Y_MIN = 90;
export const PLAYER_Y_MAX = 620;
export const PLAYER_X_MIN = 70;
export const PLAYER_X_MAX = 1210;
export const PLAYER_SPEED = 430;
export const PLAYER_RADIUS = 16;
export const START_LIGHT = 78;
export const MAX_LIGHT = 100;
export const LIGHT_DRAIN = 2.35;
export const SPARK_LIGHT = 15;
export const KINDLE_LIGHT = 26;
export const START_HEARTS = 3;
export const HIT_INVULN_MS = 1400;
export const BRAZIERS_TO_WIN = 7;
export const COMBO_WINDOW_MS = 2600;
export const FIXED_STEP = 1 / 60;

export const ZONES = [
  {
    name: 'The Drowned Halls',
    until: 1400,
    skyTop: '#0b2b3a', skyBottom: '#06121d',
    wall: '#123c4d', wallEdge: '#2e7d8f',
    glow: '#57d7e8', accent: '#ffd98a',
    drainMul: 1.0, hazardMul: 0.8, scroll: 150,
  },
  {
    name: 'The Cinder Deep',
    until: 3400,
    skyTop: '#3a1408', skyBottom: '#170806',
    wall: '#4d2110', wallEdge: '#a3541f',
    glow: '#ffab4a', accent: '#ffe9a8',
    drainMul: 1.25, hazardMul: 1.15, scroll: 195,
  },
  {
    name: 'The Throat of Night',
    until: Infinity,
    skyTop: '#170b2e', skyBottom: '#05030d',
    wall: '#241145', wallEdge: '#5b3aa8',
    glow: '#b79bff', accent: '#fff3b0',
    drainMul: 1.55, hazardMul: 1.5, scroll: 245,
  },
];

export function zoneForDepth(depth) {
  for (let i = 0; i < ZONES.length; i++) {
    if (depth < ZONES[i].until) return i;
  }
  return ZONES.length - 1;
}
