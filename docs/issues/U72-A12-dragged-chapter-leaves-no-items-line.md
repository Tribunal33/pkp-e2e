# Ordering a book's chapters: a dragged chapter with no authors leaves its "No Items" line under another chapter

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** no PR, for PKP bug 7280 · [9e017dcd25](https://github.com/pkp/pkp-lib/commit/9e017dcd25b3a9fc2b250a1ce0d00c467ec25525) · 2012-04-12 · Bruno Beghelli (beghelli)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U72 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a12)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

While a press editor orders a book's chapters ("Order" on the Chapters
page), a chapter that has no authors is dragged to another place. Its
"No Items" line does not move with it: the line stays where the chapter
was, right under the author rows of the chapter that stood just above
it before the drag. That chapter then shows its authors followed by "No
Items", and the moved chapter shows nothing under its title.

"Done" draws the line under its own chapter again, and the order it
saves is right. The fault shows only on a book that has a chapter
without authors.

## Impact

- **Lost**: nothing; the saved order is the one dragged.
- **Who**: whoever is offered "Order" on a book's chapter list: the
  press's editors and managers, an author only where they may edit the
  book's metadata, and the author in the submission wizard, which draws
  the same list. Only while the list is being ordered.
- **Way round**: none needed. Until "Done", the list reads as if the
  chapter above the line had an empty author list after its authors,
  and gives no sign that the moved chapter has none.

Low: a misplaced line on screen, gone at "Done"; it would rise only if
it led a person to save a wrong order.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`).
- Every chapter in the dataset has at least one author, so step 4 adds
  one with none, "Appendix h19t".

Steps:

1. Sign in as `dbarnes`.
2. Open submission 3, "The Political Economy of Workplace Injury in
   Canada" (dashboard, "Active submissions", "View").
3. In the side menu, under "Publication", open the book's version, then
   "Chapters" [3.5: the "Publication" tab, then "Chapters"]. The list
   reads "Introduction", "Part One. Employment Relationships in Canada",
   "Part Two. Preventing Workplace Injury", "Part Three. Critique of OHS
   in Canada" and "Part Four. Political Economy of Preventing Workplace
   Injury", each with the author row "Bob Barnetson".
4. Press "Add Chapter", type "Appendix h19t" in "Title", tick no
   contributor, press "Save". "Appendix h19t" is listed last, with the
   line "No Items" under it.
5. Press "Order".
6. Drag "Appendix h19t" above "Introduction" and release.
7. Press "Done".

**Expected** (step 6): "Appendix h19t" heads the list with "No Items"
under it; "Part Four. Political Economy of Preventing Workplace Injury"
is last, with its author row under it.

**Observed** (step 6): "Appendix h19t" heads the list with nothing under
it, and "No Items" stays at the bottom, under the "Bob Barnetson" row of
"Part Four. Political Economy of Preventing Workplace Injury":

```
Appendix h19t
Introduction
  Bob Barnetson
…
Part Four. Political Economy of Preventing Workplace Injury
  Bob Barnetson
  No Items
