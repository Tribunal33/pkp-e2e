# "Deposit DOIs" on a published work with no DOI reports success, and nothing is deposited

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server (main only; on 3.5 the deposit does not fail on the server, and the 3.4 code shows the same)
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS (a record without a DOI is sent instead)
  - 3.4: OJS, OPS (code; as 3.5)
  - 3.3: none (code; no DOIs page, and the agencies' export pages list only works with a DOI)
- **Introduced** [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) (`pkp/pkp-lib#7014`, 2021-06-08, Erik Hanson, ewhanson) wrote the deposit endpoint's check, which has never asked for a DOI. PR `pkp/pkp-lib#12098` for issue `pkp/pkp-lib#11590` ([c01b8adb80](https://github.com/pkp/pkp-lib/commit/c01b8adb807f6dbafbb92cee025e398afa5d2dfd), 2025-12-02, Bozana Bokan, bozana) made the deposit job refuse a work without a DOI
- **Upstream** none found (2026-10-06). `pkp/pkp-lib#13252` (open) asks whether peer-review DOIs (and, in its proposals, galley DOIs) can be deposited without article DOIs and names the same refusal in the deposit job, for those setups only
- **Tracked in** spec U45 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a15)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-06.** "Deposit All" marking a galley DOI "Submitted"
without queuing any deposit is a separate fault, now in its own report
(pkp-e2e#931, [U45 OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-OJS5-deposit-all-marks-galley-doi-submitted-unsent.md)).

## Summary

A manager ticks a published work that has no DOI on the DOIs page and
presses "Deposit DOIs". The page reports "Items successfully submitted for
deposit", but the work stays "Needs DOI", nothing reaches the registration
agency, and the background deposit fails on the server. Only the site
administrator's "Failed Jobs" page shows the failure.

The way round is to give the work a DOI first ("Assign DOIs") and deposit
again. With DataCite, pressing "Deposit DOIs" on a work whose article DOI
was cleared while its galley kept one is worse: the galley's DOI turns
"Submitted" and stays so, though nothing was sent.

It needs a registration agency (Crossref, or DataCite on a journal) and a
published work without an article or preprint DOI. Every work published
before the journal or server set its DOI prefix is in that state, as are
works whose DOI was cleared. On 3.5 the same notice shows, and the work's
record is sent to the agency with an empty DOI, which cannot register
anything; the work stays "Needs DOI".

## Impact

- **Lost.** The ticked work's deposit only: the other works ticked in
  the same batch are deposited as usual.
- **Who.** Managers catching up on a back catalogue, who may press
  "Deposit DOIs" (or the expanded view's "Deposit DOI(s)", offered for a
  work with no DOI) before "Assign DOIs".
- **Way round.** The "Needs DOI" badge stays in view as a hint. A galley
  DOI this leaves "Submitted" stays so until the work gets an article DOI
  and "Deposit DOIs" is pressed on it again.

Medium: a false success notice and a failure only the administrator sees,
with a hint on screen and an easy way round. The galley DOI left
"Submitted" for good is the silent case that would make this high, but it
needs DataCite, galley DOIs and a cleared article DOI.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS; OPS where the steps say so).
  Its journal and server have DOIs on with only "Articles" ("Preprints")
  ticked, no prefix, no registration agency and no DOI on any work, so
  every published work reads "Needs DOI".
- The install runs queued jobs on page loads (`[queues] job_runner = On`,
  as the dataset ships). A failing job is tried three times, 5 seconds
  apart, so the deposit's outcome shows after about 20 s of page loads. An
  install with a worker (`php lib/pkp/tools/jobs.php`) shows it once the
  worker has run.

No DOI at all, Crossref (OJS and OPS):

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save".
4. "Registration": "Registration Agency" "Crossref", "Depositor name"
   `Public Knowledge Project`, "Depositor email" `dbarnes@mailinator.com`,
   "Save".
