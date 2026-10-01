# "Deposit DOIs" on a published work with no DOI reports success, and nothing is deposited

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server (main only; 3.5 does not crash, nor 3.4 by code)
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS (a record without a DOI is sent instead)
  - 3.4: OJS, OPS (code; as 3.5)
  - 3.3: none (code; no DOIs page, and the agencies' export pages list only works with a DOI)
- **Introduced** [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) (`pkp/pkp-lib#7014`, 2021-06-08, Erik Hanson, ewhanson) wrote the deposit endpoint's check, which has never asked for a DOI. `pkp/pkp-lib#12098` for `pkp/pkp-lib#11590` ([c01b8adb80](https://github.com/pkp/pkp-lib/commit/c01b8adb807f6dbafbb92cee025e398afa5d2dfd), 2025-12-02, Bozana Bokan, bozana) made the deposit job refuse a work without a DOI, so on `main` the deposit now fails on the server
- **Upstream** none found (2026-10-01). `pkp/pkp-lib#13252` (open) asks whether peer-review DOIs can be used without article DOIs and names the same refusal in the deposit job, for that setup only
- **Tracked in** spec U45 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a15)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager ticks a published work that has no DOI on the DOIs page and
presses "Deposit DOIs". The page reports "Items successfully submitted for
deposit", but the work stays "Needs DOI", nothing reaches the registration
agency, and the background deposit fails on the server. Only the site
administrator's "Failed Jobs" page shows the failure.

The way round is to give the work a DOI first ("Assign DOIs") and deposit
again. With DataCite, a work whose article DOI was cleared while its galley
kept one fares worse: the galley's DOI turns "Submitted" and stays so,
though nothing was sent.

It needs a registration agency (Crossref, or DataCite on a journal) and a
published work without an article or preprint DOI. Every work published
before the journal or server set its DOI prefix is in that state, as are
works whose DOI was cleared. On 3.5 the same notice shows, and the work is
sent to Crossref with an empty DOI, which cannot register anything; the
work stays "Needs DOI" and no error is recorded.

## Impact

- **Lost.** A deposit the manager believes was sent; the work waits for
  its DOI until someone notices. The other works ticked in the same batch
  are deposited as usual.
- **Who.** Managers catching up on a back catalogue, who may press
  "Deposit DOIs" (or the expanded view's "Deposit DOI(s)", offered for a
  work with no DOI) before "Assign DOIs".
- **Way round.** The "Needs DOI" badge stays in view as a hint. A galley
  DOI left "Submitted" is not sent again by "Deposit All": it needs an
  article DOI on the work and a fresh "Deposit DOIs" by hand.

Medium: a false success notice and a failure only the administrator sees,
with a hint on screen and an easy way round. On 3.5 the record sent has no
DOI, so nothing wrong can be registered at the agency. The galley DOI left
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
[A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13).

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
row's badge shows the article's DOI status, which reads "Unregistered"
when the article has no DOI and the galley has one. Step 8: the expanded
view reads `Article Needs DOI` and `PDF Submitted`, and the PDF's DOI
stayed "Submitted" on every later load. Step 9: the same failed job and
exception. [3.5: the job sends the galley's DOI to DataCite, as it should
for a galley that has one; this path shows no fault there.]

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
is marked "Submitted" and never moves again: only the agency plugin's
`updateDepositStatus()` changes it, the job stops before the plugin, and
"Deposit All" takes only "Unregistered", "Error" and "Needs Sync".

Before `pkp/pkp-lib#11590` (3.5, 3.4) the job had no such check and handed
the work to the agency plugin (code read, not walked against a live
agency). Crossref's `ArticleCrossrefXmlFilter` writes `doi_data` with an
empty `doi` from `$publication->getDoi()`. `exportAndDeposit()` collects
the XML validation errors but does not check them, and `depositXML()`
posts the record. A Crossref record is identified by its DOI, so a record
with an empty one cannot register or change anything there; Crossref's
exact answer was not seen. Whichever status the plugin then writes,
`updateDepositStatus()` writes it to the DOIs of `getDoisForSubmission()`,
which are none, so the work stays "Needs DOI" and no error is stored.

Reach:

- "Deposit DOI(s)" in an expanded work's agency box, offered for a work
  with no DOI (on screen), calls the same endpoint (`DoiListItem.vue`
  emits `deposit-triggered`; code read).
- Peer-review DOIs (OJS with Crossref) of a work without an article DOI
  are marked "Submitted" the same way and their deposits never run: code
  read, not walked. `pkp/pkp-lib#13252` asks whether that setup should be
  allowed at all.
- `getDoisForSubmission()` walks every version, so a work whose current
  version has no DOI while an earlier one has keeps that DOI at
  "Submitted" the same way: code read, not walked.
