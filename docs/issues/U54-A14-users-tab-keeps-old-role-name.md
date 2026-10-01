# After renaming a role, the Users tab keeps showing its old name until the page is reloaded

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code; no "Roles" column)
- **Introduced** `pkp/pkp-lib#10576` and `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [4729a3cd9c](https://github.com/pkp/pkp-lib/commit/4729a3cd9cabc98712aaf91a227d984bdce7dcb9), [e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U54 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager renames a role in its "Edit" window on Settings › Users &
Roles › "Roles". The tab says "Your changes have been saved." and lists
the new name. But the "Users" tab of the same page, opened without a
reload, still shows the old name in the "Roles" cell of every member of
that role. The "Invitations" list at the top of the "Users" tab keeps the
old name for a pending invitation to the role in the same way.

The rename is saved, and a reload of the page shows the new name in both
lists. Until then the manager sees a role name the journal no longer
has, and may think the rename did not take.

## Impact

- **Lost**: nothing; the two lists on the "Users" tab are out of date
  until the page is reloaded.
- **Who**: a manager who renames a role and then opens the "Users" tab
  without leaving the page. Renaming a role is occasional set-up work.
- **Way round**: reload the page, which refreshes both lists. A search in
  the users list fetches that list again, but not "Invitations", which
  has no search.

Low: no data is at risk and a reload of the page is the way round, so
the fault is a display that is out of date, not a failed task.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; the same on OMP and OPS,
  with the differences in brackets).

1. Sign in as `rvaca` (the journal manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). The
   "Users" tab opens; David Buskins's row reads "Section editor" under
   "Roles" [OMP "Series editor", OPS "Moderator"].
3. Open the "Roles" tab.
4. Press the "Settings" arrow of the "Section editor" row [OMP "Series
   editor", OPS "Moderator"], then "Edit".
5. Replace "Role Name" ("Section editor" [OMP "Series editor", OPS
   "Moderator"]) with "u54w48 Desk editor" and press "OK".
6. Open the "Users" tab.
7. Reload the page (the "Users" tab opens again).

**Expected**: step 5 shows "Your changes have been saved." and the list
holds "u54w48 Desk editor" and no "Section editor" [OMP "Series editor",
OPS "Moderator"]. In step 6 David Buskins's "Roles" cell reads "u54w48
Desk editor".

**Observed**: step 5 as expected. In step 6 David Buskins's "Roles" cell
still reads "Section editor" [OMP "Series editor", OPS "Moderator"], and
so it stays (read again ten seconds later); the browser does not ask for
the users list again after the save. After step 7 the cell reads
"u54w48 Desk editor".

A pending invitation behaves the same. Between steps 2 and 3, press
"Invite to a role", search for u54w48.invitee@mailinator.com, give the
given name "u54w48 Invitee", choose "Section editor" [OMP "Series
editor", OPS "Moderator"] with today's start date, press "Save And
Continue", then "Invite user to the role", then "View All Users". The
invitation is sent and listed under "Invitations" with "Section editor".
In step 6 its row still reads "Section editor"; after step 7 it reads
"u54w48 Desk editor".

## Cause

The "Users" tab is a Vue component, `UserAccessManager`, with the
"Invitations" list above it (`UserInvitationManager`). Each store fetches
its list once when the page loads and again only on its own paging,
search or row actions:
`UserAccessManagerStore.js` (ui-library,
`src/managers/UserAccessManager/UserAccessManagerStore.js`, the
`watch([currentPage, searchPhrase], …, {immediate: true})` at lines
54-62) and `UserInvitationManagerStore.js` (the same `watch` at lines
50-59). The tabs stay mounted when hidden (`Tab.vue`, `:hidden`), so
neither list learns of a change made on the "Roles" tab.

The "Roles" tab is still the legacy grid, and it does announce the
change: `UserGroupGridHandler::updateUserGroup()` and `removeUserGroup()`
(pkp-lib `controllers/grid/settings/roles/UserGroupGridHandler.php`
lines 334 and 404) answer with `$json->setGlobalEvent('userGroupUpdated')`.
The legacy JavaScript handler's `handleJson()` (pkp-lib
`js/classes/Handler.js`, line 382) emits every event flagged as global
on `pkp.eventBus`. In 3.4 and earlier the "Users" tab was the legacy
users grid, whose `js/controllers/grid/users/UserGridHandler.js` binds
that event and redraws itself ("Refresh the grid when a user group has
been added/edited"). `pkp/pkp-lib#9658` replaced that grid on this page
with `<user-access-manager>` (`templates/management/accessUsers.tpl`,
[4729a3cd9c](https://github.com/pkp/pkp-lib/commit/4729a3cd9cabc98712aaf91a227d984bdce7dcb9)),
and its new stores
([e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38))
did not take the listener over. The legacy grid and its listener still
serve the administrator's settings of a hosted journal (its "Users" tab,
`templates/admin/contextSettings.tpl` line 80), where the "Roles" tab is
not on the same page.

Reach:

- The "Roles" cell of the users list after a rename (walked, the three
  apps on `main` and 3.5).
- The roles of a pending invitation in "Invitations" after a rename
  (walked, the three apps on `main`). The invitations API reads the
  role's name live (`BaseUserRoleAssignmentInviteResource`), so a fetch
  is all it needs.
- Creating or removing a role announces the same event but changes
  nothing either list shows: a new role has no members, and a role with
  members cannot be removed.
- The "Notify" tab of the same page, shown when the administrator turns
  on bulk email for the journal, lists the roles from the page load
  (`PKPNotifyUsersForm`) and keeps the old name too (code, not walked).
  It has no endpoint to fetch its options from, so the fix below leaves
  it out.

## Proposed fix

A proposal; the team decides. Let both stores listen for the event the "Roles" grid already sends and
fetch their list again
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-old-role-name/fix.diff)),
in `UserAccessManagerStore.js` (and the same in
`UserInvitationManagerStore.js` with `fetchInvitations()`):

