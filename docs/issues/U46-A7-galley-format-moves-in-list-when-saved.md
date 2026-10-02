# Saving a galley or a publication format moves it to another place in its list and on the public page

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** galleys: `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-06-26 (merged 2019-09-05) · Nate Wright (NateWr); publication formats: not traced; sorted by position with no tie-break since at least [f221f13264](https://github.com/pkp/omp/commit/f221f132644a3ba3b3c2cf94a5d32aaabf028832) (2017-02-20)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a7) · spec U73 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a14)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor who presses "Edit" › "Save" on a galley expects the
"Galleys" list to keep its order. Instead the galley moves to another
place in the list, usually the end, even when nothing in it changed.
On a published article or preprint, the galley buttons on its public
page move with it. A press has the same problem on its "Publication
Formats" page. A format moves when it is saved from "Edit", when its
approval or availability changes, or when its DOI is emptied.

Nothing is deleted, but the order readers see changes with each save,
and nobody is told. On a journal or preprint server, the editor can
press "Order", move the galleys back with the arrows and press "Save
Order", which stores the order shown. Edits made after that keep their
place, so pressing it once before any edit protects the list. A galley
added after a saved order still does not go to the end: it lands right
after the first galley. A press has no control that orders its formats,
so it has no way round.

This happens on every list where no order was ever saved, which covers
every galley list until someone presses "Save Order" and every format
list.

## Impact

- **Lost**: the order of galleys or formats on the workflow and public
  pages, silently.
- **Who**: editors, moderators and press staff who save a galley or a
  format, and that item's readers.
- **Way round**: journal and preprint server: "Order" › "Save Order".
  Press: none (`pkp/pkp-lib#5174` asks for format reordering as a
  feature).

Medium: a published item's public list of files reorders itself
silently after ordinary edits, on every install, and a press cannot put
it back. It would be high if files dropped out of the list.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OPS or OMP), freshly
  loaded into PostgreSQL (the datasets' `pgsql` dumps); on MySQL the
  move may not show. No order has ever been saved on the lists the
  steps use.
- Any PDF file and any CSV file at hand.

[3.5: the side menu has no version entries, so "Galleys" and
"Publication Formats" sit straight under "Publication" ("Preprint").]

Journal or preprint server, a published item: OJS submission 17
"Antimicrobial, heavy metal resistance and plasmid profile of coliforms
isolated from nosocomial infections in a hospital in Isfahan, Iran", or
OPS submission 2 "The Facets Of Job Satisfaction: A Nine-Nation
Comparative Study Of Construct Equivalence". Each has one galley,
"PDF".

1. Sign in as `dbarnes`.
2. Open the submission and go to "Publication" ("Preprint" on OPS) ›
   the newest version › "Galleys". The list reads "PDF".
3. "Add galley", Galley Label "Appendix u46w5", "Save". In the upload
   window choose "Article Text" ("Preprint Text" on OPS), then the PDF,
   "Continue", "Continue", "Complete".
4. "Add galley", Galley Label "Data u46w5", "Save". Choose "Data Set",
   then the CSV, "Continue", "Continue", "Complete". The list reads
   "PDF", "Appendix u46w5", "Data u46w5".
5. Open the item's public page,
   `/index.php/publicknowledge/article/view/17`
   (`/index.php/publicknowledge/preprint/view/2` on OPS). Its galley
   buttons read "PDF", "Appendix u46w5". "Data u46w5" is not among
   them: a "Data Set" file is a supplementary file, which the page
   lists in a block of its own.
6. Back on "Galleys", open "PDF" › "More Actions" › "Edit". Change
   nothing and press "Save".
7. Read the list, then reload the page and read it again.
8. Open the item's public page again.

Press, a published book: OMP submission 5 "Bomb Canada and Other Unkind
Remarks in the American Media", with one format, "PDF", approved and
available.

1. Sign in as `dbarnes`.
2. Open submission 5 and go to "Publication" › the newest version ›
   "Publication Formats".
   The list reads "PDF".
3. "Add publication format", Name "EPUB u46w5", "OK".
4. "Add publication format", Name "Print u46w5", "OK". The list reads
   "PDF", "EPUB u46w5", "Print u46w5".
5. Open "PDF"'s arrow › "Edit". Change nothing and press "OK". Read the
   list, then reload and read it again.
6. Under "EPUB u46w5" press "Awaiting Approval", then "OK" in the
   "Format Approval" window. Read the list.
7. Under "PDF" press "Available", then "OK" in the "Format
   Availability" window. Read the list, then reload and read it again.

**Expected**

Each list keeps the order its items were added in: "PDF", "Appendix
u46w5", "Data u46w5" on the journal and the preprint server, and "PDF",
"EPUB u46w5", "Print u46w5" on the press. The public page keeps "PDF"
before "Appendix u46w5".

**Observed**

Journal and preprint server, the same on both:

- Step 7: "Appendix u46w5", "Data u46w5", "PDF", both before and after
  the reload.
- Step 8: the galley buttons read "Appendix u46w5", "PDF".

Press:

- Step 5: "EPUB u46w5", "Print u46w5", "PDF", both before and after the
  reload.
- Step 6: "Print u46w5", "PDF", "EPUB u46w5".
- Step 7: "Print u46w5", "EPUB u46w5", "PDF", both before and after the
  reload.

None of the saves showed an error, and the browser recorded no failed
request.

## Cause

Each galley and publication format has a position, `seq`, and its
list is sorted by that position and nothing else:

- Galleys (journal, preprint server): `PKP\galley\Collector::getQueryBuilder()`
  (lib/pkp `classes/galley/Collector.php`, line 98) ends with
  `->orderBy('g.seq', 'asc')`. Every reader of a publication's galleys
  goes through it: the workflow's "Galleys" list (the publication's
  `galleys` from OJS's and OPS's `publication\DAO::fromRow()`), the
  article and preprint pages, and `galley\DAO::getByPublicationId()`.
