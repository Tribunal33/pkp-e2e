# A data citation added after the Data Citations table was ordered appears first, not last

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no Data Citations table)
  - 3.4: none (code; no Data Citations table)
  - 3.3: none (code; no Data Citations table)
- **Introduced** `pkp/pkp-lib#12079` for `pkp/pkp-lib#6278` · [bd6bebd1fa](https://github.com/pkp/pkp-lib/commit/bd6bebd1faa00435910c67ee46fb1d7eb7298f00) · 2026-02-13 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor orders a publication's data citations ("Order", the arrows,
"Save Order") and then adds another one. The new data citation appears
first, above every row that was ordered, and stays there after a reload,
where an editor expects it at the end. Several added after one saved
order all go to the top, in the order they were added, above the
ordered rows.

The editor sees the new row at the top and can move it down with the
arrows and save the order again.

It needs data citations turned on ("Enable data citation metadata",
off by default). Every export of the publication's data citations lists
them in the order the table shows: a journal's JATS export and its
Crossref and DataCite deposits, and a preprint server's Crossref
deposit.

## Impact

- **Lost**: no data; the place of each data citation added after an
  order was saved, until the editor moves it. Crossref and DataCite
  record data citations as a set of related identifiers, where order
  carries no meaning; a JATS reference list is shown in the order given,
  so there the new data citation comes before the ones the editor
  ordered.
- **Who**: editors and managers (and authors, wherever they may edit
  the publication) who order a publication's data citations and add
  more later. Every later addition lands on top again.
- **Way round**: move each new row down with the arrows and press "Save
  Order"; it then stays where it was put.

Low: the new row is in plain sight and a few presses put it in place;
only a JATS reference list carries the wrong order out.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Data
  citations are off in the dataset, so step 2 turns them on.

Setup:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Workflow" › "Submission" › "Metadata", tick
   "Enable data citation metadata" and press "Save".

Adding and ordering:

3. Open submission 1 from "Submissions" ("Signalling Theory Dividends"
   on OJS, "The influence of lactation on the quantity and quality of
   cashmere production" on OPS; on OMP submission 4, "How Canadians
   Communicate: Contexts of Canadian Popular Culture"). In the side menu
   under "Publication" ("Preprint" on OPS), choose "Data".
4. Press "Add Data Citation", type "u42r6 Dataset A" as the Title,
   choose "Supporting data without specifying whether they were
   generated or analyzed (supporting)." as the Relationship type, and
   press "Save".
5. Add "u42r6 Dataset B", then "u42r6 Dataset C", the same way.
6. Reload the page and open "Data" again.
7. Press "Order", press the up arrow on "u42r6 Dataset C" twice, and
   press "Save Order". The table reads "u42r6 Dataset C", "u42r6 Dataset
   A", "u42r6 Dataset B".
8. Add "u42r6 Dataset D" the same way as in step 4.
9. Reload the page and open "Data" again.

**Expected.** After step 8 and after the reload, the new data citation
comes last: "u42r6 Dataset C", "u42r6 Dataset A", "u42r6 Dataset B",
"u42r6 Dataset D".

**Observed.** The same on the three apps:

- Step 6: "u42r6 Dataset A", "u42r6 Dataset B", "u42r6 Dataset C".
- Step 7: "Save Order" answers 200 and the table reads C, A, B.
- Step 8: "u42r6 Dataset D", "u42r6 Dataset C", "u42r6 Dataset A",
  "u42r6 Dataset B".
- Step 9: the same, D first.

## Cause

`PKPDataCitationController::add()` (`lib/pkp/api/v1/dataCitations/PKPDataCitationController.php`,
line 180) creates the data citation with `DataCitation::create($params)`
and gives it no place in the order. The panel sends no `seq`, so the
row takes the column's default, 0 (`MetadataMigration`, line 67, and the
upgrade `I6278_DataCitations`). "Save Order" (`saveOrder()`, line 269)
writes 1, 2, 3 … to the rows it is sent, so after a saved order every
ordered row sorts after a new one at 0.

The read has no tie-breaker. `DataCitation::scopeOrderBySeq()`
(`lib/pkp/classes/dataCitation/DataCitation.php`, line 107) sorts by
`seq` alone. Several data citations added after a saved order all hold
0, so they sort above the ordered rows and among themselves in whatever
order the database returns them; on PostgreSQL the walk saw the order
they were added. Before any order is saved every data citation holds 0
and ties the same way; the walks always showed the order added, so a
different order before a save was not seen on screen.

Both lines came with the feature (bd6bebd1fa). Its siblings give a new
row the next place: a contributor gets `getNextSeq()` (`author/DAO`), a
reference `getLastSeq() + 1` (`citation/Repository`), a discussion
`max('seq')` (`editorialTask/Repository`), and the funders' query adds
the row id as a tie-breaker (`Funder::scopeOrderBySeq()`).

Reach (everything that reads `orderBySeq()`):

- The publication's "Data" page and the wizard's "Data" section: both
  draw `publication.dataCitations` (walked: the publication page, three
  apps; the wizard by code).
- `GET …/dataCitations` (`getMany()`, line 150) and the publication's
  `dataCitations` in the REST API (`publication/DAO`, line 222) (code).
- The exports, which list the publication's data citations in that
  order (code): OJS's JATS reference list (`jatsTemplate` `ArticleBack`,
  line 71), OJS's Crossref deposit (`ArticleCrossrefXmlFilter`, line
  925), OJS's DataCite export (`DataciteXmlFilter`, line 791) and OPS's
  Crossref deposit (`PreprintCrossrefXmlFilter`, line 503).
