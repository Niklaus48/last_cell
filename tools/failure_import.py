"""One-off authoring aid: turns the failure-sequence design patch into canonical TS.

The patch (`uploads/chapter1.pack.failure-sequences.json`) is a *design* input: it
was derived from the earlier redesign pack, so it must not be imported wholesale —
it reverts later text fixes. This script therefore emits **only** the six new
failure scenes, with the repository's own rules applied on the way:

- choice labels are the player's own action ("… می‌کنم"), like the rest of the
  chapter, not a third-person description of Kian;
- narration stays third person and quotes nobody.

Everything else about the patch (re-routing three choices, the new choice in
`ch1-forced-door-noise`, the new failure record) is applied by hand in the
canonical TypeScript, so a re-run of this script cannot undo it.
"""
import json
import pathlib

ROOT = pathlib.Path('/home/user')
pack = json.load(open(ROOT / 'uploads/chapter1.pack.failure-sequences.json'))
story = pack['story']
scenes = {scene['id']: scene for scene in story['scenes']}

SCENE_CONST = {
    'ch1-fail-door-detected': 'failDoorDetected',
    'ch1-fail-door-captured': 'failDoorCaptured',
    'ch1-fail-office-exposed': 'failOfficeExposed',
    'ch1-fail-office-captured': 'failOfficeCaptured',
    'ch1-fail-fatal-warning': 'failFatalWarning',
    'ch1-fail-fatal-outcome': 'failFatalOutcome',
}
FAILURE_CONST = {
    'f-ch1-caught-at-door': 'caughtAtDoor',
    'f-ch1-office-alarm': 'officeAlarm',
    'f-ch1-shot-in-corridor': 'shotInCorridor',
}
# Labels are the player's action. The patch phrased three of them as narration.
LABEL_OVERRIDES = {
    'failure-door-continue': 'عقب می‌کشم؛ شاید هنوز راه برگشتی باشد.',
    'failure-office-continue': 'به سمت خروجی عقب می‌کشم.',
    'failure-fatal-continue': 'با وجود هشدار، به دویدن ادامه می‌دهم.',
}

ORDER = [
    'ch1-fail-door-detected',
    'ch1-fail-door-captured',
    'ch1-fail-office-exposed',
    'ch1-fail-office-captured',
    'ch1-fail-fatal-warning',
    'ch1-fail-fatal-outcome',
]


def q(text: str) -> str:
    return "'" + text.replace('\\', '\\\\').replace("'", "\\'") + "'"


def outcome(node) -> str:
    if node['type'] == 'transition':
        return "{ type: 'transition', targetSceneId: S." + SCENE_CONST[node['targetSceneId']] + ' }'
    if node['type'] == 'failure':
        return "{ type: 'failure', failureId: CHAPTER1_FAILURE." + FAILURE_CONST[node['failureId']] + ' }'
    raise SystemExit('unexpected outcome ' + node['type'])


def scene_block(scene) -> str:
    lines = ['  {', f"    id: S.{SCENE_CONST[scene['id']]},", f"    title: {q(scene['title'])},"]
    if 'backgroundAssetId' in scene:
        lines.append(f"    backgroundAssetId: {q(scene['backgroundAssetId'])},")
    lines.append('    narration: [')
    for paragraph in scene['narration']:
        lines.append(f'      {q(paragraph)},')
    lines.append('    ],')
    lines.append('    choices: [')
    for choice in scene['choices']:
        lines.append('      {')
        lines.append(f"        id: {q(choice['id'])},")
        lines.append(f"        label: {q(LABEL_OVERRIDES.get(choice['id'], choice['label']))},")
        lines.append(f"        outcome: {outcome(choice['outcome'])},")
        lines.append('      },')
    lines.append('    ],')
    lines.append('  },')
    return '\n'.join(lines)


HEADER = """/**
 * Chapter 1 — the ways this attempt can end badly.
 *
 * A failure is never a sudden overlay. Each of these scenes is played like any
 * other: the mistake is visible, the guards react, the attempt ends, and only
 * then does the result screen name the cause. The player reads what happened
 * before being offered a way out — a rewind of the attempt (checkpoint), or a
 * new run.
 *
 * Two of the three are recoverable: Kian is caught, the attempt is spent, and
 * the chapter can be replayed from a checkpoint. The third is fatal: he does not
 * come back to Cell 14 in this attempt at all, and the only honest offer is to
 * rewind to before the run into the corridor — never a physical rescue.
 */"""

body = '\n\n'.join(scene_block(scenes[scene_id]) for scene_id in ORDER)
text = (
    HEADER
    + "\nimport type { SceneDefinition } from '../../engine';\n"
    + "import { CHAPTER1_FAILURE, CHAPTER1_SCENE as S } from './ids';\n\n"
    + "export const failureScenes: readonly SceneDefinition[] = [\n"
    + body
    + "\n];\n"
)
(ROOT / 'src/story/content/chapter1/scenes.failures.ts').write_text(text, encoding='utf8')
print('wrote scenes.failures.ts', len(text.splitlines()), 'lines')