- Formats (press): `PublicationFormatDAO::getByPublicationId()` (OMP
  `classes/publicationFormat/PublicationFormatDAO.php`, line 197) ends
  with `ORDER BY pf.seq`, `getByContextId()` the same, and
  `getApprovedByPublicationId()` with `ORDER BY seq`. The workflow's
  "Publication Formats" list loads through
  `PublicationFormatCategoryGridDataProvider::loadData()`, and the book
  page through the publication's `publicationFormats`
  (`publication\DAO::fromRow()`); both call `getByPublicationId()`.

No new row is given a position, and the "Add galley" and "Add
publication format" forms set none. `galley\Repository::add()` leaves
`seq` out of the insert, so a new galley gets the column's default, 0.
`PublicationFormatDAO::insertObject()` writes `(int) getSequence()`, an
explicit 0. All items in one list therefore tie, and SQL leaves the
order of tied rows to the database.

PostgreSQL returns them in their order in the table's storage. An
update writes a new copy of the row, usually after the others, so an
item that has just been saved usually comes last. When the table has
free space from earlier updates, it can also come first or in the
middle. Any save that updates the row moves the item:

- a galley's "Edit" › "Save" (`Repo::galley()->edit()`, which rewrites
  the row even when nothing changed);
- a format's "Edit" › "OK" and the "Metadata" tab's "Save"
  (`updateObject()`);
- a change to a format's approval or availability;
- a format's DOI emptied on the DOIs page. This deletes the DOI, and
  the foreign key `publication_formats.doi_id … nullOnDelete` updates
  the format's row (code).

Saves that write elsewhere move nothing: a DOI changed to another value
(the `dois` row), a file's terms or "Approve Proof" (`submission_files`).

"Save Order" (`OrderGridItemsFeature::saveSequence()`) numbers the
galleys 0, 1, 2…, so the ties are gone and later edits keep their
place. The first galley keeps 0, though, so a galley added afterwards
ties with it, and the database decides which of the two comes first.
Before any saved order, a new galley ties with all the others, so the
database may put it at the top as well as at the end.

Galleys once had positions. Until [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5),
`ArticleGalleyDAO::insertObject()` gave a new galley
`getNextGalleySequence()` (`MAX(seq) + 1`) whenever it had none. That
commit replaced the DAO's own insert with `SchemaDAO`'s, which keeps
`seq` as given. Publication formats never had a next position.

