# Export list with more than one page: ticks on other pages are left out of the file, and "Select All" cannot be undone

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP (code; OPS has no Native XML Plugin)
- **Introduced** "Select All": `pkp/ui-library#88`, `pkp/ojs#2746` and `pkp/omp#812` for `pkp/pkp-lib#5865` · [d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3) · 2020-05-13 · Nate Wright (NateWr); the dropped ticks are older, not traced
- **Upstream** `pkp/pkp-lib#11716` (open), covering the "Select All" half only, reported on OMP 3.4
- **Tracked in** spec U63 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#a11)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager exporting from Tools › "Native XML Plugin" on a journal,
press or preprint server with more than 100 submissions sees the list
split into pages of 100. They tick submissions on one page, move to the
next and tick more. Going back, the earlier ticks still show. But only
the lines ticked on the page on screen go into the exported file, and
nothing says the others were left out.

"Select All" ticks the 100 lines of the page, but its label stays
"Select All" instead of turning into "Select None". Pressing it again
unticks nothing, so the only way back is to untick lines one by one or
reload the page.

The file can be completed by exporting each page on its own.

## Impact

- **Lost.** Submissions ticked on other pages are missing from the
  file, though they still show as ticked, and the results tab reports
  success.
- **Who.** Managers of a context with more than 100 submissions (in any
  stage) whose choice spans more than one page.
- **Way round.** Export one page at a time, one file per page. Reload
  the page to clear what "Select All" ticked.

Medium: the export silently holds fewer submissions than the screen
shows ticked, but only in contexts past one page, and there is a way
round. It would be high if exports of large journals fed a migration
that nobody checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main` (or
  `stable-3_5_0`), context `publicknowledge`.
- More than 100 submissions in it: one page of the export list holds
  100, and the dataset has 20 (OJS), 18 (OMP) or 19 (OPS). Steps 1–5
  add them through the same tool, by importing the context's own
  export five times (120, 108 or 114 in all).

More than one page:

1. Sign in as `rvaca` (the manager).
2. In the side menu click "Tools"; on the "Import/Export" tab click
   "Native XML Plugin".
3. Open the "Export Articles" tab ("Export" on a press, "Export
   Preprints" on a preprint server). Click "Select All", then "Export
   Articles" ("Export Submissions", "Export Preprints"), then "Download
   Exported File".
4. Open the "Import" tab, "Upload File" the downloaded file and click
   "Import". Wait for the "Import Results" tab ("Results" on a press).
5. Reload the page and repeat step 4 four more times.

"Select All":

6. Reload the page and open the export tab. The list shows 100 lines
   and "Previous 1 2 Next" under it.
7. Click "Select All".
8. Click the same button again.

Ticks on two pages:

9. Reload the page and open the export tab. Tick the first line on
   page 1: "Transformative Impact of AI Tools on Modern Education:
   Opportunities, Challenges, and Future Directions" (OJS, OMP),
   "Finocchiaro: Arguments About Arguments" (OPS).
10. Click "2" under the list and tick the first line on page 2: "The
    The Signalling Theory Dividends: A Review Of The Literature And
    Empirical Evidence" (OJS; the title reads "The The…" after the
    imports, a separate fault), "A Designer's Log: Case Studies in
    Instructional Design" (OMP), "Yam diseases and its management in
    Nigeria" (OPS).
11. Click "1" under the list, then "2" again.
12. Click "Export Articles" ("Export Submissions", "Export Preprints"),
    then "Download Exported File".

**Expected.** Step 7 ticks the lines, and the button reads "Select
None"; step 8 unticks them. The file from step 12 holds both ticked
submissions.

**Observed.** Step 7 ticks the 100 lines of page 1, and the button still
reads "Select All". Step 8 changes nothing: the 100 lines stay ticked
and the button reads "Select All". In step 11 the line ticked in step 9
still shows as ticked on page 1, and the line ticked in step 10 on page
2. The file from step 12 holds one submission, the one ticked on page 2
(`<article>` count 1; OMP `<monograph>`, OPS `<preprint>`). The results
tab reads "The export completed successfully. Download the exported file
from the button below." as for a complete export.

With the dataset's own submissions (one page), step 3's "Select All"
reads "Select None" and the file holds all 20 (18, 19).

## Cause

The export page component, `ImportExportPage.vue` (pkp/ui-library),
keeps one list of selected submission ids, `selectedSubmissions`. It
survives a move to another page of the list, which is why the earlier
ticks still show. The list (`SubmissionsListPanel`, `count` 100 in
`PKPNativeImportExportPlugin::display()`) holds only the lines of the
page on screen in `components.submissions.items`, while
`components.submissions.itemsMax` is the total. Two things go wrong.

"Select All" mixes the page up with the total.
`ImportExportPage::toggleSelectAll()` (lines 26–35) selects `items`
(the page) but decides between "all" and "none" by
`selectedSubmissions.length >= itemsMax` (the total). The templates'
label uses the same test (`index.tpl` line 103 in OJS's
`plugins/importexport/native`). Past one page the test stays false
unless every submission on every page has been ticked by hand, so the
label stays "Select All" and every press selects the page again. Its
`else` branch assigns `this.selectedSubmissions = …items.map(…)`, so
"Select All" on page 2 also drops the ticks of page 1.

"Select All" was meant for the page. `pkp/pkp-lib#2102` added it in
2017 ("This only selects all visible submissions"; an "export all" was
left for later), and the list's own `toggleSelectAll()` compared with
`items.length` until the 2020 refactor moved it here and compared with
`itemsMax`.

