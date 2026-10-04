# References page: the lookup's progress box counts only structured references and says "All 2 done" over five

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; one free-text References box, no metadata lookup)
  - 3.4: none (code; one free-text References box, no metadata lookup)
  - 3.3: none (code; one free-text References box, no metadata lookup)
- **Introduced** `pkp/ui-library#876` for `pkp/pkp-lib#12155` · [ec15771a](https://github.com/pkp/ui-library/commit/ec15771aa616956294af4d654f5669aaecc513f0) · 2026-04-16 · Kaitlin Newson (kaitlinnewson)
- **Upstream** `pkp/pkp-lib#13308` (open; fix in PR `pkp/ui-library#982`, not yet in main), covering the count; that PR counts every reference, which brings back `pkp/pkp-lib#12155` for references no lookup was asked for
- **Tracked in** spec U42 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

With metadata lookup on, an editor who adds references expects the box
under "Add" to report on the whole list while the lookup runs. The box
counts only structured references: those whose details (identifier,
title and authors) are filled in, by the lookup or by hand. It is absent
while none is. With two of five structured it reads "Processing
references - 0/2". Once those two are done it reads "All 2 references
successfully processed" while the other three are still waiting.

While the box is absent or says "All … processed", the page stops
refreshing itself, so the rows still being looked up change only on a
reload.

On `main` today the box also shows when no lookup is running. A
reference added while lookup was off, then filled in by hand after it was
switched on, shows "Processing references - 0/1" for good. That is the
symptom `pkp/pkp-lib#12155` set out to remove.

## Impact

- **Lost** Nothing stored. The editor is told the wrong thing about the
  lookup: no progress for a fresh list, and "All 2 references
  successfully processed" while three are still waiting. While the box
  shows a count below its total, each open tab also sends two requests
  (the submission and the publication) every 7 seconds, for good when no
  lookup is running.
- **Who** Editors and anyone who may edit the publication's metadata, on
  the workflow's "References" page, on journals, presses and servers
  that have switched on "Enable references structuring and metadata
  lookup" (off by default), each time references are added or
  reprocessed.
- **Way round** A reload shows each row's own state ("No structured
  information found", the found details, or plain text while waiting),
  so an editor who reloads before filling anything in by hand is not
  misled.

Low: the lookups finish and every row is right after a reload; only the
box and its refresh mislead. What would raise it is a separate fault
read in the code and not walked: an editor who fills in by hand a
reference the box calls done, while its lookup still waits, has that
typing replaced when the lookup finds the work (its title, authors,
date, volume, issue, pages and source), and the fields the service
lacks emptied, with no message (Reach).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. Lookup is off
  in it, and no submission has a reference.
- Queued jobs run, as the dataset's own configuration has them
  (`job_runner = On`: at the end of web requests).
- The install cannot reach the lookup services (no outbound access, or
  Crossref and OpenAlex blocked). With access, all five lookups finish
  together within a minute or two and step 10's state cannot be reached.
- Steps 9 and 11 stand in for the services answering: the SQL writes
  what the end of the lookup chain writes (`IsProcessedJob::handle()`:
  `processingStatus` 5, "processed").

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open "Settings" › "Workflow" › "Metadata", tick "Enable references
   structuring and metadata lookup" and press "Save".
3. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (OJS), 3, "The
   Political Economy of Workplace Injury in Canada" (OMP), or 1, "The
   influence of lactation on the quantity and quality of cashmere
   production" (OPS), then "Publication" ("Preprint" on OPS) ›
   "References".
4. Type these five lines into the "References" box and press "Add":

   ```
   u42r7 Reference one. Test Press; 2020.
   u42r7 Reference two. Test Press; 2020.
   u42r7 Reference three. Test Press; 2020.
   u42r7 Reference four. Test Press; 2020.
   u42r7 Reference five. Test Press; 2020.
   ```

5. Look under the "Add" box.
6. On "u42r7 Reference one", press "More Actions" › "Edit". Fill "DOI"
   with `10.1234/u42r7.1` and "Title" with `u42r7 Reference one`, press
   "Add" under "Author Information", type `Ada` and `Lovelace`, and press
   "Save".
7. The same on "u42r7 Reference two" (`10.1234/u42r7.2`, `u42r7
   Reference two`, `Charles` `Babbage`).
8. Look under the "Add" box.
9. Let the lookups of "one" and "two" finish:

   ```sql
   UPDATE citation_settings SET setting_value = '5'
    WHERE setting_name = 'processingStatus'
      AND citation_id IN (SELECT citation_id FROM citations WHERE raw_citation IN
          ('u42r7 Reference one. Test Press; 2020.', 'u42r7 Reference two. Test Press; 2020.'));
   ```

10. Reload the page, open "References" again and look under the "Add"
    box.
11. Let the other three finish without a match: the same SQL with
    "three", "four" and "five".
12. Reload, open "References" and look again.

**Expected.** Step 5: "Processing references - 0/5", and the page
refreshes the list by itself until the lookups finish. Step 8:
"Processing references - 0/5". Step 10: "Processing references - 2/5".
Step 12: "All 5 references successfully processed".

**Observed.** The same on the three apps:

- Step 5: nothing under the "Add" box, and the page sent no request in
  the next 22 seconds. The five lookups had started: each reference was
  past its first, local step.
- Step 8: "Processing references - 0/2", with "We're retrieving metadata
  for each reference. …". The page refetched the submission and the
  publication every 7 seconds.
- Step 10: "All 2 references successfully processed" with "All
  references have been processed and added below. You can review, edit
  or remove them at any time.", over three rows still waiting. The page
  sent no request in the next 22 seconds.
- Step 12: still "All 2 references successfully processed"; the three
  other rows read "No structured information found".

No request failed and the browser logged no error.

Control: two references added while lookup was off, then lookup switched
on: no box and no refresh, as `pkp/pkp-lib#12155` wants. After "Edit"
fills one of them in by hand (DOI, title, author), the box reads
"Processing references - 0/1" and the page refetches every 7 seconds,
although no lookup was ever asked for it. References with no stored
status, as an upgrade from 3.5 leaves them, behave the same way (walked
on OJS).

## Cause

The box is `CitationManagerStatusProcessed.vue`, shown when `total > 0`.
Its numbers come from `citationManagerStore.js`
(`lib/ui-library/src/managers/CitationManager/citationManagerStore.js`,
lines 62 to 73): `totalCitations` is the number of structured
references, and `processedCitations` the structured ones whose
`processingStatus` is `PROCESSED`. The page's refresh (lines 78 to 86)
runs only while `processedCitations < totalCitations`.

Being structured says nothing about the lookup.
`Citation::isStructured()` needs an identifier, a title and authors. The
lookup fills these in late in its chain, and an editor can fill them in
by hand at any time. A reference whose lookup is still running usually
has none of them, so the box leaves it out. A reference filled in by
hand is counted whether or not a lookup was ever asked for.

ec15771a made the count structured-only, for `pkp/pkp-lib#12155`. When
lookup is switched on, the references already in place get no lookup and
stay "not processed". The box then counted every reference, so it read
"Processing references - 0/15" for good. Counting structured references
was meant to stand for counting the references a lookup was asked for.
It does not, and the #12155 symptom returns for a reference filled in by
hand (the Control).

Underneath, the stored status cannot tell the two apart.
`PKP\citation\Repository::importCitations()` and
`importAdditionalCitations()` store `NOT_PROCESSED` for every new
reference, whether or not they then queue a lookup
(`reprocessCitation()`). `PKPCitationController::reprocessCitation()`
("Reprocess") and `reprocessCitationsByPublicationId()` ("Reprocess all
references") store the same before queuing. References upgraded from 3.5
have no stored status at all (no migration writes one), and the REST API
gives `null` for them. A page that wants to count the references a
lookup was asked for has no field to count.

Reach:

- The box and the 7-second refresh read the same two numbers; nothing
  else reads them (checked in the code).
- The open fix, `pkp/ui-library#982` for `pkp/pkp-lib#13308`, counts
  every reference and treats a failed lookup as finished. It gives the
  Expected for a fresh "Add". But references no lookup was asked for
  would hold the box at "Processing references - 0/n" with a refresh
  every 7 seconds for good: those in place before lookup was switched
  on, those imported by the native import with `citation-metadata-lookup`
  off, and those upgraded from 3.5. That is `pkp/pkp-lib#12155` again
  (code read).
- A failed lookup (`FAILED`) is counted today only when the reference is
  structured. How a failure should show is the other half of
  `pkp/pkp-lib#13308`, outside this report.
- The replacing of hand-entered details (Impact's severity sentence) is
  the lookup jobs' own behaviour: `CrossrefJob` and `OpenAlexJob` set
  every field their mapping names, whatever the reference already holds
  (code read, not walked). It is a fault of its own, outside this
  report; this report covers only the box that invites the hand work.

## Proposed fix

Store that a lookup was asked for, and count those references.
`Repository::reprocessCitation()`, the one place a lookup is queued,
stores a new status `QUEUED` before dispatching the chain. The store
counts a reference when its status is `QUEUED` or a lookup stage
(`PID_EXTRACTED` to `PROCESSED`). `NOT_PROCESSED`, no status at all and
`FAILED` are left out
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-lookup-progress-counts-structured-only/fix.diff),
in `lib/pkp` and `lib/ui-library`):

```diff
     case FAILED = -1;
+    // A lookup was asked for and waits in the queue (Repository::reprocessCitation()). It sorts below
+    // every real stage, as FAILED does. NOT_PROCESSED (or no stored status) means no lookup was asked for.
+    case QUEUED = -2;
     case NOT_PROCESSED = 0;
```

```diff
         $contactEmail = $context->getContactEmail();
 
+        // Tell a reference waiting for its lookup from one no lookup was asked for.
+        $citation->setProcessingStatus(CitationProcessingStatus::QUEUED->value);
+        $this->edit($citation, []);
+
         $jobs = [
```

```diff
-		const structuredCitations = computed(() =>
-			(citations.value || []).filter((citation) => citation?.isStructured),
+		const lookupCitations = computed(() =>
+			(citations.value || []).filter(
+				(citation) =>
+					citation?.processingStatus ===
+						pkp.const.citationProcessingStatus.QUEUED ||
+					citation?.processingStatus >
+						pkp.const.citationProcessingStatus.NOT_PROCESSED,
+			),
 		);
-		const totalCitations = computed(() => structuredCitations.value.length);
+		const totalCitations = computed(() => lookupCitations.value.length);
```

The rest of the diff:

- Every job of the chain stores `FAILED` when it is abandoned. A new
  trait, `jobs/citation/MarksCitationFailed`, holds the `failed()` that
  `CitationLookupJob` had: it stores `FAILED` and logs the status the
  lookup had reached. `ExtractPidsJob`, `OrcidJob` and `IsProcessedJob`,
  which had no `failed()` and would leave a reference `QUEUED` or
  mid-chain for good, now use it, and `CitationLookupJob::failed()`
  calls it with its retry count. Setting `FAILED` in the chain's
  `catch()` instead would run before `CitationLookupJob::failed()`, which
  would then log `lastProcessingStatus` as -1 and lose the stage where
  the lookup gave up.
- `copyCitations()`, which `publication\Repository::version()` calls,
  queues the lookup again for a copy taken while its lookup was still
  under way (`QUEUED` or a stage before `PROCESSED`). The pending jobs
  work on the original's ids, so the copy would otherwise wait for good.
  It is queued again rather than set to `NOT_PROCESSED`: the editor
  asked for that reference to be looked up, and `NOT_PROCESSED` would
  leave the new version with a half-looked-up reference and nothing to
  say its lookup never finished. When lookup has since been switched off,
  the copy is set to `NOT_PROCESSED`, as an unasked reference.
- `schemas/citation.json` accepts `-2` in `processingStatus`'s `in:`
  rule, and the page's `citationProcessingStatus` constants
  (`PKPDashboardHandler`) gain `QUEUED`. ui-library's `public/globals.js`
  gains `QUEUED` and the missing `FAILED`; only Storybook loads it, so
  this is a tidy-up that changes nothing for the filter.
- `CitationLookupJobTest::testFailedStatusSortsBelowEveryOtherProcessingStatus`
  asserts that `FAILED` is the lowest value, which `QUEUED` breaks. The
  diff turns it into
  `testFailedAndQueuedSortBelowEveryOtherProcessingStatus`, with its
  docblock, which keeps what the old test guards: both values stay below
  every lookup stage, so the jobs' `getProcessingStatus() >= Stage`
  guards still redo a pending stage. No value between `FAILED` and
  `NOT_PROCESSED` exists, so the test has to change.

Tried on `main` on the three apps, and again on OJS with the diff as it
stands (the shared `failed()`, the copy queued again): the box read "Processing references - 0/5"
after "Add" and after two were filled in, "2/5" with two finished, and
"All 5 references successfully processed" at the end. The page
refreshed itself until then. References added while lookup was off, then
switched on, still showed no box and started no refresh, also after one
was filled in by hand; "Reprocess" on one of them showed "Processing
references - 0/1". References with no stored status, as an upgrade
leaves them (the API gave `null`), showed no box and no refresh, also
after one was filled in by hand.

**Alternatives**

- Merge `pkp/ui-library#982` as it is: right for a fresh "Add", but it
  brings back `pkp/pkp-lib#12155` (Reach).
- Count, in the page alone, the references whose status is past
  `NOT_PROCESSED`: no server change, but a reference just added is still
  `NOT_PROCESSED` until a worker runs its first job. When the page's
  refetch after "Add" comes first, the box stays absent and the refresh
  never starts, which is the symptom of step 5.
- An upgrade migration that stores `0` on references without a status:
  not needed once the store counts only `QUEUED` and the lookup stages,
  since `null` then reads as "no lookup asked for".
- Revert ec15771a: also brings back `pkp/pkp-lib#12155`.

**What goes with it**

- `pkp/ui-library#982`'s handling of failures (finished = processed +
  failed, its own wording from `pkp/pkp-lib#13318`) fits on top: with
  `FAILED` counted as finished instead of left out, the total becomes
  every reference a lookup was asked for.
