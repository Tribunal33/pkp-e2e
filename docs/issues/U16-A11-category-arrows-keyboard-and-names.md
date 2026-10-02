# On the Categories tab, keyboard users cannot open a category's sub-categories, and the arrows are misnamed

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (the Categories tab is the older list, with no arrows)
  - 3.4: none (code; the older list)
  - 3.3: none (code; the older list)
- **Introduced** `pkp/ui-library#550` for `pkp/pkp-lib#10449` · [b35c06bc8b](https://github.com/pkp/ui-library/commit/b35c06bc8b87fa5aa6845ba52432efacd46c9a4b) · 2025-05-12 · Taslan A. Graham (taslangraham); the name that never changes from `pkp/ui-library#620` · [e85a63e477](https://github.com/pkp/ui-library/commit/e85a63e4778a25c451d81459ee2bc8ffbf6e335f) · 2025-06-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a11)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Settings › Journal (Press, Server) › "Categories", a manager opens a
category's row with the arrow at its right end to reach its
sub-categories. The arrow works only with a mouse: Tab reaches it, but
Enter and Space do nothing. For a screen reader its name is "Expand
sub-categories" whether the row is open or closed. Rows with no
sub-categories also carry an arrow, invisible and named the same: Tab
stops on it, and it does nothing.

A manager who works from the keyboard cannot reach a sub-category's row
on the tab, so cannot edit or delete it, or add a category under it.
A screen reader user is also told the wrong thing about each arrow.

The "Select Categories" window has the same arrows. It opens from the
"Categories" field of the dashboard's "Filters", of a submission's
publication pages and of the submission wizard's "For the Editors" step.
There every row with sub-categories is open when the window opens, so a
keyboard user can still tick any category. But a row closed
with the mouse cannot be opened again from the keyboard, and every arrow
is named "Collapse", open or closed.

## Impact

- **Lost**: no data. A manager without a mouse cannot open a
  sub-category's "More Actions" menu ("Edit", "Add", "Delete Category")
  on the tab.
- **Who**: on `main`, managers who work from the keyboard (screen reader
  users among them), on any journal, press or preprint server with
  sub-categories; in the "Select Categories" window also editors, and
  authors when the wizard asks for categories.
- **Way round**: none for the tab; only a mouse opens its rows. The
  window does not stand in for it: it only chooses categories for a
  submission or a filter. That still works from the keyboard, because
  its rows start open and the "Categories" field's own text box offers
  every category, sub-categories included, by typed name.

Medium: for keyboard users the tab's sub-categories cannot be reached at
all. It is not higher because mouse users are not affected; it is not
lower because the task fails for those users rather than only reading
badly.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its
  categories include "Applied Science", with "Computer Science" and
  "Engineering" under it. Nothing else is needed.
- Chrome's accessibility inspector to read a control's name: inspect the
  control, then Elements › Accessibility › "Computed Properties" ›
  "Name".

The tab:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal's (press's,
   preprint server's) manager.
2. Open "Settings" › "Journal" ("Press", "Server") and press the
   "Categories" tab
   (`/index.php/publicknowledge/en/management/settings/context`). Only
   "Applied Science" and "Social Sciences" show.
3. Press Tab until the focus is on the "Applied Science" row's "More
   Actions", then press Tab once more. The focus moves to the row's arrow.
4. Press Enter, then press Space.
5. Read the arrow's name.
6. Click the arrow with the mouse, then read its name again.
7. In the "Engineering" row (no sub-categories), press Tab from its "More
   Actions" and read what has the focus.

The "Select Categories" window:

8. Open "Submissions" (the dashboard) and press "Filters".
9. Under "Categories", press "Select Categories".
10. Read the "Applied Science" arrow's name, click it with the mouse, and
    read its name again.
11. Press Enter on the same arrow.
12. Read the name of the "Sociology" row's arrow (no sub-categories).

**Expected.** Enter or Space on an arrow opens and closes its row as a
click does. The name says what pressing does: "Expand sub-categories"
while the row is closed, "Collapse sub-categories" while it is open (in
the window, "Expand" and "Collapse"). A row with nothing under it has no
arrow.

**Observed.** The same on the three apps:

- Step 4: nothing opens. The tab still shows only "Applied Science" and
  "Social Sciences".
- Steps 5 and 6: the arrow is named "Expand sub-categories" before and
  after the click. The click opens the row ("Computer Science" and
  "Engineering" show).
- Step 7: the focus lands on a button 0 × 0 pixels in size, with no icon,
  named "Expand sub-categories":
  ```html
  <button data-cy="category-manager-toggle-sub-categories"><!----> <span class="sr-only">Expand sub-categories</span></button>
  ```
- Step 10: the arrow is named "Collapse" with the row open, and still
  "Collapse" after the click closed it.
- Step 11: nothing opens; "Computer Science" and "Engineering" stay
  hidden.
- Step 12: an invisible button named "Collapse".

No request failed and the browser logged no error.

## Cause

Both lists draw the arrow with one shared component,
`lib/ui-library/src/components/Table/TableCellTreeExpand.vue`. It has
two mistakes.

The click handler sits on the icon, not on the button. The template is
`<button><Icon v-if="isDisplayed" … @click="emit('toggle', itemId)" />
<span class="sr-only">…</span></button>`. A mouse click lands on the
icon and opens the row. Enter and Space fire `click` on the button
itself, where nothing listens. Because the `v-if` is on the icon and not
on the button, every row with nothing under it keeps an empty button
with its hidden text. Both date from the component's first version
(b35c06bc8b, then `CategoryCellToggleSubCategories.vue`).

The name is read from `props.isExpanded.value`. `isExpanded` is a
boolean prop, not a ref, so `.value` is always `undefined` and the
`collapseLabel` branch is always taken. The first version read a
computed ref of its own there, and its name changed with the row.
e85a63e477 moved the component to `TableCellTreeExpand.vue`, so the
"Select Categories" window could use it, made the labels props, and kept
`.value`. The moved code also shows `expandLabel` while the row is open:
with no labels passed (the window), an open row would read "Expand" once
`.value` is gone. `CategoryTreeRow.vue` makes up for it by passing
"Collapse sub-categories" as `expand-label`.

Reach (every user of the component):

- Settings › Categories, `CategoryTreeRow.vue` (walked, three apps).
- The "Select Categories" window, `VocabularyTableRows.vue`, opened from
  the dashboard's "Filters" (`PKPSubmissionFilters`; walked, three apps),
  the publication pages ("Publication Settings", "Catalog Entry",
  "Preprint entry"; OJS and OPS `IssueEntryForm`, OMP `CatalogEntryForm`;
  code) and the submission wizard's "For the Editors" step ("For
  Readers" on a preprint server; `ForTheEditors::addCategoryField()`,
  shown when Settings › Workflow › Submission › Metadata has "Yes, add a
  categories field to the submission wizard." and the context has
  categories; off in the default dataset; code).
