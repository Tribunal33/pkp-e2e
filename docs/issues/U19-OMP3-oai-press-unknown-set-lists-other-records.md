# A harvester asking a press's OAI-PMH for a set it does not have gets other books instead of none

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; a database error instead of the wrong books)
- **Introduced** `pkp/omp#983` for `pkp/pkp-lib#6963` · [26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891) · 2021-06-11 · Alec Smecher (asmecher), turning an older database error into the wrong books; the error is present since at least [980d0b4450](https://github.com/pkp/omp/commit/980d0b445046a939dd44e222079d8d1140d6abe0) (2017-03-31)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A harvester can ask a press's OAI-PMH address for one set: a press,
named by its path (`publicknowledge`), or one of its series, named
"press path:series path" (`publicknowledge:psy`). When the press has no
such set, a harvester expects "No matching records in this repository",
as a journal answers. Instead it gets other books:

- At a press's address, a series that press does not have: all of that
  press's books.
- At a press's address, another press, a press that does not exist, or
  another press's series: the books of every press on the install.
- At the site-wide address, a press that does not exist: the books of
  every press; a series the press does not have: all of that press's
  books. Another press's set there is answered correctly.

A deleted series counts as a series the press does not have: ListSets
keeps offering its set while withdrawn books remain in it, and asking
for that set lists all the press's books. On an install with one press,
every case lists that press's own books; the "every press" cases need
several presses.

## Impact

- **Lost.** A correct public record. An index that harvests one series
  files every book of the press, or of every press on the install, under
  that series, and nobody is told.
- **Who.** Indexes and aggregators that harvest a press by set, when the
  set they hold names no live series or press: a deleted series that
  ListSets still offers, a series or press whose path was changed, or a
  typing mistake.
- **Way round.** None on the press's side. A harvester operator who
  notices can re-read ListSets and correct the set, except for a
  deleted series, which ListSets still lists.

Medium: a machine-read output gives a silently wrong result, but only
for a set that names no live series or press; it would be high if
harvesters commonly held such sets.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  publishes two books that OAI lists: "Bomb Canada and Other Unkind
  Remarks in the American Media" (in no series, set `publicknowledge`)
  and "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots" (Psychology, set `publicknowledge:psy`).
- A second press, created in step 1, since the dataset holds one press.
  It publishes nothing.

Steps:

1. Sign in as `admin`. Administration › "Hosted Presses" › "Create
   Press": name "u19w21 Second Press", path `u19w21`, English, "Enable
   this press to appear publicly on the site" ticked › "Save". Sign out.
2. Open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:psy`
   (control).
3. Open the same address with `set=publicknowledge:nosuchseries`.
4. Open it with `set=nosuchpress`.
5. Open it with `set=u19w21`.
6. Open `/index.php/u19w21/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge`,
   then the same with `set=publicknowledge:psy`.
7. Open the site-wide
   `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=nosuchpress`,
   then the same with `set=publicknowledge:nosuchseries`.
8. Open the site-wide address with `set=u19w21` (control).

**Expected.** Step 2 lists "From Bricks to Brains" alone. Steps 3 to 8
each answer:

```xml
<error code="noRecordsMatch">No matching records in this repository</error>
```

**Observed.** Step 2 lists `publicationFormat/3` (`publicknowledge:psy`)
alone, and step 8 answers "No matching records in this repository".
Steps 3, 4, 5, 6 (both addresses) and 7 (both) each list both of the
press's books, for example step 5:

```xml
<request verb="ListIdentifiers" metadataPrefix="oai_dc" set="u19w21">…/index.php/publicknowledge/en/oai</request>
<ListIdentifiers>
  <header>
    <identifier>oai:omp.localhost:publicationFormat/2</identifier>
    <setSpec>publicknowledge</setSpec>
  </header>
  <header>
    <identifier>oai:omp.localhost:publicationFormat/3</identifier>
    <setSpec>publicknowledge:psy</setSpec>
  </header>
</ListIdentifiers>
```

ListRecords with step 3's set hands out both books' full records too.
The same steps on a journal and a preprint server (Hosted Journals,
Hosted Servers, the sets `publicknowledge:ART` and `publicknowledge:PRE`)
answer "No matching records in this repository" at steps 3 to 8.

## Cause

`PressOAI::setSpecToSeriesId()` resolves the `set` argument through
`OAIDAO::getSetPressSeriesId()`. That returns `[0, 0]` for a press path
no press has and, at a press's own address, for another press's path; it
returns series `0` for a series the press does not have, a deleted one
included. The 0 means "no such set": it is meant to match nothing.

`OAIDAO::getRecordsRecordSetQuery()`
([classes/oai/omp/OAIDAO.php](https://github.com/pkp/omp/blob/3b0ecf794/classes/oai/omp/OAIDAO.php#L221-L226),
lines 221–226; `_getRecordsRecordSetQuery()` on 3.5 and 3.4) then tests
the ids for truth:

```php
->when($pressId, function ($query, $pressId) {
    return $query->where('p.press_id', '=', $pressId);
})
->when($seriesId, function ($query, $seriesId) {
    return $query->where('pub.series_id', '=', $seriesId);
})
```

A 0 is false, so the filter is dropped instead of matching nothing. An
unknown series keeps the press filter and lists the whole press; an
unknown press drops both and lists every enabled press. OJS's and OPS's
twins of this query test the same ids with `isset()`, so a 0 there
matches nothing.

The truth test is older than the query builder. 3.3's hand-built SQL
(`_getRecordsRecordSet()`) adds `AND p.press_id = ?` and its parameter
only for a non-zero id, but the deleted-records half adds its `?` for
the press and the series whenever the id is set. So a 0 leaves fewer
parameters than placeholders (three placeholders and one parameter for
`[0, 0]`, four and three for `[press, 0]`), and the query fails with a
database error. The 2021 port to the query builder (26edcaf788) kept
the truth test while binding each value with its condition, which
turned that error into the wrong books.

Reach:

- ListIdentifiers and ListRecords with a `set`, at a press's address and
  at the site-wide one (walked). A `set` with more than one colon also
  resolves to `[0, 0]` and lists every press (code).
- A deleted series' set, which ListSets still offers from the stored
  deleted records (`OAIDAO::getSets()`), resolves to series 0 and lists
  all the press's live books (code).
- GetRecord, Identify's earliest datestamp and lists without a `set` pass
  the press's own id or null, never 0, and are not affected (code; the
  lists walked).
- Deleted records follow their own conditions in the second half of the
  query, including the stored set name (`dot.set_spec = $set`); their
  faults are another report's
  ([U19-A1-oai-journal-deleted-records-first-journal.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A1-oai-journal-deleted-records-first-journal.md)).

## Proposed fix

Test the ids with `isset()`, as OJS's and OPS's twins do, so a 0
filters on an id no press or series has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-press-unknown-set-lists-other-records/fix.diff)):

```diff
-            ->when($pressId, function ($query, $pressId) {
-                return $query->where('p.press_id', '=', $pressId);
+            // 0 is getSetPressSeriesId()'s "no such set": it must match nothing, not lift the filter.
+            ->when(isset($pressId), function ($query) use ($pressId) {
+                return $query->where('p.press_id', '=', (int) $pressId);
             })
-            ->when($seriesId, function ($query, $seriesId) {
-                return $query->where('pub.series_id', '=', $seriesId);
+            ->when(isset($seriesId), function ($query) use ($seriesId) {
+                return $query->where('pub.series_id', '=', (int) $seriesId);
             })
```

The closure takes the id through `use`, because `when()` hands the
closure its condition, which is now `true`. When no set is asked, or the
set is a press without a series, the missing id still adds no condition
at its level. These are the only two truth tests on a set id in the
three apps' OAI queries and pkp-lib's `PKPOAIDAO`.

Tried on `main`: the Steps then show Expected. Lists without a set, the
press's own set and a live but empty series ("History",
`publicknowledge:his`) gave the same answers with the fix and without
it, and the new press's own list stayed empty.

**Alternatives:**

- Return an empty list in `PressOAI::records()` and `identifiers()` when
  the set resolves to 0: a guard at the callers that leaves the query
  wrong for any plugin that calls it.
- Return null instead of 0 from `getSetPressSeriesId()`: null already
  means "no filter", so this would make the leak worse.

**What goes with it:**

- Backport: the same two lines are in 3.5's and 3.4's
  `_getRecordsRecordSetQuery()`, and the diff applies there as it stands
  (checked with `git apply`). On 3.3 the same change to the six
  `$pressId` / `$seriesId` truth tests in `_getRecordsRecordSet()`
  (`if ($pressId) $params[] = …` and `($pressId ? ' AND p.press_id = ?' : '')`)
  lines the parameters up with the placeholders again and ends the
  database error.
- No data repair: nothing wrong is stored. Harvesters that already took
  the wrong records keep them until they re-harvest.
- The deleted-records half of the query has a fault of its own
  (the A1 report above); the two fixes touch different lines and apply
  together.
- Test: a unit test of the query with `[0, 0]` and `[pressId, 0]`, or
  the spec's "A set the journal does not have" check extended to a
  press.

Small: two lines in one class and a test, with no data repair.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-press-unknown-set-lists-other-records/walk.js),
  run on all three apps on an install reset to the default dataset:
  `PROBE_FEATURE=issues-w21 PROBE_AGENT=w21 node bin/probe.js all shared/playwright/checks/issues/oai-press-unknown-set-lists-other-records/walk.js`
  (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front). After the
  Steps it reads the cases a fix must leave alone (no set, the press's
  own set, a live empty series, ListRecords with an unknown series, the
  new press's own list), with the fix in and out.
- Tips walked: OMP `main` [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794)
  (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)),
  OMP `stable-3_5_0` [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00)
  (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)),
  on PostgreSQL, default dataset from pkp/datasets 38ab955 (2026-09-30).
  MySQL not checked.
- Code reads: `classes/oai/omp/OAIDAO.php` (the record query,
  `getSetPressSeriesId()`, `getSets()`) and `PressOAI.php`
  (`setSpecToSeriesId()`, `records()`, `identifiers()`) on `main` and
  3.5; `stable-3_4_0` [0aec65441](https://github.com/pkp/omp/commit/0aec65441):
  the same two `when()` lines (239, 242) in `_getRecordsRecordSetQuery()`;
  `stable-3_3_0` [8e72fc883](https://github.com/pkp/omp/commit/8e72fc883)
  (pkp-lib [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe)):
  `_getRecordsRecordSet()` in `OAIDAO.inc.php`, whose parameters are
  pushed under `if ($pressId)` / `if ($seriesId)` while the deleted-records
  joins add placeholders under `isset()`, run through `DAO::retrieve()`
  (`Capsule::cursor()`).
- Introduced: `git blame` on lines 221–226 gives 79302a1bd0 (formatting)
  and 26edcaf788 (the port); `git log -S"p.press_id = ?"` leads to
  980d0b4450 (`pkp/omp#402`), which first built the `$pressId ?` SQL with
  the `isset()` placeholders. Before it the code joined
  `ms.context_id = ?` under `isset($pressId)`; that version was not
  traced further.
- Unverified: the 3.3 database error is read in the code, not walked; the
  deleted-series case is read in the code, not walked; which indexes
  harvest a press by series set, and how often their set names go stale.
