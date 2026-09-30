# Native XML import of an article whose section the journal lacks leaves a broken submission and empties the export list

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** both
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code; reports success, keeps the submission)
  - 3.3: OJS (code; OPS has no Native XML plugin)
- **Introduced** not traced; present since at least [0b233cee23](https://github.com/pkp/ojs/commit/0b233cee2333287603b8dd23a84bc6d6f44fde89) (2020-02-24)
- **Upstream** `pkp/pkp-lib#9755`, open, filed for OJS 3.3; `pkp/pkp-lib#11353` (OJS 3.5), closed as its duplicate
- **Tracked in** spec U63 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a9)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal or preprint server manager imports a Native XML file whose
article names a section the journal does not have. The server fails and the "Import
Results" tab stays empty, with no message. The manager expects the
import to be refused with the line "Unknown section …".

The article is kept all the same, as a broken submission. Its Dashboard
row shows only its number and stage, and its "View" opens nothing. While
it exists, the Native XML plugin's "Export Articles" list is empty, so
no article can be exported from that screen. No screen can delete the
broken submission, and each retry of the import adds another.

A file exported from another journal carries that journal's section
abbreviations, so an import meets this whenever the two journals'
abbreviations differ.

## Impact

- **Lost.** No existing content. The Native XML article export stays
  unusable until the broken submissions are deleted in the database.
- **Who.** Journal and preprint server managers importing articles from
  another journal.
- **Way round.** Creating a section with the file's abbreviation, or
  editing the file, before the import avoids it. Afterwards there is
  none on screen.

Medium: the failure is silent and cannot be undone on screen, but what
it breaks is a secondary task, the plugin's article export, not
reviewing or publishing. It would be high if imports from journals with
other section abbreviations turn out to be common.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (or `stable-3_5_0`), with
  its journal `publicknowledge`. On OPS the same steps apply, with the
  names in brackets.
- A Native XML file naming a section the journal lacks. Steps 1–5 make
  one from the journal's own export, as a file from another journal
  would read.

1. Sign in as `rvaca` (the Journal Manager) [OPS: the Preprint Server
   manager].
2. Open Tools › "Native XML Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/NativeImportExportPlugin`).
3. Open the "Export Articles" tab [OPS: "Export Preprints"], tick
   submission 8, "Traditions and Trends in the Study of the Commons"
   [OPS: submission 1, "The influence of lactation on the quantity and
   quality of cashmere production"], and click "Export Articles" [OPS:
   "Export Preprints"].
4. In the results tab, click "Download Exported File".
5. In a text editor, change the file's `section_ref="ART"` [OPS:
   `section_ref="PRE"`] to `section_ref="EDT"`, a section abbreviation
   the journal does not have, and save it as `u63a9.xml`.
6. Open the plugin again, the "Import" tab, "Upload File", choose
   `u63a9.xml`, and click "Import".
7. Read the "Import Results" tab that opens.
8. Open the Dashboard's "Active submissions" and find the newest row.
9. Click "View" on that row.
10. Open Tools › "Native XML Plugin" again and its "Export Articles" tab
    [OPS: "Export Preprints"].

**Expected:** step 7 reads "The process failed. Check below for
errors/warnings.", then "Errors occured:" with the line "Unknown section
EDT". Nothing is imported, so steps 8 to 10 show the dataset's
submissions as before.

**Observed:** the import request answers 500 and the "Import Results"
tab stays empty. The server log reads:

```
PHP Fatal error:  Uncaught Error: Call to a member function getLocalizedTitle() on null in lib/pkp/classes/submission/PKPSubmission.php:289
#0 cache/t_compile/…resultsImport.tpl.php(55): PKP\submission\PKPSubmission->getUIDisplayString()
…
#12 lib/pkp/classes/plugins/ImportExportPlugin.php(376): PKP\template\PKPTemplateManager->fetch()
```

