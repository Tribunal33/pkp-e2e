# A Publisher ID typed for a publication format's file is dropped on "Save", with no message

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/pkp-lib#6292` and `pkp/omp#871` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629), [edd3952535](https://github.com/pkp/omp/commit/edd39525352900f9d1899830f6f8169de956d4a8) · 2020-10-19, 2020-10-27 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U44 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#omp5), with [After a refused Publisher ID, a format file's "Identifiers" tab loses its Publisher ID box](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OMP5-press-file-publisher-id-box-gone-after-refusal.md)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A press editor who types a Publisher ID on the "Identifiers" tab of a
publication format's file (a format file) and presses "Save" sees the
window close as after any save. The value is not kept: when the tab is
opened again, "Publisher ID" is empty, whatever was typed. It last
worked in OMP 3.2; every release since 3.3 drops it.

No route stores the value: not the tab, not the REST API, not the
native XML import. So a press cannot record a file's ID from its
external database, and the file's download link on the book page keeps
the file's number instead of that ID. It happens only in a press that
has ticked "Enable for Files" under Publisher ID, which is off by
default. The fix is one entry in OMP's submission file schema.

## Impact

- **Lost.** Every Publisher ID typed for a format file, with nothing to
  say it was dropped.
- **Who.** Press managers, editors and the production staff who open a
  format file's "Edit a file" › "Identifiers", in a press with "Enable
  for Files" ticked.
- **Way round.** None, on screen or off it. Monographs, chapters and
  publication formats keep their Publisher IDs; only files lose theirs.

Medium: a secondary field is lost silently with no way round, but only
in presses that turned on "Enable for Files", which no press has until
it chooses to. It would be high if that setting were on by default.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OMP `main`, freshly loaded. Its
  submission 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", has a publication format "PDF" holding six files, among
  them "chapter1.pdf". Publisher IDs are off for every kind of item.

Setup:
1. Sign in as `rvaca` (Press manager).
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "Publisher ID", tick "Enable for Files" and press "Save".
4. Sign out.

Saving a Publisher ID:
5. Sign in as `dbarnes` (Press editor).
6. Open submission 14, then "Publication Formats" in its Publication
   area.
7. Under "PDF", open the row "chapter1.pdf" with its arrow and press
   "Edit". The window "Edit a file" opens with the tabs "Edit Metadata"
   and "Identifiers".
8. Open "Identifiers": it shows an empty "Publisher ID" box.
9. Type `u44r9-file1` and press "Save". The window closes.
10. Open the row "chapter1.pdf" with its arrow again, press "Edit", then
    "Identifiers".

**Expected:** at step 10 "Publisher ID" holds `u44r9-file1`.

**Observed:** at step 10 "Publisher ID" is empty. The save at step 9
answered 200 with `{"status":true}`, and the database holds no
`pub-id::publisher-id` row for the file. No error was logged and no
request failed.

The publication format "PDF"'s own "Edit" › "Identifiers", with "Enable
for Publication Formats" ticked, keeps `u44r9-fmt1` and shows it when
reopened.

## Cause

The tab saves through OMP's `ManageFileApiHandler::updateIdentifiers()`
(`controllers/api/file/ManageFileApiHandler.php`, line 93), which runs
lib/pkp's `PKPPublicIdentifiersForm::execute()`
(`controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`, lines
226–241). `execute()` sets the data key `pub-id::publisher-id` with
`setStoredPubId('publisher-id', …)` and saves the file with
`Repo::submissionFile()->edit($pubObject, [])`.

The submission file DAO is schema-backed: `EntityDAO::_update()` passes
the object's data through `SchemaService::sanitize()` for the
`submissionFile` schema and writes only the properties the schema
declares. Neither lib/pkp `schemas/submissionFile.json` nor OMP's own
`schemas/submissionFile.json` (which adds OMP's file properties such as
`chapterId`, `directSalesPrice` and `salesType`) declares
`pub-id::publisher-id`, so the key is dropped before the write, and the
form reports success.

