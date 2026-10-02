# A preprint's Author is offered "Change File" on every galley and refused on files others uploaded

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code; "Upload File" gives the galley a new file)
  - 3.3: none (code; "Upload File" gives the galley a new file)
- **Introduced** `pkp/ui-library#947` for `pkp/pkp-lib#13039` · [e26e36b6](https://github.com/pkp/ui-library/commit/e26e36b653de9093d8afc1ead1976ae6d36fcb67) · 2026-07-27 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U46 [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#ops3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, the Author who may edit their preprint (their
assignment has "Permissions" ticked, as installed, and the preprint is
not yet posted) is offered "Change File" on every galley. On a galley
whose file someone else uploaded (the Preprint Server Manager, a Moderator),
it opens "Upload a File Ready for Publication" showing only "The current
role does not have access to this operation.", and the galley keeps its
old file. On a galley whose file the Author uploaded, "Change File"
works.

Nothing is lost, and the galley's file can still be replaced another
way.

## Impact

- **Lost**: nothing; the galley keeps its file and the window says the
  action is not allowed.
- **Who**: the Author of a preprint not yet posted, while they may edit
  it, on a galley whose file a Preprint Server Manager or a Moderator
  uploaded.
- **Way round**: ask a Preprint Server Manager or a Moderator to change
  the file; or delete the galley and add it again with their file, which
  means typing its label, language and any URL path again, moving it
  back into place in the list, and re-entering its identifiers when
  galley identifiers are on.

Low: the refusal says plainly that the action is not allowed and
nothing changes, so the cost is a detour, not lost work. It would be
medium if the team decides that the Author must be able to replace any
galley's file, which 3.4 let them do by giving the galley a new file.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OPS (the server
  `publicknowledge`). Submission 1, "The influence of lactation on the
  quantity and quality of cashmere production", is in Production and
  not posted. Its Author, Carlo Corino (`ccorino`), may edit it: his
  assignment has "Permissions" ticked, as installed. Its galley "PDF"
  holds a file `ccorino` uploaded.
- Any PDF on your computer; the steps call it `u46w6.pdf`, and a second
  one `u46w6-replacement.pdf`.

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open "Active
   submissions" and press "View" on submission 1.
2. Side menu "Preprint" › "Galleys". Press "Add galley", type "Galley
   Label" `u46w6 PDF` and press "Save".
3. In "Upload a File Ready for Publication" choose "Preprint Text",
   upload `u46w6.pdf`, then press "Continue", "Continue" and "Complete".
   Sign out.
4. Sign in as `ccorino`. On "My Submissions" press "View" on
   submission 1, then side menu "Preprint" › "Galleys".
5. Press "More Actions" on `u46w6 PDF` and choose "Change File".

**Expected**, as recommended below: the `u46w6 PDF` row's menu offers
"Edit" and "Delete" but not "Change File", which the Author's own "PDF"
row keeps. (If the team decides that the Author may replace any
galley's file, step 5 opens the upload window on its first step and the
upload replaces `u46w6.pdf`.)

**Observed**: in step 4 both rows' menus offer "Edit", "Change File" and
"Delete". In step 5 the window "Upload a File Ready for Publication"
shows only "The current role does not have access to this operation."
and its "Close"; the galley still serves `u46w6.pdf`. The window's
request is refused:

```
GET /index.php/publicknowledge/$$$call$$$/wizard/file-upload/file-upload-wizard/start-wizard?fileStage=10&assocType=521&assocId=21&submissionId=1&stageId=5&uploaderRoles=4096&revisedFileId=20&revisionOnly=true
200 {"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

Control: as `ccorino`, on the "PDF" row, "Change File" opens the upload window on
its first step, and uploading `u46w6-replacement.pdf` with "Continue",
"Continue" and "Complete" makes "PDF" serve the new file.

## Cause

The menu offers "Change File" by role, while the server decides by who
uploaded the file.

The menu: ui-library's `useGalleyManagerConfig.js`
(`lib/ui-library/src/managers/GalleyManager/`) gives the Author on a
preprint server, while `canCurrentUserEditPublication` holds,
`GALLEY_CHANGE_FILE` with the rest of the set (`getAuthorActions()`),
and `getItemActions()` adds the entry to every row without looking at
the galley's file. This came with e26e36b6, which gave the Author back
the galley actions 3.4 had (`pkp/pkp-lib#13039`).

