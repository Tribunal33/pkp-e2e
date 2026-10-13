# With "Author Response" DOIs turned on, every DOI assignment gives each author response a new DOI

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (code; no review DOIs)
  - 3.4: none (code; no review DOIs)
  - 3.3: none (code; no review DOIs)
- **Introduced** `pkp/ojs#5297` for `pkp/pkp-lib#11332` · [30e82d3876](https://github.com/pkp/ojs/commit/30e82d3876ae9d2fe6625f0334ca961a21e4cca4) · 2026-01-27 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U45 [OJS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs9)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Items with DOIs" offers no box for author responses, but a journal's
settings accept the kind when sent through the API. Once it is on, each
time an article's DOIs are assigned ("Assign DOIs", or the automatic
assignment), every author response on its review rounds gets a fresh
DOI, even one that already has a DOI, and the earlier DOI is left
pointing at nothing. No screen turns the kind on, so no journal meets
this through the app's own controls.

The DOIs page shows the response's new DOI after each "Assign DOIs",
with nothing to say that the earlier one was dropped. The dropped DOIs
were never sent to Crossref or DataCite, whose deposits carry no author
responses.

## Impact

- **Lost**: an author response's DOI changes at every assignment, and
  each replaced DOI stays stored with no item behind it, one more per
  assignment.
- **Who**: a journal that added author responses to its DOI kinds
  through the journal settings API, or through a plugin that adds the box
  to "Items with DOIs". The code marks the kind "not currently
  supported".
- **Way round**: none on screen. Taking the kind out again through the
  API stops it; the responses keep the DOI they hold.

Low: only a journal that set the kind outside the screens meets it. The
fix is needed before the kind is offered, since every assignment would
then change a response's DOI, one marked "Registered" included.

## Steps to reproduce

Latent: no screen reaches it, since "Items with DOIs" has no "Author
Response" box. A developer sees it by adding the kind with the request
the "Setup" tab sends, as below.

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded (journal
  `publicknowledge`, id 1). Its DOI settings: DOIs on, "Articles" ticked,
  no prefix, "Automatic DOI Assignment" "Upon reaching the copyediting
  stage".
- Submission 10, "Condensing Water Availability Models to Focus on
  Specific Water Management Systems" (author `jnovak`), is in Review
  round 1 with the submitted reviews of Aisla McCrae and Adela Gallego.

Steps:

1. Sign in as `dbarnes`. Go to Settings › Distribution › "DOIs" ›
   "Setup", type `10.1234` in "DOI Prefix", tick "Peer Review" under
   "Items with DOIs" and press "Save". (Save this tab before step 2: it
   has no "Author Response" box.)
2. Open the browser console on any page of the journal and run:

   ```js
   await fetch('/index.php/publicknowledge/api/v1/contexts/1', {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Csrf-Token': pkp.currentUser.csrfToken,
       'X-Http-Method-Override': 'PUT',
     },
     body: JSON.stringify({enabledDoiTypes: ['publication', 'peerReview', 'authorResponse']}),
   }).then((r) => r.status);
   ```

   It answers `200`.
3. Open submission 10. On Aisla McCrae's row choose "More Actions" ›
   "Edit", tick "Publicly Show Reviewer Comments" under "Public
   Visibility" and press "OK".
4. On her row press "Read Review", then "Mark as Complete", and confirm
   "Mark this review as complete? This review will be made publicly
   visible alongside the article." with "Mark as Complete". This is the
   editor's confirmation a review needs before it gets a DOI.
5. In the "Author Response" table press "Request Response", and on
   "Request Author Response" press "Submit Request".
6. Sign in as `jnovak`. Open submission 10 from "My Submissions". In the
   "Author Response" card press "Submit Response", type a response, tick
   "John Novak" and press "Submit Response".
7. Sign in as `dbarnes`. Open submission 10, press "Accept Submission"
   and go through its steps to "Record Decision". The article moves to
   Copyediting, which assigns its DOIs.
8. Open "DOIs" (`/index.php/publicknowledge/en/dois`), tick submission
   10, choose "Bulk Actions" › "Assign DOIs" and confirm with "Assign
   DOIs". Expand the row.
9. Repeat step 8.

After steps 7, 8 and 9, read the response's DOI and the DOI rows that no
item points at:

