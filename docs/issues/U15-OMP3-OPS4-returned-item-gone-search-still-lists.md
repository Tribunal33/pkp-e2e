# Returning a published book or preprint to the workflow takes its page offline for readers, while Search still links to it

- **Severity** high
- **Effort** large
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: none (no "Return to Workflow")
  - 3.4: none (code; no "Return to Workflow")
  - 3.3: none (code; no "Return to Workflow")
- **Introduced** `pkp/pkp-lib#12881` for `pkp/pkp-lib#12799` · [d52aa4c84b](https://github.com/pkp/pkp-lib/commit/d52aa4c84b740ec537b13141f88401e8d2e4cdc4) · 2026-06-09 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U15 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#omp3), [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U15-search.md#ops4) · spec U19 [OMP8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#omp8), [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U19-oai-pmh.md#ops5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An editor presses "Return to Workflow" on a published book or a posted
preprint to keep working on it after publication. The published version
should stay public while that work goes on, as a journal's article does.

Instead, readers lose it at once. Its page shows only "404 Not Found",
and it disappears from the catalog (on a server, the preprint list). The
workflow still reads "Published", and nobody is told. The Search page
keeps listing the item, so a reader who finds it there lands on the dead
page. If the preprint is then declined, readers still get the dead page
and the search result.

This lasts until the editor presses "Return to Done", which stops the
work the return was for. The action is new in the coming 3.6, and no
release has it.

## Impact

- **Lost**: readers' access to the published book or preprint, all its
  published versions included, for as long as it stays in the workflow.
  The workflow keeps showing "Status: Published".
- **Who**: every reader of a press or preprint server, for each item an
  editor returns after publication. "Return to Workflow" is offered on
  every published item. In 3.6 it is how work continues on a published
  submission (`pkp/pkp-lib#12799`: post-publication review, or more
  editing or production before a new version). A press or server that
  publishes an item once and is done with it rarely uses it.
- **Way round**: none for readers. "Return to Done" brings the item back
  for readers, but it takes the submission out of the active workflow,
  so its review or production work has to stop.

High: in a press or server that keeps working on items after publishing
them, reading a published book or preprint fails for every reader, with
no way round and no warning. It would be medium if editors seldom
returned published items to the workflow.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OMP or OPS, context
  `publicknowledge`.
- OMP: book 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots" (published). OPS: preprint 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning" (posted).
- A second browser window that is never signed in (the visitor).

Steps:

1. As the visitor, open "Search", type "LEGO" (OPS: "Sodium") and press
   "Search". The book is listed. Press its title: the book's page
   opens. Open the catalog (`/index.php/publicknowledge/catalog`; OPS:
   the preprint list, `/index.php/publicknowledge/preprints`): the book
   is listed.
2. Sign in as `dbarnes`. On the dashboard, open the "Published" list and
   open submission 14 (OPS: 12). The address
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`
   opens it directly. The header reads "Published" and offers "Return to
   Workflow".
3. Press "Return to Workflow", then "Confirm". The stage reads
   "Production" and the header offers "Return to Done". Publication ›
   "Title & Abstract" still reads "Status: Published" with "Unpublish".
4. As the visitor, reload the book's page, open the catalog, and search
   for "LEGO" again.
5. OPS only: in the workflow press "Production", then "Decline
   Submission" and "Record Decision". The stage reads "Declined". As
   the visitor, repeat step 4.
6. As `dbarnes`, open the book's page.

**Expected**: the book or preprint stays public while its version is
published. Its page opens, the catalog lists it, and Search lists it.

**Observed**: from step 4 on, the visitor's book page answers status 404,
and the page reads only:

```
404 Not Found
```

The catalog (OPS: the preprint list) no longer lists the item. The
Search page still does ("One title was found which matched your search
for "LEGO"."), and the title links to the 404 page. Step 5 leaves the
preprint the same for the visitor. In step 6, `dbarnes` gets the full
page.

Control: on OJS, article 17, "Antimicrobial, heavy metal resistance and
plasmid profile of coliforms isolated from nosocomial infections in a
hospital in Isfahan, Iran", taken through steps 1 to 4 with the word
"Antimicrobial", keeps its page, its entry in the current issue's table
of contents (Vol. 1 No. 2 (2014)) and its search result.

## Cause

Since `pkp/pkp-lib#12799`, a submission's status names the workflow
queue it sits in, and no longer says whether it is published.
`ReturnToWorkflow::getNewStatus()` (`lib/pkp/classes/decision/types/ReturnToWorkflow.php`,
line 67) returns `PKPSubmission::STATUS_QUEUED`, and
`DecisionType::runAdditionalActions()` (line 204) writes it to the
submission. The dashboard's active queues all select `STATUS_QUEUED`,
which is why the decision sets it. The published version keeps
`PKPPublication::STATUS_PUBLISHED`. `Decline::getNewStatus()` writes
`STATUS_DECLINED` the same way, and `Repository::getStatusByPublications()`
keeps a declined submission declined whatever its publications are.

The press's and the server's public pages decide what a visitor may see
from `submissions.status === STATUS_PUBLISHED`:

- `CatalogBookHandler::book()` (omp `pages/catalog/CatalogBookHandler.php`,
  lines 96–104) throws `NotFoundHttpException` for a visitor when the
  submission's status is not published. This runs before the method
  picks a version, so every version's address fails. The method checks
  the requested publication's own status later (line 122).
- `PreprintHandler::initialize()` (ops `pages/preprint/PreprintHandler.php`,
  line 102) does the same for the preprint page and its galleys, and so
  does `userCanViewGalley()` (line 461).
- The press's catalog and series pages, the server's home page, preprint
  list and section pages, and both apps' sitemaps select items with
  `filterByStatus([Submission::STATUS_PUBLISHED])`.

The Search page goes by the publication's status instead (`DatabaseEngine`,
`lib/pkp/classes/search/engines/DatabaseEngine.php` line 122;
`SubmissionSearchResult::newCollection()`, line 112). So do OJS's
`ArticleHandler` (line 153) and OMP's own `CatalogBookHandler::download()`
(line 427).

