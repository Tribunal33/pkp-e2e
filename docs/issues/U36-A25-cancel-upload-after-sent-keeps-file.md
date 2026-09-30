# An author's "Cancel upload" pressed after the whole file has been sent keeps the file in the submission

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ui-library#118` for `pkp/pkp-lib#6057` · [5cf37c989a](https://github.com/pkp/ui-library/commit/5cf37c989afe79c2a401b09c2d6c97e41ad1f4d5) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a25)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

In the submission wizard's "Upload Files" step, an author who presses
"Cancel upload" on a file expects the file to be dropped, and its row
goes at once without a question. If the author presses it after the
whole file has been sent but before the server has answered, only the
row goes: the server has already stored the file, and the file goes in
with the submission. Nothing says so.

That gap lasts while a slow connection or a busy server holds the
answer back, with the bar full and "Cancel upload" still offered.
The file shows again only once the draft is reloaded or reopened, and
after "Submit" the author can no longer remove it. When the editor
sends the submission for review, the file is offered to the reviewers
ticked. A preprint server's wizard has no such panel.

## Impact

- **Lost.** Control over what is submitted. A file the author cancelled
  is submitted, and nobody is told. "Send for Review" ("Send to Internal
  Review" and "Send to External Review" on a press) lists every
  submission file ticked, and "Add
  Reviewer" gives the reviewer every review file ticked. So unless the
  editor unticks it, the file reaches the reviewers. Under anonymous
  review, a copy carrying the authors' names reveals them.
- **Who.** Authors of a journal or press who press "Cancel upload" once
  the bar is full. A large file over a slow connection, or a busy
  server, holds that moment open for seconds; on a fast connection it
  is a fraction of a second.
- **Way round.** Before "Submit": reload the "Upload Files" step, which
  lists the file again, with "Remove". Without a reload, "Review" does
  not list it. After "Submit", the author's "Submission Files" list
  offers no delete, and only an editor can remove it. Nothing gets
  worse with time.

Medium: the cancel looks done and is not, and by default the cancelled
file goes on to the reviewers, where under anonymous review it can
reveal the authors. It needs a press in a short window, and an author
who reloads before submitting can remove it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (for OMP `main`, the press),
  freshly loaded. The author starts a new submission of their own.
- Chrome (or another Chromium browser) with its developer tools, and any
  small file, here "u36r17-article.pdf". The throttling in step 4 stands
  for a slow connection or a busy server: the file goes at once and the
  server's answer comes slowly.

1. Sign in as `amwandenga` (`aclark` on the press).
2. Type the address `/index.php/publicknowledge/en/submission`; the page
   "Make a Submission" opens.
3. Choose "English", type the title "u36r17 cancel", leave the section
   at "Articles" (on the press, choose "Monograph: Authors are associated
   with the book as a whole."), tick "Yes, my submission meets all of
   these requirements." and "Yes, I agree to have my data collected and
   stored according to the privacy statement.", and press "Begin
   Submission". The wizard opens on "Upload Files" [3.5: it opens on
   "Details"; press "Continue" once].
4. Open the developer tools (F12), tab "Network". In the throttling menu
   choose "Add…" and add a profile "slow answer": Download 1 kbit/s,
   Upload 100000 kbit/s, Latency 0 ms. Choose it.
5. Press "Add File" and choose "u36r17-article.pdf". Its row shows the
   name, a progress bar and "Cancel upload". Within a second the bar is
   full; the name is still plain text and "Cancel upload" is still there.
6. Press "Cancel upload".
7. Wait a minute, choose "No throttling" in the same menu, and reload
   the page. The wait changes nothing today, since the server has
   already answered; it lets a fix that deletes the file on the slowed
   answer receive it. The wizard reopens on "Upload Files" [3.5: on
   "Details"; press "Continue" once].
8. Press "Continue" until "Review" is the current step.

**Expected:** at step 6 the row goes and the step reads "Upload any
files the editorial team will need to evaluate your submission.". At
step 7 it still reads so, and at step 8 "Review" lists no file.

**Observed:** step 6 is as expected. At step 7 the step lists the
cancelled file again:

```
u36r17-article.pdf   Edit   Remove
What kind of file is this?   Article Text   Other
```

("Book Manuscript", "Chapter Manuscript" and "Other" on the press.) At
step 8 "Review" shows under "Files" "You must upload at least one Article
Text file." and "u36r17-article.pdf". The server had stored the file and
answered before "Cancel upload" was pressed; the browser then abandoned
the request, so the page never read the answer:

```
POST /index.php/publicknowledge/api/v1/submissions/21/files
server: 200, logged before "Cancel upload" was pressed
browser: net::ERR_ABORTED once "Cancel upload" was pressed
```

No request answered an error and the page's script raised none.

Control: with the throttling the other way round (Upload 1 kbit/s,
Download unthrottled), "Cancel upload" pressed as soon as the row shows,
while the file is still on its way, keeps nothing: after a reload the
cancelled file is not listed.

## Cause

ui-library's `FileUploader.vue` `cancelUpload()` (line 144), which the
panel's `SubmissionFilesListPanel.vue` `cancelUpload()` (line 195) calls
for the row's "Cancel upload", hands the file to Dropzone's
`removeFile()`. For a file still uploading, Dropzone aborts the request
and the component drops the row. Nothing is sent to the server, and the
row's id is Dropzone's own, not a submission file id.

Aborting is enough while the file is on its way: the server never gets a
whole request, and nothing is stored. Once the last byte has been sent,
it is too late. pkp-lib's `PKPSubmissionFileController::add()`
(`api/v1/submissions/PKPSubmissionFileController.php`, line 317) runs as
soon as the server holds the whole request. It stores the file (line
340) and its submission file record (line 427) before it writes any
answer, and nothing in it notices a browser that has gone. So the abort
only stops the page from hearing the answer, which carries the new
file's id, and the page never deletes what was stored.

The panel's `cancelUpload()` promises otherwise. Its comment opens
"Cancel an upload in progress or completed but not yet saved as a
submission file", but on this API an upload is saved as a submission
file as soon as it completes, and the same comment goes on "This will
not remove a file once it has been uploaded.". The row keeps offering
"Cancel upload" until the answer arrives, so the author cannot tell the
two cases apart. The method came with the panel in the introducing
commit, for the move of the wizard's files to the submission file API,
which stores a file on upload.

Reach:

- The wizard's "Upload Files" step is the panel's only user
  (`PKPSubmissionHandler::getSubmissionFilesListPanel()`), in OJS and OMP
  (seen on screen).
- No other user of `FileUploader.vue` calls its `cancelUpload()`:
  `FileAttacherUpload.vue`'s "Cancel Upload" only drops the file from
  its own list, and the JATS upload offers no cancel (read in the code).
- Where the file goes next (read in the code, `main`, 3.5 and 3.4 the
  same): `SendExternalReview::withFilePromotionLists()` (OMP's own
  `SendExternalReview` and `SendInternalReview` alike) adds every
  submission-stage file to the decision's file step with `PromoteFiles::addFileList()`, whose
  `$selectedByDefault` is `true`, and `LimitReviewFilesGridHandler::isDataElementSelected()`
  ticks every review file for a new reviewer.
- The wizard's "Review" step lists `components.submissionFiles.items`
  (`review-files.tpl`), the page's own list, so it shows the file only
  after a reload (read in the code, not driven).
- After "Submit", the author's workflow "Submission Files" list
  (`useFileManagerConfig.js` `SUBMISSION_FILES`) allows an author only
  to list, edit and download, not delete (read in the code, `main` and
  3.5).
- Stored data: files kept this way are ordinary submission files that
  their authors did not want; nothing tells them apart from others, and
  there is nothing to repair.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/fix.diff),
