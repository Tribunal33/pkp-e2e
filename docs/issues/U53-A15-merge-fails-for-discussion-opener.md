# Merging an account that opened a discussion fails without a message and leaves the account behind

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code; discussions record no creator)
  - 3.3: none (code; discussions record no creator)
- **Introduced** PR `pkp/pkp-lib#11587` for `pkp/pkp-lib#10406` · [134f6f077b](https://github.com/pkp/pkp-lib/commit/134f6f077b893e139675ed3fedc2cb4645df4c3a) · 2025-04-01 (merged 2025-08-05) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02); `pkp/pkp-lib#4073` (closed 2023) listed discussion participants among the records a merge leaves behind, and its fix covered other tables
- **Tracked in** spec U53 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a15)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager merges an account that once opened a discussion on a
submission into another account (the chosen account). After "OK" in the
"Confirm" dialog nothing seems to happen: the dialog and the "Merge
user" window stay open and no message appears, because the app failed
on the server partway through the merge.

By then the merged account's roles and its assignments on submissions
have moved to the chosen account, but the merged account is not
deleted. It holds no role, no longer shows in Users & Roles, and still
signs in with its old username and password. The discussion still names
it as its creator. A second merge, which only the Site Administrator can
start once the account has left Users & Roles, fails the same way.

On `main` such accounts are common: recording a recommendation opens a
discussion in the editor's name, and an author's "Comments for the
Editor" become a discussion opened by that author. Released versions
are not affected.

## Impact

- **Lost**: the merge, left half done. Moved to the chosen account
  before the failure: the account's roles, its assignments on
  submissions, its review assignments, uploaded files, messages,
  decisions, log entries and notifications. Deleted for good: its
  section and series editor assignments (a fault of its own,
  [U53 A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A9-merge-drops-section-editor-assignments.md)).
  Left with the old account: the discussions and tasks it opened or
  started, and its entries as a discussion participant. The old account
  then reaches only the public pages and its own profile, since the
  dashboard and the workflow need a role or an assignment (code).
- **Who**: Journal, Press and Server Managers and Site Administrators
  on `main` who merge an account that opened a discussion or started a
  task.
- **Way round**: none that keeps the data. Deleting every discussion
  and task the account opened or started (each row's menu › "Delete",
  which deletes their messages too) lets a second merge from the Site
  Administrator's grid finish; no screen lists which discussions those
  are (code). The command-line tool (`tools/mergeUsers.php`) fails the
  same way.

High: merging is a secondary task, and on `main` it fails for most
editors' and many authors' accounts, half done and without a word, with
no way round that keeps the discussions. It would be medium if
merging those accounts turned out to be rare in practice.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main`. In OJS, submission 2 "The
  influence of lactation on the quantity and quality of cashmere
  production" holds, at Review, the discussion "Editor Recommendation",
  which `minoue` (Minoti Inoue) opened when she recorded her
  recommendation. In OMP, submission 6 "The Information Literacy User's
  Guide" holds the same discussion at Internal Review.
- OPS: the dataset holds no discussion, so steps 1–4 open one.

OPS only, opening a discussion:

1. Sign in as `dbuskins` (David Buskins, a Moderator of submission 1).
2. Open submission 1 "The influence of lactation on the quantity and
   quality of cashmere production", "Production Tasks & Discussions".
3. "Add": name "u53r5 merge check", tick Stephanie Berardo, any
   message.
4. "Save", then sign out.

Merging (OJS, OMP: `minoue` into `dbuskins`; OPS: `dbuskins` into
`minoue`):

5. Sign in as `rvaca` (Ramiro Vaca, the manager).
6. Settings › Users & Roles, "Users". Search "Inoue" (OPS: "Buskins").
7. On the row's "…" choose "Merge user".
8. In "Merge user" press "Search", type "Buskins" (OPS: "Inoue"),
   "Search".
9. On that row's arrow choose "Merge into this User". "Confirm" asks
   "Are you sure you wish to merge the account with the username
   "minoue" into the account with the username "dbuskins"? The account
   with the username "minoue" will not exist afterwards. This action is
   not reversible."
10. "OK".

After the merge:

11. Reload Settings › Users & Roles and search "Inoue" (OPS: "Buskins").
12. Sign out and sign in as `minoue` / `minoueminoue` (OPS: `dbuskins` /
    `dbuskinsdbuskins`).
13. As `rvaca`, open the submission's discussion panel (OJS submission
    2, "Review Tasks & Discussions"; OMP submission 6, the same; OPS
    submission 1, "Production Tasks & Discussions") and read the line
    under the discussion's name.

**Expected**: after "OK" the window closes and the merged account is
gone. Its username is refused at sign-in ("Invalid username/email or
password. Please try again."), and the discussion reads "Created by:
dbuskins" (OPS: "Created by: minoue").

**Observed**:

- 10: the "Confirm" dialog and the "Merge user" window stay open, with
  no message. The request answers 500:

  ```
  POST /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/merge-users?…&oldUserId=6&newUserId=4  → 500
  PHP Fatal error: Uncaught PDOException: SQLSTATE[23503]: Foreign key violation: 7 ERROR: update or delete on table "users" violates foreign key constraint "edit_tasks_created_by_foreign" on table "edit_tasks"
  ```

- 11: "Current Users (0)", "No Items": the account holds no role here
  any more.
- 12: the sign-in succeeds and lands on the journal's (press's,
  server's) home page.
- 13: the discussion still reads "Created by: minoue" (OPS: "Created
  by: dbuskins"). On OPS the participants list David Buskins without
  his "Moderator" role, which has moved to Minoti Inoue.

Control: on 3.5 the same steps merge the account. The window closes,
`minoue` is refused at sign-in, and the discussion grid names
`dbuskins`.

## Cause

`PKP\user\Repository::mergeUsers()` (lib/pkp) moves the old account's
records to the new one, table by table: submission files, notes,
decisions, review assignments, logs, comments, notifications, roles and
stage assignments. It ends by deleting the old account
(`$this->delete($this->get($oldUserId, true))`). It never moves the
discussions and tasks the account created or started.

`pkp/pkp-lib#11587` (the tasks and discussions rework) gave
`edit_tasks` a `created_by` column with a foreign key to `users` and no
delete action (`SubmissionsMigration`; on upgrade
`I10406_EditorialTasks`, which fills it from each discussion's first
message). A new discussion or task takes it from whoever opens it.
`pkp/pkp-lib#11828` added `started_by` the same way (on upgrade
`I11701_Notes`). The database therefore refuses to delete a user still
named in either column, and the merge stops at its last step.
It runs in no transaction, so everything before the delete stays done.
`UserGridHandler::mergeUsers()` catches nothing, and the legacy
confirmation leaves its dialog open on a failed request.

