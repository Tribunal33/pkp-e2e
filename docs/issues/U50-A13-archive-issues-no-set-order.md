# A journal's "Archives" lists its issues in no set order until a manager orders "Back Issues"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#2059` for `pkp/pkp-lib#3705` · [ca17e94c27](https://github.com/pkp/ojs/commit/ca17e94c271368043a33e07b92f3b50c321b7925) · 2018-07-11 · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#4523` and `pkp/pkp-lib#4065` (both closed without a fix in 2022 as outdated, asking for steps on a recent version): the same fault, reported on 3.1.1
- **Tracked in** spec U50 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a13)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reader opens a journal's "Archives" and expects its issues in the
order the editors see on "Back Issues": the current issue first, then
the rest newest first. Until a Journal Manager saves an order with
"Order" on "Back Issues", the archive instead lists them in the order
the database happens to return. That order stays the same from one
visit to the next, but it has nothing to do with the issues' dates. On
PostgreSQL it also changes whenever an editor saves an issue.

Nobody is told, and "Back Issues" looks right, so editors have no
reason to check. Saving an order once on "Back Issues" fixes the
archive. This reaches every journal with two or more published issues
that has never saved an order. Every new journal starts without one,
and no upgrade saves one.

## Impact

- **Lost.** A public archive in date order. Readers browsing back
  issues see them out of sequence; every issue stays listed and
  reachable.
- **Who.** Readers of the "Archives" page, on every database: the query
  has no usable sort on any of them. The exact order readers get
  differs by database.
- **Way round.** A Journal Manager presses "Order" on "Back Issues",
  drags the issues into order and presses "Done", and the archive then
  follows that order. The cost, on PostgreSQL: each issue published
  later joins the bottom of both lists, even as the new current issue,
  so the manager reorders after each publication (the fix below leaves
  that as it is).

Medium: a public page lists a journal's issues out of sequence,
silently, until a manager sets it right on screen. It would be high if
issues dropped out of the archive's pages, which the unsorted paging
could allow but which was not seen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL. Its journal
  `publicknowledge` holds "Vol. 1 No. 2 (2014)" (published, the current
  issue) and "Vol. 2 No. 1 (2015)" (unpublished). No order was ever
  saved on "Back Issues". The dataset already gives the 2015 issue a
  Date Published, the same day as the 2014 issue's and a few minutes
  later, and publishing keeps it.
- Nothing else. The steps publish the second issue, then create and
  publish a third, so that the archive has three issues to order.

Steps:

1. Sign in as `dbarnes`.
2. Issues (`/index.php/publicknowledge/en/manageIssues`), "Future
   Issues", the arrow of "Vol. 2 No. 1 (2015)", "Publish Issue". Untick
   the notification box, "OK".
3. "Create Issue": Volume 3, Number 1, Year 2016, Title "u50a13", "Save".
4. The arrow of "Vol. 3 No. 1 (2016): u50a13", "Publish Issue". Untick
   the box, "OK".
5. "Back Issues": read the list.
6. The journal's header, "Archives": read the list.
7. Issues, "Back Issues", the arrow of "Vol. 1 No. 2 (2014)", "Edit",
   tab "Issue Data", "Save" (nothing changed). (This step saves the 2014
   issue because the save drops the time of day from the Date Published.
   Saving the 2015 issue would put it below the 2014 one on "Back Issues"
   itself.)
8. "Back Issues": read the list again.
9. "Archives": read the list again.

**Expected:** at steps 6 and 9 the archive lists the issues as "Back
Issues" does at steps 5 and 8 (the current issue first, then by Date
Published, newest first):

```
u50a13 / Vol. 3 No. 1 (2016)
Vol. 2 No. 1 (2015)
Vol. 1 No. 2 (2014)
```

**Observed:** "Back Issues" reads as expected at steps 5 and 8. The
archive lists the issues in the order they were last written. After the
save at step 7, the saved issue drops to the bottom:

```
step 6:  Vol. 1 No. 2 (2014)
         Vol. 2 No. 1 (2015)
         u50a13 / Vol. 3 No. 1 (2016)

step 9:  Vol. 2 No. 1 (2015)
         u50a13 / Vol. 3 No. 1 (2016)
         Vol. 1 No. 2 (2014)
```

