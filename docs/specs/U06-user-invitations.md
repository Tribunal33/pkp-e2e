---
name: user-invitations
status: verified
---

# User invitations

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Journal teams grow by invitation. A manager picks a person, either someone
already registered or a complete outsider, names the roles they should hold
(with a start date, an optional end date, and whether they appear on the
journal's public masthead), and sends them an email invitation. The recipient
follows the emailed link to accept or decline. A new person creates an
account on the spot; an existing user has the roles linked to their account.
Until the recipient answers, the manager can watch, edit, or cancel the
pending invitation from the same screen where users are managed. Invitations
expire on their own after a few days, so a stale link never grants a role.

## Actors & permissions

"The recipient" below means whoever holds the emailed invitation link. Every
sending capability lives on the **Users & Roles** screen (Users tab). Who can
reach that screen at all belongs to the user-management feature (see
*Cross-feature interactions*).

| Action | Who may, and when |
|--------|--------------------|
| **See pending invitations** | • Site Administrator; Journal Manager: the "Invitations" table on Users & Roles <sup>a</sup> |
| **Invite to a role** (open the send wizard) | • Site Administrator; Journal Manager: the "Invite to a role" button <sup>a</sup><br>• ⚠ [A1](#a1) No other role is offered the button. An Author or Reviewer who types the wizard's own address (the URL a manager reaches via "Invite to a role") is turned away. Who else the address lets through is an open question <sup>b</sup> |
| **Edit a pending invitation** | • Site Administrator; Journal Manager: "Edit Invitation" on the invitation's row (Rule 12) <sup>a</sup> |
| **Cancel a pending invitation** | • Site Administrator; Journal Manager: "Cancel Invite" on the invitation's row <sup>a</sup> |
| **Propose roles for an existing member** | • Site Administrator; Journal Manager: the user row's Edit action opens the same wizard (Rule 13), and so does "Invite to a role" once "Search User" finds them (Rule 13a) <sup>c</sup> |
| **Accept or decline** | • The recipient: via the emailed links, while the invitation is pending. This works signed out, and no credentials are asked (Rules 6–7) <sup>f</sup> |
| **Customize the invitation email for one send** | • Whoever is sending: the wizard's compose step (subject, body, template choice) <sup>g</sup> |
| **Edit the stored invitation email template** | • Journal Manager: on the Emails settings screen, which belongs to the emails-management feature. ⚠ [OPS1](#ops1) On a preprint server the template has no row there <sup>j</sup> |

## Fields & validation

On a press the "Journal Masthead" column reads "Press Masthead", and on a
preprint server "Server Masthead". Button labels containing "OJS" carry the
app's own acronym: a press shows "Create OMP account" and "Accept And
Continue to OMP", a preprint server "Accept And Continue to OPS". The search
step's miss, "The user does not have a role in this journal", reads "The
user does not have a role in this press" on a press and "The user does not
have a role in this server" on a preprint server. <sup>h</sup>

Send wizard. The fields below are for a **new** invitee. For an existing
user the personal fields show read-only.

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Search for a user by email address, username, or ORCID iD" | yes (to pass step 1) | Exact match on email, then username, then ORCID iD. A miss, even text that is no valid email address, advances to "Enter details" with "The user does not have a role in this journal". An email address with no account arrives typed into the Email field; other text is discarded (the Email field arrives empty) and the address is validated there instead <sup>h</sup> |
| Email / Given Name / Family Name / Affiliation | email only | Names are optional; helper text notes the invitee can change them. On a journal with a second form language (Settings), a button named for it ("French") above the fields adds "Given Name in French" and "Family Name in French" boxes, and each name field counts its filled languages ("0/2 languages completed"). Only the name in the journal's primary language reaches the email (Side effects ⚠ [A10](#a10)). <sup>i</sup> If the address gains an account before the invitation is accepted, what the recipient then sees was not verified live <sup>o</sup> |
| Role (per row, "Select a new role") | at least one row | Roles the person already holds, or already chosen in another row, are not offered. From the second row on, a row's fields lose their screen-reader names ⚠ [A8](#a8) <sup>i</sup> |
| Start Date (per role row) | yes | A date in the past takes effect as "today" at acceptance (Rule 8) ⚠ [A8](#a8) |
| End Date (per role row) | no | Cannot be entered when inviting. An added role row's END DATE cell shows "---" and holds no input. The column only displays dates on an existing member's current roles (Rule 13) <sup>i</sup> |
| Journal Masthead (per role row) | yes | The select starts blank ("Appear on the masthead" / "Does not appear on the masthead"). Leaving it empty blocks the step with "This field is required." Choosing Reviewer replaces the select with the fixed text "Appear on the masthead", so there is no choice to make ⚠ [A8](#a8) <sup>i</sup> |
| Email subject & body (compose step) | prefilled | Freely editable for this send. A different stored template can be selected <sup>g</sup> |

Accept wizard (new invitee):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Username | yes | Must not be taken <sup>o</sup> |
| Password | yes | At least six characters, the minimum the field states on screen <sup>o</sup> |
| Privacy consent ("Yes, I agree to have my data collected…") | yes | Unchecked blocks the step with "Please confirm that you have read and agree privacy statement". The label links to the journal's Privacy Statement <sup>o</sup> |
| Given Name / Family Name / Country / Affiliation | given name, country | Collected on the "Enter details" step, which arrives holding the given and family name the manager entered. A name the manager entered only in another of the journal's form languages sits in that language's boxes, behind the button named for it ("French"), and Given Name arrives empty. Editable again from the review step via its Edit button <sup>k</sup> |

## Rules & state

<a id="invitation-states"></a>
1. An invitation is either **being composed** (started in the wizard, not yet
   sent), **pending** (sent, awaiting the recipient's answer), or settled as
   **accepted**, **declined**, or **cancelled**. There is no separate "expired"
   state. A pending invitation past its deadline simply stops working (Rule 4)
   and is later purged (see *Side effects*). <sup>d</sup>
2. Sending sets the acceptance deadline. The recipient has a fixed number of
   days to answer: 3, unless the site is configured otherwise (see
   *Settings*). <sup>e</sup>
3. One live invitation per person per journal. Sending a new role invitation
   to the same person (or email address) silently replaces any earlier pending
   one. The second send's wizard gives no hint that a pending invitation
   exists. Afterwards the Invitations table holds only the newer row, and the
   older email's links stop working ⚠ [A3](#a3). <sup>d</sup>
4. <a id="invitation-landing"></a> **The invitation-link landing.** Every
   invitation email carries personal accept and decline links. A link whose
   invitation is still pending opens its flow (for role invitations, Rules
   5–7; other invitation kinds land in their own features' flows, see
   *Cross-feature interactions*). A correct link whose invitation was already
   answered (accepted or declined), cancelled, or expired shows the
   "Invitation Unavailable" page. It reads "This invitation is no longer
   available. It may have already been accepted, declined, or expired…" and
   offers "Login" and "Register" buttons. A tampered or truncated link shows a
   not-found error. ⚠ [A3](#a3) The links of a replaced invitation, whether
   edited or superseded by a new send to the same person, also show the bare
   not-found error. <sup>f</sup>
5. The accept wizard shapes itself to the recipient. A **new** invitee walks
   up to four steps: "Verify ORCID iD" → "Create OJS account" → "Enter
   details" → "Review & create account". An **existing** user gets at most
   "Verify ORCID iD" plus the review step. The ORCID step appears only when
   ORCID is enabled for the journal and the recipient has no verified ORCID
   iD. The review step is always there. Opening the link alone never accepts
   the roles; the recipient always presses the accept button. <sup>k</sup>
6. The recipient needs no sign-in: the emailed link is the only credential
   the accept wizard asks for. An existing user gets no password prompt and
   no account fields. The same link opened by the invitee while already
   signed in as themselves opens the same review step. The link never signs
   anyone in (Rule 9). If somebody else is already signed in on that
   browser, the page refuses with "Invitation not accepted. You're logged in
   as a different user." and a "Logout" action that genuinely ends that
   session. <sup>l</sup>
7. On the ORCID step the recipient either verifies their iD through the ORCID
   sign-in window ("Verify ORCID iD") or passes with "Skip ORCID
   verification". This step has no other Continue button. <sup>k</sup>
8. Accepting grants every listed role from its start date, with the chosen
   masthead visibility, and marks the invitation accepted. A past start date
   takes effect as the acceptance day. The final button reads "Accept And
   Continue to OJS". A closing dialog announces the new role, and its "View
   All Submissions" button leads out of the wizard (Rule 9). <sup>m</sup>
9. A new invitee's account exists only from the moment they accept. They
   choose a username and password mid-wizard. ⚠ [A4](#a4) Accepting signs
   nobody in. A recipient who opened the link signed out, new invitee or
   existing user alike, leaves the closing dialog for the sign-in screen and
   must sign in themselves. An existing user who opened the link while
   already signed in as themselves leaves it for the Dashboard, still
   signed in. <sup>m</sup>
10. Declining is deliberate. The emailed decline link opens a "Decline
    Invitation" confirmation page, and only pressing "Confirm Decline
    Invitation" declines. No roles are granted, and the browser moves to the
    sign-in page. Afterwards both emailed links show the "Invitation
    Unavailable" page (Rule 4). <sup>n</sup>
11. The "Invitations" table lists only invitations still awaiting an answer.
    Each row reads "Invited {date}". Answered, cancelled, replaced, and
    expired invitations leave the list. <sup>p</sup>
12. **Editing means replacing.** "Edit Invitation" warns "If you edit the
    existing invitation or add a new role, the current invitation will be
    canceled and, a new one will be sent." The wizard reopens prefilled.
    Sending composes a fresh invitation whose email supersedes the old one,
    and the old links stop working ⚠ [A3](#a3). <sup>q</sup>
13. The user row's Edit action opens the same wizard for an existing member,
    with no search step. Inside its roles table, **removing** a current role
    or changing its masthead visibility takes effect at once, each behind its
    own confirmation, and the member is emailed either way (see *Side
    effects*) ⚠ [OMP1](#omp1). A removed role's row stays in the roles
    table, also after a reload, with End Date set to today and "User Removed
    From Role" where its Remove Role button was. That row keeps an active
    masthead select: changing it works as on a current role (the same
    confirmation, the change at once, the email) and decides whether the
    member is listed under that role on the journal's "Editorial History"
    page ([Journal identity & about pages](U07-journal-identity-and-about-pages.md)
    Rule 16). **Adding** a role is only a proposal. It takes effect when the
    member accepts the resulting invitation. A member's last active role cannot be removed. Pressing its
    Remove Role opens no confirmation: a "Remove Role" dialog answers "You
    cannot remove the role. At least one role must be assigned to the user."
    with a single "Close" button, and the role keeps its Remove Role button
    and masthead select. In this wizard "Save And Continue" on the details
    step stays inactive while no new role row exists. An empty row is enough
    to activate it; pressing it rejects the missing role fields with inline
    errors. <sup>c</sup> <sup>i</sup>
13a. **The search path to an existing member.** "Invite to a role", with
    the member found on "Search User", lists their current roles on "Enter
    details" above the new-role row, each with a masthead select and
    "Remove Role". Changing a held role's select opens "Confirm masthead
    visibility change", as through the users list's Edit action. "Confirm"
    applies the change at once, with the email of Rule 13 ⚠ [OMP1](#omp1),
    and the change stays even if the invitation is never sent: Edit on the
    member's row in the users list then shows the new choice. A sent invitation's email lists
    that role under "Already assigned roles" with the new choice. "Cancel"
    on the confirmation puts the select back and changes nothing. <sup>c</sup>
14. A disabled user cannot be invited. Reaching one through the search step
    shows "The user is currently disabled." with instructions to enable them
    first, and no role row can be added. Reaching the same person through the
    users list's Edit action shows the same warning above their details and
    current roles. On both paths "Add Another Role" and "Save And Continue"
    are shown but inactive. Both paths list the person's current roles, and
    each keeps an active masthead select and an active "Remove Role", by
    design: a manager can still end a disabled user's roles. Pressed through
    the Edit action, both act at once as in Rule 13, with the email to the
    disabled user, whose wording does not allow for a disabled account
    ⚠ [A9](#a9); on the search path they were seen active and were not
    pressed. <sup>i</sup>
15. Wizard navigation (send side). "Back" returns one step, and returning to
    the search step clears everything entered. "Cancel" asks for confirmation
    only when something was changed: a "Cancel Invitation" dialog asks "Are
    you sure want to cancel this invitation?" ⚠ [A7](#a7), and its "Cancel
    Invite" returns to Users & Roles. Leaving the wizard any other way
    (following a link, typing another address) asks nothing, and the
    Invitations table gains no row. The final button reads "Invite user to
    the role", and a success dialog ("Invitation Sent") confirms. ⚠ [A5](#a5)
    That dialog promises updates about the recipient's decision. Its only
    button, "View All Users", returns the browser to Users & Roles. <sup>g</sup>
16. Cancelling a pending invitation (from its row, behind a confirmation
    listing the invitee's details) deactivates the emailed links immediately.
    The recipient then sees the "Invitation Unavailable" page (Rule 4). <sup>q</sup>
17. Wizard navigation (accept side). The "Create OJS account", "Enter
    details" and every recipient's "Review & create account" steps also
    offer "Cancel". It asks "Cancel Role Invitation Process?" ("Are you
    sure you want to cancel? Canceling now will stop the role acceptance process, and you'll
    need to restart from the invitation email to accept the role again. …")
    with "Cancel Invitation Process" and "Go Back". "Go Back" returns to the
    step. "Cancel Invitation Process" declines nothing:
    - a signed-out newcomer lands on the sign-in screen;
    - an existing user signed in as themselves stays signed in and lands on
      their usual landing page (for an Author, My Submissions), as the
      dialog promises ("If you're already a user, you'll be taken back to
      the dashboard.");
    - an existing user who opened the link signed out lands on the sign-in
      screen instead, and signing in there opens the same landing page;
    - the manager's Invitations row still reads "Invited {date}", and an
      existing user's roles are unchanged;
    - with ORCID off, the emailed link reopens "Create OJS account" (an
      existing user's review step), and accepting there still works.

    Leaving "Create OJS account" by typing another address asks nothing and
    keeps nothing: the Username typed there is empty when the link reopens.
    <sup>u</sup>

## Side effects

- **On send**: one invitation email to the recipient, from the inviter. It
  lists the roles offered under "Newly assigned roles" and the roles they
  already hold under "Already assigned roles", then the accept and decline
  links. Each role listed, held or offered, carries its start date
  ("Starting from {date}") and a sentence that follows its masthead choice:
  "Your name will appear in the {journal}'s masthead as a {role}." or "Your
  name will not appear in {journal}'s masthead as a {role}." ⚠ [A11](#a11)
  The email makes that promise also for roles the masthead does not list.
  Subject and body are whatever the compose step showed at send time.
  ⚠ [A7](#a7) The email's
  fixed copy carries small wording slips. It greets a new invitee by the
  name entered on "Enter details" in the journal's primary language ("Dear
  Nova Quill,", or the one name entered: "Dear Nova,"), and by their email
  address ("Dear {email},") when no name was entered; an existing user is
  greeted by the name on their account. ⚠ [A10](#a10) Two named newcomers
  still get "Dear {email},": one whose name was entered only in another of
  the journal's form languages, and, on a journal whose primary language is
  not the site's, one invited by a manager whose screens are in the site's
  primary language, even with the name entered in both. <sup>j</sup>
- **On acceptance**: the account is created (new invitee) or the roles are
  added to the existing account. Masthead listings update per the chosen
  visibility.
- **On role removal or masthead change** (the user-row wizard, Rule 13; a
  masthead change on the search path too, Rule 13a): the
  member is emailed at once ("You have been removed from a role" / "Your
  journal masthead visibility has been updated"). Only the masthead
  confirmation says so up front ("The user will be notified of this
  change."); the removal confirmation warns of the lost access and
  permissions and says nothing of an email. A masthead change on a removed
  role's row is emailed the same way, the role named with its start and end
  dates. ⚠ [OMP1](#omp1) On a press or preprint server the masthead change
  fails with a raw error shown to the manager and no email, though the
  visibility change itself sticks. A disabled member is emailed the same
  way, in words written for an active account ⚠ [A9](#a9). <sup>r</sup>
- **No notice to the inviter**: nobody is emailed or notified when the
  recipient accepts or declines ⚠ [A5](#a5). The pending row simply
  disappears. From the manager's screens, an acceptance and a decline can be
  told apart only by the new name an acceptance adds under Current
  Users. <sup>m</sup>
- **Daily cleanup**: a scheduled task permanently removes expired invitations
  once a day. ⚠ [A2](#a2) It also removes invitations still being composed,
  which never got a deadline. <sup>e</sup> <sup>t</sup>

## Settings that modify behavior

- **Invitation lifetime**: how many days the recipient has to answer (default
  3) is set in the installation's configuration file. There is no screen for
  it, so changing it is the system administrator's job. The value in force at
  the moment of sending applies. <sup>e</sup>
- **ORCID**: the "Verify ORCID iD" step exists only when ORCID is enabled for
  the journal (Rule 5). <sup>k</sup>
- **Site minimum password length**: the accept wizard's password field
  enforces it and states it (six characters on a default install). <sup>o</sup>
- **Privacy Statement**: the consent checkbox links to the journal's Privacy
  Statement page. <sup>o</sup>
- **Invitation email template**: the stored template used to prefill the
  compose step is editable on the Emails settings screen. ⚠ [OPS1](#ops1) On
  a preprint server it has no row there, though sending still works. <sup>j</sup>
- **"Forms"** languages (Settings › Website › "Setup" › "Languages"; default
  the journal's primary language alone): each further language ticked adds
  a button named for it above the name fields on "Enter details" in both
  wizards, which opens the name boxes in that language (Fields). The email
  greets by the name in the primary language only (Side effects). <sup>i</sup>

## Cross-feature interactions

- **Users & Roles screen**: the Invitations table and the "Invite to a role"
  button live on the Users tab, above the users list. Who reaches that
  screen, and everything else about managing existing users, belongs to the
  user-management feature (spec to come, *User management*).
- **Invitation-link landing**: Rule 4 is the shared front door for every
  emailed invitation link. The reviewer one-click review link (see the future
  *Review assignments* spec) and the registration email-validation and
  profile-email-change confirmations all land through it. Each flow's own
  behavior belongs to its feature. <sup>f</sup>
- **Emails management**: the stored invitation email template is edited on
  the Emails settings screen (future *Emails management* spec). This spec
  owns only the invitation-specific defect ⚠ [OPS1](#ops1).
- **Roles settings**: which roles exist to be offered, their levels, and the
  masthead concept belong to the roles-configuration feature. This wizard
  only uses them.
- **Masthead pages**: the public "Editorial Masthead" and "Editorial
  History" pages, which list members by the masthead choices made here,
  belong to [Journal identity & about pages](U07-journal-identity-and-about-pages.md).
- **Languages**: which languages a journal's forms offer, and the language
  a manager's screens are in, are set as
  [Languages & locales](U57-languages-and-locales.md#form-languages)
  describes. This spec owns only the name boxes of its two wizards and the
  email's greeting.

## Canonical scenarios

Every scenario but 9 runs on a scratch journal of its own, with a throwaway
Journal Manager, throwaway invitee addresses and the emails read in the
mail catcher; scenarios 3, 7, 8 and 10 start with an extra throwaway user
(scenario 7 with two), scenario 10's journal has ORCID enabled and its
extra user holds a verified ORCID iD, and scenario 9 browses the seeded
preprint server as its ready Preprint Server Manager. The accounts, the
addresses and the tooling recipe are in the footnote. <sup>s</sup>

1. **Invite a newcomer to a role**

   Given: a Journal Manager, signed in, on a scratch journal. <sup>s</sup>

   - **Users & Roles**: press "Invite to a role".
   - **"Search User"**: enter an email address no account uses (the footnote
     names it) and continue: the wizard answers "The user does not have a
     role in this journal" and moves to "Enter details", the address
     already in its Email field.
   - **"Enter details"**: fill in Given Name Nova and add a role row: pick
     the offered role (the footnote names it per app), set Start Date to
     today, and choose "Appear on the masthead" in the masthead select,
     which starts blank. (If you choose Reviewer instead, that text shows
     fixed, with nothing to select.) Continue to the compose step.
   - **The compose step**: replace the subject with a marker of this run
     (the footnote names it) and press "Invite user to the role": an
     "Invitation Sent" dialog appears.
   - **"View All Users"**: press it: the browser returns to Users & Roles,
     where the Invitations table shows the row as "Invited {date}".
   - **The recipient's mailbox**: holds the invitation email, sent from the
     Journal Manager, listing the offered role with its start date and
     masthead visibility and the accept and decline links (Side effects).
   - **The email's subject and body**: the subject is the marker typed on
     the compose step and the body the text that step showed at send time
     (Side effects).
   - **The email's greeting**: it opens "Dear Nova,", the Given Name entered
     on "Enter details" (Side effects).
   - **A second send to the same address**: press "Invite to a role" again,
     search the same address and walk the wizard the same way to "Invite
     user to the role": the wizard gives no hint that a pending invitation
     exists, and afterwards the Invitations table holds only the newer row
     (Rule 3).
   - **Control**: under Current Users the address has no row: a new
     invitee's account exists only from the moment they accept (Rule 9).

2. **Newcomer accepts and gets an account**

   Given: a signed-out visitor holding the accept link of a pending
   invitation to a throwaway address, sent as in scenario 1 on a scratch
   journal with ORCID off. <sup>s</sup>

   - **The accept link**: open it: the wizard opens on "Create OJS account"
     with no "Verify ORCID iD" step, ORCID being off on this journal
     (Rule 5).
   - **The password's minimum on "Create OJS account"**: the Password field
     states its minimum, six characters on a default install; Pass5, five
     characters, is refused and the step does not advance (Settings).
   - **"Create OJS account"**: choose a username and password (the footnote
     names them) and tick the privacy consent.
   - **The consent checkbox's label**: links to the journal's Privacy
     Statement page (Settings).
   - **"Enter details"**: Given Name already reads Nova, the name the
     Journal Manager entered; choose Country Canada.
   - **"Review & create account"**: check the summary; its Edit button
     reopens the details. Press "Accept And Continue to OJS": a dialog
     announces the new role.
   - **"View All Submissions"**: ⚠ [A4](#a4) the dialog's "View All
     Submissions" button lands on the sign-in screen.
   - **The sign-in screen**: signing in with the new credentials succeeds,
     and the account holds the offered role.
   - **Control**: the invitation's row is gone from the manager's
     Invitations table, beside the account now holding the role (Rule 11).

3. **Existing user accepts an additional role**

   Given: a Journal Manager, signed in, on a scratch journal with a
   throwaway user who holds the Author role and not the offered one, the
   user signed out. <sup>s</sup>

   - **"Search User"**: press "Invite to a role" on Users & Roles and search
     the user's exact email address: the wizard confirms the user exists and
     shows their details read-only.
   - **"Enter details" and the compose step**: add one new role row (the
     offered role, Start Date today, "Appear on the masthead") and send.
   - **The recipient's mailbox**: holds the invitation email listing the
     offered role and, as a role already held, Author (Side effects).
   - **The accept link**: signed out, open it: the review step opens
     directly (at most an ORCID step precedes it), with no password prompt
     and no account fields.
   - **The link opened, the accept button not pressed**: on the manager's
     Users & Roles the row still reads "Invited {date}": opening the link
     alone never accepts the roles (Rule 5).
   - **"Accept And Continue to OJS"**: press it. ⚠ [A4](#a4) The browser
     lands on the sign-in screen still signed out.
   - **The sign-in screen**: signing in the usual way shows the role on the
     account, and the manager sees the name under Current Users.
   - **Control**: the invitation's row is gone from the Invitations table
     (Rule 11), where it still stood before the accept button was pressed.

4. **Recipient declines**

   Given: the recipient of a pending invitation to a throwaway address,
   sent as in scenario 1, signed out, holding the emailed links. <sup>s</sup>

   - **The decline link**: open it: a "Decline Invitation" page asks for
     confirmation.
   - **The page open, not yet confirmed**: on the manager's Users & Roles
     the row still reads "Invited {date}": opening the decline link alone
     declines nothing (Rule 10).
   - **"Confirm Decline Invitation"**: press it: the browser lands on the
     sign-in page, no role was granted, and the invitation's row is gone
     from the Invitations table.
   - **Control**: both emailed links now show "Invitation Unavailable"
     (Rule 4).

5. **Manager cancels a pending invitation**

   Given: a Journal Manager, signed in, on a scratch journal with a pending
   invitation to a throwaway address, sent as in scenario 1, its email in
   the recipient's mailbox. <sup>s</sup>

   - **The invitation's row menu**: choose "Cancel Invite": the confirmation
     dialog recaps the invitee (email, role, status, affiliation).
   - **Confirm**: the row disappears.
   - **The recipient's accept link**: now shows "Invitation Unavailable"
     with Login and Register buttons.
   - **Control**: the same accept link with its end cut off shows a
     not-found error instead, never the "Invitation Unavailable" page
     (Rule 4).

6. **Manager edits a pending invitation**

   Given: a Journal Manager, signed in, on a scratch journal with a pending
   invitation to a throwaway address, sent as in scenario 1, its email in
   the recipient's mailbox. <sup>s</sup>

   - **The invitation's row menu**: choose Edit: a dialog warns the current
     invitation will be canceled and a new one sent. Proceed.
   - **The wizard**: opens prefilled without the search step. Change the
     role set (the footnote names the roles), replace the subject with a
     second marker of this run and send.
   - **The recipient's mailbox**: holds a second invitation email.
   - **Control**: the second email's links work, its accept link opening
     the accept wizard, while the first email's links no longer do
     ⚠ [A3](#a3).

7. **Wrong person signed in**

   Given: a Journal Manager, signed in, on a scratch journal with two
   throwaway users: a member holding the Author role, and a bystander,
   signed in in a browser of their own. <sup>s</sup>

   - **The member's invitation**: invite the member to a further role as in
     scenario 3: their mailbox holds the accept link.
   - **The accept link in the bystander's browser**: open it: the page
     refuses with "Invitation not accepted. You're logged in as a different
     user." and offers to log out.
   - **Control**: press "Logout", which ends that session, and reopen the
     link: the real flow starts (Rule 6).

8. **Propose a role via the user row**

   Given: a Journal Manager, signed in, on a scratch journal with a
   throwaway member holding two roles, Author and Reader. <sup>s</sup>

   - **Edit on the member's row in the users list**: press it: the wizard
     opens on their details with no search step. The roles table shows the
     current roles with Remove Role and masthead controls. These act
     immediately and email the member.
   - **The masthead control on the Author row**: pick the other of "Appear
     on the masthead" and "Does not appear on the masthead": the
     confirmation dialog says "The user will be notified of this change.";
     confirm: the change takes effect at once, and on a journal the member's
     mailbox holds "Your journal masthead visibility has been updated"
     (Rule 13, Side effects). ⚠ [OMP1](#omp1) On a press or preprint server the
     masthead confirmation shows an error, though the change sticks.
   - **Remove Role on the Reader row**: press it: the confirmation asks "Are
     you sure you want to remove this role? The user will lose access and
     permissions associated with it." and says nothing of an email; confirm
     with "Remove Role": the row stays in the roles table with its End Date
     set to today and "User Removed From Role" in place of its button, and
     the member's mailbox holds "You have been removed from a role" (Rule 13,
     Side effects).
   - **Remove Role on the Author row, now the last active role**: press it:
     no confirmation opens; a "Remove Role" dialog answers "You cannot remove
     the role. At least one role must be assigned to the user." with a
     single "Close" button. Press "Close": the row keeps its Remove Role
     button and masthead select (Rule 13).
   - **"Save And Continue" on the details step**: stays inactive until a new
     role row is added.
   - **An empty role row**: add a role row and leave it empty: "Save And
     Continue" activates; press it: the missing role fields are rejected
     with inline errors (Rule 13).
   - **The filled row**: fill it in (the offered role, Start Date today,
     "Appear on the masthead") and send: the member receives an invitation
     email.
   - **Control**: the role appears on the member's account only after they
     accept it (scenario 3's flow), while the removal and the masthead
     change above took effect at once (Rule 13).

App-specific:

9. **The invitation template is missing from the Emails screen** {OPS}

   Given: a Preprint Server Manager, signed in, on the seeded preprint
   server. <sup>s</sup>

   - **The Emails settings screen**: open it and search for "User Invited to
     Role Notification": the list answers "No items found."
     ⚠ [OPS1](#ops1)
   - **Control**: scenario 1, run on the same install, still delivers the
     invitation email; on a journal or press the same search finds the
     template with an Edit button.

10. **The ORCID step, shown only to a recipient without a verified iD** {OJS OMP OPS}

    Given: a Journal Manager, signed in, on a scratch journal with ORCID
    enabled, with a throwaway user who holds the Author role and a verified
    ORCID iD (seeded), the user signed out. <sup>s</sup>

    - **A newcomer's invitation**: invite an email address no account uses
      (the footnote names it) as in scenario 1: its mailbox holds the accept
      link.
    - **The newcomer's accept link**: signed out, open it: the wizard opens
      on "Verify ORCID iD", which offers the "Verify ORCID iD" button and
      "Skip ORCID verification" and no other Continue button (Rules 5, 7).
      Leave "Verify ORCID iD" unpressed.
    - **"Skip ORCID verification"**: press it: "Create OJS account" opens
      (Rule 5).
    - **The verified user's invitation**: invite the throwaway user to a
      further role as in scenario 3: their mailbox holds the accept link.
    - **Control**: that accept link, opened signed out, opens the review
      step directly with no "Verify ORCID iD" step: the step shows only to a
      recipient without a verified ORCID iD (Rule 5).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - scenario 1's greeting bullet ("Dear Nova,"; Side effects): no
    assertion in the OJS, OMP or OPS suite
  - scenario 1's "Search User" bullet, the address already in the Email
    field on "Enter details" (Fields): no assertion in the OJS or OMP suite
  - scenario 2's "Enter details" bullet, Given Name already reading Nova
    (Fields): the OJS, OMP and OPS suites type the name instead of reading
    it back
  - a held role's masthead select on the search path's "Enter details"
    (Rule 13a): "Confirm" applying the change at once and keeping it when
    the invitation is never sent, the sent email's "Already assigned roles"
    reading the new choice, and "Cancel" putting the select back
  - "Cancel Invitation Process" for an existing user (Rule 17): signed in,
    landing on My Submissions still signed in; signed out, the sign-in
    screen, then My Submissions after signing in; the link reopening the
    review step (ORCID off), and accepting there still working
- **Rarely met**:
  - a disabled user met on the search step and through the users list's Edit
    action, "The user is currently disabled." and the two inactive buttons
    on both (Rule 14): a manager rarely sets out to invite a person they
    have disabled
  - a past start date taking effect as the acceptance day (Rule 8): a
    manager rarely backdates a start date, and the body names no screen
    where a role's start date is read back after acceptance
  - a journal with a second form language: the name boxes in that language
    on "Enter details" in both wizards, and the greeting by the name in the
    primary language only (Fields; Settings "Forms"; Side effects): the
    names are optional and nothing else on these screens changes, and
    scenario 1 reads the greeting by name on a one-language journal
  - an existing user who opens the accept link while already signed in as
    themselves, reaching the Dashboard still signed in after accepting
    (Rules 6, 9): scenario 3 walks the same review step and accept signed
    out
- **Nothing new to test**:
  - the template choice on the compose step (Actors row 7): the body states
    no outcome of the choice to read
  - "Back" to the search step clearing everything entered (Rule 15): the
    body names no screen where the cleared fields are read back
  - "Cancel" asking for confirmation only when something changed, its
    "Cancel Invite" returning to Users & Roles (Rule 15): a way out of the
    wizard that sends nothing
  - leaving the send wizard by a link or a typed address, with no question
    and no row added (Rule 15): a way out of the wizard that sends nothing
  - the accept wizard's "Cancel", its question and "Go Back", and "Cancel
    Invitation Process" declining nothing (Rule 17): a way out of the
    wizard that answers nothing
  - leaving the accept wizard by a typed address, with no question and the
    typed username not kept (Rule 17): a way out of the wizard that answers
    nothing
  - the masthead select of a removed role's row, its confirmation and its
    email (Rule 13, Side effects): scenario 8 changes the same select on a
    current row
  - a Site Administrator sending, editing, cancelling or proposing (Actors
    rows 1–5; scenarios 1, 5, 6 and 8's Journal Manager sees the same
    screens)
- **Register carries it**:
  - A1 (which roles the wizard's own address admits; Actors row 2)
  - A3 (the links of a replaced invitation dying with a not-found error;
    Rules 3, 4, 12; scenario 6 marks it)
  - A2 (an invitation being composed, purged by the daily cleanup; Rule 1,
    Side effects)
  - A4 (the link never signing anyone in, every recipient who opened it
    signed out landing on the sign-in screen; Rules 6, 9; scenarios 2 and 3
    mark it)
  - OMP1 (the masthead email failing with a raw error on presses and
    preprint servers, on the Edit path and the search path alike; Rules 13,
    13a, Side effects; scenario 8 marks it)
  - A9 (the role-removal email telling a disabled user their account is
    still active; Rule 14, Side effects)
  - A5 ("Invitation Sent" promising updates never delivered; Rule 15, Side
    effects)
  - A7 (the email's wording slips; Side effects)
  - A10 (a newcomer named only in another form language, or invited on a
    journal of another primary language than the site's by a manager
    working in the site's, greeted "Dear {email},"; Side effects)
  - A8 (added role rows carrying no accessible field names)
  - A11 (the invitation email promising a masthead listing for roles the
    masthead does not list; Side effects)
- **No seed**:
  - a pending invitation past its deadline, the link stopped and no role
    granted (Rules 1, 2, 4): the test tooling cannot backdate a deadline
  - "Verify ORCID iD" through ORCID's sign-in window (Rule 7): ORCID's
    service is unreachable from the test installs
  - the daily cleanup removing expired invitations (Side effects): the test
    tooling does not run the scheduled task
  - the invitation lifetime from the configuration file (Settings): the
    test tooling does not change the configuration file
- **Owned by another feature**:
  - the masthead listing updating per the chosen visibility after
    acceptance (Rule 8, Side effects; the masthead page: *Roles settings*)
  - the "Editorial History" listing that a removed role's masthead choice
    decides (Rule 13; *Journal identity & about pages*, whose scenario 8
    reads the listing after "Remove Role")
  - editing the stored invitation email template on the Emails screen
    (Actors row 8; *Emails management*)
  - other invitation kinds landing through the invitation-link landing
    (Rule 4, Cross-feature; *Review assignments*, *Registration & account
    validation*, *User profile*)
  - who reaches the Users & Roles screen (Cross-feature; *User management*)
  - which roles exist to be offered, their levels and the masthead concept
    (Cross-feature; *Roles settings*)

## Findings register

Verdicts are the author's judgment (claude, 2026-07-31), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A3](#a3) | The links of a replaced invitation (edited or re-sent) die with a bare not-found error | 🐞 | minor | — |
| [A4](#a4) | Nobody is signed in after accepting; every recipient who opened the link signed out lands on the sign-in screen | 🐞 | user-visible | claim check (claude), 2026-09-28 — narrowed to recipients who opened the link signed out |
| [A5](#a5) | "Invitation Sent" promises decision updates that are never delivered | 🐞 | user-visible | — |
| [A7](#a7) | Small wording and untranslated-text defects across the invitation screens and emails | 🐞 | minor | claim check (claude), 2026-09-28 — one item added (the accept page's invisible steps button) |
| [A8](#a8) | Added role rows carry no accessible field names; a screen reader hears row 1's labels | 🐞 | user-visible | — |
| [A10](#a10) | A newcomer named only in another form language, or invited on a journal whose primary language is not the site's by a manager working in the site's, is still greeted "Dear {email}," | 🐞 | minor | — |
| [A11](#a11) | The invitation email promises a masthead listing for roles the masthead does not list, such as Reader and Author | 🐞 | minor | — |
| [OMP1](#omp1) | Confirming a masthead change fails with a raw email-template error on presses and preprint servers | 🐞 | user-visible · crash: server | claim check (claude), 2026-09-29 — the invitation case placed on the send wizard's "Enter details", OMP and OPS; the send unaffected |
| [OPS1](#ops1) | The invitation email template has no row on the preprint server's Emails screen | 🐞 | user-visible | — |
| [A1](#a1) | The send wizard's address is gated more widely than the screen that offers it | ❓ | latent | — |
| [A2](#a2) | Daily cleanup deletes invitations still being composed | ❓ | latent | — |
| [A9](#a9) | The role-removal email tells a disabled user their account "is still active"; the active "Remove Role" and masthead select on their screen are intended | ❓ | minor | @beaug 2026-09-18 · controls intended, email wording open |
| [A6](#a6) | Retired: Edit on a disabled member's row opened an error over an empty wizard; it now opens their details with the disabled-user warning (Rule 14) | ✅ | retired | upstream change + claim check (claude), 2026-09-18 — fixed upstream |

### All apps

<a id="a1"></a>
**A1 — Wizard address wider than its screen** · ❓ · latent.
The only screen offering "Invite to a role" is Users & Roles (Managers and the
Site Administrator), but in code the wizard's own address is gated more
widely. An Author or Reviewer who types the address is turned away. The live
outcome for the remaining roles was checked on 2026-07-31 and is recorded in
the maintainer's private security file, not here.
Question: should anyone beyond Managers and the Site Administrator reach the
send wizard at all? Lean: no. The screen's narrower gate looks like the
product decision.
Basis: code + probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — Cleanup eats unsent drafts** · ❓ · latent.
The daily cleanup that purges expired invitations also deletes every
invitation still being composed, because drafts never carry a deadline. A
manager who happens to be mid-wizard when the daily run fires loses the draft,
and the wizard's next step fails. Such drafts pile up routinely: one pass
through the edit wizard left three behind, invisible anywhere in the UI.
Question: is same-day draft deletion intended housekeeping?
Lean: the cleanup is intended, and the mid-wizard window is an accepted-loss
edge case.
Basis: judgment (code); drafts observed live, the cleanup run itself not. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Replaced invitation's links die ungracefully** · 🐞 · minor.
A cancelled, declined, or expired invitation's old links show the friendly
"Invitation Unavailable" page. A replaced invitation, whether replaced through
Edit or superseded by a plain new send to the same person, is erased outright.
Its old email links therefore render a bare "404 Not Found" with no journal
styling. This is the one stale-link case that skips the explanation. The
user's situation is the same as after a cancellation, so it should get the
same page.
Basis: probe + claim check. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Nobody is signed in after accepting** · 🐞 · user-visible.
A newcomer who has just chosen a username and password and pressed "Accept And
Continue to OJS" is not inside. The closing dialog's "View All Submissions"
button lands on the sign-in screen, and they must type the credentials again.
An existing user who opened the link signed out, with no password prompt,
ends on the same sign-in screen. Only an existing user already signed in as
themselves when opening the link reaches the Dashboard. The roles themselves
are granted correctly.
Basis: probe, all three apps. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Promised decision updates never arrive** · 🐞 · user-visible.
The "Invitation Sent" dialog tells the inviter they "can be updated about the
user's decision on the Users & Roles page, your OJS notifications and/or your
email". After both accept and decline, every promised channel stays silent:
no notification, no email, and the pending row is removed outright. An
acceptance and a decline cannot be told apart from Users & Roles, except for
the new name an acceptance adds under Current Users.
Basis: probe, with a mail-delivery positive control. <sup>[f-a5](#fn-a5)</sup>

<a id="a7"></a>
**A7 — Small copy defects across these screens and emails** · 🐞 · minor.
The invitation email offers roles "as a Author". The search step reads
"Enter at least one details…" and "…invite to take a additional roles", and
the send wizard's cancel confirmation asks "Are you sure want to cancel this
invitation?". On OMP and OPS, the masthead confirmation reads "This will
update whether this user appears on the journal masthead for the selected
role." under a column named "Press Masthead" or "Server Masthead", and the
"Invitation Unavailable" page closes with "Please contact the journal
manager for further assistance.". "##common.help##" shows in the header of
every management page; a screen reader hears
"##userAccess.management.options##" for each Current Users row's menu button
on Users & Roles and "##invitation.wizard.completeSteps##" for the list of
steps in both wizards. On an existing user's one-step accept page, Tab
stops on an invisible button with no accessible name, whose only text is
the untranslated "{$current}/{$total} steps"; pressing it does nothing.
Basis: probe + claim check. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — Added role rows are invisible to a screen reader** · 🐞 · user-visible.
In the send wizard's roles table, every added row repeats the first row's
control identifiers, so each field label points back at row 1. A
screen-reader user editing the second or later row hears no name at all for
its role, start date, or masthead field, and cannot tell which row they are
changing. Sighted use is unaffected.
Basis: probe (accessibility-tree check). <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — The role-removal email tells a disabled user their account is still active** · ❓ · minor.
On a disabled user's details step the warning says no role can be assigned,
and "Add Another Role" and "Save And Continue" are inactive (Rule 14). Each
current role keeps an active masthead select and an active "Remove Role",
on the search path as well as through the users list's Edit action; that is
intended (see the review below). Pressed through the Edit action (the search
path's were seen active and not pressed), both act at once as for any member
(Rule 13): the role ends, and the disabled user is emailed "You have been
removed from a role", whose text tells them "Your account with {journal} is
still active and any other roles you previously held are still active." For
a disabled account that sentence is untrue. On a journal the masthead change
emails them too; on a press or preprint server it answers the raw error of
[OMP1](#omp1).
Question: should the removal email, or any email, go to a disabled user in
these words? Lean: the text was written before a disabled user could reach
this screen and wants a variant, or no email, for a disabled account.
Basis: probe, all three apps. <sup>[f-a9](#fn-a9)</sup>

> **Reviewed — @beaug, 2026-09-18**: ❓ stands, narrowed. Ruling: "Remove
> Role" and the masthead select are to stay active for a disabled user; that
> half is intended and is no longer part of the question. The removal
> email's language did not take into account that the user is disabled; this
> may be intended and may be patched in the future.

<a id="a10"></a>
**A10 — Some named newcomers are still greeted by their email address** · 🐞 · minor.
A newcomer whose name the manager entered on "Enter details" should be
greeted by it. Two are still greeted "Dear {email}," with no name on the
email's "To" line. On a journal whose primary language is not the site's,
a manager whose screens are in the site's primary language sends that
greeting although the name was entered in both languages; the same manager
working in the journal's primary language sends the name. A name entered
only in another of the journal's form languages, the primary language's
boxes left empty, is not used either. The invitation is delivered and works;
only the greeting misses the name.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — The invitation email promises masthead listings the masthead never gives** · 🐞 · minor.
Every role in the invitation email, held or offered, set to "Appear on the
masthead" carries "Your name will appear in the {journal}'s masthead as a
{role}.", also for a role the journal's "Editorial Masthead" page does not
list (which roles it lists: [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
Rule 14a). An existing Reader is told their name will appear on the
masthead "as a Reader", and an invitee offered Author "as a Author"; on a
default install the masthead lists neither role. The invitation itself
works; only the promise is false.
Basis: probe. <sup>[f-a11](#fn-a11)</sup>

### OMP and OPS

<a id="omp1"></a>
**OMP1 — Masthead change throws a raw email-template error** · 🐞 · user-visible · crash: server.
On a press or preprint server, confirming a masthead visibility change fails
on the server: an "Error" dialog shows the manager the raw text "Email
template USER_ROLE_MASTHEAD_UPDATE not found. The migration script
I11800_AddUserRoleMastheadUpdateEmail needs to be run.", and the member gets
no email. The change itself sticks after a reload, on a current role's row
and on a removed role's row alike (Rule 13). The same error appears in
"Invite to a role" for an existing member when a held role's masthead select
is changed on "Enter details" (Rule 13a); "OK" dismisses it, the change
sticks, and the invitation then sends and delivers normally. On a journal
the change applies cleanly and the member's notice is delivered. Fresh presses and preprint servers ship without
the email template this notice needs, so any new install reproduces it.
Basis: probe + install-seed check. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Invitation email template hidden on OPS** · 🐞 · user-visible.
On a preprint server the Emails settings screen lists no row for "User
Invited to Role Notification". Search and the full list both answer "No
items found.", so a manager cannot review or customize the stored template.
Invitations still send and deliver using it. On journals and presses the row
is present with an Edit button. This reads as a side effect of the preprint
server keeping its own list of emails, not an intended trim: the template
ships seeded and is in active use.
Basis: probe + code. <sup>[f-ops1](#fn-ops1)</sup>

### Retired

<a id="a6"></a>
**A6 — Edit on a disabled member opens a broken wizard** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13313, 2026-09-15), verified 2026-09-18 on OJS, OMP and OPS: Edit on a disabled user's row opens their details and current roles under "The user is currently disabled.", with no error (Rule 14); the email its role controls send is [A9](#a9)'s. <sup>[f-a6](#fn-a6)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Mount: `templates/management/access.tpl` places
`<user-invitation-manager>` (UI library `UserInvitationManager.vue`, atom
VUE-052) above the users grid inside `ManagementHandler::access()` (ROUTE-017's
`access` op, owned by the journal-identity/settings dispatcher row); screen
access is gated by `CanAccessSettingsPolicy` (site admin, or manager-level
groups with `permitSettings`). Row actions and dialogs:
`UserInvitationManagerStore.js` (`editInvite`, cancel →
`PUT invitations/{id}/cancel`). Button: locale key `invitation.inviteToRole.btn`
→ page `invitation/create/userRoleAssignment`. Gate live-probed 2026-07-31 on
all three apps: only managers and the
Site Administrator reach the screen; button label "Invite to a role" verbatim
everywhere.

<a id="fn-b"></a>
**b** — `PKP\pages\invitation\InitializeInvitationUIHandler` (ROUTE-013)
assigns ops `create`/`edit` to `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`,
`ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT` (+ `ContextAccessPolicy`). The API
(`PKP\API\v1\invitations\InvitationController`, API-024) shared that
four-role list until pkp/pkp-lib#13340 (`0dce988b35`, `c767c313b9`,
2026-09-16; issue pkp/pkp-lib#13299, with the follow-up pkp/pkp-lib#13339
named in a code comment on the list). Since then its route group for listing,
reading, adding, populating, sending, previewing the email of and cancelling
an invitation lists `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER` only, and the
`UserRoleAssignmentInvitePayload` validation (`UserGroupBelongsToContextRule`)
refuses a user group of another journal: "The provided user group does not
belong to the invitation's context". The page handler's list is unchanged, so
the mismatch of finding A1 now sits between the page on one side and both the
offering screen (note a) and the API on the other. Code-read 2026-09-17 on
OJS (lib/pkp `efbba94ae7`); the OMP and OPS lib/pkp pointers sit at
`360badeef5`, before the commits. The wizard's own flows are unchanged for
the Site Administrator and a Journal Manager (driven 2026-09-17 on OJS, two
scratch journals: a create-flow invitation to a user whose only role is in the
other journal and an edit-flow "Add Another Role" for a member of both, each
sent and accepted with every call answering 200).

<a id="fn-c"></a>
**c** — Users-grid Edit → `ManagementHandler::editUser()` (ROUTE-017 rider) →
wizard in `editUser` mode: `UserRoleAssignmentInviteUIController::createHandle()`
with a user id — search step omitted (`SendInvitationStep::getSteps()` skips it
when a user or invitation is given), submit disabled until changes
(`isSubmitting` init in `UserInvitationPageStore.js`). Immediate actions from
`UserInvitationUserGroupsTable.vue`: `PUT users/{id}/endRole/{roleId}`
(“Remove Role”, blocked for the last active role —
`user.removeRole.roleRemainMessage`), `PUT users/{id}/masthead/{userUserGroupId}`.
Live-confirmed 2026-07-31 (edit-user probe): Edit on a member's row opened
the wizard with no search step — a two-step rail against the create flow's
three — showing read-only identity fields and the roles table with its
immediate Remove Role and masthead controls. Test run 2026-09-13 (Rule 13,
scenario 8; the OJS, OMP and OPS suites, OJS and OMP also by hand before
the run): Remove Role on a member's last active role opened the "Remove
Role" dialog "You cannot remove the role. At least one role must be assigned
to the user." with one "Close" button and sent no request — the table's own
`removeUserGroup` check on `numberOfActiveRoles` (roles without an end
date) fires before any `endRole` call — and after Close the row still held
its Remove Role button and masthead select; on a removable row the
confirmation read "Are you sure you want to remove this role? The user will
lose access and permissions associated with it." (`user.removeRole.message`,
buttons "Remove Role" / "Cancel"), and after confirming (`endRole` 200) the
row stayed listed with End Date set to that day and "User Removed From Role"
in its last cell, the same on the wizard reopened from the user row (OJS,
OPS). Basis: test run. Claim check 2026-09-28, all three apps, six runs
each (Rule 13): two scratch members holding Author and the section-level
role (Section editor, Series editor on OMP, Moderator on OPS), one set to
"Appear on the masthead" and one to "Does not appear on the masthead", had
that role removed (`endRole` 200). The ended row read "{role} 2026-09-28
2026-09-28 … User Removed From Role" with no "Remove Role", and its
masthead select stayed enabled with both values, on the same page and after
a reload. Choosing the other value opened "Confirm masthead visibility
change"; "Confirm" saved it (shown on the page and after a reload; the
request answering 200 on OJS, 500 on OMP and OPS, f-omp1). "Editorial
History" listed the member set to appear right after the removal and not
the other; after the change the two had swapped. "Editorial Masthead"
listed neither, before or after. Claim check 2026-09-29, all three apps, two
runs each (Rule 13a): "Invite to a role" with a scratch Author's email on
"Search User" reached "Enter details" listing the held "Author" row (START
DATE that day, END DATE "---", the select on "Appear on the masthead",
"Remove Role") above the empty new-role row. Changing the held select opened
"Confirm masthead visibility change" ("… The user will be notified of this
change.", "Confirm" / "Cancel"); "Confirm" sent
`PUT users/{id}/masthead/{userUserGroupId}` at once (200 and the masthead
email on OJS; 500 on OMP and OPS, f-omp1). With a new role row filled and
the wizard then left by typing the Users & Roles address, no browser
question came, the Invitations table gained no row, and the member's Edit
page read "Does not appear on the masthead". Sent instead, the invitation
email's "Already assigned roles" read "Your name will not appear in
{journal}'s masthead as a Author." "Cancel" on the confirmation put the
select back to "Appear on the masthead" with no request and no email, and
the Edit page still read "Appear on the masthead" after a reload.

<a id="fn-d"></a>
**d** — Statuses: `PKP\invitation\core\enums\InvitationStatus`
(`INITIALIZED`, `PENDING`, `ACCEPTED`, `DECLINED`, `CANCELLED` — no EXPIRED
value; expiry is a timestamp check at read time). Single-live-invitation:
`Invitation::initialize()` deletes competing `INITIALIZED` rows of the same
type/target/journal; `Invitation::invite()` deletes competing `PENDING` rows
(`byNotId`). Replacement live-checked 2026-07-31 (claim check — Invitations table
before/after a second send to
the same address, both emailed links checked; OJS deep, OMP spot-check).

<a id="fn-e"></a>
**e** — Deadline: `Invitation::invite()` →
`setExpiryDate(now + getExpiryDays())`;
`getExpiryDays()` = config `[invitations] expiration_days`
(SET-064; `config.TEMPLATE.inc.php` default 3, same in all three apps) with
code fallback `Invitation::DEFAULT_EXPIRY_DAYS = 3`. Cleanup:
`PKP\task\RemoveExpiredInvitations` (JOB-051, registered daily in
`PKPScheduler`, inherited by all three app schedulers) dispatches
`PKP\jobs\invitations\RemoveExpiredInvitationsJob` (JOB-013) →
`InvitationModel::expired()->delete()` — hard delete; `scopeExpired()` is
`expiry_date < now() OR expiry_date IS NULL`, and `INITIALIZED` drafts always
have a NULL expiry date (finding A2). Lifetime live-checked 2026-07-31 with
`expiration_days = 0`: a just-sent link already rendered the unavailable page
and its row never listed, while a pending control row still did.

<a id="fn-f"></a>
**f** — Generic landing: `PKP\pages\invitation\InvitationHandler`
(ROUTE-014, AFFU-206), ops `accept`/`decline`/`confirmDecline`; link shape
`{journal}/invitation/accept?id={id}&key={key}` (built by
`InvitationHandler::getActionUrl()`; key is single-use plaintext in the email,
stored bcrypt-hashed). Lookup `Repo::invitation()->getByIdAndKey()` scopes
status PENDING + not expired, then verifies the key; a correct key on a
non-actionable row renders `invitation/invitationUnavailable.tpl`
(`invitation.unavailable.title`, buttons `user.login`,
`user.login.registerNewAccount`); anything else is a 404. Type dispatch:
`Invitation::getInvitationActionRedirectController()` — the reviewer one-click,
registration-validation and change-email invitation types route to their own
controllers through this same landing. Landing live-probed 2026-07-31: the
unavailable page renders after cancel, decline and expiry; a replaced
invitation's links 404 instead (finding A3).

<a id="fn-g"></a>
**g** — Send wizard: `pages/userInvitation/UserInvitationPage.vue` +
`UserInvitationPageStore.js` (VUE-011), steps from
`PKP\invitation\stepTypes\SendInvitationStep` — `searchUser` (skips API
update), `userDetails`, `sendMail` (Composer: editable subject/body, template
picker via `emailTemplatesApiUrl`, CC/BCC; prefill from the mailable in note
j). API sequence: first advance past details →
`POST invitations/add/userRoleAssignment` + `PUT …/populate`; final submit →
populate + `PUT …/invite`. Back to step 1 resets the payload; Cancel dialog
only when `detectChanges`. Success dialog keys `userInvitation.modal.*`
(message text — finding A5); its "View All Users" button navigates to
`management/settings/access` (Users & Roles) — live-confirmed 2026-07-31 on
all three apps by claim check (an earlier live probe the same day had read
the pre-click wizard anchor, not the post-click page). Claim check
2026-09-27 (Rule 15), all three apps: "Cancel" on "Enter details" opened
the "Cancel Invitation" dialog, "Are you sure want to cancel this
invitation?" with the buttons "Cancel Invite" and "Go Back" (finding A7),
and "Cancel Invite" returned to Users & Roles; leaving the wizard by
opening another address raised no browser question, and the Invitations
table held the same rows afterwards.

<a id="fn-h"></a>
**h** — `UserInvitationSearchFormStep.vue`: `GET users?searchPhrase=…&status=all`,
match order exact email → exact username → ORCID (orcid.org URI prefix
stripped); found → `userInvitation.search.userFound`, miss →
`userInvitation.search.userNotFound`; empty input → "Provide at least one
search criteria." (`invitation.searchForm.emptyError`). Live-checked
2026-07-31 (claim check): a malformed miss (`notanemail`)
advances to "Enter details" with the typed text discarded — the Email field
arrives empty and errors "This field is required when user id is not
present." on continue. Claim check 2026-09-27, all three apps: on every
new-invitee send the searched address arrived typed into the Email field
of "Enter details", while a miss that is no email address (`nobody<tag>`)
still arrived empty; the miss read "The user does not have a role in this
journal" on OJS, "…in this press" on OMP and "…in this server" on OPS.

<a id="fn-i"></a>
**i** — `UserInvitationUserGroupsTable.vue` +
`UserInvitationDetailsFormStep.vue`: role select disables held/selected
groups; masthead select (`invitation.masthead.show`/`.hidden`) starts with no
value — inline "This field is required." until picked (claim check
2026-07-31: OJS and OMP) — and is the fixed text "Appear on
the masthead" for reviewer groups, with no select rendered (claim check
2026-07-31; on-screen text only — the public masthead page was not probed);
an added
row's END DATE cell renders "---" with no input (claim check 2026-07-31);
disabled-user warning `userInvitation.user.disable*` (on the search path and,
since pkp/pkp-lib#13313, on the users-grid Edit path, f-a6) and
`isSubmitting` also stuck while `userGroupsToAdd` is empty. Payload contract:
`userGroupsToAdd[]` = `{userGroupId, masthead (required bool), dateStart
(required date), dateEnd (optional)}` (`UserRoleAssignmentInvitePayload` +
rules `AllowedKeysRule`, `UserGroupExistsRule`, `AddUserGroupRule`,
`NoUserGroupChangesRule`). Live probe 2026-07-31: "Add
Another Role" alone enables "Save And Continue" — missing role fields error
inline on continue; disabled-user banner full text "The user is currently
disabled. The user was disabled. You cannot assign them a role while they are
disabled. Please enable the user first to invite them to a role.", with both
buttons disabled (enabled-user control passed). Re-driven 2026-09-18 on OJS,
OMP and OPS (Rule 14; scratch users disabled through the users grid's row
menu "Disable User" › "OK"): searched by email and by username, the step
opens under the heading "The user is currently disabled." with the same
paragraph, no new-role row, "Add Another Role" and "Save And Continue"
disabled; the Edit path shows the same (f-a6); the enabled control gets an
empty new-role row and both buttons active. The current roles' masthead
selects and "Remove Role" stay enabled on both paths (f-a9). Claim check
2026-09-27, all three apps, on a scratch journal with English (primary) and
French (Canada) under "Forms": the send wizard's "Enter details" showed a
"French" button above the name fields; pressed, it added "Given Name in
French" and "Family Name in French", and each name field read "0/2
languages completed", then "1/2 languages completed" once one language was
filled. Sends with the French boxes only, with both languages and with
English only were all delivered (their greetings: note j).

<a id="fn-j"></a>
**j** — Mailable `PKP\mail\mailables\UserRoleAssignmentInvitationNotify`
(MAIL-055), template key `USER_ROLE_ASSIGNMENT_INVITATION`, variables
`recipientName`, `inviterName`, `inviterRole`, `rolesAdded` (with dates +
masthead visibility text), `existingRoles`, `acceptUrl`, `declineUrl`; sender
is the inviter. Sent only from `Invitation::invite()`. OPS divergence:
`ops-main/classes/mail/Repository::map()` overrides the base map without
merging and omits this mailable (comment: "OPS uses distinct mailables"),
while OJS/OMP `Repository::map()` merge the base list; the template key is
seeded in the OPS registry all the same, so sending works — finding OPS1.
Chain check: no app subclasses any invitation class; the API shim
`api/v1/invitations/index.php` is byte-identical in all three apps; no
app-name branches exist in shared invitation code. Greeting:
`UserRoleAssignmentInvite::getMailableReceiver($locale)` copies the
payload's `givenName` / `familyName` in `$locale` (the journal's primary
language) onto the recipient since pkp/pkp-lib#13397 (`aa077419e3`,
2026-09-26; issue pkp/pkp-lib#13376; OJS lib/pkp `26ae6431b5`, OMP and OPS
`17a1f01fed`); before it the method tested two properties the class never
had, so every newcomer was greeted by address. `setData()` of the mailable
fills `{$recipientName}` with the recipient's full name, or the address
when that is empty (finding A10). Claim check 2026-09-27, all three apps,
emails read in the mail catcher: Given "Nova" and Family "Quill" → "Dear
Nova Quill," and "Nova Quill" on the To line; given name only → "Dear
Nova,"; family name only → "Dear Quill,"; no name → "Dear {address}," and
no name on the To line; on an English journal with French under "Forms",
both languages or English only → "Dear Nova Quill,", French only → the
address; an existing member → "Dear Mira Member,". Every fixed line of the
compose step's body reached the sent text. Claim check 2026-09-28, all three
apps, six runs each: a Reader with "Appear on the masthead" invited to
Author read "Already assigned roles" › "Reader" › "Starting from
2026-09-28" › "Your name will appear in the {journal}'s masthead as a
Reader.", then "Newly assigned roles" › "Author" › the same sentence "as a
Author."; a Reader set to "Does not appear on the masthead" read "Your name
will not appear in {journal}'s masthead as a Reader." (finding A11).

<a id="fn-k"></a>
**k** — Accept wizard: `pages/acceptInvitation/AcceptInvitationPage.vue` +
store (VUE-001), mounted by `acceptInvitation.tpl` (AFFU-122) from
`UserRoleAssignmentInviteRedirectController::acceptHandle()`; steps from
`PKP\invitation\stepTypes\AcceptInvitationStep::getSteps()` — ORCID step only
`if (!$user->hasVerifiedOrcid() && OrcidManager::isEnabled($context))`
(shared core `OrcidManager`, identical in all three apps); new-user chain
`verifyOrcid → userCreate → userDetails → userCreateReview`, existing-user
chain `verifyOrcid → userCreateReview`; the review step is present for every
recipient, so the store's empty-step auto-finalize branch is unreachable in
practice — live checks 2026-07-31 found no auto-accept with
ORCID off (its shipped state in the test contexts) or on. Step advance →
`PUT invitations/{id}/key/{key}/refine`;
final → `…/finalize`. Review-step Edit button renders only for new users
(`AcceptInvitationReview.vue`). ORCID buttons: `AcceptInvitationVerifyOrcid.vue`;
the wizard's primary button is hidden on that step. Claim check 2026-09-27,
all three apps: the accept wizard's "Enter details" arrived with Given Name
"Nova" and Family Name "Quill" as the manager had entered them (the
Editorial Board Member invitees' "Hana" and "Ivo" alike); the invitee whose
name was entered in the French boxes only met an empty "Given Name *
Required" under a "French" button, each name field reading "1/2 languages
completed"; with Given Name emptied and no country, "Save and continue"
was refused and the step stayed; the review step's "Edit" reopened the
details and "Save and continue" returned to the review.

<a id="fn-l"></a>
**l** — `UserRoleAssignmentReceiveController::authorize()` calls
`Validation::registerUserSession($user)` for a signed-out existing invitee,
which reads as auto-login — but live probing (2026-07-31, two independent
runs) found the recipient signed out throughout the wizard and
after finalize (finding A4); the wizard simply never asks for credentials.
Signed-in non-invitee → refusal (store dialog keys
`acceptInvitation.authorization.shouldBeAnonymous` / `.message`, action
`user.logOut` — live-confirmed, the Logout button ends the session); new-user
invitations require an anonymous session. Key-based API ops
(`GET/PUT invitations/{id}/key/{key}/…`) are public routes with per-type
authorization. Claim check 2026-09-28, all three apps, six runs each: an
existing Author signed in as themselves opened their own accept link and
met the same single "Review & create account" step as a signed-out one,
with no password prompt; `finalize` answered 200.

<a id="fn-m"></a>
**m** — `UserRoleAssignmentReceiveController::finalize()`: creates the user
(username, names, email, country, affiliation, verified-ORCID data, password)
or backfills ORCID for an existing one; assigns each `userGroupsToAdd` row via
`Repo::userGroup()->assignUserToGroup(...)` with past `dateStart` clamped to
today; marks ACCEPTED. No recipient holds a session after finalize (finding
A4 — live-confirmed on all three apps) and no mail or notification goes to
the inviter (finding A5 — live-confirmed 2026-07-31 with a positive
control); the store's closing dialog
(`acceptInvitation.modal.*`, button "View All Submissions") redirects to the
`submissions` page, which greets the signed-out recipient with the sign-in
form. Claim check 2026-09-28, all three apps, six runs each: after "View
All Submissions" the recipient who had opened the link signed out reached
`login?source=…/submissions`; the one signed in as themselves reached
`dashboard/editorial?currentViewId=assigned-to-me` ("Assigned to me"), the
header holding their username and "Tasks". The closing dialog "You've been
assigned a new role in OJS" (OMP, OPS: the app's acronym) opened within
0.2–1.1 s of every press of "Accept And Continue to OJS" (72 presses,
signed out, signed in as the invitee, and newcomers at 1280 and 380 px wide).

<a id="fn-n"></a>
**n** — Decline: `declineInvitation.tpl` (AFFU-123) — POST + CSRF to
`invitation/confirmDecline`; base
`InvitationActionRedirectController::declineHandle()` throws
`GoneHttpException` unless PENDING;
`UserRoleAssignmentInviteRedirectController::confirmDecline()` marks DECLINED
and redirects to `login`. Live probe 2026-07-31: flow verbatim as
specified; after the decline both links render the unavailable page (note f),
not a bare gone response.

<a id="fn-o"></a>
**o** — Validation (`UserRoleAssignmentInvite` rules): `UsernameExistsRule`;
password `Password::min($site->getMinPasswordLength())` — the field's helper
text states the six-character default minimum (live-checked 2026-07-31; one
observation from this check is recorded in the maintainer's private security
file, not here); `EmailMustNotExistRule` at finalize —
`changeInvitationUserIdUsingUserEmail()` first converts an email invitation
into an existing-user invitation when the address has since registered;
privacy consent enforced client-side
(`acceptInvitation.privacyStatement.validation`), auto-satisfied for existing
users; `givenName` (primary locale) + `userCountry` required at
finalize/refine; existing-user invitations prohibit personal-detail overrides
(`ProhibitedIncludingNull`).

<a id="fn-p"></a>
**p** — Listing: `GET invitations/userRoleAssignment`
(`InvitationController::getMany()`) scoped
`byType → byContextId → stillActive()` (= not expired AND status PENDING —
Eloquent groups the scope's OR internally); 5 rows per page; status cell is
always `userInvitation.status.invited` ("Invited {date}"). Columns: Name
(+ORCID icon), Email, Invitations (the offered roles), Status, Affiliation —
live-confirmed 2026-07-31.

<a id="fn-q"></a>
**q** — Cancel: `PUT invitations/{id}/cancel` → status CANCELLED (allowed only
while PENDING); the row is kept, so old links reach the unavailable page (note
f). Edit: dialog `userInvitation.edit.title`/`.message` → page
`invitation/edit/{id}` (`editHandle`, mode `edit`) — but the wizard store
starts with no invitation id even in edit mode, so the first advance
`POST`s a NEW invitation and `invite()` then deletes the old PENDING row
(note d) — hence the replaced row's hard-404 links (finding A3). Live
2026-07-31 (live probe): cancel and replacement flows verbatim; the
cancel confirmation's confirm button reads "Cancel Invitation" beside the
dismiss button "Cancel". Each pass through the edit wizard mints a fresh
draft (see f-a2).

<a id="fn-r"></a>
**r** — Removal email "You have been removed from a role"; masthead email
"Your journal masthead visibility has been updated"; the masthead dialog's
copy `user.masthead.update.message` ends "The user will be notified of this
change." (live probe 2026-07-31; both delivered on OJS). The removal
dialog's copy `user.removeRole.message` carries no such sentence: test run
2026-09-13, all three apps, the removal email delivered on each (the
2026-07-31 sentence had been read on the masthead dialog alone).
Masthead template key `USER_ROLE_MASTHEAD_UPDATE` — OMP/OPS seeding gap in
f-omp1. Claim check 2026-09-28 (OJS): a masthead change on a removed
Section editor row sent "Your journal masthead visibility has been updated"
reading "… for the role Section editor (September 28, 2026 – September 28,
2026) … New setting: Does not appear on the masthead" (note c).

<a id="fn-s"></a>
**s** — Scenario seeding: every scenario but 9 gets a scratch context per
test and app from `POST scenarios/context` (`scenarios.md`), its tag
carrying app, scenario and run, every account a `users[]` entry
(`<username>@mail.test`, password the username twice), the Journal Manager
a `manager` role entry. Extra entries: scenario 3's user and scenario 7's
member an `author` entry; scenario 7's bystander a `reader` entry (any
signed-in account that is not the invitee, the manager included, serves);
scenario 8's member `roles: ['author', 'reader']`; scenario 10's context
passes `orcid: {}` (ORCID enabled on the dummy Public Sandbox pair; every
other context omits the key, which leaves ORCID off) and its user an
`author` entry with `orcid` (the sandbox example
`https://sandbox.orcid.org/0000-0002-1825-0097`) and `orcidIsVerified:
true`, the seed that stamps the live permission ORCID's own sign-in would
store. Invitee addresses are `rcpt<tag>@mail.test`, typed on "Search
User"; the subject marker typed on the compose step is `Invitation<tag>`
(scenario 6's first send `<tag>first`, its second `<tag>second`), and every
mailbox read is Mailpit scoped by the recipient plus that marker
(`pkpMail.find({to, contains})`), the accept and decline links pulled from
the message body; scenario 8's masthead email is read on OJS only (f-omp1).
Scenario 2's account is `acc<tag>` / `Password<tag>`, the refused control
`Pass5`. The offered role is one the invitee does not hold: Copyeditor on
OJS, Author or External Reviewer on OMP, Moderator on OPS; scenario 6's
replacement changes the row to a second such role (Author on OJS,
Copyeditor on OMP). Scenario 9 signs in as the seeded preprint server's
ready Preprint Server Manager (`manager.maya`) and only browses.

<a id="fn-t"></a>
**t** — The daily cleanup has no screen: no page or API shows when it
runs or what it removed, so what it does is known from code reading (note
e). The claim checks of 2026-07-31 and 2026-09-27 left it undriven: running
the scheduled task on the shared test installs would also remove the
drafts other runs had open (finding A2).

<a id="fn-u"></a>
**u** — Claim check 2026-09-28, all three apps, six runs each, ORCID off
(Rule 17): "Cancel" stood beside the forward button on each of a
newcomer's three steps and on an existing user's review step. On a
newcomer's "Create OJS account" it opened "Cancel Role Invitation
Process?", whose text goes on "If you're already a user, you'll be taken
back to the dashboard. If not, you'll need to access the invitation email
to start the process again."; "Go Back" returned to the step, and "Cancel
Invitation Process" led to `login?source=…/submissions` with no
invitations request made. The Invitations table still held the row, and
the link reopened "Create OJS account". Before that, a username typed there
and left for the journal's About page by address raised no browser
question, and the reopened step's Username was empty. The ORCID step was
not read. Claim check 2026-09-29, all three apps, two runs each, ORCID off:
a scratch Author invited to a further role opened the link once signed out
and once signed in as themselves. On the one "Review & create account"
step, "Cancel" opened the same dialog, "Go Back" left no dialog, and
"Cancel Invitation Process" made no invitations request and raised no
browser question. Signed out, it led to `login?source=…/submissions`, the
sign-in form, still signed out; signing in there reached
`dashboard/mySubmissions?currentViewId=active` ("Active submissions (0)";
tried on five of the six runs, OJS in the second only). Signed in, it led
straight to that address, the header still holding the user's name. Either
way the Invitations row still read "… Invited 2026-09-29", the user's row
listed Author only, and the link reopened the review step with its accept
button. Accepting from it, signed out, showed "You've been assigned a new
role in OJS" (the app's acronym on OMP and OPS); the row left the
Invitations table and the user's row listed Author and the offered role.

<a id="fn-a1"></a>
**f-a1** — Role assignment vs screen gate: note b vs note a. The atlas route
row records the same mismatch. Live check 2026-07-31, all three apps:
Author and Reviewer
denied at the wizard address; the section-editor and assistant-level outcomes
are recorded in the maintainer's private security file. OPS has no seeded
reviewer account, so that one cell was untestable. Re-checked 2026-09-17 on
OJS after pkp/pkp-lib#13340; the outcome for the section-editor and assistant
levels is again recorded in the maintainer's private security file.

<a id="fn-a2"></a>
**f-a2** — `scopeExpired()` includes `orWhereNull('expiry_date')` (note e);
`setExpiryDate()` only runs inside `invite()`, so drafts (`INITIALIZED`) always
have NULL expiry and match the delete. Drafts are invisible in the UI (listing
scope, note p), so the loss surfaces only as a failed wizard step. Live: one
edit-mode session created three draft invitations, only the last sent
(live probe 2026-07-31); the cleanup run itself was not exercised.

<a id="fn-a3"></a>
**f-a3** — Replacement path in note q: the old PENDING row is deleted by
`Invitation::invite()`'s `byNotId` cleanup, and `getByIdAndKey()`/the
unavailable-page fallback both need the row to exist (note f) → hard 404.
Cancellation keeps the row → friendly page. Live-confirmed 2026-07-31
(OJS and OPS): raw "404 Not Found", no journal styling.
Claim check 2026-07-31 (OJS deep,
OMP spot-check): a plain re-send to the same address kills the old accept
link the same way — same `byNotId` cleanup, not edit-specific.

<a id="fn-a4"></a>
**f-a4** — `finalize()` registers no session (note m) while the store then
redirects to `submissions`; the code's apparent existing-user auto-login
never materializes either (note l). Live-confirmed 2026-07-31 on OJS, OMP and
OPS, on both the accept and decline flows. Claim check 2026-09-28, all
three apps: an existing user who opened the link while signed in as
themselves stays signed in and reaches the Dashboard (note m).

<a id="fn-a5"></a>
**f-a5** — Success-dialog copy: app locale key `userInvitation.modal.message`.
No accept/decline code path produces a notification or email to the inviter
(notes m, n). Live-confirmed 2026-07-31 (live probe, accept and decline
cases): bell/Tasks panel "No Items", inviter mailbox empty after both accept
and decline; positive control — an invitation sent afterwards delivered
normally.

<a id="fn-a6"></a>
**f-a6** — Users-grid Edit on a disabled member (live probe 2026-07-31): error
toast "The requested resource was not found.", empty roles table, no
disabled-user banner; the banner rendered only on the search path
(`userInvitation.user.disable*`, note i). Enabled-user control passed.
Cause: `PKPUserController::get()` read the user with `Repo::user()->get($userId)`,
which leaves disabled users out, so `GET users/{userId}` answered 404 and the
wizard opened empty. Fixed upstream by pkp/pkp-lib#13313 (lib/pkp
`2ecbd331ee`, 2026-09-15, Touhidur Rahman, "Disable user edit page load
fix"): the controller reads with `get($userId, true)` and
`UserRoleAssignmentInviteResource` passes a `disabled` flag in the invitation
payload, which the details step answers with the banner. The issue, still
open on 2026-09-18, states the intention: "Should not throw an error. I would
also assume that this user is disabled so all fields are disabled meaning
they can't be edited." Verified 2026-09-18 on OJS (ojs `7c8d69af3e` /
lib/pkp `14473fe784`), OMP (`c6a132892`) and OPS (`4bb66b1469`, both lib/pkp
`1bcd4dd55f`), each driven twice as a scratch manager and read once as
`admin`, with the kept check `shared/playwright/checks/sync/pkp-lib-13313/s18a.js`:
Edit on the row of a scratch user disabled through the row menu's "Disable
User" answers `GET users/{userId}` 200 and opens "STEP 1 - Enter details and
invite for roles" filled (email, names, the roles table with the user's
roles) under the banner, no error dialog, "Add Another Role" and "Save And
Continue" disabled, no new-role row; the enabled control opens the same step
with no banner and an active "Add Another Role". The first half of the
intention is met; on the second see [A9](#a9) and its review of 2026-09-18
(the current roles' controls stay active by design). Retired 2026-09-18.

<a id="fn-a7"></a>
**f-a7** — Copy items, all observed on live probes 2026-07-31: "as a
Author" (invitation email; re-read 2026-09-27 on all three apps); "journal masthead"
wording on OMP/OPS masthead dialogs (`user.masthead.update.message`, which
neither app's `locale/en/user.po` overrides; re-read verbatim by the
2026-09-13 OMP and OPS test runs beside the "Press Masthead" / "Server
Masthead" column); search-step grammar "Enter at least
one details…" / "…invite to take a additional roles"; raw locale keys
`##common.help##` and `##userAccess.management.options##` on the management
screens of all three apps; and (claim check 2026-07-31) the
unavailable-page tail "Please contact the journal manager for further
assistance." unsubstituted on OMP and OPS. Added by the claim check of
2026-09-27, all three apps: the send wizard's "Cancel Invitation" dialog
"Are you sure want to cancel this invitation?" (note g); the list of steps
in the send and accept wizards named "##invitation.wizard.completeSteps##"
in the accessibility tree. Dropped 2026-09-27: the greeting of a new
invitee by address, which pkp/pkp-lib#13397 (`aa077419e3`, 2026-09-26;
issue pkp/pkp-lib#13376) replaced with the name entered (note j); the cases
that fix leaves out are finding A10. Added by the claim check of
2026-09-28, all three apps, runs 3 to 6: on an existing user's one-step
accept page ("Review & create account", ORCID off) the stepper is collapsed
and clipped to 1 px from the moment the page lands; inside it an
`aria-hidden` block holds "1/1 steps" and a toggle button whose text is
the untranslated `{$current}/{$total} steps`. Tab from the top reaches it
fifth (after the two skip links, the journal name and the step button "1
Review & create account"); it has no accessible name, a pointer press at
its place lands on the step content, and Enter on it changed nothing.
Present before and after "Accept And Continue". A newcomer's three-step
wizard (1280 and 380 px) and the send wizard have no such text.

<a id="fn-a8"></a>
**f-a8** — Every added row in `UserInvitationUserGroupsTable.vue` renders
`#-userGroupId-control`, `#-dateStart-control`, `#-masthead-control` — the
same ids as row 1 (empty `formId` segment in `FieldBase.compileId()`) — so
every `label[for]` resolves to the first row's control; no
`aria-label`/`aria-labelledby` anywhere in the table, and the aria snapshot
shows row 2's combobox/textbox without an accessible name. Observed
2026-07-31 (claim check —
duplicate-id scan + aria snapshot on OJS; shared component, all three apps).

<a id="fn-a9"></a>
**f-a9** — The payload's `disabled` flag (f-a6) gates the banner
(`UserInvitationDetailsFormStep.vue`), the new-role rows and "Add Another
Role" (`UserInvitationUserGroupsTable.vue`) and the continue button
(`isSubmitting` in `UserInvitationPageStore.js`); the same table's
current-role rows render their masthead `FieldSelect` and "Remove Role"
without reading it. Live 2026-09-18 on OJS, OMP and OPS
(tips and kept check as in f-a6; a scratch user holding Author and Reader,
disabled through the users grid's row menu, opened through Edit): "Remove
Role" on the Reader row opened the usual confirmation and, confirmed,
`PUT users/{userId}/endRole/{userGroupId}` answered 200, the row showing End
Date today and "User Removed From Role"; the disabled user's mailbox then
held "You have been removed from a role" (`USER_ROLE_END`, whose body carries
the "still active" sentence). The masthead select on the Author row opened
"Confirm masthead visibility change"; "Cancel" put the value back; "Confirm"
saved with `PUT users/{userId}/masthead/{userGroupId}` 200 and a second email
on OJS, and answered 500 with OMP1's error dialog on OMP and OPS, no email.
A second disabled user met on the search path showed the same enabled
controls, left unpressed, and received nothing, as did both enabled controls
and the disabling itself. Whether the search path showed these controls
enabled before 2026-09-15 was not traced; the Edit path could not reach them
until then (f-a6). Intention: the issue's sentence quoted in f-a6 reads as if every
field were to be inactive; @beaug ruled on 2026-09-18 (Mattermost, the daily
sync's thread) that "Remove Role" and the masthead select are to stay active
for a disabled user, which leaves the email's wording as the open half.

<a id="fn-a10"></a>
**f-a10** — Cause (note j): `getMailableReceiver($locale)` copies the name
in the journal's primary language only, and the mailable's `setData()`
reads the recipient's full name with no language, so it takes the language
of the sending request and falls back to the site's primary language. On a
journal of another primary language than the site's, a manager whose
screens are in the site's language hits the empty site-language name; a
name only in a second form language is never copied. The issue
(pkp/pkp-lib#13376) asks that a new user be greeted by the name typed, and
by the address only when none is given; its fix, pkp/pkp-lib#13397
(`aa077419e3`, 2026-09-26), leaves these cases out. Not a regression:
before the fix every newcomer got the address. Driven 2026-09-27: on
an English journal with French under "Forms", a name in the French boxes
only → "Dear {address}," and no name on the To line (OJS, OMP and OPS). On
an English site, a press whose primary language is French (Canada), with
English and French under "Forms" and names entered in both ("Eve English"
/ "Eva Anglais") → the address while the manager's screens were in English;
the same press, another newcomer named in both, with the session switched
to French before "Invite user to the role" → "Dear Fanny Francais,"; an
English-primary press, English names → "Dear Anna Smith,". Driven on OMP and held on a freshly reset install, with an OJS
control the same; OPS carries the same shared code (no subclass, note j)
and was not driven. Kept check
`shared/playwright/checks/sync/pkp-lib-13376/greeting.js`. Written up for
the team in `docs/reports/2026-09-27-pkp-lib-13376.md` (a temporary report,
deleted once acted on; git history keeps it).

<a id="fn-a11"></a>
**f-a11** — `UserRoleAssignmentInvitationNotify::getUserUserGroupSection()`
(note j) picks `emails.userRoleAssignmentInvitationNotify.userGroupSectionWillAppear`
or `…WillNotAppear` from the member's own masthead flag on the offered or
held role alone; it never reads the role's own masthead setting ("Consider
role in masthead list"; code-read 2026-09-28, OJS lib/pkp). The install's `registry/userGroups.xml` sets `masthead="true"` only
on the editor, section editor, external reviewer (OJS, OMP) and editorial
board member groups. Claim check 2026-09-28, all three apps, six runs each
(email text in note j): the scratch contexts' "Editorial Masthead" listed
only the section-level role's heading (Section editor, Series editor,
Moderator), never Reader, Author or Copyeditor, before and after the drive,
including after two Authors had accepted Copyeditor with "Appear on the
masthead" on OJS and OMP. An existing Author's email carried the same
sentence for the held Author role.

<a id="fn-omp1"></a>
**f-omp1** — Error observed on OMP and OPS (live probes 2026-07-31, two
independent sessions; re-read word for word by the 2026-09-13 OMP and OPS
test runs: the "Error" dialog with its one "OK" button, the PUT answering
500 on the press, the select holding the new value after OK and after a reload, no
masthead email); OJS control clean, member's email delivered (note r).
Install-seed check 2026-07-31: only OJS's `registry/emailTemplates.xml` seeds
`USER_ROLE_MASTHEAD_UPDATE`; the OMP and OPS registries carry no masthead
template, and the `I11800_AddUserRoleMastheadUpdateEmail` migration adds it
on upgraded installs only — omp_test/ops_test hold 0 such default rows vs 2
in ojs_test, so fresh installs reproduce the error. Crash: the masthead
request answers 500 (`users/{id}/masthead/{userUserGroupId}`). Claim check
2026-09-28, OMP and OPS, six runs each: twice per run, on a removed role's
row changed each way, the same 500 and "Error" dialog, the new value shown
after a reload and no masthead email (note c).
Claim check 2026-09-29, OMP and OPS, two runs each (Rule 13a; OJS the
control): on "Enter details" of "Invite to a role" for an existing Author,
the held Author row's select changed to "Does not appear on the masthead"
and confirmed sent the masthead request, which answered 500 with the same
"Error" dialog; "OK" left "Enter details" with the select on the new value.
With the offered role filled, "Save And Continue", the compose step and
"Invite user to the role" went through to "Invitation Sent", every
invitation request answering 200; the Invitations row read "Invited
2026-09-29", and the invitation email arrived, its "Already assigned roles"
reading "Your name will not appear in {press or server}'s masthead as a
Author.", with no masthead email; the Edit page read "Does not appear on the
masthead". The same send with the held select untouched made no masthead
request and showed no error, its email reading "Your name will appear in the
{press or server}'s masthead as a Author." On OJS the change answered 200
with no dialog, and the masthead email arrived beside the invitation.

<a id="fn-ops1"></a>
**f-ops1** — Evidence in note j (OPS map override vs seeded template).
Live-confirmed 2026-07-31 (live probes, all three apps): "User Invited
to Role Notification" listed with an Edit button on OJS and OMP; OPS search
and full list answer "No items found."; the OPS invitation email sent and
delivered in the same session.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Users & Roles · Invitations table + "Invite to a role" | Settings → Users & Roles → Users tab | AFFM-099..101 · VUE-052 |
| Send wizard (create) | `{journal}/invitation/create/userRoleAssignment` | ROUTE-013 · VUE-011 · AFFM-118..120 |
| Send wizard (edit pending) | `{journal}/invitation/edit/{invitationId}` | ROUTE-013 · AFFM-100 |
| Send wizard (existing member) | users grid Edit → `{journal}/management/settings/user/{userId}` | ROUTE-017 rider (`editUser` — owned elsewhere) |
| Emailed accept link | `{journal}/invitation/accept?id=…&key=…` | ROUTE-014 · AFFU-206 · AFFU-122, 126..137 · VUE-001 |
| Emailed decline link | `{journal}/invitation/decline?id=…&key=…` → POST `confirmDecline` | ROUTE-014 · AFFU-123 |
| Unavailable-invitation landing | rendered in place of accept/decline | AFFU-124..125 |
| Invitations API | `api/v1/invitations/…` | API-024 |
| Invitation email | mailable key `USER_ROLE_ASSIGNMENT_INVITATION` | MAIL-055 |
| Site config | `[invitations] expiration_days` | SET-064 |
| Cleanup | daily scheduled task + queued job | JOB-051 · JOB-013 |

## Reference — code anchors

- `lib/pkp/classes/invitation/core/Invitation.php` — lifecycle, key, expiry
- `lib/pkp/classes/invitation/invitations/userRoleAssignment/UserRoleAssignmentInvite.php` (+ `payload/`, `rules/`, `handlers/`)
- `lib/pkp/pages/invitation/InvitationHandler.php` · `InitializeInvitationUIHandler.php`
- `lib/pkp/api/v1/invitations/InvitationController.php`
- `lib/pkp/classes/invitation/models/InvitationModel.php` · `repositories/Repository.php`
- `lib/pkp/classes/invitation/stepTypes/SendInvitationStep.php` · `AcceptInvitationStep.php`
- `lib/pkp/classes/mail/mailables/UserRoleAssignmentInvitationNotify.php`
- `lib/pkp/jobs/invitations/RemoveExpiredInvitationsJob.php` · `lib/pkp/classes/task/RemoveExpiredInvitations.php`
- UI library: `src/managers/UserInvitationManager/` · `src/pages/userInvitation/` · `src/pages/acceptInvitation/`
- App divergence: `ops-main/classes/mail/Repository.php` (map override)
