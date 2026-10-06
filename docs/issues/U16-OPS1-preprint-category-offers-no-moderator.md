# A preprint server's category offers no moderator to assign automatically, only an empty "Editorial Assignments"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/ops#858` and `pkp/pkp-lib#10883` for `pkp/pkp-lib#10874` · [012e900283](https://github.com/pkp/ops/commit/012e9002836356a50769792eb1368b36e98aacaf) · 2025-02-03 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#ops1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A preprint server's manager opens a category to name the moderators who
should be assigned to every new preprint in it. The window shows the
heading "Editorial Assignments" with no box under it, on every preprint
server, whatever its roles and members. A new preprint filed under the
category gets no moderator from it.

So a server cannot route preprints to moderators by subject through its
categories. A server upgraded from 3.4 keeps the category moderators it
saved there, and they are still assigned, until a manager saves that
category's window on 3.5, which removes them without a word; on `main`
such a save keeps them, and with the fix below they show ticked.

## Impact

- **Lost**: on `main` nothing stored. On 3.5 a saved category's
  moderators are deleted, and no screen can set them again.
- **Who**: every preprint server manager who sorts preprints into
  subject categories, and the moderators who should receive them.
- **Way round**: the section's "Editorial Assignments" assign moderators
  to every preprint of the section, whatever its subject; a subject
  moderator is assigned by hand from the preprint's "Participants" ›
  "Assign".

Medium: setting up a category's moderators fails on every preprint
server. It would be high if many servers routed by category on 3.4,
since on 3.5 an ordinary save of such a category ends their routing
silently.

## Steps to reproduce

Preconditions:

- The default dataset, OPS `main`. Its server holds three moderators
  (`dbuskins`, `sberardo`, `minoue`); the section "Preprints" assigns
  David Buskins and Stephanie Berardo automatically.

Category:

1. Sign in as `rvaca`. Settings › Server › "Categories" › "Add
   Category" (`/index.php/publicknowledge/en/management/settings/context`).
2. Read the window's "Editorial Assignments".
3. Name "u16c8 Moderated", Path "u16c8-moderated", tick "Assign Minoti
   Inoue as Moderator" if it is offered, "Save". [3.5: the older window,
   saved with "OK".]
4. Settings › Workflow › "Submission" › "Metadata": under "Categories"
   choose "Yes, add a categories field to the submission wizard.",
   "Save".

Submission:

5. Sign out. Sign in as `ccorino` and open
   `/index.php/publicknowledge/en/submission`. Type a title, tick "Yes, my
   submission meets all of these requirements." and "Yes, I agree to have
   my data collected and stored according to the privacy statement.",
   "Begin Submission". Upload a file, type an abstract; on "For
   Readers" choose "This preprint has not been published elsewhere." and,
   under "Categories", type "u16c8" and choose "u16c8 Moderated" [3.5:
   tick "u16c8 Moderated"]. "Submit", and confirm with "Submit".
6. Sign out. Sign in as `rvaca`, open the preprint from the Dashboard and
   read "Participants".

Control:

7. As `rvaca`: Settings › Server › "Sections", "Preprints" › "Edit" and
   read its "Editorial Assignments".

**Expected.** Step 2 offers the server's managers and moderators as boxes,
as the section's window does ("Assign Minoti Inoue as Moderator" among
them). Step 6 lists Minoti Inoue as Moderator beside David Buskins and
Stephanie Berardo.

**Observed.** Step 2 shows the heading and its sentence, then the
window's foot, with nothing to tick in step 3:

```
Editorial Assignments
Select the editorial users who should be assigned automatically to all new submissions to this category.
Save
```

Step 6 lists the section's moderators only:

```
PARTICIPANTS
Assign
DB David Buskins Moderator
SB Stephanie Berardo Moderator
CC Carlo Corino Author
```

The control, step 7, offers six boxes: "Assign admin admin as Preprint
Server manager", "Assign Ramiro Vaca as Preprint Server manager", "Assign
Daniel Barnes as Preprint Server manager", "Assign David Buskins as
Moderator" and "Assign Stephanie Berardo as Moderator" (both ticked) and
"Assign Minoti Inoue as Moderator".

## Cause

The category window builds its "Editorial Assignments" from the
context's user groups that have the manager, sub-editor or assistant
role and work on the Submission stage. `CategoryForm::__construct()`
(lib/pkp `classes/components/forms/context/CategoryForm.php`, line 55)
asks for `->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])`.

