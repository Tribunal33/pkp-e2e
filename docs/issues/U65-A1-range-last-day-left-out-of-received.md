# "Editorial Activity" leaves submissions received on the date range's last day out of "Submissions Received"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5342` for `pkp/pkp-lib#4844` · [8d4e08c4ae](https://github.com/pkp/pkp-lib/commit/8d4e08c4aeb07f2e9abd8259d51b3b67e72c2b97) · 2019-12-04 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U65 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Editorial Activity", the date-range column leaves out
every submission received on the range's last day: "Submissions
Received", "Imported Submissions" and "Other Submissions" do not count
them, while the decisions and publications of that same day are
counted. "Last 90 days" and "Year to date" end yesterday, so they always
miss yesterday's submissions; "Last year" misses 31 December, and a
Custom Range for a month misses its last day.

Nothing on the page says a day is missing. When every submission in a
range arrived on its last day (a one-day range, for example), the page
reads "Submissions Received" 0 and every rate "0%", yet still counts
the declines of those same submissions. The monthly editorial email
counts the last day, so its "New submissions this month" and a Custom
Range over the same month disagree. The fix is a few lines in one
shared pkp-lib class and one line in the monthly email's task.

## Impact

- **Lost**: nothing stored is wrong, and the "Total" column is right.
  On a range that also holds earlier submissions the rates are right
  too; they fall to "0%" only when the last day's submissions are the
  range's only ones.
- **Who**: journal managers and editors who read or report "Editorial
  Activity" for a period, each time they choose a range.
- **Way round**: end the Custom Range one day later. That also brings
  in the next day's decisions and publications, so those rows go wrong
  instead; and the page accepts no end date later than yesterday, so
  for a period ending yesterday the manager has to wait until tomorrow.
  Only someone who knows of the fault would try it.

Medium: a secondary report is silently short by one day's submissions
on every range, and nothing stored is wrong. Short ranges do not raise
it: on a one-day or one-week range the gap is large, but there it shows
itself (0 received beside that week's declines and acceptances), while
the periods journals ordinarily report (a month, a quarter, a year)
lose one day in thirty or more and keep their rates right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, loaded as it stands (OJS, OMP
  or OPS; context `publicknowledge`). Every submission in it was
  submitted on the day pkp's CI built the dataset; call that day D
  (the walks below loaded the dataset built on 2026-10-02). Its
  decisions and publications were also made on D. To read D on an
  install: open any of its submissions, press "Activity Log" in the
  workflow; the entry "Initial submission completed." is dated D.
- The steps are taken on a later day than D: the page accepts no end
  date later than yesterday. Step 3 shows the fault only on the day
  after D, when "Last 90 days" ends on D; on a later day, while D is
  still within the last 90 days, step 3 counts D's submissions, which
  makes it the control for steps 4 and 5.

1. Sign in as `dbarnes`.
2. Open Statistics › "Editorial Activity"
   (`/index.php/publicknowledge/en/stats/editorial`).
3. Read the "Trends" table under the default "Last 90 days".
4. Press the calendar button ("Change date range"); under "Custom
   Range" type D in both boxes; press "Apply".
5. Read the "Trends" table again.

**Expected**: the date-range column counts every submission received
on D: "Submissions Received" equals the "Total" (OJS 20, OMP 18, OPS
19), and the rates are taken over those of them that were decided
(OJS "Acceptance Rate" 89%, "Rejection Rate" 11%; OMP "Acceptance
Rate" 100%).

**Observed**: "Submissions Received" reads 0 in the date-range column,
while the acceptances, declines and publications of the same day are
counted, and every rate reads "0%". Steps 3 (on the day after D) and 5
read the same figures; OJS, step 5:

```
NAME                                  2026-10-02 — 2026-10-02   TOTAL
Submissions Received                  0                         20 (0/year)
Submissions Accepted                  8                         8 (0/year)
Submissions Declined                  1                         1 (0/year)
Submissions Declined (Desk Reject)    1                         1 (0/year)
Submissions Published                 2                         2 (0/year)
Acceptance Rate                       0%                        40%
Rejection Rate                        0%                        5%
Desk Reject Rate                      0%                        5%
```

OMP, step 3: "Submissions Received" 0 (Total 18), "Submissions
Accepted" 7, "Submissions Published" 2, "Acceptance Rate" 0%. OPS,
which shows no rates: "Submissions Received" 0 (Total 19),
"Submissions Declined" 1, "Submissions Published" 17.

## Cause

The page and the API hand the range to `PKPStatsEditorialQueryBuilder`
as two bare dates (`dateStart`, `dateEnd`, `YYYY-MM-DD`), the last day
included. `submissions.date_submitted` is a date and time. In
`countSubmissionsReceived()` (lib/pkp
`classes/services/queryBuilders/PKPStatsEditorialQueryBuilder.php`,
line 111) the end is applied as

```php
$q->where('s.date_submitted', '<=', $this->dateEnd);
```

The database reads the bare date as its midnight, so a submission made
at 11:54 on D is later than `D 00:00:00` and drops out. The same class
already handles this for decisions: `countByDecisions()` adds a day to
`dateEnd` and compares with `<` ("Include date time values up to the
end of the day"), which is why the declines and acceptances of D count.
`countImported()` and `countInProgress()` (lines 449 and 464) copied
the received row's `<=` when `pkp/pkp-lib#8439` (for
`pkp/pkp-lib#7709`) gave them a date range in 2022.

The rates follow from the received count. With a range,
`PKPStatsEditorialService::getOverview()` returns 0 for every rate as
soon as "Submissions Received" is 0, before it divides by the decided
submissions of the range; when the range also holds earlier
submissions, the division runs and its counts include the last day.

Reach:

- "Imported Submissions" and "Submissions In Progress", and so their
  sum "Other Submissions", in the date-range column, all three apps
  (OMP and OPS use the shared builder; OPS's own `getOverview()` calls
  the same counts) (code). A draft carries a submission date: "Begin
  Submission" reaches `Repository::add()` without a
  `submissionProgress`, so `add()` stamps `dateSubmitted` with the
  moment the draft is started, and the column default then stores
  `submission_progress` "start". A draft started on the range's last
  day is left out in the same way.
- The "(N/year)" average of "Submissions Received" in "Total":
  `getAverages()` passes `{year}-12-31` as `dateEnd`, so 31 December of
  the span's last year is left out (code).
- The `stats/editorial` REST endpoint, which the page calls for every
  range change: the same counts (seen in the page's own requests).
- The monthly editorial email (`PKP\task\StatisticsReport`) passes the
  first day of the current month as `dateEnd`, the opposite way round:
  its received count includes the previous month's last day (right by
  accident), its decision counts add a day to the 1st and so take in
  decisions made on the 1st before the task ran, and its "published"
  count (`date_published <= dateEnd`) takes in publications made on the
  1st (code).
- `countPublished()` compares `publications.date_published`, a date
  column, with `<=`, which is right; `_getDaysToDecisionsObject()` adds
  a day but compares with `<=`, so a submission made at exactly
  midnight after the range counts (code).

## Proposed fix

Give `PKPStatsEditorialQueryBuilder` one helper for the range's end, the
day after `dateEnd`, and compare every date-and-time column with `<`
against it, as `countByDecisions()` already does; and have the monthly
task pass the month's last day, as the page does
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/range-last-day-left-out-of-received/fix.diff),
against the app root; the same lib/pkp diff for the three apps):

