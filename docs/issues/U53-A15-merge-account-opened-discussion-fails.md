# Merging a user recorded as a discussion's or task's creator stops halfway with no message, and the account still signs in

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11587` for `pkp/pkp-lib#10406` · [134f6f077b](https://github.com/pkp/pkp-lib/commit/134f6f077b893e139675ed3fedc2cb4645df4c3a) · 2025-04-01 (merged 2025-08-05) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U53 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a15)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager merges one user account (the merged account) into another (the
chosen account). The app fails on the server partway through. After "OK"
in the "Confirm" dialog nothing seems to happen: the dialog and the
"Merge user" window stay open, and no message appears.

By then the merge has already handed the merged account's roles,
submission assignments and messages to the chosen account. But the
merged account is not deleted. It no longer appears under "Users &
Roles", yet it still signs in with its username and password, and its
discussions still name it as their creator. After a reload the merge
looks done.

This happens whenever the merged account is recorded as the creator or
starter of a discussion or task on any submission. That covers anyone
who opened a discussion or added a task, and any editor who recorded a
recommendation, which opens a discussion in the editor's name. It also
covers any participant who was sent a message with the Participants
list's "Notify", which records the recipient as the creator. Merging an
account that only takes part in someone else's discussion works. No
release is affected: the fault is only on `main`, which is not yet
released.

## Impact

- **Lost.** The merged account survives, can still sign in, and stays
  named as the creator of its discussions. Nobody is told that the merge
  failed.
- **Who.** A Journal Manager, Press Manager or Preprint Server Manager
  (or the Site Administrator) who merges duplicate accounts under
  Settings › "Users & Roles", whenever the merged account is recorded as
  the creator or starter of a discussion or task. Editors are recorded
  that way in ordinary work. On an install upgraded from 3.5, the upgrade
  records the author of each discussion's first message as its creator,
  so every account that ever started a discussion there is affected.
- **Way round.** None on screen: the merged account has no role left, so
  "Users & Roles" does not list it, and it cannot be picked for a merge
  again. The command-line merge tool (`tools/mergeUsers.php`) calls the
  same code, so it fails too. The only way round today is to edit the
  database.

Medium: merging duplicate accounts is a housekeeping job rather than a
core editorial one. It fails silently for a large group of accounts, with
no way round, but the account left behind has no roles and reaches no
editorial work. It would be high if that account could still reach the
journal's submissions.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Every password
  is the username twice (`rvaca` / `rvacarvaca`).
- OJS and OMP: nothing more. The dataset already holds a discussion,
  "Editor Recommendation". It was created when `minoue` (Minoti Inoue,
  Section editor; on a press, Series editor; user ID 6) recorded a
  recommendation. It is on OJS submission 2, "The influence of lactation
  on the quantity and quality of cashmere production" (Review), and on OMP
  submission 6, "The Information Literacy User's Guide" (Internal Review).
  Its row reads "Created by: minoue".
- OPS: the dataset holds no discussion, so one is opened:
  1. Sign in as `dbuskins` (David Buskins, Moderator, user ID 4).
  2. Open submission 1, "The influence of lactation on the quantity and
     quality of cashmere production" (Production).
  3. In "Production Tasks & Discussions" click "Add".
  4. Enter the "Name" "u53r3 Figures question", tick the author Carlo
     Corino (`ccorino`), type a message and click "Save".
  5. Sign out.

  On OPS, the merged account below is `dbuskins`; the brackets give its
  values.

Steps:

1. Sign in as `rvaca` (Ramiro Vaca, the manager of the journal, press or
   server).
2. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
3. On Minoti Inoue's row [OPS: David Buskins], click "…" › "Merge user".
4. In the "Merge user" window, on Stephanie Berardo's row (`sberardo`),
   click the arrow › "Merge into this User".
5. The "Confirm" dialog reads "Are you sure you wish to merge the account
   with the username "minoue" into the account with the username
   "sberardo"? The account with the username "minoue" will not exist
   afterwards. This action is not reversible." [OPS: "dbuskins" in place
   of "minoue"]. Click "OK".
