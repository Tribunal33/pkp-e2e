# A Layout Editor is offered every action on the "Media" page, and each change is refused

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U47 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A version's "Media" page holds the images and other files its HTML
galley shows, and the production team manages them there. An assigned
Guest Editor, Layout Editor, Designer, Indexer or Proofreader (and a
Section Editor or Moderator whose assignment's "Permissions" box was
unticked) sees "Add Media File", "Batch Link Media" and the full row
menu, exactly as a Journal Manager does. Every change they make then
fails: "Upload Files", "Link Media" and the delete dialog's "OK" open an
"Error" window reading "You are not allowed to edit this publication.",
and "Save" in "Edit Metadata" keeps the window open with only a passing
notice, "An unexpected error has occurred. Please reload the page and
try again."

The page offers the changes by role; the server accepts them only from
people allowed to change the publication, the right the "Permissions"
box on an assignment grants. One of the two is wrong and the team must
choose which; this report recommends that the page follow the server.

"Permissions" is unticked by default for the Guest Editor and the
assistant roles, so with default roles each of them assigned to a
submission meets this. An editor can tick the box on their assignment,
or make the change for them.

## Impact

- **Lost**: the participant's time and the details they typed into
  "Edit Metadata". Nothing stored changes.
- **Who**: the people named in the Summary, on every visit to a
  version's "Media" page. Adding figures is the kind of work a Layout
  Editor or Designer is assigned for.
- **Way round**: an editor ticks "Permissions" on the participant's
  assignment ("Permit submission metadata edit." on the role does it for
  later assignments), or makes the change.

