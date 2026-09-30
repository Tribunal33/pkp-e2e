# OAI-PMH lists a section's deleted records whatever the harvester's `from` and `until` dates say

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/ojs#3134` and `pkp/ops#162` for `pkp/pkp-lib#6963` · [1c4b19b9c8](https://github.com/pkp/ojs/commit/1c4b19b9c8780ec2238b42fa78202763ea5f0793) (OJS), [5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619) (OPS) · 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester asks a journal's OAI-PMH endpoint for one section's
records with `from=2030-01-01`, and expects nothing. Instead it gets
every deleted record of that section, including an article withdrawn
today. `until` is ignored the same way. This happens at the journal's
own OAI endpoint and at the site-wide one.

Every dated harvest of a section's set therefore receives all of that
section's deleted records again, however old, each with its true
deletion date.

It needs a harvester that asks for one section (`set` of the form
"journal:section") together with a date.

## Impact

- **Lost:** nothing established. The harvester receives deleted
  records whose deletion date lies outside the dates it asked for. A
  deletion it already holds, received again, changes nothing in its
  copy.
- **Who:** indexes and aggregators that harvest a journal's or preprint
  server's sections one by one, incrementally by date. It shows once a
  section holds a withdrawn (unpublished or unposted) item, and grows
  with every withdrawal in that section.
- **Way round:** none on the journal's side; a harvester can read the
  journal's set instead, whose dates work.

Low: every harvest gets done and nothing is lost. It would be medium if
a harvester used `until` to rebuild a repository as it stood on a past
date: that harvester would receive later withdrawals and remove records
that still existed on that date. No such harvester was checked.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OPS in brackets). It holds no
  deleted records yet. The journal's sections are "Articles" (`ART`)
  and "Reviews" (`REV`); the server's is "Preprints" (`PRE`).

1. Signed out, open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:ART&from=2030-01-01`
   [OPS: `set=publicknowledge:PRE`]. It answers "No matching records in
   this repository".
2. Sign in as `dbarnes`. Open submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran" (published in "Vol. 1
   No. 2 (2014)", section "Articles") [OPS: submission 2, "The Facets Of
   Job Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence", section "Preprints"], and its "Title & Abstract".
3. Press "Unpublish" [OPS: "Unpost"], and "Unpublish" [OPS: "Unpost"] in
   the window ("Are you sure you don't want this to be published?"). The
   status reads "Unscheduled" [OPS: "Unposted"].
4. Signed out, open the address of step 1 again.
5. Open it with `until=2000-01-01` in place of `from=2030-01-01`. [OPS:
   this answers a server error instead, as does any `until` on a preprint
   server, a separate fault:
   [U19 OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-OPS1-ops-oai-until-server-error.md).]
6. Open the address of step 4 at the site-wide address:
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:ART&from=2030-01-01`.
7. Open the address of step 4 with `verb=ListRecords`.
8. Open the address of step 4 with the journal's set,
   `set=publicknowledge`.

**Expected:** steps 4 to 7 answer as step 1 does: "No matching records
in this repository". The article was withdrawn today, which is neither
on or after 2030-01-01 nor on or before 2000-01-01.

**Observed:** steps 4 to 7 [OPS: 4, 6 and 7] list the withdrawn item as
a deleted record dated today:

```
<request verb="ListIdentifiers" metadataPrefix="oai_dc" set="publicknowledge:ART" from="2030-01-01">…/index.php/publicknowledge/en/oai</request>
<ListIdentifiers>
    <header status="deleted">
        <identifier>oai:ojs2.localhost:article/17</identifier>
        <datestamp>2026-09-30T23:41:54Z</datestamp>
        <setSpec>publicknowledge:ART</setSpec>
    </header>
</ListIdentifiers>
```

Step 8, the journal's set with the same date, answers "No matching
records in this repository". So does the same date with no set.

## Cause

`OAIDAO::getRecordsRecordSetQuery()` (OJS `classes/oai/ojs/OAIDAO.php`,
OPS `classes/oai/ops/OAIDAO.php`) builds the deleted-records part of
every list from `data_object_tombstones`. The `set` condition is added
inside a `when()` callback, which receives the outer query:

```php
->when(isset($set), function ($query) use ($set) {
    return $query->where('dot.set_spec', '=', $set)
        ->orWhere('dot.set_spec', 'like', $set . ':%');
})
->when($from, fn … whereDate('dot.date_deleted', '>=', …))
->when($until, fn … whereDate('dot.date_deleted', '<=', …))
```

The `orWhere()` is not grouped with the `where()`, so the SQL reads
`WHERE dot.set_spec = ? OR dot.set_spec LIKE ? AND date(dot.date_deleted) >= ? AND …`.
AND binds before OR: the exact-set branch has none of the conditions
that follow it. A tombstone's `set_spec` is always "journal:section"
(`OAIDAO::setSpec()` in OJS, `PreprintTombstoneManager` in OPS). So the
`=` branch matches only when the harvester asks for a section's set, and
then it matches every deleted record of that section. For the journal's
set only the `LIKE` branch matches, and the dates hold.

The joins above the set condition are not affected by the missing
brackets: the section join still keeps only the asked section's deleted
records. On OJS, though, the journal join is broken on its own: its
`when()` callback takes `$journalId` as its second argument, which is
the `when()` value `true`, so `(int) $journalId` joins every deleted
record to journal 1
([U19 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md)).
On the default dataset `publicknowledge` is journal 1, so the Steps are
not affected by it.

Until 3.3 the query was an SQL string with the two parts in brackets,
`AND (dot.set_spec = ? OR dot.set_spec LIKE ?)`. The rewrite of the OAI
queries to the Laravel query builder for `pkp/pkp-lib#6963` ("Improve
OAI performance") dropped the brackets, in OJS and in the OPS port.

Reach:

- The record-id condition that follows (`dot.data_object_id`) is
  skipped by the `=` branch as well, but only GetRecord passes an id,
  and it never passes a set.
  Checked in the code (`PKPOAIDAO::getRecord()`, `getRecords()`,
  `getIdentifiers()`, `getEarliestDatestamp()`).
- OMP: its deleted-records query matches `dot.set_spec = $set` alone,
  with no `orWhere()`, so its dates hold. Checked in the code.
- The same ungrouped `orWhere()` in other queries (the DOAJ deposit's
  `getExportable()`, `PKP\user\Collector`, `PKP\institution\Collector`)
  is named in
  [U63 A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A5-doaj-daily-deposit-takes-other-journals-articles.md);
  the only other `orWhere()` in the OAI classes of the three apps and
  lib/pkp is this one's OPS twin.

## Proposed fix

Put the two set conditions in one group, in both apps, so that the
dates apply to both branches. This is how the code base writes an optional "this or that"
condition elsewhere (`RoleDAO::userHasRole()`,
`->where(fn (Builder $q) => $q->whereNull(…)->orWhere(…))`). The diffs,
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ojs.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ops.diff),
make the same change:

```diff
             ->when(isset($set), function ($query) use ($set) {
-                return $query->where('dot.set_spec', '=', $set)
-                    ->orWhere('dot.set_spec', 'like', $set . ':%');
+                // Grouped, so that `from`, `until` and the record id below apply to both.
+                return $query->where(function ($query) use ($set) {
+                    $query->where('dot.set_spec', '=', $set)
+                        ->orWhere('dot.set_spec', 'like', $set . ':%');
+                });
             })
```

It keeps what `pkp/pkp-lib#6963` wanted, the query builder in place of
the SQL string. Tried on `main`, OJS and OPS: with the fix, steps 4 to 7
[OPS: 4, 6, 7] answer "No matching records in this repository". The
section's set with no date, and with `from` set to the day before,
still lists the withdrawn item beside the live ones, with the fix and
without it.

**Alternatives:**

- Drop the exact-match branch: it is the one that matches a section's
  set, so its deleted records would vanish from it.
- Move the date conditions before the set condition: it only hides the
  same fault from the next condition anyone adds.

