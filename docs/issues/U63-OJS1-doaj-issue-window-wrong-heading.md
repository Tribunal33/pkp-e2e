# DOAJ export list's issue link opens the issue's window headed "DOI Plugin Settings"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; the Crossref and DataCite export lists too)
- **Introduced** no PR; commit for `pkp/pkp-lib#383` · [800f075fd7](https://github.com/pkp/ojs/commit/800f075fd722d51f86253f3a0df52873965cecde) · 2016-06-28 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** U63 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal manager or editor who presses an issue's name in the DOAJ
Export Plugin's "Articles" list gets that issue's window, with its
"Table of Contents", "Issue Data" and "Issue Galleys" tabs, but headed
"DOI Plugin Settings" instead of the issue's name. The heading was
borrowed from the DOI export tools' settings link and never fitted this
window.

Nothing is lost; only the heading misleads. The "Publications" list,
shown instead of "Articles" while "DOI Versioning" is on, has no issue
links and is not affected.

## Impact

- **Lost**: nothing; the heading calls the window a settings page and
  never names the issue.
- **Who**: journal managers and editors on Tools › "DOAJ Export Plugin",
  "Articles" tab, each time they open an issue from the list.
- **Way round**: not needed.

Low: only a heading is wrong; the window and the task are unaffected.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal has "DOAJ Plugin"
  on and "DOI Versioning" off, and "The Signalling Theory Dividends"
  (submission 1) is published in "Vol. 1 No. 2 (2014)". Nothing else is
  needed.

Steps:

1. Sign in as `dbarnes`.
2. Open Tools › "DOAJ Export Plugin"
   (`/index.php/publicknowledge/en/management/importexport/plugin/DOAJExportPlugin`).
3. Open the "Articles" tab. Its rows read "17 Karbasizaed; Antimicrobial,
   heavy metal resistance …" and "1 Mwandenga et al.; The Signalling
   Theory Dividends", both in "Vol. 1 No. 2 (2014)", "Not Deposited".
4. In the row of "The Signalling Theory Dividends", press
   "Vol. 1 No. 2 (2014)" in the "Issue" column.

**Expected**: the issue's window opens headed with the issue, as the
Issues page heads it: "Issue Management: Vol. 1 No. 2 (2014)".

**Observed**: the window opens with the tabs "Table of Contents", "Issue
Data" and "Issue Galleys", headed:

```
DOI Plugin Settings
```

Control: Issues › "Back Issues", pressing "Vol. 1 No. 2 (2014)" opens the
same window with the same tabs, headed "Issue Management: Vol. 1 No. 2
(2014)".

## Cause

`ExportPublishedSubmissionsListGridCellProvider::getCellActions()`
(OJS `controllers/grid/submissions/ExportPublishedSubmissionsListGridCellProvider.php`,
`case 'issue'`, line 98) builds the issue link as an `AjaxModal` on
`grid.issues.BackIssueGridHandler` `editIssue`, the Issues page's own
window, but titles it
`__('plugins.importexport.common.settings.DOIPluginSettings')`, "DOI
Plugin Settings". The Issues page titles the same window
`editor.issues.editIssue`, "Issue Management: {$issueIdentification}"
(`IssueGridCellProvider::getCellActions()` and
`IssueGridRow::initialize()`).

The title was written in 2016 for the Crossref export's lists, whose
cell providers (`PubIdExportSubmissionsListGridCellProvider`,
`PubIdExportIssuesListGridCellProvider`,
`PubIdExportRepresentationsListGridCellProvider`) reused the DOI
plugins' settings-link string for the issue window. When the DOAJ export
got its own list, the code moved into
`ExportPublishedSubmissionsListGridCellProvider` with the title
unchanged.

Reach:

- The DOAJ "Articles" list on `main` and 3.5: walked.
- The "Publications" list shown while "DOI Versioning" is on: its grid
  (`ExportPublishedPublicationsListGridHandler`) has the columns
  submission ID, version, title and status, and no issue column, so no
  issue link (code).
- `PubIdExportSubmissionsListGridCellProvider` inherits the method.
  `PubIdExportIssuesListGridCellProvider` and
  `PubIdExportRepresentationsListGridCellProvider` set the same title
  themselves. On `main`, 3.5 and 3.4 no template opens any of these three
  grids, so only a third-party export plugin would show them (code).
- On 3.3 the Crossref and DataCite export plugins open those grids
  (their `templates/index.tpl`), so their articles, issues and galleys
  lists show the same heading (code).
- A separate fault, not fixed here: on `main` and 3.5 the Issues page's
  two call sites pass `htmlspecialchars($issue->getIssueIdentification())`
  into the title, which the window prints as text (Proposed fix), so an
  issue whose identification holds "&" would be headed with "&amp;"
  there (code, not walked).
- No stored data is involved.

## Proposed fix

Title the window with the Issues page's string, in the shared cell
provider and its two siblings
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-wrong-heading/fix.diff)):

```diff
--- a/controllers/grid/submissions/ExportPublishedSubmissionsListGridCellProvider.php
+++ b/controllers/grid/submissions/ExportPublishedSubmissionsListGridCellProvider.php
@@ -95,7 +95,7 @@
                             new AjaxModal(
                                 $dispatcher->url($request, PKPApplication::ROUTE_COMPONENT, null, 'grid.issues.BackIssueGridHandler', 'editIssue', null, ['issueId' => $issue->getId()]),
-                                __('plugins.importexport.common.settings.DOIPluginSettings'),
+                                __('editor.issues.editIssue', ['issueIdentification' => $issue->getIssueIdentification()]),
                             ),
```

