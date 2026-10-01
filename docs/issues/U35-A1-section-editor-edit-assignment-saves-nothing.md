# Section editors' "OK" on "Edit Assignment" saves nothing and shows the form again

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (released in 3.5.0-4 and 3.5.0-5)
  - 3.4: none (code)
  - 3.3: none (code; no such check)
- **Introduced** `pkp/pkp-lib#12527` for `pkp/pkp-lib#12497` · [7ce4f2e80b](https://github.com/pkp/pkp-lib/commit/7ce4f2e80b42bef81caf473a325e3064bdd78725) · 2026-04-02 (merged 2026-04-10) · Vitaliy Bezsheiko (Vitaliy-1); on 3.5 the backport `pkp/pkp-lib#12525`
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An assigned Section Editor or Guest Editor is offered "Edit" on the rows
of the assistants, the Author and the other editors they may change, and
the "Edit Assignment" window shows them the boxes. Pressing "OK" is
expected to save the change and close the window. Instead the window
shows its form again with the boxes as they were, no notice and no
reason, and the row keeps its old limits. A Journal Manager's "OK" on the
same row saves.

The boxes are "Permissions" (whether the person may change the
publication's title, abstract and other details) and "Assignment
privileges" (whether an editor may only recommend a decision). A
permission check on the server refuses the change for every editor in a
section-level role: Section and Guest Editors on a journal, Series
Editors on a press, Moderators on a preprint server.

## Impact

- **Lost:** the change to the row's limits; the box springing back is
  the only sign.
- **Who:** every assigned section-level editor who uses "Edit" on a
  Participants row, on any submission and stage.
- **Way round:** a manager-level user makes the change from the same row:
  a Journal Manager, Journal editor or Production editor on a journal; a
  Press Manager, Press editor or Production editor on a press; a Preprint
  Server manager on a preprint server. The section-level editor cannot do
  it themselves and has to ask one of them.

Medium: a secondary task fails for a whole role, and the box springing
back shows it failed; another person can do it on screen. It would be
high where no manager-level user takes part in the editorial work.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS, on PostgreSQL.

The submission and its rows (David Buskins, `dbuskins`, is assigned to
each as the section-level editor):
- OJS: submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice" (Submission stage);
  the Author "Craig Montgomerie"; the other editor "Stephanie Berardo"
  (Section editor).
- OMP: submission 6, "The Information Literacy User’s Guide" (Internal
  Review); the Author "Deborah Bernnard"; the other editor "Minoti Inoue"
  (Series editor, recommend-only).
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production" (Production); the Author "Carlo
  Corino"; the other editor "Stephanie Berardo" (Moderator).

As the Section Editor:
1. Sign in as `dbuskins` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. In "Participants", open the Author's "More Actions" menu and choose
   "Edit".
3. In "Edit Assignment", under "Permissions", change the box "Allow this
   person to make changes to the publication, such as the title,
   abstract, metadata and other publication details. …" (tick it; on OPS
   it is ticked: untick it).
4. Press "OK".
5. Press "Cancel", then open the other editor's "More Actions" menu and
   choose "Edit".
6. Under "Assignment privileges", change the box "This participant is
   only allowed to recommend an editorial decision and will require an
   authorised editor to record editorial decisions." (tick it; on OMP it
   is ticked: untick it).
7. Press "OK".
8. Press "Cancel", reload the page and open "Edit" on the Author's row
   again.

**Expected:** steps 4 and 7 close the window, a notice "The stage
assignment has been changed." shows at the top right, and after step 7
the editor's row gains (OMP: loses) "Only allowed to recommend an
editorial decision". Step 8 shows the box as changed.

**Observed:** after steps 4 and 7 the window stays open, showing its form
again with the box back as it was; no notice, no message. The editor's
row is unchanged, and step 8 shows the box as it was before. The
`save-participant` request answers 200 with the window's form again:

```
{"status":true,"content":"<script type=\"text/javascript\">\n\t$(function() {\n\t\t// Attach the form handler.\n\t\t$('#addParticipantForm').pkpHandler(…
```

Control: signed in as `rvaca` (the manager), steps 1–4 close the window
with "The stage assignment has been changed." and the change is kept.

## Cause

