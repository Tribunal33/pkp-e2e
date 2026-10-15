# A preprint server's Crossref deposit names a DOI once per posted version that shares it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS (versions made under "DOI Versioning" "No", then "Yes")
  - 3.4: OPS (code; as 3.5)
  - 3.3: OPS (code)
- **Introduced** not traced; present since at least [383acb2e76](https://github.com/pkp/ops/commit/383acb2e76a26dcf90941db437570edd7e9701bd) (2020-02-06)
- **Upstream** `pkp/pkp-lib#12553` (closed): the "No" case, fixed on `stable-3_4_0` and `stable-3_5_0` only (`pkp/crossref-ops#63`, `#64`); fix in PR `pkp/crossref-ops#67` (for `pkp/pkp-lib#11590`), not yet in main: it covers "No" and "Minor Revision", not two major versions on one DOI
- **Tracked in** spec U45 [OPS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops6)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a preprint server that registers DOIs with Crossref, the posted
versions of a preprint can share one DOI: every new version does while
"DOI Versioning" is "No", and on `main` a "Minor Revision" does under
"Yes", the server's default (3.5 and 3.4 have no "Minor Revision"). The
Crossref file for such a preprint, the one "Export DOIs" downloads and a
deposit sends, holds one record for each version that shares the DOI,
newest version first, each pointing to that version's page. It should
hold one record, the newest version's.

Crossref takes the first record of a DOI in a file, so the DOI is
registered with the newest version and its page, and it refuses each
repeat. The server then counts the deposit as failed and shows the DOI
as "Error", on every deposit of that preprint. Other preprints in the
same "Deposit All" or automatic deposit are not affected: each preprint
goes to Crossref in a file of its own. "Mark DOIs Registered" clears
the "Error" until the next deposit.

On 3.5 and 3.4 a server set to "No" sends the DOI once. There the fault
shows only when versions made under "No" are deposited after the server
switched to "Yes": two major versions on one DOI. `main` has that case
too, and the open fix `pkp/crossref-ops#67` leaves it.

## Impact

- **Lost:** a true deposit status. The "Error" carries Crossref's
  refusal, documented as "Record not processed because submitted
  version: … is less or equal to previously submitted version …", which
  tells the manager nothing about the duplicate. Each further version on
  the DOI adds one more refused record.
- **Who:** managers of a preprint server depositing with Crossref, from
  the first preprint posted in a second version on its DOI.
- **Way round:** none that lasts. "Deposit All" and the automatic
  deposit take "Error" DOIs again, so the "Error" returns with the next
  run.

Medium: the deposit file is wrong for every preprint whose versions
share a DOI, though the registration itself goes through. It would be
high if Crossref refused the whole file.

## Steps to reproduce

These steps show the Crossref file. Seeing a deposit turn "Error" needs
a Crossref account (test credentials in the plugin's settings) and is
not part of the steps; Evidence gives what the code and Crossref's
documentation say about it.

Preconditions:

- PKP's default test dataset, OPS `main`. Its server has DOIs on for
  preprints, "DOI Versioning" "Yes", no prefix and no registration
  agency; the Crossref plugin is off. Preprint 2, "The Facets Of Job
  Satisfaction: A Nine-Nation Comparative Study Of Construct
  Equivalence", is posted with one version, 1.0.
- An install that reaches crossref.org downloads the exported file. One
  that cannot fetch Crossref's schema shows an "Error" window instead
  (below), and the file it built stays in the files directory's `temp`
  folder, named `crossrefplugin-<date>-<time>-preprints-1.xml`.

Setting up:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save" ("DOI Versioning" stays "Yes").
4. "Registration": "Registration Agency" "Crossref", "Depositor Name"
   `Public Knowledge Project`, "Depositor Email"
   `dbarnes@mailinator.com`, "Save".
5. Side menu "DOIs": tick preprint 2; "Bulk Actions" › "Assign DOIs" ›
   "Assign DOIs". It gets a DOI (`10.1234/g2bf2q98` in the walk).

"Minor Revision":

6. Open preprint 2; "Create New Version"; "Revision Significance"
   "Minor Revision"; "Confirm". Version 1.1 shares 1.0's DOI.
7. On version 1.1's "Title & Abstract": "Post", and "Post" in the
   window.
8. "DOIs": tick preprint 2; "Bulk Actions" › "Export DOIs" › "Export
   DOIs".

"DOI Versioning" "No", then "Yes", from a freshly loaded dataset:

3. As above, with "DOI Versioning" "No".
4. and 5. As above.
6. Open preprint 2; "Create New Version"; "Revision Significance" "Major
   Revision"; "Confirm". Version 2.0 keeps 1.0's DOI. [3.5: "Create New
   Version" offers no "Revision Significance"; it asks "Are you sure you
   want to create a new version?", answered "Yes".]
7. "Post" version 2.0 as in step 7 above.
8. "Export DOIs" on preprint 2 as in step 8 above.
9. "Setup": "DOI Versioning" "Yes", "Save".
10. "Export DOIs" on preprint 2 again.

**Expected.** Each file holds one `posted_content` record for the DOI,
the newest posted version's.

**Observed.** On the test install, which cannot reach crossref.org,
"Export DOIs" answers 400 and the "Error" window reads "An XML
validation error occurred and the XML could not be exported." over
"Failed to locate the main schema resource at
'https://www.crossref.org/schemas/crossref5.4.0.xsd'.". The file it
built holds two records for one DOI, under the file's one
`<timestamp>`:

```xml
<timestamp>20261015092208000</timestamp>
…
<posted_content type="preprint" language="en">
  …
  <doi_data>
    <doi>10.1234/g2bf2q98</doi>
    <resource>…/index.php/publicknowledge/preprint/view/2/version/21</resource>
  </doi_data>
</posted_content>
<posted_content type="preprint" language="en">
  …
  <doi_data>
    <doi>10.1234/g2bf2q98</doi>
    <resource>…/index.php/publicknowledge/preprint/view/2/version/2</resource>
  </doi_data>
</posted_content>
```

Version 1.1's record comes first (its page `/version/21`), then 1.0's
(`/version/2`). The file is valid against Crossref's 5.4.0 schema, so
an install that reaches crossref.org downloads it as it is, and a
deposit sends it.

"No", then "Yes": the files of steps 8 and 10 hold the same two records,
2.0's page first, then 1.0's. [3.5: step 8's file holds one record,
version 2's; step 10's holds two, version 2's, then version 1's.]

## Cause

`PreprintCrossrefXmlFilter::process()`
([crossref-ops `filter/PreprintCrossrefXmlFilter.php`, lines 75-85](https://github.com/pkp/crossref-ops/blob/8e82eda7ccd0ddb0711a6073850f14c4ebbe8680/filter/PreprintCrossrefXmlFilter.php#L75-L85))
writes a `posted_content` record for every posted version that carries
a DOI. Its `array_reverse()` puts the newest version first, as the
comment over it says, so that the relations between the versions' DOIs
resolve at Crossref. The loop assumes each version has a DOI of its own
and never checks whether a DOI was already written.

Versions do share a DOI. `PKP\publication\Repository::version()`
gives a new version a DOI of its own only when "DOI Versioning" is on
and the version is not minor (`if ($context->getData(Context::SETTING_DOI_VERSIONING) && !$isMinorVersion)`);
otherwise the new version keeps its source's `doiId`.

Crossref takes one record per DOI from a deposit. Every record of the
file carries the file's one `<timestamp>`, and Crossref refuses a record
whose timestamp is not above the last one it took for that DOI
([Crossref, troubleshooting submissions](https://www.crossref.org/documentation/register-maintain-records/verify-your-registration/troubleshooting-submissions/)).
`CrossrefExportPlugin::depositXML()` reads a failure count above zero
in Crossref's answer as a failed deposit and sets the DOI to
`Doi::STATUS_ERROR` with Crossref's messages.

On `stable-3_4_0` and `stable-3_5_0` the plugin writes only the current
version while "DOI Versioning" is "No"
([b9d85d4](https://github.com/pkp/crossref-ops/commit/b9d85d4f62b94c429879cda108ab49b62bdbaee8),
`pkp/crossref-ops#64` for `pkp/pkp-lib#12553`, 2026-07-14; `#63` on
3.4). That change was never made on `main`, whose filter is the loop
from before it. Under "Yes" both lines still write every posted
version.

Reach:

- Every use of the file goes through this filter: "Export DOIs",
  "Deposit DOIs", "Deposit All" and automatic deposit
  (`CrossrefPlugin::exportSubmissions()`, `depositSubmissions()`)
  (code; "Export DOIs" on screen).
- One preprint per deposit (code): `CrossrefExportPlugin::exportAndDeposit()`
  builds and sends a file per preprint, and "Deposit DOIs" and "Deposit
  All" queue one `DepositSubmission` job per preprint
  (`PKPDoiController`, `doi\Repository::depositAll()`). A repeated DOI
  fails only its own preprint's deposit.
- Versions carried over from 3.3 (code): 3.3 kept the DOI on every new
  version unless a custom suffix pattern held `%b`, the 3.4 upgrade
  (`PKPI7014_DoiMigration`) gave each version a `dois` row of its own
  with the same DOI, and `I8027_DoiVersioning` set every server to
  "Yes". Their DOI is written once per version on every line.
- A journal (OJS `main`, code only, not walked): `ArticleCrossrefXmlFilter`
  writes the current version under "No", and under "Yes" one record per
  stage and major version (`Repo::doi()->getLatestMinorPublicationsForDoiDeposit()`).
  Two major versions that share a DOI, made under "No" before a switch
  to "Yes", would also be written twice there. OJS 3.5 has no "DOI
  Versioning" and writes the current version alone. A press has no
  Crossref plugin.

## Proposed fix

Write each DOI once in `PreprintCrossrefXmlFilter::process()`, with the
newest posted version that carries it. The loop already walks the
versions newest first, so the first record of a DOI is the one to keep
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-file-doi-twice/fix.diff),
here with its path in `pkp/crossref-ops`; then the submodule pointer in
`pkp/ops`):

```diff
--- a/filter/PreprintCrossrefXmlFilter.php
+++ b/filter/PreprintCrossrefXmlFilter.php
@@ -76,10 +76,16 @@
             $publications = $pubObject->getData('publications')->toArray();
             // Use array reverse so that the latest version of the submission is first in the xml output and the DOI relations do not cause an error with Crossref
             $publications = array_reverse($publications, true);
+            // Versions can share a DOI ("DOI Versioning" off, a minor version, versions made before
+            // versioning was switched on), and Crossref takes one record per DOI in a deposit:
+            // each DOI is written once, with the newest posted version that carries it
+            $writtenDois = [];
             foreach ($publications as $publication) {
-                if ($publication->getDoi() && $publication->getData('status') === PKPSubmission::STATUS_PUBLISHED) {
+                $doi = $publication->getDoi();
+                if ($doi && $publication->getData('status') === PKPSubmission::STATUS_PUBLISHED && !in_array($doi, $writtenDois)) {
                     $postedContentNode = $this->createPostedContentNode($doc, $publication, $pubObject);
                     $bodyNode->appendChild($postedContentNode);
+                    $writtenDois[] = $doi;
                 }
             }
         }
```

Keying on the DOI states Crossref's own rule. It covers "No", "Minor
Revision" under "Yes" and two major versions on one DOI without reading
the setting, and keeps the newest-first order the relations rely on.
The check compares the DOI string, not `doiId`: versions carried over
from 3.3 share the string but each has a `dois` row of its own.

Tried on `main` with both groups of steps: each file then held one
record, the newest version's (1.1's; 2.0's at steps 8 and 10), and
passed the schema. A second check shows the fix keeps a version with a
DOI of its own: under "Yes", 2.0 made with "Major Revision" (a new DOI)
and 2.1 with "Minor Revision", both posted. With the fix the file held
2.1's record and 1.0's, 1.0's still carrying "isVersionOf" 2.0's DOI;
without it, a third record, 2.0's, repeated 2.1's DOI. A proposal; the
team decides.

**Alternatives:**

- Port the 3.5 change (`#64`) to `main`: it covers "No" only, and
  every "Minor Revision" under "Yes" is still written twice.
- The approach of PR `pkp/crossref-ops#67`, the one OJS uses: under
  "Yes", the newest minor version of each stage and major version. It
  covers "No" and "Minor Revision", but two major versions on one DOI
  (made under "No" before a switch, or carried over from 3.3) are still
  written twice. The DOI check above can go into that PR's loop.
- Keep one publication per DOI in pkp-lib's
  `getLatestMinorPublicationsForDoiDeposit()`: it would cover the
  journal's case too, but that helper's stage and major grouping feeds
  the article filter's relations, so it is a change of its own, with
  its own OJS check.

**What goes with it:**

- Backport: on `stable-3_5_0` and `stable-3_4_0` the same check goes
  into the "Yes" branch `#64`/`#63` added.
- PR `pkp/crossref-ops#67` rewrites this loop: whichever lands second
  carries the check. A separate fault, the preprint's subtitle
  ([U45 OPS7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ops7)),
  is fixed in `createPostedContentNode()` of the same file; the two
  diffs apply together.
- The guard: a unit test of `process()` with two posted versions on one
  DOI. `pkp/crossref-ops` has no `tests/` yet, so it needs one set up,
  as the journal's plugin has (`crossref-ojs`
  `tests/JournalMetadataNodeTest.php`).
- No data repair: a DOI an earlier deposit left at "Error" is deposited
  again by the next "Deposit All".

Small: one condition in one filter, tried, and a unit test once the
plugin has a test folder.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-file-doi-twice/walk.js),
  with
  [validate.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-file-doi-twice/validate.php)
  (Crossref's 5.4.0 schema, fetched from crossref.org outside the app),
  on an install freshly loaded from the dataset:
  `[WALK=switch|neighbour] PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/preprint-crossref-file-doi-twice/walk.js`.
  No `WALK` takes "Minor Revision", `switch` "No", then "Yes" (walked on
  3.5 too), `neighbour` the second check of the fix, which was tried with
  `fix.diff` applied to the checkout and walked again with it out. The
  script reads the file "Export DOIs" leaves in the files directory's
  `temp` folder.
- Walks ran on PostgreSQL, on these tips. `main`: ops `2ece50497f`
  (pkp-lib `b17fadae59`, crossref-ops `8e82eda`). `stable-3_5_0`: ops
  `44aec6e131` (pkp-lib `4045d9241e`, crossref-ops `20f5409`). Dataset
  pkp/datasets `7912e09` (2026-10-14).
- Code reads. `main`: `PreprintCrossrefXmlFilter::process()` and
  `createPostedContentNode()`; `CrossrefExportPlugin::depositXML()`,
  `exportAndDeposit()`, `exportAsDownload()`; `CrossrefPlugin::exportSubmissions()`;
  pkp-lib `publication\Repository::version()`,
  `publication\Collector` (`orderByVersion()`, the order the filter
  reverses), `doi\Repository::getLatestMinorPublicationsForDoiDeposit()`;
  OJS `ArticleCrossrefXmlFilter::process()`. 3.5: the same filter with
  `#64`'s branch; OJS 3.5's article filter (current version only). 3.4
  (`upstream/stable-3_4_0` ops `acd8ae704b`, crossref-ops pointer
  `50cef72`, pkp-lib `55c8e406b3`): the filter as on 3.5;
  `publication\Repository::version()` clears `doiId` only under "Yes";
  `I8027_DoiVersioning` (sets "Yes" for every server) and
  `PKPI7014_DoiMigration` (one `dois` row per publication, the DOI
  string kept); `schemas/publication.json` numbers versions with one
  integer, `version`, so 3.4 has no "Minor Revision" (3.5 likewise:
  `versionMinor` is new on `main`, and the 3.5 walk's "Create New
  Version" offered no "Revision Significance"). 3.3
  (`upstream/stable-3_3_0` ops `c5532e2161`, pkp-lib `5e84acd11b`): `plugins/importexport/crossref/filter/PreprintCrossrefXmlFilter.inc.php`
  writes every published version with a stored DOI;
  `PKPPublicationService::version()` clones the publication with its
  `pub-id::doi`, and OPS `PublicationService::versionPublication()`
  gives a new DOI only when a custom suffix pattern holds `%b`.
- Introduced: blame on the loop stops at crossref-ops `3e4cad44`
  (2022, formatting); the plugin's first commit `b43eb84` (2021-04-01)
  already has it, moved from pkp/ops, where it came with "Crossref
  plugin for OPS", `383acb2e76` (ajnyga, 2020-02-06), which has no PR.
  The loop was right while each version had its own DOI; which change
  first let versions share one was not traced.
- Not driven: a deposit (the test installs reach no agency). What
  Crossref does with a repeated DOI rests on its documentation of the
  timestamp error, a Crossref support answer
  ([community.crossref.org/t/6187](https://community.crossref.org/t/how-to-fix-errors-please-help-me/6187),
  2024-06-19: a DOI repeated in one deposit gives "a timestamp error for
  all but the first instance") and `pkp/pkp-lib#12553`'s report and
  screenshot. That the DOI then reads "Error", and that other preprints
  of a batch keep their own outcome, is read in `depositXML()`,
  `exportAndDeposit()` and the deposit jobs, unverified on screen. To
  see it, a developer with Crossref test credentials sets "Username"
  and "Password" and ticks "Use the Crossref test API (testing
  environment) for the DOI deposit" on "Registration", takes steps 1-7, then "Deposit DOIs" on preprint 2: the
  code reads the deposit as failed and the DOI as "Error" (not driven
  here).
- Not walked: 3.4 and 3.3 (code); OJS's case of two major versions on
  one DOI (code).
