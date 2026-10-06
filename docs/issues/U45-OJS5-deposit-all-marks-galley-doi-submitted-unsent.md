# "Deposit All" marks a galley DOI "Submitted" without sending it when the article DOI is registered or missing

- **Severity** high
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no DOIs page and no "Deposit All")
- **Introduced** `pkp/pkp-lib#7014` · [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) · 2021-06-08 · Erik Hanson (ewhanson) wrote `depositAll()`, which marks every DOI its query lists; OJS [81664e1421](https://github.com/pkp/ojs/commit/81664e142122e18afc5333eb9602d3e1ea48b2a3) (2022-02-15, same issue and author) wrote the query, which finds the work only for an article DOI
- **Upstream** none found (2026-10-06). `pkp/pkp-lib#13253` (open) asks the query `getAllDepositableSubmissionIds()` to follow "DOI Versioning", a different fault in the code this fix changes
- **Tracked in** spec U45 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs5)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal deposits its DOIs with DataCite, galley DOIs included. A
manager presses "Deposit All" on the DOIs page and sees "Items
successfully submitted for deposit". A galley DOI reading "Unregistered",
"Error" or "Needs Sync" is marked "Submitted", but it is sent only when
the article's own DOI is sent in the same deposit. When the article DOI
is already "Registered", or the article has none, nothing is sent,
nothing records a failure, and later presses skip the galley DOI.

The galley DOI therefore never resolves, while the page shows it as on
its way.

Three kinds of journal meet it: one that turns galley DOIs on after its
articles were registered, whose first press leaves every new galley DOI
unsent; one that cleared an article's DOI and kept its galley's; and one
that assigns galley DOIs but no article DOIs, none of whose galley DOIs
is ever sent. With "Automatic Deposit" on, the scheduled deposit does
the same without anyone pressing.

## Impact

- **Lost.** Galley DOIs never registered with DataCite. On the DOIs page
  a stuck "Submitted" looks the same as a deposit in progress; only the
  site administrator's "View Jobs" page shows that no deposit is queued.
- **Who.** Managers of journals that deposit galley DOIs with DataCite,
  the only agency that takes them: on turning galley DOIs on after
  articles were registered, every such galley in one press; on a journal
  with galley DOIs and no article DOIs, every galley.
- **Way round.** Where the article has a DOI, ticking the work and
  pressing "Deposit DOIs" sends its galleys with it. A journal with no
  article DOIs has no way round on `main`, where any deposit needs an
  article DOI (code read); on 3.5, "Deposit DOIs" sends its galleys.

High: DOIs meant for the public record go unregistered, silently, in a
DOI plugin setup. There is a way round for most journals, but nothing
points to it, which puts it a level above medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal has DOIs on with
  only "Articles" ticked, no prefix, no registration agency and no DOI on
  any work.
