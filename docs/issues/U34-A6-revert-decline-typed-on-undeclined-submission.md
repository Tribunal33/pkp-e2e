# "Revert Decline" recorded on a submission that is not declined emails the author again and can drop a revisions request

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; a second open window only, no email)
- **Introduced** `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U34 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U34-editorial-decision-recording.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

After an editor reverts a decline, the browser's Back button or a
reload brings back the "Revert Decline" page, and "Record Decision"
works a second time. A second tab where the page was already open does
the same. Each time the page closes on "Submission Reactivated", the
author receives "We have reversed the decision to decline your
submission" again, and the Activity Log records another reversal. The
editor expects a refusal, because nothing is left to revert.

The same page also opens by its address on an active submission that
was never declined. On a review round waiting for the author's
revisions, the reversal then drops the revisions request. The author
loses the "Revision required" task and "Upload revisions" and is not
told. The editor can restore the round with "Request Revisions", which
emails the author once more.

The workflow offers "Revert Decline" only on a declined submission. So
Back, a reload or a second tab only repeat a reversal the editor meant
to make. Losing a revisions request takes an address edited by hand.

## Impact

- **Lost**: the author gets a reversal email for a decline that no
  longer exists. After Back, a reload or a second tab it is a
  duplicate; on a submission never declined it is false. On a round
  waiting for revisions, the revisions request is lost and the author is
  not told.
- **Who**: authors, after an action by a journal or press manager, or by
  an assigned section or series editor or moderator allowed to record
  decisions. The editor sees "Submission Reactivated" each time. The
  submission's status and stage do not change.
- **Way round**: none for the extra email. A lost revisions request is
  restored with "Request Revisions", which emails the author again.

Low: on the paths an editor takes without meaning to (Back, a reload, a
second tab), the reversal they intended stands and the author only gets
the same email twice. Losing a revisions request needs a decision
address edited by hand. A screen or link that offered the reversal on an
active submission would make it medium.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (pkp/datasets
566bb1f, 2026-10-03). Nothing else.

The record page's address carries the decision type as `decision`:
"Revert Decline" is `decision=16` in the Submission stage (on a preprint
server, in Production) and `decision=15` on a review round, with the
round's `reviewRoundId`.

After a reversal (OJS submission 18, "Self-Organization in Multi-Level
Institutions in Networked Environments", declined, author
`vwilliamson`; OMP submission 10, "Lost Tracks: Buffalo National Park,
1909-1939", author `jbrower`; OPS submission 4, "Genetic transformation
of forest trees", declined in Production, author `ddiouf`):

1. Sign in as `dbarnes` / `dbarnesdbarnes`.
2. Open the submission's workflow,
   `/index.php/publicknowledge/dashboard/editorial?workflowSubmissionId=18`
   (`=10` on the press, `=4` on the preprint server). [OMP 10 is not
   declined in the dataset: press "Decline Submission" and "Record
   Decision" first.] The workflow offers "Revert Decline".
3. Press "Revert Decline". The address reads
   `…/decision/record/18?decision=16&ret=…`. On "Notify Authors", press
   "Record Decision".
4. Press "View Submission Summary", then the browser's Back button.
5. Press "Record Decision".
6. Reload the page.
7. Open the workflow's "Activity Log", and read the author's mailbox.

By address, Submission stage (OJS submission 4, "Computer Skill
Requirements for New and Existing Teachers: Implications for Policy and
Practice", author `cmontgomerie`; OMP submission 3, "The Political
Economy of Workplace Injury in Canada", author `bbarnetson`; OPS
submission 1, "The influence of lactation on the quantity and quality of
cashmere production", author `ccorino` [it is in Production, the stage
where a preprint server declines and reverts]):

1. Sign in as `dbarnes`.
2. Open the submission from "Active submissions". Its workflow offers
   "Decline Submission" and no "Revert Decline".
3. Open `/index.php/publicknowledge/decision/record/4?decision=16`
   (`/3?…` on the press, `/1?…` on the preprint server).
4. On "Notify Authors", press "Record Decision".
5. Open the workflow's "Activity Log", and read the author's mailbox.

By address, review round (OJS submission 13, "Hydrologic Connectivity in
the Edwards Aquifer between San Marcos Springs and Barton Springs during
2009 Drought Conditions", revisions requested, author `lkumiega`; OMP
submission 16, "A Designer's Log: Case Studies in Instructional Design",
reviews in, author `mpower`):

1. (OJS) Sign in as `lkumiega`. The header's "Tasks" lists "Revision
   required. Hydrologic Connectivity in the Edwards Aquifer…", and "My
   Submissions" shows "Revision requested" with "Submit revisions".
2. Sign in as `dbarnes` and open the submission from "Active
   submissions" (`dbarnes` is not assigned to OMP 16). In the workflow's
   menu, open "Review", "Round 1" (OMP 16: "External Review", "Round
   1"). "Round 1 Status" reads "Revisions have been requested." (OMP 16:
   "New reviews have been submitted.").
3. Press "Accept Submission". The address reads
   `…/decision/record/13?decision=2&ret=…&reviewRoundId=10` (OMP 16:
   `reviewRoundId=18`).
4. In the address, change `decision=2` to `decision=15` and open it.
5. On "Notify Authors", press "Record Decision".
6. Open the round again.
7. (OJS) Sign in as `lkumiega`: the header's "Tasks", "My Submissions",
   and the submission's round.

**Expected.** Once the submission is no longer declined, the record
page refuses: after Back, after the reload, on the second tab, and at
each typed address. Nothing is recorded or sent. The round keeps its
status, and the author keeps the revisions request.

**Observed.** After a reversal, Back reopens "Revert Decline" with
"Record Decision" offered. Pressing it closes again on "Submission
Reactivated", and the reload reopens the page once more. The author has
two "We have reversed the decision to decline your submission" emails.
The Activity Log shows "Daniel Barnes reversed the decision to decline
this submission." and "An email has been sent: We have reversed the
decision to decline your submission" twice each. The second tab gives
the same result: the reversal opened in one tab, recorded in another,
then "Record Decision" in the first.

At a typed address, the page opens headed "Revert Decline": "Revert a
previous decision to decline this submission and return it to the
active editorial process.", with one step, "Notify Authors". "Record
Decision" closes on:

```
Submission Reactivated
The submission, Computer Skill Requirements for New and Existing Teachers:
Implications for Policy and Practice, is now active in the submission stage.
The author has been notified, unless you chose to skip that email.
```

The author receives "We have reversed the decision to decline your
submission" ("The decision to decline your submission, "…", has been
reversed."), and the Activity Log records the reversal and the email.
The submission's status and the decisions on offer stay as they were.

On OJS submission 13, "Round 1 Status" then reads "All reviews are
confirmed and a decision is needed.". The author's "Tasks" reads "No
Items", "My Submissions" shows "Review update 3/3" without "Submit
revisions", and the author's round has no "Upload revisions". OMP
submission 16's round was not waiting for revisions and keeps "New
reviews have been submitted.".

Control: `/index.php/publicknowledge/decision/record/2?decision=16` on
the preprint server, where submission 2 is posted and at the Done stage,
answers the access-denied page "The submission is not at the appropriate
stage of the workflow to take this decision.".

## Cause

Each app's submission map offers "Revert Decline" only on a declined
submission. In OJS,
`APP\submission\maps\Schema::getAvailableEditorialDecisions()`
(`classes/submission/maps/Schema.php` lines 145–171) says "when the
submission is declined, allow only reverting declined status". The OMP
and OPS maps follow the same rule. The record page and the API apply
neither that list nor its rule.

The page: `DecisionHandler::authorize()`
(`lib/pkp/pages/decision/DecisionHandler.php` line 81) adds
`DecisionWritePolicy`. It checks that the decision type exists
(`DecisionTypeRequiredPolicy`), the submission's current stage
(`DecisionStageValidPolicy::effect()`, line 42) and the user's
assignment (`DecisionAllowedPolicy`). `record()` then checks the stage
again (line 97), the review round (lines 101–111) and, for a
`DecisionRetractable` decision, `canRetract()` (line 114).

The API: `PKPSubmissionController::authorize()` adds the same policy
(lines 406–409). `addDecision()` answers 400 with the errors of
`Repo::decision()->validate()`, which checks the stage (line 159) and
calls the type's `validate()`. The revert types' `validate()` checks
only the email. Nothing on either path reads the submission's status.

So the reversal runs as if a decline existed. `Repository::add()` logs
the decision (lines 254–268), then calls `runAdditionalActions()` (line
271). `DecisionType::runAdditionalActions()` sets the status to queued,
which changes nothing on an active submission. With a `reviewRoundId`,
it clears the round's status (line 241) and recalculates it.
`ReviewRound::determineStatus()` enters its revisions branches (lines
178–205) only when the stored status already says revisions, so with
the status cleared it falls through to the review assignments.

The author's email comes from `RevertInitialDecline::runAdditionalActions()`
in the Submission stage and from `RevertDecline::runAdditionalActions()`
(line 104) on a review round. Afterwards `Repository::updateNotifications()`
runs `PendingRevisionsNotificationManager` (line 117), which asks
`getActivePendingRevisionsDecision()` for the round's revisions request.
That method returns nothing, because the newest decision is now the
reversal, so the manager removes the author's "Revision required"
notification.

Back and a reload reach the page for the same reason. After a real
reversal the submission is queued and still at the decision's stage, so
every check passes. A second tab's page is already loaded, so only the
API could refuse there.

Reach:

- A preprint server has no review rounds. A preprint in Production that
  is not declined gets the reversal recorded, the email and the log
  line, and nothing else changes (walked).
- A submission in Copyediting or Production (OJS, OMP) is refused by
  `DecisionStageValidPolicy`: both reversals belong to the Submission or
  Review stage (code).
- A published submission is refused. OJS and OMP keep it in Production,
  so the stage check refuses it (code). OPS on `main` moves it to Done,
  the stage control above (walked). OPS on 3.5 keeps it in Production:
  the page opens, and "Record Decision" answers 403 "You can not record
  a decision or recommend a decision for this submission because it has
  already been published." (walked).
- A round asking for a resubmission, or holding submitted revisions,
  goes through the same recalculation and loses that status (code).
- A press's Internal Review: `RevertDeclineInternal` (`decision=27`)
  extends `RevertDecline` and takes the same path (code).
- The opposite direction is open too: another decision typed on a
  declined submission (a second "Decline Submission", "Send for Review")
  meets no status check either. Not walked.
- A review-stage decision typed with a past round's number (spec U34
  A11) needs a round check, not a status check. This fix does not cover
  it.

## Proposed fix

A proposal: follow the pattern `record()` already uses for
`CancelReviewRound`. Give `RevertDecline` and `RevertInitialDecline` a
`canRevert()` that is true only for a declined submission. Check it in
`DecisionHandler::record()` beside the `canRetract()` guard (line 114),
and in each revert type's `validate()`, as `CancelReviewRound::validate()`
checks `canRetract()` (line 124). The diff is in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/fix.diff)
(pkp-lib only, the same files on all three apps). The heart of it:

```php
// RevertDecline, RevertInitialDecline
public function canRevert(Submission $submission): bool
{
    return $submission->getData('status') === Submission::STATUS_DECLINED;
}
// ... and in validate(), after parent::validate():
if (!$this->canRevert($submission)) {
    $validator->errors()->add('decision', __('editor.submission.decision.revertDecline.restriction'));
}

