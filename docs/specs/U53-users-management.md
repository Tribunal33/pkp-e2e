---
name: users-management
status: verified
---

# Users management

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal's managers look after the people who work in it. On Settings ›
Users & Roles they find an account in the journal's list of users and act
on it: open its roles, email the person, disable or re-enable the account,
remove the person from the journal, or merge a duplicate account into
another. The Site Administrator has an older list of the same kind for
every hosted journal, where accounts can also be created directly and
roles given without an invitation. Giving roles by invitation, the page
the list's "Edit" opens, and impersonating a user belong to their own
features; this spec covers the list, its search and every other row
action.

## Actors & permissions

Who opens Settings › Users & Roles is the Settings gate of
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access):
the journal's **manager-level roles** while their role has "Permit
changes to Settings" ticked (on a journal or press the Journal Manager,
the Editor and the Production Editor; on a preprint server the Preprint
Server Manager), and the Site Administrator. Below, "a manager" is any of
them.

<a id="reach"></a>
A user is **within a manager's reach** when every role the user
holds or has ever held anywhere on the site sits in a journal where that
manager also holds a manager-level role; a role ended in another
journal still puts the user out of reach. A Site Administrator's account
is never within a manager's reach. The Site Administrator reaches every
other account, with one exception below. <sup>n</sup>

