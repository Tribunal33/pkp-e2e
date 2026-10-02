# Removing a role warns that its members' assignments will be deleted, but a held role is never removed

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** no PR (PKP's earlier tracker, bug 8637) · [d8f96f4249](https://github.com/pkp/pkp-lib/commit/d8f96f4249c18749e5bbd7bc20361332779c33af) · 2014-03-20 · Bruno Beghelli (beghelli)
- **Upstream** `pkp/pkp-lib#11513` (open), which goes further: it asks for a "Disable" that ends the members' roles; `pkp/pkp-lib#1574` (closed in 2022 as outdated, without a fix)
- **Tracked in** spec U54 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Roles", a role's "Remove" opens a
"Confirm" window. The window says the removal "will also delete related
settings and all the users assignments to this role", but that never
happens. "OK" refuses every role that has ever been given to anyone,
even when nobody holds it any more: "Can't remove {role} role. Currently
{n} user(s) is/are assigned to it.". It also refuses every role the
journal was created with, even one nobody holds. The only role it
removes is one made with "Create New Role" that was never given to
anyone.

After a refusal the role and its members stay as they were. But the
manager is warned that the members will lose the role, and may cancel
for fear of that, or press "OK" expecting it. The proposed fix is the
narrow one beside `pkp/pkp-lib#11513`: it rewords the window and stops
offering "Remove" on the roles the journal was created with.

## Impact

- **Lost.** Nothing. The window misdescribes what "OK" will do.
- **Who.** Every manager who presses "Remove" on the "Roles" tab, on a
  journal, press or preprint server. Until the journal has a role of
  its own that nobody was ever given, "OK" refuses for every row.
- **Way round.** None is needed for the warning, since the refusal
  says why. A manager who wants a held role gone has no screen to
  remove it (spec U54
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U54-roles-configuration.md#a6),
  `pkp/pkp-lib#11513`).

Low: the wording misleads, but the outcome is safe and the refusal is
plain.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; OMP and OPS the same,
  differences in brackets).

Roles the journal was created with, and a role of its own:

1. Sign in as `rvaca` and open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`), tab
   "Roles".
2. On the "Copyeditor" row, a role `mfritz` and `svogt` hold, press the
   "Settings" arrow, then "Remove". [On a preprint server use
   "Moderator", which `dbuskins`, `sberardo` and `minoue` hold.]
3. Press "OK".
4. On the "Production editor" row, a role nobody holds, press "Settings"
   › "Remove", then "OK". [On a preprint server use "Editorial Board
   Member".]
5. Press "Create New Role", choose "Assistant" in "Permission level",
   type "u54i Spare desk" in "Role Name" and "U54I" in "Abbreviation",
   and press "OK".
6. On the "u54i Spare desk" row press "Settings" › "Remove", then "OK".
7. Reload the page and open "Roles".

A role whose only member has left it (OJS):

8. Reload the page. Press "Create New Role", choose "Assistant", type
   "u54i Data desk" and "U54J", and press "OK".
9. Sign out and sign in as `admin`. Open Administration › "Hosted
   Journals", press the arrow of `publicknowledge`, then "Settings
   wizard", tab "Users". Search for `svogt`, press the row's arrow, then
   "Edit User". Under "User Roles" tick "u54i Data desk" and press "OK".
10. Open `svogt`'s "Edit User" again, untick "u54i Data desk" and press "OK".
11. Sign out, sign in as `rvaca`, open the "Roles" tab, and press
    "Settings" › "Remove" › "OK" on the "u54i Data desk" row.

**Expected.** The "Confirm" window says what "OK" does: which roles
cannot be removed, and what goes with a role that is removed.

**Observed.** In steps 2, 4, 6 and 11 the same window opens, headed
"Confirm", with "OK" and "Cancel":

```
You are about to remove this role from this context. This operation will also delete related settings and all the users assignments to this role. Do you want to continue?
```

The notices after "OK":

- Step 3: "Can't remove Copyeditor role. Currently 2 user(s) is/are
  assigned to it." ("Can't remove Moderator role. Currently 3 user(s)
  is/are assigned to it.")
- Step 4: "The role Production editor is a default one and can't be
  removed." ("The role Editorial Board Member is a default one and
  can't be removed.")
- Step 6: "u54i Spare desk role removed."
- Step 11: "Can't remove u54i Data desk role. Currently 1 user(s) is/are
  assigned to it.", although after step 10 `svogt`'s "Roles" in the
  administrator's list read only "Copyeditor".

After the reload in step 7, "Copyeditor" and "Production editor" are
still listed and "u54i Spare desk" is gone.

## Cause

`UserGroupGridRow::initialize()` (lib/pkp
`controllers/grid/settings/roles/UserGroupGridRow.php`, line 65) gives
every row's "Remove" the same confirmation text,
`settings.roles.removeText` (lib/pkp `locale/en/manager.po`). Then
`UserGroupGridHandler::removeUserGroup()` (lib/pkp
`controllers/grid/settings/roles/UserGroupGridHandler.php`, lines
349–401) decides what happens:

- If `$userGroup->userUserGroups()->count()` is above 0, it refuses
  with `grid.userGroup.cantRemoveUserGroup`. The count includes every
  `user_user_groups` row of the role. Taking a role from a user only
  ends the row (`Repository::endAssignments()` sets `date_end`), so a
  member who has left still counts.
- Otherwise, if `$userGroup->isDefault` is set, it refuses with
  `grid.userGroup.cantRemoveDefaultUserGroup`. That refusal is
  deliberate: d8f96f4249 added it with the comment "Can't delete
  default user groups."
- Otherwise `$userGroup->delete()` deletes the role. The database
  cascades the delete to the role's settings (`user_group_settings`),
  its workflow stages (`user_group_stage`) and its place in task and
  discussion templates (`edit_task_template_user_groups`). The delete
  also reaches `stage_assignments` and `subeditor_submission_group`,
  but a role nobody was ever given has no rows there.

The text was written for OMP's first "Remove"
([2c633fe977](https://github.com/pkp/omp/commit/2c633fe97726a7262f93cb261ac032bd89839e8f),
2011), which called `UserGroupDAO::deleteById()` and deleted the
role's assignments with it. OMP dropped that action in 2012
([4ba454c970](https://github.com/pkp/omp/commit/4ba454c97012d393c8ed071294eafa096385c702)).
d8f96f4249 (2014) brought "Remove" back to the shared grid with the two
refusals, but kept the old text.

Reach:

- 3.5, 3.4 and 3.3 show the same text and make the same two refusals
  (code). 3.4 counts the role's users through the user collector, and
  3.3 through `UserGroupDAO::getContextUsersCount()`.
- No app overrides the key. 58 other locales carry a translation of the
  old text, for example fr_CA: "… supprimera également les paramètres
  relatifs et toutes les attributions des …" (code).
- No other path removes a role: the REST API's `userGroups` endpoint
  only reads (code).

## Proposed fix

Make two changes in lib/pkp
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-remove-warning-promises-deletion/fix.diff)):

- In `UserGroupGridRow::initialize()`, add "Remove" only when
  `!$userGroup->isDefault`. The row already holds the role, so this
  costs nothing. It follows `ReviewFormGridRow`, which offers "Delete"
  only on a review form no review has used. The refusal in
  `removeUserGroup()` stays, to guard a stale page.
- Reword the text so it says what happens. The one judgement left to
  the manager is whether the role was ever given to anyone:

```diff
 msgid "settings.roles.removeText"
 msgstr ""
-"You are about to remove this role from this context. This operation will "
-"also delete related settings and all the users assignments to this role. Do "
-"you want to continue?"
+"You are about to remove this role. Its settings and workflow stages are "
+"deleted with it, and it is taken off any task or discussion template that "
+"lists it. A role that has ever been given to anyone can't be removed, even "
+"when nobody holds it now. Do you want to continue?"
```

The fix was tried on OJS, OMP and OPS `main`:

- The rows of the roles the journal was created with offered "Edit"
  and no "Remove".
- On "u54i Spare desk", "Remove" showed the new words and still
  removed the role.
- On OJS, "u54i Data desk", whose only member had left it, was still
  refused with the same notice.

**Alternatives**

- Text only, keeping "Remove" on the roles the journal was created
  with. The window would then have to explain "default", a word the
  list never shows, and the manager would still walk into a refusal on
  most rows.
- Drop "Remove" on held roles too. Each row would need a member count,
  and the manager would lose the reason the refusal gives. Held roles
  are what `pkp/pkp-lib#11513` plans a "Disable" for, so that row is
  left to it.
