# Presses and preprint servers: the Users search box suggests searching for "Journal editor", a role they lack

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: none (read in the code: the older users grid has no such box)
  - 3.3: none (read in the code: the older users grid has no such box)
- **Introduced** `pkp/pkp-lib#11535` for `pkp/pkp-lib#11474` · [09fc790b46](https://github.com/pkp/pkp-lib/commit/09fc790b46b5213ce2b5af5f5f42fb8ab6fdc442) · 2025-06-18 · Taslan A. Graham (taslangraham). The parallel PR `pkp/pkp-lib#11533` made the same change on `stable-3_5_0` a day earlier.
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, the search box above "Current Users" reads
"Enter a user's name, role (e.g Journal editor), or affiliation" on a
press and on a preprint server too. Neither has a role of that name: a
press calls its editors "Press editor", and a preprint server has no
editor role. A manager who searches for the suggested role gets "Current
Users (0)". On a journal the example is right, since "Journal editor" is
the journal's own role.

The search itself works when the manager types the role as their press
or server names it. The box read "Search User" in the first 3.5 release
(3.5.0-0); the example came with 3.5.0-1.

## Impact

- **Lost**: nothing. A manager who follows the example may conclude
  that searching by role does not work.
- **Who**: every manager of a press or preprint server who opens the
  Users list, on every visit. Screen readers read the same text as the
  box's label.
- **Way round**: type a role name the press or server uses ("Press
  editor", "Moderator").

Low: wording only.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (or OPS `main`). Nothing else.

Steps:

1. Sign in as `rvaca` (the press's "Press manager"; on OPS the
   "Preprint Server manager").
2. Open Settings › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`). The
   "Users" tab shows "Current Users (38)" (OPS: "Current Users (25)").
3. Read the search box above the list, before typing anything.
4. Type `Journal editor` into the box and press Enter.
5. Press the × at the box's end ("Clear search phrase"), type
   `Press editor` (OPS: `Moderator`) and press Enter.

**Expected**: at step 3 the box's text names no role the press or server
lacks: either a role it has or none at all.

**Observed**: at step 3 the box reads

```
Enter a user's name, role (e.g Journal editor), or affiliation
```

At step 4 the list reads "Current Users (0)", "No Items", "Showing 0 to
0 of 0". At step 5 it finds Daniel Barnes on OMP ("Current Users (1)"),
and David Buskins, Stephanie Berardo and Minoti Inoue on OPS ("Current
Users (3)").

On OJS the same text names the journal's own "Journal editor" role, and
step 4 finds Daniel Barnes.

## Cause

The text is pkp-lib's English message `userAccess.search` in
`locale/en/userAccess.po`:

```
msgid "userAccess.search"
msgstr "Enter a user's name, role (e.g Journal editor), or affiliation"
```

ui-library's `UserAccessManagerActionSearch.vue` passes it to
`Search.vue`, which uses it as the input's `placeholder` and as the text
of a screen-reader-only `<span>` inside the input's `<label>`. No app's
locale defines the key, so OJS, OMP and OPS all show pkp-lib's text. The
role names it gives as an example belong to each app:
`default.groups.name.editor` is "Journal editor" in OJS and "Press
editor" in OMP, and OPS installs no editor group (its sub-editor group
is "Moderator").

The line came with
[09fc790b46](https://github.com/pkp/pkp-lib/commit/09fc790b46b5213ce2b5af5f5f42fb8ab6fdc442)
(`pkp/pkp-lib#11535` for `pkp/pkp-lib#11474`), which added role names
to the users search and replaced the box's text "Search User" so that it
tells managers they can search by role. On `stable-3_5_0` the parallel
PR `pkp/pkp-lib#11533`
([7d08d72b88](https://github.com/pkp/pkp-lib/commit/7d08d72b8816dcb7119c4709885206c8f1be5325),
2025-06-17) made the same change.

Reach:

- No other screen uses the message: `UserAccessManagerActionSearch.vue`
  is the only place in ui-library's `src/` that reads it (checked in the
  code). Walked on all three apps.
- Translations (checked in the code): 20 languages list the key in
  pkp-lib, and 4 of them translate it. Arabic and Slovenian carry the
  same journal-only example ("محرر المجلة", "urednik revije"); Swedish
  names a generic editor, and Japanese gives no example. The other 16
  leave it empty and show the English.

## Proposed fix

Drop the example from the shared message, keeping the mention of roles
that `pkp/pkp-lib#11474` asked for
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-search-example-journal-role/fix.diff);
its paths are relative to an app checkout, `lib/pkp/…`, so in a pkp-lib
clone apply it with `-p3`):

