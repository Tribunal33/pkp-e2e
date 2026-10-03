# While ordering featured books, screen readers hear "Increase position of undefined" on every arrow

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/ui-library#35` and `pkp/pkp-lib#5025` for `pkp/pkp-lib#2072` · [3706dabcec](https://github.com/pkp/ui-library/commit/3706dabcecfe72107a45dc78e4b3be6f4b3ec675) and [718ad72e59](https://github.com/pkp/pkp-lib/commit/718ad72e597285d2899932efbd1d87635b90efe7) · 2019-09-05 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a14)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

While ordering, a screen reader hears every row's arrows as "Increase
position of undefined" and "Decrease position of undefined", so a
screen-reader user cannot tell which book an arrow moves. Expected: the
book's title in place of "undefined". A sighted user sees only the arrow
icons, so nothing looks wrong on screen.

This is on a press's Catalog page, after "Order Features", both for the
whole catalog and for a series or category chosen under "Filters". Only
presses have this page. Nothing is saved wrong: the arrows move the
right book, and the order is kept only on "Save Order".

The arrows named the book in OMP 3.1 and lost it in 3.2, when book
titles moved to the publication (a code reading; 3.1 was not walked).

## Impact

- **Lost**: the book's name in each arrow's name.
- **Who**: press editors and managers who order the featured books
  with a screen reader.
- **Way round**: a screen reader reads each row's arrows right after
  that row's book title, so the user can work out which book they
  belong to. After a press the user can read the list again to check
  the move. A wrong press is undone with the other arrow, or with
  "Cancel", before "Save Order".

Low: the task gets done. It would be medium if a wrong press were saved
at once.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP). Its two published books,
  5 "Bomb Canada and Other Unkind Remarks in the American Media" and 14
  "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", are on the Catalog page, neither featured.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. In the side menu open "Content" › "Catalog"
   (`/index.php/publicknowledge/en/manageCatalog`). [3.5: "Catalog" is
   an entry of its own in the side menu.]
3. Tick the "Featured" box of "Bomb Canada and Other Unkind Remarks in
   the American Media" and of "From Bricks to Brains: The Embodied
   Cognitive Science of LEGO Robots".
4. Press "Order Features".
5. Read the names of each row's up and down arrow.
6. Press "Cancel". Press "Filters" and choose the series "Psychology".
7. Tick the "Featured" box of "From Bricks to Brains: The Embodied
   Cognitive Science of LEGO Robots", press "Order Features", and read
   its arrows' names.
8. The control: open submission 4, "How Canadians Communicate: Contexts
   of Canadian Popular Culture", choose "Contributors" in the side menu,
   press "Order" and read the first row's arrows' names.

**Expected.** Each arrow names the book it moves, as the Contributors
list's arrows name the contributor: "Increase position of Bomb Canada
and Other Unkind Remarks in the American Media" and "Decrease position
of Bomb Canada and Other Unkind Remarks in the American Media".

**Observed.** Steps 5 and 7: every arrow, on both rows and on the
series' one row, is a button named "Increase position of undefined" or
"Decrease position of undefined". The hidden text of each up arrow:

```html
<span class="-screenReader">Increase position of undefined</span>
```

Step 8 (the control): "Increase position of Bart Beaty" and "Decrease
position of Bart Beaty".

## Cause

The arrows are ui-library's `Orderer.vue`, which writes a hidden text per
button, `t('common.orderUp', {itemTitle})` ("Increase position of
{$itemTitle}"). Its caller on the Catalog page,
`lib/ui-library/src/components/ListPanel/submissions/CatalogListItem.vue`,
passes `:item-title="item.title"`. The row's `item` is a submission as
`Repo::submission()->getSchemaMap()->mapManyToSubmissionsList()` maps it,
in `ManageCatalogHandler::index()` for the first page and in
`PKPBackendSubmissionsController` for later ones. Its fields come from
`getSubmissionsListProps()` (OMP's `APP\submission\maps\Schema` adds
`series`, `category`, `featured` and `newRelease`), and none of them is
`title`: a submission has had no title since titles moved to
publications (pkp-lib `schemas/submission.json` has no such property).
`replaceLocaleParams()` then writes the `undefined` value into the text
as the word "undefined". The text sits in a `-screenReader` span, hidden
from sight.

The same row shows its title from the current publication,
`localize(currentPublication.fullTitle)`. When titles moved to the
publication entity (`pkp/pkp-lib#2072`), pkp-lib 718ad72e59 took
`title`, `fullTitle` and the others out of the submission's summary
properties, and ui-library 3706dabcec moved the row's author and title
lines to `currentPublication` but left the `Orderer`'s `item.title`.
Before it (OMP 3.1) the summary carried `title`, a locale object the
old `__()` helper localised, so the arrows named the book.

Reach:

- The Catalog page's ordering mode, with no filter and with a series
  chosen (walked), with a category chosen (code: the same row component).
- The other `Orderer` callers pass a value they have: the Contributors
  list `item.fullName` (walked, the control), the Highlights list
  `localize(item.title)` and a form's option list `option.label` (code).
- OJS and OPS have no Catalog page and no `CatalogListItem`, so the
  shared change reaches only OMP.

## Proposed fix

Recommended (a proposal; the team decides): pass the title the row
already shows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-ordering-arrows-name-undefined/fix.diff),
in `lib/ui-library`):

