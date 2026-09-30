# On a press, roles without Production access see "Media" file names that open a raw refusal, not the file

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U47 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#omp2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a press, three roles are offered the version's "Media" page, with
each file name as a link: the Copyeditor and the Marketing and Sales
Coordinator while a monograph is in Copyediting, and the Funding
Coordinator while it is in Submission or review. Pressing a name opens a
new tab that shows one line of raw text holding "The current role does
not have access to this operation.", and no file arrives.

These roles are not meant to download media files, which belong to the
Production stage, so withholding the file is right. The fault is that
the menu lists the page for them. The proposed fix stops listing "Media"
for roles without Production access, as a journal and a preprint server
already do.

## Impact

- **Lost:** nothing is lost or changed. Instead of a message on the page
  they came from, the person gets a separate tab of raw JSON.
- **Who:** those three roles, on any monograph that has media files. In
  any other stage these roles are not shown the version's pages at all.
- **Way round:** ask an editor with Production access to send the file.

Low: the outcome is right and nothing is lost; the page offers a link it
then refuses, and the refusal is raw text. It would be medium if these
roles were meant to download media files, which is a product decision
(Proposed fix, Alternatives).

## Steps to reproduce

The Steps use the Copyeditor, whom the dataset has. It holds no user
with the Marketing and Sales Coordinator or Funding Coordinator role;
those two were read in the code only (Cause).

Preconditions:

- PKP's default test dataset for `main`, OMP press `publicknowledge`.
  Submission 1, "The ABCs of Human Survival: A Paradigm for Global
  Citizenship", is in Copyediting, and `svogt` (Sarah Vogt) is its
  Copyeditor.
- A media file on submission 1, since the dataset has none. Sign in as
  `dbarnes`, open submission 1 and its "Publication" › the version ›
  "Media". Press "Add Media File", then "Click to upload files", and
  choose a small image (here `figure.png`). Set "What kind of media is
  this?" to "Image" and "File resolution type" to "Web resolution", and
  press "Upload Files". Sign out.

Steps:

1. Sign in as `svogt`.
2. Open submission 1 from the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`).
3. In the side menu open "Publication" › the version › "Media".
4. Press the file name "figure.png".

**Expected:** the side menu does not list "Media" for the Copyeditor,
as on a journal, where the Copyeditor is never offered it.

**Observed:** at step 3 the side menu lists "Media" under the version,
between "Publication Formats" and "References". The page shows the list
with "figure.png" as a link, and no "Add Media File", "Batch Link Media"
or "More Actions". At step 4 a new tab opens on

```
GET …/index.php/publicknowledge/$$$call$$$/api/file/file-api/download-file?submissionFileId=145&submissionId=1&stageId=5
200 application/json (no Content-Disposition)
```

and shows

```
{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

No file is downloaded.

Control: the same link downloads `figure.png` for `dbarnes` and for the
author, `aclark` (`Content-Disposition: attachment;filename=figure.png`).

## Cause

The press's workflow menu lists "Media" for every editorial role that
may see the version's pages, while the file links on that page only
work for roles on the Production stage.

`getPublicationItemsEditorial()` in
`lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`
(lines 244–250) pushes the `media` item unconditionally. The version's
pages are shown when `permissions.canAccessPublication` is true
(`useWorkflowPermissions.js`: the user holds an editorial role,
assistants included, on the submission's active stage). The OJS and OPS
configs push `media` inside `if (permissions.canAccessProduction)`,
which needs that same role on the active stage and, in addition, an
editorial role on the Production stage. The stage sets in OMP's
`registry/userGroups.xml` leave Production out for the Copyeditor and
the Marketing and Sales Coordinator (`stages="4"`) and the Funding
Coordinator (`stages="1,2,3"`), all three `ROLE_ID_ASSISTANT` groups. So
on a press they get the page in their own stages, and on a journal or a
preprint server they do not.

The page itself was written for Production roles.
`getManagerConfig()` in
`lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js`
keeps an action only when
`hasCurrentUserAtLeastOneAssignedRoleInStage(submission,
WORKFLOW_STAGE_ID_PRODUCTION, …)` holds. That is why the Copyeditor sees
no "Add Media File", "Batch Link Media" or "More Actions". It covers the
list too (`MEDIA_FILE_LIST`), but nothing reads that action, so the list
is drawn for everyone who reaches the page.

Each file name (`MediaFileManagerCellName.vue`) links the file's `url`.
The submission file map (`lib/pkp/classes/submissionFile/maps/Schema.php`,
the `url` property) builds it for `FileApiHandler::downloadFile` with
`stageId => Repo::submissionFile()->getWorkflowStageId()`, which is
`WORKFLOW_STAGE_ID_PRODUCTION` for `SUBMISSION_FILE_MEDIA`.
`FileApiHandler::authorize()` checks the file through
`SubmissionFileAccessPolicy`, whose assistant rules require access to
that stage (`WorkflowStageAccessPolicy`, line 222). The legacy handler
answers the refusal as a JSON message with status 200, which the new tab
shows as text. The list is fetched through `GET …/mediaFiles`
(`MediaFilesController::getMany()`, behind `PublicationAccessPolicy`),
which admits these roles, so the page fills before the download is
refused.

The item came with the "Media" page
([3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4)),
which placed it inside the Production check for OJS and OPS and, for
OMP, next to "Publication Formats", outside it. `pkp/pkp-lib#12262`
gives the page's access as "Similar with Galleys, admin, journal
managers, sub editors and authors can access this feature". The same
placement is asked about in
[U24 OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#omp2).

Reach:

- The Copyeditor in Copyediting (walked). The Marketing and Sales
  Coordinator in Copyediting and the Funding Coordinator in Submission or
  review get the page by the same menu rule and are refused by the same
  assistant rules (code).
- Roles with Production access keep "Media": the Press editor and the
  Layout Editor on a monograph in Production (walked). The author's view
  lists `media` on every app and stays as it is; the author's download
  is admitted by a rule of its own for media files
  (`SubmissionFileAccessPolicy` line 167, `pkp/pkp-lib#12675`).
- The OJS "JATS XML" page's "Download" on an uploaded file links the
  same `url` (`Repo::jats()->summarize()` maps the file through the
  same schema map), pinned to Production, and is refused the same way
  for a role without Production
  ([U48 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a11)).
  That page is meant for those roles (it also serves the generated
  XML), so the menu change proposed here does not reach it; it needs a
  change of its own.
- OMP's "Publication Formats" page is listed on the same terms, and its
  file names link with `WORKFLOW_STAGE_ID_PRODUCTION`
  (`PublicationFormatGridCellProvider`, `FileNameGridColumn`), so by the
  code these roles would be refused there too. Not driven: no monograph
  of the dataset in Copyediting has a format. Left out of this fix:
  whether these roles should see a press's publication formats is a
  separate product decision.

## Proposed fix

List "Media" on a press only for roles with Production access, as OJS
and OPS do: wrap the editorial `media` item in
`useWorkflowNavigationConfigOMP.js` in the same `canAccessProduction`
check, keeping its place in the menu
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-media-download-refused-outside-production/fix.diff)):

```diff
--- a/lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js
+++ b/lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js
@@ -241,13 +241,17 @@
 			}),
 		);
 
-		items.push(
-			getPublicationItem({
-				publicationId,
-				name: 'media',
-				label: t('publication.media'),
-			}),
-		);
+		// Media files are production files: their download links are checked
+		// against the Production stage, as on a journal and a preprint server.
+		if (permissions.canAccessProduction) {
+			items.push(
+				getPublicationItem({
+					publicationId,
+					name: 'media',
+					label: t('publication.media'),
+				}),
+			);
+		}
 
 		if (publicationSettings.supportsCitations) {
 			items.push(
```

The menu then agrees with the page's own action rule and with the file
access rule. `canAccessProduction` is the flag the OJS and OPS configs,
and OMP's own "Catalog Entry" and "Permissions & Disclosure", already
use. Everyone who manages or prepares the media, and the author, keeps
the page.

Tried on `main`. The Copyeditor's menu listed the version's other pages
without "Media". Opening the page's address by hand
(`…&workflowMenuKey=publication_1_media`) showed "Workflow: Copyediting"
and no media list. `dbarnes`, `aclark` and the Layout Editor `gcox`
(submission 4) still had "Media".

**Alternatives:**

- Let every role that sees the version's pages download media files: a
  media rule for assistants in `SubmissionFileAccessPolicy` like the
  author's. That opens Production files to roles outside Production, a
  product decision and a change to file access on every app.
- Build the link with the user's own stage instead of Production. It
  would still be refused: `SubmissionFileMatchesWorkflowStageIdPolicy`
  (`SubmissionFileAccessPolicy` line 223) requires the requested stage
  to be the file's own, Production.
- Keep the page and show the names as plain text for these roles. The
  list would still show files the person cannot open.

**What goes with it:**

- No stored data to repair, and no change to the API or a plugin hook.
  `MediaFilesController::getMany()` keeps admitting these roles. The
  page's address opened by hand shows no list after the fix, because
  `useWorkflowMenu.js` falls back to the stage page for an item the menu
  does not list.
- Guard: an end-to-end check that signs in as an assigned Copyeditor on
  a press monograph in Copyediting and finds no "Media" under the
  version, while an editor on the same monograph still finds it.

Small: one condition in one ui-library file, and one end-to-end check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js).
  On an install freshly loaded from the default dataset, it takes the
  Steps above on OMP, then the control and the neighbour checks:
  `aclark` in the author's view, `dbarnes`'s menu and download, and
  `gcox`'s menu on submission 4. With the fix in, it also records the
  page's address opened by `svogt`.
  - Run: `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js`.
  - The fix check: `node bin/try-fix.js apply <folder>/fix.diff omp`
    (rebuilds the JavaScript), the same walk on a freshly loaded
    install, then `node bin/try-fix.js revert omp`. With and without
    the fix, no request answered 400 or more and nothing failed in the
    browser.