// DecisionHandler::record(), after the canRetract() guard
if (($this->decisionType instanceof RevertDecline || $this->decisionType instanceof RevertInitialDecline)
        && !$this->decisionType->canRevert($this->submission)) {
    throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
}
```

Why this one:

- It covers every caller that can record a reversal: the page through
  `record()`, and the API through `Repository::validate()`. The other
  callers of `Repo::decision()->add()` (`ApplyDoneWorkflowStage` and the
  return to Done in `PKPSubmissionController`) never record a reversal.
- OMP's `RevertDeclineInternal` and OPS's `RevertDecline` extend the two
  classes, so they inherit the check.
- It closes the double reversal too: after a real reversal the
  submission is queued, so Back and a reload get 404, and a second
  tab's "Record Decision" gets the validation error.

Tried on `main` on all three apps. Each typed address in the Steps
answers "404 Not Found", and nothing is recorded or sent. OJS submission
13 keeps "Revisions have been requested.", and the author's upload then
moves the round to "Revisions have been submitted and a decision is
needed.". After a real reversal, Back and the reload answer "404 Not
Found", and the author has one email. A second tab's "Record Decision"
shows "Error Only a declined submission can have its decline reverted."
(400). A declined submission's own "Revert Decline" still records,
returns the submission to the queue and emails the author, with the fix
in and out alike (OJS 18, OJS 7's review round, OMP 10, OPS 4).

**Alternatives**

- A `DecisionStatusValidPolicy` in `DecisionWritePolicy`, with a
  `getRequiredStatus()` on `DecisionType`: one gate for page and API,
  and the access-denied page with a message instead of a bare 404. It
  adds a new pattern across six files for a page no screen links to.
  It becomes worth it if the team also closes the opposite direction,
  since each decline type could then declare `STATUS_QUEUED` in one
  line.
- Have the page and the API consult the maps'
  `getAvailableEditorialDecisions()`. It lives in each app's map class,
  mixes in the user's permissions, and would refuse decision types that
  a plugin adds through the `Decision::types` hook.
- A guard in the workflow screen. The screen already hides the button,
  and that would not cover Back or a second tab.

**What goes with it**

- The opposite direction is left out on purpose. Refusing other
  decisions on a declined submission is a product question, touched in
  `pkp/pkp-lib#10599` ("the other Decisions are not properly reverting
  declined status").
