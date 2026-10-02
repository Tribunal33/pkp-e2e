# A workflow stage address typed without a submission number, or with an unknown one, shows a blank page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#10007` for `pkp/pkp-lib#9837` · [5b0dbfc8d2](https://github.com/pkp/pkp-lib/commit/5b0dbfc8d265e4bc263f8bfefd5168596488f805) · 2024-06-03 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp9), spec U24 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The app fails on the server when someone opens an address that names
a workflow stage (Submission, Review, Copyediting, Production; older
addresses that still forward to a submission's workflow) without a
submission number, or with the number of a submission that does not
exist. The page is entirely blank: no title, no message, and the
browser stays on the address. Until a 2024 change that keeps unfinished
submissions out of the workflow, the same address answered "404 Not
Found".

Two things reach it: an address typed or cut short by hand, and a link
to a submission deleted since, such as a bookmark or a link in an email
sent while it existed. Such a link could show no more than "404 Not
Found", so nothing is lost; the user opens the dashboard instead.

An editor and an author get the same page, for every stage's address.

## Impact

- **Lost**: nothing. The page does not say that the address is wrong,
  and each visit writes a fatal error to the server log.
- **Who**: an editor or author who types or cuts short a stage's
  address, or follows a bookmark or an old email link to a submission
  that an editor has deleted. The code gives a visitor who is not
  signed in the same page; that case was read, not walked.
- **Way round**: retype the address with the submission's number, or
  open the submission from the dashboard.

Low: no task fails, because every link that leads there points at a
submission that no longer exists and could at best answer "404 Not
Found". A link the app shows for an existing submission leading there
would make it medium; each stage link found in the code carries the
submission's number.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (press, journal or preprint
  server `publicknowledge`). Nothing else.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Type a stage's workflow address with no submission number after it.
   On the press: `/index.php/publicknowledge/en/workflow/internalReview`.
   On the journal: `…/workflow/externalReview`. On the preprint server:
   `…/workflow/production`.
3. Type the other stages' addresses the same way:
   `…/workflow/submission`, `…/workflow/externalReview`,
   `…/workflow/editorial`, `…/workflow/production`.
4. Type a stage's address with a number no submission has:
   `…/workflow/submission/999999`.
5. Sign in as an author (`lelder` on the press, `dsokoloff` on the
   journal, `ccorino` on the preprint server) and type the address of
   step 2 again.

**Expected**: the page "404 Not Found", as `…/workflow/access` gives
when typed without a number.

**Observed**: at steps 2 to 5 the page is blank: no title, no heading,
no text, and the address stays as typed. Each request answers 500. The
server log, at step 2 on the press:

```
PHP Fatal error:  Uncaught Error: Call to a member function getData() on null in lib/pkp/classes/security/authorization/internal/SubmissionCompletePolicy.php:58
[500]: GET /index.php/publicknowledge/en/workflow/internalReview - Uncaught Error: Call to a member function getData() on null in lib/pkp/classes/security/authorization/internal/SubmissionCompletePolicy.php:58
```

Control: `…/workflow/access` typed without a number shows "404 Not
Found", and the stage's address with a number
(`…/workflow/internalReview/12` on the press) forwards `dbarnes` to
that submission's workflow.

## Cause

`PKPWorkflowHandler::authorize()` (pkp-lib
`pages/workflow/PKPWorkflowHandler.php`, lines 77–90) builds two policy
lists. For `access` it starts with `SubmissionRequiredPolicy`, which
denies an address that names no submission of this context and answers
"404 Not Found". For every other operation (`index`, `submission`,
`externalReview`, `editorial`, `production`, and OMP's
`internalReview`) it starts with `SubmissionCompletePolicy` (line 88).

`SubmissionCompletePolicy::dataObjectEffect()`
(`classes/security/authorization/internal/SubmissionCompletePolicy.php`,
lines 54–58) reads the number from the address, calls
`Repo::submission()->get((int) $submissionId)` and then
`$submission->getData('submissionProgress')` without checking the
result. With no number in the address `getDataObjectId()` returns
`false`, the lookup is for submission 0, and `get()` returns `null`; a
number no submission has gives `null` too. The call on `null` is the
fatal error.

The policy assumes that an earlier policy has already established that
the submission exists. `WorkflowStageAccessPolicy`, which does that
through its own `SubmissionRequiredPolicy`, is added after it (line
89), so it never gets to answer.

`pkp/pkp-lib#10007` added the policy and line 88, to keep an unfinished
submission out of the workflow (`pkp/pkp-lib#9837`). Before it,
`WorkflowStageAccessPolicy` was the only policy of these operations,
and its `SubmissionRequiredPolicy` answered such an address with the
404 (code).

