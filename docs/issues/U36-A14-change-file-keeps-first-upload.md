# Upload wizard: "Change File" on step 1 uploads the second file but keeps the first, and the list shows both

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (in a new galley's upload)
  - 3.5: OJS, OMP, OPS (in a new galley's upload)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02); history: `pkp/pkp-lib#2794` reported the same symptom in 2017 and was closed with a fix, which the Introduced change undid
- **Tracked in** spec U36 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a14)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In step 1 of the upload wizard, a person uploads a new file, then
presses "Change File" and picks another, expecting the second to replace
the first. The second is uploaded, but the first stays: after "Complete"
the list holds both. The first is listed under the file name it was
uploaded with and the component chosen in step 1. The wizard's own
attempt to remove the first file fails unseen, whatever the person's
role.

The person who swapped the file believes the first one is gone. It sits
on the list as a file of the submission until someone deletes it there.
On "Submission Files" that is in front of the editors; an author's
leftover on "Revisions Uploaded" is among the revised files the editors
read.

Only a new file is affected. When the upload revises an existing file,
no second row appears. On a preprint server the wizard uploads a new
galley's file, and there the first file stays stored but no screen
shows it.

## Impact

- **Lost**: nothing, and nobody is told that the first file stayed.
- **Who**: anyone who uploads a new file through the wizard and presses
  "Change File" after picking the wrong file: an editor on a stage's
  file list, an author uploading revisions.
- **Way round**: "Delete" on the first file's row, once someone notices
  it.

Medium: the swap looks done and is not, and a file the uploader took
back is shown to the others who read the list, but it can be deleted
there. The rating rests on the lists. A new galley's leftover cannot be
deleted on screen, but no screen offers it and the public download
address refuses it, so it costs storage only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OMP (the press `publicknowledge`).
- Two small files on your computer; the steps call them
  `u36c-first.pdf` and `u36c-second.pdf`.

Steps:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (on a press,
   submission 3, "The Political Economy of Workplace Injury in Canada"):
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`.
   "Submission Files" lists one file (five on the press).
3. Press "Upload" above "Submission Files". The window "Upload
   Submission File" opens on "1. Upload File".
4. Choose "Article Text" under "Article Component" (on a press, "Book
   Manuscript" under "Submission Component").
5. Press "Upload File" and pick `u36c-first.pdf`. The box reads
   "u36c-first.pdf" with a "Change File" button.
6. Press "Change File" and pick `u36c-second.pdf`. The box now reads
   "u36c-second.pdf".
7. Press "Continue", "Continue" again on "2. Review Details", then
   "Complete".
8. Read "Submission Files", reload the page and read it again.

**Expected**: the list gains one row, "u36c-second.pdf".

**Observed**: the list gains two rows, "u36c-second.pdf" and
"u36c-first.pdf", both "Article Text" ("Book Manuscript" on the press),
before and after the reload. Step 6 showed no message. At that step the
page asked the server to delete the first file and was refused:

```
POST /index.php/publicknowledge/$$$call$$$/api/file/manage-file-api/delete-file?submissionId=4&stageId=1&fileStage=2&suppressNotification=1
id=46&fileId=28&name=u36c-first.pdf&genreId=1&csrfToken=…

200 {"status":false,"content":"The current user is not authorized to access the specified submission file.","elementId":"0","events":[]}
```

The author `lkumiega` gets the same on submission 13's "Revisions
Uploaded" (opened from "My Submissions", "Upload" above the list,
"Article Text"): both files are listed after "Complete".

On a preprint server (the default dataset, OPS `main`), where the wizard
uploads a new galley's file:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), a manager there.
2. Open preprint 1, "The influence of lactation on the quantity and
   quality of cashmere production", and its "Galleys" page.
3. Press "Add galley", type the label "u36c PDF" and press "Save". The
   window "Upload a File Ready for Publication" opens by itself on
   "1. Upload File".
4. Choose "Preprint Text" under "Preprint Component", then take steps 5
   to 7 above.

**Expected**: the galley "u36c PDF" holds one file, `u36c-second.pdf`.

**Observed**: the same refused `delete-file` request at the swap. The
"Galleys" list shows "u36c PDF", which serves `u36c-second.pdf`. No
screen shows `u36c-first.pdf`; that it is still stored for the galley is
read from the database (Evidence).

## Cause

The wizard's delete request names the file in the wrong field.
`FileUploadWizardHandler.prototype.handleRemovedFiles`
(`lib/pkp/js/controllers/wizard/fileUpload/FileUploadWizardHandler.js`,
line 363) posts the first upload's stored answer (`id`, `fileId`,
`name`, `genreId`) to `ManageFileApiHandler` `deleteFile`. That answer
is `storedData`, the copy of the upload's response which
`UploaderHandler.prototype.uploadComplete` keeps on the uploader's file
entry, so it is still at hand when the second pick removes the entry.
`PKPManageFileApiHandler::authorize()` builds its
`SubmissionFileAccessPolicy` from `$args['submissionFileId']`, which the
request does not carry. The policy finds no file and refuses, whoever
asks.

The wizard's "Cancel" request, in the same handler, does it right:
`wizardCancelRequested()` sets `submissionFileId` from `id` first, under
the comment "Authorization policy expects to find the submissionFileId
para". The handler ignores the delete's answer ("There's no error
handling done for the response"), so the refusal is silent.

The submission files refactor of 2020 (`pkp/pkp-lib#6057`) brought the
mismatch. Until then the upload answered `fileId` and `revision`, and
the policy read exactly those two from the request, so the delete
worked. That had been the fix for `pkp/pkp-lib#2794` in 2017. The
refactor changed the answer to `id` and `fileId` and the policy to
`submissionFileId`; "Cancel" was adjusted, the "Change File" delete was
not.

Reach:

- Every place the wizard uploads a new file: the workflow's file lists
  on a journal and a press (on screen: "Submission Files" on both, an
  author's "Revisions Uploaded" on OJS; the other lists, a reviewer's
  attachment, a discussion's file and a dependent file open the same
  wizard, checked in the code) and a new galley's upload (on screen on
  a preprint server; a journal's "Add galley" opens the same wizard,
  checked in the code).
