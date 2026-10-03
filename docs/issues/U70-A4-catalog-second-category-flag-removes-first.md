# Catalog page: pressing "Featured in category" for a book's second category unfeatures it in the first

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#412` for `pkp/pkp-lib#2163` · [c10ec79833](https://github.com/pkp/omp/commit/c10ec79833ff250fc6b9c7c95fa908a2671c2902) · 2017-05-18 · Nate Wright (NateWr); moved to ui-library in [56b809dc](https://github.com/pkp/ui-library/commit/56b809dcd2ff5c472be84c418f7c9af952fbfe68) (2017-09-05)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press's Catalog page, a book featured in one category shows an
empty "Featured in category" box when another of its categories is the
filter. Pressing that box does not feature the book there: it removes
the book's feature in the first category, and the box stays empty. A
second press features the book in the second category, and the first
category's box is now empty. "New release in category" behaves the same.
Nothing on the page says a flag was removed.

So a press cannot feature a book, or mark it a new release, in two
categories. Readers see the loss on the press's public category pages,
which list featured books first: the book drops from the top of the
first category's page (on `main` only once it has no flag left in any
list, since the category pages there count every list's flags). A book moved to another series also needs two presses on its new
series' box before it is featured there.

## Impact

- **Lost**: the book's "Featured in category" or "New release in
  category" flag in its other category, without a message.
- **Who**: press managers and Press editors on Content › Catalog, for a
  book placed in more than one category, or moved to another series.
- **Way round**: none for two categories, since setting either flag
  removes the other. For a moved book, a second press.

Medium: it reaches only books in more than one category or moved to
another series, and readers see at most a book out of place on a
category page. It would be high if most of a press's books sat in
several categories, so that category featuring failed across the
catalog.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`. "Bomb Canada and Other Unkind
  Remarks in the American Media" (submission 5) is published and in no
  category; the press has the categories "Applied Science" and "Social
  Sciences". "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots" (submission 14) is published in the series "Psychology".
- No book in the dataset is in two categories, so steps 2 to 4 put book
  5 in two. A published book's "Catalog Entry" cannot be edited, so it
  is unpublished first.

Categories:

1. Sign in as `dbarnes` (Press editor).
2. Open submission 5
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`);
   "Unpublish", and "Unpublish" in the confirmation.
3. Open Publication › "Catalog Entry". Under "Categories" add "Applied
   Science", then "Social Sciences" (3.5: tick the two boxes); "Save".
4. "Publish", and "Publish" in "Schedule For Publication".
5. Open Catalog (`/index.php/publicknowledge/en/manageCatalog`),
   "Filters" › "Applied Science". On "Bomb Canada…" press the box under
   "Featured in category": it ticks.
6. Open Catalog again, "Filters" › "Social Sciences". The book's box
   under "Featured in category" is empty. Press it.
7. Open Catalog again with "Social Sciences", then with "Applied
   Science", as the filter.
8. With "Social Sciences" as the filter, press the box once more; then
   open Catalog with "Applied Science" as the filter.
9. With "Applied Science" as the filter press the box under "New
   release in category" (it ticks); then with "Social Sciences" as the
   filter press the same box; then open Catalog with each filter.

Series:

10. Open Catalog, "Filters" › "Psychology". On "From Bricks to Brains"
    press the box under "Featured in series": it ticks.
11. Open submission 14 (as in step 2, `workflowSubmissionId=14`);
    "Unpublish", and "Unpublish" in the confirmation. Under "Catalog
    Entry" set "Series" to "Education"; "Save". "Publish", and "Publish"
    in "Schedule For Publication".
12. Open Catalog, "Filters" › "Education". The book's box under
    "Featured in series" is empty. Press it, open Catalog again with
    "Education", and press it once more.

**Expected**: each box ticks at the first press and keeps the flag of
the category or series it is shown for: in step 7 the box is ticked
under both categories, step 8 unticks it under "Social Sciences" only,
step 9 leaves "New release in category" ticked under both, and in step
12 the first press ticks the box.

