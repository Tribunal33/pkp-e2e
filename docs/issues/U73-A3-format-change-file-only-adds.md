# A publication format's "Change File" cannot say which file it replaces, so every upload adds one more

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: none (code; the window lists the format's files to replace)
  - 3.3: none (code; the window lists the format's files to replace)
- **Introduced** `pkp/pkp-lib#12351` for `pkp/pkp-lib#12349` · [3ea21e5071](https://github.com/pkp/pkp-lib/commit/3ea21e50719c4a8409f78bf68160b0d9366e929d) · 2026-02-18 (UTC) · Touhidur Rahman (touhidurabir)
- **Upstream** `pkp/pkp-lib#13416` (open; fix in PR `pkp/pkp-lib#13419` with `pkp/omp#2485` for `stable-3_5_0`, open and not yet reviewed; no PR for main)
- **Tracked in** spec U73 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, a publication format's "Change File" opens "Upload a File
Ready for Publication" with no way to say which of the format's files
is being changed. Whatever is uploaded is added as one more file, and
the file the person meant to replace stays listed beside it.

Readers keep getting the old file until the press sets the new file's
terms (open access, or direct sale with a price). After that, the
book's page lists both files, unless the press deletes the old one.

This affects every format that already holds a file, including the
formats of a published book.

## Impact

- **Lost**: replacing a format's file in place. Nobody is told; the
  upload completes and both files are listed.
- **Who**: whoever is offered "Change File" on the "Publication
  Formats" page (the Press manager, Press editor, Production editor and
  the assigned Series editor, Layout Editor and other assistants), each
  time a format's file is corrected.
- **Way round**: delete the old file, then set the new file's terms and
  approval again. The new file has a new number, so its download
  address on the book's page is new, and the old file's address answers
  "404 Not Found".

Medium: the replace fails, but the screen offers a way round and no
wrong file reaches readers without the press acting. It would be high
for a press whose readers or indexes link to individual files, since
every corrected file's old link stops working.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP (the press
  `publicknowledge`). Book 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", is in Production with `dbarnes` assigned;
  its one format, "PDF", is remotely hosted and offers no "Change
  File", so the steps add a format of their own.
- Two small PDFs on your computer; the steps call them `u73e-first.pdf`
  and `u73e-second.pdf`.

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. On the dashboard, press "View" on book 4.
3. In the side menu, press "Publication" › "Publication Formats".
4. Press "Add publication format", type the name `EPUB u73e`, leave the
   other fields as they are (in particular, leave "This format will be
   available at a separate website." unticked) and press "OK". Its row
   shows "Change File" and "Select Files".
5. On `EPUB u73e` press "Change File". In "Upload a File Ready for
   Publication" choose the component "Book Manuscript", upload
   `u73e-first.pdf`, press "Continue", "Continue" and "Complete". The
   format lists `u73e-first.pdf`.
6. On `EPUB u73e` press "Change File" again, and look in step 1 for a
   way to say which file is being changed.
7. Choose "Book Manuscript", upload `u73e-second.pdf`, press "Continue",
   "Continue" and "Complete".
8. Read the files listed under `EPUB u73e`.

**Expected**: step 6 offers the drop-down "If you are uploading a
revision of an existing file, please indicate which file.", listing
`u73e-first.pdf`. With `u73e-first.pdf` chosen there, the format lists
one file after step 7, the same file (number 145 on a fresh dataset)
now holding `u73e-second.pdf`.

**Observed**: step 6 holds only the "Submission Component" drop-down,
"Drag and drop a file here to begin upload" and "Upload File"; nothing
names a file to replace. After step 7 the format lists both files:

```
EPUB u73eDigital (on physical carrier) (DA) Change File Select Files   Awaiting Approval   Not Available
146  u73e-second.pdf   Awaiting Approval   Set Terms
145  u73e-first.pdf    Awaiting Approval   Set Terms
```

No request failed, and no notice was shown.

## Cause

`PKPSubmissionFilesUploadBaseForm::getSubmissionFiles()`
(`lib/pkp/controllers/wizard/fileUpload/form/PKPSubmissionFilesUploadBaseForm.php`,
lines 224–234 on main) lists the files the upload may revise, which
step 1 offers in the "If you are uploading a revision…" drop-down. For
any upload to a representation (`Application::ASSOC_TYPE_REPRESENTATION`)
it returns no files, or only the file passed in as `revisedFileId`. A
publication format passes none (`PublicationFormatGridCellProvider`
builds `AddFileLinkAction` with the format as the assoc and nothing
else), so the drop-down is never shown and every upload is a new file.

The rule the code assumes is "a representation holds one file". That
holds for a galley in OJS and OPS, which points to one file through
`submissionFileId`. It does not hold for an OMP publication format,
which holds any number of proof files under the same assoc type.

The early return came with `pkp/pkp-lib#12349`. That issue was about a
galley's "Change File", which offered the galley's earlier files as
revision targets. 3ea21e5071 made the method return no files for any
representation. 117c353d58 (2026-03-11) then let a galley's own
`revisedFileId` through, so its upload revises that one file. Neither
change looked at OMP. Before them the method listed the
representation's files, as it still does on 3.4 and 3.3. The link's
label, "Change File", was chosen for galleys in 2016 (f86e62bcf3,
`pkp/pkp-lib#1472`) and stayed true for formats while that list
existed.

Galleys are not affected, and the fix must keep it so. A galley that
has a file passes it as `revisedFileId` with `revisionOnly` set: the
Vue galley list's `galleyChangeFile()` in ui-library's
`useGalleyManagerActions.js`, and the legacy `ArticleGalleyGridRow` and
`PreprintGalleyGridRow` through `AddFileLinkAction`. With one file and
`revisionOnly`, `fetch()` hides the selector and revises that file. A
galley whose file was deleted passes no `revisedFileId`. Without the
early return, the general list would offer that galley's earlier proof
files again, which is the fault of `pkp/pkp-lib#12349`.

Reach:

- OMP's "Publication Formats" page, for every role offered "Change
  File", on unpublished and published books (on screen, main and 3.5;
  the published book 5's "PDF" offers it too).
- OJS and OPS galleys: a galley's "Change File" still opens step 1 with
  no list of files (on screen, main).
- The same assumption elsewhere: a search for
  `ASSOC_TYPE_REPRESENTATION` in pkp-lib's classes and controllers
  finds no other place that treats a representation as holding one file
  (checked in the code).

## Proposed fix

A proposal: review and merge the open PR pair `pkp/pkp-lib#13419` with
`pkp/omp#2485` (for `stable-3_5_0`), and port both to main. The PRs add
`PKPApplication::hasSingleFileRepresentations()`, which returns true
and which OMP's `Application` overrides to return false.
`getSubmissionFiles()` then keeps the galley branch only where it
returns true, so a format's upload lists the format's files, as before
3ea21e5071. This follows the existing per-application statics on
`PKPApplication`, such as `getSectionIdPropName()`, which OMP overrides
for its series.

The diffs tried here take the same approach with the same method name:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-change-file-only-adds/fix-omp.diff)
(pkp-lib and OMP) and
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-change-file-only-adds/fix-ojs.diff)
(pkp-lib alone; `fix-ops.diff` is the same). They differ from the PR in
one case. In the PR, an upload that passes `revisedFileId` keeps the
single-file branch in every app. In the diff, OMP skips the branch, and
the drop-down lists all the format's files with that one chosen. No OMP
screen passes `revisedFileId` for a format, so the two behave the same
on every screen.

