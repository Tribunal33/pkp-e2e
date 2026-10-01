# A preprint server's OAI-PMH lists answer a server error whenever the harvester gives an "until" date

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: none (code; the list query names the right column)
- **Introduced** `pkp/ops#162` for `pkp/pkp-lib#6963` · [5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619) · 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester that asks a preprint server for the records changed until a
date gets a server error instead of a list. The answer is an empty page
with status 500, for ListRecords and ListIdentifiers, at the preprint
server's own OAI-PMH address and at the site-wide one, whatever the
date.

Harvesting a preprint server in slices of dates, each with a `from` and
an `until`, is therefore impossible. The same lists answer normally
when `until` is left out.

## Impact

- **Lost.** The records of every list asked with `until`. The harvester
  gets no OAI-PMH error it could act on.
- **Who.** Outside harvesters and indexes that send `until`. Nobody who
  manages the preprint server is told; the fault shows only in the PHP
  error log.
- **Way round.** No setting changes it. A harvester can ask with `from`
  alone or with no date, and filter the dates itself.

Medium: the lists fail on one argument only, and the harvester can
leave it out. The fault has been in every OPS release since June 2021,
and pkp's trackers hold no report of it. It would be high if the
indexes that preprint servers rely on send `until` on every harvest,
which was not established.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`: the preprint server
  "Public Knowledge Preprint Server" (`publicknowledge`) with its 17
  published preprints. Nothing else is needed and nobody signs in: the
  OAI-PMH address is public, and a browser's address bar sends what a
  harvester sends. The dates below are the day of the walk; any date
  gives the same result.

Steps:

1. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
2. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2026-10-01`.
3. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&until=2026-10-01`.
4. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01&until=2026-10-01`.
5. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2000-01-01`.
6. Open the site-wide address,
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2026-10-01`.
7. Open `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&from=2000-01-01`.

**Expected.** Steps 2 to 4 and 6 list the 17 preprints that step 1
lists (step 3 with their records). Step 5 answers "No matching records
in this repository", since no preprint is that old.

**Observed.** Step 1 shows the page "OAI 2.0 Request Results" with 17
identifiers. Steps 2 to 6 each show an empty page. Each address
redirects to the same address with "/en/" in it, and that request
answers status 500 with no body:

```
GET /index.php/publicknowledge/en/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&until=2026-10-01   500   (text/html, 0 bytes)
```

The empty page is what an install with PHP's `display_errors` off
shows, as the dataset's own configuration sets it (`display_errors =
Off`). With `display_errors` on, the page shows the PDOException below
instead.

The PHP error log, for each of them:

```
Uncaught PDOException: SQLSTATE[42703]: Undefined column: 7 ERROR:  column a.last-modified does not exist
HINT:  Perhaps you meant to reference the column "a.last_modified".
```

Step 7 lists the 17 identifiers.

Control: on OJS and OMP the same steps, with the journal's and the
press's `publicknowledge`, list the dataset's two published items at
steps 1 to 4, 6 and 7 and answer "No matching records in this
repository" at step 5.

## Cause

OPS's `APP\oai\ops\OAIDAO::getRecordsRecordSetQuery()`
([`classes/oai/ops/OAIDAO.php`, line 248 on main](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/oai/ops/OAIDAO.php#L248))
filters the preprints by `until` on a column that does not exist: a
hyphen where the column name has an underscore.

```php
->when($from, function ($query, $from) {
    return $query->whereDate('a.last_modified', '>=', \DateTime::createFromFormat('U', $from));
})
->when($until, function ($query, $until) {
    return $query->whereDate('a.last-modified', '<=', \DateTime::createFromFormat('U', $until));
})
```

`a` is the `submissions` table, whose column is `last_modified`, as
the `from` filter three lines above and the query's own select list name
it. The query throws as soon as `$until` is set, and nothing on the way
catches it, so the request ends as an uncaught exception.

The slip came with the port of the OAI queries from raw SQL to the
query builder (`pkp/pkp-lib#6963`). The raw SQL it replaced read
`a.last_modified <= …`. OJS's and OMP's ports of the same change name
existing columns. The later change of this line from `where` to
`whereDate` (`pkp/pkp-lib#10155`, 2024-07-03) kept the name as it was.

Reach, checked in the code unless marked:

- `PKPOAIDAO::getRecords()` and `PKPOAIDAO::getIdentifiers()` pass
  `until` to the query, for ListRecords and ListIdentifiers, at the
  preprint server's address and the site-wide one
  (`ServerOAI::records()`, `ServerOAI::identifiers()`): all fail
  (reproduced, steps 2 to 6).
- `PKPOAIDAO::getRecord()`, `recordExists()` and
  `getEarliestDatestamp()` call the query with no dates, so GetRecord
  and Identify are not touched (GetRecord and Identify answered on
  screen).
- The second half of the query, the deleted records, filters `until`
  on `dot.date_deleted`, which exists.
- No other `last-modified` column name exists in OPS, OJS, OMP or
  pkp-lib (searched in `classes`, `pages` and `plugins`).
- No stored data is wrong.

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-oai-until-fails/fix.diff)
applied to OPS. With it, the Steps show Expected: steps 2 to 4 and 6
list the 17 preprints, and step 5 answers "No matching records in this
repository". The lists without `until`, the section's set and GetRecord
answer the same with the fix in and out.

Recommended: name the column as the `from` filter beside it does
(`a.last_modified`, line 245), and as OMP's query does for both dates
(`ms.last_modified`).

