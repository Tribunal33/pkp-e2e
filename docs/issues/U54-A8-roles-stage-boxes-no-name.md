# On the "Roles" list, a screen reader reads each stage box as a bare "checkbox", naming no role

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [34f6c72a3a](https://github.com/pkp/pkp-lib/commit/34f6c72a3a6da8f19a4d376a1780f4a59acd4b7d) (2012-10-16)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Roles", each role's row has one box per
workflow stage, which the manager ticks to let the role work in that
stage. The boxes have no label. A screen reader announces each one only
as "checkbox" and whether it is checked, so a manager who uses one cannot
tell which role a box belongs to.

The setting still works, and the role's "Edit" window offers the same
stages as labelled boxes under "Stage Assignment", so the stages can be
set there instead.

## Impact

- **Lost**: a screen reader user cannot use the list's boxes. Pressing a
  box saves at once, with a notice such as "Author role assigned to
  Production stage.". So a user who presses a box without knowing which
  one it is gives that role work in that stage, or takes it away. Pressing
  the box again after a reload of the page undoes it.
- **Who**: managers who use a screen reader, or voice control, which
  picks a control by its label, whenever they set a role's stages from
  the list. The stage's column heading is announced only by a screen
  reader set to report table headers, and the role never is (not checked
  with a real screen reader).
- **Way round**: the role's "Edit" window.

Low: the list's boxes are not the only way to set a role's stages, and a
wrong press is announced by its notice and can be undone; it would be
medium if the "Edit" window's boxes had no labels too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- A screen reader (NVDA, JAWS, VoiceOver), or the browser's accessibility
  inspector (Chrome DevTools › Elements › "Accessibility"), to hear or see
  the accessible name each control is given.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`) and press
   the "Roles" tab.
3. With the keyboard, move to the "Settings" arrow at the start of the
   "Author" row.
4. Press Tab: the focus moves to the "Author" row's box under
   "Submission" (a preprint server's only column is "Production").
5. Press Tab through the row's other boxes ("Review", "Copyediting",
   "Production"; a press: "Internal Review", "External Review",
   "Copyediting", "Production").
6. In the accessibility inspector, select a box of the manager row
   ("Journal manager", "Press manager", "Preprint Server manager"); these
   boxes are greyed out, so Tab skips them.

**Expected**: each box has an accessible name that says which role and
which stage it sets, so a screen reader reads, for example, "Author role,
Submission stage, checkbox, checked".

**Observed**: the "Settings" arrow is announced "Settings, link". Every
box after it has an empty accessible name and is read as "checkbox,
checked". The manager row's greyed boxes have an empty accessible name
too.

## Cause

Every box of the list is drawn by the shared cell template
`lib/pkp/templates/controllers/grid/common/cell/selectStatusCell.tpl`
(line 16): an `<input type="checkbox">` with an id and no `<label>`,
`aria-label` or `title`. The template's variables are the box's state
(`selected`, `disabled`) and its form-field `name` and `value`
attributes; none of them becomes a label, so a cell provider has no way
to give the box an accessible name. A form control without an accessible
name breaks WCAG 2.1 success criterion 4.1.2 (Name, Role, Value).

The roles list (`UserGroupGridHandler::initialize()`, line 153) gives
each stage column this template, and
`UserGroupGridCellProvider::getTemplateVarsFromRowColumn()` returns only
`selected` and `disabled` for the stage cells. The table's
`<th scope="col">` headings carry the stage, which a screen reader can
add when it reports table headers. The role is never announced: its name
sits in a plain `<td>`, not a row header, and the box does not refer to
it.

The same template draws an unlabelled box in seven other grids, checked
in the code (the plugins list also driven in the browser):

- Settings › Website › Plugins and Administration's plugin list,
  "Enabled" (`PluginGridHandler`, pkp-lib).
- Settings › Website › Setup › Languages, "UI", "Forms", "Submissions",
  "Submission Metadata" (`LanguageGridHandler`), and Administration ›
  Languages, "Enable" (`AdminLanguageGridHandler`), pkp-lib.
- Settings › Workflow › Review › Review Forms, "Active"
  (`ReviewFormGridHandler`, pkp-lib).
- Settings › Journal › Sections and the preprint server's Sections,
  "Inactive" (`SectionGridHandler`, OJS and OPS), and Settings › Press ›
  Series, "Inactive" (`SeriesGridHandler`, OMP).
- An issue's table of contents, "Open Access" (`TocGridHandler`, OJS),
  shown only when the journal publishes by subscription and the issue's
  access is by subscription.

Two sibling templates leave their control unlabelled the same way:
`radioButtonCell.tpl` (the languages list's default-language radio) and
`gridRowSelectInput.tpl` (the row boxes of `ItemSelectionGridColumn`).

## Proposed fix

A proposal; the team decides. Let the shared cell take a label, and have the roles list give one. In
`selectStatusCell.tpl` the box gets `aria-label` from a new template
variable `selectLabel`, falling back to the column's title, so every
grid that uses the template gets at least its column's name. In
`UserGroupGridCellProvider::getTemplateVarsFromRowColumn()` the stage
cells return `selectLabel` beside `selected` and `disabled`, built from
the role's name and the column's stage through a new locale key
`grid.userGroup.stageCheckboxLabel` ("{$userGroupName} role,
{$stageName} stage", worded like the list's notice "{$userGroupName}
role assigned to {$stageName} stage."). The full diff, against the app
root, is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-stage-boxes-no-name/fix.diff);
the template line becomes:

```diff
-	<input type="checkbox" id="select-{$cellId}" {if $name}name="{$name|escape}"{/if} …
+	<input type="checkbox" id="select-{$cellId}" aria-label="{if $selectLabel}{$selectLabel|escape}{else}{$column->getLocalizedTitle()|escape}{/if}" {if $name}name="{$name|escape}"{/if} …
```

Tried on `main` with OJS, OMP and OPS: the "Author" row's boxes read
"Author role, Submission stage" and so on, the manager row's greyed boxes
are labelled and stay greyed, a press on a box still saves with the
notice "Author role unassigned from Production stage.", and the "Edit"
window's labels are unchanged. The plugins list's boxes, through the
fallback, read "Enabled".

**Alternatives**:

- `aria-label` from the column title alone, in the template: one line,
  but every row's box is then "Submission", and the role is still missing.
- `aria-labelledby` pointing at the column heading and the row's name
  cell: no new string, but the `<th>` and name cells have no ids, so
  `grid.tpl` and `gridRow.tpl` would change for every grid.
- Replacing the list with a Vue component, as `pkp/pkp-lib#12826`
  ("Remove grid code") plans for the legacy grids in general: the lasting
  answer, far larger than this fault.

**What goes with it**:

- The other grids named under Cause can pass a `selectLabel` with the
  row's name (the plugin's, the language's, the section's) the same way;
  until then the fallback gives them the column's name. `radioButtonCell.tpl`
  and `gridRowSelectInput.tpl` need the same change; left out here.
