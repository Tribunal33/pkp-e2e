# A file's "History" tab: ticking "Show events from prior versions" reloads the same rows

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#6292` for `pkp/pkp-lib#6057` · [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) · 2020-10-19 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The "History" tab of a file's "More Information" offers editors, behind
its "Search" button, the box "Show events from prior versions". Ticking
it reloads the tab with the same rows as before: the file's own events
only.

The box used to add the events of the files this one was copied from
in earlier stages, which is what "prior versions" means here. It has
done nothing since the submission files refactor of 2020, so in every
release from 3.3 on.

The fault shows on every file that is a copy of an earlier one, and
that is how a file reaches review, copyediting and production. A
preprint server shows the box too on `main`, but copies no files, so
there is nothing for the box to bring.

## Impact

- **Lost**: nothing; the earlier events are kept.
- **Who**: managers, editors and section or series editors, on any
  file sent on from an earlier stage, when they open "Search" on the
  tab and tick the box.
- **Way round**: open the earlier stage in the side menu and read
  "More Information" › "History" on the original file there.

Low: a control on a secondary window does nothing, and no work or
data depends on it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`). Nothing
  else. Submission 7 on the journal and submission 2 on the press are
  in review, and their "Files for Review" are the copies `dbarnes` made
  of the author's submission files when sending them to review.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 7, "Developing efficacy beliefs in the classroom"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=7`).
   On a press open submission 2, "The West and Beyond: New Perspectives
   on an Imagined Region", by the same address with
   `workflowSubmissionId=2`: `dbarnes` is not assigned to it, so it is
   not on his "Assigned to me" list, but as Press editor he can open
   every submission. The workflow opens on "Review".
3. In "Files for Review", open the menu at the end of the row
   "Developing efficacy beliefs in the classroom.pdf" (on a press
   `chapter1.pdf`) and choose "More Information".
4. The window "Information Center: …" opens on "History". It lists one
   row.
5. Press "Search" above the table. The box "Show events from prior
   versions" appears.
6. Tick the box.
7. Close the window, open "Submission" in the side menu, and choose
   "More Information" on the same file's row in "Submission Files".

**Expected**: at step 6 the table also lists the events of the file
this one was copied from, the two rows step 7 shows.

**Observed**: at step 4 the one row reads "Daniel Barnes" and "A file
"Developing efficacy beliefs in the classroom.pdf" was uploaded for
submission 7 by dbarnes." (on a press "A file "chapter1.pdf" was
uploaded for submission 2 by dbarnes."). At step 6 the table reloads with that same
single row, and the box is hidden behind "Search" again. The reload
carries the tick and is answered as a success:

```
POST …/$$$call$$$/grid/event-log/submission-file-event-log-grid/fetch-grid?submissionId=7&submissionFileId=23&stageId=3
csrfToken=…&allEvents=on&clientSubmit=true
200, a JSON answer with "status": true
```

At step 7 "History" lists the two rows the box did not bring, both by
"Domatilia Sokoloff": "A file "Developing efficacy beliefs in the
classroom.pdf" was uploaded for submission 7 by dsokoloff." and "The
metadata for file "Developing efficacy beliefs in the classroom.pdf"
was edited by dsokoloff.". On a press the two rows name
`chapter1.pdf`, submission 2 and `afinkel` ("Alvin Finkel").

## Cause

`PKP\controllers\grid\eventLog\SubmissionFileEventLogGridHandler::loadData()`
(`lib/pkp/controllers/grid/eventLog/SubmissionFileEventLogGridHandler.php`,
lines 115 to 121) receives the filter and never reads it. It always
asks for the events of the one file:
`filterByAssoc(PKPApplication::ASSOC_TYPE_SUBMISSION_FILE, [$this->getSubmissionFile()->getId()])`.

The rest of the filter is still in place. `getFilterForm()` (line 128)
gives managers, administrators, section editors and assistants the
template `eventLogGridFilter.tpl` with the `allEvents` box, and
`getFilterSelectionData()` (line 142) reads `allEvents` from the
request and hands it to `loadData()` as `$filter['allEvents']`.

Until 2020 `loadData()` used it: with `$filter['allEvents']` set, it
followed the file's source (`getSourceFileId()`, `getSourceRevision()`)
back, file by file, and added each one's events, whatever stage they
were in. The submission files
refactor (`pkp/pkp-lib#6057`) replaced file id and revision with one
submission file id plus `sourceSubmissionFileId`, and in rewriting
`loadData()` it removed that block without a replacement, leaving the
box, its text and `getFilterSelectionData()` behind.

Reach:

- "More Information" › "History" on every file list of a journal's or
  press's workflow, for any file with a source: files a decision sent
  on to review, copyediting or production, and files copied with
  "Upload/Select Files" (walked on "Files for Review"; the others by
  code: `Repository::copy()` and `ManageSubmissionFilesForm` set
  `sourceSubmissionFileId`).
