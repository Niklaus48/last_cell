/**
 * Playing the sound attached to the current scene.
 *
 * Two kinds of sound, both authored in the studio and stored in the content pack:
 *
 * - **narrator voice-over** — one track per scene. It starts when the scene is
 *   presented; the narration stage may hold until it ends (see `voicePlaying`),
 *   with the Continue action always available as an escape hatch.
 * - **SFX cues** — a sound placed at an offset in milliseconds from the moment
 *   the scene appears, so "a door slams three seconds in" stays three seconds in
 *   no matter how the reading pause is configured.
 *
 * Everything here is best-effort and never blocks the game:
 * - no audio file, an unknown id, a decode error or a blocked autoplay policy
 *   just means silence;
 * - timers are cleared on scene change, mute, unmount and session replacement,
 *   so a cue can never leak into the next scene;
 * - nothing is scheduled while muted, and unmuting mid-scene does not replay the
 *   cues that were already skipped.
 */
import { useEffect, useRef, useState } from 'react';
import { getSceneAudio } from '../../story/content/pack';
import { resolveAudioUrl } from '../../audio/audioManifest';

export interface UseSceneAudioOptions {
  /** Scene currently on screen, or `null` when nothing is playable. */
  readonly sceneId: string | null;
  /** Identity of the run: a new value restarts the sound of the same scene. */
  readonly epoch: number;
  /** Muted: nothing plays, nothing is scheduled. */
  readonly muted: boolean;
  /** Playback volume for SFX and voice (0–1). */
  readonly volume?: number;
}

export interface SceneAudioState {
  /** True while the narrator voice-over of this scene is still playing. */
  readonly voicePlaying: boolean;
  /** Ids that failed to play in this scene (useful for the studio and tests). */
  readonly failed: readonly string[];
}

function createAudio(url: string, volume: number): HTMLAudioElement | null {
  // jsdom has no media implementation, and some embeds disable playback.
  if (typeof Audio === 'undefined') {
    return null;
  }
  const element = new Audio(url);
  element.volume = Math.max(0, Math.min(1, volume));
  element.preload = 'auto';
  return element;
}

export function useSceneAudio({
  sceneId,
  epoch,
  muted,
  volume = 1,
}: UseSceneAudioOptions): SceneAudioState {
  // Both pieces of state are keyed by the scene they describe, so a scene change
  // derives "nothing is playing" without a synchronous setState inside an effect.
  const key = `${sceneId ?? 'none'}@${epoch}:${muted ? 'muted' : 'live'}`;
  const [voice, setVoice] = useState<{ readonly key: string; readonly playing: boolean } | null>(null);
  const [problemKey, setProblemKey] = useState<string | null>(null);
  const [problemIds, setProblemIds] = useState<readonly string[]>([]);
  const voiceRef = useRef<HTMLAudioElement | null>(null);

  const voicePlaying = voice !== null && voice.key === key && voice.playing;
  const failed = problemKey === key ? problemIds : [];

  useEffect(() => {
    if (sceneId === null || muted) {
      return;
    }
    const audio = getSceneAudio(sceneId);
    if (audio === null) {
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const players: HTMLAudioElement[] = [];
    const problems: string[] = [];
    const report = (assetId: string): void => {
      problems.push(assetId);
      setProblemKey(key);
      setProblemIds([...problems]);
    };

    // --- SFX cues, scheduled relative to the scene appearing ---
    for (const cue of audio.sfx ?? []) {
      const url = resolveAudioUrl(cue.assetId);
      if (url === null) {
        continue;
      }
      const volumeForCue = Math.max(0, Math.min(1, (cue.volume ?? 1) * volume));
      timers.push(
        setTimeout(() => {
          const element = createAudio(url, volumeForCue);
          if (element === null) {
            return;
          }
          players.push(element);
          element.play().catch(() => {
            // Autoplay blocked or the file is broken: stay silent, never crash.
            report(cue.assetId);
          });
        }, cue.atMs),
      );
    }

    // --- narrator voice-over, started with the scene ---
    if (audio.voice !== undefined) {
      const url = resolveAudioUrl(audio.voice);
      if (url !== null) {
        const element = createAudio(url, volume);
        if (element !== null) {
          voiceRef.current = element;
          players.push(element);
          const stop = (): void => setVoice({ key, playing: false });
          element.addEventListener('ended', stop);
          element.addEventListener('error', stop);
          // Only ever set from a promise callback or an event: never synchronously
          // in the effect body, so no cascading render loop is possible.
          element.play().then(
            () => setVoice({ key, playing: true }),
            () => {
              setVoice({ key, playing: false });
              report(audio.voice ?? 'voice');
            },
          );
        }
      }
    }

    return () => {
      for (const timer of timers) {
        clearTimeout(timer);
      }
      for (const player of players) {
        player.pause();
        player.src = '';
      }
      voiceRef.current = null;
    };
    // `key` folds scene, epoch and mute together: reloading the same scene replays
    // its audio, and muting stops it immediately.
  }, [key, sceneId, muted, volume]);


  useEffect(() => {
    if (!voicePlaying) {
      return;
    }
    const element = voiceRef.current;
    return () => {
      element?.pause();
    };
  }, [voicePlaying]);

  return { voicePlaying, failed };
}
