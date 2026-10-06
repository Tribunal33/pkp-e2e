# Password boxes stop at 32 characters, locking out newcomers who chose a longer password

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code; passwords shortened, no lock-out: no role invitations)
  - 3.3: OJS, OMP, OPS (code; passwords shortened, no lock-out: no role invitations)
- **Introduced** not traced; present since at least [99344aa68b](https://github.com/pkp/pkp-lib/commit/99344aa68bdc107ccb463f0397f70b0b04687d36) (2008-10-16)
- **Upstream** `pkp/pkp-lib#13285` (open), on the Login and Register boxes, which disagree with the invitation wizard; `pkp/pkp-lib#5266` (open; fix in PR `pkp/pkp-lib#7785` targeting `stable-3_3_0`, not merged, which raises the password boxes to 72)
- **Tracked in** spec U03 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U03-user-profile.md#a7), spec U01 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U01-login-and-sessions.md#a1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Every box where a user types their password stops taking characters
after the 32nd, without a word. This covers the Login page, "Forgot
your password?"'s reset form, Profile › "Password", Register, the forced
"Change Password" form and "Confirm Access". Only the role-invitation
wizard takes the whole password.

A newcomer who chooses a longer password while accepting an invitation
gets an account they cannot sign in to. The Login page sends only the
first 32 characters, and the answer is "Invalid username/email or
password. Please try again."

Everywhere else a longer password is shortened to 32 characters both
when it is set and when it is entered at sign-in, so the two match and
sign-in works. But nobody can have a password longer than 32
characters, and nobody is told that the password they chose is not the
one they have.

## Impact

- **Lost**: access to a new account until a password reset.
- **Who**: a newcomer who accepts a role invitation with a password
  longer than 32 characters (a passphrase, or a password manager's
  long default).
- **Way round**: "Forgot your password?" on the Login page, then the
  same password again: the reset form shortens it to the 32 characters
  the Login page sends. The reset needs the install's email to reach the
  user; where it does not, a manager sets a new password in Users &
  Roles › "Edit User", whose box also stops at 32.

Medium: signing in fails for a narrow group of users, and a way round
exists on screen. If the reset form also kept the whole password, the
account could not be recovered at all, and this would be high.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS are the same; the offered
  role there is "Copyeditor" on OMP and "Moderator" on OPS, and the
  buttons name OMP or OPS).
