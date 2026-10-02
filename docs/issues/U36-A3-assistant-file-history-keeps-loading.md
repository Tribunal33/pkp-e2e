# A Copyeditor, Layout Editor or Proofreader opening a file's "More Information" gets two alerts and a "History" tab stuck on "Loading"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#182` for bug 7900 of pkp's old Bugzilla tracker · [4fd4dcd9f8](https://github.com/pkp/pkp-lib/commit/4fd4dcd9f8a64a247a31f92170929959fe0335c2) · 2014-09-19 · Michael Thessel (MichaelThessel)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A Copyeditor, Layout Editor, Proofreader or other assistant role
assigned to a stage is offered "More Information" on that stage's files,
and the window opens on its "History" tab. For them the tab never loads.
The browser shows the alert "The current role does not have access to
this operation.", then a second alert that says only "undefined", and
the tab keeps showing "Loading".

"More Information" is where a file's notes are read and written, so an
assistant who uses notes meets the two alerts on every opening. The
"Notes" tab works once both are dismissed. The file's history, and the
download of an earlier upload it offers, stay out of their reach.

Until a change in 2014 the code let assistants load this tab; the
change closed the submission's activity log to them and took the file's
history with it. The report recommends loading the tab for them again.
A preprint server is not listed because its default roles include no
assistant that can be assigned to a preprint.

## Impact

- **Lost** No saved data is lost or changed. The assistant cannot see
  who uploaded or edited the file, and cannot reach the "Download" of an
  earlier upload, which only "History" offers.
- **Who** Every assistant role (Copyeditor, Layout Editor, Proofreader
  and the others), on every file of a stage they are assigned to.
- **Way round** The assistant has no way to reach the history. A Journal
  Manager, Editor or Section Editor can read it for them.

Low: the assistant's own work on the file (upload, edit, notes) gets
done, and the first alert tells them truthfully that they have no
access. A team whose copyeditors rely on the earlier uploads listed
under "History" would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; for OMP use the names in
  brackets). `mfritz` is the Copyeditor assigned to submission 3, "The
  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence", which is in Copyediting [OMP: submission 7,
  "Accessible Elements: Teaching Science Online and at a Distance"].
- The dataset has no file on the Copyediting stage, so the steps upload
  one: any small PDF, here named `u36h-copyedit.pdf`.

Steps:

1. Sign in as `mfritz` (password `mfritzmfritz`).
2. Open submission 3 [OMP: 7] from the dashboard. The workflow opens on
   "Copyediting".
3. Above "Copyedited Files", press "Upload/Select Files", then "Upload
   File" in the window. Choose the component "Article Text" [OMP: "Book
   Manuscript"], pick `u36h-copyedit.pdf`, press "Continue", "Continue",
   "Complete", then "OK" in the window.
4. In the row of `u36h-copyedit.pdf`, open "More Actions" and choose
   "More Information".
5. Dismiss the alerts and wait ten seconds on the "History" tab.
6. Select "Notes", type "Checked u36h" and press "Add Note".
7. Select "History" again.

**Expected** At 4 the window "Information Center: u36h-copyedit.pdf"
opens on "History" and lists the file's events: "A file
"u36h-copyedit.pdf" was uploaded for submission 3 by mfritz." and "The
metadata for file "u36h-copyedit.pdf" was edited by mfritz.", and at 7
also "Posted new note.". Or the window opens for the Copyeditor with
"Notes" alone.

**Observed** At 4 and again at 7 the browser shows two alerts, one after
the other:

```
The current role does not have access to this operation.
```

```
undefined
```

After them the "History" tab shows only "Loading", for as long as it
stays open. Step 6 works: "Note posted." appears and the note is listed.
The request behind the tab answers 200 with a refusal:

```
GET …/$$$call$$$/grid/event-log/submission-file-event-log-grid/fetch-grid?submissionId=3&submissionFileId=46&stageId=4
{"status":false,"content":"The current role does not have access to this operation.", …}
```

Control: `dbarnes` (Journal editor) opens the same row's "More
Information" and "History" lists the three events at once.

## Cause

The window and its "History" tab are two handlers with two role lists,
and the lists disagree.

`FileInformationCenterHandler::__construct()`
(`lib/pkp/controllers/informationCenter/FileInformationCenterHandler.php`)
grants `ROLE_ID_ASSISTANT` the operations `viewInformationCenter`,
`viewHistory` and the notes. `viewHistory()` returns only a placeholder
that loads the grid `grid.eventLog.SubmissionFileEventLogGridHandler`,
operation `fetchGrid`.

