# Users & Roles: the "Disable User" window names roles the user no longer holds

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no "Current Roles" line, the older users grid)
  - 3.3: none (code; no "Current Roles" line, the older users grid)
- **Introduced** `pkp/ui-library#515` for `pkp/pkp-lib#9658` · [888feebd07](https://github.com/pkp/ui-library/commit/888feebd07da305d8f55e6db19e70e48c9bfedbb) · 2025-02-14 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Users & Roles, a manager presses "Disable User" on a
user's row. The line under "Disable {full name}" reads "Current Roles :
{roles}" with a space before the colon, and names every role the user
ever held in the journal, ended ones included, although the list's
"Roles" column leaves ended roles out. The "Enable User" window shows
the same line. For a user whose roles in the journal have all ended,
the line still lists each of them.

The account is disabled or enabled as asked, and nothing else reads
the line. The harm is confusion: a manager can take a role they removed
earlier, an editor's role for instance, for one the user still holds.

It shows for every user who has had a role removed, one role with
"Remove Role" on the user's roles page or all of them with "Remove
User".

## Impact

- **Who**: managers disabling or enabling a user who has lost a role in
  the journal, through "Remove Role" or "Remove User".
- **Way round**: the row's "Roles" column, or "Edit" on the row, shows
  the roles the user holds.

Low: a window shows a wrong list while the account changes as asked and
the list beside it is right. It would rise if anything acted on the
line, for instance if disabling ended only the roles it names.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. The user is
  Carlo Corino (`ccorino`, roles Author and Reader) [press: Arthur
  Clark, `aclark`].

1. Sign in as `rvaca` (password `rvacarvaca`).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). In the
   search box type "Corino" [press: "Clark"] and press Enter. The row's
   "Roles" column reads "Reader" and "Author".
3. Press the row's "…" button and choose "Edit". The user's roles page
   opens ("Users & Roles / Invite user to take a role").
4. On the "Reader" row press "Remove Role", then "Remove Role" in the
   confirmation ("Are you sure you want to remove this role? …"). The
   row now ends with "User Removed From Role".
5. Open Settings › Users & Roles again and search for "Corino" [press:
   "Clark"]. The row's "Roles" column reads "Author" only.
6. Press the row's "…" button and choose "Disable User".

**Expected:** the window "Disable Carlo Corino" names the roles the
user holds: "Current Roles: Author".

**Observed:** the window reads:

```
Disable Carlo Corino
Current Roles : Reader, Author
Reason for disabling user
```

As a control, Craig Montgomerie (`cmontgomerie`) [press: Alvin Finkel,
`afinkel`] holds both roles. His "Disable User" window reads "Current
Roles : Reader, Author", which is right apart from the space.

## Cause

ui-library's `useUserAccessManagerActions.js` `disableUser()` opens the
window for both "Disable User" and "Enable User" and builds the line
from every entry of `user.groups`:

```js
const currentRoles = user.groups.map((group) => group.name).join(', ');
```

`user.groups` is pkp-lib's `Repo::user()->preloadGroups()` output: every
`user_user_groups` row of the user in the context, ended ones included,
each with its `dateEnd`. The list's own cells skip the ended ones:
`UserAccessManagerCellUserGroups.vue` and
`UserAccessManagerCellStartDate.vue` print a role only when
`!userGroups.dateEnd` (ebaf055fa8, 2025-02-11, "hide roles when click
user action remove"). The line came three days later in 888feebd07
(`pkp/ui-library#515`), which did not take that filter over.

The space comes from the same commit: 888feebd07 wrote the label
`user.disabledModal.description` as "Current Roles : {$roles}" in
ui-library's `public/globals.js`, and pkp-lib's `locale/en/user.po`
took the same text.

Reach:

- The older users grid (Administration › "Hosted Journals" › the
  journal's arrow › "Settings wizard" › "Users", and the "Merge user"
  window) opens the same form with no roles line (code).
- The roles page ("Edit") lists ended roles on purpose, marked "User
  Removed From Role"; it is not this fault.
- The translations: cs, de, he, id, nl, pl, sl and tr copied the space
  before the colon; fr has it by French typography.

## Proposed fix

Filter the line with the rule the list's cells use, and drop the stray
space in the English text
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/fix.diff),
against the app root; inside ui-library apply it with `git apply -p3`):

