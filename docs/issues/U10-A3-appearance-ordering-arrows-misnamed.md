# Screen readers misname the masthead's up arrows and every Sidebar box; clicking a role's name moves it

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the Sidebar boxes only, no masthead list)
  - 3.3: OJS, OMP, OPS (code; the Sidebar boxes only, no masthead list)
- **Introduced** the Sidebar boxes: `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2c4](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr); the masthead list: `pkp/ui-library#331` for `pkp/pkp-lib#9736` · [b2d1d06511](https://github.com/pkp/ui-library/commit/b2d1d065111b268a113134e0196fc3aa84c4ae0f) · 2024-02-15 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Website › Appearance › "Editorial Masthead", each role's
up arrow should be named "Increase position of {role}", but a screen
reader announces it as "{role} Decrease position of {role}". The down
arrow is named correctly, "Decrease position of {role}", so both arrows
say "Decrease" and a manager ordering the masthead by ear cannot tell
which one moves a role up. Under "Setup" › "Sidebar", each block's tick
box is announced as "{block} Increase position of {block} Decrease
position of {block}" instead of the block's name alone.

For sighted managers, parts of each row pass their clicks to the wrong
control. A click on a role's name in the "Editorial Masthead" list moves
that role up one place. A click on a block's drag handle, without
dragging, ticks or unticks the block's box.

The masthead list shows while "Present a masthead based on user
enrollments" is ticked, as it is on a new journal, press or preprint
server, and the site-wide "Sidebar" list has the same fault.

## Impact

- **Lost**: the right names of the masthead's up arrows and the Sidebar
  boxes, for screen reader users. A sighted user who clicks a role's name
  or a block's handle gets an unasked-for move or tick, which shows on
  screen at once. Nothing is stored until "Save".
- **Who**: managers of a journal, press or preprint server (and other
  roles allowed into Website settings) who order the masthead roles or
  place sidebar blocks, with a screen reader, or with the mouse on a
  role's name or a block's handle; the site administrator, for the
  site-wide "Sidebar" list on a site with more than one journal, press
  or server.
- **Way round**: in each masthead row the up arrow comes first and the
  down arrow second. A screen reader user who presses one can read the
  list again and undo a wrong move with the other arrow, or leave
  without "Save". A Sidebar box's name opens with the block's name, so a
  listener knows which block the box places and can skip the arrow texts
  that follow. A sighted user sees the move or the tick at once and
  undoes it with the other arrow, by clicking the box again, or by
  leaving without "Save".

Low: nothing is lost and the task gets done, because every unwanted
change is visible or can be checked by reading the list again before
"Save". It would be medium if a wrong move were saved at once, or if the
two arrows could not be told apart by their order in the row.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). In it
  "Present a masthead based on user enrollments" is ticked, so the
  "Editorial Masthead" tab shows the list of roles, and no sidebar block
  is placed.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

The masthead list:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Website" › "Appearance" and choose the side tab
   "Editorial Masthead"
   (`/index.php/publicknowledge/en/management/settings/website#appearance/appearance-masthead`).
3. Read the names of the up and down arrows of the first two roles
   ("Journal editor" and "Section editor" on OJS, "Press editor" and
   "Series editor" on OMP, "Moderator" and "Editorial Board Member" on
   OPS).
4. Click the second role's name.

The Sidebar list:

5. Reload the page (nothing was saved), choose the side tab "Setup" and
   scroll to "Sidebar".
6. Read the name of the first block's tick box ("Web Feed Plugin") and
   of its two arrows.
7. Click the first block's drag handle (the icon at the row's start)
   without dragging.

**Expected.** Each up arrow is named "Increase position of {role or
block}" and each down arrow "Decrease position of {role or block}", as
their hidden texts read. Each Sidebar box is named by its block alone:
"Web Feed Plugin". Clicking a role's name or a block's handle changes
nothing.

**Observed.** The same on the three apps:

- Step 3: the up arrow of "Journal editor" is named "Journal editor
  Decrease position of Journal editor" (its hidden text reads "Increase
  position of Journal editor"). The down arrow is named "Decrease
  position of Journal editor". The second role's arrows are the same.
- Step 4: the role moves up one place. "Section editor", "Journal
  editor", "Editorial Board Member" on OJS; "Series editor", "Press
  editor", "Editorial Board Member" on OMP; "Editorial Board Member",
  "Moderator" on OPS. In the code, a click on the row's drag handle or
  its empty space does the same (not walked).
