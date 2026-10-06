# OAI-PMH lists accept a "from" or "until" date that is not in the calendar instead of refusing it

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least
  [1dbbf23b9f](https://github.com/pkp/pkp-lib/commit/1dbbf23b9fcbd6349fcd09b76bd33fc401c56b09)
  (2008-09-19)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester whose ListRecords or ListIdentifiers request carries a
`from` or `until` date that is not in the calendar gets an answer
instead of the refusal "Illegal from parameter" or "Illegal until
parameter". With month 13 or hour 25 in `from`, the date is dropped and
every record is listed, as if no date had been given. With month 13 in
`until`, the answer is "No matching records in this repository",
whatever the records' dates.

A day the month does not have is accepted too: `from=2030-02-30` is
answered like a real date in 2030.

A date written in the wrong shape, such as "30-02-2030", is refused as
it should be. Both requests do this on every install, with no setup.

## Impact

- **Lost.** The refusal OAI-PMH asks for.
- **Who.** A harvester or a person at the address bar that sends an
  impossible date. No ordinary harvest does.
- **Way round.** Send a date that exists.

Low: the fault needs a request that is itself wrong, and a correct
date is read correctly. It would be medium if a harvester in use were
shown to send such dates, which was not looked for.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the journal "Journal of Public
  Knowledge" (`publicknowledge`) on OJS, the press and the preprint
  server of the same path on OMP and OPS, whose published records are
  all older than 2030. Nobody signs in: the OAI-PMH address is public,
  and a browser's address bar sends what a harvester sends.
- On OPS leave steps 5 and 6 out: a preprint server's lists answer a
  server error on any `until`
  ([pkp-e2e#252](https://github.com/jardakotesovec/pkp-e2e/issues/252)).

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   and count the records (OJS 2, OMP 2, OPS 17).
2. Open the same address with `&from=2030-13-01` (month 13).
3. Open it with `&from=2030-01-01T25:00:00Z` (hour 25).
4. Open it with `&from=2030-02-30` (30 February).
5. Open it with `&until=2030-13-01`.
6. Open it with `&until=2030-02-30`.
7. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2030-13-01`.
8. Open the site-wide address,
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2030-13-01`.

**Expected.** Steps 2 to 4, 7 and 8 answer "Illegal from parameter",
steps 5 and 6 "Illegal until parameter".

**Observed.** Each address redirects to the same address with "/en/"
in it, which is the one that answers.

- Steps 2, 3, 7 and 8 list every record of step 1, though each is older
  than 2030.
- Step 4 answers "No matching records in this repository", the same
  answer as a real date in 2030 gets. On screen it shows only that the
  date is not refused; which date it is read as is in the Cause.
- Step 5 answers "No matching records in this repository", though
  every record is older than the date.
- Step 6 lists every record of step 1.

```
GET /index.php/publicknowledge/en/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2030-13-01   200

<identifier>oai:ojs2.localhost:article/1</identifier>   <datestamp>2026-09-30T12:30:13Z</datestamp>
<identifier>oai:ojs2.localhost:article/17</identifier>  <datestamp>2026-09-30T12:30:13Z</datestamp>
```

Control: `&from=30-02-2030` answers "Illegal from parameter", and
`&from=2030-01-01` answers "No matching records in this repository".

## Cause

`PKP\oai\OAIUtils::UTCtoTimestamp()`
([`classes/oai/OAIUtils.php`, lines 68 to 81 on main](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAIUtils.php#L68-L81))
checks the shape of the date with a pattern of digits, then hands it to
`strtotime()` and tests the result against a value PHP no longer
returns:

```php
if (preg_match("/^\d\d\d\d\-\d\d\-\d\d$/", $date)) {
    // Match date
    $time = strtotime("{$date} UTC");
    return ($time != -1) ? $time : 'invalid';
} elseif (preg_match("/^(\d\d\d\d\-\d\d\-\d\d)T(\d\d:\d\d:\d\d)Z$/", $date, $matches)) {
    // Match datetime
    // FIXME
    $date = "{$matches[1]} {$matches[2]}";
    …
        $time = strtotime("{$date} UTC");
        return ($time != -1) ? $time : 'invalid';
```

The long form goes through the second branch, where line 75 first
rewrites `$date` from "2030-01-01T25:00:00Z" to "2030-01-01 25:00:00".

Two things go wrong there.

`strtotime()` answers `false` for a date it cannot read, such as month
13 or hour 25 (it answered -1 before PHP 5.1). `false != -1` holds, so
the function returns `false` instead of "invalid".
`OAI::extractDateParams()`
([`classes/oai/OAI.php`, lines 811 to 849](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAI.php#L811-L849))
compares it with the string "invalid", which does not match, and passes
it on. As `from`, `false` makes the query's `->when($from, …)` add no
filter, so every record is listed (on the ListRecords path the `?int`
arguments of `records()` and `PKPOAIDAO::getRecords()` turn it into 0,
which adds no filter either). As a day-only `until` it becomes
`false + 86399`, the last second of 1 January 1970, so nothing is.

`strtotime()` also reads a day the month does not have as the days
after the month's end, so "2030-02-30" becomes 2 March 2030, and
nothing compares the date read with the date written. This roll-over
is from the code and from `strtotime()` run on its own; no step shows
it, since the dataset has no record between 28 February and 2 March
2030.

Reach, checked in the code unless marked:

- ListIdentifiers and ListRecords, at a context's address and the
  site-wide one, are the callers of `extractDateParams()` (on screen,
  steps 2 to 8). A list continued with a resumption token reads the
  stored `from` and `until` the same way.
- `until` with hour 25 stays `false` and adds no filter, as `from`
  does. `from` given with an impossible `until` compares a number with
  `false` and answers "until parameter must be greater than or equal
  to from parameter". Neither was driven.
- `PKPOAIDAO::getEarliestDatestamp()` calls `UTCtoTimestamp()` with a
  datestamp the app wrote itself, always a real date.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff)
applied to the three apps. With it, steps 2 to 4, 7 and 8 answer
"Illegal from parameter" and steps 5 and 6 "Illegal until parameter".
Dates that exist (the day form and the long form, a leap day, the last
second of a year), the refusals for a wrong shape, for `until` before
`from` and for the two forms mixed, and Identify answer the same with
the fix in and out.

Recommended: in `UTCtoTimestamp()`, accept the date only when
`strtotime()` read it and the timestamp, written back, is the date
given. In the second hunk `$date` is the string line 75 built, with a
space and no "Z", which is what `gmdate('Y-m-d H:i:s', …)` writes.

```diff
--- a/lib/pkp/classes/oai/OAIUtils.php
+++ b/lib/pkp/classes/oai/OAIUtils.php
@@ -68,7 +68,7 @@
         if (preg_match("/^\d\d\d\d\-\d\d\-\d\d$/", $date)) {
             // Match date
             $time = strtotime("{$date} UTC");
-            return ($time != -1) ? $time : 'invalid';
+            return ($time !== false && gmdate('Y-m-d', $time) === $date) ? $time : 'invalid';
         } elseif (preg_match("/^(\d\d\d\d\-\d\d\-\d\d)T(\d\d:\d\d:\d\d)Z$/", $date, $matches)) {
             // Match datetime
             // FIXME
@@ -77,7 +77,7 @@
                 return 'invalid_granularity';
             } else {
                 $time = strtotime("{$date} UTC");
-                return ($time != -1) ? $time : 'invalid';
+                return ($time !== false && gmdate('Y-m-d H:i:s', $time) === $date) ? $time : 'invalid';
             }
         } else {
             return 'invalid';
```

The rule lives in this one function, which reads both `from` and
`until`, so `extractDateParams()` needs no change: it already turns
"invalid" into the two refusals.

**Alternatives:**

- `checkdate()` on the parts of the pattern, plus range checks on the
  hour, minute and second: the same result with more lines.
- Testing only `$time !== false`: refuses month 13 and hour 25, and
  still reads 30 February as 2 March.

**What goes with it:**

- A request that was answered with a list is now refused with
  `badArgument`, which is what OAI-PMH asks for. Two more forms are
  refused by the same test, by choice: hour 24 ("T24:00:00Z") and
  second 60, which `strtotime()` reads as the next day's midnight.
  No stored data, hook or other API changes.
- Backport: `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0` carry the
  same two lines, so the same change applies.
- Guard: a unit test of `OAIUtils::UTCtoTimestamp()` in pkp-lib (real
  dates in both forms, month 13, 30 February, hour 25), or a pkp-e2e
  OAI-PMH test that sends `from=2030-13-01` and expects "Illegal from
  parameter", proposed as a Planned item of spec U19.

Small: two lines in one function of pkp-lib, and a unit test.

## Evidence

- Kept script that takes the Steps on the three apps, signed out, each
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 2c84c3c, 2026-10-01, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js),
  run with `PROBE_FEATURE=issues-a2 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each address
  in the browser and reads the raw XML beside it. On 3.5 every step
  answered as on main.
- `strtotime("2030-02-30 UTC")` on the install's PHP 8.3 gives
  2030-03-02T00:00:00Z, and `false` for "2030-13-01" and "2030-01-01
  25:00:00". Step 4's "No matching records" and step 6's full list fit
  the first.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff ojs omp ops`,
  then `walk.js` as above, and the same script with `neighbour` as its
  argument with the fix in and out: `from` 2000-01-01, 2030-01-01,
  2000-01-01T00:00:00Z, 2030-12-31T23:59:59Z and 2028-02-29; `from`
  "30-02-2030" and "2030/01/01"; Identify; and on OJS and OMP `until`
  2030-01-01, 2000-01-01 and 2030-12-31T23:59:59Z, `until` before
  `from`, the two forms mixed, and `from` with `until`. Both runs gave
  the same answers. One more read, `from=2030-02-29`, answered "No
  matching records in this repository" with the fix out and "Illegal
  from parameter" with it in. Reverted with
  `node bin/try-fix.js revert shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff ojs omp ops`.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 at OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c (lib/pkp 1fb843f491).
- Code read on main: lib/pkp `classes/oai/OAIUtils.php`
  (`UTCtoTimestamp()`, `UTCDate()`), `classes/oai/OAI.php`
  (`extractDateParams()` and its two callers), `classes/oai/PKPOAIDAO.php`
  (line 200), the apps' `OAIDAO::getRecordsRecordSetQuery()` (the
  `->when($from, …)` filters), and a search of the three apps' and
  pkp-lib's `classes`, `pages` and `plugins` for other callers of
  `UTCtoTimestamp()`: none. 3.5 (lib/pkp 1fb843f491): the same lines 70,
  71, 79 and 80.
- 3.4 and 3.3 by code: lib/pkp `origin/stable-3_4_0` (df13621c2d),
  `classes/oai/OAIUtils.php` lines 70, 71, 79, 80, and
  `origin/stable-3_3_0` (d446601ebe), `classes/oai/OAIUtils.inc.php`
  lines 52, 53, 63, 64: the same `strtotime()` and `!= -1`; their
  `extractDateParams()` compares with "invalid" the same way.
- Introduced: `git log -S'($time != -1)'` on the file ends at
  1dbbf23b9f, the commit that added the OAI classes to pkp-lib; the
  code is older than pkp-lib's history.
- Upstream search, 2026-10-01, pkp/pkp-lib and pkp/ojs issues and PRs, open and closed, by "OAI invalid
  date badArgument", "OAI "Illegal from parameter"", "OAI from date
  validation", "OAI strtotime" and "UTCtoTimestamp": nothing on this
  fault. `pkp/pkp-lib#13161` (open) is about the time of day in `from`
  and `until`, another fault
  ([pkp-e2e's report of it](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A2-oai-from-until-ignore-time-of-day.md)).
- The walks ran on PostgreSQL; the fault is in PHP and does not depend
  on the database.
- Not driven: hour 25 as `until` (by the code it adds no filter, unlike
  month 13 as a day-only `until`), a real `from` with an impossible
  `until`, and hour 24 and second 60 (run through `strtotime()` on PHP
  8.3 only).
