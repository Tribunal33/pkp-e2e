# "Change File" in the upload window keeps the replaced file as an extra file

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-11-13 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a14)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

In step 1 of the upload wizard, "Change File" should replace the file
just uploaded. It uploads the new one, but the first stays: after
"Complete" the list holds both, the first under its own name and the
component chosen in step 1. When "Change File" is pressed, the window
asks the server to delete the first file; the server refuses, for every
role, and nothing on screen says so.

On a file list the kept file looks like any other, and whatever happens
next to that list includes it. On "Submission Files", "Send for Review"
offers it ticked for copying to the review files, and a reviewer
assigned there gets every review file unless the editor unticks it.
Deleting the row removes it.

Two cases leave a copy no list shows. Swapping picks while revising a
file stores the first pick as one of the file's earlier versions. On a
galley's first file, the galley serves the second pick, and the first
stays stored on the server without being offered to anyone.

## Impact

- **Lost:** nothing. A file the person discarded is kept, and on a file
  list it is shown and passed on as if it had been submitted.
- **Who:** anyone who uploads through the upload window: editors and
  assistants on every workflow file list, authors sending revisions, a
  galley's file on a journal or a preprint server. It happens whenever
  they swap their first pick with "Change File" before going on.
- **Way round:** delete the extra row from the list once someone
  notices it, before a decision copies it on. A copy kept among a
  file's versions, or stored with a galley, has no screen to delete it
  from; readers and reviewers are not offered it.

Medium: the upload looks done and the discarded file stays on the
submission, reaching reviewers by default from "Submission Files". It
would be high if a walk showed reviewers receiving it without an
editor's screen listing it first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP, OPS).
- Four small PDF files: `u36r16-first.pdf`, `u36r16-second.pdf`,
  `u36r16-rev-one.pdf`, `u36r16-rev-two.pdf`.

**A new file (OJS, OMP):**

1. Sign in as `dbarnes`.
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (OMP: submission 8,
   "Editorial"), in the Submission stage:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`
   (OMP `…=8`).
3. Under "Submission Files", press "Upload". The window "Upload
   Submission File" opens on "1. Upload File".
4. Leave "This is not a revision of an existing file", choose "Article
   Text" under "Article Component" (OMP: "Book Manuscript" under
   "Submission Component") and pick `u36r16-first.pdf`. Wait until its
   name shows beside "Change File".
5. Press "Change File" and pick `u36r16-second.pdf`. Wait until its name
   shows.
6. Press "Continue", "Continue", then "Complete".
7. Read "Submission Files".

**Expected:** one new row, `u36r16-second.pdf`, beside the dataset's
file.

**Observed:** both new rows:

```
NO  FILE NAME                 TYPE
47  u36r16-second.pdf         Article Text
46  u36r16-first.pdf          Article Text
17  Computer Skill Requirements … Practice.pdf   Article Text
```

(OMP: 146 `u36r16-second.pdf`, 145 `u36r16-first.pdf`, 60 `note.pdf`,
all "Book Manuscript".) Pressing "Change File" sent this request, and
the window showed nothing:

```
POST …/$$$call$$$/api/file/manage-file-api/delete-file?submissionId=4&stageId=1&fileStage=2&suppressNotification=1
id=46&fileId=28&name=u36r16-first.pdf&genreId=1&csrfToken=…

