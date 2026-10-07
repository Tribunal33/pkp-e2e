# Outside Production, a copyeditor allowed to edit a version can change its media files, which no screen offers them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP (OPS has no stage before Production)
  - 3.5: none (code; no "Media" page or media files API)
  - 3.4: none (code; no "Media" page or media files API)
  - 3.3: none (code; no "Media" page or media files API)
- **Introduced** `pkp/pkp-lib#12306` for `pkp/pkp-lib#12251` (`add`, from the start) · [f4eccf8b9f](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001) · 2026-02-13 · Erik Hanson (ewhanson); widened to edit, delete and link by `pkp/pkp-lib#13054` for `pkp/pkp-lib#12702` · [2b13599365](https://github.com/pkp/pkp-lib/commit/2b135993650663320cc924dd426660a4ab16d6b2) · 2026-07-29 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U47 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a8)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-07: re-verified end to end. The fault and its severity
stand; the Proposed fix no longer refuses "recommend only" assignments,
which would have refused managers and admins assigned on the
submission in another role.

## Summary

A version's media files (the images and style sheets its HTML galley
shows) are production material. The "Media" page offers to add, rename,
relink and delete them only to a role assigned on the submission's
Production stage: a journal does not list "Media" in a copyeditor's
side menu, and a press shows them the files with no buttons.

The server checks something else: a section editor or assistant role on
the stage the submission is in now, and an assignment whose box "Allow
this person to make changes to the publication, …" is ticked. So a
copyeditor with that box, while the submission is in Copyediting, can
add, rename, relink and delete the version's media files, the
production team's included, by sending the page's requests. Once the
submission is in Production the same requests are refused.

The copyeditor may already change the version's metadata at that
stage; what they gain is write access to another stage's files, which
the file rules otherwise keep from them, and nobody is told of a change
beyond the activity log. The proposed fix adds the Production check to
the server and leaves the page as it is.

## Impact

- **Lost**: nothing in the ordinary case. A copyeditor could rename,
  relink or delete files the production team uploaded; each change is
  in the submission's activity log under their name, and the files are
  on the "Media" page the production team works on before publishing.
- **Who**: a participant whose role reaches only stages before
  Production, assigned with the box ticked, while the submission is in
  one of those stages: the Copyeditor (walked) and the Marketing and
  Sales Coordinator in Copyediting, the Funding Coordinator in
  Submission or Review. An author reaches it only if they also hold a
  section editor or assistant role in the journal or press and their
  author assignment has the box ticked. The box is off by default for
  these roles; turning on a role's "Permit submission metadata edit."
  setting (Settings › Users & Roles › Roles) ticks it on every
  assignment of that role, existing ones included.
- **Way round**: leave the box unticked on such assignments (and the
  role setting off); the writes are then refused.

Low: it takes a trusted, assigned participant sending requests no
screen offers, and the change is attributable and reviewable before
publication. It would be medium if a change could reach a published
galley unseen.

## Steps to reproduce

Preconditions: the default dataset, OJS `main` and OMP `main`, and two
PNG images (the dataset ships none). The Copyediting submission and its
copyeditor: OJS submission 3, "The Facets Of Job Satisfaction …",
Maria Fritz `mfritz`; OMP submission 1, "The ABCs of Human Survival …",
Sarah Vogt `svogt`. The Production control: OJS submission 5, "Genetic
transformation of forest trees", and OMP submission 4, "How Canadians
Communicate …", both with copyeditor `mfritz`.

As the editor:

1. Sign in as `dbarnes`.
2. Open the Copyediting submission. In "Participants", open the
   copyeditor's menu › "Edit"; in the "Edit Assignment" window, under
   "Permissions", tick "Allow this person to make changes to the
   publication, …" and press "OK".
