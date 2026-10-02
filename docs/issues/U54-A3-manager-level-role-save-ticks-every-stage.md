# Saving the "Production editor" role, even unchanged, opens Submission and Review to its assigned members

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3018` for `pkp/pkp-lib#2849` · [60858b8df8](https://github.com/pkp/pkp-lib/commit/60858b8df8161876cb774fa425e9c94518557927) · 2017-11-04 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found for this fault (2026-10-02); `pkp/pkp-lib#10387` (closed, deferred; PRs `pkp/pkp-lib#11731` and `pkp/pkp-lib#12040` open on `stable-3_5_0`) discusses whether an assigned Production editor should be held to its stages at all
- **Tracked in** spec U54 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When a manager presses "OK" in the window of a role whose permission
level is Journal Manager (Press Manager), the role is given every
workflow stage, even when nothing in the window was changed. As
installed this hits "Production editor", which works in Copyediting and
Production only. After the save, its row on the "Roles" list reads every
stage ticked.

A person assigned to a submission as Production editor was refused that
submission's Submission and Review stages until then. After the save
they open both: the submission's files, the review files, the
reviewers' names in a double-anonymous round, and "Add Reviewer".

The only message is "Your changes have been saved.". The row's stage
boxes are greyed out for this level, so no screen can give the role its
two stages back.

## Impact

- **Lost**: the stage limits the journal set for the role, silently and
  for good.
- **Who**: any manager who presses "OK" in the "Production editor"
  window, and every person assigned in that role. No other
  role is hit as installed: "Journal manager" holds no stage, but its
  row normally has no "Edit", and a role created at this level starts
  with every stage.
- **Way round**: none on screen; a database fix is under Proposed fix.

Medium: the person gains the editor's view of stages the journal kept
them out of, without anyone being told. This holds only on submissions
where they are assigned as Production editor, because on every other
submission a manager-level person already opens every stage
(`pkp/pkp-lib#10387`). It would be high if pkp kept Production editors
to their stages on every submission, since one save would then undo that
limit everywhere.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Its
  "Production editor" role (permission level Journal Manager) works in
  Copyediting and Production only. The `stable-3_5_0` dataset takes the
  same steps.
- [OMP: the same steps; the press's stage columns are Submission,
  Internal Review, External Review, Copyediting and Production. Part A
  uses submission 3, "The Political Economy of Workplace Injury in
  Canada", and part B submission 13, "Mobile Learning: Transforming the
  Delivery of Education and Training" (Copyediting stage), with
  "Administration › Hosted Presses".]

**A. The role's stages**

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (Submission stage).
   In "Participants" press "Assign" and open the role list. Press
   "Cancel".
3. Go to Settings › Users & Roles and open the "Roles" tab. Look at the
   "Production editor" row.
4. Press the row's "Settings" arrow, then "Edit".
5. Change nothing and press "OK".
6. Look at the "Production editor" row again, and once more after
   reloading the page.
7. Open submission 4 again, press "Assign" and open the role list.

**Expected:** at step 6 the row is unchanged, and at step 7 the role
list still leaves out "Production editor", as at step 2.

**Observed:** at step 2 the role list reads "Journal editor", "Section
editor", "Guest editor", "Funding coordinator", "Author", "Translator".
At step 3 the row has Copyediting and Production ticked, every box
greyed out. The window at step 4 shows no "Stage Assignment". Step 5
closes it with "Your changes have been saved.". At step 6 the row has
Submission, Review, Copyediting and Production ticked, on the page and
after the reload. At step 7 the role list reads "Journal editor",
"Production editor", "Section editor", "Guest editor", "Funding
coordinator", "Author", "Translator".

[OMP: the row goes from Copyediting and Production to all five stages,
and the role list goes from "Press editor", "Series editor", "Funding
coordinator", "Author", "Translator", "Volume editor" to the same with
"Production editor" after "Press editor".]

Control: in the "Copyeditor" window, which shows "Stage Assignment",
ticking "Production" and pressing "OK" stores Copyediting and Production,
as ticked.

**B. What an assigned Production editor opens** (on a freshly loaded
dataset)

1. Sign in as `admin` (password `admin`). Go to Administration ›
   Hosted Journals, press the arrow of the "publicknowledge" row, then
   "Settings wizard", and open the "Users" tab. Search for `svogt`, and
   in the "Sarah Vogt" row press "Edit User". Tick "Production editor"
   under the roles and press "OK".
