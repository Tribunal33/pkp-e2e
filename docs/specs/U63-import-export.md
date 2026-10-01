---
name: import-export
status: verified
---

# Import & export

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal's managers sometimes need to move content and people in bulk:
bring in articles and issues from another installation, take a copy of
the journal's submissions out as a file, add a list of users with their
roles, or send article metadata to an indexing service. They do it on
the "Tools" page, whose "Import/Export" tab lists the installation's
import and export tools (the plugins the Plugins list files under
"Import/Export Plugins"; each is called a **tool** below). Every journal
has the "Native XML Plugin", which imports and exports submissions (and,
on a journal, issues) in the application's own XML format. A journal and
a press also have the "Users XML Plugin" for accounts and their roles; a
preprint server does not install it. A journal also has the "PubMed XML
Export Plugin", which writes article metadata in the format PubMed
indexes, and the "DOAJ Export Plugin", which exports article metadata
for the Directory of Open Access Journals and can send it there. The DOI
registration agencies' tools and the press's other tools are listed on
the same page and described elsewhere (Rule 6). <sup>a</sup>

## Actors & permissions

"Manager-level roles" are the roles
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
defines: the Journal Manager, and on a journal or press the Editor and
the Production Editor. Unlike the Settings pages, the Tools page does not
depend on the role's "Permit changes to Settings" (Settings bullet 1).
The Site Administrator holds a Journal Manager role in every journal of
the test installs.

| Action | Who may, and when |
|--------|--------------------|
| **Open the Tools page and its "Import/Export" list** (Rules 1–3) | • manager-level roles, "Permit changes to Settings" ticked or not <sup>td22</sup><br>• Site Administrator<br>• every other role (Section Editor, assistant roles, Author, Reviewer, Reader): the access-denied page, reading "The current role does not have access to this operation.", and no "Tools" in the side menu<br>• signed out: the Login page <sup>a</sup> <sup>td23</sup> |
| **Open a tool's page and use it**: import, export, a tool's settings, the DOAJ actions (Rules 4–45) | • the same roles as the row above; every other role gets the access-denied page at the tool's address <sup>a</sup> <sup>td23</sup> |
| **Reset every submission's permissions** (the "Permissions" tab) | • described in [Publication metadata](U40-publication-metadata.md), Rule 14 |
| **Receive the "Journal Registration" email ("Press Registration" on a press) of an import** (Rule 25) | • each new account a users import creates whose password the file gives stored another way (Rule 25, last row)<br>• nobody else: not an account whose plain password was refused, not an existing account, not the importing manager <sup>l</sup> |

## Fields & validation

**Tools › "Import/Export"** (Rule 2): one line per tool, its name a
link to its page, followed by a colon and its description, in no fixed
order. <sup>c</sup> <sup>td1</sup>

| App | Tools listed (name: description) |
|-----|----------------------------------|
| journal | "DOAJ Export Plugin": "Export Journal for DOAJ." · "DataCite Export/Registration Plugin": "Export or register issue, article, galley and supplementary file metadata in DataCite format." · "Crossref XML Export Plugin": "Export article metadata in Crossref XML format." · "Native XML Plugin": "Import and export articles and issues in OJS's native XML format." · "Users XML Plugin": "Import and export users" · "PubMed XML Export Plugin": "Export article metadata in PubMed XML format for indexing in MEDLINE." |
| press | "Native XML Plugin": "Import and export books in OMP's native XML format." · "Tab Delimited Content Import Plugin": "Import submissions into presses from tab delimited data." · "Users XML Plugin": "Import and export users" · "ONIX 3.0 Monograph Export Plugin": "Export monograph metadata in the ONIX 3.0 format" |
| preprint server | "Crossref XML Export Plugin": "Export preprint metadata in Crossref XML format." · "Native XML Plugin": "Import and export submissions in OPS's native XML format." |

**"Native XML Plugin"** (Rules 7–20), its tabs:

| Tab (UI label) | What it holds |
|----------------|---------------|
| "Import" | the upload box headed "Upload XML file to import" ("Upload File", or a file dropped on "Drag and drop a file here to begin upload"; once a file is up, its name and "Change File"), and the "Import" button (Rules 8–13) <sup>e</sup> |
| "Export Articles" ("Export" on a press, "Export Preprints" on a preprint server) | the list titled "Articles" ("Monographs", "Preprints") with a search box and "Filters" at its top right; each line a tick box, the title and "View"; under the list "Select All" and the export button, "Export Articles" ("Export Submissions" on a press, "Export Preprints" on a preprint server) (Rules 14–17) <sup>g</sup> |
| "Export Issues" {OJS} | the issue list with the columns "Select", "Issue" and "Items", and "Export Issues" (Rule 18); each issue's name is a link that opens its "Issue Management: {issue}" window, with the tabs "Table of Contents", "Issue Data" and "Issue Galleys" ([Issues](U50-issues.md)) <sup>i</sup> |
| a results tab | added by each "Import" or export press: "Import Results" ("Results" on a press), "Export Submissions Results", "Export Issues Results" {OJS} (Rules 9, 16). Each results tab carries "Close"; pressed, the tab goes and the page shows its last tab ("Export Issues" on a journal, "Export" on a press, "Export Preprints" on a preprint server) <sup>f</sup> |

The "Filters" panel of the export list holds, top to bottom: under
"Stages", "Submission", "Review", "Copyediting" and "Production" (a
press: "Submission", "Internal Review", "External Review",
"Copyediting", "Production"; a preprint server: "Production"); under
"Activity", "Days since last activity", which its "Add filter" button
turns into a slider from 1 to 180 days, starting at 30 (the list then
shows only submissions with no activity for at least that many days);
and on a journal and a preprint server, under "Sections", one line per
section. <sup>g</sup>

**"Users XML Plugin"** {OJS OMP} (Rules 21–28):

