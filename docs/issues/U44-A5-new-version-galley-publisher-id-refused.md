# After "Create New Version", a galley's or chapter's Identifiers tab refuses its own copied Publisher ID

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2457` and `pkp/omp#700` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) (OJS, 2019-06-26) and [ce205d583](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) (OMP, 2019-08-21) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)


## Summary

An editor makes a new version of an article or preprint whose galley
has a Publisher ID, or of a book whose chapter or publication format
has one. Each galley, chapter and format of the new version starts with
the same Publisher ID as the one it was copied from. When the editor
opens the copy's "Identifiers" tab and presses "Save", the save is
refused: "The public identifier '…' already exists for another object
of the same type." The other object is the same galley in the earlier
version.

The refusal comes back on every save until the Publisher ID is changed
to a new value, so the new version cannot keep the item's ID. On a
journal or press that uses URNs for these items, the URN on the same
tab cannot be assigned meanwhile.

A Publisher ID can be set on these items only while "Enable for
Galleys" ("Enable for Chapters", "Enable for Publication Formats") is
ticked under Settings › Workflow › "Metadata", and all three are off by
default.

## Impact

- **Lost**: the item's own Publisher ID on the new version. To save the
  tab, the editor has to replace it with a different value, which no
  longer matches the ID the item has in the publisher's own records.
- **Who**: editors and managers who record Publisher IDs for galleys,
  chapters or formats, on every new version of such a submission, as
  soon as they save the copy's "Identifiers" tab. Where the URN plugin
  is on for galleys, chapters or formats (journals and presses only),
  the tab also holds the item's URN: "Assign" and a typed suffix are
  refused with the Publisher ID.
- **Way round**: none that keeps the ID. Changing it to another value
  saves. Emptying the box does not remove it either, a separate fault
  ([A2 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A2-publisher-id-on-tab-never-removed.md)).

