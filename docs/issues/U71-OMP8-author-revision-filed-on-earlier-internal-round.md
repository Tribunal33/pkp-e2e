# A press author's "Upload" on a past Internal Review round files the revision there while External Review waits for it

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; the older "Revisions" grid)
  - 3.3: OMP (code; the older "Revisions" grid)
- **Introduced** not traced; the upload check has counted any earlier decision of the round since it was first written, [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) (2020-10-19, `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057`)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a press, an author can still upload revision files to a monograph's
last Internal Review round after the monograph has moved to External
Review, if that round ever had a "Request Revisions" decision. When
External Review then asks for revisions and the author opens the earlier
Internal Review round from the side menu, "Upload" above "Revisions
Uploaded" takes the file, and the file is listed on that internal round.

Nothing tells the author it went to the wrong round, but the request
stays visibly open: External Review still reads "Revisions have been
requested." with "Upload revisions", and the "My Submissions" row still
reads "Revision requested". The assigned editors get the "Revised
Version Uploaded" email, then find External Review reading "Revisions
have been requested." over an empty "Revisions Uploaded"; the file is on
the Internal Review round.

An Internal Review round sent to External Review with no "Request
Revisions" decision refuses the same "Upload".

## Impact

- **Lost** No file and no work. The revision is filed on a round the
  editor has left.
- **Who** A press author who leaves the External Review round their
  submission opens on and uploads on the earlier Internal Review round.
  Nothing on screen leads them there.
- **Way round** The author uploads again with "Upload revisions" on
  External Review. The editor, prompted by the email, finds the file on
  the Internal Review round.

Low: both sides get a sign, so the submission does not stall unnoticed,
and the revision gets done on External Review.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP (the press
  `publicknowledge`). Submission 6, "The Information Literacy User's
  Guide", is on Internal Review, Round 1; its author is `dbernnard`.
- Any small file on your computer; the steps call it
  `u71d-revision.pdf`.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   6. It opens on Internal Review, Round 1.
2. Press "Request Revisions", then "Record Decision".
3. Open the submission again and press "Send to External Review",
   "Continue", "Record Decision".
4. Open the submission again; it is on External Review, Round 1. Press
   "Request Revisions", leave "Revisions will not be subject to a new
   round of peer reviews." selected, press "Next", then "Record
   Decision".
5. Sign out, sign in as `dbernnard` (`dbernnarddbernnard`) and press
   "View" on the submission in "My Submissions". It opens on External
   Review, Round 1, with "Revisions have been requested." and "Upload
   revisions".
6. In the side menu press "Review Round 1" under "Internal Review". The
   round opens, reading "The submission is currently in the External
   Review stage.". Above "Revisions Uploaded" press "Upload".
7. Choose the component "Book Manuscript", pick `u71d-revision.pdf`,
   then press "Continue", "Continue" and "Complete".
8. Press "Review Round 1" under "External Review" and read "Revisions
   Uploaded". Then sign in as `dbarnes`, open the submission and read
   External Review, Round 1, which it opens on.

**Expected** At step 6 the upload is refused with "You are not allowed
to add and edit these files.", as it is on an Internal Review round that
was sent to External Review without a revisions request.

