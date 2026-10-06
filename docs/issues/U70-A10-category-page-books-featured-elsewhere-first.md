# A press's category page orders its books by their places in other featured lists, not its own

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` for `pkp/pkp-lib#8920` · [818aeda367](https://github.com/pkp/pkp-lib/commit/818aeda3679c340db628a98c35654f439ddbc336) · 2026-01-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a10) (its wrong order; A10's missing "New Releases" list is [a separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U70-A10-U68-A7-category-page-no-new-releases-or-featured.md))
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press editor ticks "Featured in category" for a book on the Catalog
page, with a category chosen, and expects it to be listed first on the
category's public page. The page does not use the category's featured
list. Among the category's own books, it puts first every book featured
in any list (the whole catalog, a series, another category). It ranks
each of them by its furthest-back place in any of those lists.

So a book of this category featured only in the whole catalog is listed
among the featured books. The book featured in this category drops
behind it when it holds a later place in another list. The order set
with "Order Features" for the category is overridden the same way.

The Catalog page, filtered by the category, shows the category's own
order, so the editor sees nothing wrong.

## Impact

- **Lost**: the category's featured order on its public page. No flag or
  book is lost.
- **Who**: readers of a press's category pages, and the editor who
  features books there, whenever a book in the category is also
  featured in the catalog, a series or another category.
- **Way round**: none that keeps both choices. Taking the book's flags
  off in the other lists changes those lists.

Medium: a public page silently shows a featured order the press did not
set, with no way round, in a state that needs books featured in more
than one list. It is not low, because the editor's choice for the
category never takes effect there. It would be high if books went
missing from the page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`, freshly loaded. It holds no
  featured book and no new release.
- Submissions 5 "Bomb Canada and Other Unkind Remarks in the American
  Media" and 14 "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots" (both published, in no category) placed in the
  top-level category "Social Sciences" as `dbarnes`. For each: open it,
  "Unpublish" and confirm; "Catalog Entry", "Categories": type "Social",
  choose "Social Sciences", "Save"; "Publish" and confirm.
  [3.5: "Categories" is a list of boxes; tick "Social Sciences".]

1. Sign in as `dbarnes`.
2. Content › "Catalog" [3.5: "Catalog" in the main menu], no filter (the
   whole catalog): press "Featured" on "From Bricks to Brains…", then on
   "Bomb Canada…".
3. Reload the page. "Order Features"; if "From Bricks to Brains…" is not
   first, press its up arrow; "Save Order". The whole catalog's featured
   order is now "From Bricks to Brains…", "Bomb Canada…".
4. "Filters" › "Social Sciences": press "Featured in category" on "Bomb
   Canada…" only. After a reload the Catalog page, filtered by "Social
   Sciences", lists "Bomb Canada…" first.
5. Open the category's page,
   `/index.php/publicknowledge/en/catalog/category/social-sciences`.

**Expected**

"Bomb Canada…", the only book featured in "Social Sciences", is listed
first, then "From Bricks to Brains…".

**Observed**

Under "All Books" (count "2 Titles"):

1. "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots"
2. "Bomb Canada and Other Unkind Remarks in the American Media"

On `stable-3_5_0`, the same steps list "Bomb Canada…" first.

## Cause

`DatabaseEngine::buildQuery()` (lib/pkp
`classes/search/engines/DatabaseEngine.php`, lines 202-205 on `main`)
orders by featured place with:

```php
$q->leftJoin('features as f', 's.submission_id', 'f.submission_id')
    ->orderByRaw('COALESCE(MAX(f.seq), 999999)');
```

The `features` table holds one row per book and featured list
(`assoc_type` and `assoc_id`: the press, a category or a series), and
`seq` is the book's place in that list. The join is on `submission_id`
alone, so every row of the book counts, and `MAX(f.seq)` takes its
furthest-back place in any list. A book featured nowhere sorts at
999999. In the Steps, "From Bricks to Brains…" holds one row (press,
place 1) and "Bomb Canada…" two (press, place 2; "Social Sciences",
place 1), so they sort on 1 and 2.

OMP's own collector keeps the rule this breaks. Its
`orderByFeatured()` reads: "If filtering by series or categories, this
will put featured items in that series or category first. By default, it
puts the items featured in the context at the top."
`APP\submission\Collector::getQueryBuilder()` (OMP
`classes/submission/Collector.php`, lines 190-220) then joins `features`
on `assoc_type` and `assoc_id` as well.

`PKPCatalogHandler::category()` adds `orderBy('featured')` on a press and
is the engine's only caller with that order. Until `pkp/pkp-lib#12199`
the page used the collector with `orderByFeatured(true)`. The PR moved
the page onto the search framework (`ce23e18e83` left the featured
order out), and `818aeda367` ("Fix feature sorting for OMP") put a
featured order back through the engine, without restricting the join to
the category.

Reach:

- Every press category page on `main` whose books are featured in other
  lists (walked: the whole catalog; a series and another category go
  through the same join, code).
- The press's catalog page, its home page and a series' page order with
  the collector and are unaffected (code), as is the Catalog page in the
  editorial back end (walked).