6. Wait a few seconds, then reload "Users & Roles".
7. Open the submission from the preconditions and read the discussion's
   row, then open the discussion and read its first message. [3.5: the
   discussion is a row of the stage's "Discussions" list, and its "From"
   column names the creator. On OPS 3.5, the precondition's discussion is
   opened with that list's "Add discussion".]
8. Sign out. On the Login page, sign in as `minoue` / `minoueminoue`
   [OPS: `dbuskins` / `dbuskinsdbuskins`].

**Expected.** After "OK" the "Merge user" window closes, and Minoti Inoue
[OPS: David Buskins] leaves the list. The discussion reads "Created by:
sberardo", and its first message reads "Message from sberardo". Step 8 is
refused with "Invalid username/email or password. Please try again."

**Observed.** After "OK" the "Confirm" dialog and the "Merge user" window
stay open with no message. The request that "OK" sent answers 500 with an
empty body:

```
POST /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/merge-users?…&oldUserId=6&newUserId=5   500
```

[OPS: `oldUserId=4`.] The server log:

```
Uncaught PDOException: SQLSTATE[23503]: Foreign key violation: 7 ERROR:  update or delete on table "users" violates foreign key constraint "edit_tasks_created_by_foreign" on table "edit_tasks"
DETAIL:  Key (user_id)=(6) is still referenced from table "edit_tasks". (… SQL: delete from "users" where "user_id" = 6)
```

After the reload, Minoti Inoue [OPS: David Buskins] is gone from the
list. The discussion's first message now reads "Message from sberardo",
but its row still reads "Created by: minoue" [OPS: "Created by:
dbuskins"]. Step 8 signs in and lands on the journal's home page
(`/index.php/publicknowledge/en/index`).

Control: on OJS and OMP, merging `dbuskins` (a participant in "Editor
Recommendation" who did not create it) into `dbarnes` completes. The
window closes, `dbuskins` is refused at sign-in, and the discussion still
reads "Created by: minoue". On 3.5, the Steps as written complete on all
three apps.

## Cause

`PKP\user\Repository::mergeUsers()` (lib/pkp
`classes/user/Repository.php`, line 326 on main) hands the merged
account's records to the chosen account one table at a time: files,
notes (the messages in discussions), decisions, review assignments,
logs, comments, notifications, roles and stage assignments. Then it
deletes the merged account (line 423). It has no step for editorial
tasks and discussions (`edit_tasks`).

`pkp/pkp-lib#10406` replaced `queries` with `edit_tasks` for 3.6
(`SubmissionsMigration`, 134f6f077b, merged in `pkp/pkp-lib#11587`). That
change gave each discussion a `created_by` column with a foreign key to
`users` and no delete rule:

```php
$table->bigInteger('created_by')->nullable()->default(null);
$table->foreign('created_by')->references('user_id')->on('users');
```

`started_by`, the user who started a task, was added in 0f58eeeea5
(2025-09-16) with `->cascadeOnDelete()`. Four days later, 021cfa4ce4
removed that cascade in `SubmissionsMigration` and `I11701_Notes`. Both
commits were merged together in `pkp/pkp-lib#11828` (for
`pkp/pkp-lib#11701`) on 2025-09-22, so `main` has never had a delete rule
on `started_by`. It is a second blocker of the same kind.

`mergeUsers()` moves neither column, so its final `DELETE FROM users` is
refused whenever either names the merged account. The method runs
without a transaction, and so do its callers, so everything it did
before that point stays done. That includes removing the merged
account's roles. They are deleted, not given an end date as "Remove"
does, so the account drops out of the Users list, which does list users
whose roles have ended.

`created_by` is written by:

- "Add" in a stage's "Tasks & Discussions", for a discussion or a task
  (`EditorialTaskController`, `AddTask`);
- recording a recommendation (`IsRecommendation` calls
  `Repo::editorialTask()->addQuery()` with the recommending editor as
  `fromUser`); the dataset's "Editor Recommendation" is one;
- the Participants list's "Notify" (`PKPStageParticipantNotifyForm`
  line 204). It records the notified participant, not the sender, as
  creator, so even an author who received such a message cannot be
  merged;
- the 3.6 upgrade (`I10406_EditorialTasks`), from the author of each
  discussion's first message.

Discussions created from templates are left with no creator.
`started_by` is written when a task is started (`EditorialTaskController`
line 579).

Reach:

- "Merge user" under Settings › "Users & Roles"
  (`UserGridHandler::mergeUsers()`): fails; reproduced on OJS, OMP and
  OPS.
- The command-line tool `php tools/mergeUsers.php` (`MergeUsersTool`):
  calls the same method through the app's `Repo::user()`, so it fails the
  same way (checked in the code).
- A task created or started by the merged account blocks the delete the
  same way (checked in the code, not walked).
- In `users`' other foreign keys, only `review_assignments.reviewer_id`
  also has no delete rule, and `mergeUsers()` already moves it. Every
  other key either cascades or sets null (checked in the database of the
  main install).

## Proposed fix

A proposal, tried on main:
[`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-account-opened-discussion-fails/fix.diff)
was applied to OJS, OMP and OPS. With it, the Steps show Expected on all
three apps, and the control merge gives the same result with the fix as
without it.

Recommended: give the editorial task repository a `transfer()` and call
it from `mergeUsers()`, next to `Repo::note()->transfer()`. This is how
notes and notifications are already handed over
(`PKP\note\Repository::transfer()`,
`PKP\notification\Repository::transfer()`):

```diff
 // lib/pkp/classes/editorialTask/Repository.php
+    public function transfer(int $oldUserId, int $newUserId): void
+    {
+        EditorialTask::where('created_by', $oldUserId)->update(['created_by' => $newUserId]);
+        EditorialTask::where('started_by', $oldUserId)->update(['started_by' => $newUserId]);
+    }

 // lib/pkp/classes/user/Repository.php, mergeUsers()
         Repo::note()->transfer($oldUserId, $newUserId);
+        Repo::editorialTask()->transfer($oldUserId, $newUserId);
```

This keeps what `pkp/pkp-lib#10406` and 021cfa4ce4 wanted: the task
keeps a recorded creator and starter, and deleting a user does not
silently delete tasks. It also hands the task to the surviving account,
as the merge already does with the discussion's messages. Eloquent's
`update()` also bumps `updated_at` on the moved rows, as the note and
notification transfers do; no screen shows that column.

**Alternatives:**

- Set the two foreign keys to `nullOnDelete()`. 3.6 is unreleased, so
  `SubmissionsMigration`, `I10406_EditorialTasks` and `I11701_Notes`
  could be edited in place, as 021cfa4ce4 already did, with no new
  migration. The cost is the record itself: each merged account's
  discussions would lose their creator ("Created by" empty) instead of
  naming the chosen account. The same would happen to any deleted user's
  discussions.
- Add a transaction, so a failure leaves both accounts as they were
  rather than half merged. `DB::transaction()` inside pkp-lib's
  `mergeUsers()` would not cover OJS's and OMP's own
  `APP\user\Repository::mergeUsers()`, which move subscriptions and
  payments after the parent method returns. So it belongs at the callers
  (`UserGridHandler::mergeUsers()`, `MergeUsersTool`). It is worth doing
  as hardening, but on its own the merge would still fail.

**What goes with it:**

- No API or hook change. `UserAction::mergeUsers` fires as before, and
  the grid answers with its `userMerged` event.
- Accounts already left half merged: the fix does not repair them, and
  the merged account's row stays. A site that met this before the fix
  can finish each merge by running it again with the command-line tool.
  The tool takes usernames and needs no role, so the unlisted account can
  be named, for example `php tools/mergeUsers.php sberardo minoue`
  (chosen account first). What remains to move by then is the
  `created_by` / `started_by` references, which the fixed method moves
  before it deletes the account. This was read in the code, not tried.
- Left out, a separate finding: `edit_task_participants.user_id`
  cascades on delete. A merged account's memberships in discussions are
  dropped rather than handed to the chosen account. With the fix, the OPS
  walk's discussion reads "Created by: sberardo" but lists only Carlo
  Corino as a participant. 3.5 drops `query_participants` the same way.
- Backport: none needed. 3.5 and older have no creator column.
- Guard: a pkp-lib unit test that merges a user who created a
  discussion, created a task and started a task; and an end-to-end test
  that merges the recommending editor of a submission.

## Evidence

- Kept script that runs the Steps on the three apps, each on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  2026-09-30, the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade
  needed):
  [`shared/playwright/checks/issues/merge-account-opened-discussion-fails/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-account-opened-discussion-fails/walk.js),
  run with `PROBE_FEATURE=issues-r3 PROBE_AGENT=r3 node bin/probe.js all shared/playwright/checks/issues/merge-account-opened-discussion-fails/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). Besides the screens,
  the script reads the merged account's row and roles,
  `edit_tasks.created_by` / `started_by` and the participants (3.5:
  `notes`, `query_participants`) in the database, before and after. After
  the failed merge, the merged account held no rows in `user_user_groups`.
- The fix was walked with `walk.js`, and with
  [`neighbour.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/merge-account-opened-discussion-fails/neighbour.js)
  (OJS and OMP, `dbuskins` into `dbarnes`) with the fix in and out.
- The server log line was read from the app's log for all three 500s.
- main walked at OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6). 3.5 walked at OJS 92b9a16b48, OMP
  3081c9b00 and OPS cf4fce69bd (lib/pkp a9c76aed62). In the code, 3.5's
  `queries` table has no user column, and its `mergeUsers()` moves the
  notes that name a discussion's author.
- Introduced: `git blame` on the `created_by` foreign key line of
  `SubmissionsMigration.php` gives 134f6f077b (authored 2025-04-01),
  which adds the same key in `I10406_EditorialTasks`. `started_by`:
  `git log -S started_by` gives 0f58eeeea5 (added with a cascade) and
  [021cfa4ce4](https://github.com/pkp/pkp-lib/commit/021cfa4ce4df68a80fbfe5a9de56e9297e4ea65e)
  (cascade removed, "Adjustments for Editorial Task Model"). Both are
  merged by b42bd5bd37, the merge of `pkp/pkp-lib#11828`.
- 3.4 by code: lib/pkp `origin/stable-3_4_0` (df13621c2d). `queries` has
  no user column, and `Repository::mergeUsers()` moves the notes.
- 3.3 by code: lib/pkp `origin/stable-3_3_0` (d446601ebe). `queries` has
  no user column and no foreign keys, and `PKPUserAction::mergeUsers()`
  moves the notes.
- Upstream search, 2026-09-30: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `mergeUsers`, `edit_tasks` and `created_by`. `pkp/pkp-lib#10143` is the
  same kind of foreign-key refusal, on `review_assignments` in the
  unvalidated-users cleanup.
- Not driven: MySQL not checked. The recommendation, "Notify" and task
  paths, and the command-line tool, before and after the fix, were read
  in the code only.
- Unverified: the repair by rerunning the command-line tool.