5. Side menu "DOIs": submission 17, "Antimicrobial, heavy metal resistance
   and plasmid profile of coliforms isolated from nosocomial infections in
   a hospital in Isfahan, Iran" [OPS: submission 2, "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence"], reads "Needs DOI". Tick it; "Bulk Actions" › "Deposit
   DOIs" › "Deposit DOIs".
6. Reload the DOIs page every 5 s or so for about 20 s. Expand the work
   ("Show more details about …").
7. Sign in as `admin`: Administration › "Failed Jobs", "Details" on the
   row.

A galley DOI without the article DOI, DataCite (OJS), from a freshly
loaded dataset:

1. Sign in as `dbarnes`.
2. "Plugins": tick "DataCite Manager Plugin".
3. "DOIs" › "Setup": "DOI Prefix" `10.1234`, tick "Article galleys, such as
   a published PDF", "Save".
4. "Registration": "Registration Agency" "DataCite", "Username (symbol)"
   `u45ir8` (any value serves), "Save".
5. "DOIs": tick submission 17; "Bulk Actions" › "Assign DOIs" › "Assign
   DOIs". The "Article" and "PDF" rows get DOIs.
6. Expand it, "Edit", empty the "Article" DOI box, "Save".
7. Tick it; "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs".
8. Reload the DOIs page for about 20 s; expand the work.
9. As `admin`: Administration › "Failed Jobs".

**Expected.** "Deposit DOIs" refuses a work that has no article (preprint)
DOI, as "Export DOIs" already does: the request answers 400 with "One or
more invalid publication objects were included with the request.", no
success notice shows, nothing is queued, no DOI changes status and no job
fails. The page drops that message today for every refused bulk action
(the window closes and nothing is shown), a separate fault tracked as
[A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13)
([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A13-bulk-action-refusal-no-message.md)).

**Observed.** No DOI at all: step 5 shows "Items successfully submitted
for deposit" and the badge stays "Needs DOI". Step 6: still "Needs DOI";
the expanded view reads `Article Needs DOI` (`Preprint Needs DOI`), and
its Crossref box reads "The metadata for this item has not been submitted
to Crossref." with "Deposit DOI(s)". Step 7: "There's a total of 1 failed
job(s).", one row, `PKP\jobs\doi\DepositSubmission`, whose exception
reads:

```
{"message":"invalid.job.payload","code":0,"file":".../lib/pkp/jobs/doi/DepositSubmission.php","line":63,...}
```

[3.5: the same notice and "Needs DOI", but the job sends the work to
Crossref: the failed job here is the connection error for
`https://api.crossref.org/v2/deposits`, because the test installs cannot
reach Crossref. The expanded view has no status column.]

Galley DOI: step 7 shows "Items successfully submitted for deposit". The
row's badge reads "Unregistered" before and after. Step 8: the expanded
view reads `Article Needs DOI` and `PDF Submitted`, and the PDF's DOI
stayed "Submitted" on every later load. Step 9: the same failed job and
exception. [3.5: the job sends the work to DataCite: first an article
record without a DOI, then the PDF's. On the test installs the first
post fails at connecting to `mds.datacite.org`, and the PDF's DOI stays
"Submitted"; DataCite's answer to the record without a DOI was not
seen.]

A work given a DOI first ("Assign DOIs", then "Deposit DOIs") is accepted
and queued as usual.

## Cause

`PKPDoiController::depositSubmissions()` (lib/pkp
`api/v1/dois/PKPDoiController.php`, lines 528–540) accepts any work in the
context whose current publication is published. It then dispatches one
`DepositSubmission` job per work and marks every DOI that
`Repo::doi()->getDoisForSubmission()` returns as "Submitted" (line 555).
It never checks that the work has a DOI to deposit.

