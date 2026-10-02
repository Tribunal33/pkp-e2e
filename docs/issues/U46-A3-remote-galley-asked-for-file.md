# An editor saving a galley at a separate website is asked for a file and offered "Change File"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS (a press has no galleys, and its formats do not chain an upload)
  - 3.5: OJS, OPS
  - 3.4: none (code; the older galley list)
  - 3.3: none (code; the older galley list)
- **Introduced** `pkp/ui-library#412` (no issue linked) · [f77229c3b](https://github.com/pkp/ui-library/commit/f77229c3bf383292c840fe98c77dba66cac6402b) · 2024-09-19 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** `pkp/pkp-lib#12226` (open), covering the upload window after "Save"; not the "Change File" offer
- **Tracked in** spec U46 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a journal's or preprint server's "Galleys" page, an editor adds a
galley that readers will find at another website: they tick "This
galley will be available at a separate website.", give the address and
press "Save". The upload window "Upload a File Ready for Publication"
opens next and asks for a component and a file, as for a galley that
needs one. The galley is already saved, and the window can be cancelled
without harm, but nothing on screen says so.

The galley's row keeps offering "Change File". A file uploaded there
turns the row's label into a download link and adds "More Information",
so the galley looks like a file galley in the list, while readers are
still sent to the address and never get the file. The older galley
list, which a preprint server's submission wizard still shows, asks no
file for such a galley and offers none on its row.

## Impact

- **Lost**: nothing readers see. An editor who goes on uploads a file
  nobody can download, and no screen removes that file alone: only
  deleting the galley (which deletes its files) and adding it again puts
  the row back.
- **Who**: editors and Layout Editors who add a galley at a separate
  website, each time they do; on a preprint server also Moderators, and
  the Author, who reaches the "Galleys" page after submitting, while
  their "Permissions" allow changes and before the preprint is posted.
- **Way round**: "Cancel" in the upload window.

Low: the window asks for a file the galley does not need, and readers
get the address whether or not a file is uploaded. A file that reached
readers in place of the address would make it medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OPS (the server `publicknowledge`).
- One small PDF on your computer.

On a journal:

1. Sign in as the editor `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 5, "Genetic transformation of forest trees"
   (Production, no galleys yet), and press "Galleys" in the side menu.
3. Press "Add galley". In "Create New Galley" type "Remote u46w2" in
   "Galley Label", tick "This galley will be available at a separate
   website.", type `https://example.org/u46w2-paper` in "URL of
   remotely-hosted content" and press "Save".
4. Read the window that opens, then press its "Cancel".
5. On the row "Remote u46w2" press "More Actions" and read the menu.
6. Choose "Change File". Choose the component "Article Text", upload the
   PDF, press "Continue", "Continue", "Complete".
7. Read the row "Remote u46w2" and its "More Actions" menu.

On a preprint server: the same steps as `dbarnes` on preprint 1, "The
influence of lactation on the quantity and quality of cashmere
production" ("Galleys" under "Preprint" lists the galley "PDF"), with
the component "Preprint Text" in step 6. Then:

8. Press "Post" and confirm with "Post". Sign out, open the preprint's
   page (`/index.php/publicknowledge/preprint/view/1`) and press
   "Remote u46w2".

**Expected**: "Save" closes "Create New Galley" and the list shows
"Remote u46w2" with nothing more asked. Its menu offers "Edit" and
"Delete", with no "Change File", as the older galley list does for a
galley at a separate website.

**Observed**: after "Save" the window "Upload a File Ready for
Publication" opens on "1. Upload File", asking "Article Component*"
("Select article component"; on the preprint server "Preprint
Component*") and offering "Upload File", with "Continue" greyed. After
"Cancel" the row "Remote u46w2" is plain text and its
menu offers "Edit", "Change File", "Delete". After step 6 the label is a
link to the uploaded file and the menu offers "Edit", "Change File",
"More Information", "Delete"; "Edit" still shows the box ticked and the
address. In step 8 the preprint's page lists "PDF" and "Remote u46w2",
and "Remote u46w2" answers `302` to `https://example.org/u46w2-paper`.

Unchanged: a galley added without the box ticked opens the same upload
window after "Save", as it should, and its row offers "Change File".

## Cause

Two places in ui-library's galley manager lost the rule the older
galley list keeps: a galley at a separate website has no file to ask
for.

`galleyAdd()` in `src/managers/GalleyManager/useGalleyManagerActions.js`
opens "Create New Galley" (the legacy `addGalley` operation) and, when it
closes with a galley id in `closeData.dataChanged[0]`, calls
`galleyChangeFile()` for that id, which opens the upload wizard. Every
save sends that id: `updateGalley()` of `ArticleGalleyGridHandler`
(OJS) or `PreprintGalleyGridHandler` (OPS), the handlers the manager
reaches through `getGalleyGridComponent()`, answers
`DAO::getDataChangedEvent($galley->getId())`. So the wizard opens
whatever was saved. The older list decides after the save, from the
galley itself: `ArticleGalleyGridHandler::fetchRow()` (OJS) and
`PreprintGalleyGridHandler::fetchRow()` (OPS) raise the `uploadFile`
event only for a galley with neither `urlRemote` nor
`submissionFileId`.

`getItemActions()` in `src/managers/GalleyManager/useGalleyManagerConfig.js`
adds "Change File" for every galley the role may change. The older
rows, `ArticleGalleyGridRow` and `PreprintGalleyGridRow`, add their
upload action only when `urlRemote` is empty.

Reach:

- Every role offered "Add galley" and "Change File" on the "Galleys"
  page meets it, OJS and OPS (on screen, `main` and 3.5).
- Readers: `ArticleHandler` and `PreprintHandler` list a galley with an
  address among the main galleys whatever its file's component, and
  redirect its view and download to the address before any file is
  read (checked in the code; walked on OPS). A file uploaded to such a
  galley is stored as a proof file of the submission and served to
  nobody.
- A preprint server's submission wizard still uses the older list,
  which asks no file for such a galley and offers it no upload (checked
  in the code; the spec's earlier walk saw the same).
- A press has no galleys. Its publication formats keep the older list,
  whose "Add" opens no upload after a save (checked in the code).

## Proposed fix

A proposal: restore both checks of the older list in the Vue manager.
After "Create New Galley" closes, read the saved galley with
`GET submissions/{id}/publications/{publicationId}` (its galleys carry
`urlRemote` and `submissionFileId`), and open the upload wizard only
when it has neither, as `fetchRow()` did. In the row menu, offer
"Change File" only when the galley has no `urlRemote`, as the older rows
did. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-asked-for-file/fix.diff):

```diff
--- a/lib/ui-library/src/managers/GalleyManager/useGalleyManagerActions.js
+++ b/lib/ui-library/src/managers/GalleyManager/useGalleyManagerActions.js
@@ -2,6 +2,7 @@
 import {useFetch, getCSRFToken} from '@/composables/useFetch';
+import {useUrl} from '@/composables/useUrl';
@@ -26,20 +27,38 @@
-		openLegacyModal({title: t('submission.layout.newGalley')}, (closeData) => {
-			if (closeData.dataChanged[0]) {
+		openLegacyModal(
+			{title: t('submission.layout.newGalley')},
+			async (closeData) => {
+				const galleyId = closeData.dataChanged[0];
+				if (!galleyId) {
+					return finishedCallback();
+				}
+
+				// Ask for a file only when the new galley has neither a file nor a
+				// remote URL, as the legacy galley grid did (fetchRow's uploadFile)
+				const {apiUrl} = useUrl(
+					`submissions/${submission.id}/publications/${publication.id}`,
+				);
+				const {fetch, data} = useFetch(apiUrl);
+				await fetch();
+				const galley = data.value?.galleys?.find(
+					(g) => g.id === Number(galleyId),
+				);
+				if (galley?.urlRemote || galley?.submissionFileId) {
+					return finishedCallback();
+				}
+
 				galleyChangeFile(
 					{
 						submission,
 						publication,
-						galley: {id: closeData.dataChanged[0]},
+						galley: {id: galleyId},
 					},
 					finishedCallback,
 				);
-			} else {
-				finishedCallback();
-			}
-		});
+			},
+		);
--- a/lib/ui-library/src/managers/GalleyManager/useGalleyManagerConfig.js
+++ b/lib/ui-library/src/managers/GalleyManager/useGalleyManagerConfig.js
@@ -174,7 +174,11 @@
-		if (config.permittedActions.includes(Actions.GALLEY_CHANGE_FILE)) {
+		// A remote galley has no file to change (as in the legacy galley grid)
+		if (
+			config.permittedActions.includes(Actions.GALLEY_CHANGE_FILE) &&
+			!galley.urlRemote
+		) {
```

If the read fails, `useFetch()` shows its network error dialog and the
wizard then opens as today, so a file galley still gets its upload.
The read is a second request for the publication: the list's reload
(`triggerDataChange()`) fetches the same address once the windows
close. That costs one small request per added galley, and keeps the
decision independent of when the reloaded publication reaches the list. An editor who
later unticks the box in "Edit" empties the address (the form's script
does), and the row offers "Change File" again.

Tried on `main`, OJS and OPS: "Save" closed "Create New Galley" with no
other window, and the row "Remote u46w2" offered "Edit" and "Delete";
the preprint's reader link still went to the address.

The path the fix must leave alone was walked with the fix applied and
again with it reverted, with the same result. A galley added without
the box ticked opened the upload wizard after "Save". After the upload
its row offered "Change File", as did, on the preprint server, the
dataset's "PDF".

**Alternatives**

- Await the list's own reload and read the galley from the refreshed
  `publication` prop: the same rule, but it depends on the prop having
  updated by then; the explicit read does not.
- Answer `updateGalley()` without the galley id for a galley with an
  address. The older list in the submission wizard receives the same
  answer, so it would change too. It also moves a screen's decision
  into the handler.
- Ask a component and finish, as `pkp/pkp-lib#12226` suggests: a galley
  with no file has nowhere to keep a component today, so that is a
  product decision.

**What goes with it**

- No data repair: a galley already holding both an address and a file
  keeps both, readers still get the address, and its row stops offering
  "Change File".
- No API or hook change.
- Backport: on 3.5 `galleyAdd()` is the same, so that hunk applies as
  written; `getItemActions()` there takes `{config, publication}` only,
  so the 3.5 change also adds `galley` to its parameters (the store
  already passes it). Not tried on 3.5.
- Guard: a Cypress step that adds a galley at a separate website and
  expects no upload window and no "Change File".

Small: two conditions in two ui-library files, each copying a check
the older list already makes, with no data repair.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-asked-for-file/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remote-galley-asked-for-file/lib.js))
  takes the Steps on OJS and OPS and records each window, the row's
  label and menu, the stored galley (address and file) and the reader's
  redirect; `MODE=nb` adds a galley with a file and reads its menu. Each
  run starts from an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/remote-galley-asked-for-file/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/remote-galley-asked-for-file/fix.diff ojs ops`.
- Where the walk differs from the Steps: it hands the PDF to the upload
  box's file input instead of pressing "Upload File". Step 8 was walked
  on OPS only; the journal's reader side is read in the code
  (`ArticleHandler`).
- The walks ran in Chromium on PostgreSQL (nothing here depends on the
  database). Datasets: pkp/datasets e8dafbc (2026-10-02). `main` and 3.5
  gave the same result on both apps.
- Branch tips. `main`: OJS b84f8e2e44, OPS c8af945bb7; pkp-lib
  ddd8ab243a (OJS) and 3dc90c81a6 (OPS); ui-library 64d67363 (OJS) and
  280f98c5 (OPS). 3.5: OJS 091fb65453, OPS 38b61882d3; pkp-lib
  cf3f984335; ui-library d4e01883. 3.4: OJS c1827e3527, OPS acd8ae704b;
  pkp-lib 9e41f10273; ui-library ee684b34. 3.3: OJS ac77c9fb35, OPS
  c5532e2161; pkp-lib ac3fa73402; ui-library 96959f9e.
- Code reads. 3.4 and 3.3: ui-library
  has no `GalleyManager`; the workflow shows the older list, whose
  `fetchRow()` raises `uploadFile` only without an address or a file
  (`getRemoteUrl()`), and whose row adds its upload action only without
  an address (OJS `ArticleGalleyGridRow`; OPS `PreprintGalleyGridRow`
  on 3.4, `ArticleGalleyGridRow` on 3.3).
- Introduced: `git blame` on `galleyAdd()`'s chain gives f77229c3b, the
  file's first commit. Blame on the "Change File" entry stops at
  41d07ae95 (2025), a refactor that moved `getItemActions()` into
  `useGalleyManagerConfiguration.js` (since renamed
  `useGalleyManagerConfig.js`); f77229c3b's `getItemActions()` already
  added it for every galley.
- Upstream: `pkp/pkp-lib#12226` (OJS 3.5.0-3, milestone 3.5.0-x); a
  comment confirms it on 3.5 and `main`.
- Unverified: the read-only path (an Author on a preprint server who may
  not edit, offered "View") was not walked; it offers no "Change File"
  in the code either way.
