# In "Upload/Select Files", another stage's files refuse "More Information", "Edit", "Delete" and their download

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** a commit for `pkp/pkp-lib#6206`, made without a pull request · [e7697a8626](https://github.com/pkp/pkp-lib/commit/e7697a8626422d66ce889edf07a7ca8eac492613) · 2020-08-25 · Alec Smecher (asmecher), for manager-level roles; `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr), for Section Editors and assistants
- **Upstream** `pkp/pkp-lib#11320` (open), covering "More Information" in the "Files for Review" window; this report adds "Edit", "Delete" and the file name, the two Copyediting windows, the cause and a tried fix
- **Tracked in** spec U36 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a19)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "Upload/Select Files" window, with "Show files from all
accessible workflow stages." ticked, an editor is refused every action
on a file listed under another stage. "More Information" raises two
alerts and stays on "Loading", "Edit" opens a window holding only "The
current role does not have access to this operation.", and "Delete"
asks its question and deletes nothing. Pressing the file's name replaces
the whole page with a line of raw text instead of downloading the file.
The same actions work on the files of the window's own stage, and they
worked on every row until a 2020 change.

"More Information" and the file's name should plainly work on such a
row. Whether "Edit" and "Delete" should work there or should not be
offered is the team's choice: with the proposed fix, "Delete" in this
window removes the earlier stage's original and every copy made from it.

Ticking the files and copying them with "OK" works. A site
administrator is not refused.

## Impact

- **Lost**: nothing stored. Pressing a file's name also throws away the
  ticks made in the window.
- **Who**: a Journal Manager, Journal Editor or Section Editor (on a
  press, the Press Manager, Press Editor or Series Editor) who ticks the
  box and then uses an action, or the name, of a file listed under a
  stage other than the window's. In "Draft Files" and "Copyedited
  Files" all four fail. In "Files for Review" the rows offer only "More
  Information" and the name, and both fail. "Draft Files" was walked;
  the other two windows are read in the code. An assistant (a
  Copyeditor) gets no other stage listed, so does not meet it (code).
  Checking a file
  before bringing it forward is the ordinary reason to press its name
  there.
- **Way round**: open the file's own stage in the side menu and use the
  row's "More Actions" menu or its name on that stage's list. After the
  raw text, the browser's Back button returns to the workflow.

Medium: the actions fail, with a way round on screen. A file that could
be reached from no other list would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`). The
  submissions and files the steps name are the same in both. Nothing
  else.

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`),
   and open "Copyediting" in the side menu. On a press open submission
   7, "Accessible Elements: Teaching Science Online and at a Distance".
3. Above "Draft Files" press "Upload/Select Files".
4. Tick "Show files from all accessible workflow stages.".
5. Under "Submission", press the arrow before the name of the one file
   there, "The Facets Of Job Satisfaction: A Nine-Nation Comparative
   Study Of Construct Equivalence.pdf" (on a press the row `intro.pdf`),
   and press "More Information".
6. Accept the alerts and close the window. Press the same row's "Edit".
7. Close the window. Press the same row's "Delete", then "OK".
8. Accept the alert and press "Cancel" in the question. [On 3.5 "OK" and
   "Cancel" stay greyed out; the Escape key closes the question.] Press
   the file's name in the same row.

**Expected**, each action taken on its own: step 5 opens "Information
Center: …" with the file's "History"; step 6 opens "Edit a file" with
the file's name box; step 8 downloads the file; and step 7 deletes it,
or the row offers no "Delete" (the team's choice, see the Proposed
fix). The file's own list, "Submission Files", offers the same four.

**Observed**:

- Step 5: two browser alerts, "The current role does not have access to
  this operation." and then "undefined". The window "Information
  Center: …" shows the tabs "History" and "Notes" and, under them,
  "Loading", for good.
- Step 6: the window "Edit a file" holds only "The current role does
  not have access to this operation.".
- Step 7: a browser alert "The current role does not have access to
  this operation."; the question "Are you sure you wish to delete this
  item? This action cannot be undone." stays open, and the file is
  still listed and stored.
- Step 8: no download. The browser leaves the workflow and shows the
  refusal as raw text:

```
…/index.php/publicknowledge/$$$call$$$/api/file/file-api/download-file?submissionFileId=15&submissionId=3&stageId=4
{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

Each refused request names the window's stage, not the file's, for
example the history list behind step 5:

```
GET …/$$$call$$$/grid/event-log/submission-file-event-log-grid/fetch-grid?submissionId=3&submissionFileId=15&stageId=4
200, {"status":false,"content":"The current role does not have access to this operation.", …}
```

Control: tick the same file and press "OK", which copies it onto "Draft
Files"; in the window opened again, the copy under "Copyediting" opens
"More Information" with its history and "Edit" with its form, downloads
by its name, and "Delete" removes it.

## Cause

The window's list is a subclass of
`PKP\controllers\grid\files\SelectableSubmissionFileListCategoryGridHandler`
(`lib/pkp/controllers/grid/files/`), a grid with one category per
workflow stage; for "Draft Files" it is
`ManageFinalDraftFilesGridHandler`. The base class builds every row as
`new SubmissionFilesGridRow($this->getCapabilities(), $this->getStageId())`
(line 235, in `getRowInstance()`) and the name column as
`new FileNameGridColumn(…, $this->getStageId())` (line 209, in
`initialize()`). `getStageId()` is the
stage the window was opened from. So the four links of a row
(`FileInfoCenterLinkAction`, `EditFileLinkAction`,
`DeleteFileLinkAction`, and the column's `DownloadFileLinkAction`) all
carry that stage as `stageId`, whichever category the row sits in.

The handlers behind the links authorize with
`SubmissionFileAccessPolicy`. Its manager, sub-editor, assistant and
author branches each add `SubmissionFileMatchesWorkflowStageIdPolicy`,
which denies when
`Repo::submissionFile()->getWorkflowStageId($submissionFile)` differs
from the request's `stageId`. A "Submission" file asked for with
`stageId=4` is denied.

The check came in two steps. Commit e7697a8626 ("Check specified
workflow stage ID against submission file", for the issue
`pkp/pkp-lib#6206`) wrote all four `addPolicy` calls onto
`$managerFileAccessPolicy`, so only manager-level roles were checked.
Commit 5f383f87c3 (`pkp/pkp-lib#6292`) moved three of them onto the
author, assistant and sub-editor sets. Before each, that role's links
worked, because the policy only asked whether the user could reach the
stage named.

The policy is right to ask for the file's stage; the grid is wrong to
send another. The grid knows the right one: each category's id is its
stage, and `CategoryGridHandler` holds it in `_currentCategoryId` while
it builds that category's rows.

Each symptom is that one refusal, shown by a different caller:

- "More Information": `FileInformationCenterHandler` itself only asks
  for stage access and opens, but its "History" tab loads
  `SubmissionFileEventLogGridHandler::fetchGrid` with the same
  `stageId`, which the policy refuses. The tab's loader raises the
  alerts and never fills.
- "Edit" and "Delete": `PKPManageFileApiHandler::editMetadata` and
  `deleteFile` are refused; the edit window prints the refusal, and the
  delete question does not handle one.
- The name: the link is a plain navigation to
  `FileApiHandler::downloadFile`, so the JSON refusal becomes the page.

Reach:

- "Draft Files" window (`ManageFinalDraftFilesGridHandler`) on a
  journal and a press, a "Submission" file, as a manager-level editor:
  all four (walked).
- The files under every other stage of that window, and the
  "Copyedited Files" window, which has the same three row actions and
  the name (`ManageCopyeditFilesGridHandler`; code).
- The "Files for Review" window (`ManageReviewFilesGridHandler`): rows
  offer "More Information" and the name only (code; `pkp/pkp-lib#11320`
  reports "More Information" there).
- A press's publication format "Select Files" window
  (`ManageProofFilesGridHandler`): rows have no controls, so only the
  name is refused (code; not walked).
- Section Editors: their branch of the policy carries the same check
  (code).
- Assistants: their branch carries it too, and the three window classes
  admit them, but the box lists only the stages a person may open,
  which for a Copyeditor is Copyediting alone (code; not walked). An
  assistant role given several stages would be refused like an editor.
- The site administrator's branch has no such check, so an administrator
  is not refused (code, and reported in `pkp/pkp-lib#11320`).
- A preprint server has none of these windows.

## Proposed fix

Recommended: give each row the stage of the category it is listed
under, and let the name column take the stage from the row, so that all
four actions work on every row as they did before 2020
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/fix.diff)).
It settles "More Information" and the name outright. For "Edit" and
"Delete" it is one of two answers, and the team decides which; the
other is the first alternative below.

