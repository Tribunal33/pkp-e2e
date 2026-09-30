# A journal's or press's OAI address hides the items it withdraws and lists the first journal's withdrawals instead

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; the older SQL query binds the journal's own id)
- **Introduced** `pkp/ojs#3134` and `pkp/omp#983` for `pkp/pkp-lib#6963` · [08c3cddc6c](https://github.com/pkp/ojs/commit/08c3cddc6c8c3921d11a26528ec4016ca8c0175b), [26edcaf788](https://github.com/pkp/omp/commit/26edcaf7885e14f545f62ed53d7c782709f78891) · 2021-06-08 and 2021-06-11 · Alec Smecher (asmecher)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U19 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On an install that hosts more than one journal, a harvester that reads
one journal's OAI-PMH address is never told when that journal withdraws
a published article (an editor's "Unpublish"). The article drops out of
the journal's lists instead of turning into a deleted record, GetRecord
answers "No matching identifier in this repository", and the site-wide
address asked for that journal's set leaves it out too. In its place,
the journal's lists, GetRecord and "Earliest Datestamp" show the
withdrawals of the install's first journal, filed under the first
journal's sets.

Indexes that harvest the journal keep listing its withdrawn articles,
and nobody is told. The journal cannot work round it.

The first journal on the install is spared. Presses have the same fault,
plus a second one: a series' set leaves out its withdrawn books at every
press, the first press included. Live (published) records are listed
correctly.

## Impact

- **Lost.** A correct public record. A harvester of the per-journal
  address never receives any withdrawal from that journal, and it
  receives the first journal's withdrawals as if they were this
  journal's. Only the withdrawal notices are wrong: a deleted record
  carries an identifier, a datestamp and a set, no metadata. No screen
  shows any of it.
- **Who.** Every journal and press except the first on an install, each
  time an editor unpublishes an item (on a press, also when a format is
  taken out of availability). The series fault reaches every press.
- **Way round.** None for the journal. A harvester that reads the
  site-wide address without a set gets every withdrawal. After the fix,
  the missed withdrawals are served again, because they are stored
  correctly. But a harvester that resumes from its last harvest date
  skips those withdrawn before that date (Proposed fix, "What goes with
  it").

Medium: only withdrawn items are affected, and only on installs with
several journals or presses, but silently. A journal whose indexes must
follow its retractions would make it high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Its journal
  `publicknowledge`, "Journal of Public Knowledge", is the install's
  first journal and has articles 1 and 17 published. The dataset's
  repository identifier is `ojs2.localhost`.
- A second journal, created in step 1: the dataset has only one.

The OJS steps follow; the OMP steps come after them.

1. Sign in as `admin`. Under Administration › "Hosted Journals", click
   "Create Journal". Fill in "Journal title" "u19w04 Harbour Journal",
   "Journal initials" "HJ", "Principal Contact Name" "Harbour Contact",
   "Principal Contact Email" `harbour.contact@mailinator.com`, "Country"
   "Canada", "Path" `u19w04`, English under "Languages" and "Primary
   locale", and tick "Enable this journal to appear publicly on the
   site". Click "Save".
2. In "u19w04 Harbour Journal", start a "New Submission" titled "u19w04
   Tidal Patterns", tick the two confirmation boxes and click "Begin
   Submission". Upload a PDF as "Article Text", enter the abstract
   "Tides follow the moon.", continue to "Review", click "Submit" and
   confirm.
3. On the submission's workflow, open Publication › "Title & Abstract",
   click "Schedule For Publication", choose "Don't Assign To An Issue",
   click "Confirm", then "Publish".
   [3.5: a journal publishes only past review and into an issue. Record
   "Accept and Skip Review" first. Create "Vol. 1 No. 1 (2026)" under
   Issues › "Create Issue", with "Title" unticked. Pick it in "Select an
   issue to schedule for publication" and confirm "Schedule For
   Publication". Then, under Issues › "Future Issues", click the issue's
   "Publish Issue" › "OK".]
4. Signed out, open
   `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   It lists "u19w04 Tidal Patterns" as `oai:ojs2.localhost:article/21`
   (21 on a fresh load; another install gives the next free id), in set
   `u19w04:ART`.
5. As `admin`, on the workflow's "Title & Abstract", click "Unpublish"
   and confirm "Unpublish".
6. Signed out, open (with the id step 4 listed):
   - `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/u19w04/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/21`
   - `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=u19w04`
   - control: `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
7. As `admin`, open submission 17 of "Journal of Public Knowledge",
   "Antimicrobial, heavy metal resistance and plasmid profile of
   coliforms isolated from nosocomial infections in a hospital in
   Isfahan, Iran", and on "Title & Abstract" click "Unpublish" and
   confirm.
8. Signed out, open:
   - `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/u19w04/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:ojs2.localhost:article/17`
   - `/index.php/u19w04/oai?verb=Identify`

OMP, on PKP's default test dataset for OMP `main`, freshly loaded:
`publicknowledge`, "Public Knowledge Press", is the first press. Its
published book 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots", is in the series "Psychology" (`psy`, series id
5), and its one format is `oai:omp.localhost:publicationFormat/3`. A
press's OAI records are its books' publication formats.

1. As `admin`, Administration › "Hosted Presses" › "Create Press", with
   the same fields as OJS step 1: "u19w04 Harbour Press", path `u19w04`,
   public.
2. Submit "u19w04 Tidal Patterns" in "u19w04 Harbour Press" as in OJS
   step 2, with the file as "Book Manuscript". On the book's workflow,
   open Publication › "Publication Formats" › "Add publication format",
   enter Name "PDF" and click "OK". On the format's row, click "Awaiting
   Approval" › "OK", then "Not Available" › "OK".
3. On "Title & Abstract", click "Publish", then "Publish" in the
   window. [3.5: record "Accept and Skip Review" first.]
4. Signed out, open
   `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`.
   It lists the format as `oai:omp.localhost:publicationFormat/4` (4 on
   a fresh load), in set `u19w04`.
5. As `admin`, "Title & Abstract" › "Unpublish", and confirm.
6. Signed out, open:
   - `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/u19w04/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/4`
   - `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=u19w04`
7. As `admin`, open book 14 of "Public Knowledge Press" and, on "Title &
   Abstract", click "Unpublish" and confirm.
8. Signed out, open:
   - `/index.php/u19w04/oai?verb=ListIdentifiers&metadataPrefix=oai_dc`
   - `/index.php/u19w04/oai?verb=GetRecord&metadataPrefix=oai_dc&identifier=oai:omp.localhost:publicationFormat/3`
   - `/index.php/u19w04/oai?verb=Identify`
   - the series' set at the first press:
     `/index.php/publicknowledge/en/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:psy`
   - the same set site-wide:
     `/index.php/index/oai?verb=ListIdentifiers&metadataPrefix=oai_dc&set=publicknowledge:psy`

**Expected:** in step 6, the journal's list shows article 21 as a
deleted record in set `u19w04:ART`, GetRecord answers that deleted
record, and the site-wide list for `set=u19w04` shows it too. In step 8
nothing changes at "u19w04 Harbour Journal": its list still shows only
article 21. GetRecord of article 17, another journal's article, answers
"No matching identifier in this repository". "Earliest Datestamp" is
article 21's deletion time. OMP the same, with format 4 in place of
article 21 and format 3 in place of article 17. Both `publicknowledge:psy`
reads list format 3 as deleted.

**Observed:** in step 6 all three addresses answer that the article is
not there:

```
<error code="noRecordsMatch">No matching records in this repository</error>
<error code="idDoesNotExist">No matching identifier in this repository</error>
<error code="noRecordsMatch">No matching records in this repository</error>
```

The site-wide list without a set (the control) shows article 21 as
deleted, in set `u19w04:ART`.

In step 8 the journal's list holds only the first journal's withdrawn
article, in the first journal's set `publicknowledge:ART`. The journal's
own ListSets names only `u19w04` and `u19w04:ART`:

```
<header status="deleted">
	<identifier>oai:ojs2.localhost:article/17</identifier>
	<datestamp>2026-09-30T19:42:07Z</datestamp>
	<setSpec>publicknowledge:ART</setSpec>
</header>
```

GetRecord of article 17 answers that deleted record, and Identify gives
`<earliestDatestamp>2026-09-30T19:42:07Z</earliestDatestamp>`, its
datestamp.

OMP answers the same way. Step 6 gives the three errors above for
format 4. In step 8 the press lists and answers only format 3, deleted,
in set `publicknowledge:psy`. Both `set=publicknowledge:psy` reads answer
`<error code="noRecordsMatch">No matching records in this
repository</error>`, at the first press as well.

A preprint server taken through the same steps lists its own unposted
preprint as deleted and answers "No matching identifier in this
repository" for the first server's.

## Cause

`APP\oai\ojs\OAIDAO::getRecordsRecordSetQuery()`
(`classes/oai/ojs/OAIDAO.php`) builds every record query. It unites the
live records with the deleted ones (`data_object_tombstones`). At a
journal's address, `JournalOAI` passes the journal's id in `$setIds`,
which becomes `$journalId`. The deleted-records branch limits the
tombstones to that journal with a join (line 429):

```php
->when(isset($journalId), function ($query, $journalId) {
    return $query->join('data_object_tombstone_oai_set_objects AS tsoj', function ($join) use ($journalId) {
        $join->on('tsoj.tombstone_id', '=', 'dot.tombstone_id');
        $join->where('tsoj.assoc_type', '=', Application::ASSOC_TYPE_JOURNAL);
        $join->where('tsoj.assoc_id', '=', (int) $journalId);
```

Laravel's `when($value, $callback)` calls `$callback($query, $value)`,
with the condition's value as the second argument
(`Conditionable::when()`). That value is `isset($journalId)`, so `true`,
and the closure's `$journalId` hides the real one. The join then asks
for `assoc_id = (int) true`, which is 1: the tombstones of the journal
with id 1, the first one created on the install. At that journal the
answer is right by coincidence. At every other journal, its own deleted
records drop out and journal 1's come in.

The live branch of the same method (line 322) and the section join
right below (line 438) write `function ($query) use ($journalId)`, which
is correct.

OMP's `APP\oai\omp\OAIDAO::getRecordsRecordSetQuery()`
(`classes/oai/omp/OAIDAO.php`) has the same mistake twice: the press
join (line 248) and the series join (line 257) both take the condition's
`true`, so they select press 1 and series 1. The press join spares the
first press. The series join spares only series 1, so it reaches every
press, the first included.

Reach:

- A journal's or press's own address: ListIdentifiers, GetRecord and
  Identify's "Earliest Datestamp" (`PKPOAIDAO::getEarliestDatestamp()`)
  run this query (checked on screen, OJS and OMP). So do ListRecords and
  ListMetadataFormats with an identifier (`recordExists()`) (code).
- The site-wide address with a `set` that names a journal or press:
  `setSpecToSectionId()` hands its id to the same join (checked on
  screen for a journal's and a press's set). With a section's set
  (`journal:section`) the journal join is the same (code).
- OMP series sets, at every press and site-wide: a series' set leaves
  out its deleted records unless the series has id 1 (checked on screen:
  `set=publicknowledge:psy`).
- The OJS DRIVER plugin's set
  (`DRIVERDAO::getDRIVERRecordsOrIdentifiers()`) runs the same query
  with the journal's id (code).
- OPS: `APP\oai\ops\OAIDAO` writes `function ($query) use ($serverId)`
  in both branches and is not affected (checked on screen).
- Stored data: the tombstones and their set rows are written correctly.
  Nothing needs repair.

## Proposed fix

Give the three closures the id through `use`, as the rest of the method
already does. This is
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/fix-ojs.diff)
for OJS:

```diff
-            ->when(isset($journalId), function ($query, $journalId) {
+            ->when(isset($journalId), function ($query) use ($journalId) {
```

and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/fix-omp.diff)
for OMP:

