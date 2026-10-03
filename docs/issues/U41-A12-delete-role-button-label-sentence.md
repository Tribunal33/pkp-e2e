# The button that deletes a contributor role is labelled with a warning question, not the action

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no "Contributor Roles" settings)
  - 3.4: none (code; no contributor roles)
  - 3.3: none (code; no contributor roles)
- **Introduced** PR `pkp/ui-library#696` for issue `pkp/pkp-lib#11378` · [b628fd2b78](https://github.com/pkp/ui-library/commit/b628fd2b78276df37f218530419a5704e684f78d) · 2025-11-11 · jyhein (jyhein)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

In the type-to-confirm delete-role dialog, the confirm button's label is
the message "Are you sure you wish to delete this item? This action
cannot be undone." That is a warning question where a label naming the
action belongs.

The button still works: it enables once the role's identifier is typed,
and the role is deleted. The label meant for it, "I understand the
consequences, delete this role", is already in the application's English
texts but unused.

## Impact

- **Lost**: nothing. The button asks a question instead of naming the
  action, and repeats "This action cannot be undone." from the text
  above it; a screen reader announces the whole question as the
  button's name.
- **Who**: journal, press and server managers on Settings › Workflow ›
  "Submission" › "Contributor Roles", each time they delete a role.
- **Way round**: none needed.

Low: the label is wrong and nothing else; the delete is done.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its
  "Translator" contributor role is held by no contributor, so it can be
  deleted.

1. Sign in as `rvaca` (password `rvacarvaca`; Journal manager, Press
   manager on OMP, Preprint Server manager on OPS).
2. Open Settings › Workflow, the "Submission" tab, then "Contributor
   Roles" (`/index.php/publicknowledge/en/management/settings/workflow`).
3. On the "Translator" row, press "More Actions" (⋯) and choose "Delete
   Role".
4. Read the dialog's buttons.
5. Type `TRANSLATOR` into the box.
6. Press the primary button beside "Cancel".

**Expected.** The confirm button names the action: "I understand the
consequences, delete this role", as the category dialog's reads "I
understand the consequences, delete this category".

**Observed.** The same on the three apps. The dialog reads:

```
Are you absolutely sure you want to delete "TRANSLATOR" role?
This action cannot be undone. Before deleting this role, check these:
  At least one AUTHOR role must exist
  Unassign this role from any contributor currently using it
To confirm, please type "TRANSLATOR" below to proceed
[ Are you sure you wish to delete this item? This action cannot be undone. ]  [ Cancel ]
```

The first button is disabled until step 5 and enabled after it. Step 6
shows "Role Deleted": ""TRANSLATOR" has been successfully deleted.", and
"Translator" is gone from the list.

## Cause

`ContributorRoleDeleteDialogBody.vue`
(`lib/ui-library/src/managers/ContributorRoleManager/`, line 23) draws
the confirm button's label with `t('common.confirmDelete')`. That key is
the shared confirmation question ("Are you sure you wish to delete this
item? This action cannot be undone."), which every other screen uses as
a dialog's question, never as a button's label.

The file was copied in b628fd2b78 from the earlier
`CategoryDeleteDialogBody.vue` (b35c06bc, `pkp/ui-library#550`, May
2025), whose button uses a key of its own,
`manager.category.confirmDelete` ("I understand the consequences,
delete this category"). The pkp-lib side of the contributor-role work,
PR `pkp/pkp-lib#11765` (commit
[52d3a0f8e7](https://github.com/pkp/pkp-lib/commit/52d3a0f8e70659ff8a1507068866a6abdeb8ec90),
same issue), added the matching key
`manager.contributorRoles.alert.delete.confirm` ("I understand the
consequences, delete this role") to `locale/en/manager.po`, but nothing
reads it.

Reach:

- The contributor-role delete dialog on the three apps (walked); the
  file is identical in the ui-library commits of OJS and of OMP and OPS.
- The category delete dialog, the only other dialog whose button waits
  for typed input, is labelled correctly (code).
- `common.confirmDelete` as a button label elsewhere: none (code; every
  other use is the question passed to a confirmation dialog, in
  ui-library and in the legacy `RemoteActionConfirmationModal` of
  pkp-lib and the apps).

## Proposed fix

Recommended (a proposal): use the key pkp-lib added for this button
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-role-button-label-sentence/fix.diff),
in `lib/ui-library`):

```diff
 			>
-				{{ t('common.confirmDelete') }}
+				{{ t('manager.contributorRoles.alert.delete.confirm') }}
 			</PkpButton>
```

The build's key extraction (`lib/pkp/tools/i18nExtractKeys.vite.js`)
adds the key to the page's texts, so nothing else changes. Tried on
`main` on the three apps: the button reads "I understand the
consequences, delete this role", stays disabled until the identifier is
typed, and deletes the role.

In other languages: the new key exists only in English so far (1 of
pkp-lib's 71 locales), while the question it replaces is translated in
55. A key missing from the manager's language is shown raw, as
`##manager.contributorRoles.alert.delete.confirm##` (`Locale::translate()`
has no English fallback). That is already the state of the dialog's
title and message, which are also English-only, and of the category
dialog's label. So before the fix, a French manager sees raw keys in the
dialog's title and message and a translated button; after it, the button
is raw too, until the translators add the dialog's keys. This does not
change the recommendation: keeping the old question would keep one
button translated in an otherwise untranslated dialog, with the wrong
label.

**Alternatives**

- `common.delete` ("Delete", translated in 55 locales): right in every
  language today, but drops the "I understand the consequences" wording
  the two type-to-confirm dialogs share, and leaves the added key unused.

**What goes with it**

- The dialog's three new keys reach the translators together.
- The box in the same dialog has no label, reported on its own
  ([U16-A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A18-delete-category-box-unnamed.md));
  both fixes touch this file and apply together.
- Guard: an end-to-end check that opens "Delete Role" and finds the
  button by the name "I understand the consequences, delete this role".

Small: one line in one ui-library file, tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-role-button-label-sentence/walk.js).
  It takes the Steps as `rvaca` on PKP's default dataset (pkp/datasets
  566bb1f, 2026-10-03) and reads each dialog button's accessible name and
  disabled state before and after typing. `MODE=neighbour` types
  `translator` instead and presses "Cancel": with and without the fix
  the button stayed disabled and the role stayed. Run on a freshly loaded
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/delete-role-button-label-sentence/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Tips walked, on PostgreSQL:
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). No request failed and the browser logged no script error.
  - 3.5: OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c, OPS
    38b61882d3 (pkp-lib cf3f984335); ui-library d4e01883. Steps 1-2
    walked: the "Submission" tab has no "Contributor Roles".
- Code reads:
  - main: blame on line 23 of `ContributorRoleDeleteDialogBody.vue` lands
    on b628fd2b78, the file's only commit (PR `pkp/ui-library#696`,
    merged 2025-11-20); `manager.contributorRoles.alert.delete.confirm`
    comes from pkp-lib 52d3a0f8e7 (PR `pkp/pkp-lib#11765`, merged
    2025-11-20) and has no reader in pkp-lib, ui-library or the apps.
    Searched ui-library `src/` for dialog bodies whose button is gated on
    a typed value, and for `confirmDelete` used as a label.
  - Other languages: the keys counted across `lib/pkp/locale/*/*.po`;
    the missing-key output read in `Locale::translate()` and
    `UITranslator::getTranslationStrings()`.
  - 3.5: no `ContributorRoleManager` in ui-library d4e01883, no
    `manager.contributorRoles.*` keys in pkp-lib.
  - 3.4 (ui-library ee684b34, pkp-lib 767353f4fe) and 3.3 (ui-library
    96959f9e, pkp-lib ac3fa73402): no contributor-role screens or keys.
- Not driven: a screen reader (the name is read from the button as the
  browser exposes it); the dialog in a language other than English (the
  raw-key display is from the code); 3.4 and 3.3.
