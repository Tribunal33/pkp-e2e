---
name: login-and-sessions
status: verified
---

# Login & sessions

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

This spec is about being someone on the site. A visitor signs in with a
username (or email address) and a password, and is taken where their roles
point. Signing out hands the browser back to the public site. A forgotten
password is recovered through an emailed link. An account can be flagged so
that its next sign-in forces a password change. Two supervised doors exist on
top of the ordinary one. The Site Administrator and a journal's
manager-level roles can **log in as** another user, to see the site exactly
as that user does and act on their behalf. And the site can be configured so that the Administration area asks
the Site Administrator to **confirm their password** again before it opens.
This spec covers those flows, the session behavior behind them (staying
signed in, expiry), and the screens they run on.

## Actors & permissions

The manager-level roles are Journal Manager, Editor and Production editor
(a preprint server has only its manager); holding one of them in a journal
is what "managing" it means here. A user is "wholly within a manager's
journals" when every role they hold anywhere on the site sits in journals
that manager manages.
Who can reach the Users & Roles screen itself belongs to the users-management
feature (see *Cross-feature interactions*).

| Action | Who may — and when |
|--------|--------------------|
| **Sign in / sign out** | • Anyone with an enabled account, on any journal's Login page or the site-level one. A disabled account is refused with a message (Rule 2) <sup>a</sup> |
| **Request a password reset** | • Anyone, signed out, through the "Forgot your password?" link on the Login page (Rules 7–8) <sup>e</sup> |
| **Set a new password from the emailed link** | • The holder of the emailed link, while the link is valid (Rules 8–10) <sup>f</sup> |
| **Complete a forced password change** | • The account holder, at their next sign-in, when their account is flagged to require it (Rule 11) <sup>g</sup> |
| **Flag an account for a forced password change** | • Site Administrator: any account of a hosted journal, through "Add User" or "Edit User" in that journal's "Settings wizard" › "Users" (Rule 11a)<br>• Whoever creates a reviewer through "Create New Reviewer" {OJS OMP}: that new account only, flagged automatically (Rule 11a)<br>• Journal Manager: cannot flag an existing account. The journal's own Users & Roles offers no such control, and the wizard's address answers them with the access-denied page ⚠ [A5](#a5) <sup>g</sup> |
| **Impersonate a user (Login As)** | • Site Administrator: any account except their own or another Site Administrator's (Rule 14)<br>• Journal Manager, Editor and Production editor: accounts wholly within the journals they manage (Rule 14)<br>• Nobody else. No role below manager level is offered the action anywhere. Even the action's address, captured by hand in a session that does offer it (Rule 14), answers them with the access-denied page: "The current role does not have access to this operation." (Rule 17) <sup>h</sup> |
| **Return to their own account** | • The impersonator, through "Logout as {username}" in the user menu, or "Logout as {full name}" at the top of the workflow Participants panel (Rule 15) <sup>j</sup> |
| **Pass the Confirm Access gate** | • Site Administrator. The gate exists only when the site's configuration requires re-authentication, and only the Administration area asks (Rule 16). Every other role is turned away from Administration by its ordinary role gate, never by this one <sup>k</sup> |
| **See the access-denied page** | • Any signed-in user who reaches a screen their role does not allow (Rule 17). A signed-out visitor gets the Login page instead (Rule 4) <sup>l</sup> |

## Fields & validation