```

After "Done" (step 7), "No Items" stands under "Appendix h19t", also
when the Chapters page is opened again. No request failed and the
browser showed no script error.

## Cause

lib/pkp draws each chapter of the list (a category of the legacy grid)
as two sibling `<tbody>` elements:
`templates/controllers/grid/gridBodyPartWithCategory.tpl` writes the
chapter's own `tbody.category_grid_body` (the chapter row and its author
rows), then, on line 24, a separate `tbody.category_placeholder` holding
the "No Items" line, shown when the chapter has no author rows.

The ordering script makes only the first of the two movable.
`OrderCategoryGridItemsFeature.setupSortablePlugin()`
(`js/classes/features/OrderCategoryGridItemsFeature.js`, line 41)
applies jQuery UI's sortable to the grid with the chapter tbodies as its
items, so a drag moves the chapter's tbody alone and its placeholder
stays where it was. The grid has the method that puts every placeholder
back under its chapter, `CategoryGridHandler.updateEmptyPlaceholderPosition()`
(`js/controllers/grid/CategoryGridHandler.js`, line 209), but the feature
calls it only when ordering ends: in `saveOrderHandler()` (line 65 of
`OrderCategoryGridItemsFeature.js`, on "Done") and, for "Cancel
ordering", through `CategoryGridHandler.resequenceCategories()` (line
200 of `CategoryGridHandler.js`). Nothing calls it when a drag lands, so
the list is wrong from the drop until "Done".

The callback a drop runs exists for this: `applySortPlgOnElements()`
(`js/classes/features/OrderItemsFeature.js`, line 413) binds sortable's
`update` event to `updateOrderCallback()`, which does nothing by default
(line 196) and which `OrderCategoryGridItemsFeature` does not override.

Reach:

- Every chapter list is this grid, `ChapterGridHandler` (OMP
  `controllers/grid/users/chapter/ChapterGridHandler.php`, the only OMP
  grid with this feature): the workflow's Chapters page, the editorial
  and the author view alike, and the submission wizard's "Details" step
  (`templates/submission/chapters.tpl`). `initFeatures()` (line 204)
  adds the ordering, and so "Order", only when `canAdminister()` (line
  236) allows: the site administrator; on a published version a
  manager, series editor or assistant; on an unpublished one anyone
  while the submission is not yet submitted (the author in the wizard),
  and after that whoever `canEditPublication()` lets edit the metadata
  (the press's editors and managers, an author only when granted that
  permission). Seen on screen on the Chapters page as `dbarnes`; the wizard and
  the author's view checked in the code only.
- OJS's issue table of contents (`TocGridHandler`) uses the same
  feature, but every section it lists holds at least one article
  (`loadData()` lists only the sections of the issue's articles, and a
  removed article redraws the whole grid), so it never shows a "No
  Items" line to leave behind (checked in the code).

## Proposed fix

Recommended: give `OrderCategoryGridItemsFeature` an
`updateOrderCallback()` that puts the placeholders back under their
chapters after every drop
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dragged-chapter-leaves-no-items-line/fix.diff)):

```diff
+	$.pkp.classes.features.OrderCategoryGridItemsFeature.prototype.
+			updateOrderCallback = function(contextElement, event, ui) {
+		this.parent('updateOrderCallback', contextElement, event, ui);
+		this.gridHandler.updateEmptyPlaceholderPosition();
+	};
```

It follows `OrderListbuilderItemsFeature`, which overrides the same
callback to act on each drop, and reuses the grid's own
`updateEmptyPlaceholderPosition()`. The callback also runs when an
author row is dropped inside a chapter; the call then moves nothing.
Tried: with the fix in, step 6 shows the Expected ("No Items" under
"Appendix h19t" at once), and dragging a chapter that has authors, or an
author within a chapter, then "Cancel ordering", reads the same with the
fix in and out.

**Alternatives**:

- Draw the placeholder inside the chapter's own tbody, so it travels
  with it: changes the markup every category grid's script reads
  (`getCategoryEmptyPlaceholder()`, row add and delete), for a display
  fix.
- Hide the placeholders while ordering: the moved chapter would then
  show no sign of having no authors.

**What goes with it**:

- The app's committed `js/pkp.min.js` (served when `enable_minified` is
  On) picks the change up at its next rebuild
  (`lib/pkp/tools/buildjs.sh`).
- No stored data to repair. The file is the same on 3.5, 3.4 and 3.3,
  so the diff applies there as written.
- Guard: an e2e check in the chapter list's ordering scenario (a chapter
  without authors dragged, the "No Items" line read under it before
  "Done"); no JavaScript unit tests cover the grids.

Small: four lines in one lib/pkp file, and an e2e check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dragged-chapter-leaves-no-items-line/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dragged-chapter-leaves-no-items-line/lib.js),
  run on an install freshly loaded from the dataset. Without an argument
  it takes steps 1–7; `neighbour` drags "Part Four…" above
  "Introduction" and, on submission 12, Raymond Hyma above Frank Tulus,
  each followed by "Cancel ordering". Each read records, for every
  visible "No Items" line, the chapter it belongs to and the chapter it
  stands under.
- The fix was tried with the walk and `neighbour` on a freshly loaded
  install, then `neighbour` again without it. The dataset install serves
  the unminified scripts (`enable_minified = Off`).
- Walked on OMP `main` 5777025be (lib/pkp 042726ebf6) and
  `stable-3_5_0` 2d575f250 (lib/pkp 092ec34b0f), each on its dataset
  from pkp/datasets eaf024c5 (2026-10-18), PostgreSQL. The fault is in
  the browser; MySQL not checked.
- Not walked: the submission wizard and the author's view of the
  Chapters page (the dataset holds no unfinished submission; the wizard
  needs a new submission started as an author).
- 3.4 (code), `upstream/stable-3_4_0` e30fa7e38 (lib/pkp
  `origin/stable-3_4_0` a71d6bd2ca): `OrderCategoryGridItemsFeature.js`
  identical to `main`'s; `CategoryGridHandler.js` lines 200 and 209 and
  the template's line 24 the same; OMP `ChapterGridHandler.php` line 202
  adds the feature.
- 3.3 (code), `upstream/stable-3_3_0` 8e72fc883 (lib/pkp
  `origin/stable-3_3_0` 5e84acd11b): the same three lib/pkp files as on
  3.4; OMP `ChapterGridHandler.inc.php` line 176 adds the feature.
- Introduced: `git log -S updateEmptyPlaceholderPosition -- js/` in
  lib/pkp finds only 9e017dcd25, which wrote the category ordering, the
  separate placeholder in the template and the repositioning on save
  together. No PR; the commit names PKP's old bug tracker number 7280.
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched by the
  symptom's words and by `OrderCategoryGridItemsFeature` and
  `updateEmptyPlaceholderPosition`; `pkp/pkp-lib#12826` (open, "Remove
  grid code") plans to replace the grids this list is built on.
- Unverified: the minified bundle with the fix was not built.
