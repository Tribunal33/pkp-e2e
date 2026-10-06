# An author is offered "Update File Details" on a file somebody else uploaded, and the window only refuses them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP (the menu entry is named "Edit")
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced to one change. The workflow's file lists of 3.5 and `main` carry it since `pkp/ui-library#412` · [f77229c3](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b) · 2024-09-19 · Jarda Kotěšovec (jardakotesovec); the file grids of 3.4 and 3.3 show it since at least [9ac9b65283](https://github.com/pkp/pkp-lib/commit/9ac9b65283a8019f167253a3cc01534e3ee831a5) (2014-12-03)
- **Upstream** `pkp/pkp-lib#13048` (open), covering the refused "Update File Details" and "Delete" on "Revisions Uploaded" after an editor's upload, and asking whether the author should be allowed. This report adds "Submission Files", the cause in the menu, and a fix that stops offering the entries
- **Tracked in** spec U36 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On "Submission Files" (Submission stage) and "Revisions Uploaded"
(Review stage) an author's "More Actions" menu offers "Update File
Details" on every file. On a file they uploaded themselves the "Edit a
file" window opens and saves. On a file somebody else uploaded, an
editor for example, the window shows only "The current role does not
have access to this operation." and "Close".

"Delete" on "Revisions Uploaded" is the same fault and the proposed fix
covers it: it is offered on every file, and on somebody else's file the
answer is "An unexpected error has occurred. Please reload the page and
try again."

Nothing is lost: the author was never meant to change that file. A
preprint server has no such lists.

## Impact

- **Lost**: no data or work. The author is shown an action, then a
  refusal (for "Delete", one worded as a failure of the app), with no
  word on why this file differs from the one next to it.
- **Who**: an author whose submission holds a file an editor, an
  assistant or a second author with their own account uploaded to
  "Submission Files" or "Revisions Uploaded". Most submissions hold only
  the author's own files.
- **Way round**: none is needed; "Close" or "OK" returns to the list. A
  change to that file is asked of the person who uploaded it or of an
  editor.

Low: the fault is two entries that should not be offered. It would be
medium if the refusal came after the author had typed changes; here the
window shows the message in place of the form.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OMP (the press `publicknowledge`).
- Any small file on your computer; the steps call it `u36e-notes.txt`.

Steps:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (on a press,
   submission 3, "The Political Economy of Workplace Injury in Canada").
3. Above "Submission Files" press "Upload". Choose the component
   "Article Text" ("Book Manuscript" on a press), pick `u36e-notes.txt`,
   then press "Continue", "Continue" and "Complete".
4. Sign out and sign in as the submission's author, `cmontgomerie`
   (`cmontgomeriecmontgomerie`); on a press `bbarnetson`
   (`bbarnetsonbbarnetson`).
5. Open the same submission from "My Submissions". "Submission Files"
   lists `u36e-notes.txt` above the author's own file.
6. Press "More Actions" on the row `u36e-notes.txt`.
7. Choose "Update File Details". [On 3.5 the entry is named "Edit".]