Until 3.2 the old `SubmissionFileDAO::getAdditionalFieldNames()` listed
`pub-id::publisher-id` beside `chapterId`. The submission files refactor
(`pkp/pkp-lib#6057`: pkp-lib 5f383f87c3 and OMP edd3952535) replaced that
list with the new schemas and carried `chapterId` and OMP's sales fields
over, but not the publisher ID. Other identifiers on files were not
affected: a file's DOI is stored as `doiId`, which OMP's schema declares
(from 3.4 on; in 3.3 the DOI plugin added its property through the
`Schema::get::submissionFile` hook), and the URN plugin adds its
property through that hook.

Reach:

- The format file's "Identifiers" tab drops every value for every role
  that opens it (seen on screen as `dbarnes`; earlier also as a Press
  Manager and a Layout Editor).
- The other routes drop it the same way (read in the code): the REST
  API's submission file edit (`PKPSubmissionFileController::edit()`
  passes unknown keys on, and the DAO's `sanitize()` drops them), and the
  native XML import (`NativeXmlSubmissionFileFilter::parseIdentifier()`
  sets the value, and `Repo::submissionFile()->add()` drops it). The
  native XML export never writes one, since a loaded file never carries
  it.
- Outgoing links never use a value: `SubmissionFile::getBestId()` builds
  the file's book-page download link (`downloadLink.tpl`,
  `CatalogBookHandler`) and its sitemap entry from the file's number
  (read in the code).
- Two readers go to `submission_file_settings` directly, around the
  schema (read in the code): `DAO::getByPubId()`, which `getByBestId()`
  uses to resolve an incoming book-page address, and `DAO::pubIdExists()`,
  the tab's duplicate check. On an install with no stored values they
  find nothing, so a second file accepted the same value on screen. On a
  press upgraded from 3.2 that still holds old rows (below), both already
  work on those rows today: an address with an old ID still opens the
  file, and the tab refuses a value an old row holds, though the tab
  cannot show that row.
- Values stored before 3.3 survive any later save from this tab: the
  DAO rewrites and deletes only the settings its schema declares (read
  in the code, `EntityUpdate::updateSettings()`).
- Monographs, chapters and publication formats keep their Publisher IDs
  (lib/pkp `publication.json`, `ChapterDAO`, `PublicationFormatDAO`; read
  in the code, formats seen on screen). An OJS issue's Publisher ID has
  the same kind of gap in OJS `schemas/issue.json`, reported as
  [An issue's Publisher ID, typed on its "Identifiers" tab, is silently dropped on "Save"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-OJS3-issue-publisher-id-not-kept.md).
  OJS and OPS offer no Publisher ID for files.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-publisher-id-not-kept/fix.diff):
step 10 then shows `u44r9-file1`. A second file given the same value is
refused with "The public identifier 'u44r9-file1' already exists for
another object of the same type. Please choose unique identifiers for the
objects of the same type within your press.", the format's own
Publisher ID saves as before, and with "Enable for Files" unticked the
file's window still has no "Identifiers" tab.

Recommended: declare the property in OMP's `schemas/submissionFile.json`,
where OMP already declares the file properties only a press has, as OJS
declares a galley's in its `schemas/galley.json`, and as a file's DOI is
declared (`doiId`):

```diff
+		"pub-id::publisher-id": {
+			"type": "string",
+			"description": "A unique ID provided by the publisher. When present, it is used in place of the `id` in the file's URL on the book page.",
+			"apiSummary": true,
+			"validation": [
+				"nullable"
+			]
+		},
```

**Alternatives:**

- The same property in lib/pkp `schemas/submissionFile.json`, where the
  3.2 field list lived: it works too, but OJS and OPS would gain an
  unused property in their REST API.
- Registering the property from OMP code through the
  `Schema::get::submissionFile` hook, as the URN plugin does: more code
  for what a schema entry says.

**What goes with it:**

- The REST API's submission file objects gain `pub-id::publisher-id`
  (OMP only), and its file edit endpoint and the native XML import then
  store the value, without the tab's checks (not only digits, no "/",
  unique), as for monographs' Publisher IDs.
- Values stored before 3.3: the 3.3 upgrade kept `submission_file_settings`
  rows as they were, so a press upgraded from 3.2 may still hold
  `pub-id::publisher-id` rows for files. With the fix they show on the
  tab, and `getBestId()` puts them in the file's outgoing book-page links
  and sitemap entry in place of its number, as in 3.2. How incoming
  addresses resolve does not change: `getByBestId()` already finds those
  IDs, and a file's number keeps working. No repair is needed; the
  release notes could mention it.