2. Sign in as `dbarnes`. Open submission 5, "Genetic transformation of
   forest trees" (Production stage). In "Participants" press "Assign",
   choose "Production editor", press "Search", choose "Sarah Vogt" and
   press "OK".
3. Sign in as `svogt` (password `svogtsvogt`). Open submission 5 and, in
   the workflow menu, choose "Submission", then "Review Round 1".
4. Sign in as `dbarnes`. In Settings › Users & Roles › "Roles", press
   "Edit" on the "Production editor" row and press "OK" without changing
   anything.
5. Sign in as `svogt` and repeat step 3.

**Expected:** step 5 shows what step 3 shows.

**Observed:** at step 3 both stages read "You don't currently have
access to that stage of the workflow.". At step 5 "Submission" shows
the submission's files and "Download All Files". "Review Round 1" shows
"Files for Review" with "Upload/Select Files", "Add Reviewer" and the
reviewers:

```
Paul Hudson     Request Sent   Anonymous Reviewer/Anonymous Author
Adela Gallego   Request Sent   Anonymous Reviewer/Anonymous Author
```

[OMP: at step 3 "Submission" and both "Review Round 1" entries
(Internal Review, External Review) are refused the same way. At step 5
all three open. The External Review round lists "Al Zacharia" (Request
Sent), and "Adela Gallego" and "Gonzalo Favio" ("Reviewer Thanked",
their reviews done, each with "Revert Decision"), all "Anonymous
Reviewer/Anonymous Author".]

## Cause

`UserGroupForm::execute()`
(`lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php`,
lines 317 to 320) replaces the stages of every manager-level group with
the full list, on every save:

```php
// Always set all stages active for some permission levels.
if (in_array($userGroup->roleId, $roleDao->getAlwaysActiveStages())) {
    $assignedStages = array_keys(WorkflowStageDAO::getWorkflowStageTranslationKeys());
}
```

`RoleDAO::getAlwaysActiveStages()` is `[Role::ROLE_ID_MANAGER]`, and
`_assignStagesToUserGroup()` deletes the group's stages and writes these
back. The window has nothing to say about stages for this level.
`RoleDAO::getForbiddenStages()` forbids every stage to it, so
`UserGroupFormHandler.updateStageOptions()` disables and hides every
stage box, and the post carries no `assignedStages[]`.

The line came with `pkp/pkp-lib#3018` for `pkp/pkp-lib#2849` (2017). At
that time a manager-level member reached every stage whatever their
group held, so locking a manager-level role's stages all ticked changed
nobody's access. `pkp/pkp-lib#9131` (2023, Vitalii Bezsheiko; on `main`
and backported to 3.5, 3.4 and 3.3) changed that.
`Repo::user()->getAccessibleWorkflowStages()` now gives a member
assigned to a submission only the stages of the groups they are
assigned in, and falls back to every stage only when they hold no
assignment there. Since then the stages the registry installs for
"Production editor" (`registry/userGroups.xml`) are what keeps an
assigned Production editor out of Submission and Review. The pkp-lib
team calls that limit intentional in `pkp/pkp-lib#10387`. The save
erases it.

Reach:

- "Assign Participant" lists the roles that hold the stage
  (`AddParticipantForm::fetch()` → `Repo::userGroup()->getUserGroupsByStage()`).
  Walked: the role is then offered on the Submission stage.
- A section's (series', category's) "Editorial Assignments" offers the
  groups holding the first stage (`PKPSectionForm::fetch()`,
  `CategoryForm`). The decisions and the editor-assignment
  notifications pick assigned people by stage (`DecisionAllowedPolicy`,
  `EditorAssignmentNotificationManager`). Read in the code.
- On `main` the registry also gives these roles the "Done" stage (6),
  since `pkp/pkp-lib#13109`. The filtered list from
  `getWorkflowStageTranslationKeys()` leaves that stage out, so the save
  drops it: "Production editor" went from stages 4, 5, 6 to 1, 3, 4, 5.
  Stage 6 is read by `Application::getValidStages()` in
  `WorkflowStageRequiredPolicy`, by `Schema::getPropertyStages()` and by
  `DecisionAllowedPolicy`'s fallback for a Done submission. After `rvaca`
  saved "Journal editor" (1, 3, 4, 5, 6 to 1, 3, 4, 5), `dbarnes` saw
  the same workflow on published submission 1 and the same "Published"
  list as before.