```diff
-                    ->when(isset($pressId), function ($query, $pressId) {
+                    ->when(isset($pressId), function ($query) use ($pressId) {
 …
-                    ->when(isset($seriesId), function ($query, $seriesId) {
+                    ->when(isset($seriesId), function ($query) use ($seriesId) {
```

The rule is in each app's own `OAIDAO`: pkp-lib's `PKPOAIDAO` only calls
the app's query, so there is no shared place to fix. OPS writes its
closures this way throughout. A search of OJS, OMP, OPS and pkp-lib for
a `when()` whose condition is an expression and whose closure takes a
second parameter finds only these three.

Tried on `main`, OJS and OMP: the Steps then show Expected. A check on
the first journal and the first press alone gave the same answers with
the fix and without it, for their own lists, GetRecord and the site-wide
lists. The one difference was the press's `publicknowledge:psy` set: it
now lists the withdrawn book.

**Alternatives:**

- `->when($journalId, function ($query, $journalId)` passes the id
  itself, but swaps `isset()` for a truth test. 0 is what
  `getSetJournalSectionId()` and `getSetPressSeriesId()` return for an
  unknown set or another context's set. With `isset()`, a 0 joins on
  `assoc_id = 0` and finds nothing, which is right. A truth test would
  drop the join and leave only the `set_spec` filter.
