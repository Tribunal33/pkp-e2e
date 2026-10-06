# A Search results address whose page number is not a number opens a completely blank page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; on PHP 8)
- **Introduced** not traced; present since at least [99344aa68b](https://github.com/pkp/pkp-lib/commit/99344aa68bdc107ccb463f0397f70b0b04687d36) (2008-10-16)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a13)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reader who opens a bookmarked or hand-edited Search results address
whose page number is not a number (`searchPage=abc`) gets a completely
blank page: no heading, no search form, no message of any kind. The
server fails on the request because it uses the page number without
checking that it is a number. OJS's site-wide Search page fails the
same way as a journal's. On `main` it takes a search that finds
something; on 3.5 every search fails.

Nothing is lost, and the reader gets back with the browser's back button
or the journal's address. No link on any page gives such an address, so
only a typed, mangled or shared one reaches it.

## Impact

- **Lost**: only the search, which the reader runs again. Each such
  request writes a fatal PHP error to the site's server log.
- **Who**: any visitor, signed in or not, who opens such an address on a
  journal's, press's or server's Search page, or on OJS's site-wide one.
- **Way round**: the browser's back button, or the journal's address
  typed again, then "Search" in the header.

Low: the reader gets back in one step and searches again; a link on a
page that produced such an address would raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`, with its own `config.inc.php` (`display_errors =
  Off`, as shipped). With `display_errors = On` the page prints the
  error text instead of staying blank. Not signed in.

Steps:

1. Open the journal's (press's, server's) home page and choose "Search"
   in the header.
2. Type `Antimicrobial` (OJS), `Bricks` (OMP) or `efficacy` (OPS) in the
   box and press "Search". The results list the matching item (on OPS
   two preprints, 6 and 7). On `main` the search must find something;
   on 3.5 any search will do.
3. In the browser's address bar, add `&searchPage=abc` to the end of the
   results address
   (`/index.php/publicknowledge/en/search/index?query=Antimicrobial&…&searchPage=abc`)
   and open it.

**Expected**: the Search page with the first page of results and the word
still in the box, as `searchPage=0` or `searchPage=-1` gives.

**Observed**: a blank page with no text at all. The response is
`500` with an empty body, and the server log has:

```
PHP Fatal error:  Uncaught TypeError: Unsupported operand types: string - int in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Database/Query/Builder.php:3146
#0 …/Illuminate/Database/Query/Builder.php(3554): Illuminate\Database\Query\Builder->forPage('abc', 25)
#1 …/lib/pkp/classes/search/engines/DatabaseEngine.php(238): Illuminate\Database\Query\Builder->paginate(25, Array, 'submissions', 'abc')
#2 …/laravel/scout/src/Builder.php(475): PKP\search\engines\DatabaseEngine->paginate(Object(Laravel\Scout\Builder), 25, 'abc')
#3 …/lib/pkp/pages/search/SearchHandler.php(46): Laravel\Scout\Builder->paginate(25, 'submissions', 'abc')
```

The same address with `&searchPage=9` shows "No Results" (OMP: "No titles
were found which matched your search for "Bricks".") with the word kept
in the box. On OJS the site-wide Search page
(`/index.php/index/search/search?query=Antimicrobial&searchPage=abc`)
gives the same blank page.

## Cause

`PKPHandler::getRangeInfo()` (`lib/pkp/classes/handler/PKPHandler.php`,
lines 452–453) reads the page number from the request and only replaces
it when it is `empty()`:

```php
$pageNum = $request->getUserVar(self::getPageParamName($rangeName));
if (empty($pageNum)) {
```

Any other value, `"abc"` included, goes into `new DBResultRange($count,
$pageNum)` as it was typed, and every reader of that range does
arithmetic with it. Since PHP 8, arithmetic on a non-numeric string
throws a `TypeError` (PHP 7 only warned). Nothing catches it, so the
request ends in a 500 with no page.

On `main` `SearchHandler::search()` hands the value to the search
engine's `paginate()`, and Laravel's `Builder::paginate()` calls
`forPage()`, which computes `($page - 1) * $perPage`, only when the
total is not zero
(`$results = $total ? $this->forPage($page, $perPage)->get($columns) : new Collection;`);
`LengthAwarePaginator` itself falls back to page 1 for a value that is
not a whole number. So a search that finds nothing renders "No Results"
normally. On 3.5 and 3.4 the value reaches
`SubmissionSearch::retrieveResults()`, which computes
`$itemsPerPage * ($page - 1)` before it looks at the results, so every
search fails (3.5's trace ends in
`lib/pkp/classes/search/SubmissionSearch.php:303`).

Reach of the same unchecked value:

- The Search page on OJS, OMP and OPS (walked on `main` and 3.5), and
  OJS's site-wide Search page (opened by address on `main` and 3.5).
  A search with no results fails on 3.5 on all three apps (opened by
  address) and not on `main`.
- A category's page (`/catalog/category/<path>?categoryPage=abc`), which
  calls `getRangeInfo($request, 'category')` and the same `paginate()` on
  `main`, so a category with items fails (code; the default dataset has
  no categories).
- OJS's journal home page when it lists recent articles instead of the
  current issue (a journal with no issues, or a theme set that way):
  `IndexHandler::index()` computes `max(0, $rangeInfo->page - 1)` with
  `publishedPublicationsPage` (code).
- The legacy grids' paging (`GridHandler::getGridRangeInfo()`,
  `GeneralPagingFeature`), whose page number reaches `DAO::retrieveRange()`'s
  `max(0, $dbResultRange->getPage() - 1)` (code; the grids' own links
  always send a number).
- The OpenSearch engine's `paginate()` computes `($page - 1) * $perPage`
  from the same value (code).

## Proposed fix

Make `getRangeInfo()` read the page number as a whole number and treat
anything below 1 as "no page given"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-text-page-number-blank-page/fix.diff)):

```diff
-        $pageNum = $request->getUserVar(self::getPageParamName($rangeName));
-        if (empty($pageNum)) {
+        // A page number is a positive whole number; anything else is treated as no page given
+        $pageNum = (int) $request->getUserVar(self::getPageParamName($rangeName));
+        if ($pageNum < 1) {
```

`getRangeInfo()` is the one place that turns a request into a page range,
so the cast covers the Search page, the category pages, OJS's home-page
list and the grids together. It follows how the code base already reads
a page number: `IssueHandler::archive()` (OJS), `CatalogHandler::page()`
(OMP) and `PreprintsHandler::index()` (OPS, line 55) cast it with
`(int)`. Those handlers read a path argument (`$args[0]`), not a query
parameter, so the precedent is the cast, not the place. `getRangeInfo()`
itself already accepts a page remembered in the session only when
`is_numeric()`. A word, 0 or a negative number is now treated as no page
given, as an empty value always was: the page the session remembers for
that list when the caller passes `$contextData`, and page 1 otherwise.

Tried on `main` on OJS, OMP and OPS: the Steps' address shows the Search
page with the result listed and the word in the box. Page numbers 1, 0,
-1 and 9 and the page links of a two-page and a seventeen-page result
list showed the same pages with the fix as without it.

**Alternatives**:

- Cast in each caller (`SearchHandler`, `PKPCatalogHandler`,
  `IndexHandler`): three places to keep in step, and the grids stay open.
- Validate in `DBResultRange`'s constructor: the range is built in many
  places that already pass numbers, and the request is where the bad
  value comes from.
- Answer 404 for a page number that is not a number: stricter, but a
  page number past the last page already shows the list's own empty
  state rather than a 404, so page 1 is the consistent answer.

**What goes with it**:

- A grid or list that is given a word as its page number now opens on
  its first or remembered page instead of failing.
- Backport: the two lines are the same on `stable-3_5_0` and
  `stable-3_4_0`, and on `stable-3_3_0` in its tab-indented
  `PKPHandler.inc.php`, so the same two-line change applies on all
  three (on 3.3 with tabs).
- Guard: a unit test in pkp-lib for `PKPHandler::getRangeInfo()` with
  page numbers `abc`, `0`, `-1` and `3`.

Small: two lines in one shared method and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-text-page-number-blank-page/walk.js)
  takes the Steps as a visitor on OJS, OMP and OPS, and records each
  page's status, heading, text, results and the server log lines the
  request wrote. Run from the pkp-e2e repo on an install loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-text-page-number-blank-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With `NB=1` it runs
  only the check of what the fix must leave alone: page numbers 1, 0, -1
  and 9 on the word's results, and (OJS, OPS) "Items per page" set to 1
  by `rvaca` under Settings › Website › Setup › Lists, then the page
  links "2" and ">>" of a search with an empty box, which lists every
  published item (OJS has two, so its page "2" is already the last).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  each install freshly loaded from pkp/datasets e8dafbc (2026-10-02),
  with the dataset's `config.inc.php` (`display_errors = Off`). The fix
  was tried on `main` with the diff applied to OJS, OMP and OPS; the
  check above ran with it and again without it. A search with no
  results (`query=zzqqxx&searchPage=abc`) and OJS's site-wide Search page
  were opened by address on the same installs, not by the kept script:
  no results gave "No Results" on `main` and a blank 500 on 3.5 (OJS,
  OMP, OPS); the site-wide page gave a blank 500 on both. The failure is
  PHP arithmetic, not SQL, so MySQL is expected to behave the same (not
  checked).
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp ac3fa73402. `PKPHandler.php` is
  identical in the three `main` checkouts.
- Code reads beyond those the Cause names: on `main`, Laravel's
  `Query\Builder::paginate()` and `forPage()`, `DBResultRange`, and the
  page readers of the three apps named in the Proposed fix. On 3.5, the
  apps' `pages/search/SearchHandler.php`. On 3.4, the same two lines of
  `getRangeInfo()`, the three apps' `SearchHandler` calling it, and
  `SubmissionSearch::retrieveResults()` (pkp-lib requires PHP 8.0.2
  there). On 3.3, the same lines in `PKPHandler.inc.php`, the three apps'
  `SearchHandler` and `SubmissionSearch.inc.php`'s
  `$itemsPerPage * ($page-1)`: a `TypeError` on PHP 8, a warning and a
  negative offset on PHP 7.
- Introduced: `git blame` on the two lines lands on the PSR-12 reformat
  e3f570bc37 (2021), then a 2012 file move; the `if (empty($pageNum))`
  line is in 99344aa68b (2008-10-16, "#3818# template abstraction"), the
  oldest commit read.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops searched for
  `searchPage`, `getRangeInfo`, `DBResultRange`, `forPage`,
  `categoryPage`, "Unsupported operand types" and "search page number
  blank"; no issue or PR about this fault.
- Not walked: the category page and OJS's recent-articles home page
  (code only, as the Cause marks them). The e2e guard is a **Planned**
  item for U15 Rule 8 (a word as the page number opens the first page).
