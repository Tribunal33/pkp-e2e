# "Deposit DOIs" on a published work with no DOI reports success, and nothing is deposited

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server (main only: the queued deposit fails; on 3.5 and 3.4 it is not refused, and fails only where the install cannot reach the agency)
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS (a record without a DOI is sent instead)
  - 3.4: OJS, OPS (code; as 3.5)
  - 3.3: none (code; no DOIs page, and the agencies' export pages list only works with a DOI)
- **Introduced** [75f5c71339](https://github.com/pkp/pkp-lib/commit/75f5c713391f663bef74c309242ff38d40e10c74) (`pkp/pkp-lib#7014`, 2021-06-08, Erik Hanson, ewhanson) wrote the deposit endpoint's check, which has never asked for a DOI. PR `pkp/pkp-lib#12098` for issue `pkp/pkp-lib#11590` ([c01b8adb80](https://github.com/pkp/pkp-lib/commit/c01b8adb807f6dbafbb92cee025e398afa5d2dfd), 2025-12-02, Bozana Bokan, bozana) made the deposit job refuse a work without a DOI, which is why `main` fails in the job where 3.5 and 3.4 send the record
- **Upstream** none found (2026-10-12). `pkp/pkp-lib#13252` (open) asks whether peer-review DOIs can be deposited without article DOIs and names the same refusal in the deposit job, for that setup only
- **Tracked in** spec U45 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a15)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-12.** Since `pkp/pkp-lib#13460` (for
`pkp/pkp-lib#13253`, merged 2026-10-09) a work with only a galley's DOI
is a different fault, now in pkp-e2e#931
([U45 OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-OJS5-deposit-all-marks-galley-doi-submitted-unsent.md)).
This report is the work with no DOI at all.

## Summary

A manager ticks a published work that has no DOI on the DOIs page and
presses "Deposit DOIs". The page reports "Items successfully submitted for
deposit", but the work stays "Needs DOI", nothing reaches the registration
agency, and the background deposit fails on the server. Only the site
administrator's "Failed Jobs" page shows the failure.

The way round is to give the work a DOI first ("Assign DOIs") and deposit
again.

It needs a registration agency (seen with Crossref; the code is the same
for DataCite on a journal) and a published work with no DOI, its own or
a galley's: every work published before the journal or server set its
DOI prefix, until "Assign DOIs" is pressed.
"Deposit All" and the automatic deposit leave such a work alone. A press
has no registration agency to deposit with.

On 3.5 and 3.4 the same notice shows and the work's record is sent to the
agency with an empty DOI, which cannot register anything. The work stays
"Needs DOI", and the app keeps no trace of what the agency answered.

## Impact

- **Lost.** A true answer: the manager is told a deposit went out for a
  work that has nothing to deposit. Works with DOIs ticked in the same
  click are deposited as usual.
- **Who.** Managers catching up on a back catalogue, who press "Deposit
  DOIs" (or the expanded view's "Deposit DOI(s)", offered for a work
  with no DOI) before "Assign DOIs".
- **Way round.** "Assign DOIs" first. The "Needs DOI" badge stays in view
  as the hint.

Medium: the page reports a deposit that cannot have happened, and
nothing a manager sees says it failed; on 3.5 and 3.4 a record with an
empty DOI also leaves for the agency. It
is not high: nothing registered is lost or wrong, the badge still reads
"Needs DOI", and "Assign DOIs" puts it right.

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
- Network: on `main` the Steps post nothing to Crossref, since the deposit
  is refused before the post. The control below and the Steps on 3.5 do
  post, to `https://api.crossref.org/v2/deposits`, with the depositor
  fields and no credentials. To keep them off Crossref's live address,
  tick "Use the Crossref test API (testing environment) for the DOI
  deposit" in step 4, or use an install without outbound network.

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

**Expected.** "Deposit DOIs" refuses a work that has no DOI, as "Export
DOIs" already does: the request answers 400 with "One or more invalid
publication objects were included with the request.", no success notice
shows, nothing is queued, no DOI changes status and no job fails.

**Observed.** Step 5 shows "Items successfully submitted for deposit"
and the badge stays "Needs DOI". Step 6: still "Needs DOI"; the expanded
view has one row, "Article" ("Preprint") with an empty DOI box and the
status "Needs DOI", and its Crossref box reads "The metadata for this
item has not been submitted to Crossref." with "Deposit DOI(s)". Step 7:
"There's a total of 1 failed job(s).", one row,
`PKP\jobs\doi\DepositSubmission`, whose exception reads:

```
{"message":"invalid.job.payload","code":0,"file":".../lib/pkp/jobs/doi/DepositSubmission.php","line":63,...}
```

[3.5: the same notice and "Needs DOI", and the job posts the work's
record, without a DOI, to Crossref. What "Failed Jobs" then shows depends
on the install's network. Where Crossref cannot be reached (the test
installs), the job fails at the connection: one failed job, the
connection error for `https://api.crossref.org/v2/deposits`. Where it can
be reached, an error answer from Crossref (the plugin expects a 401 for a
post without valid credentials) is caught and no job fails, so "Failed
Jobs" stays empty and nothing shows (by the code, not walked). The
expanded view has no status column.]

A work given a DOI first ("Assign DOIs", then "Deposit DOIs") is accepted
and queued, and its job posts the record to Crossref. On an install that
reaches Crossref, an error answer turns that row "Error" (by the code).

## Cause

`PKPDoiController::depositSubmissions()` (lib/pkp
`api/v1/dois/PKPDoiController.php`, lines 528–540) accepts any work in the
context whose current publication is published. It then dispatches one
`DepositSubmission` job per work and marks every DOI that
`Repo::doi()->getPublishedDoisForSubmission()` returns as "Submitted"
(lines 549–555). It never checks that the work has a DOI to deposit.

The rest of the deposit path requires one. Since `pkp/pkp-lib#11590`,
`DepositSubmission::handle()` (lib/pkp `jobs/doi/DepositSubmission.php`,
lines 57–63) takes only a work listed by
`Repo::publication()->getExportableDOIsSubmissionIds()` and throws
`JobException::INVALID_PAYLOAD` otherwise. The list holds a work with a
published publication that has a DOI. `whereHasDoi()` decides what
counts: the publication's own DOI in lib/pkp
(`classes/publication/DAO.php`, line 532, called at line 522), and since
`pkp/pkp-lib#13253` a galley's DOI too, in the apps' overrides (OJS
`classes/publication/DAO.php` line 163, OPS line 65).

The change that added the job's check made `exportSubmissions()`
(line 419) refuse such a work up front, but left `depositSubmissions()`
as it was. So the request answers 200 and the page shows its success
notice, the job fails three times (`BaseJob::$tries`), and it is recorded
as a failed job. A work with no DOI has nothing to mark, so its badge
stays "Needs DOI".

The job stops before it calls the agency plugin, so a DataCite journal
meets the same failure (code read; walked with Crossref). Each ticked
work has its own job, so the others ticked with it are deposited (code
read).

Before `pkp/pkp-lib#11590` (3.5, 3.4) the job had no such check and handed
the work to the agency plugin. Crossref's `ArticleCrossrefXmlFilter`
writes `doi_data` with an empty `doi` from `$publication->getDoi()`.
`exportAndDeposit()` collects the XML validation errors but does not
check them, and `depositXML()` posts the record (on 3.5 the record at
the post held no DOI: Evidence). A Crossref record is identified by its
DOI, so one with an empty DOI cannot register or change anything there.

What 3.5 and 3.4 keep of the agency's answer is nothing.
`depositXML()` catches an HTTP error answer and hands it, like a
success, to `updateDepositStatus()`, which writes to the DOIs of
`getDoisForSubmission()`. A work with no DOI has none, so no status and
no message are stored, no job fails, and the work stays "Needs DOI" (by
the code; Crossref's answer was not seen, and with valid credentials
what Crossref does with the record is its own matter).

Reach:

- "Deposit DOI(s)" in an expanded work's agency box, offered for a work
  with no DOI (on screen), calls the same endpoint (`DoiListItem.vue`
  emits `deposit-triggered`; code read).
- "Deposit All" and the scheduled automatic deposit do not reach it:
  they queue the works of the DOIs `getAllDepositableSubmissionIds()`
  lists, and a work with no DOI has none to list. On screen, "Deposit
  All" on a DataCite journal queued only the one work that had a DOI.
- Peer-review DOIs (OJS with Crossref) of a work without an article DOI
  are marked "Submitted" by the same click, and the job that would send
  them is refused, since the list counts no review's DOI. Code read, not
  walked.
- An earlier version's DOI, with "DOI Versioning" off: the endpoint marks
  the DOIs of every published version
  (`getPublishedDoisForSubmission()`), and the job refuses a work whose
  current version has no DOI. So a DOI that only an earlier version
  carries is left "Submitted" and unsent. With "DOI Versioning" on, the
  list takes a work on any published version's DOI, and the job runs.
  Code read, not walked.