- The publication's structured references,
  `CitationManagerCellToggle.vue` (code; not walked): the same keyboard
  failure, and a name that never changes from "Collapse".

## Proposed fix

Recommended (a proposal; the team decides): put the handler and the
`v-if` on the button, mark it `type="button"`, read the prop directly,
and give each label the state it names
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-arrows-keyboard-and-names/fix.diff),
in `lib/ui-library`):

```diff
-			<button data-cy="category-manager-toggle-sub-categories">
+			<button
+				v-if="isDisplayed"
+				type="button"
+				data-cy="category-manager-toggle-sub-categories"
+				@click="emit('toggle')"
+			>
 				<Icon
-					v-if="isDisplayed"
 					class="h-6 w-6 cursor-pointer text-primary"
 					:icon="isExpanded ? 'Dropup' : 'Dropdown'"
 					:aria-hidden="true"
-					@click="emit('toggle', itemId)"
 				/>
…
 const toggleText = computed(() =>
-	props.isExpanded.value
-		? props.expandLabel || t('list.expand')
-		: props.collapseLabel || t('list.collapse'),
+	props.isExpanded
+		? props.collapseLabel || t('list.collapse')
+		: props.expandLabel || t('list.expand'),
 );
```

`CategoryTreeRow.vue` then passes the labels by their own names
(`expand-label` "Expand sub-categories", `collapse-label` "Collapse
sub-categories") and `!!category.subCategories?.length` to the boolean
`is-displayed`, as `VocabularyTableRows.vue` already does. This is the
pattern of ui-library's `Expander.vue` (the DOI list's rows): the
handler on the `<button>`, a hidden text that follows the state. The
table cell stays on every row, so the columns still line up.
`itemId` was never defined in the component, and every listener ignores
the argument. `type="button"` keeps the shared cell from submitting a
form if a caller ever draws the table inside one (a `<button>` is a
submit button by default); none does today.

