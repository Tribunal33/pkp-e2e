---
name: registration-and-account-validation
status: verified
---

# Registration & account validation

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

This spec is about becoming someone on the site. A visitor fills in the
"Register" form, choosing a username and password and giving a name,
affiliation, country and email address, and walks away with an account. On a
journal's own Register page the new account is a Reader of that journal, and
the visitor may ask to be a Reviewer too. On the site's Register page the
visitor picks the journals to join and the roles to ask for in each. Where a privacy
statement is configured, registering means agreeing to it. An installation
can demand that the email address be proven before the account works: the
account then starts disabled, an email carries an activation link, and the
account opens when the link is used. This spec covers the two Register pages,
what the new account gets, the "Registration complete" page, the
email-validation loop, the spam checks, and the settings that close or shape
registration. Signing in afterwards, and the Login page that links here,
belong to [Login & sessions](U01-login-and-sessions.md).

## Actors & permissions

"Registration is open" on a journal when its Users & Roles settings say
visitors can register (see *Settings* below). A "self-registering role" is a
role whose Roles settings
allow user self-registration; out of the box those are Reader, Author and
Reviewer on a journal, Reader, Author, Chapter Author and External Reviewer
on a press, and Reader and Author on a preprint server. The Author role is
never offered on a Register page; it arrives on the first submission (see
*Cross-feature interactions* below). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the journal-level Register page** | • Any visitor, signed out, while the journal's registration is open (Rule 1). It stays reachable on a journal that requires sign-in to view its pages (Rule 3)<br>• A signed-in user opening the address gets the "Registration complete" page instead of the form, whatever their roles (Rule 4) <sup>a</sup> |
| **Open the site-level Register page** | • Any visitor, signed out, while at least one journal on the site has registration open (Rule 2)<br>• A signed-in user: as above, the "Registration complete" page (Rule 4) <sup>a</sup> |
| **Create an account** | • Any visitor who fills the form to the rules in *Fields & validation*, passes the spam check when one is configured, and ticks the privacy consent where one is shown (Rule 5) <sup>b</sup> |
| **Ask for the Reviewer role while registering** | • Any visitor on the journal-level page, when the journal's Reviewer role is self-registering {OJS OMP}. A preprint server installs no reviewer role, so its page carries no such offer (Rule 7) <sup>c</sup> |
| **Choose journals and roles (site-level)** | • Any visitor on the site-level page: for each journal with open registration, one checkbox per self-registering Reader and Reviewer role of that journal (a preprint server offers Reader only) (Rule 8) <sup>c</sup> |
| **Activate an account from the emailed link** | • The holder of the "Validate Your Account" email, while the link is valid (Rules 11–14). Only when the installation requires email validation <sup>i</sup> |
| **Add roles to an existing account** | • Any signed-in user, on their profile's Roles tab, described in the *User profile* spec. The Register pages offer a signed-in user nothing but the completion page (Rule 4) <sup>h</sup> |
| **Open or close registration; make a role self-registering** | • Journal Manager, and any other role whose permission level on the Roles settings screen is Journal Manager (the Journal Editor of a default install {OJS OMP}; a preprint server installs no such second role), on Users & Roles. A Section Editor opening it is refused with "The current role does not have access to this operation." (see *Settings* below; the screens are described in the *Roles configuration* spec) <sup>g</sup> |
| **Require email validation; turn a spam check on** | • The system administrator, in the configuration file; no screen offers either (see *Settings* below) <sup>f</sup> <sup>i</sup> |

## Fields & validation