**Expected**: the row of a file the author may not change offers no
"Update File Details" (and, with nothing else to offer, no "More
Actions" button).

**Observed**: the menu offers "Update File Details", its only entry. The
window "Edit a file" opens and shows only "The current role does not
have access to this operation." and "Close". The request behind it is
answered as a refusal:

```
GET /index.php/publicknowledge/$$$call$$$/api/file/manage-file-api/edit-metadata?submissionFileId=46&submissionId=4&stageId=1

200 {"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

Control: the same entry on the author's own file opens "Edit a file"
with "Name the file (e.g., Manuscript; Table 1)", "Cancel" and "Save".

## Cause

The menu is built from the user's role alone, while the server decides
per file. In ui-library, `useFileManagerConfig.js`
(`lib/ui-library/src/managers/FileManager/`) lists `FILE_EDIT` for
`ROLE_ID_AUTHOR` in the `SUBMISSION_FILES` configuration, and
`FILE_EDIT` and `FILE_DELETE` in `WORKFLOW_REVIEW_REVISIONS`.
`getItemActions({file, managerConfig})` then adds the entry for every
row: it looks at `file` only for "Send to Text Editor".

The server's rule is `SubmissionFileAccessPolicy`
(`lib/pkp/classes/security/authorization/`).
`PKPManageFileApiHandler::authorize()` builds it in
`SUBMISSION_FILE_ACCESS_MODIFY` mode for every operation of the handler,
`editMetadata` and `deleteFile` among them. In that mode an author
passes only when they uploaded the file (rule 3a,
`SubmissionFileUploaderAccessPolicy`) or when the file is a revision
file of a round that asks for revisions (rule 3b). The API already sends
each file's `uploaderUserId`, so the list has what it needs to follow
rule 3a.

The file grids of 3.4 and 3.3 have the same gap:
`SubmissionFilesGridRow` adds the edit link to every row once the grid
has the `FILE_GRID_EDIT` capability, which the author's two grids
(`AuthorSubmissionDetailsFilesGridHandler`,
`AuthorReviewRevisionsGridHandler`) have had since 2014.

Reach:

- "Submission Files", "Update File Details": on screen, `main` and 3.5,
  OJS and OMP.
- "Revisions Uploaded", "Update File Details" and "Delete", on a round
  that asks for no revisions: on screen, `main`, OJS and OMP. The
  refused "Delete" shows the dialog "Error", because `fileDelete()` in
  `useFileManagerActions.js` treats every refusal as a network error.
- "Revisions Uploaded" on a round that asks for revisions: the author is
  refused the same way, but there rule 3b is meant to let them through.
  A typo in `SubmissionFileRequestedRevisionRequiredPolicy` makes that
  rule always deny; it is the report
  [U36-A2-author-refused-on-editors-revision-file](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A2-author-refused-on-editors-revision-file.md).
- A second author with their own account on the submission is refused on
  the first author's files by the same rule 3a (read in the code, not
  walked).
- Not touched: "Copyedited Files" gives the author no row actions. A
  reviewer is shown no list through this file manager (the only
  reviewer configuration, `REVIEWER_ATTACHMENT_FILES`, grants its
  actions to the editorial roles), so nothing changes for them.
- Not covered: the author's "Upload" button above "Revisions Uploaded"
  is shown on every round and refused on a round that asks for no
  revisions. That is a separate fault with its own cause (spec U36,
  entry A7).

## Proposed fix

Let `getItemActions()` offer "Update File Details" and "Delete" to a
user without an editorial role in the stage only on the files that user
uploaded, which is the server's rule 3a. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-update-file-details-offered-then-refused/fix.diff);
its changed lines, without their context:

```diff
--- a/lib/ui-library/src/managers/FileManager/useFileManagerConfig.js
+++ b/lib/ui-library/src/managers/FileManager/useFileManagerConfig.js
@@ -1,6 +1,6 @@
-import {useCurrentUser} from '@/composables/useCurrentUser';
+import {useCurrentUser, EditorialRoles} from '@/composables/useCurrentUser';
@@ -409,8 +409,11 @@
-	const {hasCurrentUserAtLeastOneAssignedRoleInStage, getCurrentUserRoles} =
-		useCurrentUser();
+	const {
+		hasCurrentUserAtLeastOneAssignedRoleInStage,
+		getCurrentUserRoles,
+		getCurrentUserId,
+	} = useCurrentUser();
@@ -440,9 +443,18 @@
+		// Without an editorial role in the stage (an author), the server lets
+		// a user change only the files they uploaded (SubmissionFileAccessPolicy)
+		const ownFilesOnly = !hasCurrentUserAtLeastOneAssignedRoleInStage(
+			submission.value,
+			submissionStageId.value,
+			EditorialRoles,
+		);
+
 		return {
 			fileStage: config.fileStage,
 			permittedActions,
+			ownFilesOnly,
@@ -542,6 +554,9 @@
 		const enabledActions = managerConfig.permittedActions;
+		const canChangeFile =
+			!managerConfig.ownFilesOnly ||
+			file?.uploaderUserId === getCurrentUserId();
@@ -556,7 +571,7 @@
-		if (enabledActions.includes(Actions.FILE_EDIT)) {
+		if (enabledActions.includes(Actions.FILE_EDIT) && canChangeFile) {
@@ -572,7 +587,7 @@
-		if (enabledActions.includes(Actions.FILE_DELETE)) {
+		if (enabledActions.includes(Actions.FILE_DELETE) && canChangeFile) {
```

Tried on `main`, OJS and OMP: at step 6 the editor's row has no "More
Actions" button, and the author's own row still offers "Update File
Details". Two neighbouring behaviours were the same with the fix and
without it: the author's own file opens, saves a new name and shows it
in the list; and `dbarnes` is offered "Update File Details", "More
Information" and "Delete" on the author's file, whose window opens for
him.

**Alternatives**

- Leaving the menu and making the refusal kinder (a notice instead of an
  empty window): the author would still be offered what they cannot do.
- Having the API send what the current user may do with each file (a
  `canEdit` flag from the same policy): the exact rule in one place, but
  an API change and a policy run per file.

**What goes with it**

- The other A2 report. Its fix repairs rule 3b, after which an author
  may change other people's files on "Revisions Uploaded" while the
  round asks for revisions; this fix would then hide entries that work.
  The two are decided together: if the team keeps rule 3b, land its fix
  first and widen `canChangeFile` here with the round's state (the
  submission's `reviewRounds` carry a status; the round's last decision
  is not in the list's data today). If the team drops rule 3b, this fix
  is complete as it stands.
- Plugins. `getItemActions` and `getManagerConfig` keep their
  signatures; the config gains one key, `ownFilesOnly`. A plugin that
  lets authors change other files through the
  `SubmissionFileAccessPolicy::authorFileAccess` hook can add the
  entries back through the store's `extender.extendFn('getItemActions',
  …)`, the extension point `fileManagerStore.js` exposes.
- 3.5 is a hand port, not this diff. There the function is
  `getItemActions({item, managerConfig})`, so the diff's `file` would be
  an undeclared name and throw on every row; it becomes
  `item?.uploaderUserId`. `useCurrentUser()` is destructured on one line
  without `getCurrentUserRoles`, so that hunk fails, and three more
  hunks apply only with fuzz (`patch --dry-run` on the 3.5 checkout).
  The port was not walked.
- 3.4 and 3.3 are affected, and no fix is proposed for them: the menu
  is built in the legacy grids there.
- Guard: ui-library has no unit test for `useFileManagerConfig`; a test
  of `getItemActions()` with an author and another user's file would
  have caught it.

Small: on `main` the diff touches one file,
`useFileManagerConfig.js`, 19 lines added and 5 removed in six places,
and it covers both entries. The 3.5 hand port is a backport and not
counted; 3.4 and 3.3 are left as they are.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-update-file-details-offered-then-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-update-file-details-offered-then-refused/lib.js))
  takes steps 1–7 on OJS and OMP, then the control. With `MODE=nb` it
  takes the two neighbouring behaviours alone. Each run starts from an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/author-update-file-details-offered-then-refused/walk.js`
  (`MODE=nb` in front for the neighbours,
  `PKP_E2E_LINE=stable-3_5_0` for 3.5).
- Datasets: pkp/datasets c657990 (2026-10-01).
- "Revisions Uploaded" on a round that asks for no revisions was walked
  on screen by the other A2 report's script
  ([walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-refused-on-editors-revision-file/walk.js),
  `MODE=nb`): an editor's upload to the list on OJS submission 7 and OMP
  submission 2, then the author's two entries.
- Branch tips. `main`: OJS b84f8e2e44, OMP 3b0ecf794; pkp-lib ddd8ab243a
  (OJS) and 3dc90c81a6 (OMP); ui-library 64d67363 (OJS) and 280f98c5
  (OMP). 3.5: OJS 091fb65453, OMP 9c5e24246; pkp-lib cf3f984335;
  ui-library d4e01883. 3.4: OJS 75cc2d488b, OMP 0aec65441; pkp-lib
  32b0f4b4af. 3.3: OJS ac77c9fb35, OMP 8e72fc883; pkp-lib f6ab331645.
- Code reads. 3.5: `useFileManagerConfig.js` gives the author the same
  actions in the same two configurations; its
  `getItemActions({item, managerConfig})` never reads the row and labels
  the entry `grid.action.edit`. 3.4 and 3.3: the two author grids'
  capabilities (`FILE_GRID_DOWNLOAD_ALL | FILE_GRID_EDIT` and
  `FILE_GRID_ADD | FILE_GRID_EDIT | FILE_GRID_DELETE`),
  `SubmissionFilesGridRow`, `PKPManageFileApiHandler::authorize()` and
  `SubmissionFileAccessPolicy` rules 3a and 3b.
- Introduced: `git log -S"Actions.FILE_EDIT"` on
  `useFileManagerConfig.js` leads to f77229c3, whose first version of
  the file already gives the author `FILE_EDIT` on `SUBMISSION_FILES`;
  `git log -S"FILE_GRID_EDIT"` on the author's grid leads to 9ac9b65283
  ("Permit file metadata editing"), which added the capability and the
  per-row link together.
- Upstream searches (pkp/pkp-lib, pkp/ui-library): the refusal's text
  with "file" and "author", "Update File Details", "author cannot edit
  file uploaded by editor", `SubmissionFileUploaderAccessPolicy`,
  `SubmissionFileRequestedRevisionRequiredPolicy`, "FileManager author
  edit". `pkp/pkp-lib#10431` (closed) reviewed the author's revision
  policies for a plugin hook and does not touch the menu.
- Not walked: OPS, a second author's account on the submission, and the
  fix on 3.5.
