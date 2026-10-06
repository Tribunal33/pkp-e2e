# A journal's own OAI address leaves out its deleted records and lists the first journal's instead

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the query is given the journal's ID)
- **Introduced** `pkp/ojs#3134` and `pkp/omp#983` for `pkp/pkp-lib#6963` · [08c3cddc6c](https://github.com/pkp/ojs/commit/08c3cddc6c8c3921d11a26528ec4016ca8c0175b) (OJS), [26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891) (OMP) · 2021-06-08, 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester of one journal's OAI address expects an unpublished article
to come back as a deleted record, so it can drop it. On every journal
except the one with ID 1 (the first created on the installation), the
record disappears instead: the journal's lists leave it out and
GetRecord answers "No matching identifier in this repository". The
site-wide address, when asked for that journal's set, leaves the
journal's deleted records out too. The journal's published records are
listed correctly throughout.

In place of its own deleted records, such a journal's lists and
GetRecord show those of journal 1. They carry journal 1's identifiers
and its set, which the journal's own ListSets does not name, and the
journal's "Earliest Datestamp" becomes the oldest of them. This half
needs nothing unpublished in the journal itself: it shows even on a
journal with nothing published, as soon as journal 1 has a deleted
record.

The harvester keeps showing the withdrawn article, and nothing tells
the journal. The fault needs an installation with more than one journal.
A press does the same with its publication formats; a preprint server
is not affected.

## Impact

- **Lost:** the journal's account of what it withdrew. Services that
  harvest the journal's own address keep the unpublished article.
  Nothing stored is wrong, and the deleted records are listed again once
  the code is fixed. Whether journal 1's deleted records, shown at
  another journal's address, make any harvester drop something is not
  established.
- **Who:** every journal or press but the one with ID 1, on an
  installation that hosts several. Its own deleted records are missing
  from the first time one of its articles is unpublished (or the
  article's issue is unpublished or deleted). Journal 1's deleted
  records appear in its lists from the first time journal 1 has one.
- **Way round:** none at the journal's own address. The site-wide
  address without a `set` lists every journal's deleted records, but a
  harvester pointed there harvests every journal of the site.

Medium: a public list is silently wrong, with no way round at the
address a journal hands out, but only for the few items a journal
unpublishes. It would be high if unpublishing were an everyday action.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP `main` for a press). Its
  journal `publicknowledge` is the installation's first.
- A second journal, created in step 2, because the dataset holds one.
- A published article in the second journal, brought over in steps 3
  and 4 as a copy of the dataset's submission 17, "Antimicrobial, heavy
  metal resistance and plasmid profile of coliforms isolated from
  nosocomial infections in a hospital in Isfahan, Iran" (OMP: submission
  5, "Bomb Canada and Other Unkind Remarks in the American Media").

Steps:

1. Sign in as `admin`.
2. Administration › "Hosted Journals" › "Create Journal" (OMP "Hosted
   Presses" › "Create Press"). Fill in, the same on OJS and OMP: the
   name "Second Journal u19a1" (OMP "Second Press u19a1"), the initials
   "U19A1", the principal contact's name (the same text as the name)
   and email `u19a1@mailinator.com`, the country "Canada", the path `u19a1`;
   under the languages tick "English" and choose it as the primary
   language; tick "Enable this journal to appear publicly on the site".
   Press "Save".
3. In `publicknowledge`: Tools › "Native XML Plugin" › "Export Articles"
   (OMP "Export"): tick submission 17 (OMP 5), press "Export Articles"
   (OMP "Export Submissions"), then "Download Exported File".
4. In `u19a1`: Tools › "Native XML Plugin" › "Import": upload the file,
   press "Import". The results read "The import completed
   successfully" and name the copy, `Submission "21"` (OMP "19"). The
   copy arrives published, on OJS in the section "Articles" (`ART`) that
   every new journal has. Under "Errors occured:" the results list, on
   `main`, "The author 'Vajiheh' does not have any contributor role.
   Defaults to AUTHOR." (OMP: 'Chantal') and, on OJS, "None or more than one issue
   matches the given issue identification …": the second journal has no
   such issue, so the copy is in no issue. Neither line changes what
   follows.
5. Open `/index.php/u19a1/oai?verb=ListRecords&metadataPrefix=oai_dc`:
   it lists the copy. Note its "OAI Identifier",
   `oai:<repository identifier>:article/21` (OMP
   `…:publicationFormat/4`); the repository identifier is the install's
   own (`ojs2.localhost` on the test dataset). [OJS 3.5: an article in
   no issue is not listed, so this answers "No matching records in this
   repository"; read the identifier in step 7 from the site-wide list.]
6. In `u19a1`, open the copy's workflow, press "Unpublish", and confirm
   with "Unpublish".
7. Open the address of step 5 again. Then open the site-wide
   `/index.php/index/oai?verb=ListRecords&metadataPrefix=oai_dc`, the
   same with `&set=u19a1` added, and
   `/index.php/u19a1/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=<the identifier of step 5>`.
8. In `publicknowledge`, open the workflow of submission 17 (OMP 5),
   press "Unpublish", and confirm.
9. Open the address of step 5 again, then
   `/index.php/u19a1/oai?verb=Identify`.

**Expected.** In step 7 the second journal's address lists the copy as a
deleted record (its identifier, the datestamp of step 6, setSpec
`u19a1:ART`, "This record has been deleted."), GetRecord answers the
same record, and the site-wide address lists it with and without
`set=u19a1`. In step 9 the second journal's list still holds that one
record and nothing of `publicknowledge`.

**Observed.** In step 7 the second journal's address answers

```
Error Code   noRecordsMatch
No matching records in this repository
```

and GetRecord answers

```
Error Code   idDoesNotExist
No matching identifier in this repository
```

The site-wide address lists the deleted record (`article/21`, setSpec
`u19a1:ART`), but with `set=u19a1` it answers "No matching records in
this repository".

In step 9 the second journal's address lists one record, the first
journal's:

```
OAI Identifier   oai:ojs2.localhost:article/17
Datestamp        2026-10-01T13:09:49Z
setSpec          publicknowledge:ART
This record has been deleted.
```

Identify gives "Earliest Datestamp 2026-10-01T13:09:49Z", the datestamp
of that record; before step 8 it gave the moment of the request. The
journal's ListSets names only `u19a1` and `u19a1:ART`. On OMP the same
happens with `publicationFormat/4` (the copy's) and `publicationFormat/2`
(the first press's), and a press with a published book of its own lists
the first press's deleted record before it.

Control: after step 8, `publicknowledge`'s own address lists
`article/17` as a deleted record. On OPS the same steps (a second
server, a preprint unposted in it) list the server's own deleted record
and none of the first server's.

A press's series (OMP, after step 9):

10. Repeat steps 3, 4 and 6 with the dataset's submission 14, "From
    Bricks to Brains: The Embodied Cognitive Science of LEGO Robots",
    which is in the series "psy". Nothing is created first: before the
    copy is unpublished, the second press lists it as
    `…:publicationFormat/5` with setSpec `u19a1:psy`.
11. Open
    `/index.php/u19a1/oai?verb=ListRecords&metadataPrefix=oai_dc&set=u19a1:psy`.

**Expected.** The deleted record `publicationFormat/5`, setSpec
`u19a1:psy`.

**Observed.** "No matching records in this repository", at the press's
address and at the site-wide one.

## Cause

`APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()` builds the deleted
records' half of every OAI query. When the request is for one journal it
joins the tombstones to that journal's set objects:

```php
->when(isset($journalId), function ($query, $journalId) {
    return $query->join('data_object_tombstone_oai_set_objects AS tsoj', function ($join) use ($journalId) {
        …
        $join->where('tsoj.assoc_id', '=', (int) $journalId);
```

Laravel's `when($value, $callback)` calls the callback with `$value` as
its second argument. Here `$value` is `isset($journalId)`, so inside the
closure `$journalId` is `true`, and `(int) true` is `1`. The join asks
for the tombstones of journal 1 whatever journal the request named.

The line came with the rewrite of this query on Laravel's query builder
(`pkp/pkp-lib#6963`, "Improve OAI performance"): its first commit kept
`if (isset($journalId)) … use ($journalId)`, the review clean-up
[08c3cddc6c](https://github.com/pkp/ojs/commit/08c3cddc6c8c3921d11a26528ec4016ca8c0175b)
turned the `if`s into `when()`s, and this one took the closure
parameter. The live records' side of the same method reads
`function ($query) use ($journalId)` and is right; on `main` it is two
queries, the current publication's (closure at line 322) and the DOI
versioning one (387), above the tombstone closure at 429. The port to OMP
([26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891))
copied the mistake into `APP\oai\omp\OAIDAO`, for the press and for the
series. OPS's `OAIDAO`, written later, uses `use ($serverId)`.

Reach:

- Every reader of the query: `PKPOAIDAO::getRecords()`,
  `getIdentifiers()`, `getRecord()` (and `recordExists()`, which calls
  it) and `getEarliestDatestamp()`, so ListRecords, ListIdentifiers,
  GetRecord and Identify (walked on OJS and OMP).
- The site-wide address with `set=<journal>`: the set gives the query a
  journal ID, so the same join applies (walked).
- OJS, the `driver` set of the DRIVER plugin:
  `DRIVERPlugin::recordsOrIdentifiers()` hands
  `DRIVERDAO::getDRIVERRecordsOrIdentifiers()` the address's
  `$journalOAI->journalId`, and that calls the same query with it, so
  the set's deleted records are those of journal 1 (code).
- OMP, `set=<press>:<series>`: the series join has the same mistake
  (`function ($query, $seriesId)`), so it asks for series 1 (walked,
  steps 10 and 11; before the fix the press join alone already empties
  the answer, so the series join is told apart only in the code and by
  the fix).
- Journal 1 is right by coincidence (walked: the control). An
  installation whose journal 1 was removed keeps the fault: removing a
  journal writes a tombstone for each of its published articles
  (`ContextService::beforeDeleteContext()`,
  `insertTombstonesByContext()`), so every remaining journal then lists
  those and still none of its own (code).
- Stored data is right: the tombstones and their set objects carry the
  right journal, which is why the site-wide address lists them.

## Proposed fix

Recommended, tried: take the ID from the enclosing scope, as the live
records' half of the query and OPS do. In OJS,
`classes/oai/ojs/OAIDAO.php`
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-own-address-loses-deleted-records/fix-ojs.diff)):

```diff
-            ->when(isset($journalId), function ($query, $journalId) {
+            ->when(isset($journalId), function ($query) use ($journalId) {
```

In OMP, `classes/oai/omp/OAIDAO.php`
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-own-address-loses-deleted-records/fix-omp.diff)),
the same for the press and for the series:

```diff
-                    ->when(isset($pressId), function ($query, $pressId) {
+                    ->when(isset($pressId), function ($query) use ($pressId) {
…
-                    ->when(isset($seriesId), function ($query, $seriesId) {
+                    ->when(isset($seriesId), function ($query) use ($seriesId) {
```

These three are every instance: a search of the three apps and pkp-lib
for a `when()` given a boolean and a two-argument closure finds no
other. The query is written in each app's `OAIDAO`; pkp-lib only
declares the method, so nothing changes there.

Tried on `main`, OJS and OMP: with the fix the Steps show the Expected,
the series group on OMP included. The neighbours are unchanged: `publicknowledge`'s own list, the
site-wide list without a set and with `set=publicknowledge`, and a
second journal with nothing deleted still answering "No matching
records in this repository".

**Alternatives**

- Pass the ID as the condition (`->when($journalId, function ($query,
  $journalId)`), as OMP's live half does: it works, but treats an ID of
  `0` as "no journal", which `isset()` does not.

**What goes with it**

- No data repair. After the fix a journal's address lists its older
  deleted records with their original datestamps, so a harvester that
  asks only for changes since its last visit will not see them:
  dropping the withdrawn articles it already holds takes a full harvest.
- Backport: the lines are the same on `stable-3_5_0` and `stable-3_4_0`
  in both apps.
- Left out: a separate fault seen on the way, not yet reported
  anywhere. On OMP, `set=<press>` leaves out the deleted records of
  books in a series, on the first press too, because the query compares
  the tombstone's set with the press's set exactly (OJS and OPS also
  match `<set>:%`).
- Guard: neither app has a test that runs this query. OJS's
  `tests/classes/oai/JournalOAITest.php` covers identifiers only and OMP
  has no OAI test. The test meant here is a new DAO test with database
  fixtures in each app: two journals (presses), a tombstone with its set
  objects in the second, and `getRecordsRecordSetQuery()` asked for the
  second journal's ID. pkp-e2e's OAI-PMH scenario can cover it end to
  end instead: a second journal unpublishes an article, and its own
  address lists that deleted record and none of the first journal's.

Medium: one line in OJS and two in OMP, following the pattern beside
them, but in two repos, and the DAO test with its fixtures is new in
each. This is a proposal; the team
decides.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-own-address-loses-deleted-records/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-own-address-loses-deleted-records/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset` with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs,omp shared/playwright/checks/issues/oai-own-address-loses-deleted-records/walk.js`
  (`ops` for the control). It reads each OAI address as a harvester
  does, without a session, and records the browser view of steps 5, 7
  and 9. Every run also takes the neighbour reads (the first journal's
  own list, the site-wide lists, the second journal's sets); on OMP it
  then takes steps 10 and 11, reading `set=u19a1:psy` at the press's
  address and at the site-wide one. The script builds nothing outside
  the screens.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-own-address-loses-deleted-records/fix-ojs.diff ojs`
  and `… apply …/fix-omp.diff omp`, the datasets reloaded, walk.js on
  both, then `node bin/try-fix.js revert` for each.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`), no upgrade
  needed. MySQL not checked; the fault is in PHP, before the query
  reaches the database.
  - main: OJS 06fd981b01 (lib/pkp 2e377d27fc), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6), and OPS c8af945bb7 for the control.
  - stable-3_5_0: OJS 18d097d94e, OMP b24879c3db (lib/pkp 1fb843f491).
    OMP as on `main`. OJS: the imported copy is in no issue and 3.5
    lists only articles in an issue, so step 5 answered "No matching
    records in this repository"; after step 6 the site-wide address
    listed `article/21` as deleted while the second journal's address
    listed nothing and, in step 9, listed `article/17`. GetRecord of
    `article/21` at the second journal was read by typing the address
    after the walk. On 3.5 the import lists no contributor-role line.
    OPS was not walked on 3.5.
    Code read: `classes/oai/ojs/OAIDAO.php` and
    `classes/oai/omp/OAIDAO.php`, the same closures as `main`.
  - 3.4 (code): OJS `upstream/stable-3_4_0` 9571d8fde7, OMP 0aec65441f:
    the same `when(isset($journalId), function ($query, $journalId)`
    and `when(isset($pressId), function ($query, $pressId)` closures in
    `classes/oai/<app>/OAIDAO.php`; OPS acd8ae704b has
    `use ($serverId)`.
  - 3.3 (code): OJS 9fdb9bcf9a, OMP 8e72fc8836,
    `classes/oai/<app>/OAIDAO.inc.php`: the query is one SQL string with
    the journal's (press's) ID bound as a parameter. The introducing
    commits are in no 3.3 release; the first tag holding the OJS one is
    3.4.0 rc1.
- Introduced: `git log -L` on the closure's line in
  `classes/oai/ojs/OAIDAO.php` passes reformatting commits
  (`pkp/pkp-lib#12922`, `pkp/pkp-lib#7129`) before 08c3cddc6c; the
  commit before it in the same PR is 1c4b19b9c8. In OMP, blame names a
  code-formatter commit (79302a1bd0); the line first appears in
  26edcaf788.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs and pkp/omp, issues
  and PRs, open and closed: "oai deleted records", "oai tombstone",
  "oai deleted multiple journals", "oai earliestDatestamp",
  "OAIDAO tombstone", "getRecordsRecordSetQuery". `pkp/pkp-lib#2566`
  (2017, closed with a fix) is the opposite symptom in older code: a
  journal's address listing every journal's deleted records.
- Not driven: the `driver` set (read in `plugins/generic/driver/DRIVERPlugin.php`
  and `DRIVERDAO.php`); an installation whose journal 1 was removed
  (read in `classes/services/ContextService.php`); deleting or
  unpublishing an issue as the way an article becomes a deleted record
  (the Steps use "Unpublish" on the article).
- Unverified: what a given harvesting service does with a record that
  stops being listed without a deleted record, and with a deleted
  record of an identifier it never harvested from that address.