**Observed**:

- Step 6: the box stays empty after the press ("This monograph is not
  featured. Make this monograph featured.").
- Step 7: the box is empty under "Social Sciences" and now also under
  "Applied Science".
- Step 8: the box ticks under "Social Sciences"; under "Applied
  Science" it stays empty.
- Step 9: under "Social Sciences" the "New release in category" box
  stays empty after the press, and reopened it is empty under both
  categories.
- Step 12: the first press leaves the box empty, also after reopening;
  the second press ticks it.

## Cause

ui-library `CatalogListItem.vue` decides what a box press saves. Its
`isFeatured` and `isNewRelease` find the flag of the list on screen by
both its kind (`assoc_type`: press, category, series) and its id
(`assoc_id`), so the box shows the right state (lines 126 and 145). But
`toggleFeatured()` and `toggleNewRelease()` look for an existing flag by
kind alone (lines 158 and 187). `toggleFeatured()`, lines 156 to 166:

```js
		toggleFeatured() {
			const isFeatured = this.item.featured.find((feature) => {
				return feature.assoc_type === this.filterAssocType;
			});
			if (isFeatured) {
				this.$emit('update:item', {
					...this.item,
					featured: this.item.featured.filter((feature) => {
						return feature.assoc_type !== this.filterAssocType;
					}),
				});
```

So when the book has a flag in any category, a press under another
category takes the "remove" branch and drops every category flag of the
book, though the box showed empty. `saveDisplayFlags()` then posts the
book's whole lists, and OMP
`BackendSubmissionsController::saveDisplayFlags()` deletes all of the
book's rows (`FeatureDAO::deleteByMonographId()`,
`NewReleaseDAO::deleteByMonographId()`) and inserts the posted ones, so
the removal is stored. Only with no flag of that kind left does a press
add the flag for the list on screen.

The first Vue catalog list in OMP matched both the box's state and its
press by kind alone (`_.findWhere(…, {assoc_type})`). When the component
moved to ui-library, the state learned to match the id; the press did
not.

Reach:

- All four filtered boxes ("Featured" and "New release", in a category
  or a series) go through these two methods (walked: both category
  boxes and the series "Featured" box). A book is in one series at a
  time, so the series case needs a move: the old series' flag stays in
  storage, unseen, and the first press in the new series deletes it
  instead of adding the new one.
- The whole catalog's "Featured" and "New release" are untouched: a
  press has one such list, so kind and id always agree (walked: the
  whole-catalog "Featured" box stayed ticked while the "Applied
  Science" box was pressed on and off).
- Public pages: on 3.5 a category page lists the books featured in that
  category first; on `main` it lists first every book with a flag in any
  list (spec U70 A10). Neither shows "New release in category". A series
  page lists its own featured books first and has a "New Releases" list.
  A former series' flag shows nowhere while the book is out of that
  series, but on `main` it still counts on the category pages (code).
- `CatalogListPanel.vue` `setItemOrderSequence()`, behind "Order
  Features" › "Save Order", has the same kind-only lookup (line 603).
  Ordering one category gives a book featured only in another category
  a position that `FeatureDAO::setSequencePosition()` stores nowhere,
  and writes that position into the other category's flag in the page's
  copy; the book's next box press posts it, and the other category's
  featured order is renumbered with the book in that position (code;
  not walked).
- Nothing else in ui-library matches a flag by kind alone (a search for
  `assoc_type` comparisons), and OMP's `FeatureDAO` and `NewReleaseDAO`
  read and write by kind and id.

## Proposed fix

Match the list on screen by kind and id in the presses, as the box's
own state already does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-second-category-flag-removes-first/fix.diff),
ui-library only):

```diff
+		isInFilteredList(flag) {
+			return (
+				flag.assoc_type === this.filterAssocType &&
+				flag.assoc_id === this.filterAssocId
+			);
+		},
+
 		toggleFeatured() {
-			const isFeatured = this.item.featured.find((feature) => {
-				return feature.assoc_type === this.filterAssocType;
-			});
-			if (isFeatured) {
+			if (this.isFeatured) {
 				this.$emit('update:item', {
 					...this.item,
 					featured: this.item.featured.filter((feature) => {
-						return feature.assoc_type !== this.filterAssocType;
+						return !this.isInFilteredList(feature);
 					}),
```