These two columns are the only foreign keys to `users` that neither
cascade nor set null and that the merge leaves in place (the third,
`review_assignments.reviewer_id`, it moves), read from the schema of
all three apps, so moving them completes the merge.

Reach:

- `edit_tasks.started_by`: an account that started a task fails the
  same way (code).
- `tools/mergeUsers.php` (`MergeUsersTool`) calls the same method and
  fails the same way (code).
- A second merge of the half-merged account meets the same foreign key,
  since nothing the first attempt did touched `edit_tasks` (code). It
  can only be started by the Site Administrator: Administration ›
  "Hosted Journals", the journal's arrow › "Settings wizard", tab
  "Users", "Search" with "Include users with no roles in this journal."
  ticked, the account's arrow › "Merge User".
- Who opens a discussion: anyone who adds a discussion or task; an
  editor who records a recommendation (`IsRecommendation`, the
  "Editor Recommendation" discussion); the submitting author when
  "Comments for the Editor" is filled
  (`addCommentsForEditorsQuery()`); anyone who notifies a participant
  from the Participants list (`PKPStageParticipantNotifyForm`) (code).
- The merged account's entries as a discussion participant
  (`edit_task_participants`, whose foreign key deletes them with the
  account) are not moved either: on a merge that completes, the chosen
  account is not added to those discussions. Seen on `main`, OJS and
  OMP: after `dbuskins` was merged into `minoue`, "Editor
  Recommendation" no longer listed David Buskins, and Minoti Inoue was
  not added (the app does not make the recommending editor a
  participant of the discussion it opens for her). Seen on 3.5 too
  (OPS, `query_participants`): this part is older than the failure.

## Proposed fix

Move the tasks and discussions with the rest of the account's records:
a `transfer()` in `PKP\editorialTask\Repository`, called by
`mergeUsers()` beside `Repo::note()->transfer()`. It moves
`created_by`, `started_by` and the participant entries. Where both
accounts take part in the same discussion, the chosen account's entry
is kept, and marked responsible when the merged account's was.

