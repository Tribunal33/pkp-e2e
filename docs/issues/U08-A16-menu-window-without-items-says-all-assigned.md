# With every navigation menu item removed, "Add Menu" says to drag items and that all items are assigned

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ui-library#766` for `pkp/pkp-lib#12177` · [eeebc65bb6](https://github.com/pkp/ui-library/commit/eeebc65bb643a58b385d4507a73e9874527bd948) · 2026-01-22 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U08 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U08-navigation-menus-and-site-chrome.md#a16)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a journal whose items have all been removed, "Add Menu" shows "No
items assigned to this menu. Drag items from Unassigned Menu Items."
beside "All items have been assigned.". The first sends the manager to
a panel with nothing to drag; the second says items were assigned when
none exist.

## Impact

- **Lost.** Nothing. A menu with no items can still be saved from the
  window, since the save checks only its title and area (from the code).
  Only the two texts are wrong, while the page behind the window, the
  "Navigation Menu Items" table, reads "No Navigation Menu Items". A
  menu's "Edit" shows the same two texts once its items are gone (from
  the code).
- **Who.** A journal, press or server manager, or the site
  administrator on the site's own Navigation tab, after removing every
  navigation menu item. A rare state: an install starts with sixteen or
  seventeen items.
- **Way round.** Close the window, create items with "Add item", and
  open the menu window again.

Low: two wrong texts in a rarely met state, while the menu still saves.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS, context
  `publicknowledge`.

Steps:

1. Sign in as `rvaca` (the journal manager; on OMP the press manager,
   on OPS the preprint server manager).
2. Open Settings › Website, tab "Setup", side tab "Navigation"
   (`/index.php/publicknowledge/en/management/settings/website#setup/navigationMenus`).
3. In "Navigation Menu Items", press the arrow at the left of the first
   row, then "Remove", then "OK" in "Are you sure you wish to delete
   this item?".
4. Repeat step 3 until "Navigation Menu Items" holds no row (17 items on
   OJS, 16 on OMP and OPS).
5. Under "Navigation", press "Add Menu".

**Expected.** Neither panel invites a drag or says items were assigned:
both say there is nothing to show, as the panel does by default ("No
items found."), or the window points to "Add item".

**Observed.** The two panels of the "Add Menu" window read:

```
Assigned Menu Items                        Unassigned Menu Items
No items assigned to this menu.            All items have been assigned.
Drag items from Unassigned Menu Items.
```

Both texts are right when items exist: with one item left ("Contact"),
"Add Menu" lists it under "Unassigned Menu Items" beside "No items
assigned…", and once it is dragged left the right panel reads "All
items have been assigned.".

## Cause

`NavigationMenuEditor.vue` (pkp/ui-library,
`src/components/NavigationMenuEditor/`) gives each of its two
`MenuTreePanel`s a fixed empty text: the assigned panel gets
`manager.navigationMenu.noAssignedItems` and the unassigned panel
`manager.navigationMenu.noUnassignedItems`, unless the caller passes
its own `assignedEmptyMessage` or `unassignedEmptyMessage`. The one
caller, `NavigationMenuManagerField.vue`, passes neither. Each text is true only
when the other panel holds items: "Drag items from Unassigned Menu
Items." needs unassigned items, and "All items have been assigned."
needs assigned ones. With no item at all both panels are empty, so both
texts show, and both are false. The panel cannot tell this case apart;
only the editor sees both lists.

The texts came with the Vue rewrite of the menu window
(`pkp/pkp-lib#12177`, "without changing how it works for users"). The
legacy window it replaced (`navigationMenuForm.tpl`, still used on 3.5,
3.4 and 3.3) has no empty texts and shows two blank panels in this
state.

Reach:

- A menu's "Edit" window: the same editor, with the menu's items
  (`GET navigationMenus/{id}/items`); with no items left, the same two
  texts. Checked in the code.
- The site's own Navigation tab (Administration › Site Settings, shown
  once a second context exists): the same grid opens the same window
  for the site's items. Checked in the code.
- OJS, OMP and OPS share the editor through ui-library, at the same file
  content on the three `main` tips. Walked.
- The same mistake elsewhere: no other component passes
  `MenuTreePanel` an empty text, and no other locale text in pkp-lib or
  the apps says "have been assigned" or "Drag items from" of a list.
  Checked in the code.

## Proposed fix

In `NavigationMenuEditor.vue`, pass neither text when both lists are
empty, so each panel falls back to its own default,
`common.noItemsFound` "No items found." (`MenuTreePanel.vue`:
`emptyMessage || t('common.noItemsFound')`). This is a proposal:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/fix.diff),
one file in ui-library that covers the three apps.

