# After a successful password change, the profile's Password tab still holds the typed passwords

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#491` for `pkp/pkp-lib#478` · [90a749ab58](https://github.com/pkp/pkp-lib/commit/90a749ab58dfc4a7d1195b275f641e9b126e6384) · 2015-04-21 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U03 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a11)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A user who changes their password on the "Password" tab of their
profile sees "Your changes have been saved." at the top right, but the
tab is not cleared: the three boxes still hold the passwords just typed.

Two more things show when the change follows a refused attempt. The
refusal's "Errors occurred processing this form" notice stays above the
boxes until it fades on its own, about six seconds after the refusal.
And the line under "New password" stays empty: the hint "The password
must be at least 6 characters." does not come back.

## Impact

- **Lost**: nothing. The new password is stored and works at once; the
  tab only reads as if the save had not happened. The kept passwords are
  masked (dots), so they cannot be read off the screen. Pressing "Save"
  again on the kept boxes is refused with "The current password you
  entered was incorrect." and empties them; the new password stays in
  force.
- **Who**: every signed-in user who changes their password on Profile ›
  "Password", in every journal, press or server and on the site-wide
  profile. The error notice and the missing hint show only when a
  refused attempt came first (a wrong current password, a mistyped
  repeat).
- **Way round**: none needed. Loading the page again opens the tab
  empty, with the hint.

Low: the task gets done and the tab only misleads after it; a second
"Save" on the kept boxes is refused and changes nothing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS, OMP or OPS `main`. Nothing else is
  needed.

Steps:

1. Sign in as `dbarnes`.
2. Open the profile (`/index.php/publicknowledge/en/user/profile`) and
   press the "Password" tab. Under "New password" the line reads "The
   password must be at least 6 characters."
3. Type "wrongpass" in "Current password", "h15cNew1" in "New password"
   and "h15cNew2" in "Repeat new password", and press "Save". The save
   is refused: "Errors occurred processing this form", "The current
   password you entered was incorrect. The passwords do not match.", the
   three boxes are emptied and "The passwords do not match." shows under
   "New password" in place of the hint.
4. Within six seconds of the refusal (its notice fades after that), type
   "dbarnesdbarnes" in "Current password" and "h15cNew1" in "New
   password" and in "Repeat new password", and press "Save". Done later,
   the boxes and the empty line show the same, without the notice.
5. Control: sign out, and sign in as `dbarnes` with "h15cNew1".

**Expected**: after step 4, "Your changes have been saved." and the tab
as it opens: the three boxes empty, the hint "The password must be at
least 6 characters." under "New password", and no error notice.

**Observed**: after step 4, "Your changes have been saved." shows at the
top right. Half a second after the answer, the tab still shows "Errors
occurred processing this form The current password you entered was
incorrect. The passwords do not match." above the boxes; the three boxes
hold "dbarnesdbarnes", "h15cNew1" and "h15cNew1" (shown masked); the
line under "New password" is empty. Eight seconds after the press the
notice has faded and gone; the boxes still hold the passwords and the
line is still empty. The save's answer:

```
POST …/$$$call$$$/tab/user/profile-tab/save-password → 200
{"status":true,"content":"","elementId":"0","events":[]}
```

Step 5 signs in.

## Cause

`PKP\controllers\tab\user\ProfileTabHandler::savePassword()` answers a
successful save with an empty message:

```php
if ($passwordForm->validate()) {
    $passwordForm->execute();
    $notificationMgr = new NotificationManager();
    $notificationMgr->createTrivialNotification($user->getId());

    return new JSONMessage(true);
}
return new JSONMessage(true, $passwordForm->fetch($request));
```

On the page, `AjaxFormHandler.handleResponse()`
(`lib/pkp/js/controllers/form/AjaxFormHandler.js`) replaces the form
only when the answer carries content; with empty content it triggers
`formSubmitted` and leaves the rendered form as it is. So nothing clears
what the tab shows:

- the boxes keep what was typed;
- the in-place notice `#changePasswordFormNotification` is inside the
  form, rendered by the refused answer; it is a trivial notification
  (`Form::validate()` creates it with `createTrivialNotification()`),
  which `NotificationHandler.js` `addTimerToNotifications()` fades 6000
  ms after it is shown, so it goes only on that timer;
- after a refusal, the refused answer renders the line under "New
  password" with the error text in place of the hint:
  `FormBuilderVocabulary::_smartyFBVSubLabel()` sets the label to
  `$errors['password']` and marks it `error`, so the line is a
  `label.sub_label.error` reading "The passwords do not match.". On the
  valid "Save", the browser-side validator takes that `label.error` for
  the field's error label and hides it. Only a new rendering of the form
  holds the hint, so it does not come back.

The sibling saves answer a success with the form drawn again:
`saveContact()` calls `initData()` and returns `fetch()`,
`saveAPIProfile()` returns `fetch()` of the saved form, and
`saveIdentity()` sends a `refreshForm` event. The password save's empty
answer dates from the change that moved "Change Password" from a page of
its own into a tab of the profile (Introduced).

Reach:

- One handler and template serve OJS, OMP and OPS, and the site-wide
  profile (`/index.php/index/user/profile`) loads the same tab (code).
- `savePublicProfile()`, `saveRoles()` and `saveNotificationSettings()`
  also answer a success without the form; their fields keep the values
  just saved, which is what a fresh rendering would show, so only an
  earlier refusal's notice stays there until it fades (code; not
  driven).
- The other password forms are not affected: the forced "Change
  Password" page (`LoginHandler::savePassword()`) redirects, and the
  user grid's "Edit User" closes its modal (code).

## Proposed fix

