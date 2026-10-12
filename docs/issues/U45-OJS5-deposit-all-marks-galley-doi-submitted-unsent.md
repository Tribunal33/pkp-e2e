# DataCite deposits leave a galley DOI "Submitted" and unsent when its article has no DOI

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server (main; on 3.5 and 3.4 by the code)
- **Affects**
  - main: OJS
  - 3.5: OJS (through "Deposit DOIs"; "Deposit All" stops earlier there, at an older fault)
  - 3.4: OJS (code; as 3.5)
  - 3.3: none (code; no DOIs page and no "Deposit All")
- **Introduced** `pkp/pkp-lib#7014` · [81664e1421](https://github.com/pkp/ojs/commit/81664e142122e18afc5333eb9602d3e1ea48b2a3) · 2022-02-15 · Erik Hanson (ewhanson) wrote the DataCite plugin's list of what a deposit sends, which takes the article without asking for its DOI
- **Upstream** none found for this fault (2026-10-12). `pkp/pkp-lib#13253` (closed, fixed on `main`) covered the two other cases this report first described
- **Tracked in** spec U45 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs5)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-12.** On `main`, `pkp/pkp-lib#13460` with `pkp/ojs#5903`
(for `pkp/pkp-lib#13253`, merged 2026-10-09) fixed the "Deposit All"
fault this report first described: a galley DOI is now deposited when
its article's DOI is already "Registered" and when "Articles" is
unticked. The case left on `main`, an article with no DOI, has another
cause, and this report now describes that fault, with the "Deposit DOIs"
path that pkp-e2e#223 held before. 3.5 and 3.4 do not have that fix and
still show the first fault whole ("What goes with it").

## Summary

On a journal that deposits article and galley DOIs with DataCite, the
background deposit of a published article that has a galley DOI but no
DOI of its own fails on the server, and the galley's DOI is never sent.
A manager who presses "Deposit All", or ticks the article and presses
"Deposit DOIs", sees "Items successfully submitted for deposit" and the
galley's row turn "Submitted".

The row stays "Submitted", which reads as a deposit on its way, and
later presses of "Deposit All" skip it. Only Administration › "Failed
Jobs" lists the failure. The way round is "Assign DOIs" on the article,
then "Deposit DOIs" on it.

It takes an article whose own DOI was emptied on the DOIs page while its
galley kept one. A journal with "Articles" unticked is not hit: its
galley DOIs are deposited. The other articles the same "Deposit All"
takes are deposited too.

That is `main`. On 3.5 and 3.4 "Deposit All" also has an older and wider
fault, which `main` no longer has: it marks a galley DOI "Submitted" and
starts no deposit unless the article's own DOI goes out with it. So it also leaves galley DOIs unsent when the article's DOI is
already "Registered" (galley DOIs turned on after the articles were
registered) and when "Articles" is unticked.

## Impact

- **Lost.** That galley's DOI is not registered with DataCite, so it
  does not resolve.
- **Who.** Managers of journals that deposit article and galley DOIs
  with DataCite, the only agency that takes galley DOIs. An article gets
  into the state when a manager empties its "Article" DOI box on the
  DOIs page and leaves the galley's, or when a journal ticks "Articles"
  after its galleys got DOIs and has not pressed "Assign DOIs" on the
  older articles (the second by the code).
- **Way round.** "Assign DOIs" gives the article a DOI, and "Deposit
  DOIs" on it then carries both. The page does not lead to it: the
  expanded row reads `Article Needs DOI` beside `PDF Submitted`, and
  nothing says a deposit failed. A journal that emptied the article's
  DOI on purpose has no way round.

Medium: a galley DOI goes unregistered behind a success notice, which
keeps it above low, but only for an article left without a DOI of its
own while "Articles" is ticked, a state a journal reaches by hand, and
two buttons put it right. The level is for this fault, on every line
that has it. The older "Deposit All" fault of 3.5 and 3.4,
for which this issue was filed as high, has another cause and another
fix and is not weighed here.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Its journal has DOIs on with
  only "Articles" ticked, no prefix, no registration agency and no DOI on
  any work.