```php
public function transfer(int $oldUserId, int $newUserId): void
{
    DB::table('edit_tasks')->where('created_by', $oldUserId)->update(['created_by' => $newUserId]);
    DB::table('edit_tasks')->where('started_by', $oldUserId)->update(['started_by' => $newUserId]);

    $heldTaskIds = Participant::query()->where('user_id', $newUserId)->pluck('edit_task_id')->all();
    $responsibleTaskIds = Participant::query()
        ->where('user_id', $oldUserId)
        ->where('is_responsible', true)
        ->whereIn('edit_task_id', $heldTaskIds)
        ->pluck('edit_task_id')
        ->all();

    Participant::query()
        ->where('user_id', $newUserId)
        ->whereIn('edit_task_id', $responsibleTaskIds)
        ->update(['is_responsible' => true]);
    Participant::query()
        ->where('user_id', $oldUserId)
        ->whereNotIn('edit_task_id', $heldTaskIds)
        ->update(['user_id' => $newUserId]);
}
```

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-fails-for-discussion-opener/fix.diff).
Tried on `main`, OJS, OMP and OPS: the merge answered 200, the window
closed, the merged account was refused at sign-in and the discussion
read "Created by: dbuskins" (OPS: "Created by: minoue", with Minoti
Inoue now among its participants). The neighbour check merged an
account that takes part in a discussion it did not open into another of
its participants (OJS: `sberardo` into `dbuskins`; OMP: `dbarnes` into
`dbuskins`; OPS: `sberardo` into `dbuskins` on step 3's discussion): with
and without the fix the merge completed and the discussion listed the
chosen account once.

It follows `Repo::notification()->transfer()`, as the note move does.
The participant rule follows the merge's own
stage-assignment loop, which drops a duplicate rather than writing it.
The creator columns are updated through `DB::table()` so that the
discussions' `updated_at` stays as it was. The held ids are read first
because MySQL refuses an update whose subquery reads the same table.

**Alternatives**:

- `ON DELETE SET NULL` on `created_by` and `started_by`: the merge
  would finish, but the discussions would lose their creator, which the
  merge is meant to keep. It needs a migration, and the participant
  entries would still be lost.
- A transaction around `mergeUsers()`: a failed merge would then change
  nothing, which is better than a half-merge, but the merge would still
  fail. Worth doing on its own, in the shared method, as
  [U52 A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U52-A11-merged-payer-breaks-payments-list-and-publishing.md)
  also notes.
- An error message in the "Merge user" window: the manager learns of
  the failure but still cannot merge.

**What goes with it**:

- No data repair. Accounts left half-merged before the fix can be
  merged again into the same account after it, from the Site
  Administrator's grid (Reach) or with `php tools/mergeUsers.php
  <chosen username> <merged username>` (code; not tried).
- The lost participant entries on 3.5 would need the same move for
  `query_participants` there.
- The guard: a unit test in pkp-lib of `mergeUsers()` with a discussion
  the old account created, a task it started and a discussion where
  both accounts take part. In this repository, the U53 merge scenario
  (a **Planned** item in the spec) with a discussion opener.

Small: one method in the shared repository and one call, with no data
repair, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-fails-for-discussion-opener/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-fails-for-discussion-opener/lib.js),
  run on an install freshly loaded from the default dataset:
  `node bin/probe.js all shared/playwright/checks/issues/merge-fails-for-discussion-opener/walk.js [neighbour]`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PKP's
  default test dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL.
  MySQL not checked; its foreign keys refuse the delete in the same
  way (unverified). The participant read in the Cause comes from the
  walk of [U53 A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A9-merge-drops-section-editor-assignments.md),
  which merges `dbuskins` into `minoue` on the same dataset.
- 3.5 (walked, the Control): `queries` has no user column, and
  `mergeUsers()` moves the notes, from which the grid reads the
  creator. 3.4 (code): `queries` has no user column
  (`SubmissionsMigration`), and `mergeUsers()` moves the notes through
  `NoteDAO`. 3.3 (code): `PKPUserAction::mergeUsers()` moves the notes,
  and the schema has no foreign keys.
- Not walked: the way round (deleting the discussions, then a second
  merge from the Site Administrator's grid), and what the left-over
  account reaches beyond its first page; both read from
  `EditorialTaskController::deleteTask()`, `PKPDashboardHandler` and
  `mergeUsers()`.
- Introduced: `git blame` on `created_by` in `SubmissionsMigration`
  and `I10406_EditorialTasks` gives 134f6f077b ("pkp/pkp-lib#10406
  Migration schema for tasks and discussions"), merged in
  `pkp/pkp-lib#11587`; `mergeUsers()` was not changed with it.
  `started_by` and its foreign key are 0f58eeeea5 and 021cfa4ce4
  (`pkp/pkp-lib#11828`, for `pkp/pkp-lib#11701`).
- Upstream: `pkp/pkp-lib#11442` (open) asks for a new merge workflow,
  not this fault.
- Tips: OJS `main` b84f8e2e44 (pkp-lib ddd8ab243a); OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7 (pkp-lib 3dc90c81a6, the same
  `mergeUsers()` and `editorialTask\Repository`); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335).
  Code reads: pkp-lib `stable-3_4_0` 32b0f4b4af and `stable-3_3_0`
  f6ab331645.
