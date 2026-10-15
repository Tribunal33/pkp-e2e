# "Counter R5": the "Authors" column of the item reports names only each work's last author

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; no COUNTER R5 reports)
- **Introduced** `pkp/ojs#4137` and `pkp/ops#616` for `pkp/pkp-lib#8248` · [0a97d87ae2](https://github.com/pkp/ojs/commit/0a97d87ae249f4f88a7c236480cb561b6dae5631) · 2023-12-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U64 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a15)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Statistics › "Counter R5" of a journal or a preprint server, an
editor presses "Edit" on "Item Master Report (IR)", ticks "Authors"
under "Attributes To Show" and presses "Download"; on a journal,
"Journal Article Requests (IR_A1)" always has the "Authors" column. For
a work with several authors, the column names only the last one: an
article by Alan Mwandenga, Amina Mansour and Nicolas Riouf reads
"Nicolas Riouf", and a preprint by Catherine Kwantes and Urho Kekkonen
reads "Urho Kekkonen", even when the first author has an ORCID iD.
Expected: every author, in order, an iD after each who has one.

The usage figures in the row are right. A library that reads the file
would credit each work to its last author alone, and nothing in the
file says that names are missing.

## Impact

- **Lost.** The names and ORCID iDs of every author but the last, in
  every row of a work with more than one author, silently.
- **Who.** Editors and managers who download these reports, and the
  libraries and publishers' partners they send the file to.
- **Way round.** Systems that harvest the reports by machine use the
  SUSHI address instead, which journals and preprint servers both have
  for this report. It lists every author, but gives authors without an
  iD the iD of an author listed before them
  ([U64 A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A16-sushi-ir-authors-share-orcid.md),
  a separate fault). By hand, each work's public page lists all its
  authors.

Medium: one column of the file is wrong for every multi-author work,
silently, while the usage figures the report exists for are right. It
would be high if a recipient were shown to attribute usage to authors
from this column.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OPS `main`. On the journal,
  "The Signalling Theory Dividends" (submission 1, by Alan Mwandenga,
  Amina Mansour and Nicolas Riouf) and "Antimicrobial, heavy metal
  resistance and plasmid profile of coliforms isolated from nosocomial
  infections in a hospital in Isfahan, Iran" (submission 17, by Vajiheh
  Karbasizaed) are in the current issue, each with a "PDF" galley. On
  the preprint server, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence" (submission 2, by
  Catherine Kwantes and Urho Kekkonen) and "Computer Skill Requirements
  for New and Existing Teachers: Implications for Policy and Practice"
  (submission 3, by Craig Montgomerie and Mark Irvine) are on the home
  page, each with a "PDF" galley.
- A COUNTER report covers whole months only, from the month after the
  install date (or after the first publication date, if later) to the
  end of last month. On a freshly loaded dataset both dates are the day
  its dump was built, so no month can be reported yet, and no screen
  changes either date. Move them back:

  ```sql
  UPDATE versions SET date_installed = '2026-06-15 12:00:00' WHERE product_type = 'core';
  UPDATE publications SET date_published = '2026-06-15' WHERE date_published IS NOT NULL;
  ```

- The first author has an ORCID iD on record: Alan Mwandenga on the
  journal (`<id>` 1, `<email>` `amwandenga@mailinator.com`), Catherine
  Kwantes on the preprint server (`<id>` 2, `<email>`
  `ckwantes@mailinator.com`). An author gets it by verifying the iD
  through ORCID's own sign-in, which a test install cannot reach. The
  report reads only this one row:

  ```sql
  INSERT INTO author_settings (author_id, locale, setting_name, setting_value)
  SELECT a.author_id, '', 'orcid', 'https://orcid.org/0000-0002-1825-0097'
  FROM authors a
  JOIN submissions s ON s.current_publication_id = a.publication_id
  WHERE s.submission_id = <id>
    AND a.email = '<email>';
  ```

Visits, signed out [3.5: from a browser that does not name itself
"HeadlessChrome", which 3.5 counts as a robot]:

1. On the journal, open "Current", press "The Signalling Theory
   Dividends", then "PDF". On the preprint server, press "The Facets Of
   Job Satisfaction…" on the home page, then "PDF".
2. The same for the second work: "Antimicrobial, heavy metal
   resistance …" from "Current", or "Computer Skill Requirements for New
   and Existing Teachers…" from the home page, then "PDF".
3. Make the visits count for a past month, 2026-09 here. Copy the usage
   logs into the loader's `stage` folder as one file named for
   2026-09-15, with the date of each line's `time` rewritten to that
   day, remove the originals, then run the loader task and the job
   queue from the app's root:

   ```sh
   cd <files_dir>/usageStats        # files_dir as in config.inc.php
   mkdir -p stage
   sed -E 's/"time":"[0-9]{4}-[0-9]{2}-[0-9]{2} /"time":"2026-09-15 /' usageEventLogs/*.log > stage/usage_events_20260915.log
   rm usageEventLogs/*.log

   cd <the app's root>
   php lib/pkp/tools/scheduler.php test '--name=APP\tasks\UsageStatsLoader'
   php lib/pkp/tools/jobs.php work --stop-when-empty   # main
   php lib/pkp/tools/jobs.php run                      # 3.5: repeat until "No jobs available"
   ```

   Without this step the same shows by waiting: once the month of the
   visits has ended and the daily "Usage statistics file loader task"
   has run, the report offers that month.

The report:

4. Sign in as `dbarnes` and open Statistics › "Counter R5".
5. Press "Edit" on "Item Master Report (IR)". "Report Settings" opens
   with "Start Date" 2026-07-01 and "End Date" 2026-09-30.
6. Tick "Authors" under "Attributes To Show", press "Download" and open
   "counterReport.tsv". Its values are comma-separated despite the name
   ([pkp-e2e#621](https://github.com/jardakotesovec/pkp-e2e/issues/621)).
7. On the journal, press "Edit" on "Journal Article Requests (IR_A1)",
   press "Download" and open the file.

**Expected.** The "Authors" cell lists every author of the work, in
order, separated by "; " as COUNTER defines the column, each with the
iD they hold:

```
Item,Publisher,"Publisher ID",Platform,Authors,…
"The Signalling Theory Dividends",…,"Alan Mwandenga(ORCID:https://orcid.org/0000-0002-1825-0097); Amina Mansour; Nicolas Riouf",…
```

**Observed.** The cell holds the last author alone, and the first
author's iD is gone. Every row of the work reads the same (step 6; the
IR_A1 file of step 7 is the same):

```
Report_Attributes,Attributes_To_Show=Authors
…
Item,Publisher,"Publisher ID",Platform,Authors,DOI,Proprietary_ID,…,Metric_Type,Reporting_Period_Total,Jul-2026,Aug-2026,Sep-2026
"The Signalling Theory Dividends","Public Knowledge Project",,"Journal of Public Knowledge","Nicolas Riouf",…,Total_Item_Investigations,…
"Antimicrobial, heavy metal resistance and plasmid profile …","Public Knowledge Project",,"Journal of Public Knowledge","Vajiheh Karbasizaed",…
```

On the preprint server the two works read "Urho Kekkonen" and "Mark
Irvine".

## Cause

`IR::getTSVReportItems()` (OJS and OPS `classes/sushi/IR.php`, OJS
lines 477 to 488, OPS 427 to 438) builds the "Authors" cell in a loop
over the publication's authors, but assigns the cell on each pass
instead of adding to it:

```php
$authorRowValue = '';
foreach ($authors as $author) {
    $authorRowValue = $author->getFullName(true, false, $submissionLocale);
    $orcid = $author->getOrcid();
    if (!empty($orcid)) {
        $authorRowValue .= '(ORCID:' . $orcid . ')';
    }
}
array_push($resultRow, $authorRowValue); // Authors
```

COUNTER R5 defines the column as every author, "separated by
semicolon-space", each as "{author name} ({author identifier})" (Code
of Practice 5.0.2, Table 3.i).

