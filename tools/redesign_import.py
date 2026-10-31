"""One-off authoring aid: turns the redesign content pack into canonical TS.

Not part of the build. It exists so the 37-scene rewrite could be applied to the
repository's TypeScript content without hand-transcribing 1,200 lines of Persian
prose, and so the result is byte-for-byte reproducible from the design input.
"""
import json
import pathlib

ROOT = pathlib.Path('/home/user')
pack = json.load(open(ROOT / 'uploads/chapter1.pack.system-redesign.json'))
story = pack['story']
scenes = {s['id']: s for s in story['scenes']}

SCENE_CONST = {
    'ch1-cell-dawn': 'cellDawn',
    'ch1-cell-rehearsal': 'cellRehearsal',
    'ch1-cell-bar': 'cellBar',
    'ch1-cell-listen': 'cellListen',
    'ch1-stranger-arrives': 'strangerArrives',
    'ch1-silence': 'silence',
    'ch1-stranger-who': 'strangerWho',
    'ch1-stranger-threat': 'strangerThreat',
    'ch1-leaving-cell': 'leavingCell',
    'ch1-cell-search': 'cellSearch',
    'ch1-note': 'note',
    'ch1-corridor-first': 'corridorFirst',
    'ch1-office-entry': 'officeEntry',
    'ch1-office-overheard': 'officeOverheard',
    'ch1-office-desk': 'officeDesk',
    'ch1-office-ledger': 'officeLedger',
    'ch1-contradiction-office': 'contradictionOffice',
    'ch1-cafeteria': 'cafeteria',
    'ch1-service-entry': 'serviceEntry',
    'ch1-service-trolley': 'serviceTrolley',
    'ch1-corridor-mid': 'corridorMid',
    'ch1-locked-door': 'lockedDoor',
    'ch1-door-attempt': 'doorAttempt',
    'ch1-guard-pass': 'guardPass',
    'ch1-guard-search': 'guardSearch',
    'ch1-forced-door-noise': 'forcedDoorNoise',
    'ch1-alternative-route': 'alternativeRoute',
    'ch1-records-alcove': 'recordsAlcove',
    'ch1-record-pull': 'recordPull',
    'ch1-schedule-file': 'scheduleFile',
    'ch1-phone': 'phone',
    'ch1-phone-talk': 'phoneTalk',
    'ch1-final-approach': 'finalApproach',
    'ch1-ending-plan': 'endingPlan',
    'ch1-ending-evidence': 'endingEvidence',
    'ch1-ending-connection': 'endingConnection',
    'ch1-ending-thin': 'endingThin',
}
CLUE_CONST = {
    'dated_note': 'datedNote',
    'office_record_discrepancy': 'officeRecordDiscrepancy',
    'schedule_reference': 'scheduleReference',
    'corridor_initials': 'corridorInitials',
    'telephone_date_claim': 'telephoneDateClaim',
    'death_record_contradiction': 'deathRecordContradiction',
}
ENDING_CONST = {
    'ch1-ending-a-ambiguous-truth': 'ambiguousTruth',
    'ch1-ending-b-contradictory-dossier': 'contradictoryDossier',
    'ch1-ending-c-possible-connection': 'possibleConnection',
}
FAILURE_CONST = {
    'f-ch1-caught-at-door': 'caughtAtDoor',
    'f-ch1-office-alarm': 'officeAlarm',
}


def q(text: str) -> str:
    escaped = text.replace('\\', '\\\\').replace("'", "\\'")
    return f"'{escaped}'"


def cond(node, indent):  # noqa: C901 - a small, explicit emitter is clearer here
    pad = ' ' * indent
    kind = node['kind']
    if kind == 'always':
        return "{ kind: 'always' }"
    if kind == 'compareVariable':
        value = node['value']
        rendered = q(value) if isinstance(value, str) else str(value).lower() if isinstance(value, bool) else str(value)
        return (
            f"{{ kind: 'compareVariable', variable: {q(node['variable'])}, "
            f"operator: {q(node['operator'])}, value: {rendered} }}"
        )
    if kind == 'clueDiscovered':
        clue = CLUE_CONST.get(node['clueId'])
        return f"{{ kind: 'clueDiscovered', clueId: {('C.' + clue) if clue else q(node['clueId'])} }}"
    if kind == 'visitedScene':
        scene = SCENE_CONST.get(node['sceneId'])
        return f"{{ kind: 'visitedScene', sceneId: {('S.' + scene) if scene else q(node['sceneId'])} }}"
    if kind == 'not':
        inner = cond(node['condition'], indent + 2)
        return "{\n" + ' ' * (indent + 2) + "kind: 'not',\n" + ' ' * (indent + 2) + 'condition: ' + inner + ',\n' + pad + '}'
    # all / any
    inner_pad = ' ' * (indent + 2)
    child_pad = ' ' * (indent + 4)
    parts = [f'{child_pad}{cond(child, indent + 4)},' for child in node['conditions']]
    return "{\n" + inner_pad + f"kind: '{kind}',\n" + inner_pad + 'conditions: [\n' + '\n'.join(parts) + '\n' + inner_pad + '],\n' + pad + '}'