```sql
select r.response_id, d.doi
  from review_round_author_responses r
  join review_rounds rr on rr.review_round_id = r.review_round_id
  left join dois d on d.doi_id = r.doi_id
 where rr.submission_id = 10;

select d.doi_id, d.doi from dois d
 where d.context_id = 1
   and d.doi_id not in (select doi_id from publications where doi_id is not null)
   and d.doi_id not in (select doi_id from publication_galleys where doi_id is not null)
   and d.doi_id not in (select doi_id from issues where doi_id is not null)
   and d.doi_id not in (select doi_id from review_assignments where doi_id is not null)
   and d.doi_id not in (select doi_id from review_round_author_responses where doi_id is not null);
```

**Expected:** the response gets a DOI at step 7 and keeps it through
steps 8 and 9, as the article and McCrae's review keep theirs. The
second query returns no rows.

**Observed:** the response gets a new DOI at step 8 and again at step 9.
Each "Assign DOIs" reads "Items successfully assigned new DOIs", and the
expanded row's "Author Response 1" line shows the new DOI. The second
query returns one row after step 8 and two after step 9: the response's
earlier DOIs. McCrae's review and the article keep the DOIs step 7 gave
them.

## Cause

`APP\publication\Repository::createDois()` in OJS
(`classes/publication/Repository.php`, the "Author response" block,
line 395 at ojs `7c6fba2064`) tests the collection instead of the loop
item:

```php
$authorResponses = $this->getReviewAuthorResponses([$publication->getId()]);
foreach ($authorResponses as $authorResponse) {
    if (empty($authorResponses->doiId)) {   // the collection, not $authorResponse
```

`getReviewAuthorResponses()` (pkp-lib `classes/publication/Repository.php`)
returns an Eloquent collection. A Laravel collection defines `__get` (for
its higher-order proxies) but no `__isset`, so `empty()` on an undefined
property of it is always true. `Repo::doi()->mintDoi()` therefore runs for
every response on every call and overwrites the response's `doiId`; the
old `dois` row is neither reused nor deleted. The rule it breaks is the
one every other block of the method keeps: an item that already holds a
DOI keeps it (the peer-review block above it tests
`$reviewAssignment->getData('doiId')`, the galley block
`$galley->getData('doiId')`).

Per step of the Steps, as walked:

| After | Response | McCrae's review | Article | DOI rows with no item |
|---|---|---|---|---|
| 7, "Accept Submission" | `10.1234/x5bym010` | `10.1234/98dsya55` | `10.1234/4j6wjh15` | none |
| 8, "Assign DOIs" | `10.1234/32nfr069` | `10.1234/98dsya55` | `10.1234/4j6wjh15` | `10.1234/x5bym010` |
| 9, "Assign DOIs" again | `10.1234/emae6v56` | `10.1234/98dsya55` | `10.1234/4j6wjh15` | `10.1234/x5bym010`, `10.1234/32nfr069` |

Reach:

- Every caller of `createDois()` re-mints, each under its own
  "Automatic DOI Assignment" choice:
  - "Assign DOIs" on the DOIs page (`PKPDoiController`), under any
    choice (walked);
  - the `AssignDOIs` listener on a decision into Copyediting or
    Production, under "Upon reaching the copyediting stage" (walked);
  - on submission, under "Immediately, when an item is created" (code);
  - on publication, under any choice but "Never" (code);
  - on a new version, under "Immediately…", or under "Upon reaching the
    copyediting stage" once the submission is past Copyediting (code);
  - on reverting a decline (`AssignDOIs::handleDecline()`, after
    `RevertInitialDecline` or `RevertDecline`), under "Immediately…"
    (code).
- Every response on every review round of the publication (code).
- The replaced DOI's status is not looked at (code). While the kind is
  on, `getDoisForPublication()` lists response DOIs, so "Mark DOIs
  Registered" and a successful Crossref deposit
  (`CrossrefExportPlugin::updateDepositStatus()`) mark a response's DOI
  "Registered", and the next assignment replaces that one too.
- No agency receives a response DOI (code): the Crossref and DataCite
  plugins' `getAllowedDoiTypes()` leave the kind out, and neither
  plugin's export has author responses. A replaced DOI has never been
  registered with an agency.
- Taking the kind out deletes nothing (code): responses keep their
  `doi_id`, and `getDoisForSubmission()` and `getDoisForPublication()`
  stop listing them, so the DOIs page actions leave them alone.
- The other blocks of the method, the readers in OJS
  `classes/doi/Repository.php`, and the OMP and OPS `createDois()` all
  test the item (code). OMP and OPS have no author response DOI kind.

