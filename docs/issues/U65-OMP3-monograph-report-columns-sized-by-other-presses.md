# "Monograph Report" of one press carries empty author and decision columns sized by another press's books

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; since 3.3.0-14)
- **Introduced** `pkp/omp#1204` for `pkp/pkp-lib#7635` · [f296f42ea7](https://github.com/pkp/omp/commit/f296f42ea72683fe7a089a3163c43f5063d38ce4) · 2022-10-10 · Jonas Raoni Soares da Silva (jonasraoni); on 3.3 as a28fc13ba in `pkp/omp#1202`, first released in 3.3.0-14
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U65 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On an installation with more than one press, the "Monograph Report"
that a press manager downloads from Statistics › "Reports" has as many
author columns as the book with the most authors in any press, and as
many decision columns as the book with the most decisions in any press.
A press whose only book has one author and no decision gets author
columns up to "(Author 8)" and decision columns up to "Editor Decision 7
(Editor 1)", all empty, because another press holds a book with eight
authors and one with seven decisions.

The extra columns are empty and sit in two blocks: the author groups
after the press's own largest, and the decision columns after each
editor group. In the reproduction the press's report has 106 columns
where its one book needs 36. They give away nothing about the other
press beyond those two counts. The fix is one press condition missing
from one query.

## Impact

- **Lost**: nothing; the report carries empty columns a manager has to
  skip or delete.
- **Who**: managers and editors of a press on an installation that
  hosts two or more presses, each time they download "Monograph Report".
- **Way round**: delete the two blocks of empty columns in the
  spreadsheet.

Low: the file is cluttered, and no data is missing or wrong because of
this fault.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Its press "Public Knowledge
  Press" (`publicknowledge`) holds books with eight authors (submission
  2, "The West and Beyond: New Perspectives on an Imagined Region") and
  a book with seven decisions by one editor (submission 5, "Bomb Canada
  and Other Unkind Remarks in the American Media").
- A second press, which the dataset lacks, created in steps 2–3.

1. Sign in as `admin`.
2. Open Administration › "Hosted Presses" and press "Create Press".
3. Fill in name "u65ir14 Press", initials "U65IR14", contact name
   "u65ir14 Press" and email u65ir14@mailinator.com, country "Canada",
   path `u65ir14`, English as the press's language and primary
   language, and tick "Enable this press to appear publicly on the
   site". Press "Save".
4. Open the new press's "Make a Submission" page
   (`/index.php/u65ir14/en/submission`). Type the title "u65ir14
   One-author book", tick "Yes, my submission meets all of these requirements." and "Yes, I
   agree to have my data collected and stored according to the privacy
   statement." and press
   "Begin Submission". `admin` is the new press's Press manager, so the
   book is submitted in that role and `admin` is its editor.
5. On "Upload Files", upload any file as "Book Manuscript" and press
   "Continue". [3.5: the wizard opens on "Details", then "Upload
   Files".]
6. On "Details", type an abstract and press "Continue".
7. On "Contributors", press "Add Contributor", fill in given name
   "Una", family name "u65ir14", email una.u65ir14@mailinator.com and
   country "Canada", tick "Author" [3.5: "Contributor's role" "Author"]
   and press "Save".
8. Press "Continue" up to "Review", press "Submit" and confirm.
9. In the new press, open Statistics › "Reports"
   (`/index.php/u65ir14/en/stats/reports`) and press "Monograph Report".
10. Open the downloaded "monographs-U65IR14-<date>.csv" and read its
    header row.

**Expected**: one line, the book, under 36 columns: the 24 book
columns, one author group ending in "Bio Statement (e.g., department and
rank) (Author 1)", and one editor group ("Given Name (Editor 1)" to
"Email address (Editor 1)"). No "Editor Decision" column, since no
decision has been taken on the book.

**Observed**: 106 columns. The author groups run to "Bio Statement
(e.g., department and rank) (Author 8)", and the editor group is
followed by "Editor Decision 1 (Editor 1)", "Date decided 1 (Editor 1)"
… "Editor Decision 7 (Editor 1)", "Date decided 7 (Editor 1)". The
book's line fills "(Author 1)" and "(Editor 1)" and leaves the other
70 cells empty.

As a control, "Public Knowledge Press"'s own report runs to "(Author 8)",
which its own books fill, and its editor groups stop at "(Editor 3)",
its own largest. Its decision columns also run to "Editor Decision 7",
but no line fills a decision column past the fifth: that oversizing
within one press is a separate fault (see Cause).

## Cause

`Report::retrieveLimits()` (OMP
`plugins/reports/monographReport/Report.php`, line 229) works out how
many author, editor and decision groups the header needs, in one query.
The query reads `FROM submissions s` (line 254) with no condition on the
press, so the largest author count and the largest per-editor decision
count are taken over every submission of the installation. The rows,
in `getIterator()`, are only this press's
(`filterByContextIds([$this->press->getId()])`), so the header no longer
matches the rows it heads.

The editor count is not inflated by other presses: its sub-query counts
only stage assignments in this press's editor user groups
(`getEditorUserGroups()`), which other presses' submissions never hold.

