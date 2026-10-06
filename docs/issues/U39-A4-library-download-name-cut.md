# Library files download under a mangled name when the uploaded name repeats its extension or is long

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR (before GitHub) · [6b199bf6f7](https://github.com/pkp/omp/commit/6b199bf6f7e09a9aa018e61dc43e752ec7e7f815) · 2010-01-18 · Juan Pablo Alperin (jalperin), in OMP; moved unchanged to pkp-lib by [51f4f73184](https://github.com/pkp/pkp-lib/commit/51f4f731842b2fa6f10c17e6325a9b48c3d1ee1b) (2013-03-11, Jason Nugent (jnugent))
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U39 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U39-submission-and-publisher-libraries.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A file added to the Publisher Library or to a submission's Library
downloads under the uploaded file's name with a type code before the
extension, as intended: "contract.pdf" added as "Marketing" downloads as
"contract-MAR.pdf". But when the extension's letters also appear earlier
in the name, in the same case, the name is cut one character before
that first appearance: "notes-pdf-draft.pdf" downloads as
"notes-MAR.pdf". A name that starts with its extension loses only its
last character: "pdf-guide.pdf" downloads as "pdf-guide.pd-MAR.pdf".

Uploaded names are kept to 127 characters. A name of 124 characters or
more keeps a piece of its extension before the type code: a PDF named
with 126 characters downloads ending in ".pd-MAR.pdf", and one of 127
or more in ".pdf-MAR.pdf", the extension twice.

The type code is intended; the cut and the extra extension are the
fault. Only the name is wrong, and the person who saves the file can
rename it. A library file attached to a workflow email goes out under
the same wrong name.

## Impact

- **Lost**: nothing; the downloaded file is complete. Its name no longer
  says what the file is ("notes-MAR.pdf" for a draft of notes), and nobody
  is told.
- **Who**: everyone who downloads a library file whose uploaded name
  holds its extension earlier on, in the same case ("pdf" inside the name
  of a .pdf file, "doc" in a .doc file's, "docx" in a .docx file's;
  "PDF-guide.pdf" is not affected), or runs to 124 characters or more.
  The Publisher Library is used by the manager-level roles; a
  submission's Library by every workflow participant, the Author
  included, though some of them are refused its downloads
  (`jardakotesovec/pkp-e2e#691`). The recipient of a workflow email with
  such a file attached ("Attach Files" › "Library Files") gets the same
  name.
- **Way round**: rename the file after saving it, or upload it under a
  name that holds no copy of its extension and is shorter than 124
  characters.

Low: a wrong file name on a narrow input, with nothing lost; a name
that hid the content type or dropped the extension would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (the same on OMP and OPS).
- Four PDF files on the computer, any content, named:
  - `notes-pdf-draft.pdf`
  - `pdf-guide.pdf`
  - `Minutes-of-the-editorial-board-meeting-on-the-open-access-policy-the-article-processing-charges-and-the-new-review-guidelines-2026.pdf`
    (any name of 127 characters or more; this one has 134)
  - `contract.pdf`

Adding:

1. Sign in as `dbarnes`.
2. Open Settings › Workflow, tab "Publisher Library" (OMP "Press
   Library", OPS "Preprint Server Library").
3. Press "Add a file". Type "u39e notes" in "Name", choose "Marketing" in
   "Type", press "Upload File" and choose `notes-pdf-draft.pdf`. Press
   "OK".
4. Repeat step 3 with "u39e guide" and `pdf-guide.pdf`.
5. Repeat step 3 with "u39e minutes" and the long-named file.
6. Repeat step 3 with "u39e contract" and `contract.pdf`.

Downloading:

7. Press "u39e notes" in the list. The browser downloads a file; note its
   name.
8. Do the same for "u39e guide", "u39e minutes" and "u39e contract".

**Expected**: each download carries the uploaded name with "-MAR" before
the extension: `notes-pdf-draft-MAR.pdf`, `pdf-guide-MAR.pdf`, the long
name shortened to fit with "-MAR.pdf" at its end
(`Minutes-of-the-editorial-board-meeting-on-the-open-access-policy-the-article-processing-charges-and-the-new-review-guid-MAR.pdf`,
127 characters), and `contract-MAR.pdf`.

**Observed**: the downloads are named:

```
u39e notes     Content-Disposition: attachment; filename="notes-MAR.pdf"
u39e guide     Content-Disposition: attachment; filename="pdf-guide.pd-MAR.pdf"
u39e minutes   Content-Disposition: attachment; filename="Minutes-of-the-editorial-board-meeting-on-the-open-access-policy-the-article-processing-charges-and-the-new-review-guid.pdf-MAR.pdf"
u39e contract  Content-Disposition: attachment; filename="contract-MAR.pdf"
```

## Cause

The name a library file downloads under is the name stored with it
(`library_files.file_name`, `LibraryFile::getServerFileName()`), which is
also the file's name on disk in the context's `library/` folder.
`PKPLibraryFileManager::generateFileName()`
(`lib/pkp/classes/file/PKPLibraryFileManager.php`) builds it at upload as
`{base}-{type code}.{extension}` and, while
`LibraryFileDAO::filenameExists()` finds the name in the context, as
`{base}-{type code}-{n}.{extension}`.
`LibraryFileHandler::downloadLibraryFile()` then calls
`FileManager::downloadByPath()` without a name, which sends that stored
name.

The base is taken wrongly, on line 79 and again on line 92 for the
numbered names ("-MAR-1", "-MAR-2"):

```php
$ext = $this->getExtension($originalFileName);
$truncated = $this->truncateFileName($originalFileName, 127 - Str::length($suffix) - 1);
$baseName = Str::substr($truncated, 0, Str::position($originalFileName, $ext) - 1);
```

`$originalFileName` is the uploaded name as `TemporaryFileManager`
stored it, already cut to 127 characters with the extension kept (line
122). The line means "the name up to the dot before the extension", but
it breaks two rules. `Str::position()` finds the *first* place the
extension's text appears anywhere in the name (case-sensitive), not the
final ".pdf". And it measures that place in `$originalFileName` while it
cuts `$truncated`, which is shorter (123 characters for a three-letter
code):

- "notes-pdf-draft.pdf": "pdf" first appears at position 6, so the base
  is the first 5 characters, "notes".
- "pdf-guide.pdf": "pdf" appears at position 0, so the length is -1, and
  `Str::substr()` with -1 keeps everything but the last character,
  "pdf-guide.pd".
- A name of 124 to 127 characters: `truncateFileName()` shortens it to
  123 characters ending in ".pdf", but the position lies past that end,
  so the base keeps one to four characters of ".pdf": 124 gives
  "….-MAR.pdf", 125 "….p-MAR.pdf", 126 "….pd-MAR.pdf", 127 (every longer
  upload) "….pdf-MAR.pdf".

The 2024 change that blame shows on the line (ab953c3974, "Remove
Stringy dependency") only swapped `PKPString::strpos()` for
`Str::position()`; the line itself is the original's (Introduced).

Reach:

- Both libraries: the Publisher Library's "Add a file" and "Replace file"
  in "Edit" (`NewLibraryFileForm`, `EditLibraryFileForm` under
  `controllers/grid/settings/library/form/`) and a submission's "Library"
  "Add a file" (`controllers/grid/files/submissionDocuments/form/NewLibraryFileForm`)
  all store the name through `assignFromTemporaryFile()` (code; the
  Publisher Library on screen).
- A library file attached to a workflow email: the composer's attachment
  takes the stored name (`filename` in `PKPLibraryController::fileToResponse()`,
  `FileAttacherLibrary` in ui-library's `Composer.vue`) and
  `Mailable::attachLibraryFile()` sends the file under it (code).
- A public library file opened at its "downloadPublic" address is saved
  under the same name (`LibraryFileHandler::downloadPublic()`) (code).
- Files already uploaded keep the name they were stored under, on disk
  and in the database; their download works (code).
- No app overrides `generateFileName()` (the apps' `LibraryFileManager`
  classes add nothing to it), and it is the only code in lib/pkp and the
  three apps that takes a base name this way (code).

## Proposed fix

A proposal: take the base as everything before the last dot of the
shortened name, on both lines
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-name-cut/fix.diff)):

```diff
         $truncated = $this->truncateFileName($originalFileName, 127 - Str::length($suffix) - 1);
-        $baseName = Str::substr($truncated, 0, Str::position($originalFileName, $ext) - 1);
+        $baseName = Str::beforeLast($truncated, '.');
 ...
             $truncated = $this->truncateFileName($originalFileName, 127 - Str::length($fullSuffix) - 1);
             // get the base name and append the suffix
-            $baseName = Str::substr($truncated, 0, Str::position($originalFileName, $ext) - 1);
+            $baseName = Str::beforeLast($truncated, '.');
```

This keeps what the line was written for. The extension comes from the
same `getExtension()` (the text after the last dot), and the shortened
name already ends in "." and that extension, so cutting at its last dot
leaves exactly the base, and the 127-character limit holds.

Tried on `main` in all three apps: the four files downloaded as
`notes-pdf-draft-MAR.pdf`, `pdf-guide-MAR.pdf`, the 127-character
`…-review-guid-MAR.pdf` and `contract-MAR.pdf`.

A second check added names the fix must leave alone, and they came out
the same with the fix in and out. "contract.pdf" added twice as
"Marketing" downloaded as `contract-MAR.pdf` and `contract-MAR-1.pdf`.
"report.v2.final.pdf" added as "Reports" downloaded as
`report.v2.final-REP.pdf`.

The same check added the long name twice as "Other", which also takes
the numbered branch. Without the fix, the two downloads were 131
characters long and carried ".pdf" twice. With it, both were 127
characters long and ended in `-OTH.pdf` and `-OTH-1.pdf`.

**Alternatives**:

- Search for the extension from the end (`mb_strrpos()` on the
  shortened name): the same result with more arithmetic.
- Download under a name built from the original at request time
  (`downloadByPath(..., $fileName)`): fixes the download for files
  already stored, but leaves the stored names wrong and needs the same
  base-name logic anyway.

**What goes with it**:

- Stored names: the fix changes the names of files uploaded (or
  replaced) after it; names already stored stay as they are, on disk and
  in the database, and need no repair.
- A name with no dot at all is a separate quirk: `getExtension()`
  returns the whole name as the extension, so "README" is stored today
  as "READM-MAR.README" and with the fix as "README-MAR.README"; left as
  it is (code, not walked).
- Backport: `stable-3_5_0` has the same two lines and the diff applies as
  written; `stable-3_4_0` and `stable-3_3_0` have them with
  `PKPString::strpos()` and `PKPString::substr()`, where the same change
  is written with that file's `PKPString` helpers (`strrpos()` and
  `substr()`).
- The guard: a unit test for `generateFileName()` with the names above.
  The method reaches `LibraryFileDAO` through `DAORegistry::getDAO()`, so
  the test registers a mock with `DAORegistry::registerDAO()` to answer
  `filenameExists()`, listing `LibraryFileDAO` in
  `PKPTestCase::getMockedDAOs()` so the real one is restored afterwards.
  Or an e2e check on the download's name in the U39 library scenario.

Small: two lines in one shared class, following the helper the file
already uses, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-name-cut/walk.js)
  (steps 1 to 8; `nb` as its argument runs the neighbour check alone;
  helpers in its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/library-download-name-cut/lib.js)
  and `library-download-redraws-list/lib.js`; the uploads are copies of a
  243-byte PDF under the step names), run on installs freshly loaded from
  PKP's default test dataset (pkp/datasets e8dafbc, 2026-10-02,
  PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/library-download-name-cut/walk.js [nb]`.
  Walked on `main` and `stable-3_5_0` (`PKP_E2E_LINE=stable-3_5_0` in
  front), OJS, OMP and OPS, with the same names on both.
- The fix: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, then
  `walk.js` (the Expected names) and `walk.js nb` with the fix in and out.
- Branch tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS
  c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (lib/pkp cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441,
  OPS acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, lib/pkp ac3fa73402.
- Code reads: on `main`, `PKPLibraryFileManager` (byte-identical in the
  three apps' lib/pkp), `FileManager::getExtension()`,
  `truncateFileName()` and `downloadByPath()`,
  `TemporaryFileManager` (which stores the uploaded name cut to 127
  characters, extension kept), `LibraryFileHandler`, the three forms that
  call `copyFromTemporaryFile()`/`replaceFromTemporaryFile()`, the
  Publisher Library "Edit" template (it shows `getOriginalFileName()`),
  `PKPLibraryController::fileToResponse()`, `Composer.vue`,
  `Mailable::attachLibraryFile()`, and the apps' `LibraryFileManager`
  classes. On `stable-3_5_0` the same `generateFileName()`. On
  `stable-3_4_0` (`classes/file/PKPLibraryFileManager.php`) and
  `stable-3_3_0` (`.inc.php`) the same two lines with
  `PKPString::substr()`/`PKPString::strpos()`, where `strpos()` is
  Stringy's `indexOf()` (first occurrence), `downloadByPath()` called
  without a name, and the library tab in lib/pkp's
  `templates/management/workflow.tpl` (OPS 3.3 in its own).
- Introduced: `git blame` on line 79 names ab953c3974 (2024, the Stringy
  removal, a one-for-one swap); `git log -S` on the line finds
  51f4f73184 in pkp-lib ("library file manager to PKP-lib") and, in
  pkp/omp, 6b199bf6f7 ("implement library files grid"), whose
  `generateFileName()` has the same line.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, by the symptom's words and by `generateFileName`,
  `LibraryFileManager` and `truncateFileName`. `pkp/pkp-lib#2003`
  (extensions lost on imported galleys), `pkp/pkp-lib#10282` (a library
  file's accented name on disk) and `pkp/pkp-lib#6898` (diacritics
  stripped on download) are other faults.
- Not walked: the Submission Library and "Replace file" (same method, by
  code); the email attachment and the public address (by code); names
  of 124 to 126 characters, the case examples ("PDF-guide.pdf", .doc,
  .docx) and "README", whose stored names come from running the
  method's lines (with `getExtension()` and `truncateFileName()`) under
  PHP against main's lib/pkp, before and after the fix.
- MySQL not checked; nothing in the fault depends on the database.
