# An issue's Publisher ID, typed on its "Identifiers" tab, is silently dropped on "Save"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · 2021-07-14 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U44 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#ojs3)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who types a Publisher ID on an issue's "Identifiers" tab and
presses "Save" sees the window close as if the value were saved. When
the tab is reopened the box is empty, and the value appears nowhere
else. The tab's own format check still works: a value made only of
digits, or one containing "/", is refused with its message.

No message says the value was dropped, and no other screen stores an
issue's Publisher ID. Some journals build issue DOIs from a custom
suffix pattern containing "%x" (Custom Identifier). There the issue is
given a DOI with a literal "%x" where the Publisher ID should be. Only
journals that have ticked "Enable for Issues" under Publisher ID, which
is off by default, meet any of this.

## Impact

- **Lost.** Every Publisher ID typed for an issue is lost silently.
  Where the issue DOI pattern contains "%x", "Assign DOIs" gives the
  issue a DOI such as `10.1234/iss1.%x`, ready to be deposited.
  Journals upgraded from 3.3 keep the issue Publisher IDs they stored
  before, and a save does not erase them. They are no longer shown or
  included in the native XML export, but they still block another
  issue from using the same value.
- **Who.** A journal manager or editor on an issue's "Identifiers" tab,
  on every save, in a journal with "Enable for Issues" ticked. The DOI
  case also needs "Issues" among the items with DOIs and a custom issue
  pattern that contains "%x". The DOI settings mark custom patterns
  "not recommended".
- **Way round.** None for the Publisher ID. A wrong issue DOI can be
  typed over with "Edit" on the DOIs page before it is deposited.

Medium: an issue's Publisher ID can never be stored and nobody is told,
but only journals that use Publisher IDs for issues lose anything. The
one effect outside the journal, an issue DOI with a literal "%x", also
needs a custom "%x" pattern for issue DOIs and can be corrected by hand
before deposit. It would be high if such patterns were common, since
the wrong DOI is assigned without a warning.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its issue
  "Vol. 2 No. 1 (2015)" is unpublished; Publisher IDs are off for every
  kind of item, so no issue has an "Identifiers" tab yet.

The Publisher ID:

1. Sign in as `dbarnes` (the Journal editor, who may change Settings).
2. Open Settings › Workflow › "Submission" › "Metadata".
3. Under "Publisher ID", tick "Enable for Issues" and press "Save".
4. Open Issues › "Future Issues", open the row "Vol. 2 No. 1 (2015)"
   with its arrow, and press "Edit".
5. Open the "Identifiers" tab.
6. Type `u44r8-issue` in "Publisher ID" and press "Save".
7. Open the row's "Edit" again and the "Identifiers" tab.

The issue DOI, on a freshly loaded dataset, after steps 1-3:

8. Open Settings › Distribution › "DOIs" › "Setup". Under "Items with
   DOIs" tick "Issues", type `10.1234` in "DOI Prefix", and choose
   "Custom pattern" under "DOI Format". Type `art%a` in "Submissions"
   (required while "Articles" is ticked) and `iss%i.%x` in "Issues",
   then press "Save".
9. Take steps 4-6.
10. Open "DOIs" › "Issues", tick "Vol. 2 No. 1 (2015)", then choose
    "Bulk Actions" › "Assign DOIs" and confirm with "Assign DOIs".
11. Open the row's details.

**Expected:** at step 6 the window closes. At step 7 "Publisher ID"
reads `u44r8-issue`. At step 11 the issue's DOI is
`10.1234/iss1.u44r8-issue`.

**Observed:** at step 6 the window closes with no message, and the save
answers as a success:

```
POST /index.php/publicknowledge/$$$call$$$/grid/issues/future-issue-grid/update-identifiers?issueId=2   200   {"status":true, …}
```

At step 7 "Publisher ID" is empty. At step 10 the page reports "Items
successfully assigned new DOIs". At step 11 the issue's DOI reads
`10.1234/iss1.%x`, with the status "Unregistered".

The tab still checks the value: `12345` at step 6 keeps the window
open with "Errors occurred processing this form" and "The public
identifier '12345' must not be a number."

## Cause

`PKPPublicIdentifiersForm::execute()` (lib/pkp
`controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`, line 227)
puts the value on the issue with `setStoredPubId('publisher-id', …)`,
which sets the data key `pub-id::publisher-id`. OJS's
`PublicIdentifiersForm::execute()`
(`controllers/tab/pubIds/form/PublicIdentifiersForm.php`, line 56) then
saves the issue with `Repo::issue()->edit($pubObject, [])`.

