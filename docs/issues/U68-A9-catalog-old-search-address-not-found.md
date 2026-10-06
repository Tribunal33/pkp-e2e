# A reader on an old link to a press's catalog search gets "404 Not Found", not the Search page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2208` for `pkp/pkp-lib#8920` · [4d4f2c519](https://github.com/pkp/omp/commit/4d4f2c51989eb18533e563efcdfb9939b4f7e4f8) · 2026-01-14 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U68 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press's search box once sent readers to the press's address followed
by "catalog/results", and links and bookmarks to that address still
exist. Older releases forward it to the Search page. Now it answers a
bare page that reads only "404 Not Found", with no menus and no link.

To search, the reader has to shorten the address to the press's home
page, open Search from there and type the search again.

## Impact

- **Lost**: nothing. A reader on an old link lands on a dead end
  instead of the Search page.
- **Who**: readers who follow a link or bookmark made by a press on OMP
  3.2.0 or earlier. No page of the press links to the address. The
  fault is not yet in a release, so it can be fixed before any press
  meets it.
- **Way round**: the 404 page has no menus, so the reader removes the
  end of the address to reach the press's home page, presses "Search"
  there and types the search again.

Low: the reader gets where they were going with a few extra steps and
loses nothing. It would be medium if a press's old search links turned
out to be in wide use (indexes, library pages), which was not checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, loaded as is. Nothing to
  create. No sign-in: these are a reader's steps.

Steps:

1. Open the press's home page, `/index.php/publicknowledge`.
2. Press "Search" in the top menu. In the Search page's box, type
   "Bomb" and press "Search". The page opens at
   `/index.php/publicknowledge/en/search/search?query=Bomb` and lists
   "Bomb Canada and Other Unkind Remarks in the American Media".
3. Open the address that the press's search box used before OMP 3.2.1,
   in the form old links have it, with no language in it and the
   search words at the end:
   `/index.php/publicknowledge/catalog/results?query=Bomb`.
4. Open the address with the language and no search words:
   `/index.php/publicknowledge/en/catalog/results`.

**Expected**: step 3 opens the Search page from step 2, searching for
"Bomb". Step 4 opens the Search page with an empty search.

**Observed**: step 3 moves to
`/index.php/publicknowledge/en/catalog/results?query=Bomb`. That address
and the one in step 4 both answer status 404, with a page that has no
title and no press menus:

```
404 Not Found
```

An address the catalog never had,
`/index.php/publicknowledge/en/catalog/nosuch`, answers the same page.
On `stable-3_5_0`, steps 3 and 4 both open the Search page with an
empty search: the 3.5 forwarding drops the search words.

## Cause

`pages/catalog/index.php` in OMP still lists `results` among the
operations it hands to `APP\pages\catalog\CatalogHandler`:

```php
    case 'thumbnail':
    case 'results':
        return new APP\pages\catalog\CatalogHandler();
```

`CatalogHandler::results()` is gone. Commit 4d4f2c519, "Clean up old
code", removed it as part of the search rework for `pkp/pkp-lib#8920`.
The method had been marked "@deprecated Since OMP 3.2.1, use
pages/search instead" since `pkp/pkp-lib#5886` (2020) moved the press's
search to the Search page, and all it did was
`$request->redirect(null, 'search')`. The clean-up left the line in the
operation list.

`PKPPageRouter::route()` throws `NotFoundHttpException` when the
handler has no method named after the operation.
`PKPApplication::execute()` turns that exception into the bare
`<h1>404 Not Found</h1>` page. With or without the line in the list,
the address answers the same 404. The line left behind suggests the
removal of the method was not meant to end the address; deleting or
keeping it does not change the 404.

Reach:

- OJS and OPS have no such address (read in the code).
- The 3.5 forwarding sent readers to an empty Search page, because the
  redirect passed no parameters. Old links carry their words as
  `?query=` (in OMP 3.2.0, `searchForm_simple.tpl`, the press's search
  box, sent a GET form with a `query` field to `catalog/results`), so even on 3.5 the reader types
  them again (seen on screen).
- Other operation lists name methods their handlers no longer have.
  Examples: OMP `manageCatalog/homepage` and `user/toggleHelp`, OJS and
  OPS `search/similarDocuments`, OPS `gateway/lockss`. None of these is
  an address readers were given, and each answers the same 404 with or
  without its line (read in the code).

## Proposed fix

Bring back the forwarding in `CatalogHandler`, and this time carry the
reader's search words to the Search page. The new method, from
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-old-search-address-not-found/fix.diff)
(which adds it after `series()` in `pages/catalog/CatalogHandler.php`):

