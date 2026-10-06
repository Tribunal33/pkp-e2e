# In "Assign Participant", the "Permissions" box stays ticked after the editor chooses another role

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP (as installed); OPS (only after a role's "Permit submission metadata edit." is switched off)
  - 3.5: OJS, OMP (as installed); OPS (only after a role's "Permit submission metadata edit." is switched off)
  - 3.4: OJS, OMP, OPS (code; OPS as above)
  - 3.3: OJS, OMP, OPS (code; OPS as above)
- **Introduced** `pkp/pkp-lib#4753` for `pkp/pkp-lib#3758` · [8484a16aff](https://github.com/pkp/pkp-lib/commit/8484a16affc13b7d0d0830c73522d53f31c542d4) · 2018-10-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found for this box (2026-10-01); `pkp/pkp-lib#11236` (closed, fixed) covers the same fault on the "Assignment privileges" box only
- **Tracked in** spec U35 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In "Assign Participant", an editor who chooses a person in a role that
starts with "Permissions" ticked, such as Section editor, and then
changes the role to one that starts without it, such as Author, sees
"Permissions" ticked for the person chosen next. The editor expects the
box to start from the new role's setting, as "Assignment privileges"
does. "OK" saves the assignment with the tick.

That person may then change the submission's title, abstract and other
publication details, although their role's "Permit submission metadata
edit." is off, until an editor unticks the box under the row's "Edit"
or removes the person with "Remove". The editor can also untick the box
before "OK".

On a preprint server the fault shows only after a manager has switched
a role's "Permit submission metadata edit." off: as installed, every
role "Assign" offers there has it on.

## Impact

- **Lost**: the second role's starting state for the box. An Author, or
  an assistant such as a Copyeditor, is assigned with a permission the
  journal's role settings withhold, and can rewrite the submission's
  details without the editor having meant to allow it.
- **Who**: an editor who, in one "Assign Participant" window, chooses a
  person, changes the role and chooses another person. The first role
  must be one whose setting is on (as installed: Section editor, Series
  editor, Moderator); the second, one whose setting is off (on a journal
  or press: Author, Guest editor, Translator and the assistant roles).
- **Way round**: untick the box, as the Summary says; or press "Cancel"
  and open "Assign" again.

Low: the assignment is made and the wrong tick is on screen, where the
editor can clear it, in a sequence few assignments take. It would be
medium if the box were saved ticked without being shown.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. The
  `stable-3_5_0` dataset takes the same steps with the same submissions,
  people and labels, in all three apps. [OMP: the
  same steps on submission 3, "The Political Economy of Workplace Injury
  in Canada", with the role "Series editor" and the author "Arthur
  Clark".]
- [OPS: the same steps on submission 1, "The influence of lactation on
  the quantity and quality of cashmere production", with the role
  "Moderator" and the author "Catherine Kwantes". A preprint server's
  Author role starts with the permission, so first, as `dbarnes`: Settings
  › Users & Roles › "Roles", the "Author" row's "Edit", untick "Permit
  submission metadata edit.", "OK".]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice".
3. In "Participants" press "Assign".
4. In the role list under "Locate a User" choose "Section editor" and
   press "Search".
5. Choose "Minoti Inoue". "Permissions" appears, ticked, as the Section
   editor role's setting says.
6. In the role list choose "Author". Both boxes disappear. Press
   "Search".
7. Choose "Alan Mwandenga".
8. Press "OK".
9. In "Participants", open the "More Actions" menu of the row "Alan
   Mwandenga", "Author", and press "Edit".

**Expected:** at step 7 "Permissions" appears unticked, since the Author
role's "Permit submission metadata edit." is off. Step 9 shows it
unticked.

**Observed:** at step 7 "Permissions" appears ticked. Step 8 saves the
assignment with the permission, and at step 9 "Edit Assignment" shows:

```
Participant
Alan Mwandenga (Author)
Permissions
[x] Allow this person to make changes to the publication, such as the title, abstract, metadata and other publication details. You may wish to revoke this privilege if the submission has received a final check and is ready for publication.
```

Control: in a window opened afresh, "Author", "Search" and "Carlo
Corino" show "Permissions" unticked.

## Cause

The window's script hides and resets both boxes when the role changes.
For "Permissions" that is
`StageParticipantNotifyHandler.prototype.updateSubmissionMetadataEditPermitOption()`
(`lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js`,
lines 315 to 318):

```js
if ($(sourceElement).prop('name') == 'userGroupId') {
    $checkbox.attr('disabled', 'disabled');
    $checkbox.removeAttr('checked');
    $checkboxDiv.hide();
```

`removeAttr('checked')` removes the HTML attribute, which only gives a
box its starting state. The box was ticked through its property
(`$checkbox.prop('checked', true)`, line 338, when a person of a role
with the permission was chosen), and the property stays. When the next
person is chosen the script shows the box again and ticks it only for a
role with the permission; for any other role it leaves the box as it
is, so the earlier tick shows, and the form posts
`canChangeMetadata=on`. `AddParticipantForm::execute()` stores what is
posted.

The neighbouring method `updateRecommendOnly()` had the same line and
the same fault. `pkp/pkp-lib#11236` fixed it there in 2025 by adding
`$checkbox.prop('checked', false);` (line 237), on every branch, and
left this method as it was.

Reach:

- "Assign Participant" on every stage: one form and one script. Checked
  on screen on a journal's and a press's Submission stage and a preprint
  server's Production stage.
- A tick the editor set by hand carries over the same way, since it also
  sets the property (read in the code).
- A manager-level role is not touched: the box stays hidden for it and
  the server always stores the permission (read in the code).
- "Edit Assignment" is not touched: its box is drawn from the stored
  assignment and has no role list.
- The "Create New Role" form (Settings › Users & Roles › "Roles") has
  the same mistake, read in the code and not walked:
  `UserGroupFormHandler.prototype.updatePermitMetadataEdit()`
  (`lib/pkp/js/controllers/grid/settings/roles/form/UserGroupFormHandler.js`,
  line 281). A manager-level "Permission level" ticks "Permit submission
  metadata edit." through its property and disables it; changing the
  level again enables the box and calls only `removeAttr('checked')`,
  so by the code it stays ticked. Only a new role can reach it: the
  form disables "Permission level" when an existing role is edited.
- The same call at lines 216, 251 and 342 of that script is harmless:
  each also disables its box, and a disabled box is not posted.

## Proposed fix

Untick the box through its property when the role changes, as the
neighbouring method does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/permissions-tick-carries-to-other-role/fix.diff)):

```diff
 		if ($(sourceElement).prop('name') == 'userGroupId') {
 			$checkbox.attr('disabled', 'disabled');
 			$checkbox.removeAttr('checked');
+			$checkbox.prop('checked', false);
 			$checkboxDiv.hide();
```

The reset belongs to this method, and the line is the one
`pkp/pkp-lib#11236` added to `updateRecommendOnly()`.

The fix is two changes per branch: this commit in pkp-lib, and in each
app's repo a commit of the compiled `js/pkp.min.js` rebuilt with
`lib/pkp/tools/buildjs.sh`, which is the file a production install
loads. `pkp/pkp-lib#11237` changed only the source file, and the apps'
bundles followed in commits of their own.

The pkp-lib change was tried on OJS, OMP and OPS `main`, which load the
uncompiled scripts: step 7 then showed "Permissions" unticked, "OK"
saved the assignment without the permission and "Edit Assignment"
showed the box unticked. The rebuilt bundle was not tried: the build
needs Java, the Closure compiler and jslint4java, which the test
machine does not have.

Two behaviours that must stay were the same with and without the fix. A
tick the editor sets by hand is kept while another person of the same
role is chosen. A Section editor (Series editor, Moderator) chosen after
an Author shows the box ticked, as that role's setting says, and is
saved with the permission.

**Alternatives**

- Set the box both ways when a person is chosen (`prop('checked',
  <role has the permission>)`): it also works, but the reset on a role
  change would stay half done and differ from its neighbour.
- Refuse the permission on the server for a role without it: wrong, the
  editor may grant it by hand.

**What goes with it**

- The lines are the same on `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`, so the diff applies there as written, each with its
  apps' rebuilt bundles.
- `updatePermitMetadataEdit()` in `UserGroupFormHandler.js` is left out
  of this fix: its fault is read in the code only, on another form. The
  same added line after its `removeAttr('checked')` would mend it, once
  it is confirmed on the "Create New Role" form.
- No data repair: an assignment stored with the permission cannot be
  told from one the editor ticked on purpose.
- Guard: an e2e scenario that chooses a person of a role with the
  permission, changes the role to one without it and reads the box (a
  Planned item in spec U35).

Medium: the change is one line, but it lands as a pkp-lib commit plus a
rebuilt bundle committed in each of the three app repos, and the bundle
is the untried half.

## Evidence

- The kept script takes the Steps, the control and the neighbour check:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/permissions-tick-carries-to-other-role/walk.js),
  with its helpers in `lib.js` beside it. On an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/permissions-tick-carries-to-other-role/walk.js`
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL,
  with the same result on all six: after step 6 the hidden box was
  still ticked; at step 7 it was shown ticked; the save posted
  `canChangeMetadata=on` and answered 200; `stage_assignments` held the
  new Author row with `can_change_metadata` 1. The fault is in the
  browser and does not depend on the database. Datasets: pkp/datasets
  c657990 (2026-10-01).
- The script reads each box's state from the page; the `[x]` in
  Observed stands for the ticked box.
- The fix was tried with `walk.js` on OJS, OMP and OPS `main`. The test
  installs load the uncompiled scripts (`enable_minified = Off`).
- Not driven: 3.4 and 3.3 (read in the code); a role other than Author
  as the second role; a tick set by hand before the role change; the
  "Create New Role" form.
- Unverified: what the Author can then change, and for how long. The
  report rests on the box's own sentence and the stored value, not on a
  sign-in as that Author.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69), OMP `main` 3b0ecf794
  (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS 4fca1027f4, OMP c7b45f88e, OPS 8eaf899468 (lib/pkp
  1fb843f491); `stable-3_4_0` OJS 9571d8fde7 (lib/pkp 30303e536a), OMP
  0aec65441, OPS acd8ae704b (lib/pkp df13621c2d); `stable-3_3_0` OJS 9fdb9bcf9a, OMP
  8e72fc883, OPS c5532e2161 (lib/pkp d446601ebe).
- Code reads:
  - `main`: `StageParticipantNotifyHandler.js` (both update methods),
    `AddParticipantFormHandler.js` (copies the role list and the chosen
    person into the form's hidden `userGroupId` and `userIdSelected` and
    fires `change`),
    `templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl`,
    `AddParticipantForm::fetch()` and `execute()`,
    `UserGroupFormHandler.js` (`changeRoleId()` and the four update
    methods), `UserGroupForm::fetch()` (`disableRoleSelect` for an
    existing role), and each app's `registry/userGroups.xml`
    (`permitMetadataEdit` on the manager-level and section-editor roles;
    on OPS also on Author).
  - 3.5: the same script lines 315 to 318 and 338.
  - 3.4 and 3.3: the same script lines, at both of 3.4's lib/pkp
    pointers; the template's
    `canChangeMetadata` box; `AddParticipantForm::execute()` storing
    `(bool) $this->getData('canChangeMetadata')`.
  - The trace: `git blame` on line 317 gives 08acc64855 (2019-08-12, "JS
    linting"), which only re-indented; 8484a16aff wrote the method with
    `removeAttr('checked')` and no property reset. It is first tagged in
    3.2.0. Its message names only `pkp/pkp-lib#3758`; GitHub's
    `branch_commits` page for the commit names pull request 4753, whose
    title carries #3758 and whose author is defstat. 1ddf6c300f (2025-05-03, `pkp/pkp-lib#11237`) added the
    property reset to `updateRecommendOnly()` alone; its backports are
    on the three stable branches.
- Upstream searches (2026-10-01): pkp/pkp-lib by canChangeMetadata
  participant, permissions checkbox assign participant role, "Assign
  Participant" permissions ticked role, permitMetadataEdit assign
  participant checkbox, `StageParticipantNotifyHandler` and
  `updateSubmissionMetadataEditPermitOption`; pkp/ojs and pkp/ui-library
  by assign participant permissions checkbox. The hits were
  `pkp/pkp-lib#11236` (above; its steps and its fix name only the
  recommend-only box) and other subjects (`pkp/pkp-lib#3758`,
  `pkp/pkp-lib#7238`, `pkp/pkp-lib#10742`, `pkp/pkp-lib#12826`).