The same commit also made `getStatusByPublications()` count only a
published Version of Record. This is a second trigger that needs no
"Return to Workflow": an OMP book whose only published version is
another stage (an Author Original, say) stays queued, and its page is a
404 for visitors. This was read in the code, not walked.

Reach (every other reader of `submissions.status` as "published"):

- Covered by the fix, walked: the OMP book page and catalog, the OPS
  preprint page and preprint list.
- Covered by the fix, tried: OMP OAI-PMH (`classes/oai/omp/OAIDAO.php`,
  line 227). A returned book drops out of the records with no deleted
  record in its place.
- Covered by the fix, in the code:
  - OMP series pages and both sitemaps; the OPS home page, section
    pages and galleys.
  - OMP's "Catalog" management list (`ManageCatalogHandler::index()`,
    line 124), which drops the book for editors too.
  - OPS DOI export and registration (`PubObjectsExportPlugin` line 720,
    `DOIPubIdExportPlugin` line 136) and bulk identifier assignment
    (`PubIdPlugin` line 71). These skip a returned preprint.
  - The tombstones written when a context is disabled or re-enabled:
    omp `PublicationFormatTombstoneManager` lines 110 and 143, ops
    `PreprintTombstoneManager` lines 75 and 93, ojs
    `ArticleTombstoneManager` lines 333 and 351.
  - On a journal, `Repository::getInSections()` (ojs
    `classes/submission/Repository.php` line 35). It feeds the editor's
    issue "Table of Contents" grid and the PubMed export, which lose a
    returned article. The public table of contents does not.
  - `plugins/generic/webFeed` (`pkp/webFeed`, `WebFeedGatewayPlugin.php`
    line 82, in all three apps). Feeds lose a returned item.
- Left out: OPS OAI-PMH. OPS writes its OAI deleted record from the
  submission's status (`Repository::updateStatus()`, ops
  `classes/submission/Repository.php` lines 87–103). So "Return to
  Workflow" tells harvesters the preprint was deleted. Changing only
  the OAI query (`OAIDAO.php` line 237) lists the preprint twice, once
  live and once deleted. See "What goes with it".
- The search engine (OMP and OPS category pages list through it too)
  and the dashboard's queues stay as they are.

## Proposed fix

The proposal: make every reader of "is this item published" go by the
publication, as OJS's article page and the shared search already do.
Then "Return to Workflow", and a decline after it, leave the published
version public, which is what `pkp/pkp-lib#12799` meant by separating
the workflow stage from the publication.

- The pages: in `CatalogBookHandler::book()` and
  `PreprintHandler::initialize()`, keep only the "no submission" 404.
  Both methods already refuse an unpublished publication to anyone who
  may not preview it. `PreprintHandler::userCanViewGalley()` reads
  `$this->publication`'s status.
- The lists and the other readers in the Reach's "covered" items: use
  `filterByCurrentPublicationStatus([PKPPublication::STATUS_PUBLISHED])`
  in place of `filterByStatus([Submission::STATUS_PUBLISHED])`, and
  `getInSections()` gets the same with `STATUS_SCHEDULED` kept. The
  Collector already offers this filter, and OJS's DOI export and issue
  code and pkp-lib's DOI and statistics endpoints use it. OMP's
  `OAIDAO` reads `pub.status` (the current publication) in place of
  `ms.status`.

The diffs are one per app:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returned-item-gone-search-still-lists/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returned-item-gone-search-still-lists/fix-ops.diff)
and [fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returned-item-gone-search-still-lists/fix-ojs.diff).
Each carries the `webFeed` line.

The page, list and OMP OAI-PMH changes were tried on `main`. After
"Return to Workflow" (and, on OPS, the decline), the visitor got the
book and preprint pages, the catalog, the preprint list and the OMP
OAI-PMH record, and Search listed both items. With the fix applied and
after reverting it, the never-published submissions (OMP 4; OPS 1 and
the declined OPS 4) stayed "404 Not Found" and unlisted, and an
untouched published item stayed public. The other changes, fix-ojs.diff
included, were not tried.

