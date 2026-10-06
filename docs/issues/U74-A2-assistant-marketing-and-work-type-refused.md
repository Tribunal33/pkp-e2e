# A press's assistants are offered "Audience", "Publication Dates" and the work type, then every change is refused

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#700` for `pkp/pkp-lib#2072` · [ce205d583](https://github.com/pkp/omp/commit/ce205d58362e3bdcfaf1dc59e43c6c068e12415c) · 2019-08-21 · Nate Wright (NateWr), for "Audience" and the work type; "Publication Dates" by `pkp/omp#727` for `pkp/pkp-lib#4920` · [4c45c11dd](https://github.com/pkp/omp/commit/4c45c11ddc23daeac3d44f949298911d784ab3a8) · 2019-11-04, the same author; all three carried into the new workflow by `pkp/ui-library#428` ([80daa02d](https://github.com/pkp/ui-library/commit/80daa02d4ce03c9011b386265d664410190d5b51), 2024-10-16, Jarda Kotěšovec (jardakotesovec))
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U74 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U74-onix-metadata-export.md#a2) · spec U72 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U72-chapters-work-type.md#a2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press, every assistant-level role assigned to a monograph (the
default Copyeditor, Designer, Funding coordinator, Indexer, Layout
Editor, Marketing and sales coordinator and Proofreader, and any
assistant-level role the press adds) finds
"Marketing" › "Audience" and "Marketing" › "Publication Dates" in the
workflow with "Save" pressable. They also find the work type
("Monograph" or "Edited Volume") as a menu in the header. Their "Save"
shows "An unexpected error has occurred. Please reload the page and try
again." and nothing is saved, while the page keeps showing their
choice until it is reloaded. Choosing a work type opens a window
"Error", "The current role does not have access to this operation.",
and the type stays.

The server accepts these changes only from the press's editors (Press
manager, Press editor, Production editor, an assigned Series editor)
and from the book's author, whose own view offers none of the three. So
the refusal is intended; the offer is what is wrong.

## Impact

- **Lost**: the choice just made, and the time it took.
- **Who**: every assistant role assigned to a monograph, on every press,
  in any stage. The Marketing and sales coordinator, whose work these
  pages look like, is among them.
- **Way round**: ask an editor of the press to make the change. No
  press setting lets an assistant save these: neither the role's
  "Permit submission metadata edit." nor the assignment's "Permissions"
  box changes the answer, since the server tests the role alone.

Low: nothing stored is lost and an editor can make the change. A press
that leaves "Audience" to its Marketing and sales coordinator would make
it medium, but whether that role may save is a product decision
(Proposed fix, Alternatives).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP, the press
  `publicknowledge`. Nothing is created.
- Book 4, "How Canadians Communicate: Contexts of Canadian Popular
  Culture", is in Production. `gcox` (Graham Cox) is assigned to it as
  Layout Editor and `dbarnes` as Press editor. It has no audience and no
  "Publication Dates" choice saved.
- Book 7, "Accessible Elements: Teaching Science Online and at a
  Distance", is in Copyediting, with `mfritz` (Maria Fritz) assigned as
  Copyeditor.

The Layout Editor:

1. Sign in as `gcox`. On the dashboard, press "View" on book 4.
2. In the side menu, open "Marketing" › "Audience".
3. In "Audience", choose "Children (02)" and press "Save".
4. Reload the page and open "Marketing" › "Audience" again.
5. Open "Marketing" › "Publication Dates", choose "Each chapter may have
   its own publication date." and press "Save".
6. Reload the page and open "Publication Dates" again.
7. In the workflow's header, press "Monograph" and choose "Edited
   Volume".
8. Press "OK" in the "Error" window that opens, and reload the page.

The Copyeditor, in her own stage:

9. Sign in as `mfritz` and press "View" on book 7.
10. Take steps 2, 3 and 7 on it.

**Expected**: a role that may not save these is not offered them, or
sees them read-only: "Save" greyed, no work-type menu.

**Observed**: step 3 shows the passing notice "An unexpected error has
occurred. Please reload the page and try again.", and "Audience" still
reads "Children (02)". After step 4 it is empty again. Step 5 does the
same: the notice, then "Each chapter…" still selected until the reload
in step 6, after which neither choice is selected. Step 7 opens a window
headed "Error", "The current role does not have access to this
operation.", "OK"; the header still reads "Monograph", also after the
reload. Every save answered:

```
PUT /index.php/publicknowledge/api/v1/submissions/4   (a POST with X-Http-Method-Override: PUT)
401 {"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}
```

The Copyeditor got the same on book 7, both for "Audience" and for the
work type.

As a control, `dbarnes` taking step 3 on book 4 sees "Saved", and
"Children (02)" is still there after a reload.

## Cause

All three controls save through one route,
`PUT /api/v1/submissions/{submissionId}` (lib/pkp
`PKPSubmissionController::getGroupRoutes()`, route `submission.edit`).
It sits behind `roleAuthorizer([ROLE_ID_MANAGER, ROLE_ID_SUB_EDITOR,
ROLE_ID_AUTHOR])`, so an assistant is refused with 401
`user.authorization.roleBasedAccessDenied`. The two Marketing forms
(OMP `AudienceForm`, `PublicationDatesForm`) are built with that
route as their action by OMP `SubmissionController::getAudienceForm()`
and `getPublicationDatesForm()`, which admit assistants. The work-type
menu sends `{workType}` to the same route from ui-library
`useWorkflowActions.js::workflowChangeWorktype()`.

