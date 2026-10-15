# Both XML entries of "Download Review Form" open a "not authorized" page until a review PDF is downloaded

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no review download)
  - 3.3: none (code; no review download)
- **Introduced** `pkp/pkp-lib#10226` for `pkp/pkp-lib#9873` · [d5d08a789a](https://github.com/pkp/pkp-lib/commit/d5d08a789a7d2a1b0defe13e643c500b828409b8) · 2024-07-01 · RobA (MrRob100)
- **Upstream** none found (2026-10-15)
- **Tracked in** U27 [A49](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a49)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens a review's "Review Details" window, presses "Download
Review Form" and picks "Editor Form Shows All Review Sections (XML)" or
"Author-Only Sections Displayed (XML)". Instead of a file, the browser
leaves the workflow for a page reading
`{"error":"You are not authorized to access the requested resource."}`,
however often the entry is pressed.

It happens until the install's temporary files folder exists. The first
review PDF downloaded by anyone, on any review, creates it and makes
both XML entries work from then on, but nothing on screen says so.

Uploading a logo, an email attachment or a library file creates the
folder too; submission and review files do not. So a new journal or
press whose only uploads so far are submissions and reviews meets it
at its first XML review download, and so does PKP's default test
dataset as loaded.

## Impact

- **Lost**: the XML copy of a review, until a review PDF is downloaded.
  Nothing stored is lost.
- **Who**: editors and managers on a new install that has had no
  upload other than submission files, at the first XML review
  download. An install upgraded from 3.4 or 3.3 keeps its folder, so it
  meets it only if it never had such an upload either.
- **Way round**: download any review as PDF once.

Medium: the XML download fails with a misleading "not authorized"
page until a way round that nothing on screen names. It is not low,
because the task does not get done without that way round; it would be
high if installs in use could fall back into the state.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OMP). Its files folder
  has no `temp` folder as loaded; on another install, delete
  `<files_dir>/temp` if present.
- The dataset's own completed reviews serve: OJS submission 10,
  "Condensing Water Availability Models to Focus on Specific Water
  Management Systems", reviewed by Aisla McCrae; OMP submission 16, "A
  Designer's Log: Case Studies in Instructional Design", reviewed by
  Adela Gallego.

Steps (OJS; OMP in brackets):