```diff
--- a/lib/pkp/classes/core/PKPApplication.php
+++ b/lib/pkp/classes/core/PKPApplication.php
+    public static function hasSingleFileRepresentations(): bool
+    {
+        return true;
+    }
--- a/lib/pkp/controllers/wizard/fileUpload/form/PKPSubmissionFilesUploadBaseForm.php
+++ b/lib/pkp/controllers/wizard/fileUpload/form/PKPSubmissionFilesUploadBaseForm.php
-                if ($this->getAssocType() === Application::ASSOC_TYPE_REPRESENTATION) {
+                if ($this->getAssocType() === Application::ASSOC_TYPE_REPRESENTATION && Application::hasSingleFileRepresentations()) {
--- a/classes/core/Application.php
+++ b/classes/core/Application.php
+    public static function hasSingleFileRepresentations(): bool
+    {
+        return false;
+    }
```

Tried on `main`: step 6 then offered "If you are uploading a revision
of an existing file, please indicate which file." with "This is not a
revision of an existing file" and `u73e-first.pdf`. After choosing
`u73e-first.pdf`, the format listed one file, number 145, named
`u73e-second.pdf`, with both uploads in its history. As a control, a
galley's "Change File" on OJS submission 1 and OPS preprint 1 showed
step 1 without a list of files, with the fix applied and without it.