- "Journal manager" holds no stage, and a save of its window would give
  it every stage. Its row is normally the first of the Roles list, and
  the first row has no "Edit"
  ([A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a1)).
  Read in the code.
- A preprint server has one stage, which every manager-level role
  already holds, so nothing changes there. Read in the code.

## Proposed fix

Let a save of an existing manager-level group keep the stages it has,
and give every stage only to a new one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/fix.diff)):

```diff
-        // Always set all stages active for some permission levels.
+        // The form offers no stage for some permission levels: a new user group
+        // gets every stage, an existing one keeps the stages it has.
         if (in_array($userGroup->roleId, $roleDao->getAlwaysActiveStages())) {
-            $assignedStages = array_keys(WorkflowStageDAO::getWorkflowStageTranslationKeys());
+            $assignedStages = $this->getUserGroupId() == null
+                ? array_keys(WorkflowStageDAO::getWorkflowStageTranslationKeys())
+                : null;
         }
```

`if ($assignedStages)` below already skips the stage write when there
is nothing to write. A new manager-level role still gets every stage,
as `pkp/pkp-lib#3018` meant.

Tried on OJS and OMP `main` with both parts of the Steps. The row kept
Copyediting and Production, "Assign" on the Submission stage still left
out "Production editor", and the assigned Production editor was still
refused Submission and Review after the save. Two other saves came out
the same with and without the fix. In the "Copyeditor" window, the
stage ticked was still stored. A new role created at the manager level
still got every stage.

**Alternatives**

- Show "Stage Assignment" for manager-level roles and save what is
  ticked. This would undo the lock `pkp/pkp-lib#2849` asked for, so it
  is a product decision.
- Post the stored stages from the window as hidden fields. The rule
  would then live in the browser, and any other client would still
  reset the stages.

**What goes with it**

- No data repair is proposed. The database cannot tell a role widened
  by this save from one whose journal has since relied on the wider
  stages. Narrowing it by upgrade would cut assigned people off in the
  middle of their submissions without the journal's say. A journal
  that wants its limits back can list its manager-level roles and their
  stages, then delete the rows it did not mean (OJS stage ids: 1
  Submission, 3 Review; OMP also 2 Internal Review):

  ```sql
  SELECT ug.user_group_id, ugs.setting_value AS name, us.stage_id
  FROM user_groups ug
  JOIN user_group_settings ugs ON ugs.user_group_id = ug.user_group_id
      AND ugs.setting_name = 'name' AND ugs.locale = 'en'
  LEFT JOIN user_group_stage us ON us.user_group_id = ug.user_group_id
  WHERE ug.role_id = 16
  ORDER BY ug.user_group_id, us.stage_id;

  DELETE FROM user_group_stage WHERE user_group_id = <id> AND stage_id IN (1, 2, 3);
  ```
- Left out: on `main` a new role, at any level, never gets the "Done"
  stage. The create path and the "Stage Assignment" boxes both use the
  list without it. That gap belongs to `pkp/pkp-lib#13109` and has a
  different fix.
- Backport: `stable-3_5_0` has the same block at lines 291 to 294, and
  the diff applies there with an offset. `stable-3_4_0` has it at lines
  246 to 249, with `$userGroup->getRoleId()`. `stable-3_3_0` has it as a
  one-line `if (...) $assignedStages = ...;` at line 218. The same
  change fits both.
- Guard: an e2e scenario that saves the "Production editor" window and
  reads its row (a Planned item in spec U54).

Small: a few lines in one form, with no data repair and no change to
what other callers rely on.

## Evidence

- The kept scripts, with their helpers in `lib.js` beside them, run on
  an install freshly loaded from the default dataset:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/walk.js):
    Steps part A, the control, and the neighbour check (a role created
    at the manager level).
  - [access.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/access.js):
    Steps part B.
  - [done-stage.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/done-stage.js):
    the "Done" stage check (OJS).
  - Command:
    `ONLY=ojs,omp PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-level-role-save-ticks-every-stage/<script>.js`
