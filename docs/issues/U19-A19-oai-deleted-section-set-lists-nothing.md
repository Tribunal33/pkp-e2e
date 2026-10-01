# An OAI set left behind by a changed section abbreviation or a deleted section is listed but lists nothing

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/ojs#1344` for `pkp/pkp-lib#2407` · [a9ad0fe883](https://github.com/pkp/ojs/commit/a9ad0fe8837f009182d01f2eddf4a38066ec2b1a) · 2017-03-31 · Alec Smecher (asmecher), by a code read; OPS was made from OJS with the query as it was
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a19)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

When a section's "Abbreviation" is changed, the deleted records of
articles unpublished in it before the change can no longer be harvested
by section. ListSets names two sets for the section, the old identifier
and the new one. Asking for the old set answers "No matching records in
this repository", and the new set lists the section's published
articles without those deleted records.

The same happens to the set of a section that was deleted after its
unpublished article was moved to another section: ListSets still names
it, and asking for it lists nothing. Both show for ListRecords and
ListIdentifiers, at the journal's address and the site-wide one.

A service that harvests by section keeps the withdrawn article and is
not told. The journal's own set and a list without a set do carry the
deleted records. A press's series were not checked on screen.

## Impact

- **Lost:** the notice that an article was withdrawn, for a service
  that harvests one section's set. After a changed abbreviation this
  covers every article unpublished in that section before the change.
  Nothing stored is wrong.
- **Who:** harvesters that ask by section, on a journal or preprint
  server where a section's "Abbreviation" was changed, or a section
  deleted, after something in it was unpublished. Sections are seldom
  renamed; once it has happened the old set stays in ListSets for good,
  unless the article is published again.
- **Way round:** asking for the journal's set (`set=publicknowledge`)
  or for no set lists the deleted records. Nothing in the answers tells
  a harvester to do so.

Medium: a section that still exists silently stops delivering its
earlier deleted records by set, but only after its abbreviation was
changed, and the journal's set still delivers them. It would be high if
the journal's set lost them too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OPS `main` for a preprint
  server).
- A new section, created in step 5. A section can be deleted only when
  no submission is in it, and every section of the dataset holds some
  (OJS has two sections, OPS one).

A section's abbreviation changed:

1. Sign in as `admin`.
2. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran" (OPS: submission 19, "Finocchiaro:
   Arguments About Arguments"). Press "Unpublish" (OPS "Unpost") and
   confirm.
3. Settings › Journal (OPS Server) › "Sections" › "Articles" (OPS
   "Preprints") › "Edit": change "Abbreviation" from "ART" to "ARTX"
   (OPS "PRE" to "PREX"). Press "Save".
4. Open `/index.php/publicknowledge/oai?verb=ListSets`, then
   `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=publicknowledge:ART`
   (OPS `:PRE`), then the same with `set=publicknowledge:ARTX` (OPS
   `:PREX`).

**Expected.** ListSets names `publicknowledge:ART`, and asking for it
lists the deleted record `article/17`, whose header carries that set.

**Observed.** ListSets names both sets under the same name:

```
setName  Articles    setSpec  publicknowledge:ARTX
setName  Articles    setSpec  publicknowledge:ART
```

`set=publicknowledge:ART` answers

```
Error Code   noRecordsMatch
No matching records in this repository
```

and `set=publicknowledge:ARTX` lists the section's one published
article and no deleted record. On OPS the same with `preprint/19`, `PRE`
and `PREX`.

A deleted section (continuing):

5. Settings › "Sections" › "Create Section": "Section title" "Notes
   u19a19", "Abbreviation" "U19A19" (OPS: also "Section URL Path"
   `u19a19`). Press "Save".
6. Open submission 17 (OPS 19) › Publication › "Publication Settings"
   (OJS 3.5: "Issue"; OPS: "Preprint entry"): choose "Notes u19a19"
   under "Section" and press "Save".