applied to OJS and OMP. With the fix, the Steps show the Expected: the
row goes at step 6, the page deletes the stored file once the slowed
answer arrives (`DELETE …/files/46?stageId=1`, 200), and after the
reload the step is empty and "Review" lists no file. An upload that was
not cancelled was kept, and a cancel while the file was still on its way
aborted the upload and sent no delete, as without the fix.

Recommended: once the whole file has been sent, let the upload finish
instead of aborting it, and delete what the server stored when its
answer arrives. That is what the panel's comment already promises for an
upload "completed but not yet saved". In `FileUploader.vue`:

```diff
 		cancelUpload(id) {
 			const file = this.$refs.dropzone.dropzone.files.find(
 				(f) => f.upload.uuid === id,
 			);
-			if (file) {
-				this.$refs.dropzone.removeFile(file);
+			if (!file) {
+				return;
+			}
+			if (
+				file.status === 'uploading' &&
+				file.upload.total &&
+				file.upload.bytesSent >= file.upload.total
+			) {
+				file.isCancelled = true;
+				this.$emit(
+					'updated:files',
+					this.files.filter((item) => item.id !== id),
+				);
+				return;
 			}
+			this.$refs.dropzone.removeFile(file);
 		},
```

For such a file, `dropzoneSuccess()` then emits a new `cancelled` event
with the answer, and `dropzoneError()` removes it from Dropzone without
emitting anything. `SubmissionFilesListPanel.vue` handles `cancelled`
with `removeCancelledUpload()`, which sends the same `DELETE` request as
its `remove()`, without the confirmation. The row still goes at once, as
authors expect.

**Alternatives:**