- The install runs queued jobs on page loads (`[queues] job_runner = On`,
  as the dataset ships). A failing job is tried three times, 5 seconds
  apart, so the deposit's outcome shows after about 20 s of page loads.
  To see what is queued right after a press, read the `jobs` table
  (`SELECT payload FROM jobs`, a `DepositSubmission` per queued work) or,
  as `admin`, Administration › "View Jobs".

Setting up:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "DataCite Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   tick "Article galleys, such as a published PDF", "Save".
4. "Registration": "Registration Agency" "DataCite", "Username (symbol)"
   `u45rf1` (any value serves), "Save".
5. Side menu "DOIs": tick submission 17, "Antimicrobial, heavy metal
   resistance and plasmid profile of coliforms isolated from nosocomial
   infections in a hospital in Isfahan, Iran"; "Bulk Actions" › "Assign
   DOIs" › "Assign DOIs". The "Article" and "PDF" rows get DOIs.
6. Expand it ("Show more details about …"), "Edit", empty the "Article"
   DOI box, "Save". It reads `Article Needs DOI` and `PDF Unregistered`.

"Deposit All":

7. "Deposit All" (above the list) › "Deposit all DOIs". Check the queue
   at once.
8. Reload the DOIs page every 5 s or so for about 20 s; expand the work.
9. Sign in as `admin`: Administration › "Failed Jobs", "Details" on the
   row.
10. Sign in as `dbarnes`: "DOIs", "Deposit All" › "Deposit all DOIs" once
    more; expand the work.

"Deposit DOIs", from a freshly loaded dataset, steps 1 to 6 as above:

7. Tick submission 17; "Bulk Actions" › "Deposit DOIs" › "Deposit DOIs".
8. Reload the DOIs page for about 20 s; expand the work.
9. As `admin`: Administration › "Failed Jobs".

**Expected.** The work's deposit sends the PDF's DOI to DataCite and
leaves out the article, which has none, as a deposit on a journal with
"Articles" unticked does. The PDF then reads "Registered", or "Error"
with DataCite's answer. An install that cannot reach DataCite gets as far
as the connection: the failed job is the connection error, a separate
fault
([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A18-deposit-unreachable-agency-stays-submitted.md)).

**Observed.** "Deposit All": step 7 shows "Items successfully submitted
for deposit", and one `PKP\jobs\doi\DepositSubmission` is queued. Step 8:
`Article Needs DOI` and `PDF Submitted`, on every load, above "The
metadata for this item has not been submitted to DataCite.". Step 9:
"There's a total of 1 failed job(s).", one row,
`PKP\jobs\doi\DepositSubmission`, whose exception reads:

```
{"message":"DataCite export: no DOI assigned to the object being deposited.","code":0,"file":".../plugins/generic/datacite/DataciteExportPlugin.php","line":273,...}
```

Step 10: the same notice; nothing is queued and the PDF still reads
"Submitted".

"Deposit DOIs": step 7 shows the same notice and queues one deposit;
steps 8 and 9 read the same, with the same failed job and exception.

[3.5, "Deposit All": the same notice, nothing queued and no failed job.
The expanded view there has no status column, so the PDF's status is
read from the database: `SELECT status FROM dois WHERE doi = '<the PDF's
DOI>'` gives `2`, "Submitted" (`Doi::STATUS_SUBMITTED`). "Deposit DOIs":
a deposit is queued and the PDF's DOI turns "Submitted"; the deposit
posts the article's record first, without a DOI. On the test installs
that post fails at connecting to `mds.datacite.org`.]

With step 6 left out (the article keeps its DOI), the same press queues
a deposit that gets as far as DataCite's address, and both rows read
"Submitted". On a journal with "Articles" unticked, the PDF's deposit
gets as far too.

## Cause

