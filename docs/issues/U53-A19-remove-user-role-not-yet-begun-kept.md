# A manager cannot end a role that starts on a future date: "Remove User" fails or leaves it in place

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; roles have no start date)
  - 3.3: none (code; roles have no start date)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U53 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a19)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager can invite someone to a role that starts on a later date. On
Settings › Users & Roles, the list then shows the role with that start
date, and the row offers "Remove User". When the role is the user's only
one here, "OK" in the "Remove" dialog brings an "Error" dialog, "An
unexpected error has occurred. Please reload the page and try again.",
and the role stays. When the user also holds current roles, "OK" ends
those without a message and keeps the future role, so the user "removed"
from the journal still takes up that role on its start date.

The roles page cannot end it either. When the future role is the
user's only role, "Remove Role" answers "You cannot remove the role. At
least one role must be assigned to the user." When the user holds other
roles too, "Remove Role" on the future role ends in "Error" / "The
requested resource was not found."

## Impact

- **Lost:** control over who holds a role. From the start date the
  role counts in every permission check (code). A Section editor gets the
  editorial dashboard and any submission assigned to them. A
  manager-level role, such as "Journal editor", gets every submission.
- **Who:** managers who invite someone with a START DATE after today.
  The problem arises when the invitee accepts and the manager then
  removes the user, or wants to withdraw the role, before that date.
  The START DATE box starts empty and must be filled (code), so a later
  date is always the manager's own choice.
- **Way round:** before the invitee accepts, the manager can cancel the
  invitation with "Cancel Invite" on the "Invitations" list (code). After
  acceptance there is none until the role begins. The roles page shows a
  current role's start date as plain text, and only the role's masthead
  choice can be edited there, so the date cannot be moved to today
  (code). After the start date, "Remove User" works. "Disable User"
  locks the whole account, on every journal of the site.

Medium, although the case with current roles is quiet: "Remove User"
closes with no message, and the manager may take the user as gone. It
stays at medium because the list redraws that row at once, showing the
future role and its start date on the screen the manager is using. The
case also needs a later start date and an accepted invitation. It would
be high if the row no longer showed the role.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), context
  `publicknowledge`. `rvaca` (Ramiro Vaca) is its manager. The steps use
  the role "Section editor" ("Series editor" on OMP, "Moderator" on OPS)
  and the START DATE 2027-06-01, which stands for any date after today.

A newcomer whose only role starts later:

1. Sign in as `rvaca` and open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
2. Press "Invite to a role". Type `u53r12@mailinator.com` under "Search
   for a user by email address" and press "Search User".
3. Given Name "U53r12", Family Name "Newcomer". In the role row, choose
   "Section editor", START DATE 2027-06-01 and "Appear on the masthead".
   Press "Save And Continue", then "Invite user to the role".
4. Sign out. In the email "You are invited to new roles" to
   u53r12@mailinator.com ("Starting from 2027-06-01"), follow the accept
   link.
5. Create the account: Username `u53r12`, Password `u53r12u53r12`, tick
   the privacy statement, "Save and continue"; Country "Canada", "Save
   and continue"; then "Accept And Continue to OJS" ("OMP", "OPS").
6. Sign in as `rvaca` and open Settings › "Users & Roles". Search for
   "Newcomer". The row reads "U53r12 Newcomer", "Section editor",
   "2027-06-01".
7. On that row, open "More Actions" and choose "Remove User". In
   "Remove" ("Remove this user from this journal? This action will
   unenroll the user from all roles within this journal."; "press" on
   OMP, "server" on OPS), press "OK".
8. Press "OK" in the dialog that opens. Reload the page and open the
   row's "More Actions" again.

A user who also holds current roles (Zita Woods, `zwoods`, on OJS and
OPS; Zayan Zedd, `zzedd`, on OMP: Author and Reader):

9. As `rvaca`, on Zita Woods's row open "More Actions" › "Edit". Press
   "Add Another Role": "Section editor", START DATE 2027-06-01, "Appear
   on the masthead". Press "Save And Continue", then "Invite user to the
   role".
10. Sign out. Follow the accept link in the email to
    zwoods@mailinator.com and press "Accept And Continue to OJS".
11. As `rvaca`, on Zita Woods's row choose "More Actions" › "Remove
    User" › "OK". Reload the page and open the row's "More Actions".

