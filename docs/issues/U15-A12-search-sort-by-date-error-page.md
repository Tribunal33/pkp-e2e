# A Search link that sorts the results by published date shows an empty error page

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS (on PostgreSQL)
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` for `pkp/pkp-lib#8920` · [d6a9c82dbf](https://github.com/pkp/pkp-lib/commit/d6a9c82dbfe10cee6f2126501e2bb4c2616d7783) · 2026-01-13 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reader who opens a Search results link that asks for the results
sorted by published date (`orderBy=datePublished`, newest or oldest
first) gets an empty page instead of the results: the server fails. The
sort by title, asked for the same way, works.

No control on the page offers either sort, so only a typed, bookmarked
or shared link reaches it. Without the sort, the link lists the results.

It happens only on sites whose database is PostgreSQL; MySQL accepts the
query. No release has it: only `main`, the coming 3.6.

## Impact

- **Lost**: the results page for that link; nothing stored changes.
- **Who**: a reader, signed in or not, who follows a link carrying the
  sort. Nothing in the app builds such a link today: the category
  pages, which could ask for the date sort, ignore their "Order of
  articles" setting on `main`
  ([pkp-e2e#597](https://github.com/jardakotesovec/pkp-e2e/issues/597)),
  so no manager can make one sort by date.
- **Way round**: open the link without its `orderBy` part, or search
  again from the page; the results then come in the page's usual
  order.

Low: only a hand-made link meets it, on PostgreSQL only, and the results
are one search away. It would be medium once a screen or theme offers
the date sort, or once pkp-e2e#597 is fixed so that every category page at its
default "Publication date (newest first)" asks for it.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, on PostgreSQL, context
  `publicknowledge`, as a visitor (not signed in). Nothing is created.
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
3. In the browser's address bar, add `&orderBy=datePublished&orderDir=desc`
   to the end of the results page's address and open it:
   `/index.php/publicknowledge/en/search/index?query=Antimicrobial&dateFromYear=&dateFromMonth=&dateFromDay=&dateToYear=&dateToMonth=&dateToDay=&orderBy=datePublished&orderDir=desc`
4. The same with `orderDir=asc`.

**Expected:** the results of step 2, newest first in step 3 and oldest
first in step 4.

**Observed:** steps 3 and 4 each answer HTTP 500 with an empty page: no
heading, no search form, no message. The server log has, for each:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[42803]: Grouping error: 7 ERROR:  column "cp.date_published" must appear in the GROUP BY clause or be used in an aggregate function
[500]: GET /index.php/publicknowledge/en/search/index?query=Antimicrobial&…&orderBy=datePublished&orderDir=desc
```

The same address with `orderBy=title&orderDir=asc` lists the article.

## Cause

`SubmissionSearchResult::builderFromRequest()` (lib/pkp
`classes/search/SubmissionSearchResult.php`, line 58) passes the
request's `orderBy` and `orderDir` to the search builder.
`DatabaseEngine::buildQuery()` (lib/pkp
`classes/search/engines/DatabaseEngine.php`, lines 198-201), the default
`database` driver, answers `datePublished` by joining the current
publication as `cp` and ordering by the bare column:

```php
->when($orderBy == 'datePublished', function ($q) use ($orderBy, $orderDirection) {
    $q->leftJoin('publications AS cp', 's.current_publication_id', 'cp.publication_id')
        ->orderBy('cp.date_published', $orderDirection);
})
```

The query is grouped by `s.submission_id` (one row per submission,
since `submissions_fulltext` holds a row per publication and locale).
PostgreSQL refuses an `ORDER BY` on a column that is neither grouped nor
aggregated. MySQL accepts it, because its `ONLY_FULL_GROUP_BY` mode
allows a column that depends on the grouped key, as this one does
through the join on the publication's primary key. The title order
beside it orders by `MIN(title_current.setting_value)` and the featured
order by `COALESCE(MAX(f.seq), 999999)`; only the date order uses a bare
column.

Why this is a regression: 3.5 sorted Search results by publication date
when the address asked for it, under the name `publicationDate`. The
rewrite for `pkp/pkp-lib#8920` renamed the sort `datePublished`, and
that sort fails on PostgreSQL, so the date sort that worked in 3.5 is
broken on `main`.

Reach:

- The Search page on a journal, a press and a preprint server, both
  directions (walked).
- The category pages (`PKPCatalogHandler::category()`) build their list
  with the same `builderFromRequest()`, so a category address carrying
  `orderBy=datePublished` reaches the same line on a journal and a
  preprint server (code). On a press the handler adds the featured order
  as well, and two orders fail earlier, in the engine's "Only a single
  order condition" check (code).
- [pkp-e2e#597](https://github.com/jardakotesovec/pkp-e2e/issues/597)
  (a category's "Order of articles" ignored) proposes that every
  category page pass its own order to the builder. At the default
  "Publication date (newest first)" that order is `datePublished`, so
  the fix for #597 needs this report's one-line change too; its diff
  already carries it.
- The OpenSearch driver (`OpenSearchEngine`) sorts on its own
  `datePublished` field and is not affected (code, not walked).
- A neighbour with its own cause, not part of this fix: any `orderBy`
  value the engine does not know fails with the same empty page (walked
  for `publicationDate`, 3.5's name, on the three apps: `Order-by
  "publicationDate" not supported by DatabaseEngine!`). `featured` on a
  journal or server fails with "Features not supported in 1!": line 107,
  `if ($applicationName = Application::get()->getName() != 'omp')`,
  assigns the comparison's result rather than the app's name (code).

## Proposed fix

Proposed: order by an aggregate of the date, as the title and featured
orders beside it do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-sort-by-date-error-page/fix.diff),
paths from the app root, the same for the three apps):

```diff
             ->when($orderBy == 'datePublished', function ($q) use ($orderBy, $orderDirection) {
                 $q->leftJoin('publications AS cp', 's.current_publication_id', 'cp.publication_id')
-                    ->orderBy('cp.date_published', $orderDirection);
+                    ->orderBy($q->raw('MAX(cp.date_published)'), $orderDirection);
             })
```

Each submission joins exactly one current publication, so
`MAX(cp.date_published)` is that publication's date and the sort keeps
the meaning `d6a9c82dbf` gave it.

Tried on `main` on all three apps: with the fix in, steps 3 and 4 list
the results of step 2 and the server logs nothing. A side check ran on
the bare Search page ("Bricks" on a press), once with the fix and once
without. The list with no sort and the title sort both ways were
identical both times. The date sort failed without the fix and listed
every item with it.

**Alternatives:**
- Add `cp.date_published` to the `GROUP BY`: also valid, but it departs
  from the aggregate pattern the other two orders use.
- Refuse `datePublished` in `builderFromRequest()`: it would hide the
  date sort, not repair it.

**What goes with it:**
- 3.5, 3.4 and 3.3 have no `DatabaseEngine`, so there is nothing to
  backport.
- Recommended as a separate change: `builderFromRequest()` passes on
  only the sorts the engine knows and ignores any other value, as 3.5
  did, so a typo or a 3.5 link with `publicationDate` lists the results
  in the page's usual order instead of failing.
- The guard: an e2e case in which a Search address asking for the date
  sort, in either direction, lists the results in date order, on items
  with different publication dates. pkp's CI runs PostgreSQL, so the
  case catches the fault there.

Small: one line in the shared engine and one test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/search-sort-by-date-error-page/walk.js)
  takes the Steps as a visitor on OJS, OMP and OPS and records each
  address's status, what it lists and the server log's error lines.
  `NB=1` runs the side check alone. Run it from the pkp-e2e repo on an
  install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/search-sort-by-date-error-page/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  each install freshly loaded from pkp/datasets e8dafbc (2026-10-02),
  with the dataset's own error settings (`display_errors` and
  `show_stacktrace` Off).
- Databases: the query's shape (the full-text table joined to
  submissions, the current publication left-joined, grouped by
  submission, ordered by the bare date) was run on two scratch tables
  each. PostgreSQL (Postgres.app, latest) gives the error above;
  MySQL 9.4 in its default `sql_mode` (`ONLY_FULL_GROUP_BY` on) returns
  the rows in date order. With `MAX(cp.date_published)`, PostgreSQL
  returns them in date order both ways. MariaDB was not checked; it
  does not turn `ONLY_FULL_GROUP_BY` on by default.
- On 3.5 the same Steps list the results at steps 3 and 4 (HTTP 200):
  3.5 does not know `datePublished`, and
  `SubmissionSearch::getResultSetOrdering()` falls back to relevance
  for an unknown value. Its date sort, `publicationDate`, is sorted in
  PHP by `getSparseArray()`.
- The dataset's published items all carry one publication date
  (2 October 2026), so the fix trial could not show their order on
  screen; the order rests on the scratch-table check above.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441f, OPS
  acd8ae704b, lib/pkp 767353f4fe; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc8836, OPS c5532e2161, lib/pkp ac3fa73402. `DatabaseEngine.php`
  and `SubmissionSearchResult.php` are identical in the three `main`
  checkouts.
- Code reads: on `main`, `SubmissionSearchResult::builderFromRequest()`,
  `DatabaseEngine::buildQuery()`, `search()` and `paginate()`,
  `OpenSearchEngine` (its sort), `SearchHandler::search()`,
  `PKPCatalogHandler::category()`, and the apps' `search.tpl` and
  `catalogCategory.tpl` (no sort control; `page_links` carries
  `orderBy` and `orderDir`). On 3.5, 3.4 and 3.3 (lib/pkp
  `classes/search/`): no `engines/` directory;
  `SubmissionSearch::getResultSetOrdering()` checks `orderBy` against
  `getResultSetOrderingOptions()` (OJS `ArticleSearch`: `score`,
  `authors`, `issuePublicationDate`, `publicationDate`, `title`,
  popularity) and falls back to `score`.
- Introduced: `git blame` on `DatabaseEngine.php` lines 198-201 and on
  `SubmissionSearchResult.php` lines 58-60 gives `d6a9c82dbf`
  ("pkp/pkp-lib#8920 Add sorting support"), unchanged since; the GitHub
  API's `commits/<sha>/pulls` names `pkp/pkp-lib#12199` (merged
  2026-01-22).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched on 2026-10-03 by the symptom and by the cause's class and
  error text, and the comments of `pkp/pkp-lib#8920` read; nothing about
  this fault.