**Observed** At step 6 the window "Upload Review File" opens on its
first step, and after step 7 Internal Review Round 1's "Revisions
Uploaded" lists `u71d-revision.pdf`, with "Update File Details" and
"Delete" under "More Actions" ["Edit" and "Delete" on 3.5]. At step 8
External Review Round 1 reads "Revisions have been requested." over
"Revisions Uploaded: No Items" for the author and for the editor; the
author's "My Submissions" row reads "Revision requested" and the
editor's "Revisions requested from author". The upload sends `dbarnes`,
`dbuskins` and `minoue` the email "Revised Version Uploaded" ("The
author has uploaded revisions for the submission …"), which names no
round. The window's request is let through:

```
GET /index.php/publicknowledge/$$$call$$$/wizard/file-upload/file-upload-wizard/start-wizard?fileStage=20&reviewRoundId=7&submissionId=6&stageId=2&uploaderRoles=4096
200
```

Control: on submission 11, "Dreamwork" (author `jlockehart`), whose
Internal Review round was sent on with no revisions request, the same
"Upload" opens a window reading only "You are not allowed to add and
edit these files.". And on submission 6, "Upload revisions" on External
Review Round 1 then takes a file, and the round reads "Revisions have
been submitted and a decision is needed.".

## Cause

`SubmissionFileStageAccessPolicy::effect()`
(`lib/pkp/classes/security/authorization/internal/`) opens the two
revision file stages to an author "if an accept or request revisions
decision has been made in the latest round". For the internal stage it
takes the monograph's last Internal Review round and counts that round's
decisions of four types: `ACCEPT_INTERNAL`,
`PENDING_REVISIONS_INTERNAL`, `NEW_INTERNAL_ROUND`, `RESUBMIT_INTERNAL`.
Any count above zero permits the upload.

The count never looks at what was decided afterwards. "Send to External
Review" records `Decision::EXTERNAL_REVIEW` on the same internal round,
and the earlier `PENDING_REVISIONS_INTERNAL` is still counted. So the
round's file stage stays open to the author for good, whatever stage the
monograph is on.

The policy itself shows that sending a round to External Review is not
meant to open it: `EXTERNAL_REVIEW` is not among the counted types, and
a round whose only decision is that one refuses the author (the control
above). The rest of the code agrees.
`Repository::getActivePendingRevisionsDecision()`, which
`ReviewRound::determineStatus()` and the author's revisions notification
use, treats a revisions request as over once a later decision follows
it, `SEND_TO_PRODUCTION` apart.

The policy reads decisions, never the round's status. That matters
because OMP's `SendExternalReview` gives the internal round the status
`REVIEW_ROUND_STATUS_ACCEPTED`: below, "accepted" means an
`ACCEPT_INTERNAL` or `ACCEPT` decision, not that status.

The button is a second, separate matter. The author's "Upload" shows on
every review round whatever its state, which is the subject of
[U36-A7-author-revisions-upload-offered-then-refused.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A7-author-revisions-upload-offered-then-refused.md).
That report's fix would hide the button on this round as well, and the
server would still take the upload.

Reach:

- Both callers of the policy in modify mode take the author's file on
  such a round: `FileUploadWizardHandler` (on screen) and the REST
  API's `PKPSubmissionFileController` `add` (read in the code).
- A journal and a preprint server have no Internal Review stage and are
  not affected.
- External Review need not ask for revisions: the internal round takes
  the upload once it was sent on, whatever happens later (read in the
  code; the walk had External Review ask).
- An Internal Review round the monograph returns to ("Cancel Review
  Round" on External Review), with a revisions request from before it
  was sent on: the same count applies (read in the code, not walked).
- A declined round, internal or external, that asked for revisions
  before the decline still takes the author's upload: the count is the
  same (read in the code, not walked).
- A round with an accept decision takes the author's upload by the
  policy's own rule; that is kept.

## Proposed fix

Among the four counted decisions and "Send to External Review", let the
latest one on the internal round decide: the upload is refused when
that is "Send to External Review".
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-revision-filed-on-earlier-internal-round/fix.diff).

```diff
-                    $countDecisions = Repo::decision()->getCollector()
+                    $closingDecisions = $reviewStage === WORKFLOW_STAGE_ID_INTERNAL_REVIEW
+                        ? [Decision::EXTERNAL_REVIEW]
+                        : [];
+
+                    $lastDecision = Repo::decision()->getCollector()
                         ->filterBySubmissionIds([$submission->getId()])
                         ->filterByStageIds([$reviewRound->getStageId()])
                         ->filterByReviewRoundIds([$reviewRound->getId()])
-                        ->filterByDecisionTypes($decisionTypes)
-                        ->getCount();
+                        ->filterByDecisionTypes([...$decisionTypes, ...$closingDecisions])
+                        ->getMany()
+                        ->last();

-                    if ($countDecisions) {
+                    if ($lastDecision && in_array($lastDecision->getData('decision'), $decisionTypes)) {
```

The collector returns decisions oldest first, and
`SubmissionFileRequestedRevisionRequiredPolicy` beside it reads a
round's last decision the same way (`getMany()`, then `last()`).
Every other decision type is filtered out, so a recommendation recorded
after a revisions request does not close the round. Like the sibling
policy, the check relies on `date_decided` alone for the order.

The cases the diff leaves implicit, each read in the code:

- A round the monograph returns to. "Cancel Review Round" on External
  Review records `CANCEL_REVIEW_ROUND` on the external round and changes
  no round's status, so the internal round's latest counted decision is
  still `EXTERNAL_REVIEW`. The author is refused there until an editor
  records "Request Revisions" again. That fits what the round shows: its
  stored status is the accepted one, which the author's screen gives no
  "Upload revisions" for, and spec U71's Rule 17 records its box
  reading "Submission accepted.".
- A declined round. `DECLINE_INTERNAL` and `DECLINE` are left out of
  the closing list on purpose. A declined monograph has no other round
  waiting for the file, so nothing is misfiled. Closing on decline
  would also change a journal's External Review and would have to
  reopen on "Revert Decline". The team can add both if it wants a
  declined round closed.
- The external branch. Its closing list is empty, so the filter is the
  old one and the check equals the old count.

Tried on `main`, OMP. With it, step 6 opens "Upload Review File" reading
only "You are not allowed to add and edit these files.", no file is
stored, and "Upload revisions" on External Review Round 1 still takes
the file. Three neighbours behave the same with the fix and without
it:

- submission 17, on Internal Review, after "Request Revisions": the
  author's "Upload" takes the file;
- submission 16, on External Review, after "Request Revisions": the
  same;
- submission 11: still refused.

**Alternatives**

- Open the internal file stage only while the monograph is on Internal
  Review. It contradicts the rule the policy states: an accepted round
  takes revisions after the monograph has moved to Copyediting.
- Reuse `getActivePendingRevisionsDecision()`. It answers for revisions
  requests only and stops at an accept decision too, so it would close
  a round the policy opens on purpose.
- Hide the button only (the U36 A7 report's fix). The screen no longer
  reaches the upload, but the REST API still takes it.

**What goes with it**

- No stored data is wrong: a file already on an internal round stays
  where it is, visible to the editor.
- What changes for callers: an author's upload to the internal revision
  file stage is refused, on screen and through the REST API, once the
  round was sent to External Review. On `main` the
  `SubmissionFileStageAccessPolicy::effect` hook still runs after the
  check, so a plugin can reopen the stage.
- Backport: the block is the same on 3.5 and 3.4, so the diff applies
  there as written (not tried). Those branches have no such hook, so
  nothing can reopen the stage there. 3.3 loops over
  `EditDecisionDAO::getEditorDecisions()` and would need the same idea
  by hand; not proposed.
- Guard: pkp-lib has no test of this policy. The pkp-e2e suite takes a
  **Planned** scenario under spec U71 Rule 18: after an internal
  revisions request and "Send to External Review", the author's "Upload"
  on the internal round is refused.

Small: one method in one file.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-revision-filed-on-earlier-internal-round/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-revision-filed-on-earlier-internal-round/lib.js))
  takes steps 1 to 8 on OMP, then the author's "Upload revisions" on
  External Review Round 1 and the control on submission 11. `MODE=nb` is the neighbour run of the fix
  trial: "Request Revisions" by `dbarnes` and the author's "Upload" on
  submission 17 (Internal Review, `msmith`) and on submission 16
  (External Review, `mpower`), then the control. Each run starts from an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/author-revision-filed-on-earlier-internal-round/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix trial: `node bin/try-fix.js apply <fix.diff> omp`, then the
  walk and `MODE=nb` on `main`, and `MODE=nb` again with the fix out.
  OJS and OPS share the file and were not walked with the fix: they
  have no Internal Review stage, and for the external stage the changed
  query reads the same four decision types as before.