- No data repair. An extra reversal leaves a decision row and log lines
  that do no harm. A lost revisions request is restored with "Request
  Revisions".
- A new English string, `editor.submission.decision.revertDecline.restriction`,
  named like `cancelReviewRound.restriction`.
- Backport: 3.5 and 3.4 have the same `canRetract()` guard and revert
  types (not tried there). 3.3's window needs its own check in
  `saveRevertDecline`.
- The guard: a pkp-lib unit test for the revert types' `validate()` (a
  reversal on a queued submission refused, on a declined one accepted),
  and a **Planned** item for U34 Rule 12 in the e2e suite.

Small: about 25 lines in three pkp-lib files and one string, following
the `canRetract()` pattern, tried. The only API change is that a
reversal on a submission that is not declined now answers 400.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/lib.js),
  on a freshly loaded default dataset:
  `PROBE_FEATURE=<feature> node bin/probe.js all shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/walk.js`
  (3.5: `PKP_E2E_LINE=stable-3_5_0` in front). The default mode takes
  the two "By address" groups. `WALK_MODE=again` takes "After a
  reversal", `WALK_MODE=tabs` the second tab, and `WALK_MODE=neighbour`
  a declined submission's own reversal. The script opens each workflow
  by its dashboard address rather than from the list. It saw no failed
  request and no script error on any app or line.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/revert-decline-typed-on-undeclined-submission/fix.diff ojs omp ops`,
  then the default, `again` and `tabs` modes, then `neighbour` with the
  fix in and out, then `revert`.
- Walked on PostgreSQL. The fault does not depend on the database.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c
  (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and
  OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1,
  OMP 0aec65441f, OPS acd8ae704b (lib/pkp 767353f4fe); `stable-3_3_0`
  OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161 (lib/pkp ac3fa73402).
- Code read on 3.5 and 3.4: `DecisionHandler::record()` (the same
  `canRetract()` guard at line 114, no status check),
  `DecisionStageValidPolicy::effect()`, `RevertInitialDecline`,
  `RevertDecline` and their `validate()` (the email only), OPS's
  `RevertDecline`, OMP's `RevertDeclineInternal`, and
  `DecisionType::runAdditionalActions()` (the round's status cleared
  before recalculation). All match `main`.
- Code read on 3.3: the reversal is the legacy window
  `PKPEditorDecisionHandler::revertDecline` / `saveRevertDecline`
  (`lib/pkp/classes/controllers/modals/editorDecision/`).
  `RevertDeclineForm::execute()` records the decision, sets the status to
  queued and clears the last round's status, with no status check and no
  email. Only a declined submission's button opens the window, and its
  save is a form post, so no typed address records it. A second window,
  opened before the first was saved, would record the reversal again.
  Not walked. It came with `pkp/pkp-lib#6401` for `pkp/pkp-lib#5819`
  ([c555853693](https://github.com/pkp/pkp-lib/commit/c555853693), 2020,
  ajnyga).
- Introduced: `git blame` on the revert types' `validate()` lands on
  f75706ba57. So does `DecisionStageValidPolicy.php` line 42, through the
  rename in 9ed41c4143 (`.inc.php` to `.php`) and the typehint change in
  e40f42a4f8. That editorial decision refactor added the revert types,
  the record page and the decisions API, with a stage check and no
  status check. `commits/f75706ba57/pulls` names `pkp/pkp-lib#7631`.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for "revert decline", "revert decline" status, "revert
  decline twice", "decision recorded twice back button", "reverted
  decline not declined", "decision declined submission status check",
  "decision record url any status", `DecisionStageValidPolicy` and
  `RevertInitialDecline`. The hits are the feature's own PRs
  (`pkp/pkp-lib#6401`, `pkp/pkp-lib#7631`), the PR that brought
  `canRetract()` (`pkp/pkp-lib#8031`), and neighbouring discussions
  (`pkp/pkp-lib#10599`, `pkp/pkp-lib#12881`). None is about this fault.
- Not driven: 3.4 and 3.3 (code only, as above); a press's Internal
  Review reversal; a round asking for a resubmission or holding
  submitted revisions; a submission in Copyediting or Production, or
  published, on OJS and OMP; decisions typed on a declined submission.
- Unverified: nothing beyond the items read in the code.