- A new galley's leftover is a stored file tied to the galley that the
  galley does not point at. `PreprintHandler::download()` and
  `ArticleHandler::download()` serve a file id other than the galley's
  own only when it is a dependent or media file of the galley's file,
  so readers cannot fetch it (checked in the code).
- A revision ("If you are uploading a revision of an existing file…", or
  an existing galley's "Change File") sends the same refused request.
  There the first pick stays as one of the file's earlier uploads, in
  its "History", not as a row (on screen, OJS and OMP). That leftover is
  what the open regression report on PR `pkp/pkp-lib#13288` (the fix for
  issue `pkp/pkp-lib#13286`) runs into when "Cancel" follows a second
  pick (spec U36
  [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a23));
  this report's fix leaves revisions as they are.
- Stored data: each such swap of a new file since 3.3 has left the first
  file as a submission file of its own.

## Proposed fix

A proposal: send `submissionFileId` with the delete, as "Cancel" already
does, and send no delete when the replaced upload was a revision. The
diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/fix.diff):

```diff
--- a/lib/pkp/js/controllers/wizard/fileUpload/FileUploadWizardHandler.js
+++ b/lib/pkp/js/controllers/wizard/fileUpload/FileUploadWizardHandler.js
@@ -359,7 +359,14 @@
 			if (typeof file[i].storedData === 'undefined') {
 				return;
 			}
+			// A replaced upload that revised an existing file is one of that
+			// file's revisions: deleting it would delete the file being revised.
+			if (typeof file[i].storedData.originalFile !== 'undefined') {
+				continue;
+			}
 			file[i].storedData.csrfToken = this.csrfToken_;
+			// Authorization policy expects to find the submissionFileId param
+			file[i].storedData.submissionFileId = file[i].storedData.id;
 			$.post(this.deleteUrl_, file[i].storedData);
 		}
 	};
```

The skip is needed because `deleteFile` no longer deletes one upload.
Since the refactor it calls `Repo::submissionFile()->delete()`, which
removes the submission file with every earlier upload. For a revision,
`id` is the file being revised, so the bare parameter fix would delete
the original. The upload's answer carries `originalFile` exactly when it
revised a file (`FileUploadWizardHandler::_getUploadedFileInfo()`).

The skip tests `storedData.originalFile`. `handleFileUploaded()` deletes
`originalFile` from the object it receives, but that is a second parse
of the response (`FileUploadFormHandler.handleUploadResponse`), not
`storedData`.

Tried on `main`:

- OJS, OMP and OPS, the Steps: the delete answers `status:true`, the
  list gains only "u36c-second.pdf", and the preprint's galley keeps one
  stored file.
- OJS, the author's "Revisions Uploaded": one row, "u36c-second.pdf".
  The round's status is "revisions submitted" after the first upload
  and at the end, as without the fix.
- OJS and OMP, the swap on a revision of an existing file: with the fix
  applied and with it reverted, the list keeps its number of rows and
  the revised row reads "u36c-second.pdf". With the fix no delete is
  sent.

