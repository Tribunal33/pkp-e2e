# "Archives" lists a journal's issues in no set order until someone saves an order on "Back Issues"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2059` for `pkp/pkp-lib#3705` · [ca17e94c27](https://github.com/pkp/ojs/commit/ca17e94c271368043a33e07b92f3b50c321b7925) · 2018-07-15 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#4523` and `pkp/pkp-lib#4065` (both closed without a fix in 2022, as outdated)
- **Tracked in** spec U50 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a13)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

"Back Issues" lists a journal's published issues with the current
issue first and the rest newest first. Until a Journal Manager saves
an order there with "Order", the reader's "Archives" does not follow
that order or any other the journal chose: it lists the issues in
whatever order the database returns them. On PostgreSQL that is the
order their records were last saved, so editing one issue moves it to
the end of the archive.

Readers get the back catalogue out of order, and nothing on "Back
Issues" shows the journal that anything is wrong. On PostgreSQL an
archive that runs to several pages can also show an issue on two pages
and leave another off every page. A manager can set the order by
saving one on "Back Issues".

The archive has behaved this way since OJS 3.1.1-4 (September 2018).

## Impact

- **Lost:** the archive's order on every journal without a saved
  order. On PostgreSQL, in archives longer than one page, an issue can
  also be missing from the listing (it stays reachable by its own
  address).
- **Who:** readers of "Archives" on every journal with two or more
  published issues and no saved order. The query sorts on nothing the
  journal set, so none of these journals gets the "Back Issues" order
  except by chance.
- **Way round:** on "Back Issues", press "Order", drag the issues into
  place and press "Done"; "Archives" then follows that order. On
  PostgreSQL, each issue published after that lands at the bottom of
  both lists, so the manager has to move every new issue by hand. On
  MySQL a new issue lands at the top, where newest first puts it
  (code).

Medium: a public page shows the wrong order on every such journal and
nobody is told, and long archives on PostgreSQL can drop issues from
the listing. There is a way round on screen, and the dropped issues
stay reachable in other ways.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, on
PostgreSQL. The journal `publicknowledge` has "Vol. 1 No. 2 (2014)"
(published, current) and "Vol. 2 No. 1 (2015)" (unpublished, under
"Future Issues"), and no order has been saved on "Back Issues". The
steps create one issue, "Vol. 2 No. 2 (2016)": with three published
issues the archive's order is visibly neither newest first nor
oldest first.

1. Sign in as `dbarnes`.
2. Issues › "Future Issues" › the "Vol. 2 No. 1 (2015)" row's arrow ›
   "Publish Issue". Untick "Send an email about this to all registered
   users." and press "OK".
3. "Create Issue": "Volume" 2, "Number" 2, "Year" 2016, untick
   "Title", "Save".
4. The "Vol. 2 No. 2 (2016)" row's arrow › "Publish Issue", untick the
   email box, "OK".
5. Issues › "Back Issues": read the list.
6. Open "Archives" from the journal's header
   (`/index.php/publicknowledge/issue/archive`): read the list.
7. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Issue Data": type
   any text in "Description" and press "Save".
8. Read "Back Issues" and "Archives" again.

**Expected:** "Archives" lists the issues in the order "Back Issues"
shows, at step 6 and step 8 alike: "Vol. 2 No. 2 (2016)", "Vol. 2 No.
1 (2015)", "Vol. 1 No. 2 (2014)".

**Observed:** step 5, "Back Issues": "Vol. 2 No. 2 (2016)", "Vol. 2
No. 1 (2015)", "Vol. 1 No. 2 (2014)". Step 6, "Archives": "Vol. 1 No.
2 (2014)", "Vol. 2 No. 1 (2015)", "Vol. 2 No. 2 (2016)". Step 8, after
an edit that changes no order: "Back Issues" is unchanged, and
"Archives" reads "Vol. 2 No. 1 (2015)", "Vol. 2 No. 2 (2016)", "Vol. 1
No. 2 (2014)". No request failed and no page script failed.

Control: after step 6, "Back Issues" › "Order", dragging "Vol. 1 No. 2
(2014)" to the top and "Done" makes both lists read 2014, 2016, 2015:
once an order is saved, the archive follows it.

## Cause

`IssueHandler::archive()` (`pages/issue/IssueHandler.php` line 170 on
`main`) asks for `Collector::ORDERBY_SEQUENCE`, and the issue
`Collector::orderBy()` (`classes/issue/Collector.php` lines 179–181)
turns that into one sort key, the custom order saved on "Back Issues":

```php
static::ORDERBY_SEQUENCE => [
    ['orderBy' => 'o.seq', 'direction' => static::ORDER_DIR_ASC]
],
```

