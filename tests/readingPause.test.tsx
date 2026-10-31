// @vitest-environment jsdom
/**
 * The per-scene reading pause written by the studio must reach the narration
 * stage — and must not change anything else about the flow.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useNarrationFlow } from '../src/app/useNarrationFlow';
import { NARRATION_TIMING, flowKeyOf, type NarrationPhase } from '../src/app/narrationFlow';
import { startStory } from '../src/story/engine';
import { chapter1Story } from '../src/story/content/chapter1';

/** A real engine state: the flow only needs `currentSceneId` and a live status. */
const state = startStory(chapter1Story).state;

function phases(): NarrationPhase[] {
  return ['scene_narration', 'choice_announcement', 'choices_available'];
}

describe('per-scene reading pause', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('holds the narration stage for exactly the pause the pack asks for', () => {
    const { result } = renderHook(() =>
      useNarrationFlow({
        state,
        active: true,
        epoch: 0,
        choices: [{ id: 'c1', label: 'یک', outcome: { type: 'ending', endingId: 'e1' } }],
        narrationParagraphs: 1,
        readingPauseMs: 9000,
      }),
    );

    expect(result.current.phase).toBe(phases()[0]);

    act(() => {
      vi.advanceTimersByTime(8999);
    });
    expect(result.current.phase).toBe('scene_narration');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('choice_announcement');
  });

  it('falls back to the paragraph-scaled default when the scene has no override', () => {
    const paragraphs = 3;
    const expected =
      NARRATION_TIMING.sceneNarrationMs + NARRATION_TIMING.perNarrationParagraphMs * paragraphs;

    const { result } = renderHook(() =>
      useNarrationFlow({
        state,
        active: true,
        epoch: 0,
        choices: [{ id: 'c1', label: 'یک', outcome: { type: 'ending', endingId: 'e1' } }],
        narrationParagraphs: paragraphs,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(expected - 1);
    });
    expect(result.current.phase).toBe('scene_narration');

    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.phase).toBe('choice_announcement');
  });

  it('never lets the override skip the announcement stage', () => {
    const { result } = renderHook(() =>
      useNarrationFlow({
        state,
        active: true,
        epoch: 0,
        choices: [{ id: 'c1', label: 'یک', outcome: { type: 'ending', endingId: 'e1' } }],
        narrationParagraphs: 2,
        readingPauseMs: 300,
      }),
    );

    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(result.current.phase).toBe('choice_announcement');
    expect(result.current.choicesEnabled).toBe(false);
  });

  it('keeps the stage key stable while the pause changes', () => {
    const { result, rerender } = renderHook(
      (props: { ms: number }) =>
        useNarrationFlow({
          state,
          active: true,
          epoch: 0,
          choices: [{ id: 'c1', label: 'یک', outcome: { type: 'ending', endingId: 'e1' } }],
          narrationParagraphs: 1,
          readingPauseMs: props.ms,
        }),
      { initialProps: { ms: 5000 } },
    );

    const key = result.current.key;
    // The key identifies the scene visit; the phase is layered on top by the gate.
    expect(key).toBe(flowKeyOf(0, state.currentSceneId, state.history.length));
    rerender({ ms: 6000 });
    expect(result.current.key).toBe(key);
  });
});