The author list solves the same problem. `author\Repository::add()`
already gave a new author `DAO::getNextSeq()`, and `pkp/pkp-lib#13003`
([922f895988](https://github.com/pkp/pkp-lib/commit/922f895988fc980c650004d59af8b48984b18a75))
added a tie-break by `a.author_id` to `author\Collector` and made
`getNextSeq()` count a maximum of 0.

Reach:

- The public article, preprint and book pages, the OAI and export
  records that list galleys or formats, and the REST API's `galleys`
  and `publicationFormats` all come out in this order (code; the
  article and preprint pages were walked).
- A new version copies its galleys and formats with their `seq`
  (each app's `APP\publication\Repository::version()`), so the copies
  tie as well (code).
- Data citations have the same pattern, which needs a separate fix:
  `DataCitation::scopeOrderBySeq()` sorts by `seq` alone, and
  `PKPDataCitationController::add()` sets no position
  ([register entry](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a8);
  code).
- OJS's issue galleys (`IssueGalleyDAO::getNextGalleySequence()`) and
  OMP's chapters (`ChapterForm` › `resequenceChapters()`) do give new
  rows a position (code).
- MySQL was not checked. InnoDB usually returns tied rows in
  primary-key order, which an update does not change, so the move may
  not show there. The order is still undefined.

## Proposed fix

Give each new galley and format the next position, and break ties by
ID, as pkp-lib's author list does. For galleys the change is in lib/pkp
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/fix.diff)),
and it applies to OJS and OPS as it stands:

```diff
--- a/lib/pkp/classes/galley/Collector.php
-            ->orderBy('g.seq', 'asc');
+            // Break ties (every galley added before a fix for this sat at 0) by insertion order
+            ->orderBy('g.seq', 'asc')
+            ->orderBy('g.galley_id', 'asc');
--- a/lib/pkp/classes/galley/Repository.php
     public function add(Galley $galley): int
     {
+        if ($galley->getData('seq') === null) {
+            $galley->setData('seq', $this->dao->getNextSeq($galley->getData('publicationId')));
+        }
+
```

`galley\DAO` gets a `getNextSeq(int $publicationId)` that returns
`MAX(seq) + 1` for the publication, or 0 when it has no galley. Formats
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/fix-omp.diff))
get the same change in `PublicationFormatDAO`. `insertObject()` gives a
format with no `seq` the next position. `getByPublicationId()`,
`getByContextId()` and `getApprovedByPublicationId()` add
`publication_format_id` after `seq`, as the DAO's own `getBySetting()`
query already does.

Both changes are needed. The tie-break stops edits from moving items
and orders the rows already stored by when they were added. The next
position puts a new galley at the end even after an order has been
saved. With the tie-break alone it would land second, after the first
galley.

Tried on `main` on all three apps. With the fix in, every list in the
Steps kept the order its items were added in: through each save, the
press's approval and availability changes, and the reloads. The public
pages kept "PDF" before "Appendix u46w5".

A neighbour check ran with the fix in and out. On the journal and the
preprint server it set the order "Data u46w5", "PDF", "Appendix u46w5"
with "Order" › "Save Order", reloaded, saved "PDF" from "Edit", and
added a galley "Notes u46w5". The saved order held through the reload
and the edit both times. The new galley landed last with the fix in. On the press, the list read in the order the formats
were added, both times.

- **Alternatives**: the tie-break alone leaves a galley added after
  "Save Order" next to the first one. Giving positions only in the
  "Add" forms leaves native imports whose XML has no `<seq>`, and any
  plugin calling `Repo::galley()->add()`, without them. Renumbering a list on every
  save writes rows nobody changed.
- **What goes with it**: no data repair. Rows already stored at 0 sort
  by ID, which is the order they were added in, so lists that were
  never ordered go back to that order. Lists saved with "Save Order"
  keep their order. A new version copies its galleys and formats in list
  order, each with its `seq`, so the copies' new IDs keep that order
  (code). The REST API's `seq` values do not change. The fix applies
  to 3.5 as written. On 3.4 the same files exist (the OJS and OPS 3.4
  lists are read through `PKP\galley\Collector`). On 3.3 the change
  goes into `ArticleGalleyDAO` and `GalleyQueryBuilder` in OJS and OPS,
  and into OMP's `PublicationFormatDAO.inc.php`.
