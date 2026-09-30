# A manager's "Remove User" on the Site Administrator's row ends in "An unexpected error has occurred"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (read in the code, not run: the older users list shows the refusal's message)
  - 3.3: none (read in the code, not run: the older users list shows the refusal's message)
- **Introduced** `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U53 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, a journal manager's list offers "Remove User"
on the Site Administrator's row. "OK" in the "Remove" dialog brings an
"Error" dialog, "An unexpected error has occurred. Please reload the page
and try again.", and the administrator keeps every role.

A manager may not remove a Site Administrator, and the app refuses with
its reason: "You do not have sufficient permissions to administer this
user. In order to administer a user, you must either be site
administrator, or administer all contexts that this user is enrolled
in." The page drops that message and tells the manager to reload and try
again, which changes nothing: after a reload the row still offers
"Remove User" and fails the same way. The proposed fix makes the dialog
show the refusal; whether the menu should still offer "Remove User" on
that row is left to a separate product decision.

## Impact

- **Lost:** no data or work. The manager loses the explanation, and the
  time spent retrying.
- **Who:** every journal, press or server manager, a second Site
  Administrator included, on the row of a Site Administrator who holds a
  role in their journal. A Site Administrator who creates a journal
  becomes its manager, so most journals have such a row.
- **Way round:** none needed, since the removal is refused by design.
  Nothing on screen says so; the manager has to ask the Site
  Administrator.

Low: the outcome is the one the app intends and nothing is lost; only
the message is wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`): OJS journal,
  OMP press or OPS server `publicknowledge`. In it `admin` ("admin
  admin") is the Site Administrator and also "Journal manager" ("Press
  manager", "Preprint Server manager"); `rvaca` (Ramiro Vaca) is a
  manager and nothing more.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
3. On "admin admin"'s row, open "More Actions" and choose "Remove User".
4. In the dialog "Remove" ("Remove this user from this journal? This
   action will unenroll the user from all roles within this journal.";
   "press" on OMP, "server" on OPS), press "OK".
5. Press "OK" in the dialog that opens, and reload the page.

**Expected:** "OK" says why the removal cannot be done, with the app's
own refusal: "You do not have sufficient permissions to administer this
user. In order to administer a user, you must either be site
administrator, or administer all contexts that this user is enrolled
in." (Or the menu does not offer "Remove User" on this row.)

**Observed:** at step 4 an "Error" dialog opens:

```
Error
An unexpected error has occurred. Please reload the page and try again.
```

The request behind "OK" answers 200 with the refusal the page does not
show:

```
POST /index.php/publicknowledge/$$$call$$$/grid/settings/user/user-grid/remove-user?rowId=1
200 {"status":false,"content":"You do not have sufficient permissions to administer this user. In order to administer a user, you must either be site administrator, or administer all contexts that this user is enrolled in.","elementId":"0","events":[]}
```

After the reload the row still reads "Journal manager" ("Press manager",
"Preprint Server manager"), and its menu still offers "Edit", "Email",
"Remove User", "Disable User".

Control: "Remove User" › "OK" on an author's row (Zita Woods, `zwoods`;
Zayan Zedd, `zzedd`, on OMP) closes the dialog, shows no error, and the
row loses its roles.

## Cause

`removeUser()` in `lib/ui-library/src/managers/UserAccessManager/useUserAccessManagerActions.js`
posts to the legacy `UserGridHandler::removeUser()` and, when the answer
is not `status: true`, calls `openDialogNetworkError()` with no argument:

```js
if (data.value.status !== true) {
    openDialogNetworkError();
}
```

That is the `useModal()` wrapper (`src/composables/useModal.js`), which
passes its argument to `openDialogNetworkError(fetchError)` in
`src/stores/modalStore.js`. The store shows
`fetchError?.data?.errorMessage`, then `fetchError?.data?.error`, then
`common.unknownError`. With no argument it always shows
`common.unknownError`, so the message the handler returned in the
`JSONMessage`'s `content` is dropped.

The server side is right. `UserGridHandler::removeUser()` answers
`JSONMessage(false, __('grid.user.cannotAdminister'))` when
`Validation::getAdministrationLevel()` is `ADMINISTRATION_PROHIBITED`,
which it always is for a target holding `ROLE_ID_SITE_ADMIN`, whoever
acts, a second Site Administrator included; only the target acting on
themselves gets past. The rule the page breaks is the legacy JSON
contract: a `status: false` answer with `content` is a message for the
user. The older users grid (`UserGridRow`'s "Remove" link, through
`$.pkp.classes.Handler.prototype.handleJson()`) shows it with
`alert(jsonData.content)`. The Vue users list that replaced the grid on
Settings › Users & Roles (`pkp/pkp-lib#9658`, ui-library
[e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38))
does not, and the line has not changed since.

Reach:

- `removeUser()`'s other refusal, `grid.user.userNoRoles` "This user does
  not have any roles.", is dropped the same way (code). A manager meets it
  on the row of a user whose only role has not yet begun.
- No other action in the users list goes through this path (code):
  "Disable User", "Email" and "Merge user" open legacy windows that show
  their own refusals, "Edit" opens the user's roles page, and "Login As"
  is a redirect.
