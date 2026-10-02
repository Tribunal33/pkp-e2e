# A galley's "Change File" shows the heading "Current file" with no file name under it

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code; no "Current file" heading there)
  - 3.3: none (code; no "Current file" heading there)
- **Introduced** `pkp/pkp-lib#12440` with `pkp/ui-library#824` for `pkp/pkp-lib#12349` · [117c353d58](https://github.com/pkp/pkp-lib/commit/117c353d58c6efee7893522371549da3976253ba) · 2026-03-11 · Touhidur Rahman (touhidurabir). That change put the heading on screen; the upload form in pkp-lib has not filled it in since `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal or preprint server, "Change File" on a galley opens the
upload wizard with the heading "Current file", which promises the name
of the file about to be replaced. Nothing stands under it, so the editor
cannot see there which file they are about to replace.

When the editor then picks the replacement, its name appears in the
upload box directly below the heading. "Current file" now seems to name
the new file, and the file being replaced is named nowhere in the
window.

In 3.4 and 3.3 the same window has a list of the galley's files to
revise, which names the current file. A press has no galleys, and
"Change File" on a publication format's file does not show the heading.
The fix is a few lines in pkp-lib.

## Impact

- **Lost**: nothing. The upload replaces the galley's file as intended.
- **Who**: anyone who presses "Change File" on a galley that has a
  file, every time.
- **Way round**: the galley's label in the "Galleys" list downloads the
  current file, and the galley's "More Information" lists its uploads.

Low: a heading with nothing under it, and the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OPS (the server `publicknowledge`).
- One small PDF on your computer; the steps call it
  `u36j-replacement.pdf`.

On a journal:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 1, "Signalling Theory Dividends":
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`.
   It opens on its unpublished version 1.1.
3. Press "Galleys" under version 1.1 in the side menu. The list holds
   the galley "PDF Version 2"; its file is `article.pdf`.
4. On the row "PDF Version 2" press "More Actions", then "Change File".
   The window "Upload a File Ready for Publication" opens on "1. Upload
   File".
5. Read what stands under the heading "Current file".
6. Press "Upload File" and pick `u36j-replacement.pdf`. Read the step
   again.

On a preprint server: the same steps as `dbarnes` on preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production"
(`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
It has one version, not yet posted; "Galleys" under it lists the galley
"PDF", whose file is "The influence of lactation on the quantity and
quality of cashmere production.pdf".

**Expected**: under "Current file" stands the name of the galley's file
(`article.pdf`; on the preprint server the PDF named above). It still
stands there after step 6, and the upload box names
`u36j-replacement.pdf`.

**Observed**: at step 5 nothing stands under "Current file"; the next
line is the upload box, "Drag and drop a file here to begin upload". The
step reads:

```
Current file
Drag and drop a file here to begin upload
Upload File
```

After step 6 it reads:

```
Current file
u36j-replacement.pdf
Change File
```

The name of the galley's own file appears nowhere in the window.

The upload window of a file list ("Upload" above "Submission Files") has
no "Current file" heading; its drop-down "If you are uploading a
revision of an existing file, please indicate which file." names the
files.

## Cause

The upload form's template prints a variable that no code sets.
`lib/pkp/templates/controllers/wizard/fileUpload/form/fileUploadForm.tpl`
(line 161) shows, when the wizard is opened to revise one known file
(`revisionOnly` with a numeric `revisedFileId`, the template's "use case
1"), the section "Current file" (`submission.submit.currentFile`) with
`{$revisedFileName}` in it. Nothing assigns `revisedFileName`, so the
section holds its label alone:

```html
<div class="section "> <label>Current file</label> </div>
```

`PKPSubmissionFilesUploadBaseForm::fetch()` used to assign it, in the
two places where it settles which file is revised (the preset file found
among the revisable files, and the single file a revision-only upload
can apply to). The submission files refactor of 2020
(`pkp/pkp-lib#6057`, 5f383f87c3) removed both
`$this->setData('revisedFileName', …->getOriginalFileName())` lines,
because a submission file no longer has that method, and left the
template as it was.

A galley's "Change File" did not open the wizard that way until 2026.
It opened the free upload: the drop-down "If you are uploading a
revision of an existing file, please indicate which file." listing the
galley's files by name, and the component drop-down.

The fix for `pkp/pkp-lib#12349` (main and 3.5) changed that in two
steps:

- 3ea21e5071 (2026-02-19) made `getSubmissionFiles()` return no files
  for a galley, so the drop-down of files went and the step named no
  file, without a heading that promised one.
- 117c353d58 (2026-03-11) made the upload always revise the galley's
  one file. `galleyChangeFile()` in ui-library's
  `useGalleyManagerActions.js` (7bedb809) and the legacy
  `ArticleGalleyGridRow` and `PreprintGalleyGridRow` send
  `revisedFileId` and `revisionOnly`, and `getSubmissionFiles()` returns
  that file alone. This is the change that put the empty "Current file"
  on screen.

Reach:

- A galley's "Change File" on a journal and a preprint server (on
  screen, main and 3.5), for every role that is offered it.
- A press: no screen reaches it. A publication format's "Change File"
  sends no `revisedFileId` (checked in the code), so the heading is not
  shown. Since 3ea21e5071 that window has no drop-down of files either,
  which is the open `pkp/pkp-lib#13416`, a different fault.
- The second `setData` line the refactor removed sits in the branch
  for a wizard opened with `revisionOnly` and no `revisedFileId`, when
  exactly one file can be revised. `AddRevisionLinkAction` is the link
  that opens the wizard so. It is built by
  `ReviewRevisionsGridDataProvider`, which no grid uses, and by the
  pending-revisions notification's upload link. The Vue file lists
  never send `revisionOnly` (checked in the code), so the workflow's
  own lists do not reach it; whether any screen still shows that
  notification's link was not established.

## Proposed fix

A proposal: assign `revisedFileName` again in
`PKPSubmissionFilesUploadBaseForm::fetch()`, in both places the
refactor removed it, from the file's `name` as the drop-down's options
already read it, and escape it in the template. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-change-file-names-no-current-file/fix.diff):