- "Deposit All" (OJS `classes/doi/DAO.php`
  `getAllDepositableSubmissionIds()`) marks a published galley's DOI
  "Submitted" even when its work has no article DOI, and dispatches no job
  for it, because the galley's row joins no publication. That is the same
  stuck "Submitted" reached through "Deposit All" instead of "Deposit
  DOIs", for OJS with DataCite: code read, not walked, not covered by this
  fix.
- A press has no registration agency plugin, so OMP has no surface.

## Proposed fix

Make `depositSubmissions()` apply the rule that `exportSubmissions()` and
the job already apply. Its existing check (the current version must be
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
`pkp/pkp-lib#11590` replaced export's published check with the DOI check;
here both are kept, so deposit still refuses a work whose current version
is unpublished, as it does today.

Tried on `main`: with the fix in, both paths of the Steps showed the
Expected on OJS and OPS (400 with the message, no notice, no job, the PDF's
DOI still "Unregistered"). A work given a DOI first was still accepted,
marked "Submitted" and queued, with the fix in and out.

**What the manager sees after the fix.** Nothing: the window closes, the
list reloads, and no message says the deposit was refused, because the
DOIs page drops the reason of every refused bulk action (tracked apart as
U45 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13),
a separate report). That trades a false success for silence. We recommend
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
- Peer-review-only setup: with peer-review DOIs on and article DOIs off
  (the setup `pkp/pkp-lib#13252` asks about), every deposit is refused at
  the endpoint, where today it is accepted and its job fails. That is a
  behaviour change, and the outcome of #13252 must agree with it.
- Stored data: galley or older-version DOIs already stuck at "Submitted"
  this way cannot be told apart from deposits still queued, so no
  migration is proposed.
- "Deposit All"'s galley case (Cause, Reach) needs its own change in
  `getAllDepositableSubmissionIds()`: mark only DOIs whose work gets a
  job. That change is advised but was not tried.
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
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Where the walk differs
  from the Steps: it reloads until the `jobs` table holds no deposit,
  instead of for a fixed 20 s, and it reads the failed job's exception
  from the `failed_jobs` row that "Failed Jobs" › "Details" shows (read
  only).
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply …/fix.diff ojs ops`, then walk.js on its
  three paths (no DOI; `WALK=galley` on OJS; `NEIGHBOUR=1`), then
  `node bin/try-fix.js revert …/fix.diff ojs ops`. `NEIGHBOUR=1` was also
  walked without the fix.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, with no
  upgrade needed.
  - main: OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    (lib/pkp [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12),
    crossref-ojs 46a4d46), OPS
    [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2)
    (lib/pkp [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8),
    crossref-ops b6b94dd): as Observed, both paths.
  - stable-3_5_0: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    (crossref-ojs 97a9311), OPS
    [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994)
    (crossref-ops 20f5409), lib/pkp a9c76aed62: as the brackets say. The
    code: `depositSubmissions()` checks `filterByStatus([Submission::STATUS_PUBLISHED])`
    only (line 459); `DepositSubmission::handle()` refuses only a missing
    submission or agency, then calls the agency's `depositSubmissions()`;
    Crossref's `exportAndDeposit()` (OJS line 201, OPS the same) ignores
    `$exportErrors` and calls `depositXML()`, whose status writes go
    through `updateDepositStatus()` (OJS line 403).
  - OMP: no registration agency plugin, so no surface.
- Code reads, not walked:
  - 3.4: lib/pkp `origin/stable-3_4_0`
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d) (OJS
    `upstream/stable-3_4_0`
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)):
    `PKPDoiHandler::depositSubmissions()` checks only the published status
    (line 439), dispatches `DepositSubmission` and marks the DOIs
    "Submitted" (lines 455–459), and the job refuses only a missing
    submission or agency, as on 3.5.
  - 3.3: OJS `upstream/stable-3_3_0`
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    lib/pkp d446601ebe: no DOIs page and no `api/v1/dois`; the export
    pages' list (`PubIdExportSubmissionsListGridHandler`) requires the
    `pub-id::doi` setting. OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    has no DOIs page either.
- Introduced, traced from the check's lines (528–533) back through two
  reshapings of the same published-only check to 75f5c71339, which wrote
  it in `PKPDoiHandler::depositSubmissions()`. c01b8adb80 added the job's
  and export's DOI check and did not touch `depositSubmissions()`.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom (deposit without a DOI, "Needs DOI", "submitted for
  deposit") and by `invalid.job.payload`, `DepositSubmission`,
  `depositSubmissions` and `11590`. `pkp/pkp-lib#7524` (closed) is about
  "Deposit All" skipping works without a DOI, which led to the "Needs DOI"
  filter; it is not this fault.
- Unverified: Crossref's answer to the 3.5 record with an empty DOI; the
  batch behaviour, today and with the fix (code read).
