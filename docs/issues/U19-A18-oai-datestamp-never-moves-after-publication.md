# Harvesters of a press or preprint server miss edits of published items and keep republished items deleted

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: OMP, OPS (code)
  - 3.3: OMP, OPS (code)
- **Introduced** not traced; present since at least [ce205d5836](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) (2019-08-21)
- **Upstream** `pkp/pkp-lib#12958` (open), covering datestamps that miss metadata changes in general, with no steps or app named
- **Tracked in** spec U19 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a18)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A harvester that asks a press or a preprint server for the records
changed since its last visit expects an edited book or preprint, or one
published again, to come back. Instead the record's datestamp stays at
the time the item was first published. Saving "Title & Abstract" on the
published version does not move it. An item published again after
"Unpublish" (on OPS "Unpost") comes back with that first datestamp. Its
deleted record was dated later, at the unpublish.

Nobody is told. The harvester never picks up the edit. A harvester that
visited while the item was unpublished never sees it come back, so its
index keeps the item as deleted.

It happens on every press, and on every preprint server whose OAI
interface is on, as it is by default. Journals are not affected: OJS's
datestamp already includes the publication's last change
(`pkp/ojs#3197`). The open `pkp/pkp-lib#12958` is a general complaint
with no steps or app; this report is the press and preprint server
case, with its cause and a fix.

## Impact

- **Lost.** Every correction made on a published version, for the
  indexes that harvest by date, and the whole item for those that saw it
  deleted.
- **Who.** Presses and preprint servers whose editors correct a
  published version or unpublish and publish an item again.
- **Way round.** None on screen, and publishing a new version does not
  move the datestamp either. A harvester could harvest the whole
  repository again, but nothing tells it to.

Medium: only items changed after publication are affected, and
unpublishing and publishing again is assumed to be rare. It would be high
if presses and servers did it often, since each such item drops out of
the indexes for good.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main`, on PostgreSQL:

- OMP, press `publicknowledge`: "From Bricks to Brains: The Embodied
  Cognitive Science of LEGO Robots" (submission 14) is published with one
  format, whose OAI identifier is
  `oai:omp.localhost:publicationFormat/3`. (`omp.localhost` is the
  install's repository identifier, `repository_id` in `config.inc.php`.)
- OPS, server `publicknowledge`: "Investigating the Shared Background
  Required for Argument: A Critique of Fogelin's Thesis on Deep
  Disagreement" (submission 5) is posted, identifier
  `oai:ops.localhost:preprint/5`.

Editing the published version:

1. Signed out, open
   `/index.php/publicknowledge/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/3`
   (OPS: `…identifier=oai:ops.localhost:preprint/5`). Note the
   "Datestamp" under "OAI Record Header".
2. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`
   (OPS: `…?workflowSubmissionId=5`). On OPS `dbarnes` is a manager
   but not assigned to the preprint, and it is posted, so it is not in
   his own list; the address opens it all the same.
3. In the side menu open "Publication" › "Version of Record 1.0" ›
   "Title & Abstract" (OPS: "Preprint" › "Author Original 1.0" ›
   "Title & Abstract"; on 3.5 the menu has no version level). The form
   says "Warning: This version has been published. Editing it may impact
   the published content."
4. Type `u19w05` in "Prefix" and press "Save".
5. Open the address of step 1 again.

Unpublishing and publishing again:

6. Press "Unpublish" (OPS: "Unpost") and confirm with "Unpublish"
   ("Unpost").
7. Open the address of step 1: "This record has been deleted."
8. Press "Publish" (OPS: "Post") and confirm with "Publish" ("Post").
9. Open the address of step 1 again.

**Expected.** Step 5 shows the time of the save in step 4. Step 9 shows
the time of step 8, later than the deleted record's in step 7.

**Observed.** Steps 5 and 9 show the datestamp of step 1, while the
record's title already reads "u19w05 From Bricks to Brains: …". OMP:

| Step | Datestamp |
|---|---|
| 1, as published | 2026-09-30T12:03:13Z |
| 5, after "Save" at 20:50:46 | 2026-09-30T12:03:13Z |
| 7, deleted | 2026-09-30T20:51:11Z |
| 9, after "Publish" at 20:51:37 | 2026-09-30T12:03:13Z |

OPS the same: 11:55:59Z at steps 1, 5 and 9, and 20:52:49Z for the
deleted record in step 7. On `stable-3_5_0` the Steps show the same on
both apps.

Control: on OJS, the same steps on "Antimicrobial, heavy metal
resistance and plasmid profile of coliforms …" (submission 17) move the
datestamp to the time of the save, then to the time of the publish.

## Cause

