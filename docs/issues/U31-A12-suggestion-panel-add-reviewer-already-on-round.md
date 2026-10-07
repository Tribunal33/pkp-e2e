# Editors get a silent server error from "Add Reviewer" on a suggested person already reviewing the round

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#10497` and `pkp/ui-library#426` for `pkp/pkp-lib#4787` · [08d4cf9c89](https://github.com/pkp/pkp-lib/commit/08d4cf9c89dbf559f3a3becb5af86f13d48fb849), [1e0faa4a0d](https://github.com/pkp/ui-library/commit/1e0faa4a0d5ea1bce3ec41d58a6aa3820da7bc80) · 2025-02-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U31 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a12)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the Review stage, an editor presses "Add Reviewer" on a row of
"Reviewers Suggested by Author" for a person who is already a reviewer
on the round. The Add Reviewer window opens with that person already
picked, and its "Add Reviewer" button fails with a server error (HTTP
500). No message shows, the window stays open, and the suggestion stays
in the panel.

There are two ways in. On any database, two editors (or one editor in
two browser tabs) open the same suggestion's "Add Reviewer", and the
second one to press it after the first has added the person gets the
error. On PostgreSQL only, the row itself is left behind for good when
the suggested address differs in letter case from the reviewer's
account ([pkp-e2e#856](https://github.com/jardakotesovec/pkp-e2e/issues/856)):
the panel keeps offering "Add Reviewer" on a person already reviewing,
and every press fails. No screen lets the editor remove the row.

Fixing pkp-e2e#856 stops new rows of that second kind; the two-editors
path, and the server answering with a 500 rather than a refusal, remain.

## Impact

- **Lost**: nothing; the person is already on the round. The editor
  gets a failure with no explanation, and on PostgreSQL a row that keeps
  offering it.
- **Who**: editors of a journal or press that has turned on "Reviewer
  Suggestion at Submission" (off by default): when two of them act on
  the same suggestion, or on PostgreSQL whenever an author types a
  reviewer's address in other letter case than their account holds.
- **Way round**: none needed for the work; a stale row can only be
  ignored for the life of the round.

Low: the add that fails is of someone already reviewing, so the editor
is refused nothing they need. It would be medium if the error stopped
the editor from adding someone new.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`,
  "Journal of Public Knowledge"); the same on OMP `main` (press
  `publicknowledge`, "Public Knowledge Press"). Steps 1-11 need
  PostgreSQL: step 8 matches the suggestion to the reviewer by the
  address letter for letter, which MySQL's default collation does not
  do, so there the suggestion is taken up and leaves the panel. Steps
  12-15 work on either.
- "Reviewer Suggestion at Submission" is off in the dataset; steps 1-2
  turn it on.

Turning the feature on:

1. Sign in as `rvaca` (Journal manager; Press manager on OMP) and open
   Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), tab
   "Review", side tab "Setup".
2. Tick "Allow authors to suggest potential reviewers at submission
   process" and press "Save". Sign out.

The author's suggestion:

3. Sign in as `ccorino` [OMP: `aclark`]. Open "New Submission", type
   the title "u31r8 Already on the round", choose the section
   "Articles" [OMP: no section to choose] and English, tick the
   requirements and privacy boxes, and press "Begin Submission".
4. On "Upload Files" upload any file as "Article Text" [OMP: "Book
   Manuscript"], on "Details" type an abstract, and press "Continue"
   until "Reviewer Suggestions" is the current step. [3.5: the form
   opens on "Details", then "Upload Files".]
5. Press "Add Reviewer Suggestion" and fill in "Given Name" Adela,
   "Family Name" Gallego, "Email address" AGallego@Mailinator.com (the
   dataset's reviewer `agallego` holds agallego@mailinator.com),
   "Affiliation" Public Knowledge University and "Reasons for
   suggesting reviewer" "Reviewed for the journal before."; press
   "Save".
6. Press "Continue", then "Submit", and confirm with "Submit". Sign out.

A row left behind (PostgreSQL):

7. Sign in as `dbarnes`, open "u31r8 Already on the round" from the
   dashboard's "Active submissions", press "Send for Review" [OMP:
   "Send to External Review"], "Continue" through the decision's pages
   and "Record Decision".
8. Open the submission again. In "Reviewers" press "Add Reviewer";
   under "Select a Reviewer from Reviewer Suggestions" press "Select
   Reviewer" on Adela Gallego, and press "Add Reviewer". Adela Gallego
   is listed under "Reviewers".
9. Open the submission again and read "Reviewers Suggested by Author";
   then press "Add Reviewer" in "Reviewers" and read Adela Gallego's
   entry under "Select a Reviewer from Reviewer Suggestions". Close the
   window.
10. On Adela Gallego's row in "Reviewers Suggested by Author" press "…"
    › "Add Reviewer".
11. Press "Add Reviewer" in the window.

Two editors on one suggestion (any database; on a freshly loaded
dataset):

12. Take steps 1-7, with "Email address" agallego@mailinator.com in
    step 5 (her address exactly).
13. On Adela Gallego's row in "Reviewers Suggested by Author" press "…"
    › "Add Reviewer", and leave the window open.
14. In a second browser tab (or as a second editor, `rvaca`), open the
    same submission, press "…" › "Add Reviewer" on Adela Gallego's row,
    then "Add Reviewer": Adela is added and the row leaves the panel.
15. Back in the first tab, press "Add Reviewer" in the window.

**Expected** (9), (10): the panel's row, like the window's list, reads
"This reviewer has already been assigned to this review round." and
offers no "Add Reviewer". (11), (15): the request is refused with that
message and the window stays open.

**Observed** (9): the panel still lists "Adela Gallego · Public
Knowledge University · Reviewed for the journal before." with its "…"
menu; the window's list shows the same entry with "This reviewer has
already been assigned to this review round." and no "Select Reviewer".
(10): the menu offers "Add Reviewer", and the window opens with Adela
Gallego already picked under "Selected Reviewer", the "Review Request"
message and both due dates filled. (11): the request answers a server
error; no message shows, the window stays open, and the row stays:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/reviewer/reviewer-grid/update-reviewer  500
PHP Fatal error:  Uncaught Exception: Invalid reviewer id. in lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php:343
```

(15): the same: a 500, no message, the window left open, with:

```
PHP Fatal error:  Uncaught Exception: Not allowed to add reviewer suggestion as reviewer that has already been approved in lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php:1347
```

## Cause

Neither the panel nor the server applies the rule that a person already
reviewing a round cannot be added to it again in a way the editor sees.

**The panel offers the action on every row.** The store
(`reviewerSuggestionManagerStore.js`) lists the pending suggestions and
asks `useReviewerSuggestionManagerActions.js::getItemActions()` once for
one action list, which `ReviewerSuggestionManager.vue` puts on every
row; nothing looks at the round. The Add Reviewer window's list does:
`AdvancedSearchReviewerForm::fetch()` passes the round's reviewer ids
as `currentlyAssigned`, and `SelectReviewerListPanel.vue` shows such a
suggestion with `reviewer.list.currentlyAssigned` and no "Select
Reviewer". The panel has the same facts at hand: the workflow's
submission carries `reviewAssignments` with `roundId` and `reviewerId`
(`PKP\submission\maps\Schema::getPropertyReviewAssignments()`).

**The server refuses by throwing.** Two checks end in an exception, so
the request answers 500:

- `ReviewerForm::execute()` (lines 342-344 on `main`) calls
  `_isValidReviewer()`, false for a reviewer already on the round, and
  throws `Exception('Invalid reviewer id.')` (step 11). It is not a
  form check, so `validate()` has already passed.
- `PKPReviewerGridHandler::getReviewerForm()` (line 1347) throws when
  the suggestion the window carries was approved meanwhile (step 15).

Separately, when a form check does fail,
`PKPReviewerGridHandler::updateReviewer()` answers `JSONMessage(false)`
with no content, so the window would show nothing either.

The server check is the one that always answers: the panel can only
see what the submission's data shows it. `getPropertyReviewAssignments()`
leaves out declined and cancelled assignments for an editor who may
not see them, and empties `reviewerId` on assignments it anonymises,
while `_isValidReviewer()` counts every assignment in the round.

Reach:

- The "Locate a Reviewer" list marks reviewers already on the round
  (`currentlyAssigned`) and disables their "Select", so it reaches the
  throw only from a window opened before the person was added (checked
  in the code).
- OMP's Internal Review: the row's action shows only when
  `atActiveReviewStage()` finds the external review stage (checked in
  the code; walked on External Review).
- Before reviewer suggestions (`pkp/pkp-lib#4787`) no screen opened the
  window with a reviewer already on the round picked; the
  `Invalid reviewer id.` throw (a `fatalError()` until
  [ac0e09ebe2](https://github.com/pkp/pkp-lib/commit/ac0e09ebe29714409fa58191e827f09ab8322d77),
  2024) is older than the feature.

## Proposed fix

Mirror the window list's guard in the panel, and make the server
refuse with a message instead of throwing
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-panel-add-reviewer-already-on-round/fix.diff),
against the app root):

- ui-library, `reviewerSuggestionManagerStore.js`: read the round's
  reviewers with `useSubmission().getReviewAssignmentsForRound(
  props.submission.reviewAssignments, props.reviewRoundId)`, as
  `reviewerManagerStore.js` does, and mark a suggestion
  `isCurrentlyAssigned` when its `existingUserId` is among them.
  `ReviewerSuggestionManager.vue` shows
  `t('reviewer.list.currentlyAssigned')` in place of the "…" menu for
  such a row: the window list's own text, so no new string.
- pkp-lib, `ReviewerForm::__construct()`: a `FormValidatorCustom` on
  `reviewerId` (optional, so the Create and Enroll forms, which set it
  only in `execute()`, are untouched) with the message
  `reviewer.list.currentlyAssigned`, failing when the reviewer already
  has an assignment in the round. `_isValidReviewer()` uses the same
  new helper `isAssignedToReviewRound()`, and its throw stays as a last
  guard.
- pkp-lib, `PKPReviewerGridHandler::getReviewerForm()`: a suggestion
  already approved is no longer an exception; the form is built
  without it, so it is never approved twice, and the check above
  answers for the reviewer.
- pkp-lib, `PKPReviewerGridHandler::updateReviewer()`: answer a failed
  validation with its messages, `new JSONMessage(false,
  implode("\n", $reviewerForm->getErrorsArray()))`, as the handler's
  other operations answer their errors (`editor.review.errorReinstatingReviewer`
  and others). The browser shows the message and the window stays
  open.

Tried on OJS and OMP `main`:

- Step 9's row reads "… · This reviewer has already been assigned to
  this review round." with no "…" menu, so steps 10 and 11 cannot be
  taken.
- Step 15 shows "This reviewer has already been assigned to this review
  round.", the window stays open, and Adela keeps one assignment. The
  same for a window opened from the row of steps 1-8 before Adela was
  added and sent after.
- Adding a suggested person who is not yet on the round, from a row
  with an account and from one without, works as before, with the fix
  and without.

**Alternatives**:

- The panel guard alone: the two-editors path keeps its 500, and the
  guard misses the assignments the panel cannot see.
- The server change alone: the panel keeps offering an action that can
  only be refused.
- Approving such a suggestion when its "Add Reviewer" is pressed: it
  clears the row, but makes an add that adds nobody; clearing stored
  rows is the repair proposed in pkp-e2e#856.
- Redisplaying the form with its errors (`JSONMessage(true,
  $reviewerForm->fetch($request))`) instead of the message: the forms'
  `initData()` values (the message templates) are not rebuilt on a
  redisplay, so it needs more than a line per form.

**What goes with it**:

- With pkp-e2e#856 fixed, the panel guard rarely fires; the server
  change is what remains needed on every database.
- The date checks' messages (`editor.review.errorAddingReviewer`), a
  silent failure today, now show too.
- 3.5: the diff applies to `stable-3_5_0` with offsets, except the
  `use` line in `ReviewerForm.php`, whose imports are ordered
  differently there.
- Guard: a ui-library test of the panel with a suggestion whose person
  is on the round, pkp-lib tests of `ReviewerForm::validate()` for a
  reviewer already assigned and of `updateReviewer()` with an approved
  suggestion, or an e2e step in spec U31.

Medium: two layers in two repos (ui-library's store and panel,
pkp-lib's form validator and grid handler), a few lines each, and their
tests.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-panel-add-reviewer-already-on-round/walk.js)
  (helpers from
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-suggestion-same-address-other-case/lib.js)
  of pkp-e2e#856's script), on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/suggestion-panel-add-reviewer-already-on-round/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5) takes steps 1-11;
  `WALK_MODE=twoeditors` steps 12-15 (one editor, two tabs);
  `WALK_MODE=stale` the second-tab window on the row of steps 1-8;
  `WALK_MODE=nb` the unchanged adds of the fix trial. It opens the
  submission at `/dashboard/editorial?workflowSubmissionId=<id>`, the
  page "Active submissions" links to.
- Walked on OJS and OMP, `main` and 3.5, on the default dataset
  (pkp/datasets `401a013`, 2026-10-06) on PostgreSQL, the same on each:
  steps 8 and 14 answered 200, steps 11 and 15 answered 500 with the
  log lines quoted; no other server or script error. OPS has no review
  settings and no `reviewerSuggestionEnabled`, so it was not driven.
- MySQL was not driven (no such install). That steps 1-11 do not
  reproduce there is read in the code: `ReviewerForm::execute()` finds
  the suggestion with `ReviewerSuggestion::withEmail()`, a plain
  `where('email', …)`, and PKP's default `[database] collation`
  (`utf8_general_ci`) compares without case; steps 12-15 match the
  address exactly and do not depend on it.
- Fix trial: steps 1-11, the second-tab window and the unchanged adds
  with the diff's first form (without the `getReviewerForm()` change);
  steps 12-15 and the unchanged adds again with the diff as linked.
- Branch tips: OJS `main` 92bc2bb467 (pkp-lib e60013c77f, ui-library
  a36dc7fe), OMP `main` a0e6d0a8b (pkp-lib 5a5ab2d6c7, ui-library
  a36dc7fe); OJS `stable-3_5_0` b8f5e9a951, OMP `stable-3_5_0`
  7d6b00060 (pkp-lib 6d7f1540b6, ui-library 98ac8986); pkp-lib
  `stable-3_4_0` 767353f4fe and `stable-3_3_0` ac3fa73402.
- Code reads: on `stable-3_5_0` `ReviewerForm::execute()` throws the
  same at line 343, `getReviewerForm()` at line 1273, `updateReviewer()`
  answers `JSONMessage(false)`, the panel and its store are as on
  `main`, and the submission map carries `roundId` and `reviewerId`.
  `stable-3_4_0` and `stable-3_3_0` have no reviewer suggestions (no
  `ReviewerSuggestion` class, no panel); their `ReviewerForm` has the
  same check as a `fatalError()`, reached there only from a window
  opened before the reviewer was added.
- Introduced: the panel and `getItemActions()` came with ui-library
  1e0faa4a0d (`pkp/ui-library#426`), the preselected reviewer
  (`AdvancedSearchReviewerForm::initData()`) and `getReviewerForm()`'s
  throw with pkp-lib 08d4cf9c89 (`pkp/pkp-lib#10497`); the
  `Invalid reviewer id.` line is older (e3f570bc37, 2021).
- Upstream: `pkp/pkp-lib#3114` and `#1149` (closed, "Invalid reviewer
  id." on a re-added reviewer in 3.0-era code) and `#11521` (Enroll
  Existing User, another exception) are other faults.
- Unverified: which editors at the review stage meet the declined,
  cancelled or anonymised assignments the panel guard cannot see.
