# An issue's or a press file's Publisher ID is never kept: "Save" closes, the box comes back empty

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OMP (code)
- **Introduced** issues: `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · 2021-07-14 (merged 2021-08-31) · Erik Hanson (ewhanson); files: `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 (merged 2020-11-13) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#ojs3), [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal manager types a Publisher ID on an issue's "Identifiers" tab,
or a press manager on a publication format file's "Edit a file" ›
"Identifiers", and presses "Save". The window closes as it does after
any successful save, but the ID is not stored: when the tab is opened
again the "Publisher ID" box is empty.

No message says the save did not take. The ID never reaches what would
read it: the Native XML export, and a URN or DOI pattern built from it. A press
file's web address keeps using the file's number, as it does when no ID
is set, so no link breaks.

It affects journals that tick "Enable for Issues" and presses that tick
"Enable for Files" under Settings › Workflow › "Metadata" › "Publisher
ID"; both are off by default.

## Impact

- **Lost**: every Publisher ID typed for an issue or a press file. An
  ID stored before the fault (an issue's on 3.3, a file's on 3.2) is not
  wiped by "Save", but the tab no longer shows it.
- **Who**: journal and press managers and editors who keep an external
  ID for issues or for book files.
- **Way round**: none, on screen or off: the Native XML import drops the
  ID as well.

Medium: the typed ID is lost silently every time with no way round, but
only in a setup that is off by default, and only the Native XML export
and URN or DOI custom patterns with "%x" would use it; no reader's page
or link depends on it. It would be high if journals or presses
commonly built issue or file DOIs from "%x".

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`), for the
  journal steps: "Vol. 2 No. 1 (2015)" is under "Future Issues", and
  every box under "Publisher ID" is unticked (the dataset's default).
- PKP's default test dataset, OMP `main` (or `stable-3_5_0`), for the
  press steps: submission 5, "Bomb Canada and Other Unkind Remarks in
  the American Media", has the publication format "PDF" holding the file
  "epilogue.pdf", and every box under "Publisher ID" is unticked (the
  dataset's default).

Journal (OJS):

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Issues" and press "Save".
3. Open Issues, "Future Issues". On "Vol. 2 No. 1 (2015)" press the
   row's arrow, then "Edit".
4. Open the "Identifiers" tab, type "u44c-issue-1" in "Publisher ID" and
   press "Save".
5. Open the issue's "Edit" again and the "Identifiers" tab.

Press (OMP):

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Files" and press "Save".
3. Open submission 5 and, under Publication, "Publication Formats".
4. Under "PDF", press the arrow of "epilogue.pdf", then "Edit". The
   window "Edit a file" opens.
5. Open the "Identifiers" tab, type "u44c-file-1" in "Publisher ID" and
   press "Save".
6. Open the file's "Edit" again and the "Identifiers" tab.

**Expected.** The window closes after "Save", and the reopened tab's
"Publisher ID" reads "u44c-issue-1" (the issue) or "u44c-file-1" (the
file).

**Observed.** The window closes with no message, and the reopened tab's
"Publisher ID" is empty, on both apps. The save request answers 200 with
`"status":true`, and the server log has no error.

Control: a value the tab refuses is still checked. "12345" in the same
box is refused with "Errors occurred processing this form" and "The
public identifier '12345' must not be a number.", so the form reads the
value and only the store drops it.

## Cause

Both tabs save through `PKPPublicIdentifiersForm::execute()` (pkp-lib,
`controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`). It sets the
value on the object with `setStoredPubId('publisher-id', …)`, which is
the data key `pub-id::publisher-id`, and saves the object through its
repository: OJS's `PublicIdentifiersForm::execute()` calls
`Repo::issue()->edit()` for an issue, and the base form calls
`Repo::submissionFile()->edit()` for a file.

Both `Repo::` classes write through `EntityDAO::_update()`, which first runs
`PKPSchemaService::sanitize()` and keeps only the properties the
entity's schema declares. OJS's `schemas/issue.json` and pkp-lib's
`schemas/submissionFile.json` do not declare `pub-id::publisher-id`, so
the value is dropped before the write. `EntityDAO::fromRow()` likewise
reads only declared settings. The other objects that take a Publisher
ID keep it: pkp-lib's `publication.json` (the publication's ID is set on
the Metadata form) and OJS's `galley.json` declare it, and OJS's
`IssueGalleyDAO` and OMP's `ChapterDAO` and `PublicationFormatDAO` list
it in `getAdditionalFieldNames()`.

Both entities lost the field when they moved to schema-based storage:

- Issues: until 3.3 OJS's `IssueDAO` listed `pub-id::publisher-id` in
  `getAdditionalFieldNames()`. The issue's move to an `EntityDAO`
  (88aaa6b49f, `pkp/pkp-lib#7129`, 3.4) kept the schema without it.
