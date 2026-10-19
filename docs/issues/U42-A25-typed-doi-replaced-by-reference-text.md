# A DOI an editor corrects in "Edit citation" before the lookup starts is replaced by the reference text's DOI

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no metadata lookup; references are one free-text box)
  - 3.4: none (code; the same free-text box)
  - 3.3: none (code; the same free-text box)
- **Introduced** PR `pkp/pkp-lib#11884` (built on `pkp/pkp-lib#11830`) for `pkp/pkp-lib#10692` · [4730f670](https://github.com/pkp/pkp-lib/commit/4730f6707ea4a350ff8f733172b1c9537d5481b7) · 2025-09-16 · GaziYucel (GaziYucel)
- **Upstream** none found (2026-10-19)
- **Tracked in** spec U42 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a25)
- **Checked** 2026-10-19, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With metadata lookup on, an editor adds a reference whose text holds a
DOI, opens "Edit" on it, types another DOI and saves. The row shows the
typed DOI as a link, also after a reload. Then the background step that
picks identifiers out of the reference's text runs, and it puts the
text's DOI back: the row's link and the "DOI" box of "Edit" show the
text's DOI again, and no message says so.

A typed DOI is lost only when the editor saves before that step has
run. On a site that runs its background jobs with a worker or a cron
entry, the editor has until the next run. On a site with the default
setting, which runs jobs at the end of each page request, the step
runs before "Edit" can be opened, unless the jobs are held up. A DOI
typed after the step stays.

## Impact

- **Lost**: the DOI the editor typed. On a journal, the reference's
  DOI goes into the Crossref deposit's reference list. The lookup then
  asks OpenAlex for the work behind the text's DOI and, when that DOI
  is found, stores that work's title, authors, date, source, volume and
  pages on the reference (read in the code: no outside service answers
  on a test install).
- **Who**: editors, and authors allowed to edit the publication, on the
  workflow's Publication › "References" page. Metadata lookup is off
  until a manager turns it on. Two kinds of site are exposed: those
  that run background jobs by a worker or cron, which the configuration
  advises for high-volume sites, and default sites whose jobs are held
  up. How many sites run a worker or cron is not known.