```diff
-		const currentRoles = user.groups.map((group) => group.name).join(', ');
+		const currentRoles = user.groups
+			.filter((group) => !group.dateEnd)
+			.map((group) => group.name)
+			.join(', ');
```

```diff
 msgid "user.disabledModal.description"
-msgstr "Current Roles : {$roles}"
+msgstr "Current Roles: {$roles}"
```

The other languages go through Weblate: the eight translations that
copied the space (cs, de, he, id, nl, pl, sl, tr) are left to their
translators.

Tried on OJS, OMP and OPS `main`. With the fix, in the Steps the
window read "Current Roles: Author". Second check, with the fix: Craig
Montgomerie's "Disable User" window, both roles current, read "Current
Roles: Reader, Author". Carlo Corino, disabled before any role was
removed, got an "Enable Carlo Corino" window reading "Current Roles:
Reader, Author". After "Remove User" ended all of Craig Montgomerie's
roles, his window read "Current Roles:" with the fix, and "Current
Roles : Reader, Author" without it.

**Alternatives**

- Filter in pkp-lib's `preloadGroups()`: the roles page and the row
  menu's "Remove User" guard read the same `groups`, and the roles page
  needs the ended ones.
- Show the ended roles marked as ended: the line is headed "Current
  Roles", and the roles page already shows the history.

**What goes with it**

- No data to repair, no API change.
- A user with no current role gets "Current Roles:" with nothing after
  it. A word such as "None" there needs a new locale key; the fix
  leaves it out.
- A role whose end date is still to come is left out by the same
  `!dateEnd` rule, in the list and now in the window. Whether such a
  role counts as current is a question for the list's rule, apart from
  this fix.
- Guard: an e2e check of "Disable User" on a user with an ended role.

Small: a filter the same component already uses, and one character in
the English text.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/disable-window-lists-ended-roles/lib.js))
  takes the Steps on each app, and with the argument `neighbour` the
  second check named under the fix. On an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/disable-window-lists-ended-roles/walk.js [neighbour]`.
- Driven on screen on OJS, OMP and OPS `main` and `stable-3_5_0`, on
  PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Branch heads: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a,
  lib/ui-library 64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, lib/ui-library
  d4e01883); `stable-3_4_0` pkp-lib 32b0f4b4af, ui-library ee684b34;
  `stable-3_3_0` pkp-lib f6ab331645, ui-library 96959f9e.
- Code reads: on `main` and `stable-3_5_0`, ui-library
  `src/managers/UserAccessManager/` (`useUserAccessManagerActions.js`,
  the two cells, `useUserAccessManagerConfig.js`) and pkp-lib
  `Repository::preloadGroups()`, `maps/Schema.php` (`groups`), the
  same on both lines; `locale/*/user.po` on `main`. On `stable-3_4_0`
  and `stable-3_3_0`: "Current Roles" is only the Roles grid's title
  (`grid.roles.currentRoles`).
- The trace: a fixed text, `description: 'Currnet Roles :'` with no
  roles, came in ui-library
  [d25783a75a](https://github.com/pkp/ui-library/commit/d25783a75a22db9e6435a97e0f1dae749d219063)
  earlier on 2025-02-14 (also in `pkp/ui-library#515`). 888feebd07
  replaced it with `t('user.disabledModal.description', {roles})` and
  added the key, with the space, to `public/globals.js`. pkp-lib
  [c2f9b5e9f9](https://github.com/pkp/pkp-lib/commit/c2f9b5e9f9a0d925e3c2350a55b9a37e4d147813)
  (2025-02-25) added the same English string to `user.po`. fae36ebdb2
  (2025-02-17) only rewrote the loop as `map().join()`.
- Seen in passing, not covered: the `an` translation of the label reads
  "Rols actuals: {$rols}", a placeholder the code does not fill.
