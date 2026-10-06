# On the site-wide Search page, "By Journal" limits the first page only and never shows as chosen

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code; no "By Journal" select)
- **Introduced** `pkp/ojs#5267` with `pkp/pkp-lib#12199` for `pkp/pkp-lib#8920` · [9771be0e21](https://github.com/pkp/ojs/commit/9771be0e215f3021dcd10e4f6362b31a5b699e45) · 2026-01-09 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ojs2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a site that hosts several journals, a reader on the site-wide Search
page chooses a journal under "By Journal" and presses "Search". The first
page of results is limited to that journal, but the select shows its
blank entry again, so nothing on the page says a journal is in force.

The page links below the results drop the choice. Page 2 and every page
after it list the whole site, and the count jumps from the journal's
total to the site's, with nothing telling the reader that the filter is
gone. A second search from the same form, with the select now blank,
searches the whole site from page 1.

No release has it: it is on `main`, the coming 3.6, and 3.5 keeps the
chosen journal.

## Impact

- **Lost**: a correct list of one journal's articles past the first page
  of results, or on any search after the first.
- **Who**: readers of a site that hosts more than one journal, on the
  site-wide Search page, whenever a search with a journal chosen gives
  more than one page of results (25 articles by default). No link on the
  default theme's pages leads to the site-wide Search page, so a reader
  reaches it by typing its address or by a link from outside the site.
  Other themes were not checked.
- **Way round**: the journal's own Search page (its header's "Search"
  link) lists only that journal's articles on every page.