**What goes with it:**

- A test that withdraws an article and asks for its section's set with
  a `from` after today, expecting no record: a PHPUnit test in each
  app's `tests/classes/oai/` (OJS has `JournalOAITest.php` there; OPS
  has no OAI test yet), or a scenario in pkp-e2e's U19 suite.
- Two other proposed fixes change the same query:
  [U19 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md)
  makes the OJS journal join bind the journal's own id, and
  [U19 A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A19-oai-deleted-section-set-lists-nothing.md)
  drops the section join, leaving the `set_spec` condition to choose the
  section's deleted records. Each touches different lines: the three
  OJS diffs apply together on `main` (checked with `git apply`, not
  walked together).
- No data repair. 3.5 needs the same change: the OPS diff applies there
  as it stands, and OJS needs its own diff,
  [fix-ojs-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/fix-ojs-3_5.diff),
  because 3.5 lacks the versioning code around the line (checked with
  `git apply --check`, not walked). On 3.4 the 3.5 OJS diff and the OPS
  diff pass `git apply --check` too.

Medium: the change is a few lines, but it goes into two app repos, OJS
and OPS, each with its own test, and 3.5's OJS needs a separate diff.

## Evidence

- Kept script, which takes the Steps through the screens on OJS and OPS
  on a fresh load of the default dataset, then the neighbour reads (the
  section's set with no date and with `from` the day before; `from`
  alone with no set):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js),
  run with
  `PROBE_FEATURE=issues-w18 PROBE_AGENT=w18 ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-section-set-deleted-records-ignore-dates/walk.js`.
- The fix was tried with `node bin/try-fix.js apply <fix-ojs.diff> ojs`,
  `… <fix-ops.diff> ops`, the same walk, then `revert`.
- Walked 2026-10-01 on PostgreSQL, each install loaded from
  pkp/datasets 38ab955 (2026-09-30), `<app>/main/pgsql` and
  `<app>/stable-3_5_0/pgsql`: main OJS bade233f73 (lib/pkp 2e377d27fc),
  OPS c8af945bb7 (lib/pkp 3dc90c81a6); stable-3_5_0 OJS 92b9a16b48,
  OPS cf4fce69bd (lib/pkp a9c76aed62). MySQL not checked; the fault is
  in how the query groups its conditions, not in the database.
- 3.5, walked: the same Steps and results (its neighbour read also
  carried `until`, which on OPS failed as U19 OPS1 does).
- 3.4, code: OJS `upstream/stable-3_4_0` 9571d8fde7 and OPS
  `upstream/stable-3_4_0` acd8ae704b, `classes/oai/<app>/OAIDAO.php`:
  the same ungrouped `where()->orWhere()`; 1c4b19b9c8 is in every
  `3_4_0` tag from `3_4_0rc1`. 3.3, code: OJS `upstream/stable-3_3_0`
  9fdb9bcf9a and OPS c5532e2161, `classes/oai/ojs/OAIDAO.inc.php` in
  both: `AND (dot.set_spec = ? OR dot.set_spec LIKE ?)`, grouped.
- Introduced: `git blame` on the `orWhere()` line on OJS `main` gives
  4ea46f5f35, the `pkp/pkp-lib#12922` feature commit (OAI record
  versions for DOI versions), which also reformatted this line; at its
  parent, 8de3a94ce2 (a reindent); `git log -S` finds the line added in
  1c4b19b9c8, replacing the bracketed SQL (PR `pkp/ojs#3134`, merged
  2021-06-11). OPS: 5df1969511 (PR `pkp/ops#162`, merged 2021-06-11),
  unchanged since but for reindents. Read on the pkp side: the two PRs
  and `pkp/pkp-lib#6963`; the tracker search also read
  `pkp/pkp-lib#10296`, `#10155`, `#7901` and `#2693`, none of them this
  fault.
- Not walked: OMP (read in the code, Cause).
- Unverified: whether any harvester uses `until` to rebuild a past
  state, the case that would raise the severity; no harvester's
  behaviour was checked.
