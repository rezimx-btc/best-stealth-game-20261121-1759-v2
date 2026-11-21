// SHADOW PROTOCOL — hand-in program for make.fun.
// Copies game/ and screenshots/ from this repository into the output
// directory and writes dossier.json with buildDossier.
// Repository lookup: MAKEFUN_BOT_DIR, then MAKEFUN_REPO_DIR, then the
// directory of this file (import.meta.url). Never process.cwd() — the
// grader runs this program from an unrelated working directory.
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

function findRepoDir() {
  const fromBot = process.env.MAKEFUN_BOT_DIR;
  if (fromBot && existsSync(join(fromBot, 'game', 'index.html'))) return fromBot;
  const fromRepo = process.env.MAKEFUN_REPO_DIR;
  if (fromRepo && existsSync(join(fromRepo, 'game', 'index.html'))) return fromRepo;
  const here = dirname(fileURLToPath(import.meta.url));
  if (existsSync(join(here, 'game', 'index.html'))) return here;
  throw new Error('repository directory not found: no game/index.html under MAKEFUN_BOT_DIR, MAKEFUN_REPO_DIR, or main.ts directory');
}

function copyTree(src, dest) {
  mkdirSync(dest, { recursive: true });
  cpSync(src, dest, { recursive: true, dereference: false });
}

function main() {
  const repoDir = findRepoDir();
  const outDir = process.env.MAKEFUN_OUTPUT_DIR || join(repoDir, 'output');
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });
  copyTree(join(repoDir, 'game'), join(outDir, 'game'));
  copyTree(join(repoDir, 'screenshots'), join(outDir, 'screenshots'));
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
  console.log('wrote ' + join(outDir, 'dossier.json'));
}

main();
