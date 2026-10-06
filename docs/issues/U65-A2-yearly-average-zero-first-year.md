# Editorial Activity shows "(0/year)" after each total that has nothing dated before this calendar year

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5609` for `pkp/pkp-lib#5275` · [3609679](https://github.com/pkp/pkp-lib/commit/36096799c16bfaa1daf30c47ea2afeaebe2a79d3) · 2020-03-10 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** U65 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "Total" column of Statistics › "Editorial Activity", a count
reads "{count} (0/year)", as "20 (0/year)", when nothing it counts is
dated before 1 January of the current year. Each row goes by its own
dates: the submission dates for "Submissions Received", the decision
dates for the accepted and declined rows, the first publication dates
for "Submissions Published". The count should stand alone, as it does
when the earliest of those dates is last year, since there is no full
calendar year to average over yet.

A new journal, press or preprint server shows it on every count from its
first submission to the end of that year. An older one shows it on a row
whose first item came this year, such as its first desk reject.

## Impact

- **Lost**: nothing stored. The average beside a correct count says the
  context handles none a year.
- **Who**: journal managers and editors on Statistics › "Editorial
  Activity". The page's API, `GET /api/v1/stats/editorial/averages`,
  answers 0 for the same rows, where its documentation says -1 ("no
  average") may be returned.
- **Way round**: none on screen. On 1 January the row's earliest date
  falls in the past year and the count stands alone again.

Low: a wrong figure beside a correct count, on one page and its API
endpoint; the averages are in neither the monthly statistics email nor
any report download. A client known to read the averages from the API
would raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`, loaded as is,
  built in the current calendar year: pkp's CI dates every submission,
  decision and publication in it on the day it builds the dataset (the
  copy walked was built on 2026-10-02). A dataset built in an earlier
  year has every row's earliest date in a past year and shows no
  average; there, any context whose items are all dated this year shows
  the fault, such as a new journal with one submission made today.

Steps:

1. Sign in as `dbarnes`.
2. Open Statistics › "Editorial Activity"
   (`/index.php/publicknowledge/en/stats/editorial/editorial`).
3. In "Trends", read the "Total" column.

**Expected**: each count alone: "Submissions Received" "20",
"Submissions Accepted" "8", and so on.

**Observed**: every count above 0 carries "(0/year)". OJS:

```
Submissions Received                  20 (0/year)
Submissions Accepted                  8 (0/year)
Submissions Declined                  1 (0/year)
Submissions Declined (Desk Reject)    1 (0/year)
Submissions Declined (After Review)   0
Submissions Published                 2 (0/year)
```

OMP reads "18 (0/year)", "7 (0/year)" and "2 (0/year)" for received,
accepted and published; OPS "19 (0/year)", "1 (0/year)" for declined
and "17 (0/year)" for published.

## Cause

`PKP\services\PKPStatsEditorialService::getAverages()` averages each
row over full calendar years only: from the year after the row's
earliest date to the year of its latest, or to last year when the
latest is this year. It computes `$years = ($yearEnd - $yearStart) + 1`
and averages only `if ($years)` (lines 221, 253 and 279 on `main`);
otherwise the row keeps -1, the value the method returns for "no
average", which the page and its Vue component hide.

When the earliest date is in the current year, `$yearStart` is next
year and `$yearEnd` last year, so `$years` is -1. PHP treats -1 as
true: the method counts the items between 1 January next year and 31
December last year, which is none, and returns `round(0 / -1)`, 0. The
check only catches `$years` 0, the case where the earliest date is last
year.

The API documentation of `GET /stats/editorial/averages` (OJS
`docs/dev/swagger-source.json`) says: "The value `-1` may be returned
for a property if an average can not be calculated. This can occur if
there is not a full calendar year of activity to average." The issue
that added the averages, `pkp/pkp-lib#5275`, says an average that
cannot be calculated "because there hasn't been a full year of stats"
does not appear.

A row with nothing to count at all is set to 0 before any years are
computed (lines 212–213, 244–245, 270–271). The page hides it because
its count is 0; the API answers 0 for it, and the fix leaves that as
it is.

Reach:

- Statistics › "Editorial Activity", "Total" column, the six rows that
  carry an average: rendered in `PKPStatsHandler::editorial()`
  (walked) and re-read from the API by
  `lib/ui-library/src/components/Container/StatsEditorialPage.vue`
  when the filters change (code). Both show the average whenever it is
  not -1 and the count is above 0.
- The "Filters" apply to the dates, so a section or series whose items
  are all dated this year shows "(0/year)" while it is selected (code).
- Submissions the page counts as imported (received after their first
  publication date) are left out of the dates, so imported back issues
  do not change the outcome (code).
- `GET /api/v1/stats/editorial/averages` and the
  `EditorialStats::averages` hook get the same 0 (code).
- No other code in pkp-lib or the apps computes these averages, no app
  overrides `getAverages()`, and the monthly email and the report
  downloads do not use them (code).

## Proposed fix

Average only when `$years > 0`, in the three blocks of `getAverages()`
in `lib/pkp/classes/services/PKPStatsEditorialService.php`:

```diff
             $years = ($yearEnd - $yearStart) + 1;
-            if ($years) {
+            if ($years > 0) {
```

The whole diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/yearly-average-zero-first-year/fix.diff).
Tried on `main`, three apps: with it applied, the Steps read each count
alone ("20", "8", "1", "2" on OJS). On a copy of the dataset with ten
submission dates moved one and two years back, "Submissions Received"
read "20 (6/year)" (OJS) with the fix and without it, so real averages
stay.