`StageParticipantGridHandler::saveParticipant()` runs
`Validation::canEditParticipant()` before it saves an edited assignment,
and answers the redrawn form, with no message, when that returns false
(`lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php`,
around line 339).

`Validation::canEditParticipant()` (`lib/pkp/classes/security/Validation.php`,
declared at line 515) lets a manager or site administrator through. For
anyone else it looks up the current user's assignments "within given
submission and stage" (line 527):

```php
$stageAssignments = StageAssignment::with('userGroup')
    ->withSubmissionIds([$submission->getId()])
    ->withStageIds([$stageAssignment->stageId])
    ->withUserId($user->getId())
    ->get();
```

The Eloquent `StageAssignment` model has no `stageId`: the
`stage_assignments` table has no stage column (an assignment reaches its
stages through its user group's `user_group_stage` rows). So
`$stageAssignment->stageId` is null, `scopeWithStageIds([null])` filters
on `stage_id IN (NULL)`, the lookup finds nothing, and the method returns
false for every Section Editor.

`pkp/pkp-lib#12527` added three rules for `pkp/pkp-lib#12497`. Two live
in this method: an editor may not edit their own row, nor the row of a
person who holds a manager role. The third, that a recommend-only editor
may not change anyone's recommend-only status, lives in
`AddParticipantForm::_isChangeRecommendOnlyAllowed()`, which hides the
box and makes `execute()` skip the field. On 3.4 the same method reads
`getStageId()` from the DAO-built `StageAssignment`, whose query joins
in a stage. The Eloquent model on 3.5 and `main` has no stage, and the
handler's own stage id was never passed in to replace it.

A second fault sits behind the first: the same method's last check
reads `$stageAssignment->getUserId()`. The Eloquent model has no such
method, so Eloquent forwards the call to the query builder, which throws
`BadMethodCallException`. It is never reached today; once the lookup
finds the editor's assignment, every Section Editor's save would answer
a server error there.

Reach:
- `StageParticipantGridRow` calls the same method to decide whether its
  row offers "Edit" (code). That row belongs to the older participants
  grid; today's "Participants" panel decides by its own test in
  ui-library's `useCurrentUser::canCurrentUserEditParticipant()`, which
  offers "Edit" on these rows, so the panel and the server disagree.
- "Assign" is not affected: the check runs only when an `assignmentId`
  is posted (checked in the code; "Assign" was driven only as the
  manager).
- No other code reads `stageId` or `getUserId()` from an Eloquent
  `StageAssignment` (searched in lib/pkp and the three apps).

## Proposed fix

Pass the stage the request is authorized for into
`Validation::canEditParticipant()`, as the grid already knows it, and
read the edited user's id as the model's attribute
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/fix.diff)):

```diff
-    public static function canEditParticipant(User $user, Submission $submission, StageAssignment $stageAssignment): bool
+    public static function canEditParticipant(User $user, Submission $submission, int $stageId, StageAssignment $stageAssignment): bool
…
-            ->withStageIds([$stageAssignment->stageId])
+            ->withStageIds([$stageId])
…
-        $editableUser = Repo::user()->getCollector()->filterByUserIds([$stageAssignment->getUserId()])->getMany()->first();
+        $editableUser = Repo::user()->getCollector()->filterByUserIds([$stageAssignment->userId])->getMany()->first();
```

with `$stageId` added to both callers,
`StageParticipantGridHandler::saveParticipant()` and
`StageParticipantGridRow::initialize()`, which each hold it already
(`$this->getStageId()`, the stage `WorkflowStageAccessPolicy`
authorized). The method then checks the editor's role on the stage
being worked on, as its comment says it does; the form leaves its
recommend-only rule untouched. The same form already scopes its own
lookup this way: `_isChangeRecommendOnlyAllowed()` filters with
`withStageIds([$this->_stageId])`, the handler's authorized stage.