Nothing in the editorial view checks whether the user holds a role
that route admits. In ui-library
`src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOMP.js`,
`getHeaderItems()` pushes `WorkflowWorkTypeOMP` for everyone, and
`MarketingConfig.audience` and `MarketingConfig.publicationDates` render
`WorkflowMarketingForm` with no edit flag. `WorkflowMarketingForm.vue`,
unlike its sibling `WorkflowPublicationForm.vue`, never sets the form's
`canSubmit`, so "Save" is always pressable.

The two notices differ because `Form.vue::error()` shows the server's
message only for a 403 or 404 and `common.unknownError` for anything
else, a 401 included, while the work-type call goes through `useFetch`,
which shows the server's message in an "Error" window. The form keeps
the refused value because the field was set locally before the save.

OMP ce205d583 put the work-type menu and a "Marketing" tab holding
"Audience" in `templates/workflow/workflow.tpl` for everyone who opens
the workflow, assistants included; 4c45c11dd added "Publication Dates"
to that tab. The edit route then admitted only the manager and the
sub-editor (lib/pkp `PKPSubmissionHandler.inc.php`, the file as of
fc4de84d4a, 2019-09-06).

Reach:

- "Marketing" › "Representatives", in the same group, is not affected:
  `RepresentativesGridHandler` admits assistants (code; on screen,
  the Layout Editor gets "Add Representative").
- No other control in the editorial view saves through this route. Only
  OMP's `SubmissionController` builds forms with the submission's own
  URL as their action; OJS and OPS have none (code).
- The Author's view offers neither the "Marketing" group nor the
  work-type menu (`workflowConfigAuthorOMP.js`, code).
- [U47 OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U47-OMP2-press-copyeditor-media-download-refused.md)
  is the same kind of fault on the "Media" page, with another gate and
  its own fix.

## Proposed fix

Give the editorial view a flag for the route's roles and gate the three
controls on it, the way it already gates "Activity Log" and "Delete"
on role lists. `useWorkflowPermissions.js` sets `canEditSubmission`
when any stage lists the Manager or Sub-editor role among the user's
roles: the route's roles, the Author's apart, since the author's view
offers none of the three. Two choices in it:

- It does not reuse `canAccessEditorialHistory`, which tests these
  roles (and the Site administrator) on the active stage only. The route does not look at the stage.
  A Production editor assigned to the book takes part only in
  Copyediting and Production; after a "back from copyediting" decision
  returns the book to review, the route still admits them, but the
  active-stage test would not.
- It leaves out the Site administrator. A site administrator with no
  role in the press is listed with that role on every stage, but the
  route checks the roles held in the press and refuses them, so a flag
  that admitted them would repeat the fault for that user.

`workflowConfigEditorialOMP.js` adds the
work-type menu only with that flag (`addItemIf`) and passes it to both
Marketing forms as `canEdit`. `WorkflowMarketingForm.vue` takes
`canEdit` and sets `canSubmit` from it, as `WorkflowPublicationForm.vue`
does. The assistant then sees "Audience" and "Publication Dates"
with "Save" greyed, the way the view greys "Save" on "Title & Abstract"
for whoever may not edit the publication, and no work-type menu. The full diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-marketing-work-type-offered-then-refused/fix.diff);
the work-type part:

```diff
-	actions.push({
-		component: 'WorkflowWorkTypeOMP',
-		props: {
-			submission: submission,
+	addItemIf(
+		actions,
+		{
+			component: 'WorkflowWorkTypeOMP',
+			props: {
+				submission: submission,
+			},
 		},
-	});
+		permissions.canEditSubmission,
+	);
```

The fix was tried on `main` with the Steps. For the Layout Editor and
the Copyeditor, "Save" on "Audience" and on "Publication Dates" was
greyed and the header offered no work-type menu, so no refused request
was sent. The Press editor still saved "Audience". A neighbour check,
run with the fix in and out, gave the same result both times: the
assigned Series editor saved "Audience" and "Publication Dates" and
changed the work type, and the Layout Editor still had "Add
Representative" on "Representatives".

**Alternatives**:

- Admit `ROLE_ID_ASSISTANT` on `PUT submissions/{id}`. That would let
  every assistant change any field this route accepts, not only these
  three, and who keeps a book's audience is the team's decision. It is
  not proposed without that decision; if the team wants the Marketing
  and sales coordinator to save "Audience", a narrower route for the
  Marketing fields would be the way.
- Hide "Audience" and "Publication Dates" from the menu instead. That
  takes away a read-only view the Marketing and sales coordinator may
  use.
- Show the work type to assistants as plain text. That keeps the
  information, but `DropdownActions` has no read-only state, so it needs
  a new one; the Author's view already shows no work type.

**What goes with it**:

- No stored data to repair, and no API or plugin hook changes.
- The flag reads the roles of the user's assignments on the book, as
  the view's other permissions do; a Press manager, Press editor or
  Production editor gets their press role on every stage only when not
  assigned to the book at all. So two kinds of user whom the server
  would accept get the read-only view (code, not walked): someone with
  a manager-level role in the press (Press manager, Press editor,
  Production editor) who is assigned to this book only in an assistant
  role, and someone with the Series editor role in the press who is
  assigned to it only in an assistant role. The view cannot avoid them
  with what it has: the only list of the user's own roles,
  `pkp.currentUser.roles`, spans every press on the site. Both are
  rare, and the result errs on the safe side.
- 3.5: the diff applies as it stands. 3.4 and 3.3
  build these controls in OMP `templates/workflow/workflow.tpl` and the
  `WorkflowHandler` page handler, so a backport needs the same gate
  written there.
- `Form.vue::error()` turning a 401 into "An unexpected error" affects
  every form that can be refused this way. It is left to its own report.
- Guard: a ui-library unit test of `useWorkflowPermissions` for
  `canEditSubmission` (assistant, sub-editor, manager), and the e2e
  scenarios planned in specs U74 and U72.

Small: three files in ui-library, following a gate the view already
uses, with one unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-marketing-work-type-offered-then-refused/walk.js),
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/assistant-marketing-work-type-offered-then-refused/lib.js).
  It takes the Steps on an install loaded from the default dataset, then
  `dbarnes`'s control save:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/assistant-marketing-work-type-offered-then-refused/walk.js`;
  `WALK_MODE=neighbour` runs the neighbour check alone.
- Walked on `main` and 3.5 on PostgreSQL, with pkp/datasets e8dafbc
  (2026-10-02), with no failed page script and no server error; the
  only failed requests were the 401 refusals above. Tips: OMP `main`
  3b0ecf794 (2026-09-29), its pkp-lib 3dc90c81a6 and ui-library
  280f98c5. OMP `stable-3_5_0` 9c5e24246 (2026-10-01), its pkp-lib
  cf3f984335 and ui-library d4e01883. The stored
  `submission_settings` (`audience*`, `enableChapterPublicationDates`)
  and `submissions.work_type` were unchanged after each refused save.
- Roles walked: the Layout Editor and the Copyeditor. The role option
  "Permit submission metadata edit." is offered for every role but the
  manager level (`UserGroupForm`, `NOT_CHANGE_METADATA_EDIT_PERMISSION_ROLES`)
  and feeds the assignment's "Permissions" box, which
  `PKPSubmissionController::edit()` does not read (code). The other
  assistant roles (Designer, Indexer, Proofreader, Marketing and sales
  coordinator, Funding coordinator) were not walked; the dataset assigns
  none of the last two. All are assistant-level roles
  (`ROLE_ID_ASSISTANT`), which the route refuses and the view offers
  alike (code).
- The fix was tried on `main` only, not on 3.5.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` 0aec65441 (2026-09-25)
  and `upstream/stable-3_3_0` 8e72fc883 (2026-09-18) of pkp/omp, with
  pkp-lib `stable-3_4_0` 767353f4fe and `stable-3_3_0` ac3fa73402 and
  ui-library `stable-3_4_0` ee684b34 and `stable-3_3_0` 96959f9e. Read
  on each: `templates/workflow/workflow.tpl` (the work-type dropdown and
  the "Marketing" tab with both forms, shown to everyone who opens the
  workflow), `WorkflowHandler` (assistants admitted; both forms with the
  submission URL as action), ui-library `WorkflowPageOMP.vue`
  (`setAsEditedVolume()` PUTs the submission URL), and the edit route's
  roles (`PKPSubmissionHandler`: manager, sub-editor and author on 3.4;
  manager and sub-editor on 3.3). What an assistant meets there, by
  the code: the workflow page's header offers the work type as a
  dropdown ("Edited Volume", "Monograph"), whose refusal opens an
  "Error" window with the server's message; the page's "Marketing" tab
  offers "Audience" and "Publication Dates" with "Save", whose refusal
  shows the same "An unexpected error has occurred. Please reload the
  page and try again." (`Form.vue` treats a 401 the same way).
- Introduced: blame on the `WorkflowWorkTypeOMP` push and the Marketing
  items gives 7a3a2de37 (a move, `pkp/pkp-lib#10767`) and 80daa02d
  (the 3.5 rewrite); `git log -S` on `setAsEditedVolume`,
  `FORM_AUDIENCE` and `FORM_PUBLICATION_DATES` in OMP's
  `workflow.tpl` leads to ce205d583 (and 4c45c11dd, 2019-11-04, for
  "Publication Dates").
- Upstream: pkp/pkp-lib, pkp/omp and pkp/ui-library searched 2026-10-03
  by the symptom's words ("audience" with save, assistant or layout
  editor; "work type" with "does not have access"; "publication dates"
  with workflow; "Edited Volume" with role) and by
  `WorkflowMarketingForm`, `getMarketingItems` and `workType`. Nothing
  matched; `pkp/pkp-lib#9780` is about the "Publication Dates" options
  themselves, not who may save them.