1. Sign in as `dbarnes`.
2. Open
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=10`
   [OMP: `16`; `dbarnes` is not assigned to it, so it is listed under
   "Active submissions", not "Assigned to me"]. The workflow opens on
   the Review stage [OMP: "External Review"].
3. In the "Reviewers" table, press "Read Review" on Aisla McCrae's row
   [OMP: Adela Gallego's]. The "Review Details" window opens [3.5: it is
   headed "Review: <title>"].
4. Press "Download Review Form" and pick "Editor Form Shows All Review
   Sections (XML)".
5. Open the address of step 2 again, repeat step 3, press "Download
   Review Form" and pick "Author-Only Sections Displayed (XML)".
6. Open the address of step 2 again, repeat step 3, press "Download
   Review Form" and pick "Editor Form Shows All Review Sections (PDF)".
7. Press "Download Review Form" and pick "Editor Form Shows All Review
   Sections (XML)".

**Expected**: steps 4, 5 and 7 download `submission_review_10-15.xml`,
as step 6 downloads `submission_review_10-15.pdf`, and the editor stays
in the workflow.

**Observed**: steps 4 and 5 leave the workflow for
`…/api/v1/reviews/10/exports/<id>`, a page reading

```
{"error":"You are not authorized to access the requested resource."}
```

and no file arrives. The export request itself answers 200
(`GET …/api/v1/reviews/10/15/export-xml?authorFriendly=0`, then `=1`),
and the server log reads, at each press:

```
PHP Warning: DOMDocument::save(<files_dir>/temp/submission_review_10-15.xml): Failed to open stream: No such file or directory in lib/pkp/api/v1/reviews/PKPReviewController.php on line 723
PHP Warning: filesize(): stat failed for <files_dir>/temp/submission_review_10-15.xml in lib/pkp/classes/file/TemporaryFileManager.php on line 146
```

Step 6 downloads the PDF, and step 7 then downloads the XML. OMP shows
the same with `submission_review_16-21`.

## Cause

`PKPReviewController::generateXML()` (lib/pkp
`api/v1/reviews/PKPReviewController.php`, line 723) writes the export
straight to the temporary files folder with `DOMDocument::save()`:

```php
$fileManager = new TemporaryFileManager();
$tempFilename = $fileManager->getBasePath() . "submission_review_{$submissionId}-{$reviewId}.xml";
$xml->save($tempFilename);
```

`TemporaryFileManager::getBasePath()` is `<files_dir>/temp/`, and the
installer does not create that folder. `DOMDocument::save()` creates
no folder either, so on an install without one the XML is never
written, and a PHP warning is the only trace.

What creates the folder:

- the review PDF: `generatePDF()` starts mPDF with
  `'tempDir' => $fileManager->getBasePath()` (line 403), and mPDF's
  `Cache::createBasePath()` makes the folder; the PDF itself is then
  written with `FileManager::writeFile()` (line 466), which makes it as
  well;
- `TemporaryFileManager::handleUpload()`, behind the temporary files
  API and the legacy upload grids: website images and stylesheets,
  category, highlight and announcement images, email attachments
  uploaded in the email window, library files, plugin and import
  uploads, OJS issue covers and issue galleys;
- `writeFile()` in the DOI agency exports (Crossref, DataCite).

Submission files do not: the submission wizard, reviewers' files and
revisions are stored with `app()->get('file')->add()`
(`PKPSubmissionFileController::add()`, `SubmissionFilesUploadForm`),
which writes into the context's folders and never touches `temp/`. That
is why the default test dataset, full of submissions, has no `temp`
folder. 3.4 and 3.3 had `handleUpload()` behind the same kinds of
upload, and the upgrade neither creates nor removes the folder.

The method then registers the missing file anyway:
`createTempFileFromExisting()` stores a `temporary_files` row with
`file_size` 0 and the export answers 200 with its id. The screen follows
that id to `getExportedFile()`, where `TemporaryFileManager::downloadById()`
finds no file and returns false, and the controller answers every
failure there with 403 `api.403.unauthorized`.

Reach:

- Both XML entries ("Editor Form Shows All Review Sections (XML)",
  `authorFriendly=0`, and "Author-Only Sections Displayed (XML)",
  `authorFriendly=1`) go through `generateXML()`; seen on screen in OJS
  and OMP.
- No other writer into the temporary folder skips the folder: the
  writers above all make it, and the native import's `tempnam()`
  falls back to the system temporary folder. Checked in the code
  (lib/pkp, OJS, OMP and OPS on `main`).
- Each failed press leaves a `temporary_files` row for a file that does
  not exist; the periodic clean-up of expired temporary files removes
  such rows.

## Proposed fix

Write the XML through the file manager, as `generatePDF()` does for the
PDF, so the folder is created when missing
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-xml-download-error-page/fix.diff)):

```diff
         $fileManager = new TemporaryFileManager();
         $tempFilename = $fileManager->getBasePath() . "submission_review_{$submissionId}-{$reviewId}.xml";
-        $xml->save($tempFilename);
+        $fileManager->writeFile($tempFilename, $xml->saveXML());
         $user = Application::get()->getRequest()->getUser();
