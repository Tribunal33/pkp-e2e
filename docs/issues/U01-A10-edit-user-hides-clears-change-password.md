# The Site Administrator's "Edit User" never shows "Change Password" ticked, and saving it removes the flag

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [cca31520cc](https://github.com/pkp/pkp-lib/commit/cca31520cc641d5bae2195734da246c266ec7a1a) (2013-02-14)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U01 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

The Site Administrator can require a user to choose a new password at
their next sign-in by ticking "Change Password" in the user's "Edit
User" window (Administration › Hosted Journals › a journal's "Settings
wizard" › "Users"). The box always opens unticked, even on an account
that is already flagged.

Pressing "OK" with the box left as it opened removes the flag, and
nothing says so: the user's next sign-in goes straight in, with no
"Change Password". So any later edit of a flagged account (a new email
address, a corrected name) undoes the requirement.

## Impact

- **Lost**: the requirement to change the password. The user keeps
  signing in with the password they had when flagged, a temporary one
  the administrator handed out included.
- **Who**: the Site Administrator, whenever they edit a flagged account
  before the user's next sign-in, however it was flagged: in "Edit
  User", by "Add User" (whose box opens ticked), by "Create New
  Reviewer" in OJS and OMP, or by a users XML import. Journal managers
  do not meet it on `main` and 3.5, where none of their screens opens
  this window; on 3.4 and 3.3 it is their Settings › Users & Roles
  "Edit User", so their routine edits cleared the flag too.
- **Way round**: tick the box again on every save of a flagged account,
  though the window does not show which accounts are flagged.

Medium: the loss needs an edit before the next sign-in, and there is a
way round. A setup where journal managers make the routine edits, as on
3.4 and 3.3, would make it high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; on OMP the page is
  "Hosted Presses" and the accounts `aclark` and `afinkel`, on OPS
  "Hosted Servers").

The box does not show the flag:

1. Sign in as `admin`.
2. Administration › "Hosted Journals"; the arrow at the start of
   "Journal of Public Knowledge"'s row; "Settings wizard"; tab "Users".
3. "Search" for `ccorino`; on Carlo Corino's row, the arrow, then "Edit
   User". Under "Change Password", the box "User must change password on
   next log in." is unticked.
4. Tick the box and press "OK". The window closes.
5. "Edit User" on `ccorino` again.

**Expected**: the box is ticked.

**Observed**: the box is unticked.

6. "Cancel".

An unchanged save removes the flag:

7. "Edit User" on `ckwantes`; tick "Change Password"; "OK".
8. "Edit User" on `ckwantes` again (the box reads unticked) and press
   "OK" without changing anything.
Signing in (step 9 checks that step 4 stored the flag; step 10 is the
account saved unchanged in step 8):

9. Sign out, and sign in as `ccorino` (password `ccorinoccorino`). The
   sign-in stops at "Change Password" (tab "Change Password | Journal of
   Public Knowledge").
10. In a fresh browser, sign in as `ckwantes`.

**Expected**: the sign-in stops at "Change Password", as for `ccorino`.

**Observed**: `ckwantes` lands on the Dashboard ("Submissions | Journal
of Public Knowledge", "Active submissions (1)"), with no "Change
Password".

## Cause

`PKP\controllers\grid\settings\user\form\UserDetailsForm::initData()`
(lib/pkp `controllers/grid/settings/user/form/UserDetailsForm.php`,
lines 157-176 on `main`) fills the form from the stored account, field
by field, for an existing user, but leaves `mustChangePassword` out. It
sets `mustChangePassword` only in the `else` branch, for a new user
(line 196, so "Add User" opens with the box ticked). So
`templates/common/userDetails.tpl` (lines 75-81), which ticks the box
when `$mustChangePassword` is set, always renders it unticked on "Edit
User".

`execute()` then writes the flag from the posted box for every user
(line 329, `setMustChangePassword($this->getData('mustChangePassword') ?
1 : 0)`). An unticked box posts nothing, so a save of the window as it
opened writes 0 over a stored 1, where an edit form saved unchanged
should change nothing.

Reach:

- "Edit User" in the Site Administrator's "Settings wizard" › "Users"
  on `main` and 3.5 (walked). No journal manager's screen opens this
  form there: the wizard is under `AdminHandler`, which only the Site
  Administrator passes, and Settings › Users & Roles is the Vue user
  access manager (code).
- On 3.4 and 3.3 the same form is also the "Edit User" of the journal's
  own Settings › Users & Roles › "Users" grid
  (`templates/management/accessUsers.tpl` loads `UserGridHandler`), so
  an edit by a manager with full administration of that user cleared
  the flag there too (code). On 3.4 a manager editing a user who also
  holds roles in a context they do not manage gets the role-only form
  below, which leaves the flag alone; 3.3 has no role-only form.
- Every flagged account loses the flag on its first full "Edit User"
  save, whoever set it: "Add User" with the box ticked (its default),
  "Create New Reviewer" in OJS and OMP (`CreateReviewerForm` flags every
  account it creates), and the users XML import
  (`UserXmlPKPUserFilter`: an account with `must_change="true"`, and an
  account whose imported password hash needs rehashing, which gets a
  generated password and the flag) (code).
- The role-only form (`userGroupUpdateOnly`) returns before the flag is
  written and leaves it alone. `UserGridHandler::editUser()` and
  `updateUser()` apply it when `Validation::getAdministrationLevel()`
  returns `ADMINISTRATION_PARTIAL`: a manager editing a user who also
  holds roles in a context that manager does not manage; the form then
  hides the details, the box included. The grid's role actions
  (`updateUserRoles()`, `UserRoleForm`) never touch the flag (code).

## Proposed fix

Load the stored flag in `initData()`, beside the account's other
fields, as the form already does for every other value it shows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-user-hides-clears-change-password/fix.diff)):