The rest of the deposit path requires one. Since `pkp/pkp-lib#11590`,
`DepositSubmission::handle()` (lib/pkp `jobs/doi/DepositSubmission.php`,
lines 57–63) takes only a work listed by
`Repo::publication()->getExportableDOIsSubmissionIds()`, a published
publication with a DOI (`classes/publication/DAO.php` line 522,
`whereNotNull('p.doi_id')`), and throws
`JobException::INVALID_PAYLOAD` otherwise. The same change made
`exportSubmissions()` (line 419) refuse such a work up front, but left
`depositSubmissions()` as it was. So the request answers 200 and the page
shows its success notice, the job fails three times (`BaseJob::$tries`),
and it is recorded as a failed job. Each ticked work has its own job, so
the other works in the batch are deposited as usual (code read).

What gets marked depends on the work's other DOIs, since its publication
has none. With no other DOI, nothing changes and the badge stays "Needs
DOI". A galley DOI (OJS with DataCite, the only agency that takes galleys)
is marked "Submitted" and stays so: the job stops before the agency
plugin, whose `updateDepositStatus()` would move it on, and "Deposit
All" takes only "Unregistered", "Error" and "Needs Sync". So the stuck
galley DOI here comes from "Deposit DOIs" pressed by hand on that work,
which queues a job that fails; "Deposit All" marks a galley DOI without
queuing any job, the separate fault named above.

Before `pkp/pkp-lib#11590` (3.5, 3.4) the job had no such check and handed
the work to the agency plugin (code read, not walked against a live
agency). Crossref's `ArticleCrossrefXmlFilter` writes `doi_data` with an
empty `doi` from `$publication->getDoi()`. `exportAndDeposit()` collects
the XML validation errors but does not check them, and `depositXML()`
posts the record. A Crossref record is identified by its DOI, so a record
with an empty one cannot register or change anything there; Crossref's
exact answer was not seen. DataCite's `depositSubmissions()` sends the
work itself whenever article DOIs are on, and its `depositXML()` only
`assert()`s a DOI, so it posts an article record without one ahead of
the galleys' (code read; DataCite's answer not seen). Whichever status
the plugin then writes,
`updateDepositStatus()` writes it to the DOIs of `getDoisForSubmission()`,
which for a work with no DOI at all are none, so the work stays "Needs
DOI" and no error is stored.

Reach:

- "Deposit DOI(s)" in an expanded work's agency box, offered for a work
  with no DOI (on screen), calls the same endpoint (`DoiListItem.vue`
  emits `deposit-triggered`; code read).
- Peer-review DOIs (OJS with Crossref) of a work without an article DOI
  are marked "Submitted" the same way and their deposits never run: code
  read, not walked. `pkp/pkp-lib#13252` asks whether that setup should be
  allowed at all.
- `getDoisForSubmission()` walks every version, so with "DOI
  Versioning" off a work whose current version has no DOI while an
  earlier one has keeps that DOI at "Submitted" the same way. With it on,
  any published version with a DOI makes the work depositable
  (`getExportableDOIsSubmissionIds()` then skips the current-version
  join), so the job runs. Code read, not walked.
- OMP: a press has a DOIs page for its chapter and format DOIs, but no
  registration agency plugin, so there is nothing to deposit with and no
  surface.

## Proposed fix

The rule `main` applies since `pkp/pkp-lib#11590`: a work is deposited
only when its publication has a DOI, and its galley and peer-review
DOIs go with it. Make `depositSubmissions()` apply that rule, as
`exportSubmissions()` and the job already do. Its existing check (the current version must be
published) stays, and a work must also have a DOI ready to deposit. A work
without one is then refused with the same 400 as an unpublished work,
before anything is queued or marked:

```diff
             ->getIds()
             ->toArray();
 
+        // Only a work with a published DOI can be deposited: the same rule as exportSubmissions() and DepositSubmission::handle()
+        $validIds = array_intersect(
+            $validIds,
+            Repo::publication()->getExportableDOIsSubmissionIds($context->getId(), (bool) $context->getData(Context::SETTING_DOI_VERSIONING))
+        );
+
         $invalidIds = array_diff($requestIds, $validIds);
```

