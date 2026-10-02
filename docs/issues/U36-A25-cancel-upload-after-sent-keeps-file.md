# "Cancel upload" in the submission wizard, pressed once the file has been sent, keeps the file

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP (a preprint server's wizard has no "Files" panel)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ui-library#118` for `pkp/pkp-lib#6057` · [5cf37c989a](https://github.com/pkp/ui-library/commit/5cf37c989afe79c2a401b09c2d6c97e41ad1f4d5) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a25)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

In the submission wizard's "Files" panel, "Cancel upload" removes a
file's row at once, without a question, and the Author expects the
file to be dropped. Pressed after the whole file has been sent but
before the server's answer, only the row goes: the file is stored.

Nothing says so. The "Review" step does not list the file, and when
the author submits, the editor finds it among the submission's files.
The author sees it on the panel, with "Edit" and "Remove", only after
a reload.

## Impact

- **Lost**: the author's choice not to send a file. A file they
  cancelled (a wrong document, a manuscript not yet anonymised) is
  kept, and the editor sees it with the submission.
- **Who**: an author adding files to a new submission on a journal or
  a press, whose press lands in the last moment of an upload. On an
  unthrottled local server the answer came 0.1 s after a small file
  was sent and 0.2 to 0.3 s after a 90 MiB one, and the whole row was
  on screen for under half a second; nobody presses that by hand. It
  takes an upload slow enough to watch, cancelled just as its bar
  fills, or a server that takes seconds to answer once it has the
  file.
- **Way round**: only for an author who reloads the page: the file is
  then on the panel and "Remove" removes it. Nothing on screen tells
  them to.

Low: what happens is the silent opposite of the button, and an
unwanted file goes to the editor, which on its own would be medium;
but ordinary use opens the window for a fraction of a second at the
end of an upload, and to press in it by hand the answer had to be
held back. A server where the full bar stays on screen for seconds
(slow or remote file storage) would raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OMP).
- Two small PDFs, `article.pdf` and `manuscript.pdf`.
- Chrome, or another Chromium browser, with the developer tools open
  on "Network" and a custom throttling profile added there: Download
  1 kbit/s, Upload and Latency left empty. Throttling stays on "No
  throttling" until step 3. The profile slows only what the server
  sends back, so the upload's answer takes about 12 seconds and the
  press can be made by hand.

Steps:

1. Sign in as `zzedd` (password `zzeddzzedd`), an author.
2. Open `/index.php/publicknowledge/en/submission` ("Make a
   Submission"): type a title, choose a "Submission Language" (and on
   OJS a "Section"), tick the checklist and privacy boxes, and press
   "Begin Submission". [3.5: the wizard opens on "Details"; press
   "Continue".]
3. On "Upload Files", select the throttling profile.
4. Press "Add File" and choose `article.pdf`. Its row shows
   "article.pdf", a full progress bar and "Cancel upload".
5. Press "Cancel upload" while the row still offers it.
6. Set the throttling back to "No throttling".
7. Press "Continue" until "Review" and read "Files".
8. Press "Upload Files" in the step list, press "Add File", choose
   `manuscript.pdf` and, on its row, press "Article Text" ("Book
   Manuscript" on a press).
9. Press "Details" in the step list and type an abstract.
10. Press "Continue" until "Review", read "Files", tick the
    confirmation boxes and press "Submit", then "Submit".
11. Sign in as `dbarnes` (password `dbarnesdbarnes`), the editor, and
    open the new submission.

**Expected**: `article.pdf` is dropped at step 5, and the editor finds
one file, "manuscript.pdf".

**Observed**: at step 5 the row goes at once and nothing asks or
warns; the panel reads "Upload any files the editorial team will need
to evaluate your submission.". At step 7 "Files" lists no file and
reads "You must upload at least one Article Text file." ("Book
Manuscript" on a press). At step 10 "Files" lists "manuscript.pdf"
alone, and the submission goes through. At step 11 the editor's
workflow lists both "article.pdf" and "manuscript.pdf". The cancelled
upload's request ends aborted in the browser
(`POST …/api/v1/submissions/{id}/files`, `net::ERR_ABORTED`); no
request answers an error.

Without throttling the same press, made by a script on the full bar
of a 90 MiB file, keeps the file too, and after a reload of the page
the panel lists it with "Edit", "Remove" and "What kind of file is
this?". With the upload itself held back (Upload 64 bytes/s), "Cancel
upload" pressed while the file is still on its way stores nothing.

## Cause

"Cancel upload" only aborts the browser's request. The row's button
reaches `FileUploader.vue` `cancelUpload()` (ui-library
`src/components/FileUploader/FileUploader.vue` lines 144–151) through
`SubmissionFilesListPanel.vue` `cancelUpload()`; it calls Dropzone's
`removeFile()`, which for a file in the `uploading` state calls
`xhr.abort()` and drops the file from its list. Nothing is sent to the
server, and the row's id is Dropzone's uuid, not a submission file's.

An abort stops a request the server has not received in full. Once the
last byte has left, the server has the whole request and runs it:
`PKPSubmissionFileController::add()` stores the file
(`app()->get('file')->add()`, then `Repo::submissionFile()->add()`)
before it writes any output, and PHP notices a closed connection only
when it writes. So from the moment the bar is full until the answer
arrives, the button still reads "Cancel upload" and can no longer
cancel anything.

The panel never learns the file's id, because the aborted request's
answer is discarded, so it cannot show or remove the file. The
"Review" step lists `components.submissionFiles.items`, the panel's
rows (`templates/submission/review-files.tpl`), so it does not show
the file either, while the stored file is already one of the
submission's files.

`bytesSent` and `total`, which the fix below reads, are Dropzone's:
`_updateFilesUploadProgress()` sets them from the request's upload
progress events and from nothing else.

Reach:

- `SubmissionFilesListPanel` is the only caller of
  `FileUploader.cancelUpload()`, and the submission wizard is the only
  page that uses the panel (`PKPSubmissionHandler`, `wizard.tpl`);
  checked in the code. OPS replaces the step with its galleys list
  (`pages/submission/SubmissionHandler.php` `getFilesStep()`).
- The email window's attachments (`FileAttacherUpload.vue`) use the
  same row and uploader, but their "Cancel Upload" only drops the row
  and aborts nothing; the temporary file left behind is attached to
  nothing (checked in the code).
- Files already kept this way sit in their submissions as ordinary
  files with no component; nothing tells them from files the author
  meant to send.

## Proposed fix

Let `FileUploader.cancelUpload()` tell the two cases apart. While the
file is still on its way, abort as today. Once the whole request has
been sent (`file.upload.bytesSent >= file.upload.total`), keep the
request, drop the row, and when the answer comes hand the stored file
to the parent, which deletes it with the call "Remove" already makes
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/fix.diff)):