The export posts the checkboxes on screen instead of the stored
selection. `ImportExportPage::submit()` (line 18) submits the form: the
Native XML and ONIX forms through `AjaxFormHandler::submitForm()`,
which posts `$form.serialize()`, and PubMed's through the plain
`FormHandler`, a normal form post. Either way only the checkboxes in
the markup are sent, and only the lines of the page on screen have
checkboxes. `selectedSubmissions` is never read.

Reach:

- OJS "PubMed XML Export Plugin" and OMP "ONIX 3.0 Monograph Export
  Plugin" (code): the same page component, the same `count` 100, label
  test and `submit('#exportXmlForm')`.
- "Select All" on page 2 dropping the ticks of page 1: code.
- DOI management (`DoiListPanel.vue`, code): the same "Select All"
  mistake. `isAllSelected` (line 338) compares counts
  (`selected.length === items.length`), and `toggleSelectAll()` (line
  459) replaces the selection with the page's ids. So "Select All" on
  page 2 drops the ticks of page 1, and a page with as many lines as
  there are ticks reads "Select None". Its bulk actions send the stored
  `selected` (line 572), so none of its ticks are dropped there.
- OJS "Export Issues" is a legacy grid, not this list: not affected.

## Proposed fix

Keep "Select All" to the page, as it was meant, keep the ticks of
other pages, and send the stored selection. All in
`ImportExportPage.vue`, plus a one-line label change in each of the
five templates:

- A computed `isAllSelected`: every line on the page on screen is in
  the selection. The templates' label test becomes
  `<template v-if="isAllSelected">`.
- `toggleSelectAll()` adds the page's ids to the selection, or removes
  them when `isAllSelected`. Ticks on other pages are kept.
- `submit()` adds a hidden `selectedSubmissions[]` field for each
  selected id that has no checkbox on screen, then submits. All five
  export forms go through `submit('#exportXmlForm')`, so the server and
  the plugins stay unchanged.

The work is one ui-library change (`ImportExportPage.vue`), then one
PR per app with its template lines, the ui-library submodule bump and
a rebuilt bundle. The diffs below each carry the same ui-library hunk
with that app's templates:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-selection-stops-at-page/fix-ojs.diff)
(Native XML, PubMed),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-selection-stops-at-page/fix-omp.diff)
(Native XML, ONIX),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-selection-stops-at-page/fix-ops.diff).

Tried on `main` in all three apps. Step 7 reads "Select None", and step
8 unticks the 100 lines and reads "Select All". An export with one line
ticked on each page held both. On a one-page list, the fix changed
nothing: "Select All" pressed twice ticked and unticked every line, and
with two lines ticked and one unticked again the file held the ticked
one. The PubMed tool's "Select All" on one page also behaved the same.

**Alternatives**

- A "Select All" that ticks every submission on every page. That is
  the "export all" `pkp/pkp-lib#2102` left for later. The page
  component does not know the list's filters and search, so it would
  have to repeat the list's query in batches of 100.
- Clearing the selection on a move to another page. The screen and the
  file would then agree, but a manager could no longer export a choice
  spread over several pages.
- Hidden inputs in each template instead of in `submit()`: the same
  result, in five templates instead of one component.

**What goes with it**

