# On a press's Internal Review, "Accept Submission" and "Create New Review Round" carry none of the author's revised files

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; the list of revisions followed the round's stage)
- **Introduced** `pkp/pkp-lib#7631` and `pkp/omp#1071` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press's Internal Review, an editor who records "Accept Submission"
or "Create New Review Round" after the author has uploaded a revised
file finds the decision's "Select Files" page reading "No items found."
under "Revisions". The decision is recorded and the revised file is not
copied: Copyediting's "Draft Files", or the new round's "Files for
Review", stays empty. On External Review the same page lists the revised
file, ticked, and the decision copies it.

After accepting, the editor can fetch the file by hand: "Draft Files" ›
"Upload/Select Files", tick "Show files from all accessible workflow
stages.", tick the file under "Internal Review", "OK". After a new
round there is no such pick: the same window on Round 2 lists nothing
under "Internal Review", so the file has to be downloaded from Round 1
and uploaded again.

## Impact

- **Lost**: nothing is deleted; the revised file stays on Round 1's
  "Revisions Uploaded". What is lost is the hand-over: the next stage
  or round opens without the manuscript the decision was made on.
- **Who**: every editor of a press that uses Internal Review, on each
  of these two decisions that follows an author's revision. "No items
  found." reads as if the author had uploaded nothing.
- **Way round**: a pick in a window after accepting; a download and a
  second upload after a new round. Nothing gets worse with time.

Medium: both decisions go through and the file can be put in place by
hand, at the cost of the editor noticing the empty list. The second
upload on Round 2 was not walked; if it proved impossible, a new
internal round could not be given the revision and this would be high.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main` (press `publicknowledge`).
- A small PDF on your disk, here `u71b-revision.pdf`.

Accepting:

1. Sign in as `dbarnes` (Press editor; the dataset assigns no editor to
   submissions 12 and 17, and he is not assigned for these steps) and
   open submission 12, "Connecting ICTs to Development", from "Active
   submissions". It opens on Internal Review, Round 1.
2. Press "Request Revisions", "Continue" where the page offers it, then
   "Record Decision".
3. Sign in as `lelder` (the author), open the submission from "My
   Submissions" and press "Upload revisions". Choose "Book Manuscript",
   upload `u71b-revision.pdf`, then "Continue", "Continue", "Complete".
   "Revisions Uploaded" lists the file.
4. Sign in as `dbarnes` and open submission 12 again. The round reads
   "Revisions have been submitted and a decision is needed." and
   "Revisions Uploaded" lists `u71b-revision.pdf`.
5. Press "Accept Submission" and "Continue" twice, to "Accept
   Submission: Select Files".
6. Press "Record Decision", then open the workflow's "Copyediting" and
   read "Draft Files".

Opening a new round:

7. Take steps 1 to 4 on submission 17, "Open Development: Networked
   Innovations in International Development", with its author `msmith`.
8. As `dbarnes`, press "Create New Review Round" and "Continue", to "New
   Review Round: Select Files".
9. Press "Record Decision", then open Internal Review › Round 2 and read
   "Files for Review".

**Expected**: at steps 5 and 8 the "Revisions" list names
`u71b-revision.pdf`, ticked. At step 6 "Draft Files" lists it, and at
step 9 Round 2's "Files for Review" lists it.

**Observed**: at steps 5 and 8 the list reads

```
Revisions
No items found.
```

Both decisions are recorded ("Submission Accepted", "Review Round
Created"). At step 6 "Draft Files" reads "No Items", and at step 9
Round 2's "Files for Review" reads "No Items".

The same steps on External Review list the file under "Revisions",
ticked, and copy it: "Accept Submission" on submission 16, "A Designer's
Log" (author `mpower`), into "Draft Files", and "Create New Review Round"
on submission 2, "The West and Beyond" (author `afinkel`), into Round
2's "Files for Review".

## Cause

`PKP\decision\types\Accept::getSteps()` and
`PKP\decision\types\NewExternalReviewRound::getSteps()` build the "Select
Files" step with External Review's file stages written in:

- `Accept.php` line 197 and `NewExternalReviewRound.php` line 170 fill
  the "Revisions" list with
  `->filterByFileStages([SubmissionFile::SUBMISSION_FILE_REVIEW_REVISION])`.
- `NewExternalReviewRound.php` line 162 names
  `SubmissionFile::SUBMISSION_FILE_REVIEW_FILE` as the stage the ticked
  files are copied to.

OMP's `AcceptFromInternal` and `NewInternalReviewRound` extend those two
classes and change only the decision's number and the trait, from
`InExternalReviewRound` to `InInternalReviewRound`. They inherit
`getSteps()` as it is. A revised file uploaded on an internal round is
stored as `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`, so the query for
`SUBMISSION_FILE_REVIEW_REVISION` on that round finds nothing, the list
is empty, and the page has nothing to copy.

Both traits already answer the question the two methods hard-code:
`getRevisionFileStage()` and `getReviewFileStage()` return the internal
or the external stage, and `getFileAttachers()` in the same classes uses
them for the email attachments. The "Select Files" step does not.

The steps came with the rewrite of the editorial decisions
(`pkp/pkp-lib#7265`). Before it, on 3.3, the decision windows loaded
their "Revisions" grid through `ReviewRevisionsGridDataProvider`, which
picked the internal or the external revision stage from the round's
stage.

