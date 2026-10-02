# A preprint server labels an unfinished submission "Production", not "Incomplete", in the lists and the workflow header

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#364` for `pkp/pkp-lib#7495` · [0034beaf80](https://github.com/pkp/ui-library/commit/0034beaf8079b3c8ab2df0aba6ee5dac5cb8b28f) · 2024-06-18 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U24 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#ops3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, a submission its author began and never finished
is labelled "Production", in the production colour. A submitted
preprint that is not yet posted carries the same label, so the two
cannot be told apart by it. The label shows in the Stage column
of the author's My Submissions and of the editorial dashboard, and in
the bubble under the title of the workflow panel. A journal or press
labels such a submission "Incomplete".

Nothing is lost: the row still offers "Complete submission" and the
wizard reopens from it. That button is the only thing that tells a
draft from a submitted preprint in a list, and the workflow panel's
header gives no sign at all.

## Impact

- **Lost**: a manager or moderator scanning "Active submissions",
  which lists drafts among the submitted preprints, reads a draft as a
  preprint ready to be moderated. The draft cannot be posted by
  mistake: its panel offers the manager "Post the preprint" and
  "Decline Submission", and "Post the preprint" answers "Workflow
  access for incomplete submission is restricted."
- **Who**: every author with a draft and every manager or moderator
  who lists submissions.
- **Way round**: in a list, the row's button. A journal or press also
  has an "Incomplete submissions" view; a preprint server has none.
  The workflow panel has no way round.

Low: a wrong label, and every task still gets done. A draft read as a
submitted preprint costs a refused "Post the preprint", not a posted
draft.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (context `publicknowledge`).
  Nothing else: `ccorino` is an author and `dbarnes` a manager on
  "Public Knowledge Preprint Server".

1. Sign in as `ccorino`.
2. Open "Make a Submission" (`/index.php/publicknowledge/en/submission`),
   type the title "u24d draft", choose the language "English", tick the
   requirement boxes and press "Begin Submission". The wizard opens;
   leave it as it is.
3. Open My Submissions
   (`/index.php/publicknowledge/en/dashboard/mySubmissions`) and read
   the Stage column of the "u24d draft" row.
4. Sign out and sign in as `dbarnes`. Open "Active submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?currentViewId=active`),
   type "u24d draft" in the search box above the list and press Enter.
   Read the row's Stage column.
5. Type the address
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=20`
   (20 is the draft's number on a fresh dataset) and read the bubble
   under the title of the panel that opens. A draft's panel opens by
   typed address only: its row offers no "View".

**Expected**: "Incomplete", with the dot colour of an incomplete
submission, in steps 3, 4 and 5.

**Observed**: "Production", with the production stage's dot, in all
three. Both rows offer "Complete submission" and nothing else. The
panel's header reads "20 Corino / u24d draft / Production", with
"Preview", "Activity Log" and "Library".

The same steps on a journal (OJS, `ccorino`, where the draft is
number 21) and on a press (OMP, `aclark`, number 19) show "Incomplete"
in all three places.

## Cause

The bubble's colour comes from `useSubmission().getExtendedStage()`
(`lib/ui-library/src/composables/useSubmission.js`, line 246 on
`main`), and its text from `getExtendedStageLabel()` in the same file,
which calls it. `getExtendedStage()` returns `ExtendedStages.INCOMPLETE` only inside the
`WORKFLOW_STAGE_ID_SUBMISSION` case of its switch on the active stage:

```js
switch (activeStage.id) {
	case pkp.const.WORKFLOW_STAGE_ID_SUBMISSION:
		return submission.submissionProgress
			? ExtendedStages.INCOMPLETE
			: ExtendedStages.SUBMISSION;
```

A preprint server has no Submission stage. OPS's
`APP\migration\install\SubmissionsMigration` sets the `stage_id`
default to `WORKFLOW_STAGE_ID_PRODUCTION`, so a draft is created in
Production with the status queued. It falls through to the Production
case and gets `PRODUCTION_QUEUED`, the label "Production"
(`manager.publication.productionStage`). The rest of the dashboard
code treats a set `submissionProgress` as "draft" without looking at
the stage; this function does not.

The function arrived with the new dashboard in `pkp/ui-library#364`.
Up to and including 3.4 the list's `SubmissionsListItem.vue::currentStageLabel()`
tested `submissionProgress` before it read the stage, so an OPS draft
read "Incomplete".

Reach, all through the same function:

- `DashboardCellSubmissionStage.vue`: the Stage column of every
  dashboard list, My Submissions and the editorial dashboard (on
  screen).
- `workflowStore.js` (`extendedStage`, `stageLabel`), shown by
  `WorkflowPage.vue`: the bubble in the workflow panel's header (on
  screen).
- No caller besides these two and `getExtendedStageLabel()` (checked
  in the code). The functions that build the row's "Complete
  submission" action
  (`src/pages/dashboard/composables/useDashboardConfigEditorialActivity.js`)
  already test `submissionProgress` without the stage, with the
  comment "Not checking for submission stage, as OPS does not have
  it".

## Proposed fix

