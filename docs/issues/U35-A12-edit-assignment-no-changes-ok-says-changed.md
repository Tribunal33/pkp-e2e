# A recommend-only editor's "Edit Assignment" says no changes can be made, yet "OK" reports a change

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (released in 3.5.0-4 and 3.5.0-5)
  - 3.4: OJS, OMP, OPS (code; released in 3.4.0-11)
  - 3.3: none (code; a recommend-only Editor is still shown the box there)
- **Introduced** `pkp/pkp-lib#12527` for `pkp/pkp-lib#12497` · [7ce4f2e80b](https://github.com/pkp/pkp-lib/commit/7ce4f2e80b42bef81caf473a325e3064bdd78725) · 2026-04-02 (merged 2026-04-10) · Vitaliy (Vitaliy-1); on 3.5 and 3.4 its backports `pkp/pkp-lib#12525` and `pkp/pkp-lib#12503`
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An Editor who has been made recommend-only on a submission opens "Edit"
on their own Participants row. The window says "No changes can be made
to this participant", yet its "OK", the only button besides "Cancel",
closes it with the notice "The stage assignment has been changed.".
Before April 2026 the same window showed the "Assignment privileges"
box, and "OK" saved it.

Nothing is saved, so nothing is lost, but the editor is told that
something changed. "Cancel" avoids the notice. The fix is a change to
one template.

It happens on any participant row whose role is a manager-level one
(Journal or Press editor, Production editor, Preprint Server manager),
and only for an editor in such a role who is recommend-only on that
submission. A recommend-only Section editor is not offered "Edit" on
these rows.

## Impact

- **Lost:** nothing; the assignment stays as it was.
- **Who:** an Editor, Production editor or Preprint Server manager made
  recommend-only on a submission, each time they press "OK" in "Edit"
  on a manager-level row, their own included. No role carries the
  limit by default, so it exists only where a manager set it on that
  submission.
- **Way round:** "Cancel" or the window's close control.

Low: a notice misleads while nothing is lost.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission (ID, title) and Daniel Barnes's role on it:
- OJS: 4, "Computer Skill Requirements for New and Existing Teachers:
  Implications for Policy and Practice"; "Journal editor".
- OMP: 6, "The Information Literacy User’s Guide"; "Press editor".
- OPS: 1, "The influence of lactation on the quantity and quality of
  cashmere production"; not assigned (step 2 assigns him as "Preprint
  Server manager").

Making Daniel Barnes recommend-only on the submission:

1. Sign in as `rvaca` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. In "Participants", open "Daniel Barnes"'s "More Actions" menu,
   choose "Edit", tick the "Assignment privileges" box ("This
   participant is only allowed to recommend an editorial decision and
   will require an authorised editor to record editorial decisions.")
   and press "OK". [OPS: press "Assign", choose the role "Preprint
   Server manager", search "Barnes", choose "Daniel Barnes", tick the
   "Assignment privileges" box and press "OK".] His row now reads "Only
   allowed to recommend an editorial decision".
3. Sign out.

The window that can change nothing:

4. Sign in as `dbarnes` and open the same workflow.
5. In "Participants", open "Daniel Barnes"'s "More Actions" menu and
   choose "Edit".
6. Press "OK".

**Expected:** the "Edit Assignment" window of step 5 reads
"Participant", "Daniel Barnes (Journal editor)" and "No changes can be
made to this participant", and offers no "OK" that saves; "Cancel"
closes it, and no notice says the assignment changed.

**Observed:** step 5 shows the window as expected, with an active "OK"
beside "Cancel":

```
Participant
Daniel Barnes (Journal editor)
No changes can be made to this participant
Cancel  OK
```

("Press editor" on OMP, "Preprint Server manager" on OPS). Step 6
closes the window, and a notice at the top right reads "The stage
assignment has been changed.". The row still reads "Only allowed to
recommend an editorial decision", and the assignment is unchanged.

Control: as `dbarnes`, "Edit" on the author's row (Craig Montgomerie;
Deborah Bernnard on OMP, Carlo Corino on OPS) shows the "Permissions"
box, and "OK" saves the change with the same notice, as it should.

## Cause

`templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl`
(pkp-lib) shows, on its edit branch, a box for each limit the signed-in
user may change. When there is none, it shows the sentence
`stageParticipants.noOptionsToHandle` "No changes can be made to this
participant" instead. The buttons below are the same in every case:
`{fbvFormButtons}`, "Cancel" and an active "OK".

"OK" posts to `StageParticipantGridHandler::saveParticipant()`.
`AddParticipantForm::execute()` correctly saves nothing when neither
limit may change. The handler then raises its success notice on every
edit, without asking whether anything was saved:

```php
if ($stageAssignmentId != $assignmentId) { // New assignment added
    ... __('notification.addedStageParticipant') ...
} else {
    ... __('notification.editStageParticipant') ...
}
```

The "OK" has sat under the no-options sentence since the sentence was
added in 2018 (8484a16aff, `pkp/pkp-lib#4753`). At that time no row
that offered "Edit" reached the sentence.

`pkp/pkp-lib#12527` changed that. Its aim (`pkp/pkp-lib#12497`) was that
a recommend-only editor cannot lift a limit, so it made
`AddParticipantForm::_isChangeRecommendOnlyAllowed()` return false for
anyone who is recommend-only on the stage. A manager-level row never
has a "Permissions" box (`_isChangePermitMetadataAllowed()` is false for
`ROLE_ID_MANAGER` groups). So, for a recommend-only editor, such a row
now has nothing to change.

"Edit" is still offered to that editor. In ui-library
(`useParticipantManagerConfig.js`) the item appears when two checks
hold. `canAdminister` needs a Manager, Site admin or sub-editor
(Section or Guest editor) role among the user's roles on that stage; a Manager who is not assigned
counts too. `useCurrentUser::canCurrentUserEditParticipant()` is true on
every row for anyone with a Manager role in the context. A
recommend-only Editor is assigned to the stage in a Manager role, so
both hold on every row. The server's `Validation::canEditParticipant()`
agrees.

Reach:
- The same "OK" also writes "Daniel Barnes (dbarnes) was assigned to
  this submission as a Journal editor." to the Activity Log, as every
  "Edit" › "OK" does. That is U35
  [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a7),
  a separate report (read in the code).
- A Section editor's own row is the only other row with nothing to
  change. It offers no "Edit" on `main` and 3.5
  (`canCurrentUserEditParticipant()`) or on 3.4
  (`Validation::canEditParticipant()` on the grid row), so this is the
  only path (read in the code).
- No other legacy form in pkp-lib shows a "nothing to change" sentence
  (`grep` of the templates and the English locale).

## Proposed fix

Disable "OK" when the window offers nothing to change
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-no-changes-ok-says-changed/fix.diff)),
in `addParticipantForm.tpl`, where the sentence is already decided:

```diff
 			{if !$isChangePermitMetadataAllowed && !$isChangeRecommendOnlyAllowed}
+				{assign var="noOptionsToHandle" value=true}
 				{translate key="stageParticipants.noOptionsToHandle"}
 			{/if}
 ...
-	{fbvFormButtons}
+	{fbvFormButtons submitDisabled=$noOptionsToHandle|default:false}
```

`submitDisabled` is how the reviewer's forms turn "OK" off when there is
nothing to submit (`reviewer/review/step1.tpl` to `step3.tpl`,
`submitDisabled=$reviewIsClosed`). The form handler re-enables its
submit buttons only after a submit or a failed field check. This window
has no field to check, so "OK" stays disabled. The "Assign" window and
an "Edit" with a box are untouched.

Tried on `main`, all three apps: the Steps' window now shows "OK"
disabled, and "Cancel" closes it with no notice. `rvaca`'s "Edit" and
OPS's "Assign" in steps 1–2, and `dbarnes`'s "Edit" on the author's row,
still save with an active "OK".

**Alternatives:**
- Pass the flag from `AddParticipantForm::fetch()`, next to the two
  `_isChange…Allowed()` results it already assigns: equally sound. The
  template `{assign}` was chosen because the template already makes the
  one decision (show the sentence), and setting the flag there keeps
  the sentence and the disabled "OK" from ever disagreeing.