```diff
-import {ref, watch, computed} from 'vue';
+import {ref, watch, computed, onUnmounted} from 'vue';
@@
 		const {triggerDataChange} = useDataChangedProvider(() => fetchUserList());
 
+		function onUserGroupUpdated() {
+			fetchUserList();
+		}
+		pkp?.eventBus?.$on('userGroupUpdated', onUserGroupUpdated);
+		onUnmounted(() => {
+			pkp?.eventBus?.$off('userGroupUpdated', onUserGroupUpdated);
+		});
```

It follows how the ui-library already hears the legacy grids:
`TopNavActions.vue` listens for `update:unread-tasks-count`, which
`NotificationsGridHandler` sends with `setGlobalEvent()`, with `$on` and
a matching `$off` on unmount. The `$off` sits in `onUnmounted`, as in
`citationManagerStore.js`, so it follows the component that creates the
store (`UserAccessManager.vue`, `UserInvitationManager.vue`, the only
ones that do); `onScopeDispose` would tie it to the store's own
`$dispose()` instead, and works the same while those components are the
stores' only creators. `fetchUserList()` keeps the list's page and
search phrase, so the manager stays where they were.

Tried on `main` in the three apps: in step 6 the cell reads "u54w48 Desk
editor" at once, and a pending invitation's row shows the new name. The
fix does not fetch more than it should: with "Buskins" typed into the
search, a second rename fetches the list once with the search kept and
shows the new name, and an "Edit" closed with "Cancel" or a stage-box
press fetches nothing.

**Alternatives**:

- Remount or refetch the tab's content whenever the "Users" tab is
  opened: it would fetch on every tab switch, changed or not, and lose
  the list's page and search.
- Turn the "Roles" tab into a Vue manager sharing a store with the users
  list: the right end state once the grid is replaced, but far larger
  than this fault.

**What goes with it**:

- No data repair, no API or hook change.
- Backport: `fix.diff`'s `UserAccessManagerStore.js` hunk does not apply
  to `stable-3_5_0`'s ui-library, which has no `useDataChangedProvider`
  line there;
  [fix-stable-3_5_0.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-old-role-name/fix-stable-3_5_0.diff)
  places the same listener after `triggerDataChangeCallback()` and passes
  `git apply --check` there (not walked).
- The guard: ui-library has no harness for a component store (no
  `@vue/test-utils`, no DOM environment, no store test among its vitest
  files), and `defineComponentStore` needs a mounted host component, so
  a unit test would first need that set up. The cheaper guard is the
  end-to-end case: the "Rename a role" scenario of the pkp-e2e spec U54
  reading the "Users" tab without a reload.

Small: one listener in each of two stores in one repo, following an
existing pattern; the guard is a one-line change to an existing
end-to-end scenario.

## Evidence

- The scripts, on an install loaded from PKP's default test dataset
  (PostgreSQL; pkp/datasets 38ab955, 2026-09-30):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-old-role-name/walk.js)
  takes steps 1-7 and counts every request for the users list, then
  checks that the fix fetches no more than it should (the search kept,
  no fetch on "Cancel" or a stage-box press, a second rename);
  [invitation.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-keeps-old-role-name/invitation.js)
  sends the invitation and renames the role. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-tab-keeps-old-role-name/walk.js`
  (`invitation.js` the same), with `PKP_E2E_LINE=stable-3_5_0` in front
  for 3.5. The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-tab-keeps-old-role-name/fix.diff ojs omp ops`,
  then both scripts, then `revert` with the same arguments. No request
  failed and no page script failed in any run, with or without the fix.
- Tips: `main`: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6), lib/ui-library 280f98c5 in all
  three. `stable-3_5_0`: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd,
  lib/pkp a9c76aed62, lib/ui-library 1a7a4750.
- `invitation.js` was run on `main` only. 3.5's code: its
  `UserAccessManagerStore.js` and `UserInvitationManagerStore.js` have
  the same `watch` and no listener, and its `UserGroupGridHandler.php`
  sends `userGroupUpdated` (lines 330, 395).
- 3.4 (code): pkp-lib `stable-3_4_0` df13621c2d,
  `templates/management/accessUsers.tpl` loads the legacy
  `UserGridHandler` grid, which has a "Roles" column
  (`controllers/grid/settings/user/UserGridHandler.php`, the `roles`
  column, names read per row), and
  `js/controllers/grid/users/UserGridHandler.js` refreshes it on
  `userGroupUpdated`, which `UserGroupGridHandler.php` sends (lines 323,
  392). ui-library `stable-3_4_0` ee684b34 has no `UserAccessManager`.
  OJS `stable-3_4_0` 9571d8fde7.
- 3.3 (code): pkp-lib `stable-3_3_0` d446601ebe, the legacy users grid
  shows given name, family name, username and email, no roles, and it
  too refreshes on `userGroupUpdated`. OJS `stable-3_3_0` 9fdb9bcf9a.
- Introduced: `git log` on `templates/management/accessUsers.tpl` gives
  4729a3cd9c ("add user access table", 2024-11-01), which replaced the
  grid with `<user-access-manager>`; GitHub names its PR
  `pkp/pkp-lib#10576` ("pkp/pkp-lib#9658 user access table", merged
  2025-02-04). The stores were added by `pkp/ui-library#437`
  (e65555cf, "user access table and table actions", merged 2025-02-04);
  no later commit to either store added a listener.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  by the symptom's words and by `userGroupUpdated` and
  `UserAccessManager`. Read and not the same fault: `pkp/pkp-lib#11273`
  (the manager's extensibility, closed).
- Unverified: the "Notify" tab's role list (code only; bulk email is off
  on the dataset); the 3.5 diff (checked to apply, not walked). MySQL not
  checked; nothing here depends on the database.
