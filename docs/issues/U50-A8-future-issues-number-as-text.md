# "Future Issues" lists "No. 10" before "No. 2" within the same volume and year

- **Severity** low
- **Effort** small
- **Kind** regression: the list sorted numbers as numbers until 0ae870bbee made the number text and kept the old `ORDER BY`
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** [0ae870bbee](https://github.com/pkp/ojs/commit/0ae870bbee7bf6e6bc282d68637a50abe03e3fa7) · 2008-06-17 · michael (no GitHub account linked to the commit), for OJS bug #3580 "Add ability to indicate double issues"; no PR
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U50 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a8)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

"Future Issues" is ordered by year, volume and number, but the number is
compared as text: "Vol. 3 No. 10 (2016)" is listed before "Vol. 3 No. 2
(2016)".

It shows when two unpublished issues share a volume and year and the
shorter number has the higher first digit (2 and 10, 9 and 12); "1" and
"10" already sort right. Issues that carry only a number share an empty
volume and year, so for them the rule applies across the whole list.

The issues are all listed with their right names, on one page, and
nothing else follows this order; the list cannot be reordered on
screen.

## Impact

- **Lost:** a list in sequence; no record is stored wrong.
- **Who:** Journal Managers and editors on Issues › "Future Issues".
  Most often a monthly or more frequent journal with No. 9 and No. 10
  planned at once, or one whose issues carry only a number; a journal
  publishing a few issues a volume never meets it.
- **Way round:** none on screen, but the editor can read past the order.

Low: it would be medium if anything (publishing, the issue select in the
workflow) followed this order, or if the list were paged so that an
issue could sit on an unexpected page; neither is the case.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, on PostgreSQL
(MySQL compares the text the same way). The journal `publicknowledge`
has one unpublished issue, "Vol. 2 No. 1 (2015)", under "Future
Issues". The steps create two more in one volume and year, numbered 2
and 10.

1. Sign in as `dbarnes`.
2. Issues › "Future Issues" › "Create Issue": "Volume" 3, "Number" 2,
   "Year" 2016, untick "Title", "Save".
3. "Create Issue": "Volume" 3, "Number" 10, "Year" 2016, untick "Title",
   "Save".
4. Read the "Future Issues" list
   (`/index.php/publicknowledge/manageIssues`).

**Expected:** "Vol. 2 No. 1 (2015)", "Vol. 3 No. 2 (2016)", "Vol. 3 No.
10 (2016)": year, then volume, then number, lowest first.

**Observed:** "Vol. 2 No. 1 (2015)", "Vol. 3 No. 10 (2016)", "Vol. 3 No.
2 (2016)". No request failed and no page script failed.

## Cause

`FutureIssueGridHandler::loadData()`
(`controllers/grid/issues/FutureIssueGridHandler.php` line 65) asks the
issue collector for `Collector::ORDERBY_UNPUBLISHED_ISSUES`, which
`Collector::orderBy()` (`classes/issue/Collector.php` lines 187–191 on
`main`) turns into three keys:

```php
static::ORDERBY_UNPUBLISHED_ISSUES => [
    ['orderBy' => 'i.year', 'direction' => static::ORDER_DIR_ASC],
    ['orderBy' => 'i.volume', 'direction' => static::ORDER_DIR_ASC],
    ['orderBy' => 'i.number', 'direction' => static::ORDER_DIR_ASC]
],
```

`issues.volume` and `issues.year` are `smallint`, but `issues.number` is
`varchar(40)` (`OJSMigration`, line 80), so the database compares
numbers character by character and "10" sorts before "2".