- Issues (OJS): `DoiController::depositIssues()` (OJS
  `api/v1/dois/DoiController.php`, line 124 on) accepts any published
  issue the same way, and `DepositIssue::handle()` has no check either,
  so an issue without a DOI goes to the agency plugin. Code read, not
  walked; the fix below does not cover it.
- A journal work whose galley alone has a DOI is on the list, so this
  check passes it. Its deposit fails later, in the DataCite plugin:
  [a separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-OJS5-deposit-all-marks-galley-doi-submitted-unsent.md).
- OMP: a press has a DOIs page for its chapter and format DOIs, but no
  registration agency plugin, so there is nothing to deposit with and no
  surface.

## Proposed fix

The rule `main` applies since `pkp/pkp-lib#11590`, as widened by
`pkp/pkp-lib#13253`: a work is deposited only when a published version of
it has a DOI, its own or a galley's. Make `depositSubmissions()` apply
that rule by reading the list `exportSubmissions()` and the job already
read. Its existing check (the current version must be published) stays.
A work without a DOI is then refused with the same 400 as an unpublished
work, before anything is queued or marked:

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

Two details of the diff are a matter of taste. Replacing the collector
with the list, as c01b8adb80 did in `exportSubmissions()`, gives the same
set: a work's current publication is its most mature published one
(lib/pkp `classes/submission/Repository.php`, line 1503), so every listed
work passes the published check. The diff intersects only to keep that
check in view beside the sibling endpoints. The `(bool)` cast follows
`getAllDepositableSubmissionIds()`; the list's two existing callers pass
the setting as stored, and the dataset stores it, so the cast can go.

Tried on `main`: with the fix in, the Steps showed the Expected on OJS
and OPS (400 with the message, no notice, no job). The control was
still accepted, marked "Submitted" and queued, with the fix in and out,
and so was a DataCite journal's work with only a galley's DOI, with the
fix in.