**Login page** (title "Login"):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Username or Email" | yes | Either the account's username or its email address |
| "Password" | yes | The typing box stops accepting input at 32 characters, even though passwords may be longer ⚠ [A1](#a1). A "Forgot your password?" link sits under it <sup>a</sup> |
| "Keep me logged in" | no | Keeps the sign-in alive for a fixed window from login, beyond the idle lifetime that otherwise ends it (Rule 5). The box is ticked every time the form shows ⚠ [A2](#a2) |
| Spam check | when configured | Appears only when the installation's configuration turns a check on for the login form. reCAPTCHA shows its widget. The ALTCHA check is invisible: nothing extra appears and signing in works as usual, but a browser without JavaScript is refused with "You must complete the validation check used to prevent spam submissions." (see *Settings*) <sup>a</sup> |
| "Register" link | — | Shown beside the "Login" button while the journal accepts registrations. Disabling registration removes it (see *Settings*) <sup>a</sup> |

**Lost-password page** (title "Reset Password"; reached via "Forgot your
password?"):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Registered user's email" | yes | Must be an email address. The page instructs "Enter your account email address below and an email will be sent with instructions on how to reset your password." <sup>e</sup> |
| Spam check | when configured | The Login page's invisible ALTCHA check, per configuration <sup>e</sup> |
| "Register" link | — | Same as the Login page's. Gone when registration is disabled |

**Set-a-new-password form** (opened by the emailed link). The page is headed
"Reset Password", but the browser tab shows a raw internal code in place of a
title ⚠ [A3](#a3):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "New password" | yes | At least the site minimum length, stated under the field: "The password must be at least {N} characters." When the site's compromised-password check is on, a known-breached password is refused (see *Settings*) <sup>f</sup> |
| "Repeat new password" | yes | Must match |

**Change Password form** (forced at sign-in; title "Change Password"). The
browser tab reads "Change Password | {journal name}", but after a refused
"OK" only the journal's name ⚠ [A11](#a11):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Login" (username) | yes | Prefilled with the username that just signed in <sup>g</sup> |
| "Current password" | yes | A wrong value errors "The current password you entered was incorrect." <sup>g</sup> |
| "New password" / "Repeat new password" | yes | Site minimum length; both must match <sup>g</sup> |

**Confirm Access form** (title "Confirm Access"):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Password" | yes | The signed-in Site Administrator's own password. The page says "Signed in as **{name}**. Please enter your password to continue." A wrong password re-shows the form with the generic sign-in error (Rule 16) <sup>k</sup> |
| "Cancel" | — | Leaves for the page the administrator came from, never back into Administration (Rule 16) <sup>k</sup> |

## Rules & state

1. **One Login page.** Every journal has a Login page, and the site has one
   outside any journal. The site-level page is reached from the "Login" link
   at the top right of the site's own homepage. Both carry the same form. A visitor who is already signed in
   and opens the Login, lost-password, or emailed reset-link address is sent
   to their home (Rule 3) instead of the form. <sup>a</sup>
2. **One generic failure.** A wrong password and a wrong or unknown username
   or email get the same sentence on the same page: "Invalid username/email
   or password. Please try again." An empty required box never reaches the
   site: the browser itself refuses the submission and prompts to fill the
   field in. A disabled account with correct credentials gets a different
   answer: "Your account has been disabled. Please contact the administrator
   for more information." When staff recorded a reason, it reads "Your
   account has been disabled for the following reason: {reason}". With a
   wrong password, a disabled account gets the generic sentence. After a
   disabled account's refusal, the next sign-in in the same browser, by
   any account and with the correct password, lands back on the Login
   page with no message and "Username or Email" empty; the try after that
   lands where Rule 3 says ⚠ [A12](#a12). Opening the Login page afresh in
   between does not help. After a wrong-password or unknown-username
   refusal, the next correct sign-in lands at once. <sup>a</sup>
3. **Landing after sign-in.** An interrupted destination wins (Rule 4).
   Otherwise, a user holding a role beyond Reader **in the journal signed
   into** lands on that journal's Dashboard. A user with no such role there
   (Reader-only, role-less, or holding roles only in other journals) lands
   on the journal home page. Signing in at the site-level Login of a
   multi-journal site lands on the site home page whatever the user's roles,
   because the Dashboard landing needs a journal to aim at. <sup>b</sup>
4. **An interrupted visit resumes.** A signed-out visitor who opens a private
   screen's address (a bookmark, an emailed link) gets the plain Login page.
   Nothing on it names the destination being held, though a few screens add
   an explanatory sentence above the form (a download that requires signing
   in, for example). Signing in continues to the address they originally
   asked for. When that address is a screen their roles do not allow (a
   Reader who had opened a journal's settings, say), the sign-in lands on
   the access-denied page instead (Rule 17). One address misbehaves: the
   address that ends at the word "dashboard", with nothing after it,
   answers a blank server-error page instead of the Login page
   ⚠ [A7](#a7). <sup>b</sup>
5. **Staying signed in.** Closing the browser does not sign a user out.
   Ticked or not, the sign-in survives browser restarts, unless the
   installation is configured to end sessions at browser close. Unticked,
   the session ends when its idle lifetime runs out (a config default of
   7 days without a visit). Ticked, "Keep me logged in" keeps the sign-in
   past that idle limit, for a fixed window from login (config default
   30 days), but only in part (Rule 5a). <sup>c</sup>
5a. **Back after the idle limit, half signed in.** A user who signed in
   with "Keep me logged in" ticked and comes back after the idle limit
   still opens the Dashboard and the other editorial pages signed in.
   But the journal's public pages offer "Register" and "Login" as if
   they were signed out, the Login page shows its form instead of
   sending them home (Rule 1), and "Login As" fails (Rule 14)
   ⚠ [A8](#a8). Signing in again, on that Login page or after signing
   out, puts all three right: their name back in the public header, the
   Login page sending them home, "Login As" impersonating. <sup>c</sup>
6. **Signing out.** The user menu (top-right initials) offers "Logout".
   Signing out returns the browser to the Login page and ends only this
   browser's session. The same account signed in elsewhere stays signed in.
   The login form then arrives with the just-departed user's email address
   prefilled in "Username or Email". It is the email even when the sign-in
   had used the username. While impersonating, the menu offers no plain
   Logout. Its only exit is "Logout as {username}" (Rule 15). <sup>d</sup>
7. **Requesting a reset.** Submitting the lost-password form answers "A
   confirmation has been sent to your email address if a matching account was
   found. Please follow the instructions in the email to reset your
   password." with a "Login" link back. An email actually goes out when the
   address belongs to an account. <sup>e</sup>
8. **The reset email** carries one link. The link expires on a clock (2 hours
   on a default install; see *Settings*). It also dies early if the account's
   password changes or the account signs in, so in effect it is single-use.
   <sup>e</sup> <sup>f</sup>
9. **Setting the new password.** A valid link opens the set-a-new-password
   form (Fields above). Saving answers "Password has been updated
   successfully. Please login with updated password." with a "Login" link.
   The user is **not** signed in by resetting, and every other signed-in
   session of that account ends at that moment. <sup>f</sup>
10. **A dead link explains itself.** An expired or altered link shows "Sorry,
    the link you clicked on has expired or is not valid. Please try resetting
    your password again." with a "Reset Password" link back to the
    lost-password page. A link whose username no longer exists lands on the
    lost-password page directly. <sup>f</sup>
11. **Forced password change.** An account flagged to require a password
    change signs in only through the "Change Password" form. Correct
    credentials at the Login page divert there instead of landing anywhere.
    The page explains "You must choose a new password before you can log in
    to this site…". Completing the form signs the user in and lands them
    where an ordinary sign-in would (Rule 3; a reviewer, for instance, lands
    on the Dashboard). Their other sessions end at that moment; flagging
    the account alone leaves them signed in. <sup>g</sup>
11a. **Where the flag is set.** Administration › Hosted Journals, a
    journal's row, the arrow at its start, "Settings wizard", then the tab
    "Users" holds an older users list. Its "Add User" and "Edit User"
    windows carry the box "Change Password" ("User must change password on
    next log in."), and saving with it ticked flags the account; the
    windows belong to [Users management](U53-users-management.md). On
    "Edit User" the box always opens unticked, flagged account or not, and
    saving it unticked clears the flag ⚠ [A10](#a10). The review stage's "Create New Reviewer" {OJS OMP} flags the account it
    creates and emails it a generated password; that form belongs to the
    reviewer-assignment feature. The page a row's "Edit" opens on a
    journal's Settings › Users & Roles has no password control
    [A5](#a5). <sup>g</sup>
12. **Impersonation is total while it lasts.** After Login As, the browser
    session **is** the target user: their dashboard, their submissions, their
    name on everything done. The action sits behind a confirmation dialog
    reading "Log in as this user? All actions you perform will be attributed
    to this user." (OK / Cancel). <sup>h</sup> <sup>i</sup>
13. **While impersonating, the screen says so.** The top bar shows the
    impersonator's own initials, muted, with the target's initials overlaid
    in a warning color. The user menu adds "You are currently logged in as
    {username}" with a "Logout as {username}" link. On a submission's
    workflow screen that shows the Participants panel, the panel's first
    entry is a "Logout as {full name}" button. Both labels name the
    **impersonated** account, the user being worn, not the one who will be
    restored. An impersonated Author's view of a submission has no
    Participants panel, so there the user menu is the only exit. <sup>j</sup>
14. <a id="who-may-impersonate"></a> **Who may impersonate whom.** A Site
    Administrator may impersonate anyone except themselves and other Site
    Administrators. A Journal Manager, Editor or Production editor may
    impersonate a user wholly within the journals they manage (the terms
    are defined above the Actors table). A user who also holds roles in a
    journal the manager does not manage is out of reach. Rows never offer
    the action on the current user's own account. No screen offers a path to an
    out-of-reach user, but the action's address can be built by hand: use
    Login As on a row that does offer it, copy the address the browser
    visited from its history (it ends in a number identifying that user),
    return to your own account ("Logout as", Rule 15), then open that
    address with the number changed. Opened for an out-of-reach user, it
    shows an error page, "Sorry, you do not have administrative rights over
    this user…", listing the possible causes, with a link back to the users
    list. In a sign-in "Keep me logged in" has kept past the idle limit
    (Rule 5a), "Login As" fails on the server and the browser shows a
    blank page, instead of impersonating or turning the user away, both
    when pressed on a row and at a hand-built address [A8](#a8).
    <sup>h</sup>
15. **Returning.** "Logout as", the user menu's "Logout as {username}" or
    the Participants panel's "Logout as {full name}", restores the original
    account without asking for credentials. Pressed on a workflow screen,
    either control lands on that submission; elsewhere it lands home.
    Typing the plain sign-out address instead ends everything: the browser is
    signed out of both identities and lands on the Login page, not back in
    the original account. That address must be captured before
    impersonating, by copying the link behind the user menu's "Logout"
    entry, because the menu no longer offers it afterwards. No deeper
    nesting is supported, yet the Users & Roles list and the workflow
    Participants panel still offer Login As while an impersonation is
    already active. To see this, impersonate a user who can themselves open
    one of those screens, a Journal Manager, say. Using it starts a second
    impersonation that replaces the first ⚠ [A4](#a4). <sup>i</sup> <sup>j</sup>
16. **The Confirm Access gate.** When the installation's configuration sets a
    re-authentication window (in minutes), every Administration screen first
    shows the "Confirm Access" form (Fields above). The correct password
    opens Administration for the window's duration. Moving between
    Administration screens keeps refreshing the window, so the prompt returns only
    after the administrator has been away from it longer than the window.
    After the window lapsed, a press of one of the buttons that reload an
    Administration page, such as "Delete Template Cache", also lands on
    Confirm Access. The changes the screens save in place do not: adding or
    deleting a journal, saving Site Settings, its Languages and Plugins, and
    retrying or deleting failed jobs all go through without the password
    ⚠ [A13](#a13). The page button's action is **not** replayed: after
    confirming, a notice says "Your last action was not completed. Please
    try again." Opening the Confirm Access
    address directly, with nothing to continue to, never shows the form.
    That is the address trimmed of the interrupted page it carries in the
    address bar whenever the gate fires. The browser is sent straight home
    without being asked for a password. While a confirmed window is still
    active, it lands on Administration instead. Starting an impersonation
    ends the confirmed window. <sup>k</sup>
17. **Access denied, signed in.** A signed-in user who reaches a screen their
    role does not allow is shown a message page stating the denial. The exact
    sentence varies with the screen; most commonly it is "The current role
    does not have access to this operation." Nothing of the refused screen
    renders. The page around the sentence belongs to
    [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    which records that its heading and the last step of its breadcrumb are
    empty and its browser tab carries no page name
    (its finding [A3](U08-navigation-menus-and-site-chrome.md#a3)). Signed out, the
    same address shows the Login page instead (Rule 4). <sup>l</sup>
18. **Sessions end from the outside too.** The installation can be
    configured to end a session whose network address changes mid-visit (on
    by default). The Site Administrator can also expire every session at
    once with the "Expire User Sessions" tool (see *System administration*).
    The user's next click then lands on the Login page. <sup>m</sup>

## Side effects

- **On a reset request**: one email, "Password Reset Confirmation", goes to
  the matching account, sent from the site's contact address, containing
  the single reset link (Rule 8). No other flow in this spec sends mail.
  <sup>e</sup>
- **On every sign-in**: the account's last-login date is recorded, but the
  Users & Roles screen does not show it: its "Current Users" table has the
  columns "Name", "Email", "Roles", "Start Date", "Affiliation" and "More
  Actions" ("Start Date" is the role's start), and a row's "Edit" page shows
  each role's start and end dates only ⚠ [A9](#a9). Completing a forced
  change or an emailed reset also ends the account's other sessions
  (Rules 9, 11). <sup>b</sup> <sup>f</sup>
- **On impersonation**: everything done while impersonating is recorded as
  the impersonated user. Submissions, decisions and emails all carry the
  target's name, as the confirmation dialog warns (Rule 12). Submission
  activity-log entries additionally remember who was really acting: they
  display "{impersonator} (acting as {target})". The exception is a reader
  from whom a review's anonymity already hides the entry's reviewer; they
  see the target's name alone. The log screen itself belongs to the
  *Submission activity log & notes* feature.

## Settings that modify behavior

- **Site password policy.** The minimum password length and the
  compromised-password check ("uncompromised" validation on new passwords)
  are set on the Administration site settings screen, which the *Site
  settings* feature owns. <sup>n</sup>
- **Sign-in rate limiting.** The same screen can enable rate limiting with a
  maximum attempt count (default 5) and a cool-down (default 300 seconds).
  When enabled, repeated failed sign-ins or reset requests are refused for
  the cool-down. On purpose, the refusal shows the same generic answer as an
  ordinary failure, plus a delay, so the limiting itself is invisible.
  During the cool-down even the correct password answers "Invalid
  username/email or password. Please try again." This concealment is
  intended [A6](#a6). Disabled by default. <sup>n</sup>
- **Configuration file, security section.** For the system administrator,
  with no screen: the reset-link lifetime (`reset_seconds`, default 2 hours);
  the "Keep me logged in" window (`remember_me_lifetime`, default 30 days);
  end-session-on-browser-close (`session_expire_on_close`);
  end-session-on-address-change (`session_check_ip`, default on); forcing
  https for login or the whole site (`force_login_ssl`, `force_ssl`); the
  Confirm Access window (`password_timeout` minutes, default off); and the
  salt behind reset links, a secret value that makes the links unforgeable.
  The same section's plugin-installation and allowed-HTML keys serve other
  features (see *Cross-feature interactions*). <sup>m</sup>
- **Idle session lifetime.** `session_lifetime` (default 7 days) in the
  configuration file's general section. <sup>m</sup>
- **Spam checks on login and lost-password.** The configuration file's
  captcha section decides whether the login form carries reCAPTCHA or the
  invisible ALTCHA check (`captcha_on_login` / `altcha_on_login`), and
  whether the lost-password form carries the ALTCHA check
  (`altcha_on_lost_password`). The captcha configuration's home is the
  [Registration & account validation](U02-registration-and-account-validation.md#spam-checks) feature. <sup>a</sup>
- **User registration disabled.** The journal setting that closes
  registration also removes the Register links from the Login and
  lost-password pages. A directly-typed register address then answers "This
  journal is currently not accepting user registrations." The setting itself
  belongs to the *Roles configuration* feature. <sup>a</sup>

## Cross-feature interactions

- **Registration.** The Login page's "Register" link enters the registration
  flow, and the captcha configuration lives there (see
  [Registration & account validation](U02-registration-and-account-validation.md)).
- **User profile.** A signed-in user changes their own password on the
  profile's Password tab (see *User profile*). This spec covers only the
  flows that block sign-in: the forced change and the emailed reset.
- **Users management.** Disabling accounts (with the reason Rule 2 shows),
  the Users & Roles screen, where Login As is most prominently offered, and
  the Site Administrator's older users list, whose "Add User" and "Edit
  User" windows carry the forced-change box (Rule 11a), belong to
  [Users management](U53-users-management.md). This spec covers the Login
  As action itself on every screen that offers it, and what the flag does.
- **Stage participants / Reviewer assignment.** The Participants panel and
  the Reviewers table belong to their own features. This spec covers only
  their "Login As" / "Logout as" entries. The "Create New Reviewer" form that
  flags its new account for a password change (Rule 11a) belongs to the
  reviewer-assignment feature.
- **System administration.** The Administration area the Confirm Access gate
  protects, and the "Expire User Sessions" tool, belong to *System
  administration & jobs*. The gate itself is this spec's.
- **Site settings.** The password-policy and rate-limiting form belongs to
  *Site settings*. This spec covers their effect on these screens.
- **Invitations & one-click links.** Emailed invitation and reviewer
  one-click links open their flows signed out without touching these
  screens. They belong to [user invitations](U06-user-invitations.md) and the
  future *Reviewer's review* spec.
- **Plugins management.** The configuration file's security section also
  carries the plugin-installation policy keys used by *Plugins management*.

## Canonical scenarios

Scenarios 1 to 3, 7 and 8 use ready accounts on the seeded journal (1 on a
site that also hosts a scratch journal, 8 on a scratch submission);
scenarios 4 to 6 act on a throwaway account of a scratch journal, because
each changes its password. Scenarios 2 and 4 keep the same account signed
in in a second browser. The ready accounts and their passwords and the
tooling recipe are in the footnote. <sup>s</sup>

1. **Sign in and land on the Dashboard**

   Given: Editor, signed out, on the Login page of a journal whose site
   also hosts a second journal; a Reader's account ready. <sup>s</sup>

   - **An empty box**: type the Editor's username in "Username or Email",
     leave "Password" empty and press "Login": the browser itself refuses
     the submission and prompts to fill the field in; nothing reaches the
     site (Rule 2).
   - **A wrong password**: type not-the-password in "Password" and press
     "Login": the page answers "Invalid username/email or password. Please
     try again." and keeps the username filled in.
   - **The correct password**: untick "Keep me logged in", type the
     correct password and press "Login": the browser lands on the
     Dashboard.
   - **The Login page while signed in**: open the Login page's address
     again: the Dashboard shows instead of the form (Rule 1).
   - **A browser restart**: close the browser and open it again on the
     Dashboard address: the Dashboard shows, still signed in, the box
     having been unticked (Rule 5).
   - **The Editor's row on Users & Roles**: Journal Manager: on Settings ›
     Users & Roles, search for the Editor by name: the "Current Users"
     table lists the Editor's row, its "Roles" cell naming the Editor's
     role, under the columns "Name", "Email", "Roles", "Start Date",
     "Affiliation" and "More Actions"; none of them is a last-login date
     [A9](#a9) (Side effects).
   - **The site-level Login page**: Editor: sign out, open the site's own
     homepage and press "Login" at its top right: the same form; sign in:
     the browser lands on the site home page, not the Dashboard (Rule 3).
   - **Control**: sign out, open the journal's Login page and sign in as
     the Reader: the browser lands on the journal home page, not the
     Dashboard (Rule 3).

2. **Sign out**

   Given: any signed-in user, on the Dashboard, the same account also
   signed in in a second browser. <sup>s</sup>

   - **"Logout"**: open the top-right user menu (the initials button) and
     press "Logout": the browser returns to the Login page, signed out,
     and the "Username or Email" box already holds the departed account's
     email address.
   - **The second browser**: in the second browser, open the Dashboard:
     it shows, the account still signed in there; signing out ended only
     the first browser's session (Rule 6).
   - **Control**: in the first browser, opening any dashboard address now
     shows the Login page, not the dashboard. The exception is the address
     that ends at the word "dashboard", which answers a blank error page
     ⚠ [A7](#a7).

3. **A bookmarked private page waits for sign-in**

   Given: Editor, signed out, with a submission's workflow address at
   hand. <sup>s</sup>

   - **The bookmarked address**: paste the submission's workflow address
     into the browser: the Login page appears instead of the submission.
   - **Signing in**: sign in: the browser continues straight to the
     submission that was asked for, not to the Dashboard.
   - **Control**: the Login page that appeared was the plain form:
     nothing on it named the submission being held (Rule 4).

4. **Recover a forgotten password**

   Given: Author, signed out, on a scratch journal, the same account also
   signed in in a second browser; that journal's Login As address for a
   Reader at hand (Rule 14). <sup>s</sup>

   - **An address no account holds**: press "Forgot your password?" on the
     Login page, type nobody@mail.test in "Registered user's email" and
     submit: the page answers "A confirmation has been sent to your email
     address if a matching account was found. Please follow the
     instructions in the email to reset your password." with a "Login"
     link back.
   - **The account's address**: press "Login", then "Forgot your
     password?" again, type the account's email address and submit: the
     same answer; the email "Password Reset Confirmation" arrives in the
     account's mailbox, sent from the site's contact address, and nothing
     arrives for nobody@mail.test (Rule 7).
   - **"Reset Password"**: open the email and follow its link: on "Reset
     Password", type Recovered1 in "New password" and "Repeat new
     password" and save: the page answers "Password has been updated
     successfully. Please login with updated password." with a "Login"
     link, and you are still signed out.
   - **The second browser**: in the second browser, open My Submissions:
     the Login page shows instead; that session ended when the new
     password was saved (Rule 9).
   - **The new password**: press "Login" and sign in with Recovered1: it
     works; the browser lands signed in, where an ordinary sign-in would
     (Rule 3).
   - **Login As by address, as an Author**: open the Reader's Login As
     address: the access-denied page answers "The current role does not
     have access to this operation." and nothing of the refused screen
     renders (Rule 17).
   - **The same address, signed out**: press "Logout" in the user menu
     and open the address again: the Login page shows instead (Rule 17).
   - **Control**: on that Login page the old password now fails with
     "Invalid username/email or password. Please try again.".

5. **A stale or altered reset link is refused**

   Given: the same Author, signed in with the new password after
   scenario 4, with the emailed link still at hand. <sup>s</sup>

   - **The link while signed in**: open the emailed link: the browser is
     sent to the Author's home instead of the form (Rule 1).
   - **The link after the change**: press "Logout" in the user menu and
     open the emailed link again, the password having been changed and the
     account signed in since: the page answers "Sorry, the link you clicked
     on has expired or is not valid. Please try resetting your password
     again." with a "Reset Password" link back to the lost-password form.
   - **A mangled code**: open the link with its code mangled: the same
     answer.
   - **Control**: a link from a fresh "Forgot your password?" request for
     the same address opens the "Reset Password" form (Rule 9); the
     refusal is the stale link's own.

6. **Forced password change at first sign-in** {OJS OMP}

   Given: Editor, on a scratch journal with a submission in review.
   <sup>s</sup>

   - **"Create New Reviewer"**: on the submission's review stage, in the
     "Add Reviewer" window choose "Create New Reviewer" and create a
     reviewer with the throwaway address nova.reviewer@mail.test and the
     username nova.
   - **The registration email**: the registration email delivers a
     username and a generated password.
   - **Signing in with them**: on the Login page sign in with them:
     instead of landing anywhere, the "Change Password" form appears.
   - **"Change Password"**: type the emailed password in "Current
     password" and Changed1 in "New password" and "Repeat new password",
     then press "OK": the reviewer is signed in and lands on the Dashboard,
     the landing their reviewer role earns (Rule 3).
   - **Control**: signing in again with Changed1 is normal: the browser
     lands on the Dashboard with no "Change Password" form.

   A preprint server has no review stage and so no "Create New Reviewer":
   no OPS analogue. There the Site Administrator's "Add User" and "Edit
   User" flag an account (Rule 11a); the "Add User" path, with its first sign-in, is scenario 7 of
   [Users management](U53-users-management.md), on all three apps.

7. **Administrator impersonates a user and returns**

   Given: Site Administrator, signed in on the seeded journal. <sup>s</sup>

   - **The user menu before impersonating**: open the top-right user menu
     (the initials button): it offers "Logout"; copy the link behind that
     entry, because the menu no longer offers it while impersonating
     (Rule 15).
   - **The administrator's own row**: on Users & Roles, open the
     administrator's own row menu: it offers no "Login As" (Rule 14).
   - **"Login As" on an Author's row**: open an Author's row menu and
     choose "Login As": a dialog warns "Log in as this user? All actions
     you perform will be attributed to this user." with OK and Cancel.
   - **Cancel**: press Cancel: the dialog closes and the browser is still
     the administrator's own session; the user menu holds no "You are
     currently logged in as" line (Rule 13).
   - **OK**: choose "Login As" again and press OK: the browser is now that
     Author's session: their name, their My Submissions. The top bar shows
     the administrator's initials with the Author's overlaid in a warning
     color, and the user menu reads "You are currently logged in as
     {author}"; it offers no plain "Logout", only "Logout as {author}"
     (Rule 6).
   - **"Logout as {author}"**: choose "Logout as {author}": the
     administrator is back in their own session, with no password asked.
   - **Control**: impersonate the Author again the same way and type the
     copied sign-out address instead: the Login page shows, the browser
     signed out of both identities and not back in the administrator's
     account; opening Users & Roles now shows the Login page too
     (Rules 4, 15).

8. **Editor impersonates a participant from the Participants panel**

   Given: Editor, on a submission's workflow on the seeded journal with a
   Section Editor assigned as participant and an Author, the submission in
   review with a Reviewer who accepted the request {OJS OMP}; a throwaway
   account holding a role only on a scratch journal, for the Journal
   Manager's case. <sup>i</sup> <sup>s</sup>

   - **"Login As" on the Section Editor's row**: on the Participants
     panel, the Editor's own row offers no "Login As" (Rule 14); open a
     Section Editor participant's row menu, choose "Login As", and
     confirm: the browser lands on the same submission as that
     participant, and the top of the Participants panel now offers "Logout
     as {the participant's full name}" (Rule 13).
   - **"Logout as {the participant's full name}"**: press it to return to
     the editor's view of the same submission.
   - **The Author's row**: impersonating the submission's Author instead
     lands on the author's own My Submissions view, which shows no
     Participants panel. The way back is then the user menu's "Logout as
     {author}" entry.
   - **The Reviewers table** {OJS OMP}: on the submission's review stage,
     the Reviewer's row menu in the Reviewers table offers "Login As"; a
     preprint server has no Reviewers table.
   - **Journal Manager, a hand-built address to an out-of-reach user**:
     Journal Manager: on Users & Roles, choose "Login As" on the Author's
     row and press OK, copy the address the browser visited from its
     history (it ends in a number identifying that user), choose "Logout
     as {author}", then open that address with the number changed to the
     one identifying the scratch journal's account: the page answers
     "Sorry, you do not have administrative rights over this user…",
     listing the possible causes, with a link back to the users list
     (Rule 14).
   - **Control**: opened with the copied number, the Author's own, the
     same address impersonates the Author again, and "Logout as {author}"
     returns the Journal Manager (Rule 14); the refusal is the
     out-of-reach account's alone.

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a 40-character password chosen while accepting a role invitation,
    then the Login page's "Password" box taking all 40 and signing in
    ([A1](#a1)): the guard the issue report
    (`docs/issues/U03-A7-password-boxes-keep-32-characters.md`)
    proposes, once fixed
  - the Login page's "Keep me logged in" arriving unticked, and after
    a refused sign-in showing as the user left it, unticked or ticked
    ([A2](#a2)): the guard the issue report
    (`docs/issues/U01-A2-keep-me-logged-in-always-ticked.md`) proposes,
    once fixed
  - the browser tab after a refused "OK" on "Change Password" and a
    refused "Save" on "Reset Password" still naming the page, and the
    reset form keeping its "Reset Password" heading ([A11](#a11)): the
    guard the issue report
    (`docs/issues/U01-A11-refused-password-form-tab-loses-name.md`)
    proposes, once fixed
  - after a "Login As", no row of Users & Roles, the Participants panel
    or the Reviewers table offering "Login As", and "Logout as" bringing
    back the operator's own account ([A4](#a4)): the guard the issue
    report (`docs/issues/U01-A4-second-login-as-strands-operator.md`)
    proposes, once fixed
  - signed out, the Dashboard address ending at the word "dashboard"
    opening the Login page, and signing in there leading to the
    Dashboard ([A7](#a7)): the guard the issue report
    (`docs/issues/U01-A7-dashboard-address-signed-out-server-error.md`)
    proposes, once fixed
  - a user signed in with "Keep me logged in" and back after the idle
    limit opening the Dashboard signed in, seeing their name, not
    "Register" and "Login", in the public header, and "Login As"
    impersonating (Rules 5a, 14; [A8](#a8)): the guard the issue report
    (`docs/issues/U01-A8-login-as-after-idle-limit-server-error.md`)
    proposes, once fixed
  - the Site Administrator's "Edit User" on a flagged account opening
    with "Change Password" ticked, and an unchanged "OK" keeping the
    flag ([A10](#a10)): the guard the issue report
    (`docs/issues/U01-A10-edit-user-hides-clears-change-password.md`)
    proposes, once fixed
- **Rarely met**:
  - a forced change ending the account's other sessions, and flagging alone leaving them signed in (Rule 11): it needs the Site Administrator's "Edit User" (Rule 11a) on an account already signed in elsewhere
- **Nothing new to test**:
  - a wrong or unknown username getting the same sentence (Rule 2; scenario 1's wrong password)
  - roles held only in other journals landing on the journal home page (Rule 3; scenario 1's Reader)
  - a Production editor offered "Login As" (Actors row "Impersonate a user"; Rule 14): the same offer as scenario 8's Editor
  - a held address the user's roles do not allow ending on the access-denied page after sign-in (Rule 4): the page scenario 4 reads (Rule 17)
- **Register carries it**:
  - A5 (no journal-level users screen offering the forced-change flag; Rule 11a)
  - A12 (the next correct sign-in after a disabled account's refusal landing back on the Login page; Rule 2)
- **No seed**:
  - a disabled account refused, with or without a reason (Rule 2)
  - the Site Administrator passing Confirm Access (Actors row "Pass the Confirm Access gate"): what is missing is a per-context way to set the re-authentication window; the configuration file's `password_timeout` is run-global
  - Confirm Access's window lapse, no replay, and the direct address going home (Rule 16): the same missing window setting
  - other Site Administrators never offered Login As (Rule 14): what is missing is a second site administrator
  - "Keep me logged in" extending past the idle limit (Rule 5, `remember_me_lifetime`)
  - the reset link expiring on the clock (Rule 8, `reset_seconds`)
  - a link whose username no longer exists landing on the lost-password page (Rule 10)
  - a session ending on a network-address change (Rule 18, `session_check_ip`)
  - the password policy: minimum length, compromised check (Settings)
  - rate limiting on: refusals during the cool-down, A6 (Settings)
  - a session ending at browser close (Settings, `session_expire_on_close`)
  - forced https for login or the site (Settings, `force_login_ssl`, `force_ssl`)
  - the idle session lifetime (Settings, `session_lifetime`)
- **Owned by another feature**:
  - the Site Administrator's "Add User" flagging a new account, whose first sign-in diverts to "Change Password" (Rule 11a; *[Users management](U53-users-management.md)*, scenario 7)
  - the "Expire User Sessions" tool ending every session (Rule 18; *System administration & jobs*)
  - an action taken while impersonating carrying the target's name, and its activity-log line "{impersonator} (acting as {target})" (Side effects): no action of this feature writes a log entry; the actions belong to the workflow stages and the log screen to *Submission activity log & notes*
  - spam checks on login and lost-password (Settings; *Registration & account validation*)
  - registration disabled removing the Register links (Settings; *Roles configuration*)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-01), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The password boxes stop accepting input at 32 characters, so longer passwords cannot be typed | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A2](#a2) | "Keep me logged in" is ticked every time the Login page shows, even after the user unticked it | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | The set-a-new-password page's browser tab shows a raw internal code instead of a title | 🐞 | minor | Jarda 2026-08-25 |
| [A4](#a4) | While signed in as another user, "Login As" is still offered, and using it strands the operator in that account | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | Signed out, the Dashboard address the monthly reminder email links to gives an empty error page | 🐞 | medium · crash: server | issues (claude), 2026-10-04 — re-verified |
| [A8](#a8) | Kept logged in past the idle limit, users look signed out on the public site and "Login As" gives a blank page | 🐞 | medium · crash: server | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | The Site Administrator's "Edit User" never shows "Change Password" ticked, and saving it removes the flag | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A11](#a11) | After a refused "Change Password" or "Reset Password", the browser tab loses the page's name | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A12](#a12) | After a disabled account is refused, the browser's next correct sign-in lands back on the Login page with no message; after that account's second refusal, the next correct one reads "Invalid username/email or password" | 🐞 | minor | — |
| [A13](#a13) | With re-authentication on, the Site Administrator's session adds and deletes journals and saves Site Settings without Confirm Access; only opening Administration's screens asks | 🐞 | user-visible | — |
| [A5](#a5) | No journal-level users screen offers the "must change password" box, so a Journal Manager cannot require a forced change on an existing account; only the Site Administrator's Hosted Journals list offers it | ❓ | user-visible | Jarda 2026-08-25 · to triage |
| [A9](#a9) | The last-login date is recorded on every sign-in, but no users screen shows it, so a manager cannot see when an account last signed in | ❓ | minor | — |
| [A6](#a6) | With rate limiting on, even the correct password is refused as "Invalid username/email or password" during the cool-down; the concealment is intended | ✅ | latent | Jarda 2026-08-25 |

### All apps

<a id="a1"></a>
**A1 — Password boxes cut off at 32 characters** · 🐞 · medium.
The password boxes on the Login page, the reset form, the forced
"Change Password" form and "Confirm Access" stop taking characters
after the 32nd, without a word; only the role-invitation wizard takes
the whole password. A newcomer who chooses a longer password while
accepting an invitation gets an account they cannot sign in to: the
Login page sends only the first 32 characters, and the answer is
"Invalid username/email or password. Please try again." "Forgot your
password?" is the way back in, since the reset form shortens the new
password the same way. Everywhere else a longer password is shortened
both when it is set and when it is entered, so sign-in works, but
nobody can have a password longer than 32 characters.
Basis: probe, 2026-10-03. <sup>[f-a1](#fn-a1)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞. Ruling: raise the
> maximum accepted password length to at least 64 characters (OWASP Password
> Storage guidance; bcrypt reads only a password's first 72 bytes, so 64 is a
> safe, meaningful step up from 32).

<a id="a2"></a>
**A2 — "Keep me logged in" is ticked every time the Login page shows, even after the user unticked it** · 🐞 · medium.
The Login page shows "Keep me logged in" already ticked, though the
label offers it as a choice, so every user who does not notice the box
and untick it is kept signed in. The same fault ticks the box again
when the page shows the form after a wrong password: a user who
unticked it, mistyped the password and signed in on the next try is
kept signed in anyway, without being told.

Unticked, a sign-in ends after a week without a visit. Kept signed in,
the browser stays signed in to the account for 30 days from the sign-in,
visited or not; 30 is the default of a setting in the installation's
configuration. On a shared computer the account stays open to the next
person who uses that browser.
Since: 2015-08-07 (pkp/pkp-lib#658) · Basis: probe, 2026-10-04. <sup>[f-a2](#fn-a2)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞 — unintended
> behaviour (the malformed attribute), and persistent sessions should be
> opt-in per OWASP session-management guidance, not opt-out. Fix: the box
> arrives unticked.

<a id="a3"></a>
**A3 — Raw code in the reset page's browser tab** · 🐞 · minor.
The set-a-new-password page (the emailed reset link's destination) is headed
"Reset Password", but the browser tab reads "user.login.resetPassword", an
internal code shown where the page title belongs.
Basis: observed on a running site. <sup>[f-a3](#fn-a3)</sup>
Tracked as
[pkp/pkp-lib#13132](https://github.com/pkp/pkp-lib/issues/13132) (open as of
2026-08-25; also notes the same symptom on Administration → Jobs).

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞. Fix: resolve the
> tab title to the translated "Reset Password" string. Already reported as
> pkp/pkp-lib#13132.

<a id="a4"></a>
**A4 — While signed in as another user, "Login As" is still offered, and using it strands the operator in that account** · 🐞 · low.
An administrator or manager who has used "Login As" to act as an editor
or manager is still offered "Login As" on other people's rows: in
Settings › Users & Roles, the workflow's Participants panel and the
Reviewers table. Choosing it replaces the first "Login As" instead of
adding to it. So "Logout as" returns to the account the operator had
taken over, not to their own, and leaves that account plainly signed
in, with no way back offered.

The operator can see whose account they are in and gains no rights. To
get back, they sign out and sign in again with their own password.

It happens only when the account taken over may use "Login As" itself,
such as a Journal editor's or a Journal manager's.
Since: 2025-02-03 (pkp/pkp-lib#10477) · Basis: probe, 2026-10-04. <sup>[f-a4](#fn-a4)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞 (upgraded from an
> open question). The legacy grids' guard is the intended behavior; the
> current screens must not offer "Login As" while an impersonation is
> active. Fix recommendation: enforce it server-side in the computed
> "can log in as" property so every screen inherits the rule at once.

<a id="a5"></a>
**A5 — No journal-level screen sets the "must change password" flag** · ❓ · user-visible.
The forced-change flow (Rule 11) is fully functional, but a journal's own
users screen does not offer the flag that triggers it. On Settings › Users
& Roles, a user row's "Edit" opens an invite-style page with no password
control. Only the Site Administrator's older users list in Administration ›
Hosted Journals offers the box, on "Add User" and "Edit User" (Rule 11a)
[A10](#a10); the review stage's "Create New Reviewer" {OJS OMP} flags only
the account it creates. So a Journal Manager cannot require a password
change on an existing account; only the Site Administrator can. In OJS 3.4
the journal's own users list's Edit User form offered exactly this
checkbox on existing accounts. The capability left the journal's screen
when that form was replaced by the invitation wizard.
Question: bring the capability back to a journal's own users screen (and
which one), or leave it to the Site Administrator deliberately? Lean: none
recorded. The loss is verified fact; the restoration is a product call.
Basis: observed on a running site + 3.4 code comparison.
<sup>[f-a5](#fn-a5)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: ❓ stands. Verified against
> 3.4: the Edit User form carried the "must change password" checkbox for
> existing accounts, so the capability loss is real — but whether to
> restore it is a product decision. Disposition: **to triage** with the
> team.

<a id="a6"></a>
**A6 — Lockout tells a correctly-authenticating user their password is wrong** · ✅ · latent.
With sign-in rate limiting enabled, exceeding the attempt limit changes
nothing on screen but a short delay. Inside the cool-down even the correct
password answers "Invalid username/email or password. Please try again."
This is deliberate design, not an oversight. The limiting stays invisible so
an attacker can never tell throttling from a wrong guess. The accepted cost
is that the account's real owner, mid-cool-down, briefly gets a message that
is untrue for them. The window clears itself within the cool-down, 5 minutes
by default.
Basis: observed on a running site + upstream design record.
<sup>[f-a6](#fn-a6)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: ✅ intended (was ❓). The
> concealment is the feature's documented design — see the introducing
> upstream issue (pkp/pkp-lib#12162, 2026-02); the brief mislead of the
> genuine owner is the accepted cost.

<a id="a7"></a>
**A7 — Signed out, the Dashboard address the monthly reminder email links to gives an empty error page** · 🐞 · medium · crash: server.
The server fails when a signed-out visitor opens the Dashboard address
that ends at the word "dashboard"
(`…/index.php/publicknowledge/en/dashboard`). The visitor gets an empty
error page instead of the Login page. Longer Dashboard addresses, such as
`…/dashboard/editorial`, open the Login page and return there after
signing in.

That address is the "submission dashboard" link in the monthly
"Outstanding editorial tasks" email to managers and section editors. A
bookmark or a typed address cut short at "dashboard" leads there too.
Since: 2025-01-14 (pkp/pkp-lib#10782) · Basis: probe, 2026-10-04. <sup>[f-a7](#fn-a7)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞. Ruling: signed
> out, the bare dashboard address must behave like every other private
> address — redirect to the Login page (destination preserved); choosing
> which dashboard variant to land on happens after the successful sign-in,
> as it already does for every other route.

<a id="a8"></a>
**A8 — Kept logged in past the idle limit, users look signed out on the public site and "Login As" gives a blank page** · 🐞 · medium · crash: server.
A user who signed in with "Keep me logged in" and comes back after the
idle limit (seven days without a visit, by default) is still signed
in to the dashboard and the other editorial pages. But the journal's
public pages offer "Register" and "Login" as if they were signed out,
and the Login page shows its form instead of taking them to the
dashboard. For a manager it goes further: "Login As" on a user fails on
the server, and the browser shows a blank page.

Signing in again, on that Login page or after signing out, clears both.
Until then nothing tells the user why the site treats them as signed
out, or why "Login As" shows nothing.

"Keep me logged in" is ticked when the Login page opens, so every user
who signs in the default way and is away a week meets this. The public
pages and "Login As" fail for one reason, so this report covers and
rates both, and its fix clears both.
Since: 2024-04-17 (pkp/pkp-lib#9596) · Basis: probe, 2026-10-04. <sup>[f-a8](#fn-a8)</sup>

> **Reviewed — Jarda Kotěšovec, 2026-08-25**: confirmed 🐞 (filed on
> review). Ruling: a session whose user cannot be resolved is treated like
> a signed-out visitor — redirect to Login, never a crash. Same family as
> the bare-dashboard error (A7): both are missing signed-out guards on
> older page routes.

<a id="a9"></a>
**A9 — The last-login date has no screen** · ❓ · minor.
Every sign-in records the account's last-login date, but no users screen
shows it: the Users & Roles list's columns are "Name", "Email", "Roles",
"Start Date" (the role's start), "Affiliation" and "More Actions", and a
row's "Edit" page shows each role's start and end dates only. A Journal
Manager who wants to know when an account last signed in has nowhere to
look.
Question: where does the product mean to show the date (a Users & Roles
column, the row's "Edit" page), or is it kept only so that a sign-in kills
an outstanding reset link (Rule 8)? Lean: show it on the Users & Roles
list, where a manager looks for an account; that screen belongs to *Users
management*, so the ruling is that feature's.
Since: 2026-09-13 · Basis: test run. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — The Site Administrator's "Edit User" never shows "Change Password" ticked, and saving it removes the flag** · 🐞 · medium.
The Site Administrator can require a user to choose a new password at
their next sign-in by ticking "Change Password" in the user's "Edit
User" window (Administration › Hosted Journals › a journal's "Settings
wizard" › "Users"). The box always opens unticked, even on an account
that is already flagged.

Pressing "OK" with the box left as it opened removes the flag, and
nothing says so: the user's next sign-in goes straight in, with no
"Change Password". So any later edit of a flagged account (a new email
address, a corrected name) undoes the requirement.
Since: 2013-02-14 (13 years) · Basis: probe, 2026-10-04. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — After a refused "Change Password" or "Reset Password", the browser tab loses the page's name** · 🐞 · low.
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
Since: 2020-05-13 (pkp/pkp-lib#5866) · Basis: probe, 2026-10-04. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — After a disabled account is refused, the next correct sign-in in that browser fails** · 🐞 · minor.
In one browser, on a journal's Login page, each account with its correct
password:
1. A disabled account signs in: refused with its message (Rule 2).
2. An enabled account signs in: back on the Login page with no message and
   "Username or Email" empty, instead of landing where Rule 3 says.
3. The disabled account again: the same refusal.
4. The enabled account again: refused with "Invalid username/email or
   password. Please try again."
5. The enabled account again: it lands.

Without step 3, step 4 lands. Steps 1 and 2 go the same on the site-level
Login page. The user is given no reason and may well conclude that their
own password is wrong. After a wrong-password or unknown-username refusal,
the next correct sign-in lands at once.
Basis: probe. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — With re-authentication on, Administration's changes go through without Confirm Access** · 🐞 · user-visible.
The configured gate (Rule 16) is meant to make the Site Administrator
re-enter the password before working in Administration. It asks only when
an Administration screen opens or one of its page buttons reloads it. In a
session that never confirmed, or whose window lapsed, an Administration tab
left open still adds and deletes journals in Hosted Journals, saves Site
Settings, manages its Languages and Plugins, and retries or deletes failed
jobs, with no password asked. Someone at an unattended administrator's
browser can delete a journal without knowing the password.
Since: 2026-04-09 (pkp/pkp-lib#12338) · Basis: probe, 2026-09-30. <sup>[f-a13](#fn-a13)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Login page: `PKP\pages\login\LoginHandler` (`index`/`signIn` ops)
rendering `lib/pkp/templates/frontend/pages/userLogin.tpl`; ops `index`,
`signIn`, `signOut`, `lostPassword`, `requestResetPassword`, `resetPassword`,
`updateResetPassword`, `changePassword`, `savePassword`, `signInAsUser`,
`signOutAsUser`. **Chain check**: no `pages/login/` directory exists in
ojs, omp or ops — the handler and all its templates are fully shared
(positive evidence). Generic error `user.login.loginError`; disabled
messages `user.login.accountDisabled(WithReason)` — the reason is whatever
staff typed when disabling. Signed-in visitors: `Validation::isLoggedIn()` →
`sendHome()`. Live-probed 2026-07-31 (OJS deep; OMP/OPS spot): failure
message, sign-in and landings as stated; an empty required box is stopped by
the browser's own fill-this-field prompt before anything is sent. Captcha:
reCAPTCHA on login when `[captcha] recaptcha` + `captcha_on_login` (not
live-driven); ALTCHA per `altcha` + `altcha_on_login` /
`altcha_on_lost_password` (`FormValidatorReCaptcha` / `FormValidatorAltcha`)
— live-probed 2026-08-01 (OJS): the ALTCHA widget stays invisible and solves
itself at submit, so sign-in simply works; only a JavaScript-less submission
is refused, with the error quoted in Fields. Register link:
`{if !$disableUserReg}` in `userLogin.tpl` / `userLostPassword.tpl` —
live-probed 2026-07-31 on scratch contexts (OJS + OPS) and 2026-08-01
(OMP scratch press): disabling registration removes the link from both
pages, and the typed register address answers "This journal is currently
not accepting user registrations." (app-localized journal/press/server
wording) — all three apps observed. Disabled accounts live-probed
2026-09-29 (Rule 2; OJS, OMP, OPS; two runs each; scratch contexts; one
Author disabled with no reason, another through Settings › Users & Roles
› the row's "Disable User" with a typed reason): both messages verbatim
on the journal's and the site-level Login pages, the refused form keeping
the typed username; a disabled account's wrong password answers the
generic `user.login.loginError`. The next sign-in in the same browser:
finding A12 (note f-a12).

<a id="fn-b"></a>
**b** — Landing: `LoginHandler::_redirectAfterLogin()` — with a context and
no `source`, any of admin/manager/sub-editor/author/reviewer/assistant roles
**held in that context** → `dashboard`; else `PKPPageRouter::getHomeUrl()`
(no context → site index; reader-only or no groups in the context → journal
index). Landing corrections live-probed 2026-08-01 (OJS, two-journal site):
a user whose roles all sit in another journal lands on the signed-into
journal's home page, and site-level sign-in lands on the site index even
for role-holders. The signed-in bounce (Rule 1) also covers the emailed
reset-link address — live-probed 2026-08-01 (all three apps): a signed-in
user opening it is sent home, never shown the reset form or the dead-link
page. Interrupted visit:
`Validation::redirectLogin()` appends `source` = the requested address, and
`signIn` redirects to any `source` that is a relative path; `loginMessage`
renders above the form. Last-login: `Validation::registerUserSession()` sets
`dateLastLogin`. Live-probed 2026-07-31 (all three apps): role-based
landings, the signed-in bounce off Login and lost-password, and the
interrupted visit — a held workflow address shows the plain Login page (no
visible mention of the pending destination) and continues to that
submission after sign-in. No screen shows the last-login date: test run
2026-09-13, finding A9 (note f-a9). Live-probed 2026-09-28 (OJS, OMP,
OPS; two runs each; `reader.rosa` and a scratch Reader): the Reader
signing in at the journal's own Login page, opened directly, lands on the
journal's `index` page ("Journal of Public Knowledge", "Public Knowledge
Press", "Public Knowledge Preprint Server"), also after a reload and right
after a manager's sign-in in the same browser; at the site-level Login, on
the site's `index`. A private address typed signed out
(`publicknowledge/manageCatalog` on OMP, `…/management/settings/context`
on OJS and OPS) gives the plain Login page with `source`, and the Reader's
sign-in then lands on `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
(Rule 4's held address meeting Rule 17).

<a id="fn-c"></a>
**c** — Remember: `Validation::login(..., $remember)` → Laravel
`Auth::attempt($credentials, $remember)`; recaller-cookie lifetime
`[security] remember_me_lifetime` (days, default 30, absolute from login —
`PKPContainer` session config); idle lifetime `[general] session_lifetime`
(days, default 7); `[security] session_expire_on_close` empties the cookie
lifetime. Checkbox markup: `userLogin.tpl` `input#remember` (finding A2).
Live-probed 2026-08-01 (OJS): signed in with the box unticked, the sign-in
cookie carries a dated expiry equal to the install's idle lifetime (30 days
under the test configuration's `session_lifetime`), not a browser-session
expiry — so it survives browser close; ticked, a separate `remember_web_*`
cookie (30 days) appears alongside the same session cookie. With
`session_expire_on_close` unset (the default), nothing ends at browser close
in either case — the earlier gloss "extends the session past closing the
browser" was wrong and is corrected as of this probe. Live-probed
2026-10-04 (Rule 5a; OJS, OMP, OPS on `main`, and on `stable-3_5_0`; PKP's default
test dataset, the manager `rvaca` signed in with "Keep me logged in" left
ticked as the page shows it; kept script
`shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js`):
the idle limit stood in for by moving every session's last activity back
eight days, Settings › Users & Roles still opened signed in, the journal's
home page header ended "Search Register Login" and the Login page showed
its "Username or Email" and "Password" form; after signing out and in
again, both were back to normal. With the box unticked, the same lapse
signs the user out entirely (Users & Roles → the Login page). Cause: the
remember cookie restores the user without the session's own user id
(finding A8, note f-a8).

<a id="fn-d"></a>
**d** — `LoginHandler::signOut()` → `Validation::logout()`: invalidates the
session, then stores the departed user's username and email in the fresh
anonymous session; `LoginHandler::index()` prefills the form from those
values — live-probed 2026-07-31 (OJS, OMP) and 2026-08-01 (OPS): the box
shows the account's email address, even when sign-in had used the
username. The ends-only-this-browser clause driven live 2026-08-01 (OJS,
two browser contexts): signing out in one left the other's session of the
same account signed in. Redirect: back to the `login` page. Menu wiring:
`TopNavActions.vue` + `useUserAuth.getLogoutUrl()` — impersonating, the menu
link becomes `login/signOutAsUser` labeled `user.logOutAs` (Rule 15); there
is no second, plain-logout entry while impersonating.

<a id="fn-e"></a>
**e** — `LoginHandler::lostPassword()` / `requestResetPassword()`:
confirmation `user.login.lostPassword.confirmationSent` on the generic
message page with back-link "Login"; mail sent via
`PKP\mail\mailables\PasswordResetRequested` (template key
`PASSWORD_RESET_CONFIRM`, from the site's contact, variable
`passwordResetUrl`; observed subject "Password Reset Confirmation").
Live-probed 2026-07-31: the confirmation sentence is identical whether or
not the address matches an account; delivery confirmed in all three apps. **Chain check**: the OPS `classes/mail/Repository::map()`
override (which omits some base mailables) *includes*
`PasswordResetRequested`, and all three apps seed the
`PASSWORD_RESET_CONFIRM` template in `registry/emailTemplates.xml` — no
app-side divergence. Rate limiting: `PKP\security\RateLimitingService`,
keyed IP+identifier, enabled by the site setting (note n), generic-response
by design.

<a id="fn-f"></a>
**f** — Link: `login/resetPassword/{username}?confirm={hash:expiry}` built
by the `PasswordResetUrl` mail trait;
`Validation::generatePasswordResetHash()` — HMAC over username + password
hash + last-login + expiry with `[security] salt`, expiry = now +
`reset_seconds` (default 7200). Any of password change or a new sign-in
changes the inputs, killing outstanding links (Rule 8). Form:
`PKP\user\form\ResetPasswordForm` (`user/userPasswordReset.tpl`, fields
"New password"/"Repeat new password", `FormValidatorPassword` = min length +
match + Laravel `uncompromised()` when the site setting is on). Invalid hash
→ `displayInvalidHashErrorMessage()` (`user.login.lostPassword.invalidHash`);
unknown username → redirect to `lostPassword`. Success message
`user.login.resetPassword.passwordUpdated`; `Auth::logoutOtherDevices()`
ends the account's other sessions; no session is created for the resetter.
Live-probed 2026-07-31: tampered, expired and already-used links all answer
the invalid-link page; an unknown-username link lands on the lost-password
form; saving leaves the user signed out and the new password works
(default-install hint under the field: "The password must be at least 6
characters."). Browser-tab title defect on this form: finding A3.

<a id="fn-g"></a>
**g** — Flag: `user.mustChangePassword`. Set on screen by the Site
Administrator's Hosted Journals wizard › "Users" (legacy `UserGridHandler`
→ `PKP\controllers\grid\settings\user\form\UserDetailsForm`,
`common/userDetails.tpl`, labels `grid.user.mustChangePassword` /
`grid.user.mustChangePasswordDescription`; the wizard is an
Administration page, so the role gate refuses a Journal Manager) and by
the review stage's Create New Reviewer form (`CreateReviewerForm`), which
sets it on the account it creates and emails a generated password; the
journal's Users & Roles "Edit" page carries no password control (finding
A5). Read in the code, not driven: the Users XML import
(`UserXmlPKPUserFilter`) also flags the accounts it creates (a
`must_change="true"` password, or a password hash it has to replace),
never an existing account. `LoginHandler::signIn()` — a flagged user's
successful credential check immediately logs the fresh session out again and redirects
to `changePassword/{username}`; `PKP\user\form\LoginChangePasswordForm`
(`user/loginChangePassword.tpl`, instructions
`user.login.changePasswordInstructions`; checks: current password via
`Validation::checkCredentials()`, min length, match); `savePassword` clears
the flag, calls `Auth::logoutOtherDevices()`, signs the user in
(`Validation::login`) and `sendHome()`s them. Live-probed 2026-07-31 (OJS;
OMP byte-identical): the divert, the wrong-current-password error verbatim,
sign-in on completion (a reviewer lands on their reviewer dashboard) and a
normal next sign-in; the submit button is labeled "OK". Live-probed
2026-09-28 (OJS, OMP, OPS; two runs each; scratch contexts, `admin`
signed in; Rules 11, 11a): the wizard's "Users" tab offers "Search" and
"Add User", its rows "Email", "Edit User", "Disable User", "Remove",
"Login As", "Merge User". An account added with the box left ticked, and
an existing account ticked on "Edit User" and saved with "OK", both divert
at their next sign-in at the journal's Login page to
`login/changePassword/{username}` ("Change Password", "You must choose a
new password before you can log in to this site. Please enter your
username and your current and new passwords below…"); a wrong current
password answers "Errors occurred processing this form: The current
password you entered was incorrect." at `login/savePassword#formErrors`;
completing lands on the author's My Submissions, as does the next
sign-in with the new password; an account added with the box unticked
lands on My Submissions at once. "Cancel" after ticking closes the window
with no question. Other sessions: the account signed in in a second
browser before the flag stayed signed in after the flag alone (My
Submissions), and its next page after the change was completed in a
third browser was the Login page, where signing in again worked. The
Users & Roles row's "Edit" (`management/settings/user/{id}`, "Invite user
to take a role") shows no password control and no mention of one, opened
by `admin` or by the scratch Journal Manager; the manager typing the
wizard's address (`index/admin/wizard/{id}`) gets the site-level
access-denied page. Every wizard load also answered a server error on the
Plugin Gallery's list (`plugin-gallery-grid/fetch-grid`, 500), which is
[Plugins management's A1](U62-plugins-management.md#a1); the users flow
itself was unaffected.

<a id="fn-h"></a>
**h** — Ops `signInAsUser/{userId}` and `signOutAsUser`
(`LoginHandler::authorize()`: `RoleBasedHandlerOperationPolicy` — Manager or
Site Administrator — for `signInAsUser`). Reach test:
`Validation::getAdministrationLevel(target, current)` must be
`ADMINISTRATION_FULL` — target is a site admin → PROHIBITED for everyone;
current is site admin → FULL; else current needs the Manager role and the
target's every group must sit in the manager's managed contexts (a
cross-context holding → PARTIAL/PROHIBITED). Denial page: error template
with `manager.people.noAdministrativeRights` (bullet list of causes),
back-link to `management/settings/access`. Self-impersonation is refused in
both the guards and the handler. Session switch:
`PKPSessionGuard::signInAs()` — stores the original user id as
`signedInAs`, migrates the session to the target, and stops any elevated
(Confirm Access) window; `signOutAs()` restores. Live-probed 2026-07-31
(row menus identical in all three apps): Login As present on an author's
row for the administrator and the manager, absent on one's own row and —
for the manager — on a Site Administrator's row; the cross-journal case
hides the row action, and the typed address answers the denial page, whose
back link is labeled "All Enrolled Users". The Manager role behind the
policy and the reach test (`ROLE_ID_MANAGER`) is the one the Journal
Manager, Editor (`editor.diana`, scenario 8's actor) and Production editor
groups carry in OJS's and OMP's `registry/userGroups.xml`; OPS's registers
only its manager with it.
Live-probed 2026-09-28 (OJS, OMP; two runs each; scratch context): a
Production editor participant is offered "Login As" on the Author's and
the Section editor's Participants-panel rows (menu "Edit", "Notify",
"Login As", "Remove"), the confirmation reads as in Rule 12, and OK
impersonates; OPS seeds neither group, and its Preprint Server Manager and
`admin` get the same.

<a id="fn-i"></a>
**i** — Offering surfaces and their guards, all confirming with
`grid.user.confirmLogInAs` / title `grid.action.logInAs` ("Login As"):
(1) Users & Roles rows — `UserAccessManager` (`useUserAccessManagerConfig`:
offered when not the current user and the row's server-computed permission
allows; the server computes it per note h; no impersonation-active check —
finding A4); redirect `login/signInAsUser/{id}` with no return address, so
it lands per Rule 3.
(2) Workflow Participants panel rows — `ParticipantManager`
(`Actions.PARTICIPANT_LOGIN_AS`, guard `participant.canLoginAs`); redirects
into the same submission as the target (authors → the My Submissions
workflow view; editorial roles → the editorial one).
(3) Reviewers table rows {OJS OMP} — `ReviewerManager`
(`Actions.REVIEWER_LOGIN_AS`, guard `reviewAssignment.canLoginAs`); plain
redirect, landing per Rule 3. OPS ships no reviewer surface (no review
stage), so this offering simply does not exist there.
(4) Administration → Hosted Journals → journal settings → Users tab —
legacy `UserGridRow` LinkAction `logInAs`, guarded by the note-h reach test
**and** `!Validation::loggedInAs()`; mid-impersonation the grid itself is
unreachable (the impersonated non-administrator fails Administration's role
gate — live-probed 2026-07-31), so that extra guard is not observable on
screen (finding A4).
Live-probed 2026-07-31 across surfaces: the confirmation dialog is
verbatim-identical everywhere in all three apps; every Participants-panel
row but the viewer's own offers the action; the Reviewers table carries it
on OJS and OMP and does not exist on OPS (the Participants panel present
there as the positive control); the hosted-journals grid offers it on all
three. Impersonating the author lands on the author's own view, which
renders no Participants panel — that exit is the user menu (scenario 8).

<a id="fn-j"></a>
**j** — Indicators: `TopNavActions.vue` — the impersonator's own initials
as the muted base avatar with the target's `InitialsAvatar` overlaid
(`is-warnable`; DOM-verified 2026-08-01 against the component's bindings),
menu text
`manager.people.signedInAs` ("You are currently logged in as {$username}")
+ `user.logOutAs` ("Logout as {$username}"). Participants panel:
`ParticipantManager.vue` renders a warnable "Logout as" list entry when
`isUserLoggedInAs`; `useUserAuth.getLogoutAsUrl()` returns to the same
submission when a workflow page is open, else plain `signOutAsUser` →
home. Live-probed 2026-07-31: the menu shows the impersonated account's
username ("You are currently logged in as author.alex" / "Logout as
author.alex" while the administrator impersonated author.alex); the
Participants-panel entry shows the impersonated user's full name ("Logout
as Ravi Section Editor"); no plain Logout entry exists alongside. Typing
the plain sign-out address mid-impersonation ends the whole session — the
browser lands signed out on the Login page (Rule 15). Re-probed 2026-09-28
(OJS, OMP, OPS; two runs each; a scratch Production editor and `admin`,
on OPS the Preprint Server Manager and `admin`, on a scratch submission in
Production): wearing the Section editor, the panel's first entry is the
button "Logout as Sid Sectioned" (the full name) while the user menu reads
"Logout as {username}"; wearing the Author, the browser lands on
`dashboard/mySubmissions?workflowSubmissionId=…` (OPS on its Title &
Abstract entry) with no Participants panel, the menu reading "You are
currently logged in as {username}", "Logout as {username}", "Edit
Profile", "Logout as {username}". Both exits return to the impersonator's
view of the same submission, with a plain "Logout" in the menu again.

<a id="fn-k"></a>
**k** — Gate: `[security] password_timeout` (minutes; commented out/0 =
off) → `Validation::isReauthenticationRequired()`;
`ReauthenticationRequiredPolicy` is attached to **every** Administration
page op except the confirm pair (in `AdminHandler::authorize()` only; the
API and grid requests the screens send carry none, see
[f-a13](#fn-a13)), and redirects to `admin/confirmAccess` with the
interrupted address as `source` (POST-ish requests flagged
`isActionRequest`). Window: `PKPSessionGuard::isElevatedSessionActive()` —
a session timestamp younger than the window, refreshed on each
Administration page request while inside it; only site admins can hold it.
Form: `PKP\user\form\ConfirmPasswordForm` (`user/confirmPassword.tpl`,
heading `user.confirmAccess` "Confirm Access", description
`user.confirmAccess.description`); wrong password re-renders with
`user.login.loginError`. Submit: `AdminHandler::confirmAccessSubmit()` —
starts the window, redirects to `source` (relative paths only; foreign
hosts → home), and on `isActionRequest` raises the
`user.lastAction.incomplete` notice. No `source` → `redirectHome` before
the form is ever rendered; opening the bare address live-checked
2026-08-01 (window active — gate off, all three apps): a straight
redirect into Administration, no form shown. Cancel:
referer, but never an `/admin` address (loop guard) — falls back to the
site index. Impersonation: `signInAs()` calls `stopElevatedSession()`.
Live-probed 2026-08-01 (OJS deep; OMP gate + entry): the gate on entry,
Cancel leading out, the wrong-password generic error, entry on the correct
password, the re-prompt after idling past the window, and the interrupted
action — verified not executed — with the last-action notice on arrival;
the signed-in line shows the administrator's full name; a Journal Manager
typing Administration addresses gets the role denial, never the gate.
**Chain check**: no app has a `pages/admin/` directory —
`PKP\pages\admin\AdminHandler` is fully shared.

<a id="fn-l"></a>
**l** — `PKPUserHandler::authorizationDenied()` (redirect target of
`PKPPageRouter`'s denial path): signed out → `Validation::redirectLogin()`;
signed in → generic message page rendering the denial sentence (locale key
passed as `message`, sanitized to key characters). **Chain check**: each
app subclasses `PKP\pages\user\PKPUserHandler` as `APP\pages\user\UserHandler`
— OJS adds subscription/payment ops (owned by *Subscriptions & open access
control*), OMP adds nothing, OPS overrides only an incomplete-setup check;
none touches `authorizationDenied` or the ops in this spec. Live-probed
2026-07-31 (all three apps): the signed-in denial reads "The current role
does not have access to this operation."; signed out, the same address
shows the plain Login page and continues to the requested screen after
sign-in. The page's frame (`frontend/pages/message.tpl` with no
`pageTitle` assigned) is [Navigation menus & site chrome A3](U08-navigation-menus-and-site-chrome.md#a3):
live-probed 2026-10-03 on OJS, OMP and OPS `main` and `stable-3_5_0` (kept
script `shared/playwright/checks/issues/access-denied-page-no-heading/walk.js`),
and live-probed again 2026-10-02 on OJS `main` by an Author, a Reviewer and a
section editor typing the role-invitation address
`invitation/create/userRoleAssignment` (kept script
`shared/playwright/checks/U06/S02/s02.js`): an empty `h1`, the breadcrumb
"Home /", HTTP 200 after a redirect.

<a id="fn-m"></a>
**m** — `config.inc.php` `[security]`: `force_ssl`, `force_login_ssl`
(login pages redirect to https when set; `signIn` bounces back to http
after, when only login is forced), `session_check_ip` (default On —
`PKPAuthenticateSession` middleware compares the session's login IP each
request and logs out on mismatch), `encryption` (legacy hash migration —
old md5/sha1 hashes are transparently re-hashed on successful login),
`session_expire_on_close`, `remember_me_lifetime`, `salt`,
`api_key_secret` (API keys — *User profile*), `reset_seconds`,
`allowed_html`/`allowed_title_html` (near-infrastructure sanitizer lists),
`allow_plugin_install`/`plugin_gallery_urls` (consumed by *Plugins
management*), `password_timeout`. `[general] session_lifetime` = idle days.
Sessions live server-side in the database; the expire-sessions tool is
`AdminHandler::expireSessions()` (*System administration & jobs*).

<a id="fn-n"></a>
**n** — Administration → Site Settings security form
(`PKPSiteSecurityForm`): `minPasswordLength`,
`passwordUncompromisedEnabled` (Laravel `Password::uncompromised()` —
queries the external haveibeenpwned.com API; outbound HTTP fails fast at
the test config's dead-port `[proxy]`, so the check cannot pass in the
e2e env),
`rateLimitEnabled` + `rateLimitMaxAttempts` (default 5) +
`rateLimitDecaySeconds` (default 300) — read by `RateLimitingService`
(note e). The form itself is the *Site settings* feature's. On-screen
labels (probed 2026-08-01): group "Rate Limiting", checkbox "Enable rate
limiting", fields "Maximum attempts" (pre-filled 5) and "Lockout duration
(seconds)" (pre-filled 300). Correct-password refusal inside the
cool-down: finding A6.

<a id="fn-s"></a>
**s** — Scenario seeding: the seeded test journal/press/server
(`publicknowledge`) and roster accounts (passwords = username doubled;
`admin`/`admin`). Scenario 1 `editor.diana` (OPS enrols no Editor: the
Moderator `sectioneditor.ana` stands in), the Reader `reader.rosa`, and
`manager.maya` for the Users & Roles read (Settings › Users & Roles ›
Users of the seeded journal, the "Current Users" table searched by the
Editor's given name; no column carries `dateLastLogin`, finding A9); the
second journal that makes the site multi-journal is a `POST
scenarios/context` with the test's tag and no `users[]`, the site-level
Login page being `index/login`; the browser restart is tooling: a fresh
browser context that carries over only the signed-in context's cookies
holding an expiry date, as a real restart does. Scenarios 2–3 any roster
account / `editor.diana`; scenario 2's second browser is a second browser
context signed in as the same account before "Logout" is pressed, and
scenario 3's submission is a `POST scenarios/submission` on the seeded
journal. Scenarios 4–5 a throwaway `author` on a scratch journal (`POST
scenarios/context` with `users: [{username, roles: ['author']},
{username, roles: ['reader']}]`; the `reader` exists to be "another
account": the Login As address scenario 4 types is
`login/signInAsUser/{id}` with that user's id from the context response,
built rather than captured), with mail observed in the test mail catcher
by the throwaway address; nobody@mail.test holds no account on the test
installs (every account's address is `<username>@mail.test`) and its
silence is read after the account's own email arrived; scenario 4's
second browser is a second browser context signed in as the throwaway
before the reset is saved; scenario 5's fresh link is a second
lost-password request for the same address. Scenario 6 a scratch reviewer
created via Create New Reviewer on a scratch submission in review (`POST
scenarios/context` with a throwaway `editor` and `author`, `POST
scenarios/submission` with `decisions: ['sendExternalReview']`); the
generated password is read from the test mail catcher; the body's `nova`
and nova.reviewer@mail.test stand for a username and address the suites
tag per run (never flag a shared roster account: cached sign-ins of other
tests would break). Scenario 7 `admin` impersonating `author.alex`; the
sign-out address is the href behind the user menu's "Logout" entry
(`login/signOut`), captured before the first Login As; the
administrator's own row is found by searching Users & Roles for `admin`.
Scenario 8 `editor.diana` (OPS: `manager.maya`) on a scratch submission
in the seeded journal's Articles section, which auto-assigns the section's
editors (`sectioneditor.ana` as the Section Editor participant), with
`author.alex` as submitter and the reviewer variant with `reviewer.julia`
(`reviewRounds: [{reviewers: [{username: 'reviewer.julia', status:
'accepted'}]}]`); the Journal Manager is `manager.maya`, the out-of-reach
account a throwaway `reader` of a `POST scenarios/context` scratch
journal: a scratch user holds roles only there, outside `manager.maya`'s
journals, while `admin` is enrolled as a manager in every scratch context
and so never finds a user out of reach; the number in the address is that
user's id from the context response, and the copied address is
`login/signInAsUser/{id}` as the browser visited it from the Author's
row (no return address on the Users & Roles surface, note i). Scenario 4's
account caveat: resetting a roster password must be undone or done on a
scratch user for the same reason as 6.

<a id="fn-a1"></a>
**f-a1** — `maxlength="32"` hardcoded on the password inputs of
`userLogin.tpl`, `confirmPassword.tpl`, `loginChangePassword.tpl` (username
and password), `userPasswordReset.tpl`; no matching cap exists at
registration/reset time beyond it (the reset form itself caps typing at 32,
so an over-long password can only arise from other paths — e.g. seeded or
imported accounts, or pre-cap registrations). Live-probed: typing 34
characters leaves 32 in the box and sign-in fails with the generic error
(OJS and OMP, 2026-07-31); the same cap observed on the reset form
(2026-07-31) and the Confirm Access box (2026-08-01).
Issue report: [pkp-e2e#795](https://github.com/jardakotesovec/pkp-e2e/issues/795) ([docs/issues/U03-A7-password-boxes-keep-32-characters.md](../issues/U03-A7-password-boxes-keep-32-characters.md)) (with [User profile A7](U03-user-profile.md#a7)).

<a id="fn-a2"></a>
**f-a2** — `userLogin.tpl`: `<input type="checkbox" name="remember" ...
checked="$remember">` — the attribute value is literal text, not a template
substitution, so the `checked` attribute is always present and the browser
renders the box ticked regardless of any prior choice. Live-confirmed
2026-07-31: pre-ticked on a fresh Login page in OJS, OMP and OPS.
Live-probed 2026-09-29 (OJS, OMP, OPS; two runs each): a sign-in refused
with the box unticked shows the form again with it ticked.
Issue report: [pkp-e2e#820](https://github.com/jardakotesovec/pkp-e2e/issues/820) ([docs/issues/U01-A2-keep-me-logged-in-always-ticked.md](../issues/U01-A2-keep-me-logged-in-always-ticked.md)).

<a id="fn-a3"></a>
**f-a3** — Live-probed 2026-07-31 (OJS) and 2026-08-01 (OPS; the form's
template is shared — now observed on both, not just inferred): the
browser tab on the set-a-new-password form shows the raw locale key
`user.login.resetPassword` while the page heading renders "Reset Password"
— the page-title string reaches the tab untranslated
(`user/userPasswordReset.tpl`).

<a id="fn-a4"></a>
**f-a4** — The Vue Users & Roles config (`useUserAccessManagerConfig`)
offers the action when `getCurrentUserId() !== user.id && user.canLoginAs`;
the server-computed `canLoginAs`
(`user/maps/Schema::getPropertyCanLoginAs`) checks only the note-h reach
test and never consults the impersonation state. The legacy grids all
guard it — `UserGridRow`, `StageParticipantGridRow.php:115` and
`ReviewerGridRow.php:180` require `!Validation::loggedInAs()` — but none
of them is the live surface anymore. Live-probed 2026-07-31: the
offering appears mid-impersonation in all three apps; the second
impersonation was driven on OJS. Non-nesting driven 2026-08-01 (OMP;
`PKPSessionGuard::signInAs()` is shared): the second call overwrites the
stored `signedInAs` id with the intermediate user's, so `signOutAsUser`
restores the intermediate user and no impersonation state remains.
Re-probed 2026-08-25 (OJS): the Vue Participants panel offers "Login As"
on another participant's row mid-impersonation too (its action config,
`useParticipantManagerConfig`, gates only on `participant.canLoginAs`).
Fix per review: return false from `getPropertyCanLoginAs` when
`Validation::loggedInAs()` is active, so every Vue consumer inherits the
legacy rule.
Issue report: [pkp-e2e#824](https://github.com/jardakotesovec/pkp-e2e/issues/824) ([docs/issues/U01-A4-second-login-as-strands-operator.md](../issues/U01-A4-second-login-as-strands-operator.md)).

<a id="fn-a5"></a>
**f-a5** — Flag `user.mustChangePassword`. Live-probed 2026-07-31 (OJS,
OMP): the users list row's "Edit" opens the invite-style wizard, which
carries no password-related control; no other users-screen path offers
one (corrected below). The review stage's Create New Reviewer form (`CreateReviewerForm`)
sets the flag on the account it creates and mails a generated password
(driven live — scenario 6's seeding path). 3.4 comparison (2026-08-25,
review): in OJS 3.4.0 the users grid's Edit User (`UserGridHandler::editUser` →
`UserDetailsForm` → `common/userDetails.tpl`) rendered the checkbox for
EXISTING accounts — `readUserVars` includes `mustChangePassword`
unconditionally and `execute` writes it for any user; the true-by-default
initData applies to new accounts only — establishing the regression.
Corrected 2026-09-28, after the 2026-08-25 review (live-probed OJS, OMP,
OPS; two runs each; note g): the legacy user-details form
(`UserDetailsForm` + `userDetails.tpl`) is still linked, from the Site
Administrator's Hosted Journals wizard › "Users" grid, on "Add User" and
"Edit User", and flags new and existing accounts. The entry's earlier
wording ("no current users screen offers the flag … staff cannot require a
password change on an existing account") was wrong for the Site
Administrator; it now names the journal's own screen, which still has no
control (opened by `admin` and by a Journal Manager), and the question
narrowed with it. The reviewed loss stands for that screen, the one 3.4
gave Journal Managers.

<a id="fn-a6"></a>
**f-a6** — Live-probed 2026-08-01 (OJS, scratch user, site setting
temporarily enabled at 3 attempts / 300 s): attempts beyond the limit —
including one with the correct password — answer `user.login.loginError`
verbatim, with only a 2–5-second artificial delay
(`RateLimitingService::applyRateLimitDelay()`) distinguishing them. The
limit was introduced 2026-02 by the site-security rate-limiting feature
(upstream issue pkp/pkp-lib#12162); defaults 5 attempts / 300 s, keyed
per username+IP (IPv6 /64), configurable in Site Settings → Security.

<a id="fn-a7"></a>
**f-a7** — Live-probed 2026-08-01 (OJS, OMP, OPS — identical): signed out,
`{journal}/dashboard` with no operation after it answers HTTP 500 with an
empty body; every `/dashboard/{op}` address redirects to Login with the
destination held as `source` and resumes correctly after sign-in. Cause
pinned 2026-08-25 (review): the bare address resolves "which dashboard is
home" via `PKPPageRouter::getHomeUrl()`, which starts from
`Auth::user()->getId()` with no signed-out guard — the only
anonymous-reachable caller; every other caller runs just after sign-in.
Fix per ruling: guard `getHomeUrl()` (no user → the login redirect), so
variant resolution stays post-login.
Issue report: [pkp-e2e#825](https://github.com/jardakotesovec/pkp-e2e/issues/825) ([docs/issues/U01-A7-dashboard-address-signed-out-server-error.md](../issues/U01-A7-dashboard-address-signed-out-server-error.md)).

<a id="fn-a8"></a>
**f-a8** — Live-probed 2026-08-25 (OJS): with an aged storage-state session
(cookies from before a test-database reset; authenticated pages still
render), `GET login/signInAsUser/{id}` answers HTTP 500 —
`LoginHandler::signInAsUser` passes `$sessionGuard->getUserId()` (null in
that state) into the int-typed second parameter of
`Validation::getAdministrationLevel()`. Controls the same day: anonymous
GET → 302 to Login; freshly signed-in session → impersonation proceeds
(200 → dashboard). Fix per ruling: treat an unresolvable session user as
signed out (redirect to Login) before the administration-level check.
That first lead, a session that outlived a database reset, gave the same
error line; that it is the same state stays unverified. Live-probed
2026-10-04 (OJS, OMP, OPS on `main` and `stable-3_5_0`; default dataset; kept script
`shared/playwright/checks/issues/login-as-after-idle-limit-server-error/walk.js`,
the idle limit stood in for as in note c): after a "Keep me logged in"
sign-in lapses, "Login As" on the Users & Roles row "David Buskins"
answers HTTP 500 with an empty body at `login/signInAsUser/{id}`, the log
reading `Validation::getAdministrationLevel(): Argument #2
($administratorUserId) must be of type int, null given`; the hand-built
address for `admin`, out of the manager's reach, answers the same 500.
The cause is `PKPSessionGuard::getUserId()`: Laravel's recaller restores
the user, but `setUserDataToSession()` never runs on that path, so PKP's
own `userId` session key is null and `Validation::isLoggedIn()` reads the
user as signed out (the public header and the Login page, Rule 5a).
Control: signed out and in again, the same "Login As" impersonates.
Issue report: [pkp-e2e#828](https://github.com/jardakotesovec/pkp-e2e/issues/828) ([docs/issues/U01-A8-login-as-after-idle-limit-server-error.md](../issues/U01-A8-login-as-after-idle-limit-server-error.md)).

<a id="fn-a9"></a>
**f-a9** — `dateLastLogin`, set by `Validation::registerUserSession()` and
read only by `Validation::generatePasswordResetHash()` (note f). Test run
2026-09-13 (OJS, OMP, OPS, the suites' scenario 1 as `manager.maya`):
Settings › Users & Roles › Users ("Current Users (N)", the shared
ui-library `UserAccessManager` table) carries the column headers "Name",
"Email", "Roles", "Start Date", "Affiliation", "More Actions", the Editor's
row reading "Diana Editor editor.diana@mail.test Journal editor 2026-09-13"
(OMP "Press editor"; OPS the Moderator "Ana Section Editor … Moderator"),
the date being the role's start; the row's "Edit" leaves for
`management/settings/user/{id}`, the invitation wizard, showing Email,
ORCID iD, Given Name, Family Name, Affiliation, "View more details" and the
role rows with "Start Date" / "End Date"; the list's own fetch
(`api/v1/users`) carries no `dateLastLogin`, the ui-library has no consumer
of the field outside its mocks, and Administration's index links no users
list. The suites assert the row and the six headers and the date neither
way.

<a id="fn-a10"></a>
**f-a10** — `PKP\controllers\grid\settings\user\form\UserDetailsForm`:
`initData()` sets `mustChangePassword` (true) only for a new user and never
loads the stored flag for an existing one, so `common/userDetails.tpl`
renders the box unticked; `readInputData()` reads the box and `execute()`
writes `setMustChangePassword()` from the posted value for every user.
Unchanged since the users grid was ported from OMP (pkp-lib `cca31520cc`,
2013-02-14; `git log -S` on the checkout). Live-probed 2026-09-28 (OJS,
OMP, OPS; two runs each; `admin` on a scratch context's wizard › "Users"):
"Edit User" on an unflagged account opens with the box unticked; ticked
and saved with "OK" (the window closes), then reopened on the
same page and again after a reload, it reads unticked, while the
account's next sign-in diverts to "Change Password". A second account,
flagged the same way, then opened with "Edit User" and saved with "OK"
with nothing changed, signs in next straight to My Submissions with no
"Change Password".
Issue report: [pkp-e2e#829](https://github.com/jardakotesovec/pkp-e2e/issues/829) ([docs/issues/U01-A10-edit-user-hides-clears-change-password.md](../issues/U01-A10-edit-user-hides-clears-change-password.md)).

<a id="fn-a11"></a>
**f-a11** — Live-probed 2026-09-28 (OJS, OMP, OPS; two runs each; scratch
contexts, accounts flagged through the Site Administrator's wizard): at
`login/changePassword/{username}` the title reads "Change Password |
{journal name}"; after "OK" with a wrong current password the page, at
`login/savePassword#formErrors`, still carries the heading "Change
Password" and the error, and the title reads only the journal's name
(`LoginHandler::savePassword()` re-displays
`user/loginChangePassword.tpl` without the page title the
`changePassword` op sets).
Issue report: [pkp-e2e#821](https://github.com/jardakotesovec/pkp-e2e/issues/821) ([docs/issues/U01-A11-refused-password-form-tab-loses-name.md](../issues/U01-A11-refused-password-form-tab-loses-name.md)).

<a id="fn-a12"></a>
**f-a12** — Live-probed 2026-09-29 (Rule 2; OJS, OMP, OPS identical; two
runs each, each on its own scratch context; one Author disabled with no
reason through the seed key, another disabled with a typed reason through
Settings › Users & Roles › the row's "Disable User"; enabled Authors and a
Journal Manager): the enabled account's first sign-in after the refusal
answers `login/signIn` 302 → `dashboard` 302 → `login?source=…dashboard`
200 (site-level Login: → `index` 302 → `index/en/login?source=…index`),
the Login page with no message, "Username or Email" empty, the header
still offering "Register" and "Login"; the second try lands on the role's
Dashboard (Author "Active submissions (0)", Journal Manager "Assigned to
me (0)"), at the site-level Login on the site's home page. The same with
"Keep me logged in" ticked or unticked on the disabled attempt, with or
without a reason, and with the Login page opened afresh in between.
Controls, in on the first try: after a wrong password, after an unknown
username, after a disabled account's wrong password, and in a fresh
browser; rate limiting was off (A6 is not what refuses). The second
refusal: disabled refused → enabled bounced → disabled refused again →
the enabled account's correct password answers `POST login/signIn` 200
with `user.login.loginError`, its next try the Dashboard (six reads); a
seventh, an OJS repeat on the same context, bounced that attempt to
`login?source=…login%2FsignIn` with no message instead, the next try
getting in. No server error and no page error in any run. Cause not
traced.

<a id="fn-a13"></a>
**f-a13** — `AdminHandler::authorize()` (`lib/pkp/pages/admin/AdminHandler.php:111`
on main) is the only place that adds `ReauthenticationRequiredPolicy`. The
controllers the Administration screens call authorize by role alone:
`PKPJobController` (failed jobs list, delete, redispatch),
`PKPSiteController` (`PUT site`, also theme), `PKPContextController` (the
site-admin `add`/`delete` routes), and the grids `ContextGridHandler`,
`AdminLanguageGridHandler`, `AdminPluginGridHandler`. Nor do those requests
refresh the window: `PKPSessionGuard::isElevatedSessionActive()` is called
only from the page policy. Introduced with the gate itself, pkp-lib
`cf5798f06e` (Taslan A. Graham, 2026-04-09; pkp/pkp-lib#12338, PR #12505):
the API and grid controllers were not touched. Live-probed 2026-09-30 (OJS
main, a scratch server with `password_timeout = 1`): in a never-confirmed
session and after a confirmed window lapsed (`admin/systemInfo` 302 to
`confirmAccess` before and after), `POST contexts` created a throwaway
journal and `DELETE contexts/{id}` and the Hosted Journals grid's
`delete-context` deleted one (200), `PUT site` 200, `GET jobs/failed/all`
200, `DELETE jobs/failed/delete/{id}` reached the handler, the Hosted
Journals, Languages and Plugins grids' fetch and the plugin upload form
answered (those grids' writes and the jobs redispatch read from code, same
handlers); `POST admin/clearDataCache` went to `confirmAccess` with
`isActionRequest=1`. Journal Managers were refused all of them. OMP and OPS
from code (the files are byte-identical). Proposed fix: add the policy to
the jobs and site controllers, to the contexts controller's `add` and
`delete` only (`PUT contexts/{id}` also saves a journal's own Settings,
which the issue left ungated), and to the three admin grids' `authorize()`,
and have the policy answer API and grid requests with a JSON deny (e.g. a
401 carrying a "Confirm Access" flag) instead of the page redirect: a
redirect breaks those callers, and on the whole contexts controller it
sent Journal Managers to `confirmAccess` even with the gate off (tried
live, then reverted). Gated requests would then also extend the window.
3.5, 3.4 and 3.3 do not have it: none has `password_timeout` or the policy.
Security-shaped and unreleased: its issue report carries
"- **Security** unreleased" (REPORT.md).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Login page + form | `{journal}/login` (form posts to `login/signIn`) | ROUTE-016 · AFFU-001..008 |
| Sign out | user menu → `login/signOut` | ROUTE-016 |
| Lost password | `login/lostPassword` → POST `login/requestResetPassword` | AFFU-036..039 |
| Emailed reset link | `login/resetPassword/{username}?confirm={hash}` → form POSTs `login/updateResetPassword` | AFFU-040..043 · MAIL-030 |
| Forced password change | `login/changePassword[/{username}]` → POST `login/savePassword` | AFFU-044..048 |
| Forced-change flag — hosted-journal users grid | Administration → Hosted Journals → journal → Users tab → "Add User" / "Edit User" | AFFM-209 |
| Login As / return | `login/signInAsUser/{id}` · `login/signOutAsUser` | ROUTE-016 |
| Login As — Users & Roles row | Settings → Users & Roles → user row menu | AFFM-105 |
| Login As — Participants panel | workflow → Participants row action (+ "Logout as" entry) | AFFW-470, 473, 467 |
| Login As — Reviewers table {OJS OMP} | workflow Review stage → reviewer row action | AFFW-499 |
| Login As — hosted-journal users grid | Administration → Hosted Journals → journal → Users tab | AFFM-209 |
| Confirm Access gate | `admin/confirmAccess` → POST `admin/confirmAccessSubmit` (ops cited; the admin handler is owned by *System administration & jobs*) | AFFM-191 · AFFU-049..052 |
| Access denied page | `user/authorizationDenied?message=…` (op cited; the user-page handler is owned by *User profile*) | — |
| Config, security section | `config.inc.php` `[security]` | SET-052 |

## Reference — code anchors

- `lib/pkp/pages/login/LoginHandler.php` — every op in this spec
- `lib/pkp/classes/security/Validation.php` — login/logout, reset hashes, administration levels, `canUserLoginAs()`
- `lib/pkp/classes/core/PKPSessionGuard.php` — sessions, sign-in-as, elevated (Confirm Access) window
- `lib/pkp/classes/security/RateLimitingService.php` · `classes/middleware/PKPAuthenticateSession.php`
- `lib/pkp/classes/user/form/ResetPasswordForm.php` · `LoginChangePasswordForm.php` · `ConfirmPasswordForm.php`
- `lib/pkp/classes/security/authorization/ReauthenticationRequiredPolicy.php` · `pages/admin/AdminHandler.php` (confirm ops)
- `lib/pkp/classes/mail/mailables/PasswordResetRequested.php` (+ `mail/traits/PasswordResetUrl.php`)
- Templates: `lib/pkp/templates/frontend/pages/userLogin.tpl`, `userLostPassword.tpl`; `lib/pkp/templates/user/userPasswordReset.tpl`, `loginChangePassword.tpl`, `confirmPassword.tpl`
- UI library: `src/components/TopNavActions/TopNavActions.vue` · `src/composables/useUserAuth.js` · `src/managers/{UserAccessManager,ParticipantManager,ReviewerManager}/`
- Legacy grid: `lib/pkp/controllers/grid/settings/user/UserGridRow.php` · `form/UserDetailsForm.php` (the forced-change box, Rule 11a) · `lib/pkp/templates/common/userDetails.tpl`
- App divergence points checked: none in `pages/login` or `pages/admin` (no app subclasses); `pages/user/UserHandler.php` in each app (no login-related overrides)
