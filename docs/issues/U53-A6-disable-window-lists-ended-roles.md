# The "Disable User" and "Enable User" windows list roles the user no longer holds in the journal

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no roles line in the window)
  - 3.3: none (code; no roles line in the window)
- **Introduced** `pkp/ui-library#515` and `pkp/pkp-lib#10895` for `pkp/pkp-lib#9658` · [888feebd](https://github.com/pkp/ui-library/commit/888feebd07da305d8f55e6db19e70e48c9bfedbb) · 2025-02-14 · Ipula Ranasinghe (ipula)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, "Disable User" opens a window headed
"Disable {full name}" with a line "Current Roles : {roles}". The line
names every role the user has held in the journal, ended ones included,
while the list's "Roles" column shows only the current ones. A user
removed from the journal has nothing under "Roles", yet the window says
"Current Roles : Reader, Author".

The "Enable {full name}" window has the same line. Disabling ends no
role, so that window is wrong only for a disabled user who also has an
ended role. The space before the colon shows for every user. The fix is
one line in the window's script and one character in the English text.

## Impact

- **Lost:** nothing stored. The manager is told the user holds roles they
  no longer hold, at the moment of disabling or enabling the account.
- **Who:** managers and the Site Administrator, using "Disable User" or
  "Enable User" on anyone who has had a role ended in this journal. A
  role ends when a manager presses "Remove Role" on the role table of the
  user's "Edit" page, when a manager uses "Remove User", or when the user
  unticks a role such as Reader on their own profile's "Roles" tab. These
  are ordinary actions, so such users are common.
- **Way round:** the list's "Roles" column shows the current roles, and
  the role table on the user's "Edit" page marks an ended role "User
  Removed From Role".

Low: the action itself is unaffected; it would be medium if the line
decided what "OK" does.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (or `stable-3_5_0`), context
  `publicknowledge`. `rvaca` (Ramiro Vaca) is its manager.
- The steps use Zita Woods (`zwoods`) and Carlo Corino (`ccorino`), both
  Author and Reader. On OMP use Zayan Zedd (`zzedd`) and Arthur Clark
  (`aclark`) instead. Nothing else is created.

A role ended on the user's "Edit" page:

1. Sign in as `rvaca` and open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
2. On Zita Woods's row open "More Actions" › "Edit". On the "Reader" line
   press "Remove Role", then "Remove Role" in the confirmation.
3. Open Settings › "Users & Roles" again. Zita Woods's row reads "Author"
   under "Roles".
4. On that row open "More Actions" › "Disable User". Read the line under
   the heading "Disable Zita Woods", then press "Cancel".

A user removed from the journal:

5. On Carlo Corino's row open "More Actions" › "Remove User" and press
   "OK". The row stays listed, with nothing under "Roles".
6. On that row open "More Actions" › "Disable User". Read the line under
   "Disable Carlo Corino", then press "OK".
7. On that row open "More Actions" › "Enable User". Read the line under
   "Enable Carlo Corino", then press "Cancel".

**Expected:** at step 4 the line reads "Current Roles: Author", the role
the "Roles" column shows. At steps 6 and 7 the window names no role,
since Carlo Corino holds none in the journal.

**Observed:** at step 4 the line under "Disable Zita Woods" reads:

```
Current Roles : Reader, Author
```

At step 6 the line under "Disable Carlo Corino" and at step 7 the line
under "Enable Carlo Corino" both read:

```
Current Roles : Reader, Author
```

No request fails and the browser logs no error.

For a user with no ended role the line is right apart from the colon:
David Buskins's reads "Current Roles : Section editor" ("Series editor"
on OMP, "Moderator" on OPS).

## Cause

`disableUser()` in
`lib/ui-library/src/managers/UserAccessManager/useUserAccessManagerActions.js`
builds the line from every entry of `user.groups`:

```js
const currentRoles = user.groups.map((group) => group.name).join(', ');
```

