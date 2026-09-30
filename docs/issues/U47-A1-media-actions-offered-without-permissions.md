# A Layout Editor, or anyone without "Permissions", is offered every "Media" action, and the server refuses each change

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U47 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a1)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A participant whose assignment on a submission in Production has
"Permissions" unticked sees "Add Media File", "Batch Link Media" and the
full row menu on the version's "Media" page (the version's images and
multimedia files). Every change they try is refused. "Upload Files",
"Link Media" and "OK" in the delete dialog each open a dialog titled
"Error" that reads "You are not allowed to edit this publication.".
"Save" in "Edit Metadata" shows "An unexpected error has occurred.
Please reload the page and try again." and leaves the window open.
Nothing is saved.

This report takes the server's rule as the intended one. The
"Permissions" box on the assignment decides who may change the
publication, its media included, so these participants should not be
offered the changes. Whether they should be allowed to make them is a
product decision (Proposed fix, Alternatives).

"Permissions" is unticked by default for the Layout Editor, Designer,
Indexer and Proofreader, and in OJS also for the Guest Editor. So the
roles that usually prepare production files meet this unless an editor
ticks the box for them. The "Media" page is new on `main` and not yet
in a release.

## Impact

- **Lost:** no data. The participant loses the time spent choosing
  files, types and names. On "Save" the message blames an unexpected
  error rather than their permissions.
- **Who:** each of those roles on every submission they are assigned to
  in Production. Also a Section Editor (OJS), Series Editor (OMP) or
  Moderator (OPS) whose "Permissions" box an editor unticked.
- **Way round:** an editor ticks "Permissions" on the participant's
  assignment (Participants › "More Actions" › "Edit"), after which every
  change is accepted. Or the editor makes the change.

Medium: a production task fails for the roles that usually do it, but
three of the four refusals say why and an editor can grant the
permission on screen. It would be high if the changes looked saved and
were silently lost. Being unreleased makes it cheap to fix, not less
severe.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS journal, OMP press or OPS
  server `publicknowledge`. The submission, in Production:
  - OJS: submission 5, "Genetic transformation of forest trees";
    `gcox` (Graham Cox) is its Layout Editor.
  - OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
    Popular Culture"; `gcox` is its Layout Editor.
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production"; `dbuskins` (David Buskins) is a
    Moderator.
- Two media files on that submission, since the dataset has none. Sign
  in as `dbarnes` and open the submission's "Publication" › "Media"
  ("Preprint" › "Media" on OPS). Press "Add Media File", then "Click to
  upload files", and choose two small images (here `figure.png` and
  `profile-image-400.png`). Set `figure.png` to "Image" and "Web
  resolution", and `profile-image-400.png` to "Image" and "High
  resolution". Press "Upload Files".
- OPS only: a Moderator's assignment has "Permissions" ticked by
  default, so untick it. Still as `dbarnes`, in the workflow's
  "Participants" open David Buskins's "More Actions" › "Edit". In "Edit
  Assignment", untick "Permissions" ("Allow this person to make changes
  to the publication, …") and press "OK". On OJS and OMP, `gcox`'s
  assignment already has it unticked, as the Layout Editor role's
  default. Sign out.

Steps:

1. Sign in as `gcox` (OPS: `dbuskins`).
2. Open the submission and its "Publication" › "Media" ("Preprint" ›
   "Media").
3. Press "Add Media File", then "Click to upload files", and choose
   `figure.png`. Set it to "Image" and "Web resolution", and press
   "Upload Files".
4. Press "Batch Link Media". For `figure.png` choose
   `profile-image-400.png`, and press "Link Media".
5. On `figure.png`'s row open "More Actions" › "Edit Metadata". Type
   `u47r13 figure` in "Name of the file" and press "Save".
6. On `figure.png`'s row open "More Actions" › "Delete File", and press
   "OK" in "Delete media file?".
7. Reload the page.

**Expected:** at step 2 the page offers only what this participant may
do: the list and "More Information", with no "Add Media File", "Batch
Link Media", "Edit Metadata", "Manually Link Media" or "Delete File".
The version's other pages already take the permission into account: on
"Title & Abstract", for example, "Save" is greyed out for this
participant.

**Observed:** at step 2 the page shows "Batch Link Media" and "Add Media
File", and each row's "More Actions" offers "More Information", "Edit
Metadata", "Manually Link Media" and "Delete File".

At steps 3, 4 and 6 the change is refused and a dialog opens over the
window:

```
Error
You are not allowed to edit this publication.
OK
```

Each request behind them answers 401:

```
POST   …/api/v1/submissions/5/publications/6/mediaFiles                   (step 3)
POST   …/api/v1/submissions/5/publications/6/mediaFiles/link              (step 4)
DELETE …/api/v1/submissions/5/publications/6/mediaFiles/46                (step 6)
401 {"error":"api.submissions.403.userCantEdit","errorMessage":"You are not allowed to edit this publication."}
```