- Only remove the promise from the text. A shorter text leaves the
  window silent on what it deletes and on which roles cannot go.

**What goes with it**

- "even when nobody holds it now" follows today's rule. If the team
  rules that a role whose members have all left can be removed (spec
  U54 A6), those words go.
- Translations: the fix changes only the English. The other languages
  keep the old promise until their translators change it. Letting the
  translation tool flag the changed English for them is the right
  course. Blanking the old translations is not: `Locale::translate()`
  shows a key it cannot find as `##settings.roles.removeText##`, and
  whether an empty translation counts as missing there was not checked.
- Guard: an e2e scenario on the "Roles" tab. It checks that a role the
  journal was created with offers "Edit" and no "Remove". On a role
  made with "Create New Role", it reads the "Confirm" window's text and
  checks that "OK" removes the role (spec U54's "Remove a role"
  scenario, which reads the old text today, takes both). A unit test
  does not fit as the code stands, because lib/pkp's tests build no grid
  rows or handlers. It would fit if the removal rule moved into the
  user group repository as one check that the row and
  `removeUserGroup()` both call: the test would then cover a default
  role, a held role and a role whose member has left.
- No data or API change. Both changes apply to 3.5 as written. There
  the text drops its clause on templates, since 3.5 has no task and
  discussion templates (code).

Small: one condition in the row and one English string, both in lib/pkp.

## Evidence

- The kept scripts take the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-remove-warning-promises-deletion/walk.js)
  (steps 1–7) and
  [ended.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/role-remove-warning-promises-deletion/ended.js)
  (steps 8–11), with their helpers in `lib.js` beside them. Run them
  from a pkp-e2e checkout, on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/role-remove-warning-promises-deletion/walk.js`
  (`<feature>` names that install's fleet, `<id>` any short name for
  the output folder; `ojs` in place of `all` for `ended.js`). The fix
  was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/role-remove-warning-promises-deletion/fix.diff ojs omp ops`,
  both scripts on a freshly loaded install, then `revert`. With the
  fix, the same walk also checks that it reaches no further than it
  should: "Edit" stays on every row, and a role of the journal's own
  keeps "Remove" and its outcome.
- Walked on PostgreSQL: steps 1–7 on OJS, OMP and OPS, `main` and
  `stable-3_5_0`; steps 8–11 on OJS `main` only. The fault does not
  depend on the database. No request failed and no script error was
  recorded, apart from the Plugin Gallery list in the Settings wizard,
  which fails on any install without outside access. After step 10 the
  role's one `user_user_groups` row held a `date_end` (read-only query).
  Dataset: pkp/datasets c657990 (2026-10-01). Tips: `main` ojs
  b84f8e2e44, omp 3b0ecf794c, ops c8af945bb7, lib/pkp ddd8ab243a (ojs)
  and 3dc90c81a6 (omp, ops); `stable-3_5_0` ojs c346ee00a5, omp
  c7b45f88ea, ops 8eaf899468, lib/pkp 3bb4450bea (ojs) and 1fb843f491
  (omp, ops); `stable-3_4_0` lib/pkp 32b0f4b4af; `stable-3_3_0` lib/pkp
  f6ab331645.
- Code read on 3.4 and 3.3: `locale/en/manager.po` (3.3
  `locale/en_US/manager.po`), `UserGroupGridRow` and `removeUserGroup()`
  (3.3 `UserGroupGridHandler.inc.php`).
- Introduced: `git blame` on the text gives 631efb9665 (2019, the move
  to PO files) and 08fd12645a (2022, the line wrapping). `git log -S`
  gives 601f9adf4a (2013, the keys moved from OMP to pkp-lib). In OMP
  it gives 2c633fe977 (2011, the first "Remove").
- Upstream search (2026-10-02): pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, by the symptom's words and by
  `removeUserGroup` and `settings.roles.removeText`.
  `pkp/pkp-lib#11513` is on milestone 3.6.
- Not checked: MySQL; the steps on 3.4 and 3.3; steps 8–11 on OMP and
  OPS and on 3.5 (the same code).