`user.groups` comes from the users API, which fills it in
`Repo::user()->preloadGroups()` (`lib/pkp/classes/user/Repository.php`)
with every assignment the user has in the context, ended ones included,
each with its `dateStart` and `dateEnd`. The ended ones are there on
purpose: the role table on the user's "Edit" page shows past roles with
their end dates (`UserInvitationPageStore.reloadCurrentUser()` reads the
same `groups` from `users/{id}`). Every other piece of code on the Users &
Roles list that reads `user.groups` treats an entry with a `dateEnd` as
no longer held, and `disableUser()` is the one that does not:

- the "Roles" and "Start Date" cells (`UserAccessManagerCellUserGroups.vue`,
  `UserAccessManagerCellStartDate.vue`) print a role only when
  `!userGroups.dateEnd`;
- the row menu offers "Remove User" only when an entry has
  `dateEnd === null` (`getItemActions()` in
  `useUserAccessManagerConfig.js`).

The line was added by
[888feebd](https://github.com/pkp/ui-library/commit/888feebd07da305d8f55e6db19e70e48c9bfedbb)
(part of the role invitation work), three days after
[ebaf055f](https://github.com/pkp/ui-library/commit/ebaf055fa848a471c0af8d1066af6f857c8ee082)
had added the `dateEnd` filter to the "Roles" cell. Its string,
`user.disabledModal.description` "Current Roles : {$roles}" in
`lib/pkp/locale/en/user.po`, came with
[c2f9b5e9](https://github.com/pkp/pkp-lib/commit/c2f9b5e9f9a0d925e3c2350a55b9a37e4d147813)
and has had the space before the colon since.

The server has its own definition of a current role,
`UserUserGroup::scopeWithActive()` (`date_start` now or earlier or null,
and `date_end` later than now or null), which `UserGridHandler::removeUser()`
uses. The client's `!dateEnd` agrees with it on every role a removal
ends, since a removal sets `date_end` to now. It differs on two kinds of
role: one whose start date is still to come (the server does not count
it, the "Roles" column lists it), and one whose end date is still to come
(the server counts it, the column hides it).

Reach:

- "Enable User" calls the same `disableUser()`, so its window has the
  same line (seen in the walk).
- Roles in other journals never appear, since `preloadGroups()` is
  limited to the current context.
- Several translations have the same space ("Aktuelle Rollen : …",
  "Huidige rollen : …", "Bieżące role : …"); French uses one by its own
  rules.

## Proposed fix

Filter `user.groups` in `disableUser()` the way the "Roles" cell does,
and leave the line out when no role is current; and drop the space in
the English string
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/fix.diff)):

```diff
-		const currentRoles = user.groups.map((group) => group.name).join(', ');
+		// The roles the list's "Roles" column shows: an ended role has a dateEnd.
+		const currentRoles = user.groups
+			.filter((group) => !group.dateEnd)
+			.map((group) => group.name)
+			.join(', ');
 ...
-				description: t('user.disabledModal.description', {
-					roles: currentRoles,
-				}),
+				description: currentRoles
+					? t('user.disabledModal.description', {roles: currentRoles})
+					: '',
```

```diff
 msgid "user.disabledModal.description"
-msgstr "Current Roles : {$roles}"
+msgstr "Current Roles: {$roles}"
```

The filter follows the "Roles" column rather than
`scopeWithActive()`, so that the window and the list it opens from
always agree. With no current role, `SideModalBodyLegacyAjax.vue` still
renders its description paragraph, so an empty line remains under the
heading; no text shows. The fix leaves that as it is, since dropping the
paragraph (`v-if="legacyOptions.description"` there) would change every
legacy side window and was not tried.

Tried on `main` in all three apps. Step 4 read "Current Roles: Author",
and at steps 6 and 7 the line under the heading was empty. A user with
only current roles kept them all, with the colon fixed: David Buskins
read "Current Roles: Section editor" ("Series editor" on OMP,
"Moderator" on OPS). The "Roles" column was the same with and without
the fix.

**Alternatives:**

- Filter in `preloadGroups()`, so the API sends current roles only. The
  role table on the user's "Edit" page reads the same property and would
  lose its ended roles.
- Keep "Current Roles:" with an empty list for a user with no current
  role. It tells the manager nothing and reads as a fault.

**What goes with it:**

- Left out: the two kinds of role on which the client and
  `scopeWithActive()` differ. With the fix, a role invited with a later
  start date is listed on the line as it is in the "Roles" column. A
  role with a later end date, which only the Users XML import stores, is
  hidden from both. The definition belongs on the server: an `active`
  flag in `preloadGroups()`, computed as `scopeWithActive()` does, read by
  the two cells, this line and the "Remove User" check in
  `getItemActions()`. That changes the list as well and is wider than
  this finding.
- Translations: only the English string changes. The translators of the
  other languages on Weblate decide on their own spacing.
- No data repair, no API or hook change.
- Backport: both hunks apply as written to `stable-3_5_0` (the `.po`
  hunk with an offset of three lines).
- Guard: an e2e scenario for "Disable User" after "Remove Role". A
  ui-library unit test of `disableUser()` would have to stub the global
  `pkp.context.legacyGridBaseUrl` (which `useLegacyGridUrl()` needs) and
  `useModal()`, and no test near `UserAccessManager` does that yet.

Small: a filter on one line of ui-library and one character of an
English string in pkp-lib, with no data, API or hook change; tried. The
second repository adds a string edit, not work.

## Evidence

- Kept script that takes the Steps on all three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js),
  run on an install freshly loaded from PKP's default test dataset with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js`
  (on `stable-3_5_0` with `PKP_E2E_LINE=stable-3_5_0` in front, as its
  header says). The script also opens the window for David Buskins and
  for Stephen Hellier on OJS and OMP or Catherine Kwantes on OPS (two
  current roles each), with and without the fix; with it, every current
  role stayed on the line.