7. Press "Schedule For Publication" (OPS "Post") and confirm; the
   article is published at once, in its issue. Then press "Unpublish"
   (OPS "Unpost") and confirm.
8. On the page of step 6 choose "Articles" (OPS "Preprints") under
   "Section" and press "Save". The unpublished article still counts as
   a submission of its section, so the section cannot be deleted before
   this.
9. Settings › "Sections" › "Notes u19a19" › "Delete", and answer "Are
   you sure you want to permanently delete this section?" with "OK".
10. Open `/index.php/publicknowledge/oai?verb=ListSets`, then
    `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=publicknowledge:U19A19`,
    then the same at the site-wide address `/index.php/index/oai`.

**Expected.** ListSets names `publicknowledge:U19A19`, and asking for
it lists the deleted record `article/17`.

**Observed.** ListSets names the set, "Notes u19a19",
`publicknowledge:U19A19`. Asking for it answers "No matching records in
this repository" at both addresses, for ListRecords and ListIdentifiers.

Control: `…?verb=ListRecords&metadataPrefix=oai_dc` without a set, and
with `set=publicknowledge`, list the record:

```
OAI Identifier   oai:ojs2.localhost:article/17
Datestamp        2026-10-01T15:53:06Z
setSpec          publicknowledge:U19A19
This record has been deleted.
```

After step 7, while the section still existed, `set=publicknowledge:U19A19`
listed that deleted record.

## Cause

`APP\oai\ojs\OAIDAO::getJournalSets()` names the set of every section,
then every set that deleted records carry and no section has
(`DataObjectTombstoneDAO::getSets()`). A deleted record keeps the set
identifier and name its section had when the article was unpublished.

When a list is asked for a set, `JournalOAI::setSpecToSectionId()` calls
`OAIDAO::getSetJournalSectionId()`, which looks the abbreviation up
among the journal's sections as they are now. A deleted section, or an
abbreviation no section has any more, gives the journal's ID and
section ID `0`.

`OAIDAO::getRecordsRecordSetQuery()` then joins the deleted records to
that section (OJS's lines; OPS chains the same conditions and has no
`(int)` cast):

```php
->when(isset($sectionId), function ($query) use ($sectionId) {
    return $query->join('data_object_tombstone_oai_set_objects AS tsos', function ($join) use ($sectionId) {
        …
        $join->where('tsos.assoc_id', '=', (int) $sectionId);
```

`isset(0)` is true, so the inner join asks for section 0, which no
deleted record carries, and the half of the query that lists deleted
records is empty. The filter on the stored set identifier that follows
(`dot.set_spec = $set`, or a set beginning with it) is what tells the
records of the set asked for; the join removes them before it counts.

The join became an inner join in
[a9ad0fe883](https://github.com/pkp/ojs/commit/a9ad0fe8837f009182d01f2eddf4a38066ec2b1a)
(`pkp/pkp-lib#2407`), which rewrote the query as a UNION. Before it the
deleted records were LEFT JOINed to their section, and the row was kept
on `dot.data_object_id IS NOT NULL`, so a section 0 dropped nothing.
That older query was read, not driven, and it had other faults in the
same joins, so this is reported as a defect and not as a regression.
OPS's `APP\oai\ops\OAIDAO` has the same join and
`getSetServerSectionId()`.

Reach:

- ListRecords and ListIdentifiers, at the journal's address and the
  site-wide one (walked, OJS and OPS). GetRecord takes no set and is
  right.
- A changed abbreviation (walked): the old set finds no section, and
  the new set finds the section but not the deleted records, whose
  stored set identifier is the old one. The section's published
  articles are listed by the new set.
- A section whose abbreviation differs by language (code, not driven):
  the deleted record stores the abbreviation in the language of the
  editor who unpublished, so a request in another language lists that
  set from the deleted records and finds no section for it.
- OMP (code, not driven): `APP\oai\omp\OAIDAO` joins a removed series
  the same way, but two other faults sit in the same lines there
  ([pkp-e2e#254](https://github.com/jardakotesovec/pkp-e2e/issues/254),
  [pkp-e2e#299](https://github.com/jardakotesovec/pkp-e2e/issues/299)),
  so a press is not in Affects.

## Proposed fix

Recommended, tried: skip the section join for deleted records when the
set's journal was found and its section was not, and let the stored set
identifier select them. In OJS, `classes/oai/ojs/OAIDAO.php`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ojs.diff)):

```diff
-            ->when(isset($sectionId), function ($query) use ($sectionId) {
+            ->when(isset($sectionId) && ($sectionId || !$journalId), function ($query) use ($sectionId) {
                 return $query->join('data_object_tombstone_oai_set_objects AS tsos', function ($join) use ($sectionId) {
```

and the same line in OPS, `classes/oai/ops/OAIDAO.php`, with
`$serverId`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ops.diff)).
Only the deleted records' join changes. The published records' filters
keep `isset($sectionId)`, so a set no section has still lists no
published record.

