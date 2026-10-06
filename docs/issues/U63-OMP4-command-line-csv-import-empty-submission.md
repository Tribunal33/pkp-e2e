# A press's command-line CSV import stops with a fatal error, imports nothing and leaves an empty submission

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11765` (for `pkp/pkp-lib#857` by its branch name) · [52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90) · 2025-11-11, merged 2025-11-20 · jyhein (jyhein)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#omp4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press loads monographs in bulk with "Tab Delimited Content Import
Plugin", which runs only from the server's command line. With the
plugin's own sample file, the tool stops with a PHP fatal error at the
first author, before any import message. No monograph is imported, and
the rows after that one are never read.

Each run also leaves a new submission with no title, no author and no
file. It sits at the top of the editors' "Active submissions" as
"Incomplete". A press manager can delete it, and the monographs can be
entered another way.

Only the development line has the fault; no release does. Every file
fails at its first row that names an author.

## Impact

- **Lost.** The whole import, and the time spent preparing the file.
  Nobody is told why beyond the PHP error.
- **Who.** Whoever runs the tool on the server for a press: today a
  developer or tester on `main`, after the next release any press that
  bulk-loads titles with it.
- **Way round.** The Native XML Plugin imports monographs, from Tools
  or from its own command line, and "Start A New Submission" enters one
  title at a time. The Dashboard's "Delete Incomplete Submissions"
  removes the empty submissions.

Medium: the tool fails on every file with a fatal error and leaves an
empty submission behind, but it is a bulk shortcut with other ways in.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP), press `publicknowledge`.
- A shell in the OMP directory of that install.
- A file `u63ir22.csv`: the plugin's own
  `plugins/importexport/csv/sample.csv` with its title replaced by
  "Monograph u63ir22", and its `submission.pdf`, which the OMP tree
  lacks, replaced by `cypress/fixtures/dummy.pdf`:

  ```
  pressPath,authorString,title,abstract,seriesPath,year,isEditedVolume,locale,filename,doi
  publicknowledge,Author1 Surname1<author@pkp.sfu.ca>;Author2 Surname2<author2@sfu.pkp.ca>,Monograph u63ir22,Abstract text,,2024,1,en,cypress/fixtures/dummy.pdf,https://doi.org/10.1111/hex.12487
  ```

Steps:

1. Sign in as `dbarnes`. The Dashboard's side menu reads "16 Active
   submissions" and "2 Published".
2. From the OMP directory, run
   `php tools/importExport.php CSVImportExportPlugin u63ir22.csv admin`.
3. On the Dashboard, open "Published".
4. Search for "Monograph u63ir22". Press "View" on the row found, then
   "Contributors".
5. Open "Active submissions" and look at the top row.

**Expected.** Step 2 prints:

```
Submission: 'Monograph u63ir22' successfully imported.
```

In step 3, "Published" counts 3 and lists "Surname1 et al. — Monograph
u63ir22". Step 4 finds that row, "Published", and its Contributors list
"Author1 Surname1" and "Author2 Surname2", each "Author". Step 5 shows
no new row.

**Observed.** Step 2 ends in a PHP fatal error with exit status 255,
before any import message. Where the error shows depends on the PHP
command line's `display_errors`. With it off, as on the walked install,
standard output stays empty and the error stream reads:

```
PHP Fatal error:  Uncaught Error: Call to undefined method APP\author\Author::setUserGroupId() in …/plugins/importexport/csv/CSVImportExportPlugin.php:220
```

