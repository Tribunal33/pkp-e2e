# Users & Roles: screen readers cannot tell a disabled account or an ORCID holder from any other user

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older user grid shows no status)
  - 3.3: none (code; the older user grid shows no status)
- **Introduced** ORCID icon: `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [e65555cf](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula); disabled icon: `pkp/ui-library#515` for `pkp/pkp-lib#9658` · [5f3116c6](https://github.com/pkp/ui-library/commit/5f3116c694c260858d96eee306c7f065efdd5db2) · 2025-02-13 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a12)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, "Users" tab, a red crossed-out person icon
follows the name of a disabled account, and the ORCID icon follows the
name of an account with an ORCID iD. The icons have no text
alternative, so a screen reader reads the name alone: a disabled account
sounds like an enabled one, and an ORCID holder like any other user.

Every task on the list still works. A screen-reader user can still
find the disabled accounts, but only by opening the rows' menus one by
one.

This is a gap in the list that came with 3.5, not a regression: 3.4's
user grid showed neither status to anyone, sighted or not.

## Impact

- **Lost:** nothing stored. A screen-reader user misses which accounts
  are disabled and which have an ORCID iD. The icons fail WCAG 2.1
  success criterion 1.1.1, "Non-text Content" (level A).
- **Who:** managers who use a screen reader, the Site Administrator
  included, whenever an account on the list is disabled or has an ORCID
  iD.
- **Way round:** for a disabled account, the row's "…" menu offers
  "Enable User" in place of "Disable User". The list cannot be filtered
  by status (it always asks for every account), so on a long list this
  means one menu per row, 25 rows a page. For an ORCID iD, the search
  box also matches the stored iD's address, so searching for "orcid"
  lists the accounts that have one (read in the code, not walked), but
  nothing on the screen suggests it. The "Edit" window does not show the
  iD. It shows only on the reader-facing
  editorial masthead, for people listed there with a verified iD, and in
  the reviewer picker, for reviewers.

Low: nothing is lost and every task gets done. A higher level would
need an action that goes wrong because the status was not heard, and
none was found.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (`publicknowledge`).
- "Minoti Inoue" (`minoue`) has an ORCID iD. No account in the dataset
  has one. Only ORCID's own authorization gives an account one, since
  the profile offers a button that connects to ORCID and no box to type
  the iD in. So this precondition is SQL. It writes the one row of what
  the authorization stores that the list reads:

  ```sql
  INSERT INTO user_settings (user_id, locale, setting_name, setting_value)
  VALUES ((SELECT user_id FROM users WHERE username = 'minoue'), '', 'orcid', 'https://orcid.org/0000-0002-1825-0097');
  ```

- A screen reader (NVDA, VoiceOver), or the browser's developer tools
  with the Accessibility pane, which shows what a screen reader is given.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/management/settings/access`), "Users"
   tab.
3. On the row "David Buskins", press "…" and choose "Disable User". Type
   "u53r43 test" as the reason and press "OK".
4. A red crossed-out person icon now follows "David Buskins", and the
   green ORCID icon follows "Minoti Inoue".
5. Move the screen reader through the "Name" cells of those two rows, or
   select each cell in the Accessibility pane.

**Expected:** each icon has a name that says what it shows, so that the
cells read "David Buskins Disabled" and "Minoti Inoue ORCID iD". A row
with neither status reads its name alone.

**Observed:** each icon is an image with no name, and each cell's name
is the user's name alone. The "Name" cell of "David Buskins", as the
browser gives it to a screen reader:

```
cell "David Buskins"
  StaticText "David Buskins"
  generic
    image            (no name)
