# A press's or preprint server's OAI record keeps its earlier datestamp after an edit or a second publish

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code; the publish-again half)
  - 3.3: none (code; unpublishing and publishing stamp the submission)
- **Introduced** `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr), for the publish-again half; the edit half not traced, present since published versions can be edited (3.5)
- **Upstream** `pkp/pkp-lib#12958` (open), the same symptom stated without steps or an app; this report adds to it the apps, the steps, the cause and a tried fix
- **Tracked in** spec U19 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a18)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvester that asks for the records changed since its last visit
expects an edited item, or one published again, to come back. On a
press and a preprint server the datestamp stays where it was before the
change: a saved edit of the published version does not move it, and an
item published again after "Unpublish" ("Unpost") comes back with its
earlier datestamp, older than its deleted record's.

A harvester that harvested the deleted record never sees the item come
back, and one that holds the item never learns it was edited. Nothing
tells the press, and no screen moves the datestamp. Publishing again
moved the datestamp until 3.3; editing a published version is new with
3.5 and has never moved it. A journal's datestamp moves in both cases,
because a journal's records also take the date of the published
version.

## Impact

- **Lost:** a service that harvests only what changed since its last
  visit keeps the old metadata of an edited book or preprint. One that
  removed a book or preprint when it was unpublished does not add it
  back once it is published again.
- **Who:** every press and preprint server, for each item whose
  published version is edited, or that is unpublished and published
  again (the usual way to correct a published item before 3.5).
- **Way round:** none for the press. A harvester that fetches the whole
  list again gets the current records.

Medium: a public list is silently wrong with no way round on screen,
but only for the items changed after publication and only for
harvesters that ask for changes since a date.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (OPS `main` for a preprint
  server). Its records carry the day it was built as their datestamp,
  and the steps use today's date as `from`. "Today" is the UTC date, as
  the datestamps are (the "Response Date" on the OAI page shows it).
  With a dump built today, step 1's `from` list holds every record:
  follow the datestamps in the plain list instead, or load an older
  dump.
- OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots", record
  `oai:<repository identifier>:publicationFormat/3`. OPS: submission 2,
  "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence", record `oai:<repository identifier>:preprint/2`.

Steps:

1. Signed out, open
   `/index.php/publicknowledge/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   and note the record's datestamp. Open the same address with
   `&from=<today's UTC date as YYYY-MM-DD>`: "No matching records in
   this repository".
2. Sign in as `dbarnes`, open submission 14 (OPS 2), "Publication" (OPS
   "Preprint") › "Title & Abstract", type `u19a18` in "Prefix", "Save".
   [3.4: a published version cannot be edited; go to step 4.]
3. Open both addresses of step 1 again.
4. Press "Unpublish" (OPS "Unpost") and confirm with the same button.
5. Open both addresses again: the record is a deleted record with the
   datestamp of step 4, and the `from` list holds it.
6. Press "Publish" (OPS "Post"), and in the window that opens press
   "Publish" (OPS "Post") again.
7. Open both addresses again.

**Expected.** In step 3 the record's datestamp is the moment of the
save and the `from` list holds the record. In step 7 the record is live
with the datestamp of step 6, later than its deleted record's of step 5,
and the `from` list holds it.

**Observed.** In steps 3 and 7 the record has the datestamp of step 1
and the `from` list answers

```
Error Code   noRecordsMatch
No matching records in this repository
```

On OMP (OPS the same with `preprint/2`, 2026-09-30T11:54:02Z and
2026-10-01T13:51:53Z):

```
step 1   oai:omp.localhost:publicationFormat/3   2026-09-30T12:03:13Z
step 3   oai:omp.localhost:publicationFormat/3   2026-09-30T12:03:13Z   (saved 2026-10-01T13:50:22Z)
step 5   oai:omp.localhost:publicationFormat/3   2026-10-01T13:50:41Z   This record has been deleted.
step 7   oai:omp.localhost:publicationFormat/3   2026-09-30T12:03:13Z   (published 2026-10-01T13:51:02Z)
```

Control: on OJS the same edit of submission 17 moves `article/17` to the
moment of the save, and the `from` list holds it.

## Cause

The datestamp of a live record is one column. `APP\oai\omp\OAIDAO::getRecordsRecordSetQuery()`
selects `ms.last_modified AS last_modified` and filters `from` and
`until` on it; `APP\oai\ops\OAIDAO` does the same with
`a.last_modified`. Both are `submissions.last_modified`.

Nothing the steps do writes that column. `PKP\publication\Repository::edit()`,
`publish()` and `unpublish()` call `stampModified()` on the publication,
so `publications.last_modified` moves each time, and they change the
submission only through
`PKP\submission\Repository::updateStatus()`, which ends in
`$this->dao->update($submission)` without a stamp.

