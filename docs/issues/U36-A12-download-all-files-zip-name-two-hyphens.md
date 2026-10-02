# "Download All Files" names its zip with two hyphens after the submission's number

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** no PR · [1979b7a55e](https://github.com/pkp/pkp-lib/commit/1979b7a55eb1cdea648de423d06a6378dc7e5fc2) · 2024-02-08 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

"Download All Files" under a file list names its zip after the
submission's number and the list, with two hyphens between them:
"12--submission-files.zip", "12--production-ready-files.zip".

The zip itself is right: it downloads and holds the list's files.

It happens under both lists that have the button, "Submission Files"
and "Production Ready Files", in every interface language whose list
title opens with a capital Latin letter. In a language written in
other letters the name has one hyphen, but the title's words run
together and keep their own letters ("12-файлыматериала.zip" in
Russian). A preprint server has neither list, so it has no such
button.

## Impact

- **Lost**: nothing.
- **Who**: every editor, assistant and author who presses "Download All
  Files", each time.
- **Way round**: none needed; the file can be renamed after the
  download.

Low: only the file's name is wrong. It would be medium if a tool
were known to find the zip by its name; no such tool is known.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. Nothing else is needed.
- On OMP the same steps use submission 3, "The Political Economy of
  Workplace Injury in Canada".

Steps:

1. Sign in as `dbarnes`.
2. On the dashboard, under "Active submissions", press "View" on
   submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice". The workflow opens
   on "Submission".
3. Under "Submission Files", press "Download All Files".

**Expected**: a zip named "4-submission-files.zip" (OMP
"3-submission-files.zip").

**Observed**: the zip is named "4--submission-files.zip" (OMP
"3--submission-files.zip"). It holds the list's files: on OJS the one
PDF, on OMP "chapter1.pdf" to "chapter5.pdf".

Control: the file's own name link in the same list downloads the file
under its own name (OMP "chapter5.pdf"), so the fault is in the zip's
name alone.

## Cause

`FileApiHandler::downloadAllFiles()` (pkp-lib
`controllers/api/file/FileApiHandler.php`, lines 174 to 178) builds the
name from the submission's number, a hyphen and the list's translated
title, and then shapes the whole string:

```php
$filename = $args['submissionId'] . '-' . $filename;
$filename = (string) Str::of($filename)->kebab()->replaceMatches('[^a-z0-9\-\_.]', '');
```

Laravel's `kebab()` (`Str::snake()` with "-") capitalises each word,
removes the spaces and then puts a hyphen after every character that is
followed by a capital letter from A to Z. In "4-Submission Files" the
hyphen the line above added is such a character: it sits before the
"S". So it gets a second hyphen: "4--submission-files".

Until 3.4 the same line used Stringy:
`toLowerCase()->dasherize()->regexReplace('[^a-z0-9\-\_.]', '')`.
`dasherize()` folds a run of hyphens and spaces into one hyphen, so the
name had one. 1979b7a55e ("Use Laravel Str in place of Stringy")
swapped it for `kebab()`, which does not fold.

The same change broke the second half of the statement. Stringy's
`regexReplace()` needed no delimiters around its pattern;
`replaceMatches()` calls `preg_replace()`, which takes the square
brackets as the delimiters. The pattern is then `^a-z0-9\-\_.`: the
text "a-z0-9-_" and one more character at the start of the name. No
name opens like that, so nothing is stripped.

Reach:

- The workflow's button: ui-library `useFileManagerConfig.js` permits
  the action on two lists only, "Submission Files" and "Production
  Ready Files". "Submission Files" was taken through the screens on
  OJS and OMP; "Production Ready Files" is read in the code (the same
  handler with another title key).
- A preprint server's workflow shows neither list (its files are
  galleys), so OPS has no screen that calls the method.
- A second caller: pkp-lib's `DownloadAllLinkAction`, which
  `FilesGridCapabilities::getDownloadAllAction()` adds to the old file
  grids with `FILE_GRID_DOWNLOAD_ALL`
  (`EditorSubmissionDetailsFilesGridHandler`,
  `AuthorSubmissionDetailsFilesGridHandler`,
  `ProductionReadyFilesGridHandler`). It sends no `nameLocaleKey`, so
  the title falls back to "Files" and the name is "12--files". No
  screen loads these grids on `main` or 3.5: the only reference left is
  `templates/controllers/tab/authorDashboard/submission.tpl`, which no
  handler displays any more (read in the code). The reviewer's file
  grid does not have the capability.
- Languages (line 178 run alone in PHP, not through the screens): a
  title that opens with a capital A to Z gets the two hyphens (French
  "4--fichiers-de-la-soumission"). `kebab()` knows no other capitals,
  so a Russian, Arabic or Japanese title keeps one hyphen and loses the
  breaks between its words: "12-файлыматериала", "12-投稿ファイル".
- Since nothing is stripped, accented and non-Latin letters go into the
  file name as they are: "12--fichiers-prêts-pour-la-production". On
  3.4 the strip removed them ("12-fichiers-prts-pour-la-production").
- The same pattern string without delimiters sits in
  `PKP\emailTemplate\DAO::getUniqueKey()` (line 439) and in the custom
  block plugin's `CustomBlockForm` (reported as U09 A4). Neither puts a
  number and a hyphen in front, so neither shows this symptom (read in
  the code).