- A workflow file attached to a discussion or to a recommendation's
  message is also stored as a copy with a source
  (`SaveNoteWithFiles`, line 210; `IsRecommendation`, line 173). If a
  screen opens "More Information" on such an attachment, the box would
  bring the events of the workflow file it was attached from (code;
  whether a screen does was not checked).
- A file with no source, such as the author's own upload: the box has
  nothing to add, with or without the fault (walked).
- A preprint server: a galley's "More Information" on `main` offers
  the same box, but nothing there can create a copied file: no
  preprint file of the dataset has a source, and the app's own code
  never calls `Repository::copy()` or `ManageSubmissionFilesForm`
  (database read and code; not walked). On 3.5 and before a galley
  has no "More Information".
- The assistant roles are named in `getFilterForm()`, but the "History"
  tab does not load for them at all (spec U36
  [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a3),
  a separate fault), so today only editors meet this one.
- No other grid offers a filter its `loadData()` ignores (searched the
  handlers defining `getFilterForm()` or `getFilterSelectionData()` in
  `lib/pkp` and the three apps).

## Proposed fix

Give the box its meaning back in `loadData()`: when it is ticked,
follow `sourceSubmissionFileId` back and list those files' events too,
but only as far back as the user has an editorial role in the source
file's stage
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/fix.diff)):

```diff
--- a/lib/pkp/controllers/grid/eventLog/SubmissionFileEventLogGridHandler.php
+++ b/lib/pkp/controllers/grid/eventLog/SubmissionFileEventLogGridHandler.php
@@ -114,8 +114,30 @@
      */
     protected function loadData($request, $filter = null)
     {
+        $submissionFile = $this->getSubmissionFile();
+        $submissionFileIds = [$submissionFile->getId()];
+
+        // "Show events from prior versions": also list the events of the
+        // files this one was copied from, as far back as the user has an
+        // editorial role in the source file's workflow stage.
+        if (!empty($filter['allEvents']) && $this->getFilterForm()) {
+            $editorialRoles = [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT];
+            $accessibleStages = (array) $this->getAuthorizedContextObject(Application::ASSOC_TYPE_ACCESSIBLE_WORKFLOW_STAGES);
+            while ($sourceSubmissionFileId = $submissionFile->getData('sourceSubmissionFileId')) {
+                $submissionFile = Repo::submissionFile()->get((int) $sourceSubmissionFileId, $this->getSubmission()->getId());
+                if (!$submissionFile || in_array($submissionFile->getId(), $submissionFileIds)) {
+                    break;
+                }
+                $stageId = Repo::submissionFile()->getWorkflowStageId($submissionFile);
+                if (!$stageId || !array_intersect($editorialRoles, $accessibleStages[$stageId] ?? [])) {
+                    break;
+                }
+                $submissionFileIds[] = $submissionFile->getId();
+            }
+        }
+
         return Repo::eventLog()->getCollector()
-            ->filterByAssoc(PKPApplication::ASSOC_TYPE_SUBMISSION_FILE, [$this->getSubmissionFile()->getId()])
+            ->filterByAssoc(PKPApplication::ASSOC_TYPE_SUBMISSION_FILE, $submissionFileIds)
             ->getMany()
             ->toArray();
     }
```

The stage test is the part the old block did not have. The old block
listed every source file's events for anyone who sent the tick, and
only `getFilterForm()` kept the box from authors, by their role in the
journal. Restored as it was, a user whose role covers only the later
stage (a Copyeditor on a copyediting file, once the tab loads for
assistants) would be shown the earlier stage's events: who uploaded
and edited the files there, and a "Download" on each upload row.

That "Download" would be refused: `EventLogGridRow` builds it with the
source file's own stage, and `SubmissionFileAccessPolicy` lets an
assistant or section editor read a file only in a stage their role is
assigned to (code read, not walked). So the fix lists a source file's
events under the same rule, read from the stages the handler's
`authorize()` already holds (`ASSOC_TYPE_ACCESSIBLE_WORKFLOW_STAGES`),
and stops at the first source the user has no editorial role for. An
editor with every stage sees the whole chain.

