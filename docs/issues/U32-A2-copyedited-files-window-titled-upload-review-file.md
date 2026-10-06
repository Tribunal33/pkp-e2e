# Copyediting: "Upload/Select Files" on "Copyedited Files" opens a window titled "Upload Review File"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP (OPS has no Copyediting stage)
  - 3.5: OJS, OMP (OPS has no Copyediting stage)
  - 3.4: none (code; the "Copyedited Files" grid titles the window "Upload/Select Files")
  - 3.3: none (code; the same grid and title)
- **Introduced** `pkp/ui-library#386` for `pkp/pkp-lib#7495` · [6e95026819](https://github.com/pkp/ui-library/commit/6e95026819e8a3d0852f2168341b8675807d1b1a) · 2024-07-18 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U32 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U32-copyediting-stage.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a submission's "Copyediting" stage, pressing "Upload/Select Files"
above "Copyedited Files" opens the file window under the title "Upload
Review File", a review-stage title. The same button above "Draft Files"
opens the same kind of window titled "Upload/Select Files", as expected.

Only the title is wrong. The window lists the stage's files under
"Copyediting", and selecting or uploading copyedited files through it
works.

## Impact

- **Lost**: nothing; the files are selected and uploaded as intended.
- **Who**: editors, section editors, journal or press managers and
  copyeditors adding a copyedited file, on every submission at this
  stage. A screen reader announces the window as "Upload Review File".
- **Way round**: none needed.

Low: a misleading window title on a task that completes as intended.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS or OMP. Its submission in
  Copyediting with `dbarnes` assigned as editor: OJS submission 3, "The
  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence"; OMP submission 7, "Accessible Elements:
  Teaching Science Online and at a Distance".

Steps:

1. Sign in as `dbarnes`.
2. Open the submission (OJS 3, OMP 7) with "View" on its row in
   "Assigned to me" (or the address
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3&workflowMenuKey=workflow_4`,
   with 7 on OMP). The workflow opens at "Copyediting", showing "Draft
   Files", "Copyediting Tasks & Discussions" and "Copyedited Files".
3. Above "Draft Files", press "Upload/Select Files". The window opens
   titled "Upload/Select Files". Press "Cancel".
4. Above "Copyedited Files", press "Upload/Select Files".

**Expected** The window opens titled "Upload/Select Files", like the
button that opened it and like the window in step 3.

**Observed** The window opens titled "Upload Review File", above the
heading "Copyedited" and the file list grouped under "Copyediting".

## Cause

The new workflow page builds each file list from a configuration in
ui-library's `src/managers/FileManager/useFileManagerConfig.js`. The
`COPYEDITED_FILES` entry sets the window's title key to the review
stage's upload title:

```js
uploadSelectTitleKey: tk('editor.submissionReview.uploadFile'),  // "Upload Review File"
```

`useFileManagerActions.js` `fileSelectUpload()` passes that key straight
to `openLegacyModal({title: t(uploadSelectTitleKey, …)})`. The window's
body is still the server's file-selection grid
(`grid.files.copyedit.CopyeditFilesGridHandler` op `selectFiles`). The `FINAL_DRAFT_FILES` entry beside it uses
`editor.submission.uploadSelectFiles` ("Upload/Select Files").

The line arrived with the FileManager in 6e95026819 (`pkp/ui-library#386`),
which moved the workflow's file lists from the legacy grids to Vue. The
legacy grid, still on 3.4 and 3.3, labels its button with
`editor.submission.uploadSelectFiles` in
`CopyeditFilesGridDataProvider::getSelectAction()`, and
`SelectFilesLinkAction` titles the window with that label. So the
"Copyedited Files" window was titled "Upload/Select Files" until the
new workflow replaced the grid.

Reach:

- The other two `uploadSelectTitleKey` entries are right (code): "Files
  for Review" uses `editor.submission.review.currentFiles`, the title
  `ReviewGridDataProvider` gives the legacy window, and "Draft Files"
  uses `editor.submission.uploadSelectFiles` (on screen, step 3).
- OPS has no Copyediting stage, so the entry is never shown there.

## Proposed fix

Give `COPYEDITED_FILES` the same title key as `FINAL_DRAFT_FILES`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyedited-files-window-titled-upload-review-file/fix.diff)):

```diff
--- a/lib/ui-library/src/managers/FileManager/useFileManagerConfig.js
+++ b/lib/ui-library/src/managers/FileManager/useFileManagerConfig.js
@@ -247,7 +247,7 @@
 		titleKey: tk('fileManager.copyeditedFiles'),
 		descriptionKey: tk('fileManager.copyeditedFilesDescription'),
 		gridComponent: 'grid.files.copyedit.CopyeditFilesGridHandler',
-		uploadSelectTitleKey: tk('editor.submissionReview.uploadFile'),
+		uploadSelectTitleKey: tk('editor.submission.uploadSelectFiles'),
 	}),
 	COPYEDITED_FILES_SELECT: ({stageId}) => {
 		const base = FileManagerConfigurations.COPYEDITED_FILES({stageId});
```

