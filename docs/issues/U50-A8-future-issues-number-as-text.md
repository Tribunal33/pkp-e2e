# "Future Issues" lists "No. 10" before "No. 2" of the same volume and year

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** no PR (pkp's old tracker, bug 3580, "Add ability to indicate double issues") · [0ae870bbee](https://github.com/pkp/ojs/commit/0ae870bbee7bf6e6bc282d68637a50abe03e3fa7) · 2008-06-17 · michael (no GitHub handle on record)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U50 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U50-issues.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Future Issues" on the Issues page is ordered by year, volume and
number, lowest first, but the number is compared as text. So "Vol. 2
No. 10 (2015)" is listed before "Vol. 2 No. 2 (2015)", where a Journal
Manager planning issues ahead expects No. 2 before No. 10.

It shows when one volume and year has both No. 2 and No. 10 unpublished,
for example on a journal that sets up a year of monthly issues ahead.

## Impact

- **Lost.** Nothing but the list's order: every issue is listed and
  opens as usual, and publishing or editing one is unaffected.
- **Who.** Journal Managers and editors on Issues › "Future Issues",
  once No. 10 of a volume and year exists while a lower number of it is
  still unpublished.
- **Way round.** Finding an issue by its name. The list cannot be
  reordered by hand.

Low: the list misleads while every task on it gets done. It would be
medium if the order fed anything else, such as the issue a new article
is scheduled into, which it does not.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`, on PostgreSQL. Its journal
  `publicknowledge` holds one unpublished issue, "Vol. 2 No. 1 (2015)".
- Nothing else. The steps create the two issues they compare.

Steps:

1. Sign in as `dbarnes`.
2. Issues (`/index.php/publicknowledge/en/manageIssues`), "Future
   Issues": it lists "Vol. 2 No. 1 (2015)".
3. "Create Issue": Volume "2", Number "2", Year "2015"; untick "Title"
   (it arrives ticked); "Save".
4. "Create Issue": Volume "2", Number "10", Year "2015"; untick "Title";
   "Save".
5. Read "Future Issues".

**Expected:** year, then volume, then number, lowest first:

```
Vol. 2 No. 1 (2015)
Vol. 2 No. 2 (2015)
Vol. 2 No. 10 (2015)
```

**Observed:** both saves answer "Your changes have been saved.", and the
list reads:

```
Vol. 2 No. 1 (2015)
Vol. 2 No. 10 (2015)
Vol. 2 No. 2 (2015)
```

A volume of 10 or a later year still sorts in its place, since volume
and year are compared as numbers.

## Cause

`FutureIssueGridHandler::loadData()` asks the issue Collector for
`Collector::ORDERBY_UNPUBLISHED_ISSUES`, which `Collector::orderBy()`
(`classes/issue/Collector.php`) turns into `ORDER BY i.year ASC,
i.volume ASC, i.number ASC`. `year` and `volume` are integer columns,
but `number` is text: `$table->string('number', 40)` in `OJSMigration`,
`"type": "string"` in `schemas/issue.json`. The database compares text
character by character, so "10" sorts before "2".

The column is text on purpose, so that a double issue can be numbered
"1-2". The sort is older than that: it was written in 2004 for an
integer `number` column (`IssueDAO::getSelectedIssues()`, `ORDER BY
year ASC, volume ASC, number ASC`), and `IssueDAO::getUnpublishedIssues()`
took it over in 2005 (0542903de7). It is a regression because the
numbers sorted as integers until 0ae870bbee turned the column into text
for double issues and kept the sort. The line reached today's Collector
unchanged through 88aaa6b49f (`pkp/pkp-lib#7129`, the move of issues to
the Collector) and b0510449e2 (`pkp/pkp-lib#8905`).

Reach:

- "Future Issues" is the only caller of `ORDERBY_UNPUBLISHED_ISSUES`
  (callers checked in the code, OJS and its plugins).
- `ORDERBY_SHELF` ends with the same `i.number ASC` and has the same
  fault; nothing in OJS or its bundled plugins calls it (code).
- "Back Issues" is not affected, since it sorts by the saved order, the
  current issue and the publication date, never by number (code).
  "Archives" and the issues API do not sort by number either. The issue
  picker on a publication's "Issue" form reads the API
  (`useWorkflowPublicationFormIssue.js` in ui-library), not this
  ordering.
- The proposed fix of
  [pkp-e2e#271](https://github.com/jardakotesovec/pkp-e2e/issues/271)
  uses this ordering for the "Export Issues" list's unpublished issues.

## Proposed fix

Sort the number by its length first, then as text, in the Collector,
for both orderings that use it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/fix.diff)).
It follows the Collector's own pattern for an ordering that needs more
than a column name, the private `ORDER_CURRENT_ISSUE` key that the
ordering loop turns into raw SQL:

```diff
     private const ORDER_CURRENT_ISSUE = 'currentIssue';
+    private const ORDER_NUMBER = 'number';
…
-                ['orderBy' => 'i.number', 'direction' => static::ORDER_DIR_ASC]
+                ['orderBy' => static::ORDER_NUMBER, 'direction' => static::ORDER_DIR_ASC]
…   (the same in ORDERBY_SHELF)
+                } elseif ($resultOrdering['orderBy'] === static::ORDER_NUMBER) {
+                    // The number is text ("1-2", "Suppl."): a shorter value first puts "2" before "10"
+                    $q->orderByRaw('CHAR_LENGTH(i.number) ' . $resultOrdering['direction'])
+                        ->orderBy('i.number', $resultOrdering['direction']);
                 } else {
```

