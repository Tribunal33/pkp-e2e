# While revisions are requested, an author cannot rename or delete a "Revisions Uploaded" file somebody else uploaded

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP (the menu entry "Update File Details" is named "Edit")
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the author is allowed there)
- **Introduced** `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#13048` (open), covering these two refusals and leaving open whether the author should be allowed. This report adds the cause and both ways to settle it. The issue also covers an "Upload" refusal that is not part of this report
- **Tracked in** spec U36 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

While a review round asks for revisions, an author who chooses "Update
File Details" on a "Revisions Uploaded" file that somebody else
uploaded, an editor for example, gets a window that shows only "The
current role does not have access to this operation." and "Close".
"Delete" on the same file answers "An unexpected error has occurred.
Please reload the page and try again." and the file stays.

The code has a rule that lets an author change every revision file of a
round that asks for revisions, whoever uploaded it. A typo has kept that
rule from ever applying since 3.4. Whether authors should have that
right is not decided: `pkp/pkp-lib#13048` asks it. The team's choice is
between correcting the typo, which restores the rule, and removing the
rule and the two menu entries.

The files the author uploaded themselves are not affected.

## Impact

- **Lost**: nothing stored. The "Delete" refusal reads like a failure of
  the app.
- **Who**: an author revising a submission whose "Revisions Uploaded"
  list holds a file an editor uploaded, or one a second author with
  their own account uploaded. Few rounds have one.
- **Way round**: the author uploads their own file beside it; an editor
  renames or deletes the other one.

Low: the revision gets done, and what fails is tidying a file somebody
else added.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (the journal
  `publicknowledge`). Its submission 13 is in a round that asks for
  revisions.
- On OMP (the press `publicknowledge`) no round asks for revisions, so
  first, as `dbarnes`, open submission 16, "A Designer's Log: Case
  Studies in Instructional Design", and press "Request Revisions". In
  the window that opens leave the first option selected ("Revisions
  will not be subject to a new round of peer reviews.") and press
  "Next", then "Continue" to the last step and "Record Decision". The
  steps then use submission 16 and its author `mpower`.
- Any small file on your computer; the steps call it `u36e-notes.txt`.

A preprint server has no review rounds, so it has no such list.

Steps:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 13, "Hydrologic Connectivity in the Edwards Aquifer
   between San Marcos Springs and Barton Springs during 2009 Drought
   Conditions". It opens on the review round.
3. Above "Revisions Uploaded" press "Upload". Choose the component
   "Article Text" ("Book Manuscript" on a press), pick
   `u36e-notes.txt`, then press "Continue", "Continue" and "Complete".
4. Sign out, sign in as the author `lkumiega` (`lkumiegalkumiega`) and
   open the submission from "My Submissions".
5. On "Revisions Uploaded" press "More Actions" on `u36e-notes.txt` and
   choose "Update File Details". [On 3.5 the entry is named "Edit".]
6. Press "Close". Press "More Actions" on the row again, choose
   "Delete" and press "OK".

**Expected**, by the rule in the code: step 5 opens "Edit a file" with
the file's name to change, and step 6 removes the file. If the team
decides against the rule, the two entries are not offered on this row.

**Observed**: at step 5 the window "Edit a file" shows only "The current
role does not have access to this operation." and "Close". At step 6
the dialog "Error" shows "An unexpected error has occurred. Please
reload the page and try again." and the file is still listed after a
reload. Both requests are answered as refusals:

```
GET  /index.php/publicknowledge/$$$call$$$/api/file/manage-file-api/edit-metadata?submissionFileId=47&submissionId=13&stageId=3
POST /index.php/publicknowledge/$$$call$$$/api/file/manage-file-api/delete-file?submissionFileId=47&submissionId=13&stageId=3

200 {"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

## Cause

A misplaced bracket inside a string makes the author's revision-round
rule deny every request.
`SubmissionFileAccessPolicy` (`lib/pkp/classes/security/authorization/`)
lets an author change a file when they uploaded it (rule 3a) "or if the
file is a file in a review round with requested revision decision" (rule
3b, `internal/SubmissionFileRequestedRevisionRequiredPolicy`). The rule
has been in the shared policy since at least 2015.

`SubmissionFileRequestedRevisionRequiredPolicy::effect()` first counts
the round's "Request Revisions" decisions:

```php
$countRevisionDecisions = Repo::decision()->getCollector()
    ->filterBySubmissionIds([$submissionFile->getData('submissionId)')])
```

`getData('submissionId)')` asks for a property that does not exist and
returns null. The collector then adds `submission_id IN (NULL)`, the
count is 0, and the policy answers deny whatever the round's decisions
are.

The line came with the editorial decisions refactor
(`pkp/pkp-lib#7265`). That change meant to keep the rule: it replaced
`EditorDecisionActionsManager::getEditorTakenActionInReviewRound()` with
the collector call, one for one, and the typo came in with the new call.
3.3 still has the old call, so rule 3b applies there.

Reach, for an author on a revision file they did not upload, in a round
whose last decision is "Request Revisions". Every caller below builds
the policy in `SUBMISSION_FILE_ACCESS_MODIFY` mode, so today each
refuses, and with the rule repaired each lets the author through:

- `PKPManageFileApiHandler`, all five operations (`editMetadata`,
  `editMetadataTab`, `saveMetadata`, `deleteFile`, `cancelFileUpload`):
  "Update File Details" and "Delete" refused on screen, `main` and 3.5,
  OJS and OMP.
- `FileUploadWizardHandler`, when a file is uploaded as a revision of an
  existing one. On screen on OJS 3.5: the author's "Upload" window
  lists the editor's file under "If you are uploading a revision of an
  existing file, please indicate which file.", and the upload is
  answered "The current role does not have access to this operation."
- `DependentFilesGridHandler` (read in the code).
- `PKPSubmissionFileController`, the REST API's edit and delete of a
  submission file (read in the code).
- A second author with their own account is refused on the first
  author's revision files the same way (read in the code).

Not affected: downloads, because in read mode the author passes by the
file's stage; and a press's internal review round, where rule 3b denies
for a second reason, its check for the file stage
`SUBMISSION_FILE_REVIEW_REVISION`
(`SUBMISSION_FILE_INTERNAL_REVIEW_REVISION` there; read in the code, not
part of this fix).

## Proposed fix

The decision comes first: should an author be able to change somebody
else's file on "Revisions Uploaded" while the round asks for revisions?
The rule as written says yes, so the recommended fix corrects the key,
in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-refused-on-editors-revision-file/fix.diff):