A preprint server has no Submission stage
(`Application::getApplicationStages()` in OPS returns the Production stage
alone). Up to 3.4, OPS still installed its groups with stages "1,5", so
the same filter found the moderators. `pkp/pkp-lib#10874` removed the
Submission stage from OPS's groups: `pkp/ops#858` changed
`registry/userGroups.xml` to "5,6", and the upgrade migration
`I10874_UserGroupStagesRemoveSubmission` deletes stage 1 from every
existing server's groups. Its pkp-lib half, `pkp/pkp-lib#10883`
(ecf81ba72f), switched the section window (`PKPSectionForm::fetch()`) to
the application's first stage, "WORKFLOW_STAGE_ID_SUBMISSION for OJS/OMP
and WORKFLOW_STAGE_ID_PRODUCTION for OPS", but left the category window
on `WORKFLOW_STAGE_ID_SUBMISSION`. Since then the filter finds no group
on any preprint server: the Roles window (`UserGroupForm`) offers only
the application's stages, so no OPS group can be given stage 1 again.

The heading still shows because of the guard written when the window was
moved to Vue for `pkp/pkp-lib#10404` (PR `pkp/pkp-lib#11243`, 198595800a):
`if (!empty($assignableUserGroups))`. `$assignableUserGroups` is a
`Collection`, and `empty()` on an object is always false. The code
comment above the guard says the group is meant to be left out on OPS,
but the guard never leaves it out.

Reach:

- 3.5's older window (`controllers/grid/settings/category/form/CategoryForm.php`,
  line 272) has the same filter, and its template prints the heading
  unconditionally: walked on 3.5, same result.
- The assignment itself works on a preprint server once a category holds
  moderators: `SubEditorsDAO::assignEditors()` checks only that the user
  still holds the group, not its stage.
- Stored data, settled in the code, not driven. The upgrade leaves a
  3.4 server's `subeditor_submission_group` rows for categories alone,
  and `assignEditors()` keeps applying them (on `main` only on the
  install's first server, because of the fault in
  [U21 A8's report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U21-A8-section-editors-not-assigned-second-journal.md)).
  On 3.5, `CategoryForm::execute()` deletes the category's rows on every
  save and re-inserts only the boxes sent, and the window sends none, so
  the first save removes them. On `main` the window has no `subEditors`
  field to send, and `CategoryCategoryController::saveCategory()` calls
  `Repository::updateEditors()` only when `subEditors` arrives, so a save
  keeps them. With the fix, the window offers their groups, and
  `categoryManagerStore.js` pre-ticks the saved users from the category's
  `assignedEditors` (`category/maps/Schema.php`), so a save keeps them
  too.
- Other lookups of Submission-stage groups that lost their meaning on OPS
  with `pkp/pkp-lib#10874`: `PKPSubmissionHandler::getSubmitUserGroups()`
  and `StartSubmission::addUserGroups()` (who may submit as what; both
  fall back on OPS by design), and `Repository::canCurrentUserDelete()`,
  which `pkp/pkp-lib#13410` tracks. They are left out here.

## Proposed fix

Ask for the application's first stage, as `PKPSectionForm::fetch()` has
done since `pkp/pkp-lib#10883`, and make the guard test the collection
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-editors-not-assigned/fix.diff)):

```diff
+        $stages = Application::getApplicationStages();
         $assignableUserGroups = UserGroup::query()
             ->withContextIds([$request->getContext()->getId()])
             ->withRoleIds(Category::ASSIGNABLE_ROLES)
-            ->withStageIds([WORKFLOW_STAGE_ID_SUBMISSION])
+            ->withStageIds([
+                // WORKFLOW_STAGE_ID_SUBMISSION for OJS/OMP and WORKFLOW_STAGE_ID_PRODUCTION for OPS, see pkp/pkp-lib#10874
+                array_shift($stages)
+            ])
…
-        if (!empty($assignableUserGroups)) {
+        if ($assignableUserGroups->isNotEmpty()) {
```

The second `!empty()` guard gets the same change. Three code comments
say OPS has no such group: the two above the guards in `CategoryForm` and
one in `CategoryCategoryController::saveCategory()`. fix.diff replaces
the first guard's comment and the controller's with comments that fit,
and drops the second guard's. Tried on OPS `main`: step 2 then offered
the same six boxes as the section's window, and step 6 listed Minoti
Inoue as Moderator beside David Buskins and Stephanie Berardo. On the
dataset's journal and press, the category window offered the same four
boxes with the fix in and out (OJS "Assign Daniel Barnes as Journal
editor" and the three section editors; OMP the press editor and three
series editors). A proposal; the team decides.

