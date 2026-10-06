# Users & Roles: screen readers announce every user row's "…" button as "##userAccess.management.options##"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the older users grid, no "…" button)
  - 3.3: none (code; the older users grid, no "…" button)
- **Introduced** `pkp/ui-library#437` for `pkp/pkp-lib#9658` · [e65555cf6](https://github.com/pkp/ui-library/commit/e65555cf63f327dcad705eb6aa3bb43150ef7c38) · 2025-02-04 · Ipula Indeewara (ipula)
- **Upstream** `pkp/pkp-lib#12646` (open) is this same fault, reported on OMP 3.5 only; this report widens it to OJS, OMP and OPS on `main` and 3.5
- **Tracked in** spec U53 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a5), spec U06 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a7) (its "##userAccess.management.options##" item)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A screen reader announces the "…" button at the end of every row in
Settings › Users & Roles › "Current Users" as
"##userAccess.management.options##" instead of a word such as "More
Actions". The button shows only three dots, so this raw translation key
is all a blind manager hears.

Nothing is lost: the button works, and the menu it opens reads normally.

The raw key is the same in every language the journal, press or server
offers, English included.

## Impact

- **Lost.** No data or work; one button's name, on every row.
- **Who.** Managers who use a screen reader or voice control, every
  time they open Users & Roles.
- **Way round.** Screen-reader users can press the button anyway and
  hear the menu's items. Voice-control users have none: the button has
  no name they can say.

Low: a wrong name on one control, with nothing lost. It would rise if
the menu's items were unnamed too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS): the journal,
  press or server `publicknowledge`. Nothing else.

Steps:

1. Sign in as `rvaca` (the manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). The
   "Users" tab shows "Current Users".
3. Read the name of the "…" button at the end of the row "Daniel
   Barnes": listen with a screen reader, or inspect the button (its
   `aria-label`).
4. Press the button and read the menu. Press it again to close it.
5. Open the same page in French,
   `/index.php/publicknowledge/fr_CA/management/settings/access`, and
   read the same button's name.

**Expected.** Steps 3 and 5 give the button a name in words, as the
list's own hidden column heading does ("More Actions") and as the "…"
buttons of the other lists do. Step 4 opens the row's menu.

**Observed.**

```
Step 3: ##userAccess.management.options##   (the same on all 25 rows of the first page)
Step 4: Edit, Email, Login As, Remove User, Disable User, Merge user
Step 5: ##userAccess.management.options##
```

## Cause

The button is ui-library's `DropdownActions` in
[`UserAccessManagerCellActions.vue`](https://github.com/pkp/ui-library/blob/64d67363/src/managers/UserAccessManager/UserAccessManagerCellActions.vue#L5),
whose ellipsis variant uses its `label` prop as the button's
`aria-label`. The label is `t('userAccess.management.options')`.

No locale file defines `userAccess.management.options`: not pkp-lib's
`locale/*/userAccess.po` (which hold the list's other three keys), not
any other pkp-lib or app locale file, in any language, on any branch.
`t()` returns a key it cannot find wrapped in `##`. The key came in with
the list itself in e65555cf6 and was never given a text; Storybook's
mock locale (`public/globals.js`) even lists it with the raw code as
its value.

The list's own hidden column heading over these buttons
(`useUserAccessManagerConfig.js`) already reads
`t('common.moreActions')`, "More Actions", and so do the "…" buttons of
the other ui-library lists (`FunderManagerCellActions.vue`,
`DataCitationManagerCellActions.vue`, `GalleyManagerCellActions.vue`,
`TaskTemplateManagerCellActions.vue`, `ReviewerManagerCellActions.vue`).

Reach:

- The Invitations table above the list (code): its rows' "…" button
  reads `invitation.management.options`, which pkp-lib defines
  ("Invitation management options"); not affected.

## Proposed fix

Name the button with the text its column heading and the sibling lists
already use, in ui-library
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-list-row-button-raw-key/fix.diff)):

```diff
 # lib/ui-library/src/managers/UserAccessManager/UserAccessManagerCellActions.vue
 		<DropdownActions
 			:actions="store.getItemActions({user})"
-			:label="t('userAccess.management.options')"
+			:label="t('common.moreActions')"
```

`common.moreActions` is already in the keys the JavaScript build hands
to the browser, and it is translated in 34 of pkp-lib's 71 locales. No
code but this line reads `userAccess.management.options`, so nothing
else changes; no API, plugin hook or stored data is involved.

Tried on `main`, on all three apps: with the diff applied, every row's
button read "More Actions" (25 of 25) and the menu was unchanged. The
rest of the Users tab, in English and French (the column headings,
every other button, the Invitations table, three rows' menus), read the
same with the fix as without.

**Alternatives**

- Add a text for `userAccess.management.options` to pkp-lib's
  `userAccess.po`: a second text for the same button, starting
  untranslated in every language but English.
- Name each row's button after its user ("Daniel Barnes More Actions",
  as `ReviewerSuggestionManager.vue` does, or a new key with a
  `{$name}` placeholder, as `pkp/pkp-lib#12646` suggests): clearer in a
  screen reader's list of buttons, but a new string to translate; it
  can follow this fix.

**What goes with it**

- French (Canada), the dataset's second language, has no
  `common.moreActions` in pkp-lib's `fr_CA` locale, so there the button
  reads "##common.moreActions##" with the fix in, as the column's hidden
  heading already does without it. That gap is the French translation's,
  and its fix adds the text (spec U53
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a11),
  [its report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U53-A11-users-tab-french-raw-keys.md)).
- Storybook's `public/globals.js` entry for the old key can go.
- Backport: the file is the same on `stable-3_5_0`, so the diff applies
  there as written.
- Guard: an e2e check in the U53 spec that each row's "…" button has a
  name with no `##`.

Small: one line in one component, tried, with an e2e check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/users-list-row-button-raw-key/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-list-row-button-raw-key/walk.js)
  takes the Steps. Run it on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/users-list-row-button-raw-key/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). A second mode
  of the same script reads the rest of the Users tab, for the
  comparison with the fix in.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on
  PostgreSQL, from pkp/datasets c657990 (2026-10-01). A database plays
  no part. No request failed and no script error was recorded.
- Tips: OJS `main` b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363); OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (`lib/pkp`
  3dc90c81a6, `lib/ui-library` 280f98c5); `stable-3_5_0` OJS 091fb65453,
  OMP 9c5e24246, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883); `lib/pkp` on `stable-3_4_0` 32b0f4b4af, `stable-3_3_0`
  f6ab331645.
- Code reads: `UserAccessManagerCellActions.vue`,
  `useUserAccessManagerConfig.js` (the column heading) and
  `DropdownActions.vue` (label as `aria-label`) on `main` and 3.5 (the
  same files); `I18nController::getTranslations()` and
  `UITranslator::getTranslationStrings()` (no fallback to English for a
  missing key); a search of pkp-lib's and the apps' locale files for
  the key, and `git log -S` in pkp-lib and ui-library (the key appears
  only in e65555cf6's component and in `6421d4625`'s Storybook mock).
  On 3.4 and 3.3, `templates/management/accessUsers.tpl` loads the
  older `UserGridHandler` grid, which has no "…" button, and neither
  branch's pkp-lib nor ui-library holds the key.
- Introduced: `git blame` on the label line ends at e65555cf6, the
  commit that created the component; `736e2525` later changed only the
  `t` import.
- Upstream: `pkp/pkp-lib#12646` has no linked PR.
- Not driven: a real screen reader (the walk read the button's
  `aria-label` and its accessible name); languages other than English
  and French (Canada) (code: the key is in none).