- Raise the notice in `saveParticipant()` only when `execute()` saved
  something: the false notice goes, but the window still offers an "OK"
  that does nothing. Worth adding alongside if the team wants the
  server honest to any caller; U35 A7's fix already compares the limits
  before and after for the log line.
- Stop offering "Edit" where nothing can change, in
  `canCurrentUserEditParticipant()` (ui-library) and
  `Validation::canEditParticipant()`: two repositories, and the rule of
  which limits a user may change would live in three places instead of
  one.

**What goes with it:**
- No data repair: this path never saved anything wrong.
- Backport: the template is the same on `stable-3_5_0` and
  `stable-3_4_0`, so the diff applies as written; 3.3 does not need it.
- Guard: a test that a no-options "Edit Assignment" form renders its
  "OK" disabled.

Small: two lines in one shared template, tried.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-no-changes-ok-says-changed/walk.js)
  takes the Steps on the three apps, then the control on the author's
  row, and reads the submission's `stage_assignments` before and after:
  `node bin/probe.js all shared/playwright/checks/issues/edit-assignment-no-changes-ok-says-changed/walk.js`
  on an install freshly reset to the default dataset. The fix was
  walked with the same script.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). Nothing in the fault depends on the database.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`,
  OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), ui-library `280f98c5`;
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`, ui-library `1a7a4750`); lib/pkp `stable-3_4_0`
  `df13621c2d`, `stable-3_3_0` `d446601ebe`; OJS `stable-3_4_0`
  `9571d8fde7`, `stable-3_3_0` `9fdb9bcf9a`; OMP `0aec65441`,
  `8e72fc883`; OPS `acd8ae704b`, `c5532e2161`.
- 3.5, walked: the same window and notice on the three apps. Code: the
  same template and handler, with the backport 75e92f8dd5
  (`pkp/pkp-lib#12525`). It is in the lib/pkp tags `3_5_0-4`
  (2026-04-10) and `3_5_0-5`, and the OJS, OMP and OPS `3_5_0-4` tags
  point lib/pkp at a commit containing it.
- 3.4 (code): lib/pkp `stable-3_4_0` has the same template and the same
  edit notice. Its `_isChangeRecommendOnlyAllowed()` refuses a
  recommend-only user (c1c5ce51a3, `pkp/pkp-lib#12503`), and
  `StageParticipantGridRow` offers "Edit" whenever
  `Validation::canEditParticipant()` holds, which is always for a
  Manager. c1c5ce51a3 is in the lib/pkp tag `3_4_0-11`, and the OJS,
  OMP and OPS `3_4_0-11` tags point lib/pkp at a commit containing it.
  OMP and OPS share lib/pkp on each branch.
- 3.3 (code): `_isChangeRecommendOnlyAllowed()` has no check of the
  signed-in user's own recommend-only assignment, so a recommend-only
  Editor's window on a manager-level row shows the "Assignment
  privileges" box, and the Steps' window does not appear.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by "No changes can be made to this participant", "stage
  assignment has been changed", "recommend only" with "edit", and by
  `noOptionsToHandle`, `saveParticipant`, `editStageParticipant`.
  `pkp/pkp-lib#12497` is the issue the introducing change fixed; its QA
  comment asks what a section editor now sees on their own row, but no
  issue reports this notice. `pkp/pkp-lib#7238` is an older, fixed
  report about who may change the limit.
- Not driven: 3.4 and 3.3 (code only); another Editor's or a Production
  editor's row as the edited row, which takes the same code path as the
  editor's own row.