```diff
--- a/lib/pkp/controllers/grid/files/SelectableSubmissionFileListCategoryGridHandler.php
+++ b/lib/pkp/controllers/grid/files/SelectableSubmissionFileListCategoryGridHandler.php
@@ -232,7 +232,12 @@
     protected function getRowInstance()
     {
-        return new SubmissionFilesGridRow($this->getCapabilities(), $this->getStageId());
+        // Each category is a workflow stage and lists that stage's files, so a
+        // row's actions name its category's stage, not the stage the grid was
+        // opened from: SubmissionFileAccessPolicy refuses a file whose stage
+        // differs from the request's stageId.
+        $categoryId = $this->getCurrentCategoryId();
+        return new SubmissionFilesGridRow($this->getCapabilities(), is_null($categoryId) ? $this->getStageId() : (int) $categoryId);
     }
--- a/lib/pkp/controllers/grid/files/FileNameGridColumn.php
+++ b/lib/pkp/controllers/grid/files/FileNameGridColumn.php
@@ -95,7 +95,10 @@
         // Create the cell action to download a file.
-        $cellActions[] = new DownloadFileLinkAction($request, $submissionFile, $this->_getStageId());
+        // A file grid's row knows the stage its file is listed under
+        // (a category grid lists several stages).
+        $stageId = $row instanceof SubmissionFilesGridRow ? $row->getStageId() : null;
+        $cellActions[] = new DownloadFileLinkAction($request, $submissionFile, $stageId ?? $this->_getStageId());
```

The fix sits in the shared base class, so the four windows built on it
are covered.

The category's stage is the right value for every file listed there.
`SubmissionFilesCategoryGridDataProvider::loadCategoryData()` puts a
file under a stage in one of three ways:

- a plain file by its file stage, through the provider's own
  `_getFileStagesByStageId()`, a narrower list that agrees with
  `Repository::getWorkflowStageId()`;
- a discussion's file by its discussion's stage;
- a review round's files by the round's stage.

In the plain file grids (`SubmissionFilesGridHandler`) the row and the
column are built with the same stage, so the column's change alters
nothing there.

Tried on `main`, OJS and OMP, on the "Submission" file in the "Draft
Files" window. With the fix:

- "More Information" opens with the file's "History";
- "Edit" opens "Edit a file" with its name box, and "Save" is accepted;
- the name downloads the file and the workflow stays;
- "Delete" removes the file, and its copies with it: the journal's file
  15 and its review copy 16 both went.

Every request carries `stageId=1`. After the save, and after the
delete, the window fetches its whole list again, not the one row. The
control is the copy under "Copyediting": its "More Information",
"Edit", name and "Delete" all work, with the fix and without.

**Alternatives**

- Keep the fix for "More Information" and the name, and do not offer
  "Edit" and "Delete" on a row of another stage (the row would get its
  capabilities without them when its category is not the window's
  stage; a few more lines in the same class, not tried). This is the
  answer if the team does not want an earlier stage's original deleted
  from a window for choosing files. The delete reaches the copies
  because `submission_files.source_submission_file_id` cascades, as it
  does from the file's own list.
- Work out the stage per file in `FileLinkAction::getActionArgs()` with
  `Repository::getWorkflowStageId()`: covers every grid, but adds a
  database read per review file to every file list, and
  `getWorkflowStageId()` throws for a file stage it does not know.
- Relax `SubmissionFileMatchesWorkflowStageIdPolicy`: undoes what
  `pkp/pkp-lib#6206` asked for.

**What goes with it**

- No other instance: `SubmissionFilesGridRow` is built in two places,
  this grid and `SubmissionFilesGridHandler`, which lists one stage
  (searched `lib/pkp` and the three apps for `new
  SubmissionFilesGridRow` and `new FileNameGridColumn`). The column's
  change does reach OMP's `PublicationFormatGridCellProvider`: its rows
  are `PublicationFormatGridRow`, which extends
  `SubmissionFilesGridRow`. Nothing changes there, because the row and
  the column are both built with the Production stage.
- Separate and optional: the delete question does not handle a refused
  answer, and the "History" tab's loader shows "undefined" after one.
  Neither shows once the links carry the right stage.
