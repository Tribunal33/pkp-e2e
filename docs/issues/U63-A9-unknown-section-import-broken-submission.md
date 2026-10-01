# Native XML import of an article in a missing section shows nothing and leaves an unopenable submission

- **Severity** medium
- **Effort** medium
- **Kind** intention gap
- **Crash** both
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code; the tab reads "The import completed successfully." and lists the errors, with no server error)
  - 3.3: none (code; an import that records an error deletes what it added)
- **Introduced** `pkp/pkp-lib#7918` for `pkp/pkp-lib#5960` · [c27d476af7](https://github.com/pkp/pkp-lib/commit/c27d476af76d7faf2fb8c5b9947fce5a14d166f6) · 2022-05-10 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#5960` (closed with a fix that reports the missing publication but still keeps the submission)
- **Tracked in** spec U63 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager imports a Native XML file in which an article or preprint
names a section the journal or server does not have. The import request
fails on the server, and the "Import Results" tab opens empty, with no
message. The manager expected that article to be left out with the line
"Unknown section …", or the whole file to be refused.

The import still saves everything in the file, that article included,
but without its publication data: no title, no authors. Its Dashboard
row shows only its number and stage, and its "View" opens nothing. The
broken submission also makes the export tab's script fail, so the
plugin's export list stays empty from then on, for every submission.
Nothing on screen removes the broken submission.

It needs a file with a section abbreviation this journal or server
does not use, such as a file from another journal.

## Impact

- **Lost.** No content is lost, but the journal loses its Native XML
  article (preprint) export list, and OJS also its PubMed export list,
  with nothing saying why.
- **Who.** A manager moving content between journals or servers whose
  sections differ. Only users who see every submission (managers, and
  editors with manager-level roles) see the broken row; the import
  assigns nobody to it.
- **Way round.** Before importing, add the missing section under
  Settings › Journal (Server) › "Sections"; the empty tab does not name
  it, so the manager has to find it in the file. Afterwards only a
  developer can remove the submission, through the REST API or the
  database.

Medium: it needs a file naming a section the journal lacks, but then the
journal-wide export list is gone until a developer steps in. It would
be high if such imports were common, or if other screens turn out to
fail on the broken submission too.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS or OPS, freshly loaded. Its
  `publicknowledge` journal has the sections "Articles" (ART) and
  "Reviews" (REV); the preprint server has "Preprints" (PRE).
- No other setup. `rvaca` is the Journal Manager (Preprint Server Manager).
- Step 4's edit stands in for a file exported from another journal or
  server that has a section this one lacks.

1. Sign in as `rvaca`.
2. Open Tools › "Import/Export" › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
3. Open "Export Articles" (OPS "Export Preprints") and tick submission 4,
   "Computer Skill Requirements for New and Existing Teachers:
   Implications for Policy and Practice" (OPS: submission 1, "The
   influence of lactation on the quantity and quality of cashmere
   production"). Press "Export Articles" ("Export Preprints"), then
   "Download Exported File".
4. In a text editor, change `section_ref="ART"` (OPS `section_ref="PRE"`)
   to `section_ref="ZZZ"` and save.
5. Open the "Import" tab, upload the edited file and press "Import".
6. Open the Dashboard's "Active submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?currentViewId=active`)
   and find the new row: 21 (OPS 20).
7. Press "View" on that row.
8. Open the Native XML Plugin again, then "Export Articles" ("Export
   Preprints").

**Expected:** after step 5, the "Import Results" tab reads "The process
failed. Check below for errors/warnings." with the line "Unknown section
ZZZ", and nothing is added. Alternatively, the rest of the file is
imported and the article is reported as left out with that line. Step 6
shows no new row, and step 8 lists the journal's submissions as before.

**Observed:** after step 5, the "Import Results" tab opens with no text.
The request behind it answered 500:

```
GET /index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin/import?temporaryFileId=… → 500
```

The server log:

```
Uncaught Error: Call to a member function getLocalizedTitle() on null in …/lib/pkp/classes/submission/PKPSubmission.php:289
```

In step 6 the new row reads "21 Submission 0 Assign Editor View" (OPS
"20 Production 0 View"), with no authors and no title. In step 7 the
address gains `workflowSubmissionId=21`, but nothing opens. The browser
console shows:

```
TypeError: Cannot read properties of undefined (reading 'authorsStringShort')
```

In step 8 the export tab shows only "Select All" and "Export Articles"
("Export Preprints"), with no list. The console shows:

```
TypeError: Cannot read properties of undefined (reading 'fullTitle')
```

Control: the same file imported unedited (step 4 skipped) reads "The
import completed successfully." with the new submission, which opens
from the Dashboard.

## Cause

`PKP\plugins\importexport\native\filter\NativeXmlSubmissionFilter::handleElement()`
(lib/pkp `plugins/importexport/native/filter/NativeXmlSubmissionFilter.php`)
inserts the submission (line 93) before it parses the file's
`<publication>` child (lines 100–104). The publication is created by the
app's `NativeXmlPublicationFilter::handleElement()` (OJS
`plugins/importexport/native/filter/NativeXmlPublicationFilter.php`
lines 40–48, OPS lines 38–46). When `section_ref` names no section of
the context, that method records "Unknown section …" with `addError()`
and returns nothing. No publication is created.

The submission filter notices. `parseChild()` (lines 224–228) records
"The submission's child publication failed to be processed", and
`process()` (lines 197–200) records "The submission's current
publication is missing". Both only call `addError()`. That check was
meant to keep such submissions out of the database (`pkp/pkp-lib#5960`);
it reports the submission but keeps it.

`PKPImportExportDeployment::import()`
(`classes/plugins/importexport/PKPImportExportDeployment.php` lines
618–642) runs the whole import in one transaction and rolls it back only
when an exception is thrown. A recorded error does not fail the import,
so the submission without a publication is committed together with
everything else in the file.

`ImportExportPlugin::getImportTemplateResult()`
(`classes/plugins/ImportExportPlugin.php` lines 360–379) then sets the
template's `errorsFound` from `PKPImportExportDeployment::isProcessFailed()`
(lines 789–796), which is true only after a caught exception or an XML
validation error. So `templates/plugins/importexport/resultsImport.tpl`
takes the success branch and lists each imported submission through
`PKPSubmission::getUIDisplayString()` (template line 22). That calls
`getCurrentPublication()->getLocalizedTitle()` on null
(`classes/submission/PKPSubmission.php` line 289) and fails with the
server error above. The template fails before it reaches the error
lines, so on `main` the recorded errors are never shown.

Reach:

- Two causes leave the same submission:
  - an unknown `section_ref` (walked);
  - an empty `section_ref=""`, which the schema accepts: the app filter
    returns nothing without an error of its own, while `parseChild()`
    and `process()` still record theirs (read in the code).
- OJS's issue import: articles inside an `<issue>` go through the same
  article filter (`NativeXmlIssueFilter::parseArticle()`), so they leave
  the same submission (read in the code).
- The command-line import (`tools/importExport.php
  NativeImportExportPlugin import …`): it calls the same
  `PKPImportExportDeployment::import()` and prints each submission with
  `getUIDisplayString()`, so it keeps the submission and then fails the
  same way (read in the code).
- On screen, the broken submission breaks the Dashboard's "View"
  (`dashboardPageStore.js` reads `authorsStringShort` of the missing
  publication) and the Native XML export list (the app's
  `plugins/importexport/native/templates/index.tpl` reads `fullTitle`
  of each listed item's current publication), on both apps (walked).
  OJS's PubMed export list (`plugins/importexport/pubmed/templates/index.tpl`
  lines 64–65) reads it the same way over all submissions (read in the
  code).
- Its Dashboard row offers only "Assign Editor" and "View". Deleting a
  complete submission is done in the workflow, and the Dashboard's bulk
  delete covers incomplete submissions only (`useDashboardBulkDelete.js`
  `canBeDeleted()`).
- The native import creates no stage assignments, so the row shows only
  in views that list every submission (read in the code).
- OMP is not affected: a monograph naming a series the press lacks is
  imported, and the series is created
  ([U63 OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#omp3)).

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/fix.diff)
on all three apps. With the fix, step 5 reads "The process failed. Check
below for errors/warnings." with the lines "The submission's current
publication is missing", "Unknown section ZZZ" and "The submission's
child publication failed to be processed". No submission is added, and
the export list stays whole. These imports read the same with the fix
in and out: an unedited file on OJS and OPS, which still imports
("The import completed successfully."), and an OMP file naming an
unknown series, which still imports with "Warnings encountered:"
"Unknown series zzz".

Recommended: in `NativeXmlSubmissionFilter::handleElement()`, throw when
the submission has no current publication once its children are
parsed. This uses the way the import already fails: an exception rolls
the whole import back in `PKPImportExportDeployment::import()`, and the
messages recorded before it are still listed. The check in `process()`
can then go, because it can no longer find such a submission.

```php
// NativeXmlSubmissionFilter::handleElement(), after
// $submission = Repo::submission()->get($submission->getId());
if (!$submission->getCurrentPublication()) {
    throw new \Exception(__('plugins.importexport.common.error.currentPublicationNullOrMissing'));
}
```

Why here: the shared submission filter is where every app's article,
preprint and monograph import makes a submission. So the fix covers an
unknown section, an empty `section_ref` and any other publication
failure, in OJS and OPS, in the issue import and on the command line.

**Alternatives:**

- Throwing in OJS's and OPS's `NativeXmlPublicationFilter::handleElement()`
  on an unknown section: this covers one cause in two apps and leaves
  an empty `section_ref` (and any other failed publication) keeping the
  broken submission.
- Failing the import on any recorded error, as 3.3 did (it deleted what
  the import had added), by making `isProcessFailed()` count recorded
  errors: `addError()` also records problems that do not stop an import
  today, such as the lines a clean round trip reports
  ([U63 A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a8)),
  so imports that succeed now would be refused.
- Leaving the article out and importing the rest, as the "Unknown
  section" message suggests: the submission row is already inserted
  when the publication fails, so this needs the submission insert
  moved after its publication is parsed. That is a larger change to a
  filter every app shares.
- Making `getUIDisplayString()`, the Dashboard and the export lists cope
  with a missing publication: this hides the failures and still keeps
  the broken submission.

**What goes with it:**

- Behavior: a file with one bad article is now refused whole, as every
  other failed import is. No API or plugin hook changes.
- Files: files the import wrote to disk before the throw (the
  submission's `<submission_file>` entries come before its
  `<publication>`) are not removed by the rollback, as with any other
  exception in the import today.
- Stored data: installs that met this hold submissions with no row in
  `publications`. A repair (an upgrade step deleting them through
  `Repo::submission()->delete()`, which also removes their files and
  stage assignments) goes with the fix. It was not tried on such a
  submission.
- Backport: the diff applies as written to 3.5 and 3.4. On 3.4 the
  results tab does not fail: it reads "The import completed
  successfully." followed by the recorded error lines, and the broken
  submission is kept.
- Guard: a pkp-lib test importing a submission whose publication filter
  returns nothing, which must leave no submission, and the e2e scenario
  in U63 (a Planned item).

Medium: the fix is a few lines in one shared filter, but the broken
submissions that installs already hold need a repair step.

## Evidence

- Kept script that runs the Steps in the browser on OJS and OPS, on an
  install loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/unknown-section-import-broken-submission/walk.js`.
  After the import it also reads the new submission's rows in the
  database: `publications` 0, `current_publication_id` empty.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/unknown-section-import-broken-submission/fix.diff ojs omp ops`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/unknown-section-import-broken-submission/fix.diff ojs omp ops`.
  neighbour.js imports an unedited file on OJS and OPS and a file naming
  an unknown series on OMP, then opens the new submission's workflow by
  the address a Dashboard "View" leads to.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OPS c8af945bb7 (lib/pkp
    3dc90c81a6), ui-library 280f98c5; the fix trial also covered OMP
    (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OJS 92b9a16b48, OPS cf4fce69bd (lib/pkp a9c76aed62
    for both). The walk showed the same as on `main`, line for line.
  - The server log line is from the OJS walk; OPS's request answered
    500 the same way. MySQL not checked; nothing here depends on the
    database.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d, OJS at 9571d8fde7,
  OPS at acd8ae704b.
  - `NativeXmlSubmissionFilter::handleElement()`, `parseChild()` and
    `process()`, `PKPImportExportDeployment::import()` and
    `isProcessFailed()` are the same as on `main`. OJS's and OPS's
    `NativeXmlPublicationFilter::handleElement()` are the same too.
  - `PKPSubmission::getUIDisplayString()` calls the deprecated
    `getLocalizedTitle()`, which returns '' when there is no current
    publication. `resultsImport.tpl` includes `innerResults.tpl` for
    errors whatever `errorsFound` is, so the tab shows the success text
    and then the error lines.
  - The Native XML export list template reads `fullTitle` the same way.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at d446601ebe.
  - `NativeImportExportPlugin::display()` `import` case calls
    `removeImportedObjects()` whenever an error was recorded, and the
    unknown section is one, so the submission is deleted.
  - OPS 3.3 (c5532e2161) has no Native XML plugin.
- The rest of the file: the walk's file held one article. That other
  items in the same file are committed with it rests on the code (one
  transaction, committed unless an exception is thrown).
- Removal off screen, read in the code and not tried:
  `DELETE /api/v1/submissions/{id}` (`PKPSubmissionController::delete()`)
  maps the submission and calls `Repo::submission()->delete()`; the
  Dashboard's submissions request mapped the broken submission without
  failing in the walk. That deleting it brings the export lists back
  follows from the templates (they fail only on an item without a
  publication) and is unverified.
- The PubMed export list (OJS) is read in the code only.
- Introduced: `git blame` on the `process()` check and on `parseChild()`'s
  error stops at c27d476af7 (PR `pkp/pkp-lib#7918`). OJS's side of
  `pkp/pkp-lib#5960`, 029554ec48, changed only `filterConfig.xml`.
  - The transaction that commits despite recorded errors came with
    049f5f85f3 (PR `pkp/pkp-lib#6960` for `pkp/pkp-lib#6490`,
    2021-04-19, the same author). With OJS 69a06f1284 (PR
    `pkp/ojs#3109`), that change replaced 3.3's "delete what the import
    added on any error".
  - The server error came with 8ded2f38eb (`pkp/pkp-lib#9693`,
    2024-02-13, "Remove deprecated functions"), which made
    `getUIDisplayString()` call `getCurrentPublication()` directly. That
    is why 3.4 shows no server error.
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library (native import unknown section, submission without
  publication, `currentPublicationNullOrMissing`, `submissionChildFailed`,
  `getUIDisplayString`, `authorsStringShort`). It found only
  `pkp/pkp-lib#5960`, read with its comments. The other results are
  other faults.
- Unverified: the repair step, and whether other screens (statistics,
  DOIs, the "Search All Submissions" view) also fail on the broken
  submission.
