# "Remove User" keeps a role that starts on a later date, and removing the user again fails

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no role start dates)
  - 3.3: none (code; no role start dates)
- **Introduced** `pkp/pkp-lib#9529` for `pkp/pkp-lib#9462` · [459aac972d](https://github.com/pkp/pkp-lib/commit/459aac972d6aaf3b25a54f7db879e4ace88c7f9d) · 2023-10-26 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a19)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager invites a user to a role that starts on a later date, the
user accepts, and later the manager removes the user with "Remove
User" on Settings › Users & Roles. The user's current roles end, but
the role still to begin stays; the row keeps listing it and still
offers "Remove User". "OK" in the "Remove" dialog then brings an
"Error" dialog, "An unexpected error has occurred. Please reload the
page and try again.", and the role stays, after a reload too.

Once the invitation is accepted, no screen can withdraw the role. On
its start date the user holds the role the manager tried to take away.

## Impact

- **Lost**: control over who will hold a role. On its start date the
  removed user gains every permission of the role, which can be any
  role of the journal the invitation offers, Journal manager included;
  in the steps below it is Section editor, which opens the submissions
  the user is assigned to.
- **Who**: managers who invite someone to a role starting later and,
  after the invitation is accepted, need to withdraw it or remove the
  user from the journal. Until it is accepted the role does not exist,
  and "Cancel Invitation" in the list's "Invitations" table withdraws
  it.
- **Way round**: none on screen once accepted. The user's roles page
  refuses "Remove Role" on the upcoming role when it is the only role
  left, and when the user holds another role the request fails
  silently (404) and the role stays. "Disable User" is no substitute:
  it locks the user out of every journal on the site.

Medium: a removal is left half done, in a state managers meet rarely.
It is not high because the row keeps listing the upcoming role and the
second attempt fails visibly; it would be high if the role stayed
hidden from the manager.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. The user is
  Alan Mwandenga (`amwandenga`, roles Author and Reader) [press: Arthur
  Clark, `aclark`; preprint server: Carlo Corino, `ccorino`].

1. Sign in as `rvaca` (password `rvacarvaca`) and open Settings › Users
   & Roles (`/index.php/publicknowledge/en/management/settings/access`).
   In the search box type "Mwandenga" [press: "Clark"; server:
   "Corino"] and press Enter.
2. Press the row's "…" button and choose "Edit". The user's roles page
   opens (`/index.php/publicknowledge/en/management/settings/user/<user id>`).
   Press "Add Another Role", choose "Section editor" [press: "Series
   editor"; server: "Moderator"], type a start date in the future (here
   `2027-06-01`; the Observed dates follow it), choose "Appear on the
   masthead", press "Save And Continue", then "Invite user to the
   role".
3. Sign out. Open the invitation email to amwandenga@mailinator.com
   ("You are invited to new roles"), wherever the install's mail
   settings deliver it (a development install usually logs it or sends
   it to a local mail catcher). Follow "Accept Invitation" and press
   "Accept And Continue to …"; no sign-in is needed. The role exists
   only from this point.
4. Sign in as `rvaca` again, open Settings › Users & Roles and search
   for "Mwandenga". The row's "Roles" read "Reader", "Author", "Section
   editor"; the first two start on the date the dataset was built, the
   third on 2027-06-01.
5. Press the row's "…" button, choose "Remove User" and press "OK" in
   the "Remove" dialog.
6. Press the row's "…" button again, choose "Remove User" and press
   "OK".
7. Press "OK" in the dialog that follows, reload the page and search
   for "Mwandenga".
8. Press the row's "…" button, choose "Edit", and on the "Section
   editor" row press "Remove Role".

**Expected:** step 5 ends every role the user holds or is due to hold
in the journal, the upcoming "Section editor" included, and the row is
left with no role.

**Observed:** after step 5 the row reads only "Section editor",
2027-06-01, and its menu still offers "Remove User". The Reader and
Author roles ended today; the Section editor role is stored unchanged
(start 2027-06-01, no end). "OK" in step 6 posts to the legacy
`UserGridHandler` `remove-user` operation, which answers 200:

```json
{"status":false,"content":"This user does not have any roles.","elementId":"0","events":[]}
```

and the page shows:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

In step 8 the roles page lists "Reader" and
"Author" with today's end date and "User Removed From Role", and
"Section editor" with 2027-06-01, End Date "---" and "Remove Role";
"Remove Role" opens:

```
Remove Role
You cannot remove the role. At least one role must be assigned to the user.
```

## Cause

Since `pkp/pkp-lib#9462` a role assignment has a start and an end date,
and removing a role ends it rather than deleting it, so that the
editorial history keeps past service. `Repository::endAssignments()`
(pkp-lib `classes/userGroup/Repository.php`), which "Remove User",
"Remove Role" and the older grid's role boxes all call, ends only the
assignments active now (`UserUserGroup::scopeWithActive()`:
`date_start <= now`). `UserGridHandler::removeUser()` likewise counts
only active assignments and answers `grid.user.userNoRoles` when there
are none. An assignment that starts later is neither ended nor counted.
`PKPUserController::endRole()`, behind "Remove Role", looks the role
up through `Repo::userGroup()->userUserGroups()`, also active only.

Every screen that lists roles treats such an assignment as held: the
Vue list's "Roles" and "Start Date" cells and its menu's "Remove User"
guard (`user.groups.find((value) => value.dateEnd === null)`), the
older grid's "Roles" column (`withActiveAndActiveInFuture()`), and the
roles page. And the role invitation
(`pkp/pkp-lib#9658`) lets a manager set any start date. So the first
"Remove User" ends the current roles and leaves the upcoming one, and
the second is refused as having no roles. The refusal's reason does not
show because ui-library's `useUserAccessManagerActions.js`
`removeUser()` calls `openDialogNetworkError()` without the answer, so
the dialog falls back to the generic text.

The roles page's refusal in step 8 is not the server's: ui-library
`UserInvitationUserGroupsTable.vue` `removeUserGroup()` refuses when
`numberOfActiveRoles <= 1`, and that count (roles with no end date)
includes the upcoming role, so the request is never sent.

459aac972d replaced `deleteAssignmentsByContextId()`, which removed
every assignment of the user in the context, with `endAssignments()` on
active ones.

Reach:

- The roles page's "Remove Role" on an upcoming role while the user
  holds another role: `PUT users/{id}/endRole/{userGroupId}` answers
  404 `{"error":"The requested resource was not found."}`; the page
  says nothing and the role stays (on screen, all three apps).
- The older grid's "Edit User" role boxes (`UserForm`) and the
  profile's role boxes (`UserFormHelper`) call `endAssignments()` too,
  but only for roles active now (`initData()`, `execute()` and
  `userInGroup()` all read `withActive()`), so they never show an
  upcoming role (code).

## Proposed fix

Have "ending a role" also withdraw a role that has not begun, and count
such a role as one the user has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-upcoming-role-error/fix.diff),
against the app root, all in pkp-lib):