A revised file keeps its terms and approval. The upload changes only
the file row's `fileId`, `name` and `uploaderUserId`
(`SubmissionFilesUploadForm::execute()`), and leaves its sales type,
price and `viewable` as they were. It also keeps its number, so its
download address stays the same.

**Alternatives**

- Relabel the link "Upload File". That would match what the window
  does today, but it would make the lost replace official, and
  `pkp/pkp-lib#13416` asks for the replace back.
- Decide by `revisionOnly` or `revisedFileId` instead of a per-app
  switch. That brings back `pkp/pkp-lib#12349` for a galley whose file
  was deleted (see the Cause).
- Check the application's name in the form. That works, but the code
  base expresses app differences through `Application` statics, not
  name checks.

**What goes with it**

- No data repair, no API or hook change. Uploads already made as new
  files stay as they are.
- Backport: the PR targets `stable-3_5_0`; main needs the same pair as
  a separate port. The method is the same on both branches. 3.4 and
  3.3 do not need it.
- Guard: an e2e check that a format holding a file offers it in "Change
  File" and that choosing it leaves one file (the spec's Rule 9), and a
  unit test of `getSubmissionFiles()` for both answers of the switch.

Medium: the change is a few lines and a reviewable PR exists for 3.5,
but it spans two repos (pkp-lib and OMP), each needing review, a merge
and a port to main.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-change-file-only-adds/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/format-change-file-only-adds/lib.js)),
  run as
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/format-change-file-only-adds/walk.js`.
  The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/format-change-file-only-adds/fix-omp.diff omp`
  (and `fix-ojs.diff`, `fix-ops.diff` on their apps), then `revert`.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets 566bb1f
  (2026-10-03); both gave the Observed above. The database after step
  7 held two `submission_files` rows on the format (145 and 146), one
  upload each. Tips: OMP `main` 3b0ecf794 (2026-09-29), its pkp-lib
  3dc90c81a6; OMP `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib
  cf3f984335, where the same early return sits at lines 224–234 (the
  3.5 commits of `pkp/pkp-lib#12349` are a5878b541c and 52e27bc6de).
  The galley control ran on OJS `main` ff004d0973 (pkp-lib 987776cd04)
  and OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6). On the published
  book 5, `dbarnes` saw "Change File" on the format "PDF" (one screen,
  main).
- 3.4 and 3.3 (code): pkp-lib `origin/stable-3_4_0` 767353f4fe
  (2026-10-02) and `origin/stable-3_3_0` ac3fa73402 (2026-10-02).
  `getSubmissionFiles()` lists the stage's files filtered by the
  format's assoc, with no representation branch, and neither log has a
  `pkp/pkp-lib#12349` commit. OMP `upstream/stable-3_4_0` 0aec65441 and
  `upstream/stable-3_3_0` 8e72fc883 build the same `AddFileLinkAction`
  for the format.
- Introduced: `git blame` on lines 224–226 gives 3ea21e5071 for the
  `ASSOC_TYPE_REPRESENTATION` condition (its diff adds the early return
  that empties the list) and 117c353d58 for the `revisedFileId` branch
  inside it. 3ea21e5071 names PR `pkp/pkp-lib#12351`, merged to
  `stable-3_5_0` as a5878b541c. Dates are UTC. The label commit
  f86e62bcf3 names `pkp/pkp-lib#1472` and came through PR
  `pkp/pkp-lib#1535`.
- What readers get (code): OMP's `CatalogBookHandler::book()` lists a
  format's files whose direct sales price is set, which the terms
  window sets, so a new file is not listed until its terms are set and
  the old one stays listed until it is deleted. `download()` answers
  `NotFoundHttpException` for a file number that no longer exists.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by "Change File" with publication format, label, replace and proof,
  and by `AddFileLinkAction` and `changeFile`. `pkp/pkp-lib#13416`
  (opened 2026-09-29 from the forum thread "OMP 3.5.0.5 Change File
  under publication format adds a new file instead of revising an
  existing one") is this fault. Its PRs `pkp/pkp-lib#13419` and
  `pkp/omp#2485` were opened 2026-09-30 and had no review, comment or
  later commit on 2026-10-03. On 2026-10-01 the issue was assigned to
  Vitaliy-1 to carry forward, with a note that the PRs had not yet been
  reviewed or tested. Neither PR targets main.
- Unverified: the book page listing both files, and the "404 Not
  Found" for a deleted file's address, are read in the code, not
  walked.