The loop came with the file download (`pkp/pkp-lib#8248`, "Tab
Separated Values reporting for COUNTER R5") on 3.4, and was carried to
`main` unchanged in `pkp/ojs#4347` and `pkp/ops#792` (for
`pkp/pkp-lib#9666`).

Reach:

- OJS "Journal Article Requests (IR_A1)" inherits the method from `IR`
  and always shows the column (code; walked on `main` and 3.5).
- The SUSHI address's JSON (`IR::getReportItems()`) builds its own
  author list in a separate loop that keeps every author; its fault
  with the iDs is
  [U64 A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A16-sushi-ir-authors-share-orcid.md)
  (code, and walked there).
- OMP is not affected: its COUNTER reports are title and platform
  reports, with no item report and no author column. No other report
  of the three apps has one either; `Parent_Authors` is always written
  empty (code, the three apps' `classes/sushi`).
- No stored data is wrong: the cell is built from the publication's
  authors on each download.

## Proposed fix

A proposal, tried on `main`:
[`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-ir-authors-last-only/fix-ojs.diff)
and
[`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-ir-authors-last-only/fix-ops.diff),
the same change in each app's `IR.php`, joining the authors with "; ".
With it, the IR and IR_A1 files read "Alan
Mwandenga(ORCID:https://orcid.org/0000-0002-1825-0097); Amina Mansour;
Nicolas Riouf", and on the preprint server "Catherine
Kwantes(ORCID:…); Urho Kekkonen" and "Craig Montgomerie; Mark Irvine".
A control run with and without the patch, on the same loaded figures,
gave the same results both times: "Item Master Report (IR)" downloaded
without "Authors" has no "Authors" column, and the SUSHI address's
author lists are unchanged.

```diff
-                        $authorRowValue = '';
+                        $authorRowValues = [];
                         foreach ($authors as $author) {
                             $authorRowValue = $author->getFullName(true, false, $submissionLocale);
                             $orcid = $author->getOrcid();
                             if (!empty($orcid)) {
                                 $authorRowValue .= '(ORCID:' . $orcid . ')';
                             }
+                            $authorRowValues[] = $authorRowValue;
                         }
-                        array_push($resultRow, $authorRowValue); // Authors
+                        array_push($resultRow, implode('; ', $authorRowValues)); // Authors
```

The fix keeps each author's entry as it is today, "Alan
Mwandenga(ORCID:https://orcid.org/0000-0002-1825-0097)", and lists
every author. COUNTER's own example is "John Smith
(ORCID:0000-0001-2345-6789)", with a space and the bare iD, and it
recommends at most three authors. Neither is taken here:

- The iD in the file is the same full address the SUSHI answer gives as
  each author's `Identifier`. Moving the file alone to the bare iD
  would make the two outputs of one report disagree; the form of the iD
  is one decision for both, and belongs with the JSON's.
- The cap is a recommendation ("should"), and cutting at three would
  drop authors the file can carry, which is the loss this fix removes.

**Alternatives:**

- Build the cell from the JSON item's `Item_Contributors`, so the file
  and the SUSHI answer share one author list. One list instead of two
  loops, but `getTSVReportItems()` does not build the JSON items today,
  so it is a larger change than the fault needs.

**What goes with it:**

- [U64 A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A16-sushi-ir-authors-share-orcid.md)
  is the JSON's fault in the same file, with a fix of its own; the two
  can go in one pull request.
- Backport: `IR.php` is the same file on 3.5, so the diffs apply there
  as written; on 3.4 the loop is the same and they apply with a
  one-line offset.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec: "Item
  Master Report (IR)" with "Authors" ticked, for a work with several
  authors, lists every author in order.

Small: three lines in each app's `IR.php`, no data repair, tried.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/counter-ir-authors-last-only/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/counter-ir-authors-last-only/walk.js)
  (helpers in `lib.js` beside it), run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,ops <walk.js>`
  (add `neighbour` for the fix's control). It ran on installs freshly
  loaded from PKP's default test dataset (pkp/datasets 7912e09,
  2026-10-14, the `main` and `stable-3_5_0` PostgreSQL dumps), with the
  SQL of the preconditions, a reader's visits through the screens, and
  step 3 as the same file handling in JavaScript with the same task and
  queue commands (the shell lines themselves were run as written for
  `docs/issues/U64-OJS5-ir-a1-lists-investigation-rows.md`). On 3.5 the
  visits came from a browser with an ordinary Chrome user agent.
- The ORCID row: `IR` reads only `orcid` (`Identity::getOrcid()`, the
  plain setting). The app writes that row when an author verifies an
  iD through ORCID (`PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()`,
  with token rows beside it, production `OrcidManager::ORCID_URL`) and
  alone when a Native XML import brings an author's `<orcid>`
  (`NativeXmlPKPAuthorFilter`). The first walks wrote the verified
  sign-in's full set of rows, the revision walks the one row: the same
  cells both times.
- Walked on `main` and 3.5, OJS and OPS, twice each (before and after
  the revision): the same cells every time ("Nicolas Riouf", "Vajiheh
  Karbasizaed"; "Urho Kekkonen", "Mark Irvine"). The dataset's two
  authors of OPS submission 3 both have `seq` 0 on 3.5, so which of
  them is "last" there follows the database's order; on `main` they are
  0 and 1.
- The COUNTER definition is quoted from the Code of Practice 5.0.2,
  "Formats for COUNTER Reports", Table 3.i, read 2026-10-15
  (https://cop5.projectcounter.org/en/5.0.2/03-specifications/02-formats-for-counter-reports.html).
  Unverified: no COUNTER validator was run on the file.
- The fix was applied with `node bin/try-fix.js apply` (each app's
  diff to its app) on `main`, with the first walks' precondition: the
  Steps with the fix in on a freshly loaded install, and the control
  with the fix in and out on the figures those Steps had loaded.
- main walked at OJS 378eced941 and OPS 2ece50497f (lib/pkp b17fadae59,
  lib/ui-library 47b565cb). 3.5 walked at OJS ca763c91cd and OPS
  44aec6e131 (lib/pkp 4045d9241e).
- Code read on main: OJS and OPS `classes/sushi/IR.php`
  (`getTSVColumnNames()`, `getTSVReportItems()`, `getReportItems()`),
  OJS `IR_A1.php`, `TR.php`, `PR.php`; OMP `classes/sushi/`; lib/pkp
  `classes/sushi/CounterR5Report.php`. The file is comma-separated
  because `getReportResponse()` hands the rows to
  `response()->withFile()`, whose default is CSV (pkp-e2e#621).
- 3.4 by code: OJS `upstream/stable-3_4_0` (daf0ca971d) and OPS
  `upstream/stable-3_4_0` (acd8ae704b) `classes/sushi/IR.php` have the
  same loop (OJS lines 480 to 488, OPS 430 to 438).
- 3.3 by code: OJS `upstream/stable-3_3_0` (d7d9dd14ec) has no
  `classes/sushi`; its COUNTER reports are Release 4
  (`plugins/reports/counter`, "Article Report 1" without authors). OPS
  `upstream/stable-3_3_0` (c5532e2161) has no COUNTER reports.
- Introduced: `git blame` on `main` gives OJS 84bdee7ff0 and OPS
  f314023a48 (committed under `pkp/pkp-lib#8248`), the `main` port in
  `pkp/ojs#4347` and `pkp/ops#792` (merged 2024-10-15 and 16, for
  `pkp/pkp-lib#9666`, "Migrate TSV COUNTER R5 Reports to main/3.5
  release"). The loop was first written for 3.4 in OJS 0a97d87ae2
  (2023-12-12, `pkp/ojs#4137`) and OPS 1483791845 (2024-01-16,
  `pkp/ops#616`), both merged 2024-01-24 for `pkp/pkp-lib#8248`.
- Upstream search, 2026-10-15, pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library, issues and PRs, open and closed, by COUNTER with
  authors and with ORCID, "Item Master Report", `Item_Contributors`,
  `getTSVReportItems` and "COUNTER R5 TSV": only the issues and PRs
  that built the feature.
- The walks ran on PostgreSQL.