```diff
 // classes/userGroup/Repository.php, endAssignments()
         $query = UserUserGroup::query()
             ->withContextId($contextId)
-            ->withUserId($userId)
-            ->withActive();
+            ->withUserId($userId);
 ...
-        $query->update(['date_end' => $dateEnd]);
+        // An assignment that has not begun was never held: withdraw it, so that it
+        // leaves no service behind on the editorial history.
+        (clone $query)
+            ->whereNotNull('user_user_groups.date_start')
+            ->where('user_user_groups.date_start', '>', $dateEnd)
+            ->delete();
+
+        $query->withActive()->update(['date_end' => $dateEnd]);
```

- `UserUserGroup::scopeWithNotEnded()`: `date_end` empty or later than
  now, the counterpart of `scopeWithEnded()`.
- `UserGridHandler::removeUser()` counts `withNotEnded()` assignments
  instead of `withActive()` ones, so the refusal is left for a user
  with nothing to remove, as the menu's guard already assumes.
- `PKPUserController::endRole()` finds the role among the not-ended
  assignments, so "Remove Role" withdraws an upcoming role too. The
  diff does this inline (`UserGroup::query()->whereHas('userUserGroups',
  … ->withNotEnded())`); a `UserUserGroupStatus` value for "not ended",
  taken by `userUserGroups()`, would keep `endRole()` going through
  the repository, and is the tidier choice if the team prefers it.
