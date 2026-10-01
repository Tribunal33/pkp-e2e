# Roles list shows the manager and Production editor roles in too few stages, until a save silently ticks every stage

- **Severity** medium
- **Effort** large
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3018` for `pkp/pkp-lib#2849` · [60858b8df8](https://github.com/pkp/pkp-lib/commit/60858b8df8161876cb774fa425e9c94518557927) · 2017-11-04 · ajnyga (ajnyga)
- **Upstream** `pkp/pkp-lib#11515` (open), covering the Production editor's stages on a new journal; `pkp/pkp-lib#2849` (closed), whose fix did not update the roles that already existed
- **Tracked in** spec U54 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a2), [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Since 2017, PKP has treated every role with the "Journal Manager"
permission level ("Press Manager" on a press) as working in every
workflow stage. These are the "Journal manager", "Journal editor" and
"Production editor" roles of a new journal, and "Press manager", "Press
editor" and "Production editor" of a new press. On Settings › Users &
Roles › "Roles" their stage boxes are greyed out, and their "Edit"
window offers no stage to choose.

Yet a new journal or press stores two of these roles with fewer stages.
The "Journal manager" row shows no stage ticked, and "Production
editor" shows only Copyediting and Production. Choosing "Submission"
under "List roles assigned to" leaves both out, and "Assign" in the
Submission stage of a submission does not offer them.

Pressing "OK" in the window of one of these roles applies the rule,
even when nothing was changed: the role is stored with every stage. The
row then shows every stage ticked, and the filter and "Assign" offer the
role, but nothing on screen says its stages changed. So the stored
stages, not the save, are what is wrong. The harm is that the screens
disagree until a save, and that a save quietly changes the role.

A preprint server is not affected: its manager role already has its one
stage.

## Impact

- **Lost**: no data. Before a save, the list misleads the manager about
  where these roles work. After an unrelated save of the "Production
  editor" window (a renamed role, a ticked option), the role gains the
  Submission and Review stages. It is then offered in those stages'
  "Assign" and in a section's "Editorial Assignments". A Production
  editor assigned to a submission can now open its Submission and Review
  stages, as every unassigned Production editor already can on every
  submission.
- **Who**: managers on the "Roles" tab of every journal and press. The
  change follows any save of the "Production editor" window, and of the
  "Journal manager" window where its row offers "Edit" (on 3.5; on
  `main` that row has no "Edit").
- **Way round**: none. The boxes stay greyed, so the stages cannot be
  narrowed again.

Medium: the list misleads, and a routine save silently changes which
stages a role is offered in and gives access to, with no way back.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main` (OMP in brackets
where it differs). Nothing else is needed.

The manager-level rows:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Read the rows "Journal manager" ["Press manager"], "Journal editor"
   ["Press editor"] and "Production editor".
4. Press "Search" and choose "Submission" under "List roles assigned to".
5. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" [OMP: submission 3,
   "The Political Economy of Workplace Injury in Canada"], which is in
   the Submission stage, and press "Assign" under "Participants". Read
   the role list, then press "Cancel".

Saving the Production editor's window:

6. Back on the "Roles" tab, open the "Production editor" row's arrow and
   press "Edit". The window shows no "Stage Assignment".
7. Press "OK" without changing anything.
8. Reload the page and read the "Production editor" row. Press "Search"
   and choose "Submission" under "List roles assigned to" again.
9. Open submission 4 [OMP: 3] again, press "Assign" and read the role
   list.

**Expected**: the three rows show every stage ticked, as their greyed
boxes and the window without a stage choice say, so the "Submission"
filter and "Assign" offer all three. A save with nothing changed leaves
the row as it was.

**Observed**: before the save, every box of the three rows is greyed
out:

```
Journal manager     Submission ☐  Review ☐  Copyediting ☐  Production ☐
Journal editor      Submission ☑  Review ☑  Copyediting ☑  Production ☑
Production editor   Submission ☐  Review ☐  Copyediting ☑  Production ☑
```

The "Submission" filter lists "Journal editor", "Section editor", "Guest
editor", "Funding coordinator", "Author" and "Translator" ("1 - 6 of 6
items"), and "Assign" offers the same six roles. [OMP: "Press editor",
"Series editor", "Funding coordinator", "Author", "Translator", "Volume
editor"; the rows follow the same pattern over five stage columns.]

"OK" closes the window with "Your changes have been saved.", and the
"Production editor" row now shows every stage ticked, before and after
the reload. The "Submission" filter now lists "Production editor" too
("1 - 7 of 7 items"), and "Assign" offers "Production editor". The
"Journal manager" row stays empty.

## Cause

Since `pkp/pkp-lib#2849` (2017), the code treats every role at the
manager level (`Role::ROLE_ID_MANAGER`) as working in every stage.
`RoleDAO::getForbiddenStages()` greys all of the level's boxes in the
list, the role window hides "Stage Assignment" because every box of the
level is forbidden (`UserGroupFormHandler.js`, `updateStageOptions()`),
and `UserGroupForm::execute()` stores every stage whenever such a role
is saved (pkp-lib
`controllers/grid/settings/roles/form/UserGroupForm.php`, lines 317-320):

```php
// Always set all stages active for some permission levels.
if (in_array($userGroup->roleId, $roleDao->getAlwaysActiveStages())) {
    $assignedStages = array_keys(WorkflowStageDAO::getWorkflowStageTranslationKeys());
}
```

The rule is applied only there. A new context's roles come from the
app's `registry/userGroups.xml`. In OJS and OMP it still gives the
manager role no stages and "Production editor" Copyediting and
Production (lines 17 and 19), as they had before 2017. The change for
`pkp/pkp-lib#2849` added the save, and did not update the roles that
already existed. The issue's discussion asked for an upgrade step to do
that, and none was written. OPS's registry gives its manager role every
OPS stage (`5,6` on `main`), so OPS agrees with the rule. A role a
manager creates at this level gets every stage when it is first saved.

Every reader of a role's stages reads the stored `user_group_stage`
rows, so until a save it sees the stages the registry wrote. A sample:

- the list's ticks (`UserGroupGridCellProvider`) and its stage filter
  (`UserGroupGridHandler::loadData()`, `withStageIds()`, line 199):
  walked;
- the role list of "Assign" (`AddParticipantForm::fetch()`, line 143,
  `Repo::userGroup()->getUserGroupsByStage()`): walked;
- a section's or series' "Editorial Assignments" (`PKPSectionForm::fetch()`,
  line 119), which offers roles that work in the first stage (code);
- the stages an assigned member can open
  (`User\Repository::getAccessibleWorkflowStages()`): an assigned
  Production editor can open Copyediting and Production before a save
  and every stage after it. Without an assignment, a manager-level
  member can open every stage either way (code);
- every `StageAssignment::withStageIds()` caller, which filters through
  the role's stored stages. One is the "editor assigned" email on a new
  submission (`SubEditorsDAO`, line 254), which goes to the assigned
  managers and section editors whose role works in the Submission stage
  (code).

On `main`, the save also stores the editorial stages alone. That removes
the Done stage (stage 6), which the registry and the 3.6 upgrade
(`I13109_PermitPublishedMetadataEdit`) give every manager-level role.
The query is in Evidence. No screen effect was found.

## Proposed fix

A proposal; the team decides. Apply the rule when roles are created as well, and bring existing roles
in line once, as the `pkp/pkp-lib#2849` discussion asked
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-stages-differ-until-saved/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-stages-differ-until-saved/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-stages-differ-until-saved/fix-ops.diff)):