```

"Minoti Inoue" reads the same: `cell "Minoti Inoue"`, then an image with
no name.

## Cause

`UserAccessManagerCellName.vue` (ui-library,
`src/managers/UserAccessManager/`) draws each row's "Name" cell: the
full name, then `<Icon icon="Orcid">` when the user's `orcid` is set
(line 7) and `<Icon icon="DisableUser">` when `disabled` is set (lines
8–13). `Icon.vue` renders a `<span>` around an inline `<svg>` with no
`<title>`, `role`, `aria-label` or `aria-hidden`, and it takes no label
of its own. Chromium gives such an SVG to screen readers as an image
with no name. The cell's name is built from its text, which is the
user's name alone.

The icons are the only place on the list that shows the two statuses.
There is no "Status" column, and the email, roles, start date and
affiliation read the same for a disabled account.

In ui-library, an `Icon` gives no name by itself, and the component
using it decides. An icon beside its own text is hidden with
`aria-hidden="true"` (`Button.vue`, `ButtonIcon.vue`, `TableColumn.vue`).
Where the icon alone says what a link or button is, it is hidden the
same way and followed by a `sr-only` text that names the control
(`FieldAuthorsDisplay.vue`, `CitationManagerCellCitation.vue`,
`DashboardActiveFilters.vue`). This cell does neither. Its icons are
status marks in a plain table cell, not controls, so those examples are
the closest pattern rather than the same case.

Reach:

- Every row with either status, on every page of the list and in every
  interface language: this one component draws them all. Seen in the
  browser on the first page of all three apps on `main` and 3.5.
- The Invitations table on the same tab (`UserInvitationManager.vue`,
  lines 38–43) draws the same unnamed ORCID icon after an invitee's
  name. Checked in the code only: no invitation in the dataset carries
  an ORCID iD.
- The invitation pages show the ORCID icon after the iD under an "ORCID
  iD" heading (`UserInvitationDetailsFormStep.vue`,
  `AcceptInvitationUserDetailsForms.vue`, `AcceptInvitationReview.vue`).
  There it is drawn only for a verified iD, so it carries a different
  message ("verified"), and it is left out of this fix.
- `SelectReviewerListItem.vue` and the comment windows
  (`UserCommentDetailModal.vue`, `UserCommentReportDetailModal.vue`)
  put the icon inside or beside a link whose text is the iD's address.
  The text already says it, so these are not this fault.

## Proposed fix

Hide each icon from screen readers and follow it with a `sr-only` text:
"ORCID iD" (locale key `user.orcid`) and "Disabled" (locale key
`common.disabled`):

```diff
--- a/lib/ui-library/src/managers/UserAccessManager/UserAccessManagerCellName.vue
+++ b/lib/ui-library/src/managers/UserAccessManager/UserAccessManagerCellName.vue
@@ -4,21 +4,30 @@
 			{{ user.fullName }}
 		</span>
 
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
 	</TableCell>
 </template>
 
 <script setup>
 import TableCell from '@/components/Table/TableCell.vue';
 import Icon from '@/components/Icon/Icon.vue';
+import {useLocalize} from '@/composables/useLocalize';
 
 defineProps({
 	user: {type: Object, required: true},
 });
+
+const {t} = useLocalize();
 </script>
```

([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-status-icons-unnamed/fix.diff))

Both texts already exist in lib/pkp and are translated in 52 of its 71
languages, French (`fr_CA`) included, so translators have nothing new
to do.

Tried on `main`, all three apps. The two cells read "David Buskins
Disabled" and "Minoti Inoue ORCID iD", with no unnamed image left. The
icons are still drawn at 16×16 in their colours. "Ramiro Vaca", with
neither status, still reads "Ramiro Vaca". Every other named control on
the tab (77 on OJS and OMP, 71 on OPS) has the same name with the fix
in and out.

**Alternatives:**

- `role="img"` and an `aria-label` on each `Icon` (the attributes reach
  `Icon.vue`'s `<span>`): this names the icon itself, but no ui-library
  component names an `Icon` that way.
- A `label` prop on `Icon.vue`, with the icon hidden when the prop is
  not given: this would cover every icon at once, but it changes how
  every existing caller is read and is a new pattern for the team to
  decide on.
- A `title` on each icon, which also gives sighted users a tooltip: a
  product choice, which can sit on top of the fix. A `title` alone is
  not announced reliably.

**What goes with it:**

- Give the Invitations table's ORCID icon (`UserInvitationManager.vue`)
  the same change in the same commit, since it is the same mistake on
  the same tab. It was not tried, because no invitation in the dataset
  carries an ORCID iD.
- No app-side commit: each app's `registry/uiLocaleKeysBackend.json`,
  which lists the keys the browser may ask for, is gitignored and
  regenerated by the build (`lib/pkp/tools/i18nExtractKeys.vite.js`),
  which adds `common.disabled`.
- Backport: `stable-3_5_0` has the same file, and the diff applies as it
  stands.
- The guard: an e2e check of the two cells' accessible names. A ui-library unit test that mounts the
  cell would need new test setup first: ui-library runs Vitest, but has
  no `@vue/test-utils` and no DOM environment (`jsdom` or `happy-dom`),
  and its tests cover only composables and stores. Storybook's a11y
  addon would not catch this fault, because axe checks an SVG's name
  only when the SVG has `role="img"`.

Small: one ui-library component, using texts that already exist, with
the e2e check as its test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-status-icons-unnamed/walk.js)
  writes the ORCID precondition, takes the Steps on an install freshly
  reset to the default dataset, and reads each "Name" cell from the
  browser's own accessibility tree (Chrome DevTools Protocol
  `Accessibility.getFullAXTree`, what a screen reader is given). It
  reads the cell's name and every node under it, including the nodes the
  tree marks as ignored, plus the icons' size on screen. As a neighbour
  check, it reads an ordinary row ("Ramiro Vaca") and every other named
  control on the tab:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/users-status-icons-unnamed/walk.js`.
  It reads David Buskins's cell right after "OK" and again after a
  reload; both read the same.