The diff, against the app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/fix.diff).
The rule lives in the endpoint because the endpoint decides what to queue
and what to mark "Submitted". The job's own check stays as a second guard.

Tried on `main`: with the fix in, both paths of the Steps showed the
Expected on OJS and OPS (400 with the message, no notice, no job, the PDF's
DOI still "Unregistered"). A work given a DOI first was still accepted,
marked "Submitted" and queued, with the fix in and out.

**What the manager sees after the fix.** Nothing: the window closes, the
list reloads, and no message says the deposit was refused, because the
DOIs page drops the reason of every refused bulk action (tracked apart as
U45 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13),
[its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A13-bulk-action-refusal-no-message.md)). That trades a false success for silence. We recommend
shipping this fix together with the fix that shows those messages, or
after it.

**Alternatives:**

- Deposit the works that have a DOI and report the others in the "DOI
  Updates Failed" window, as "Mark DOIs Registered" does
  (`failedDoiActions`). It suits a manager who ticked many rows, but it
  needs a new `DoiException` reason and a ui-library change, since the
  deposit's error handler does not read `failedDoiActions`. That is a
  product choice, best made together with the missing messages above.
- Leave the endpoint and drop the job's check: that puts back the 3.5
  behaviour, a record without a DOI sent to the agency.
- Hide "Deposit DOI(s)" for a work with no DOI: it covers one of the two
  entry points, and leaves the REST API open.

**What goes with it:**

- Batches: with the fix, one ticked work without a DOI makes the whole
  "Deposit DOIs" request fail, and the works with DOIs ticked beside it are
  not deposited either. Today they are. "Export DOIs" and an unpublished
  work in a deposit batch already behave this way.
- Galley-only and peer-review-only setups: a DataCite journal with
  "Article galleys" ticked and "Articles" unticked, or a Crossref journal
  with peer-review DOIs on and article DOIs off, has no article DOIs, so
  the fix refuses every deposit it asks for at the endpoint. On `main`
  the job already refuses each of them today (the deposit fails as in the
  Steps); on 3.5 such a journal deposits its galley DOIs. Whether galley
  or peer-review DOIs may be deposited without an article DOI is the
  question `pkp/pkp-lib#13252` raises; if the answer is yes, the job's
  check and this one change together.
- Stored data: galley or older-version DOIs already stuck at "Submitted"
  this way cannot be told apart from deposits still queued, so no
  migration is proposed.
- Test: a unit test on `depositSubmissions()` in lib/pkp, or the e2e
  scenario in the pkp-e2e U45 spec, ticking a published work without a DOI
  and asserting the 400 and that no job is queued.
- Backport: on 3.5 and 3.4, `getExportableDOIsSubmissionIds()` does not
  exist (it came with `pkp/pkp-lib#12098`), so the backport needs that DAO
  method or a check on the current publication's `doiId`. The endpoint's
  published check there uses `filterByStatus()`, so the hunk applies by
  hand.