**Register page** (title "Register"; the line "Required fields are marked
with an asterisk: *" sits above the form). The same form appears on the
journal-level and the site-level page; the sections after "Login" differ
and are marked. An empty required box never reaches the site: the browser
stops the form at the first one with its own prompt. A submission the site
rejects re-shows the page with "Errors occurred processing this form:" at
the top, followed by one line per problem, at most one per field, in the
order username, password, email, then consent. Everything typed is kept
except the two password boxes, which come back empty and must be retyped.
<sup>b</sup>

*"Profile" section:*

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Given Name" | yes | Up to 255 characters. The browser refuses an empty box before anything is sent <sup>b</sup> |
| "Family Name" | no | Up to 255 characters <sup>b</sup> |
| "Affiliation" | yes | Free text. The browser refuses an empty box before anything is sent <sup>b</sup> |
| "Country" | yes | A drop-down of country names, opening blank, in alphabetical order except that a name with an accented letter sorts after its plain neighbours ("Czechia" then "Côte d'Ivoire"; "Åland Islands" is the last entry, after "Zimbabwe"); the browser refuses it left blank <sup>b</sup> |

*"Login" section:*

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Email" | yes | Must contain an "@" or the browser refuses it; an address as short as "a@b" passes the browser and the site alike. Must not belong to any existing account, disabled ones included, compared without regard to letter case: "The selected email address is already in use by another user." Up to 90 characters <sup>b</sup> |
| "Username" | yes | Lower-case letters and digits, with single hyphens or underscores between them; it must start and end with a letter or digit ("The username can contain only lower-case alphanumeric characters, underscores, and hyphens, and must begin and end with an alphanumeric character."). A capital letter is refused, not lowered, and the box keeps what was typed. Must not belong to any existing account, disabled ones included, compared without regard to letter case: "The selected username is already in use by another user."; a name that is both badly formed and taken gets only this line. Up to 32 characters <sup>b</sup> |
| "Password" | yes | At least the site's minimum length (6 on a default install): "The password must be at least {N} characters." When the repeat differs, only "The passwords do not match." is shown, even if the password is also too short. When the site's compromised-password check is on, a known-breached password is refused; the policy belongs to [Login & sessions](U01-login-and-sessions.md). The typing box stops at 32 characters, the same cap as the Login page (the *Login & sessions* finding [password boxes cut off](U01-login-and-sessions.md#a1)) <sup>b</sup> |
| "Repeat password" | yes | Must match: "The passwords do not match." <sup>b</sup> |

*Journal-level page only:*

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| ORCID block ("Create or Connect your ORCID iD") | no | Above the form, when the journal's ORCID plugin is enabled. It belongs to [ORCID integration](U04-orcid-integration.md) <sup>a</sup> |
| "Yes, I agree to have my data collected and stored according to the privacy statement." | yes, when shown | Shown only when the journal has a Privacy Statement (a fresh install gives every journal one); "privacy statement" opens the journal's "Privacy Statement" page in a new tab. Left unticked: "You must agree to the terms of the privacy statement." (Rule 5) <sup>d</sup> |
| "Yes, I would like to be notified of new publications and announcements." | no | Arrives unticked. Left unticked, the new account starts with the journal's public notification emails switched off (Rule 6) <sup>e</sup> |
| "Yes, I would like to be contacted with requests to review submissions to this journal." | no | Shown when exactly one reviewer role of the journal is self-registering. With several, the block is headed "Would you be willing to review submissions to this journal?" and offers one "Yes, request the {role} role." box per role {OJS OMP} (Rule 7) <sup>c</sup> |
| "Reviewing interests" | no | Appears under the reviewer offer once one of its boxes is ticked, as a plain text box; commas separate interests, and each becomes a separate interest on the profile's Roles tab (Rule 7) <sup>k</sup> |

*Site-level page only:*

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Which journals on this site would you like to register with?" | no | One block per enabled journal, headed by its name, then "Request the following roles." with a checkbox per self-registering Reader and Reviewer role of that journal (Rule 8). A journal that requires sign-in to view its pages is listed as usual; a disabled journal is left out. Journals that closed registration still appear, with no roles under them ⚠ [A4](#a4) <sup>c</sup> |
| "Yes, I agree to have my data collected and stored according to this journal's privacy statement." (per journal) | yes, when a role of that journal is ticked | Appears under a journal the moment one of its roles is ticked, when that journal has a Privacy Statement and the site is not in single-statement mode (see *Settings* below); on a press site the line is on screen from the start under every press with a statement ⚠ [OMP2](#omp2). A ticked role whose journal's line is left unticked is refused with one line, however many journals are affected: "You must consent to the privacy statement for any journal with which you are registering." (Rule 5) ⚠ [OMP1](#omp1) <sup>d</sup> |
| "If you requested to be a reviewer on any journal, please enter your subject interests." | no | Plain text box, commas separating interests (a press asks "…to be a reviewer for any press…"). Shown on every site-level page; a preprint server's asks "If you requested to be a reviewer, please enter your subject interests." though it offers no reviewer role, and what is typed there has no home on the profile ⚠ [OPS1](#ops1) <sup>k</sup> |
| "Yes, I agree to have my data collected and stored according to the privacy statement." (site) | yes, when shown | Shown only when the site itself has a Privacy Statement. Missing: "You must consent to this site's privacy statement." ⚠ [OMP1](#omp1) <sup>d</sup> |
| "Yes, I would like to be notified of new publications and announcements." | no | Offered, but the choice is not recorded anywhere ⚠ [A3](#a3) <sup>e</sup> |

*Both pages, at the end:*

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Spam check | when configured | reCAPTCHA shows its widget. The ALTCHA check shows nothing while the form is filled in; as "Register" is pressed a small box reading "Verifying...", then "Verified", with "Protected by ALTCHA", flashes for a moment and the form goes through, with no outside service involved. A response the site cannot verify, or none at all (a browser without JavaScript), is refused with "You must complete the validation check used to prevent spam submissions." and no account is created; when the login check is on as well, that visitor cannot sign in either ([Login & sessions](U01-login-and-sessions.md)) (see *Settings* below) <sup>f</sup> |
| "Register" button | — | Submits the form <sup>a</sup> |
| "Login" link | — | Beside the button, for visitors who already have an account. It is built to land on the profile's Roles tab after sign-in, but sign-in ignores that destination and lands as an ordinary sign-in would ⚠ [A5](#a5) <sup>h</sup> |

## Rules & state

1. **Two Register pages.** Every journal has a Register page, and the site
   has one outside any journal. Both are reached through the "Register"
   entry in the site header while signed out, and through the "Register"
   link on the Login and lost-password pages. Each page also has an address
   a visitor can type: the journal-level page's is the journal's own address
   followed by "/user/register", exactly as the address bar shows after
   pressing the header's "Register" (a language code such as "/en" may sit
   between the two, as it does in the journal's other addresses); the
   site-level page's is the same with "index" in place of the journal's
   path, and the site homepage is the site's own address with no journal in
   it. Typing the address is how a page is
   reached while its links are hidden (Rules 2 and 4). The journal-level
   page registers with that journal; the site-level page registers with the
   site and offers a choice of journals (Rule 8). <sup>a</sup> <sup>g</sup>
2. **Closed registration.** A journal whose Users & Roles settings close
   registration drops "Register" from its header and from its Login and
   lost-password pages (the link removal is described in
   [Login & sessions](U01-login-and-sessions.md)). Its Register address
   (Rule 1), typed by hand, answers a page titled "Register" reading "This journal is
   currently not accepting user registrations." with a "Login" link. The
   site-level page closes the same way only when every journal on the site
   has closed registration; the site header keeps offering "Register"
   regardless, while the site's own Login page drops the "Register" link
   below its form in that all-closed state (the link is
   [Login & sessions](U01-login-and-sessions.md)'s). A disabled journal (one an administrator has switched off
   under Administration › Hosted Journals; the screen is described in the
   *Site settings* spec) has no Register page at all for a signed-out
   visitor: its Register address, like every other address of the journal,
   shows the journal's Login page, whose own "Register" links lead straight
   back to that Login page with no word that the journal is disabled (a
   signed-in user gets the completion page even there, Rule 4). <sup>g</sup>
3. **Restricted journals still register.** A journal that requires users to
   sign in to view its pages ("Users must be registered and log in to view
   the journal site.") sends a signed-out visitor to Login from its homepage
   and every other page, but its Register address still renders the full
   form, and the header there offers "Register" beside "Login". <sup>g</sup>
4. **A signed-in visitor gets the completion page.** Opening either Register
   address while signed in shows "Registration complete" (Rule 10) instead
   of the form, whoever the user is and whatever they hold; even a journal
   that closed registration answers a signed-in user with the completion
   page, "Make a New Submission" included, never with its closed message.
   Existing users add roles on their profile's Roles tab instead (the *User
   profile* spec). <sup>h</sup>
5. **Privacy consent.** On the journal-level page the consent box exists
   only when the journal has a Privacy Statement, and then it must be
   ticked; a fresh install gives every journal a default statement, so the
   box is normally there. On the site-level page the site's own statement,
   when it has one, must be agreed to; and each journal whose role is
   ticked must be agreed to separately when it has its own statement,
   unless the site is configured to use a single site-wide statement, in
   which case only the site's consent is asked. A journal whose roles are
   left unticked asks for no consent, so a form with no role ticked on a
   site without its own statement registers with no consent at all. The
   consent itself is not recorded on the account; only the refusal to
   proceed enforces it. <sup>d</sup>
6. **Email opt-in.** The journal-level page's notification box, left
   unticked, registers the account with the journal's public-announcement
   emails (on a journal, the new-issue and open-access-issue emails too)
   switched off; the in-app notifications themselves stay on, and the
   choice can be changed later on the profile's Notifications tab (the
   *Notifications center* spec). Ticked, the defaults stay. The site-level
   page shows the same box but records nothing ⚠ [A3](#a3). <sup>e</sup>
7. **What the new account holds (journal-level).** The account becomes a
   Reader of the journal, whether or not the Reader role is open to
   self-registration ⚠ [A7](#a7). Ticking the reviewer offer replaces that:
   the account gets the ticked Reviewer role and not Reader. The reviewer
   offer exists only where a self-registering reviewer role exists: on a
   journal ("Reviewer") and a press ("External Reviewer"; the Internal
   Reviewer role is not self-registering out of the box) {OJS OMP}; a
   preprint server installs none, so its page offers neither the box nor
   "Reviewing interests". Closing the Reviewer role to self-registration
   removes both from the page the same way; the notification box stays.
   Interests typed with the offer become the account's reviewing interests,
   the same list the profile's Roles tab edits. The Author role is never
   offered here; a new user who starts a submission is enrolled as an
   Author then ([Submission wizard](U21-submission-wizard.md)). On a
   preprint server, merely opening "Make a New Submission" from the
   completion page already makes the new Reader an Author, so their next
   sign-in lands on the submissions list headed "My Submissions as Author"
   (the *Submission wizard* finding
   [enrolment on a preprint server](U21-submission-wizard.md#ops2)).
   <sup>c</sup> <sup>k</sup>
8. **What the new account holds (site-level).** The account gets exactly the
   roles ticked, in the journals they belong to, and nothing else. Only
   self-registering Reader and Reviewer roles of journals with open
   registration are offered; a press offers "Reader" and "External
   Reviewer", a preprint server "Reader" alone. With nothing ticked the
   account exists with no role in any journal. <sup>c</sup>
9. **Signed in on success.** When email validation is not required, a
   successful registration signs the new account in at once. The browser
   then lands on the "Registration complete" page (Rule 10), unless the
   visitor had arrived at Register through the "Register" link below the
   Login form while that Login page was holding an interrupted destination
   (a private address they had tried to open); then it continues to that
   address, as a sign-in would, and is refused there with "The current role
   does not have access to this operation." when a Reader may not open it.
   The header's "Register" entry on the Login page does not carry the
   destination. <sup>h</sup>
10. **The "Registration complete" page.** Headed "Registration complete", it
    reads "Thanks for registering! What would you like to do next?" and
    offers links. On the journal-level page: "View Submissions", only for
    an account holding, in the journal, a role whose permission level on
    the Roles settings screen is Journal Manager, Section Editor, Assistant
    or Reviewer (on a default install: Journal Manager, Journal Editor,
    Section Editor, Reviewer and the assistant-level roles; a preprint
    server's one assistant-level role is Editorial Board Member), never for an Author or
    Reader alone, so a fresh registrant sees it only after ticking the
    reviewer offer; it leads to that role's submissions list (a manager's,
    editor's or assistant's opens on the list headed "Assigned to me", a
    new Reviewer's on the list headed "Action Required by me");
    "Make a New Submission", leading to the submission wizard; "Edit My
    Profile", leading to the profile; and "Continue Browsing", leading to
    the journal's homepage. On the site-level page: "Edit My Profile" and
    "Continue Browsing" (the site homepage) only, whatever roles were
    ticked and whoever the user is, a new Reviewer or the Site
    Administrator alike. <sup>h</sup>
11. **Validation required: the account waits.** When the installation
    requires email validation (see *Settings* below), a successful registration
    does not sign in. The page "Registration awaiting verification" reads
    "We've sent a confirmation email to you at {email}. Please follow the
    instructions in that email to activate your new account. If you do not
    see an email, please check to see if it was put in your spam folder."
    The account exists but is disabled with that same sentence as its
    reason, so signing in before activating is refused with "Your account
    has been disabled for the following reason: We've sent a confirmation
    email to you at {email}…" (the disabled-account rule of
    [Login & sessions](U01-login-and-sessions.md)). <sup>i</sup>
12. **The validation email.** One message, "Validate Your Account", goes to
    the new address: "You have created an account with {journal}, but before
    you can start using it, you need to validate your email account. To do
    this, simply follow the link below:" and the link. A journal-level
    registration sends it from the journal's technical support contact,
    naming the journal. A journal that has no technical support contact
    (Settings › Journal › Contact) cannot send it at all: pressing
    "Register" there ends on an empty page, and the account is left
    disabled with no email to activate it ⚠ [A6](#a6). A site-level
    registration sends it from the site's contact, with the site's title
    (Administration › Site Settings) where the journal name would be; a
    site never given a title leaves the sentence reading "an account with
    , but…". <sup>i</sup>
13. **Activating.** The link opens a page reading "Confirm and activate your
    account" with one button, "Activate Account". Pressing it enables the
    account and answers "Thank you for activating your account. You may now
    log in using the credentials you supplied when you created your
    account." Neither page carries a heading, and the second offers no link
    to the Login page ⚠ [A2](#a2). Signing in now works: on the journal's
    Login page it lands on the journal's homepage, on the site's Login page
    (after a site-level registration) on the site's journal list. Opening
    the button's own address a second time silently lands on the Login
    page; the browser's Back button instead reloads the emailed link, which
    by then shows "Invitation Unavailable" (Rule 14).
    <sup>i</sup>
14. **A dead link.** The emailed link works for a limited time. Under the
    hood it is an invitation, so it lives as long as invitations do: 3 days
    on a default install, while the configuration file's own
    validation-timeout key promises 14 and changes nothing ⚠ [A1](#a1). An expired or already-used link shows the "Invitation
    Unavailable" page with "Login" and "Register" buttons, the shared
    landing owned by
    [User invitations](U06-user-invitations.md#invitation-landing); a
    link whose key was altered answers a bare "404 Not Found" page without
    the site's header or any link, the landing's own not-found behavior. An
    account whose link died
    unused cannot be re-registered (its username and email are taken) and
    stays disabled until a Journal Manager or Site Administrator enables it
    (Users & Roles › Users, the row's "Enable User") or the monthly cleanup
    removes it (Side effects). <sup>i</sup> <sup>j</sup>
15. **Uniqueness ignores case and disabled accounts.** A username or email
    that differs from an existing account's only in letter case is refused,
    and an account that is disabled, an unvalidated one included, still
    claims its username and email. <sup>b</sup>
16. **Name and affiliation are stored in the language of the page** the
    visitor registered on, and copied into the site's primary language when
    that differs; the copy is what the profile shows, while the value kept
    under the page's language has no screen of its own. <sup>k</sup>

## Side effects

- **On registration**: the account is created with the roles of Rule 7 or 8,
  its reviewing interests set, and the notification preference of Rule 6.
  No welcome email is sent; the only mail is the validation message of
  Rule 12, and only when validation is required. <sup>e</sup> <sup>i</sup>
- **On registration with validation required**: the "Validate Your
  Account" email of Rule 12, and, behind the scenes, one pending validation
  record per account, replaced if a newer one is issued (no screen in this
  spec shows the record). When the mail cannot be sent (a journal with no
  technical support contact, or a mail failure), the account is still
  created, disabled, with no way for its owner to activate it or learn why
  ⚠ [A6](#a6). <sup>i</sup>
- **On sign-in after a successful registration** (validation off): the
  account's last-login date is set, as any sign-in does (no screen in this
  spec shows it). <sup>h</sup>
- **Monthly cleanup**: on the first of each month a scheduled task,
  "Remove unvalidated expired users", deletes accounts that never activated
  and never signed in, once they are older than the configured validation
  period (28 days by default). It runs only while email validation is
  required, and only when the period is set above zero. No screen runs,
  lists or times it; this bullet is read from the code. <sup>j</sup>

## Settings that modify behavior

- **User Registration** (journal; Settings › Users & Roles › Site Access
  Options): "Visitors can register a user account with the journal." versus
  "The Journal Manager will register all user accounts. Editors or Section
  Editors may register user accounts for reviewers." On a press the second
  option reads "The Press Manager will register all user accounts. Editors
  or Section Editors may register user accounts for reviewers." (it keeps
  "Section Editors"); on a preprint server it reads "The Server Manager
  will register all user accounts." with no second sentence. The second
  option closes registration (Rule 2). The screen is described in the
  *Roles configuration* spec. <sup>g</sup>
- **Site Access** (same screen): "Users must be registered and log in to
  view the journal site." Registration stays open under it (Rule 3).
  <sup>g</sup>
- **Allow user self-registration** (journal; Settings › Users & Roles ›
  Roles, per role, in the role's "Edit" dialog under "Role Options"): on
  the journal-level page it decides only whether the reviewer offer is
  shown, since Reader is granted regardless (Rule 7 ⚠ [A7](#a7)); on the
  site-level page it decides which Reader and Reviewer boxes each journal
  offers (Rule 8); for Author roles, whether a new user may submit (the
  *Submission wizard* spec). The *Roles configuration* spec owns the screen.
  <sup>c</sup>
- **Privacy Statement** (journal; Settings › Website › Setup › Privacy
  Statement): its presence creates the consent box (Rule 5); a fresh
  install fills it with a default text, so consent is asked until a
  Journal Manager clears the field. The site's own statement
  (Administration › Site Settings) creates the site-level consent. The
  screens are described in the *Journal identity & about pages* and *Site
  settings* specs.
  The configuration file's `sitewide_privacy_statement` switch (general
  section, off by default) makes the site's statement the only one asked
  for on the site-level page. <sup>d</sup>
- **Email validation** (configuration file, email section):
  `require_validation` (off by default) turns Rules 11–14 on; every journal
  then needs a technical support contact to send the validation email
  ⚠ [A6](#a6). `validation_timeout` (14) is documented as the link's lifetime and has no
  effect ⚠ [A1](#a1); the actual lifetime is the invitations section's
  `expiration_days` (3). The general section's `user_validation_period`
  (28) is the cleanup age (Side effects). The email templates "Validate
  Email (Journal Registration)" and "Validate Email (Site)" are edited on
  the Emails settings screen (the *Emails management* spec). <sup>i</sup> <sup>j</sup>
- <a id="spam-checks"></a> **Spam checks** (configuration file, captcha
  section; this spec is the section's home). Two checks exist and each has a master switch plus
  per-form switches: reCAPTCHA (`recaptcha`, with `recaptcha_public_key`,
  `recaptcha_private_key`, `recaptcha_enforce_hostname`, and
  `captcha_on_register` / `captcha_on_login`) and ALTCHA (`altcha`, with
  `altcha_hmackey`, `altcha_encrypt_number`, and `altcha_on_register` /
  `altcha_on_login` / `altcha_on_lost_password`). The configuration file's
  template ships every per-form switch on and both masters off, so turning a master on enables
  the check on every form at once. The login and lost-password effects are
  described in [Login & sessions](U01-login-and-sessions.md). reCAPTCHA
  needs Google's service to answer; ALTCHA needs no outside service, only
  JavaScript in the visitor's browser (*Fields & validation* above, "Spam
  check"). <sup>f</sup>
- **Site password policy** (Administration › Site Settings › Security):
  minimum length and the compromised-password check, applied to the
  Password field here as everywhere; the *Site settings* spec owns the
  form. <sup>b</sup>
- **ORCID** (journal plugin settings): adds the ORCID block to the
  journal-level page ([ORCID integration](U04-orcid-integration.md)).
  <sup>a</sup>

## Cross-feature interactions

- **Login & sessions**: the Login and lost-password pages' "Register" link,
  the removal of that link when registration is closed (on the site's Login
  page, when every journal is closed; Rule 2), the password policy, the
  32-character typing cap, the disabled-account refusal a not-yet-validated
  account meets, and where a sign-in lands all belong to
  [Login & sessions](U01-login-and-sessions.md). This spec owns the captcha
  configuration section that both share; with the login check on, a
  visitor whose browser has no JavaScript is refused at Login with the
  same sentence as at Register (*Fields & validation* above, "Spam check").
- **User invitations**: the "Invitation Unavailable" landing that an expired
  or used activation link reaches belongs to the
  [User invitations](U06-user-invitations.md#invitation-landing) spec, as
  does the bare not-found page a tampered link gets; the activation pages
  themselves are this spec's. An invitation's own "Create account"
  path is a separate way to get an account and is described there.
- **User profile**: the Roles tab (headed "Roles"; it lists the current
  journal's roles with the other journals folded under "Register with
  other journals"; opened from the site level, "Edit My Profile" on the
  site-level completion page included, it lands on that same tab inside
  one of the user's journals) is where an existing account adds roles and
  edits reviewing interests; the Notifications tab holds the opt-in of
  Rule 6.
- **ORCID integration**: the journal-level page's ORCID block, including
  the state of an iD connected while registering, belongs to the
  [ORCID integration](U04-orcid-integration.md) spec.
- **Submission wizard**: a new user who starts a submission is enrolled as
  an Author there, provided an Author role is self-registering
  ([Submission wizard](U21-submission-wizard.md)); on a preprint server the
  enrolment happens on merely opening "Make a New Submission" (Rule 7).
- **Roles configuration**: the User Registration and Site Access options and
  the per-role self-registration flag.
- **Journal identity & about pages** / **Site settings**: the Privacy
  Statement texts the consent boxes link to; the "Online Submissions"
  paragraph of the about pages also carries a link to Register.
- **Navigation menus & site chrome**: the header's "Register" entry (shown
  while signed out and registration is open) belongs to the navigation
  feature; this spec describes only when it appears.
- **Emails management**: the two validation email templates.
- **System administration & jobs**: the monthly cleanup task has no screen
  of its own; the Administration page offers only "Clear Scheduled Task
  Logs", described there. The task's behavior is this spec's.
- **Notifications center & email preferences**: what the opt-in of Rule 6
  switches off.

## Canonical scenarios

Scenarios 1–3 register throwaway accounts on the seeded journal (scenario 1
three of them, the second from the Login page's link and the third on the
journal's French page, each in a browser of its own); scenarios 4–6 run on
a scratch journal (5 on two, one of them disabled; 6 on the seeded journal
as well, with a second throwaway account registered with nothing ticked);
scenario 7 runs on an install that requires email validation and runs the
ALTCHA spam check, its first attempt from a browser without JavaScript and
its second account registered on the site-level page; scenario 8 uses ready
accounts. The ready accounts and their passwords and the tooling recipe are
in the footnote. <sup>s</sup>

1. **Register with a journal and land on the completion page**

   Given: a visitor, signed out, on the seeded journal's homepage; a second
   and a third visitor, signed out, each in a browser of their own.
   <sup>s</sup>

   - **"Register" in the header**: open the journal's homepage and press
     "Register" in the header.
   - **The "Register" form**: on "Register", fill in Given Name,
     Affiliation, Country, Email, a new Username and the same password
     twice, tick "Yes, I agree to have my data collected and stored
     according to the privacy statement.", leave "Yes, I would like to be
     notified of new publications and announcements." unticked, as it
     arrives, and press "Register".
   - **"Registration complete"**: the page "Registration complete" appears,
     reading "Thanks for registering! What would you like to do next?" with
     "Make a New Submission", "Edit My Profile" and "Continue Browsing". The
     header now shows the new username where "Register" and "Login" were.
   - **The profile's Roles tab**: "Edit My Profile" › Roles shows "Reader"
     ticked and no other role ticked.
   - **The profile's Notifications tab**: "Edit My Profile" › Notifications
     shows the journal's public-announcement emails switched off, the
     in-app notifications themselves still on (Rule 6).
   - **The mail catcher**: nothing has arrived for the new account's
     address: no welcome email is sent (*Side effects*).
   - **The second visitor, a private address typed while signed out**: the
     second visitor types the address of a page of the journal that a
     Reader may not open, a submissions list say (the footnote names the
     one used): the Login page appears instead. Press the "Register" link below the Login form and register
     there, the same form with a fresh username and email: the browser
     continues to the typed address, not to the completion page, and is
     refused there with "The current role does not have access to this
     operation." (Rule 9).
   - **The third visitor, the journal's French Register page**: the third
     visitor opens the journal's Register page with the French language
     code, fr_CA, in its address where "/en" sits (Rule 1) and fills in the
     same form with Prénom as the given
     name, Nom as the family name and Laboratoire FR as the affiliation, a
     fresh username and email, and submits it; the profile then shows
     Prénom, Nom and Laboratoire FR, the copy into the site's primary
     language; the value kept under the page's language has no screen of
     its own (Rule 16).
   - **Control**: the completion page offered no "View Submissions"
     (Rule 10).

2. **The form refuses bad input**

   Given: a visitor, signed out, on the seeded journal's "Register" page,
   with an existing account's username and email at hand. <sup>s</sup>

   - **Taken values, a short password and a different repeat**: fill the
     profile fields and tick the privacy consent, then submit with the
     username of an existing account typed with a capital letter, that
     account's email typed in capitals, a short password and a different
     repeat: the page re-shows with "Errors occurred processing this form:"
     listing exactly three lines, in this order: "The selected username is
     already in use by another user.", "The passwords do not match." and
     "The selected email address is already in use by another user."; the
     username stays as typed and both password boxes are empty.
   - **A password shorter than the minimum**: now type a new username, a
     new email and a password shorter than the site minimum, the same in
     both boxes, make sure the privacy consent is still ticked, and submit:
     one line, "The password must be at least {N} characters.", with {N}
     the site's minimum.
   - **Control**: the username with the capital letter drew the "already in
     use" line alone, not the format sentence "The username can contain
     only lower-case alphanumeric characters, underscores, and hyphens, and
     must begin and end with an alphanumeric character.": a name both badly
     formed and taken gets only the taken line (*Fields & validation*,
     "Username").

3. **Register as a reviewer** {OJS OMP}

   Given: a visitor, signed out, on the seeded journal's "Register" page.
   <sup>s</sup>

   - **The reviewer offer**: fill the form, tick the privacy consent and
     "Yes, I would like to be contacted with requests to review submissions
     to this journal.", and in the "Reviewing interests" box that appears
     under it type ethics, statistics (two interests separated by a comma);
     press "Register".
   - **"Registration complete"**: "Registration complete" now also offers
     "View Submissions", which opens a submissions list headed "Action
     Required by me".
   - **The profile's Roles tab**: "Edit My Profile" › Roles shows the
     Reviewer role ticked, "Reader" not ticked, and both interests listed
     separately under "Reviewing interests".
   - **Control**: on a preprint server this scenario does not run; check
     its absence instead: the server's "Register" shows no reviewer box,
     while the notification box that sits beside it on a journal is
     present.

4. **Privacy consent is required when a statement exists**

   Given: a visitor, signed out, on a scratch journal's "Register" page (a
   new journal comes with the default Privacy Statement). <sup>s</sup>

   - **The consent box**: the box "Yes, I agree to have my data collected
     and stored according to the privacy statement." is present, and
     "privacy statement" opens the journal's "Privacy Statement" page in a
     new tab.
   - **Submitted unticked**: submit a valid form with it unticked: "You
     must agree to the terms of the privacy statement."
   - **Submitted ticked**: tick it, retype the password twice and submit:
     "Registration complete".
   - **Journal Manager, the statement emptied**: then the Journal Manager,
     under Settings › Website › Setup › Privacy Statement, empties the
     statement and saves ("Saved").
   - **Control**: a visitor, signed out, on that journal's "Register": the
     box is absent, and the same form, with a fresh username and email,
     registers without it.

5. **Closed registration**

   Given: Journal Manager, signed in on a scratch journal, on a site that
   also hosts the seeded journal and a second scratch journal, disabled
   since its creation; a visitor, signed out, in a second browser.
   <sup>s</sup>

   - **Site Access Options**: under Settings › Users & Roles › Site Access
     Options choose "The Journal Manager will register all user accounts…"
     and save.
   - **Journal Manager at the closed journal's Register address**: still
     signed in, type the journal's Register address (Rule 1) into the
     address bar: "Registration complete", "Make a New Submission"
     included, never the closed message (Rule 4).
   - **Journal Manager at the disabled journal's Register address**: type
     the disabled journal's Register address: "Registration complete" even
     there (Rules 2 and 4).
   - **The visitor's header and Login page**: the visitor, signed out: the
     journal's header and its Login page offer no "Register".
   - **The typed Register address**: type the journal's Register address
     (Rule 1) into the address bar: a page titled "Register" reads "This
     journal is currently not accepting user registrations." with a "Login"
     link.
   - **The disabled journal's Register address**: type the disabled
     journal's Register address: the journal's Login page shows instead,
     and its own "Register" links lead straight back to that Login page,
     with no word that the journal is disabled (Rule 2).
   - **Control**: the site homepage's "Register" still opens the site-level
     page, because the seeded journal is still open.

6. **Register from the site homepage with roles in two journals**

   Given: a visitor, signed out, on a site with the seeded journal and a
   scratch journal, the site itself having no Privacy Statement; a second
   visitor, signed out, in a second browser. <sup>s</sup>

   - **The site homepage**: open the site homepage (Rule 1) and press
     "Register".
   - **"Which journals on this site would you like to register with?"**:
     under "Which journals on this site would you like to register with?"
     both journals are listed with "Request the following roles.".
   - **Before anything is ticked**: no consent line sits under either
     journal, a journal whose roles are left unticked asking for no
     consent (Rule 5); on a press site every press's line is on screen from
     the start [OMP2](#omp2).
   - **The role boxes**: tick "Reader" under one and, on a journal or
     press, the reviewer role under the other (a preprint server offers
     "Reader" only).
   - **The consent lines**: under each ticked journal a line "Yes, I agree
     to have my data collected and stored according to this journal's
     privacy statement." appears (on a press site it was there from the
     start [OMP2](#omp2)); tick both, and, if the site's own consent box
     "Yes, I agree to have my data collected and stored according to the
     privacy statement." is on the page as well (it is only when the site
     itself has a Privacy Statement, Rule 5), tick that too.
   - **"Register"**: fill the form and press "Register": "Registration
     complete" appears with "Edit My Profile" and "Continue Browsing" only.
   - **The profile's Roles tab**: "Edit My Profile" › Roles shows exactly
     the ticked roles in their journals.
   - **The second visitor, nothing ticked**: the second visitor opens the
     site-level page (Rule 1), ticks no journal and no role, fills the form
     with a fresh username and email and presses "Register": no consent
     line is on the page, and the form registers with no consent at all
     (Rule 5);
     "Registration complete" appears, and the profile's Roles tab shows no
     role ticked in any journal (Rule 8).
   - **Control**: the completion page offered, after either registration,
     no "Make a New Submission" and no "View Submissions", the reviewer
     role ticked or nothing at all (Rule 10).

7. **Email validation**

   Given: on an install configured to require email validation and to run
   the ALTCHA spam check on registration (configuration-file settings, see
   *Settings* below), a visitor, signed out, on the "Register" page of a
   journal that has a technical support contact, first in a browser with
   JavaScript switched off; a second visitor, signed out, in a browser of
   their own. <sup>s</sup>

   - **A browser without JavaScript**: fill the form, ticking the privacy
     consent, and press "Register": the page re-shows with "Errors occurred
     processing this form:" and the line "You must complete the validation
     check used to prevent spam submissions.", and no account is created
     (*Fields & validation*, "Spam check").
   - **"Register" with JavaScript on**: register with the journal, the
     same username and email, ticking its privacy consent: the page
     "Registration awaiting verification" appears with "We've sent a
     confirmation email to you at {email}…", its only link the breadcrumb's
     "Home", and the header still shows a signed-out site; the username and
     email were still free, the refused attempt having created no account
     (Rule 15).
   - **The same username and email again**: a second registration on the
     same journal is refused with "The selected username is already in use
     by another user." and "The selected email address is already in use by
     another user.": the unvalidated account already claims them (Rule 15).
   - **Signing in before activating**: try to sign in: "Your account has
     been disabled for the following reason: We've sent a confirmation
     email to you at {email}…".
   - **The "Validate Your Account" email**: open the email, sent from the
     journal's technical support contact, and follow its link: a page reads
     "Confirm and activate your account" with an "Activate Account" button.
   - **"Activate Account"**: press it: "Thank you for activating your
     account. You may now log in using the credentials you supplied when
     you created your account."
   - **The button's own address reopened**: open the address the "Activate
     Account" button led to a second time: the Login page shows, silently
     (Rule 13).
   - **Signing in after activating**: sign in on the journal's Login page:
     it works, landing on the journal homepage.
   - **The emailed link once more**: opened again, the "Invitation
     Unavailable" page with "Login" and "Register" buttons.
   - **The second visitor, the site-level page**: opens the site-level
     Register page (Rule 1), ticks "Reader" under one journal and that
     journal's consent line, fills the form with a fresh username and email
     and presses "Register": "Registration awaiting verification" again
     (Rule 11); the "Validate Your Account" email arrives from the site's
     contact, its sentence reading "You have created an account with ,
     but…", the site never having been given a title (Rule 12); follow its
     link, press "Activate Account" and sign in on the site's Login page:
     it works, landing on the site's journal list (Rule 13).
   - **Control**: the sign-in refused before "Activate Account" and the one
     that worked after it used the same username and password; only the
     activation changed (Rules 11 and 13).

8. **A signed-in user opening Register sees the completion page**

   Given: an Author, signed in on the seeded journal; a Section Editor's
   account ready. <sup>s</sup>

   - **The Author at the journal's Register address**: type the journal's
     Register address (Rule 1) into the address bar: the "Registration
     complete" page appears, not the form, offering "Make a New
     Submission", "Edit My Profile" and "Continue Browsing", no "View
     Submissions" (Rule 10).
   - **A Section Editor at the same address**: the Section Editor, holding
     a role Rule 10 lists, sees "View Submissions" as well; pressing it
     opens the list headed "Assigned to me".
   - **Control**: the site-level address (Rule 1) answers with "Edit My
     Profile" and "Continue Browsing" only, for the Section Editor too
     (Rule 10).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - with validation required, registering on a journal created under
    Hosted Journals with no technical support contact, then the
    "Registration awaiting verification" page and the "Validate Your
    Account" email from the principal contact ([A6](#a6); Rule 12): the
    guard the issue report
    (`docs/issues/U02-A6-register-no-support-contact-empty-page.md`)
    proposes, once fixed
  - with validation required and the mail server refusing connections,
    registering leaves no locked account behind ([A6](#a6); Rule 12):
    the guard the issue report
    (`docs/issues/U02-A6-register-mail-down-says-email-sent.md`)
    proposes, once the team settles the fix
  - on a press site's site-wide Register page, both privacy consent
    refusals read as sentences ([OMP1](#omp1)): the guard the issue
    report (`docs/issues/U02-OMP1-press-site-register-consent-raw-codes.md`)
    proposes, once fixed
  - with validation required, the page the emailed activation link opens
    and the thank-you page after "Activate Account" each named in heading,
    breadcrumb and browser tab, the thank-you page ending with a "Login"
    link ([A2](#a2); Rule 13): the guard the issue report
    (`docs/issues/U02-A2-activation-pages-no-heading.md`) proposes, once
    fixed
- **Nothing new to test**:
  - the "Register" link on the Login and lost-password pages (Rule 1; scenario 1's header entry opens the same page)
  - the header's "Register" on the Login page carrying no destination (Rule 9; scenario 1's link below the form)
  - the User Registration option's wording on a press and a preprint server (Settings; scenario 5's option)
- **Register carries it**:
  - A3 (the site-level notification box records nothing; Rule 6)
  - A7 (Reader granted though closed to self-registration; Rule 7)
  - A4 (closed journals listed with no roles under them; Rule 8)
  - A1 (`validation_timeout` promises 14 days and changes nothing; Rule 14)
  - OMP2 (on a press site every press's consent line is shown before a role is ticked; scenario 6 marks it)
  - OPS1 (a preprint-server site's page asks for reviewing interests with no reviewer role)
- **No seed**:
  - every journal closed: the site-level page closes and the site Login drops the link (Rule 2)
  - a restricted journal still rendering the form, its header offering "Register" (Rule 3): what is missing is a `restrictSiteAccess` key on `POST scenarios/context` (Settings "Site Access"); a Journal Manager's tick would be set-up for a visitor's read, not a step
  - the site's own statement present: the site consent asked (Rule 5)
  - `sitewide_privacy_statement` on: only the site consent asked (Rule 5)
  - the Reviewer role closed to self-registration: box and interests gone (Rule 7): what is missing is a per-role "Allow user self-registration" passthrough on `POST scenarios/context` (a `userGroups[]` key)
  - the self-registration flag deciding the site-level boxes per journal (Settings, Rule 8): the same missing passthrough
  - the link expiring after 3 days (Rule 14, `expiration_days`)
  - the monthly cleanup deleting unvalidated accounts older than the period (Side effects)
  - reCAPTCHA on Register (Settings "Spam checks")
  - the site password policy: a non-default minimum applied to the Password field (Settings)
- **Owned by another feature**:
  - a signed-in user adding roles on the profile's Roles tab (Actors row 7; *User profile*)
  - a Section Editor refused on Users & Roles (Actors row 8; *Roles configuration*)
  - OPS: opening "Make a New Submission" enrolling the Reader as Author (Rule 7; *Submission wizard*)
  - an altered key answering a bare "404 Not Found" (Rule 14; *User invitations*)
  - a dead-link account staying disabled until "Enable User" (Rule 14; *Users management*)
  - the last-login date set on the first sign-in (Side effects; *Login & sessions*)
  - the ORCID block on the journal-level page (Settings; *ORCID integration*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-02), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | Activation links die after 3 days while the configuration's validation-timeout key promises 14 and does nothing | 🐞 | latent | — |
| [A2](#a2) | A new user activating their account sees two pages with no heading and no Login link | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | The site-level page's notification opt-in records nothing | 🐞 | minor | — |
| [A4](#a4) | The site-level page lists journals that closed registration, with no roles under them | 🐞 | minor | — |
| [A6](#a6) | With validation required and no technical support contact on the journal, "Register" ends on an empty page and leaves a disabled account nobody can activate | 🐞 | medium · crash: server | issues (claude), 2026-10-04 — re-verified |
| [OMP1](#omp1) | On a press site's site-wide Register page, the two privacy consent refusals show raw codes | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [OMP2](#omp2) | On a press site, every press's consent line is on screen before any role is ticked | 🐞 | minor | — |
| [OPS1](#ops1) | A preprint-server site's Register page asks for reviewing interests though no reviewer role exists, and the profile never shows them | 🐞 | minor | — |
| [A5](#a5) | The Register page's "Login" link aims at the profile's Roles tab, but sign-in lands as usual | ❓ | minor | — |
| [A7](#a7) | A journal-level registration grants Reader even when the Reader role is closed to self-registration | ❓ | latent | — |

### All apps

<a id="a1"></a>
**A1 — Validation link lifetime does not follow its configuration key** · 🐞 · latent.
The configuration file's email section carries `validation_timeout = 14`,
described as "the number of days a user has to validate their account before
their access key expires". The activation link actually lives as long as any
invitation, 3 days by default, and changing the key changes nothing. A
registrant who opens the email on day four is told the invitation is
unavailable, with no way to have a new link sent. The key predates the move
of activation links onto the invitation machinery and was left behind.
Basis: judgment (a clock, not a screen, would settle it). <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — A new user activating their account sees two pages with no heading and no Login link** · 🐞 · low.
The page the emailed activation link opens ("Confirm and activate your
account") and the page after "Activate Account" (the thank-you
sentence) both have no heading. The title area and the current
breadcrumb are empty, and the browser tab shows only the journal's
name, where the other one-message pages (such as "Reset Password" or
"Registration awaiting verification") carry a title. The second page
says the user "may now log in" but offers no Login link; its only link
is the breadcrumb's "Home".

It happens only where an administrator has turned on email validation
for new accounts (`require_validation` in the install's configuration
file, off by default), on every journal, press or server of that
install.
Basis: probe, 2026-10-04. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Site-level notification opt-in is decorative** · 🐞 · minor.
The site-level Register page offers "Yes, I would like to be notified of new
publications and announcements.", the same box as a journal's page, but the
answer is never recorded: an account registered from the site page with the
box unticked keeps every journal's public notification emails on, where the
same choice on a journal's page switches them off. Nothing tells the visitor
their choice was dropped.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Closed journals listed with nothing to tick** · 🐞 · minor.
Under "Which journals on this site would you like to register with?" every
enabled journal is listed by name, including one that closed registration.
Such a journal shows the "Request the following roles." heading with no
checkbox under it, an invitation the page cannot honor, while its privacy
consent line is still part of the block. A disabled journal, by contrast, is
left out. Expected: journals with closed registration are left out the same
way.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — The "Login" link's destination is dropped** · ❓ · minor.
The "Login" link beside the "Register" button carries the profile's Roles
tab as the place to continue to after signing in (the natural "I already
have an account, let me add this journal" path). Sign-in only honors a
destination written as a site-relative address, and this one is absolute,
so the user lands where an ordinary sign-in would (an Author on their
submissions list, a Reader on the journal homepage), not on the Roles tab.
Question: should the link land on the Roles tab, as built, or is the
ordinary landing fine? Lean: restore the intended landing; the Roles tab
is where an existing user "registers" with a journal.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — No technical support contact: registration crashes and strands the account** · 🐞 · medium · crash: server.
When validation is required (an install setting, off by default) and the
journal has no technical support contact, pressing "Register" with a valid
form on the journal's own Register page ends on an empty page: the app
fails on the server. That is the state of every journal created under
Administration › Hosted Journals until its Contact settings are saved; the
dataset's journal has a support contact, and the Contact form will not
save without one. The account has nevertheless been created and disabled
with the "We've sent a confirmation email…" reason, and no email was sent:
signing in is refused with that reason, and registering again is refused
because the username and email are taken. Adding a support contact
afterwards helps only later registrations; an account already locked
stays locked until a manager uses "Enable User" on it under Users & Roles.
The site-wide Register page is not affected. Expected: the email sent from
the journal's principal contact when it has no support contact.
A second cause strands the account the same way behind a page that says
the email went out: when the mail server cannot be reached, the visitor
sees "Registration awaiting verification" and "We've sent a confirmation
email to you at …", no email goes out, and the account stays disabled
with that reason, with no way to have the link sent again.
Basis: probe, 2026-10-04. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Reader is granted even when closed to self-registration** · ❓ · latent.
A Journal Manager who unticks "Allow user self-registration" on the Reader
role (and on Reviewer) still finds the Register page open and every new
registrant listed as a "Reader" on the Users tab; the registrant's own
profile Roles tab shows no Reader box and nothing ticked, so neither side
can see the role being handed out. Expected from the setting's wording: no
role a visitor may not self-register for.
Question: should a journal-level registration still grant Reader when the
Reader role is closed to self-registration, and if not, what should the page
do? Lean: it should not; the setting reads as a promise, and a journal that
wants no self-registered Readers has no other way to say so short of closing
registration altogether.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — On a press site's site-wide Register page, the two privacy consent refusals show raw codes** · 🐞 · low.
On the site-wide Register page of a press installation, the two privacy
consent refusals print a bare code, such as
`##user.register.form.missingContextConsent##`, because the press
application lacks the two English sentences that the journal and
preprint server applications have. One refusal shows when a visitor
presses "Register" without ticking the site's privacy consent. The other
shows when a visitor ticks a role under a press but leaves that press's
own consent box unticked.

A journal site prints "You must consent to this site's privacy
statement." or "You must consent to the privacy statement for any
journal with which you are registering." A preprint server site prints
the same, with "server" in place of "journal". A press's own Register
page refuses an unticked consent with a proper sentence.

The refusal itself is right and nothing is stored. Only the reason is
lost: the visitor has to work out from the code which box to tick.

The press refusal can show on any press site. The site refusal shows
only when the site has a Privacy Statement, and the Site Administrator
can type one only when the site does not host exactly one press.
Basis: probe, 2026-10-04. <sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — Press consent lines shown before any role is ticked** · 🐞 · minor.
On a press site's site-level Register page, the line "Yes, I agree to have
my data collected and stored according to this press's privacy statement."
is on screen under every press that has a statement from the moment the
page opens, ticked role or not, where a journal or preprint-server site
keeps each line hidden until a role of that journal is ticked. The visitor
is shown consent boxes for presses they never chose; the refusal itself
(Rule 5) is the same on every app.
Basis: probe. <sup>[f-omp2](#fn-omp2)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Reviewing interests asked for on a site with no reviewers** · 🐞 · minor.
A preprint-server site's Register page shows "If you requested to be a
reviewer, please enter your subject interests." although no preprint server
has a reviewer role and no server block offers one. Interests typed there
are accepted without complaint and then have no visible home: the server's
profile Roles tab has no "Reviewing interests" field. The journal-level page
correctly omits the field.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Pages: `PKP\pages\user\RegistrationHandler` (ops `register`,
`registerUser` [alias of `register`], `activateUser`; `validate()` override
= the closed-registration gate), dispatched by `lib/pkp/pages/user/index.php`
(`default:` branch of each app's `pages/user/index.php`). Templates
`lib/pkp/templates/frontend/pages/userRegister.tpl` (form shell, consent,
reviewer offer, spam blocks, buttons), `frontend/components/registrationForm.tpl`
("Profile" and "Login" fieldsets), `frontend/components/registrationFormContexts.tpl`
(site-level journal list), `frontend/pages/userRegisterComplete.tpl`,
`frontend/pages/userConfirmActivation.tpl`, plus the generic
`frontend/pages/message.tpl` and `error.tpl`. **Chain check** (multi-app
rule 8): the handler is byte-identical in the three checkouts' `lib/pkp`;
no app has a `pages/user/RegistrationHandler.php`; each app's
`APP\pages\user\UserHandler` (the parent) adds only OJS subscription ops,
nothing on OMP, an incomplete-setup check on OPS — none touches
registration; no app and no default theme overrides any of the templates
above (only OJS adds `userSubscriptions.tpl` to `templates/frontend/pages`).
ORCID block: `RegistrationForm::fetch()` assigns it only when a context is
present and the plugin is enabled (`form/orcidProfile.tpl`). Button and
link: `button.submit` "Register", `a.login` → `login?source={profile/roles URL}`.
Live-probed 2026-09-02 on the seeded journal, press and server: the
signed-out header reads "Register Login"; "Register" opens
`{context}/en/user/register`, title "Register", "Required fields are marked
with an asterisk: *", legends "Profile" and "Login" with the labels, asterisks
and caps of the Fields tables, one "Register" button and a "Login" link
beside it; the site-level page has the same two sections. No ORCID block on
any page (the plugin is not enabled on the seeded journal; the enabled state
is *ORCID integration*'s to verify).

<a id="fn-b"></a>
**b** — `PKP\user\form\RegistrationForm::__construct()` checks, in order:
`FormValidatorCustom` username exists (`Repo::user()->getByUsername($u, true)`,
`user.register.form.usernameExists`), `FormValidator` username required,
`FormValidatorUsername` (`/^[a-z0-9]+([\-_][a-z0-9]+)*$/`,
`user.register.form.usernameAlphaNumeric`), `FormValidatorPassword` on
`password` with comparison `password2` (Laravel rules `required`, `confirmed`,
`Password::min(site minPasswordLength)->uncompromised()`; messages
`user.profile.form.passwordRequired`, `user.register.form.passwordsDoNotMatch`,
`user.register.form.passwordLengthRestriction`; the uncompromised verifier is
a no-op unless the site setting `passwordUncompromisedEnabled` is on —
`ValidationServiceProvider`), `givenName` required, `country` required,
`FormValidatorEmail` (`user.profile.form.emailRequired`), email exists
(`getByEmail($e, true)`, `user.register.form.emailExists`), then the captcha
validators (note f), `privacyConsent` required when the context has a
privacy statement, POST and CSRF. Lookups use `LOWER(username) = LOWER(?)` /
`LOWER(email) = LOWER(?)` (`PKP\user\DAO`), with `allowDisabled = true`
(Rule 15). Affiliation has only the template's `required` attribute (no
server check). Input caps: `maxlength` 255 (names), 90 (email), 32
(username, both password boxes). Errors render through
`common/formErrors.tpl` (`form.errorsOccurred`). Country list:
`Locale::getCountries()` sorted by local name, blank first option
(live-probed 2026-09-02, 249 names on all three apps: the order breaks at
Czechia / Côte d'Ivoire, Rwanda / Réunion, Tuvalu / Türkiye and Zimbabwe /
Åland Islands, a byte-order sort of the names).
Live-probed 2026-09-02, identical on OJS, OMP and OPS: an all-empty form
never left the browser (Chromium's "Please fill out this field." on Given
Name, "Please select an item in the list." on Country), so the site's own
"A given name is required." and "A country is required." are unreachable
from the screen; likewise "A valid email address is required." — "abc" was
stopped by the browser ("Please include an '@' in the email address.") and
"a@b" passed the browser and the site's check (the only line left was the
consent one). Usernames `NewUser1`, `-abc`, `ab_-cd`, `ab.cd` → the format
sentence, the box kept as typed; `reader.rosa` and `Reader.Rosa` → "The
selected username is already in use by another user." (the taken check
reports first, one line per field); `reader.rosa@mail.test` in either case →
"The selected email address is already in use by another user."; password
`a` → "The password must be at least 6 characters." (site minimum 6, read at
Administration › Site Settings › Security, "Minimum password length
(characters)"); a mismatched repeat → "The passwords do not match." linking
to the first box; all faults at once → username, password, email, consent
lines in that order with the length line absent; 34 typed characters cut to
32 in the username and both password boxes; after every refusal both
password boxes were empty and the other values kept.

<a id="fn-c"></a>
**c** — Role content: `PKP\user\form\UserFormHelper::assignRoleContent()`
(every enabled context via `ContextDAO::getAll(true)`; reviewer/author/reader
groups only for contexts without `disableUserReg`) and `saveRoleContent()`
(assigns ticked groups with `permitSelfRegistration`, per context with open
registration). `RegistrationForm::execute()`: with a context and no
`reviewerGroup` ticked → `Repo::userGroup()->getByRoleIds([ROLE_ID_READER],
$contextId, true)` (the default reader group) is assigned; otherwise
`saveRoleContent()` (so Reviewer replaces Reader, Rule 7). Journal-level
offer: `userRegister.tpl` counts the context's reviewer groups with
`permitSelfRegistration`; one → checkbox `user.reviewerPrompt.optin`, several →
legend `user.reviewerPrompt` + `user.reviewerPrompt.userGroup` per group.
Site-level: `registrationFormContexts.tpl` loops `$contexts` (all enabled
contexts, closed ones included — finding A4) and renders `readerGroup[]` /
`reviewerGroup[]` boxes for self-registering groups; author groups are
assigned to the template but never rendered on either page. Seed
(`registry/userGroups.xml`, `permitSelfRegistration="true"`): OJS author,
externalReviewer ("Reviewer"), reader; OMP author, chapterAuthor,
externalReviewer ("External Reviewer"; internalReviewer lacks the flag),
reader; OPS author, reader (no reviewer group at all; OPS's English text
does not even carry the `user.reviewerPrompt*` strings, so a reviewer group
created by hand there would show raw codes — not in scope of the default
install). Live-probed 2026-09-02 on all three apps. Journal level, seeded
context: OJS and OMP show one reviewer box without a legend ("Yes, I would
like to be contacted with requests to review submissions to this journal." /
"…to this press."), OPS none, with the notification box present on all
three as the control. After making OMP's Internal Reviewer self-registering
on a scratch press (Settings › Users & Roles › Roles › "Edit" › "Role
Options" › "Allow user self-registration"), the block gained the legend
"Would you be willing to review submissions to this press?" with "Yes,
request the External Reviewer role." and "Yes, request the Internal Reviewer
role.", the interests box hidden until either was ticked; an OJS scratch
journal kept the single box. Unticking the flag on Reviewer / External
Reviewer removed the reviewer block and "Reviewing interests" while the
notification box stayed; unticking it on Reader as well left the form
rendering and registering, the manager's Users tab listing the new account
with "Reader" in its Roles column, and the account's own Roles tab showing
no Reader box and nothing ticked (finding A7). Registering with the box
ticked gave Reviewer (OMP: External Reviewer) ticked and Reader unticked on
the Roles tab. Site level: the legend reads "Which journals / presses /
servers on this site would you like to register with?", each block "Request
the following roles." with "Reader" + "Reviewer" (OJS), "Reader" + "External
Reviewer" (OMP), "Reader" (OPS); registering with "Reader" under the seeded
context and the reviewer role (OPS: "Reader") under a scratch one gave
exactly those two boxes ticked on the Roles tab and nothing else; with
nothing ticked, an account with no box ticked anywhere. With a scratch
context closed to registration, a disabled one and a sign-in-restricted one
on the same site: the closed one listed with the legend and no role box,
the disabled one absent, the restricted one with its usual boxes.

<a id="fn-d"></a>
**d** — Journal-level: `userRegister.tpl` renders `privacyConsent` inside
`{if $currentContext}` when `$currentContext->getData('privacyStatement')`;
label `user.register.form.privacyConsent` with `about/privacy` link; server
check `user.profile.form.privacyConsentRequired`. Site-level:
`RegistrationForm::validate()` — site statement present and
`privacyConsent[0]` missing → `user.register.form.missingSiteConsent`; unless
`[general] sitewide_privacy_statement`, for each context of a ticked group
with a `privacyStatement` and no `privacyConsent[{id}]` →
`user.register.form.missingContextConsent` (first miss only). Template:
`registrationFormContexts.tpl` renders the per-context box when
`!$enableSiteWidePrivacyStatement && $context->getData('privacyStatement')`,
hidden off-screen (`.context_privacy` in the default theme's `register.less`)
until a role box of that context is ticked (`plugins/themes/default/js/main.js`
toggles `context_privacy_visible`); the site box when
`$siteWidePrivacyStatement` (`Site::privacyStatement`). Consent is enforced,
never stored (code reading: `execute()` keeps nothing from the consent
boxes, and no screen shows a consent record either way). The single-statement
mode is code reading too: `sitewide_privacy_statement` is `Off` in all three
configuration templates and was not switched on; the one observation that
settles it is the site-level page with the key `On` and a site statement
set, recording whether the per-journal lines are gone. Statement forms: `PKPPrivacyForm` (journal),
`PKPSiteInformationForm` (site, label `manager.setup.privacyStatement`).
Live-probed 2026-09-02, all three apps: the seeded context and every context
created through the test API carry the installer's default statement ("The
names and email addresses entered in this journal site will be used
exclusively for the stated purposes of this journal…", press/server wording
on OMP/OPS), so their journal-level pages show the consent box and refuse an
unticked one with "You must agree to the terms of the privacy statement."; a
scratch context whose statement was emptied on Settings › Website › Setup ›
"Privacy Statement" ("Saved") shows no box and its `about/privacy` answers
404. "privacy statement" opens `{context}/about/privacy` in a new tab
(`target="_blank"`), heading "Privacy Statement". Site level, with a site
statement set through Administration › Site Settings › Site Setup ›
Information: the site box appears, and left unticked OJS and OPS print "You
must consent to this site's privacy statement." while OMP prints
`##user.register.form.missingSiteConsent##` (OMP1); with a role ticked and
its context's line unticked OJS prints "You must consent to the privacy
statement for any journal with which you are registering.", OPS "…any
server…", OMP `##user.register.form.missingContextConsent##`, one line even
with two contexts short. With no role ticked and no site statement the form
registers with no consent at all. The per-context line sat off-screen
(`left: -9999px`) until a role was ticked on OJS and OPS, on OMP in normal
flow from the start (OMP2).

<a id="fn-e"></a>
**e** — `RegistrationForm::execute()`: only `if ($request->getContext() &&
!$this->getData('emailConsent'))` → the context's public notification
category (`NotificationSettingsForm::getNotificationSettingCategories()`,
key `notification.type.public`) is written to
`blocked_emailed_notification` for the user; at site level the box is read
(`readUserVars`) and ignored (finding A3). Label
`user.register.form.emailConsent`, unticked by default on both pages.
No other mail is sent by `execute()` or the handler; the validation mail is
note i. Live-probed 2026-09-02, all three apps, on the seeded context: the
box is unticked on load; an account registered with it unticked shows, on
the profile's Notifications tab under "Public Announcements", "Enable these
types of notifications." ticked and "Do not send me an email for these types
of notifications." ticked for every row (OJS: announcement, issue published,
issue open access; OMP/OPS: the announcement row), every other section at
its defaults; registered with it ticked, the "Do not send…" boxes are
unticked; registered from the site-level page with it unticked, identical
to the ticked control (A3).

<a id="fn-f"></a>
**f** — `RegistrationForm`: `captchaEnabled = [captcha] captcha_on_register
&& recaptcha` → `FormValidatorReCaptcha` (POSTs to
`recaptcha.net/recaptcha/api/siteverify`; `recaptcha_enforce_hostname`
compares the response hostname), template `div.g-recaptcha` with
`recaptcha_public_key`; `altchaEnabled = altcha && altcha_on_register` →
`FormValidatorAltcha` (HMAC `altcha_hmackey`, challenge `maxNumber` from
`altcha_encrypt_number`, default 10000), template `<altcha-widget …
floating>` plus `lib/pkp/js/lib/altcha/altcha.i18n.js`. Both validators
report every failure as `common.captcha.error.missing-input-response` ("You
must complete the validation check used to prevent spam submissions."); the
key they are constructed with, `common.captcha.error.invalid-input-response`,
has no English text and is never shown. Config template
(`config.TEMPLATE.inc.php` `[captcha]`, identical in the three apps):
`recaptcha = off`, `captcha_on_register = on`, `captcha_on_login = on`,
`altcha = off`, `altcha_on_register = on`, `altcha_on_login = on`,
`altcha_on_lost_password = on`. The e2e `config.test.inc.php` leaves both
masters off; the validation-variant server's config turns `altcha` on with
every per-form switch. reCAPTCHA cannot be driven on the test install
(outbound HTTP fails fast at the dead-port proxy), so the widget claim rests
on the template. ALTCHA live-probed 2026-09-02 on all three apps, on the
variant server with `altcha = on`: at rest the Register page shows nothing
captcha-like (the `<altcha-widget … floating>` after the buttons holds a
`div.altcha[data-state="unverified"]` at `display: none`, and no
`input[name=altcha]` exists); on pressing "Register" the widget went
`verifying` and a 260×74 px floating box appeared reading "Verifying...
Protected by ALTCHA", then about 50 ms later `verified` with "Verified
Protected by ALTCHA", a hidden `altcha` field (320 base64 characters,
decoding to the solved challenge) was filled and the form posted; the only
ALTCHA traffic was the page script `lib/pkp/js/lib/altcha/altcha.i18n.js`.
Every registration of the validation probes ran that way, and the Login
form with `altcha_on_login = on` accepted sign-ins the same way; on the
seeded context of that server the pass then posted into finding A6's empty
page (no support contact there), the ALTCHA step itself complete: no spam
line, the `altcha` field filled. With
JavaScript off (OJS and OMP): the widget rendered empty, the form posted
without an `altcha` field and came back with "Errors occurred processing
this form:" and one line, "You must complete the validation check used to
prevent spam submissions.", the password boxes emptied and no account
created (a later sign-in with JavaScript on answered "Invalid
username/email or password. Please try again."); the same visitor's sign-in
attempt with JavaScript off was refused on the Login form with the same
sentence. A second try with the same username, still with JavaScript off,
got the same single line and no "already in use" line, and that username
then registered on the default server, so the refused attempts had created
nothing.

<a id="fn-g"></a>
**g** — Closed registration: `RegistrationHandler::validate()` — with a
context, `disableUserReg`; without one, closed only when every enabled
context has `disableUserReg`; renders `frontend/pages/error.tpl` with
`user.register.registrationDisabled` ("This journal/press/server is
currently not accepting user registrations."), page title `user.register`,
back link "Login". Header entry: navigation item type
`NMI_TYPE_USER_REGISTER` (`PKPNavigationMenuService::getDisplayStatus()`:
`!$isUserLoggedIn && !($context && $context->getData('disableUserReg'))`,
URL always `user/register` of the current context; the site's own "User
Navigation Menu" carries it, `registry/navigationMenus.xml`, all three
apps). Restricted access: `RestrictedSiteAccessPolicy` (added by
`PKPHandler::authorize()` when `restrictSiteAccess`) exempts the pages
`user`, `login`, `help`, `header`, `sidebar`, `payment`, `invitation`, so
`user/register` stays reachable; a *disabled* context, by contrast, sends
signed-out visitors to Login for every page but `login` and `invitation`
(`PKPPageRouter`). Settings screen: `PKPUserAccessForm`
(`restrictSiteAccess`, `disableUserReg`; labels quoted in *Settings*);
role flag `settings.roles.permitSelfRegistration` ("Allow user
self-registration"). Live-probed 2026-09-02 on scratch contexts of all three
apps. Closed (the option "The Journal Manager will register all user
accounts. Editors or Section Editors may register user accounts for
reviewers." / "The Press Manager will register all user accounts. Editors or
Section Editors may register user accounts for reviewers." / "The Server
Manager will register all user accounts." selected on Site Access Options;
the three radio labels re-read 2026-09-02): the homepage header read "Login" alone,
the Login page ("Home", "Forgot your password?") and the "Reset Password"
page carried no "Register"; the typed `user/register` address answered 200
with title "Register", the text "This journal is currently not accepting
user registrations." ("This press…" / "This server…") and a "Login" link,
no form. Sign-in required ("Users must be registered and log in to view the
journal site." ticked): the homepage and `about` landed on the Login page
(with a `source` back to the requested address), the header there reading
"Register Login", while the typed Register address rendered the full form
(reviewer box and "Reviewing interests" on OJS and OMP, neither on OPS).
Disabled (Administration › Hosted Journals › "Edit" › "Enable this journal
to appear publicly on the site" unticked, "Saved"): the Register address,
the homepage and `login` all landed on `{context}/login`, title "Login",
whose header and in-form "Register" links both pointed at
`{context}/user/register`, which answered the same Login page again, with no
message about the disabled state; `reader.rosa`, signed in, at the disabled
context's Register address got "Registration complete" (2026-09-02, all
three apps). Site level, live-probed 2026-09-02 with
every context of each app (OJS 16, OMP 12, OPS 10) set to "The Journal
Manager will register all user accounts…" and restored afterwards: the site
homepage header still read "Register Login"; its "Register" (clicked, or
`index/user/register` typed with or without the locale segment) answered
200, title "Register", `main` reading "Home / Register", "Register", "This
journal is currently not accepting user registrations." ("This press…" /
"This server…") and a "Login" link, no `form#register`; the site Login page
(`index/en/login`) kept the header entry but its in-body "Register" link
(`user/register?source=`), present while any context was open, was gone,
and came back on restore. The site "Reset Password" page
(`index/en/login/lostPassword`) carries the same in-body "Register"
(`index/en/user/register?source=`) while any context is open (live-probed
2026-09-02, all three apps; an earlier reading that it carried none did not
reproduce); whether it drops the link in the all-closed state was not
re-probed. Who reaches the settings screen, live-probed 2026-09-02 on all
three apps: Settings › Users & Roles (tabs "Users", "Roles", "Site Access
Options", "ORCID") opened for `manager.maya` and, on OJS and OMP, for
`editor.diana` (role "Journal editor" / "Press editor", "Permission level"
column "Journal Manager" / "Press Manager"); `sectioneditor.ana` landed on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
"The current role does not have access to this operation." OPS seeds no
editor role (its Roles grid: "Preprint Server manager", "Moderator",
"Author", "Reader", "Editorial Board Member").

<a id="fn-h"></a>
**h** — Signed-in visitor: `RegistrationHandler::register()` —
`Validation::isLoggedIn()` → `userRegisterComplete.tpl` with title
`user.login.registrationComplete`, before any registration-closed check.
Post-registration: `Validation::login()` then, when `source` matches
`#^/\w#`, `redirectUrl($source)`, else `redirect(null, 'user', 'register')`
→ the same completion page. Completion links: "View Submissions"
(`user.login.registrationComplete.manageSubmissions`, `{url page="submissions"}`
→ `DashboardHandler::index()` → `redirectHome()`) when `$userRoles`
(assigned by `PKPHandler::setupTemplate()` from `UserRolesRequiredPolicy`,
the roles held in the current context) intersects Manager, Sub-editor,
Assistant, Reviewer; "Make a New Submission" (`{url page="submission"}`)
when `$currentContext`; "Edit My Profile" (`user/profile`); "Continue
Browsing" (`{url page="index"}`). Login link: `userRegister.tpl` builds
`login?source={url page="user" op="profile" path="roles"}` (absolute URL);
`LoginHandler::signIn()` honors `source` only when it matches `#^/\w#`, so
the absolute URL is dropped (finding A5). Profile Roles tab:
`PKP\user\form\RolesForm` + `user/userGroups.tpl` (labels
`user.register.registerAs` "Register in {contextName} as...",
`user.profile.form.showOtherContexts` "Register with other journals") —
*User profile*'s; on screen (live-probed 2026-09-02, all three apps) the tab
is headed plainly "Roles" and the journal-level page folds the other
contexts under "Register with other journals / presses / servers"; the
site-level address `index/en/user/profile/roles`, and "Edit My Profile" from
the site-level completion page, redirected (2026-09-02, all three apps) to
`{seeded context}/en/user/profile?0=roles`, the journal-level tab with the
seeded context first and the rest folded, so an earlier flat-list reading
did not reproduce; a user holding no role in any context was not probed;
the "Register in … as…" string was not seen. Since pkp/pkp-lib#13181
(lib/pkp `aeac6f75cf`, 2026-09-16; live-probed 2026-09-18, all three apps)
that forward keeps the tab and writes no `?0=`: `index/en/user/profile/roles`
ends on `{context}/user/profile#roles` with Roles open, and "Edit My Profile"
(`index/en/user/profile`, no tab named) on `{context}/user/profile` with
Identity open (*User profile* Rule 3, its retired finding A1).
Live-probed 2026-09-02 on all three apps. A valid
journal-level registration on the seeded context stayed at
`{context}/en/user/register`, title "Registration complete", "Thanks for
registering! What would you like to do next?", links "Make a New
Submission" (→ `{context}/en/submission`, "Make a Submission"), "Edit My
Profile" (→ `user/profile`, "Profile") and "Continue Browsing" (→
`{context}/en/index`, the homepage), no "View Submissions"; the header
showed the username with "Dashboard", "View Profile", "Logout"; the Roles
tab had "Reader" ticked and nothing else. With the reviewer box ticked the
page led with "View Submissions" →
`dashboard/reviewAssignments?currentViewId=reviewer-action-required`,
heading "Action Required by me (0)". Site level (seeded plus scratch
context, roles ticked in both): "Edit My Profile" (→ `index/en/user/profile`)
and "Continue Browsing" (→ `index/en/index`) only; the same two for `admin`
at `index/en/user/register`. Interrupted destination: typing
`{context}/en/dashboard/mySubmissions` signed out gave the Login page with
`source=/index.php/{context}/en/dashboard/mySubmissions`; its header
"Register" carried no `source`, the "Register" link below the form carried
it into `form#register` as a hidden field; registering there landed on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
"The current role does not have access to this operation.", signed in; the
control with `user/profile` as the destination landed on "Profile". Signing
out and in again as the new Reader (username, then the email address as the
username) landed on `{context}/en/index` on all three. Signed-in visitors:
`author.alex` at the journal address got the three links; `editor.diana`
(OJS, OMP) and `sectioneditor.ana` (OPS) got "View Submissions" as well;
`admin` on a scratch context closed to registration got all four links and
no closed message. The role gate re-probed 2026-09-02 with every seeded user
at `{context}/en/user/register`: "View Submissions" shown for `manager.maya`,
`editor.diana` (OJS, OMP), `sectioneditor.ana`, `reviewer.julia` (OJS, OMP),
`copyeditor.carla`, `layouteditor.leo`, `proofreader.pia` (OJS, OMP),
`assistant.rita` (Funding coordinator on OJS and OMP, Editorial Board Member
on OPS) and `admin` (a Journal manager of the seeded context per its Users
list, which is why the administrator gets it there); not for `author.alex`
or `reader.rosa`. Managers, editors and assistants landed on
`dashboard/editorial?currentViewId=assigned-to-me`, heading "Assigned to me
(N)". "Make a New Submission" on OPS (live-probed 2026-09-02,
incidental): a fresh Reader who opened it from the completion page and
pressed nothing was, at the next sign-in, landed on the submissions
dashboard headed "My Submissions as Author"; the OJS and OMP controls stayed
Readers and landed on the homepage (the wizard's preprint-server enrolment,
*Submission wizard*'s finding).

<a id="fn-i"></a>
**i** — Validation flow. `RegistrationForm::execute()`: when `[email]
require_validation`, the new user is saved `disabled = true` with
`disabledReason = __('user.login.accountNotValidated', ['email' => …])`.
`RegistrationHandler::register()` fires `UserRegisteredContext` /
`UserRegisteredSite`; listener `PKP\observers\listeners\ValidateRegisteredEmail`
(only when `require_validation`) builds `ValidateEmailContext`
(`USER_VALIDATE_CONTEXT`, from the context's `supportEmail`/`supportName`)
or `ValidateEmailSite` (`USER_VALIDATE_SITE`, from the site's contact),
creates a `RegistrationAccessInvite` (`initialize(userId, contextId)`,
`invite()` — deletes older pending invitations of the same type for the
user, expiry `[invitations] expiration_days`, default 3), sets
`activateUrl` = `{context}/invitation/accept?id=…&key=…`, and sends the
stored template (subject "Validate Your Account"; body
`emails.userValidateContext.body` / `emails.userValidateSite.body`, ending
"Thank you," + signature). Then the handler renders `message.tpl` with title
`user.login.registrationPendingValidation` ("Registration awaiting
verification") and the `accountNotValidated` sentence; no sign-in. A
`TransportException` on send is caught: a trivial error notification
(`email.compose.error`) is created for the new user and the same pending
page is shown (finding A6). **Chain check**: all three
`registry/emailTemplates.xml` seed both keys; OPS's
`classes/mail/Repository::map()` override lists both mailables. Sign-in
before activation: `PKPUserProvider::retrieveByCredentials()` fetches with
`allowDisabled = true`, `Validation::registerUserSession()` refuses with the
disabled reason → `user.login.accountDisabledWithReason`. Activation:
`InvitationHandler::accept` → `RegistrationAccessInviteRedirectController::acceptHandle()`
(status must be PENDING) renders `userConfirmActivation.tpl`
(`user.login.activate.description`, button `user.login.activate` →
`user/activateUser/{username}?invitationId=…&invitationKey=…`);
`RegistrationHandler::activateUser()` — `Repo::invitation()->getByIdAndKey()`
(pending, not expired, key verified; otherwise redirect to `login`),
`finalize()` (enables the user, clears the reason, sets `dateValidated`,
marks ACCEPTED), then `message.tpl` with `message = user.login.activated`
and no `pageTitle` (finding A2). Legacy two-argument form
`user/activateUser/{username}/{key}` resolves the invitation by key hash.
Dead links: `InvitationHandler::getInvitationByKey()` renders
`invitation/invitationUnavailable.tpl` for a correct key on a handled or
expired row, 404 otherwise. Site-level mail: `ValidateEmailSite` fills
`{$siteTitle}` from `Site::title` (`SiteEmailVariable`), which the test
site never had set (its `site_settings` hold only `contactName` /
`contactEmail`), while the site schema lists `title` as required, so the
blank is the test fixture's, not a defect. Live-probed 2026-09-02 on all
three apps, on the validation-variant server (`require_validation = On`),
against a scratch context whose manager had set Settings › Journal ›
Contact › "Technical Support Contact" ("Saved"): the Register POST answered
200 and stayed at `{context}/user/register`, title "Registration awaiting
verification | {context}", `h1` "Registration awaiting verification",
breadcrumb "Home / Registration awaiting verification", body "We've sent a
confirmation email to you at {email}. Please follow the instructions in that
email to activate your new account. If you do not see an email, please check
to see if it was put in your spam folder.", the breadcrumb's "Home" the only
link, header "Register Login". Signing in then re-rendered `login/signIn`
with "Your account has been disabled for the following reason: We've sent a
confirmation email to you at {email}. Please follow…" (the whole sentence).
Mailpit held exactly one message per address: subject "Validate Your
Account", From the context's support contact ("Support X
<u02g7-support-x@mail.test>" on OJS), body "{name}\n\nYou have created an
account with {context}, but before you can start using it, you need to
validate your email account. To do this, simply follow the link below:\n\n
{base_url}/index.php/{context}/invitation/accept?id=…&key=…\n\nThank
you,\n\n—\n\nThis is an automated message from {context} ( {context URL} )."
The link answered 200 with an empty page title (tab "| {context}"), no
heading, breadcrumb "Home /", text "Confirm and activate your account" and
one control "Activate Account", an anchor styled as a button (no `<form>`)
to `user/activateUser/{username}?invitationId=…&invitationKey=…`. Pressing
it: 200 at that address, empty title and an empty `h1`, "Thank you for
activating your account. You may now log in using the credentials you
supplied when you created your account.", the only link "Home", header still
"Register Login"; sign-in then landed on `{context}/index` with the username
in the header. Opening the `activateUser` address again after activation:
200, the Login page (`h1` "Login"), no message. The browser's Back button
from the thank-you page re-requested the emailed link and got "Invitation
Unavailable" ("This invitation is no longer available. It may have already
been accepted, declined, or expired. Please contact the journal manager for
further assistance.", buttons "Login" and "Register"), the "Activate
Account" control gone; the emailed link reopened later gave the same page.
The emailed link with the last character of `key` changed: 404, `h1` "404
Not Found", empty `<title>`, no theme header, no text, no links. Site level:
the same pending page at `index/en/user/register` (title "Registration
awaiting verification" without suffix), the mail From the site contact
("Open Journal Systems <admin@mail.test>"; "Open Monograph Press" /
"Open Preprint Systems" on OMP and OPS), body "You have created an
account with , but before you can start using it…", signed "Thank you,\n\n
Open Journal Systems" with no automated-message footer, link
`index/en/invitation/accept?id=…&key=…`; the same activation pages; sign-in
landed on `index/en/index`, the site's context list. Enabling a dead-link
account, live-probed 2026-09-02 on all three apps as the scratch context's
manager: Users & Roles › Users, the row menu "Enable User" → dialog "Enable
{name}", "Current Roles : Reader", "Reason for enabling user", "Once the
user is enabled, they will regain access to the site, and you'll be able to
invite them to roles as needed.", "Cancel" / "OK"; after "OK" the account
signed in and landed on the journal homepage. No screen offers the
validation requirement or a spam check (live-probed 2026-09-02, all three
apps): Settings › Users & Roles ("Users", "Roles", "Site Access Options",
"ORCID") and Administration › Site Settings › Site Setup › Security
("Password Policy", "Compromised Password Check", "Rate Limiting") carry no
such switch; the remaining Site Settings tabs were not swept, so the
configuration keys stand as the documented switches. On the seeded context
(`publicknowledge`, no support contact on any app): the Register POST
answered 500 with an empty page (server log `Symfony\Component\Mime\
Exception\LogicException: An email must have a "From" or a "Sender" header.`
from `ValidateRegisteredEmail::manageEmail()` → `Mail::send()` in
`RegistrationHandler::register()`), Mailpit held nothing for the address
after 20 s, and sign-in was refused with the disabled reason above (finding
A6).

<a id="fn-j"></a>
**j** — `PKP\task\RemoveUnvalidatedExpiredUsers::executeActions()`: returns
early unless `[email] require_validation`; reads `[general]
user_validation_period` (days; ≤ 0 → nothing); deletes users with
`date_validated IS NULL AND date_last_login IS NULL AND date_registered <
now − period` (`PKP\user\DAO::deleteUnvalidatedExpiredUsers()`). Registered
`monthlyOn(1)` in the scheduler of every app (`PKPScheduler`); name
`admin.scheduledTask.removeUnvalidatedExpiredUsers`. `[email]
validation_timeout` is read nowhere in `lib/pkp`, `classes/` or `pages/` of
any app (grep 2026-09-02) — finding A1. Nothing in this note is observable
from a screen (checked 2026-09-02): no page runs or lists the task
(Administration offers "Clear Scheduled Task Logs" only), and the 3-day
lifetime needs a clock; the file facts were re-read in the three checkouts'
templates (`require_validation = Off`, `validation_timeout = 14`,
`user_validation_period = 28`, `expiration_days = 3`, identical).

<a id="fn-k"></a>
**k** — Interests: `input#interests` (journal-level inside the reviewer
fieldset, `#reviewerInterests` hidden on load and shown once the reviewer
box is ticked — live-probed 2026-09-02 on OJS and OMP; OPS renders no such
element; site-level `.reviewer_nocontext_interests` with
`user.register.noContextReviewerInterests`, rendered whenever
`!$currentContext`, OPS included — finding OPS1);
`Repo::userInterest()->setInterestsForUser()` splits on commas into the
site-wide interest vocabulary — live-probed 2026-09-02: "ethics, statistics"
typed at journal level became two chips "ethics" and "statistics" under
"Reviewing interests" on the OJS and OMP Roles tab; two comma-separated
interests typed on the site-level page became two chips on OJS and OMP,
while the OPS Roles tab has no "Reviewing interests" field (OPS1).
Multilingual copy: `execute()` writes
`givenName`, `familyName`, `affiliation` in `Locale::getLocale()` and again
in the site primary locale when different (Rule 16). Live-probed
2026-09-02, all three apps: registered on `{context}/fr_CA/user/register`
(title "S'inscrire", ending on "Inscription complétée") with Given Name
"Prénom", Family Name "Nom" and affiliation "Laboratoire FR"; the profile's
Identity and Contact tabs then showed those values in the `[en]` boxes (the
copy into the site's primary language). No screen renders the fr_CA value:
the profile shows only `[en]` boxes whichever locale it is opened in, and
the manager's Users › "Edit" prints the name once, read-only, so the storage
under the page's language stays code reading.

<a id="fn-s"></a>
**s** — Scenario seeding: the seeded journal/press/server
(`publicknowledge`) has registration open and every default role, and ships
with the installer's default Privacy Statement on all three apps (note d),
so every registration on it ticks `input[name=privacyConsent]` (journal
level) or the `privacyConsent[…]` line under each ticked context (site
level); a scratch context from `POST scenarios/context` arrives with the
same default statement. Roster passwords are the username doubled
(`users.md`). Scenarios 1–3, 6–7: a throwaway username per test and app
(pattern `u02<case>-<app>`; Mailpit is shared by the fleets, so the app is
part of every address), email `<username>@mail.test`, observed in the
mail catcher scoped by recipient; profile Roles tab reached via "Edit My
Profile". Scenario 1 registers three accounts: `u02s1-<app>` from the
header's "Register", with the notification box (`input[name=emailConsent]`,
unticked on load) left unticked, after which "Edit My Profile" ›
Notifications is read for the "Public Announcements" rows (note e names
the boxes) and Mailpit, scoped by `u02s1-<app>@mail.test`, must hold no
message; `u02s1b-<app>` in a fresh browser context after typing
`{context}/en/dashboard/mySubmissions` signed out (the Login page's hidden
`source` carries the address into the form behind the "Register" link
below the Login form; the refusal lands on `user/authorizationDenied`, note
h); `u02s1c-<app>` in a fresh browser context on
`{context}/fr_CA/user/register` (the seeded journals carry `fr_CA` as a UI
language on all three apps, `seed-facts.md`; the French page's own strings
are not asserted), the profile's Identity and Contact tabs then read for the
`[en]` boxes (note k). Scenario 2 reuses `reader.rosa`'s username and email
as the taken values (typed `Reader.Rosa`, `READER.ROSA@MAIL.TEST`); the site
minimum is 6 on the test installs. Scenario 3's absence control on OPS: the
notification checkbox present, the reviewer box absent. Scenarios 4–6: a
scratch context from `POST scenarios/context` (Journal Manager
`manager.maya` or the scratch manager). Scenario 4's second half empties
the rich-text field on Settings › Website › Setup › "Privacy Statement" and
saves ("Saved"; the save echoes an empty `privacyStatement`) before the
visitor reloads Register; the closed-registration option (scenario 5) is
on Settings › Users & Roles › Site Access Options. Scenario 5 seeds two
scratch contexts, the second with `context.enabled: false` (the disabled
journal; `admin` is enrolled as a manager in every scratch context, and
Rule 4 holds for any signed-in user); the manager's session stays signed
in for the two completion-page reads at `{closed context}/user/register`
and `{disabled context}/user/register`, the visitor's reads run in a fresh
browser context, where the disabled context's Register address, its Login
page's header "Register" and the in-form "Register" link all answer
`{disabled context}/login` (note g). Scenario 6 needs two open contexts,
the seeded one plus the scratch one, and ticks the consent line under each;
the site has no privacy statement of its own (`seed-facts.md`), so no site
consent box is on the page; its second account, `u02s6b-<app>`, registers
in a fresh browser context at `index/user/register` with nothing ticked,
its Roles tab then reached through the profile address (`user/profile`, the
seeded context's) and read for no ticked box anywhere (note c). Scenario 7
runs against the validation-variant server (the fleet's fixed extra server
with `require_validation = On` and `altcha = on`, reached through the
`variants` fixture; the harness notes describe it) on a scratch context
from `POST scenarios/context` whose Journal Manager first sets Settings ›
Journal › Contact › "Technical Support Contact" (name and email; "Saved"):
the seeded context has no support contact, so registering there under
validation crashes (A6). Its first attempt, username `u02s7-<app>`, runs in
a browser context created with JavaScript disabled (Playwright's
`javaScriptEnabled: false`; the ALTCHA widget then posts no `altcha` field,
note f); the same username and email then register with JavaScript on, and
the duplicate form retypes the same two values. Mail is read from Mailpit
scoped by the throwaway address; the "Activate Account" button's address
(`user/activateUser/{username}?invitationId=…&invitationKey=…`) is captured
at the press and reopened after it (it answers the Login page, note i); the
"once more" step reopens the emailed `invitation/accept` link, not the
button's address. The site-level account, `u02s7b-<app>`, registers in a
fresh browser context at the variant server's `index/user/register` with
"Reader" ticked under the seeded context and that context's consent line;
its mail comes From the site contact (`admin@mail.test`, named "Open
Journal Systems" / "Open Monograph Press" / "Open Preprint Systems" on the
fleets) and reads "an account with , but…" because the test site's title
is empty in both locales (`seed-facts.md`), the fleets' state rather than a
claim about a titled site; after activating, sign-in on the site's Login
page (`index/login`) lands on `index/index`, the site's context list (note
i). Scenario 8: `author.alex` and `sectioneditor.ana` (a Section Editor on
OJS and OMP, a Moderator on OPS; `editor.diana` is not seeded on OPS, where
Login answers "Invalid username/email or password. Please try again.");
"View Submissions" for the Section Editor opens `dashboard/editorial`,
heading "Assigned to me (N)" (note h).

<a id="fn-a1"></a>
**f-a1** — `config.TEMPLATE.inc.php` `[email] validation_timeout = 14` with
the comment "The number of days a user has to validate their account before
their access key expires." No code reads it (note j). The link is a
`RegistrationAccessInvite` whose `invite()` sets `expiryDate = now +
getExpiryDays()` = `[invitations] expiration_days` (default 3,
`Invitation::DEFAULT_EXPIRY_DAYS`); `Repo::invitation()->getByIdAndKey()`
scopes `notExpired()`. Pre-invitation releases used an access key with
`validation_timeout` as its lifetime; the key stayed in the template after
the flow moved (basis: code reading 2026-09-02, upstream archaeology not
done).

<a id="fn-a2"></a>
**f-a2** — `RegistrationHandler::activateUser()` assigns only `message`
before `display('frontend/pages/message.tpl')`; `message.tpl` renders
`<h1>{translate key=$pageTitle}</h1>` and the breadcrumb with
`currentTitleKey=$pageTitle`, and `Locale::translate()` returns `''` for
an empty key; `backLink` is not assigned. The activation page itself,
`userConfirmActivation.tpl` rendered by
`RegistrationAccessInviteRedirectController::acceptHandle()`, likewise gets
no `pageTitle`. Compare `register()`'s pending page, which sets `pageTitle`,
and `validate()`'s closed page, which sets both title and a "Login" back
link. Live-probed 2026-09-02 on all three apps, journal-level and
site-level (note i): the emailed link's page had tab title "| {context}"
(empty before the separator), no `h1` or `h2`, breadcrumb "Home /" with an
empty current crumb; the page after "Activate Account" had the same empty
title, an `h1` present but empty, breadcrumb "Home /", the thank-you
sentence and "Home" as the only link in `main`, the header still reading
"Register Login"; by contrast the pending page carried its "Registration
awaiting verification" title and crumb.
Issue report: [pkp-e2e#836](https://github.com/jardakotesovec/pkp-e2e/issues/836) ([docs/issues/U02-A2-activation-pages-no-heading.md](../issues/U02-A2-activation-pages-no-heading.md)).

<a id="fn-a3"></a>
**f-a3** — Note e: the `blocked_emailed_notification` write is inside
`if ($request->getContext() && …)`; `emailConsent` is read on both pages
(`readUserVars`). Live-probed 2026-09-02 on all three apps (note e): the
site-level account registered with the box unticked has the same
Notifications tab as the journal-level control registered with it ticked,
while the journal-level account registered with it unticked has every
"Do not send me an email…" box under "Public Announcements" ticked.

<a id="fn-a4"></a>
**f-a4** — Note c: `assignRoleContent()` assigns `contexts` =
`ContextDAO::getAll(true)` unfiltered, while the `readerUserGroups` /
`reviewerUserGroups` arrays skip contexts with `disableUserReg`;
`registrationFormContexts.tpl` iterates `$contexts` and prints
`$context->getLocalizedName()` and the `user.register.otherContextRoles`
legend before looping the (absent) group arrays. Live-probed 2026-09-02 on
all three apps: after a scratch context's manager chose "The Journal Manager
will register all user accounts…" on Site Access Options and saved, the
site-level page still listed the context by name with "Request the
following roles." and no role checkbox, the block's text continuing "Yes, I
agree to have my data collected and stored according to this journal's
privacy statement." (its `privacyConsent[n]` box was still in the block;
whether it sat off-screen on OJS and OPS as note d describes was not
checked separately); every other open context kept its boxes. Restoring
"Visitors can register a user account with the journal." brought the
context's role boxes back. A context disabled on Administration › Hosted
Journals was absent from the list in the same run.

<a id="fn-a5"></a>
**f-a5** — Note h: `{url page="login" source=$rolesProfileUrl}` with
`$rolesProfileUrl = {url page="user" op="profile" path="roles"}` (an
absolute URL); `LoginHandler::signIn()` — `preg_match('#^/\w#', $source)`
gates the redirect, else `_redirectAfterLogin()`. Live-probed 2026-09-02 on
all three apps: the link's href was
`{context}/en/login?source=http%3A%2F%2F{host}%2Findex.php%2F{context}%2Fen%2Fuser%2Fprofile%2Froles`,
the Login page's hidden `source` held that absolute URL, and signing in as
`author.alex` landed on
`{context}/en/dashboard/mySubmissions?currentViewId=active` ("Active
submissions"), identical to the control sign-in from a plain
`{context}/en/login`.

<a id="fn-a6"></a>
**f-a6** — Note i: `ValidateEmailContext` takes its sender from the
context's `supportEmail` / `supportName`; with neither set, Symfony's
`Mime\Message` throws `LogicException: An email must have a "From" or a
"Sender" header.` inside `ValidateRegisteredEmail::manageEmail()`, which
`RegistrationHandler::register()` does not catch (it catches only
`Mailer\Exception\TransportException`, for which it creates
`NOTIFICATION_TYPE_ERROR` (`email.compose.error`) for `$userId`,
`trigger_error(E_USER_WARNING)`, and falls through to the pending page);
`RegistrationForm::execute()` has already saved the user with `disabled =
true` and the `accountNotValidated` reason before the event fires. The
seeder sets only `contactName` / `contactEmail` on the seeded context, and
the public Contact page shows "Principal Contact" alone. Live-probed
2026-09-02 on the seeded context of all three apps, validation-variant
server: the Register POST answered 500 and the browser showed an empty page
(no headings, no text); the server log carried the `LogicException` above
from `RegistrationHandler.php` line 81's `Mail::send()`; Mailpit held no
message for the address after 20 s (the scratch-context control arrived
within 2 s); signing in was refused with "Your account has been disabled
for the following reason: We've sent a confirmation email to you at
{email}…". The transport-failure half is code reading only: the test
install's mail catcher does not offer a failing transport. Whether adding a
support contact afterwards lets those accounts be activated was not tested
(the seeded context's settings are read-only for the campaign).
Issue reports: [pkp-e2e#833](https://github.com/jardakotesovec/pkp-e2e/issues/833) ([docs/issues/U02-A6-register-no-support-contact-empty-page.md](../issues/U02-A6-register-no-support-contact-empty-page.md)), the missing sender; [pkp-e2e#834](https://github.com/jardakotesovec/pkp-e2e/issues/834) ([docs/issues/U02-A6-register-mail-down-says-email-sent.md](../issues/U02-A6-register-mail-down-says-email-sent.md)), the mail failure.

<a id="fn-a7"></a>
**f-a7** — Note c: `RegistrationForm::execute()` assigns
`Repo::userGroup()->getByRoleIds([ROLE_ID_READER], $contextId, true)` (the
context's default Reader group) whenever a context is present and no
`reviewerGroup` was ticked, without consulting `permitSelfRegistration`;
`UserFormHelper::saveRoleContent()` (the site-level path) does check the
flag. The profile's `RolesForm` lists only groups with the flag, so the
granted Reader is invisible there. Live-probed 2026-09-02 on scratch
contexts of all three apps: with "Allow user self-registration" unticked on
Reviewer (OMP: External Reviewer) and on Reader, the Register form still
rendered and registered; the manager's Users tab row read "Reader" in its
Roles column; the registrant's Roles tab listed "Author" (OMP: "Author",
"Chapter Author") only, unticked.

<a id="fn-omp1"></a>
**f-omp1** — `user.register.form.missingSiteConsent` and
`user.register.form.missingContextConsent` exist in `ojs/locale/en/locale.po`
and `ops/locale/en/locale.po` but not in `omp/locale/en/locale.po` nor in
`lib/pkp/locale/en/*.po` (grep 2026-09-02); `Locale::translate()` renders a
missing key as `##key##`. OMP does carry
`user.register.form.privacyConsentThisContext` ("…this press's privacy
statement."). Live-probed 2026-09-02 on the OMP site-level page: the error
list item read `##user.register.form.missingSiteConsent##` with a site
statement set and the box unticked, and
`##user.register.form.missingContextConsent##` with "Reader" ticked under a
press and its line unticked; OJS and OPS printed the sentences of note d in
the same runs.
Issue report: [pkp-e2e#835](https://github.com/jardakotesovec/pkp-e2e/issues/835) ([docs/issues/U02-OMP1-press-site-register-consent-raw-codes.md](../issues/U02-OMP1-press-site-register-consent-raw-codes.md)).

<a id="fn-omp2"></a>
**f-omp2** — `registrationFormContexts.tpl` renders a `.context_privacy`
line under every context with a statement; the default theme's
`register.less` parks it off-screen and `plugins/themes/default/js/main.js`
adds `context_privacy_visible` when a role box of that context is ticked.
Live-probed 2026-09-02, site-level page with a scratch context carrying a
statement: on OJS and OPS the line was at `left: -9999px` until "Reader" was
ticked, then in view with the extra class; on OMP it was in normal flow
before any tick and the class did not change on tick. Which OMP theme file
lacks the toggle was not traced.

<a id="fn-ops1"></a>
**f-ops1** — Note k: `userRegister.tpl` renders the
`.reviewer_nocontext_interests` block under `{if !$currentContext}` with no
check for reviewer groups; OPS's `registry/userGroups.xml` seeds no
`ROLE_ID_REVIEWER` group and its English text reads "If you requested to be
a reviewer, please enter your subject interests." Live-probed 2026-09-02 on
the OPS site-level page: that prompt and its `input#interests` box were
shown while every server block on the page offered "Reader" alone and no
`reviewerGroup` input existed in the form; OJS and OMP showed their prompts
("…on any journal…" / "…for any press…") above blocks that did offer
"Reviewer" / "External Reviewer". Two comma-separated interests typed on
the OPS page were accepted, and the resulting account's Roles tab
(`user/profile#roles`) had no "Reviewing interests" field, where OJS and
OMP showed two chips.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Register page (journal-level) | `{journal}/user/register` (form posts to the same op; legacy `user/registerUser`) | ROUTE-030 · AFFU-009..020, 027..030 |
| Register page (site-level) | `index/user/register` (no journal in the address) | ROUTE-030 · AFFU-021..028 |
| Header "Register" entry | user navigation menu, type `NMI_TYPE_USER_REGISTER` (owned by *Navigation menus & site chrome*) | — |
| "Register" link on Login / lost-password | `login` · `login/lostPassword` (owned by *Login & sessions*) | — |
| Registration complete | `user/register` while signed in | AFFU-031..034 |
| Registration awaiting verification | `user/register` POST with `require_validation` | ROUTE-030 |
| Validation email | `USER_VALIDATE_CONTEXT` · `USER_VALIDATE_SITE` | MAIL-058 · MAIL-059 |
| Activation landing | `{journal}/invitation/accept?id=…&key=…` (handler owned by *User invitations*) → `user/activateUser/{username}?invitationId=…&invitationKey=…` | AFFU-035 · ROUTE-030 |
| Config, captcha section | `config.inc.php` `[captcha]` | SET-057 |
| Config, validation keys | `config.inc.php` `[email] require_validation`, `validation_timeout` (rider on SET-053, owned by *Emails management*); `[general] user_validation_period`; `[invitations] expiration_days` | — |
| Monthly cleanup | scheduler `monthlyOn(1)` → `RemoveUnvalidatedExpiredUsers` | JOB-053 |

## Reference — code anchors

- `lib/pkp/pages/user/RegistrationHandler.php` — every op in this spec
- `lib/pkp/classes/user/form/RegistrationForm.php` · `UserFormHelper.php` — the form, its checks, role assignment
- `lib/pkp/classes/form/validation/FormValidatorUsername.php` · `FormValidatorEmail.php` · `FormValidatorPassword.php` · `FormValidatorReCaptcha.php` · `FormValidatorAltcha.php`
- `lib/pkp/classes/observers/listeners/ValidateRegisteredEmail.php` · `events/UserRegisteredContext.php` · `events/UserRegisteredSite.php`
- `lib/pkp/classes/mail/mailables/ValidateEmailContext.php` · `ValidateEmailSite.php`
- `lib/pkp/classes/invitation/invitations/registrationAccess/RegistrationAccessInvite.php` · `handlers/RegistrationAccessInviteRedirectController.php` · `lib/pkp/pages/invitation/InvitationHandler.php`
- `lib/pkp/classes/task/RemoveUnvalidatedExpiredUsers.php` · `lib/pkp/classes/user/DAO.php` (`deleteUnvalidatedExpiredUsers`, `getByUsername`, `getByEmail`)
- `lib/pkp/classes/security/authorization/RestrictedSiteAccessPolicy.php` · `lib/pkp/classes/services/PKPNavigationMenuService.php`
- `lib/pkp/classes/components/forms/context/PKPUserAccessForm.php` · `PKPPrivacyForm.php` · `forms/site/PKPSiteInformationForm.php`
- Templates: `lib/pkp/templates/frontend/pages/userRegister.tpl`, `userRegisterComplete.tpl`, `userConfirmActivation.tpl`, `message.tpl`, `error.tpl`; `frontend/components/registrationForm.tpl`, `registrationFormContexts.tpl`; `lib/pkp/templates/user/rolesForm.tpl`, `userGroups.tpl`, `userGroupSelfRegistration.tpl`
- Seeds: `registry/userGroups.xml`, `registry/emailTemplates.xml`, `registry/navigationMenus.xml` in OJS, OMP, OPS; `config.TEMPLATE.inc.php` `[captcha]`, `[email]`, `[general]`, `[invitations]`
- App divergence points checked: none in `pages/user/RegistrationHandler.php` (no app copy); `pages/user/UserHandler.php` per app (no registration overrides); no template overrides in any app or default theme; locale gaps in `omp/locale/en/locale.po` (OMP1) and `ops/locale/en/locale.po` (no reviewer strings, unreachable by default)