```diff
--- a/lib/pkp/controllers/wizard/fileUpload/form/PKPSubmissionFilesUploadBaseForm.php
+++ b/lib/pkp/controllers/wizard/fileUpload/form/PKPSubmissionFilesUploadBaseForm.php
@@ -338,9 +338,12 @@
         foreach ((array) $submissionFiles as $submissionFile) {
+            $fileName = $submissionFile->getLocalizedData('name') != '' ? $submissionFile->getLocalizedData('name') : __('common.untitled');
+
             // Is this the revised file?
             if ($revisedFileId && $revisedFileId == $submissionFile->getId()) {
                 // This is the revised submission file, so pass its data on to the form.
+                $this->setData('revisedFileName', $fileName);
                 $this->setData('genreId', $submissionFile->getGenreId());
                 $foundRevisedFile = true;
             }
@@ -348,8 +351,6 @@
             // a revision.
-            $fileName = $submissionFile->getLocalizedData('name') != '' ? $submissionFile->getLocalizedData('name') : __('common.untitled');
-
             $submissionFileOptions[$submissionFile->getId()] = $fileName;
@@ -360,6 +361,7 @@
             $this->setData('revisedFileId', $lastSubmissionFile->getId());
+            $this->setData('revisedFileName', $submissionFileOptions[$lastSubmissionFile->getId()]);
             $this->setData('genreId', $lastSubmissionFile->getGenreId());
--- a/lib/pkp/templates/controllers/wizard/fileUpload/form/fileUploadForm.tpl
+++ b/lib/pkp/templates/controllers/wizard/fileUpload/form/fileUploadForm.tpl
@@ -158,7 +158,7 @@
 			{fbvFormSection title="submission.submit.currentFile"}
-				{$revisedFileName}
+				{$revisedFileName|escape}
 			{/fbvFormSection}
```

The form is where the revised file is settled, so setting the name
there covers both ways into the "Current file" step: a preset
`revisedFileId`, and a revision-only upload with a single file to
revise. On the galley path both lines run, with the same value. The
escape is needed
because the template prints the variable raw and a file's name is typed
by its uploader.

Tried on `main`:

- OJS and OPS, the Steps: "Current file" is followed by `article.pdf`
  (on the preprint server by "The influence of lactation on the quantity
  and quality of cashmere production.pdf"), before and after the upload;
  after it the upload box names `u36j-replacement.pdf` on the next line.
- OJS and OMP, "Upload" above "Submission Files": with the fix applied
  and with it reverted, the step has no "Current file" heading and the
  same drop-down of files and components.

**Alternatives**

- Sending the name from the galley list (ui-library) as a request
  parameter: the form already loads the file, and the legacy galley
  rows would need the same.
- Removing the "Current file" section. Not proposed: the heading is
  right for a window that replaces one file, and only its value is
  missing.

**What goes with it**

- No data repair, no API or hook change.
- Backport: the form and the template are the same files on 3.5, so the
  diff is expected to apply as written (not tried there). 3.4 and 3.3
  have the same gap in the code, but their galley windows do not reach
  it.
- The open PR `pkp/pkp-lib#13419` (for `pkp/pkp-lib#13416`) edits
  `getSubmissionFiles()` in the same class, not `fetch()`.
- Guard: a Cypress or unit check that a galley's "Change File" names the
  galley's file.

Small: three lines in one pkp-lib form class and an escape in its
template; ui-library and the apps are not touched.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-change-file-names-no-current-file/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-change-file-names-no-current-file/lib.js))
  takes the Steps on OJS and OPS and records the step's lines, the
  "Current file" section's markup and the wizard's requests. `MODE=nb`
  opens "Upload" above "Submission Files" (OJS submission 4, OMP
  submission 3) and records the same. Each run starts from an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/galley-change-file-names-no-current-file/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Where the walk differs from the Steps: it opens the submission by its
  address, hands the file to the upload box's file input instead of
  pressing the button, and presses "Cancel" after step 6 so the galley
  keeps its file.
- The walks ran in Chromium on PostgreSQL (nothing here depends on the
  database). Datasets: pkp/datasets c657990 (2026-10-01). `main` and 3.5
  gave the same result on both apps.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS); ui-library
  64d67363 (OJS) and 280f98c5 (OMP, OPS). 3.5: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3; pkp-lib cf3f984335; ui-library d4e01883.
  3.4: OJS 75cc2d488b, OPS acd8ae704b; pkp-lib 32b0f4b4af. 3.3: OJS
  ac77c9fb35, OPS c5532e2161; pkp-lib f6ab331645.
- Code reads. 3.5: the form and the template are identical to `main`'s,
  and `useGalleyManagerActions.js` sends `revisedFileId` and
  `revisionOnly` (the 3.5 PRs of `pkp/pkp-lib#12349`:
  `pkp/pkp-lib#12441`, `pkp/ui-library#825`). 3.4 and 3.3: the template
  prints `{$revisedFileName}` and `fetch()` does not set it, as on
  `main`, but `ArticleGalleyGridRow` (OJS, and OPS 3.3) and
  `PreprintGalleyGridRow` (OPS 3.4) build the "Change File"
  action with no revised file, so the step is the free upload: the
  drop-down lists the galley's own files (the proof files tied to it)
  by name. Neither was walked.
- Introduced: `git log -S"setData('revisedFileName'"` on pkp-lib gives
  5f383f87c3, whose diff removes both lines (and dc439078bb, 2013, which
  added them). `git log --grep=12349` on pkp-lib gives 3ea21e5071 (3.5:
  a5878b541c) and 117c353d58 (3.5: 52e27bc6de);
  `git log -S'params.revisionOnly'` on ui-library gives 7bedb809 (3.5:
  0f90e68b); OJS e1ad8b70b3 and OPS 5bf680dbe6 changed the legacy rows.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/ui-library):
  "Current file" and "Change File" with galley, the symptom's words,
  `revisedFileName`, `showFileNameOnly`. `pkp/pkp-lib#12349` (closed) is
  the change itself; its QA comments do not mention the empty heading.
- Unverified: whether 3.4 or 3.3 reach the empty "Current file" through
  the author's pending-revisions notice ("upload a revised file" with
  exactly one revision file in the round, `AddRevisionLinkAction`); the
  code allows it, no screen was driven there. The escape in the template
  was not exercised with a file name holding markup. That a galley's
  "Change File" named the file in a drop-down until February 2026
  (3ea21e5071), and still does on 3.4 and 3.3, is read from the code and
  from `pkp/pkp-lib#12349`'s description, not walked.