Numbers made of digits then sort by value. `CHAR_LENGTH` is standard
SQL on MySQL, MariaDB and PostgreSQL, so all-digit numbers sort the same
on each. The number stays text, which keeps double issues. A number that
is not all digits sorts among numbers of its own length, so "1-2" comes
after "10" where today it comes after "1".

Tried on `main`: with the fix, the Steps showed the Expected list. A
second walk, with issues in another volume and another year and a
number "Suppl", listed the same order with the fix as without it, and
"Back Issues" was unchanged.

**Alternatives:**

- `CAST(i.number AS INTEGER)`: PostgreSQL refuses the whole query as
  soon as one number is "1-2" or "Suppl", so the list would fail.
- A sort by the number's leading digits, written per database
  (PostgreSQL's `substring(i.number from '^[0-9]+')`, MySQL's `CAST(…
  AS UNSIGNED)`), as `ControlledVocabEntryMatch` picks `ILIKE` by
  driver: it would keep "1-2" next to "1", at the cost of two SQL
  dialects in the Collector.
- `strnatcmp` in PHP in `FutureIssueGridHandler`: a true natural order
  for this list, but the rule would sit in one caller rather than the
  Collector, so `ORDERBY_SHELF` and any later caller of the ordering
  would keep the text sort. ("Future Issues" is not paged, so sorting
  in PHP costs nothing there.)
- An integer `number` column: undoes double issues.

**What goes with it:**

- Two choices for the team: whether "1-2" sorting after "10" is
  acceptable (if not, the per-database alternative above), and whether
  `ORDERBY_SHELF`, which nothing calls, changes too or is left alone.
- No data repair, and no API change: the issues API does not offer
  either ordering.
- Backport: the diff applies as it stands to `stable-3_5_0`.
  `stable-3_4_0`'s Collector has the same orderings and loop. On
  `stable-3_3_0`, `CHAR_LENGTH(number) ASC,` goes before `number ASC` in
  `IssueDAO::getUnpublishedIssues()`. Neither was tried.
- A guard: a Planned e2e item in U50 that creates No. 2 and No. 10 of
  one volume and year and reads "Future Issues". OJS has no unit test of
  the issue Collector to extend.

Small: one class, no data repair, and an e2e check.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/future-issues-number-as-text/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- The fix, tried 2026-10-02 on the `main` tip below with walk.js and the
  second walk,
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/future-issues-number-as-text/neighbour.js).
  The "1-2 after 10" trade-off is read from the SQL, not walked. No
  server error or page script error in any run.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [c657990](https://github.com/pkp/datasets/commit/c657990320435ecbd047603eadb4b4ac863f6dba)
  (2026-10-01), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
    (lib/pkp ddd8ab243a).
  - 3.5: OJS [c346ee00a5](https://github.com/pkp/ojs/commit/c346ee00a577ccc0484c52b992244bf46fb9a9be)
    (lib/pkp 3bb4450bea). The same list as on `main`; its Collector and
    `FutureIssueGridHandler` are `main`'s.
- Code reads:
  - `main`: every `Repo::issue()->getCollector()` caller in OJS and its
    plugins for the orderings they use; `IssueController::getMany()`
    (`orderBy` accepts `datePublished`, `lastModified` and `seq` only).
  - 3.4 (code): OJS `upstream/stable-3_4_0`
    [75cc2d488b](https://github.com/pkp/ojs/commit/75cc2d488b664edda32ce9a83010db93cf0f9315):
    `FutureIssueGridHandler` orders by `ORDERBY_UNPUBLISHED_ISSUES`, the
    Collector sorts `i.number ASC`, and `OJSMigration` makes `number` a
    `string(40)`.
  - 3.3 (code): OJS `upstream/stable-3_3_0`
    [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b):
    `FutureIssueGridHandler::loadData()` reads
    `IssueDAO::getUnpublishedIssues()`, `ORDER BY year ASC, volume ASC,
    number ASC`, on the same `string(40)` column.
- Introduced: read with `git blame` on the Collector line, `git log -S`
  on `'i.number'` in `classes/issue`, and `git log -G` on `number` in
  `dbscripts/xml/ojs_schema.xml` (`I2` in 4f015c4bf5, `C2` from
  0ae870bbee, with its 2.2.1 upgrade step). The commit predates GitHub
  and pull requests.
- Upstream: searched 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, by the symptom's words ("future
  issues" order or sort, issue number sort or alphabetical) and by
  `ORDERBY_UNPUBLISHED_ISSUES`. Closest, and not this fault:
  `pkp/pkp-lib#6494` (dragging rows on "Future Issues" did not save,
  closed) and `pkp/pkp-lib#7732` (the Native XML export's issue list).
- Not driven: MySQL and MariaDB, where numbers of the same length
  compare by the column's collation and an empty number sorts first
  (last on PostgreSQL), both as today; the fix was run on PostgreSQL
  only.