- The install runs queued jobs on page loads (`[queues] job_runner = On`,
  as the dataset ships), so a queued deposit runs within about 20 s of
  page loads. To see what is queued right after a press, read the
  `jobs` table (`SELECT payload FROM jobs`, a `DepositSubmission` per
  queued work) or, as `admin`, Administration › "View Jobs" ("There's a
  total of … job(s) on the queue").

A galley DOI kept after the article DOI was cleared:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "DataCite Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   tick "Article galleys, such as a published PDF", "Save".
4. "Registration": "Registration Agency" "DataCite", "Username (symbol)"
   `u45ir8` (any value serves), "Save".
5. Side menu "DOIs": tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran"; "Bulk Actions" › "Assign
   DOIs" › "Assign DOIs". The "Article" and "PDF" rows get DOIs.
6. Expand it ("Show more details about …"), "Edit", empty the "Article"
   DOI box, "Save". It reads `Article Needs DOI` and `PDF Unregistered`.
7. "Deposit All" (above the list) › "Deposit all DOIs". Check the queue
   at once.
8. Reload the DOIs page every 5 s or so for about 20 s; expand the work.
9. Sign in as `admin`: Administration › "Failed Jobs".
10. Sign in as `dbarnes`: "DOIs", "Deposit All" › "Deposit all DOIs"
    once more; expand the work.

Galley DOIs turned on after the article was registered, from a freshly
loaded dataset:

1. Sign in as `dbarnes`; "Plugins": tick "DataCite Manager Plugin".
2. "DOIs" › "Setup": "DOI Prefix" `10.1234`, "Save" ("Articles" only).
3. "Registration": "DataCite", "Username (symbol)" `u45ir8`, "Save".
4. "DOIs": tick submission 17; "Bulk Actions" › "Assign DOIs".
5. Tick it; "Bulk Actions" › "Mark DOIs Registered", which stands for
   the article's earlier registration.
6. "Setup": tick "Article galleys, such as a published PDF", "Save".
7. "DOIs": tick submission 17; "Assign DOIs". Expanded, it reads
   `Article Registered` and `PDF Unregistered`.
8. "Deposit All" › "Deposit all DOIs". Check the queue at once.
9. Reload for about 20 s; expand the work. As `admin`: "Failed Jobs".

**Expected.** "Deposit All" marks a DOI "Submitted" only when it queues a
deposit that carries it. With the article DOI cleared, nothing can be
deposited for the work (on `main` a deposit needs an article DOI), so
the PDF's DOI stays "Unregistered". With galley DOIs turned on later, a
deposit of the work is queued, the PDF reads "Submitted", and once the
deposit has run it reads "Registered" (or "Error" if DataCite refuses
it).

**Observed.** Cleared article DOI: step 7 shows "Items successfully
submitted for deposit", and no `DepositSubmission` is queued. Step 8:
`Article Needs DOI` and `PDF Submitted`, on every load. Step 9:
"There's a total of 0 failed job(s).". Step 10: the same notice; nothing
is queued and nothing changes.

Turned on later: step 8 shows "Items successfully submitted for deposit",
and no `DepositSubmission` is queued. Step 9: `Article Registered` and
`PDF Submitted`, on every load, under "This item has been manually
registered with a registration agency."; "There's a total of 0 failed
job(s).".

[3.5, both paths: the same notice, nothing queued and no failed job. The
expanded view there has no status column, so the PDF's status is read
from the database: `SELECT status FROM dois WHERE doi = '<the PDF's
DOI>'` gives `2`, "Submitted" (`Doi::STATUS_SUBMITTED`).]

With step 6 of the first path left out (both DOIs "Unregistered"), a
deposit of the work is queued and both read "Submitted".

## Cause

`Repository::depositAll()` (lib/pkp `classes/doi/Repository.php`,
lines 300–316) marks every DOI that `DAO::getAllDepositableSubmissionIds()`
lists as "Submitted", but queues a `DepositSubmission` job only for a
row that carries a `submission_id`. Nothing automatic moves a DOI on
after that: the agency plugin's `updateDepositStatus()` runs only inside
a deposit, and otherwise only a manager's "Mark DOIs …" action or
"Deposit DOIs" changes it.

OJS's query (`classes/doi/DAO.php` lines 42 and 118) gets
`submission_id` only by joining `publications` on the DOI itself
(`leftJoin('publications as p', 'd.doi_id', '=', 'p.doi_id')`), so a
galley DOI's row has none. The query lists DOIs reading "Unregistered",
"Error" or "Needs Sync" (line 117). When the article's DOI is one of
them, its row queues the work and DataCite's `depositSubmissions()`
sends every galley that has a DOI along with it. When it is
"Registered" or "Submitted", or the article has no DOI, the galley DOI
is marked and nothing is queued, so no job fails, and the query, which
skips "Submitted", never lists it again.

Reach:

- The scheduled automatic deposit ("Automatic Deposit" on) runs
  `depositAll()` (lib/pkp `classes/task/DepositDois.php` dispatches
  `DepositContext`). Code read, not walked.
- A journal with "Article galleys" ticked and "Articles" unticked: every
  galley DOI is listed without a work, so each press marks them all
  "Submitted" and queues nothing. Code read, not walked.
- Peer-review DOIs (OJS `main` with Crossref; the query's peer-review
  branch came with `pkp/pkp-lib#11332`): their rows carry no
  `submission_id` either, so one whose article DOI is not listed is
  marked "Submitted" and never sent. Code read, not walked.
- The author-response branch of the query cannot be reached today: the
  type is commented out of `getValidSubmissionDoiTypes()` and no agency
  allows it.
- OPS: choosing Crossref, its only agency, unticks "Preprint galleys" (on
  screen), so its query lists only preprint DOIs, which carry their work.
  OMP: no registration agency plugin, so "Deposit All" deposits nothing.

## Proposed fix

Make "Deposit All" mark only what it queues, and queue the work that a
listed galley DOI belongs to. The diff, against OJS's root:
[fix-deposit-all.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/fix-deposit-all.diff).

1. OJS's `DAO::getAllDepositableSubmissionIds()` finds the work for a
   galley or peer-review DOI too: left joins on `publication_galleys`,
   the galley's publication and `review_assignments`, and
   `COALESCE(s.submission_id, gp.submission_id, ra.submission_id) AS submission_id`
   and `ra.review_id` as the selected columns.
2. `Repository::depositAll()` keeps only the rows the deposit job will
   carry: a work that `DepositSubmission::handle()` accepts
   (`getExportableDOIsSubmissionIds()`), and for a peer-review DOI a
   review that the job goes on to deposit
   (`getExportableDOIsPeerReviewIds()`, which also requires a completed
   review). It queues each work once, since a galley DOI shared by
   several versions (with "DOI Versioning" off, a new version's galleys
   keep the DOI) lists its work more than once. Then it marks the kept
   rows' DOIs:

   ```php
   $doiVersioning = (bool) $context->getData(Context::SETTING_DOI_VERSIONING);
   $exportableIds = array_flip(Repo::publication()->getExportableDOIsSubmissionIds($context->getId(), $doiVersioning));
   $exportablePeerReviewIds = array_flip(Repo::reviewAssignment()->getExportableDOIsPeerReviewIds($context->getId(), $doiVersioning));
   $submissionsCollection = $this->dao->getAllDepositableSubmissionIds($context)
       ->filter(fn ($item) => $item->submission_id !== null
           && isset($exportableIds[$item->submission_id])
           && (empty($item->review_id) || isset($exportablePeerReviewIds[$item->review_id])));
   foreach ($submissionsCollection->pluck('submission_id')->unique() as $submissionId) {
       dispatch(new DepositSubmission($submissionId, $context, $agency));
   }
   Repo::doi()->markSubmitted($submissionsCollection->pluck('doi_id')->all());
   ```

The filters are the job's own checks, so a work or review the job would
not deposit is neither queued nor marked. The method still marks only
the DOIs its query listed, as today. If the agency answers the work's
deposit with an error, the job sends no review, and Crossref's
`updateDepositStatus()` writes "Error" to the work's DOIs, its completed
reviews' included (`getDoisForSubmission()`), so none is left
"Submitted" (code read).

Tried on `main` (OJS): with the fix in, both paths showed the Expected.
With the article DOI cleared, nothing was queued and the PDF's DOI stayed
"Unregistered", on a second press too. With galley DOIs turned on later,
a deposit of the work was queued and the PDF read "Submitted", the
article still "Registered"; the deposit then failed only at connecting
to DataCite. The control was queued and marked the same with the fix in
and out.

**Alternatives:**

- In `depositAll()` alone, mark only the rows that carry a
  `submission_id` (one line). The galley DOI then stays "Unregistered",
  which is honest, but "Deposit All" would still never send a galley DOI
  added after its article was registered.
- Mark the DOIs of each queued work through `getDoisForSubmission()`, as
  `depositSubmissions()` does. It also marks DOIs that are already
  "Registered", and still needs the query to find the galley's work.

**What goes with it:**

- A work queued for its galley DOI alone is deposited whole, the article
  record included. If DataCite then answers with an error, the article's
  DOI, "Registered" by hand or by an earlier deposit, turns "Error" too
  (`DataciteExportPlugin::depositXML()` writes it per object; code read),
  as "Deposit DOIs" does today.
- Journals with galley or peer-review DOIs and no article DOIs: with the
  fix, "Deposit All" queues and marks nothing for them, where today it
  marks their DOIs "Submitted"; on `main` they still cannot deposit at
  all. Whether such setups should deposit is the open question in
  `pkp/pkp-lib#13252`; if the answer is yes, the job's checks and these
  filters change together.
- `pkp/pkp-lib#13253` asks the same query to follow "DOI Versioning"; the
  fix keeps its current-version rule, so the two changes touch the same
  lines.
- Stored data: the fix does not release galley DOIs already stuck at
  "Submitted", since "Deposit All" skips that status and a stuck one
  cannot be told from a deposit in progress. No migration is proposed;
  the release note should ask DataCite journals with galley DOIs to press
  "Deposit DOIs" on works whose galley DOIs have stayed "Submitted".
- Test: a unit test on `depositAll()` in lib/pkp with an OJS fixture (a
  galley DOI of a work without an article DOI is not marked; one whose
  article DOI is registered queues its work), or the e2e scenario in the
  pkp-e2e U45 spec.
- Backport: on 3.5 and 3.4, `getExportableDOIsSubmissionIds()` does not
  exist and the job takes any work, so the filter there must check the
  current publication's `doiId`. Without it, the query hunk would queue
  the work of a galley DOI whose article has no DOI, and DataCite's
  `depositXML()`, which only `assert()`s a DOI there, would post an
  article record without one. The peer-review filter is `main` only;
  OJS's query takes its hunk as written.

Medium: two methods in two repositories (lib/pkp and OJS), each a few
lines in the code's own patterns, with unit tests, no data repair, and a
release note.

## Evidence

- Kept script, shared with
  [U45-A15-deposit-without-doi-reports-success.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A15-deposit-without-doi-reports-success.md):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/lib.js),
  run on an install loaded from the default dataset with
  `WALK=galleyall PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js`
  for the cleared-article path, `WALK=galleylater` for the turned-on-later
  path, `NEIGHBOUR=1 WALK=galleyall` for the control, and
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. It reads the queue and
  each DOI's stored status from the `jobs` and `dois` tables (read only)
  instead of "View Jobs", and reloads at least five times and until no
  deposit is queued.