**What the manager sees after the fix.** The refusal's reason in an
"Error" window, as for every refused bulk action once `pkp/ui-library#1016`
(for `pkp/pkp-lib#13507`) is in (read in the code, not driven with this
fix). Without it the window closes, the list reloads and no message says
the deposit was refused, because the DOIs page drops the reason of every
refused bulk action (U45
[A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a13),
[pkp-e2e#234](https://github.com/jardakotesovec/pkp-e2e/issues/234)).
That would trade a false success for silence, so this fix should not
land on a branch without that one.

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
  not deposited either, as "Export DOIs" and an unpublished work in a
  deposit batch already behave.
- Peer-review DOIs without article DOIs (Crossref): such a journal has no
  DOI the list counts, so the fix refuses its deposits at the endpoint,
  where the job refuses them today. If `pkp/pkp-lib#13252` decides that
  setup may deposit, the list changes and this check follows without an
  edit.
- Stored data: review or older-version DOIs already stuck at "Submitted"
  this way cannot be told apart from deposits still queued, so no
  migration is proposed.
- Test: lib/pkp has no unit harness for an API controller (its `tests/`
  hold `classes/` and `jobs/`; `tests/jobs/doi/DepositSubmissionTest.php`
  covers the job's check). The guard is an integration case: one beside
  OJS `cypress/tests/integration/DoiCrossref.cy.js`, or the e2e scenario
  in the pkp-e2e U45 spec, ticking a published work without a DOI and
  asserting the 400 and that no job is queued.
- Backport: on 3.5 and 3.4, `getExportableDOIsSubmissionIds()` does not
  exist (it came with `pkp/pkp-lib#12098`), so the backport needs that DAO
  method or a check on the current publication's `doiId`. The diff's
  context lines do not match there (the published check uses
  `filterByStatus()`), so the check is added under it by hand. There the
  refusal also stops the record with an empty DOI being sent.

Small: a few lines in one lib/pkp controller method and one integration
case, with no data repair.

## Evidence

- Kept script, which takes the Steps through the screens:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/lib.js).
  Run it on an install loaded from the default dataset with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js`
  (`NEIGHBOUR=1` gives the work a DOI before depositing;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; its `WALK=galley…` modes
  belong to the report on DataCite galley DOIs).
- Where the walk differs from the Steps: it reloads at least five times
  and until the `jobs` table holds no deposit, instead of for a fixed
  20 s, and it reads the failed job's exception from the `failed_jobs`
  row that "Failed Jobs" › "Details" shows (read only). It also lists the
  export files a failed deposit leaves in `files_dir/temp` (read only):
  none on `main`; on 3.5 `crossrefplugin-articles-17-1.xml` (OPS:
  `crossrefplugin-preprints-2-1.xml`), three times, its XML without a DOI.
- The fix, tried 2026-10-12 on the `main` tips below (and 2026-10-01,
  2026-10-06 on earlier tips): `fix.diff` applied to OJS and OPS, then
  the Steps, `NEIGHBOUR=1` with the fix in and out, and `WALK=galley`
  (OJS, DataCite, the article's DOI cleared and the PDF's kept) with the
  fix in.
- Walked 2026-10-12 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [fac2371](https://github.com/pkp/datasets/commit/fac23716137c760359271218bc335a421061f115)
  (2026-10-11), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, with no
  upgrade needed.
  - main: OJS [d0b69b108d](https://github.com/pkp/ojs/commit/d0b69b108da49a53ff8a6cc15ffe0ea7b7824950)
    (lib/pkp [1ec9023e8a](https://github.com/pkp/pkp-lib/commit/1ec9023e8a9f3d701bfab396b8b148249c374dab),
    crossref-ojs f358a32628), OPS
    [8d04ca333c](https://github.com/pkp/ops/commit/8d04ca333c6bec2d40d35f5ef8cfcd0108986444)
    (lib/pkp [58c7f454ff](https://github.com/pkp/pkp-lib/commit/58c7f454ff88baf7dc6df9cd0c9090fb97364b56),
    crossref-ops 4968397748): as Observed.
  - stable-3_5_0: OJS [c90dfdb577](https://github.com/pkp/ojs/commit/c90dfdb577e9870229206ead446f7771d8300338)
    (lib/pkp f4f8fcdbc0, crossref-ojs 97a9311), OPS
    [399c4ebca3](https://github.com/pkp/ops/commit/399c4ebca3096ce80124dc7cb7da122064b7fde5)
    (lib/pkp 8094f06bf5, crossref-ops 20f5409): as the bracket says. The
    code: `depositSubmissions()` checks
    `filterByStatus([Submission::STATUS_PUBLISHED])` only (line 459);
    `DepositSubmission::handle()` refuses only a missing submission or
    agency, then calls the agency's `depositSubmissions()`; Crossref's
    `exportAndDeposit()` ignores `$exportErrors` and calls
    `depositXML()`, whose status writes go through
    `updateDepositStatus()`.
- Code reads, not walked:
  - 3.4: lib/pkp `origin/stable-3_4_0`
    [55c8e406b3](https://github.com/pkp/pkp-lib/commit/55c8e406b33a3158bc360d5fc16b27673965b861)
    (OJS `upstream/stable-3_4_0`
    [daf0ca971d](https://github.com/pkp/ojs/commit/daf0ca971d7ac1985c2941240a444629adc2dfa4),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a)):
    `PKPDoiHandler::depositSubmissions()` checks only the published status
    (line 439), dispatches `DepositSubmission` and marks the DOIs
    "Submitted" (lines 455–459), and the job refuses only a missing
    submission or agency, as on 3.5.
  - 3.3: OJS `upstream/stable-3_3_0`
    [d7d9dd14ec](https://github.com/pkp/ojs/commit/d7d9dd14ec9d08d48b30d55c49cc97d714866b61),
    lib/pkp 5e84acd11b: no DOIs page and no `api/v1/dois`; the export
    pages' list (`PubIdExportSubmissionsListGridHandler`) is filtered on
    the plugin's pub id type. OPS
    [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09)
    has no `api/v1/dois` either.
- Introduced, traced from the check's lines (528–533) back through two
  reshapings of the same published-only check to 75f5c71339, which wrote
  it in `PKPDoiHandler::depositSubmissions()`.
- Upstream search, 2026-10-01, 2026-10-06 and again 2026-10-12:
  pkp/pkp-lib, pkp/ojs and pkp/ui-library, by the symptom (deposit
  without a DOI, "Needs DOI", "submitted for deposit") and by
  `invalid.job.payload`, `DepositSubmission`, `depositSubmissions` and
  `getExportableDOIsSubmissionIds`.
- Unverified: Crossref's answer to the 3.5 record with an empty DOI, and
  what an install that reaches Crossref then shows (code read: the 3.5
  plugin `CrossrefExportPlugin::depositXML()`, lines 301–354, and
  `updateDepositStatus()`, line 403); the batch behaviour, today and with
  the fix (code read); a DataCite journal's work with no DOI at all (code
  read: the job stops before the agency plugin); the "Reach" items marked
  code read. The walks ran with PHP's `zend.assertions = -1`.