The roles page (Carlo Corino, `ccorino`, on OJS and OPS; Arthur Clark,
`aclark`, on OMP: Author and Reader):

12. Give Carlo Corino the same role as in steps 9 and 10, and accept it.
13. As `rvaca`, open Carlo Corino's row › "More Actions" › "Edit". On the
    "Section editor" line (2027-06-01), press "Remove Role", then "Remove
    Role" in the confirmation.

**Expected:** each removal takes the future role away, as the dialog's
"…unenroll the user from all roles within this journal." promises. At
step 7 the newcomer no longer holds "Section editor" and the dialog
closes with no error. At step 11 all three roles end. At step 13 the
role goes and Author and Reader stay.

**Observed:** at step 7 an "Error" dialog opens:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

The request behind "OK" answers that the user has no role:

```
POST /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/remove-user?rowId=40
200 {"status":false,"content":"This user does not have any roles.","elementId":"0","events":[]}
```

After the reload the row still reads "Section editor", "2027-06-01", and
its menu still offers "Edit", "Email", "Login As", "Remove User",
"Disable User", "Merge user".

At step 11 the dialog closes with no message. After the reload the row
reads "Zita Woods", "Section editor", "2027-06-01", and its menu still
offers "Remove User". Author and Reader have ended; "Section editor"
from 2027-06-01 is still assigned.

At step 13 an "Error" dialog reads "The requested resource was not
found." The request answers:

```
PUT /index.php/publicknowledge/api/v1/users/18/endRole/5
404 {"error":"The requested resource was not found."}
```

After a reload the roles page still lists "Section editor 2027-06-01
---" with "Remove Role".

For the newcomer, the roles page's "Remove Role" refuses with "You
cannot remove the role. At least one role must be assigned to the user."

## Cause

A role invitation requires a START DATE (`required|date` in
`UserRoleAssignmentInvitePayload`). When the invitation is accepted,
`UserRoleAssignmentReceiveController::finalize()` moves a past date up
to today and stores a later date as it is, as the assignment's
`date_start`. All the screens treat such an assignment as one of the
user's roles here:

- the Users list prints it under "Roles" with its start date;
- the row menu offers "Remove User" for any role without an end date
  (`useUserAccessManagerConfig::getItemActions()`,
  `user.groups.find((value) => value.dateEnd === null)`);
- the roles page shows "Remove Role" beside it.

The server's removal ignores it. It only acts on roles already active,
through `UserUserGroup::scopeWithActive()` (`date_start` now or earlier,
or null):

- `UserGridHandler::removeUser()` counts the user's groups with
  `withActive()`. When none is active it answers `grid.user.userNoRoles`
  (step 7). The error dialog does not show that message, and that part
  is covered by another report
  ([U53-A2-remove-site-administrator-unexplained-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A2-remove-site-administrator-unexplained-error.md)).
  With that fix alone, the dialog would read "This user does not have
  any roles.", which is wrong for this user.
- `Repository::endAssignments()` sets `date_end` only on active rows. So
  a user who also holds current roles loses those, and the future row
  is skipped (step 11).
- `PKPUserController::endRole()` looks the role up in
  `Repo::userGroup()->userUserGroups($userId)`, which returns active
  roles only, and answers 404 (step 13).