- Stored data. `NOT_PROCESSED` and no status (references from 3.5) read
  correctly as "no lookup asked for", so released installs need no
  repair: 3.5 has no lookup, so no install upgrading from it holds a
  lookup stage. A `main` install can hold references left at a stage
  (1 to 4) by a chain that died before the fix. Today they are not
  counted unless they are structured; after the fix they would count as
  still running and keep the box and the 7-second refresh on for good.
  Such an install repairs them once its queue holds no citation job:

  ```sql
  UPDATE citation_settings SET setting_value = '-1'
   WHERE setting_name = 'processingStatus' AND setting_value IN ('1', '2', '3', '4');
  ```
- The REST API's `processingStatus` gains one value, on a field that is
  not yet released.
- Guard: the reworked unit test, one that `reprocessCitation()` stores
  `QUEUED`, and an end-to-end check that "Add" with lookup on shows
  "Processing references - 0/n" while switching lookup on over existing
  references shows no box.

A proposal; the team decides. Medium: two repositories (pkp-lib and
ui-library), a new status value in the REST API, a shared `failed()`
for the chain's jobs, and a unit test that changes with it.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reference-lookup-progress-counts-structured-only/walk.js).
  It takes the Steps as `dbarnes` on PKP's default dataset for `main`
  (pkp/datasets 566bb1f, 2026-10-03), freshly loaded, and runs step 9's
  and step 11's SQL itself. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/reference-lookup-progress-counts-structured-only/walk.js`.
  With `nb` as its argument it walks the Control and what the fix must
  leave alone; with `upg` it deletes the stored status of two references
  added while lookup was off (what an upgrade from 3.5 leaves), switches
  lookup on and fills one in by hand.
