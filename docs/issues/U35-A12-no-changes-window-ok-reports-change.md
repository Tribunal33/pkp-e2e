# "OK" on the "No changes can be made to this participant" window reports "The stage assignment has been changed."

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; a section editor's own row)
- **Introduced** `pkp/pkp-lib#4753` for `pkp/pkp-lib#3758` · [8484a16affc](https://github.com/pkp/pkp-lib/commit/8484a16affc13b7d0d0830c73522d53f31c542d4) · 2018-10-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A Journal manager, Journal editor or Production editor (Press manager,
Press editor; Preprint Server manager) whose own assignment on a
submission is ticked "only allowed to recommend an editorial decision"
opens "Edit" on the Participants row of a person assigned in one of
those roles, their own row included. The window reads "No changes can be
made to this participant", yet its "OK" can be pressed and closes the
window with the notice "The stage assignment has been changed."

On `main`, 3.5 and 3.4 nothing is lost: the assignment stays as it was,
and only the notice misleads. "Cancel" closes the window without it.

The same "OK" also adds a line to the submission's activity log, but
every "Edit Assignment" save does that, a real one included: it is a
separate fault ("Edit" is logged as a new assignment) and is not counted
here. The proposed fix is one condition in the window's template that
disables "OK" when there is nothing to change.

## Impact

- **Lost**: nothing (`main`, 3.5 and 3.4): the stored assignment is
  unchanged, and the person is told it was changed.
- **Who**: a person who holds one of the roles above and is assigned to
  the submission as recommend-only, each time they press "OK" in "Edit
  Assignment" on a Journal manager's, Journal editor's or Production
  editor's row (on a preprint server, a Preprint Server manager's). A
  Section editor is never offered "Edit" on those rows.
- **Way round**: "Cancel".

Low: a notice that misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (pkp/datasets, 2026-10-01),
  nothing else; the `stable-3_5_0` dataset holds the same people and
  submissions, and the steps are the same there.
- The steps name OJS and submission 4, "Computer Skill Requirements for
  New and Existing Teachers: Implications for Policy and Practice",
  where Daniel Barnes is the Journal editor. On OMP use submission 4,
  "How Canadians Communicate: Contexts of Canadian Popular Culture"
  (Daniel Barnes, Press editor). On OPS use submission 1, "The influence
  of lactation on the quantity and quality of cashmere production"; the
  dataset assigns no manager to a preprint, so step 3 assigns him first.
  The context path is `publicknowledge` on all three.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. On the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) press "View" on
   the submission.
3. (OPS only) In the "Participants" panel press "Assign", choose the
   role "Preprint Server manager", press "Search", choose Daniel Barnes
   and press "OK".
4. In the "Participants" panel press "Daniel Barnes More Actions", then
   "Edit". The "Edit Assignment" window shows one box, "Assignment
   privileges".
5. Tick "This participant is only allowed to recommend an editorial
   decision and will require an authorised editor to record editorial
   decisions." and press "OK". The window closes with "The stage
   assignment has been changed." and the row gains "Only allowed to
   recommend an editorial decision".
6. Press "Daniel Barnes More Actions", then "Edit" again. The window now
   reads "No changes can be made to this participant" under
   "Participant", above "Cancel" and "OK".
7. Press "OK".

**Expected**: a window that says no changes can be made has no "OK" to
press, and no notice claims a change.