1. OJS and OMP `registry/userGroups.xml`: give the manager role and
   "Production editor" every stage, as "Journal editor" ("Press
   editor") already has (`stages="1,3,4,5,6"`; OMP `"1,2,3,4,5,6"`).
2. A pkp-lib upgrade migration, `v3_6_0/I11515_ManagerLevelRolesEveryStage`,
   listed in the three apps' `dbscripts/xml/upgrade.xml`. It gives every
   manager-level role of every context every stage of
   `Application::getValidStages()`, using `insertOrIgnore()` on the
   unique key so that stages a role already has are kept.
3. `UserGroupForm`: store `Application::getValidStages()` for the
   manager level, so that a save keeps the Done stage. Validate the
   stages against the same list, and drop the `$stages` variable that
   is then unused:

```diff
         if (in_array($userGroup->roleId, $roleDao->getAlwaysActiveStages())) {
-            $assignedStages = array_keys(WorkflowStageDAO::getWorkflowStageTranslationKeys());
+            $assignedStages = Application::getValidStages();
         }
 …
-            if (array_key_exists($stageId, $stages)) {
+            if (in_array((int) $stageId, Application::getValidStages())) {
```

This follows the rule the list and the window already show, and
`pkp/pkp-lib#11515` asks for the same for the Production editor. The
migration follows `I13109_PermitPublishedMetadataEdit`, which adds a
stage to every role of a level. The registry lines follow the "Journal
editor" line beside them.

Tried on `main` in the three apps, on a dataset upgraded so that the
migration ran. Every manager-level row showed every stage ticked, and
the "Submission" filter and "Assign" offered "Journal manager" and
"Production editor". A save with nothing changed left each row and its
stored stages as they were, Done included. A journal or press created
after the change got every stage for its three manager-level roles. A
role below the manager level ("Section editor", "Series editor",
"Moderator") saved with nothing changed kept its row, with the fix and
without it.

**Alternatives**:

- Let the save keep a manager-level role's stored stages. It is one
  line and the silent change stops. But the list still shows the
  manager role working in no stage, and the greyed boxes and the window
  still promise every stage while the role is narrower.
- Let managers choose the stages of a manager-level role, by opening its
  boxes and the window's "Stage Assignment". This was the other option
  discussed in `pkp/pkp-lib#2849`, and it is a product decision about
  which stages a manager-level role may be denied.

**What goes with it**:

- A product call: the upgrade lets every assigned Production editor, on
  every existing install, open the Submission and Review stages of the
  submissions they are assigned to. Most installs have never saved that
  window, so for them this is a change nobody chose. The team needs to
  pick between this fix and the alternatives first.
- Custom manager-level roles: the migration covers every role at the
  level, including roles managers created. Those got every editorial
  stage when they were first saved, so on them it adds only a missing
  Done stage. Limiting the migration to the two registry roles (by
  their `nameLocaleKey`, as `I13109_PermitPublishedMetadataEdit` does
  for its assistant roles) is the narrower choice.
- MySQL: the migration was run on PostgreSQL only; `insertOrIgnore()`
  compiles differently on MySQL and needs a run there.
- The other open fix on this form: the fix proposed in
  [U54-A10-role-name-spaces-window-broken.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A10-role-name-spaces-window-broken.md)
  also changes `UserGroupForm.php`, in `initData()` and `fetch()`. The
  two diffs apply together in either order without offset
  (`patch --dry-run`).
- A save of any role below the manager level also drops the Done stage
  on `main`, from its own code (`_assignStagesToUserGroup()` rewrites
  the stages from the window's boxes). That is a separate fault, which
  this fix leaves alone.
- Backport: 3.5, 3.4 and 3.3 have no Done stage, so their save needs no
  change. The registry lines apply there without the `6`. A backported
  migration uses `Application::getApplicationStages()` in place of
  `getValidStages()`.

Large: a few lines in pkp-lib and two apps' registries, plus an upgrade
migration listed in three apps, but the change of access for assigned
Production editors needs a product decision first.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-stages-differ-until-saved/walk.js)
  takes the Steps on PKP's default test dataset (pkp/datasets 38ab955,
  2026-09-30, the `pgsql` dumps; PostgreSQL). Run from pkp-e2e on a
  dataset fleet reset first:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-role-stages-differ-until-saved/walk.js`.
  It also reads the OPS rows and filter, opens a published submission
  as `dbarnes` before and after a save of the "Journal editor" window,
  and reads the roles' stored stages before and after. `NEIGHBOUR=1`
  runs the neighbour check alone, and `MANAGER=1` the manager role's own
  window.
- Walked on OJS, OMP and OPS on `main` (ojs bade233f73, lib/pkp
  2e377d27fc; omp 3b0ecf794 and ops c8af945bb7, lib/pkp 3dc90c81a6;
  ui-library 280f98c5) and on `stable-3_5_0` (ojs 92b9a16b48, omp
  3081c9b00, ops cf4fce69bd; lib/pkp a9c76aed62). Both showed the same
  rows, filter lists and "Assign" lists, and no request or page script
  failed. On OPS the "Preprint Server manager" row shows "Production"
  ticked and greyed, and the "Production" filter keeps it, on both.
- The manager role's own window, 3.5 (`MANAGER=1`, OJS and OMP): "OK"
  with nothing changed stored every stage for "Journal manager" ("Press
  manager"; `1,3,4,5` and `1,2,3,4,5` in the database). The page could
  not be re-read afterwards, because the same save took the Settings
  pages away from `rvaca` (U54
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a11)).
  On `main` that row has no "Edit" (U54
  [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a1)).
- The stored stages (and the Done stage on `main`), before and after
  steps 7 and a save of the "Journal editor" window:

  ```sql
  SELECT ug.user_group_id, string_agg(ugs.stage_id::text, ',' ORDER BY ugs.stage_id)
  FROM user_groups ug LEFT JOIN user_group_stage ugs ON ugs.user_group_id = ug.user_group_id
  WHERE ug.role_id = 16 GROUP BY ug.user_group_id ORDER BY 1;
  ```

  OJS `main`: Journal editor `1,3,4,5,6` → `1,3,4,5`; Production
  editor `4,5,6` → `1,3,4,5`.
- 3.4 and 3.3 read in the code (pkp-lib `origin/stable-3_4_0`
  df13621c2d, `origin/stable-3_3_0` d446601ebe; apps
  `upstream/stable-3_4_0` ojs 9571d8fde7, omp 0aec65441, ops acd8ae704b;
  `upstream/stable-3_3_0` ojs 9fdb9bcf9a, omp 8e72fc883, ops
  c5532e2161). Both have the same `getAlwaysActiveStages()` override in
  `UserGroupForm` (3.3 `UserGroupForm.inc.php`) and the same registry
  lines (the manager role without stages, Production editor `4,5`).
  OPS's manager role has `1,5` there, which includes Production, the
  one OPS stage of those versions.
- The trace: `git log -L` on the override leads to 60858b8df8 ("Add
  alwaysActiveStages", merged with `pkp/pkp-lib#3018`, 2018-01-03). The
  stages on the registry's manager line are unchanged since 2013
  (e0d3f3bc68).
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words and by
  `getAlwaysActiveStages` and `UserGroupForm`. `pkp/pkp-lib#10387`
  (closed) is about the Production editor's access in 3.4, not these
  lists.
- Fix check: `node bin/try-fix.js apply <fix-app.diff> <app>` for each
  app. The default dataset of `stable-3_5_0` was loaded and upgraded to
  `main` so that the new migration ran, then walk.js and `NEIGHBOUR=1`
  walk.js were run. [registry-check.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-stages-differ-until-saved/registry-check.js)
  creates one scratch journal, press and server through pkp-e2e's test
  API after the apply, and reads the stages of their manager-level
  roles.
- Not walked here: what an assigned Production editor can open after
  the save, and the "Editorial Assignments" list, were read in the code.
  Both were seen in the browser on OJS and OMP in an earlier pkp-e2e
  check of the *Roles configuration* spec (2026-09-26). MySQL not
  checked.