On MySQL, compare step 6 with step 5. The archive's list there is
MySQL's own, so it need not match the lists above, and step 7 need not
move anything.

## Cause

`IssueHandler::archive()` (`pages/issue/IssueHandler.php`) orders the
archive with `Collector::ORDERBY_SEQUENCE`, which the issue Collector
turns into `ORDER BY o.seq ASC` alone, `o` being `custom_issue_orders`.
That table holds a row only for issues placed by "Order" on "Back
Issues". `DAO::resequenceCustomIssueOrders()` keeps it filled once a
journal has any row, and returns at once while it has none. No install
or upgrade step writes a row (`OJSMigration` only creates the table).
So on a journal that never saved an order, every issue's `o.seq` is
null and the query has nothing to sort by.

The database then returns the rows in whatever order it reads them.
PostgreSQL reads them in storage order, and an `UPDATE` writes a new
row version, which is why a saved issue moves to the end. Each archive
page is a separate `LIMIT`/`OFFSET` query on that unsorted set.

"Back Issues" (`BackIssueGridHandler::loadData()`) uses
`Collector::ORDERBY_PUBLISHED_ISSUES` instead: `o.seq ASC`, then the
current issue first, then `date_published DESC`. With no saved order it
falls back to those two, which the archive lacks.

Before ca17e94c27 the archive had no `orderBy` and took the issue
service's default, `date_published DESC`, newest first. That change, for
`pkp/pkp-lib#3705` ("Unable to Order back issues"), made the archive
follow the order saved on "Back Issues". It replaced the date ordering
with `seq` alone, instead of putting the saved order in front of it.
88aaa6b49f (`pkp/ojs#3162`, the move of issues to the Collector) only
carried the line over as `ORDERBY_SEQUENCE`.

Reach:

- The archive, seen on screen, is the only screen that orders issues by
  `ORDERBY_SEQUENCE`. Checked in the code: every other
  `Repo::issue()->getCollector()` caller in OJS uses another ordering or
  none.
- `GET /api/v1/issues?orderBy=seq` (`IssueController::getMany()`) maps to
  the same ordering and is unsorted on the same journals. No screen
  sends it (checked in the code, OJS and its ui-library).
- Not this fault: lists that have no ordering at all, such as the
  "Export Issues" list
  ([pkp-e2e#271](https://github.com/jardakotesovec/pkp-e2e/issues/271)).

## Proposed fix

Order the archive the way "Back Issues" does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/fix.diff);
on `stable-3_5_0` it applies one line lower):

```diff
--- a/pages/issue/IssueHandler.php
+++ b/pages/issue/IssueHandler.php
@@ -167,7 +167,7 @@
             ->limit($count)
             ->offset($offset)
             ->filterByContextIds([$context->getId()])
-            ->orderBy(Collector::ORDERBY_SEQUENCE)
+            ->orderBy(Collector::ORDERBY_PUBLISHED_ISSUES)
             ->filterByPublished(true);
 
         $issues = $collector->getMany()->toArray();
```

`ORDERBY_PUBLISHED_ISSUES` puts the saved order first, so the intent of
`pkp/pkp-lib#3705` is kept, and it falls back to the current issue and
the publication date where no order is saved. "Back Issues", the
sitemap, the pub-ID plugins and the export grids already use this
ordering, so the reader and the editor see one order by construction,
on MySQL and PostgreSQL alike. Paging stays in SQL.

Tried on `main`: with the fix, the Steps showed the Expected lists at
steps 6 and 9. An order saved with "Order" on "Back Issues" led the
archive the same way with the fix as without it.

The fix leaves two things as they are:

- The API's `orderBy=seq` stays unsorted on journals with no saved
  order. After the fix it is the only user of `ORDERBY_SEQUENCE`. The
  first alternative below covers it too, if the team wants that in the
  same change.
- Issues that share both the current flag and the publication date stay
  unordered among themselves, on "Back Issues" too. A last `i.issue_id`
  in `ORDERBY_PUBLISHED_ISSUES` would settle them for both lists; it is
  optional.

**Alternatives:**

