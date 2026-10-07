# A Search link naming a sort that main does not know, such as a typo or 3.5's "publicationDate", shows an empty error page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` for `pkp/pkp-lib#8920` · [d6a9c82dbf](https://github.com/pkp/pkp-lib/commit/d6a9c82dbfe10cee6f2126501e2bb4c2616d7783) · 2026-01-13 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U15 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a17)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reader who opens a Search results link whose `orderBy` names a sort
the page does not know gets an empty page instead of the results: the
server fails and answers HTTP 500. `main` knows `title`, `datePublished`
and, on a press only, `featured`. Any other value fails: a typo
(`orderBy=titel`), the name 3.5 gave its date sort (`publicationDate`),
or `featured` on a journal or a preprint server. 3.5 ignored a sort it
did not know and listed the results.

Neither 3.5 nor `main` offers a sort: no Search page, bundled theme or
plugin of either builds a link with one (the paging links on `main` only
carry on a sort already in the address). So only an address someone typed,
or a bookmark or shared copy of it, reaches the error, and an upgrade
from 3.5 breaks no link the app made. Searching again lists the results.

## Impact

- **Lost**: the results page for that link; nothing stored changes.
- **Who**: a reader, signed in or not, who opens a Search address with
  an unknown sort typed into it, or a bookmark or shared copy of one.
- **Way round**: open the link without its `orderBy` part, or search
  again from the page.

Low: only a hand-typed address meets it. It would be medium for the
readers of a third-party theme that offered 3.5's sort options (3.5's
Search page handed them to its templates; no bundled theme used them).
The fix is small: a short list of accepted sorts where the request is
read, as 3.5 had.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, context `publicknowledge`, as a
  visitor (not signed in). Nothing is created.
- Error display off, as `config.inc.php` ships it (`display_errors =
  Off`, `show_stacktrace = Off`). With either on, the same failure shows
  the error text instead of an empty page.

Steps (journal; a press and a preprint server are the same with the word
in brackets):
1. Open the journal's home page and press "Search" in the header.
2. Type "Antimicrobial" in the box and press "Search". The results list
   "Antimicrobial, heavy metal resistance and plasmid profile of
   coliforms isolated from nosocomial infections in a hospital in
   Isfahan, Iran". [Press: "Bricks" lists "From Bricks to Brains: The
   Embodied Cognitive Science of LEGO Robots". Server: "efficacy" lists
   two preprints, both "Developing efficacy beliefs in the classroom".]
3. In the browser's address bar, add `&orderBy=publicationDate&orderDir=desc`
   to the end of the results page's address and open it:
   `/index.php/publicknowledge/en/search/index?query=Antimicrobial&dateFromYear=&dateFromMonth=&dateFromDay=&dateToYear=&dateToMonth=&dateToDay=&orderBy=publicationDate&orderDir=desc`
4. The same with `&orderBy=titel&orderDir=asc` (a misspelt title sort)
   in place of the step 3 addition.
5. The same with `&orderBy=featured` in place of the step 3 addition.
   [Press: the press knows this sort
   and lists the book.]

**Expected:** steps 3, 4 and 5 list the results of step 2 in the page's
usual order, the unknown sort ignored, as 3.5 does.

**Observed:** each answers HTTP 500 with an empty page: no heading, no
search form, no message. The server log has, for steps 3, 4 and 5:

```
PHP Fatal error:  Uncaught Exception: Order-by "publicationDate" not supported by DatabaseEngine! in lib/pkp/classes/search/engines/DatabaseEngine.php:113
PHP Fatal error:  Uncaught Exception: Order-by "titel" not supported by DatabaseEngine! in lib/pkp/classes/search/engines/DatabaseEngine.php:113
PHP Fatal error:  Uncaught Exception: Features not supported in 1! in lib/pkp/classes/search/engines/DatabaseEngine.php:108
```

The same address with `&orderBy=title&orderDir=asc` lists the results.

## Cause

`SubmissionSearchResult::builderFromRequest()` (lib/pkp
`classes/search/SubmissionSearchResult.php`, lines 58-60) passes the
request's `orderBy` to the search builder whatever its value. It checks
`orderDir` (anything but `asc` is `desc`), but not the column:

```php
if ($orderBy = $request->getUserVar('orderBy')) {
    $builder->orderBy($orderBy, $request->getUserVar('orderDir') == 'asc' ? 'asc' : 'desc');
}
```