`SubmissionFileEventLogGridHandler` has no constructor. It inherits the
role list of
[`SubmissionEventLogGridHandler::__construct()`](https://github.com/pkp/pkp-lib/blob/ddd8ab243a39584ce34cdcf379acb17b46e496b8/controllers/grid/eventLog/SubmissionEventLogGridHandler.php#L54-L61),
which names the manager, the site administrator and the sub-editor
only.

The grid's `authorize()` adds `SubmissionFileAccessPolicy` first, and
that policy is the one that refuses. `buildFileAccessPolicy()` builds
its assistant branch only when the role list has a `ROLE_ID_ASSISTANT`
key. The inherited list has none, so the branch is never built, and the
Copyeditor fails the manager and sub-editor branches with the alert's
text. The parent's `SubmissionAccessPolicy` drops its assistant branch
in the same way.

The file grid's own `getFilterForm()` lists `ROLE_ID_ASSISTANT` among
the roles it serves, so the grid was meant to open for them.

The parent's list was narrowed in 2014. The change that added the
submission's emails to its activity log (`viewEmail`) cut the list from
manager, author, sub-editor and assistant down to manager and
sub-editor. That was right for the submission's log and its emails; the
file grid, a subclass, lost the assistant with it.

The refusal reaches the user as two alerts and an endless "Loading"
because of how the legacy tab loads its content
(`lib/pkp/js/controllers/UrlInDivHandler.js`, `handleLoadedContent_`):
`handleJson()` alerts the refusal's text and returns `false`, and the
caller then alerts `false.content`, which is `undefined`, and leaves the
placeholder in place.

Reach:

- Every list of the Vue file manager offers "More Information" to
  `ROLE_ID_ASSISTANT` (`FILE_SEE_NOTES` in
  `lib/ui-library/src/managers/FileManager/useFileManagerConfig.js`);
  each opens the same window. All the lists were read in the code; only
  "Copyedited Files" was walked.
- The galley list and the media file list open the same window
  (`useGalleyManagerActions.js`, `useMediaFileManagerActions.js`), so a
  Layout Editor on a galley's file meets the same refusal (code).
- The second alert, "undefined", follows any refused load of this kind,
  whatever the handler (code). It is a fault of its own and this report
  leaves it out.

## Proposed fix

A proposal: give the file grid its own role assignment for the assistant
roles, for the two read operations only
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-file-history-keeps-loading/fix.diff)).

```diff
--- a/lib/pkp/controllers/grid/eventLog/SubmissionFileEventLogGridHandler.php
+++ b/lib/pkp/controllers/grid/eventLog/SubmissionFileEventLogGridHandler.php
@@ -29,6 +29,21 @@
     /** @var SubmissionFile SubmissionFile */
     public $_submissionFile;
 
+    /**
+     * Constructor
+     */
+    public function __construct()
+    {
+        parent::__construct();
+        // The file's information center opens its "History" tab for the assistant
+        // roles too (FileInformationCenterHandler::viewHistory). The submission's
+        // own log, which lists its emails (viewEmail), stays with the parent's roles.
+        $this->addRoleAssignment(
+            [Role::ROLE_ID_ASSISTANT],
+            ['fetchGrid', 'fetchRow']
+        );
+    }
+
     //
     // Getters/Setters
     //
```

The role assignment goes in `SubmissionFileEventLogGridHandler` because
it is the only event-log grid shown inside a window that assistants may
open, the file's "More Information". `FileInformationCenterHandler` adds
the assistant to its parent's list in the same way. The submission's log
keeps its list, and `viewEmail` stays closed to assistants, which keeps
what the 2014 change was for. Which files an assistant may read is still
decided by `SubmissionFileAccessPolicy`: they must be assigned to the
stage the file belongs to.

