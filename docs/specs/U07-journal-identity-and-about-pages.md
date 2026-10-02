---
name: journal-identity-and-about-pages
status: verified
---

# Journal identity & about pages {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal describes itself to the world in two places. A Journal Manager
fills in the journal's identity on Settings › Journal (the "Masthead" tab:
title, initials, publishing details, editorial history, summary and the
"About the Journal" text; the "Contact" tab: the principal contact and the
technical support contact) and its reader-facing texts on Settings ›
Website › Setup (the "Information" texts for readers, authors and
librarians, and the "Privacy Statement"). Readers consult the result on
the public About pages: "About the Journal", "Editorial Masthead" (the
current team, listed from the journal's roles, or the journal's own
editorial history text when it turns that list off, and last year's peer
reviewers when it turns them on), "Editorial History" (past members), "Contact", "Privacy
Statement", the three Information pages with their sidebar block, and the
page about the publishing software. This spec is also the home of what the
Settings pages share: who may open them, how they are reached, and which
feature describes each of their tabs. <sup>a</sup>

A preprint server has no "Information" tab, no Information pages and no
Information block; its other About pages and both Settings tabs are as on
a journal [OPS1](#ops1). <sup>v</sup>

## Actors & permissions

<a id="settings-access"></a>
**Who opens the Settings pages.** "Manager-level roles" below are the roles
whose row on Settings › Users & Roles › Roles reads "Journal Manager"
("Press Manager" on a press, "Manager" on a preprint server) for its
permission level: on a journal or press the Journal Manager, the Editor
and the Production Editor; on a preprint server the Preprint Server
Manager alone. A manager-level role
opens the Settings pages only while its row has "Permit changes to
Settings" ticked. Every default manager-level role has it ticked; the
Journal Manager's row offers no "Edit", so it keeps it, while the Editor
and Production Editor rows can lose it (Settings bullet 1). The Site
Administrator holds a manager role in every journal of the test installs,
so on those installs the administrator is a manager-level role like any
other. Readers need no account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the Settings pages** (side menu "Settings" › "Journal", "Website", "Workflow", "Distribution", "Users & Roles"; Rule 1) | • manager-level roles of that journal with "Permit changes to Settings"<br>• Site Administrator: on a journal, always, with or without a manager role there; on a press or preprint server only through a manager-level role held there: an administrator without one is offered "Settings" in the side menu and every Settings page answers the access-denied page ⚠ [A1](#a1)<br>• a manager-level role without "Permit changes to Settings": no "Settings" group in the side menu; a Settings address answers the access-denied page ("The current role does not have access to this operation."), the same page every other refused role gets<br>• Section Editor, Assistant, Author, Reviewer, Reader: no "Settings" group; a Settings address answers the same access-denied page<br>• signed out: a Settings address shows the Login page <sup>b</sup> <sup>td1</sup> |
| **Edit and save the "Masthead" and "Contact" tabs** (Settings › Journal) | • whoever opens the Settings pages (row 1); nobody else <sup>td2</sup> <sup>b</sup> |
| **Edit and save the "Information" {OJS OMP} and "Privacy Statement" tabs** (Settings › Website › Setup) | • whoever opens the Settings pages (row 1); nobody else <sup>b</sup> |
| **Read the About pages** ("About the Journal", "Editorial Masthead", "Editorial History", "Contact", "Privacy Statement", the Information pages {OJS OMP}, the page about the publishing software) | • any visitor, signed in or not (Rule 12), except on a journal that requires sign-in to view the site or is not enabled, where a signed-out visitor gets the Login page (Rule 22) <sup>c</sup> |
| **See and follow the "Edit" link** on "About the Journal", "Editorial History", "Contact", the Information pages and, while it is not based on enrollments, "Editorial Masthead" (Rule 21) | • users holding a manager-level role in that journal, signed in; the link opens the Settings tab that holds the text ⚠ [A2](#a2)<br>• nobody else sees it, a Site Administrator without a manager role in the journal included <sup>d</sup> <sup>td3</sup> |
| **Be listed on the "Editorial Masthead"** (Rules 14, 15) | • nobody while the masthead is not based on enrollments (Rule 14f); otherwise:<br>• a user holding a role that the journal lists on the masthead, while the role has started and not ended, when the role is set to "Appear on the masthead" (Rule 14b)<br>• a reviewer who completed a review for the journal in the previous calendar year, under "Peer Reviewers in Previous Year" {OJS OMP}, with no choice of their own, while the journal lists its reviewers (Rule 15)<br>• a past member of a listed role, on "Editorial History" (Rule 16) <sup>e</sup> |

## Fields & validation

Each tab below is one form with a "Save" button at its foot, and "Save"
stores that tab's fields alone (Rule 5). A save the form itself refuses
sends nothing: "This field is required." appears under each empty required
box, and beside "Save" the footer reads "Please correct one error." (or
"Please correct {n} errors.") with, under it, one link per flagged box
("Go to Journal initials: This field is required.", "Go to Country: This
field is required.") and then a "Jump to next error" button. "Save" stays
grayed out until every flagged box has been changed. <sup>f</sup>
<sup>td4</sup>

A value the journal's records refuse (an invalid email, ISSN or URL) is
refused after the press: the message sits under the box, the footer shows
the same count, "Go to" links and "Jump to next error", "Save" is grayed
out until the flagged boxes change, and a notice at the top right reads
"The form was not saved because {n} error(s) were encountered. Please
correct these errors and try again." for about ten seconds. A successful
save shows "Saved" beside the button, and the public pages show the change
from their next load. <sup>f</sup> <sup>td4</sup>

Fields marked "per language" take a text in each language the journal
uses for forms. With a second form language, each such field shows the
primary language's box with "1/2 languages completed" under it; the other
language's boxes ("Journal title in French", "Affiliation in French")
appear only after pressing that language's button ("French") at the top
of the tab, and are hidden again on every return to the tab. Only
the primary language's box of a required field must be filled (Rule 11).
<sup>f</sup> <sup>td4</sup>

**The "Masthead" tab** (Settings › Journal › "Masthead"; on a press
Settings › Press, on a preprint server Settings › Server). Its groups, top
to bottom: <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Journal title" (press "Press Name", preprint server "Server title"), in the group "Journal Identity" ("Press Identity", "Preprint Server Identity") | yes, in the primary language | One line of plain text, per language. Shown to readers as the journal's name (Rule 7) <sup>g</sup> |
| "Journal initials" ("Press Initials", "Server initials") | yes, in the primary language | A short box, per language. Where it shows: Rule 7 <sup>g</sup> |
| "Journal Abbreviation" {OJS}; "Server Abbreviation" {OPS} | no | Plain text, per language. Shown to readers in one place: it replaces the journal's name in the article's (preprint's) "How to Cite" in the citation formats that abbreviate, ACS, AMA, IEEE and Vancouver on a journal, AMA on a preprint server (Rule 10). A press has no such field <sup>g</sup> <sup>aa</sup> |
| "Sponsoring organization" {OPS} | no | Plain text, saved and shown again on the tab and used nowhere else ⚠ [OPS2](#ops2) <sup>g</sup> |
| "Press Publisher Name", "Geographical Location", "Publisher Code Type", "Publisher Code" {OMP}, in the group "Publisher Identity" under "These fields are required to publish valid ONIX metadata." | no | Three text boxes and one list of publisher-code types. "Publisher Code Type" is blank on a new press, but its list offers only the 41 code types ("ARK (35)" … "Proprietary (Discontinued)") and no empty choice, so once a type is saved it can be changed and not removed. Shown on no reader page (Rule 10) <sup>g</sup> |
| "Country", in the group "Publishing Details" under "These details may be included in metadata provided to third-party archival bodies." | yes | A list of countries under "Select the country where this journal is located, or the country of the mailing address for the journal or publisher." Empty on a new journal, so the first save of the tab asks for it <sup>g</sup> |
| "Publisher", "URL" {OJS} | no | Plain text. "URL" refuses anything but a full web address with "This is not a valid URL." <sup>g</sup> <sup>td4</sup> |
| "Online ISSN", "Print ISSN" {OJS} | no | A short box each. A value must read four digits, a hyphen, three digits and a check digit (0–9 or X) that matches the first seven; anything else is refused with "This is not a valid ISSN." <sup>g</sup> <sup>td4</sup> |
| "Editorial History", in the group "Editorial Masthead" | no | Formatted text per language under "Please provide the editorial history, including the full name, affiliation, and start and end dates of each editor.", with bold, italic, superscript, subscript, a link, a block quote, bulleted and numbered lists, an inserted image and a source-code view. Empty by default. Shown at the foot of the "Editorial History" page (Rule 16) <sup>g</sup> |
| "Journal Summary" ("Press Summary", "Server Summary"), in the group "Description" | no | Formatted text per language under "Offer a brief description of your journal to provide insight into its content and purpose.", with bold, italic, superscript, subscript and a link only. Empty by default. Where it shows: Rule 8 <sup>g</sup> |
| "About the Journal" ("About the Press", "About the Server") | no | A tall formatted-text box per language under "Include any information about your journal which may be of interest to readers, authors or reviewers. …", with the same controls as "Editorial History". Empty by default. It is the whole body of the "About the Journal" page (Rule 13) <sup>g</sup> |

A manager working in French sees a journal's tab in French throughout,
and a press's or a preprint server's with raw text keys in place of some
group headings, labels and help lines ⚠ [A12](#a12). <sup>g</sup>

**The "Contact" tab** (Settings › Journal › "Contact"): <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name", in the group "Principal Contact" under "Enter contact details, typically for a principal editorship, managing editorship, or administrative staff position, which can be displayed on your publicly accessible website." | yes | Plain text. Shown on the "Contact" page (Rule 17) <sup>h</sup> |
| "Email address" (Principal Contact) | yes | Must be an email address; otherwise refused with "This is not a valid email address." Shown on the "Contact" page (Rule 17), and the address the journal's own emails are sent from (Rule 9) <sup>h</sup> <sup>td4</sup> |
| "Phone" (Principal Contact) | no | Plain text, shown on the "Contact" page under "Phone" <sup>h</sup> |
| "Affiliation" (Principal Contact) | no | Plain text, per language, shown under the name on the "Contact" page <sup>h</sup> |
| "Mailing Address" | no | A small box of several lines, shown with its line breaks at the top of the "Contact" page <sup>h</sup> |
| "Name" and "Email address", in the group "Technical Support Contact" under "A contact person who can assist editors, authors and reviewers with any problems they have submitting, editing, reviewing or publishing material." | yes, both | As for the principal contact. A new journal has no technical support contact, so the first save of the tab asks for both even when only the principal contact was changed ⚠ [A3](#a3). Shown on the "Contact" page under "Support Contact" (Rule 17) <sup>h</sup> |
| "Phone" (Technical Support Contact) | no | Plain text, shown under "Support Contact" <sup>h</sup> |

**The "Information" tab** {OJS OMP} (Settings › Website › "Setup" ›
"Information"): one group, "Descriptions", under "Brief descriptions of
the journal for librarians and prospective authors and readers. These are
made available in the site's sidebar when the Information block has been
added." (on a press "Brief descriptions of the press for librarians …"),
with three formatted-text boxes per language, "For Readers", "For
Authors" and "For Librarians" (the same controls as "Editorial History"),
none required. A new journal arrives with a default text in each:
<sup>i</sup>

| Box | Default on a journal | Default on a press |
|-----|----------------------|--------------------|
| "For Readers" | "We encourage readers to sign up for the publishing notification service for this journal. …" | "We encourage readers to sign up for the publishing notification service for this press. …" <sup>i</sup> |
| "For Authors" | "Interested in submitting to this journal? …" | "Interested in submitting to this press? …" <sup>i</sup> |
| "For Librarians" | "We encourage research librarians to list this journal among their library's electronic journal holdings. …" | "We encourage research librarians to list this press among their library's electronic press holdings. …" <sup>i</sup> |

The links in the default "For Readers" and "For Authors" texts are full
addresses of the site the journal was created on, fixed at that moment;
the "Privacy Statement" link in "For Readers" opens the "Submissions"
page, not the "Privacy Statement" page ⚠ [A9](#a9). What each text does:
Rule 19. <sup>i</sup>

**The "Privacy Statement" tab** (Settings › Website › "Setup" › "Privacy
Statement"): one formatted-text box per language, "Privacy Statement",
under "This statement will appear during user registration, author
submission, and on the publicly available Privacy page. In some
jurisdictions, you are legally required to disclose how you handle user
data in this privacy policy.", not required. A new journal arrives with
"The names and email addresses entered in this journal site will be used
exclusively for the stated purposes of this journal and will not be made
available for any other purpose or to any other party." (on a press "…
entered in this press site … purposes of this press …", on a preprint
server "… entered in this server site … purposes of this server …"). When
French is a form language, a journal's or press's French box holds a
French default text; a preprint server's holds the text
"##default.contextSettings.privacyStatement##" instead ⚠ [OPS3](#ops3). What an
empty statement changes: Rule 18 and Side effects. <sup>j</sup>

## Rules & state

**The Settings pages**

1. **Reaching them.** The side menu of the editorial screens carries a
   "Settings" group for whoever opens the Settings pages (Actors row 1),
   with five entries: "Journal" ("Press", "Server"), "Website", "Workflow",
   "Distribution" and "Users & Roles". Each opens one page, headed
   "Journal Settings" ("Setup" on a press ⚠ [OMP1](#omp1), "Server
   Settings" on a preprint server), "Website Settings", "Workflow
   Settings", "Distribution Settings" and "Users & Roles", whose content is
   a row of tabs, some holding side tabs. The chosen tab is written into
   the page's address, so reloading keeps a top tab and a link can open a
   tab directly (the "Edit" links of Rule 21 do). A side tab writes only
   its own name (Settings › Website › "Setup" › "Privacy Statement" gives
   `#privacy`), and reloading that address opens the page's first tab
   ("Appearance" › "Theme"), not the side tab ⚠ [A7](#a7). A link naming
   both tabs (`#setup/privacy`) opens the side tab. <sup>k</sup>
   <sup>td5</sup>
2. **Which feature describes each tab.** This spec describes the
   "Masthead" and "Contact" tabs of Settings › Journal and the
   "Information" and "Privacy Statement" side tabs of Settings › Website ›
   "Setup". The other tabs belong to these features: <sup>k</sup>

   | Page | Tabs | Described in |
   |------|------|--------------|
   | Journal | "Sections" ("Series" on a press) | *Sections* |
   | Journal | "Categories" | *Categories* |
   | Website | "Appearance" ("Theme", "Setup", "Editorial Masthead", "Advanced"); "Setup" › "Lists", "Date & Time" | *Appearance & theming* |
   | Website | "Setup" › "Languages" | *Languages & locales* |
   | Website | "Setup" › "Navigation" | *Navigation menus & site chrome* |
   | Website | "Setup" › "Announcements" | [Announcements](U12-announcements.md) |
   | Website | "Setup" › "Highlights" | [Highlights](U11-highlights.md) |
   | Website | "Plugins" | *Plugins management* |
   | Website | "Content" › "Comments" | [Reader comments & moderation](U14-reader-comments-and-moderation.md) |
   | Workflow | "Submission" and "Emails" | *Submission intake configuration*, *Emails management* |
   | Workflow | "Review" {OJS OMP} | [Review setup & review forms](U29-review-setup-and-review-forms.md) |
   | Workflow | "Publisher Library" ("Press Library" on a press, "Preprint Server Library" on a preprint server), "Tasks and Discussions" | *Submission & Publisher Libraries*, *Tasks & discussions* |
   | Distribution | "License" | [Publication metadata](U40-publication-metadata.md) |
   | Distribution | "DOIs", "Search Indexing", "Statistics", "Payments" {OJS OMP}, "Access" {OJS OPS}, "Archiving" {OJS} | *DOIs*, *Search-engine metadata & analytics*, *Statistics — usage*, *Payments & APCs* (on a press the tab serves the sale of publication formats, *Monograph landing page* {OMP}), *Subscriptions & open access control*, [Archiving & preservation](U67-archiving-preservation.md) |
   | Users & Roles | "Users", "Roles", "Site Access Options", "ORCID" | *Users management*, *Roles configuration* ("Roles" and "Site Access Options"), [ORCID integration](U04-orcid-integration.md) |

3. **Pages outside the five.** The "Announcements", "Institutions" and
   "Comments" pages are described by [Announcements](U12-announcements.md),
   [Institutions](U66-institutions.md) and [Reader comments & moderation](U14-reader-comments-and-moderation.md).
   <sup>k</sup>
   - The "Announcements" and "Comments" pages open from their own
     side-menu entries, shown while announcements or public comments are
     on, and do not ask for "Permit changes to Settings".
   - The Journal Manager's and Site Administrator's side menus gain an
     "Institutions" entry once both "Enable institutional statistics"
     boxes are ticked: the site's (Administration › Site Settings ›
     "Statistics") and the journal's (Settings › Distribution ›
     "Statistics", shown only while the site's is ticked), both unticked
     at install. Enabling payments {OJS} adds it too;
     [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
     Rule 30 names every role shown it. The page opens by its address
     either way. Like the Settings pages, it refuses a manager-level role
     without "Permit changes to Settings".

   A user's "Edit" in the users list opens the invitation
   wizard described by [User invitations](U06-user-invitations.md). An
   address under the Settings pages that names none of these answers "404
   Not Found". <sup>k</sup> <sup>td6</sup>
4. **Notices at the top.** Two notices can sit above the tabs. <sup>ab</sup>
   - 4a. **Not accepting submissions.** While the journal is not
     accepting submissions (Settings › Workflow › "Submission" › "Disable
     Submissions", *Submission intake configuration*), Settings ›
     Journal, Website, Workflow and
     Distribution show above their tabs "This journal is not accepting
     submissions at this time. Visit the workflow settings to allow
     submissions." ("This press …", "This server …"); "Users & Roles"
     does not. After submissions are allowed again and saved, the notice
     stays on the open page until it is loaded again ⚠ [A8](#a8).
     <sup>ab</sup>
   - 4b. **A newer release** (this notice cannot be seen on the test
     installs, which never reach the internet). On Settings › Journal, when
     the installation learns that a newer release exists, a notice reads
     "There is a new version of OJS available! You are currently using
     OJS {version}. The most recent version is OJS {version}. Please
     contact your Site Administrator ({name}, {email}) to notify them of
     this new release. More information can be found here." (OMP and OPS
     name their own application). <sup>l</sup>
5. **Saving a tab.** "Save" stores the fields of its own tab and nothing
   else; another tab's unsaved changes are neither saved nor lost by it.
   Changes typed and not saved stay in their boxes while the user moves
   between the tabs of the same page, top tabs and side tabs alike. They
   are gone without a warning once the page is reloaded or left, for
   example through the side menu: the boxes then show the stored values.
   <sup>m</sup> <sup>td7</sup>

**Identity and contact**

6. **One set per journal.** Everything on these tabs belongs to the
   journal the Settings page was opened in; a second journal on the same
   site has its own set, and the site has its own privacy statement (Rule
   18). <sup>a</sup>
7. **The journal's name.** The "Journal title" is the name readers see:
   in the header of every public page of the journal when no header logo
   is set (*Appearance & theming*), after the page name in the browser
   title of every public page but the home page ("About the Journal |
   {journal title}"), and in the site's list of journals. The "Journal
   initials" show beside each task of the journal in the Tasks panel of
   an account with roles in more than one journal
   ([Notifications center & email preferences](U05-notifications-center-and-email-preferences.md),
   Rule 2b); a manager of this journal alone sees no initials there. A
   save changes both from the next page load. <sup>n</sup> <sup>td8</sup>
8. **Summary and About.** The "Journal Summary" is the short description
   shown under the journal's name in the site's list of journals and, when
   the theme is set to show it, on the journal's home page (*Appearance &
   theming*; the site list: *Hosted journals*). The "About the Journal"
   text is the whole body of the "About the Journal" page (Rule 13).
   <sup>n</sup>
9. **Contacts.** The principal contact's "Name" and "Email address" are
   shown on the "Contact" page. The "Email address" is also the address
   the journal's own emails are sent from, with the journal's title as the
   sender's name (Side effects). The technical support contact is shown
   on the "Contact" page under "Support Contact" (Rule 17). <sup>h</sup>
   <sup>x</sup>
10. **Fields readers never see.** "Country", the "Publishing Details" of
    a journal and a press's "Publisher Identity" are saved and shown again
    on the tab, and appear on no public page of the journal; with the
    abbreviation they feed the metadata the journal hands to indexes,
    registration agencies and exports, which the features that produce
    that metadata describe. The abbreviation's one place on a reader page
    is the article's "How to Cite" (Masthead table; *Article landing page
    & reading*). A preprint server's "Sponsoring organization" feeds
    nothing [OPS2](#ops2). <sup>n</sup> <sup>aa</sup>
11. **Languages.** When the journal uses more than one language for its
    forms, every per-language field takes a text in each, behind the
    language buttons described under Fields (*Languages & locales*). A
    public page shows the text saved in the language the visitor is
    reading the site in, and the primary language's text when that
    language's box is empty. <sup>o</sup> <sup>td9</sup>

**The About pages**

12. **How readers reach them.** On a fresh journal the header's "About"
    menu holds "About the Journal" ("About the Press", "About the Server"),
    "Submissions", "Editorial Masthead", "Privacy Statement" (only while a
    statement exists, Rule 18) and "Contact"; the page about the
    publishing software opens from the application's logo at the foot of
    every public page; the Information pages open from the Information
    block (Rule 19). Which menu items exist and when they show is
    *Navigation menus & site chrome*'s; the "Submissions" page is
    *Submission intake configuration*'s. Every page opens with the
    breadcrumb "Home" › {page name} and its name as heading, except
    "Editorial History", headed "Editorial History Page" under the
    breadcrumb "Editorial History" [A6](#a6). <sup>p</sup>
13. **"About the Journal".** The page shows the heading "About the
    Journal" ("About the Press", "About the Server"), the "Edit" link for
    managers (Rule 21) and the "About the Journal" text of the Masthead
    tab. With that text empty, the state of every new journal, the page
    shows the heading and nothing else. <sup>q</sup> <sup>td10</sup>
14. **"Editorial Masthead".** The page is headed "Editorial Masthead".
    While the masthead is based on enrollments (Settings bullet 4a, the
    state of every new journal), it lists the journal's current team by
    role, as 14a to 14e say; otherwise it shows what Rule 14f says.
    <sup>r</sup>
    - 14a. **Which roles.** A role is listed when its "Consider role in
      masthead list" box is ticked (Settings bullet 2) and at least one of
      its members is listed; the Reviewer role never is (reviewers have
      their own list, Rule 15). By default that is "Journal editor",
      "Section editor" and "Editorial Board Member" on a journal, "Press
      editor", "Series editor" and "Editorial Board Member" on a press,
      "Moderator" and "Editorial Board Member" on a preprint server. The
      roles follow the order set under Settings › Website › "Appearance" ›
      "Editorial Masthead" (Settings bullet 4b); each role's name is a
      heading, in the language the visitor reads the site in
      ⚠ [OPS4](#ops4).
    - 14b. **Who is listed.** Under its role heading, every user whose
      role has started and not ended and is set to "Appear on the
      masthead" for that role, ordered by family name. The setting is the
      manager's choice in the invitation, shown to the member as text on
      the invitation's review step and changed later on the member's
      "Edit" page (Settings bullet 3). A user with two listed roles appears
      under both. A role that ends leaves the masthead and moves the
      member to "Editorial History" (Rule 16). <sup>td11</sup>
    - 14c. **Each entry.** The year the role started followed by a dash
      ("2026 –"), the member's name (their "Preferred Public Name" when
      they set one), an ORCID icon opening their ORCID iD's address in a new
      browser tab when that iD is verified, and the "Affiliation"
      of their profile under the name when they filled it. No picture, no
      homepage and no email are shown. <sup>z</sup>
    - 14d. **The history link.** After the roles a line reads "View
      Editorial History", its last two words a link to the "Editorial
      History" page, followed by a horizontal rule and the peer reviewers
      (Rule 15). The page carries no "Edit" link.
    - 14e. **When the list changes.** Each of these shows on the next
      load of the masthead and of "Editorial History", with no other
      change needed: <sup>td12</sup>
      - giving a role, ending one with "Remove Role", changing a member's
        masthead choice, and saving a role's "Consider role in masthead
        list";
      - "Remove User", which takes the member off the masthead and onto
        "Editorial History";
      - a start date reached: a member invited with a later start date is
        not listed after accepting, and is listed from that date on;
      - merging a listed member into another account ("Merge user",
        [Users management](U53-users-management.md)): the kept account is
        listed under the member's role and the merged account is gone.

      Disabling a member's account ("Disable User") changes nothing: the
      member stays listed on both pages, and under "Peer Reviewers in
      Previous Year" when listed there (Rule 15). <sup>td12</sup>
    - 14f. **A masthead not based on enrollments.** With "Present a
      masthead based on user enrollments" unticked (Settings bullet 4a),
      the page lists no roles, no peer reviewers, no "View Editorial
      History" line and no rule. Under the heading come the "Edit" link
      for managers (Rule 21) and the "Editorial History" text of Settings
      › Journal › "Masthead"; with that text empty, the heading (and, for
      managers, the link) stands alone. The "Editorial History" address
      opens "Editorial Masthead" instead, for every visitor. Ticked again, both pages list as before,
      in the saved role order. <sup>ad</sup>
15. **"Peer Reviewers in Previous Year"** {OJS OMP}. While "Enable listing
    of reviewers on the masthead" is ticked (Settings bullet 4c; unticked
    on a new journal or press), under the rule come the
    heading "Peer Reviewers in Previous Year", the sentence "The editors
    express their appreciation of the reviewers for {year} listed below."
    with the previous calendar year, and the reviewers of the journal who
    completed a review in that year, ordered by family name: name, ORCID
    icon when verified, affiliation, as in Rule 14c but with no year. A
    review counts when the reviewer submitted it in that year, even when
    the editor later pressed "Cancel Reviewer" on it (the row then reads
    "Request Cancelled") ⚠ [A10](#a10); on a press only reviews of the
    external review count. With the box unticked, or with no such review,
    the heading and sentence are absent. A preprint server has no reviews
    and no such box, so its masthead never shows the block.
    <sup>s</sup> <sup>td13</sup>
16. **"Editorial History".** While the masthead is based on enrollments
    (Rule 14f), the page is headed "Editorial History Page"
    ⚠ [A6](#a6) and opens with "This section lists past contributors.".
    It lists, by role as on the masthead, every member whose listed role
    has ended and was set to "Appear on the masthead": the years of each
    period of service ("2019 – 2024", several periods separated by commas,
    the latest first), the name, the ORCID icon when verified and the
    affiliation. Below the lists come the "Edit" link for managers and the "Editorial
    History" text of the Masthead tab. With nobody ended and the text
    empty, the page shows its heading and sentence alone. <sup>t</sup>
    <sup>td14</sup>
17. **"Contact".** The page, headed "Contact", shows the "Edit" link for
    managers, then the "Mailing Address" with its line breaks, then a
    block headed "Principal Contact" with the name, the affiliation, "Phone"
    and the number, and the email address as a link that opens the
    visitor's mail program, then, only when a technical support contact is
    set, a block headed "Support Contact" with its name, "Phone" and email
    link. Each part appears only when its field is filled. A new journal
    shows the "Principal Contact" block alone. <sup>u</sup> <sup>td15</sup>
18. **"Privacy Statement".** On a journal the page, headed "Privacy
    Statement", shows the journal's statement and no "Edit" link. With the
    statement empty, the address answers "404 Not Found" and the header's
    "Privacy Statement" item is gone. With "index" in place of the
    journal's path, the same address shows the site's statement, set
    by the Site Administrator (*Site settings*); a fresh site has none, so
    that page answers "404 Not Found". When the installation is
    configured for one site-wide statement, every journal's page shows the
    site's statement instead of its own (Settings bullet 9). <sup>j</sup>
    <sup>td16</sup>
19. **The Information pages and block** {OJS OMP}. <sup>v</sup> <sup>td17</sup>
    - 19a. **The block.** Once a manager places the Information block in
      the sidebar (Settings bullet 6), every public page of the journal
      shows a block headed "Information" with the links "For Readers",
      "For Authors" and "For Librarians", each only while its text on the
      "Information" tab is not empty; with all three empty the block is
      not shown at all.
    - 19b. **The pages.** Each link opens a page headed "Information For
      Readers", "Information For Authors" or "Information For Librarians",
      with the "Edit" link for managers and the text. The address of a
      page whose text is empty still opens it, with the heading alone.
    - 19c. **A preprint server** has none of this: no tab, no block, and
      the Information addresses answer "404 Not Found" [OPS1](#ops1).
20. **The page about the publishing software.** Headed "About Open
    Journal Systems" ("About Open Monograph Press", "About Open Preprint
    Systems"), it holds one paragraph: "This journal uses Open Journal
    Systems {version}, which is open source journal management and
    publishing software developed, supported, and freely distributed by the
    Public Knowledge Project under the GNU General Public License. Visit
    PKP's website to learn more about the software. Please contact the
    journal directly with questions about the journal and submissions to
    the journal.", where "learn more about the software" links to PKP's
    website and "contact the journal" to the journal's "Contact" page.
    A press says "press" throughout ("contact the press"). A preprint
    server reads "This server uses Open Preprint Systems {version}, which
    is open source preprint server management software …" and ends
    "…questions about the server and submission of preprints.", its link
    reading "contact the server".
    Reached from the site's own pages, the paragraph opens "This site uses
    …" and has no contact link; it ends "Please contact the site directly
    with questions about its journals and submissions to its journals."
    ("…its presses and submissions to its presses.", "…its servers and
    submissions of preprints."). On a press it still opens "This press
    uses …" ⚠ [OMP2](#omp2). <sup>w</sup> <sup>td18</sup>
21. **The "Edit" link.** "About the Journal", "Contact", each
    Information page (under the heading) and "Editorial History" (below
    the lists, Rule 16) carry a link "Edit" for the users of Actors row
    5 (a screen reader hears "Edit" followed by "Edit {page name}", "Edit Information" on the three
    Information pages; on a press "Open a new page to edit this
    information" on every page). It opens, in the same window, Settings ›
    Journal › "Masthead" from "About the Journal", "Editorial History" and
    "Editorial Masthead", Settings › Journal › "Contact" from "Contact",
    and Settings › Website › "Setup" › "Information" from an Information
    page. "Editorial Masthead" carries one only while it is not based on
    enrollments (Rule 14f); "Privacy Statement" carries none.
    <sup>d</sup> <sup>td3</sup> <sup>ad</sup>
22. **Journals closed to visitors.** A signed-out visitor who opens any
    About page of a journal closed to visitors is sent to the Login page.
    Where signing in there leads depends on how the journal is closed:
    - "Users must be registered and log in to view the journal site."
      ticked (Settings bullet 7): back to the About page asked for.
    - Not enabled by the Site Administrator (Settings bullet 8): not back
      to that page; a Journal Manager lands on the Dashboard and a Reader
      on the journal's home page
      ⚠ [→ Hosted journals A8](U59-hosted-journals.md#a8). <sup>c</sup>

## Side effects

- **Principal contact changed** (Rule 9): the journal's own emails to its
  users (on a journal, for example, "Publication Published" to the
  authors) go out from the new address, with the journal's title as the
  sender's name, from the next email on; each email's own feature
  describes when it is sent. The password reset is a site email: it comes
  from the site ("Open Journal Systems", "Open Monograph Press", "Open
  Preprint Systems", at the site's contact address) whatever the
  journal's contact. <sup>x</sup>
- **Technical support contact** (Rule 9): the account-validation email of
  [Registration & account validation](U02-registration-and-account-validation.md)
  is sent from it; that spec describes what happens without one.
  <sup>x</sup>
- **Privacy Statement emptied** (Rule 18): the consent box that links to
  it leaves the Register page, the submission wizard and, on a journal or
  press, the reviewer's first step, as the specs of
  [Registration & account validation](U02-registration-and-account-validation.md),
  [Submission wizard](U21-submission-wizard.md) and
  [Reviewer's review](U28-reviewers-review.md) describe. <sup>x</sup>
- **Saving any tab of this spec** sends no email and no notification and
  leaves no line in any log a user can read. <sup>x</sup>

## Settings that modify behavior

1. **"Permit changes to Settings"** (Settings › Users & Roles › Roles, a
   role's "Edit"; ticked on every default manager-level role; the Journal
   Manager's row offers no "Edit"). Unticked on the Editor or Production
   Editor role: that role loses the "Settings" group, gets the
   access-denied page ("The current role does not have access to this
   operation.") at every Settings address, and keeps the "Edit" links of
   the About pages (Actors rows 1 and 5). *Roles configuration* owns the
   form. <sup>b</sup>
2. **"Consider role in masthead list"** (the same role form; ticked by
   default on "Journal editor", "Section editor", "Reviewer" and "Editorial
   Board Member" on a journal, "Press editor", "Series editor", "External
   Reviewer" and "Editorial Board Member" on a press ("Internal Reviewer"
   unticked), "Moderator" and "Editorial Board Member" on a preprint
   server). Ticked: the role's members set to "Appear on the masthead"
   are listed on the masthead (Rule 14a); unticked: the role and its members are left off the masthead and the
   history page. It has no effect on the Reviewer role, whose members are
   listed by Rule 15 whatever the box says. *Roles configuration* owns the
   form. <sup>e</sup>
3. **"Appear on the masthead" / "Does not appear on the masthead"** (the
   masthead choice of each role a user holds, made by the manager in the
   invitation, shown to the member on the invitation's review step, and
   changed later on the user's "Edit" page; *User invitations*). "Appear":
   listed (Rule 14b) while the masthead is based on enrollments (Rule
   14f). "Does not appear": left off the masthead and the history page.
   While the masthead is not based on enrollments and lists nobody, the
   invitation still offers the choice, and its email and the email a
   change on the "Edit" page sends still promise the listing; in the
   invitation a Reviewer role is fixed to "Appear on the masthead" and
   promised a listing while the journal lists no reviewers ⚠ [A13](#a13). On a press or preprint server a change made on the
   "Edit" page is saved behind an error window, which
   [User invitations](U06-user-invitations.md#omp1) records. <sup>e</sup>
4. **The "Editorial Masthead" tab** (Settings › Website › "Appearance" ›
   "Editorial Masthead"; [Appearance & theming](U10-appearance-and-theming.md)
   owns the tab). Three groups, top to bottom: <sup>r</sup> <sup>ad</sup>
   - 4a. **"Present a masthead based on user enrollments"** (the group
     "Enrollment-based Masthead", under "If desired, a masthead can be
     generated automatically based on user enrollments, including start
     and end dates. See also Settings > Journal > Masthead." ("Settings >
     Press > Masthead", "Settings > Server > Masthead"); ticked on every
     new journal; unticked, by design, on a journal upgraded from a
     release without it). Ticked: the masthead and history pages list
     the team (Rules 14–16). Unticked:
     Rule 14f; from the moment the box is unticked, before any save, the
     other two groups leave the tab.
   - 4b. **"Editorial Masthead"** (an orderable list of the masthead
     roles under "Define the order of masthead roles for public
     display."; default the order of the roles' permission levels).
     Another order changes the order of the role headings on the
     masthead and the history page (Rule 14a).
   - 4c. **"Enable listing of reviewers on the masthead"** {OJS OMP} (the
     group "Reviewers", under "Reviewers who completed a review in the
     previous calendar year will be credited in a standardized format to
     maintain uniformity and ensure easy discoverability in this
     section."; unticked on every new journal and press). Ticked: "Peer
     Reviewers in Previous Year" (Rule 15). Unticked: no reviewers on the
     masthead. A preprint server's tab has no "Reviewers" group.
5. **"Information Block"** {OJS OMP} (Settings › Website › "Plugins" ›
   "Installed Plugins"; enabled by default). Disabled: the block is gone
   from the sidebar and from the sidebar choices; the Information pages
   still open by their address (Rule 19). *Plugins management* owns the
   list. <sup>v</sup>
6. **"Sidebar"** {OJS OMP} (Settings › Website › "Appearance" › "Setup";
   default no block). With "Information Block" placed, the block of Rule
   19a shows on every public page. *Appearance & theming* owns the list.
   <sup>v</sup>
7. **"Users must be registered and log in to view the journal site."**
   (Settings › Users & Roles › "Site Access Options"; default unticked).
   Ticked: signed-out visitors are sent to Login from every About page
   (Rule 22). *Roles configuration* owns the option. <sup>c</sup>
8. **"Enable this journal to appear publicly on the site"** ("Enable this
   press to appear publicly on the site", "Enable this preprint server to
   appear publicly on the site"; Administration › Hosted Journals, the
   journal's "Edit"; ticked on the seeded and every scratch journal).
   Unticked: signed-out visitors are sent to Login, and signing in there
   does not return them to the page they asked for (Rule 22). On a journal
   whose "Country" was never set the form refuses to save until one is
   picked ⚠ [A11](#a11). *Hosted journals* owns it. <sup>c</sup>
9. **The site-wide privacy statement switch** (the installation's
   configuration file; off by default). On: every journal's "Privacy
   Statement" page shows the site's statement, and answers "404 Not Found"
   when the site has none, whatever the journal's own tab says (Rule 18).
   No screen changes it. <sup>j</sup> <sup>ac</sup>
10. **"Privacy Statement" of the site** (Administration › Site Settings ›
    "Site Setup" › "Information"; empty on a fresh site). Set: the
    site-level "Privacy Statement" page shows it (Rule 18). *Site
    settings* owns it. <sup>j</sup>
11. **The upgrade warning switch** (the installation's configuration file;
    on by default). On, and with the internet reachable: the notice of
    Rule 4b on Settings › Journal when a newer release exists. Off: never.
    <sup>l</sup>
12. **"Forms"** (Settings › Website › "Setup" › "Languages"; default the
    primary language alone). Each language ticked adds that language to
    every per-language field of these tabs, behind its button at the top
    of the tab (Fields; Rule 11). *Languages & locales* owns the column. <sup>o</sup>

## Cross-feature interactions

- *Roles configuration* owns the Roles form with "Permit changes to
  Settings" and "Consider role in masthead list", and the "Site Access
  Options" tab; this spec owns what they change on the Settings pages and
  the About pages (Actors, Rule 14a).
- [User invitations](U06-user-invitations.md) owns the masthead choice
  made when a role is offered and changed later, and the removal of a
  role; this spec owns how the masthead and history pages list the result
  (Rules 14, 16).
- [Users management](U53-users-management.md) owns "Disable User",
  "Remove User" and "Merge user"; this spec owns what each changes on
  the masthead and history pages (Rule 14e).
- [Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)
  owns the Tasks panel, where the journal initials show (Rule 7).
- [User profile](U03-user-profile.md) owns the "Affiliation", "Preferred
  Public Name" and ORCID iD the masthead prints (Rule 14c), and its
  privacy links open this spec's "Privacy Statement" page.
- [ORCID integration](U04-orcid-integration.md) owns what makes an ORCID iD
  verified.
- [Reviewer's review](U28-reviewers-review.md) owns submitting a review,
  the event Rule 15 counts.
- *Navigation menus & site chrome* owns the header "About" menu and its
  items, the footer, the breadcrumb and the shared "Edit" link's look;
  this spec says where each About page's "Edit" link leads (Rule 21).
- *Appearance & theming* owns the header logo, the home page's summary,
  the "Sidebar" list and the "Editorial Masthead" tab with its three
  groups; this spec owns what each changes on the masthead and history
  pages (Settings bullet 4).
- *Submission intake configuration* owns the "Submissions" About page and
  the "Disable Submissions" switch; this spec owns the notice it puts on
  the Settings pages (Rule 4a).
- *Article landing page & reading* owns the article's "How to Cite",
  where the journal abbreviation shows (Rule 10).
- *Custom pages & blocks* owns the upload of images placed in the
  formatted-text boxes.
- *Site settings* owns the site's privacy statement; *Hosted journals*
  owns enabling a journal and the site's list of journals.
- The tabs of Rule 2's table belong to the features named there.

## Canonical scenarios

Scenarios 1, 2 and 12 only read, and run on the seeded journal with ready
accounts; every other scenario runs on a scratch journal with throwaway
accounts, because it saves a tab or a role, or needs members, reviews or
a sidebar block the seeded journal lacks. The accounts, their passwords,
the site's contact address, the mail catcher and the tooling recipe are
in the footnote. <sup>y</sup>

1. **A visitor reads the seeded journal's About pages**

   Given: a visitor, signed out, on the seeded journal, whose team holds a
   Journal editor and three Section editors (a Press editor and three
   Series editors on a press; three Moderators and an Editorial Board
   Member on a preprint server), all set to "Appear on the masthead",
   whose Reviewers (on a journal or press) have submitted no review, and
   whose Reader has a ready account.

   - **The "About" menu**: open the journal's home page: the header's
     "About" menu holds "About the Journal" ("About the Press", "About the
     Server"), "Submissions", "Editorial Masthead", "Privacy Statement" and
     "Contact" (Rule 12).
   - **"About the Journal"**: choose it: the page shows the breadcrumb
     "Home" › "About the Journal", the heading "About the Journal" and
     nothing after it, as on every new journal; the browser title reads "About the Journal | Journal of Public Knowledge"
     (Rules 7, 12, 13).
   - **"Editorial Masthead"**: choose it: under the heading "Editorial
     Masthead" come the role headings "Journal editor" and then "Section
     editor" ("Press editor" and "Series editor" on a press, "Moderator"
     and "Editorial Board Member" on a preprint server), and no "Reviewer"
     heading; under each, its members ordered by family name, each entry
     the year the role started followed by a dash and the member's name,
     with no picture and no email; then the line "View Editorial History",
     its last two words a link, and a horizontal rule, with no "Peer
     Reviewers in Previous Year" after it (Rules 14a, 14c, 14d, 15).
   - **"Editorial History"**: press "Editorial History" in that line: the
     page, under the breadcrumb "Home" › "Editorial History", is headed
     "Editorial History Page" [A6] and shows "This section lists past
     contributors." and nothing else, nobody having left the team and the
     "Editorial History" text being empty (Rules 12, 16).
   - **"Contact"**: choose it in the "About" menu: under the heading
     "Contact" a block headed "Principal Contact" shows the journal's
     contact name and its email address as a link that opens the visitor's
     mail program, and no "Support Contact" block follows (Rule 17).
   - **"Privacy Statement"**: choose it: the page, headed "Privacy
     Statement", shows "The names and email addresses entered in this
     journal site will be used exclusively for the stated purposes of this
     journal and will not be made available for any other purpose or to
     any other party." ("… this press site … this press …", "… this server
     site … this server …") (Fields; Rule 18).
   - **The page about the software**: press the application's logo at the
     foot of the page: the page is headed "About Open Journal Systems"
     ("About Open Monograph Press", "About Open Preprint Systems") and its
     one paragraph opens "This journal uses Open Journal Systems
     {version}" ("This press uses …", "This server uses Open Preprint
     Systems {version}, which is open source preprint server management
     software …"); "learn more about the software" links to PKP's website
     and "contact the journal" ("contact the press", "contact the server")
     opens the journal's "Contact" page (Rule 20).
   - **Control**: sign in as the Reader and open the same pages: each shows
     the same heading, breadcrumb and content as signed out, and none
     carries an "Edit" link (Actors rows 4, 5).

2. **Who opens the Settings pages and sees "Edit"**

   Given: Journal Manager, Section Editor, an Assistant, Author, a Reviewer
   (none on a preprint server) and Reader, each with a ready account on the
   seeded journal.

   - **The Journal Manager's side menu**: Journal Manager: sign in: the
     side menu holds a "Settings" group with "Journal" ("Press", "Server"),
     "Website", "Workflow", "Distribution" and "Users & Roles"; each opens
     a page headed "Journal Settings" ("Setup" on a press [OMP1], "Server
     Settings" on a preprint server), "Website Settings", "Workflow
     Settings", "Distribution Settings" and "Users & Roles" in turn, its
     content a row of tabs (Actors row 1; Rule 1).
   - **The "Edit" links**: open "About the Journal": an "Edit" link sits
     under the heading, read to a screen reader as "Edit" followed by "Edit
     About the Journal" ("Open a new page to edit this information" on a
     press); press it: Settings › Journal opens in the same window on its
     "Masthead" tab. "Editorial History"'s "Edit" opens the same tab, and
     "Contact"'s opens the "Contact" tab; "Editorial Masthead" and
     "Privacy Statement" carry no "Edit" (Actors row 5; Rule 21).
   - **Every other role**: the Section Editor, the Assistant, the Author,
     the Reviewer and the Reader each sign in in turn: the side menu has no
     "Settings" group; the addresses of the five pages the Journal Manager
     opened each show the access-denied page ("The current role does not
     have access to this operation."); "About the Journal", "Editorial
     History" and "Contact" carry no "Edit" link (Actors rows 1, 5).
   - **Signed out**: the same five addresses each show the Login page
     (Actors row 1).
   - **Control**: the Journal Manager, at the same five addresses, got each
     page with its tabs (Actors row 1).

3. **Save the "Masthead" tab**

   Given: Journal Manager, on a scratch journal with no "Journal initials",
   no "Country" and no header logo.

   - **Required boxes left empty**: open Settings › Journal › "Masthead",
     empty "Journal title" ("Press Name", "Server title") and press
     "Save": "This field is required." appears under "Journal title",
     "Journal initials" ("Press Initials", "Server initials") and
     "Country"; beside "Save" the footer reads "Please correct 3 errors."
     with one "Go to" link per box, among them "Go to Journal initials:
     This field is required." and "Go to Country: This field is
     required.", then a "Jump to next error" button; "Save" is grayed out
     (Fields).
   - **The boxes filled**: type "Probe Journal of Identity" in "Journal
     title" and "PJI" in "Journal initials": "Save" stays grayed out;
     choose "Canada" in "Country": "Save" is live again (Fields).
   - **The texts**: type "Our journal publishes probe articles." in "About
     the Journal" ("About the Press", "About the Server") and "Founded in
     2001." in "Editorial History" (Fields).
   - **A malformed ISSN and address** {OJS}: type "1234-5678" in "Online
     ISSN" and "example.org" in "URL" and press "Save": "This is not a
     valid ISSN." sits under "Online ISSN" and "This is not a valid URL."
     under "URL", the footer reads "Please correct 2 errors." with its "Go
     to" links and "Jump to next error", "Save" is grayed out, and a notice
     at the top right reads "The form was not saved because 2 error(s)
     were encountered. Please correct these errors and try again." for
     about ten seconds; replace the values with "0378-5955" and
     "https://example.org" (Fields).
   - **Saved**: press "Save": "Saved" shows beside the button (Fields).
   - **The public pages**: signed out, open "About the Journal": under the
     heading comes "Our journal publishes probe articles.", the header
     shows "Probe Journal of Identity", and the browser title reads "About
     the Journal | Probe Journal of Identity"; open "Editorial History":
     "Founded in 2001." sits at the foot of the page, under "This section
     lists past contributors."; the site's home page lists the journal as
     "Probe Journal of Identity" (Rules 7, 13, 16).
   - **Control**: before the save, "About the Journal" showed its heading
     alone and the header the journal's former title (Rules 7, 13).

4. **Save the "Contact" tab; the journal's emails follow the new contact**

   Given: Journal Manager, on a scratch journal that has the principal
   contact it was created with and no technical support contact, with an
   Author and, on a journal, the Author's submission in Production and an
   unpublished issue.

   - **A phone alone**: open Settings › Journal › "Contact", type "+1 555
     0100" in the principal contact's "Phone" and press "Save": "This field
     is required." appears under the "Technical Support Contact" group's
     "Name" and "Email address", the footer reads "Please correct 2
     errors.", and nothing is saved [A3] (Fields).
   - **An invalid address**: type "Sam Support" and
     "sam.support@mail.test" in the support contact's "Name" and "Email
     address", replace the principal contact's "Email address" with
     "not-an-email" and press "Save": "This is not a valid email address."
     sits under that box, the footer reads "Please correct one error.",
     "Save" is grayed out, and a notice at the top right reads "The form
     was not saved because 1 error(s) were encountered. Please correct
     these errors and try again." (Fields).
   - **Saved**: in the "Principal Contact" group type "Pat Principal" in
     "Name", "pat.principal@mail.test" in "Email address" and "Probe
     University" in "Affiliation", and "1 Probe Street" and "Probe City" on
     two lines in "Mailing Address"; type "+1 555 0199" in the support
     contact's "Phone"; press "Save": "Saved" (Fields).
   - **The "Contact" page**: signed out, open "Contact": under the heading
     come "1 Probe Street" and "Probe City" on two lines; a block headed
     "Principal Contact" with "Pat Principal", "Probe University", "Phone"
     and "+1 555 0100", and "pat.principal@mail.test" as a link that opens
     the visitor's mail program; then a block headed "Support Contact" with
     "Sam Support", "Phone" and "+1 555 0199", and its email link (Rule 17).
   - **The journal's next email** {OJS}: Journal Manager: publish the
     submission with "Assign To Future Issue and Publish Immediately"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)
     Rule 5): the Author's mailbox holds "Publication Published", its
     sender the journal's title at "pat.principal@mail.test" (Rule 9; Side
     effects).
   - **The password reset**: signed out, ask for a password reset of the
     Author's account through "Forgot your password?" on the Login page
     ([Login & sessions](U01-login-and-sessions.md)): the email comes from
     "Open Journal Systems" ("Open Monograph Press", "Open Preprint
     Systems") at the site's contact address, not from "Pat Principal"
     (Side effects).
   - **Control**: before the save, the "Contact" page showed the "Principal
     Contact" block alone, with the name and address the journal was
     created with (Rule 17).

5. **Change and empty the "Privacy Statement"**

   Given: Journal Manager, on a scratch journal holding the default privacy
   statement.

   - **The tab**: open Settings › Website › "Setup" › "Privacy Statement":
     the box "Privacy Statement" holds "The names and email addresses
     entered in this journal site will be used exclusively for the stated
     purposes of this journal and will not be made available for any other
     purpose or to any other party." ("… this press site … this press …",
     "… this server site … this server …"); replace it with "We keep your
     data in Probe City." and press "Save": "Saved" (Fields).
   - **The page**: signed out, choose "Privacy Statement" in the header's
     "About" menu: the page, under the breadcrumb "Home" › "Privacy
     Statement", is headed "Privacy Statement" and shows "We keep your data
     in Probe City."; as the Journal Manager the page carries no "Edit"
     link either (Rules 18, 21).
   - **Emptied**: Journal Manager: empty the box and press "Save": "Saved"
     (Fields).
   - **The page after**: signed out, the header's "About" menu no longer
     holds "Privacy Statement", and the page's address, opened as before,
     answers "404 Not Found" (Rule 18).
   - **The site's page**: the same address with "index" in place of the
     journal's path answers "404 Not Found", a fresh site having no
     statement (Rule 18).
   - **Control**: before the box was emptied, the "About" menu held
     "Privacy Statement" and the address opened the page (Rules 12, 18).

6. **Change and empty the Information texts** {OJS OMP}

   Given: Journal Manager, on a scratch journal holding the default
   Information texts, with the Information block placed in its "Sidebar".

   - **The block with the default texts**: signed out, open the journal's
     home page: the sidebar shows a block headed "Information" with the
     links "For Readers", "For Authors" and "For Librarians" (Rule 19a;
     Settings bullet 6).
   - **The tab**: Journal Manager: open Settings › Website › "Setup" ›
     "Information": one group, "Descriptions", holds "For Readers", "For
     Authors" and "For Librarians", opening "We encourage readers to sign
     up for the publishing notification service for this journal. …",
     "Interested in submitting to this journal? …" and "We encourage
     research librarians to list this journal among their library's
     electronic journal holdings. …" (on a press "… for this press. …",
     "Interested in submitting to this press? …", "… list this press among
     their library's electronic press holdings. …"); replace the "For
     Readers" text with "Readers start here." and press "Save": "Saved"
     (Fields).
   - **The page**: signed out, press "For Readers" in the block: a page
     headed "Information For Readers" shows "Readers start here." (Rule
     19b).
   - **Its "Edit" link**: as the Journal Manager the page carries an "Edit"
     link under the heading; press it: Settings › Website opens in the same
     window on "Setup" › "Information" (Rule 21).
   - **One text emptied**: empty "For Librarians" and press "Save":
     "Saved"; signed out, the block holds "For Readers" and "For Authors"
     alone; the "Information For Librarians" page, opened at the address it
     had before, shows its heading alone (Rules 19a, 19b).
   - **All three emptied**: empty "For Authors" and press "Save": the
     block on the home page holds "For Readers" alone; empty "For Readers"
     and press "Save": signed out, the home page and the About pages show
     no "Information" block (Rule 19a).
   - **Control**: with one text left, the block still showed on the home
     page with that one link, read the same way (Rule 19a).

7. **Who "Editorial Masthead" and "Editorial History" list**

   Given: a visitor, signed out, on a scratch journal with no Journal
   editor, whose three Section editors, given the role today, have the
   family names "Zulu", "Alpha" and "Mike", Mike with the affiliation
   "Masthead University" and the verified ORCID iD
   "https://orcid.org/0000-0002-1825-0097", and a fourth
   member set to "Does not appear on the masthead" for that role and to
   "Appear on the masthead" as an Editorial Board Member, and whose past
   Section editors are one who served from 2019 to 2024, with the
   affiliation "Past University", and one who served from 2015 to 2016
   and again from 2020 to 2022.

   - **The role headings**: open "Editorial Masthead": the headings read
     "Section editor" ("Series editor" on a press, "Moderator" on a
     preprint server) and then "Editorial Board Member", with no "Journal
     editor" heading (Rules 14a, 14b).
   - **The Section editors**: under "Section editor" come Alpha, Mike and
     Zulu in that order, each entry opening with this year followed by a
     dash (for example "2026 –"); "Masthead University" sits under Mike's
     name, and beside it an ORCID icon that opens a new browser tab at
     Mike's iD; no entry shows a picture or an email address (Rules
     14b, 14c).
   - **The member who does not appear**: the fourth member is not under
     "Section editor" (Rule 14b).
   - **The history**: press "Editorial History" in the line "View
     Editorial History": under "Section editor" the first past member reads
     "2019 – 2024" with the name and "Past University" under it, and the
     second "2020 – 2022, 2015 – 2016" with the name; the Section editors
     still serving are not listed (Rule 16).
   - **Control**: the fourth member is listed under "Editorial Board
     Member", the role they are set to appear in (Rule 14b).

8. **Changes to the team show at the next load**

   Given: Journal Manager, on a scratch journal whose Section editor role
   holds three members with the family names "Able", "Baker" and "Carter",
   Able also holding the Reader role, with a Reader "Dunn" and an Author
   "Evans" set to "Appear on the masthead" as Author.

   - **Before**: signed out, "Editorial Masthead" lists Able, Baker and
     Carter under "Section editor" and has no "Author" heading, and
     "Editorial History" lists nobody (Rules 14a, 16).
   - **A role given**: invite Dunn to the Section editor role, starting
     today and set to "Appear on the masthead", as
     [User invitations](U06-user-invitations.md) scenario 3 does; Dunn:
     accept the invitation from the mailbox; signed out, "Editorial
     Masthead" lists Dunn under "Section editor" with this year and a dash
     (Rules 14b, 14e).
   - **"Remove Role"**: Journal Manager: on Settings › Users & Roles ›
     "Users" press Able's "Edit" and end the Section editor role with
     "Remove Role", as User invitations scenario 8 does; signed out, Able
     has left "Editorial Masthead", and "Editorial History" lists Able under
     "Section editor" with this year's number on both sides of the dash
     (Rules 14e, 16).
   - **The masthead choice**: on Baker's "Edit" set the Section editor
     role to "Does not appear on the masthead" and confirm (on a press or
     preprint server the choice is saved behind an error window, which
     [User invitations](U06-user-invitations.md#omp1) records); signed out,
     Baker has left "Editorial Masthead" and is not on "Editorial History"
     (Rule 14e; Settings bullet 3).
   - **"Consider role in masthead list" ticked**: on Settings › Users &
     Roles › "Roles" open the "Author" role's "Edit", tick "Consider role
     in masthead list" and save the form; signed out, "Editorial Masthead"
     shows an "Author" heading with Evans under it (Rule 14e; Settings
     bullet 2).
   - **"Consider role in masthead list" unticked**: untick it on the
     "Section editor" role and save the form; signed out, "Editorial
     Masthead" has no "Section editor" heading, and Carter and Dunn are
     gone with it; "Editorial History" no longer lists Able (Rule 14e;
     Settings bullet 2).
   - **Control**: the "Author" heading with Evans is still on "Editorial
     Masthead" after the Section editor role was unticked (Settings bullet
     2).

9. **"Peer Reviewers in Previous Year"** {OJS OMP}

   Given: a visitor, signed out, on a scratch journal whose "Enable
   listing of reviewers on the masthead" is ticked, whose Reviewers
   "Zeta", with the affiliation "Review University" and the verified ORCID
   iD "https://orcid.org/0000-0002-1694-233X", and "Beta" each submitted a
   review last calendar year, whose
   Reviewer "Gamma" submitted one this year only, and, on a press, whose
   Internal Reviewer "Delta" submitted a review of the Internal Review
   last year.

   - **The block**: open "Editorial Masthead": after the horizontal rule
     under "View Editorial History" come the heading "Peer Reviewers in
     Previous Year" and "The editors express their appreciation of the
     reviewers for {year} listed below." with last year's number, then Beta
     and Zeta in that order, with no year before either name; "Review
     University" sits under Zeta's name, beside an ORCID icon that opens a
     new browser tab at Zeta's iD (Rules 14c, 15).
   - **An internal review** {OMP}: Delta is not listed (Rule 15).
   - **Control**: Gamma, whose review was submitted this year, is not
     listed while Beta and Zeta, of last year, are (Rule 15).

   A preprint server has no reviews; scenario 12 reads its masthead.

10. **A journal not accepting submissions**

    Given: Journal Manager, on a scratch journal accepting submissions.

    - **Disabled**: open Settings › Workflow › "Submission", tick "Disable
      Submissions" and press "Save": "Saved" (Rule 4a).
    - **The four pages**: load Settings › Journal, Website, Workflow and
      Distribution in turn: each shows above its tabs "This journal is
      not accepting submissions at this time. Visit the workflow settings
      to allow submissions." ("This press …", "This server …") (Rule 4a).
    - **"Users & Roles"**: load it: no such notice shows above its tabs
      (Rule 4a).
    - **Allowed again**: on Settings › Workflow › "Submission" untick
      "Disable Submissions", press "Save" and load Settings › Journal
      again: the notice is gone [A8] (Rule 4a).
    - **Control**: before the box was ticked, Settings › Journal showed no
      such notice above its tabs (Rule 4a).

11. **An Editor whose role may not change the Settings** {OJS OMP}

    Given: an Editor and a Production editor of a scratch journal, the
    Editor role's "Permit changes to Settings" unticked and the Production
    editor role's left ticked.

    - **The side menu**: Editor: sign in: the side menu has no "Settings"
      group (Settings bullet 1).
    - **The Settings addresses**: open the addresses of Settings ›
      Journal, Website, Workflow, Distribution and Users & Roles, as a
      Journal Manager's browser shows them: each
      shows the access-denied page ("The current role does not have access
      to this operation.") (Settings bullet 1).
    - **The "Edit" links**: "About the Journal", "Editorial History" and
      "Contact" each still carry an "Edit" link under the heading [A2]
      (Actors row 5; Settings bullet 1).
    - **Control**: Production editor: sign in: the side menu holds the
      "Settings" group, and the same five addresses open their pages
      (Actors row 1).

    A preprint server's only manager-level role is the Preprint Server
    Manager, whose row offers no "Edit".

App-specific:

12. **{OPS} No Information texts and no peer reviewers on a preprint server**

    Given: Preprint Server Manager, on the seeded preprint server.

    - **The "Setup" side tabs**: open Settings › Website › "Setup": its
      side tabs hold "Privacy Statement" and no "Information" [OPS1]
      (Rule 19c).
    - **The "Sidebar" list**: open Settings › Website › "Appearance" ›
      "Setup": the "Sidebar" list offers no Information block (Rule 19c).
    - **The Information addresses**: signed out, open the server's own
      address followed by "/information/readers", "/information/authors"
      and "/information/librarians": each answers "404 Not Found" (Rule
      19c).
    - **The masthead**: open "Editorial Masthead": the page ends with the
      line "View Editorial History" and the horizontal rule, with no "Peer
      Reviewers in Previous Year" after them (Rule 15).
    - **Control**: the "Privacy Statement" side tab opens with its box;
      signed out, the "Contact" page opens at the address the header's
      "About" menu gives it, with its heading; and the masthead's role
      headings show above the rule (Rules 14a, 17, 18).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the masthead not based on enrollments, "Present a masthead based on user enrollments" unticked: the masthead showing under its heading only the "Editorial History" text (and a manager's "Edit" link), or nothing with that text empty, the "Editorial History" address opening the masthead, the other two groups leaving the tab, and, ticked again, both pages listing as before in the saved role order (Rule 14f; Rules 16, 21; Settings bullet 4a)
  - "Enable listing of reviewers on the masthead" at its default: no "Peer Reviewers in Previous Year" although reviews were completed last year {OJS OMP} (Rule 15; Settings bullet 4c)
  - a disabled member staying listed on both pages and under "Peer Reviewers in Previous Year" (Rule 14e; A4 retired)
  - "Remove User" moving the member to "Editorial History" at the next load, and a member with a later start date listed from that date on (Rule 14e; A5 retired)
  - "Merge user" of a listed member listing the kept account under the member's role (Rule 14e)
- **Nothing new to test**:
  - a second form language: its boxes behind the language button, and each public page in the visitor's language with the primary language's text where that box is empty (Fields; Rule 11; Settings bullet 12)
  - unsaved changes kept while moving between the tabs of a page, and lost without a warning on reloading or leaving it (Rule 5)
  - another order of the roles on Settings › Website › "Appearance" › "Editorial Masthead" (Rule 14a; Settings bullet 4b)
  - the abbreviation, the "Publishing Details", "Sponsoring organization" and "Publisher Identity" saved and shown again on the tab (Fields; Rule 10)
  - a renamed "Journal initials" beside the journal's tasks for an account in two journals (Rule 7)
  - the page about the publishing software reached from the site's own pages (Rule 20; OMP2)
  - "Publisher Code Type" kept once saved, its list offering no empty choice {OMP} (Fields)
  - an unknown address under the Settings pages answering "404 Not Found" (Rule 3)
  - the Editor and the Production Editor opening and saving the tabs, the Journal Manager's offer in scenarios 2–6 (Actors rows 1–3; scenario 11's Production editor opens the pages)
  - a Site Administrator working in a journal, a manager-level role there like the Journal Manager (Actors row 1)
  - "Information Block" disabled on the Plugins list: the block leaves the sidebar, as when every text is emptied in scenario 6 (Settings bullet 5)
- **Register carries it**:
  - A1 (a Site Administrator with no manager-level role in a press or preprint server refused every Settings page; Actors row 1)
  - A2 (the "Edit" link shown to a manager-level role without "Permit changes to Settings"; Actors row 5; scenario 11 marks it)
  - A3 (the "Contact" tab refused until a technical support contact is entered; Fields; scenario 4 marks it)
  - A6 (the "Editorial History" page headed "Editorial History Page"; Rules 12, 16; scenario 1 marks it)
  - A7 (a Settings side tab lost on a reload; Rule 1)
  - A8 (the not-accepting notice staying on the open page after submissions are allowed again; Rule 4a; scenario 10 marks it)
  - A9 (the default "For Readers" text's "Privacy Statement" link opening the "Submissions" page; Fields)
  - A10 (a reviewer whose submitted review was cancelled still listed under "Peer Reviewers in Previous Year"; Rule 15)
  - A11 (Hosted Journals "Edit" refused on a journal whose "Country" was never set; Settings bullet 8)
  - A12 (a press's and a preprint server's French Masthead tab showing raw text keys; Fields)
  - A13 (the invitation and the role-change email promising a masthead listing the journal does not show; Settings bullet 3)
  - OMP1 (Settings › Press headed "Setup"; Rule 1; scenario 2 marks it)
  - OPS2 ("Sponsoring organization" used nowhere; Fields; Rule 10)
  - OPS3 (a preprint server's French privacy default arriving as a raw text key; Fields)
  - OPS4 (a preprint server's French masthead heading its Moderators with a raw text key; Rule 14a)
- **No seed**:
  - a journal upgraded from a release without the "Enrollment-based Masthead" group, reading its box unticked (Settings bullet 4a): the test installs are never upgraded
  - the newer-release notice on Settings › Journal (Rule 4b; Settings bullet 11): the test installs never reach the internet
  - the site's own "Privacy Statement" set (Rule 18; Settings bullet 10)
  - the site-wide privacy statement switch on (Rule 18; Settings bullet 9): no screen changes it
- **Owned by another feature**:
  - where the abbreviation, the "Publishing Details" and "Publisher Identity" take effect: indexes, registration agencies and exports (Rule 10; the features that produce that metadata)
  - the "Journal Abbreviation" in the article's "How to Cite" (Fields; Rule 10; *Article landing page & reading*)
  - the "Journal Summary" in the site's list of journals and on the home page (Rule 8; *Hosted journals*, *Appearance & theming*)
  - the other tabs of the five Settings pages (Rule 2; the features its table names)
  - the "Announcements", "Institutions" and "Comments" pages with their side-menu entries, and the users list's "Edit" (Rule 3; [Announcements](U12-announcements.md), [Institutions](U66-institutions.md), [Reader comments & moderation](U14-reader-comments-and-moderation.md) scenario 6, [User invitations](U06-user-invitations.md) scenario 8)
  - the error window of a masthead choice changed on a press or preprint server (Settings bullet 3; [User invitations](U06-user-invitations.md#omp1); scenario 8 passes it)
  - which email of a press or preprint server carries the new principal contact as its sender (Rule 9; Side effects: each email's own feature says when it is sent; [Publish, schedule & versions](U49-publish-schedule-and-versions.md))
  - the technical support contact as the sender of the account-validation email ([Registration & account validation](U02-registration-and-account-validation.md) scenario 7)
  - the consent boxes leaving the Register page, the submission wizard and the reviewer's first step once the privacy statement is emptied (Side effects; [Registration & account validation](U02-registration-and-account-validation.md) scenario 4, [Submission wizard](U21-submission-wizard.md), [Reviewer's review](U28-reviewers-review.md))
  - "Users must be registered and log in to view the journal site." ticked, sending a signed-out visitor to Login from every About page and back to it after signing in (Settings bullet 7; Rule 22; *Roles configuration*)
  - a journal not enabled, sending a signed-out visitor to Login and, after signing in, not back to the page asked for (Settings bullet 8; Rule 22; [Hosted journals](U59-hosted-journals.md#a8))

## Findings register

Verdicts are the author's judgment (claude, 2026-09-23), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | On a press or preprint server, a Site Administrator with no manager role there is offered "Settings" and refused every Settings page | 🐞 | user-visible | — |
| [A7](#a7) | Reloading a Settings side tab opens the page's first tab instead | 🐞 | minor | — |
| [A9](#a9) | The default "For Readers" text's "Privacy Statement" link opens the "Submissions" page {OJS OMP} | 🐞 | minor | — |
| [A11](#a11) | Hosted Journals "Edit" refuses to save a journal whose "Country" was never set | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A12](#a12) | A press's and a preprint server's French Masthead tab shows raw text keys in place of headings, labels and help lines {OMP OPS} | 🐞 | minor | — |
| [A13](#a13) | With the masthead not based on enrollments, invitations and masthead changes still promise "Your name will appear in the {journal}'s masthead"; reviewers are promised it while the journal lists none | 🐞 | minor | — |
| [OMP2](#omp2) | The site-level page about the software says "This press uses Open Monograph Press" on a press site {OMP} | 🐞 | minor | — |
| [OPS3](#ops3) | A preprint server's French "Privacy Statement" default is the raw text "##default.contextSettings.privacyStatement##" {OPS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OPS4](#ops4) | A preprint server's French "Editorial Masthead" heads the Moderators "##default.groups.name.sectionEditor##" {OPS} | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | The "Edit" link of the About pages is shown to a manager-level role that cannot open the Settings pages | ❓ | minor | — |
| [A3](#a3) | The "Contact" tab cannot be saved until a technical support contact is entered, and new journals have none | ❓ | minor | — |
| [A6](#a6) | The "Editorial History" page is headed "Editorial History Page" | ❓ | minor | — |
| [A8](#a8) | The not-accepting notice stays on the Settings page after submissions are allowed again | ❓ | minor | — |
| [A10](#a10) | A reviewer whose submitted review was later cancelled stays on "Peer Reviewers in Previous Year" {OJS OMP} | ❓ | minor | — |
| [OMP1](#omp1) | The press's Settings › Press page is headed "Setup", not "Press Settings" {OMP} | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server's "Sponsoring organization" is saved and used nowhere {OPS} | ❓ | latent | — |
| [OPS1](#ops1) | A preprint server has no "Information" tab, Information pages or Information block {OPS} | ✅ | minor | — |
| [A4](#a4) | Retired: a disabled member made "Editorial Masthead" and "Editorial History" fail with a server error; the member now stays listed and both pages open (Rule 14e) | ✅ | retired | upstream change + claim check (claude), 2026-09-29 — fixed upstream |
| [A5](#a5) | Retired: "Remove User" reached "Editorial History" only after an unrelated change, and a later start date was not known to list; both now show at the next load (Rule 14e) | ✅ | retired | upstream change + claim check (claude), 2026-09-29 — fixed upstream, settled |

### All apps

<a id="a1"></a>
**A1 — A Site Administrator without a press or server role is refused the Settings pages** · 🐞 · user-visible.
On a journal a Site Administrator opens every Settings page whether or
not they hold a manager role there. On a press or a preprint server an
administrator who holds no manager-level role there still sees "Settings"
in the side menu, but each of its five entries ("Press" or "Server",
"Website", "Workflow", "Distribution", "Users & Roles") answers the
access-denied page. The applications were meant to give administrators
the same access everywhere, and the press and server kept the old rule
for these pages.
Since: 2022-05-05 · Basis: probe + code reading. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Edit" offered to a role that cannot edit** · ❓ · minor.
An Editor or Production Editor whose role has "Permit changes to
Settings" unticked has no "Settings" in the side menu, yet sees "Edit" on
"About the Journal", "Editorial History", "Contact" and the Information
pages; the link leads to the access-denied page. Question: should the
"Edit" link follow the same rule as the Settings pages? Lean: yes, a link
that always ends on an error page is a defect. Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The "Contact" tab demands a technical support contact** · ❓ · minor.
A journal created by the Site Administrator has a principal contact and
no technical support contact. The manager who opens Settings › Journal ›
"Contact" to change the principal contact's phone is stopped with "This
field is required." under the support contact's "Name" and "Email
address" and cannot save until they invent one. Question: is a technical
support contact meant to be mandatory? Lean: intended, since the
account-validation email is sent from it and fails without it, but the
creation form should then ask for it too. Basis: probe. <sup>f-a3</sup>

<a id="a6"></a>
**A6 — "Editorial History Page"** · ❓ · minor.
The masthead's link, the breadcrumb and the browser title all say
"Editorial History", but the page's heading reads "Editorial History
Page". Question: is the word "Page" meant to be in the heading? Lean: no,
a leftover of the heading's text. Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Reloading a Settings side tab loses it** · 🐞 · minor.
A manager who reloads a Settings page while on a side tab (Settings ›
Website › "Setup" › "Privacy Statement"), or bookmarks it and comes back,
expects the same tab, as a top tab such as Settings › Journal › "Contact"
gives. The page opens on its first tab ("Appearance" › "Theme") instead,
on every side tab of every Settings page. Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The not-accepting notice outlives the change** · ❓ · minor.
A manager who unticks "Disable Submissions" (Settings › Workflow ›
"Submission") and saves sees "Saved", while "This journal is not
accepting submissions at this time. Visit the workflow settings to allow
submissions." stays above the tabs until the page is loaded again.
Question: should the notice go with the save? Lean: yes; a notice that
contradicts the saved setting misleads. Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The default "Privacy Statement" link opens the Submissions page** {OJS OMP} · 🐞 · minor.
The "For Readers" text every new journal and press arrives with points
readers to the journal's "Privacy Statement" through a link of that
name. A reader who opens "Information For Readers" and follows it lands
on the "Submissions" page, not on the "Privacy Statement" page. Basis:
probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A cancelled review still counts** {OJS OMP} · ❓ · minor.
The Reviewers panel offers "Cancel Reviewer" on a review already
submitted, and the row then reads "Request Cancelled". A reviewer whose
review submitted last year was cancelled this way stays listed under
"Peer Reviewers in Previous Year" on a journal that lists its reviewers
(Rule 15). Question: should a cancelled request
count? Lean: no; the editor withdrew the request. Basis: probe. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Hosted Journals "Edit" refuses a journal with no country** · 🐞 · low.
Administration › Hosted Journals › "Edit" leaves "Country" unmarked, as
"Create Journal" does, yet on a journal with no country (every journal
upgraded from 3.3 until a manager saves its "Masthead") "Save" answers
"Please correct one error." with "This is not a valid string." and "This
is not a valid country." under "Country". The Site Administrator cannot
change anything there, for example untick "Enable this journal to appear
publicly on the site", until a country is picked. "Create Journal"
refuses an empty "Country" the same way. *Hosted journals* owns the
form ([A1](U59-hosted-journals.md#a1)). Basis: probe, 2026-10-02. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The French Masthead tab of a press or preprint server shows raw text keys** {OMP OPS} · 🐞 · minor.
A manager working in French expects the "Bloc générique" tab (the
"Masthead" tab) of Settings › Press (page heading "Configuration") or
Settings › Server ("Paramètres du serveur") to read in French, as a
journal's does. On a press:
- the first two group headings read "##manager.setup.identity##" and
  "##manager.settings.publisher.identity##";
- the label of "Publisher Code Type" reads
  "##manager.settings.publisherCodeType##", and four of its choices read
  "GKD##monograph.publicationFormat.onixDeprecated##" (likewise "GRID",
  "PND", "Proprietary") where English reads "GKD (Discontinued)";
- the help line under "Pays" reads "##manager.setup.selectCountry##";
- in "Description" the two labels read "##manager.setup.contextSummary##"
  and "##manager.setup.contextAbout##", with the help lines
  "##manager.setup.contextSummary.description##" and
  "##manager.setup.contextAbout.description##".

On a preprint server the last label of "Identité du serveur" reads
"##manager.setup.sponsoringOrganization##", the help line under "Pays"
"##manager.setup.selectCountry##" and the one under "Résumé du serveur"
"##manager.setup.contextSummary.description##". The applications' French translations have no text for these keys.
Basis: probe. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — Invitations and masthead changes promise a listing the masthead does not give** · 🐞 · minor.
With "Present a masthead based on user enrollments" unticked (Settings
bullet 4a; every upgraded journal until a manager ticks it), "Editorial
Masthead" lists nobody (Rule 14f), yet "Invite to a role" (Settings ›
Users & Roles) still offers
"Appear on the masthead", its email still says "Your name will appear in
the {journal}'s masthead as a Section editor.", and a masthead change on
a user's "Edit" page still mails "New setting: Appear on the masthead".
With "Enable listing of reviewers on the masthead" unticked, as on every
new journal and press {OJS OMP}, the invitation fixes a Reviewer role to
"Appear on the masthead" and its email says "… as a Reviewer." while no reviewers
are listed. The invitations work; only the promise is false, and
reviewers are promised the very listing that was made optional to
protect them. The older promise for roles the masthead never lists:
[User invitations A11](U06-user-invitations.md#a11).
Since: 2026-09-28 · Basis: probe + code reading. <sup>f-a13</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The press settings page is headed "Setup"** · ❓ · minor.
Settings › Press opens a page headed "Setup", with "Setup" as its browser
title, where a journal reads "Journal Settings" and a preprint server
"Server Settings"; "Setup" is also the name of side tabs on the Website
page. Question: should the press read "Press Settings"? Lean: yes, the
press kept an older label. Basis: probe. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The site-level software page says "This press"** · 🐞 · minor.
On the site's own pages of a press installation (no press in the
address), the page about the software opens "This press uses Open
Monograph Press {version}…" and ends by pointing to "the site" and "its
presses", where a journal and a preprint server installation open "This
site uses …". Basis: probe. <sup>f-omp2</sup>

### OPS

<a id="ops1"></a>
**OPS1 — No Information texts on a preprint server** · ✅ · minor.
A preprint server's Settings › Website › "Setup" has no "Information" side
tab, its Information addresses answer "404 Not Found", and it has no
Information block to place. The server's application leaves the
Information tab out on purpose. Basis: probe. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — "Sponsoring organization" goes nowhere** · ❓ · latent.
A preprint server's Masthead tab offers "Sponsoring organization", and a
manager who fills it expects to see it on the server's About pages or in
its metadata. The value is saved and shown again on the tab, and no
public page, email, export or metadata of the server ever uses it.
Question: should the server show it (for example on "About the Server"),
or should the field go? Lean: show it or drop it; a field that goes
nowhere misleads. Since: 2019-06-04 · Basis: probe + commit. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — The French privacy statement arrives as a raw text key** · 🐞 · medium.
When French is ticked under "Forms" on Settings › Website › "Setup" ›
"Languages", or the server is created with French forms, the "Privacy
Statement" tab's French box holds
"##default.contextSettings.privacyStatement##" where a journal and a
press get a French statement. Left as it is, that text is the whole
body of the server's French "Privacy Statement" page, headed
"Déclaration de confidentialité".
Basis: probe, 2026-10-01. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — The French masthead names the Moderators by a raw text key** · 🐞 · medium.
A visitor reading a preprint server in French expects the role headings
of "Editorial Masthead" (headed "Entête" in French) in French, as a
journal gives them ("Rédacteur-trice", "Rédacteur-trice de rubrique")
and a press ("Rédacteur/Rédactrice en chef de la presse",
"Rédacteur/Rédactrice en chef de la série"). The server heads its
Moderators "##default.groups.name.sectionEditor##", above "Membre du
comité éditorial" for the Editorial Board Member. The order list under
Settings › Website › "Appearance" › "Editorial Masthead" ("Entête" in
French) names the role the same way. The server's French translation has
no text for the role's name; the users list shows the same key
([Users management](U53-users-management.md#ops1)).
Basis: probe, 2026-10-01.
<sup>f-ops4</sup>

### Retired

<a id="a4"></a>
**A4 — Disabling a listed member breaks the masthead** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13387, 2026-09-24), verified 2026-09-29 on OJS, OMP and OPS: a disabled member stays listed on "Editorial Masthead", "Editorial History" and "Peer Reviewers in Previous Year", and both pages open for every visitor (Rule 14e). <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Removed and future members wait for an unrelated change** · ✅ · retired. Fixed upstream for "Remove User" (pkp/pkp-lib#13387, 2026-09-24) and settled for start dates, verified 2026-09-29 on OJS, OMP and OPS: a member removed with "Remove User" is on "Editorial History" at the next load, and a member with a later start date is listed from that date on, with no other change (Rule 14e). <sup>f-a5</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-23 at the checkouts' tips: ojs 802202cb3e (lib/pkp
5af3b39336), omp 7f9455d5a (lib/pkp 63945bbd82), ops 15f0b6e0bd (lib/pkp
f8bacd7658). The lib/pkp files behind this feature (the four context forms,
`ManagementHandler`, both about handlers, the six page templates,
`website.tpl`, `lib/pkp/schemas/context.json`, `common.po`) are byte-identical
in the three checkouts; `lib/pkp/locale/en/manager.po` differs on OMP by one
unrelated DOI string. Labels are resolved app locale first, then lib/pkp.
Every claim of the body was driven on the three test installs on
2026-09-23, on the seeded journals and on scratch journals, presses and
servers; each footnote says what its probe saw. Rules 14–16 and 21, Settings
bullets 2–4 and scenarios 7–9 and 12 were driven again on 2026-09-29 at ojs
9d9f116f38, omp 480045c32 and ops 5da5bc48ad, all three at lib/pkp
fab29cfeca (pkp/pkp-lib#13370, "Port masthead configuration improvements
to main", 2026-09-28, which follows `e0c43a1227`, pkp/pkp-lib#13387, "Keep
disabled users on the masthead, restore masthead cache clearing",
2026-09-24), two runs per app; notes ad, td12, td13 and f-a13 say what
they saw.

<a id="fn-a"></a>
**a** — Layout and class chain (RUNBOOK rule 8). Settings dispatcher:
`lib/pkp/pages/management/ManagementHandler.php` (ops `settings`,
`context`, `website`, `workflow`, `distribution`, `access`,
`announcements`, `institutions`, `manageEmails`, `userComments`,
`editUser`), subclassed by each app's `pages/management/SettingsHandler.php`:
none overrides `context()` or `website()`; OJS and OMP override `workflow()`
and `distribution()`; OPS overrides both plus `getInformationForm()`
(returns null, note i). Role assignments differ (note b). Masthead form:
`PKP\components\forms\context\PKPMastheadForm`, subclassed by
`APP\components\forms\context\MastheadForm` in each app (OJS adds
`abbreviation` to the identity group and `publisherInstitution`,
`publisherUrl`, `onlineIssn`, `printIssn` to the publishing group; OMP adds
the `onix` group after identity with `publisher`, `location`, `codeType`,
`codeValue`; OPS adds `abbreviation` and `sponsoringOrganization` to the
identity group); `PKPContactForm`, `PKPInformationForm` and `PKPPrivacyForm`
are used unsubclassed. Public pages: `lib/pkp/pages/about/index.php` maps
`index`, `editorialMasthead`, `editorialHistory`, `submissions`, `contact` to
`PKP\pages\about\AboutContextHandler` and `privacy`,
`aboutThisPublishingSystem` to `PKP\pages\about\AboutSiteHandler`; OJS's
`pages/about/index.php` adds `subscriptions` (`APP\pages\about\AboutHandler`,
the subscriptions feature) and falls back to lib/pkp; OMP and OPS have no
app `pages/about`. Information pages: `APP\pages\information\InformationHandler`
in OJS and OMP only. Templates: `lib/pkp/templates/frontend/pages/{about,editorialMasthead,editorialHistory,contact,privacy,information}.tpl`
and each app's `templates/frontend/pages/aboutThisPublishingSystem.tpl`; no
theme in the three checkouts overrides them (`find plugins/themes -name
"*.tpl"`). Every value is a context setting written by `PUT
api/v1/contexts/{id}` (`PKPContextController::edit()`), so each journal has
its own; the site's privacy statement is a site setting.
Live-probed 2026-09-23 (Purpose; Rule 6; all three apps): the tabs carry
the fields named; every About page answered signed out and as a Reader on
the seeded journal; after a scratch journal saved its tabs, a second
scratch journal's and the seeded journal's "Contact", "Privacy Statement"
and "About" pages kept their own values, and the site-level privacy page
still answered "404 Not Found".

<a id="fn-b"></a>
**b** — Gate. `ManagementHandler::authorize()` adds `ContextAccessPolicy`
(the handler's role assignments) and, for op `settings` unless the
arguments are exactly `['announcements']` or `['userComments']`,
`CanAccessSettingsPolicy`, which permits a user group with `roleId`
`ROLE_ID_SITE_ADMIN`, or `ROLE_ID_MANAGER` with `permitSettings`. Role
assignments (`SettingsHandler::__construct()`): OJS `ROLE_ID_SITE_ADMIN` →
`access`, `settings`; OMP and OPS `ROLE_ID_SITE_ADMIN` → `access` only;
all three `ROLE_ID_MANAGER` → `settings`. Every Settings page, Users &
Roles included, is op `settings` (`settings/context`, `settings/website`, …,
`settings/access`), so on OMP and OPS an administrator's access comes only
from a manager group held in that context (A1). `UserRolesRequiredPolicy`
loads the user's groups of the context and of the site, so the admin
group (created by `PKPInstall` with `permitSettings` true) counts
everywhere. Denials: `RoleBasedHandlerOperationPolicy`'s message
`user.authorization.roleBasedAccessDenied` "The current role does not have
access to this operation."; `CanAccessSettingsPolicy` sets no message of
its own, and the router's fallback `user.authorization.accessDenied`
"Access denied." is not what the screen shows (below);
`PKPPageRouter::handleAuthorizationFailure()` sends a signed-out request to
Login and a signed-in one to `user/authorizationDenied`. Side menu:
`PKPTemplateManager` builds the `settings` group (`navigation.settings`
"Settings"; entries `context.context` "Journal"/"Press"/"Server",
`manager.website` "Website", `manager.workflow` "Workflow",
`manager.distribution` "Distribution", `navigation.access` "Users & Roles")
inside the `ROLE_ID_MANAGER`/`ROLE_ID_SITE_ADMIN` branch when any of the
user's groups has `permitSettings`. Defaults (`registry/userGroups.xml`):
`permitSettings="true"` on `manager`, `editor`, `productionEditor` (OJS,
OMP) and on `manager` (OPS, its only manager-level group). The box is
`settings.roles.permitSettings` "Permit changes to Settings" on the Roles
form (`UserGroupForm`). The API behind every tab (`PKPContextController`,
routes `PUT {contextId}`) admits `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER`
and adds `CanAccessSettingsPolicy`. The test installs enrol `admin` as a
manager in every context (seed-facts, `ContextFactory`), and the last role
of an account cannot be removed ("You cannot remove the role. At least one
role must be assigned to the user."), so an administrator with no role at
all in a journal is not reachable there.
Live-probed 2026-09-23 (Actors preamble, rows 1–3; Settings bullet 1; all
three apps): the Roles grid's permission level read "Journal Manager" for
Journal manager, Journal editor and Production editor on a journal, "Press
Manager" on a press, and "Manager" for the Preprint Server manager, the
only row at that level on a preprint server; the Editor and Production
editor rows' "Edit" showed "Permit changes to Settings" ticked, and the
manager row has no "Edit". The Journal Manager, the Editor, a Production
editor and `admin` got the side menu's "Settings" and opened all five
pages; the Section Editor, Assistant, Copyeditor, Reviewer, Author and
Reader got no "Settings" and, at each of the five addresses,
`user/authorizationDenied` with "The current role does not have access to
this operation."; signed out, each address redirected to Login. A scratch
Editor and Production editor (OJS, OMP) whose box was unticked on the
Roles screen ("Your changes have been saved.") lost "Settings", got the
same sentence at every Settings address, and kept the "Announcements" and
"Comments" entries and the About pages' "Edit".

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-23 (Actors row 1; A1; all three apps): on
a scratch journal, press and server where `admin` held a Section editor
role (Series editor, Moderator) and no manager-level role, signed in as
`admin`: on the journal "Settings" offered its five entries and each
opened its page;
on the press and the server the same five entries were offered and each,
pressed or typed as an address, landed on the access-denied page with
"The current role does not have access to this operation.".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-23 (Actors rows 2–3; all three apps): the
Section Editor, Author and Reader on the seeded journal got no "Settings"
and "The current role does not have access to this operation." at
`{journal}/management/settings/context`; signed out, Login. A scratch
Editor without "Permit changes to Settings" (OJS, OMP) got the same
sentence there, and the "Announcements" page opened from its entry and by
address once announcements were on. On scratch journals the Journal
Manager saved "Masthead" (after choosing a country and filling the
initials) and "Contact", a Production editor "Masthead" and "Information",
the Editor "Privacy Statement", each with "Saved"; the public pages showed
the saved text.

<a id="fn-c"></a>
**c** — `AboutContextHandler::authorize()` adds only `ContextRequiredPolicy`
(and marks the page cacheable when the context does not restrict access);
`PKPHandler::authorize()` adds `RestrictedSiteAccessPolicy` for every page
handler, which applies when the context's `restrictSiteAccess` is set and
lets through signed-in users and the pages `user`, `login`, `help`,
`header`, `sidebar`, `payment`, `invitation` only, so every `about` and
`information` page sends a signed-out visitor to Login. The box is
`manager.setup.restrictSiteAccess` "Users must be registered and log in to
view the journal site." ("… the press site.", "… the server site.") on
`PKPUserAccessForm` (Users & Roles › Site Access Options).
`PKPPageRouter::route()` redirects a signed-out request for a context that
is not enabled to Login, except `login` and `invitation`; the box is
`admin.journals.enableJournalInstructions` "Enable this journal to appear
publicly on the site" on the Hosted Journals edit form (OPS
`admin.contexts.enableContextInstructions`).
Live-probed 2026-09-23 (Actors row 4; Rule 22; Settings bullets 7–8; all
three apps): after a scratch journal's manager ticked the box on Users &
Roles › "Site Access Options" ("Saved"), and on a scratch journal
un-enabled on Hosted Journals (once a country was picked, A11), a
signed-out visitor at "About the Journal", "Editorial Masthead",
"Editorial History", "Contact", "Privacy Statement", the software page,
"Submissions", the Information pages and the home page landed on Login,
while the journal's manager still opened them. On a preprint server with
the box ticked the Information addresses stayed "404 Not Found"; on one
not enabled `information/readers` sent a signed-out visitor to Login.
The return after sign-in (Rule 22): the sign-in gate goes through
`Validation::redirectLogin()`, which keeps `login?source=…`, while the
not-enabled gate redirects to `login` with no `source`, so
`LoginHandler::_redirectAfterLogin()` sends a role holder to the
dashboard and a Reader to the journal's `index`; live-probed 2026-09-29
on all three apps, two runs each, as Hosted journals' note f-a8 records,
and not driven again for this spec.

<a id="fn-d"></a>
**d** — `lib/pkp/templates/frontend/components/editLink.tpl` renders only
when `ROLE_ID_MANAGER` is among `$userRoles` (the user's roles in the
context and on the site, so a manager-level Editor without
`permitSettings` sees it and a Site Administrator without a journal role
does not): a link `common.edit` "Edit" with the screen-reader text
`help.goToEditPage` "Edit {$sectionTitle}" (OJS, OPS; the Information
pages pass "Information" as the title) or "Open a new page to edit this
information" (OMP's own key). Targets as included: `about.tpl` and
`editorialHistory.tpl` → `management/settings/context#masthead`;
`contact.tpl` → `#contact`; `information.tpl` →
`management/settings/website#setup/information`. `editorialMasthead.tpl`
and `privacy.tpl` include none. The same component serves the
announcements page (its own spec, Rule 9).
Live-probed 2026-09-23 (all three apps): note td3.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-23 (Actors row 5; Rule 21; A2; all three
apps): "Edit" under the heading of "About the Journal", "Editorial
History", "Contact" and the three Information pages for the Journal
Manager, the Editor, a Production editor and `admin` with its manager
role; none for the Section Editor, Assistant, Copyeditor, Reviewer,
Author, Reader, signed out, or `admin` without a manager role; none on
"Editorial Masthead", "Privacy Statement" or the software page. Pressed,
in the same window: "About the Journal" and "Editorial History" opened
Settings › Journal on "Masthead", "Contact" on "Contact", an Information
page Settings › Website on "Setup" › "Information" (the address then
ending `#information`). Screen-reader text "Edit About the Journal",
"Edit Editorial History", "Edit Contact", and "Edit Information" on each
Information page; on OMP "Open a new page to edit this information"
everywhere. An Editor and a Production editor without "Permit changes to
Settings" (OJS, OMP) saw "Edit" on every one of those pages, and pressing
it landed on "The current role does not have access to this operation.".

<a id="fn-e"></a>
**e** — Masthead membership. `AboutContextHandler::editorialMasthead()`
takes the roles from `Repo::userGroup()->getSortedMastheadUserGroups()`
(groups of the context with `masthead` true, excluding `ROLE_ID_REVIEWER`,
ordered by role id, then by the saved `mastheadUserGroupIds`), the
members from `getMastheadUserIdsByRoleIds()` (users of the context in those
groups with an active assignment and `masthead` on, ordered by family name
in the request's locale and then the site's primary locale), and keeps a
member only while `UserUserGroup::withActive()->withMasthead()` finds the
assignment. `withActive()`: `date_start` null or not after now, `date_end`
null or after now. Registry flags (`registry/userGroups.xml`,
`masthead="true"`): OJS and OMP `editor`, `sectionEditor`,
`externalReviewer`, `editorialBoardMember`; OPS `sectionEditor`,
`editorialBoardMember`. Group names: `default.groups.name.editor` "Journal
editor"/"Press editor", `sectionEditor` "Section editor"/"Series
editor"/"Moderator", `editorialBoardMember` "Editorial Board Member",
`externalReviewer` "Reviewer"/"External Reviewer". Role form box
`settings.roles.masthead` "Consider role in masthead list"
(`userGroupForm.tpl`); member choice `invitation.masthead.show` "Appear on
the masthead" / `invitation.masthead.hidden` "Does not appear on the
masthead" (invitation wizard). The harness's `UserSeeder` assigns every
seeded role with `masthead` true, so the roster's editors, section editors
and (on OPS) `assistant.rita` as Editorial Board Member are listed on the
seeded journals. Peer reviewers: note s.
Live-probed 2026-09-23 (Actors row 6; Settings bullets 2–3; all three
apps): a fresh scratch journal's role windows had "Consider role in
masthead list" ticked on Journal editor, Section editor, Reviewer and
Editorial Board Member (OJS); on Press editor, Series editor, External
Reviewer and Editorial Board Member, with Internal Reviewer unticked
(OMP); on Moderator and Editorial Board Member (OPS); every other role
unticked, Production editor included. "Author" ticked and saved put an
"Author" heading on the masthead; "Section editor" unticked took its
heading and members off both pages (a member with another listed role
stayed under it) and ticked again brought them back; "Reviewer" unticked
left the peer-reviewer list as it was; a changed box closed with
"Cancel" saved nothing. The invitation's role row offers the inviting
manager "Appear on the masthead" / "Does not appear on the masthead"; the
invitee's review step shows the choice as text under "JOURNAL MASTHEAD"
("PRESS MASTHEAD", "SERVER MASTHEAD"); the "Edit" page's roles table
offers the same two and asks "Confirm masthead visibility change" first.
On OMP and OPS "Confirm" answered with the "Error" window "Email template
USER_ROLE_MASTHEAD_UPDATE not found. The migration script
I11800_AddUserRoleMastheadUpdateEmail needs to be run." (the request `POST
api/v1/users/{id}/masthead/{id}` answering 500), and the choice was saved
all the same and applied at the next load; [User
invitations](U06-user-invitations.md#omp1) registers that window.

<a id="fn-f"></a>
**f** — Form mechanics (ui-library `components/Form/Form.vue`,
`FormPage.vue`, `FormErrors.vue`): `validateRequired()` checks each shown
`isRequired` field, the primary locale only for a multilingual one, and
sets `validator.required` "This field is required."; the footer shows
`form.errorOne` "Please correct one error." / `form.errorMany` "Please
correct {$count} errors." with `form.errorGoTo` "Jump to next error", and
the submit button is disabled while errors remain on the last page; a
changed field drops its error. Success shows `form.saved` "Saved". A 400
from the API makes `error()` emit the notice `form.errors` "The form was
not saved because {$count} error(s) were encountered. Please correct these
errors and try again." and place the API's messages under the fields.
Server checks (`PKPContextService::validate()` with the schema's rules):
required on edit only for the props sent (`ValidatorFactory::required()`,
context.json `required`: `name`, `contactName`, `contactEmail`, plus
`urlPath`, locales); `contactEmail`, `supportEmail` rule `email_or_localhost`
→ `validator.email` "This is not a valid email address."; OJS
`publisherUrl` rule `url` → `validator.url` "This is not a valid URL.";
OJS `onlineIssn`, `printIssn` rule `issn` → `validator.issn` "This is not a
valid ISSN." (`ValidationServiceProvider`: pattern `^\d{4}-\d{3}[\dX]$` and
the ISSN check digit); `country` rule `country`. `acronym` and the
support contact are required by the forms only. The Vue form sends PUT as
a POST with `X-Http-Method-Override` (scenarios.md).
Live-probed 2026-09-23 (Fields intro; all three apps): note td4. The
notice after a refused press was on screen at once and gone ten seconds
later.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-23 (Fields; A3; all three apps): a scratch
journal's "Masthead" arrived with "Journal initials" and "Country" empty;
"Save" as it was sent nothing, answered "Please correct 2 errors." with
"Go to Journal initials: This field is required.", "Go to Country: This
field is required." and "Jump to next error", and kept "Save" grayed out
until both boxes were filled (after the initials alone, still "Please
correct one error."). On OJS "1234-5678" (wrong check digit), "10501234"
and "1050-124x" were refused with "This is not a valid ISSN.",
"example.org" with "This is not a valid URL.", the notice reading "The
form was not saved because 3 error(s) were encountered. …" and "Save"
grayed out; "0378-5955", "1050-124X" and "https://example.org" saved. On
"Contact", "not-an-email" was refused after the press with "This is not a
valid email address." under the box; a phone-only save on a journal with
no support contact flagged the support "Name" and "Email address" and
sent nothing, even with an invalid principal address. With French forms,
the French title and initials left empty saved; the English title emptied
was refused under the English box alone; the French boxes showed only
after pressing "French", under "1/2 languages completed", and were hidden
again on the next return to the tab.

<a id="fn-g"></a>
**g** — `PKPMastheadForm` groups and fields: `identity`
(`manager.setup.identity`) with `name` (`manager.setup.contextTitle`,
`isRequired`, multilingual) and `acronym` (`manager.setup.contextInitials`,
`isRequired`, multilingual, size small); `publishing`
(`manager.setup.publishing` "Publishing Details",
`manager.setup.publishingDescription`) with `country` (`FieldSelect`,
`isRequired`, `Locale::getCountries()` sorted by local name, description
`manager.setup.selectCountry`); `editorialMasthead`
(`common.editorialMasthead`) with `editorialHistory` (`FieldRichTextarea`,
toolbar `bold italic superscript subscript | link | blockquote bullist
numlist | image | code`, upload to `_uploadPublicFile`, description
`manager.setup.editorialMasthead.editorialHistory.description`); `about`
(`common.description` "Description") with `description`
(`manager.setup.contextSummary`, default toolbar `bold italic superscript
subscript | link`) and `about` (`manager.setup.contextAbout`, size large,
the editorialHistory toolbar and upload). App fields (note a): OJS
`manager.setup.journalAbbreviation` "Journal Abbreviation",
`manager.setup.publisher` "Publisher", `common.url` "URL",
`manager.setup.onlineIssn` "Online ISSN", `manager.setup.printIssn` "Print
ISSN"; OMP `manager.settings.publisher.identity` "Publisher Identity" with
its description, `manager.settings.publisher` "Press Publisher Name",
`manager.settings.location` "Geographical Location",
`manager.settings.publisherCodeType` "Publisher Code Type" (ONIX list 44
from `ONIXCodelistItemDAO`), `manager.settings.publisherCode` "Publisher
Code"; OPS `manager.setup.serverAbbreviation` "Server Abbreviation",
`manager.setup.sponsoringOrganization` "Sponsoring organization". Labels
per app: OJS "Journal Identity", "Journal title", "Journal initials",
"Journal Summary", "About the Journal"; OMP "Press Identity", "Press Name",
"Press Initials", "Press Summary", "About the Press"; OPS "Preprint Server
Identity", "Server title", "Server initials", "Server Summary", "About the
Server". The seeded journals carry title and initials (`JPK`, `PKP`,
`PKPS`) and no country, summary or about text; a scratch journal from
`POST scenarios/context` carries the title, initials only when given, the
contact "Site Admin" / `admin@mail.test`, and no country
(`ContextFactory::parseParams()`).
Live-probed 2026-09-23 (Masthead table; all three apps): the groups top
to bottom as the table lists them; "Country" offers 249 countries and is
empty on a scratch journal; the toolbars as listed; OMP's "Publisher Code
Type" list offers 41 types (the first "ARK (35)") and no empty choice, a
saved "ISNI (16)" stayed after a reload; OPS's "Sponsoring organization"
saved and shown again. A journal made with Hosted Journals "Create
Journal" has its initials (that form requires them) and no country unless
one was chosen there (that form offers it as optional).
Live-probed 2026-09-29 (Masthead tab in French at
`…/fr_CA/management/settings/context`; all three apps, two runs; English
the control): the raw keys A12 lists on OMP and OPS (note f-a12); OJS's
tab French throughout; no raw key on any app in English. OMP's and OPS's `locale/fr_CA/manager.po` carry
those keys (`manager.setup.identity`, `manager.setup.selectCountry`, …)
with an empty text, and an untranslated text is written as "##key##".
Each load of Settings › Website answered the Plugin Gallery's server
error of [Plugins management](U62-plugins-management.md#a1).

<a id="fn-aa"></a>
**aa** — Live-probed 2026-09-23 (Masthead table; Rule 10; OJS, OPS): with
the Citation Style Language plugin enabled (off on a scratch context), a
published article's "How to Cite" printed the saved "Journal
Abbreviation" in place of the journal's name in the ACS, AMA, IEEE and
Vancouver formats, and a preprint's printed the "Server Abbreviation" in
AMA; the article page's head carries it as `citation_journal_abbrev`.
"Country", "Publisher", "URL", the ISSNs, OMP's publisher identity and
OPS's sponsoring organization appeared in no visible text of any public
page driven (home, About, Contact, Editorial Masthead, Editorial History,
Privacy Statement, Submissions, the software page, search, the archive,
catalog or preprint list, the article, book or preprint page, the
Information pages); the OJS ISSNs sit in the article page's head as
`citation_issn` and `DC.Source.ISSN`.

<a id="fn-h"></a>
**h** — `PKPContactForm` groups: `principal` (`manager.setup.principalContact`
"Principal Contact", `manager.setup.principalContactDescription`) with
`contactName` (`common.name` "Name", `isRequired`), `contactEmail`
(`isRequired`, labelled "Email address" on screen), `contactPhone`
(`user.phone` "Phone"), `contactAffiliation` (`user.affiliation`
"Affiliation", multilingual), `mailingAddress` (`common.mailingAddress`
"Mailing Address", `FieldTextarea` size small); `technical`
(`manager.setup.technicalSupportContact` "Technical Support Contact",
`manager.setup.technicalSupportContactDescription`) with `supportName`
(`isRequired`), `supportEmail` (`isRequired`, "Email address"),
`supportPhone`. The Hosted Journals create form (`PKPContextForm`) asks
for the principal contact's name and email and has no support-contact
field. Live-probed 2026-09-02 (the registration spec's probes, all three
apps): the seeded journals' Contact tab has no "Technical Support
Contact" and their public "Contact" page shows "Principal Contact" alone;
a scratch journal saved its support contact with "Saved".
Live-probed 2026-09-23 (Contact table; A3; all three apps): the tab's two
groups and fields as the table lists them, both email boxes labelled
"Email address"; Administration › Hosted Journals › "Create Journal"
("Create Press", "Create Server") asked for "Principal Contact Name" and
"Principal Contact Email address" and had no support-contact field; the
journal it created, like every scratch journal, had an empty support
contact, and a phone-only save of its "Contact" tab was refused as A3
says.

<a id="fn-i"></a>
**i** — `PKPInformationForm`: group `descriptions`
(`manager.setup.information.descriptionTitle` "Descriptions",
`manager.setup.information.description`) with `readerInformation`,
`authorInformation`, `librarianInformation` (labels
`manager.setup.information.forReaders|forAuthors|forLibrarians`), each
multilingual with the editorialHistory toolbar. Defaults: context.json
`defaultLocaleKey` `default.contextSettings.forReaders|forAuthors|forLibrarians`
(each app's `locale/en/default.po`), written when a context is created.
OPS: `SettingsHandler::getInformationForm()` returns null, so
`ManagementHandler::website()` assigns `includeInformationForm` false and
`website.tpl` omits the tab; the defaults are still written (the schema is
lib/pkp's) and are read by no OPS page.
Live-probed 2026-09-23 (Information tab; OJS, OMP): one group
"Descriptions" with its description ("the press" on a press), three boxes
per form language with the "Editorial History" toolbar, all three saved
empty with "Saved"; a new journal and press carry the default texts in
each form language. The default texts' links are full addresses built
when the journal was created (the seeded journal's point to the
installer's `http://127.0.0.1:8000/…`, not the address serving the page);
the "Privacy Statement" link: note f-a9. OPS: note v.

<a id="fn-j"></a>
**j** — `PKPPrivacyForm`: one `privacyStatement` field
(`manager.setup.privacyStatement` "Privacy Statement",
`manager.setup.privacyStatement.description`), default
`default.contextSettings.privacyStatement`. Page: `AboutSiteHandler::privacy()`
reads the site's `privacyStatement` when config `general.sitewide_privacy_statement`
is on (`config.TEMPLATE.inc.php` default Off) or there is no context, the
context's otherwise, and throws `NotFoundHttpException` when empty;
`privacy.tpl` has heading `manager.setup.privacyStatement` and no edit
link. Header item: `PKPNavigationMenuService` shows `NMI_TYPE_PRIVACY` only
while the context's localized statement is non-empty. Site statement:
Administration › Site Settings › Site Setup › Information
(`PKPSiteInformationForm`). Live-probed 2026-09-02 (the registration spec's
probes, all three apps): the seeded and scratch journals carry the default
statement; a scratch journal whose statement was emptied on Settings ›
Website › Setup › "Privacy Statement" ("Saved") answered "404 Not Found" at
`about/privacy`; the page's heading reads "Privacy Statement".
Live-probed 2026-09-23 (Privacy Statement tab; all three apps): the box,
label and description as quoted, saved empty with "Saved", the defaults
per app as quoted; French forms: note f-ops3. The page: note td16.

<a id="fn-ac"></a>
**ac** — The site-wide switch is `general.sitewide_privacy_statement` in
the installation's `config.inc.php` (Off in `config.TEMPLATE.inc.php`); no
screen changes it, so its "On" end was not driven. Its default end was:
with a site statement set, an emptied journal statement still answered
"404 Not Found" (live-probed 2026-09-23, all three apps).

<a id="fn-k"></a>
**k** — Pages and tabs: app `templates/management/context.tpl` (tabs
`masthead` `manager.setup.masthead` "Masthead", `contact` `about.contact`
"Contact", `sections` `section.sections`/OMP `series.series`, `categories`
`grid.category.categories`), `lib/pkp/templates/management/website.tpl`
(`appearance` › `theme`, `appearance-setup`, `appearance-masthead`,
`advanced`; `setup` › `information` (guarded), `languages`,
`navigationMenus`, `announcements`, `highlights`, `lists`, `privacy`,
`dateTime`; `plugins` › `installedPlugins`, `pluginGallery`; `content` ›
`publicComments`), `workflow.tpl`, `distribution.tpl` (OPS app copy with
`access`; OJS `additionalDistributionTabs.tpl` with `access`, `archive`),
`access.tpl`. `<tabs :track-history="true">` writes the tab id into the
address's hash. Page component `SettingsPage.vue` (ui-library
`components/Container/`) extends `Page` and, on a form's success, adds or
removes the side menu's payments, institutions and announcements entries,
reloads for the comments form and refreshes the DOI forms: each of those is
its feature's rule. Headings: `manager.setup` (OJS "Journal Settings",
OMP "Setup", OPS "Server Settings"), `manager.website.title` "Website
Settings", `manager.workflow.title` "Workflow Settings",
`manager.distribution.title` "Distribution Settings", `navigation.access`
"Users & Roles". `ManagementHandler::settings()` maps `index`, `''` and
`context` to the journal page, `user` to `editUser()` (the invitation
wizard's `createHandle`), and anything unknown to `NotFoundHttpException`.
The 404 page's look: seed-facts ("A public address the app refuses …",
2026-09-17).
A side tab writes only its own id (`#privacy`), which matches no top tab
when the page loads (A7).
Live-probed 2026-09-23 (Rules 1–3; all three apps): the side menu's
"Settings" group with its five entries, the headings, and browser titles
"{heading} | {journal title}"; each page's tabs and side tabs as Rule 2
lists them, with the Workflow library tab reading "Publisher Library",
"Press Library" and "Preprint Server Library", a "Payments" tab on OJS and
OMP, and Users & Roles holding "Users", "Roles", "Site Access Options"
and "ORCID" only. The "Announcements" and "Comments" pages opened from
their entries for the manager and for an Editor and a Production editor
without "Permit changes to Settings". No side menu showed "Institutions"
(Administration › Site Settings › "Statistics" › "Enable institutional
statistics" unticked on each install); `management/settings/institutions`
opened for the manager and answered the access-denied page to the Editor
without the box. A user's "Edit" in the users list opened
`management/settings/user/{id}` with the invitation wizard's first step.
Live-probed 2026-09-28 (Rule 3, "Institutions"; all three apps, two runs;
the Site Administrator and a Journal Manager of a scratch journal, the
side menu read on the Dashboard): with the site's box ticked (set through
the site API; its "Statistics" tab read ticked), Distribution ›
"Statistics" offered the journal's box, unticked, beside "Public API",
and no side menu showed "Institutions", the seeded journal's included;
ticked and saved there ("Saved"), the entry showed on the same page, on
the next load and for the other account; with the site's box unticked again,
the journal's box was hidden and the entry gone; ticked again, both came
back, the journal's box still ticked; the journal's box unticked and
saved, the entry went at once. `management/settings/institutions` opened
the "Institutions" page for both accounts at every step. Each load of
Administration › Site Settings answered the Plugin Gallery's server error
recorded by [Plugins management](U62-plugins-management.md#a1).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-23 (Rule 1; A7; OJS in three runs, OMP and
OPS in one each): pressing "Contact" wrote `#contact` and a reload
reopened "Contact"; Website › "Setup" › "Privacy Statement" wrote
`#privacy` and a reload opened "Appearance" › "Theme"; every side tab
wrote its own id alone (`#information`, `#languages`, `#appearance-setup`,
`#reviewSetup`, `#doisSetup`); `#setup/privacy` and `#setup/information`
opened the side tab directly, and `workflow#review` opened "Review" (OJS,
OMP). Headings "Journal Settings", "Setup" (OMP), "Server Settings".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-23 (Rule 3; all three apps): as the Journal
Manager, `{journal}/management/settings/nothing` answered "404 Not Found".

<a id="fn-l"></a>
**l** — `ManagementHandler::context()` calls
`VersionCheck::checkIfNewVersionExists()` when config
`general.show_upgrade_warning` is on (`config.TEMPLATE.inc.php` default
On); the check fetches the version descriptor over the internet, logs and
returns false on a transfer error, which is every call on the test
installs (dead proxy, seed-facts "Outbound HTTP is dead"). The notice is
`site.upgradeAvailable.manager` with the first Site Administrator's name
and email: a `<notification>` in OJS and OPS, a legacy in-place
notification titled "Warning" in OMP's `context.tpl`. The notice cannot be
seen on a test install, so its wording and the switch are read from the
code. Live-probed 2026-09-23 (all three apps): Settings › Journal showed
no notice.

<a id="fn-ab"></a>
**ab** — The not-accepting notice (`manager.setup.disableSubmissions.notAccepting`)
sits in `context.tpl`, `website.tpl`, `workflow.tpl` and
`distribution.tpl` behind `disableSubmissions`, printed when the page
loads; `access.tpl` has none. Live-probed 2026-09-23 (Rule 4a; A8; OJS in
two runs, OMP and OPS in one each): with "Disable Submissions" ticked and
saved on Workflow › "Submission", the notice showed above the tabs of
Journal, Website, Workflow and Distribution Settings and not on "Users &
Roles"; after unticking and saving ("Saved") it stayed on the open page
and was gone at the next load.

<a id="fn-m"></a>
**m** — Each tab is its own `pkp-form` component with its own fields;
`Form.vue::submit()` posts that form's `submitValues` only, and
`PKPContextService::edit()` writes only the props received. Tab switches
keep the Vue state of the page; no `beforeunload` handler guards the
Settings pages (`FormPage.vue` warns only on its own cancel button, which
these forms do not have). The announcements settings tab behaved this way
when driven (its spec, 2026-09-17).
Live-probed 2026-09-23 (all three apps): note td7.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-23 (Rule 5; all three apps): a title typed
on "Masthead" stayed in its box after "Contact" and back; "Save" on
"Contact" ("Saved") left it unsaved (a reload showed the stored title);
typed again and the page left through the side menu's "Website", no
browser or page dialog showed and the stored title was back. Text typed
in "Privacy Statement" behaved the same across side and top tabs and was
lost without a warning when another address was opened.
Live-probed 2026-09-28 (Rule 5; all three apps, two runs; the seeded
journal's Journal Manager, nothing saved): a title and a "Journal
Summary" typed on "Masthead" stayed after "Contact" and back; a reload,
and a trip out through the side menu's "Website" and back, each brought
the stored values back with no browser or page dialog. Text typed in
"Privacy Statement" stayed across the side tab "Information" (OPS
"Languages") and the top tab "Appearance" and back, "Setup" reopening on
"Privacy Statement", and was lost through the side menu's "Journal", with
no dialog either. Each load of Settings › Website answered the Plugin
Gallery's server error recorded by
[Plugins management](U62-plugins-management.md#a1).

<a id="fn-n"></a>
**n** — Where identity shows. `frontend/components/headerHead.tpl` appends
` | {context name}` to the browser title on every page but `index`;
`frontend/components/header.tpl` prints the name as the header text when
no header logo is set; each app's `templates/frontend/pages/indexSite.tpl`
lists the site's journals with their summary; OJS `indexJournal.tpl` and
OMP `index.tpl` print the summary when the theme option
`showDescriptionInJournalIndex` / `showDescriptionInPressIndex` is on.
Initials: `controllers/grid/tasks/task.tpl` (the Tasks list's cells,
`NotificationsGridCellProvider`), shown for an account with roles in more
than one context, and the email variable `contextAcronym`
(`ContextEmailVariable`); the email templates that print the initials or
the contact (`contextAcronym`, `contactName`, `contactEmail`) were not
driven. Metadata consumers (Rule 10): OJS `abbreviation` in the Google
Scholar and citation-style plugins, the ISSNs in the Crossref, DataCite,
DOAJ, PubMed, OAI MARC, JATS and LOCKSS/CLOCKSS outputs,
`publisherInstitution` in those gateways; `country` in the JATS and
article-report outputs; OMP `publisher`, `location`, `codeType`,
`codeValue` in the ONIX 3.0 export (`plugins/importexport/onix30`). OPS
`sponsoringOrganization` is read only by its own form (OPS2).
Live-probed 2026-09-23 (Rules 8, 10; all three apps): the summary showed
under the name in the site's list, and on the home page only once
Appearance › Theme "Show the journal summary on the homepage." ("press",
"server"; unticked by default) was ticked. Where the abbreviation and the
publishing details show: note aa.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-23 (Rule 7; all three apps): after a rename
to "Renamed Probe Journal", "RPJ", the header of every public page driven
and the site's list showed the new title; browser titles "About the
Journal | Renamed Probe Journal", "Contact | …", "{article title} | …",
the home page the title alone; with a header logo uploaded the header
showed the image and kept the name as a hidden heading, the titles
unchanged. In the Tasks panel of a manager of two journals the renamed
journal's tasks showed "RPJ" at the next opening (its old initials
before); a manager of this journal alone saw no initials.

<a id="fn-o"></a>
**o** — `getLocalizedData()` returns the value in the request's locale and
falls back to the context's primary locale (`DataObject` / `Context`);
every About template prints the localized value. Per-language boxes follow
the context's `supportedFormLocales` (`getSupportedFormLocales()` in
`ManagementHandler`); the seeded journals use one form language
(seed-facts, 2026-09-03), a scratch journal takes
`context.supportedFormLocales`.
Live-probed 2026-09-23 (all three apps): note td9.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-23 (Rule 11; Settings bullet 12; all three
apps): on a scratch journal with English and French forms, "About the
Journal" filled in English only showed the English text on the French
page (headed "À propos de cette revue", "A propos de la presse", "À propos
du serveur"); with "Texte français" saved the French page showed it and
the English page kept the English; the French pages' header showed the
English title while the French title was empty. Ticking French under
"Forms" on Website › "Setup" › "Languages" put the French boxes, behind
the "French" button, on both tabs at the next load.

<a id="fn-p"></a>
**p** — Each app's `registry/navigationMenus.xml` gives the primary menu an
"About" item (`navigation.about`) with children `about.aboutContext`,
`about.submissions`, `common.editorialMasthead`,
`manager.setup.privacyStatement`, `about.contact`
(`NMI_TYPE_ABOUT`, `SUBMISSIONS`, `MASTHEAD`, `PRIVACY`, `CONTACT`);
`PKPNavigationMenuService` hides `CONTACT` without a mailing address or
contact name and `PRIVACY` without a statement. The footer logo links
`about/aboutThisPublishingSystem` (footer template, navigation feature's).
Each page includes `frontend/components/breadcrumbs.tpl` with its title
key. The editorial team page lives at `about/editorialMasthead`;
`about/editorialTeam` answers "404 Not Found" (live-probed 2026-09-03 by
the profile spec's probes, all three apps).
Live-probed 2026-09-23 (Rule 12; all three apps): a fresh journal's
"About" menu held the five items; "Privacy Statement" left it with the
statement; the footer logo opened the software page from the journal and
from the site's home; every About page carried the breadcrumb "Home /
{page name}" and its name as heading, "Editorial History" headed
"Editorial History Page".

<a id="fn-q"></a>
**q** — `about.tpl`: heading `about.aboutContext` ("About the Journal" /
"About the Press" / "About the Server"), edit link to `#masthead`, then the
context's localized `about` printed as stored. The seeded journals have
no `about` (the bootstrap fixture sets none).
Live-probed 2026-09-23 (all three apps): note td10.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-23 (Rule 13; all three apps): signed out
on the seeded journal, the breadcrumb "Home / About the Journal" ("…the
Press", "…the Server"), the heading and nothing after it; on a scratch
journal "Our journal publishes probe articles." saved on the Masthead tab
showed as the page's body.

<a id="fn-r"></a>
**r** — `editorialMasthead.tpl`: heading `common.editorialMasthead`; per
role with members an `h2` of the group's name and a list whose items hold
`common.fromUntil` with `from` the start year and `until` empty ("{year}
–"), the full name (`getFullName()`, the preferred public name first), an
ORCID link (`target="_blank"`, `aria-label`
`common.editorialHistory.page.orcidLink` "View {$name} ORCID profile") when
`orcid` is set and `hasVerifiedOrcid()`, and the localized `affiliation`;
then `about.editorialMasthead.linkToEditorialHistory` "View <a>Editorial
History</a>", an `<hr>` and the reviewers (note s). No edit link. Caching:
`getMastheadUserIdsByRoleIds()` stores the id lists in the cache for
`MAX_EDITORIAL_MASTHEAD_CACHE_LIFETIME` ("1 year") per context and status;
`forgetEditorialCache()` runs on `assignUserToGroup()`,
`endAssignments()`, `deleteAssignmentsByUserId()`, the masthead-choice
updates and user-group edits. Since pkp/pkp-lib#13387 (`e0c43a1227`) the
lists and the page's user lookup take disabled accounts too
(`filterByStatus(STATUS_ALL)`, `Repo::user()->get($userId, true)`),
"Remove User" (`UserGridHandler`) ends the roles through
`endAssignments()` and "Merge user" (`Repo::user()->mergeUsers()`)
deletes the merged account's through `deleteAssignmentsByUserId()`, both
clearing the cache; the page re-checks each cached member's dates at
every load (`UserUserGroup::withActive()` in `editorialMasthead()`).
Before it, a disabled member in a cached list made the page fail (A4)
and "Remove User" reached the history only at the next of those events
(A5). The tab: `PKPAppearanceMastheadForm`, note ad; its order field
`mastheadUserGroupIds` (`common.editorialMasthead`, "Define the order of
masthead roles for public display.", orderable, sorting only).
Live-probed 2026-09-23 (Rules 14a, 14d; Settings bullet 4b; all three
apps): the heading, the breadcrumb "Home / Editorial Masthead", the title
"Editorial Masthead | {journal}", one heading per role; the default roles
listed as Rule 14a says; a role whose only member does not appear, and a
journal with no editor, showed no heading for it; five members of the
ticked "Reviewer" role gave no heading. Moving the second role up on
Appearance › "Editorial Masthead" and saving reversed the headings on
both pages. "View Editorial History" with "Editorial History" alone a
link, a rule, then the reviewers; no "Edit" for anyone.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-23 (Rules 14b–14c; all three apps): the
Section editors "Zulu", "Alpha" and "Mike" listed Alpha, Mike, Zulu in
family-name order among the other members, each "2026 –"; "M. Preferred"
saved as Mike's "Preferred Public Name" showed in Mike's place; a member
with two listed roles appeared under both; a member set to "Does not
appear on the masthead" was absent; a verified ORCID iD gave the icon
(a link to the stored iD's address, `https://orcid.org/{iD}`, opening a
new tab at that address, "View {name} ORCID profile") with
the journal's ORCID setting off, an unverified one none; the affiliation
under the name; a homepage and a profile picture saved on the profile
showed nowhere, and the page held no image and no email link. The seeded
journals list "Journal editor" and "Section editor" (OJS), "Press editor"
and "Series editor" (OMP), "Moderator" and "Editorial Board Member" (OPS).

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-23 (Rule 14e; all three apps, two
drives): a reader invited to a Section editor role starting today and
accepting, "Remove Role", a masthead choice changed on the "Edit" page and
a role's box saved each showed on the next load of both pages; a member
invited with a Start Date 30 days ahead was not listed after accepting
(the "Edit" page showed the later date and "---" for the end). The
invitation offers no end date, and "Remove Role" and "Remove User" end a
role on the day. Live-probed 2026-09-29 (Rule 14e; A4, A5 retired; all
three apps, the kept-script rerun and two runs of its extension, each
read signed out with no other change between the two reads): the same
four changes showed at the next load; "Remove User" took the member off
the masthead and onto "Editorial History" at the next load ("2026 –
2026", a second member likewise); a Section editor and a past member
disabled with "Disable User" stayed listed on both pages, which answered
normally signed out, on reload and to the manager, and stayed listed after
"Enable User"; a member invited to start on the same day a month later
was absent after accepting and listed ("2026 –") once the role's start
was moved to the day before in the database, the calendar's stand-in, on
the next load and on reload; "Merge user" of a listed Section editor ("Mo
Mergedaway", Moderator on a server) into an Author account ("Aya
Author") listed Aya Author under "Section editor" ("Series editor",
"Moderator") beside her "Author" entry at the next load and Mo Mergedaway
nowhere. On OMP and OPS the masthead-choice step answered the "Error"
window of note e.

<a id="fn-ad"></a>
**ad** — The masthead settings (pkp/pkp-lib#13370, `fab29cfeca`,
2026-09-28). `lib/pkp/schemas/context.json`: `enableEnrollmentMasthead`
(boolean, default true) and `enableEnrollmentMastheadReviewers` (boolean,
no default), written on a new context and by no upgrade step of the three
apps. `PKPAppearanceMastheadForm`: `enableEnrollmentMasthead`
(`manager.setup.enableEnrollmentMasthead` "Enrollment-based Masthead",
its `.description` in each app's `locale/en/manager.po`, the box
`.enable`), then `mastheadUserGroupIds` and, only where the app has review
stages (not OPS), `enableEnrollmentMastheadReviewers` (`user.role.reviewers`
"Reviewers", `manager.setup.editorialMasthead.order.reviewers.description`,
the box `manager.setup.enableEnrollmentMastheadReviewers.enable`), both
`showWhen` the first. `AboutContextHandler::editorialMasthead()` with the
first off displays `frontend/pages/editorialMastheadDisabled.tpl`: the
heading, `editLink.tpl` to `management/settings/context#masthead`
(`sectionTitleKey` `common.editorialMasthead`) and the context's
`editorialHistory`; with it on, the reviewers are read only when the
second is on (note s). `editorialHistory()` with the first off redirects
to `editorialMasthead`. The issue states the intent: the enrollment box
"unchecked on upgrade, preserving the behavior of … 3.4 and prior" and
"checked by default for new journals"; the reviewers box "disabled by
default on upgrade and on creating a new journal or press".
Live-probed 2026-09-29 (Rules 14, 14f, 15, 16, 21; Settings bullet 4; all
three apps, two runs each): a new scratch context stored the first box on
and no reviewers setting, and its tab read the three groups (two on OPS)
with the texts quoted in Settings bullet 4, the first box ticked, the
reviewers box unticked. Unticking the first box hid the order list and
"Reviewers" before any save, and after "Save" and a reload the tab held
the first group alone. Then "Editorial Masthead" showed, as the manager,
the heading, the "Edit" link (read to a screen reader "Edit Edit Editorial
Masthead", on a press "Edit Open a new page to edit this information")
opening Settings › Journal › "Masthead", and "Founded in 2001."; as a
member and signed out the heading and "Founded in 2001."; on a journal
with an empty "Editorial History" the heading alone (the "Edit" link for
the manager); no list, no line, no rule. The "Editorial History" address
answered with a redirect to "Editorial Masthead" for the manager, a
member and a signed-out visitor. Ticked and saved again, both pages
listed as before in the order saved earlier. A context with the two
settings deleted in the database, as a context created before the change
has them, read the same as the box unticked on both pages and on the tab;
ticking and saving the box brought both lists back. Each load of
Settings › Website answered the Plugin Gallery's server error of
[Plugins management](U62-plugins-management.md#a1).

<a id="fn-s"></a>
**s** — `AboutContextHandler::editorialMasthead()`, only while the
context's `enableEnrollmentMastheadReviewers` is on (note ad), asks
`Repo::reviewAssignment()->getExternalReviewerIdsByCompletedYear($contextId,
date('Y') - 1)`: review assignments of the context's submissions with
`stage_id` = external review (OJS's review stage; OMP's external review)
and `date_completed` in that year (`DAO::getExternalReviewerIdsByCompletedYear()`),
with no condition on a cancelled assignment, then the users collector
(every account, disabled ones included, `filterByStatus(STATUS_ALL)`)
ordered by family name. Template:
`common.editorialMasthead.peerReviewers` "Peer Reviewers in Previous
Year", `common.editorialMasthead.peerReviewers.description` "The editors
express their appreciation of the reviewers for {$year} listed below.",
each entry name, ORCID link when `orcid` and `orcidAccessToken`,
affiliation; the block only `{if $reviewers->count()}`. No check of the
reviewer's role or masthead choice. The harness dates a completed review
with `reviewRounds[].reviewers[].dateCompleted` (scenarios.md).
Live-probed 2026-09-23 (OJS, OMP; OPS the control): note td13.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-23 (Rule 15; A10; OJS and OMP, OPS the
control): on a scratch journal and press with reviews completed in 2025,
the block read "Peer Reviewers in Previous Year", "The editors express
their appreciation of the reviewers for 2025 listed below.", then the
reviewers by family name with affiliation and the verified ORCID icon, no
year; a review completed this year, a request declined this year and, on
the press, an internal review completed in 2025 were not listed. A listed
reviewer whose submitted review then got "Cancel Reviewer" (row "Request
Cancelled") stayed listed. The seeded journal and press, and a fresh
scratch journal, showed neither heading nor sentence; the preprint
servers' pages ended after the rule. Live-probed 2026-09-29 (Rule 15;
Settings bullet 4c; OJS and OMP, OPS the control; two runs): on a new
scratch journal and press with three reviews completed in 2025, the
masthead showed no block while "Enable listing of reviewers on the
masthead" was unticked, as it arrived; ticked and saved, the block read
as above ("Bea Brown", "Cal Cancelled", "Yuri Young"), the press's
internal review absent; unticked and saved again, the block was gone.
"Consider role in masthead list" unticked on the Reviewer role left the
block as it was; a listed reviewer disabled with "Disable User" stayed
listed. The server's tab had no "Reviewers" group and its masthead ended
after the rule.

<a id="fn-t"></a>
**t** — `editorialHistory.tpl`: page title `common.editorialHistory`
"Editorial History" (browser title and breadcrumb), heading
`common.editorialHistory.page` "Editorial History Page",
`common.editorialHistory.page.description` "This section lists past
contributors."; per role, members from `getMastheadUserIdsByRoleIds(…,
STATUS_ENDED)` with each ended assignment
(`UserUserGroup::withEnded()->withMasthead()`, newest start first) as
`common.fromUntil` start year – end year, joined by
`common.commaListSeparator`; then the edit link to `#masthead` and the
context's localized `editorialHistory`. `endAssignments()` (the invitation
wizard's "Remove Role") sets `date_end` to now, which `withEnded()`
counts at once.
Live-probed 2026-09-23 (all three apps): note td14.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-23 (Rule 16; A6; all three apps): heading
"Editorial History Page", "This section lists past contributors.",
breadcrumb "Home / Editorial History", title "Editorial History |
{journal}"; "2019 – 2024 Pia Pastone K4 Past University"; two periods
"2020 – 2022, 2015 – 2016"; a past member set to "Does not appear"
absent; after "Remove Role" on a Section editor, the line "2026 – 2026
{name} {affiliation}"; an ended member with a verified iD with the ORCID
icon; "Founded in 2001." saved on the Masthead tab at the foot for
everyone, the "Edit" link above it for the manager; a fresh journal's page
held the heading and the sentence alone.

<a id="fn-u"></a>
**u** — `contact.tpl` / `AboutContextHandler::contact()`: heading
`about.contact` "Contact", edit link to `#contact`, `mailingAddress`
through `nl2br` and `strip_unsafe_html`, the primary block
(`about.contact.principalContact` "Principal Contact") when any of
`contactTitle`, `contactName`, `contactAffiliation`, `contactPhone`,
`contactEmail` is set, with `about.contact.phone` "Phone" before the
number and the email through Smarty `{mailto encode='javascript'}`; the
support block (`about.contact.supportContact` "Support Contact") when any
of `supportName`, `supportPhone`, `supportEmail` is set. `contactTitle` is
read but no form writes it (UNASSIGNED note).
Live-probed 2026-09-23 (all three apps): note td15.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-23 (Rule 17; all three apps): heading
"Contact", "Edit" for managers, "1 Probe Street" and "Probe City" on two
lines, "Principal Contact" with the name, "Probe University", "Phone +1
555 0100" and the email as a mail link, "Support Contact" with "Sam
Support", "Phone +1 555 0199" and its mail link; with no support phone
that block had no "Phone" line. The seeded journal's page showed
"Principal Contact" with the name and email alone.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-23 (Rule 18; all three apps): the journal
page headed "Privacy Statement" with the statement and no "Edit" at any
level; emptied on the tab ("Saved"), `{journal}/about/privacy` answered
"404 Not Found" and the header's item was gone. `index/about/privacy`
answered "404 Not Found" on the fresh site and, once the Site
Administrator saved a statement on Administration › Site Settings › "Site
Setup" › "Information", showed it under "Privacy Statement".

<a id="fn-v"></a>
**v** — Information pages (OJS and OMP `pages/information/InformationHandler.php`):
`readers`, `authors`, `librarians` print the context's
`readerInformation` / `authorInformation` / `librarianInformation` under
`navigation.infoForReaders.long` "Information For Readers" (and the
authors, librarians keys) through `lib/pkp/templates/frontend/pages/information.tpl`,
with the edit link to `website#setup/information`; any other argument
answers "404 Not Found", and `information` with no argument redirects to
the journal's home (live-probed 2026-09-23, OJS and OMP). Both handlers
also answer `competingInterestGuidelines` (OMP `competingInterestPolicy`),
reading a setting no schema defines, and `sampleCopyrightWording`, and
OMP honours a `contentOnly` parameter; nothing links to these (UNASSIGNED
note). Block: `plugins/blocks/information` (OJS and OMP;
`InformationBlockPlugin`, display name "Information Block", description
"This plugin provides sidebar information link.", `settings.xml` enabled
with seq 7, installed per context); `block.tpl` renders only when one of
the three texts is non-empty, heading `plugins.block.information.link`
"Information", one link per non-empty text (`navigation.infoForReaders`
"For Readers", `infoForAuthors` "For Authors", `infoForLibrarians` "For
Librarians"). A fresh journal places no block in its sidebar (scenarios.md
`sidebar`); the block's sidebar name is `informationblockplugin`. OPS has
no `pages/information` and no information block plugin, so the router
finds no handler (seed-facts, 2026-09-17: a scratch server's "Sidebar"
list offers no Information block).
Live-probed 2026-09-23 (Settings bullets 5–6; OJS, OMP; OPS the control):
"Information Block" enabled by default; disabled ("Are you sure you want
to disable this plugin?", then "The plugin "Information Block" has been
disabled."), the block left every page and the "Sidebar" list, and
`information/readers` still opened with its text. A fresh context's
"Sidebar" has no block ticked and offers "Information Block"; placed and
saved, the block showed on the home and About pages. OPS's "Sidebar"
offers "Web Feed Plugin" and "Language Toggle Block" only, and its Plugins
list has no Information Block.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-23 (Rule 19; OJS, OMP; OPS the control):
with the block placed, every public page driven showed "Information" with
"For Readers", "For Authors" and "For Librarians", each opening its page
with its text; "For Librarians" emptied left two links and
`information/librarians` opened with the heading alone; all three emptied
removed the block, and `information/readers` still opened with the
heading alone. On a preprint server Settings › Website › "Setup" had no
"Information", and `information`, `information/readers`, `/authors` and
`/librarians` answered "404 Not Found".

<a id="fn-w"></a>
**w** — `AboutSiteHandler::aboutThisPublishingSystem()` assigns the
version (`VersionDAO::getCurrentVersion()->getVersionString(false)`) and
the current context's `about/contact` address; each app's template prints
`about.aboutSoftware` and, with a context, `about.aboutOJSJournal` /
`about.aboutOMPPress` / `about.aboutOPSServer`, without one
`about.aboutOJSSite` / `about.aboutOMPSite` / `about.aboutOPSSite`. OMP's
`about.aboutOMPSite` reads "This press uses Open Monograph Press
{$ompVersion}, … Please contact the site directly with questions about its
presses and submissions to its presses." (OMP2); OJS's and OPS's site
strings open "This site uses …".
Live-probed 2026-09-23 (all three apps): note td18.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-23 (Rule 20; OMP2; all three apps): on
OJS the heading "About Open Journal Systems" and the paragraph as quoted
with version 3.6.0.0, "learn more about the software" leading to
`https://pkp.sfu.ca/` and "contact the journal" to the journal's
"Contact" page; OMP "This press uses … press management and publishing
software …", "contact the press"; OPS "This server uses Open Preprint
Systems 3.6.0.0, which is open source preprint server management software
…", ending "…questions about the server and submission of preprints.",
"contact the server". From the site's own home: OJS and OPS "This site
uses …", OMP "This press uses …", each ending as Rule 20 quotes, with no
contact link.

<a id="fn-x"></a>
**x** — Senders: the journal's own mailables set their sender from the
context's `contactEmail`, with the context's name as the sender's name;
the password reset is sent as a site email. Email variables
`contactName`, `contactEmail`, `mailingAddress`, `contextName`,
`contextAcronym` (`ContextEmailVariable`). Support contact:
`ValidateRegisteredEmail` sends from `supportEmail` / `supportName`.
Consent boxes: `RegistrationForm`, `StartSubmission`, the reviewer's step
1, each reading the context's `privacyStatement` (the registration,
submission-wizard and reviewer's-review specs). The context edit writes
no event-log or audit entry (`PKPContextService::edit()` fires
`Context::edit` only).
Live-probed 2026-09-23 (Rule 9; Side effects; all three apps, the
published email on OJS): the password reset came from "Open Journal
Systems <admin@mail.test>" ("Open Monograph Press", "Open Preprint
Systems") before and after the principal contact changed to "Pat
Principal"; the "Publication Published" email to the authors, sent when
an issue was published, came from the journal's own address before the
change and from "{journal title} <{new principal address}>" after it; the
"Validate Your Account" email of a registration came from the support
contact just saved ("Sam Support"). Saving the Masthead and Contact tabs
sent no email to the managers, the Editor, the principal or support
address, and left the Tasks count as it was. With the privacy statement
emptied, the consent box ("Yes, I agree to have my data collected and
stored according to the privacy statement.") left the Register page, the
wizard's start page and (OJS, OMP) the reviewer's first step. ORCID
requests were not reached (ORCID is off on the test installs).

<a id="fn-y"></a>
**y** — Where each scenario runs: scenarios 1, 2 and 12 on the seeded
journal, press or server `publicknowledge` with roster accounts
(`docs/process/users.md`; passwords by `getPassword()`, `admin` `admin`):
Journal Manager `manager.maya`, Section Editor `sectioneditor.ana`,
Assistant `assistant.rita` (Funding coordinator on OJS and OMP, Editorial
Board Member on OPS), Author `author.alex`, Reviewer `reviewer.julia` (OJS,
OMP), Reader `reader.rosa`; they change nothing there (scenarios.md "The
base context has plain defaults"). The seeded team the masthead lists is
the roster's `editor.diana` and three `sectioneditor.*` (OJS, OMP), the
three `sectioneditor.*` and `assistant.rita` (OPS), every seeded role
with "Appear on the masthead" (note e); the seed holds no submission, so no
review. Scenarios 3–11 on a scratch context from `POST scenarios/context`
with throwaway `users[]` (password the username twice, address
`<username>@mail.test`, each mailbox read in the mail catcher by that
address); a scratch context arrives with its title "Scratch context {tag}",
the principal contact "Site Admin" <admin@mail.test>, no technical support
contact, no Country, initials only when `context.acronym` is given, no
header logo, no block in its sidebar, and the default privacy and
Information texts (seed-facts). The site's contact address, the password
reset's sender on every test install, is `admin@mail.test` (seed-facts;
note x). Recipes: 3, 5, 10 — a `manager`, no
`acronym`. 4 — a `manager` and an `author`; on OJS a submission by the
author from `POST scenarios/submission` taken to Production
(`decisions: ['sendExternalReview', 'accept', 'sendToProduction']`) and an
issue made, not published, on the Issues screen before the scenario (no
`issues[]` key); the publish by "Assign To Future Issue and Publish
Immediately" (U49 Rule 5; U49's side effect: "Publication Published" goes
out when a version goes live); the password reset requested for the
author's address. 6 — a `manager` and `sidebar: ['informationblockplugin']`.
7 — `sectionEditor` users with the family names of the scenario, Mike with
`affiliation` and `orcid` (the full address the scenario gives) plus
`orcidIsVerified: true`; the fourth with
`roles: ['sectionEditor', 'editorialBoardMember']` and `masthead:
{sectionEditor: false}`; the past members with `roles: ['reader']` and
`pastRoles` (`{role: 'sectionEditor', dateStart: '2019-01-01', dateEnd:
'2024-12-31'}` with `affiliation`; two entries for 2015–2016 and 2020–2022).
8 — a `manager`, three `sectionEditor`s (Able also `reader`), a `reader`
and an `author`; the invitation, "Remove Role", the masthead choice and the
role boxes are driven on screen (the invitation's email read in the mail
catcher). 9 (OJS, OMP) — the context with
`enableEnrollmentMastheadReviewers: true` (a new context has the box
unticked, note ad), three `externalReviewer`s, Zeta with
`affiliation` and a verified `orcid`, and an `author`; a submission per
reviewer with `decisions: ['sendExternalReview']` and
`reviewRounds[].reviewers[]` at `status: 'completed'`, Zeta's and Beta's
with a `dateCompleted` in the previous calendar year, Gamma's today; on
OMP an `internalReviewer` Delta completing a round of `stage: internal`
(`sendInternalReview`) with a `dateCompleted` last year. 11 (OJS, OMP) — an
`editor`, a `productionEditor` and `roles: {editor: {permitSettings:
false}}`. 12 — the seeded server, signed in as `manager.maya`.

<a id="fn-z"></a>
**z** — Live-probed 2026-09-03 and 2026-09-04 (the profile spec's probes
and claim check, all three apps; Rule 14c): the masthead at
`about/editorialMasthead` showed role, start year and name for the roster
(which carries no affiliation), and for a probe account "Masthead
University K2" under the section editor's name and a verified ORCID icon;
no picture and no homepage were shown.
Live-probed 2026-09-23 again (Rule 14c; all three apps): note td11.

<a id="fn-f-a1"></a>
**f-a1** — pkp/pkp-lib#7392 "Administrators get all access" (OJS
f81d9b90b5, 2022-05-05) changed OJS's `SettingsHandler` role assignment to
`[ROLE_ID_SITE_ADMIN] → ['access', 'settings']`; the OMP (e2f79d662,
2022-05-09) and OPS (a9e40b91ae, 2022-05-09) commits of the same issue left
theirs at `['access']`, which is still the case at the tips (note b). The
side menu's `settings` group is built from `permitSettings`, which the
administrator's group has, so the offer stays. Live-probed 2026-09-23
(all three apps): note td1.

<a id="fn-f-a2"></a>
**f-a2** — `editLink.tpl` tests `ROLE_ID_MANAGER` in `$userRoles` and not
`permitSettings` (note d); the settings pages add `CanAccessSettingsPolicy`
(note b). Live-probed 2026-09-23 (OJS, OMP): note td3.

<a id="fn-f-a3"></a>
**f-a3** — `PKPContactForm` marks `supportName` and `supportEmail`
`isRequired`, the schema does not; `PKPContextForm` (journal creation)
has no support fields; the seeders set none (note h). The registration
spec's A6 records what an empty support contact does to registration
with validation on. Live-probed 2026-09-23 (all three apps, on a scratch
journal and on one made with Hosted Journals "Create Journal"): notes h
and td4.

<a id="fn-f-a4"></a>
**f-a4** — Live-probed 2026-09-23 (all three apps, three drives on two
seeds): a Section editor listed on the masthead disabled with the users
list's "Disable User": `about/editorialMasthead` answered 500 with a
blank page to a signed-out visitor, on reload and to the manager; a past
member listed on "Editorial History" disabled: `about/editorialHistory`
answered 500 the same way. "Enable User" and "Remove User" left both
failing; "Remove Role" on another member, a masthead choice changed or a
role's box saved brought both back with the disabled member gone, and
the member enabled again stayed off until the next such change. Server
log: "Uncaught Error: Call to a member function getId() on null in
…/lib/pkp/pages/about/AboutContextHandler.php:88". Mechanism: note r.
Retired 2026-09-29: fixed by pkp/pkp-lib#13387 (`e0c43a1227`,
2026-09-24; note r); three drives per app on the tips named at the head
of these notes showed both pages answering normally with the disabled
members listed (note td12).

<a id="fn-f-a5"></a>
**f-a5** — Live-probed 2026-09-23 (all three apps): note td12. The
confirmation of "Remove User" reads "Remove this user from this journal?
This action will unenroll the user from all roles within this journal."
("press", "server"). Note r: the cached lists are built with the dates as
they are at build time, `forgetEditorialCache()` runs only on assignment
and masthead-choice events, and the lifetime is one year. Retired
2026-09-29: "Remove User" now clears the lists (pkp/pkp-lib#13387,
`e0c43a1227`, 2026-09-24; note r), and a later start date, once reached,
lists the member at the next load (note td12). The confirmation of "Remove
User" read the same that day on the three apps.

<a id="fn-f-a6"></a>
**f-a6** — `editorialHistory.tpl` heading key `common.editorialHistory.page`
"Editorial History Page" against `common.editorialHistory` "Editorial
History" for the page title, the breadcrumb and the masthead's link.
Live-probed 2026-09-23 (all three apps): note td14.

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-23: note td5. `<tabs :track-history="true">`
stores the chosen tab's own id in the address; a side tab's id matches no
top tab when the page loads, so the page opens its first tab;
`#setup/privacy` names both and is then rewritten to `#privacy`.

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-23 (OJS in two runs, OMP and OPS in one
each): note ab. The notice is printed with the page, and a form's save
updates nothing outside the form.

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-23 (OJS, OMP): on the seeded journal and
press, "Information For Readers"'s "Privacy Statement" link points to
`{journal}/about/submissions#privacyStatement`, which opens the
"Submissions" page. The default text is `default.contextSettings.forReaders`
in each app's `locale/en/default.po`, its links built from
`{$indexUrl}/{$contextPath}` when the journal is created.

<a id="fn-f-a10"></a>
**f-a10** — Live-probed 2026-09-23 (OJS, OMP, two runs each): a reviewer
whose review was submitted with a 2025 completion date, then cancelled
with "Cancel Reviewer" from the row's menu (row "Request Cancelled"),
still listed between the other two reviewers. Note s: the list is chosen
by completion date, with no condition on cancellation. Held 2026-09-29
(OJS, OMP, two runs) on a journal and a press with "Enable listing of
reviewers on the masthead" ticked (note td13).

<a id="fn-f-a11"></a>
**f-a11** — Live-probed 2026-09-23 (all three apps, two runs): on a
scratch journal created with no country, Administration › Hosted
Journals › "Edit" with "Enable this journal to appear publicly on the
site" unticked and "Save": "Please correct one error.", the two messages
under "Country", the request answering 400; with a country picked the
save went through. "Create Journal" lists "Country" without "Required".
The form sends the empty "Country", which the server's `country` rule
refuses (note f).
Issue report: [pkp-e2e#496](https://github.com/jardakotesovec/pkp-e2e/issues/496) ([docs/issues/U59-A1-journal-form-country-unmarked-refused.md](../issues/U59-A1-journal-form-country-unmarked-refused.md)).

<a id="fn-f-a12"></a>
**f-a12** — Note g. Live-probed 2026-09-29 (all three apps, two runs): on
a scratch press and server with French screens and forms and on
`publicknowledge` with French screens, the keys listed above showed on the
"Bloc générique" tab for the scratch manager, a second account with the
Editor role (on OPS a second manager), `manager.maya` and `admin`; the
"Publisher Code Type" list's four entries only inside the list. The contact tab
("Coordonnées", "Personne-ressource") and the sections tab ("Rubriques",
"Séries", "Série(s)") showed no raw key.

<a id="fn-f-a13"></a>
**f-a13** — pkp/pkp-lib#13370 (`fab29cfeca`, 2026-09-28; note ad) left
every other reader of the masthead out: the invitation email
(`UserRoleAssignmentInvitationNotify`, the line
`emails.userRoleAssignmentInvitationNotify.userGroupSectionWillAppear`
chosen from the role's masthead flag alone, as [User
invitations](U06-user-invitations.md#fn-a11) note f-a11 describes), the
masthead-change email (`UserRoleMastheadUpdateNotify::setData()`, sent by
`PKPUserController::masthead()` whatever the settings) and the
ui-library's `UserInvitationUserGroupsTable.vue`, which fixes a reviewer
role to "Appear on the masthead" ("since they are always displayed");
none reads `enableEnrollmentMasthead` or
`enableEnrollmentMastheadReviewers`. The issue makes reviewer listing
optional because it "may reveal information (such as past reviewers) that
the journal does not wish to reveal". Live-probed 2026-09-29 (Settings
bullet 3; OJS, one scratch journal per case): with the enrollment box
unticked and saved, the masthead read its heading alone; "Invite to a
role" for an existing Author offered "Journal Masthead: Appear on the
masthead / Does not appear on the masthead" on the new "Section editor"
row under the header "You are inviting a user to take a role in OJS along
with appearing in the journal masthead", and the email read "Section
editor … Starting from 2026-09-29 … Your name will appear in the Scratch
context {tag}'s masthead as a Section editor."; on a Section editor's
"Edit" page the held role set to "Does not appear on the masthead" and
back, each confirmed through "Confirm masthead visibility change" ("This
will update whether this user appears on the journal masthead for the
selected role. The user will be notified of this change."), sent two
emails "Your journal masthead visibility has been updated", the second
ending "New setting: Appear on the masthead"; the masthead still read its
heading alone. On a new journal (enrollment box ticked, reviewers box
unticked) with a review completed on 2025-06-15, the masthead listed its
Section editor and no "Peer Reviewers in Previous Year"; a Reader invited
to "Reviewer" saw the row's masthead cell as the fixed text "Appear on the
masthead", and the email read "Reviewer … Your name will appear in the
Scratch context {tag}'s masthead as a Reviewer.". The same three emails
and the same page on a freshly reset stable-3_5_0 OJS the same day
(lib/pkp `8809a197de`, where the settings arrived 2026-09-24). OMP and OPS
carry the same shared code (mailables, users API, invitation screens and
page handler at lib/pkp `fab29cfeca`) and were not driven; OPS has no
reviewer role. Kept check
`shared/playwright/checks/sync/pkp-lib-13370/masthead-promises.js`.
Written up for the team in `docs/reports/2026-09-29-pkp-lib-13370.md` (a
temporary report, deleted once acted on; git history keeps it); issue
pkp/pkp-lib#13370.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `locale/en/locale.po` `manager.setup` "Setup" (OJS
"Journal Settings", OPS "Server Settings"), used as the heading and
`pageTitle` by `context.tpl` and `ManagementHandler::context()`; the Website
page's side tabs use `navigation.setup` "Setup". Live-probed 2026-09-23:
Settings › Press headed "Setup", browser title "Setup | Public Knowledge
Press".

<a id="fn-f-omp2"></a>
**f-omp2** — Note w. Live-probed 2026-09-23: note td18.

<a id="fn-f-ops1"></a>
**f-ops1** — Note i; OPS `SettingsHandler::getInformationForm()` returns
null by design, and OPS ships no information page handler or block.
Live-probed 2026-09-23: note td17.

<a id="fn-f-ops2"></a>
**f-ops2** — OPS 7d4033b463 (2019-06-04) "introduce sponsoring
organization to context settings, remove ISSN and publisher settings";
`grep -rn sponsoringOrganization` over the OPS checkout and its lib/pkp
finds the form, the schema and the locale only. Live-probed 2026-09-23:
the saved value showed again on the tab and on no public page, in no page
head and in none of the eleven citation formats of a preprint.

<a id="fn-f-ops3"></a>
**f-ops3** — Live-probed 2026-09-23 (OPS; OJS and OMP the control):
French ticked under "Forms" on a scratch server, and a server seeded with
French form locales: the French "Privacy Statement" box held
"##default.contextSettings.privacyStatement##"; a journal and a press got
a French text. OPS's `locale/fr_CA/default.po` carries
`default.contextSettings.privacyStatement` with an empty text (OJS's and
OMP's carry a French one), and an untranslated text is written as
"##key##".
Live-probed 2026-09-28 (OPS; OJS and OMP the control; two runs): on a
scratch server with English forms, the Site Administrator ticked French
under "Forms" on Setup › "Languages" (saved at once): the French box
held `<p>##default.contextSettings.privacyStatement##</p>` on the same
page, on the next load and after a reload, as on a server created with
French forms. Signed out, `{server}/fr_CA/about/privacy` on the ticked
server and on one created with French forms was headed "Déclaration de confidentialité" with that text as its whole
body; a journal and a press showed their French text. Each "Forms" tick
failed the page's script as
[Languages & locales](U57-languages-and-locales.md#a5) records, and each
load of Settings › Website answered the Plugin Gallery's server error of
[Plugins management](U62-plugins-management.md#a1).
Issue report: [pkp-e2e#360](https://github.com/jardakotesovec/pkp-e2e/issues/360) ([docs/issues/U57-A8-french-default-texts-stored-as-codes.md](../issues/U57-A8-french-default-texts-stored-as-codes.md)).

<a id="fn-f-ops4"></a>
**f-ops4** — Live-probed 2026-09-28 (Rule 14a; OPS; OJS and OMP the
control; two runs): signed out, `publicknowledge/fr_CA/about/editorialMasthead`,
headed "Entête", gave the role headings
"##default.groups.name.sectionEditor##" and "Membre du comité éditorial"
on OPS, "Rédacteur-trice" and "Rédacteur-trice de rubrique" on OJS, and
"Rédacteur/Rédactrice en chef de la presse" and "Rédacteur/Rédactrice en
chef de la série" on OMP; in English the same pages read "Moderator" and
"Editorial Board Member", "Journal editor" and "Section editor", "Press
editor" and "Series editor". The raw heading showed the same on two
scratch servers created with French, each with one Moderator and one
Editorial Board Member. As `manager.maya` in French, Website ›
"Appearance" › "Entête" listed "##default.groups.name.sectionEditor##"
with the buttons "Avancer la position de
##default.groups.name.sectionEditor##" and "Reculer la position de …";
OJS and OMP listed French names only. The manager role's key
"##default.groups.name.manager##" showed on neither page, the manager
role not being a masthead role. Mechanism: OPS's `locale/fr_CA/default.po`
carries `default.groups.name.sectionEditor` with an empty text (OJS's
reads "Rédacteur-trice de rubrique"), the cause of
[Users management](U53-users-management.md#ops1) too. Each load
of Settings › Website answered the Plugin Gallery's server error of
[Plugins management](U62-plugins-management.md#a1).
Issue report: [pkp-e2e#360](https://github.com/jardakotesovec/pkp-e2e/issues/360) ([docs/issues/U57-A8-french-default-texts-stored-as-codes.md](../issues/U57-A8-french-default-texts-stored-as-codes.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Settings pages dispatcher (Journal, Website, Workflow, Distribution, Users & Roles; Announcements, Institutions, Comments, users-list "Edit") | `{journal}/management/settings/{context,website,workflow,distribution,access,announcements,institutions,userComments,user/{id}}` | ROUTE-017 · ROUTE-042 · ROUTE-063 · ROUTE-078 · VUE-022 |
| Settings › Journal › "Masthead" | `management/settings/context#masthead` | AFFM-001 |
| Settings › Journal › "Contact" | `management/settings/context#contact` | AFFM-002 |
| Settings › Website › "Setup" › "Information" {OJS OMP} | `management/settings/website#setup/information` | AFFM-022 |
| Settings › Website › "Setup" › "Privacy Statement" | `management/settings/website#setup/privacy` | AFFM-042 |
| "About the Journal" | `{journal}/about` | AFFR-032 · ROUTE-001 |
| "Editorial Masthead" | `{journal}/about/editorialMasthead` | AFFR-033 · ROUTE-001 |
| "Editorial History" | `{journal}/about/editorialHistory` | AFFR-034 · ROUTE-001 |
| "Contact" | `{journal}/about/contact` | AFFR-038 · ROUTE-001 |
| "Privacy Statement" (journal; site) | `{journal}/about/privacy`; `index/about/privacy` | AFFR-039 · ROUTE-002 |
| Page about the publishing software | `{journal}/about/aboutThisPublishingSystem`; `index/about/aboutThisPublishingSystem` | AFFR-040 · ROUTE-002 |
| Information pages {OJS OMP} | `{journal}/information/{readers,authors,librarians}` | AFFR-041 · ROUTE-039 (OJS) · ROUTE-061 (OMP) |
| Information block {OJS OMP} | the sidebar | AFFR-088 · PLUG-003 |
| "About Submissions" page (rider; *Submission intake configuration*) | `{journal}/about/submissions` | AFFR-035 (owned elsewhere) · ROUTE-001 |
| Context settings API behind every tab | `api/v1/contexts/{id}` (PUT) | — (context API, *Hosted journals*) |
| "Edit" link on the About pages | the pages above | AFFR-016 (owned elsewhere) |

## Reference — code anchors

- Dispatcher and gate: `lib/pkp/pages/management/ManagementHandler.php`
  (`authorize`, `settings`, `context`, `website`, `getInformationForm`);
  each app's `pages/management/SettingsHandler.php`;
  `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`,
  `ContextAccessPolicy.php`, `RoleBasedHandlerOperationPolicy.php`,
  `RestrictedSiteAccessPolicy.php`; `lib/pkp/classes/core/PKPRouter.php`,
  `PKPPageRouter.php`; `lib/pkp/classes/template/PKPTemplateManager.php`
  (the side menu); ui-library `components/Container/SettingsPage.vue`.
- Settings templates: each app's `templates/management/context.tpl`;
  `lib/pkp/templates/management/website.tpl`, `workflow.tpl`,
  `distribution.tpl`, `access.tpl`; OPS `templates/management/distribution.tpl`;
  OJS `templates/management/additionalDistributionTabs.tpl`.
- Forms: `lib/pkp/classes/components/forms/context/PKPMastheadForm.php`,
  `PKPContactForm.php`, `PKPInformationForm.php`, `PKPPrivacyForm.php`,
  `PKPAppearanceMastheadForm.php`, `PKPContextForm.php`; each app's
  `classes/components/forms/context/MastheadForm.php`; ui-library
  `components/Form/Form.vue`, `FormPage.vue`, `FormErrors.vue`,
  `fields/FieldRichTextarea.vue`.
- Model and API: `lib/pkp/schemas/context.json`, each app's
  `schemas/context.json`; `lib/pkp/api/v1/contexts/PKPContextController.php`
  (`edit`); `lib/pkp/classes/services/PKPContextService.php` (`validate`,
  `edit`); `lib/pkp/classes/core/ValidationServiceProvider.php` (`issn`,
  `email_or_localhost`, `country`); `lib/pkp/classes/validation/ValidatorFactory.php`.
- Public pages: `lib/pkp/pages/about/index.php`, `AboutContextHandler.php`,
  `AboutSiteHandler.php`; OJS `pages/about/index.php`; OJS and OMP
  `pages/information/index.php`, `InformationHandler.php`;
  `lib/pkp/templates/frontend/pages/about.tpl`, `editorialMasthead.tpl`,
  `editorialHistory.tpl`, `contact.tpl`, `privacy.tpl`, `information.tpl`;
  each app's `templates/frontend/pages/aboutThisPublishingSystem.tpl`;
  `lib/pkp/templates/frontend/components/editLink.tpl`, `breadcrumbs.tpl`,
  `headerHead.tpl`, `header.tpl`.
- Masthead data: `lib/pkp/classes/userGroup/Repository.php`
  (`getSortedMastheadUserGroups`, `getMastheadUserIdsByRoleIds`,
  `forgetEditorialCache`, `endAssignments`);
  `lib/pkp/classes/userGroup/relationships/UserUserGroup.php`
  (`withActive`, `withEnded`, `withMasthead`); `lib/pkp/classes/user/Collector.php`;
  `lib/pkp/classes/submission/reviewAssignment/DAO.php`
  (`getExternalReviewerIdsByCompletedYear`); each app's
  `registry/userGroups.xml`.
- Information block: OJS and OMP `plugins/blocks/information/InformationBlockPlugin.php`,
  `templates/block.tpl`, `settings.xml`, `locale/en/locale.po`.
- Navigation: `lib/pkp/classes/services/PKPNavigationMenuService.php`
  (`NMI_TYPE_ABOUT`, `MASTHEAD`, `PRIVACY`, `CONTACT`); each app's
  `registry/navigationMenus.xml`.
- Upgrade notice: `lib/pkp/classes/site/VersionCheck.php`; each app's
  `config.TEMPLATE.inc.php` (`show_upgrade_warning`,
  `sitewide_privacy_statement`).
- Mail: `lib/pkp/classes/mail/variables/ContextEmailVariable.php`;
  `lib/pkp/classes/observers/listeners/ValidateRegisteredEmail.php`.
- Locale: each app's `locale/en/locale.po`, `manager.po`, `default.po`,
  `admin.po`; `lib/pkp/locale/en/common.po`, `manager.po`, `user.po`,
  `invitation.po`; the form and validator strings in `common.po`.
