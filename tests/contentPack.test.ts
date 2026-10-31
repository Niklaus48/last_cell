/**
 * The content pack is untrusted input: it is written by a dev tool, edited by
 * hand, or pasted from a JSON export. These tests pin the contract that keeps a
 * bad pack from ever reaching the engine.
 */
import { describe, expect, it } from 'vitest';
import { validateContentPack } from '../src/story/content/pack/validate';
import { EMPTY_PACK, CONTENT_PACK_FORMAT_VERSION, type ContentPack } from '../src/story/content/pack/types';
import { chapter1Story } from '../src/story/content/chapter1';

function packWith(overrides: Record<string, unknown>): unknown {
  return { ...EMPTY_PACK, ...overrides };
}

describe('validateContentPack', () => {
  it('accepts the empty pack, which means "use the canonical content"', () => {
    const result = validateContentPack(EMPTY_PACK);
    expect(result.ok).toBe(true);
    expect(result.errors).toEqual([]);
    expect(result.pack?.story).toBeNull();
  });

  it('accepts the canonical chapter as a full story replacement', () => {
    const result = validateContentPack(
      packWith({
        story: JSON.parse(JSON.stringify(chapter1Story)) as unknown,
        flow: { readingPauseMs: { 'ch1-cell-dawn': 7000 } },
        presentation: { overrides: [], assets: { 'ch1-cell-dawn': 'cell.webp' } },
        audio: {
          assets: { 'voice-opening': 'voice-opening.mp3', 'sfx-door-metal': 'door-metal.mp3' },
          scenes: {
            'ch1-cell-dawn': { voice: 'voice-opening', sfx: [{ assetId: 'sfx-door-metal', atMs: 2500 }] },
          },
        },
      }),
    );
    expect(result.errors).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.pack?.flow?.readingPauseMs?.['ch1-cell-dawn']).toBe(7000);
    expect(result.pack?.audio?.scenes?.['ch1-cell-dawn']?.sfx?.[0]?.atMs).toBe(2500);
  });

  it('rejects a non-object', () => {
    expect(validateContentPack(null).ok).toBe(false);
    expect(validateContentPack('nope').ok).toBe(false);
    expect(validateContentPack([]).ok).toBe(false);
  });

  it('rejects an unknown format version instead of guessing', () => {
    const result = validateContentPack(packWith({ formatVersion: 99 }));
    expect(result.ok).toBe(false);
    expect(result.errors.join(' ')).toContain('formatVersion');
  });

  it('rejects a story that breaks the engine rules and reports why', () => {
    const broken = JSON.parse(JSON.stringify(chapter1Story)) as {
      scenes: { id: string; choices: { id: string; outcome: unknown }[] }[];
    };
    const firstScene = broken.scenes[0];
    expect(firstScene).toBeDefined();
    if (firstScene !== undefined && firstScene.choices[0] !== undefined) {
      firstScene.choices[0].outcome = { type: 'transition', targetSceneId: 'does_not_exist' };
    }
    const result = validateContentPack(packWith({ story: broken }));
    expect(result.ok).toBe(false);
    expect(result.pack).toBeNull();
    expect(result.errors.join(' ')).toMatch(/does_not_exist/);
  });

  it('rejects URLs and path traversal in asset file names', () => {
    for (const bad of ['https://example.com/a.png', '../secret.png', '/etc/passwd', 'a/b.png']) {
      const result = validateContentPack(
        packWith({ presentation: { overrides: [], assets: { 'ch1-cell-dawn': bad } } }),
      );
      expect(result.ok, `expected "${bad}" to be rejected`).toBe(false);
    }
  });

  it('rejects a negative or non-finite reading pause', () => {
    expect(validateContentPack(packWith({ flow: { readingPauseMs: { 'ch1-cell-dawn': -1 } } })).ok).toBe(false);
    expect(
      validateContentPack(packWith({ flow: { readingPauseMs: { 'ch1-cell-dawn': Number.POSITIVE_INFINITY } } }))
        .ok,
    ).toBe(false);
  });

  it('rejects audio cues with a bad time or volume', () => {
    const base = (cue: unknown): unknown =>
      packWith({ audio: { assets: {}, scenes: { 'ch1-cell-dawn': { sfx: [cue] } } } });
    expect(validateContentPack(base({ assetId: 'sfx-door-metal', atMs: -5 })).ok).toBe(false);
    expect(validateContentPack(base({ assetId: 'sfx-door-metal', atMs: 0, volume: 2 })).ok).toBe(false);
    expect(validateContentPack(base({ assetId: '', atMs: 0 })).ok).toBe(false);
  });

  it('never returns a partially applied pack', () => {
    const result = validateContentPack(
      packWith({
        flow: { readingPauseMs: { 'ch1-cell-dawn': 5000 } },
        presentation: { overrides: [], assets: { 'ch1-cell-dawn': 'not a file name.png.png' } },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.pack).toBeNull();
  });

  it('normalises a valid pack and keeps the format version', () => {
    const result = validateContentPack(packWith({ formatVersion: CONTENT_PACK_FORMAT_VERSION }));
    expect(result.pack?.formatVersion).toBe(CONTENT_PACK_FORMAT_VERSION);
    expect(result.pack?.storyKey).toBe('chapter1');
  });

  it('rejects a cue that names a sound nobody declared', () => {
    // A silent, unexplained cue would be a bug the author cannot see, so it is an
    // error rather than something quietly dropped.
    const result = validateContentPack(
      packWith({
        audio: {
          assets: { 'voice-opening': 'voice-opening.mp3' },
          scenes: { 'ch1-cell-dawn': { voice: 'voice-opening', sfx: [{ assetId: 'sfx-ghost', atMs: 100 }] } },
        },
      }),
    );
    expect(result.ok).toBe(false);
    expect(result.pack).toBeNull();
    expect(result.errors.join(' ')).toContain('sfx-ghost');
  });
});

describe('pack fallback', () => {
  it('the shipped pack file is the empty pack so the game starts canonical', async () => {
    const raw = (await import('../src/story/content/chapter1/studio.pack.json')) as {
      default: ContentPack;
    };
    const result = validateContentPack(raw.default);
    expect(result.ok).toBe(true);
    expect(result.pack?.story).toBeNull();
  });
});

describe('importPackJson', () => {
  it('round-trips: what the studio exports can be imported again', async () => {
    const { createDraft, draftToPack, importPackJson, updateScene } = await import('../src/studio/model');
    const scene = chapter1Story.scenes[0];
    expect(scene).toBeDefined();
    if (scene === undefined) return;

    const edited = updateScene(createDraft(), scene.id, { title: 'عنوان واردشده' });
    const text = JSON.stringify(draftToPack(edited));
    const result = importPackJson(text);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.story.scenes[0]?.title).toBe('عنوان واردشده');
    expect(result.draft.story.scenes).toHaveLength(chapter1Story.scenes.length);
  });

  it('refuses unreadable JSON without throwing', async () => {
    const { importPackJson } = await import('../src/studio/model');
    const result = importPackJson('{ not json');
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors[0]).toContain('JSON');
  });

  it('refuses a structurally invalid pack and explains why', async () => {
    const { importPackJson, createDraft, draftToPack, retargetChoice } = await import('../src/studio/model');
    const scene = chapter1Story.scenes[0];
    if (scene === undefined) return;
    const broken = retargetChoice(createDraft(), scene.id, scene.choices[0]?.id ?? '', {
      type: 'transition',
      targetSceneId: 'ghost-scene',
    });
    const result = importPackJson(JSON.stringify(draftToPack(broken)));
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.errors.join(' ')).toContain('ghost-scene');
  });

  it('imports the shipped pack file back to the canonical chapter', async () => {
    const { importPackJson } = await import('../src/studio/model');
    const raw = (await import('../src/story/content/chapter1/studio.pack.json')) as {
      default: unknown;
    };
    const result = importPackJson(JSON.stringify(raw.default));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.draft.story.scenes).toHaveLength(chapter1Story.scenes.length);
    expect(result.draft.audioAssets).toEqual({});
  });
});
