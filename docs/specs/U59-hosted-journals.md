---
name: hosted-journals
status: verified
---

# Hosted journals

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

One installation hosts many journals, and only the Site Administrator
can add one or take one away. On Administration › "Hosted Journals" the
Site Administrator creates a journal, changes its name, contact and path
and whether it appears publicly, sets the order the site lists its
journals in, and removes a journal with everything in it. Each journal's
"Settings wizard" gathers, for the Site Administrator, the journal's
identity form and a few setup tabs that other features describe. Every
visitor meets the result on the site's home page, which lists the
journals enabled publicly, in that order. A journal's own managers keep
most of the same identity on the journal's Settings pages; this spec
covers the site's side. <sup>a</sup>

## Actors & permissions

Hosted Journals and the Settings Wizard are Administration pages, so
they open as the rest of Administration does
([System administration & jobs](U61-system-administration.md), Actors
row 1 and Rule 3), after the Confirm Access gate where the installation
asks for it ([Login & sessions](U01-login-and-sessions.md), Rule 16).
"Every other account" below means every signed-in account without the
Site Administrator role, a Journal Manager's included. A journal is
*enabled publicly* while its box "Enable this journal to appear publicly
on the site" is ticked (Rule 11).

| Action | Who may, and when |
|--------|--------------------|
| **Open Hosted Journals and a journal's Settings Wizard** (Rules 1, 16) | • Site Administrator, at the site's own address<br>• every other account: the access-denied page, reading "The current role does not have access to this operation."<br>• signed out: the Login page<br>• with a journal's path in the address where the site's belongs: the Site Administrator gets the access-denied page "Access denied.", every other account the access-denied page above, and a signed-out visitor that journal's Login page <sup>a</sup> <sup>td1</sup> |
| **Create, edit, order and remove journals** (Rules 3–15) | • Site Administrator alone <sup>a</sup> |
| **Change the Settings Wizard's "Journal" tab** (Rule 17) | • Site Administrator alone; the wizard's other tabs belong to the features Rule 16 names <sup>a</sup> |
| **Change the same identity from the journal's own Settings** (Rule 9) | • whoever opens that journal's Settings pages ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)); never "Path", "Enable" or the journal's removal <sup>g</sup> |
| **See the site's list of journals** (Rules 20–21) | • every visitor, signed in or not, on the site's home page <sup>m</sup> |

## Fields & validation