Removal became active-only in `pkp/pkp-lib#9462`
([459aac97](https://github.com/pkp/pkp-lib/commit/459aac972d6aaf3b25a54f7db879e4ace88c7f9d),
2023). At that time every assignment began the moment it was made. Role
invitations (`pkp/pkp-lib#10459`,
[7e3a26ea](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98))
created assignments that begin later, and removal was never updated for
them. `endRole()`, added afterwards for the roles page
([a18a6b6a](https://github.com/pkp/pkp-lib/commit/a18a6b6a12ef2b36521bb20679d096e6674e9cd7)),
reads the roles the same active-only way.

Reach:

- The Users XML import (OJS, OMP) keeps each role's `<date_start>` since
  `pkp/pkp-lib#13390`, so imported users can also hold roles not yet
  begun (code).
- If "Appear on the masthead" is set, a user removed as at step 11
  appears on the Editorial Masthead from the start date, since the
  masthead lists the active masthead roles. This is read from the code
  only, since the walk could not wait for the start date.
- The profile's own roles form (`UserFormHelper::saveRoleContent()`)
  calls `endAssignments()` only for a role that `userInGroup()` finds
  active. Unticking a role there never reaches a future row (code).
- The menu guard also withholds "Remove User" when the user's only role
  has an end date still to come. That is a separate fault in the guard
  (code).

## Proposed fix

Teach removal about roles not yet begun, in lib/pkp, where
`endAssignments()` serves every caller
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-role-not-yet-begun-kept/fix.diff)):

- `Repository::endAssignments()` withdraws the matching rows that have
  not begun, using the existing `withActiveInFuture()` scope, and ends
  the active ones as before:

  ```diff
  -            ->withUserId($userId)
  -            ->withActive();
  +            ->withUserId($userId);
   ...
  -        $query->update(['date_end' => $dateEnd]);
  +        // An assignment not yet begun (a role invitation's later start date)
  +        // has taken no effect: withdraw it, so that it never begins.
  +        (clone $query)->withActiveInFuture()->delete();
  +
  +        $query->withActive()->update(['date_end' => $dateEnd]);
  ```

- A new scope, `UserUserGroup::scopeWithNotEnded()` (`date_end` null or
  later than now). It is the complement of `withEnded()`, and like
  `withActive()` it counts a null `date_start`.
- `UserGridHandler::removeUser()` counts the user's groups with
  `withNotEnded()` instead of `withActive()`.
- `PKPUserController::endRole()` checks the role with `withNotEnded()`
  instead of reading `userUserGroups()`, which returns active roles
  only. Like the check it replaces, it does not limit the role to the
  current journal. That is left out of the tried diff. Adding
  `->withContextId($context->getId())` would stop another journal's role
  from passing, and stop the "role ended" email going out for nothing.

The rows are deleted rather than ended because a role that never began
never took effect, so no period in the role needs recording. Ending it
today would store an end date before its start date. The Editorial
History (`AboutContextHandler::editorialHistory()`) lists ended masthead
roles by year and would print "2027 – 2026". On `main` the audit log
still records the removal (`USER_ROLE_REMOVED`, `USER_CONTEXT_REMOVED`).

`endAssignments()` has one more caller: `UserForm::saveUserGroupAssignments()`,
the older users grid's "Edit User" roles. It ends each group that is
active now and that the manager unticks. With the fix, it would also
delete a not-yet-begun row of that same group. This is intended, since
unticking a role means the user should not hold it later either. That
form does not tick a role that has only a future row (its `initData()`
reads active roles), so it cannot withdraw such a role on its own
(code).

Tried on `main` in all three apps. Step 7 closed the dialog with no
error, and the newcomer left the list ("Current Users (0)" for
"Newcomer"), with no role row left. At step 11 Author and Reader ended
today and "Section editor" was withdrawn, and the menu no longer offered
"Remove User". Step 13 removed the future role and left Author and
Reader untouched.

**Alternatives:**

- Hide "Remove User" and "Remove Role" for roles not yet begun
  (ui-library). The error would stop, but the manager would have no way
  at all to withdraw an accepted future role, and step 11 would still
  keep it without a word.
- Set `date_end` to today on the future rows instead of deleting them.
  This stores an end before the start, and after the start date it
  appears on the Editorial History as a backwards span.
- Change only `removeUser()`. This leaves the roles page's "Remove Role"
  answering 404.

**What goes with it:**

- Behavior changes:
  - `PUT users/{id}/endRole/{userGroupId}` answers 200 for a role not
    yet begun, where it answered 404. It sends the "role ended" email as
    it does for a current role.
  - A user whose only roles here had not begun has no assignment left
    after "Remove User", so they leave this journal's Users list. A
    removed user whose roles were ended stays listed, with an empty
    "Roles" cell.
- No data repair: the rows already stored are correct and can now be
  removed.
- Backport: the same code is on `stable-3_5_0`. The `endAssignments()`
  hunk needs redoing there, and the other three hunks apply with
  offsets. 3.5 has no audit log, so a deleted future row would leave no
  record in the assignments. For roles that came from an invitation,
  the accepted invitation stays stored with the role and its date
  (code). Roles from a Users XML import have no such record. If the team
  wants every withdrawal traceable on 3.5, the backport can instead set
  `date_end` to the row's own `date_start`. Such a row never becomes
  active and has no end before its start. After that date the Editorial
  History would list it as a one-year term ("2027 – 2027") when it
  appears on the masthead. The team decides.
- Guard: a unit test for `Repository::endAssignments()` with a row not
  yet begun beside an active one, and the U53 e2e scenario for "Remove
  User" on a user invited with a later start date.

Medium: four files in pkp-lib, a new scope, and a REST endpoint that
answers differently for roles not yet begun; tried.

## Evidence

- Kept script that takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-role-not-yet-begun-kept/walk.js),
  run on an install freshly loaded from PKP's default test dataset with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/remove-user-role-not-yet-begun-kept/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says). The script also checks, with the fix and without it,
  that "Remove User" on Zita Woods (or Zayan Zedd) still ends Author and
  Reader with the day's date and keeps those rows. It checks that
  "Remove Role" on Carlo Corino (or Arthur Clark) leaves Author and
  Reader untouched, and that no dialog follows "OK".
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/remove-user-role-not-yet-begun-kept/fix.diff ojs omp ops`,
  the dataset reloaded, walk.js, then
  `node bin/try-fix.js revert ojs omp ops`.
- Walked 2026-09-30 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); lib/ui-library 280f98c5 in all
    three.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd
    (lib/pkp a9c76aed62, lib/ui-library 1a7a4750). Same Observed as on
    `main`, word for word.
  - The `rowId` and the ids in the `endRole` address differ between
    apps.
  - Only PostgreSQL was walked. The comparisons are on datetimes, so
    nothing here depends on the database.
- Introduced: at lib/pkp 2e377d27fc, `git blame` on `endAssignments()`'s
  `->withActive()` gives
  [459aac97](https://github.com/pkp/pkp-lib/commit/459aac972d6aaf3b25a54f7db879e4ace88c7f9d)
  (`pkp/pkp-lib#9462`, Bozana Bokan, 2023-10-26). Blame on
  `removeUser()`'s count gives
  [714d5d5a](https://github.com/pkp/pkp-lib/commit/714d5d5aa490a412cce789b94596009b53dda7e8)
  (`pkp/pkp-lib#10506`, the Eloquent refactor, Hafsa-Naeem, 2024-10-15),
  which wrote its `->withActive()`. The count had already become
  active-only in 459aac97, through the `STATUS_ACTIVE` default that
  commit gave `userUserGroups()`. Both commits are about which roles
  count as current. None of them could meet a role starting later until
  [7e3a26ea](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98),
  whose payload rule `userGroupsToAdd.*.dateStart` was
  `required|date|after_or_equal:today` and whose accept stored the date
  as given. It is therefore named as the change that introduced the
  fault. On `main` the rule is `required|date`, and `finalize()` moves a
  past date up to today (012f6404ca, `pkp/pkp-lib#10550`). The `endRole()`
  lookup is from
  [a18a6b6a](https://github.com/pkp/pkp-lib/commit/a18a6b6a12ef2b36521bb20679d096e6674e9cd7)
  (Erik Hanson, 2024-10-24).
- 3.5, code: the same `removeUser()`, `endAssignments()` and `endRole()`
  at lib/pkp a9c76aed62. 7e3a26ea is on `stable-3_5_0`.
- 3.4 and 3.3, code: `origin/stable-3_4_0` (df13621c2d) and
  `origin/stable-3_3_0` (d446601ebe) of lib/pkp. `user_user_groups` has
  no `date_start` or `date_end` there, there are no role invitations,
  and `removeUser()` deletes the context's assignments
  (`deleteAssignmentsByContextId()`). Not walked.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, issues and PRs, for "remove user" with "future",
  "start date" and "remove role", "does not have any roles",
  "unexpected error", `endAssignments`, `endRole`, `removeUser`. The
  nearest are different faults: `pkp/pkp-lib#12934` (a manager cannot
  remove a user's only role on the roles page without inviting them to
  another), `pkp/pkp-lib#11004` (a future start date message shown to
  users with no role, closed) and `pkp/pkp-lib#13412` (import dates,
  closed).
- Unverified: the Editorial Masthead after the start date (Reach), and
  the Editorial History reading of a role ended before its start (the
  second alternative) are code reads. So are "Cancel Invite", the
  roles page's read-only start date, what a role reaches from its start
  date, and the older form's caller.