- The same `status !== true` → `openDialogNetworkError()` pattern sits in
  five legacy calls on other screens (code), and none loses a message
  today: `ReviewerManager` `unconsiderReview`, `GalleyManager`
  `deleteGalley`, `FileManager` `deleteFile` and `ParticipantManager`
  `deleteParticipant` refuse only with an empty `JSONMessage(false)` (a
  failed CSRF check), and `GalleyManager` `saveSequence` reaches the base
  `GridHandler::saveSequence()`, which throws on a failed CSRF check
  instead of answering.
- The menu guard in `useUserAccessManagerConfig::getItemActions()` offers
  "Remove User" on each row that has a role not yet ended, except the
  manager's own row. It does not check the manager's administration
  level. The older grid (3.4, 3.3) offered its "Remove" on every row, the
  manager's own and users with no role left included, and showed the
  refusal.

## Proposed fix

Pass the handler's message to the error dialog in `removeUser()`, in the
shape `openDialogNetworkError()` already reads
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-site-administrator-unexplained-error/fix.diff)):

```diff
-							if (data.value.status !== true) {
-								openDialogNetworkError();
+							// A request that failed outright leaves data empty; useFetch
+							// has already shown its error dialog then.
+							if (data.value && data.value.status !== true) {
+								// Show the handler's refusal (a JSONMessage's content)
+								// when it gives one, the general error otherwise.
+								openDialogNetworkError({
+									data: {errorMessage: data.value.content},
+								});
 							}
```

An empty `content` still falls back to "An unexpected error has
occurred…", so a failed CSRF check reads as before. The `data.value &&`
guard covers a request that fails outright: `useFetch` then sets `data`
to null and opens its own error dialog, and today the `status` read
throws a TypeError. Tried on `main` in all three apps, before the guard
was added (Evidence): "OK" on the Site
Administrator's row showed "Error" with the refusal quoted in Expected,
the roles stayed, and "Remove User" on an author's row still succeeded
with no dialog.

**Alternatives:**

- Hide "Remove User" on rows the manager may not administer, with a
  server-computed flag like the list's `canLoginAs` and `canMergeUsers`.
  That is out of scope here: an action offered and then refused is the
  product question U53
  [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a1)
  raises for "Disable User". It would add a property to the users API
  (`PKP\user\maps\Schema`). It could not reuse their permission map
  (`Repo::user()->permissionMapForManager()`), which would also hide
  "Remove User" on rows where removal is allowed: users who also hold a
  role in a journal the manager does not manage. It would come on top
  of this fix, since other refusals still need a message.
- Read `content` inside `modalStore.openDialogNetworkError()` and pass
  `{data: data.value}` from every legacy call. It covers the five sibling
  calls too, but none of them has a message to show today, and it gives
  a store written for REST API errors a second response shape.

**What goes with it:**

- No data repair, no API or hook change.
- Backport: applies as written to `stable-3_5_0` (same code at its
  ui-library tip); 3.4 and 3.3 have no such list.
- Guard: an e2e check, a manager's "Remove User" on the Site
  Administrator's row showing the refusal. A ui-library unit test for
  `removeUser()` would need new setup: the library's unit tests cover
  composables and `modalStore`, none a manager's actions.

Small: one condition and one call in one ui-library file.

## Evidence

- Kept script that takes the Steps on all three apps, with the author-row
  control:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/remove-site-administrator-unexplained-error/walk.js),
  run on an install loaded from PKP's default test dataset with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/remove-site-administrator-unexplained-error/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says).
- The fix, tried 2026-09-30 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/remove-site-administrator-unexplained-error/fix.diff ojs omp ops`
  (which rebuilds the JavaScript), the dataset reloaded, walk.js, then
  `node bin/try-fix.js revert ojs omp ops`. With the fix the "Error"
  dialog read the server's refusal on all three apps; the author-row
  control ended the author's roles with no dialog, with the fix in and
  out. The `data.value &&` guard was added after that trial, from a code
  read, and checked only with `patch --dry-run` against the `main` tips
  and OJS `stable-3_5_0`; it was not walked.
- Walked 2026-09-30 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); lib/ui-library 280f98c5 in all
    three.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62, lib/ui-library 1a7a4750). Same Observed as `main`,
    word for word.
  - No response of 500 or more and no page error on any walk. Only
    PostgreSQL was walked; nothing here depends on the database.
- Introduced: `git blame` on the `openDialogNetworkError()` line of
  `useUserAccessManagerActions.js` at ui-library 280f98c5 gives
  e65555cf, the commit that created the file (`git log -S` finds no
  earlier form); GitHub's `commits/e65555cf…/pulls` gives
  `pkp/ui-library#437`, which links `pkp/pkp-lib#9658`.
- 3.4 and 3.3, code: `origin/stable-3_4_0` and `origin/stable-3_3_0` of
  lib/ui-library have no `UserAccessManager`; lib/pkp's
  `templates/management/accessUsers.tpl` loads the legacy
  `grid.settings.user.UserGridHandler` grid, whose `UserGridRow` "Remove"
  goes through `RemoteActionConfirmationModal`, and `js/classes/Handler.js`
  `handleJson()` alerts a `status: false` answer's `content`.
  `UserGridHandler::removeUser()` returns the same
  `grid.user.cannotAdminister` refusal on both branches, and `UserGridRow`
  adds "Remove" to every row with no condition. Not walked.
- Upstream: the nearest, `pkp/pkp-lib#13386`, is about a Site
  Administrator whose manager role was removed still seeing editorial
  menus, a different fault.