**Alternatives**

- Only correct the guard (`isNotEmpty()`), as the Vue port's comment
  intended: the empty heading goes, but preprint servers stay without
  category routing, which 3.4 had and `pkp/pkp-lib#5622` (open) asks for
  ("Categories … should be used to determine which moderators are
  automatically assigned"). If that is the team's choice, it is a product
  decision, and the 3.4 servers' stored category moderators would need a
  word in the upgrade notes.
- Put the Submission stage back on OPS's groups: it reverses
  `pkp/pkp-lib#10874`, which removed a stage OPS does not have.

**What goes with it**

- The 3.5 backport is the same stage change in the older window's
  `CategoryForm::fetch()`; its template needs no change once groups are
  found.
- No data repair, and no API change: the categories API already takes
  `subEditors`.
- A test: the e2e scenario in which a server's category names a moderator
  and a preprint in that category gets them (spec U16, a Planned item).
  A journal with no one yet in an editorial role still shows the heading
  with no box, as its section window does; the fix leaves that alone.

Small: two files in pkp-lib (the second only a comment), following the
section window's pattern, and an e2e scenario.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-editors-not-assigned/walk.js)
  (`WALK=ops1`, the default on OPS), with its helpers in `lib.js` beside
  it; `WALK=nb` is the neighbour check. On an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/category-editors-not-assigned/walk.js`
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/category-editors-not-assigned/fix.diff ojs omp ops`,
  the walk on OPS and `WALK=nb` on all three apps, then `revert` and
  `WALK=nb` again.
- Taken on OPS `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets e8dafbc (2026-10-02).
- Tips: OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6), OJS `main` b84f8e2e44
  (lib/pkp ddd8ab243a) and OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6) for
  the neighbour check; `stable-3_5_0` OPS 38b61882d3 (lib/pkp
  cf3f984335); `stable-3_4_0` OPS acd8ae704b (lib/pkp 6f96165c90);
  `stable-3_3_0` OPS c5532e2161 (lib/pkp 4156e50233).
- Code reads:
  - `main`: `CategoryForm::__construct()`, `PKPSectionForm::fetch()`,
    `CategoryCategoryController::saveCategory()`, `Repository::updateEditors()`,
    `SubEditorsDAO::assignEditors()`, OPS's `Application::getApplicationStages()`
    and `registry/userGroups.xml`; `git blame` on line 55 (198595800a,
    the Vue port, which kept the older window's filter) and the history
    of the older window (`git log -L`, the filter unchanged since
    `pkp/pkp-lib#10506`); `commits/<sha>/pulls` for ecf81ba72f
    (`pkp/pkp-lib#10883`), 012e900283 and the migration 1228378516
    (both `pkp/ops#858`), merged 2025-02-11. The dataset's `user_group_stage`
    rows: OPS groups on stages 5 and 6 only (`main` and 3.5), on 1 and 5
    in the 3.4 and 3.3 dumps.
  - 3.5: the older `CategoryForm::fetch()` (line 272) and
    `categoryForm.tpl` (heading always printed); `CategoryForm::execute()`
    and `SubEditorsDAO::assignEditors()` for the stored moderators.
  - Stored moderators on `main`: `CategoryCategoryController::saveCategory()`,
    `category/maps/Schema.php` (`assignedEditors`), ui-library
    `categoryManagerStore.js` (`transformAssignedEditorsToSubEditorFields()`)
    and `useForm.js` `setValue()` (no field, no value sent).
  - 3.4: the older `CategoryForm::fetch()` filters on
    `WORKFLOW_STAGE_ID_SUBMISSION`, and OPS's `registry/userGroups.xml`
    gives the manager and moderator groups stages "1,5", so the window
    offers them; `pkp/pkp-lib#10874` is not on the branch.
  - 3.3: `CategoryForm.inc.php` lists every user with the sub-editor
    role, with no stage filter, and prints the list only when it is not
    empty.
- Upstream searches (2026-10-02): pkp/pkp-lib and pkp/ops, by the
  symptom ("category editorial assignments OPS", "category moderator
  assign", "category subeditors empty") and by `CategoryForm`,
  `assignableUserGroups` and `pkp/pkp-lib#10874`. `pkp/pkp-lib#5622` is
  the feature request behind category routing on OPS, not this fault.
- Unverified: the stored moderators of a server upgraded from 3.4 (code
  read, not driven); the 3.4 and 3.3 lines were read in the code only.
