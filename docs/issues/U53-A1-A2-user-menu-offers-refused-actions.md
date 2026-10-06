# Users & Roles offers a manager "Disable User" and "Remove User" on accounts they may not change, then refuses

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the older users grid, whose refusal gives the reason)
  - 3.3: OJS, OMP, OPS (code; the older users grid, whose refusal gives the reason)
- **Introduced** not traced; present since at least [9bcd8e73cd](https://github.com/pkp/pkp-lib/commit/9bcd8e73cd254e072a01b2343793fea1c15171d7) (2014-12-04)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a1), [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Users & Roles, a manager's row menu offers actions the
manager is not allowed to take, which the server then refuses:

- On the Site Administrator's row, "Disable User" opens a window that
  only says "You do not have sufficient permissions to administer this
  user…", and "Remove User" › "OK" ends in an "Error" dialog, "An
  unexpected error has occurred. Please reload the page and try
  again."; reloading changes nothing.
- On an install with several journals, on a user who holds a role in a
  journal the manager does not manage, "Disable User" (or "Enable
  User") opens the same refusal. "Remove User" is offered there too,
  and works: it ends the user's roles in this journal only.

Nothing is lost and the refusals are right. The manager is offered
actions that cannot work, and for "Remove User" is not told why. The
same menu already hides "Login As" and "Merge user" on those rows. On
3.4 and 3.3 the older users grid makes the same offer, but its refusal
gives the reason; the "unexpected error" is 3.5's and `main`'s.

## Impact

- **Lost**: nothing. The account and its roles stay as they were.
- **Who**: every user who can open Users & Roles in a journal, a press
  or a preprint server: the "Journal manager", "Press manager" and
  "Preprint Server manager" roles, and on a journal or a press also
  the "Journal editor" and "Press editor" roles, which carry the
  manager's permissions. They meet it on the Site Administrator's row,
  which the list shows whenever the administrator holds a role in the
  journal, as in PKP's default test dataset.
- **Way round**: none needed, since the action is not allowed; but the
  "unexpected error" invites the manager to retry and reload, and
  hides that it is a permission question.

Low: the refusals are right; only the offer and one message are wrong.
It would rise to medium if the unexplained error hid the refusal of an
action the manager is allowed to take.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; a press and a preprint
  server the same, with "Press manager" / "Preprint Server manager"),
  freshly loaded. Nothing else.

1. Sign in as `rvaca` (Journal manager; password `rvacarvaca`).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). In the
   search box type "admin" and press Enter. The row "admin admin"
   (pkpadmin@mailinator.com) reads "Journal manager".
3. Press the row's "…" button. The menu reads "Edit", "Email",
   "Remove User", "Disable User".
4. Choose "Disable User".
5. Press "Close". Press the row's "…" button again and choose "Remove
   User"; in the "Remove" dialog ("Remove this user from this
   journal? …") press "OK".
6. Press "OK" in the dialog that follows, reload the page and search
   for "admin" again.

**Expected:** "Disable User" and "Remove User" are not offered on the
Site Administrator's row, as "Login As" and "Merge user" are not; or,
when offered, the refusal says why.

**Observed:** the window of step 4 reads, with only "Close":

```
Disable admin admin
Current Roles : Journal manager
You do not have sufficient permissions to administer this user. In order to administer a user, you must either be site administrator, or administer all contexts that this user is enrolled in.
```

"OK" in step 5 posts to the legacy `UserGridHandler` `remove-user`
operation, which answers 200 with the reason:

```json
{"status":false,"content":"You do not have sufficient permissions to administer this user. In order to administer a user, you must either be site administrator, or administer all contexts that this user is enrolled in.","elementId":"0","events":[]}
```

and the page shows:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

After the reload the row still reads "Journal manager" and the menu
still offers "Remove User" and "Disable User".

As a control, Daniel Barnes's row (`dbarnes`) offers "Edit", "Email",
"Login As", "Remove User", "Disable User" and "Merge user", and
"Disable User" there opens the form with "Reason for disabling user".

## Cause

The row menu is built in ui-library
`src/managers/UserAccessManager/useUserAccessManagerConfig.js`
`getItemActions()`. It hides "Login As" and "Merge user" on the
server's say (`user.canLoginAs`, `user.canMergeUsers`, from pkp-lib
`PKP\user\maps\Schema`), but offers "Disable User"/"Enable User" on
every row but the manager's own, and "Remove User" on every row with a
role not ended. The user data the list loads carries no permission for
those two actions, so the menu cannot know.

