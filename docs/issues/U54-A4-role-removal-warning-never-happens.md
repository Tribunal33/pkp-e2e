# Removing a role warns that its members' assignments will be deleted, but a role with members is refused

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** pkp bug 8637 (no PR) · [d8f96f4249](https://github.com/pkp/pkp-lib/commit/d8f96f4249c18749e5bbd7bc20361332779c33af) · 2014-03-20 · Bruno Beghelli (beghelli)
- **Upstream** `pkp/pkp-lib#11513` (open, milestone 3.6), covering more: it would replace "Remove" by a new "Disable" on a role that has members
- **Tracked in** spec U54 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager presses "Remove" on a role in Settings › Users & Roles ›
"Roles". The "Confirm" window reads: "You are about to remove this role
from this context. This operation will also delete related settings and
all the users assignments to this role. Do you want to continue?"

"OK" does not do that. A role that anyone holds or has held is not
removed: the notice reads "Can't remove {role} role. Currently {n}
user(s) is/are assigned to it." A role the journal was created with is
not removed either, even when nobody holds it. The only role "OK"
removes is one created on this page that nobody has ever held, and that
role has no assignments to delete.

Nothing is deleted. The manager is warned of a deletion that never
happens, and learns only after "OK" that the role cannot be removed.
"This context" is also a word no other screen uses for the journal.

## Impact

- **Lost**: nothing. Only the manager's attempt is wasted.
- **Who**: a Journal, Press or Preprint Server manager who tries to
  remove a role. On a journal that has created no roles of its own,
  every attempt ends in a refusal.
- **Way round**: none needed. The refusal notice names the reason.

Low: the warning misleads and the action offered cannot succeed, but
nothing is removed or lost.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), context
  `publicknowledge`. The steps create two roles of their own.
