# Reviewer's "Review Files" list: "Search" keeps every file listed, whatever text is typed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#635` for `pkp/pkp-lib#628` · [84399ad880](https://github.com/pkp/pkp-lib/commit/84399ad880598d822e38f269b2d84fb86dde448a) · 2015-07-29 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a20)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The reviewer's "Review Files" list has the same "Search" control as
the other older file lists. On the reviewer's list alone the search
does not filter: every file stays listed, even when the typed text is
in no file's name.

The same search works on the other lists of this kind: "Files To Be
Reviewed" in the editor's "Add Reviewer" window and in the "Edit"
window of a reviewer's row, and a file's "Dependent Files" list. Only
the reviewer's list never passes the typed text on to the shared
search, which is why the fix is one line.

The search has never worked on this list. A preprint server has no
review.

## Impact

- **Lost**: nothing. The list reloads unchanged, so the reviewer
  still sees and can download every file given to them.
- **Who**: a reviewer who uses "Search" under "Review Files", on the
  review's first step and its "Download & Review" step. The list holds
  the few files of one review round.
- **Way round**: read the list; it is short.

Low: a control on the reviewer's page does nothing, and the review
gets done without it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`). Nothing
  else. On the journal, submission 12 is in review and the reviewer
  `jjanssen` has its one file. On the press, submission 2 is in review
  and the reviewer `gfavio` has `chapter1.pdf` to `chapter4.pdf`.

Steps:

1. Sign in as `jjanssen` (password `jjanssenjjanssen`); on a press as
   `gfavio` (password `gfaviogfavio`).
2. Open the review of submission 12, "Sodium butyrate improves growth
   performance of weaned piglets during the first period after
   weaning" (`/index.php/publicknowledge/en/reviewer/submission/12`);
   on a press submission 2, "The West and Beyond: New Perspectives on
   an Imagined Region" (`…/reviewer/submission/2`). The page opens on
   the step "1. Request".
3. Under "Review Files", press "Search". A text box, a drop-down
   reading "Name" and a "Search" button appear.
4. Type `zzzz` and press the "Search" button.
5. On a press: press "Search" again (the search form closed when the
   list reloaded, keeping `zzzz` in the box), replace the text with
   `chapter4` and press the "Search" button.
6. For comparison, sign out and sign in as `dbarnes` (password
   `dbarnesdbarnes`). Open the same submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`,
   on a press `=2`), and under "Reviewers" open the menu of the row
   "Julie Janssen" (on a press "Gonzalo Favio") and choose "Edit".
   Under "Files To Be Reviewed" press "Search", type `zzzz` and press
   the "Search" button. On a press, press "Search" again, replace the
   text with `chapter4` and press the "Search" button.

**Expected**: at step 4 the list reads "No Files", as the editor's
list does at step 6. At step 5 it lists `chapter4.pdf` alone.

**Observed**: at step 4 the list reloads with every file it had: the
one row "Sodium butyrate improves growth performance of weaned piglets
during the first period after weaning.pdf" on the journal, the four
rows `chapter1.pdf` to `chapter4.pdf` on the press. At step 5 the
press's list again holds all four. The reload carries the typed text
and is answered as a success with every row:

```
POST …/$$$call$$$/grid/files/review/reviewer-review-files-grid/fetch-grid?submissionId=2&stageId=3&fileStage=4&reviewRoundId=2&reviewAssignmentId=3
csrfToken=…&search=zzzz&column=name&submitFormButton=&clientSubmit=true
200, four rows
```

At step 6 the editor's "Files To Be Reviewed" reads "No Files" for
`zzzz`; on the press `chapter4` there lists `chapter4.pdf` alone.

## Cause

`PKP\controllers\grid\files\review\ReviewerReviewFilesGridDataProvider::loadData()`
(`lib/pkp/controllers/grid/files/review/ReviewerReviewFilesGridDataProvider.php`,
line 75) receives the typed text as `$filter` and drops it: it calls
`parent::loadData()` with no argument.

