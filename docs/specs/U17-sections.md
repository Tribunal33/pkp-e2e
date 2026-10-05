---
name: sections
status: verified
---

# Sections

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal is divided into sections (for example "Articles" and "Reviews"),
and every article sits in exactly one of them. A Journal Manager keeps the
list of sections on Settings › Journal › "Sections": creates them, orders
them, closes them to new submissions, restricts them to editors, deletes
the empty ones, and gives each its own rules: a policy authors read before
submitting, an abstract requirement and word limit, a default review form,
how its heading and authors appear in an issue's table of contents, and the
editors to be assigned automatically to what is submitted to it. Authors
meet the sections when they start a submission; readers meet them on the
"Submissions" page of the About menu, in an issue's table of contents and,
on a preprint server, on the "Archives" page and each section's own page.
A press calls its sections **series** and keeps them on Settings › Press ›
"Series": a series is optional, a book may sit in none, and a series is
described for readers (prefix, subtitle, description, cover, ISSN) rather
than configured for intake [OMP1](#omp1). A preprint server keeps its
sections on Settings › Server › "Sections". <sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" below is the rule
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
sets: a manager-level role with "Permit changes to Settings" (by default
the Journal Manager, the Editor and the Production Editor; on a preprint
server the Preprint Server Manager) and the Site Administrator on every
journal, press and preprint server. Every other role (Section Editor,
Guest Editor, the assistant roles, Author, Reviewer, Reader) is refused
the Settings pages. "Editorial roles" below means the Site Administrator,
the manager-level roles, and the Section Editor and Guest Editor. The
assistant roles (a Copyeditor or a Funding Coordinator, for example; an
Editorial Board Member on a preprint server) are not editorial roles here:
the sections treat them as they treat an Author. Readers need no account.
<sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Keep the list of sections** (Settings › Journal › "Sections": "Create Section", a row's "Edit" and "Delete", the "Inactive" box, "Order"; Rules 1–7) | • whoever opens the Settings pages; nobody else <sup>b</sup> |
| **Be assigned automatically to new submissions in a section** ("Editorial Assignments" in the section's window; Rule 8) | • each user ticked there, when a submission arrives in the section, on the install's oldest journal only; on any created later nobody is assigned ([Submission wizard A8](U21-submission-wizard.md#a8)); the assignment itself is the *[Submission wizard](U21-submission-wizard.md)*'s and its email *[Stage participants](U35-stage-participants.md#auto-email)*' <sup>c</sup> |
| **Submit to a section** (the "Section" choice of "Make a Submission") | • everyone who may submit, while the section is active and not restricted to editors; a section restricted to editors only to the editorial roles; an inactive section to nobody. The rules are the [Submission wizard](U21-submission-wizard.md#section-closed)'s (Rules 3, 17 there); this spec owns the switches (Settings bullets 1–2) <sup>d</sup> |
| **Read the sections' policies** (About › "Submissions"; Rule 12) {OJS OPS} | • any visitor, signed in or not: the policies of the sections open to authors<br>• the editorial roles: every section's policy, the inactive and editor-only ones included <sup>e</sup> |
| **Browse posted preprints** {OPS} (the "Archives" page and a section's page; Rules 14–16) | • any visitor, signed in or not <sup>f</sup> |
| **Read the journal's sections through the install's programming interface** {OJS} (Rule 17) | • a signed-in Site Administrator, or a manager-level role of that journal, whether or not the role has "Permit changes to Settings"<br>• refused: every other role, a manager of another journal, and a visitor who is not signed in <sup>g</sup> |

## Fields & validation

**The "Sections" tab** (Settings › Journal › "Sections"; Settings › Server
› "Sections" on a preprint server). A table headed "Sections" with the
button "Create Section" at its top right, joined by "Order" once the table
holds two rows, and the columns "Title", "Editors" and "Inactive". "Title"
shows the section's title; "Editors" the full names of the users ticked
under its "Editorial Assignments", separated by commas, or "None"; "Inactive"
a tick box, ticked for an inactive section (Rule 5). Each row opens, from
the arrow at its start, the links "Edit" and "Delete" (Rules 3, 7). Rows
stand in the journal's section order (Rule 4). A journal always has at
least one section (Rule 6), so the table is never empty. <sup>h</sup> <sup>td1</sup>

**The "Series" tab** {OMP} (Settings › Press › "Series"). The same table
headed "Series", with the button "Add Series" and the columns "Title",
"Categories", "Editors" and "Inactive". "Title" shows the series' prefix,
a space and its title; "Categories" the titles of the categories ticked in
the series' window, separated by commas, or "None". A sub-category is named
there by its own title ("Kay Sub"), where the window names it with its
parent ("Kay Cat > Kay Sub"). A new series takes no set place in the
table (Rule 2) ⚠ [OMP6](#omp6). A press with no series shows "No Items" in
the table [OMP1](#omp1). <sup>h</sup> <sup>td1</sup>

**The section window** opens from "Create Section" (headed "Create
Section") and from a row's "Edit" (headed "Edit"), and ends in "Save" and
"Cancel". "Save" on a valid window closes it, shows "Your changes have
been saved." at the top right and refreshes the table. A refused "Save"
leaves the window open. An empty required box shows "This field is
required." under it. Every other refusal shows as a notice at the top
right, where "Your changes have been saved." would show, and nothing is
marked under the box: a title or abbreviation of spaces only, the inactive
box ticked on the last active section (Rule 6) and, on a press, the path
and ISSN messages. <sup>i</sup> <sup>td2</sup>

With something changed in the window, its "×" asks "The data on this form
has changed. Do you wish to continue without saving?", and "OK" closes it
with nothing saved. "Cancel" closes it at once and drops the change without
asking. Leaving the page asks the browser's own question about leaving.
<sup>td2</sup>

The window's fields, in screen order: <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Section title" | Yes | One box per language the journal's forms use; only the journal's primary language is required. Empty: "This field is required." under the box. A title of spaces only passes that check and is refused with a notice that shows a raw code instead of a sentence ⚠ [A6](#a6). {OPS}: at most 80 characters, longer typing stops at the limit. <sup>i</sup> <sup>td2</sup> |
| "Abbreviation" | Yes | At most 80 characters, longer typing stops at the limit; per language as the title. Empty: "This field is required."; spaces only: "An abbreviated title is required for the section (English)". Nothing checks that two sections' abbreviations differ. Effect: Settings bullet 12. <sup>i</sup> <sup>td2</sup> |
| "Section URL Path. Use hyphens (-) instead of spaces." {OPS} | Yes | Empty: "This field is required." Any text of any length is saved as typed: nothing checks its length, its characters or that another section already uses it ⚠ [OPS3](#ops3). Effect: Rule 16. <sup>i</sup> <sup>td14</sup> |
| "Section archive Description" {OPS} | No | Formatted text, per language as the title. Effect: Rule 16. <sup>i</sup> <sup>td1</sup> |
| "Section Policy" | No | Formatted text, per language as the title. Effect: Settings bullet 3. <sup>i</sup> <sup>td1</sup> |
| "Word Count", with the help "Limit abstract word counts for this section (0 for no limit)" | No | A number of words. The box takes up to 80 characters and saves any text: what is not a whole number is saved as 0, no limit, without a message, and a negative number is saved as typed ⚠ [A2](#a2). The box is empty (no limit) on a new section and on a new journal's first section; a "Save" with it empty stores 0, and it reads 0 from then on. Effect: Settings bullet 4. <sup>i</sup> <sup>td3</sup> |
| "Review Form" {OJS} | No | A list whose first entry is "None / Free Form Review", followed by the journal's active review forms; the field is absent while the journal has no active review form. Effect: Settings bullet 6. <sup>j</sup> |
| "Section Options": tick boxes "Mark this section as inactive and do not allow new submissions to be made to it.", "Will not be peer-reviewed" {OJS}, "Do not require abstracts", "Will not be included in the indexing of the journal" ("…of the server" {OPS}), "Items can only be submitted by Editors and Section Editors." ("Items can only be submitted by Managers and Moderators." {OPS}), "Omit the title of this section from issues' table of contents." {OJS}, "Omit author names for section items from issues' table of contents." {OJS} | No | All unticked on a new section and on a new journal's first section. Ticking the inactive box on the journal's last active section is refused (Rule 6). Effects: Settings bullets 1, 2, 5, 7–10. <sup>i</sup> <sup>k</sup> |
| "Identify items published in this section as a(n)" ("Identify items posted in this section as a(n)" {OPS}), with the help "(For example, "Peer-reviewed Article", "Non-refereed Book Review", "Invited Commentary", etc.)" ("(For example etc.)" ⚠ [OPS2](#ops2)) | No | Per language as the title. Effect: Settings bullet 11. <sup>i</sup> |
| "Editorial Assignments", with "Select the editorial users who should be assigned automatically to all new submissions to this section." | No | One tick box "Assign {name} as {role}" per user and per role that user holds, for every role of the manager, Section Editor or assistant level that works on the first stage of the workflow, as the role's stages are ticked on Users & Roles › "Roles": on a journal the Submission stage, on a preprint server its one stage. By default a journal offers the Journal editor, Section editor, Guest editor and Funding coordinator roles; the Journal manager's role has no stage ticked and the Production editor's works from Copyediting on, so neither is offered. A preprint server offers the Preprint Server manager and Moderator roles. A user holding two such roles has two boxes. With nobody in an offered role, the heading and its sentence show with no box under them. Effect: Rule 8. <sup>l</sup> <sup>td4</sup> |

**The series window** {OMP} opens from "Add Series" (headed "Add Series")
and a row's "Edit" (headed "Edit"), and ends in the note "Required fields
are marked with an asterisk: *", "Save" and "Cancel"; "Save" behaves as on
a journal. Fields in screen order: <sup>m</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Cover Image" | No | An uploader. Once saved with an image, the window shows the image with a "Delete" link, which asks, under the heading "Confirm", "Are you sure you wish to delete this item? This action cannot be undone." and on "OK" removes it at once. The uploader offers JPG, PNG and SVG files; with an SVG uploaded, "Save" keeps nothing and shows no message ⚠ [OMP3](#omp3). <sup>m</sup> <sup>td5</sup> |
| "Prefix", with the help "Examples: A, The" | No | Per language. Shown before the title wherever the series is named. <sup>m</sup> |
| "Title" | Yes | Per language; the press's primary language required. Empty: "This field is required."; spaces only: a notice with a raw code [A6](#a6). <sup>m</sup> <sup>td2</sup> |
| "Subtitle" | No | Per language, at most 255 characters. <sup>m</sup> |
| "Description" | No | Formatted text, per language. <sup>m</sup> <sup>td1</sup> |
| Tick boxes "Mark this series as inactive and do not allow new submissions to be made to it." and "Don't allow authors to submit directly to this series." | No | Unticked on a new series. Effects: Settings bullets 1, 2. <sup>m</sup> |
| "ISSN": "Online ISSN" and "Print ISSN", under a paragraph on what an ISSN is with a link "ISSN International Centre" | No | The paragraph reads "…is an eight-digit number which identifying periodical publications…" ⚠ [OMP7](#omp7). Each box at most 16 characters. A value that is not a valid ISSN: "Please enter a valid ISSN."; the same value in both: "Online and print ISSN must not be the same." <sup>m</sup> <sup>td6</sup> |
| "Order of monographs", with "Choose how to order books in this series." | No | The list "Title (A-Z)", "Title (Z-A)", "Publication date (oldest first)", "Publication date (newest first)", "Series position (lowest first)", "Series position (highest first)". A new series arrives on "Title (A-Z)" and keeps it unless it is changed. Effect: Settings bullet 15. <sup>m</sup> <sup>td5</sup> |
| "Editorial Assignments", with "Select the editorial users who should be assigned automatically to all new submissions to this series." | No | As on a journal. By default a press offers the Press editor, Series editor and Funding coordinator roles; the Press manager's role has no stage ticked and is not offered. Effect: Rule 8. <sup>l</sup> <sup>td4</sup> |
| "Categories" | No | One tick box per category of the press, a sub-category named by its line of parents ("Social Sciences > Anthropology"). The boxes stand in the alphabetical order of each category's own name, so a sub-category can come before its parent ("Social Sciences > Anthropology" before "Applied Science" and "Social Sciences"). Absent while the press has no category. Effect: the table's "Categories" column only ⚠ [OMP4](#omp4). <sup>m</sup> <sup>td1</sup> |
| "Path", with "The series's URL will be: {address}" | Yes | At most 32 characters. Letters, digits, ".", "/", "_" and "-" are accepted; anything else is refused with "The series path must consist of only letters and numbers." ⚠ [OMP2](#omp2); an empty box gets "This field is required." under it; a path another series of the press has: "The series path already exists. Please enter a unique path." The help's address always ends in the word "Path", never in the path typed or saved ⚠ [OMP8](#omp8). <sup>m</sup> <sup>td6</sup> |

## Rules & state

<a id="list"></a>
1. **The list.** The Sections tab lists every section of the journal,
   active and inactive, in the journal's section order (Rule 4). A new
   journal arrives with one section, "Articles" (abbreviation "ART", policy
   "Section default policy"); a new preprint server with "Preprints"
   ("PRE", path "preprints"); a new press with no series [OMP1](#omp1).
   <sup>h</sup> <sup>n</sup>
<a id="create"></a>
2. **Creating a section.** "Create Section" opens an empty window; "Save"
   adds the section as the last row of the table, whether or not an order
   has been saved before, active and with nobody under "Editors" unless
   boxes were ticked. <sup>i</sup> <sup>td7</sup>
   - 2a. A press gives a new series no place of its own: a new series has
     landed first, in the middle and last, also after an order had been
     kept with "Order" and "Done", and an unchanged "Save" has moved a
     series [OMP6](#omp6). The submission wizard's "Series" choice and a
     book's "Catalog Entry" list follow the table.
<a id="edit"></a>
3. **Editing a section.** A row's "Edit" opens the window filled with the
   section's saved values; "Save" replaces them all. The change reaches
   every screen that names the section: the start form's "Section" list,
   the dashboard's "Section" filter {OJS OPS}, the "Section" list of an
   article's "Publication Settings" page ("Preprint entry" on a preprint
   server; on a press the "Series" list of a book's "Catalog Entry" page)
   and the reader pages. <sup>i</sup> <sup>td7</sup>
<a id="order"></a>
4. **The section order.** The journal keeps one order of its sections,
   set on the Sections tab. <sup>o</sup> <sup>td8</sup>
   - 4a. "Order" turns the rows into drag handles and adds "Done" and
     "Cancel ordering" under the table. Drag a row to its new place and
     press "Done" to keep the order, or "Cancel ordering" to put the rows
     back as they were.
   - 4b. While ordering, "Create Section" ("Add Series" on a press) and
     "Order" do nothing, and a row's "Inactive" box still asks its question
     (Rule 5). Leaving for another tab (for example "Masthead") and coming
     back shows the table still ordering, with the dragged order and no
     question; a reload drops an order not kept with "Done".
   - 4c. The order is the journal's section order everywhere a list of
     sections appears: the start form's "Section" list
     ([Submission wizard](U21-submission-wizard.md#section-closed)), the
     dashboard's "Section" filter {OJS OPS}
     ([Submissions dashboard](U23-submissions-dashboard.md#filters)), the
     "Section" list of "Publication Settings"
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)),
     the policies on the "Submissions" page (Rule 12) and the default order
     of the headings in an issue's table of contents
     ([→ the table of contents](U50-issues.md#issue-toc)). On a press it is
     the order of the wizard's "Series" choice and of a book's "Catalog
     Entry" list.
<a id="inactive"></a>
5. **Active and inactive.** A section is active or inactive. Pressing the
   "Inactive" box of an active row asks "Are you sure you wish to
   deactivate this section?" in a window headed "Confirm", with "OK" and
   "Cancel"; "OK" ticks the box and shows "Your changes have been saved.".
   Pressing the ticked box of an inactive row asks "Are you sure you wish
   to activate this section?" and "OK" unticks it. A press asks the same
   two questions about a "section" ⚠ [OMP5](#omp5). The window's box "Mark
   this section as inactive…" does the same on "Save". An inactive section:
   <sup>k</sup> <sup>td9</sup>
   - 5a. is no longer offered to anyone starting a submission, and a draft
     already in it stops at the "Section Closed" page
     ([→ section closed](U21-submission-wizard.md#section-closed));
   - 5b. stays in the Sections tab, in the dashboard's "Section" filter
     {OJS OPS} and on its preprint server page (Rule 16), and is offered on
     the "Section" list of "Publication Settings" (Rule 3) as "{section}
     (Inactive)";
   - 5c. keeps its published articles where they are;
   - 5d. drops off the "Submissions" page for everyone but the editorial
     roles (Rule 12).
   A press's inactive series is likewise left out of the "Series" choice
   of the submission wizard ([Submission wizard](U21-submission-wizard.md),
   Settings bullet "Sections") and shown as "{series} (Inactive)" in the
   "Series" list of a book's "Catalog Entry" page (*Catalog management*).
<a id="last-active"></a>
6. **At least one active section.** A journal and a preprint server keep
   at least one active section. Each way of closing the last active one is
   refused with the notice "At least one section must be active. Visit the
   workflow settings to disable all submissions to this journal." ("…to
   this server.") at the top right: <sup>k</sup> <sup>td9</sup>
   - 6a. its "Inactive" box and "OK": the box stays unticked;
   - 6b. "Mark this section as inactive…" ticked in its window and "Save":
     the window stays open with the box still ticked, and nothing is saved;
   - 6c. its "Delete" and "OK": the row stays (Rule 7).
   A press has no such rule: every series may be inactive, and every
   series deleted [OMP1](#omp1).
<a id="delete"></a>
7. **Deleting a section.** A row's "Delete" asks "Are you sure you want to
   permanently delete this section?" ("Are you sure you wish to delete
   this item? This action cannot be undone." {OMP}) in a window headed
   "Delete", with "OK" and "Cancel". "OK" removes the row, unless: <sup>p</sup> <sup>td10</sup>
   - 7a. any submission of the journal is in the section, submitted or
     still a draft, published or not: the row stays and the notice reads
     "Before this section can be deleted, you must move articles submitted
     to it into other sections." ("Before this section can be deleted, you
     must move preprints posted within it into other section." {OPS};
     "Before this series can be deleted, you must move associated
     submissions with this series to other series." {OMP});
   - 7b. it is the last active section (Rule 6).
   An inactive section with nothing in it is deleted like any other.
   - 7c. A section is emptied by moving its articles, each on the
     "Section" list of its "Publication Settings" page ("Preprint entry" on
     a preprint server; a book on the "Series" list of its "Catalog Entry"
     page). On a journal, an article not yet in an issue arrives there with
     "Assign To Current/Back Issue" chosen and no issue, so "Save" is
     refused with "Issue: This field is required." until an issue or "Don't
     Assign To An Issue" is chosen
     ([Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
     A preprint server and a press save the new section or series at once.
     <sup>td10</sup>
<a id="editorial-assignments"></a>
8. **Editorial Assignments.** The users ticked under "Editorial
   Assignments" are shown in the row's "Editors" column and are meant to
   be assigned to every submission that arrives in the section, each in
   the role their box names. The assignment, the email it sends and the
   limit to the install's oldest journal are the
   [Submission wizard](U21-submission-wizard.md)'s (its Side effects, A8)
   and [Stage participants](U35-stage-participants.md#auto-email)'. A user
   who no longer holds the role keeps no box for it, but the table's
   "Editors" column still names them until the section's window is saved
   again. That "Save" drops the assignment, and the column then reads the
   others, or "None". <sup>l</sup> <sup>td4</sup>
<a id="settings-effects"></a>
9. **What the other fields change.** The section window's other fields
   take effect on other features' screens; the catalogue of what each
   changes, and where, is "Settings that modify behavior" below. <sup>k</sup>
<a id="omp-series"></a>
10. **A series' own fields** {OMP}. A series is named with its prefix
    before its title ("The Monographs" for prefix "The"); the subtitle
    follows it after a colon in the submission wizard's "Series" choice
    and on its books' pages. <sup>m</sup> <sup>td5</sup>
    - 10a. Its "Path" sets the address of the series' public page, the
      press's address followed by "catalog/series/{path}" (the page is
      *Catalog browse*'s, which this spec does not cover). A visitor
      reaches that page from the series' name, a link under the heading
      "Series" on the page of any of its books. After the path is
      changed, the page answers at the new address, and the old address
      opens the Catalog with no message. <sup>td5</sup>
    - 10b. The page lists the series' published books ("3 Titles") and
      shows the series' cover image. The series' name, description and
      ISSNs are meant to show there too, and its "Order of monographs" to
      order the books. Today the heading is empty, neither the
      description nor the ISSNs show, and the books come newest first
      whatever the order says ⚠ [OMP9](#omp9). <sup>td5</sup>
<a id="policy-display"></a>
11. **Where a section's policy shows.** A section's "Section Policy" is
    shown under the "Section" choice of "Make a Submission" once the
    section is picked (the [Submission wizard](U21-submission-wizard.md)'s
    start form) and on the "Submissions" page (Rule 12). A press has no
    series policy. <sup>e</sup>
<a id="about-submissions"></a>
12. **The "Submissions" page's section policies** {OJS OPS}. About ›
    "Submissions" (the rest of the page is *Submission intake
    configuration*'s) lists, after the journal's submission checklist, one
    block per section that has a policy, in the section order: the
    section's title as a heading, then its policy. <sup>e</sup> <sup>td11</sup>
    - 12a. A visitor, a Reader, an Author, a Reviewer and the assistant
      roles see only the sections open to authors: active and not
      restricted to editors. The editorial roles (Actors) see every section
      with a policy, inactive and editor-only ones included.
    - 12b. A signed-in visitor also reads, under each policy, "Make a new
      submission to the {section} section.", "{section}" being a link. A
      visitor who is not signed in reads no such line. When the start form
      offers more than one section, the link opens "Make a Submission" with
      no section chosen: the "Section" choice starts empty as from any
      other way in ⚠ [A1](#a1). With only one section open to the reader,
      the form shows no "Section" choice and takes that section
      ([Submission wizard](U21-submission-wizard.md)).
    - 12c. A press's "Submissions" page carries no section block
      [OMP1](#omp1).
    - 12d. The editorial roles read the line under an inactive section's
      policy too, although the start form does not offer that section
      ⚠ [A7](#a7). With "Disable Submissions" ticked (Rule 13b) every
      signed-in reader keeps the line under every policy they see
      ⚠ [A8](#a8).
<a id="not-accepting"></a>
13. **No section open** {OJS OPS}. When no section is open to the reader
    of the "Submissions" page (Rule 12a), the page's notice under the
    heading reads "This journal is not accepting submissions at this time."
    ("This server is not accepting submissions at this time." {OPS})
    instead of the invitation to submit. <sup>e</sup> <sup>td12</sup>
    - 13a. A journal gets there when every section is inactive or
      restricted to editors; since one section always stays active (Rule
      6), at least one is restricted. The editorial roles then still read
      "Make a new submission or view your pending submissions." and the
      policy blocks.
    - 13b. With "Disable Submissions" ticked (Settings › Workflow ›
      "Submission"; *Submission intake configuration*), everyone reads the
      notice, the editorial roles included.
    - 13c. A press's page never shows the notice for its series: with its
      only series marked "Don't allow authors to submit directly to this
      series.", a visitor still reads "Login or Register to make a
      submission." and an Author "Make a new submission or view your
      pending submissions." [OMP1](#omp1).
<a id="archives"></a>
14. **The "Archives" page** {OPS}. The main menu's "Archives" opens the
    list of every posted preprint of the server, all sections together,
    newest posting first, under the heading "Archives" ("Archives - Page
    {n}" from the second page on). Each preprint is shown as
    [→ the article summary](U13-article-landing-page-and-reading.md#summary)
    describes it. <sup>f</sup> <sup>td13</sup>
    - 14a. Above the list stands the archive header: a search box
      ([Search](U15-search.md), Rule 17 there) and one link per top-level
      category of the server, each opening that category's page
      ([Categories](U16-categories.md)); a server with no category shows no
      links.
    - 14b. The trail and the page links are
      [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)'
      (Rules 23, 24 there). A page past the last one, opened by typing its
      address, shows its heading ("Archives - Page 4"), the archive header,
      no preprints and page links such as "Previous 7-6 of 5" ⚠ [OPS5](#ops5).
    - 14c. A server with nothing posted shows nothing under the archive
      header: no sentence says that nothing has been posted ⚠ [OPS1](#ops1).
    - 14d. The list runs over as many pages as "Items per page" needs
      (Settings bullet 17), and each posted preprint is meant to show on
      exactly one of them. The list orders by the day of posting alone,
      so preprints posted on the same day stand in no fixed order among
      themselves. Where they run across a page break, paging with "Next"
      shows some of them on two or more pages and others on none
      ⚠ [OPS7](#ops7).
      <sup>f</sup>
<a id="archive-header-home"></a>
15. **The archive header on the home page** {OPS}. A preprint server's
    home page carries the same archive header, search box and category
    links, above its "Latest preprints" list (the home page itself is
    [Appearance & theming](U10-appearance-and-theming.md)'s). <sup>f</sup>
<a id="section-page"></a>
16. **A section's page** {OPS}. Every section of a preprint server, active
    or inactive, has a page at the server's address followed by
    "preprints/section/{path}", {path} being its "Section URL Path".
    <sup>q</sup> <sup>td14</sup>
    - 16a. The page is headed with the section's title, shows its "Section
      archive Description", then lists the section's posted preprints,
      newest first, as summaries; with none it reads "Nothing has been
      posted in this section yet.". The page has no trail. Long lists are
      paged (Navigation menus & site chrome, Rules 23, 24), and a page past
      the last one answers "404 Not Found".
    - 16b. No link on the server's pages leads to a section's page: a
      visitor reaches it by typing its address, or through a menu item a
      manager adds by hand ⚠ [OPS4](#ops4).
    - 16c. An address whose path no section has answers "404 Not Found".
      When two sections share a path, the one higher in the section order
      owns the page; a section whose path holds a space or a slash has no
      page that opens [OPS3](#ops3).
<a id="sections-interface"></a>
17. **The programming interface** {OJS}. A journal answers the list of
    its sections, and any one section, as data at an address of the
    install's programming interface (the address is in the footnote), to
    the roles Actors names. The apps' own screens never call it: it serves
    programs outside them. <sup>g</sup>
    - 17a. The list holds every section of the journal, inactive and
      editor-only ones included and marked as such, in the section order,
      with the journal's total count. It gives 30 sections at a time
      unless the program asks for another number, and never more than 100;
      the program reaches the rest by asking to skip the ones it has.
    - 17b. The list fails with a server error on two filters it
      advertises, a search phrase and a type ⚠ [A4](#a4).
    - 17c. One section is asked for by its number. A number the journal
      has no section under, and another journal's section, are refused
      with a message code instead of a sentence ⚠ [A9](#a9). A section
      asked for by a word instead of a number, and the list asked for by
      the Site Administrator at the site's address, with no journal in it,
      fail with a server error ⚠ [A10](#a10).
    - 17d. A press and a preprint server have no such address: it answers
      "The requested URL was not recognized." to everyone ⚠ [A5](#a5).

## Side effects

- **On "Save", activating and deactivating.** The notice "Your changes
  have been saved." at the top right. <sup>i</sup> <sup>td7</sup>
- **On "Done" after ordering and on a "Delete" that removes the row.** No
  notice; the table shows the new state. <sup>td8</sup> <sup>td10</sup>
- **On any change to the list.** Nothing is emailed and nothing is
  written to any activity log. <sup>i</sup> <sup>td9</sup>
- **On deleting a section.** Its editorial assignments go with it; no
  submission is touched, since only an empty section can be deleted
  (Rule 7). <sup>p</sup>
- **On a submission arriving in a section with "Editorial Assignments".**
  The ticked users are assigned and emailed on the install's oldest
  journal only: the [Submission wizard](U21-submission-wizard.md)'s side
  effect and [Stage participants](U35-stage-participants.md#auto-email)'
  email. <sup>c</sup>

## Settings that modify behavior

The section window is itself the settings screen of this feature; each of
its fields is listed with where it takes effect. All are set per section,
on Settings › Journal › "Sections", a row's "Edit" (Settings › Press ›
"Series" on a press).

1. **"Mark this section as inactive and do not allow new submissions to be
   made to it."** ("…this series…" {OMP}). Default unticked. Ticked: Rule 5
   (closed to submissions, "(Inactive)" on the "Section" list of
   "Publication Settings", off the "Submissions" page for non-editors);
   refused on the last active section (Rule 6). The same switch as the
   table's "Inactive" box.
   <sup>k</sup>
2. **"Items can only be submitted by Editors and Section Editors."**
   ("Items can only be submitted by Managers and Moderators." {OPS};
   "Don't allow authors to submit directly to this series." {OMP}).
   Default unticked. Ticked: the section is offered at "Make a Submission"
   only to the editorial roles (Actors). Nobody else is offered it, the
   assistant roles included, and a draft of theirs already in it stops at
   the "Section Closed" page
   ([→ section closed](U21-submission-wizard.md#section-closed)). On a
   press the series leaves the wizard's "Series" choice for anyone but
   the editorial roles; on a journal and a preprint server the section's
   policy leaves the "Submissions" page for them too (Rule 12a).
   <sup>d</sup> <sup>e</sup>
3. **"Section Policy"** {OJS OPS}. Empty on a new section; "Section default
   policy" on a new journal's first section. Filled: shown under the start
   form's "Section" choice and on the "Submissions" page (Rule 11); empty:
   neither place shows a block for the section. <sup>e</sup>
4. **"Word Count"** {OJS OPS}. Empty (no limit) by default, and 0 (no
   limit) once the section is saved with it empty; 500 on the seeded
   journal's "Articles". A positive number caps the abstract and the plain
   language summary at that many words at submission
   ([→ what must be complete to submit](U21-submission-wizard.md#submit-gates))
   and on the publication's "Title & Abstract" page, which counts "Word
   Count: {n}/{limit}"
   ([Publication metadata](U40-publication-metadata.md), Rule 5 there); a
   negative number [A2](#a2). <sup>k</sup>
5. **"Do not require abstracts"** {OJS OPS}. Default unticked (the
   abstract is required). Ticked: a submission in the section may be
   submitted and published without an abstract (Submission wizard, Rule 13
   there; Publication metadata, Rule 5 there); its harvesting record
   carries no "Description" (*[OAI-PMH](U19-oai-pmh.md)*). <sup>k</sup> <sup>f-ops6</sup>
6. **"Review Form"** {OJS}. Default "None / Free Form Review". A form
   chosen is preselected in Add Reviewer for submissions in the section
   ([→ review forms](U29-review-setup-and-review-forms.md#forms)). A press
   has no such field. <sup>j</sup>
7. **"Will not be peer-reviewed"** {OJS}. Default unticked. Ticked: meant
   to keep the Publication Facts Label off the section's articles; the
   label never shows on any article at present
   ([Article landing page & reading](U13-article-landing-page-and-reading.md),
   Settings bullet 7 there). A preprint server's window has no such box.
   <sup>k</sup>
8. **"Will not be included in the indexing of the journal"** {OJS OPS}.
   Default unticked. Ticked: no page, list, search result or record of the
   apps changes ⚠ [A3](#a3). <sup>k</sup> <sup>td16</sup>
9. **"Omit the title of this section from issues' table of contents."**
   {OJS}. Default unticked. Ticked: the section's heading leaves the issue
   page and the home page's "Current Issue"
   ([Issues](U50-issues.md), Settings bullet 4 there). <sup>k</sup>
10. **"Omit author names for section items from issues' table of
    contents."** {OJS}. Default unticked. Ticked: the table of contents
    leaves out the author line of the section's articles
    ([Article landing page & reading](U13-article-landing-page-and-reading.md),
    Settings bullet 10 there). <sup>k</sup>
11. **"Identify items published in this section as a(n)"** {OJS OPS}.
    Empty by default; "Review Article" on the seeded journal's "Reviews".
    Filled, on a journal: the words become the type of the section's
    articles in the records the journal hands to harvesters (*OAI-PMH*);
    no page of the journal shows them. On a preprint server the box
    changes nothing: no page shows the words, and the harvested records
    call every preprint a preprint whatever the box holds [OPS2](#ops2).
    <sup>k</sup>
12. **"Abbreviation"** {OJS OPS}. Required. Names the section as a set in
    the records handed to harvesters (*OAI-PMH*); no page shows it.
    <sup>k</sup>
13. **"Editorial Assignments"**. Nobody ticked by default; on the seeded
    journal the "Articles" row lists the Editor and two Section Editors and
    "Reviews" the Editor and one Section Editor. Ticked users: Rule 8.
    <sup>l</sup>
14. **"Section URL Path" and "Section archive Description"** {OPS}. The
    path "preprints" on a new server's first section. They set the
    section page's address and its text (Rule 16). <sup>q</sup>
15. **A series' "Prefix", "Subtitle", "Description", "Cover Image",
    "Online ISSN", "Print ISSN", "Order of monographs" and "Path"** {OMP}.
    Empty by default, and "Order of monographs" on "Title (A-Z)". The
    prefix and subtitle join the series' name, and the path sets the
    address of the series' public page (Rule 10a). The cover shows on that
    page. The ISSNs show on the pages of the series' books, under
    "Series" ("Online ISSN", "Print ISSN"), and not on the series' page.
    The description shows nowhere at present, and the book order, meant
    for the series' page, is ignored there (Rule 10b, [OMP9](#omp9)). The
    "Categories" boxes change only the table's column [OMP4](#omp4).
    <sup>m</sup> <sup>td5</sup>
16. **The section order** (the "Order" mode of the table). New sections
    go last {OJS OPS}; a press gives a new series no fixed place (Rule 2a,
    [OMP6](#omp6)). The order of every section list (Rule 4). <sup>o</sup>
    <sup>td8</sup>
17. **"Items per page"** (Settings › Website › the "Setup" tab › the
    "Lists" side tab; 25 on a new server) {OPS}. How many preprints the
    "Archives" page and a section's page show before the page links
    (Navigation menus & site chrome, Rule 24 there). <sup>f</sup>

## Cross-feature interactions

- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens the Settings pages, and so the Sections tab.
- **[Submission wizard](U21-submission-wizard.md)**: the "Section" choice
  of "Make a Submission", the "Section Closed" page, the abstract and word
  limit at submit, a press's "Series" choice, and the automatic assignment
  of the "Editorial Assignments" users (A8 there). This spec owns the
  switches; the wizard owns their effect at intake.
- **[Stage participants](U35-stage-participants.md#auto-email)**: the
  email an automatically assigned editor receives.
- **[Submissions dashboard](U23-submissions-dashboard.md#filters)** and
  **[My Submissions](U22-my-submissions.md)**: the "Section" filter, which
  lists the sections in their order; a press offers no series filter
  there (OMP1 in each).
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  the publication pages' "Section" list where an article's section is
  changed; *Catalog management* holds a book's "Series" list.
- **[Publication metadata](U40-publication-metadata.md)**: the abstract
  requirement and word limit on "Title & Abstract".
- **[Review setup & review forms](U29-review-setup-and-review-forms.md#forms)**
  and **[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)**:
  a section's default review form in Add Reviewer.
- **[Issues](U50-issues.md#issue-toc)**: the section headings of an
  issue's table of contents, their per-issue order, and the omitted
  title; **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the omitted author names, the "Section" row of an article's page, the
  Publication Facts Label and the summary the "Archives" and section
  pages show.
- **[Search](U15-search.md)**: the archive header's search box (Rule 14a).
- **[Categories](U16-categories.md)**: the category pages the archive
  header's links open.
- **[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)**:
  the "Archives" menu item, trails and page links.
- **[Appearance & theming](U10-appearance-and-theming.md)**: the preprint
  server's home page around the archive header.
- ***Submission intake configuration***: the rest of the "Submissions"
  page. ***Catalog browse***: a press's series pages, the series in
  its "Browse" block, and the "Series" heading of a book's page.
  ***Catalog management***: a book's "Series" and
  "Series Position". ***OAI-PMH***: the abbreviation and type in harvested
  records.

## Canonical scenarios

Every scenario runs on a scratch journal, press or preprint server with
throwaway accounts; the accounts, their passwords and the tooling recipe
are in the footnote. <sup>s</sup>

1. **Create and edit a section** {OJS OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal whose one section is "Articles" as a new journal
   has it, with the Section Editor Sam Section (the Moderator on a
   preprint server) and, on a journal, the Editor Eve Editor, the
   Production Editor Pia Production, the Reviewer Rex Reviewer, the
   active review form "Structured Review" and the article "Tidal
   Patterns", in "Articles", at the Review stage.

   - **The tab with one section**: open Settings › Journal › "Sections"
     (Settings › Server › "Sections" on a preprint server): a table
     headed "Sections", with the button "Create Section" at its top right
     and no "Order", and the columns "Title", "Editors" and "Inactive",
     holds one row, "Articles" ("Preprints"), with "None" under "Editors"
     and its "Inactive" box unticked (Fields, the "Sections" tab; Rule 1).
   - **A save with nothing typed**: press "Create Section": a window
     headed "Create Section" opens, ending in "Save" and "Cancel", its
     "Word Count" box empty and every "Section Options" box unticked.
     Press "Save": "This field is required." shows under "Section title"
     and under "Abbreviation" (on a preprint server also under "Section
     URL Path. Use hyphens (-) instead of spaces."), and the window stays
     open (Fields, the section window).
   - **An abbreviation of spaces**: type "Reviews" in "Section title", one
     space in "Abbreviation" and, on a preprint server, "reviews" in
     "Section URL Path. Use hyphens (-) instead of spaces.", and press
     "Save": the notice "An abbreviated title is required for the section
     (English)" shows at the top right, nothing is marked under the box,
     and the window stays open (Fields, "Abbreviation").
   - **The "Editorial Assignments" boxes**: the window's "Editorial
     Assignments", under "Select the editorial users who should be
     assigned automatically to all new submissions to this section.",
     offers "Assign Eve Editor as Journal editor" and "Assign Sam Section
     as Section editor", and no box for the Journal Manager or for Pia
     Production; on a preprint server it offers "Assign Sam Section as
     Moderator" and one "Assign {name} as Preprint Server manager" box per
     manager (Fields, "Editorial Assignments").
   - **The new section, last and with no editor**: type "REV" in
     "Abbreviation" and "Reviews of recent books." in "Section Policy",
     leave every box unticked and press "Save": the window closes, "Your
     changes have been saved." shows at the top right, and the table lists
     "Reviews" last, below "Articles" ("Preprints"), with "None" under
     "Editors" and its "Inactive" box unticked; "Order" now stands beside
     "Create Section" (Rule 2; Side effects).
   - **The visitor's "Submissions" page**: the visitor opens About ›
     "Submissions": the last block is headed "Reviews" and reads "Reviews
     of recent books."; on a journal it follows the block headed
     "Articles", which reads "Section default policy" (Rules 1, 12;
     Settings bullet 3).
   - **Edit**: on the "Reviews" row press the arrow at its start, then
     "Edit": a window headed "Edit" holds "Reviews" in "Section title",
     "REV" in "Abbreviation" and "Reviews of recent books." in "Section
     Policy". Change "Section title" to "Book Reviews", tick "Assign Sam
     Section as Section editor" ("…as Moderator") and press "Save": the
     row reads "Book Reviews", with "Sam Section" under "Editors" (Rules
     3, 8).
   - **The new name on the reader's page**: the visitor reloads About ›
     "Submissions": the block is headed "Book Reviews" (Rule 3).
   - **"Review Form"** {OJS}: on the "Articles" row press the arrow at its
     start, then "Edit": "Review Form" lists "None / Free Form Review"
     (chosen) and "Structured Review". Choose "Structured Review" and
     press "Save". Open "Tidal Patterns" at the Review stage, press "Add
     Reviewer", then "Select Reviewer" on Rex Reviewer: "Review Form"
     reads "Structured Review" (Fields, "Review Form"; Settings bullet 6).
   - **Control**: "Articles" ("Preprints"), whose boxes were never ticked,
     still reads "None" under "Editors" (Rule 8). A press keeps series in
     another window, which scenario 7 opens [OMP1](#omp1). <sup>s</sup>

2. **Order the sections** {OJS OPS}

   Given: Journal Manager, an Author, and a visitor, signed out, in a
   second browser, on a scratch journal with the sections "Articles",
   "Reviews" and "Essays", in that order, whose policies read "Policy for
   articles.", "Policy for reviews." and "Policy for essays.".

   - **"Order"**: open Settings › Journal › "Sections" (Settings › Server
     › "Sections" on a preprint server) and press "Order": the rows turn
     into drag handles, and "Done" and "Cancel ordering" show under the
     table (Rule 4a).
   - **"Cancel ordering"**: drag "Essays" above "Articles" and press
     "Cancel ordering": the rows stand as before, "Articles", "Reviews",
     "Essays" (Rule 4a).
   - **"Done"**: press "Order" again, drag "Essays" above "Articles" and
     press "Done": the table reads "Essays", "Articles", "Reviews", and no
     notice shows. Reload the page: the order holds (Rule 4a; Side
     effects).
   - **The start form**: Author: open "Make a Submission": the "Section"
     choice lists "Essays", "Articles" and "Reviews", in that order (Rule
     4c).
   - **The "Submissions" page**: the visitor opens About › "Submissions":
     the blocks headed "Essays", "Articles" and "Reviews" stand in that
     order (Rules 4c, 12).
   - **A new section after an order**: Journal Manager: press "Create
     Section", type "Letters" in "Section title" and "LET" in
     "Abbreviation" ("letters" also in "Section URL Path. Use hyphens (-)
     instead of spaces." on a preprint server) and press "Save": "Letters"
     is the last row, below "Reviews" (Rule 2).
   - **Control**: right after "Cancel ordering", the Author's "Section"
     choice listed "Articles", "Reviews", "Essays" (Rules 4a, 4c).
     <sup>s</sup>

3. **Deactivate and reactivate a section** {OJS OPS}

   Given: Journal Manager, and a visitor, signed out, in a second browser,
   on a scratch journal with the sections "Articles" and "Reviews", whose
   policies read "Policy for articles." and "Policy for reviews.", and the
   submitted article "Tidal Patterns" in "Reviews", in no issue.

   - **Deactivate from the table**: open Settings › Journal › "Sections"
     (Settings › Server › "Sections" on a preprint server) and press the
     "Inactive" box of the "Reviews" row: a window headed "Confirm" asks
     "Are you sure you wish to deactivate this section?", with "OK" and
     "Cancel". Press "OK": the box is ticked and "Your changes have been
     saved." shows at the top right (Rule 5; Side effects).
   - **The visitor's "Submissions" page**: the visitor opens About ›
     "Submissions": the block headed "Articles" shows, and no block headed
     "Reviews" (Rules 5d, 12a).
   - **"Publication Settings"**: open "Tidal Patterns" in its workflow and
     its "Publication Settings" page ("Preprint entry" on a preprint
     server): the "Section" list offers "Reviews (Inactive)" (Rule 5b).
   - **The last active section, from the table**: back on the tab, press
     the "Inactive" box of "Articles" and then "OK": the box stays
     unticked, and "At least one section must be active. Visit the
     workflow settings to disable all submissions to this journal."
     ("…to this server.") shows at the top right (Rule 6a).
   - **The last active section, from its window**: on the "Articles" row
     press the arrow at its start, then "Edit"; tick "Mark this section as
     inactive and do not allow new submissions to be made to it." and
     press "Save": the same notice shows at the top right, and the window
     stays open with the box still ticked. Press "Cancel": the "Articles"
     row's "Inactive" box is still unticked (Rule 6b; Fields, the section
     window).
   - **Reactivate**: press the ticked "Inactive" box of "Reviews": the
     window asks "Are you sure you wish to activate this section?". Press
     "OK": the box is unticked and "Your changes have been saved." shows.
     The visitor reloads About › "Submissions": the block headed "Reviews"
     is back (Rules 5, 12a; Side effects).
   - **Deactivate from the window**: on the "Reviews" row press "Edit",
     tick "Mark this section as inactive and do not allow new submissions
     to be made to it." and press "Save": the window closes, "Your changes
     have been saved." shows, and the "Reviews" row's "Inactive" box is
     ticked (Rule 5; Settings bullet 1).
   - **Control**: "Articles" stayed active throughout, and its block never
     left the visitor's page (Rule 6). A press deactivates its series in
     scenario 7, with no last-active rule [OMP1](#omp1). <sup>s</sup>

4. **Delete a section** {OJS OPS}

   Given: Journal Manager, on a scratch journal with the sections
   "Articles", "Reviews" and "Essays", the Section Editor Sam Section (the
   Moderator on a preprint server) ticked under the "Editorial
   Assignments" of "Essays", the submitted article "Tidal Patterns" in
   "Reviews", in no issue, and, on a journal, one published issue.

   - **The delete window**: open Settings › Journal › "Sections"
     (Settings › Server › "Sections" on a preprint server), press the
     arrow at the start of the "Reviews" row, then "Delete": a window
     headed "Delete" asks "Are you sure you want to permanently delete
     this section?", with "OK" and "Cancel" (Rule 7).
   - **A section holding an article**: press "OK": the row stays, and the
     notice reads "Before this section can be deleted, you must move
     articles submitted to it into other sections." ("Before this section
     can be deleted, you must move preprints posted within it into other
     section." on a preprint server) (Rule 7a).
   - **Moving the article out**: open "Tidal Patterns" in its workflow and
     its "Publication Settings" page ("Preprint entry" on a preprint
     server), choose "Articles" in the "Section" list and press "Save": on
     a journal the save is refused with "Issue: This field is required.";
     choose "Don't Assign To An Issue" and press "Save" again, and it
     saves. On a preprint server the first "Save" saves (Rule 7c).
   - **The emptied section**: back on the tab, press "Delete" on the
     "Reviews" row, then "OK": the row is gone, and no notice shows (Rule
     7; Side effects).
   - **Its editors go with it**: the "Essays" row reads "Sam Section"
     under "Editors"; press its "Delete", then "OK": the row is gone. Press
     "Create Section", type "Essays" in "Section title" and "ESS" in
     "Abbreviation" ("essays" also in "Section URL Path. Use hyphens (-)
     instead of spaces." on a preprint server) and press "Save": the new
     "Essays" row reads "None" under "Editors" (Rule 2; Side effects).
   - **The last active section**: press the "Inactive" box of "Articles"
     and then "OK", which leaves "Essays" the only active section. Press
     "Delete" on the "Essays" row, then "OK": the row stays, and "At least
     one section must be active. Visit the workflow settings to disable
     all submissions to this journal." ("…to this server.") shows at the
     top right (Rules 6c, 7b).
   - **Control**: reload the page: the tab lists "Articles", with its
     "Inactive" box ticked, and "Essays", and no "Reviews" (Rules 1, 7).
     A press deletes its series in scenario 7, the last one included
     [OMP1](#omp1). <sup>s</sup>

5. **The "Submissions" page's section policies** {OJS OPS}

   Given: Journal Manager, an Author, and a visitor, signed out, in a
   second browser, on a scratch journal with the sections "Articles" and
   "Reviews", whose policies read "Policy for articles." and "Policy for
   reviews.", and "Notes", which has no policy.

   - **The visitor**: the visitor opens About › "Submissions": after the
     submission checklist come a block headed "Articles" that reads
     "Policy for articles." and one headed "Reviews" that reads "Policy
     for reviews."; "Notes" has no block, and no block carries a line
     about making a submission (Rules 12, 12b; Settings bullet 3).
   - **The signed-in Author**: the Author opens the same page: the same
     two blocks, followed by "Make a new submission to the Articles
     section." and "Make a new submission to the Reviews section.", each
     section's name a link (Rule 12b).
   - **Restricted and inactive**: Journal Manager: open Settings ›
     Journal › "Sections" (Settings › Server › "Sections" on a preprint
     server); on the "Reviews" row press the arrow, then "Edit", tick
     "Items can only be submitted by Editors and Section Editors." ("Items
     can only be submitted by Managers and Moderators." on a preprint
     server) and press "Save"; then press the "Inactive" box of "Articles"
     and "OK" (Rule 5; Settings bullets 1, 2).
   - **The Author's and the visitor's page**: the Author and the visitor
     reload About › "Submissions": neither shows a block (Rules 5d, 12a;
     Settings bullet 2).
   - **The Journal Manager's page**: the Journal Manager opens About ›
     "Submissions": the blocks headed "Articles" and "Reviews" both show
     (Rule 12a).
   - **No section open**: Journal Manager: on the "Notes" row press
     "Edit", tick the same box and press "Save". The Author and the visitor reload the
     page: under its heading it reads "This journal is not accepting
     submissions at this time." ("This server is not accepting
     submissions at this time."). The Journal Manager reloads it: it still
     reads "Make a new submission or view your pending submissions.", and
     both blocks show (Rules 13, 13a).
   - **Control**: before "Notes" was restricted, neither the Author's page
     nor the visitor's read "This journal is not accepting submissions at
     this time." (Rule 13). A press's page, which lists no series, is read
     in scenario 7 [OMP1](#omp1). <sup>s</sup>

6. **A preprint server's "Archives" and section pages** {OPS}

   Given: Preprint Server Manager, and a visitor, signed out, in a second
   browser, on a scratch preprint server with the sections "Preprints"
   (path "preprints") and "Reviews" (path "reviews"), the categories
   "Applied Science", which holds "Computer Science", and "Social
   Sciences", and the preprints "Alpha Study", "Beta Study" and "Gamma
   Study", posted in "Preprints" on 1, 2 and 3 March 2024.

   - **"Archives"**: the visitor presses "Archives" in the main menu: the
     page is headed "Archives"; above the list stand a search box and the
     links "Applied Science" and "Social Sciences", with no link
     "Computer Science"; the list shows "Gamma Study", "Beta Study" and
     "Alpha Study", in that order (Rules 14, 14a).
   - **The home page**: the visitor opens the server's home page: the same
     search box and the links "Applied Science" and "Social Sciences"
     stand above "Latest preprints" (Rule 15).
   - **A section's page**: the visitor opens the server's address followed
     by "preprints/section/preprints": the page is headed "Preprints" and
     lists "Gamma Study", "Beta Study" and "Alpha Study", in that order
     (Rules 16, 16a).
   - **An empty section's page, with its description**: Preprint Server
     Manager: open Settings › Server › "Sections", press the arrow at the
     start of the "Reviews" row, then "Edit", type "Reviews of recent
     preprints." in "Section archive Description" and press "Save". The
     visitor opens the server's address followed by
     "preprints/section/reviews": the page is headed "Reviews", shows
     "Reviews of recent preprints." and reads "Nothing has been posted in
     this section yet." (Rule 16a; Settings bullet 14).
   - **An inactive section's page**: Preprint Server Manager: press the
     "Inactive" box of "Reviews", then "OK". The visitor reloads the page:
     it still opens, headed "Reviews" (Rules 5b, 16).
   - **A changed path**: Preprint Server Manager: on the "Reviews" row
     press "Edit", change "Section URL Path. Use hyphens (-) instead of
     spaces." to "critiques" and press "Save". The visitor opens the
     server's address followed by "preprints/section/critiques": the page
     headed "Reviews" opens; the address ending in
     "preprints/section/reviews" now answers "404 Not Found" (Rules 3,
     16c; Settings bullet 14).
   - **Control**: before the path was changed, the address ending in
     "preprints/section/critiques" answered "404 Not Found" (Rule 16c).
     A journal and a press have neither page. <sup>s</sup>

7. **A press's series** {OMP}

   Given: Press Manager, an Author, and a visitor, signed out, in a second
   browser, on a scratch press with no series and no category.

   - **A press with no series**: open Settings › Press › "Series": a table
     headed "Series", with the button "Add Series" at its top right and no
     "Order", and the columns "Title", "Categories", "Editors" and
     "Inactive", reads "No Items" (Fields, the "Series" tab; Rule 1).
   - **The series window**: press "Add Series": a window headed "Add
     Series" opens, ending in "Required fields are marked with an
     asterisk: *", "Save" and "Cancel"; "Order of monographs" is set to
     "Title (A-Z)", both tick boxes are unticked, and there is no
     "Categories" field (Fields, the series window).
   - **An empty "Path"**: type "The" in "Prefix" and "Monographs" in
     "Title" and press "Save": "This field is required." shows under
     "Path", and the window stays open (Fields, "Path").
   - **A refused path**: type "new series" in "Path" and press "Save": the
     notice "The series path must consist of only letters and numbers."
     shows at the top right [OMP2](#omp2), and the window stays open
     (Fields, "Path").
   - **Refused ISSNs**: change "Path" to "monographs", type "1234" in
     "Online ISSN" and press "Save": "Please enter a valid ISSN."; type
     "0378-5955" in both "Online ISSN" and "Print ISSN" and press "Save":
     "Online and print ISSN must not be the same."; the window stays open
     both times. Empty "Print ISSN" (Fields, "ISSN").
   - **Saved, closed to authors**: tick "Don't allow authors to submit
     directly to this series." and press "Save": the window closes, "Your
     changes have been saved." shows, and the table lists "The Monographs"
     with "None" under "Categories" and under "Editors" and its "Inactive"
     box unticked (Fields, the "Series" tab; Rule 10).
   - **The press's "Submissions" page**: the visitor opens About ›
     "Submissions": no block names the series, and the page reads "Login
     or Register to make a submission."; the Author opens it: it reads
     "Make a new submission or view your pending submissions." (Rules
     12c, 13c).
   - **A path in use**: press "Add Series", type "Textbooks" in "Title"
     and "monographs" in "Path" and press "Save": "The series path already
     exists. Please enter a unique path."; change "Path" to "textbooks" and
     press "Save": the table lists "Textbooks" too, and "Order" now stands
     beside "Add Series" (Fields, "Path").
   - **"Order"**: press "Order", drag the lower row above the other and
     press "Done": the two rows have changed places; reload the page: the
     order holds (Rule 4a).
   - **Every series inactive**: press the "Inactive" box of "The
     Monographs": a window headed "Confirm" asks "Are you sure you wish to
     deactivate this section?" [OMP5](#omp5); press "OK": the box is
     ticked and "Your changes have been saved." shows. Do the same on
     "Textbooks": its box is ticked too (Rules 5, 6).
   - **Every series deleted**: press the arrow at the start of "The
     Monographs" row, then "Delete": a window headed "Delete" asks "Are
     you sure you wish to delete this item? This action cannot be
     undone."; press "OK": the row is gone. Do the same on "Textbooks":
     the table reads "No Items" (Rules 6, 7).
   - **Control**: the second "Inactive" box and the last "Delete" were
     taken with no refusal, where a journal keeps its last active section
     (Rule 6; [OMP1](#omp1)). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - a section's "Section title" (a series' "Title") of one space refused
    with the sentence "A title is required for the section." (OMP "…for
    the series.") in the notice, not a raw code ([A6](#a6)): the guard
    the issue report proposes
  - the section link under a policy on the "Submissions" page opening
    "Make a Submission" with that section chosen ([A1](#a1)): the guard
    the issue report proposes
  - the "Submissions" page with "Disable Submissions" ticked showing no
    "Make a new submission to the {section} section." line, and an
    inactive section's policy absent for the editorial roles ([A7](#a7),
    [A8](#a8)): the guard the issue report proposes
  - the sections endpoint asked for its list at the site's address by
    the Site Administrator answering a refusal (404), not a server error
    ([A10](#a10)): the guard the issue report proposes
  - {OMP} a series' "Path" refused with a message that names the
    characters a saved path may hold ([OMP2](#omp2)): the guard the
    issue report proposes
  - {OMP} an SVG not offered as a series cover, and a cover file the
    server refuses answered with the "An invalid image was uploaded."
    notice, the series' other edits kept in the open window
    ([OMP3](#omp3)): the guard the issue report proposes
  - {OMP} the ISSN paragraph in the series window reading "which
    identifies" ([OMP7](#omp7)): the guard the issue report proposes
  - {OMP} the series list's "Inactive" box asking "…deactivate this
    series?" ("…activate this series?") ([OMP5](#omp5)): the guard the
    issue report proposes
  - {OMP} the help under a saved series' "Path" showing the series' own
    address ([OMP8](#omp8)): the guard the issue report proposes
  - {OPS} "Archives" on a server with nothing posted showing a sentence
    that says so ([OPS1](#ops1)): the guard the issue report proposes
  - {OPS} an "Archives" page typed past the last one answering "404 Not
    Found", as a section's page does ([OPS5](#ops5)): the guard the
    issue report proposes
  - {OPS} the section window without the "Identify items posted in this
    section as a(n)" box, or the box's help giving examples, as the team
    decides ([OPS2](#ops2)): the guard the issue report proposes
  - {OPS} "Archives" holding 272 preprints posted on one day (11 pages
    of 25, as walked), paged with "Next" to the end: each preprint on
    exactly one page (Rule 14d, [OPS7](#ops7)): the guard the issue
    report proposes
- **Rarely met**:
  - {OJS} "Omit author names for section items from issues' table of
    contents." ticked, the issue's table of contents without the section's
    author lines (Settings bullet 10): a manager sets it once when the
    section is configured, not in an ordinary week
  - a ticked editor whose role has ended, still named under "Editors" until
    the section's next "Save" (Rule 8): a manager ends an editor's role
    rarely, not in an ordinary week
  - {OMP} a series' "Cover Image" saved, shown in the window and deleted
    (Fields, "Cover Image"): set once when the series is created, not in
    an ordinary week
- **Nothing new to test**:
  - "Cancel" in the section window dropping a change without asking, and
    its "×" asking first (Fields, the section window)
  - while ordering, "Create Section" and "Order" doing nothing, and the
    dragged order surviving a tab switch but not a reload (Rule 4b)
  - {OJS} the sections read through the programming interface, by a
    Journal Manager and by the roles it refuses, a page at a time (Actors
    row 6; Rule 17a): the apps' own screens never call it
  - the Editor, the Production Editor and the Site Administrator on the
    same tab (Actors row 1): scenario 1's Journal Manager meets the same
    screen
  - "Cancel" in the delete window (Rule 7): the row stays as it stands,
    as scenario 4's refused deletes leave it
  - "Editorial Assignments" with nobody in an offered role, the heading
    over no box (Fields, "Editorial Assignments"): scenario 1 reads the
    same heading with boxes under it
  - the assistant roles reading only the open sections' policies (Actors
    preamble; Rule 12a): scenario 5's Author reads the same page
  - "This journal is not accepting submissions at this time." with every
    section restricted to editors (Rule 13a): scenario 5 reaches the same
    notice with one section inactive and the others restricted
- **Register carries it**:
  - A6 (a title of spaces only answered with a notice showing a raw code;
    Fields, "Section title")
  - A1 (the "Make a new submission to the {section} section." link opening
    the start form with no section chosen; Rule 12b)
  - A7 (the same link under an inactive section's policy for the editorial
    roles; Rule 12d)
  - A8 ("Disable Submissions" ticked, the notice for everyone and the
    section links kept; Rules 12d, 13b)
  - A2 (a negative "Word Count" saved, and text saved as 0; Fields, "Word
    Count"; Settings bullet 4)
  - A3 ("Will not be included in the indexing of the journal" ticked,
    with no effect; Settings bullet 8)
  - A4, A9, A10 and A5 (the programming interface's two failing filters,
    its refusals given as message codes, its server errors on a section
    asked for by a word and on the site's address, and its absence on a
    press and a preprint server; Rules 17b–17d)
  - OMP6 (a new series' place in the table; Rule 2a)
  - OMP2 (the series path message; Fields, "Path"; scenario 7 passes it)
  - OMP5 (the series' activate and deactivate windows asking about a
    "section"; Rule 5; scenario 7 passes it)
  - OMP3 (an SVG cover dropped without a message; Fields, "Cover Image")
  - OMP7 (the ISSN paragraph's "which identifying"; Fields, "ISSN")
  - OMP8 (the path help ending in "Path"; Fields, "Path")
  - OMP4 (a series' "Categories" boxes feeding only the table's column;
    Fields, "Categories")
  - OMP9 (a series' public page without the series' name, description
    and ISSNs, its books newest first whatever "Order of monographs" says;
    Rule 10b; Settings bullet 15)
  - OPS1 ("Archives" with nothing posted; Rule 14c)
  - OPS5 (an "Archives" page past the last one; Rule 14b)
  - OPS3 (two sections sharing a path, and a path with a space or a slash;
    Rule 16c)
  - OPS4 (no link leading to a section's page; Rule 16b)
  - OPS2 (the "(For example etc.)" help, and the box changing nothing on
    a preprint server; Fields, "Identify items posted in this section as
    a(n)"; Settings bullet 11)
  - OPS7 (same-day preprints repeated and skipped across the "Archives"
    pages; Rule 14d)
- **Owned by another feature**:
  - the roles without the Settings pages refused the "Sections" tab
    (Actors preamble; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - the users ticked under "Editorial Assignments" assigned to a new
    submission, and their email (Actors row 2; Rule 8; Side effects;
    *[Submission wizard](U21-submission-wizard.md)*, scenario 11;
    *[Stage participants](U35-stage-participants.md)*, scenario 8)
  - an inactive or editor-only section refused at "Make a Submission", and
    a draft in it stopping at "Section Closed" (Actors row 3; Rule 5a;
    Settings bullet 2; *[Submission wizard](U21-submission-wizard.md)*,
    scenario 12)
  - a section's policy under the start form's "Section" choice (Rule 11;
    Settings bullet 3; *[Submission wizard](U21-submission-wizard.md)*,
    scenario 12)
  - the start form with only one section open, which shows no "Section"
    choice (Rule 12b; *[Submission wizard](U21-submission-wizard.md)*,
    scenario 5)
  - "Word Count" capping the abstract at submission and on "Title &
    Abstract" (Settings bullet 4; *[Submission
    wizard](U21-submission-wizard.md)*, scenario 12; *[Publication
    metadata](U40-publication-metadata.md)*, scenario 2)
  - "Do not require abstracts" ticked, a submission without an abstract
    (Settings bullet 5; *[Submission wizard](U21-submission-wizard.md)*,
    scenario 6; *[Publication metadata](U40-publication-metadata.md)*,
    scenario 2)
  - {OJS} "Omit the title of this section from issues' table of
    contents." ticked (Settings bullet 9; *[Issues](U50-issues.md)*,
    scenario 3)
  - {OJS} "Will not be peer-reviewed" ticked, with no Publication Facts
    Label either way (Settings bullet 7; *[Article landing page &
    reading](U13-article-landing-page-and-reading.md)*, its OJS5)
  - "Abbreviation", and on a journal "Identify items published in this
    section as a(n)", in the records handed to harvesters (Settings
    bullets 11, 12; *OAI-PMH*)
  - {OMP} a series' "Path" as its page's address, the old address opening
    the Catalog once the path is changed, its cover on that page, and its
    name and ISSNs under "Series" on its books' pages (Rules 10, 10a, 10b;
    Settings bullet 15; *Catalog browse*)
  - {OPS} the trail and page links of "Archives" and a section's page, and
    "Items per page" at another value (Rules 14b, 16a; Settings bullet 17;
    *[Navigation menus & site
    chrome](U08-navigation-menus-and-site-chrome.md)*, scenario 10)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A section's "Make a new submission to the … section." link opens "Make a Submission" with no section chosen | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | A title of spaces only is refused with a notice that shows a raw code instead of a sentence | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | Under an inactive section's policy, the editorial roles get a submission link to a section the start form does not offer | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A8](#a8) | With "Disable Submissions" ticked, the "Submissions" page keeps its per-section submission links | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | The REST API's sections endpoint refuses a missing or another journal's section with a raw message code | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A10](#a10) | The sections interface fails with a server error on a section asked for by a word, and on the site's address | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OMP2](#omp2) | The series path message says "only letters and numbers" while ".", "/", "_" and "-" are accepted | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP3](#omp3) | A series "Save" with an SVG cover chosen saves nothing, not even the other changes, and shows no message | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP5](#omp5) | A press manager deactivating or reactivating a series is asked about a "section" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP7](#omp7) | The ISSN help in a press's series window reads "which identifying" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP8](#omp8) | The help under a series' "Path" shows an address ending in the word "Path", never the series' own | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OMP9](#omp9) | A series' public page shows no name, description or ISSN, and lists the books newest first whatever the series' order | 🐞 | user-visible | — |
| [OPS1](#ops1) | A preprint server with nothing posted shows a blank "Archives" page, with no message | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OPS2](#ops2) | Preprint server sections: the "Identify items posted in this section as a(n)" box has no examples and no effect | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OPS5](#ops5) | A typed "Archives" page number past the last page opens an empty page instead of "404 Not Found" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OPS7](#ops7) | Paging through "Archives" shows some preprints posted on the same day on several pages and others on none | 🐞 | medium | — |
| [A2](#a2) | A negative "Word Count" is saved and then refuses every abstract in the section, at submission and on "Title & Abstract" | ❓ | user-visible | — |
| [A3](#a3) | "Will not be included in the indexing of the journal" changes nothing anywhere | ❓ | minor | — |
| [A4](#a4) | The sections interface fails with a server error on its search-phrase and type filters | ❓ | latent · crash: server | — |
| [A5](#a5) | A press and a preprint server have no sections interface | ❓ | latent | — |
| [OMP4](#omp4) | A series' "Categories" boxes feed only the list's column | ❓ | minor | — |
| [OMP6](#omp6) | A new series has no fixed place in the press's list of series | ❓ | minor | — |
| [OPS3](#ops3) | A section's URL path is not checked: a shared path shows only one section's page, a path with a space or slash no page | ❓ | minor | — |
| [OPS4](#ops4) | No page of a preprint server links to a section's page | ❓ | minor | — |
| [OMP1](#omp1) | Series are optional and described for readers; no intake settings, no active-series minimum | ✅ | — | — |
| [OPS6](#ops6) | One preprint posted without an abstract made the server's harvesting record lists fail | ✅ | retired | PR review (claude), 2026-10-05 — fixed at pkp/ops#1430's head |

### All apps

<a id="a1"></a>
**A1 — A section's "Make a new submission to the … section." link opens "Make a Submission" with no section chosen** · 🐞 · low.
A signed-in author reads "Make a new submission to the Articles
section." under the "Articles" policy on the "Submissions" page and
presses "Articles", the link inside that sentence, expecting "Make a
Submission" with "Articles" chosen. The start form opens with no section
chosen, exactly as from "Make a new submission" at the top of the page,
and the author has to pick "Articles" again. The sentence shows only to
signed-in users. The fault needs two or more sections open to the
author; with one, the form asks for no section. A press's "Submissions"
page has no such sentence.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A negative "Word Count" refuses every abstract** · ❓ · user-visible.
A manager types -5 in a section's "Word Count" and presses "Save"; the
window accepts it. From then on every abstract in the section is too long.
At submission the Review step reports "The abstract is too long. It should
be -5 words or less. It is currently {n} words long." for any abstract,
and "Submit" stays disabled, so the section cannot take a submission. On
the publication's "Title & Abstract" page the section's submissions read
"Word Count: {n}/-5" and every "Save" is refused. Where the plain language
summary is offered, even an empty one is refused ("The plain language
summary is too long. It should be -5 words or less. It is currently 0
words long."), so no title or abstract in the section can be corrected.
Question: should "Word Count" refuse a negative number (and text) the way
it invites a number? Lean: 🐞, refuse anything but a whole number from 0
up, since the help promises "0 for no limit" and a negative limit has no
meaning.
Basis: probe, 2026-09-25. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — "Will not be included in the indexing" changes nothing** · ❓ · minor.
A manager ticks "Will not be included in the indexing of the journal"
("…of the server") expecting the section's articles to leave the
journal's indexing: its search, its harvested records or its
search-engine data. Nothing changes: the articles stay in the search
results, in the harvested records and on their pages as before. Only a
journal's own export file records the tick; a preprint server's export
file does not carry it either, so there the box has no effect at all.
Question: is the box meant to act on the harvested records or the search
index? Lean: ❓ for the team; either wire the box to the harvested records
or drop it from the window.
Basis: probe, 2026-09-25. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The sections interface fails on two of its filters** · ❓ · latent · crash: server.
The apps' own screens never call this interface, so no user of them
meets this. A program reading a journal's sections through the install's
programming interface (Rule 17) may ask for a search phrase or a list of
types, as the interface accepts. Either request fails: the app answers a
server error instead of a list, for a Journal Manager, an Editor and the
Site Administrator alike. The plain list and a single section work.
Question: should the two filters be implemented or removed? Lean: 🐞
latent; remove the two filters, since sections have no type.
Basis: probe, 2026-09-25. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — No sections interface on a press or a preprint server** · ❓ · latent.
The apps' own screens never call this interface, so no user of them
meets this. A journal answers its sections at the programming
interface's sections address (Rule 17). A program asking a press or a
preprint server at the same address gets "The requested URL was not
recognized.", signed in with any role or not, although their apps carry
the same interface code.
Question: should a press and a preprint server offer the sections
interface too? Lean: ❓ for the team; offer it on both, since the code is
shared and nothing app-specific stops it.
Basis: probe, 2026-09-25. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A title of spaces only answers a raw code** · 🐞 · low.
A manager types a single space as the section's "Section title" (a
series' "Title" on a press) and presses "Save". The browser's own
required check counts the space as filled in, and the server's refusal
is a notice at the top right reading
"##manager.setup.form.section.nameRequired## (English)"
("##manager.setup.form.series.nameRequired## (English)" on a press), in
every interface language, where a sentence such as "A title is required
for the section." should be. Shares its cause with *[Submission intake
configuration](U58-submission-intake-configuration.md)* A10.
Basis: probe, 2026-10-02. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — An inactive section's policy offers a link the start form refuses** · 🐞 · low.
Signed in with an editorial role, a user reads an inactive section's
policy on the "Submissions" page with "Make a new submission to the
{section} section." under it, and presses the section's name expecting
to submit to it. "Make a Submission" opens, and its "Section" choice
lists every other section but not that one; with one other section left,
the form asks for no section at all and files the submission under that
other section. The page offers a section the start form refuses.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — With submissions disabled, the section links still invite one** · 🐞 · low.
With "Disable Submissions" ticked, a signed-in Author reads "This
journal is not accepting submissions at this time." ("This server is not
accepting submissions at this time.") at the top of the "Submissions"
page, and "Make a new submission to the {section} section." under every
policy. Pressing a section's name opens "Make a Submission" showing only
"This journal is not accepting submissions at this time. Visit the
workflow settings to allow submissions." The page invites a submission
it has just said it does not accept.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The REST API's sections endpoint refuses a missing or another journal's section with a raw message code** · 🐞 · low.
When a program reads one section through the REST API's sections
endpoint and the journal has no section with that number, the refusal
reads "##api.sections.404.sectionNotFound##" instead of a sentence. When
it asks for a section that belongs to another journal, the refusal reads
"##api.sections.400.contextsNotMatched##". Neither message has any text
in the install. No screen of the application sends this request, so only
the authors of programs that call the endpoint meet it.
Basis: probe, 2026-10-02. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The sections interface fails where it should refuse** · 🐞 · low · crash: server.
No screen of the application sends these requests; a program reading a
journal's sections through the REST API's sections endpoint meets them.
Two requests make the application fail with a server error where a
refusal is due. A section asked for by a word instead of a number
("abc") fails with "The route … could not be found.", where a number the
journal has no section under is refused as not found ([A9](#a9)); this
is the same fault as every API address that matches no route. The list
asked for by the Site Administrator at the site's own address, with no
journal in it, fails with "Call to a member function getId() on null",
where the other endpoints that need a journal answer "The requested
resource was not found."; other roles there are refused by role.
Basis: probe, 2026-10-02. <sup>f-a10</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Series are optional and described for readers** · ✅ · —.
A press's series differ from a journal's sections in what they are for.
A book may sit in no series, so a press starts with none, may deactivate
every series and may delete the last one. A series carries no policy,
abbreviation, word limit, abstract switch, review form or table-of-contents
boxes, and a press's "Submissions" page lists no series and keeps its
invitation to submit whatever its series allow; a series carries a
prefix, subtitle, description, cover, ISSNs, a book order, categories and a
path for its public page instead. Different parameters on the same
machinery: a divergence, not a defect.
Basis: probe, 2026-09-25. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The path message misstates what a path may hold** · 🐞 · low.
A manager types "new series" as a series' "Path" and reads the notice
"The series path must consist of only letters and numbers."; they then
type "new-series", which the message says is refused, and it is saved.
The message should name the characters the box accepts: letters a–z and
A–Z (not accented ones such as "é", which are refused), digits, ".",
"/", "_" and "-". A category's path gives the same message for the same
pattern (*[Categories](U16-categories.md)* A9).
Basis: probe, 2026-10-02. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A series "Save" with an SVG cover chosen saves nothing, not even the other changes, and shows no message** · 🐞 · medium.
A manager editing a series picks a cover; the file picker offers JPG,
PNG and SVG files, and an SVG uploads. "Save" then saves nothing and
says nothing: the window stays open and no message shows anywhere. Every
other change made in the same window (the title, the description) is
refused with the cover, and is lost when the manager closes the window.
A cover the series already had stays as it was. A PNG or JPG cover saves
normally, so a manager who converts the picture gets round it, but the
window never says that SVG is not accepted.
Basis: probe, 2026-10-02. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — A series' categories go nowhere** · ❓ · minor.
A manager ticks categories in a series' window; the table's "Categories"
column lists them, and nothing else changes: the category pages, the
catalog and the books of the series are as before.
Question: what should a series' categories do? Lean: ❓ for the team; if
nothing, drop the boxes and the column.
Basis: probe, 2026-09-25. <sup>f-omp4</sup>

<a id="omp5"></a>
**OMP5 — A press manager deactivating or reactivating a series is asked about a "section"** · 🐞 · low.
A press manager presses a series' "Inactive" box on Settings › Press ›
"Series". The window asks "Are you sure you wish to deactivate this
section?". When the series is already inactive, it asks "Are you sure
you wish to activate this section?". Every other screen of a press says
"series". "OK" deactivates or reactivates the series as asked. The
question asks about a "section" in every interface language, in French a
"rubrique", since none of OMP's 34 languages gives these questions a
press's wording.
Basis: probe, 2026-10-02. <sup>f-omp5</sup>

<a id="omp6"></a>
**OMP6 — A new series has no fixed place in the list** · ❓ · minor.
A manager adds a series to a press, expecting it at the end of the
"Series" table as a new section is on a journal. It has landed first, in
the middle and last, also after an order had been kept with "Order" and
"Done", and an unchanged "Save" of a series has moved it. The submission
wizard's "Series" choice and a book's "Catalog Entry" list follow the
same shifting order.
Question: should a new series take the last place, as a new section does?
Lean: 🐞; give a new series the last place, as a journal does.
Basis: probe, 2026-09-25. <sup>f-omp6</sup>

<a id="omp7"></a>
**OMP7 — The ISSN help in a press's series window reads "which identifying"** · 🐞 · low.
A press manager adding or editing a series reads, above the "Online
ISSN" and "Print ISSN" boxes: "The ISSN (International Standard Serial
Number) is an eight-digit number which identifying periodical
publications including electronic serials." It should read "which
identifies". The other interface languages' texts do not have the slip.
Basis: probe, 2026-10-02. <sup>f-omp7</sup>

<a id="omp8"></a>
**OMP8 — The help under a series' "Path" shows an address ending in the word "Path", never the series' own** · 🐞 · low.
A press manager who opens a series' "Edit" window finds a help line
under the "Path" box with a sample address: "The series's URL will be:
…/catalog/series/Path". The press's part of the address is right, but
the last part is always the word "Path", where the series' own path
belongs. For the series "History", whose path is "his", the manager
expects "…/catalog/series/his". The help shows the same sample before
and after the path is changed and saved. Nothing is lost: the series'
page is at its own address, and the box holds the path. Every series
shows it. The "Add Series" window shows the same sample, which suits a
new series that has no path yet. The help is written when the window
opens, so it does not follow the box while the manager types either.
Basis: probe, 2026-10-02. <sup>f-omp8</sup>

<a id="omp9"></a>
**OMP9 — A series' public page loses the series' name, description, ISSNs and book order** · 🐞 · user-visible.
A visitor who opens any series' page, the seeded "Monographs" as much as
a new series, sees an empty heading, an empty last step in the trail, a
browser tab reading only "| {press name}", and none of the series'
description or ISSNs. The series' cover image and the list of the books
published in the series show ("1 Titles"; a series with none reads "0
Titles" and "No titles have been published yet."), but the books come
newest first whatever the series' "Order of monographs" says. The page is
*Catalog browse*'s; the fields that should fill it are this spec's. It
broke in an August 2026 change to how a press loads its series: a
regression, not a choice.
Since: 2026-08-26 (one month) · Basis: probe, 2026-09-25; its start, commit. <sup>f-omp9</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server with nothing posted shows a blank "Archives" page, with no message** · 🐞 · low.
A visitor opens "Archives" on a preprint server with nothing posted yet
and sees the heading and the search box, then nothing: no sentence says
that nothing has been posted, as a section's empty page does ("Nothing
has been posted in this section yet."). It costs nothing but a moment's
doubt: the visitor cannot tell an empty server from a page that failed
to load its list.
Basis: probe, 2026-10-02. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — Preprint server sections: the "Identify items posted in this section as a(n)" box has no examples and no effect** · 🐞 · low.
A preprint server manager who edits a section sees the box "Identify
items posted in this section as a(n)". The help under it reads "(For
example etc.)" and gives no example. A journal's section window gives
three. What the manager enters in the box is saved, but nothing on a
preprint server uses it. No page shows it, and the records the server
gives to harvesters (OAI-PMH) list every preprint as a preprint,
whatever the box holds. The manager is not told. The report recommends
removing the box from the server's section window, since nothing on a
preprint server uses a section's item type. Values already saved stay in
the database and in the REST API, so nothing saved is lost.
Basis: probe, 2026-10-02. <sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — Section paths are not checked** · ❓ · minor.
A manager gives a second section the path "preprints", which the first
section already has, or a path with a space or a slash such as "a b/c";
"Save" accepts both. The two sections sharing "preprints" then share one
address, which shows whichever of them stands first in the section order,
so the other's page cannot be reached. A section whose path holds a space
or a slash has no reachable page: its address answers "404 Not Found". A
press refuses both on its series (Fields).
Question: should the server check its section paths as a press checks
its series paths? Lean: 🐞, apply the press's two checks.
Basis: probe, 2026-09-25. <sup>f-ops3</sup>

<a id="ops4"></a>
**OPS4 — Nothing links to a section's page** · ❓ · minor.
Every section has a public page listing its posted preprints, but no
menu, archive header, preprint page or trail links to it; a visitor finds
it only by typing its address or through a menu item a manager adds by
hand.
Question: should the archive header or the preprint page link to the
section's page? Lean: ❓ for the team; link the section's name on the
preprint's page.
Basis: probe, 2026-09-25. <sup>f-ops4</sup>

<a id="ops5"></a>
**OPS5 — A typed "Archives" page number past the last page opens an empty page instead of "404 Not Found"** · 🐞 · low.
A visitor who opens an "Archives" page past the last one of a preprint
server gets an empty page instead of "404 Not Found". It is headed
"Archives - Page 2" and shows the search box, no preprints and the page
links "Previous 26-25 of 17", a range that starts after the server's
last preprint. The page answers "200 OK", so a search engine that holds
its address keeps an empty page in its index. A section's page past its
last one, and OJS's issue archive, answer 404; the fix gives the archive
the same answer. The address is one that no link on the server shows:
typed, bookmarked, or left behind when the server's list got shorter or
"Items per page" grew.
Basis: probe, 2026-10-02. <sup>f-ops5</sup>

<a id="ops7"></a>
**OPS7 — Paging through "Archives" repeats some same-day preprints and skips others** · 🐞 · medium.
A visitor who presses "Next" through a preprint server's "Archives"
expects to meet every posted preprint once. Where preprints posted on
the same day run across a page break, some show on two or more pages
and others on none, and nothing says so: on a server with 272 preprints
posted on one day, the 11 pages showed 268 different preprints, one of
them on pages 1 to 5, and four on no page. A reader browsing the
archive cannot reach those four except by search. The same fault pages
the export list and the editorial dashboard
(*[Import & export](U63-import-export.md#a24)* A24), and one fix
reaches all of them.
Basis: probe, 2026-10-04. <sup>f-ops7</sup>

### Retired

<a id="ops6"></a>
**OPS6 — A preprint without an abstract broke the server's harvesting** · ✅ · retired. Fixed by pkp/ops#1430 (for pkp/pkp-lib#13445), verified 2026-10-05 at the PR's head before its merge (*[OAI-PMH](U19-oai-pmh.md#ops2)*, note f-ops2). <sup>f-ops6</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips: ojs `d9b567efec`, omp
`187f0f40d2`, ops `61cd158ce3`, each with lib/pkp `76a315591b`. Every claim
with a screen was driven on 2026-09-25 on OJS, OMP and OPS, on scratch
journals, presses and preprint servers with throwaway accounts (the seeded
`publicknowledge` only read), as the notes below record. Rule 17, Actors
row 6, A4, A5, A9 and A10, which the apps' own screens never reach, were
checked by requests typed into a signed-in browser, as each role
(note g).

<a id="fn-a"></a>
**a** — Settings tab: `templates/management/context.tpl` in each app, `<tab id="sections">` labelled `section.sections` "Sections" (OJS, OPS) or `series.series` "Series" (OMP), loading `grid.settings.sections.SectionGridHandler` (OJS, OPS) or `grid.settings.series.SeriesGridHandler` (OMP) with `load_url_in_div`. Page heading `manager.setup`: "Journal Settings" (OJS), "Server Settings" (OPS). One section per article: `publications.section_id` (OJS, OPS), `publications.series_id` (OMP, nullable). Class chain (RUNBOOK rule 8): the grid handlers, rows, cell providers and forms are app classes (OJS and OPS near-identical forks, OMP its own `series` set), all on `PKP\controllers\grid\settings\SetupGridHandler` and `PKP\controllers\grid\settings\sections\form\PKPSectionForm`; the section object is `PKP\section\PKPSection` with an app `Section` subclass each, schema `lib/pkp/schemas/section.json` overlaid by each app's `schemas/section.json`.

<a id="fn-b"></a>
**b** — `SetupGridHandler::authorize()` adds `ContextAccessPolicy` and `CanAccessSettingsPolicy` (a `ROLE_ID_SITE_ADMIN` group, or a `ROLE_ID_MANAGER` group with `permitSettings`); every grid op is role-assigned to `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` only. `registry/userGroups.xml`: `permitSettings="true"` on manager, editor, productionEditor (OJS, OMP) and on the OPS manager. `ManagementHandler::authorize()` adds the same settings policy to the Settings pages. "Editorial roles": `PKPSection::getEditorRestrictedRoles()` returns `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`; the sub-editor role level holds the Section editor and Guest editor groups (OJS), Series editor (OMP), Moderator (OPS). Live-probed 2026-09-25 (Actors preamble, row 1), one account per role: the Settings pages with the "Sections" ("Series") tab opened for the Site Administrator, the Journal Manager, the Editor and a Production Editor on OJS and OMP (a Production Editor whose role had "Permit changes to Settings" unticked was refused), and for the Site Administrator and the manager on OPS; the Section Editor, a Guest Editor, the Copyeditor, Layout Editor, Proofreader, Assistant, a Funding Coordinator, the Reviewers, Author and Reader (on OPS a Moderator, an Editorial Board Member, Author and Reader) got "The current role does not have access to this operation."; a visitor got Login.

<a id="fn-c"></a>
**c** — `PKPSectionForm::execute()` deletes and re-inserts the section's `subeditor_submission_group` rows (`SubEditorsDAO::insertEditor()`, `ASSOC_TYPE_SECTION`). The automatic assignment at submit and its first-journal limit are the Submission wizard's A8 and footnotes; the email is Stage participants' Rule 12.

<a id="fn-d"></a>
**d** — Intake: `PKPSubmissionHandler` offers sections through the section collector with `excludeInactive()` and, for users outside `getEditorRestrictedRoles()`, without `editor_restricted` ones; OMP `SubmissionHandler::getSubmitSeries()` does the same for the wizard's "Series" radio (`ForTheEditors::addSeriesField()`, first option `common.none` "None", labels `Section::getLocalizedFullTitle()`). The gates and the "Section Closed" page are the Submission wizard's Rules 3 and 17. Live-probed 2026-09-25 (Actors row 3; Settings bullet 2), all three apps, two runs on OJS and OMP: a section restricted to editors was offered at the start form to the Site Administrator, Journal Manager, Editor, Production Editor, Section Editor and Guest Editor (on a server the managers and the Moderator), not to a Funding Coordinator, Copyeditor, Editorial Board Member, Reviewer, Author or Reader; drafts of theirs already in it opened "Section Closed" ("{journal} is not accepting submissions to the {section} section. If you need help recovering your submission, please contact …"), while a Section Editor's own draft reached Review. A press's closed series was offered in the wizard's "Series" choice to the Press manager, Press editor and Series editor only; an inactive one to nobody; the choice's labels carry the prefix and subtitle.

<a id="fn-e"></a>
**e** — "Submissions" page: `PKPAboutContextHandler::submissions()` assigns `sections` from the section collector with `excludeEditorOnly(!$canSubmitAll)`, where `$canSubmitAll` holds for `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR`; `Collector::excludeEditorOnly()` filters out both `editor_restricted = 1` and `is_inactive = 1`; the collector orders by `seq`. OJS and OPS `templates/frontend/pages/submissions.tpl` fill `$submissionChecklistAfterContent` with a `div.section_policy` per section whose `getLocalizedPolicy()` is not empty: `<h2>` title, the policy, and `{if $isUserLoggedIn}` `about.onlineSubmissions.submitToSection` "Make a new submission to the <a href="{$url}">{$name}</a> section." with `url page="submission" sectionId=…`. The core template prints `author.submit.notAccepting` "This journal is not accepting submissions at this time." ("This server …" in OPS) when `$sections|@count == 0` or `disableSubmissions` is set. OMP overrides `templates/frontend/pages/submissions.tpl` without the section count and without the policy capture. Start form: OJS and OPS `StartSubmission` add a `FieldHTML` per section with a non-empty policy, `showWhen` that section (Rule 11). Live-probed 2026-09-25 (Rules 11, 12; Settings bullet 3), OJS and OPS: picking a section with a policy on "Make a Submission" added a block headed by the section's title with its policy, a section without a policy nothing; before any pick only "Before you begin" showed. The "Submissions" page showed the same policies (notes td11, td12). A new section's policy box was empty, a new journal's or server's first section read "Section default policy".

<a id="fn-f"></a>
**f** — OPS `pages/preprints/index.php` routes op `index` to `APP\pages\preprints\PreprintsHandler` and `section` to `SectionsHandler`; both authorize with `ContextRequiredPolicy` and `OpsServerMustPublishPolicy` (denies a visitor only when `publishingMode` is `PUBLISHING_MODE_NONE`, which a server never stores, per Navigation menus & site chrome OPS2). `PreprintsHandler::index()`: published submissions of the context, `ORDERBY_DATE_PUBLISHED` descending (the collector's default direction), `itemsPerPage` (schema default 25) or `items_per_page` from the config, page n at `preprints/index/{n}`, with no check that the page exists (OPS5); `templates/frontend/pages/preprints.tpl` headed `archive.archives` "Archives" / `archive.archivesPageNumber` "Archives - Page {$pageNumber}", includes `frontend/components/archiveHeader.tpl` (the `searchForm_archive.tpl` search box and a link per category with no parent to `preprints/category/{path}`). Its empty branch tests `empty($publishedSubmissions)`, which is never true for the collector's `LazyCollection`, so an empty server gets the list branch with an empty list and no page links (OPS1); were the test fixed, the key it prints, `archive.noSubmissions`, is defined in no locale file of OPS or its `lib/pkp` and would show raw. `indexServer.tpl` includes the same archive header above `index.latestPreprints`.

<a id="fn-g"></a>
**g** — None of the apps' screens calls this interface: in 20 recorded runs over the three apps on 2026-09-25 no request went to the sections address, none went there during the probe's own visits below, and no `lib/ui-library` source calls it. `lib/pkp/api/v1/sections/SectionController.php`, mounted by `ojs/api/v1/sections/index.php` only (OMP and OPS have no `api/v1/sections` directory, while `lib/pkp/api/v1/sections/SectionController.php` is present in both checkouts): base `sections`, `GET /` (`section.getMany`) and `GET /{sectionId}` (`whereNumber`); middleware `has.user` and `roleAuthorizer([ROLE_ID_SITE_ADMIN, ROLE_ID_MANAGER])`, which does not look at `permitSettings`. `getMany()` starts from `DEFAULT_COUNT` 30 and caps `count` at `MAX_COUNT` 100, dispatches `typeIds` to `filterByTypeIds()` and `searchPhrase` to `searchPhrase()`, neither of which `PKP\section\Collector` defines (A4), and filters by `getRequest()->getContext()->getId()` (A10). `get()` answers `__('api.sections.404.sectionNotFound')` for an unknown id and `__('api.sections.400.contextsNotMatched')` for another context's section (A9). The address is `{journal}/api/v1/sections`; a trailing slash answers the same. Live-probed 2026-09-25 (Actors row 6; Rules 17, 17a–17d), two runs on fresh scratch data with the same result on every read, GET only, typed into a signed-in browser as each role and as a visitor:
- OJS, the list and one section: 200 to `admin`, `manager.maya`, `editor.diana`, and on a scratch journal to its Journal manager, Journal editor and a Production editor whose role had "Permit changes to Settings" unticked (Settings sent that Production editor to "The current role does not have access to this operation."); 401 to `sectioneditor.ana`, `copyeditor.carla`, `assistant.rita`, `reviewer.julia`, `author.alex`, `reader.rosa`, the scratch Section editor, Guest editor, Funding coordinator, Copyeditor, Reviewer, Author and Reader, a visitor, another journal's manager on this journal's address and this journal's manager on the other's. A refused role reads `"error":"user.authorization.roleBasedAccessDenied"` with "The current role does not have access to this operation.", a visitor "You are not authorized to access the requested resource.".
- OJS, the list: `{itemsMax, items}` in `seq` order, the same 16 fields per item as a single section; an inactive section (made so in the section window, its "Inactive" box ticked after a reload) and an editor-only one included with `isInactive` / `editorRestricted` true. On 102 sections as manager: the plain list gave the first 30 with `itemsMax` 102; `count=100`, `101` and `150` gave 100; `offset=30` gave 31–60; `count=100&offset=100` gave the last two. On 4 sections: `count=0` and `count=abc` gave `[]`; `count=-1` and `offset=-2` gave all four; `offset=99` gave `[]`; unknown parameters were ignored.
- OJS, the filters (A4): `?searchPhrase=Beta`, an empty `?searchPhrase=`, `?typeIds=1`, `?typeIds=1,2` and `?typeIds[]=1&typeIds[]=2` answered 500, as manager, editor and admin, with `Call to undefined method PKP\section\Collector::searchPhrase()` / `::filterByTypeIds()`; a refused role and a visitor got 401 first; the same parameters on a single section were ignored (200).
- OJS, one section: an unknown id and id 0 answered 404 `##api.sections.404.sectionNotFound##`, another journal's section 400 `##api.sections.400.contextsNotMatched##` (A9); `/sections/abc` 500 "The route {journal}/api/v1/sections/abc could not be found." (A10).
- OJS, the site's address (A10): `index/api/v1/sections` answered the admin 500 "Call to a member function getId() on null" and a visitor 401; `index/api/v1/sections/1` answered the admin 400 `##api.sections.400.contextsNotMatched##`.
- OMP and OPS (A5): the address and `/1` answered 404 `{"error":"api.404.endpointNotFound","errorMessage":"The requested URL was not recognized."}` on `publicknowledge` to every roster account (OMP: admin, maya, diana, ana, carla, rita, julia, alex, rosa; OPS: admin, maya, ana, rita, alex, rosa) and a visitor, and on a scratch press and server to the manager, an Author, the OPS Moderator, admin and a visitor, with `?searchPhrase=a` too, and at the site's address.

<a id="fn-h"></a>
**h** — OJS/OPS `SectionGridHandler::initialize()`: title `section.sections` "Sections"; grid action `addSection` `manager.sections.create` "Create Section" (an `AjaxModal` of the same title); columns `common.title` "Title", `user.role.editors` "Editors" (full names from `SubEditorsDAO::getBySubmissionGroupIds()`, joined by `common.commaListSeparator`, or `common.none` "None"), `common.inactive` "Inactive" (`controllers/grid/common/cell/selectStatusCell.tpl`, a checkbox whose click runs the cell action); rows sorted by `seq`. OMP `SeriesGridHandler::initialize()`: title `catalog.manage.series` "Series", action `grid.action.addSeries` "Add Series", columns "Title" (`getLocalizedTitle()` with the prefix), `grid.category.categories` "Categories" (`Repo::section()->getAssignedCategories()`), "Editors", "Inactive". Rows: `SectionGridRow` / `SeriesGridRow` add `grid.action.edit` "Edit" and `grid.action.delete` "Delete". `OrderGridItemsFeature` adds `grid.action.order` "Order" (finish controls `common.done` "Done" and `grid.action.cancelOrdering` "Cancel ordering"). Empty table `grid.noItems` "No Items".

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (Fields, the two tabs and the formatted boxes; the series' "Categories"), all three apps, as manager on the seeded contexts (read only) and on scratch ones: the table headed "Sections" ("Series"), "Create Section" ("Add Series") and, from the second row on, "Order"; the columns as listed; the seeded journal's "Editors" cells "Diana Editor, Ana Section Editor, Omar Section Editor" and "Diana Editor, Ravi Section Editor", the seeded server's "Ana Section Editor, Ravi Section Editor", a section with nobody ticked "None"; the row arrow, named "Settings", opening "Edit" and "Delete"; a scratch press "No Items" and no "Order"; "The K1 Series" for prefix "The". On a two-language context the policy, the archive description and the series description each had an English and a French box. A series with "Kay Cat" and its sub-category ticked read "Kay Cat, Kay Sub", the window naming the second box "Kay Cat > Kay Sub"; the seeded press's category boxes began with "Social Sciences > Anthropology", before "Applied Science" and "Social Sciences".

<a id="fn-i"></a>
**i** — OJS and OPS `SectionForm` (template `templates/controllers/grid/settings/sections/form/sectionForm.tpl`) extend `PKPSectionForm`; checks: `FormValidatorPost`, `FormValidatorCSRF`, `FormValidatorLocale` on `title` (`manager.setup.form.section.nameRequired`, a key no locale file defines) and `abbrev` (`manager.sections.form.abbrevRequired` "An abbreviated title is required for the section"), OJS `FormValidatorCustom` on `reviewFormId` (`manager.sections.form.reviewFormId`), OPS `FormValidator` on `path` (`manager.setup.form.section.pathRequired` "An URL path is required for the section"). `FormValidatorLocale::getMessage()` appends " ({language})" and `getFieldValue()` trims the primary-locale value. Labels: `section.title` "Section title", `section.abbreviation` "Abbreviation" (`maxlength="80"`; OPS title `maxlength="80"`), OPS `section.pathDescription` "Section URL Path. Use hyphens (-) instead of spaces." and `section.description` "Section archive Description", `manager.sections.policy` "Section Policy", `manager.sections.wordCount` "Word Count" with `manager.sections.wordCountInstructions` (`maxlength="80"`, saved `(int)`), `submission.sectionOptions` "Section Options", `manager.sections.identifyType` and `manager.sections.identifyTypeExamples` (OPS "(For example etc.)", OPS2), buttons `fbvFormButtons submitText="common.save"`. `SectionGridHandler::updateSection()` on success runs `createTrivialNotification()` (`common.changesSaved` "Your changes have been saved.") and a data-changed event that refreshes the row. New section (`execute()`): `setSequence(REALLY_BIG_NUMBER)`, `add()`, then `resequence()`, so it takes the last place. OPS `path` has no format or uniqueness check (OPS3).

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-25 (Fields, the section and series windows; A6), all three apps: an empty title and abbreviation showed "This field is required." under each box and sent nothing; a French title alone was refused under the English box. One space as "Section title" gave the notice "##manager.setup.form.section.nameRequired## (English)" (a series' "Title": "##manager.setup.form.series.nameRequired## (English)"), one space as "Abbreviation" the notice "An abbreviated title is required for the section (English)"; these, the last-active refusal and a press's path and ISSN refusals all showed at the top right with the window open and nothing under the box. A second section with the first one's abbreviation saved. OPS kept 80 of 81 characters typed as a title, OJS all 81; the abbreviation kept 80. After a change, the window's "×" asked "The data on this form has changed. Do you wish to continue without saving?" and "OK" closed it with nothing saved; "Cancel" closed it with no question, and the reopened window showed the old value; leaving the page raised the browser's leave question.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Fields "Word Count"; Settings bullet 4; A2), OJS and OPS: the box arrived empty on a new section, on a new journal's or server's first section and on a section made by the test tooling, and read "0" after a save with it empty; "abc" saved with no message and reopened as "0"; "-5" saved and reopened as "-5" after a reload. With a limit of 5, a six-word abstract reached "Review" with "The abstract is too long. It should be 5 words or less. It is currently 6 words long." and "Submit" disabled, five words passed; "Title & Abstract" counted "Word Count: 6/5" under the abstract and the plain language summary and refused "Save". With -5, a three-word abstract reached "Review" with "…It should be -5 words or less. It is currently 3 words long." and "Submit" disabled; "Title & Abstract" read "Word Count: 3/-5" and "Word Count: 0/-5" and "Save" answered "The form was not saved because 2 error(s) were encountered…" with both fields' errors, the empty summary's reading "…It is currently 0 words long.". A section with no limit showed no counter.

<a id="fn-j"></a>
**j** — OJS `SectionForm::fetch()` assigns `reviewFormOptions` from `ReviewFormDAO::getActiveByAssocId()`; the template renders the `reviewFormId` select only `{if count($reviewFormOptions)>0}`, `defaultLabel` `manager.reviewForms.noneChosen` "None / Free Form Review". Effect: `ReviewerForm::initData()` preselects `$section->getReviewFormId()` for the submission's section. OMP's `schemas/section.json` carries `reviewFormId` but no window field sets it. Live-probed 2026-09-25 (Fields "Review Form"; Settings bullet 6), OJS: the list read "None / Free Form Review" and the journal's one active form; a journal without a form had no such field; a form chosen and saved arrived preselected in Add Reviewer, for the Journal Manager and an assigned Section Editor, on a submission in that section, and "None / Free Form Review" on one in another.

<a id="fn-k"></a>
**k** — Box keys: `manager.sections.form.deactivateSection` (`isInactive`), `manager.sections.submissionReview` "Will not be peer-reviewed" (`metaReviewed`, stored inverted: ticked saves `meta_reviewed = 0`), `manager.sections.abstractsNotRequired`, `manager.sections.submissionIndexing` (`metaIndexed`, inverted), `manager.sections.editorRestriction` (`editorRestricted`; OPS field id `editorRestriction`), `manager.sections.hideTocTitle`, `manager.sections.hideTocAuthor`. New-context section: `ContextService::afterAddContext()` sets `metaIndexed` and `metaReviewed` true and `editorRestricted`, `hideTitle` false (all boxes unticked). Inactive: grid cell actions `activateSection`/`deactivateSection` (OMP `…Series`) in `RemoteActionConfirmationModal`s with `manager.sections.confirmActivateSection` / `confirmDeactivateSection` and the default title `common.confirm` "Confirm", buttons `common.ok` / `common.cancel`; OJS/OPS `deactivateSection()` refuses when the context's active count is not above 1 with an error trivial notification `manager.sections.confirmDeactivateSection.error`; `SectionForm::validate()` adds the same error to `isInactive` when no other section is active. OMP `deactivateSeries()` and `SeriesForm` have no such check. "(Inactive)": `Repo::section()->getSectionList()` feeds OJS and OPS `IssueEntryForm` `sectionId` labels `publication.inactiveSection` "{$section} (Inactive)"; OMP `CatalogEntryForm` labels inactive series `publication.inactiveSeries` "{$series} (Inactive)". Dashboard: `DashboardHandler::getSubmissionFiltersForm()` passes every section of the context. The OPS section page (`SectionsHandler`) does not filter on `is_inactive`. Effects of the other boxes: `metaReviewed` is read only by the Publication Facts Label plugin (`PflPlugin::displayArticlePfl()`) and the native export; `metaIndexed` only by the native export filters (`IssueNativeXmlFilter`, `NativeXmlIssueFilter`), not by the OAI data access objects, the search index or any template (A3); `identifyType` by OJS's `plugins/metadata/dc11/filter/Dc11SchemaArticleAdapter.php` and the MARC templates, and by nothing in OPS, whose `Dc11SchemaPreprintAdapter` writes two fixed types (OPS2, note f-ops2); the abbreviation by `OAIDAO` as the set spec; `hideTitle` by `IssueHandler` and the CSL citation; `hideAuthor` by `article_summary.tpl`; `abstractsNotRequired` and the word count by `Submission\Repository::validateSubmit()` (abstract and plain language summary, `HasWordCountValidation`) and `WorkflowHandler` (`sectionWordLimits`). Live-probed 2026-09-25 (Settings bullets 5, 7, 9, 10), OJS and OPS where the box exists: "Do not require abstracts" ticked let a submission reach "Review" with "Abstract None provided" and be published ("Post the preprint" on a server) with no abstract, and "Title & Abstract" save an empty one; unticked, both refused an empty abstract with "This field is required.". "Will not be peer-reviewed" ticked or not, no article showed a Publication Facts Label, with the label's plugin on or off. "Omit the title…" ticked left the section's block of the issue page and of the home page's current issue without a heading; "Omit author names…" left its articles there without an author line, the article pages unchanged.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Rules 5, 6; Side effects; OMP5), all three apps, two runs: the "Inactive" box asked under "Confirm" "Are you sure you wish to deactivate this section?" (a press the same), "Cancel" left it, "OK" ticked it with "Your changes have been saved."; the ticked box asked "…activate this section?" and "OK" unticked it; the window's box did the same on "Save". An inactive section left the start form for the Author, the Section Editor (Moderator) and the manager, and an Author's draft in it opened "Section Closed"; it stayed in the dashboard filter, opened its page (OPS), read "{section} (Inactive)" on "Publication Settings" ("Preprint entry"), kept its published item in the issue, on the article page, in "Archives" and on the section page, and left the "Submissions" page for a visitor, Reader and Author. A press's inactive series left the wizard's "Series" choice and read "{series} (Inactive)" on "Catalog Entry". On the last active section the box and "OK" left it unticked with "At least one section must be active. Visit the workflow settings to disable all submissions to this journal." ("…to this server."); the window's box and "Save" left the window open with the box ticked and the same sentence as a notice; "Delete" and "OK" kept the row with it. A press deactivated and deleted both its series. No email reached the five scratch users, and a published item's "Activity Log & Notes" gained no entry for a rename, a deactivation or a reactivation.

<a id="fn-l"></a>
**l** — `PKPSectionForm::fetch()` builds `assignableUserGroups` from `UserGroup::query()->withRoleIds([ROLE_ID_MANAGER, ROLE_ID_SUB_EDITOR, ROLE_ID_ASSISTANT])->withStageIds([first stage of Application::getApplicationStages()])` (the Submission stage on OJS and OMP, Production on OPS; comment "see pkp/pkp-lib#10874"), one checkbox per user per group labelled `manager.sections.form.assignEditorAs` "Assign {$name} as {$role}"; heading `manager.sections.form.assignEditors` "Editorial Assignments", description `manager.sections.form.assignEditors.description` (OMP `manager.series.form.assignEditors.description`). `execute()` saves only users who hold a manager, sub-editor or assistant role in the context. Stage sets from `registry/userGroups.xml`: OJS manager (no `stages`, every stage), editor, sectionEditor, guestEditor `1,3,4,5,6`, funding `1,3`, productionEditor `4,5,6`; OMP adds stage 2 and has no Guest editor; OPS manager and sectionEditor `5,6`, editorialBoardMember none. Group names: OJS "Journal manager", "Journal editor", "Section editor", "Guest editor", "Funding coordinator"; OMP "Press manager", "Press editor", "Series editor"; OPS "Preprint Server manager", "Moderator". A category's window on a preprint server offers nobody (Categories OPS1): categories use the Submission stage, sections the first stage.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25 (Fields "Editorial Assignments"; Rule 8), all three apps, as manager on scratch contexts: a journal offered the Journal editor, Section editor, Guest editor and Funding coordinator, and no box for the Journal manager, the Production editor or the Copyeditor (Users & Roles › "Roles": the manager row with every stage box unticked and greyed, the Production editor on Copyediting and Production); a press the Press editor, Series editor and Funding coordinator; a server "Assign admin admin as Preprint Server manager", its manager and the Moderator, not the Editorial Board Member. A user with two offered roles had two boxes. A context whose only staff were managers showed the heading and its sentence with no box. Ticked users read in the "Editors" cell, separated by commas. After a ticked Section editor's role was ended on Users & Roles, the window offered no box for them while the cell still named them; the next "Save" left "None" (or the others), also after a reload. A draft submitted into the section on a scratch journal, press or server arrived with its author as the only participant. On one context seeded with the Production editor's "Permit changes to Settings" unticked, that role was offered; whether saving a role's window on Users & Roles adds the Submission stage was not settled.

<a id="fn-m"></a>
**m** — OMP `controllers/grid/settings/series/form/SeriesForm.php` and `templates/controllers/grid/settings/series/form/seriesForm.tpl`: cover `monograph.coverImage` "Cover Image" (plupload with `mime_types` "jpg,jpeg,png,svg"; `validate()` requires `TemporaryFileManager::getImageExtension()`, which knows gif, jpeg, png, ico and webp but not svg, else `form.invalidImage`, OMP3); current cover `submission.currentCoverImage` "Current Image" with a `deleteCoverImage` link (`common.delete`, confirm `common.confirmDelete`) to `SeriesGridHandler::deleteImage()`; `common.prefix` "Prefix" with `common.prefixAndTitle.tip` "Examples: A, The"; `common.title` "Title" (`FormValidatorLocale`, `manager.setup.form.series.nameRequired`, a key no locale file defines); `common.subtitle` "Subtitle" (`maxlength="255"`); `common.description` "Description"; `manager.series.form.deactivateSeries`, `manager.series.restricted` "Don't allow authors to submit directly to this series."; `catalog.manage.series.issn` "ISSN" with `manager.setup.issnDescription`, `catalog.manage.series.onlineIssn` / `printIssn` (`maxlength="16"`, `FormValidatorISSN` `catalog.manage.series.issn.validation`, equality check `catalog.manage.series.issn.equalValidation`); `catalog.sortBy` "Order of monographs" with `catalog.sortBy.seriesDescription`, options `Repo::submission()->getSortSelectOptions()`, default `getDefaultSortOption()`; categories `grid.category.categories` "Categories" from `Repo::category()->getBreadcrumbs()`, saved with `Repo::section()->addToCategory()` into `series_categories`, which only `SeriesGridHandler` reads back (OMP4); `series.path` "Path" (`maxlength="32"`) with `grid.series.urlWillBe` "The series's URL will be: {$sampleUrl}", `FormValidatorRegExp` `/^[a-zA-Z0-9\/._-]+$/` with `grid.series.pathAlphaNumeric` (OMP2) and a uniqueness check `grid.series.pathExists`; `common.requiredField`. The `featured` value is read but no field posts it, so every save stores it off; nothing reads it. `Section::getLocalizedTitle()` in OMP prefixes `getLocalizedPrefix() . ' '`; `getLocalizedFullTitle()` joins the subtitle with `PKPString::concatTitleFields()` (": ", or a space after "?", "!", "/", "&"). Public series page: OMP `CatalogHandler::series()` (`catalog/series/{path}`), `catalogSeries.tpl`.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25 (Fields "Cover Image", "Order of monographs"; Rule 10; OMP3), OMP, as Press Manager on scratch presses: the file picker accepted ".jpg,.jpeg,.png,.svg"; a PNG uploaded, saved and reopened as the image (text alternative "Current Image", no visible label) with "Delete", which asked under "Confirm" and on "OK" removed it at once, the window staying open. An SVG uploaded; "Save" showed nothing, the window stayed open, and the reopened series had no cover. "Order of monographs" offered the six orders listed and arrived, and reopened, on "Title (A-Z)". The table showed "The K1 Series"; the wizard's choice "The K1 Series: Sub K1"; a series' page, at `catalog/series/{path}` for plain and dotted paths, listed its published book (note f-omp9). Live-probed again 2026-09-25 (Rules 10, 10a, 10b; Settings bullet 15; OMP9), three processes, as visitor, Reader and Press Manager, on a scratch press whose series "K6 Series" had every field set on screen (prefix "The", subtitle "K6 Subtitle", a description, a PNG cover, Online ISSN 0378-5955, Print ISSN 2049-3630, "K6 Cat" ticked, path `k6series`) and held three published books whose dates and series positions make each of the six orders distinct: every field reopened as saved; the table read "The K6 Series", the wizard's choice and each book's page "The K6 Series: K6 Subtitle"; the book pages carried, under the heading "Series", the series' name as a link to `catalog/series/k6series` and the headings "Online ISSN" and "Print ISSN" with the two numbers; the description showed on no series, book, catalog or home page. The scratch press's catalog and home page carried no series link. Path changed to `k6moved`: the new address served the same page, the book pages' link followed it, and the old address opened the page headed "Catalog" with no notice (two processes). The re-drive of the cover (SVG dropped silently; PNG saved; "Delete" asking under "Confirm" and hiding the image at once, no notice, no cover after a reload) and of the six orders matched the above.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Fields "ISSN", "Path"; OMP2, OMP7, OMP8), OMP: "1234" gave "Please enter a valid ISSN.", "0378-5955" in both boxes "Online and print ISSN must not be the same.", both as notices; each ISSN box kept 16 of 17 characters; the link "ISSN International Centre" went to https://www.issn.org, and the paragraph read "…an eight-digit number which identifying periodical publications…". "Path" kept 32 of 33 characters; "new-series.v2" and "a_b/c.D-1" saved as typed; "new series" gave the notice "The series path must consist of only letters and numbers."; a path in use "The series path already exists. Please enter a unique path."; an empty box "This field is required." under it, with nothing sent. The help read "The series's URL will be: http://…/index.php/{press}/en/catalog/series/Path" while "typed-path" was typed and on the saved "new-series.v2".

<a id="fn-n"></a>
**n** — New context: OJS `ContextService::afterAddContext()` creates `section.default.title` "Articles", `section.default.abbrev` "ART", `section.default.policy` "Section default policy"; OPS the same with "Preprints", "PRE" and `section.default.path` "preprints"; OMP's `ContextService` creates no series. The seed renames the first section (`scenarios.md`, bootstrap `sections[]`). Live-probed 2026-09-25 (Rule 1), all three apps: a new journal listed "Articles" ("ART", "Section default policy"), a new server "Preprints" ("PRE", path "preprints", the same policy), a new press "No Items"; inactive rows stayed listed.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-25 (Rules 2, 3; Side effects; OMP6), all three apps: "Create Section" opened an empty window; "Save" showed "Your changes have been saved." and added the row last, active, "None" under "Editors" (with a box ticked, that user), before and after an order was saved. On presses a new series landed first, in the middle and last, once second after an order had been kept; one press kept creation order over four reloads, and there an unchanged "Save" once moved a series last; the wizard's "Series" choice and the "Catalog Entry" list followed the table. "Edit" reopened the saved values; a rename reached the start form, the dashboard filter (OJS, OPS; a press's "Filters" offer no series), "Publication Settings" ("Preprint entry"), the "Submissions" page, the issue's table of contents and article page (OJS), the section page (OPS), and the wizard, "Catalog Entry" and book page (OMP).

<a id="fn-o"></a>
**o** — Order: `OrderGridItemsFeature::saveSequence()` calls `setDataElementSequence()`, which saves `seq` per row (`Repo::section()->edit()`); every section list reads `PKP\section\Collector` ordered by `s.seq`. An issue's table of contents orders by `COALESCE(custom_section_orders.seq, sections.seq)` (`APP\section\DAO::getByIssueId()`).

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 4; Side effects; Settings bullet 16), all three apps, two runs: "Order" turned the arrows into drag handles and added "Done" and "Cancel ordering"; a drag and "Done" kept the order after a reload, with no notice (six presses); "Cancel ordering" put the rows back and saved nothing. The saved order was the order of the start form, the dashboard filter, "Publication Settings", the "Submissions" page and the issue's table of contents (OJS, OPS), and of the wizard's "Series" choice and the "Catalog Entry" list (OMP); "Archives" keeps date order. While ordering, a second "Order" and "Create Section" ("Add Series") opened nothing, a row's "Inactive" box still asked to deactivate, and back from the "Masthead" tab the table was still ordering with the dragged rows; a reload showed the kept order.

<a id="fn-p"></a>
**p** — OJS/OPS `SectionGridRow` `deleteSection` in a `RemoteActionConfirmationModal` with `manager.sections.confirmDelete` "Are you sure you want to permanently delete this section?" and title `grid.action.delete` "Delete", buttons "OK"/"Cancel"; OMP `SeriesGridRow` uses `common.confirmDelete`. `SectionGridHandler::deleteSection()`: `Repo::section()->isEmpty()` (any submission of the context whose publications carry the section, drafts included) else error notification `manager.sections.alertDelete`; then the active count excluding the row if active, error `manager.sections.confirmDeactivateSection.error` when below 1. OMP `deleteSeries()` has the emptiness check and no active-count check. `alertDelete`: OJS "Before this section can be deleted, you must move articles submitted to it into other sections.", OPS "…move preprints posted within it into other section.", OMP "Before this series can be deleted, you must move associated submissions with this series to other series." `Repo::section()->delete()` → the section DAO removes its settings and sub-editor rows. Live-probed 2026-09-25: note td10.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Rule 7; Side effects), all three apps: "Delete" asked under "Delete" "Are you sure you want to permanently delete this section?" ("Are you sure you wish to delete this item? This action cannot be undone." on a press), with "OK" and "Cancel"; "OK" on a section holding a draft, a submitted or a published item kept the row with the app's notice; an empty section, inactive or not, went with no notice; a new section of the same name then read "None" under "Editors". On "Publication Settings" a submitted article not in an issue arrived on "Assign To Current/Back Issue" with no issue, and a "Save" of a new section alone was refused with "Issue: This field is required."; with "Don't Assign To An Issue" it saved. "Preprint entry" and a book's "Catalog Entry" saved the new section or series at once; each emptied old section or series then deleted, and the moved item's participants were unchanged.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 12; A1, A7), OJS and OPS, two runs, on a scratch journal and server with sections "Later", "Open", "Closed" (inactive), "EdOnly" (editor-only) and "Bare" (no policy), "Later" dragged first: after the checklist the blocks read "Later", "Open" for a visitor, Reader, Author, Reviewer and Copyeditor (Editorial Board Member on a server), and "Later", "Open", "Closed", "EdOnly" for the Section Editor, Guest Editor, Editor, Journal Manager and Site Administrator (Moderator, manager and administrator on a server); "Bare" never showed. Every signed-in reader had "Make a new submission to the {section} section." under each block, its link carrying the section's number; a visitor had none. The Author's "Open" link and the Reader's "Later" link opened "Make a Submission" with the three sections open to them and none ticked, as from the top link; the manager's "Closed" link opened it with "Later", "Open", "EdOnly" and "Bare" only. With one section open to the reader the form showed no "Section" choice. On the seeded journal an Author read only the "Articles" block ("Reviews" has no policy); its link opened the form with "Articles" and "Reviews" unticked. A press's page showed no series block for a visitor, an Author, the manager or the administrator.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Rule 13; A8), OJS and OPS, two runs: with the one section editor-only, and with one section inactive and the other editor-only, a visitor and an Author read "This journal is not accepting submissions at this time." ("This server is not accepting submissions at this time.") and no block; the manager read "Make a new submission or view your pending submissions." and the blocks. With "Disable Submissions" ticked, the visitor, the Author and the manager read the notice; the signed-in kept the per-section lines, and a line's link opened "Make a Submission" showing only "This journal is not accepting submissions at this time. Visit the workflow settings to allow submissions.". On a press whose only series was closed to authors, a visitor read "Login or Register to make a submission." and an Author "Make a new submission or view your pending submissions.".

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Rules 14, 15; Settings bullet 17; OPS1, OPS5), OPS, three runs, signed out, as Reader and as manager, on scratch servers: five preprints posted on 1–5 March 2024 in three sections (one inactive) listed newest first, the unposted and the scheduled one absent; with "Items per page" at 2, pages headed "Archives - Page 2" and "Archives - Page 3", page links "1-2 of 5 Next" to "Previous 5-5 of 5", the trail "Home / Archives". The archive header had the search box, which opened the Search page with the words typed, and one link per top-level category ("Applied Science", "Social Sciences"; the child "Computer Science" absent), none on a server without categories; the home page carried the same header above "Latest preprints". A server with nothing posted showed the heading and the header, then no text at all. A typed page 4 of the five at 2 per page showed "Archives - Page 4", the header, no preprints and "Previous 7-6 of 5" ("Previous 76-75 of 5" at 25 per page). "Items per page" at 25 and at 2 changed both pages' lengths at once. The journal and the press answered "404 Not Found" at the same addresses.

<a id="fn-q"></a>
**q** — OPS `SectionsHandler::section()`: path from the address, page number as the second part (a non-number or "1" answers 404; a page past the end 404), sections of the context matched in `seq` order on `path` with `===` (the first match wins, OPS3), published submissions of that section `ORDERBY_DATE_PUBLISHED` descending, `itemsPerPage` per page; unknown path `NotFoundHttpException`. `templates/frontend/pages/sections.tpl`: `<h1>` the title, `getLocalizedDescription()|strip_unsafe_html`, `preprint_summary.tpl` per preprint, `section.emptySection` "Nothing has been posted in this section yet.", pagination; no breadcrumbs include. No template, navigation item type (`NavigationMenuService` has `NMI_TYPE_ARCHIVES` but no section type) or theme links to `preprints/section` (OPS4).

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-25 (Fields "Section URL Path"; Rule 16; Settings bullet 14; OPS3, OPS4), OPS: a new server's section had the path "preprints"; its page was headed with the title, showed "About these preprints" once typed as the archive description, listed its posted preprints newest first, and read "Nothing has been posted in this section yet." with none; an inactive section's page opened; a changed path moved the page and the old address answered "404 Not Found", as did an unknown path, the abbreviation, another letter case, page "1", a page past the end and a non-number. The path box kept all 81 characters typed and saved "preprints" on a second section ("Twin") and "a b/c" on a third; the shared address showed "Preprints" and its preprint with "Preprints" first in the order, and "Twin" and its preprint once "Twin" was ordered first; "a b/c" answered "404 Not Found" typed plain and encoded. No page of the server, signed out or as a Reader, linked to a section's page; Navigation's "Add item" offered no section type, and a "Remote URL" item to the section's address showed in the header and opened it. OJS's section window has no path box.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-25 (Settings bullets 8, 11, 12; A3), OJS and OPS: with "Will not be included in the indexing…" ticked on a section, its article's page carried the same head metadata as a control's, the issue (OPS: "Archives") listed it, the harvested record list and the section's set held its record, and after the background jobs ran the reader's search found it as it found the control. The journal's native export file marked the section `meta_indexed="0"`; the server's export carried no such mark. "K3 Kind Words" typed as "Identify items…" appeared as an extra resource type in the section's harvested records on OJS and on no page of either app; each section was a harvesting set "{journal}:{abbreviation}" named by its title, and no page showed an abbreviation.

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Every scenario runs on its own scratch
context from `POST scenarios/context` (`docs/process/scenarios.md`), with
throwaway `users[]` (password: the username twice, `docs/process/users.md`):
`manager` (the Journal Manager, Press Manager or Preprint Server Manager)
everywhere, an `author` where a scenario names an Author or an article,
and a signed-out visitor in a second browser context; the seeded
journal's sections, series and sub-editor assignments
(`docs/process/seed-facts.md`, "Generated from the seed") are never
touched. A journal's or server's sections come from `sections[]`
(`abbrev`, `title`, `policy`; OPS also `path`), the first entry renaming
the default section. No key sets "Inactive", the editor-only box,
"Section archive Description" or "Review Form", so the scenarios set them
on screen; the one "Editorial Assignments" tick a given holds is the
user's `sections` (sub-editor assignments by abbreviation). A scratch
press has no series and gets them on screen through "Add Series" (the
context scenario answers 400 on `series[]`). Articles come from `POST
scenarios/submission` by the `author`, with `section` (abbreviation),
`submitted: true` and no `issue`. Scenario 1: no `sections[]` (the
journal keeps "Articles", "ART", "Section default policy"; the server
"Preprints", path "preprints"); a `sectionEditor` "Sam Section"
(Moderator on OPS); on OJS an `editor` "Eve Editor", a `productionEditor`
"Pia Production", an `externalReviewer` "Rex Reviewer", `reviewForms: [{title: 'Structured Review', elements:
[{question: 'Comments', type: 'textarea'}]}]` and "Tidal Patterns" in
`ART` taken to Review by `decisions: ['sendExternalReview']`. Scenario 2:
`ART` "Articles", `REV` "Reviews", `ESS` "Essays" (OPS paths `articles`,
`reviews`, `essays`), each with its policy. Scenario 3: `ART` and `REV`
with their policies, "Tidal Patterns" in `REV`. Scenario 4: `ART`, `REV`
and `ESS`, a `sectionEditor` "Sam Section" with `sections: ['ESS']`,
"Tidal Patterns" in `REV`; on OJS `issues: [{volume: 1, number: 1, year:
2026, published: true}]`, without which "Publication Settings" holds no
issue choice and its "Save" asks for none (the issue refusal of Rule 7c
needs an issue to exist; Categories Rule 16c, Publish, schedule & versions Rule 15). Scenario 5: `ART` and `REV` with their policies
and `NOTE` "Notes" with none. Scenario 6 {OPS}: `PRE` "Preprints" (path
`preprints`) and `REV` "Reviews" (path `reviews`); `categories:
[{path: 'applied-science', title: 'Applied Science', children: [{path:
'computer-science', title: 'Computer Science'}]}, {path:
'social-sciences', title: 'Social Sciences'}]`; the three preprints in
`PRE` with `published: true` and `datePublished` `2024-03-01`,
`2024-03-02` and `2024-03-03`. Scenario 7 {OMP}: no series and no
`categories[]`; the visitor and the `author` read About › "Submissions"
while "The Monographs" is the press's only series. The mail catcher is
not read: nothing is emailed (Side effects). Live-probed 2026-09-25:
each state the scenarios start from was reached on a scratch context.

<a id="fn-f-a1"></a>
**f-a1** — The link is `url page="submission" sectionId={id}` (fn e). No part of the start page reads a `sectionId` parameter: `PKPSubmissionHandler` builds `StartSubmission` from the sections alone and OJS/OPS `StartSubmission` sets the radio's `value` to `''`. Live-probed 2026-09-25 (OJS and OPS, two runs): note td11.
Issue report: [pkp-e2e#478](https://github.com/jardakotesovec/pkp-e2e/issues/478) ([docs/issues/U17-A1-section-link-chooses-no-section.md](../issues/U17-A1-section-link-chooses-no-section.md)).

<a id="fn-f-a2"></a>
**f-a2** — `SectionForm::execute()` saves `(int) wordCount`; `Submission\Repository::validateSubmit()` checks `if ($section->getAbstractWordCount())` (true for a negative number) and `HasWordCountValidation::validateWordCount()` compares `$wordCount > $wordLimit` per locale, so any non-empty abstract fails, with `publication.abstract.wordCountLong`; the publication form applies the same limit to the abstract and the plain language summary. Live-probed 2026-09-25 (OJS and OPS): note td3.

<a id="fn-f-a3"></a>
**f-a3** — fn k: `meta_indexed` has no reader outside the native import/export filters, and OPS's native export writes none. Live-probed 2026-09-25 (OJS, OPS): note td16.

<a id="fn-f-a4"></a>
**f-a4** — fn g. `PKP\section\Collector` defines `filterByContextIds`, `filterByTitles`, `filterByAbbrevs`, `excludeEditorOnly`, `excludeInactive`, `withPublished`, `limit`, `offset`; calling an undefined method throws, and `APIHandler` turns the error into a 500 carrying its message. Carried from `docs/tracking/UNASSIGNED.md` (dead-code note 3). Live-probed 2026-09-25, two runs: note g, the filters.

<a id="fn-f-a5"></a>
**f-a5** — fn g; `docs/tracking/UNASSIGNED.md` dead-code note 5 (the mount gap). Live-probed 2026-09-25, two runs: note g, OMP and OPS.

<a id="fn-f-a6"></a>
**f-a6** — fn i and m: `manager.setup.form.section.nameRequired` and `manager.setup.form.series.nameRequired` are defined in no `.po` file of the three apps or `lib/pkp`; the client-side required check does not trim, the server's `FormValidatorLocale` does, and its message goes to the page's notice, not to the field. Live-probed 2026-09-25 (all three apps): note td2.
Issue report: [pkp-e2e#480](https://github.com/jardakotesovec/pkp-e2e/issues/480) ([docs/issues/U17-A6-section-or-component-name-of-spaces-raw-code.md](../issues/U17-A6-section-or-component-name-of-spaces-raw-code.md)).

<a id="fn-f-a7"></a>
**f-a7** — The start page leaves inactive sections out for everyone (`excludeInactive()`, fn d); the "Submissions" page shows them to the editorial roles (`excludeEditorOnly(!$canSubmitAll)`, fn e) with the same signed-in line under each. Live-probed 2026-09-25 (OJS and OPS, two runs): note td11.
Issue report: [pkp-e2e#481](https://github.com/jardakotesovec/pkp-e2e/issues/481) ([docs/issues/U17-A7-A8-section-links-offer-closed-submissions.md](../issues/U17-A7-A8-section-links-offer-closed-submissions.md)).

<a id="fn-f-a8"></a>
**f-a8** — The per-section line prints for any signed-in reader (`{if $isUserLoggedIn}`, fn e), whatever the journal's `disableSubmissions`; the notice comes from the core template on that setting. The start form's message is the Submission wizard's A3. Live-probed 2026-09-25 (OJS and OPS, two runs): note td12.
Issue report: [pkp-e2e#481](https://github.com/jardakotesovec/pkp-e2e/issues/481) ([docs/issues/U17-A7-A8-section-links-offer-closed-submissions.md](../issues/U17-A7-A8-section-links-offer-closed-submissions.md)).

<a id="fn-f-a9"></a>
**f-a9** — fn g: `SectionController::get()` passes `api.sections.404.sectionNotFound` and `api.sections.400.contextsNotMatched` to `__()`, and neither key is defined in any locale file of the OJS checkout or its `lib/pkp` (no `api.sections.*` msgid), so the translator returns the key between `##`. Live-probed 2026-09-25, two runs: note g, one section and the site's address.
Issue report: [pkp-e2e#482](https://github.com/jardakotesovec/pkp-e2e/issues/482) ([docs/issues/U17-A9-sections-interface-refusals-raw-codes.md](../issues/U17-A9-sections-interface-refusals-raw-codes.md)).

<a id="fn-f-a10"></a>
**f-a10** — fn g. A word as the id misses the route's `whereNumber('sectionId')`; `APIHandler` maps only a `NotFoundHttpException` to 404 `api.404.endpointNotFound`, and this route miss arrives as another exception, so it answers 500 with the exception's message (handler-wide by the code; no other interface was driven). At the site's address `getRequest()->getContext()` is null and `getMany()` calls `getId()` on it. Live-probed 2026-09-25, two runs: note g, one section and the site's address; OMP and OPS answered 404 at the same site address.
Issue report for the site's address: [pkp-e2e#479](https://github.com/jardakotesovec/pkp-e2e/issues/479) ([docs/issues/U17-A10-sections-interface-site-address-server-error.md](../issues/U17-A10-sections-interface-site-address-server-error.md)).
Issue report for the word as id, joined to the API-wide unknown-route fault: [pkp-e2e#373](https://github.com/jardakotesovec/pkp-e2e/issues/373) ([docs/issues/U09-A18-picture-over-request-limit-server-error.md](../issues/U09-A18-picture-over-request-limit-server-error.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — fn h, k, m, n, p: OMP's form, grid handler and `ContextService`; OMP's `submissions.tpl` override (fn e). Live-probed 2026-09-25: notes td9, td10, td11, td12.

<a id="fn-f-omp2"></a>
**f-omp2** — fn m. Live-probed 2026-09-25: note td6.
Issue report: [pkp-e2e#483](https://github.com/jardakotesovec/pkp-e2e/issues/483) ([docs/issues/U17-OMP2-path-message-only-letters-and-numbers.md](../issues/U17-OMP2-path-message-only-letters-and-numbers.md)).

<a id="fn-f-omp3"></a>
**f-omp3** — fn m: the picker allows SVG, `validate()` refuses it with `form.invalidImage`, and the save's answer (`{"status":false,"content":""}`) carries no message for the window to show. Live-probed 2026-09-25: note td5.
Issue report: [pkp-e2e#484](https://github.com/jardakotesovec/pkp-e2e/issues/484) ([docs/issues/U17-OMP3-series-svg-cover-dropped-silently.md](../issues/U17-OMP3-series-svg-cover-dropped-silently.md)).

<a id="fn-f-omp4"></a>
**f-omp4** — fn m: `series_categories` is written by `SeriesForm::execute()` and read by `SeriesGridHandler::initialize()` and `SeriesForm::initData()` only. Live-probed 2026-09-25, after the background jobs had run: with "K3 Cat" ticked on a series, its category page read "0 Titles" while the series' page listed the series' book; a category given to a book on its own "Catalog Entry" listed that book ("1 Titles"); the same with the box unticked. The catalog, the book page and the book's "Catalog Entry" categories were unchanged.

<a id="fn-f-omp5"></a>
**f-omp5** — `SeriesGridCellProvider::getCellActions()` uses `manager.sections.confirmActivateSection` / `confirmDeactivateSection`, which OMP's locale does not override. Live-probed 2026-09-25: note td9.
Issue report: [pkp-e2e#485](https://github.com/jardakotesovec/pkp-e2e/issues/485) ([docs/issues/U17-OMP5-series-toggle-asks-about-section.md](../issues/U17-OMP5-series-toggle-asks-about-section.md)).

<a id="fn-f-omp6"></a>
**f-omp6** — OMP's `SeriesForm` sets no place in the order for a new series, where the section form puts a new section last (fn i); the list is read by `seq`, so series sharing a value come back in whatever order the database returns (the test installs run PostgreSQL). Live-probed 2026-09-25 (two presses, several drives): note td7.

<a id="fn-f-omp7"></a>
**f-omp7** — `manager.setup.issnDescription` (fn m). Live-probed 2026-09-25: note td6.
Issue report: [pkp-e2e#486](https://github.com/jardakotesovec/pkp-e2e/issues/486) ([docs/issues/U17-OMP7-series-issn-help-which-identifying.md](../issues/U17-OMP7-series-issn-help-which-identifying.md)).

<a id="fn-f-omp8"></a>
**f-omp8** — OMP `seriesForm.tpl` builds the help from a sample address, `{url … page="catalog" op="series" path="Path"}`, passed to `grid.series.urlWillBe`; the typed or saved path never reaches it. Live-probed 2026-09-25: note td6.
Issue report: [pkp-e2e#487](https://github.com/jardakotesovec/pkp-e2e/issues/487) ([docs/issues/U17-OMP8-series-path-help-never-shows-path.md](../issues/U17-OMP8-series-path-help-never-shows-path.md)).

<a id="fn-f-omp9"></a>
**f-omp9** — OMP `classes/section/DAO.php` `getByPath()` builds the series from `$row->section_id`, a column the series table does not have (its key is `series_id`), so the page gets a series with no data; the probe server logged `PHP Warning: Undefined property: stdClass::$section_id in …/classes/section/DAO.php on line 71` on each such page. The line came with omp `4c2b5d77b` "pkp/pkp-lib#13003 Port batch loading to OMP" (2026-08-26), which changed `fromRow($row)` to `fromRow($row, [$row->section_id], (object) [])`. The cover survives because `image` is a column of the `series` table (`primaryTableColumns`); the title, prefix, subtitle, description, ISSNs and `sortOption` are rows of `series_settings` and are lost, and with no sort option `CatalogHandler::series()` falls back to `ORDERBY_DATE_PUBLISHED` descending. Live-probed 2026-09-25 on the seeded press (read only) and on scratch presses, four chunks: an empty `h1` and last trail step, no description or ISSN; "1 Titles" and the book for a series holding a published book, "0 Titles" and "No titles have been published yet." for one without (the seeded "Monographs" and "Textbooks" as much as a new series). With every field of a series set (note td5): the cover showed, 100×100, from `catalog/thumbnail?type=series&id={id}` (200, image/png), its text alternative a single space and its `.cover` wrapper a `div` carrying an `href` rather than a link; the tab title read "| {press name}" ("| Public Knowledge Press" on the seeded press); each of the six orders saved and reopened as saved, and after each the page listed the books by publication date, newest first; the same page for visitor, Reader and Press Manager. The series window's unique-path check (`SeriesForm`, through `Repo::section()->getByPath()`) goes through the same line: test run 2026-09-25 (Fields "Path"; scenario 7, "A path in use"), seen in two runs, a "Save" with "monographs" in "Path" while another series had it showed "The series path already exists. Please enter a unique path." and logged the same warning on its `update-series` request, which answered 200; the saves with a path no series had logged nothing. A "Save" of a series with its own unchanged path logged it too (two processes, 2026-09-25), so any save whose path finds a series logs it. The screen's refusal is right, so the warning makes no entry of its own. Written up for the team in `docs/reports/2026-09-25-omp-series-page-blank.md` (a temporary report, deleted once addressed; git history keeps it).

<a id="fn-f-ops1"></a>
**f-ops1** — fn f. Live-probed 2026-09-25 on a scratch server, three runs: note td13. The seeded server is not empty once other suites have posted to it.
Issue report: [pkp-e2e#488](https://github.com/jardakotesovec/pkp-e2e/issues/488) ([docs/issues/U17-OPS1-archives-empty-server-says-nothing.md](../issues/U17-OPS1-archives-empty-server-says-nothing.md)).

<a id="fn-f-ops2"></a>
**f-ops2** — OPS `locale/en/manager.po` `manager.sections.identifyTypeExamples` "(For example etc.)". Live-probed 2026-09-25, with OJS's window as the control. OPS `Dc11SchemaPreprintAdapter::extractMetadataFromDataObject()` writes the fixed types `info:eu-repo/semantics/preprint` and `info:eu-repo/semantics/draft` and reads nothing from the section; nothing else in OPS or its lib/pkp reads `identifyType` (ops `512707bc6d`, 2019, took the section's value out of the record and left the box). Walked 2026-10-02 on OPS and OJS `main` and `stable-3_5_0`, default test dataset (Settings bullet 11): "Working Paper" typed in the box of "Preprints" saved ("Your changes have been saved.") and showed again on reopening, and all 17 records of `{server}/oai?verb=ListRecords&metadataPrefix=oai_dc` kept only those two `dc:type` values; the same on OJS's "Articles" added `<dc:type>Working Paper</dc:type>` to its records. Kept script: `shared/playwright/checks/issues/section-type-box-no-examples-no-effect/walk.js`.
Issue report: [pkp-e2e#489](https://github.com/jardakotesovec/pkp-e2e/issues/489) ([docs/issues/U17-OPS2-section-type-box-no-examples-no-effect.md](../issues/U17-OPS2-section-type-box-no-examples-no-effect.md)).

<a id="fn-f-ops3"></a>
**f-ops3** — fn i and q. Live-probed 2026-09-25 (four drives, both orders): note td14.

<a id="fn-f-ops4"></a>
**f-ops4** — fn q. Live-probed 2026-09-25: note td14.

<a id="fn-f-ops5"></a>
**f-ops5** — fn f: `PreprintsHandler::index()` has no past-the-end check, where `SectionsHandler::section()` answers 404 (fn q). Live-probed 2026-09-25, four runs: note td13; on an empty server page 2 read "Previous 26-25 of 0", and page "x" showed page 1 whose "Next" led to page 1 again.
Issue report: [pkp-e2e#490](https://github.com/jardakotesovec/pkp-e2e/issues/490) ([docs/issues/U17-OPS5-archives-page-past-last-not-404.md](../issues/U17-OPS5-archives-page-past-last-not-404.md)).

<a id="fn-f-ops6"></a>
**f-ops6** — OPS `plugins/metadata/dc11/filter/Dc11SchemaPreprintAdapter.php` passes `$publication->getData('abstract')`, null for a preprint without an abstract, to `addLocalizedElements(…, array $localizedValues)`, a TypeError; OJS's adapter casts to `(array)`. The array typing came with ops `25e6954e81` "pkp/pkp-lib#12950 add version relations to OAI DC" (2026-07-07). Live-probed 2026-09-25, two runs: `{server}/oai?verb=ListRecords&metadataPrefix=oai_dc` and the section's set (`…&set={server}:{abbreviation}`) answered 500 with an empty body, the probe server logging "Uncaught TypeError: …Dc11SchemaPreprintAdapter::addLocalizedElements(): Argument #3 ($localizedValues) must be of type array, null given"; the other sections' sets answered 200 with their records; the same case on a journal answered 200 with both records. Written up for the team in `docs/reports/2026-09-25-ops-oai-empty-abstract.md`, deleted with the fix (git history keeps it). Fixed by pkp/ops#1430, the `(array)` cast and `?array`: walked 2026-10-05 at the PR head `113172195a`, before its merge (U19 note f-ops2).

<a id="fn-f-ops7"></a>
**f-ops7** — fn f: `PreprintsHandler::index()` orders by `ORDERBY_DATE_PUBLISHED` (`po.date_published`, a date with no time) with no second key, and each page is its own `LIMIT`/`OFFSET` query, so the database may order tied rows differently on each page. Walked 2026-10-04 on PostgreSQL, OPS `main` (ops `c8af945bb7`, lib/pkp `3dc90c81a6`) and `stable-3_5_0` (ops `38b61882d3`), signed out, on the default test dataset with 272 preprints posted on one day (copies made with the Native XML import): "Archives" ("1-25 of 272") paged with "Next" to the last of 11 pages showed 268 different preprints on main, submission 19 "Finocchiaro: Arguments About Arguments" on pages 1 to 5 and four on no page; 268 of 272 on 3.5 too, submission 11 on five pages. No request failed and no page script failed. A section's page (`SectionsHandler::section()`, note q) orders the same way (code read, not driven). The proposed fix, a last sort key `s.submission_id` in `PKP\submission\Collector`, tried on main, showed 272 of 272. Kept script: `shared/playwright/checks/issues/export-list-repeats-submissions-across-pages/walk.js` (mode `reader`).
Issue report: [pkp-e2e#919](https://github.com/jardakotesovec/pkp-e2e/issues/919) ([docs/issues/U63-A24-export-list-repeats-submissions-across-pages.md](../issues/U63-A24-export-list-repeats-submissions-across-pages.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Sections tab: the table, "Create Section", row "Edit" and "Delete", the "Inactive" box, "Order" {OJS OPS} | Settings › Journal (Server) › "Sections" | AFFM-003, 004, 005, 006, 007 · GRID-079 (OJS) · GRID-106 (OPS) |
| Series tab: "Add Series", row "Edit" (cover "Delete" inside), "Delete", the "Inactive" box, "Order" {OMP} | Settings › Press › "Series" | AFFM-008, 009, 010, 011, 012 · GRID-096 |
| Setup grid base (cover upload) | the series window's uploader | GRID-049 (owned by *Submission intake configuration*, cited) |
| Section / series data (window fields and their stored values) | the section and series windows | SET-023 · SET-033 (OJS) · SET-038 (OMP) · SET-044 (OPS) |
| Per-section policies on the "Submissions" page {OJS OPS} | About › "Submissions" | AFFR-037 |
| "Archives" page {OPS} | main menu "Archives" (`preprints`) | ROUTE-081 · AFFR-079 |
| Archive header: search box (*Search*) and top-level category links {OPS} | "Archives" and the server home page | AFFR-078 · AFFR-027 (archive-header portion) |
| A section's page {OPS} | `preprints/section/{path}` | ROUTE-082 · AFFR-080 |
| Sections programming interface {OJS} | `{journal}/api/v1/sections` | API-034 |
| Legacy start-submission section-policy block (not placed here) | — | AFFW-076 (parked in `docs/tracking/UNASSIGNED.md`) |

## Reference — code anchors

- Grids: `ojs/controllers/grid/settings/sections/{SectionGridHandler,SectionGridRow,SectionGridCellProvider}.php` · the OPS forks of the same three · `omp/controllers/grid/settings/series/{SeriesGridHandler,SeriesGridRow,SeriesGridCellProvider}.php` · `lib/pkp/controllers/grid/settings/SetupGridHandler.php` · `lib/pkp/classes/controllers/grid/feature/{OrderGridItemsFeature,OrderItemsFeature}.php` · `lib/pkp/templates/controllers/grid/common/cell/selectStatusCell.tpl`
- Forms: `lib/pkp/controllers/grid/settings/sections/form/PKPSectionForm.php` · `ojs|ops/controllers/grid/settings/sections/form/SectionForm.php` · `omp/controllers/grid/settings/series/form/SeriesForm.php` · `ojs|ops/templates/controllers/grid/settings/sections/form/sectionForm.tpl` · `omp/templates/controllers/grid/settings/series/form/seriesForm.tpl`
- Model: `lib/pkp/classes/section/{PKPSection,Repository,Collector,DAO}.php` · `ojs|omp|ops/classes/section/{Section,DAO}.php` · `omp/classes/section/Repository.php` · `lib/pkp/schemas/section.json` · `ojs|omp|ops/schemas/section.json` · `ojs|ops/classes/services/ContextService.php::afterAddContext()`
- Settings page: `ojs|omp|ops/templates/management/context.tpl` · `lib/pkp/pages/management/ManagementHandler.php` · `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`
- Reader: `lib/pkp/pages/about/AboutContextHandler.php::submissions()` · `ojs|ops/templates/frontend/pages/submissions.tpl` · `omp/templates/frontend/pages/submissions.tpl` · `lib/pkp/templates/frontend/pages/submissions.tpl` · `ops/pages/preprints/{index,PreprintsHandler,SectionsHandler}.php` · `ops/templates/frontend/pages/{preprints,sections,indexServer}.tpl` · `ops/templates/frontend/components/archiveHeader.tpl` · `ops/classes/security/authorization/OpsServerMustPublishPolicy.php`
- Interface: `lib/pkp/api/v1/sections/SectionController.php` · `ojs/api/v1/sections/index.php`
- Consumers of section settings: `ojs|ops/classes/submission/Repository.php::validateSubmit()` · `lib/pkp/classes/submission/traits/HasWordCountValidation.php` · `ojs|ops/classes/components/forms/submission/{StartSubmission,ReconfigureSubmission}.php` · `lib/pkp/pages/submission/PKPSubmissionHandler.php` · `omp/pages/submission/SubmissionHandler.php::getSubmitSeries()` · `omp/classes/components/forms/submission/ForTheEditors.php` · `ojs|ops/classes/components/forms/publication/IssueEntryForm.php` · `omp/classes/components/forms/publication/CatalogEntryForm.php` · `lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php::initData()` · `ojs/pages/issue/IssueHandler.php` · `ojs/classes/section/DAO.php::getByIssueId()` · `ojs/plugins/generic/pflPlugin/PflPlugin.php` · `ojs|ops/classes/oai/*/OAIDAO.php` · `lib/pkp/classes/components/forms/dashboard/PKPSubmissionFilters.php::addSectionFields()` · `omp/classes/components/forms/dashboard/SubmissionFilters.php` (no series field)
- Locale: `locale/en/{locale,manager,submission,default,author}.po` in each app (OJS and OPS override the section strings; OMP the series strings), `lib/pkp/locale/en/{manager,common,grid,submission}.po`
