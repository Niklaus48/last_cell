/**
 * Exports the **full** content pack: the story itself, not a reference to it.
 *
 * WHY THIS EXISTS
 * The studio writes `"story": null` whenever the story still equals the
 * canonical TypeScript content (`draftToPack`), because that file is then a
 * *layer* — reading pacing, artwork, audio — on top of the canonical chapter.
 * That is the right thing to save in the repo: a small, readable diff with no
 * chance of shadowing later content edits.
 *
 * It is the wrong thing to hand to anything that does not read the TypeScript:
 * a text editor, a translation pass, a spreadsheet, another tool. Those need the
 * story spelled out — `initialVariables`, `variableMeta`, every scene, choice,
 * condition and effect. This script produces exactly that from the same source
 * of truth the studio uses, so the copied story can never drift.
 *
 * Run:
 *   npm run pack:full                       → exports/chapter1.pack.full.json
 *   npm run pack:full -- --out some/path.json
 *
 * The output is validated before it is written; an invalid pack is never
 * emitted. The same file can be produced in the browser with the studio's
 * «خروجی کامل» button.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createDraft, draftFromPack, draftToFullPack } from '../src/studio/model';
import { validateContentPack } from '../src/story/content/pack/validate';
import type { ContentPack } from '../src/story/content/pack/types';

// Bundled by Vite SSR, so `import.meta.dirname` points into a cache folder: the
// package root is wherever `npm run pack:full` was started from.
const ROOT = process.cwd();
/** The pack the studio writes; when present, its edits are part of the export. */
const INSTALLED_PACK = resolve(ROOT, 'src/story/content/chapter1/studio.pack.json');

function outPath(): string {
  const flag = process.argv.indexOf('--out');
  const given = flag === -1 ? undefined : process.argv[flag + 1];
  return resolve(ROOT, given ?? 'exports/chapter1.pack.full.json');
}

function readInstalledPack(): ContentPack | null {
  let text: string;
  try {
    text = readFileSync(INSTALLED_PACK, 'utf8');
  } catch {
    return null;
  }

  const result = validateContentPack(JSON.parse(text) as unknown);
  if (!result.ok || result.pack === null) {
    // A broken installed pack must not be silently copied into the export.
    throw new Error(
      `پک نصب‌شده معتبر نیست (${INSTALLED_PACK}):\n${result.errors.join('\n')}`,
    );
  }
  return result.pack;
}

const installed = readInstalledPack();
// With an installed pack the export carries the studio's edits; without one it
// carries the canonical chapter and the canonical presentation.
const draft = installed === null ? createDraft() : draftFromPack(installed);
const fullPack = draftToFullPack(draft);

const check = validateContentPack(JSON.parse(JSON.stringify(fullPack)) as unknown);
if (!check.ok) {
  console.error('پک ساخته‌شده معتبر نیست:');
  for (const error of check.errors) {
    console.error(`  ${error}`);
  }
  process.exit(1);
}

const target = outPath();
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(fullPack, null, 2)}\n`, 'utf8');

const story = fullPack.story;
const variables = Object.entries(story?.initialVariables ?? {});
const choices = (story?.scenes ?? []).reduce((total, scene) => total + scene.choices.length, 0);

console.log(`نوشته شد: ${target}`);
console.log(
  `  منبع: ${installed === null ? 'محتوای متعارف (TS)' : 'پک نصب‌شده + محتوای متعارف'}`,
);
console.log(`  صحنه‌ها: ${story?.scenes.length ?? 0} · گزینه‌ها: ${choices} · متغیرها: ${variables.length}`);
for (const [name, value] of variables) {
  const meta = story?.variableMeta?.[name];
  console.log(`    ${name} = ${String(value)}  «${meta?.label ?? name}»`);
}