- The fix was tried on the `main` tips below with both paths and the
  control, the control also without it.
- Walked 2026-10-06 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [5a53d3d](https://github.com/pkp/datasets/commit/5a53d3dc4d85eacde1a042c5a0e40446f357cb09)
  (2026-10-05), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, with no
  upgrade needed.
  - main: OJS [1f4cef786f](https://github.com/pkp/ojs/commit/1f4cef786fd89237bbfc559a00507a013edcfd4d)
    (lib/pkp [a7f5e3081b](https://github.com/pkp/pkp-lib/commit/a7f5e3081bced9ddf0717c752b111396c5117da1)):
    as Observed, both paths.
  - stable-3_5_0: OJS [4342473090](https://github.com/pkp/ojs/commit/4342473090c91b1be9066dfebb2ea6b6452c4a06)
    (lib/pkp 771474347e): as the bracket says. The code: `depositAll()`
    (lib/pkp `classes/doi/Repository.php` line 287 on) and OJS's query
    (`classes/doi/DAO.php` lines 42 and 71) as on `main`, without the
    peer-review branch.
- Code reads, not walked: 3.4, lib/pkp `origin/stable-3_4_0`
  [767353f4fe](https://github.com/pkp/pkp-lib/commit/767353f4fee3078decec6eb95d7de1a0fc58d67c)
  `depositAll()` (line 294 on) and OJS `upstream/stable-3_4_0`
  [d68934d0d1](https://github.com/pkp/ojs/commit/d68934d0d1f8542c4856351f7a11bbc8b3d860d0)
  `getAllDepositableSubmissionIds()` (lines 42 and 71), as on 3.5. 3.3,
  OJS `upstream/stable-3_3_0`
  [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b)
  (lib/pkp ac3fa73402): no DOIs page, no `api/v1/dois` and no
  `depositAll()`; deposits go through the agencies' export pages.
- Introduced: `git blame` on `depositAll()`'s reduce and marking and on
  the query's join and select; no PR found for either commit.
- Unverified: DataCite's answer to the queued deposit (the test installs
  cannot reach DataCite; the connection failure is not one
  `depositXML()` catches, so the statuses stayed as they were); the
  journal with no article DOIs and the peer-review DOIs (code read).
