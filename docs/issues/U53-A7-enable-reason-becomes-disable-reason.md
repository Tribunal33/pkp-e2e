# After "Enable User", the next "Disable User" offers the enabling reason and the Login page quotes it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; the older users grid)
  - 3.3: OJS, OMP, OPS (code; the older users grid)
- **Introduced** no PR (PKP's old bug tracker, 6031) · [435314dd](https://github.com/pkp/omp/commit/435314dd717eacce4c2f40782570556c327f37c4) in pkp/omp, moved to pkp-lib by [cca31520](https://github.com/pkp/pkp-lib/commit/cca31520cc641d5bae2195734da246c266ec7a1a) · 2010-11-17 · michael-pkp (mfelczak)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U53 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U53-users-management.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles, "Enable User" opens with the old disabling
reason in "Reason for enabling user". Whatever that box holds on "OK" is
saved as the reason for disabling the account, although the account is
now enabled. The next "Disable User" offers that text, and if nobody
clears it the Login page tells the user their account was disabled "for
the following reason:" followed by the reason for enabling it.

The two boxes have different readers. The reason for disabling is shown
to the user when they try to sign in, by design. The reason for enabling
is a note to staff: its label and its note address the manager, and the
user never sees it while the account is enabled. The fault shows that
staff note to the user as the reason they were disabled.

Every account enabled through this window carries text into its next
disabling unless the manager empties the box, whether they typed an
enabling reason or left the prefilled one alone. Clearing or retyping
the box at each step avoids it. The fix is to stop prefilling both boxes and to stop saving the
enabling text as the disabling reason.

## Impact

- **Lost**: no data. The disabled user reads a wrong reason at sign-in:
  a staff note about the enabling, or a stale reason from an earlier
  disabling.
- **Who**: managers and the Site Administrator who disable an account
  that was disabled and enabled before, and that account's user when
  they next try to sign in. Every install, with no setting needed. The
  window gives no sign that the text in the box came from the enabling.
- **Way round**: clear or retype the box in both windows. An account
  already enabled before the fix still holds the text, and offers it
  when it is next disabled.

Medium: disabling an account tells its user a wrong reason, which can be
a note staff wrote for each other, and the window does not say where the
text came from; there is a way round on screen. It would be low if the
enable window said its text is kept as the disabling reason.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same). `rvaca`
  (Ramiro Vaca) is the journal manager and `dbuskins` (David Buskins) a
  section editor (OMP: series editor, OPS: moderator) in
  `publicknowledge`. Nothing else is needed.

Steps:

1. Sign in as `rvaca`.
2. Open Settings › Users & Roles
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Press the "⋯" button at the end of "David Buskins"'s row, then
   "Disable User". In "Disable David Buskins", type `Spam` in "Reason
   for disabling user" and press "OK".
4. Press the "⋯" button on the same row, then "Enable User". In "Enable
   David Buskins", replace the text in "Reason for enabling user" with
   `Appeal accepted` and press "OK".
5. Press the "⋯" button on the same row, then "Disable User". Press "OK"
   without changing "Reason for disabling user".
6. In a private window, sign in as `dbuskins`.

**Expected**: at step 4 "Reason for enabling user" is empty, and at
step 5 "Reason for disabling user" is empty, since no reason was typed
for this disabling. At step 6 the Login page refuses the user with:

```
Your account has been disabled. Please contact the administrator for more information.
```

**Observed**: at step 4 "Reason for enabling user" holds `Spam`. At step
5 "Reason for disabling user" holds `Appeal accepted`. At step 6 the
Login page reads:

```
Your account has been disabled for the following reason: Appeal accepted
```

## Cause

`PKP\controllers\grid\settings\user\form\UserDisableForm` serves both
windows with one field, `disableReason`, stored in the user's one
`disabled_reason` column. That column holds the disabling reason:
`Validation::registerUserSession()` returns it through
`Validation::login()` to `LoginHandler::signIn()`, which quotes it to a
disabled user.

[`initData()`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/controllers/grid/settings/user/form/UserDisableForm.php#L52-L63)
loads `getDisabledReason()` into the box for either window.
[`execute()`](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/controllers/grid/settings/user/form/UserDisableForm.php#L103-L104)
writes the box back with `setDisabledReason()` whichever way the window
went, so an enabling overwrites the disabling reason of an account that
is no longer disabled. `userDisableForm.tpl` names both text boxes
`disableReason`, under `grid.user.enableReason` or
`grid.user.disableReason`.

Reach:

- Both screens that offer the action open the form through the same
  `UserGridHandler::editDisableUser()` and `disableUser()`: Settings ›
  Users & Roles (walked, all three apps), and the "Users" tab of a hosted
  journal's (press's, server's) "Settings Wizard" under Administration ›
  Hosted Journals, for the Site Administrator (code).
- The other paths that enable an account clear the stored reason:
  `RegistrationAccessInvite::setUserValid()` (main and 3.5) and 3.4's
  `RegistrationHandler::activateUser()` set it to `''` (code).
- Stored data: an account enabled through this window holds text in
  `users.disabled_reason`, either the enabling reason the manager typed
  or the old disabling reason left in the box. No screen shows it while
  the account is enabled. The REST API's user record (`disabledReason`)
  and the users XML export carry it (code).
- On main the enabling's audit log entry (`USER_ENABLED`) does not
  include the text typed for it; the disabling's entry includes its
  reason (code).

## Proposed fix

Start both windows empty, and keep the stored reason for the disabling
only. Enabling clears the stored reason, and the text typed for enabling
goes into the enabling's audit entry, beside the `disabledReason` the
disabling's entry already records. The change is in pkp-lib's
`UserDisableForm`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/enable-reason-becomes-disable-reason/fix.diff)):