- Walked on `main`, PostgreSQL, the pkp/datasets `main` dumps of
  2026-09-30 (38ab955). The fault does not depend on the database.
- Tips:
  - `main`: OMP 3b0ecf794, lib/pkp 3dc90c81a6, ui-library 280f98c5
  - `stable-3_5_0`: OMP 3081c9b00, lib/pkp a9c76aed62, ui-library 1a7a4750
  - `stable-3_4_0`: OMP 0aec65441, lib/pkp df13621c2d, ui-library ee684b34
  - `stable-3_3_0`: OMP 8e72fc883, lib/pkp d446601ebe, ui-library 96959f9e
- Code read on `main`:
  - ui-library: `useWorkflowNavigationConfigOMP.js`,
    `useWorkflowNavigationConfigOJS.js`, `useWorkflowNavigationConfigOPS.js`,
    `useWorkflowPermissions.js`, `useWorkflowMenu.js`,
    `composables/useCurrentUser.js` (`EditorialRoles`),
    `useMediaFileManagerConfig.js`, `useMediaFileManagerActions.js`,
    `MediaFileManagerCellName.vue`, `WorkflowPublicationJats.vue`
    (`downloadJatsXML()`), `workflowConfigEditorialOMP.js`
    (`publicationFormats`); blame of the `media` items to 3f97137c.
  - lib/pkp: `classes/submissionFile/maps/Schema.php` (`url`),
    `classes/submissionFile/Repository.php` (`getWorkflowStageId()`),
    `controllers/api/file/FileApiHandler.php`,
    `classes/security/authorization/SubmissionFileAccessPolicy.php`,
    `api/v1/submissions/MediaFilesController.php`,
    `classes/jats/Repository.php` (`summarize()`).
  - OMP: `registry/userGroups.xml`,
    `controllers/grid/catalogEntry/PublicationFormatGridHandler.php` and
    `PublicationFormatGridCellProvider.php`.
- Code read on the older lines (none has the page, so 3.5 was not
  walked):
  - 3.5: `checkouts/stable-3_5_0/omp`: ui-library has no
    `MediaFileManager` and `useWorkflowNavigationConfigOMP.js` no
    `media` item; lib/pkp has no `SUBMISSION_FILE_MEDIA` and no
    `MediaFilesController`.
  - 3.4 and 3.3: `origin/stable-3_4_0` and `origin/stable-3_3_0` of
    lib/pkp have no `SUBMISSION_FILE_MEDIA`, and of ui-library no media
    manager and (3.4) no Vue workflow page.
- Upstream search (2026-09-30), pkp/pkp-lib, pkp/omp and
  pkp/ui-library, issues and PRs: "media files download access",
  "media copyeditor", "media canAccessProduction",
  "useWorkflowNavigationConfigOMP", "current role does not have access"
  with "media". `pkp/pkp-lib#12675` (closed) fixed the author's
  download of media files; it does not cover roles outside Production.
- Unverified: the Marketing and Sales Coordinator and the Funding
  Coordinator were not walked (the dataset holds no user in either
  role); their menu and refusal are read in the code only.
