# Chapter 1 — «شش ماه سکوت» — narrative consistency review

Review of the shipped Chapter 1 content (`src/story/content/chapter1/`) against the
requirements it was written for. Every row below was checked against the story data and is
covered by an automated test where a test can express it; the test file is named so the claim
can be re-verified rather than trusted.

---

## 1. Premise and continuity

| Requirement | How the content satisfies it | Checked by |
| --- | --- | --- |
| Kian Farahmand, six months in زندان آذرخش, escape already prepared | Opens «پیش از چهار و نیم» on the execution day; the plan's condition is tracked as `planIntegrity`, spent by risky moves | `chapter1.content` (opening scene), `chapter1.playthrough` (plan spent) |
| The apparatus is never named | Narration says «مردی از آن طرف» / «سازمان» at most; no agency is named anywhere in the text | manual text review |
| Navid's fate is never settled | Three separate artefacts point in different directions: the unsigned death record, the altered schedule, the stranger's unverifiable dates. No narrator line states he lives or died | `chapter1.playthrough` (Ending B prose is a question) |
| Stranger uses Kian's real name at the cell | `ch1-stranger-arrives`: the name arrives before any introduction; Kian's reaction, not confirmation | `chapter1.playthrough` (three choices) |
| Contact is optional | A player can stay silent for the whole chapter and still reach a coherent ending | `chapter1.playthrough` («never contacts the stranger», «no clues at all») |

## 2. Narration