## Proposed fix

Test the loop item, as the other blocks do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-doi-reminted/fix.diff)):

```diff
             foreach ($authorResponses as $authorResponse) {
-                if (empty($authorResponses->doiId)) {
+                if (empty($authorResponse->doiId)) {
```

An Eloquent model defines `__isset`, so `empty($authorResponse->doiId)`
is true only while the response has no DOI. Tried on the Steps: the
response kept the DOI step 7 gave it through steps 8 and 9, and the
second query returned no rows. With the kind left off (step 2 skipped),
the response got no DOI with the fix in or out, and the article's and
the review's DOIs were the same either way.

**Alternatives**

- Checking `$authorResponse->doi` (the model's DOI accessor) would load
  the DOI row for each response for no gain; the id is enough, as for
  reviews.

**What goes with it**

- No data repair: only a journal that set the kind through the API holds
  stranded response DOIs. They are the rows the second query lists, and
  can be deleted while "Unregistered".
- The guard: a test that runs `createDois()` twice on a publication with
  an author response and expects the same `doiId`. OJS has no
  `createDois()` test to copy (`tests/classes/publication/` holds only
  `PublicationIdentityTest`, a `PKPTestCase`). The method goes through
  the `Repo` facades, the context DAO and Eloquent `save()`, so the test
  needs a database: a `PKP\tests\DatabaseTestCase`, as OJS's
  `tests/classes/plugins/DepositableExportableTest.php` uses, rather
  than mocks of every facade.

Small: one variable name in one OJS method, and a database test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-doi-reminted/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-doi-reminted/lib.js),
  run with `node bin/probe.js ojs <walk.js>` on a fresh load of PKP's
  default test dataset for OJS `main` (pkp/datasets `384e28b`,
  2026-10-12, PostgreSQL). It takes the Steps through the screens; step 2
  is sent from the signed-in page with the session's token, taken from
  the header of step 1's "Save". The table's values are the queries'
  reads plus `review_assignments.doi_id` and `publications.doi_id`.
  `WALK_MODE=neighbour` runs the walk without step 2.
- Why latent: the kind is switched off on purpose. The "Setup" form's
  comment reads "Functionality for author response DOIs exists but is not
  currently supported", and OJS `Repository::getValidSubmissionDoiTypes()`
  (`classes/doi/Repository.php`) and the submission
  `Collector::getAllowedDoiTypes()` (`classes/submission/Collector.php`)
  comment it out. After step 2 the "Setup" tab still lists "Articles",
  "Issues", "Article galleys, such as a published PDF" and "Peer Review"
  only. Whether its next save keeps or drops the value was not checked.
- Introduced: `git blame` on line 395 gives 30e82d3876 ("pkp/pkp-lib#11332
  Add support for review-related DOIs"), the commit that added the block;
  `pkp/ojs#5297` merged it on 2026-02-12. Its pkp-lib half
  (`pkp/pkp-lib#12257`, 231d428cdd) added `getReviewAuthorResponses()`,
  which is correct.
- Code reads: ojs `main` `7c6fba2064` with lib/pkp `f4c2578c94` (the
  block and its callers, `AssignDOIs`, `assignOnItemCreation()`,
  `assignOnVersionCreation()`, the readers and type lists in
  `classes/doi/Repository.php`, `PKPDoiController`'s mark and deposit
  actions, the Crossref and DataCite plugins; a search for
  `empty()`/`isset()` on a collection's property found this line alone);
  omp `eb9381314` and ops `1bc3f78888` (`createDois()` and
  `schemas/context.json`). 3.5: pkp/ojs `stable-3_5_0` tip `5fc74d6213`
  (`git ls-remote`), whose `schemas/context.json` allows
  `publication,representation,issue` only, and lib/pkp
  `origin/stable-3_5_0` `f4f8fcdbc0`, whose tree has no
  `classes/submission/reviewRound/authorResponse/` and whose
  `classes/publication/Repository.php` has no
  `getReviewAuthorResponses()`. 3.4 (`upstream/stable-3_4_0` `daf0ca971d`,
  lib/pkp `55c8e406b3`) and 3.3 (`d7d9dd14ec`, lib/pkp `5e84acd11b`)
  have no review DOIs. Not walked on 3.5 or older: the feature is not
  there.
- MySQL not checked; nothing in the fault depends on the database.
