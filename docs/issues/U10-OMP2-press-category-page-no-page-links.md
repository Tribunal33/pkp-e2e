# A press's category page shows only its first page of books, with no way to the rest

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` with `pkp/omp#2208`, for `pkp/pkp-lib#8920` · [ce23e18e83](https://github.com/pkp/pkp-lib/commit/ce23e18e832681aadf557dc143ef7f33a249bcbd), [97e86e54e3](https://github.com/pkp/omp/commit/97e86e54e3b3889f9ac430fa5c52f486e60e2d48) · 2026-01-09 and 2026-01-12, merged 2026-01-22 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A visitor who opens a press's category holding more books than the
press's "Items per page" (25 unless the press changes it) sees the
category's full count but only the first page's books. There are no
page numbers and no "Previous" or "Next" under them, so the visitor
cannot reach the rest of the category from its page.

No book or data is lost, but nothing on the page says the list is cut
short. Visitors can still find the other books through the catalog,
their series' pages or the search.

## Impact

- **Lost**: a visitor browsing a large category sees only its first
  page of books, with nothing on the page to show how to see the rest.
- **Who**: every visitor to a press's category that holds more books
  than "Items per page", on the default theme or any theme that does not
  replace the category page. PKP's separately shipped themes (Classic,
  Health Sciences, Immersion, Pragma) are journal themes, so a press
  does not meet them; on a journal their own copy of the category page
  has a different fault on `main` (it reads variables the handler no
  longer assigns), which is not checked here.
- **Way round**: only for a visitor who thinks to look elsewhere; the
  category page points nowhere.

Medium: a public listing silently hides the rest of a large category,
but the books can still be reached from other pages. It would be high if
the category page were the only way to those books.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded. Its press
  `publicknowledge` has two published books, 5 "Bomb Canada and Other
  Unkind Remarks in the American Media" and 14 "From Bricks to Brains:
  The Embodied Cognitive Science of LEGO Robots", and seven categories,
  none of which holds a book. "Items per page" is 25. Rather than add 25
  books, the steps lower it to 1.

1. Sign in as `dbarnes`.
2. Settings › Website › "Setup" › "Lists": set "Items per page" to `1`,
   then "Save".
3. Open book 5 from the dashboard. Click "Unpublish" and confirm.
4. Open "Catalog Entry". Under "Categories", type "Anthr", choose
   "Social Sciences > Anthropology", then "Save". [On 3.5, tick
   "Social Sciences > Anthropology" under "Categories".]
5. Click "Publish", then "Publish" in the confirmation.
6. Repeat steps 3–5 for book 14.
7. Log out and open the category "Anthropology":
   `/index.php/publicknowledge/catalog/category/anthropology`.

**Expected:** "2 Titles", the first book under "All Books", and a link
to the second page, as on 3.5:

```
Anthropology
2 Titles
All Books
Bomb Canada and Other Unkind Remarks in the American Media
…
1-1 of 2 Next
```

**Observed:** below the breadcrumb, the page reads in full:

```
Anthropology
2 Titles
All Books
Bomb Canada and Other Unkind Remarks in the American Media
Chantal Allan (Author)
October 3, 2026
```

The second book appears only at
`…/catalog/category/anthropology?categoryPage=2`, an address that
nothing on the page links to. `…/catalog/category/anthropology/2`, the
address 3.5's "Next" leads to, shows the first book again.

Control: after the same steps, the press's catalog page shows one book
and "1-1 of 2 Next". A preprint server's category page holding two
preprints shows "1 - 1 of 2 items 1 2 > >>", and its "2" opens the
second.

## Cause