Medium: the search misleads silently, but only on a page that few
readers reach. It would be high on a site whose administrator adds a
"Search" item to the site's navigation menu, which links to the
site-wide Search page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`: the journal
  "Journal of Public Knowledge" (`publicknowledge`) with two published
  articles, "Signalling Theory Dividends" (1) and "Antimicrobial, heavy
  metal resistance and plasmid profile of coliforms isolated from
  nosocomial infections in a hospital in Isfahan, Iran" (17), both in
  "Vol. 1 No. 2 (2014)".
- In `config.inc.php`, under `[interface]`, `items_per_page = 1`. The
  site-wide Search page takes its page size from this setting, and the
  dataset's 25 would put both articles on one page.
- A second journal with published articles, made as `admin`:
  - Administration › Hosted Journals › "Create Journal": title "Second
    Journal u15e", initials "SJ", path `u15e`, "Enable this journal to
    appear publicly on the site" ticked; "Save".
  - In Journal of Public Knowledge, Tools › "Native XML Plugin" ›
    "Export Issues": tick "Vol. 1 No. 2 (2014)", "Export Issues",
    "Download Exported File".
  - In Second Journal u15e, Tools › "Native XML Plugin" › "Import":
    upload that file, "Import". The results read "The import completed
    successfully." and list both articles and the issue, followed by
    "Errors occured:" and a line per author such as "The author 'Alan'
    does not have any contributor role. Defaults to AUTHOR.". Those lines
    are warnings: the articles are imported and published in Second
    Journal u15e, each author with the Author role.
  - On the server, `php tools/rebuildSearchIndex.php`, then
    `php lib/pkp/tools/jobs.php run`. An import does not add its articles
    to the search index on `main`, so this rebuild does.

Steps, as a visitor (signed out):

1. Open the site-wide Search page by typing its address:
   `/index.php/index/search`.
2. Under "Advanced filters", choose "Journal of Public Knowledge" in
   "By Journal". Leave the box empty and press "Search". [3.5: an empty
   box lists nothing there, so type "potential", a word both articles
   carry.]
3. Look at the "By Journal" select and the line under the results.
4. Press "2" in the page links under the results.
5. Press "3".

**Expected**: after step 2 the select still shows "Journal of Public
Knowledge". The results read "1 - 1 of 2 items", page 2 reads
"2 - 2 of 2 items", and both pages list Journal of Public Knowledge
articles only. There is no page 3.

**Observed**: after step 2 the first page reads "1 - 1 of 2 items" and
lists a Journal of Public Knowledge article, but the select shows its
blank entry. Every page link under the results carries an empty journal
choice:

```
/index.php/index/en/search/index?query=&searchContext=&authors=&…&searchPage=2#results
```

Page 2 reads "2 - 2 of 4 items" with page links "1 2 3 4": the whole
site's count. Page 3 lists "Antimicrobial, heavy metal resistance and
plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran" under "Second Journal u15e".

A search with no journal chosen also reads "1 - 1 of 4 items". On 3.5
the same steps keep "Journal of Public Knowledge" in the select, the
page links carry `searchJournal=1`, and page 2 reads "2 - 2 of 2 items".

## Cause

`PKP\pages\search\SearchHandler::search()` in pkp-lib (lines 54 to 65 on
`main`) gives the template the journal of the request's address, not the
journal being searched:

```php
$context = $request->getContext();
$collector->filterByContextIds($context ? [$context->getId()] : null);
…
'searchContext' => $context?->getId(),
```

On the site-wide page the request has no journal, so `searchContext` is
always null there. The journal the reader chose is applied only inside
`SubmissionSearchResult::builderFromRequest()` (line 36), which reads
`searchContext` from the request to filter the query and stores it in
the builder as `contextId`. OJS's `templates/frontend/pages/search.tpl`
uses `$searchContext` twice: to mark the chosen option `selected`
(line 75) and to carry the choice in `{page_links … searchContext=$searchContext …}`
(line 125). Both get null, so the select shows blank and every page
link carries `searchContext=` empty, which the next request reads as
"all journals".

This came with `pkp/ojs#5267` (9771be0e21), which moved the request
parsing into `builderFromRequest()` so that search and category browse
share it. Before it, `SearchHandler::search()` computed
`$contextId = $context?->getId() ?? (int) $request->getUserVar('searchContext')`
itself and assigned that. The move kept the filter but changed the
assignment to `$context?->getId()`. pkp-lib
[24553ea4aa](https://github.com/pkp/pkp-lib/commit/24553ea4aaf13dd5ca5c709a2254ae21be11a08e)
(`pkp/pkp-lib#12199`) then moved the handler into pkp-lib as it stood.

Reach:

- The Year lists of "Published After" and "Published Before" on the
  site-wide page: the same change narrowed their year range to the
  request's journal instead of the chosen one, so with a journal chosen
  they offer the years of the whole site (code; 3.5 narrows them to the
  chosen journal). The dataset's articles share one year, so the walk
  could not show it.
- OMP and OPS: the handler is shared, but their site-wide Search page
  offers no journal choice, so no screen sends `searchContext` there
  (code and screen).
- Category browse (`PKPCatalogHandler`, line 96) assigns
  `searchContext` the same way, but a category page always has a
  journal in its address, so its value is right (code).

## Proposed fix

A proposal; the team decides. Read the journal being searched back from the builder, the way the
handler already reads the query (`'query' => $builder->query`), and use
it for the year range and the template
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/by-journal-choice-lost-after-search/fix.diff)):

```diff
         $builder = (new SubmissionSearchResult())->builderFromRequest($request, $rangeInfo);
+        // The journal searched: the request's own, or the one chosen under "By Journal" on the site-wide page
+        $contextId = ($builder->wheres['contextId'] ?? null) ?: null;
         $results = $builder->paginate($rangeInfo->getCount(), 'submissions', $rangeInfo->getPage());
…
         $collector = Repo::publication()->getCollector();
-        $context = $request->getContext();
-        $collector->filterByContextIds($context ? [$context->getId()] : null);
+        $collector->filterByContextIds($contextId ? [$contextId] : null);
…
-            'searchContext' => $context?->getId(),
+            'searchContext' => $contextId,
…
-        if (!$context) {
+        if (!$request->getContext()) {
```

The builder is the one place that decides which journal is searched, and
a plugin on the `SubmissionSearchResult::builderFromRequest` hook can
change it, so the page shows what the query actually used. Inside a
journal the value is that journal's id, as before. The `?: null` keeps
"all journals" as null, so the page links stay as they are today when
no journal is chosen. The value is read before `paginate()`, so it does
not depend on the search engine leaving the builder as it found it
(`OpenSearchEngine::buildQuery()` unsets the `wheres` it uses, on a
clone). This keeps what `pkp/ojs#5267` was for, one shared request
parser.