`o` is `custom_issue_orders`. It holds no row for any issue until a
manager saves an order with "Order"
(`BackIssueGridHandler::setDataElementSequence()` →
`DAO::moveCustomIssueOrder()`). From then on, every `DAO::insert()`,
`update()` and `delete()` of an issue calls
`DAO::resequenceCustomIssueOrders()`, which renumbers the published
issues by `o.seq` ascending and so gives each one a row.

Without rows, every issue's `o.seq` is null. The query is ordered by
`o.seq` with every value tied, and the database returns tied rows in
whatever order it finds them:

- PostgreSQL returns them in the order the rows sit in the table,
  which is the order they were last written. That is why saving "Issue
  Data" moved "Vol. 1 No. 2 (2014)" to the end. With `LIMIT`/`OFFSET`
  it may also break the ties differently for each page: its
  documentation warns that different `LIMIT`/`OFFSET` values give
  inconsistent subsets unless the `ORDER BY` fixes the order.
- MySQL (code and a query experiment, not driven on an OJS install)
  returned tied rows in primary-key order, `issue_id`, so oldest
  created first.

"Back Issues" asks for `ORDERBY_PUBLISHED_ISSUES` instead
(`BackIssueGridHandler::loadData()`). That is the same custom order,
then the current issue first, then `date_published` newest first, so
"Back Issues" always has a set order.

Up to 3.1.0 the archive used `IssueDAO::getPublishedIssues()`, `ORDER
BY o.seq ASC, i.current DESC, i.date_published DESC`. An early-2018
change (19aa18e293, `pkp/pkp-lib#1922`) moved the archive to the issue
service, which sorted by date published, newest first.
[ca17e94c27](https://github.com/pkp/ojs/commit/ca17e94c271368043a33e07b92f3b50c321b7925)
(`pkp/pkp-lib#3705`, "Unable to Order back issues") then made the
archive follow the order saved on "Back Issues", but with that key
alone and no fallback. The Issue EntityDAO refactor (`pkp/pkp-lib#7129`)
carried it into `ORDERBY_SEQUENCE`.

Reach:

- "Archives" and its later pages (walked on page 1). On PostgreSQL, a
  test of the archive's query shape on tied rows, 25 per page, listed
  every issue once for 100 issues or fewer. With 150 issues one issue
  showed on two pages and one on none; with 200 issues, two and two
  (query experiment, not driven on screen).
- `GET /api/v1/issues?orderBy=seq`, the same order (code; no screen
  sends it).
- Not affected (code): "Back Issues", "Delete" choosing the next
  current issue (`IssueGridHandler::deleteIssue()`), the sitemap, the
  submission, publication and DOI export grids
  (`ExportPublishedSubmissionsListGridHandler`,
  `ExportPublishedPublicationsListGridHandler`,
  `PubIdExportRepresentationsListGridHandler`), `PubIdPlugin` and the
  open access notification, which all use `ORDERBY_PUBLISHED_ISSUES`.
  "Future Issues" uses `ORDERBY_UNPUBLISHED_ISSUES`.
- A separate fault of the same kind, left out of this report: the
  "Issues" tab of the Native XML and PubMed exports
  (`ExportableIssuesListGridHandler::loadData()`) asks the collector
  for no order at all and pages with `LIMIT`/`OFFSET`. It has a
  different cause and introducing change: in 3.3 it read
  `IssueDAO::getIssues()`, `ORDER BY current DESC, date_published
  DESC`, and the refactor 88aaa6b49f (`pkp/pkp-lib#7129`) dropped that
  order. Its fix is one `->orderBy(Collector::ORDERBY_PUBLISHED_ISSUES)`
  in that grid, which this report's fix does not reach (code; not
  driven).

## Proposed fix

A proposal; the team decides. Give `ORDERBY_SEQUENCE` the fallback
"Back Issues" already has. A saved custom order still comes first,
and without one the archive matches "Back Issues"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/fix.diff)):

```diff
--- a/classes/issue/Collector.php
+++ b/classes/issue/Collector.php
@@ -176,10 +176,9 @@
             static::ORDERBY_LAST_MODIFIED => [
                 ['orderBy' => 'i.last_modified', 'direction' => static::ORDER_DIR_DESC]
             ],
-            static::ORDERBY_SEQUENCE => [
-                ['orderBy' => 'o.seq', 'direction' => static::ORDER_DIR_ASC]
-            ],
-            static::ORDERBY_PUBLISHED_ISSUES => [
+            // The custom order saved on "Back Issues", and the order that list
+            // shows until one is saved: the current issue first, then newest first.
+            static::ORDERBY_SEQUENCE, static::ORDERBY_PUBLISHED_ISSUES => [
                 ['orderBy' => 'o.seq', 'direction' => static::ORDER_DIR_ASC],
                 ['orderBy' => 'currentIssue', 'direction' => static::ORDER_DIR_DESC],
                 ['orderBy' => 'i.date_published', 'direction' => static::ORDER_DIR_DESC]
```

