# OAI-PMH harvesters asking for records changed since or until a time of day get the whole day's records

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP (`from` and `until`); OPS (`from` only: OPS's `until` answers 500, spec U19 OPS1)
  - 3.5: OJS, OMP (`from` and `until`); OPS (`from` only, as on main)
  - 3.4: OJS, OMP (`from` and `until`); OPS (`from` only, as on main) (code)
  - 3.3: none (code)
- **Introduced** commits for `pkp/pkp-lib#10155` (OMP [29b1d354b8](https://github.com/pkp/omp/commit/29b1d354b881d0190c1aa14518c16b0c5958dc99), OPS [3332ac5a08](https://github.com/pkp/ops/commit/3332ac5a08aa14660a21fd7205af77450ee3a881), OJS deleted records [087e57a125](https://github.com/pkp/ojs/commit/087e57a1254ff3b77347ec0408d179450df40b6e)) · 2024-07-03, and for `pkp/pkp-lib#9183` (OJS [2d57223e2c](https://github.com/pkp/ojs/commit/2d57223e2c6849f10e364953aea04e58422e5390)) · 2023-07-24 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#13161` (open), covering it as the third of three OAI-PMH validator findings, reported on OJS 3.5
- **Tracked in** spec U19 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The OAI-PMH interface says it accepts dates to the second, but it
ignores the time of day. A harvester asking for the records changed
since noon gets every record changed that day. A harvester asking for
the records changed until noon also gets the ones changed that
afternoon.

The harvester is not told, and no record inside the window it asked
for is left out. Nobody at the journal, press or server can change it on screen.

It happens on every journal, press and preprint server whose OAI
interface is on, which is the default.

## Impact

- **Lost.** Nothing is lost. Harvesters fetch again records they
  already hold, whose datestamps lie outside the window they asked for.
- **Who.** Every harvester and validator that sends `from` or `until`
  with a time. The OAI-PMH guidelines tell harvesters to take the next
  `from` from the previous answer's time, so a harvester that follows
  them sends a time on every harvest.
- **Way round.** Harvesters can drop the extra records by their
  datestamps, which are correct.

Low: every harvest gets done, and the extra records carry their true
datestamps, so a harvester can discard them. It would be medium if a
harvester or index were shown to act on the records outside its
window, or to refuse a repository over it; the report in
`pkp/pkp-lib#13161` says BASE's validator flags it as an error, which
was not checked here.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or OPS)
on PostgreSQL, context `publicknowledge`. Its OAI interface is on, as by
default. The server's `time_zone` is UTC, the dataset's own setting;
it matters because the filter compares days, and the day boundary moves
with the zone (Cause). The published items carry the datestamps of the moment the
dataset was built, all on one day. In the 2026-09-30 dataset these are:

- OJS: 2 records, both at `2026-09-30T12:30:13Z`
- OMP: 2 records, at `11:51:05Z` and `12:03:13Z`
- OPS: 17 records, from `11:54:02Z` to `12:02:28Z`

No sign-in is needed.

1. Open `/index.php/publicknowledge/oai?verb=Identify`. "Granularity"
   reads `YYYY-MM-DDThh:mm:ssZ`.
2. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   Note the latest and the earliest datestamp (OJS: both
   `2026-09-30T12:30:13Z`).
3. Ask for the records changed from one second after the latest datestamp:
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2026-09-30T12:30:14Z`.
4. Ask for the records changed until one second before the earliest
   datestamp:
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2026-09-30T12:30:12Z`.
   [On a preprint server every list with `until` fails with a server
   error, spec U19 OPS1, so this step shows nothing there.]

**Expected.** Steps 3 and 4 each answer "noRecordsMatch", "No matching
records in this repository", because every record lies outside the
window.

**Observed.** Step 3 lists every record, each with a datestamp before the
`from` it asked for (OJS 2, OMP 2, OPS 17). On OJS the answer is:

```xml
<request verb="ListIdentifiers" metadataPrefix="oai_dc" from="2026-09-30T12:30:14Z">…</request>
<ListIdentifiers>
  <header>
    <identifier>oai:ojs2.localhost:article/1</identifier>
    <datestamp>2026-09-30T12:30:13Z</datestamp>
  …
```

Step 4 lists every record too, each with a datestamp after the `until`
it asked for (OJS 2, OMP 2).

Control: a `from` of the next day, written `2026-10-01`, answers "No
matching records in this repository" on all three apps.

## Cause

Each app's `OAIDAO::getRecordsRecordSetQuery()` filters the records by
date with Laravel's `whereDate()`, for example in OMP
([classes/oai/omp/OAIDAO.php, lines 230–235](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/oai/omp/OAIDAO.php#L230-L235)):

```php
->when($from, function ($query, $from) {
    return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
})
->when($until, function ($query, $until) {
    return $query->whereDate('ms.last_modified', '<=', \DateTime::createFromFormat('U', $until));
})
```

`whereDate()` compares dates only. On PostgreSQL it compiles to
`"ms"."last_modified"::date >= ?` and binds the value as `Y-m-d`, so it
drops the time on both sides. `OAI::extractDateParams()` hands the
DAO a Unix timestamp to the second, and `PKPOAIDAO` builds each record's
datestamp from the same column to the second.

The columns hold the server's local time.
`PKPApplication::initializeTimeZone()` sets PHP's default zone from the
`time_zone` setting (and the database session to the same offset), and
`Core::getCurrentDate()` writes `last_modified` and `date_deleted` with
`date()` in that zone. `PKPOAIDAO` reads them back with `strtotime()` in
the same zone before printing the datestamp in UTC. So the right
comparison is with the requested moment written in local time.
`whereDate()` instead binds the UTC date, so on a server whose
`time_zone` is not UTC even the day boundary is off by the offset (code;
no such install was walked).

`whereDate()` came in as a fix for queries that failed. OJS's first port
to the query builder,
`where('GREATEST(a.last_modified, i.last_modified, p.last_modified)', '>=', $from)`,
failed: `where()` treats its first argument as a column name, so the
expression was quoted as one, and the Unix timestamp was bound as an
integer. OMP bound `datetimeToDB()`'s already quoted string. The
deleted-record filters compared `date_deleted` with an integer, which
PostgreSQL refused ("date/time field value out of range", reported in
`pkp/pkp-lib#10155`). `pkp/pkp-lib#9183` (OJS live records) and
`pkp/pkp-lib#10155` (the rest) switched to `whereDate()`, which made
the queries run but dropped the time. OJS, OMP and OPS on 3.3 compared
the full date and time in raw SQL through `datetimeToDB()`.

Reach:

- `from` with a time: OJS, OMP and OPS; `until` with a time: OJS and
  OMP (checked on screen, `main` and 3.5).
- ListRecords and ListIdentifiers, at the context's address and the
  site-wide one, and the pages after a resumption token. All go through
  the same query, and the token keeps the raw arguments, which
  `extractDateParams()` reads again (code).
- Deleted records: the tombstone part of the same query uses
  `whereDate('dot.date_deleted', …)` in all three apps (code; the dataset
  has no deleted record).
- OJS's per-version records for journals with DOI versioning use the same
  filter (code).
- Not affected: Identify, GetRecord, ListSets and ListMetadataFormats
  pass no dates (code). The only other `whereDate()` in pkp-lib, the
  search's "published from/to" in `DatabaseEngine`, filters by day on
  purpose.

## Proposed fix

A proposal. In each app's `OAIDAO::getRecordsRecordSetQuery()`, compare
with `where()` against the timestamp written the way the columns are
written, `Core::getCurrentDate($from)` (`date('Y-m-d H:i:s', $ts)` in the
server's time zone). That covers the live records, the deleted records
and OJS's per-version records. The diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-ojs.diff)
(six filters),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/fix-ops.diff)
(four each). In OMP, where the diff also adds `use PKP\core\Core;`:

```diff
             ->when($from, function ($query, $from) {
-                return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
+                return $query->where('ms.last_modified', '>=', Core::getCurrentDate($from));
             })
             ->when($until, function ($query, $until) {
-                return $query->whereDate('ms.last_modified', '<=', \DateTime::createFromFormat('U', $until));
+                return $query->where('ms.last_modified', '<=', Core::getCurrentDate($until));
             })
```

The filters belong in the apps' `OAIDAO`s, which own their record queries
and datestamp columns; `PKPOAIDAO` only calls them. The binding follows
pkp-lib's submission `Collector`, which compares dates as
`->where('s.date_last_activity', '<', Core::getCurrentDate(…))`. It keeps what
`pkp/pkp-lib#10155` was for: a plain `Y-m-d H:i:s` string is a valid
timestamp on PostgreSQL and MySQL alike. `whereDate()` appears in no
other OAI code. A day-only `until` still covers its whole day, because
`extractDateParams()` adds 86399 seconds.

Tried on `main` in the three apps: steps 3 and 4 answer "No matching
records in this repository". Requests next to those were checked with
the fix in and out. The bounds stay inclusive: `from` or `until` equal
to a record's datestamp lists that record. The time now splits a day:
`from` one second after the earliest datestamp lists 1 record of 2 on
OMP, and 16 of 17 on OPS. Day-only `from`, `until` and both still list
the whole day, and `until` the day before lists nothing.

**Alternatives**

- Keep the `DateTime` and use `where()`. `createFromFormat('U')` gives a
  UTC time, and the columns hold the server's local time. The filter
  would be wrong by the offset wherever `time_zone` is not UTC.
- Announce day granularity (`YYYY-MM-DD`) in Identify. OAI-PMH allows
  this, but harvesters that send times would then get "badArgument", and
  the records' datestamps keep their times.
- Move the date filters into `PKPOAIDAO`. Each app filters a different
  expression (OJS takes the greatest of three columns), so the column
  would have to be passed in. That is more change for the same result.

**What goes with it**

- No stored data, REST endpoint or plugin hook is involved.
- The OPS diff also renames `a.last-modified` to `a.last_modified` on the
  `until` line, the fix for spec U19 OPS1. Whichever lands second needs
  that line rebased.
- Backport: `stable-3_5_0` and `stable-3_4_0` have the same lines at other
  offsets, and OJS 3.4 has no per-version records. 3.3 needs nothing.
- Test: spec U19's e2e scenario 5, "Asking by set and by date", checks
  `from` and `until` by day only and should gain a request with a time
  inside the day. No unit test runs the real query: OJS's
  `JournalOAITest` tests only the identifier helpers.

Medium: the change is a few lines, but it sits in three app
repositories, each needing its own commit, review and test; no data
repair.

## Evidence

- Kept scripts, in
  [shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/](https://github.com/jardakotesovec/pkp-e2e/tree/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js)
    takes the Steps on OJS, OMP and OPS, on a fresh load of the default
    dataset. It reads the datestamps in step 2 and builds steps 3 and 4
    from them. Each answer is recorded: status, OAI error, each header's
    identifier and datestamp, and the server log lines. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/walk.js`
    (its helper is `oai.js` beside it).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/neighbour.js)
    checks the bounds equal to a datestamp, a `from` inside the day and
    the day-only dates. It was run on the three apps with the fix in and
    out.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-from-until-ignore-time-of-day/trial.sh)
    tried the fix: `node bin/try-fix.js apply fix-<app>.diff <app>` for
    each app, then walk.js and neighbour.js, then the revert.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps. The 3.5
  dataset's datestamps differ (OJS 12:16:22Z, OMP 11:47:58Z–11:58:16Z,
  OPS 11:23:57Z–11:31:22Z), and the walk showed the same answers.
  MySQL was not driven. Laravel's MySQL grammar compiles `whereDate()`
  to `date(col)`, which also drops the time; the fix binds a plain
  datetime string that MySQL compares as usual. Unverified.
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
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
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
  - 3.5: each app's `classes/oai/<app>/OAIDAO.php` has the same
    `whereDate()` filters (OJS lines 290, 293, 331, 334; OMP 245, 248,
    284, 287; OPS 251, 254, 293, 296).
  - 3.4 (code): the same `whereDate()` filters in each app's
    `classes/oai/<app>/OAIDAO.php`, from the backports of the same fixes
    (OJS [3cb581cabb](https://github.com/pkp/ojs/commit/3cb581cabb9dbdf9d687a65ee19ad75e2374ecde)
    for `pkp/pkp-lib#9183`, in `3_4_0-2`;
    OJS [950cbadac4](https://github.com/pkp/ojs/commit/950cbadac4bbe27520f1ccfa98903376280aca04),
    OMP [020f032a49](https://github.com/pkp/omp/commit/020f032a490503093c4027d486b29f3f376e93ad)
    and OPS [d3cecad4b3](https://github.com/pkp/ops/commit/d3cecad4b33f34e5eecff7caa2a82bb36d722814)
    for `pkp/pkp-lib#10155`, in `3_4_0-6`). pkp-lib's `OAI::extractDateParams()`
    hands the DAO the same timestamps.
  - 3.3 (code): the DAOs build raw SQL in `_getRecordsRecordSet()`
    (OJS and OPS `classes/oai/ojs/OAIDAO.inc.php`, OMP
    `classes/oai/omp/OAIDAO.inc.php`) with
    `last_modified >= ' . $this->datetimeToDB($from)`, and the same for
    `until` and `date_deleted`. `datetimeToDB()` writes
    `date('Y-m-d H:i:s', $dt)`, so the time is kept.
- Introduced: `git blame` on the filter lines points at the four commits
  in the header. `git log -S "whereDate("` on each `OAIDAO` finds no
  earlier `whereDate()`. OJS's failing `where('GREATEST(…)', …)` came
  from the query-builder port `pkp/pkp-lib#6963`
  ([1c4b19b9c8](https://github.com/pkp/ojs/commit/1c4b19b9c8780ec2238b42fa78202763ea5f0793), 2021).
  `pkp/pkp-lib#9183` is "OAI interface reports errors
  when date ranges are specified", and `pkp/pkp-lib#10155` is "OJS 3.4.0.5
  on postgres fatal error in query regarding tombstones".
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library): `pkp/pkp-lib#13161` (open, label "Triage", no pull
  request) lists this as its third point: "a `from`-filtered ListRecords
  request returned a record with a datestamp outside the requested
  window". Not the same fault: `pkp/pkp-lib#7348` (a validator's "No
  incremental harvesting (day granularity)" on 3.3.0.3, closed without
  a recorded fix) and `pkp/pkp-lib#12917` (a 500 from `whereDate()` on an
  expression under an older Laravel, closed as a Laravel duplicate).
- Whether harvesters send times: the OAI-PMH 2.0 harvesting guidelines
  (http://www.openarchives.org/OAI/2.0/guidelines-harvester.htm,
  "Datestamps") advise taking the next `from` from the previous
  `responseDate`, which carries a time. Which large indexes do so, and
  whether BASE refuses a repository over the validator's error, is
  unverified.
- Not driven: 3.4 and 3.3 (code only), MySQL, a server with a
  `time_zone` other than UTC, and deleted records (the dataset has none).
