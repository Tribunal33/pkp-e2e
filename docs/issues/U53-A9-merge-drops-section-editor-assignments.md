# Merging a section editor's account silently drops them from their sections instead of moving them

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [d3d59e3fdc](https://github.com/pkp/ojs/commit/d3d59e3fdc6d0c7c17f7c83e4a6854318daa001c) (2006-03-07), the OJS commit that added merging users
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager merges the account of a section editor (a press's series
editor, a preprint server's moderator) into another account (the chosen
account). The merge moves the account's roles, review assignments and
assignments on submissions to the chosen account, but not its
assignment as an editor of its sections: in the section's "Edit" window
the merged editor's box is gone and the chosen account's box stays
unticked.

New submissions to the section are no longer assigned to the person. A
section that had no other editor assigns nobody, and its new
submissions wait under the managers' "Needs editor" view until a
manager assigns an editor by hand. Nothing says why; a manager who
looks can tick the chosen account in the section's "Edit" window. The
same happens to an editor assigned to a category.

## Impact

- **Lost**: the person's editor assignment on each section, series and
  category they edited, with nothing recorded of which they were.
- **Who**: Journal, Press and Server Managers and Site Administrators
  who merge the account of a section editor, series editor or
  moderator; and the authors of the next submissions to those sections.
  A manager first notices through a new submission under "Needs editor"
  from a section that used to assign one, or the person through the
  submissions that stop reaching them; where other editors remain on
  the section, nothing on screen shows the loss.
- **Way round**: tick the chosen account in each section's (category's)
  "Edit" window; this restores the assignment under the role it shows.

Medium: an editorial assignment is lost silently, in the rarely met case
of merging an editor's account, with a way round on screen once it is
noticed.

## Steps to reproduce

Preconditions: PKP's default test dataset, `main`. `dbuskins` (David
Buskins) is assigned as an editor of the OJS section "Articles", the
OMP series "Library & Information Studies" and the OPS section
"Preprints". `minoue` (Minoti Inoue) holds the same role and edits none
of them.

1. Sign in as `rvaca` (Ramiro Vaca, the manager).
2. Settings › Journal › "Sections" (OMP: Settings › Press › "Series";
   OPS: Settings › Server › "Sections"). On the row "Articles" (OMP
   "Library & Information Studies", OPS "Preprints") press the arrow,
   then "Edit". "Assign David Buskins as Section editor" (OMP "…as
   Series editor", OPS "…as Moderator") is ticked, "Assign Minoti Inoue
   as Section editor" is not. "Cancel".
3. Settings › Users & Roles, "Users": search "Buskins", the row's "…" ›
   "Merge user".
4. In "Merge user" press "Search", type "Inoue", "Search"; on Minoti
   Inoue's row the arrow › "Merge into this User", then "OK" in
   "Confirm".
5. Open step 2's "Edit" window again.

**Expected**: "Assign Minoti Inoue as Section editor" is ticked: the
account David Buskins's account was merged into now edits the sections
he edited.

**Observed**: the merge answers 200 and the window closes. In the "Edit"
window David Buskins's box is gone and "Assign Minoti Inoue as Section
editor" (Series editor, Moderator) is unticked. The ticked boxes:

- OJS "Articles": before "Daniel Barnes", "David Buskins", "Stephanie
  Berardo"; after "Daniel Barnes", "Stephanie Berardo".
- OMP "Library & Information Studies": before "David Buskins"; after
  none.
- OPS "Preprints": before "David Buskins", "Stephanie Berardo"; after
  "Stephanie Berardo".

## Cause

`PKP\user\Repository::mergeUsers()` (lib/pkp) moves the old account's
roles (`user_user_groups`, copied unless the new account already holds
the role) and its stage assignments to the new account. Among the steps
it treats as clean-up before the delete, beside the temporary files, it
calls `SubEditorsDAO::deleteByUserId($oldUserId)`. That deletes every
row of `subeditor_submission_group` for the account, its assignments as
an editor of sections, series and categories, and nothing writes them
for the new account. The rows' `user_id` foreign key cascades on delete,
so they would go with the account anyway: the merge has to write them
for the new account before that.

The delete has been in the merge since OJS added it in 2006
(d3d59e3fdc, then `SectionEditorsDAO::deleteEditorsByUserId()`); it
moved into `UserAction` in 2009 (4c489b63f4) and later into pkp-lib.

Reach:

- Category editors (Settings › Journal › "Categories"; Settings › Press
  and Settings › Server on the other apps; the same table with the
  category association) are dropped the same way (code).
- New submissions: `SubEditorsDAO::assignEditors()` assigns the editors
  of the submission's section and of its categories when it is
  submitted, from these rows, so the merged person is no longer
  assigned (code). A submission left with no manager or section editor
  assigned is listed in the managers' "Needs editor" dashboard view
  (`DashboardView::TYPE_NEEDS_EDITOR`, `isUnassigned`) (code).
- `tools/mergeUsers.php` (`MergeUsersTool`) calls the same method
  (code).
- A merge that fails partway
  ([U53 A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A15-merge-fails-for-discussion-opener.md))
  has already deleted the rows when it fails (code).

## Proposed fix

Move the assignments instead of deleting them: a
`SubEditorsDAO::transfer($oldUserId, $newUserId)` that writes each of
the old account's rows for the new account unless it already holds
that assignment, then deletes the old rows. `mergeUsers()` calls it in
place of `deleteByUserId()`.

```php
public function transfer(int $oldUserId, int $newUserId): void
{
    $assignments = DB::table('subeditor_submission_group')
        ->where('user_id', '=', $oldUserId)
        ->get();

    foreach ($assignments as $assignment) {
        $exists = DB::table('subeditor_submission_group')
            ->where('context_id', '=', $assignment->context_id)
            ->where('assoc_id', '=', $assignment->assoc_id)
            ->where('assoc_type', '=', $assignment->assoc_type)
            ->where('user_group_id', '=', $assignment->user_group_id)
            ->where('user_id', '=', $newUserId)
            ->exists();

        if (!$exists) {
            $this->insertEditor($assignment->context_id, $assignment->assoc_id, $newUserId, $assignment->assoc_type, $assignment->user_group_id);
        }
    }

    $this->deleteByUserId($oldUserId);
}
```

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-drops-section-editor-assignments/fix.diff).
Tried on `main`, OJS, OMP and OPS: after the merge "Assign Minoti
Inoue as Section editor" (Series editor, Moderator) was ticked beside
the section's other editors. Merging an editor into one already
assigned to the same section (the neighbour check: Stephanie Berardo
into David Buskins, on OMP after ticking her on the series first)
completed with and without the fix, without an error, David Buskins
ticked once.

