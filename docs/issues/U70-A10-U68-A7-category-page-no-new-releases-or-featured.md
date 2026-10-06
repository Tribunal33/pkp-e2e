# A press's category page never lists its new releases and never sets its featured books apart

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#619` for `pkp/pkp-lib#4158` · [38a6184f5](https://github.com/pkp/omp/commit/38a6184f5d9a2059f386c55e52f4e79d294c30f9) · 2018-12-17 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U70 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U70-catalog-management.md#a10) (its missing "New Releases" list; A10's wrong order of books is [a separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U70-A10-category-page-books-featured-elsewhere-first.md)), spec U68 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the Catalog page, with a category chosen, a press editor ticks "New
release in category" for one book and "Featured in category" for
another. The category's public page shows neither choice: it has no
"New Releases" list, and the featured book is shown two to a row like
every other book. A series' page does both: its new releases are listed
above its books, and a featured book is set apart in a row of its own.

The boxes save and show ticked, so the editor sees no sign that readers
never see them. There is no way round: no setting makes the category's
page show its new releases or set its featured books apart, and the
press's "New Releases" page lists only the whole catalog's new
releases. The fix copies what the series page already does.

## Impact

- **Lost**: the press's new releases and featured books for a category,
  as readers should see them on the category's page.
- **Who**: readers of a press's category pages, and the editor who
  marks books for them, on every press, in any theme (the page never
  receives the flags).
- **Way round**: none. The series pages, the catalog page and the "New
  Releases" page show only their own flags, never the category's.

Medium: silent, on every press that uses these boxes; it stays medium
because every book is still listed and found on the page, only the
highlighting is missing. It would be high if the category's books
themselves went missing.

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
2. Content › "Catalog" [3.5: "Catalog" in the main menu], "Filters" › "Social Sciences": press "Featured
   in category" on "Bomb Canada…" and "New release in category" on
   "From Bricks to Brains…".
3. Open the category's page,
   `/index.php/publicknowledge/en/catalog/category/social-sciences`.

**Expected**

A "New Releases" list holding "From Bricks to Brains…" above the
category's books, and "Bomb Canada…" set apart as a featured book, in a
row of its own, as on a series' page.

**Observed**

The page reads "2 Titles" and holds one list, "All Books": "Bomb
Canada…" and "From Bricks to Brains…", side by side in one row, shown
alike. There is no "New Releases" heading.

Control: the same two boxes for "From Bricks to Brains…" under its
series, "Filters" › "Psychology" ("Featured in series", "New release in
series"), give the series' page (`/catalog/series/psy`) a "New
Releases" list with the book, and set it apart as featured in "All
Books".

On `stable-3_5_0`, the same steps show the same page.

## Cause

OMP's `templates/frontend/pages/catalogCategory.tpl` reads two variables
the handler never assigns: `$newReleasesMonographs` (the "New Releases"
list, shown only when not empty) and `$featuredMonographIds` (passed to
`monographList.tpl` as `featured`, which gives a featured book a row of
its own and the `is_featured` class). The page is built by the shared
`PKP\pages\catalog\PKPCatalogHandler::category()` (lib/pkp
`pages/catalog/PKPCatalogHandler.php`), which assigns the category, its
parent and subcategories, and the results, but neither variable. Smarty
reads both as empty, so the list is skipped and no book is featured.

OMP's own `CatalogHandler::category()` assigned both from the
category's flags: `FeatureDAO::getSequencesByAssoc(ASSOC_TYPE_CATEGORY,
…)` and, on the first page, `NewReleaseDAO::getMonographsByAssoc(ASSOC_TYPE_CATEGORY,
…)`. Commit `38a6184f5` ("pkp/pkp-lib#4158 Share catalog management in
pkp-lib", 2018-12-17, first released in 3.2.0) deleted that method so
that OMP inherits the shared one, which was written for the three apps
and never carried OMP's flags. The template kept reading them. Nothing
in `pkp/pkp-lib#4158` (thematic collections for OJS) or its PR speaks of
dropping them; in 2015 `pkp/omp#159`, which would have removed featured
books from category and series pages, was closed unmerged. OMP's
`series()` in the same class still assigns both, which is why a series'
page works.

Reach:

- Every theme: OMP bundles only the default theme, which has no
  `catalogCategory.tpl` of its own; a theme that overrides the template
  still gets no flags from the handler (code).
- A series' page, the catalog page, the home page and the "New Releases"
  page assign their own lists in OMP's `CatalogHandler` and
  `IndexHandler` (walked: a series' page; code for the others). The
  "New Releases" page reads the press's list only
  (`getMonographsByAssoc(ASSOC_TYPE_PRESS, …)`), so a book marked only
  "New release in category" appears nowhere (code; the side check below
  saw the same).
- The same kind of gap was closed once for another variable of this
  template: `pkp/pkp-lib#8684` ("authorUserGroups variable isn't
  assigned to the catalogCategory template", 3.4).
- The order of the books (whether "Featured in category" moves a book
  up) belongs to the other report: on `main` the page orders by featured
  places in every list. With both fixes in, the category's featured books come
  first and are set apart.

## Proposed fix

Give OMP's `CatalogHandler` a `category()` that assigns the category's
featured books and new releases, then hands over to the shared page
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-no-new-releases-or-featured/fix.diff),
OMP only):