The engines take the builder's orders as a contract with the code that
built it, and refuse what they cannot apply. `DatabaseEngine::buildQuery()`,
the default `database` driver, knows `datePublished`, `title` and, on a
press only, `featured`; any other value reaches its `default:` branch
(line 113) and throws. `featured` on a journal or a server throws at
line 108. The exception is not caught, so the page answers 500.

Why this is a regression: 3.5 read the sort in
`SubmissionSearch::getResultSetOrdering()`, which checks `orderBy`
against the app's sort options (`score`, `authors`, `publicationDate`,
`title` and the others) and falls back to relevance for any other
value. The rewrite for `pkp/pkp-lib#8920` replaced it with the
unchecked pass-through and renamed the date sort to `datePublished`, so
a 3.5 link that named a sort now fails unless that sort is `title`.

Reach:

- The Search page on a journal, a press and a preprint server (walked).
- The category pages: `PKPCatalogHandler::category()` builds its list
  with the same `builderFromRequest()`, so a category address carrying
  an unknown `orderBy` fails the same way on a journal and a preprint
  server (code). On a press any `orderBy` on a category address fails,
  known or not: the handler adds the featured order after the request's,
  and the engine accepts only one ("Only a single order condition is
  accepted by DatabaseEngine!") (code). That failure has a cause of its
  own. The fix proposed in
  [pkp-e2e#597](https://github.com/jardakotesovec/pkp-e2e/issues/597)
  (a category's "Order of articles" ignored) cures it by letting the
  engine take several orders.
- The OpenSearch driver (`OpenSearchEngine::buildQuery()`) also throws on
  an order it has not consumed ("Unsupported order-by"), so the same
  link fails there too (code, not walked).
- Line 107, `if ($applicationName = Application::get()->getName() !=
  'omp')`, assigns the comparison's result, so its message reads
  "Features not supported in 1!" rather than naming the app. That is the
  log line only; the page fails either way.
- The date sort `main` does know, `datePublished`, fails on PostgreSQL
  for a reason of its own:
  [pkp-e2e#718](https://github.com/jardakotesovec/pkp-e2e/issues/718).
  This fix leaves it alone.

## Proposed fix

Proposed: let `builderFromRequest()` pass on only the sorts the search
engines support, and ignore any other value, as 3.5 did and as the REST
API's controllers do with their `orderBy` parameter
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-unknown-sort-error-page/fix.diff),
paths from the app root, the same for the three apps):

```diff
-        if ($orderBy = $request->getUserVar('orderBy')) {
+        // Pass on only a sort the search engines support; ignore any other (a typo, a 3.5 name)
+        $orderBy = $request->getUserVar('orderBy');
+        if (in_array($orderBy, ['datePublished', 'title'], true)) {
             $builder->orderBy($orderBy, $request->getUserVar('orderDir') == 'asc' ? 'asc' : 'desc');
         }
```

The list holds the only two `orderBy` values `d6a9c82dbf` introduced.
They are also the only two that both `DatabaseEngine` and
`OpenSearchEngine` apply. The check sits where the request is read, as
`PKPSubmissionController` checks its `orderBy` against the collector's
`ORDERBY_*` values. The strict `in_array()` also turns away an array
(`orderBy[]=…`). A plugin that wants another sort would have to add it
to the builder itself, in the `SubmissionSearchResult::builderFromRequest`
hook, which runs after this check.

Tried on `main` on all three apps: with the fix in, steps 3, 4 and 5
list the results of step 2 and the server logs nothing. A side check on
the same results page, once with the fix and once without, gave the same
answers both times: the title sort both ways listed the results, the
date sort `datePublished` still reached the engine and failed on
PostgreSQL as in pkp-e2e#718, and on a press `orderBy=featured` listed
the book.

**Alternatives:**
- Make the engines ignore an order they do not know: two engines to
  change, and they would no longer catch an order the code asks for by
  mistake.
- Catch the exception in `SearchHandler::search()` and show "No
  Results": the reader still loses results that exist.

**What goes with it:**
- On a press's category page the fix rescues only an unknown `orderBy`.
  A known one (`title`, `datePublished`) still adds a second order and
  still fails with "Only a single order condition…" until the fix for
  pkp-e2e#597 lands.
- `SearchHandler` and `PKPCatalogHandler` still hand the raw `orderBy`
  to the template, so the next page's links carry a dropped value on.
  That is harmless: each request drops it again.
- On a press, the Search page no longer honours `orderBy=featured` from
  the address. No screen offers that sort there; the category pages add
  it in code, after this check, and keep it.
- 3.5, 3.4 and 3.3 check the sort already, so there is nothing to
  backport.
- The guard: a unit test of `builderFromRequest()`: an unknown `orderBy`
  gives a builder without an order, a known one gives that order. An
  e2e case in which a Search address with an unknown sort lists the
  results would catch it on the page.

Small: one allow-list in one shared method, following the REST
controllers' pattern, with no change to the API or to stored data.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-unknown-sort-error-page/walk.js)
  takes the Steps as a visitor on OJS, OMP and OPS and records each
  address's status, what it lists and the server log's error lines.
  `NB=1` runs the side check alone. Run it from the pkp-e2e repo on an
  install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-unknown-sort-error-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/search-unknown-sort-error-page/fix.diff ojs omp ops`,
  the walk above, then the side check with `NB=1` with the fix in and
  again after `node bin/try-fix.js revert …` with the fix out, each on a
  freshly reloaded dataset. In each search, the matching items all have
  the same publication date and the same title. So the side check
  proves only that `title` and `datePublished` are still passed on, not
  that the results come back in the right order.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  each install freshly loaded from pkp/datasets 401a013 (2026-10-06),
  with the dataset's own error settings (`display_errors` and
  `show_stacktrace` Off). On 3.5 steps 3, 4 and 5 list the results of
  step 2 with HTTP 200 and nothing in the server log, on all three apps.
  The fault does not depend on the database: the exception is thrown
  before any query runs (MySQL not checked).
- Tips: `main` OJS 92bc2bb467 (lib/pkp e60013c77f), OMP a0e6d0a8b and
  OPS 7e34fdd57e (lib/pkp 5a5ab2d6c7); `stable-3_5_0` OJS b8f5e9a951, OMP
  7d6b00060, OPS acc0de0586 (lib/pkp 6d7f1540b6); `stable-3_4_0` OJS
  d68934d0d1, OMP 0aec65441, OPS acd8ae704b, lib/pkp 767353f4fe;
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp
  ac3fa73402. `SubmissionSearchResult.php`, `DatabaseEngine.php`,
  `SearchHandler.php` and `PKPCatalogHandler.php` are identical in the
  three `main` checkouts.
- Code reads: on `main`, `SubmissionSearchResult::builderFromRequest()`,
  `DatabaseEngine::buildQuery()`, `OpenSearchEngine::buildQuery()` (its
  order handling and the unconsumed-builder checks),
  `SearchHandler::search()`, `PKPCatalogHandler::category()`,
  `PKPSubmissionController` (its `orderBy` check), and the apps'
  `search.tpl` and `catalogCategory.tpl` (no sort control; `page_links`
  carries `orderBy` and `orderDir`, the request's own values); a grep of
  the three apps' templates and plugins for `orderBy` finds nothing else
  that builds a link with a sort. On 3.5, 3.4 and 3.3 (lib/pkp
  `classes/search/SubmissionSearch.php`, `.inc.php` on 3.3):
  `getResultSetOrdering()` checks `orderBy` against
  `getResultSetOrderingOptions()` and falls back to `score`; OJS and OPS
  call it from `SearchHandler`, OMP from `SubmissionSearch::retrieveResults()`.
  No `engines/` directory on those branches. 3.5's search pages carry
  no `orderBy` in their paging links. Nothing in 3.5 builds a link with
  a sort: a grep of its three apps' templates, pages and plugins
  (bundled themes and the sitemap included) for `orderBy` and
  `searchResultOrderOptions` finds only `SearchHandler`, which assigns
  the options to a template no bundled theme uses.
- Introduced: `git blame` on `SubmissionSearchResult.php` lines 58-60 and
  on `DatabaseEngine.php` line 113 gives `d6a9c82dbf` ("pkp/pkp-lib#8920
  Add sorting support"), unchanged since; lines 107-108 are `818aeda367`
  ("pkp/pkp-lib#8920 Fix feature sorting for OMP", 2026-01-14). The
  GitHub API's `commits/<sha>/pulls` names `pkp/pkp-lib#12199` (merged
  2026-01-22).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched on 2026-10-07 by the symptom (search sort, `orderBy`, error
  500) and by the cause's class, method and error texts
  (`builderFromRequest`, `DatabaseEngine`, "not supported by
  DatabaseEngine", "Unsupported order-by", "Features not supported");
  nothing about this fault.
