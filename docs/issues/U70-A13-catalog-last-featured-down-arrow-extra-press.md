# Catalog "Order Features": arrow presses that should move a featured book sometimes do nothing

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** not traced as one change; present since at least [56b809dc](https://github.com/pkp/ui-library/commit/56b809dcd2ff5c472be84c418f7c9af952fbfe68) (2017-09-05) for a book featured after the page loaded, and for the last book's down arrow since `pkp/ui-library#29` for `pkp/pkp-lib#2906` · [b5c3fb2c98](https://github.com/pkp/ui-library/commit/b5c3fb2c98ea630d1f2755db85dfe1d8e577f35c) · 2019-03-14 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press's Catalog page, "Order Features" hides the books that are
not featured, but the up and down arrows still count them as rows. A
press that should move a featured book past one of these hidden books
changes nothing on screen, and only the next press moves the book.

This happens in two ordinary ways. First, the last book's down arrow,
which should do nothing, moves that book below a hidden book on each
press, and each of those presses must later be undone by a press that
shows nothing. Second, a book featured after the page was loaded stays
among the books that are not featured, so its up arrow does nothing for
each hidden book above it.

Nothing is lost: "Save Order" saves the order the screen shows. Almost
every press that orders its features also has books it does not
feature, so the hidden books are there whenever the arrows are used.

## Impact

- **Lost**: presses only. The editor is not told why a press did
  nothing and may think the arrows are broken.
- **Who**: press managers and editors ordering the featured books of
  the catalog, a category or a series.
- **Way round**: press again, or reload the page before "Order Features"
  (that puts the featured books first, though the last book's down
  arrow still swallows presses).

Low: only presses are lost, and pressing again makes every move.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Its catalog holds two
  published books, 5 "Bomb Canada and Other Unkind Remarks in the
  American Media" and 14 "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots", neither featured.

The last book's down arrow:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open the Catalog page, "Content" › "Catalog" in the side menu
   (`/index.php/publicknowledge/en/manageCatalog`) [3.5: "Catalog" sits
   directly in the side menu].
3. Press "Add Entry", type `Mobile` in "Find monographs to add to the
   catalog", choose "Mobile Learning: Transforming the Delivery of
   Education and Training" (13) and press "Save".
4. Press the "Featured" box of "Bomb Canada…", then that of "From Bricks
   to Brains…". Leave "Mobile Learning…" unfeatured.
5. Reload the page. The list reads "Bomb Canada…", "From Bricks to
   Brains…", "Mobile Learning…".
6. Press "Order Features". Two rows show, "Bomb Canada…" above "From
   Bricks to Brains…".
7. Press the down arrow of "From Bricks to Brains…" (the last row).
8. Press the up arrow of "From Bricks to Brains…".
9. Press the up arrow of "From Bricks to Brains…" again.
10. Press the down arrow of "Bomb Canada…" (now the last row).
11. Press the down arrow of "From Bricks to Brains…" (the book above).
12. Press the down arrow of "From Bricks to Brains…" again.
13. Press "Save Order", then reload the page.

A book featured after the page loaded, starting again from the dataset
with steps 1 to 5:

14. Press the "Featured" box of "From Bricks to Brains…" (it is no
    longer featured), then that of "Mobile Learning…". Do not reload.
15. Press "Order Features". Two rows show, "Bomb Canada…" above "Mobile
    Learning…".
16. Press the up arrow of "Mobile Learning…".
17. Press the up arrow of "Mobile Learning…" again.

**Expected.** Each arrow press that can move a book moves it at once:
step 8 moves "From Bricks to Brains…" to the top, step 11 moves it
below "Bomb Canada…", and step 16 moves "Mobile Learning…" to the top.
Steps 7, 10 and 12 (a last row's down arrow) and steps 9 and 17 (by
then a first row's up arrow) change nothing.

**Observed.**

- Step 7 changes nothing, as expected. Step 8 changes nothing either;
  step 9 moves "From Bricks to Brains…" to the top.
- Step 10 changes nothing, as expected. Step 11, on the other book,
  changes nothing either; step 12 moves "From Bricks to Brains…" below
  "Bomb Canada…".
- After step 13 the list starts "Bomb Canada…", "From Bricks to
  Brains…", the order shown before "Save Order".
- Step 16 changes nothing; step 17 moves "Mobile Learning…" to the top.

## Cause

While ordering, `CatalogListPanel.vue` in ui-library hides the rows of
the books not featured in the current list (the `-isOrdering` style
`.listPanel__item--catalog:not(.-isFeatured)`), but they stay in the
panel's `items`. `itemOrderDown()` and `itemOrderUp()` move the book one
place in `items`, bounded only by the ends of `items`. When the next
item is a hidden row, the press swaps the book with it, and nothing
changes on screen.

Where the hidden rows sit depends on the last fetch. A fetch puts the
featured books first (`orderByFeatured`, set in `getConfig()` of OMP's
`classes/components/listPanels/CatalogListPanel.php` and in
`ManageCatalogHandler`; OMP's `Collector` sorts by the feature's `seq`
with the rest last). A "Featured" box press saves at once
(`saveDisplayFlags`) but neither refetches nor re-sorts the list, so a
book featured since the last fetch keeps its place among the hidden
rows (steps 14 to 17).

After a fetch, the hidden rows sit after the last featured book, so
only its down arrow can reach one: it moves the book below a hidden row
on each press, up to the number of hidden rows. Any later press that
crosses that row, on this book or the one above (step 11), is spent on
it.

History: the 2017 panel (`CatalogSubmissionsListPanel.vue`,
56b809dc) overrode `itemOrderDown()` "to only handle featured items",
stopping at the last featured book, but its up arrow had no such guard
and a "Featured" press already kept the book in place. `pkp/ui-library#29`
(b5c3fb2c98), the 2019 refactor that moved ordering into the shared
`ListPanel.vue`, replaced that panel with `CatalogListPanel.vue`
without the override. The 2020 refactor
([d0ffc05ab4](https://github.com/pkp/ui-library/commit/d0ffc05ab4ae7f06e8d2ab82f30ffb8a5ea9a7a3))
copied the generic methods into `CatalogListPanel.vue` as they were.

Reach:

- The pile-up: pressed N times, the last book's down arrow puts it
  below N hidden rows (as many as there are), and the next N presses
  that cross them show nothing (code; walked with one hidden row).
- After step 11 the hidden row sits first in `items`, so the first
  book's up arrow, which should do nothing, moves it above that row
  unseen, and its next down arrow press is lost (code; the walk
  recorded the row order after step 11 only).
- A category's or a series' list uses the same methods and hides its
  rows the same way (code; not walked).
- The saved order is right: `setItemOrderSequence()` numbers the
  featured books in the order of `items` and skips the hidden ones
  (walked, step 13). Its lookup checks only the kind of list, not
  which category or series, which the report on a book's second
  category flag covers
  ([pkp-e2e#730](https://github.com/jardakotesovec/pkp-e2e/issues/730)).
- `ContributorsListPanel.vue`, `HighlightsListPanel.vue` and
  `FieldOptions.vue` use the same bound but hide no rows while ordering,
  so they are not affected (code).

## Proposed fix

Recommended (a proposal; the team decides): in ui-library's
`CatalogListPanel.vue`, have both arrows step over the hidden rows. The
book moves past the next (or previous) item featured in the current
list, and nothing happens when there is none. The test of "featured in
the current list" is the one `CatalogListItem.vue`'s `isFeatured` and
the panel's `canOrderCurrent` already use (the feature's `assoc_type`
and `assoc_id` equal to the filter's), added as `isFeaturedInList()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-last-featured-down-arrow-extra-press/fix.diff)):

```diff
 		itemOrderDown(item) {
 			var index = this.items.findIndex((obj) => {
 				return item.id == obj.id;
 			});
-			if (index === this.items.length - 1) {
+			// Skip the rows hidden while ordering (not featured in this list)
+			let next = index + 1;
+			while (
+				next < this.items.length &&
+				!this.isFeaturedInList(this.items[next])
+			) {
+				next++;
+			}
+			if (next === this.items.length) {
 				return;
 			}
 			let items = [...this.items];
-			items.splice(index + 1, 0, items.splice(index, 1)[0]);
+			items.splice(next, 0, items.splice(index, 1)[0]);
```

`itemOrderUp()` gets the mirror change, and the helper:

```js
		isFeaturedInList(item) {
			return (item.featured || []).some(
				(feature) =>
					feature.assoc_type === this.filterAssocType &&
					feature.assoc_id === this.filterAssocId,
			);
		},
```

It covers both ways in, wherever the hidden rows sit. Tried on `main`:
with the fix, the Steps' moves (8, 11, 16) happen at the first press,
and the presses Expected to change nothing change nothing. "Cancel", a
list with nothing hidden, "Save Order" and a reload behaved the same
with the fix in and out.

**Alternatives**

- Restore the 2017 bound alone (stop the down arrow at the count of
  featured books): it misses a book featured after the page loaded,
  which is not among the first rows.
- Refetch the list after a "Featured" press, or drop the hidden books
  from `items` while ordering: the first costs a request per press and
  still leaves the last book's down arrow; the second leaves the books
  missing from the list after "Save Order", which does not refetch.

**What goes with it**

- No data, API or other screen changes; `setItemOrderSequence()` is
  untouched.
- Backport: the two methods read the same on 3.5 and 3.4, where the
  diff applies with offsets; on 3.3 the context lines read
  `findIndex(obj => {`, so it needs a hand port there.
- ui-library has no component tests for its list panels; the guard is
  an end-to-end check that presses a book's arrow once with a book not
  featured in the list and expects the move.

Small: two methods and a helper in one ui-library file.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-last-featured-down-arrow-extra-press/walk.js).
  It takes steps 1 to 13 as `dbarnes` on PKP's default dataset
  (pkp/datasets 566bb1f, 2026-10-03), opening the Catalog page by its
  address, and after each arrow press records the rows on screen and
  every row in page order, the hidden ones marked. Its argument
  `between` takes steps 1 to 5 and 14 to 17; `nb` takes the controls
  named in the Proposed fix. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-last-featured-down-arrow-extra-press/walk.js [between|nb]`.
- Step 5's reload makes the order certain. Without it the list keeps
  the order of the fetch after "Add Entry", the press's catalog sort,
  by default newest published first: a dataset built on the day of the
  walk gives all three books the same publication date, and the
  database then decides the tie, so on an older dataset "Mobile
  Learning…" would come first.
- Tips walked, on PostgreSQL (the fault is in the browser and does not
  depend on the database):
  - main: OMP 3b0ecf794c, ui-library 280f98c5: steps 1 to 17. The fix
    was walked with steps 14 to 17, and with steps 1 to 13 before step
    5's reload was added (the rows stood in the same order).
  - 3.5: OMP 9c5e24246c, ui-library d4e01883 (steps 1 to 13).
- Code reads:
  - main and 3.5: `CatalogListPanel.vue` (`itemOrderDown()`,
    `itemOrderUp()`, `setItemOrderSequence()`, `canOrderCurrent`, the
    `-isOrdering` styles), `CatalogListItem.vue` (`isFeatured`,
    `toggleFeatured()`), OMP's `CatalogListPanel.php` and
    `ManageCatalogHandler` (`orderByFeatured`, the catalog sort) and
    `classes/submission/Collector.php` (featured books first, by `seq`).
  - Introduced: blame on `main`'s bound lands on d0ffc05ab4, whose
    parent holds the same lines in `ListPanel.vue`; the override was
    added by 56b809dc and removed by b5c3fb2c98, whose PR is
    `pkp/ui-library#29` (merged 2019-05-01). 56b809dc's
    `CatalogSubmissionsListItem.vue` already features a book in place.
  - 3.4 (OMP 0aec65441f, ui-library ee684b34) and 3.3 (OMP 8e72fc8836,
    ui-library 96959f9e): b5c3fb2c98 is on both ui-library branches;
    `CatalogListPanel.vue` has the same two methods and hides the
    not-featured rows while ordering; the list is fetched with
    `orderByFeatured` (`ManageCatalogHandler.php` on 3.4,
    `ManageCatalogHandler.inc.php` and `CatalogListPanel.inc.php` on
    3.3).
- Tracker searches (pkp/pkp-lib, pkp/omp, pkp/ui-library; "order
  features", "featured order", "featured arrow", `itemOrderDown`,
  `CatalogListPanel`): no issue about the arrows. `pkp/pkp-lib#7648`
  (only 30 books stay featured after "Save Order") is a different
  fault.
- Not driven: steps 14 to 17 on 3.5; a category's or a series' list;
  more than one hidden book; the arrows by keyboard; 3.4 and 3.3.
