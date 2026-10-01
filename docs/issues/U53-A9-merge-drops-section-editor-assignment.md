# Merging a section editor's account unassigns them from their sections, so new submissions arrive without that editor

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR (PKP's old bug tracker, 2082) · [d3d59e3fdc](https://github.com/pkp/ojs/commit/d3d59e3fdc6d0c7c17f7c83e4a6854318daa001c) in pkp/ojs, OJS's first "Merge Users" · 2006-03-07 · Alec Smecher (asmecher); in pkp-lib since [698b257e6c](https://github.com/pkp/pkp-lib/commit/698b257e6c68dc94b017f7dce565deab411350ea) (2019)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

"Merge user" is for one person who has two accounts: a manager merges
the duplicate (the merged account) into the account the person keeps
(the kept account). When the merged account is an editor assigned to a
section (a series on a press), the merge moves its roles and its places
on submissions already in progress to the kept account, but not the
section assignment. Afterwards the section's "Edit" window no longer
lists the merged account, and the kept account is not ticked as the
section's editor. Nothing on screen says so.

From then on, new submissions to that section are not assigned to that
person. If they were the section's only editor, new submissions arrive
with no editor, and the managers receive the usual "A new submission
needs an editor to be assigned" email. Otherwise the section's other
editors are assigned and nobody is told that one is missing.

## Impact

- **Lost.** The person's place as the section's editor. They stop being
  assigned the section's new submissions, and are not told.
- **Who.** A Journal Manager, Press Manager or Preprint Server Manager
  (or the Site Administrator) who merges the duplicate account of a
  section editor, series editor or moderator under Settings › "Users &
  Roles", or with the command-line tool `tools/mergeUsers.php`.
- **Way round.** Tick the kept account again in the section's "Edit"
  window, and assign the person by hand to the submissions that came in
  meanwhile. Nothing records which sections the merged account held, so
  the manager has to remember them.

Medium rather than high: no submission is left unseen, since each one
goes to the section's other editors or, with none left, the managers are
emailed; what is lost is the person's own share of the work.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Every password
  is the username twice (`rvaca` / `rvacarvaca`).
- Nothing more. The dataset already assigns David Buskins (`dbuskins`)
  to one section: on OJS "Articles" (Section editor, with Daniel Barnes
  and Stephanie Berardo), on OMP the series "Library & Information
  Studies" (Series editor, alone), on OPS "Preprints" (Moderator, with
  Stephanie Berardo). Minoti Inoue (`minoue`) holds the same role and is
  not assigned there. In the steps the two stand for one person's two
  accounts: David Buskins's is the merged account, Minoti Inoue's the
  kept account. David Buskins opened no discussion, so the merge
  completes: merging an account that opened one fails
  ([pkp-e2e#10](https://github.com/jardakotesovec/pkp-e2e/issues/10)).

Steps (names for OJS; [OMP; OPS] in brackets):

1. Sign in as `rvaca` (Ramiro Vaca, the manager).
2. Open Settings › Journal › "Sections" [Settings › Press › "Series";
   Settings › Server › "Sections"]. The "Articles" row ["Library &
   Information Studies"; "Preprints"] lists David Buskins under
   "Editors". Click the row's arrow › "Edit": under "Editorial
   Assignments", "Assign David Buskins as Section editor" is ticked and
   "Assign Minoti Inoue as Section editor" is not [Series editor;
   Moderator]. Click "Cancel".
3. Open Settings › "Users & Roles". On David Buskins's row, click "…" ›
   "Merge user".
4. In the "Merge user" window, on Minoti Inoue's row, click the arrow ›
   "Merge into this User". The "Confirm" dialog reads "Are you sure you
   wish to merge the account with the username "dbuskins" into the
   account with the username "minoue"? …". Click "OK".
5. Open the "Sections" tab again, read the row's "Editors", and open its
   "Edit" window.
6. Sign out. Sign in as `ccorino` (Carlo Corino) [OMP: `aclark`, Arthur
   Clark] and make a new submission through "Submit": title "u53r41 Kelp
   forest recovery", section "Articles" ["Library & Information
   Studies"; OPS: no section field, since the server has one section,
   and the submission goes to "Preprints"], one PDF file, an abstract,
   then "Submit".
7. Sign out. Sign in as `rvaca`, open the new submission and read
   "Participants".

**Expected.** After the merge the row's "Editors" names Minoti Inoue in
David Buskins's place, and "Assign Minoti Inoue as Section editor" is
ticked. The new submission lists Minoti Inoue among its participants as
Section editor [Series editor; Moderator].

**Observed.** The merge window closes and David Buskins leaves the users
list, as expected. The section has lost him and gained no one:

| | "Editors" before | "Editors" after | Ticked after |
|---|---|---|---|
| OJS "Articles" | Daniel Barnes, David Buskins, Stephanie Berardo | Daniel Barnes, Stephanie Berardo | Daniel Barnes, Stephanie Berardo |
| OMP "Library & Information Studies" | David Buskins | None | nothing |
| OPS "Preprints" | David Buskins, Stephanie Berardo | Stephanie Berardo | Stephanie Berardo |

"Assign Minoti Inoue as Section editor" [Series editor; Moderator] stays
unticked. The new submission's "Participants" lists Daniel Barnes
(Journal editor), Stephanie Berardo (Section editor) and Carlo Corino
(Author) on OJS; only Arthur Clark (Author) on OMP; Stephanie Berardo
(Moderator) and Carlo Corino (Author) on OPS. Minoti Inoue is in none.
On OMP the managers (`rvaca`, `dbarnes`, `admin`) each received "A new
submission needs an editor to be assigned: "u53r41 Kelp forest
recovery"". On OJS, Daniel Barnes and Stephanie Berardo received "You
have been assigned as an editor on a submission to Journal of Public
Knowledge", and Minoti Inoue received nothing.

## Cause

`PKP\user\Repository::mergeUsers()` (lib/pkp
`classes/user/Repository.php`, lines 372–373 on main) deletes the merged
account's section assignments instead of handing them over:

```php
$subEditorsDao = DAORegistry::getDAO('SubEditorsDAO'); /** @var SubEditorsDAO $subEditorsDao */
$subEditorsDao->deleteByUserId($oldUserId);
```

`SubEditorsDAO::deleteByUserId()` removes every `subeditor_submission_group`
row of the user. Those rows are the "Editorial Assignments" boxes of the
section and category windows, and `SubEditorsDAO::assignEditors()` reads
them to assign editors to each new submission. Every other kind of
assignment in the method is moved to the kept account: roles, review
assignments, and the stage assignments that make the person a
participant on submissions already in progress (lines 402–419, checked
in the code). The section assignments sit under "Delete the old user and
associated info" with the temporary files, as they have since OJS's first
merge.

Reach:

- "Merge user" under Settings › "Users & Roles" and the older grid of
  Administration › "Hosted Journals" › "Settings wizard" › "Users" both
  call `UserGridHandler::mergeUsers()`: reproduced on OJS, OMP and OPS.
- `php tools/mergeUsers.php` (`MergeUsersTool`) calls the same method
  (checked in the code).
- Category assignments ("Assign editors" in a category's window) are rows
  of the same table and are dropped the same way (checked in the code,
  not walked).
- The rows of every journal on the site are dropped, not only the
  journal whose list the merge was started from (checked in the code).
- When the merge fails partway because the merged account opened a
  discussion ([pkp-e2e#10](https://github.com/jardakotesovec/pkp-e2e/issues/10)),
  the section assignments are already gone: they are deleted before the
  step that fails (checked in the code).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-drops-section-editor-assignment/fix.diff)
was applied to OJS, OMP and OPS. With it the Steps show Expected on all
three apps. A second merge into an editor who already holds the same
section (OJS, OPS) left her ticked once, with no error, and left the
sections the merged account did not hold unchanged (Evidence).

Recommended: give `SubEditorsDAO` a `changeUser()` that hands the rows to
the kept account, and call it from `mergeUsers()` just before the
existing `deleteByUserId()`:

```diff
 // lib/pkp/classes/context/SubEditorsDAO.php
+    public function changeUser(int $oldUserId, int $newUserId): void
+    {
+        $assignments = DB::table('subeditor_submission_group')
+            ->where('user_id', '=', $oldUserId)
+            ->get();
+
+        foreach ($assignments as $assignment) {
+            $exists = DB::table('subeditor_submission_group')
+                ->where('context_id', '=', $assignment->context_id)
+                ->where('assoc_id', '=', $assignment->assoc_id)
+                ->where('assoc_type', '=', $assignment->assoc_type)
+                ->where('user_group_id', '=', $assignment->user_group_id)
+                ->where('user_id', '=', $newUserId)
+                ->exists();
+
+            if (!$exists) {
+                DB::table('subeditor_submission_group')
+                    ->where('subeditor_submission_group_id', '=', $assignment->subeditor_submission_group_id)
+                    ->update(['user_id' => $newUserId]);
+            }
+        }
+    }

 // lib/pkp/classes/user/Repository.php, mergeUsers()
         $subEditorsDao = DAORegistry::getDAO('SubEditorsDAO'); /** @var SubEditorsDAO $subEditorsDao */
+        $subEditorsDao->changeUser($oldUserId, $newUserId);
         $subEditorsDao->deleteByUserId($oldUserId);
```

It follows the stage-assignment transfer a few lines below in the same
method: move the row unless the kept account already holds the same
one, which the table's unique key (`section_editors_unique`) would refuse.
The name follows the other DAOs `mergeUsers()` calls
(`Repo::eventLog()->dao->changeUser()`). The existing `deleteByUserId()`
keeps its job of clearing what is left, now only the duplicates. The role
transfer that follows gives the kept account the role group each row
names. `assignEditors()` uses a moved row only while the kept account's
role in that group is active (`userInGroup()` filters on the role's end
date), and the role transfer keeps an ended role the kept account
already had rather than the merged account's active one. A kept account
whose editor role has ended is then not assigned, which is how
`assignEditors()` treats every editor whose role has ended; the fix
leaves that as it is.

**Alternatives:**

- One `UPDATE … WHERE NOT EXISTS` instead of the loop: fewer queries,
  but harder to read and unlike the transfers around it. A merged
  account holds a handful of rows, so the loop costs nothing.
- Drop the `deleteByUserId()` call and rely on the foreign key's
  `ON DELETE CASCADE` when the user is deleted. That still deletes the
  rows rather than moving them.

**What goes with it:**

- No API, hook or screen change. `UserAction::mergeUsers` fires as before.
- Merges made before the fix: the deleted rows leave no trace, so there
  is nothing to repair from.
- Left out, a separate finding: the merged account's places in
  discussions and tasks (`edit_task_participants`) are dropped by the
  user delete's cascade rather than handed over (named in
  [pkp-e2e#10](https://github.com/jardakotesovec/pkp-e2e/issues/10)).
- Backport: the same code is on 3.5 and 3.4. On 3.3 the method body
  differs. The call is in `PKPUserAction::mergeUsers()`, and the 3.3
  table has neither `user_group_id` nor the row id
  `subeditor_submission_group_id` (added by 3.4's `I3573_AddPrimaryKeys`).
  There the move is an update keyed on (`context_id`, `assoc_id`,
  `assoc_type`, `user_id`), with the duplicate check on the first three,
  written in that DAO's `$this->retrieve()` / `$this->update()` style.
- Guard: a pkp-lib unit test that merges a user assigned to a section and
  a category, one of them already held by the kept account; and an
  end-to-end test of the merge that reads the section's window afterwards.

Small: it follows the transfer pattern already in the method, in one
repository.

## Evidence

- Kept script, which takes the Steps on the three apps and records each
  screen:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-drops-section-editor-assignment/walk.js)
  with its helpers in
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-drops-section-editor-assignment/lib.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/merge-drops-section-editor-assignment/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Besides the
  screens it reads `subeditor_submission_group` before and after the
  merge and the new submission's `stage_assignments`, which matched the
  screens. The emails in Observed were read from the install's mail
  catcher after the walk.
- The neighbour check is the same script with `NEIGHBOUR=1`: it merges
  David Buskins into Stephanie Berardo, who is already assigned to the
  same section on OJS and OPS (the duplicate path) and to "Political
  Economy" on OMP, and reads every section's window. Without the fix,
  OMP's "Library & Information Studies" was left with "None". With it,
  that series listed Stephanie Berardo; on OJS and OPS she stayed ticked
  once with no error, and "Reviews" and "Political Economy" were
  unchanged. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/merge-drops-section-editor-assignment/fix.diff ojs omp ops`,
  then walk.js with and without `NEIGHBOUR=1`, then
  `node bin/try-fix.js revert …`.
- Walked on PostgreSQL. Each install was freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, and
  no upgrade was needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6). `Repository.php` and
    `SubEditorsDAO.php` are the same in both pkp-lib commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00 and OPS cf4fce69bd
    (lib/pkp a9c76aed62). Observed matched `main` on all three apps;
    `mergeUsers()` has the same two lines (367–368).
- 3.4 and 3.3 were read in the code. pkp-lib `stable-3_4_0`
  (df13621c2d): `classes/user/Repository.php` `mergeUsers()` calls
  `SubEditorsDAO::deleteByUserId($oldUserId)` (line 369), and
  `AssignEditors` assigns new submissions from those rows. pkp-lib
  `stable-3_3_0` (d446601ebe): `classes/user/PKPUserAction.inc.php`
  `mergeUsers()` calls it too (line 82), and
  `PKPSubmissionSubmitStep4Form` assigns new submissions from the
  section's and categories' rows.
- Introduced: `git blame` on the call gives 3422419e5c (2021, the move of
  `UserAction` into the user repository); `git log -S` gives
  698b257e6c (2019, "Share UserAction", the move from the apps into
  pkp-lib) and, in pkp/ojs, d3d59e3fdc ("#2082# Added Merge Users
  function"), which already called
  `$sectionEditorsDao->deleteEditorsByUserId($oldUserId)`.
- Upstream search, 2026-10-01: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `mergeUsers`, `SubEditorsDAO` and `deleteByUserId`.
  `pkp/pkp-lib#4073` (closed) lists other tables a merge left behind and
  does not name the section assignments.
- MySQL not checked.