- **The guard**: a unit test per repository that adds two galleys
  (formats) to a publication, updates the first and reads the list; and
  the e2e scenario in U46 and U73 (a Planned item in each spec) that
  edits a galley or format before any order is saved.

Medium: two repositories (pkp-lib and OMP), a few lines each, following
the author list's existing pattern.

## Evidence

- A Playwright script that runs the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/walk.js),
  with helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/galley-format-moves-in-list-when-saved/walk.js`.
  `W5_MODE=nb` runs the neighbour check alone.
- The fix, tried 2026-10-02 on the `main` tips below:
  `node bin/try-fix.js apply …/fix.diff ojs ops` and
  `node bin/try-fix.js apply …/fix-omp.diff omp`, then the script in
  both modes, then `revert`. The neighbour check was also run without
  the fix.
- Walked 2026-10-02 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02).
  - main: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
    3dc90c81a6) and OPS c8af945bb7 (lib/pkp 3dc90c81a6). Each showed
    the moves listed under Observed.
  - stable-3_5_0: OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335). The same order at every step on all three
    apps. The code read: `galley\Collector` orders by `g.seq` alone,
    `galley\Repository::add()` sets no `seq`, and `PublicationFormatDAO`
    is unchanged from `main`.
- 3.4, by code: pkp-lib `stable-3_4_0` at 9e41f10273 (OJS c1827e3527,
  OPS acd8ae704b, OMP 0aec65441). `PKP\galley\Collector` orders by
  `g.seq` alone and `Repository::add()` sets no `seq`. OJS's and OPS's
  `publication\DAO` load galleys through it. OMP's
  `PublicationFormatDAO` orders by `pf.seq` alone and inserts
  `(int) getSequence()`.
- 3.3, by code: OJS ac77c9fb35, OPS c5532e2161, OMP 8e72fc883, pkp-lib
  `stable-3_3_0` at ac3fa73402. `ArticleGalleyDAO` (a `SchemaDAO`, so
  no position on insert) and `GalleyQueryBuilder` order by `g.seq`
  alone. OMP's `PublicationFormatDAO.inc.php` orders by `pf.seq` alone,
  and `PublicationFormatForm` sets no position.
- Introduced: `git log -S getNextGalleySequence` on OJS shows the next
  position removed in 88aba9a0cb ("Working prototype of versioning
  based on new publication entity"), which is part of `pkp/ojs#2457`
  (merged 2019-09-05; GitHub's `commits/<sha>/pulls`). Its parent's
  `ArticleGalleyDAO::insertObject()` used `getNextGalleySequence()`
  when `seq` was null. The galley code moved to pkp-lib in
  `dcc66fc896` (`pkp/pkp-lib#7126`, 2022), after OPS had inherited it.
  On OMP, `git log -S "ORDER BY pf.seq"` leads to f221f13264 ("Add
  publication format sequencing").
- Upstream, searched 2026-10-02 in pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/omp
  and pkp/ui-library (galley order, sequence, sort, reorder; publication
  format order; `getNextGalleySequence`; `PublicationFormatDAO` seq).
  Read and not the same fault: `pkp/pkp-lib#6878` (the article page
  sorted galleys by ID, closed 2021), `pkp/pkp-lib#5174` (a request to
  reorder formats, open), `pkp/pkp-lib#13107` (an error on "Save
  Order" in OPS, closed 2026-07-30).
- What was not driven: a format's "Metadata" tab "Save" and a DOI
  emptied on the DOIs page (code, above; both moved a format in the
  spec's earlier walks). The public book page's order was not read:
  only "PDF" carries an approved, available file there, and the
  neighbour check's read of that page found no format link.
  `CatalogBookHandler` lists the formats from the publication's
  `publicationFormats`, which `publication\DAO` loads with
  `getByPublicationId()`, as for the workflow list (code).
