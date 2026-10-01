# On a preprint server, a minor version's galleys get new DOIs instead of keeping their source's

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OPS
  - 3.5: none (no minor versions)
  - 3.4: none (code; no minor versions)
  - 3.3: none (code; no minor versions)
- **Introduced** `pkp/pkp-lib#11625` with `pkp/ops#1076` and `pkp/ops#1099` for `pkp/pkp-lib#10553` · [9070e1f3c4](https://github.com/pkp/pkp-lib/commit/9070e1f3c4c3855976e7e4c90ddf6fd0e3637133) · 2025-07-02 (merged 2025-09-16) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U45 [OPS4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A preprint server has "DOI Versioning" set to "Yes" and gives DOIs to
its galleys (off by default). A manager creates a new version of a
posted preprint with "Minor Revision" and posts it. The new version
keeps the preprint's DOI, but its galleys do not keep theirs: each gets
a new DOI. On a journal and a press, a minor version keeps its galleys'
and formats' DOIs.

Nothing on screen says so, and the manager cannot put the old DOI back:
the DOIs page refuses it with "Some DOI(s) could not be updated".

## Impact

- **Lost.** No DOI is deleted; the earlier version keeps its galley's
  DOI in the database. But after the post the DOIs page shows only the
  new one, and the preprint's OAI-PMH record lists the new one. No
  public page shows either galley DOI, and neither is registered, so
  neither resolves.
- **Who.** Managers of a preprint server with "Preprint galleys" ticked
  and "DOI Versioning" "Yes" (the default for a preprint server), on
  every minor version they post. Choosing Crossref, the one agency a
  preprint server offers, unticks galley DOIs, so these are servers
  with no registration agency that manage galley DOIs themselves.
- **Way round.** None on screen.

Low: no DOI is lost, no deposit carries the new DOI, and no reader page
shows galley DOIs. It would be medium for a server that registers its
galley DOIs outside OPS and marks them registered, since the current
version would then list an unregistered DOI for the galley in its
OAI-PMH record, with no way to set it back.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main`. Its server `publicknowledge`
  has DOIs on, "Items with DOIs" "Preprints" only, no DOI prefix,
  "DOI Versioning" "Yes", "Automatic DOI Assignment" "Upon reaching the
  production stage" (under "Never" the new version's galley gets no
  DOI at all instead of a new one), and no DOIs yet.
- The dataset's posted preprint "The Facets Of Job Satisfaction: A
  Nine-Nation Comparative Study Of Construct Equivalence" (submission
  2; one version, "Author Original 1.0", with the galley "PDF"). No
  other data is needed.

1. Sign in as `dbarnes`.
2. Settings › Distribution › "DOIs" › "Setup": type `10.1234` in "DOI
   Prefix". Under "Items with DOIs", tick "Preprint galleys, such as a
   published PDF". Leave "DOI Versioning" on "Yes" and press "Save".
3. Open "DOIs" in the side menu. Tick "The Facets Of Job
   Satisfaction …", choose "Bulk Actions" › "Assign DOIs" and confirm
   "Assign DOIs".
4. Expand "The Facets Of Job Satisfaction …" and note the DOIs of the
   "Preprint" and "PDF" rows.
5. Open submission 2's workflow and choose "Create New Version" in the
   side menu. Leave "Revision Significance" on "Minor Revision", as the
   window offers it, and press "Confirm". The workflow opens "Author
   Original 1.1".
6. Press "Post", then "Post" in the window ("All requirements have been
   met. Are you sure you want to post this?").
7. Open "DOIs" and expand "The Facets Of Job Satisfaction …" (it now
   shows "Author Original 1.1").
8. Press "Edit", type the DOI noted for "PDF" at step 4 into the "PDF"
   row and press "Save".

**Expected.** Step 7: the "Preprint" and "PDF" rows hold the DOIs noted
at step 4, since a minor version shares its source's DOIs.

**Observed.** Step 4: "Preprint" `10.1234/at09xx17`, "PDF"
`10.1234/0eda9a71`, both "Unregistered". Step 7: "Preprint"
`10.1234/at09xx17`, "PDF" `10.1234/d56k7637`, "Unregistered". Step 8:
"Some DOI(s) could not be updated"; the save request answers 400 and
the row goes back to `10.1234/d56k7637`. The suffixes are random, so
they differ on every walk.

Between steps 5 and 6 version 1.1's galley has no DOI, but no screen
shows it: the DOIs page still lists version 1.0 with its DOIs, and the
workflow's "Galleys" page has no DOI column. Signed out after step 6,
the preprint's page and the earlier version's page show the preprint
DOI only, and neither galley's PDF view shows a DOI.

Control: the same steps on OJS `main` (submission 17, "Article galleys,
such as a published PDF") and OMP `main` (book 14, "Publication
Formats"), with "DOI Versioning" set to "Yes" at step 2, keep the
galley's and the format's DOI at step 7.

## Cause

`APP\publication\Repository::version()` in OPS
(`classes/publication/Repository.php`, line 132) copies the source
version's galleys to the new version. It clears each copy's `doiId`
whenever "DOI Versioning" is on:

```php
if ($isDoiVersioningEnabled) {
    $newGalley->setData('doiId', null);
}
```

`pkp/pkp-lib#10553` made the minor versions of one stage and major
number share one DOI. Its pull requests applied that to the version's
own DOI in pkp-lib (`&& !$isMinorVersion`, line 427), to OJS's galleys
(line 172) and to OMP's formats, files and chapters (lines 136, 170 and
218). The OPS pull requests, `pkp/ops#1076` and `pkp/ops#1099`, left
OPS's galley line as it was, so the feature misses what its issue asked
for on a preprint server. The line was right when it was written
(`33a7b8b1ea`, 2022): until then every new version got new DOIs.