def effect(node):
    kind = node['kind']
    if kind == 'incrementVariable':
        return f"{{ kind: 'incrementVariable', variable: {q(node['variable'])}, amount: {node['amount']} }}"
    if kind == 'setVariable':
        value = node['value']
        rendered = q(value) if isinstance(value, str) else str(value).lower() if isinstance(value, bool) else str(value)
        return f"{{ kind: 'setVariable', variable: {q(node['variable'])}, value: {rendered} }}"
    if kind == 'unsetVariable':
        return f"{{ kind: 'unsetVariable', variable: {q(node['variable'])} }}"
    if kind == 'discoverClue':
        clue = CLUE_CONST.get(node['clueId'])
        return f"{{ kind: 'discoverClue', clueId: {('C.' + clue) if clue else q(node['clueId'])} }}"
    raise SystemExit('unknown effect ' + kind)


def outcome(node):
    kind = node['type']
    if kind == 'transition':
        return f"{{ type: 'transition', targetSceneId: S.{SCENE_CONST[node['targetSceneId']]} }}"
    if kind == 'ending':
        return f"{{ type: 'ending', endingId: CHAPTER1_ENDING.{ENDING_CONST[node['endingId']]} }}"
    return f"{{ type: 'failure', failureId: CHAPTER1_FAILURE.{FAILURE_CONST[node['failureId']]} }}"


def scene_block(scene):
    lines = ['  {']
    lines.append(f"    id: S.{SCENE_CONST[scene['id']]},")
    lines.append(f"    title: {q(scene['title'])},")
    if 'backgroundAssetId' in scene:
        lines.append(f"    backgroundAssetId: {q(scene['backgroundAssetId'])},")
    lines.append('    narration: [')
    for paragraph in scene['narration']:
        lines.append(f'      {q(paragraph)},')
    lines.append('    ],')
    if 'timedDecision' in scene:
        timed = scene['timedDecision']
        lines.append('    timedDecision: {')
        lines.append(f"      durationMs: {timed['durationMs']},")
        lines.append(f"      defaultChoiceId: {q(timed['defaultChoiceId'])},")
        lines.append('    },')
    lines.append('    choices: [')
    for choice in scene['choices']:
        lines.append('      {')
        lines.append(f"        id: {q(choice['id'])},")
        lines.append(f"        label: {q(choice['label'])},")
        lines.append(f"        outcome: {outcome(choice['outcome'])},")
        if 'condition' in choice:
            lines.append('        condition: ' + cond(choice['condition'], 8) + ',')
        if choice.get('effects'):
            lines.append('        effects: [')
            for e in choice['effects']:
                lines.append('          ' + effect(e) + ',')
            lines.append('        ],')
        lines.append('      },')
    lines.append('    ],')
    lines.append('  },')
    return '\n'.join(lines)


# --------------------------------------------------------------- overrides --
# The design input is authoritative for everything except where the repository
# rules force a correction. Each entry states why, so the correction is not lost
# the next time this script runs.
OVERRIDES = {
    # The final interaction must be spatially plausible: Kian is in the service
    # yard, not standing next to the stranger. The line is the internal phone by
    # the exit, which the previous scene already established.
    'ch1-ending-connection': {
        'narration': {
            0: 'نام نوید بعد از هشت سال دوباره از ذهن کیان به زبان می‌آید. صدای مرد از گوشیِ داخلیِ کنار در می‌آید؛ آن سوی خط، در برابر این نام مکث می‌کند؛ مکثی که نه تأیید است و نه انکار.',
        },
    },
}

# Choice labels stay in the voice the rest of the chapter uses: the player's own
# action ("... می‌کنم"), never a description of what Kian is doing ("... می‌کنی").
LABEL_OVERRIDES = {
    'rehearse-in-your-head': 'جزئیات نقشه را در ذهن مرور می‌کنم.',
    'go-back-to-the-bed': 'به تخت برمی‌گردم و ذهنم را آرام می‌کنم.',
    'ask-who-he-is': 'دربارهٔ هویت مرد پرس‌وجو می‌کنم.',
    'press-for-a-name': 'اصرار می‌کنم هویتش را آشکار کند.',
    'ask-what-he-wants': 'انگیزهٔ واقعی مرد را جویا می‌شوم.',
    'show-him-the-record': 'با جزئیات پرونده او را روبه‌رو می‌کنم.',
}