The server: "Change File" (`galleyChangeFile()` in
`useGalleyManagerActions.js`) opens the upload wizard as a revision of
the galley's file (`revisedFileId`), since ui-library 7bedb809
(`pkp/pkp-lib#12349`). `FileUploadWizardHandler::authorize()`
(`lib/pkp/controllers/wizard/fileUpload/`) then checks only
`SubmissionFileAccessPolicy` in modify mode on that file. An author
passes it when they uploaded the file (`SubmissionFileUploaderAccessPolicy`)
or when it is a revision file of a round that asks for revisions, which
a galley's file never is. The galley's file data the page already holds
carries `uploaderUserId`, so the menu can apply the same rule.

In 3.4 the Author's row action was "Upload File", which added a new
file to the galley without a `revisedFileId`, after which the galley
served the new file (OPS `submissionFile\Repository::add()`). That path
checks the galley (`RepresentationUploadAccessPolicy`), not the
uploader, so it worked on every galley.

Reach:

- A galley whose file a Preprint Server Manager or a Moderator
  uploaded: on screen, `main` and 3.5.
- A galley without a file (its upload was cancelled): "Change File"
  starts a new upload, which the Author may make (code).
- A second author with their own account is refused on the first
  author's galley files in the same way (code).
- Not affected: the editorial roles, whom the file rule lets through on
  every file of the stage.
- A manager or Moderator who is also on the submission (code): both
  the server's file rule and the page take the roles assigned on the
  stage. Assigned only as its Author, they count as the Author on both
  sides (a manager assigned to a lesser role loses the manager's file
  access in `SubmissionFileAccessPolicy`, and `currentUserAssignedRoles`
  lists only the Author role), so the fix hides the entry where the
  server refuses it. Assigned in an editorial role as well,
  `ownFilesOnly` is false and the server lets them through.
- The same pattern on the workflow's file lists: an author offered
  "Update File Details" and "Delete" on files they did not upload,
  [U36-A2-author-update-file-details-offered-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A2-author-update-file-details-offered-then-refused.md),
  in the file manager rather than here; a separate fix.

## Proposed fix

Offer "Change File" to a user without an editorial role on the stage
only on galleys that have no file yet or whose file that user
uploaded, the server's rule. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-galley-change-file-refused/fix.diff);
its changed lines, without their context:

```diff
--- a/lib/ui-library/src/managers/GalleyManager/useGalleyManagerConfig.js
+++ b/lib/ui-library/src/managers/GalleyManager/useGalleyManagerConfig.js
@@ -1,7 +1,7 @@
-import {useCurrentUser} from '@/composables/useCurrentUser';
+import {useCurrentUser, EditorialRoles} from '@/composables/useCurrentUser';
@@ -70,7 +70,8 @@
-	const {hasCurrentUserAtLeastOneAssignedRoleInStage} = useCurrentUser();
+	const {hasCurrentUserAtLeastOneAssignedRoleInStage, getCurrentUserId} =
+		useCurrentUser();
@@ -128,7 +129,15 @@
-		return {permittedActions};
+		// Without an editorial role in the stage (an author), the server lets a
+		// user replace only the files they uploaded (SubmissionFileAccessPolicy)
+		const ownFilesOnly = !hasCurrentUserAtLeastOneAssignedRoleInStage(
+			submission.value,
+			pkp.const.WORKFLOW_STAGE_ID_PRODUCTION,
+			EditorialRoles,
+		);
+
+		return {permittedActions, ownFilesOnly};
@@ -174,7 +183,16 @@
-		if (config.permittedActions.includes(Actions.GALLEY_CHANGE_FILE)) {
+		// "Change File" revises the galley's file when it has one
+		const canChangeFile =
+			!config.ownFilesOnly ||
+			!galley.submissionFileId ||
+			galley.file?.uploaderUserId === getCurrentUserId();
+
+		if (
+			config.permittedActions.includes(Actions.GALLEY_CHANGE_FILE) &&
+			canChangeFile
+		) {
```