- `OpenSearchEngine` accepts no `featured` order at all and throws
  "Unsupported order-by" (line 369); a separate gap, left out here (code;
  OpenSearch not run).

## Proposed fix

Join only the features of the category being browsed, as the collector
does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/fix.diff);
its paths run from the OMP root, `a/lib/pkp/…`, so in a pkp-lib checkout
apply it with `git apply -p3`):

```diff
-            ->when($orderBy == 'feature', function ($q) {
-                $q->leftJoin('features as f', 's.submission_id', 'f.submission_id')
+            ->when($orderBy == 'feature', function ($q) use ($contextId, $categoryIds) {
+                // Only the features of the list being browsed count, as in APP\submission\Collector::orderByFeatured():
+                // a category's own featured items on a category's page, otherwise the press's.
+                [$assocType, $assocIds] = is_array($categoryIds)
+                    ? [Application::ASSOC_TYPE_CATEGORY, $categoryIds]
+                    : [Application::getContextAssocType(), [(int) $contextId]];
+                $q->leftJoin(
+                    'features as f',
+                    fn (JoinClause $j) => $j->on('s.submission_id', '=', 'f.submission_id')
+                        ->where('f.assoc_type', '=', $assocType)
+                        ->whereIn('f.assoc_id', $assocIds)
+                )
                     ->orderByRaw('COALESCE(MAX(f.seq), 999999)'); // MySQL and PostgreSQL don't agree on ORDER BY with NULLs
             })
```

Tried on `main`: with the fix in, step 5 lists "Bomb Canada…" first.
A side check, run with the fix in and out, featured "From Bricks to
Brains…" in the whole catalog only. Without the fix the category's page
listed it first. With the fix both books sort as not featured, in an
order nothing sets (the category's own order is ignored on `main`,
[pkp-e2e#597](https://github.com/jardakotesovec/pkp-e2e/issues/597)).
The catalog page and the search page for "Canada" were the same either
way.

- **Where the rule lives**: Scout's `orderBy()` carries only a column and
  a direction, so the handler cannot name the list; the engine takes it
  from the `categoryIds` filter, where the SQL is built.
- **How the code base does it**: `Collector::getQueryBuilder()` picks the
  series, then the categories, then the press. The engine has no series
  filter for a press (its `sectionIds` filter reads `p.section_id`; OMP
  publications hold `series_id`), so the diff keeps categories and the
  press. The join closure follows the engine's own title join.
- **The press branch** (no category filter) was not tried: no page
  reaches it, since the catalog and home pages use the collector. It
  keeps the order scoped for any later caller.

**Alternatives**

- Back to the collector for the category page, as 3.5: undoes the move
  onto the search framework that `pkp/pkp-lib#12199` made.
- `MIN(f.seq)` instead of `MAX`: still mixes unrelated lists.

**What goes with it**

- No stored data, API or hook changes.
- pkp-e2e#597 proposes several orders in the same `switch`; the two
  diffs touch neighbouring lines and combine by hand.
- The guard: the engine has no test today. A database test with fixtures
  (`submissions_fulltext`, `publications`, `features` rows: one book
  featured in the press, another in the category) would catch it, as
  would the e2e scenario in spec U70 for A10.

Small: one join in one method, following the collector's pattern, plus
the test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets `566bb1f`, 2026-10-03, the PostgreSQL dumps):
  `PROBE_FEATURE=<dataset fleet> PROBE_AGENT=<id> node bin/probe.js omp
  shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/walk.js`
  (`WALK=neighbour` for the side check). The fix was applied to OMP's
  lib/pkp for the fix walk and the side check, then reverted.
- Tips walked or read: `main` OMP `3b0ecf794c` (lib/pkp `3dc90c81a6`);
  `stable-3_5_0` OMP `9c5e24246c` (lib/pkp `cf3f984335`); `stable-3_4_0`
  OMP `0aec65441`, lib/pkp `767353f4fe`; `stable-3_3_0` OMP `8e72fc883`,
  lib/pkp `ac3fa73402`. The engine is the same in OJS `main`'s lib/pkp
  `987776cd04`; OJS and OPS have no featured books.
- 3.5: `PKPCatalogHandler::category()` orders with the collector and
  `orderByFeatured(true)`. 3.4 (code): the same in
  `pages/catalog/PKPCatalogHandler.php`, OMP's `Collector` joining on
  the category. 3.3 (code): `PKPCatalogHandler.inc.php` passes
  `orderByFeatured` with `categoryIds`, and OMP's
  `SubmissionQueryBuilder` joins on `ASSOC_TYPE_CATEGORY`. None of
  `pkp/pkp-lib#12199`'s commits is on the three branches.
- Introduced: `git blame` on the engine's join; `818aeda367` belongs to
  `pkp/pkp-lib#12199` (merged 2026-01-22).
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library for
  category featured, "featured in category", `orderByFeatured`,
  `featuredMonographIds`, `DatabaseEngine` featured, `catalogCategory`
  and `PKPCatalogHandler` category (2026-10-03).
- Not walked: a book featured in a series or another category (the same
  join, code). MySQL not checked (the order between equal places is the
  database's).
