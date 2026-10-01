# A new version's galley, chapter or format tab refuses the publisher ID copied from the earlier version

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2457` and `pkp/omp#700`, for `pkp/pkp-lib#2072` (versioning) · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) and [ce205d5836](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor gives an article's galley a publisher ID on its "Identifiers"
tab, then creates a new version. On a press the same goes for a book's
chapters and publication formats. The new version's galley is stored
with the same publisher ID, and keeps it as long as nobody saves its
tab. When the editor presses "Save" on that tab, even without changing
anything, the save is refused with "The public identifier '…' already
exists for another object of the same type." The other object is the
earlier version's galley.

While the copied value is in the box, no save on the tab goes through.
On a journal or press with the "URN" plugin on, that includes
assigning the new version's galley a URN. Saving with the box emptied
does not help either, because an emptied publisher ID is not removed
([pkp-e2e#76](https://github.com/jardakotesovec/pkp-e2e/issues/76)).

It needs publisher IDs switched on for galleys (on a press, for
chapters or publication formats), which is off by default, and an item
that was given one before the new version was made.

## Impact

- **Lost.** Nothing. The copy keeps the publisher ID untouched. An
  editor who saves the tab must give it a new one, so the item carries
  one publisher ID in the earlier version and another in the new one.
  No reader sees the difference: no reader page, address or lookup
  uses a galley's, chapter's or format's publisher ID. It shows only in
  the native XML export, and in a URN or DOI generated afterwards from
  a pattern holding `%x`. URNs and DOIs already assigned keep their
  value.
- **Who.** Editors and managers who open the "Identifiers" tab of a new
  version's galley, chapter or publication format to save something:
  the publisher ID, or (journals and presses) a URN. DOIs are managed
  elsewhere and are not blocked. The tab is refused for every item that
  had a publisher ID, again on each further version.
- **Way round.** Type a different publisher ID and save. Emptying the
  box is no second way round until pkp-e2e#76 is fixed.

Low: nothing is lost and the save goes through with a one-step change
that readers do not see; the refusal only misleads. It would be medium
if these publisher IDs reached a reader-facing address, or for a site
whose URN or DOI pattern uses `%x` and that generates the new version's
identifiers after changing the publisher ID.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Publisher IDs switched on for the items, as `rvaca`: Settings ›
  Workflow › "Submission" › "Metadata", under "Publisher ID" tick
  "Enable for Galleys" [press: "Enable for Chapters" and "Enable for
  Publication Formats"], and press "Save".

1. Sign in as `dbarnes`.
2. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in
   a hospital in Isfahan, Iran" (published) [press: submission 14,
   "From Bricks to Brains: The Embodied Cognitive Science of LEGO
   Robots", published; server: submission 2, "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence", posted].
3. In the side menu under "Publication", choose "Galleys" [press:
   "Publication Formats"].
4. On the "PDF" row press "More Actions" › "Edit" [press: the arrow at
   the start of the "PDF" format's row, then "Edit"; 3.5: the arrow at
   the start of the galley's row, then "Edit"], and open the
   "Identifiers" tab.
5. In "Publisher ID" type `u44r22-g1` [press: `u44r22-f1`] and press
   "Save". The window closes.
   [Press, before step 6: choose "Chapters" in the side menu, open the
   chapter "Chapter 1: Mind Control—Internal or External?" by its
   title, open its "Identifiers" tab, type `u44r22-c1` and press
   "Save".]
6. In the side menu press "Create New Version". Keep the window's
   choices ("Version of Record (VoR)" [server: "Author Original
   (AO)"], "Minor Revision") and press "Confirm". [3.5: the "Create New
   Version" button at the top of the publication page, then "Yes" in
   "Are you sure you want to create a new version?"]
7. Under the new version ("Version of Record 1.1" [server: "Author
   Original 1.1"]) in the side menu, choose "Galleys" [press:
   "Publication Formats", and for the chapter "Chapters"]. [3.5: the
   side menu has one "Galleys" entry under "Publication" (press:
   "Publication Formats", "Chapters"), which now shows the new version;
   its items are listed in a table on that page, each row opened by the
   arrow at its start.] Open the same item's "Identifiers" tab as in
   step 4. "Publisher ID" reads `u44r22-g1`.
8. Without changing anything, press "Save".

**Expected.** The window closes as in step 5: the new version's galley
keeps the publisher ID it was copied with, as the new version itself
carries the article's publisher ID over.

**Observed.** The window stays open, and the tab reads:

```
Errors occurred processing this form
The public identifier 'u44r22-g1' already exists for another object of the same type. Please choose unique identifiers for the objects of the same type within your journal.
Publisher ID
```

(press and server: "… within your press.", "… within your server.").
The same refusal meets the new version's format and chapter on the
press. Typing `u44r22-g2` and pressing "Save" closes the window, and
the reopened tab reads `u44r22-g2`; the earlier version's galley keeps
`u44r22-g1`.

## Cause

"Create New Version" copies each galley with all its data. OJS and OPS
`APP\publication\Repository::version()` (`classes/publication/Repository.php`,
line 169 in OJS, line 129 in OPS) clone the galley, clear only its ID
and publication, and add it, so its `pub-id::publisher-id` and
`pub-id::other::urn` settings are written again for the new galley.
OMP's `version()` does the same for publication formats (line 133) and
chapters (line 215).

The tab's save then checks the publisher ID for uniqueness.
`PKPPublicIdentifiersForm::validate()`
(`lib/pkp/controllers/tab/pubIds/form/PKPPublicIdentifiersForm.php`,
line 201) calls `anyPubIdExists(…, $assocType, $pubObjectId, true)`,
which asks the item kind's DAO. `PKP\galley\DAO::pubIdExists()`
(`lib/pkp/classes/galley/DAO.php`, line 180) leaves out only the galley
itself: `->where('pgs.galley_id', '<>', $excludePubObjectId)`. The
earlier version's galley carries the same value, so the new one is
refused. OMP's `ChapterDAO::pubIdExists()` (line 326) and
`PublicationFormatDAO::pubIdExists()` (line 498) compare the same way.

Elsewhere the code lets versions share identifiers. The publication
DAO's `pubIdExists()` is given a submission ID and leaves out that
submission, so all its versions may share a pub ID (its comment up to
3.4: "multiple versions of the same submission are allowed to share a
DOI"). OJS's and OMP's `version()` keep a galley's, chapter's and
format's DOI unless DOI versioning is on and the version is major;
OPS's drops a galley's DOI whenever DOI versioning is on. The galley,
chapter and format DAOs never took the publications' rule over.

Reach:

- URNs: the URN check asks the same DAOs, through
  `PKPPubIdPlugin::checkDuplicate()` (line 491) for galleys and formats
  and OMP's own `APP\plugins\PubIdPlugin::checkDuplicate()` (line 224)
  for chapters. A URN typed on a new version's item that equals the
  earlier version's is refused the same way (read in the code). A
  copied URN is shown as assigned and not checked again on save.
- The refusal blocks the whole tab's save, a URN assignment included
  (read in the code: `validate()` fails before `execute()` stores
  anything).
- Submission files (OMP): `version()` also copies a format's files, and
  `PKP\submissionFile\DAO::pubIdExists()` leaves out only the file
  itself. No screen reaches it: with "Enable for Files" ticked, a
  file's tab shows a publisher ID box, but the value is never stored
  ([pkp-e2e#45](https://github.com/jardakotesovec/pkp-e2e/issues/45)),
  and a copied URN is not checked again (read in the code; left out of
  the fix below).
- The new version's own URN on the "Identifiers" page goes through the
  publication DAO, whose separate fault is
  [pkp-e2e#7](https://github.com/jardakotesovec/pkp-e2e/issues/7)
  (spec U44 A4).

## Proposed fix

Make the galley, chapter and format DAOs leave out every item of the
same submission's other versions, that is, its other publications than
the one the item being saved belongs to. Unlike the publication DAO,
which is handed a submission ID, the fix starts from the item's own ID
and works out its versions from it. An item of the same version, or of
another submission, still counts. The diffs, as tried:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix.diff)
(pkp-lib, for OJS and OPS) and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix-omp.diff)
(OMP's chapter and format DAOs, the same change). The galley DAO:

```diff
--- a/lib/pkp/classes/galley/DAO.php
+++ b/lib/pkp/classes/galley/DAO.php
@@ -168,9 +168,20 @@
 
     /**
      * @copydoc PKPPubIdPluginDAO::pubIdExists()
+     *
+     * A new version copies its galleys with their pub ids, and the versions of
+     * one submission may share a pub id, so the galleys of the excluded galley's
+     * other versions are left out of the check.
      */
     public function pubIdExists(string $pubIdType, string $pubId, int $excludePubObjectId, int $contextId): bool
     {
+        $otherVersions = DB::table('publications AS op')
+            ->join('publications AS ep', 'op.submission_id', '=', 'ep.submission_id')
+            ->join('publication_galleys AS eg', 'eg.publication_id', '=', 'ep.publication_id')
+            ->where('eg.galley_id', '=', $excludePubObjectId)
+            ->whereColumn('op.publication_id', '<>', 'ep.publication_id')
+            ->select('op.publication_id');
+
         return DB::table('publication_galley_settings AS pgs')
             ->join('publication_galleys AS pg', 'pgs.galley_id', '=', 'pg.galley_id')
             ->join('publications AS p', 'pg.publication_id', '=', 'p.publication_id')
@@ -178,6 +189,7 @@
             ->where('pgs.setting_name', '=', "pub-id::{$pubIdType}")
             ->where('pgs.setting_value', '=', $pubId)
             ->where('pgs.galley_id', '<>', $excludePubObjectId)
+            ->whereNotIn('pg.publication_id', $otherVersions)
             ->where('s.context_id', '=', $contextId)
             ->count() > 0;
     }
```

The rule lives in each DAO's `pubIdExists()`, which every caller goes
through: the tab's publisher ID check (by way of `anyPubIdExists()`)
and the URN plugin's `checkDuplicate()`. When a caller passes 0 (an
item not yet saved, or another kind of item), the subquery is empty and
nothing changes. Stored copies need no repair: the fix makes the
values already stored valid.

The rule is wider than the copy. A different item of another version
can take the value too: the new version's "HTML" galley could be given
the earlier version's "PDF" galley's publisher ID. No reader page,
address or lookup reads these publisher IDs, so the wider rule costs
nothing outside the native XML export. It is recommended because it
works the same for all three kinds: a chapter knows which chapter it
was copied from, but galleys and formats do not.

Tried on `main`, OJS, OMP and OPS:

- With the fix, step 8 closes the window on the galley (journal,
  server), the format and the chapter (press). Both versions keep the
  publisher ID, and the way round still saves.
- With and without the fix, another submission's galley, format or
  chapter given the same publisher ID is refused with the same message.

**Alternatives**

- For chapters, leave out only the same chapter's versions: OMP links
  them through `submission_chapters.source_chapter_id`
  (`ChapterDAO::getBySourceChapterId()`, line 116), so the condition
  would be `COALESCE(sc.source_chapter_id, sc.chapter_id)` differing
  from the saved chapter's. That is exact for chapters, but galleys and
  formats have no such column. A galley could be matched by its
  `submission_file_id`, which its copy shares, but a remote galley has
  none and "Change File" breaks the match. OMP copies a format's files
  with new IDs, so a format has nothing to match by. The three kinds
  would then follow different rules. Not tried.
- Clear the copies' publisher IDs and URNs in `version()`. The new
  version would lose identifiers that versioning copies on purpose, and
  copies already stored would stay refused.
- Leave out every item of the same submission, as the publication DAO
  does. Two galleys of one version could then share a publisher ID,
  which the tab refuses today.

**What goes with it**

- Backport: applies to `stable-3_5_0` with an offset (the galley DAO's
  `pubIdExists()` sits at line 190 there). 3.4 writes these queries as
  SQL strings (`AND pgs.galley_id <> ?`, `AND sc.chapter_id <> ?`,
  `AND pf.publication_format_id <> ?`); the same condition fits there
  as a `NOT IN` subquery. On 3.3 the galley DAO is not in pkp-lib but
  in OJS and OPS each (`classes/article/ArticleGalleyDAO.inc.php`), so a
  backport there touches OJS, OPS and OMP.
- Submission files (OMP): the same change to
  `PKP\submissionFile\DAO::pubIdExists()` would need the file's format
  to find its other versions; no screen reaches it, so it is left out.
- Test: a unit test of each `pubIdExists()` for the item's own value,
  its copy in another version, an item of the same version and an item
  of another submission. And an e2e scenario for the identifiers
  feature: a new version's galley saved with its copied publisher ID.

Medium: the same few lines in three DAOs across two repos (pkp-lib and
OMP), with a test for each.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js)
  takes the setup and steps 1–8, then the way round, on a fresh load of
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-galley-publisher-id-refused/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It opens each page at
  the address its side-menu entry sets
  (`…/dashboard/editorial?workflowSubmissionId=<n>&workflowMenuKey=publication_<publication>_galleys`;
  `publication_galleys` on 3.5), and after each save reads the item
  kind's settings table to show what was stored. `PHASE=neighbour` in
  front runs the neighbour check: the publisher IDs saved on the same
  items, then the same values typed on another submission's items (OJS
  submission 1's "PDF Version 2", OPS submission 1's "PDF", OMP
  submission 5's format "PDF" and chapter "Prologue").
- The fix was tried with `node bin/try-fix.js apply
  shared/playwright/checks/issues/new-version-galley-publisher-id-refused/fix.diff ojs ops`
  and `… fix-omp.diff omp`, then `walk.js` and `PHASE=neighbour
  walk.js`, then `node bin/try-fix.js revert ojs omp ops`. The
  neighbour check was also run without the fix. Both diffs apply to
  `stable-3_5_0` (`patch --dry-run`, offsets of 18 and -2 lines); they
  were not walked there.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS,
  OMP and OPS. No request answered a server error and no page script
  failed. The fix's subquery is standard SQL; MySQL was not checked.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12);
    OMP
    [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
    and OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2),
    both with pkp-lib
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP
    [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb)
    and OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994),
    all with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP
    [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS
    [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a),
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP
    [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09),
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code reads:
  - 3.5: the same lines as `main` (galley DAO line 198, OMP chapter DAO
    324 and format DAO 498; `version()` clones galleys in OJS at 142 and
    OPS at 109, formats and chapters in OMP at 126 and 208), agreeing
    with the walk.
  - 3.4: OJS and OPS `classes/publication/Repository.php` `version()`
    clone galleys; OMP's clones formats and chapters. pkp-lib
    `classes/galley/DAO.php` `pubIdExists()` (line 187) and OMP's
    `ChapterDAO` and `PublicationFormatDAO` exclude only the item's own
    ID (`<> ?`). `PKPPublicIdentifiersForm::validate()` calls
    `anyPubIdExists(…, true)` as on `main`.
  - 3.3: OJS and OPS `classes/services/PublicationService.inc.php`
    `versionPublication()` clone galleys; OMP's clones formats and
    chapters. OJS's and OPS's own `classes/article/ArticleGalleyDAO.inc.php`
    (OPS line 214) and OMP's
    `ChapterDAO.inc.php` and `PublicationFormatDAO.inc.php`
    `pubIdExists()` exclude only the item's own ID;
    `PKPPublicIdentifiersForm.inc.php` `validate()` the same call.
  - Where a galley's, chapter's or format's publisher ID is read on
    `main`: the native XML export (`RepresentationNativeXmlFilter`, OMP
    `ChapterNativeXmlFilter`) and the `%x` of URN and DOI suffix
    patterns (`PubIdPlugin::generateCustomPattern()`, which
    `APP\doi\Repository` also uses). Galley and format addresses use
    `urlPath` or the ID (`getBestGalleyId()`, `getBestId()`); the book
    page lists a format's URN only; no lookup by publisher ID exists for
    these items (`getByPubId()` is called for submission files only).
  - The tab (`publicIdentifiersForm.tpl`) holds the publisher ID box and
    the pub-ID plugins' areas; the only such plugin in the apps is
    "URN" (OJS, OMP). DOIs are not on it.
- Introduced, the trace: `git blame` of the galley DAO's exclusion line
  gives
  [6bfef785aa](https://github.com/pkp/pkp-lib/commit/6bfef785aa7c1512dc37eba17ca79b394638d347)
  (2024-07-05), a query-builder rewrite of SQL that dates from 3.3.
  `git log -S` on OJS `stable-3_3_0` finds the galley copy and the
  galley query's join to publications in the same commit,
  [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5)
  ("pkp/pkp-lib#2072 Working prototype of versioning based on new
  publication entity", 2019-06-26, `pkp/ojs#2457`). OMP's copies of
  chapters and formats came with
  [ce205d5836](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c)
  (2019-08-21, `pkp/omp#700`). The publications' rule that versions
  share a pub ID came later, with
  [61faca11df](https://github.com/pkp/pkp-lib/commit/61faca11dfe9f760c2508de44a1936fa1ac9411a)
  (`pkp/pkp-lib#4867`, 2019-10-09), and was not carried over to
  galleys, chapters or formats. OPS took over OJS's code when it was
  created.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, by "publisher id new version", "public identifier
  already exists", "galley version identifier", "URN galley new
  version", "publisher id duplicate" and `pubIdExists`.
  Ruled out: the issue `pkp/pkp-lib#5208` (URNs and versioning, closed
  2020) does not mention the copies, and the PR `pkp/pkp-lib#10826`
  (for the issue `pkp/pkp-lib#10821`) changed the duplicate checks
  without touching the copies.
- Not walked, read in the code only: the refusal of a URN typed on a
  new version's item, the URN assignment blocked by the refusal, and
  submission files (OMP). Unverified: the fix on MySQL.