The server checks them with `Validation::getAdministrationLevel()`.
`UserGridHandler::editDisableUser()` and `disableUser()` refuse unless
the level is `ADMINISTRATION_FULL`: the Site Administrator is never
administrable, and a manager is not `FULL` over a user with a current
role in a journal they do not manage. `UserGridHandler::removeUser()`
refuses `ADMINISTRATION_PROHIBITED` in the current context, which, for
the journal's own manager or a Site Administrator, means the target is
a Site Administrator.

"Remove User" then hides the reason: `useUserAccessManagerActions.js`
`removeUser()` calls `openDialogNetworkError()` with no argument when
the answer's `status` is not `true`, so the modal store falls back to
`common.unknownError`, though the answer's `content` holds the reason.

The offer is older than this list: pkp-lib's older users grid
(`UserGridRow`) gated "Login As" and "Merge" on the administration
check from 9bcd8e73cd (2014) but never "Disable" or "Remove". The Vue
list that replaced it on Settings › Users & Roles (`pkp/ui-library#437`
for `pkp/pkp-lib#9658`, 2025) carried the same rule over and added the
generic error.

Reach:

- A user with a current role in a journal the manager does not manage:
  "Disable User" offered and refused in the window; "Remove User"
  works there, as the server allows `ADMINISTRATION_PARTIAL` (code; not
  walked, since it needs a second journal).
- "Enable User" on a disabled account: the same action and check
  (code).
- A Site Administrator on another Site Administrator's row: "Disable
  User" and "Remove User", and also "Login As" and "Merge user"
  (`getPropertyCanLoginAs()` / `getPropertyCanMergeUsers()` answer
  `true` for every row to a Site Administrator), all refused by the
  server (code).
- The older users grid in Administration › Hosted Journals › the
  Settings wizard's "Users" offers "Disable" and "Remove" on every row
  too, and shows the reason in a browser alert. Its viewers are Site
  Administrators, so only another Site Administrator's row is refused
  there (code). The same grid in the "Merge user" window offers only
  "Merge into this User" (`UserGridRow::initialize()` with
  `getOldUserId()` set), so it is not affected.

## Proposed fix

Let the server say, per row, whether the manager may disable and
remove the user, as it already does for "Login As" and "Merge user",
and let the menu follow; and have "Remove User" show the server's
reason when it is refused anyway. The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-menu-offers-refused-actions/fix.diff)
against the app root, or per repository
[fix-pkp-lib.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-menu-offers-refused-actions/fix-pkp-lib.diff)
and
[fix-ui-library.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-menu-offers-refused-actions/fix-ui-library.diff)
(`git apply` inside each):

- pkp-lib `schemas/user.json`: two read-only summary properties,
  `canDisable` and `canRemove`, beside `canLoginAs` and `canMergeUsers`.
- pkp-lib `Repo::user()->siteAdminIds(array $userIds)`: the users of
  the page who hold the Site Administrator role now, in one query.
- pkp-lib `PKP\user\maps\Schema`: `mapUsersWithPermissions()` loads
  those ids beside the batched `permissionMap`;
  `getPropertyCanDisable()` is the `permissionMap` answer (the one
  `canMergeUsers` uses, since merging asks the same `FULL` level) with
  Site Administrators left out. That exclusion matters only when the
  viewer is a Site Administrator: a manager's map
  (`permissionMapForManager()`) already answers false for a Site
  Administrator, whose site-level role has no context.
  `getPropertyCanRemove()` is false on a Site Administrator's row, the
  one case `removeUser()` refuses for a manager of the context, and on
  the viewer's own row (which the menu leaves out anyway); true on
  every other row.
- ui-library `useUserAccessManagerConfig.js`: "Remove User" also needs
  `user.canRemove`, "Disable User"/"Enable User" needs
  `user.canDisable`:

```diff
-			if (user.groups.find((value) => value.dateEnd === null)) {
+			if (
+				user.canRemove &&
+				user.groups.find((value) => value.dateEnd === null)
+			) {
 ...
-			actions.push({
+			user.canDisable &&
+				actions.push({
 					label: user.disabled ? t('grid.user.enable') : t('grid.user.disable'),
```

