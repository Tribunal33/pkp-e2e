# Submission wizard: screen readers are told "Uploading 100% complete" after an upload is cancelled

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (a preprint server's wizard has no "Files" panel)
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ui-library#118` for `pkp/pkp-lib#6057` · [5cf37c989a](https://github.com/pkp/ui-library/commit/5cf37c989afe79c2a401b09c2d6c97e41ad1f4d5) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U36 [A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a29)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The submission wizard's "Files" panel gives screen readers an upload's
progress as a status message, "Uploading {percent}% complete". When an
author presses "Cancel upload", the status changes to "Uploading 100%
complete", though nothing was stored. An empty status, or one saying
that the upload was cancelled, is expected. This happens both for a
file still on its way and for a file refused for its size.

The text then stays until the page is reloaded. It is still there
after the author removes the files, and the panel is empty again. A
screen reader user who cancels an upload is told that it completed.

## Impact

- **Lost**: nothing; no file is stored or lost. The status changes at
  the cancel, which is when a screen reader announces it, and then
  stays as it is: it is not announced again, but anyone reading through
  the panel meets it.
- **Who**: authors using a screen reader in the submission wizard,
  each time they press "Cancel upload", on a file still uploading or on
  one refused as too large (its row shows the refusal and "Cancel
  upload", the only way to clear it). Removing a file uploaded normally
  leaves the same stale text. The same component serves the email and
  discussion attachments and the JATS upload, which keep the text the
  same way (read in the code).
- **Way round**: the panel's rows are right: the cancelled file is not
  listed, and an empty panel reads "Upload any files the editorial team
  will need to evaluate your submission.".

Low: nothing is lost and the panel's rows show what is stored; only a
message read by screen readers is wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- A screen reader, or the browser's accessibility inspector on the
  "Files" panel: the status is a `role="status"` element inside the
  panel, shown nowhere on screen.
- Three files: `article.pdf` (any small file), `large.pdf` (larger than
  the install's upload limit, which the wizard names when it refuses
  the file) and `manuscript.pdf` (about 50 KB).
- In the browser's developer tools, under "Network", a custom
  throttling profile with Upload 1 kbit/s (Download and Latency left
  empty). Step 8 uses it so that "Cancel upload" can be pressed while
  the file is still on its way.

Steps:

1. Sign in as `zzedd` (password `zzeddzzedd`), an author.
2. Open `/index.php/publicknowledge/en/submission` ("Make a
   Submission"): type the title "hkk28 upload status", choose a
   "Submission Language" (on OJS also a "Section"; on OMP leave the
   work type as it is), tick the checklist and privacy boxes, and press
   "Begin Submission". [3.5: the wizard opens on "Details"; press
   "Continue".] "Upload Files" opens; there is no status.
3. Press "Add File" and choose `large.pdf`. Its row reads, for
   example, "File is too big (300MiB). Max filesize: 2MiB.", with
   "Cancel upload"; there is still no status.
4. Press "Cancel upload" on that row. Read the status.
5. Press "Add File" and choose `article.pdf`. Wait until its row asks
   "What kind of file is this?".
6. Press "Remove" on "article.pdf", then "Yes". Read the status.
7. Reload the page. There is no status.
8. Select the throttling profile. Press "Add File", choose
   `manuscript.pdf` and, while its row shows "Cancel upload", press it.
   Read the status.

**Expected**: after the cancels at steps 4 and 8, no status, or one
saying that the upload was cancelled; after the removal at step 6, no
status.

**Observed**: after steps 4, 6 and 8 the status reads `Uploading 100%
complete`, the same at once, 1 s and 5 s later, beside the empty
panel's "Upload any files the editorial team will need to evaluate your
submission.". After step 8 no file is stored.

At step 5 the status already holds the text from step 4. The upload
does not change it: a file this small is sent in one progress event, so
its first progress report is already 100 (the row's bar went from 0 to
100 in about 0.1 s).

## Cause

ui-library's `FileUploader.vue` (lib/ui-library
`src/components/FileUploader/FileUploader.vue`) renders
`<span v-if="status" class="-screenReader" role="status">` (line 16).
It sets `status` in one place, `dropzoneTotalUploadProgress()` (lines
246–251), the handler of Dropzone's `totaluploadprogress` event, to the
panel's `submission.upload.percentComplete` with the percentage filled
in. Nothing clears it.

Dropzone reports 100 when nothing is uploading. Its
`updateTotalUploadProgress()` (Dropzone 6.0.0-beta.2, `src/dropzone.js`
lines 420–443) divides the bytes sent by the total bytes of the files
still queued or uploading; with none, it emits 100 and a total of 0
bytes. It runs on every `removedfile` (line 293). "Cancel upload" fires
that through `FileUploader.cancelUpload()` › `removeFile()`, whether the
file was uploading or had been refused before anything was sent. So
each cancel writes "Uploading 100% complete" into the status. The
handler cannot tell this from a finished upload, because it ignores
the byte total that Dropzone passes with the percentage.

An upload that ends normally leaves its last value, 100, in place. The
panel's "Remove" deletes the file through the API and drops the row
(`SubmissionFilesListPanel.vue` `remove()`) without telling the
uploader, so the status stays as it was.

Reach: the same component, with the same status, serves the email and
discussion windows' attachments (`FileAttacherUpload.vue`, whose label
is a fixed English "Uploading {$percent}% complete"; the discussion
window reaches it through `useDiscussionMessages.js`) and the JATS
upload (`WorkflowPublicationJats.vue`). Checked in the code only: each
keeps the text after its upload ends, and the attachments keep it
after a file is removed.

## Proposed fix

In `FileUploader.vue`, clear the status when no upload is running:
when Dropzone reports a total of 0 bytes (a cancel), and when the files
the status reported on leave the list
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-upload-status-reads-complete/fix.diff)):

