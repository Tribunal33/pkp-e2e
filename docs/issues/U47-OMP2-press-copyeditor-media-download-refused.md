# On a press, the Copyeditor is offered the "Media" page, and pressing a file name shows a raw refusal

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none (code; no "Media" page)
  - 3.4: none (code; no "Media" page)
  - 3.3: none (code; no "Media" page)
- **Introduced** `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137ce](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U47 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#omp2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a press, the side menu offers the "Media" page to roles whose work
stops before Production: the Copyeditor and the Marketing and Sales
Coordinator on a monograph in Copyediting, and the Funding Coordinator
on a monograph in Submission or review. They see the list of media
files with each name as a link. Pressing a name opens a new tab showing
one line of raw text, "The current role does not have access to this
operation.", and no file arrives.

The offer is what is wrong: a journal and a preprint server do not
offer "Media" to these roles, and the refusal itself is intended, since
media files are production material. These roles need nothing from the
page; what they meet is a link that promises a file and a technical
message in its place.

## Impact

- **Lost.** No task: the roles refused have no work on media files in
  their stages. They get a link that does not do what it shows, and a
  raw message instead of a page.
- **Who.** A press's Copyeditor and Marketing and Sales Coordinator on a
  monograph in Copyediting, and its Funding Coordinator on a monograph in
  Submission, Internal Review or External Review, on every monograph that
  has media files.
- **Way round.** Not needed for their work; an editor can download a file
  and send it if one is wanted.

Low: nothing is lost and the roles' own tasks get done; the fault is a
page offered to people it then refuses. A task of theirs that needs
media files would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 1, "The ABCs of Human Survival: A Paradigm for Global
  Citizenship", is in Copyediting; `svogt` (Sarah Vogt) is assigned to it
  as Copyeditor and `aclark` is its author. It has no media file, so one
  is added first (steps 1 to 6) by `dbarnes`, the Press editor: he is not
  assigned to book 1, but a Press editor reaches every stage of every
  monograph. Any PNG image does; here `figure.png`.

Adding a media file:

1. Sign in as `dbarnes`.
2. Open book 1: "Active submissions", its "View".
3. In the side menu, "Publication" › "Unassigned version (…)" › "Media".
4. "Add Media File", then "Click to upload files", and choose
   `figure.png`.
5. On the file's card, "What kind of media is this? (Required)":
   "Image"; then "Upload Files". The list shows "figure.png".
6. Sign out.

As the Copyeditor:

7. Sign in as `svogt`.
8. Open book 1: "Assigned to me", its "View".
9. In the side menu, "Publication" › "Unassigned version (…)" ›
   "Media". The list shows "figure.png" as a link, with no "Add Media
   File", no "Batch Link Media" and no "…" button.
10. Press "figure.png".

**Expected:** at step 9 the version lists no "Media" page, since the
Copyeditor's role does not reach Production.

**Observed:** the page is offered, and at step 10 a new tab opens and
shows this line; no file arrives:

```
{"status":false,"content":"The current role does not have access to this operation.","elementId":"0","events":[]}
```

The request behind it is
`GET /index.php/publicknowledge/$$$call$$$/api/file/file-api/download-file?submissionFileId=145&submissionId=1&stageId=5`,
answered 200 `application/json`, without `Content-Disposition:
attachment`.

Control: the editor after step 5, and `aclark` opening book 1 from "My
Submissions" › "Publication" › "Unassigned version (…)" › "Media",
press the same name and the file arrives (`Content-Disposition:
attachment;filename=figure.png`).

## Cause

In ui-library
`src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`,
`getPublicationItemsEditorial()` pushes the `media` item with no gate.
The version's pages are built whenever `permissions.canAccessPublication`
is true, which `useWorkflowPermissions.js` sets for any editorial role
(assistants included) assigned in the monograph's current stage. The OJS
and OPS twins push `media`, with the galleys, only inside
`if (permissions.canAccessProduction)`; the same change put them there.
The OMP push came in with the "Media" page itself (`pkp/ui-library#794`,
sub-commit "Add Media link to OMP config"), placed next to the
"Publication Formats" push, which has no gate either.

The list still shows for these roles. `MediaFilesController::getMany()`
authorizes it through `PublicationAccessPolicy`, which they pass.
`useMediaFileManagerConfig.js` grants a role with no Production
assignment no action at all, `MEDIA_FILE_LIST` included, but no
component checks `MEDIA_FILE_LIST`, and `MediaFileManagerCellName.vue`
links any file that has a `url`. That `url` is built by
`submissionFile/maps/Schema::mapByProperties()` as
`FileApiHandler::downloadFile` with `stageId` from
`submissionFile/Repository::getWorkflowStageId()`: Production for every
`SUBMISSION_FILE_MEDIA` file.

`FileApiHandler::authorize()` checks the download with
`SubmissionFileAccessPolicy`. Its assistant branch requires, on that
stage, `WorkflowStageAccessPolicy`, `SubmissionFileMatchesWorkflowStageIdPolicy`
and `AssignedStageRoleHandlerOperationPolicy`. The Copyeditor and the
Marketing and Sales Coordinator have stage 4 only, and the Funding
Coordinator stages 1 to 3 (`registry/userGroups.xml`), so the policy
denies and the handler answers its JSON refusal, which the new tab shows
as text.