3. Open "Publication" › the version › "Media", press "Add Media File",
   choose both images, set the first to "Image" and "Web resolution" and
   the second to "Image" and "High resolution", press "Upload Files".
   Both are listed. Note from this step's requests the "Image"
   component's `genreId` (in the add request) and the publication and
   two file ids (in the list request, `GET .../mediaFiles`).
4. Sign out.

As the copyeditor:

5. Sign in as the copyeditor (`mfritz` on OJS, `svogt` on OMP) and open
   the same submission.
6. No action is offered: on OJS the side menu has no "Media"; on OMP
   "Media" lists the files with no "Add Media File", no "Batch Link
   Media" and no row menu.
7. In this session, send the requests the "Media" page sends, under
   `.../api/v1/submissions/{submissionId}/publications/{publicationId}/mediaFiles`
   (the ids below are OJS's from the walk; on OMP they were 145, 146
   and 147):
   - add: upload an image to `.../api/v1/temporaryFiles`, then `POST
     .../mediaFiles` with
     `{"files": [{"temporaryFileId": 1, "genreId": 10, "variantType": "web", "name": {"en": "added.png"}}]}`
     (the upload's id, and step 3's `genreId`: 10 on OJS, 14 on OMP);
     the answer holds the new file's id.
   - rename the editor's web file: `PUT .../mediaFiles/46` with
     `{"name": {"en": "renamed.png"}}` (46: the web file's id).
   - relink: `PUT .../mediaFiles/46/link` with
     `{"targetSubmissionFileId": 47}` (47: the high-resolution file's
     id).
   - delete: `DELETE .../mediaFiles/48` (48: the file added above).

Control:

8. Sign in as `mfritz`, open the Production submission and send the
   same add against its publication. Her box is unticked there and
   need not be: the stage check that refuses runs before the box is
   read, as the error names.

**Expected.** Since the "Media" page offers the copyeditor nothing at
Copyediting, the server refuses the same changes, as it does in
Production (step 8).

**Observed.** Each write at step 7 is accepted and takes effect:

```
add    POST   .../mediaFiles             200   (a new media file is created)
edit   PUT    .../mediaFiles/{id}        200   (the editor's file is renamed)
link   PUT    .../mediaFiles/{id}/link   200   (the editor's two files are paired)
delete DELETE .../mediaFiles/{id}        200   (the added file is removed)
```

In Production (step 8) the same add is refused:

```
POST .../mediaFiles  401  {"error":"user.authorization.accessibleWorkflowStage"}
```

## Cause

`lib/pkp/api/v1/submissions/MediaFilesController.php::authorize()`
(lines 133–138) guards the five media writes (`add`, `edit`, `delete`,
`link`, `linkMany`) with `PublicationWritePolicy` alone; edit, delete
and link also get `SubmissionFileMatchesSubmissionPolicy`, which checks
that the file belongs to the submission, not who may change it. The
routes' `roleAuthorizer` asks only for a site admin, manager,
sub-editor or assistant role in the context.

`PublicationWritePolicy` (`classes/security/authorization/PublicationWritePolicy.php:42`)
adds `new StageRolePolicy([ROLE_ID_SUB_EDITOR, ROLE_ID_ASSISTANT, ROLE_ID_AUTHOR])`
with no stage, and `StageRolePolicy::effect()` (lines 63–66) then uses
the submission's current stage. Its last check,
`PublicationCanBeEditedPolicy`, passes when any of the user's
assignments on the submission has `canChangeMetadata` (the box,
`Repo::submission()->canEditPublication()`). A copyeditor, whose user
group reaches only Copyediting, therefore passes while the submission
is in Copyediting and is refused in Production, by `StageRolePolicy`
before the box is read.

The rule this breaks: media is production material. The "Media" page
offers its actions only to a role on the Production stage
(`lib/ui-library/src/managers/MediaFileManager/useMediaFileManagerConfig.js`,
`getManagerConfig()`); OJS shows "Media" in the side menu only with
Production access (`useWorkflowNavigationConfigOJS.js`,
`canAccessProduction`); the Galleys grid, which media is meant to match,
requires Production-stage access (`ArticleGalleyGridHandler::authorize()`).

How it came about:

- `add` never had a Production-stage check: the controller was created
  with only `PublicationWritePolicy` on it (`pkp/pkp-lib#12306`).
- Edit, delete, link and linkMany carried
  `SubmissionFileStageAccessPolicy` for the media file stage. That
  policy allows writing media files only to a non-author assignment on
  Production (`Repo::submissionFile()->getAssignedFileStages()`).
  `pkp/pkp-lib#13054` removed it, because it refused admins and Section
  Editors uploading JATS (`pkp/pkp-lib#12702`). In that pull request's
  review the author held that media changes need not be tied to a stage
  for editorial users, and the product reply was that media should
  follow the Galleys' policy; nothing replaced the stage check.

Reach of the same cause:

- The other roles and the author named under Impact's **Who** (code;
  the copyeditor is the case walked). `linkMany` goes through the same
  `authorize()` (code).