Medium: the task fails for the people the page offers it to, but an
editor can unblock it on screen; it would be high if the team rules
that these roles must manage media without the box.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. On OJS, submission 5,
  "Genetic transformation of forest trees", is in Production with
  `gcox` (Layout Editor) assigned, his "Permissions" box unticked (the
  Layout Editor role's default). On OMP the same holds for submission 4,
  "How Canadians Communicate: Contexts of Canadian Popular Culture",
  and `gcox`. OPS has no assistant roles: there `sberardo` (Moderator) is
  assigned to submission 1, "The influence of lactation on the quantity
  and quality of cashmere production", with "Permissions" ticked, and
  step 3 unticks it.
- Two image files, `figure.png` and `profile-image-400.png` (any PNGs).

As the editor:

1. Sign in as `dbarnes`.
2. On the dashboard press "View" on submission 5 [OMP: 4]. [OPS: open
   "Active submissions" first; submission 1 is not under "Assigned to
   me".]
3. [OPS only] In "Participants", press "Stephanie Berardo More
   Actions" › "Edit", untick the box under "Permissions" and press "OK".
4. Side menu: "Publication" [OPS: "Preprint"] › "Media".
5. "Add Media File" › "Click to upload files" › choose `figure.png`;
   "What kind of media is this?" "Image"; "Upload Files". The list shows
   `figure.png`.
6. Sign out.

As the Layout Editor [OPS: the Moderator]:

7. Sign in as `gcox` [OPS: `sberardo`].
8. Open the same submission, "Publication" › "Media". Look above the
   table, and press `figure.png`'s "More Actions".
9. "Add Media File" › choose `profile-image-400.png`, "Image", "Upload
   Files". Press "OK" in the "Error" window, then close "Upload Media
   File" with its "Close" and "Yes".
10. `figure.png`'s "More Actions" › "Edit Metadata"; set "Name of the
    file" to `figure-u47r1.png`; "Save".
11. Reload the page (leave when the browser asks) and open "Media"
    again.
12. "Batch Link Media" › "Link Media". Press "OK" in the "Error" window,
    then close "Batch Link Media" with its "Close".
13. `figure.png`'s "More Actions" › "Delete File" › "OK".

**Expected**, as recommended below: the page offers `gcox` what the
server lets him do. Without "Permissions" he sees the list as an Author
does: no "Add Media File", no "Batch Link Media", and no "Edit
Metadata", "Manually Link Media" or "Delete File" in the row menu. (If
the team rules the other way, steps 9–13 save.)

**Observed**: in step 8 "Batch Link Media" and "Add Media File" are
above the table, and the row menu offers "More Information", "Edit
Metadata", "Manually Link Media" and "Delete File". In steps 9, 12 and
13 a window opens:

```
Error
You are not allowed to edit this publication.
OK
```

and the list still shows `figure.png` alone. In step 10 the window
stays open holding `figure-u47r1.png`, and a notice at the top right
reads "An unexpected error has occurred. Please reload the page and try
again." for a few seconds. After the reload in step 11 the row reads
`figure.png`. Each change answers 401:

```
POST   …/api/v1/submissions/5/publications/6/mediaFiles            401
PUT    …/api/v1/submissions/5/publications/6/mediaFiles/{id}       401
POST   …/api/v1/submissions/5/publications/6/mediaFiles/link       401
DELETE …/api/v1/submissions/5/publications/6/mediaFiles/{id}       401
{"error":"api.submissions.403.userCantEdit","errorMessage":"You are not allowed to edit this publication."}
```

The same on OMP for `gcox` and on OPS for `sberardo`. Control:
`dbarnes`'s upload in step 5 answers 200 and holds.

## Cause

The page and the server decide by different rules.

The server: `lib/pkp/api/v1/submissions/MediaFilesController.php`
lets `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR` and
`ROLE_ID_ASSISTANT` reach the write routes, then `authorize()` adds
`PublicationWritePolicy` for `add`, `edit`, `delete`, `link` and
`linkMany`. Its `PublicationCanBeEditedPolicy` permits a Site
Administrator, then asks `Repo::submission()->canEditPublication()`:
true for a manager-level role, otherwise only when one of the user's
assignments on the submission has `canChangeMetadata` (the "Permissions"
box). That check has been there since the API was written
([f4eccf8b](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001),
`pkp/pkp-lib#12251`).

The page: `lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js`
`getManagerConfig()` keeps an action when the user holds one of the
listed roles on the Production stage
(`hasCurrentUserAtLeastOneAssignedRoleInStage`), and lists
`ROLE_ID_SUB_EDITOR` and `ROLE_ID_ASSISTANT` beside the manager for
every write action. It never asks whether the user may edit the
publication. The workflow already knows: `workflowConfigEditorialOJS.js`
(which OMP and OPS merge) passes `canEdit: permissions.canEditPublication`
to `MediaFileManager`, the publication's `canCurrentUserChangeMetadata`,
computed by the same `canEditPublication()`. `MediaFileManager.vue`
declares only `publication` and `submission`, so the prop is dropped.
The page came this way in 3f97137c.

Which rule the code base intends is not written down, and the evidence
points both ways:

- For the server's rule: the media, JATS and body text APIs, the three
  Production files that moved to the REST API, all add
  `PublicationWritePolicy` for their writes. That policy's
  `StageRolePolicy` lists `ROLE_ID_ASSISTANT`, so assistants are expected
  to pass it through the "Permissions" box, whose help reads "Allow this
  person to make changes to the publication, such as the title,
  abstract, metadata and other publication details." Media files belong
  to a publication version (a new version copies them). And the
  workflow hands the page `canEdit`, as if it were meant to use it.
- For the page's offer: on a journal the galley page lets a Layout
  Editor add and edit galleys without the box
  (`ArticleGalleyGridHandler::canEdit()` asks only for Production stage
  access), and so does a press's publication formats page
  (`PublicationFormatGridHandler`). The preprint galley page, in
  contrast, asks `canEditPublication()`. When `pkp/pkp-lib#12702`
  (2b135993) split the media routes, it wrote "media is a production
  artifact editable by editorial roles only (no author)" over a role
  list that includes `ROLE_ID_ASSISTANT`. That change was about the
  Author and the stage check (its issue: section editors refused a JATS
  upload); it left `PublicationWritePolicy` in place.

"Save" in "Edit Metadata" names no reason because that form submits
through `Form.vue`, whose `error()` passes on the server's message only
for a 403 or 404 and shows `common.unknownError` for the 401 this
refusal answers. The other actions go through `useFetch`, which opens
the "Error" window with the response's `errorMessage`.

Reach:

- All five write actions on the page, on OJS, OMP and OPS (one shared
  ui-library component): walked for "Add Media File" (`POST
  …/mediaFiles`), "Edit Metadata" (`PUT …/mediaFiles/{id}`), "Batch Link
  Media" (`POST …/mediaFiles/link`) and "Delete File" (`DELETE
  …/mediaFiles/{id}`). "Manually Link Media" sends `PUT
  …/mediaFiles/{id}/link` (`mediaFiles.link`), refused by the same
  policy (code).
- Who: every non-manager whose assignments all lack `canChangeMetadata`.
  The page counts any assignment in a role whose stages include
  Production, whatever stage the submission is in. At install
  `registry/userGroups.xml` gives the Guest Editor and the assistant
  roles no `permitMetadataEdit`. Walked: a Layout Editor (OJS, OMP), a
  Moderator (OPS).
- Not reached: the Author, who is offered the list alone; "More
  Information", a read.
- Related pattern, separate fixes: the JATS page's "Make available with
  publication" box and the "Body Text" page's "Save" are offered to the
  same people and refused by the same server rule
  ([U48 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a1),
  [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a2)).
  Each component ignores the permission in its own way
  (`WorkflowPublicationJats.vue` receives `canEdit` and leaves the box
  out of it; `WorkflowPublicationBodyText` is passed no `canEdit`), so
  each needs its own change. A ruling for the server side here would
  cover them too, since the three APIs share the policy.

## Proposed fix

Proposal, for the team to confirm: the page should follow the server
and offer the write actions only to people who may edit the
publication. The server's rule is the one written on purpose, three
times, for the REST APIs of the Production files, and the workflow
already passes the page the server's own answer. Following it changes
no permission and keeps the "Permissions" box meaning what its help
says. The page then reads the `canEdit` it is given and hides the write
actions when it is false, as `DataCitationManager` does with a
publication's data citations. Three small changes in ui-library,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-actions-offered-then-refused/fix.diff):

```diff
--- a/lib/ui-library/src/managers/MediaFileManager/MediaFileManager.vue
 	submission: {type: Object, required: true},
+	canEdit: {type: Boolean, default: true},
 });