- The fix, tried 2026-10-01 on the `main` tips below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/disable-window-lists-ended-roles/fix.diff ojs omp ops`
  (which rebuilds the JavaScript), the dataset reloaded, walk.js, then
  `node bin/try-fix.js revert ojs omp ops`. The walk read the empty
  line at steps 6 and 7 as an empty description paragraph.
- Walked 2026-10-01 on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794 and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); lib/ui-library 280f98c5 in all
    three.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd (lib/pkp
    a9c76aed62, lib/ui-library 1a7a4750). Same Observed as on `main`,
    word for word.
  - Nothing here depends on the database.
- Introduced: at lib/ui-library 280f98c5, `git blame` on the
  `currentRoles` line gives fae36ebd, which only rewrote the join;
  `git log -L` leads to 888feebd. Both are in `pkp/ui-library#515`;
  c2f9b5e9 is in `pkp/pkp-lib#10895`.
- 3.5, code: the same `disableUser()` at lib/ui-library 1a7a4750, the
  same `preloadGroups()` and string at lib/pkp a9c76aed62; 888feebd and
  c2f9b5e9 are on `stable-3_5_0`.
- 3.4 and 3.3, code: `origin/stable-3_4_0` (df13621c2d) and
  `origin/stable-3_3_0` (d446601ebe) of lib/pkp, `origin/stable-3_4_0`
  (ee684b34) and `origin/stable-3_3_0` (96959f9e) of lib/ui-library.
  Users & Roles is the older grid there. `UserGridHandler::editDisableUser()`
  shows `userDisableForm.tpl`, which has only the reason box, the
  `user.disabledModal` strings do not exist, and ui-library has no
  `UserAccessManager`. Not walked.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched
  2026-10-01; the nearest, `pkp/pkp-lib#13387`, `pkp/pkp-lib#2849` and
  `pkp/pkp-lib#11417`, are different faults.
- Code reads only, not driven: roles in other journals, the
  translations, disabling ending no role (`UserDisableForm::execute()`),
  the profile's "Roles" tab ending a role, `scopeWithActive()` and the two
  kinds of role it differs on, and the empty description paragraph in
  `SideModalBodyLegacyAjax.vue`.
