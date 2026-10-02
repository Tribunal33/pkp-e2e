# The Roles list shows "Journal manager" in no stage, and "Assign" never offers it

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced; present since at least [e0d3f3bc68](https://github.com/pkp/ojs/commit/e0d3f3bc68afab5920c167773999c219595b4b1c) (2013-01-29, OJS) and [0d396f4769](https://github.com/pkp/omp/commit/0d396f4769cb2dad6992f08da53de015d8aced61) (2011-07-05, OMP)
- **Upstream** `pkp/pkp-lib#5962` (open), covering the journal manager's row only; `pkp/pkp-lib#10929` (open, milestone 3.6, waiting for a decision), whose third option, every stage for every manager-level role, this fix takes for the manager role alone; `pkp/pkp-lib#2849` (closed) set the rule and asked for an upgrade that was never written
- **Tracked in** spec U54 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Roles", the "Journal manager" row
("Press manager" on a press) has every stage box empty. The "Journal
editor" row, at the same permission level, has every stage ticked. Yet
the journal's managers open every stage of every submission.

Choosing a stage under "List roles assigned to" leaves the manager role
out, and a submission's "Assign" never offers it. Nobody loses access,
and a person can be assigned as "Journal editor" instead. A manager
cannot correct the row, because it is the first row of the list, which
has no "Edit".

The fix needs the install data for new journals and presses, and an
upgrade for existing ones. A preprint server's manager row is right.

## Impact

- **Lost**: a true picture of the role on the Roles list, and the
  manager role as a choice in "Assign".
- **Who**: every journal and press: the managers who read the list and
  the editors who assign participants.
- **Way round**: assign the person as "Journal editor". The row cannot
  be repaired on screen. It is the first row of the list, and the first
  row has no "Edit"
  ([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A1-A5-roles-list-first-row-no-edit-stale-rows.md)).
  Where it is not first, "Edit" then "OK" would store every stage
  except "Done", by the code
  ([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md)).

Low. It would be medium if the team decides "Assign" must offer the
manager role, as it does on a preprint server.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. The
  `stable-3_5_0` dataset takes the same steps.
- [OMP: the same steps with "Press manager" and "Press editor"; the
  stage columns are Submission, Internal Review, External Review,
  Copyediting and Production; submission 3, "The Political Economy of
  Workplace Injury in Canada" (Submission stage), and submission 4,
  "How Canadians Communicate: Contexts of Canadian Popular Culture"
  (Production).]

**A. The Roles list**

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Go to Settings › Users & Roles and open the "Roles" tab. Look at the
   "Journal manager" and "Journal editor" rows, both at the permission
   level "Journal Manager".
3. Press "Search" and, under "List roles assigned to", choose
   "Submission". Read the list. Do the same with "Review",
   "Copyediting" and "Production".

**B. Assign**

4. Open submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice" (Submission stage).
   In "Participants" press "Assign" and open the role list. Press
   "Cancel".
5. Do the same on submission 5, "Genetic transformation of forest
   trees" (Production stage).

**C. What a journal manager opens**

6. Sign in as `rvaca` (password `rvacarvaca`), who holds "Journal
   manager" only. Open submission 5 and, in the workflow menu, choose
   "Submission", "Review Round 1", "Copyediting" and "Production".

**Expected:** at step 2 the "Journal manager" row has Submission,
Review, Copyediting and Production ticked, as "Journal editor" has
(OMP: all five). At step 3 each stage lists it, and at steps 4 and 5
"Assign" offers it.

**Observed:** at step 2 "Journal manager" is the first row, with all
four boxes empty and greyed out. "Journal editor" has all four ticked
and greyed out. At step 3 no stage lists "Journal manager". The
"Submission" list opens with "Journal editor", "Section editor", "Guest
editor". At step 4 the role list reads:

```
Journal editor, Section editor, Guest editor, Funding coordinator, Author, Translator
```

At step 5 it reads:

```
Journal editor, Production editor, Section editor, Guest editor, Designer, Indexer, Layout Editor, Proofreader, Author, Translator
```

At step 6 every stage opens, with no "You don't currently have access
to that stage of the workflow.".

[OMP: the "Press manager" row is empty and greyed out beside "Press
editor"'s five ticked boxes. No stage filter lists it, and "Assign" on
submissions 3 and 4 opens with "Press editor". `rvaca` opens
"Submission", both "Review Round 1" entries, "Copyediting" and
"Production".]

Control: on the preprint server of the OPS dataset, the "Preprint
Server manager" row has "Production" ticked. "Production" under "List
roles assigned to" lists it first, and "Assign" on submission 1 reads
"Preprint Server manager", "Moderator", "Author".

## Cause

The stage boxes of a row, the stage filter and "Assign" all read the
role's rows in `user_group_stage`. The filter goes through
`UserGroupGridHandler::loadData()` → `withStageIds()`. "Assign" goes
through `AddParticipantForm::fetch()` →
`Repo::userGroup()->getUserGroupsByStage()`. The journal's and the
press's manager role has no rows there, because the installer gives it
none. In OJS and OMP `registry/userGroups.xml`, its entry is the only
manager-level group without a `stages` attribute:

```xml
<group roleId="0x00000010" name="default.groups.name.manager" ... permitMetadataEdit="true" permitSettings="true" />
<group roleId="0x00000010" stages="1,3,4,5,6" name="default.groups.name.editor" ... />
```

`Repo::userGroup()->installSettings()` writes the stages each entry
names, so a new journal's manager role starts with none. The other
installed manager-level roles, "Journal editor" and "Production
editor", have their stages. OPS's entry carries `stages="5,6"`. It has
had a stage since `pkp/pkp-lib#5622` folded the server's editor role
into the manager role in 2020.

That data breaks a rule pkp-lib has stated since `pkp/pkp-lib#3018`
(for `pkp/pkp-lib#2849`, 2017): every stage is active for the manager
permission level. `RoleDAO::getAlwaysActiveStages()` returns
`[Role::ROLE_ID_MANAGER]`. `RoleDAO::getForbiddenStages()` greys every
box of such a row ("Journal managers should always have all stage
selections locked by default"). `UserGroupForm::execute()` stores every
workflow stage but "Done" when a manager-level role is created or
saved. The discussion in `pkp/pkp-lib#2849` asked for an upgrade that
would bring the installed roles in line. That upgrade was never
written, and the registry entry, older than the rule, was never changed.

Access does not depend on these rows.
`Repo::user()->getAccessibleWorkflowStages()` gives a manager who is not
assigned to a submission every stage. That is why `rvaca` opens every
stage while the row says none.

Reach:

- A section's (series', category's) "Editorial Assignments" offers the
  members of the roles that hold the Submission stage
  (`PKPSectionForm::fetch()`, `CategoryForm`). It leaves out the members
  who hold only "Journal manager". Read in the code.
- A new submission: `PKPSubmissionController::add()` would leave out
  the roles without the Submission stage, but that filter is commented
  out until `pkp/pkp-lib#10929` is settled, with a note that journal
  managers hold no Submission stage. Walked: `rvaca` submits as
  "Journal manager" and is not given "Author", so the empty row changes
  nothing there today.
- On `main`, an install upgraded from 3.5 gives the manager role the
  "Done" stage alone (`I13109_PermitPublishedMetadataEdit` adds stage 6
  to every manager-level role). Walked: the row, the filter and
  "Assign" are the same as on a new install.
- The other registry entries without stages ("Reader", "Subscription
  Manager", "Editorial Board Member") are not at the manager level.
  Read in the code.

## Proposed fix

Give the manager entry the stages of the editor entry beside it in OJS
and OMP `registry/userGroups.xml`, "Done" included. Add an upgrade
migration in pkp-lib that gives every stage to the manager-level roles
that hold no workflow stage. Diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-row-shows-no-stage/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-row-shows-no-stage/fix-omp.diff).

```diff
-	<group roleId="0x00000010" name="default.groups.name.manager" ...
+	<group roleId="0x00000010" stages="1,3,4,5,6" name="default.groups.name.manager" ...
```

(OMP: `stages="1,2,3,4,5,6"`.) The migration,
`PKP\migration\upgrade\v3_6_0\I5962_ManagerRoleStages`, is listed in
each app's `dbscripts/xml/upgrade.xml` after
`I13213_TaskTemplateForeignConstraint`. It selects the user groups with
`role_id` `ROLE_ID_MANAGER` that have no row in `user_group_stage` for
any of `Application::getApplicationStages()`. For each one it inserts
those stages and `WORKFLOW_STAGE_ID_DONE` with the group's own
`context_id`, using `insertOrIgnore`. It follows the pattern of
`I13109_PermitPublishedMetadataEdit`.

The condition is narrow on purpose. A manager-level role that has been
created or saved holds every workflow stage but "Done", so it is left
alone; the save's loss of "Done" is its own fault
([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U54-A3-manager-level-role-save-ticks-every-stage.md)).
The only roles that hold no workflow stage are the installed manager
roles, and the upgraded ones holding "Done" alone. "Production editor"
keeps Copyediting and Production, which `pkp/pkp-lib#10387` treats as
intentional.

`pkp/pkp-lib#10929` asks how managers should submit, and its third
option is this change for every manager-level role. This fix takes it
for the manager role only, so the part of that issue about "Production
editor" stays open. The commented-out Submission-stage filter in
`PKPSubmissionController::add()` would then keep the manager role, as
it keeps "Journal editor".

Tried on OJS and OMP `main`, on an install upgraded from the 3.5
dataset with the fix in (Evidence). The manager role's row read every
stage, every stage under "List roles assigned to" listed it, and
"Assign" on both submissions offered it first. Every other row and list
was the same as without the fix. A journal and a press created with the
fix in differed only in the manager role's row.

**Alternatives**

- Tick the forbidden boxes of a manager-level row in
  `UserGroupGridCellProvider` without storing them. The row would then
  claim stages that the filter and "Assign" still ignore.
- Enforce the rule in `installSettings()`, giving every manager-level
  entry every stage. That would also widen "Production editor", against
  `pkp/pkp-lib#10387`.
- Keep the manager role out of every stage and say so on the Roles
  list. That is a product decision against `pkp/pkp-lib#2849`, and needs
  a new way to show the row.

**What goes with it**

- Behavior change, read in the code: "Assign" offers the manager role
  in every stage, and "Editorial Assignments" of sections, series and
  categories offers its members. A user who holds the manager role and
  "Author" gets a "Submit As" choice between them on the start page
  (`PKPSubmissionHandler::getSubmitUserGroups()`), as a "Journal editor"
  who is also an author does.
- Data: the migration repairs the existing journals and presses.
- Backport: the registries of 3.5, 3.4 and 3.3 have the same entry. A
  backport needs the registry line and the migration under that
  version's upgrade list (3.3 as `.inc.php`, without `Repo`).
- Guard: an e2e scenario that reads the manager role's row on a new
  journal.

Medium: two repos, and a repair of the existing data.

## Evidence

- Kept scripts, with their helpers in `lib.js` beside them:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-row-shows-no-stage/walk.js):
    the Steps and the OPS control, reading every row of the Roles list.
    Comparing those rows with and without the fix checks that no other
    role changes.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-row-shows-no-stage/neighbour.js):
    the registry half of the fix. A context is created through the
    campaign's test API (not a team tool), and its manager reads its
    Roles list.
  - [submit.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/manager-role-row-shows-no-stage/submit.js):
    `rvaca` on "Make a Submission" through "Begin Submission", then `rvaca`'s
    roles and the new submission's participants (OJS `main`). The start
    page showed no "Submit As"; the submission listed `rvaca` as
    "Journal manager", and `rvaca`'s roles stayed "Journal manager" alone.
  - Command:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/manager-role-row-shows-no-stage/walk.js`.
    `PROBE_FEATURE` names the install to drive, and `PROBE_AGENT` the
    output folder.
- `walk.js` was walked on OJS, OMP and OPS, on `main` and
  `stable-3_5_0`, on PostgreSQL; the fault does not depend on the
  database. Datasets: pkp/datasets c657990 (2026-10-01). No request
  failed and no script error was recorded.
- The upgraded install: the `stable-3_5_0` dataset was loaded into a
  `main` database and upgraded with `php tools/upgrade.php upgrade` from
  the `main` checkout, once without the fix and once with it applied.
  The upgrade log lists `I5962_ManagerRoleStages`.
- Not driven: "Editorial Assignments" and the "Submit As" choice, with
  and without the fix; 3.4 and 3.3; a multi-context install.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a), OMP `main` 3b0ecf794c
  (lib/pkp 3dc90c81a6), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88ea,
  OPS 8eaf899468 (lib/pkp 1fb843f491); `stable-3_4_0` OJS 75cc2d488b,
  OMP 0aec65441f, OPS acd8ae704b, pkp-lib 32b0f4b4af; `stable-3_3_0`
  OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161, pkp-lib f6ab331645.
- Code reads beyond the Cause:
  - `main`: `PKPContextService::add()` calling `installSettings()` for
    every new context; `UserGroupGridCellProvider` (a box ticked from
    the stored stages); `PKPSubmissionController::add()`,
    `PKPSubmissionHandler::getSubmitUserGroups()` and
    `StartSubmission::addUserGroups()`; each app's
    `dbscripts/xml/upgrade.xml`.
  - 3.5, 3.4 and 3.3: the OJS and OMP registry's manager entry without
    `stages` (OPS: `5` on 3.5, `1,5` on 3.4 and 3.3);
    `getAlwaysActiveStages()` and `getForbiddenStages()` in `RoleDAO.php`
    (3.4) and `RoleDAO.inc.php` (3.3); the grid's stage filter
    (`filterByStageIds()` on 3.4, `UserGroupDAO::getUserGroupsByStage()`
    on 3.3); the grid cell ticked from the assigned stages;
    `AddParticipantForm` listing roles by stage.
  - The trace: `git log -L` on the manager entry of OJS
    `registry/userGroups.xml` reaches e0d3f3bc68 (2013, Jason Nugent),
    the first version of the file with stages, where the entry already
    has none. The later commits only added attributes. In OMP the entry
    has no stages in 0d396f4769 (2011), the commit that set the default
    stages. The rule came with
    [60858b8df8](https://github.com/pkp/pkp-lib/commit/60858b8df8161876cb774fa425e9c94518557927)
    (Antti-Jussi Nygård, ajnyga). Its message names no PR; GitHub's
    `commits/60858b8df8/pulls` gives `pkp/pkp-lib#3018` (merged
    2018-01-03), whose description names `pkp/pkp-lib#2849`. `git grep
    user_group_stage` finds no upgrade that writes the manager role's
    stages, in OJS 3.3's `dbscripts` or in pkp-lib's migrations, apart
    from the "Done" stage of `I13109_PermitPublishedMetadataEdit`.
- Upstream searches (2026-10-02): pkp/pkp-lib by journal manager role
  stages unchecked, "journal manager" stage assignment checkbox, manager
  user group stages registry userGroups.xml, assign participant journal
  manager role not listed, "press manager" stages,
  `getAlwaysActiveStages` and `getForbiddenStages`; pkp/ojs by journal
  manager role stages; pkp/omp by press manager role stages. Hits:
  `pkp/pkp-lib#5962` (a 2020 comment there says an "Edit" and save
  ticks the boxes, and another that the boxes decide whom "Assign"
  offers), `pkp/pkp-lib#2849` and `pkp/pkp-lib#3018` (the rule),
  `pkp/pkp-lib#11515` (open, asks every stage for "Production editor",
  a different role) and `pkp/pkp-lib#10387`. `pkp/pkp-lib#10929` was
  found through the note in `PKPSubmissionController::add()`.
- Unverified: whether a journal relies today on its managers being
  absent from "Assign" and "Editorial Assignments".