- The invitation and reset emails are read wherever the install
  delivers mail (the development install's mail catcher or log); the
  steps use the address `u03rb@mailinator.com` as a name only.
- The password the steps choose is 40 characters:
  `u03rbu03rb-correct-horse-battery-staple!`. Its first 32 characters
  are `u03rbu03rb-correct-horse-battery`.

Inviting:

1. Sign in as `rvaca` and open Settings › "Users & Roles".
2. Press "Invite to a role", type `u03rb@mailinator.com` and press
   "Search User".
3. On "Enter details" type Given Name `Lena` and Family Name `Long`. In
   the role row choose "Copyeditor", today as Start Date and "Appear on
   the masthead", then press "Save And Continue".
4. Press "Invite user to the role": "Invitation Sent".
5. In another browser, signed out, open the invitation email's accept
   link.
6. On "Create OJS account" type Username `u03rb`, type the 40-character
   password into "Password", tick the privacy consent and press "Save
   and continue".
7. On "Enter details" choose Country "Canada" and press "Save and
   continue".
8. On "Review & create account" press "Accept And Continue to OJS", then
   press "View All Submissions" in the dialog. The Login page opens.

Signing in:

9. On the Login page type Username `u03rb`, type the 40-character
   password and press "Login".

**Expected**: the "Password" box takes all 40 characters and Lena is
signed in.

**Observed**: the invitation's "Password" box took all 40 characters,
and the account was created. On the Login page the "Password" box holds
32 characters, and the page answers:

```
Invalid username/email or password. Please try again.
```

The way round:

10. Press "Forgot your password?", type `u03rb@mailinator.com` and press
    "Reset Password".
11. Open the link in the "Password Reset Confirmation" email. On "Reset
    Password" type the 40-character password into "New password" and
    "Repeat new password", and press "Save".
12. Press "Login", type `u03rb` and the 40-character password, and press
    "Login".

**Expected**: both boxes take 40 characters; Lena is signed in.

**Observed**: each box holds 32 characters, and the page reads
"Password has been updated successfully. Please login with updated
password." The sign-in in step 12 succeeds.

Profile:

13. Signed in as `u03rb`, open "View Profile" › "Password".
14. Type the 40-character password into "Current password", "New
    password" and "Repeat new password".

**Expected**: each box takes 40 characters.

**Observed**: each box holds 32 characters.

## Cause

The password boxes of the server-rendered forms in pkp-lib carry a
hard-coded limit of 32. Fourteen of the sixteen are `{fbvElement …
maxlength="32"}` parameters, which
`FormBuilderVocabulary::_smartyFBVTextInput()` passes through to the
`<input>`; `user/changePassword.tpl` spells its three `maxLength="32"`,
so a case-sensitive search for the lower-case string misses the Profile
boxes. Only `userLogin.tpl` and `registrationForm.tpl` write the
attribute on a raw `<input>`. In the browser, the attribute drops every
character after the 32nd as it is typed or pasted. No rule on the
server matches it: `FormValidatorPassword` and `FormValidatorLength`
check only the site's minimum, and the `users.password` column holds a
bcrypt hash, whatever the password's length.

The cap dates from the earliest pkp-lib templates (`templates/user/login.tpl`
in 99344aa68b, 2008). A 2014 change (`pkp/pkp-lib#184`, "remove arbitrary
maxlength from user password fields") removed it on the OJS 2.4 branch
only, and it never reached 3.x. While every way of setting a password
went through these boxes, the password was shortened the same way when
set and when entered, and sign-in worked. The role-invitation wizard (7e3a26ea83, `pkp/pkp-lib#10472` for
`pkp/pkp-lib#10459`, in 3.5) is a Vue form with no cap. Its server rule
is `max:255` in `UserRoleAssignmentInvitePayload`, so it stores the
whole password, which the Login box can never send back.

Reach. Sixteen boxes in eight templates, all in `lib/pkp/templates`
(OMP and OPS have no copies of their own); checked in the code on all
three apps:

- `frontend/pages/userLogin.tpl`: "Password" (walked).
- `user/userPasswordReset.tpl`: "New password", "Repeat new password"
  (walked).
- `user/changePassword.tpl`: Profile › "Password", all three boxes
  (walked).
- `frontend/components/registrationForm.tpl`: Register's "Password" and
  "Repeat password" (walked: each keeps 32 of 40 typed).
- `user/loginChangePassword.tpl`: the forced "Change Password" form's
  three password boxes (code).
- `user/confirmPassword.tpl`: "Confirm Access", added on `main` with
  its cap by cf5798f06e (PR `pkp/pkp-lib#12505` for
  `pkp/pkp-lib#12338`, 2026-04-09) (code).
- `common/userDetails.tpl`: "Add User" / "Edit User" "Password" and
  "Repeat password" (code).
- `install/install.tpl`: the administrator's password at install
  (code).

## Proposed fix

Remove the 32-character limit from the sixteen password boxes and
leave the length to the server, as the invitation wizard already does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-boxes-keep-32-characters/fix.diff):
the `maxlength="32"` or `maxLength="32"` parameter of fourteen
`fbvElement` calls and the attribute of two raw `<input>` tags), for
example:

```diff
--- a/lib/pkp/templates/frontend/pages/userLogin.tpl
+++ b/lib/pkp/templates/frontend/pages/userLogin.tpl
-<input type="password" name="password" id="password" value="{$password|default:""|escape}" password="true" maxlength="32" required aria-required="true" autocomplete="current-password">
+<input type="password" name="password" id="password" value="{$password|default:""|escape}" password="true" required aria-required="true" autocomplete="current-password">
```

1cbc88eb1d (`pkp/pkp-lib#9731`) removed the same `maxlength="32"` from
the Login page's "Username or Email" box. The usernames' 32-character
caps stay, because they match the `users.username` column and the
invitation's `max:32`. The installer's database password
(`maxlength="60"`) is a database credential, not an account password,
and is left out.

With the limit gone no form sets a maximum, and bcrypt reads only a
password's first 72 bytes, the same when the password is set and when
it is checked, so a longer password still signs in. We do not recommend
adding a server maximum with this fix: it would turn today's silent
acceptance into a refusal message for no gain in sign-in, and a figure
(255 to match the invitation, or 72 bytes) is a separate decision.

Tried on `main`, OJS, OMP and OPS. With the fix, every box in the Steps
takes all 40 characters, and step 9 signs Lena in. As neighbour checks,
with and without the fix:

- A wrong password for `dbarnes` is still refused with "Invalid
  username/email or password. Please try again."
- Profile › "Password" still refuses `abc` with "The password must be
  at least 6 characters."
- Register's Username box still stops at 32 characters.

**Alternatives**:

- Raise the cap to 64 or 72 (PR `pkp/pkp-lib#7785` uses 72, bcrypt's
  input limit): any figure below the invitation's 255 leaves the same
  lock-out for longer passwords, and it is one more number to keep in
  step with the server.