```diff
+	watch: {
+		files(newFiles) {
+			if (
+				this.status &&
+				!this.$refs.dropzone?.dropzone.getActiveFiles().length &&
+				!newFiles.some((file) => this.statusFileIds.includes(file.id))
+			) {
+				this.clearStatus();
+			}
+		},
+	},
 …
 		dropzoneFilesAdded(files) {
+			this.statusFileIds = [];
 …
 		dropzoneSuccess(file, response) {
+			this.statusFileIds.push(response.id);
 …
-		dropzoneTotalUploadProgress(progress) {
+		dropzoneTotalUploadProgress(progress, totalBytes) {
+			if (!totalBytes) {
+				this.clearStatus();
+				return;
+			}
```

with a `statusFileIds: []` in `data()` and a `clearStatus()` that
empties both. Dropzone already passes the byte total as the event's
second argument (dropzone-vue3 forwards it), and a total of 0 is
exactly its "nothing is uploading" case. A running upload keeps its
percentage. The `files` prop is the caller's list of rows, so removing
the file the status reported on clears it, even while other files stay
listed. A finished upload keeps "Uploading 100% complete" while its row
is listed, as today. The status element is rendered only while
`status` is not empty, so nothing stale is left to read. Every page
that uses the component is covered.

Tried on `main` (OJS, OMP). After steps 4, 6 and 8 the panel has no
status, at once, 1 s and 5 s later. With the patch, removing a file
uploaded normally, as the only file or while an earlier upload stays
listed, leaves no status either; without it, "Uploading 100% complete"
stays both times. Two cases read the same with and without the patch:
a file uploaded under the throttling profile and left alone reads
"Uploading 100% complete" from its full bar until 23 s later, when its
row is stored, and after; two files picked together end with the same
text beside their rows.

A question for the team: whether a cancel should be silent, as here,
or spoken ("Upload cancelled"). Speaking it needs a new locale key and
the callers to pass it; `pkp/pkp-lib#7206`, an open plan for a shared
announcer for status messages, is where that would fit.

**Alternatives**

- Clear the status in each caller's cancel and remove handlers: the
  rule belongs to the component, and three callers would each need it.
- Clear it also once the queue completes (`vdropzone-queue-complete`),
  so that a finished upload leaves no status: one line, but it changes
  what a finished upload announces, a choice for the team rather than
  part of this fix.

**What goes with it**