- Step 6: the box is named "Web Feed Plugin Increase position of Web Feed
  Plugin Decrease position of Web Feed Plugin". Its arrows are named
  correctly: "Increase position of Web Feed Plugin" and "Decrease
  position of Web Feed Plugin". The other blocks' boxes are the same.
- Step 7: the "Web Feed Plugin" box is ticked.

## Cause

`lib/ui-library/src/components/Form/fields/FieldOptions.vue` draws each
option as one `<label class="pkpFormField--options__option">`. When the
field is `isOrderable`, that `<label>` holds the option's box, its text
and the `Orderer`: the drag handle and the up and down `<button>`s, each
with a hidden text "Increase position of {itemTitle}" or "Decrease
position of {itemTitle}".

A `<label>` without `for` labels its first labelable descendant. That
control's accessible name is then the label's whole text, leaving out
only the control's own text. A click anywhere on the label, except on
another interactive element, is passed on to that control. HTML does not allow a second
labelable element, such as a button, inside a label.

- On "Sidebar" the box is the labelled control. So its name takes in both
  arrows' hidden texts. The drag handle is a plain `<span>` inside the
  label, so a click on it toggles the box.
- On "Editorial Masthead" the field is `allowOnlySorting`, which leaves
  out the box. The first labelable element in the label is then the up
  `<button>`. A button that has a label is named by the label, not by
  its own hidden text. So the up arrow's name is the role's name plus
  the down arrow's hidden text. A click on the role's name, the drag
  handle or the row's empty space is passed on to the up button, which
  moves the role (`optionOrderUp`).

The `Orderer` went into the label with the first forms implementation
(7496b3c2c4, `pkp/pkp-lib#3594`). `allowOnlySorting` (b2d1d06511,
`pkp/pkp-lib#9736`, the masthead roles' ordering) wrapped the box in a
`v-if`, but kept the label around the row.

Reach:

- Settings › Website › Appearance › "Setup" › "Sidebar"
  (`PKPAppearanceSetupForm`; walked).
- Settings › Website › Appearance › "Editorial Masthead"
  (`PKPAppearanceMastheadForm`; walked).
- Administration › Site Settings › Appearance › "Setup" › "Sidebar"
  (`PKPSiteAppearanceForm`, `isOrderable`; code: the tab shows only on a
  site with more than one journal, press or server).
- The other `Orderer` callers (the Contributors, Highlights and Catalog
  lists) put it in a list item's actions slot, outside any label (code).

## Proposed fix

Recommended (a proposal; the team decides): keep only the box and its
text in the `<label>`, and put the `Orderer` beside it in a row of its
own
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/appearance-ordering-arrows-misnamed/fix.diff),
in `lib/ui-library`). On the masthead list (`allowOnlySorting`) there is
no box to label, so there the role's name goes in a `<div>` instead of a
`<label>`. An excerpt; the diff also re-indents the lines between and
adds a comment saying why the arrows sit outside the label:

```diff
-				<label
+				<div
 					v-for="option in localizedOptions"
 					:key="option.value"
-					class="pkpFormField--options__option"
+					class="pkpFormField--options__optionRow"
 				>
+					<component
+						:is="allowOnlySorting ? 'div' : 'label'"
+						class="pkpFormField--options__option"
+					>
 						…the box and the option's text, unchanged…
+					</component>
 					<Orderer
 						v-if="isOrderable"
 						…
 					/>
-				</label>
+				</div>
…
+.pkpFormField--options__optionRow {
+	position: relative;
+
+	+ .pkpFormField--options__optionRow {
+		margin-top: 0.5rem;
+	}
+}
```

The row is the arrows' positioning context, as the label was, so the
list looks the same. The box and its name still share one label, so a
click on a block's name still ticks its box. This follows the other
`Orderer` callers, which put the arrows beside the item's content rather
than inside it.

Tried on `main` on the three apps. Every up arrow is now named
"Increase position of {role}", and every Sidebar box by its block alone
("Web Feed Plugin"). Clicking a role's name or a block's handle changes
nothing. Unchanged by the fix:

- the arrows still move roles and blocks, and "Save" keeps the new order
  after a reload;
- a click on a block's name still ticks its box;
- dragging a block by its handle still moves it;
- the masthead's option boxes ("Present a masthead based on user
  enrollments", and on a journal or press "Enable listing of reviewers
  on the masthead") keep their names.