**Alternatives**

- Reading `id` in `PKPManageFileApiHandler::authorize()` when
  `submissionFileId` is missing: it makes the handler guess for one
  caller, and a revision's first pick would then delete the whole file.
- Dropping a revision's first pick too, by posting `cancelFileUpload`
  for it before the second upload: it races the second upload and
  touches the cancel logic of `pkp/pkp-lib#13286`, so it belongs with
  that work.

**What goes with it**

- The delete that now works is the full `Repo::submissionFile()->delete()`.
  It writes the "file deleted" lines to the activity log, after the
  first upload's own lines and before the second's (on screen: two
  `submission.event.fileDeleted` entries for "u36c-first.pdf"). For a
  review-revision file it also updates the authors' pending-revisions
  notifications and the round's status, and for a copyedit file the
  copyeditor notifications. The second upload then sets them again; the
  round ended "revisions submitted" in the walk. The notifications and
  the Copyediting lists were not looked at.
- The minified `js/pkp.min.js` of each app is rebuilt, as the 2017 fix
  did.
- Backport: the handler's code is the same on 3.5, 3.4 and 3.3, and all
  three answer `originalFile` for a revision, so the diff is expected
  to apply as written (not tried there).
- Guard: pkp's Cypress tests have no "Change File" step; one in the
  file-upload test would have caught it. This campaign's e2e scenario is
  a **Planned** item in spec U36.

Small: two statements in one JavaScript handler, following the "Cancel"
request beside it, plus the rebuilt bundle; no API, hook or other screen
changes. Leftovers already stored need no repair: those on a list are
ordinary rows a person can delete, and a galley's are left as unused
storage.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/change-file-keeps-first-upload/lib.js))
  takes steps 1 to 8 on OJS and OMP and the preprint steps on OPS. It
  records the list, the wizard's requests with their answers and the
  submission's stored files. `MODE=rev` takes the author's "Revisions
  Uploaded" on OJS, and `MODE=nb` the swap on a revision of the
  dataset's own file (OJS, OMP). Each run starts from an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/change-file-keeps-first-upload/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Where the walk differs from the Steps: it opens the submission by its
  address, and it hands each file to the upload box's file input
  instead of pressing the button. It generates both PDFs.
- The stored files, the round's status and the activity log's new lines
  are read from the database (`submission_files` with
  `submission_file_revisions`, `review_rounds.status`, `event_log`). On
  OPS the new galley (id 21) had two `submission_files` rows of the
  proof stage tied to it, `u36c-first.pdf` and `u36c-second.pdf`, and
  `publication_galleys.submission_file_id` named the second.
- The walks ran in Chromium on PostgreSQL (nothing here depends on the
  database). Datasets: pkp/datasets c657990 (2026-10-01). `main` and
  3.5 gave the same result on all three apps. "Revisions Uploaded" was
  walked on `main` only.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS). 3.5: OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335. 3.4:
  OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b; pkp-lib 32b0f4b4af.
  3.3: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161; pkp-lib
  f6ab331645.
- Code reads. 3.5, 3.4 and 3.3: `handleRemovedFiles` posts `storedData`
  with only the CSRF token added, `PKPManageFileApiHandler::authorize()`
  reads `$args['submissionFileId']`, and `_getUploadedFileInfo()`
  answers `id`, `fileId`, `name`, `genreId` (plus `originalFile` for a
  revision), as on `main`. 3.4 and 3.3 were not walked.
- Introduced: `git log -S` on the policy's `$args['submissionFileId']`
  and on the answer's `'id' => $uploadedFile->getId()` both lead to
  5f383f87c3 (and its follow-up 8d03181972); its diff replaces the
  answer's `fileId`/`revision` and the policy's `fileId`-`revision`
  lookup. The delete request itself dates from d2ac5eb089 (2016) and got
  its CSRF token in b80633eab4 (2017, `pkp/pkp-lib#2794`). That it
  worked between 2017 and 3.3 is read from the code and that issue, not
  walked on 3.2.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library): "Change File" with the upload wizard, the refusal's
  text, `handleRemovedFiles`, `FilesRemoved`, `deleteUrl`, and the
  symptom's words. `pkp/pkp-lib#2922` (closed) is a corrupted galley
  file after "Change file" and a cancel on 3.0; `pkp/pkp-lib#13286`
  (open) is the cancel of a revision.
- Not looked at: a press's publication format files; whether an editor
  can reach a galley's leftover through the REST API; the two
  alternatives.
