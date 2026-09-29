---
name: notify-users
status: verified
---

# Notify users (bulk email)

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Now and then a journal's managers need to write to everyone who holds a
role: every reviewer before a holiday closure, every author about a new
policy. The "Notify" tab of Settings › Users & Roles does that: the
manager ticks one or more roles, types a subject and a message, confirms
the number of people it will reach, and the journal emails each of them
separately from its principal contact. Because a mass email to hundreds
of people can be misused, the Site Administrator decides which journals
may send one at all (Administration › Site Settings › "Bulk Emails") and,
for each journal, which roles are off limits to it (the journal's
Settings Wizard, "Restrict Bulk Emails"). This spec covers the "Notify"
tab, the email it sends and the per-role restriction; the site's "Bulk
Emails" list itself belongs to *Site settings*.

## Actors & permissions

The "Notify" tab sits on the Users & Roles page, and who opens that page
is the Settings gate that
[Users management](U53-users-management.md) describes in its Actors
section (the journal's manager-level roles while their role has "Permit
changes to Settings" ticked, and the Site Administrator). Below, "a
manager" is anyone who opens that page. The tab is there only while the
Site Administrator allows the journal bulk email (Settings bullet 1).
<sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Notify" tab** | • every manager, while the journal is ticked under "Bulk Emails" (Rule 1) <sup>a</sup><br>• every other role: no Users & Roles page at all (see *Users management*) |
| **Send an email to chosen roles** | • every manager, the Site Administrator included, to the roles the tab offers (Rules 3–8) <sup>b</sup> |
| **Choose the roles a journal may not email ("Restrict Bulk Emails")** | • the Site Administrator alone, in the journal's Settings Wizard (Rules 11–13); the journal's own Settings pages do not offer it to a manager <sup>h</sup> |
| **Allow a journal bulk email ("Bulk Emails")** | • the Site Administrator alone, on Administration › Site Settings (see *Site settings*) <sup>m</sup> |

## Fields & validation

**The "Notify" tab** (Settings › Users & Roles › "Notify"), top to bottom:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Roles", described "Select the users who should receive your email notification." | yes, refused when none is ticked | A box per role the journal may email (Rule 3), under the name the "Roles" tab gives it; none ticked when the tab opens. Missing: "You must indicate the user roles that should receive this email." under the boxes (Rule 7) <sup>b</sup> |
| "Subject" | yes | A one-line box, empty when the tab opens. Missing: "You must provide a subject for the email." (Rule 7) <sup>b</sup> |
| "Email" | yes | A large text box with the icon buttons Bold, Italic, Superscript, Subscript and Insert/edit link, empty when the tab opens. Missing: "You must include an email to be sent." (Rule 7) <sup>b</sup> |
| "Copy": one box, "Send a copy of this email to me at {email}." | no | Unticked when the tab opens; {email} is the signed-in manager's own address (Side effects) <sup>b</sup> |

No label on the tab carries the required-field mark, although the first
three fields are refused when empty ⚠ [A2](#a2). The button under the
form reads "Save" ⚠ [A1](#a1).

**"Restrict Bulk Emails"** (Administration › Hosted Journals › the
journal's "Settings wizard" › "Journal Settings" ("Setup" on a press,
"Server Settings" on a preprint server) › "Restrict Bulk Emails"), while
the journal is ticked under "Bulk Emails":

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Disable Roles", described "A journal manager will be unable to send bulk emails to any of the roles selected below. Use this setting to limit abuse of the email notification feature. For example, it may be safer to disable bulk emails to readers, authors, or other large user groups that have not consented to receive such emails." and "The bulk email feature can be disabled completely for this journal in Admin > Site Settings." On a press the description opens "A press manager will be unable…" and says "…for this press in Admin > Site Settings."; on a preprint server, "A server manager will be unable…" and "…for this server in Admin > Site Settings." | no | A box per role of the journal, the roles it created included, in no fixed order (it need not match the "Roles" tab's); none ticked on a new journal. A ticked role is off limits to the "Notify" tab (Rule 12). Saved with the "Save" under it, which shows "Saved" beside it <sup>h</sup> |

## Rules & state

**The "Notify" tab**

1. **Where it lives.** While the journal is ticked under "Bulk Emails"
   (Settings bullet 1), Settings › Users & Roles has the tab "Notify"
   between "Roles" and "Site Access Options"; otherwise there is no such
   tab. A bookmarked link to the tab opens the page on "Notify", or on
   "Users" where the tab is missing. The tab holds the form of the Fields
   table and nothing else until an email is sent. <sup>a</sup>
2. **One email, many roles.** The manager may tick any number of the
   offered roles; the email goes to the people who hold at least one of
   them (Side effects). <sup>b</sup>
3. **Which roles are offered.** Every role of the journal, the installed
   ones and any the journal created on the "Roles" tab, except the roles
   the Site Administrator ticked under "Disable Roles" (Rule 12). A role
   nobody holds is offered like any other. Nothing on the tab says that
   some roles are withheld. <sup>b</sup>
4. **The confirmation.** "Save" always opens a window titled "Send
   Email" that reads "You are about to send an email to {total} users.
   Are you sure you want to send this email?", with the buttons "Send
   Email" and "Cancel". The word stays "users" for a total of one ("1
   users"). Nothing on the form is checked before the window opens: with
   no role ticked and nothing typed it reads "0 users" ⚠ [A2](#a2).
   <sup>c</sup>
5. **How the total is counted.** For each ticked role the window counts
   that role's current members in this journal: accounts that are not
   disabled, whose role has started and has not ended. The counts of the
   ticked roles are added up, so a person who holds two ticked roles
   counts twice although they get one email, and the manager's own copy
   ("Copy", Side effects) is not counted ⚠ [A3](#a3). <sup>c</sup>
6. **What the form keeps.** "Cancel" closes the window; nothing is sent,
   and the form keeps what was ticked and typed. Moving to another tab of
   the page and back keeps them too. Leaving the page asks nothing, and
   the form is empty when the tab is opened again. <sup>c</sup>
7. **Refused sends.** "Send Email" with a field left empty closes the
   window and sends nothing. A notice "The form was not saved because
   {n} error(s) were encountered. Please correct these errors and try
   again." shows at the top right and closes itself after about five
   seconds. What stays: each empty field's message from the Fields
   table, and beside "Save" the line "Please correct {n} errors."
   ("Please correct one error." for one) with the link "Jump to next
   error". "Save" is greyed out until every field with a message has
   been changed. <sup>d</sup>
8. **Sent.** Once the send is accepted, the form gives way to a line with
   a tick: "Emails are successfully queued to be sent at the earliest
   convenience." followed by "Send another email", drawn as a link. The
   line stays while the page is open, other tabs visited included. "Send
   another email" reloads the page, which opens on the "Notify" tab with
   an empty form. <sup>e</sup>
9. **A send that reaches nobody.** When the ticked roles have no current
   member and "Copy" is unticked, the window reads "0 users" and "Send
   Email" is accepted, but no "queued" line appears: the form stays as
   typed with "Saved" beside its button for a few seconds, and no email
   is sent ⚠ [A4](#a4). <sup>f</sup>
10. **A page opened before a change.** The tab does not refresh itself
    when the Site Administrator changes the settings. In both cases below
    nothing is sent.
    - **A role restricted after the manager opened the page** is still
      offered. A send to it is refused the way a send with an empty field
      is (Rule 7), the one error being "You are not allowed to send an
      email to users in one or more of the selected roles." under
      "Roles"; "Save" is greyed out until "Roles" changes.
    - **A journal unticked under "Bulk Emails" after the page was opened**
      still shows the tab until the page is reloaded. Its send is refused
      only by a notice at the top right that closes itself after about five
      seconds: "The email notification feature has not been enabled for
      this journal." ("…for this press.", "…for this server." on OMP and
      OPS). The form then looks as it did before the send, with the text
      still typed and "Save" pressable. <sup>g</sup>

**The per-role restriction**

11. **Where it lives.** The Site Administrator opens Administration ›
    Hosted Journals, presses the arrow on the journal's row and chooses
    "Settings wizard"; its first tab, "Journal Settings", has the side
    tab "Restrict Bulk Emails" whether or not the journal may send bulk
    email. While the journal is ticked under "Bulk Emails" the side tab
    holds "Disable Roles" (Fields) and "Save". While it is not, it holds
    only the sentence "The bulk email feature has been disabled for this
    journal. Enable this feature in Admin > Site Settings." ("…for this
    press." on OMP, "…for this server." on OPS), and both
    "Admin > Site Settings" links, this one and the one in the
    "Disable Roles" description, open Administration › Site Settings on
    its "Bulk Emails" tab. <sup>h</sup>
12. **What a ticked role changes.** A role ticked under "Disable Roles"
    and saved is missing from the "Notify" tab's "Roles" the next time
    the tab is opened; unticked and saved, it is offered again. Only
    "Save" keeps a change: an unsaved tick stays while another of the
    wizard's side tabs is open, and is dropped without a question when
    the page is reloaded or left. The restriction changes nothing else:
    the role, its members and every other email the journal sends are
    untouched. <sup>i</sup>
13. **Kept while bulk email is off.** Unticking the journal under "Bulk
    Emails" leaves its "Disable Roles" choice stored: ticked again, the
    journal's "Notify" tab withholds the same roles as before. <sup>j</sup>

## Side effects

- **One email per recipient.** When the queued emails go out, each
  current member of a ticked role (the people Rule 5 counts, in this
  journal) gets one email addressed to them alone, however many of the
  ticked roles they hold; no recipient sees the others' addresses. With
  "Copy" ticked the sending manager gets one more, or none extra when
  they are already a recipient. <sup>k</sup>
- **Who is a recipient is decided when the email goes out,** not when
  "Send Email" is pressed: a member disabled, or whose role ended, in
  between gets nothing, and the address used is the one the account has
  then. <sup>k</sup>
- **The email.** From: the journal's principal contact (the name and
  address of Settings › Journal › "Contact"). Subject and text are
  exactly what the manager typed, the same for every recipient: no
  greeting or name is added, a placeholder such as {$recipientName}
  typed into the text arrives as typed, and no signature, footer or
  unsubscribe line is appended. <sup>l</sup>
- **Queued, not immediate.** The emails are sent by the site's background
  jobs, in groups of up to 50 recipients, whenever those jobs next run;
  the "queued" line of Rule 8 is the only confirmation the manager gets.
  On a test install the jobs run only when the test tooling runs them.
  <sup>k</sup>
- **Recipients' email preferences do not apply.** The email is not a
  notification, so a recipient's choices on their Profile's
  "Notifications" tab do not stop it (see
  [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)).
  <sup>l</sup>
- **The restriction** (Rules 11–12) sends nothing and changes no role.
  <sup>h</sup>

## Settings that modify behavior

1. **"Bulk Emails"** (Administration › Site Settings › "Site Setup" ›
   "Bulk Emails", a box per hosted journal; the form is *Site settings*';
   by default no journal is ticked). Unticked: the journal's Users &
   Roles page has no "Notify" tab (Rule 1), its "Restrict Bulk Emails"
   side tab holds only the sentence of Rule 11, and a send from a page
   opened while it was ticked is refused (Rule 10). Ticked: the "Notify"
   tab and the "Disable Roles" form are there. <sup>m</sup>
2. **"Disable Roles"** (the journal's Settings Wizard › "Journal
   Settings" › "Restrict Bulk Emails"; by default no role is ticked).
   A ticked role is not offered on the "Notify" tab (Rules 3, 12), and a
   send to it from a page opened earlier is refused (Rule 10); unticked,
   the role is offered. <sup>h</sup>

## Cross-feature interactions

- **[Users management](U53-users-management.md)**: the Users & Roles
  page, its other tabs, who opens it, and its own pointer to the
  "Notify" tab (its Settings bullet 1).
- **[Roles configuration](U54-roles-configuration.md)**: the roles the
  "Notify" tab and "Disable Roles" list, their names, and the roles a
  journal creates, which both lists offer at once (Rule 3).
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md)**:
  the Settings gate, and the principal contact the email is sent from
  (Side effects).
- **[Appearance & theming](U10-appearance-and-theming.md)** and *Hosted
  journals (site admin)* (spec not yet written): the Settings Wizard,
  how it is reached and its other side tabs; the "Restrict Bulk Emails"
  side tab is this spec's (Rules 11–13).
- **Site settings** (spec not yet written): Administration › Site
  Settings and its "Bulk Emails" list (Settings bullet 1).
- **[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)**:
  the email preferences that do not apply here (Side effects).

## Canonical scenarios

Every scenario runs on its own scratch journal with throwaway accounts,
signed in as a throwaway Journal Manager unless it names another role,
with other accounts in a second browser; the site allows the journal
bulk email unless the scenario says otherwise. The accounts, passwords,
tooling recipe, mail catcher's address and background-jobs command are in
the footnote. <sup>s</sup>

1. **Send an email to one role, then to two with a copy**

   Given: Journal Manager, on a scratch journal with the Authors Quinn
   Ashdown, Nova Reyes, whose account is disabled, and Lena Ortiz, who is
   also a Reader, the Reader Rui Tanaka, and Kai Moreno, whose Author role
   has ended.

   - **The tab**: open Settings › Users & Roles: the tab "Notify" sits
     between "Roles" and "Site Access Options". Open it: "Roles",
     described "Select the users who should receive your email
     notification.", with a box per role and none ticked; "Subject",
     empty; "Email", a large text box with the icon buttons Bold, Italic,
     Superscript, Subscript and Insert/edit link, empty; "Copy", one unticked box
     reading "Send a copy of this email to me at {email}." with the
     Journal Manager's own address (Rule 1; Fields, the "Notify" tab).
   - **One role**: tick "Author", type Office closed in "Subject" and
     Dear {$recipientName}, the office is closed. in "Email", and press
     "Save" ⚠ [A1](#a1): a window titled "Send Email" reads "You are about
     to send an email to 2 users. Are you sure you want to send this
     email?", with the buttons "Send Email" and "Cancel"; Quinn and Lena
     are counted, Nova's disabled account and Kai's ended role are not
     (Rules 4, 5).
   - **Queued**: press "Send Email": the form gives way to a line with a
     tick, "Emails are successfully queued to be sent at the earliest
     convenience.", followed by "Send another email", drawn as a link
     (Rule 8).
   - **The emails**: once the site's background jobs have run, Quinn and
     Lena each have one email "Office closed", addressed to them alone.
     It comes from the name and address Settings › Journal › "Contact"
     shows for the principal contact, and its text reads "Dear
     {$recipientName}, the office is closed." as typed, with nothing
     after it. Nova and Kai have none (Side effects).
   - **"Send another email"**: press it: the page reloads and opens on
     the "Notify" tab with no box ticked and "Subject" and "Email" empty
     (Rule 8).
   - **Two roles and a copy**: tick "Author", "Reader" and "Copy", type
     Library hours in "Subject" and The library opens at nine. in
     "Email", press "Save", then "Send Email" in the window ⚠ [A3](#a3):
     the "queued" line shows (Rules 2, 8).
   - **The emails again**: once the background jobs have run, Quinn, Lena
     and Rui each have exactly one email "Library hours", Lena one
     although she holds both roles, and the Journal Manager has one
     copy. Nova and Kai have none (Side effects).
   - **Control**: Rui and the Journal Manager have no email "Office
     closed": Rui holds no role the first send ticked, and "Copy" was
     unticked (Side effects). <sup>s</sup>

2. **The roles offered, and a form refused, cancelled and left**

   Given: Journal Manager, on a scratch journal with two roles made with
   "Create New Role": "Data curator", held by Quinn Ashdown alone, and
   "Spare desk", held by nobody.

   - **The roles offered**: open Settings › Users & Roles › "Notify":
     "Roles" has a box for every role the "Roles" tab lists, under the
     same name, "Data curator" and "Spare desk" included, and none ticked
     (Rule 3; Fields, the "Notify" tab).
   - **Nothing filled in**: press "Save", then "Send Email" in the window
     that opens ⚠ [A2](#a2): the window closes. A notice at the top right
     reads "The form was not saved because 3 error(s) were encountered.
     Please correct these errors and try again." and closes itself after
     about five seconds. Under the boxes stays "You must indicate the
     user roles that should receive this email.", under "Subject" "You
     must provide a subject for the email.", under "Email" "You must
     include an email to be sent.", and beside "Save" "Please correct 3
     errors." with the link "Jump to next error". "Save" is greyed out
     (Rule 7; Fields).
   - **Filled in one by one**: type Board meeting in "Subject": "Save" is
     still greyed out. Type The board meets on Monday. in "Email": still
     greyed out. Tick "Data curator": "Save" can be pressed (Rule 7).
   - **One member**: press "Save": the window reads "You are about to
     send an email to 1 users. Are you sure you want to send this
     email?" (Rule 4).
   - **Cancelled**: press "Cancel": the window closes, and the form still
     has "Data curator" ticked, "Board meeting" in "Subject" and the text
     in "Email" (Rule 6).
   - **Another tab and back**: open the "Roles" tab, then "Notify" again:
     the form is as typed (Rule 6).
   - **The page left**: open Settings › Journal: nothing asks before the
     page changes. Open Settings › Users & Roles › "Notify" again: no box
     is ticked and "Subject" and "Email" are empty (Rule 6).
   - **Control**: once the site's background jobs have run, Quinn has no
     email "Board meeting": nothing was sent (Rule 6). <sup>s</sup>

3. **The Site Administrator takes a role off the "Notify" tab**

   Given: Site Administrator, on a scratch journal with the Author Quinn
   Ashdown, and its Journal Manager in a second browser.

   - **The side tab**: open Administration › Hosted Journals, press the
     arrow on the journal's row and choose "Settings wizard". Its first
     tab, "Journal Settings" ("Setup" on a press, "Server Settings" on a
     preprint server), has the side tab "Restrict Bulk Emails". Open it:
     "Disable Roles", described "A journal manager will be unable to send
     bulk emails to any of the roles selected below. …" ("A press manager
     will be unable…", "A server manager will be unable…"), has a box for
     every role the "Roles" tab lists, under the same name, none ticked,
     and "Save" under them (Rule 11; Fields, "Restrict Bulk Emails").
   - **"Author" ticked**: tick "Author" and press "Save": "Saved" shows
     beside it. Reload the page and open "Restrict Bulk Emails" again:
     "Author" is ticked (Rule 12).
   - **The Journal Manager**: opens Settings › Users & Roles › "Notify":
     "Roles" has no "Author" box and still offers "Reader" and every other
     role, and nothing on the tab says a role is withheld. The "Roles"
     tab still lists "Author" (Rules 3, 12).
   - **The manager's Settings pages**: none of the pages under the
     Journal Manager's Settings menu carries "Restrict Bulk Emails" or
     "Disable Roles" (Actors row 3).
   - **The description's link**: the Site Administrator presses "Admin >
     Site Settings" in the "Disable Roles" description: Administration ›
     Site Settings opens on its "Bulk Emails" tab (Rule 11).
   - **Control**: the Site Administrator opens "Restrict Bulk Emails"
     again, unticks "Author" and presses "Save": "Saved". The Journal
     Manager reloads the page and opens "Notify": "Author" is offered
     again (Rule 12). <sup>s</sup>

4. **A role restricted while the manager's page is open**

   Given: Journal Manager, on a scratch journal with the Author Quinn
   Ashdown, the "Notify" tab open, and the Site Administrator in a second
   browser.

   - **The form filled**: tick "Author", type Office closed in "Subject"
     and The office is closed on Friday. in "Email".
   - **The Site Administrator**: opens the journal's "Settings wizard"
     from Administration › Hosted Journals, its "Restrict Bulk Emails"
     side tab, ticks "Author" under "Disable Roles" and presses "Save":
     "Saved" shows beside it (Rules 11, 12).
   - **The send refused**: on the manager's page "Author" is still
     offered and ticked. Press "Save", then "Send Email" in the window:
     the window closes. A notice at the top right reads "The form was not
     saved because 1 error(s) were encountered. Please correct these
     errors and try again." and closes itself after about five seconds.
     Under "Roles" stays "You are not allowed to send an email to users
     in one or more of the selected roles.", beside "Save" "Please
     correct one error." with "Jump to next error", and "Save" is greyed
     out (Rules 7, 10).
   - **"Roles" changed**: untick "Author": "Save" can be pressed (Rule
     10).
   - **Control**: reload the page and open "Notify": "Roles" has no
     "Author" box (Rule 12). Once the site's background jobs have run,
     Quinn has no email "Office closed" (Rule 10). <sup>s</sup>

5. **Bulk email withdrawn while the manager's page is open**

   Given: Journal Manager, on a scratch journal with the Author Quinn
   Ashdown, and the Site Administrator in a second browser.

   - **The bookmark**: open Settings › Users & Roles › "Notify" and
     bookmark the page. Open the bookmark: the page opens on "Notify"
     (Rule 1).
   - **The form filled**: tick "Author", type Office closed in "Subject"
     and The office is closed on Friday. in "Email".
   - **The Site Administrator**: opens Administration › Site Settings ›
     "Site Setup" › "Bulk Emails", unticks the journal's box and presses
     "Save" (Settings bullet 1).
   - **The send refused**: the manager's page still has the "Notify" tab.
     Press "Save", then "Send Email" in the window: a notice at the top
     right reads "The email notification feature has not been enabled
     for this journal." ("…for this press.", "…for this server.") and
     closes itself after about five seconds. The form still has "Author"
     ticked and the text typed, and "Save" can be pressed (Rule 10).
   - **Reloaded**: reload the page: its tabs have no "Notify". Open the
     bookmark: the page opens on "Users" (Rules 1, 10).
   - **"Restrict Bulk Emails" on a journal not allowed**: the Site
     Administrator opens the journal's "Settings wizard" from
     Administration › Hosted Journals and its "Restrict Bulk Emails" side
     tab: it holds only "The bulk email feature has been disabled for
     this journal. Enable this feature in Admin > Site Settings."
     ("…for this press.", "…for this server."), with no "Disable Roles"
     and no "Save". Its "Admin > Site Settings" link opens Administration
     › Site Settings on the "Bulk Emails" tab (Rule 11).
   - **Control**: once the site's background jobs have run, Quinn has no
     email "Office closed": nothing was sent (Rule 10). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - a member disabled, or whose role ended, after "Send Email" and before
    the background jobs run, getting nothing, and an address changed in
    between being the one used (Side effects bullet 2)
  - the "Disable Roles" choice kept while the journal is unticked under
    "Bulk Emails" and ticked again (Rule 13)
  - no email arriving until the site's background jobs run (Side effects
    bullet 4)
  - an unsaved tick under "Disable Roles" kept across the wizard's side
    tabs and dropped without a question on a reload (Rule 12)
  - the Editor and the Production Editor whose roles have "Permit changes
    to Settings" ticked, offered the same tab and send as the Journal
    Manager of scenario 1 (Actors row 2)
  - the Site Administrator sending from the tab, as the Journal Manager
    of scenario 1 does (Actors row 2)
- **Register carries it**:
  - A1 (the button that sends reads "Save"; Fields; scenario 1 passes it)
  - A2 (no required mark, and the window opening on "0 users" before any
    check; Rule 4; Fields; scenario 2 passes it)
  - A3 (a person in two ticked roles counted twice, the copy not counted;
    Rule 5; scenario 1 passes it)
  - A4 (a send to roles with no current member: no "queued" line and no
    email; Rule 9)
- **No seed**:
  - a member whose role starts after today, left out of the total (Rule
    5; a start date no screen makes)
- **Owned by another feature**:
  - every role without the Users & Roles page, and so without the tab
    (Actors row 1; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - a journal the site does not allow bulk email: no "Notify" tab (Rule
    1; Settings bullet 1; *[Users management](U53-users-management.md)*,
    scenario 1)
  - the Settings Wizard refused to the Journal Manager at its address
    (Actors row 3; *Hosted journals (site admin)*, spec not yet written)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The button that sends the email reads "Save" | 🐞 | minor | — |
| [A2](#a2) | No field is marked required, and the confirmation opens on "0 users" before anything is checked | 🐞 | minor | — |
| [A3](#a3) | The confirmation's total counts a person once per ticked role and leaves out the manager's copy | 🐞 | minor | — |
| [A4](#a4) | A send to roles with no member is accepted with "Saved" and no word that nothing was sent | 🐞 | minor | — |

### All apps

<a id="a1"></a>
**A1 — The send button reads "Save"** · 🐞 · minor.
The button under the "Notify" form reads "Save", the label every
settings form uses, although it sends an email to whole roles; only the
window that follows names the action ("Send Email"). A manager expects
the button to say what it does.
Since: 2020-11-25 (the tab's first version) · Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — No required mark, and the confirmation comes before any check** · 🐞 · minor.
"Roles", "Subject" and "Email" are all refused when empty, but none
carries the required-field mark, and "Save" opens the confirmation
window first: with nothing filled in it asks to send "an email to 0
users", and the missing fields are named only after "Send Email". The
manager expects the required fields marked and an empty form refused
before being asked to confirm a send.
Since: 2020-11-25 (the tab's first version) · Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The total counts a person once per ticked role** · 🐞 · minor.
With two roles ticked, a person who holds both is counted twice in "You
are about to send an email to {total} users", although they receive one
email; with "Copy" ticked, the manager's own copy is not counted. The
manager expects the number of people who will receive the email.
Since: 2020-11-25 (the tab's first version) · Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A send that reaches nobody is accepted silently** · 🐞 · minor.
When every ticked role has no current member and "Copy" is unticked,
"Send Email" is accepted, the form stays filled in with "Saved" beside
the button, and no email is sent; the "queued" line of an ordinary send
does not appear. The manager expects to be told that nobody would
receive the email, or the send refused.
Since: 2023-03-22 (sends became queued) · Basis: probe. <sup>f-a4</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts' tips (ojs `71bb244152`, omp
`187f0f40d`, ops `61cd158ce3`, one lib/pkp `76a315591b` and ui-library
`03d1cee2` in all three, which carries pkp-lib `6a902ad50a`, #13184, the
active-member count of Rule 5). Everything this spec describes is
lib/pkp's and the ui-library's alone: `access.tpl`,
`ManagementHandler::access()`, `PKPNotifyUsersForm`,
`PKPRestrictBulkEmailsForm`, `PKPSiteBulkEmailsForm`,
`AdminHandler::wizard()`, `admin/contextSettings.tpl`,
`api/v1/_email/PKPEmailController`, `jobs/bulk/BulkEmailSender`,
`NotifyUsersForm.vue` and `AccessPage.vue` are byte-identical in the
three checkouts, no app subclasses or overrides any of them (each app's
`pages/management/SettingsHandler` extends `ManagementHandler` without an
`access()` of its own; each app's `api/v1/_email/index.php` wraps the
lib/pkp controller unchanged), so every shared claim rests on one code
path (RUNBOOK rule 8). The apps differ only in their installed roles and
in the locale strings that name the context (the "Disable Roles"
description, the disabled-feature sentence and the refusal notice say
journal, press or server). Every claim was driven on 2026-09-26 on all
three apps, on scratch contexts; each note below says what was seen.

<a id="fn-a"></a>
**a** — Live-probed 2026-09-26 (Actors rows 1–2; Rule 1), all three
apps, scratch contexts: on a ticked journal the tabs read "Users",
"Roles", "Notify", "Site Access Options", "ORCID" for the Journal Manager,
the Editor (OJS, OMP; a preprint server has none) and the Site
Administrator, and the address ending `#notify` opened on "Notify". A
manager-level role with "Permit changes to Settings" unticked, a Section
Editor, an Assistant, a Reviewer (OJS, OMP), an Author and a Reader each
got "The current role does not have access to this operation." at
`…/management/settings/access` and at its `#notify` address. On an
unticked journal the tabs lacked "Notify" and `#notify` opened on
"Users". Code:
`templates/management/access.tpl` wraps `<tab id="notify">`
(`manager.setup.notifyUsers` "Notify") in `{if $enableBulkEmails}`;
`ManagementHandler::access()` sets it from
`in_array($context->getId(), $site->getData('enableBulkEmails'))` and
builds `PKPNotifyUsersForm` only then. The page's gate
(`CanAccessSettingsPolicy`) is *Users management*'s note a; the unticked
end was driven there (its note t, 2026-09-25).

<a id="fn-b"></a>
**b** — Live-probed 2026-09-26 (Fields, the "Notify" tab; Rules 2, 3;
Actors row 2), all three apps: on a scratch journal with two created
roles ("Nobody role", held by nobody, and "Custom manager") the tab read
"Roles", "Subject", "Email", "Copy" and "Save", with no required mark (no
mark on any label, and neither `required` nor `aria-required` on
"Subject"); "Roles" offered one box per role (on that run in the "Roles" tab's
order; the list has no fixed order, note h), the created ones included (OJS 20, OMP 21, OPS 7), none ticked; the
text box's buttons are named "Bold", "Italic", "Superscript",
"Subscript" and "Insert/edit link" (it opens an "Insert/Edit Link"
window), and the OJS test run of 2026-09-26 read the same five names; "Copy" showed the signed-in account's own address. On a journal
with "Reader" and "Nobody role" under "Disable Roles" the boxes were the
rest (OJS 17, OMP 18, OPS 4), with no word about the missing ones. Sends
from the Journal Manager, the Editor (OJS, OMP) and the Site
Administrator were each accepted and their emails arrived. With
"Author" and "Reader" ticked, the one queued job carried three
accounts, and the member holding both got one email. Code: `PKPNotifyUsersForm::__construct()` lists
`UserGroup::withContextIds($contextId)`, unsorted, minus the context's
`disableBulkEmailUserGroups`; fields `userGroupIds` (`FieldOptions`,
`user.roles` "Roles", `manager.setup.notifyUsers.description`), `subject`
(`FieldText`, `email.subject` "Subject"), `body` (`FieldRichTextarea`,
`email.email` "Email", size large, the default toolbar `bold italic
superscript subscript | link`), `copy` (`FieldOptions`, `common.copy`
"Copy", one option `manager.setup.notifyUsers.copyDetails` "Send a copy
of this email to me at {$email}." with the signed-in user's
`getEmail()`). The three fields pass `'required' => true`, a key
`Field::__construct()` ignores (it sets only declared properties, and the
property is `isRequired`), so the fields reach the page unmarked and the
form's own required check skips them (A2). The page's submit button is
`FormComponent`'s default page, `common.save` "Save" (A1). The API is
`PKPEmailController`, authorized for `ROLE_ID_SITE_ADMIN` and
`ROLE_ID_MANAGER`. No locale key of the tab is overridden by an app.

<a id="fn-c"></a>
**c** — Live-probed 2026-09-26 (Rules 4–6; A3), all three apps, on a
scratch journal with Authors A (active), B (disabled), C (Author role
ended) and D (Author and Reader), and one Reader: "Save" on the untouched
form opened "Send Email" reading "…to 0 users…" with "Send Email" and
"Cancel"; the totals read "Author" 2 (A and D), "Author" + "Reader" 4 (D
counted twice; three emails went out), the same 4 with "Copy" ticked,
the manager role 2 (the Site Administrator and the manager), "Custom
manager" "1 users", "Nobody role" 0. "Cancel" kept "Author", "Reader",
"Copy", the subject and the text, and after the queued jobs ran nobody
had an email with that subject. A round of the page's other tabs kept
the ticks and text; leaving the page raised no question, and the tab
opened empty on the way back. A role that starts in the future cannot be
made on any screen, so that end of Rule 5 rests on the code below.
Code: `NotifyUsersForm.vue::nextPage()` (overriding the
form's submit path) sums `userGroupCounts[id]` over the ticked ids and
opens the dialog `confirmNotify` (title `manager.setup.notifyUsers.send`
"Send Email", message `manager.setup.notifyUsers.confirm` with
`{$total}`, actions "Send Email" → `submit()` and `common.cancel`).
`userGroupCounts` comes from `UserGroup::withActiveUserCount()`:
`users.disabled = 0`, `date_start` null or past, `date_end` null or
future, grouped per role.

<a id="fn-d"></a>
**d** — Live-probed 2026-09-26 (Rule 7; Fields), all three apps: "Send
Email" on an empty form was refused (400). The notice "The form was not
saved because 3 error(s) were encountered. …" showed at the top right
and was gone after about five seconds; each field showed its message;
beside "Save" stayed "Please correct 3 errors." and "Jump to next error"
("Please correct one error." with one field missing). "Save" stayed
greyed after "Subject" alone was filled and after "Subject" and "Email",
and came back once a role was ticked. Code:
`PKPEmailController::create()` answers 400 with `body`
(`api.emails.400.missingBody`), `subject` (`…missingSubject`) and
`userGroupIds` (`…missingUserGroups`); `Form.vue::error()` shows
`form.errors` for a 400 and sets the field errors; `FormPage.vue`
disables the submit button while the last page has errors, and a
changed field drops its own error.

<a id="fn-e"></a>
**e** — Live-probed 2026-09-26 (Rule 8), all three apps: an accepted
send swapped the form for the tick (drawn in the text's colour) and the
"queued" line with "Send another email", a button styled as a link; the
line survived a round of the other tabs; "Send another email" reloaded
the page onto "Notify" with an empty form, as did a browser reload.
Code: `create()` answers `{totalBulkJobs: count($batches)}`;
`AccessPage.vue` listens for `form-success` of `FORM_NOTIFY_USERS` and
sets `totalBulkJobs`, which swaps the form for the `v-if="totalBulkJobs"`
block (`manager.setup.notifyUsers.queued`, `Complete` icon, button
`manager.setup.notifyUsers.sendAnother` → `window.location.reload()`);
the tabs keep their place in the address (`track-history`).

<a id="fn-f"></a>
**f** — Live-probed 2026-09-26 (Rule 9; A4), all three apps: with only
"Nobody role" ticked the window read "0 users"; "Send Email" was
accepted (200, `totalBulkJobs: 0`), "Saved" showed beside "Save" at once
and was gone at 6.5 s, the form stayed as typed, no "queued" line
appeared, no job was queued and no email was sent. With "Copy" ticked
too, the window still read "0 users", the "queued" line appeared and the
manager alone got the email. Code: with no recipient `array_chunk()` yields no batch,
`Bus::batch([])` is dispatched empty and the answer is `totalBulkJobs:
0`; `AccessPage.vue` keeps the form (falsy `totalBulkJobs`), and
`Form.vue::success()` stamps `lastSaveTimestamp`, which shows
`form.saved` "Saved" for five seconds.

<a id="fn-g"></a>
**g** — Live-probed 2026-09-26 (Rule 10; Settings bullets 1, 2), all
three apps, with the manager's page open while the Site Administrator
changed the setting in a second browser. Restricted: "Author" stayed
offered; its send was refused (400) with the top-right notice "The form
was not saved because 1 error(s) were encountered. …", the message
under "Roles", "Please correct one error." beside "Save" and "Save"
greyed. Unticked: the send was refused (403) with only the top-right
notice, worded "journal", "press", "server" per app; once it closed the
form showed the text as typed and "Save" pressable; a reload removed the
tab. Nothing was queued in either case. Code: `create()` answers 400 `userGroupIds`
(`api.emails.403.notAllowedUserGroup`) for a role outside the context or
in `disableBulkEmailUserGroups`, and 403 `error`
(`api.emails.403.disabled`, the app's own wording: "journal", "press",
"server") when the context is not in `enableBulkEmails`;
`Form.vue::error()` shows a 403's `error` text as a notice.

<a id="fn-h"></a>
**h** — Live-probed 2026-09-26 (Rule 11; Fields, "Restrict Bulk
Emails"; Actors rows 3, 4), all three apps: the Hosted list's row arrow
offered "Edit", "Remove" and "Settings wizard", which opened
`index/admin/wizard/{id}`; the first top tab read "Journal Settings",
"Setup" (OMP) or "Server Settings" (OPS), its side tabs "Journal"
("Press", "Server"), "Appearance", "Languages", "Search Indexing",
"Restrict Bulk Emails" on a ticked and an unticked journal alike. Ticked:
"Disable Roles" with the description quoted per app, one box per role,
on that run in the "Roles" tab's order with a created role last (OJS
19, OMP 20, OPS 6), none ticked, no required mark; "Save" (a `PUT` sent as `POST` with
an override header) showed "Saved". Unticked: only the sentence, per
app, with no box and no button. Both "Admin > Site Settings" links
point to `index/admin/settings#setup/bulkEmails` and landed on Site
Settings › "Site Setup" › "Bulk Emails". The Journal Manager, and every
other level, got "The current role does not have access to this
operation." at the wizard's address (under `index/` and under the
journal's path) and at `index/admin/settings`; none of the manager's
Settings pages (Journal, Website, Workflow, Distribution, Users & Roles)
carries "Disable Roles", "Restrict Bulk Emails" or the field. Every
wizard landing also answered a server error on the hidden Plugin Gallery
list (`plugin-gallery-grid/fetch-grid`, 500, the test installs have no
outbound connection): the plugin gallery's failure, nothing on this
side tab. Code: `AdminHandler::wizard()` builds
`PKPRestrictBulkEmailsForm` from `UserGroup::withContextIds()->get()`
with no order (`FORM_RESTRICT_BULK_EMAILS`, `PUT
{journal}/api/v1/contexts/{id}`, field `disableBulkEmailUserGroups`,
`admin.settings.disableBulkEmailRoles.label` "Disable Roles", each app's
`admin.settings.disableBulkEmailRoles.description` with `siteSettingsUrl`
= `admin/settings#setup/bulkEmails`) only while the context is in
`enableBulkEmails`; `admin/contextSettings.tpl` tab `restrictBulkEmails`
(`admin.settings.restrictBulkEmails` "Restrict Bulk Emails") otherwise
prints each app's `admin.settings.disableBulkEmailRoles.contextDisabled`
with the same link. The wizard is `AdminHandler`'s, Site Administrator
only; its side tabs were read by *Appearance & theming* (its Rule 34).
`PKPContextService::validate()` refuses a non-empty
`disableBulkEmailUserGroups` from anyone but a Site Administrator
(`admin.settings.disableBulkEmailRoles.adminOnly`), and no Settings form
of the journal carries the field. Nothing in the save sends mail or
touches a role. Code read 2026-09-26 (Fields, "Restrict Bulk Emails"):
neither this list nor the "Roles" tab's (`UserGroupGridHandler::loadData()`,
`UserGroup::withContextIds()` paged with no order) is sorted, so the
database returns the roles in whatever order it holds them, which can
differ between the two lists and between visits; the two were never seen
to differ.

<a id="fn-i"></a>
**i** — Live-probed 2026-09-26 (Rule 12), all three apps: the Site
Administrator ticked "Author" and saved; it stayed ticked after a
reload; the manager's reopened "Notify" tab lacked "Author" and offered
every other role, the created one included; unticked and saved, "Author"
was offered again. While it was restricted the "Roles" tab still listed
"Author", a member's row in the users list still showed it, and an
"Email" from that row's menu reached the member. A box ticked and not
saved stayed ticked through a visit to the "Journal" ("Press", "Server")
side tab and was unticked after the "Users" tab and a reload, with no
question asked. Code: the form's option loop skips every id in
`disableBulkEmailUserGroups` (note b); the setting is read nowhere else
(`grep disableBulkEmailUserGroups` in lib/pkp and the three apps finds
the two forms, `PKPEmailController` and the context validator only).

<a id="fn-j"></a>
**j** — Live-probed 2026-09-26 (Rule 13; Settings bullet 1), all three
apps: on a journal seeded with "Author" under "Disable Roles", the Site
Administrator unticked it under "Bulk Emails" and saved (no "Notify"
tab; the side tab held only the sentence), then ticked it again and
saved: "Author" was still ticked and the "Notify" tab still withheld it.
Each save kept every other journal's tick. Code: the site
form stores only `enableBulkEmails`; the context's
`disableBulkEmailUserGroups` is not touched by it.

<a id="fn-k"></a>
**k** — Live-probed 2026-09-26 (Side effects bullets 1, 2, 4), all
three apps, on a scratch journal with Authors a1, a2 (also a Reader), a3
(disabled), a4 (Author role ended) and a5–a7, and Reader r1. "Author" and
"Reader" with "Copy" ticked: a1, a2, r1 and the manager each got exactly
one email, a3 and a4 none; each email's To was the recipient alone, with
no Cc, Bcc or Reply-To. A send to the manager role with "Copy" ticked
gave the manager one email. Right after "Send Email" the job was queued
and nobody had mail; it was still queued about 15 seconds later. In
that gap a5 was disabled ("Disable User"), a7 removed ("Remove User")
and a6's address changed by the Site Administrator: after the jobs ran
a5, a7 and a6's old address had nothing and the new address had one
email. 50 recipients: "50 users", one job, 50 emails; 51: "51 users",
two jobs, 51 emails. Afterwards the manager had only their own copies
and "Tasks" read "No Items". Code:
`PKPEmailController::create()` collects
`Repo::user()->getCollector()->filterByContextIds([$contextId])->filterByUserGroupIds($ids)->getIds()`
(the collector's defaults: account status active, role assignment
active, one row per user), appends the sender's id with `copy` when not
already present, splits the ids into `Mailer::BULK_EMAIL_SIZE_LIMIT`
(50) and dispatches one `BulkEmailSender` per chunk as a batch.
`BulkEmailSender::handle()` reloads the users with the same collector at
run time (so a user disabled or removed from the context in between is
skipped, and the current address is used) and sends one `Mailable` per
user, `to($user->getEmail(), $user->getFullName())`. The test install
runs no job runner (seed-facts "The task and job runners are off").

<a id="fn-l"></a>
**l** — Live-probed 2026-09-26 (Side effects bullets 3, 5), all three
apps, on the send of note k with the subject "Office closed" and the
text "Dear {$recipientName}, the office is closed.": From was the
journal's principal contact ("K2 Office A" and the address Settings ›
Journal › "Contact" shows), the subject as typed, the text as typed with
the placeholder unreplaced and nothing after it, the same for every
recipient. a1, who had unticked every box on Profile › "Notifications",
received it. Code: `BulkEmailSender` builds a bare
`PKP\mail\Mailable` with `from($context contactEmail, contactName)`,
`subject()` and `body()`; the base class has no variables and no footer
(`addFooter()` adds nothing), so `Mailer::compileParams()` replaces
nothing and nothing is appended. The mail is sent with `Mail::send()`
directly, not through the notification manager, so no notification
setting of the recipient is read. `force_dmarc_compliant_from` is off in
the config template, so the From is not rewritten.

<a id="fn-m"></a>
**m** — `PKPSiteBulkEmailsForm` (`FORM_SITE_BULK_EMAILS`,
`enableBulkEmails`, `admin.settings.enableBulkEmails.label` "Bulk
Emails", one box per hosted context, each app's
`admin.settings.enableBulkEmails.description`) on
`templates/admin/settings.tpl` tab `bulkEmails`, always available
(`AdminHandler::siteSettingsAvailability()`). The empty default is
seed-facts' ("Bulk Emails" has no journal ticked, 2026-09-25); both ends
were driven by *Users management* (its note t). Live-probed 2026-09-26
(Settings bullet 1), all three apps: one box per hosted context (as
many as the Hosted list's rows), the seeded journal and a scratch one
seeded without the setting unticked; the list's description ends by
pointing to each journal's settings wizard in the Hosted list. The form
is the *Site settings* feature's; this spec cites it only.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS, each
on its own scratch journal (press, preprint server) from `POST
scenarios/context` with `bulkEmails: true` (the journal ticked under
"Bulk Emails") and throwaway `users[]` (names from `givenName` and
`familyName`; usernames carry the scenario's tag; password the username
twice; email `<username>@mail.test`). The first entry, `roles:
['manager']`, is the Journal Manager (Press Manager, Preprint Server
Manager) every scenario signs in as or opens in the second browser. The
Site Administrator of scenarios 3 to 5 is `admin` (password `admin`),
whom the context factory also enrols as a manager of every scratch
context; no scenario ticks the manager role. Scenario 1: Quinn Ashdown
`author`, Nova Reyes `author` with `disabled: true`, Lena Ortiz `author`
and `reader`, Rui Tanaka `reader`, Kai Moreno `roles: []` with
`pastRoles: [{role: 'author'}]` (the role ended today). Scenario 2:
`customRoles: [{key: 'dataCurator', level: 'assistant', name: 'Data
curator', abbrev: 'DC'}, {key: 'spareDesk', level: 'assistant', name:
'Spare desk', abbrev: 'SD'}]`, Quinn Ashdown `dataCurator`. Scenarios 3
to 5: Quinn Ashdown `author`. Scenario 5 unticks the journal on Site
Settings › "Bulk Emails" by screen, as the Site Administrator. The key
`disableBulkEmailRoles` seeds roles ticked under "Disable Roles"; no
scenario here starts from it, scenarios 3 and 4 tick "Author" on the
screen. Mail is read in the mail catcher, Mailpit at
`http://127.0.0.1:8025` (`MAILPIT_URL`), scoped by recipient address,
after the test's own `runJobs()` drain ("once the site's background jobs
have run"; by hand: `php lib/pkp/tools/jobs.php run` from the
application's root, the command `runJobs()` wraps). Live-probed 2026-09-26,
all three apps: each key and account shape above showed on the screens
as described.

<a id="fn-f-a1"></a>
**f-a1** — `FormComponent::getConfig()` adds a default page with
`submitButton` `common.save` "Save" when a form declares none, and
`PKPNotifyUsersForm` declares none; `getConfig()` passes
`manager.setup.notifyUsers.send` "Send Email" only as the dialog's title
and button (`sendLabel`). Unchanged since the form arrived with
pkp/pkp-lib#4017 (lib/pkp `891eba202`, ui-library `eda42e56`,
2020-11-25). Live-probed 2026-09-26, all three apps: the only button
under the form reads "Save"; only the window says "Send Email".

<a id="fn-f-a2"></a>
**f-a2** — The ignored `'required' => true` of note b, present since
pkp/pkp-lib#4017 (2020-11-25), and `NotifyUsersForm.vue::nextPage()`,
which opens the dialog before `Form.vue::submit()` runs its
`validateRequired()`. The server's refusals are note d's. Live-probed
2026-09-26, all three apps: no required mark (note b), the window on
"0 users" for an empty form (note c), the fields named only after "Send
Email" (note d).

<a id="fn-f-a3"></a>
**f-a3** — `NotifyUsersForm.vue::nextPage()` adds the per-role counts of
note c, while the send collects distinct user ids (note k) and appends
the sender's own id only for `copy`. Since pkp/pkp-lib#4017
(2020-11-25); pkp-lib `6a902ad50a` (#13184, 2026-08-31) changed which
members each role's count includes, not the sum. Live-probed
2026-09-26, all three apps: "Author" + "Reader" read "4 users" for three
emails (note c); "Nobody role" with "Copy" read "0 users" for the
manager's one email (note f).

<a id="fn-f-a4"></a>
**f-a4** — Note f. Since pkp/pkp-lib#8734 (lib/pkp `59f33cb8d`,
2023-03-22), which moved sending to batched jobs and made
`totalBulkJobs` the page's only signal of success. Live-probed
2026-09-26, all three apps (note f).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The "Notify" tab: the form and its "Send Email" window | Settings › Users & Roles › "Notify" (`{journal}/management/settings/access#notify`; the page is *Users management*'s) | AFFM-114 |
| The "queued" line and "Send another email" | the same tab after a send | AFFM-115 |
| "Restrict Bulk Emails" › "Disable Roles" | Administration › Hosted Journals › "Settings wizard" › "Journal Settings" › "Restrict Bulk Emails" (`index/admin/wizard/{id}`; saved by `PUT {journal}/api/v1/contexts/{id}`) | AFFM-201 |
| The send | `POST {journal}/api/v1/_email` | API-002 |
| The queued sending | `PKP\jobs\bulk\BulkEmailSender` | JOB-002 |
| Site Settings › "Bulk Emails" (rider; the form is *Site settings*') | Administration › Site Settings › "Site Setup" › "Bulk Emails" (`index/admin/settings#setup/bulkEmails`) | AFFM-220 |

## Reference — code anchors

- **Page and tab**: `lib/pkp/pages/management/ManagementHandler.php`
  (`access()`); `lib/pkp/templates/management/access.tpl`;
  `lib/ui-library/src/components/Container/AccessPage.vue`.
- **Form**: `lib/pkp/classes/components/forms/context/PKPNotifyUsersForm.php`;
  `lib/ui-library/src/components/Form/context/NotifyUsersForm.vue`;
  `lib/ui-library/src/components/Form/Form.vue`, `FormPage.vue`;
  `lib/pkp/classes/components/forms/FormComponent.php`, `Field.php`.
- **Send**: `lib/pkp/api/v1/_email/PKPEmailController.php`; each app's
  `api/v1/_email/index.php`; `lib/pkp/jobs/bulk/BulkEmailSender.php`;
  `lib/pkp/classes/mail/Mailer.php` (`BULK_EMAIL_SIZE_LIMIT`),
  `Mailable.php`; `lib/pkp/classes/user/Collector.php`;
  `lib/pkp/classes/userGroup/UserGroup.php` (`scopeWithActiveUserCount()`).
- **Restriction**: `lib/pkp/classes/components/forms/context/PKPRestrictBulkEmailsForm.php`;
  `lib/pkp/pages/admin/AdminHandler.php` (`wizard()`,
  `siteSettingsAvailability()`); `lib/pkp/templates/admin/contextSettings.tpl`;
  `lib/pkp/classes/services/PKPContextService.php` (`validate()`);
  `lib/pkp/schemas/context.json` (`disableBulkEmailUserGroups`).
- **Site list (rider)**: `lib/pkp/classes/components/forms/site/PKPSiteBulkEmailsForm.php`;
  `lib/pkp/templates/admin/settings.tpl`; `lib/pkp/schemas/site.json`
  (`enableBulkEmails`).
- **Strings**: `lib/pkp/locale/en/manager.po` (`manager.setup.notifyUsers*`),
  `api.po` (`api.emails.400.*`, `api.emails.403.notAllowedUserGroup`),
  `admin.po` (`admin.settings.restrictBulkEmails`,
  `admin.settings.disableBulkEmailRoles.label`); each app's
  `locale/en/admin.po` (`admin.settings.enableBulkEmails.description`,
  `admin.settings.disableBulkEmailRoles.description`,
  `…contextDisabled`) and `locale/en/api.po` (`api.emails.403.disabled`).