The number became text in
[0ae870bbee](https://github.com/pkp/ojs/commit/0ae870bbee7bf6e6bc282d68637a50abe03e3fa7)
(OJS 2.2.1, bug #3580), which changed the column from `I2` to `C2` so
that a double issue could be numbered "1-2". The unpublished-issue query
of the time, `IssueDAO::getUnpublishedIssues()` (`ORDER BY year ASC,
volume ASC, number ASC`), was left as it was, and each refactor since
carried it over: into the `Collector` by the Issue EntityDAO refactor
(`pkp/pkp-lib#7129`), then into today's `match` by
[b0510449e2](https://github.com/pkp/ojs/commit/b0510449e224ced53dc383223b54673c386dedf3) (`pkp/pkp-lib#8905`).

Reach:

- "Future Issues" (walked).
- `Collector::ORDERBY_SHELF` sorts by the same `i.number` key; nothing
  in OJS or its bundled plugins asks for it on `main` (code), so it is
  latent there.
- Not affected (code): "Back Issues" and "Archives", which sort by the
  saved custom order and the date published, never by number; the
  issues API, whose `orderBy` accepts only `datePublished`,
  `lastModified` and `seq`.

## Proposed fix

A proposal; the team decides. Keep the number as text, since it has to hold "1-2" or "Suppl.", and
give the collector a number key: the number's leading digits as a
number, numbers that do not start with a digit after those that do,
then the text. An excerpt of the linked
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/fix.diff),
which also swaps the key into `ORDERBY_SHELF` and declares the constant:

```diff
             static::ORDERBY_UNPUBLISHED_ISSUES => [
                 ['orderBy' => 'i.year', 'direction' => static::ORDER_DIR_ASC],
                 ['orderBy' => 'i.volume', 'direction' => static::ORDER_DIR_ASC],
-                ['orderBy' => 'i.number', 'direction' => static::ORDER_DIR_ASC]
+                ['orderBy' => static::ORDER_ISSUE_NUMBER, 'direction' => static::ORDER_DIR_ASC]
             ],
…
                         ->orderByRaw('CASE WHEN j.current_issue_id IS NOT NULL then 1 else 0 END ' . $resultOrdering['direction']);
+                } elseif ($resultOrdering['orderBy'] === static::ORDER_ISSUE_NUMBER) {
+                    // The number is text ("2", "10", "1-2", "Suppl."): order by its leading digits
+                    // as a number, numbers that do not start with a digit last, then by the text
+                    $direction = $resultOrdering['direction'];
+                    match (DB::getDriverName()) {
+                        'mysql', 'mariadb' => $q->orderByRaw("COALESCE(i.number, '') NOT REGEXP '^[0-9]'")
+                            ->orderByRaw("CAST(i.number AS UNSIGNED) {$direction}"),
+                        'pgsql' => $q->orderByRaw("CAST(SUBSTRING(i.number FROM '^[0-9]+') AS NUMERIC) {$direction} NULLS LAST"),
+                        default => throw new Exception('Unexpected database driver!')
+                    };
+                    $q->orderBy('i.number', $direction);
                 } else {
```

The key is turned into SQL in the ordering loop, as the collector's own
`ORDER_CURRENT_ISSUE` key is. The per-driver SQL with a throwing default
follows the user `Collector::buildOrderBy()`. The MySQL branch avoids
`REGEXP_SUBSTR`, which MySQL 5.7, still in the README's requirements,
lacks. "1-2" sorts with the 1s, where a double issue belongs.

The non-digit-last key and `NULLS LAST` ignore `$direction` on purpose,
so a number like "Suppl." stays at the end in either direction. Today
the direction never varies: `orderBy()` fixes it inside each `ORDERBY_*`
entry, and both entries that use this key sort ascending.

Tried on `main` (PostgreSQL): step 4 listed "Vol. 2 No. 1 (2015)", "Vol.
3 No. 2 (2016)", "Vol. 3 No. 10 (2016)". An issue numbered "Suppl." in
the same volume and year was listed after "Vol. 3 No. 10 (2016)" with
the fix and without it, and "Back Issues" was unchanged. The MySQL
branch's `ORDER BY`, run on MySQL 9.4 in strict mode against a
temporary table, gave 1, 1-2, 2, 10, 12, then the issue with no number
and "Suppl."; the casts of "1-2" and "Suppl." raised warnings only.

**Alternatives:**

- Sort in PHP with `strnatcmp()` in `FutureIssueGridHandler::loadData()`.
  It fixes the one screen, but a query cut by `LIMIT`/`OFFSET` (a paged
  caller of either ordering) would still be cut in text order.
- `ORDER BY LENGTH(i.number), i.number`, which needs no per-driver SQL.
  It puts "1-2" (three characters) after "10", and "Suppl." after every
  number.
- Make `issues.number` an integer column. It would refuse the double and
  supplement numbers journals use, and needs a migration.

**What goes with it:**

- The fix for "Archives" listing issues in no set order (pkp-e2e U50
  A13) changes `ORDERBY_SEQUENCE` in the same `match`; the two diffs
  apply together, in either order.
- Issues with no number go last within their volume and year on both
  drivers; on MySQL that moves them from first. Among the numbers that
  do not start with a digit, MySQL puts an empty number before
  "Suppl." and PostgreSQL after it, as each sorts nulls today.
- The diff applies as written to `stable-3_5_0` and `stable-3_4_0`
  (checked with `patch`). On 3.3 the order is the raw SQL of
  `IssueDAO::getUnpublishedIssues()`, so a backport writes the same
  expressions into that query.
- Regression test: an e2e check that "Future Issues" lists No. 2 before
  No. 10 (the kept script below), and a collector unit test with the
  numbers "2", "10", "1-2" and "Suppl." run on both database drivers.

Small: one new key in one class, plus a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/walk.js),
  run on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/future-issues-number-as-text/walk.js [suppl]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). With no argument
  it takes steps 1–4; with `suppl` it also creates "Vol. 3 No. Suppl.
  (2016)" and reads "Back Issues", the neighbour check.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/future-issues-number-as-text/fix.diff ojs`,
  the script with and without `suppl`, then `node bin/try-fix.js revert ojs`.
  `suppl` was also run without the fix.