**Alternatives**

- Name the box with `aria-labelledby` on its text, and the arrows with
  `aria-label`: the names come out right, but the label still passes
  clicks on a role's name and on the handle to its control. The buttons
  also stay inside a label, which HTML does not allow.
- Drop the label only in `allowOnlySorting` mode: fixes the masthead,
  leaves every Sidebar box misnamed.

**What goes with it**

- Every `FieldOptions` gets one wrapper `<div>` per option. The label
  keeps `pkpFormField--options__option`, so the existing styles and
  selectors still match it: `FieldShowEnsuringLink`'s
  `.pkpFormField--options__option button`, and pkp-lib's Cypress
  command that clicks a `.pkpFormField--options__optionLabel`. Only a
  test that looks for the arrows inside the label must look in the row.
- Other instances of a control inside a `<label>`, left out:
  `FieldShowEnsuringLink`'s option sentence holds a button on purpose,
  and `SideMenu/SideMenuSearch.vue` puts its "clear search" button inside
  the search box's label (code only, not walked).
- 3.5's template differs from `main`'s only in the option's text (one
  `<span>`, without `main`'s sub-label lines), so the same change applies
  there with an adapted diff. 3.4 and 3.3 have the
  same `<label>` with `<orderer>` inside it, and only the Sidebar lists
  use it.
- No data or API change.
- Guard: an end-to-end check that reads the names of the masthead's
  arrows and of the Sidebar boxes (spec U10).

Small: one ui-library component (its template and one style rule).

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/appearance-ordering-arrows-misnamed/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03) and reads each name from Chromium's accessibility
  tree (CDP `Accessibility.getPartialAXTree`). No screen reader was run.
  Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/appearance-ordering-arrows-misnamed/walk.js`;
  `MODE=nb` in front runs the neighbour check alone.
- Tips walked, on PostgreSQL (the fault does not depend on the database):
  - main: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library 64d67363),
    OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5). `FieldOptions.vue` is identical in both ui-library tips.
  - 3.5: OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c, OPS
    38b61882d3 (lib/pkp cf3f984335); lib/ui-library d4e01883 in all
    three. The same Steps on the same screens show the same names and the
    same moves.
- Code reads:
  - main: blame on `FieldOptions.vue` lands on formatting commits for
    the `<label>` line (1333f0bd8, prettier) and the `<Orderer` line
    (9ed5c60f4, `<orderer>` renamed `<Orderer>`); the `</label>` after
    the `Orderer` is 7496b3c2c4's. b2d1d06511 was authored by Jarda
    Kotěšovec, and its PR `pkp/ui-library#331` opened by Bozana Bokan
    (merged 2024-03-20). pkp-lib `schemas/context.json` gives
    `enableEnrollmentMasthead` the default `true`, so a new context has
    the masthead list.
  - 3.4 (ui-library ee684b34; pkp-lib 767353f4fe; OJS d68934d0d1, OMP
    0aec65441, OPS acd8ae704b) and 3.3 (ui-library 96959f9e; pkp-lib
    ac3fa73402; OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161):
    `FieldOptions.vue` wraps the box, its text and `<orderer>` in one
    `<label>`, and `Orderer.vue` writes the same hidden texts.
    `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm` set `isOrderable`;
    `PKPAppearanceMastheadForm` does not exist there.
- Fix trial: `bin/try-fix.js apply` of fix.diff on the three apps, the
  script and `MODE=nb` each on a fresh dataset, `MODE=nb` again after
  `revert`.
- Searched: pkp/pkp-lib, pkp/ojs and pkp/ui-library for masthead and
  sidebar ordering with screen reader or accessibility, "Increase
  position of", "Decrease position", `FieldOptions` orderer or label,
  `Orderer`, `allowOnlySorting`. `pkp/pkp-lib#7046` (open, form group
  legends not read) is another fault. The other ordering arrows already
  reported have other causes:
  [U46-A5-ordering-arrows-unnamed.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U46-A5-ordering-arrows-unnamed.md)
  (no names at all, `TableCellOrder.vue`) and
  [U70-A14-catalog-ordering-arrows-name-undefined.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U70-A14-catalog-ordering-arrows-name-undefined.md)
  (a missing title, `CatalogListItem.vue`).
- Not driven: a real screen reader; the site-wide "Sidebar" list (code);
  a click on a masthead row's handle or empty space (code);
  dragging a role or a block with the keyboard; 3.4 and 3.3.