**Observed**: "OK" can be pressed. The window closes and the notice "The
stage assignment has been changed." appears at the top right. The row
and the stored assignment are as they were after step 5, and the
submission's activity log has one more "submission.event.participantAdded"
entry ("Daniel Barnes (dbarnes) was assigned to this submission as a
Journal editor."). The save request answers 200 with `"status":true`:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/save-participant
```

To clean up after step 5 (`dbarnes` cannot untick his own box any more):
sign in as `rvaca` (Journal manager, not recommending), press "Edit" on
the same row, untick the box and press "OK". This is also the control:
`rvaca` is shown the box, and the same notice follows a change that was
saved.

## Cause

`templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl`
(pkp-lib) draws the "Edit Assignment" window. When neither box may be
changed it prints "No changes can be made to this participant"
(`stageParticipants.noOptionsToHandle`) in their place (lines 59 to 61)
and then, like every other variant of the form, ends with
`{fbvFormButtons}` (line 88): "Cancel" and a working "OK".

```smarty
{if !$isChangePermitMetadataAllowed && !$isChangeRecommendOnlyAllowed}
	{translate key="stageParticipants.noOptionsToHandle"}
{/if}
…
{fbvFormButtons}
```

"OK" posts the form to `StageParticipantGridHandler::saveParticipant()`.
On `main`, 3.5 and 3.4 `AddParticipantForm::execute()` does its part:
its edit branch writes nothing when neither flag may be changed. The
handler does not ask whether anything was written. For any save that
names an existing assignment it raises
`notification.editStageParticipant` (line 380), and it logs
`submission.event.participantAdded` (the object starts on line 386, the
key is on line 392).

The text, the "OK" under it and the unconditional notice came together
with `pkp/pkp-lib#3758`, which added editing an assignment. At the time
every row had at least one box, so the text could not show. Two later
changes made it reachable:

- `pkp/pkp-lib#8518` (2023): a section editor's own row shows no box.
- `pkp/pkp-lib#12497` (2026): a person whose own assignment is
  recommend-only is not shown "Assignment privileges" on any row. A row
  whose role has `ROLE_ID_MANAGER` (Journal manager, Journal editor,
  Production editor; Preprint Server manager) never shows "Permissions",
  so for that person it shows no box at all.

Reach:

- On `main` and 3.5 the panel offers "Edit" on a `ROLE_ID_MANAGER` row
  only to a user who holds such a role in the journal or is a site
  administrator, and never to a section editor on their own row
  (`useCurrentUser.js::canCurrentUserEditParticipant()`). So the window
  is met only by such a user who is recommend-only on the submission
  (walked: a Journal editor, Press editor and Preprint Server manager on
  their own row).
- Another person's `ROLE_ID_MANAGER` row, and a recommend-only
  Production editor or Journal manager as the person pressing "OK", go
  through the same form and handler (code, not walked).
- Before the notice, the same save also refreshes the decision-stage
  notifications and deletes the "editor assignment required" one (lines
  348 to 372), as every save does; nothing on screen came of it.
- The activity log entry is written by every "Edit Assignment" save, a
  real one included (walked: `rvaca`'s save adds one too). That is spec
  U35 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a7),
  a separate fault with its own fix; this report leaves it out.
- `notification.editStageParticipant` and
  `stageParticipants.noOptionsToHandle` have no other user in pkp-lib,
  the three apps or ui-library (searched).

## Proposed fix

A proposal: draw "OK" disabled when the form has nothing to submit, with
the `submitDisabled` parameter `fbvFormButtons` already has (the
reviewer's steps use it for a closed review: `submitDisabled=$reviewIsClosed`).
The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-changes-window-ok-reports-change/fix.diff).

```diff
--- a/lib/pkp/templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl
+++ b/lib/pkp/templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl
@@ -85,5 +85,10 @@
 			<p><span class="formRequired">{translate key="common.requiredField"}</span></p>
 		{/fbvFormArea}
 	{/if}
-	{fbvFormButtons}
+	{if $assignmentId && !$isChangePermitMetadataAllowed && !$isChangeRecommendOnlyAllowed}
+		{* Nothing can be changed: no "OK" to press *}
+		{fbvFormButtons submitDisabled=true}
+	{else}
+		{fbvFormButtons}
+	{/if}
 </form>
```

Tried on `main` on the three apps. In step 6 "OK" is greyed out and
cannot be pressed, "Cancel" closes the window, no notice shows and the
activity log gains no entry. The windows that have a box are unchanged:
the "OK" of step 5 and `rvaca`'s "OK" on the same row save and show the
notice, and "Assign" (OPS step 3) assigns with "User added as a stage
participant." The form's script re-enables a disabled submit button only
after a refused or failed submit (`FormHandler.js::enableFormControls()`),
which this window cannot reach with "OK" disabled.

**Alternatives**

- Leave "OK" out instead of disabling it: `fbvFormButtons` has
  `hideCancel` but no parameter that hides the submit button, so it
  means a new parameter in the shared form builder.
- Guard the handler: `saveParticipant()` skips the notice when the edit
  wrote nothing. `execute()` returns `[$userGroupId, $userId,
  $stageAssignmentId]` today, so it would need a fourth element saying
  whether it saved, and the team would decide whether the notification
  updates of lines 348 to 372 run for such a save. It would also cover
  a request made by hand. Without the template change, "OK" would stay
  pressable and do nothing. It could be added to the template change;
  not tried.
- Offer no "Edit" on such a row: the person would lose the text that
  tells them why, and the panel would need a copy of the form's rules.

**What goes with it**

- Backport: the template's last lines and the two variables are the
  same on `stable-3_5_0` and `stable-3_4_0`; not tried there.
- Guard: an e2e scenario in U35 (a recommend-only Journal editor opens
  "Edit" on their own row and finds "OK" disabled), a Planned item in the spec.

Small: one condition in one template, following a parameter the form
builder already has.

## Evidence

- Kept script (pkp-e2e's probe kit, on an install loaded from the
  default dataset; `<feature>` names that install's fleet file, `<id>`
  the output folder):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-changes-window-ok-reports-change/walk.js)
  takes the steps, reads the window's buttons, presses "OK" when it can
  be pressed, and then takes `rvaca`'s control, which is also the
  neighbour check of the fix. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/no-changes-window-ok-reports-change/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/no-changes-window-ok-reports-change/fix.diff ojs omp ops`,
  the same script, then `revert`.
- Where the walk differed from the Steps: the script opens the workflow
  by address (`…/dashboard/editorial?workflowSubmissionId=<id>`) instead
  of pressing "View". It also reads the `stage_assignments` rows
  (unchanged by step 7, changed by `rvaca`'s save) and counts the
  submission's `event_log` rows (one more after step 7). The activity
  log's text was read in the `event_log` row and the locale file, not on
  the "Activity Log" screen.
- Walked on `main`: OJS 4408b94def (lib/pkp f5bd392a69, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5). Walked on `stable-3_5_0`: OJS 4fca1027f4, OMP
  c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491, ui-library d4e01883),
  where the template is byte for byte the one on `main` and the handler
  raises the notice the same way: the same result on every app.
  Dataset: pkp/datasets c657990 (2026-10-01). PostgreSQL.
- Code read, 3.4 (pkp-lib `stable-3_4_0` df13621c2d): the template
  prints the text (line 63) and ends with `{fbvFormButtons}` (line
  91); `AddParticipantForm::_isChangeRecommendOnlyAllowed()` returns
  false for a current user with a recommend-only assignment on the
  stage and `_isChangePermitMetadataAllowed()` false for a `ROLE_ID_MANAGER`
  row; `execute()`'s edit branch writes only an allowed flag;
  `saveParticipant()` raises the notice for every edit (line 381). The
  participants grid there draws "Edit" for a manager on every row and
  none on a section editor's own row
  (`StageParticipantGridRow::initialize()`, `canEditParticipant()`), so
  the case is the one of `main`. Not walked.
- Code read, 3.3 (pkp-lib `stable-3_3_0` d446601ebe), for the window
  and the notice only: the template prints the text (line 63) and ends
  with `{fbvFormButtons}` (line 91); both helpers return false for a
  section editor's own row (bf4329bd44, `pkp/pkp-lib#8518`), the grid
  draws "Edit" on every row, and `saveParticipant()` raises the notice
  for every edit (line 342). So on 3.3 the window is reached by a
  section editor on their own row; the recommend-only rule of
  `pkp/pkp-lib#12497` is not there, so a `ROLE_ID_MANAGER` row always
  shows its box. The Summary's and the Cause's statements about what
  is stored are made for `main`, 3.5 and 3.4, not for 3.3. Not walked.
