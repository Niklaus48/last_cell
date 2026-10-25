/**
 * Chapter 1 — «شش ماه سکوت» — declarative identity of the content.
 *
 * Only ids and registry data live here. Every string is Persian narrative text;
 * every constant is a stable technical id. Nothing in this file is executable.
 *
 * The clue registry deliberately keeps the distinction the story depends on:
 * a discovered clue is *what Kian has in hand*, never a conclusion. Claims made
 * by the stranger are recorded as claims (`telephone_date_claim`), and the
 * narrator never upgrades them into proof.
 */
import type { ClueDefinition, ClueId } from '../../engine';

export const CHAPTER1_SCENE = {
  cellDawn: 'ch1-cell-dawn',
  cellBar: 'ch1-cell-bar',
  cellListen: 'ch1-cell-listen',

  strangerArrives: 'ch1-stranger-arrives',
  silence: 'ch1-silence',
  strangerWho: 'ch1-stranger-who',
  strangerThreat: 'ch1-stranger-threat',

  leavingCell: 'ch1-leaving-cell',
  cellSearch: 'ch1-cell-search',
  note: 'ch1-note',
  corridorFirst: 'ch1-corridor-first',

  officeEntry: 'ch1-office-entry',
  officeDesk: 'ch1-office-desk',
  officeLedger: 'ch1-office-ledger',
  contradictionOffice: 'ch1-contradiction-office',

  cafeteria: 'ch1-cafeteria',
  serviceEntry: 'ch1-service-entry',
  serviceTrolley: 'ch1-service-trolley',

  corridorMid: 'ch1-corridor-mid',
  lockedDoor: 'ch1-locked-door',
  doorAttempt: 'ch1-door-attempt',
  guardPass: 'ch1-guard-pass',
  alternativeRoute: 'ch1-alternative-route',

  recordsAlcove: 'ch1-records-alcove',
  recordPull: 'ch1-record-pull',
  phone: 'ch1-phone',
  phoneTalk: 'ch1-phone-talk',

  finalApproach: 'ch1-final-approach',
  endingPlan: 'ch1-ending-plan',
  endingEvidence: 'ch1-ending-evidence',
  endingConnection: 'ch1-ending-connection',
  endingThin: 'ch1-ending-thin',
} as const;

export const CHAPTER1_ENDING = {
  /** Ending A — ambiguous truth. Always reachable. */
  ambiguousTruth: 'ch1-ending-a-ambiguous-truth',
  /** Ending B — contradictory dossier. Requires the death-record contradiction. */
  contradictoryDossier: 'ch1-ending-b-contradictory-dossier',
  /** Ending C — a possible connection. Requires evidence *and* choices. */
  possibleConnection: 'ch1-ending-c-possible-connection',
} as const;

export const CHAPTER1_CLUE = {
  datedNote: 'dated_note',
  officeRecordDiscrepancy: 'office_record_discrepancy',
  scheduleReference: 'schedule_reference',
  corridorInitials: 'corridor_initials',
  telephoneDateClaim: 'telephone_date_claim',
  deathRecordContradiction: 'death_record_contradiction',
} as const satisfies Readonly<Record<string, ClueId>>;

export const CHAPTER1_CHECKPOINT = {
  /** The moment the escape attempt actually starts. */
  cellExit: 'cp-ch1-cell-exit',
  /** A safe point reached right after leaving the cell. */
  corridorFirst: 'cp-ch1-corridor-first',
  /** Just before the high-risk threshold: the locked door. */
  doorApproach: 'cp-ch1-door-approach',
} as const;

export const CHAPTER1_FAILURE = {
  /** Pressing the pick while a guard is within earshot. Recoverable. */
  caughtAtDoor: 'f-ch1-caught-at-door',
  /** Slipping the transfer page out of a folder that is audited nightly. */
  officeAlarm: 'f-ch1-office-alarm',
} as const;

/**
 * The six clues of Chapter 1. Each is evidence of a *narrow* thing:
 * an inconsistency, a reference number, a set of scratches or a claim.
 */
export const chapter1Clues: readonly ClueDefinition[] = [
  {
    id: CHAPTER1_CLUE.datedNote,
    label: 'یادداشت تاریخ‌دار',
    detail:
      'برگه‌ای تاشده با یک جمله و یک شمارهٔ ارجاع؛ نه امضا دارد، نه نشانی از نویسنده.',
  },
  {
    id: CHAPTER1_CLUE.officeRecordDiscrepancy,
    label: 'ناهم‌خوانی در دفتر انتقال',
    detail:
      'در دفتر انتقال، سطری خالی مانده که باید نام داشته باشد، و تاریخش با روال عادی نمی‌خواند.',
  },
  {
    id: CHAPTER1_CLUE.scheduleReference,
    label: 'شمارهٔ ارجاع دوم',
    detail: 'حاشیهٔ تابلوی برنامهٔ غذاخوری، شماره‌ای دارد که به برنامهٔ رسمی تعلق ندارد.',
  },
  {
    id: CHAPTER1_CLUE.corridorInitials,
    label: 'حروف K. F.',
    detail: 'دو حرف حکاکی‌شده کنار درِ فولادی راهروی خدمه؛ قدیمی، اما خوانا.',
  },
  {
    id: CHAPTER1_CLUE.telephoneDateClaim,
    label: 'ادعای تاریخ‌های ناسازگار',
    detail:
      'حرفِ مردِ پشت تلفن: در سوابق انتقال، تاریخ‌ها با هم نمی‌خوانند. این یک ادعاست، نه سند.',
  },
  {
    id: CHAPTER1_CLUE.deathRecordContradiction,
    label: 'تناقض در گزارش مرگ',
    detail:
      'در پروندهٔ قدیمی، تاریخ امضای گزارش مرگ پس از تاریخ انتقال ثبت شده است؛ دو تاریخ که نمی‌توانند هر دو درست باشند.',
  },
];