for scene in story['scenes']:
    for choice in scene['choices']:
        if choice['id'] in LABEL_OVERRIDES:
            choice['label'] = LABEL_OVERRIDES[choice['id']]

for scene_id, patch in OVERRIDES.items():
    for key, paragraphs in patch.items():
        for index, text in paragraphs.items():
            scenes[scene_id][key][index] = text

GROUPS = {
    'scenes.onset.ts': (
        """/**
 * Chapter 1 — Act I: the cell, the stranger at the door, and the last look
 * around before the corridor.
 *
 * All text is third-person narrator prose about Kian: no dialogue windows, no
 * speech marks around anyone's words, no first-person narrator. Indirect speech
 * only, so the narration never turns into a conversation.
 *
 * Every choice is declarative: a condition (when it is available at all) and a
 * list of effects. Nothing here decides what happens — the engine does, from the
 * history this file only describes.
 */""",
        [
            'ch1-cell-dawn', 'ch1-cell-rehearsal', 'ch1-cell-bar', 'ch1-cell-listen',
            'ch1-stranger-arrives', 'ch1-silence', 'ch1-stranger-who', 'ch1-stranger-threat',
            'ch1-leaving-cell', 'ch1-cell-search', 'ch1-note',
        ],
        'onsetScenes',
    ),
    'scenes.routes.ts': (
        """/**
 * Chapter 1 — Act II: the corridor, the office, the service route and the
 * steel door.
 *
 * This is where state actually bites. Suspicion decides whether a passing torch
 * simply moves on or stops; composure decides whether Kian can wait a scene out;
 * route knowledge decides whether the map he spent six months memorising is the
 * only way through; and plan integrity decides how many retreats are left.
 */""",
        [
            'ch1-corridor-first', 'ch1-office-entry', 'ch1-office-overheard', 'ch1-office-desk',
            'ch1-office-ledger', 'ch1-contradiction-office', 'ch1-cafeteria', 'ch1-service-entry',
            'ch1-service-trolley', 'ch1-corridor-mid', 'ch1-locked-door', 'ch1-door-attempt',
            'ch1-guard-pass', 'ch1-guard-search', 'ch1-forced-door-noise', 'ch1-alternative-route',
        ],
        'routeScenes',
    ),
    'scenes.finale.ts': (
        """/**
 * Chapter 1 — Act III: the archive, the internal phone and the yard.
 *
 * The three endings are reached from here, and each is gated by what Kian
 * actually has: the archive gives evidence, the phone gives a contact channel
 * (and a claim, which is not proof), and the yard gives the last decision. A
 * player with nothing still has the plain escape: no ending is a reward for
 * grinding, and none of the three is a trap.
 */""",
        [
            'ch1-records-alcove', 'ch1-record-pull', 'ch1-schedule-file', 'ch1-phone',
            'ch1-phone-talk', 'ch1-final-approach', 'ch1-ending-plan', 'ch1-ending-evidence',
            'ch1-ending-connection', 'ch1-ending-thin',
        ],
        'finaleScenes',
    ),
}

for filename, (header, ids, export_name) in GROUPS.items():
    body = '\n\n'.join(scene_block(scenes[sid]) for sid in ids)
    body_text = body
    names = ['CHAPTER1_CLUE as C']
    if 'CHAPTER1_ENDING.' in body_text:
        names.append('CHAPTER1_ENDING')
    if 'CHAPTER1_FAILURE.' in body_text:
        names.append('CHAPTER1_FAILURE')
    names.append('CHAPTER1_SCENE as S')
    imports = (
        "import type { SceneDefinition } from '../../engine';\n"
        "import { " + ', '.join(names) + " } from './ids';\n"
    )
    text = header + '\n' + imports + f"\nexport const {export_name}: readonly SceneDefinition[] = [\n{body}\n];\n"
    (ROOT / 'src/story/content/chapter1' / filename).write_text(text, encoding='utf8')
    print('wrote', filename, len(text.splitlines()), 'lines')

# Notes for the hand edits that follow (ids, clue registry, variable hints).
print('\nnew scene ids to register in ids.ts:')
for scene_id, const in SCENE_CONST.items():
    print(f'  {const}: {scene_id!r}')
print('\nclue registry:')
for clue in story['clues']:
    print('  ', CLUE_CONST[clue['id']], clue['label'], '|', clue['detail'])
print('\nvariable hints:')
for name, meta in story['variableMeta'].items():
    print('  ', name, meta['label'], '|', meta.get('hint'))
print('\nfailures:')
for failure in story['failures']:
    print('  ', FAILURE_CONST[failure['id']], failure['summary'])