- The walks ran on PostgreSQL. Datasets: pkp/datasets e8dafbc
  (2026-10-02). Stored after step
  7: the file has file stage 20
  (`SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`) on the internal round;
  the internal round's decisions are 20 (`PENDING_REVISIONS_INTERNAL`)
  then 3 (`EXTERNAL_REVIEW`); the upload added no row to
  `notifications`. The emails were read in the test mailbox after the
  walks, by subject and time: one "Revised Version Uploaded" to the
  three assigned editors at the internal upload, on `main` and on 3.5.
  The author's row was read on "My Submissions" behind the open
  workflow.
- Step 6 as written is what the walk did on 3.5 and, with the fix, on
  `main`: the menu entry, then "Upload". The `main` walk without the fix
  pressed the menu entry, which opened the round, and then opened the
  same round once more by its address before "Upload". That was a
  mistaken check in the script, since corrected; the reload is not
  needed.
- Branch tips. `main`: OMP 3b0ecf794, pkp-lib 3dc90c81a6, ui-library
  280f98c5. 3.5: OMP 9c5e24246, pkp-lib cf3f984335, ui-library d4e01883.
  3.4: OMP 0aec65441, pkp-lib 32b0f4b4af. 3.3: OMP 8e72fc883, pkp-lib
  f6ab331645.
- Code reads. 3.5 and 3.4: the block of
  `SubmissionFileStageAccessPolicy::effect()` is the same as on `main`
  (3.4 received the internal decision list with f62963a918, the
  backport of `pkp/pkp-lib#11123`), and 3.4's
  `RequestRevisionsInternal` records `PENDING_REVISIONS_INTERNAL`. 3.3:
  the policy loops over the round's decisions and permits on the first
  accept, revisions request, new round or resubmit; internal and
  external rounds share those decision constants there. On 3.4 and 3.3
  `templates/authorDashboard/reviewRoundInfo.tpl` loads
  `AuthorReviewRevisionsGridHandler` on every round, built with
  `FILE_GRID_ADD` and, for an internal round, the internal revision file
  stage. 3.4 and 3.3 were not walked.
- Introduced: `git blame` on the count gives 5658dd14e4
  (`pkp/pkp-lib#11123`), which added the internal decision list;
  f75706ba57 (`pkp/pkp-lib#7265`) turned the 3.3 loop into the count;
  5f383f87c3 created the policy with the loop, so no change brought the
  fault in. Whether 3.2 had the same
  rule elsewhere was not read. Between 3.4.0 and the backport of
  `pkp/pkp-lib#11123` the internal stage was closed to authors
  altogether.
- Upstream searches (pkp/pkp-lib, pkp/omp, pkp/ui-library): the author's
  upload of revisions on an internal round after external review, a
  revision uploaded to the wrong or a previous round,
  `SubmissionFileStageAccessPolicy`, `PENDING_REVISIONS_INTERNAL`.
  `pkp/pkp-lib#13048` and `pkp/pkp-lib#8976` (both open) are about the
  author's "Upload" being refused on a round that asks for nothing,
  the U36 A7 report's subject; neither covers an upload that is taken.
- Not walked: the REST API, a round returned to from External Review, a
  declined External Review round, "Update File Details" and "Delete" on
  the misfiled file, and the fix on 3.5.
