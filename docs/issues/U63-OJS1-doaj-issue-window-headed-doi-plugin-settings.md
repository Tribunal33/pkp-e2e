# Pressing an issue in the DOAJ Articles list opens its window headed "DOI Plugin Settings"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code; also the Crossref, DataCite and mEDRA lists)
- **Introduced** `pkp/ojs#1003` for `pkp/pkp-lib#1604` · [6002fcfbcc](https://github.com/pkp/ojs/commit/6002fcfbcc3e4693e98e6d298c416070d9541399) · 2016-08-27 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A journal manager opens Tools › "DOAJ Export Plugin" › "Articles" and
presses an issue's name in the "Issue" column. The issue's window opens,
headed "DOI Plugin Settings".

It is the window the Issues page opens for the same issue, where it is
headed "Issue Management: Vol. 1 No. 2 (2014)", and that is the heading
it should carry here. Only the heading is wrong: the manager is told they
are in a plugin's settings while they edit an issue.

The name is pressable for every article in the list that sits in an
issue. The "Articles" tab is there while the journal's "DOI Versioning"
is off, as it is by default. On 3.3 the Crossref, DataCite and mEDRA
tools' lists open the window under the same heading.

## Impact

- **Lost.** Nothing: the issue's tabs work as on the Issues page.
- **Who.** Journal managers in the DOAJ tool's "Articles" list, each time
  they press an issue's name.
- **Way round.** None needed.

Low: a heading that misleads while the task gets done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. It has "DOAJ Plugin" enabled
  (Settings › Website › "Plugins") and "DOI Versioning" set to "No, all
  versions of an article should have the same DOI." (Settings ›
  Distribution › "DOIs" › "Setup"); with "Yes" the DOAJ tool shows a
  "Publications" tab instead of "Articles", and that list has no issue
  column. It holds the published issue "Vol. 1 No. 2 (2014)" with
  "Signalling Theory Dividends" (submission 1). Nothing is created.
  [3.5: DOAJ is an Import/Export plugin there, listed under Tools without
  being enabled, and always shows "Articles".]

Steps:

1. Sign in as `rvaca` (the journal manager).
2. In the side menu, open "Tools", then "DOAJ Export Plugin".
3. Open the "Articles" tab.
4. In the row "Mwandenga et al.; The Signalling Theory Dividends", press
   "Vol. 1 No. 2 (2014)" in the "Issue" column.

**Expected.** The window is headed "Issue Management: Vol. 1 No. 2
(2014)".

**Observed.** The window opens with the tabs "Table of Contents", "Issue
Data" and "Issue Galleys", headed "DOI Plugin Settings". No request
failed and no script error was logged.

Control: the side menu's "Issues" (on `main` under "Content") ›
"Back Issues" › "Vol. 1 No. 2 (2014)" opens the same window headed
"Issue Management: Vol. 1 No. 2 (2014)".

## Cause

`ExportPublishedSubmissionsListGridCellProvider::getCellActions()`
(OJS, `controllers/grid/submissions/`) builds the "Issue" column's link
as an `AjaxModal` on `grid.issues.BackIssueGridHandler` `editIssue`,
the Issues page's own issue window. It titles the modal
`__('plugins.importexport.common.settings.DOIPluginSettings')`, "DOI
Plugin Settings" (line 98 on `main`), and the window's heading is that
title (`SideModalBodyLegacyAjax.vue` prints `legacyOptions.title`).

The title came with the code. In 2016 the lists of the DOI export
plugins (Crossref, DataCite, mEDRA) opened the issue window from their
issue links under this title.
[6002fcfbcc](https://github.com/pkp/ojs/commit/6002fcfbcc3e4693e98e6d298c416070d9541399)
(`pkp/pkp-lib#1604`, the DOAJ export plugin) moved the published
articles list out of `PubIdExportSubmissionsListGridCellProvider` into
the new `ExportPublishedSubmissionsListGridCellProvider`, so that DOAJ
could use it, and kept that title. Even on the DOI plugins it named the
plugin, not the issue the window edits. The Issues page titles the same
window `__('editor.issues.editIssue', ['issueIdentification' => …])` in
`IssueGridCellProvider::getCellActions()` and `IssueGridRow::initialize()`.

Reach:

- DOAJ's "Articles" list: on screen, `main` and 3.5.
- `PubIdExportSubmissionsListGridCellProvider` (extends the provider
  above), `PubIdExportIssuesListGridCellProvider` (the issue name in an
  issues list) and `PubIdExportRepresentationsListGridCellProvider` (the
  issue name in a galleys list) open the window under the same title
  (read in the code). From 3.4 on nothing loads these three lists: the
  Crossref, DataCite and mEDRA tools point to the DOIs page instead. On
  3.3 those tools' `index.tpl` load them.
- DOAJ's "Publications" list (`main`, shown when "DOI Versioning" is on)
  has no issue column (`ExportPublishedPublicationsListGridCellProvider`,
  read in the code).
- The Issues page's own heading shows `&amp;` for an issue whose name
  holds "&". An issue titled "u63ojs1 Arts & Letters", shown with its
  title, is headed `Issue Management: Vol. 1 No. 2 (2014): u63ojs1 Arts
  &amp; Letters` (on screen, `main`; 3.5 prints the title the same
  way). The two Issues page lines pass the identification through
  `htmlspecialchars()`. That was right while the modal inserted its title
  as HTML (lib/pkp's `ModalHandler.js` on 3.4 and 3.3). On `main` and 3.5
  the side window prints it as text, so the escaping shows.
- OMP and OPS have no such lists.

## Proposed fix

A proposal, tried on `main`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/fix.diff),
against the OJS root).