Reach:

- "Accept Submission" on an internal round: checked on screen.
- "Create New Review Round" on an internal round: checked on screen.
  With only the list corrected, its copy would still go to
  `SUBMISSION_FILE_REVIEW_FILE`, External Review's stage; the copy
  request names no round, so
  `PKPSubmissionFileController::copy()` would look for the latest
  external round and answer 400 when there is none (checked in the
  code).
- "Send to External Review" from an internal round has its own list in
  OMP's `SendExternalReview` and is not touched by this fault (checked
  in the code).
- OJS and OPS have no internal round. No stored data is wrong.

## Proposed fix

Ask the trait for the stages in both `getSteps()` methods, in pkp-lib,
where the rule lives; OMP's two subclasses then get the internal stages
through `InInternalReviewRound` without a change of their own
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-round-revised-files-not-carried/fix.diff)):

The changed lines (the linked diff is complete, and also drops the
`SubmissionFile` import that `NewExternalReviewRound` no longer uses):

```diff
--- a/lib/pkp/classes/decision/types/Accept.php
+++ b/lib/pkp/classes/decision/types/Accept.php
@@ -194,7 +194,7 @@
                 ->filterBySubmissionIds([$submission->getId()])
-                ->filterByFileStages([SubmissionFile::SUBMISSION_FILE_REVIEW_REVISION])
+                ->filterByFileStages([$this->getRevisionFileStage()])
                 ->filterByReviewRoundIds([$reviewRound->getId()])
--- a/lib/pkp/classes/decision/types/NewExternalReviewRound.php
+++ b/lib/pkp/classes/decision/types/NewExternalReviewRound.php
@@ -159,7 +159,7 @@
             __('editor.submission.decision.promoteFiles.review'),
-            SubmissionFile::SUBMISSION_FILE_REVIEW_FILE,
+            $this->getReviewFileStage(),
             $submission,
@@ -167,7 +167,7 @@
                 ->filterBySubmissionIds([$submission->getId()])
-                ->filterByFileStages([SubmissionFile::SUBMISSION_FILE_REVIEW_REVISION])
+                ->filterByFileStages([$this->getRevisionFileStage()])
                 ->filterByReviewRoundIds([$reviewRound->getId()])
```

The new round's copy lands on Round 2 because the page records the
decision, which creates the round, before it sends the copies, and
`copy()` takes the latest round of the target stage. It is a proposal;
the team decides.

Tried on OMP `main`: with the fix, the Steps show the Expected. Both
"Revisions" lists name the file, ticked; "Draft Files" lists the copy,
and Round 2's "Files for Review" lists a copy stored on the internal
review-file stage of the new round. The External Review paths behave the
same with the fix in and out.

**Alternatives**

- Override `getSteps()` in OMP's `AcceptFromInternal` and
  `NewInternalReviewRound`: it works, but copies two long methods into
  the app to change three constants, and the next change to pkp-lib's
  steps would miss them.
- Correct only the two list filters: not enough, as the Cause's reach
  says of "Create New Review Round".

**What goes with it**

- Every instance: a search of `classes/decision` in pkp-lib and OMP for
  the review file-stage constants finds these three lines and four
  uses that are right as they are. The two traits define the stages.
  `Repository::revisionsUploadedSinceDecision()` (pkp-lib
  `classes/decision/Repository.php` lines 378–379) picks the revision
  stage from the decision's `stageId`. pkp-lib's `SendExternalReview`
  (line 148) and OMP's `SendInternalReview` (line 148) name the target
  stage of the review they send to. OMP's `SendExternalReview` line 44
  is a list filter on `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`: that
  decision is only taken from an internal round, so the revisions it
  offers are internal ones.