- The body text write routes
  (`lib/pkp/api/v1/bodyText/PKPBodyTextController.php::authorize()`)
  use the same stageless `PublicationWritePolicy`, and OJS shows "Body
  Text" only with Production access, so the same gap applies there
  (code). `PKPJatsController` shares the policy, but "JATS XML" is
  offered outside Production, so page and server agree there.

## Proposed fix

Require a role on the Production stage for the media writes, in
`MediaFilesController::authorize()`, after `PublicationWritePolicy`:

```php
if (in_array($actionName, $writeActions)) {
    $this->addPolicy(new PublicationWritePolicy($request, $args, $roleAssignments));
    $this->addPolicy(new StageRolePolicy(
        [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT],
        WORKFLOW_STAGE_ID_PRODUCTION
    ));
}
```

This follows `PKPSubmissionController`, which pairs
`PublicationWritePolicy` with a `StageRolePolicy` on
`WORKFLOW_STAGE_ID_PRODUCTION` for its `requiresProductionStageAccess`
actions, with the same roles (`$productionStageAccessRoles`). Unlike
that sibling it keeps the default `allowRecommendOnly = true`:

- With `true`, a manager or site admin passes `StageRolePolicy`'s
  manager clause whatever their assignments, so an admin assigned on
  the submission as its author can still upload, which is what
  `pkp/pkp-lib#12702` fixed. With `false` that clause looks for a
  manager-role assignment on Production and refuses them.
- The "Media" page offers its actions to a "recommend only" Section
  Editor, and the media policy before `pkp/pkp-lib#13054` did not
  refuse one either.

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyeditor-changes-media-outside-production/fix.diff).

**Tried.** On OJS and OMP `main`, with the fix in, the copyeditor's
add, rename and relink at step 7 are refused (401
`user.authorization.accessibleWorkflowStage`) and the list is
unchanged, the Expected; the delete was not sent, as the refused add
left nothing to delete, and goes through the same check. With the fix
in and out alike, on the Production submission the manager adds media
through the "Media" page, the Layout Editor `gcox` (box ticked) and, on
OJS, the Section Editor `dbuskins` made "recommend only" add media with
the page's request, and the copyeditor saves the version's title at
Copyediting, all 200.

The opposite mismatch stays: a Layout Editor assigned on Production
without the box is offered the actions and refused
([U47 A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a1)).

**Alternatives.**

- Widen the "Media" page to whoever the server accepts (a role on the
  current stage): a product decision against the page's and the
  Galleys' rule, and copyeditors keep write access to production files.
- Restore `SubmissionFileStageAccessPolicy` on the four routes: brings
  back the `pkp/pkp-lib#12702` refusal for admins assigned in another
  role, uses an internal policy that `pkp/pkp-lib#13060` wants out of
  controllers, and still misses `add`.

**What goes with it.**

- The same guard on the body text write routes, which share the cause;
  this diff does not touch them.