```diff
+    protected function getDateAfterEnd(): string
+    {
+        return (new \DateTime($this->dateEnd))->add(new \DateInterval('P1D'))->format('Y-m-d');
+    }
 …
         if ($this->dateEnd) {
-            $q->where('s.date_submitted', '<=', $this->dateEnd);
+            $q->where('s.date_submitted', '<', $this->getDateAfterEnd());
         }
```

The same replacement goes into `countImported()` and
`countInProgress()`. Three blocks that already add the day (the two in
`countByDecisions()` and the one in `_getDaysToDecisionsObject()`) call
the helper instead of their own three lines; the last of them also
moves from `<=` to `<`. In `PKP\task\StatisticsReport::executeActions()`:

```diff
-        $dateEnd = new DateTimeImmutable('first day of this month midnight');
+        $dateEnd = new DateTimeImmutable('last day of previous month midnight');
```

The rule (a range's dates are whole days, the last one included) lives
in the query builder, which every caller goes through: the page, the
REST endpoint, the averages and the monthly email. The task's line is
needed with it: once the builder counts all of `dateEnd`, an end of the
1st would bring the whole 1st into the email; with the month's last day
the email's received, decision and publication counts all cover exactly
the month, which also ends its counting of the 1st's decisions and
publications.

Tried on `main`, the three apps: steps 3 and 5 (OMP: step 3) now count
every submission received on D, with the rates of Expected. The
control, a Custom Range ending the day before D, reads 0 in every row
of the date-range column with the fix in and out (OJS and OPS).

**Alternatives**

- `whereDate('s.date_submitted', '<=', $this->dateEnd)`: shorter, but
  casts the column on every row, and leaves two patterns in one class.
- Make the page and the API send the day after as `dateEnd`: moves the
  rule into each caller, and changes what the endpoint's `dateEnd`
  means to API clients.

**What goes with it**

- Counts change for the better on the page and the `stats/editorial`
  endpoint (the last day now counts); no parameter or hook changes.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0`; `stable-3_3_0` needs the same change written into
  its `.inc.php` files.
- Test: a unit test of the query builder with a submission at midday on
  `dateEnd`, and the U65 e2e scenario's range ending on the arrival day
  (a Planned item in the spec).

Small: a few lines in one pkp-lib class and one in the task, with a
unit test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/range-last-day-left-out-of-received/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/range-last-day-left-out-of-received/walk.js)
  (helpers in `lib.js` beside it), steps 1–5 on an install freshly
  loaded from the default dataset, the three apps (3.5: with
  `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=issues-ir4 PROBE_AGENT=ir4 node bin/probe.js all shared/playwright/checks/issues/range-last-day-left-out-of-received/walk.js`;
  the control (a Custom Range ending the day before D) is the same
  script with the argument `neighbour`. The script reads D from the
  dataset (its earliest submission date) only to know what to type,
  and changes nothing.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/range-last-day-left-out-of-received/fix.diff ojs omp ops`;
  with it, OJS read 20 received, "Acceptance Rate" 89%, "Rejection
  Rate" 11%; OPS 19; OMP (step 3) 18 and 100%.
- Tips: OJS `main`
  [b84f8e2e44](https://github.com/pkp/ojs/commit/b84f8e2e4495c7453dc1569fc160ea364a0dae51)
  (lib/pkp ddd8ab243a), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7
  (both lib/pkp 3dc90c81a6; the query builder and the task are the
  same file in the three); `stable-3_5_0` OJS
  [091fb65453](https://github.com/pkp/ojs/commit/091fb654532931902904df6e3712a151baf72dc6),
  OMP 9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335); `stable-3_4_0`
  OJS
  [c1827e3527](https://github.com/pkp/ojs/commit/c1827e3527df2f402ba130af0ce82e6ed61cc33e)
  (lib/pkp 9e41f10273); `stable-3_3_0` OJS
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL. MySQL also reads a bare date against a DATETIME as
  midnight; MySQL not walked.
- Walked: `main` and 3.5, the three apps, on 2026-10-03 (the day after
  the dataset's D), the same figures on both; the page's request for
  step 5 (`api/v1/stats/editorial?dateStart=2026-10-02&dateEnd=2026-10-02`)
  answered 200 on OJS and OPS.
- OMP `main`: steps 4–5 and the control were not observed, with the fix
  in or out: the request they send got no answer, the PHP 8.3 crash
  php-src GH-20469, worked around in pkp-lib since
  [pkp/pkp-lib#12915](https://github.com/pkp/pkp-lib/pull/12915)
  (merged 2026-10-05, after this walk).
- Code reads: `PKPStatsEditorialQueryBuilder::countSubmissionsReceived()`,
  `countImported()`, `countInProgress()` and `countByDecisions()` on
  the four branches: the same `<=` against the bare `dateEnd` on all
  (3.3 in `PKPStatsEditorialQueryBuilder.inc.php`, lines 95, 434, 452),
  and the day added for decisions on all. OPS's
  `StatsEditorialService::getOverview()` calls
  `countSubmissionsReceived()` and `countSubmissionsSkipped()` on all
  four; OMP has no override of the counts. `StatisticsReport` passes
  "first day of this month midnight" as the end on the four branches
  (3.3: `StatisticsReport.inc.php`). A draft's date on `main`:
  `PKPSubmissionController::add()` builds the submission from the
  request without `submissionProgress`, `Repository::add()` (line 614)
  stamps `dateSubmitted` when `submissionProgress` is empty, and
  `submissions.submission_progress` defaults to "start"
  (`SubmissionsMigration`); `Repository::submit()` stamps it again on
  completion. The "Activity Log" entry of D was read in the dataset's
  `event_log`, not on screen.
- Introduced: `git blame` on line 111 gives e3f570bc37 (PSR-12 reformat,
  `pkp/pkp-lib#5678`); at its parent the line comes from 8d4e08c4ae,
  the commit that added the editorial statistics, with the day added
  for decisions in the same commit. The imported and in-progress lines
  come from
  [25117c2450](https://github.com/pkp/pkp-lib/commit/25117c2450f1300eac2876c46cd8b00099f77204)
  (`pkp/pkp-lib#8439`, Jonas Raoni Soares da Silva, jonasraoni,
  2022-11-19).
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library on 2026-10-02. `pkp/pkp-lib#12860` (open) reports "0%"
  rates beside non-zero counts under a date range, from the counts and
  the rates reading different dates; that is a different cause, and it
  does not mention the range's last day.
- Not walked: the monthly email (no screen starts the task), the
  imported and in-progress rows (the dataset holds no imported
  submission and no draft), the yearly averages, and the way round (a
  Custom Range ending the day after D, which the page allows only from
  D+2). The task line of the fix was read, not run.