OMP's category page template builds its paging from variables that the
handler no longer assigns. In
[`templates/frontend/pages/catalogCategory.tpl` lines 82–98](https://github.com/pkp/omp/blob/3b0ecf794c/templates/frontend/pages/catalogCategory.tpl#L82-L98),
`$prevPage` and `$nextPage` are used to build `$prevUrl` and `$nextUrl`.
They are passed with `$showingStart`, `$showingEnd` and `$total` to
`frontend/components/pagination.tpl`. That template prints nothing
unless one of the two URLs is set.

Up to 3.5, pkp-lib's `PKPCatalogHandler::category()` assigned those
variables through `_setupPaginationTemplate()`. The change in Introduced
moved the category page onto the Laravel Scout search. The handler now
gives the template one `LengthAwarePaginator` as `$results`
([line 94](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/pages/catalog/PKPCatalogHandler.php#L94)),
and pkp-lib's `_setupPaginationTemplate()` was deleted along with its
call. (OMP's own `CatalogHandler` keeps a method of that name, which its
catalog and series pages use.) The page number now comes from the
`categoryPage` query variable (`getRangeInfo($request, 'category')`).

The OJS and OPS PRs for the same issue, `pkp/ojs#5267`
([606ad4ef0b](https://github.com/pkp/ojs/commit/606ad4ef0bb68542a59ce14cdb2ade033746af61))
and `pkp/ops#1179`
([ee6b8a94fd](https://github.com/pkp/ops/commit/ee6b8a94fd429844abcb497d1b5a087df56476af)),
changed their copies of the template to print `{page_info}` and
`{page_links … name="category"}` from `$results`. OMP's copy switched
its list and count to `$results` but kept the old paging block. Its five
variables are now undefined, so it prints nothing.

Reach:

- The other templates that read `$prevPage` and `$nextPage` are still
  given them by their own handlers: OMP's `catalog.tpl` and
  `catalogSeries.tpl` by `CatalogHandler::page()` and `series()`, OJS's
  `issueArchive.tpl` by `IssueHandler`, and OPS's `preprints.tpl` and
  `sections.tpl` by `PreprintsHandler` and `SectionsHandler` (code; OMP's
  catalog on screen).
- An address of a later page in the 3.5 form
  (`…/category/<path>/2`) opens the first page on `main`, on a press and
  on a preprint server alike (on screen). `category()` still reads
  `$page` from the address but no longer uses it, so links saved or
  indexed before an upgrade land on the category's first page. That
  belongs to the move to `categoryPage` and is not covered by this fix.

## Proposed fix

Print the paging from `$results` as OJS's and OPS's templates do:
replace the dead block in OMP's `catalogCategory.tpl` with their two
lines
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-category-page-no-page-links/fix.diff)):

```diff
 		{* Pagination *}
-		{if $prevPage > 1}
-			{capture assign=prevUrl}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="category" path=$category->getPath()|to_array:$prevPage}{/capture}
-		{elseif $prevPage === 1}
-			{capture assign=prevUrl}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="category" path=$category->getPath()}{/capture}
-		{/if}
-		{if $nextPage}
-			{capture assign=nextUrl}{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="category" path=$category->getPath()|to_array:$nextPage}{/capture}
-		{/if}
-		{include
-			file="frontend/components/pagination.tpl"
-			prevUrl=$prevUrl
-			nextUrl=$nextUrl
-			showingStart=$showingStart
-			showingEnd=$showingEnd
-			total=$total
-		}
+		{page_info iterator=$results}
+		{page_links anchor="results" iterator=$results name="category" query=$query searchContext=$searchContext authors=$authors dateFromMonth=$dateFromMonth dateFromDay=$dateFromDay dateFromYear=$dateFromYear dateToMonth=$dateToMonth dateToDay=$dateToDay dateToYear=$dateToYear orderBy=$orderBy orderDir=$orderDir}
```

Tried on `main`: with the fix in, step 7 shows "1 - 1 of 2 items 1 2 >
>>", and "2" opens the page holding "From Bricks to Brains". A side check with
the fix in and out showed what else changes, and that the catalog page
does not:

- With both books on one page ("Items per page" 2), the category adds
  "1 - 2 of 2 items" under its list, with no links.
- An empty category adds "0 - 0 of 0 items", as a journal's and a
  preprint server's empty categories do today.

The fix belongs in OMP's template: the shared handler already gives it
everything. The three apps' category pages then page alike and follow
"Page links" (Settings › Website › "Setup" › "Lists"). The
`{page_links}` line is OJS's and OPS's word for word, so the three
templates stay identical. The search-page arguments it passes
(`authors`, the dates) are not assigned on a category page, so they are
empty and harmless. `anchor="results"` matches no element on any of the
three pages. Trimming those belongs in all three templates at once.

**Alternatives**:

- Keep the press's "Previous" / "Next" look: build `$prevUrl`, `$nextUrl`
  and the counts in the template from `$results->currentPage()`,
  `lastPage()`, `firstItem()` and `lastItem()`, with `categoryPage` in
  the URL. This is more template code in a pattern no other template
  uses with a paginator, and the press's category page would still
  differ from the journal's and the server's.
- Restore the old variables from OMP's `CatalogHandler`: the paginator
  exists only inside the shared `category()`, which displays the
  template itself, so OMP cannot read it without changing the shared
  handler for one app.

**What goes with it**:

- The page-info line is new on a press's category page. On an empty
  category it reads "0 - 0 of 0 items" until pkp-e2e's
  [U16-A1 fix](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A1-empty-category-no-message.md)
  is in: today `{if empty($results)}` is never true, because
  `$results` is a paginator object, so an empty category never shows
  its "No titles have been published yet." message. The two diffs change different
  lines of this file and apply together.
- No new text: `navigation.items` is in pkp-lib and translated.
- A theme that overrides `catalogCategory.tpl` carries its own copy and
  needs the same change.
- No backport: 3.5 and older still assign the old variables.
- Test: an e2e check that a press category with more books than "Items
  per page" shows page links, and that its page 2 lists the next book.

Small, as a proposal: one block of one OMP template, copied from OJS's
and OPS's, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-category-page-no-page-links/walk.js)
  takes the Steps on OMP and, as the control, on OPS (preprints 2 and 5
  in "Anthropology"). It records the category page, its page links and
  page 2, the two typed addresses and the catalog.
  - **Run** (pkp-e2e's own tooling): on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp,ops shared/playwright/checks/issues/press-category-page-no-page-links/walk.js`.
  - **Side check:** `WALK=neighbour` in front, on the state the walk
    leaves, run with the fix in and out. It reads the catalog at "Items
    per page" 1, then, at 2, the category "Anthropology" and the empty
    category "Sociology".
- Walks: OMP on `main` (with the fix in and out) and on `stable-3_5_0`,
  OPS on `main`. All on PostgreSQL, with datasets from pkp/datasets
  566bb1f (2026-10-03). On 3.5, "Categories" is a list of tick boxes
  (step 4's bracket).
- Not driven: OJS (its dataset has one published article with a single
  version; its template's paging lines are OPS's, read in the code). 3.4
  and 3.3. PKP's separately distributed themes.
- The branch tips the walks and code reads used:
  - **`main`:** OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6),
    OJS ff004d0973 (pkp-lib 987776cd04).
  - **`stable-3_5_0`:** OMP 9c5e24246c (pkp-lib cf3f984335).
  - **`stable-3_4_0`** (code): OMP 0aec65441f, pkp-lib 767353f4fe.
  - **`stable-3_3_0`** (code): OMP 8e72fc8836, pkp-lib ac3fa73402.
- Code reads:
  - `main`: `PKPCatalogHandler::category()`, `PKPHandler::getRangeInfo()`,
    `PKPTemplateManager::smartyPageInfo()` and `smartyPageLinks()`, the
    three apps' `catalogCategory.tpl`, and pkp-lib's
    `frontend/components/pagination.tpl`. A search of the three apps'
    and pkp-lib's templates for `prevPage` / `nextPage`, and of their
    `pages/` and `classes/` for whatever assigns them.
  - 3.5, 3.4 and 3.3: `PKPCatalogHandler::category()` calls
    `_setupPaginationTemplate()`, and OMP's `catalogCategory.tpl` builds
    "Previous" / "Next" from its variables (3.3 in
    `PKPCatalogHandler.inc.php`).
- The trace: `git blame` on OMP's paging block (Nate Wright, 2017,
  unchanged since apart from the router constant) and on the lines
  around it (97e86e54e3). Then `git log -S _setupPaginationTemplate` on
  pkp-lib's `PKPCatalogHandler.php`, which leads to ce23e18e83, the
  commit that deleted the call and the method.
- Upstream (searched 2026-10-03, pkp/pkp-lib, pkp/omp, pkp/ui-library):
  nothing on this fault. `pkp/pkp-lib#5932` (open) proposes one address
  scheme for paged browse pages across the apps, a feature rather than
  this fault.