- A guard at `JournalOAI` / `PressOAI`: the query would still be wrong
  for the DRIVER plugin and any other caller.

**What goes with it:**

- Backport: 3.5 and 3.4 have the same three lines, and the same change
  applies there: OJS `classes/oai/ojs/OAIDAO.php` line 308 on 3.5 and 311
  on 3.4; OMP `classes/oai/omp/OAIDAO.php` lines 262 and 271 on 3.5, 266
  and 275 on 3.4.
- Harvesters: the withdrawals are stored, so after the fix every
  harvest that reaches back to a withdrawal lists it. A deleted record's
  datestamp is its deletion time, and the query filters it by
  `date_deleted >= from`. So a harvester that resumes from its last
  harvest date skips the withdrawals made before that date, and needs a
  harvest from an earlier date to catch up. That is a release note, not
  a data repair.
- A guard in each app: pkp's Cypress OAI tests run on the one-journal
  dataset. A test that unpublishes an item in a second journal (in OMP,
  a second press and a book in a series) and reads that journal's
  ListIdentifiers would have caught it.

Medium: two repositories, OJS and OMP, each with its own fix (one
closure in OJS, two in OMP) and its own test for a second context; no
data repair.

## Evidence

- Kept scripts, under
  [shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/walk.js)
    takes the Steps through the screens on a fresh load of the default
    dataset and records each OAI answer (browser view and raw XML) on
    OJS, OMP and OPS. OPS is the app-level control: "Create Server", a
    preprint with a "PDF" galley, "Post", "Unpost". Run it with
    `node bin/probe.js all shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/neighbour.js)
    is the check on the first journal and press alone, OJS and OMP. It
    unpublishes article 17 or book 14 and reads their lists, GetRecord,
    the item's section or series set, and the site-wide lists. The
    `publicknowledge:psy` reads in the OMP Steps were taken by this
    script.
  - [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/oai-journal-deleted-records-first-journal/trial.sh)
    tried the fix: the walk and neighbour.js with the fix, then
    neighbour.js without it.
- Walked on PostgreSQL, on the default dataset from pkp/datasets 38ab955
  (2026-09-30), on `main` and `stable-3_5_0`, OJS, OMP and OPS. The fault
  is the value PHP hands the closure, not the SQL, so the database does
  not matter (MySQL not checked).
- The new journal has one language, so its address answers at `/oai`;
  the site-wide and `publicknowledge` addresses redirect to `/en/oai`.
  The item ids (article 21, OMP book 19 with format 4) are the next free
  ids on a fresh load.
- 3.5, walked: same answers on OJS and OMP, OPS unaffected. Adaptations,
  also in the Steps' bracket:
  - the wizard asks for the details before the files;
  - 3.5 refuses to publish before the review stage ("The submission must
    be in the Copyediting or Production stages before it can be
    published."), so "Accept and Skip Review" is recorded first;
  - OJS 3.5 publishes only into an issue ("Select an issue to schedule
    for publication" offers no other choice).
- 3.4 (code): `upstream/stable-3_4_0` has the same closures (the lines
  the Backport bullet gives); OPS's use `use`.
- 3.3 (code): OJS `classes/oai/ojs/OAIDAO.inc.php` builds the query as
  raw SQL and binds `(int) $journalId` into the tombstone join, so it
  does not have this fault. OMP's `OAIDAO.inc.php` binds the ids too, but
  it joins the press's set rows with a `LEFT JOIN` that filters nothing,
  so on 3.3 a press's address lists every press's deleted records. That
  is a different fault (code only, not walked).
- Introduced: `git blame` on OJS line 429 gives 4ea46f5f35 (2026, which
  moved the block), then 88aaa6b49f (2021-07-14, a reformat of
  `function($query, $journalId)`). `git log -S` finds the closure added
  in 08c3cddc6c, which replaced the `if (isset($journalId))
  $tombstonesQuery->join(… use ($journalId))` form; it is in
  `pkp/ojs#3134` "pkp/pkp-lib#6963 Improve OAI performance" (GitHub's
  `commits/<sha>/pulls`). OMP: 79302a1bd reformatted it; 26edcaf788
  added it, in `pkp/omp#983` "Port OAI rewrite to Illuminate/Database to
  OMP". Before this rewrite, the raw SQL bound `(int) $journalId` itself.
  The fault has been present since 3.4.0.
- Upstream search (2026-09-30), pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `OAIDAO` / `getRecordsRecordSetQuery`. `pkp/pkp-lib#2566` (closed 2017)
  reported a journal's address showing every journal's deleted records
  on 3.0.2; it was fixed then, before this fault came in. Nothing
  reports this one.
- Tips:
  - OJS `main`
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - OMP `main`
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS `main`
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    each with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
    and OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    each with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2).
- OMP's live-record branch tests `$pressId` for truth, so a set that is
  unknown or belongs to another press is a separate matter, tracked as
  U19 OMP3.
- Unverified: how a given harvester resumes after the fix (its `from`),
  and which address, per-journal or site-wide, particular indexes
  harvest.