The issue is a schema-backed entity, so only properties declared in the
issue schema are stored or loaded:

- `EntityDAO::_update()` sanitizes the issue against its schema.
- The `EntityUpdate` trait's `updateSettings()`
  (`lib/pkp/classes/core/traits/EntityUpdate.php`) writes only schema
  properties.
- `EntityDAO::fromRow()` loads only schema properties.

OJS `schemas/issue.json` declares no `pub-id::publisher-id`, so the
value is discarded before any write. The issue's URN is stored because
`PKPPubIdPlugin::register()` adds a plugin's fields to the schema
through the `Schema::get::issue` hook. The Publisher ID belongs to no
plugin, so nothing adds it.

Until 88aaa6b49f, `IssueDAO::getAdditionalFieldNames()` listed
`pub-id::publisher-id` (with the note "FIXME: Move this to a PID
plug-in"), so the old settings writer stored it. 88aaa6b49f ("Issue
EntityDAO refactor") replaced `IssueDAO` with the schema-driven
`APP\issue\DAO` and moved the issue's other fields into `issue.json`,
but not this one.

Reach:

- Issue DOIs with a custom pattern (seen on screen):
  `APP\doi\Repository::mintIssueDoi()` →
  `generateSuffixPattern()` → `PubIdPlugin::generateCustomPattern()`
  replaces `%x` only when the issue has a stored Publisher ID. The DOI
  is then stored as it stands, with no check for an unresolved pattern.
  A published issue's page shows its DOI (`issue_toc.tpl`, code).
  Deposit was not driven. The same code is on `stable-3_5_0` and
  `stable-3_4_0` (code).
- The URN plugin's custom pattern for issues: the same `%x` stays
  unresolved, and the plugin refuses such a URN as containing an
  unresolved pattern (code).
- The tab's checks still run on the typed value (seen on screen). The
  duplicate check, `APP\issue\DAO::pubIdExists()` reached through
  `JournalDAO::anyPubIdExists()`, reads `issue_settings`, where nothing
  new is written, so it can only match values stored before 3.4
  (code).
- Journals upgraded from 3.3 (code):
  - `updateSettings()` deletes only settings the schema declares, so
    their `pub-id::publisher-id` rows survive every save.
  - `fromRow()` never loads those rows. So the tab shows them empty,
    `%x` does not use them, and `IssueNativeXmlFilter` (whose export
    code for the value exists) exports none because nothing is loaded.
  - The duplicate check still matches them.
- Native XML import: `NativeXmlIssueFilter::parseIdentifier()` sets an
  issue's `<id type="public" advice="update">`, and the later
  `Repo::issue()->edit()` drops it (code).
- Not affected (code):
  - issue galleys: `IssueGalleyDAO` is not schema-backed and lists the
    field in `getAdditionalFieldNames()`;
  - article galleys and publications: their schemas declare it.
- Sibling, reported separately: a press file's Publisher ID (U44 OMP5)
  is lost the same way. lib/pkp `schemas/submissionFile.json` and OMP's
  `schemas/submissionFile.json` declare no `pub-id::publisher-id`.

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-publisher-id-not-kept/fix.diff).
With the fix in:

- step 7 reads `u44r8-issue`;
- `12345` is still refused;
- saving the "Issue Data" tab leaves the Publisher ID in place;
- the same value typed on "Vol. 1 No. 2 (2014)" is refused with "The
  public identifier 'u44r8-issue' already exists for another object of
  the same type. Please choose unique identifiers for the objects of
  the same type within your journal." Without the fix, that save was
  dropped too.

The issue DOI steps were not walked with the fix. In the code,
`generateCustomPattern()` then finds the stored value and replaces
`%x` with it.