```diff
 		<Orderer
 			v-if="isOrdering"
 			:item-id="item.id"
-			:item-title="item.title"
+			:item-title="localize(currentPublication.fullTitle)"
 			@up="$emit('order-up', item)"
 			@down="$emit('order-down', item)"
 		/>
```

It follows the Highlights list, which passes `localize(item.title)`, a
string, as `Orderer`'s `itemTitle` prop expects. `currentPublication` is
already read by the row's template, so no new case of a missing
publication arises.

Tried on `main`: every arrow now names its book ("Increase position of
Bomb Canada and Other Unkind Remarks in the American Media", "Decrease
position of From Bricks to Brains: The Embodied Cognitive Science of
LEGO Robots"), with and without the "Psychology" filter. With the fix
in and out alike, an up arrow still moves its book, "Save Order" keeps
the new order after a reload, and the Contributors arrows keep their
names.

**Alternatives**

- Add `title` back to the submissions list's fields
  (`getSubmissionsListProps()`, with a `title` case in the map, since
  the schema has no such property): a change to the `_submissions` API's
  output for one caller, and a second copy of a publication's field.
- Let `Orderer` fall back to a fixed "Move up" / "Move down" when it is
  given no title: it hides the caller's mistake and drops the book's
  name the Contributors list gives.

**What goes with it**

- 3.5's `CatalogListItem.vue` is the same file, so the diff applies
  there as written; 3.4 and 3.3 have the same line spelt
  `:itemTitle="item.title"`, which takes the same change.
- No data or API change.
- Guard: an end-to-end check that presses "Order Features" and reads the
  arrows' names.

Small: one line in one ui-library component.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-ordering-arrows-name-undefined/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03) and reads each button's name from Chromium's
  accessibility tree (CDP `Accessibility.getPartialAXTree`). No screen
  reader was run. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/catalog-ordering-arrows-name-undefined/walk.js`;
  `MODE=nb` in front runs the neighbour check alone.
- Tips walked:
  - main: OMP 3b0ecf794c, lib/pkp 3dc90c81a6, lib/ui-library 280f98c5.
  - 3.5: OMP 9c5e24246c, lib/pkp cf3f984335, lib/ui-library d4e01883;
    `CatalogListItem.vue` identical to main's.
- Code reads:
  - main: blame on `CatalogListItem.vue`'s `:item-title` line lands on
    c2aa1feb7 (a lint pass renaming `:itemTitle`), then d0ffc05ab and
    b5c3fb2c (2019-03-14, the ListPanel refactor that renamed
    `CatalogSubmissionsListItem.vue` to `CatalogListItem.vue`), both
    keeping the line; it was written in `CatalogSubmissionsListItem.vue`
    by 56b809dc (2017), when the submission's list fields carried
    `title`.
  - 3.1 (pkp-lib before 718ad72e59): `PKPSubmissionService::getSummaryProperties()`
    listed `'title'`, and ui-library's `__()` localised a locale object
    passed as a parameter.
  - 3.4 (OMP 0aec65441, lib/pkp 767353f4fe, lib/ui-library ee684b34) and
    3.3 (OMP 8e72fc883, lib/pkp ac3fa73402, lib/ui-library 96959f9e):
    `CatalogListItem.vue` passes `:itemTitle="item.title"`, `Orderer.vue`
    writes `__('common.orderUp', {itemTitle})`, `replaceLocaleParams()`
    replaces with the value as given, the Catalog page loads its rows
    from `_submissions`, and `schemas/submission.json` has no `title`.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/catalog-ordering-arrows-name-undefined/fix.diff omp`
  (rebuilds ui-library), a fresh dataset, the script, then `MODE=nb`
  on a fresh dataset; `MODE=nb` again after `revert`.
- Searched: pkp/pkp-lib, pkp/omp and pkp/ui-library for "position of
  undefined", "Increase position", catalog ordering and screen reader or
  accessibility, `CatalogListItem`, `orderer itemTitle`. The other
  ordering arrows with no name at all (Galleys, Funders, Data Citations)
  are a different component and cause, reported in
  [U46-A5-ordering-arrows-unnamed.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U46-A5-ordering-arrows-unnamed.md).
- Not driven: a real screen reader; the arrows with a category chosen
  under "Filters" (the same component and line, code); 3.4 and 3.3.