- Files: until 3.2 pkp-lib's `SubmissionFileDAODelegate` listed it.
  The submission files refactor (5f383f87c3, `pkp/pkp-lib#6057`, 3.3)
  made the file a schema object, and `submissionFile.json` never had it.

Reach:

- The tabs' duplicate check (`anyPubIdExists()`, through the issue and
  file DAOs' `pubIdExists()`) and the file lookup
  `PKP\submissionFile\DAO::getByPubId()` read the settings tables
  directly, so they were written for a stored value. Issues are looked up
  by URL path only (code).
- Native XML import of an issue (`NativeXmlIssueFilter`) or a file
  (`NativeXmlSubmissionFileFilter`) sets the publisher ID the same way,
  and it is dropped the same way; the export side
  (`IssueNativeXmlFilter`, `SubmissionFileNativeXmlFilter`) never finds
  one to write (code).
- A URN or DOI custom suffix pattern with "%x" ("Custom Identifier")
  takes the item's Publisher ID through OJS's and OMP's
  `PubIdPlugin::generateCustomPattern()`: the URN plugin, and the DOI
  repositories' `generateSuffixPattern()`, which OJS's `mintIssueDoi()`
  and OMP's `mintSubmissionFileDoi()` call with the issue and the file.
  So for an issue or a file "%x" can never be resolved (code).
- An OMP file's web address would use its Publisher ID in place of its
  number once one is stored (`SubmissionFile::getBestId()`,
  `CatalogBookHandler`, `DAO::getByBestId()`). Today it always uses the
  number, and nothing breaks; the Publisher ID address was seen only with
  the fix in (below).
- A value stored before the regression (an issue's on 3.3, a file's on
  3.2) stays in the settings table. The tab does not show it, and "Save"
  does not wipe it, because `EntityUpdate::updateSettings()` touches
  declared properties only; the duplicate check still counts it (code;
  no such install checked).

## Proposed fix

Declare `pub-id::publisher-id` in the two schemas, in the same shape as
`publication.json` (a nullable string), so the repositories store and
read it like every other object the tab serves
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/fix-ojs.diff)
for an OJS checkout, both files;
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/fix-omp.diff),
the pkp-lib file alone):

```diff
--- a/schemas/issue.json            (OJS; lib/pkp/schemas/submissionFile.json the same, before "publisher")
+++ b/schemas/issue.json
+		"pub-id::publisher-id": {
+			"type": "string",
+			"description": "A unique ID provided by the publisher. …",
+			"apiSummary": true,
+			"validation": [
+				"nullable"
+			]
+		},
```

For a schema-based entity the schema decides what is stored, as
`publication.json` and `galley.json` show, so the fix belongs there. A
fix in the form or in the `Repo::` class would bypass the schema for one
property and leave the import path broken.

Tried on `main`: with the fix in, the reopened tab reads "u44c-issue-1"
(OJS) and "u44c-file-1" (OMP). With the fix in, the same issue saves again unchanged, the same value on
"Vol. 1 No. 2 (2014)" is refused with "The public identifier
'u44c-issue-1' already exists for another object of the same type. …",
the same value on submission 14's "chapter1.pdf" is refused the same way
("…within your press."), and submission 5's book page links the file as
`/catalog/view/5/2/u44c-file-1`, which opens "PDF view of the file
epilogue.pdf". With the fix out, the duplicates save and nothing is
kept.

**Alternatives**

- Write the setting in `PKPPublicIdentifiersForm::execute()` with a
  direct query: it leaves the repositories, the REST API and the Native
  XML import unable to read or write the value.
- Hide "Enable for Issues" and "Enable for Files": a product decision
  that drops a feature 3.3 and 3.2 had.

**What goes with it**

- The issues and submission files REST API answers gain the property
  (`apiSummary`); no existing field changes.