Two choices in the diff are for the smallest change. It calls
`getFilterForm()` as the role test, where a small method of its own
would read better. And it walks the whole chain, as the old block
did, while the "Notes" tab beside it reads one source back only
(`FileInformationCenterHandler::_listPastNotes()`, "Earlier Revision
Notes"); both read the same field.

Tried on `main` on OJS and OMP, as the editor `dbarnes`, who has every
stage. With the fix, step 6 lists three rows: the file's own and the
two of the file it was copied from; step 4 still lists one row before
the tick. The comparison case reads the same with the fix and without
it: the original file in "Submission Files", which has no source,
lists its two rows with the box unticked, ticked and unticked again.
The stage test's refusing side was not walked: the dataset has no
user who reaches this tab with a role in the later stage only.

**Alternatives**

- The old block as it was, with no stage test (the first diff tried;
  same result for `dbarnes`): shows a later-stage-only user the
  earlier stage's events beside downloads that are refused.
- Remove the box (`getFilterForm()`, `getFilterSelectionData()`,
  `eventLogGridFilter.tpl` and the text
  `submission.informationCenter.history.allEvents`): as small, but
  drops a feature the refactor did not mean to drop. It is the better
  choice only if the team no longer wants the earlier events here;
  `pkp/pkp-lib#12826` (open) plans to replace the legacy grids, this
  one included.
- Always list the source files' events, without a box: changes what
  every "History" tab shows by default.

**What goes with it**

- A source that is a discussion attachment is tested by its
  discussion's stage only, not by who takes part in the discussion.
  Its "Download" stays refused for someone outside the discussion
  (`SubmissionFileAssignedQueryAccessPolicy`, code).
- After the reload the box is hidden behind "Search" again, still
  ticked. That is a separate, known gap: the form in
  `eventLogGridFilter.tpl` lacks the `filter` class the grid's script
  looks for (noted in the report for spec U54 A9, pkp-e2e#442).
- No stored data is wrong; nothing to repair. No API or hook changes.
- Backport: the same diff fits 3.5 (the file is identical) and 3.4
  (same `Repo` calls and the same authorized stages; not tried). On
  3.3 the handler reads
  `SubmissionFileEventLogDAO::getBySubmissionFileId()` and files come
  from `Services::get('submissionFile')`, so the loop needs those
  calls instead.
- Guard: an e2e scenario here, on a file in "Files for Review": the
  box ticked adds the original file's rows.

Small: about twenty lines in one method of one shared handler, with no
data repair and no change to an API, a hook or another screen.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/lib.js).
  It takes the Steps as `dbarnes` on an install loaded from the default
  dataset (pkp/datasets c657990, 2026-10-01; PostgreSQL) and records
  what the grid's reload posts and answers:
  `PROBE_FEATURE=issues-u36i PROBE_AGENT=u36i node bin/probe.js all shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=neighbour` in front for the comparison case, the original
  file's "History").
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02, with
  the same result on all four. No request failed and no page script
  failed in any walk.
- Fix trial on `main`, OJS and OMP:
  `node bin/try-fix.js apply shared/playwright/checks/issues/history-prior-versions-box-changes-nothing/fix.diff ojs omp`,
  the walk, the comparison case, `revert`; the comparison case without
  the fix ran in the trial of the first diff (no stage test).
- Stage access, code reads on `main`: the block removed by 5f383f87c3
  had no role or stage test of its own; `EventLogGridRow` passes
  `getWorkflowStageId()` of the row's file to `DownloadFileLinkAction`;
  `SubmissionFileAccessPolicy` requires, for assistants and section
  editors, `WorkflowStageAccessPolicy` and
  `AssignedStageRoleHandlerOperationPolicy` for that stage;
  `Repo::user()->getAccessibleWorkflowStages()` builds the stage map
  the fix reads from the stages of the user's assigned role.
- Branch tips the walks and code reads were made on. `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a),
  OMP 3b0ecf794 (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS 091fb65453,
  OMP 9c5e24246 (lib/pkp cf3f984335). `stable-3_4_0`: lib/pkp
  32b0f4b4af. `stable-3_3_0`: lib/pkp f6ab331645.
- Code reads. 3.5: the handler file is identical to `main`'s. 3.4:
  `loadData()` is the same `Repo::eventLog()` call on the one file id,
  with `getFilterForm()` and `getFilterSelectionData()` unchanged.
  3.3 (`SubmissionFileEventLogGridHandler.inc.php`): `loadData()` calls
  `getBySubmissionFileId()` for the one file and reads no filter, and
  the same two filter methods offer the box. The introducing commit is
  on all three branches.
- Introduced: `git log -S allEvents` on the handler gives fe2baa7e53
  (2014-01-03, Alec Smecher, "Added event log filter for previous
  versions to event log grid"), which added the box and the block, and
  5f383f87c3, whose diff of this file removes the
  `if ($filter['allEvents'])` block. The GitHub API names
  `pkp/pkp-lib#6292` as the commit's pull request.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for "prior versions", "Show events
  from prior versions", `allEvents`, `SubmissionFileEventLogGridHandler`,
  `eventLogGridFilter`, file history earlier stage events, information
  center history filter. `pkp/pkp-lib#12826` and `pkp/pkp-lib#4727`
  list the template among legacy or possibly dead code; neither is
  about the box doing nothing.
- Not driven: a file two copies away from its original (the loop's
  second turn), the "Download" on a source file's row, a user with a
  role in the later stage only, a discussion attachment's "More
  Information", any user other than `dbarnes`, OPS, 3.4 and 3.3, MySQL
  (nothing here depends on the database).