The exception is a second Site Administrator's account: the Site
Administrator's menu offers "Login As" and "Merge user" on its row, but
the app refuses both. <sup>v</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Users" list, search it and page through it** | • whoever opens Users & Roles (above), at the address the side menu's "Users & Roles" opens, `{journal}/management/settings/access`. Typed as the shorter `{journal}/management/access`, the page answers the manager-level roles with the access-denied page "The current role does not have access to this operation."; the Site Administrator opens it at either address <sup>a</sup><br>• Site Administrator whose only role in a journal is Reader: only by typing the page's address, `{journal}/management/settings/access`. The page opens with the list (their own row, "Reader", its menu "Edit" and "Email") under an "Error" dialog, "The current role does not have access to this operation."; once "OK" closes it, the list, the tabs and the side menu's "Settings" and "Administration" work. On a press or preprint server that address answers the access-denied page, but the shorter `{journal}/management/access` opens the page the same way <sup>td1</sup><br>• every other role: no "Settings" in the side menu, and the address answers the access-denied page "The current role does not have access to this operation." (see *Journal identity & about pages*) |
| **"Edit"** (open the user's roles page) | • every manager, on every row, their own included (Rule 8) <sup>e</sup> |
| **"Email"** | • every manager, on every row, their own included (Rule 9) <sup>f</sup> |
| **"Disable User" / "Enable User"** | • Site Administrator: every row but their own (Rules 10–12)<br>• other managers: offered on every row but their own. It takes effect for a user whose current roles all sit in the manager's journals, a user whose role elsewhere has ended included; for anyone else, the Site Administrator included, it is refused (Rule 13) ⚠ [A1](#a1) <sup>g</sup> |
| **"Remove User"** (from this journal) | • every manager, on the rows that name a role under "Roles" (Rule 7), never on their own row (Rule 14). It works for users outside the manager's [reach](#reach) too, ending only this journal's roles, but fails on a Site Administrator's row ⚠ [A2](#a2) and on the row of a user whose only role has not yet begun ⚠ [A19](#a19) <sup>c</sup> |
| **"Merge user"** | • Site Administrator: the rows of every account but their own<br>• other managers: the rows of users within their [reach](#reach), never their own (Rules 16–17) <sup>i</sup> |
| **"Login As"** | • offered on the rows of users the signed-in manager may impersonate; the action itself and who may use it belong to [Login & sessions](U01-login-and-sessions.md#who-may-impersonate) <sup>o</sup> |
| **Manage a journal's users from Administration** (the Settings wizard's "Users" tab: "Add User", "Edit User" and the other row actions) | • Site Administrator only (Rules 19–24) <sup>k</sup> |

## Fields & validation

The "Current Users" list (Settings › Users & Roles › "Users"), one row per
account:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Search box, reading "Enter a user's name, role (e.g Journal editor), or affiliation" until something is typed | — | Runs on Enter (Rule 6). On a press and a preprint server the example names a role those apps do not have ⚠ [A4](#a4) <sup>p</sup> |
| "Name" | — | The account's full name; an ORCID icon follows when the account carries an ORCID iD, verified or not, and a red crossed-out person icon when the account is disabled. To a screen reader both icons are unnamed images ⚠ [A12](#a12) <sup>b</sup> |
| "Email" | — | The account's email address <sup>b</sup> |
| "Roles" | — | Each role the user has in this journal with no end date, one per line, a role whose start date is still to come included ⚠ [A18](#a18). A role with an end date is not shown, even while that date is still to come (Rule 3a), and roles in other journals never are <sup>b</sup> |
| "Start Date" | — | The date each of those roles began or will begin, on the role's line; empty for a role that carries no start date, such as the manager role a journal gives the Site Administrator when it is created (the user's roles page reads "---" there) <sup>b</sup> |
| "Affiliation" | — | The account's affiliation <sup>b</sup> |
| The "…" button at the row's end | — | Opens the row's actions (Rule 7) ⚠ [A5](#a5) <sup>q</sup> |

The "Email" window (Rule 9):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Subject" | yes | Empty, the window refuses to send and says "This field is required." <sup>td4</sup> |
| "To" | — | Read-only, "{full name} <{email}>" of the row's account <sup>f</sup> |
| "Body" | yes | A text editor. Empty, "Send Email" brings the notice "Please provide the email body text." at the top of the window, with nothing under the field; the window stays open and no email is sent <sup>td4</sup> |

The "Disable {full name}" and "Enable {full name}" windows (Rules 10–12):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Reason for disabling user" | no | Free text. The Login page quotes it to the disabled user (see *Login & sessions*, Rule 2) <sup>g</sup> |
| "Reason for enabling user" | no | Arrives holding the reason typed when the account was disabled ⚠ [A7](#a7) <sup>h</sup> |

The "Merge user" window's list and the Site Administrator's older grid
(Rules 16, 19) share a list with the columns "Given Name", "Family Name",
"Username", "Roles" and "Email", and one search form, which opens from
the "Search" link above the list. The "Roles" column names the user's
roles in this journal, empty for a user whose roles here have all
ended; the Site Administrator's row shows none ⚠ [A13](#a13). <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Search" (a text box) | no | Pressing the form's "Search" button lists the accounts whose details contain the text <sup>i</sup> |
| Role select, "All Roles" by default | no | Narrows the list to one role of the journal <sup>i</sup> |
| "Include users with no roles in this journal." ("…in this press.", "…in this server.") | no | Unticked by default: the list shows the accounts that hold or have held a role in this journal. Ticked, it also shows accounts that never held one <sup>i</sup> |

The Site Administrator's "Add User" (step 1) and "Edit User" windows
(Rules 21, 24):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Given Name" | yes | In the site's primary language; missing: "This field is required." under the box, before anything is sent. A "Family Name" typed in another language without a given name in it is refused ("You have added a family name for a language that is missing the given name. Please add a given name for this language.") <sup>l</sup> |
| "Family Name" | no | <sup>l</sup> |
| "Preferred Public Name" | no | <sup>l</sup> |
| "Username" | yes, new accounts only | Lower-case letters, digits, hyphens and underscores, beginning and ending with a letter or digit, at most 32 characters, not already taken ("The selected username is already in use by another user."). "Suggest" beside it fills in the initial of the given name followed by the family name in lower case (the given name alone when there is no family name), with a number added when that is taken; with no given or family name typed it leaves the box empty and says nothing. On "Edit User" the username shows as plain text and cannot change <sup>l</sup> |
| "Email" | yes | A valid address not used by another account ("The selected email address is already in use by another user.") <sup>td15</sup> |
| "Password" and "Repeat password" | new accounts, unless "Generate Password" is ticked | At least the site's minimum length, six characters on a default install ("The password must be at least 6 characters."), and both the same ("The passwords do not match."). On "Edit User" both may stay empty: "Leave the password fields blank to keep the current password." <sup>l</sup> <sup>m</sup> |
| "Generate Password" ("Generate random password for this user.") | no, new accounts only | Rule 23 <sup>l</sup> |
| "Change Password" ("User must change password on next log in.") | no | Ticked when "Add User" opens (Rule 23). On "Edit User" it always opens unticked, whatever the account's flag, and "OK" saves it as shown, so a flag already set is cleared; see *[Login & sessions](U01-login-and-sessions.md#a10)*, its finding A10 <sup>l</sup> <sup>m</sup> |
| "Country" | no | <sup>l</sup> |
| "Notify User" ("Send user a welcome email.") | no, new accounts only | Unticked by default; sends the welcome email (Side effects) <sup>l</sup> |
| "More User Details" (a link that opens more fields) | no | "Homepage URL" (a valid address; anything else brings "Please enter a valid URL." under the box before anything is sent, so the window's other refusals wait for the next "OK"), "Phone", "Working Languages", "Reviewing interests", "Affiliation", "Bio Statement (e.g., department and rank)", "Mailing Address", "Signature" <sup>l</sup> |
| "Editorial Notes" | no, "Edit User" only | Shown to a Site Administrator editing another account that holds a reviewer role <sup>m</sup> |
| "User Roles" (a box per role of the journal) | at least one ("Edit User" and "Add User" step 2) | Missing: "You need to select at least one role to be associated with this user." (Rules 22, 24) <sup>l</sup> <sup>m</sup> |
| "Appear on Masthead" (a box per role of the journal) | no | All ticked when step 2 opens, where every one can be unticked, the reviewer roles' included. On "Edit User" a reviewer role's box is ticked and cannot be changed, whether or not the account holds that role <sup>l</sup> <sup>m</sup> |

## Rules & state

**The "Users" list**

1. **Where it lives.** Settings › Users & Roles opens the page headed
   "Users & Roles" with the tabs "Users", "Roles", "Notify" (only while
   the site allows this journal bulk email, Settings bullet 1), "Site
   Access Options" and "ORCID". The "Users" tab holds, top to bottom, the
   "Invitations" table with its "Invite to a role" button (see
   [User invitations](U06-user-invitations.md)) and the list headed
   "Current Users ({n})" this spec describes. A change typed on a tab
   and not saved stays while the user moves between the tabs and is gone
   without a warning once the page is left, as on every Settings page
   (see *Journal identity & about pages*, Rule 5). <sup>a</sup>
2. **Who is listed.** Every account that holds a role in this journal, or
   held one that has since ended, enabled and disabled accounts alike. An
   account whose roles all sit in other journals is not listed. <sup>b</sup>
3. **A user with no role left stays listed.** After "Remove User"
   (Rule 14) the row stays, its "Roles" and "Start Date" cells empty, and
   its menu no longer offers "Remove User" ⚠ [A3](#a3). "Remove User" is
   the only way to that state: the user's roles page never ends a user's
   last role (see *User invitations*, Rule 13). <sup>c</sup>
3a. **A role with an end date still to come.** On a journal or a press an
   import through Tools › "Users XML Plugin" (see [Import &
   export](U63-import-export.md)) can give a role an end date that has not
   yet come; a preprint server installs no such import, and its invitation
   takes a start date only. Until that date the user holds the role, and
   "Editorial Masthead" lists them under it. When it is their only role here,
   their row reads as in Rule 3: nothing under "Roles" and "Start Date"
   [A18](#a18), and no "Remove User" in the menu. On the user's roles page
   the role shows its End Date and "User Removed From Role" where "Remove
   Role" would be (see [User invitations](U06-user-invitations.md), Rule 13),
   so neither screen can end the role before that date ⚠ [A20](#a20).
   <sup>c</sup>
4. **Order and count.** Rows run from the oldest account to the newest,
   so on a fresh install the Site Administrator comes first. The heading's
   number counts every account the list holds, or every match while a
   search is active. <sup>b</sup>
5. **Paging.** The list shows 25 rows a page, whatever the journal's
   "Items per page". A line under it reads "Showing 1 to 25 of {n}", and
   page buttons appear only when there is more than one page. <sup>d</sup>
6. **Searching.**
   - 6a. The search runs when Enter is pressed in the box; typing alone
     changes nothing. The × button at the box's end ("Clear search
     phrase" to a screen reader) empties the box and shows the whole list
     again. A new search starts again at the first page. <sup>p</sup>
   - 6b. Every word typed must match somewhere in the account, as part of
     a word and ignoring letter case: the username, the email address,
     the given, family or preferred public name, the affiliation, the bio
     statement, the ORCID iD, the reviewing interests, or the name of one
     of the user's roles in any journal, an ended role included, although
     the list's "Roles" cell leaves ended roles out. Two words that match two different
     accounts find neither. <sup>p</sup>
   - 6c. When nothing matches, the heading reads "Current Users (0)",
     the list's only line reads "No Items", and the line under it
     "Showing 0 to 0 of 0". <sup>td3</sup>
7. **The row menu.** The "…" button at the end of a row opens its
   actions [A5](#a5). A row offers: <sup>q</sup>

   | Action | Offered on |
   |---|---|
   | "Edit" | every row |
   | "Email" | every row |
   | "Login As" | rows of users the signed-in manager may impersonate, never their own (see *Login & sessions*) |
   | "Remove User" | rows that name a role under "Roles" (Fields), never the signed-in user's own: a role not yet begun counts [A19](#a19), a role with an end date still to come does not [A20](#a20) |
   | "Disable User", or "Enable User" on a disabled account | every row but the signed-in user's own |
   | "Merge user" | rows of users within the signed-in manager's [reach](#reach), never their own |

8. **"Edit".** It opens the user's roles page for this journal: the
   breadcrumb "Users & Roles / Invite user to take a role", an empty page
   heading, the steps "1 Enter details" and "2 Review & invite for roles",
   and "STEP 1 - Enter details and invite for roles" over the user's
   details and roles table. There adding a role sends the user an
   invitation, and "Remove Role" takes effect at once with an email to the
   user. A masthead change takes effect at once too, with an email on a
   journal; on a press or preprint server it ends in an "Error" dialog and
   emails nobody ⚠ [A14](#a14). That page belongs to
   [User invitations](U06-user-invitations.md) (its Rule 13). <sup>e</sup>

**Email**

9. **"Email".** It opens the side window "Email" (Fields). "Send Email"
   sends one email from the signed-in user's name and address to the
   account's address, with the subject and body as typed, and closes the
   window with no message saying the email went. No stored template is
   used, and no screen keeps a copy of what was sent. "Cancel" closes the
   window and sends nothing. <sup>f</sup>

**Disabling and enabling**

10. **"Disable User".** It opens the side window "Disable {full name}".
    Under the title a line reads "Current Roles : {roles}" ⚠ [A6](#a6),
    then the box "Reason for disabling user" under the note "Please note
    that once a user is disabled, you won't be able to add them to any
    roles until the user is enabled again." "OK" disables the account: the
    window closes, the row's name gains the disabled icon, and its menu
    reads "Enable User". "Cancel" closes the window with no change and no
    question; a reason typed there is not kept. <sup>g</sup>
11. **A disabled account.**
    - It cannot sign in: the Login page refuses it, quoting the reason
      when one was typed (see *Login & sessions*, Rule 2). <sup>g</sup>
    - Any session it has open ends: the user's next page that needs
      signing in (their profile, "Start A New Submission", the dashboard)
      shows the Login page, and a public page opens signed out. <sup>td5</sup>
    - It cannot be given a role by invitation (see *User invitations*,
      Rule 14). <sup>g</sup>
    - It keeps its roles and its row, and can still be emailed (Rule 9),
      edited (Rule 8) and merged (Rule 16). <sup>g</sup>
12. **"Enable User".** It opens "Enable {full name}" with the same
    "Current Roles : {roles}" line and the box "Reason for enabling user"
    under the note "Once the user is enabled, they will regain access to
    the site, and you'll be able to invite them to roles as needed." "OK"
    enables the account: the icon goes, the menu reads
    "Disable User" again, and the user can sign in. The box arrives holding
    the reason typed when the account was disabled, and whatever it holds
    on "OK" is kept as the account's reason: the next "Disable User"
    offers it in "Reason for disabling user", and unless someone clears it
    there the Login page quotes it [A7](#a7). <sup>h</sup> <sup>td6</sup>
13. **Refused for members of other journals.** A manager other than the
    Site Administrator is offered "Disable User" and "Enable User" on the
    rows of users who hold a current role in a journal the manager does
    not manage, and on the Site Administrator's row. There the window
    shows "You do not have sufficient permissions to administer this
    user. In order to administer a user, you must either be site
    administrator, or administer all contexts that this user is enrolled
    in." with no reason box and no "OK", only the
    window's "Close", and the account stays as it was [A1](#a1). A user
    whose role elsewhere has ended is disabled as usual. <sup>td8</sup>

**Removing a user from the journal**

14. **"Remove User".** It asks, in a dialog headed "Remove", "Remove this
    user from this journal? This action will unenroll the user from all
    roles within this journal." with "OK" and "Cancel". "OK" ends all
    the user's roles in this journal at once; the dialog closes and the
    row shows no role (Rule 3). The user's roles in other journals and
    the account are untouched, so the user still signs in. No
    email tells the user ⚠ [A8](#a8). The user's roles page lists each
    ended role with End Date today and "User Removed From Role" (see
    *User invitations*, Rule 13). <sup>c</sup>
15. **The Site Administrator's row.** On a manager's list the Site
    Administrator's row offers "Remove User" while the administrator holds
    a role in the journal. "OK" then brings an "Error" dialog, "An
    unexpected error has occurred. Please reload the page and try again.",
    and the administrator keeps every role [A2](#a2). <sup>td9</sup>
15a. **A role not yet begun.** An invitation's START DATE may be a date
    still to come; once the invitation is accepted, the role shows under
    "Roles" with that date (Fields). When it is the user's only role here, the
    row offers "Remove User", and "OK" in its dialog brings the same
    "Error" dialog as Rule 15. The role stays, with its start date, and
    the menu still offers "Remove User" after a reload [A19](#a19). <sup>c</sup>

**Merging two accounts**

16. **"Merge user".** It opens the side window "Merge user", holding a
    list headed "Merge into this User" with the search form of the Fields
    section, at first listing this journal's users, including those whose
    roles here have all ended (nothing under "Roles"). Every row but the
    account being merged offers "Merge into this User". <sup>i</sup>
17. **The merge.** "Merge into this User" asks, in a dialog headed
    "Confirm", "Are you sure you wish to merge the account with the username "{old username}" into the account
    with the username "{new username}"? The account with the username
    "{old username}" will not exist afterwards. This action is not
    reversible." "Cancel" returns to the "Merge user" window; "OK"
    merges, unless the merged account opened a discussion, in which case
    the merge fails partway ⚠ [A15](#a15). <sup>j</sup> The chosen account
    takes over:
    - the merged account's roles in every journal, each with its start
      and end dates and masthead choice, except a role it already holds;
      <sup>j</sup>
    - its places as a participant on submissions, its review assignments
      and its lines in the submissions' activity logs. <sup>j</sup>

    The files it uploaded, the decisions it recorded, its messages in
    discussions and its notifications move to the chosen account as
    well. <sup>w</sup>

    The merged account is then deleted: its username no longer signs in
    and any session it had open ends. The window closes and the list no
    longer shows it. <sup>j</sup>
18. **What a merge leaves behind.** The sections the merged account was
    assigned to as an editor are not carried over to the chosen account
    ⚠ [A9](#a9). <sup>td10</sup>

**The Site Administrator's older grid**

19. **Where it lives.** Administration › "Hosted Journals", a journal's
    row, the arrow at its start, "Settings wizard", then the tab "Users".
    The tab holds an older list of that journal's users headed "Current
    Users", with the columns of the Fields section and, above it,
    "Search" (which opens the search form of the Fields section) and
    "Add User". Below it a line reads "1 - {n} of {n} items". Once the
    list holds more than 10 users, the choice "Items per page: 10 25 50
    75 100" stands in front of that line, and page links follow once
    there are more than 25. The Users & Roles list is the primary surface
    for managing users; this grid is where the Site Administrator creates accounts
    directly and gives or ends roles without an invitation. <sup>k</sup>
20. **Its row actions.** A row's arrow ("Settings" to a screen reader)
    shows "Email", "Edit User", "Disable User" ("Enable" on a disabled
    account), "Remove" while the user holds a role in the journal,
    "Login As" and "Merge User". "Email", "Remove" and "Merge User" open
    the same windows and dialogs as the Users list's actions and do the
    same (Rules 9–17), [A3](#a3) included. "Disable User" and "Enable" do
    the same, [A7](#a7) included, but their windows are headed "Disable
    User" and "Enable", with no "Current Roles : …" line. The
    administrator's own row offers "Email", "Edit User", "Disable User"
    and "Remove", no "Login As" and no "Merge User", where the Users &
    Roles list offers no disabling or removing on the signed-in user's
    own row ⚠ [A10](#a10). <sup>k</sup> <sup>td11</sup>
21. **"Add User", step 1.** The window "Add User" opens on "Step #1: Fill
    in User Details" (Fields). "OK" creates the account at once and moves
    to step 2. In this window and on "Edit User", "Cancel" closes the
    window and drops what was typed without asking; the window's "Close"
    first asks "The data on this form has changed. Do you wish to
    continue without saving?", and leaving the page raises the browser's
    own question about leaving. <sup>l</sup>
22. **"Add User", step 2.** "Step #2: Add User Roles to {full name}"
    shows the "User Roles" and "Appear on Masthead" boxes. "Save" with no
    role ticked is refused with "You need to select at least one role to
    be associated with this user."; with at least one, the roles are
    granted at once, with no invitation, and the grid lists the new user.
    Leaving step 2 without saving keeps the account created in step 1,
    with no role in the journal: the grid then shows it only with
    "Include users with no roles in this journal." ticked. <sup>l</sup> <sup>td12</sup>
23. **Password choices.** Ticking "Generate Password" fills both password
    boxes with stars and locks them, and ticks and locks "Notify User":
    the account gets a random password, sent in the welcome email (Side
    effects). Unticking it again empties and opens the password boxes but
    leaves "Notify User" greyed out and unticked ⚠ [A16](#a16). "Change
    Password", ticked when the window opens, makes the new user choose a
    new password at their first sign-in (see *Login & sessions*, Rule
    11). <sup>l</sup>
24. **"Edit User".** It opens "Edit User" on "User Details": the fields
    of the Fields section, the username as plain text, "Editorial Notes"
    for an account that holds a reviewer role, and the "User Roles" and
    "Appear on Masthead" boxes with the user's current roles ticked.
    "Change Password" opens unticked (*Login & sessions*, its A10). "OK"
    saves, closes the window and shows "User edited." A role ticked here
    is granted at once and a role unticked ends at once, with no
    invitation and no email. The user's row, as the grid shows it after
    "OK", still lists the role just ended until the page is reloaded
    ⚠ [A17](#a17). Unticking every role is refused with step 2's message.
    A new password typed here ends the user's open sessions. <sup>m</sup>

**Other languages**

25. **The list in French.** Opened in the French interface, the
    "Users" tab prints several labels as raw codes ⚠ [A11](#a11); the
    paging line is French ("Résultats 1 à 25 de {n}", page buttons "Page
    précédente 1 2 Page suivante"). <sup>td13</sup>
    On a preprint server the "Roles" column also prints the manager and
    Moderator roles as "##default.groups.name.manager##" and
    "##default.groups.name.sectionEditor##" ⚠ [OPS1](#ops1). <sup>u</sup> <sup>td14</sup>

## Side effects

- **"Email" (Rule 9)**: one email to the account's address, from the
  signed-in user's name and address, subject and body as typed. <sup>f</sup>
- **"Disable User" (Rule 10)**: the account's open sessions end. On the
  journal's "Editorial Masthead" and "Editorial History" pages a disabled
  member breaks the page; that belongs to
  [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  (its Rule 14e). <sup>g</sup>
- **"Remove User" (Rule 14)**: every role in this journal ends, dated
  today; no email is sent [A8](#a8). When the member leaves "Editorial
  Masthead" and reaches "Editorial History" is *Journal identity & about
  pages*' (its Rule 14e). What happens to the member's public comments is
  *[Reader comments & moderation](U14-reader-comments-and-moderation.md)*'
  (its Rule 18). <sup>c</sup>
- **A merge (Rule 17)**: the merged account's work and roles move to the
  chosen account and the merged account is deleted, except for an account
  that opened a discussion ([A15](#a15)); its public comments
  follow *Reader comments & moderation*' Rule 18. <sup>j</sup>
- **"Add User" with "Notify User" ticked, or with "Generate Password"**:
  one welcome email, "Journal Registration" ("Press Registration" on a
  press, "Server Registration" on a preprint server), to the new account's
  address, from the Site Administrator, with replies going to the
  journal's principal contact. It says the recipient is now registered
  with the journal and prints the username and the password in plain
  text. The stored text is the "User Created" template of the Emails
  settings screen (see *Emails management*). <sup>r</sup>
- **Roles given or ended on the older grid (Rules 22, 24)**: no
  invitation and no email. <sup>m</sup>

## Settings that modify behavior

1. **"Bulk Emails"** (Administration › Site Settings › "Site Setup" ›
   "Bulk Emails"; by default no journal is ticked). A journal ticked there
   gains the "Notify" tab on its Users & Roles page (Rule 1); unticked, the
   page has no such tab. What the tab does belongs to
   [Notify users (bulk email)](U55-notify-users.md). <sup>t</sup>
2. **"Minimum password length (characters)"** (Administration › Site
   Settings › "Site Setup" › "Security"; default 6). The shortest
   password the older grid's "Add User" and "Edit User" accept, and the
   number their refusal quotes (Fields). <sup>t</sup>

## Cross-feature interactions

- **[User invitations](U06-user-invitations.md)**: the "Invitations"
  table and "Invite to a role" on the same tab, and the roles page a
  row's "Edit" opens, with its "Remove Role", its masthead choice and
  their emails (Rule 8).
- **[Login & sessions](U01-login-and-sessions.md)**: "Login As" and who
  may use it; the Login page's refusal of a disabled account; the forced
  password change the older grid's "Change Password" sets (Rule 23;
  that spec's Rule 11a, and its findings A5 and A10).
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens the Settings pages, Users & Roles among them; the masthead
  pages after a disable or a removal.
- **[Roles configuration](U54-roles-configuration.md)**: the "Roles" tab, the
  roles a journal has, their names and permission levels, which the
  "Roles" column and the older grid's boxes list. The "Site Access
  Options" tab is shared with
  [Registration & account validation](U02-registration-and-account-validation.md).
- **[ORCID integration](U04-orcid-integration.md)**: the "ORCID" tab.
- **[Notify users (bulk email)](U55-notify-users.md)**: the "Notify" tab
  (Settings bullet 1).
- **[Reader comments & moderation](U14-reader-comments-and-moderation.md)**:
  what "Remove User" and a merge do to a member's public comments.
- **Languages & locales** (spec not yet written): opening Users & Roles at
  a French address switches the whole session to French, not only this
  page (Rule 25).
- **Hosted journals (site admin)** (spec not yet written): Administration ›
  "Hosted Journals" and the Settings wizard's other tabs; this spec owns
  only the "Users" tab (Rule 19).
- **Reviewer assignment & management, and the users report**: the search
  for reviewers and the downloadable users report draw on the same user
  records; those screens belong to their own features.

## Canonical scenarios

Every scenario runs on a scratch journal of its own with throwaway
accounts and the Site Administrator enrolled as on every scratch journal
(scenarios 4 and 5 with a second scratch journal beside it), scenarios 1
to 6 signed in as a throwaway Journal Manager and 7 and 8 as the Site
Administrator; emails are read in the mail catcher. The accounts, the
passwords and the tooling recipe are in the footnote. <sup>s</sup>

1. **Find a user in the "Users" list**

   Given: Journal Manager, on a scratch journal whose 32 accounts are,
   oldest first, the Site Administrator, the Journal Manager, Quinn
   Ashdown (an Author with the affiliation "Harbour University" and an
   ORCID iD), Nova Reyes (a Reader whose Author role here has ended) and
   28 Readers.

   - **The page**: open Settings › Users & Roles: the page is headed
     "Users & Roles", with the tabs "Users", "Roles", "Site Access
     Options" and "ORCID" and no "Notify", the site having ticked no
     journal under "Bulk Emails". The "Users" tab holds the "Invitations"
     table with its "Invite to a role" button, then the list headed
     "Current Users (32)" (Rules 1, 2, 4; Settings bullet 1).
   - **The first page**: the list shows 25 rows. The first is the Site
     Administrator's, naming "Journal manager" ("Press manager",
     "Preprint Server manager") under "Roles" with nothing under "Start
     Date"; the second is the Journal Manager's own. The third is Quinn
     Ashdown's: her name followed by the ORCID icon, "Author" under
     "Roles" with the role's start date beside it, and "Harbour
     University" under "Affiliation". The fourth is Nova Reyes's, with
     "Reader" alone under "Roles". Under the list a line reads "Showing
     1 to 25 of 32", with page buttons (Rules 4, 5; Fields, the "Current
     Users" list).
   - **The second page**: press the page button 2: the list shows the
     last 7 rows (Rule 5).
   - **A search**: type harbour in the search box: the list does not
     change. Press Enter: the heading reads "Current Users (1)", and the
     list holds Quinn Ashdown's row alone (Rules 4, 6a, 6b).
   - **An ended role found**: press the × at the box's end: the list
     shows all 32 accounts again. Type Nova Author and press Enter: the
     list holds Nova Reyes's row alone, still with "Reader" alone under
     "Roles", since the search also reads the names of roles that have
     ended (Rule 6b).
   - **No match**: replace the text with Quinn Nova and press Enter: two
     words that match two different accounts find neither. The heading
     reads "Current Users (0)", the list's only line "No Items", and the
     line under it "Showing 0 to 0 of 0" (Rules 6b, 6c).
   - **The Journal Manager's own row**: press the ×, then the "…" button
     at the end of the second row, the Journal Manager's own: the menu
     offers "Edit" and "Email" only (Rule 7).
   - **The Site Administrator's grid**: the Site Administrator, in a
     second browser, opens Administration › "Hosted Journals", the
     journal's row, the arrow at its start, "Settings wizard", then the
     tab "Users": a list headed "Current Users" with the columns "Given
     Name", "Family Name", "Username", "Roles" and "Email", "Search" and
     "Add User" above it, and under it a line beginning "Items per page:
     10 25 50 75 100" with page links (Rule 19).
   - **Control**: on the Users & Roles list, the "…" of Quinn Ashdown's
     row offers "Remove User", "Disable User" and "Merge user" beside
     "Edit" and "Email" (Rule 7). <sup>s</sup>

2. **Email a user**

   Given: Journal Manager, on a scratch journal with Quinn Ashdown, an
   Author.

   - **"Subject" empty**: on Settings › Users & Roles press the "…" at
     the end of Quinn Ashdown's row, then "Email": the side window
     "Email" opens, its "To" reading "Quinn Ashdown <{email}>" with her
     address, and it cannot be changed. Type Hello in "Body" and press
     "Send Email": "This field is required." shows, and nothing is sent
     (Fields, the "Email" window).
   - **"Body" empty**: type Welcome aboard in "Subject", empty "Body"
     and press "Send Email": the notice "Please provide the email body
     text." shows at the top of the window, with nothing under the
     field, and the window stays open (Fields, the "Email" window).
   - **"Cancel"**: press "Cancel": the window closes. Quinn's mailbox
     holds nothing (Rule 9).
   - **Sent**: open "Email" on her row again, type Welcome aboard in
     "Subject" and Thank you for your submission. in "Body", and press
     "Send Email": the window closes, with no message saying the email
     went (Rule 9).
   - **Quinn's mailbox**: holds one email, from the Journal Manager's
     name and address, with the subject "Welcome aboard" and the text
     "Thank you for your submission." (Rule 9; Side effects).
   - **Control**: "Email" on the Journal Manager's own row opens the
     same window, its "To" reading the Journal Manager's own name and
     address (Actors row 3; Fields, the "Email" window). <sup>s</sup>

3. **Disable and re-enable a user**

   Given: Journal Manager, on a scratch journal with Quinn Ashdown, an
   Author, who is signed in in a second browser.

   - **"Cancel"**: on Settings › Users & Roles press the "…" of Quinn
     Ashdown's row, then "Disable User": the side window "Disable Quinn
     Ashdown" opens with the line "Current Roles : Author", then the
     box "Reason for disabling user" under the note "Please note that
     once a user is disabled, you won't be able to add them to any roles
     until the user is enabled again." Type Spam in the box and press
     "Cancel": the window closes with no question, and her menu still
     reads "Disable User" (Rule 10).
   - **Disabled**: press "Disable User" again: the box is empty, the
     reason typed before not kept. Type Spam and press "OK": the window
     closes, the red crossed-out person icon follows Quinn's name, and
     her menu reads "Enable User" in place of "Disable User" (Rule 10;
     Fields "Name").
   - **Still listed**: her row still reads "Author" under "Roles", and
     her menu still offers "Edit", "Email" and "Merge user" (Rule 11).
   - **Quinn, in the second browser**: she opens her profile: the Login
     page shows. The journal's home page opens with her signed out (Rule
     11).
   - **Quinn signs in**: the Login page refuses her, saying her account
     has been disabled "for the following reason:" followed by Spam
     (Rule 11; see *Login & sessions*, Rule 2).
   - **"Enable User"**: the Journal Manager presses "Enable User" on
     Quinn's row: the window "Enable Quinn Ashdown" opens with "Current
     Roles : Author" and the note "Once the user is enabled, they will
     regain access to the site, and you'll be able to invite them to
     roles as needed.", its box "Reason for enabling user" holding Spam
     ⚠ [A7](#a7). Empty the box and press "OK": the icon goes, and the
     menu reads "Disable User" again (Rule 12).
   - **Quinn signs in again**: the sign-in succeeds (Rule 12).
   - **Control**: the Journal Manager presses Quinn's "Disable User"
     once more: "Reason for disabling user" is empty, since the box was
     emptied on enabling (Rule 12). Press "Cancel". <sup>s</sup>

4. **Users outside the manager's reach**

   Given: Journal Manager, who holds no role in a second scratch journal,
   on a scratch journal with Quinn Ashdown (an Author here and in the
   second journal), Nova Reyes (an Author here, whose only role in the
   second journal, Reader, has ended) and Lena Ortiz (an Author here
   only).

   - **Quinn's row**: on Settings › Users & Roles, the "…" of Quinn
     Ashdown's row offers "Edit", "Email", "Remove User" and "Disable
     User" ⚠ [A1](#a1), with no "Login As" and no "Merge user" (Actors
     paragraph; Rule 7).
   - **The Site Administrator's row**: its "…" offers "Edit", "Email",
     "Remove User" ⚠ [A2](#a2) and "Disable User" [A1](#a1), with no
     "Login As" and no "Merge user": a Site Administrator is never within
     a manager's reach (Actors paragraph; Rules 7, 15).
   - **Nova's row**: its "…" offers no "Merge user", since a role that
     has ended in another journal still puts a user out of reach (Actors
     paragraph; Rule 7).
   - **Nova disabled**: press her "Disable User": the window "Disable
     Nova Reyes" holds the box "Reason for disabling user" and "OK".
     Press "OK": the red crossed-out person icon follows her name, and
     her menu reads "Enable User" (Actors row 4; Rules 10, 13).
   - **Control**: the "…" of Lena Ortiz's row, a user wholly within
     reach, offers "Merge user" (Actors paragraph; Rule 7). <sup>s</sup>

5. **Remove a user from the journal**

   Given: Journal Manager, on a scratch journal with Quinn Ashdown, who
   holds the Author and Reader roles here and the Author role in a
   second scratch journal that has a Journal Manager of its own.

   - **"Cancel"**: on Settings › Users & Roles press the "…" of Quinn
     Ashdown's row, then "Remove User": a dialog headed "Remove" asks
     "Remove this user from this journal? This action will unenroll the
     user from all roles within this journal." with "OK" and "Cancel".
     Press "Cancel": her row still reads "Author" and "Reader" under
     "Roles" (Rule 14).
   - **Removed**: press "Remove User" again, then "OK": the dialog
     closes, and Quinn's row stays in the list, still counted in the
     "Current Users" heading, with nothing under "Roles" and "Start
     Date" ⚠ [A3](#a3). Her menu no longer offers "Remove User". No
     email tells her ⚠ [A8](#a8) (Rules 3, 14).
   - **Her roles page**: press her "…", then "Edit": the roles page
     shows Author and Reader as ended (Rule 14).
   - **Quinn signs in**: the sign-in succeeds, her account untouched
     (Rule 14).
   - **Control**: the second journal's Journal Manager opens its
     Settings › Users & Roles: Quinn's row there still reads "Author"
     under "Roles" (Rule 14). <sup>s</sup>

6. **Merge a duplicate account**

   Given: Journal Manager, on a scratch journal with two accounts for
   one person: Quinn Ash, who holds the Author and Reader roles, submitted
   "Tidal Patterns" and is signed in in a second browser, and Quinn
   Ashdown, who holds the Author role.

   - **The "Merge user" window**: on Settings › Users & Roles press the
     "…" of Quinn Ash's row, then "Merge user": the side window "Merge
     user" opens, holding a list of this journal's users headed "Merge
     into this User", with the columns "Given Name", "Family Name",
     "Username", "Roles" and "Email". Every row but Quinn Ash's offers
     "Merge into this User" (Rule 16; Fields, the shared list).
   - **The search form**: press the "Search" link above the list: the
     form opens with the box "Search", the role select on "All Roles"
     and "Include users with no roles in this journal." unticked. Type
     Ashdown in the box and press the form's "Search" button: the list
     holds Quinn Ashdown's row alone (Fields, the shared search form).
   - **"Cancel"**: press "Merge into this User" on Quinn Ashdown's row:
     a dialog headed "Confirm" asks "Are you sure you wish to merge the
     account with the username "{old username}" into the account with
     the username "{new username}"? The account with the username "{old
     username}" will not exist afterwards. This action is not
     reversible.", where {old username} is Quinn Ash's username and {new
     username} Quinn Ashdown's. Press "Cancel": the "Merge user" window
     shows again (Rule 17).
   - **Merged**: press "Merge into this User" again, then "OK": the
     window closes, and the list no longer shows Quinn Ash. Quinn
     Ashdown's row reads "Author" and "Reader" under "Roles", Author
     once (Rule 17).
   - **The submission**: open "Tidal Patterns" from the Dashboard: its
     Participants panel names Quinn Ashdown, and no Quinn Ash (Rule 17).
   - **Quinn Ash, in the second browser**: she opens her profile: the
     Login page shows, her session having ended. Signing in with Quinn
     Ash's username and password is refused (Rule 17).
   - **Control**: the Journal Manager presses "Merge user" on Quinn
     Ashdown's row, opens the search form, types Quinn Ash's username, as
     the "Confirm" dialog gave it, in "Search", ticks "Include users with no roles in this journal." and
     presses the form's "Search": no row is Quinn Ash's, the account
     being deleted, not left without a role (Rules 16, 17; Fields, the
     shared search form). <sup>s</sup>

7. **The Site Administrator adds a user**

   Given: Site Administrator, on a scratch journal whose one other
   member is Lena Ortiz, an Author.

   - **The "Users" tab**: open Administration › "Hosted Journals", the
     journal's row, the arrow at its start, "Settings wizard", then the
     tab "Users": the list headed "Current Users" holds the Site
     Administrator and Lena Ortiz, and the line under it reads "1 - 2 of
     2 items", with no "Items per page" in front of it (Rule 19).
   - **Nothing typed**: press "Add User": the window "Add User" opens on
     "Step #1: Fill in User Details", with "Change Password" ticked and
     "Notify User" unticked. Press "Suggest" beside "Username": the box
     stays empty, and nothing is said. Press "OK": "This field is
     required." shows under "Given Name" (Rule 21; Fields, "Add User").
   - **Values refused**: type Rosa in "Given Name", Delgado in "Family
     Name", Lena Ortiz's username and address, as the list shows them,
     in "Username" and "Email", and abc12 in both "Password" and "Repeat password". Press "More User
     Details": the fields "Homepage URL", "Phone", "Working Languages",
     "Reviewing interests", "Affiliation", "Bio Statement (e.g.,
     department and rank)", "Mailing Address" and "Signature" open under
     it; type example in "Homepage URL". Press "OK": "Please enter a
     valid URL." shows under "Homepage URL" and no other refusal, since
     nothing is sent. Empty
     "Homepage URL" and press "OK" again: the window stays on step 1, and
     a notice reads "The selected username is already in use by another
     user.", "The selected email address is already in use by another
     user." and "The password must be at least 6 characters." (Fields,
     "Add User").
   - **Passwords that differ**: empty "Username" and press "Suggest": it
     reads rdelgado, with a number added when that name is taken. Type
     Rosa's address (the footnote names it) in "Email", abc123 in
     "Password" and abc124 in "Repeat password", and press "OK": "The
     passwords do not match." (Fields, "Add User").
   - **"Generate Password"**: tick it: both password boxes fill with
     stars and lock, and "Notify User" is ticked and locked (Rule 23).
   - **Step 2**: press "OK": the window moves to "Step #2: Add User Roles
     to Rosa Delgado", with a "User Roles" box and an "Appear on
     Masthead" box for each role of the journal, every masthead box
     ticked; {OJS OMP} the reviewer role's masthead box ("Internal
     Reviewer" and "External Reviewer" on a press) can be unticked (Rules
     21, 22; Fields "Appear on Masthead"). Press "Save" with no role
     ticked: "You need to select at least one role to be associated with
     this user." (Rule 22).
   - **Saved**: tick "Author" under "User Roles" and press "Save": the
     list holds Rosa Delgado with "Author" under "Roles" (Rule 22).
   - **Rosa's mailbox**: holds one email, "Journal Registration" ("Press
     Registration", "Server Registration"), from the Site Administrator,
     with replies going to the journal's principal contact. It says she
     is now registered with the journal and gives her username and
     password in plain text (Side effects).
   - **Rosa's first sign-in**: Rosa signs in with the username and the
     password from the email: before anything else she has to choose a
     new password, "Change Password" having been left ticked (Rule 23;
     see *Login & sessions*, Rule 11).
   - **"Cancel" and "Close"**: back on the "Users" tab, press "Add User",
     type Tess in "Given Name" and press "Cancel": the window closes
     without asking. Press "Add User" again: "Given Name" is empty. Type
     Tess and press the window's "Close": it asks "The data on this form
     has changed. Do you wish to continue without saving?" (Rule 21).
   - **Control**: Settings › Users & Roles of the journal lists Rosa
     Delgado with "Author" under "Roles", and its "Invitations" table
     holds no invitation for her (Rules 1, 22). <sup>s</sup>

8. **The Site Administrator changes a user's roles on "Edit User"**

   Given: Site Administrator, on a scratch journal with Lena Ortiz, an
   Author, and, on a journal or a press, Rui Tanaka, who holds a reviewer
   role.

   - **"Edit User"**: on the journal's Settings wizard, tab "Users" (as
     in scenario 7), press the arrow at the start of Lena Ortiz's row,
     then "Edit User": the window "Edit User" opens on "User Details",
     with her username as plain text, no "Editorial Notes", and "Author"
     ticked under "User Roles". {OJS OMP} The reviewer role's "Appear on
     Masthead" box is ticked and cannot be changed, although Lena holds
     no reviewer role (Rule 24; Fields, "Edit User").
   - **Every role unticked**: untick "Author" and press "OK": "You need
     to select at least one role to be associated with this user." (Rule
     24).
   - **Roles changed**: tick "Reader" and press "OK": the window closes
     and "User edited." shows, while Lena's row still lists "Author"
     beside "Reader" [A17](#a17). Reload the page and open the tab
     "Users" again: her row reads "Reader" under "Roles" (Rule 24).
   - **Lena's mailbox**: holds no email about either change (Rule 24;
     Side effects).
   - **Users & Roles**: Settings › Users & Roles of the journal lists Lena
     with "Reader" under "Roles", and its "Invitations" table holds no
     invitation for her (Rules 1, 24).
   - **A reviewer's account** {OJS OMP}: press "Edit User" on Rui
     Tanaka's row: the window shows "Editorial Notes" (Rule 24; Fields,
     "Edit User").
   - **Control**: Lena signs in with her old password, the password
     boxes having been left empty on "Edit User" (Fields "Password").
     <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A15 (Rule 17; issue report
    `docs/issues/U53-A15-merge-account-opened-discussion-fails.md`):
    merging the editor who recorded a submission's recommendation into
    another account, the window closing, the merged account refused at
    sign-in and the discussion naming the chosen account as creator
- **Nothing new to test**:
  - a "Username" outside the characters the Fields section allows, on
    "Add User", whose refusal the Fields section does not quote (Fields
    "Username")
  - the shorter address `{journal}/management/access` typed by a
    manager-level role, which answers the access-denied page, where the
    side menu's address opens the list (Actors row 1)
  - the Editor, the Production Editor and a Site Administrator holding a
    manager role on the "Users" list, offered what the Journal Manager of
    scenarios 1 to 6 is (Actors row 1)
  - the older grid's "Email", "Disable User", "Enable", "Remove" and
    "Merge User", which do what the Users list's actions in scenarios 2,
    3, 5 and 6 do, only the disable and enable windows' headings
    differing (Rule 20)
- **Register carries it**:
  - A1 ("Disable User" and "Enable User" refused inside the window on the
    rows of users outside the manager's reach; Rule 13; scenario 4
    passes it)
  - A2 ("Remove User" on the Site Administrator's row; Rule 15; scenario
    4 passes it)
  - A3 (a user with no role left, still listed on the Users list, in the
    "Merge user" window and on the older grid; Rules 3, 16; scenario 5
    passes it)
  - A7 (the reason for enabling kept as the next reason for disabling;
    Rule 12; scenario 3 passes it)
  - A8 ("Remove User" sending no email; Rule 14; scenario 5 passes it)
  - A9 (a merge dropping the merged account's section assignments; Rule
    18)
  - A10 (the older grid's "Disable User" and "Remove" on the
    administrator's own row; Rule 20)
  - A11 and OPS1 (the list in the French interface; Rule 25)
  - A12 (the ORCID and disabled icons unnamed to a screen reader; Fields
    "Name")
  - A13 (the Site Administrator's empty "Roles" cell in the "Merge user"
    window and on the older grid; Fields)
  - A16 ("Generate Password" unticked again, "Notify User" left locked;
    Rule 23)
  - A17 (the grid's row still listing a role just ended on "Edit User";
    Rule 24; scenario 8 passes it)
  - A18 (a role with an end date still to come left out of "Roles", a
    role not yet begun listed with its start date; Fields "Roles", "Start
    Date"; Rule 3a)
  - A19 ("Remove User" on a user whose only role has not yet begun; Rule
    15a)
  - A20 (a role with an end date still to come that neither the list nor
    the roles page can end; Rule 3a)
- **No seed**:
  - a Site Administrator whose only role in the journal is Reader,
    opening the list by its address (Actors row 1; ending the
    administrator's manager role is a screen action no key makes)
  - the merged account's uploaded files, recorded decisions, messages
    in a discussion someone else opened and notifications, found on the
    chosen account after a merge (Rule 17; no key makes a decision or a
    reply in a discussion as a named account)
  - a site "Minimum password length (characters)" other than 6
    (Settings bullet 2; a site setting no key sets)
- **Owned by another feature**:
  - the Section Editor and every other role refused Users & Roles (Actors
    row 1; *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenario 2)
  - "Edit" opening the user's roles page (Actors row 2; Rule 8;
    *[User invitations](U06-user-invitations.md)*, scenario 8)
  - "Login As" on a row (Actors row 7; *[Login &
    sessions](U01-login-and-sessions.md)*, scenario 7)
  - "Login As" on the row of a user whose role in another journal has
    ended (Actors row 7; *Login & sessions*, its Rule 14)
  - "Edit User" opening "Change Password" unticked and clearing a flag
    already set (Fields "Change Password"; Rule 24; *Login & sessions*,
    its A10)
  - a masthead change on a press or preprint server (Rule 8; A14;
    *User invitations*, its OMP1)
  - an unsaved "Site Access Options" change lost on leaving the page
    (Rule 1; *Journal identity & about pages*, its Rule 5)
  - "Bulk Emails" ticked for the journal: the "Notify" tab (Settings
    bullet 1; *Notify users (bulk email)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | "Disable User" and "Enable User" are offered on rows the manager may not administer, and refused only inside the window | 🐞 | user-visible | — |
| [A2](#a2) | "Remove User" on the Site Administrator's row ends in "An unexpected error has occurred…" | 🐞 | user-visible | — |
| [A4](#a4) | The search box's example names "Journal editor" on a press and a preprint server | 🐞 | minor | — |
| [A5](#a5) | The row's "…" button is announced to screen readers as a raw code | 🐞 | minor | — |
| [A6](#a6) | The disable window's "Current Roles : " line lists roles that have ended | 🐞 | minor | — |
| [A7](#a7) | The reason typed when enabling becomes the reason shown at the next disabling | 🐞 | minor | — |
| [A9](#a9) | A merge drops the merged account's section assignments | 🐞 | latent | — |
| [A11](#a11) | The French "Users" tab prints raw codes for its search label, the Invitations heading, button and columns, and the "Start Date" column | 🐞 | minor | — |
| [A12](#a12) | The ORCID and disabled icons after a name have no name for a screen reader | 🐞 | minor | — |
| [A13](#a13) | The "Merge user" window and the older grid show nothing under "Roles" for the Site Administrator | 🐞 | minor | — |
| [A14](#a14) | A masthead change on the roles page of a press or preprint server ends in an "Error" dialog and emails nobody | 🐞 | user-visible · crash: server | — |
| [A15](#a15) | Merging a user recorded as a discussion's or task's creator stops halfway with no message, and the account still signs in | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A16](#a16) | "Notify User" stays greyed out after "Generate Password" is unticked | 🐞 | minor | — |
| [A17](#a17) | After "Edit User" ends a role, the grid's row still lists it until the page is reloaded | 🐞 | minor | — |
| [A19](#a19) | "Remove User" on a user whose only role has not yet begun ends in "An unexpected error has occurred…" | 🐞 | user-visible | — |
| [OPS1](#ops1) | On a French preprint server the "Roles" column prints raw codes for two roles | 🐞 | minor | — |
| [A3](#a3) | A user removed from the journal stays in the list with no role | ❓ | minor | — |
| [A8](#a8) | "Remove User" tells the user nothing, where "Remove Role" emails them | ❓ | minor | — |
| [A10](#a10) | The Site Administrator's older grid offers "Disable User" and "Remove" on the administrator's own row | ❓ | latent | — |
| [A18](#a18) | "Roles" leaves out a role that ends on a future date, which "Editorial Masthead" lists, and shows a role that starts on a future date as if held | ❓ | minor | — |
| [A20](#a20) | A user whose only role ends on a future date cannot be removed from the list or the roles page before that date | ❓ | user-visible | — |

### All apps

<a id="a1"></a>
**A1 — Disabling offered where it is refused** · 🐞 · user-visible.
A manager other than the Site Administrator sees "Disable User" (or
"Enable User") on every row but their own, including the rows of users
with a current role in a journal the manager does not manage and the Site
Administrator's. The menu hides "Login As" and "Merge user" on those
rows, but pressing "Disable User" there opens the window and then
refuses with "You do not have sufficient permissions to administer this
user…". The manager expects either the action to work or not to be
offered.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Removing the Site Administrator fails with an unexplained error** · 🐞 · user-visible.
A manager's list offers "Remove User" on the Site Administrator's row.
"OK" in the "Remove" dialog brings an "Error" dialog, "An unexpected
error has occurred. Please reload the page and try again.", and the
administrator keeps every role. The manager expects the action to be
absent, or a message saying why it cannot be done; reloading changes
nothing.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A removed user stays listed with no role** · ❓ · minor.
After "Remove User" the user's row stays in "Current Users", counted in
the heading, with empty "Roles" and "Start Date" cells, for as long as
the account exists. The "Merge user" window and the Settings wizard's
"Users" grid keep such a user too, with nothing under "Roles". A manager
who removed someone expects them to leave the journal's list, or at least
to see the row marked as a former member.
Question: should the list keep users whose roles here have all ended?
Lean: keep them (a manager may want to invite them back or merge them),
but mark the row, for example "No current role", and let the list hide
them.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The search example names a journal role everywhere** · 🐞 · minor.
The search box reads "Enter a user's name, role (e.g Journal editor), or
affiliation" on a press and a preprint server too, where no role of that
name exists (a press has "Press editor"; a preprint server has no editor
role). The example should name a role of the app it is shown in.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The row's action button has a raw code for a name** · 🐞 · minor.
A screen reader announces the "…" button at the end of every row as
"##userAccess.management.options##" instead of a word such as "Options";
the menu it opens reads normally.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The disable window lists ended roles** · 🐞 · minor.
The line under "Disable {full name}" reads "Current Roles : {roles}" with
a space before the colon, and names every role the user ever held in the
journal, ended ones included, although the list's "Roles" column leaves
ended roles out.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The enabling reason becomes the next disabling reason** · 🐞 · minor.
"Enable User" opens with the old disabling reason in "Reason for enabling
user", and whatever the box holds on "OK" is stored as the account's
reason. The next "Disable User" offers that text, and if nobody clears
it the Login page tells the user their account was disabled "for the
following reason:" followed by the reason for enabling it.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Removal from the journal sends no word** · ❓ · minor.
"Remove User" ends every role the user holds in the journal with no
email, while ending one role with "Remove Role" on the user's roles page
emails them "You have been removed from a role". The removed user learns
of it only when their screens change.
Question: should "Remove User" send the same notice, once per role or
once in all? Lean: yes, one email listing the roles ended.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A merge drops the merged account's section assignments** · 🐞 · latent.
Merging an account that edits one of the journal's sections moves its
roles, review assignments and participations to the chosen account but
not its section assignment: in the section's "Edit" window the merged
editor's box is gone and the chosen account's stays unticked, so the
section loses that editor until a manager ticks the chosen account by
hand.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The administrator can disable their own account** · ❓ · latent.
On the Settings wizard's "Users" tab the Site Administrator's own row
offers "Disable User" and "Remove", which the Users & Roles list never
offers on the signed-in user's own row. Disabling there would lock the
administrator out at their next sign-in.
Question: should the older grid hide both on the administrator's own row,
as the list does? Lean: yes.
Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The French list shows raw codes** · 🐞 · minor.
In the French interface the "Users" tab prints raw codes instead of
French text: the search box "##userAccess.search##", the Invitations
heading "##invitation.header##", the "Invite to a role" button
"##invitation.inviteToRole.btn##", the Invitations table's columns
"##INVITATION.TABLEHEADER.NAME##" and "##INVITATION.HEADER##", and the
list's "Start Date" column "##USERACCESS.TABLEHEADER.STARTDATE##". The row
button's name is A5's raw code in every app and language.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The status icons have no name for a screen reader** · 🐞 · minor.
In the list's "Name" cell a screen reader hears the ORCID icon and the red
disabled icon as unnamed images, so without sight a disabled account
cannot be told from an enabled one, nor an account with an ORCID iD from
one without. Each icon should carry a name, such as "ORCID iD" and
"Disabled".
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The older lists show no role for the Site Administrator** · 🐞 · minor.
In the "Merge user" window and on the Settings wizard's "Users" grid the
Site Administrator's row shows nothing under "Roles", while the Users &
Roles list names their manager role ("Journal manager", "Press manager",
"Preprint Server manager") with an empty "Start Date". The grid still
offers "Remove" on that row. The lists should agree on the roles an
account holds.
Basis: probe. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A masthead change on a press or preprint server ends in an error** · 🐞 · user-visible · crash: server.
On a press or preprint server, confirming a masthead change on the
user's roles page (Rule 8) brings an "Error" dialog, "Email template
USER_ROLE_MASTHEAD_UPDATE not found. The migration script
I11800_AddUserRoleMastheadUpdateEmail needs to be run.": the app fails
while sending the notice. The choice is kept after a reload, and the
user gets no email. The page belongs to *User invitations*, whose
[OMP1](U06-user-invitations.md#omp1) holds the full entry.
Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — Merging a user recorded as a discussion's or task's creator stops halfway with no message, and the account still signs in** · 🐞 · medium · crash: server.
A manager merges one user account (the merged account) into another (the
chosen account). The app fails on the server partway through. After "OK"
in the "Confirm" dialog nothing seems to happen: the dialog and the
"Merge user" window stay open, and no message appears.
By then the merge has already handed the merged account's roles,
submission assignments and messages to the chosen account. But the
merged account is not deleted. It no longer appears under "Users &
Roles", yet it still signs in with its username and password, and its
discussions still name it as their creator. After a reload the merge
looks done.
This happens whenever the merged account is recorded as the creator or
starter of a discussion or task on any submission. That covers anyone
who opened a discussion or added a task, and any editor who recorded a
recommendation, which opens a discussion in the editor's name. It also
covers any participant who was sent a message with the Participants
list's "Notify", which records the recipient as the creator. Merging an
account that only takes part in someone else's discussion works. No
release is affected: the fault is only on `main`, which is not yet
released.
Basis: probe, 2026-09-30. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — "Notify User" stays locked after "Generate Password" is unticked** · 🐞 · minor.
On "Add User", ticking "Generate Password" and then unticking it empties
and opens the password boxes again, but "Notify User" stays greyed out
and unticked, so the welcome email cannot be chosen for a typed password
until the window is closed and opened again.
Basis: probe. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — The grid's row still lists a role just ended** · 🐞 · minor.
On the Settings wizard's "Users" tab, the Site Administrator unticks
"Author" and ticks "Reader" on "Edit User" and presses "OK". Both changes
are saved and "User edited." shows, but the user's row, which the grid
refreshes, lists both "Author" and "Reader" under "Roles" and keeps doing so.
Only reloading the page shows "Reader" alone, and a reload made the
moment the save ends can still list both. The Site Administrator is shown
a role that has already ended as if it were current.
Basis: test run, 2026-09-26. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — "Roles" goes by the end date, not by whether the role is held today** · ❓ · minor.
A manager reads the "Roles" and "Start Date" cells as the roles a user
holds now. A role that ends on a future date is left out, although the
user holds it and "Editorial Masthead" lists them under it; a user whose
only role is such a role shows empty cells, like a removed user (Rule 3a).
A role that starts on a future date is listed with that date, as if held,
although "Editorial Masthead" does not list the user yet. The first case
arises only on a journal or a press (a Users XML import); the second on
every app (an invitation's start date).
Question: should the list show the roles held today, or every role not
yet ended? Lean: a bug for the role that ends later, since the user holds
it; a role still to begin may stay listed if its row says it has not begun.
Basis: probe. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — Removing a user whose only role has not begun fails with an unexplained error** · 🐞 · user-visible.
A user whose only role here starts on a future date is offered "Remove
User". "OK" in the "Remove" dialog brings an "Error" dialog, "An
unexpected error has occurred. Please reload the page and try again.";
the role stays and the menu keeps offering "Remove User", after a reload
too. The manager expects the role to end, or a message saying why it
cannot; the same failure as [A2](#a2) on the Site Administrator's row.
Basis: probe. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A role ending on a future date cannot be ended early** · ❓ · user-visible.
On a journal or a press, a user whose only role here ends on a future
date (a Users XML import) holds it and is listed on "Editorial Masthead",
but their row offers no "Remove User", and their roles page shows the
role with its End Date and "User Removed From Role" in place of "Remove
Role". A manager who wants the person off the journal before that date
finds no way to do it on either screen, and the roles page says the
person was already removed.
Question: should a role with a future end date count as current for
"Remove User" and the roles page? Lean: yes, as "Editorial Masthead"
already treats it.
Basis: probe. <sup>f-a20</sup>

### OPS

<a id="ops1"></a>
**OPS1 — French role names missing on a preprint server** · 🐞 · minor.
In the French interface of a preprint server the "Roles" column prints
"##default.groups.name.manager##" and
"##default.groups.name.sectionEditor##" for the manager and Moderator
roles, where a journal and a press print French role names.
Basis: probe. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips (ojs `71bb244152`, omp
`187f0f40d2`, ops `61cd158ce3`, one lib/pkp `76a315591b` and ui-library
`03d1cee2` in all three). The body was live-probed on 2026-09-25 on OJS,
OMP and OPS; each note names the rules its probe settled, and the two
claims still read only in the code say so in their notes (v, w).

<a id="fn-n"></a>
**n** — Reach. The Vue list's `canLoginAs` / `canMergeUsers` come from
`PKP\user\maps\Schema::getPropertyCanLoginAs()` /
`getPropertyCanMergeUsers()`: true for everyone but oneself when
`Validation::isSiteAdmin()`, otherwise from
`Repo::user()->permissionMapForManager()`, which marks a user unmanaged
when any `user_user_groups` row of theirs sits in a context where the
acting user has no `ROLE_ID_MANAGER` group (ended rows on both sides
count; a site-level group has a null context and never matches, so a Site
Administrator is out of a manager's reach). The server-side check of the
row actions is `Validation::getAdministrationLevel()`: a Site
Administrator target is always `ADMINISTRATION_PROHIBITED`; a site admin
actor is `FULL` otherwise; a manager is `FULL` when every active role of
the target sits in a context where the manager holds an active manager
role, `PARTIAL` when the target also has roles elsewhere and the current
context is managed, `PROHIBITED` otherwise. Manager-level = any group with
`ROLE_ID_MANAGER` (OJS/OMP registry `userGroups.xml`: manager, editor,
productionEditor, all `permitSettings="true"`; OPS: manager only). Code
read 2026-09-25, checkouts ojs `71bb244152`, omp `187f0f40d2`, ops
`61cd158ce3`, one lib/pkp `76a315591b` and ui-library `03d1cee2` in all
three (identical submodule pointers: the whole feature is shared code).
Live-probed 2026-09-25 (Actors paragraph; Rule 7), all three apps, as the
Journal Manager of the seeded and of scratch journals, their Editor and
Production Editor (OJS, OMP) and the Site Administrator: a user whose
roles all sat in the manager's journal was offered "Login As" and "Merge
user"; a user with a current role in another journal was not, nor one
whose only role there had been ended by that journal's "Remove User", and
that user was then disabled by this journal's manager like any other. The
Site Administrator's row offered neither to any manager; the Site
Administrator got both on every row but their own, other journals' users
included.

<a id="fn-v"></a>
**v** — Read from the code (note n): `getPropertyCanLoginAs()` and
`getPropertyCanMergeUsers()` answer true on every row but one's own for a
site admin, while `getAdministrationLevel()` makes a Site Administrator
target `ADMINISTRATION_PROHIBITED`, which `LoginHandler::signInAsUser()`
and `UserGridHandler::mergeUsers()` refuse. It cannot be seen on the test
installs: none holds a second Site Administrator, and the Settings
wizard's "User Roles" boxes list journal roles only (2026-09-25). Settled
by the row menu of a second Site Administrator's account as the first one
sees it.

<a id="fn-a"></a>
**a** — Page: `ManagementHandler::settings()` maps `access` to
`ManagementHandler::access()` → `templates/management/access.tpl`
(`AccessPage.vue`, VUE-013): tabs `manager.users` "Users" (holding
`<user-invitation-manager>` then `management/accessUsers.tpl` →
`<user-access-manager>`, VUE-051), `manager.roles` "Roles" (the
`UserGroupGridHandler` grid), `manager.setup.notifyUsers` "Notify" only
`{if $enableBulkEmails}`, `manager.siteAccessOptions.siteAccessOptions`
"Site Access Options", `orcid.displayName` "ORCID"; heading
`navigation.access` "Users & Roles". Gate:
`ManagementHandler::authorize()` adds `CanAccessSettingsPolicy` for the
`settings` op (site admin group, or a manager group with
`permitSettings`); the side menu's "Settings" group (`PKPTemplateManager`,
backend menu) needs a context group with `permitSettings`. Each app's
`SettingsHandler` grants `settings` to `ROLE_ID_MANAGER` and, on OJS only,
to `ROLE_ID_SITE_ADMIN` as well (OMP/OPS give the site admin only the
`access` op), which is why the Settings gate differs by app (the
journal-identity spec's A1). Live-probed 2026-09-25 (Rule 1; Actors row
1), all three apps: Settings › Users & Roles opened for the Site
Administrator, the Journal Manager, and the Editor and Production Editor
(OJS, OMP), with the tabs "Users", "Roles", "Site Access Options",
"ORCID", and "Notify" between "Roles" and "Site Access Options" while the
journal was ticked under "Bulk Emails". An Editor whose role had "Permit
changes to Settings" unticked had no "Settings" and got the access-denied
page, as did the Section Editor, Reviewer, Copyeditor, an assistant role,
Author and Reader. A changed "Site Access Options" choice survived a
switch to "Users" and back, and was gone after the page was left, with no
question asked. Live-probed 2026-09-28 (Actors row 1, the two
addresses), all three apps, two runs each: the seeded journal's
`manager.maya` and `editor.diana` (OJS, OMP; not enrolled on OPS) and a
scratch journal's Journal Manager, Editor and Production Editor (OJS,
OMP; its manager alone on OPS) got "Users & Roles" with "Current Users
({n})" and no dialog at `{journal}/management/settings/access`, the
address the side menu's "Users & Roles" carries, and at
`{journal}/management/access` the access-denied page
(`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
"The current role does not have access to this operation.", only a
"Home" breadcrumb). Each app's `SettingsHandler` grants the `access` op
to `ROLE_ID_SITE_ADMIN` alone, so `admin` (holding the journal's manager role) opened the list at
both addresses. `sectioneditor.ana`, `reader.rosa` and a scratch Section
Editor got the access-denied page at both and had no "Users & Roles" in
the side menu.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (Actors row 1), all three apps, on a
scratch journal whose `users[]` gave `admin` the Reader role, the
administrator's manager role then ended on their own roles page. OJS:
`{journal}/management/settings/access` loaded "Users & Roles" with
"Current Users (1)" (their own row, "Reader", menu "Edit", "Email") under
the dialog "Error" / "The current role does not have access to this
operation."; after "OK" the tabs worked, the Roles grid included, and the
side menu showed "Settings" (Journal, Website, Workflow, Distribution,
Users & Roles) and "Administration". OMP, OPS: that address answered the
access-denied page, and `{context}/management/access`
(`ManagementHandler::access()`, granted to the site admin directly) opened
the same page under the same dialog. On all three the dashboard address
showed the reader's pages with no editorial side menu. The dialog comes
from the side menu's `GET …/api/v1/_submissions/viewsCount` answering 401;
every Users & Roles request answered 200.

<a id="fn-e"></a>
**e** — Store: `UserAccessManagerStore::editUser()` redirects to
`management/settings/user/{id}` → `ManagementHandler::editUser()` →
`UserRoleAssignmentInviteUIController::createHandle()` (the invitation
feature's wizard, VUE-052). Live-probed 2026-09-25 (Rule 8; Actors row 2),
all three apps, as the Journal Manager on a throwaway user's row: the
breadcrumb "Users & Roles / Invite user to take a role", an empty `main
h1`, the steps "1 Enter details" and "2 Review & invite for roles", and
"STEP 1 - Enter details and invite for roles". "Remove Role" asked "Are
you sure you want to remove this role? The user will lose access and
permissions associated with it." and took effect at once, the user
receiving "You have been removed from a role"; a masthead change asked
"Confirm masthead visibility change" and on OJS sent "Your journal
masthead visibility has been updated" (OMP and OPS: note f-a14); "Add
Another Role" › "Save And Continue" › "Invite user to the role" showed
"Invitation Sent", and the user received "You are invited to new roles".

<a id="fn-f"></a>
**f** — Menu `email.email` "Email" →
`useUserAccessManagerActions::sendEmail()` opens the legacy modal (title
`grid.user.email` "Email") on `UserGridHandler::editEmail()` →
`UserEmailForm` (`userEmailForm.tpl`: `email.subject` "Subject",
`email.to` "To" disabled with "{full name} <{email}>", `email.body`
"Body", submit `common.sendEmail` "Send Email").
`UserEmailForm::execute()` builds a bare `Mailable` from the acting user's
email and full name to the target, the typed subject and body; no
template, no email-log entry (it is not a submission email).
`editEmail`/`sendEmail` require only that the acting user be a site admin
or a manager of the context. Live-probed 2026-09-25 (Rule 9; Actors row 3;
Side effects), all three apps: "Email" on every row, the manager's own
included (its "To" the manager's own name and address); "Send Email"
delivered one message from the manager's name and address to the account,
subject and text exactly as typed, and closed the window with no notice on
the page; "Cancel" sent nothing (a control email sent afterwards arrived
alone).

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25 (Fields, the "Email" window), all three
apps: with "Subject" empty and Hello in "Body", "Send Email" sent no
request and showed "This field is required." under "Subject"; with
"Subject" Hello and "Body" empty the request went and the window showed
the notice "Please provide the email body text." at its top, nothing under
the field, the window staying open. The mail catcher held nothing from
either. Code: `UserEmailForm` checks `email.subjectRequired` and
`email.bodyRequired`; the empty "Subject" is caught first by the form's
own client validation (`validator.filled`).

<a id="fn-g"></a>
**g** — Menu `grid.user.disable` "Disable User" / `grid.user.enable`
"Enable User" (guard: not own row) →
`useUserAccessManagerActions::disableUser()`: legacy modal titled
`user.disabledModal.title` "Disable {$fullName}" (or
`user.enabledModal.title` "Enable {$fullName}"), description
`user.disabledModal.description` "Current Roles : {$roles}" on both, over
`UserGridHandler::editDisableUser()` → `UserDisableForm`
(`userDisableForm.tpl`: `grid.user.disableReason` "Reason for disabling
user" + `grid.user.disableReasonDescription`; default buttons "OK" /
"Cancel", `FormBuilderVocabulary` `common.ok`).
`UserDisableForm::execute()` sets `disabled` and `disabledReason`, writes
the audit log, and calls `invalidateOtherSessions()` for the disabled
user. The name cell (`UserAccessManagerCellName.vue`) shows the `Orcid`
icon when `user.orcid` is set and the `DisableUser` icon (`text-negative`)
when `user.disabled`. The list requests `status: 'all'`, so disabled
accounts stay listed. The scenario key `users[].disabled` disables the
same way (scenarios.md). Live-probed 2026-09-25 (Rules 10, 11; Fields, the
disable windows), all three apps: "Disable {full name}" with "Current
Roles : Author, Section editor" (OMP "Series editor", OPS "Moderator"),
the note and the box; "OK", with the box empty or holding Test, closed it,
and the row gained the red icon and "Enable User" on the same page and
after a reload; the Login page then refused the user with "Your account
has been disabled. Please contact the administrator for more information."
or "Your account has been disabled for the following reason: Test".
"Cancel" with a typed reason closed the window with no question, and the
box came back empty. The disabled user's roles page read "The user is
currently disabled. … Please enable the user first to invite them to a
role." with "Add Another Role" inactive; the row kept its roles, and
"Edit", "Email" and "Merge user" were still offered.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25 (Rule 11), all three apps: a throwaway
user signed in in one browser and disabled by the Journal Manager in
another. Back in the user's browser the journal-name link opened the home
page signed out (header "Register", "Login"), and their profile and "Start
A New Submission" showed the Login page. Code:
`UserDisableForm::execute()` →
`getSessionGuard()->invalidateOtherSessions($userId)`.

<a id="fn-h"></a>
**h** — `UserDisableForm::initData()` loads the stored `disabledReason`
into the box whichever way the window opens; `execute()` stores the box as
`disabledReason` on enable too (`setDisabled(false)` then
`setDisabledReason(...)`). Enable window: `grid.user.enableReason` "Reason
for enabling user" + `grid.user.enableReasonDescription`. Live-probed
2026-09-25 (Rule 12; A7): note td6.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Rule 12; Fields, the enable window; A7),
all three apps: a throwaway user disabled with the reason Spam; "Enable
User" opened "Enable {full name}" with "Current Roles : Author" and "Spam"
in "Reason for enabling user". Replaced by Appeal accepted and "OK": the
icon went, the menu read "Disable User", and the user signed in. "Disable
User" again offered "Appeal accepted"; after "OK" the Login page read
"Your account has been disabled for the following reason: Appeal
accepted". With the box cleared on enabling, the next disabling's box was
empty and the Login page gave the sentence without a reason.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 13; Actors row 4; A1), all three
apps: a throwaway user enrolled in two scratch journals. As the second
journal's Journal Manager, and as its Editor (OJS, OMP), the user's menu
read "Edit", "Email", "Remove User", "Disable User" (no "Login As", no
"Merge user"); a disabled one's the same with "Enable User"; the Site
Administrator's row the same. "Disable User" opened "Disable {full name}"
with the "Current Roles" line and "You do not have sufficient permissions
to administer this user. …" inside the window, with no reason box and only
"Close"; after a reload the row was unchanged. As the Site Administrator
the same row's window held the box, "Cancel" and "OK". A user whose only
role in the other journal had been ended by its "Remove User" was disabled
by this journal's manager. Code: the Vue menu guards "Disable User" with
not-own-row only (`useUserAccessManagerConfig::getItemActions()`), while
`UserGridHandler::editDisableUser()` and `disableUser()` answer
`JSONMessage(false, __('grid.user.cannotAdminister'))` unless
`getAdministrationLevel()`, which counts current roles only (note n), is
`FULL`.

<a id="fn-c"></a>
**c** — Menu `grid.user.remove` "Remove User", offered when not own row
and `user.groups.find(g => g.dateEnd === null)` →
`useUserAccessManagerActions::removeUser()`: dialog `common.remove`
"Remove", `manager.people.confirmRemove` (app locale: OJS "…from this
journal?…within this journal.", OMP "press", OPS "server"), "OK" /
"Cancel"; "OK" posts to `UserGridHandler::removeUser()` with the form
token. `removeUser()` refuses `ADMINISTRATION_PROHIBITED` (with the
context, so `PARTIAL` passes), answers `grid.user.userNoRoles` "This user
does not have any roles." when nothing is active, else sets `date_end` now
on every active `user_user_groups` row of this context in one query (no
model events, no mail) and logs `USER_CONTEXT_REMOVED` to the audit log.
The list keeps the user because the Users API collector's context filter
counts ended assignments when `status` is `all`
(`Collector::buildUserGroupFilter()`), while the "Roles" and "Start Date"
cells (`UserAccessManagerCellUserGroups.vue`,
`UserAccessManagerCellStartDate.vue`) print only groups with no `dateEnd`.
Seen 2026-09-23 (journal-identity claim check K4-3): the removed user
stayed in the list with no role; seen 2026-09-22 (stage-participants claim
check K2): the Edit page's "Remove Role" took effect at once. Live-probed
2026-09-25 (Rules 3, 14; Actors row 5; A3), all three apps: "Remove User"
only on rows with a current role, never the own row; the dialog as quoted
(OMP "…from this press? … within this press.", OPS "…from this server? …
within this server."), "Cancel" changing nothing. "OK" left the row with
empty "Roles" and "Start Date", the heading's count unchanged and "Remove
User" gone from the menu, on the same page and after a reload; the user's
roles page listed the roles with today's end date and "User Removed From
Role"; the user's role in another journal stayed, and they still signed
in; the mail catcher held nothing for them but a control email. On the
roles page the last role's "Remove Role" answered "You cannot remove the
role. At least one role must be assigned to the user." and the role
stayed. Live-probed 2026-09-30 (Rules 3a, 7, 15a; Actors row 5), all
three apps, two runs each, as a scratch journal's manager: "Remove User"
was offered exactly on the rows whose "Roles" cell named a role, a role
from 2027-06-01 with no end included, and not on a user whose only role
ran 2020-01-01 – 2030-12-31 or 2027-06-01 – 2030-12-31 (OJS, OMP; notes
f-a19, f-a20).

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Rule 15; A2), all three apps, as a
scratch journal's Journal Manager: the Site Administrator's row offered
"Edit", "Email", "Remove User", "Disable User"; "Remove User" › "OK"
brought "Error" / "An unexpected error has occurred. Please reload the
page and try again.", and the "Roles" cell still read "Journal manager"
("Press manager", "Preprint Server manager") after a reload. Code:
`removeUser()` answers `JSONMessage(false, grid.user.cannotAdminister)`
(status 200) for a Site Administrator target; the store calls
`openDialogNetworkError()` with no argument, so the dialog shows
`common.unknownError` rather than the server's message.

<a id="fn-i"></a>
**i** — Menu `grid.action.mergeUser` "Merge user" (guards: not own row,
`user.canMergeUsers`) → `useUserAccessManagerActions::mergeUser()`: legacy
modal titled "Merge user" on `UserGridHandler::mergeUsers()` with
`oldUserId`, which, without `newUserId`, returns a fresh `UserGridHandler`
grid titled `grid.user.mergeUsers.mergeIntoUser` "Merge into this User";
its rows (`UserGridRow` with `oldUserId`) carry only the `mergeUser`
action labelled "Merge into this User", skipped on the old user's own row.
Filter form `userGridFilter.tpl`: `common.search` "Search" box,
`userGroup` select led by `grid.user.allRoles` "All Roles", checkbox
`user.noRoles.selectUsersWithoutRoles` (app locale: "Include users with no
roles in this journal." / "…press." / "…server."), submit "Search".
Columns (`UserGridHandler::initialize()`): `user.givenName` "Given Name",
`user.familyName` "Family Name", `user.username` "Username", `user.roles`
"Roles" (active and future roles in this context), `user.email`. Filter:
`loadData()` — role, search phrase (the collector's `searchPhrase`), and
the context restriction unless the box is ticked. Live-probed 2026-09-25
(Rule 16; Fields, the shared search form; A13), all three apps, in the
"Merge user" window and on the Settings wizard's "Users" tab: the search
form hidden until the "Search" link above the list was pressed; the text
box found by family name and by email; the role select arrived on "All
Roles", listing every role of the journal (OJS 18, OMP 19, OPS 5), and
narrowed the list; the box "Include users with no roles in this journal."
("…press.", "…server.") unticked by default. An account with no role row
here was listed only with the box ticked; users whose roles here had all
ended were listed without it, their "Roles" cell empty. The window's list
is headed "Merge into this User"; the merged account's row has no arrow.

<a id="fn-j"></a>
**j** — Confirmation `grid.user.mergeUsers.confirm`
(RemoteActionConfirmationModal). Second pass of
`UserGridHandler::mergeUsers()` requires the form token and
`getAdministrationLevel(oldUserId)` `FULL`, then
`Repo::user()->mergeUsers($old, $new)`: submission files' uploader, notes
(`Repo::note()->transfer`), decisions (`reassignDecisions`), review
assignments' reviewer, email-log and event-log user, submission comments'
author, notifications; old sessions invalidated, temporary files deleted,
`SubEditorsDAO::deleteByUserId($old)`; `user_user_groups` copied to the
new user unless the new user already has that group (dates and masthead
kept), then deleted for the old; stage assignments moved unless a
duplicate exists; the old user deleted. The answer carries the global
event `userMerged`, on which
`js/controllers/grid/users/UserGridHandler.js` triggers `modalFinished`
(the window closes) and the list refreshes (`triggerDataChange`).
Live-probed 2026-09-25 (Rule 17; Side effects), all three apps: the
dialog, headed "Confirm", read as quoted, with "OK" and "Cancel"; "Cancel"
left the "Merge user" window open. After "OK" the window closed and the
list no longer showed the merged account, on the same page and after a
reload. The chosen account held the merged account's roles once each, an
ended Reader role with its dates 2020-01-01 – 2021-06-30, and a role kept
at "Does not appear on the masthead"; a role in a second journal moved too
(merged by the Site Administrator). The submission's Participants, the
review assignment's row (OJS, OMP) and the Activity Log lines named the
chosen account. The merged account's open session showed the Login page at
its next page, its username was refused with "Invalid username/email or
password. Please try again.", and its approved public comment was gone
from the Comments page.

<a id="fn-w"></a>
**w** — Read from the code (note j: `mergeUsers()` moves the submission
files' uploader, the decisions, the notes, which are the messages in
discussions, and the notifications); not seen on 2026-09-25. Settled by a
file uploaded, a decision recorded and a message posted in a discussion
someone else opened, all by the merged account, read after the merge.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Rule 18; A9), all three apps: a scratch
journal's section (on a press, a series added on screen) whose "Edit"
window ticked "Assign {merged account} as Section editor" (Series editor,
Moderator), the chosen account unticked. After the merge the merged
account's box was gone and the chosen account's stayed unticked. Code:
`Repo::user()->mergeUsers()` calls `SubEditorsDAO::deleteByUserId($old)`
and never re-creates the rows for the new user.

<a id="fn-o"></a>
**o** — Menu `grid.user.logInAs` "Login As" (guards: not own row,
`user.canLoginAs`) → dialog `grid.action.logInAs` "Login As",
`grid.user.confirmLogInAs` → `login/signInAsUser/{id}`. Owned by the
login-and-sessions spec (AFFM-105). Live-probed 2026-09-25 (Actors row 7):
"Login As" offered exactly where "Merge user" is, never on the own row, a
disabled account's row included; its confirmation read "Log in as this
user? All actions you perform will be attributed to this user."

<a id="fn-k"></a>
**k** — Older grid: `ContextGridRow` action `wizard` (`grid.action.wizard`
"Settings wizard") → `AdminHandler::wizard()` →
`templates/admin/contextSettings.tpl` (heading `manager.settings.wizard`
"Settings Wizard"; tabs "Journal Settings" ("Setup" on a press, "Server
Settings" on a preprint server), "Plugins", `manager.users` "Users"); the
"Users" tab loads `UserGridHandler::fetchGrid` for the edited context
(GRID-050): title `grid.user.currentUsers`, grid action `addUser`
(`grid.user.add` "Add User"), `PagingFeature`, the filter of note i. Grid
access: `UserGridHandler` grants its ops to `ROLE_ID_MANAGER` and
`ROLE_ID_SITE_ADMIN` behind `ContextAccessPolicy` and
`CanAccessSettingsPolicy`, but only the administrator reaches the wizard
page. Row actions (`UserGridRow::initialize()`, row expander
`grid.settings` "Settings" in `gridRow.tpl`): `email` ("Email"), `edit`
(`grid.user.edit` "Edit User"), `disable` (`grid.user.disable` "Disable
User") or `enable` (`common.enable` "Enable"), `remove`
(`grid.action.remove` "Remove", when the user has an active group in the
context; confirmation `manager.people.confirmRemove`), `logInAs`
(`!Validation::loggedInAs()`, not own row, `getAdministrationLevel()`
`FULL`), `mergeUser` (`grid.user.mergeUsers.mergeUser` "Merge User", not
own row, `FULL`). No own-row guard on `edit`, `disable` or `remove`; for
the acting user `getAdministrationLevel()` returns `FULL` on themselves.
While the Site Administrator impersonates someone the wizard's address
answers the access-denied page, so the `loggedInAs` guard on `logInAs`
never shows. Live-probed 2026-09-25 (Rules 19, 20; Actors row 8), all
three apps: Administration › "Hosted Journals" ("Hosted Presses", "Hosted
Servers") › the row's arrow › "Settings wizard" › "Users". The wizard's
address gave the access-denied page to the Journal Manager, the Section
Editor, the Author and the Reader, and to an account impersonated through
"Login As". The grid's header held "Search" and "Add User"; with 15 users
the line read "Items per page: 10 25 50 75 100 1 - 15 of 15 items", with
28 "1 - 25 of 28 items" and page links, page 2 "26 - 28 of 28 items". The
items-per-page choice is hidden while the list holds no more than the
smallest choice, 10 (`PagingFeature.js`, `configItemsPerPageElement_()`).
Test run 2026-09-26 (Rule 19; scenarios 1 and 7), all three apps: with 2
users the line read "1 - 2 of 2 items" alone, the choice in the page but
hidden; with 32 it read "Items per page: 10 25 50 75 100 …" with page
links; OJS read 5 users as it read 2. From the grid, "Email", "Disable User", "Enable", "Remove" and "Merge User" had
the outcomes of the Users & Roles list, the disable and enable windows
headed "Disable User" and "Enable" with no "Current Roles" line.
Live-probed 2026-09-28 (Rules 19, 24), all three apps, two runs each:
every load of the Settings wizard also requested the Plugin Gallery's
list (`GET …/$$$call$$$/grid/plugins/plugin-gallery-grid/fetch-grid`),
which answered 500, the install having no connection to PKP
([Plugins management](U62-plugins-management.md#a1), its A1); the
"Users" tab worked normally.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 20; A10), all three apps, looking
only: on a scratch journal's Settings wizard › "Users" the Site
Administrator's own row offered "Email", "Edit User", "Disable User",
"Remove" (no "Login As", no "Merge User"); its "Disable User" opened the
ordinary form with "Reason for disabling user", "Cancel" and "OK", and its
"Remove" the removal question; both were cancelled. A throwaway's row
added "Login As" and "Merge User"; a disabled account's read "Enable"; an
account with no role here had no "Remove". On the Users & Roles list the
administrator's own row offered "Edit" and "Email" only.

<a id="fn-l"></a>
**l** — "Add User": `UserGridHandler::addUser()` → `editUser()` with no
row id → `UserDetailsForm` (`userDetailsForm.tpl`, heading
`grid.user.step1` "Step #1: Fill in User Details") including
`common/userDetails.tpl`: `user.givenName` (required, site primary locale,
`FormValidatorLocale`), `user.familyName`, `user.preferredPublicName`,
`user.username` (maxlength 32, `common.suggest` "Suggest" button, help
`user.register.usernameRestriction`, checks
`user.profile.form.usernameRequired`, `user.register.form.usernameExists`,
`FormValidatorUsername` → `user.register.form.usernameAlphaNumeric`),
email (`user.register.form.emailExists`), `user.password` /
`user.repeatPassword` (maxlength 32; `passwordLengthRestriction` with the
site `minPasswordLength`, `passwordsDoNotMatch`),
`grid.user.generatePassword` / `…Description`,
`grid.user.mustChangePassword` "Change Password" / `…Description`
(initData sets `mustChangePassword` true for a new user),
`common.country`, `grid.user.notifyUser` / `…Description`, and the "More
User Details" block (`grid.user.moreDetails`: `user.url`, `user.phone`,
`user.workingLanguages` when the site has more than one locale,
`user.interests`, `user.affiliation`, `user.biography`,
`common.mailingAddress`, `user.signature`). "OK" (`updateUser()`) creates
the user (`Repo::user()->add()`) and returns `UserRoleForm`
(`grid.user.step2`; `grid.user.userRoles` boxes for every group of the
context, `grid.user.userRoles.masthead` "Appear on Masthead" boxes all
ticked; submit "Save"; `manager.users.roleRequired` when none ticked);
`updateUserRoles()` → `saveUserGroupAssignments()` assigns and sets
masthead directly (`assignUserToGroup`,
`updateActiveUserUserGroupMasthead`). "Suggest":
`UserFormHandler::generateUsername()` → `api.user.UserApiHandler`
`suggestUsername` (GRID-003) → `Validation::suggestUsername()` (initial +
family name, ASCII, lower case, `[^a-zA-Z0-9_-]` stripped, numeric suffix
while taken). "Generate Password":
`UserDetailsFormHandler::setGenerateRandom()` fills the password boxes
with `********`, disables them, and checks and disables `sendNotify`;
`UserDetailsForm::execute()` then uses `Validation::generatePassword()`
and forces the welcome email. Live-probed 2026-09-25 (Rules 21–23; Fields,
"Add User" and "Edit User"), all three apps: every refusal of the Fields
table as quoted, an empty "Given Name" with no request sent, a malformed
"Email" with "Please enter a valid email address."; a 33-character
username kept 32. "Suggest" gave "nova" for a given name alone,
"nquinn-obrien" for Quinn / Quinn-O'Brien and "admin1" for Al / Dmin, and
with no name left the box empty and said nothing. "More User Details"
opened the eight fields and then read "Less User Details". Step 2 opened
with every masthead box ticked and changeable, the reviewer roles'
included. "Generate Password" filled the boxes with "********" and ticked
and locked "Notify User" (unticked: note f-a16). "Change Password" left
ticked sent the first sign-in to "Change Password" / "You must choose a
new password before you can log in to this site."; unticked, the new user
landed on the journal's home page. "Cancel" closed the window, typed text
and all, with no question; the window's "Close" asked "The data on this
form has changed. Do you wish to continue without saving?"; leaving the
page raised the browser's leave question. Test run 2026-09-26 (Fields
"Homepage URL"; scenario 7), all three apps: with example in "Homepage
URL", "OK" showed "Please enter a valid URL." under it and sent no
request, and none of the taken username, taken email and short password
refusals appeared; with the box emptied, the next "OK" sent one
`…/user-grid/update-user` request and brought the three in one notice.
Live-probed 2026-09-28 (Rule 21), all three apps, two runs each: a family
name typed on "Edit User" and the window's "Close" pressed brought the
same question; accepted, the window closed and the row, before and after
a reload, kept the old family name.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Rule 22), all three apps: "Step #2: Add
User Roles to Nova" for a given name only, "…to Quinn Kfullname" for a
full name. "Save" with a role ticked closed the window and the grid listed
the user with the role, on the same page and after a reload, with
"Invitations (0)" on Users & Roles and nothing in the mail catcher but the
welcome email when asked for. Closed at step 2 unsaved, Nova (nova53) was
not listed, even after "Search"; with "Include users with no roles in this
journal." ticked she was, with an empty "Roles" cell. "Add User" with the
same username was refused with "The selected username is already in use by
another user."

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-25 (Fields "Email"), all three apps: the
label reads "Email", with the required mark, under the heading "Contact"
(lib/pkp `user.po`; `common.po` defines the same key as "Email address");
a taken address was refused with "The selected email address is already in
use by another user."

<a id="fn-m"></a>
**m** — "Edit User": `UserGridHandler::editUser()` with a row id →
`UserDetailsForm` (heading `grid.user.userDetails` "User Details",
username as text, password optional with `user.profile.leavePasswordBlank`
+ length hint; `send notify` hidden) plus `user.gossip` "Editorial Notes"
when `Repo::user()->canCurrentUserGossip()` (never on one's own account;
on screen only for an account holding a reviewer role), plus the role and
masthead boxes (a reviewer group's masthead box disabled). For a manager
with `ADMINISTRATION_PARTIAL` the form is reduced to the roles
(`applyUserGroupUpdateOnly()`), a case only the administrator's grid could
show and the administrator is always `FULL`. `updateUser()` saves, adds
`notification.editedUser` "User edited.";
`UserForm::saveUserGroupAssignments()` ends unticked active groups
(`Repo::userGroup()->endAssignments()`) and assigns ticked new ones, no
mailable; a new password on another user's account calls
`invalidateOtherSessions()`. Live-probed 2026-09-25 (Rule 24; Fields), all
three apps: "Edit User" headed "User Details", the username as text, the
current roles ticked. "Editorial Notes" was absent for an author and
present for a reviewer (OJS, OMP), under "Record notes about this reviewer
that you would like to make visible to other administrators, managers and
all editors. Notes will be visible for future review assignments."; the
reviewer roles' masthead boxes (OJS "Reviewer", OMP "Internal Reviewer"
and "External Reviewer") ticked and locked on every account. "OK" showed
"User edited."; a role ticked was granted with today's start date, one
unticked ended with today's end date and "User Removed From Role", with no
email; every role unticked was refused. Both password boxes left empty
kept the old password; a new password ended the user's open session and
replaced the old one. Live-probed 2026-09-28 (Rule 24; Fields "Change
Password"), all three apps, two runs each, four saves per run (unchanged,
"Reader" ticked, "Change Password" ticked, unchanged again): every "OK"
closed the window and showed "User edited." as a toast at the top right
0.9–1.7 s after the click, once the grid's `update-user` POST had
answered 200; a reload removed it. The box (`mustChangePassword`, labelled
"Change Password") opened unticked on an account never flagged; ticked
and saved, it read unticked when reopened, before and after a reload,
while the account's next sign-in went to `{journal}/login/changePassword/{username}`,
headed "Change Password". "OK" pressed on it again with nothing changed
cleared the flag: the next sign-in landed on My Submissions. This is the
defect *Login & sessions* records as its A10 (`UserDetailsForm::initData()`
sets the flag only for a new user, `execute()` writes the posted value).

<a id="fn-b"></a>
**b** — List: `UserAccessManager.vue` (heading `grid.user.currentUsers`
"Current Users" with `userAccessPagination.itemCount`), columns from
`useUserAccessManagerConfig::getColumns()`: `userAccess.tableHeader.name`
"Name", `about.contact.email` "Email", `user.roles` "Roles",
`userAccess.tableHeader.startDate` "Start Date", `user.affiliation`
"Affiliation", `common.moreActions` "More Actions" (screen-reader only).
Data: `GET api/v1/users` (`PKPUserController::getMany()`, API-047) with
`status=all`, `includePermissions`, `searchPhrase`, `count`/`offset`, no
`orderBy` so the default `id` ascending; filtered to the context by
`filterByContextIds()` (any assignment, ended ones included under
`status=all`). Roles per row: `Repo::user()->preloadGroups()` (every
assignment in the context, with `dateEnd`). Live-probed 2026-09-25 (Rules
2, 4; Fields, the list), all three apps: one role per line; an ended role
and a role in another journal not shown; the ORCID icon for a verified and
an unverified iD alike and the red icon on a disabled account, neither
with an accessible name (A12); the Site Administrator's manager role with
an empty "Start Date" (its roles page "---"). A disabled account and
accounts whose roles here had all ended were listed, an account holding
roles only in another journal was not; rows by account age, `admin` first;
the heading counted 35, 27 and 21 on the seeded journal, press and server.
Live-probed 2026-09-30 (Fields "Roles", "Start Date"; A18), all three
apps, two runs each, on a scratch journal as its manager and as `admin`,
on the same page and after a reload; the roles below are the Section
editor role (OMP "Series editor", OPS "Moderator"). A role from today
with no end read the role and today's date; one from 2020-01-01 with no
end (OJS, OMP, Users XML import) read 2020-01-01. Roles 2020-01-01 –
2030-12-31 and 2027-06-01 – 2030-12-31 (OJS, OMP, import) left both
cells empty; beside a Reader role from 2020-01-01 the first read "Reader"
alone with 2020-01-01. A role from 2027-06-01 with no end, by import (OJS,
OMP) or by an accepted invitation's START DATE (all three), read the role
and 2027-06-01, and on a user who also held Reader from today the two
lines read "Reader" / the role and today's date / 2027-06-01. A role
2020-01-01 – 2021-06-30 left both cells empty, and those users were
listed and counted. A user given Author in a second context read only
this journal's role. The list's `GET api/v1/users` carried every
assignment with `dateStart` and `dateEnd`; the cells dropped each one
with a `dateEnd` and none for its `dateStart`. `admin`'s manager line had
an empty "Start Date", and its roles page read "---" under START DATE and
END DATE.

<a id="fn-d"></a>
**d** — `UserAccessManagerStore` `countPerPage` 25; `TablePagination.vue`
prints `common.showingXofX` "Showing <strong>{$start} to
{$finish}</strong> of {$total}" and shows `Pagination` only when
`pageCount > 1`. The appearance-and-theming spec (Rule 29) records the
fixed 25 against "Items per page". Live-probed 2026-09-25 (Rule 5), all
three apps: with 31 accounts and the journal's "Items per page" at 3, 25
rows, "Showing 1 to 25 of 31" and page buttons, page 2 "Showing 26 to 31
of 31"; with 18 accounts "Showing 1 to 18 of 18" and no buttons.

<a id="fn-p"></a>
**p** — Search: `UserAccessManagerActionSearch.vue` → `Search.vue` with
label `userAccess.search`; the phrase is emitted on Enter only
(`@keydown.enter`, pkp/ui-library#937, 2026-07-23) and cleared by the ×
button (`common.clearSearch`); `setSearchPhrase()` resets to page 1
(#929). Matching: `Collector::buildSearchFilter()` splits on whitespace,
every word `LIKE %word%` (lower-cased) against `username`, `email`, the
settings `givenName`, `familyName`, `preferredPublicName`, `affiliation`,
`biography`, `orcid`, the user's interests, or the `name` of any user
group the user has a row in (any context, ended rows included). Seen
2026-09-03 (emails-management probe): typing without Enter left a list
unfiltered. Live-probed 2026-09-25 (Rule 6), all three apps: typing
without Enter sent nothing; Enter filtered; the × ("Clear search phrase")
brought back the whole list; a search typed on page 2 started at page 1.
Each field listed matched, part of a word and any case (the reviewing
interests on OJS and OMP); "Author" also found a user whose Author role
here had ended; two words matching two accounts found neither.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Rule 6c), all three apps: zzqq and Enter
gave "Current Users (0)", the one line "No Items", and "Showing 0 to 0 of
0" under it.

<a id="fn-q"></a>
**q** — `UserAccessManagerCellActions.vue`: `DropdownActions` with
`button-variant="ellipsis"` and
`:label="t('userAccess.management.options')"`; the key exists in no `.po`
file of lib/pkp or the apps, so `t()` returns it wrapped in `##`. Items
and guards: `useUserAccessManagerConfig::getItemActions()` (notes f, g, c,
i, o). Live-probed 2026-09-25 (Rule 7; A5): every level's menus read on
every kind of row, exactly the table's offers, in the order "Edit, Email,
Login As, Remove User, Disable User, Merge user".

<a id="fn-u"></a>
**u** — The list's labels come from lib/pkp's locale files:
`userAccess.search` and `invitation.header` have no `fr_CA` entry in
lib/pkp, and `userAccess.management.options` has none in any language. OPS
`locale/fr_CA/default.po` carries `default.groups.name.manager` and
`default.groups.name.sectionEditor` with empty `msgstr`, so a preprint
server installed with French stores those raw keys as the French role
names (OJS and OMP fill them). Live-probed 2026-09-25 (Rule 25): notes
td13 and td14.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Rule 25; A11), all three apps, the
seeded journal, press and server at the French address (`/fr_CA/` in place
of `/en/`): the search box "##userAccess.search##", the Invitations
heading "##invitation.header## (0)", the button
"##invitation.inviteToRole.btn##", the columns
"##INVITATION.TABLEHEADER.NAME##", "##INVITATION.HEADER##" and
"##USERACCESS.TABLEHEADER.STARTDATE##", the row button
"##userAccess.management.options##"; the paging line "Résultats 1 à 25 de
35" ("… de 27", "Résultats 1 à 21 de 21") with "Page précédente 1 2 Page
suivante". Another editorial page opened afterwards with no language in
its address stayed French; an `/en/` address switched back. Seen before on
2026-09-13 (user-profile revision, OJS and OMP).

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-25 (Rule 25; OPS1): on the French preprint
server the manager's row read "##default.groups.name.manager##" and a
Moderator's "##default.groups.name.sectionEditor##"; the journal printed
"Directeur-trice de la revue" / "Rédacteur-trice de rubrique", the press
"Gestionnaire de la presse" / "Rédacteur/Rédactrice en chef de la série".

<a id="fn-r"></a>
**r** — `UserDetailsForm::execute()` for a new user: when
`generatePassword` or `sendNotify`, `UserCreated` (MAIL-054, template
`USER_REGISTER`, `mailable.userRegister.name` "User Created"; subject
`emails.userRegister.subject` "Journal Registration" / OMP "Press
Registration" / OPS "Server Registration"; body with
`{$recipientUsername}` and `{$password}`), sender the acting user,
reply-to the context's `contactEmail` / `contactName`; a transport failure
shows `email.compose.error` to the sender. Live-probed 2026-09-25 (Side
effects), all three apps: with "Notify User" ticked, and again with
"Generate Password", exactly one message, From "admin admin"
<admin@mail.test>, Reply-To the journal's principal contact, subject
"Journal Registration" ("Press Registration", "Server Registration"), "You
have now been registered as a user with {journal}…" with "Username:" and
"Password:" in plain text; with neither box ticked nothing was sent (a
control email arrived alone). "User Created" is listed on Settings ›
Emails.

<a id="fn-t"></a>
**t** — "Bulk Emails": `PKPSiteBulkEmailsForm` (`enableBulkEmails`, label
`admin.settings.enableBulkEmails.label`) on Administration › Site Settings
(`templates/admin/settings.tpl`, tab `bulkEmails`);
`ManagementHandler::access()` sets `enableBulkEmails` when the context id
is in the site's list. "Minimum password length (characters)":
`PKPSiteSecurityForm` `minPasswordLength`
(`admin.settings.minPasswordLength`), tab `admin.security` "Security"
under "Site Setup"; the default 6 is the figure the invitation spec's
accept wizard shows on the test installs. Live-probed 2026-09-25 (Settings
bullets 1, 2), all three apps: "Bulk Emails" arrived with no journal
ticked; ticking the scratch journal added "Notify" to its tabs and
unticking removed it. "Minimum password length (characters)" read 6; saved
at 8, "Add User" and "Edit User" refused 7 characters with "The password
must be at least 8 characters." and accepted 8. Both settings were
restored.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS, each
on its own scratch journal (press, preprint server) from `POST
scenarios/context` with throwaway `users[]` (names from `givenName` and
`familyName`; usernames carry the scenario's tag; password the username
twice; email `<username>@mail.test`). The context factory enrols `admin`
(password `admin`, "admin admin" on screen) as a manager of every
scratch context, with no start date. Scenarios 1 to 6 sign in as the
first `users[]` entry, `roles: ['manager']` (the Journal Manager, Press
Manager, Preprint Server Manager), whose row therefore follows `admin`'s;
scenarios 7 and 8, and scenario 1's grid bullet, sign in as `admin`.
Scenario 1: after the manager, Quinn Ashdown `author` with
`affiliation: 'Harbour University'` and an `orcid` iD
(`orcidIsVerified: false`), Nova Reyes `reader` with `pastRoles:
[{role: 'author'}]`, then 28 `reader` entries whose names, usernames and
addresses contain none of "harbour", "nova", "quinn" and "author".
Scenarios 2 and 3: Quinn Ashdown `author`; scenario 3 signs her in in a
second browser first. Scenario 4: a first scratch journal with Quinn
Ashdown `author` and Nova Reyes `{roles: [], pastRoles: [{role:
'reader'}]}` (her Reader role there ended today, as "Remove User" leaves
it), then this journal naming both again with `author` (the roles are
added to the existing accounts) and Lena Ortiz `author`. Scenario 5: a first
scratch journal with a `manager` of its own and Quinn Ashdown `author`,
then this journal naming Quinn with `author` and `reader`. Scenario 6:
Quinn Ash `author` and `reader`, Quinn Ashdown `author`; "Tidal
Patterns" from `POST scenarios/submission` with Quinn Ash as
`submitter`, which gives her the Author place on its Participants panel;
Quinn Ash signed in in a second browser. Scenario 7: Lena Ortiz
`author`; Rosa's address is `rosa-<tag>@mail.test`, and "Suggest"
answers `rdelgado` with a number on every run after the first. Scenario
8: Lena Ortiz `author`, and on OJS and OMP Rui Tanaka `externalReviewer`;
a preprint server has no reviewer role. "Bulk Emails" and "Minimum
password length (characters)" stay at the test install's values (no
journal ticked, 6). The mail catcher is Mailpit at `MAILPIT_URL`,
scoped by recipient address. Live-probed 2026-09-25: each scratch
journal's list showed its throwaway accounts and "admin admin" with the
manager role and an empty "Start Date".

<a id="fn-f-a1"></a>
**f-a1** — Code read 2026-09-25: the Vue menu offers
`USER_ACCESS_DISABLE_USER` on every row but the acting user's
(`useUserAccessManagerConfig::getItemActions()`), unlike
`USER_ACCESS_LOGIN_AS` and `USER_ACCESS_MERGE_USER`, which wait on
`canLoginAs` / `canMergeUsers`; `UserGridHandler::editDisableUser()`
refuses unless `getAdministrationLevel()` is `FULL` (note n). Live-probed
2026-09-25: note td8.

<a id="fn-f-a2"></a>
**f-a2** — Code read 2026-09-25: note td9. The remove guard is only
`user.groups.find(g => g.dateEnd === null)` and not-own-row. Live-probed
2026-09-25: note td9.

<a id="fn-f-a3"></a>
**f-a3** — Seen 2026-09-23 (journal-identity claim check K4-3); a reviewer
who unticked their own role on the profile likewise stayed with an empty
roles column (user-profile spec, 2026-09-04). Mechanism: note c.
Live-probed 2026-09-25, all three apps: notes c and i; after "Remove" on
the Settings wizard's grid the row stayed with an empty "Roles" cell,
after a reload too.

<a id="fn-f-a4"></a>
**f-a4** — `userAccess.search` exists only in lib/pkp's `userAccess.po`
("Enter a user's name, role (e.g Journal editor), or affiliation"); no app
overrides it. OMP's editor group is `default.groups.name.editor` "Press
editor"; OPS installs no editor group. Live-probed 2026-09-25: the same
text on all three apps; the press's roles include "Press editor", the
preprint server's no editor.

<a id="fn-f-a5"></a>
**f-a5** — Live-probed 2026-09-25, all three apps, English interface:
every row's "…" button is named `##userAccess.management.options##` (25 of
25 on the seeded journal's first page), and the menu reads normally. Seen
first on 2026-09-05 on OPS (review-stage claim check). Mechanism: note q.

<a id="fn-f-a6"></a>
**f-a6** — Live-probed 2026-09-25, all three apps: a throwaway Author
whose Reader role here had ended; the list's "Roles" read "Author", the
Disable window "Current Roles : Reader, Author"; a user with no ended role
read "Current Roles : Author, Section editor". Code: `disableUser()` joins
`user.groups.map(g => g.name)`, every assignment in the context
(`preloadGroups()`), without the `dateEnd` filter the "Roles" cell uses;
`user.disabledModal.description` is "Current Roles : {$roles}".

<a id="fn-f-a7"></a>
**f-a7** — Code: note h. Live-probed 2026-09-25: note td6.

<a id="fn-f-a8"></a>
**f-a8** — Code read 2026-09-25: `UserGridHandler::removeUser()` writes
`date_end` directly and sends no mailable, while the roles page's "Remove
Role" (`PUT users/{id}/endRole/{group}`, `PKPUserController::endRole()`)
sends `UserRoleEndNotify` (MAIL-056, the invitation spec's side effects).
The audit-log entry `USER_CONTEXT_REMOVED` appears on none of the app's
pages. Live-probed 2026-09-25, all three apps: after "Remove User" the
mail catcher held nothing for the user but a control email sent
afterwards; "Remove Role" on the roles page sent "You have been removed
from a role" (note e).


<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-25: note td10. Mechanism: note j. A
section's assigned editors are also what the automatic editor
assignment of a new submission to that section uses (code), so after
such a merge new submissions there would reach neither account; not
seen, since only the seeded journal assigns editors automatically and
its accounts are never merged in testing.

<a id="fn-f-a10"></a>
**f-a10** — Code: note k. Live-probed 2026-09-25: note td11. The Vue list
guards every action but "Edit" and "Email" with not-own-row.

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-25: note td13. Mechanism: note u.

<a id="fn-f-a12"></a>
**f-a12** — Live-probed 2026-09-25, all three apps: in the list's
accessibility tree a disabled account's and an ORCID holder's "Name" cell
read the name, then an image with no name. The icons
(`UserAccessManagerCellName.vue`, note g) carry no `aria-label` and no
`aria-hidden`.

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-25, all three apps: the "Merge user"
window and the Settings wizard's grid read the administrator's row "admin
| admin | admin | | admin@mail.test", while Users & Roles showed "Journal
manager" ("Press manager", "Preprint Server manager") with no start date.
The grids' "Roles" column lists active and future roles (note i), and the
manager enrolment a new journal gives the Site Administrator has no start
date, which fits the empty cell.

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-25, OMP and OPS: after "Confirm" on a
masthead change, `POST …/api/v1/users/{id}/masthead/{userGroupId}`
answered 500 and the dialog quoted showed; after a reload the choice read
"Does not appear on the masthead"; the mail catcher held nothing. OJS sent
"Your journal masthead visibility has been updated". Presses and preprint
servers ship without the `USER_ROLE_MASTHEAD_UPDATE` template (*User
invitations*, note f-omp1).

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-25, all three apps, three times each:
merging an author who had opened a discussion on their submission, `POST
{context}/$$$call$$$/grid/settings/user/user-grid/merge-users` answered
500, the server log naming the foreign key `edit_tasks_created_by_foreign`
as the user row was deleted. The chosen account then held the roles and
the Participants place; the merged account was gone from the list, listed
in the "Merge user" window only with "Include users with no roles…"
ticked, signed in with its old password (landing on the journal's home
page), and the discussion read "Created by: {old username}". An account
that was only a participant in someone else's discussion merged cleanly:
200, deleted, its sign-in refused.
Issue report: [docs/issues/U53-A15-merge-account-opened-discussion-fails.md](../issues/U53-A15-merge-account-opened-discussion-fails.md).

<a id="fn-f-a16"></a>
**f-a16** — Live-probed 2026-09-25, all three apps: after "Generate
Password" was ticked and then unticked, the password boxes were empty and
open, "Notify User" disabled and unticked. Code:
`UserDetailsFormHandler::setGenerateRandom()` unticks with
`.attr('disabled', '')`, which leaves the `disabled` attribute in place.

<a id="fn-f-a17"></a>
**f-a17** — Test run 2026-09-26 (Rule 24; scenario 8), OJS and OPS: after
"Edit User" moved a throwaway Author to Reader, "User edited." showed and
the grid refreshed; the row's "Roles" cell read "Author, Reader" (or
"Reader, Author") on every read over the next 10 seconds, and "Reader"
after a reload of the tab. The save sent only the Reader role and
answered success. On OPS a reload made right after "User edited." still
read both roles for 10 seconds; the suites reload until the row reads
"Reader". OMP's suite reads the row only after a reload, where it read
"Reader"; the grid is lib/pkp's in all three apps. Code: the grid's
"Roles" column (`UserGridHandler`, column `roles`) lists assignments
through `UserUserGroup::scopeWithActiveAndActiveInFuture`, which keeps a
role whose `date_end >= now` at one-second precision, while
`Repo::userGroup()->endAssignments()` stamps `date_end` with the save's
own second, so the refresh after "OK", or a reload within that second,
still lists the ended role; the Users & Roles list's `withActive`
compares with `>` and does not.

<a id="fn-f-a18"></a>
**f-a18** — Live-probed 2026-09-30, all three apps: the list as note b
records. "Editorial Masthead" listed the user whose role ran 2020 – 2030
under it, as "2020 –", and did not list the users whose role starts
2027-06-01; "Editorial History" listed only the 2020 – 2021 role, as
"2020 – 2021". Mechanism: note c (the cells keep the groups with no
`dateEnd`). OPS has no route to a future end date: it installs no Users
XML plugin, and the invitation takes a start date only. The invitation's
START DATE box (`type="date"`, no min or max) accepted 2027-06-01; its
email read "Starting from 2027-06-01", and the accept wizard's review
listed the role with START DATE 2027-06-01 and END DATE "---".

<a id="fn-f-a19"></a>
**f-a19** — Live-probed 2026-09-30, all three apps, two runs each, as a
scratch journal's manager, on a user whose only role started 2027-06-01
(by an accepted invitation; on OJS and OMP also by a Users XML import):
the "Remove" dialog as in Rule 14 (OMP "Remove this user from this press?
… within this press.", OPS "…server? … within this server."); "OK" posted
to `UserGridHandler::removeUser()`, which answered 200
`{"status":false,"content":"This user does not have any roles."}`, and
the page showed `common.unknownError` as in note td9. No response of 500
or more and no page error. On the same page, after the Error's "OK" and
after a reload, the row read the role and 2027-06-01 and the menu offered
"Remove User"; the roles page listed the role with 2027-06-01, End Date
"---" and "Remove Role"; the role's database row was unchanged. Code: the
menu's guard `user.groups.find(g => g.dateEnd === null)` (note c) counts
a role not yet begun, while `removeUser()` ends only roles active now and
answers `grid.user.userNoRoles` when there are none.

<a id="fn-f-a20"></a>
**f-a20** — Live-probed 2026-09-30, OJS and OMP, two runs each, users
given by a Users XML import a role 2020-01-01 – 2030-12-31 or 2027-06-01 –
2030-12-31: the row menu read "Edit", "Email", "Login As", "Disable
User", "Merge user", with no "Remove User" (a role from today and one
from 2027-06-01, neither with an end, offered it). The roles page read
"Section editor | 2020-01-01 | 2030-12-31 | … | User Removed From Role"
(OMP "Series editor"); a user holding Reader from 2020-01-01 beside the
2020 – 2030 role had "Remove Role" on Reader and "User Removed From Role"
on the other. "Disable User" named the role under "Current Roles : " (a
window that lists every role, A6). The Settings wizard's "Users" grid was
not tried. Code: the menu's guard (note c); the roles page labels any
role with an end date as removed.

<a id="fn-f-ops1"></a>
**f-ops1** — Seen 2026-09-04 (user-profile claim check K2), OPS French
interface; the same raw moderator key shows on the preprint server's
French "Editorial Masthead" (2026-09-24). Mechanism: note u; driven by
td14. Live-probed 2026-09-25: note td14.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Users & Roles page container (tabs) | Settings › Users & Roles (`{journal}/management/settings/access`) | VUE-013 |
| "Current Users" list | Settings › Users & Roles › "Users" | VUE-051 |
| Search users | the list's search box | AFFM-102 |
| Row "Edit" (to the invitation wizard) | row menu › "Edit" (`management/settings/user/{id}`) | AFFM-103 |
| Row "Email" | row menu › "Email" (legacy modal, `UserGridHandler` `edit-email`) | AFFM-104 |
| Row "Login As" | row menu › "Login As" (owned by the login-and-sessions spec) | AFFM-105 |
| Row "Remove User" | row menu › "Remove User" (`remove-user`) | AFFM-106 |
| Row "Disable User" / "Enable User" | row menu (`edit-disable-user`) | AFFM-107 |
| Row "Merge user" | row menu (`merge-users`) | AFFM-108 |
| Settings wizard "Users" grid, "Add User" | Administration › Hosted Journals › row › "Settings wizard" › "Users" | AFFM-203 |
| Settings wizard grid search and paging | same | AFFM-204 |
| Settings wizard row "Email" | same, row arrow | AFFM-205 |
| Settings wizard row "Edit User" | same, row arrow | AFFM-206 |
| Settings wizard row "Disable User" / "Enable" | same, row arrow | AFFM-207 |
| Settings wizard row "Remove" | same, row arrow | AFFM-208 |
| Settings wizard row "Merge User" (and the Vue list's merge window) | same, row arrow | AFFM-210 |
| Username suggestion ("Suggest") | "Add User" step 1 (`api.user.UserApiHandler` `suggestUsername`) | GRID-003 |
| Users grid handler (legacy ops) | `$$$call$$$/grid/settings/user/user-grid/*` | GRID-050 |
| Users API (list; reviewers and report sub-ops cited by the reviewer-assignment and statistics features; `endRole` / `masthead` used by the invitation wizard) | `{journal}/api/v1/users` | API-047 |
| Welcome email ("User Created") | "Add User" with "Notify User" or "Generate Password" | MAIL-054 |
| Role-ended email (sent from the invitation wizard's "Remove Role") | cited: the invitation spec's side effects | MAIL-056 |
| Masthead-change email {OJS} (sent from the invitation wizard) | cited: the invitation spec's side effects | MAIL-057 |

Unlinked candidates recorded in `docs/tracking/UNASSIGNED.md` (item 34):
`ContextGridHandler::users()` (the Vue list as a Hosted Journals grid
fragment, called by nothing) and the direct `management/access` page
operation (same page, no link).

## Reference — code anchors

- **Page and gate**: `lib/pkp/pages/management/ManagementHandler.php`
  (`settings()`, `access()`, `editUser()`, `authorize()`); each app's
  `pages/management/SettingsHandler.php` (role assignments);
  `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`;
  `lib/pkp/templates/management/access.tpl`, `accessUsers.tpl`;
  `lib/pkp/classes/template/PKPTemplateManager.php` (side menu).
- **Vue list**: `lib/ui-library/src/components/Container/AccessPage.vue`;
  `lib/ui-library/src/managers/UserAccessManager/` (`UserAccessManager.vue`,
  `UserAccessManagerStore.js`, `useUserAccessManagerConfig.js`,
  `useUserAccessManagerActions.js`, `UserAccessManagerCell*.vue`,
  `UserAccessManagerActionSearch.vue`); `components/Search/Search.vue`;
  `components/Table/TablePagination.vue`; `composables/useLegacyGridUrl.js`;
  `stores/modalStore.js` (`openDialogNetworkError`).
- **API and data**: `lib/pkp/api/v1/users/PKPUserController.php`;
  `lib/pkp/classes/user/Collector.php` (`buildUserGroupFilter`,
  `buildSearchFilter`); `lib/pkp/classes/user/Repository.php`
  (`permissionMapForManager`, `preloadGroups`, `mergeUsers`,
  `canCurrentUserGossip`); `lib/pkp/classes/user/maps/Schema.php`;
  `lib/pkp/classes/security/Validation.php` (`getAdministrationLevel`,
  `suggestUsername`).
- **Legacy grid and forms**:
  `lib/pkp/controllers/grid/settings/user/UserGridHandler.php`,
  `UserGridRow.php`, `form/UserDetailsForm.php`, `form/UserForm.php`,
  `form/UserRoleForm.php`, `form/UserDisableForm.php`,
  `form/UserEmailForm.php`; templates
  `lib/pkp/templates/controllers/grid/settings/user/form/*.tpl`,
  `userGridFilter.tpl`, `lib/pkp/templates/common/userDetails.tpl`;
  `lib/pkp/js/controllers/grid/users/UserGridHandler.js`,
  `js/controllers/grid/settings/user/form/UserDetailsFormHandler.js`,
  `js/controllers/form/UserFormHandler.js`;
  `lib/pkp/controllers/api/user/UserApiHandler.php`.
- **Administration surface**: `lib/pkp/pages/admin/AdminHandler.php`
  (`wizard()`), `lib/pkp/templates/admin/contextSettings.tpl`,
  `lib/pkp/controllers/grid/admin/context/ContextGridRow.php`,
  `ContextGridHandler.php` (`users()`).
- **Mail**: `lib/pkp/classes/mail/mailables/UserCreated.php`,
  `UserRoleEndNotify.php`, `UserRoleMastheadUpdateNotify.php`; each app's
  `registry/emailTemplates.xml` and `locale/en/emails.po`
  (`emails.userRegister.*`).
- **Locale**: lib/pkp `locale/en/userAccess.po`, `grid.po`, `user.po`,
  `common.po`; each app's `locale/en/manager.po`
  (`manager.people.confirmRemove`) and `locale/en/locale.po`
  (`user.noRoles.selectUsersWithoutRoles`); OPS `locale/fr_CA/default.po`.