With it on (PHP's development `php.ini`), the same error goes to
standard output as `Fatal error: Uncaught Error: Call to undefined
method APP\author\Author::setUserGroupId() …`.

"Published" still counts 2, and step 4 shows "Search Results (0)" and
"No Items". In step 5, "Active submissions" now counts 17, and its top
row reads "19", "Incomplete", with no title and no author, and a
"Complete submission" button. That button opens "Make a Submission:
Upload Files" for submission 19, with no file.

## Cause

`CSVImportExportPlugin::executeCLI()` (OMP,
`plugins/importexport/csv/CSVImportExportPlugin.php`) builds each
author with `$author->setUserGroupId($authorGroup->id)` (line 220).
52d3a0f8e7, "Contributor Roles and Type", replaced an author's user
group with a contributor type and contributor roles, and removed
`Author::setUserGroupId()` and `getUserGroupId()`. The OMP side of that
change, `pkp/omp#2164`, updated the press's own classes and tests, but
not this plugin, so the call now ends the script.

When that line fails, the row's import is half done.
`Repo::submission()->add()` has already stored the submission and its
first version. The status, stage and the other fields are set on the
objects before the author loop (lines 186 to 192) but saved only after
it (lines 232 and 233), and the title is set only after it (line 231).
So the new submission keeps the defaults of `add()`: "Incomplete"
(`submission_progress` "start"), in the submission stage, with no
title. The authors, the "PDF" format and the file are never written.

Reach:

- Every file: the run stops at the first row whose author string
  matches the plugin's name pattern, and the rows after it are never
  read. A row whose authors all fail the pattern is skipped as
  "invalid author" and imported with no author. Walked for the sample
  row; the rest read in the code.
- No other code in OJS, OMP or OPS calls `setUserGroupId()` or
  `getUserGroupId()` on an author: checked in the code (the three apps'
  `classes`, `pages`, `plugins` and their `lib/pkp`). The QuickSubmit
  plugin had the same call and was fixed under `pkp/pkp-lib#12179`.
- The web: nothing, since the tool has no page of its own (its Tools
  link is `pkp/pkp-lib#8785`).

## Proposed fix

Give each imported author the press's "Author" contributor role, as
`Repo::author()->newAuthorFromUser()` does for a submitting author, and
look the role up where the plugin looked up the author group. This is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-csv-import-empty-submission/fix.diff),
one file in OMP:

```diff
-            $authorGroup = UserGroup::withContextIds([$press->getId()])
-                ->withRoleIds([Role::ROLE_ID_AUTHOR])
-                ->isDefault(true)
-                ->get()
+            $authorRole = ContributorRole::query()
+                ->withContextId($press->getId())
+                ->withIdentifier(ContributorRoleIdentifier::AUTHOR->getName())
                 ->first();
-            if (!$authorGroup) {
+            if (!$authorRole) {
 …
-                $author->setUserGroupId($authorGroup->id);
+                $author->setData('contributorType', ContributorType::PERSON->getName());
+                $author->setContributorRoles([$authorRole]);
```

with the three `use` lines for `ContributorRole`,
`ContributorRoleIdentifier` and `ContributorType` in place of `Role`
and `UserGroup`. The type line matches `newAuthorFromUser()`; PERSON is
also the `contributor_type` column's default
(`lib/pkp/classes/migration/install/SubmissionsMigration.php`, line
118), so the role is the line that matters. The Native XML import's
author filter (`NativeXmlPKPAuthorFilter`) falls back to the same
"Author" role the same way.

Tried on `main`: step 2 prints the Expected line, step 4 finds the
monograph with its two authors, each "Author", and step 5 shows no new
row. "Published" still counts 2: see the stage below. A row naming a
press the site lacks is still skipped with `Unknown Press:
"nosuchpress".  Skipping.` and adds nothing, with the fix in and out.

**Alternatives**

- Bring back `setUserGroupId()` on `Author` as a deprecated shim. It
  would store a value nothing reads any more, and the authors would
  have no role.
- Drop the `setUserGroupId()` line alone. The type falls back to the
  column's default, but the authors get no role, which the contributor
  form does not allow.

**What goes with it**

- The stage. The plugin marks the submission published and sets it to
  "Production", but never publishes its version, which reads "Status:
  Unscheduled" (on 3.5 too). On `main`, a submission moves to the new
  "Done" stage when a version is published (`ApplyDoneWorkflowStage`,
  on `PublicationPublished`), and "Published" lists that stage only. So
  even with the fix, the monograph is not counted in "Published" on
  `main`. The same change should decide this, for example by
  publishing the version through `Repo::publication()->publish()`
  instead of setting the status. Not tried.
