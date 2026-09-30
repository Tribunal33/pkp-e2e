# OAI-PMH harvesters sending a date not in the calendar get a list instead of "Illegal from parameter"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [3a83ef9f41](https://github.com/pkp/ojs/commit/3a83ef9f41d30221fca8c3f90561ff29458c5fe9) (2005-01-03)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester that asks the OAI-PMH interface for records from or until a
date that is not in the calendar, such as the 13th month, 30 February or
the hour 25, expects the refusal "Illegal from parameter" (or "Illegal
until parameter"), as for a date written the wrong way. Instead the
interface answers with a list.

A month 13 or an hour 25 in `from` lists every record, as if no date had
been given; a month 13 in `until` lists nothing. A day the month does not
have is read as a later day: 30 February is 2 March.

The OAI interface is on by default, so every journal, press and preprint
server answers this way.

## Impact

- **Lost.** No content of the journal, press or server. A client that
  sends an impossible date gets more records than it asked for, none, or
  a window shifted by a few days, instead of an error.
- **Who.** Only a client that sends an impossible date. No harvester or
  validator was checked for whether it sends one, or for whether a
  validator marks a repository down for this answer (Evidence).
- **Way round.** The journal, press or server has no setting for it and
  nothing to do on screen. A harvester that sends valid dates never meets
  it.

Low: the answer is wrong only for a malformed request. It would be
medium if a harvester in use were found to send such dates (a naive
"day + 1" at the end of a month) and so to miss records silently, or if
a validator were found to fail a repository for it.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS),
context `publicknowledge`. Its OAI interface is on, as by default. No
sign-in is needed.

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   It lists every published record (OJS 2, OMP 2, OPS 17).
2. Open the same address with `&from=2026-13-01` (a 13th month).
3. Open the same address with `&until=2026-13-01`.
   [On a preprint server every list with `until` fails with a server
   error, spec U19 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops1),
   so this step answers HTTP 500 there. Step 5 is refused before any
   query and answers on OPS as on the others.]
4. Open the same address with `&from=2026-09-30T25:00:00Z` (an hour 25).
5. Open the same address with `&from=2026-02-30&until=2026-03-01`
   (30 February, and the next real day).

**Expected.** Steps 2, 4 and 5 answer:

```xml
<error code="badArgument">Illegal from parameter</error>
```

and step 3 answers `<error code="badArgument">Illegal until parameter</error>`.

**Observed.**

- Step 2 lists every record, the same as step 1 (OJS 2, OMP 2, OPS 17).
- Step 3 answers `<error code="noRecordsMatch">No matching records in this repository</error>`
  (OJS, OMP).
- Step 4 lists every record, the same as step 1.
- Step 5 answers `<error code="badArgument">until parameter must be greater than or equal to from parameter</error>`
  on all three apps, OPS included, since this check runs before any
  query: 30 February was read as a day after 1 March.

Control: `&from=2026/09/30`, a date written the wrong way, answers
"Illegal from parameter" on all three apps.

## Cause