```diff
                 'locales' => $user->getLocales(),
+                'mustChangePassword' => (bool) $user->getMustChangePassword(),
             ];
```

"Edit User" then opens with the box ticked on a flagged account, an
unchanged save keeps the flag, and unticking the box still clears it
on purpose. Tried on the three apps: with it, step 5 reads ticked and
`ckwantes` stops at "Change Password" in step 10. The paths it must
leave alone are unchanged, with the fix in and out: "Add User" still
opens ticked, and an unflagged account still opens unticked and, saved
unchanged, signs in as before.

**Alternatives**:

- Write the flag in `execute()` only when the box is ticked: the flag
  would survive an unchanged save, but an administrator could never
  clear it, and the box would still hide the stored value.
- Read `$user->getMustChangePassword()` in the template: the box would
  show the stored value, but when "OK" is turned back by a
  field's error and the form comes back, the box would show the stored
  value instead of what the administrator had just ticked.

**What goes with it**:

- No data repair: nothing records that a flag was set and then
  cleared, so the accounts that lost it cannot be found.
- Backport: the same line applies to 3.5 and 3.4 (the same
  `isset($this->user)` branch), and to 3.3's
  `UserDetailsForm.inc.php` in its `array(...)` syntax.
- Guard: an end-to-end check that "Edit User" on a flagged account
  opens ticked and that an unchanged "OK" keeps the next sign-in on
  "Change Password".

Small: one line, tried.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-user-hides-clears-change-password/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-user-hides-clears-change-password/lib.js)
  (the sign-in that records where it lands comes from
  [refused-password-form-tab-loses-name/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-password-form-tab-loses-name/lib.js)),
  on an install reset to PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`, then
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edit-user-hides-clears-change-password/walk.js`.
  `nb` as an argument walks the paths the fix must leave alone instead
  ("Add User" read, an unflagged account's "Edit User" saved unchanged,
  its sign-in). The
  walk also reads `users.must_change_password` after each save: 1 after
  steps 4 and 7, 0 after step 8.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/edit-user-hides-clears-change-password/fix.diff ojs omp ops`,
  the dataset reloaded before each run, the walk and the `nb` walk,
  then `revert`, and the `nb` walk again with the fix out.
- Walked on `main` and 3.5 on OJS, OMP and OPS, the steps as written;
  no server error or page script error on any run.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6). 3.5: OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  3.4: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b, lib/pkp
  767353f4fe. 3.3: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
  lib/pkp ac3fa73402.
- Code reads: `UserDetailsForm::initData()`, `readInputData()` and
  `execute()` and `common/userDetails.tpl` on `main` and 3.5 (lines 193
  and 322 on 3.5); `UserDetailsForm.php` on 3.4 and
  `UserDetailsForm.inc.php` on 3.3, the same branches;
  `management/accessUsers.tpl` on 3.4 and 3.3; `UserGridHandler` on
  `main` and 3.4 (`applyUserGroupUpdateOnly()`), absent on 3.3. The form
  is pkp-lib's alone; no app overrides it. Every writer of the flag on `main`:
  `UserDetailsForm`, `CreateReviewerForm`, `UserXmlPKPUserFilter`, and
  the two forms that clear it after a change (`LoginChangePasswordForm`,
  `ResetPasswordForm`).
- Introduced: `git blame` on the lines stops at e3f570bc37, the PSR-12
  reformat (`pkp/pkp-lib#5678`); `git log -S mustChangePassword
  --follow` on the file reaches cca31520cc ("port users grid from
  OMP", Jason Nugent), whose `initData()` already left the flag out for
  an existing user; the OMP history before the port was not read.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library; issues and PRs): "must change password",
  mustChangePassword, getMustChangePassword, must_change_password,
  "change password on next", "change password" checkbox, UserDetailsForm
  password, force password change. `pkp/pkp-lib#11768` (open, PR
  `pkp/pkp-lib#11775`) walks the same box but is about the forced
  change accepting the current password again, another fault.
- Not driven: accounts flagged by "Add User", "Create New Reviewer"
  or the users XML import, and 3.4's and 3.3's journal-level users grid.