- Driven on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30): steps 1–4 on `main` and `stable-3_5_0`, with the same
  result. The screens were not walked on MySQL or MariaDB.
- MySQL 9.4 (`STRICT_TRANS_TABLES`, `utf8mb4_0900_ai_ci`), a
  session-only temporary table with the columns of `issues` and the
  numbers 1, 2, 10, 12, "1-2", "Suppl." and none in one volume and year:
  today's `ORDER BY year, volume, number` gave 1, 1-2, 10, 12, 2, with
  "Suppl." last; the fix's MySQL keys gave the order in "Proposed fix",
  with warning 1292 ("Truncated incorrect INTEGER value") for "1-2" and
  "Suppl.". The PostgreSQL keys on the same rows gave the same order
  apart from the empty number and "Suppl.". MariaDB not checked.
- Not paged (code): `FutureIssueGridHandler` and its parent
  `IssueGridHandler` add no paging feature, so the grid shows every
  unpublished issue on one page.
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
  - 3.5: `FutureIssueGridHandler::loadData()` line 65 and
    `Collector::orderBy()` lines 187–191 are the same as on `main`.
  - 3.4: `FutureIssueGridHandler::loadData()` line 66 asks for
    `ORDERBY_UNPUBLISHED_ISSUES`, which `Collector::orderBy()` (lines
    157–161) sorts by `i.number` as text; `ORDERBY_SHELF` (lines
    162–167) the same, with no caller.
  - 3.3: `FutureIssueGridHandler::loadData()`
    (`controllers/grid/issues/FutureIssueGridHandler.inc.php` line 55)
    calls `IssueDAO::getUnpublishedIssues()`
    (`classes/issue/IssueDAO.inc.php` line 604), `ORDER BY year ASC,
    volume ASC, number ASC` on the same text column.
- Introduced: `git blame` on `Collector.php` lines 187–191 gives
  b0510449e2 (`pkp/pkp-lib#8905`, the collector rewritten as a `match`),
  which moved the keys; `git log -S"ORDERBY_UNPUBLISHED_ISSUES"` gives
  88aaa6b49f (`pkp/pkp-lib#7129`), which carried `getUnpublishedIssues()`'s
  `ORDER BY` over. `git log -S"number ASC"` leads back to that query in
  [4f015c4bf5](https://github.com/pkp/ojs/commit/4f015c4bf5a859033a9827d5c4e5a41ef0ba9b60) (2004),
  written when `number` was `I2`; 0ae870bbee changed the
  column to `C2` (size 10) in `dbscripts/xml/ojs_schema.xml` with an
  upgrade in `2.2.1_update.xml`, and the order turned textual from then.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "future issues" (order, sort), "issue number" (sort, sorted
  alphabetically), "natural sort", "unpublished issues order" and
  `ORDERBY_UNPUBLISHED_ISSUES`; read `pkp/pkp-lib#6494` (reordering
  sections in a future issue's table of contents), `pkp/pkp-lib#4286`
  and `pkp/pkp-lib#2343` (back-issue ordering): none is this fault.
- Not driven: OJS 3.4 and 3.3 (code); the screens on MySQL and MariaDB; `ORDERBY_SHELF` (no caller).