pkp-lib's `OAIUtils::UTCtoTimestamp()`
([classes/oai/OAIUtils.php, lines 65–85](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAIUtils.php#L65-L85))
checks only the shape of the date with a regular expression, then parses
it with `strtotime()`:

```php
$time = strtotime("{$date} UTC");
return ($time != -1) ? $time : 'invalid';
```

`strtotime()` has returned `false` on failure, not `-1`, since PHP 5.1,
so the check never fires. A date `strtotime()` cannot read ("2026-13-01",
"25:00:00") comes back as `false`. A day the month does not have
("2026-02-30", "2026-09-31") is not a failure at all: `strtotime()` rolls
it over into the next month.

`OAI::extractDateParams()`
([classes/oai/OAI.php, lines 809–853](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/oai/OAI.php#L809-L853))
refuses only the string `'invalid'`, and `false == 'invalid'` is false,
so a `false` date is not refused:

- As `from`, it reaches `PKPOAIDAO::getRecords()` and `getIdentifiers()`,
  whose `?int $from` turns it into `0` (no `strict_types`). The apps'
  `OAIDAO::getRecordsRecordSetQuery()` then filters with
  `->when($from, …)`, which skips `0`: no date filter at all.
- As a day-only `until`, `extractDateParams()` first adds 86399 seconds
  for the inclusive day. `false` becomes 86399, which is
  1970-01-01 23:59:59, so nothing matches.
- A rolled-over date is an ordinary timestamp of a later day. The
  `$from > $until` test in `extractDateParams()` and the query then use
  that later day.

Reach:

- ListRecords and ListIdentifiers, at the context's address and the
  site-wide one, and the pages after a resumption token, which
  `extractDateParams()` reads again: all three apps call the same pkp-lib
  code (checked on screen for ListIdentifiers at the context's address;
  the rest in the code).
- `until` with an hour 25 is read as no `until` (read in the code, not
  walked).
- `PKPOAIDAO::getEarliestDatestamp()` also calls `UTCtoTimestamp()`, on a
  datestamp it wrote itself, so it is not affected; Identify's
  "Earliest Datestamp" was unchanged with the fix in.
- No other caller: `UTCtoTimestamp()` is called only from `OAI.php` and
  `PKPOAIDAO.php` (pkp-lib, OJS, OMP, OPS, their OAI plugins).

## Proposed fix

A proposal. In `OAIUtils::UTCtoTimestamp()`, parse with
`DateTime::createFromFormat()` in UTC and accept the date only when it
formats back to the same string; that refuses a month 13, 30 February and
an hour 25 alike. The diff,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff):

```diff
-        // FIXME Has limited range (see http://php.net/strtotime)
         if (preg_match("/^\d\d\d\d\-\d\d\-\d\d$/", $date)) {
             // Match date
-            $time = strtotime("{$date} UTC");
-            return ($time != -1) ? $time : 'invalid';
-        } elseif (preg_match("/^(\d\d\d\d\-\d\d\-\d\d)T(\d\d:\d\d:\d\d)Z$/", $date, $matches)) {
+            $format = 'Y-m-d';
+        } elseif (preg_match("/^(\d\d\d\d\-\d\d\-\d\d)T(\d\d:\d\d:\d\d)Z$/", $date)) {
             // Match datetime
-            // FIXME
-            $date = "{$matches[1]} {$matches[2]}";
             if ($requiredGranularity && $requiredGranularity != 'YYYY-MM-DDThh:mm:ssZ') {
                 return 'invalid_granularity';
-            } else {
-                $time = strtotime("{$date} UTC");
-                return ($time != -1) ? $time : 'invalid';
             }
+            $format = 'Y-m-d\TH:i:s\Z';
         } else {
             return 'invalid';
         }
+
+        // Refuse a date or time that is not in the calendar (2026-02-30, 25:00:00) instead of rolling it over
+        $time = DateTime::createFromFormat("!{$format}", $date, new DateTimeZone('UTC'));
+        return ($time && $time->format($format) === $date) ? $time->getTimestamp() : 'invalid';
```

(with `use DateTime;` and `use DateTimeZone;` at the top). The rule
belongs in `UTCtoTimestamp()`, the one place that turns an OAI date into
a timestamp, so every verb and app is covered. The check follows pkp-lib's
SUSHI endpoint, which validates its `begin_date` and `end_date` the same
way in `CounterR5Report::validateDate()`
(`$d && $d->format($format) === $date`). The return values stay the
same (a timestamp, `'invalid'` or `'invalid_granularity'`), so
`extractDateParams()` and `getEarliestDatestamp()` need no change.

Tried on `main` in the three apps: steps 2 to 5 answered "Illegal from
parameter" and "Illegal until parameter". Valid dates still answer as before the fix: a day, a
date-time, `until` a day, 29 February in a leap year, 28 February, a
`from` after its `until`, and Identify's "Earliest Datestamp".

**Alternatives**

- Compare `strtotime()`'s result with `false` instead of `-1`. That
  refuses the month 13 and the hour 25, but not 30 February, which
  `strtotime()` rolls over.
- Check the regular expression's groups with `checkdate()` and hour,
  minute and second ranges. It works too, but is more code for the same
  rule and a pattern pkp-lib does not use for request dates.

**What goes with it**

- A harvester that sent an impossible date now gets `badArgument`, which
  OAI-PMH requires. No stored data, REST endpoint or plugin hook is
  involved.
- A leap second (`23:59:60Z`), which `strtotime()` rolled into the next
  day, is now refused too.
- Backport: the diff applies as it stands to `stable-3_5_0`, and
  `stable-3_4_0` has the same method as `main`. On `stable-3_3_0` the
  patch must be redone by hand in `classes/oai/OAIUtils.inc.php`: the file
  is indented with tabs and writes `"$date UTC"` and `} else if (`, so no
  hunk applies. It also has no namespace, so the `use DateTime;` and
  `use DateTimeZone;` lines are left out there.
- Test: a unit test for `OAIUtils::UTCtoTimestamp()` in pkp-lib (none
  exists; `tests/classes/` has no `oai` folder), with valid dates, a leap
  day and the impossible ones. Spec U19's e2e scenario for dates could
  add one impossible date and expect the refusal.

Small: one method and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js)
  takes the Steps on OJS, OMP and OPS on a fresh load of the default
  dataset, typing each address in the browser and reading the XML the
  server sent (status, OAI error, the records' datestamps, server log
  lines); with the argument `neighbour` it runs the valid dates of
  "Proposed fix" instead. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-impossible-date-accepted/walk.js [neighbour]`,
  with the fix applied by `node bin/try-fix.js apply shared/playwright/checks/issues/oai-impossible-date-accepted/fix.diff ojs omp ops`
  for the trial.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps, with the
  same answers on both lines. MySQL was not driven; the fault is in PHP
  before any query.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (`OAIUtils.php` and `OAI.php` identical to 2e377d27fc).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5: `lib/pkp/classes/oai/OAIUtils.php` lines 67–80 hold the same
    `strtotime()` and `!= -1` check.
  - 3.4 (code): `classes/oai/OAIUtils.php` lines 67–80 the same;
    `OAI::extractDateParams()` (line 839, untyped) refuses only
    `'invalid'`; the apps' `classes/oai/<app>/OAIDAO.php` filter with
    `->when($from, …)`.
  - 3.3 (code): `classes/oai/OAIUtils.inc.php` lines 49–64 the same;
    `extractDateParams()` (line 802) the same; the apps'
    `OAIDAO.inc.php::_getRecordsRecordSet()` add the date only when it is
    truthy (`$from ? ' AND … >= ' . $this->datetimeToDB($from) : ''`), so a
    `false` date is dropped there too.
- Introduced: `git blame` on the check points at pkp-lib's PSR-12
  reformat ([e3f570bc37](https://github.com/pkp/pkp-lib/commit/e3f570bc37da1f12d133ce6dfb3d41b3c336a191),
  2021), then at the OAI refactor that moved the class into pkp-lib
  ([1dbbf23b9f](https://github.com/pkp/pkp-lib/commit/1dbbf23b9fcbd6349fcd09b76bd33fc401c56b09),
  2008). `git log -S '$time != -1'` in OJS finds it first in OJS 2's
  initial OAI interface (the commit in the header, 2005-01-03). PHP's
  manual for `strtotime()` notes that it returns `false` on failure since
  PHP 5.1.0 (November 2005), `-1` before, so the `-1` check matched the
  PHP of its day.
- Upstream (searched 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and pull requests, by the symptom and by
  `UTCtoTimestamp`, `OAIUtils` and `extractDateParams`). Not the same
  fault:
  `pkp/pkp-lib#13161` (the OAI validator's findings, one of them the
  time of day, spec U19 A2), `pkp/pkp-lib#10264` (a general review of
  date types), `pkp/pkp-lib#3051` (datestamps before `from`).
- Not driven: 3.4 and 3.3 (code only).
- Unverified: whether any harvester in use sends impossible dates, and
  whether any OAI-PMH validator (for example a registry's conformance
  check) sends one and fails a repository over the answer. None was
  checked.
