# A Section Editor's "OK" on a participant's "Edit Assignment" saves nothing and shows the form again

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; default roles)
  - 3.3: none (code; no such check)
- **Introduced** `pkp/pkp-lib#12527` for `pkp/pkp-lib#12497` · [7ce4f2e80b](https://github.com/pkp/pkp-lib/commit/7ce4f2e80b42bef81caf473a325e3064bdd78725) · 2026-04-02 · Vitaliy (Vitaliy-1); on `stable-3_5_0` `pkp/pkp-lib#12525`, [75e92f8dd5](https://github.com/pkp/pkp-lib/commit/75e92f8dd53bb661e83fcfe5b47a263c1a0d67ca)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A Section Editor assigned to a submission (a Series Editor on a press, a
Moderator on a preprint server) is offered "Edit" on the Participants
rows of the Author, the assistants and the other section editors, never
on their own. The "Edit Assignment" window shows the "Permissions" box,
and on another section editor's row also "Assignment privileges".
Pressing "OK" is expected to save the boxes and close the window.
Instead the window shows its form again with the boxes as they were,
with no notice and no reason, and nothing is saved.

A Journal Manager or Editor making the same change on the same row saves
it.

## Impact

- **Lost**: the change itself. A Section Editor cannot tick or untick
  "Permissions" (whether the person may edit the publication) for an
  Author or assistant, nor "Assignment privileges" (whether another
  section editor may only recommend a decision, not record one).
- **Who**: every Section Editor, Series Editor and Moderator assigned to
  a submission, in the Participants panel of any workflow stage, each
  time they press "OK" in "Edit Assignment".
- **Way round**: a Journal Manager or Editor makes the change on the
  same row.

Medium: a secondary task always fails for one editorial role, and
silently, but a manager can do it on the same screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (pkp/datasets, 2026-10-01),
  nothing else; the `stable-3_5_0` dataset holds the same people and
  submissions, and the steps are the same there. The steps name OJS; on
  OMP use submission 1 ("The ABCs of Human Survival: A Paradigm for
  Global Citizenship", author Arthur Clark), on OPS submission 1 ("The
  influence of lactation on the quantity and quality of cashmere
  production", author Carlo Corino).

Steps:

1. Sign in as `dbuskins` (password `dbuskinsdbuskins`), a Section editor
   (Series editor on OMP, Moderator on OPS).
2. On the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) press "View" on
   submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice".
3. In the "Participants" panel press "Craig Montgomerie More Actions" on
   the Author's row, then "Edit". The "Edit Assignment" window shows one
   box, "Permissions".