The query came with f296f42ea7 ("Removed performance unpredictability"),
part of the pull request that added the report. Before it,
`buildDataset()` went through the press's submissions, kept the largest
counts and held every row in memory until the header could be written.
The commit replaced that with one query, so the rows could be written
as they are read, and the press filter was lost on the way. 397b5dfd8e
then moved the method into `Report.php` unchanged.

Reach:

- Only the header's size; the new press's line holds its author and
  editor (checked on screen).
- Two over-counts inside one press stay outside this fault and this
  fix. The decision sub-query counts decisions by any editor, while the
  rows list only the decisions of editors assigned to the book, so
  "Public Knowledge Press" gets "Editor Decision 6" and "7" for
  submission 5's seven decisions by `dbarnes`, who is not assigned to
  it and whose decisions appear nowhere in the file. That belongs with
  the decisions the report leaves out, spec U65
  [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a12),
  an open question. And the editor sub-query uses `COUNT(sa.user_id)`
  without `DISTINCT` while `getEditors()` removes duplicates, so a user
  in two editor groups on one book would add an empty editor group (no
  book in the dataset shows it).
- OJS's "Articles Report" (`ArticleReportPlugin::display()`) keeps its
  counts while it goes through the journal's own submissions, so it is
  not affected (code). OPS has no such report.
- No other report plugin in the three apps queries `submissions`
  directly (code, a search for `FROM submissions` under
  `plugins/reports`).

## Proposed fix

Limit the query to this press's submissions
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/fix.diff),
against the OMP root):

```diff
                 FROM submissions s
+                WHERE s.context_id = ?
             ) AS tmp',
-            $editorUserGroupIds
+            [...$editorUserGroupIds, $this->press->getId()]
         );
```

The rest of the class already scopes by `$this->press->getId()` (the
submissions, user groups, categories and series).

Tried on `main`: after step 10 the new press's report has 36 columns,
ending at "(Author 1)" and "(Editor 1)" with no decision columns, and
"Public Knowledge Press"'s report header is the same with the fix in and
out (142 columns, to "(Author 8)", "(Editor 3)" and "Editor Decision
7", the within-press over-count above left as it was).

**Alternatives**

- Go back to counting in PHP while the rows are read: right, but it
  needs every row held in memory before the header is written, which
  is what the introducing commit removed.
- Filter the sub-queries one by one: three places to keep in step for
  what one outer condition does.

**What goes with it**

- No API, hook or stored data changes.
- Backport: the same query, with the same fix, is in `stable-3_5_0` and
  `stable-3_4_0` (`Report.php`, `DB::selectOne()`) and in
  `stable-3_3_0` (`MonographReport.inc.php`, `Capsule::selectOne()`).
- Test: the plugin has no unit tests; an end-to-end check that reads
  the header of a second press's report would have caught it (spec U65,
  a Planned item).

Small: one condition in one OMP query, and a test.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–10 and the control
  on an install freshly loaded from the default dataset, on OMP (3.5:
  with `PKP_E2E_LINE=stable-3_5_0` in front):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/walk.js`.
  With the argument `neighbour` it only downloads "Public Knowledge
  Press"'s report from the unchanged dataset, the comparison taken with
  the fix in and out.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/monograph-report-columns-sized-by-other-presses/fix.diff omp`.
- Branch tip commits checked: OMP `main`
  [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  [9c5e24246c](https://github.com/pkp/omp/commit/9c5e24246cbb18e7fdb261be7ddceffdc406ecc9)
  (lib/pkp cf3f984335); `stable-3_4_0` OMP
  [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece)
  (lib/pkp 9e41f10273); `stable-3_3_0` OMP
  [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2)
  (lib/pkp ac3fa73402). Dataset pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL. The fault does not depend on the database.
- Walked: `main` and 3.5, OMP, on 2026-10-03. On 3.5 the new press's report had
  100 columns: authors to "(Author 8)", decisions to "Editor Decision 4
  (Editor 1)", the 3.5 dataset's own largest per-editor count; its
  "Public Knowledge Press" report ran to "(Author 8)", "(Editor 3)" and
  "Editor Decision 4".
- Code reads: `Report::retrieveLimits()` on `main` and 3.5 (the same
  query); `stable-3_4_0` `plugins/reports/monographReport/Report.php`
  (the same query, `FROM submissions s`, no press condition);
  `stable-3_3_0` `plugins/reports/monographReport/MonographReport.inc.php`
  `retrieveLimits()` (the same query through `Capsule::selectOne()`,
  first released in 3.3.0-14, a28fc13ba, `pkp/omp#1202`). OJS `main`
  `plugins/reports/articles/ArticleReportPlugin.php` for the
  comparison.
- Introduced: `git blame` on the query gives 397b5dfd8e (the move into
  `Report.php`); `git log -S'FROM submissions s'` before it gives
  f296f42ea7, whose parent's `buildDataset()` counted over
  `Repo::submission()->getCollector()->filterByContextIds([$pressId])`.
  Both commits are in `pkp/omp#1204`, merged 2022-10-19; no release had
  the earlier per-press counting.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library on
  2026-10-03, by the symptom's words and by `retrieveLimits`. Only the feature's own issue
  (`pkp/pkp-lib#7635`) and pull requests (`pkp/omp#1204`,
  `pkp/omp#1202`) came up.
