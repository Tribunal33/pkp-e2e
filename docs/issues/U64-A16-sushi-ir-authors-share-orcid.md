# SUSHI "Item Master Report (IR)" gives authors without an ORCID iD the iD of an author listed before them

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code; no COUNTER R5 reports)
- **Introduced** `pkp/ojs#3465` and `pkp/ops#313` for `pkp/pkp-lib#6782` · [5b00b02642](https://github.com/pkp/ojs/commit/5b00b026428b1c6856b24e7208fe17accc9c1235) · 2021-12-10 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U64 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#a16)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A harvesting system asks the SUSHI address of a journal or a preprint
server for "Item Master Report (IR)" with the authors shown: the same
report and options as "Download" on Statistics › "Counter R5" with
"Authors" ticked, served as JSON. Each work lists all its authors, but
once one author in the report has an ORCID iD, every author without
one who comes after is given that iD, in the same work and in the
works that follow. In an article by Alan Mwandenga, Amina Mansour and
Nicolas Riouf where only Alan Mwandenga has an iD, all three carry
his, and so does Vajiheh Karbasizaed, the sole author of the next
article in the report. Expected: an iD only on the authors who have
one.

A system that matches authors by their iD would take all these authors
for one researcher and credit that researcher with the usage of works
they did not write. Nothing in the answer shows that the iDs are
borrowed. The file "Download" gives is built separately and carries no
borrowed iD.

## Impact

- **Lost.** The correct identity of every author without an iD who is
  listed after one with an iD. Copies already harvested keep the wrong
  iDs; a fix does not change them, but the answer is built on each
  request, so asking again for the same months after the fix gives the
  right ones.
- **Who.** Libraries and publishers' partners whose systems harvest the
  SUSHI address with the authors asked for, on every journal or server
  where at least one author has an iD. An editor sees it only by
  opening the address in a browser and reading the JSON.
- **Way round.** None that keeps the iDs. A harvester can only leave
  the authors out of its request or ignore the identifiers. An editor
  can send the downloaded file instead, which has no borrowed iDs but
  names only each work's last author
  ([U64 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A15-counter-ir-authors-column-last-author-only.md),
  a separate fault).

Medium: in a machine-read report, the author list beside the usage
figures carries wrong identifiers for many authors, silently, while the
figures themselves are right. It would be high if a harvester in use
were shown to attribute usage to researchers by these iDs.

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

4. Sign in as `dbarnes`.
5. Type the SUSHI address of the report with the authors shown, the
   same on the journal and the preprint server:
   `/index.php/publicknowledge/api/v1/stats/sushi/reports/ir?begin_date=2026-07-01&end_date=2026-09-30&customer_id=0&attributes_to_show=Authors`.

**Expected.** Only Alan Mwandenga (on the preprint server, Catherine
Kwantes) carries an `Identifier`.

**Observed.** The answer (200) gives the other authors his iD, in his
article and in the next one:

```json
"Report_Items": [
  {"Title": "The Signalling Theory Dividends", …,
   "Item_Contributors": [
     {"Type": "Author", "Name": "Alan Mwandenga", "Identifier": "https://orcid.org/0000-0002-1825-0097"},
     {"Type": "Author", "Name": "Amina Mansour", "Identifier": "https://orcid.org/0000-0002-1825-0097"},
     {"Type": "Author", "Name": "Nicolas Riouf", "Identifier": "https://orcid.org/0000-0002-1825-0097"}]},
  {"Title": "Antimicrobial, heavy metal resistance and plasmid profile …", …,
   "Item_Contributors": [
     {"Type": "Author", "Name": "Vajiheh Karbasizaed", "Identifier": "https://orcid.org/0000-0002-1825-0097"}]}
]
```

On the preprint server Urho Kekkonen, Craig Montgomerie and Mark
Irvine all carry Catherine Kwantes's iD.

## Cause

`IR::getReportItems()` (OJS and OPS `classes/sushi/IR.php`, OJS lines
319 to 333, OPS 285 to 299) fills one `$itemContributor` array for
each author, but never starts a new one. It overwrites `Type` and
`Name`, and sets `Identifier` only when the author has an iD:

```php
foreach ($authors as $author) {
    $itemContributor['Type'] = 'Author';
    $itemContributor['Name'] = $author->getFullName(true, false, $submissionLocale);
    $orcid = $author->getOrcid();
    if (!empty($orcid)) {
        $itemContributor['Identifier'] = $orcid;
    }
    $itemContributors[] = $itemContributor;
}
```

An author without an iD therefore keeps the `Identifier` left by the
last author before them who had one. The variable is local to the
method and is not reset between works either, so the iD runs on into
the next works of the report (the works are ordered by submission ID).
The sibling code builds each entry as a fresh array (`$item = [...]`
a few lines above, and in `TR::getReportItems()`).

Reach:

- Only the JSON answer of the SUSHI address. The downloaded file's
  "Authors" column is built in `getTSVReportItems()`, a separate loop
  with no borrowed iD; its own fault is
  [U64 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A15-counter-ir-authors-column-last-author-only.md)
  (code, and walked there).
- OJS "Journal Article Requests (IR_A1)" inherits the method; its
  SUSHI address `ir_a1` always shows the authors, so it has the same
  fault (code, not walked).
- OMP is not affected: its COUNTER reports are title and platform
  reports, with no item report and no contributor list. No other
  report of the three apps lists contributors (code, the three apps'
  `classes/sushi`).
- No stored data is wrong: the answer is built on each request.

## Proposed fix

A proposal, tried on `main`:
[`fix-ojs.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sushi-ir-authors-share-orcid/fix-ojs.diff)
and
[`fix-ops.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sushi-ir-authors-share-orcid/fix-ops.diff),
the same change in each app's `IR.php`: start each author's entry as a
new array, as the surrounding code builds `$item`. With it, only Alan
Mwandenga and Catherine Kwantes carry an `Identifier`. A control run
with and without the patch, on the same loaded figures, gave the same
results both times: the same address without `attributes_to_show`
lists no `Item_Contributors`, and the downloaded file's "Authors" cells
are unchanged.

```diff
                     foreach ($authors as $author) {
-                        $itemContributor['Type'] = 'Author';
-                        $itemContributor['Name'] = $author->getFullName(true, false, $submissionLocale);
+                        $itemContributor = [
+                            'Type' => 'Author',
+                            'Name' => $author->getFullName(true, false, $submissionLocale),
+                        ];
                         $orcid = $author->getOrcid();
```

**Alternatives:**

- `unset($itemContributor['Identifier'])`, or an `else` that clears it.
  Works, but keeps the shared array, so the next optional key added to
  the entry would carry the same trap.

**What goes with it:**

- The class also declares an unused `public string $itemContributor`
  property, which the local variable has nothing to do with; it can go
  in the same change.
- COUNTER's JSON form for the identifier (the bare iD with an `ORCID:`
  prefix, rather than the full `https://orcid.org/…` address) was not
  checked; the diff leaves the value as it is, the same address the
  downloaded file writes.
