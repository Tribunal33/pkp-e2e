# On a press or preprint server, the users search box suggests searching for "Journal editor", which finds nobody

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: OMP, OPS
  - 3.4: none (code; the older users list, whose search names no role)
  - 3.3: none (code; the older users list, whose search names no role)
- **Introduced** `pkp/pkp-lib#11535` for `pkp/pkp-lib#11474` · [09fc790b46](https://github.com/pkp/pkp-lib/commit/09fc790b46b5213ce2b5af5f5f42fb8ab6fdc442) · 2025-06-18 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U53 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a press or a preprint server, the search box of Settings › Users &
Roles › "Users" reads "Enter a user's name, role (e.g Journal editor),
or affiliation". Neither has a role of that name: a press's editor is
the "Press editor", and a preprint server's editorial role is the
"Moderator". A manager who types the example gets an empty list,
"Current Users (0)".

The wrong example shows in English and, read in the code, in French
(France), on both presses and preprint servers.

## Impact

- **Lost.** Nothing.
- **Who.** Managers of every press and preprint server who search the
  users list in English or French (France). In other languages the box
  shows that language's translation of pkp-lib's example, which was
  not checked against each language's role names.
- **Way round.** Type the role's name as the "Roles" column shows it.

Low: a hint that names the wrong application's role, while the search
itself works. It would rise if managers had no other way to find a
role's holders.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main` or OPS `main`
  (`publicknowledge`). The OJS dataset is the control: on OJS, steps 1
  to 4 as its Journal manager `rvaca`.

1. Sign in as `rvaca` (Press manager; Preprint Server manager).
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`). The
   "Users" tab is open.
3. Read the search box above "Current Users".
4. Type the example, "Journal editor", into the box and press Enter.
   Read the list.
5. Replace the text with the role the press or server has, "Press
   editor" (OMP) or "Moderator" (OPS), and press Enter.

**Expected.** The example names a role of the press or server, such as
"Press editor" or "Moderator", and searching for it lists its holders,
as on a journal, where step 4 lists Daniel Barnes, "Journal editor".

**Observed.**

```
Step 3 (OMP, OPS):  Enter a user's name, role (e.g Journal editor), or affiliation
Step 4 (OMP, OPS):  Current Users (0)   No Items
Step 5 (OMP):       Current Users (1)   Daniel Barnes  dbarnes@mailinator.com  Press editor
Step 5 (OPS):       Current Users (3)   David Buskins, Stephanie Berardo, Minoti Inoue  Moderator
```

No request failed and no script error showed.

## Cause

The search box's text is pkp-lib's `userAccess.search`
(`lib/pkp/locale/en/userAccess.po`), which ui-library's
`UserAccessManagerActionSearch.vue` passes as the box's label and
placeholder. The text names OJS's editor role, "Journal editor"
(`default.groups.name.editor` in OJS's `locale/en/default.po`). OMP's
role of that key is "Press editor", and OPS installs no editor role:
its editorial role is the section editor, named "Moderator".

The text dates from
[09fc790b46](https://github.com/pkp/pkp-lib/commit/09fc790b46b5213ce2b5af5f5f42fb8ab6fdc442),
which made the users list search role names
(`PKP\user\Collector`, a match on `user_group_settings.name`) and
changed the text from "Search User" to invite that search, with a
journal role as the example. `Collector::buildSearchFilter()` splits
the phrase into words and requires each word to match some field of
the account (the names, email, affiliation and the others, or the name
of any role the user holds), so "Journal editor" finds nobody where no
role contains "Journal". The same split means "Press editor" also
lists someone who holds both "Press manager" and "Series editor",
which matters to whoever picks the example's wording.

OMP and OPS can replace any pkp-lib text with their own: the
applications register their `locale` folder after pkp-lib's, and a key
both define takes the application's text. They already do this
where a shared text does not fit the application: OMP and OPS replace
`admin.settings.statistics.sushiPlatform.isSiteSushiPlatform` ("…for
all journals") with "…for all presses" and "…for all servers" in their
`admin.po`, and OPS replaces the role name in
`mailable.editorAssigned.name` with "Moderator Assigned (Auto)" in its
`manager.po`. Each sits in the application file named like pkp-lib's.
Neither application does it for `userAccess.search`.

Reach:

- On screen (`main` and 3.5): the users list's search box, as its
  visible text and as the box's name for a screen reader, on OMP and
  OPS.
- French (France) (code): the box reads "(p. ex. rédacteur/ice)".
  OMP's French roles are "Responsable d'édition", "Responsable de
  collection" and "Gestionnaire", and OPS's French file names no
  roles, so the example names no role of a press or a server there
  either. Other languages show pkp-lib's translation on OMP and OPS;
  they were not checked one by one.
- Not this fault: French (Canada) has no text for this key at all, so
  the box shows a code there (spec U53
  [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a11),
  reported apart).

## Proposed fix

Give OMP and OPS their own `userAccess.search`, in a new
`locale/en/userAccess.po` in each application, naming the role the
application installs
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-search-example-journal-role/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-search-example-journal-role/fix-ops.diff)):

```diff
 # omp: locale/en/userAccess.po (new)
+msgid "userAccess.search"
+msgstr "Enter a user's name, role (e.g. Press editor), or affiliation"

 # ops: locale/en/userAccess.po (new)
+msgid "userAccess.search"
+msgstr "Enter a user's name, role (e.g. Moderator), or affiliation"
```

This follows the applications' existing overrides, which sit in the
file named like pkp-lib's, and leaves OJS's text as it is. It needs a
`useraccess` component in Weblate's `omp` and `ops` projects, which
the translation maintainers create.

Tried on `main`, with each diff applied to its application. Step 3 read
"Enter a user's name, role (e.g. Press editor), or affiliation" on OMP
and "Enter a user's name, role (e.g. Moderator), or affiliation" on
OPS, and step 5's search for that role listed Daniel Barnes, and David
Buskins, Stephanie Berardo and Minoti Inoue. OJS's box, and the box of
all three applications in French (Canada), read the same with the fix
in and out.

**Alternatives**

- The same text in each application's existing `locale/en/manager.po`:
  no new Weblate component, but a `userAccess.*` key outside its
  pkp-lib file name, which the translation maintainers would have to
  accept.
- One neutral text in pkp-lib, such as "(e.g. Author)", the one role
  all three applications install: no application override is needed,
  but the example then names the role a manager is least likely to
  search for, and every translation must be redone.
- Build the example from the context's own roles in the Vue component:
  always right, also for renamed roles, but new code for a hint.

**What goes with it**

- The other languages keep pkp-lib's text on OMP and OPS until their
  translators add the key to the applications' `useraccess` component.
- Left out: 25 other pkp-lib English texts name a journal or a Journal
  Manager and have no OMP or OPS text of their own (code). Two are in
  the same area: `invitation.unavailable.description` ("…Please contact
  the journal manager…", on an invitation that is no longer valid) and
  `user.masthead.update.message` ("…appears on the journal
  masthead…"). Each needs its own wording.
- pkp-lib's own text lacks the period of "e.g."; fixing it there
  changes only OJS's English.
- Backport: on 3.5 the diffs apply as written.
- The guard: the U53 spec's search scenario, asserting on OMP and OPS
  that searching the box's example lists at least one user (a Planned
  item).

Small: a one-text file in each of two applications, tried as a diff,
and a Weblate component for each.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/user-search-example-journal-role/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/user-search-example-journal-role/walk.js)
  with the helpers of
  [`users-tab-french-raw-keys/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/users-tab-french-raw-keys/lib.js).
  It takes the Steps on all three applications (OJS the control) and
  changes nothing:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/user-search-example-journal-role/walk.js`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front
  reads the same box in French (Canada), the neighbour check). The fix
  was tried with `node bin/try-fix.js apply …/fix-omp.diff omp` and
  `… fix-ops.diff ops`, the script with and without `NB=1`, then
  `revert`, and `NB=1` again.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL, from
  pkp/datasets c657990 (2026-10-01). The database plays no part (a
  locale text); MySQL not checked.
- Tips: `main`: OJS b84f8e2e44 (`lib/pkp` ddd8ab243a, `lib/ui-library`
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (`lib/pkp` 3dc90c81a6,
  `lib/ui-library` 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (`lib/pkp` cf3f984335, `lib/ui-library`
  d4e01883). `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, OPS
  acd8ae704b, `lib/pkp` 32b0f4b4af. `stable-3_3_0`: OJS ac77c9fb35,
  OMP 8e72fc8836, OPS c5532e2161, `lib/pkp` f6ab331645.