- The submission files edit endpoint would accept the property without
  the tab's checks (digits only, "/", "12-34", duplicates). The
  publication's and the galley's Publisher ID take any value through the
  API today, so the proposal leaves the API to its own rules. Whether
  those checks belong in `Repository::validate()` for every object is
  spec U44's A3 question.
- Emptying the box will not remove a stored Publisher ID, because
  `PKPPublicIdentifiersForm::execute()` stores only a non-empty value;
  that is spec U44 A2, reported on its own, and with this fix it reaches
  issues and files too.
- Data: none to repair. Values stored before the regression become
  readable again.
- An OMP file with a Publisher ID gets a new web address
  (`…/catalog/view/<id>/<format>/<publisher ID>`), as before 3.3. Its
  old address with the file's number still resolves (`getByBestId()`
  falls back to the number).
- Backport: both hunks apply as written to 3.5 and 3.4; 3.3 needs only
  the pkp-lib one, which applies there too.
- Guard: an e2e scenario that saves and reopens an issue's and a press
  file's "Identifiers" tab, in pkp-e2e's spec U44.

Medium: one property in each of two schemas, in pkp-lib and OJS, each
adding a REST API property, plus the test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/issue-and-press-file-publisher-id-never-kept/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). The same script with `neighbour` as
  its argument takes the second walk on a fresh load. The fix was tried
  with `node bin/try-fix.js apply <diff> <app>` (`fix-ojs.diff` on OJS,
  `fix-omp.diff` on OMP).
- Walked on `main` and `stable-3_5_0`, OJS and OMP, with the same
  observation on both; a database read after each save found no
  `pub-id::publisher-id` row in `issue_settings` or
  `submission_file_settings` (with the fix in, one row each).
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794
  (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246
  (pkp-lib cf3f984335); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441
  (pkp-lib 32b0f4b4af); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883
  (pkp-lib f6ab331645).
- 3.5 (walked), 3.4 and 3.3 (code): read OJS `schemas/issue.json`,
  `controllers/tab/pubIds/form/PublicIdentifiersForm.php` (3.3:
  `.inc.php`) `execute()` and, on 3.3, `classes/issue/IssueDAO.inc.php`
  `getAdditionalFieldNames()`; pkp-lib `schemas/submissionFile.json`,
  `PKPPublicIdentifiersForm` `execute()` and `EntityDAO` / 3.3
  `SchemaDAO` `updateObject()`. 3.4 has OJS's `EntityDAO`-based issue and
  both schemas without the field; 3.3 keeps the issue's field in
  `IssueDAO` and saves files through `SchemaDAO`, which sanitizes the
  same way.
- Introduced: OJS `schemas/issue.json` never declared the field (added
  in 43b3907299, 2018, when the issue was not yet schema-stored);
  88aaa6b49f deleted `IssueDAO.inc.php`, whose
  `getAdditionalFieldNames()` listed it, and moved issues to
  `EntityDAO`. In pkp-lib, 5f383f87c3's parent has
  `SubmissionFileDAODelegate.inc.php` listing it; 5f383f87c3 replaced it
  with the schema-based DAO. PRs from GitHub's `commits/<sha>/pulls`.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library,
  issues and PRs, for "issue publisher id not saved", "publisher id
  issue identifiers", "submission file publisher id", "publisher id
  lost", `PKPPublicIdentifiersForm`, `"pub-id::publisher-id"` and
  `publisherId submissionFile`. `pkp/pkp-lib#8946` (cleaning pub-ID code)
  and `pkp/pkp-lib#10821` (the identifiers pages of the new workflow)
  are other work.
- The book page check with the fix in: the PDF viewer's own download
  (`/catalog/download/5/2/u44c-file-1?inline=1`) answered 500 with
  "Typed property APP\pages\catalog\CatalogBookHandler::$publication
  must not be accessed before initialization". With the fix out the
  file's own address (`…/download/5/2/41?inline=1`) answered the same
  500: every book file download on OMP `main` fails, reported as U69 A9
  ([U69-A9-book-file-open-download-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md)),
  not this fix.
- Not driven: Native XML import and export, URN and DOI "%x" patterns,
  the REST API, and an install upgraded from 3.3 or 3.2 (code only).
  MySQL not checked (the fault is in the schema, not the database).
