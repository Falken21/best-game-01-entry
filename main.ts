// SPDX-License-Identifier: MIT
// Emberwake — make.fun best-game-01 hand-in entrypoint.
//
// Copies the playable game (and its screenshots) into the grader's output
// directory, then writes the canonical dossier produced by the kit's
// buildDossier helper as dossier.json in that same directory.
import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// Resolve everything relative to this file, never the process CWD: the
// grader may invoke the entrypoint from any working directory.
const here = dirname(fileURLToPath(import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });

// Copy the game tree. The output directory is a mounted volume in the
// grader, so only ever create and overwrite here — never delete, clean or
// remove anything inside it.
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });

// Screenshots are part of the hand-in when present; copy them if they exist.
const shotsSrc = join(here, 'screenshots');
if (existsSync(shotsSrc)) {
  cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });
}

// The hand-in caps fixed by the competition's dossier contract.
const DOSSIER_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// buildDossier returns the dossier as canonical JSON bytes (a Uint8Array).
// Those bytes ARE dossier.json: they must be written verbatim. Running them
// through JSON.stringify would emit an object of byte indices instead of
// the dossier, and appending a newline or re-encoding would equally break
// the byte-exact match the scorer requires.
const bytes = await buildDossier(out, DOSSIER_CAPS);
if (!(bytes instanceof Uint8Array)) {
  throw new Error('buildDossier did not return bytes; refusing to write dossier.json');
}
writeFileSync(join(out, 'dossier.json'), bytes);

console.log(`emberwake: hand-in copied to ${out}; dossier.json written (${bytes.length} bytes)`);