**The journal form.** "Create Journal" ("Create Press", "Create
Server"), a row's "Edit" and the Settings Wizard's "Journal" tab hold the
same form; only "Create Journal" adds "Languages" and "Primary locale",
and only on a site that offers two or more languages. Fields in screen
order. A field marked "per language" takes one value for each language
the form offers (Rules 3, 8). A required one needs the primary
language's value: on "Create Journal" the site's primary language
(English on the test installs), even when "Primary locale" picks
another or the page is read in another language; on "Edit" and the
wizard, the journal's primary language. <sup>c</sup> <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Journal title" ("Press Name", "Server title") | yes, per language | Plain text. Empty in the primary language: "This field is required." |
| "Journal initials" ("Press Initials", "Server initials") | yes, per language | A short box. Empty in the primary language: "This field is required." |
| "Journal Abbreviation" {OJS}; "Server Abbreviation" {OPS} | no, per language | Plain text. A press has no such field |
| "Principal Contact Name" | yes | Plain text. Empty: "This field is required." |
| "Principal Contact Email address" | yes | An email address: "This is not a valid email address."; empty: "This field is required." |
| "Country" | carries no mark, yet refused empty ⚠ [A1](#a1) | A list of 249 countries by name, none selected when the window opens and no way back to none once one is picked; a name with an accented letter sorts after its plain neighbours ("Czechia" then "Côte d'Ivoire", "Åland Islands" last). It stands under "Select the country where this journal is located, or the country of the mailing address for the journal or publisher." ("press", "server"). Empty: "This is not a valid string." and "This is not a valid country." |
| "Journal description" ("Press description", "Server description") | no, per language | Formatted text. Readers see it as the journal's summary (Rules 9, 20) |
| "Path" | yes | The site's base address and "/" stand in front of the box ⚠ [A3](#a3). Letters, digits, "_" and "-" only, beginning and ending with a letter or digit, otherwise "The path can only include letters, numbers and the characters _ and -. It must begin and end with a letter or number."; a path another journal has: "The path you provided is already in use by another journal." ("The selected path is already in use by another press.", "The path you provided is already in use by another server."); the path "0": "A path is required." [OPS1](#ops1) <sup>td3</sup> |
| "Languages" | yes; "Create Journal" only | One box per language the site offers, none ticked when the window opens. Empty: "This field is required." What the ticked ones become for the journal: [Languages & locales](U57-languages-and-locales.md#journal-languages), Rule 8 |
| "Primary locale" | yes; "Create Journal" only | One choice per language the site offers, none picked when the window opens. Empty: "This field is required." A choice not ticked under "Languages": "The primary locale must be one of the journal's supported locales." ("press's", "server's") |
| "Enable" | no | One box, "Enable this journal to appear publicly on the site" ("Enable this press to appear publicly on the site", "Enable this preprint server to appear publicly on the site"). Unticked when "Create Journal" opens (Rule 11) |

## Rules & state

**The list of journals**

1. **Where it is.** Administration › "Hosted Journals" ("Hosted
   Presses", "Hosted Servers"; the button is on the Administration page,
   [System administration & jobs](U61-system-administration.md#administration-page))
   opens a page whose trail reads "Administration", a link back, then
   "Hosted Journals". It holds one table headed "Journals" ("Presses",
   "Servers") with the columns "Name" and "Path", and above it the
   buttons "Order" (only while the site has two or more journals) and
   "Create Journal" ("Create Press", "Create Server"). The table lists
   every journal of the site, enabled publicly or not, in the site's
   order (Rule 13), with no paging. Nothing in a
   row says whether the journal is enabled publicly. The notice of a
   newer release that can top the page belongs to
   [System administration & jobs](U61-system-administration.md#newer-release).
   <sup>b</sup> <sup>td2</sup>
2. **A row.** "Name" shows the journal's name in the language the Site
   Administrator reads the page in, or in the journal's primary language
   where it has none in that one. "Path" shows the journal's path, the
   part of each of its addresses that follows the site's. The arrow at
   the start of a row shows "Edit" (Rule 8), "Remove" (Rule 14) and
   "Settings wizard" (Rule 16) under it. <sup>b</sup>

**Creating a journal**

3. **The window.** "Create Journal" opens a window headed "Create
   Journal" ("Create Press", "Create Server") holding the journal form
   (Fields) empty, with "Save". Its per-language fields offer each
   language the site offers. A value typed in a language other than the
   new journal's primary one is kept (Hosted Journals read in that
   language shows the name, Rule 2), but the journal's form languages
   start as its primary language alone, so its "Edit" window and wizard
   "Journal" tab offer only that language's boxes
   ([Languages & locales](U57-languages-and-locales.md#form-languages)).
   Closing the window, or leaving the page, with values typed asks
   nothing: they are dropped, and the window reopens empty. <sup>c</sup>
   <sup>td3</sup>
4. **A refused save.** It creates nothing. The window stays open with
   each message under its field, and beside "Save" the line "Please
   correct one error." ("Please correct {n} errors.") and the link
   "Jump to next error" ⚠ [A6](#a6); a screen reader also hears a "Go
   to {field}" per refused field. An empty required field is refused
   before anything is sent. The "Path", email and "Country" refusals,
   and a "Primary locale" not ticked under "Languages", come back from
   the server and also show the notice "The form was not saved because
   {n} error(s) were encountered. Please correct these errors and try
   again." at the top right. A field's message goes once that field is
   changed, and "Save" stays disabled until every refused field has been
   changed. <sup>d</sup> <sup>td3</sup>
5. **An accepted save.** The browser leaves the list for the new
   journal's Settings Wizard (Rule 16). The journal takes the last place
   in the site's order (Rule 13). It is enabled publicly only if
   "Enable this journal to appear publicly on the site" was ticked;
   otherwise it stays off the site's home page (Rule 11). <sup>c</sup>
   <sup>td4</sup>
6. **What a new journal starts with.** Each feature describes its own
   defaults; what this screen decides is: <sup>e</sup> <sup>td4</sup>
   - the Site Administrator who created it holds its Journal Manager
     role, with "Start Date" empty
     ([Users management](U53-users-management.md));
   - the principal contact typed on the form, and no technical support
     contact
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     Rule 9);
   - {OJS} one section, "Articles"; {OPS} one section, "Preprints"; a
     press starts with no series
     ([Sections](U17-sections.md));
   - the languages of [Languages & locales](U57-languages-and-locales.md#journal-languages),
     Rule 8, from "Languages" and "Primary locale";
   - {OJS OMP} the default "For Readers" and "For Authors" texts, which
     name the journal's address as it is on that day (Rule 10); a
     preprint server has no Information pages
     ([Journal identity & about pages](U07-journal-identity-and-about-pages.md#ops1),
     OPS1).
7. **A one-language site.** When the site offers one language, "Create
   Journal" shows neither "Languages" nor "Primary locale", and the new
   journal takes the site's language
   ([Languages & locales](U57-languages-and-locales.md#journal-languages),
   Rule 8, and its [A7](U57-languages-and-locales.md#a7)). <sup>c</sup>

**Editing a journal**

8. **The "Edit" window.** A row's "Edit" opens a window headed "Edit"
   holding the journal form without "Languages" and "Primary locale",
   filled in with the journal's values; its per-language fields offer
   the journal's "Forms" languages
   ([Languages & locales](U57-languages-and-locales.md#form-languages)).
   An accepted "Save" shows "Saved" beside the button, and the window
   closes by itself a moment later. The row keeps the old name and path
   until the page is reloaded ⚠ [A2](#a2). A journal whose "Country" was
   never set, the seeded journal among them, cannot be saved until one
   is picked ([A1](#a1)). A refused save behaves as in Rule 4. Closing
   the window ("Close") with a change unsaved asks nothing: the change
   is dropped, and the window opens again with the saved values.
   Closing this window, or the "Create Journal" one, right after it
   opens makes the page's script fail, though the window closes and
   nothing shows ⚠ [A7](#a7). <sup>f</sup> <sup>td5</sup>
9. **One set of values.** The "Edit" window, the Settings Wizard's
   "Journal" tab and the journal's own Settings show and save the same
   values. A save in one shows in the others the next time they open:
   <sup>g</sup> <sup>td6</sup>
   - "Journal title", "Journal initials", "Journal Abbreviation" and
     "Country" are the fields of the same names on Settings › Journal ›
     "Masthead", and "Journal description" is the "Journal Summary"
     there;
   - "Principal Contact Name" and "Principal Contact Email address" are
     the "Principal Contact" "Name" and "Email address" on Settings ›
     Journal › "Contact".

   Where readers meet those values is
   [Journal identity & about pages](U07-journal-identity-and-about-pages.md)'s
   (Rules 7–10); the site's list of Rule 20 is this spec's.
10. **Changing "Path".** Once a new path is saved, every address of the
    journal carries it at once, and the old address answers "404 Not
    Found". {OJS OMP} The default "For Readers" and "For Authors" texts
    keep linking to the old address ⚠ [A5](#a5). On the Settings Wizard,
    the page's further saves, and the actions of its "Languages",
    "Installed Plugins" and "Users" lists, fail until it is reloaded
    ⚠ [A4](#a4). <sup>h</sup> <sup>td7</sup>
11. <a id="enabled-publicly"></a>**Enabled publicly.** While "Enable
    this journal to appear publicly on the site" is ticked and saved,
    the site's home page lists the journal (Rule 20). Unticked and
    saved: <sup>i</sup> <sup>td8</sup>
    - the site's home page leaves it out;
    - a signed-out visitor who opens any of its pages (its home, About,
      article and file pages; {OJS} an issue; {OMP} a book's version or
      chapter) lands on its Login page
      ([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
      Rule 22);
    - signing in on that Login page does not lead on to the page asked
      for, as signing in after other interrupted visits does
      ([Login & sessions](U01-login-and-sessions.md), Rule 4). It leads
      where signing in on a Login page opened directly does (Login &
      sessions, Rule 3): a Journal Manager to the journal's Dashboard, a
      Reader to the journal's home page ⚠ [A8](#a8) <sup>td8</sup>;
    - on that Login page, "Register" (in the header and under the form)
      and "Home" in the trail each load the Login page again, while
      "Forgot your password?" opens "Reset Password": an account can be
      reset there but not created ⚠ [A9](#a9) <sup>td8</sup>;
    - its published items leave the site-wide harvesting address
      ([OAI-PMH](U19-oai-pmh.md), Rule 16b);
    - its row stays on Hosted Journals, and its "Edit" and Settings
      Wizard work as before.

**Ordering the journals**

12. **"Order".** "Order" turns the rows into drag handles and adds
    "Done" and "Cancel ordering" under the table. Drag a row to its new
    place and press "Done" to keep the order, or "Cancel ordering" to
    put the rows back as they were. A reload drops an order not kept
    with "Done". While ordering, the rows' arrows are hidden, and
    "Order" and "Create Journal" ("Create Press", "Create Server") do
    nothing until "Done" or "Cancel ordering". <sup>j</sup> <sup>td9</sup>
13. <a id="site-order"></a>**The site's order.** The order kept with
    "Done" is the order of this table, of the site's home page list
    (Rule 20), of the journals the site-level Register page offers
    ([Registration & account validation](U02-registration-and-account-validation.md),
    Rule 8) and of the journals switcher of the editorial header
    ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
    Rule 29). <sup>j</sup> <sup>td9</sup>

**Removing a journal**

14. **"Remove".** A row's "Remove" asks, in a window headed "Confirm",
    "Are you sure you want to permanently delete {journal title} and all
    of its contents?", with "OK" and "Cancel". "Cancel" closes the window
    and changes nothing. "OK" takes the row out of the table and deletes
    the journal with everything in it (Side effects); every address of
    the journal then answers "404 Not Found". Nothing brings it back.
    <sup>k</sup> <sup>td10</sup>

    {OMP OPS} A press (preprint server) that holds an institution is not
    removed: "OK" makes the app fail, the "Confirm" window stays open with
    no message until its "Cancel" is pressed, and the row stays, also
    after a reload. The press is left with no roles: its Settings pages
    answer "The current role does not have access to this operation." even
    to the Site Administrator, while its home page still opens for anyone
    and its row's "Settings wizard" still opens. A second "Remove" fails
    the same way ⚠ [A10](#a10). <sup>td10</sup>
15. **The accounts stay.** Removing a journal deletes no account. Its
    users lose their roles in it and keep the rest. An account whose
    only roles were in the removed journal still signs in and lands on
    the site's home page with no role; its Profile › "Roles" lists the
    remaining journals only.
    <sup>k</sup> <sup>td10</sup>

**The Settings Wizard**

16. **The page.** A row's "Settings wizard" opens a page headed
    "Settings Wizard", whose trail reads "Administration", "Hosted
    Journals" (both links back) and "Settings Wizard". The page names the
    journal only in its "Journal" tab's fields. Every tab acts on that
    journal alone. Its tabs, and where each is described:
    <sup>l</sup> <sup>td11</sup>

    | Tab | Side tabs | Described in |
    |---|---|---|
    | "Journal Settings" ("Setup" on a press, "Server Settings" on a preprint server) | "Journal" ("Press", "Server") | this spec (Rule 17) |
    | | "Appearance" | [Appearance & theming](U10-appearance-and-theming.md), Rule 34 |
    | | "Languages" | [Languages & locales](U57-languages-and-locales.md#journal-languages), Rule 7 |
    | | "Search Indexing" | [Search engine metadata & analytics](U20-search-engine-metadata-and-analytics.md) |
    | | "Restrict Bulk Emails" | [Notify users](U55-notify-users.md), Rules 11–13 |
    | "Plugins" | "Installed Plugins", "Plugin Gallery" | [Plugins management](U62-plugins-management.md), Rule 3 |
    | "Users" | — | [Users management](U53-users-management.md), Rule 19 |

17. **The "Journal" tab.** It holds the "Edit" window's form (Rule 8)
    with "Save"; an accepted save shows "Saved" beside the button and the
    page stays. A change not saved is still there after opening another
    tab and coming back; leaving the page asks nothing and drops it.
    <sup>l</sup> <sup>td11</sup>
18. **The wizard's addresses.** The wizard's address is the site's
    address with "admin/wizard/" and the journal's number after it, and
    each tab adds its own key after "#": "#setup" ("Journal Settings"),
    "#context" ("Journal"), "#appearance", "#languages", "#indexing"
    ("Search Indexing"), "#restrictBulkEmails", "#plugins", "#installed"
    ("Installed Plugins"), "#gallery" ("Plugin Gallery"), "#users". A
    reload opens the same tab again on the "Journal Settings" side tabs,
    on "Plugins" and on "Users"; after "Installed Plugins" or "Plugin
    Gallery" is pressed it opens "Journal Settings" › "Journal" instead
    ([Plugins management](U62-plugins-management.md), Rule 3). A number
    no journal has opens "404 Not Found". <sup>l</sup> <sup>td12</sup>

**The site's home page**

19. **When the list shows.** The site's address opens the site's home
    page only while no "Journal redirect" is chosen and two or more
    journals are enabled publicly; with exactly one it opens that
    journal instead
    ([Site settings](U60-site-settings.md#journal-redirect), Rule 8).
    <sup>n</sup>

    The "none" end is read from the code, since the test installs
    always keep the seeded journal enabled publicly: with none, the
    list's place reads "There are no journals available." ("There are no
    presses available.", "There are no servers available."), and the
    Site Administrator who opens the site's address lands on Hosted
    Journals instead. <sup>o</sup>
20. **The list.** Below "About the Site" and the announcements
    ([Site settings](U60-site-settings.md), Rule 13), the heading
    "Journals" ("Presses", "Servers") tops one entry per journal enabled
    publicly, in the site's order (Rule 13). Each entry holds, top to
    bottom: <sup>m</sup> <sup>td13</sup>
    - the journal's thumbnail, when one is set
      ([Appearance & theming](U10-appearance-and-theming.md), Rule 21),
      as a link to the journal's home page;
    - the journal's name, as a link to its home page;
    - its "Journal description" ("Press description", "Server
      description"), the "Journal Summary" of Masthead (Rule 9), when
      set;
    - the link "View Journal" ("View Press Website" on a press, "View
      Server" on a preprint server) to its home page, and {OJS} the link
      "Current Issue" to its current issue ([Issues](U50-issues.md)),
      shown also for a journal with none, where it opens the page headed
      "No Current Issue".

    The page's browser title and heading are the site's "Site Name"
    ([Site settings](U60-site-settings.md), Rule 7, and its
    [A1](U60-site-settings.md#a1)). <sup>m</sup>

## Side effects

- **Creating a journal** (Rules 5–6): the journal and its default setup
  exist at once; it joins the journals switcher of the Site
  Administrator ([Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md),
  Rule 29) and the "Bulk Emails" list of Site Settings
  ([Site settings](U60-site-settings.md), Rule 16), and the site's home
  page once enabled publicly. <sup>e</sup>
- **Enabling or disabling** (Rule 11): the journal's published items
  come back to, or leave, the site-wide harvesting address, where each
  one reads as a deleted record while it is out
  ([OAI-PMH](U19-oai-pmh.md), Rule 16b). <sup>i</sup>
- **Removing a journal** (Rule 14): everything the journal holds is
  deleted with it: its submissions and their files, {OJS} its issues and
  subscriptions, its sections or series, its roles and every user's
  roles in it, its components, announcements, highlights, navigation
  menus, edited email templates, review forms, {OJS} institutions (a
  press or preprint server that holds one is not removed at all, Rule 14,
  [A10](#a10)), plugin settings, its uploaded files, and its tasks in the
  Tasks panel.
  Accounts stay (Rule 15). Each published article or book reads as a
  deleted record at the site-wide harvesting address
  ([OAI-PMH](U19-oai-pmh.md), Rule 4b); a removed preprint server leaves
  none ([OAI-PMH](U19-oai-pmh.md#ops4), OPS4). <sup>k</sup>
- No action on these screens sends an email or a notification.
  <sup>k</sup> <sup>td14</sup>

## Settings that modify behavior

The journal form is itself a settings screen: its fields take effect as
Rule 9 and [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
describe, and the ones below change what this spec's screens do.

1. **"Enable this journal to appear publicly on the site"** (the journal
   form; unticked when "Create Journal" opens, ticked on the seeded
   journal and every scratch journal). Ticked: the site's home page
   lists the journal (Rule 20). Unticked: Rule 11.
2. **"Journal description"** (the journal form, or "Journal Summary" on
   Settings › Journal › "Masthead"; empty unless typed). Set: the text
   stands under the name in the site's list (Rule 20); empty, nothing
   stands there.
3. **The languages the site offers** (Administration › Site Settings ›
   "Languages"; *Languages & locales*; English and French on the test
   installs). Two or more: "Create Journal" asks "Languages" and "Primary
   locale" (Fields). One: it asks neither (Rule 7).
4. **The number of journals enabled publicly** (this spec, Rule 11;
   the seeded journal alone on a freshly reset test install, more once
   scratch journals exist). Two or more: the site's home page shows the
   list (Rule 20). Exactly one: the site's address opens that journal
   (Rule 19). None: Rule 19's "none" end, read from the code.
5. **"Journal redirect"** (Administration › Site Settings › "Site
   Setup" › "Settings"; blank). A journal chosen: the site's address
   opens it and the list cannot be reached (Rule 19).
6. **"Journal thumbnail"** (Settings › Website › "Appearance";
   *Appearance & theming*; none). Set: the thumbnail tops the journal's
   entry in the site's list (Rule 20).
7. **"Bulk Emails"** (Administration › Site Settings › "Site Setup" ›
   "Bulk Emails"; no journal ticked). The journal ticked: the wizard's
   "Restrict Bulk Emails" tab holds its form; unticked, a line sending
   the Site Administrator to Site Settings ([Notify users](U55-notify-users.md),
   Rules 11–13).
8. **The re-authentication window** (the configuration file, which no
   screen shows; off, as on the test installs). Set: the Confirm Access
   gate stands before these pages
   ([Login & sessions](U01-login-and-sessions.md), Rule 16); that end
   needs a change to the configuration file and is read from the code.
   <sup>p</sup>

## Cross-feature interactions

- [System administration & jobs](U61-system-administration.md) owns the
  Administration page the "Hosted Journals" button sits on, the gate in
  front of every Administration page, and the notice of a newer release.
- [Site settings](U60-site-settings.md) owns the site's own texts around
  the list on the site's home page, the "Journal redirect", and the
  "Bulk Emails" list that decides the wizard's "Restrict Bulk Emails"
  tab; this spec owns the list of journals itself.
- [Journal identity & about pages](U07-journal-identity-and-about-pages.md)
  owns the journal's own Masthead and Contact tabs and every reader page
  that shows the name, summary and contact; Rule 9 says which fields
  they share with this form. Its register entry
  [A11](U07-journal-identity-and-about-pages.md#a11) records the
  "Country" refusal of Hosted Journals' "Edit", which [A1](#a1) holds in
  full.
- The Settings Wizard's tabs other than "Journal" belong to the
  features Rule 16's table names; this spec owns the page and which tabs
  it shows.
- [Languages & locales](U57-languages-and-locales.md) owns what the
  create form's "Languages" and "Primary locale" set up for the new
  journal, and the one-language site's form.
- [Appearance & theming](U10-appearance-and-theming.md) owns the
  journal thumbnail that tops a list entry.
- [OAI-PMH](U19-oai-pmh.md) owns the deleted records a disabled or
  removed journal leaves.
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)
  owns the journals switcher, which a created or removed journal joins
  or leaves.
- [Users management](U53-users-management.md) owns the new journal's
  users list, where the Site Administrator's Journal Manager role
  shows, and the wizard's "Users" tab.
- [Registration & account validation](U02-registration-and-account-validation.md)
  owns the site-level Register page, whose list of journals follows the
  site's order (Rule 13).
- [Login & sessions](U01-login-and-sessions.md) owns the Login page
  and where a sign-in lands (its Rules 3–4); Rule 11 says what a journal
  not enabled publicly changes there.
- [Institutions](U66-institutions.md) owns a journal's institutions; its
  [A8](U66-institutions.md#a8) records, from its side, the press that
  cannot be removed while it holds one (Rule 14).

## Canonical scenarios

Every scenario runs as the Site Administrator (a ready account) at the
site's own address, on scratch journals with throwaway accounts that the
test tooling seeds or that the scenario creates on "Create Journal"; the
seeded journal is only read, and a scenario that reorders the site's
journals runs alone. <sup>s</sup>

1. **Who reaches Hosted Journals**

   Given: Site Administrator, on a site hosting two scratch journals,
   "Dune Review" (path dunereview), enabled publicly, and "Marsh Review"
   (path marshreview), not enabled publicly, with Dune Review's Journal
   Manager, a throwaway account, signed in in a second browser and a
   visitor signed out in a third.

   - **The page**: open Administration › "Hosted Journals" ("Hosted
     Presses", "Hosted Servers"): the trail above the page reads
     "Administration", a link, then "Hosted Journals". The page holds one
     table headed "Journals" ("Presses", "Servers") with the columns
     "Name" and "Path", and above it the buttons "Order" and "Create
     Journal" ("Create Press", "Create Server") (Rule 1).
   - **The rows**: Dune Review's row reads "Dune Review" under "Name" and
     dunereview under "Path". Marsh Review, not enabled publicly, has its
     row too, reading "Marsh Review" and marshreview; nothing in either
     row says whether the journal is enabled publicly (Rules 1, 2).
   - **A row's arrow**: press the arrow at the start of Dune Review's
     row: "Edit", "Remove" and "Settings wizard" show under it. Choose
     "Settings wizard": the page headed "Settings Wizard" opens (Rules 2,
     16).
   - **The Journal Manager**: opens the address of Hosted Journals and
     the address of Dune Review's Settings Wizard, both copied from the
     Site Administrator's browser: each opens the access-denied page,
     reading "The current role does not have access to this operation."
     (Actors row 1).
   - **Signed out**: the visitor opens the same two addresses: each opens
     the Login page (Actors row 1).
   - **Control**: the Journal Manager opens Dune Review's Settings ›
     Journal: its "Masthead" and "Contact" tabs open, and neither holds a
     "Path" field or the box "Enable this journal to appear publicly on
     the site" (Actors row 4). <sup>s</sup>

2. **Creating a journal**

   Given: Site Administrator, on a site offering English and French and
   hosting a scratch journal "Tide Journal", named in English alone and
   enabled publicly, so that the site's home page lists the journals,
   with a visitor signed out in a second browser.

   - **The window**: open Administration › "Hosted Journals" and press
     "Create Journal" ("Create Press", "Create Server"): a window headed
     "Create Journal" ("Create Press", "Create Server") holds the journal
     form with every field empty: "Languages" has one box for English and
     one for French, none ticked; "Primary locale" has nothing chosen;
     "Country" has no country selected; and "Enable this journal to
     appear publicly on the site" ("Enable this press…", "Enable this
     preprint server…") is unticked (Fields; Rule 3; Settings bullet 3).
   - **The "Country" list**: open the "Country" list without choosing:
     it names 249 countries, "Czechia" followed by "Côte d'Ivoire", and
     "Åland Islands" last (Fields).
   - **Closed unsaved**: type Draft Journal in "Journal title" ("Press
     Name", "Server title") and close the window: nothing is asked. Press
     "Create Journal" again: the window opens empty (Rule 3).
   - **Refused empty**: press "Save": "This field is required." shows
     under "Journal title", "Journal initials" ("Press Initials", "Server
     initials"), "Principal Contact Name", "Principal Contact Email
     address", "Path", "Languages" and "Primary locale"; beside "Save"
     stand the line "Please correct 7 errors." and the link "Jump to next
     error" ⚠ [A6](#a6); "Save" is disabled (Fields; Rule 4).
   - **The email address refused**: type Harbour Review in the English
     "Journal title" and HR in the English "Journal initials": the
     messages under those two boxes go, while those under "Principal
     Contact Name", "Principal Contact Email address", "Path" and
     "Languages" stand and "Save" stays disabled. Type Revue du Port in
     the French "Journal title" and RP in the French "Journal initials",
     Ana Pereira in "Principal Contact Name" and x in "Principal Contact
     Email address", choose "Canada" under "Country", type harbourreview
     in "Path", tick English and French under "Languages" and choose
     English under "Primary locale": "Save" is enabled again. Press
     "Save": "This is not a valid email address." shows under
     the email address, beside "Save" "Please correct one error.", and at
     the top right "The form was not saved because 1 error(s) were
     encountered. Please correct these errors and try again."; "Save" is
     disabled (Fields; Rule 4).
   - **"Path" refused**: type ana.pereira@mail.test as the email address
     and a b in "Path", and press "Save": "The path can only include
     letters, numbers and the characters _ and -. It must begin and end
     with a letter or number." shows under "Path". Type publicknowledge,
     the seeded journal's path, and press "Save": "The path you provided
     is already in use by another journal." ("The selected path is
     already in use by another press.", "The path you provided is already
     in use by another server.") (Fields; Rule 4).
   - **The site's language still required**: type harbourreview in
     "Path", choose French under "Primary locale", clear the English
     "Journal title" and "Journal initials", and press "Save": "This field
     is required." shows under both English boxes, although "Primary
     locale" is French and the French boxes are filled (Fields).
   - **"Primary locale" refused**: type Harbour Review and HR in the
     English boxes again, untick French under "Languages", leave French
     chosen under "Primary locale" and press "Save": "The primary locale
     must be one of the journal's supported locales." ("press's",
     "server's") shows under it (Fields; Rule 4).
   - **Accepted**: choose English under "Primary locale", tick French
     again under "Languages", leave "Enable this journal to appear
     publicly on the site" unticked and press "Save": the browser leaves
     Hosted Journals for the page headed "Settings Wizard", whose
     "Journal" tab reads Harbour Review in "Journal title" and offers the
     English boxes alone, with no French ones (Rules 3, 5, 17).
   - **The new row**: open Administration › "Hosted Journals": the last
     row reads Harbour Review under "Name" and harbourreview under "Path"
     (Rules 2, 5).
   - **Read in French**: in the editorial header's initials menu, choose
     "français" under "Change Language"
     ([Languages & locales](U57-languages-and-locales.md)): Harbour
     Review's row reads Revue du Port, and Tide Journal's row keeps its
     English name. Choose "English" again (Rules 2, 3).
   - **What the journal starts with**: choose Harbour Review in the
     journals switcher of the editorial header, which now offers it, and
     open its Settings › Users & Roles: the Site Administrator holds the
     Journal Manager role there, with "Start Date" empty. Settings › Journal ›
     "Contact": the "Principal Contact" reads Ana Pereira and
     ana.pereira@mail.test, and the technical support contact is empty.
     Settings › Journal › "Sections": one section, "Articles"
     ("Preprints" on a preprint server); on a press "Series" lists none
     (Rule 6; Side effects).
   - **Site Settings**: open Administration › "Site Settings" › "Site
     Setup" › "Bulk Emails": the list has a box for Harbour Review (Side
     effects).
   - **Not enabled publicly**: the visitor opens the site's home page: it
     has no entry for Harbour Review. The visitor opens Harbour Review's
     home page, its address carrying harbourreview: the Login page opens
     (Rules 5, 11).
   - **Enabled on "Create Journal"**: back on Hosted Journals, press
     "Create Journal", type Harbour Notes in the English "Journal title",
     HN in the English "Journal initials", Ana Pereira in "Principal
     Contact Name" and ana.pereira@mail.test in "Principal Contact Email
     address", choose "Canada" under "Country", type harbournotes in
     "Path", tick English under "Languages", choose English under
     "Primary locale", tick "Enable this journal to appear publicly on
     the site" and press "Save": the page headed "Settings Wizard" opens.
     The visitor reloads the site's home page: it lists Harbour Notes
     (Rules 5, 20; Settings bullet 1).
   - **Control**: the mail catcher has received no email since the first
     "Save" was pressed (Side effects). <sup>s</sup>

3. **Editing a journal, and its one set of values**

   Given: Site Administrator, on a scratch journal "Sea Letters" (path
   sealetters, initials SL, a country chosen), enabled publicly, whose
   Journal Manager, a throwaway account, is signed in in a second
   browser, with a visitor signed out in a third.

   - **The "Edit" window**: open Administration › "Hosted Journals",
     press the arrow at the start of Sea Letters' row and choose "Edit":
     a window headed "Edit" holds the journal form filled in with the
     journal's values, Sea Letters in "Journal title" ("Press Name",
     "Server title") and SL in "Journal initials" ("Press Initials",
     "Server initials"), with neither "Languages" nor "Primary locale"
     (Rule 8).
   - **Saved**: type Sea Letters Quarterly in "Journal title", Lena Ortiz
     in "Principal Contact Name" and Letters from the coast. in "Journal
     description", and press "Save": "Saved" shows beside the button, and
     the window closes by itself a moment later. Reload the page: the row
     reads Sea Letters Quarterly under "Name" ⚠ [A2](#a2) (Rule 8).
   - **The wizard's "Journal" tab**: choose "Settings wizard" on the
     row: on "Journal Settings" › "Journal", "Journal title" reads Sea
     Letters Quarterly, "Principal Contact Name" Lena Ortiz and "Journal
     description" Letters from the coast. (Rule 9).
   - **The Journal Manager's Settings**: the Journal Manager opens
     Settings › Journal › "Masthead": "Journal title" reads Sea Letters
     Quarterly and "Journal Summary" Letters from the coast. On "Contact",
     the "Principal Contact" "Name" reads Lena Ortiz (Rule 9; Actors row
     4).
   - **Saved on "Masthead"**: the Journal Manager types Letters from the
     whole coast. in "Journal Summary" and presses "Save". The Site
     Administrator opens Sea Letters' "Edit" again: "Journal description"
     reads Letters from the whole coast. (Rule 9).
   - **A new path**: in that window, type sealettersq in "Path" and press
     "Save": "Saved". Reload Hosted Journals: the row reads sealettersq
     under "Path" ⚠ [A2](#a2). The visitor opens Sea Letters' home page,
     its address carrying sealettersq: it opens. The same address
     carrying sealetters answers "404 Not Found" (Rule 10).
   - **Control**: open "Edit" again, type Unsaved Title in "Journal
     title" and press "Close": nothing is asked. Open "Edit" again:
     "Journal title" reads Sea Letters Quarterly (Rule 8). <sup>s</sup>

4. **The site's list of journals, and a journal taken off it**

   Given: a visitor, signed out, on a site hosting two scratch journals
   enabled publicly, "River Review" and then "Hill Notes" in the site's
   order, River Review with a country chosen, {OJS} a published issue,
   Vol. 1 No. 1, and the "Journal description" "Letters from the river.",
   Hill Notes with none of these; the Site Administrator in a second
   browser.

   - **The list**: the visitor opens the site's address: the site's home
     page opens, where the heading "Journals" ("Presses", "Servers") tops
     the list, River Review's entry above Hill Notes'. River Review's
     entry reads, top to bottom: "River Review" as a link, "Letters from
     the river.", the link "View Journal" ("View Press Website" on a
     press, "View Server" on a preprint server) and, {OJS}, the link
     "Current Issue". Hill Notes' entry has no text between its name and its links
     (Rules 13, 19, 20; Settings bullets 2, 4).
   - **The links**: press "River Review": the journal's home page opens.
     Back on the list, press River Review's "View Journal": the same page
     opens (Rule 20).
   - **"Current Issue"** {OJS}: press River Review's "Current Issue": the
     page of Vol. 1 No. 1 opens. Back on the list, press Hill Notes'
     "Current Issue": the page headed "No Current Issue" opens (Rule 20).
   - **Taken off the site**: the Site Administrator opens Administration
     › "Hosted Journals", then River Review's "Edit", unticks "Enable
     this journal to appear publicly on the site" ("Enable this press…",
     "Enable this preprint server…") and presses "Save": "Saved". The
     visitor reloads the site's home page: River Review has no entry,
     and Hill Notes' entry is still there. The visitor opens River
     Review's home page again: the Login page opens (Rule 11; Settings
     bullet 1).
   - **Still on Hosted Journals**: the Site Administrator reloads Hosted
     Journals: River Review's row is there; its "Edit" opens with the box
     unticked, and its "Settings wizard" opens the page headed "Settings
     Wizard" (Rule 11).
   - **Back on the site**: the Site Administrator ticks the box in River
     Review's "Edit" and presses "Save": "Saved". The visitor reloads the
     site's home page: River Review's entry is back, above Hill Notes'
     (Rules 11, 13).
   - **Control**: the visitor opens River Review's home page again: the
     journal's home page opens, not the Login page (Rule 11).
     <sup>s</sup>

5. **Ordering the journals**

   Given: Site Administrator, on a site hosting two scratch journals
   enabled publicly, "North Papers" and then "South Papers", the last two
   in the site's order, with a visitor signed out in a second browser.

   - **"Order"**: open Administration › "Hosted Journals" and press
     "Order": every row becomes a drag handle, the rows' arrows are
     hidden, and "Done" and "Cancel ordering" show under the table. Press
     "Create Journal" ("Create Press", "Create Server"): no window opens.
     Press "Order": nothing changes (Rule 12).
   - **"Done"**: drag South Papers' row above North Papers' and press
     "Done": South Papers stands above North Papers, and the rows' arrows
     are back. Reload the page: South Papers still stands above North
     Papers (Rules 12, 13).
   - **The site's home page**: the visitor opens the site's home page:
     South Papers' entry stands above North Papers' (Rules 13, 20).
   - **The site's Register page**: the visitor presses "Register" on the
     site's home page: among the journals the page offers, South Papers
     stands above North Papers (Rule 13;
     [Registration & account validation](U02-registration-and-account-validation.md)).
   - **The journals switcher**: on Hosted Journals, the Site
     Administrator opens the journals switcher of the editorial header:
     South Papers stands above North Papers (Rule 13).
   - **Not kept**: press "Order", drag North Papers' row above South
     Papers' and reload the page without pressing "Done": South Papers
     stands above North Papers (Rule 12).
   - **Control**: press "Order", drag North Papers' row above South
     Papers' and press "Cancel ordering": the rows go back, South Papers
     above North Papers, each with its arrow (Rule 12). <sup>s</sup>

6. **Removing a journal**

   Given: Site Administrator, on a site hosting two scratch journals
   enabled publicly, "Old Pier Review" and "New Pier Review", with two
   throwaway accounts signed out in a second browser: Rui Tanaka, an
   Author of Old Pier Review alone, and Nova Reyes, an Author of both,
   whose submission in Old Pier Review carries a discussion she takes
   part in, so her Tasks panel holds its "Discussion added." row
   ([Tasks & discussions](U37-tasks-and-discussions.md)).

   - **"Remove", cancelled**: open Administration › "Hosted Journals",
     note Old Pier Review's path under "Path", press the arrow at the
     start of its row and choose "Remove": a window headed "Confirm"
     asks "Are you sure you want to permanently delete Old Pier Review
     and all of its contents?", with "OK" and "Cancel". Press "Cancel":
     the window closes and the row stays. Reload the page: the row is
     still there (Rule 14).
   - **"Remove", confirmed**: choose the row's "Remove" again and press
     "OK": the row leaves the table. Reload the page: Old Pier Review is
     not listed (Rule 14).
   - **The journal gone**: open Old Pier Review's home page, its address
     carrying the noted path: "404 Not Found". The
     site's home page has no entry for Old Pier Review, and the journals
     switcher of the editorial header no longer offers it (Rule 14; Side
     effects).
   - **Rui**: signs in on the site's Login page: the site's home page
     opens. His Profile › "Roles" lists no role in Old Pier Review (Rule
     15).
   - **Nova**: signs in and opens her Profile: "Roles" lists her Author
     role in New Pier Review and none in Old Pier Review, and the Tasks
     panel of the editorial header no longer holds the "Discussion
     added." row (Rule 15; Side effects).
   - **No email**: the mail catcher has received no email since "OK" was
     pressed (Side effects).
   - **Control**: New Pier Review's row is still on Hosted Journals, and
     its home page opens (Rule 14). <sup>s</sup>

7. **The Settings Wizard**

   Given: Site Administrator, on a site hosting two scratch journals,
   "Bay Letters" (initials BL) and "Cape Letters" (initials CL), each
   with a country chosen.

   - **The page**: open Administration › "Hosted Journals", press the
     arrow at the start of Bay Letters' row and choose "Settings wizard":
     a page headed "Settings Wizard" opens, its trail reading
     "Administration" and "Hosted Journals", both links, then "Settings
     Wizard". Its tabs are "Journal Settings" ("Setup" on a press,
     "Server Settings" on a preprint server), with the side tabs
     "Journal" ("Press", "Server"), "Appearance", "Languages", "Search
     Indexing" and "Restrict Bulk Emails"; "Plugins", with "Installed
     Plugins" and "Plugin Gallery"; and "Users" (Rule 16).
   - **The "Journal" tab**: "Journal Settings" › "Journal" holds the
     journal form, Bay Letters in "Journal title" ("Press Name", "Server
     title"). Type BLQ in "Journal initials" ("Press Initials", "Server
     initials") and press "Save": "Saved" shows beside the button, and
     the page stays (Rule 17).
   - **A change not saved**: type Mara Voss in "Principal Contact Name",
     open "Users", then "Journal Settings" › "Journal" again: "Principal
     Contact Name" still reads Mara Voss. Press "Hosted Journals" in the
     trail: nothing is asked. Open Bay Letters' "Settings wizard" again:
     "Principal Contact Name" no longer reads Mara Voss, and "Journal
     initials" reads BLQ (Rule 17).
   - **The addresses**: open "Search Indexing": the page's address ends
     "#indexing"; reload the page: "Search Indexing" opens again. Open
     "Users": the address ends "#users"; reload: "Users" opens again.
     Open "Plugins": the address ends "#plugins"; reload: "Plugins" opens
     again. Press "Installed Plugins" and reload: "Journal Settings" ›
     "Journal" opens (Rule 18).
   - **Control**: open Cape Letters' "Settings wizard": "Journal
     initials" reads CL, the save having changed Bay Letters alone (Rule
     16). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Rarely met**:
  - exactly one journal enabled publicly, where the site's address opens
    that journal instead of the list (Rule 19; Settings bullet 4): a
    site hosting one public journal is met before a second one is
    enabled, not in an ordinary week of running a journal
  - "Order" absent while the site has one journal (Rule 1): the same
    one-journal site
- **Nothing new to test**:
  - the Settings Wizard's address with a number no journal has,
    answering "404 Not Found" (Rule 18)
  - every other signed-in account at the Hosted Journals and Settings
    Wizard addresses, which gets the access-denied page the Journal
    Manager of scenario 1 gets (Actors row 1)
  - leaving the page with values typed in "Create Journal", which drops
    them as closing the window does in scenario 2 (Rule 3)
- **Register carries it**:
  - A1 ("Country" left empty refused on the journal form; Fields;
    Rule 8)
  - A2 (the row keeping the old name and path until a reload; Rule 8;
    scenario 3 marks it)
  - A3 (the address in front of "Path"; Fields)
  - A4 (the Settings Wizard's saves and list actions failing after a
    path change; Rule 10)
  - A5 ({OJS OMP} the default "For Readers" and "For Authors" texts
    linking to the old path; Rule 10)
  - A6 ("Jump to next error" stuck on the first refused field; Rule 4;
    scenario 2 marks it)
  - A7 (the page's script failing when the "Edit" or "Create Journal"
    window is closed right after it opens; Rule 8)
  - A8 (signing in from the Login page of a journal not enabled
    publicly not leading on to the page asked for; Rule 11)
  - A9 ("Register" and "Home" reloading that Login page; Rule 11)
  - A10 ({OMP OPS} "Remove" failing on a press or preprint server that
    holds an institution; Rule 14)
  - OPS1 (the path "0" refused with a raw code on a preprint server;
    Fields)
- **No seed**:
  - no journal enabled publicly: "There are no journals available." in
    the list's place and the Site Administrator sent to Hosted Journals
    (Rule 19; Settings bullet 4), since every test install keeps the
    seeded journal enabled publicly
- **Owned by another feature**:
  - a journal's path in the address of Hosted Journals: "Access
    denied." for the Site Administrator, the role message or that
    journal's Login page for the rest (Actors row 1;
    *[System administration & jobs](U61-system-administration.md)*,
    scenario 1, on the Administration page)
  - the notice of a newer release on Hosted Journals (Rule 1;
    *[System administration & jobs](U61-system-administration.md)*)
  - the re-authentication window set: the Confirm Access gate before
    these pages (Settings bullet 8;
    *[Login & sessions](U01-login-and-sessions.md)*, Rule 16)
  - "Create Journal" on a site offering one language (Rule 7; Settings
    bullet 3; *[Languages & locales](U57-languages-and-locales.md)*, its
    A7)
  - the languages "Languages" and "Primary locale" set up for the new
    journal (Rule 6;
    *[Languages & locales](U57-languages-and-locales.md#journal-languages)*,
    Rule 8)
  - {OJS OMP} the new journal's default "For Readers" and "For Authors"
    texts, naming its address (Rule 6;
    *[Journal identity & about pages](U07-journal-identity-and-about-pages.md)*)
  - a journal taken off the site: its published items leaving the
    site-wide harvesting address, and coming back (Rule 11; Side
    effects; *[OAI-PMH](U19-oai-pmh.md)*, scenario 6)
  - a removed journal's published items read as deleted records at the
    site-wide harvesting address (Side effects;
    *[OAI-PMH](U19-oai-pmh.md)*, Rule 4b)
  - "Journal redirect" chosen (Rule 19; Settings bullet 5;
    *[Site settings](U60-site-settings.md)*, scenario 3)
  - "Journal thumbnail" set, topping the journal's entry in the list
    (Rule 20; Settings bullet 6;
    *[Appearance & theming](U10-appearance-and-theming.md)*, scenario 3)
  - the journal ticked under "Bulk Emails", and the wizard's "Restrict
    Bulk Emails" tab (Rule 16; Settings bullet 7;
    *[Notify users](U55-notify-users.md)*, scenarios 3 and 5)
  - the wizard's "Appearance" tab (Rule 16;
    *[Appearance & theming](U10-appearance-and-theming.md)*, scenario 2)
  - the wizard's "Languages" tab (Rule 16;
    *[Languages & locales](U57-languages-and-locales.md)*, scenario 2)
  - the wizard's "Search Indexing" tab (Rule 16;
    *[Search engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)*,
    scenario 5)
  - the wizard's "Plugins" tab (Rule 16;
    *[Plugins management](U62-plugins-management.md)*, scenario 4)
  - the wizard's "Users" tab (Rule 16;
    *[Users management](U53-users-management.md)*, scenarios 7 and 8)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | "Country" carries no Required mark, yet the journal form refuses to save without it | 🐞 | user-visible | — |
| [A2](#a2) | After "Save" in the "Edit" window, the list keeps the journal's old name and path until a reload | 🐞 | minor | — |
| [A3](#a3) | The address in front of "Path" is not the journal's real address | 🐞 | minor | — |
| [A4](#a4) | After a path change on the Settings Wizard, its further saves and list actions fail until a reload | 🐞 | minor | — |
| [A6](#a6) | "Jump to next error" never gets past the first refused field | 🐞 | minor | — |
| [A7](#a7) | Closing the "Edit" or "Create Journal" window right after it opens makes the page's script fail | 🐞 | invisible · crash: script | — |
| [A8](#a8) | Signing in from the Login page of a journal not enabled publicly does not lead on to the page the visitor asked for | 🐞 | minor | — |
| [A10](#a10) | A press or preprint server that holds an institution cannot be removed and is left half deleted {OMP OPS} | 🐞 | medium · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OPS1](#ops1) | The path "0" is refused with a raw code on a preprint server | 🐞 | minor | — |
| [A5](#a5) | A changed path leaves the default "For Readers" and "For Authors" texts linking to the old address {OJS OMP} | ❓ | minor | — |
| [A9](#a9) | On the Login page of a journal not enabled publicly, "Register" and "Home" load the Login page again | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "Country" is required but not marked** · 🐞 · user-visible.
The journal form marks "Journal title", "Journal initials", the principal
contact and "Path" as required and leaves "Country" unmarked, while the
journal's own Settings › Journal › "Masthead" marks the same field
required; a Site Administrator on this form expects to leave it empty.
"Save" with no country is refused with "This is not a valid string." and
"This is not a valid country." under "Country", on "Create Journal", on a
row's "Edit" and on the Settings Wizard's "Journal" tab. On a journal
that has no country (the seeded journal among them), nothing on "Edit"
can be changed, not even "Enable this journal to appear publicly on the
site", until one is picked.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The list shows the old name and path after "Edit"** · 🐞 · minor.
The Site Administrator changes a journal's title or path in the "Edit"
window, sees "Saved" and the window closes; the row still shows the old
name and the old path until the page is reloaded, so the list looks as if
the save did not take.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The address in front of "Path" is not the journal's address** · 🐞 · minor.
The form shows the site's base address and "/" in front of the "Path" box,
as if the journal's address were that followed by the path. On an
installation that keeps "index.php/" in its addresses, the application's
default and the test installs' setting, the journal's real address has
"index.php/" before the path, so the preview is wrong.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The Settings Wizard's saves fail after a path change** · 🐞 · minor.
The Site Administrator changes "Path" on the wizard's "Journal" tab and
sees "Saved". A second save on the same tab, or a save on "Appearance",
"Search Indexing" or "Restrict Bulk Emails", is then sent to the journal's
old address: the button shows "Saving" and then nothing, the page shows
"An unexpected error has occurred. Please reload the page and try
again.", and the change is not kept. The lists on the page fail the same
way: a "Languages" box and an "Installed Plugins" "Enabled" box change
nothing and show no message (on a press the plugin's box stays ticked
although nothing was stored), and "Users" › "Add User" shows "Error" with
the same sentence and "OK". After a reload each works.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A changed path leaves old links in the default texts** · ❓ · minor.
{OJS OMP} A new journal's default "For Readers" and "For Authors" texts
carry links to its Register, About and Author Guidelines pages written
with the path of the day it was created. After "Path" is changed, those
links lead to "404 Not Found" until a manager edits the texts, and
nothing on the form warns of it.
Question: should a path change update, or warn about, the texts that name
the old address? Lean: warn in the "Path" field's description; rewriting
texts a manager may have edited is riskier than the dead links.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — "Jump to next error" never gets past the first refused field** · 🐞 · minor.
After a refused "Save" with several errors on the journal form (every
field left empty, for one), "Jump to next error" beside "Save" scrolls to
the first refused field, "Journal title"; pressed again it stays there,
so the later ones ("Path", "Languages", "Primary locale") are never
reached this way.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Closing the journal form's window right after it opens makes the page's script fail** · 🐞 · invisible · crash: script.
The Site Administrator opens a row's "Edit" window, or the "Create
Journal" ("Create Press", "Create Server") window, and presses "Close"
within about 0.7 s of the form showing. The window closes as asked, and
a moment later the page's script fails: nothing on screen shows it or
changes. A window left open longer closes without the failure. A person
rarely closes that fast; an automated test does.
Basis: test run. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A journal not enabled publicly forgets the page a visitor asked for** · 🐞 · minor.
A signed-out visitor who opens an article, a file or the About page of a
journal not enabled publicly (an author or editor following a link
before the journal goes public, say) is sent to its Login page. After
signing in they expect that page, as on a journal closed by "Users must
be registered and log in to view the journal site.", where the sign-in
leads straight back to it. Instead a Journal Manager lands on the
Dashboard and a Reader on the journal's home page, and the page asked
for has to be found again (Rule 11).
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — "Register" and "Home" lead nowhere on the Login page of a journal not enabled publicly** · ❓ · minor.
The Login page a signed-out visitor meets at a journal not enabled
publicly offers "Register" in the header, "Register" under the form and
"Home" in the trail. Each loads the same Login page again with no
message, so a visitor who presses "Register" cannot tell why nothing
happens; only "Forgot your password?" leads on (Rule 11).
Question: should that Login page offer "Register" and "Home" at all?
Lean: hide them; a journal not yet public takes no registrations, and a
link that reloads the page it is on explains nothing.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A press or preprint server that holds an institution cannot be removed** · 🐞 · medium · crash: server.
{OMP OPS} The Site Administrator presses "Remove" and then "OK" on
Hosted Presses (Hosted Servers) for a press that holds an institution
and expects it deleted, as a journal with institutions and a press
without one are. The app fails on the server instead: the "Confirm"
window stays open with no message, every new try fails the same way,
the press stays listed, and it is left half deleted, with no roles
and its Settings pages closed even to the Site Administrator (Rule 14). The Institutions spec's
[A8](U66-institutions.md#a8) records the same failure from the
institutions' side.
Basis: probe, 2026-10-02. <sup>f-a10</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The path "0" is refused with a raw code** · 🐞 · minor.
A journal or press refuses the path "0" with "A path is required."; a
preprint server refuses it with the raw code
"##admin.contexts.form.pathRequired##" under "Path", because its language
files lack the message.
Basis: probe. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-27 on checkouts ojs `72b85f4ba0`, omp `3cd59e944`, ops
`e2111e3aae`, lib/pkp `26ae6431b5` (OJS) and `17a1f01fed` (OMP, OPS; every
lib/pkp file this spec cites is identical at both), ui-library `03d1cee2`.
No app overrides `PKP\controllers\grid\admin\context\ContextGridHandler`,
`ContextGridRow`, `PKP\pages\admin\AdminHandler`,
`templates/admin/contexts.tpl`, `editContext.tpl`, `contextSettings.tpl`
or `PKPContextController` (each app's `api/v1/contexts/index.php` mounts
lib/pkp's controller unchanged), so the shared claims rest on one code
path (multi-app rule 8). The app seams are each app's
`classes/components/forms/context/ContextForm.php` (the abbreviation and
the "Enable" label), `classes/services/ContextService.php` (the hooks on
add, edit, delete), `pages/index/IndexHandler.php` and
`templates/frontend/pages/indexSite.tpl`. The draft was written from the
code; every claim a screen reaches was then live-probed on 2026-09-27 on
all three apps, as the Site Administrator, as every other level and
signed out, on scratch journals with the seeded journal only read, and
each block below names what the probe saw. Every Settings Wizard and
Site Settings load answered a server error for the plugin gallery's list
(the Plugins management spec's A1); no other request failed, and no page
script error was seen beyond the Languages & locales spec's A7 (note c).
The suites' traced test runs of 2026-09-28 then caught this spec's own
A7 on the three apps (note f-a7).

<a id="fn-a"></a>
**a** — `AdminHandler::__construct()` assigns `contexts` and `wizard`
(with every other Administration op) to `ROLE_ID_SITE_ADMIN` alone;
`authorize()` adds `PKPSiteAccessPolicy`, `ReauthenticationRequiredPolicy`
(the Confirm Access gate) and returns false when the request carries a
context. The list itself is the grid `ContextGridHandler`, whose
constructor grants `fetchGrid`, `fetchRow`, `createContext`,
`editContext`, `updateContext`, `users`, `deleteContext` and
`saveSequence` to `ROLE_ID_SITE_ADMIN` alone. The journal form saves
through `PKPContextController`: `POST contexts` (create) and `DELETE
contexts/{id}` are grouped under `roleAuthorizer([ROLE_ID_SITE_ADMIN])`,
the reads and `PUT contexts/{id}` under site admin and manager (the
journal's own Settings use the latter, behind `CanAccessSettingsPolicy`;
the Journal identity spec's settings-access note). `add()` and `delete()`
answer only at the site's address, `edit()` only at a journal's. The
Administration gate as a whole was live-probed by the System
administration spec (its note a). Actors row 5 is Rule 20's audience.
Live-probed 2026-09-27 (Actors rows 1–5): note td1.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Actors rows 1–5), three apps. As the
Journal Manager, an Editor (OJS, OMP), a Section Editor, an Assistant, a
Copyeditor (OPS), a Reviewer (OJS, OMP), an Author and a Reader, the
site's address followed by "admin/contexts" and by "admin/wizard/1" went
to `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
"The current role does not have access to this operation."; signed out,
to the Login page; the Site Administrator reached both with no Confirm
Access form. With "publicknowledge" in place of "index", the Site
Administrator got "Access denied.", the other accounts the role message,
and a signed-out visitor publicknowledge's Login page. A Journal
Manager's Settings › Journal held "Masthead", "Contact", "Sections"
("Series" on a press) and "Categories", with no "Path", "Enable" or
removal. The site's home page listed the same journals signed out and as
a Reader.

<a id="fn-c"></a>
**c** — `ContextGridHandler::createContext()` calls `editContext()` with no
`rowId`: the form posts to the site-wide `contexts` API, its languages are
`$request->getSite()->getSupportedLocaleNames()`, and
`$contextFormConfig['editContextUrl']` is the wizard's address with
`__id__`; `admin/editContext.tpl` then renders `<add-context-form>`
(`lib/ui-library/src/components/Form/context/AddContextForm.vue`, in
`AddContextContainer.vue`), whose `success()` sets `window.location.href`
to that address with the new id. The window is an `AjaxModal` titled
`admin.contexts.create` ("Create Journal" / "Create Press" / "Create
Server", each app's `locale/en/admin.po`) with `closeOnFormSuccessId`
`context`. Fields: `PKPContextForm::__construct()` adds `name`
(`manager.setup.contextTitle`: "Journal title", "Press Name", "Server
title"), `acronym` (`manager.setup.contextInitials`: "Journal initials",
"Press Initials", "Server initials"; `isRequired`), `contactName` and
`contactEmail` (`manager.setup.principalContact` "Principal Contact" + a
space + `common.name` "Name" / `user.email` "Email address"; both
`isRequired`), `country` (`FieldSelect`, `common.country`, description
`manager.setup.selectCountry`, options `Locale::getCountries()` sorted by
local name; not `isRequired`), `description`
(`admin.contexts.contextDescription`: "Journal description", "Press
description", "Server description"; `FieldRichTextarea`), `urlPath`
(`context.path` "Path", `isRequired`, `prefix` `$baseUrl . '/'`), and,
only when `!$context && count($locales) > 1`, `supportedLocales`
(`common.languages` "Languages", checkboxes) and `primaryLocale`
(`locale.primary` "Primary locale", radio), both `isRequired`. The apps'
`ContextForm` subclasses add, OJS and OPS, `abbreviation`
(`manager.setup.journalAbbreviation` "Journal Abbreviation",
`manager.setup.serverAbbreviation` "Server Abbreviation") after
`acronym`, and in all three `enabled` (`common.enable` "Enable", one
option: OJS `admin.journals.enableJournalInstructions`, OMP
`manager.setup.enablePressInstructions`, OPS
`admin.contexts.enableContextInstructions`), value `false` for a new
journal. `FormComponent::getConfig()` puts every field in one default
group with a `common.save` "Save" button. A one-language site: the
Languages & locales spec's note g and its A7 (probed 2026-09-27).
Live-probed 2026-09-27 (Rules 3, 7), three apps: the window headed
"Create Journal" ("Create Press", "Create Server") opened empty, with
English boxes and a "French" button for the French ones. A French title
typed on a new journal was kept (Hosted Journals read in French showed
it), while its "Edit" and wizard "Journal" tab offered English boxes
alone: French was ticked under "UI", not under "Forms". With French
disabled on the site, the create form showed neither "Languages" nor
"Primary locale", and the saved journal had English as primary, under
"UI" and "Forms"; filling that form raised the Languages & locales
spec's A7 script error ("Cannot read properties of undefined (reading
'includes')") six times, and the save went through. Closing the window
with values typed, and leaving the page by its address: note td3.

<a id="fn-d"></a>
**d** — `PKPContextService::validate()`: the schema's required props
(`lib/pkp/schemas/context.json` `required`: `name`, `primaryLocale`,
`supportedLocales`, `urlPath`, `contactName`, `contactEmail`; no overlay
adds any) through `ValidatorFactory::required()`; `acronym` is required
by the form alone (`isRequired`, so an empty box is refused in the
browser before sending). `country` carries the schema validation
`["country"]` without `nullable`, so an empty choice fails the string and
country rules: `validator.string` "This is not a valid string." and
`validator.country` "This is not a valid country.". `contactEmail`:
`email_or_localhost` → `validator.email` "This is not a valid email
address.". `urlPath`: the regex
`^[a-zA-Z0-9]+([\-_][a-zA-Z0-9]+)*$` → `admin.contexts.form.pathAlphaNumeric`;
an existing path (`ContextDAO::getByPath()`) → `admin.contexts.form.pathExists`
(OJS "The path you provided is already in use by another journal.", OMP
"The selected path is already in use by another press.", OPS "The path
you provided is already in use by another server."); `urlPath == '0'` →
`admin.contexts.form.pathRequired` "A path is required." (OJS, OMP; OPS
lacks the key, OPS1); a primary locale outside the ticked languages →
`admin.contexts.form.primaryLocaleNotSupported`. The footer line is the
form's `form.errorOne` "Please correct one error." / `form.errorMany`
"Please correct {$count} errors.". Sightings (seed-facts "Install
defaults"): the create form requires "Languages" and "Primary locale"
(2026-09-23, U07 claim check K2); "Save" without a country refused with
both messages (2026-09-27, U57 claim check K2); "Edit" refused with
"Please correct one error." and "Go to Journal initials: This field is
required." until the initials were typed, then with the two country
messages (2026-09-26, U20 claim check K1).
Live-probed 2026-09-27 (Fields; Rule 4): note td3.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Fields; Rules 3–4), three apps, the
refusals twice each. Empty title, initials, contact name and email,
"Languages" and "Primary locale" (none ticked when the window opened)
were refused with "This field is required." and nothing was sent ("Please
correct 7 errors." with all empty). "x" as the email; "a b", "-ab", "ab-",
"a.b", "a/b", "publicknowledge" and "0" as the path; no country; and a
primary locale not ticked were each sent and refused (400) with the
Fields messages, under the field, and the notice "The form was not saved
because 1 error(s) were encountered. …" at the top right; no journal was
created. "AB_c-1" was accepted. The line beside "Save" held "Please
correct {n} errors." and "Jump to next error"; the "Go to {field}:
{message}" buttons (`form.errorA11y`) sat in a screen-reader-only list.
"Save" stayed disabled after a refusal until a refused field changed.
Test runs 2026-09-28 (scenario 2, three apps; the first OJS and OMP
runs, asserting "Save" enabled at that point, failed there): after the
all-empty refusal, typing the English title and initials ("Journal
title"/"Journal initials", "Press Name"/"Press Initials", "Server
title"/"Server initials") removed those two messages, while those under
"Principal Contact Name", "Principal Contact Email address", "Path" and
"Languages" stayed and "Save" stayed disabled (on OJS and OMP rendered
disabled for the whole 10 s wait); it was enabled once every refused
field had been changed. The ui-library's `FormPage.vue` disables the
button while the form holds any error (`isSaving || !canSubmit ||
(isLastPage && !!Object.keys(errors).length)`), and `Form.vue`'s
`removeError()` drops only the changed field's.
With "Primary locale" French and only the French title and initials
typed, "This field is required." stood under both English boxes and
nothing was sent; the same with the page read in French ("Ce champ est
requis."). The "Country" list: 249 names, nothing selected, no blank
option, accented names after their plain neighbours ("Czechia" then "Côte
d'Ivoire", "Rwanda" then "Réunion", "Tuvalu" then "Türkiye", "Åland
Islands" last). Closing the window with values typed asked nothing and it
reopened empty; leaving by the address bar raised no browser question.
The sighting of 2026-09-04 (a refused create with no message) did not
recur.

<a id="fn-g"></a>
**g** — Shared values: `PKPMastheadForm` (Settings › Journal ›
"Masthead") carries `name`, `acronym`, `country` and `description`
(`manager.setup.contextSummary` "Journal Summary", "Press Summary",
"Server Summary"), and OJS's and OPS's `MastheadForm` add `abbreviation`;
`PKPContactForm` ("Contact") carries `contactName` and `contactEmail`.
All save through `PUT contexts/{id}` on the journal's address, as the
"Edit" window and the wizard's tab do, into the same context settings.
Neither Settings form carries `urlPath` or `enabled`, and nothing on a
journal's Settings removes it.
Live-probed 2026-09-27 (Rule 9; Actors row 4): note td6.

<a id="fn-m"></a>
**m** — The site's home page: each app's `IndexHandler::index()` without
a journal assigns `journals` / `presses` / `servers` as
`getAll(true)` (enabled only, `ORDER BY seq`) and renders
`templates/frontend/pages/indexSite.tpl`: the highlights, `.about_site`,
the announcements, then a heading `context.contexts` ("Journals",
"Presses", "Servers") and one `<li>` per context: the thumbnail
(`journalThumbnail` / `pressThumbnail` / `serverThumbnail`, `{if
$thumb}`) linked to the context's home, an `<h3>` link with
`getLocalizedName()`, `.description` with `getLocalizedDescription()`
when set, and `.links`: `site.journalView` "View Journal" ({OJS}, plus
`site.journalCurrent` "Current Issue" to `issue/current`),
`site.pressView` "View Press Website", `site.serverView` "View Server".
`pageTitleTranslated` is the site's title (Site settings, Rule 7).
Live-probed 2026-09-27 (Rule 20; Actors row 5): note td13.

<a id="fn-b"></a>
**b** — `AdminHandler::contexts()` sets the trail (`navigation.admin`
"Administration" as a link, then `admin.hostedContexts`: OJS "Hosted
Journals", OMP "Hosted Presses", OPS "Hosted Servers") and the page title,
and `templates/admin/contexts.tpl` loads the grid (after the newer-release
notice). `ContextGridHandler::initialize()`: title `context.contexts`
("Journals", "Presses", "Servers"), the action `createContext`
(`admin.contexts.create`), columns `name` (`common.name` "Name") and
`urlPath` (`context.path` "Path"); `initFeatures()` returns
`OrderGridItemsFeature` alone (no paging feature), which adds the grid
action `grid.action.order` "Order", hidden by
`OrderItemsFeature.js` while the grid holds one row or fewer. `loadData()` is
`ContextDAO::getAll()` (every context, `ORDER BY seq`).
`ContextGridCellProvider`: `getLocalizedName()` (current language, then
the primary one), `common.untitled` "Untitled" when empty, and
`getPath()`. `ContextGridRow::initialize()` adds `edit`
(`grid.action.edit` "Edit"), `delete` (`grid.action.remove` "Remove")
and `wizard` (`grid.action.wizard` "Settings wizard", a
`RedirectAction` to `admin/wizard/{id}` at the site's address). Where the
row's arrow and its screen-reader name come from: the Users management
spec, Rule 20, and the Appearance & theming spec, Rule 34, describe the
same legacy row. Live-probed 2026-09-27 (Rules 1–2): note td2.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Rules 1–2), three apps. Trail
"Administration" (a link), "Hosted Journals" ("Hosted Presses", "Hosted
Servers"); heading "Journals" ("Presses", "Servers"); columns "Name" and
"Path"; "Create Journal" ("Create Press", "Create Server") above the
table. With 14 and with 66–67 journals every journal was listed, disabled
ones included, in the stored order, with no paging and no count line; a
disabled row was built like an enabled one; no newer-release notice on
the test installs. "Order" was absent while the site held one journal (a
freshly reset install) and present from two. Read in French, a journal
with a French name showed it and one without its English name. A row's
arrow (screen-reader name "Settings") showed "Edit", "Remove" and
"Settings wizard". "Order", "Cancel ordering", a row's arrow and "Edit"
raised no page script error on any app. The "clientWidth" error sighted
on 2026-09-26 did not recur on that probe's "Close"s; the test runs of
2026-09-28 raised it on every "Close" pressed within about 0.7 s of the
window's form showing (A7, note f-a7).

<a id="fn-e"></a>
**e** — `PKPContextService::add()`: fills `primaryLocale` and
`supportedLocales` from the site's when the form sent none; applies the
schema defaults with `localeParams` (`indexUrl`, `contextPath`,
`contextUrl`, `submissionGuidelinesUrl`…), so `readerInformation`
(`default.contextSettings.forReaders`) and `authorInformation`
(`default.contextSettings.forAuthors`) are stored with links built from
`{$indexUrl}/{$contextPath}` (each app's `locale/<lang>/default.po`);
sets `supportedFormLocales` to the primary locale; inserts the context
with `setSequence(REALLY_BIG_NUMBER)` and `ContextDAO::resequence()`
(so it is last); installs genres, the user groups of
`registry/userGroups.xml`, the navigation menus, the alternate email
templates and contributor roles; creates a `UserUserGroup` for the
current user in the default manager group with `dateStart` null; loads
every plugin; calls `Context::add`. `PKPContextController::add()` then
calls `Repo::editorialTask()->installTaskTemplates()`. App hooks
(`afterAddContext`): OJS adds the default reviewer recommendations and
one section `section.default.title` "Articles"; OPS one section
"Preprints"; OMP only its chapter contributor roles, no series. No
mailable is sent. `ContextGridHandler::getPublishChangeEvents()` returns
`updateHeader` (the switcher); `PKPSiteBulkEmailsForm` lists every
context through `getManySummary()`. Sightings: scratch contexts, made by
the same service acting as the Site Administrator, enrol it as a manager
with an empty start date (seed-facts, 2026-08-25 and 2026-09-25); a
journal created on Hosted Journals has the principal contact typed and no
technical support contact, and is not enabled when the box was left
unticked (seed-facts, 2026-09-23 and 2026-09-27).
Live-probed 2026-09-27 (Rules 5–6; Side effects, creating): note td4;
a journal created on screen joined the Site Administrator's journals
switcher and Site Settings' "Bulk Emails" list at once, and the site's
home page once "Enable…" was ticked and saved.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rules 5–6), three apps. A journal
created with "Enable…" unticked landed the browser on its "Settings
Wizard" with the "Journal" tab filled in as typed, stood last on Hosted
Journals and in the site's order, was absent from the site's home page,
and its own address sent a visitor to its Login page; one created with
the box ticked was listed on the site's home page at once, with its
description. Its Users & Roles listed the Site Administrator as "Journal
manager" ("Press manager", "Preprint Server manager") with an empty start
date; "Contact" held the typed principal contact and an empty technical
support contact; "Sections" held "Articles" (OJS) or "Preprints" (OPS),
and "Series" read "No Items" (OMP). On OJS and OMP "For Readers" and "For
Authors" linked to `…/index.php/{path}/user/register`, `…/{path}/about`
and `…/{path}/about/submissions#authorGuidelines`; on OPS those pages
answered "404 Not Found".

<a id="fn-f"></a>
**f** — `ContextGridRow`'s `edit` opens `editContext` with the `rowId`:
the form posts `PUT` to `contexts/{id}` at the journal's own address, its
languages are `$context->getSupportedFormLocaleNames()`, and
`editContext.tpl` renders a plain `<pkp-form>` (no languages fields,
since `PKPContextForm` adds them only without a context). The window is
an `AjaxModal` titled `grid.action.edit` "Edit" with
`closeOnFormSuccessId` `context`: `ModalHandler::onFormSuccess_()`
closes it shortly after the form's `form-success` event (about a
second after "Saved" on screen). Nothing
publishes `dataChanged` to the grid on that path (the grid refreshes on
`dataChanged`, `GridHandler.js`), so the row is not refetched (A2). The
seeded journal has no country: the bootstrap payload sets none
(scenarios.md, `POST bootstrap` keys), and a scratch journal has one only
when seeded with `context.country` (seed-facts, 2026-09-23).
Live-probed 2026-09-27 (Rule 8): note td5.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rule 8; A1, A2), three apps. "Edit"
opened a window headed "Edit" with the form minus "Languages" and
"Primary locale", filled with the journal's values; a journal with
English alone under "Forms" showed one box per field, one with English
and French also a "French" button and the French boxes. After "Save",
"Saved" showed about 0.4 s after the click and the window was gone about
1.3 s after it; the row kept its old name, and after a path change its
old path, until a reload. A scratch journal seeded without a country was
refused with the two "Country" messages, "Please correct one error." and
the notice at the top right, and with "Enable…" then unticked "Save"
stayed disabled; with "Iceland" picked the save went through. Scratch
journals seeded with a country saved at once; the seeded journal's
"Edit" opened with "Country" blank (read, never saved). The refusals of
Rule 4 recurred on "Edit", OPS's raw code for "0" included. "Close" with
a change typed asked nothing, and the window reopened with the saved
values.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rule 9; Actors row 4), three apps.
The title, abbreviation ({OJS OPS}), "Principal Contact Name" and
description saved in "Edit" showed on the wizard's "Journal" tab and,
for the journal's own Journal Manager, on "Masthead" (the description as
"Journal Summary", "Press Summary", "Server Summary") and "Contact". A
"Journal Summary" saved on "Masthead" showed as "Journal description" in
the wizard and in "Edit" the next time each opened.

<a id="fn-h"></a>
**h** — The journal's address segment is its `urlPath`, looked up by
path on every request (`ContextDAO::getByPath()`): a page request for an
unknown path throws `NotFoundHttpException` (`PKPHandler::getTargetContext()`),
an API request answers `api.404.resourceNotFound`
(`SetupContextBasedOnRequestUrl`). The stored default texts keep the
path they were built with (note e). `AdminHandler::wizard()` builds the
"Journal" tab's, "Appearance"'s (`contexts/{id}/theme`), "Search
Indexing"'s and "Restrict Bulk Emails"' form actions once, from
`$context->getPath()` at page load, so after a path change they point at
an address that no longer exists (A4).
Live-probed 2026-09-27 (Rule 10): note td7.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 10; A4, A5), three apps. After
"Path" was changed and saved in "Edit" on a journal enabled publicly with
a published item, signed out, the old home and item pages answered "404
Not Found" and the new ones opened. At the new path, on OJS and OMP, "For
Readers" linked "Register" and "Privacy Statement", and "For Authors"
"About the Journal" ("About the Press"), "Author Guidelines" and
"register", to the old path; "Register" answered "404 Not Found"; the
"Path" box carries no description or warning. On OPS the Information
pages answer "404 Not Found" at any path. On the Settings Wizard, after
"Path" was saved ("Saving", "Saved"), the "Journal" tab's,
"Appearance"'s, "Search Indexing"'s and "Restrict Bulk Emails"' saves
went to `{old path}/api/v1/contexts/{id}` (`…/theme`), answered 404,
showed "Saving" for about 0.1 s and the notice, and stored nothing; a
"Languages" box (`manage-language-grid/save-language-setting`) and an
"Installed Plugins" "Enabled" box (`settings-plugin-grid/enable`)
answered 404 with no message, and "Add User" (`user-grid/add-user`) the
"Error" dialog. After a reload every one went to the new path and was
stored ("Locale settings saved.", "The plugin "Browse Block" has been
enabled.", the "Add User" window).

<a id="fn-i"></a>
**i** — `enabled` is read by `ContextDAO::getAll(true)` (the site's home
page), by `PKPHandler::getTargetContext()` (the one-journal redirect) and
by the page gate the Journal identity spec's Rule 22 describes. Each
app's `afterEditContext()` inserts tombstones for the published items
when `enabled` goes off and deletes them when it comes back (the OAI-PMH
spec's Rule 16b, probed there). The grid lists every context whatever
`enabled` holds (note b), and `AdminHandler::wizard()` loads any context.
Live-probed 2026-09-27 (Rule 11; Side effects, enabling): note td8.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rule 11), three apps. Unticked and
saved in "Edit", a journal with a published item left the site's home
page; signed out, its home, item and About pages landed on its Login
page ("Login | {journal}"); its row stayed, "Edit" opened with the box
unticked, and the Settings Wizard opened; the Site Administrator and its
own Journal Manager still opened its home page. The item's site-wide
harvesting record read `status="deleted"` while the box was unticked and
came back with its original datestamp once it was ticked again, when the
site's home page listed the journal again.
Live-probed 2026-09-29 (Rule 11; A8, A9), three apps, two runs each, on
a scratch context seeded not enabled, holding one published item with a
file ({OJS} in a published issue), and a control context enabled with
"Users must be registered and log in to view the journal site." ("…the
press site.", "…the server site.") ticked. Signed out, the first's home,
About, item and file pages, {OJS} the issue and {OMP} a version and a
chapter each went to `{path}/login` with no `source`, the form's hidden
`source` empty. Signing in there, its Journal Manager (from the item)
landed on `dashboard/editorial?currentViewId=assigned-to-me`
("Submissions | {journal}") and its Reader (from About and from the
file) on `{path}/index`. The control's same addresses went to
`login?source=%2Findex.php%2F{path}%2F…`, and the same sign-ins returned
to the item, About and the file; on OMP the file then failed to show as
the Monograph landing page spec's A9 records. On the first Login page
"Register" (the header's and the form's) and the trail's "Home" loaded
`{path}/login` again ("Login | {journal}") and "Forgot your password?"
opened "Reset Password"; on the control's, "Register" opened "Register |
{journal}" and "Home" the Login page with `source` set. The seeded
journal's About opened signed out.

<a id="fn-j"></a>
**j** — `OrderGridItemsFeature` (over `OrderItemsFeature`): the grid
action "Order", a drag handle per row (`moveItem`), and
`templates/controllers/grid/feature/gridOrderFinishControls.tpl` with
`common.done` "Done" and `grid.action.cancelOrdering` "Cancel ordering";
"Done" posts `saveSequence`, which gives each row the first row's
sequence plus its new position (`ContextGridHandler::setDataElementSequence()`
→ `ContextDAO::updateObject()`). The sequence orders `ContextDAO::getAll()`
(the grid, the site's home page, and `RegistrationHandler`'s site-level
journal list, `getAll(true)`). The journals switcher is built from
`getManySummary()` (`ORDER BY seq`), so it follows the same order. The
Sections spec's Rule 4a describes the same controls on another grid.
Live-probed 2026-09-27 (Rules 12–13): note td9.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rules 12–13), three apps. "Order"
turned every row into a drag handle, hid the rows' arrows and added
"Done" and "Cancel ordering"; meanwhile "Order" and "Create Journal" were
disabled and opened nothing. A row dragged above another and "Done" kept
the order on the page and after a reload; the site's home page, the
site-level Register page (the site's address followed by
"user/register") and the journals switcher then listed the two in that
order, the switcher listing every journal in the site's order, not by
name. "Cancel ordering" put the rows back with their arrows; a drag
followed by a reload returned the kept order.

<a id="fn-k"></a>
**k** — `ContextGridRow`'s `delete` is a `RemoteActionConfirmationModal`
(title `common.confirm` "Confirm", `common.ok` "OK", `common.cancel`
"Cancel", text `admin.contexts.confirmDelete` "Are you sure you want to
permanently delete {$contextName} and all of its contents?" with the
localized name) posting `deleteContext`, which checks the request token
and calls `PKPContextService::delete()`, then answers a data-changed
event that drops the row. `delete()`: announcement types, review
assignments, user groups (and with them every user's roles there),
genres, announcements, highlights, institutions, email templates
(`restoreDefaults`), plugin settings, review forms, navigation menus and
items, the context's files directory, the context; app hooks: OJS
(`beforeDeleteContext` tombstones, genres; `afterDeleteContext`
sections, issues, reviewer recommendations, subscriptions and
subscription types, submissions, public files), OMP (tombstones for the
formats; series, submissions, features, new releases, public files), OPS
(`afterDeleteContext` sections, submissions, public files; its
`beforeDeleteContext` is never registered, so no tombstones: the OAI-PMH
spec's OPS4). No user record is deleted. No mailable or notification is
created by `add()`, `edit()`, `delete()` or `saveSequence`.
Live-probed 2026-09-27 (Rules 14–15; Side effects, removing): note
td10; the removed journal also left the journals switcher, and its task
left the Site Administrator's Tasks panel ("Tasks 3" became "Tasks 2").

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 (Rules 14–15), three apps. "Remove"
opened "Confirm" with "Are you sure you want to permanently delete {name}
and all of its contents?", "OK" and "Cancel"; "Cancel" left the row, on
the page and after a reload; "OK" took the row out at once and after a
reload, the site's home page dropped the journal, and signed out its
home, item and About pages answered "404 Not Found". A throwaway account
whose only role was Author there signed in and landed on the site's home
page, its Profile › "Roles" offering no role in the removed journal; one
that was Author there and in another journal kept that role. The item's
site-wide harvesting record read deleted on OJS and OMP; on OPS it
answered "idDoesNotExist". The rest of Side effects' list rests on note
k, since every address of the journal answers "404 Not Found".
Live-probed 2026-09-29 (Rule 14; Side effects, removing; A10), three
apps, two runs each and a third removal pair per app, on scratch contexts
holding one institution and a control holding none. OJS: "OK" answered
200, the row went at once and after a reload, the database kept no
journal, institution or role of it, and its Settings, Institutions and
Users & Roles addresses and its home page answered "404 Not Found". OMP
and OPS: "OK" answered 500 on
`POST index/$$$call$$$/grid/admin/context/context-grid/delete-context?rowId={id}`;
the "Confirm" window stayed open with its question, no message, page
notice or browser dialog; its "Cancel" closed it and the row stayed, on
the page and after a reload. The database kept the press (server) and
its institution with no user groups. As the Site Administrator its
Settings › Press (Server), Institutions and Users & Roles addresses
answered the access-denied page; its home page opened (200, its name as
title) for the Site Administrator and signed out. Its row's "Settings
wizard" opened "Settings Wizard" with its name in the form (the Plugin
Gallery's list failing as the Plugins management spec's A1 records). A
second "Remove" › "OK" answered 500 again, with the same open window and
the row kept. The control without an institution was removed (200,
"404 Not Found" afterwards).

<a id="fn-l"></a>
**l** — `AdminHandler::wizard()`: `$args[0]` must be digits and name an
existing context, otherwise `NotFoundHttpException`; the trail is
"Administration", `admin.hostedContexts` (a link) and
`manager.settings.wizard` "Settings Wizard", the page title the same.
`templates/admin/contextSettings.tpl`: heading `manager.settings.wizard`;
`<tabs :track-history="true">` with `setup` (`manager.setup`: OJS
"Journal Settings", OMP "Setup", OPS "Server Settings") holding side tabs
`context` (`context.context` "Journal", "Press", "Server"; the
`PKPContextForm`), `appearance` (`manager.website.appearance`),
`languages` (`common.languages`), `indexing`
(`manager.setup.searchEngineIndexing` "Search Indexing") and
`restrictBulkEmails` (`admin.settings.restrictBulkEmails`; the form only
`{if $bulkEmailsEnabled}`, else
`admin.settings.disableBulkEmailRoles.contextDisabled` with a link to
Site Settings); `plugins` (`common.plugins`) with `installed` and
`gallery` (`{if $canSeePluginGallery}`,
`PluginHelper::isGalleryAllowed()`); `users` (`manager.users`, the
legacy `UserGridHandler`). The journal's name is not printed on the page
outside the form's values. The Appearance & theming spec's Rule 34 lists
the same tabs (probed there).
Live-probed 2026-09-27 (Rules 16–18): notes td11 and td12.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Rules 16–17), three apps. "Settings
wizard" opened `index/en/admin/wizard/{id}`: heading "Settings Wizard",
browser title "Settings Wizard | Open Journal Systems" ("… Open Monograph
Press", "… Open Preprint Systems"), trail "Administration" and "Hosted
Journals" as links, then "Settings Wizard"; the journal's name stood
nowhere outside the "Journal" tab's fields. The tabs of Rule 16's table
showed. A "Search Indexing" description saved there showed on that
journal's own Settings and not on the seeded journal's; "Users" listed
that journal's users. The "Journal" tab held the "Edit" form; "Journal
initials" saved showed "Saving", then "Saved", the address stayed and the
value was stored. A typed "Search Indexing" description was still there
after a visit to "Users"; leaving for Hosted Journals asked nothing and
dropped it.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Rule 18), three apps. Each tab's
address as Rule 18 lists it; a reload reopened each "Journal Settings"
side tab, "Plugins" and "Users", and after "Installed Plugins" or "Plugin
Gallery" it opened "Journal Settings" › "Journal"; a typed address ending
in "#indexing" or "#users" opened that tab. The address with 999999, with
"abc" or with no number opened "404 Not Found".

<a id="fn-n"></a>
**n** — `PKPHandler::getTargetContext()` at the site's address counts
`getAll(true)`: one → that context (each app's `IndexHandler::index()`
redirects to it); two or more → the site redirect, if any. Live-probed
2026-09-27 (Rule 19; Settings bullets 4–5), three apps: on a freshly
reset install holding the seeded journal alone, the site's address, the
bare base address and `index.php/index/index` opened `publicknowledge/en`
for a visitor, a Reader and the Site Administrator, and still did with a
second journal not enabled publicly; with five enabled they opened the
site's home page. "Journal redirect" ("Press redirect", "Server
redirect") set to one journal sent every one of those addresses there,
signed out and as the Site Administrator; blank again, the home page
returned.

<a id="fn-o"></a>
**o** — Read from the code: with no journal enabled publicly,
`getTargetContext()` sets `$hasNoContexts` and `IndexHandler::index()`
redirects a site administrator to `admin/contexts`; the empty list's text
is `site.noJournals` / `site.noPresses` / `site.noServers`. Reaching it
needs the seeded journal disabled, which the checks never do.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Rule 20; Settings bullets 2, 6),
three apps. The heading "Journals" ("Presses", "Servers") stood over one
entry per journal enabled publicly, in the site's order (creation order,
not by name; it followed "Order" and back); a disabled journal was
absent. Each entry, top to bottom: the thumbnail once one was set (an
image link to the journal's home page, its alternate text as
description), the name link, the summary where set and nothing where
not, "View Journal" ("View Press Website", "View Server"), and {OJS}
"Current Issue" on every entry, leading to "Vol. 1 No. 1 (2026)" on a
journal with a published issue and to the page headed "No Current Issue"
on one without. The name, the thumbnail and "View …" opened the
journal's home page. "About the Site", when set, stood directly above
the list; with site announcements on, the announcements did; with
neither, the list stood alone. The list was the same signed out, as a
Reader, as a Journal Manager and as the Site Administrator. With no Site
Name the browser title and heading were empty; with one saved, both read
it.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-27 (Side effects), three apps. From
before "Create Journal" to the end of the create, the edits, enabling
and disabling, the reorder and two removals, the mail catcher received
nothing and the Site Administrator's Tasks panel gained no entry; the
positive control, the site's "Forgot your password?" for a scratch
account, arrived at once ("Password Reset Confirmation"). The mail
catcher was read by time rather than emptied, since another check was
reading it.

<a id="fn-p"></a>
**p** — `[security] password_timeout` in the configuration file
(commented out in `config.TEMPLATE.inc.php` and the test installs'
`config.test.inc.php`, so 0, off) sets the window
`ReauthenticationRequiredPolicy` enforces (the Login & sessions spec,
Rule 16). Live-probed 2026-09-27: no Confirm Access form before Hosted
Journals or the Settings Wizard on any app. The window set is read from
the code, since the configuration is shared by every test. The wizard's
"Plugin Gallery" tab is not a setting here: `PluginHelper::getCapabilities()`
keeps `canSeeGallery` true on every install policy (the Plugins
management spec, Settings bullet 1), and the tab showed on all three
apps.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS, the
{OJS} steps of scenario 4 on OJS alone. The Site Administrator is the
installer's `admin` (password `admin`, `docs/process/users.md`; "admin
admin" on screens, the row scenario 2 reads on Users & Roles). Scratch
journals (presses, preprint servers) come from `POST scenarios/context`
with `enabled` (default true), `country` (a two-letter code, `CA`),
`acronym`, `description` and throwaway `users[]` (password the username
twice, email `<username>@mail.test`); a scratch journal a scenario edits
is seeded with a country, which "Edit" and the wizard's "Journal" tab
otherwise refuse (A1). Every path and name a scenario seeds or types
carries the test's tag (`harbourreview` stands for
`harbourreview<tag>`), since a fleet keeps every journal a run leaves. A
created or scratch journal takes the next place in the site's order, so
it stands at the end of the table. Where they run: scenario 5 carries
`@solo`, because "Done" rewrites the whole site's order as the page
loaded it, so a reordering test runs alone. Live-probed 2026-09-27:
"Done" posted every row's id in the table's order, the disabled
journal's included. Every other scenario runs in the serial project:
each creates, changes or removes journals that join or leave the
site-wide lists other tests read (the site's home page, Hosted Journals,
the journals switcher, Site Settings' "Bulk Emails"), and the serial
pass starts on a freshly reset fleet (`harness.md` "Project chain"),
where those lists hold a few journals, not the app pass's hundreds.
Addresses: Hosted Journals `index/admin/contexts`, the wizard
`index/admin/wizard/{id}`, the site's home page `index/index`, its Login
page `index/login`, a journal's home page `{path}` (all under
`index.php/`). A scenario's scratch journal enabled publicly beside
`publicknowledge` is what makes the site's address open the list
(Rule 19). The no-email checks (scenarios 2 and 6) read Mailpit by time
from the action, for any recipient, since Mailpit is shared and never
emptied, and pair the silence with a positive control taken the same
way: a "Forgot your password?" request for a throwaway account arrives
(PRINCIPLES A8), as in the probe of note td14. Scenario 1: `dunereview`
with a `manager`, `marshreview` with `enabled: false`. Scenario 2:
`tide` enabled, with an English name only; French is the fleets' second
site language (`fr_CA`), its boxes behind the form's "French" button
(note td3); the typed paths `harbourreview` and `harbournotes`, and the
in-use refusal on `publicknowledge`, read only. Scenario 3: `sealetters`
with `acronym: 'SL'`, `country` and a `manager`. Scenario 4:
`riverreview` created first, with `description`, `country` and {OJS}
`issues: [{volume: 1, number: 1, year: <this year>, published: true}]`;
`hillnotes` second, with none. Scenario 5: `northpapers` then
`southpapers`. Scenario 6: `oldpierreview` with Rui Tanaka and Nova
Reyes as `author`s and a `manager`; `newpierreview` naming Nova again
with `roles: ['author']` (the account exists, so the role is added);
`POST scenarios/submission` in `oldpierreview` with Nova as `submitter`
and one `tasks[]` discussion created by the manager, `participants` the
manager and Nova, which gives Nova her "Discussion added." row; her
Tasks panel is read by that row, never by count. Scenario 7: `bayletters`
and `capeletters` with `acronym` `BL` and `CL` and a `country` each.

<a id="fn-f-a1"></a>
**f-a1** — Note d: `country` has no `nullable` in
`lib/pkp/schemas/context.json`, while `PKPContextForm` does not mark the
field `isRequired`. Seen refused on "Create Journal" (2026-09-27, U57
claim check K2) and on "Edit" (2026-09-26, U20 claim check K1), all
three apps. The Journal identity spec's A11 records the "Edit" side; the
full entry is here, the form's home.
Live-probed 2026-09-27, three apps: refused on "Create Journal", on
"Edit" of a scratch journal seeded without a country and on its wizard
"Journal" tab, each with the two messages; the seeded journal's "Edit"
opened with "Country" blank. The journal's own "Masthead" shows "Country"
with the Required mark (`PKPMastheadForm` sets `isRequired`).

<a id="fn-f-a2"></a>
**f-a2** — Note f: the modal closes on the form's success event and
nothing sends the grid a data-changed event. Live-probed 2026-09-27,
three apps: note td5; the "Path" column kept the old path the same way.

<a id="fn-f-a3"></a>
**f-a3** — `PKPContextForm`'s `urlPath` field has `prefix` `$baseUrl .
'/'` (`$request->getBaseUrl()`), which does not carry "index.php";
`config.TEMPLATE.inc.php` and the test installs' `config.test.inc.php`
set `restful_urls = Off`, under which every journal address is
`{base}/index.php/{path}/…`. Live-probed 2026-09-27, three apps: the
prefix read `http://127.0.0.1:8650/` (8750, 8850) while the seeded
journal's home was `http://127.0.0.1:8650/index.php/publicknowledge/en`.

<a id="fn-f-a4"></a>
**f-a4** — Note h; the legacy grids' actions (languages, plugins,
users) are likewise built with the page's journal path. Live-probed
2026-09-27, three apps, two runs: note td7. A "Saved" still on screen
from the path save can read as the second save's; once it had gone,
nothing followed "Saving".

<a id="fn-f-a5"></a>
**f-a5** — Note e: `readerInformation` and `authorInformation` are
filled once, at creation, from the `forReaders` / `forAuthors` default
texts of each app's `locale/<lang>/default.po` with `{$indexUrl}/{$contextPath}`
links; nothing rewrites them on a path change. OPS stores them too, but
no page of a preprint server shows them. Live-probed 2026-09-27 on OJS
and OMP: note td7.

<a id="fn-f-a6"></a>
**f-a6** — `lib/ui-library/src/components/Form/FormErrors.vue`:
`showNextError()` always shows `Object.keys(this.errors)[0]`, the first
refused field; the button is `form.errorGoTo` "Jump to next error", and
the per-field `form.errorA11y` buttons sit in a `-screenReader` list. The
footer is shared by every form built on it. Live-probed 2026-09-27, three
apps, two runs each: after "Save" on an empty "Create Journal" ("Please
correct 7 errors."), each of five presses left "Journal title" at the top
of the window and the focus on the link.

<a id="fn-f-a7"></a>
**f-a7** — `lib/ui-library/src/components/Form/fields/FieldText.vue`
`mounted()` (lines 164–212, ui-library `03d1cee2`): a field with a
prefix, here "Path" with the site's address in front (A3), measures
`this.$refs.prefix.clientWidth` in a `setTimeout(…, 700)`; a window
closed before the timer fires leaves it measuring a box that is gone.
The field is shared by the three apps' forms. Test runs 2026-09-28,
traced (OJS two serial runs; OMP and OPS one serial and one solo run
each; all green), read from the traces' page errors: "TypeError: Cannot
read properties of null (reading 'clientWidth')" at
`js/build.js?v=3.6.0.0:483:24589` (OJS) and `:481:24600` (OMP, OPS), on
the Site Administrator's Hosted Journals (Presses, Servers) page,
0.25–0.55 s after a "Close": scenario 3's "Close"s on "Edit" and
scenario 4's, on every app, and a "Create Journal" ("Create Press",
"Create Server") window opened and closed at once (OJS's second run in
scenario 3, OMP in scenarios 3 and 5, OPS in scenario 5).
No other window close in those runs raised it, the "Edit" window's own
close about a second after "Saved" and a "Create Journal" window closed
after typing included. Nothing on screen differed.

<a id="fn-f-a8"></a>
**f-a8** — `PKPPageRouter::route()` sends a signed-out request for a
context that is not enabled to `$request->redirect(null, 'login')`, with
no `source`; only the `login` and `invitation` pages pass. The code is
identical in the three checkouts. A journal requiring sign-in goes
through `Validation::redirectLogin()` instead, which appends `source`
(the Login & sessions spec's note b), and `LoginHandler::_redirectAfterLogin()`
without a `source` sends a role holder to the dashboard and a Reader to
the journal's `index`. The same missing return address was sighted on
2026-09-25 and 2026-09-26 on the web feeds and the sitemap (the Web
feeds spec's note td12, the Search engine metadata spec's note q8) and on
2026-09-28 on the LOCKSS and CLOCKSS pages (the Archiving & preservation
spec's note k) and on a book's pages (OMP). Live-probed 2026-09-29, three
apps, two runs each: note td8.

<a id="fn-f-a9"></a>
**f-a9** — The Login page's "Register" links (`user/register`, the
form's with an empty `source`) and the trail's "Home" (`index`) are page
requests at the same context, so the gate of note f-a8 sends each back
to `login`; "Forgot your password?" (`login/lostPassword`) passes because
the `login` page is exempt. Live-probed 2026-09-29, three apps, two runs
each: note td8.

<a id="fn-f-a10"></a>
**f-a10** — `PKPContextService::delete()` deletes the context's user
groups and genres before its institutions; on OMP and OPS the
institutions' delete fails (the Institutions spec's note f-a8 traces
it), so the request dies after the roles are gone and before the context
is. First seen 2026-09-28 (the Institutions spec's A8). Live-probed
2026-09-29, three apps, two runs each: note td10.
Issue report: [pkp-e2e#1](https://github.com/jardakotesovec/pkp-e2e/issues/1) ([docs/issues/U66-A3-A8-omp-ops-institution-delete-fails.md](../issues/U66-A3-A8-omp-ops-institution-delete-fails.md)).

<a id="fn-f-ops1"></a>
**f-ops1** — `PKPContextService::validate()` adds
`admin.contexts.form.pathRequired` for the path "0"; OJS's and OMP's
`locale/en/admin.po` define it, OPS's `locale/en/admin.po` and lib/pkp's
do not, and a missing key prints as `##key##`. Live-probed 2026-09-27: on
"Create Journal" and on "Edit", OPS showed
"##admin.contexts.form.pathRequired##" under "Path", OJS and OMP "A path
is required."

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Administration › "Hosted Journals" ("Hosted Presses", "Hosted Servers") | `index/admin` → `index/admin/contexts` | AFFM-183 |
| The list of journals | `grid.admin.context.ContextGridHandler` (`fetchGrid`, `fetchRow`) | GRID-004 |
| "Create Journal" and its window | `ContextGridHandler::createContext` → `POST index/api/v1/contexts` | AFFM-192 |
| A row's "Edit" | `ContextGridHandler::editContext` → `PUT {path}/api/v1/contexts/{id}` | AFFM-193 |
| A row's "Remove" | `ContextGridHandler::deleteContext` | AFFM-194 |
| A row's "Settings wizard" | `index/admin/wizard/{id}` | AFFM-195 |
| "Order" | `ContextGridHandler::saveSequence` | AFFM-196 |
| The Settings Wizard's "Journal" tab | `index/admin/wizard/{id}#setup/context` (the `context` tab) → `PUT {path}/api/v1/contexts/{id}` | AFFM-197 |
| The wizard's "Appearance", "Languages", "Search Indexing", "Restrict Bulk Emails" and "Plugins" tabs (claimed by Appearance & theming, Languages & locales, Search engine metadata & analytics, Notify users, Plugins management) | `contextSettings.tpl` | AFFM-198..202 |
| The create and edit window's container | `lib/ui-library/src/components/Container/AddContextContainer.vue`, `Form/context/AddContextForm.vue` | VUE-014 |
| The site's list of journals | `index/index` (`indexSite.tpl`, `.journals` / `.presses` / `.servers`) | AFFR-019 |
| The contexts requests (`GET`, `POST contexts`; `GET`, `PUT`, `DELETE contexts/{id}`; the `theme` and `registrationAgency` sub-requests are cited by Appearance & theming and DOIs). No screen sends `DELETE contexts/{id}`: "Remove" goes through the grid | `api/v1/contexts` | API-013 |
| The context record, and each app's overlay | `lib/pkp/schemas/context.json`; `ojs`, `omp`, `ops` `schemas/context.json` | SET-006, SET-029, SET-035, SET-041 |
| The Administration handler's `contexts` and `wizard` ops (rider; the handler is System administration & jobs') | `PKP\pages\admin\AdminHandler::contexts()`, `wizard()` | ROUTE-003 |
| The Administration page container (rider; System administration & jobs') | `lib/ui-library/src/components/Container/AdminPage.vue` | VUE-015 |

## Reference — code anchors

- **Pages**: `lib/pkp/pages/admin/AdminHandler.php` (`contexts()`,
  `wizard()`, `authorize()`, `initialize()`);
  `lib/pkp/templates/admin/contexts.tpl`, `editContext.tpl`,
  `contextSettings.tpl`; `lib/pkp/templates/layouts/backend.tpl`.
- **The list**: `lib/pkp/controllers/grid/admin/context/ContextGridHandler.php`,
  `ContextGridRow.php`, `ContextGridCellProvider.php`;
  `lib/pkp/classes/controllers/grid/feature/OrderGridItemsFeature.php`,
  `OrderItemsFeature.php`;
  `lib/pkp/templates/controllers/grid/feature/gridOrderFinishControls.tpl`;
  `lib/pkp/js/controllers/modal/ModalHandler.js`.
- **Form**: `lib/pkp/classes/components/forms/context/PKPContextForm.php`;
  `<app>/classes/components/forms/context/ContextForm.php`;
  `lib/pkp/classes/components/forms/FormComponent.php`;
  `lib/ui-library/src/components/Form/context/AddContextForm.vue`,
  `Form/Form.vue`, `Form/FormErrors.vue`, `Container/AddContextContainer.vue`.
- **Requests and storage**: `lib/pkp/api/v1/contexts/PKPContextController.php`;
  `<app>/api/v1/contexts/index.php`;
  `lib/pkp/classes/services/PKPContextService.php` (`validate()`,
  `add()`, `edit()`, `delete()`); `<app>/classes/services/ContextService.php`;
  `lib/pkp/classes/context/ContextDAO.php` (`getAll()`, `getByPath()`,
  `resequence()`); `lib/pkp/classes/validation/ValidatorFactory.php`;
  `lib/pkp/schemas/context.json`, `<app>/schemas/context.json`;
  `lib/pkp/classes/middleware/SetupContextBasedOnRequestUrl.php`.
- **The site's home page**: `<app>/pages/index/IndexHandler.php`;
  `lib/pkp/classes/handler/PKPHandler.php` (`getTargetContext()`);
  `<app>/templates/frontend/pages/indexSite.tpl`;
  `lib/pkp/pages/user/RegistrationHandler.php`.
- **Labels**: `<app>/locale/en/admin.po`, `manager.po`, `locale.po`,
  `default.po`; `lib/pkp/locale/en/admin.po`, `manager.po`,
  `common.po`, `grid.po`.