In 3.3 the method is `PKPSubmissionService::updateStatus()`. It collects
a changed status or current publication in `$updateParams` and, inside
`if (!empty($updateParams))`, calls `$this->edit($submission, $updateParams)`.
`edit()` stamps the submission, so "Unpublish" and "Publish", which
change the status, moved the datestamp. [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa)
(the editorial decisions refactor) replaced it with the plain DAO update
"to prevent calling this method over and over again". The edit of a
published version never stamped the submission; it became reachable when
3.5 let a published version be saved.

OJS does not show it because its query reads
`GREATEST(a.last_modified, i.last_modified, p.last_modified)`: the
publication's date was added for exactly this symptom (`pkp/ojs#3197`,
`pkp/pkp-lib#7713`, 2021, on 3.3 too), and the same was never done for
OMP and OPS.

OJS's line has a weakness of its own, which the fix below does not
copy. `issues AS i` is a left join, so for an article in no issue
`i.last_modified` is NULL, and MySQL's and MariaDB's `GREATEST` answers
NULL when any argument is NULL (PostgreSQL's ignores it). The datestamp
of such an article would then be NULL on those databases (code; MySQL
not run).

Reach:

- Every reader of the query: ListRecords, ListIdentifiers, GetRecord
  and the `from` / `until` filters, at the context's and the site-wide
  address (the context's ListIdentifiers walked; the rest in the code).
- OMP, a format set "Not Available" and available again, or unapproved
  and approved (`PublicationFormatGridHandler::setAvailable()`,
  `setApproved()`): the deleted record goes and the live one returns,
  and neither the submission nor the publication is stamped (code).
- Contributors and citations saved on a published version stamp neither
  row, on OJS too: `pkp/pkp-lib#13074` (open, draft PR
  `pkp/pkp-lib#13104`).
- Stored data: `submissions.last_modified` is older than the last
  change for every such item; `publications.last_modified` is right.

## Proposed fix

Recommended, tried: read the publication's date too, the way OJS's
query does, with a `COALESCE` that OJS's line does not have. In OMP `classes/oai/omp/OAIDAO.php`
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/fix-omp.diff)),
in the select and in the `from` and `until` filters:

```diff
-                'ms.last_modified AS last_modified',
+                DB::raw('GREATEST(ms.last_modified, COALESCE(pub.last_modified, ms.last_modified)) AS last_modified'),
…
-                return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
+                return $query->whereDate(DB::raw('GREATEST(ms.last_modified, COALESCE(pub.last_modified, ms.last_modified))'), '>=', \DateTime::createFromFormat('U', $from));
```

In OPS `classes/oai/ops/OAIDAO.php`
([fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/fix-ops.diff))
the same three lines with `a` and `p`. The query already joins the
current publication in both apps. The `COALESCE` is where the fix
differs from OJS's line: `publications.last_modified` is nullable and
`PKP\publication\Repository::add()` does not stamp it, and on MySQL a
NULL argument would turn the whole datestamp NULL. With it the
submission's date stands in.

The OPS `until` line is the one
[U19-OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U19-OPS1-preprint-server-oai-until-fails.md)
reports (`a.last-modified`); the diff rewrites it, so it carries that
fix as well.

Tried on `main`, OMP and OPS: with the fix the Steps show the Expected
(the datestamp is the save's in step 3 and the publish's in step 7,
later than the deleted record's, and the `from` list holds the record
both times). The neighbours hold: the other records keep one datestamp
through the walk, the deleted record's datestamp is unchanged, and the
list with `until=<the day the dataset was built>` drops the changed
record and keeps the others.

**Alternatives**

- Stamp the submission in `updateStatus()` again
  (`$submission->stampModified()` before the DAO update): one place in
  pkp-lib for both apps, but it leaves the edit of a published version
  out, and it changes "last modified" for every status change of every
  submission.
- Stamp the submission whenever its publication changes, the direction
  of `pkp/pkp-lib#13104`: it would also cover contributors and
  citations, but it is a new mechanism and that PR does not yet fire it
  from `edit()`, `publish()` or `unpublish()`.

The recommended fix is independent of `pkp/pkp-lib#13104` and both can
land: that PR writes the submission's date when a contributor or a
citation is saved, this fix reads the later of the two dates, so
neither undoes the other. If that PR came to stamp the submission from
`edit()`, `publish()` and `unpublish()` too, this fix would be
redundant and harmless.

**What goes with it**

- No data repair: the publication's date is already stored right.
- With the fix a record whose publication changed after the submission
  row takes that later datestamp at once (in the dataset
  `publicationFormat/3` moves from 12:03:13Z to 12:04:59Z), so a
  harvester's next visit fetches again what was edited since
  publication.
- Backport: the three lines are the same on `stable-3_5_0` and
  `stable-3_4_0` in both apps (code; not tried there).
