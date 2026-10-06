# Users & Roles: the ORCID and "disabled" icons after a user's name have no name for screen readers

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older users grid shows no icons)
  - 3.3: none (code; the older users grid shows no icons)
- **Introduced** `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [e65555cf6](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula); the disabled icon in `pkp/ui-library#515` ([5f3116c69](https://github.com/pkp/ui-library/commit/5f3116c694c260858d96eee306c7f065efdd5db2), 2025-02-13, same author)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In Settings › Users & Roles › "Current Users", the "Name" cell shows an
ORCID icon after the name of a user with an ORCID iD, and a red
crossed-out person icon after the name of a disabled account. A screen
reader announces each as an image with no name.

So a manager who cannot see the screen cannot tell a disabled account
from an active one, or a user with an ORCID iD from one without. Nothing
is lost, and a disabled account can still be recognised: its row's "…"
menu offers "Enable User" where other rows offer "Disable User".

The ORCID icon shows for any ORCID iD stored on the account, verified
or not.

## Impact

- **Lost.** No data or work; the meaning of two icons.
- **Who.** Managers who use a screen reader, in any journal, press or
  server that has a disabled account or a user with an ORCID iD.
- **Way round.** The row's "…" menu reads "Enable User" on a disabled
  account. The row's "…" › "Edit" page lists the user's details with
  "ORCID iD" and the iD itself.

Low: two status icons without a name, with nothing lost and every
action working. It would rise if a manager had no other way to see that
an account is disabled.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS): the journal,
  press or server `publicknowledge`.
- `dbuskins` (David Buskins, user ID 4 in all three apps) has an ORCID
  iD connected through the ORCID integration. The dataset has no such
  user, and only ORCID's service can create one: a user connects their
  iD by signing in at ORCID, and the app then stores the answer. On a
  test install, insert the same six rows the app stores at that point
  (in `VerifyIdentityWithOrcid::setIdentityData()`):

  ```sql
  INSERT INTO user_settings (user_id, locale, setting_name, setting_value) VALUES
    (4, '', 'orcid', 'https://orcid.org/0000-0002-1825-0097'),
    (4, '', 'orcidIsVerified', '1'),
    (4, '', 'orcidAccessToken', 'u53r4-access-token'),
    (4, '', 'orcidAccessScope', '/activities/update'),
    (4, '', 'orcidRefreshToken', 'u53r4-refresh-token'),
    (4, '', 'orcidAccessExpiresOn', '2046-10-02 00:00:00');
  ```

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`).
3. In the row "Minoti Inoue" press "…", then "Disable User". Type the
   reason "u53r4" and press "OK".
4. Read the "Name" cells of "David Buskins" and "Minoti Inoue" with a
   screen reader, or in the browser's accessibility tree.

**Expected.** The icons carry names: "David Buskins" is followed by
"ORCID iD", "Minoti Inoue" by "Disabled".

**Observed.** Each name is followed by an image with no name, the same
on all three apps (the accessibility tree of the two cells):

```
- cell "David Buskins":
  - text: David Buskins
  - img
- cell "Minoti Inoue":
  - text: Minoti Inoue
  - img
```

Control: the row "Daniel Barnes", with neither icon, reads `cell
"Daniel Barnes"` alone.

## Cause

The "Name" cell is ui-library's
[`UserAccessManagerCellName.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/managers/UserAccessManager/UserAccessManagerCellName.vue#L7-L13).
It prints the name, then `<Icon icon="Orcid">` when `user.orcid` is
set and `<Icon icon="DisableUser">` when `user.disabled` is. `Icon`
renders a bare inline `<svg>` in a `<span>` and takes no name of its
own, and the cell passes neither an `aria-label` nor any hidden text.
A browser exposes such an `<svg>` as an image without a name.

The icons are the only place the list states either fact, so they carry
information and need a name (WCAG 1.1.1). Elsewhere ui-library gives
an icon its meaning with visually hidden text beside an `aria-hidden`
icon: `FieldAuthorsDisplay.vue` and `CitationManagerCellCitation.vue`
do so for the `OrcidUnauthenticated` icon inside an author's ORCID
link, and the Invitations table's own hidden "More Actions" heading
uses the same `sr-only` class.

Reach:

- The Invitations table on the same tab (code):
  [`UserInvitationManager.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/managers/UserInvitationManager/UserInvitationManager.vue#L38-L43)
  prints the same unnamed ORCID icon after an invitee's name. Not
  walked: the dataset holds no invitation.
- The ORCID icons after an iD's value in the invitation pages
  (`UserInvitationDetailsFormStep.vue`, `AcceptInvitationReview.vue`,
  `AcceptInvitationUserDetailsForms.vue`) and in `FieldOrcid.vue`
  (code): there the iD itself is printed under an "ORCID iD" heading,
  and the icon beside it means "verified". Naming those icons needs a
  "verified" text, so this report and its fix do not cover them.

## Proposed fix

Hide each icon from screen readers and put its meaning beside it as
hidden text, the pattern `FieldAuthorsDisplay.vue` uses, with texts
pkp-lib already has: `user.orcid` ("ORCID iD") and `common.disabled`
("Disabled")
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-list-status-icons-unnamed/fix.diff)):

```diff
 # lib/ui-library/src/managers/UserAccessManager/UserAccessManagerCellName.vue
-		<Icon v-if="user.orcid" icon="Orcid" class="h-4 w-4" :inline="true" />
-		<Icon
-			v-if="user.disabled"
-			icon="DisableUser"
-			class="h-4 w-4 text-negative"
-			:inline="true"
-		/>
+		<template v-if="user.orcid">
+			<Icon icon="Orcid" class="h-4 w-4" :inline="true" aria-hidden="true" />
+			<span class="sr-only">{{ t('user.orcid') }}</span>
+		</template>
+		<template v-if="user.disabled">
+			<Icon
+				icon="DisableUser"
+				class="h-4 w-4 text-negative"
+				:inline="true"
+				aria-hidden="true"
+			/>
+			<span class="sr-only">{{ t('common.disabled') }}</span>
+		</template>
```

with `useLocalize()` imported for `t`. `aria-hidden` reaches the
icon's root `<span>`, since `Icon.vue` does not turn off Vue's attribute
fallthrough (`inheritAttrs`); the walk with the fix in read
`aria-hidden="true"` there. The diff gives the Invitations
table's ORCID icon (`UserInvitationManager.vue`) the same treatment.
Both texts are translated in 52 of pkp-lib's 71 locales, French (Canada)
included ("Identifiant ORCID", "Désactivé"); the JavaScript build adds
`common.disabled` to the keys handed to the browser. The change touches
only what a screen reader hears: no API, hook or stored data.

Tried on `main`, on all three apps: with the diff applied, step 4 read
`cell "David Buskins ORCID iD"` and `cell "Minoti Inoue Disabled"`
("Identifiant ORCID" and "Désactivé" on the French page), and both
icons were still drawn at 16 × 16 px. The rest of the list, in English
and French (the other 23 rows' "Name" cells, the column headings, the
Invitations table), read the same with the fix as without.

**Alternatives**

- A `label` prop on `Icon` that sets `role="img"` and `aria-label` on
  its `<span>`: a reasonable design for ui-library to adopt for every
  icon, but a change to a shared component, where hidden text beside an
  `aria-hidden` icon needs none.
- A visible "Disabled" badge instead of the icon: clearer for everyone,
  but a design change.

**What goes with it**

- Backport: both files are the same on `stable-3_5_0`, so the diff
  applies there as written.
- Guard: an e2e check in the U53 spec that a disabled account's and an
  ORCID holder's "Name" cell read "Disabled" and "ORCID iD" in the
  accessibility tree.

Small: two components in ui-library with existing texts, tried, with an
e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/users-list-status-icons-unnamed/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-list-status-icons-unnamed/walk.js)
  takes the precondition and the Steps; its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-list-status-icons-unnamed/lib.js)
  `connectOrcid()` inserts the same six rows, finding the user by
  username. Run it on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/users-list-status-icons-unnamed/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). A second mode of
  the same script reads every row's "Name" cell, the column headings
  and the Invitations table, for the comparison with the fix in: only
  the two cells with icons changed.
- The precondition copies
  `PKP\orcid\actions\VerifyIdentityWithOrcid::setIdentityData()`: the
  same six `user_settings` rows (`orcid` as the full URI from
  `OrcidManager::getOrcidUrl()`, `orcidIsVerified` stored as `1` the
  way `DAO::convertToDB()` stores a boolean, the token, scope, refresh
  token and expiry). The SQL ran on PostgreSQL only; it is plain
  enough for MySQL and MariaDB but was not run there. The cell tests
  only `user.orcid`, the stored iD, so an unverified iD shows the same
  icon (code).
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on
  PostgreSQL, from pkp/datasets c657990 (2026-10-01). No request failed and no script error was recorded.
- Tips: OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363); OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883); `lib/pkp` on `stable-3_4_0` 32b0f4b4af, `stable-3_3_0`
  f6ab331645.
- Code reads: `UserAccessManagerCellName.vue`, `UserInvitationManager.vue`
  and `Icon.vue` on `main` and 3.5 (the same files); every use of the
  `Orcid`, `OrcidUnauthenticated` and `DisableUser` icons in
  ui-library's `src`; the `user.orcid` and `common.disabled` entries in
  pkp-lib's 71 locales. On 3.4 and 3.3,
  `templates/management/accessUsers.tpl` loads the older
  `UserGridHandler` grid, whose "Given Name" and "Family Name" columns
  print the names alone, with no icon (`DataObjectGridCellProvider`).
- Introduced: `git blame` on the cell gives e65555cf6 (the component
  and its ORCID icon) and 5f3116c69 (the disabled icon); their PRs are
  `pkp/ui-library#437` and `pkp/ui-library#515`, both for
  `pkp/pkp-lib#9658`.
- The "Enable User" way round is read in the code:
  `useUserAccessManagerConfig.js` `getItemActions()` labels the action
  "Enable User" when `user.disabled` is set.
- The "Edit" way round was read once on OJS `main` after the walk: the
  page (`/index.php/publicknowledge/en/management/settings/user/4`)
  showed "ORCID iD https://orcid.org/0000-0002-1825-0097". OMP and OPS
  build that page from the same pkp-lib and ui-library code (code).
- Not driven: a real screen reader (the walk read the cells'
  accessibility tree); the Invitations table's icon (code only).