--- a/lib/ui-library/src/managers/MediaFileManager/mediaFileManagerStore.js
-		const {submission, publication} = toRefs(props);
+		const {submission, publication, canEdit} = toRefs(props);
…
-			mediaFileManagerConfig.getManagerConfig({submission}),
+			mediaFileManagerConfig.getManagerConfig({submission, canEdit}),
--- a/lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js
+	writeActions: [
+		Actions.MEDIA_FILE_ADD,
+		Actions.MEDIA_FILE_BATCH_LINK_IMAGES,
+		Actions.MEDIA_FILE_EDIT_METADATA,
+		Actions.MEDIA_FILE_MANUALLY_LINK_IMAGE,
+		Actions.MEDIA_FILE_DELETE,
+	],
 };
…
-	function getManagerConfig({submission}) {
+	function getManagerConfig({submission, canEdit}) {
 		const permittedActions = MediaFileManagerConfigurations.actions.filter(
 			(action) => {
+				if (
+					canEdit?.value === false &&
+					MediaFileManagerConfigurations.writeActions.includes(action)
+				) {
+					return false;
+				}
```

`default: true` follows `DataCitationManager`; the Author's config
passes no `canEdit` and is held to the list by the role list.

Tried on OJS, OMP and OPS `main`: `gcox` and `sberardo` see the list
with no "Add Media File" or "Batch Link Media", and the row menu offers
"More Information" alone. With and without the fix, a participant who
may edit the publication (`dbuskins` on OJS and OPS, `dbarnes` on OMP)
is offered every action, and the upload, the rename, the batch link and
the delete all save.

**Alternatives**:

- Let the server accept the Production roles it lists. The route
  comment reads "media is a production artifact editable by editorial
  roles only (no author)", and on a journal and a press a Layout Editor
  already manages galleys and formats without "Permissions". That means
  replacing `PublicationWritePolicy` on these routes with a check of
  Production stage access (as `ArticleGalleyGridHandler::canEdit()`
  does), keeping the Author out. It is the right fix if the team holds
  media to be production files like galleys rather than part of the
  publication; it changes who may write through the REST API, and the
  same question then stands for the JATS and body text APIs. The team
  should choose between this and the proposal.
- Grey the buttons instead of hiding them, as `FunderManager` does with
  its "Add" button: the Author's view of this page already hides them,
  and a greyed "Add Media File" gives no reason.
- Pass the server's message on for a 401 in `Form.vue`: worth doing for
  any refusal, but the page would still offer a change that cannot
  succeed.

**What goes with it**:

- No stored data, REST API or plugin hook changes; the server's rule
  stays.
- A Site Administrator with no role in the context is let through by
  `PublicationCanBeEditedPolicy` but gets `canCurrentUserChangeMetadata`
  false, so the fix hides the actions from them, as the other
  publication pages already do. The dataset's `admin` is also Journal
  manager and keeps them.
- Guard: an e2e check that an assigned Layout Editor without
  "Permissions" sees the list alone (a **Planned** item in the spec), or
  a unit test of `getManagerConfig()` with `canEdit` false.

Small: one component in one repo and a test, with no change to the
server or stored data; the alternative would be medium.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-actions-offered-then-refused/walk.js)
  (helpers in `lib.js` beside it), steps 1–13 on a freshly loaded
  default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/media-actions-offered-then-refused/walk.js`.
  `WALK=neighbour` takes steps 1–2 and 4–6, then steps 8–13 as
  `dbuskins` (OJS Section editor, OPS Moderator, "Permissions" ticked in
  the dataset) or, on OMP, `dbarnes` (the dataset assigns no Series
  editor to submission 4); it was walked with the fix in and out.
- Walked: OJS, OMP and OPS on `main`, each on its default dataset
  (pkp/datasets c657990, 2026-10-01, PostgreSQL). The refusal is decided
  by the user's assignments, not by a query; MySQL not checked. The walk
  opens the workflow at the address "View" opens. Not walked: the Guest
  Editor (the dataset assigns none), Designer, Indexer and Proofreader,
  and "Manually Link Media". `stage_assignments.can_change_metadata` is
  0 for every assistant assignment in the OJS and OMP datasets.
- Code reads on `main`: ui-library
  `src/managers/MediaFileManager/{MediaFileManager.vue,mediaFileManagerStore.js,useMediaFileManagerConfig.js,useMediaFileManagerManualLinkImageFormModal.js}`,
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorial{OJS,OMP,OPS}.js`,
  `src/pages/workflow/composables/useWorkflowPermissions.js`,
  `src/components/Form/Form.vue`,
  `src/managers/{DataCitationManager,FunderManager,GalleyManager}`,
  `src/pages/workflow/components/publication/{WorkflowPublicationJats,WorkflowPublicationBodyText}.vue`;
  pkp-lib `api/v1/submissions/MediaFilesController.php`,
  `api/v1/jats/PKPJatsController.php`,
  `api/v1/bodyText/PKPBodyTextController.php`,
  `classes/security/authorization/PublicationWritePolicy.php`,
  `classes/security/authorization/internal/PublicationCanBeEditedPolicy.php`,
  `classes/middleware/PolicyAuthorizer.php`,
  `classes/submission/Repository.php` `canEditPublication()`,
  `classes/publication/maps/Schema.php`; OJS
  `controllers/grid/articleGalleys/ArticleGalleyGridHandler.php`, OMP
  `controllers/grid/catalogEntry/PublicationFormatGridHandler.php`, OPS
  `controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php`. The
  three apps' copies of the ui-library and pkp-lib files above are
  identical.
- 3.5, 3.4, 3.3 (code): no `MediaFileManager` in ui-library, no
  `MediaFilesController` in pkp-lib and no `publication.mediaFiles`
  strings on `stable-3_5_0` (the checkouts), `stable-3_4_0` or
  `stable-3_3_0` (`git ls-tree` of pkp-lib and ui-library).
- Introduced: `git blame` gives `getManagerConfig()`, the role list,
  `MediaFileManager.vue`'s props and the config's unread `canEdit` to
  3f97137c, whose PR GitHub names `pkp/ui-library#794`. The server
  check predates it (f4eccf8b); 2b135993 (`pkp/pkp-lib#13054` for
  `pkp/pkp-lib#12702`) split the read and write routes and removed
  `SubmissionFileStageAccessPolicy`.
- Upstream: no pkp issue or PR found about this mismatch in pkp/pkp-lib,
  pkp/ui-library or pkp/ojs.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363); OMP `main` 3b0ecf794 and OPS `main`
  c8af945bb7 (both 3dc90c81a6, 280f98c5); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246, OPS 38b61882d3 (all cf3f984335, d4e01883);
  `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b, pkp-lib
  32b0f4b4af, ui-library ee684b34; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161, pkp-lib f6ab331645, ui-library 96959f9e.