Recommended: title the window as the Issues page does, in each of the
three export providers that open it:

```diff
                             new AjaxModal(
                                 $dispatcher->url($request, PKPApplication::ROUTE_COMPONENT, null, 'grid.issues.BackIssueGridHandler', 'editIssue', null, ['issueId' => $issue->getId()]),
-                                __('plugins.importexport.common.settings.DOIPluginSettings'),
+                                __('editor.issues.editIssue', ['issueIdentification' => $issue->getIssueIdentification()]),
                             ),
```

The same line goes in `PubIdExportIssuesListGridCellProvider` (with
`$publishedIssue`) and `PubIdExportRepresentationsListGridCellProvider`.
It reuses the Issues page's key, so every language already has the text.

The identification is passed as it is, without `htmlspecialchars()`,
because on `main` the side window prints the title as text. For the two
headings to read the same, the fix drops `htmlspecialchars()` from the
Issues page's title in `IssueGridCellProvider::getCellActions()` and
`IssueGridRow::initialize()` too. `__()` does not escape its parameters,
and the title reaches the page through `json_encode`, so no markup is
interpreted.

Tried on `main`: the Steps' window read "Issue Management: Vol. 1 No. 2
(2014)" with the same three tabs. For the issue titled "u63ojs1 Arts &
Letters", the Issues page and the DOAJ list both headed the window
"Issue Management: Vol. 1 No. 2 (2014): u63ojs1 Arts & Letters". The
Issues page's window for the unchanged issue kept "Issue Management:
Vol. 1 No. 2 (2014)" with and without the fix.

**Alternatives**

- A new key such as "Issue: {$issueIdentification}": a new string for
  translators, where the Issues page's heading already fits.
- Fixing only the DOAJ list's provider: the other two providers keep the
  wrong heading for any plugin that loads them.
- Keeping `htmlspecialchars()` in all five places: every heading would
  show `&amp;` for such an issue.

**What goes with it**

- `plugins.importexport.common.settings.DOIPluginSettings` is no longer
  used in OJS's code. It stays for now, because a separate plugin may
  use it.
- No stored data, API or hook changes.
- Backport: the three title lines on 3.5, 3.4 and 3.3, and the Issues
  page's two lines on 3.5. On 3.4 and 3.3 the modal inserts its title
  as HTML, so there the new titles keep `htmlspecialchars()`, as the
  Issues page does.
- Test: an e2e check of the window's heading from the DOAJ list, for an
  issue whose name holds "&".

Small: one line in each of five grid classes, reusing an existing key.

## Evidence

- Kept scripts, run on a freshly reset install of the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/walk.js)
    takes the Steps:
    `node bin/probe.js ojs shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/neighbour.js)
    takes the Control.
  - [ampersand.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/ampersand.js)
    gives "Vol. 1 No. 2 (2014)" the title "u63ojs1 Arts & Letters" on
    its "Issue Data" tab, ticks "Title", and reads the heading from the
    Issues page and from the DOAJ list.
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-issue-window-headed-doi-plugin-settings/trial.sh)
    (`node bin/try-fix.js apply …/fix.diff ojs`, the three scripts,
    `node bin/try-fix.js revert ojs`, neighbour.js again).
- Walked on `main` and `stable-3_5_0`, OJS, on pkp/datasets 38ab955
  (2026-09-30), PostgreSQL; the heading does not depend on the database.
  ampersand.js ran on `main` only.
- Tips: `main`: OJS bade233f73 (pkp-lib 2e377d27fc). `stable-3_5_0`:
  OJS 92b9a16b48 (pkp-lib a9c76aed62). `stable-3_4_0`: OJS 9571d8fde7,
  pkp-lib df13621c2d. `stable-3_3_0`: OJS 9fdb9bcf9a, pkp-lib d446601ebe.
  pkp/medra: `main` cc02972e42, `stable-3_5_0` e594896ea2.
- Code reads: 3.5, 3.4 and 3.3 carry the same title in the three
  providers (`.inc.php` on 3.3), and DOAJ's `templates/index.tpl` loads
  `ExportPublishedSubmissionsListGridHandler` on all four.
  `editor.issues.editIssue` ("Issue Management:
  {$issueIdentification}") exists on all four. 3.5's
  `IssueGridCellProvider` and `IssueGridRow` escape the title as on
  `main`, and its `SideModalBodyLegacyAjax.vue` prints it as text. On
  3.4 and 3.3, lib/pkp's `js/controllers/modal/ModalHandler.js` appends
  `options.title` as HTML. On 3.3, `plugins/importexport/crossref` and
  `datacite` `templates/index.tpl`, and pkp/medra's `stable-3_3_0`
  `templates/index.tpl`, load the `grid.pubIds` lists; from 3.4 on the
  Crossref, DataCite and mEDRA `index.tpl` only point to the DOIs page.
- Introduced: `git blame` of line 98 on `main` gives 406f6123da (2024,
  `pkp/pkp-lib#10444`), which added a `'side-modal'` argument after the
  title; 2f9bf4937a removed it again and left the trailing comma. Blame
  before 406f6123da gives 665ed1f925 (2021, the PSR-12 reformat), then
  c9bd2bbc2c (2020, `pkp/pkp-lib#6447`, re-indented the line), then
  6002fcfbcc, which added the file with the title. The title first
  appeared in the pubIds providers with 800f075fd7 (2016-06-28,
  `pkp/pkp-lib#383`, Crossref support).
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, by the heading's words and the
  providers' class names. Nothing about this heading;
  `pkp/pkp-lib#12826` (remove the grid code) names these files among
  many.
- Unverified: the `&amp;` on the Issues page on 3.5 (read in the code,
  not walked).