- Step 8: "Active submissions (18)" [OPS: "(2)"], one more than the
  dataset's 17 [OPS: 1], lists a new row reading only `21 Submission 0
  Assign Editor View` [OPS: `20 Production 0 View`]: no author, no
  title.
- Step 9: the address gains `&workflowSubmissionId=21` and no window
  opens. The browser console reads `TypeError: Cannot read properties of
  undefined (reading 'authorsStringShort')`, which also appears when the
  Dashboard loads.
- Step 10: the tab shows only "Select All" and the "Export Articles"
  button, with no list. The console reads `TypeError: Cannot read
  properties of undefined (reading 'fullTitle')`.

Control: the file from step 4, imported unchanged the same way, reads
"The import completed successfully." and lists the article.

## Cause

OJS and OPS `NativeXmlPublicationFilter::handleElement()`
(`plugins/importexport/native/filter/NativeXmlPublicationFilter.php`,
OJS lines 41–48, OPS 39–46) records "Unknown section …" with
`addError()` and returns nothing when `section_ref` names no section of
the context, so no publication is created. By then
`PKP\plugins\importexport\native\filter\NativeXmlSubmissionFilter::handleElement()`
(lib/pkp, lines 78–98) has already inserted the submission.

The submission filter sees that the publication filter returned nothing
and that the submission has no current publication, and keeps the
submission anyway. This is where the code first goes wrong. `parseChild()`
records "The submission's child publication failed to be processed"
and `process()` (lines 195–200) records "The submission's current
publication is missing", both with `addError()`.
`PKPImportExportDeployment::import()` rolls back only when a filter
throws, so recorded errors never stop the import, and the transaction
commits a submission with no publication. This breaks the rule every
other part of the app relies on: a submission always has a current
publication.

The crash follows from that. `ImportExportPlugin::getImportTemplateResult()`
sees no failure and renders the imported items. `resultsImport.tpl` calls
`PKPSubmission::getUIDisplayString()`, which dereferences
`getCurrentPublication()` (null), and the request dies before any of the
recorded errors is shown.

The browser errors come from the code that reads the submission's
current publication:

- the Dashboard row: ui-library `DashboardCellSubmissionTitle.vue`
  (`currentPublication.authorsStringShort`);
- its "View": ui-library `dashboardPageStore.js` `openWorkflowModal()`,
  which reads the current publication's `authorsStringShort` before it
  opens the window;
- the export list: the item slot of `submissions-list-panel` in each
  app's `plugins/importexport/native/templates/index.tpl`
  (`item.publications.find(p => p.id == item.currentPublicationId).fullTitle`),
  which fails for the one item and leaves the whole list unrendered.

History: in 3.3, OJS's web import deleted everything it had imported
whenever an error was recorded on a submission (`removeImportedObjects()`
in the plugin's `import` case). The 3.4 rework (`pkp/pkp-lib#6490`,
OJS 69a06f1284) replaced that with the transaction, which undoes only
exceptions. The check in `process()` was added later
(`pkp/pkp-lib#5960`, [c27d476af7](https://github.com/pkp/pkp-lib/commit/c27d476af76d7faf2fb8c5b9947fce5a14d166f6))
as a recorded error. In 3.3 the same import already failed, with a
server error while indexing (`pkp/pkp-lib#9755`), before the deletion
could run.

Reach:

- The command-line import (`tools/importExport.php NativeImportExportPlugin
  import`) goes through the same filters and keeps the same submission.
  `PKPNativeImportExportCLIToolKit::getCLIImportResult()` also calls
  `getUIDisplayString()` (checked in the code).
- An OJS issues file whose articles name an unknown section imports its
  articles through the same filters (checked in the code).
- An empty `section_ref=""`: `native.xsd` declares it `type="string"
  use="required"`, which accepts an empty value, and `handleElement()`
  then returns nothing without recording any error, leaving the same
  submission (checked in the code; not walked).
- `pkp/pkp-lib#12729` (open) is a second way to the same state: a
  publication without `<id type="internal">` leaves the submission with
  no current publication, and `process()` records the same error
  (checked in the code; not walked).
- Stored data: each such import leaves one submission with no
  publication. OJS's PubMed export list has the same item slot
  (`plugins/importexport/pubmed/templates/index.tpl`; checked in the
  code; not walked). The Dashboard's
  "Delete Incomplete Submissions" does not offer the row, because the
  import marks it as complete (`submissionProgress` empty; checked in
  the code).
- OMP is not affected: a press's file carries its series, and the
  import creates a series the press lacks (spec U63
  [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#omp3)).

## Proposed fix

A proposal, tried on `main` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/import-unknown-section-broken-submission/fix.diff)).

Recommended: in `NativeXmlSubmissionFilter::process()`, throw
instead of recording the error when an imported submission has no current
publication. The deployment then rolls the whole file back and shows it
as a failed import, the way it already handles a filter that throws:

```diff
             if (!isset($publication)) {
-                $deployment->addError(Application::ASSOC_TYPE_SUBMISSION, $submission->getId(), __('plugins.importexport.common.error.currentPublicationNullOrMissing'));
+                // A submission is imported with its publication or not at all:
+                // stop the import, so the deployment rolls the whole file back.
+                throw new \Exception(__('plugins.importexport.common.error.currentPublicationNullOrMissing'));
             }
```

The rule belongs to the submission filter, which creates the submission
and already checks for this state. One change in pkp-lib covers both
apps, every way a publication can fail (an unknown or empty
`section_ref`, `pkp/pkp-lib#12729`), the web and command-line imports
and issue files.

Tried on OJS and OPS. With the fix, step 7 reads "The process failed.
Check below for errors/warnings." and "Errors occured:" lists "The
submission's current publication is missing", "Unknown section EDT" and
"The submission's child publication failed to be processed". No
submission is added, the Dashboard and the export list are as before,
and no script error appears. The control file still imports, with and
without the fix.

**Alternatives:**

- Throw in the OJS and OPS `handleElement()` on an unknown or empty
  section: two repositories, and it does not cover
  `pkp/pkp-lib#12729`.
- Bring back 3.3's rule in `PKPImportExportDeployment::import()`, rolling
  back whenever an error is recorded on a submission. That also fails
  imports that work today with a recorded error (a submission file of an
  unknown genre), which is a product decision.
- Leave out only the failing article and keep the rest of the file.
  The import already treats a file that fails part-way as failed as a
  whole (the deployment's one transaction), and nothing calls the
  deployment's `removeImportedObjects()` any more, so this would need a
  new partial-success path.
- Make `getUIDisplayString()`, the Dashboard and the export templates
  tolerate a missing publication. That hides the crashes but still keeps the
  broken submission.

**What goes with it:**

- Repair: installs that already ran such an import keep broken
  submissions. An upgrade step, or a documented clean-up, selects the
  submissions whose `current_publication_id` is null (which also takes
  `pkp/pkp-lib#12729`'s, whose publication rows exist) and deletes each
  through `Repo::submission()->delete()`. That goes through
  `DAO::deleteById()`, which deletes the submission's publications and
  its submission files through `Repo::submissionFile()->delete()`, and
  that removes each stored file no other submission file shares. A plain
  row delete would leave those behind. Not tried.
- Files on disk: the rollback undoes database rows only. A file whose
  `submission_file` children were stored before the throw
  (`NativeXmlSubmissionFileFilter` stores each through
  `app()->get('file')->add()`, which writes to the files directory)
  leaves those files on disk without their `files` rows. That is already
  true today for any filter that throws.
- Backport: 3.5 and 3.4 have the same `process()` (3.4 at line 194), so
  the change applies as written. 3.3 (OJS only) has no transaction, so
  it needs its own change.
- The failed import lists three lines. The team may want to keep only
  "Unknown section EDT".
- Guard: an e2e scenario in U63 (a Planned item) that imports a file
  naming an unknown section and expects "The process failed…" with
  "Unknown section …" and no new submission; or a pkp-lib unit test of
  `NativeXmlSubmissionFilter` with a publication filter that returns
  nothing.

Medium: the code change is one line, but the installs that already ran
such an import need a clean-up step for the submissions it left.

## Evidence

- Kept script, which takes the Steps on OJS and OPS through the screens
  on a fresh load of the default dataset and then imports the Control's
  unchanged file:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/import-unknown-section-broken-submission/walk.js),
  run with
  `PROBE_FEATURE=issues-ir1 PROBE_AGENT=u63a9 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/import-unknown-section-broken-submission/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front). It changes the
  exported file in place of the text editor and reads the submissions
  and publications tables after the import.
- The fix, tried 2026-09-30 on the main tips below with
  [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/import-unknown-section-broken-submission/trial.sh):
  `node bin/try-fix.js apply …/fix.diff ojs ops`, the dataset reloaded,
  the walk, `node bin/try-fix.js revert ojs ops`, then the control alone
  (`NEIGHBOUR_ONLY=1`) on a fresh load without the fix.
- Walked 2026-09-30 on PostgreSQL, each install loaded from pkp/datasets
  38ab955 (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  main OJS bade233f73 (lib/pkp 2e377d27fc), OPS c8af945bb7 (lib/pkp
  3dc90c81a6); stable-3_5_0 OJS 92b9a16b48, OPS cf4fce69bd (lib/pkp
  a9c76aed62). All four showed the Observed above. The fault does not depend on the database.
- 3.4, by code: pkp-lib `stable-3_4_0` at df13621c2d, OJS at 9571d8fde7,
  OPS at acd8ae704b. The apps' `handleElement()` and pkp-lib's
  `process()` are as on main, and `import()` has the same transaction, so
  the submission is kept. `PKPSubmission::getUIDisplayString()` there
  calls `getLocalizedTitle()`, which returns an empty string without a
  publication, so the tab reads the success text with the errors under
  it rather than failing. What 3.4's lists do with the row was not
  checked.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, pkp-lib at d446601ebe.
  The same section check skips the publication. `NativeXmlArticleFilter::process()`
  then indexes the submission, and `ArticleSearchIndex::submissionMetadataChanged()`
  reads the missing publication's authors, the fatal error quoted in
  `pkp/pkp-lib#9755`. OPS `stable-3_3_0` has no Native XML plugin.
- Introduced: `git blame` on the section check in OJS
  `NativeXmlPublicationFilter::handleElement()` stops at code moves
  (665ed1f925 PSR-12, and the refactors 88aaa6b49f and c5b014ab89). The check was created
  already in its current shape in 0b233cee23 (`pkp/ojs#2646`,
  "[OJS] Native Import/Export Plugin v3.2", defstat, no issue linked),
  which moved `section_ref` onto the publication, after the submission
  is inserted. OPS's copy came with `pkp/pkp-lib#6490` (OPS 93a9548da7).
  Each later change in the Cause kept or moved the fault, so no single
  commit introduced it.
- Upstream searched 2026-09-30 in pkp-lib, ojs, ops and ui-library by
  the symptom and by the Cause's classes: `pkp/pkp-lib#9755`,
  `pkp/pkp-lib#11353` and `pkp/pkp-lib#12729` as above; no fix in any
  branch's history.
- The fix on 3.5 was not tried.
