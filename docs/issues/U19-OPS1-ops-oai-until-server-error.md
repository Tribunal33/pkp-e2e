# Harvesters asking a preprint server's OAI-PMH interface for records up to a date get a blank server error

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#162` for `pkp/pkp-lib#6963` · [5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619) · 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U19 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A harvester that asks a preprint server for the records changed until a
date, the usual way of harvesting in slices, gets a server error instead
of a list; the same list without `until` answers normally.

ListRecords and ListIdentifiers fail whenever `until` is given, at the
server's own OAI address and at the site-wide one. The answer is HTTP
500 and an empty page, and nobody at the server is told. Harvests that
ask by `from` alone still work.

It happens on every preprint server whose OAI interface is on, which is
the default.

## Impact

- **Lost.** Every answer to a list request that carries `until`. A
  harvest cut into date slices stops at its first slice.
- **Who.** Any harvester or OAI-PMH validator that sends `until` gets the
  error. Whether the large indexes send it is not known (Evidence).
- **Way round.** The harvester can leave `until` out. Incremental
  harvesting still works with `from` alone, which is how the OAI-PMH
  harvesting guidelines describe it: each harvest asks `from` the date of
  the previous one. The server's staff can do nothing on screen.

Medium: the OAI lists of every preprint server fail for one standard
argument, but incremental harvesting by `from` still works. It would be
high if a major index were known to harvest preprint servers with
`until`.

## Steps to reproduce

Preconditions: PKP's default test dataset for OPS `main` on PostgreSQL,
server `publicknowledge` ("Public Knowledge Preprint Server"). Its OAI
interface is on, as it is by default, and it holds 17 posted preprints.
No sign-in is needed.

1. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   The server has two languages, so the browser is sent on to
   `/index.php/publicknowledge/en/oai?…`. The page "OAI 2.0 Request
   Results" lists 17 records.
2. Open the same address with today's date as `until`:
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&until=2026-09-30`.
3. The same with `verb=ListIdentifiers`:
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2026-09-30`.
4. A date slice:
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&from=2000-01-01&until=2026-09-30`.
5. The site-wide address:
   `/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc&until=2026-09-30`.

**Expected.** Steps 2 to 5 list the same 17 records as step 1, because
every preprint was last changed before the end of today. An `until`
before every record answers "noRecordsMatch", "No matching records in
this repository".

**Observed.** Steps 2 to 5 each answer HTTP 500 and an empty page (with
`display_errors` off, as on a production install). PostgreSQL's error in
the server log reads:

```
PHP Fatal error:  Uncaught PDOException: SQLSTATE[42703]: Undefined column: 7 ERROR:  column a.last-modified does not exist
LINE 1: ...nd "a"."status" = $4 and "j"."server_id" = $5 and "a"."last-...
HINT:  Perhaps you meant to reference the column "a.last_modified".
```

On MySQL the same query should fail with MySQL's own unknown-column
error; that was not driven.

Control: on OJS and OMP, the same five requests answer normally, and each
lists its two published items.

## Cause

`OAIDAO::getRecordsRecordSetQuery()` in OPS
([classes/oai/ops/OAIDAO.php, lines 244–249](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/oai/ops/OAIDAO.php#L244-L249))
builds the query behind both lists. Its `until` filter names the column
`a.last-modified`, with a hyphen. The `submissions` table has no such
column: it is `last_modified`, which the select and the `from` filter
three lines above both use:

```php
->when($from, function ($query, $from) {
    return $query->whereDate('a.last_modified', '>=', \DateTime::createFromFormat('U', $from));
})
->when($until, function ($query, $until) {
    return $query->whereDate('a.last-modified', '<=', \DateTime::createFromFormat('U', $until));
})
```

So any request with `until` sends a query the database refuses, and the
uncaught exception ends the request with a 500. The name came with
`pkp/ops#162`, which ported OPS's OAI queries from SQL strings to
Laravel's query builder. OPS on 3.3 used `a.last_modified` in its SQL
string.

Reach:

- ListRecords and ListIdentifiers with `until`, with or without `from` or
  `set`, at the server's address and the site-wide one. The Steps were
  checked on screen on `main` and 3.5. An `until` with a time of day
  (`…T23:59:59Z`) and `until` with the set `publicknowledge:PRE` were
  checked on `main`.
- A resumed list carries its `until` in the resumption token and would fail
  the same way. It is never reached, since the first page already fails
  (code).
- Identify, GetRecord, ListSets and ListMetadataFormats never pass `until`
  and are not affected (code: `PKPOAIDAO` passes `null`). Lists with only
  `from` work (checked on screen).
- The deleted-records half of the same query filters `dot.date_deleted`
  correctly (code).
- OJS and OMP build their own queries with the right columns (OMP
  `ms.last_modified`; OJS the greatest of the article's, issue's and
  publication's `last_modified`). Checked on screen, `main` and 3.5.

## Proposed fix

Name the column correctly. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-oai-until-server-error/fix.diff):

```diff
             ->when($until, function ($query, $until) {
-                return $query->whereDate('a.last-modified', '<=', \DateTime::createFromFormat('U', $until));
+                return $query->whereDate('a.last_modified', '<=', \DateTime::createFromFormat('U', $until));
             })
```