```diff
     public function initData()
     {
-        if ($this->_userId) {
-            $user = Repo::user()->get($this->_userId, true);
-
-            if ($user) {
-                $this->_data = [
-                    'disableReason' => $user->getDisabledReason()
-                ];
-            }
-        }
+        // Both windows start empty. The stored reason belongs to the last
+        // disabling: it is no reason for enabling, nor for a new disabling.
+        $this->_data = [
+            'disableReason' => '',
+        ];
     }
@@
             $user->setDisabled($this->_enable ? false : true);
-            $user->setDisabledReason($this->getData('disableReason'));
+            $user->setDisabledReason($this->_enable ? null : $this->getData('disableReason'));
             Repo::user()->edit($user);
             if ($this->_enable) {
-                AuditLog::log(AuditEvent::USER_ENABLED, LogLevel::NOTICE, ['targetUserId' => $user->getId()]);
+                AuditLog::log(AuditEvent::USER_ENABLED, LogLevel::NOTICE, [
+                    'targetUserId' => $user->getId(),
+                    'enabledReason' => $this->getData('disableReason'),
+                ]);
```

The diff clears the reason to `null`, where `setUserValid()` uses `''`;
both give the same message, since `registerUserSession()` turns `null`
into `''`. The form is the one writer behind both screens, so one change
covers them. It keeps what the 2010 change wanted, a reason asked for on
enabling, and leaves the disabling as it is.

Tried on main, all three apps. With the fix, the Steps showed the
Expected: both boxes empty, and "Your account has been disabled. Please
contact the administrator for more information." A reason typed when
disabling was still saved and quoted ("Your account has been disabled
for the following reason: Spam again"), as without the fix.

**Alternatives**:

- Clear the reason in `execute()` only. Accounts enabled before the fix
  would still offer their old text at the next disabling.
- Show the disabling reason in the enable window as text above an empty
  box. That is a template change and a product call; the recommended fix
  does not stand in its way.
- Drop the box from the enable window. That is a product decision, and
  it loses the reason the enable window asks for.

**What goes with it**:

- Open product question: with audit logging off (`[logs] log_audit`,
  the default), the enable window still asks for a reason and then
  discards it. Keep the box on that footing, or drop it (the third
  alternative).
- No data repair is needed. After the fix no screen reads the stored
  text of an enabled account, and the next disabling overwrites it. An
  optional upgrade step (`UPDATE users SET disabled_reason = NULL WHERE
  disabled = 0`) would tidy the REST API's record and the XML export. It
  touches enabled accounts only, so the "not validated" reason a
  registration stores on a disabled account stays.
- Backport: on 3.5 and 3.4 the same change applies without the audit
  hunk (those branches have no `AuditLog`); on 3.3 it goes in
  `UserDisableForm.inc.php`.
- Guard: the e2e scenario "Disable and re-enable a user" already
  checks that the next disabling's box is empty after the enabling box
  was emptied. With the fix it can also check that the enable window's
  box starts empty. A unit test on `UserDisableForm::execute()` for the
  enable case would also catch it.

Small: two methods in one pkp-lib class, no data repair, tried.

## Evidence

- The kept script takes the Steps on all three apps, then a second pass
  showing that a real disabling reason is still quoted (enable with the
  box emptied, disable with "Spam again", the user's sign-in):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/enable-reason-becomes-disable-reason/walk.js).
  Run it with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js all shared/playwright/checks/issues/enable-reason-becomes-disable-reason/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `WALK=nb` for
  the second pass alone).
- The fix was tried on the `main` tips below, on a freshly loaded
  dataset:
  `node bin/try-fix.js apply shared/playwright/checks/issues/enable-reason-becomes-disable-reason/fix.diff ojs omp ops`,
  then walk.js, then `node bin/try-fix.js revert ojs omp ops`. Without
  the fix (`WALK=nb`), the second pass showed the same refusal quoting
  "Spam again".
- Walked on PostgreSQL. Each install was freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `<app>/main/pgsql` and `<app>/stable-3_5_0/pgsql`, and
  no upgrade was needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc), OMP 3b0ecf794c and OPS
    c8af945bb7 (lib/pkp 3dc90c81a6); `UserDisableForm.php` is the same
    in both pkp-lib commits.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00d, OPS cf4fce69bd
    (lib/pkp a9c76aed62). Observed matched `main` word for word, and the
    form and template are the same code apart from the audit log calls.
- 3.4 and 3.3 were read in the code, in pkp-lib `stable-3_4_0`
  (df13621c2d) and `stable-3_3_0` (d446601ebe):
  `controllers/grid/settings/user/form/UserDisableForm.php` (3.3:
  `.inc.php`) loads `getDisabledReason()` in `initData()` and calls
  `setDisabledReason()` in `execute()` the same way, and
  `userDisableForm.tpl` has the same two boxes. There the Users list is
  the older grid, whose row links "Disable" and "Enable" open this form.
  The Login page's quote was not walked there.
- Introduced: blame on main reaches the PSR-12 reformat
  [e3f570bc](https://github.com/pkp/pkp-lib/commit/e3f570bc37da1f12d133ce6dfb3d41b3c336a191),
  then cca31520 (2013, "port users grid from OMP"), then OMP's 435314dd
  (`git log -S setDisabledReason`), written before PKP used GitHub pull
  requests; GitHub links that commit to mfelczak.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library issues and PRs on 2026-10-01 for "enable user reason",
  "disable reason", "reason for enabling", `UserDisableForm` and
  `disableReason`. The nearest, `pkp/pkp-lib#7857` (open), asks for
  disabling reasons as records of their own so that one reason does not
  overwrite another; it does not cover this fault.
- Not driven: the Administration "Users" tab (code only). MySQL not
  checked; the fault does not depend on the database.