- A unit test on `MediaFilesController`: a participant assigned only
  before Production is refused a media write, and a manager assigned as
  the author is not; and an e2e test of the copyeditor's refusal.

Small: one policy and an import in one controller, following an
existing pattern, with no data repair.

## Evidence

- Kept script: `shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js`
  (helpers in `lib.js`). Reset, then run per app:
  `npm run fleet-prep -- --feature issues-rc --dataset 3 --reset --apps ojs,omp`;
  `ONLY=ojs PROBE_FEATURE=issues-rc PROBE_AGENT=rc node bin/probe.js ojs shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js`
  (`omp` the same). It takes the Steps through the screens up to step
  6 and sends step 7's requests in the copyeditor's session (the
  API-not-on-any-screen exception, REPORT.md "Steps"). `WALK=neighbour`
  runs the neighbour checks alone.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/copyeditor-changes-media-outside-production/fix.diff ojs`
  (then `omp`), a reset, the walk, a reset, `WALK=neighbour`, then
  `revert`, a reset and `WALK=neighbour` again without the fix.
- Walked 2026-10-07 on `main`, PostgreSQL: OJS `92bc2bb467` (lib/pkp
  `e60013c77f`), OMP `a0e6d0a8b` (lib/pkp `5a5ab2d6c7`). Both showed
  the Observed; the activity log held upload, edit and delete entries
  under the copyeditor. OPS (`7e34fdd57e`) not walked:
  `Application::getApplicationStages()` is Production alone.
- Step 8's box: `PublicationWritePolicy` adds `StageRolePolicy` before
  `PublicationCanBeEditedPolicy`, and `AuthorizationDecisionManager`
  stops at the first deny, so the box on the Production assignment is
  never read (code).
- The role setting: `UserGroupForm::execute()` copies a changed
  "Permit submission metadata edit." onto every stage assignment of the
  group in the context, and `StageAssignment\Repository::build()` takes
  it as a new assignment's default (code).
- 3.5 (OJS `b8f5e9a951`, OMP `7d6b00060`, lib/pkp `6d7f1540b6`): the
  Steps cannot be taken, so 3.5 rests on the code: no
  `MediaFilesController`, no `SUBMISSION_FILE_MEDIA` and no "Media"
  page in ui-library; an HTML galley's dependent files are uploaded
  through `FileUploadWizardHandler`, which requires modify access to the
  galley's own file (`SubmissionFileAccessPolicy`).
- 3.4 (OJS `d68934d0d1`, OMP `0aec65441`, lib/pkp `767353f4fe`) and
  3.3 (OJS `ac77c9fb35`, OMP `8e72fc883`, lib/pkp `ac3fa73402`): code
  only, the same: no media files API, dependent files guarded as on
  3.5.
- Introduced: `git blame` on `authorize()` in lib/pkp gives
  `f4eccf8b9f` for every line of the write branch; `git log` on the file
  shows `2b13599365` removing both `SubmissionFileStageAccessPolicy`
  blocks. `commits/<sha>/pulls` names `#12306` (merged 2026-04-30) and
  `#13054` (merged 2026-09-17). The review discussion is
  `pkp/pkp-lib#13054`'s `MediaFilesController` thread (2026-08-13 to
  2026-08-21); `#13060` as the issue on internal policies in
  controllers is named in comments on `#12702` (2026-07-30) and
  `#13054` (2026-09-17).
- Upstream search 2026-10-07 of pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, open and closed (media files with
  copyeditor, production stage, authorization; `MediaFilesController`;
  `PublicationWritePolicy` stage; `StageRolePolicy` current stage;
  `SubmissionFileStageAccessPolicy` media): only `#12251`, `#12702` and
  `#13054`, none about this fault.
- The body text routes are the JATS XML & body text spec's (U48)
  surface.
- Unverified: the body text parallel, the other assistant roles, the
  author holding an editorial role and the role setting are read in the
  code only; MySQL not checked (the fault is in the authorization).