- `downloadFile()`, the class's other download, does not shape an
  ordinary file's name with `kebab()` at all (lines 122 and 141). It
  uses `kebab()` only for the neutral name an anonymous reviewer gets
  (lines 131 to 138), on a title alone, where no hyphen precedes a
  capital (read in the code, not driven).

## Proposed fix

A proposal; the team decides. Build the name with Laravel's `Str::slug()`
over the number and the title together, in place of both statements:

```diff
-        $filename = $args['submissionId'] . '-' . $filename;
-        $filename = (string) Str::of($filename)->kebab()->replaceMatches('[^a-z0-9\-\_.]', '');
+        $filename = Str::slug($args['submissionId'] . ' ' . $filename);
```

The diff: [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/download-all-files-zip-name-two-hyphens/fix.diff).

`Str::slug()` does what the two calls were meant to do together: it
transliterates, lowercases, turns every run of spaces, hyphens and
underscores into one hyphen, and keeps only letters and digits. The
old pattern also kept "_" and "."; no list title holds either.

Tried on `main`, OJS and OMP: the zip is named "4-submission-files.zip"
and "3-submission-files.zip" and holds the same files. A single file's
download keeps its name with and without the fix.

**Alternatives**

- Shape the title alone and prepend the number after:
  `$args['submissionId'] . '-' . Str::of($filename)->kebab()`. It
  removes the second hyphen but leaves the strip dead, so accented and
  non-Latin letters still reach the file name as they are.
- Repair the pattern's delimiters and fold the hyphens by hand. That is
  two more calls for what `slug()` does, and it drops accented letters
  again instead of transliterating them.

**What goes with it**

- The old grids' link action goes through the same line, so it would
  give "12-files".
- Names in other languages change (both expressions run alone in PHP):

  | Language | Now | With the fix |
  |---|---|---|
  | French, "Production Ready Files" | 12--fichiers-prêts-pour-la-production | 12-fichiers-prets-pour-la-production |
  | Russian | 12-файлыматериала | 12-faily-materiala |
  | Arabic | 12-ملفاتالمؤلَّف | 12-mlfat-almolf |
  | Japanese | 12-投稿ファイル | 12 |

  `slug()` cannot transliterate Japanese or Chinese, so the zip is then
  "12.zip" (3.4 gave "12-.zip"). If the team wants the title kept
  there, `Str::slug(…, '-', null)` skips the transliteration and keeps
  the letters of every language.
- Nothing stored is wrong; no repair.
- 3.5: the two lines are the same there (lines 171 and 172), so the
  diff applies as written.
- Test: an assertion on the zip's name where a test already presses
  "Download All Files".

Small: one line in one method, with no stored data and no API involved.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/download-all-files-zip-name-two-hyphens/walk.js)
  with its `lib.js`. It takes the Steps on OJS (submission 4) and OMP
  (submission 3), reads the name the browser is given and lists the
  zip's content, then presses the first file's name link as the
  control. Run on a freshly loaded default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/download-all-files-zip-name-two-hyphens/walk.js`;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `MODE=neighbour`
  presses only the single file's link, the check used with the fix in
  and out.
- The script opens the workflow at the address the dashboard's "View"
  opens (`…/dashboard/editorial?workflowSubmissionId=<id>`) rather than
  pressing "View" in the list.
- Run 2026-10-02 on PostgreSQL, default dataset of pkp/datasets
  c657990 (2026-10-01). The fault does not depend on the database.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library 280f98c5);
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246 (lib/pkp cf3f984335,
  ui-library d4e01883); lib/pkp `origin/stable-3_4_0` 32b0f4b4af,
  `origin/stable-3_3_0` f6ab331645. `FileApiHandler.php` is the same
  file in both `main` lib/pkp tips.
- 3.5, through the screens on OJS and OMP: "4--submission-files.zip",
  "3--submission-files.zip".
- 3.4 and 3.3, code only: `downloadAllFiles()` in
  `controllers/api/file/FileApiHandler.php` (3.3 `.inc.php`) on both
  branches uses Stringy's
  `toLowerCase()->dasherize()->regexReplace(…)`; 1979b7a55e is on
  `main` and `stable-3_5_0` only (tags from `3_5_0-0`).
- Introduced: `git blame` on line 178 gives 1979b7a55e; the GitHub API
  lists no PR for it. The name's shape (number, hyphen, list title)
  dates from 5f383f87c3 (`pkp/pkp-lib#6057`, 2020), found with
  `git log -S`.
- "Run alone in PHP": line 178's expression and the proposed one, run
  against the `main` checkout's vendored Laravel with the list titles
  of pkp-lib's `en`, `fr_CA`, `ru`, `ar` and `ja` locale files and with
  "Files".
- The old grids: a search of `main` and `stable-3_5_0` (pkp-lib, the
  three apps, ui-library) for the three handlers' names and for
  `FILE_GRID_DOWNLOAD_ALL` finds the handlers themselves,
  `FilesGridCapabilities` and the one template; a search for that
  template and for an author dashboard tab handler finds nothing. The
  grids were not fetched by address.
- OPS: not driven; the dataset's preprints hold no file in the
  submission file stage.
- Not driven: "Production Ready Files" (the dataset has no such file),
  an interface language other than English, an anonymous reviewer's
  download, the `.tar.gz` branch taken where the server cannot make a
  zip.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "Download All
  Files" zip name, `downloadAllFiles`, submission-files.zip, kebab
  Stringy, `FileApiHandler` filename. Read and not this fault:
  `pkp/pkp-lib#4957` (closed; it asked for clearer download names when
  the zip was still "files.zip").
