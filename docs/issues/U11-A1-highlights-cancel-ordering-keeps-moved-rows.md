# Highlights list: "Cancel" in ordering mode keeps the moved rows, and the next "Save Order" saves them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS (code; the Highlights tab is off unless `[features] highlights = On` is added to `config.inc.php`)
  - 3.3: none (code; no highlights)
- **Introduced** `pkp/ui-library#288` for `pkp/pkp-lib#9262` · [0abe290a](https://github.com/pkp/ui-library/commit/0abe290a00a12a22927ade7c379fb446af3b9ee8) · 2023-10-12 · Nate Wright (NateWr); on 3.4 the same code came with `pkp/ui-library#285`
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U11 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A manager who moves highlights with the arrows in ordering mode and then
presses "Cancel" expects the list to go back to the saved order. Instead
the list leaves ordering mode with the rows still where the arrows put
them. No notice says the moves were discarded, and the home page keeps
the saved order.

The list keeps showing the discarded order until the page is reloaded.
The next time the manager presses "Order", ordering mode starts from it,
and "Save Order" saves it to the home page, even when nothing was moved
that time. The same happens after a "Save Order" the server refuses: the
moved rows stay on the list as if they had been saved.

## Impact

- **Lost**: nothing at once; the saved order is kept. A later "Save
  Order" can store an order the manager had cancelled, but the list shows
  that order before the save.
- **Who**: journal, press and server managers who reorder highlights on
  Settings › Website › Setup › Highlights and then change their mind. The
  carousel is the first block of the home page, right under the header,
  and shows one slide at a time, so the order decides which highlight
  visitors see first.
- **Way round**: reload the page after "Cancel"; the list then shows the
  saved order.

Low: the cancel itself saves nothing, and the later save stores the
order the list shows at that moment, so the manager is misled but
nothing is lost unseen. It would be medium if a cancelled order could
reach the home page without the manager seeing it on the list first.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS; the context
  `publicknowledge`). It holds no highlights; the steps add three.

Setting up:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Website, tab "Setup", side tab "Highlights"
   (`/index.php/publicknowledge/en/management/settings/website`).
3. Press "Add Highlight"; type "u11a First" in "Title",
   "https://example.org/first" in "URL" and "Read more" in "Button
   Label"; press "Save".
4. Add "u11a Second" (https://example.org/second) and "u11a Third"
   (https://example.org/third) the same way. The list reads "u11a First",
   "u11a Second", "u11a Third".

Cancelling a reorder:

5. Press "Order". "Save Order" and "Cancel" replace "Order", and each row
   shows an up and a down arrow.
6. Press the up arrow on "u11a Third" ("Increase position of u11a Third")
   twice. The list reads "u11a Third", "u11a First", "u11a Second".
7. Press "Cancel".
8. Reload the page and open the "Highlights" side tab again; open the
   journal's home page in a private window.

The cancelled order saved later:

9. Press "Order", press the up arrow on "u11a Third" twice, and press
   "Cancel".
10. Press "Order", then "Save Order" without moving anything.
11. Reload the page and open the "Highlights" side tab again; open the
    home page in a private window.

**Expected**: after step 7 the list leaves ordering mode and reads "u11a
First", "u11a Second", "u11a Third", the saved order. In step 10 ordering
mode starts from that order, so "Save Order" changes nothing, and after
step 11 the list and the carousel still read First, Second, Third.

**Observed**: after step 7 the list leaves ordering mode ("Order",
"Edit" and "Delete" are back) but reads "u11a Third", "u11a First",
"u11a Second". After step 8 the list and the home page's slides read
"u11a First", "u11a Second", "u11a Third": nothing was saved. In step 10
ordering mode opens on "u11a Third", "u11a First", "u11a Second", and
"Save Order" stores that order:

```
POST /index.php/publicknowledge/api/v1/highlights/order  (X-Http-Method-Override: PUT) → 200
sequence[0][id]=3&sequence[0][sequence]=0&sequence[1][id]=1&sequence[1][sequence]=1&sequence[2][id]=2&sequence[2][sequence]=2
```

After step 11 the list and the carousel read "u11a Third", "u11a First",
"u11a Second".

A refused save, after step 4 instead of steps 5 to 11: press "Order" and
move "u11a Third" to the top; in a second window of the same browser,
delete "u11a Second" on the same tab; back in the first window, press
"Save Order". The server answers 400 and the dialog reads "Error / An
unexpected error has occurred. Please reload the page and try again.";
after "OK" the list reads "u11a Third", "u11a First", "u11a Second" with
"Order" back, as if the order had been saved.

Control: "Order", the same two moves and "Save Order" save the moved
order, which a reload and the home page then show.

## Cause

ui-library's `HighlightsListPanel.vue` keeps no copy of the order it had
when ordering mode began. `orderUp()` and `orderDown()` do not move rows
in a working copy: they build the moved array and pass it to
`setItems()`, which emits `set` and replaces the panel's `items` prop on
the settings page. So each arrow press changes the list the panel shows
outside ordering mode too.

The "Cancel" button in the header's ordering state is
`@click="isOrdering = false"` and nothing else. It leaves ordering mode
but has nothing to restore the list from, so the moved `items` stay. The
next "Order" (`@click="isOrdering = true"`) starts from those `items`,
and `saveOrder()` numbers whatever `items` holds and sends it to `PUT
highlights/order`. A refused save ends the same way: `saveOrder()`'s
`complete:` callback leaves ordering mode on an error too, and nothing
puts the saved order back.

Reach:

- The site's Highlights list (Administration › Site Settings, with two or
  more journals) is the same component, so its "Cancel" works the same
  way (code). It could not be walked: every request of that panel
  answers a server error (spec U11
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U11-highlights.md#a5)).
- The other ordering lists keep or restore the saved order (code):
  `ContributorsListPanel.vue` keeps a reference to `items` in
  `itemsBeforeReordering` when ordering starts, gives it back through
  `updated:contributors` in `cancelOrdering()` and also reloads the
  publication; OMP's `CatalogListPanel.vue` reloads the list in
  `cancelOrdering()`; the funders, data citations and galleys tables move
  rows in a working copy (`useOrdering()`) and leave the source list
  alone until a save; the legacy grids'
  `OrderItemsFeature.cancelOrderHandler()` re-sequences the rows to the
  saved `itemsOrder`.

## Proposed fix

Copy the list when ordering mode starts, give the copy back on "Cancel"
and on a refused save, and drop it when ordering ends. This is a
stricter form of what `ContributorsListPanel.vue` does: it copies the
array rather than keeping a reference, and restores without a reload. In
`HighlightsListPanel.vue`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlights-cancel-ordering-keeps-moved-rows/fix.diff)):