200 {"status":false,"content":"The current user is not authorized to access the specified submission file.","elementId":"0","events":[]}
```

**Revising a file (OJS, OMP):**

1. As in steps 1 to 3 above.
2. Under "If you are uploading a revision of an existing file, please
   indicate which file.", choose the dataset's file ("Computer Skill
   Requirements … Practice.pdf"; OMP `note.pdf`) and pick
   `u36r16-rev-one.pdf`. Wait.
3. Press "Change File" and pick `u36r16-rev-two.pdf`. Wait.
4. Press "Continue", "Continue", then "Complete".

**Expected:** the file keeps its row and number and reads
`u36r16-rev-two.pdf`; its versions are the original and
`u36r16-rev-two.pdf`.

**Observed:** the row is as expected, but the file has three versions:
`u36r16-rev-two.pdf`, `u36r16-rev-one.pdf`, the original (the query in
Evidence lists them).

**A galley's first file (OJS, OPS):**

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (OPS:
   submission 1, "The influence of lactation on the quantity and
   quality of cashmere production"), and its "Galleys" page from the
   side menu.
3. Press "Add galley", type the label `u36r16`, press "Save". The window
   "Upload a File Ready for Publication" opens.
4. Choose "Article Text" (OPS: "Preprint Text") as the component and
   pick `u36r16-first.pdf`; wait. Press "Change File" and pick
   `u36r16-second.pdf`; wait.
5. Press "Continue", "Continue", then "Complete".

**Expected:** the galley `u36r16` serves `u36r16-second.pdf`, and
nothing else is stored for it.

**Observed:** the galley list shows `u36r16`, and the galley serves
`u36r16-second.pdf`. The same delete request was refused, and
`u36r16-first.pdf` stays stored as a second file of that galley, with
its file on disk (the query in Evidence shows it).

## Cause

`FileUploadWizardHandler.prototype.handleRemovedFiles()` in
`lib/pkp/js/controllers/wizard/fileUpload/FileUploadWizardHandler.js`
(line 347) runs when "Change File" drops the earlier pick. It posts
that pick's data to `deleteFile()`:

```js
file[i].storedData.csrfToken = this.csrfToken_;
$.post(this.deleteUrl_, file[i].storedData);
```

`storedData` is the `uploadedFile` object of the upload's answer, which
`UploaderHandler.uploadComplete()` keeps on the dropped file. It names
the submission file `id` (`FileUploadWizardHandler::_getUploadedFileInfo()`).
`PKPManageFileApiHandler::authorize()` builds its
`SubmissionFileAccessPolicy` from `(int) $args['submissionFileId']`,
which is absent, so the policy looks for submission file 0 and refuses
every user.

The submission files refactor (`pkp/pkp-lib#6057`, 5f383f87c3) made
that mismatch. It replaced the file id and revision pair with
submission file ids: `deleteFile()` began authorizing on
`submissionFileId`, and the upload answer began naming the file `id`.
The same commit added `submissionFileId = id` to the wizard's "Cancel"
(`wizardCancelRequested()`) but not to "Change File". Through 3.2 the
answer carried `fileId` and `revision`, and `deleteFile()` authorized
on them and deleted that one revision, so "Change File" removed the
earlier pick.

Reach:

- Every window built on the upload wizard: the workflow file lists'
  "Upload", the review round's and the author's revision uploads, the
  Copyediting and Production windows, and on OJS and OPS a galley's
  first file and its "Change File" (the same page script; walked on
  "Submission Files" and on a galley's first file).
- A revision (walked): the earlier pick stays as a version of the file.
  "Cancel" after such a swap then restores that earlier pick instead of
  the original: the separate open regression of `pkp/pkp-lib#13288`
  ([U36 A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a23)),
  which needs this refusal to leave the pick in place.
- Review (code): "Send for Review" (`SendExternalReview::withFilePromotionLists()`)
  lists every "Submission Files" file ticked, and a new review
  assignment gives the reviewer every review file unless unticked
  (`LimitReviewFilesGridHandler::isDataElementSelected()`).
- A related fault in the undo itself (walked on OJS `main`): "Cancel"
  after the first pick of a new journal galley's file answers 500.
  `PKPManageFileApiHandler::cancelFileUpload()` (line 96) removes a new
  file by deleting its stored file and leaving the database cascade to
  remove the submission file. OJS's `publication_galleys.submission_file_id`
  has no delete rule, so the cascade is refused
  (`publication_galleys_submission_file_id_foreign`) after the file on
  disk is already gone. The galley then points at a submission file
  with no file behind it, and the window stays open. OPS sets that
  column to null, so OPS is not affected.
- Stored data: every "Change File" since 3.3.0 has left one such file.
  They cannot be told apart from files kept on purpose.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/fix.diff),
applied to OJS, OMP and OPS. With it, "Change File" sent
`cancel-file-upload` for the first pick and got `status:true`:

- "Submission Files" held only `u36r16-second.pdf` beside the dataset's
  file (OJS, OMP).
- The OJS and OPS galleys kept only their second file, and the first
  pick's row and file were gone.
- Revising the dataset's file kept its row, number and original
  version, and dropped `u36r16-rev-one.pdf` from its versions.
- "Cancel" after one pick on a new galley (OJS, OPS) removed the file,
  and the galley was left with no file, as expected.
- No request answered a server error. On the OJS galley, no log line
  of the undone uploads remained.

Recommended, in two parts:

1. In the page script, have "Change File" undo the earlier pick the way
   "Cancel" does, through `cancelFileUpload()`, with the parameter the
   policy reads:

   ```diff
    			file[i].storedData.csrfToken = this.csrfToken_;
   -			$.post(this.deleteUrl_, file[i].storedData);
   +			// Authorization policy expects to find the submissionFileId param
   +			file[i].storedData.submissionFileId = file[i].storedData.id;
   +			$.post(this.cancelUrl_, file[i].storedData);
   ```

