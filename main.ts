// Emberwake hand-in for make.fun best-game-01.
// Copies the static game and screenshots into the output directory
// and writes dossier.json there. The output directory is a mounted
// volume in the grader, so this program NEVER deletes, cleans, or
// removes anything inside it — it only creates and overwrites.
import { mkdirSync, cpSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const root = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(root, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
const shotsDir = join(root, 'screenshots');
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(out, 'screenshots'), { recursive: true });
  console.log('emberwake: copied game/ and screenshots/ into ' + out);
} else {
  console.log('emberwake: copied game/ into ' + out + ' (no screenshots/ in repo)');
}

const dossier = buildDossier(out, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});
writeFileSync(join(out, 'dossier.json'), JSON.stringify(dossier, null, 2) + '\n');
console.log('emberwake: wrote dossier.json into ' + out);