At step 5, `PUT …/mediaFiles/46` answers the same 401. No dialog opens.
A notice at the top right reads "An unexpected error has occurred.
Please reload the page and try again.", and the window stays open with
`u47r13 figure` in the box and no message on the form. After step 7 the
list still holds `figure.png` and `profile-image-400.png`, unchanged.
(The IDs shown are OJS's; OMP and OPS answer the same for their own.)

Control: `dbarnes` on the same page gets the same buttons and menu, and
his "Save" in "Edit Metadata" is accepted.

## Cause

The page decides what to offer from the person's role alone. The server
decides by the assignment's "Permissions" box.

`getManagerConfig()` in
`lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js`
keeps an action when the user holds one of the roles in
`MediaFileManagerConfigurations.permissions` on the Production stage
(`hasCurrentUserAtLeastOneAssignedRoleInStage()`).
`ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` and
`ROLE_ID_ASSISTANT` get every action, including add, batch link, edit
metadata, manual link and delete. Nothing reads the assignment's
`canChangeMetadata`.

On the server, `MediaFilesController::authorize()` in
`lib/pkp/api/v1/submissions/MediaFilesController.php` puts every write
(`add`, `linkMany`, `link`, `edit`, `delete`) behind
`PublicationWritePolicy`. Its `PublicationCanBeEditedPolicy` admits the
Site Administrator, then asks `Repo::submission()->canEditPublication()`.
That is true for manager-level users and otherwise only when one of the
user's assignments has `canChangeMetadata`.

The page already has the server's answer, but drops it:

- `useWorkflowPermissions.js` sets `canEditPublication` from
  `publication.canCurrentUserChangeMetadata`, which the publication map
  fills from that same `canEditPublication()`.
- The `media` entry of `workflowConfigEditorialOJS.js` passes it to the
  component as `canEdit: permissions.canEditPublication`. The OMP and
  OPS workflow configs are merged over it, so they pass the same.
- `MediaFileManager.vue` declares only `publication` and `submission`,
  so the value never arrives.

The sibling components that receive the same value use it:

- `CitationManager` and `FunderManager` disable their buttons and hide
  row actions.
- `DataCitationManager` hides its description, its add button and its
  row "Edit" and "Delete".
- `WorkflowPublicationForm` greys out "Save" through `canSubmit`.

The server's check is older than the page. `PublicationWritePolicy` has
guarded the media writes since the API was added
([f4eccf8b](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001),
`pkp/pkp-lib#12251`, 2026-02-13). The page came with
[3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4)
(`pkp/pkp-lib#12262`, 2026-05-06), which added both the role-only
configuration and the unused `canEdit` prop.

Reach:

- All five write actions, on all three apps. Each has its own route, and
  all five sit behind the same write check:
  - upload: `add` (`POST …/mediaFiles`)
  - "Batch Link Media": `linkMany` (`POST …/mediaFiles/link`)
  - "Manually Link Media": `link` (`PUT …/mediaFiles/{id}/link`)
  - "Edit Metadata": `edit`
  - delete: `delete`

  All but manual link were walked; manual link was read in the code.
  "More Information" and the list are reads and are not affected.
- The author's view (`workflowConfigAuthorOJS.js`) offers the list alone
  whatever the assignment says, and the server refuses authors every
  write by role. Not affected (walked).
- The same mismatch sits on the OJS "Body Text" page (code).
  `WorkflowPublicationBodyText.vue` also gets no `canEdit`, and its save
  goes through `PublicationWritePolicy`. It is described separately in
  [U48 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a2)
  and this fix leaves it out.
- The journal's galleys and the stage file lists also offer actions by
  role. Their server checks do not read "Permissions" either (code), so
  they do not show this fault:
  - `ArticleGalleyGridHandler::canEdit()` checks Production stage
    access.
  - The file lists check `SubmissionFileStageAccessPolicy`.
- The generic notice on "Save" (step 5) comes from the shared `Form.vue`
  `error()`. That shows the server's message only for a 403 or 404. The
  media API answers this refusal with 401, so the form falls through to
  `common.unknownError`. With the fix no one reaches that path from this
  page, unless the permission is taken away while the page is open.

## Proposed fix

The proposal: declare the `canEdit` prop that the workflow config
already passes, and drop the write actions when it is false. This is one
change in the shared ui-library component, which covers all three apps
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-actions-offered-without-permissions/fix.diff)):