Reach:

- the Copyeditor in Copyediting (walked); the Marketing and Sales
  Coordinator in Copyediting and the Funding Coordinator in Submission,
  Internal Review and External Review (code: same menu, same branch, no
  Production in their stages);
- the same roles on a monograph in Done, where every stage's roles are
  copied into the Done stage, so `canAccessPublication` is true there and
  `canAccessProduction` stays false (code);
- any custom group whose stages leave out Production, sub-editor groups
  included: the sub-editor branch also needs a Production assignment
  (code). The fix covers them, since `canAccessProduction` keys on an
  editorial role in the Production stage;
- the Author is not affected: every OMP author group has Production in
  its stages and the author branch admits media files
  (`pkp/pkp-lib#12675`) (walked);
- OJS and OPS: no role sees "Media" outside Production (OJS walked with
  the Copyeditor `mfritz` on submission 3; OPS by code, every OPS
  workflow role has Production).

## Proposed fix

Gate the `media` item of OMP's editorial menu on
`permissions.canAccessProduction`, as OJS and OPS do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-media-download-refused-outside-production/fix.diff)):

```diff
-		items.push(
-			getPublicationItem({
-				publicationId,
-				name: 'media',
-				label: t('publication.media'),
-			}),
-		);
+		// Media files are production material: their downloads are authorized
+		// on the Production stage, as on OJS and OPS.
+		if (permissions.canAccessProduction) {
+			items.push(
+				getPublicationItem({
+					publicationId,
+					name: 'media',
+					label: t('publication.media'),
+				}),
+			);
+		}
```

The rule that media files belong to Production lives in the server
(`getWorkflowStageId()`, the file policies, `MediaFilesController`'s
write group, commented "media is a production artifact"), and the three
apps agree on it; the press's menu is the one caller that offers the
page beyond it. The item keeps its place in the menu, so the editorial
roles see no change, and the author's menu
(`getPublicationItemsAuthor()`) stays as it is.

Tried on OMP `main`: with the fix, step 9 lists "Title & Abstract",
"Contributors", "Chapters", "Metadata", "Publication Formats",
"References" and "Funding" and no "Media", and the page's typed address
opens the Copyediting stage instead. The editor and the author still
download the file. A Layout Editor assigned in Production (`gcox`, book
4) is still offered "Media" with its actions and downloads the file,
with the fix in and out.

**Alternatives:**

- Let these roles download media files in `SubmissionFileAccessPolicy`,
  as `pkp/pkp-lib#12675` did for authors: it hands production material
  to roles whose stages exclude Production, a second exception to the
  stage model that nothing asks for.
- Put a stage the role can reach in the link: rejected, because
  `SubmissionFileMatchesWorkflowStageIdPolicy` still refuses a media file
  outside Production.
- As a defensive addition rather than a replacement: render the name as
  plain text when the config does not grant `MEDIA_FILE_LIST`.

**What goes with it:**

- "Publication Formats", pushed beside "Media", has had no gate since
  2024 (80daa02d); for the same Copyeditor it shows only "You don't
  currently have access to that stage of the workflow."
  ([U73 A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U73-publication-formats-proof-terms.md#a13)).
  The team may want to decide both together; it is left out of this fix.
- The guard: an e2e check that a press Copyeditor on a monograph in
  Copyediting gets no "Media" page, while a Layout Editor in Production
  does.

Small: a condition the OJS and OPS menus already carry, with no server
change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js),
  on an install loaded from PKP's default test dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL), reset before each walk:
  `node bin/probe.js all shared/playwright/checks/issues/press-media-download-refused-outside-production/walk.js`
  (`WALK=neighbour` runs the Layout Editor check alone). It opens each
  book by its editorial address where steps 2 and 8 use the list's
  "View".
- Fix trial: `node bin/try-fix.js apply …/fix.diff omp`, the walk and
  the neighbour check, then `revert` and the neighbour check again.
- Tips walked and read: OMP `3b0ecf794c`, its lib/pkp `3dc90c81a6`,
  ui-library `280f98c570`; OJS `b84f8e2e44` (lib/pkp `ddd8ab243a`,
  ui-library `64d6736318`); OPS `c8af945bb7` (code only).
- 3.5 (code): OMP `stable-3_5_0` `9c5e24246`, lib/pkp `cf3f984335`,
  ui-library `d4e01883`: no `MediaFileManager`, no `MediaFilesController`,
  no `SUBMISSION_FILE_MEDIA`, no `media` item in the OMP menu.
- 3.4 and 3.3 (code): app `stable-3_4_0` `0aec65441` / `stable-3_3_0`
  `8e72fc883`, lib/pkp `32b0f4b4af` / `f6ab331645`, ui-library
  `ee684b34` / `96959f9e`: no media file stage in `SubmissionFile` and
  no media manager in the ui-library.
- Introduced: `git blame` of the `media` push in
  `useWorkflowNavigationConfigOMP.js` gives 3f97137ce, the squash of
  `pkp/ui-library#794`; the GitHub API names the PR and its author.
- Unverified: the Marketing and Sales Coordinator and the Funding
  Coordinator were not walked (the dataset has no user in those roles).
  MySQL not checked; nothing here depends on the database.
