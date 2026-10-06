# A newcomer who accepts a role invitation is not signed in and lands on the sign-in screen

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no role invitations)
  - 3.3: none (code; no role invitations)
- **Introduced** `pkp/pkp-lib#10472` for `pkp/pkp-lib#10459` · [7e3a26ea83](https://github.com/pkp/pkp-lib/commit/7e3a26ea83db5428a8747b7dba574259e749cf98) · 2024-09-26 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a4)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A person invited to a role who has no account yet chooses a username
and password in the invitation's wizard and presses "Accept And
Continue to OJS". The dialog that follows announces the new role, but
its button "View All Submissions" opens the sign-in screen, and the
newcomer has to type the username and password they chose a minute
earlier.

Nothing is lost: the account exists and holds the role, and signing in
on that screen leads on to the dashboard.

## Impact

- **Lost**: nothing but a step; the button named "View All Submissions"
  opens the sign-in screen, with no word of why.
- **Who**: every newcomer who accepts a role invitation, once, right
  after creating the account.
- **Way round**: sign in on that screen.

Low: the newcomer signs in once more with the credentials they have
just chosen.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main` (OMP and OPS the same: the offered role
  there is "Copyeditor" on OMP and "Moderator" on OPS, and the buttons
  name OMP or OPS).

Steps:

1. Sign in as `rvaca` and open Settings › "Users & Roles".
2. Press "Invite to a role", type `nova.u06a@mailinator.com`, an address
   no account uses, and press "Search User": "The user does not have a
   role in this journal".
3. On "Enter details" type Given Name `Nova` and Family Name `Quill`; in
   the role row choose "Copyeditor", today as Start Date and "Appear on
   the masthead"; press "Save And Continue".
4. Press "Invite user to the role": "Invitation Sent".
5. In another browser, signed out, open the invitation email's accept
   link.
6. On "Create OJS account" type Username `novau06a` and Password
   `novau06anovau06a`, tick the privacy consent and press "Save and
   continue".
7. On "Enter details" choose Country "Canada" and press "Save and
   continue".
8. On "Review & create account" press "Accept And Continue to OJS".
9. In the dialog "You've been assigned a new role in OJS" press "View All
   Submissions".

**Expected**: Nova is signed in and lands on her dashboard.

**Observed**: the sign-in screen, signed out (the header offers
"Register" and "Login"), at

```
/index.php/publicknowledge/en/login?source=%2Findex.php%2Fpublicknowledge%2Fen%2Fsubmissions
```

The accept request (`PUT /api/v1/invitations/{id}/key/{key}/finalize`)
answered 200.

An existing user who opened the link signed out is asked to sign in, as
anywhere else; one signed in as themselves reaches the dashboard.

## Cause

`UserRoleAssignmentReceiveController::finalize()` (lib/pkp
`classes/invitation/invitations/userRoleAssignment/handlers/api/UserRoleAssignmentReceiveController.php`,
lines 101–119 on main) creates the newcomer's account from the wizard's
payload (username, names, country, the password already hashed), grants
the roles, marks the invitation accepted and answers 200. It never signs
the new account in.

The registration form, the other place where people make their own
account, does: `RegistrationHandler::register()` signs the new account
in with `Validation::login()` once it is created, unless `[email]
require_validation` is on, in which case it first asks the person to
confirm their address. An invited newcomer has already confirmed it by
following the emailed link, so nothing stands in the way of signing them
in.

The accept page then sends the newcomer where a signed-in user belongs.
ui-library's `AcceptInvitationPageStore.js` `submit()` opens the closing
dialog, whose "View All Submissions" calls `redirectToPage()` for
`submissions`. That page sends a browser without a session to the
sign-in screen, with `source` set to it.

Reach:

- Every offered role and every context: `finalize()` does not branch on
  them.
- No stored data is wrong: the account, its roles and the invitation's
  status are as they should be.
- The accounts a manager creates (`UserDetailsForm`,
  `CreateReviewerForm`) are not the manager's own and rightly sign
  nobody in.

## Proposed fix

Sign the newcomer in where `finalize()` creates the account, as
registration does, and send the session cookie with the API's answer
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/newcomer-not-signed-in-after-accepting/fix.diff)):

```diff
             Repo::user()->add($user);
+
+            // The newcomer has just chosen their username and password here: sign them in, as
+            // RegistrationHandler::register() does after a registration. Following the emailed link
+            // has proven the address, so [email] require_validation does not hold this back.
+            // API answers do not carry the session cookie the guard queues, so send it here.
+            $reason = null;
+            if (Validation::registerUserSession($user, $reason)) {
+                Application::get()->getRequest()->getSessionGuard()->sendCookies();
+            }
         } else {
```

`Validation::registerUserSession()` is the call, not `Validation::login()`,
because the payload holds only the hashed password.
`PKPSessionGuard::updateSession()` queues the new session cookie on the
Illuminate response singleton; the page router sends it from there
(`PKPRouter` calls `sendCookies()`), while an API controller answers with
a response object of its own, so the cookie has to be sent here.

Tried on main, OJS, OMP and OPS: after "View All Submissions" the
newcomer lands on the dashboard's "Assigned to me", signed in as
`novau06a`. Two existing users walked as the control, one who opened the
link signed out and one signed in as themselves, landed where they did
before, with and without the fix.

**Alternatives**:

- Send the newcomer from the closing dialog to the sign-in screen with
  the username filled in: still asks for the password just chosen, so a
  workaround.
- Sign in through a page request after the accept (a new page route
  that takes the invitation key): more code for the same result, and a
  second place that reads the key.

**What goes with it**:

- Backport: the diff applies as written to `stable-3_5_0`.
- Guard: an e2e check that "View All Submissions" lands a newcomer on the
  dashboard, signed in as the new account.

Small: a few lines in one method; tried.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/newcomer-not-signed-in-after-accepting/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/newcomer-not-signed-in-after-accepting/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets 3788b55, 2026-10-02; PostgreSQL, and nothing here depends
  on the database), then the two existing users walked as the control
  (`amwandenga` and `ccorino` on OJS, `aclark` and `afinkel` on OMP,
  `ccorino` and `ckwantes` on OPS). In pkp-e2e:
  `PROBE_FEATURE=issues-u06a PROBE_AGENT=u06a node bin/probe.js all shared/playwright/checks/issues/newcomer-not-signed-in-after-accepting/walk.js`
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, 2026-10-02, and
  the fix tried on `main` on a freshly loaded dataset, the control walked
  with the fix and without it. No request failed on the server and no
  page script failed. Signing in as `novau06a` on the sign-in screen was
  driven on `stable-3_5_0` (it opened "Assigned to me"); on `main` the
  walk recorded the landing only.
- Tips walked or read. `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a,
  ui-library 64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (lib/pkp
  3dc90c81a6, ui-library 280f98c5). `stable-3_5_0`: OJS 091fb65453, OMP
  9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335, ui-library d4e01883).
  `stable-3_4_0`: OJS 75cc2d488b, lib/pkp 32b0f4b4af. `stable-3_3_0`: OJS
  ac77c9fb35, lib/pkp f6ab331645.
- Code reads. `main`: `UserRoleAssignmentReceiveController::finalize()`,
  `PKPSessionGuard` (`updateSession()`, `updateSessionCookieToResponse()`,
  `sendCookies()`), `PKPRouter` and `APIRouter` (which response carries
  the cookies), `RegistrationHandler::register()`, `Validation::login()`
  and `registerUserSession()`, and ui-library
  `src/pages/acceptInvitation/AcceptInvitationPageStore.js`. 3.5: the same
  `finalize()` and store; the diff applies to it as written (dry run
  only). 3.4 and 3.3: lib/pkp has no `classes/invitation` at all, and the
  apps' "Users & Roles" adds users directly; role invitations arrived in
  3.5.
- Introduced: the commit created the class with a `finalize()` that does
  not sign the new account in.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library issues and
  pull requests. `pkp/pkp-lib#12374` (accepting while signed out on a
  site that requires sign-in, fixed) and `pkp/pkp-lib#11021` (another
  user signed in during the accept, fixed) are about reaching the
  wizard, not the end of it.
- Not driven: a journal with ORCID on (the dataset's journal has it
  off, so no "Verify ORCID iD" step showed); `[email] require_validation`
  on; MySQL.