```diff
-				:empty-message="
-					assignedEmptyMessage || t('manager.navigationMenu.noAssignedItems')
-				"
+				:empty-message="assignedPanelEmptyMessage"
…
-				:empty-message="
-					unassignedEmptyMessage ||
-					t('manager.navigationMenu.noUnassignedItems')
-				"
+				:empty-message="unassignedPanelEmptyMessage"
…
+const hasNoItems = computed(
+	() => assignedItems.value.length === 0 && unassignedItems.value.length === 0,
+);
+
+const assignedPanelEmptyMessage = computed(() => {
+	if (hasNoItems.value) {
+		return '';
+	}
+	return (
+		props.assignedEmptyMessage || t('manager.navigationMenu.noAssignedItems')
+	);
+});
```

(`unassignedPanelEmptyMessage` the same with the unassigned prop and
key.) It reads the editor's own `assignedItems` and `unassignedItems`;
wherever an item exists, the two texts, and a caller's own
`assignedEmptyMessage` or `unassignedEmptyMessage`, stay as they are.

Tried on `main`, OJS, OMP and OPS. With the fix, step 5 shows "No items
found." in both panels. With one item left ("Contact"), "Add Menu"
still reads "No items assigned to this menu. Drag items from Unassigned
Menu Items." beside the item, and once the item is dragged left the
right panel still reads "All items have been assigned.", as without the
fix.

**Alternatives**

- A new text for this state ("There are no navigation menu items yet.
  Create them with "Add item" under Navigation Menu Items."): more
  helpful, but it needs a new key in pkp-lib's `locale/en/manager.po`
  and its translations, a second repo for a rare state. If the team
  prefers it, the key replaces the diff's `''` in ui-library and is
  added to pkp-lib.
- Show the window's panels only when the context has items: a larger
  change to the manager form for the same result.

**What goes with it**

- No stored data, API or plugin hook is touched.
- Backport: none needed; 3.5 and older use the legacy window, which
  has no such text.
- Guard: a story with two empty lists in
  `NavigationMenuEditor.stories.js`, or a ui-library unit test of
  `NavigationMenuEditor`; here, a Planned item in spec U08 (Rule 4)
  that reads both panels of "Add Menu" with no item.

Small: a few lines in one ui-library component, tried on all three
apps, with no new string and no stored data involved.

## Evidence

- A Playwright script that runs the Steps on installs loaded from PKP's
  default test dataset, all three apps in one run:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/walk.js`.
  It removes every item through the "Remove" control, opens "Add Menu"
  and records each panel's heading, items and text. `neighbour` as the
  script's argument runs the neighbour check alone: every item but
  "Contact" removed, "Add Menu" read, "Contact" dragged to "Assigned
  Menu Items", both panels read again.
- The fix, tried 2026-10-03 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/menu-window-without-items-says-all-assigned/fix.diff ojs omp ops`
  (which rebuilds the JavaScript), then walk.js and walk.js `neighbour`
  with the command above, each on a freshly loaded install, then
  `revert` and walk.js `neighbour` again.
- Walked 2026-10-03 on PostgreSQL (the texts are chosen in the browser;
  the database plays no part), each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OJS b84f8e2e44 (lib/ui-library 64d67363), OMP 3b0ecf794c
    (lib/ui-library 280f98c5), OPS c8af945bb7 (lib/ui-library 280f98c5).
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335). The same steps; "Add Menu" opens the legacy
    window, whose two panels are blank, with no text. In the code,
    `navigationMenuForm.tpl` prints only the panel headings and the
    item lists, and pkp-lib's `manager.po` there has neither key.
- 3.4, by code: OJS `stable-3_4_0` at c1827e3527, OMP at 0aec65441f, OPS
  at acd8ae704b, pkp-lib `stable-3_4_0` at 9e41f10273: the same legacy
  `navigationMenuForm.tpl` (no empty text, no override in the apps), and
  ui-library `stable-3_4_0` (ee684b34) has no `NavigationMenuEditor`.
- 3.3, by code: OJS `stable-3_3_0` at ac77c9fb35, OMP at 8e72fc8836, OPS
  at c5532e2161, pkp-lib `stable-3_3_0` at ac3fa73402: the same.
- Saving a menu with no items, from the code (not driven):
  `PKPNavigationMenuController::validateNavigationMenu()` checks only
  the title and the area, and `add()` and `edit()` store the menu tree
  only when one is sent. A menu's "Edit" with no items left, from the
  code: `getAssignedItemsTree()` and `getUnassignedItems()` then both
  return empty lists, which the same editor shows.
- Introduced: `git blame` on the two `:empty-message` bindings gives
  eeebc65bb6 alone, the commit of `pkp/ui-library#766`. The keys were
  added to pkp-lib by e0a5aa2b02, `pkp/pkp-lib#12178`, the same author
  and issue.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched 2026-10-03
  for "All items have been assigned", "Unassigned Menu Items", "Drag
  items from", "navigation menu no items empty unassigned", "navigation
  menu empty", `noUnassignedItems` and `NavigationMenuEditor`, and the
  follow-up `pkp/pkp-lib#12295` read: none covers the empty state.
