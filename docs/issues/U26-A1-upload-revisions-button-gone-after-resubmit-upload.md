# After "Resubmit for Review", the Author's "Upload revisions" button disappears with their first file

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no "Upload revisions" button)
  - 3.3: none (code; no "Upload revisions" button)
- **Introduced** `pkp/ui-library#480` for `pkp/pkp-lib#10767` · [7a3a2de3](https://github.com/pkp/ui-library/commit/7a3a2de374f36902632dd4ef5e2e20dac1b0b185) · 2025-01-08 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U26 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U26-review-stage-and-rounds.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When an editor requests revisions that will go to a new review round,
the Author's review page shows two upload buttons: "Upload revisions" in
the column to the right of the round, and "Upload" in the heading of the
"Revisions Uploaded" list. As soon as the Author uploads one file,
"Upload revisions" disappears; "Upload" stays. When revisions are
requested without a new round, both stay after the first file.

The page does not say why one button went. An Author who used "Upload
revisions" for the first file is left to conclude that no more files can
be added, or to try the other button. The fix is one line in each of two
ui-library files.

## Impact

- **Lost** No file and no work.
- **Who** Every Author asked to resubmit for a new review round, from
  their second file on.
- **Way round** "Upload" on the "Revisions Uploaded" list, on the same
  screen, opens the same upload window and takes the further files.

Low: the further files get uploaded through the other button.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 10, "Condensing Water
  Availability Models to Focus on Specific Water Management Systems"
  (author `jnovak`), is in review with reviews ready.

Steps:

1. Sign in as `dbarnes` and open submission 10
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=10`).
2. Press "Request Revisions", choose "Revisions will be subject to a new
   round of peer reviews.", press "Next", and go through the "Resubmit
   for Review" steps with "Continue" to "Record Decision".
3. Sign in as `jnovak` and, on "My Submissions", press "View" on the
   submission. "Upload revisions" shows to the right of the round and
   "Upload" on the "Revisions Uploaded" list.
4. Press "Upload revisions", choose the component "Article Text", pick a
   file, then "Continue", "Continue", "Complete".
5. Look at the page the upload window leaves.

**Expected** "Upload revisions" stays beside the round after the first
file, as it does when revisions are requested without a new round.

**Observed** When the upload window closes, the list holds the file,
the round's status reads "Revisions submitted. A new review round needs
to be created." and "Upload revisions" is gone. Opening the submission
again shows the same. "Upload" on the list still shows and opens step 1
of the upload window.

On a press (the default dataset, OMP `main`), the same steps give the
same result on submission 16, "A Designer's Log: Case Studies in
Instructional Design" (author `mpower`, component "Book Manuscript").

Control: on submission 13, whose round asks for revisions without a new
round in the dataset, `lkumiega` uploads a file through "Upload
revisions" and the button stays.

## Cause

`getActionItems()` of the review stage in ui-library's
`src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOJS.js`
adds "Upload revisions" when the selected round's `statusId` is in a
list of four. The list names
`REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED` twice and never
`REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW_SUBMITTED`:

```js
[
	pkp.const.REVIEW_ROUND_STATUS_REVISIONS_REQUESTED,
	pkp.const.REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW,
	pkp.const.REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED,
	pkp.const.REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED,
].includes(selectedReviewRound.statusId)
```

`ReviewRound::determineStatus()` turns a round with a resubmit decision
into `REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW_SUBMITTED` (15) once the
Author has uploaded a revision file, so the button's condition fails
from then on. The server still takes the upload:
`SubmissionFileStageAccessPolicy::effect()` counts the
`Decision::RESUBMIT` on the round, whatever its status.

Reach:

- A journal's and a press's external review share the list in
  `workflowConfigAuthorOJS.js` (on screen).
- A press's internal review has its own copy of the list in
  `workflowConfigAuthorOMP.js`, with the same duplicate (code; not
  walked).
- "Upload" on the "Revisions Uploaded" list has no round condition at
  all, so it stays. That it also shows where the server refuses it is another
  report:
  [U36-A7-author-revisions-upload-offered-then-refused.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A7-author-revisions-upload-offered-then-refused.md).
- Seen on the same walk and not reported yet: the Author's "Tasks"
  panel still lists "Resubmit for review." after the upload, where the
  task of a request without a new round clears. It is another fault. The
  code that clears the task on a revision upload
  (`PendingRevisionsNotificationManager`, `PKPManageFileApiHandler`)
  names `NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` only,
  never `NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT` (code; not traced
  further).

## Proposed fix

Replace the duplicate with the missing status in both lists:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-revisions-button-gone-after-resubmit-upload/fix.diff).

```diff
 					pkp.const.REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW,
 					pkp.const.REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED,
-					pkp.const.REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED,
+					pkp.const.REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW_SUBMITTED,
```

Tried on `main`, OJS and OMP. With it, "Upload revisions" stays after
the first file in the Steps. The controls are the same with and without
it: after a request without a new round the button stays, and a round
with no revisions requested and an accepted round show none.

Round 1 after the editor has opened round 2 was not walked with the fix.
By the code it changes nothing there:
`Repository::getActivePendingRevisionsDecision()` stops at the newer
decision, so `determineStatus()` gives round 1
`REVIEW_ROUND_STATUS_RESUBMIT_FOR_REVIEW` again, which the list already
holds.

**Alternatives**

- Export the list once from `src/composables/useSubmission.js`, beside
  the review assignment status lists it already exports, and use it in
  both configs. It removes the copy that let the two drift; worth doing
  together with the fix of U36-A7 (linked under Cause), which needs the
  same four statuses.

**What goes with it**

- No stored data, no API. `pkp.const` carries the status on the
  dashboard page already (`PKPDashboardHandler`).
- Backport: the diff applies to 3.5 as it is (dry run; not walked
  there).
- Test: ui-library has no unit tests for the workflow configs, so none
  goes with the fix there. In this campaign's suite, the resubmission
  scenario of spec U26 would assert the button after the first file.

Small: one line in `workflowConfigAuthorOJS.js` and one in
`workflowConfigAuthorOMP.js`.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-revisions-button-gone-after-resubmit-upload/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-revisions-upload-offered-then-refused/lib.js))
  takes the steps on OJS (submission 10) and OMP (submission 16). It
  records the two buttons, each round's `statusId` from the submission
  API's answer and the window "Upload" opens. `MODE=nb` takes the
  controls, the cases the fix must not change: OJS 13, OMP 16 with
  "Request Revisions" without a new round, OJS 7 (no revisions
  requested) and OJS 3 (an accepted round). They were run with the fix
  applied and without it.
- The walks ran on PostgreSQL. Datasets: pkp/datasets c657990
  (2026-10-01). `main` and 3.5 gave the same result on OJS and OMP. The
  page as the upload window leaves it was read on 3.5; on `main` the
  walk read the round after opening the submission again. A preprint
  server has no review rounds.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794; pkp-lib
  ddd8ab243a (OJS) and 3dc90c81a6 (OMP); ui-library 64d67363 (OJS) and
  280f98c5 (OMP). 3.5: OJS 091fb65453, OMP 9c5e24246; pkp-lib
  cf3f984335; ui-library d4e01883. 3.4 and 3.3: pkp-lib 32b0f4b4af and
  f6ab331645.
- Code reads. 3.4 and 3.3: the Author's round shows one upload link, on
  the "Revisions" grid (`AuthorReviewRevisionsGridHandler`), and no
  second button.
- Upstream searches (pkp/pkp-lib, pkp/ui-library): "Upload revisions"
  with resubmit, the button disappearing, the status constant's name.