Recommended: declare the property in OJS `schemas/issue.json`. The
entry copies lib/pkp's `publication.json` entry, `nullable` included
(`galley.json`'s entry has no validation):

```diff
 		"originalStyleFileName": {
 			"type": "string"
 		},
+		"pub-id::publisher-id": {
+			"type": "string",
+			"description": "A unique ID provided by the publisher. This is often used to record the ID of this issue in an external database, in cases where the publisher maintains separate records.",
+			"apiSummary": true,
+			"validation": [
+				"nullable"
+			]
+		},
```

One entry covers every writer and reader of the issue's data: the tab,
the native XML import and export, the `%x` patterns and the REST API.

**Alternatives:**

- Write the value with `APP\issue\DAO::changePubId()` from the form, as
  `PKPPubIdPlugin::setStoredPubId()` does for a plugin's identifiers:
  `fromRow()` would still not load it, and the import would still drop
  it.
- A core `Schema::get::*` hook that adds `pub-id::publisher-id` to every
  object that offers one (the old FIXME's idea): it would also cover
  the press file (OMP5), but it is a new shared mechanism in pkp-lib for
  what one schema entry per object already does.

**What goes with it:**

- `updateSettings()` will delete the row whenever a saved issue lacks
  the property. Every writer saves through `Repo::issue()->edit()`,
  which merges into the loaded issue, so saves that do not touch the
  value keep it (the "Issue Data" check above).
- `GET /api/v1/issues` and `/issues/{issueId}` gain a
  `pub-id::publisher-id` key, as galleys already have. Nothing is
  removed.
- Stored data: no repair. Values stored before 3.4 are shown and
  exported again.
- Not covered: once saved, an issue's Publisher ID cannot be removed by
  emptying the box. The same is true on every "Identifiers" tab, and
  that is a separate fault
  ([A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a2)).
- Backport: the same entry in `schemas/issue.json` on `stable-3_5_0` and
  `stable-3_4_0`, which have the fault.
- Guard: an end-to-end test that saves an issue's Publisher ID, reopens
  the tab, and gives a second issue the same value.

Small: one schema entry, no data repair.

## Evidence

- Kept scripts that take the Steps in the browser on an install loaded
  from PKP's default test dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-publisher-id-not-kept/walk.js)
    takes steps 1-7 and the `12345` check. It is run with
    `PROBE_FEATURE=issues-r8 PROBE_AGENT=r8 node bin/probe.js ojs shared/playwright/checks/issues/issue-publisher-id-not-kept/walk.js`,
    on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
    header says. After each save it reads `issue_settings` for the
    issue's `pub-id::publisher-id`: there is no row without the fix.
  - `PHASE=neighbour` in front of the same command runs the checks
    beside the Steps that the fix must pass or leave alone: the "Issue
    Data" save, and the same value on the second issue.
  - [doi.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/issue-publisher-id-not-kept/doi.js)
    takes steps 1-3 and 8-11. It is run with
    `PROBE_FEATURE=issues-r8b PROBE_AGENT=r8 node bin/probe.js ojs shared/playwright/checks/issues/issue-publisher-id-not-kept/doi.js`,
    and reads the stored DOI from `dois` (`10.1234/iss1.%x`).
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/issue-publisher-id-not-kept/fix.diff ojs`,
  then walk.js and `PHASE=neighbour` walk.js, each on a freshly loaded
  dataset, then `node bin/try-fix.js revert ojs`. doi.js was walked
  without the fix only.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), walk.js and doi.js;
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62), walk.js, with
    the same Observed. Its `schemas/issue.json` has no
    `pub-id::publisher-id`.
- 3.4, code: OJS `stable-3_4_0` at 9571d8fde7 (contains 88aaa6b49f,
  first in `3_4_0rc1`):
  - `schemas/issue.json` without the property;
  - `controllers/tab/pubIds/form/PublicIdentifiersForm.php` saving
    through `Repo::issue()->edit()`;
  - `classes/doi/Repository.php` calling `generateCustomPattern()`;
  - lib/pkp `stable-3_4_0` at df13621c2d, whose `EntityDAO::_update()`
    and `fromRow()` keep only schema properties.
- 3.3, code: OJS `stable-3_3_0` at 9fdb9bcf9a:
  - `classes/issue/IssueDAO.inc.php`: `getAdditionalFieldNames()` lists
    `pub-id::publisher-id`, which `updateLocaleFields()` writes;
  - `controllers/tab/pubIds/form/PublicIdentifiersForm.inc.php`, which
    saves through `IssueDAO::updateObject()`.
- Introduced: `git log -S "\$additionalFields[] = 'pub-id::publisher-id';" -- classes/issue/`
  in OJS finds 88aaa6b49f, which removed the line together with
  `IssueDAO.inc.php`. Its `schemas/issue.json` diff adds the issue's
  other fields but not this one.
- Upstream search 2026-09-30 in pkp/pkp-lib, pkp/ojs and pkp/ui-library
  (issue publisher id not saved, issue identifiers publisher id,
  `"publisher-id"`, `PublicIdentifiersForm`, issue schema pub-id): no
  report of this fault. `pkp/ojs#5608` (open, for `pkp/pkp-lib#7527`)
  edits `schemas/issue.json` for other fields and leaves this one out.
- Not driven: OMP and OPS, which have no issues; a DOI deposit; the
  native XML import and export; an upgraded journal's stored values.