2. In `cancelFileUpload()`, remove a first upload through
   `Repo::submissionFile()->delete()` instead of the cascade. That call
   clears what points at the file (a journal galley's link, dependent
   files, notes) before the file itself goes. Then remove the log
   lines that deletion wrote:

   ```diff
   -        // Remove uploaded file
   -        app()->get('file')->delete($fileIdToCancel);
   +        if ($previousRevision) {
   +            // Remove uploaded file
   +            app()->get('file')->delete($fileIdToCancel);
   +        } else {
   +            Repo::submissionFile()->delete($submissionFile);
   +            Repo::submissionFile()->deleteRevisionLogEntries($submissionFile, $fileIdToCancel);
   +        }
   ```

`cancelFileUpload()` is the operation that undoes one upload. For a
revision it puts the replaced version back and deletes only the upload.
On `main` it takes that version's name and uploader from the session,
where `FileUploadWizardHandler::uploadFile()` records them at each
revision upload. The undo consumes that record, and the second pick's
upload records the restored original afresh, so a later "Cancel" still
goes back to the original. Part 2 also fixes the "Cancel" failure on a
journal galley described under Cause.

**Alternatives:**

- Adding only `submissionFileId` and keeping `deleteFile()`: fixes new
  files, but on a revision `deleteFile()` deletes the whole submission
  file, the original version included. Not this.
- Making `deleteFile()` also accept `id`: the same loss on revisions,
  and a second parameter name for one policy.
- Part 1 alone: on an OJS galley's first file the undo fails like
  "Cancel" does (tried: 500, the first pick's row kept with its file
  gone).

**What goes with it:**

- `deleteUrl` then has no user in the wizard: drop the option from
  `fileUploadWizard.tpl` and the handler, and the TODO in
  `FileUploadFormHandler.handleRemovedFiles()` that speaks of it.
- The undo and the second pick's upload are sent one after the other
  with no wait between them, so a server running requests in parallel
  may take the upload first. On a revision on `main` the undo is then
  refused, since the file no longer points at the first pick, and the
  first pick stays as today. On 3.5 and earlier `cancelFileUpload()`
  only checks that the posted file is one of the versions. It would
  put the posted original back as the current file and delete the
  first pick, leaving the second pick as an unused version while the
  list shows the original. Starting the upload from the undo's answer
  (plupload's `start()` in the `$.post` callback) removes the race on
  every branch. A backport needs it, or `main`'s check that the
  cancelled file is the current one.
- On 3.5 and earlier the posted `originalFile` is what the undo
  restores. It is already in `storedData`, in the same shape "Cancel"
  posts. Removing the undone upload's log lines is `main`-only, and
  part 2 needs adapting there: those branches have no
  `$previousRevision` and take the new-file case when no
  `originalFile` is posted.
- Guard: an e2e case in the submission-files spec. "Change File" on
  step 1, then "Complete", leaves one new file. On a revision, the file
  keeps its original version and not the discarded pick. On an OJS
  galley, "Cancel" after the first pick leaves the galley without a
  file and answers no error.

Medium: two changes in pkp-lib, the page script and the server's
cancel, and a cancelled new file now goes through the regular delete
and its hooks; tried on the three apps.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js),
  `node bin/probe.js all shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js`.
  `NEIGHBOUR=1` in front adds the revision on OJS and OMP and a
  galley's "Cancel" after one pick; `PATH_GROUP=galley` takes OJS
  through a galley's first file. It records each upload, delete and
  cancel request with what it posted and the answer. It also reads
  from the database which files are stored, which file each galley
  points at, and whether each pick's file is on disk. The fix trial is
  the same command with the diff applied:
  `node bin/try-fix.js apply shared/playwright/checks/issues/change-file-keeps-first-upload/fix.diff ojs omp ops`,
  then `node bin/try-fix.js revert ojs omp ops`.
- Queries for what no screen shows (PostgreSQL, the default dataset's
  schema):
  - A galley's files, and the one it serves:
    `SELECT sf.submission_file_id, sfs.setting_value AS name, g.submission_file_id AS served FROM submission_files sf JOIN submission_file_settings sfs ON sfs.submission_file_id = sf.submission_file_id AND sfs.setting_name = 'name' AND sfs.locale = 'en' JOIN publication_galleys g ON g.galley_id = sf.assoc_id WHERE sf.assoc_type = 521 AND g.label = 'u36r16';`
  - A file's versions, newest first:
    `SELECT file_id FROM submission_file_revisions WHERE submission_file_id = 17 ORDER BY revision_id DESC;`
    (OMP: 60).