It follows the merge's own role loop a few lines below, which copies a
role unless the new account already holds it and then deletes the old
account's, and it writes through the DAO's existing `insertEditor()`.
The duplicate check matches the table's unique key
(`section_editors_unique`). Each moved row keeps its role
(`user_group_id`); the role loop gives the new account that role unless
it already holds it, whether or not that holding has ended. Where the
new account's holding has ended, the moved row stays and
`assignEditors()` skips it, as it skips every editor whose role has
ended, so no guard is needed. The closing `deleteByUserId()` is
redundant with the cascade and kept for clarity.

**Alternatives**:

- One `UPDATE … SET user_id` with a `NOT EXISTS` on the same table:
  shorter, but MySQL refuses an update whose subquery reads the table
  being updated.
- Leaving the delete and telling the manager in the "Confirm" dialog
  to reassign the sections: the work stays manual and easy to miss.

**What goes with it**:

- No data repair: the deleted rows are gone, and nothing records which
  sections a merged account edited.
- The diff applies to 3.5 as it stands. On 3.4 the DAO part applies,
  but the `Repository.php` hunk does not (its role loop differs), so the
  one changed call is made by hand. 3.3's table has no `user_group_id`,
  so a backport there drops that column from the check and the insert.
- The guard: a unit test in pkp-lib of `mergeUsers()` with an old
  account assigned to a section and a category, one of them shared
  with the new account.

Small: one DAO method and one changed call in pkp-lib, with no data
repair, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-drops-section-editor-assignments/walk.js),
  with the helpers of
  [the U53 A15 walk's lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-fails-for-discussion-opener/lib.js),
  run on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/merge-drops-section-editor-assignments/walk.js [neighbour]`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PKP's
  default test dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL;
  the same boxes before and after on both lines. MySQL not checked.
- 3.4 (code): `Repository::mergeUsers()` calls
  `$subEditorsDao->deleteByUserId($oldUserId)` as on `main`. 3.3
  (code): `PKPUserAction::mergeUsers()` calls it too.
- Introduced: `git log -S` on the delete in OJS: d3d59e3fdc ("#2082#
  Added Merge Users function", 2006-03-07, `PeopleHandler`), moved by
  4c489b63f4 ("#2277# Refactor merge users", 2009) into `UserAction`,
  into pkp-lib by 698b257e6c (2019) and into the repository by
  3422419e5c (`pkp/pkp-lib#7127`). It deleted the assignments from the
  start, so no change made it wrong.
- Upstream: `pkp/pkp-lib#4073` (closed) concerns other tables.
- Tips: OJS `main` b84f8e2e44 (pkp-lib ddd8ab243a); OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6, the same
  `mergeUsers()` and `SubEditorsDAO`); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335). Code reads:
  pkp-lib `stable-3_4_0` 32b0f4b4af and `stable-3_3_0` f6ab331645.