The journal condition matters. `getSetJournalSectionId()` answers
`[0, 0]` for a set of another journal than the address's, and for an
unknown journal. Skipping the join on section 0 alone would, on OJS,
list journal 1's deleted records at another journal's address, because
the journal join there asks for journal 1 whatever the request
([pkp-e2e#254](https://github.com/jardakotesovec/pkp-e2e/issues/254)).
With the condition as proposed that request keeps its section join and
lists nothing.

Tried on `main`, OJS and OPS, in three walks (without the fix, with it,
and with it and the fix of
[pkp-e2e's report on A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-A20-oai-section-set-deleted-records-ignore-dates.md)
together):

- With the fix the Steps show the Expected in both groups.
- Unchanged by the fix: a set nobody has (`publicknowledge:NOPE`,
  `nosuchset`, a three-part set) answers "No matching records in this
  repository"; the section's present set lists its published records
  only; the journal's set and the list without a set are as before.
- At a second journal created on screen (path `u19a19b`), asking for
  the first journal's sets (`publicknowledge:U19A19`,
  `publicknowledge:ART`, `publicknowledge`) answers "No matching
  records in this repository", with and without the fix.
- Dates: with this fix alone, `set=publicknowledge:U19A19&from=2030-01-01`
  lists the deleted record, as a live section's set does today. That is
  the A20 report's fault, in the set filter this fix now relies on.
  With both fixes in, `from=2030-01-01` and `until=2020-01-01` answer
  "No matching records in this repository" and `from` today lists the
  record.

**Alternatives**

- Skip the join whenever the section is 0 (`!empty($sectionId)`):
  shorter, and wrong on OJS until pkp-e2e#254 is fixed, as above.
- Look the section's ID up from the deleted records when no section
  matches (in `getSetJournalSectionId()`): more code, and after a
  changed abbreviation it would hand the published records' filter the
  live section, listing its articles under the old set.
- Stop naming sets in ListSets that no section has: the deleted records
  would then be reachable by no section set at all.

**What goes with it**

- The A20 report's fix, in the same change: without it the sets this
  fix brings back ignore `from` and `until` for their deleted records.
  [fix-ojs-with-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ojs-with-a20.diff)
  and
  [fix-ops-with-a20.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ops-with-a20.diff)
  hold the two together, as tried.
- OJS, a journal other than ID 1 (code, not driven): its deleted
  records are joined to journal 1 until pkp-e2e#254 is fixed, so there
  this fix shows only once that one is in. It does no harm before.
- No data repair. A harvester sees the old sets' deleted records the
  next time it asks for them.
- Backport: the OPS diffs apply as they are to `stable-3_5_0` and
  `stable-3_4_0` (dry run). OJS has the same line there at another
  indentation, so the change is made by hand. On `stable-3_3_0` the
  query is an SQL string in `classes/oai/ojs/OAIDAO.inc.php` (OPS has
  the file under the same path): the `isset($sectionId)` that adds the
  `tsos` join in the deleted records' half, and the `$sectionId`
  parameter pushed for it, take the same condition.
- Guard: neither app has a test that runs this query (OJS's
  `tests/classes/oai/JournalOAITest.php` covers identifiers only). A
  database test: a tombstone whose set objects name a journal and a
  section ID no section has, the query asked for that journal with
  section 0 and the tombstone's set (listed), and asked with journal 0
  and section 0 (not listed). On OJS the fixture's journal must not be
  assumed to be ID 1: written for any other journal the test passes
  only with pkp-e2e#254's fix, so it lands with or after that one.

Medium: one line in each of two repos, and a new database test with its
fixtures in each; it should travel with the A20 fix. This is a
proposal.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset` with
  `PROBE_FEATURE=issues PROBE_AGENT=walk ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/walk.js`.
  It reads each OAI address as a harvester does, without a session, and
  records the browser view of steps 4 and 10. After the steps it reads
  the deleted section's set with `from` and `until`, creates the second
  journal (server) on Administration › "Hosted Journals" as `admin`,
  and reads the first journal's sets at its address.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-deleted-section-set-lists-nothing/fix-ojs.diff ojs`
  and `… apply …/fix-ops.diff ops`, the datasets reloaded, walk.js on
  both, then `node bin/try-fix.js revert` for each; the same once more
  with the two `…-with-a20.diff` files, with this walk and the A20
  report's.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`), no upgrade
  needed. MySQL not checked; the fault is in PHP, before the query
  reaches the database.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc), OPS c8af945bb7 (lib/pkp
    3dc90c81a6).
  - stable-3_5_0: OJS 18d097d94e, OPS 3f0919468c (lib/pkp 1fb843f491),
    both groups as on `main` (walked before the reads after step 10
    were added). Code read: `classes/oai/ojs/OAIDAO.php` line 317 and
    `classes/oai/ops/OAIDAO.php` line 278, the same join.
  - 3.4 (code): OJS `upstream/stable-3_4_0` 9571d8fde7, OPS acd8ae704b:
    the same `when(isset($sectionId), …)` join in the deleted records'
    half, `getSetJournalSectionId()` / `getSetServerSectionId()`
    returning section 0, and the sets of deleted records listed by
    `getSets()`.
  - 3.3 (code): OJS 9fdb9bcf9a, OPS c5532e2161,
    `classes/oai/ojs/OAIDAO.inc.php` in both: the deleted records' half
    joins `tsos` on `isset($sectionId)`, `getSetJournalSectionId()`
    returns 0 when `getByAbbrev()` finds no section, and
    `getJournalSets()` lists the deleted records' sets.
- Introduced: a9ad0fe883 is where `LEFT JOIN
  data_object_tombstone_oai_set_objects tsos` becomes `JOIN`; its first
  release is OJS 3.1.0. The join itself dates from
  [cefffecc85](https://github.com/pkp/ojs/commit/cefffecc858d1f7795206cbf2544e1f5e6e4a212)
  (2012), as a LEFT JOIN. No version before a9ad0fe883 was driven.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs and pkp/ops, issues
  and PRs, open and closed: "oai set deleted section", "oai tombstone
  set", "oai section abbreviation set", "ListSets deleted", "oai
  setSpec noRecordsMatch", "getSetJournalSectionId". Read and set
  aside: `pkp/pkp-lib#13144` (ListSets fails when a section has no
  abbreviation), `pkp/pkp-lib#7901` and `pkp/pkp-lib#6625` (a record
  listed both as deleted and as published), `pkp/pkp-lib#4235` (the
  characters of a set identifier).
- Not driven: a section whose abbreviation differs by language, OMP's
  series, and a deleted record in a journal other than ID 1 (each read
  in the `OAIDAO` classes); a list long enough to continue with a
  resumption token.
