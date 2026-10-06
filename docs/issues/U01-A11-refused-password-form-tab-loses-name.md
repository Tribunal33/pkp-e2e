# After a refused "Change Password" or "Reset Password", the browser tab loses the page's name

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** "Change Password" regressed in `pkp/pkp-lib#5866` for `pkp/pkp-lib#5865` · [4ababcd4c2](https://github.com/pkp/pkp-lib/commit/4ababcd4c2b2abedbbee5752c66e0316c04bda49) · 2020-05-13 · Nate Wright (NateWr); "Reset Password" never had it, since the form came in `pkp/pkp-lib#8512` for `pkp/pkp-lib#2135` · [6d5b53f23c](https://github.com/pkp/pkp-lib/commit/6d5b53f23c36c5b162737fa1173cc4e632f82f39) · 2023-01-20 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U01 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a11)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An administrator can require a user to choose a new password; that
user's next sign-in then stops at a "Change Password" page. When "OK"
there is refused (a wrong current password, say), the page comes back
with the error, but the browser tab reads only the journal's name
instead of "Change Password | {journal name}". The profile's own
"Password" tab is a different form and keeps its page's title.

When "Save" is refused on the "Reset Password" page the password-reset
email links to (the two passwords differ), the tab likewise reads only
the journal's name, and the page loses its "Reset Password" heading.

A screen-reader user hears only the journal's name as the page's title,
and on "Reset Password" finds no heading to move to.

## Impact

- **Lost**: nothing. The form, its error and the user's next try all
  work; only the page's name (and on "Reset Password" its heading) is
  missing.
- **Who**: anyone whose required password change or password reset is
  refused once, on any journal, press or preprint server. Only an
  administrator can require a change; any user can ask for a reset.
- **Way round**: none needed; the next correct "OK" or "Save" completes
  the task.

Low: the task gets done; what goes missing is a page's name, which
would rise only if the missing heading kept screen-reader users from
the form.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same, with "Hosted
  Presses" and "Hosted Servers").

Change Password:

1. Sign in as `admin`.
2. Administration › "Hosted Journals", the arrow at the start of
   "Journal of Public Knowledge", "Settings wizard".
3. Tab "Users", "Search" for `minoue`, the arrow on her row, "Edit User".
4. Tick "Change Password", press "OK". Sign out.
5. On the Login page, sign in as `minoue`. The "Change Password" page
   opens; the tab reads "Change Password | Journal of Public Knowledge".
6. Type `wrongwrong` in "Current password" and `u01bnewpass` in "New
   password" and "Repeat new password"; press "OK".

Reset Password:

7. Signed out, on the Login page press "Forgot your password?", type
   `dbuskins@mailinator.com`, press "Reset Password".
8. Open the link in the email "Password Reset Confirmation", read
   wherever the install's mail setup delivers it. The "Reset Password"
   page opens; the tab reads "Reset Password | Journal of Public
   Knowledge".
9. Type `u01bnewpass` in "New password" and `u01bother` in "Repeat new
   password"; press "Save".

**Expected**: after step 6 the page again with its error, the tab
"Change Password | Journal of Public Knowledge"; after step 9 the page
again with its error, headed "Reset Password", the tab "Reset Password |
Journal of Public Knowledge".

**Observed**: after step 6 the page (address `…/login/savePassword`)
still reads "Change Password" and shows

```
Errors occurred processing this form:
The current password you entered was incorrect.
```

but the tab reads `Journal of Public Knowledge`. After step 9 the page
(`…/login/updateResetPassword`) shows "The passwords do not match." with
no heading above the form, and the tab reads `Journal of Public
Knowledge`.

A correct "OK" in step 6, or the same password in both boxes in step 9,
is taken as before.

## Cause

`LoginHandler` (lib/pkp `pages/login/LoginHandler.php`) gives each of
the two pages its title in the op that first shows it, not in the op that
shows it again. `changePassword()` and `resetPassword()` assign
`pageTitle` before displaying their form. The forms post to
`savePassword()` and `updateResetPassword()`, which on a failed
`validate()` call `$passwordForm->display()` /
`$passwordResetForm->display()` again without assigning it.

Both templates extend `layouts/backend.tpl`, whose
`<title>{title|strip_tags value=$pageTitle}</title>` falls back to the
context's name alone when `pageTitle` is empty
(`PKPTemplateManager::smartyTitle()`). `user/loginChangePassword.tpl`
writes its heading from a fixed key, so only its tab changes.
`user/userPasswordReset.tpl` prints `{$pageTitle|escape}` as its
heading, so the reset form loses its heading too.

Only the change-password half is a regression, from `pkp/pkp-lib#5865` (the
backend UI refactor). Before it, `loginChangePassword.tpl` included
`common/header.tpl` with `pageTitle="user.changePassword"`, so every
display had its title. The refactor moved the template onto
`layouts/backend.tpl` and assigned the title only in `changePassword()`.
The reset half never worked: it came with the reset form itself
(`pkp/pkp-lib#2135`), which assigned the title only in
`resetPassword()`.

Reach:

- The two refused paths above are the only ones: in lib/pkp's and the
  apps' `pages/`, the other handlers that display a form again after a
  refusal either assign the title on that path too
  (`InstallHandler::installUpgrade()`), or use frontend templates that
  pass their own title (registration, notification unsubscribe). Checked
  in the code; the payment plugins' forms were not read.
- The first display of both pages is right on `main` and 3.5 (checked on
  screen). The raw `user.login.resetPassword` in the reset page's tab
  was fixed there by `pkp/pkp-lib#13132`, which did not touch the
  refused path.
- "Confirm Access" (`AdminHandler::confirmAccess()`,
  `confirmAccessSubmit()`) assigns no `pageTitle` on either path.
  That is a separate gap, left out here. Checked in the code; no default
  install reaches the page, since `password_timeout` is off.

## Proposed fix

Assign the page's title in the two POST ops too, before they branch, as
`InstallHandler::installUpgrade()` does for its form
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-password-form-tab-loses-name/fix.diff)):