- [U64 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U64-A15-counter-ir-authors-column-last-author-only.md)
  is the downloaded file's fault in the same file, with a fix of its
  own; the two can go in one pull request.
- Backport: `IR.php` is the same file on 3.5, so the diffs apply there
  as written; on 3.4 the loop is the same and they apply with an
  offset.
- Guard: an e2e scenario in pkp-e2e's usage statistics spec: the SUSHI
  "Item Master Report (IR)" with the authors shown, for a work whose
  first author alone has an iD, gives an iD to that author only.

Small: one array literal in each app's `IR.php`, no data repair, tried.

## Evidence

- Kept script that takes the Steps:
  [`shared/playwright/checks/issues/sushi-ir-authors-share-orcid/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sushi-ir-authors-share-orcid/walk.js)
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
  answers both times.
- Walked on `main` and 3.5, OJS and OPS, signed in as `dbarnes`, twice
  each (before and after the revision): the same answers every time.
  The signed-out answer was not walked; `PKPStatsSushiController` serves
  the same report to both while the address is public, the default
  (code).
- The fix was applied with `node bin/try-fix.js apply` (each app's
  diff to its app) on `main`, with the first walks' precondition: the
  Steps with the fix in on a freshly loaded install, and the control
  with the fix in and out on the figures those Steps had loaded.
- main walked at OJS 378eced941 and OPS 2ece50497f (lib/pkp b17fadae59,
  lib/ui-library 47b565cb). 3.5 walked at OJS ca763c91cd and OPS
  44aec6e131 (lib/pkp 4045d9241e).
- Code read on main: OJS and OPS `classes/sushi/IR.php`
  (`getQueryResults()`, `getReportItems()`, `getTSVReportItems()`),
  OJS `IR_A1.php`, `TR.php`, `PR.php`; OMP `classes/sushi/`. The other
  arrays in `getReportItems()` either start fresh per work (`$item`,
  `$performances`) or have every key rewritten (`$parentItem`).
- 3.4 by code: OJS `upstream/stable-3_4_0` (daf0ca971d, lines 324 to
  330) and OPS `upstream/stable-3_4_0` (acd8ae704b, lines 290 to 296)
  `classes/sushi/IR.php` have the same loop. 3.4.0 is the first release
  with COUNTER R5.
- 3.3 by code: OJS `upstream/stable-3_3_0` (d7d9dd14ec) and OPS
  `upstream/stable-3_3_0` (c5532e2161) have no `classes/sushi`.
- Introduced: `git blame` on `main` gives the loop to OJS 5b00b02642
  (2021-12-10, then `classes/sushi/IR.inc.php`) and OPS 79126b5b36
  (2022-01-04), in `pkp/ojs#3465` and `pkp/ops#313` ("usage stats
  improvements", merged 2022-07-23, for `pkp/pkp-lib#6782`). Later
  commits on these lines changed only `getFullName()`'s arguments
  (`pkp/pkp-lib#9184`) and the `!empty($orcid)` test (OJS 84bdee7ff0
  under `pkp/pkp-lib#9666`, OPS f314023a48 under `pkp/pkp-lib#8248`).
- Upstream search, 2026-10-15, pkp/pkp-lib, pkp/ojs, pkp/ops and
  pkp/ui-library, issues and PRs, open and closed, by SUSHI and COUNTER
  with ORCID and with authors, `Item_Contributors` and "Item Master"
  contributors: only the issues and PRs that built the feature and
  unrelated ORCID work.
- The walks ran on PostgreSQL.
