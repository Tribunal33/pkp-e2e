# Asked for a set it does not have, a press's OAI-PMH address lists every record of the press, or of every press

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; the same test drops the same filters, the request itself was not run)
- **Introduced** two changes in pkp/omp: an unknown series ignored since the OAI interface was added, [f22c5e4bc1](https://github.com/pkp/omp/commit/f22c5e4bc1f27e5a47f138271f89e0ca134136d0) · 2012-03-10 · Bruno Beghelli; an unknown press ignored since [980d0b4450](https://github.com/pkp/omp/commit/980d0b445046a939dd44e222079d8d1140d6abe0) for `pkp/pkp-lib#2407` · 2017-03-31 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U19 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester that sends ListRecords or ListIdentifiers to a press's
OAI-PMH address with a set the press does not have expects "No matching
records in this repository", as a journal and a preprint server answer.
A press answers with records instead. This is one fault with two
outcomes. For a set written as the press's own path and a series it
does not have (`publicknowledge:nosuchseries`), the answer is every
record of the press. For any other unknown set, another press's set
included, it is every record of every press on the installation.

Each record names its real set, and nothing in the answer says the set
was not found. A harvester set up for one set is therefore handed books
that are not in that set, with no error.

The fault needs a request for a set the press does not have: a mistyped
one, or the set of a series that has since been removed or given another
path. A set the press has is answered correctly. The site-wide address
answers a press's set correctly and an unknown set with every press's
records.

## Impact

- **Lost:** the "No matching records in this repository" answer a
  request for a set that does not exist should get. The records sent
  instead are public ones.
- **Who:** a service that harvests a press by set, when that set does
  not exist or no longer exists.
- **Way round:** the harvester asks for the set of a series the press
  has. Nothing on the press's screens changes the answer.

Medium: the answer is wrong and silent, but only for a set that does not
exist. It would be high if a set the press has were answered with other
records.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  has two published books: submission 5, "Bomb Canada and Other Unkind
  Remarks in the American Media", in no series, and submission 14, "From
  Bricks to Brains: The Embodied Cognitive Science of LEGO Robots", in
  the series "psy".
- For steps 6 to 11 only: a second press with a published book, created
  in steps 6 to 8, because the dataset holds one press.

One press (no sign-in needed):

1. Open `/index.php/publicknowledge/oai?verb=ListSets`. It names
   `publicknowledge` and one set per series: `publicknowledge:lis`,
   `publicknowledge:pe`, `publicknowledge:his`, `publicknowledge:ed`,
   `publicknowledge:psy`.
2. Open `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   It lists the press's two records, `…:publicationFormat/2` (setSpec
   `publicknowledge`) and `…:publicationFormat/3` (setSpec
   `publicknowledge:psy`). The part before is `oai:` and the install's
   repository identifier, `omp.localhost` on the test dataset.
3. Open the same address with `&set=publicknowledge:nosuchseries` added.
4. Open it with `&set=nosuchset` instead.
5. Open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=nosuchset`.

A second press:

6. Sign in as `admin`. Administration › "Hosted Presses" › "Create
   Press". Fill in the name "Second Press u19omp3", the initials
   "U19OMP3", the principal contact's name (the same text as the name)
   and email `u19omp3@mailinator.com`, the country "Canada", the path
   `u19omp3`; under the languages tick "English" and choose it as the
   primary language; tick "Enable this press to appear publicly on the
   site". Press "Save".
7. In `publicknowledge`: Tools › "Native XML Plugin" › "Export": tick
   submission 5, press "Export Submissions", then "Download Exported
   File".
8. In `u19omp3`: Tools › "Native XML Plugin" › "Import": upload the
   file, press "Import". The results read "The import completed
   successfully" and name the copy, `Submission "19"`. The copy arrives
   published, with its publication format available, so it needs no
   further action. [`main`: the results also list "The author 'Chantal'
   does not have any contributor role. Defaults to AUTHOR."; it changes
   nothing that follows.]
9. Open `/index.php/u19omp3/oai?verb=ListRecords&metadataPrefix=oai_dc`.
   It lists the copy alone, `…:publicationFormat/4`, setSpec `u19omp3`.
10. Open the same address with `&set=nosuchset` added, then with
    `&set=publicknowledge`, then with `&set=publicknowledge:psy`.
11. Open
    `/index.php/publicknowledge/oai?verb=ListRecords&metadataPrefix=oai_dc&set=u19omp3`.

**Expected.** Steps 3, 4, 5, 10 and 11 each answer

```
Error Code   noRecordsMatch
No matching records in this repository
```

**Observed.** Steps 3, 4 and 5 answer with the two records of step 2:

```
oai:omp.localhost:publicationFormat/2   setSpec publicknowledge
oai:omp.localhost:publicationFormat/3   setSpec publicknowledge:psy
```

Every request of steps 10 and 11 answers with the records of both
presses, at the second press's address and at the first's:

```
oai:omp.localhost:publicationFormat/2   setSpec publicknowledge
oai:omp.localhost:publicationFormat/3   setSpec publicknowledge:psy
oai:omp.localhost:publicationFormat/4   setSpec u19omp3
```

With the second press in place, step 4 repeated lists these three
records too. `&set=u19omp3:nosuchseries` at the second press lists
`publicationFormat/4`, the whole of that press.

Control: `&set=publicknowledge:psy` at `publicknowledge` lists
`publicationFormat/3` alone, `&set=publicknowledge:lis` (a series with
no book) answers "No matching records in this repository", and the
site-wide `/index.php/index/oai?…&set=u19omp3` lists
`publicationFormat/4` alone. On OJS and OPS the same steps answer "No
matching records in this repository" at steps 3, 4, 5, 10 and 11.

## Cause

`APP\oai\omp\PressOAI::records()` and `identifiers()` turn the `set`
argument into a press ID and a series ID through
`PressOAI::setSpecToSeriesId()`. That method returns `[0, 0]` itself for
a set with more than two parts, and otherwise calls
`OAIDAO::getSetPressSeriesId()`, which returns `[0, 0]` for a path no
press has and for a press other than the address's own, and
`[<press ID>, 0]` for a series path the press does not have. So a zero
means "not found".

"Not asked" is `null`: `getSetPressSeriesId()` returns `null` as the
series ID when the set names the press alone, and the press ID is `null`
at the site-wide address without a set.

`APP\oai\omp\OAIDAO::getRecordsRecordSetQuery()` then filters the live
records by testing the two IDs for truth
(`classes/oai/omp/OAIDAO.php`, lines 221 to 226):

```php
->when($pressId, function ($query, $pressId) {
    return $query->where('p.press_id', '=', $pressId);
})
->when($seriesId, function ($query, $seriesId) {
    return $query->where('pub.series_id', '=', $seriesId);
})
```

`when()` skips its closure for a falsy value, and `0` is falsy. So "not
found" is read as "not asked": an unknown series drops the series
filter, and an unknown or foreign press drops both filters.

OJS and OPS get the same `[0, 0]` from their own
`getSetJournalSectionId()` / `getSetServerSectionId()` and test
`isset($journalId)` / `isset($sectionId)`, so the query asks for journal
0 or section 0 and matches nothing. The deleted records' half of OMP's
own query tests `isset()` as well.

Reach:

- ListRecords and ListIdentifiers, at a press's address and at the
  site-wide one (walked).
- Deleted records: their half of the query is not part of this fault.
  It keeps a deleted record only when the record's stored set is the
  set asked for and its press and series match the IDs asked for. No
  deleted record stores a mistyped set. A deleted record can still
  store the set of a series since removed or re-pathed, and ListSets
  then still names that set; the series ID asked for is 0 there, which
  no deleted record carries, so the answer is the press's live records
  and, after the fix, "No matching records in this repository", as a
  journal answers for a deleted section's set. Code only, not driven,
  and read without the separate fault of
  [pkp-e2e#254](https://github.com/jardakotesovec/pkp-e2e/issues/254)
  in the same joins.
- `from` and `until` still apply to the records listed (code).
- A press that is not enabled stays out: `p.enabled = 1` is not
  conditional (code).
- GetRecord, Identify and ListSets pass no set and are not touched
  (code).
- Nothing stored is wrong.

## Proposed fix

Recommended, tried: test the two IDs with `isset()` and take them from
the enclosing scope, as OJS's and OPS's `OAIDAO` do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-unknown-set-lists-other-records/fix.diff)):