Tried on `main`, OJS and OMP: with the diff applied the walk shows the
Expected at steps 4 and 7 for `mfritz`, with no alert, and the editor's
view is unchanged. Two things beside the fix were looked at with the
diff applied and without it, and were the same both times: the
Copyeditor is offered no "Activity Log" (the submission's log), and the
author has no row menu on "Copyedited Files".

On a review stage the fix shows an assistant no reviewer they do not
already see (code, not walked):

- An assistant assigned to a review stage (by default the Funding
  coordinator) is offered "More Information" on "Files for Review" and
  "Revisions Uploaded", and on "Reviewer's Attachments" inside a
  reviewer's review details.
- With the fix, "History" on a reviewer's attachment names the reviewer
  as the uploader. `EventLogGridCellProvider` replaces the name with
  "Anonymous Reviewer" only for a user assigned to the submission as an
  author, and the fix keeps that: an assistant who is also an assigned
  author gets the masked rows.
- The reviewer's name is already on the assistant's screen. The
  "Reviewers" list of the editorial view names each reviewer, and the
  submission API hides reviewer names only from the submission's authors
  and its other reviewers (`AnonymizeData::reviewsToAnonymize()`). The
  attachment list itself sits inside that named reviewer's details.

**Alternatives**

- Open the window without the "History" tab for assistants. It removes
  the alerts, but takes away a tab both handlers already mean to give
  them. `FileInformationCenterHandler::viewInformationCenter()` reads
  `removeHistoryTab` from the request and none of the three Vue callers
  sends it, so this would take computing the flag from the user's roles
  in that method (as `SubmissionInformationCenterHandler` does on the
  server) and removing `viewHistory` from the assistant's list.
- Add the assistant to the parent's list. That would open the
  submission's log and its emails to assistants, which the 2014 change
  closed on purpose.

**What goes with it**

- No data repair. The diff applies as written to `stable-3_5_0`, where
  the file is identical; 3.4 and 3.3 need the same constructor in their
  own syntax.
- A test: an e2e scenario in which a Copyeditor opens "More Information"
  on a file of their stage and "History" lists its upload.
- Not tried: the "Download" of an earlier upload from "History" as an
  assistant, with the fix applied.

Small: one constructor in one pkp-lib class, following the sibling
handler's pattern, and a test. The review-stage read above leaves no
choice for the team to make first.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-file-history-keeps-loading/walk.js)
  with its `lib.js`. On an install of PKP's default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/assistant-file-history-keeps-loading/walk.js`;
  `MODE=neighbour` in front for the two unchanged things the Proposed
  fix names, and
  `PKP_E2E_LINE=stable-3_5_0` for 3.5. The fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/assistant-file-history-keeps-loading/fix.diff ojs omp`,
  the walk, then `revert`.
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, on PostgreSQL,
  dataset pkp/datasets c657990 (2026-10-01). The fault does not depend
  on the database.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d67363),
  OMP 3b0ecf794 (pkp-lib 3dc90c81a6, ui-library 280f98c5);
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246 (pkp-lib cf3f984335,
  ui-library d4e01883); pkp-lib `stable-3_4_0` 32b0f4b4af,
  `stable-3_3_0` f6ab331645.
- Code reads on 3.4 and 3.3: the same two role lists (`SubmissionEventLogGridHandler` without the assistant,
  `FileInformationCenterHandler` with `viewHistory` for the assistant),
  no constructor in the file grid, and the PHP file grids offering "More
  Information" where the list allows notes (`SubmissionFilesGridRow`,
  `canViewNotes()`).
- Introduced: `git log -S` on the role list in
  `controllers/grid/eventLog/`. The grid was created on 2014-01-02
  (0dc987b5c6) for the manager only, opened to author, sub-editor and
  assistant on 2014-01-07 (da19652700, "Make access consistent with
  information center"), and narrowed by 4fd4dcd9f8, merged through
  `pkp/pkp-lib#182`. The commit message names bug 7900; the pull
  request's branch is named `8456_email_history`. At da19652700 the
  window's handler already granted `viewHistory` to the assistant, which
  is what "the code let assistants load this tab" rests on; no install of
  that time was run.
- Upstream search, pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library, by
  the symptom's words and by `SubmissionFileEventLogGridHandler`: the
  hits (`pkp/pkp-lib#12826`, `pkp/pkp-lib#12286`) are about other things.
- OPS not driven and left out of Affects: its dataset has no assistant
  role that is assigned to a preprint (its one assistant-level role,
  "Editorial Board Member", has no stage). The handlers are shared, and
  the galley list offers the window to an assistant role (code), so a
  server with a custom assistant role may show it too: unverified.
- Not driven: the galley and media file lists, the other assistant roles
  (they share `ROLE_ID_ASSISTANT`) and the other stages' lists.
- Unverified on screen: the review-stage paragraph of the Proposed fix.
  The dataset has no assistant assigned to a review stage, so what such
  an assistant is shown there, with and without the fix, was read in
  `useFileManagerConfig.js`, `useReviewDetailsForm.js`,
  `EventLogGridCellProvider`, `AnonymizeData` and the apps'
  `registry/userGroups.xml` (Funding coordinator: OJS stages 1 and 3,
  OMP 1, 2 and 3).