The parent, `ReviewGridDataProvider::loadData($filter)`, hands the
filter to `SubmissionFilesGridDataProvider::prepareSubmissionFileData()`,
whose `applyFilter()` keeps the files whose name, in the reader's
interface language (`getData('name', Locale::getLocale())`), contains
`$filter['search']`, whatever the letter case. With the default empty
filter it keeps them all. The override then only removes the files
the editor withheld from this reviewer (`ReviewFilesDAO::check()`).

The rest of the search is in place and shared:
`SubmissionFilesGridHandler::getFilterForm()` gives every file list
of this family the template `filesGridFilter.tpl`,
`getFilterSelectionData()` reads `search` and `column` from the
request, and `GridHandler::loadData()` passes them to the data
provider.

The search was added in 2015 (`pkp/pkp-lib#628`) by giving the base
`GridDataProvider::loadData()` and eight file data providers a
`$filter` parameter, which the providers that list files pass on to
`prepareSubmissionFileData()`. This provider's override was not among
the files changed, so the reviewer's list got the form and never the
filtering. In 2019 the override's
signature gained `$filter = array()` to match the parent's
([9ed77b4136](https://github.com/pkp/pkp-lib/commit/9ed77b4136dc5500a0de21541412a1907a7bcecb),
"Resolve PHP warnings"), still without passing it.

Reach:

- The reviewer's "Review Files" list on step 1, "Request" (walked),
  and the same list on step 3, "Download & Review"
  (`templates/reviewer/review/step3.tpl` loads the same grid; code).
- No other page loads `ReviewerReviewFilesGridHandler` (searched
  `lib/pkp` and the three apps' templates and classes).
- The other data providers that list files pass the filter on:
  `ReviewGridDataProvider`, `ReviewRevisionsGridDataProvider`,
  `ReviewerReviewAttachmentGridDataProvider`,
  `DependentFilesGridDataProvider` and
  `SubmissionFilesGridDataProvider` (code; the editor's "Files To Be
  Reviewed" walked). This is the only `parent::loadData()` call among
  them.
- `SubmissionFilesCategoryGridDataProvider::loadData($filter)` also
  got the parameter in 2015 and does not use it. It is not a second
  instance: it returns the workflow stages of the "Upload/Select
  Files" windows, whose filter is the box "Show files from all
  accessible workflow stages." (`allStages`), read by the handler
  itself (`SelectableSubmissionFileListCategoryGridHandler::loadData()`);
  those windows offer no name search (code).

## Proposed fix

Pass the filter on, as the parent and the sibling providers do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/fix.diff)):

```diff
--- a/lib/pkp/controllers/grid/files/review/ReviewerReviewFilesGridDataProvider.php
+++ b/lib/pkp/controllers/grid/files/review/ReviewerReviewFilesGridDataProvider.php
@@ -72,7 +72,7 @@
      */
     public function loadData($filter = [])
     {
-        $submissionFileData = parent::loadData();
+        $submissionFileData = parent::loadData($filter);
         $reviewFilesDao = DAORegistry::getDAO('ReviewFilesDAO'); /** @var ReviewFilesDAO $reviewFilesDao */
         $reviewAssignment = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_REVIEW_ASSIGNMENT);
         foreach ($submissionFileData as $submissionFileId => $fileData) {
```

The name filter runs first, and the loop that removes the files the
editor withheld from this reviewer runs after it, so the search can
only narrow what the reviewer was already shown.

Tried on `main` on OJS and OMP. With the fix, step 4 reads "No Files"
and step 5 lists `chapter4.pdf` alone; the list before the search and
the editor's list at step 6 are unchanged.

A withheld file stays withheld. On the press, `dbarnes` unticks
`chapter1.pdf` for the reviewer in "Edit"; the reviewer's list then
holds three files. With the fix a search for `chapter`, or for
nothing, lists those three, and a search for `chapter1` reads "No
Files". Without the fix all three searches list the three.

**Alternatives**

- Remove the search from this list (override `getFilterForm()` in
  `ReviewerReviewFilesGridHandler` to return null): as small, but it
  takes away what the sibling lists offer. It is the better choice
  only if the team means to let the search go when the legacy grids
  are removed: `pkp/pkp-lib#12826` (open) plans to remove them, and
  the workflow's new file lists left the search out
  (`pkp/pkp-lib#10688`). That depends on when `pkp/pkp-lib#12826`
  lands, which this report does not know.

**What goes with it**

- No stored data is wrong; nothing to repair. No API or hook changes.
- The search matches a file's name in the reader's interface language
  only. With the fix, a reviewer reading in another language who
  types a name the list shows (the list falls back to the name's
  stored language) can get "No Files". The sibling lists do this
  today; it is a trait of the shared search, not of this fix. Tried
  in English only.
- Backport: the same one-line change fits 3.5 (the file is identical)
  and 3.4 (the same line); on 3.3 the line is in
  `ReviewerReviewFilesGridDataProvider.inc.php` (line 64). Not tried
  there.
- After a search the form closes behind "Search" again while keeping
  the typed text; that is the grid's own behaviour on every list of
  this kind (the editor's list does the same) and is not part of this
  report.
- Guard: an e2e scenario in pkp-e2e: a reviewer's search for a text
  no file name contains reads "No Files".

Small: one argument in one method of one shared class.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets c657990, 2026-10-01; PostgreSQL) and records what each
  search posts and how many rows the answer holds:
  `PROBE_FEATURE=issues-u36n PROBE_AGENT=u36n node bin/probe.js all shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=neighbour` in front for the withheld-file check).
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02, with
  the same result on all four. No request failed and no page script
  failed in any walk.