```diff
--- a/classes/oai/ops/OAIDAO.php
+++ b/classes/oai/ops/OAIDAO.php
@@ -245,7 +245,7 @@
                 return $query->whereDate('a.last_modified', '>=', \DateTime::createFromFormat('U', $from));
             })
             ->when($until, function ($query, $until) {
-                return $query->whereDate('a.last-modified', '<=', \DateTime::createFromFormat('U', $until));
+                return $query->whereDate('a.last_modified', '<=', \DateTime::createFromFormat('U', $until));
             })
             ->when($submissionId, function ($query, $submissionId) {
                 return $query->where('a.submission_id', '=', $submissionId);
```

**Alternatives:**

- None worth weighing: the line is a typing slip, and the fix restores
  what the raw SQL did before the port.

**What goes with it:**

- No API, hook or stored-data change: requests that failed now answer.
- Backport: `stable-3_5_0` and `stable-3_4_0` of OPS carry the same
  line (254 and 258), so the same one-word change applies there.
- Guard: pkp-e2e's OAI-PMH test that asks the lists with `until` runs
  on journals and presses today; the proposal is to extend it to the
  preprint server once this is fixed. No unit test in OPS's repo is
  proposed: its only OAI test is the Dublin Core format's, and it has
  none that runs the list query.

Small: one word in one line of OPS's own query, following the line
above it.

## Evidence

- Kept script that takes the Steps on the three apps (OJS and OMP as
  the control), signed out, each on an install freshly loaded from
  PKP's default test dataset (pkp/datasets 2c84c3c, 2026-10-01, the
  `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/preprint-server-oai-until-fails/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-server-oai-until-fails/walk.js),
  run with `PROBE_FEATURE=issues-ops1 PROBE_AGENT=ops1 node bin/probe.js all shared/playwright/checks/issues/preprint-server-oai-until-fails/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each address
  in the browser and reads the raw XML beside it. It also opens
  Identify first, and asks `until=2026-10-01T23:59:59Z`, which fails
  like step 2.
- `display_errors`: the walks ran with it off, in PHP and in the
  dataset's `config.inc.php`. The page with it on was not driven.
- The fix, tried with `node bin/try-fix.js apply shared/playwright/checks/issues/preprint-server-oai-until-fails/fix.diff ops`,
  then `walk.js` on OPS as above, and the same script with `neighbour`
  as its argument with the fix in and out: the list with no date (17),
  with `from` today and tomorrow ("No matching records in this
  repository", the dataset's preprints being older), the set
  `publicknowledge:PRE` (17), ListRecords with no date (17 records),
  GetRecord of the first identifier and the site-wide list (17). Both
  runs gave the same answers. Reverted with
  `node bin/try-fix.js revert shared/playwright/checks/issues/preprint-server-oai-until-fails/fix.diff ops`.
- The PHP error log lines were read from the web server's log; the stack passes
  through `PKPOAIDAO::getIdentifiers()` (`lib/pkp/classes/oai/PKPOAIDAO.php`
  line 178) and `ServerOAI::identifiers()`.
- main walked at OPS c8af945bb7 (lib/pkp 3dc90c81a6), OJS 06fd981b01
  (lib/pkp 2e377d27fc), OMP 3b0ecf794c (lib/pkp 3dc90c81a6); 3.5 at OPS
  3f0919468c, OJS 18d097d94e, OMP b24879c3db (lib/pkp 1fb843f491). On
  3.5 OPS answered 500 at steps 2 to 6 with the same log line, and
  `classes/oai/ops/OAIDAO.php` line 254 carries the same column name.
- Code read on main: OPS `classes/oai/ops/OAIDAO.php` and
  `ServerOAI.php`, lib/pkp `classes/oai/PKPOAIDAO.php`, OJS
  `classes/oai/ojs/OAIDAO.php` and OMP `classes/oai/omp/OAIDAO.php`
  (their `from` and `until` filters), and a search of the three apps'
  and pkp-lib's `classes`, `pages` and `plugins` for `last-modified`.
- Introduced: `git log -S"last-modified"` on OPS `classes/oai` gives
  5df1969511, whose diff replaces `AND a.last_modified <= …` with
  `->where('a.last-modified', '<=', …)`; `git blame` on the line gives
  3332ac5a08 (`pkp/pkp-lib#10155`), which only changed `where` to
  `whereDate`. GitHub's `commits/<sha>/pulls` gives PR `pkp/ops#162`.
- 3.4 by code: OPS `upstream/stable-3_4_0` (acd8ae704b),
  `classes/oai/ops/OAIDAO.php` line 258, the same line; 5df1969511 is
  an ancestor of the branch.
- 3.3 by code: OPS `upstream/stable-3_3_0` (c5532e2161) builds the list
  in raw SQL (`classes/oai/ojs/OAIDAO.inc.php`,
  `_getRecordsRecordSet()`), with `a.last_modified <= …` for `until`;
  5df1969511 is not on the branch.
- Upstream search, 2026-10-01, pkp/pkp-lib and pkp/ops (the fault is in
  OPS's own class; pkp/ui-library has no part in it), issues and PRs,
  open and closed, by "OAI until", "OAI preprint until", "OAI harvest
  preprint 500", "last-modified OAI" and "last-modified OAIDAO":
  nothing on this fault. `pkp/pkp-lib#13161` (open) is about the time
  of day in `from` and `until` being ignored, another fault.
- The walks ran on PostgreSQL. MySQL not checked; the column is absent
  there too.
- Unverified: which harvesters and indexes send `until` to preprint
  servers, on which the severity rests.