```diff
 		cancelUpload(id) {
 			…
-			if (file) {
-				this.$refs.dropzone.removeFile(file);
+			if (!file) {
+				return;
 			}
+			const {bytesSent, total} = file.upload;
+			if (file.status === 'uploading' && total && bytesSent >= total) {
+				this.cancelledIds.push(id);
+				this.$emit(
+					'updated:files',
+					this.files.filter((item) => item.id !== id),
+				);
+				return;
+			}
+			this.$refs.dropzone.removeFile(file);
 		},
```

```diff
 		dropzoneSuccess(file, response) {
+			if (this.cancelledIds.includes(file.upload.uuid)) {
+				…
+				this.$refs.dropzone.removeFile(file);
+				this.$emit('cancelled:stored', response);
+				return;
+			}
```

`SubmissionFilesListPanel` listens (`@cancelled:stored="removeCancelled"`)
and sends the same `DELETE {apiUrl}/{id}?stageId=…` its `remove()`
sends, without the confirmation; if that fails it puts the file's row
back and shows the error. Only the uploader knows how far the request
got, so it decides; only the panel knows the endpoint and the stage,
so it sends the `DELETE`. If the kept request fails instead of
answering, `dropzoneError()` forgets the cancelled id and nothing is
shown, since nothing was stored.

Tried on `main` (OJS, OMP). After the Steps' press the upload answers
200, the panel sends the `DELETE`, which answers 200, and the editor
finds "manuscript.pdf" alone. Without throttling, the press on the
full bar of a 90 MiB file ends the same way. Four neighbouring
behaviours were the same with and without the patch:

- an upload left alone ends as a row with the name link, "Edit" and
  "Remove";
- "Cancel upload" before any of the file has gone aborts the request
  and stores nothing;
- "Remove" › "Yes" removes a stored file;
- "Cancel upload" clears a row refused with "File is too big (300MiB).
  Max filesize: 100MiB.".

**Alternatives**

- Hide or disable "Cancel upload" once the bar is full: one line, but
  the author who wants the file gone must wait for the answer and then
  use "Remove" and its confirmation.
- Never abort, always wait for the answer and delete: it would close
  the first window under "Left open", but a large upload the author
  cancelled would run to its end first.

**What goes with it**

- What it touches: `FileUploader` gains an emitted event,
  `cancelled:stored`; a parent that does not listen behaves as today.
  The diff also adds the `ajaxError` mixin to the panel: its
  `remove()` already names `this.ajaxErrorCallback` as its error
  handler, and the panel does not include the mixin that defines it.
- Left open, two windows. `bytesSent` reaches `total` only when the
  browser delivers the upload's last progress event, so a press after
  the request has left and before that event still aborts and keeps
  the file. For a small file that is the whole upload: a script's
  press on a 243-byte file with its bar at 0 kept the file with the
  fix in, though that row is on screen for under 0.1 s. And an author
  who leaves the page after the cancel and before the answer keeps
  the file, since the `DELETE` is never sent. Closing either needs
  the server to tie an upload to its cancel, a larger change.