- ui-library `useUserAccessManagerActions.js` `removeUser()`: pass the
  answer's `content` to `openDialogNetworkError({data: {errorMessage:
  …}})`, so a refusal that still happens (the list loaded before a role
  changed) gives its reason.

The check stays where it is, in `Validation::getAdministrationLevel()`
on the server; the list only reflects it, through the batched map
pkp-lib already builds for the page and one more batched query, so no
query per row is added.

Tried on OJS, OMP and OPS `main`: with the fix in, the Site
Administrator's row offers only "Edit" and "Email" to `rvaca`. The rows
that must keep their actions were checked with the fix in and out, and
read the same: Daniel Barnes's row offers all six actions, and he can
be disabled, offered "Enable User" with its form, and removed; signed
in as `admin`, Ramiro Vaca's row keeps "Disable User" with its form,
and the administrator's own row offers "Edit" and "Email".

**Alternatives**

- Hide the two actions on the rows where `canMergeUsers` is false: it
  would also hide "Remove User" on users with roles in other journals,
  whom the manager may remove from this one.
- Only show the server's reason: the manager would still be offered
  actions that cannot work.
- Compute `getAdministrationLevel()` per row: one query per user on
  every page of the list, which pkp-lib's batched map was introduced
  to avoid (`pkp/pkp-lib#11791`).

**What goes with it**

- Two additive read-only properties in the users API; nothing an API
  client relies on changes. No stored data to repair.
- One more query per mapping: `mapUsersWithPermissions()` calls
  `siteAdminIds()` once for the page of users, on every mapping that
  goes through it (the users list, reviewer selection, a submission's
  participants, the submissions API). The two properties are summary
  properties, so those mappings ask for them too; making them
  list-only would save the query elsewhere.
- Left out: the batched map counts ended roles where
  `getAdministrationLevel()` counts current ones, so a user whose role
  elsewhere has ended stays without "Disable User" though the server
  would allow it ("Login As" and "Merge user" are hidden there today
  for the same reason); and a Site Administrator is still offered
  "Login As" and "Merge user" on another Site Administrator's row.
  Both are the map's to align, in the same change if the team wishes.
- The older grid in the Settings wizard (`UserGridRow`) makes the same
  offer; giving its "Disable" and "Remove" the check it gives "Merge"
  is a few lines more.
- Backport: applies as written to `stable-3_5_0`.
- Guard: an e2e test that a manager's menu on the Site Administrator's
  row offers neither action, and a unit test of the two properties for
  a manager and a Site Administrator viewer.

Medium: two repositories, two new properties in pkp-lib's user schema
and map and the menu in ui-library; the existing "Login As" / "Merge
user" property cannot be reused, because "Remove User" follows a
different rule.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-menu-offers-refused-actions/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-menu-offers-refused-actions/lib.js))
  takes the Steps and the control on each app; `walk.js nb` checks the
  rows that must keep their actions (above). On an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/user-menu-offers-refused-actions/walk.js [nb]`.
- Driven on screen on OJS, OMP and OPS `main` and `stable-3_5_0`, on
  PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, OPS
  acd8ae704b (pkp-lib 32b0f4b4af, ui-library ee684b34);
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161
  (pkp-lib f6ab331645, ui-library 96959f9e).
- Code reads: on `main` and `stable-3_5_0`, ui-library
  `useUserAccessManagerConfig.js`, `useUserAccessManagerActions.js`,
  `stores/modalStore.js` `openDialogNetworkError()`; pkp-lib
  `UserGridHandler` (`editDisableUser()`, `disableUser()`,
  `removeUser()`), `UserGridRow`, `Validation::getAdministrationLevel()`,
  `maps/Schema.php` and `Repository::permissionMapForManager()`, the
  same on both lines. On `stable-3_4_0`: no `UserAccessManager`; the
  Users tab is `UserGridHandler`'s grid, whose `UserGridRow` adds
  "disable"/"enable" and "remove" on every row and gates only "logInAs"
  and "mergeUser" on `getAdministrationLevel() === FULL`; the server
  refuses as on `main`, and the legacy `Handler.js` `handleJson()`
  alerts the answer's `content`. On `stable-3_3_0`: the same with
  `Validation::canAdminister()`, which refuses a Site Administrator
  target and, unlike later lines, also refuses "Remove" on a user with
  roles in another journal.
- The trace: the Vue menu's rule came over from the grid in
  [e65555cf63](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38)
  (`pkp/ui-library#437`, 2025-02-04, Ipula Indeewara, ipula), which also
  wrote the argument-less `openDialogNetworkError()`; moved unchanged
  into `useUserAccessManagerConfig.js` by 2e15e1d933 (2025-04-17).
  The grid's own rule dates from 9bcd8e73cd (2014-12-04, "Use
  canAdminister to determine whether managers can merge users"), the
  oldest commit read that shows it.
