// Hands this make.fun frontend in: copies app/ and screenshots/ from
// beside this file to /output and writes /output/dossier.json — the
// summary the judge reads (the screenshots, the first load's files and
// bytes, and the app's source) — with the vendored make.fun library.
//
// The frontend itself is plain static files under app/: app/index.html
// plus ES modules and CSS, no build step, reading only make.fun's public
// API at https://make.fun/api. Serve it with any static file server
// pointed at app/ and open index.html in a desktop browser.
//
// Runs on Node 22, standard library only; vendor/makefun-frontend.ts is
// the kit's copy, unchanged — the scorer rebuilds the dossier with its
// own copy and requires the two to match byte for byte.
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse (more
// than 3 screenshots or one over 256 KiB; more than 993 files and
// directories in app/ or 16 MiB of app files: app/ counts beside /output's
// own 1000-entry cap, its screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, { text_max_bytes: 163840, screenshots: { max: 3, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 16777216 }),
);

// Verify the hand-in before reporting success: the app's entry point, the
// three screenshots and the dossier must all be in /output, or the build
// fails loudly instead of handing in a half-written directory.
const required = [join(out, 'app', 'index.html'), join(out, 'dossier.json')];
const shots = existsSync(join(out, 'screenshots')) ? readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.')) : [];
if (shots.length !== 3) throw new Error(`expected 3 screenshots in ${join(out, 'screenshots')}, found ${shots.length}`);
for (const f of shots) required.push(join(out, 'screenshots', f));
for (const f of required) {
  if (!existsSync(f)) throw new Error(`missing output file: ${f}`);
}
const dossierBytes = statSync(join(out, 'dossier.json')).size;
console.log(`wrote ${out}: app/ + ${shots.length} screenshots + dossier.json (${dossierBytes} bytes)`);
