# OAI-PMH lists ignore the time of day in "from" and "until" and return the whole day's records

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the list query compares the date and the time)
- **Introduced** `pkp/pkp-lib#9183` (OJS) · [2d57223e2c](https://github.com/pkp/ojs/commit/2d57223e2c6849f10e364953aea04e58422e5390) · 2023-07-24, and `pkp/pkp-lib#10155` (OMP, OPS, OJS's deleted records) · [29b1d354b8](https://github.com/pkp/omp/commit/29b1d354b881d0190c1aa14518c16b0c5958dc99), [3332ac5a08](https://github.com/pkp/ops/commit/3332ac5a08aa14660a21fd7205af77450ee3a881), [087e57a125](https://github.com/pkp/ojs/commit/087e57a1254ff3b77347ec0408d179450df40b6e) · 2024-07-03 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#13161` (open), covering this fault as the
  third of its three points; its other two (the toolkit's schema
  address, the Dublin Core validation) are other faults
- **Tracked in** spec U19 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester that asks an OAI-PMH list for the records changed since a
time of day gets every record changed on that day. Identify announces
the granularity "YYYY-MM-DDThh:mm:ssZ", so `from=2026-09-30T12:30:14Z`
should list only the records changed from that second on. `until` with
a time likewise takes in the whole of its day.

On an install whose time zone is UTC, every record inside the range
asked is listed, so such a harvest only repeats records the harvester
already has. A validator that checks the announced granularity reports the
repository as failing it.

Every list with a time in `from` or `until` does this, for published
and for deleted records, with no setup.

## Impact

- **Lost.** Up to a day of repeated records on every run by time of
  day. Read in the code and not driven, because the test installs run
  in UTC: on an install whose `time_zone` setting is not UTC, a list
  asked by whole days can leave out a record changed near midnight.
- **Who.** Outside harvesters and validators that send a time of day.
  Nobody who runs the journal, press or preprint server sees it; the
  reporter of `pkp/pkp-lib#13161` met it as an error in BASE's
  validator.
- **Way round.** No setting changes it. A harvester matches the
  repeats by identifier and overwrites them, as it does on any harvest.

Low: the surplus costs a harvester nothing but the transfer. Two things
would make it medium, and neither was established: an index shown to
refuse a repository over the validator's error, or the missing record
on an install outside UTC confirmed on a walk.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: the journal "Journal of Public
  Knowledge" (`publicknowledge`) on OJS, the press and the preprint
  server of the same path on OMP and OPS. Nothing else is needed and
  nobody signs in: the OAI-PMH address is public, and a browser's
  address bar sends what a harvester sends.
- Every record of step 2 carries the same day, as the dataset's
  records do on the three apps. On an install whose records sit on
  several days, read "the records of that day" for "every record" in
  steps 3 to 7.
- On OPS leave step 5 out: a preprint server's lists answer a server
  error on any `until`
  ([pkp-e2e#252](https://github.com/jardakotesovec/pkp-e2e/issues/252)).

Steps:

1. Open `/index.php/publicknowledge/oai?verb=Identify` and read
   "Granularity".
2. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   Note the newest datestamp in the list (NEWEST) and the oldest
   (OLDEST). On the dataset loaded for this walk, OJS shows two
   records, both "2026-09-30T12:30:13Z".
3. Open the same address with `&from=` one second after NEWEST
   (`&from=2026-09-30T12:30:14Z`).
4. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`
   with the same `from`.
5. Open the address of step 2 with `&until=` one second before OLDEST
   (`&until=2026-09-30T12:30:12Z`).
6. Open the site-wide address,
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`,
   with the `from` of step 3.
7. Open the address of step 2 with `&from=` the last second of NEWEST's
   day (`&from=2026-09-30T23:59:59Z`).

**Expected.** Step 1 reads "YYYY-MM-DDThh:mm:ssZ". Steps 3 to 7 answer
"No matching records in this repository": no record's datestamp is
inside the range asked.

**Observed.** Step 1 reads "YYYY-MM-DDThh:mm:ssZ". Steps 3 to 7 each
list every record of step 2 (OJS 2, OMP 2, OPS 17), with the datestamps
of step 2. Each address redirects to the same address with "/en/" in
it, which is the one that answers:

```
GET /index.php/publicknowledge/en/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2026-09-30T12:30:14Z   200

<identifier>oai:ojs2.localhost:article/1</identifier>   <datestamp>2026-09-30T12:30:13Z</datestamp>
<identifier>oai:ojs2.localhost:article/17</identifier>  <datestamp>2026-09-30T12:30:13Z</datestamp>
```

Control: `&from=2026-10-01`, the day after, answers "No matching
records in this repository", and `&from=2026-09-30` lists the records
of step 2, as it should.

## Cause

Each app's `OAIDAO::getRecordsRecordSetQuery()` filters the list with
`whereDate()`, which compares days, not moments. On OMP
([`classes/oai/omp/OAIDAO.php`, lines 230 to 235 on main](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/oai/omp/OAIDAO.php#L230-L235)):

```php
->when($from, function ($query, $from) {
    return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
})
->when($until, function ($query, $until) {
    return $query->whereDate('ms.last_modified', '<=', \DateTime::createFromFormat('U', $until));
})
```

Laravel's `Builder::whereDate()` formats the `DateTime` as "Y-m-d" and
compares it with the column cast to a date (`last_modified::date >= ?`
on PostgreSQL, `date(last_modified) >= ?` on MySQL). The time that
`OAI::extractDateParams()` read from the request into `$from` and
`$until` is dropped at this point, although `OAIConfig::$granularity`
announces it and each record's datestamp carries it.

3.3 built the list in raw SQL and compared the column with the date and
the time (`ms.last_modified >= ' . $this->datetimeToDB($from)`). The
port to the query builder for 3.4 (`pkp/pkp-lib#6963`) left filters
that bound the wrong value, in three ways:

- OMP and OPS bound `$this->datetimeToDB($from)`, a string that carries
  its own quote marks (`'2024-07-03 02:51:51'` with the quotes inside
  the value).
- The deleted-records filters bound the bare integer timestamp, which
  PostgreSQL refused (`date/time field value out of range:
  "1678665600"`, the log of `pkp/pkp-lib#10155`).
- OJS passed the text `GREATEST(a.last_modified, …)` as a column name,
  with the integer as its value.

The two fixes named in Introduced replaced all of them with
`whereDate()` and a `DateTime`. The fix proposed below binds a plain
"Y-m-d H:i:s" string, which is none of the three, and PostgreSQL
compared it with the columns on the fix trial.

Reach:

- The same filter is on every branch of the query in the three apps:
  OJS `classes/oai/ojs/OAIDAO.php` lines 328 to 341 (published
  articles), 393 to 406 (the records per version) and 458 to 463
  (deleted records); OMP lines 230 to 235 and 269 to 274; OPS
  `classes/oai/ops/OAIDAO.php` lines 244 to 249 and 286 to 291.
- ListRecords and ListIdentifiers, at the context's address and the
  site-wide one, all go through it (on screen, steps 3 to 7).
- Deleted records (seen in the browser, on unpatched code): after
  "Unpublish" of a published submission, `from` one second after the
  deleted record's datestamp listed it, and `until` one second before
  it too.
- GetRecord, Identify and ListSets pass no dates and are not touched
  (read in the code).
- An install whose `time_zone` is not UTC (read in the code, not
  driven): `whereDate()` compares the UTC day of the request with the
  local day of the column, which is stored in the server's time zone,
  so near midnight a list by whole days can leave out a record whose
  datestamp is inside the range. At UTC-5, a record changed at 20:00
  local on 1 October has the datestamp 2 October 01:00Z; `from` 2
  October compares the column's local day, 1 October, and leaves it
  out.
- OJS's lines 393 to 406 are not among the Introduced commits: they
  came with [4ea46f5f35](https://github.com/pkp/ojs/commit/4ea46f5f35f3312394bc993074ce62043bf4b761)
  (`pkp/pkp-lib#12922`, 2026-07-27), which copied the `whereDate()`
  filter into the new query of the records per version. That query is
  on main only.

## Proposed fix

A proposal, tried on main: one diff per app,
[`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-ojs.diff),
[`fix-omp.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-omp.diff)
and
[`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-ops.diff).
With them, steps 3 to 7 answer "No matching records in this repository"
on the three apps. The lists by whole days, the exact second at both
ends, the section's set, GetRecord and Identify answer as before, and a
deleted record is listed from its own second and no later.

Recommended: compare the column with the full local date and time, as
3.3 did and as `Core::getCurrentDate()` writes these columns
(`date('Y-m-d H:i:s', …)`). OMP's diff, the shortest:

```diff
--- a/classes/oai/omp/OAIDAO.php
+++ b/classes/oai/omp/OAIDAO.php
@@ -228,10 +228,10 @@
             ->where('pf.is_available', '=', 1)
             ->whereNotNull('pub.date_published')
             ->when($from, function ($query, $from) {
-                return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
+                return $query->where('ms.last_modified', '>=', date('Y-m-d H:i:s', $from));
             })
             ->when($until, function ($query, $until) {
-                return $query->whereDate('ms.last_modified', '<=', \DateTime::createFromFormat('U', $until));
+                return $query->where('ms.last_modified', '<=', date('Y-m-d H:i:s', $until));
             })
             ->when($submissionId, function ($query, $submissionId) {
                 return $query->where('pf.publication_format_id', '=', $submissionId);
```

A day-only `until` stays inclusive, since `OAI::extractDateParams()`
already adds 86399 seconds to it. `date()` writes the server's local
time, which is what the columns hold and what `PKPOAIDAO` reads back
with `strtotime()` for the datestamp, so the fix also removes the
missing record near midnight on an install outside UTC.

`fix-ops.diff` carries a second fix. Its `until` line also changes the
column name from `a.last-modified` to `a.last_modified`, the one-word
correction that
[the report of the preprint server's failing `until`](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-OPS1-preprint-server-oai-until-fails.md)
(pkp-e2e#252) proposes. The line cannot be changed without it, so
whichever of the two lands first takes the other's change on that
line.

Left out: the hour that the clock repeats when daylight saving time
ends. The columns hold local time without an offset, so a `from` or
`until` inside that hour cannot tell its two passes apart. 3.3 had the
same limit, and it would take stored UTC dates to remove.

**Alternatives:**

- Passing the `DateTime` object to `where()`: Laravel formats it in the
  object's own zone, UTC here, against a column in local time, so every
  install outside UTC would filter some hours off.
- Announcing the granularity "YYYY-MM-DD" in `OAIConfig` and keeping
  the day comparison: honest, but it takes from harvesters what 3.3
  gave them, and the day shift outside UTC stays.
- One shared helper in `PKPOAIDAO` for the date filter: it would stop
  the three queries drifting apart again, at the cost of a larger
  change in pkp-lib and the three apps.

**What goes with it:**

- No API, hook or stored data changes.
- Backport: `fix-omp.diff` and `fix-ops.diff` apply unchanged to
  `stable-3_5_0` and `stable-3_4_0` (a dry run of `patch` on each
  branch's file, the hunks offset by 6 to 18 lines; not walked there).
  `fix-ojs.diff` does not apply: on both branches OJS writes each
  `whereDate()` call on one line with `\DateTime`, and has two places
  to change, the published articles and the deleted records, not
  three.
- MySQL: the fix compares a string with a `datetime` column, and on
  OJS with a `GREATEST(…)` expression. It was tried on PostgreSQL only.
- Guard: a pkp-e2e OAI-PMH test that asks a list with `from` one second
  after a record's datestamp and expects the record left out, proposed
  as a Planned item of spec U19. The apps' repos have no test that runs
  the list query.

Medium: the change is a few lines, but it is made three times, in the
OJS, OMP and OPS repos, each with its own commit and its own backport,
and OJS's stable branches need it ported by hand.

## Evidence

- Kept script that takes the Steps on the three apps, signed out, each
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets 2c84c3c, 2026-10-01, the `main` and `stable-3_5_0`
  PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js),
  run with `PROBE_FEATURE=issues-a2 PROBE_AGENT=a2 node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It reads NEWEST and
  OLDEST from step 2's list, opens each address in the browser and
  reads the raw XML beside it. It also asks `from=` NEWEST itself,
  which lists the day's records as well.
- On 3.5 every step answered as on main. On both lines the dataset's
  records carry one day, 2026-09-30, on the three apps.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-<app>.diff <app>`
  for each app, then `walk.js` as above. The same script with
  `neighbour` as its argument checks what the fix must leave alone, and
  was run on patched and on unpatched code: the list with no date, by
  whole days (the day itself, the day after, the day before, both
  ends), by the exact second at each end, with the section's set,
  GetRecord and Identify; then, signed in as `dbarnes`, "Unpublish"
  ("Unpost") on a published submission (OJS 17, OMP 14, OPS 19) and
  the list asked around the deleted record's datestamp. On OPS the
  `until` reads answered a server error on unpatched code and lists on
  patched code. Reverted with `node bin/try-fix.js revert …` per app.
- main walked at OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6); 3.5 at OJS 18d097d94e, OMP
  b24879c3db, OPS 3f0919468c (lib/pkp 1fb843f491).
- Code read on main: the three apps' `OAIDAO::getRecordsRecordSetQuery()`,
  lib/pkp `classes/oai/OAI.php` (`extractDateParams()`),
  `classes/oai/PKPOAIDAO.php` (the callers and the datestamp read),
  `classes/core/Core.php` (`getCurrentDate()`), and Laravel's
  `Query\Builder::whereDate()` and `PostgresGrammar::whereDate()` in
  lib/pkp's vendor directory. On 3.5 the same `whereDate()` lines: OJS
  290, 293, 331, 334; OMP 245, 248, 284, 287; OPS 251, 254, 293, 296.
- Introduced: `git log -S"whereDate"` on each app's OAIDAO. OJS
  2d57223e2c replaced `where('GREATEST(…)', '>=', $from)` with
  `whereDate(DB::raw('GREATEST(…)'), …)` on the published records, and
  087e57a125 did the same for its deleted records; OMP 29b1d354b8 and
  OPS 3332ac5a08 replaced `where(…, $this->datetimeToDB($from))`. None
  of the four has a PR. 4ea46f5f35 (`pkp/ojs#5674`) added OJS's third
  place on main.
- 3.4 by code: `upstream/stable-3_4_0` of OJS (9571d8fde7, lines 293,
  296, 334, 337), OMP (0aec65441f, lines 249, 252, 288, 291) and OPS
  (acd8ae704b, lines 255, 258, 297, 300) carry the `whereDate()` lines;
  the backports are 3cb581cabb, 020f032a4 and d3cecad4b3.
- 3.3 by code: `upstream/stable-3_3_0` of OJS (9fdb9bcf9a), OMP
  (8e72fc8836) and OPS (c5532e2161) build the list in raw SQL with
  `>= ' . $this->datetimeToDB($from)`, and `DAO::datetimeToDB()`
  (lib/pkp d446601ebe) returns `date('Y-m-d H:i:s', …)`.
- Upstream search, 2026-10-01, pkp/pkp-lib and pkp/ojs issues and PRs, open and closed, by "OAI from
  until granularity", "OAI from until time datestamp", "OAI incremental
  harvesting", "OAI date range", "OAI from timezone", "OAI whereDate"
  and "OAI granularity". `pkp/pkp-lib#13161` (OJS 3.5.0.5, opened
  2026-08-10, no comments) reports under "No incremental (full
  granularity) harvesting" that a `from`-filtered ListRecords returned
  a record with an earlier datestamp. `pkp/pkp-lib#12917` (closed as a
  duplicate of a Laravel issue) and `pkp/pkp-lib#7348` (3.3, closed)
  are other faults.
- The walks ran on PostgreSQL. MySQL not checked; the day comparison is
  Laravel's on both.
- Unverified: the missing record on an install outside UTC, read from
  the code only; no such install was driven. Whether BASE or another
  index refuses a repository over the validator's error was not
  established. Under which issue the three app commits should go
  (`pkp/pkp-lib#13161` holds two other faults) is the team's call.