- Left out: the OMP format availability and approval changes keep the
  symptom after this fix (a format made available again returns with a
  datestamp older than its deleted record's). Stamping the publication
  in `setAvailable()` and `setApproved()` would bring them under the
  proposed query; that is not in the diff and not tried. Also left out:
  the contributors and citations of `pkp/pkp-lib#13074`, and OJS's
  NULL on MySQL named in the Cause.
- Guard: pkp-e2e's OAI-PMH scenario, in which a published book
  (preprint) is edited, then unpublished and published again, and the
  record's datestamp moves each time; or a repo test of
  `getRecordsRecordSetQuery()` with a publication modified after its
  submission, under `tests/classes/oai/` in OMP and OPS, where OJS keeps
  `JournalOAITest.php` (neither has an OAI test today).

Medium: three lines in each of two repos, following OJS's query, with a
test each. This is a proposal; the team decides.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/walk.js)
  with its helper in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/lib.js),
  run after `npm run fleet-prep -- --feature issues --dataset 1 --reset` with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp,ops shared/playwright/checks/issues/oai-datestamp-stays-after-edit-republish/walk.js`
  (`ojs` for the control, which takes steps 1 to 3). It reads each OAI
  address as a harvester does, without a session, records the browser
  view of the `from` list, and at every step reads both
  `last_modified` columns in the database and the list with
  `until=<the day the dataset was built>`.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… apply …/fix-ops.diff ops`, the datasets reloaded, walk.js on both,
  then `node bin/try-fix.js revert` for each. The `until` list was read
  at every step with the fix in; without the fix it was read once on
  OMP after the walk (it still held the changed record), and on OPS it
  answers a server error (report U19-OPS1).
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets [2c84c3c](https://github.com/pkp/datasets/commit/2c84c3c)
  (`<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`), no upgrade
  needed. MySQL not checked: the fix's `GREATEST` / `COALESCE` was run
  on PostgreSQL only.
  - main: OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp 3dc90c81a6), and OJS
    06fd981b01 (lib/pkp 2e377d27fc) for the control.
  - stable-3_5_0: OMP b24879c3db, OPS 3f0919468c, OJS 18d097d94e
    (lib/pkp 1fb843f491): the Steps as written, the same result on OMP
    and OPS (`publicationFormat/3` stayed at 2026-09-30T11:58:16Z,
    `preprint/2` at 2026-09-30T11:23:57Z), and the OJS control moved.
    Code read: `classes/oai/<app>/OAIDAO.php`, the same columns as
    `main`.
  - 3.4 (code): OMP `upstream/stable-3_4_0` 0aec65441f, OPS acd8ae704b,
    lib/pkp df13621c2d: the queries read `ms.last_modified` /
    `a.last_modified`; `submission/Repository::updateStatus()` ends in
    `$this->dao->update($submission)`; the API refuses a save of a
    published version (`api.publication.403.cantEditPublished`), so only
    steps 4 to 7 apply.
  - 3.3 (code): OMP 8e72fc8836, OPS c5532e2161, lib/pkp d446601ebe: the
    queries read the same column (OPS in `classes/oai/ojs/OAIDAO.inc.php`),
    but `PKPSubmissionService::updateStatus()` passes the status change
    to `edit()`, which calls `stampModified()`; a published version
    cannot be edited.
- Introduced: `git log -L` on `updateStatus()` in lib/pkp
  `classes/submission/Repository.php`; the commit that first holds
  "Use the DAO instead of the Repository" is f75706ba57, whose diff
  replaces `$this->edit($submission, $updateParams)`; GitHub names its
  PR as `pkp/pkp-lib#7631`. The change that let a published version be
  saved was not traced.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ops,
  issues and PRs, open and closed: "oai datestamp", "oai last_modified",
  "oai harvest updated OMP", "oai republish unpublish datestamp",
  "OAIDAO last_modified". `pkp/pkp-lib#12958` (open, milestone 3.7 LTS)
  states the symptom with "(Unclear)" steps. `pkp/pkp-lib#7713` (closed
  2022, fixed for OJS by `pkp/ojs#3197`) is the same symptom on a
  journal. `pkp/pkp-lib#13074` is the neighbouring fault for
  contributors, citations and funders.
- Not driven: GetRecord, ListRecords and the site-wide address (same
  query); OMP's "Format Availability" and approval changes; a save of
  contributors or citations; a book with more than one format.
- Unverified: what a given harvesting service does with a record whose
  datestamp is older than the deleted record it already holds. OJS's
  datestamp for an article in no issue on MySQL or MariaDB: read in
  `classes/oai/ojs/OAIDAO.php` (`leftJoin('issues AS i', …)` under
  `GREATEST(a.last_modified, i.last_modified, p.last_modified)`), not
  run, and what the answer then shows was not followed further.