```diff
-								@click="isOrdering = true"
+								@click="startOrdering"
…
-									@click="isOrdering = false"
+									@click="cancelOrdering"
…
 			isOrdering: false,
+			itemsBeforeOrdering: null,
…
+		startOrdering() {
+			this.itemsBeforeOrdering = [...this.items];
+			this.isOrdering = true;
+		},
+
+		cancelOrdering() {
+			this.setItems(this.itemsBeforeOrdering, this.itemsMax);
+			this.itemsBeforeOrdering = null;
+			this.isOrdering = false;
+		},
…
-				error: this.ajaxErrorCallback,
+				error: (r) => {
+					this.setItems(this.itemsBeforeOrdering, this.itemsMax);
+					this.ajaxErrorCallback(r);
+				},
…
 					this.isOrdering = false;
+					this.itemsBeforeOrdering = null;
```

The restore calls `setItems()`, which emits the same `set` event as the
arrows, so the settings page and the site page need no change. In
ordering mode "Add Highlight" is grayed out and "Edit" and "Delete" are
hidden, so the copy cannot go stale through this panel while it is held.
Tried on `main` on OJS, OMP and OPS: "Cancel" and the refused save both
bring back "u11a First", "u11a Second", "u11a Third", and the Control
still saves the moved order. After the refused save in the Steps, the
restored list still shows "u11a Second", which the other window deleted;
the dialog asks for a reload, which shows the list as stored.

**Alternatives**:

- Reload the list on "Cancel", as `CatalogListPanel.vue` does: correct
  too, but it costs a request for an order the panel already had.
- Move the panel to `useOrdering()`, as the funders and galleys tables
  do: the cleanest model, but a rewrite of an Options API component for
  a fix of a few lines.

**What goes with it**:

- No data repair: nothing is stored wrong until a manager saves, and
  then it is the order the list showed.
- 3.5 carries the same file and the diff applies as written. 3.4's copy
  (Vue 2) has the same lines to change, but the lines around them differ,
  so the diff has to be rebuilt for that branch.
- The guard: the e2e scenario "Reorder the highlights" in spec U11 gains
  a "Cancel" after two moves, read in the list and after a reload.

Small: a few lines in one ui-library component, with an e2e step.

## Evidence

- The walk script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/highlights-cancel-ordering-keeps-moved-rows/walk.js)
  takes the Steps as `rvaca`; the argument `failed` takes the refused
  save, and `neighbour` the Control. Run it with
  `node bin/probe.js all shared/playwright/checks/issues/highlights-cancel-ordering-keeps-moved-rows/walk.js [failed|neighbour]`.
- Walks: OJS, OMP and OPS on `main` and on `stable-3_5_0` gave the
  Observed with the same Steps; the refused save was walked on `main`
  only. No request answered a server error and no page script failed. The
  installs run PostgreSQL; the fault is in the browser, so the database
  plays no part.
- Code reads: `HighlightsListPanel.vue` on `main`, 3.5 (the same file),
  3.4 (the same `@click` lines, `orderUp()` and `orderDown()` through
  `setItems()`, the same `complete:`) and 3.3 (no such file; pkp-lib has
  no `classes/highlight`). On 3.4, pkp-lib's `ManagementHandler` and
  `AdminHandler` show the Highlights tab only when `[features]
  highlights` is on, and the 3.4 config template does not list that
  setting. Only OJS's 3.4 branch mounts the highlights API
  (`api/v1/highlights/index.php`); OMP's and OPS's have none, so no
  highlight can be listed or added on a 3.4 press or server, which
  matches `pkp/pkp-lib#9262` (3.4 has highlights on OJS only).
- Introduced: `git blame` on the "Cancel" button's `@click` line in
  `main`'s ui-library leads to 0abe290a, the commit that added the panel
  (`pkp/ui-library#288`); 3.4's copy came with 09d08f38
  (`pkp/ui-library#285`), both for `pkp/pkp-lib#9262`.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched for highlights ordering and cancel, and for
  `HighlightsListPanel`; the hits were about other screens.
- Not driven: 3.4 and 3.3 (read in the code); the refused save on 3.5;
  the site's Highlights list (A5); the drag handle, which the panel
  hides.
- The branch tips the walks and code reads used:
  - **`main`:** OJS ff004d0973 (pkp-lib 987776cd04, ui-library
    64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
    ui-library 280f98c5).
  - **`stable-3_5_0`:** OJS c1cee76b95 (pkp-lib 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335); ui-library d4e01883.
  - **`stable-3_4_0`** (code): pkp-lib 767353f4fe, ui-library ee684b34,
    OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b.
  - **`stable-3_3_0`** (code): pkp-lib ac3fa73402, ui-library 96959f9e,
    OJS ac77c9fb35.
- The dataset was pkp/datasets 1a5552c (2026-10-04).