- The fix check:
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-status-icons-unnamed/fix.diff ojs omp ops`
  (rebuilds the JavaScript), reset the dataset, run the script, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/users-status-icons-unnamed/fix.diff ojs omp ops`;
  run with the fix in and out.
- The ORCID precondition: the script writes all six rows that
  `AuthorizeUserData::execute()` stores for a user connecting from their
  profile (`targetOp=profile`, through `getOrcidOAuthAccessData()` and
  `HasOrcid::setVerifiedOrcidOAuthData()`): `orcid`, `orcidIsVerified`
  `1`, `orcidAccessToken`, `orcidAccessScope` `/authenticate`,
  `orcidRefreshToken`, `orcidAccessExpiresOn`. The list reads only
  `orcid` (an `apiSummary` property of the user schema, tested by the
  cell), verified or not, so the Steps give that row alone; the one-row
  form was not walked on its own. The iD is ORCID's documented test iD.
  The profile turns its ORCID input into a hidden field
  (`templates/form/orcidProfile.tpl`), and `IdentityForm::execute()`
  never saves an `orcid` sent with the form, on `main` and 3.5.
- Tips: `main` OJS `bade233f73`, OMP `3b0ecf794c`, OPS `c8af945bb7`
  (lib/pkp `2e377d27fc` on OJS, `3dc90c81a6` on OMP and OPS; ui-library
  `280f98c5` on all three); `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`, ui-library
  `1a7a4750`); `stable-3_4_0` OJS `9571d8fde7` (lib/pkp `df13621c2d`,
  ui-library `ee684b34`); `stable-3_3_0` OJS `9fdb9bcf9a` (lib/pkp
  `d446601ebe`, ui-library `96959f9e`). Walked on the default dataset
  of pkp/datasets `38ab955` (2026-09-30), PostgreSQL. The finding does
  not depend on the database.
- 3.4, 3.3, read in the code: lib/pkp's
  `templates/management/accessUsers.tpl` loads the older
  `UserGridHandler` grid. Its columns are given name, family name,
  username, roles (3.4 only) and email, as plain text, with no mark for
  a disabled account or an ORCID iD. A disabled account showed only in
  the row's actions, "Enable" in place of "Disable" (`UserGridRow`).
  ui-library has no `UserAccessManager` on either branch.
- The list's request: `UserAccessManagerStore.js` always sends
  `status: 'all'` with only a search phrase. The phrase goes to
  `Collector::buildSearchFilter()`, which matches the username, email,
  name, preferred name, affiliation, biography, `orcid`, interests and
  role names, never the disabled flag. A search for "orcid" would also
  list an account whose biography or affiliation holds the word. Where a manager
  can see an ORCID iD: lib/pkp's `UserDetailsForm` and its template have
  no ORCID field; `templates/frontend/pages/editorialMasthead.tpl` links
  a verified iD; `SelectReviewerListItem.vue` shows a reviewer's iD.
- Introduced: `git blame` on `UserAccessManagerCellName.vue` gives
  e65555cf (the file's first commit) for line 7 and 5f3116c6 for lines
  8–13. The GitHub API's `commits/<sha>/pulls` gives
  `pkp/ui-library#437` and `pkp/ui-library#515` ("pkp/pkp-lib#9658
  changes in invitation and user access table").
- Translations: the `msgstr` of `user.orcid` and `common.disabled` in
  every `.po` file under lib/pkp's `locale/` on `main`, multi-line
  strings joined.
- Unverified: the names were read from Chromium's accessibility tree,
  not heard through NVDA or VoiceOver. A screen reader may say "image"
  or "graphic" for the unnamed icon, or skip it, and neither says what
  the icon means. The list's pages after the first were not opened.
- Upstream: pkp/pkp-lib and pkp/ui-library issues and PRs searched by
  symptom, by component name and among the "[A11Y]" issues. The nearest,
  `pkp/pkp-lib#12597` (an unlabelled ROR icon link on OPS's reader
  pages) and `pkp/pkp-lib#9354` (language icons that rely on colour),
  are other screens and other faults.