Small: a few lines in one lib/pkp controller method, with a unit test and
no data repair.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js`
  (Crossref, no DOI at all; `WALK=galley` for the DataCite galley path on
  OJS; `NEIGHBOUR=1` gives the work a DOI before depositing;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Where the walk differs from the Steps: it reloads at least five
  times and until the `jobs` table holds no deposit, instead of for a
  fixed 20 s, and it reads the failed job's exception from the
  `failed_jobs` row that "Failed Jobs" › "Details" shows (read only).
- The fix, tried 2026-10-01 and again 2026-10-06 on the `main` tips
  below: walk.js's three paths (no DOI, `WALK=galley`, `NEIGHBOUR=1`)
  with `fix.diff` applied to OJS and OPS, and `NEIGHBOUR=1` also without
  it.
- Walked 2026-10-06 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [5a53d3d](https://github.com/pkp/datasets/commit/5a53d3dc4d85eacde1a042c5a0e40446f357cb09)
  (2026-10-05), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, with no
  upgrade needed.
  - main: OJS [1f4cef786f](https://github.com/pkp/ojs/commit/1f4cef786fd89237bbfc559a00507a013edcfd4d)
    (lib/pkp [a7f5e3081b](https://github.com/pkp/pkp-lib/commit/a7f5e3081bced9ddf0717c752b111396c5117da1),
    crossref-ojs b7b3e73), OPS
    [21e41026b2](https://github.com/pkp/ops/commit/21e41026b254b52a59c81923f9e5d082fc29409a)
    (lib/pkp a7f5e3081b, crossref-ops b6b94dd): as Observed, both paths.
  - stable-3_5_0: OJS [4342473090](https://github.com/pkp/ojs/commit/4342473090c91b1be9066dfebb2ea6b6452c4a06)
    (lib/pkp 771474347e, crossref-ojs 97a9311), OPS
    [38b61882d3](https://github.com/pkp/ops/commit/38b61882d3a2396f08e56e2c622ff654fbe48c44)
    (lib/pkp cf3f984335, crossref-ops 20f5409): as the brackets say. On
    the galley path the PDF's DOI stays "Submitted" there too, but only
    because the deposit could not reach DataCite (the failed job is the
    connection error to `mds.datacite.org`). The code:
    `depositSubmissions()` checks
    `filterByStatus([Submission::STATUS_PUBLISHED])` only (line 459);
    `DepositSubmission::handle()` refuses only a missing submission or
    agency, then calls the agency's `depositSubmissions()`; Crossref's
    `exportAndDeposit()` ignores `$exportErrors` and calls
    `depositXML()`, whose status writes go through
    `updateDepositStatus()`; DataCite's `depositSubmissions()` adds the
    work itself when article DOIs are on, and its `depositXML()` only
    `assert()`s a DOI.
  - OMP: no registration agency plugin, so no surface.
- Code reads, not walked:
  - 3.4: lib/pkp `origin/stable-3_4_0`
    [767353f4fe](https://github.com/pkp/pkp-lib/commit/767353f4fee3078decec6eb95d7de1a0fc58d67c)
    (OJS `upstream/stable-3_4_0`
    [d68934d0d1](https://github.com/pkp/ojs/commit/d68934d0d1f8542c4856351f7a11bbc8b3d860d0),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)):
    `PKPDoiHandler::depositSubmissions()` checks only the published status
    (line 439), dispatches `DepositSubmission` and marks the DOIs
    "Submitted" (lines 455–459), and the job refuses only a missing
    submission or agency, as on 3.5.
  - 3.3: OJS `upstream/stable-3_3_0`
    [ac77c9fb35](https://github.com/pkp/ojs/commit/ac77c9fb350552c0cdaeb9d65f991d923815d91b),
    lib/pkp ac3fa73402: no DOIs page and no `api/v1/dois`; the export
    pages' list (`PubIdExportSubmissionsListGridHandler`) requires the
    `pub-id::doi` setting. OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    has no DOIs page either.
- Introduced, traced from the check's lines (528–533) back through two
  reshapings of the same published-only check to 75f5c71339, which wrote
  it in `PKPDoiHandler::depositSubmissions()`.
- Upstream search, 2026-10-01 and again 2026-10-06: pkp/pkp-lib, pkp/ojs
  and pkp/ui-library, by the symptom (deposit without a DOI, "Needs
  DOI", "submitted for deposit") and by `invalid.job.payload`,
  `DepositSubmission`, `depositSubmissions` and `11590`.
  `pkp/pkp-lib#7524` (closed) led to the "Needs DOI" filter; it is not
  this fault.
- Unverified: Crossref's and DataCite's answers to the 3.5 record with
  an empty DOI; the batch behaviour, today and with the fix (code read).
