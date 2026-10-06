# In the Roles list, a screen reader cannot tell which role and stage each stage tick box sets

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [34f6c72a3a](https://github.com/pkp/pkp-lib/commit/34f6c72a3a6da8f19a4d376a1780f4a59acd4b7d) (2012-10-16)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The stage tick boxes of the "Roles" list (Settings › Users & Roles) have
no name, neither the role nor the stage. A screen reader has nothing to
announce for a box but "checkbox" and whether it is ticked, so a manager
who uses one cannot tell which role and stage a box sets.

The boxes work from the keyboard, and there is a way round. The list is
a table with marked column headings, so a screen reader's table mode can
give the stage. The role's name sits in the row's first cell, which is
not marked as the row's heading, so the user has to move back to it for
each row.

One shared cell template draws these boxes, and one fix names them all.
The same template draws the "Enabled" boxes of the plugins list and the
language boxes of Settings › Website › "Languages". A sibling template
draws the "Primary locale" and "Default" buttons there. All of them have
no name and the same way round.

## Impact

- **Lost.** Nothing is saved wrong. A screen reader user loses the box's
  own name: which role, plugin or language it sets.
- **Who.** A manager who uses a screen reader, each time they set a
  role's stages, turn a plugin on or off, or choose a language.
- **Way round.** On every one of these lists, the table mode gives the
  column heading (the stage, "Enabled", "UI", "Primary locale"), and the
  row's first cell gives the role, plugin or language.

Low: the boxes can be told apart from the table around them on every
list, so each task gets done. A list that drew these boxes without
column headings, or outside a table, would leave no way round and raise
it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version (OJS, OMP or OPS). Nothing
  else is needed.
- Chrome's accessibility inspector to read a control's name: inspect the
  control, then Elements › Accessibility › "Computed Properties" ›
  "Name".

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal's (press's,
   preprint server's) manager.
2. Open "Settings" › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`) and press
   the "Roles" tab.
3. In the "Current Roles" list, inspect each stage box of the "Author"
   row and read its name.
4. Do the same on the other rows, greyed-out boxes included (on a
   journal, the "Reviewer" row's "Submission", "Copyediting" and
   "Production" boxes).
5. Open "Settings" › "Website" › "Plugins" and read the name of the
   "Enabled" boxes.
6. Open "Settings" › "Website" › "Setup" › "Languages" and read the name
   of the boxes and of the "Primary locale" and "Default" buttons in its
   two lists.

**Expected.** Each control is named after its row and its column, for
example "Author, Review", "Dublin Core 1.1 metadata, Enabled" or
"English/English, Primary locale".

**Observed.** Every name is empty:

- Roles: 72 of 72 boxes on the journal, 95 of 95 on the press, 5 of 5 on
  the preprint server, greyed boxes included.
- Plugins: 45, 27 and 16 "Enabled" boxes.
- Languages: the 4 boxes of each list and its 2 buttons, on each app.

The browser's accessibility tree for the journal's "Author" row:

```
- row "Settings Author Author":
  - cell "Settings Author":
    - link "Settings"
    - text: Author
  - cell "Author"
  - cell:
    - checkbox [checked]
  - cell:
    - checkbox [checked]
  - cell:
    - checkbox [checked]
  - cell:
    - checkbox [checked]
```

## Cause

The boxes come from one shared cell template,
`lib/pkp/templates/controllers/grid/common/cell/selectStatusCell.tpl`,
line 16. It writes a bare `<input type="checkbox" id="select-cell-…">`
with no `<label>`, `aria-label`, `aria-labelledby` or `title`, so the box
has no text a name could come from. Its sibling `radioButtonCell.tpl`
(line 16) writes its `<input type="radio">` the same way.

The template is given the row's id but not its name.
`GridCellProvider::render()` passes a cell template `id`
(`<rowId>-<columnId>`), `column`, `actions`, `flags`, `formLocales` and
the variables its cell provider returns for that cell. For a stage
column, `UserGroupGridCellProvider::getTemplateVarsFromRowColumn()`
returns only `selected` and `disabled`. The row's name is the label of
its first data column (the column `GridHandler::setFirstDataColumn()`
flags `firstColumn`), which is drawn as a separate cell.

The table holds the rest of the context. `grid.tpl` writes the column
headings as `<th scope="col">` in one `<table>` with the rows (no list
here is split into two tables), so each cell has its column heading.
`gridRow.tpl` writes every cell as `<td>`, so the row's name is not a
row heading.

The box has had no name since the template's first commit in pkp-lib
(34f6c72a3a, "Move status grid cell into pkp-lib", 2012).

Reach, every grid column drawn with these two templates:

- Settings › Users & Roles › "Roles": a column per stage
  (`UserGroupGridHandler`, all three apps; walked).
- Settings › Website › "Plugins" and Administration's "Plugins":
  "Enabled" (`PluginGridHandler`; the context's list walked).
- Settings › Website › "Setup" › "Languages": "UI", "Forms" and the
  "Primary locale" buttons (`ManageLanguageGridHandler`), "Submissions",
  "Metadata" and the "Default" buttons
  (`SubmissionLanguageGridHandler`; both walked).
- Administration › "Site Settings" › "Languages": "Enable"
  (`AdminLanguageGridHandler`; code).
- Settings › Workflow › "Review" › "Review Forms": "Active" (OJS, OMP;
  `ReviewFormGridHandler`; code).
- Sections (OJS, OPS) and Series (OMP): "Inactive"
  (`SectionGridHandler`, `SeriesGridHandler`; code).
- An issue's table of contents: "Open Access", shown on a subscription
  journal (OJS `TocGridHandler`; code).

One more box of the same shape comes from another template:
`lib/pkp/templates/controllers/grid/gridRowSelectInput.tpl`, the row
selection box of `SelectableItemsFeature` (export lists, the
notifications list, file selection lists; code).

## Proposed fix

Recommended: let the grid pass the row's name to the two cell templates,
and name each box and radio button after its row and its column
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-stage-boxes-unnamed/fix.diff),
in `lib/pkp`):

- `GridHandler` gets a constant listing the two templates and a
  `getRowLabel($row)` that returns, as plain text, the label of the
  row's `firstColumn` column, asked of the same cell provider the cell is
  drawn with. It returns null for a grid with no column drawn with those
  templates.
- `renderRowInternally()` and `fetchCell()` assign it as `rowLabel`
  before drawing the cells.
- The two templates use it:

```diff
-	<input type="checkbox" id="select-{$cellId}" {if $name}name="{$name|escape}"{/if} …
+	<input type="checkbox" id="select-{$cellId}" aria-label="{if $rowLabel}{$rowLabel|escape}, {/if}{$column->getLocalizedTitle()|strip_tags|escape}" {if $name}name="{$name|escape}"{/if} …
```

`radioButtonCell.tpl` gets the same attribute. The `GridHandler` part
is about thirty lines and is in fix.diff only.

The name uses only text the list already shows (the row's name and the
column's heading), so no new locale key is needed.

Cost and safety. Only the grids in Reach ask for the label, once more
per row, of the provider that draws their first column. Each of those
providers answers from data the row already holds: a plugin's display
name, a review form's title, a section's or a language's name from the
row's array, an article's title from the publication its title cell
already reads. The one exception is the roles
list: `UserGroupGridCellProvider` reads the role's stages at the top of
every call, so the fix adds one such query per role. A provider that
returns no label (an empty first column) leaves the box named after its
column alone.

Tried on `main` on the three apps. Every box and radio button got its
name, for example "Author, Review", "Reviewer, Submission" (greyed) and
"Press manager, External Review". The other names it gave are
"Dublin Core 1.1 metadata, Enabled", "French/français, UI",
"English/English, Primary locale" and "English/English, Default".

These did not change with the fix:

- the row counts of the three lists, the role names, the rows'
  "Settings" link and the greyed boxes;
- a press on a stage box (it still sends its request, answered 200);
- a list with no box column, "Navigation Menus", drawn with no name
  added.

**Alternatives**

- `aria-labelledby` pointing at the row's name cell and the column
  heading: no text is repeated, but the headings carry no ids, and the
  name cell's id (`cell-<row>-<column>`) is unique only within one list.
  The two language lists both hold a `cell-en-locale` (code), so a box
  could take its name from the other list.
- A name returned by each cell provider: the same result, but the
  providers of every list in Reach, in pkp-lib and the apps, would each
  have to do it, and a new list would start without names again.
- Making the first cell of each row a row heading (`<th scope="row">` in
  `gridRow.tpl`): it helps table navigation, but the box itself still
  has no name, and it restyles the first column of every list.
- Waiting for the lists to be rebuilt in Vue (`pkp/pkp-lib#12826`,
  "Remove grid code", open): no date.