- Introduced: `git blame` gives 8484a16affc for the text (template
  lines 60 and 61) and, through the 2021 reformat e3f570bc37, for the
  handler's `if ($stageAssignmentId != $assignmentId) … else` notice;
  the commit is dated 2018-10-30 and was merged with
  `pkp/pkp-lib#4753` on 2019-05-21. The rules that made the text
  reachable: bf4329bd44
  (`pkp/pkp-lib#8518`, 2023-01-17) and 7ce4f2e80b (`pkp/pkp-lib#12527`
  for `pkp/pkp-lib#12497`, 2026-04-02; 75e92f8dd5 on `stable-3_5_0`,
  c1c5ce51a3 on `stable-3_4_0`).
- Upstream search (2026-10-01): pkp/pkp-lib by "No changes can be made
  to this participant", "stage assignment has been changed",
  `noOptionsToHandle`, `editStageParticipant`, `saveParticipant` and
  recommend-only with "Edit Assignment"; pkp/ojs, pkp/omp and pkp/ops by
  "No changes can be made"; pkp/ui-library by edit, assignment, participant and
  recommend.
  `pkp/pkp-lib#12497` and `pkp/pkp-lib#7238` quote the notice in their
  steps but report another fault (an editor changing their own
  recommend-only status); their comments were read. Nothing reports
  this one.
- Not driven: another person's row; a recommend-only Production editor
  or Journal manager; the fix on `stable-3_5_0`; the handler guard named
  under Alternatives.