**Alternatives**:

- Hide an average of 0 in `PKPStatsHandler::editorial()` and
  `StatsEditorialPage.vue`: would also hide a true 0 a year (items two
  years ago and this year, none last year) and leave the API answering 0.
- Return early when the earliest date is this year: the same outcome in
  more lines, three times.

**What goes with it**:

- No data repair: the averages are computed when read.
- What changes for others: for these rows the API answers -1 instead
  of 0; every other row is unchanged.
- Backport: the diff applies to `stable-3_5_0` as it stands. On
  `stable-3_4_0` the same code sits at lines 217, 249 and 275 of
  `PKPStatsEditorialService.php`, on `stable-3_3_0` at lines 215, 247
  and 273 of `PKPStatsEditorialService.inc.php` (tab-indented), so the
  change is the same with other line numbers.
- Guard: an e2e check after pkp's data build, which dates everything
  on the day it runs: the "Total" column of "Editorial Activity" holds
  no "/year". A pkp-lib unit test would have to seed dated submissions
  in the test database and read `date('Y')` as it stands, so the e2e
  check is the simpler guard.

Small: one word in three lines of one method, and one e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/yearly-average-zero-first-year/walk.js)
  (it reads the page with the `readTrends()` of
  [the OMP1 report's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-decline-not-counted-declined/lib.js)),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/yearly-average-zero-first-year/walk.js`
  (the Steps); `… walk.js neighbour` (the control below).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on 2026-10-02,
  with the same figures on both.
- Not walked: the new-context route of the precondition. An earlier
  campaign walk on a new journal with one submission received that day
  read "Submissions Received" "1 (0/year)"
  ([U65 footnote td2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#fn-td2)).
  The section filter and imported-submission reach are read in the code
  (`PKPStatsEditorialQueryBuilder::_getObject()`).
- Control for the fix (not a step, since no screen can back-date a
  submission): the script sets the `date_submitted` of submissions 2, 3,
  4 and 6 two years back and of 7 to 12 one year back in the install's
  database, leaving decisions and publications in this year, then reads
  the page. "Submissions Received" read "20 (6/year)" (OJS), "18
  (6/year)" (OMP) and "19 (6/year)" (OPS) with the fix in and out (2025's
  six submissions over one full year); the decision and publication rows
  read "(0/year)" without the fix and the count alone with it.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/yearly-average-zero-first-year/fix.diff
  ojs omp ops`, the Steps and the control on all three apps, the
  control again after `revert`.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794 and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; the method is byte-identical in
  both pkp-lib commits); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246,
  OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0` pkp-lib 9e41f10273
  (OJS c1827e3527, OMP 0aec65441, OPS acd8ae704b); `stable-3_3_0`
  pkp-lib ac3fa73402 (OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161).
- Code reads: `lib/pkp/classes/services/PKPStatsEditorialService.php`
  `getAverages()` on `main`, 3.5 and 3.4, and `.inc.php` on 3.3: the
  same three `if ($years)` guards on each. The display condition
  (average not -1, count above 0) in `PKPStatsHandler::editorial()` and
  in ui-library's `StatsEditorialPage.vue`, the same on `main`, 3.5, 3.4
  and 3.3. `PKPStatsEditorialQueryBuilder::getSubmissionsReceivedDates()`,
  `getDecisionsDates()` and `getPublishedDates()` (the first and last
  dates). The averages endpoint's description in OJS
  `docs/dev/swagger-source.json`. No other `getAverages()` or yearly
  average in pkp-lib, OJS, OMP or OPS.
- Introduced: `git blame` on lines 220–221 gives e3f570bc37 (the 2021
  PSR-12 reformat, `pkp/pkp-lib#5678`); `git log -S 'if ($years)'`
  before it gives 36096799c1, the commit of `pkp/pkp-lib#5609` (merged
  2020-03-23) that added the averages with this guard on received,
  decisions and published. The follow-up for the same issue
  (604d136b7a / f4e3d45610, `pkp/pkp-lib#6014`, 2020-06-18) added the
  missing `$years` computation in the decisions block and kept the
  guard.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library; issues and PRs) by "yearly average", "0/year",
  "editorial statistics average year", `getAverages` and
  `countWithYearlyAverage`: `pkp/pkp-lib#5275` and its PRs added the
  averages; `pkp/pkp-lib#4844` is the original editorial report and
  `pkp/pkp-lib#9813` changed the accepted and in-progress figures;
  none is this fault.
- MySQL not checked; the fault is in PHP arithmetic, not in a query.
