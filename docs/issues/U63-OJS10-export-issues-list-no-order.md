# A journal manager's "Export Issues" list shows the issues in no set order

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code read, not walked)
  - 3.3: none (code read; sorted by current issue, then date published)
- **Introduced** `pkp/ojs#3162` for `pkp/pkp-lib#7129` · [88aaa6b49f](https://github.com/pkp/ojs/commit/88aaa6b49f818e53145bc0cfa5068542a7b2e1e7) · authored 2021-07-14, merged 2021-08-31 · Erik Hanson (ewhanson)
- **Upstream** `pkp/pkp-lib#7732` (open): the same list, reported on 3.3, where it was sorted and only issues sharing a publication date came in the order they were entered; it asks for volume and number order, which the fix here does not give
- **Tracked in** spec U63 [OJS10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs10)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The "Export Issues" list of the "Native XML Plugin" and of the "PubMed
XML Export Plugin" should list a journal's issues in an order a manager
can follow, as the Issues page does. Instead the list is not sorted by
anything the manager can see: published and unpublished issues come
mixed, the current issue need not come first, and an issue that a
manager edits and saves moves to the bottom.

The export itself works. But to find the issue to tick, the manager
reads the whole list, page after page once the journal has more than 25
issues. Seen on PostgreSQL; MySQL was not checked.

## Impact

- **Lost.** Time only: the export holds what is ticked.
- **Who.** A journal manager or editor using Tools › Import/Export ›
  "Native XML Plugin" or "PubMed XML Export Plugin", tab "Export
  Issues", on any journal with more than a couple of issues.
- **Way round.** None: the list has no search or filter. Setting "Items
  per page" to 100 brings most journals' issues onto one page, still
  unsorted.

Low: the export gets done and only the manager's time is lost; a
journal with a long back catalogue, paging through dozens of issues,
would argue for medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL. Its journal
  `publicknowledge` holds two issues: "Vol. 1 No. 2 (2014)" (published,
  the current issue) and "Vol. 2 No. 1 (2015)" (unpublished). The
  Observed lists are PostgreSQL's; MySQL was not checked, and its own
  storage order may make steps 2, 6 and 7 look right there.
- Nothing else. The steps create two more future issues on screen, so
  that the order shows.

Steps:

1. Sign in as `dbarnes`.
2. Tools › Import/Export › "Native XML Plugin", tab "Export Issues".
   Read the list.
3. Issues (`/index.php/publicknowledge/en/manageIssues`), "Future
   Issues", "Create Issue": Volume 3, Number 1, Year 2016, Title
   "u63ir16", "Save".
4. "Create Issue" again: Volume 1, Number 1, Year 2013, Title
   "u63ir16", "Save". "Future Issues" now reads "Vol. 1 No. 1 (2013):
   u63ir16", "Vol. 2 No. 1 (2015)", "Vol. 3 No. 1 (2016): u63ir16";
   "Back Issues" reads "Vol. 1 No. 2 (2014)".
5. Tools › Import/Export › "Native XML Plugin", tab "Export Issues".
   Read the list.
6. Issues › "Back Issues", the arrow of "Vol. 1 No. 2 (2014)", "Edit",
   tab "Issue Data", "Save" (nothing changed).
7. Tools › Import/Export › "Native XML Plugin", tab "Export Issues".
   Read the list.
8. Tools › Import/Export › "PubMed XML Export Plugin", tab "Export
   Issues". Read the list.

**Expected:** the published issues as "Back Issues" lists them (the
current issue first), then the unpublished ones as "Future Issues" lists
them, the same at every visit and in both tools. At step 2:

```
Vol. 1 No. 2 (2014)
Vol. 2 No. 1 (2015)
```

At steps 5, 7 and 8:

```
Vol. 1 No. 2 (2014)
Vol. 1 No. 1 (2013): u63ir16
Vol. 2 No. 1 (2015)
Vol. 3 No. 1 (2016): u63ir16
```

**Observed:** at step 2 the unpublished issue comes above the current
one; at step 5 the issues read in the order they were stored; after the
save in step 6 the saved issue drops to the bottom, in both tools:

```
step 2:      Vol. 2 No. 1 (2015)
             Vol. 1 No. 2 (2014)

step 5:      Vol. 2 No. 1 (2015)
             Vol. 1 No. 2 (2014)
             Vol. 3 No. 1 (2016): u63ir16
             Vol. 1 No. 1 (2013): u63ir16

steps 7, 8:  Vol. 2 No. 1 (2015)
             Vol. 3 No. 1 (2016): u63ir16
             Vol. 1 No. 1 (2013): u63ir16
             Vol. 1 No. 2 (2014)
```

## Cause

`ExportableIssuesListGridHandler::loadData()`
(`controllers/grid/issues/ExportableIssuesListGridHandler.php`), the
list both tools load, builds its query from
`Repo::issue()->getCollector()->filterByContextIds([...])` and never
calls `orderBy()`. The issue Collector adds an `ORDER BY` only for an
`ORDERBY_*` constant, so the query has none, and the database returns
the rows in whatever order it reads them. PostgreSQL reads them in
storage order, and an `UPDATE` writes a new row version, which is why a
saved issue moves to the end. Each page of the list is a separate
`LIMIT`/`OFFSET` query on that unordered set.

Before 88aaa6b49f (`pkp/pkp-lib#7129`, the move of issues to the
Repository and Collector) the method called `IssueDAO::getIssues()`,
whose query ended `ORDER BY current DESC, date_published DESC`. The
refactor replaced the call with a Collector and dropped the order. The
Collector does have one ordering over published and unpublished issues
together, `ORDERBY_SHELF` (current issue first, then year, volume and
number, oldest first), but nothing calls it; see the Alternatives.

Reach:

- Only the two tools that load this list: Native XML and PubMed XML
  (both `index.tpl` load `grid.issues.ExportableIssuesListGridHandler`;
  seen on screen in both). DOAJ exports articles only, and Crossref and
  DataCite export issues from the DOIs page, not from this list.
- The same mistake, an issue Collector with no `orderBy()` behind a
  list a person reads, in three more places, read in the code:
  - the "Issues" filter of Statistics › Articles (`StatsHandler`, the
    `stats/publications.tpl` branch);
  - `GET /api/v1/issues` without an `orderBy` parameter
    (`IssueController::getMany()`), whose `count`/`offset` pages are
    unordered too;
  - the DOIs page's "Issue DOIs" list, where Crossref and DataCite
    deposits of issues are chosen, which reads that API with no
    `orderBy` (`DoisHandler`, `getParams` empty).
- Not this fault: the reader's "Archives", which sorts by the saved
  "Back Issues" order alone (`Collector::ORDERBY_SEQUENCE` in
  `IssueHandler::archive()`), so it is unsorted only until an order is
  saved. That came in with `pkp/pkp-lib#3705` in 2018 and needs its own
  fix.

## Proposed fix

List the published issues as "Back Issues" does, then the unpublished
ones as "Future Issues" does, reusing the two orderings those grids
already use, and page the joined list with
`VirtualArrayIterator::factory()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-issues-list-no-order/fix.diff)):

```php
$published = Repo::issue()->getCollector()
    ->filterByContextIds([$journal->getId()])
    ->filterByPublished(true)
    ->orderBy(Collector::ORDERBY_PUBLISHED_ISSUES)
    ->getMany()
    ->toArray();
$unpublished = Repo::issue()->getCollector()
    ->filterByContextIds([$journal->getId()])
    ->filterByPublished(false)
    ->orderBy(Collector::ORDERBY_UNPUBLISHED_ISSUES)
    ->getMany()
    ->toArray();

return VirtualArrayIterator::factory($published + $unpublished, $this->getGridRangeInfo($request, $this->getId()));
```

The list then reads the way the manager knows it from the Issues page,
including an order saved with "Order" on "Back Issues", and on MySQL and
PostgreSQL alike (each ordering is the one its own grid already runs on
both). Both arrays are keyed by issue ID, so `+` keeps the order and the
row IDs the selection boxes post. The grid loads every issue of the
journal on each page, as "Back Issues" already does for the published
ones; a journal holds hundreds of issues at most.

Tried on `main`: the Steps then showed the Expected lists, and paging
and an export from page 2 were unchanged.

**Alternatives:**

- `->orderBy(Collector::ORDERBY_SHELF)` on the existing query: one line,
  and paging stays in SQL. On the Steps' data, with one published
  issue, it gives the same Expected lists. With more published issues
  it is not enough: after the current issue the back issues come oldest
  first where "Back Issues" lists them newest first, the future issues
  are mixed in among them by year, and an order saved with "Order" on
  "Back Issues" is ignored. A second published issue, or a saved order,
  would show the difference on screen; that was not walked.
- Restore `ORDER BY current DESC, date_published DESC` (a new Collector
  ordering). Unpublished issues have no publication date, so they would
  still come in no order among themselves: PostgreSQL sorts empty dates
  first in a descending order, so they would come right after the
  current issue; MySQL sorts them last.
- One new Collector ordering for all issues: `published` first, then
  the columns of `ORDERBY_PUBLISHED_ISSUES`, then those of
  `ORDERBY_UNPUBLISHED_ISSUES`. It keeps paging in SQL, but it repeats
  two existing orderings in a third that can drift from them.

**What goes with it:**

- The other unordered lists in the Cause (the Statistics filter, the
  API's default and the DOIs page that reads it) could take
  `ORDERBY_PUBLISHED_ISSUES` in the same change; they are left out
  here because the API's default order is part of its contract.
- No data repair. The diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`, whose file is the same.
- A guard: a Planned e2e item in U63 that creates issues out of order,
  saves one, and checks the "Export Issues" list's order.

Small: one method in one OJS file, and an e2e check.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-issues-list-no-order/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-issues-list-no-order/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/export-issues-list-no-order/walk.js`
  after `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`
  (`PKP_E2E_LINE=stable-3_5_0` in front of both for 3.5). The two
  created issues carry the Title "u63ir16" because "Create Issue"
  refuses a new issue without a title ("Title is required for the
  issue.") while its "Title" show box is ticked, as it is by default.
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/export-issues-list-no-order/fix.diff ojs`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/export-issues-list-no-order/neighbour.js)
  (each after a reset), then `node bin/try-fix.js revert …` the same
  way. neighbour.js creates nine more issues (11 in all), sets "Items per
  page" to 10 and exports the one issue on page 2; with the fix in and
  out alike the pager read "1 - 10 of 11 items" and "11 - 11 of 11
  items", every issue showed once across the two pages, and the file
  held the ticked "Vol. 12 No. 1 (2025)" alone. Only the order changed
  (page 1 led with "Vol. 2 No. 1 (2015)" without the fix and with "Vol.
  1 No. 2 (2014)" with it). No server error or page script error in
  any run.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp 2e377d27fc).
  - 3.5: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (lib/pkp a9c76aed62). The same lists as on `main` at every step.
