# Users & Roles: after a role is renamed, the "Users" tab shows its old name until a reload

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code; no "Roles" column in the users list)
- **Introduced** `pkp/pkp-lib#10576` and `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [4729a3cd9c](https://github.com/pkp/pkp-lib/commit/4729a3cd9cabc98712aaf91a227d984bdce7dcb9), [e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U54 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a14)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

After a Journal Manager renames a role in its "Edit" window on the
"Roles" tab of Settings › Users & Roles, the "Roles" tab reads "Your
changes have been saved." and lists the new name. The "Users" tab,
opened without a reload, still shows the old name in its members' rows
under "Roles": David Buskins' row reads "Section editor" after the role
became "Handling editor".

The "Invitations" table on the same tab keeps the old name in the same
way for a pending invitation to that role, and so does the "Current
Roles" line of a member's "Disable User" window.

A reload shows the new name.

## Impact

- **Lost.** Nothing. The new name is saved and every other screen shows
  it; only the "Users" tab is out of date until the page is reloaded.
- **Who.** A Journal Manager (Press Manager, Preprint Server Manager)
  who renames a role that has members or pending invitations and then
  opens the "Users" tab without leaving the page.
- **Way round.** Reload the page.

Low: nothing is lost, and a reload corrects the names.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  differences in brackets). The role renamed is the dataset's own
  "Section editor" [OMP: "Series editor"; OPS: "Moderator"], held by
  David Buskins (`dbuskins`) among others.
- For the "Invitations" table only: a pending invitation to that role.
  As `rvaca`, on the "Users" tab press "Invite to a role", search
  `amwandenga@mailinator.com`, choose "Section editor" with today's
  start date, press "Save And Continue", then "Invite user to the
  role". Nobody accepts it.

1. Sign in as `rvaca` and open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). The
   "Users" tab is open. David Buskins' row reads "Section editor" under
   "Roles", and Alan Mwandenga's invitation reads "Section editor".
2. Press the "Roles" tab. On the "Section editor" row, press "Settings",
   then "Edit".
3. Replace "Role Name" with "Handling editor" and press "OK".
4. Press the "Users" tab. Do not reload.

**Expected.** In step 4 David Buskins' row and Alan Mwandenga's
invitation read "Handling editor".

**Observed.** In step 4 both still read "Section editor" [OMP: "Series
editor"; OPS: "Moderator"], and pressing the tab sends no request. After
a reload both read "Handling editor".

## Cause

The "Users" tab holds two Vue lists from ui-library: the "Invitations"
table (`UserInvitationManager`) and the users list
(`UserAccessManager`). Each store fetches its rows once, when the web
page loads, and both rows carry role names: a user's `groups[].name`,
and an invitation's `userGroupsToAdd[].userGroupName`, which
`BaseUserRoleAssignmentInviteResource` (line 52) reads from the role's
name at fetch time. `UserAccessManagerStore.js` fetches again only after
its own row actions (`triggerDataChange`) or a change of list page or
search phrase; `UserInvitationManagerStore.js` only after a change of
list page or a cancelled invitation.

The "Roles" tab is still the legacy grid. After a save,
`UserGroupGridHandler::updateUserGroup()` (lib/pkp
`controllers/grid/settings/roles/UserGroupGridHandler.php`, line 334)
answers with the global event `userGroupUpdated`, and the legacy
`Handler.handleJson()` emits it on `pkp.eventBus`. The legacy users grid
listened for it (`js/controllers/grid/users/UserGridHandler.js`, line 43:
`this.bindGlobal('userGroupUpdated', … this.refreshGridHandler())`).
`pkp/pkp-lib#10576` replaced that grid in
`templates/management/accessUsers.tpl` with `<user-access-manager>`, and
the Vue list (`pkp/ui-library#437`) does not listen for the event; nor
does the "Invitations" table. So nothing tells either list that a role
name changed.

Reach:

- The "Disable User" window of a member's row prints "Current Roles : …"
  from the users list's own rows (`useUserAccessManagerActions.js`,
  `disableUser()`), so it shows the old name until the list is fetched
  again (code read).
- The tab has no role filter, only the search box. A member's "Edit"
  and "Invite to a role" open pages of their own, which load the names
  afresh (code read).
- Creating a role and removing one leave both lists as they should be:
  a new role has no members or invitations, and
  `UserGroupGridHandler::removeUserGroup()` removes a role only when it
  has no members (code read). A stage box on the "Roles" tab sends no
  global event and changes nothing the lists show (code read; walked: no
  request to the lists).
- `userMerged`, the other event the legacy grid listened for, is covered:
  the Vue list's "Merge User" action refreshes the list itself (code
  read).
- Administration › Hosted Journals › "Settings wizard" › "Users" still
  uses the legacy grid with its listener, and that page has no "Roles"
  tab (code read).

## Proposed fix

Have both Vue lists listen for the event the legacy grid listened for:
in `UserAccessManagerStore.js` and `UserInvitationManagerStore.js`,
subscribe to `userGroupUpdated` on `pkp.eventBus`, refetch the current
list page, and unsubscribe when the store is disposed. ui-library
listens to legacy grid events the same way elsewhere (`TopNavActions.vue`
with `update:unread-tasks-count`). The `$off` goes in `onScopeDispose`
rather than `onUnmounted`, so that it runs when the store itself is
disposed (`defineComponentStore` calls `$dispose()` once the last
component using it unmounts), not when whichever component made the
store first unmounts.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/fix.diff),
the users list's half (the invitations store gets the same lines after
its `watch`, calling `fetchInvitations()`):