- Backport: the same lines exist on 3.5 and 3.4. On 3.3 the files are
  `.inc.php` and not namespaced; `getCurrentCategoryId()` and the row's
  `getStageId()` exist there. Not tried on the older versions.
- Guard: an e2e scenario on the "Draft Files" window with the box
  ticked: a "Submission" file's "More Information" shows its history
  and its name downloads.

Small: the diff changes one line in each of two classes of pkp-lib,
no stored data, no API and no hook, and a test goes with it. The
alternative is the same size. The choice between them is a yes or no on
"Edit" and "Delete", which the team can give on this issue.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/lib.js).
  It takes the Steps as `dbarnes` on an install loaded from the default
  dataset (pkp/datasets c657990, 2026-10-01; PostgreSQL), records each
  request's `stageId` and answer, and reads `submission_files` before
  and after. In pkp-e2e:
  `PROBE_FEATURE=issues-u36g PROBE_AGENT=u36g node bin/probe.js all shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/walk.js`
  (`MODE=neighbour` in front for the control, `MODE=name` for step 8
  alone, `MODE=editsave` for "Edit" and "Save").
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02. Every
  refused request answered 200 with `"status":false`; no request failed
  on the server and no page script failed.
- Fix trial on `main`, OJS and OMP, the diff applied to the checkouts
  and taken out afterwards: the walk, the control with the fix and
  without, and two runs of their own on a fresh dataset, since with the
  fix step 7 deletes the file: the name alone, and "Edit" with "Save"
  (the name box unchanged). After the save the window listed only its
  own stage again, as it does after the delete; whether the box still
  showed its tick was not read.
- Tips walked or read. `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP
  3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6). `stable-3_5_0`:
  OJS 091fb65453, OMP 9c5e24246 (lib/pkp cf3f984335). `stable-3_4_0`:
  lib/pkp 32b0f4b4af. `stable-3_3_0`: lib/pkp f6ab331645.
- Code reads. 3.5, 3.4 and 3.3:
  `SelectableSubmissionFileListCategoryGridHandler::getRowInstance()`
  and `FileNameGridColumn::getCellActions()` pass the grid's stage, and
  `SubmissionFileAccessPolicy` adds
  `SubmissionFileMatchesWorkflowStageIdPolicy` in its manager, author,
  assistant and sub-editor branches (`.inc.php` on 3.3); e7697a8626 is
  and 5f383f87c3 are ancestors of all three branches. On `main` also: the four
  `Manage…FilesGridHandler` subclasses and their capabilities,
  `PKPManageFileApiHandler::authorize()`,
  `FileApiHandler::authorize()`,
  `SubmissionFileEventLogGridHandler::authorize()`,
  `FileInformationCenterHandler::authorize()` and `_getLinkParams()`,
  `CategoryGridHandler::_renderCategoryInternally()`, and
  `SubmissionFilesCategoryGridDataProvider::loadCategoryData()`.
- Introduced: `git blame` on the policy's lines leads to the 2021
  reformatting; `git log -S SubmissionFileMatchesWorkflowStageIdPolicy`
  on the policy file gives e7697a8626, committed without a pull
  request, and 5f383f87c3, whose diff moves the author, assistant and
  sub-editor calls off `$managerFileAccessPolicy`. The walks ran as a
  manager-level editor, so the first is the one they show. The grid's
  line is older (2013) and was right until the policy began to compare
  the stage.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs and pkp/omp, issues
  and PRs, for "all accessible workflow stages", "Upload/Select Files"
  with "does not have access", "More Information" with the refusal's
  text, `SelectableSubmissionFileListCategoryGridHandler` and
  `SubmissionFileMatchesWorkflowStageIdPolicy`. `pkp/pkp-lib#11320`
  describes step 5 from the "Files for Review" window, names the wrong
  `stageId` and lists 3.3, 3.4 and 3.5; it has no fix.
- Not driven: the "Copyedited Files", "Files for Review" and
  publication format windows; the files under "Review" and the other
  stages; a Section Editor, an assistant and the site administrator
  (the walks ran as the editor `dbarnes`); the "Notes" tab of the stuck
  "More Information" window; the alternative fix; 3.4 and 3.3; MySQL
  (nothing here depends on the database).
- The cascade: `SubmissionFilesMigration` declares
  `source_submission_file_id` with `onDelete('cascade')` (code), and the
  trial's delete removed the copy (database read).