* **One narrator, second person.** All 86 narration paragraphs are narrated by the same
  voice; speech is reported *inside* narration (e.g. «…و بعد می‌گوید: "بالاخره روزش رسید،
  کیان."»). No speaker labels, no dialogue windows, no first-person primary narration.
  `chapter1.content` asserts no `Name:` patterns exist in any paragraph.
* **Choice labels are actions, not echoes.** Labels are first-person-singular actions
  («میلهٔ دریچهٔ هوا را دوباره امتحان می‌کنم.», «سکوت می‌کنم.») so the UI does not repeat the
  narration back at the player. `chapter1.content` asserts every label is Persian.
* **No lecturing.** The narration carries the action in the verbs; it does not repeat «تو
  می‌دانی که…» as a moralising aside, and no paragraph explains the scene's meaning to the
  player after the fact.
* **No technical leakage.** No scene id, clue id or engine term appears in narration;
  `chapter1.content` scans for `ch1-`, `cp-ch1`, `f-ch1`, clue ids.

## 3. Graph shape

* **32 scenes**, 69 choices (13 conditional). Acts I–VII, ending scenes included.
* **No dead ends.** Every scene has at least one unconditional choice; the only loop
  (`locked door → safe corner → corridor → locked door`) costs one `planIntegrity` per lap and
  closes when the plan is spent — the door can still be forced, so the player is never stuck.
  `chapter1.content` explores the full reachable state space; `chapter1.playthrough` walks the
  loop to exhaustion.
* **No unreachable scene or option.** All 32 scenes, 3 endings and 2 failures are reachable;
  every conditional choice is reachable on at least one path (exhaustive exploration).
* **No assumed visited scenes.** The chapter uses no `visitedScene` conditions at all, so a
  player who skipped the office route is never asked about it. Asserted explicitly.

## 4. Point-by-point requirement review

| # | Requirement | Status | Evidence |
| --- | --- | --- | --- |
| 1 | Silence at the first encounter reveals nothing | **Met.** `stay-silent` grants no clue, no `strangerContact`, no `strangerKnowledge`; nothing is awarded later in that branch either | `chapter1.playthrough` ×2, `chapter1.content` |
| 2 | The dated note is ambiguous, carries a date and a reference, and is only found by examining it | **Met.** Text: «اگر او را منتقل کردند، گزارش را تغییر نده.» + «۱۴ مهر» + «۴۱۷-ب»; obtained only via `pull-the-note` | `chapter1.content` (verbatim), `chapter1.playthrough` (three variants: skipped, declined, examined) |
| 3 | Two routes with *different* information | **Met.** Office → transfer ledger + erased signature (`office_record_discrepancy`); service way → altered schedule board + trolley track (`schedule_reference`). Neither route yields the other's clue | `chapter1.playthrough` ×2 |
| 4 | Routes converge while preserving state | **Met.** Both reach `ch1-corridor-mid` with their own clues and the variables earned before the split | `chapter1.playthrough` (convergence) |
| 5 | Corridor initials «K. F.» stay unexplained | **Met.** Naraion records the scratched initials and Kian's refusal to explain them; no scene names who carved them | manual text review |
| 6 | Lock/alternative/safe-point decision responds to clues, plan and suspicion | **Met.** `pick-the-bolt` needs `planIntegrity ≥ 1`, `look-for-another-way` needs `routeKnowledge ≥ 1`, `fall-back-to-the-safe-corner` needs `planIntegrity ≥ 1` and spends it, `slide-into-the-alcove` needs `guardSuspicion ≤ 1` | `chapter1.playthrough` (gating ×3) |
| 7 | Timed guard encounter with a safe default | **Met.** `ch1-door-attempt`: 8000 ms, `defaultChoiceId: 'freeze-and-observe'`, an unconditional transition (never a failure) | `chapter1.content` (timers, safe default) |
| 8 | Old telephone claim is inconsistent but unproven | **Met.** `telephone_date_claim` is recorded as *his* claim («می‌گوید») — the clue text and narration never adopt it as fact. Three contact choices: let him explain / demand something checkable / hang up | manual text review, `chapter1.playthrough` (C-gate paths) |
| 9 | Final decision and a Chapter-2 hook | **Met.** Three routes out of `ch1-final-approach`, each ending with the required hook sentence as its summary | `chapter1.playthrough` (all three endings) |
| 10 | Three tiered endings, not all visible in one run | **Met.** A = ambiguous truth (no evidence required); B = contradictory dossier (needs `death_record_contradiction`); C = possible connection (needs evidence **and** an open line to the stranger **and** limited mistakes). A finished run refuses further choices, so no second ending can follow | `chapter1.playthrough` ×8 |
| 11 | Clues only via explicit choices | **Met.** All six clues are granted by named choices (`pull-the-note`, `read-the-transfer-ledger`, `study-the-board`, `look-at-the-scratches`, `demand-something-checkable`, ledger comparison / `search-the-old-folders`) | `chapter1.content`, `chapter1.playthrough` |
| 12 | Fact / inference / claim / unknown kept apart | **Met.** Clue kind is carried in the clue's Persian detail text: the note and the ledger are *records*, the initials are *an observation*, the telephone date is *a claim*, the death record's author is *unknown* | manual text review |
| 13 | Checkpoints at meaningful points only | **Met.** Three: cell exit (start of the escape), first corridor (safe, post-cell), corridor junction (immediately before the risky door) | `chapter1.content` (placements, scarcity) |
| 14 | Recovery is real snapshot restore; no clue is invented or lost | **Met.** A clue found before the checkpoint survives; a clue found after it is rolled back with the rest of the run | `chapter1.playthrough` ×2 (`recover`) |
| 15 | No endings from raw clue counts | **Met.** B and C gate on a *specific* clue, not a count; C additionally requires a variable pair and a mistake ceiling | `chapter1.playthrough` |
| 16 | No fake choices / no hidden prerequisites | **Met.** Every option that is visible is legal now; every gated option is explained by a clue or a variable the player has just earned, and each gated scene keeps an unconditional way out | `chapter1.playthrough` (unavailable options rejected with `CHOICE_UNAVAILABLE`) |
| 17 | Recoverable failures only where logical | **Met.** Two: caught at the door (back to the pre-door junction) and the office alarm (back to the first corridor). Both are recoverable because both have a checkpoint behind them | `chapter1.playthrough` (recovery target + mismatch refusal) |
| 18 | Stranger-contact-free path still coherent | **Met.** Without contact, the telephone and the Navid question are unavailable, and the chapter closes with Ending A | `chapter1.playthrough` («never contacts the stranger») |

## 5. Known narrative limitations

* The office route's `close-the-folder` and the service route's `cross-to-the-service-door`
  earn composure at slightly different rates, so two players at the same junction can differ by
  one point of `composure`. This is intentional (the office route is quieter, the service route
  is more exposed) but it means the junction is not a canonical "same state" convergence.
* Ending C deliberately reads as a possibility, not a reunion. Its hook sentence is a
  question, and no line in it confirms Navid is alive — which is what keeps Chapter 2 open.
* The chapter does not yet use `timedDecision` at runtime (data + validation only), so the
  "12-second silence" is a design contract, not a measured experience.

---

## 6. Verified in the browser

A scripted Chromium run (Playwright, 430×900 viewport, `npm run dev`) played the office-evidence
route end to end through the real UI — title screen → cell → stranger → note → office → ledger
comparison → junction → door → guard → archive → final approach → **Ending B** — reaching the
required hook sentence with **0 console errors**. The failure screen (“دفتر بازرسی‌شده”) and its
«بازگشت به آخرین نقطهٔ امن» recovery were exercised in the same session, and a conditional option
(`search-the-old-folders`) was correctly absent once its precondition no longer held.