- Add the two fallbacks to `ORDERBY_SEQUENCE` in the Collector. This
  also sorts the API's `orderBy=seq`, but leaves two constants meaning
  the same thing.
- Go back to `date_published DESC` when no order is saved (the fallback
  suggested in `pkp/pkp-lib#4065`). The archive would then still differ
  from "Back Issues" whenever the current issue is not the newest.
- Write a `custom_issue_orders` row for every issue on publish, so that
  `seq` always holds a value. That changes stored data, needs an upgrade
  migration for existing journals, and changes where a newly published
  issue lands in both lists.

**What goes with it:**

- No data repair.
- Backport: `stable-3_4_0`'s `archive()` and Collector are the same as
  `main`'s. On `stable-3_3_0` the archive passes `'orderBy' => 'seq'` to
  `IssueQueryBuilder`, which takes one column only. A backport there
  adds `i.current DESC` and `i.date_published DESC` after `o.seq` in
  `IssueQueryBuilder::getQuery()`. It must also add them to that query's
  `groupBy('i.issue_id', $this->orderColumn)`, or PostgreSQL refuses the
  query. Not tried.
- A guard: a Planned e2e item in U50 that publishes issues out of order,
  saves one, and checks that "Archives" reads as "Back Issues" before any
  order is saved.

Small: one line in one OJS file, and an e2e check.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/archive-issues-no-set-order/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix, tried 2026-10-02 on the `main` tip below, with walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/neighbour.js).
  neighbour.js takes steps 1 to 4, then "Order" on "Back Issues", drags
  "Vol. 1 No. 2 (2014)" to the top and presses "Done". No server error
  or page script error in any run.
- The way round's cost:
  [after-order.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archive-issues-no-set-order/after-order.js),
  walked on `main`, takes steps 1 and 2, then saves an order with
  "Order" (2014 above 2015, "Done"), then creates and publishes "Vol. 3
  No. 1 (2016): u50a13", which becomes current. "Back Issues" and
  "Archives" both read 2014, 2015, 2016. The new issue takes the next
  `seq` from `resequenceCustomIssueOrders()`, which sorts by `o.seq
  ASC`. PostgreSQL puts its null last; MySQL puts nulls first, so there
  the new issue could join the top (unverified). The fix keeps `o.seq`
  first, so it does not change this.
- The order is stable between visits: without the fix, step 6 read the
  same list in all three walks (two on `main`, one on 3.5), and the
  archive changed only after the save at step 7. Per-visit order was
  not tested on MySQL.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
    (lib/pkp ddd8ab243a).
  - 3.5: OJS [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
    (lib/pkp 3bb4450bea). The same lists as on `main` at every step.
- Code reads:
  - `main`: `customIssueOrderingExists()`; `classes/migration/install/OJSMigration.php`
    and the `classes/migration/upgrade/` steps that name
    `custom_issue_orders` (keys and foreign keys only).
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315):
    `archive()` orders by `ORDERBY_SEQUENCE`, and its Collector's
    orderings are `main`'s.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b):
    `archive()` passes `'orderBy' => 'seq'`, and
    `IssueQueryBuilder::orderBy()` and `getQuery()` sort by `o.seq`
    alone. "Back Issues" there reads `IssueDAO::getPublishedIssues()`,
    `ORDER BY o.seq ASC, i.current DESC, i.date_published DESC`.
- Introduced: `git log -S"'orderBy' => 'seq'"` gives ca17e94c27. Read
  against its parent, the archive took the service's default
  `date_published DESC` there. Merged in `pkp/ojs#2059` on 2018-07-15
  (also `pkp/ojs#2052` for `stable-3_1_1`).
- Upstream: searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs. `pkp/pkp-lib#4523` ("Frontend archive
  listing and backend archive listing ordered with different logic") and
  `pkp/pkp-lib#4065` ("Issue ordering on the archive page") describe this
  fault on 3.1.1; both were closed in 2022 as outdated. `pkp/pkp-lib#4097`
  fixed a PostgreSQL error the same change caused, not the order.
- Not driven: the API's `orderBy=seq`; paging of a long archive (an
  issue could show on two pages or none while the order is unset;
  unverified). MySQL not checked: the exact lists are PostgreSQL's.