- Left out: DOI management's "Select All" (Reach). It is another
  component, whose selection feeds DOI deposits and the other bulk
  actions rather than this export, and it was not walked. The same
  membership test and add/remove change would fix it there, in its own
  change.
- Behavior change: a submission ticked and then hidden by a search or a
  filter is now exported, because the export sends every stored tick.
  A "n selected" count beside the buttons would make that visible; it
  is not in the diffs.
- No API, hook or stored data changes. A backport to 3.5 and 3.4
  applies the same way. 3.3 has the same component and templates in
  OJS and OMP.
- Guard: an e2e scenario for U63 on a context with more than 100
  submissions (tick on two pages, export, count the file), and a
  ui-library unit test for `toggleSelectAll()` and `submit()`.

Medium: the code change is small, but it is a ui-library PR followed by
a PR in each of the three apps with the template lines, the submodule
bump and a rebuilt bundle, and it changes what is exported for ticks
hidden by a search.

## Evidence

- Script that takes the Steps in a browser on a fresh load of the
  default dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-selection-stops-at-page/walk.js),
  run with
  `PROBE_FEATURE=issues-ir3 PROBE_AGENT=u63a11 node bin/probe.js all shared/playwright/checks/issues/export-selection-stops-at-page/walk.js`
  (on 3.5 with `PKP_E2E_LINE=stable-3_5_0` in front). `WALK=neighbour`
  runs the one-page checks, and `WALK=pubmed` the PubMed tool's "Select
  All" (OJS).
- The fix: `node bin/try-fix.js apply …/fix-<app>.diff <app>` for each
  app, the walk and the one-page checks, then
  `node bin/try-fix.js revert ojs omp ops` and the one-page checks again
  without it. It was tried before steps 11 and 12 were added, with the
  export pressed on page 2.
- Walked 2026-09-30 on PostgreSQL, each install loaded from pkp/datasets
  38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6), ui-library
  280f98c5; stable-3_5_0 OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd
  (lib/pkp a9c76aed62, ui-library 1a7a4750, `ImportExportPage.vue` the
  same as on main). All six showed the Observed above, with no server
  error or script error. On 3.5 the walk went without step 11 (the
  export pressed on page 2 straight after step 10).
- 3.4, by code: ui-library `stable-3_4_0` at ee684b34 has the same
  `toggleSelectAll()` and `submit()`; pkp-lib at df13621c2d the same
  `count` 100; OJS 9571d8fde7 (Native XML, PubMed), OMP 0aec65441
  (Native XML, ONIX) and OPS acd8ae704b the same label test and
  `submit('#exportXmlForm')`.
- 3.3, by code: ui-library `stable-3_3_0` at 96959f9e has the same
  `toggleSelectAll()` and `submit()`. OJS 9fdb9bcf9a and OMP 8e72fc883
  build the list in the app's own `NativeImportExportPlugin.inc.php`
  with `count` 100, use the same label test, and post the export form
  through `FormHandler`. OPS c5532e2161 has no Native XML Plugin.
- Introduced: `git blame` on `ImportExportPage.vue` lines 26–35 and on
  line 103 of OJS's native `index.tpl` stops at the 2020 refactor
  (ui-library d0ffc05ab4, OJS
  [8420969872](https://github.com/pkp/ojs/commit/842096987251d154cc6d3c0f7c3f010e091f8aef),
  OMP
  [6a4168a7b](https://github.com/pkp/omp/commit/6a4168a7b46230ff556f495553e9d127d8473b39),
  `pkp/pkp-lib#5865`). Before it, the list's own `toggleSelectAll()`
  (ui-library `ListPanel.vue` at d0ffc05a^) compared the selection with
  `items.length`. The export list and its `count` 100 date from
  [61b6fd82ed](https://github.com/pkp/ojs/commit/61b6fd82edc00ded213ff4502cc73aea7f32eebc)
  (OJS, 2017, `pkp/pkp-lib#2163`).
- Upstream, searched 2026-09-30 in pkp/pkp-lib, the three apps and
  pkp/ui-library: `pkp/pkp-lib#11716` reports "Select All" not turning
  into "Select None" on OMP 3.4 when the list pages, and does not
  mention the dropped ticks. No other match.
- Unverified: the PubMed and ONIX tools past one page, and DOI
  management's "Select All" (read in the code). The ONIX tool shows
  only a publisher reminder on the dataset's press until its publisher
  details are filled in, and was not walked.
