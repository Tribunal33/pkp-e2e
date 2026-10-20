# A journal's Crossref deposit names a DOI twice, older version first, after "DOI Versioning" is switched on

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (a journal has no "DOI Versioning")
  - 3.4: none (code; as 3.5)
  - 3.3: none (code; the current version only)
- **Introduced** `pkp/crossref-ojs#81` for `pkp/pkp-lib#11590` · [6970a0b](https://github.com/pkp/crossref-ojs/commit/6970a0b89442e405cd984f1b5837d654c3d0dc25) · 2025-11-26 (merged 2025-12-07) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-20)
- **Tracked in** spec U45 [OJS11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U45-dois.md#ojs11)
- **Checked** 2026-10-20, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An article of a journal that registers DOIs with Crossref has two
published major versions that share one DOI: 2.0 was made with "Major
Revision" while "DOI Versioning" was "No", the journal's default. After
the journal saves "DOI Versioning" "Yes", the article's Crossref file
lists that DOI twice. "Export DOIs" downloads this file and a deposit
sends it. It holds one record per major version, the oldest first, each
pointing to its own version's page. It should hold one record, the
newest version's.

Crossref documents that it takes the first record of a DOI in a
deposit and refuses each repeat, so such a deposit would register the
DOI with version 1.0's page and date, and the journal would show the
DOI as "Error" after every deposit of that article. The DOIs page gives
no hint why: "View all" lists both versions with the same DOI. Saving
"DOI Versioning" back to "No" makes the file right again, at the cost of
versioning.

Articles carried over from an earlier release with more than one
version are in the same state, since their versions kept one DOI there.

## Impact

- **Lost:** a correct deposit. The file names the DOI once per major
  version, the oldest first, so by Crossref's rule the DOI would point
  to the oldest version, and the "Error" status would not say why.
- **Who:** journals depositing with Crossref that turn "DOI Versioning"
  on, for every article with two or more published major versions
  sharing a DOI.
- **Way round:** save "DOI Versioning" "No" again: the file then holds
  the current version alone, at the article's unversioned page. The
  journal gives up a DOI per version until the fix.

Medium: the deposit file is wrong for every such article, and the way
round costs the journal the versioning it chose. It would be high if a
deposit to Crossref, which the test installs cannot reach, showed an
already registered DOI moved back to the older version's page.

## Steps to reproduce

These steps show the Crossref file. Seeing a deposit turn "Error" needs
a Crossref account (test credentials in the plugin's settings) and is
not part of the steps; Evidence gives what the code and Crossref's
documentation say about it.

Preconditions:

- PKP's default test dataset, OJS `main`. "Journal of Public Knowledge"
  has DOIs on for articles, no prefix, no registration agency and
  "DOI Versioning" "No"; the Crossref plugin is off. Article 17,
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", is published with one version, 1.0.
- An install that reaches crossref.org downloads the exported file. One
  that cannot fetch Crossref's schema shows an "Error" window instead
  (below), and the file it built stays in the files directory's `temp`
  folder, named `crossrefplugin-<date>-<time>-articles-1.xml`.

Steps:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Crossref Manager Plugin".
3. Settings › Distribution › "DOIs" › "Setup": "DOI Prefix" `10.1234`,
   "Save" ("DOI Versioning" stays "No").
4. "Registration": "Registration Agency" "Crossref", "Depositor Name"
   `Public Knowledge Project`, "Depositor Email"
   `dbarnes@mailinator.com`, "Save" ("Crossmark" stays unticked).
5. Side menu "DOIs": tick article 17; "Bulk Actions" › "Assign DOIs" ›
   "Assign DOIs". It gets a DOI (`10.1234/gg04rm95` in the walk).
6. Open article 17; "Create New Version"; "Revision Significance"
   "Major Revision"; "Confirm". Version 2.0 keeps 1.0's DOI. [3.5:
   "Create New Version" offers no "Revision Significance"; it asks "Are
   you sure you want to create a new version?", answered "Yes".]
7. On version 2.0's "Title & Abstract": "Publish"; "Confirm" in "Review
   Publishing Details"; "Publish".
8. "DOIs": tick article 17; "Bulk Actions" › "Export DOIs" › "Export
   DOIs".
9. "Setup": "DOI Versioning" "Yes", "Save". [3.5: a journal's "Setup"
   has no "DOI Versioning"; steps 9 and 10 are left out.]
10. "Registration": "Update Policy DOI", now shown and required,
    `10.1234/policy`, "Save".
11. "Export DOIs" on article 17 again.
12. "DOIs": expand article 17's row; "View all".

Way round, from step 11:

13. "Setup": "DOI Versioning" "No", "Save".
14. "Export DOIs" on article 17 again.

**Expected.** The file of step 11 holds one `journal_article` record
for the DOI, version 2.0's, as the file of step 8 does.

**Observed.** On the test install, which cannot reach crossref.org,
each "Export DOIs" answers 400 and the "Error" window reads "An XML
validation error occurred and the XML could not be exported." over
"Failed to locate the main schema resource at
'https://www.crossref.org/schemas/crossref5.4.0.xsd'.". Step 8's file
holds one record, 2.0's, at `/article/view/17`. Step 11's file holds
two records for one DOI, under the file's one `<timestamp>`, 1.0's
first:

```xml
<timestamp>20261020031947000</timestamp>
…
<journal_article publication_type="full_text" language="en">
  …
  <publication_date media_type="online"><month>10</month><day>19</day><year>2026</year></publication_date>
  …
  <doi_data>
    <doi>10.1234/gg04rm95</doi>
    <resource>…/index.php/publicknowledge/article/view/17/version/18</resource>
  </doi_data>
</journal_article>
…
<journal_article publication_type="full_text" language="en">
  …
  <publication_date media_type="online"><month>10</month><day>20</day><year>2026</year></publication_date>
  <crossmark>
    …
    <updates>
      <update type="new_version" date="2026-10-20">10.1234/gg04rm95</update>
    </updates>
    …
  </crossmark>
  <rel:program>
    <rel:related_item>
      <rel:intra_work_relation relationship-type="isVersionOf" identifier-type="doi">10.1234/gg04rm95</rel:intra_work_relation>
    </rel:related_item>
  </rel:program>
  <doi_data>
    <doi>10.1234/gg04rm95</doi>
    <resource>…/index.php/publicknowledge/article/view/17/version/22</resource>
  </doi_data>
</journal_article>
```

The file is valid against Crossref's 5.4.0
schema, so an install that reaches crossref.org downloads it as it is,
and a deposit sends it. At step 12 the row reads "Version of Record
2.0", "There are 2 versions. View all", and "View all" lists "Version
of Record 1.0 (2026-10-19)" and "Version of Record 2.0 (2026-10-20)",
each with `10.1234/gg04rm95`, "Unregistered".

Way round: step 14's file holds one record, 2.0's, at `/article/view/17`
(walked separately, with its own DOI, `10.1234/p2e39z89`).

## Cause

`ArticleCrossrefXmlFilter::process()`
([crossref-ojs `filter/ArticleCrossrefXmlFilter.php`, lines 87-103](https://github.com/pkp/crossref-ojs/blob/a49e612525733236223a74631131b2297b5b3d42/filter/ArticleCrossrefXmlFilter.php#L87-L103))
writes the current version alone while "DOI Versioning" is "No". Under
"Yes" it writes a record for each publication that
`PKP\doi\Repository::getLatestMinorPublicationsForDoiDeposit()`
([pkp-lib `classes/doi/Repository.php`, lines 453-476](https://github.com/pkp/pkp-lib/blob/042726ebf6da656b4d3485644d644a0a6fc3b48f/classes/doi/Repository.php#L453-L476))
returns: the newest published minor version of each version stage and
major version. The helper assumes each major version has a DOI of its
own and never checks whether two of the publications it picks carry
the same DOI.

Major versions do share a DOI. `PKP\publication\Repository::version()`
gives a new version a DOI of its own only when "DOI Versioning" is on
and the version is not minor; otherwise the new version keeps its
source's `doiId`. A journal starts on "No" (OJS `schemas/context.json`:
`doiVersioning` defaults to false), so a major version made before the switch keeps the DOI, and
the switch changes nothing stored.

The loop walks the versions oldest first, collecting each DOI it wrote
in `$versionsDois` for the next records' relations. So the older
version's record comes first, and the newer one's lists the shared DOI
as both its `isVersionOf` relation and its Crossmark update. Crossref
takes one record per DOI from a deposit: every record carries the
file's one `<timestamp>`, and Crossref refuses a record whose timestamp
is not above the last one it took for that DOI
([Crossref, troubleshooting submissions](https://www.crossref.org/documentation/register-maintain-records/verify-your-registration/troubleshooting-submissions/)).
`CrossrefExportPlugin::depositXML()` reads a failure count above zero
in Crossref's answer as a failed deposit and sets the DOI to
`Doi::STATUS_ERROR` with Crossref's messages. With "Crossmark" ticked,
`appendCrossmarkNode()` also gives each record an in-situ update naming
its own DOI (another published version shares its `doiId`), with or
without the fix; the Steps leave it unticked.

Reach:

- Every use of the file goes through this filter: "Export DOIs",
  "Deposit DOIs", "Deposit All" and automatic deposit (code; "Export
  DOIs" on screen). Each article goes to Crossref in a file of its own
  (`exportAndDeposit()` exports one object per file; "Deposit All"
  queues one `DepositSubmission` job per article), so a repeated DOI
  fails only its own article's deposit, not the batch (code).
- Versions carried over from 3.5 or 3.4 (code): a journal there has
  "DOI Versioning" off with no setting on screen (`I8027_DoiVersioning`
  stores 0 for every journal), so each new version kept its source's
  DOI, and the 3.6 upgrade (`I4860_MigratePublicationVersion`) numbers
  each old version N as N.0. Every article with more than one published
  version is written once per version after the switch.
- Cited-by matching (code): `CrossrefCitationDoiHandler::getPublicationsToCheck()`
  takes the same helper and asks Crossref about the shared DOI once per
  such version. Crossref answers with the references of the record it
  holds, keyed by citation ID (`key` is `$citation->getId()` in the
  file), and each version has its own citation rows
  (`copyCitations()`). So only the version whose record Crossref took,
  1.0 by its first-record rule, gets its references' DOIs filled in;
  2.0's, the current version's, never do.
- "Deposit All" (code): `doi\DAO::whereDepositablePublication()`
  applies the helper's rule in SQL to pick the DOIs and articles to
  queue. It selects DOI rows, so a shared `doiId` is one row there, and
  `updateDepositStatus()` sets the status of every published version's
  DOI rows (`getPublishedDoisForSubmission()`). It needs no change with
  the fix.
- A preprint server writes a DOI once per posted version from its own
  filter, newest first:
  [pkp-e2e#980](https://github.com/jardakotesovec/pkp-e2e/issues/980),
  with a fix of its own in `pkp/crossref-ops`. A press has no Crossref
  plugin.

## Proposed fix

Keep each DOI once in `getLatestMinorPublicationsForDoiDeposit()`, with
the newest of the publications that carry it. The helper already
receives the versions in version order (`Collector::orderByVersion()`),
so the last publication picked for a DOI is the one to keep
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-crossref-file-doi-twice/fix.diff)):

```diff
--- a/lib/pkp/classes/doi/Repository.php
+++ b/lib/pkp/classes/doi/Repository.php
@@ -472,7 +476,21 @@
                 $result[$versionStage][$versionMajor] = $publication;
             }
         }
-        return $result;
+        // The newest publication carrying each DOI, by its place in the version order
+        $newestByDoi = [];
+        foreach ($result as $versionStage => $publicationsByMajor) {
+            foreach ($publicationsByMajor as $publication) {
+                $newestByDoi[$publication->getDoi()] = $publication->getId();
+            }
+        }
+        foreach ($result as $versionStage => $publicationsByMajor) {
+            foreach ($publicationsByMajor as $versionMajor => $publication) {
+                if ($newestByDoi[$publication->getDoi()] !== $publication->getId()) {
+                    unset($result[$versionStage][$versionMajor]);
+                }
+            }
+        }
+        return array_filter($result);
     }
```

The helper is what both callers, the article filter and cited-by
matching, use to choose the versions a deposit takes, so both then get
one publication per DOI. Dropping the older publication before the
filter runs also keeps the newer record's relations right:
`$versionsDois` no longer holds the record's own DOI.

The check compares the DOI string, not `doiId`, because Crossref keys
on the string. Versions carried over from 3.3 have a `dois` row each
with the same string (the 3.4 upgrade, `PKPI7014_DoiMigration`, made
one row per publication), and a `doiId` check would still write them
twice. Their older row needs nothing more: `updateDepositStatus()`
sets every published version's DOI rows from the one deposit, and
`doi\DAO::whereDepositablePublication()` needs no matching change.

Cited-by matching then asks about the newest version alone and fills
in its references' DOIs, as a journal on "No" does for the current
version; the older version's references are no longer checked, which
is wanted as long as Crossref holds the newest version's record.

Tried on `main` with the Steps: step 11's file then held one record,
2.0's, with no relation or Crossmark update naming its own DOI, and
passed the schema. A second check shows the fix keeps the versions that
have DOIs of their own: under "Yes" from step 3, 1.1 made with "Minor
Revision" (1.0's DOI) and 2.0 with "Major Revision" (a new DOI), both
published. With and without the fix the file held the same two
records, 1.1's, then 2.0's naming 1.1's DOI as the one it is a version
of. A proposal; the team decides.

**Alternatives:**

- The same check in `ArticleCrossrefXmlFilter::process()`: it fixes the
  file, but cited-by matching keeps checking the older version, and
  every future caller of the helper needs it again.
- Give each major version a DOI of its own when "DOI Versioning" is
  saved "Yes": that rewrites registered DOIs, a product decision, and
  versions already registered under one DOI cannot take another.

**What goes with it:**

- `pkp/crossref-ops#67` (open), which brings this versioning to a
  preprint server, copies the helper as its filter's
  `getLatestMinorPublications()`; calling
  `Repo::doi()->getLatestMinorPublicationsForDoiDeposit()` there would
  give the preprint server the same rule.
- No backport: 3.5 and earlier write the current version alone.
- The guard: a unit test of the helper with two published major
  versions on one DOI and a third with a DOI of its own. pkp-lib has
  none for this helper yet.
- No data repair: the next deposit of an "Error" DOI sends the right
  file.

Small: one shared method, tried, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-crossref-file-doi-twice/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/journal-crossref-file-doi-twice/lib.js),
  on an install freshly loaded from the dataset:
  `[WALK=wayround|neighbour] PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/journal-crossref-file-doi-twice/walk.js`.
  No `WALK` takes steps 1-12 (walked on 3.5 too, where step 11's file
  holds one record, version 2's), `wayround` steps 1-11, 13 and 14,
  `neighbour` the second check of the fix, walked with `fix.diff`
  applied and again without it. The script reads the file "Export DOIs" leaves in
  the files directory's `temp` folder and checks it against Crossref's
  5.4.0 schema outside the app
  ([validate.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-crossref-file-doi-twice/validate.php)).
- Walks ran on PostgreSQL, on these tips. `main`: ojs `6b4323ced7`
  (pkp-lib `042726ebf6`, crossref-ojs `a49e612`). `stable-3_5_0`: ojs
  `b56f8b74ff` (pkp-lib `cd82be0528`, crossref-ojs `97a9311`). Dataset
  pkp/datasets `35759b4c` (2026-10-19).
- Code reads. `main`: crossref-ojs `ArticleCrossrefXmlFilter::process()`,
  `createJournalArticleNode()`, `appendCrossmarkNode()`,
  `appendRelationships()`, `CrossrefCitationDoiHandler::getPublicationsToCheck()`;
  pkp-lib `doi\Repository::getLatestMinorPublicationsForDoiDeposit()`,
  `doi\DAO::whereDepositablePublication()` (selects DOI rows, so a
  shared DOI is one row there), `publication\Repository::version()`,
  `publication\Collector` (`orderByVersion()`), `submission\DAO::fromRow()`
  (publications loaded in version order), `doi\Repository::getPublishedDoisForSubmission()`,
  `migration/upgrade/v3_6_0/I4860_MigratePublicationVersion`; ojs
  `schemas/context.json` (`doiVersioning` default false),
  `I8027_DoiVersioning`; crossref-ojs `CrossrefExportPlugin::updateDepositStatus()`,
  `exportAndDeposit()`, `CrossrefCitationDoiHandler::processPendingCitationDois()`. 3.5: the article filter writes
  `getCurrentPublication()` alone; pkp-lib has no
  `getLatestMinorPublicationsForDoiDeposit()`. 3.4
  (`upstream/stable-3_4_0` ojs `0012bd1022`, crossref-ojs pointer
  `f073a208eb`, pkp-lib `a71d6bd2ca`): the filter as on 3.5. 3.3
  (`upstream/stable-3_3_0` ojs `d7d9dd14ec`, pkp-lib `5e84acd11b`):
  `plugins/importexport/crossref/filter/ArticleCrossrefXmlFilter.inc.php`
  writes the current publication alone.
- Introduced: blame on the loop and the helper leads to crossref-ojs
  `6970a0b` (`pkp/crossref-ojs#81`), which added the "Yes" branch with
  the helper as the filter's `getLatestMinorPublications()`; pkp-lib
  `aab60cd585` (`pkp/pkp-lib#12104`, 2026-03-18) moved it to
  `doi\Repository` unchanged.
- Not driven: a deposit (the test installs reach no agency). What
  Crossref does with a repeated DOI rests on its documentation of the
  timestamp error and a Crossref support answer
  ([community.crossref.org/t/6187](https://community.crossref.org/t/how-to-fix-errors-please-help-me/6187),
  2024-06-19: a DOI repeated in one deposit gives "a timestamp error for
  all but the first instance"). That the DOI then reads "Error", and
  what cited-by matching gets back, is read in the code. To see it, a
  developer with Crossref test credentials sets "Username" and
  "Password" and ticks "Use the Crossref test API (testing environment)
  for the DOI deposit" on "Registration", takes steps 1-10, then
  "Deposit DOIs" on article 17.
- Unverified: an article carried over from 3.5 with two versions (read
  in the code, not walked); whether a deposit after the switch moves an
  already registered DOI back to the older page; MySQL not checked.