```diff
-            ->when($pressId, function ($query, $pressId) {
-                return $query->where('p.press_id', '=', $pressId);
+            ->when(isset($pressId), function ($query) use ($pressId) {
+                return $query->where('p.press_id', '=', (int) $pressId);
             })
-            ->when($seriesId, function ($query, $seriesId) {
-                return $query->where('pub.series_id', '=', $seriesId);
+            ->when(isset($seriesId), function ($query) use ($seriesId) {
+                return $query->where('pub.series_id', '=', (int) $seriesId);
             })
```

These two are every instance. The other truthy `when()`s of the three
apps' queries (`$from`, `$until`, `$submissionId`) are never given a
zero that means "not found". The callers that pass no set
(`getRecord()`, `getEarliestDatestamp()`, a list without `set`) hand in
the press's ID at a press's address and `null` at the site-wide one,
and `null` as the series ID; `isset()` reads each as the truthy test
did.

Tried on OMP `main`: with the fix, steps 3, 4, 5, 10 and 11 answer "No
matching records in this repository". The neighbours are unchanged: each
press's list without a set and with its own set, each series' set, the
site-wide list without a set and with each press's set, a `from` and an
`until` window, and Identify.

**Alternatives**

- Answer the error in `PressOAI` as soon as `setSpecToSeriesId()`
  returns a zero (its own or `getSetPressSeriesId()`'s): it works, but
  OJS and OPS leave it to the query, so OMP would be the odd one.
- Check the set against the repository's sets in pkp-lib's `OAI`, for
  all three apps: a new rule in the shared layer, and it would change
  what a journal answers for a deleted section's set that is still
  listed.

**What goes with it**

- Backport: the same six lines are on `stable-3_5_0` and `stable-3_4_0`.
  On `stable-3_3_0` the query is one SQL string; the same change there
  is `isset()` wherever `_getRecordsRecordSet()` tests `$pressId` and
  `$seriesId` for truth: the four `$params[] =` lines (193 to 197, two
  for the live half and two for the deleted half) and the two `AND`
  clauses of the live half (216, 217). That also makes the deleted
  half bind a value for each placeholder it writes. Not tried there.
- [pkp-e2e#254](https://github.com/jardakotesovec/pkp-e2e/issues/254)
  proposes a fix in the deleted records' half of the same method. The
  two touch different lines and do not depend on each other.
- Guard: no test asks a list with a `set`. pkp-lib's
  `cypress/tests/integration/oai/Verbs.cy.js`, which OMP's Cypress run
  includes, asks ListRecords and ListIdentifiers at the site-wide
  address without one; a case with `&set=nosuchset` expecting
  `noRecordsMatch` there would have caught this on all three apps.
  pkp-e2e's OAI-PMH scenario "A set the journal does not have" reads OJS
  and OPS only; it can read a press too once this is fixed.

Small: two conditions in one method, following the pattern of the other
two apps. This is a proposal; the team decides.

## Evidence

- Kept script that takes the Steps on an install loaded from PKP's
  default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-unknown-set-lists-other-records/walk.js),
  run after `npm run fleet-prep -- --feature issues-omp3 --dataset 2 --reset`
  with
  `PROBE_FEATURE=issues-omp3 PROBE_AGENT=omp3 node bin/probe.js all shared/playwright/checks/issues/oai-unknown-set-lists-other-records/walk.js`.
  It reads each OAI address as a harvester does, without a session, and
  records the browser view of steps 2, 3, 4, 9, 10 and 11. Every run
  also takes the neighbour reads and, on OJS and OPS, the same steps as
  the control (submissions 17 and 19 copied). Its helpers are those of
  two other reports,
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-own-address-loses-deleted-records/lib.js)
  (the press, the OAI reads) and
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unknown-section-import-broken-submission/lib.js)
  (the Native XML Plugin). The script builds nothing outside the
  screens.
