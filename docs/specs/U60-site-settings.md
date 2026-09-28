---
name: site-settings
status: verified
---

# Site settings

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

One installation hosts many journals, and a few things belong to none of
them: the name of the site as a whole, the password and sign-in rules
every account lives under, the text and the contact the site's own pages
and emails carry, which journals may email all their users at once, and
how the pages outside any journal look. The Site Administrator sets them
on Administration › "Site Settings". Every visitor meets the result on
the site's own pages (the site's home page that lists the journals, and
the Login, Register and Privacy Statement pages at the site's own
address), every account meets the password rules, and each journal's
managers meet the bulk-email list. The page also carries tabs that belong
to other features: this spec describes the page, which tabs it shows,
and the tabs Rule 1 names as its own. <sup>a</sup>

## Actors & permissions

Only the Site Administrator reaches Administration. Where the
installation's configuration asks for it, the Site Administrator first
passes the Confirm Access gate
([Login & sessions](U01-login-and-sessions.md), Rule 16). "Every other
account" below means every signed-in account without the Site
Administrator role, a Journal Manager's included.

| Action | Who may, and when |
|--------|--------------------|
| **Open Site Settings** (Rules 1–3) | • Site Administrator: Administration › "Site Settings", at the site's own address (Rule 3)<br>• every other account: the access-denied page<br>• signed out: the Login page <sup>a</sup> |
| **Change and save the tabs this spec describes** (Rules 4–21) | • Site Administrator alone <sup>a</sup> |
| **Save through the site's own requests** (Rule 22) | • Site Administrator alone; every other account is refused <sup>l</sup> |
| **Meet the result** | • every visitor, signed in or not, on the site's own pages (Rules 7, 8, 13, 15, 17–21)<br>• every account, wherever it chooses a password or signs in (Rules 10–12)<br>• each journal's managers, through the "Notify" tab (Rule 16) <sup>a</sup> |

## Fields & validation

A field marked "per language" takes one value for each language the site
offers (Rule 5). The refusals below appear under the field on "Save",
with the line beside "Save" that Rule 4a quotes.

**"Site Setup" › "Settings"**

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Site Name" | yes, per language | Empty in the primary language: "This field is required." (Rules 6–7) <sup>d</sup> |
| "Journal redirect" ("Press redirect", "Server redirect") | no | A list: a blank first choice, then each journal enabled publicly, under its name ⚠ [A12](#a12): the name in the page's language, or in the journal's primary language where it has none in that language. The journals come in no fixed order: neither by name nor in the order of Administration › "Hosted Journals" ([Hosted journals](U59-hosted-journals.md#site-order), Rule 13) ⚠ [A11](#a11). Description: "Requests to the main site will be redirected to this journal. This may be useful if the site is hosting only a single journal, for example." (both "journal"s read "press" on OMP and "server" on OPS). Shown only while at least one journal is enabled publicly; the hidden end is read from the code (Rule 8) <sup>e</sup> |
| "Reviewer statistics" | no | One box, "Disable aggregated reviewer statistics", under the description "In a multi-context installation, reviewer statistics, such as the count of submitted reviews, can be displayed either individually for each context or aggregated collectively." (Rule 9) <sup>f</sup> |

**"Site Setup" › "Security"**, in two groups:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Password Policy" › "Minimum password length (characters)" | yes | A whole number, 4 or more: "This must be at least 4.", "This is not a valid integer.", "This field is required." (Rule 10) <sup>g</sup> |
| "Password Policy" › "Compromised Password Check" | no | One box, "Check passwords against compromised password databases", under a description naming a list of leaked passwords kept in the installation's files, "if available", and the "Have I Been Pwned" service otherwise (Rule 11) <sup>g</sup> |
| "Rate Limiting" › "Enable" | no | One box, "Enable rate limiting", under the group's description "Limit the number of failed attempts to protect against brute force attacks. Applies to both login and password reset requests." (Rule 12) <sup>g</sup> |
| "Maximum attempts" | no | Shown only while "Enable rate limiting" is ticked. A whole number, 1 or more: "This must be at least 1." Description: "Number of attempts allowed before rate limiting is triggered." (Rule 12) <sup>g</sup> |
| "Lockout duration (seconds)" | no | Shown only while "Enable rate limiting" is ticked. A whole number, 60 or more: "This must be at least 60." Description: "Time in seconds before the rate limit resets." (Rule 12) <sup>g</sup> |

**"Site Setup" › "Information"**

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "About the Site" | no, per language | Formatted text (Rule 13) <sup>h</sup> |
| "Name of principal contact" | yes, per language | "This field is required." (Rule 14) <sup>h</sup> |
| "Email of principal contact" | yes, per language | An email address: "This is not a valid email address."; empty: "This field is required." (Rule 14) <sup>h</sup> |
| "Privacy Statement" | no, per language | Formatted text. Description: "This statement will appear during user registration, author submission, and on the publicly available Privacy page. In some jurisdictions, you are legally required to disclose how you handle user data in this privacy policy." (Rule 15) <sup>h</sup> |

**"Site Setup" › "Bulk Emails"**

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Bulk Emails" | no | One box per hosted journal, labelled with the journal's name, under a description (Rule 16) <sup>i</sup> |

**"Appearance" › "Theme"**

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Theme" | a choice is always made | The themes enabled for the site; a stock installation offers "Default Theme" alone. Description: "New themes may be installed from the Plugins tab at the top of this page." Below it, the chosen theme's own fields (Rule 17) <sup>j</sup> |

**"Appearance" › "Setup"**

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Logo" | no, per language | A picture, with its "Alternate text" (Rule 18) <sup>k</sup> |
| "Page Footer" | no, per language | Formatted text. Description: "Enter any images, text or HTML code that you'd like to appear at the bottom of your website." (Rule 19) <sup>k</sup> |
| "Sidebar" | no | One box per block, in an order the Site Administrator can change (Rule 20) <sup>k</sup> |
| "Site style sheet" | no | One file ending in ".css" (Rule 21) <sup>k</sup> |

## Rules & state

**The page**

1. <a id="site-settings-tabs"></a> **Where it is, and its tabs.**
   Administration › "Site Settings" opens a page headed "Site Settings".
   Its tabs across the top, and the side tabs under each, are these on a
   site hosting two or more journals: <sup>b</sup> <sup>td1</sup>

   | Tab | Side tabs | Described in |
   |---|---|---|
   | "Site Setup" | "Settings", "Security", "Information" | this spec (Rules 6–15) |
   | | "Languages" | *Languages & locales* |
   | | "Navigation" | [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md) |
   | | "Highlights" | [Highlights](U11-highlights.md) |
   | | "Bulk Emails" | this spec (Rule 16) |
   | | "Statistics" | *Statistics — usage* |
   | | "ORCID" | [ORCID integration](U04-orcid-integration.md) |
   | "Appearance" | "Theme", "Setup" | this spec (Rules 17–21) |
   | "Announcements" | "Settings", "Announcements", "Announcement Types" | [Announcements](U12-announcements.md) |
   | "Plugins" | "Installed Plugins", "Plugin Gallery" | [Plugins management](U62-plugins-management.md) |

   Each top tab, and each side tab of "Site Setup", has an address of its
   own, so a reload opens the same one again. The side tabs under
   "Appearance", "Announcements" and "Plugins" do not: reloaded, or
   opened again from the address the page shows for them, they open
   "Site Setup" › "Settings" ⚠ [A7](#a7).
2. **A one-journal site shows less.** While the installation hosts
   exactly one journal, the page shows the "Site Setup" tab alone, with
   "Security", "Languages", "Bulk Emails" and "Statistics"; a site
   hosting two or more journals shows every tab of Rule 1. Two further
   ends are read from the code, since the test installs always host many
   journals: the count takes in every journal, enabled publicly or not,
   and a site with none shows every tab. <sup>b</sup> <sup>o</sup>
3. **Only at the site's own address.** Site Settings opens at the site's
   address ("index" where a journal's path would be). The same page asked
   for with a journal's path in the address does not open, the Site
   Administrator's included: it shows the access-denied page "Access
   denied.". <sup>a</sup> <sup>td2</sup>
4. **Saving.** Each side tab of this spec has its own "Save", which
   stores that tab's fields and nothing else and shows "Saved" beside the
   button. The site's pages show the change from their next load; a
   "Theme" change reaches only a browser that has not opened the site
   before (Rule 17b). A change left unsaved behaves as on a journal's
   Settings pages
   ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
   Rule 5). <sup>c</sup>

4a. **A refused save.** It stores nothing of that tab. It shows its
   message under the field, and beside "Save" the line "Please correct
   one error. Go to {field}: {message}. Jump to next error". An empty
   required field is refused before anything is sent. A refusal that
   comes back from the server (a badly formed email address, a number
   out of range) also shows the page notice "The form was not saved
   because 1 error(s) were encountered. Please correct these errors and
   try again." <sup>c</sup>

5. **Languages.** A field marked "per language" has one box for each
   language the site offers (which ones: *Languages & locales*). A
   required one needs the site's primary language filled; the other
   languages may stay empty. A visitor reads the value of their own
   language and, where it has none, the primary language's: a "Logo"
   (with its "Alternate text") or "Page Footer" set in the primary
   language alone also shows on the other languages' pages. <sup>c</sup>

**"Settings"**

6. **"Site Name" is required.** "Save" with it empty in the primary
   language is refused with "This field is required." under it, and the
   tab's other two fields are not stored either. A fresh installation
   has no Site Name ⚠ [A1](#a1), so this tab cannot be saved until one
   is typed. <sup>d</sup> <sup>td3</sup>
7. **Where the Site Name shows.** <sup>d</sup> <sup>td4</sup>
   - In the header of every page at the site's own address, as a link to
     the site's home page, while no "Logo" is set (Rule 18); with neither
     a logo nor a name, the application's own logo stands there.
   - As the browser tab's title of the site's home page, and as that
     page's heading for screen readers.
   - In the editorial header of the Administration screens, as a link to
     the site's home page, and after the page name in their browser tabs
     ("Site Settings | {site name}"). Without a Site Name both read the
     application's name ("Open Journal Systems", "Open Monograph Press",
     "Open Preprint Systems"), the header's as plain text.
   - In the site's own emails wherever their text carries the site's
     name ([Emails management](U56-emails-management.md) lists the
     placeholders), and as the "Repository Name" of the site-wide
     harvesting address ([OAI-PMH](U19-oai-pmh.md)).
8. <a id="journal-redirect"></a> **"Journal redirect".** With a journal
   chosen and saved, the site's address opens that journal's home page
   for every visitor, and the site's home page cannot be reached.
   The site's Login and Register pages stay at the site's address.
   Signing in on that Login page lands every account on the journal's
   home page, the Site Administrator's included ⚠ [A8](#a8). The blank
   choice, saved again, brings the site's home page back. Without a
   redirect, the site's address opens the site's home page while two or
   more journals are enabled publicly, and the one journal's home page
   while exactly one is. <sup>e</sup> <sup>td5</sup>
9. **"Reviewer statistics"** {OJS OMP}. The figures a journal's "Add
   Reviewer" window shows for each reviewer (active reviews, reviews
   completed, declined and cancelled requests, days since the last
   assignment, average days to complete, rating;
   [Reviewer assignment & management](U27-reviewer-assignment-and-management.md),
   Rules 5–6) count the reviewer's reviews in every journal of the site
   while the box is unticked, and only this journal's while "Disable
   aggregated reviewer statistics" is ticked. A preprint server has no
   reviewers, yet offers the box, which changes nothing there
   ⚠ [OPS1](#ops1). <sup>f</sup> <sup>td6</sup>

**"Security"**

10. **"Minimum password length (characters)".** 6 on a fresh
    installation. The saved number is the shortest password the site
    accepts wherever a password is chosen: the Register page, the
    profile's password change, a password reset and the acceptance of an
    invitation, each showing "The password must be at least {N}
    characters." ([Registration & account validation](U02-registration-and-account-validation.md),
    [User profile](U03-user-profile.md),
    [Login & sessions](U01-login-and-sessions.md),
    [User invitations](U06-user-invitations.md)). Passwords chosen before
    a change keep working. <sup>g</sup> <sup>td7</sup>
11. **"Compromised Password Check".** Ticked, each new password on the
    screens of Rule 10 is also checked against a list of passwords known
    from data leaks, and a listed one is refused with "This password has
    appeared in data leaks. Please choose a different, strong password."
    The check reads a list of leaked passwords placed in the
    installation's files when there is one; a stock installation ships
    none, so it asks the "Have I Been Pwned" service over the internet
    instead, as the box's description says. Unticked, as on a fresh
    installation, no such check is made. <sup>g</sup>
12. **"Rate Limiting".** Ticking "Enable rate limiting" shows "Maximum
    attempts" (5) and "Lockout duration (seconds)" (300); unticking hides
    them again. With both boxes emptied, "Save" is accepted ("Saved"),
    and after a reload they read 5 and 300 again. <sup>g</sup>
    <sup>td8</sup>

12a. **The lockout.** With "Enable rate limiting" saved ticked, once one
    account has failed to sign in, or one email address has asked for a
    password reset, as many times as "Maximum attempts" from the same
    network address, further attempts are refused until the lockout has
    run out; what the sign-in and reset pages then say is described in
    [Login & sessions](U01-login-and-sessions.md). <sup>g</sup>
    <sup>td8</sup>

**"Information"**

13. **"About the Site".** Set, the text stands on the site's home page
    above the list of journals (the list is *Hosted journals*'); empty,
    as on a fresh installation, nothing stands there. The site has no
    About page of its own: its About address (the site's address with
    "about" after it) sends a signed-out visitor to the Login page, and
    the Site Administrator to the access-denied page "You cannot call
    this operation without a context (press, journal, conference,
    etc)." <sup>h</sup> <sup>td9</sup>
14. **The site's principal contact.** A fresh installation holds the
    application's name ("Open Journal Systems", "Open Monograph Press",
    "Open Preprint Systems") and the address typed at installation. The
    emails the site sends on its own come from this name and address:
    the password-reset email
    ([Login & sessions](U01-login-and-sessions.md)) and the "Validate
    Your Account" email of a registration on the site's Register page
    ([Registration & account validation](U02-registration-and-account-validation.md)).
    The site-wide harvesting address names the address as its "Admin
    Email" ([OAI-PMH](U19-oai-pmh.md)). <sup>h</sup> <sup>td10</sup>
15. **"Privacy Statement".** Set, the site's Privacy Statement page shows
    it ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 18, describes that page, which answers "404 Not Found" while the
    statement is empty), and the Register page at the site's address asks
    the visitor to agree to it
    ([Registration & account validation](U02-registration-and-account-validation.md),
    Rule 5). Empty on a fresh installation. <sup>h</sup> <sup>td10</sup>