- A stored ID still cannot be removed from the tab, since `execute()`
  writes only a non-empty value; that is a separate fault,
  [A publisher ID saved on a tab can never be removed](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a2),
  which this fix does not change.
- Backport: the same entry applies to OMP `stable-3_5_0` and
  `stable-3_4_0`, and to `stable-3_3_0`'s `schemas/submissionFile.json`.
- Guard: an e2e scenario that saves a format file's Publisher ID and
  reads it back on the reopened tab.

Small: one schema entry in OMP and an e2e scenario.

## Evidence

- Kept script that takes the Steps in the browser on an install loaded
  from PKP's default test dataset, reading the stored settings after each
  save:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-file-publisher-id-not-kept/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/press-file-publisher-id-not-kept/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
  `PHASE=neighbour` in front runs the side checks: the format's own
  Publisher ID and its refusal, the same value on a second file, and the
  file's window with "Enable for Files" unticked.
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/press-file-publisher-id-not-kept/fix.diff omp`,
  then walk.js and `PHASE=neighbour` walk.js, each on a freshly loaded
  dataset, then `node bin/try-fix.js revert omp`. With the fix out, the
  second file accepted the same value.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `omp/main/pgsql` and `omp/stable-3_5_0/pgsql`, no upgrade
  needed:
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6);
  - stable-3_5_0: OMP 3081c9b00 (lib/pkp a9c76aed62), the same
    Observed.
  - The fault does not depend on the database: the key is dropped
    before any query. MySQL not checked.
- `main`, code: lib/pkp `classes/core/EntityDAO.php` (`_insert()`,
  `_update()`, `fromRow()`), `classes/core/traits/EntityUpdate.php`,
  `classes/submissionFile/DAO.php` (`getByPubId()`, `getByBestId()`,
  `pubIdExists()`), `api/v1/submissions/PKPSubmissionFileController.php`,
  `plugins/importexport/native/filter/NativeXmlSubmissionFileFilter.php`
  and `SubmissionFileNativeXmlFilter.php`; OMP `classes/press/PressDAO.php`
  (`anyPubIdExists()`).
- 3.5, code: OMP 3081c9b00, `schemas/submissionFile.json` and lib/pkp
  `schemas/submissionFile.json` (no `pub-id::publisher-id`),
  `PKPPublicIdentifiersForm::execute()` as on `main`.
- 3.4, code: OMP `stable-3_4_0` at 0aec65441 (lib/pkp df13621c2d): the
  same two schema files without the property, the same `execute()`.
- 3.3, code: OMP `stable-3_3_0` at 8e72fc883 (lib/pkp d446601ebe): the
  same schema files; `PKPPublicIdentifiersForm.inc.php` saves through
  `SubmissionFileDAO::updateObject()`, which `SchemaDAO` sanitizes the
  same way. 5f383f87c3 is in every 3.3 release (`3_3_0-0` on).
- Introduced: `git log -S"'pub-id::publisher-id'"` on the old
  `SubmissionFileDAO` files finds the line removed in 5f383f87c3
  (`pkp/pkp-lib#6292`); OMP's schema was created in edd3952535
  (`pkp/omp#871`), both for `pkp/pkp-lib#6057` and merged 2020-11-13.
  The line had been added in 8ab4813281 (2015, `pkp/pkp-lib#1457`).
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/omp and pkp/ui-library
  (publisher id file, publisher id not saved, publisher-id submission
  file, publisher identifier, identifiers tab file, `updateIdentifiers`,
  `ManageFileApiHandler`, `enablePublisherId`). `pkp/pkp-lib#12758` (for
  `pkp/pkp-lib#12672`) changed which file stages `getByBestId()` serves,
  not the storing.
- Not driven: OJS and OPS; the REST API and the native XML import (read
  in the code).
- Unverified: a file's download through its Publisher ID on the book
  page with the fix in, since readers currently cannot open book files
  on OMP `main`
  ([Readers cannot open or download a book's files on a press](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-omp-book-files-fail-to-open.md));
  and the pre-3.3 rows on an install upgraded from 3.2 (read in the 3.3
  upgrade migration only).