Medium: the save fails with a message that blames a duplicate that is
the item's own earlier copy, and the only way through gives up the ID.
Today these IDs go only into the Native XML export, the duplicate check
itself and a URN or DOI custom suffix pattern with "%x"; no reader page
or deposit plugin reads them directly.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`), of each app.
- OJS: submission 1, "Signalling Theory Dividends", has a published
  version and an unpublished one (version 1.1; on 3.5 "Version 2") whose
  galley is "PDF Version 2".
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production", is in Production, not posted, with
  the galley "PDF".
- OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture", is in Production, not published, with the chapter
  "Introduction: Contexts of Popular Culture".

Galley (OJS, OPS) or chapter (OMP):

1. Sign in as `rvaca`.
2. Open Settings › Workflow › "Submission" › "Metadata". Under
   "Publisher ID", tick "Enable for Galleys" (OMP: "Enable for
   Chapters") and press "Save".
3. Open submission 1 (OMP: submission 4) and, under Publication of the
   unpublished version, "Galleys" (OMP: "Chapters"). Open "PDF Version
   2" (OPS: "PDF") with its row's "Edit", then the "Identifiers" tab
   (OMP: press the chapter's title, then "Identifiers").
4. Type "u44f-galley-1" (OMP: "u44f-chapter-1") in "Publisher ID" and
   press "Save". The window closes.
5. Publish the version: "Publish" (OPS: "Post"), and confirm in the
   window (OJS `main`: "Confirm" on "Review Publishing Details" first).
6. "Create New Version", "Revision Significance" "Minor Revision",
   "Confirm" [3.5: the header's "Create New Version", then "Yes"].
7. On the new version, open the same galley's (chapter's)
   "Identifiers" tab, as in step 3. "Publisher ID" reads "u44f-galley-1"
   ("u44f-chapter-1").
8. Press "Save" without changing anything.

Way round:

9. Type "u44f-galley-2" ("u44f-chapter-2"), press "Save", and open the
   tab again.

**Expected.** At step 8 the window closes and the ID stays: it is the
same galley's ID, carried over to the new version as the version's own
identifiers are.

**Observed.** At step 8 the window stays open with:

```
Errors occurred processing this form
The public identifier 'u44f-galley-1' already exists for another object of the same type. Please choose unique identifiers for the objects of the same type within your journal.
```

("…within your press." on OMP with 'u44f-chapter-1', "…within your
server." on OPS.) At step 9 the window closes and the tab reads
"u44f-galley-2".

Publication formats and the URN on these tabs have no steps here: they
are read in the code (Cause).

## Cause

"Create New Version" copies each galley whole, its stored identifiers
included. OJS's and OPS's `Repository::version()`
(`classes/publication/Repository.php`) clones every galley and adds the
copy with `Repo::galley()->add()`. OMP's `Repository::version()` does
the same for every chapter (`ChapterDAO::insertChapter()`) and
publication format (`PublicationFormatDAO::insertObject()`); both
objects store `pub-id::publisher-id` among their settings.

The uniqueness check does not allow for these copies. On save,
`PKPPublicIdentifiersForm::validate()` calls `anyPubIdExists(…,
$assocType, $pubObject->getId(), true)` on the app's context DAO
(`JournalDAO`, `PressDAO`, `ServerDAO`). That method asks the object
type's DAO: pkp-lib's galley DAO (`classes/galley/DAO.php`) or OMP's
`ChapterDAO` and `PublicationFormatDAO`. Their `pubIdExists()` leaves
out only the object's own row (`galley_id <> ?`). The earlier version's
galley is another row holding the same value, so the copy counts as a
duplicate of itself.

The publication DAO's `pubIdExists()` follows a different rule: it
leaves out the whole submission. Until 2024 it said why ("The
excludePubObjectId refers to the submission id because multiple
versions of the same submission are allowed to share a DOI", removed
without a behaviour change in
[6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347)).
The galley, chapter and format checks never took that rule over. The
OJS commit that added the galley copy also rewrote the galley DAO's
`pubIdExists()` to join through publications, and kept excluding the
galley alone.

Reach:

- Publication formats (OMP): the same copy and the same check (code).
- The URN on these tabs (OJS and OMP; OPS has no URN plugin): while the
  copied Publisher ID stands, `validate()` fails, so "Assign" and a
  typed suffix are not saved (code). The URN suffix check uses the same
  DAO methods (pkp-lib `PKPPubIdPlugin::checkDuplicate()` for galleys
  and formats, OMP's `PubIdPlugin::checkDuplicate()` for chapters). A
  URN copied with the galley is shown with "Clear" and is not checked
  again. If the editor clears it and types the same suffix back, that
  suffix is refused for the same reason (code).
- Not affected: the publication's own Publisher ID, because nothing
  checks it for uniqueness. Its URN check is a separate fault
  ([A4 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U44-A4-article-own-urn-refused-as-in-use.md)).
  Issues and issue galleys are not versioned. Press files are copied
  too, but their Publisher ID is never stored (spec U44 OMP5).

## Proposed fix

Make the three DAOs' `pubIdExists()` follow the publication DAO's rule:
galleys (chapters, formats) in the submission's other versions do not
count. Within one version, and across submissions, the check stays as
it is. The pkp-lib change for OJS and OPS is
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix-ojs.diff)
(identical to
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix-ops.diff)).
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix-omp.diff)
makes the same change in OMP's `ChapterDAO` and `PublicationFormatDAO`.
In pkp-lib's galley DAO:

```diff
     public function pubIdExists(string $pubIdType, string $pubId, int $excludePubObjectId, int $contextId): bool
     {
+        // A new version's galleys are copies of the earlier version's and keep their identifiers,
+        // so the submission's other versions do not count (the
+        // publication DAO, likewise, leaves out the whole submission).
+        $excluded = DB::table('publication_galleys AS pg')
+            ->join('publications AS p', 'p.publication_id', '=', 'pg.publication_id')
+            ->where('pg.galley_id', '=', $excludePubObjectId)
+            ->first(['p.submission_id', 'p.publication_id']);
+
         return DB::table('publication_galley_settings AS pgs')
             …
             ->where('pgs.galley_id', '<>', $excludePubObjectId)
+            ->when($excluded, fn ($query) => $query->where(
+                fn ($query) => $query->where('p.submission_id', '<>', $excluded->submission_id)
+                    ->orWhere('p.publication_id', '=', $excluded->publication_id)
+            ))
             ->where('s.context_id', '=', $contextId)
```

The rule lives in the DAOs, so both checks on these tabs follow it: the
Publisher ID check and the URN suffix check. The method's signature
does not change. When the excluded ID matches no galley, the lookup
returns nothing and the query is today's.

**A decision for the team.** With this fix, a different galley, chapter
or format in another version of the same submission may also take the
same ID: version 2's HTML galley could take the ID that version 1's PDF
galley holds. The DAOs cannot tell a copy from any other item of
another version, because nothing links the two. Within one version and
across submissions, duplicates are still refused.

Tried on `main` on the three apps: with the fix in, step 8 closes the
window and the reopened tab shows the copied ID. A neighbour check,
with the fix in and out, typed the same ID on another submission's
galley (OJS: submission 17's new version, "PDF") and on another chapter
of the same version (OMP: "Chapter 1. …"): it was refused both ways.

**Alternatives**

- Skip the check in `PKPPublicIdentifiersForm::validate()` when the
  posted value equals the stored one: one place, but the URN suffix
  check keeps the fault.
- Drop `pub-id::publisher-id` from the copies in `version()`: the new
  version loses the ID, and the editor cannot type it back, since the
  earlier galley still holds it.
- Link each copy to its source and leave out only that row: the precise
  rule, but it needs a new column and a migration. OMP had such a link
  once: chapters carried a `prevVerAssocId` to their source until
  ce205d583 replaced that copy with the clone-based one.

**What goes with it**

- No data repair: the copies stored so far are what the fix accepts.
- Backport: the diffs apply to 3.5 as written. 3.4 and 3.3 have the
  same checks in older DAO code (3.3: `ArticleGalleyDAO`, raw SQL),
  which would need the same condition written by hand.
- Guard: an e2e scenario in pkp-e2e's spec U44 that sets a galley's and
  a chapter's Publisher ID, makes a new version and saves the copy's
  tab; a pkp-lib unit test of the galley DAO's `pubIdExists()` across
  two versions.

Medium: two repos (pkp-lib's galley DAO, and OMP's chapter and format
DAOs), the team's decision above, and the tests.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js)
  (helpers in `lib.js` beside it and in the walks it names), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL). `WALK=neighbour` in front takes the
  neighbour check (OJS and OMP). The walk also empties the box between
  steps 8 and 9: the window closes and the copied ID stays.
- A database read after each save found the copy's
  `pub-id::publisher-id` row beside the earlier version's.
- Not walked: OMP publication formats (the dataset's unpublished book 4
  has only a remote format, which has no "Identifiers" tab; the format
  half of `fix-omp.diff` was applied but not exercised) and the URN on
  these tabs. OPS was left out of the neighbour check: its dataset has
  no second unposted galley, and it uses the same galley DAO as OJS.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794, OPS
  c8af945bb7 (pkp-lib 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (pkp-lib cf3f984335); `stable-3_4_0` OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b (pkp-lib 32b0f4b4af);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161 (pkp-lib
  f6ab331645).
- Code reads, each version: the galley copy in `version()` (3.3:
  `PublicationService::versionPublication()`), the galley DAO's
  `pubIdExists()` (3.3: OJS and OPS `ArticleGalleyDAO`), OMP's chapter
  and format copies and `ChapterDAO`/`PublicationFormatDAO::pubIdExists()`,
  and the Publisher ID check in `PKPPublicIdentifiersForm::validate()`.
  All four versions copy the ID and exclude only the object's own row.
  On 3.4 and 3.3 an emptied box does clear the ID, which also loses it.
- Introduced: `git log -S` on the galley copy and on the chapter and
  format copies; OPS took the same code from OJS's history.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, for "publisher id new version galley",
  "publisher id already exists", "public identifier already exists new
  version", "galley identifier duplicate version", "publisher id
  chapter new version", "galley publisher id duplicate",
  `publicIdentificationExistsForTheSameType`, `pubIdExists`,
  `anyPubIdExists` and `PKPPublicIdentifiersForm validate`.
  `pkp/pkp-lib#2072` (versioning), `pkp/pkp-lib#5208` (URNs and
  versioning) and `pkp/pkp-lib#5430` (Publisher ID availability) are
  other work.