- The empty submission comes from the plugin writing a row in several
  saves. Wrapping each row in a database transaction would make any
  later failure leave nothing behind. Not tried.
- The message `plugins.importexport.csv.noAuthorGroup` ("There is no
  default author group in the press …") now answers a missing "Author"
  role. Its wording could follow.
- No stored data to repair, and no API or hook change.
- Guard: a PHPUnit test in OMP that runs `executeCLI()` on a CSV file
  of its own with a PDF fixture, since `sample.csv` names a
  `submission.pdf` the OMP tree lacks, and that stays off the error
  paths, which call `exit`. It reads back the title and the two
  authors with their role.

Small: a few lines in one OMP file, and a unit test.

## Evidence

- The steps, as a Playwright script on an install loaded from PKP's
  default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-csv-import-empty-submission/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-csv-import-empty-submission/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/command-line-csv-import-empty-submission/walk.js`.
  It runs step 2 from the OMP directory with `PKP_CONFIG_FILE` set to
  the install's config, and records the tool's output, exit status and
  error stream. It also reads the newest submission in the database
  (status, stage, title, authors, formats, files), to confirm what the
  screens show. OJS and OPS ship no such plugin.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/command-line-csv-import-empty-submission/fix.diff omp`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/command-line-csv-import-empty-submission/neighbour.js)
  with the same command, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/command-line-csv-import-empty-submission/fix.diff omp`.
  neighbour.js imports a row naming `nosuchpress` and counts the
  press's submissions before and after.
  With the fix, the database held submission 19 with status published,
  in the production stage, titled "Monograph u63ir22", with two authors
  of type `PERSON`, each with one contributor role, one publication
  format and one file. Its version's status stayed unpublished.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `omp/main/pgsql` and `omp/stable-3_5_0/pgsql`:
  - main: OMP 3b0ecf794 (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OMP 3081c9b00 (lib/pkp a9c76aed62), which gives the
    Expected, "3 Published" included. The plugin's line 221 calls
    `setUserGroupId()`, which 3.5's `Author` still has (line 90).
  The Dashboard search reads only the open view on 3.5, and every
  submission on `main`; opening "Published" first makes step 4 find
  the monograph on both.
- Read in the code, not walked: the `display_errors` On form of the
  error (PHP's own behaviour); "Delete Incomplete Submissions"
  (ui-library `useDashboardBulkDelete.js`, `canBeDeleted()`: an
  incomplete submission, for a manager or the site administrator); a
  row whose authors all fail the name pattern (line 208).
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441f, pkp-lib df13621c2d.
  The plugin calls `setUserGroupId()` (line 221), and pkp-lib's
  `Author` has it (line 108). 52d3a0f8e7 is not on the branch (no
  "Contributor Roles and Type" in its log).
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc8836, pkp-lib d446601ebe.
  The plugin calls `setUserGroupId()` (`CSVImportExportPlugin.inc.php`,
  line 824), and `PKPAuthor` has it (line 125). Not on the branch
  either.
- Introduced: `git blame` on line 220 gives 6fcbd6c55f (2024-12-13,
  `pkp/pkp-lib#10506`, the user group move to Eloquent), when the call
  still worked. `git log -S "function setUserGroupId"` on pkp-lib's
  `classes/author/Author.php` gives 52d3a0f8e7 (authored 2025-11-11),
  which removed it. It was merged on 2025-11-20 in `pkp/pkp-lib#11765`,
  with `pkp/omp#2164`, whose OMP commit 20e8a26c9 does not touch the
  plugin. The PR names no issue. Its branch, `f857`, is the only link
  to `pkp/pkp-lib#857` ("Add support for CRediT standard for
  contributor attribution").
- Upstream search 2026-10-01 in pkp/pkp-lib, pkp/omp and
  pkp/ui-library, by the symptom's words and by `setUserGroupId` and
  `CSVImportExportPlugin`. `pkp/pkp-lib#12179` (closed) is the same
  removed call in QuickSubmit, fixed there only. `pkp/pkp-lib#10116`
  (open) reports other CSV import errors on OMP 3.3.
- MySQL not checked.