- Lookup states the walks reached. The install runs queued jobs at the
  end of web requests, as the dataset's configuration has it, but has no
  outbound access. After "Add" and after "Reprocess" each reference
  reached `PID_EXTRACTED` (1): the local first job ran. The next job
  needs Crossref, which did not answer, so the reference waited there.
  The code puts the job back with a delay that starts at 5 minutes and
  doubles, and gives up after eight tries (about 21 hours), storing
  `FAILED`. `PROCESSED` (5), and with it "All {total} references
  successfully processed" and "No structured information found", was
  reached only through the SQL of steps 9 and 11, which writes what
  `IsProcessedJob::handle()` writes (`Repo::citation()->edit()` of
  `processingStatus` 5, nothing else). `FAILED` (-1) was not reached.
  References added while lookup was off stayed `NOT_PROCESSED` (0).
- Database: PostgreSQL; the fault does not depend on it. The `main` tips
  walked: OJS ff004d0973, OMP 3b0ecf794, OPS c8af945bb7; pkp-lib
  987776cd04 (OJS) and 3dc90c81a6 (OMP, OPS); ui-library 64d67363 (OJS)
  and 280f98c5 (OMP, OPS), with the same files in each.
- Code reads:
  - main: the files the Cause names; `CitationManager.vue` (the box only
    with lookup on); every reader of `totalCitations` and
    `processedCitations`; every writer of `processingStatus`
    (`Repository`, `PKPCitationController`, the lookup jobs,
    `CitationLookupJob::failed()`); the jobs' `failed()` methods and the
    chain's `catch()`; the crossref and openAlex `Inbound`
    and `Mapping` classes (the replacing of hand-entered details); the
    native import filter's `citation-metadata-lookup` option; the 3.6
    upgrade migrations (none writes `processingStatus`).
  - 3.5 (pkp-lib 771474347e, ui-library d4e01883), 3.4 (pkp-lib
    767353f4fe, ui-library ee684b34), 3.3 (pkp-lib ac3fa73402,
    ui-library 96959f9e): a free-text References box
    (`PKPCitationsForm`); no `CitationManager`, no processing status, no
    lookup.