```diff
--- a/lib/pkp/classes/security/authorization/internal/SubmissionFileRequestedRevisionRequiredPolicy.php
+++ b/lib/pkp/classes/security/authorization/internal/SubmissionFileRequestedRevisionRequiredPolicy.php
@@ -55,7 +55,7 @@
             return AuthorizationPolicy::AUTHORIZATION_DENY;
         }
         $countRevisionDecisions = Repo::decision()->getCollector()
-            ->filterBySubmissionIds([$submissionFile->getData('submissionId)')])
+            ->filterBySubmissionIds([$submissionFile->getData('submissionId')])
             ->filterByReviewRoundIds([$reviewRound->getId()])
             ->filterByDecisionTypes([Decision::PENDING_REVISIONS])
             ->getCount();
```

Tried on `main`, OJS and OMP:

- Step 5 opens "Edit a file" with the name box, and step 6 removes the
  file from the list.
- The upload window's revise path now works for the author too: with
  the editor's `u36e-notes.txt` chosen as the file being revised, the
  author's upload replaces it. The list then shows the author's file
  under the same number, and the file's uploader is the author.
- A round that does not ask for revisions stays closed: after an
  editor's upload to "Revisions Uploaded" on OJS submission 7 and OMP
  submission 2, the author is refused at steps 5 and 6 with the fix and
  without it.

**Alternatives**

- Deciding that an author never changes somebody else's revision file:
  remove rule 3b from the modify mode in `SubmissionFileAccessPolicy`,
  and stop offering the two entries on those rows, which the other A2
  report's fix does. The "Upload" window would still list other
  people's files as revisable and refuse the upload; its list would
  need the same filter. Not tried.