```diff
-import {ref, watch, computed} from 'vue';
+import {ref, watch, computed, onScopeDispose} from 'vue';
@@
 		const {triggerDataChange} = useDataChangedProvider(() => fetchUserList());
 
+		/**
+		 * Refetch when a role is created, edited or removed on the page's
+		 * Roles tab: its legacy grid sends the global `userGroupUpdated`
+		 * event, which the legacy users grid this list replaced listened to.
+		 */
+		const refetchOnUserGroupUpdated = () => fetchUserList();
+		pkp.eventBus.$on('userGroupUpdated', refetchOnUserGroupUpdated);
+		onScopeDispose(() => {
+			pkp.eventBus.$off('userGroupUpdated', refetchOnUserGroupUpdated);
+		});
```

The fix was tried on OJS, OMP and OPS `main` (the "Invitations" table
on OJS): the Steps then gave the Expected without a reload. The users
list keeps its own state: with "Buskins" searched before the rename, the
tab afterwards still showed the search's one row, now with the new name.

**Alternatives**

- Refetch whenever the "Users" tab is opened. It needs the tab's open
  event wired into both lists and sends requests on every tab change,
  when only a role save can change the names.
- Read the role names in the browser from a shared store of roles. The
  "Roles" tab is a legacy grid with no such store, so this is a larger
  change for the same result.

**What goes with it**

- No data repair and no API change; the server already sends the event.
- A guard: an e2e check that renames a role and reads the "Users" tab
  without a reload.
- 3.5: the invitations store is the same, and its lines apply as
  written. The users store there has `triggerDataChangeCallback()` in
  place of `useDataChangedProvider()`; the same lines go after that
  function, so that hunk needs its anchor moved.

Small: the same few lines in two ui-library stores.

## Evidence

- [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/walk.js),
  automates the Steps for the users list on all three apps, and
  [invitation.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/invitation.js)
  the invitation precondition and the "Invitations" table on OJS; their
  helpers are in `lib.js` beside them. The check of the fix's reach is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/neighbour.js).
  In a pkp-e2e checkout, on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/walk.js`
  The fix is tried with `node bin/try-fix.js apply
  shared/playwright/checks/issues/users-tab-keeps-renamed-role-old-name/fix.diff
  ojs omp ops` (it rebuilds ui-library), then the same scripts.
- The users list walked on OJS, OMP and OPS `main` and `stable-3_5_0`,
  on PostgreSQL; both lines gave the same rows. The walks without the
  fix typed the new name as "u54f Handling editor" on OMP and OPS and on
  3.5; the OJS `main` walk with the invitation typed "Handling editor".
  The "Invitations" table was walked on OJS `main` only; OMP and OPS
  `main` and 3.5 hold the same `UserInvitationManagerStore.js` (code
  read). No request failed and the browser
  logged no script error. Dataset: pkp/datasets c657990 (2026-10-01).
  Tips: `main` ojs b84f8e2e44, omp 3b0ecf794, ops c8af945bb7, lib/pkp
  ddd8ab243a (ojs) and 3dc90c81a6 (omp, ops), lib/ui-library 64d67363
  (ojs) and 280f98c5 (omp, ops); `stable-3_5_0` ojs c346ee00a5, omp
  c7b45f88e, ops 8eaf899468, lib/pkp 3bb4450bea (ojs) and 1fb843f491
  (omp, ops), lib/ui-library d4e01883; `stable-3_4_0` app 75cc2d488b,
  lib/pkp 32b0f4b4af; `stable-3_3_0` lib/pkp f6ab331645.
- 3.5 code: `templates/management/accessUsers.tpl` holds
  `<user-access-manager>`, `UserGroupGridHandler.php` sends
  `userGroupUpdated` (lines 330, 395), `access.tpl` holds
  `<user-invitation-manager>` on the same tab, and ui-library's `src/`
  has no listener for the event.
- 3.4 code: `templates/management/accessUsers.tpl` loads the legacy
  `UserGridHandler` grid, whose `fetchGrid` has a "Roles" column
  (`controllers/grid/settings/user/UserGridHandler.php`, line 151, the
  role names read per row), and its `UserGridHandler.js` refreshes on
  `userGroupUpdated`, which `UserGroupGridHandler.php` sends (lines 323,
  392). No invitations table. Not walked.
- 3.3 code: the same legacy grid and listener
  (`UserGroupGridHandler.inc.php` sends the event, lines 285, 334), but
  its columns are the given name, family name, username and email, with no
  roles. Not walked.
- Introduced: found by `git log` on `templates/management/accessUsers.tpl`
  (4729a3cd9c is dated 2024-11-01; its PR merged on 2025-02-04).
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  issues and PRs, by the symptom's words (renamed role users list, role
  name not updated users tab, user access table roles reload, user
  access table stale) and by `userGroupUpdated` and `UserAccessManager`.
  Nothing matched.