| Tab (UI label) | What it holds |
|----------------|---------------|
| "Import Users" | the paragraph "Select an XML data file containing user information to import into this journal. See the journal help for details on the format of this file." (on a press: "…import into this press. See the press help for details on the format of this file.") and "Note that if the imported file contains any usernames or email addresses that already exist in the system, the user data for those users will not be imported and any new roles to be created will be assigned to the existing users."; the upload box headed "File"; the "Import Users" button <sup>k</sup> |
| "Export Users" | the list titled "Current Users", with "Export All Users" and "Search" at its top right and the columns "Select", "Given Name", "Family Name", "Username" and a last column headed "Email" on some installs and "Email address" on others, with no setting behind the difference (the same split as the contributor form's email field, [Contributors & affiliations](U41-contributors-and-affiliations.md#a19)); under it "Export Users" <sup>m</sup> |
| "Results" | added by each "Import Users" press (Rule 22), each with its own "Close"; reloading the page removes every "Results" tab <sup>k</sup> |

The "Current Users" filter: "Search" at the list's top right shows it,
and pressed again hides it. It holds a text box, a list of the
journal's roles opening on "All Roles", and a "Search" button. That
"Search" narrows the list (Rule 26) and closes the filter, so each
further search starts with "Search" at the list's top right. <sup>m</sup>

**"PubMed XML Export Plugin"** {OJS} (Rules 29–32): tabs "Settings",
"Export Articles" and "Export Issues"; the export tabs hold the same
list and issue list as the Native XML Plugin's, with "Select All" and
"Export Articles", or "Export Issues". <sup>n</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "NLM Title Abbreviation" (Settings tab) | No | A text box, at most 100 characters, under the help "The NLM Title Abbreviation for the journal. If you do not know the abbreviation, search the NLM Catalog.", whose last words link to the NLM Catalog; saved with "Save" (Rule 30) <sup>n</sup> |

**"DOAJ Export Plugin"** {OJS} (Rules 33–45): tabs "Settings" and
"Articles" ("Publications" while "DOI Versioning" is "Yes"). <sup>q</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Contact DOAJ for inclusion" (Settings tab) | — | A link opening DOAJ's application page in a new tab <sup>p</sup> |
| "DOAJ API Key" (Settings tab) | No | Under the help "If you would like to register articles from within OJS, please enter your DOAJ API Key. Else, you'll still be able to export into the DOAJ XML format but you cannot register your articles with DOAJ from within OJS."; a box whose characters show as dots, at most 100 characters, with "You will find your API key on your DOAJ user page." under it (Rule 38) <sup>p</sup> |
| "OJS will deposit articles automatically to DOAJ. Please note that this may take a short amount of time after publication to process (e.g. depending on your cronjob configuration). You can check for all unregistered articles." (Settings tab) | No | A tick box, unticked on a new journal (Rule 43) <sup>p</sup> |
| "Validate XML before the export and registration." (Articles tab) | No | A tick box under the list, ticked each time the tab opens (Rule 40) <sup>r</sup> |

The Articles tab's list is titled "Articles", with "Search" at its top
right and the columns "Select", "ID", "Author; Title", "Issue" and
"Status"; the Publications list, titled "Publications", has "Select",
"Submission ID", "Publication Stage", "Author; Title" and "Status". The
filter, shown once "Search" is pressed: a list reading "Article Title"
or "Authors" beside a text box, a list of the journal's published issues
opening on "Any Issue", a list of statuses opening on "Any Status"
("Not Deposited", "Marked registered", "Registered", "Submitted", "Needs
Sync", "Error"), and a "Search" button. <sup>q</sup>

## Rules & state

**The Tools page**

1. <a id="tools-page"></a> **Where it is.** The side menu's "Tools"
   opens a page headed "Tools" with two tabs, "Import/Export" (open
   first) and "Permissions". "Permissions" holds the permissions reset
   of [Publication metadata](U40-publication-metadata.md), Rule 14.
   <sup>b</sup>
2. **The list.** "Import/Export" lists every tool installed for the
   application, one line each (Fields). The order of the lines is not
   fixed: it can differ between installations and change as the
   installation is used. <sup>c</sup> <sup>td1</sup>
3. **Always on.** A tool cannot be switched off: on Settings › Website ›
   "Plugins" its box is ticked and cannot be pressed
   ([Plugins management](U62-plugins-management.md), Rule 10), and the
   list shows it whatever that list says. The one exception is the
   "DOAJ Export Plugin", which comes with the "DOAJ Plugin" under
   "Generic Plugins" (Rule 33). With "DOAJ Plugin" unticked, the
   Plugins list still shows "DOAJ Export Plugin" ticked, its box not
   pressable, with "Import/Export Data", which opens the raw code text
   of Rule 5 ⚠ [OJS2](#ojs2). <sup>o</sup> <sup>td2</sup>
4. **A tool's page.** Pressing a tool's name opens its page, headed with
   the tool's name, with the trail "Tools" › the tool's name above the
   heading; "Tools" returns to the Tools page. The Crossref and DataCite
   pages are the exception: their heading is empty and they have no
   trail (Rule 6). The same page opens from "Import/Export Data" on the
   tool's row of the Plugins list
   ([→ plugin links](U62-plugins-management.md#plugin-links)). <sup>d</sup>
5. **An address naming a tool the installation lacks** (such as the
   Crossref tool's address typed on a press) shows the "Import/Export"
   list as raw code text on an otherwise empty page, instead of a page
   saying there is no such tool ⚠ [A1](#a1). A tool's address with the
   tool's name left off its end opens a blank white page: the server
   fails ⚠ [A19](#a19). <sup>w</sup> <sup>td3</sup>
6. **Tools this spec does not describe.** The pages of "Crossref XML
   Export Plugin" and "DataCite Export/Registration Plugin" only say
   that DOI management has moved ([DOIs](U45-dois.md), Rule 44; their
   empty heading is [DOIs A20](U45-dois.md#a20)). A press's "ONIX 3.0
   Monograph Export Plugin" page belongs to [ONIX metadata & export](U74-onix-metadata-export.md)
   {OMP}. A press's "Tab Delimited Content Import Plugin" works only
   from the server's command line: its row on the Plugins list has no
   "Import/Export Data", yet the Tools list links its name, which opens
   a blank page ⚠ [OMP1](#omp1). <sup>v</sup> <sup>td4</sup>

**Native XML Plugin: importing**

7. **Its tabs.** The page opens on "Import"; the other tabs are listed
   under Fields. <sup>e</sup>
8. **Choosing the file.** "Upload File" opens the computer's file
   picker, or a file is dropped on the box. The file goes up at once:
   its name shows in the box and the button reads "Change File". The
   box takes any file; it is read only when "Import" is pressed. The
   Tab key skips "Upload File" and the box and goes straight to
   "Import", so a keyboard user cannot choose a file ⚠ [A6](#a6). A
   file that is up but not imported stays while another tab is open;
   leaving the page asks nothing, and on return the box is empty and
   nothing was imported. <sup>e</sup>
9. **Results in a tab.** "Import" adds a tab named "Import Results"
   ("Results" on a press) and opens it; it shows the outcome of Rules 10
   and 11. The file stays in the box, so each press of "Import" adds one
   more tab of the same name and imports the file again. Choosing an
   earlier results tab again also imports the file once more, adding
   another copy of every item ⚠ [A7](#a7). <sup>f</sup> <sup>td8</sup>
10. **A successful import.** The tab reads "The import completed
    successfully. The following items were imported:", then, under a
    heading for each kind of item, one line per item imported, such as
    ""12" - "The Title"" for a submission (its new number in this
    journal, then its title). Each imported submission then belongs to
    the journal: it appears on the Dashboard
    ([Submissions dashboard](U23-submissions-dashboard.md)) in the stage
    the file gives it, with the file's contributors and files.
    <sup>f</sup> <sup>td7</sup>
10a. **Error lines on a clean file.** Even a file the app itself
    exported lists, under "Errors occured:", "The author {name} does not
    have a country." and "The author '{name}' does not have any
    contributor role. Defaults to AUTHOR." for each contributor exported
    without them, and on a journal "The issue identification element is
    missing for the article "{title}"." for an article in no issue. The
    items are imported all the same ⚠ [A8](#a8). <sup>f</sup>
11. **A failed import keeps nothing.** When the file does not match the
    format, or the import stops on an error part-way, the tab reads "The
    process failed. Check below for errors/warnings.", then the "Errors
    occured:" list and, when the file does not match the format, the
    "Validation errors:" list with the file's offending lines. Nothing
    from the file is imported, the items before the failing one
    included. <sup>f</sup>
12. **Problems that do not stop an import.** Some problems leave the rest
    of the file imported: the success text of Rule 10 is then followed by
    "Errors occured:" or "Warnings encountered:", one line per problem.
    An article placed in an issue the journal does not have gets a new
    unpublished issue of that volume, number and year {OJS}, with the
    line "None or more than one issue matches the given issue
    identification "…"." (the file's issue details inside the quotes).
    <sup>f</sup> <sup>td18</sup>
12a. **An unknown section.** An article or preprint whose section the
    journal lacks ends in an empty results tab, with no text. The
    submission is kept with no version: its Dashboard row shows only its
    number and stage, its "View" opens nothing, and the export list
    disappears from the export tab ⚠ [A9](#a9). A monograph naming a
    series the press lacks is imported instead, with "Warnings
    encountered:" and the line "Unknown series {path}", and the press
    gains that series with the file's title [OMP3](#omp3).
    <sup>f</sup> <sup>td18</sup>
13. **No file, or not an XML file.** "Import" pressed before any file
    is up adds no results tab and changes nothing. <sup>td5</sup> A file
    that is not XML at all ends as a failed import (Rule 11): its
    "Errors occured:" line names the "Native XML issue import" on a
    journal and the "Native XML submission import" on a press and a
    preprint server, and its "Validation errors:" read "Start tag
    expected, '<' not found" and "The document has no document
    element.". <sup>td6</sup>

**Native XML Plugin: exporting**

14. <a id="export-list"></a> **The export list.** "Export Articles"
    ("Export", "Export Preprints") lists every submission of the
    journal, in any stage and any state, 100 to a page with page links
    under the list when there are more. The search box narrows the list,
    once Enter is pressed, to submissions matching the words typed.
    "View" on a line opens that submission's workflow screen or, for an
    unfinished submission, "Make a Submission" on its first step.
    <sup>g</sup>
14a. **Filters.** "Filters" opens the panel of Fields beside the list.
    Filters of different groups narrow each other, and two stages list
    the submissions of either. A published submission is in none of the
    stages: pressing any of them, "Production" included, leaves it out
    ⚠ [A10](#a10). <sup>g</sup>
15. **Select All.** "Select All" ticks every line on the page and then
    reads "Select None", which unticks them all. With an empty list the
    button cannot be pressed. <sup>g</sup>
15a. **More than one page.** With more submissions than one page shows,
    "Select All" ticks the page's lines and keeps reading "Select All",
    and a second press unticks nothing. Only the page on screen is
    exported: a submission ticked on page 1 is left out when the export
    is pressed on page 2, and "Select All" on page 2 replaces page 1's
    ticks ⚠ [A11](#a11). <sup>g</sup>
16. **Exporting.** "Export Articles" ("Export Submissions", "Export
    Preprints") adds a tab named "Export Submissions Results" and opens
    it: "The export completed successfully. Download the exported file
    from the button below." and a "Download Exported File" button, which
    downloads the file, an .xml file holding the ticked submissions.
    Pressed with nothing ticked, the results tab opens empty, with no
    text and no button ⚠ [A12](#a12). <sup>h</sup> <sup>td10</sup>
17. **One download.** Each export's file downloads once: a second press
    of the same "Download Exported File" downloads nothing and opens a
    blank white page (the browser's Back returns to the tool). Choosing
    the results tab again, from another tab, runs the export again, and
    its button then downloads a new file. <sup>h</sup> <sup>td9</sup>
18. **Exporting issues** {OJS}. "Export Issues" lists every issue of the
    journal once, published or not, with the number of items in each,
    in the order they were created or in none, published and
    unpublished mixed ⚠ [OJS10](#ojs10). Ticking issues and pressing
    "Export Issues" adds a tab "Export Issues Results" that works as
    Rule 16, its file holding the issues with their articles. Pressed with nothing ticked, the tab opens empty, as
    in Rule 16 ([A12](#a12)). <sup>i</sup> <sup>td11</sup>
19. **A press's ONIX reminder** {OMP}. While any of the press's
    "Press Publisher Name", "Geographical Location", "Publisher Code
    Type" and "Publisher Code" is blank, the "Export" tab opens with
    "This press is missing some required information for ONIX metadata
    used in this export. Please go to Press Settings and fill in the
    missing details.", "Press Settings" a link to Settings › Press
    [OMP2](#omp2). <sup>j</sup> <sup>td12</sup>
20. **What the file carries.** Each submission's versions with their
    metadata, contributors, galleys (publication formats on a press)
    and files, so that Rule 10 can rebuild it elsewhere. A title's
    prefix comes back doubled: the imported copy of a submission whose
    "Prefix" (Publication › "Title & Abstract") is "The" is titled "The
    The …" ⚠ [A20](#a20). Which identifiers travel is described in
    [Identifiers](U44-identifiers.md), and the references in
    [Citations & references](U42-citations-and-references.md).
    <sup>h</sup>

**Users XML Plugin** {OJS OMP}

21. **Its tabs.** "Import Users" (open first) and "Export Users"
    (Fields). <sup>k</sup>
22. **Importing.** After a file is up in "File" (as Rule 8), "Import
    Users" adds a tab "Results" and opens it. When no user raised a
    problem, it reads "The import completed successfully. Users with
    usernames and email addresses that are not already in use have been
    imported, along with accompanying user groups.". When any user
    raised a problem, it reads "Import/Export errors:" with one line per
    problem (Rules 23–25) and no success sentence, although the users
    without a line, and those whose line ends "The user has been
    imported.", were imported. <sup>k</sup>
22a. **A file the import cannot read.** A file that does not match the
    format (a user with no password, an unknown element, another kind of
    document, a file that is not XML) adds a "Results" tab that stays
    empty: nothing is imported and nothing says why ⚠ [A13](#a13).
    <sup>k</sup>
22b. **Pressing "Import Users" again.** After an import the box keeps
    the file's name and "Change File", and pressing "Import Users" again
    imports the same file into a new "Results" tab (the accounts it
    created are then existing accounts, Rule 23). With no file up,
    "Import Users" still adds a "Results" tab, reading "Please upload a
    file under "Import" in order to continue."; each press adds another.
    A file that is up but not imported is dropped on leaving the page,
    as in Rule 8. <sup>k</sup>
22c. **A role with an empty or unreadable date.** When a user's role
    in the file has an empty start date, a start date that is not a
    date (such as "soon"), or an empty end date, the import stops at
    that user. The "Results" tab stays empty. The user's account is
    created and signs in, but holds no role in the journal, and the
    users listed after it in the file are not imported ⚠ [A18](#a18).
    <sup>l</sup>
22d. **A user with no registration date.** The format lets a file
    leave out a user's registration date. When a user has none, the
    import stops at that user: the "Results" tab stays empty, the users
    listed before it are imported with their roles, and it and the
    users after it are not ⚠ [A21](#a21). <sup>l</sup>
23. <a id="users-matching"></a> **Which accounts.** Each user in the
    file is matched on username and email together:
    - neither is in use on the installation: a new account is created
      with the file's name, email, username and other details;
    - both belong to the same existing account: that account is kept as
      it is, and only the file's roles are added to it (Rule 24);
    - they belong to two different accounts, or one is in use and the
      other not: the user is skipped, with the line "The username
      "{username}" and the e-mail "{email}" do not match to the one and
      the same existing user.". <sup>l</sup>
24. **Roles.** Each role the file names for a user is given in this
    journal when the journal has a role of exactly that name; a name the
    journal lacks is passed over silently. A role the file gives no end
    date is not given twice while the user holds it. A role the file
    starts on a later date, or ends on a later date, is added again at
    every import of the file ⚠ [A17](#a17). <sup>l</sup>
24a. **The masthead choice.** The file's masthead choice for each role
    is kept. A role the file marks as not appearing reads "Does not
    appear on the masthead" on the user's roles page ("Edit" on the
    user's row of Settings › Users & Roles › "Users"), and "Editorial
    Masthead" does not list the person for it. A reviewer role always
    reads "Appear on the masthead", whatever the file says; the roles
    page offers no choice for it. An export writes each role's own
    choice, and a reviewer role's as appearing. <sup>l</sup>
    <sup>td14</sup>
24b. **The start date.** The file's start date for each role is kept:
    "Start Date" on the "Users" list and on the user's roles page reads
    it. A role the file gives no start date starts on the day of the
    import. A role the file gives as ended is listed on "Editorial
    History" with the file's years (such as "2019 – 2020"). <sup>l</sup>
    <sup>td14</sup>
25. **Passwords.** What happens to the password the file gives: <sup>l</sup>

    | In the file | Outcome |
    |-------------|---------|
    | plain text, at least the site's minimum length (Settings bullet 8) | the account signs in with it |
    | plain text, shorter, or empty | the line "The imported user "{username}" has a plain password that is not valid. The user has not been imported."; the account is created all the same, and no password signs in to it ⚠ [A4](#a4) <sup>td13</sup> |
    | a bcrypt hash at cost 12, the way this installation stores passwords | the account signs in with the original password; on a server whose PHP is older than 8.4, it counts as stored another way (the next row and the paragraph below) ⚠ [A16](#a16) |
    | stored another way, for a new account | a new password is made, the account must change it at its first sign-in, the "Journal Registration" email ("Press Registration" on a press) sends it to the account's address, and the line reads "The imported user "{username}" password could not be imported as is. A new password is been send to the user email. The user has been imported."; on a server whose PHP is older than 8.4, a bcrypt hash at cost 10, that PHP's default, is kept instead, with no line and no email, and the account signs in with it ([A16](#a16)) |

    A user with no password in the file at all makes the whole file
    fail (Rule 22a). For an account that already exists (Rule 23, second
    case), a password stored another way changes nothing: no email goes
    out and the account's own password still signs in, although the
    results read the last row's line, saying a new password was sent
    ⚠ [A15](#a15).

26. **The users list.** "Export Users" lists every account holding a
    role in the journal that has begun and not ended, with paging under
    the list. An account whose only role here has ended is not listed.
    Nor is one whose only role starts on a later date (given by an
    invitation or a users import), and "Search" does not find it,
    though Settings › Users & Roles › "Users" lists it ⚠ [A22](#a22).
    "Search" at the
    list's top right shows the filter of Fields; "Search" there narrows
    the list to the accounts in which every word typed appears in the
    name, username, email or affiliation, or in the name of a role the
    account holds, and, when a role is chosen, to those that hold it.
    <sup>m</sup>
27. **Exporting users.** "Export All Users" opens a window titled
    "Confirm" that asks "Are you sure you wish to export all users?":
    "OK" downloads an .xml file of every account the list holds, with
    their roles in this journal; "Cancel" closes the window and nothing
    downloads. Ticking rows and pressing "Export Users" downloads the
    file for the ticked accounts only. With no row ticked, "Export
    Users" leaves the tool for a blank page, and nothing downloads
    ⚠ [A14](#a14). <sup>m</sup> <sup>td15</sup>
28. **Moving roles between journals.** A file exported from one
    journal and imported into another journal of the same installation
    gives the same accounts, unchanged, the roles of the same names in
    the second journal (Rule 23, second case), with the first journal's
    masthead choices and start dates (Rules 24a, 24b), and sends no
    email. Some accounts get the line of Rule 25's last row all the
    same, though every password is unchanged ([A15](#a15)): with PHP 8.4
    or later on the server, for an account whose stored password is not
    a bcrypt hash at cost 12, as with a throwaway account before its
    first sign-in; with an older PHP, for every account whose stored
    password is such a hash ([A16](#a16)). <sup>l</sup>

**PubMed XML Export Plugin** {OJS}

29. **Its tabs.** "Settings" (open first), "Export Articles" and
    "Export Issues" (Fields). <sup>n</sup>
30. **The NLM title.** "Save" on the Settings tab stores "NLM Title
    Abbreviation" and shows the notice "Your changes have been saved.".
    The exported file names the journal by that abbreviation, or by the
    journal's name while it has never been saved; once the box has been
    saved empty, the file's journal title is empty ⚠ [OJS3](#ojs3). An
    unsaved change behaves as Rule 35a says. <sup>n</sup>
    <sup>td16</sup>
31. **Exporting articles.** The list is the one of Rules 14 and 15.
    "Export Articles" checks the file against PubMed's format, which the
    installation fetches from NLM's site at each export. Where that site
    cannot be reached, every export leaves the tool for a page listing
    "Validation errors:" ("Could not load the external subset
    "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd"") and, under
    "Invalid XML:", the file's text; no file downloads, and nothing
    skips the check ⚠ [OJS4](#ojs4). With nothing ticked, the file holds
    no article. <sup>n</sup> <sup>td17</sup>
    - Where NLM's site answers, the PubMed file of the ticked articles
      downloads at once, with no results tab. <sup>x</sup>
32. **Exporting issues.** The issue list is the one of Rule 18; "Export
    Issues" makes the PubMed file of every article assigned to the
    ticked issues, a scheduled article in an unpublished issue included,
    and checks it as Rule 31 says. <sup>n</sup>

**DOAJ Export Plugin** {OJS}

33. <a id="doaj-plugin"></a> **Where it comes from.** A new journal has
    "DOAJ Plugin" ticked under "Generic Plugins" on Settings › Website ›
    "Plugins", and the Tools list then shows "DOAJ Export Plugin". With
    "DOAJ Plugin" unticked the Tools list leaves it out. <sup>o</sup>
    <sup>td2</sup>
34. **Its tabs.** "Settings" (open first) and "Articles", or
    "Publications" instead of "Articles" while the journal's "DOI
    Versioning" is "Yes" (Settings bullet 5). <sup>q</sup>
35. **Settings.** "Save" stores "DOAJ API Key" and the automatic-deposit
    box and shows "Your changes have been saved.". Nothing on the tab is
    required. <sup>p</sup>
35a. **Unsaved settings** (the PubMed and the DOAJ Settings tabs). With
    a box changed and not saved, pressing another tab asks "The data on
    this form has changed. Do you wish to continue without saving?": its
    "Cancel" stays on Settings, "OK" opens the other tab, and the typed
    text is still in the box on return, unsaved. Leaving the page asks
    nothing, and the change is lost. The form's own "Cancel", under the
    form, does nothing: the typed text stays, nothing is asked and
    nothing is saved. Both forms end with "Required fields are marked
    with an asterisk: *", though no field is required ⚠ [OJS5](#ojs5).
    <sup>p</sup>
36. <a id="doaj-list"></a> **The Articles list.** It lists the
    journal's published articles only, 25 rows to a page by default
    ("Items per page" offers 10, 25, 50, 75 and 100), with page links
    under the list when they fill more than a page and a line counting
    the rows ("1 - 3 of 3 items"). "Author; Title" reads "{authors};
    {title}" and opens the article's workflow screen. "Issue" names the
    article's issue and opens that issue's window, with the "Table of
    Contents", "Issue Data" and "Issue Galleys" tabs of Issues › "Edit",
    headed "DOI Plugin Settings" ⚠ [OJS1](#ojs1). <sup>q</sup>
    <sup>td20</sup>
36a. **The filter.** The filter of Fields narrows the list by title or
    authors, issue and status. On a PostgreSQL installation (MySQL is
    not checked) its text search matches letter case as typed: "Okapi"
    finds "Okapi forest census", "okapi" finds nothing ⚠ [OJS6](#ojs6).
    <sup>q</sup>
37. **Statuses.** "Status" reads "Not Deposited" until one of Rules
    41–44 changes it: "Marked registered", "Submitted", "Registered" or
    "Needs Sync". <sup>q</sup>
    - A deposit DOAJ accepted reads "Registered". A deposit DOAJ refused
      reads "Failed", a link opening a window headed "Error" with DOAJ's
      own message. <sup>x</sup>
38. **The buttons.** Under the list sit "Validate XML before the export
    and registration." and the buttons "Export" and "Mark registered";
    while an API key is saved, "Register" comes first. <sup>r</sup>
39. **Nothing ticked.** Any of the buttons pressed with no row ticked
    returns to the tab with the notice "No objects selected.". <sup>r</sup>
40. **"Export".** It downloads the DOAJ file of the ticked articles; the
    statuses do not change. With "Validate XML before the export and
    registration." ticked, a file that does not meet DOAJ's format is
    not downloaded: a page lists "Validation errors:" and, under
    "Invalid XML:", the file's text. The check loads part of DOAJ's
    format from DOAJ's site; where that site cannot be reached, every
    export with the box ticked is refused this way, whatever the file
    holds ⚠ [OJS7](#ojs7). With the box unticked, the file downloads.
    <sup>r</sup> <sup>td19</sup>
41. **"Mark registered".** It returns to the tab with the ticked rows
    reading "Marked registered", for a journal that registered them with
    DOAJ some other way. <sup>r</sup>
42. **"Register".** It returns to the tab with the ticked rows reading
    "Submitted" and the notice "Articles submitted successfully". It
    checks nothing, "Validate XML before the export and registration."
    ticked or not ⚠ [OJS8](#ojs8). The articles are then sent to DOAJ
    in the background, and DOAJ's answer sets the row as Rule 37 says.
    <sup>r</sup>
    When the installation cannot reach DOAJ at all, the queued deposit
    fails (Administration › "View Failed Jobs" lists it) and the row
    keeps reading "Submitted": it never reads "Failed", and the "Error"
    status of the filter lists nothing ⚠ [OJS9](#ojs9). <sup>u</sup>
43. **Automatic deposit.** Once a day (no screen starts it; run by
    hand <sup>s</sup>), for a journal with "DOAJ Plugin" ticked, an API
    key saved and the automatic-deposit box ticked, the installation
    sends DOAJ every published article of the journal that has no
    status yet or reads "Needs Sync". Other "Needs Sync" items are
    taken along ⚠ [A5](#a5):
    - other journals' articles, from a journal without "DOI
      Versioning", and other journals' versions, from a journal with
      it;
    - with "DOI Versioning", a version a later minor version replaced,
      which no screen shows (Rule 45); its deposit is seen only among
      the installation's queued jobs.
44. **Needs Sync.** Publishing a new version of an article that reads
    "Registered" or "Marked registered" turns its status to "Needs
    Sync", so that it is sent again. <sup>t</sup> <sup>td21</sup>
45. **The Publications list.** With "DOI Versioning" "Yes", the
    "Publications" tab lists, for each article, the latest published
    version of each major version: once 1.1 is published, the row's
    "Publication Stage" reads "VoR 1.1" in place of "VoR 1.0", and a
    published 2.0 adds a row "VoR 2.0" beside "VoR 1.0".
    Unpublished versions change nothing, and every rule above applies to
    these rows. Statuses are kept apart for versions and for articles: a
    version "Marked registered" while "DOI Versioning" was "Yes" shows
    as "Not Deposited" on the Articles tab once it is "No". <sup>q</sup>

## Side effects

- **An import adds to the journal.** A Native XML import creates the
  file's submissions (on a journal, also its issues), with their files,
  sections and contributors (Rule 10), once more at each further press
  of "Import" or choice of an earlier results tab (Rule 9); on a press
  it can also add a series (Rule 12a). It sends no email. <sup>f</sup>
- **A users import creates accounts and roles** (Rules 23–24b) and sends
  the "Journal Registration" email ("Press Registration" on a press)
  only for Rule 25's last case, from the importing manager, with the
  journal's principal contact as the address to reply to. The template
  is "User Created" in Settings › Workflow › Emails
  ([Users management](U53-users-management.md), Side effects). <sup>l</sup>
- **Exports change nothing** in the journal; each makes a file
  (Rules 16, 18, 27, 31, 32, 40). <sup>h</sup>
- **DOAJ statuses** change on "Mark registered" and "Register" and on
  publishing (Rules 41–44). <sup>s</sup>
- **DOAJ receives the articles' metadata** that "Register" and the daily
  deposit send (Rules 42, 43). <sup>x</sup>

## Settings that modify behavior

1. **"Permit changes to Settings"** {OJS OMP} (the Editor's and the
   Production Editor's "Edit" on Settings › Users & Roles › "Roles";
   ticked on both by default). The manager's own role has no such box,
   and a preprint server has no other manager-level role. Ticked or
   not, the role opens the Tools page and every tool (Actors).
   <sup>a</sup>
2. **"DOAJ Plugin"** {OJS} (Settings › Website › "Plugins", "Generic
   Plugins"; ticked on a new journal). Ticked: the Tools list offers
   "DOAJ Export Plugin"; unticked: it does not (Rule 33). <sup>o</sup>
3. **"DOAJ API Key"** {OJS} (the DOAJ Settings tab; empty). Empty: the
   Articles tab offers "Export" and "Mark registered"; saved: also
   "Register" (Rule 38). <sup>r</sup>
4. **The automatic-deposit box** {OJS} (the DOAJ Settings tab;
   unticked). Ticked, with an API key saved: the daily deposit of
   Rule 43. <sup>s</sup>
5. **"DOI Versioning"** {OJS} (Settings › Distribution › "DOIs",
   [DOIs](U45-dois.md); "No" on a new journal). "No": the DOAJ tab
   "Articles"; "Yes": "Publications" (Rules 34, 45), each with its own
   statuses, and the daily deposit takes along the "Needs Sync" items
   of journals with the same choice (Rule 43). <sup>q</sup>
6. **"NLM Title Abbreviation"** {OJS} (the PubMed Settings tab; empty).
   Never saved: the PubMed file names the journal by its name; saved:
   by the abbreviation; saved empty: by nothing (Rule 30). <sup>n</sup>
7. **The press's ONIX details** {OMP} ("Press Publisher Name",
   "Geographical Location", "Publisher Code Type", "Publisher Code" on
   Settings › Press › "Masthead",
   [Journal identity & about pages](U07-journal-identity-and-about-pages.md);
   blank on a new press). Any blank: the Native XML "Export" tab shows
   the reminder of Rule 19; all filled: no reminder. <sup>j</sup>
8. **"Minimum password length (characters)"** (Administration › "Site
   Settings" › "Site Setup" › "Security",
   [Site settings](U60-site-settings.md); 6). A plain password in a
   users file shorter than it takes Rule 25's second row. <sup>l</sup>

## Cross-feature interactions

- **[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)**:
  the side menu's "Tools" entry and who sees it.
- **[Publication metadata](U40-publication-metadata.md)**: the
  "Permissions" tab of the Tools page (Rule 1).
- **[Plugins management](U62-plugins-management.md)**: the Plugins list,
  the "Import/Export Plugins" rows that cannot be switched off, "DOAJ
  Plugin"'s box and the "Import/Export Data" links (Rules 3, 4, 33).
- **[DOIs](U45-dois.md)**: the Crossref and DataCite tools (Rule 6) and
  "DOI Versioning" (Settings bullet 5).
- **[Submissions dashboard](U23-submissions-dashboard.md)** and the
  workflow screen: where imported submissions show, and what "View" and
  the DOAJ list's titles open (Rules 10, 14, 36).
- **[Users management](U53-users-management.md)**: where imported
  accounts and roles show, and the "User Created" email (Rules 23–25).
- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md)**:
  the masthead listing imported roles (Rule 24a) and the press's ONIX
  details (Rule 19).
- **[Identifiers](U44-identifiers.md)** and
  **[Citations & references](U42-citations-and-references.md)**: what
  the Native XML file carries of identifiers and references (Rule 20).
- **[Issues](U50-issues.md)**: the issue window that the "Export
  Issues" list (Fields) and the DOAJ list (Rule 36) open.
- **[Publish schedule & versions](U49-publish-schedule-and-versions.md)**:
  the new versions that turn DOAJ statuses to "Needs Sync" (Rule 44).
- **[System administration & jobs](U61-system-administration.md)**: the
  background jobs and daily task behind Rules 42 and 43, and "View
  Failed Jobs".
- **[Site settings](U60-site-settings.md)**: the minimum password length
  (Settings bullet 8).

## Canonical scenarios

Scenario 2 runs on the seeded journal with ready accounts; every other
scenario runs on scratch journals (two where a file moves from one
journal to another) with throwaway accounts. <sup>sc</sup>

1. **The Tools page, its list and a tool's page**

   Given: Journal Manager of two scratch journals, the first in a new
   journal's state with an Editor whose role has "Permit changes to
   Settings" unticked {OJS OMP}, the second, on a journal, with "DOAJ
   Plugin" unticked.

   - **The Tools page**: in the first journal press "Tools" in the side
     menu: a page headed "Tools" opens with two tabs, "Import/Export"
     (open) and "Permissions" (Rule 1).
   - **The list**: "Import/Export" shows one line per tool, its name a
     link, then a colon and its description (Rule 2; Fields). On a
     journal, these lines, in any order: "DOAJ Export Plugin": "Export Journal for
     DOAJ.", "DataCite Export/Registration Plugin": "Export or register
     issue, article, galley and supplementary file metadata in DataCite
     format.", "Crossref XML Export Plugin": "Export article metadata in
     Crossref XML format.", "Native XML Plugin": "Import and export
     articles and issues in OJS's native XML format.", "Users XML
     Plugin": "Import and export users", "PubMed XML Export Plugin":
     "Export article metadata in PubMed XML format for indexing in
     MEDLINE.". On a press: "Native XML Plugin": "Import and export books
     in OMP's native XML format.", "Tab Delimited Content Import Plugin":
     "Import submissions into presses from tab delimited data.", "Users
     XML Plugin": "Import and export users", "ONIX 3.0 Monograph Export
     Plugin": "Export monograph metadata in the ONIX 3.0 format". On a
     preprint server: "Crossref XML Export Plugin": "Export preprint
     metadata in Crossref XML format.", "Native XML Plugin": "Import and
     export submissions in OPS's native XML format.". The press's "Tab
     Delimited Content Import Plugin" link is not pressed here ⚠
     [OMP1](#omp1).
   - **A tool's page**: press "Native XML Plugin": its page opens headed
     "Native XML Plugin", with the trail "Tools" › "Native XML Plugin"
     above the heading and the tabs "Import" (open), "Export Articles"
     and "Export Issues" ("Import" and "Export" on a press, "Import" and
     "Export Preprints" on a preprint server). "Import" holds the box
     headed "Upload XML file to import", with "Upload File" and "Drag
     and drop a file here to begin upload", and the "Import" button.
     Press "Tools" in the trail: the Tools page shows again (Rules 4, 7;
     Fields).
   - **The Editor** {OJS OMP}: the Editor signs in to the first journal:
     the side menu offers "Tools", which opens the same list, and
     "Native XML Plugin" opens its page (Actors rows 1–2; Settings
     bullet 1).
   - **"DOAJ Plugin" unticked** {OJS}: the Journal Manager opens the
     second journal's Tools page: its list has no "DOAJ Export Plugin"
     line, and still has "Native XML Plugin" (Rule 33; Settings bullet
     2).
   - **Control**: the first journal's list has a "Users XML Plugin" line
     on a journal and a press, and none on a preprint server, whose list
     holds its two lines alone (Purpose; Fields). <sup>sc</sup>

2. **Roles kept off the Tools page**

   Given: the seeded journal's Section Editor, Copyeditor (Editorial
   Board Member on a preprint server), Reviewer (on a journal and a
   press), Author and Reader, each signed in in turn, and the addresses
   of the Tools page and of the "Native XML Plugin" page as the Journal
   Manager's browser shows them.

   - **Section Editor**: the side menu has no "Tools". Open the Tools
     page's address: the access-denied page reads "The current role does
     not have access to this operation.". Open the "Native XML Plugin"
     page's address: the same page (Actors rows 1–2).
   - **Copyeditor, Reviewer, Author and Reader**: each gets the same
     access-denied page at both addresses (Actors rows 1–2).
   - **Signed out**: open the Tools page's address in a browser where
     nobody is signed in: the Login page shows (Actors row 1).
   - **Control**: the Journal Manager opens both addresses: the Tools
     page with its "Import/Export" list, and the "Native XML Plugin"
     page (Actors rows 1–2). <sup>sc</sup>

3. **Exporting submissions**

   Given: Journal Manager of a scratch journal holding three
   submissions, "Okapi field notes", submitted, "Quokka survey", sent
   for review (on a preprint server, submitted), and "Axolotl limb
   memory", published (on a journal, in its published issue, beside an
   unpublished issue with nothing in it).

   - **The export tab**: on the "Native XML Plugin" page press "Export
     Articles" ("Export" on a press, "Export Preprints" on a preprint
     server): the list titled "Articles" ("Monographs", "Preprints"),
     with a search box and "Filters" at its top right, lists the three
     submissions, each line a tick box, the title and "View"; under the
     list sit "Select All" and "Export Articles" ("Export Submissions",
     "Export Preprints") (Rule 14; Fields).
   - **The ONIX reminder** {OMP}: the "Export" tab opens with "This press
     is missing some required information for ONIX metadata used in this
     export. Please go to Press Settings and fill in the missing
     details.", "Press Settings" a link to Settings › Press; a journal's
     and a preprint server's export tabs have no such line
     [OMP2](#omp2) (Rule 19; Settings bullet 7).
   - **"Select All"**: press "Select All": every line is ticked and the
     button reads "Select None". Press "Select None": every line is
     unticked (Rule 15).
   - **Exporting**: tick "Okapi field notes" and "Axolotl limb memory"
     and press "Export Articles" ("Export Submissions", "Export
     Preprints"): a tab "Export Submissions Results" opens, reading "The
     export completed successfully. Download the exported file from the
     button below." above "Download Exported File". Press "Download
     Exported File": an .xml file downloads, holding "Okapi field notes"
     and "Axolotl limb memory" (Rule 16).
   - **"Close"**: press "Close" on "Export Submissions Results": the tab
     goes, and the page shows "Export Issues" ("Export" on a press,
     "Export Preprints" on a preprint server) (Fields).
   - **"Export Issues"** {OJS}: the tab lists both issues under the
     columns "Select", "Issue" and "Items", the published one with 1
     item and the unpublished one with 0. Tick the published issue and
     press "Export Issues": a tab "Export Issues Results" opens with the
     same sentence and "Download Exported File", which downloads an .xml
     file holding the issue with "Axolotl limb memory" (Rule 18; Fields).
   - **"Filters"**: on the export tab press "Filters": a panel shows
     beside the list, holding under "Stages" "Submission", "Review",
     "Copyediting" and "Production" ("Submission", "Internal Review",
     "External Review", "Copyediting" and "Production" on a press,
     "Production" alone on a preprint server), under "Activity" "Days
     since last activity" with an "Add filter" button, and on a journal
     and a preprint server, under "Sections", one line per section.
     On a journal and a press, press "Review" ("External Review" on a
     press): only "Quokka survey" is listed; press "Submission" too:
     "Okapi field notes" and "Quokka survey" are listed. On a preprint
     server press "Production":
     "Okapi field notes" and "Quokka survey" are listed. "Axolotl limb
     memory", published, matches no stage ⚠ [A10](#a10) (Rule 14a;
     Fields).
   - **Search and "View"**: type Okapi in the search box: the list does
     not change until Enter is pressed. Press Enter: only "Okapi field
     notes" is listed. Press its "View": its workflow screen opens
     (Rule 14).
   - **Control**: the file downloaded under "Exporting" holds no "Quokka
     survey", which was not ticked (Rule 16). <sup>sc</sup>

4. **Importing submissions from another journal**

   Given: Journal Manager of two scratch journals, A holding a submitted
   submission "Okapi field notes" with one contributor and one file, B
   holding none, and, as files on the computer, a Native XML file of an
   article placed in an issue of volume 99, number 9, year 2099, which B
   lacks {OJS}, one of a monograph naming a series with the path "zzz"
   and the title "Zed Series", which B lacks {OMP}, and one holding a
   submission "Wombat notes" followed by an element the format does not
   know.

   - **A's file**: on A's "Native XML Plugin" page tick "Okapi field
     notes" on the export tab, press "Export Articles" ("Export
     Submissions", "Export Preprints"), then "Download Exported File": an
     .xml file downloads (Rule 16).
   - **Choosing the file**: on B's "Native XML Plugin" page, on
     "Import", press "Upload File" and choose A's file: its name shows
     in the box and the button reads "Change File" (Rule 8).
   - **"Import"**: press "Import": a tab "Import Results" ("Results" on
     a press) opens, reading "The import completed successfully. The
     following items were imported:" and, under a heading, the line
     ""{number}" - "Okapi field notes"", {number} being its new number
     in B. Any "Errors occured:" lines under it are left unread ⚠
     [A8](#a8) (Rules 9, 10).
   - **B's Dashboard**: B's Dashboard lists "Okapi field notes" in
     "Submission" ("Production" on a preprint server), the stage it had
     in A, and its workflow screen shows its contributor and its file.
     The mail catcher holds no email from the import (Rule 10; Side
     effects bullet 1).
   - **An unknown issue** {OJS}: back on B's "Import", press "Change
     File", choose the volume 99 file and press "Import": another
     "Import Results" tab opens with the success text of "Import",
     followed by the line "None or more than one issue matches the given
     issue identification "…"." with the file's issue details inside
     the quotes. B's issues now include an unpublished issue of volume
     99, number 9, year 2099 ([Issues](U50-issues.md)) (Rule 12).
   - **An unknown series** {OMP}: back on B's "Import", press "Change
     File", choose the "zzz" file and press "Import": another "Results"
     tab opens with the success text, then "Warnings encountered:" and a
     line with "Unknown series zzz". B's Settings › Press › "Series" now
     lists "Zed Series" [OMP3](#omp3) (Rule 12a).
   - **A file that does not match the format**: back on B's "Import",
     press "Change File", choose the "Wombat notes" file and press
     "Import": another results tab opens, reading "The process failed.
     Check below for errors/warnings.", then "Errors occured:" and
     "Validation errors:", each followed by lines. B's Dashboard has no
     "Wombat notes" (Rule 11).
   - **Control**: A's Dashboard still lists "Okapi field notes",
     unchanged by the export (Side effects bullet 3). <sup>sc</sup>

5. **Importing users** {OJS OMP}

   Given: Journal Manager of a scratch journal holding a throwaway
   Author "kiwi" (email kiwi@mail.test), and, as files on the computer,
   two users files: the first gives a new user "nova" (nova@mail.test)
   the plain password "novapass1" and the roles "Copyeditor", "Reader"
   and "Quokka Wrangler", a name the journal lacks; the second gives a
   new user "wren" (wren@mail.test) a password stored another way than
   this installation stores passwords, the user "kiwi" with the email
   kiwi.other@mail.test, and a new user "tui" (tui@mail.test) the plain
   password "tuipass12", each with the role "Reader".

   - **The page**: open Tools › "Users XML Plugin": its tabs are "Import
     Users" (open) and "Export Users". "Import Users" holds the
     paragraph "Select an XML data file containing user information to
     import into this journal. See the journal help for details on the
     format of this file." ("…into this press. See the press help…" on a
     press), the paragraph "Note that if the imported file contains any
     usernames or email addresses that already exist in the system, the
     user data for those users will not be imported and any new roles to
     be created will be assigned to the existing users.", the upload box
     headed "File" and the "Import Users" button (Rule 21; Fields).
   - **The first file**: press "Upload File" and choose the first file:
     its name shows and the button reads "Change File". Press "Import
     Users": a tab "Results" opens, reading "The import completed
     successfully. Users with usernames and email addresses that are not
     already in use have been imported, along with accompanying user
     groups." (Rule 22).
   - **nova's account**: Settings › Users & Roles › "Users" lists
     "nova" with the roles "Copyeditor" and "Reader" and no other
     (Rules 23, 24).
   - **nova signs in**: nova signs in with "novapass1": the sign-in
     succeeds (Rule 25).
   - **The second file**: back on "Import Users", press "Change File",
     choose the second file and press "Import Users": a second "Results"
     tab opens, reading "Import/Export errors:", then the lines "The
     imported user "wren" password could not be imported as is. A new
     password is been send to the user email. The user has been
     imported." and "The username "kiwi" and the e-mail
     "kiwi.other@mail.test" do not match to the one and the same
     existing user.", and no success sentence (Rules 22, 23, 25).
   - **The accounts**: the "Users" list now holds "wren" and "tui", each
     with "Reader"; "kiwi" still has the email kiwi@mail.test and the
     role "Author" alone, and no account has kiwi.other@mail.test
     (Rules 22, 23).
   - **The email**: the mail catcher holds a "Journal Registration"
     email ("Press Registration" on a press) to wren@mail.test, sent
     from the Journal Manager with the journal's principal contact as
     the address to reply to, carrying wren's new password (Actors row
     4; Rule 25; Side effects bullet 2).
   - **wren signs in**: wren signs in with the emailed password: the
     account must change its password before going on (Rule 25).
   - **Control**: the mail catcher holds no email to nova, tui or kiwi,
     and none to the Journal Manager (Actors row 4). <sup>sc</sup>

   A preprint server has no "Users XML Plugin" (scenario 1).

6. **Moving users from one journal to another** {OJS OMP}

   Given: Journal Manager of two scratch journals A and B, A holding the
   throwaway accounts "moss", a Copyeditor, and "fern", an Author, which
   hold no role in B; every account of A's list has signed in since it
   was created.

   - **The "Export Users" tab**: on A's "Users XML Plugin" page press
     "Export Users": the list titled "Current Users", with "Export All
     Users" and "Search" at its top right and the columns "Select",
     "Given Name", "Family Name", "Username" and "Email" ("Email
     address" on some installs; Fields), lists "moss" and "fern", with
     "Export Users" under it (Rule 26; Fields).
   - **The filter**: press "Search" at the list's top right: a text box,
     a list of the journal's roles reading "All Roles" and a "Search"
     button show. Type moss in the box and press the "Search" button:
     only "moss" is listed and the filter closes. Press "Search" at the
     list's top right, clear the box, choose "Author" in the roles list
     and press the "Search" button: "fern" is listed and "moss" is not.
     Press "Search" at the list's top right, choose "All Roles" and press
     the "Search" button: both are listed again. Press "Search" at the
     list's top right: the filter shows; press it again: the filter
     hides (Rule 26; Fields).
   - **Ticked rows**: tick "moss" and press "Export Users": an .xml file
     downloads, holding "moss" alone (Rule 27).
   - **"Export All Users"**: press "Export All Users": a window titled
     "Confirm" asks "Are you sure you wish to export all users?". Press
     "Cancel": the window closes and nothing downloads. Press "Export
     All Users" again and "OK": an .xml file downloads, holding every
     account the list holds, "moss" and "fern" among them with their
     roles in A (Rule 27).
   - **Journal B's import**: on B's "Users XML Plugin" page press
     "Upload File", choose that file and press "Import Users": the
     "Results" tab reads "The import completed successfully. Users with
     usernames and email addresses that are not already in use have been
     imported, along with accompanying user groups."; on a server whose
     PHP is older than 8.4 it reads instead "Import/Export errors:" with
     the line of Rule 25's last row for each account of the file and no
     other line ⚠ [A16](#a16). Either way every account of the file is
     imported (Rules 22, 28).
   - **B's users**: B's Settings › Users & Roles › "Users" lists "moss"
     as Copyeditor and "fern" as Author (Rules 23, 28).
   - **moss signs in**: moss signs in to B with the password it had in
     A: the sign-in succeeds (Rule 23).
   - **Control**: the mail catcher holds no email to moss or fern from
     the import (Rule 28). <sup>sc</sup>

   A preprint server has no "Users XML Plugin" (scenario 1).

7. **PubMed: the NLM title and the lists** {OJS}

   Given: Journal Manager of a scratch journal whose "NLM Title
   Abbreviation" was never saved (a new journal's state), holding
   "Axolotl limb memory", published in its published issue, beside an
   unpublished issue with nothing in it, and "Okapi field notes",
   submitted.

   - **The page**: open Tools › "PubMed XML Export Plugin": its tabs are
     "Settings" (open), "Export Articles" and "Export Issues" (Rule 29).
   - **"NLM Title Abbreviation"**: the Settings tab holds the empty box
     under "The NLM Title Abbreviation for the journal. If you do not
     know the abbreviation, search the NLM Catalog.", its last words a
     link to the NLM Catalog. Type J Pub Knowl in the box and press
     "Save": the notice "Your changes have been saved." shows (Rule 30;
     Fields).
   - **"Export Articles"**: the tab lists "Axolotl limb memory" and
     "Okapi field notes". Press "Select All": both are ticked and the
     button reads "Select None". Press "Select None": both are unticked.
     "Export Articles" sits under the list and is not pressed here ⚠
     [OJS4](#ojs4) (Rules 15, 31).
   - **"Export Issues"**: the tab lists both issues under the columns
     "Select", "Issue" and "Items", the published one with 1 item and
     the unpublished one with 0, with "Export Issues" under the list,
     not pressed here (Rules 18, 32).
   - **Control**: reload the page: it opens on "Settings" again, and
     "NLM Title Abbreviation" reads "J Pub Knowl" (Rule 30).
     <sup>sc</sup>

   A press and a preprint server have no PubMed tool (scenario 1).

8. **DOAJ: exporting and marking articles** {OJS}

   Given: Journal Manager of a scratch journal with "DOAJ Plugin" ticked
   and no API key saved (a new journal's state), whose published issue
   holds two published articles by the Author Ada Lovelace, "Okapi
   forest census" and "Axolotl limb memory", beside a submitted
   "Quokka survey".

   - **The page**: open Tools › "DOAJ Export Plugin": the page is headed
     "DOAJ Export Plugin", with the trail "Tools" › "DOAJ Export
     Plugin", and its tabs are "Settings" (open) and "Articles" (Rules
     4, 34).
   - **The Settings tab**: it holds the link "Contact DOAJ for
     inclusion"; "DOAJ API Key" under "If you would like to register
     articles from within OJS, please enter your DOAJ API Key. Else,
     you'll still be able to export into the DOAJ XML format but you
     cannot register your articles with DOAJ from within OJS.", its box
     empty, with "You will find your API key on your DOAJ user page."
     under it; and the box "OJS will deposit articles automatically to
     DOAJ. …", unticked (Rules 35, 43; Fields).
   - **The Articles tab**: press "Articles": the list titled "Articles",
     with "Search" at its top right and the columns "Select", "ID",
     "Author; Title", "Issue" and "Status", holds two rows, "Lovelace;
     Okapi forest census" and "Lovelace; Axolotl limb memory", each
     naming the issue under "Issue" and reading "Not Deposited" under
     "Status", and no "Quokka survey"; under it the line "1 - 2 of 2
     items". Under the list "Validate XML before the export and
     registration." is ticked, beside "Export" and "Mark registered",
     and there is no "Register" (Rules 36–38, 40).
   - **Nothing ticked**: press "Export": the tab shows again with the
     notice "No objects selected.". Press "Mark registered": the same
     (Rule 39).
   - **"Export"**: untick "Validate XML before the export and
     registration.", tick "Okapi forest census" and press "Export": the
     DOAJ file of "Okapi forest census" downloads, and both rows still
     read "Not Deposited" (Rule 40).
   - **"Mark registered"**: tick "Axolotl limb memory" and press "Mark
     registered": the tab shows again, "Axolotl limb memory" reading
     "Marked registered" and "Okapi forest census" "Not Deposited"
     (Rule 41).
   - **The filter**: press "Search": a list reading "Article Title"
     beside a text box, a list reading "Any Issue", a list reading "Any
     Status" and a "Search" button show. Choose "Marked registered" in
     the status list and press "Search": only "Axolotl limb memory" is
     listed (Rule 36a; Fields).
   - **A new version**: press "Lovelace; Axolotl limb memory": its
     workflow screen opens (Rule 36). Publish a new version of it there
     ([Publish schedule & versions](U49-publish-schedule-and-versions.md)),
     then open the DOAJ "Articles" tab again: "Axolotl limb memory"
     reads "Needs Sync" (Rule 44).
   - **Control**: "Okapi forest census", never marked, still reads "Not
     Deposited" (Rule 37). <sup>sc</sup>

   A press and a preprint server have no DOAJ tool (scenario 1).

9. **DOAJ: registering articles** {OJS}

   Given: Journal Manager of a scratch journal with "DOAJ Plugin" ticked
   and no API key saved, whose published issue holds two published
   articles, "Okapi forest census" and "Axolotl limb memory".

   - **No key**: open Tools › "DOAJ Export Plugin" and press "Articles":
     under the list sit "Export" and "Mark registered", and no
     "Register" (Rule 38).
   - **Saving a key**: press "Settings" and type u63-dummy-key in "DOAJ
     API Key": the characters show as dots. Press "Save": the notice
     "Your changes have been saved." shows. Reload the page: the
     Settings tab shows the "DOAJ API Key" box again, its characters as
     dots (Rule 35; Fields).
   - **"Register" offered**: press "Articles": the buttons under the
     list read "Register", "Export" and "Mark registered", in that order
     (Rule 38; Settings bullet 3).
   - **Nothing ticked**: press "Register": the tab shows again with the
     notice "No objects selected." (Rule 39).
   - **"Register"**: untick "Validate XML before the export and
     registration." ⚠ [OJS8](#ojs8), tick "Okapi forest census" and
     press "Register": the tab shows again with the notice "Articles
     submitted successfully" and "Okapi forest census" reading
     "Submitted" (Rule 42). DOAJ's answer is not awaited, since the test
     installs cannot reach DOAJ ⚠ [OJS9](#ojs9).
   - **Control**: "Axolotl limb memory", not ticked, still reads "Not
     Deposited" (Rule 37). <sup>sc</sup>

   A press and a preprint server have no DOAJ tool (scenario 1).

10. **DOAJ with "DOI Versioning"** {OJS}

    Given: Journal Manager of a scratch journal with DOIs on, "DOI
    Versioning" "Yes" and "DOAJ Plugin" ticked, whose published issue
    holds "Okapi forest census", published once (its version of record
    1.0).

    - **The tabs**: open Tools › "DOAJ Export Plugin": its tabs are
      "Settings" and "Publications" (Rule 34; Settings bullet 5).
    - **The Publications tab**: press "Publications": the list titled
      "Publications", with the columns "Select", "Submission ID",
      "Publication Stage", "Author; Title" and "Status", holds one row
      for "Okapi forest census", reading "VoR 1.0" and "Not Deposited"
      (Rule 45; Fields).
    - **A minor version**: publish version 1.1 of "Okapi forest census"
      ([Publish schedule & versions](U49-publish-schedule-and-versions.md)):
      the Publications tab's row reads "VoR 1.1" in place of "VoR 1.0"
      (Rule 45).
    - **A major version**: publish version 2.0 of it: the tab holds two
      rows, "VoR 1.1" and "VoR 2.0" (Rule 45).
    - **An unpublished version**: create version 2.1 of it and leave it
      unpublished: the tab still holds "VoR 1.1" and "VoR 2.0" alone
      (Rule 45).
    - **"Mark registered"**: tick the "VoR 2.0" row and press "Mark
      registered": it reads "Marked registered" (Rules 41, 45).
    - **"DOI Versioning" back to "No"**: on Settings › Distribution ›
      "DOIs" set "DOI Versioning" to "No" and save
      ([DOIs](U45-dois.md)): the DOAJ page's tabs read "Settings" and
      "Articles" (Rule 34).
    - **Control**: on "Articles", "Okapi forest census" reads "Not
      Deposited", although its "VoR 2.0" row read "Marked registered"
      (Rule 45). <sup>sc</sup>

    A press and a preprint server have no DOAJ tool (scenario 1).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the roles' masthead choices and start dates carried from one
    journal to another (Rules 24a, 24b, 28; A2 and A3 retired): in
    scenario 6, moss's
    Copyeditor role in A given a start date in the past and fern's
    Author role set to "Does not appear on the masthead", both read on
    B's roles pages and "Editorial Masthead" after the move
  - a reviewer role imported as "Appear on the masthead" whatever the
    file says (Rule 24a), a role the file gives no start date starting
    on the day of the import, and a role the file gives as ended listed
    on "Editorial History" with the file's years (Rule 24b)
  - a submission's plain language summary, data availability statement
    and funding statement carried from one journal to another (Rule 20):
    in scenario 4, "Okapi field notes" given all three in A, each read
    on B's copy after the import
  - an account whose only role has ended, left off "Export Users" and
    out of the "Export All Users" file, while one with a role that ends
    on a later date is listed (Rules 26, 27)
  - the guard for A1 (Rule 5; issue report
    `docs/issues/U63-A1-tools-absent-tool-address-raw-json.md`): the
    address of a tool the installation lacks, such as the Crossref
    tool's on a press, answering "not found" (404)
  - the guard for A4 (Rule 25; issue report
    `docs/issues/U63-A4-users-import-refused-password-creates-account.md`):
    a users file with a plain password shorter than the site's minimum,
    the user named in the results and no account created
  - the guard for A6 (Rule 8; issue report
    `docs/issues/U63-A6-upload-file-keyboard-unreachable.md`): on the
    Native XML "Import" tab, Tab from the tab's name reaching "Upload
    File", and Enter there opening the computer's file picker
  - the guard for A7 (Rule 9; issue report
    `docs/issues/U63-A7-import-results-tab-imports-again.md`): a file
    imported, then the "Import" tab and the "Import Results" tab chosen
    again, no second import sent and one new submission on the Dashboard
  - the guard for A8's issue line (Rule 10a; issue report
    `docs/issues/U63-A8-native-import-article-without-issue-lists-error.md`):
    an article not assigned to an issue exported and imported, its
    results tab with no "Errors occured:"
  - the guard for A8's contributor roles (Rule 10a; issue report
    `docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md`):
    a submission with a contributor role other than "Author" exported
    and imported into a second journal, press or preprint server, the
    role read on its "Contributors" page
  - the guard for A9 (Rule 12a; issue report
    `docs/issues/U63-A9-import-unknown-section-broken-submission.md`): a
    file naming a section the journal lacks, "The process failed…" with
    "Unknown section …" and no new submission {OJS OPS}
  - the guard for A10 (Rule 14a; issue report
    `docs/issues/U63-A10-export-list-published-no-stage.md`): the export
    list's "Published" filter listing the published submissions
  - the guard for A11 (Rule 15a; issue report
    `docs/issues/U63-A11-export-selection-stops-at-page.md`): on a
    context with more than 100 submissions, a line ticked on each of two
    pages, both in the exported file
  - the guard for A12 (Rules 16, 18; issue report
    `docs/issues/U63-A12-export-nothing-ticked-empty-results-tab.md`):
    each export button pressed with nothing ticked, the notice shown and
    no tab added
  - the guard for A13 (Rule 22a; issue report
    `docs/issues/U63-A13-users-import-unreadable-file-empty-results.md`):
    a users file that fails the format, "Validation errors:" in the
    "Results" tab and no account created {OJS OMP}
  - the guard for A15 (Rule 25; issue report
    `docs/issues/U63-A15-users-import-existing-account-told-new-password.md`):
    a users file of existing accounts whose passwords are SHA-1 values,
    the "Results" tab reading only "The import completed successfully."
    sentence {OJS OMP}
  - the guard for A16 (Rule 25; issue report
    `docs/issues/U63-A16-users-import-resets-installation-passwords.md`):
    in the users-import scenario, a new account whose file password is a
    hash this installation wrote, imported with no results line and no
    email and signing in with its password, on PHP 8.2 and 8.3 as on
    8.4 {OJS OMP}
  - the guard for OJS1 (Rule 36; issue report
    `docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md`):
    the issue window opened from the DOAJ Articles list, for an issue
    whose name holds "&", headed "Issue Management: {issue}"
  - the guard for OJS2 (Rule 3; issue report
    `docs/issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md`):
    with "DOAJ Plugin" off, the Plugins list leaving "DOAJ Export Plugin"
    out
  - the guard for OJS4 and OJS7 (Rules 31, 32, 40; issue report
    `docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md`):
    on an install that cannot reach NLM's or DOAJ's site, the PubMed
    exports and the validated DOAJ export downloading their file
  - the guard for OJS5's "Cancel" (Rule 35a; issue report
    `docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md`): the
    PubMed and DOAJ "Settings" tabs offering no "Cancel", and a tab
    switch with an unsaved change asking
  - the guard for OJS5's note (Rule 35a; issue report
    `docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md`):
    the PubMed and DOAJ "Settings" tabs carrying no required-fields note
  - the guard for OJS6 (Rule 36a; issue report
    `docs/issues/U63-OJS6-doaj-list-search-matches-letter-case.md`): the
    DOAJ list's "Article Title" and "Authors" search typed in lower case
    finding the article
  - the guard for OMP1 (Rule 6; issue report
    `docs/issues/U63-OMP1-omp-tools-csv-import-blank-page.md`): every
    link in Tools › "Import/Export", on all three apps, opening a page
    with a heading and no server error
- **Nothing new to test**:
  - "Import" pressed with no file up, and with a file that is not XML
    (Rule 13)
  - "Import Users" pressed with no file up, and pressed again with the
    imported file still in the box (Rule 22b)
  - a second press of the same "Download Exported File", and the
    results tab chosen again to run the export once more (Rule 17)
  - a file left up without importing, then the page left (Rule 8)
  - "View" on an unfinished submission, opening "Make a Submission"
    (Rule 14)
  - the users "Results" tabs' "Close", and a reload removing every
    "Results" tab (Fields)
  - the DOAJ list past one page, and its "Items per page" (Rule 36)
  - the press's ONIX details all filled, with no reminder {OMP} (Rule
    19; Settings bullet 7)
  - a site minimum password length other than 6 (Rule 25; Settings
    bullet 8)
  - a tool's page opened from "Import/Export Data" on the Plugins list
    (Rule 4)
  - the "Export Issues" list's issue name, opening "Issue Management:
    {issue}" {OJS} (Fields)
  - the Production Editor {OJS OMP}, offered the Editor's Tools page of
    scenario 1 (Actors row 1; Settings bullet 1)
  - the Editor with "Permit changes to Settings" ticked, the install
    default: the same Tools page (Settings bullet 1)
  - the Site Administrator, who holds a Journal Manager role in every
    journal of the test installs: the Journal Manager's Tools page of
    scenario 1 (Actors row 1)
- **Register carries it**:
  - A1 (an address naming a tool the installation lacks; Rule 5)
  - A4 (a short or empty plain password; Rule 25)
  - A5 (the daily deposit taking other journals' "Needs Sync" articles,
    and a replaced version; Rule 43)
  - A6 ("Upload File" from the keyboard; Rule 8)
  - A7 (a second "Import" press, and an earlier results tab chosen
    again; Rule 9)
  - A8 (the "Errors occured:" lines of a round trip; Rule 10a; scenario
    4 marks it)
  - A9 (an unknown section {OJS OPS}; Rule 12a)
  - A10 (a published submission under the stage filters; Rule 14a;
    scenario 3 marks it)
  - A11 (more submissions than one page; Rule 15a)
  - A12 (an export with nothing ticked; Rules 16, 18)
  - A13 (a users file that does not match the format; Rule 22a)
  - A14 ("Export Users" with no row ticked; Rule 27)
  - A15 (an existing account given a password stored another way; Rules
    25, 28)
  - A16 (a new account imported on a server whose PHP is older than 8.4,
    and a password stored that PHP's default way kept; Rule 25; scenario
    6 marks the line for existing accounts)
  - A17 (the same users file imported again with a role starting or
    ending on a later date; Rule 24)
  - A18 (a users file with an empty or unreadable role date; Rule 22c)
  - A19 (a tool's address with the tool's name left off; Rule 5)
  - A20 (a title with a prefix exported and imported; Rule 20)
  - A21 (a users file whose user has no registration date; Rule 22d)
  - A22 (an account whose only role starts on a later date, left off
    "Export Users"; Rule 26)
  - OJS1 (the DOAJ list's issue window heading; Rule 36)
  - OJS2 (the "DOAJ Export Plugin" row kept on the Plugins list while
    "DOAJ Plugin" is off; Rule 3)
  - OJS3 ("NLM Title Abbreviation" saved empty; Rule 30)
  - OJS4 (PubMed exports where NLM's site cannot be reached; Rules
    31–32; scenario 7 marks it)
  - OJS5 (an unsaved Settings change and the forms' "Cancel"; Rule 35a)
  - OJS6 (the DOAJ list's search in another letter case; Rule 36a)
  - OJS7 (a validated DOAJ "Export" where DOAJ's site cannot be
    reached; Rule 40)
  - OJS8 ("Register" not held back by the validation box; Rule 42;
    scenario 9 marks it)
  - OJS9 (a deposit that cannot reach DOAJ staying "Submitted"; Rule 42;
    scenario 9 marks it)
  - OJS10 (the order of the "Export Issues" list; Rule 18)
  - OMP1 (the press's "Tab Delimited Content Import Plugin" link; Rule
    6; scenario 1 marks it)
- **No seed**:
  - the PubMed file downloading, and the journal title it carries: the
    journal's name before "NLM Title Abbreviation" is saved, the
    abbreviation after (Rules 30, 31; Settings bullet 6), since the test
    installs cannot reach NLM's site
  - a deposit DOAJ answers: "Registered", or "Failed" with DOAJ's
    message (Rule 37), since the test installs cannot reach DOAJ
  - the daily automatic deposit (Rule 43; Settings bullet 4), for the
    same reason
- **Owned by another feature**:
  - the Crossref and DataCite tools' pages (Rules 4, 6;
    *[DOIs](U45-dois.md)*, Rule 44, left out of its scenarios)
  - the "Permissions" tab and its reset (Rule 1;
    *[Publication metadata](U40-publication-metadata.md)*, scenario 7)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | Opening the address of a tool the installation lacks shows the tool list as raw JSON | 🐞 | low | issues (claude), 2026-09-30 — re-verified |
| [A4](#a4) | A users import says a user with a short or empty password "has not been imported", yet creates the account | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A5](#a5) | One journal's daily DOAJ deposit sends other journals' "Needs Sync" articles to DOAJ as its own | 🐞 | high | issues (claude), 2026-09-30 — re-verified |
| [A6](#a6) | Keyboard users cannot choose a file in Native XML import, authors' revision uploads and other legacy upload forms | 🐞 | high | issues (claude), 2026-09-30 — re-verified |
| [A7](#a7) | Going back to an earlier Native XML "Import Results" tab imports the file again, duplicating submissions and published articles | 🐞 | high | issues (claude), 2026-09-30 — re-verified |
| [A8](#a8) | Importing a file the app itself exported lists "Errors occured:" under the success text, and into another context makes every contributor an "Author" | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A9](#a9) | Native XML import of an article whose section the journal lacks leaves a broken submission and empties the export list | 🐞 | medium · crash: both | issues (claude), 2026-09-30 — re-verified |
| [A10](#a10) | Export list's "Stages" filters leave out every published submission, with no "Published" stage to pick | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A11](#a11) | Export list with more than one page: ticks on other pages are left out of the file, and "Select All" cannot be undone | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A12](#a12) | A Native XML export with nothing ticked opens an empty results tab: the server fails | 🐞 | low · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A13](#a13) | A users file the Users XML Plugin cannot read ends in a blank "Results" tab, with no reason given | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A15](#a15) | A users import says an existing account was emailed a new password, but nothing is sent or changed | 🐞 | low | issues (claude), 2026-09-30 — re-verified |
| [A16](#a16) | On PHP 8.2 or 8.3, a users import drops the file's passwords and mails each new account a new one | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A17](#a17) | Importing the same users file again adds a role that starts or ends on a later date once more | 🐞 | minor | — |
| [A18](#a18) | A users file with an empty or unreadable role date stops part-way: the server fails, the tab stays empty, the user gets no role | 🐞 | user-visible · crash: server | — |
| [A19](#a19) | A tool's address with the tool's name left off opens a blank page: the server fails | 🐞 | minor · crash: server | — |
| [A20](#a20) | A Native XML round trip doubles a title's prefix: the copy is titled "The The …" | 🐞 | user-visible | — |
| [A21](#a21) | A users file whose user has no registration date stops part-way: the server fails and the "Results" tab stays empty | 🐞 | user-visible · crash: server | — |
| [OJS1](#ojs1) | Pressing an issue in the DOAJ Articles list opens its window headed "DOI Plugin Settings" | 🐞 | low | issues (claude), 2026-09-30 — re-verified |
| [OJS2](#ojs2) | With "DOAJ Plugin" switched off, the Plugins list still offers the DOAJ tool, whose link shows raw JSON | 🐞 | low | issues (claude), 2026-09-30 — re-verified |
| [OJS3](#ojs3) | PubMed files carry an empty journal title once a manager saves "NLM Title Abbreviation" empty | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [OJS4](#ojs4) | Where NLM's site cannot be reached, every PubMed export fails with a "Validation errors:" page | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [OJS5](#ojs5) | The PubMed and DOAJ Settings forms' "Cancel" keeps the change for the next "Save", and both say fields are required when none is | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [OJS6](#ojs6) | On PostgreSQL, the DOAJ Articles list's title and author search is case-sensitive | 🐞 | low | issues (claude), 2026-09-30 — re-verified |
| [OJS7](#ojs7) | Where DOAJ's site cannot be reached, every validated DOAJ export fails with a "Validation errors:" page | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [OJS9](#ojs9) | A DOAJ "Register" that cannot reach DOAJ leaves the article reading "Submitted" for good, never "Failed" | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [OJS10](#ojs10) | "Export Issues" lists the journal's issues in no set order | 🐞 | minor | — |
| [OMP1](#omp1) | Pressing "Tab Delimited Content Import Plugin" in a press's Tools list opens a blank page | 🐞 | low · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A14](#a14) | "Export Users" with no row ticked ends on a blank page: the server fails | ❓ | minor · crash: server | — |
| [A22](#a22) | "Export Users" leaves out an account whose only role starts on a later date | ❓ | minor | — |
| [OJS8](#ojs8) | DOAJ "Register" checks nothing, "Validate XML before the export and registration." ticked or not | ❓ | minor | — |
| [OMP2](#omp2) | A press's Native XML export reminds the manager to fill in the press's ONIX details | ✅ | minor | — |
| [OMP3](#omp3) | A press's import creates a series the file names but the press lacks | ✅ | minor | — |
| [A2](#a2) | Retired: a users import keeps each role's masthead choice, and an export writes it | ✅ | retired | upstream change + claim check (claude), 2026-09-29 — fixed upstream |
| [A3](#a3) | Retired: a users import keeps each role's start date | ✅ | retired | upstream change + claim check (claude), 2026-09-29 — fixed upstream |

### All apps

<a id="a1"></a>
**A1 — Opening the address of a tool the installation lacks shows the tool list as raw JSON** · 🐞 · low.
A manager who opens the address of an import/export tool that the
installation does not have expects a "not found" page. An example is the
address of a journal's Crossref tool, opened on a press, which has no
Crossref tool. Instead the browser shows a bare page of JSON text, with
no heading, no menu and no link back.
The JSON is the list that the Tools page's "Import/Export" tab shows:
each tool's name, its link and its one-line description, and nothing
more. Only users who can open Tools see it (a manager-level role or the
site administrator). Anyone else is refused, as before.
The way back is the browser's back button or "Tools" in the side menu.
Since: 2016-07-11 · Basis: probe, 2026-09-30. <sup>f-a1</sup>

<a id="a4"></a>
**A4 — A users import says a user with a short or empty password "has not been imported", yet creates the account** · 🐞 · medium.
For a user whose plain-text password in the file is shorter than the
site's minimum, or empty, the results say "The user has not been
imported."; the account is nevertheless created, with its roles, and no
password signs in to it until someone resets it. The manager is told
the opposite of what happened.
When the refused user is someone who already has an account (the same
username and email), that account's password is left as it was, but
the account gains the roles the file names, although the results say
it was not imported. The other users in the file import normally.
Only files written by hand or by another system are affected. The
app's own "Export Users" writes each password already encrypted, and
the import takes those without the length check. {OJS OMP}
Since: 2018-04-30 · Basis: probe, 2026-09-30. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — One journal's daily DOAJ deposit sends other journals' "Needs Sync" articles to DOAJ as its own** · 🐞 · high.
On an installation that hosts several journals, the daily automatic
DOAJ deposit of a journal also takes the articles of other journals
whose DOAJ status reads "Needs Sync". It sends them to DOAJ with its
own API key and as its own articles: under its own journal name and
ISSNs, with a link built on its own address, where the article does not
exist and the site shows "not found". The article's own journal sent
nothing, yet its DOAJ list now reads "Submitted".
A journal without "DOI Versioning" takes other such journals'
articles; a journal with it takes other such journals' versions. The
Even when the article's own journal deposits automatically, a
depositing journal listed before it on Administration › "Hosted
Journals" takes the article, and the article's journal sends nothing.
Only when the article's journal comes first does it send its own.
A journal with "DOI Versioning" also sends a version a later minor
version replaced: with 1.0 and 1.1 both "Needs Sync", the run sends
both, while the "Publications" list shows only "VoR 1.1" go from
"Needs Sync" to "Submitted".
Nobody is told, and the article's journal has no setting that prevents
it. Where the article already has a DOAJ record, the run first asks
DOAJ to delete that record, with the depositing journal's key.
An article reads "Needs Sync" once it has been deposited to DOAJ (or
marked as deposited) and its current version is then unpublished,
published again or replaced by a newly published version. {OJS}
Since: 2025-10-07 · Basis: probe, 2026-09-30. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Keyboard users cannot choose a file in Native XML import, authors' revision uploads and other legacy upload forms** · 🐞 · high.
On the Native XML Plugin's "Import" tab, the Tab key should stop on
"Upload File". Instead it skips the button and the box and goes straight
to "Import", so a manager who works without a mouse cannot choose a file
to import.
The same happens in every legacy upload form, the ones built on the
shared "Drag and drop a file here to begin upload" box. These include
the "Upload File" window that a submission's workflow file lists open,
where an author uploads revisions and editors upload files at every
stage. They also include the Users XML import, plugin upload, library
files, issue cover images and galleys, series cover images and profile
images. The author's "Start A New Submission" wizard uses a newer upload
control, which the keyboard reaches.
Keyboard users have no way round: only a mouse click or a dropped file
chooses one. The keyboard reached the button until a 2018 library
upgrade, first released in 3.1.2.
Since: 2018-10-22 · Basis: probe, 2026-09-30. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Going back to an earlier Native XML "Import Results" tab imports the file again, duplicating submissions and published articles** · 🐞 · high.
A manager imports a file with Tools › "Native XML Plugin" and gets an
"Import Results" tab ("Results" on a press). If they choose another tab
on that page and then that results tab again, the app runs the whole
import once more. The tab reads as before, apart from the new
submission numbers.
Each return adds another copy of every item in the file, and no warning
is shown. Articles that the file marks as published are published
again: a journal's issue table of contents lists each of them once per
copy. No screen deletes the copies.
Since: 2014-04-17 · Basis: probe, 2026-09-30. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A clean round trip reports errors** · 🐞 · medium.
Importing a file the app itself exported, unchanged, should read as a
plain success; the success text is followed by "Errors occured:" with a
line for each contributor exported without a country and, on a journal,
"The issue identification element is missing for the article …" for
each article that is not assigned to an issue, in any journal and with
any file, the journal's own export included. Nothing is wrong with those
articles: an article that has not been given an issue has none to name.
Imported into another journal, press or preprint server, the file also
gives every contributor, authors included, the line "The author
'{name}' does not have any contributor role. Defaults to AUTHOR.", and
every contributor then is an "Author": a book's "Volume editor" and
"Chapter Author" contributors lose their role, and only editing each
contributor puts it back. The items are imported all the same, and
these lines stand in one list with the file's real problems, with
nothing to tell them apart.
Since: 2020-02-26 (the issue line), 2025-11-20 (the contributor roles) · Basis: probe, 2026-09-30. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Native XML import of an article whose section the journal lacks leaves a broken submission and empties the export list** · 🐞 · medium · crash: both.
A journal or preprint server manager imports a Native XML file whose
article names a section the journal does not have. The server fails and the "Import
Results" tab stays empty, with no message. The manager expects the
import to be refused with the line "Unknown section …".
The article is kept all the same, as a broken submission. Its Dashboard
row shows only its number and stage, and its "View" opens nothing. While
it exists, the Native XML plugin's "Export Articles" list is empty, so
no article can be exported from that screen. No screen can delete the
broken submission, and each retry of the import adds another.
A file exported from another journal carries that journal's section
abbreviations, so an import meets this whenever the two journals'
abbreviations differ. {OJS OPS}
Basis: probe, 2026-09-30. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Export list's "Stages" filters leave out every published submission, with no "Published" stage to pick** · 🐞 · medium.
In Tools › "Native XML Plugin", the export list's "Filters" panel lists
the workflow stages under "Stages". No stage lists a published
submission: "Production" gives only the unpublished submissions in
production, and every stage pressed at once gives every submission but
the published ones. The dashboard shows them under "Published", which
the export list does not offer.
A manager who wants to export only published work cannot narrow the
list to it, and nothing on screen says that the stage filters leave it
out. They have to pick it out of the full list by hand. Nothing is
lost.
The same list and filters are on OJS's "PubMed XML Export Plugin" and
OMP's "ONIX 3.0 Monograph Export Plugin", tools whose purpose is
exporting published work.
Since: 2026-06-29 · Basis: probe, 2026-09-30. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Export list with more than one page: ticks on other pages are left out of the file, and "Select All" cannot be undone** · 🐞 · medium.
A manager exporting from Tools › "Native XML Plugin" on a journal,
press or preprint server with more than 100 submissions sees the list
split into pages of 100. They tick submissions on one page, move to the
next and tick more. Going back, the earlier ticks still show. But only
the lines ticked on the page on screen go into the exported file, and
nothing says the others were left out.
"Select All" ticks the 100 lines of the page, but its label stays
"Select All" instead of turning into "Select None". Pressing it again
unticks nothing, so the only way back is to untick lines one by one or
reload the page.
The file can be completed by exporting each page on its own.
Since: 2020-05-13 ("Select All"; the dropped ticks are older) · Basis: probe, 2026-09-30. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — An export with nothing ticked fails** · 🐞 · low · crash: server.
"Export Articles" ("Export Submissions", "Export Preprints") or
"Export Issues" {OJS} pressed with nothing ticked should say that
nothing is selected and add no tab, as a journal's DOI export tools do
("No objects selected."); instead the server fails and the new results
tab ("Export Submissions Results", "Export Issues Results") stays
empty: no text, no file, and nothing says that no line was ticked.
Nothing is lost: ticking at least one line and pressing the button
again exports as usual. A press's ONIX tool fails the same way
([ONIX metadata & export, its A16](U74-onix-metadata-export.md#a16)).
Since: 2021-06-03 ("Export Issues": 2021-07-14) · Basis: probe, 2026-09-30. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — A users file the Users XML Plugin cannot read ends in a blank "Results" tab, with no reason given** · 🐞 · medium · crash: server.
A journal or press manager imports a users file in Tools › "Users XML
Plugin", and the file does not match the format the tool reads: a user
with no password, a user's role entry without its masthead setting, an
unknown element, another kind of document, or a file that is not XML.
The tool should refuse the file and tell the manager why. Instead the
server answers the import with an error, and the "Results" tab that the
import opens stays blank: no text, no message. No account is created.
The manager cannot find out on screen what is wrong with the file, and
the blank tab can pass for an import still running. A users file
exported from 3.4 is refused this way on 3.5 and later, because the
file format changed in 3.5. {OJS OMP}
Since: 2021-04-19 · Basis: probe, 2026-09-30. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — "Export Users" with nothing ticked fails** · ❓ · minor · crash: server.
"Export Users" pressed with no row ticked leaves the tool for a blank
page: the server fails, no file downloads, and nothing says to tick a
row. {OJS OMP}
Question: should "Export Users" with nothing ticked say to tick a row?
Lean: 🐞, as the Native tool's empty export (A12).
Basis: probe. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — A users import says an existing account was emailed a new password, but nothing is sent or changed** · 🐞 · low.
A journal or press manager imports a users file in Tools › "Users XML
Plugin". For an account the installation already has, the file's
password is an old-form hash (see below). The "Results" tab lists,
under "Import/Export errors:", "The imported user "{username}" password
could not be imported as is. A new password is been send to the user
email. The user has been imported.". No email goes out, and the
account's own password still signs in.
The manager may tell the person to look for a password that never
comes, or read the import as having failed. For a new account the same line
is true: a new password is set and emailed.
Which file passwords count as old-form depends on the server's PHP:
on every PHP version, a SHA-1 or MD5 value, the form OJS 2.x wrote; on
PHP 8.4 and later, also a bcrypt hash at a cost below 12, which
versions before 3.5.0-2 wrote on PHP older than 8.4, for an account
that has not signed in since; on PHP 8.2 and 8.3, every bcrypt hash that
3.5.0-2 and later write, so every existing account in a file exported
from the same installation gets the line. That is a separate fault
([users-import-resets-installation-passwords](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A16-users-import-resets-installation-passwords.md)).
{OJS OMP}
Since: 2018-04-30 · Basis: probe, 2026-09-30. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — On PHP 8.2 or 8.3, a users import drops the file's passwords and mails each new account a new one** · 🐞 · medium.
A journal or press manager imports a users file in Tools › "Users XML
Plugin" on a server running PHP 8.2 or 8.3. The file comes from "Export
Users" on an installation of 3.5.0-2 or later, which writes each
password as a scrambled copy (a hash) in the form 3.5.0-2 and later
store. Each new account should sign in with the password it had there.
Instead it gets a new password that it must change at its first
sign-in, sent in a "Journal Registration" email ("Press Registration" on
a press), and its old password no longer works. The "Results" tab reads
"Import/Export errors:" with a line for each account.
The accounts and their roles are imported, and each person can get back
in with the emailed password. The manager cannot move accounts with
their passwords, and every person moved gets an email the manager did
not choose to send.
A file with plain-text passwords imports normally. So do passwords
that older versions stored on PHP below 8.4, and passwords not changed
or signed in to since 3.5.0-2. With PHP 8.4 or later on the importing server, the file keeps
its passwords. {OJS OMP}
Since: 2025-10-19 · Basis: probe, 2026-09-30. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — Importing a users file again gives a later-dated role again** · 🐞 · minor.
A users file that gives a role a start date still to come (next year's
Section Editor, say) should give the role once, however often the file
is imported. Instead each import of the file, a second press of "Import
Users" or the same file uploaded again, adds the role once more: each
reads "The import completed successfully. …", and the user's roles page
and the "Users" list then show "Section editor" ("Series editor" on a
press) with the same start date two, then three times. A role the file
gives an end date still to come is added again the same way, as it was
already before the import began keeping start dates. {OJS OMP}
Since: 2026-09-28 · Basis: probe. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — An empty or unreadable role date stops a users import part-way** · 🐞 · user-visible · crash: server.
A users file whose role has an empty start date, a start date that is
not a date (such as "soon"), or an empty end date should be refused
with the reason, or import the role without the date. Instead the
server fails: the "Results" tab opens empty with nothing said, the
user's account is created (it signs in) but holds no role in the
journal, and the users after it in the file are not imported. The
manager is left with a half-done import and no sign of it. The start
dates fail since the import began keeping the file's start date; the
empty end date failed before. {OJS OMP}
Since: 2026-09-28 · Basis: probe. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — A tool's address with the tool's name left off fails** · 🐞 · minor · crash: server.
A manager who opens a tool's address with the tool's name left off its
end should get a "not found" page, or the Tools list. Instead the
server fails and the browser shows a blank white page, with no
heading, no menu and no link back. Only an address typed or edited by
hand leads there. A Section Editor gets the access-denied page there,
as at any tool's address.
Basis: probe, 2026-10-01. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — A Native XML round trip doubles a title's prefix** · 🐞 · user-visible.
A submission whose "Prefix" (Publication › "Title & Abstract") reads
"The" and whose title reads "Signalling Theory Dividends: A Review Of
The Literature" is listed as "The Signalling Theory Dividends: …".
Exported with the "Native XML Plugin" and imported, into another
journal or the same one, it should come back the same. Instead the
"Import Results" tab ("Results" on a press) lists ""{number}" - "The
The Signalling Theory Dividends: …"", and the copy's workflow screen
is headed the same: its "Prefix" reads "The" and its title "The
Signalling Theory Dividends: …". Every
submission with a prefix is affected, and the manager has to correct
each copy's title by hand. A submission without a prefix comes back
unchanged.
Basis: probe, 2026-10-01. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — A users file whose user has no registration date stops part-way** · 🐞 · user-visible · crash: server.
The users file format lets a user's registration date be left out, so
a file without one should import that user like any other. Instead
the import stops at that user: the server fails and the "Results" tab
opens empty, with nothing said. The users listed before
it in the file are imported with their roles; it and the users after
it are not. The manager is left with a half-done import and no sign of
which users are missing. A file in which every user has a
registration date imports normally. {OJS OMP}
Basis: probe, 2026-10-01. <sup>f-a21</sup>

<a id="a22"></a>
**A22 — "Export Users" leaves out an account whose only role starts on a later date** · ❓ · minor.
A manager can give a person a role that starts on a later date, by an
invitation's later "Start Date" or by a users import. Settings › Users
& Roles › "Users" lists that account with the role and its start date,
but "Export Users" does not list it, "Search" there does not find it,
and "Export All Users" leaves it out of the file. The manager cannot
move next year's Section Editor to another journal with this tool
until the role has begun. An account whose only role has ended is left
out the same way, which matches the list's title, "Current Users".
Question: should "Export Users" offer accounts whose role has not yet
begun? Lean: yes, since a users import keeps a later start date (Rule
24b), so the tool could move such a role, and Settings › Users &
Roles lists the account.
{OJS OMP}
Basis: probe, 2026-10-01. <sup>f-a22</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Pressing an issue in the DOAJ Articles list opens its window headed "DOI Plugin Settings"** · 🐞 · low.
A journal manager opens Tools › "DOAJ Export Plugin" › "Articles" and
presses an issue's name in the "Issue" column. The issue's window opens,
headed "DOI Plugin Settings".
It is the window the Issues page opens for the same issue, where it is
headed "Issue Management: Vol. 1 No. 2 (2014)", and that is the heading
it should carry here. Only the heading is wrong: the manager is told they
are in a plugin's settings while they edit an issue.
The name is pressable for every article in the list that sits in an
issue. The "Articles" tab is there while the journal's "DOI Versioning"
is off, as it is by default. On 3.3 the Crossref, DataCite and mEDRA
tools' lists open the window under the same heading.
Since: 2016-08-27 · Basis: probe, 2026-09-30. <sup>f-ojs1</sup>

<a id="ojs2"></a>
**OJS2 — With "DOAJ Plugin" switched off, the Plugins list still offers the DOAJ tool, whose link shows raw JSON** · 🐞 · low.
In OJS, the "DOAJ Export Plugin" tool (Tools › "Import/Export") comes
with the generic "DOAJ Plugin": switching "DOAJ Plugin" off is how a
journal turns the DOAJ tool off. After a journal manager switches it
off, the Tools list rightly leaves "DOAJ Export Plugin" out. Settings ›
Website › "Plugins" does not: under "Import/Export Plugins" the "DOAJ
Export Plugin" row is still there.
That row's box shows ticked, so the tool reads as on, and the box cannot
be pressed. The row still offers "Import/Export Data". That link opens a
bare page of JSON text in place of the whole screen, with no heading,
side menu or link back. The JSON is the list the Tools page's
"Import/Export" tab shows: each tool's name, link and one-line
description, and no other data.
"DOAJ Plugin" is on by default, so only a journal that has switched it
off sees this. The generic "DOAJ Plugin" exists on `main` only; no
release has it yet.
Since: 2025-10-04 · Basis: probe, 2026-09-30. <sup>f-ojs2</sup>

<a id="ojs3"></a>
**OJS3 — PubMed files carry an empty journal title once a manager saves "NLM Title Abbreviation" empty** · 🐞 · medium.
A journal manager opens the PubMed XML Export Plugin and presses "Save" on
its "Settings" tab while "NLM Title Abbreviation" is empty. That happens
when they clear an abbreviation, or when they press "Save" on a first visit
without typing anything, since the box starts empty. From then on, every
PubMed file the journal exports has an empty journal title. Before that
save, the file carries the journal's full name, and the manager would
expect the same while the box is empty.
The save says "Your changes have been saved.", and the box looks as it did
before, so nothing tells the manager that the title is gone. NLM requires
the journal title in every file PubMed receives. Typing an abbreviation, or
the journal's name, into the box and saving again brings it back.
Since: 2025-06-04 (3.5, first released in 3.5.0-1; main 2025-06-24) · Basis: probe, 2026-09-30. <sup>f-ojs3</sup>

<a id="ojs4"></a>
**OJS4 — PubMed exports depend on NLM's site** · 🐞 · medium · crash: server.
"Export Articles" and "Export Issues" should download the PubMed file.
Each export loads PubMed's description of the file format from NLM's
site to check the file; where OJS cannot reach that site (a server
without outbound access, PHP's remote file access off, or the site
down), the request ends in a server error and the export leaves the
tool for a bare page headed "Validation errors:", saying that the
format could not be loaded, then the file's text, in which nothing is
wrong. No file downloads, and the PubMed tool has no way to skip the
check. A refused connection brings the page at once, a dropped one
after about a minute. Validated DOAJ exports fail the same way
([OJS7](#ojs7)).
Since: 2017-03-20 · Basis: probe, 2026-09-30. <sup>f-ojs4</sup>

<a id="ojs5"></a>
**OJS5 — The tools' Settings "Cancel" does nothing** · 🐞 · medium.
On the PubMed and the DOAJ Settings tabs, the form's "Cancel" should
drop the change and put the form back to its saved values; it does
nothing: the typed text and the ticked box stay, nothing is saved yet,
and right after it the other tabs open without the usual "The data on
this form has changed" question. The next "Save" on that form stores
the change along with whatever the manager meant to save: a DOAJ
manager who ticks "OJS will deposit articles automatically to DOAJ",
presses "Cancel", then enters the API key and saves, has turned
automatic deposits on. Only a reload before saving brings back the
saved values. Both forms also end with "Required fields are marked
with an asterisk: *", though no field has an asterisk and none is
required: both save empty.
Since: 2016-10-01 (DOAJ), 2025-06-24 (PubMed) · Basis: probe, 2026-09-30. <sup>f-ojs5</sup>

<a id="ojs6"></a>
**OJS6 — On PostgreSQL, the DOAJ Articles list's title and author search is case-sensitive** · 🐞 · low.
The filter's "Article Title" and "Authors" search should find an
article whatever the letter case typed; "signalling" finds nothing
where "Signalling" finds "Signalling Theory Dividends", and "mwandenga"
nothing where "Mwandenga" finds it. The list answers "No Items", as if
no published article matched.
The manager still finds the article by typing the words as they are
written, or by choosing its issue. Seen on PostgreSQL; MySQL not
checked (its default collation would ignore case).
Since: 2016-06-28 · Basis: probe, 2026-09-30. <sup>f-ojs6</sup>

<a id="ojs7"></a>
**OJS7 — Validated DOAJ exports depend on DOAJ's site** · 🐞 · medium · crash: server.
"Export" with "Validate XML before the export and registration." ticked,
as the tab opens, should refuse only a file that fails DOAJ's format.
The check loads part of that format from DOAJ's site; where OJS cannot
reach it (a server without outbound access, PHP's remote file access
off, or the site down), the request ends in a server error and every
such export leaves the tool for a bare page headed "Validation
errors:", saying that the format could not be loaded, then the file's
text, whatever the file holds. No file downloads; with the box
unticked the file downloads, unchecked. PubMed's exports fail the same
way ([OJS4](#ojs4)).
Since: 2016-08-27 · Basis: probe, 2026-09-30. <sup>f-ojs7</sup>

<a id="ojs8"></a>
**OJS8 — "Register" skips the XML check** · ❓ · minor.
"Validate XML before the export and registration." promises a check
before registration, but "Register" checks nothing, box ticked or not:
the rows read "Submitted" at once, while "Export" with the box ticked is
refused (Rule 40).
Question: should "Register" validate the file when the box is ticked?
Lean: 🐞 minor, since the label names registration.
Basis: probe. <sup>f-ojs8</sup>

<a id="ojs9"></a>
**OJS9 — A DOAJ "Register" that cannot reach DOAJ leaves the article reading "Submitted" for good, never "Failed"** · 🐞 · medium.
A journal manager presses "Register" in the DOAJ Export Plugin while OJS
cannot reach DOAJ. The notice says "Articles submitted successfully" and
the article reads "Submitted". The deposit then fails in the background,
but the article keeps reading "Submitted" for good, and the status
filter's "Error" finds nothing.
Only a site administrator can see the failure, under Administration ›
"View Failed Jobs". The daily automatic deposit never sends a
"Submitted" article again, so the article stays out of DOAJ until
someone presses "Register" again. In 3.5 the same press showed "Deposit
was not successful!" at once.
It happens whenever DOAJ's API cannot be reached: DOAJ is down, its name
does not resolve, or the server has no outbound access. The journal
needs "DOAJ Plugin" on and a DOAJ API key saved. When DOAJ does answer,
with an error (a wrong key, a rejected record), the article reads
"Failed" as it should.
Since: 2025-06-30 · Basis: probe, 2026-09-30. <sup>f-ojs9</sup>

<a id="ojs10"></a>
**OJS10 — "Export Issues" lists the journal's issues in no set order** · 🐞 · minor.
The "Export Issues" list of the "Native XML Plugin" and of the "PubMed
XML Export Plugin" should list a journal's issues in an order a
manager can follow, such as newest first. Instead, issues created out
of year and volume order keep the order they were created in ("Vol. 8
No. 2 (2006)", "Vol. 15 No. 3 (2017)", "Vol. 22 No. 1 (1998)" …), or
none, published and unpublished mixed. With more issues than one page
holds, the manager pages through the whole list to find one to tick.
Nothing is lost. Until a
2021 change the list put the current issue first and the rest newest
first. The reader's "Archives" has a like fault
([Issues, its A13](U50-issues.md#a13)).
Since: 2021-08-30 · Basis: probe, 2026-10-01. <sup>f-ojs10</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Pressing "Tab Delimited Content Import Plugin" in a press's Tools list opens a blank page** · 🐞 · low · crash: server.
A press's Tools › "Import/Export" list shows "Tab Delimited Content
Import Plugin" as a link. When a manager presses it, the server fails and
the browser shows a blank white page.
The tool runs only from the server's command line. The page behind the
link was meant to say so and how to run it. The plugin has that message,
translated, but the page that would show it is missing.
Nothing is lost. PKP's "Learning OMP" guide says the tool is
command-line only, and the command line prints its usage.
Since: 2016-03-16 · Basis: probe, 2026-09-30. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The press's Native XML export asks for ONIX details** · ✅ · minor.
On a press the Native XML "Export" tab shows the reminder of Rule 19
while the press's ONIX details are incomplete, since a press's export
can carry ONIX metadata; a journal's and a preprint server's export tabs
have no such line.
Since: 2016-04-04 · Basis: probe. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A press's import creates a missing series** · ✅ · minor.
A monograph naming a series the press lacks is imported with the
warning "Unknown series {path}", and the press gains that series with
the file's title; a journal and a preprint server treat an unknown
section as A9 says. The press's import is written to create the
series.
Basis: probe. <sup>f-omp3</sup>

### Retired

<a id="a2"></a>
**A2 — Users files never keep the masthead choice** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13390), 2026-09-28; seen fixed 2026-09-29: an import keeps each role's masthead choice and an export writes it (Rule 24a). <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Every imported role starts today** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13390), 2026-09-28; seen fixed 2026-09-29: an import keeps each role's start date (Rule 24b). <sup>f-a3</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-27 on checkouts ojs `3162c105bf`, omp `72a01a0263`,
ops `e9f6f4f550`, lib/pkp `1ad4a14bb2`, ui-library `03d1cee2` (the same
lib/pkp and ui-library under all three apps). Nothing in this draft was
driven except where a block says so. The Tools page, the tool list, the
shared import/export base class and the users grid are lib/pkp code each
app dispatches unchanged (each `pages/management/index.php` routes
`tools`, `importexport`, `permissions`, `resetPermissions` to
`PKP\pages\management\PKPToolsHandler`); the tools themselves are each
app's own plugin directories, so the per-app seams are the plugins each
app ships and their templates and locale files, named below (multi-app
rule 8). Every body claim was live-probed 2026-09-27 on OJS, OMP and OPS
(each app that has the surface, with read-only controls on the others)
unless a note says it is read from the code; the test installs cannot
reach outside sites (NLM, DOAJ), which is why those notes exist.

<a id="fn-a"></a>
**a** — `PKPToolsHandler::__construct()` assigns `tools`,
`importexport`, `permissions` to `ROLE_ID_MANAGER` and
`ROLE_ID_SITE_ADMIN`; `ManagementHandler::authorize()` adds
`ContextAccessPolicy` and adds `CanAccessSettingsPolicy` only for the
`settings` op, so "Permit changes to Settings" (`user_groups.permit_settings`)
does not gate Tools. Every tool page and action is a `management/importexport/plugin/{name}/{op}`
request through the same handler. The side menu's "Tools" entry:
`PKPTemplateManager` `$menu['tools']` for `ROLE_ID_MANAGER` /
`ROLE_ID_SITE_ADMIN` (no `permitSettings` check, unlike `$menu['settings']`).
The grids the pages load (`ExportableUsersGridHandler`,
`ExportableIssuesListGridHandler` via `IssueGridHandler`,
`ExportPublishedSubmissionsListGridHandler`,
`ExportPublishedPublicationsListGridHandler`) assign `fetchGrid` and
`fetchRow` to the same two roles. The OJS Editor and Production Editor
groups are `ROLE_ID_MANAGER` (users.md "Traps"); OPS's only
manager-level group is its manager. The "Journal Registration"
recipient: note l. Live-probed 2026-09-27 (Actors rows 1–2, Settings
bullet 1), three apps: the Editor and Production Editor with "Permit
changes to Settings" off (`roles.{editor,productionEditor}.permitSettings:
false`) see "Tools" and no "Settings" in the side menu and open Tools,
its list, the Native and Users pages; the Section Editor, Copyeditor
(OPS Editorial Board Member), Reviewer, Author and Reader are
redirected to `user/authorizationDenied` at `management/tools` and at
each tool's address; signed out, the Login page. `admin` is listed as
"Journal manager" ("Press manager", "Preprint Server manager") on
`publicknowledge` and on scratch contexts. On Settings › Users & Roles ›
"Roles" the manager's row has no "Settings" link (as the manager and as
`admin`), while the Editor's and Production Editor's forms show "Permit
changes to Settings" ticked.

<a id="fn-b"></a>
**b** — Live-probed 2026-09-27 (Rule 1), three apps: the heading,
the two tabs with "Import/Export" selected on arrival, the reset on
"Permissions" as Publication metadata's Rule 14 quotes it.
`lib/pkp/templates/management/tools/index.tpl`: heading
`navigation.tools` "Tools"; tabs `navigation.tools.importExport`
"Import/Export" (op `importexport`) and
`settings.libraryFiles.category.permissions` "Permissions" (op
`permissions`), then the hook `Templates::Management::Settings::tools`,
which no plugin in the three checkouts registers. The Permissions tab and
`tools/resetPermissions` belong to the Publication metadata spec's
Rule 14.

<a id="fn-c"></a>
**c** — `PKPToolsHandler::importexport()` loads the `importexport`
category from disk (`PluginRegistry::loadCategory('importexport')`, not
enabled-only) and renders `management/tools/importexport.tpl`: `<a
href="{url op="importexport" path="plugin"|to_array:name}">{displayName}</a>:&nbsp;{description}`
per plugin of `PluginRegistry::getPlugins('importexport')`. Plugin directories:
OJS `plugins/importexport/{native,pubmed,users}`; OMP
`plugins/importexport/{csv,native,onix30,users}`; OPS
`plugins/importexport/native` only. The generic plugins register the
others into the category: OJS `plugins/generic/doaj` (`DOAJPlugin::setExportPlugin()`
→ `DOAJExportPlugin`), `generic/crossref`, `generic/datacite`; OPS
`generic/crossref`. Names and descriptions:
`plugins.importexport.{native,pubmed,users,doaj,crossref,datacite,csv,onix30}.displayName`
/ `.description` in each plugin's `locale/en/locale.po`. Live-probed
2026-09-27: the lines are `<a>name</a>:&nbsp;description`, strings
verbatim, on `publicknowledge` and on a new scratch context of each
app. The order (code read, lib/pkp, 2026-09-27): `loadCategory()` sorts
by `getSeq()` alone, 0 for every tool, a stable sort, so the lines come
in the order the tools were registered during the request. First the
tools a generic plugin registers as it loads (DOAJ, Crossref,
DataCite), in the row order of `VersionDAO::getCurrentProducts()`, a
`versions` ⟕ `plugin_settings` query with no ORDER BY, whose row order
follows the database's join plan and physical row order and so shifts
as plugin settings are written anywhere on the install; then the tools
of `plugins/importexport/`, in `loadFromDisk()`'s `FilesystemIterator`
order, the file system's unsorted directory order (OJS: native, users,
pubmed). Nothing on screen orders the list.

<a id="fn-d"></a>
**d** — `ImportExportPlugin::display()` assigns `pageTitle` (the display
name) and `breadcrumbs` [`navigation.tools` → `management/tools`, the
plugin's name]; `layouts/backend.tpl` prints them as
`app__breadcrumbs`. Live-probed 2026-09-27: the Native, Users, PubMed,
DOAJ and ONIX pages have the name as heading and the trail "Tools / …",
whose "Tools" returns to the Tools page; the Crossref and DataCite pages
(OJS; OPS Crossref) have an empty heading and no trail. "Import/Export Data"
opens the same address in the same tab, three apps. `ImportExportPlugin::getActions()` gives the Plugins
list's row the `manager.importExport` "Import/Export Data" link to
`management/importexport/plugin/{name}`. The Users XML template on OMP
prints `plugins.importexport.users.displayName` instead of
`$pageTitle` (same words).

<a id="fn-e"></a>
**e** — Native templates: `ojs/plugins/importexport/native/templates/index.tpl`
(tabs `plugins.importexport.native.import` "Import",
`.exportSubmissions` "Export Articles", `.exportIssues` "Export
Issues"); OMP's (tabs "Import", `.native.export` "Export"; its export
button `plugins.importexport.native.exportSubmissions` "Export
Submissions" from OMP's `locale/en/manager.po`); OPS's (tabs "Import",
"Export Preprints"). The import form: `FileUploadFormHandler` on
`controllers/fileUploadContainer.tpl` (`common.upload.addFile` "Upload
File", `common.upload.dragFile`, `common.upload.changeFile`), section
title `plugins.importexport.native.import.instructions` "Upload XML file
to import", submit `plugins.importexport.native.import`. The upload
(`uploadImportXML`) is `TemporaryFileManager::handleUpload()` with no
type check. Live-probed 2026-09-27, three apps: a chosen file, a dropped
file, a .txt and a .png each go up at once and show "Change File"; the
tab order's first stop is the "Import" button, the "Upload File" button
carries `tabindex="-1"` (A6); leaving the page with a file up shows no
browser question and the box is empty on return. OJS and OPS also print
"Required fields are marked with an asterisk: *" under the form, with
no field marked.

<a id="fn-f"></a>
**f** — `PKPNativeImportExportPlugin::display()`: `importBounce` (empty
`temporaryFileId` → `JSONMessage(false)`; otherwise `getBounceTab()`
raising `addTab` with `plugins.importexport.native.results` "Import
Results" (OMP "Results")), then `import` →
`ImportExportPlugin::getImportTemplateResult()` →
`PKPImportExportDeployment::import()`: one database transaction,
rolled back on any `Error`/`Exception` (`processFailed`);
`isProcessFailed()` is also true when libxml reported errors.
`plugins/importexport/resultsImport.tpl`:
`plugins.importexport.native.processFailed` or `.importComplete` with
`getImportedRootEntitiesWithNames()` (headings from
`getObjectTypes()`, lines `PKPSubmission::getUIDisplayString()` =
`plugins.importexport.submission.cli.display` ""{id}" - "{title}"");
`innerResults.tpl` lists `plugins.importexport.common.warningsEncountered`
"Warnings encountered:" and `.errorsOccured` "Errors occured:";
`.validationErrors` "Validation errors:". `addError()` does not set
`processFailed`, so recorded errors that throw nothing leave the import
committed: OJS `NativeXmlPublicationFilter::populateObject()` /
`handleElement()` add `plugins.importexport.native.error.unknownSection`
and skip the publication; `…::parseIssueIdentification()`-path adds
`plugins.importexport.native.import.error.issueIdentificationMatch` and
creates an unpublished issue (`setPublished(0)`). App import filters:
OJS `getImportFilter()` picks `native-xml=>article` for an `article` /
`articles` root, else `native-xml=>issue`; OMP `native-xml=>monograph`;
OPS `native-xml=>preprint`. No mailable is sent anywhere in the native
filters. Live-probed 2026-09-27, three apps (Rules 9–13, Side effects
bullet 1; Fields, results tab): a submitted submission exported from
scratch journal A and imported into B read "The import completed
successfully…", heading "Submission", the line with B's new number;
B's Dashboard showed it in its first stage (OPS "Production") with its
contributor and file; the mail catcher got nothing. Two "Import"
presses gave two tabs and two copies, and one click on each tab two
more (the tab's own `…/import?temporaryFileId=…` request repeats on the
click; A7). Each results tab carries "Close". A round trip listed
"Errors occured:" with the country and contributor-role lines, and on
OJS the issue-identification line (A8). A file with an unknown element:
"The process failed…", an "Errors occured:" line such as "Filter
(Native XML submission import) supports input schema(…) - string
given" with the file's lines, then "Validation errors:"; a file that
failed part-way left nothing on the Dashboard. An unknown issue {OJS}:
the success text, the line with the file's `<issue_identification>`
markup inside the quotes, and "Vol. 99 No. 9 (2099)" under Issues ›
"Future Issues" with 0 items. An unknown section (OJS, OPS) and an
unknown series (OMP): notes f-a9, f-omp3.

<a id="fn-g"></a>
**g** — The export list is `APP\components\listPanels\SubmissionsListPanel`
(`common.publications` "Articles" / OMP "Monographs" / OPS "Preprints")
on `api/v1/submissions` with `count` 100 and no status parameter, its
`addUrl` blanked and its first filter group (Overdue / Incomplete)
sliced off; filters `settings.roles.stages` "Stages" with each app's
`getWorkflowStages()`, `submission.list.activity` "Activity" /
`submission.list.daysSinceLastActivity` (slider 1–180), and on OJS and
OPS `section.sections` "Sections". The item slot in the plugin's
`index.tpl`: a `selectedSubmissions[]` checkbox, the current
publication's full title, and `common.view` "View" linking
`item.urlWorkflow`. `ImportExportPage.vue::toggleSelectAll()` selects
`components.submissions.items` (the loaded page) and compares with
`itemsMax`; the button is `:disabled="!components.submissions.itemsMax"`
and reads `common.selectAll` / `common.selectNone`. Live-probed
2026-09-27, three apps (Rules 14–15a; Fields, "Filters"): every
submission in every stage and state listed; 101 submissions gave 100
with "Previous 1 2 Next"; the search box narrowed on Enter only;
"Activity" shows an "Add filter" ("+") button before any slider; Review
alone gave 1 line, Review plus Submission 4 (OJS, OMP); a stage plus a
section 1; "View" on a draft opened "Make a Submission" at "Upload
Files". A published submission matched no stage, "Production"
included: the seed and the workflow place it in the published stage,
which the filter does not offer (A10). With 101 submissions "Select
All" ticked 100 and kept its label after both presses; a submission
ticked on page 1 was missing from a file exported on page 2 (A11).
With the list empty ("No submissions found.") the button was disabled.

<a id="fn-h"></a>
**h** — `exportSubmissionsBounce` → tab
`plugins.importexport.native.export.submissions.results` "Export
Submissions Results"; `exportSubmissions` →
`getExportSubmissionsDeployment()` (ids outside the context dropped) →
`getExportTemplateResult()` writes
`{files_dir}/temp/native-{Ymd-His}-submissions-{contextId}.xml` and
renders `resultsExport.tpl`
(`plugins.importexport.native.export.completed`,
`.export.completed.downloadFile`, button
`.export.download.results` "Download Exported File"). `downloadExportFile`
→ `ImportExportPlugin::downloadExportedFile()` streams the file and
deletes it (`deleteByPath`), so the same form's second post names a file
that no longer exists. What the file holds: `pkp-native.xsd` plus each
app's `native.xsd`; submission, publications, authors, galleys /
publication formats and submission files as embedded or referenced
files; the Identifiers and Citations specs record what they saw in it.
Live-probed 2026-09-27, three apps (Rules 16, 17, 20): the file
`native-{date}-submissions-{id}.xml` held the ticked submissions (root
`<article>` for one, `<articles>` for several); nothing ticked, the
tab's `exportSubmissions?selectedSubmissions=` request answered 500 and
the tab stayed empty (A12). A second press of the same button answered
an empty body at `…/downloadExportFile` and the browser showed a blank
page; choosing the tab again re-ran `exportSubmissions` and its button
downloaded a file with a new name. A published submission with a second
version exported both `<publication>` versions, and a fresh journal
showed both after import. The export list and Dashboard read the same
after every export. Ticks stay after an export, so a second export also
carries them.

<a id="fn-i"></a>
**i** — OJS only: `exportIssues-tab` loads
`grid.issues.ExportableIssuesListGridHandler` (`IssueGridHandler`
columns `issue.issue` "Issue", `editor.issues.numArticles` "Items", plus
`SelectableItemsFeature`'s `common.select` "Select" column and
`PagingFeature`); `loadData()` takes every issue of the journal
(`Repo::issue()->getCollector()->filterByContextIds()`, no `orderBy()`,
so no ORDER BY), paged by limit and offset (OJS10).
`NativeImportExportPlugin::display()` `exportIssuesBounce` → tab
`plugins.importexport.native.export.issues.results` "Export Issues
Results"; `exportIssues` → `getExportIssuesDeployment()`, file part
`issues`. OMP and OPS templates have no such tab (diff of the three
`index.tpl`). Live-probed 2026-09-27 (Rule 18; Fields): both scratch
issues listed, published (1 item) and unpublished (0); the issue name
opened "Issue Management: {issue}"; the export tab "Export Issues
Results" and a file with root `<issue>`; nothing ticked,
`exportIssues?selectedIssues=` answered 500 and the tab stayed empty (A12). OMP and
OPS have no such tab.

<a id="fn-j"></a>
**j** — `omp/plugins/importexport/native/templates/index.tpl`, the export
tab: `{if !$currentContext->getData('publisher') || !…'location' ||
!…'codeType' || !…'codeValue'}` prints
`plugins.importexport.native.onix30.pressMissingFields` with `url` =
`management/settings/context`. Added with "optional ONIX metadata in
native export" (omp `1f666119c`, 2016-04-04). Live-probed 2026-09-27:
note td12. The four fields are the
press's Masthead group of the Journal identity spec (Fields).

<a id="fn-k"></a>
**k** — `plugins/importexport/users/templates/index.tpl` (OJS and OMP;
whitespace and the heading source apart, the same): tabs
`plugins.importexport.users.import.importUsers` "Import Users",
`.export.exportUsers` "Export Users"; the import form's paragraph
`.import.instructions` (OMP "…this press…"), upload section `common.file`
"File", submit "Import Users". `PKPUserImportExportPlugin::display()`
`importBounce` → `addTab` `plugins.importexport.users.results` "Results";
`import` → `importUsers()` and `results.tpl`: libxml errors →
`plugins.importexport.common.validationErrors`; filter errors →
`plugins.importexport.user.importExportErrors` "Import/Export errors:";
else `plugins.importexport.users.importComplete`. OPS has no
`plugins/importexport/users` (removed in ops `cdf014dcac`, "clean
plugins", 2019-06-03), and `PluginRegistry::loadFromDisk()` reads only
the app's own `plugins/` tree, so lib/pkp's base plugin is not loaded
there. Live-probed 2026-09-27, OJS and OMP (Rules 21, 22, 22a; Fields),
with OPS as the absent control (its Tools list lacks the tool; its
address gives Rule 5's raw text): the heading "Users XML Plugin" with
the trail; each "Import Users" press added a "Results" tab with
"Close", none left after a reload; a file with 14 users of which 8
raised a line showed "Import/Export errors:" and no success sentence
while 11 accounts were created or given roles. Four files that do not
match the format (a user with no `<password>`, an unknown element,
another root element, plain text) each left an empty "Results" tab,
the import request answering 500, and created no account (A13); the
`validationErrors` branch never showed. With no file, the tab reads "Please upload a file
under "Import" in order to continue.", one tab per press. After an import
the box keeps the file and a second press imports it again; a file left
up is dropped on leaving the page, with no question.

<a id="fn-l"></a>
**l** — `UserXmlPKPUserFilter::parseUser()` (lib/pkp
`plugins/importexport/users/filter/`): matches `getByUsername()` and
`getByEmail()` (disabled accounts included); same id → existing user
kept; neither → `Repo::user()->add()`; otherwise
`plugins.importexport.user.error.usernameEmailMismatch`; that branch
leaves `$userId` unset, so the later `if ($userId)` logs "PHP Warning:
Undefined variable $userId" for both mismatch cases (the username in
use with another email, an email in use with a free username), while
the request answers 200 and the screen shows only the mismatch line
(live-probed 2026-10-01, OJS and OMP, two runs each; no warning for a
file naming one existing account's username and email). A user with
no `<date_registered>` (optional in `pkp-users.xsd`): note f-a21. Roles: each
`user_user_group` whose `user_group_ref` is in a context group's
localized `name` array, with the file's `<date_start>`, `<date_end>`
and `<masthead>` (read at lib/pkp `fab29cfeca`, 2026-09-29). A reviewer
group gets `$masthead = true` whatever the file says;
`$dateStart ??= Core::getCurrentDate()` fills in a missing start date
only. The role is skipped when, for an entry with no `<date_end>`, a
`withActive()` row exists (started, not ended), or, for an entry with
one, a `withEnded()` row exists; a row that starts later, or ends
later, is neither, so it is inserted again (A17). An empty element is
kept as `""` and free text goes to the date cast, so the insert throws
(A18). The masthead and start-date handling is lib/pkp `85f6b3c074`
(pkp/pkp-lib#13390, merged 2026-09-28); before it
`if ($userGroup->roleId = Role::ROLE_ID_REVIEWER)` was an assignment
that set every role to appear, and an undefined `$startDate` set every
start to today (A2, A3, both since lib/pkp `8fb142ad3`,
pkp/pkp-lib#11479, 2025-06-10).
`importUserPasswordValidation()`: no `encryption` attribute → plain text,
encrypted when `strlen` ≥ `Site::getMinPasswordLength()`, else
`plugins.importexport.user.error.plainPasswordNotValid`, the account
still added (A4); a
missing `<value>` adds `.userHasNoPassword` first; with `encryption`,
`password_needs_rehash($hash, PASSWORD_BCRYPT)` → `generatePassword()`,
`setMustChangePassword(true)`, `.passwordHasBeenChanged`, and for a new
account `UserCreated` (`USER_REGISTER`, "User Created"; subject
`emails.userRegister.subject` "Journal Registration" / OMP "Press
Registration") to the account, sender the acting user, reply-to the
context's `contactEmail` / `contactName`; otherwise the hash is kept.
The check passes no cost, so it measures against PHP's default bcrypt
cost, 12 from PHP 8.4 and 10 before, while the installation stores
cost 12 (`Validation::encryptCredentials()`, pkp/pkp-lib#11933): below
PHP 8.4 a hash stored the installation's way is flagged (A16).
What an export writes for each account's password is not described
here. Site minimum:
`minPasswordLength`, 6 on a fresh install (Site settings, Rule 10).
Live-probed 2026-09-27, OJS and OMP on PHP 8.4 (Rules 23–25, 28; Actors row 4;
Side effects bullet 2; Settings bullet 8): the three mismatch cases each
gave the mismatch line and no account; an existing account kept its
name and password and gained the file's role; role names match exactly
("reader", "SECTION EDITOR" and an unknown name passed over, a role
held not given twice). "abc", a 5-character and an empty `<value>`
gave the row-2 line, an account with its roles, and no sign-in; 6 and
8 characters signed in; at a site minimum of 10 (set and put back on
Administration › "Site Settings"), 8 and 9 took row 2 and 10 signed in.
A bcrypt at the current cost signed in with the original; an md5 value
and a cost-10 bcrypt each gave the row-4 line, the original no longer
signed in, and the mailed password signed in onto the change-password
page. Only those new accounts got mail ("Journal Registration" /
"Press Registration", from the importing manager, reply-to the
journal's principal contact); existing, refused and mismatched accounts
and the manager got none. A move of two accounts from journal A to B
gave the roles of the same names, no email and no change to name,
password or must-change flag. Accounts seeded through the test tools
keep an older stored password until their first sign-in: such an account, and
an existing account given a cost-10 file password, got the row-4 line
while keeping its password and receiving no mail (A15); after one
sign-in the move read the plain success sentence.
Live-probed again 2026-09-29, OJS and OMP on PHP 8.3.33, two runs each:
Rules 22, 23, 25 (rows 1, 2 and 4) and 28 and Settings bullet 8 (read
only, the site's minimum 6) as above, with the PHP 8.3 branch of row 3
(note f-a16); Rules 24a and 24b: note td14; Rule 22c: note f-a18; the
re-import of Rule 24: note f-a17.

<a id="fn-m"></a>
**m** — `ExportableUsersGridHandler` (lib/pkp
`controllers/grid/users/exportableUsers/`): title
`grid.user.currentUsers` "Current Users"; action `exportAllUsers`
`grid.action.exportAllUsers` "Export All Users" as a
`RedirectConfirmationModal` (`grid.users.confirmExportAllUsers`) to
`…/plugin/UserImportExportPlugin/exportAllUsers`; columns
`user.givenName`, `user.familyName`, `user.username`, `user.email`
("Email" in lib/pkp `locale/en/user.po`, "Email address" in
`locale/en/common.po`: the duplicate key U41's A19 records, so the
install's locale-file order picks the header), plus the
`common.select` column; `PagingFeature`;
`loadData()` filters by context, `searchPhrase` and `userGroup`
(`renderFilter()` also builds field and match lists the template
`userGridFilter.tpl` never shows). The template's form posts `export`
with `selectedUsers[]`; `export` / `exportAllUsers` write
`users-{date}-users-{contextId}.xml`, stream it and delete it.
`loadData()` and `exportAllUsers()` take the users through the users
Collector, whose default `userUserGroupStatus` is `STATUS_ACTIVE` (a
role begun and not ended), so they hold every user with a current role
in the context (A22, note f-a22). The
search goes through the users `Collector::buildSearchFilter()`, which
also matches biography and ORCID iD (not driven). Live-probed
2026-09-27, OJS and OMP (Rules 26–27; Fields): 38 accounts, "Items per
page: 10 25 50 75 100" and "1 - 25 of 38 items"; given name, family
name (case ignored), username, email, an affiliation ("Zyxwaff") and a
role name ("Copyeditor") each narrowed the list, two words of which one
matches nothing gave "No Items"; a second header "Search" hid the
filter. Test run 2026-09-27, OJS and OMP: the filter's own "Search"
narrowed the list and hid the filter each time; the header "Search"
showed it again. "Export All Users" opened a "Confirm" window; "Cancel"
downloaded nothing; "OK" downloaded 38 `<user>` elements with this
journal's roles only; two ticked rows gave a file of those two. "Export
Users" with nothing ticked: `POST …/UserImportExportPlugin/export`
answered 500 and the browser showed a blank page, once on each app
(A14). Test run 2026-09-27 (OMP; the same code on OJS): a second
"Export All Users" pressed within about 0.3 s of "Cancel" showed no
window, twice, while a press 1.25 s after "Cancel" opened "Confirm":
`ModalHandler.modalClose()` removes the closing window in a 300 ms
`setTimeout`, and `ModalRequest.finish()` then removes `$modal_`, by
then the new window. A person pressing again a moment later is not
affected.
Test run 2026-09-27 (OJS, the VM's reset install; Fields; scenario
6): the list's headers read "Select", "Given Name", "Family Name",
"Username", "Email address", where the scenario's test, then asserting
the literal "Email", went red; the test had been green with it at the
feature's build, so that install's header read "Email".

<a id="fn-n"></a>
**n** — `ojs/plugins/importexport/pubmed/`: `templates/index.tpl` (tabs
`plugins.importexport.common.settings` "Settings", the native plugin's
`exportSubmissions` / `exportIssues` keys); the Settings tab loads
`settingsPluginGridHandler::manage` `verb=index` →
`templates/settingsForm.tpl` (`nlmTitle`, `maxlength="100"`,
`plugins.importexport.pubmed.settings.form.nlmTitle` and
`.nlmTitle.description`); `PubMedExportPlugin::manage()` `save` →
`createTrivialNotification()` (`common.changesSaved`). `display()`
`exportSubmissions` / `exportIssues` stream
`pubmed-{date}-articles|issues-{contextId}.xml` directly (form posts, no
results tab); `exportIssues()` collects each issue's articles by
section. `ArticlePubMedXmlFilter::createJournalNode()`: `JournalTitle` =
`$nlmTitle ?? $journal->getName(primaryLocale)` (`??`, so a saved empty
string is not replaced by the name; OJS3). Each export validates the
file against the DOCTYPE's `https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd`
and on errors goes through `displayXMLValidationErrors()` (note r).
Live-probed 2026-09-27 (Rules 29–32; Fields; Settings bullet 6): every
"Export Articles" and "Export Issues" press answered 500 with the
"Validation errors:" page and no download, nothing ticked included (its
file text an empty `<ArticleSet/>`), 7 presses (OJS4); from that page's
file text, `JournalTitle` read the journal's name before any save, "J
Pub Knowl" after saving it, and was empty after the box was saved empty
(OJS3); an issue's file held its two published articles, and the
unpublished issue's file its scheduled article. "NLM Title
Abbreviation" kept 100 of 105 characters typed; "search the NLM
Catalog" links `https://www.ncbi.nlm.nih.gov/nlmcatalog/` in the same
tab. OMP and OPS have no PubMed tool; its address gives Rule 5's raw
text there.

<a id="fn-o"></a>
**o** — `ojs/plugins/generic/doaj/settings.xml` installs `enabled`
`true` per context (`getContextSpecificPluginSettingsFile()`);
`PubObjectsExportGenericPlugin::register()` calls `setExportPlugin()`,
which registers `DOAJExportPlugin` into `importexport`. The dispatcher
loads generic plugins enabled-only (`Dispatcher`:
`PluginRegistry::loadCategory('generic', true)`). The DOIs spec saw the
Crossref and DataCite tools listed with their manager plugins off, by a
path this draft did not trace. Import/export plugins' boxes: the
Plugins management spec, Rule 10. Live-probed 2026-09-27 (Rules 3, 33;
Settings bullet 2), three apps: every "Import/Export Plugins" box ticked
and not pressable for the manager. OJS: "DOAJ Plugin" arrives ticked;
unticked ("Disable", "OK", notice 'The plugin "DOAJ Plugin" has been
disabled.') the Tools list drops "DOAJ Export Plugin" and keeps "Native
XML Plugin", and ticked again it is back (journals D, O and a third
journal; also seeded off with `plugins.doajplugin.enabled: false`).
While it is off, the Plugins list's "DOAJ Export Plugin" row stays
ticked, locked, with "Import/Export Data" (two runs), and its address
answers the raw text of Rule 5 (OJS2). "Crossref Manager Plugin" and
"DataCite Manager Plugin" arrive unticked; their tools are listed either
way.

<a id="fn-p"></a>
**p** — `ojs/plugins/generic/doaj/templates/index.tpl` settings tab: the
link `plugins.importexport.doaj.export.contact` to
`http://www.doaj.org/application/new` (`target="_blank"`), then
`settingsForm.tpl` (`plugins.importexport.doaj.registrationIntro`,
`apiKey` `password=true` `maxlength="100"` with
`.settings.form.apiKey` / `.apiKey.description`, checkbox
`automaticRegistration` `.settings.form.automaticRegistration.description`).
`DOAJSettingsForm::isOptional()` lists both fields, so
`PubObjectsExportPlugin::display()` never records a configuration error
for DOAJ; `manage()` `save` → success notification (`common.changesSaved`).
Live-probed 2026-09-27 (Rules 35, 35a; Fields), OJS: the link opens
`http://www.doaj.org/application/new` with `target="_blank"` (not
followed); "DOAJ API Key" a password box keeping 100 of 105 characters;
"Save" empty and unticked, and with a dummy key and the box ticked, each
showed "Your changes have been saved.", and after a reload the box
showed dots and the checkbox its saved state. On
both Settings tabs (PubMed's `settingsForm.tpl` too): the form's
"Cancel" left the typed text, asked nothing and saved nothing (a reload
showed the earlier value); both end with the required-fields note
(OJS5); a changed box and another tab raised the browser's "The data on
this form has changed. Do you wish to continue without saving?", whose
"Cancel" stayed and "OK" moved on with the text kept; leaving the page
asked nothing and lost the change. OMP and OPS have no DOAJ tool and no
"DOAJ Plugin".

<a id="fn-q"></a>
**q** — `index.tpl`: `doiVersioning` (`Context::SETTING_DOI_VERSIONING`)
picks `plugins.importexport.common.export.publications` "Publications"
with `grid.publications.ExportPublishedPublicationsListGridHandler`, else
`.export.articles` "Articles" with
`grid.submissions.ExportPublishedSubmissionsListGridHandler`. Articles
grid: title `.export.articles`; columns `common.id` "ID",
`grid.submission.itemTitle` "Author; Title", `issue.issue` "Issue",
`common.status` "Status"; `SelectableItemsFeature`, `PagingFeature`;
filter `exportPublishedSubmissionsGridFilter.tpl` (columns
`submission.title` "Article Title" / `submission.authors` "Authors", the
published issues with `plugins.importexport.common.filter.issue` "Any
Issue", `getStatusNames()`). Data: `SubmissionDAO::getExportable()`
with `p.status = STATUS_PUBLISHED`. Cells
(`ExportPublishedSubmissionsListGridCellProvider`): title =
`getShortAuthorString()` + "; " + title, a `RedirectAction` to the
workflow; issue = an `AjaxModal` on `grid.issues.BackIssueGridHandler`
`editIssue` titled `plugins.importexport.common.settings.DOIPluginSettings`
(OJS1); status = the `doaj::status` setting's name, "Not Deposited" when
unset, the `getStatusActions()` link for `error`. Publications grid:
`grid.publication.itemSubmissionId` "Submission ID",
`publication.versionStage.label` "Publication Stage", "Author; Title",
"Status". Live-probed 2026-09-27 (Rules 34, 36, 37, 45; Fields; Settings
bullet 5), OJS: the tabs "Settings" and "Articles", "Publications" under
"DOI Versioning" "Yes" and "Articles" again once "No"; the columns and
filter lists as Fields says, "Any Issue" offering published issues
only; only published articles listed; "Author; Title" read "Lovelace;
Axolotl limb memory" and opened the workflow; "Issue" was empty, with no
link, for an article published in no issue, and opened the issue's
window headed "DOI Plugin Settings" with "Table of Contents", "Issue
Data" and "Issue Galleys" (OJS1). 26 articles gave 25 rows, "Items per
page: 10 25 50 75 100", "1 - 25 of 26 items" and page links; 3 articles
"1 - 3 of 3 items" and no links. "Okapi" and "Lovelace" found their
articles, "okapi" and "lovelace" nothing, on the test installs'
PostgreSQL databases (OJS6). On the Publications tab, publishing 1.1
turned the row's "VoR 1.0" into "VoR 1.1"; a published 2.0 added a "VoR
2.0" row; an unpublished 2.1 changed nothing. A version "Marked
registered" under "Yes" read "Not Deposited" on the Articles tab once
"DOI Versioning" was "No": statuses are stored per publication with
versioning and per submission without it.

<a id="fn-r"></a>
**r** — `PubObjectsExportPlugin::display()` passes `actionNames` from
`DOAJExportPlugin::getExportActions()` (`export`, `markRegistered`,
`deposit` first when `apiKey` is set; labels
`plugins.importexport.common.action.export` "Export",
`.markRegistered` "Mark registered", `.register` "Register"); the box
`plugins.importexport.common.validation` is `checked=$validation|default:true`.
`prepareAndExportPubObjects()`: nothing selected →
`plugins.importexport.common.error.noObjectsSelected` and a redirect to
the tab. `executeExportAction()` `export` → `exportXML()`; with
validation on, errors go to `ImportExportPlugin::displayXMLValidationErrors()`,
which prints an HTML page ("Validation errors:", "Invalid XML:", the
XML) and then throws, so the request answers 500. DOAJ's schema,
`doajArticles.xsd`, imports its language list from
`http://www.doaj.org/static/doaj/iso_639-2b.xsd`. `markRegistered` →
`updateStatus(…, markedRegistered)`, redirect. The `deposit` action
does not look at the box (note u). Live-probed 2026-09-27 (Rules 38–42; Settings
bullet 3), OJS: "Export" and "Mark registered" without a key, "Register"
first once a key is saved, the same for the Editor, Production Editor
and Site Administrator; each with nothing ticked returned to the tab
with "No objects selected." (Publications tab too). Unticked, "Export"
downloaded `doaj-{date}-articles-{id}.xml` with the ticked records and
no status changed; ticked, a journal with no ISSN and one with an
online ISSN alike got the "Validation errors:" page ("…The QName value
'{http://www.doaj.org/schemas/iso_639-2b/1.1}LanguageCodeType' does not
resolve to a(n) … type definition.") and a 500, no download (OJS7).
"Mark registered" set the row, kept after a reload and found by the
status filter; no notice follows it. "Register" with a dummy key, box
ticked, gave "Articles submitted successfully" and "Submitted" at once
(OJS8).

<a id="fn-s"></a>
**s** — `DOAJExportPlugin::executeExportAction()` `deposit`: per object
`exportJSON()` then `depositXML()`, which dispatches `DOAJRegister` (or
`DOAJDelete` when DOAJ's stored DOI or URL differ) and sets `submitted`;
notice `plugins.importexport.doaj.submit.success` "Articles submitted
successfully". `jobs/DOAJRegister::handle()` →
`registerObject()` (POST to DOAJ's API with the key) → `registered`, or
`error` with DOAJ's body (`plugins.importexport.doaj.register.error.mdsError`)
kept as the failed message the "Failed" link's window shows
(`getStatusActions()`, `verb=statusMessage`). `registerSchedules()`: the
daily `DOAJInfoSender` (`plugins.importexport.doaj.senderTask.name`
"DOAJ automatic registration task") for each journal with the generic
plugin on, `apiKey` and `automaticRegistration`, depositing
`getAllDepositableArticles()` (or publications with DOI versioning).
What happens once DOAJ answers: note x. Live-probed 2026-09-27 (Rule
43; Settings bullet 4), OJS: the task is registered daily (`0 0 * * *`,
`APP\plugins\generic\doaj\DOAJInfoSender`); run once with
`php lib/pkp/tools/scheduler.php test`, it turned the "Not Deposited"
article of a journal with a key and the box ticked to "Submitted", and
left alone the "Not Deposited" article of a journal with a key and the
box unticked.

<a id="fn-t"></a>
**t** — `PubObjectsExportGenericPlugin::handlePublicationPublishing()`
on `Publication::publish`: without DOI versioning, when the submission's
status is `registered` or `markedRegistered` and the published version
is its current one, `markStale()` (`stale`, "Needs Sync"); with
versioning the rules follow minor and major versions.
`handlePublicationUnpublishing()` does the same on unpublishing the
current version. Live-probed 2026-09-27 (Rule 44), OJS: a "Marked
registered" article given a published version 1.1 read "Needs Sync";
a "Not Deposited" article given a published 1.1 stayed "Not
Deposited".

<a id="fn-u"></a>
**u** — `DOAJExportPlugin::registerObject()` catches only Guzzle's
`RequestException` (setting `error`); a connection failure
(`ConnectException`, not one of those) escapes `jobs/DOAJRegister`, so
the job ends in the failed-jobs list and the status stays `submitted`.
`deposit` builds JSON (`exportJSON()`), not the XML the box validates. Live-probed 2026-09-27 (Rule 42), OJS: three
deposits (one from "Register", two from the daily task) failed at
connection; Administration › "View Failed Jobs" listed them, the rows
read "Submitted" after the jobs ran, and the "Error" status of the
filter showed "No Items" (OJS9).

<a id="fn-v"></a>
**v** — `omp/plugins/importexport/csv/CSVImportExportPlugin.php`:
`getActions()` returns `[]` ("Not available via the web interface"),
yet `display()` renders `$this->getTemplateResource('index.tpl')` and
the plugin has no `templates/` directory. It is still in the
`importexport` category, so `importexport.tpl` links it. The OMP
ONIX 3.0 exporter (`plugins/importexport/onix30`) belongs to
[ONIX metadata & export](U74-onix-metadata-export.md); the CSV importer's Tools link is OMP1's. The
Crossref and DataCite pages: the DOIs spec, Rule 44 and its notes.
Live-probed 2026-09-27 (Rule 6): the OJS
Crossref and DataCite pages and the OPS Crossref page read only "DOI
management has moved. Please see the DOI management and DOI settings
pages."; OMP's ONIX 3.0 page opens under its name; OMP's "Tab
Delimited Content Import Plugin" row on the Plugins list has no arrow,
and its Tools link answered 500 with a blank page (OMP1).

<a id="fn-w"></a>
**w** — `PKPToolsHandler::importexport()`: when `plugin/{name}` names no
registered plugin it falls through to `fetchJson('management/tools/importexport.tpl')`
and returns the JSON message as the page body. Seen 2026-09-26 on OMP
(DOIs claim check): `management/importexport/plugin/CrossrefExportPlugin`
answered 200 with the plugin list printed as raw JSON. Live-probed
2026-09-27, three apps: `…/plugin/NoSuchPlugin` and, on OMP,
`…/plugin/CrossrefExportPlugin` answered 200 `application/json`, one
line of JSON, no heading, no navigation, no link.

<a id="fn-x"></a>
**x** — Read from the code; no screen on the test installs shows it,
because they cannot reach NLM's or DOAJ's sites (notes n, r, s, u).
PubMed: with the DTD loaded and no validation error, `display()`
streams `pubmed-{date}-articles|issues-{contextId}.xml`. DOAJ:
`registerObject()` sets `registered` on success, and on an answer with
an error status `error` with DOAJ's body, kept as the message the
"Failed" link's window shows (`getStatusActions()`,
`verb=statusMessage`); the deposit is a POST of the article's JSON to
DOAJ's API with the journal's key.

<a id="fn-sc"></a>
**sc** — Scenarios. Scenarios 1 to 4 run on OJS, OMP and OPS, 5 and 6
on OJS and OMP, 7 to 10 on OJS. Scenario 2 reads `publicknowledge`
with the roster: `sectioneditor.ana`, `copyeditor.carla` (OPS
`assistant.rita`, Editorial Board Member), `reviewer.julia` (OJS, OMP),
`author.alex`, `reader.rosa`, and `manager.maya` for its control, each
with the username twice as password (`docs/process/users.md`); its
addresses are `{context}/management/tools` and
`{context}/management/importexport/plugin/NativeImportExportPlugin`,
and its signed-out visitor is a fresh browser context. Every other
scenario builds its contexts with `POST scenarios/context` (with
`contactName`, `contactEmail` and `country`, so scenario 5's email has
a principal contact to reply to) and a throwaway `manager`, named in
both contexts of scenarios 1, 4 and 6 so that one account manages both;
`admin` is enrolled as a manager in each, so the users lists hold it
too. The names in the scenarios ("kiwi", "moss", "Okapi field notes"…)
stand for the test's tag-prefixed throwaways. Scenario 1: the first
context as created, with an `editor` in `users[]` and `roles: {editor:
{permitSettings: false}}` on OJS and OMP; the second OJS journal
`plugins: {doajplugin: {enabled: false}}`. Scenario 3: `issues[]` on OJS
(one `published`, one not) and `POST scenarios/submission` for the three
submissions, "Quokka survey" with `decisions: ['sendExternalReview']` on
OJS and OMP, "Axolotl limb memory" `published` (on OJS with `issue` the
published one); a new press has its ONIX details blank. Scenario 4: A's
submission with a file (`files[]`, or a `galleys[]` entry on OPS, which
has no `files[]` key); the three further files are written by the test
from A's export, the way `shared/playwright/checks/U63/K2/k2.js` writes
them (an `<issue_identification>` of volume 99, number 9, year 2099; a
`<series>` with path `zzz` and title "Zed Series"; an unknown element
after the first submission). Scenario 5: `users[]` with the `author`
"kiwi"; the two users files written the way `K3/k3.js` writes them, with
`<user_groups>` defining each role named, `<date_registered>` and a
`<masthead>` per role, which the import needs (A13), and wren's password
an md5 value with `encryption="md5"`. Scenario 6: `users[]` with the
`copyeditor` and the `author`, each then signed in once through the
login form, since a seeded account keeps an older stored password until
then (seed-facts; A15) and the test tools' session sign-in does not
replace it; nova's and moss's sign-ins in scenarios 5 and 6 go through
the login form too. Scenarios 7 to 10: `issues[]` with one `published`
issue (7 also an unpublished one) and `POST scenarios/submission` with
`published` and `issue` for each article, 8's submitted by a throwaway
`author` named Ada Lovelace; 10 adds `enableDois: true`, `doiPrefix:
'10.1234'` and `doiVersioning: true`. The new versions of scenarios 8
and 10 are made on screen ("Create New Version"), since no key makes
one. Scenario 10 ends with "DOI Versioning" back on "No", which a test
also restores when it fails part-way: a journal left on "Yes" breaks
every OJS OAI list request of the install (`scenarios.md`). Scenario
9's "Register" queues a deposit that fails at connection and stays on
Administration › "View Failed Jobs" (note u). Live-probed 2026-09-27:
these keys seeded the claim check's states.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27, three apps, as the Journal Manager:
the lines are the Fields table's, on `publicknowledge` and on a new
scratch journal (press, server). Earlier probes the same day saw the
order move: a scratch journal whose "Crossref Manager Plugin" and
"DataCite Manager Plugin" were switched listed DataCite, DOAJ,
Crossref, …. Test run 2026-09-27 (OJS final): a scratch journal the
test had just created listed DOAJ, Crossref, DataCite, Native, Users,
PubMed, where every earlier run of the same test on the same install
had listed DOAJ, DataCite, Crossref, …. Why: note c.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (OJS): on a new scratch journal "DOAJ
Plugin" is ticked and "DOAJ Export Plugin" listed; unticked, the tool
is not listed and its address `…/plugin/DOAJExportPlugin` answers the
raw text of Rule 5; "Native XML Plugin" is listed in both states (note
o).

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27: the raw text on all three apps at
`…/plugin/NoSuchPlugin`, and on OMP at `…/plugin/CrossrefExportPlugin`
(note w).

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (OMP): the Tools link answered 500
with a blank white page; the Plugins list's row has no arrow at all
(note v).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27, three apps: "Import" with no file up
posted `importBounce`, added no tab, showed no message, and the
Dashboard counts did not change.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27, three apps: a plain-text file ("not
xml") and a .png each gave "The process failed…", the "Errors occured:"
line of Rule 13 and the two "Validation errors:" lines; nothing was
imported.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27, three apps: note f.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27, three apps: two "Import" presses with
the same file gave two tabs of the same name and two imported copies;
two export presses gave two "Export Submissions Results" tabs (note f,
A7).

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27, three apps: note h.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27, three apps: with nothing ticked the
tab stayed empty, its request answered 500, and no file downloaded
(A12).

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 on `publicknowledge` (OJS): the
columns "Select", "Issue", "Items" and the rows "Vol. 1 No. 2 (2014)"
and "Vol. 2 No. 1 (2015)", with other features' articles counted on
the shared install; Vol. 2 No. 1's export gave "Export Issues Results"
and a file; nothing ticked: note i.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (OMP): the reminder on a new press's
"Export" tab, not on "Import"; "Press Settings" opened Settings › Press
on "Masthead"; the four fields filled and saved removed it, "Publisher
Code" emptied again brought it back. The OJS and OPS export tabs have no
such line.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27, OJS and OMP: "abc" gave the row-2
line; Users & Roles › Users listed the account with its roles; "abc"
did not sign in ("Invalid username/email or password. Please try
again."). More lengths: note l.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-29, OJS and OMP, two runs each: a new
user given the Section Editor (Series Editor) and Reader roles with
`<masthead>false</masthead>` and `<date_start>2020-01-01</date_start>`
read "Does not appear on the masthead" and 2020-01-01 for both on the
roles page and under "Start Date" on the "Users" list, and was not on
"Editorial Masthead"; exported again, both roles read
`<masthead>false</masthead>`. A Reviewer (on a press also Internal and
External Reviewer) role given `false` read "Appear on the masthead"
with no control, and was exported `true`. A role given 2019 to 2020
was listed on "Editorial History" as "Section editor 2019 – 2020"
("Series editor" on a press). Roles without a start date started on
the import day. Moved from journal A to B, a Section Editor not on A's
masthead was written `false` and was not on B's; B's rows started at
A's start time. Before lib/pkp `85f6b3c074` (live-probed 2026-09-27):
every role read "Appear on the masthead" and started on the import day
(A2, A3).

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-27, OJS and OMP, once each: with no row
ticked, the request answered 500 and the browser showed a blank page;
nothing downloaded (A14). Live-probed again 2026-09-29, OJS and OMP,
three times each: the same 500 and blank page.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-27 (OJS): note n.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-27 (OJS): both exports with nothing
ticked gave the "Validation errors:" page with an empty `<ArticleSet/>`,
no download and no message (note n, OJS4).

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-27: the unknown issue {OJS}: note f; the
unknown section (OJS, OPS): note f-a9; the unknown series (OMP): note
f-omp3.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-27 (OJS): with the box ticked, a journal
with no ISSN and one with an online ISSN were refused alike (note r,
OJS7); unticked, the file downloaded. The ISSN is optional in DOAJ's
format, so a missing ISSN is not what fails the check.

<a id="fn-td20"></a>
**td20** — Live-probed 2026-09-27 (OJS): note q.

<a id="fn-td21"></a>
**td21** — Live-probed 2026-09-27 (OJS): note t.

<a id="fn-td22"></a>
**td22** — Live-probed 2026-09-27, OJS and OMP: note a.

<a id="fn-td23"></a>
**td23** — Live-probed 2026-09-27, three apps: note a. The access-denied
page is drawn in the reader-facing layout (the journal's header and
menu), not the editorial one.

<a id="fn-f-a1"></a>
**f-a1** — `PKPToolsHandler::importexport()` (note w). Live-probed
2026-09-27 on all three apps (notes w, td3). The same raw text answers
any unknown name after `…/management/importexport/` (such as
`…/importexport/anything`), a tool's address in
lower case (`…/plugin/nativeimportexportplugin`), the "DOAJ Export
Plugin" address while "DOAJ Plugin" is off (OJS), and every other
application's tool names (OJS: `CSVImportExportPlugin`,
`Onix30ExportPlugin`; OMP: `DOAJExportPlugin`, `PubMedExportPlugin`;
OPS: `UserImportExportPlugin`, `DOAJExportPlugin`,
`DataciteExportPlugin`); each 200 `application/json`, no heading, no
navigation. The bare `…/management/importexport` and
`…/management/permissions` are not part of A1: they are what the Tools
page itself loads into its "Import/Export" and "Permissions" tabs
(`GET …/management/importexport?_=…` on opening Tools,
`…/management/permissions?_=…` on pressing "Permissions"), each 200
`application/json` by design; live-probed 2026-10-01, three apps, two
runs, as the Journal Manager (a Section Editor gets the access-denied
page at each).
Issue report: [pkp-e2e#19](https://github.com/jardakotesovec/pkp-e2e/issues/19) ([docs/issues/U63-A1-tools-absent-tool-address-raw-json.md](../issues/U63-A1-tools-absent-tool-address-raw-json.md)).

<a id="fn-f-a2"></a>
**f-a2** — `UserXmlPKPUserFilter::parseUser()` (note l): `if
($userGroup->roleId = Role::ROLE_ID_REVIEWER) { $masthead = true; }`;
the export side (`PKPUserUserXmlFilter`) has the same assignment, so an
exported file also reads `<masthead>true</masthead>` for every role.
Since lib/pkp `8fb142ad3`, 2025-06-10. Live-probed 2026-09-27, OJS and
OMP (note td14): an account stored as not appearing in journal A (A's
masthead does not list it) was written `<masthead>true</masthead>` by
both of A's exports, and after the import into B it is listed on B's
"Editorial Masthead". Fixed by lib/pkp `85f6b3c074` (pkp/pkp-lib#13390,
"Fix reviewer role check and start date in user import/export",
merged 2026-09-28): both filters compare with `==`, and the export
writes the role's own `masthead`, reviewer roles `true`. Seen fixed
2026-09-29, OJS and OMP, two runs each (note td14).

<a id="fn-f-a3"></a>
**f-a3** — `UserXmlPKPUserFilter::parseUser()`: `$dateStart =
$startDate ?? Core::getCurrentDate();` overwrites the parsed
`date_start` with today (`$startDate` is never set). Since lib/pkp
`8fb142ad3`, 2025-06-10. Live-probed 2026-09-27, OJS and OMP (note
td14): Users & Roles › Users "Start Date" and the roles page read the
import date; a role with `<date_start>2019-01-01</date_start>` and
`<date_end>2020-12-31</date_end>` is listed on "Editorial History" as
"2026 – 2020". Fixed by lib/pkp `85f6b3c074` (pkp/pkp-lib#13390, merged
2026-09-28), which reads `$dateStart ??= Core::getCurrentDate();`. Seen
fixed 2026-09-29, OJS and OMP, two runs each (note td14).

<a id="fn-f-a4"></a>
**f-a4** — `UserXmlPKPUserFilter::importUserPasswordValidation()` adds
`plugins.importexport.user.error.plainPasswordNotValid` but does not
skip the user; `parseUser()` goes on to `Repo::user()->add()` and the
role rows. Live-probed 2026-09-27, OJS and OMP (notes td13, l): 3
and 5 characters and an empty `<value>`; a reset was not driven.
Issue report: [pkp-e2e#20](https://github.com/jardakotesovec/pkp-e2e/issues/20) ([docs/issues/U63-A4-users-import-refused-password-creates-account.md](../issues/U63-A4-users-import-refused-password-creates-account.md)).

<a id="fn-f-a5"></a>
**f-a5** — `APP\submission\DAO::getExportable()` with
`EXPORT_STATUS_DEPOSITABLE` (from `getAllDepositableArticles()`) adds
`->whereNull('pss.setting_value')->orWhere('pss.setting_value', '=', 'stale')`
inside a `when()` on the whole query, so the SQL reads `… AND
s.context_id = ? AND p.status = 3 … AND pss.setting_value IS NULL OR
pss.setting_value = 'stale'`: the second branch has none of the other
conditions. Since ojs `2868948ee8` (pkp/ojs#5125 for
pkp/pkp-lib#11589, 2025-10-07). `APP\publication\DAO::getExportable()`
(`getAllDepositablePublications()`, journals with DOI versioning) has
the same line, since ojs `b10a6cb667` (pkp/ojs#4985, merged
2025-10-04); read in the code. Seen once on a running install,
2026-09-27, with the daily task run by hand: journal X (key saved, box
ticked) sent its own "Not Deposited" article and journal A's "Needs
Sync" article, though A's box was unticked; A's DOAJ list then showed
that article "Submitted", and the failed deposit job for it carried X's
key. Walked 2026-09-30, OJS main: a new journal with a key and the box
ticked; `publicknowledge`'s submission 17 marked registered, unpublished
and published again ("Needs Sync"); the task run with
`php lib/pkp/tools/scheduler.php test`: submission 17 read "Submitted"
and one `DOAJRegister` job was queued in the new journal's name, its
link on the new journal's path (404). On stable-3_5_0 the task queued
nothing. Walked 2026-10-01, OJS main, two runs, the task run once per
stage with `php lib/pkp/tools/scheduler.php test
--name='APP\plugins\generic\doaj\DOAJInfoSender'` and the queued jobs
and stored statuses read from the database beside the DOAJ lists;
journals created (and listed on "Hosted Journals") in the order Nv, Vv,
Xn, Vb, N1, X1, X2, N2, the V journals with "DOI Versioning" "Yes";
each "Needs Sync" item made by "Mark registered", "Unpublish" and
"Publish". (a) Xn (no versioning) and Vb (versioning) depositing, Nv's
article and Vv's version "Needs Sync", their boxes unticked: Xn queued
one `DOAJRegister` in its own name for Nv's article (link
`…xn…/article/view/<Nv's id>`), none for Vv's; Vb one for Vv's version
(`…vb…/article/view/<id>/version/<id>`), none for Nv's; Nv's and Vv's
lists then read "Submitted". `DOAJInfoSender::executeActions()` calls
`getAllDepositablePublications()` for a versioning journal and
`getAllDepositableArticles()` otherwise. (b) Vb's own article, 1.0
"Needs Sync" and a minor 1.1 published: the "Publications" list showed
one row, "VoR 1.1 … Needs Sync"; the task queued two jobs, for 1.0 and
for 1.1, both stored statuses went from `stale` to `submitted`, and the
row read "Submitted" (the `stale` branch also drops the latest-minor
condition). (c) N1 before X1, both depositing, N1's article "Needs
Sync": one job, in N1's name; X2 before N2, both depositing, N2's
article "Needs Sync": one job, in X2's name with X2's link, none from
N2, and N2's list read "Submitted". Journals are taken in `ORDER BY
seq`. Both versioning journals were set back to "No" afterwards.
Issue report: [pkp-e2e#21](https://github.com/jardakotesovec/pkp-e2e/issues/21) ([docs/issues/U63-A5-doaj-daily-deposit-takes-other-journals-articles.md](../issues/U63-A5-doaj-daily-deposit-takes-other-journals-articles.md)).

<a id="fn-f-a6"></a>
**f-a6** — Live-probed 2026-09-27, three apps (note e): the "Upload
File" button carries `tabindex="-1"`, and Tab from the tab strip lands
first on "Import". The attribute is in the shared
`templates/controllers/fileUploadContainer.tpl`; since pkp-lib
`3342372300` (plupload 2.1.9 to 2.3.6, 2018-10-22) plupload also takes
its hidden file input out of the tab order, so nothing in the box takes
the focus. Walked 2026-09-30, main and stable-3_5_0, three apps, and on
OJS main the upload window from an author's "Revisions Uploaded" and an
editor's "Draft Files": Tab from "Article Component" lands on "Cancel".
Issue report: [pkp-e2e#22](https://github.com/jardakotesovec/pkp-e2e/issues/22) ([docs/issues/U63-A6-upload-file-keyboard-unreachable.md](../issues/U63-A6-upload-file-keyboard-unreachable.md)).

<a id="fn-f-a7"></a>
**f-a7** — The results tab's content is loaded by its tab's own
request, `…/import?temporaryFileId=…`, which runs again whenever the
tab is chosen (note f). Live-probed 2026-09-27, three apps: two presses
and one click on each tab left four copies (OJS numbers 802–805, OMP
662–665).
Issue report: [pkp-e2e#23](https://github.com/jardakotesovec/pkp-e2e/issues/23) ([docs/issues/U63-A7-import-results-tab-imports-again.md](../issues/U63-A7-import-results-tab-imports-again.md)).

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-27, three apps (note f): a submitted
submission and a published one with two versions, exported and
re-imported unchanged. The lines come from the native filters'
`addError()` calls, which do not stop the import.
Issue report: [pkp-e2e#24](https://github.com/jardakotesovec/pkp-e2e/issues/24) ([docs/issues/U63-A8-native-import-article-without-issue-lists-error.md](../issues/U63-A8-native-import-article-without-issue-lists-error.md)).
Issue report: [pkp-e2e#25](https://github.com/jardakotesovec/pkp-e2e/issues/25) ([docs/issues/U63-A8-native-import-other-context-resets-contributor-roles.md](../issues/U63-A8-native-import-other-context-resets-contributor-roles.md)).

<a id="fn-f-a9"></a>
**f-a9** — OJS `NativeXmlPublicationFilter` adds `unknownSection` and
skips the publication (note f), leaving the submission without one.
Live-probed 2026-09-27, OJS and OPS, a file whose `section_ref` is
"ZZZ": `GET …/NativeImportExportPlugin/import?temporaryFileId=…`
answered 500 and the tab stayed empty; the Dashboard row read "812
Submission 0 Assign Editor View" (OPS "521 Production 0 View"); its
"View" changed the address and opened no window, with the console error
"TypeError: Cannot read properties of undefined (reading
'authorsStringShort')"; the export tab kept only "Select All" and its
button, with "…(reading 'fullTitle')".
Issue report: [pkp-e2e#26](https://github.com/jardakotesovec/pkp-e2e/issues/26) ([docs/issues/U63-A9-import-unknown-section-broken-submission.md](../issues/U63-A9-import-unknown-section-broken-submission.md)).

<a id="fn-f-a10"></a>
**f-a10** — Note g. Live-probed 2026-09-27, three apps: with
Submission, Review and Production pressed the published submission was
absent, and present once cleared; on OPS "Production" listed three
submissions, not the published one.
Issue report: [pkp-e2e#13](https://github.com/jardakotesovec/pkp-e2e/issues/13) ([docs/issues/U63-A10-export-list-published-no-stage.md](../issues/U63-A10-export-list-published-no-stage.md)).

<a id="fn-f-a11"></a>
**f-a11** — `ImportExportPage.vue::toggleSelectAll()` selects the
loaded page and compares with `itemsMax` (note g). Live-probed
2026-09-27, three apps, 101 submissions: 100 ticked, the label "Select
All" after both presses; "Paged item 100" ticked on page 1 and "Paged
item 001" on page 2 gave a file holding "Paged item 001" only.
Issue report: [pkp-e2e#14](https://github.com/jardakotesovec/pkp-e2e/issues/14) ([docs/issues/U63-A11-export-selection-stops-at-page.md](../issues/U63-A11-export-selection-stops-at-page.md)).

<a id="fn-f-a12"></a>
**f-a12** — Live-probed 2026-09-27 (notes h, i): `GET
…/NativeImportExportPlugin/exportSubmissions?selectedSubmissions=`
answered 500 on all three apps, `GET …/exportIssues?selectedIssues=`
on OJS.
Issue report: [pkp-e2e#15](https://github.com/jardakotesovec/pkp-e2e/issues/15) ([docs/issues/U63-A12-export-nothing-ticked-empty-results-tab.md](../issues/U63-A12-export-nothing-ticked-empty-results-tab.md)).

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-27, OJS and OMP (note k): `GET
…/UserImportExportPlugin/import?temporaryFileId=…` answered 500 for
each of the four files (the format check throws instead of reaching the
`validationErrors` branch); no account was created.
Issue report: [pkp-e2e#16](https://github.com/jardakotesovec/pkp-e2e/issues/16) ([docs/issues/U63-A13-users-import-unreadable-file-empty-results.md](../issues/U63-A13-users-import-unreadable-file-empty-results.md)).

<a id="fn-f-a14"></a>
**f-a14** — Live-probed 2026-09-27, OJS and OMP, once each (note m):
`POST …/management/importexport/plugin/UserImportExportPlugin/export`
with no `selectedUsers[]` answered 500; the address stayed on
`…/export` with an empty page. Live-probed again 2026-09-29, OJS and
OMP, three times each (note td15): the same 500, empty page and no
download.

<a id="fn-f-a15"></a>
**f-a15** — `importUserPasswordValidation()` (note l) replaces a hash
that `password_needs_rehash()` flags and adds `.passwordHasBeenChanged`
for any user, but only a new account is saved with the new password and
sent `UserCreated`. Live-probed 2026-09-27, OJS and OMP (note l): an
existing account given a cost-10 file password, and a seeded account
moved before its first sign-in, got the line, no mail and kept their
passwords. On PHP older than 8.4 (A16) the same code path keeps an
existing account's password and sends it nothing; read from the code,
not driven.
Issue report: [pkp-e2e#17](https://github.com/jardakotesovec/pkp-e2e/issues/17) ([docs/issues/U63-A15-users-import-existing-account-told-new-password.md](../issues/U63-A15-users-import-existing-account-told-new-password.md)).

<a id="fn-f-a16"></a>
**f-a16** — Note l: `password_needs_rehash()` is called without a cost,
so below PHP 8.4 it flags the cost-12 hashes the installation writes;
the application requires PHP 8.2.0 or later
(`PKPApplication::PHP_REQUIRED_VERSION`).
Test run 2026-09-27, OJS and OMP on PHP 8.3 (scenario 6, both
attempts): the "Results" tab read "Import/Export errors:" and the
"…could not be imported as is. … The user has been imported." line for
every account of the file moved from journal A to B (the Site
Administrator, the manager, moss and fern, each signed in through the
login form before the export) instead of the success sentence; the same
scenario read the success sentence on PHP 8.4. Live-probed 2026-09-29,
OJS and OMP on PHP 8.3.33 (Administration › System Information "PHP
version 8.3.33"), twice (Rule 25, rows 3 and 4): a new account given a
cost-12 bcrypt got the row-4 line, had to change its password, got the
"Journal Registration" / "Press Registration" email from the importing
manager with the contact as reply-to, and its original password no
longer signed in; a cost-10 bcrypt, PHP's default below 8.4, got no
line and no mail and signed in with the original. Note l's cost-10
row-4 line of 2026-09-27 is the PHP 8.4 branch.
Issue report: [pkp-e2e#18](https://github.com/jardakotesovec/pkp-e2e/issues/18) ([docs/issues/U63-A16-users-import-resets-installation-passwords.md](../issues/U63-A16-users-import-resets-installation-passwords.md)).

<a id="fn-f-a17"></a>
**f-a17** — Note l. A regression of lib/pkp `85f6b3c074`
(pkp/pkp-lib#13390, merged 2026-09-28), which began keeping the file's
`<date_start>`: before it every role started on the import day, so a
second import found it active and skipped it. The later end date half
predates it (lib/pkp `8fb142ad3`, 2025-06-10). Live-probed 2026-09-29,
OJS and OMP, two runs each, and by a separate read of that change the
same day: a new user given "Section editor" ("Series editor") with
`<date_start>2027-06-01 00:00:00</date_start>` and no end date, imported
three times (a second press of "Import Users", then the file uploaded
again), read the success sentence each time; the stored role rows went
1, 2, 3, the "Users" list read "Section editor" and "2027-06-01" three
times, and the roles page listed three rows. Control: `2020-01-01`
imported twice left one row. A role given 2020-01-01 to 2030-12-31,
imported twice, read the success sentence twice and left two stored
rows; "Editorial Masthead" listed the person once, "2020 –", and the
"Users" list showed no role or start date for that user (the users
list's own reading, not this feature's). Seen on stable-3_5_0 too (the
same patch). Written up for the team in
`docs/reports/2026-09-29-pkp-lib-13390.md` (Finding 2; a temporary
report, deleted once acted on).

<a id="fn-f-a18"></a>
**f-a18** — Note l. lib/pkp `85f6b3c074` (pkp/pkp-lib#13390, merged
2026-09-28) began reading `<date_start>`: `$dateStartNode?->textContent`
is `""` for an empty element and `??=` keeps it; before, the file's
start date was never read, and an empty or free-text one imported like
a missing one. `<date_end>` was read already (since lib/pkp
`8fb142ad3`, 2025-06-10). Live-probed 2026-09-29, OJS and OMP, two runs
each, and by a separate read of that change the same day: three files,
a role with `<date_start></date_start>`, one with
`<date_start>soon</date_start>`, one with `<date_end></date_end>`. For
each, `GET …/management/importexport/plugin/UserImportExportPlugin/import?temporaryFileId=…`
answered 500 and the "Results" tab (with "Close") stayed empty; the
user's account was created, not disabled, with no role (its roles page
listed none), and signed in; in the empty-start file the user after it
was not created. Users before the failing one were not driven. Server
log (the test installs run PostgreSQL): `SQLSTATE[22007] … invalid
input syntax for type timestamp: ""` for the empty start and end dates,
`Carbon\Exceptions\InvalidFormatException: Could not parse 'soon'` for
the free text. Control: a file with no `<date_start>` element imported,
the role starting on the import day. Seen on stable-3_5_0 too (the same
patch). Written up for the team in
`docs/reports/2026-09-29-pkp-lib-13390.md` (Finding 1; a temporary
report, deleted once acted on).

<a id="fn-f-a19"></a>
**f-a19** — `PKPToolsHandler::importexport()` (note w) hands the
missing name on to the plugin lookup, which fails: the server log reads
`PKP\plugins\PluginRegistry::getPlugin(): Argument #2 ($name) must be of
type string, null given`. Live-probed 2026-10-01, OJS, OMP and OPS
main, two runs each, as the Journal Manager: `GET
…/management/importexport/plugin` answered 500 with an empty body; as
the Section Editor, the access-denied page.

<a id="fn-f-a20"></a>
**f-a20** — `PKPPublicationNativeXmlFilter::addMetadata()` writes
`<title>` from `getTitles('html')`, the prefix and the title joined,
beside a separate `<prefix>`; `NativeXmlPKPPublicationFilter` reads
both back, so the copy stores the prefix "The" and the title "The
Signalling …". Live-probed 2026-10-01, OJS, OMP and OPS main and OJS
stable-3_5_0, two runs each: "Prefix" "The" saved on Publication ›
"Title & Abstract" (the box read "The" after a reload; stored
`prefix=The`, `title=Signalling Theory Dividends: A Review Of The
Literature`); the exported file read `<title locale="en">The
Signalling Theory Dividends: A Review Of The Literature</title>` and
`<prefix locale="en">The</prefix>`; imported into a second journal
(press, server) and into the same one, the results line read
""46" - "The The Signalling Theory Dividends: A Review Of The
Literature"" (OJS r1), the copy's workflow header the same, its
"Prefix" "The" and stored title "The Signalling …". Control: "Okapi
forest census", no prefix, came back unchanged. Not traced to a
commit; the same on 3.5.

<a id="fn-f-a21"></a>
**f-a21** — Note l. `UserXmlPKPUserFilter::parseUser()` sets the
registration date only from a `<date_registered>` element, so a user
without one reaches `Repo::user()->add()` with none, and the insert
fails on `users.date_registered`'s not-null constraint; the users added
before it stay. Live-probed 2026-10-01, OJS and OMP main, two runs
each: a file of three users, the second without `<date_registered>`:
`GET …/UserImportExportPlugin/import?temporaryFileId=…` answered 500
and the "Results" tab (with "Close") stayed empty; the first user was
created with its Reader role (Settings › Users & Roles › "Users":
"Current Users (1)", "Reader 2026-10-01"), the second and third were
not. Server log (PostgreSQL): "PHP Fatal error: Uncaught PDOException:
SQLSTATE[23502]: Not null violation: 7 ERROR: null value in column
"date_registered" of relation "users" violates not-null constraint".
Control: the same three users each with `<date_registered>`: 200, the
success sentence, three accounts.

<a id="fn-f-a22"></a>
**f-a22** — Note m (the users Collector's default status). Live-probed
2026-10-01, OJS and OMP main, two runs each, a scratch journal (press)
with: B, "Section editor" ("Series editor") from today; C, the same
role from 2020-01-01 to 2021-06-30 only; D, the role from 2020-01-01 to
2030-12-31 (by users import); A by import, the role from 2027-06-01 as
its only role; A by invitation, a new account invited to the role with
START DATE 2027-06-01 and accepted from the email. "Export Users":
"Current Users", "1 - 9 of 9 items", the Site Administrator, the
manager, B, D and the readers, neither A nor C; "Search" with either
A's given name "No Items", with D's D listed. "Export All Users" ›
"Confirm" › "OK" downloaded `users-…-users-<id>.xml` with the same nine
accounts, D's role with `2020-01-01` and `2030-12-31`. Settings › Users
& Roles › "Users": "Current Users (11)", both A accounts ("Section
editor 2027-06-01" / "Series editor 2027-06-01"), C and D. A role not
yet begun is also one the users list cannot end:
[Users management, its A19](U53-users-management.md#a19).

<a id="fn-f-ojs1"></a>
**f-ojs1** — `ExportPublishedSubmissionsListGridCellProvider::getCellActions()`
`issue`: `AjaxModal(…BackIssueGridHandler/editIssue…,
__('plugins.importexport.common.settings.DOIPluginSettings'))`.
Live-probed 2026-09-27: note q. Live-probed 2026-10-01, OJS main, two
runs: with "DOI Versioning" "Yes" the "Publications" list has the
columns "Select", "Submission ID", "Publication Stage", "Author; Title"
and "Status", no "Issue" column, and its rows link only "Author; Title"
(to the workflow); nothing on it opens an issue window, so OJS1 is met
from the "Articles" list only. Set back to "No", the same journal's
"Articles" list has "Issue" again; on a journal without versioning the
issue's name opens the window headed "DOI Plugin Settings".
Issue report: [pkp-e2e#27](https://github.com/jardakotesovec/pkp-e2e/issues/27) ([docs/issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md](../issues/U63-OJS1-doaj-issue-window-headed-doi-plugin-settings.md)).

<a id="fn-f-ojs2"></a>
**f-ojs2** — The tool is registered by the enabled generic plugin
(note o); why the Plugins list keeps its row was not traced.
Live-probed 2026-09-27 (note o): the row in two runs; its
"Import/Export Data" opened the raw text once, at the same address
note td2 saw answer it.
Issue report: [pkp-e2e#28](https://github.com/jardakotesovec/pkp-e2e/issues/28) ([docs/issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md](../issues/U63-OJS2-doaj-tool-listed-when-doaj-plugin-off.md)).

<a id="fn-f-ojs3"></a>
**f-ojs3** — Note n (`??` keeps a saved empty string). Live-probed
2026-09-27: the file text on the export page read
`<JournalTitle></JournalTitle>` after the box was saved empty (the box
empty after a reload). Walked 2026-09-30, main and stable-3_5_0: a first
"Save" with the box untouched empties the title too. Since ojs
`1e556c9455` (pkp/ojs#4955, main, 2025-06-24) and `c1d5f94e79`
(pkp/ojs#4918, stable-3_5_0, 2025-06-04).
Issue report: [pkp-e2e#29](https://github.com/jardakotesovec/pkp-e2e/issues/29) ([docs/issues/U63-OJS3-pubmed-empty-nlm-title-empty-journal-title.md](../issues/U63-OJS3-pubmed-empty-nlm-title-empty-journal-title.md)).

<a id="fn-f-ojs4"></a>
**f-ojs4** — Note n. Live-probed 2026-09-27: `POST
…/PubMedExportPlugin/exportSubmissions` answered 500 four times and
`…/exportIssues` three times, each with "Could not load the external
subset "https://dtd.nlm.nih.gov/ncbi/pubmed/in/PubMed.dtd"".
Live-probed again 2026-10-01, OJS main, NLM unreachable, two runs:
"Export Issues" with one issue ticked and "Export Articles" with one
article ticked, three times each per run, 12 of 12 presses answered
500 in about 0.2 s with the "Validation errors:" page and no download;
the log each time "DOMDocument::validate(…PubMed.dtd): Failed to open
stream: Connection refused", "Filter output validation failed" and
"Uncaught Exception: Could not convert selected objects.".
Issue report: [pkp-e2e#30](https://github.com/jardakotesovec/pkp-e2e/issues/30) ([docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md](../issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md)).

<a id="fn-f-ojs5"></a>
**f-ojs5** — Note p. Live-probed 2026-09-27 on both Settings tabs.
Issue report: [pkp-e2e#31](https://github.com/jardakotesovec/pkp-e2e/issues/31) ([docs/issues/U63-OJS5-tool-settings-cancel-does-nothing.md](../issues/U63-OJS5-tool-settings-cancel-does-nothing.md)).
Issue report: [pkp-e2e#32](https://github.com/jardakotesovec/pkp-e2e/issues/32) ([docs/issues/U63-OJS5-tool-settings-required-note-without-required-field.md](../issues/U63-OJS5-tool-settings-required-note-without-required-field.md)).

<a id="fn-f-ojs6"></a>
**f-ojs6** — Note q. Live-probed 2026-09-27 on the test installs,
whose databases are PostgreSQL; a MySQL install was not tried.
Live-probed again 2026-10-01, OJS main on PostgreSQL 18.6, two runs:
"Article Title" "Okapi" listed "Lovelace; Okapi forest census",
"okapi" and "OKAPI" answered "No Items"; "Authors" "Lovelace" listed
both articles, "lovelace" "No Items". MySQL not checked: no MySQL
install on the test machines.
Issue report: [pkp-e2e#33](https://github.com/jardakotesovec/pkp-e2e/issues/33) ([docs/issues/U63-OJS6-doaj-list-search-matches-letter-case.md](../issues/U63-OJS6-doaj-list-search-matches-letter-case.md)).

<a id="fn-f-ojs7"></a>
**f-ojs7** — Note r (`doajArticles.xsd` imports its language list from
www.doaj.org). Live-probed 2026-09-27: `POST
…/DOAJExportPlugin/exportSubmissions` answered 500 twice, for journals
with and without an ISSN.
Issue report: [pkp-e2e#30](https://github.com/jardakotesovec/pkp-e2e/issues/30) ([docs/issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md](../issues/U63-OJS4-OJS7-pubmed-doaj-export-fails-site-unreachable.md)).

<a id="fn-f-ojs8"></a>
**f-ojs8** — Notes r, u. Live-probed 2026-09-27: "Register" posted
with the box ticked returned "Articles submitted successfully" and
"Submitted" on the same journal whose ticked "Export" was refused.

<a id="fn-f-ojs9"></a>
**f-ojs9** — Live-probed 2026-09-27: note u.
Issue report: [pkp-e2e#34](https://github.com/jardakotesovec/pkp-e2e/issues/34) ([docs/issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md](../issues/U63-OJS9-doaj-deposit-unreachable-stays-submitted.md)).

<a id="fn-f-ojs10"></a>
**f-ojs10** — Note i (`ExportableIssuesListGridHandler::loadData()`, no
order). Before ojs `88aaa6b49f` (pkp/pkp-lib#7129, 2021-08-30)
`loadData()` called `IssueDAO::getIssues()`, `… ORDER BY current DESC,
date_published DESC` (read in `IssueDAO.inc.php` at the parent
commit). Live-probed 2026-10-01, OJS main, Journal Manager, a scratch
journal of 30 issues (every third unpublished, volumes and years
mixed), two runs: "Export Issues" on the Native XML and the PubMed
tools read "1 - 25 of 30 items" with page links and "Items per page"
10/25/50/75/100; three loads of each tool, both pages: every issue once,
none repeated, none missing, the same order on both tools. Run 2
listed them in the order they were created ("Vol. 8 No. 2 (2006)",
"Vol. 15 No. 3 (2017)", "Vol. 22 No. 1 (1998)" …); run 1 in neither
creation nor any column's order ("Vol. 21 No. 3 (2005)", "Vol. 28 No.
1 (2016)", "Vol. 5 No. 2 (1997)" …). OJS stable-3_5_0, two runs: the
same, `loadData()` identical there.

<a id="fn-f-omp1"></a>
**f-omp1** — Note v. Seen 2026-09-27 on OMP (Plugins management claim
check): the "Import/Export Plugins" row of the CSV tool has no link for
the managers where the other rows offer "Import/Export Data".
Live-probed 2026-09-27 (note td4): `GET
…/management/importexport/plugin/CSVImportExportPlugin` answered 500
with a blank page (the missing `templates/index.tpl`).
Issue report: [pkp-e2e#35](https://github.com/jardakotesovec/pkp-e2e/issues/35) ([docs/issues/U63-OMP1-omp-tools-csv-import-blank-page.md](../issues/U63-OMP1-omp-tools-csv-import-blank-page.md)).

<a id="fn-f-omp2"></a>
**f-omp2** — Note j (omp `1f666119c`, 2016-04-04, "optional ONIX
metadata in native export"). Live-probed 2026-09-27: note td12.

<a id="fn-f-omp3"></a>
**f-omp3** — OMP `NativeXmlPublicationFilter`: a series path the press
lacks adds the warning `plugins.importexport.native.error.unknownSeries`
and then `Repo::section()->add()` with the file's series data.
Live-probed 2026-09-27: a monograph naming series "zzz" was imported
with "Warnings encountered:" "Publication Unknown series zzz", and
Settings › Press › "Series" gained "Zed Series".

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Tools page and its ops (Permissions and its reset: *Publication metadata*) | `{context}/management/tools`, `management/importexport`, `management/permissions` → `PKPToolsHandler` | ROUTE-018 |
| Tools tab bar ("Import/Export", "Permissions") | `management/tools/index.tpl` | AFFM-161 |
| The "Import/Export" list | `management/tools/importexport.tpl` | AFFM-162 |
| A tool's page container | `ImportExportPage.vue` | VUE-019 |
| Native XML Plugin | `management/importexport/plugin/NativeImportExportPlugin` | PLUG-032 |
| Native "Import" tab | `…/uploadImportXML`, `…/importBounce`, `…/import` | AFFM-164 |
| Native export list, "Select All", "View", export | `…/exportSubmissionsBounce`, `…/exportSubmissions`, `…/downloadExportFile` | AFFM-165 |
| Native "Export Issues" {OJS} | `…/exportIssuesBounce`, `…/exportIssues`; grid `grid.issues.ExportableIssuesListGridHandler` | AFFM-166, GRID-071 |
| Users XML Plugin {OJS OMP} | `…/plugin/UserImportExportPlugin` (`importBounce`, `import`, `export`, `exportAllUsers`); grid `grid.users.exportableUsers.ExportableUsersGridHandler` | PLUG-035, AFFM-167, GRID-052 |
| PubMed XML Export Plugin {OJS} | `…/plugin/PubMedExportPlugin` (`exportSubmissions`, `exportIssues`); settings via `grid.settings.plugins.settingsPluginGridHandler` `manage` | PLUG-034, AFFM-168 |
| DOAJ Plugin and DOAJ Export Plugin {OJS} | generic `doajplugin`; `…/plugin/DOAJExportPlugin` (`exportSubmissions`, `exportPublications`) | PLUG-012 |
| DOAJ Articles list {OJS} | `grid.submissions.ExportPublishedSubmissionsListGridHandler` | GRID-078 |
| DOAJ Publications list {OJS} | `grid.publications.ExportPublishedPublicationsListGridHandler` | GRID-076 |
| DOAJ daily deposit {OJS} | `DOAJInfoSender` (scheduled) | JOB-061 |
| Unmounted DOI export grids (dead-code candidates, UNASSIGNED item 43) | `grid.pubIds.PubIdExport{Issues,Representations,Submissions}ListGridHandler` (OJS), `PubIdExport{Representations,Submissions}ListGridHandler` and `ExportPublishedSubmissionsListGridHandler` (OPS) | GRID-073, GRID-074, GRID-075, GRID-102, GRID-103, GRID-105 |
| Riders: the Permissions tab and reset (*Publication metadata*) | `management/tools/permissions.tpl`, `tools/resetPermissions` | ROUTE-018, AFFM-161 |

## Reference — code anchors

- Page handler: `lib/pkp/pages/management/PKPToolsHandler.php`,
  `ManagementHandler.php`; each app's `pages/management/index.php`.
- Templates: `lib/pkp/templates/management/tools/{index,importexport,permissions}.tpl`,
  `lib/pkp/templates/plugins/importexport/{resultsImport,resultsExport,innerResults}.tpl`,
  `lib/pkp/templates/controllers/grid/users/exportableUsers/userGridFilter.tpl`,
  `ojs/templates/controllers/grid/submissions/exportPublishedSubmissionsGridFilter.tpl`.
- Base classes: `lib/pkp/classes/plugins/ImportExportPlugin.php`,
  `lib/pkp/classes/plugins/importexport/PKPImportExportDeployment.php`,
  `ojs/classes/plugins/{PubObjectsExportPlugin,PubObjectsExportGenericPlugin}.php`.
- Native: `lib/pkp/plugins/importexport/native/` (plugin, deployment,
  filters), `{ojs,omp,ops}/plugins/importexport/native/`.
- Users: `lib/pkp/plugins/importexport/users/` (plugin, filters),
  `{ojs,omp}/plugins/importexport/users/`.
- PubMed: `ojs/plugins/importexport/pubmed/`.
- DOAJ: `ojs/plugins/generic/doaj/` (`DOAJPlugin`, `DOAJExportPlugin`,
  `DOAJInfoSender`, `jobs/DOAJRegister`, `jobs/DOAJDelete`,
  `classes/form/DOAJSettingsForm`, `filter/`).
- OMP-only: `omp/plugins/importexport/csv/`, `omp/plugins/importexport/onix30/`.
- Grids: `lib/pkp/controllers/grid/users/exportableUsers/ExportableUsersGridHandler.php`,
  `ojs/controllers/grid/issues/ExportableIssuesListGridHandler.php`,
  `ojs/controllers/grid/submissions/ExportPublishedSubmissionsListGrid{Handler,CellProvider}.php`,
  `ojs/controllers/grid/publications/ExportPublishedPublicationsListGrid{Handler,CellProvider}.php`,
  `{ojs,ops}/controllers/grid/pubIds/*` (unmounted).
- ui-library: `src/components/Container/ImportExportPage.vue`,
  `src/components/ListPanel/submissions/SubmissionsListPanel.vue`;
  `{ojs,omp,ops}/classes/components/listPanels/SubmissionsListPanel.php`,
  `lib/pkp/classes/components/listPanels/PKPSubmissionsListPanel.php`.