Tried on `main`, all three apps: the Steps now close the window with
"The stage assignment has been changed." and keep the change on both
rows; the manager's save is unchanged, and a Section Editor removed from
the submission while "Edit Assignment" is open is still refused ("You
don't currently have access to that stage of the workflow."), as without
the fix. The panel still offers no "Edit" on the Section Editor's own
row.

With the fix in, the method's own-row check (`$user->getId() ===
$stageAssignment->userId`, a strict comparison on an attribute the model
does not cast) runs on 3.5 and `main` for the first time. The walk shows
only that the panel hides "Edit" on that row; that the server refuses a
save of one's own row is read in the code, not driven, and is what the
unit test below should cover.

**Alternatives:**
- Drop the stage filter and look at any assignment on the submission:
  works with the default roles, but loses the stage scoping the method
  means to have, for custom roles limited to some stages.
- Look the stage up from the edited row's user group, as 3.4 did: an
  assignment covers several stages, so that picks one arbitrarily.

**What goes with it:**
- The refusal itself is silent: `saveParticipant()` answers the redrawn
  form with no message. A refusal that says so (`new JSONMessage(false,
  …)` with a reason) would have shown this fault at once.
- The server and the panel decide "manager-level" differently: the
  server refuses a row whose person holds a manager role anywhere in the
  context, the panel hides "Edit" only on rows whose assigned role is
  manager-level. After the fix, a Section Editor offered "Edit" on such a
  person's non-manager row (an Editor assigned as Author, say) still
  gets the redrawn form. Read in the code, not driven; one of the two
  rules should follow the other.
- `canEditParticipant()` is a public static method; its signature
  changes. Its only callers are the two above.
- Backport: the same diff applies to `stable-3_5_0`, apart from the
  docblock's context (3.5 still has `@return bool`). No data repair.
- Guard: a unit test of `canEditParticipant()` for a Section Editor
  assigned on the stage (true), on their own row and on a manager's row
  (false); and the e2e walk of U35 Rule 8d as a Section Editor.

Small: a new parameter and an attribute read in one shared class, and a
unit test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js)
  takes the Steps and the control on the three apps
  (`node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js`
  on an install freshly reset to the default dataset); the neighbour
  cases next to the fix, walked with the fix in and out, are in
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/neighbour.js):
  the panel offers no "Edit" on the Section Editor's own row or on the
  Editor's row, and a Section Editor removed from the submission while
  "Edit Assignment" is open is refused. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/fix.diff ojs omp ops`.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). The database's `stage_assignments` flags were read before
  and after each walk: unchanged after the Section Editor's steps, changed
  after the manager's and, with the fix, after the Section Editor's.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`,
  OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), ui-library `280f98c5`;
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`, ui-library `1a7a4750`); lib/pkp `stable-3_4_0`
  `df13621c2d`, `stable-3_3_0` `d446601ebe`; OJS `stable-3_4_0`
  `9571d8fde7`, `stable-3_3_0` `9fdb9bcf9a`.
- 3.5, walked: the same Steps show the same redrawn form on the three
  apps; the manager's control saves. Code: `canEditParticipant()` is the
  backport `75e92f8dd5` (`pkp/pkp-lib#12525`) with the same two lines.
  It is in the lib/pkp release tags `3_5_0-4` (2026-04-10) and
  `3_5_0-5`, and the OJS, OMP and OPS `3_5_0-4` and `3_5_0-5` tags point
  lib/pkp at commits that contain it, so sites on 3.5.0-4 or later have
  the fault.
- 3.4 (code): `canEditParticipant()` (backport `pkp/pkp-lib#12503`) uses
  the DAO `StageAssignment`, whose `getById()` selects
  `ugs.stage_id` from a join on `user_group_stage`, so `getStageId()`
  holds one of the stages of the edited person's role. In the default
  roles a Section Editor's role covers every one of those stages, so the
  lookup still finds the Section Editor's assignment. `getUserId()`
  exists there.
- 3.3 (code): `StageParticipantGridHandler::saveParticipant()` validates
  and executes the form with no such check.
- Introduced: `git blame` on the lookup line gives `7ce4f2e80b` (the
  method's creation, PR `pkp/pkp-lib#12527`).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by the
  symptom's words and by `canEditParticipant`, `saveParticipant` and
  "Edit Assignment"; `pkp/pkp-lib#12497`'s thread raises no report of it.
- Not driven: a journal's Guest Editor (same `ROLE_ID_SUB_EDITOR` path in
  the code); a custom role limited to some stages; MySQL (the lookup's
  `IN (NULL)` finds nothing on either database, so no difference is
  expected).
