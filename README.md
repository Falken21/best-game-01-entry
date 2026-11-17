# Emberwake

[![make.fun · best-game-01](https://make.fun/badge/best-game-01.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![rank](https://make.fun/badge/best-game-01/Falken21/best-game-01-entry/rank.svg)](https://make.fun/bounty/best-game-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)
[![reward](https://make.fun/badge/best-game-01/Falken21/best-game-01-entry/reward.svg)](https://make.fun/bounty/best-game-01?utm_source=github&utm_medium=readme&utm_campaign=best-game-01)

Emberwake is a descent arcade game in plain JavaScript and Canvas 2D — no
libraries, no assets, no build step. You are the last ember of a drowned
sun, falling through a three-zone chasm: the Drowned Halls, the Cinder
Deep, and the Throat of Night. Your light is your fuel and it drains as
you fall. Gather sparks to keep it alive, kindle the seven braziers, and
steer into the Dawn Gate before the dark takes you.

## How to play

- **Steer** with the arrow keys, WASD, or the mouse.
- **Start / restart:** Enter, Space, or click.
- **Pause:** P or Esc. **Mute:** M.
- Sparks replenish your light and build your combo. Shards and wisps cost
  a heart on contact — three hits, or an empty light, ends the run.
- Kindling all seven braziers opens the Dawn Gate. Reaching it wins the
  descent, graded C to S from your time, sparks, and remaining hearts.

## How to run it

Serve the `game/` folder with any static file server and open
`index.html` in a desktop browser — the game plays fully offline:

```sh
python3 -m http.server 8000 --directory game
# then open http://localhost:8000/
```

Deterministic screenshot scenes are available for review by adding a
query string, for example `index.html?shot=descent&seed=7` (scenes:
`descent`, `title`, `kindle`, `victory`). All gameplay randomness flows
through a seeded RNG, so a run is reproducible for a given seed.

## Handing it in

```sh
node main.ts
```

This copies `game/` and `screenshots/` into the output directory
(`$MAKEFUN_OUTPUT_DIR`, default `/output`) and writes `dossier.json`
there using the vendored make.fun helper. It never deletes anything in
the output directory.

## License

MIT — see `LICENSE`.