- No data repair.
- Callers: External Review on OJS and OMP gets the same stages as before
  through `InExternalReviewRound`.
- Backport: the two methods and both traits' helpers are the same on
  `stable-3_5_0` and `stable-3_4_0`, so the diff applies there as
  written apart from line numbers.
- The guard: an e2e scenario in pkp-e2e's OMP suite (a Planned item of
  spec U71) that requests revisions on an internal round, uploads as
  the author, and reads "Select Files" and the target list for both
  decisions. The fix PR need not carry it.

Small: three lines in two pkp-lib classes, following the helpers the
traits already have, and one test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-round-revised-files-not-carried/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-round-revised-files-not-carried/lib.js);
  with `MODE=nb` in front it walks instead the External Review control
  of the Steps, which the fix must leave alone, and with `MODE=wr` the
  Steps and then the way round by hand on each target list. On an
  install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`PROBE_FEATURE` is the name the install was prepared under
  with `npm run fleet-prep -- --feature <name> --dataset --reset`,
  `PROBE_AGENT` any short name for the output folder):
  `PROBE_FEATURE=<name> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/internal-round-revised-files-not-carried/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/internal-round-revised-files-not-carried/fix.diff omp`.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02); the
  fault does not depend on the database. `main`: omp 3b0ecf794 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). 3.5: omp 9c5e24246 (lib/pkp
  cf3f984335, lib/ui-library d4e01883).
- The way round, walked on `main`. After the accept, "Draft Files" ›
  "Upload/Select Files" listed "No Items" under "Copyediting"; with
  "Show files from all accessible workflow stages." ticked it listed
  `u71b-revision.pdf` under "Internal Review", and ticking it and "OK"
  put a copy in "Draft Files". After the new round, Round 2's "Files
  for Review" › "Upload/Select Files" ("Current Review Files For Round
  2") listed, with the box ticked, the six submission files under
  "Submission" and "No Items" under "Internal Review". Downloading the
  file from Round 1 and uploading it on Round 2 was not walked.
- The script also reads the stored files: after the unpatched walk the
  revision alone, on the internal revision stage of Round 1; with the fix
  a copy on the copyediting draft stage (submission 12) and a copy on
  the internal review-file stage of Round 2 (submission 17). The record
  phase sent `POST …/submissions/<id>/decisions` (200) and, with the fix
  only, `…/files/<id>/copy` (200). No server error and no script error
  in any walk.
- Code reads. `main` and 3.5 (the checkouts above): `Accept.php`,
  `NewExternalReviewRound.php`, `steps/PromoteFiles.php`, both traits,
  OMP's `AcceptFromInternal`, `NewInternalReviewRound` and
  `SendExternalReview`, `PKPSubmissionFileController::copy()` and
  `copyFile()` in
  `lib/ui-library/src/components/Container/DecisionPage.vue`. 3.4 (omp 0aec65441, lib/pkp
  32b0f4b4af): the same three lines in the two pkp-lib classes, the same
  two subclasses and trait helpers. 3.3 (omp 8e72fc883, lib/pkp
  f6ab331645): `promoteForm.tpl` and `newReviewRoundForm.tpl` load
  `SelectableReviewRevisionsGridHandler` with the round's `stageId`, and
  `ReviewRevisionsGridDataProvider` chooses
  `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` for an internal round.
- Introduced: `git blame` on the three lines names f75706ba57 in
  pkp-lib (PR `pkp/pkp-lib#7631`); OMP's two subclasses came with
  [fdfeefdb1](https://github.com/pkp/omp/commit/fdfeefdb1) (PR
  `pkp/omp#1071`) for the same issue.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/omp and pkp/ui-library,
  issues and PRs, by "internal review" with revisions, accept,
  copyediting, new round and "files for review", and by
  `getRevisionFileStage`, `AcceptFromInternal`, `NewInternalReviewRound`,
  `PromoteFiles` and the file-stage constants. `pkp/pkp-lib#1144`
  (closed, 2016) is about "Send to External Review" with no revisions,
  another fault.
- Not driven: OJS with the fix (it runs the same two pkp-lib classes
  through `InExternalReviewRound`, which the OMP External Review walk
  covers); 3.4 and 3.3.
