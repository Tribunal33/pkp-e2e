# Outside Production, a copyeditor allowed to edit a version can change its media files, which no screen offers them

- **Severity** low
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP (OPS has the API but a preprint is always in Production, so the mismatch cannot arise)
  - 3.5: none (code; no media files API or "Media" page)
  - 3.4: none (code; no media files API or "Media" page)
  - 3.3: none (code; no media files API or "Media" page)
- **Introduced** `pkp/pkp-lib#12251` (the media API, with no Production-stage check on `add`); the other four writes lost their file-stage guard in `pkp/pkp-lib#13054` for `pkp/pkp-lib#12702` · [2b13599365](https://github.com/pkp/pkp-lib/commit/2b135993650663320cc924dd426660a4ab16d6b2) · 2026-09-17 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-05)
- **Tracked in** spec U47 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a8)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)
- **Model** claude-opus-4-8, parts on claude-opus-5-5

## Summary

A version's media files (the images and style sheets its HTML galley
shows) are managed on the "Media" page, which is production material: the
page offers its changes only to a role assigned on the submission's
Production stage. A journal does not list "Media" in the side menu for a
copyeditor, and a press lists the files with no buttons.

The server, though, accepts those changes from anyone who holds a role on
the stage the submission is in now and whose assignment carries the
"Permit submission metadata edit" permission. So a copyeditor given that
permission, working while the submission is in Copyediting, can add,
rename, delete and relink the version's media files (relink pairs a
figure's web-resolution copy with its high-resolution original), other
people's included, even though no screen offers them the actions. Once the
submission reaches Production the same request is refused.

The copyeditor already may edit the version's metadata at that stage, so
this opens no new kind of right; it is the page and the server disagreeing
about who manages media, and one of the two should change. Each change is
written to the submission's activity log under the copyeditor's name.

## Impact

- **Lost**: nothing, in the ordinary case. A copyeditor could alter or
  delete a version's media files that the "Media" page offers them
  nothing to touch, but every add, rename and delete is recorded in the
  submission's activity log under their name, and the files are shown on
  the "Media" page the production team works in Production, so the team
  can see and undo a change before the version is published.
- **Who**: a copyeditor assigned to a submission in Copyediting, whose
  "Permit submission metadata edit" box an editor has ticked (off by
  default for the role); the same reaches any assistant-level participant
  assigned only to stages before Production who is given that permission.
  The changes are made by sending the "Media" page's own API requests by
  hand, not through any screen, so no one does it by accident.
- **Way round**: leave "Permit submission metadata edit" unticked on the
  assignment (its default for the role); the writes are then refused.

Low: a trusted participant who already edits the publication at that stage
can also change its media over the API, in the uncommon state of holding
that permission before Production, and the change is logged and reviewable
before anything is published. It would be medium if such a change reached
the published galley unseen, but the activity log and the Production
"Media" page record it.

## Steps to reproduce

Preconditions: the default dataset, OJS `main` and OMP `main`. A
submission in Copyediting with a copyeditor assigned (OJS submission 3,
"The Facets Of Job Satisfaction …", copyeditor Maria Fritz `mfritz`; OMP
submission 1, "The ABCs of Human Survival …", copyeditor Sarah Vogt
`svogt`). The "Media" page sends its changes over the REST API under
`.../api/v1/submissions/{id}/publications/{pubId}/mediaFiles`; no screen
offers them to the copyeditor, so they are sent directly, in the
copyeditor's signed-in session, the way the page sends them for a role it
does offer.

Setup, as the editor:

1. Sign in as `dbarnes`.
2. Open the Copyediting submission's "Participants", open the copyeditor's
   assignment ("Edit"), tick "Permit submission metadata edit", press
   "OK". (This is the normal way to let a copyeditor correct metadata
   during copyediting.)
3. Open the submission's "Publication" › the version › "Media", press
   "Add Media File", choose an image file as "Image", press "Upload
   Files"; then add a second image as a "High resolution" file. (Any PNG
   serves; the dataset ships none. The editor's own changes hold.)
4. Sign out.

As the copyeditor:

5. Sign in as the copyeditor (`mfritz` on OJS, `svogt` on OMP).
6. The actions are not offered: on OJS the side menu has no "Media"; on
   OMP the "Media" list shows the files with no "Add Media File", no
   "Batch Link Media" and no row menu.
