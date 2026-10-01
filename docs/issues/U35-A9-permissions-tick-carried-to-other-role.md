# "Assign Participant" keeps the "Permissions" tick of the first role chosen, and saves it for another role

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (OPS once a role's metadata setting is off)
  - 3.5: OJS, OMP, OPS (OPS once a role's metadata setting is off)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4753` for `pkp/pkp-lib#3758` · [8484a16aff](https://github.com/pkp/pkp-lib/commit/8484a16affc13b7d0d0830c73522d53f31c542d4) · 2018-10-30 · Dimitris Efstathiou (defstat)
- **Upstream** `pkp/pkp-lib#11236` (closed with a fix for the "Assignment privileges" box only; the "Permissions" box beside it was left as it was)
- **Tracked in** spec U35 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

In "Assign Participant", the two boxes disappear when the editor
chooses another role and come back once a person is chosen under the
new role. "Assignment privileges" comes back unticked, but
"Permissions" comes back as it was. A tick it had, from the first
role's default or added by hand, is still there, and "OK" saves it for
the new role. For example, an editor who first chose a Section editor
and then switched to Author sees the Author's box ticked, although the
Author role does not give the permission, and the Author is assigned
with it.

An Author given the tick can then change the title, abstract and
other metadata of the versions not yet published or scheduled, which
the role's own setting withholds. Nothing marks the tick as carried
over: it looks like the new role's default.

At install, the roles that tick the box are Section editor (Series
editor on a press, Moderator on a preprint server). On a journal or
press, Guest editor, the assistant roles (Copyeditor, Layout Editor,
Proofreader and others), Author and Translator do not tick it, nor do
Volume editor and Chapter Author on a press. On a preprint server every
role offered ticks it, so only a server that has switched a role's
setting off is affected.

## Impact

- **What goes wrong:** the assignment is saved with a permission that
  the journal's Roles setting withholds for that role.
- **Who:** editors and managers assigning a participant on any stage
  who change the role while a "Permissions" box is ticked, then choose
  a person under a role without the permission.
- **Way round:** untick the box before "OK", or later in the row's
  "Edit"; nothing prompts the editor to.

Medium: the assignment carries a permission the role does not carry,
which the editor never chose and nothing points out; the only sign is a
tick that looks like the role's own default. It would be low if the
carried tick granted nothing.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.
- OPS only: on a preprint server the Author role has "Permit submission
  metadata edit." on by default, so switch it off first. Sign in as
  `dbarnes`, open Settings › Users & Roles › "Roles", press the arrow
  beside the "Author" row, then "Edit", untick "Permit submission
  metadata edit." and press "OK".
- Submissions used: OJS 4, "Computer Skill Requirements for New and
  Existing Teachers: Implications for Policy and Practice" (Submission);
  OMP 8, "Editorial" (Submission); OPS 1, "The influence of lactation on
  the quantity and quality of cashmere production" (Production).

1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`.
2. In "Participants", press "Assign".
3. In the role list choose "Section editor" (OMP "Series editor", OPS
   "Moderator") and press "Search".
4. Choose "Minoti Inoue". "Permissions" appears, ticked, because the
   Section editor role gives the permission.
5. In the role list choose "Author". Both boxes disappear.
6. Type "Corino" (OMP "Clark", OPS "Kwantes") in "Search User By Name"
   and press "Search".
7. Choose "Carlo Corino" (OMP "Arthur Clark", OPS "Catherine Kwantes").
8. Press "OK".
9. In "Participants", open the new row's "More Actions" and choose
   "Edit".

**Expected:** at step 7, "Permissions" appears unticked, since the
Author role does not give the permission. At step 9, "Edit Assignment"
shows it unticked.

**Observed:** at step 7, "Permissions" appears ticked:

```
Permissions
[x] Allow this person to make changes to the publication, such as the title, abstract, metadata and other publication details. You may wish to revoke this privilege if the submission has received a final check and is ready for publication.
```

"OK" closes the window with "User added as a stage participant.", and
the Author's assignment is stored with the permission
(`stage_assignments.can_change_metadata = 1`). At step 9, "Edit
Assignment" shows "Permissions" ticked.

Control: choosing "Author" first, without steps 3 and 4, shows
"Permissions" unticked.

## Cause

`StageParticipantNotifyHandler.prototype.updateSubmissionMetadataEditPermitOption()`
in `lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js`
(lines 314–318) runs when the hidden `userGroupId` input changes:
`AddParticipantFormHandler.addUserGroupId()` copies the role list into it
and triggers the change on every role chosen and on every "Search". It disables the box, calls
`$checkbox.removeAttr('checked')` and hides it. With jQuery 3 (the
apps ship 3.7.1; pkp-lib required `3.*` already when the method was
written), `removeAttr('checked')` only removes the HTML attribute. It
does not clear the box's `checked` property, which the browser keeps
once a script or a click has set it. So a box ticked under the first
role, by its default or by hand, stays ticked while hidden.

When a person is chosen next, the same method shows the box again and
ticks it when the new role is in `permitMetadataEditUserGroupIds_`. It
never unticks it otherwise, so it shows the stale tick. The form then
posts `canChangeMetadata`, and `AddParticipantForm::execute()` stores
it as the editor's choice.

The sibling method `updateRecommendOnly()` had the same fault for
"Assignment privileges". It was fixed by adding
`$checkbox.prop('checked', false)` (`pkp/pkp-lib#11236`,
[1ddf6c300f](https://github.com/pkp/pkp-lib/commit/1ddf6c300fd34bf3b926c0a19139bde309ec774f),
2025-05-03), but the metadata method was left out.

Reach:

- A new "Search" hides both boxes the same way (seen on screen). Unfixed,
  a hand tick given before it comes back for the next person. Choosing
  another person from the list already shown does not hide the boxes and
  keeps the tick, as it should (seen on screen, all three apps).
- Any change of role carries a ticked box over: from Section editor
  (Series editor, Moderator) by its default, or from any role by a hand
  tick, to a role without the permission. Journal editor, Production
  editor and the manager roles never show the box (they are in
  `notChangeMetadataEditPermissionRoles_`), so they carry nothing.
- "Edit Assignment" uses the same form, but its role cannot change, so
  it is not affected (checked in the code).
- `lib/pkp/js/controllers/grid/settings/roles/form/UserGroupFormHandler.js`
  (Settings › Roles, a role's form) uses the same
  `removeAttr('checked')` to untick boxes. In `updatePermitSelfRegistration()`,
  `updatePermitSettings()` and `updateRecommendOnly()` the box is
  disabled at the same time, and a disabled box is not posted, so
  nothing wrong is saved. In `updatePermitMetadataEdit()`, choosing a
  manager-level role ticks "Permit submission metadata edit." and
  choosing another role afterwards leaves it enabled and still ticked.
  The manager can see that tick and untick it before saving. Checked in
  the code, not walked.

## Proposed fix

Untick the box when the role changes, as `updateRecommendOnly()` already
does ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/permissions-tick-carried-to-other-role/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js
+++ b/lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js
@@ -315,6 +315,7 @@
 		if ($(sourceElement).prop('name') == 'userGroupId') {
 			$checkbox.attr('disabled', 'disabled');
 			$checkbox.removeAttr('checked');
+			$checkbox.prop('checked', false);
 			$checkboxDiv.hide();
 		} else if ($(sourceElement).prop('name') == 'userIdSelected' &&
 				!$checkboxDiv.is(':visible')) {
```

Clearing the property where the box is hidden follows the pattern
`pkp/pkp-lib#11236` set for the box beside it, and it keeps what
`pkp/pkp-lib#3758` intended: the box hides when the role changes and
comes back at the new role's default once a person is chosen.

Tried on `main`, all three apps. The Steps then show "Permissions"
unticked at step 7, and the Author is saved without the permission.
The neighbour check showed what the fix leaves alone: the first
person's box at the role's default, a hand tick kept when another
person is chosen from the same list, and an Author-then-Section-editor
switch showing the editor's tick and saving it. It also showed one
change beyond the role switch: after a new "Search" in the same role, a
hand tick is dropped and the next person's box shows the role's
default. "Assignment privileges" already behaves that way.

**Alternatives:**
- Set the box to the role's default every time it is shown
  (`$checkbox.prop('checked', <role in permitMetadataEditUserGroupIds_>)`
  in the show branch). The result is the same, but it restructures the
  loop and departs from the sibling's fix.
- Check on the server that `canChangeMetadata` matches the role's
  default. Not right: the box is the editor's choice, which may differ
  from the default on purpose.

**What goes with it:**
- No API, hook or stored data changes. Assignments already saved with a
  carried-over tick cannot be found, so no repair is possible; the row's
  "Edit" unticks one.
- Backport: the same lines are in `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`, and the diff applies to them as written.
- `UserGroupFormHandler.updatePermitMetadataEdit()` could take the same
  one line where it unticks on a role change. It is left out of this fix
  because it is another screen and was not walked.
- Guard: an e2e scenario in the U35 spec (a **Planned** item) that
  chooses Section editor, then Author, and checks that "Permissions"
  follows the Author role's default and is saved so. The legacy
  handlers have no JavaScript unit tests.

Small: one line, with no API or data change.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/permissions-tick-carried-to-other-role/walk.js)
  takes the Steps on OJS, OMP and OPS on an install freshly reset to the
  default dataset. It records "Permissions" (shown, ticked) at each step,
  the stored `can_change_metadata` and the "Edit Assignment" box:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/permissions-tick-carried-to-other-role/walk.js`.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/permissions-tick-carried-to-other-role/neighbour.js)
  checks the paths the fix must leave alone (the role's default for a
  first person, a hand tick kept within one list, an Author to Section
  editor switch), run with the fix in and out.
- Fix tried with `node bin/try-fix.js apply shared/playwright/checks/issues/permissions-tick-carried-to-other-role/fix.diff ojs omp ops`,
  then walk.js and neighbour.js, then `node bin/try-fix.js revert ojs omp ops`.
  No request failed and no script error was recorded in any run.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30).
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`; the handler is the same in
  both lib/pkp commits); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`); `stable-3_4_0`
  OJS `9571d8fde7`, OMP `0aec65441f`, OPS `acd8ae704b` (lib/pkp
  `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`, OMP `8e72fc8836`, OPS
  `c5532e2161` (lib/pkp `d446601ebe`).
- 3.5: its `StageParticipantNotifyHandler.js` has the same lines 314–318
  as `main`'s.
- 3.4 and 3.3 (code): lib/pkp's `StageParticipantNotifyHandler.js` on
  both branches has `removeAttr('checked')` alone in the metadata
  method (lines 314–318) and the `#11236` line in the recommend-only
  method. `addParticipantForm.tpl` attaches this handler,
  `AddParticipantForm` (`.inc.php` on 3.3) passes
  `permitMetadataEditUserGroupIds`, and `composer.json` pins
  `components/jquery` 3.7.1.
- Introduced: `git blame` on lines 314–318 gives `08acc64855` (2019,
  "JS linting", a reformat). Before it, `git log -S
  updateSubmissionMetadataEditPermitOption` gives `8484a16aff`, which
  added the method with `removeAttr('checked')` alone, through PR
  `pkp/pkp-lib#4753`.
- Upstream searched (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library, by symptom words ("Assign Participant"
  permissions, metadata edit permission role) and by
  `StageParticipantNotifyHandler`, `updateSubmissionMetadataEditPermitOption`,
  `canChangeMetadata` and `removeAttr checked`. `pkp/pkp-lib#11236` is the
  same fault on the "Assignment privileges" box and was fixed for that
  box alone. `pkp/pkp-lib#10034` (a missing tick for editors under
  some PHP settings) is a different fault.
- Roles without the permission: `registry/userGroups.xml` of each app
  (`permitMetadataEdit="true"` only on the manager, editor,
  production-editor and section-editor groups of OJS and OMP, and on the
  manager, section-editor and author groups of OPS). What the permission
  allows: `Repo::submission()->canEditPublication()`, behind
  `PublicationCanBeEditedPolicy`, which refuses an Author a published or
  scheduled version. What it allows an assistant role on a published
  version was not checked.
- Not driven: role pairs other than Section editor to Author, and a hand
  tick carried over a role change (code only: the same handler path as
  the new "Search", which was driven).