`DatacitePlugin::depositSubmissions()` (OJS
`plugins/generic/datacite/DatacitePlugin.php`, lines 155–166) lists what
a work's deposit sends. It adds a galley only when the galley has a DOI
(line 161), but adds the work itself whenever "Articles" is ticked
(lines 156–158), without asking whether its current publication has a
DOI.

`DataciteExportPlugin::exportAndDeposit()` (lines 159–179) posts the
listed objects in that order, the article first. For an article without
a DOI, `depositXML()` (lines 272–274) throws "DataCite export: no DOI
assigned to the object being deposited.". The exception ends the loop
before the galley, the job fails on each of its three tries
(`BaseJob::$tries`), and it is recorded as a failed job. Each work has a
job of its own, so the other works' deposits are not touched (code
read).

By then the galley's DOI is already marked. "Deposit All"
(`Repository::depositAll()`, lib/pkp `classes/doi/Repository.php`,
lines 302–318) queues the work of every DOI that
`getAllDepositableSubmissionIds()` lists and marks those DOIs
"Submitted"; since `pkp/pkp-lib#13253` the row of a galley's DOI carries
its work's id. "Deposit DOIs" (`PKPDoiController::depositSubmissions()`,
lines 549–555) queues each ticked published work and marks the DOIs of
its published versions. The job's own check,
`getExportableDOIsSubmissionIds()`, accepts a work on a galley's DOI
alone since the same change (`whereHasDoi()`, OJS
`classes/publication/DAO.php` line 163).

Nothing moves the DOI on after the failure. The plugin's
`updateDepositStatus()` runs only once DataCite has answered an object's
post, and "Deposit All" lists only DOIs reading "Unregistered", "Error"
or "Needs Sync" (OJS `classes/doi/DAO.php`, line 120).