Reach:

- Every operation of the workflow page handler except `access`, in the
  three apps (walked on `main` and 3.5). `…/workflow/internalReview`
  typed on a journal or a preprint server shows "404 Not Found": only
  OMP's handler has that operation.
- A visitor who is not signed in (code, not walked):
  `PKPHandler::authorize()` puts only the site-wide policies (restricted
  site, HTTPS, allowed hosts) ahead of the handler's own, and the
  forward to Login comes after the decision, so the policy runs and
  fails for them too.
- Links the app builds (code). The stage operations forward to
  `…/workflow/index/<number>/<stage>` (`_redirectToIndex()`, line 183),
  which is still routed, and two notification links are stage
  addresses: `SubmissionNotificationManager::getNotificationUrl()`
  (line 64, `workflow/submission/<number>`, the "editor assignment
  required" task) and `PKPNotificationManager::getNotificationUrl()`
  (line 72, the reviewer-comment notification). All carry a number, so
  they fail only once the submission is deleted.
- Whether such a link outlives its submission (code). On screen, no:
  the submission DAO's `deleteById()` (line 288) deletes the
  submission's notifications, and the reviewer-comment link is built
  from the review assignment, deleted with it. In mail already sent,
  yes: `AssignEditors` (line 104) and `PKPReviewerReviewStep3Form`
  (line 230) mail the notification's link when the context lacks the
  `SUBMISSION_NEEDS_EDITOR` or `REVIEW_COMPLETE` template (a default
  install has both), and 3.3's `RecommendationForm` mailed
  `workflow/index/<number>/<stage>`.
- The policy's other callers are safe (code): `PKPJatsController`
  adds `SubmissionRequiredPolicy` right before it, and
  `PKPSubmissionController` adds it for `addDecision`, `returnToDone`
  and the publication form endpoints after `SubmissionAccessPolicy`,
  which holds a `SubmissionRequiredPolicy`. A denial ends the
  evaluation (`AuthorizationDecisionManager::_decidePolicySet()`), so
  the policy is not reached without a submission there.
- 3.4 and 3.3 carry the backports of the same change
  (`pkp/pkp-lib#10008`, `pkp/pkp-lib#9869`) with the same unchecked
  call (code). There `…/workflow/index/<number>/<stage>` is the
  workflow page's everyday address, the one a bookmark holds.

## Proposed fix

Recommended: let `PKPWorkflowHandler::authorize()` add
`SubmissionRequiredPolicy` for every operation, not only for `access`,
so it runs before `SubmissionCompletePolicy`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stage-address-without-number-blank-page/fix.diff)):

```diff
-        if ($operation == 'access') {
-            // Authorize requested submission.
-            $this->addPolicy(new SubmissionRequiredPolicy($request, $args, 'submissionId'));
+        // Authorize requested submission: an address that names none is answered "404 Not Found".
+        $this->addPolicy(new SubmissionRequiredPolicy($request, $args, 'submissionId'));
 
+        if ($operation == 'access') {
```

The handler is the one caller that puts `SubmissionCompletePolicy`
first, so the fix belongs there, in the order
`PKPJatsController::authorize()` uses. `pkp/pkp-lib#9837`'s intent is
kept: an unfinished submission is still refused.

`SubmissionRequiredPolicy` then runs twice for a stage operation, here
and inside `WorkflowStageAccessPolicy` (its constructor, line 48). The
second run looks the same submission up again and stores it again;
nothing else changes. A visitor who is not signed in gets the 404
without a number and the forward to Login with one, as before the
regression (code).

Left out of this fix: `…/workflow/index` without a stage number on a
PHP that runs assertions (a development setting; production PHP skips
them). It stays blank with the fix, because
`identifyStageId()`'s `assert()` fails while line 89 is still building
its policy, before any policy runs. That failure does not involve the
submission and no production install runs it; a guard on `$args[1]`
there is a separate tidy-up.

Tried on `main` on OJS, OMP and OPS: steps 2 to 5 show "404 Not Found".
With the fix in and out alike, the address with a number forwards
`dbarnes` to the workflow, another submission's author gets "You don't
currently have access to that stage of the workflow.", `…/workflow/access`
answers as before, and a submission an author has begun and not
finished gives `dbarnes` "Workflow access for incomplete submission is
restricted."

**Alternatives**

- A null check in `SubmissionCompletePolicy::dataObjectEffect()` that
  returns a denial. It stops the crash for every caller, but the user
  is then told "Workflow access for incomplete submission is
  restricted." about a submission that does not exist. It can go with
  the recommended fix as a safety net for a future caller; alone it is
  the wrong answer.