- The roles page's client guard (`numberOfActiveRoles <= 1`) is left
  as it is: it keeps a user from being left without any role through
  "Remove Role", and "Remove User" is the action for removing the last
  one.

Deleting keeps the intent of `pkp/pkp-lib#9462`: an assignment that has
begun is ended and stays on record; one that never began leaves no
"2027 – 2026" line on the public Editorial History page, which lists
every ended assignment shown on the masthead
(`AboutContextHandler::editorialHistory()`, `withEnded()`).

Tried on OJS, OMP and OPS `main`: with the fix in, step 5 ends Reader
and Author today and withdraws the upcoming role, so the row is left
with no role and no "Remove User", and the stored assignments are the
two ended ones. Two nearby cases were checked with the fix in and out:
"Remove Role" on the upcoming role while Reader and Author are held
answers 200 and withdraws only that role (404 and no change without
the fix), and "Remove User" on an author with current roles only ends
both today, the same either way.

**Alternatives**

- Hide "Remove User" unless a role is active now: the menu would match
  the server, but the manager would have no way at all to withdraw an
  upcoming role.
- End the upcoming assignment by setting its end date: the row would
  then end before it starts, and the Editorial History would list
  service that never happened.

**What goes with it**

- Other callers of `endAssignments()`: the older grid's and the
  profile's role boxes pass only roles active now, so the fix changes
  them in one case only, a user holding an active and an upcoming
  assignment of the same role; unticking the role then also withdraws
  the upcoming assignment. That is wanted: the box stands for the role,
  not for one period of it. `endRole()` still mails the user
  `UserRoleEndNotify`, now also for an upcoming role.
- No stored data to repair: an upcoming assignment left by an earlier
  removal is withdrawn by the next "Remove User".
- Backport: `stable-3_5_0` needs the `endAssignments()` hunk adapted
  (it has no `AuditLog` call after the update); the rest applies as
  written.
- Guard: a unit test of `endAssignments()` with an active and an
  upcoming assignment, and an e2e test of "Remove User" on a user with
  an upcoming role.

Medium: the fix touches four places in pkp-lib. It also changes what
the other callers of `endAssignments()` do in one case.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-upcoming-role-error/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-user-upcoming-role-error/lib.js))
  takes the Steps on each app; `walk.js nb` takes the two nearby cases
  named in the fix ("Remove Role" on an upcoming role beside current
  ones, and "Remove User" on an author with current roles only). On an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/remove-user-upcoming-role-error/walk.js [nb]`.
  The stored assignments are read from `user_user_groups` after each
  stage.
- Driven on screen on OJS, OMP and OPS `main` and `stable-3_5_0`, on
  PostgreSQL; the comparisons are on timestamps and should not depend
  on the database (MySQL not checked). Dataset: pkp/datasets c657990
  (2026-10-01).
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883); `stable-3_4_0` pkp-lib 32b0f4b4af; `stable-3_3_0` pkp-lib
  f6ab331645.
- Code reads: on `main` and `stable-3_5_0`, pkp-lib
  `Repository::endAssignments()`, `userUserGroups()`,
  `assignUserToGroup()`, `UserUserGroup` scopes,
  `UserGridHandler::removeUser()` and its grid's Roles column,
  `PKPUserController::endRole()`, `UserForm`, `UserFormHelper`,
  `AboutContextHandler::editorialHistory()`, and for the invitation
  `SendInvitationStep::getAllUserGroups()` (every role of the context)
  and `UserRoleAssignmentReceiveController` (the assignment is made on
  acceptance); ui-library `UserInvitationManagerStore.js` ("Cancel
  Invitation"),
  `useUserAccessManagerConfig.js`, `useUserAccessManagerActions.js`,
  `UserInvitationUserGroupsTable.vue` (`removeUserGroup()`,
  `numberOfActiveRoles`). On `stable-3_4_0`: `userUserGroups()` has no
  status and the assignments no dates; `removeUser()` deletes every
  assignment in the context (`deleteAssignmentsByContextId()`). On
  `stable-3_3_0`: `UserGroupDAO::deleteAssignmentsByContextId()`, no
  dates.
- The menu guard came in ui-library a3d0a8d0e0 (`pkp/ui-library#515`,
  2025-02-11) and the older grid's Roles column in pkp-lib 73b84cf02f
  (2025-04-02).