This restores the legacy grid's title. In five locales, an, cnr, gd,
he and hi, the new key has no translation (missing or empty) while
the old one has one, so there the title falls back to English
"Upload/Select Files". Those locales already show the button and the
"Draft Files" window in English, so no locale work comes with the fix.
Tried on `main`, OJS and OMP: with the fix applied, step 4's window is
titled "Upload/Select Files", while the "Draft Files" window and the
review round's "Current Review Files For Round 1" window keep their
titles.

**Alternatives**

- A new title just for this window, such as "Upload/Select Copyedited
  Files": a new locale key in every language for no gain over the
  button's own label.
- Dropping `uploadSelectTitleKey` and titling every window after its
  button: this would change the review window's round title, which is
  correct today.

**What goes with it**

- Backport: the same one-line change applies to `stable-3_5_0`, where
  the line sits at 155 of the same file, blamed to the same commit.
- Guard: scenario 4 of the e2e spec U32 opens this window and today
  leaves its title unchecked because of this finding. Once the fix
  lands, it can assert "Upload/Select Files".
- No stored data, API or plugin hook is involved.

Small: one key in one ui-library file, tried on both apps.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyedited-files-window-titled-upload-review-file/walk.js)
  (it uses the helpers in
  [select-files-other-stage-row-actions-refused/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/select-files-other-stage-row-actions-refused/lib.js)).
  It takes the Steps on OJS and OMP and skips OPS, which has no
  Copyediting stage. It needs an install loaded from PKP's default test dataset
  and is run from the pkp-e2e repo:
  `node bin/probe.js all shared/playwright/checks/issues/copyedited-files-window-titled-upload-review-file/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `MODE=nb` runs
  only the control: the review round's "Files for Review" ›
  "Upload/Select Files" window on OJS submission 7 and OMP submission
  16, whose title the fix must leave alone.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp` (rebuilds
  the JavaScript), the walk and the control, then `revert`; the control
  was run again with the fix out and read the same.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, each on an install
  freshly loaded from pkp/datasets 1a5552c (2026-10-04), PostgreSQL. The
  fault is a fixed string, independent of the database. No request
  failed and no page script failed on any walk.
- Branch tips:
  - main: OJS ff004d0973, its pkp-lib 987776cd04, ui-library 64d67363;
    OMP 3b0ecf794, pkp-lib 3dc90c81a6, ui-library 280f98c5 (the file
    is identical in both ui-library tips).
  - stable-3_5_0: OJS c1cee76b95, pkp-lib 771474347e; OMP 9c5e24246,
    pkp-lib cf3f984335; ui-library d4e01883 for both.
  - stable-3_4_0: OJS d68934d0d1, OMP 0aec65441, pkp-lib 767353f4fe,
    ui-library ee684b34.
  - stable-3_3_0: OJS ac77c9fb35, OMP 8e72fc883, pkp-lib ac3fa73402,
    ui-library 96959f9e.
- Code reads:
  - main and 3.5: `useFileManagerConfig.js` (`COPYEDITED_FILES`,
    `FINAL_DRAFT_FILES`, `EDITOR_REVIEW_FILES`) and
    `useFileManagerActions.js` `fileSelectUpload()`.
  - 3.4 and 3.3 (pkp-lib's and ui-library's `stable-3_4_0` and
    `stable-3_3_0`, shared by both apps): ui-library has no
    `src/managers/FileManager/`; pkp-lib's
    `templates/controllers/tab/workflow/editorial.tpl`,
    `CopyeditFilesGridDataProvider` and `SelectFilesLinkAction`.
- Introduced: `git blame` on the `COPYEDITED_FILES` title line and
  `git log -L` on it give only 6e95026819, the commit that created the
  file. GitHub's `commits/<sha>/pulls` names `pkp/ui-library#386`, and
  its message names `pkp/pkp-lib#7495`. The commit is on
  `stable-3_5_0` and not on `stable-3_4_0`.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs and pkp/omp searched
  for "Upload Review File", copyedited files with the window's title,
  "Upload/Select Files" with copyedited, and `uploadSelectTitleKey`.
  `pkp/pkp-lib#10688` (Redesigned Workflow - FileManager, closed) is
  the feature's tracking issue and does not mention the title.
- Not driven: the Copyeditor's own view of the window (the Copyeditor
  role sees the same button, by the same configuration) and 3.4 and
  3.3, read in the code only.
