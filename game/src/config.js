// Emberwake — tuning constants, depth zones and palettes.
// Every number the game feel depends on lives here, so tuning a run
// never means hunting through the systems that use the values.

export const VIEW = { w: 1280, h: 720 };

export const BRAZIERS_TOTAL = 7;

export const TUNING = {
  // The descent: how fast the chasm scrolls past, in pixels a second.
  scrollBase: 148,
  scrollPerKindle: 11,
  // The ember's own movement.
  thrust: 1750,          // keyboard acceleration, px/s^2
  pointerPull: 9.5,      // how hard the ember leans toward the pointer
  maxSpeed: 430,
  drag: 2.6,             // velocity damping per second
  playerRadius: 15,
  // Light is fuel: it burns away and sparks feed it.
  fuelMax: 100,
  fuelBurn: 2.35,        // per second while descending
  fuelPerSpark: 5.5,
  fuelPerKindle: 30,
  // Integrity: shard hits the ember can take.
  heartsMax: 3,
  invulnerableSeconds: 1.7,
  // Scoring.
  scorePerSpark: 10,
  scorePerKindle: 250,
  scoreWinBonus: 2000,
  scoreFuelBonus: 20,    // per point of light left at the Dawn Gate
  comboWindow: 4.0,      // seconds to keep a combo alive
  comboMax: 8,
  // Hazards.
  shardRadiusMin: 13,
  shardRadiusMax: 40,
  magnetRadius: 96,      // sparks drift to the ember inside this
  collectRadius: 30,
  kindleRadius: 46,      // fly this close to a brazier heart to light it
};

// The three depths. Each zone is a palette plus a mood: the sky is a
// vertical gradient, the rock is drawn in two shades, and every glow
// in the zone borrows its accent.
export const ZONES = [
  {
    name: 'The Twilight Canopy',
    numeral: 'I',
    skyTop: '#191938',
    skyBottom: '#0d2b33',
    rockFar: '#232048',
    rockNear: '#120f26',
    shard: '#8f7ff5',
    shardEdge: '#c9c2ff',
    spark: '#ffc46b',
    accent: '#ff9a3c',
    wisp: '#7fe7d2',
  },
  {
    name: 'The Cinder Depths',
    numeral: 'II',
    skyTop: '#2b1220',
    skyBottom: '#170a10',
    rockFar: '#3d1a24',
    rockNear: '#180a10',
    shard: '#e5564b',
    shardEdge: '#ffb199',
    spark: '#ffd76b',
    accent: '#ff6a3c',
    wisp: '#7fe7d2',
  },
  {
    name: 'The Hollow Dark',
    numeral: 'III',
    skyTop: '#060913',
    skyBottom: '#0a1220',
    rockFar: '#101a2e',
    rockNear: '#05070f',
    shard: '#5f7fb8',
    shardEdge: '#bcd6ff',
    spark: '#ffe9a8',
    accent: '#ffd76b',
    wisp: '#a8ecff',
  },
];

// Score thresholds for the victory grade.
export const GRADES = [
  { min: 9000, letter: 'S', word: 'Dawnbringer' },
  { min: 7000, letter: 'A', word: 'Flamekeeper' },
  { min: 5200, letter: 'B', word: 'Kindler' },
  { min: 0, letter: 'C', word: 'Ember' },
];

export function gradeFor(score) {
  for (const g of GRADES) if (score >= g.min) return g;
  return GRADES[GRADES.length - 1];
}
