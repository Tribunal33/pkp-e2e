# With "DOI Versioning" "Yes", publishing a new major version leaves the earlier version's DOI "Registered" instead of "Needs Sync"

- **Severity** low
- **Effort** small
- **Kind** regression (against OPS 3.5; on OJS and OMP "DOI Versioning" is new on `main` and the marking has never worked in a release)
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (OPS walked; OJS and OMP have no "DOI Versioning" setting)
  - 3.4: none (code)
  - 3.3: none (code; no DOI statuses)
- **Introduced** `pkp/pkp-lib#11625` for `pkp/pkp-lib#10553` · [9070e1f3c4](https://github.com/pkp/pkp-lib/commit/9070e1f3c4c3855976e7e4c90ddf6fd0e3637133) · 2025-07-02 (merged 2025-09-16) · Bozana Bokan (bozana)
- **Upstream** `pkp/pkp-lib#11853` (open), which is not a report of this fault. It asks whether earlier versions should be marked "Needs Sync" at all, and its author believes `main` marks them. Recommendation: raise this finding there and fix it with that decision, not ahead of it
- **Tracked in** spec U45 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#a17)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: the fault still shows on `main`, and the fix is now
one pkp-lib line for the three apps. `pkp/pkp-lib#13460` and
`pkp/omp#2495` (merged 2026-10-09) made the change a press needed, and
changed when a new version gets its DOI and which works "Deposit All"
takes; the Summary, the Cause's Reach and the Proposed fix follow them.

## Summary

A journal, press or preprint server has "DOI Versioning" set to "Yes".
A manager creates a new version of a published work with "Major
Revision" and publishes it. The new version gets a DOI of its own,
"Unregistered". The earlier version's DOI was "Registered" and still is,
where the code means it to turn "Needs Sync", as it does on a 3.5
preprint server. The earlier version's status shows only in the window
that "View all" opens on the DOIs page; the work's row there reads
"Unregistered", for the new version.

One record at a registration agency is out of date meanwhile. A
preprint server registers with Crossref, where the earlier version's
record should name the new version. It does not from the day the new
version is posted until the work is next deposited. That deposit is
the one the new "Unregistered" DOI needs anyway: "Automatic Deposit"
makes it, or the manager does from the work's "Unregistered" row, and
it sends every version's record. On a journal no record is out of
date: with Crossref the earlier version's record reads the same with
or without the new version, and with DataCite no deposit sends an
earlier version. A press is shipped without a registration agency
plugin.

"DOI Versioning" is "Yes" by default on a preprint server and "No" on a
journal and a press. The new version gets its DOI by itself, when it is
created or at the latest when it is published, unless "Automatic DOI
Assignment" is "Never"; with no new DOI the earlier version's record
has nothing new to name.

## Impact

- **Lost**: a correct status label. On a preprint server also the
  earlier version's link to the new one at Crossref, until the work's
  next deposit.
- **Who**: a manager who publishes a major version of a work whose DOI
  is already deposited, with "DOI Versioning" "Yes".
- **Way round**: on a preprint server, deposit the work. A journal and
  a press need none.

Low: a status label, and nothing relies on it. The deposit that brings
the record up to date is prompted by the new version's "Unregistered"
DOI, not by the label. It would be medium if a deposit sent only the
DOIs that read "Needs Sync".

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
Version of Record 1.0 (2026-10-11)   Article   10.1234/pydj3098   Registered
Version of Record 2.0 (2026-10-12)   Article   10.1234/gwtf1w36   Unregistered
```

OMP ("Monograph") and OPS ("Preprint", "Author's Original 1.0" and
"2.0") read the same: the first DOI "Registered", the second
"Unregistered".

Control: going on from step 7, after "Mark DOIs Registered" on the work
again, a version 2.1 made with "Minor Revision" and published turns the
DOI it shares with 2.0 to "Needs Sync".

## Cause

`PKP\publication\Repository::publish()`
(`lib/pkp/classes/publication/Repository.php`, lines 700-701) decides
whether the version being published is a new major version by
comparing it with itself:

```php
$isMajorVersion = $newPublication->getData('versionStage') != $publication->getData('versionStage') ||
    $newPublication->getData('versionMajor') != $publication->getData('versionMajor');
```

`$newPublication` is the clone of `$publication` made at line 601. A
version gets its stage and numbers before this test runs: from
`version()` at "Create New Version", or from `updateVersion()` when
its stage is changed in OJS's "Review Publishing Details" window
(`PKPSubmissionController`, line 1402).

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
lines 550-554). 9070e1f3c4 split that under versioning into two cases:
a major version marks all the work's DOIs, any other version its own.
The first case has never run for a new version. a4e66f6aac later
narrowed the second to the newest minor version.

The branch does run in one case, where it changes nothing: a work's
first publication on a press and a preprint server. Their "Publish"
and "Post" hand `publish()` a version with no number yet (OJS numbers
it first, in "Review Publishing Details"). Lines 654-659 number the
clone alone, so the two sides differ. The work's DOIs all read
"Unregistered" then, which `DAO::markStale()` leaves alone (code).

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
- Which works a deposit takes (code): "Deposit All" and "Automatic
  Deposit" ask `getAllDepositableSubmissionIds()`. Under "Yes" it
  looks at every published version that is the newest minor version
  of its stage and major number (`DAO::whereDepositablePublication()`),
  and takes the work when such a version's DOI reads "Unregistered",
  "Error" or "Needs Sync". The new version's "Unregistered" DOI brings
  the work in, whatever the earlier version's DOI reads.
- What a deposit sends (code): Crossref's preprint filter writes every
  published version's record (`PreprintCrossrefXmlFilter::process()`),
  and its article filter one record per major version, from the newest
  published minor version (`ArticleCrossrefXmlFilter::process()`).
  Only the preprint filter writes the current version's DOI into an
  earlier version's record ("isVersionOf"); the article filter writes
  the relation into the newer record. DataCite on a journal sends the
  current version and its galleys only
  (`DatacitePlugin::depositSubmissions()`) and never reads "DOI
  Versioning". OMP ships no agency plugin, so a press's deposit was
  not read.
- The statuses after a deposit (code): "Deposit DOIs" on the work,
  `PKPDoiController::depositSubmissions()`, marks every published
  version's DOIs "Submitted"; "Deposit All" marks the DOIs its query
  took. Crossref's answer then sets every published version's DOIs
  (`CrossrefExportPlugin::updateDepositStatus()`). DataCite's sets the
  current version's alone (`DataciteExportPlugin::updateDepositStatus()`),
  so on a DataCite journal "Deposit DOIs" already leaves an earlier
  version's DOI "Submitted" for good. DataCite with a DOI per version
  is not implemented yet: `pkp/pkp-lib#11591` (open).
- No stored data needs repair.

## Proposed fix

First settle `pkp/pkp-lib#11853`. The fix below is for the answer that
earlier versions are to be marked, and the first alternative for the
other. Either way the code and its comment agree again. On a journal
with DataCite the marking should wait for `pkp/pkp-lib#11591` (first
item of "What goes with it").

To make it work, test the version's own number, as `unpublish()` in the
same class does (`versionMinor == 0` is "a major version" there).
`getDoisForSubmission()` reads every version's DOIs in the three apps,
so the one line covers them:

```diff
--- a/lib/pkp/classes/publication/Repository.php
+++ b/lib/pkp/classes/publication/Repository.php
-                $isMajorVersion = $newPublication->getData('versionStage') != $publication->getData('versionStage') ||
-                    $newPublication->getData('versionMajor') != $publication->getData('versionMajor');
+                $isMajorVersion = $newPublication->getData('versionMinor') == 0;
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/fix.diff).

Tried on `main`. With the fix applied, step 7 reads "Needs Sync" for
version 1.0 on OJS, OMP and OPS. The Steps' control gave the same
result with and without the fix: version 2.1 turns the DOI it shares
with 2.0 to "Needs Sync" and leaves 1.0's "Registered".

**Alternatives**

- Remove the branch and its comment.
- Compare the version with its source (`sourcePublicationId`) in
  `publish()`. It costs a lookup, and a version whose source was
  deleted has nothing to compare with.

**What goes with it**

- DataCite on a journal (code; not tried, the test installs reach no
  agency). With the fix 1.0 reads "Needs Sync", so "Deposit All" and
  "Automatic Deposit" take its DOI and mark it "Submitted". DataCite
  is never sent that version and never answers for it, so the DOI
  stays "Submitted" and no deposit turns it back; today it stays
  "Registered". Until `pkp/pkp-lib#11591` gives DataCite a DOI per
  version, the fix makes a DataCite journal's labels worse, not
  better: land it with or after that work.
- A re-staged "Minor Revision" (the Reach's third item) counts as a
  major version under `versionMinor == 0`: every DOI of the work is
  marked, the one it shares included. This proposal accepts that,
  since a version in a new stage changes how the versions relate. Not
  tried.
- A version x.0 published again after "Unpublish" marks every DOI of
  the work too. So does a journal's first publication, as a press's
  and a preprint server's already do, on DOIs that read "Unregistered"
  and stay so (code).
- When the new version has no DOI ("Automatic DOI Assignment"
  "Never"), the fix leaves 1.0 "Needs Sync", and "Deposit All" and
  "Automatic Deposit" then take the work for that DOI (the Reach's
  fifth item). Not tried.
- A version still unpublished can hold a DOI from its creation, and
  `getDoisForSubmission()` returns it too. It reads "Unregistered",
  which `DAO::markStale()` leaves alone (code).
- No backport.
- The guard: the e2e scenario of the Steps, which the kept walk takes.
  pkp-lib has no test that calls `publish()` or `markStale()` to add a
  case to, and the apps' Cypress `Doi.cy.js` makes no new version.

Small: one line in pkp-lib's `publish()`, following `unpublish()`. A
PHPUnit test of `publish()` would have to be built from nothing (a
context, a submission, two versions and their DOI rows) and would
make it medium; it is not counted.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js).
  It takes steps 1-7 on the three apps and, with `WALK=neighbour`, the
  control after them:
  `WALK=neighbour PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/major-version-earlier-doi-stays-registered/walk.js`;
  on 3.5 with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front and
  `ops` for `all`.
- The fix trial: `node bin/try-fix.js apply <fix.diff> ojs omp ops`,
  the same command with `FIX=1 PROBE_RUN=fix` in front, `revert`. The
  comment the diff adds was reworded after the trial; its code line is
  the one tried, and `patch --dry-run` applies it to the three
  checkouts' committed file.
- The work's row on the DOIs page read "Unregistered" at step 7 with
  and without the fix; whether the "Needs Sync" filter would list the
  work for an earlier version's DOI was not looked at.
- The script also reads each version's DOI status from the `dois`
  table, which agreed with the window on every walk. 3.5's result is
  that stored status alone: 5 (stale) for version 1, 1 for version 2.
  On `main` the read after step 5 shows version 2.0 holding its DOI
  before it is published, on the three apps: the dataset's "Automatic
  DOI Assignment" is "Upon reaching the copyediting stage"
  (`AssignDOIs::handleVersioned()`). On OPS 3.5 version 2 has none
  until it is posted.
- Walks ran on PostgreSQL, on these tips. `main`: ojs `d0b69b108d`
  (pkp-lib `1ec9023e8a`), omp `eb4c30aa3c` and ops `8d04ca333c`
  (pkp-lib `58c7f454ff`). `stable-3_5_0`: ops `399c4ebca3` (pkp-lib
  `8094f06bf5`); dataset pkp/datasets `fac2371` (2026-10-11).
- Code reads. `main`: `getDoisForSubmission()` in each app's
  `classes/doi/Repository.php` (OMP's since `1614d5e44`, 2026-10-09,
  maps `getDoisForPublication()` over every publication), each app's
  `doi/DAO::getAllDepositableSubmissionIds()`, pkp-lib's
  `doi/Repository::depositAll()`, and the filters and
  `updateDepositStatus()` of OJS's Crossref and DataCite plugins and
  OPS's Crossref plugin, the only agency plugins in the three
  checkouts (OMP's `plugins/` and `.gitmodules` hold none). The first
  publication: ui-library's `workflowConfigEditorialOMP.js` and
  `workflowConfigEditorialOPS.js` call `workflowScheduleForPublication`
  directly, OJS's goes through `workflowAssignPublicationStage`, and
  every unpublished first version in the three datasets has no
  `version_stage`. 3.5 (ojs
  `c90dfdb577`, pkp-lib `f4f8fcdbc0`; omp `486cbf9eb0`): `publish()`
  marks `getDoisForSubmission()` stale on every publication; only
  OPS's `DoiSetupSettingsForm` has the "DOI Versioning" field. 3.4
  (pkp-lib `55c8e406b3`, ojs `daf0ca971d`, omp `0aec65441f`, ops
  `acd8ae704b`): the same `publish()` (lines 502-506), the field on
  OPS only. 3.3 (pkp-lib `5e84acd11b`, ojs `d7d9dd14ec`, omp
  `8e72fc8836`, ops `c5532e2161`): no DOI status of this kind in
  `lib/pkp/classes`.
- Introduced: `git blame` on lines 700-701 still names 9070e1f3c4.
- The handler's comparison is dated b10a6cb667 (2025-06-30), two days
  before 9070e1f3c4; that `publish()` copied it is a guess.
- Upstream, searched again 2026-10-12 in pkp/pkp-lib, the three app
  repos and pkp/ui-library. `pkp/pkp-lib#11853`, open with no comment,
  opens with "Currently when a new major version is created we mark
  all versions of that submission stale"; `pkp/pkp-lib#11590` says a
  deposit is per submission and carries all its versions.
- No deposit was driven: the test installs reach no agency. Every
  sentence on what a deposit takes, sends or marks is a code read, the
  DataCite item of "What goes with it" included; the same state from
  "Deposit DOIs" is spec U45
  [OJS8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs8).
- Unverified: what Crossref and DataCite do with an earlier version's
  record that is not sent again.