The fix belongs in OPS's `OAIDAO`, not in pkp-lib: each app's `OAIDAO`
owns its record query and its datestamp column, and `PKPOAIDAO` only
calls it. The fix makes `until` filter the same column that the record's
datestamp and the `from` filter read, as OMP's `OAIDAO` does with
`ms.last_modified` for both. A search of the three apps and pkp-lib for a
hyphenated column name found no other instance.

Tried on `main` in OPS: the Steps' five requests list the 17 records.
With the fix, `until` still limits the list: `until` yesterday answers
"noRecordsMatch", "No matching records in this repository". `from`
tomorrow does the same, `from=2000-01-01` alone lists 17, and the set
`publicknowledge:PRE` or an `…T23:59:59Z` time with `until` lists 17.
Without the fix, the `from`-only requests answer the same.

**Alternatives**

- Move the date filters into `PKPOAIDAO` so that the apps share them. Each
  app filters a different datestamp expression (OJS takes the greatest of
  three columns), so a shared filter needs the column passed in. That is a
  larger change for a one-character fault.
- Catch the query error and answer "noRecordsMatch". This hides the fault
  and still gives harvesters no records.

**What goes with it**

- No stored data, REST endpoint or plugin hook is involved. Only
  requests with `until` behave differently: they now list records.
- Backport: the diff applies as it stands to `stable-3_5_0`. On
  `stable-3_4_0` the same line sits in `_getRecordsRecordSetQuery()`.
- Test: spec U19's e2e scenario 5, "Asking by set and by date", checks
  `until` on OJS and OMP and leaves OPS out because of this fault. It
  should cover OPS once the fix is in. No unit test runs the real query:
  OPS's `OAIMetadataFormat_DCTest` mocks `OAIDAO`, and OJS's
  `JournalOAITest` tests only the identifier helpers and never touches
  the DAO.

Small: one line in one OPS class, matching the `from` filter above it.

## Evidence

- Kept scripts, in
  [shared/playwright/checks/issues/ops-oai-until-server-error/](https://github.com/jardakotesovec/pkp-e2e/tree/main/shared/playwright/checks/issues/ops-oai-until-server-error):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-oai-until-server-error/walk.js)
    types the five Steps' addresses on OJS, OMP and OPS, on a fresh load
    of the default dataset. For each answer it records the status, the
    content type, the records the page shows, the OAI error and the
    server log lines. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-oai-until-server-error/walk.js`
    (its helper is `oai.js` beside it).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-oai-until-server-error/neighbour.js)
    checks the nearby cases that show the fix still filters: `until`
    yesterday, `from` tomorrow, `from` alone, `until` with the set, and
    `until` with a time of day. It was run on OPS with the fix in and out.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-oai-until-server-error/trial.sh)
    tried the fix: `node bin/try-fix.js apply fix.diff ops`, then
    walk.js and neighbour.js, then the revert.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps. MySQL was
  not driven. The column `last-modified` exists in no schema (pkp-lib's
  `SubmissionsMigration` creates `last_modified`), so the query should
  fail on MySQL as well. That part is unverified.
- Tips:
  - `main`: OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)
    with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5: `classes/oai/ops/OAIDAO.php` line 254 has the same
    `a.last-modified`, and the Steps reproduced it in the browser too.
  - 3.4 (code): `classes/oai/ops/OAIDAO.php`
    `_getRecordsRecordSetQuery()` line 258 has the same
    `a.last-modified`. 5df1969511 is on the branch, and on every 3.4
    release tag from `3_4_0-0`.
  - 3.3 (code): OPS keeps its OAI DAO at `classes/oai/ojs/OAIDAO.inc.php`,
    a raw SQL string whose `until` part reads
    `a.last_modified <= …` (line 222). 5df1969511 is not on the branch.
- Introduced: `git blame` on the line points at
  [3332ac5a08](https://github.com/pkp/ops/commit/3332ac5a08aa14660a21fd7205af77450ee3a881)
  (`pkp/pkp-lib#10155`, 2024-07-03), which only changed `where` to
  `whereDate` and kept the name. `git log -S "a.last-modified"` finds
  5df1969511 (commit message "pkp/pkp-lib#6963 Port OAI rewrite to
  Laravel to OPS") as the commit that wrote it. It is the merge of PR
  `pkp/ops#162`, titled "pkp/pkp-lib#6963 Port OAI rewrite to
  Illuminate/Database to OPS", merged 2021-06-11. `pkp/pkp-lib#6963` is
  the issue "Improve OAI performance".
- Whether harvesters send `until`: the OAI-PMH 2.0 "Implementation
  Guidelines for Harvesting"
  (http://www.openarchives.org/OAI/2.0/guidelines-harvester.htm, section
  "Datestamps") describe incremental harvesting by `from` alone ("the
  from argument of the next incremental harvest should be based on the
  responseDate returned in the first partial-list response"), and say
  "all repositories must support from and until parameters". Whether
  any large index (Google Scholar, BASE, OpenAIRE and others) sends
  `until` to preprint servers is unverified.
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ops and
  pkp/ui-library, by the symptom's words (OAI, until, ListRecords,
  harvest, preprint server error) and by `OAIDAO`, `last-modified` and
  `last_modified`): nothing about `until` failing on OPS.
  `pkp/pkp-lib#13161` (day-granularity `from` and `until`) and
  `pkp/pkp-lib#10155` (a Postgres date error in the same query) are other
  faults.
- Not driven: 3.4 and 3.3 (code only), MySQL.