It has the shape of the fix proposed for the same pattern in the file
manager (in the U36 report above; not in ui-library), and `!galley.submissionFileId` mirrors the condition
under which `galleyChangeFile()` sends a revision.

Tried on `main`, OPS: in step 4 the `u46w6 PDF` row offers "Edit" and
"Delete" and no "Change File"; the "PDF" row still offers it and its
upload window opens on its first step. With the fix and without it,
`dbarnes` is offered "Change File" on both rows.

**Alternatives**

- Let it work: allow an author who may edit the galleys to revise any
  galley's file, which is what 3.4 allowed through a new upload and
  what `pkp/pkp-lib#13039` listed ("Change File"). The upload wizard
  would have to authorize a revision of a galley's file by the galley's
  edit rule (OPS's `PreprintGalleyGridHandler::canEdit()`) instead of
  the uploader rule, a change to a shared access policy in pkp-lib and
  OPS. Not tried; it needs the team's decision first.
- Send the Author's "Change File" as a new upload, as 3.4 did: it would
  undo `pkp/pkp-lib#12349`, which made a galley keep one file with its
  revisions.

**What goes with it**

- Plugins: `getItemActions` keeps its signature and the config gains
  one key, `ownFilesOnly`. A plugin that widens authors' file rights
  through the `SubmissionFileAccessPolicy::authorFileAccess` hook can
  add the entry back through the store's
  `extender.extendFn('getItemActions', …)`.
- 3.5: the diff applies with offsets (`patch --dry-run` on the 3.5
  checkout); not walked with the fix.
- Guard: ui-library has no unit test for `useGalleyManagerConfig`; a
  test of `getItemActions()` for an author and another user's galley
  file would have caught it, and a scenario in spec U46.

Small: the menu already holds the uploader of each galley's file, so
the change is a check in one ui-library file, with no data to repair
and no change to the server.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-galley-change-file-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/moderator-galleys-offered-then-refused/lib.js))
  takes steps 1–5 and the control on an install freshly loaded from the
  default dataset; `MODE=nb` takes the neighbour checks alone:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/author-galley-change-file-refused/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It uploads copies of
  the suite's `preprint.pdf` and `replacement.pdf` under the names the
  steps use.
- Walked on `main` and 3.5, OPS, on PostgreSQL; datasets pkp/datasets
  e8dafbc (2026-10-02). The two versions showed the same.
- Branch tips. `main`: OPS c8af945bb7, pkp-lib 3dc90c81a6, ui-library
  280f98c5. 3.5: OPS 38b61882d3, pkp-lib cf3f984335, ui-library
  d4e01883. 3.4: OPS acd8ae704b, pkp-lib 9e41f10273. 3.3: OPS
  c5532e2161, pkp-lib ac3fa73402.
- Code reads. 3.5: `useGalleyManagerConfig.js` and
  `useGalleyManagerActions.js` as on `main` (its #13039 commit is
  4cd7582d, its #12349 commit 0f90e68b). 3.4: `PreprintGalleyGridRow`
  (`AddFileLinkAction`). 3.3: `ArticleGalleyGridRow.inc.php`, the same.
- Introduced: e26e36b6 (`pkp/ui-library#947`) added "Change File" to
  the Author's set; "Change File" had sent a revision since 7bedb809
  (`pkp/ui-library#824`, Touhidur Rahman, 2026-03-11), when the Author
  was offered no galley actions at all.
- Upstream searches (pkp/pkp-lib, pkp/ops, pkp/ui-library): "galley
  \"change file\" author", "galley author change file refused", "galley
  \"does not have access to this operation\"", "galley revision
  uploader author", `useGalleyManagerConfig`,
  `getGalleyManagerConfiguration`. `pkp/pkp-lib#13039` (closed) gave
  the Author the actions and lists "Change File" among them.
- Not walked: the way round (the Author's "Delete" on that galley and
  a new galley with their file; read in the code: the galley's delete
  removes its file whoever uploaded it, and the Author's "Add galley"
  uploads a new file; the new galley is a new record, with its own
  number, no identifiers and stored position 0, as the walks' added
  galleys were, so it lands wherever the database puts it among
  galleys sharing that position, spec U46 A7), a galley without a file, a second author, the
  alternatives, and the fix on 3.5.