- Nothing stored changes; no API or plugin hook is touched.
- Backport: `dropzoneTotalUploadProgress()` reads the same on
  `stable-3_5_0` and `stable-3_4_0`, so the same change fits there
  (3.4's vue2-dropzone also passes the byte total); the diff's context
  around `mounted()` differs. On 3.3 the handler sits in
  `SubmissionFilesListPanel.vue` itself (line 405) and takes the same
  change, watching its `items`.
- Guard: a component test of `FileUploader` that cancels a refused file
  and removes an uploaded one, and expects no `role="status"` element.

Small: a guard, a watcher and a list of ids in one component, with a
component test; tried.

## Evidence

- The kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-upload-status-reads-complete/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/wizard-upload-status-reads-complete/lib.js)
  takes the Steps on OJS and OMP; its header names the commands
  (`MODE=removal`: removals after normal uploads; `MODE=nb`: uploads
  left alone, both for the trial).
- Walked 2026-10-15 on `main` and `stable-3_5_0`, OJS and OMP, each on
  an install freshly loaded from PKP's default test dataset (pkp/datasets
  7912e09, 2026-10-14), on PostgreSQL. OPS was not walked: its dataset
  has no `zzedd`. A screen reader was not run: the walk reads the text
  of the panel's `role="status"` element, which is what a screen reader
  is given, every 5 ms in the page and at the steps; whether a given
  screen reader announces the status when it first appears is
  unverified.
- How the walk differed from the Steps: the throttling profile was set
  through the DevTools protocol (`Network.emulateNetworkConditions`,
  Upload 128 bytes a second); `large.pdf` was a 300 MiB file with no
  content and `manuscript.pdf` 48 KiB; the installs' upload limit was
  PHP's default 2 MiB. Under that throttling the browser also reports
  an upload's bar full at once.
- The fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/wizard-upload-status-reads-complete/fix.diff
  ojs omp`, the script, `MODE=removal` and `MODE=nb` with the patch in
  and after `node bin/try-fix.js revert …`, each on a freshly loaded
  dataset. The removal cases without the patch are the "out" runs.
- Code reads. `main` (ui-library 47b565cb): Dropzone 6.0.0-beta.2
  (`node_modules/dropzone/src/dropzone.js`) and dropzone-vue3 1.0.2,
  which forwards `totaluploadprogress` with its byte totals; every user
  of `FileUploader.vue`; OPS `pages/submission/SubmissionHandler.php`
  `getFilesStep()` (the galleys list). 3.5 (ui-library 2576e00a):
  `FileUploader.vue`'s status and `dropzoneTotalUploadProgress()` the
  same as `main`. 3.4 (`origin/stable-3_4_0`, ee684b341b): the same in
  `FileUploader.vue` (lines 15, 286), with vue2-dropzone 3.6 on
  Dropzone 5, whose `updateTotalUploadProgress()` reports 100 with no
  active file and runs on `removedfile` (Dropzone v5.9.3
  `src/dropzone.js` lines 300, 427–450, read from GitHub). 3.3
  (`origin/stable-3_3_0`, 96959f9ed4): the same status and handler
  inside `SubmissionFilesListPanel.vue` (lines 53, 405), in lib/pkp
  `templates/submission/form/step2.tpl`.
- Introduced: `git blame` on the status lines gives d02248ddb
  (`pkp/pkp-lib#7265`, 2022), which moved them from the panel into
  `FileUploader.vue`; the panel's first commit, 5cf37c98, already has
  them unchanged.
- Upstream search (pkp/pkp-lib, pkp/ui-library): "\"Uploading\"
  \"complete\" screen reader", "upload progress screen reader",
  "cancel upload screen reader", "dropzone status aria-live",
  `uploadProgressLabel`, `percentComplete`, `FileUploader status`,
  `SubmissionFilesListPanel`. Related, not the same fault:
  `pkp/pkp-lib#7206` (open: a shared announcer for status messages,
  listing the progress bar among its cases).
- Not driven: the email, discussion and JATS uploads (code only).
- Tips: OJS `main` 378eced941 and OMP `main` f4836d4fba, each with
  lib/pkp b17fadae59 and ui-library 47b565cb; `stable-3_5_0` OJS
  ca763c91cd and OMP a70bbb9c4, with lib/pkp 4045d9241e and ui-library
  2576e00a; `stable-3_4_0` OJS daf0ca971d, OMP 0aec65441f, lib/pkp
  55c8e406b3, ui-library ee684b341b; `stable-3_3_0` OJS d7d9dd14ec, OMP
  8e72fc8836, lib/pkp 5e84acd11b, ui-library 96959f9ed4.
