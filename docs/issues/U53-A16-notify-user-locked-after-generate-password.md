# Add User: unticking "Generate Password" leaves "Notify User" greyed out, so no welcome email can be chosen

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [d57b6a94](https://github.com/pkp/pkp-lib/commit/d57b6a9419ac6c668b76ed9886514d649f736a8e) (2014-10-28)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On "Add User", ticking "Generate Password" and then unticking it empties
the password boxes and lets them be typed in again, but "Notify User"
stays greyed out and unticked, so the welcome email cannot be chosen for
a typed password until the window is closed and opened again.

On `main` and 3.5 only the Site Administrator meets this window, at
Administration › "Hosted Journals" › a journal's "Settings wizard" ›
tab "Users". Journal managers there add people with "Invite to a role"
on Settings › Users & Roles, which does not use this window. On 3.4 and
3.3 this window is also every journal manager's "Add User" on Settings ›
Users & Roles.

The fix is one call in one shared script, plus rebuilding each app's
bundled script file.

## Impact

- **Lost:** if "OK" is pressed anyway, the account is saved with the
  typed password, but the new user is sent no welcome email with their
  username and password.
- **Who:** anyone adding an account in this window who tries "Generate
  Password" and then changes their mind.
- **Way round:** "Cancel", then "Add User" again, typing the details
  afresh and leaving "Generate Password" alone. Once the account exists,
  the user's row in the grid also offers "Email", but that is a blank
  message (subject and text only), so the username and password have to
  be typed into it by hand.

Low: nothing stored is lost, and the greyed-out box shows that no email
will go. It would be higher if the email were lost while the box still
looked available; no path was found that does that.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Nothing else.
- To see the email in step 11, the install's mail must go somewhere you
  can read it. The walked install sends all mail to a local mail catcher
  (Mailpit) instead of delivering it. The request check under Observed
  needs no mail set up.

Steps:

1. Sign in as `admin`.
2. Open Administration, then "Hosted Journals" ("Hosted Presses" on
   OMP, "Hosted Servers" on OPS).
3. On the `publicknowledge` row, press the arrow at the start of the
   row, then "Settings wizard".
4. Open the tab "Users".
5. Press "Add User". The window opens on "Step #1: Fill in User
   Details" with "Notify User" ("Send user a welcome email.") unticked
   and available.
6. Tick "Generate Password" ("Generate random password for this
   user."). "Password" and "Repeat password" fill with stars and grey
   out, and "Notify User" is ticked and greyed out.
7. Untick "Generate Password".
8. Look at "Password", "Repeat password" and "Notify User".
9. Type Rosa in "Given Name", Delgado in "Family Name",
   `u53r45rdelgado` in "Username", `u53r45rdelgado@example.com` in
   "Email", and `u53r45pass` in both "Password" and "Repeat password".
10. Tick "Notify User".
11. Press "OK".

**Expected:** after step 7 the window is back as it opened: both
password boxes empty and editable, "Notify User" unticked and available.
Step 10 ticks it. Step 11 creates the account, the window moves to
"Step #2: Add User Roles to Rosa Delgado", and one welcome email,
"Journal Registration" ("Press Registration", "Server Registration"),
goes to `u53r45rdelgado@example.com` with the username and the password.

**Observed:** after step 7 both password boxes are empty and editable,
but "Notify User" is unticked and greyed out. In step 10 the click does
nothing: the box stays unticked. Step 11 creates the account and moves
to "Step #2: Add User Roles to Rosa Delgado". No email reaches
`u53r45rdelgado@example.com` in the mail catcher.

A check that needs no mail set up: in the browser's network tab, the
request "OK" sends (`POST …/$$$call$$$/grid/settings/user/user-grid/update-user`)
carries no `sendNotify` field, because the form leaves a disabled box
out of what it sends.

## Cause

`UserDetailsFormHandler.prototype.setGenerateRandom()` in
lib/pkp's
[`js/controllers/grid/settings/user/form/UserDetailsFormHandler.js`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/grid/settings/user/form/UserDetailsFormHandler.js#L83-L93)
runs on every click of "Generate Password". It sets `activeAndCheck`
to `'disabled'` when the box is ticked and to `''` when it is not, then
applies it to the password boxes with `.prop('disabled', …)` and to
"Notify User" with `.attr('disabled', …)` (line 92):

```js
$(':password', $form).
        prop('disabled', activeAndCheck).val(passwordValue);
$('[id^="sendNotify"]', $form).attr('disabled', activeAndCheck).
        prop('checked', activeAndCheck);
```

`.prop('disabled', '')` sets the property to false, so the password
boxes become editable. `.attr('disabled', '')` does not: for a boolean
attribute, jQuery removes it only when the value is `false`, and any
other value, the empty string included, writes `disabled="disabled"`.
So the untick leaves the attribute on "Notify User" (read in the
browser: `disabled="disabled"` after step 7).

The server does what it is sent. With a generated password,
`UserDetailsForm::execute()` always sends the welcome email, which is
why step 6 rightly ticks and locks the box. With a typed password it
sends the email only when the request carries `sendNotify`.
`AjaxFormHandler` sends the form with jQuery's `serialize()`, which
leaves disabled controls out, so after the untick the account is made
without the email.

Reach:

- The window: the older user grid's "Add User" (`UserGridHandler`,
  `UserDetailsForm`). On `main` and 3.5 the only screen that links to it
  is the Site Administrator's Settings wizard, since Settings › Users &
  Roles lists users in the newer list, which has no "Add User" (checked
  on screen and in the code). That is a matter of screens, not of
  access: `UserGridHandler` still grants `addUser` and `updateUser` to
  `ROLE_ID_MANAGER`, so a journal manager who opens the form by its
  address gets the same form. On 3.4 and 3.3 Settings › Users & Roles
  loads this grid, so journal managers reach it from the screen (code).
- Journal managers' own way to add people on `main` and 3.5, "Invite to
  a role", is an invitation the new user accepts and completes
  themselves, built on lib/pkp's `classes/invitation/` and its own Vue
  forms (`PKP\components\forms\invitation\…`). It does not use the
  grid's `UserDetailsForm` or this script (code).
- "Edit User": shows neither box. `userDetails.tpl` hides "Generate
  Password" for an existing account (`{if !$userId}`), and
  `userDetailsForm.tpl` hides "Notify User" by setting
  `disableSendNotifySection`. So it is not touched (code).
- The password boxes and the "checked" state of "Notify User": set with
  `.prop()`, and correct on screen.
- Other instances: lib/pkp's and the apps' `js/` and plugins hold no other
  `.attr()` call that sets a boolean attribute from a variable. The other
  calls set the constant `'disabled'` (or `'checked'`, `'selected'`) and
  clear it with `.removeAttr()` (code).

## Proposed fix

Set the disabled state of "Notify User" the way the line above sets the
password boxes', with `.prop()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-user-locked-after-generate-password/fix.diff)):

```diff
 		$(':password', $form).
 				prop('disabled', activeAndCheck).val(passwordValue);
-		$('[id^="sendNotify"]', $form).attr('disabled', activeAndCheck).
+		$('[id^="sendNotify"]', $form).prop('disabled', activeAndCheck).
 				prop('checked', activeAndCheck);
```

Tried on
`main` in all three apps: after the untick "Notify User" was unticked
and available, step 10 ticked it, and "OK" sent the welcome email with
the username and password. As a neighbour check, ticking "Generate
Password" again still ticked and greyed out "Notify User", with the fix
in and out.

**Alternatives:**

- Pass booleans (`var disabled = $checkbox.prop('checked')`) to both
  lines: clearer, and also correct, but it touches the password line,
  which works, for no change on screen.
- `.removeAttr('disabled')` on untick, as `submitForm()` does for the
  password boxes: works, but needs an if/else where `.prop()` covers
  both states in one call.

**What goes with it:**

- No stored data to repair, and no change to the server, the REST API or
  any plugin hook.
- The minified bundle: each app commits its own `js/pkp.min.js`
  (built from lib/pkp's handlers by `lib/pkp/tools/buildjs.sh`), and
  every one still holds the old call (`sendNotify"]',b).attr("disabled",d)`).
  A site that runs with `enable_minified = On` (the default in
  `stable-3_5_0`'s `config.TEMPLATE.inc.php`; `main`'s has it Off) keeps
  the bug until that file is rebuilt in OJS, OMP and
  OPS on each branch the fix lands on. Rebuilding it is a routine step
  the team already takes with lib/pkp script changes ("Update
  pkp.min.js" commits in each app).
- The same line, in the same file, is on `stable-3_5_0`,
  `stable-3_4_0` and `stable-3_3_0`, so the diff applies to each as it
  stands.
- Guard: an end-to-end test that ticks and unticks "Generate Password"
  and then ticks "Notify User"; pkp-lib has no unit tests for its
  jQuery handlers.

Small: one call in one pkp-lib file, tried, plus the routine rebuild of
`js/pkp.min.js` in each app.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-user-locked-after-generate-password/walk.js)
  takes the Steps on an install freshly reset to the default dataset.
  After each step it reads, in the browser, each box's `checked` and
  `disabled` properties and its `disabled` attribute, and after "OK" the step-2 heading
  and the slot's mail catcher, counting only mail that arrived after
  "OK":
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/notify-user-locked-after-generate-password/walk.js`.
  `NEIGHBOUR=1` runs the neighbour check (steps 1–8, then "Generate
  Password" ticked and unticked once more, then "Cancel"). Walked on
  `main` and `stable-3_5_0` (`PKP_E2E_LINE=stable-3_5_0` in front), OJS,
  OMP and OPS. No request failed and no page script failed on the way.
- The fix check:
  `node bin/try-fix.js apply shared/playwright/checks/issues/notify-user-locked-after-generate-password/fix.diff ojs omp ops`,
  reset the dataset, run the script and the neighbour check, then
  `node bin/try-fix.js revert shared/playwright/checks/issues/notify-user-locked-after-generate-password/fix.diff ojs omp ops`.
  The test installs load the handler's own file (`enable_minified =
  Off`).
- Tips: `main` OJS `bade233f73`, OMP `3b0ecf794c`, OPS `c8af945bb7`
  (lib/pkp `2e377d27fc` on OJS, `3dc90c81a6` on OMP and OPS);
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00d`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7` (lib/pkp
  `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a` (lib/pkp `d446601ebe`).
  Walked on the default dataset of pkp/datasets `38ab955` (2026-09-30).
- The `sendNotify` request check under Observed is read from the code,
  not recorded by the walk (the walk records requests without their
  bodies): `AjaxFormHandler` posts `$form.serialize()`, and
  `UserDetailsFormHandler.submitForm()` re-enables only the password
  boxes before it. It agrees with what the walk saw: the box disabled at
  "OK", and no email.
- `js/pkp.min.js` holding the old call: checked in OJS, OMP and OPS on
  `main` and `stable-3_5_0`, and in OJS on `stable-3_4_0` and
  `stable-3_3_0`.
- The row's "Email" (`UserGridHandler::editEmail()`, `UserEmailForm`,
  `userEmailForm.tpl`): a subject, the fixed recipient and a message
  box, with nothing filled in about the account (code).
- 3.4, 3.3, read in the code: `setGenerateRandom()` is identical, line
  for line. `templates/management/accessUsers.tpl` loads
  `grid.settings.user.UserGridHandler`, whose operations are granted to
  `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN`, so "Add User" is on
  Settings › Users & Roles. `templates/common/userDetails.tpl` renders
  both boxes. Both branches load jQuery 3.7.1 (`components/jquery` in
  lib/pkp's `composer.lock`), whose `.attr()` handles boolean
  attributes as on `main`.
- Introduced: `git blame` on line 92 gives
  [00930ccaf](https://github.com/pkp/pkp-lib/commit/00930ccaf07998c3e8f6c87289b436adb20ef5b3)
  (2013-02-14, the file's first commit, as `UserFormHandler.js`), which
  passed `0` or `1` to `.attr('disabled', …)` for all three boxes. pkp-lib
  then loaded jQuery 1.4.4, whose `.attr()` set the property, so the
  untick freed the box. By d57b6a94 (2014-10-28) pkp-lib had moved on
  to jQuery 1.11.0 (the version in the commit's parent), whose `.attr()`
  keeps a boolean attribute for any value but `false`. d57b6a94 moved the password boxes and the
  "checked" state to `.prop()` and left this call on `.attr()`. The
  jQuery upgrade between the two commits was not traced, so d57b6a94 is
  the oldest commit known to show the fault.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  issues and PRs searched for "generate password", "notify user",
  "random password", `sendNotify`, `setGenerateRandom` and
  `UserDetailsFormHandler`. The nearest, `pkp/pkp-lib#5267` (a generated
  password shorter than the site minimum) and `pkp/pkp-lib#12826`
  (removing the older grid code, this file included), are other faults.
- Not driven: 3.4 and 3.3, and a journal manager opening the form by its
  address on `main` and 3.5.