```diff
--- a/lib/ui-library/src/managers/MediaFileManager/mediaFileManagerStore.js
+++ b/lib/ui-library/src/managers/MediaFileManager/mediaFileManagerStore.js
@@ -17,7 +17,7 @@
 		const extender = useExtender();
 		const {localize} = useLocalize();
 
-		const {submission, publication} = toRefs(props);
+		const {submission, publication, canEdit} = toRefs(props);
 
 		/**
 		 * Fetch genres from API
@@ -167,7 +167,7 @@
 		}
 
 		const mediaFileConfig = computed(() =>
-			mediaFileManagerConfig.getManagerConfig({submission}),
+			mediaFileManagerConfig.getManagerConfig({submission, canEdit}),
 		);
 
 		function getItemActions({mediaFile}) {
--- a/lib/ui-library/src/managers/MediaFileManager/MediaFileManager.vue
+++ b/lib/ui-library/src/managers/MediaFileManager/MediaFileManager.vue
@@ -98,6 +98,8 @@
 const props = defineProps({
 	publication: {type: Object, required: true},
 	submission: {type: Object, required: true},
+	/** Whether the current user may edit the publication (publication.canCurrentUserChangeMetadata) */
+	canEdit: {type: Boolean, default: true},
 });
 
 const Components = {
--- a/lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js
+++ b/lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js
@@ -35,6 +35,15 @@
 		Actions.MEDIA_FILE_MANUALLY_LINK_IMAGE,
 		Actions.MEDIA_FILE_DELETE,
 	],
+	// Actions that change the publication's media. The API refuses them
+	// (PublicationWritePolicy) unless the user may edit the publication.
+	editActions: [
+		Actions.MEDIA_FILE_ADD,
+		Actions.MEDIA_FILE_BATCH_LINK_IMAGES,
+		Actions.MEDIA_FILE_EDIT_METADATA,
+		Actions.MEDIA_FILE_MANUALLY_LINK_IMAGE,
+		Actions.MEDIA_FILE_DELETE,
+	],
 };
 
 export function useMediaFileManagerConfig() {
@@ -75,9 +84,15 @@
 		return columns;
 	}
 
-	function getManagerConfig({submission}) {
+	function getManagerConfig({submission, canEdit}) {
 		const permittedActions = MediaFileManagerConfigurations.actions.filter(
 			(action) => {
+				if (
+					!canEdit?.value &&
+					MediaFileManagerConfigurations.editActions.includes(action)
+				) {
+					return false;
+				}
 				return MediaFileManagerConfigurations.permissions.some((perm) => {
 					return (
 						perm.actions.includes(action) &&
```

The role table stays as it is, so who sees the page is unchanged; the
flag only takes away the write actions. The flag is the server's own
answer (`canCurrentUserChangeMetadata`), so the page offers what the API
accepts.

The default of `true` matches `DataCitationManager` and `FunderManager`.
A caller that passes no `canEdit` keeps today's actions, and the API
still refuses what it must. The one caller that matters, the editorial
workflow config, passes the flag. The author's view is list-only by its
role either way. A default of `false` would fail closed instead, and
take the write actions from every caller that passes nothing.
`required`, as `CitationManager` uses it, would warn on the author's
view, which passes none.

Tried on `main` in all three apps. At step 2 the participant saw the
list with "More Information" alone, and no request was refused. On the
same page `dbarnes` still got every action and his "Save" was accepted,
and the author still saw the list with no actions.

**Alternatives:**

- Let these participants make the changes: the server would accept the
  assistant roles regardless of "Permissions". This is a product
  decision. It would take media out of what the box controls.
- Keep the buttons and grey them out, as `CitationManager` and
  `WorkflowPublicationForm` do. This works too. Hiding suits the row
  menu, whose items cannot be shown disabled, and matches the data
  citations list.

**What goes with it:**

- No stored data to repair, and no change to the API or a plugin hook.
- `MediaFileManager.stories.js` passes no `canEdit`, so with the default
  of `true` its stories keep their write actions. A story with
  `canEdit: false` would show the read-only page.
- A Site Administrator with no role in the journal gets
  `canCurrentUserChangeMetadata` false, although the server lets them
  write. After the fix they lose the media actions, just as they already
  see "Save" greyed out on the version's other pages. If they should be
  allowed, the change belongs in `canEditPublication()`, for every page
  at once.
- The Body Text page needs the same change in its own component.
- The guard is an end-to-end test that signs in as a Layout Editor
  without "Permissions" and checks that the "Media" page offers no write
  action. A ui-library unit test of `getManagerConfig()` would first
  need `pkp.const` and `useCurrentUser()` stubbed, and ui-library has no
  such manager test yet.