- Introduced: `git blame` on the store's lines 62 to 73 gives ec15771a,
  `pkp/ui-library#876`, whose issue `pkp/pkp-lib#12155` asked that the
  box not show for references that are not being processed. Before it
  the box counted every reference (a7012573, `pkp/pkp-lib#11902`).
- Upstream: `pkp/pkp-lib#13308` describes the miscount ("All 26
  references successfully processed" on a 67-reference publication); its
  PRs `pkp/ui-library#982`, `pkp/pkp-lib#13318` and `pkp/ojs#5812` are
  open and unmerged (2026-10-04). `pkp/pkp-lib#12426` (open) is a box
  stuck at "0/X" on imported articles, which its discussion puts down to
  a long queue. Searched pkp/pkp-lib, pkp/ui-library and pkp/ojs
  (2026-10-04).
- The reworked unit test was checked against the patched enum with a
  plain PHP loop of its assertions (the old test's loop fails on
  `QUEUED`, the new one passes); PHPUnit itself did not run on the test
  install.
- Not driven: an install with outbound access, where the lookups finish
  by themselves; the replacing of hand-entered details (no service
  answers on the test install); an abandoned job's `failed()` and the
  `copyCitations()` part of the fix (code only); a real upgrade from 3.5
  (the `upg` walk deletes the stored status instead); 3.5, 3.4 and 3.3
  (no such page); MySQL.
- Unverified: the `QUEUED` status itself was not seen on screen or in the
  database, because the first job had already run by the time the page
  read the list. The fix's effect on a page whose refetch comes before
  that job rests on the code.