7. In this signed-in session, send the requests the "Media" page sends,
   against the submission's own publication:
   - add: upload a file to `.../temporaryFiles`, then
     `POST .../mediaFiles` with `{files:[{temporaryFileId, genreId, variantType:"web", name:{en:"…"}}]}`
     (`genreId` is the "Image" component's; the walk read it from the
     editor's own upload).
   - rename the editor's file: `PUT .../mediaFiles/{id}` with
     `{name:{en:"…"}}`.
   - relink the editor's files: `PUT .../mediaFiles/{webId}/link` with
     `{targetSubmissionFileId: {highResId}}` (pairs the two).
   - delete a file: `DELETE .../mediaFiles/{id}`.

Control, as the same copyeditor on a submission that has reached
Production (OJS submission 5, `mfritz`; OMP submission 4, `mfritz`):

8. Send the add request against that publication. (The box need not be
   ticked here: the stage check refuses first, as the response shows.)

**Expected.** Because the "Media" page offers the copyeditor nothing at
Copyediting, the server should refuse the same changes, as it does in
Production (step 8).

**Observed.** Each write at step 7 is accepted and takes effect:

```
add    POST   .../mediaFiles             200   (a new media file is created)
edit   PUT    .../mediaFiles/{id}        200   (the editor's file is renamed)
link   PUT    .../mediaFiles/{id}/link   200   (the editor's two files are paired)
delete DELETE .../mediaFiles/{id}        200   (the copyeditor's added file is removed)
```

Afterwards the list shows the editor's file renamed and paired and the
copyeditor's added file gone. In Production (step 8) the same add request
is refused:

```
POST .../mediaFiles  401  {"error":"user.authorization.accessibleWorkflowStage"}
```

## Cause

Every media write (`add`, `edit`, `delete`, `link`, `linkMany`) in
`lib/pkp/api/v1/submissions/MediaFilesController.php::authorize()` is
guarded by `PublicationWritePolicy` (plus, for edit/delete/link, a
`SubmissionFileMatchesSubmissionPolicy` ownership check, not a role one).
`PublicationWritePolicy` builds
`StageRolePolicy([ROLE_ID_SUB_EDITOR, ROLE_ID_ASSISTANT, ROLE_ID_AUTHOR])`
with no stage id, and `StageRolePolicy::effect()` then falls back to the
submission's *current* stage
(`$this->getAuthorizedContextObject(ASSOC_TYPE_SUBMISSION)->getData('stageId')`).
So the check passes for any non-managerial participant who has one of
those roles on the stage the submission is in now and whose assignment
grants publication edit (`PublicationCanBeEditedPolicy`). The "Media"
page, by contrast, is offered only to roles that reach the Production
stage. In Production the copyeditor has no role on the current stage, so
the same policy denies.

For `add` there has never been a Production-stage check: the route carried
only `PublicationWritePolicy` from the media API's creation
(`pkp/pkp-lib#12251`, [f4eccf8b9f](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001), 2026-04-30, Erik Hanson). The edit,
delete, link and linkMany routes used to carry `SubmissionFileStageAccessPolicy`
on the media file stage (`SUBMISSION_FILE_MEDIA`), which only a
Production-stage assignment may modify, so it refused a copyeditor;
`pkp/pkp-lib#13054` (for issue `pkp/pkp-lib#12702`, a JATS-upload
authorization fix) removed it from these routes, leaving only the
current-stage `PublicationWritePolicy`.

Reach of the same cause:

- All five media write actions, on both OJS and OMP (add, edit, link and
  delete walked over the API from a copyeditor in Copyediting; linkMany
  shares the same `authorize()` path).
- Any assistant-level role assigned only to pre-Production stages with the
  permission, for example a Marketing and Sales Coordinator in copyediting
  or a Funding Coordinator in submission or review (both user groups exist
  on OJS and OMP; read in the code — the copyeditor is the case walked).
- The body-text write routes
  (`lib/pkp/api/v1/bodyText/PKPBodyTextController.php`) use the same
  stageless `PublicationWritePolicy` and OJS hides "Body Text" from a
  copyeditor the same way, so the same gap applies there; that surface is
  [JATS XML & body text](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md)'s
  (read in the code). The separate JATS controller
  (`api/v1/jats/PKPJatsController.php`) shares the policy but OJS does not
  hide "JATS" behind Production access, so the "no screen offers it" half
  does not hold there.

## Proposed fix

The rule that broke is "media is production material, editable only by a
role on the Production stage" — the rule the "Media" page's offer already
follows. Add a Production-stage requirement to the media controller's
write actions, after `PublicationWritePolicy`, in
`MediaFilesController::authorize()`:

```php
if (in_array($actionName, $writeActions)) {
    $this->addPolicy(new PublicationWritePolicy($request, $args, $roleAssignments));
    $this->addPolicy(new StageRolePolicy(
        [Role::ROLE_ID_MANAGER, Role::ROLE_ID_SUB_EDITOR, Role::ROLE_ID_ASSISTANT],
        WORKFLOW_STAGE_ID_PRODUCTION,
        false
    ));
}
```

This mirrors `PKPSubmissionController`, which already pairs
`PublicationWritePolicy` with
`new StageRolePolicy($this->productionStageAccessRoles, WORKFLOW_STAGE_ID_PRODUCTION, false)`
for its `requiresProductionStageAccess` actions
(`$productionStageAccessRoles` is `[MANAGER, SUB_EDITOR, ASSISTANT]`). The
third argument `false` refuses a recommend-only assignment, as the sibling
does. Managers and site administrators still pass through
`StageRolePolicy`'s manager clause, and a Section Editor, Layout Editor or
other assistant assigned on the Production stage with the permission still
passes. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyeditor-changes-media-outside-production/fix.diff).