- No stored data changes, and nothing an API client or plugin relies on.
- Backport: on 3.5 the template and the provider are the same as on
  `main`; the `.po` entry goes after `grid.userGroup.unassignedStage` as
  on `main`, and only the entry that follows it differs, so that hunk's
  context needs adjusting. 3.4's provider reads the role's name with
  `getLocalizedName()`. 3.3's provider also uses `getLocalizedName()` and
  builds the stage cells in a `case in_array($columnId, $workflowStages):`
  branch returning `array(...)`, so its hunk is a rewrite, in
  `UserGroupGridCellProvider.inc.php`, with the string in
  `locale/en_US/grid.po`.
- The guard: an e2e check that every stage box of the list has a
  non-empty accessible name.

Small: one attribute in the shared template, four lines and a comment in
one cell provider and one locale key, tried.

## Evidence

- The script, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/roles-stage-boxes-no-name/walk.js)
  takes steps 1-6 and records, for each control, Chromium's
  accessibility node (role, accessible name and its source, checked) and
  its markup. It then checks what the fix must not change (a greyed box
  stays greyed, a press still saves and is pressed back after a reload,
  the "Edit" window's labels) and the one other grid the fix changes on
  purpose (the plugins list's box, through the fallback). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/roles-stage-boxes-no-name/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix was tried
  with `node bin/try-fix.js apply shared/playwright/checks/issues/roles-stage-boxes-no-name/fix.diff ojs omp ops`,
  the same script, then `revert` with the same arguments. No request
  failed and no page script failed in any run, with or without the fix.
- Tips: `main`: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; the three files the fix touches are
  identical in both). `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS
  cf4fce69bd, lib/pkp a9c76aed62.
- 3.4 (code): pkp-lib `stable-3_4_0` df13621c2d, the same template line;
  `UserGroupGridHandler.php` line 147 gives the stage columns the
  template, and `UserGroupGridCellProvider.php` returns only `selected`
  and `disabled`. OJS `stable-3_4_0` 9571d8fde7, OMP 0aec65441f, OPS
  acd8ae704b.
- 3.3 (code): pkp-lib `stable-3_3_0` d446601ebe, the same template line;
  `UserGroupGridHandler.inc.php` line 136 and
  `UserGroupGridCellProvider.inc.php` lines 50-51 the same.
  OJS `stable-3_3_0` 9fdb9bcf9a, OMP 8e72fc8836, OPS c5532e2161.
- Introduced: `git blame` on the input line gives 1c3f73a240
  (2016-02-26), which added the form-field `name` and `value` attributes
  and no label; the input came into pkp-lib without a label in
  34f6c72a3a ("Move status grid cell into pkp-lib", 2012-10-16), moved
  from the apps.
- Not driven: a real screen reader. The accessible names were read from
  Chromium's accessibility tree, which is what a screen reader receives;
  whether a given reader adds the column heading ("Submission") depends
  on its table-header setting and stays unverified. The other grids
  under Cause, apart from the plugins list, were read in the code only.