- Hide "Cancel upload" once the bar is full and keep the row until the
  answer, which then shows "Remove". Simpler and honest, but the author
  who changed their mind must wait and remove the file themselves.
- Stop on the server when the browser has gone. PHP notices a
  disconnected browser only when it writes, after the file is stored, so
  the server cannot tell in time.

**What goes with it:**

- Only the wizard's panel changes: no other caller uses
  `cancelUpload()`, and no REST API or plugin hook changes.
- Limits the fix keeps: the page learns the file's id only from the
  answer. An author who reloads or leaves before it arrives still leaves
  the file stored. So does an answer held past the upload's time limit:
  the panel gives Dropzone `max_execution_time` × 1000 ms as its
  `timeout`, a timed-out request ends in `dropzoneError()`, and the fix
  then drops the file without deleting it (read in the code, not
  driven).
- Backport: `stable-3_5_0` and `stable-3_4_0` have the same
  `cancelUpload()` and panel. The diff applies there except its
  `dropzoneError()` hunk, whose context differs (the error parsing is
  written out in place), so that hunk needs adapting. On `stable-3_3_0`
  the panel embeds Dropzone itself (`dropzoneCancelUpload()`, no
  `FileUploader.vue`), so the change goes into the panel.
- Guard: an end-to-end test of the wizard's "Cancel upload" with the
  answer held back (a throttled download, as in the Steps) that expects
  an empty step after a reload.

Small: a few lines in two neighbouring ui-library components, and a
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says). `NEIGHBOUR=1` in front adds the paths the fix must leave
  alone: an upload left to finish, and a cancel while the upload itself
  is throttled.
- How the walk timed step 6: it sets step 4's numbers through the
  browser's DevTools protocol (`Network.emulateNetworkConditions`,
  download 125 bytes/s, upload 12 500 000 bytes/s, latency 0), waits
  until the row's progress bar reads 100, then one more second, and
  presses "Cancel upload". With the fix in, the answer (1556 bytes on
  OJS, 1278 on OMP) arrived and the delete followed 24 s (OJS) and 12 s
  (OMP) after the upload started. The throttling is Chromium's
  emulation on a local connection; a real slow link was not tried.
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/fix.diff ojs omp`,
  walk.js with `NEIGHBOUR=1`, then `node bin/try-fix.js revert ojs omp`.
  Without the fix, the two neighbour paths gave the same results.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6); lib/ui-library 280f98c5 in both.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d (lib/pkp a9c76aed62,
    lib/ui-library 1a7a4750). Same result as on `main`;
    `FileUploader.vue` `cancelUpload()` and the panel read as on `main`,
    and `PKPSubmissionFileController::add()` stores before answering.
  - OPS not walked (no such panel).
  - The fault is in the page's script and does not depend on the
    database.
- 3.4, code: `stable-3_4_0` of OJS (9571d8fde7), OMP (0aec65441f),
  pkp-lib (df13621c2d) and ui-library (ee684b34): `FileUploader.vue`
  `cancelUpload()` the same, the panel's `cancelUpload()` calling it,
  `PKPSubmissionHandler::getSubmissionFilesListPanel()` building the
  wizard's panel, and `PKPSubmissionFileHandler::add()` storing the file
  through `Services::get('file')->add()` before it answers.
  `PromoteFiles::addFileList()` ticks by default there too.
- 3.3, code: `stable-3_3_0` of OJS (9fdb9bcf9a), OMP (8e72fc8836),
  pkp-lib (d446601ebe) and ui-library (96959f9e): the panel's
  `dropzoneCancelUpload()` calls Dropzone's `removeFile()` the same way,
  pkp-lib's `templates/submission/form/step2.tpl` shows the panel for
  OJS and OMP, and `PKPSubmissionFileHandler::add()` stores before it
  answers. The 3.3 review-file selection was not read.
- Introduced: `git blame` on `FileUploader.vue` `cancelUpload()` gives
  d02248ddb (2022-01-18, `pkp/pkp-lib#7265`), which moved the panel's
  `dropzoneCancelUpload()` into the uploader unchanged; the merge of
  `pkp/ui-library#118` is 553f9542 (2020-11-13).
- Upstream search terms: "cancel upload", cancel upload file stored,
  cancel upload submission file, `cancelUpload`, `FileUploader`, in
  pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library. `pkp/pkp-lib#9764`
  and `pkp/pkp-lib#12942` (open) and `pkp/pkp-lib#10705` (closed) are
  about "Cancel" in the workflow's legacy upload window;
  `pkp/pkp-lib#13286` (open) about cancelling a revision.
- Unverified: the 3.4 and 3.3 Dropzone versions' `upload.bytesSent`
  and `upload.total`, which a backport's check reads (Dropzone 5 through
  `vue2-dropzone` there).