**Tried.** With the fix in, every copyeditor media write at Copyediting
(add, rename, relink, delete) is refused (401
`user.authorization.accessibleWorkflowStage`) on OJS and OMP and the media
list is unchanged — the Steps' Expected — while a manager still adds media
to a submission in Production, a Section Editor assigned on Production does
too, and the copyeditor still edits the publication's metadata at
Copyediting (all 200), so the guard is scoped to media writes and does not
block the roles that should keep them.

This fix follows the "Media" page's rule (Production-stage access). It
does not close the opposite half of the mismatch the report names: the
page offers media management to a role assigned on Production whatever the
current stage, but `PublicationWritePolicy` requires a role on the current
stage, so a Layout Editor assigned on Production would still see the
buttons and be refused while the submission is before Production. That is
the "Media" page's offer to reconcile, outside this controller.

**Alternatives.**

- Make the "Media" page and side menu offer media only where the server
  accepts it (a role on the current stage): this narrows the page to match
  the server rather than the server to match the page, a product decision,
  and still leaves the API open to roles the page would not offer; not
  recommended.
- Guard only the four routes `pkp/pkp-lib#13054` changed and leave `add`:
  that misses `add`, open since the API was created; the single policy
  covers all five.

**What goes with it.**

- The body-text write routes share the cause and want the same guard (the
  U48 surface); this diff does not touch them.
- A unit test on `MediaFilesController` that a participant assigned only at
  a pre-Production stage is refused a media write, and the e2e guard
  planned in the spec.

Small: one policy line and an import in one shared controller, following
an existing pattern, with no data repair and no change to an API contract.

## Evidence

- Kept script and how to run it:
  `shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js`
  (helpers in `lib.js`), after
  `npm run fleet-prep -- --feature issues-x8 --dataset 6 --reset --apps ojs,omp`:
  `ONLY=ojs,omp PROBE_FEATURE=issues-x8 PROBE_AGENT=x8 node bin/probe.js all shared/playwright/checks/issues/copyeditor-changes-media-outside-production/walk.js`.
  It signs in as the dataset's users, takes the Steps, and sends the
  "Media" page's own requests in the copyeditor's session because no screen
  offers them (the API-not-on-any-screen exception, REPORT.md "Steps").
  `WALK=neighbour` runs the neighbour checks; the fix trial applies
  `fix.diff` with `bin/try-fix.js`, reset-walks it in and out, and reverts.
- Walked on main, OJS (app `1f4cef786f`, lib/pkp `a7f5e3081b`) and OMP
  (app `a989fdc37`, lib/pkp `a7f5e3081b`), PostgreSQL (MySQL not checked):
  the copyeditor was offered no media controls, yet add, rename, relink and
  delete all answered 200 and took effect; the same copyeditor on a
  Production submission was refused (401). The `genreId` was read from the
  editor's own upload (OJS 10, OMP 14).
- Media add, rename and delete each write a
  `SubmissionFileEventLogEntry` (upload/edit/delete) under the acting
  user, so the change shows in the submission's activity log
  (`checkouts/ojs/lib/pkp/classes/submissionFile/Repository.php`).
- Introduced: `git log`/blame on `MediaFilesController::authorize()` in
  `checkouts/ojs/lib/pkp`: `2b13599365` removed both
  `SubmissionFileStageAccessPolicy` blocks (edit/delete/link and linkMany);
  `f4eccf8b9f` created the controller with none on `add`. The naming issue
  `pkp/pkp-lib#12702` is a JATS-upload authorization fix, not this fault.
- 3.5 (ojs `4342473090`, lib/pkp `771474347e`), 3.4 (lib/pkp `767353f4fe`)
  and 3.3 (lib/pkp `ac3fa73402`): read in the code — `MediaFilesController`
  is absent on all three, so the Steps cannot be walked there.
- Upstream search (2026-10-05) of pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  open and closed: nothing about media writes accepted outside Production.
- Run folders under `.reports/issues/x8/`. Unverified: the body-text
  parallel is read in the code only.