Tried on `main`: with it, the walk's select keeps "Journal of Public
Knowledge", the page links carry `searchContext=1`, and page 2 reads
"2 - 2 of 2 items". A neighbour check listed the same articles with and
without it, and only the select changed, as intended:

- With no journal chosen, the site-wide page still pages through all
  four articles, with the select blank.
- With Second Journal u15e chosen, it reads "1 - 1 of 2 items" from that
  journal, and with the fix the select keeps that journal.
- The journal's own Search page, and OMP's and OPS's own and site-wide
  Search pages, list what they listed before.

**Alternatives**:

- Read `searchContext` from the request again in the handler, as before
  `pkp/ojs#5267`: it works, but parses the request in a second place and
  ignores a plugin's change to the builder.
- Read the value in the template from the request: it would fix the
  select and the links but not the year range, and puts request parsing
  in a template.

**What goes with it**: no stored data to repair, and no backport. A
guard: an e2e scenario in which a journal chosen on the site-wide
Search page stays selected and survives the page links.

Small: one new line and four changed lines in one pkp-lib handler,
following the pattern it already uses for the query, and one e2e test.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/by-journal-choice-lost-after-search/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/by-journal-choice-lost-after-search/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset`
  with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/by-journal-choice-lost-after-search/walk.js`
  (`QUERY=potential` and `PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  The script writes `items_per_page = 1` into the install's config file
  and runs the two command-line tools of the preconditions itself;
  everything else goes through the screens. `NB=1` runs the neighbour
  check alone, on all three apps.
- The fix was tried on the `main` tips below with
  `node bin/try-fix.js apply shared/playwright/checks/issues/by-journal-choice-lost-after-search/fix.diff ojs omp ops`,
  the walk on OJS and `NB=1` on all three, then
  `node bin/try-fix.js revert …/fix.diff ojs omp ops` and `NB=1` again,
  each on a freshly loaded install. A first version of the diff read the
  builder after `paginate()`. The diff as linked was then tried on OJS
  in the same way (the walk and `NB=1`, then the revert); the results
  were the same. `NB=1` without the fix is unchanged.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS ff004d0973 (lib/pkp 987776cd04). Code read:
    `SearchHandler::search()`, `SubmissionSearchResult::builderFromRequest()`,
    `DatabaseEngine` (the `context_id` filter), OJS `search.tpl`; OMP
    3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6, the same handler)
    for their `search.tpl`, which have no journal select.
  - 3.5: OJS c1cee76b95 (lib/pkp 771474347e). Walked; the code read
    agrees: the app's own `SearchHandler::_assignSearchFilters()` assigns
    `searchJournal` as the chosen journal's id, and `search.tpl` selects
    it and carries it in the page links.
  - 3.4 (code): OJS `upstream/stable-3_4_0` d68934d0d1, lib/pkp
    `origin/stable-3_4_0` 767353f4fe: the same `searchJournal` handling
    as 3.5 in `pages/search/SearchHandler.php`,
    `classes/search/ArticleSearch.php` and `search.tpl`.
  - 3.3 (code): OJS `upstream/stable-3_3_0` ac77c9fb35, lib/pkp
    `origin/stable-3_3_0` ac3fa73402: `templates/frontend/pages/search.tpl`
    has no journal select, so there is no choice to lose.
- Introduced: traced with `git blame` on line 65 of pkp-lib's handler,
  then `git log -L` on OJS's `pages/search/SearchHandler.php`. The
  header's date, 2026-01-09, is the commit's; its PR was merged on
  2026-01-22. The commit is not on `stable-3_5_0`.
- The "Search" item of a navigation menu: read in the code only
  (`PKPNavigationMenuService`, `NMI_TYPE_SEARCH`), not driven. It is
  offered without a journal condition and builds its address with no
  journal, so on the site's own menu it leads to the site-wide Search
  page.
- Default theme only: that no link leads to the site-wide Search page
  was checked on the screens of OJS's default theme, the only theme OJS
  ships (the site home and About pages, a journal's home, Search and
  About pages; [U15 footnote i](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#fn-i)).
  Other themes were not looked at.
- MySQL not checked; nothing in the fault depends on the database.