- Code reads:
  - `main` and 3.5: `ExportableIssuesListGridHandler::loadData()`;
    `classes/issue/Collector.php` (`orderBy()`, `getQueryBuilder()`,
    where an `ORDER BY` is added only for `resultOrderings`);
    `BackIssueGridHandler::loadData()` (`ORDERBY_PUBLISHED_ISSUES`) and
    `FutureIssueGridHandler::loadData()` (`ORDERBY_UNPUBLISHED_ISSUES`);
    both tools' `index.tpl`; `VirtualArrayIterator::factory()`; the
    other `Repo::issue()->getCollector()` callers in OJS (the unordered
    lists named in the Cause; the rest order or need no order); the
    templates of every OJS import/export and DOI plugin, of which only
    Native XML and PubMed load this grid; `DoisHandler`'s issue list.
    `ExportableIssuesListGridHandler` and its parent have no filter or
    search. 3.5's `ExportableIssuesListGridHandler.php` is the same file
    as `main`'s.
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833)
    holds 88aaa6b49f, and its `ExportableIssuesListGridHandler.php` is
    the same file as `main`'s; its Collector has the three orderings
    named above, and lib/pkp `origin/stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747)
    has `PKP\core\VirtualArrayIterator::factory()`. The fix was not
    tried there.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144):
    `loadData()` calls `IssueDAO::getIssues()`, `ORDER BY current DESC,
    date_published DESC`.
- Introduced: `git log -L` on `loadData()` gives b7a875abfe (2022,
  which only reworded the Collector calls) and before it 88aaa6b49f,
  authored 2021-07-14, which replaced the `IssueDAO::getIssues()` call
  (read at its parent) with the unordered Collector; merged in
  `pkp/ojs#3162` on 2021-08-31.
- Upstream: searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs. `pkp/pkp-lib#7732` (open, no comments)
  is this list; `pkp/pkp-lib#12826` ("Remove grid code") would replace
  the grid but says nothing of its order.
- The reader's "Archives" order is spec U50
  [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a13).
- Not driven: the Statistics filter, the API and the DOIs page named in
  the Cause; `ORDERBY_SHELF` (the Alternatives' reading of it is from
  the code); an order saved with "Order" on "Back Issues" (the fix reuses that
  grid's own ordering, so the export list follows it by construction,
  unverified on screen); paging past one page on the unfixed list with
  a save between two page loads (an issue could then show on two pages
  or none; unverified). MySQL not checked: without an `ORDER BY` it
  returns rows in its own storage order, so the exact Observed lists
  are PostgreSQL's.