```

`saveXML()` returns the same document `save()` writes, so the file does
not change; `writeFile()` makes the folder first and sets the file mode
the other temporary files get.

The diff leaves `writeFile()`'s return unchecked, as `generatePDF()`
does. Once the folder exists, a write fails only when `files_dir` is
not writable, which breaks every upload of the install as well, and
reporting that properly belongs to both exports together (below), not
to this one line.

Tried on `main` in OJS and OMP, on a freshly loaded dataset: steps 4,
5 and 7 downloaded `submission_review_10-15.xml` (OMP
`submission_review_16-21.xml`) without leaving the workflow, and the
server log stayed empty. To check that it reaches no further, the PDF
was downloaded first and then both XML entries, with the fix in and
out: all three downloaded each time, and each XML file was byte for
byte the same with the fix in and out, the author-only one still with
the reviewer anonymized.

**Alternatives**:

- Create `temp/` in `TemporaryFileManager`'s constructor. It costs one
  `file_exists()` per `new TemporaryFileManager()` and writes only when
  the folder is missing, and it would cover any later writer that
  bypasses the manager too. Not recommended as the fix: the code base's
  pattern is that each writer makes its folder (`handleUpload()`,
  `writeFile()`), and the constructor runs on read and delete paths
  that need no folder.
- Create it in the installer. That misses every install that exists
  already.
- Make `getExportedFile()` answer 404 for a missing file. Better
  wording for any later failure, but the download still fails; worth
  doing beside the fix, not instead.

**What goes with it**:

- `generateXML()` and `generatePDF()` could both refuse to register a
  file whose write failed (`createTempFileFromExisting()` stores size 0
  today), so a failed write answers an error instead of an id the
  screen follows to a 403.
- Backport: the diff applies to 3.5 with a line offset.
- A guard: an e2e check in U27 that downloads a review's XML first on
  an install without `temp/`.

Small: one line in one pkp-lib method, following the PDF export, plus
a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-xml-download-error-page/walk.js).
  It takes steps 1–7 on an install freshly loaded with the default
  dataset, and reads the files folder for `temp` before and after
  each press. Run it with
  `PROBE_FEATURE=<dataset fleet feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/review-form-xml-download-error-page/walk.js`
  (then `omp`); `MODE=nb` runs the PDF-first neighbour check alone.
- Walked on 2026-10-15 on OJS and OMP, `main` and `stable-3_5_0`, each
  install freshly reset to the default dataset (pkp/datasets 7912e09,
  PostgreSQL), with no `temp` folder in the files folder at the start.
  Every walk gave the Observed above (the warning's line is 668 on
  3.5). Each failed press stored a `temporary_files` row with
  `file_size` 0 for a file that was never written. No request answered
  500 or more and no page script failed; the browser's only console
  errors were the two 403s.
- MySQL was not checked; the fault is a missing folder on disk.
- Tips walked or read: OJS `main` 378eced941 and OMP `main` f4836d4fb,
  both with lib/pkp b17fadae59 and ui-library 47b565cb; OJS
  `stable-3_5_0` ca763c91cd and OMP `stable-3_5_0` a70bbb9c4, both with
  lib/pkp 4045d9241e and ui-library 2576e00a; lib/pkp and ui-library
  `stable-3_4_0` 55c8e406b3 and `stable-3_3_0` 5e84acd11b.
- The screen side (ui-library
  `src/managers/ReviewerManager/useReviewContent.js`) fetches the export,
  then follows the returned id with a plain link to
  `reviews/{submission}/exports/{id}`, which is why the browser leaves
  the workflow for the 403's JSON body.
- 3.5 code (lib/pkp `stable-3_5_0`): `generateXML()` has the same
  `$xml->save()` (line 668), `generatePDF()` the same mPDF `tempDir`
  (line 348) and `writeFile()` (line 411); d5d08a789a is on the branch.
- 3.4 and 3.3 code (lib/pkp `origin/stable-3_4_0` and
  `origin/stable-3_3_0`, ui-library the same): no
  `api/v1/reviews/PKPReviewController.php`, no `export-xml` route and no
  review download in the ui-library. `handleUpload()` serves the
  temporary files API there too (3.4
  `api/v1/temporaryFiles/PKPTemporaryFilesHandler.php`).
- What creates `temp/` is read in the code on `main`, not driven:
  nothing in `PKPInstall` or `Installer`; `handleUpload()` (its callers:
  `PKPTemporaryFilesController`, ui-library `FileAttacherUpload.vue`
  for the email window, `LibraryFileGridHandler`, `SetupGridHandler`,
  `PluginGridHandler`, the native and users import plugins, OJS
  `IssueGridHandler` and `IssueGalleyGridHandler`); mPDF
  `Cache::createBasePath()`; `writeFile()`. Submission files go through
  `app()->get('file')->add()` and never reach it; no submission upload
  was walked to confirm.
- Introduced: `git blame` on line 723 gives d5d08a789a ("download review
  label added", RobA, 2024-07-01), which wrote `generateXML()` whole;
  `commits/d5d08a789a/pulls` gives `pkp/pkp-lib#10226` ("Download
  reviews from modal", merged 2024-11-14) for `pkp/pkp-lib#9873`. The
  later `pkp/pkp-lib#13306` (for `pkp/pkp-lib#13305`) moved mPDF's
  cache into `temp/` and left the XML write alone.
- Upstream search (2026-10-15), pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by symptom words ("review download xml", "Download
  Review Form", "review xml not authorized") and by
  `generateXML`/`exportReviewXML`: `pkp/pkp-lib#13305` (closed) is the
  PDF export's mPDF cache under a read-only `vendor`, and
  `pkp/pkp-lib#12265` (closed) a fatal error in the review download;
  neither is this fault.