Each app's `OAIDAO::getRecordsRecordSetQuery()` builds the query behind
every OAI record, and its first column is the record's datestamp. On OMP
([classes/oai/omp/OAIDAO.php, line 208](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/classes/oai/omp/OAIDAO.php#L208))
it is `ms.last_modified`, and on OPS
([classes/oai/ops/OAIDAO.php, line 219](https://github.com/pkp/ops/blob/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2/classes/oai/ops/OAIDAO.php#L219))
`a.last_modified`: the submission's last change only. The `from` and
`until` filters read the same column.

That column never follows the published version. Since a book's and a
preprint's metadata moved onto publications with versioning in 3.2,
pkp-lib stamps the change on the publication instead:
`Repo::publication()->edit()`, `publish()` and `unpublish()` each call
`stampModified()` on the publication. `edit()` does not write the
submission at all. `publish()` and `unpublish()` update it through
`Repo::submission()->updateStatus()`, which saves the new status through
the DAO and leaves `last_modified` as it was. Only
`Repo::submission()->edit()` stamps the submission, and none of these
paths calls it. The walk read the database after each step:
`submissions.last_modified` stayed at 12:03:13 while
`publications.last_modified` followed the save, the unpublish and the
publish.

OJS solved this for journals in `pkp/ojs#3197`
([ed0ad3cb1d](https://github.com/pkp/ojs/commit/ed0ad3cb1d0605f03650a55be85841bb8b8a97ba),
2021, for `pkp/pkp-lib#7713`): its datestamp is
`GREATEST(a.last_modified, i.last_modified, p.last_modified)`, the
current publication included. OMP and OPS were not changed with it.

Reach:

- A new version published: the current publication changes, the
  submission's stamp does not, so the record keeps its old datestamp. In
  the OPS dataset, "Computer Skill Requirements for New and Existing
  Teachers" (submission 3) reads 2026-09-30T11:54:33Z, its submission's
  stamp, while its second version was stamped at 11:54:56 (read at the
  OAI address and in the database on `main`).
- ListRecords and ListIdentifiers with `from` or `until` filter on the
  same column, so a harvest by date leaves the edited item out (code).
- The deleted record is dated by `data_object_tombstones.date_deleted`,
  correct on both apps (checked on screen).
- OMP only: a format taken out of availability and made available again
  under "Publication Formats" also returns with its old datestamp. Nothing
  stamps the publication there
  (`PublicationFormatGridHandler::setAvailable()`, code).
- Which edits count: the walk saved "Title & Abstract". By the code,
  any save that goes through `Repo::publication()->edit()` stamps the
  publication, so the fix covers it. Contributors, galleys, files, OMP
  chapters and publication formats are saved through their own
  repositories and DAOs, which stamp neither the publication nor the
  submission. Those edits move no datestamp, with or without the fix;
  for contributors and references that is `pkp/pkp-lib#13074`.

## Proposed fix

Make OMP's and OPS's datestamp the later of the submission's and the
current publication's last change, as OJS's is (OJS adds its issue's),
and filter `from` and `until` on the same expression. The diffs are
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/fix-omp.diff)
and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/fix-ops.diff).
OMP:

```diff
+        $datestamp = 'GREATEST(ms.last_modified, COALESCE(pub.last_modified, ms.last_modified))';
+
         return DB::table('publication_formats AS pf')
             ->select([
-                'ms.last_modified AS last_modified',
+                DB::raw("{$datestamp} AS last_modified"),
…
-            ->when($from, function ($query, $from) {
-                return $query->whereDate('ms.last_modified', '>=', \DateTime::createFromFormat('U', $from));
+            ->when($from, function ($query, $from) use ($datestamp) {
+                return $query->whereDate(DB::raw($datestamp), '>=', \DateTime::createFromFormat('U', $from));
```

The `until` line changes the same way, and OPS's diff is the same with
`a` and `p`. The fix belongs in each app's `OAIDAO`, since each owns its record
query and its datestamp. It differs from OJS's expression in one place:
`publications.last_modified` is nullable, and MySQL's `GREATEST()`
answers NULL when any argument is NULL, where PostgreSQL skips it, so
the fix wraps the publication's stamp in `COALESCE`. Every path read
(`add()`, the native import) stamps the column, so this is a guard, not
a known case. OJS's own `GREATEST()` takes the left-joined issue's
stamp without one.

Tried on `main` in OMP and OPS: the Steps now show the time of the save
at step 5, and at step 9 the time of the publish, after the deleted
record's. A read of the other OAI answers on a fresh dataset, with and without
the fix, showed what it leaves alone. The same records are listed (OMP
2, OPS 17). `from` tomorrow and `until` yesterday still answer
"noRecordsMatch". A published item nobody edited now carries the time
its version was published, in the dataset up to two minutes after its
old datestamp. On OPS, "Computer Skill Requirements …" now carries its
second version's time.

**Alternatives**

- Stamp the submission in pkp-lib whenever its publication is edited,
  published or unpublished, as OJS's `Publication\Repository` does for
  publish and unpublish, and as the draft `pkp/pkp-lib#13104` does for
  contributors and references. One repository instead of two, but it
  changes `submissions.last_modified` for every reader (the submission
  lists' "last modified" order, the REST API's `lastModified`), and each
  new write path must remember to stamp.
- Read `pub.last_modified` alone. It would drop changes made on the
  submission row, which OJS keeps in its datestamp.

**What goes with it**

- No stored data needs repair. A harvester is sent again only the
  items whose version changed after its last visit.
- OPS's diff also replaces the `until` filter's misnamed `a.last-modified`
  column (spec U19 OPS1, a server error on `until`). Spec U19 A2 changes
  the same `from` and `until` lines to compare the time of day; the three
  changes combine.
- OMP's format availability (Reach) is left out. Covering it would stamp
  the publication in `PublicationFormatGridHandler::setAvailable()`.
- Backport: both diffs apply as they stand to `stable-3_5_0`, and OMP's
  to `stable-3_4_0` (dry runs). On `stable-3_3_0` the same columns sit in
  SQL strings in `OAIDAO.inc.php`, where the same expression fits.
- Test: spec U19 Rule 5 is the e2e check (edit a published version, read
  the datestamp; unpublish, publish again, read it). No unit test runs
  the real query.

Medium: a few lines in one class, but in two repositories, OMP and OPS.

## Evidence

- Kept scripts, in
  [shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/](https://github.com/jardakotesovec/pkp-e2e/tree/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/walk.js)
    takes the Steps on OMP and OPS, and the same steps on OJS
    submission 17 as the control, on a fresh load of the default dataset.
    For each GetRecord it records the datestamp, whether the record is
    deleted, and the server log lines, and beside them the database's
    `submissions.last_modified` and the current publication's
    `last_modified`. Run it with
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/walk.js`
    (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/neighbour.js)
    reads, signed out and changing nothing, the whole list, `from` today
    and tomorrow, `until` yesterday, an untouched item, OPS submission 3
    and Identify's `earliestDatestamp`. It was run on OMP and OPS with
    the fix in and out.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-datestamp-never-moves-after-publication/trial.sh)
    tried the fix: `node bin/try-fix.js apply` for each diff, then
    neighbour.js and walk.js, then the revert and neighbour.js without
    the fix.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, all three apps. The Steps
  ran unchanged on 3.5. MySQL was not driven: the fault does not depend
  on the database, but the `COALESCE` in the fix is there for MySQL's
  `GREATEST()` and is unverified on MySQL.
- Tips:
  - `main`: OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8);
    OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece)
    and OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    each with pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2)
    and OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    each with pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5: the same lines as `main` (OMP `classes/oai/omp/OAIDAO.php`
    lines 222, 245, 248; OPS `classes/oai/ops/OAIDAO.php` lines 225,
    251, 254).
  - 3.4 (code): the same columns in `OAIDAO.php` (OMP line 226, OPS line
    229), and the same `updateStatus()`, which saves through the DAO
    (pkp-lib `classes/submission/Repository.php` line 664).
  - 3.3 (code): SQL strings reading `ms.last_modified` (OMP
    `classes/oai/omp/OAIDAO.inc.php` line 203) and `a.last_modified`
    (OPS `classes/oai/ojs/OAIDAO.inc.php` line 205). Publish and
    unpublish reach `PKPSubmissionService::edit()` through
    `updateStatus()`. `edit()` first copies the submission's data into a
    new object (lines 769–770). It then stamps the old object (lines
    771–772) and saves the new one (line 776), so the saved row keeps its
    old stamp. That this holds on a 3.3 install is unverified.
- Introduced: `git blame` on the datestamp line leads to the ports of the
  OAI queries to Laravel (OMP
  [26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891),
  OPS
  [5df1969511](https://github.com/pkp/ops/commit/5df1969511a3003f7a47a1a8979811261a7dc619),
  2021-06-11, `pkp/pkp-lib#6963`), which kept the column. `git log -S`
  finds `ms.last_modified` in OMP's OAI DAO since 2012. OMP's
  ce205d5836 (`pkp/pkp-lib#2072`, "Implement versioning and split
  publications from submissions") joined the current publication into
  the query and kept the submission's column as the datestamp; OPS's
  a7a023e42c (2019-09-26, `pkp/pkp-lib#4906`) did the same. Whether
  publishing stamped the submission before versioning was not traced.
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/omp, pkp/ops and
  pkp/ui-library, by "OAI datestamp", "OAI republish", "OMP OAI
  modified", "OAI last_modified" and "OAI"):
  - `pkp/pkp-lib#12958` (open, 2026-06-26), "OAI-PMH | Timestamp is not
    always updated on metadata change", has no steps or app.
  - `pkp/pkp-lib#7713` (closed 2022), the OJS case, fixed by
    `pkp/ojs#3197`.
  - `pkp/pkp-lib#13074` (open), with the draft PR `pkp/pkp-lib#13104`
    and `pkp/omp#2420`, stamps the submission when contributors,
    references or chapters change. It does not touch the publication's
    edit, publish or unpublish, and composes with this fix.
- Unverified: which publication forms besides "Title & Abstract" save
  through `Repo::publication()->edit()` (not enumerated); the stamping
  by contributors, galleys, files, chapters and formats was read in
  their classes only.