- Cap the invitation wizard at 32 instead: this ends the mismatch but
  keeps a limit below what users choose.

**What goes with it**:

- Accounts whose password was already shortened: a temporary fallback
  in `PKPUserProvider::validateCredentials()` (also accepting the first
  32 characters of a longer password) would spare their owners the
  reset; not tried.
- Backport: the same lines on `stable-3_5_0`, `stable-3_4_0` and
  `stable-3_3_0`; `user/confirmPassword.tpl` exists on `main` only.
- Guard: an e2e check that a password longer than 32 characters chosen
  in the invitation wizard signs in on the Login page.

Small: sixteen template lines in one repository; tried. After the fix,
anyone whose password was shortened when they set it must use "Forgot
your password?" once, because the Login page then sends the whole
password they type; that is a one-time reset by the user, not a data
repair, so the fix stays small (the optional fallback would make it
medium).

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-boxes-keep-32-characters/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/password-boxes-keep-32-characters/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets 566bb1f, 2026-10-03; PostgreSQL; MySQL not checked, and
  nothing here depends on the database). It types every password key by key, so each box's own limit
  applies, and it records how many characters each box holds. Run with
  the `neighbour` argument, it walks the neighbour checks. In pkp-e2e:
  `PROBE_FEATURE=issues-u03b PROBE_AGENT=u03b node bin/probe.js all shared/playwright/checks/issues/password-boxes-keep-32-characters/walk.js [neighbour]`
- The fix was tried on `main` on a freshly loaded dataset, and the neighbour checks were walked with the
  fix and without it. No request failed on the server and no page script
  failed.
- Tips walked or read. `main`: OJS ff004d0973 (lib/pkp 987776cd04,
  ui-library 64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, ui-library 280f98c5). `stable-3_5_0`: OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246 and OPS 38b61882d3 (lib/pkp
  cf3f984335), ui-library d4e01883. `stable-3_4_0`: OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b, lib/pkp 767353f4fe. `stable-3_3_0`: OJS
  ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, lib/pkp ac3fa73402.
- Code reads. `main` and 3.5: the eight templates above, a search of
  every app's own templates and plugins for password boxes (none outside
  lib/pkp), `FormValidatorPassword`, `ChangePasswordForm`,
  `ResetPasswordForm`, `RegistrationForm`, `LoginChangePasswordForm`
  (minimum only), `UserRoleAssignmentInvitePayload` (`max:255`),
  ui-library `AcceptInvitationUserAccountDetails.vue` and `FieldText.vue`
  (no `maxlength`), `Validation::encryptCredentials()` (bcrypt) and
  `PKPUserProvider`. 3.5 has no `user/confirmPassword.tpl`. 3.4 and 3.3:
  `userLogin.tpl`, `changePassword.tpl`, `userPasswordReset.tpl`,
  `loginChangePassword.tpl`, `registrationForm.tpl`, `userDetails.tpl`
  and `install.tpl` carry the same `maxlength="32"` on every password
  box. lib/pkp has no `classes/invitation`, so no screen stores a longer
  password, and set and entered passwords are shortened alike.
- Introduced: `git log -S'maxlength="32"'` over lib/pkp's templates goes
  back to 99344aa68b ("template abstraction", 2008), the earliest
  pkp-lib commit that holds a login template, and the cap is already in
  it. Each later blame on these lines (8c6a01ecb4, a36681dc00,
  6d5b53f23c, 7f8245664e, and b80f4956cd on `confirmPassword.tpl`,
  which added `autocomplete="off"`) reshaped the line and kept the
  limit.
  `pkp/pkp-lib#184` (merged 2014 into `ojs-dev-2_4`) removed it on that
  branch only.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library issues and pull requests (password maxlength, 32
  characters, truncated, long password). `pkp/pkp-lib#13285` reports the
  same lock-out on OJS 3.5.0-5 with the Login and Register boxes, but
  not the Profile, reset, forced-change, Confirm Access, Add User or
  install boxes. `pkp/pkp-lib#5266` is the general issue about arbitrary
  field limits.
- Code read for the fix: `FormBuilderVocabulary::_smartyFBVTextInput()`
  (passes `maxlength` through), Laravel's `BcryptHasher` (no `limit`
  set here, so `password_hash()` uses the first 72 bytes) and
  `SessionGuard`, which calls `rehashPasswordIfRequired()` without
  `$force`.
- Not driven: "Confirm Access" (it needs `password_timeout` in
  config.inc.php), the forced "Change Password" form, "Add User" /
  "Edit User" and the installer, all read in the code; the fallback for
  shortened accounts is not tried.
- Unverified: whether a password manager's autofill is shortened by the
  box as typing is; the walk typed every password key by key.