- Code reads: `main` and 3.5: `userAccess.search` in pkp-lib's
  `locale/en/userAccess.po` and every `locale/*/userAccess.po`, no
  `userAccess.search` in any `locale/*/*.po` of OMP or OPS, the role
  names in each application's `locale/en/default.po`,
  `UserAccessManagerActionSearch.vue`, `Search.vue`, the role match in
  `PKP\user\Collector`, the locale path registration in
  `PKPApplication` and each application's `Application`, and the
  overrides the applications already carry (a comparison of every key
  OMP and OPS define in `locale/en` with pkp-lib's). 3.4 and 3.3: no
  `userAccess.po` in pkp-lib on `origin/stable-3_4_0` or
  `origin/stable-3_3_0`; the users list there is the older grid, whose
  filter (`templates/controllers/grid/settings/user/userGridFilter.tpl`)
  names no role.
- Introduced: `git blame` on the `msgstr` line of
  `locale/en/userAccess.po` gives 09fc790b46 (PR `pkp/pkp-lib#11535`,
  `main`); the 3.5 change is 7d08d72b88 (PR `pkp/pkp-lib#11533`), after
  `pkp/pkp-lib#11503` was merged and reverted.
- Upstream: pkp/pkp-lib, pkp/omp, pkp/ops and pkp/ui-library searched
  by "Journal editor" with "search" and "placeholder", "search by role",
  `userAccess.search` and the issue number. Read:
  `pkp/pkp-lib#11474` (the change that added the role search and this
  text) and `pkp/pkp-lib#11792` (role search finding nobody on OJS
  3.5.0-1, closed; not this fault).
- Not driven: the other languages on OMP and OPS (code only); the 25
  other texts under "What goes with it" (code only).