- In that dataset "Copyeditor" (OPS: "Moderator") is one of the roles
  the journal was created with, held by `mfritz` and `svogt` (OPS:
  `dbuskins`, `sberardo`, `minoue`). "Designer" (OPS: "Editorial Board
  Member") is another one, which nobody holds.

A role the journal was created with, held by its members:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles and its "Roles" tab
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Open the arrow of the "Copyeditor" row (OPS: "Moderator") and press
   "Remove".
4. Read the "Confirm" window, then press "OK".
5. Reload the page and open "Roles" again.

A role created on screen, with one member:

6. Press "Create New Role". "Permission level": "Author"; "Role Name":
   "u54w51 Data curator"; "Abbreviation": "u54w51"; tick "Allow user
   self-registration". Press "OK".
7. Sign out, and sign in as `amwandenga` (OMP: `aclark`; OPS:
   `ccorino`), one of the dataset's authors.
8. Open "Edit Profile" (`/index.php/publicknowledge/en/user/profile`)
   and its "Roles" tab, tick "u54w51 Data curator" and press "Save".
9. Sign out, sign in as `rvaca` and open Settings › Users & Roles ›
   "Roles".
10. Open the arrow of the "u54w51 Data curator" row, press "Remove", then
    "OK".

A role the journal was created with, held by nobody:

11. Open the arrow of the "Designer" row (OPS: "Editorial Board
    Member"), press "Remove", then "OK".

A role created on screen, held by nobody:

12. Press "Create New Role". "Permission level": "Assistant"; "Role
    Name": "u54w51 Spare desk"; "Abbreviation": "u54w51s". Press "OK".
13. Open the arrow of the "u54w51 Spare desk" row, press "Remove", then
    "OK".
14. Reload the page and open "Roles" again.

**Expected**: "Remove" is offered only on a role that "OK" will remove,
and its window says what the removal does. At steps 3, 10 and 11 the
row's arrow offers "Edit" alone; at step 13 it offers "Remove", and "OK"
removes the role.

**Observed**: the arrow of each of these rows offers "Edit" and
"Remove". At steps 3,
10, 11 and 13 the window, headed "Confirm" with "OK" and "Cancel", reads:

```
You are about to remove this role from this context. This operation will also delete related settings and all the users assignments to this role. Do you want to continue?
```

The notice after each "OK":

- Step 4: "Can't remove Copyeditor role. Currently 2 user(s) is/are
  assigned to it." (OPS: "Can't remove Moderator role. Currently 3
  user(s) is/are assigned to it."). After the reload at step 5 the role
  is still listed.
- Step 10: "Can't remove u54w51 Data curator role. Currently 1 user(s)
  is/are assigned to it." The role stays.
- Step 11: "The role Designer is a default one and can't be removed."
  (OPS: "The role Editorial Board Member is a default one and can't be
  removed.").
- Step 13: "u54w51 Spare desk role removed." After the reload at step 14
  the role is gone.

## Cause

The "Confirm" window's text, `settings.roles.removeText` in
`lib/pkp/locale/en/manager.po` (line 1906 on `main`), describes a removal
that deletes the members' assignments. The action behind "OK",
`UserGroupGridHandler::removeUserGroup()`
(`lib/pkp/controllers/grid/settings/roles/UserGroupGridHandler.php`),
works the other way:

1. It counts the role's assignments
   (`$userGroup->userUserGroups()->count()`, ended ones included) and
   refuses when there are any.
2. With none, it refuses a role whose `isDefault` is set, which every
   role created with the journal has.
3. Otherwise it calls `$userGroup->delete()`.

`UserGroupGridRow::initialize()` adds "Remove", with this text, to every
row, including the rows the handler will refuse.

The text is older than this action. OMP's role grid of 2011 had a
"Remove" that did delete the assignments, with the text "You are about
to remove this role from this press. This operation will also delete
related settings and all the users assignments to this role." The key
moved to pkp-lib in 2013, with "context" in place of "press". In 2014
d8f96f4249 added the pkp-lib "Remove". That commit added the two
refusals in the handler, and it reused the old text for the
confirmation. So in pkp-lib the warning has never matched the action.

Reach:

- The three apps use the shared string; none overrides it in its own
  `locale/en` (checked in the code).
- The other 58 locale files of pkp-lib that hold the key translate the
  same promise (checked in the code).

## Proposed fix

A proposal; the team decides. Offer "Remove" only on the rows where
`removeUserGroup()` removes, and let its text say only what that removal
does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-removal-warning-never-happens/fix.diff)):

```diff
 // lib/pkp/controllers/grid/settings/roles/UserGroupGridRow.php, initialize()
-            $this->addAction(new LinkAction(
-                'removeUserGroup',
+            // Offer "Remove" only where UserGroupGridHandler::removeUserGroup() removes:
+            // not a default role, and a role nobody holds or has held.
+            if (!$userGroup->isDefault && !$userGroup->userUserGroups()->exists()) {
+                $this->addAction(new LinkAction(
+                    'removeUserGroup',
                     … (unchanged, indented)
+            }

 # lib/pkp/locale/en/manager.po
 msgid "settings.roles.removeText"
 msgstr ""
-"You are about to remove this role from this context. This operation will "
-"also delete related settings and all the users assignments to this role. Do "
-"you want to continue?"
+"You are about to remove this role and its settings. Do you want to continue?"
```

A single reworded sentence would not be enough. The grid does not mark
which roles are the journal's defaults, and it does not show who has
held a role. A manager could not apply a rule such as "a default role,
or one ever assigned, cannot be removed" before pressing "OK". The row
already has `isDefault` and the role's assignments, so it can apply that
rule itself. The handler keeps both of its refusals, for a list that is
out of date or a request sent by hand.

This follows the reviewer recommendations on the same Settings pages.
There `ReviewerRecommendation`'s `removable` attribute tells
`ReviewerRecommendationManager.vue` to offer "Delete" only on a
recommendation that no review has used.

Tried on OJS, OMP and OPS `main`. The arrows of "Copyeditor" (OPS:
"Moderator"), "u54w51 Data curator" and "Designer" (OPS: "Editorial
Board Member") offer "Edit" alone. "u54w51 Spare desk" offers "Edit" and
"Remove", its window reads "You are about to remove this role and its
settings. Do you want to continue?", and "OK" removes it as before.

**How it relates to pkp's open work**:

- `pkp/pkp-lib#11513` (milestone 3.6, no pull request yet) would change
  the rule for a role that has members. Instead of being refused, it
  would get a "Disable" action that takes the role from its users and
  greys the role out. "Remove" would stay for a role without members,
  and its window would say "This operation will delete related
  settings". This fix agrees with that plan: it already takes "Remove"
  off roles with members, and its text says what the plan's text says. It does not wait for the new
  action and can go to 3.5, which #11513 would not reach.
- `pkp/pkp-lib#12826` ("Remove grid code", no milestone) is a gradual
  rewrite of every legacy grid with no plan or date for this one. It does
  not replace this screen yet. A Vue roles page written later needs the
  same rule, best as a `removable` attribute on `UserGroup`.

So this is a quick fix that stands on its own, not a part of either.

**Alternatives**:

- Choose the window's text per row and keep "Remove" on every row: the
  manager then presses "Remove" only to be told that the role cannot be
  removed.
- Make "OK" do what the warning says: deleting a role's assignments
  loses the journal's record of who held it, and that change is what
  #11513 is for.
- Rename the key so that the old translations stop showing: every other
  language would show the English text until it is translated.

**What goes with it**:

- The other locales keep the old promise until their translators update
  them.
- No stored data is wrong, so no repair.
- One `exists()` query per row on the Roles list, which shows at most
  one page of roles; `withCount('userUserGroups')` in
  `UserGroupGridHandler::loadData()` would make it one query.
- 3.5: the same diff applies to the 3.5 pkp-lib. 3.4 and 3.3 need it
  rewritten: their rows read `getData('isDefault')` (3.3
  `UserGroupDAO::isDefault()`), count members through
  `Repo::user()->getCollector()` (3.3
  `UserGroupDAO::getContextUsersCount()`), and keep the text in
  `locale/en/manager.po` (3.3 `locale/en_US/manager.po`).

Small: a few lines in one pkp-lib row class and one string, following
the reviewer recommendations' pattern, tried.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-removal-warning-never-happens/walk.js),
  on an install loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-removal-warning-never-happens/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It takes steps 1-14,
  recording each row's arrow links, the window's text and buttons, the
  answer and the notice of each "OK", and the role's stored assignments.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on a
  freshly loaded default dataset: the same Observed on both lines, with
  no failed request and no script error.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/role-removal-warning-never-happens/fix.diff ojs omp ops`
  and the same walk on `main`, on the three apps. Steps 12-14, a role
  "OK" removes, gave the same result with and without the fix, apart
  from the window's new text.
- Branch tips: `main`: OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7;
  pkp-lib 2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS), with the same
  string, row and handler in both. `stable-3_5_0`: OJS 92b9a16b48, OMP
  3081c9b00, OPS cf4fce69bd, pkp-lib a9c76aed62. `stable-3_4_0`:
  pkp-lib df13621c2d. `stable-3_3_0`: pkp-lib d446601ebe. Default
  dataset from pkp/datasets 38ab955 (2026-09-30).
- 3.4 and 3.3 (code): `settings.roles.removeText` holds the same text.
  `removeUserGroup()` refuses a role with members
  (`Repo::user()->getCollector()…->getCount()` on 3.4,
  `UserGroupDAO::getContextUsersCount()` on 3.3) and a default one, and
  deletes it only otherwise. `UserGroupGridRow` adds "Remove", with the
  text, to every row.
- Introduced: `git log -S` on the refusal (`cantRemoveUserGroup`) and on
  the use of `settings.roles.removeText` in pkp-lib both lead to
  d8f96f4249. Blame on today's lines shows only the PSR-12 reformat
  (e3f570bc37) and the PO conversion (631efb9665, 08fd12645a). The text
  came from OMP 2c633fe97 (2011), whose `removeUserGroup()` called
  `UserGroupDAO::deleteById()`, which deleted the assignments. It moved
  to pkp-lib in 601f9adf4a (2013) and was unused there until d8f96f4249.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  were searched by the symptom's words and by `removeUserGroup`,
  `cantRemoveUserGroup` and `UserGroupGridHandler`. `pkp/pkp-lib#11513`
  (open, opened 2025-06-13, no linked pull request) describes this fault.
  `pkp/pkp-lib#1574` ("Deleting role is confusing", 2016) asked for the
  same and was closed as outdated in 2022 without a change.
  `pkp/pkp-lib#12826` was read for whether it replaces this grid.
  `pkp/pkp-lib#6452` (an error when removing a role) is a different
  fault.
- Not driven: a role whose only member's role has ended. From the count
  in the code it is refused, and the fix offers it no "Remove".
- Not checked: the fix on 3.5's screens (the diff applies to its
  pkp-lib, checked with `patch --dry-run`).