```diff
--- a/lib/pkp/locale/en/userAccess.po
+++ b/lib/pkp/locale/en/userAccess.po
@@ -5,4 +5,4 @@ msgid "userAccess.tableHeader.name"
 msgstr "Name"
 
 msgid "userAccess.search"
-msgstr "Enter a user's name, role (e.g Journal editor), or affiliation"
+msgstr "Enter a user's name, role, or affiliation"
```

The message is shared by three apps, and no role name fits all three
apart from "Author" and "Reader", which are not what a manager searches
for. A text with no example is right on every app, and on any context
whose manager has renamed its roles. The Japanese translation already
reads this way. Tried on `main` on the three apps: the box reads "Enter
a user's name, role, or affiliation", and the role search at step 5
finds the same users as without the fix.

**Alternatives**:

- App-specific messages, as `pkp/pkp-lib#10575` did for
  `userInvitation.searchUser.stepDescription`: OMP and OPS define
  `userAccess.search` in their own `locale/en` with "Press editor" and
  "Moderator". It keeps an example, but takes two app repos and their
  translations for a hint, and still misleads where a context renames
  the role.
- An example every app has ("e.g. Author"): it points managers at the
  role with the most users.

**What goes with it**:

- Translations: the English change is the part that must land. Arabic
  and Slovenian keep the journal example until their translators update
  them through the translation platform.
- Other journal-only wording in pkp-lib's shared English, found by
  searching its `locale/en` for journal role names, and left out because
  each sits on another screen (read in the code, not walked):
  `invitation.unavailable.description`,
  `emails.userRoleMastheadUpdateNotify.body` and `orcid.failure.contact`
  ("contact the journal manager"), and `dashboard.noAccessBeingAuthor`
  and `dashboard.noAccessBeingReviewer` ("as a Journal Manager"). No app
  overrides them.
- Backport: the diff applies to `stable-3_5_0` as written; 3.4 and 3.3
  have no such message.
- Test: an e2e check that reads the box's text on a press and a
  preprint server.

Small: one English message in pkp-lib, no code change.

## Evidence

- The kept script takes the Steps on all three apps, then reads the
  editorial dashboard's search box, another user of `Search.vue`, to
  show the fix leaves it alone:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-search-example-journal-role/walk.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/users-search-example-journal-role/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). No request failed
  and no page script failed.
- The fix was tried on the `main` tips below, on a freshly loaded
  dataset:
  `node bin/try-fix.js apply shared/playwright/checks/issues/users-search-example-journal-role/fix.diff ojs omp ops`,
  then walk.js, then `node bin/try-fix.js revert ojs omp ops`. Steps 4
  and 5 and the dashboard's box ("Search submissions") gave the same
  results with and without the fix.
- Walked on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, and
  no upgrade was needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6), ui-library 280f98c570;
    `locale/en/userAccess.po` is the same in both pkp-lib commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd
    (lib/pkp a9c76aed62, ui-library 1a7a47504c). Observed matched `main`
    word for word, and the message and
    `UserAccessManagerActionSearch.vue` are the same.
- Kind: regression, read in the code of the release tags. The OJS, OMP
  and OPS `3_5_0-0` tags pin pkp-lib 9acff586e5 (2025-06-16), where
  `userAccess.search` reads "Search User", and ui-library 212910e015,
  which already has `UserAccessManagerActionSearch.vue`. So 3.5.0-0
  shipped this box with a correct text. pkp-lib's `3_5_0-1` and later
  tags contain 7d08d72b88; `3_5_0-0` does not.
- 3.4 and 3.3 were read in the code, in pkp-lib `stable-3_4_0`
  (df13621c2d) and `stable-3_3_0` (d446601ebe): `locale/en/userAccess.po`
  does not exist, and the Users list is the older grid, whose filter
  (`templates/controllers/grid/settings/user/userGridFilter.tpl`) is a
  "Search" box beside a role list built from the context's own roles
  (`UserGridHandler::renderFilter()`). No English message there holds
  "role (e.g".
- Introduced: blame on main's `msgstr` line gives 09fc790b46; the key
  itself came with 4729a3cd9c (2024-11-01, "add user access table"),
  reading "Search User". GitHub's commit-to-PR lookup gives
  `pkp/pkp-lib#11535`. On `stable-3_5_0` blame gives 7d08d72b88
  (`pkp/pkp-lib#11533`).
- Translations: counted in main's pkp-lib, `locale/*/userAccess.po`.
- Upstream: searched pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library
  issues and PRs on 2026-10-01 for "Journal editor" with search, users
  and placeholder, "search by role", "Users & Roles" search,
  `userAccess.search` and `UserAccessManager` search. The nearest,
  `pkp/pkp-lib#11792` (closed), reported that searching for a role found
  no one on OJS 3.5; it was closed as working and does not concern the
  example's role name.
- MySQL not checked; the fault does not depend on the database.