Tried on `main` on the three apps: Enter and Space now open and close the
tab's rows, the name follows the row ("Expand sub-categories" /
"Collapse sub-categories", in the window "Expand" / "Collapse"), and rows
with nothing under them have no arrow. What a mouse does did not change,
and neither did the tab's column headings or a tick and "Save" in the
window.

**Alternatives**

- Keep one unchanging name and add `aria-expanded`: also correct, but the
  component and its callers already carry two labels. With both, a
  screen reader would say the state twice ("Collapse sub-categories,
  expanded").
- Keep the move's convention and swap only the fallbacks: fixes the
  names too, but leaves `expand-label` meaning "the label while
  expanded", the confusion that started it.

**What goes with it**

- pkp-lib's Cypress command `toggleSubCategories`
  (`lib/pkp/cypress/support/commands.js`) clicks the same `data-cy`
  button. Its callers open only rows with sub-categories, which keep the
  button.
- Guard: an end-to-end check that opens a row from the keyboard and reads
  the arrow's name before and after (a Planned item in spec U16).

Small: two files in ui-library following an existing pattern, with no
data or API change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js).
  It takes the Steps as `rvaca` on PKP's default dataset (pkp/datasets
  e8dafbc, 2026-10-02) and reads names from Chromium's accessibility
  tree (CDP `Accessibility.getPartialAXTree`). Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js`.
  With `nb` as its argument it checks what the fix must leave alone: a
  mouse still opens and closes rows, the column headings, and a tick and
  "Save" in the window.
- Tips walked, on PostgreSQL (the fault does not depend on the database):
  - main: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; ui-library
    64d67363 (OJS) and 280f98c5 (OMP, OPS), with the same files in both.
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3; ui-library
    d4e01883. The tab is the older list
    (`CategoryCategoryGridHandler`), and the Filters field has no
    "Select Categories" button; the walk found neither.
- Code reads:
  - main: the files the Cause names; every importer of
    `TableCellTreeExpand.vue` (three); the window's openers in Reach.
  - 3.5, 3.4, 3.3: ui-library `stable-3_5_0` (d4e01883),
    `stable-3_4_0` (ee684b34) and `stable-3_3_0` (96959f9e) have no
    `TableCellTreeExpand`, `CategoryManager` or `VocabularyModal`;
    pkp-lib `stable-3_4_0` and `stable-3_3_0` draw the tab with
    `CategoryCategoryGridHandler`.
- Upstream: nothing found in pkp/pkp-lib or pkp/ui-library (2026-10-02).
  In `pkp/ui-library#704` (structured citations) a reviewer pointed to
  `TableCellTreeExpand` as a component that handles the icon's
  accessibility.
- Step 12 was read in a second walk on a freshly loaded dataset: the
  first read the "Engineering" row's arrow after step 10 had closed
  "Applied Science" and hidden it.
- Not driven: a real screen reader; the publication pages, the wizard
  step and the structured references (code only); 3.4 and 3.3.
- Unverified: a screen reader's own activation in browse mode was not
  tried. Keyboard Enter and Space were, and did nothing.