- The walks ran in headless Chromium on PHP 8.3's built-in server,
  which handles one request at a time, on PKP's default datasets from
  pkp/datasets 38ab955 (2026-09-30), PostgreSQL:
  - `main`: the new file on OJS and OMP; the galley on OJS and OPS; the
    revision on OJS and OMP. Each was walked with the fix out and in.
  - 3.5: the new file on OJS and OMP, and the galley on OPS, with the
    same refused request and the same kept files.
  - The OJS galley's "Cancel" after one pick answered 500
    (`SQLSTATE[23503]` on `publication_galleys_submission_file_id_foreign`
    in the server log). That walk had only part 1 of the fix applied,
    which does not touch "Cancel"'s request. Part 1 alone also made
    "Change File" on the OJS galley answer the same 500. There were no
    other server errors, and no page script failed.
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc); OMP 3b0ecf794 and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6); ui-library 280f98c5.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd
    (pkp-lib a9c76aed62).
  - stable-3_4_0: OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b
    (pkp-lib df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161
    (pkp-lib d446601ebe).
- Code reads:
  - main and 3.5:
    - `FileUploadWizardHandler.js`: `handleRemovedFiles()` and
      `wizardCancelRequested()`.
    - `FileUploadFormHandler.js`.
    - `UploaderHandler.js`: `startUpload()` drops the earlier pick
      before starting the next upload, and `uploadComplete()` keeps
      `storedData`.
    - `fileUploadWizard.tpl`.
    - `PKPManageFileApiHandler`: `authorize()`, `deleteFile()` and
      `cancelFileUpload()`.
    - `FileUploadWizardHandler`: `uploadFile()` and
      `_getUploadedFileInfo()`.
    - `PKPFileService::delete()`: the disk file goes before the row.
    - `Repo::submissionFile()`: `delete()` and
      `deleteRevisionLogEntries()`, and OJS's and OPS's
      `deleteRelatedSubmissionFileObjects()`.
    - The `publication_galleys.submission_file_id` foreign keys:
      `OJSMigration.php` with no delete rule, `OPSMigration.php` with
      `SET NULL`.
    - `SendExternalReview::withFilePromotionLists()`, and
      `PromoteFiles::addFileList()` selecting by default.
    - `LimitReviewFilesGridHandler::isDataElementSelected()`.
    - ui-library `useGalleyManagerActions.js`: a new galley's file goes
      through the same wizard.
  - 3.4 and 3.3:
    - The same `handleRemovedFiles()` line.
    - The same `submissionFileId` policy argument, and `id` in the
      upload answer.
    - A `cancelFileUpload()` that reads the posted `fileId` and
      `originalFile` and checks only that the file is one of the
      versions.
  - 3.2, the parent of 5f383f87c3: the upload answer carried `fileId`
    and `revision`, and `deleteFile()` authorized on them and called
    `deleteRevisionById()`. Kind "regression" rests on this read, and
    3.2 was not walked.
- Introduced: `git blame` on the `$.post(this.deleteUrl_, …)` line
  leads to 2016 code (d2ac5eb0894), which was right then. The policy
  argument and the `id` key both come from 5f383f87c3, whose PR is
  `pkp/pkp-lib#6292` (merged 2020-11-13). It was first released in
  3.3.0.
- Upstream (2026-09-30):
  - pkp/pkp-lib was searched for "change file" with upload wizard,
    `handleRemovedFiles`, "deleteFile submissionFileId", the refusal's
    text, and duplicate or orphan files after an upload.
  - pkp/ojs, pkp/omp and pkp/ui-library were searched for "change
    file".
  - `pkp/pkp-lib#2922` (a 3.0 galley upload after "Change file",
    closed), `#12349` (galley revisions offered past files) and
    `#12927` (a data change event after upload) were read. None is
    this fault.
- Unverified:
  - A reviewer receiving the kept file: read in the code, not walked.
  - The order of the undo and the next upload on a server that runs
    requests in parallel.
  - The 3.5 outcome of that race, which is read in the code.
  - Whether "Cancel" on a new journal galley fails on 3.5.
  - MySQL not checked.
- Not driven: the author's and the review round's windows; 3.4 and 3.3
  (read in the code).