The fault is as old as the list, which is why the Kind is defect. Until
`pkp/pkp-lib#13115` (`pkp/ojs#5719`,
[e730e7ab3d](https://github.com/pkp/ojs/commit/e730e7ab3d5eb22e13ff88106e9f98bc719807cf),
2026-07-30) the throw was an `assert()`, which PHP skips unless
assertions are turned on. The article's record was then posted without a
DOI, and on DataCite's answer (an error, or a success outside the
plugin's test mode) `updateDepositStatus()` handed the article's missing
DOI object to `Repo::doi()->edit()`, which takes a `Doi`: a type error,
before the galley (by the code; never seen). That
change moved where the job stops, not whether the galley is sent.

3.5 and 3.4 have the same list and the `assert()`:

- "Deposit DOIs" there reaches the list, since the job has no check of
  its own. With PHP assertions off (`zend.assertions = -1`, the walk's
  setting and the one `php.ini-production` ships) the article's record
  is posted without a DOI, as walked; with them on, the `assert()` stops the job
  as the throw does on `main`. What follows DataCite's answer is the
  type error above (by the code; not seen).
- "Deposit All" there does not reach the list. Its query gives a galley
  DOI's row no work id, and `depositAll()` marks every listed DOI but
  queues only a row that has one. So the galley's DOI is marked and
  nothing is queued: with the article's DOI emptied or already
  "Registered" (both walked on 3.5), or with "Articles" unticked (code
  read). That is the fault `pkp/pkp-lib#13253` fixed on `main`, with its
  own cause and fix.

Reach:

- The scheduled automatic deposit ("Automatic Deposit" on) runs
  `depositAll()` (lib/pkp `classes/task/DepositDois.php` dispatches
  `DepositContext`). Code read, not walked.
- "Deposit DOI(s)" in an expanded work's DataCite box calls the same
  endpoint as "Deposit DOIs" (`DoiListItem.vue` emits
  `deposit-triggered`). Code read.
- "Export DOIs" on the same work: `DatacitePlugin::exportSubmissions()`
  (lines 120–131) builds its list the same way, so the export is given
  an article without a DOI too. Code read; on the test installs every
  DataCite export stops earlier, at fetching the XML schema.
- "DOI Versioning" "Yes": the job accepts a work on any published
  version's DOI, but the plugin deposits the current version. A current
  version without an article DOI therefore fails the same way. Code
  read, not walked.
- OPS has no DataCite plugin and OMP no registration agency plugin, so
  neither has the surface.

## Proposed fix

List the article only when it has a DOI, as the galley loop beside it
already does. In OJS `plugins/generic/datacite/DatacitePlugin.php`, the
same change in `depositSubmissions()` and `exportSubmissions()`:

```diff
         foreach ($submissions as $submission) {
-            if (in_array(Repo::doi()::TYPE_PUBLICATION, $context->getEnabledDoiTypes())) {
+            // An article without a DOI of its own is left out, as a galley without one is: its galleys' DOIs still go
+            if (in_array(Repo::doi()::TYPE_PUBLICATION, $context->getEnabledDoiTypes()) && $submission->getCurrentPublication()->getDoi()) {
                 $items[] = $submission;
             }
```

The diff, against OJS's root:
[fix-datacite-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/fix-datacite-ojs.diff).
DataCite's XML for a galley already copes with an article that has no
DOI (`DataciteXmlFilter::createRelatedIdentifiersNode()` skips the empty
one). The exception in `depositXML()` stays as the last guard.

**An empty list.** With the change the list can be empty: the article
has no DOI and no galley is listed. That happens when galley DOIs are
unticked after the galleys got theirs (`whereHasDoi()` counts a galley's
DOI whatever is ticked), and under "DOI Versioning" "Yes" when the
current version has no DOI at all.

- A deposit then sends nothing and the job ends without failing
  (`exportAndDeposit()` returns success for no objects), where it fails
  today. The manager sees the same success notice as today.
- An export would throw "DataCite export: no objects were exported." in
  `exportAsDownload()` (line 228), which the endpoint does not catch: a
  server error. The diff therefore makes `exportSubmissions()` return an
  error for an empty list, and the endpoint answers its 400:

  ```diff
  +        if (empty($items)) {
  +            return ['temporaryFileId' => null, 'xmlErrors' => [__('api.dois.400.invalidPubObjectIncluded')]];
  +        }
  ```

Refusing such a work before it is queued belongs in `whereHasDoi()`,
which would have to ask what is ticked. That is a wider change and is
left to the team.

Tried on `main`, with the fix in:

- Both paths of the Steps showed the Expected as far as a test install
  can: the deposit was queued, its only failure was the connection to
  `mds.datacite.org`, and the object it was posting was the PDF with its
  DOI. Without the fix it was the article without one.
- The control (the article keeps its DOI) still posted the article
  first, with the fix in and out.
- The empty list (galley DOIs unticked again after step 6): "Deposit
  DOIs" showed the notice, sent nothing, marked nothing and no job
  failed, where the job fails without the fix; "Export DOIs" answered
  400.
- Not run: the `exportSubmissions()` condition with a galley in the
  list. On the test installs every DataCite export stops at fetching the
  XML schema, before the list matters.

**Alternatives:**

- Skip an object without a DOI inside `exportAndDeposit()` or
  `depositXML()` instead of throwing. It would cover an issue without a
  DOI too, but `pkp/pkp-lib#13115` put the exception there on purpose,
  and a caller that passes an object without a DOI should hear of it.
- Catch the exception per object in `exportAndDeposit()`, so that one
  object's failure does not stop the others. That changes how every
  DataCite deposit reports errors, and the article has no DOI row to
  hold the error.
- Refuse the work before it is queued (make `whereHasDoi()` ask for the
  article's DOI while "Articles" is ticked). The galley's DOI would then
  stay "Unregistered", which is honest, but it could never be deposited,
  while the same galley on a journal with "Articles" unticked can.

**What goes with it:**

- 3.5 and 3.4: this fix alone does not make "Deposit All" send a galley
  DOI there. Those branches first need the query change of
  `pkp/pkp-lib#13253` (lib/pkp
  [60f66f4332](https://github.com/pkp/pkp-lib/commit/60f66f43327923d5c5934e7c84f2e3a941439633),
  OJS
  [4a841ab206](https://github.com/pkp/ojs/commit/4a841ab206911ae663da9e923e1eacd6a231fe99)),
  without which "Deposit All" queues nothing for a galley DOI whose
  article DOI is "Registered", missing or unticked. This fix's hunks
  apply there as written (`patch` takes them at other line numbers); on
  their own they stop "Deposit DOIs" posting an article record without
  a DOI, and let it send the galley.
- Stored data: galley DOIs already stuck at "Submitted" cannot be told
  from deposits still queued, so no migration is proposed. After the fix,
  "Deposit DOIs" on the work sends them; "Deposit All" skips "Submitted".
  A release note should say so.
- DataCite depositing only the current version under "DOI Versioning"
  "Yes" is tracked apart (U45
  [OJS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs8)).
- The open `pkp/ojs#5715` (DataCite peer-review DOIs, `pkp/pkp-lib#13062`)
  edits the same file, not these lines.
- Test: OJS has no test of the DataCite plugin, and both methods build
  the list inline before fetching the export plugin from the registry.
  A unit test needs the list moved into a method of its own first (both
  methods build the same one); then it asserts that an article without a
  DOI and a galley with one list the galley alone. Otherwise the guard
  is the e2e scenario in the pkp-e2e U45 spec.

Small: one condition in two methods and a guard of three lines, in one
OJS plugin class, following the galley check beside it, with no data
repair. A unit test adds the small refactoring named above.

## Evidence

- Kept script, shared with
  [U45-A15-deposit-without-doi-reports-success.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A15-deposit-without-doi-reports-success.md):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js)
  with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/deposit-without-doi-reports-success/lib.js),
  run on an install loaded from the default dataset with
  `WALK=galleyall PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/deposit-without-doi-reports-success/walk.js`
  for "Deposit All" and `WALK=galley` for "Deposit DOIs";
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Its other modes:
  `WAYROUND=1` adds the way round after the Steps, `NEIGHBOUR=1
  WALK=galleyall` is the control, `WALK=galleyonly` a journal with
  "Articles" unticked, `WALK=galleylater` galley DOIs turned on after the
  article was marked registered, `WALK=galleyleft` the empty list (galley
  DOIs unticked again after step 6, then "Deposit DOIs" and "Export
  DOIs").
- Where the walk differs from the Steps: it reads the queue, each DOI's
  stored status and the failed job's exception from the `jobs`, `dois`
  and `failed_jobs` tables (read only) instead of "View Jobs" and
  "Details", and reloads at least five times and until no deposit is
  queued. It also lists the export files a failed deposit leaves in
  `files_dir/temp` (read only), whose names say which object was being
  posted: `dataciteplugin-articles-17-1.xml` without a DOI, three times,
  in both paths of the Steps, and on 3.5 after "Deposit DOIs".
- The way round, walked on `main` from step 10 and on 3.5 after "Deposit
  DOIs": "Assign DOIs" gave the article a DOI ("Unregistered" beside the
  PDF's "Submitted"), and "Deposit DOIs" queued one deposit and turned
  both "Submitted"; the deposit failed only at connecting to
  `mds.datacite.org`, posting the article's record with its new DOI.
- The fix, tried 2026-10-12 on the `main` tip below:
  `fix-datacite-ojs.diff` applied to OJS, then `WALK=galleyall` and
  `WALK=galley` (the failed job was the connection error for
  `https://mds.datacite.org/metadata`, and the file left was
  `dataciteplugin-galleys-3-1.xml` carrying the PDF's DOI),
  `NEIGHBOUR=1 WALK=galleyall` with the fix in and out (both rows
  "Submitted", the same connection error, the file left
  `dataciteplugin-articles-17-1.xml` carrying the article's DOI), and
  `WALK=galleyleft` with the fix in and out. In: no failed job, no file
  left, the PDF's stored DOI still "Unregistered", the export 400 "An
  XML validation error occurred and the XML could not be exported.".
  Out: the failed job of the Steps, and the same 400, which there comes
  from the schema fetch.
- Walked 2026-10-12 on PostgreSQL, PHP 8.3 with `zend.assertions = -1`.
  Each install was freshly loaded from pkp/datasets
  [fac2371](https://github.com/pkp/datasets/commit/fac23716137c760359271218bc335a421061f115)
  (2026-10-11), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, with no
  upgrade needed.
  - main: OJS [d0b69b108d](https://github.com/pkp/ojs/commit/d0b69b108da49a53ff8a6cc15ffe0ea7b7824950)
    (lib/pkp [1ec9023e8a](https://github.com/pkp/pkp-lib/commit/1ec9023e8a9f3d701bfab396b8b148249c374dab)):
    as Observed, both paths. `WALK=galleylater` and `WALK=galleyonly`
    each queued one deposit, which failed only at connecting to
    `mds.datacite.org` (posting the article's record with its DOI, and
    the PDF's): the two cases `pkp/pkp-lib#13253` fixed.
  - stable-3_5_0: OJS [c90dfdb577](https://github.com/pkp/ojs/commit/c90dfdb577e9870229206ead446f7771d8300338)
    (lib/pkp f4f8fcdbc0): as the bracket says; `WALK=galleylater` there
    also queued nothing and left the PDF's DOI "Submitted"
    (`WALK=galleyonly` was not walked there). The code:
    `depositAll()` (lib/pkp `classes/doi/Repository.php` line 287 on)
    marks every listed DOI and queues only a row with a `submission_id`;
    OJS's query (`classes/doi/DAO.php` lines 42 and 71) joins
    `publications` on the DOI itself; `DepositSubmission::handle()`
    refuses only a missing submission or agency;
    `DatacitePlugin::depositSubmissions()` (lines 136–147) as on `main`;
    `depositXML()` `assert()`s the DOI (line 270), and
    `updateDepositStatus()` (line 340) passes the object's `doiObject`
    to `Repo::doi()->edit(Doi $doi, …)`.
- Code reads, not walked: 3.4, OJS `upstream/stable-3_4_0`
  [daf0ca971d](https://github.com/pkp/ojs/commit/daf0ca971d7ac1985c2941240a444629adc2dfa4)
  (`DatacitePlugin::depositSubmissions()` lines 138–149, `depositXML()`
  line 271, `getAllDepositableSubmissionIds()` lines 42 and 71) and
  lib/pkp `origin/stable-3_4_0`
  [55c8e406b3](https://github.com/pkp/pkp-lib/commit/55c8e406b33a3158bc360d5fc16b27673965b861)
  (`depositAll()`, `DepositSubmission::handle()`), as on 3.5. 3.3, OJS
  `upstream/stable-3_3_0`
  [d7d9dd14ec](https://github.com/pkp/ojs/commit/d7d9dd14ec9d08d48b30d55c49cc97d714866b61)
  (lib/pkp 5e84acd11b): no `api/v1/dois`, no DOIs page and no
  `depositAll()`; deposits go through the agencies' export pages.
- Introduced: `git blame` on `DatacitePlugin.php` line 157 leads through
  2eaf4ccc25 (`pkp/pkp-lib#11621`, which added the "Articles" test) to
  81664e1421, which wrote the loop (no PR found for that commit).
- Upstream search, 2026-10-12: pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom (DataCite, galley DOI, deposit, article without a DOI,
  "Submitted", "Deposit All") and by `DatacitePlugin`,
  `depositSubmissions`, `depositXML` and the exception's text.
- Unverified: DataCite's answer to a galley deposited without its
  article, and to the article record without a DOI that 3.5 posts (the
  test installs cannot reach DataCite); the second route into the state
  ("Articles" ticked after the galleys got DOIs) and the journal with
  "Articles" unticked on 3.5 and 3.4 (code read); the "Reach" items
  marked code read.