- `walk.js` and `access.js` were walked on OJS and OMP, `main` and
  `stable-3_5_0`, on PostgreSQL; `done-stage.js` on OJS `main`. The fault
  does not depend on the database. Datasets: pkp/datasets c657990
  (2026-10-01). Every save of the "Production editor" window posted no
  `assignedStages[]` and answered 200. `user_group_stage` for "Production editor" went from 4, 5, 6 to
  1, 3, 4, 5 (OJS) and 1, 2, 3, 4, 5 (OMP) on `main`, and from 4, 5 to
  the same on 3.5. The 3.5 walks showed what the `main` walks showed, on
  the same screens.
- The fix was tried with `walk.js` and `access.js` on OJS and OMP
  `main`. The neighbour checks were walked with and without it.
- Not driven: OPS (one stage); 3.4 and 3.3 (read in the code); a
  completed review's own text (the "Review Details" of a reviewer row
  was not opened).
- Unverified: what the dropped "Done" stage decides beyond the workflow
  and the "Published" list looked at. Also unverified is the claim that
  a Production editor opens every stage of submissions they are not
  assigned to: it rests on `pkp/pkp-lib#10387` and the manager fallback
  in `getAccessibleWorkflowStages()`, and was not walked.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a), OMP `main` 3b0ecf794
  (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e,
  OPS 8eaf899468 (lib/pkp 1fb843f491); pkp-lib `stable-3_4_0` 32b0f4b4af,
  `stable-3_3_0` f6ab331645; OJS `stable-3_4_0` 75cc2d488b,
  `stable-3_3_0` ac77c9fb35.
- Code reads:
  - `main`: `UserGroupForm::execute()` and `_assignStagesToUserGroup()`;
    `RoleDAO::getAlwaysActiveStages()` and `getForbiddenStages()`;
    `UserGroupFormHandler.updateStageOptions()`;
    `UserGroupGridCellProvider` (a forbidden stage's box is disabled and
    has no action); `Repo::user()->getAccessibleWorkflowStages()`;
    `AddParticipantForm::fetch()` and `getUserGroupsByStage()`;
    `PKPSectionForm::fetch()` and `CategoryForm`;
    `WorkflowStageDAO::getWorkflowStageTranslationKeys()` (Done left out
    when filtered); the OJS and OMP `registry/userGroups.xml`; OPS
    `Application::getApplicationStages()` (Production only). The form is
    the same file in the three apps' pkp-lib.
  - 3.5: the same block (lines 291 to 294), and the registry's
    Production editor at stages 4, 5.
  - 3.4 and 3.3: the block in `UserGroupForm.php` (3.4) and the
    one-line `if` in `UserGroupForm.inc.php` (3.3); the manager entry in
    `getForbiddenStages()`; the grid cell's disabled box;
    `AddParticipantForm` listing roles by stage
    (`getUserGroupsByStage()`); `getAccessibleWorkflowStages()` with the
    `pkp/pkp-lib#9131` backports (cad00cc9d2 on 3.4, b1c5b825ef on
    3.3); the OJS and OMP registries' Production editor at stages 4, 5.
  - The trace: `git blame` on lines 317 to 320 gives e3f570bc37 (PSR-12
    formatting) and 714d5d5aa4 (the Eloquent refactor), which only
    reshaped them. `git log -S getAlwaysActiveStages` gives 60858b8df8,
    which wrote the override. GitHub's `commits/<sha>/pulls` names pull
    request 3018 (merged 2018-01-03), which fixes `pkp/pkp-lib#2849`. It
    was first tagged in 3.2.0. The change that gave it consequences is
    bedba46053 (`pkp/pkp-lib#9131`, 2023-07-06), found with
    `git log -S "function getAccessibleWorkflowStages"`.
- Upstream searches (2026-10-02): pkp/pkp-lib by production editor
  stages role edit, manager role all stages user group form, "production
  editor" stage assignment role settings, role edit stage assignment
  reset manager, `getAlwaysActiveStages` and `UserGroupForm` stages;
  pkp/ojs and pkp/omp by production editor role stages; pkp/ui-library
  by role stage assignment. The hits were `pkp/pkp-lib#3018` and
  `pkp/pkp-lib#2849` (the introducing change and its issue),
  `pkp/pkp-lib#10387` (above), `pkp/pkp-lib#5962` (the manager role's
  row showing no stage, spec U54 A2) and `pkp/pkp-lib#7103` (new
  manager-level roles assigned to new submissions). None of them is
  this fault.