- The fix, tried 2026-10-01 on the OMP `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/oai-unknown-set-lists-other-records/fix.diff omp`,
  the dataset reloaded, walk.js on OMP, then `node bin/try-fix.js revert`
  with the same arguments.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`), no upgrade
  needed. MySQL not checked; the fault is in PHP, before the query
  reaches the database.
  - main: OMP 3b0ecf794c (lib/pkp 3dc90c81a6); OJS 06fd981b01 (lib/pkp
    2e377d27fc) and OPS c8af945bb7 (lib/pkp 3dc90c81a6) for the control.
  - stable-3_5_0: OMP b24879c3db (lib/pkp 1fb843f491), the same answers
    as `main` at every step. OJS 18d097d94e and OPS 3f0919468c for the control. Code read:
    `classes/oai/omp/OAIDAO.php`, the same two `when()`s (lines 235 to
    240), and `getSetPressSeriesId()` returning the same zeros.
  - 3.4 (code): OMP `stable-3_4_0` 0aec65441f, `classes/oai/omp/OAIDAO.php`:
    the same two `when()`s; `PressOAI::records()` and `identifiers()`
    call `setSpecToSeriesId()` the same way.
  - 3.3 (code): OMP `stable-3_3_0` 8e72fc8836,
    `classes/oai/omp/OAIDAO.inc.php`, `_getRecordsRecordSet()`: the live
    half adds `' AND p.press_id = ?'` and `' AND pub.series_id = ?'`
    only when `$pressId` and `$seriesId` are truthy, the same test. The
    deleted records' half there writes its placeholders under `isset()`
    but binds their values under the truthy test, so with a zero the
    query has more placeholders than values. So the code supports that
    3.3 has the fault (an unknown set drops the live half's filters);
    unverified is whether the request there lists the records or ends
    in a database error on that mismatch.
- Introduced, traced in pkp/omp from `classes/oai/omp/OAIDAO.php` line
  221: the series half has ignored an unknown series since OMP's OAI
  interface was added
  ([f22c5e4bc1](https://github.com/pkp/omp/commit/f22c5e4bc1f27e5a47f138271f89e0ca134136d0),
  2012-03-10: `isset($seriesId) && $seriesId != 0`). The press half
  tested `isset($pressId)`, which asks for press 0 and matches nothing
  (read in the code of that time, not run), until the query was
  rewritten in
  [980d0b4450](https://github.com/pkp/omp/commit/980d0b445046a939dd44e222079d8d1140d6abe0)
  (2017-03-31, "`pkp/pkp-lib#2407` Remove mutex use"), which wrote
  `$pressId ? …`. The move to the query builder
  ([26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891),
  2021-06-11) kept both tests as `when($pressId, …)` and
  `when($seriesId, …)`.
- Upstream search 2026-10-01, pkp/pkp-lib and pkp/omp, issues and PRs,
  open and closed: "oai set unknown", "oai noRecordsMatch", "oai set
  series omp", "oai set", "oai nonexistent set", "oai invalid set
  records", "getSetPressSeriesId", "OAIDAO". Read and set aside:
  `pkp/pkp-lib#5384` (a press's ListRecords failing on a query error,
  2019), `pkp/pkp-lib#2033` (a withdrawn book listed twice),
  `pkp/pkp-lib#13161` (schema and date granularity).
- Not driven: a series removed or given another path in the press's
  settings as the way a set stops existing (the set is the press's path
  and the series' path, `OAIDAO::setSpec()`; the Steps type an unknown
  set instead); an unknown set on a press with a deleted
  record; a press that is not enabled.
- Unverified: what a given harvesting service does with records whose
  setSpec is not the set it asked for.