The fix sits in the collector, which owns the orderings, so the archive
and the API's `orderBy=seq` both get it. It keeps what `pkp/pkp-lib#3705`
wanted (a saved order is followed) and restores the 3.1.0 fallback.

Tried on `main`: steps 6 and 8 both listed "Vol. 2 No. 2 (2016)",
"Vol. 2 No. 1 (2015)", "Vol. 1 No. 2 (2014)", as "Back Issues" did. With
an order saved (the control), "Archives" followed it, with the fix and
without it.

**Alternatives:**

- Make `IssueHandler::archive()` ask for `ORDERBY_PUBLISHED_ISSUES`.
  It fixes the archive but leaves the API's `orderBy=seq` with no order.
- Add a final `i.issue_id` key to both orderings. Then issues with the
  same date published also keep one order across the archive's pages.
  It changes "Back Issues" only among such ties.

**What goes with it:**

- Nothing is stored wrong, so there is no data repair.
- The API's `orderBy=seq` goes from no order to a set order; no client
  could rely on the old one. The issues API with no `orderBy` at all
  also returns issues with no `ORDER BY` (`IssueController::getMany()`);
  that is a separate default and is left out here, as is the export
  "Issues" tab named under Cause.
- The diff applies as written to `stable-3_5_0` and `stable-3_4_0`
  (checked with `patch --dry-run`). On 3.3 the order lives in
  `IssueQueryBuilder::orderBy()`, which takes one column. A backport
  there adds `i.current DESC, i.date_published DESC` after `o.seq` in
  its query, and to its `groupBy`.
- Regression test: an e2e check that "Archives" lists the issues in the
  order of "Back Issues", with and without a saved order (the kept
  script below does both).

Small: one entry in the collector, reusing an ordering the same class
already has.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/archive-issues-no-set-order/walk.js [ordered]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–8; with `ordered` it takes steps 1–6 and then the
  control.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/archive-issues-no-set-order/fix.diff ojs`,
  the script with and without `ordered`, then
  `node bin/try-fix.js revert ojs`. `ordered` was also run without the
  fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets
  38ab955 (2026-09-30): steps 1–8 on `main` and `stable-3_5_0`, with
  the same result.
- Database behaviour, unverified on an OJS install:
  - The paging test ran the archive's query shape (`issues` left
    joined to an empty `custom_issue_orders`, `ORDER BY o.seq`, 25 a
    page) on temporary copies of the tables on PostgreSQL. The issues
    were 30 to 200 published issues, a third of them re-saved. The
    planner sorts the early pages with a top-N heapsort, which breaks
    ties differently from the full sort of the later pages.
  - MySQL 9.4, the same shape on InnoDB temporary tables with 200
    rows: tied rows came back in `issue_id` order, and the pages
    listed every issue once. MySQL's documentation leaves the order of
    tied rows to the server, so this is not guaranteed.
  - A new issue landing at the top on MySQL rests on MySQL sorting
    nulls first in `resequenceCustomIssueOrders()`'s `ORDER BY o.seq`.
    It was not driven. On PostgreSQL the issue lands at the bottom,
    which the spec's own probe saw on screen (2026-09-25).
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads:
  - 3.4: `IssueHandler::archive()` line 164 asks for `ORDERBY_SEQUENCE`,
    which `Collector::orderBy()` (lines 149–151) maps to `o.seq` alone;
    `ORDERBY_PUBLISHED_ISSUES` has the fallback (lines 152–156).
  - 3.3: `IssueHandler::archive()`
    (`pages/issue/IssueHandler.inc.php` lines 128–136) asks for
    `orderBy` `seq`, which `IssueQueryBuilder::orderBy()`
    (`classes/services/queryBuilders/IssueQueryBuilder.inc.php` lines
    82–92) maps to `o.seq` alone. "Back Issues" there reads
    `IssueDAO::getPublishedIssues()`, with the fallback.
- Introduced: `git blame` on `Collector.php` lines 179–181 gives
  b0510449e2 (`pkp/pkp-lib#8905`, the collector rewritten as a `match`)
  and 88aaa6b49f (`pkp/pkp-lib#7129`). Both carried the `o.seq`-only
  order over unchanged. `git log -S"'orderBy' => 'seq'"` on the archive
  handler gives ca17e94c27 (merged through `pkp/ojs#2059`). It first
  shipped as the backport
  [4cbe9d1e67](https://github.com/pkp/ojs/commit/4cbe9d1e67e3c0e27fc03c35c9f73edb61689c5b)
  in `ojs-3_1_1-4` (2018-09-11).
- Upstream: `pkp/pkp-lib#4065` (2018, "Issue ordering on the archive
  page") and `pkp/pkp-lib#4523` (2019, "Frontend archive listing and
  backend archive listing ordered with different logic") describe this
  fault on 3.1.1 and ask for the fallback.