- Moving `SubmissionCompletePolicy` after `WorkflowStageAccessPolicy`.
  It works, but a user without access to the stage would no longer be
  told that the submission is unfinished, which changes what
  `pkp/pkp-lib#9837` shows.

**What goes with it**

- No data repair. No API or hook changes: `WorkflowStageAccessPolicy`
  holds the same `SubmissionRequiredPolicy`, so a stage operation gets
  no denial it would not have got there.
- Backport: the diff applies as written to `stable-3_5_0` and
  `stable-3_4_0` (`patch --dry-run`); `stable-3_3_0` needs the same
  move in `PKPWorkflowHandler.inc.php`, with its `import()` line.
- Guard: an e2e scenario that types a stage's address without a number
  and with an unknown number and expects "404 Not Found".

Small: three lines moved in one method, following the order the other
callers use, and one test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stage-address-without-number-blank-page/walk.js).
  It takes the Steps and the controls on the three apps; with
  `MODE=nb` it runs only the neighbour checks, the cases the fix must
  leave unchanged. Run on a dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/stage-address-without-number-blank-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5;
  `MODE=nb PROBE_RUN=nb …` for the fix's checks).
- Walked on `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). Walked on `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, ui-library d4e01883);
  the same Observed and controls on every app, and no page script
  error. Dataset: pkp/datasets e8dafbc (2026-10-02), PostgreSQL.
- `…/workflow/index` is left out of the Steps. On the walked installs
  PHP runs with `zend.assertions = 1`, and there
  `PKPWorkflowHandler::identifyStageId()` (lines 224–227) fails first,
  for `…/workflow/index` and for `…/workflow/index/<number>` without a
  stage number alike: its `assert()` passes the missing stage number
  to `WorkflowStageDAO::getPathFromId(int $stageId)`, a `TypeError`
  and the same blank page, with the fix in too. With assertions off, as
  on a production PHP, the `assert()` is not run. Unverified here: that
  `…/workflow/index` then fails in `SubmissionCompletePolicy` like the
  other addresses, and that the fix turns it into the 404 (both read in
  the code).
- Fix trial on `main`, the diff applied to OJS, OMP and OPS (the file
  is identical in the three), the dataset reloaded before each run:
  the Steps with the fix in, then the neighbour checks with the fix in
  and out. For the unfinished submission the walk signs in as an author
  (`ccorino` on the journal, `afinkel` on the press, `ckwantes` on the
  preprint server), fills "Make a Submission" with the title "u71e
  unfinished", presses "Begin Submission" and leaves; `dbarnes` then
  types `…/workflow/submission/<its number>`.
- Code reads. 3.5: `authorize()` (the policy at line 89)
  and `dataObjectEffect()` are as on `main`. 3.4 (pkp-lib `stable-3_4_0`
  32b0f4b4af): `authorize()` (the policy at line 83) and the policy's
  `dataObjectEffect()` are the same,
  from
  [0b3c1ebebf](https://github.com/pkp/pkp-lib/commit/0b3c1ebebf4ca29203e3f0ac23b9ea914f300b42).
  3.3 (pkp-lib `stable-3_3_0` f6ab331645):
  `PKPWorkflowHandler.inc.php` line 53 adds the policy first for every
  operation but `access`, and its `dataObjectEffect()` calls
  `$submissionDao->getById($submissionId)` and then
  `$submission->getData('submissionProgress')` unchecked, from
  [060d9b5506](https://github.com/pkp/pkp-lib/commit/060d9b550682ee1b25542ca47892b465cd617e48);
  a later commit of that PR, 6758e13c3e, removed a check for a missing
  number.
- Introduced: the policy file and line 88 have one commit in their
  history on `main`, 5b0dbfc8d2, merged by `pkp/pkp-lib#10007`. That
  the addresses answered 404 before it is read from the code, not
  walked on the older commit.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp; issues and PRs, open
  and closed; pkp/ui-library not searched, the fault is on the server): by "workflow blank page 500 missing submission id",
  "workflow url without submission id", `"getData() on null" workflow`,
  `"workflow/index" 500`, `SubmissionCompletePolicy`,
  `dataObjectEffect` and `identifyStageId`. The hits on the policy's
  name (`pkp/pkp-lib#12881`, `pkp/pkp-lib#12286`, `pkp/pkp-lib#11631`)
  use it and do not mention the missing submission.
- Not driven, read in the code only: a visitor who is not signed in,
  with and without the fix; the API endpoints that use the policy; a
  kept address or a mailed link of a submission deleted on screen (step
  4's unknown number stands for it); the notification links and their
  deletion with the submission.
- Unverified: whether 3.4 mailed the notification's stage address
  (its `SubmissionNotificationManager` builds the same one); how many
  installs lack the two email templates.
