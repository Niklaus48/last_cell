/**
 * Architectural guard: the story engine must remain framework- and DOM-free.
 *
 * This test scans the engine sources directly, so a future refactor that adds
 * `import ... from 'react'` or touches `localStorage` fails CI, not just review.
 */
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ENGINE_DIR = new URL('../src/story/engine/', import.meta.url).pathname;

/** Drops comments so prose like "must not use localStorage" is not a false positive. */
function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function engineSourceFiles(): string[] {
  return readdirSync(ENGINE_DIR)
    .filter((file) => file.endsWith('.ts'))
    .map((file) => join(ENGINE_DIR, file));
}

const forbiddenPatterns: ReadonlyArray<{ label: string; pattern: RegExp }> = [
  { label: 'React import', pattern: /from\s+['"]react(-dom)?(\/[^'"]*)?['"]/ },
  { label: 'React require', pattern: /require\(\s*['"]react/ },
  { label: 'jsx react-jsx pragma', pattern: /\*\*?\s*@jsx/ },
  { label: 'UI/app import', pattern: /from\s+['"][^'"]*\/(ui|app|styles)\// },
  { label: 'CSS import', pattern: /import\s+['"][^'"]+\.css['"]/ },
  { label: 'window access', pattern: /\bwindow\./ },
  { label: 'document access', pattern: /\bdocument\./ },
  { label: 'localStorage', pattern: /\blocalStorage\b/ },
  { label: 'sessionStorage', pattern: /\bsessionStorage\b/ },
  { label: 'any type', pattern: /:\s*any\b/ },
];

describe('story engine purity', () => {
  it('contains at least the expected modules', () => {
    const files = engineSourceFiles().map((path) => path.split('/').at(-1));
    expect(files).toEqual(
      expect.arrayContaining([
        'engine.ts',
        'types.ts',
        'conditions.ts',
        'effects.ts',
        'history.ts',
        'snapshot.ts',
        'validation.ts',
        'index.ts',
      ]),
    );
  });

  it.each(forbiddenPatterns)('never uses $label in engine sources', ({ pattern }) => {
    for (const file of engineSourceFiles()) {
      const source = stripComments(readFileSync(file, 'utf8'));
      expect({ file, matches: pattern.test(source) }).toEqual({ file, matches: false });
    }
  });

  it('only imports its own siblings (no layer leakage)', () => {
    for (const file of engineSourceFiles()) {
      const source = readFileSync(file, 'utf8');
      const specifiers = [...source.matchAll(/from\s+['"]([^'"]+)['"]/g)].map(
        (match) => match[1],
      );
      for (const specifier of specifiers) {
        expect(specifier, `${file} imports ${specifier}`).toMatch(/^\.\.?\/[A-Za-z]+$/);
      }
    }
  });

  it('can be imported and executed without any DOM globals present', () => {
    expect(typeof globalThis.window).toBe('undefined');
    expect(typeof globalThis.document).toBe('undefined');
  });
});