`toggleNewRelease()` gets the same change, and `setItemOrderSequence()`
in `CatalogListPanel.vue` adds the id to its lookup, as that component's
`canOrderCurrent()` already does. The page owns which flags a press
changes; the endpoint stores the lists it is given, so the fix belongs
in the page.

Tried on `main`: with the fix in, steps 6 to 9 kept each category's
flag and step 12 ticked at the first press; the whole-catalog box was
unaffected with the fix in and out.

**Alternatives**

- An endpoint that changes one flag (kind, id, on or off) instead of
  replacing the book's lists: also safe against two people editing
  flags at once, but a new API contract for a page bug.
- A guard on the server refusing to drop flags of other lists: the
  server does not know which list the page shows.

**What goes with it**

- No API, hook or template changes. Flags already lost cannot be
  recovered (nothing records them); the press ticks them again.
- With the fix, a moved book's former series flag is no longer deleted
  by the first press in the new series, so it stays in storage for
  good. Clearing a book's series flags when its series changes (on the
  server) is a choice for the team.
- Backport: the diff applies as written to 3.5 (the same files) and to
  3.4 at other line numbers. 3.3 writes to the item directly
  (`this.item.featured = …filter(…)`, `this.item.featured.push(…)`), not
  through `$emit`, so there only the lookups and the filter predicates
  change.
- Test: a check that a book in two categories, featured in each, keeps
  both boxes ticked after a reload.

Small: a few lines in two ui-library components, tried.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/catalog-second-category-flag-removes-first/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-second-category-flag-removes-first/walk.js)
  (helpers in its `lib.js`, and the unpublish, "Categories" and publish
  helpers in
  [`../one-item-reads-1-items/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/lib.js))
  takes the preconditions and Steps on OMP loaded from the default
  dataset, and reads the book's `features` and `new_releases` rows
  after each group:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-second-category-flag-removes-first/walk.js`.
  `WALK=neighbour` takes steps 1 to 4, then presses the whole catalog's
  "Featured" and the "Applied Science" box on and off: the Reach's
  whole-catalog check, walked with the fix in and out.
- Walked on `main` and `stable-3_5_0`, PostgreSQL, the default datasets
  of pkp/datasets 566bb1f (2026-10-03); both versions gave the same
  Observed. Every save answered 200, and the browser showed no message
  and no script error.
- 3.4 and 3.3 (code): `CatalogListItem.vue` at the ui-library commits
  OMP pins (ee684b341b on 3.4, 96959f9ed4 on 3.3) has the box state by
  kind and id and the presses' lookups by kind alone (3.4 lines 151 and
  180, 3.3 lines 157 and 178; `main` and 3.5 lines 158 and 187), and
  `setItemOrderSequence()` by kind alone; OMP's
  `BackendSubmissionsHandler::saveDisplayFlags()` deletes and reinserts
  the book's rows there too.
- Public pages (code): `main` lib/pkp `PKPCatalogHandler::category()`
  orders by `featured` through `DatabaseEngine`, which joins every
  `features` row of the book; 3.5's calls OMP
  `Collector::orderByFeatured()`, which joins only the category's rows;
  neither assigns `newReleasesMonographs`. OMP
  `CatalogHandler::series()` filters by the series and orders by its
  featured rows on both.
- Introduced: `git log -L` on `toggleFeatured()` in ui-library ends at
  `56b809dc` (no PR), which added the id to the state only; the code
  came from OMP `c10ec79833`.
- Branch tips: main OMP 3b0ecf794c (lib/ui-library 280f98c5); 3.5 OMP
  9c5e24246c (lib/ui-library d4e0188353); 3.4 OMP 0aec65441f; 3.3 OMP
  8e72fc8836.