Answer a successful save with the Password tab drawn afresh, as when it
is opened
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-not-cleared-after-save/fix.diff)):

```diff
--- a/lib/pkp/controllers/tab/user/ProfileTabHandler.php
+++ b/lib/pkp/controllers/tab/user/ProfileTabHandler.php
@@ -334,7 +334,12 @@
             $notificationMgr = new NotificationManager();
             $notificationMgr->createTrivialNotification($user->getId());
 
-            return new JSONMessage(true);
+            // Draw the tab afresh, as when it is opened (the Contact and API Key
+            // saves also return the form), so that the typed passwords, an
+            // earlier refusal's notice and its error under "New password" go.
+            $passwordForm = new ChangePasswordForm($user, $request->getSite());
+            $passwordForm->initData();
+            return new JSONMessage(true, $passwordForm->fetch($request));
         }
 
         return new JSONMessage(true, $passwordForm->fetch($request));
```

The fix builds a new form object instead of calling `initData()` on the
saved one. `ChangePasswordForm` has no `initData()` of its own, so the
saved form would keep the typed passwords in its data, and
`Form::fetch()` passes that data to the template.

Tried on OJS, OMP and OPS `main`: after step 4 the tab was drawn
afresh, with the three boxes empty, the hint back under "New password"
and no error notice. "Your changes have been saved." showed inside the
tab, as on the API Key tab, instead of at the top right. Step 5 signed
in with the new password. The nearby paths answered the same with the
fix in and out: a wrong current password is still refused ("The current
password you entered was incorrect."), and a change with no refusal
before it still saves, after which sign-in refuses the old password and
takes the new one.

**Alternatives**:

- Clear the boxes in the browser on `formSubmitted`: a one-off script for
  one form, whereas the server-side pattern already exists, and the
  notice and the hint would still need code of their own.
- Remove the in-place notice when any answer arrives
  (`NotificationHandler`): it would cover the notice only, for every
  legacy form.

**What goes with it**:

- What changes on screen besides: the confirmation moves from the top
  right into the tab. The fresh form's in-place notice area fetches the
  pending "saved" notification before the page-level one does, as on
  the API Key tab.
- Backport: the changed lines are the same on `stable-3_5_0` and
  `stable-3_4_0`. On `stable-3_3_0` the handler is
  `ProfileTabHandler.inc.php` in the old style and `savePassword()` has
  no `$user`, so the change goes in by hand with `$request->getUser()`.
  There `changePassword.tpl` pre-fills all three boxes with
  `value=$oldPassword`; a new form object has no data, so the boxes stay
  empty, where a fetch of the saved form would fill them.
- The guard: the e2e scenario for the Password tab (spec U03, scenario
  8) asserts the boxes empty and the hint back after a valid save that
  follows a refusal.

Small: three lines in one shared handler method, and the e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-not-cleared-after-save/walk.js)
  and
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-tab-not-cleared-after-save/lib.js)
  (steps 1 to 5; `neighbour` as argument runs only the nearby paths the
  fix must leave alone, `again` steps 1 to 4 and a second "Save"), run on an install freshly loaded from PKP's default test
  dataset (pkp/datasets 7912e09, 2026-10-14, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/password-tab-not-cleared-after-save/walk.js [neighbour|again]`.
  Walked on `main` and on `stable-3_5_0`, OJS, OMP and OPS, with the same
  result on all six. The trial applied the diff with
  `node bin/try-fix.js apply shared/playwright/checks/issues/password-tab-not-cleared-after-save/fix.diff ojs omp ops`,
  walked steps 1 to 5 and `neighbour` on each app, reverted, and walked
  `neighbour` again. The second "Save" (`again`) was walked on OJS `main`
  (the boxes are `type="password"`). No request failed, no script error
  was logged, and the server logs held nothing from the Password tab (the
  `stable-3_5_0` ones only an unrelated warning another report covers).
- Branch tips: `main`: OJS 378eced941, OMP f4836d4fb, OPS 2ece50497f
  (lib/pkp b17fadae59). `stable-3_5_0`: OJS ca763c91cd, OMP a70bbb9c4,
  OPS 44aec6e131 (lib/pkp 4045d9241e). `stable-3_4_0`: OJS daf0ca971d,
  OMP 0aec65441, OPS acd8ae704b (lib/pkp 55c8e406b3). `stable-3_3_0`:
  OJS d7d9dd14ec, OMP 8e72fc883, OPS c5532e2161 (lib/pkp 5e84acd11b).
- Code reads: on `main`, the files the Cause names, `ChangePasswordForm`
  (no `initData()`; `fetch()` passes the form's data to the template) and
  `Form::fetch()`. On `stable-3_5_0`, `savePassword()` (the same empty
  answer). On `stable-3_4_0` and `stable-3_3_0`, lib/pkp's
  `savePassword()` (the same empty answer), `AjaxFormHandler.js` (the
  same empty-content branch), `NotificationHandler.js` (the same 6000 ms
  timer), `Form::validate()` (the same trivial error notice) and
  `changePassword.tpl` (3.3 writes `value=$oldPassword` into the boxes).
- Upstream search (2026-10-15): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, for "change password form not cleared", "password
  tab fields after save", "profile password saved fields remain",
  "change password profile", "password fields still filled",
  "savePassword", "ChangePasswordForm", "ProfileTabHandler password".
  `pkp/pkp-lib#7244` (closed) is the refused save filling the boxes with
  the old password on 3.3, another fault.
- Not driven: the second "Save" on OMP and OPS and on 3.5 (the same
  handler); the Public, Roles and Notifications tabs' saves after a
  refusal; MySQL (the fault does not depend on the database).