**"Bulk Emails"**

16. **Which journals may email all their users.** The list holds one box
    per hosted journal, enabled publicly or not; none is ticked on a fresh
    installation. A journal ticked and saved may send bulk email: its
    Users & Roles page gains the "Notify" tab
    ([Notify users](U55-notify-users.md), Settings bullet 1); unticked and
    saved, the tab is gone. The list's description warns about misuse and
    ends "Further restrictions on this feature can be enabled for each
    journal by visiting its settings wizard in the list of Hosted
    Journals.", "Hosted Journals" being a link to Administration ›
    "Hosted Journals" ("Hosted Presses", "Hosted Servers"); the
    restriction itself belongs to *Notify users*. <sup>i</sup>
    <sup>td11</sup>

**"Appearance"**

17. **The site's theme.** The site's "Theme" tab chooses the theme of
    the site's own pages alone; each journal keeps the theme and fields
    chosen on its own Settings › Website › "Appearance" › "Theme". The
    tab offers the same list and, for "Default Theme", the same fields as
    a journal's ([Appearance & theming](U10-appearance-and-theming.md),
    Rules 4–10): "Typography" and "Colour" change the site's pages as
    they change a journal's. <sup>j</sup> <sup>td12</sup>

17a. **Fields that change nothing on the site.** The fields that shape
    a journal's home page change nothing on the site's pages
    ⚠ [A5](#a5): "Journal Summary" ("Press Summary" on OMP, "Server
    Summary" on OPS), "Journal Content Organization" {OJS}, "Show
    Series" {OMP}, "Header Background Image" and "Usage statistics
    display options". <sup>j</sup> <sup>td12</sup>

17b. **A browser that has opened the site before.** After a "Theme"
    save, a browser that never opened a page at the site's address shows
    the new "Colour" and "Typography" at once. A browser that already
    opened one keeps the old look on every page of the site, reload
    included ⚠ [A9](#a9). <sup>td12</sup>

18. **"Logo".** Set, the logo stands in the header of every page at the
    site's address in place of the Site Name, as a link to the site's
    home page, with its "Alternate text" as its description; removed and
    saved, the Site Name comes back (Rule 7). A journal's pages show the
    journal's own logo or name, never the site's. <sup>k</sup>
    <sup>td13</sup>
19. **"Page Footer".** Set, the text shows at the foot of every page at
    the site's address; a journal's pages show the journal's own footer.
    The box's toolbar has no picture button. <sup>k</sup> <sup>td14</sup>
20. **"Sidebar".** One box per block of a plugin enabled for the site
    (Site Settings › "Plugins"); a fresh installation offers "Language
    Toggle Block" alone and ticks none. After "Save", the ticked blocks
    show, in the list's order, in the sidebar of every page at the site's
    address; the order and a block whose plugin is disabled behave as on
    a journal ([Appearance & theming](U10-appearance-and-theming.md),
    Rules 23–25). <sup>k</sup> <sup>td15</sup>
21. **"Site style sheet"** {OJS OPS}. After "Save", the file is loaded on
    every public page of the site and of every journal it hosts, after
    the theme's own styles; the editorial screens do not load it. On a
    press it is loaded nowhere ⚠ [OMP1](#omp1). "Remove" and "Save" take
    it off the pages, but the file stays where it was, still opening at
    its address ⚠ [A6](#a6). <sup>k</sup> <sup>td16</sup>

**The site's own requests**

22. **The saves behind the tabs.** Each "Save" of this spec goes through
    the site's own requests, which answer the Site Administrator alone;
    any other signed-in account is refused. They check the formats of
    Rules 10 and 12 and the email address of Rule 14, but not the
    required fields: a save made outside the page with an empty "Site
    Name", "Name of principal contact" or "Email of principal contact"
    is stored ⚠ [A4](#a4). <sup>l</sup>

**Other languages**

23. **French.** In the French interface these show raw codes
    ⚠ [A2](#a2): <sup>td17</sup>
    - the "Site Setup" side tab "Security", which reads
      "##admin.security##", and every group, label and description of its
      form except "Longueur minimum du mot de passe (nombre de
      caractères)";
    - on a press, the side tab "Information", which reads
      "##manager.setup.information##";
    - on a press and a preprint server, the description of "Courriels en
      lot" ("Bulk Emails"), which reads
      "##admin.settings.enableBulkEmails.description##".

## Side effects

- When the installation's configuration turns security audit logging on
  (it is off on a fresh installation), a saved change to "Minimum
  password length (characters)", "Compromised Password Check", "Enable
  rate limiting", "Maximum attempts" or "Lockout duration (seconds)"
  writes one line to the installation's log naming the settings that
  changed; no screen shows that log. Off, nothing is written.
  <sup>m</sup> <sup>n</sup>
- "Save" on "Theme" empties the stored page templates and style sheets
  of the whole installation, every journal's included; each page
  rebuilds them on its next load. A visitor opening the site for the
  first time then sees the new look at once; a browser that already
  opened a site page keeps the old look, reload included (Rule 17b,
  [A9](#a9)). <sup>m</sup>
- An uploaded "Logo" or style sheet is stored among the site's public
  files and served at an address of its own; "Remove" and "Save" delete
  the logo's file (the style sheet's stays, Rule 21). <sup>m</sup>
- Every "Save" on "Security", "Information", "Bulk Emails" or "Setup"
  writes a warning to the server's log while no "Journal redirect" is
  set; the save itself succeeds ⚠ [A3](#a3). A "Save" on "Settings"
  writes none, and neither does a "Save" on "Theme" that keeps the
  theme; one that changes the theme writes it too, read from the code
  ("Default Theme" is the only theme installed). <sup>m</sup>
- No save of these tabs sends an email, raises a notification or writes
  to any journal's logs. <sup>m</sup>

## Settings that modify behavior

The page is itself a settings screen: each of its fields, with its
default on a fresh installation and where each end takes effect.

1. **"Site Name"** (Site Setup › "Settings"; empty). Set: the places of
   Rule 7 show it. Empty: Rule 7's fallbacks, and the tab cannot be
   saved (Rule 6, [A1](#a1)).
2. **"Journal redirect"** (Site Setup › "Settings"; blank). A journal
   chosen: the site's address opens it (Rule 8).
3. **"Disable aggregated reviewer statistics"** (Site Setup › "Settings";
   unticked). Ticked: reviewer figures count this journal only (Rule 9).
4. **"Minimum password length (characters)"** (Site Setup › "Security";
   6). Another number: the shortest password accepted everywhere
   (Rule 10).
5. **"Check passwords against compromised password databases"** (Site
   Setup › "Security"; unticked). Ticked: leaked passwords refused
   (Rule 11).
6. **"Enable rate limiting"** (Site Setup › "Security"; unticked, with
   "Maximum attempts" 5 and "Lockout duration (seconds)" 300). Ticked:
   repeated failed sign-ins and reset requests refused for the lockout
   (Rule 12a).
7. **"About the Site"** (Site Setup › "Information"; empty). Set: the
   text on the site's home page (Rule 13).
8. **"Name of principal contact"** and **"Email of principal contact"**
   (Site Setup › "Information"; the application's name and the address
   typed at installation). Changed: the sender of the site's own emails
   (Rule 14).
9. **"Privacy Statement"** (Site Setup › "Information"; empty). Set: the
   site's Privacy Statement page and the site-level Register consent
   (Rule 15).
10. **"Bulk Emails"** (Site Setup › "Bulk Emails"; no journal ticked). A
    journal ticked: its "Notify" tab (Rule 16).
11. **"Theme" and its fields** (Appearance › "Theme"; "Default Theme"
    with its own defaults). Another choice: the site's own pages
    (Rule 17).
12. **"Logo"** (Appearance › "Setup"; none). Set: the site's header
    (Rule 18).
13. **"Page Footer"** (Appearance › "Setup"; empty). Set: the site's
    footer (Rule 19).
14. **"Sidebar"** (Appearance › "Setup"; nothing ticked). A block ticked:
    the site's sidebar (Rule 20).
15. **"Site style sheet"** (Appearance › "Setup"; none). Uploaded: every
    public page on a journal site or preprint server, none on a press
    (Rule 21).
16. **The number of hosted journals** (Administration › "Hosted
    Journals"; *Hosted journals*). The page and the site's address count
    different journals ⚠ [A10](#a10). Exactly one journal, enabled publicly or
    not: the reduced page of Rule 2; none, or two or more: every tab.
    Exactly one enabled publicly: the site's address opens that journal
    (Rule 8). <sup>o</sup>
17. **The installation's configuration** (the configuration file, read
    by the server; not on any screen). The Confirm Access gate before
    Administration, off on a fresh installation
    ([Login & sessions](U01-login-and-sessions.md), Rule 16); a single
    site-wide privacy statement replacing each journal's, off
    ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 18); security audit logging, off (Side effects).
    <sup>n</sup>

## Cross-feature interactions

- *System administration & jobs* owns the Administration page the
  "Site Settings" button sits on, its other tools, and the notice of a
  newer release that tops both pages; the user menu's "Administration"
  entry is [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'s.
- The side tabs Rule 1's table gives to other features are theirs: this
  spec owns only when they show (Rules 1–2).
- *Hosted journals* owns creating, enabling and ordering journals, the
  list of journals on the site's home page, and each journal's Settings
  Wizard.
- [Login & sessions](U01-login-and-sessions.md) owns the Confirm Access
  gate, and what the sign-in and reset pages say under rate limiting
  (Rule 12a); [Registration & account validation](U02-registration-and-account-validation.md),
  [User profile](U03-user-profile.md) and
  [User invitations](U06-user-invitations.md) own the password fields
  that apply Rules 10–11. <sup>n</sup>
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns the Privacy Statement page (Rule 15); this spec owns the site's
  statement.
- [Appearance & theming](U10-appearance-and-theming.md) owns how a theme,
  its fields, the sidebar list and a style sheet work; this spec owns
  where the site's own choices apply (Rules 17–21).
- [Notify users](U55-notify-users.md) owns the "Notify" tab and the
  per-journal restriction; this spec owns the site's "Bulk Emails" list
  (Rule 16).
- [Reviewer assignment & management](U27-reviewer-assignment-and-management.md)
  owns the reviewer figures that "Reviewer statistics" scopes (Rule 9).
- [Emails management](U56-emails-management.md) owns the placeholders
  that print the site's name and contact; [OAI-PMH](U19-oai-pmh.md)
  owns the site-wide harvesting answer (Rules 7, 14).
- [Highlights](U11-highlights.md) and [Announcements](U12-announcements.md)
  own what the site's home page shows around "About the Site" (Rule 13).

## Canonical scenarios

Every scenario runs as the Site Administrator (a ready account), one at
a time, because the site's settings are one record the whole install
shares, and puts back what it changed; the effects are read on scratch
journals with throwaway accounts. <sup>s</sup>

1. **Who reaches Site Settings**

   Given: Site Administrator, on a site with no Site Name (a fresh
   installation's state) hosting a scratch journal, whose Journal
   Manager is signed in in a second browser, and a visitor signed out in
   a third.

   - **The page**: open Administration › "Site Settings": the page is
     headed "Site Settings". Its tabs across the top are "Site Setup",
     "Appearance", "Announcements" and "Plugins". "Site Setup" has the
     side tabs "Settings", "Security", "Information", "Languages",
     "Navigation", "Highlights", "Bulk Emails", "Statistics" and "ORCID";
     "Appearance" has "Theme" and "Setup"; "Announcements" has
     "Settings", "Announcements" and "Announcement Types"; "Plugins" has
     "Installed Plugins" and "Plugin Gallery" (Rule 1).
   - **A reload**: open "Site Setup" › "Security" and reload the page:
     "Security" opens again (Rule 1).
   - **A journal's path in the address**: in the page's address, put the
     scratch journal's path in place of "index" and open it: the
     access-denied page "Access denied." (Rule 3).
   - **The Journal Manager**: opens the Site Settings address, copied
     from the Site Administrator's browser: the access-denied page "The
     current role does not have access to this operation." (Actors row
     1).
   - **The Journal Manager's save, sent directly**: no screen offers it,
     so from the Journal Manager's browser, with their own session, send
     the save "Site Setup" › "Settings" sends, carrying Not the site in
     "Site Name": it is refused (Actors row 3; Rule 22). <sup>s</sup>
   - **Signed out**: the visitor opens the Site Settings address: the
     Login page (Actors row 1).
   - **Control**: the Site Administrator reloads "Site Setup" ›
     "Settings": "Site Name" is still empty (Rules 6, 22). <sup>s</sup>

2. **The Site Name**

   Given: Site Administrator, on a site with no Site Name and no
   "Journal redirect" (a fresh installation's state) hosting a scratch
   journal.

   - **Without a Site Name** ⚠ [A1](#a1): open the site's home page: the
     browser tab's title and the page's heading for screen readers are
     empty, and the header shows the application's own logo. Open
     Administration › "Site Settings": the editorial header reads "Open
     Journal Systems" ("Open Monograph Press", "Open Preprint Systems") as
     plain text, and the browser tab reads "Site Settings | Open Journal
     Systems" (Rule 7).
   - **Refused while empty**: open "Site Setup" › "Settings", choose the
     scratch journal under "Journal redirect" and press "Save": "This
     field is required." shows under "Site Name", and beside "Save"
     "Please correct one error. Go to Site Name: This field is required.
     Jump to next error". Reload the page: "Journal redirect" is blank
     (Rules 4a, 6).
   - **Saved**: type Harbour Scholarly Site in "Site Name" and press
     "Save": "Saved" shows beside the button (Rule 4).
   - **The site's home page**: open it again: the browser tab's title
     and the heading for screen readers read "Harbour Scholarly Site",
     and the header shows "Harbour Scholarly Site" as a link to the
     site's home page (Rule 7).
   - **The Administration screens**: open Administration › "Site
     Settings" again: the editorial header shows "Harbour Scholarly Site"
     as a link to the site's home page, and the browser tab reads "Site
     Settings | Harbour Scholarly Site" (Rule 7).
   - **Emptied**: on "Site Setup" › "Settings", clear "Site Name" and
     press "Save": "This field is required." shows under it. Reload the
     page: "Site Name" reads Harbour Scholarly Site (Rules 4a, 6).
   - **Control**: open the scratch journal's home page: its header shows
     the journal's own name, not "Harbour Scholarly Site" (Rule 18).
     <sup>s</sup>

3. **"Journal redirect"**

   Given: Site Administrator, on a site with a Site Name hosting a
   scratch journal enabled publicly, with a throwaway Reader, and a
   second scratch journal not enabled publicly, with a visitor signed out
   in a second browser.

   - **Before**: the visitor opens the site's address: the site's home
     page, with its list of journals (Rule 8).
   - **The list**: open "Site Setup" › "Settings": "Journal redirect"
     ("Press redirect", "Server redirect") has its blank first choice
     selected, under the description "Requests to the main site will be
     redirected to this journal. This may be useful if the site is
     hosting only a single journal, for example." (both "journal"s read
     "press" on a press and "server" on a preprint server) (Fields).
   - **A journal chosen**: choose the first scratch journal, by its name,
     and press "Save": "Saved" (Rules 4, 8).
   - **The site's address**: the visitor opens the site's address again:
     the first scratch journal's home page opens (Rule 8).
   - **The site's Login page**: the visitor opens the site's address with
     "login" after it: the Login page opens at the site's address. The
     visitor signs in there as the Reader: the first scratch journal's
     home page opens (Rule 8).
   - **Blank again**: the Site Administrator chooses the blank first
     choice and presses "Save": "Saved". The Reader opens the site's
     address: the site's home page, with its list of journals (Rule 8).
   - **Control**: the "Journal redirect" list offers the first scratch
     journal and not the second, which is not enabled publicly (Fields).
     <sup>s</sup>

4. **The password rules**

   Given: Site Administrator, at a fresh installation's password rules (a
   minimum of 6 characters, no compromised-password check), with the
   throwaway account Quinn Ashdown, whose password Kq7vz2 has six
   characters, signed out in a second browser, and the internet
   reachable.

   - **Numbers refused**: open "Site Setup" › "Security", type 3 in
     "Minimum password length (characters)" and press "Save": "This must
     be at least 4." shows under the box, beside "Save" "Please correct
     one error. Go to Minimum password length (characters): This must be
     at least 4. Jump to next error", and at the top of the page "The form
     was not saved because 1 error(s) were encountered. Please correct
     these errors and try again." Type 4.5 and press "Save": "This is not
     a valid integer." Clear the box and press "Save": "This field is
     required." (Fields; Rule 4a).
   - **8 saved**: type 8 in the box and press "Save": "Saved" (Rule 4).
   - **A password chosen before**: Quinn signs in with Kq7vz2: she is
     signed in (Rule 10).
   - **Too short**: Quinn opens Profile › Password, types Kq7vz2 as her
     current password and abcdefg as the new one, in both of its boxes,
     and saves: "The password must be at least 8 characters." (Rule 10).
   - **A leaked password**: the Site Administrator ticks "Check passwords
     against compromised password databases" and presses "Save":
     "Saved". Quinn types qwerty123456 as the new password, in both
     boxes, and saves: "This password has appeared in data leaks. Please
     choose a different, strong password." (Rule 11).
   - **Control**: the Site Administrator unticks the box, types 6 in
     "Minimum password length (characters)" and presses "Save": "Saved";
     Profile › Password now accepts Quinn's qwerty123456 (Rules 10, 11).
     <sup>s</sup>

5. **Rate limiting**

   Given: Site Administrator, with rate limiting off (a fresh
   installation's state) and the throwaway accounts Rui Tanaka and Nova
   Reyes, signed out in a second browser.

   - **The boxes**: open "Site Setup" › "Security" and tick "Enable rate
     limiting": "Maximum attempts" shows 5 and "Lockout duration
     (seconds)" 300. Untick it: both boxes are gone. Tick it again (Rule
     12).
   - **Numbers refused**: type 0 in "Maximum attempts" and 59 in
     "Lockout duration (seconds)" and press "Save": "This must be at
     least 1." and "This must be at least 60." show under them (Fields;
     Rule 4a).
   - **Both emptied**: clear both boxes and press "Save": "Saved". Reload
     the page and open "Security": "Enable rate limiting" is ticked, and
     the boxes read 5 and 300 (Rule 12).
   - **The lockout**: type 2 in "Maximum attempts" and 60 in "Lockout
     duration (seconds)" and press "Save": "Saved". In the second
     browser, sign in as Rui twice with the password wrong-password, then
     with his own: each time the Login page shows again with its refusal
     and Rui is not signed in (Rule 12a; what the page says:
     [Login & sessions](U01-login-and-sessions.md)).
   - **Control**: in the same browser, Nova signs in with her own
     password: she is signed in, since the lockout holds Rui's account
     alone (Rule 12a). <sup>s</sup>

6. **The site's information**

   Given: Site Administrator, on a site hosting a scratch journal with
   the throwaway account Quinn Ashdown, the principal contact as installed
   (the application's name and the address typed at installation), no
   "About the Site" and no "Privacy Statement", and a visitor signed out
   in a second browser.

   - **Refused**: open "Site Setup" › "Information", clear "Name of
     principal contact" and press "Save": "This field is required." shows
     under it. Type Site Help Desk in it and not-an-address in "Email of
     principal contact", and press "Save": "This is not a valid email
     address." shows under the address, beside "Save" "Please correct one
     error. Go to Email of principal contact: This is not a valid email
     address. Jump to next error", and at the top of the page "The form
     was not saved because 1 error(s) were encountered. Please correct
     these errors and try again." Reload the page and open "Information":
     the contact reads as installed (Fields; Rule 4a).
   - **Saved**: type Welcome to the test site. in "About the Site", Site
     Help Desk in "Name of principal contact", helpdesk@mail.test in
     "Email of principal contact" and We keep your data private. in
     "Privacy Statement", and press "Save": "Saved" (Rule 4).
   - **The site's home page**: the visitor opens it: "Welcome to the test
     site." stands above the list of journals (Rule 13).
   - **The site's About address**: the visitor opens the site's address
     with "about" after it: the Login page. The Site Administrator opens
     the same address: the access-denied page "You cannot call this
     operation without a context (press, journal, conference, etc)."
     (Rule 13).
   - **The privacy statement**: the visitor opens the site's Register
     page: it asks the visitor to agree to the site's privacy statement.
     The visitor opens the site's Privacy Statement page (a journal's
     Privacy Statement address with "index" in place of the journal's
     path): it shows "We keep your data private." (Rule 15).
   - **The password-reset email**: the visitor presses "Forgot your
     password?" on the site's Login page and asks for a reset of Quinn's
     email address: the email arrives from Site Help Desk at
     helpdesk@mail.test (Rule 14).
   - **Control**: the Site Administrator clears "About the Site" and
     "Privacy Statement", types back the name and address the contact
     held, and presses "Save": "Saved"; the visitor's reloaded site home
     page has no text above the list of journals, and the site's Privacy
     Statement page answers "404 Not Found" (Rules 13, 15). <sup>s</sup>

7. **Bulk email for a journal**

   Given: Site Administrator, on a site hosting two scratch journals
   that may not send bulk email, each with a throwaway Journal Manager
   signed in in a browser of their own.

   - **The list**: open "Site Setup" › "Bulk Emails": one box per hosted
     journal, labelled with the journal's name, the two scratch journals'
     boxes unticked. The description ends "Further restrictions on this
     feature can be enabled for each journal by visiting its settings
     wizard in the list of Hosted Journals.", "Hosted Journals" ("Hosted
     Presses", "Hosted Servers") being a link (Fields; Rule 16).
   - **Ticked**: tick the first scratch journal's box and press "Save":
     "Saved" (Rule 4).
   - **The first Journal Manager**: opens Settings › Users & Roles: the
     page has the tab "Notify" (Rule 16).
   - **The link**: the Site Administrator presses "Hosted Journals" in
     the description: Administration › "Hosted Journals" ("Hosted
     Presses", "Hosted Servers") opens (Rule 16).
   - **Control**: the second journal's Journal Manager opens Settings ›
     Users & Roles: the page has no "Notify" tab (Rule 16). <sup>s</sup>

8. **The site's theme**

   Given: Site Administrator, on a site hosting a scratch journal, with
   the site's theme as installed, and a visitor in a second browser that
   has never opened a page at the site's address.

   - **The tab**: open "Appearance" › "Theme": "Theme" offers "Default
     Theme", with the description "New themes may be installed from the
     Plugins tab at the top of this page.", and below it the theme's own
     fields, "Typography" and "Colour" among them (Fields; Rule 17).
   - **Changed**: choose "Lato: A popular modern sans-serif font." under
     "Typography", type #8B0000 in the colour box under "Colour", and
     press "Save": "Saved" (Rules 4, 17).
   - **The visitor's first visit**: the visitor opens the site's home
     page, then its Login page: on both, the header (the band at the top
     holding the site's logo or name and the menu) is dark red and the
     text is in Lato (Rules 17, 17b) ⚠ [A9](#a9).
   - **Control**: the visitor opens the scratch journal's home page: its
     header is not dark red and its text not in Lato, since the journal
     keeps its own "Colour" and "Typography" (Rule 17). <sup>s</sup>

9. **The site's logo, footer and sidebar**

   Given: Site Administrator, on a site with no Site Name, "Logo", "Page
   Footer" or "Sidebar" block (a fresh installation's state) hosting a
   scratch journal, a visitor signed out in a second browser, and the
   file "logo.png", a PNG picture.

   - **Set**: open "Appearance" › "Setup", upload logo.png under "Logo"
     and type Site logo in its "Alternate text", type Hosted by the test
     site. in "Page Footer", tick "Language Toggle Block" under
     "Sidebar", and press "Save": "Saved" (Rules 4, 18–20).
   - **The site's pages**: the visitor opens the site's home page, then
     its Login page: on both, the header shows the logo, described "Site
     logo", as a link to the site's home page; "Hosted by the test site."
     stands at the foot; and the language block stands in the sidebar
     (Rules 18–20).
   - **A journal's pages**: the visitor opens the scratch journal's home
     page: its header shows the journal's own name, not the logo, and
     "Hosted by the test site." is not at its foot (Rules 18, 19).
   - **The site's French pages**: the visitor opens the site's home page
     and chooses French in the language block: the same logo, described
     "Site logo", and "Hosted by the test site." show, though their
     French boxes are empty (Rule 5).
   - **Control**: the Site Administrator presses "Remove" under "Logo",
     clears "Page Footer", unticks "Language Toggle Block" and presses
     "Save": "Saved"; the visitor's reloaded site home page shows the
     application's own logo in the header, no "Hosted by the test site."
     and no language block (Rules 7, 18–20). <sup>s</sup>

10. **"Reviewer statistics"** {OJS OMP}

    Given: Site Administrator, on a site with a Site Name, with a
    throwaway Reviewer who has completed a review in a first scratch
    journal and is also a Reviewer of a second, where a submission is in
    review and the second journal's Journal Manager is signed in in a
    second browser.

    - **Counted across journals**: the Journal Manager opens the
      submission's review round, presses "Add Reviewer" and finds the
      Reviewer: the Reviewer's reviews completed read 1, the review in
      the first journal (Rule 9).
    - **Ticked**: the Site Administrator opens "Site Setup" › "Settings",
      ticks "Disable aggregated reviewer statistics" and presses "Save":
      "Saved" (Rules 4, 9).
    - **This journal only**: the Journal Manager closes "Add Reviewer"
      and presses it again: the Reviewer's reviews completed read 0
      (Rule 9).
    - **Control**: the Site Administrator unticks the box and presses
      "Save": "Saved"; in the Journal Manager's "Add Reviewer", opened
      again, the Reviewer's reviews completed read 1 (Rule 9).
      <sup>s</sup>

    A preprint server has no reviewers: it offers the box, which changes
    nothing there ⚠ [OPS1](#ops1), and this scenario does not run on it.

11. **"Site style sheet"** {OJS OPS}

    Given: Site Administrator, on a site hosting a scratch journal, a
    visitor signed out in a second browser, and the file "site.css", a
    style sheet.

    - **Uploaded**: open "Appearance" › "Setup", upload site.css under
      "Site style sheet" and press "Save": "Saved" (Rules 4, 21).
    - **The public pages**: the visitor opens the site's home page, then
      the scratch journal's home page: each loads site.css, after the
      theme's own styles (Rule 21).
    - **The editorial screens**: the Site Administrator's Administration
      › "Site Settings" does not load site.css (Rule 21).
    - **Control**: the Site Administrator presses "Remove" under "Site
      style sheet" and "Save": "Saved"; the visitor's two pages,
      reloaded, no longer load site.css ⚠ [A6](#a6) (Rule 21).
      <sup>s</sup>

    A press stores the sheet and loads it on no page ⚠ [OMP1](#omp1), so
    this scenario does not run on a press.

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — variants:
  - the minimum password length on the Register page, a password reset
    and an invitation's acceptance, as on Profile › Password (Rule 10)
  - the principal contact as the sender of the "Validate Your Account"
    email of a registration on the site's Register page, and as the
    site-wide harvesting address's "Admin Email" (Rule 14)
  - the lockout running out after "Lockout duration (seconds)", and a
    password-reset request refused the same way (Rule 12a)
  - the Site Name in the site's own emails and as the site-wide
    harvesting address's "Repository Name" (Rule 7)
  - a second language's "Site Name" read on the site's pages in that
    language (Rule 5)
  - the "Journal redirect" list on the French page, a journal with a
    French name listed under it (Fields)
- **Nothing new to test**:
  - every other signed-in account at the Site Settings address, which
    gets the access-denied page the Journal Manager of scenario 1 gets
    (Actors row 1)
  - a change left unsaved on a tab, which behaves as on a journal's
    Settings pages (Rule 4;
    [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
    Rule 5)
- **Register carries it**:
  - A2 (the French interface's raw codes; Rule 23)
  - A3 (the server-log warning on most saves; Side effects)
  - A4 (required fields left empty by a save made outside the page;
    Rule 22)
  - A5 (the journal-only theme fields changing nothing on the site;
    Rule 17a)
  - A6 (the removed style sheet still at its address; Rule 21;
    scenario 11 passes it)
  - A7 (a reload on an "Appearance", "Announcements" or "Plugins" side
    tab opening "Site Setup" › "Settings"; Rule 1)
  - A8 (the Site Administrator's sign-in under a "Journal redirect"
    landing on the journal's home page; Rule 8)
  - A9 (a theme change in a browser that already opened the site;
    Rule 17b; scenario 8 passes it)
  - A11 (the "Journal redirect" list's order, and its shifts after a
    Hosted Journals save; Fields)
  - A12 (an "&" in a journal's name in the "Journal redirect" list;
    Fields)
  - OMP1 (the style sheet loaded nowhere on a press; Rule 21; scenario
    11 names it)
  - OPS1 (the "Reviewer statistics" box changing nothing on a preprint
    server; Rule 9; scenario 10 names it)
- **No seed**:
  - a one-journal site's reduced page, and the site's address opening
    that journal (Rules 2, 8; Settings bullet 16)
  - one journal enabled publicly and one not, counted differently by the
    page and the site's address, A10 (Rules 2, 8; Settings bullet 16)
  - a site with no journals showing every tab (Rule 2)
  - another theme chosen for the site, "Default Theme" being the only one
    a stock installation offers (Rule 17; Fields, "Theme")
  - a security change's audit-log line, with security audit logging
    turned on in the installation's configuration (Side effects;
    Settings bullet 17)
- **Owned by another feature**:
  - a journal unticked under "Bulk Emails" losing its "Notify" tab
    (Rule 16; *[Notify users](U55-notify-users.md)*, scenario 5)
  - the "Sidebar" order and a block whose plugin is disabled (Rule 20;
    *[Appearance & theming](U10-appearance-and-theming.md)*, scenario 4)
  - the Confirm Access gate before Site Settings (Settings bullet 17;
    *[Login & sessions](U01-login-and-sessions.md)*)
  - the side tabs Rule 1's table gives to other features (Rule 1; the
    features its table names)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A2](#a2) | The French interface shows raw codes on "Security", on a press's "Information", and in the "Bulk Emails" description on a press and a preprint server | 🐞 | minor | — |
| [A3](#a3) | Most saves on Site Settings without a "Journal redirect" write a warning to the server log | 🐞 | invisible | — |
| [A4](#a4) | The site's own save accepts an empty "Site Name" and principal contact when made outside the page | 🐞 | latent | — |
| [A6](#a6) | A removed "Site style sheet" stays at its address | 🐞 | minor | — |
| [A7](#a7) | A reload on an "Appearance", "Announcements" or "Plugins" side tab opens "Site Setup" › "Settings" | 🐞 | minor | — |
| [A8](#a8) | Under a "Journal redirect", the Site Administrator's sign-in lands on the journal's home page, not its Dashboard | 🐞 | minor | — |
| [A11](#a11) | The "Journal redirect" list follows neither name nor the Hosted Journals order, and shifts after a save there | 🐞 | minor | — |
| [A12](#a12) | An "&" in a journal's name reads "&amp;amp;" in the "Journal redirect" list | 🐞 | minor | — |
| [OMP1](#omp1) | A press never loads the "Site style sheet" | 🐞 | user-visible | — |
| [A1](#a1) | A fresh installation has no Site Name: the site's home page has an empty title | ❓ | user-visible | — |
| [A5](#a5) | The site's "Theme" tab offers journal home-page fields that change nothing on the site | ❓ | minor | — |
| [A9](#a9) | A saved "Theme" change does not reach a browser that already opened the site | ❓ | user-visible | — |
| [A10](#a10) | The reduced page and the site's address count journals differently | ❓ | latent | — |
| [OPS1](#ops1) | A preprint server offers "Reviewer statistics" with no reviewers to count | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — A fresh installation has no Site Name** · ❓ · user-visible.
The installer asks for no site name (read from the code) and nothing
sets one, while the principal contact name gets the application's name.
Until the Site Administrator types one, the site's home page has an
empty browser title and an empty heading for screen readers, the header
of the site's pages shows the application's logo, and the site's own
emails print an empty name where the site's name belongs. The
"Settings" tab refuses every save until the name is filled, so "Journal
redirect" and "Reviewer statistics" cannot be changed before it.
Question: should a fresh installation start with a Site Name? Lean: yes,
the application's name, as the principal contact name already does.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Raw codes in the French Site Settings** · 🐞 · minor.
A Site Administrator working in French expects the Site Settings tabs in
French; the "Security" tab and nearly all of its form, a press's
"Information" tab, and the "Courriels en lot" description on a press and
a preprint server show raw codes instead (Rule 23 lists them).
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A log warning on most saves** · 🐞 · invisible.
Each "Save" on "Security", "Information", "Bulk Emails" or "Setup" (and,
read from the code, on "Theme" when it changes the theme) writes a
warning about the missing redirect to the server's log while no "Journal
redirect" is set; the save answers normally and is stored. Nobody using
the page sees it; the log fills with noise that hides real faults.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The site's save does not require its required fields** · 🐞 · latent.
The page refuses an empty "Site Name", "Name of principal contact" or
"Email of principal contact" before sending, but the site's own save
request checks another record's required fields instead of the site's,
so a save made outside the page stores them empty. With an empty contact
address the site's own emails would have no sender.
Basis: code. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Journal home-page fields on the site's "Theme" tab** · ❓ · minor.
The site's "Theme" tab offers the fields that shape a journal's home page
and article pages (Rule 17a lists each app's); saved on the site, they
change nothing the Site Administrator can see.
Question: should the site's tab offer them? Lean: no, show the site only
the fields that change its pages.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A removed site style sheet stays online** · 🐞 · minor.
"Remove" and "Save" on "Site style sheet" take the file off the pages, but
the file is not deleted: it still opens at its old address. A Site
Administrator who removed a sheet expects it gone.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Some side tabs do not survive a reload** · 🐞 · minor.
The page shows an address for every side tab, but a reload on
"Appearance" › "Theme" or "Setup", or on any side tab of "Announcements"
or "Plugins", opens "Site Setup" › "Settings" instead, and so does that
address opened again. The Site Administrator loses their place on every
reload and cannot keep a link to those tabs.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The Site Administrator's sign-in under a redirect misses the Dashboard** · 🐞 · minor.
With a "Journal redirect" saved, the Site Administrator who signs in on the
site's Login page expects that journal's Dashboard, where the sign-in is
meant to send Site Administrators; they land on the journal's home page
instead, like every other account.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A saved theme change does not reach a browser that has seen the site** · ❓ · user-visible.
The Site Administrator saves a new "Colour" or "Typography" on "Theme" and
sees "Saved". A browser that already opened a page at the site's address
keeps the old colour and fonts on the next page and after a reload, while
a browser that never opened the site shows the new look. The Site
Administrator checking the result in the same browser sees no change.
Question: should a saved theme change reach every visitor on their next
load? Lean: yes, a defect: the style sheet's address should change when
the theme's settings do.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The page and the site's address count journals differently** · ❓ · latent.
The page shows its reduced form while the installation hosts exactly one
journal, enabled publicly or not (Rule 2), but the site's address opens a
journal only while exactly one is enabled publicly (Rule 8). With one
journal not yet enabled publicly, the site's home page is public while the
page hides the "Settings", "Information" and "Appearance" tabs that shape
it; with two journals, one of them enabled, the page shows every tab while
the site's own pages cannot be reached. Neither install has been seen on
screen; this is read from the code.
Question: should the page and the address count the same journals? Lean:
yes, both the journals enabled publicly, since those decide whether the
site's own pages can be reached; an install with one journal enabled
publicly and one not would show the difference on screen.
Basis: code. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The "Journal redirect" list has no order** · 🐞 · minor.
The Site Administrator looking for a journal in "Journal redirect"
expects the journals by name, or in the order of Administration ›
"Hosted Journals", which "Bulk Emails" on the same page follows; the
list follows neither. After a new order is kept there with "Order" and
"Done", or a journal is enabled publicly in its "Edit" window, journals
sit at other places in the list, still not in the new order. On a site
with many journals, finding one means scanning the whole list.
Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — An "&" in a journal's name reads "&amp;amp;" in "Journal redirect"** · 🐞 · minor.
A journal named "Alpha & Omega" is offered in "Journal redirect" as
"Alpha &amp;amp; Omega", on the English and French pages alike, while
"Bulk Emails" on the same page and Administration › "Hosted Journals"
show "Alpha & Omega". The Site Administrator reads a name the journal
does not have.
Basis: probe. <sup>f-a12</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press never loads the site style sheet** · 🐞 · user-visible.
The Site Administrator of a press uploads a "Site style sheet", sees it
saved, and no page changes: neither the site's own pages nor any press's
load it, while a journal site and a preprint server load it on every
public page.
Presses loaded it until 2018 (read from the code's history): a regression.
Since: 2018-12-21 · Basis: probe, commit. <sup>f-omp1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — "Reviewer statistics" on a preprint server** · ❓ · minor.
A preprint server has no reviewers, yet its "Settings" tab offers
"Disable aggregated reviewer statistics", which changes nothing there.
Question: should a preprint server offer the box? Lean: no, hide it where
there is no review.
Basis: code. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 on checkouts ojs `3162c105bf`, omp `72a01a026`, ops
`e9f6f4f550`, lib/pkp `1ad4a14bb2`, ui-library `03d1cee2` unless a block
says otherwise. No app overrides the site forms, the site request
controller, the site schema or `templates/admin/settings.tpl`: each app's
`api/v1/site/index.php` mounts lib/pkp's `PKPSiteController` unchanged,
so the shared claims rest on one code path (multi-app rule 8); the app
seams are named where they exist.

<a id="fn-a"></a>
**a** — `PKP\pages\admin\AdminHandler`: the constructor assigns every
Administration op, `settings` included, to `ROLE_ID_SITE_ADMIN` alone;
`authorize()` adds `PKPSiteAccessPolicy` and, for every op but the
confirm pair, `ReauthenticationRequiredPolicy` (the Confirm Access gate,
owned by Login & sessions), then returns false whenever the request
carries a context (`// Admin shouldn't access this page from a specific
context`). The "Site Settings" button is `templates/admin/index.tpl`'s
second `pkp-button` of the "Site Management" panel (`admin.siteSettings`).
Live-probed 2026-09-26 (Actors rows 1–2; Rule 3; all three apps): a
Journal Manager, a Section Editor, an Assistant, a Reviewer (OJS, OMP),
an Author, a Reader and a scratch Journal Manager each got the
access-denied page "The current role does not have access to this
operation." at `index/en/admin` and `index/en/admin/settings`, and none
had an "Administration" link; signed out, the Site Settings address
landed on the site's Login page with the page as its `source`; the Site
Administrator reached the page with no Confirm Access step. Actors row 4
is the sum of Rules 7–21's audiences.

<a id="fn-b"></a>
**b** — `templates/admin/settings.tpl`: `<tabs :track-history="true">`
with the "Site Setup" tab's side tabs `settings`, `security`, `info`,
`languages`, `nav`, `highlights`, `bulkEmails`, `statistics`,
`orcidSiteSettings` (in that order), then `appearance` (`theme`,
`setup`), `announcements` (`announcement-settings`, `announcement-items`,
`announcement-types`) and `plugins` (`installedPlugins`,
`pluginGallery`); each wrapped in `{if $componentAvailability[...]}`.
`AdminHandler::siteSettingsAvailability()`: `$isMultiContextSite =
app()->get('context')->getCount() !== 1` (every context, enabled or not;
the comment says the full page shows with no context too); `siteSetup`,
`languages`, `bulkEmails`, `statistics`, `siteSecurity` always true,
every other key follows `$isMultiContextSite`. Labels: `admin.siteSetup`
"Site Setup", `admin.settings` "Settings", `admin.security` "Security",
`manager.setup.information` "Information" (each app's own locale),
`common.languages`, `manager.navigationMenus` "Navigation",
`common.highlights`, `admin.settings.enableBulkEmails.label` "Bulk
Emails", `manager.setup.statistics`, `orcid.displayName`,
`manager.website.appearance`, `manager.setup.theme`, `navigation.setup`
"Setup", `announcement.announcements`, `manager.announcementTypes`,
`common.plugins`, `manager.plugins.installed`,
`manager.plugins.pluginGallery`. The "Appearance" side tab "Setup" carries
the id `setup`, the same as the "Site Setup" top tab (A7). Rule 2's ends:
fn-o.

<a id="fn-c"></a>
**c** — `lib/ui-library/src/components/Form/Form.vue`: `submit()` runs
`validateRequired()` before any request; a required multilingual field is
checked in the primary locale only and gets `validator.required` "This
field is required." there; server errors come back per field from the
request. `FormPage.vue` shows `form.saved` "Saved" for five seconds after
a success. Each side tab is its own `pkp-form` with its own action, so a
save sends that form's fields alone. The form languages are
`$site->getSupportedLocaleNames()` (`AdminHandler::settings()`).
`DataObject::getLocalizedData()` falls back to the primary locale.
Live-probed 2026-09-26 (Rules 4, 4a, 5; all three apps): "Save" on
"Information" sent its four fields alone, and on "Bulk Emails" the list
alone; "Saved" showed beside "Save", and the site's home and Privacy
Statement pages showed the change on their next load. A save carrying new
"About the Site" text and the address "not-an-address" answered 400 and
stored nothing, read again after a reload; beside "Save" it showed
"Please correct one error. Go to Email of principal contact: This is not
a valid email address. Jump to next error", with the page notice. An
emptied "Site Name", contact name or contact email sent nothing. With
their French boxes empty, the French home page showed the English "About
the Site", "Logo" (with its alternate text) and "Page Footer", and the
French text once one was set; an emptied French contact name saved. An
unsaved change stayed across the side tabs and top tabs and was dropped
without a question once the page was left.

<a id="fn-d"></a>
**d** — `PKPSiteConfigForm`: `title` (`admin.settings.siteTitle` "Site
Name") `isRequired`, `isMultilingual`. `PKPTemplateManager::initialize()`
assigns `displayPageHeaderTitle` = the site's localized title on any page
without a context and `siteTitle` from the site; each app's
`TemplateManager` repeats `siteTitle` in its no-context branch.
`templates/frontend/components/header.tpl`: logo if set, else
`displayPageHeaderTitle` as a text link to `index`, else
`templates/images/structure/logo.png` with the application name as alt
text; on the home page (`requestedPage` empty or `index`) a
`h1.pkp_screen_reader` holds `siteTitle` when there is no context.
Each app's `IndexHandler::index()` passes the site title as
`pageTitleTranslated`, which `headerHead.tpl` prints as the `<title>`.
`templates/layouts/backend.tpl`: `app__contextTitle` links `siteTitle`
to the base URL, else prints `common.software`;
`PKPTemplateManager::smartyTitle()` appends `common.titleSeparator`
" | " and the site title (else `common.software`) to backend page
titles. `SiteEmailVariable`: `{$siteTitle}` and `{$siteSignature}` (the
contact name and the title). `JournalOAI` / the OMP and OPS OAI classes:
`repositoryName` = the site title on the site-wide address. Seen
2026-09-16 (Highlights claim check, all three apps): the "Settings" tab
refused every save until "Site Name" was filled, and the site's home
page's title was empty meanwhile. Seen 2026-09-23 (Navigation menus
claim check, all three apps): the site's home page with no Site Name
carried an empty hidden level-1 heading and an empty title. Seed-facts
(2026-09-02): the test installs' site title is empty in both languages.
Live-probed 2026-09-26 (Fields "Site Name"; Rules 6–7): td3, td4.

<a id="fn-e"></a>
**e** — `PKPSiteConfigForm`: `redirectContextId`
(`admin.settings.redirect`, each app's own wording) is a `FieldSelect`
whose options are a blank entry plus
`app()->get('context')->getMany(['isEnabled' => true])`, added only when
that gives at least one option beyond the blank. Each app's
`IndexHandler::index()`: without a context in the request,
`PKPHandler::getTargetContext()` returns the only enabled context when
there is exactly one, and `getSiteRedirectContext()` when there are two
or more; a target redirects to its path; the site branch checks
`$site->getRedirect()` again before rendering `indexSite.tpl`.
`LoginHandler::_redirectAfterLogin()`: with a target context and a
source-less sign-in by a user whose roles in the request's (site)
context include one of the listed roles (the Site Administrator's), the
redirect goes to `{target}/dashboard`; otherwise
`PKPPageRouter::redirectHome()`, whose site home then redirects to the
target. The list's hidden end rests on the code alone: every test install keeps
its seeded journal enabled. The one-journal end of the site's address was
seen by the test tooling on 2026-09-26 while the seeded journal was the
only one: the address opened it. Live-probed 2026-09-16 (Highlights claim
check, all three apps):
the label reads "Journal redirect" / "Press redirect" / "Server
redirect", blank selected by default; a scratch journal chosen and saved
made the site address open that journal's home; the blank choice saved
again brought the site index back.
Live-probed 2026-09-26 (Fields "Journal redirect"; Rule 8; all three
apps): the description read "journal", "press" and "server" in turn; a
journal seeded not enabled publicly was absent from the list; td5 has the
rest.
Live-probed 2026-09-28 (Fields "Journal redirect"; all three apps, two
runs, as `admin`, with four scratch journals whose name, path and
creation orders all differ): the blank first choice was selected, and
the options equalled the journals enabled publicly, each under its name
and never its path. A scratch journal not enabled publicly was absent,
offered once "Enable this journal to appear publicly on the site" was
ticked and saved in its Hosted Journals "Edit" window, and gone again
once unticked and saved. On the French page (`index/fr_CA/admin/settings`)
the label read "Réacheminement vers la revue" / "Réacheminement de la
presse" / "Réacheminement vers le serveur"; a journal with a French name
was listed under it, the others under their English names (English
being their primary language). The order: f-a11; the "&": f-a12.

<a id="fn-f"></a>
**f** — `PKPSiteConfigForm`: `disableSharedReviewerStatistics`
(`admin.settings.sharedReviewerStatistics` "Reviewer statistics",
option `…disable` "Disable aggregated reviewer statistics").
`PKP\user\Collector::buildReviewerStatistics()` (reviewer searches set
`includeReviewerData`): the per-reviewer sub-query over
`review_assignments` (last assigned, incomplete, complete, declined,
cancelled counts, average days, rating) joins `submissions` and filters
by the collector's context ids only while the site setting is true.
OPS installs no review stage, so no reviewer search reads it; the box is
still built by the shared form.
Live-probed 2026-09-26 (Fields "Reviewer statistics"; Rule 9; OPS1):
td6.

<a id="fn-g"></a>
**g** — `PKPSiteSecurityForm`: groups `passwordPolicyGroup`
(`admin.settings.security.passwordPolicy` "Password Policy") and
`rateLimitGroup` (`…rateLimit` "Rate Limiting", with its description);
`minPasswordLength` `isRequired`; `passwordUncompromisedEnabled`;
`rateLimitEnabled`, with `rateLimitMaxAttempts` and
`rateLimitDecaySeconds` under `showWhen: 'rateLimitEnabled'`, valued
`RateLimitingService::DEFAULT_MAX_ATTEMPTS` (5) and
`DEFAULT_DECAY_SECONDS` (300) when unset. `lib/pkp/schemas/site.json`:
`minPasswordLength` integer `min:4`; `rateLimitMaxAttempts` integer
nullable `min:1`; `rateLimitDecaySeconds` integer nullable `min:60`.
`PKPBaseController::convertStringsToSchema()` turns digits into an
integer and leaves anything else for the `integer` rule
(`validator.integer` "This is not a valid integer."); `validator.min.numeric`
"This must be at least {$min}.". `RateLimitingService` keys sign-in
attempts by username and network address and reset requests by network
address and email. The uncompromised check is `Password::uncompromised()`
bound to a verifier that refuses nothing unless the site setting is on
(`validator.password.uncompromised`); `ValidationServiceProvider` checks
against `lib/pkp/registry/blacklistedPasswords.txt` when the file exists
and against Have I Been Pwned (`NotPwnedVerifier`) otherwise. The file is
ignored by lib/pkp's version control, and none of the three test installs
has it. The box's description reads "Passwords are verified against a
database of known compromised passwords. Verification uses a local
blacklist file (lib/pkp/registry/blacklistedPasswords.txt) if available,
otherwise it falls back to the Have I Been Pwned API service using the
k-Anonymity model to protect user privacy." An emptied rate-limit box
stores nothing, so the defaults show again. A saved minimum is read when
a password is chosen, not at sign-in. Live-probed 2026-09-26 (Fields
"Security"; Rules 10–12a; all three apps): td7 and td8; ticked, Profile ›
Password and the site's Register page refused `qwerty123456` with the
data-leak sentence and accepted a strong password, the internet
reachable; unticked, both accepted it. The check with no internet
connection was not driven.

<a id="fn-h"></a>
**h** — `PKPSiteInformationForm`: `about` (`admin.settings.about`),
`contactName` and `contactEmail` (`admin.settings.contactName` /
`…contactEmail`, both `isRequired`, `isMultilingual`),
`privacyStatement`. `site.json`: `contactEmail` `email_or_localhost`
(`validator.email` "This is not a valid email address."); `contactName`
`defaultLocaleKey: common.software`. `PKPInstall` sets `contactEmail` to
the installer's admin email in the primary locale and never a title.
Each app's `indexSite.tpl`: highlights, then `.about_site` (`{if
$about}`), then the announcements list, then the context list.
No test install has a site highlight or announcement, so only "above
the list of journals" has been seen (Rule 13).
`pages/about/index.php` sends the site-level `index` op to
`AboutContextHandler`, whose `ContextRequiredPolicy` denies it without a
context: signed out it sends to Login, signed in to the access-denied
page with `user.authorization.contextRequired`. `LoginHandler` (lost password) sends `PasswordResetRequested`
from the site's contact; `ValidateRegisteredEmail::manageEmail()` sends
the site registration's mail from the site's contact. `AboutSiteHandler::privacy()`
shows the site statement at the site level and 404s when it is empty.
Live-probed 2026-09-26 (Fields "Information"; Rules 13–15): td9, td10.
Seed-facts: the
password reset email comes from the application's name and
`admin@mail.test` on the test installs (2026-09-23); the site has no
privacy statement (2026-09-02).

<a id="fn-i"></a>
**i** — `PKPSiteBulkEmailsForm`: `enableBulkEmails`
(`admin.settings.enableBulkEmails.label` "Bulk Emails") options from
`app()->get('context')->getManySummary()` (every context), the value the
site's `enableBulkEmails` list; description
`admin.settings.enableBulkEmails.description` (each app's own wording)
with `{$hostedContextsUrl}` = `admin/contexts` at the site. Seen
2026-09-26 (Notify users claim check, all three apps): the description
ends with the "Further restrictions…" sentence, "Hosted Journals" /
"Hosted Presses" / "Hosted Servers". The Notify users harness
(2026-09-26) found the screen's "Save" posts the whole list as the page
loaded it.
Live-probed 2026-09-26 (Fields "Bulk Emails"; Rule 16): td11.

<a id="fn-j"></a>
**j** — `AdminHandler::settings()` builds `PKPThemeForm` with the
`site/theme` request and no context, so the active theme is the site's
`themePluginPath` and option values are read for the site
(`SITE_CONTEXT_ID`). `PKPSiteController::editTheme()` validates a
changed theme, saves each option the theme declares for the site, then
clears the template and CSS caches. Each app's
`DefaultThemePlugin::init()` declares every option whatever the request's
context: `typography`, `baseColour` (both compiled into the site's
style sheet), `showDescriptionInJournalIndex`,
`journalContentOrganization` (OJS), `useHomepageImageAsHeader` (read only
with a context's homepage image) and `displayStats` (read on landing
pages). `indexSite.tpl` reads none of the last four. Only `default` sits
in `plugins/themes` of each checkout.
OMP's default theme adds "Show Series"; OPS's has no content
organization option. Live-probed 2026-09-26 (Fields "Theme"; Rules
17–17b): td12.

<a id="fn-k"></a>
**k** — `PKPSiteAppearanceForm`: `pageHeaderTitleImage`
(`manager.setup.logo`, `FieldUploadImage`, per language),
`pageFooter`, `sidebar` (orderable, options from
`PluginRegistry::loadCategory('blocks', true)` at the site),
`styleSheet` (`admin.settings.siteStyleSheet`, `acceptedFiles: .css`).
`PKPTemplateManager::initialize()` assigns `displayPageHeaderLogo` from
the site's image on pages without a context, `hasSidebar` from the
site's `sidebar` there, and `displaySidebar()` renders the site's list.
Each app's `TemplateManager::initialize()` assigns `pageFooter` from the
site in its no-context branch. OJS's and OPS's `TemplateManager` add the
site's style sheet (`siteStylesheet`, `STYLE_SEQUENCE_LATE`, the
`frontend` context by default) on every page, journal pages included;
OMP's adds only the press's own. Seed-facts (2026-09-24): the site's
"Page Footer" bar has no picture button. Seen 2026-09-26 (Web feeds claim
check, all three apps): the site's "Sidebar" offered "Language Toggle
Block", and "Web Feed Plugin" beside it once that plugin was enabled for
the site.
Live-probed 2026-09-26 (Fields "Setup"; Rules 18–21; all three apps):
td13 to td16; a moved "Sidebar" row stayed moved after a reload; a PNG put
in "Site style sheet" was refused before sending with "You can't upload
files of this type.".

<a id="fn-l"></a>
**l** — `PKP\API\v1\site\PKPSiteController`: route group middleware
`has.user` and `roleAuthorizer([ROLE_ID_SITE_ADMIN])`; `GET` and `PUT`
on `site` and `site/theme`. `edit()` runs `convertStringsToSchema()`,
then `PKPSiteService::validate()`: schema rules (formats, `min`),
allowed locales, temporary-file ownership, sidebar blocks and theme
existence, and `ValidatorFactory::required()` fed
`getRequiredProps(SCHEMA_PUBLICATION)` and
`getMultilingualProps(SCHEMA_PUBLICATION)`, so the site schema's
`required` list (`title`, `contactName`, `contactEmail`) is never
checked.
No screen sends these requests as another account, or with an empty
required field. The other-account half of Actors row 3 and Rule 22 was
seen in scenario 1's test run, where a Journal Manager's save sent
directly was refused on all three apps (fn-s); the empty-field half is
read from the code. The test tooling's own site request, which passes the same check,
stored an empty Site Name on all three apps (2026-09-26). Live-probed
2026-09-26 (Rule 22; all three apps): every save was a `POST` to
`index/api/v1/site` (or `site/theme`) with `X-Http-Method-Override: PUT`,
answered 200 for the Site Administrator; the server refused Rule 10's 3,
"abc", 4.5 and -1, Rule 12's 0 and 59, and "not-an-address" with 400 and
stored nothing.

<a id="fn-m"></a>
**m** — `PKPSiteService::edit()`: after `SiteDAO::updateObject()`,
`AuditLog::log(AuditEvent::SITE_SECURITY_UPDATE, …, ['changedKeys' =>
…])` when any of the five security keys changed; `AuditLog::log()`
returns at once unless the configuration's `[logs] log_audit` is on
(fn-n). `editTheme()`:
`clearTemplateCache()` and `clearCssCache()`. `_saveFileParam()` moves an
uploaded temporary file into the site's public files (`moveTemporaryFile()`,
named after the setting) and, for a null value, calls
`PublicFileManager::removeSiteFile()` with the image's `uploadName`, or
for the style sheet with the whole stored value (an array), which names
no file. `SiteDAO::updateObject()` reads each primary column from the
sanitized props, and `redirectContextId` is absent there while no
redirect is set, except on "Settings", whose save posts it (empty or a
journal); `editTheme()` reaches it only when the theme itself
changes (option values go to the theme plugin's own settings). None of
these paths sends mail or writes a notification
or event log.
Live-probed 2026-09-26 (Side effects; all three apps): a 6 → 7 → 6
"Security" change added no line to the application's log. Before a
"Theme" save the cache held the site's and journals' compiled style sheets
(OJS 24 files, OMP 18, OPS 17) and 90–97 compiled templates; after it, no
style sheet and 1 to 45 templates. A saved logo appeared at
`/public/site/pageHeaderTitleImage_en.png` (200), and "Remove" and "Save"
deleted it (404); a saved style sheet at `/public/site/styleSheet.css`
still answered 200 after its removal. Each "Security", "Information",
"Bulk Emails" and "Setup" save logged `PHP Warning: Undefined array key
"redirectContextId"` paired with its `POST …/api/v1/site 200`; a
"Settings" save and a "Theme" save that kept the theme logged none, and
no save did while a redirect was set. Across 16 saves per app no email
reached the mail catcher and no notification, event-log or email-log row
was written.

<a id="fn-n"></a>
**n** — The installation's configuration file (`config.test.inc.php` on
the test installs) is read by the server; no screen shows or changes it,
so its other ends are read from the code. On the test installs, as in
`config.TEMPLATE.inc.php`, `password_timeout` is commented out (no Confirm
Access step), `sitewide_privacy_statement` is `Off` and `[logs]
log_audit` is commented out. Live-probed 2026-09-26 (Settings bullet 17;
all three apps): the Site Administrator reached Administration and Site
Settings with no Confirm Access step, and the seeded journal's Privacy
Statement page showed the journal's own statement.

<a id="fn-o"></a>
**o** — `AdminHandler::siteSettingsAvailability()` counts every context
(fn-b); `PKPHandler::getTargetContext()` counts the enabled ones (fn-e).
Live-probed 2026-09-16 and 2026-09-23 (Rule 2; Highlights and Navigation
menus claim checks, all three apps): with the seeded journal the only
one, the page showed "Site Setup" alone with "Security", "Languages",
"Bulk Emails" and "Statistics", and the other tabs appeared once a second
journal existed. The ends where a journal is not enabled publicly, and
the site with none, are read from the code: the test installs host 24
journals, 10 presses and 10 servers, and a journal cannot be removed.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS except
scenario 10 (OJS, OMP) and scenario 11 (OJS, OPS). The site's settings
are one record every worker and scratch context reads (`scenarios.md`
"`POST site`"), so each scenario is `@solo` and puts back what it
changed in a `finally`, even when it fails midway (PRINCIPLES A7, A9);
the base journal stays at its defaults. The Site Administrator is the
installer's `admin` (password `admin`, `docs/process/users.md`). Scratch
journals (presses, preprint servers) come from `POST scenarios/context`
with throwaway `users[]` (password the username twice unless `password`
gives one; email `<username>@mail.test`); a scratch context beside
`publicknowledge` is what makes the site's address open the site's home
page. "Site Name" is set with `pkpApi.setSite({title: …})` where a given
holds one (scenarios 3 and 10: the "Settings" tab refuses every save
without it, A1) and put back with `pkpApi.setSite({title: ""})`, the
install state no screen returns to (scenarios 2, 3, 10); every other
field is put back through the site's own save as `admin` (`PUT
index/api/v1/site`, `PUT index/api/v1/site/theme`). The site's addresses:
home `index/index`, Login `index/login`, About `index/about`, Privacy
Statement `index/about/privacy`, Site Settings `index/admin/settings`.
Scenario 1: one context with a `manager`; the direct save is the
"Settings" tab's own request, a `POST index/api/v1/site` with
`X-Http-Method-Override: PUT` and the tab's form body
(`title[en]=Not the site&title[fr_CA]=&redirectContextId=&disableSharedReviewerStatistics=false`),
sent with the Journal Manager's session and the CSRF token of their own
Dashboard (`pkp.currentUser.csrfToken`), the one request of this spec no
screen sends as that account (fn-l). Test run 2026-09-26 (Actors row 3,
Rule 22; scenario 1; all three apps): it answered 401
`user.authorization.roleBasedAccessDenied` ("The current role does not
have access to this operation."), a JSON body `{title: {en: "Not the
site"}}` got the same answer on OJS, and the Site Name read back empty
as the Site Administrator; the suites assert a 4xx refusal and the empty
Site Name. Scenario 3: the first context with a `reader`, the second
with `context.enabled: false`. Scenario 4: Quinn Ashdown, `reader`, with
`password: 'Kq7vz2'`; `qwerty123456` is refused through Have I Been
Pwned, so the test needs the internet (fn-g); the Profile › Password
boxes carry a 32-character limit (users.md "Maxlength trap"). Scenario
5: Rui Tanaka and Nova Reyes, `reader`s of one context. Scenario 6:
Quinn Ashdown, `reader`; the reset email is read in the mail catcher,
Mailpit at `http://127.0.0.1:8025`, scoped by Quinn's address; the
contact is put back to the application's name and `admin@mail.test`
(seed-facts). Scenario 7: two contexts, each with a `manager` and
without `bulkEmails`; the ticked one stays listed and ticked until the
fleet is reset, which touches no other test (`scenarios.md`
`bulkEmails`). Scenario 8: the visitor is a new browser context that has
loaded no page at the site's address (A9); "Typography" and "Colour" are
put back to "Noto Sans" and `#1E6292` (seed-facts). Scenario 9:
`logo.png` is a small PNG fixture. Scenario 10: context A holds the
throwaway `reviewer` and a submission whose `reviewRounds[]` names them
with `status: 'completed'`; context B names the same username again with
`roles: ['reviewer']` (the account exists, so the role is added) beside
a `manager` and a submission sent to review with `decisions:
['sendExternalReview']`. Scenario 11: `site.css` is a one-rule style
sheet fixture; the file stays at `public/site/styleSheet.css` after
"Remove" (A6), so a test reads the page's link to it, not the file.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-26 (Rule 1; all three apps, two runs): the
page is headed "Site Settings", its browser tab reads "Site Settings |
Open Journal Systems" (Open Monograph Press, Open Preprint Systems), and
its tabs and side tabs are those of the table, in that order; a preprint
server's "Site Setup" lists "Information". Each top tab and each "Site
Setup" side tab reopened after a reload and when its address was typed;
the other side tabs did not (f-a7).

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-26 (Rule 3; all three apps): the Site
Administrator at `{journal}/admin/settings` and `{journal}/admin`, for the
seeded journal and a scratch one, got the access-denied page "Access
denied."; a Journal Manager at the site's address got "The current role
does not have access to this operation."; signed out, the site's address
landed on the site's Login page and a journal's on that journal's.
`index/admin/settings` with no language opens `index/en/admin/settings`.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-26 (Rule 6; all three apps, three runs):
with "Site Name" empty and a scratch journal chosen under "Journal
redirect", "Save" showed "This field is required." under "Site Name" and
sent nothing; after a reload the redirect read blank. The French box
alone filled was refused the same way. No test install had a site title
before the drive.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-26 (Rule 7; all three apps): with no Site
Name, the site's home page had an empty browser title and hidden heading,
and its header, like those of the site's Login, Register and Reset
Password pages, showed the application's logo with the application's name
as its description, linked to the site's home page; Administration's
editorial header read the application's name as plain text and the tab
"Site Settings | Open Journal Systems" (and the OMP and OPS names). With
a name saved, the title and hidden heading read it, the header was a text
link to the site's home page, the editorial header a link there, and the
tab "Site Settings | {name}"; on the page where it was saved the editorial
header and tab changed on the next load. The site-level "Password Reset
Confirmation" read "…reset your password for the  web site." without a
name and "…for the {name} web site." with one; the site-wide harvesting
answer's `repositoryName` went from empty to the name.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-26 (Rule 8; A8; all three apps, three
runs): a scratch journal chosen and saved made `index`, `index/en/index`,
`index/index/index` and the bare base address open its home page, while
the site's Login and Register pages stayed at the site's address; signing
in there landed every account on the journal's home page (f-a8); the
blank choice saved again brought the site's home page back.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-26 (Rule 9; OPS1; all three apps): a
throwaway reviewer with one completed review in scratch journal A, named
in scratch journal B. In B's "Add Reviewer" (OJS, OMP), unticked: "1
Reviews completed" and "0 Days since last review assigned"; ticked and
saved: "0 Reviews completed" and "Never assigned"; unticked again: 1. The
details also list active reviews, declined and cancelled requests and
average days; no rating showed, the seeded review carrying none. On OPS
the box is offered and saves, and a preprint's workflow has no "Add
Reviewer".

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-26 (Rule 10; all three apps): 3 gave
"This must be at least 4."; "abc" gave "This is not a valid integer." and
"This must be at least 4."; 4.5 gave "This is not a valid integer."; -1
"This must be at least 4."; emptied, "This field is required." with
nothing sent; 4 saved. Saved at 8, a 7-character password was refused
with "The password must be at least 8 characters." on Profile › Password,
the site's Register page, the emailed reset link's page and an
invitation's account step, and an 8-character one accepted; a password of
6 characters chosen at 6 still signed in. The box is a plain text box.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-26 (Rules 12–12a; all three apps, two
runs): ticked, the two boxes showed 5 and 300; 0 and 59 were refused with
"This must be at least 1." and "This must be at least 60."; 2 and 60
saved and read again after a reload. After two failed sign-ins by one
throwaway account the right password was refused with "Invalid
username/email or password. Please try again.", a second account from the
same address signed in, and about 60 seconds later the right password
signed in; three reset requests for one address showed the same
confirmation page and only two emails arrived. Both boxes emptied and
saved showed "Saved" and read 5 and 300 after a reload.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-26 (Rule 13; all three apps): the saved
text stood above the list of journals (presses, servers) on the site's
home page and was gone once emptied; the site's About address sent a
signed-out visitor to the Login page (with the address as its `source`)
and the Site Administrator to `user/authorizationDenied` with "You cannot
call this operation without a context (press, journal, conference,
etc).".

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-26 (Rules 14–15; all three apps): the
contact name was the application's name in English and French and the
email `admin@mail.test`. After a new name and address were saved, the
"Password Reset Confirmation" requested on the site's Login page and the
"Validate Your Account" email of a site registration came from them, and
the site-wide harvesting answer's `adminEmail` changed; "not-an-address"
was refused. With no statement the site's Privacy Statement page answered
"404 Not Found" and the site's Register page had no consent box; set, the
page showed the heading "Privacy Statement" and the text (in French under
"Déclaration de confidentialité"), and Register gained "Yes, I agree to
have my data collected and stored according to the privacy statement.",
its link opening the site's Privacy Statement page; emptied, both went
back.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-26 (Rule 16; all three apps): the list
held a box for every hosted context, a scratch one not enabled publicly
included; none was ticked on OMP and OPS (the OJS test install had
scratch journals ticked by earlier runs). A scratch journal ticked and
saved stayed ticked after a reload, and its Journal Manager's Users &
Roles gained "Notify" between "Roles" and "Site Access Options"; unticked
and saved, it was gone. The description warns "Misuse of this feature to
send unsolicited email may violate anti-spam laws…" and ends as quoted,
and its link opened Administration › "Hosted Journals" in the same
tab.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-26 (Rules 17–17b; all three apps): the
site's tab offered the same fields as a journal's; "Colour" #8B0000 with
"Lato" turned the header and fonts of the site's home and Login pages,
read in a browser that had not opened the site, and left two journals and
the Administration screens as they were; every home-page field changed
and saved left the site's home and Login pages identical; a browser that
already had a site page open kept the old look (f-a9).

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-26 (Rule 18; all three apps): the logo
with its alternate text stood in the header of the site's home, Login and
French home pages, linked to the site's home page; the journals kept their
own names; removed and saved, the Site Name came back where one was set
and the application's logo where none was, and the picture's old address
answered 404.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-26 (Rule 19; all three apps): the
sentence showed at the foot of the site's home, Login and French home
pages and on no journal page; a journal's own footer showed on its own
pages; the toolbar is Bold, Italic, Superscript, Subscript, Insert/edit
link.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-26 (Rule 20; all three apps): a fresh
site offered "Language Toggle Block" alone, unticked; ticked and saved, it
showed on the site's home, Login and French home pages only; with
"Developed By" Block enabled for the site, the order and the disabled
plugin behaved as Appearance & theming's Rules 23–25 say, the untouched
save refused with the block's internal name.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-26 (Rule 21; all three apps): OJS and OPS
loaded the sheet last, after the theme's own, on the site's and the
journals' public pages and on no editorial screen; OMP loaded it nowhere;
"Remove" and "Save" took it off the pages, and `/public/site/styleSheet.css`
still opened (200).

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-26 (Rule 23; A2; all three apps, two
runs): the codes on "Security" are `##admin.settings.security.passwordPolicy##`,
`##admin.settings.security.passwordUncompromised##` with its
`.description` and `.enable.label`, and `##admin.settings.security.rateLimit##`
with its `.description`, `.enable` and `.enable.label`; OJS's "Courriels en
lot" description is French. The other side tabs read "Paramètres",
"Information" (OJS, OPS), "Langues", "Menus de navigation", "En vedette",
"Courriels en lot", "Statistiques" and "Plugiciel de profil ORCID".

<a id="fn-f-a1"></a>
**f-a1** — `PKPInstall::createData()` inserts the site with no `title`
and sets only `contactEmail`; `site.json` gives `contactName` a
`defaultLocaleKey` and `title` none. The install form
(`lib/pkp/templates/install/install.tpl`) asks for the administrator
account, languages, time zone, files and database settings, the OAI
repository identifier and the beacon box, and no site name. The symptoms were seen 2026-09-16
(Highlights claim check) and 2026-09-23 (Navigation menus claim check),
all three apps, and the empty name in site mail on 2026-09-02
(Registration claim check: "an account with , but…"); fn-d has the
templates.

<a id="fn-f-a2"></a>
**f-a2** — Live-probed 2026-09-26 (all three apps, two runs; td17);
first seen 2026-09-24 (sync claim check, French). `lib/pkp/locale/fr_CA/admin.po`
has no `admin.security` nor the `admin.settings.security.*` keys; OMP's
`locale/fr_CA/manager.po` has an empty `manager.setup.information`.

<a id="fn-f-a3"></a>
**f-a3** — Seen 2026-09-26 in the Notify users test runs (OJS, OMP,
OPS): each save of the "Bulk Emails" list, on screen and through the same
site service, logged `PHP Warning: Undefined array key
"redirectContextId"` (`SiteDAO::updateObject()`); the save answered 200
and stored the list. fn-m has the cause; the same path serves every tab.
Live-probed 2026-09-26 (Side effects; all three apps): fn-m lists which
saves logged it.

<a id="fn-f-a4"></a>
**f-a4** — fn-l: `PKPSiteService::validate()` passes the publication
schema's required and multilingual props to
`ValidatorFactory::required()`. No screen reaches it: the page refuses
first (fn-c), and only a direct request gets there; fn-l has the test
tooling's request that stored an empty Site Name.

<a id="fn-f-a5"></a>
**f-a5** — fn-j: the default theme declares its home-page and
landing-page options for the site too, and the site's pages read none of
them. Live-probed 2026-09-26 (Rule 17a; all three apps): every one of
these fields changed and saved ("Saved", kept after a reload) left the
site's home and Login pages identical; OMP's tab offers "Press Summary"
and "Show Series", OPS's "Server Summary", and neither "Journal Content
Organization".

<a id="fn-f-a6"></a>
**f-a6** — fn-m: `_saveFileParam()` passes the stored style-sheet value,
an array, to `removeSiteFile()`, which builds a path ending "Array" and
deletes nothing; the logo passes its `uploadName` and is deleted.
Live-probed 2026-09-26 (Rule 21; all three apps, OMP included): after
"Remove" and "Save", `/public/site/styleSheet.css` still answered 200 with
the file's text (td16).

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-26 (Rule 1; all three apps, two runs
each): a click wrote `#theme` and `#setup` for "Appearance" › "Theme" and
"Setup", and `#announcement-settings`, `#announcement-items`,
`#announcement-types`, `#installedPlugins` and `#pluginGallery`; each,
reloaded or typed, opened "Site Setup" › "Settings". `#appearance`,
`#announcements` and `#plugins` reopened their tab on its first side tab,
and `#settings` … `#orcidSiteSettings` their side tab. Typed, the forms
`#setup/settings` … `#setup/bulkEmails` and `#appearance/theme` opened
their side tab, `#appearance/setup` "Site Setup" › "Settings". fn-b: the
"Appearance" side tab "Setup" shares the id `setup` with the "Site Setup"
top tab.

<a id="fn-f-a8"></a>
**f-a8** — `LoginHandler::_redirectAfterLogin()`: with a target context
and a sign-in without a `source`, a user whose roles at the site include
one of the listed roles (the Site Administrator's among them) is sent to
`{target}/dashboard`; otherwise `PKPPageRouter::redirectHome()` (fn-e).
Live-probed 2026-09-26 (Rule 8; all three apps, three runs): with a
scratch journal as the redirect, the Site Administrator, that journal's
Journal Manager and a Reader of another journal each signed in at the
site's Login page, the form's `source` empty, and each landed on the
journal's home page.

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-26 (Rule 17b; Side effects; all three
apps, two runs): with the site's home page open in one browser, "Colour"
#8B0000 was saved on "Theme"; that browser's next page, the home page
again and a reload kept the old header colour, while a browser that had
never opened the site showed rgb(139, 0, 0); a second run with #123456
behaved the same. The compiled sheet (`css?name=stylesheet`) is served
with a Last-Modified date and no Cache-Control, at an address that does
not change with the theme's settings, so the browser keeps its copy for a
while that grows with the sheet's age; the cache files themselves were
emptied (fn-m).

<a id="fn-f-a10"></a>
**f-a10** — fn-o: `AdminHandler::siteSettingsAvailability()` tests
`getCount() !== 1` over every context, and `PKPHandler::getTargetContext()`
returns the only enabled context. No screen of the test installs reaches
either state.

<a id="fn-f-a11"></a>
**f-a11** — `PKPSiteConfigForm` reads the journals through
`app()->get('context')->getMany(['isEnabled' => true])`, whose query
(`PKPContextQueryBuilder::getQuery()`) has no ORDER BY, while Hosted
Journals (`ContextDAO::getAll()`, `ORDER BY seq`) and "Bulk Emails"
(`getManySummary()`, `orderBy('c.seq')`) sort by the site's order; no
app overrides the form. Live-probed 2026-09-28 (Fields "Journal
redirect"; all three apps, two runs, the lists 514 to 644 journals long):
scratch journals created as Zulu, Alpha & Omega, Mike were listed Mike,
Zulu, Alpha (OJS, second run) or Zulu, Alpha, Mike (every other read).
After Mike was dragged above Zulu under "Order" and "Done" pressed
(Hosted Journals then reading Mike, Zulu, Alpha), the list still read
Zulu, Alpha, Mike, and the three moved together to other places in it.
After the Hosted Journals order was put back, it read Zulu, Mike, Alpha.
A fourth journal, above the three in Hosted Journals, came after all
three once enabled publicly in its "Edit" window. On every read the list
matched the database's storage order of the enabled journals, and never
name, id or the site's order; "Bulk Emails" matched the Hosted Journals
order on every read. On the PostgreSQL test installs the storage order
moves whenever a journal's row is written. Every load of Site Settings
in the drive also saw the "Plugin Gallery" list fail with a server
error, which this list does not cause
([Plugins management](U62-plugins-management.md#a1), A1).

<a id="fn-f-a12"></a>
**f-a12** — `PKPSiteConfigForm` passes each journal's name through
`htmlspecialchars()` into the option's label, which the page prints as
text, so the name is escaped twice. Live-probed 2026-09-28 (Fields
"Journal redirect"; all three apps, two runs, English and French pages):
the option read `Alpha &amp; Omega …`, the only option whose text
differed from its Hosted Journals name, while "Bulk Emails" read
`Alpha & Omega …`; the drive of f-a11.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP's `TemplateManager::initialize()` has no
`siteStylesheet`; OJS's and OPS's add it. OMP commit `88d8a4812`
(2018-12-21, pkp/pkp-lib#3594 "Add entity schema, Context API, and
Vue.js forms") removed the old `getSiteStyleFilename()` block and added
nothing in its place; the site form still uploads and stores the file.
Live-probed 2026-09-26 (Rule 21; OMP): the sheet saved, reloaded as
"styleSheet.css" and opened at its address, and no page of the site or of
a press loaded it (td16).

<a id="fn-f-ops1"></a>
**f-ops1** — fn-f: the box is built by the shared `PKPSiteConfigForm` on
every app; OPS has no review stage and no reviewer search.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Administration › "Site Settings" | `index/admin` → `index/admin/settings` | AFFM-184 |
| "Site Setup" › "Settings" | `index/admin/settings#settings` (typed, `#setup/settings` opens it too) | AFFM-211 |
| "Site Setup" › "Security" | `index/admin/settings#security` (`#setup/security`) | AFFM-212 |
| "Site Setup" › "Information" | `index/admin/settings#info` (`#setup/info`) | AFFM-213 |
| "Site Setup" › "Bulk Emails" | `index/admin/settings#bulkEmails` (`#setup/bulkEmails`) | AFFM-220 |
| "Appearance" › "Theme" | `index/admin/settings#theme`, which reopens "Site Setup" › "Settings" (A7); typed, `#appearance/theme` opens it | AFFM-223 |
| "Appearance" › "Setup" | `index/admin/settings#setup`, shared with "Site Setup", which reopens "Site Setup" › "Settings" (A7); `#appearance/setup` does the same | AFFM-224 |
| "About the Site" on the site's home page | `index/index` (`indexSite.tpl`, `.about_site`) | AFFR-021 |
| The site's own requests | `GET`/`PUT index/api/v1/site`, `GET`/`PUT index/api/v1/site/theme` | API-035 |
| The site record | `lib/pkp/schemas/site.json` | SET-024 |
| The Administration handler's `settings` op (rider; the handler is *System administration & jobs*') | `PKP\pages\admin\AdminHandler::settings()` | ROUTE-003 |
| The Administration page container (rider; *System administration & jobs*') | `lib/ui-library/src/components/Container/AdminPage.vue` | VUE-015 |

## Reference — code anchors

- **Page**: `lib/pkp/pages/admin/AdminHandler.php` (`settings()`,
  `siteSettingsAvailability()`, `authorize()`);
  `lib/pkp/templates/admin/settings.tpl`, `admin/index.tpl`;
  `lib/ui-library/src/components/Container/AdminPage.vue`.
- **Forms**: `lib/pkp/classes/components/forms/site/PKPSiteConfigForm.php`,
  `PKPSiteSecurityForm.php`, `PKPSiteInformationForm.php`,
  `PKPSiteBulkEmailsForm.php`, `PKPSiteAppearanceForm.php`;
  `lib/pkp/classes/components/forms/context/PKPThemeForm.php`;
  `lib/ui-library/src/components/Form/Form.vue`, `FormPage.vue`.
- **Requests and storage**: `lib/pkp/api/v1/site/PKPSiteController.php`;
  `<app>/api/v1/site/index.php`;
  `lib/pkp/classes/services/PKPSiteService.php`;
  `lib/pkp/classes/site/SiteDAO.php`, `Site.php`;
  `lib/pkp/schemas/site.json`; `lib/pkp/classes/install/PKPInstall.php`.
- **Where the settings act**: `<app>/pages/index/IndexHandler.php`;
  `lib/pkp/classes/handler/PKPHandler.php` (`getTargetContext()`,
  `getSiteRedirectContext()`); `lib/pkp/pages/login/LoginHandler.php`;
  `<app>/templates/frontend/pages/indexSite.tpl`;
  `lib/pkp/templates/frontend/components/header.tpl`, `headerHead.tpl`;
  `lib/pkp/templates/layouts/backend.tpl`;
  `lib/pkp/classes/template/PKPTemplateManager.php`;
  `<app>/classes/template/TemplateManager.php`;
  `lib/pkp/classes/user/Collector.php` (`buildReviewerStatistics()`);
  `lib/pkp/classes/security/RateLimitingService.php`;
  `lib/pkp/classes/mail/variables/SiteEmailVariable.php`;
  `lib/pkp/classes/observers/listeners/ValidateRegisteredEmail.php`;
  `lib/pkp/pages/about/AboutSiteHandler.php`, `AboutContextHandler.php`;
  `<app>/plugins/themes/default/DefaultThemePlugin.php`.