4. Tick the box under "Permissions" ("Allow this person to make changes
   to the publication, …"; on OPS it is ticked, so untick it) and press
   "OK".
5. Press "Cancel", then "Edit" on the same row again, and "Cancel".
6. (OJS and OPS; the OMP submission has no second editor) Press "Edit"
   on Stephanie Berardo's row. The window shows "Assignment privileges"
   and "Permissions". Tick the box under "Assignment privileges" ("This
   participant is only allowed to recommend an editorial decision …"),
   leave "Permissions" as it is, and press "OK".

**Expected**: after "OK" the window closes, the notice "The stage
assignment has been changed." appears at the top right, and "Edit" shows
the box as changed. After step 6 Stephanie Berardo's row reads "Only
allowed to recommend an editorial decision".

**Observed**: after "OK" the window stays open and shows the form again
with the box as it was before the change. There is no notice and no
error. In step 5 "Edit" shows the old state, and in step 6 the row gains
no line. The save request answers 200 with the form's HTML instead of a
"data changed" event:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/save-participant
200 {"status":true,"content":"<form class=\"pkp_form\" id=\"addParticipantForm\" …"}
```

Afterwards, signed in as `rvaca` (Journal manager), steps 2 to 5 on the
same row save: the window closes, the notice shows, and "Edit" shows the
box changed.

## Cause

`PKP\security\Validation::canEditParticipant()`
(`lib/pkp/classes/security/Validation.php`, line 515 on `main`) decides
whether the signed-in user may save an edited assignment. A Manager or
Site Administrator passes at once. For anyone else it looks up that
user's own assignments on the submission and stage:

```php
$stageAssignments = StageAssignment::with('userGroup')
    ->withSubmissionIds([$submission->getId()])
    ->withStageIds([$stageAssignment->stageId])
    ->withUserId($user->getId())
    ->get();
```

A `StageAssignment` has no `stageId`: the `stage_assignments` table has
no stage column, and the model takes its stages from the role's
`user_group_stage` rows. So `$stageAssignment->stageId` is `null`,
`scopeWithStageIds([null])` adds `stage_id IN (NULL)`, the lookup finds
nothing, and the method returns false for every user who is not a
manager.

`StageParticipantGridHandler::saveParticipant()` answers that refusal
with `new JSONMessage(true, $form->fetch($request))`: the form again,
with no error, which is what the window shows.

The method came with `pkp/pkp-lib#12497` ("Don't allow recommend-only
editors to change this status"), as the server's side of three rules: an
editor cannot edit a manager's row, cannot edit their own, and a
recommending editor cannot edit another editor's. On `stable-3_4_0` it
reads `$stageAssignment->getStageId()`, which the 3.4 DAO fills from its
join with `user_group_stage`. The 3.5 and `main` versions were written
with `->stageId`, a property the Eloquent model never had.

A second fault sits further down the same method and shows as soon as the
lookup is repaired: `$stageAssignment->getUserId()` is a method of the
3.4 data object that the model does not have. With only the stage
repaired the request fails with

```
PHP Fatal error:  Uncaught BadMethodCallException: Call to undefined method PKP\stageAssignment\StageAssignment::getUserId()
```

Reach:

- Every non-manager who is offered "Edit". The panel offers it to an
  assigned user whose role on the stage is at section-editor level
  (`useCurrentUser.js::canCurrentUserEditParticipant()` in ui-library):
  Section Editor, Series Editor and Moderator (walked), and OJS's "Guest
  editor" role (code: the same role level).
- Both boxes and every row that offers "Edit" (walked: the Author's
  "Permissions" on the three apps, another section editor's "Assignment
  privileges" on OJS and OPS).
- `StageParticipantGridRow::initialize()` calls the same method to draw
  the "Edit" link of the legacy participants grid. No screen opens that
  grid on `main` or 3.5; requested in the browser at its `fetch-grid`
  address (Evidence), it draws no "Edit" link on any row for a Section
  Editor.
- Assigning a new participant is not affected: the check runs only when
  the request names an existing assignment (code).
- The third rule is missing from the method: it has no recommend-only
  test (code). Today that does not show, since every editor is refused.
  The panel has it: a recommending editor is offered no "Edit" on
  another section editor's row (walked).

## Proposed fix

Pass the stage to the check instead of reading it from the assignment,
read the user's ID as the model's property, and add the recommend-only
rule the panel already applies, so that the server and the panel agree
once the check starts passing editors. Both callers already hold the
stage the request was authorized for (`$this->getStageId()`), and the
panel's own test takes the stage the same way. The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/fix.diff).

```diff
--- a/lib/pkp/classes/security/Validation.php
+++ b/lib/pkp/classes/security/Validation.php
-    public static function canEditParticipant(User $user, Submission $submission, StageAssignment $stageAssignment): bool
+    public static function canEditParticipant(User $user, Submission $submission, StageAssignment $stageAssignment, int $stageId): bool
…
-            ->withStageIds([$stageAssignment->stageId])
+            ->withStageIds([$stageId])
…
         // Don't allow to edit own assignments
-        if ($user->getId() === $stageAssignment->userId) {
+        if ($user->getId() == $stageAssignment->userId) {
+            return false;
+        }
+
+        // Recommend-only editors aren't allowed to edit other editors' assignments
+        $isRecommendOnly = $stageAssignments->contains(fn (StageAssignment $assignment) => (bool) $assignment->recommendOnly);
+        if ($isRecommendOnly && $stageAssignment->userGroup->roleId == Role::ROLE_ID_SUB_EDITOR) {
             return false;
         }
…
-        $editableUser = Repo::user()->getCollector()->filterByUserIds([$stageAssignment->getUserId()])->getMany()->first();
+        $editableUser = Repo::user()->getCollector()->filterByUserIds([$stageAssignment->userId])->getMany()->first();
```

`StageParticipantGridHandler::saveParticipant()` and
`StageParticipantGridRow::initialize()` pass `(int) $stageId` as the new
argument.

Why each line:

- The recommend-only test mirrors the last rule of
  `canCurrentUserEditParticipant()`. Without it, the repaired check
  would let a recommending editor's save for another section editor's
  row through, and the form would store its "Permissions" box
  (`AddParticipantForm::_isChangePermitMetadataAllowed()` has no
  recommend-only test; `_isChangeRecommendOnlyAllowed()` has), although
  the panel hides "Edit" on that row.
- The own-row comparison becomes `==`, as the form's two helpers compare
  the same IDs: the model has no cast on `user_id`, so `===` holds only
  while the database driver returns an integer.

Tried on `main` on the three apps. The Section Editor's "OK" closes the
window with "The stage assignment has been changed.", "Edit" shows the
box changed, and Stephanie Berardo's row gains "Only allowed to
recommend an editorial decision". The rules of the introducing change
hold, in the panel's menus and in the legacy grid, which draws an "Edit"
link exactly on the rows `canEditParticipant()` passes:

- For the Section Editor: no "Edit" on his own row or the Journal
  editor's; "Edit" on the Author's, the assistant's and the other
  section editor's.
- After a manager ticks "Assignment privileges" on the Section Editor's
  row: additionally no "Edit" on the other section editor's row (OJS,
  OPS), still "Edit" on the Author's.
- For a manager: "Edit" on every row, as before.

**Alternatives**

- Drop the stage from the lookup (any assignment on the submission): one
  line less, but an editor assigned only to another stage's role would
  pass a check the method says is per stage.
- Take the stages from the edited assignment's role
  (`$stageAssignment->userGroupStages`): no new argument, but it tests
  the stages of the row's role, not the stage the user is working on.
  That is in effect what 3.4 does (Evidence), so the stage argument is a
  deliberate change from 3.4, not only a repair.

**What goes with it**

- Backport to `stable-3_5_0`: the same changes. The diff's first
  `Validation.php` hunk does not apply there as written (the lines above
  the method differ); the others do.
- The check's signature gains a required argument. Its two callers are
  the only ones in pkp-lib, the three apps and their bundled plugins.
- Not part of this fix, and not walked: the server refuses a row whose
  *user* holds a manager role anywhere in the journal, while the panel
  hides "Edit" by the *row's* role. A manager assigned as an Author
  would still be offered "Edit" that saves nothing. The refusal itself
  could also answer with a message instead of the bare form.
- Guard: an e2e scenario in U35 (a Section Editor changes the Author's
  "Permissions" and sees the notice and the changed box), a Planned item
  in the spec.

Small: one method and its two callers in pkp-lib, with no data repair.

## Evidence

- Kept scripts (pkp-e2e's probe kit, on an install loaded from the
  default dataset; `<feature>` names that install's fleet file, `<id>`
  the output folder):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js)
  takes the steps and the manager's control;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/neighbour.js)
  reads the row menus and the legacy grid's links as `dbuskins` and
  `rvaca`, then has `rvaca` tick "Assignment privileges" on `dbuskins`'s
  row and reads both again as `dbuskins`. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/section-editor-edit-assignment-saves-nothing/fix.diff ojs omp ops`,
  both scripts, then `revert`.
- Where the walk differed from the Steps: the script opens the workflow
  by address (`…/dashboard/editorial?workflowSubmissionId=<id>`) instead
  of pressing "View". It also reads the `stage_assignments` rows:
  unchanged after the Section Editor's steps, changed after the
  manager's.
- The legacy grid's address:
  `/index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/fetch-grid?submissionId=4&stageId=1`.
  Unfixed, it draws no "Edit" link for `dbuskins` and one on every row
  for `rvaca`. The fatal error quoted in the Cause was seen there once,
  on OJS `main`, with only the stage change applied.
- Walked on `main`: OJS 4408b94def (lib/pkp f5bd392a69, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). Walked on `stable-3_5_0`: OJS 4fca1027f4, OMP
  c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491, ui-library d4e01883),
  where the method and its callers read the same as on `main`: the same
  result on every app. Dataset: pkp/datasets c657990 (2026-10-01).
  PostgreSQL; MySQL not checked.
- No request answered an error and no page script failed during the
  unfixed walks.
- Code read, 3.4 (pkp-lib `stable-3_4_0` df13621c2d):
  `canEditParticipant()` reads `$stageAssignment->getStageId()` and
  `getUserId()` on the DAO's data object;
  `StageAssignmentDAO::getById()` selects `ugs.stage_id` through its join
  with `user_group_stage`, so the stage is set (to one of the row's
  role's stages, whichever row the join returns first) and the lookup
  finds the editor's assignment when their role covers that stage. The
  default section-editor-level roles of the three apps cover
  every stage, so the check passes there; an editor role edited to cover
  fewer stages could be refused on 3.4 as on 3.5. Not walked.
- Code read, 3.3 (pkp-lib `stable-3_3_0` d446601ebe): no
  `canEditParticipant` anywhere; `pkp/pkp-lib#12497` has no commit
  there.
- Introduced: `git blame` on `Validation.php` lines 515 to 553 gives
  7ce4f2e80b for the whole method; `pkp/pkp-lib#12527` merged it to
  `main` on 2026-04-10, `pkp/pkp-lib#12525` its twin to `stable-3_5_0`,
  `pkp/pkp-lib#12503` the 3.4 version (c1c5ce51a3). The panel's "Edit"
  rule came with ui-library bc82fd23 for the same issue.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, issues and PRs, by "Edit Assignment", section
  editor, participant, not saved, and by `canEditParticipant`,
  `canCurrentUserEditParticipant` and `withStageIds`; the comments of
  `pkp/pkp-lib#12497` read. Nothing reports this fault.
- Not driven: OJS's Guest editor role; an assistant's "Edit Assignment"
  window (its "Edit" link was read); a manager assigned in a non-manager
  role (the leftover named in the Proposed fix); the fix on
  `stable-3_5_0`.