At "Post", `PKP\observers\listeners\VersionDois` calls OPS's
`createDois()`, which mints a DOI for every galley without one.

The way round fails because the DOIs page's "Save" changes the string
of the new galley's DOI record, and `PKP\doi\Repository::validate()`
refuses a DOI string that another record already holds (`isDuplicate()`,
"doi.editor.doiSuffixCustomIdentifierNotUnique").

Reach:

- Under "Automatic DOI Assignment" "Never", the new version's galley
  stays without a DOI after posting (code: `VersionDois` returns
  early).
- On the DOIs page, editing a galley's DOI also changes the galleys of
  the other minor versions that share it
  (`PKP\galley\Repository::getMinorVersionsWithSameDoi()`). A galley
  given a new DOI by this fault no longer shares one, so an edit of
  either version's galley DOI leaves the other alone (code).
- The preprint's OAI-PMH Dublin Core record lists the current version's
  galley DOIs as `dc:relation` (`Dc11SchemaPreprintAdapter`) (code).
- No other `version()` override clears DOIs without the minor-version
  test. The search covered `SETTING_DOI_VERSIONING` in the three apps
  and pkp-lib (code).

## Proposed fix

Add the minor-version test to OPS's galley line, as OJS has it. In
`classes/publication/Repository.php`, `version()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/minor-version-new-galley-dois/fix.diff)):

```diff
-                if ($isDoiVersioningEnabled) {
+                if ($isDoiVersioningEnabled && !$isMinorVersion) {
                     $newGalley->setData('doiId', null);
                 }
```

OPS uses pkp-lib's `PKP\galley\Galley` and `PKP\galley\Repository`;
what it owns is the loop in its `version()` override that copies the
galleys, the same loop OJS has. `version()` has one caller
(`PKPSubmissionController::createNewPublicationVersionAndNotify()`),
so this line covers it. Tried on OPS `main`: step 7 then shows the
"PDF" DOI from step 4. A "Major Revision" still starts the new
version's preprint and galley without DOIs and gives both new ones at
"Post", with the fix in and out.

**Alternatives**

- Move the galley copy, with its DOI rule, from the OJS and OPS
  overrides into pkp-lib's `version()`. The galley classes are already
  shared, so this works, and it would keep the two copies from drifting
  apart again. It touches OJS as well and is a refactor rather than a
  fix, so it can follow separately.
- Have `createDois()` reuse a sibling minor version's galley DOI at
  "Post". That treats the symptom and leaves the galley without a DOI
  until then.

**What goes with it**

- Data already stored: a minor version made before the fix keeps its
  galley's separate DOI, and the duplicate check stops a manager from
  typing the old one back. No automatic repair is proposed, since a
  server may have registered the new DOI outside OPS.
- REST API and plugins: a new minor version's galley carries its source
  galley's `doiId` from the start, as on OJS. No hook changes.
- Test: a unit test in OPS for `version()` with "Minor Revision", and
  the e2e scenario here (a Planned item in the spec).

Small: one condition, with a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/minor-version-new-galley-dois/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1 to 7 on OPS, and
  the control on OJS and OMP, on an install loaded from PKP's default
  test dataset (pkp/datasets `38ab955`, 2026-09-30, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/minor-version-new-galley-dois/walk.js`.
  `WALK=readers` adds step 8, the reads between steps 5 and 6, and the
  signed-out pages (OPS); the Observed values above are from that walk.
  `WALK=neighbour` takes the steps with "Major Revision".
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/minor-version-new-galley-dois/fix.diff ops`,
  then the walk and the "Major Revision" walk, the latter also without
  the fix.
- 3.5 (walked on OPS, OJS and OMP, steps 1 to 4): "Create New Version"
  asks only "Are you sure you want to create a new version?" ("Yes",
  "No"). In code, `stable-3_5_0`'s `version()` takes no
  `$isMinorVersion` (OPS and pkp-lib `classes/publication/Repository.php`).
- 3.4 (code): `upstream/stable-3_4_0`'s OPS `version(Publication)` and
  pkp-lib's have no minor versions. 3.3 (code): `stable-3_3_0` has no
  "DOI Versioning" and no minor versions; versions are copied in
  `PublicationService::versionPublication()`.
- Introduced, traced: `git blame` on OPS line 132 gives `33a7b8b1ea`
  (Erik Hanson, 2022-07-24, `pkp/pkp-lib#8027`). The `#10553` changes:
  pkp-lib `9070e1f3c4`; OJS `57172f2847` in `pkp/ojs#4982`; OMP
  `7ab3c85edf` in `pkp/omp#2091`; OPS `pkp/ops#1076` (merged 2025-09-16)
  and `pkp/ops#1099` (merged 2025-09-17), which do not touch line 132.
- Upstream search (2026-10-01), pkp/pkp-lib, pkp/ops and pkp/ui-library,
  by "minor version galley DOI", "OPS galley DOI version",
  `isMinorVersion` and `doiId`: `pkp/pkp-lib#11819` (open, the UI
  questions of DOIs per version) and `pkp/pkp-lib#13373` (closed, DOIs
  for new versions on reaching copyediting) were read; neither is this
  fault.
- Tips: OPS `main` `c8af945bb7` (lib/pkp `3dc90c81a6`); OJS `main`
  `bade233f73` (lib/pkp `2e377d27fc`); OMP `main` `3b0ecf794` (lib/pkp
  `3dc90c81a6`); `stable-3_5_0` OPS `cf4fce69bd` (lib/pkp `a9c76aed62`),
  OJS `92b9a16b48`, OMP `3081c9b00`; `stable-3_4_0` OPS `acd8ae704b`
  (lib/pkp `df13621c2d`); `stable-3_3_0` OPS `c5532e2161` (lib/pkp
  `d446601ebe`).
- Unverified: the OAI-PMH record and the "Never" path (code only).
