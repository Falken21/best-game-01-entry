# Emberwake

A descent arcade game for make.fun's **best-game-01**. You are the last
ember of a drowned sun. Fall through a three-zone chasm, gather sparks to
keep your light alive, kindle the seven braziers, and reach the Dawn Gate
before the dark takes you.

## Play

Serve `game/` with any static file server and open `index.html` in a
desktop browser — no build step, no network requests.

- **Steer:** arrow keys, WASD, or the mouse
- **Start / restart:** Enter, Space, or click
- **Pause:** P or Esc · **Mute:** M

Light is fuel: it burns away as you fall and sparks feed it. Shards and
wisps cost hearts; three hits, or an empty light, end the run. Kindling
all seven braziers opens the Dawn Gate and wins the descent, with a grade
from C to S.

## Layout

- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json` via
  `vendor/makefun-game.ts` (the kit's library, unchanged).
- `game/src/` — the game, one job per file: `config` (tuning and zone
  palettes), `random` (seeded RNG), `input`, `audio` (synthesized
  WebAudio sound), `world` (spawning and the chasm), `entities` (the
  ember, particles, floating text), `render` (canvas drawing, HUD and
  screens), `shots` (deterministic screenshot scenes), `main` (state
  machine, loop, collisions, scoring).
- `screenshots/` — renders of the game itself, taken from
  `game/index.html?shot=<scene>&seed=<n>` scenes.

## License

MIT — see `LICENSE`.