Small: three short edits in one ui-library component, following its
sibling managers, and one end-to-end check on an existing page.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-actions-offered-without-permissions/walk.js).
  On an install freshly loaded from the default dataset, it takes the
  Steps above as written, on each app. It then runs the control:
  `dbarnes`'s menu and a "Save" in "Edit Metadata" (on
  `profile-image-400.png`), and the author's view (OJS `ddiouf`, OMP
  `bbeaty`, OPS `ccorino`).
  - Run: `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/media-actions-offered-without-permissions/walk.js`.
  - The fix check: `node bin/try-fix.js apply <folder>/fix.diff ojs omp ops`
    (rebuilds the JavaScript), the same walk on a freshly loaded
    install, then `node bin/try-fix.js revert ojs omp ops`. With the fix
    no request answered 400 or more and nothing failed in the browser.
  - fix.diff changed after the trial. The trial ran with `canEdit`
    defaulting to `false`; the diff now defaults it to `true`, to match
    the sibling managers. The walked path is the same either way,
    because the editorial config passes the flag explicitly. The changed
    diff was checked with `patch --dry-run` only, and applies to all
    three checkouts.
- Walked on `main`, PostgreSQL, the pkp/datasets `main` dumps of
  2026-09-30 (38ab955). The fault does not depend on the database.
- Tips:
  - `main`:
    - OJS bade233f73 (lib/pkp 2e377d27fc)
    - OMP 3b0ecf794 (lib/pkp 3dc90c81a6)
    - OPS c8af945bb7 (lib/pkp 3dc90c81a6)
    - ui-library 280f98c5 in all three
  - `stable-3_5_0`:
    - OJS 92b9a16b48
    - OMP 3081c9b00
    - OPS cf4fce69bd
    - lib/pkp a9c76aed62, ui-library 1a7a4750
  - `stable-3_4_0`:
    - OJS 9571d8fde7
    - OMP 0aec65441
    - OPS acd8ae704b
    - lib/pkp df13621c2d, ui-library ee684b34
  - `stable-3_3_0`:
    - OJS 9fdb9bcf9a
    - OMP 8e72fc883
    - OPS c5532e2161
    - lib/pkp d446601ebe, ui-library 96959f9e
- Code read on `main`:
  - ui-library:
    - `useMediaFileManagerConfig.js`, `mediaFileManagerStore.js`,
      `MediaFileManager.vue` and `MediaFileManager.stories.js`
    - `useWorkflowPermissions.js` and the `media` keys of
      `workflowConfigEditorialOJS.js` and `workflowConfigAuthorOJS.js`
    - for the sibling pattern: `DataCitationManager`, `CitationManager`,
      `FunderManager`, `GalleyManager` and `FormPage.vue` (`canSubmit`)
  - lib/pkp:
    - `MediaFilesController::getGroupRoutes()` and `authorize()`
    - `PublicationCanBeEditedPolicy`
    - `Submission\Repository::canEditPublication()`
    - `publication/maps/Schema.php` (`canCurrentUserChangeMetadata`)
  - The install defaults in each app's `registry/userGroups.xml`:
    `permitMetadataEdit` is set only on the manager-level groups and the
    Section Editor (on OPS also the Author). It is absent on the Guest
    Editor and every `ROLE_ID_ASSISTANT` group.
- Introduced: `git blame` gives
  [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4)
  for all three lines it was run on: `getManagerConfig()`, the
  permissions table and the config's
  `canEdit: permissions.canEditPublication`. The GitHub API names
  `pkp/ui-library#794` (merged 2026-05-06), for `pkp/pkp-lib#12262`.
  [2b135993](https://github.com/pkp/pkp-lib/commit/2b135993650663320cc924dd426660a4ab16d6b2)
  (`pkp/pkp-lib#12702`) later split the read route out for authors, and
  did not change the write check.
- 3.5, 3.4 and 3.3 were read in the code, not walked, since they have no
  surface. `stable-3_5_0`'s ui-library has no `MediaFileManager`, and
  its lib/pkp no `MediaFilesController`. `git grep` finds neither on
  `origin/stable-3_4_0` or `origin/stable-3_3_0` of lib/pkp and
  ui-library.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library were searched on
  2026-09-30. The searches turned up these, all closed and none of them
  this fault:
  - `pkp/pkp-lib#12262` (the page)
  - `#12251` (the API)
  - `#12702` / PR `#13054` (JATS upload refused to editors; the media
    route split)
  - `#12675` (authors downloading media)
- Not driven: the Guest Editor, Designer, Indexer and Proofreader roles
  (the same role check and the same default, code), and "Manually Link
  Media" (its own `link` route, behind the same write check, code).
- "Save" greyed out on "Title & Abstract" (Expected) is from the code:
  `WorkflowPublicationForm` sets `canSubmit` from `canEdit`, and
  `FormPage.vue` disables "Save" when `canSubmit` is false. The walk with
  the fix in (which does not touch that page) found the button there for
  the participant, and did not read its state.
