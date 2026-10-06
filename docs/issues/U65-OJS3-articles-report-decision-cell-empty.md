# "Articles Report" leaves "Editor Decision" empty for skipped reviews, new rounds, reverted declines and stage moves

- **Severity** medium
- **Effort** medium
- **Kind** defect (the older gaps never worked; the part new on `main`, publishing's unnamed decisions, is a regression from `pkp/pkp-lib#12799`)
- **Affects**
  - main: OJS, OMP (OMP: the decisions publishing records)
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; "New Review Round" and "Revert Decline" only)
- **Introduced** older gaps: not traced; present since at least OJS [f3925a3d23](https://github.com/pkp/ojs/commit/f3925a3d234cae8f89d5f157e3bc2a4ef2f865f9) (2020-03-27). Publishing's decisions on `main`: `pkp/pkp-lib#12881` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-09 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U65 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#ojs3), [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "Articles Report" that a journal manager or editor downloads from
Statistics › "Reports" lists each editor's decisions in "Editor
Decision" / "Date decided" pairs. Several decisions get a date but an
empty name: "Accept and Skip Review", "Revert Decline", "New Review
Round", and the moves back a stage ("Move to Review", "Move To
Copyediting"). Nothing in the file or on the page says a name is
missing.

New on `main`: publishing an article now records a "Move to Done"
decision, and unpublishing it a "Return to Workflow", and neither has a
name in the file either. So every published article's line gains an
empty cell, and the upgrade to this version adds one to every article
already published. A press's "Monograph Report" leaves these new
decisions unnamed in the same way.

Anyone counting decisions from the file (how many submissions were
accepted, how many went to a second round) gets wrong numbers.

## Impact

- **Lost**: the name of each of these decisions in the export; the
  decisions themselves are stored correctly and shown on screen.
- **Who**: journal managers and editors who download the report. The
  older gaps reach journals that skip review, revert declines, open
  second rounds or move submissions back; on `main`, every journal and
  press that publishes.
- **Way round**: read each submission's decisions on screen, one
  submission at a time.

Medium: one column of an export used for the journal's own counts is
silently empty for ordinary decisions, with a slow way round on screen.
No other part of the app reads the file, so the damage stops at those
counts. `main` widens the reach to every published article but not the
kind of loss, so it stays medium there too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, context `publicknowledge`.
  Nothing else is needed.

1. Sign in as `dbarnes`.
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (Submission stage).
   Press "Accept and Skip Review", "Continue" through its pages and
   "Record Decision".
3. Open submission 18, "Self-Organization in Multi-Level Institutions in
   Networked Environments" (declined). Press "Revert Decline" and
   "Record Decision".
4. Open submission 13, "Hydrologic Connectivity in the Edwards Aquifer
   between San Marcos Springs and Barton Springs during 2009 Drought
   Conditions" (Review). Press "Create New Review Round", "Continue" and
   "Record Decision".
5. Open submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence" (Copyediting). Press
   "Move to Review" [3.5: "Cancel Copyediting"] and "Record Decision".
6. Open submission 5, "Genetic transformation of forest trees"
   (Production). Press "Move To Copyediting" [3.5: "Back To
   Copyediting"] and "Record Decision".
7. Open Statistics › "Reports"
   (`/index.php/publicknowledge/en/stats/reports`) and press "Articles
   Report".
8. In the downloaded "articles-JPKJPK-<date>.csv", read the lines of
   submissions 4, 18, 13, 3 and 5, and of the dataset's published
   submissions 1 and 17: the "Editor Decision n (Editor 1)" and "Date
   decided n (Editor 1)" columns, where "Editor 1" is Daniel Barnes.

**Expected**: each decision is named: "Accept and Skip Review" (4),
"Revert Decline" (18), "New Review Round" (13), "Move to Review" (3),
"Move To Copyediting" (5), and the "Move to Done" and "Return to
Workflow" decisions the dataset recorded when it published and
unpublished 1 and 17.

**Observed**: the "Editor Decision" cell of each of these decisions is
empty, and its "Date decided" cell holds the date (for 4, decision 1
reads `""` and `2026-10-03 00:53:30`). The earlier decisions on the same
lines are named ("Send for Review", "Accept Submission", "Send To
Production", "Decline (Pre-review)"). In the whole file, 13 cells have
a date and no name: three on submission 1, five on 17, and the five
from steps 2–6.

[OMP, `main`: in the "Monograph Report" of the same dataset, the line of
submission 14, "From Bricks to Brains: The Embodied Cognitive Science of
LEGO Robots" (published, Daniel Barnes assigned), has "Editor Decision
5 (Editor 1)" empty and "Date decided 5 (Editor 1)" filled: the "Move to
Done" recorded when it was published.]

## Cause

`ArticleReportPlugin::getDecisionMessage()` (OJS
`plugins/reports/articles/ArticleReportPlugin.php`, line 360) turns a
stored decision into its name with a hand-kept `switch` of eleven
`Decision::*` constants, and its `default` returns `''`. Every decision
type not on that list is written as an empty cell beside a filled date.
The list predates most of today's decision types and was never extended
as they were added:

- `NEW_EXTERNAL_ROUND`, recorded as its own decision since
  `pkp/pkp-lib#4042` (2020, OJS commit f3925a3d23), and `REVERT_DECLINE`
  (`pkp/pkp-lib#5819`, 2020);
- `REVERT_INITIAL_DECLINE`, from the decision refactor of
  `pkp/pkp-lib#7265` (2022). That refactor rewrote the list's eleven
  constants one for one and added no new ones. Step 3 records this type,
  because it reverts a pre-review decline;
- `SKIP_EXTERNAL_REVIEW`, `BACK_FROM_PRODUCTION`, `BACK_FROM_COPYEDITING`
  and `CANCEL_REVIEW_ROUND`, from `pkp/pkp-lib#2890` (b1c1ac5df4, 2022);
- `MOVE_TO_DONE`, `RETURN_TO_WORKFLOW` and `RETURN_TO_DONE`, from
  `pkp/pkp-lib#12799` (PR `pkp/pkp-lib#12881`, d52aa4c84b, 2026-06-09).
  `ApplyDoneWorkflowStage::handle()` records `MOVE_TO_DONE` when a
  publication is published, the submission has at least one published
  version of record and it is not yet in Done. It records
  `RETURN_TO_WORKFLOW` when an unpublish leaves no published version of
  record and the submission is in Done. Publishing a further version of
  a submission already in Done records nothing. The 3.6 upgrade
  `I12799_MovePublishedSubmissionsToDone` writes a `MOVE_TO_DONE` for
  every published submission not yet in Done, under its first assigned
  editor (else a journal manager or the site administrator). So on
  `main` every published article holds at least one. `RETURN_TO_DONE`
  is the "Return to Done" action on a submission returned to the
  workflow while a version is still published.

Each decision type already knows its own name, `DecisionType::getLabel()`.
It is what the decision's own page (`templates/decision/record.tpl`) and
the REST API's decision `label`
(`PKP\decision\maps\Schema::mapByProperties()`) show; the workflow's
buttons have their own texts ("Create New Review Round" for the type
named "New Review Round"). The report never asks the type.

Reach:

- OMP's twin, `Report::getDecisionMessage()`
  (`plugins/reports/monographReport/Report.php`), names every type up to
  `CANCEL_INTERNAL_REVIEW_ROUND` but not the three from
  `pkp/pkp-lib#12799`, so its "Monograph Report" has the same empty
  cells on `main` (walked: submission 14). Its 3.5, 3.4 and 3.3 lists
  cover every type those versions have (code).
- OPS has no report plugins. The REST API's decision `label` and the
  decision emails' `{$decision}` (`DecisionEmailVariable`) name a
  decision through its type and are not affected (code). The other
  hand-kept `Decision::*` lists (`PKPNotificationManager`, OMP's
  `NotificationManager`, `DecisionNotifyReviewer`) choose what to do for
  a few decisions, not what to call them (code).
- No data needs repair.

## Proposed fix

Keep the eleven names the report has always written, and name every
other decision by its type's own label, the way the REST API names a
decision
([`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-decision-cell-empty/fix-ojs.diff)
against the OJS root,
[`fix-omp.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-decision-cell-empty/fix-omp.diff)
against the OMP root):

```diff
-    public function getDecisionMessage($decision)
+    public function getDecisionMessage($decision, ?Submission $submission = null)
 ...
             default:
-                return '';
+                // Any other decision type (Decision::types) by its own label, as the REST API names a decision
+                return Repo::decision()->getDecisionType((int) $decision)?->getLabel(submission: $submission) ?? '';
```

`display()` already loads each submission and its decisions in its first
loop; the fix names each decision there, with that submission, and the
row loop reads the stored name (`'decisionNames'`), so no submission is
loaded twice. In OMP's `Report::getDecisionMessage()`, where the
submission is at hand:

```diff
-            default => ''
+            null => '',
+            default => Repo::decision()->getDecisionType($decision)?->getLabel(submission: $this->submission) ?? ''
```

The submission is passed because "Move to Review" and "Move to
Submission" are one decision type, `BACK_FROM_COPYEDITING`, whose label
`BackFromCopyediting::getLabel()` works out from whether the submission
has a review round now, not when the decision was made. An old move can
therefore be misnamed only if the submission's review rounds changed
afterwards: a move back to Submission followed by a first review round
later reads "Move to Review". The stored decision does not record the
stage it moved to, so the REST API's label has the same limit, and an
exact name would need that stored; for a report of decisions this is a
rare, small error against an empty cell today. The fix covers the ten
types missing today, any type a plugin adds through the
`Decision::types` hook, and any added later.

Tried on `main`, OJS and OMP: after steps 1–8 every decision in both
files is named as Expected says. As a control, each report downloaded
from the unchanged dataset differs with the fix in and out only in the
cells that were empty (eight in OJS's file, one in OMP's).

**Alternatives**

- Add the missing `case`s to each list, as OMP's twin does: it fixes
  today's file, but the next decision type empties the cells again, as
  each one since 2020 has.
- Replace both lists with `getLabel()` alone: one source for every name,
  but the eleven names the file has always written would change
  ("Recommendation: Accept Submission" would read "Recommend Accept",
  "Decline (Pre-review)" would read "Decline Submission"), which breaks
  anyone comparing files over time. A product decision, not this fix.

**What goes with it**

- No API, hook or screen changes; the columns and their order stay the
  same, and the eleven names written today are unchanged.
- Backport: on `stable-3_5_0` and `stable-3_4_0`, `getLabel()` takes
  only a locale (the submission parameter came with
  `pkp/pkp-lib#12798`), so the backport calls `getLabel()` without
  `submission:` and OMP needs nothing there. 3.3 has no decision types;
  its list would need two more `case`s.
- Test: the report plugins have no unit tests. In OJS, a unit test that
  every type in `Repo::decision()->getDecisionTypes()` gets a non-empty
  name from the public `getDecisionMessage()` would have caught each
  addition. OMP's method is private, so there the guard is an
  end-to-end check: record a decision, download the "Monograph Report"
  and require no "Date decided" without a name (the walk in Evidence
  does this for both apps).

Medium: a few lines, but in two app repositories (OJS's and OMP's
report plugins), with a test for each.

## Evidence

- Walk script (in this repository):
  [`shared/playwright/checks/issues/articles-report-decision-cell-empty/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/articles-report-decision-cell-empty/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–8 on OJS and reads
  the OMP report, on installs freshly loaded from the default dataset
  (3.5: with `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=issues-ir12 PROBE_AGENT=ir12 node bin/probe.js ojs,omp shared/playwright/checks/issues/articles-report-decision-cell-empty/walk.js`.
  With the argument `neighbour`, it only downloads each report from the
  unchanged dataset (the control above).
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/articles-report-decision-cell-empty/fix-ojs.diff ojs` and
  `… fix-omp.diff omp`.
- Branch tip commits checked: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a), OMP `main`
  [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262) (lib/pkp
  3dc90c81a6); `stable-3_5_0` OJS
  [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6),
  OMP [9c5e24246c](https://github.com/pkp/omp/commit/9c5e24246cbb18e7fdb261be7ddceffdc406ecc9) (lib/pkp
  cf3f984335); `stable-3_4_0` OJS c1827e3527, OMP 0aec65441f (lib/pkp
  9e41f10273); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836 (lib/pkp
  ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02), PostgreSQL.
  The fault does not depend on the database.
- Walked: `main` and 3.5, OJS and OMP, on 2026-10-03. On 3.5 the five
  decisions of steps 2–6 are unnamed in the same way; the dataset there
  records no "Move to Done", so submissions 1 and 17 have none, and
  OMP's "Monograph Report" names every decision it holds.
- Code reads: `getDecisionMessage()` on the four OJS branches (3.5's and
  3.4's are `main`'s eleven cases; 3.3's `ArticleReportPlugin.inc.php`
  has the same eleven over the `SUBMISSION_EDITOR_*` constants, and
  misses `SUBMISSION_EDITOR_DECISION_NEW_ROUND` (16, OJS
  `EditorDecisionActionsManager`) and
  `SUBMISSION_EDITOR_DECISION_REVERT_DECLINE` (17, lib/pkp
  `PKPEditorDecisionActionsManager`); 3.3 skips review with
  `SUBMISSION_EDITOR_DECISION_ACCEPT`, which is named). The constants
  in lib/pkp `classes/decision/Decision.php` (32 on 3.4 and 3.5, 35 on
  `main`). OMP's `Report::getDecisionMessage()` on `main`, 3.5 and 3.4
  and `MonographReport.inc.php` on 3.3. `ApplyDoneWorkflowStage` and the
  3.6 upgrade `I12799_MovePublishedSubmissionsToDone` (lib/pkp), which
  both write `MOVE_TO_DONE`.
- Introduced: `git blame` on the `default: return '';` line gives
  665ed1f925 (2021, the PSR-12 reformat); the list itself is older
  (aafe6ac72c, 2008, and the constants' rename in 63bef92fa3). The
  oldest decision type the list misses is `NEW_ROUND`, added by
  OJS commit f3925a3d23 (`pkp/pkp-lib#4042`). The three `main` types
  came with pkp-lib d52aa4c84b (PR `pkp/pkp-lib#12881`, merged
  2026-06-29) and OJS a9282937f8, which adds them to OJS's
  `Repository::getDecisionTypes()`.
- The upgrade's and `ApplyDoneWorkflowStage`'s `MOVE_TO_DONE` were read
  in the code; only the dataset's own publish decisions (submissions 1,
  17, and OMP 14) were seen in a file.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp on 2026-10-03,
  using the words "articles report" with "decision" and "blank", "new
  review round" with "report", "Move to Done" with "report", "monograph
  report" with "decision", and the names `getDecisionMessage` and
  `ArticleReportPlugin`. `pkp/pkp-lib#8802` (open, OJS 3.3.0-6:
  decision columns "inaccurate" or "missing", in the wrong order; no
  steps, no cause) and `pkp/pkp-lib#4725` (closed as outdated: decision
  columns with blank dates) are about the order and grouping of the
  decision columns, not unnamed decisions.
- Unverified: "Cancel Review Round" was not walked; the fix names it
  through its type like the others.