```diff
+    /**
+     * Forward the catalog's old search address (OMP 3.2.0 and earlier) to the
+     * Search page, keeping the reader's search words.
+     *
+     * @deprecated Since OMP 3.2.1, use pages/search instead.
+     *
+     * @param array $args
+     * @param Request $request
+     */
+    public function results($args, $request)
+    {
+        $query = (string) $request->getUserVar('query');
+        $request->redirect(null, 'search', 'search', null, $query !== '' ? ['query' => $query] : null);
+    }
```

`search/search` is the address the Search page's own box sends to
(`searchForm_simple.tpl` on `main`). `SubmissionSearchResult::builderFromRequest()`
reads `query` from it as `(string) $request->getUserVar('query')`, and
the method casts it the same way. Keeping an old address as a deprecated
forwarding is the code base's pattern: `PKPSubmissionHandler::wizard()`
("Backwards compatibility for old links to the submission wizard",
`@deprecated 3.4`) forwards the old submission address and carries its
`submissionId` along.
Restoring the method undoes part of the clean-up: five lines of
deprecated code stay. Nothing else is lost.

Tried on `main`. With the fix, step 3 opened the Search page at
`…/en/search/search?query=Bomb` listing the book, with "Bomb" in its
box, and step 4 opened it with an empty search. With the fix in and out,
the catalog page listed its two books, `catalog/nosuch` stayed a 404,
and the Search page with `?query=Bomb` was unchanged. That neighbour
check ran before the `(string)` cast was added; the Steps were walked
again with the cast in and gave the same result.

**Alternatives**:

- Delete `case 'results':` from `pages/catalog/index.php`. This
  finishes the clean-up. It suits a team that decides six years of
  forwarding were enough. Old links stay dead ends.
- Restore the method exactly as 3.5 has it. That works, but it lands
  the reader on an empty Search page.

**What goes with it**:

- No stored data, no API change and no plugin hook involved.
- No backport is needed. Carrying the
  search words there is an optional improvement, with the same method
  body.
- Left out: the other stale operation names (Cause, last bullet). A
  sweep of the operation lists is a separate clean-up.
- Guard: an e2e check that opens `catalog/results?query=…` and expects
  the Search page with those words.

Small: one method in one handler, following an existing pattern.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/catalog-old-search-address-not-found/walk.js)
  (it uses the helpers of
  [report-address-unknown-name-404/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/report-address-unknown-name-404/lib.js)).
  It runs on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp
  shared/playwright/checks/issues/catalog-old-search-address-not-found/walk.js`.
  Adding `neighbour` runs the fix's neighbour check: the catalog page,
  `catalog/nosuch` and the Search page with `?query=Bomb`.
- No server error and no script error was recorded on either line.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/catalog-old-search-address-not-found/fix.diff
  omp`, then the Steps and the neighbour check, then the neighbour check
  again after `revert`; after the cast, the Steps once more with the fix
  in.
- Tips: `main` OMP 3b0ecf794c (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  9c5e24246c; `stable-3_4_0` OMP 0aec65441; `stable-3_3_0` OMP
  8e72fc883.
- Code reads:
  - `main`: `pages/catalog/index.php`, `pages/catalog/CatalogHandler.php`,
    `pages/search/index.php`, `PKPPageRouter::route()`, the
    `NotFoundHttpException` handler in `PKPApplication::execute()`,
    `PKP\pages\search\SearchHandler::search()`,
    `SubmissionSearchResult::builderFromRequest()`,
    `PKPRequest::redirect()`, `searchForm_simple.tpl`, and
    `PKPSubmissionHandler::wizard()` for the forwarding pattern.
  - 3.5: `CatalogHandler::results()` (line 223) and `results` in
    `pages/catalog/index.php`.
  - 3.4: `CatalogHandler::results()` (line 216) and the operation list.
    3.3: `results()` in `CatalogHandler.inc.php` (line 189) and the
    operation list. Both redirect to `search` with no parameters.
  - OMP tag `3_2_0-2`: `CatalogHandler::results()` ran the search
    itself, and `searchForm_simple.tpl` sent a GET form with `query` to
    `catalog/results`.
  - Every `pages/*/index.php` of OJS, OMP and OPS on `main`, with their
    pkp-lib's, for operation names that no page handler method matches.
- Introduced: `git blame` on `case 'results':` gives 01088072a8 (2021,
  the move to returned handler objects). The method's removal is
  4d4f2c519, whose PR is `pkp/omp#2208` ("pkp/pkp-lib#8920 Homogenize
  browse and search interfaces", merged 2026-01-22). The deprecation
  came with 6d1122afb (`pkp/pkp-lib#5886`, 2020-05-29, ajnyga).
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ui-library; issues and
  PRs) by "catalog/results", "catalog results", "catalog search 404",
  "old search links redirect", "deprecated search address" and
  `CatalogHandler results`. Nothing matched. The `pkp/pkp-lib#8920`
  thread does not mention the old address.
- Not walked: OJS and OPS (no such address), and 3.4 and 3.3.
- MySQL not checked. The fault is in routing, not in a query.