- Deleting the first count instead of correcting it: the check a few
  lines below (the round's last decision is "Request Revisions")
  implies it. One query less, the same behavior. Not tried.

**What goes with it**

- What the fix touches. Compared with 3.4 and 3.5, an author gains
  edit, delete and replace on other people's revision files through the
  four handlers under Reach, the REST API included. The menu entries
  and the upload wizard were tried; `DependentFilesGridHandler` and the
  REST API were read in the code only.
- The other A2 report,
  [U36-A2-author-update-file-details-offered-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A2-author-update-file-details-offered-then-refused.md),
  hides "Update File Details" and "Delete" from an author on files they
  did not upload. If this fix lands, land it first, and that menu check
  then also lets the entries through while the round asks for
  revisions.
- Backport: the same one-line change applies to 3.5 and 3.4, where the
  line is identical (read in the code, not walked with the fix).
- Guard: pkp-lib has no test of this policy or of
  `SubmissionFileAccessPolicy` to extend; a new unit test with a round
  whose last decision is "Request Revisions" would have caught it.

Medium: the code change is one character, but it is a behavior change
in four handlers that has been absent for two releases, the menu must
follow it, and the team first answers the question `pkp/pkp-lib#13048`
leaves open. It is not large because both answers are written out here
and the recommended one was tried.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-refused-on-editors-revision-file/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-update-file-details-offered-then-refused/lib.js))
  takes the press's precondition and steps 1–6 on OJS and OMP, then
  reopens the submission and reads the list. `MODE=nb` takes the same
  steps on a round that asks for no revisions; `MODE=revise` takes
  steps 1–4 and then the author's "Upload" with the editor's file
  chosen as the one revised. Each run starts from an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/author-refused-on-editors-revision-file/walk.js`
  (`MODE=nb` or `MODE=revise` in front, `PKP_E2E_LINE=stable-3_5_0`
  for 3.5).
- The walks ran on PostgreSQL; MySQL not checked (`IN (NULL)` matches no
  row there either). Datasets: pkp/datasets c657990 (2026-10-01). On the
  press the script records "Request Revisions" through the suite's page
  object (`apps/omp/playwright/pages/ReviewStagePages.js`), which
  checks that the first option is selected and presses the buttons the
  precondition names. The recorded decisions were read in
  `edit_decisions`: OJS submission 13 and OMP submission 16 both end on
  decision 4 (`Decision::PENDING_REVISIONS`) for their round.
- The revise path was walked without the fix on OJS 3.5 only, and with
  the fix on `main`, OJS and OMP.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794; pkp-lib ddd8ab243a
  (OJS) and 3dc90c81a6 (OMP). 3.5: OJS 091fb65453, OMP 9c5e24246;
  pkp-lib cf3f984335. 3.4: OJS 75cc2d488b, OMP 0aec65441; pkp-lib
  32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883; pkp-lib f6ab331645.
- Code reads. 3.5 and 3.4:
  `SubmissionFileRequestedRevisionRequiredPolicy.php` has the same
  `getData('submissionId)')`, and `SubmissionFileAccessPolicy.php` the
  same rules 3a and 3b. 3.3: the policy calls
  `getEditorTakenActionInReviewRound($request->getContext(),
  $reviewRound, array(SUBMISSION_EDITOR_DECISION_PENDING_REVISIONS))`
  and has no such key. On `main`:
  `PKP\decision\Collector::filterBySubmissionIds()` and its
  `whereIn('submission_id', …)`, and the modify-mode callers found with
  a search for `SUBMISSION_FILE_ACCESS_MODIFY`
  (`PKPManageFileApiHandler::authorize()`,
  `FileUploadWizardHandler::authorize()`,
  `DependentFilesGridHandler::authorize()`,
  `PKPSubmissionFileController::authorize()`).
- Introduced: `git log -S"getData('submissionId)')"` on the policy
  leads to f75706ba57, whose hunk swaps the old call for the collector
  call; the blame's 7a1d039a25 (`pkp/pkp-lib#8092`) only reshaped the
  call and kept the key.
- Upstream searches (pkp/pkp-lib, pkp/ui-library): the refusal's text
  with "file" and "author", "author revision file delete",
  `SubmissionFileRequestedRevisionRequiredPolicy`,
  `SubmissionFileUploaderAccessPolicy`. `pkp/pkp-lib#13048` reports the
  refused "Delete" and "Update file details" after an editor's upload
  to the revision list (its parts 1 and 2) and says of them "I'm not
  sure if author should be allowed to do this". Its part 3 is a refused
  author "Upload" to the list; the issue does not say whether its round
  asked for revisions. The author's "Upload" of a new file was not
  walked here (their own files pass by rule 3a, read in the code); the
  "Upload" button shown on a round that
  asks for no revisions, and refused there, is spec U36's entry A7.
  `pkp/pkp-lib#10431` (closed) added a plugin hook to the author's
  rules and left this line as it was.
- Not walked: OPS, a second author's account, a press's internal review
  round, `DependentFilesGridHandler`, the REST API, the two
  alternatives, and the fix on 3.5.