Test `submissionProgress` before the switch, as the dashboard's
editorial-activity functions do, and after the Declined test, the
order 3.4 had
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-draft-labelled-production/fix.diff)):

```diff
--- a/lib/ui-library/src/composables/useSubmission.js
+++ b/lib/ui-library/src/composables/useSubmission.js
@@ -248,11 +248,14 @@
 		if (submission.status === pkp.const.submission.STATUS_DECLINED) {
 			return ExtendedStages.DECLINED;
 		}
+		// A draft is incomplete whatever stage it sits in: OPS creates
+		// every submission in the production stage
+		if (submission.submissionProgress) {
+			return ExtendedStages.INCOMPLETE;
+		}
 		switch (activeStage.id) {
 			case pkp.const.WORKFLOW_STAGE_ID_SUBMISSION:
-				return submission.submissionProgress
-					? ExtendedStages.INCOMPLETE
-					: ExtendedStages.SUBMISSION;
+				return ExtendedStages.SUBMISSION;
```

The label key and colour for `incomplete` already exist. Tried on
`main` on OJS, OMP and OPS: the OPS draft reads
"Incomplete" in the three places of the Steps, OJS and OMP drafts
still do, and submissions that are not drafts keep their labels on
all three apps (Submission, the review rounds, Copyediting, Production,
Published, Declined).

**Alternatives**

- Creating OPS drafts in a Submission stage: OPS has no such stage, and
  it would change stored data and the stage access rules for a label.
- An OPS-only condition in one of the two components
  (`DashboardCellSubmissionStage.vue` or the OPS workflow config):
  leaves the other screen wrong.

**What goes with it**

- No stored data is wrong, and no API or hook changes.
- 3.5: the same change applies to `stable-3_5_0`'s copy of the function
  (line 251 there; the line above reads `pkp.const.STATUS_DECLINED`, so
  the diff's context differs by that one line).
- Guard: a unit test of `getExtendedStage()` in ui-library (the
  composable has none) with a draft whose active stage is Production,
  and an e2e scenario here reading the draft's bubble on a preprint
  server.

Small: one condition moved in one function, with a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-draft-labelled-production/walk.js),
  run on a dataset install with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-draft-labelled-production/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes the Steps on
  OPS, and on OJS and OMP as the control (OMP's author is `aclark`),
  and reads each bubble's label and the colour class of its dot.
  `WALK=nb` is the neighbour check: `dbarnes` opens the panel of
  dataset submissions in every other state (OJS 4, 7, 3, 5, 17, 18; OMP
  3, 6, 2, 1, 4, 5; OPS 1, 2, 4) and reads the bubble. `WALK=act`
  (OPS) takes steps 1 and 2, then `dbarnes` opens the draft's panel
  and presses "Post the preprint": an "Error" window, "Workflow access
  for incomplete submission is restricted.", "OK". The panel offers
  the same buttons with the fix applied.
- Walked on `main` and on `stable-3_5_0`, all three apps, PostgreSQL,
  the dataset of pkp/datasets e8dafbc (2026-10-02). OPS read
  "Production" (`bg-stage-production`) three times on both lines; OJS
  and OMP read "Incomplete" (`bg-stage-incomplete-submission`). The
  fault does not depend on the database.
- Fix trial on `main`, all three apps (`node bin/try-fix.js apply
  <fix.diff> ojs omp ops`, then the walk and `WALK=nb`): the three
  apps read "Incomplete" in the Steps' three places, and `WALK=nb`
  read the same labels and colours with the fix in and out.
- Tips. `main`: ojs b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), omp 3b0ecf794c and ops c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5). `stable-3_5_0`: ojs 091fb65453, omp
  9c5e24246c, ops 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883). `stable-3_4_0`: ops acd8ae704b, lib/ui-library ee684b34.
  `stable-3_3_0`: ops c5532e2161, lib/ui-library 96959f9e.
- Code reads. `main` and 3.5: the Cause's files, the same on both
  lines. 3.4 and 3.3:
  ui-library's `SubmissionsListItem.vue::currentStageLabel()` returns
  `submissions.incomplete` when `submissionProgress` is set, before the
  stage is read; commit 0034beaf80 is on neither branch. 3.4's OPS
  migration sets the same Production default.
- Introduced: `git blame` on the `INCOMPLETE` lines of
  `getExtendedStage()` gives 0034beaf80, the commit that added the
  function; `commits/0034beaf80…/pulls` names `pkp/ui-library#364`
  ("I7495 activity").
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/ops and
  pkp/ui-library, issues and PRs, open and closed: "incomplete
  submission production stage label OPS", "incomplete preprint
  dashboard Production", "OPS incomplete submissions view dashboard",
  "getExtendedStage". No match; `pkp/ops#45` (2020) discusses the
  missing Submission stage in OPS, not this label.
- The list side is also noted in spec U22
  [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U22-my-submissions.md#ops1),
  a question about the missing "Incomplete submissions" view, which
  this report does not cover.
- Not driven: 3.4 and 3.3 (code only); the author opening the panel
  of their own draft, which reads the same store value; "Decline
  Submission" on a draft; `WALK=act` on 3.5.