**What goes with it**

- Nothing that reads the lists changes: the boxes keep their `id`,
  `name`, `value` and click action.
- Backport: the diff applies as written to `stable-3_5_0` (dry run on the
  OJS and OMP checkouts). `stable-3_4_0` has the same templates and the
  same `renderRowInternally()`. `stable-3_3_0` needs the method written
  in its older PHP, with `AppLocale` in place of the `Locale` facade.
- Left out: `gridRowSelectInput.tpl` (Cause). Adding it to the constant
  and the attribute would name it, but its lists were not checked on
  screen.
- Guard: an end-to-end check that finds each stage box of the Roles list
  by its name "<role>, <stage>".

Medium: three files of pkp-lib (the grid base class and two templates),
which REPORT's scale puts above small, though there is no data or API
change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-stage-boxes-unnamed/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-stage-boxes-unnamed/lib.js)).
  It takes the Steps as `rvaca` on PKP's default dataset (pkp/datasets
  c657990, 2026-10-01). It reads each name twice: from Chromium's
  accessibility tree (CDP `Accessibility.getPartialAXTree`, what DevTools
  shows) and by a role-and-name query. It also takes the unchanged
  checks listed in the Proposed fix. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-stage-boxes-unnamed/walk.js`.
  `PROBE_FEATURE` names the fleet to drive: an install loaded from the
  default dataset. `PROBE_AGENT` names the folder the records go to.
  Put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/role-stage-boxes-unnamed/fix.diff ojs omp ops`,
  the same walk, then `revert`, then the walk again without the fix.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database):
  - main: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; pkp-lib
    ddd8ab243a (OJS) and 3dc90c81a6 (OMP, OPS).
  - 3.5: OJS c346ee00a5, OMP c7b45f88e, OPS 8eaf899468; pkp-lib
    3bb4450bea (OJS) and 1fb843f491 (OMP, OPS). The same counts as on
    `main`.