- **Way round**: once the step has run (the text's DOI shows as the
  row's link), typing the DOI again keeps it. Nothing on the page says
  that this is needed.

Medium: a correction saved by hand is silently replaced, and the
lookup may then store another work's details over the reference. It
happens only between the "Add" and the first job run, which on a
default site is the end of the "Add" request itself. It would be high
if default sites met it in ordinary use.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- In `config.inc.php`, under `[queues]`, set `job_runner = Off` and
  `process_jobs_at_task_scheduler = Off` (the dataset has the second
  already). The site then runs its background jobs with a worker or a
  cron entry, and step 8 is what that cron entry runs. With the
  dataset's `job_runner = On`, the step runs at the end of step 5's own
  request, and step 6 already shows the text's DOI.

The submission per app: OJS 4, "Computer Skill Requirements for New and
Existing Teachers: Implications for Policy and Practice"; OMP 3, "The
Political Economy of Workplace Injury in Canada"; OPS 1, "The influence
of lactation on the quantity and quality of cashmere production".

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Go to Settings › Workflow › "Submission" › "Metadata". Under
   "References", tick "Enable references structuring and metadata
   lookup" and press "Save".
3. Open the submission
   (`/index.php/publicknowledge/dashboard/editorial?workflowSubmissionId=<id>`).
4. In the side menu under "Publication" ("Preprint" on OPS), choose
   "References".
5. Type `Turing A. h19z On computable numbers. 1936. https://doi.org/10.1234/h19z.text`
   in "References" and press "Add". The new row shows the text.
6. On the row, press "More Actions" and choose "Edit". The "DOI" box is
   empty.
7. Type `10.5678/h19z.typed` in "DOI" and press "Save". The row shows
   the link "10.5678/h19z.typed" before its text, and again after a
   reload.
8. On the server, in the application's directory, run the site's
   background jobs: `php lib/pkp/tools/jobs.php run`. This runs the
   reference's whole lookup chain. `CrossrefJob` skips a reference that
   has a DOI. `OpenAlexJob` requests
   `https://api.openalex.org/works/doi:10.1234%2Fh19z.text?mailto=<the journal's contact email>`.
   No such work exists, so OpenAlex answers 404 and nothing more is
   stored. On an install without outside connections the request fails,
   and the job is queued again for a later retry.
9. Reload the page and open "References" again.
10. Look at the row's link, then press "More Actions", choose "Edit"
    and look at "DOI".

**Expected.** The row's link and the "DOI" box read
`10.5678/h19z.typed`, the DOI the editor saved.

**Observed.** The same on the three apps. Step 7's save answers 200
with `"doi": "10.5678/h19z.typed"`, and the row reads
"10.5678/h19z.typed Turing A. h19z On computable numbers. 1936.
https://doi.org/10.1234/h19z.text", also after a reload. Step 8 prints
(the walk's install has no outside connections):

```
[2026-10-19 06:55:19][13] Processing: PKP\jobs\citation\ExtractPidsJob
[2026-10-19 06:55:19][13] Processed: PKP\jobs\citation\ExtractPidsJob
[2026-10-19 06:55:19][14] Processing: PKP\jobs\citation\CrossrefJob
[2026-10-19 06:55:19][14] Processed: PKP\jobs\citation\CrossrefJob
[2026-10-19 06:55:19][15] Processing: PKP\jobs\citation\OpenAlexJob
[2026-10-19 06:55:19][15] Processed: PKP\jobs\citation\OpenAlexJob
[OK] Completed running 1 jobs in the queue named queue.
```

After step 9 the row reads "10.1234/h19z.text Turing A. h19z On
computable numbers. 1936. https://doi.org/10.1234/h19z.text", its link
opening `https://doi.org/10.1234/h19z.text`, and "DOI" in "Edit" reads
`10.1234/h19z.text`. No message showed at any step.

## Cause

The lookup's first step, `ExtractPidsJob::handle()`
(`lib/pkp/jobs/citation/ExtractPidsJob.php`), returns early only when
the citation is gone or its processing status is `PID_EXTRACTED` or
beyond. Otherwise it runs `ExtractPidsHelper::execute()`
(`lib/pkp/classes/citation/pid/ExtractPidsHelper.php`). That method
sets `doi`, `arxiv`, `handle`, `url` and `urn` to whatever it finds in
the raw text, each only when the text holds one, without looking at
what the citation already carries. The job then saves the citation.

A hand save leaves the status where it was.
`PKPCitationController::edit()`
(`lib/pkp/api/v1/citations/PKPCitationController.php`) stores the
submitted fields and does not touch `processingStatus`. When a lookup
is asked for, `Repository::reprocessCitation()` sets the citation to
`QUEUED` (-2) and dispatches the chain `ExtractPidsJob`, `CrossrefJob`,
`OpenAlexJob`, `OrcidJob`, `IsProcessedJob`. A save made before the
first job runs therefore leaves that job free to write the text's
identifiers over the typed ones. The rule broken: an identifier saved
by hand is replaced by an automatic step without a word. The
`citationLookup.php extract` command from `pkp/pkp-lib#13536` keeps to
that rule ("Only fill empty identifiers: one already set may have been
corrected by hand"); the job does not.

The overwrite dates from the commit that added structured citations,
[4730f670](https://github.com/pkp/pkp-lib/commit/4730f6707ea4a350ff8f733172b1c9537d5481b7).
Its `ExtractPidsJob` wrote the helper's result over every citation not
yet processed. The status check added later (`pkp/pkp-lib#11902`) skips
only citations past that step.

Reach:

- Every path that sets `QUEUED` (code): "Add" on the References page
  (`importAdditionalCitations()`), the whole list saved with lookup on
  (`importCitations()`, the submission wizard's References box), a
  new version that copies references whose lookup is unfinished
  (`copyCitations()`), and "Reprocess" and "Reprocess all references".
  The last two warn before they run: "You'll need to re-enter your
  manual changes again if you continue." (walked).
- An arXiv ID, handle, web address or URN typed before the step is
  replaced by the text's the same way (code).
- On a default site (`job_runner = On`), each page request runs queued
  jobs when it ends: up to `job_runner_max_jobs` (30) or
  `job_runner_max_execution_time` (30 s). With
  `job_runner_cross_request_lock = On` (the default), a request skips
  this while another request's runner is busy. So the step waits past
  the "Add" only when more jobs are queued than one request runs, or
  another request is running a slow job such as an outside lookup
  (code). The walk saw it run within the "Add" request.
- After the step, `CrossrefJob` is skipped because a DOI is present, and
  `OpenAlexJob` looks up the text's DOI. `openAlex\Inbound::getWork()`
  sets every mapped detail from the answer (code).

## Proposed fix

When the editor saves before the first step has run, do that step's
work in the save: in `PKPCitationController::edit()`, when the
citation's stored status is `QUEUED`, run `ExtractPidsHelper` on the
text as saved. Fill only the identifiers that the save leaves empty,
and store the citation at `PID_EXTRACTED`. The queued `ExtractPidsJob`
then returns early, and the chain goes on from Crossref and OpenAlex as
before
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-doi-replaced-by-reference-text/fix.diff)):

```php
// getData(), as citations from before 3.6 have no status and getProcessingStatus() requires one.
if ($citation->getData('processingStatus') === CitationProcessingStatus::QUEUED->value) {
    $extracted = clone $citation;
    $extracted->setRawCitation($params['rawCitation'] ?? $citation->getRawCitation());
    (new ExtractPidsHelper())->execute($extracted);
    foreach (['doi', 'arxiv', 'handle', 'url', 'urn'] as $pid) {
        if (empty($params[$pid]) && !empty($extracted->getData($pid))) {
            $params[$pid] = $extracted->getData($pid);
        }
    }
    $params['processingStatus'] = CitationProcessingStatus::PID_EXTRACTED->value;
}
```

The block goes after the read-only check, so a client still cannot send
`processingStatus` (it is `writeDisabledInApi`), and before validation.
The check reads the stored value with `getData()`, as
`Repository::copyCitations()` does. References stored before 3.6 have no
status, and `getProcessingStatus()` is typed `int`, so calling it on one
would fail. The fix keys on the status, so it covers every path in the
Cause's first reach bullet.

Tried: with the fix, step 10 shows `10.5678/h19z.typed` on the three
apps, and the save answers `"processingStatus": 1`. These cases read
the same with and without the fix:

- a save that types only a title on a reference whose text holds a DOI
  still gets the text's DOI (with the fix at the save, without it at
  the job run);
- a DOI typed after the step stays;
- "Reprocess all references" still puts the text's DOI back;
- on OJS, a reference stored as 3.5 stores it (no status) still saves a
  typed DOI with 200 and keeps no status.

**Alternatives**

- Make `ExtractPidsJob` (or the helper) fill only empty identifiers, as
  the CLI does. That keeps a typed DOI, but it also keeps a stale one
  through "Reprocess" after the editor changes the reference's text,
  where the new text's DOI is wanted.
- End the lookup on a hand save (set a finished status). The
  identifiers in the text would then never be extracted, and the
  Crossref, OpenAlex and ORCID steps would not run for that reference.

**What goes with it**

- Not closed by this fix: a worker that loaded the citation in
  `ExtractPidsJob::handle()` just before the save still writes its whole
  copy back after it (`Repo::citation()->edit($citationChanged, [])`).
  That window is the job's own run, which makes no outside call
  (code). Closing it means the job writes only the identifiers and the
  status, re-reading the citation under a lock; that is a larger change,
  which the team can weigh.
- Not closed either: a panel opened before the step and saved after it
  sends the identifier boxes as they were loaded (empty), and so clears
  what the step extracted (code, not walked). That is a stale form, a
  different fault.
- No stored data to repair: a replaced DOI cannot be told from an
  extracted one.
- A guard: unit tests of the controller's edit:
  - on a `QUEUED` citation, the typed DOI is kept, an empty URL is
    filled from the text, and the status becomes `PID_EXTRACTED`;
  - on a citation with no stored status, the save works as before;
  - the e2e scenario of the Steps, a **Planned** item in spec U42.

Small: fifteen lines in one controller method, with two unit tests.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-doi-replaced-by-reference-text/walk.js)
  with its `lib.js`, on an install loaded from PKP's default test
  dataset (pkp/datasets `eaf024c5`, 2026-10-18, PostgreSQL).
  - It sets `job_runner = Off` in the install's config and takes Steps 1
    to 10, step 8 as `php lib/pkp/tools/jobs.php run` against that
    config. Beside each step it reads the stored `processingStatus` and
    `doi`.
  - `NB=1` runs the fix's neighbour cases. It first leaves
    `job_runner = On` and opens "Edit" right after "Add": "DOI" already
    read the text's DOI on all three apps. Then it turns `job_runner`
    Off for the other cases.
  - `OLD=1` stores a reference by SQL the way stable-3_5_0's
    `CitationDAO::insertObject()` stores one, as an install upgraded to
    `main` holds it: a `citations` row (publication, text, sequence)
    with no `citation_settings` row, so no `processingStatus`. It then
    takes "Edit" › DOI › "Save" on that reference.
- The fix was tried in two rounds. The first used
  `getProcessingStatus()`, on the three apps with the walk and `NB=1`.
  The second used the `getData()` check, on OJS with the walk and
  `OLD=1`. `NB=1` and `OLD=1` were also run without the fix.
- Tips walked and read: `main` OJS `6b4323ced7`, OMP `5777025bec`, OPS
  `f048e747b4`, each with lib/pkp `042726ebf6`, which carries
  `pkp/pkp-lib#13537` (merge `7ce31a8c4b`); `stable-3_5_0` OJS
  `007c2cd0d6`, OMP `2d575f2506`, OPS `e737a9e465`, lib/pkp
  `092ec34b0f`; `stable-3_4_0` OJS `0012bd1022`, OMP `e30fa7e38c`, OPS
  `0f1e21a117`, lib/pkp `a71d6bd2ca`; `stable-3_3_0` OJS `d7d9dd14ec`,
  OMP `8e72fc8836`, OPS `c5532e2161`, lib/pkp `5e84acd11b`.
- 3.5: the same script on the `stable-3_5_0` dataset. Settings ›
  Workflow › "Metadata" offers "Enable references metadata" but no
  lookup box, so the steps stop at step 2. In the code, lib/pkp has no
  `jobs/citation/`, no `classes/citation/pid/` and no citations API.
  3.4 and 3.3 (code, `git show origin/stable-3_4_0` and
  `origin/stable-3_3_0` in lib/pkp) have the same one-box
  `PKPCitationsForm` and no `ExtractPidsJob`.
- Introduced: `git blame` on `ExtractPidsJob::handle()` and
  `ExtractPidsHelper::execute()` leads to `4730f6707e` ("pkp/pkp-lib#10692
  structured citations"), authored by GaziYucel in their PR
  `pkp/pkp-lib#11830`. It was merged through `pkp/pkp-lib#11884`, which
  bozana opened on top of it.
- Upstream search, 2026-10-19, on pkp/pkp-lib, pkp/ojs and
  pkp/ui-library: "citation DOI overwritten", "citation edit DOI
  replaced", "citation manual changes lookup", "structured citations
  edit overwritten", `ExtractPidsJob`, `ExtractPidsHelper`. Two hits
  were read and neither is this fault: `pkp/pkp-lib#13536` (the CLI
  `extract`) and `pkp/pkp-lib#13477` (identifiers dropped or corrupted
  by the extraction itself).
- Unverified: what OpenAlex stores for a DOI that resolves (no outside
  service on the test install); a site with a worker daemon
  (`jobs.php work`); a default site whose jobs are held up. MySQL not
  checked; nothing here depends on the database.