The core of the page change (omp):

```diff
-        if (
-            !$submission ||
-            ($submission->getData('status') !== PKPSubmission::STATUS_PUBLISHED && !$user) ||
-            ($submission->getData('status') !== PKPSubmission::STATUS_PUBLISHED && $user && !Repo::submission()->canPreview($user, $submission))
-        ) {
+        if (!$submission) {
             throw new NotFoundHttpException();
         }
```

**Alternatives**:

- Keep a returned submission "published" and change the dashboard
  instead. Not this: about a dozen queue filters and the parameters the
  dashboard sends to the REST API would change, and a declined
  submission with a published version would still be hidden.
- Make Search also require `submissions.status = STATUS_PUBLISHED`. Not
  this: it removes the dead link but leaves the book offline. On a
  journal it would also hide a returned article that its page and issue
  still show.

**What goes with it**:

- OPS OAI-PMH: write the deleted records when a publication is
  unpublished, not when the submission's status changes. This is how
  OJS (`ArticleTombstoneManager::reconcileTombstonesOnUnpublish()`) and
  OMP (`publication/Repository.php` lines 320 and 368) already do it.
  Then switch `OAIDAO.php` line 237. On `main` installs, delete the
  deleted records already written for preprints that are still
  published.
- Behaviour change for the team to confirm: a declined submission whose
  version is still published stays public on a press or server, as it
  already does on a journal. Unpublishing remains the way to take it
  down.
- Guard: the U15 scenario "Returned to the workflow and declined" on a
  press and a server, checking the page, the catalog and OAI-PMH as well
  as the search result, and a unit test for the OMP non-Version-of-Record
  case.

Large: about twenty call sites across the three apps and the `webFeed`
plugin, plus moving OPS's OAI deleted records to publish and unpublish,
and a ruling on declined items.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/returned-item-gone-search-still-lists/walk.js)
  takes the Steps on all three apps (OJS as the control), with the
  visitor in a second browser, on a freshly loaded dataset:
  `node bin/probe.js all shared/playwright/checks/issues/returned-item-gone-search-still-lists/walk.js`.
- Tips walked: OJS `ff004d0973` (lib/pkp `987776cd04`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`, lib/ui-library
  `280f98c5`) on `main`. On `stable-3_5_0`: OJS `c1cee76b95`, OMP
  `9c5e24246c`, OPS `38b61882d3` (lib/pkp `cf3f984335`). Datasets from
  pkp/datasets `e8dafbc` (2026-10-02), on PostgreSQL. The fault is in
  PHP checks and query filters; MySQL was not checked.
- OMP on `main`: after "Return to Workflow", Production offers "Schedule
  For Publication" and "Move To Copyediting", not "Decline Submission".
  So step 5 is OPS only.
- 3.5 walked: Production offers no "Decline Submission" for a published
  item (OMP: "Schedule For Publication", "Back To Copyediting"; OPS:
  "Post the preprint"). The book and preprint stayed public and listed
  throughout. The page gates are the same there (omp
  `CatalogBookHandler.php` lines 99–100, ops `PreprintHandler.php`
  line 101).
- 3.4 and 3.3 read in the code (omp `0aec65441f` / `8e72fc8836`, ops
  `acd8ae704b` / `c5532e2161`, pkp-lib `767353f4fe` / `ac3fa73402`).
  There is no `ReturnToWorkflow` decision type. The OPS page gate is
  there on both lines, and OMP's on 3.4; on 3.3 OMP checks only the
  publication.
- Introduced and Kind: `git blame` on `ReturnToWorkflow::getNewStatus()`
  and `git log -S RETURN_TO_WORKFLOW` both stop at d52aa4c84b (PR
  `pkp/pkp-lib#12881`, merged 2026-06-29). That commit created the
  decision, so it never kept a published item public, hence "defect".
  The page gates were right while a submission's status followed its
  publications: ops since fa646e5cf7 (`pkp/pkp-lib#5299`, 2022), while
  omp's blame stops at a 2025 reformat (29fa88508). The
  non-Version-of-Record case did work before d52aa4c84b: version stages
  have been on `main` since a2b461f6f (2025). It is the one part that
  is a regression, and it is not in the Steps because it was not walked.
- OPS OAI-PMH: with only the query changed, ListRecords returned 18
  records after "Return to Workflow" where it had returned 17 before.
  That is the live record plus the deleted record that
  `Repository::updateStatus()` had just written, which is why that line
  is left out of fix-ops.diff.
- Not walked, read in the code: the earlier-version addresses, OMP series
  pages, sitemaps, feeds, OPS galleys, DOI and identifier plugins,
  tombstone managers, the OJS editor's table of contents and PubMed
  export, and OPS OAI-PMH without the fix.