- Code reads:
  - main and 3.5: the files the Cause names, identical on both for the
    two templates; the first-column branch of each Reach list's cell
    provider, for the cost.
  - 3.4: pkp-lib `stable-3_4_0` (32b0f4b4af; apps OJS 75cc2d488b, OMP
    0aec65441, OPS acd8ae704b): both templates identical to `main`,
    `UserGroupGridHandler` draws the stage columns with
    `selectStatusCell.tpl`, the language lists use both templates.
  - 3.3: pkp-lib `stable-3_3_0` (f6ab331645; apps OJS ac77c9fb35, OMP
    8e72fc883, OPS c5532e2161): both templates identical,
    `UserGroupGridHandler.inc.php` line 136 draws the stage columns with
    `selectStatusCell.tpl`, the same `renderRowInternally()`.
- Introduced: `git blame` on `selectStatusCell.tpl` line 16 gives
  1c3f73a240 (`pkp/pkp-lib#1143`, 2016), which only added `name` and
  `value`. At its parent the line is as written in 34f6c72a3a, which
  moved the template into pkp-lib from the apps; their history before
  that was not read.
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and pull requests, open and closed:
  `selectStatusCell`, "checkbox label grid accessibility", "roles stage
  checkbox screen reader", "grid checkbox aria-label", "user group grid
  checkbox accessible", "checkbox label screen reader", "A11Y checkbox",
  "A11Y label form", "A11Y roles", "A11Y plugins", "A11Y language",
  "A11Y grid", "WCAG roles". The open "[A11Y]" issues found are about
  text size, the reader pages and the editorial header.
  `pkp/pkp-lib#1071` (closed 2021) was a general audit that listed
  "form controls without labels" without naming these lists.
- Not driven: a screen reader or voice control; the Administration
  lists, review forms, sections or series and an issue's table of
  contents (code only); 3.4 and 3.3.
- Unverified: the way round rests on the table's markup (column headings
  as `<th scope="col">`, the row's name in a `<td>`). No screen reader
  was run to hear how it words a box or its column heading.