- No repair is possible for files already kept.
- Backport: the two methods read the same on `stable-3_5_0` and
  `stable-3_4_0`, so the diff's logic fits; on 3.3 the method is
  `dropzoneCancelUpload()` inside the panel itself.
- Guard: an e2e scenario that holds the answer back and presses
  "Cancel upload" on the full bar, or a component test of
  `cancelUpload()` with a file whose `bytesSent` equals its `total`.

Medium: about seventy lines across two components of ui-library and
a new event on `FileUploader`, with a test that has to hold the
server's answer back; tried.

## Evidence

- The kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cancel-upload-after-sent-keeps-file/lib.js).
  Its header names the command. It takes the Steps on OJS and OMP;
  `MODE=plain` is the unthrottled run and `MODE=nb` the four
  neighbouring behaviours.
- Walked 2026-10-02 on `main` and `stable-3_5_0`, OJS and OMP, on
  PostgreSQL; the fault does not touch the database. Datasets:
  pkp/datasets c657990 (2026-10-01). Both PDFs were the suites'
  243-byte `article.pdf`.
- How the walk differed from the Steps: the throttling profile was set
  through the DevTools protocol (`Network.emulateNetworkConditions`,
  125 bytes a second down, upload not throttled), and the press came
  about 0.1 s after the bar filled. With that profile and no press,
  the upload's answer took 12.0 s on both apps. The walk also counted
  the submission's `submission_files` rows: 1 after the cancel and 2
  after the submit (0 and 1 with the fix).
- The unthrottled run (`main` and 3.5, both apps, a local `php -S`
  server, the same figures within 0.1 s). Left alone, `article.pdf`'s
  row offered "Cancel upload" for about 0.09 s before its name became
  a link; a 90 MiB file was sent in 0.2 s and answered 0.16 to 0.27 s
  later. A press as soon as the small file's row offered the button
  (its bar at 0) and a press on the 90 MiB file's full bar both kept
  the file, and the reloaded panel listed both. With the fix the
  second press kept nothing and the first still kept the file.
- Not driven: a real slow upload (the emulated one holds the request
  back before it leaves, so its press came at 0% of the bar and an
  abort in mid-body was not tried); how long the answer takes on a
  production server; whether the kept file goes on to reviewers.
- Code reads. `main`: the methods and files named in Cause; Dropzone
  6.0.0-beta.2 `removeFile()`, `cancelUpload()` and
  `_updateFilesUploadProgress()`, whose only caller during an upload
  is `xhr.upload.onprogress`; `PKPSubmissionFileController::add()`.
  3.5: the same `cancelUpload()` in both components. 3.4
  (`origin/stable-3_4_0`): the same `FileUploader.cancelUpload()`
  (line 121) and the panel in `templates/submission/wizard.tpl`;
  `PKPSubmissionFileHandler::add()` stores the file (line 287) before
  any answer. 3.3 (`origin/stable-3_3_0`):
  `SubmissionFilesListPanel.dropzoneCancelUpload()` (line 295) makes
  the same `removeFile()` call, the panel sits in step 2
  (`templates/submission/form/step2.tpl`), and `add()` stores the same
  way (line 262).
- Introduced: `git blame` on `cancelUpload()` gives d02248ddb
  (`pkp/pkp-lib#7265`, 2022), which moved the method from the panel
  into `FileUploader`; the panel's first commit, 5cf37c989a, has it as
  `dropzoneCancelUpload()` with the same `removeFile()` call.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library):
  "Cancel upload", "cancel upload file wizard", "dropzone cancel",
  `cancelUpload`, `FileUploader cancel`, `removeFile dropzone abort`.
  Read and not the same fault: `pkp/pkp-lib#9764` and
  `pkp/pkp-lib#12942` (the workflow's upload window keeps its file on
  "Cancel"), `pkp/pkp-lib#13286` (a cancelled revision upload).
- Unverified: that the panel's "Remove" shows nothing when its request
  fails (read in the code only: the missing mixin); the fix's
  `dropzoneError()` branch (no failing kept request was staged).
- Tips: OJS `main` b84f8e2e44 with lib/pkp ddd8ab243a and ui-library
  64d67363; OMP `main` 3b0ecf794 with lib/pkp 3dc90c81a6 and
  ui-library 280f98c5. `stable-3_5_0` OJS 091fb65453 and OMP 9c5e24246,
  with lib/pkp cf3f984335 and ui-library d4e01883. `stable-3_4_0`
  ui-library ee684b341b, lib/pkp 32b0f4b4af (OJS 75cc2d488b, OMP
  0aec65441f); `stable-3_3_0` ui-library 96959f9ed4, lib/pkp
  f6ab331645 (OJS ac77c9fb35, OMP 8e72fc8836).
