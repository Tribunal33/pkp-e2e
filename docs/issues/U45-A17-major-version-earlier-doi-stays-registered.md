# With "DOI Versioning" "Yes", publishing a new major version leaves the earlier version's DOI "Registered" instead of "Needs Sync"

- **Severity** low
- **Effort** medium
- **Kind** regression (against OPS 3.5; on OJS and OMP "DOI Versioning" is new on `main` and the marking has never worked in a release)
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (OPS walked; OJS and OMP have no "DOI Versioning" setting)
  - 3.4: none (code)
  - 3.3: none (code; no DOI statuses)
- **Introduced** `pkp/pkp-lib#11625` for `pkp/pkp-lib#10553` · [9070e1f3c4](https://github.com/pkp/pkp-lib/commit/9070e1f3c4c3855976e7e4c90ddf6fd0e3637133) · 2025-07-02 (merged 2025-09-16) · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#11853` (open), which is not a report of this fault. It asks whether earlier versions should be marked "Needs Sync" at all, and its author believes `main` marks them. Recommendation: raise this finding there and fix it with that decision, not ahead of it
- **Tracked in** spec U45 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal, press or preprint server has "DOI Versioning" set to "Yes".
A manager creates a new version of a published work with "Major
Revision" and publishes it. The new version gets a DOI of its own,
"Unregistered". The earlier version's DOI was "Registered" and still is,
where the code means it to turn "Needs Sync". The status shows in the
window that "View all" opens on the DOIs page.

Only a preprint server's Crossref record for the earlier version is out
of date: it should now name the new version. Depositing the work for
its new DOI, by hand or by "Automatic Deposit", sends every version's
record and sets every status again. On a journal and a press the
earlier version's record at the agency does not change, so only the
label differs from what the code intends.

"DOI Versioning" is "Yes" by default on a preprint server and "No" on a
journal and a press. A new version gets its DOI on publication unless
"Automatic DOI Assignment" is "Never".

## Impact

- **Lost**: nothing while the new version has a DOI, since its deposit
  refreshes the earlier version too. When the new version has no DOI
  ("Automatic DOI Assignment" "Never"), no record names a new DOI, so
  the earlier record is not out of date either.
- **Who**: a manager who publishes a major version of a work whose DOI
  is already deposited, with "DOI Versioning" "Yes", and then presses
  "View all" on the DOIs page.
- **Way round**: deposit the work.

Low: a status label, and nothing relies on it. It would be medium if a
deposit sent only the DOIs that read "Needs Sync".

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`. `publicknowledge` has DOIs on for
  the work itself ("Articles", "Monographs", "Preprints"), no DOI
  prefix, no registration agency and no DOIs yet. "DOI Versioning" is
  "No" on the journal and the press and "Yes" on the preprint server.
- A published work with one version, 1.0. OJS: submission 17,
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran". OMP: submission 14, "From Bricks to Brains: The
  Embodied Cognitive Science of LEGO Robots". OPS: submission 2, "The
  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence".
- No agency is needed: "Mark DOIs Registered" at step 4 gives the DOI
  the status an agency's answer to a deposit gives it.

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix", choose "Yes, assign a unique DOI to every version…" under
   "DOI Versioning" (already chosen on OPS) and press "Save".
3. Open "DOIs" in the side menu. Tick the work, choose "Bulk Actions" ›
   "Assign DOIs" and confirm "Assign DOIs".
4. Tick the work again, choose "Bulk Actions" › "Mark DOIs Registered"
   and confirm "Mark DOIs Registered". Expand the work's row: its DOI
   reads "Registered".
5. Open the work's workflow and choose "Create New Version" in the side
   menu. Leave "Which version should metadata be copied from?" and
   "Publication Stage" as the window offers them (version 1.0 and its
   own stage). Choose "Revision Significance" "Major Revision" and
   press "Confirm". The workflow opens version 2.0.
6. Press "Publish" ("Post" on OPS) and confirm it. On OJS the window
   "Review Publishing Details" comes first: change nothing in it and
   press "Confirm".
7. Open "DOIs", expand the work's row and press "View all" beside "There
   are 2 versions.".

[3.5, OPS only: step 5 is the "Create New Version" button on "Title &
Abstract", answered "Yes"; there is no "Revision Significance", and
every new version gets its own DOI. The "DOIs for all versions" window
shows no status there, so the status is read from the database.]

**Expected.** Step 7: the block of version 1.0 reads "Needs Sync", and
version 2.0's block holds a new DOI, "Unregistered". On OPS 3.5 the
same steps store version 1's DOI as needing sync.

**Observed.** Step 7, the window "DOIs for all versions" on OJS:

```
Version of Record 1.0 (2026-09-30)   Article   10.1234/s8p4ak15   Registered
Version of Record 2.0 (2026-10-01)   Article   10.1234/a17zsv96   Unregistered
```

OMP ("Monograph") and OPS ("Preprint", "Author Original 1.0" and
"2.0") read the same: the first DOI "Registered", the second
"Unregistered".

Control: going on from step 7, after "Mark DOIs Registered" on the work
again, a version 2.1 made with "Minor Revision" and published turns the
DOI it shares with 2.0 to "Needs Sync".

## Cause

`PKP\publication\Repository::publish()`
(`lib/pkp/classes/publication/Repository.php`, lines 691-692) decides
whether the version being published is a new major version by
comparing it with itself:

```php
$isMajorVersion = $newPublication->getData('versionStage') != $publication->getData('versionStage') ||
    $newPublication->getData('versionMajor') != $publication->getData('versionMajor');
```

`$newPublication` is the clone of `$publication` made at line 597. A
version gets its stage and numbers before this test runs: from
`version()` at "Create New Version", or from `updateVersion()` when
its stage is changed in OJS's "Review Publishing Details" window
(`PKPSubmissionController`, line 1384). `publish()` itself numbers a
version only when it has no number yet (lines 641-646), which is a
work's first publication.

So for every new version the two sides are equal, and the branch under
the test does not run. Its comment reads "if a major version is
published, mark all submission's DOIs stale, so that their
relationships can be updated". A version x.0 then skips the next branch
too (`versionMinor != 0`), and nothing is marked.

The same comparison is right in OJS's handler of the
`Publication::version` hook,
`PubObjectsExportGenericPlugin::handlePublicationVersioning()`
(`classes/plugins/PubObjectsExportGenericPlugin.php`), whose two
arguments are the new version and its source.

Until `pkp/pkp-lib#11625`, `publish()` marked every DOI of the
submission stale whenever a version was published (`stable-3_5_0`,
lines 536-540). 9070e1f3c4 split that under versioning into two cases:
a major version marks all the work's DOIs, any other version its own.
The first case has never run. a4e66f6aac later narrowed the second to
the newest minor version.

OMP adds a fault of its own: `APP\doi\Repository::getDoisForSubmission()`
(`classes/doi/Repository.php`, line 120) reads the current publication
only, where OJS's and OPS's read every publication. With the test in
`publish()` corrected, a press still marks nothing, because the version
just published is the current one and its DOI is new.

Reach ("code" marks a case read in the code and not taken through the
screens):

- OJS, OMP, OPS under "DOI Versioning" "Yes", a work DOI that is
  "Registered" (on screen). A "Submitted" DOI takes the same path:
  `DAO::markStale()` changes both statuses (code).
- The earlier version's galley, chapter, format and peer-review DOIs
  are in `getDoisForSubmission()` too and stay as they were (code).
- A "Minor Revision" whose stage is changed in "Review Publishing
  Details": when the new stage has no version yet, `updateVersion()`
  makes it that stage's 1.0 while it keeps its source's DOI. It is an
  x.0, so today nothing is marked for it either, not even the DOI it
  shares (code).
- `unpublish()` tests `versionMinor` and is not affected (code).
- Which works a deposit takes does not depend on the earlier version's
  status: `getAllDepositableSubmissionIds()`, behind "Deposit All" and
  "Automatic Deposit", picks a work by its current version's DOI (code).
- What a deposit sends (code): Crossref's filters write every version's
  record (`ArticleCrossrefXmlFilter::process()`,
  `PreprintCrossrefXmlFilter::process()`). Only the preprint filter
  writes the current version's DOI into an earlier version's record
  ("isVersionOf"); the article filter writes the relation into the
  newer record. DataCite on a journal sends the current version only.
  `PKPDoiController::depositSubmissions()` then marks every DOI of the
  work "Submitted".
- On a press under "Yes", "Mark DOIs Registered", "Mark DOIs
  Unregistered" and "Mark DOIs Needs Sync" reach only the current
  version's DOIs, by the same `getDoisForSubmission()` (code).
- No stored data needs repair.

## Proposed fix

First settle `pkp/pkp-lib#11853`. If earlier versions are to be marked,
make the test work as below. If not, remove the branch (first
alternative). Either way the code and its comment agree again, and the
low severity gives no reason to fix ahead of that decision.

To make it work, test the version's own number, as `unpublish()` in the
same class does (`versionMinor == 0` is "a major version" there), and
let OMP's `getDoisForSubmission()` read every publication, as OJS's and
OPS's do:

```diff
--- a/lib/pkp/classes/publication/Repository.php
+++ b/lib/pkp/classes/publication/Repository.php
-                $isMajorVersion = $newPublication->getData('versionStage') != $publication->getData('versionStage') ||
-                    $newPublication->getData('versionMajor') != $publication->getData('versionMajor');
+                $isMajorVersion = $newPublication->getData('versionMinor') == 0;
--- a/classes/doi/Repository.php   (OMP)
+++ b/classes/doi/Repository.php
-        $publications = [$submission->getCurrentPublication()];
+        $publications = $submission->getData('publications');
```

The diffs:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/fix.diff)
(pkp-lib; OJS and OPS) and
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/fix-omp.diff)
(the same plus OMP's class).

Tried on `main`. With the fix applied, step 7 reads "Needs Sync" for
version 1.0 on OJS, OMP and OPS; with the pkp-lib line alone, OMP's 1.0
stayed "Registered". The Steps' control gave the same result with and
without the fix: version 2.1 turns the DOI it shares with 2.0 to
"Needs Sync" and leaves 1.0's "Registered".

**Alternatives**

- Remove the branch and its comment, if `pkp/pkp-lib#11853` concludes
  that earlier versions need no marking.
- Compare the version with its source (`sourcePublicationId`) in
  `publish()`. It costs a lookup, and a version whose source was
  deleted has nothing to compare with.

**What goes with it**

- A re-staged "Minor Revision" (the Reach's third item) counts as a
  major version under `versionMinor == 0`: every DOI of the work is
  marked, the one it shares included. That is meant, since a version
  in a new stage changes how the versions relate. Not tried.
- A version x.0 published again after "Unpublish" marks every DOI of
  the work too.
- When the new version has no DOI ("Automatic DOI Assignment"
  "Never"), the fix leaves 1.0 "Needs Sync" and neither "Deposit All"
  nor "Automatic Deposit" takes the work, which they choose by the
  current version's DOI. The manager then deposits the work by ticking
  it. Not tried.
- OMP's change widens the three "Mark DOIs …" actions on a press to
  every version's DOIs, as on a journal. Under "DOI Versioning" "No"
  the versions share their DOIs, so nothing changes there. The diff
  leaves the "Submission files" query inside the loop, where it now
  runs once per version with the same result; it filters by submission
  and belongs after the loop.
- No backport: 3.5 and 3.4 mark every DOI on every publication.
- The guard: a unit test of `publish()` for a 2.0 beside a registered
  1.0.

Medium: the fix needs a line in pkp-lib and a line in OMP's own DOI
class, so it spans two repositories. The pkp-lib line alone covers OJS
and OPS and would be small.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js)
  (helpers in `lib.js` beside it and in
  `minor-version-new-galley-dois/lib.js`). It takes steps 1-7 on the
  three apps and, with `WALK=neighbour`, the control after them:
  `WALK=neighbour PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js`;
  on 3.5 with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front and
  `ops` for `all`.
- The fix trial: `node bin/try-fix.js apply <fix.diff> ojs ops`
  (`fix-omp.diff` for `omp`), the same command, `revert`.
- The script also reads each version's DOI status from the `dois`
  table, which agreed with the window on every walk. 3.5's result is
  that stored status alone: 5 (stale) for version 1, 1 for version 2.
- Walks ran on PostgreSQL, on these tips. `main`: ojs `bade233f73`
  (pkp-lib `2e377d27fc`), omp `3b0ecf794` and ops `c8af945bb7`
  (pkp-lib `3dc90c81a6`). `stable-3_5_0`: ops `cf4fce69bd` (pkp-lib
  `a9c76aed62`); dataset pkp/datasets `38ab955` (2026-09-30).
- Code reads. 3.5 (ojs `92b9a16b48`, omp `3081c9b00`): `publish()`
  marks `getDoisForSubmission()` stale on every publication; only
  OPS's `DoiSetupSettingsForm` has the "DOI Versioning" field. 3.4
  (pkp-lib `df13621c2d`, ojs `9571d8fde7`, omp `0aec65441`, ops
  `acd8ae704b`): the same `publish()` (lines 502-506), the field on
  OPS only. 3.3 (pkp-lib `d446601ebe`, ojs `9fdb9bcf9a`, omp
  `8e72fc883`, ops `c5532e2161`): no DOI status of this kind in
  `lib/pkp/classes`.
- The handler's comparison is dated b10a6cb667 (2025-06-30), two days
  before 9070e1f3c4; that `publish()` copied it is a guess.
- Upstream, searched 2026-10-01 in pkp/pkp-lib, the three app repos and
  pkp/ui-library. `pkp/pkp-lib#11853` opens with "Currently when a new
  major version is created we mark all versions of that submission
  stale"; `pkp/pkp-lib#11590` says a deposit is per submission and
  carries all its versions.
- No deposit was driven: the test installs reach no agency.
- Unverified: what Crossref and DataCite do with an earlier version's
  record that is not sent again.