```php
public function category($args, $request)
{
    $context = $request->getContext();
    $category = Repo::category()->getCollector()
        ->filterByPaths([$args[0] ?? ''])
        ->filterByContextIds([$context->getId()])
        ->getMany()
        ->first();

    if ($category) {
        $featureDao = DAORegistry::getDAO('FeatureDAO'); /** @var FeatureDAO $featureDao */
        $newReleaseDao = DAORegistry::getDAO('NewReleaseDAO'); /** @var NewReleaseDAO $newReleaseDao */
        // Provide a list of new releases on the first page only, as on a series' page
        $isFirstPage = $this->getRangeInfo($request, 'category')->getPage() <= 1;
        TemplateManager::getManager($request)->assign([
            'featuredMonographIds' => $featureDao->getSequencesByAssoc(Application::ASSOC_TYPE_CATEGORY, $category->getId()),
            'newReleasesMonographs' => $isFirstPage ? $newReleaseDao->getMonographsByAssoc(Application::ASSOC_TYPE_CATEGORY, $category->getId()) : [],
        ]);
    }

    return parent::category($args, $request);
}
```

Tried on `main`: with the fix in, step 3 shows a "New Releases" list
holding "From Bricks to Brains…" above "All Books", and "Bomb Canada…"
set apart as featured in a row of its own. A side check was run with
the fix in and out. It marked "Bomb Canada…" featured and a new release
in the whole catalog, and "From Bricks to Brains…" a new release in
"Social Sciences":

- With the fix, the category's page lists only "From Bricks to
  Brains…" under "New Releases" and sets no book apart: the whole
  catalog's flags stay off it.
- "Applied Science" (no book), the catalog page and the "New Releases"
  page are the same either way. The "New Releases" page lists "Bomb
  Canada…" only.

- **Where the rule lives**: featured books and new releases are OMP's
  (its `FeatureDAO`, `NewReleaseDAO` and template), so OMP's handler
  provides them, as it did before 2018. The code follows
  `CatalogHandler::series()`: the same DAOs, the new releases on the
  first page only.
- **Every instance**: `catalogSeries.tpl` and `catalogCategory.tpl` read
  both variables, `catalog.tpl` only `$featuredMonographIds`; the
  category page is the only one without an OMP handler that assigns
  what it reads (code).
- **The introducing change's intent** (one category page for the three
  apps) is kept: the shared handler is untouched.

**Alternatives**

- Assign the two variables in the shared handler, inside its existing
  `Application::get()->getName() == 'omp'` block: fewer lines and no
  second category lookup, but pkp-lib then reads OMP's own DAOs.
- A protected method in the shared handler returning extra template
  data, which OMP overrides: no second lookup, but a new pattern for
  one page.
- Drop the two variables from the template and the category boxes from
  the Catalog page: a product decision that removes the feature.

**What goes with it**

- No stored data changes; the flags already saved show at once.
- Backport: on `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` the
  category page takes its page number from `$args[1]`, not
  `getRangeInfo()`, so the first-page test follows that; 3.3 also reads
  the category through `CategoryDAO` and the DAOs' constants without a
  class.
- The guard: the e2e scenario in spec U68 for A7 (a category's new
  release listed, its featured book set apart).

Small: one method in OMP's catalog handler and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-no-new-releases-or-featured/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-page-books-featured-elsewhere-first/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets `566bb1f`, 2026-10-03, the PostgreSQL dumps):
  `PROBE_FEATURE=<dataset fleet> PROBE_AGENT=<id> node bin/probe.js omp
  shared/playwright/checks/issues/category-page-no-new-releases-or-featured/walk.js`
  (`WALK=neighbour` for the side check). It records each list on the
  public pages, with each book's `is_featured` class and whether it
  stands in a two-book row; the fix was applied to OMP for the fix walk
  and the side check, then reverted.
- Tips walked or read: `main` OMP `3b0ecf794c` (lib/pkp `3dc90c81a6`);
  `stable-3_5_0` OMP `9c5e24246c` (lib/pkp `cf3f984335`);
  `stable-3_4_0` OMP `0aec65441`, lib/pkp `767353f4fe`; `stable-3_3_0`
  OMP `8e72fc883`, lib/pkp `ac3fa73402`.
- 3.5: `PKPCatalogHandler::category()` assigns `category`,
  `parentCategory`, `subcategories`, `publishedSubmissions` and
  `authorUserGroups`; OMP's `CatalogHandler` has no `category()`. 3.4
  (code): the same, in `pages/catalog/PKPCatalogHandler.php` and OMP's
  `pages/catalog/CatalogHandler.php`. 3.3 (code): `PKPCatalogHandler.inc.php`
  assigns `category`, `parentCategory`, `subcategories` and
  `publishedSubmissions`; OMP's `CatalogHandler.inc.php` has no
  `category()`. On all three the template reads `$featuredMonographIds`
  and `$newReleasesMonographs`.
- Introduced: `pkp/omp#619` was merged 2019-01-14; the first tag
  holding `38a6184f5` is `3_2_0-0`.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library for
  category "new releases", category featured, "new release in
  category", "featured in category", `featuredMonographIds`,
  `newReleasesMonographs`, `catalogCategory` and `PKPCatalogHandler`
  category (2026-10-03); also read `pkp/pkp-lib#4158` and its comments.
  `pkp/omp#855` (open) adds a series overview page; not this fault.