```diff
@@ public function updateResetPassword($args, $request)
         $this->_isBackendPage = true;
         $this->setupTemplate($request);
         $templateMgr = TemplateManager::getManager($request);
+        $templateMgr->assign([
+            'pageTitle' => __('user.login.resetPassword'),
+        ]);
@@ public function savePassword($args, $request)
         $this->_isBackendPage = true;
         $this->setupTemplate($request);
+        TemplateManager::getManager($request)->assign([
+            'pageTitle' => __('user.changePassword'),
+        ]);
```

The other branches are unchanged. `savePassword()` redirects on
success. In `updateResetPassword()` the new value is overwritten on the
two other paths that render a page: on success with the raw key for
`message.tpl`, and on an invalid or expired link by
`ResetPasswordForm::displayInvalidHashErrorMessage()`, which assigns the
raw key `user.login.resetPassword` for `frontend/pages/error.tpl`. That
template translates it, so the invalid-link page keeps reading "Reset
Password", as it should (read in the code).

The handler is the better home. In pkp-lib the op that renders a backend
page assigns its title (`changePassword()`, `resetPassword()`,
`InstallHandler`, `AdminHandler`), and the fix completes that in the two
ops that missed it. `displayInvalidHashErrorMessage()` is the one form
method that assigns a `pageTitle` (added by `pkp/pkp-lib#13132`), and it
does so because it swaps the form's page for a different one,
`error.tpl`.

Tried on `main` on all three apps: the refused "OK" keeps
"Change Password | {context}", and the refused "Save" keeps the "Reset
Password" heading and "Reset Password | {context}". A correct change
still lands on the dashboard and a matching reset still shows the
"Reset Password" message page, the same with the fix in and out.

**Alternatives**:

- Assign `pageTitle` in `LoginChangePasswordForm::display()` and
  `ResetPasswordForm::display()`. Every display of each form would carry
  it, as `displayInvalidHashErrorMessage()` does for its page, and a
  future caller would be covered too. It works as well. To keep one
  source, though, it also means taking the assignments out of
  `changePassword()` and `resetPassword()`, and no other caller displays
  these forms today.
- Hard-code the heading in `userPasswordReset.tpl`, as
  `loginChangePassword.tpl` does. That brings the heading back but not
  the tab.

**What goes with it**:

- No stored data and no API are touched.
- 3.5: applies as written.
- 3.4 and 3.3: the change-password half applies as written (on 3.3 in
  `LoginHandler.inc.php`). The reset half fixes both the heading and
  the tab there only together with a backport of
  `pkp/pkp-lib#13132`'s template change.
- Guard: an e2e check of the tab after a refused "OK" and "Save".

Small: one pkp-lib file and a check.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-password-form-tab-loses-name/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-password-form-tab-loses-name/lib.js)
  (the reset request and the email's link come from
  [password-boxes-keep-32-characters/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-boxes-keep-32-characters/lib.js)),
  on an install reset to PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`, then
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/refused-password-form-tab-loses-name/walk.js`.
  `neighbour` as an argument walks the correct change and the matching
  reset instead.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/refused-password-form-tab-loses-name/fix.diff ojs omp ops`,
  the dataset reloaded before each run, the walk and the `neighbour`
  walk, then `revert`, and the `neighbour` walk again with the fix out.
- Walked on `main` and 3.5 on OJS, OMP and OPS, the steps as written; no
  server error or page script error on any run.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794c and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6). 3.5: OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  3.4: OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b, lib/pkp
  767353f4fe. 3.3: OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
  lib/pkp ac3fa73402.
- Code reads: on `main`, the profile's "Password" tab
  (`ProfileTabHandler::savePassword()`) answers a refusal inside the
  Profile page, which keeps its title. On 3.5, `savePassword()` and
  `updateResetPassword()` as on `main`. On 3.4 (`pages/login/LoginHandler.php`) and 3.3
  (`pages/login/LoginHandler.inc.php`), the same two ops display their
  form without `pageTitle`, both templates extend `layouts/backend.tpl`
  with the same `<title>` line, and `userPasswordReset.tpl`'s
  `{translate key=$pageTitle}` renders an empty heading for an empty key
  (`Locale::translate()` on 3.4, `PKPLocale::translate()` on 3.3 return
  `''`). The LoginHandler is pkp-lib's alone; no app overrides it.
- Introduced: `git blame` on `savePassword()` stops at e3f570bc37, the
  PSR-12 reformat (`pkp/pkp-lib#5678`), whose parent has the same lines
  from 4ababcd4c2. The reset form's 3.3 commit is a16de0d0fe
  (`pkp/pkp-lib#8450`).
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/ui-library; issues and
  PRs): "Change Password" title, savePassword, updateResetPassword,
  loginChangePassword, "page title" password, "browser tab" title,
  pageTitle missing. `pkp/pkp-lib#13132` (closed) covers only the raw
  key on the reset page's first display; `pkp/pkp-lib#12840` (open) is
  about editorial pages sharing one title.