- A new version's copies (`publication/Repository::version()`, line
  462), made in the order read, each with its source row's `seq`
  (walked on OMP: the copy keeps the source's order).
- The Funders table has the same add without a place:
  `PKPFunderController::add()` sets `'seq' => 0` (line 180), so a funder
  added after a saved order also appears first (spec U43's question
  [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a7));
  its query already breaks ties by id (code).

## Proposed fix

Recommended (a proposal; the team decides): give a new data citation the
publication's next place when it is created and break ties by id when
reading, both in the model, and number a new version's copies in the
order they are read
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-added-after-order-goes-first/fix.diff),
`lib/pkp/classes/dataCitation/DataCitation.php` and
`lib/pkp/classes/publication/Repository.php`):

```diff
         parent::boot();
 
+        // A data citation added without a place of its own goes after the publication's others
+        static::creating(function (self $model) {
+            if (empty($model->seq)) {
+                $model->seq = (int) static::where('publication_id', $model->publicationId)->max('seq') + 1;
+            }
+        });
+
         static::saving(function (self $model) {
…
     protected function scopeOrderBySeq(EloquentBuilder $builder): EloquentBuilder
     {
-        return $builder->orderBy('seq');
+        return $builder->orderBy('seq')->orderBy('data_citation_id');
     }
--- a/lib/pkp/classes/publication/Repository.php
         $dataCitations = $publication->getData('dataCitations');
+        $seq = 0;
         foreach ($dataCitations as $dataCitation) {
…
             $data['publicationId'] = $newPublication->getId();
+            $data['seq'] = ++$seq;
             $newDataCitation = DataCitation::create($data);
```

The model is where every data citation is written, and its `boot()`
already holds the `saving` hook that normalises identifiers, so the
rule sits beside it. "Next place" is the pattern of
`author/DAO::getNextSeq()` and `citation/Repository`; the id
tie-breaker is the funders' own. The place is computed per publication;
two adds at the same moment can share a `seq`, and the id then orders
them. A new version's copies get 1, 2, 3 … in the order read, so rows
stored at 0 before the fix keep their place in the copy instead of
being given new places by the hook.

Tried on `main`: on the three apps, with the fix in, the walk showed
Expected. With the version copy added to the fix, tried again on OMP:
the Steps showed Expected; data citations added after a saved order
went last; and rows stored at 0 before the fix, above an ordered set,
kept their order in a new version made with the fix in ("u42r6 NB X",
"u42r6 NB Y", then the ordered three). Without the fix the copy keeps
the source's order too.

**Alternatives**

- Set the next `seq` in `PKPDataCitationController::add()` only: covers
  the screens, but leaves any other writer of a data citation (a plugin,
  a future import) at 0.
- The tie-breaker alone: fixes the order before a save, but a data
  citation added after a saved order still sorts first.
- Sort new rows last in the browser: the REST API, JATS and the Crossref
  deposit would still read them first.

**What goes with it**

- Stored data: rows already at 0 stay above the ordered rows of their
  publication until an editor saves an order again; ties among them are
  then broken by id, the order they were added. No repair is proposed;
  a migration that moves such rows after the ordered ones would change
  an order editors have seen.
- Funders: if U43's A7 is ruled a defect, the same `creating` hook on
  `Funder` (per submission, in its `booted()`), replacing the explicit
  `'seq' => 0` in `PKPFunderController::add()`.
- Guard: a unit test that adds two data citations, saves an order,
  adds a third and reads it last; and the e2e ordering walk in spec U42
  (scenario 6), which reads the table after a later add.

Small: a hook and a tie-breaker in one model and two lines in the
version copy, following the contributors' and funders' patterns, with
no API or schema change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-added-after-order-goes-first/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/data-citation-added-after-order-goes-first/lib.js).
  It takes the Steps as `dbarnes` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03) and reads each row's text after each step, and
  the stored `seq` of each row for reference. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/data-citation-added-after-order-goes-first/walk.js`.
  The argument `nb` instead orders three data citations, adds two more,
  publishes the version and creates a new one, and reads the copy;
  `nb-setup` and `nb-version` run its two halves apart, so rows stored
  without the fix can be copied with it.
- Tips walked, on PostgreSQL: OJS ff004d0973 (pkp-lib 987776cd04), OMP
  3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6); `DataCitation.php`,
  `PKPDataCitationController.php` and `publication/Repository.php` are
  identical in both pkp-lib commits. The order before a save depends on the database's row order:
  MySQL not checked.
- Code reads:
  - main: blame on `DataCitation.php` line 107 and
    `PKPDataCitationController.php` line 180 lands on bd6bebd1fa, the
    first version of both files (`pkp/pkp-lib#12079`, merged
    2026-02-14).
  - 3.5 (OJS c1cee76b95, OMP 9c5e24246, OPS 38b61882d3; pkp-lib
    771474347e and cf3f984335): no `classes/dataCitation/`, no
    `data_citations` table, no Data Citations table on screen; bd6bebd1fa
    is not on `stable-3_5_0`. Not walked for that reason.
  - 3.4 (pkp-lib 767353f4fe) and 3.3 (pkp-lib ac3fa73402): no file named
    for data citations in pkp-lib's tree.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched (2026-10-04). `pkp/pkp-lib#13069` (closed) aligned the data
  citations' code with the funders' ("mostly visual stuff") and did not
  touch the order.
- The Galleys and publication formats lists have the same untied
  `seq` in their own classes, with a fix of their own:
  [U46-A7-galley-format-moves-in-list-when-saved.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U46-A7-galley-format-moves-in-list-when-saved.md).
- Several data citations added after one saved order were walked on
  OMP alone (without and with the fix); OJS and OPS run the same code.
- Unverified: whether data citations added before any order is saved
  can come back in another order on screen (code only).