The same one-line change goes into
`PubIdExportIssuesListGridCellProvider::getCellActions()` and
`PubIdExportRepresentationsListGridCellProvider::getCellActions()`;
`PubIdExportSubmissionsListGridCellProvider` inherits the fix.

The identification goes in unescaped, unlike the Issues page's call
sites, on purpose. On `main` and 3.5 the title travels as data and is
printed as text: `Modal::getLocalizedOptions()` passes it to
`linkActionOptions.tpl`, which `json_encode`s it; `AjaxModalHandler.js`
hands the options to ui-library's `modalStore` as `legacyOptions`; and
`SideModalBodyLegacyAjax.vue` prints `{{ legacyOptions.title }}`.
Nothing on the way decodes entities, so a PHP-escaped title shows
"&amp;" (the Issues page fault in Cause).

Tried on OJS `main`: with the diff applied, step 4 opens the window
headed "Issue Management: Vol. 1 No. 2 (2014)", and the Issues page's
window keeps that heading.

**Alternatives**

- A new DOAJ-specific string ("Issue"): a new translation for a window
  that already has a heading string.
- Dropping the title: the window would open with no heading.

**What goes with it**

- Keep `plugins.importexport.common.settings.DOIPluginSettings` in the
  locale files. OJS's own code no longer uses it after the fix, but it is
  an OJS key that third-party export plugins, the users of the
  `PubIdExport…` grids, may call.
- Backport: on 3.4 and 3.3 the legacy window appends its title as HTML
  (lib/pkp `js/controllers/modal/ModalHandler.js`), so there the
  identification is escaped with `htmlspecialchars()`, as those
  branches' `IssueGridCellProvider` rightly does.
- Test: the e2e check of the DOAJ list in pkp-e2e's U63 spec, asserting
  that the window's heading names the issue.

Small: a one-line title change in each of three cell providers, reusing
an existing string, plus a heading check in the e2e test. This is a
proposal; the team decides.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-wrong-heading/walk.js),
  with its helper
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-wrong-heading/lib.js),
  takes the Steps and then the Control on an install freshly loaded from
  PKP's default test dataset (pkp/datasets `38ab955`, 2026-09-30),
  PostgreSQL:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-wrong-heading/walk.js`;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, where the Steps and the
  heading are the same. The script opens step 2's address directly. No
  request failed and no page script failed on either version.
- Fix trial on OJS `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doaj-issue-window-wrong-heading/fix.diff ojs`,
  then walk.js, then `node bin/try-fix.js revert … ojs`. The Control at
  the end of walk.js shows the fix leaves the Issues page's window
  alone. The two `PubIdExport…` providers' change was not walked: no
  screen on `main` reaches them.
- Branch tips: OJS `main` bade233f73 with lib/pkp 2e377d27fc;
  `stable-3_5_0` 92b9a16b48 with lib/pkp a9c76aed62; `stable-3_4_0`
  9571d8fde7 with lib/pkp df13621c2d; `stable-3_3_0` 9fdb9bcf9a with
  lib/pkp d446601ebe.
- Code reads: `main` and 3.5: the provider's title (line 98 on `main`,
  100 on 3.5); `IssueGridCellProvider.php` line 62 and `IssueGridRow.php`
  line 54 (escaped title); the title's path to the screen
  (lib/pkp `Modal.php` `getLocalizedOptions()`,
  `templates/linkAction/linkActionOptions.tpl`,
  `js/controllers/modal/AjaxModalHandler.js`; ui-library
  `src/stores/modalStore.js` `open-modal-vue`,
  `SideModalBodyLegacyAjax.vue`); `ExportPublishedPublicationsListGridHandler.php`
  columns; every `.tpl` under `plugins/` and `templates/` for the grids'
  component names (only the DOAJ `index.tpl`, on `main`, 3.5 and 3.4).
  3.4: the provider (line 100, the same title), the DOAJ template opening
  its grid, lib/pkp `ModalHandler.js` lines 172–173 (title appended as
  HTML). 3.3: `ExportPublishedSubmissionsListGridCellProvider.inc.php`
  line 82, `PubIdExportIssuesListGridCellProvider.inc.php` line 57,
  `PubIdExportRepresentationsListGridCellProvider.inc.php` line 81, all
  the same title; the Crossref, DataCite and DOAJ templates opening those
  grids; the same `ModalHandler.js`.
- Introduced, traced: `git log -L` on the title line of `main` leads
  through formatting and namespacing commits to
  [6002fcfbcc](https://github.com/pkp/ojs/commit/6002fcfbcc3e4693e98e6d298c416070d9541399)
  (2016-08-27, `pkp/ojs#1003` for `pkp/pkp-lib#1604`, "restructuring for
  doaj plugin"), which created the file from
  `PubIdExportSubmissionsListGridCellProvider` with the title unchanged.
  The title first appears in
  [800f075fd7](https://github.com/pkp/ojs/commit/800f075fd722d51f86253f3a0df52873965cecde)
  ("Crossref support"), in the submissions and issues lists' providers
  and the Crossref settings form; GitHub lists no PR for it.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for "DOI
  Plugin Settings", "DOIPluginSettings",
  `ExportPublishedSubmissionsListGridCellProvider`, "DOAJ issue modal
  title" and the like. Only `pkp/pkp-lib#12826` (open, "Remove grid
  code", the whole legacy grid layer) touches this code, not this fault.
- Unverified: the "&amp;" heading on the Issues page (Cause, reach) is
  read from the code; no issue holding "&" was walked.