- Fix trial on `main`, OJS and OMP:
  `node bin/try-fix.js apply shared/playwright/checks/issues/reviewer-review-files-search-keeps-every-file/fix.diff ojs omp`,
  the walk, the withheld-file check, `revert`; the withheld-file
  check also ran without the fix.
- Branch tips the walks and code reads were made on. `main`: OJS
  b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
  3dc90c81a6). `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335). `stable-3_4_0`: lib/pkp 32b0f4b4af. `stable-3_3_0`:
  lib/pkp f6ab331645.
- Code reads on 3.4 and 3.3, beside the lines the Backport bullet
  names: the parent `ReviewGridDataProvider`, `applyFilter()` and
  `filesGridFilter.tpl` are as on `main`,
  `templates/reviewer/review/step1.tpl` loads the grid, and the
  introducing commit is on both branches.
- Introduced: `git log -S applyFilter` on
  `SubmissionFilesGridDataProvider` gives 84399ad880, which added the
  filter form and `applyFilter()`; its file list holds the base
  `GridDataProvider` and eight data providers under
  `controllers/grid/files`, not `ReviewerReviewFilesGridDataProvider`
  (`git log -L` on its `loadData()`: e6010bbd1c, 2013, then
  9ed77b4136). The GitHub API names `pkp/pkp-lib#635` as the commit's
  pull request.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for reviewer "Review Files" search,
  review files search filter reviewer grid, file grid search does
  nothing, `ReviewerReviewFilesGridDataProvider`, `filesGridFilter`.
  `pkp/pkp-lib#12826` and `pkp/pkp-lib#4727` list the files among
  legacy or possibly dead code; neither is about the search doing
  nothing.
- Not driven: a reviewer reading in a language other than English,
  the editor's "Add Reviewer" window and the "Dependent Files" list
  (both read in the code), the list on step 3 "Download & Review" (the reviewer
  must accept first; same grid by code), a press's internal review
  round, a journal round with more than one file, OPS (no review),
  3.4 and 3.3, MySQL (nothing here depends on the database).
