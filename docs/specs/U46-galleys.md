---
name: galleys
status: verified
---

# Galleys {OJS OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A galley is the file a reader opens from a published article: the PDF,
the HTML full text, a data set. On a journal the Layout Editor, or a
Journal Manager or Editor, builds an article's galleys once it is ready
for publication: each galley gets a label (usually the file format, such
as "PDF"), a language, and either a file uploaded to it or the address of
a copy hosted elsewhere, and the galleys are put in the order readers will
see them. On a preprint server the Author usually adds the galleys while
submitting, and the Author, a Moderator or the Preprint Server Manager
adjusts them on the preprint's "Galleys" page afterwards. This spec
describes that page and the window its galleys are edited in. <sup>a</sup>

A press installs no galleys: the side menu of a monograph's publication
lists "Publication Formats" and no "Galleys". A press's publication
formats belong to *Publication formats & proof terms* {OMP}. <sup>a</sup>

## Actors & permissions

Everything happens on the publication's **"Galleys" page**: workflow ›
side menu › "Publication" (on a preprint server "Preprint") › the version
› "Galleys". Who is offered the page at all is the workflow screen's rule
([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)):
editorial roles whose role reaches Production, and the Author on their
own submission. The rows below say what each of them is offered once
there. **Manage the galleys** means the whole set: "Add galley", "Order",
and the row menu's "Edit", "Change File" and "Delete". The assignment's
**"Permissions" box** is the one in the participant's assignment that
allows changes to the publication ([Stage participants](U35-stage-participants.md)); **may edit the
preprint** is the publication's edit gate
([→ edit gate](U40-publication-metadata.md#edit-gate)). A Site
Administrator manages the galleys in every journal or preprint server
where they can open the workflow, whatever their role there.
<sup>a</sup> <sup>b</sup> <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the "Galleys" page and its list** | • everyone the side menu offers the page ([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)). They all see the same list (Fields) <sup>a</sup> |
| **Manage the galleys** ("Add galley", "Order", "Edit", "Change File", "Delete") | • Journal: the Journal Manager, Editor, Production Editor and Site Administrator, and every Section Editor, Guest Editor, Layout Editor, Designer, Indexer or Proofreader who reaches the page. The assignment's "Permissions" box plays no part [OPS1](#ops1) <sup>b</sup> <sup>q2</sup><br>• Journal: the Author never; their list has no "Order", no "Add galley" and no row menu <sup>b</sup> <sup>q1</sup><br>• Preprint server: the Preprint Server Manager and the Site Administrator, always <sup>c</sup><br>• Preprint server: a Moderator is offered the whole set. Once the preprint is posted, every assigned Moderator may use it. Before posting, a Moderator whose "Permissions" box is unticked gets "Edit" read-only, a new galley's "Save" refused and "Save Order" ignored, while "Delete" and "Change File" still work ⚠ [OPS2](#ops2) <sup>c</sup> <sup>q3</sup><br>• Preprint server: the Author, while they may edit the preprint (before posting, and only while the Author role's "Permit submission metadata edit." is on, as installed; Settings bullet 4) [OPS1](#ops1). "Change File" works only on a galley whose file they uploaded themselves ⚠ [OPS3](#ops3) <sup>c</sup> |
| **View a galley read-only** (row menu "View") | • Preprint server: the Author, whenever they may not edit the preprint: after posting, or with the edit permission off. "View" is then the row menu's only item, and "Order" and "Add galley" are gone (Rule 7) <sup>c</sup> <sup>q4</sup><br>• Journal: never offered; the Author has no row menu |
| **"More Information"** (row menu) | • the editorial roles of the row "Manage the galleys", on a galley that has a file. Never the Author, not even a preprint's Author who may edit it. The window it opens is *[Submission files](U36-submission-files.md#more-information)*' <sup>a</sup> |
| **Set a galley's identifiers** (the window's "Identifiers" tab) | • Owned by *[Identifiers](U44-identifiers.md)*, which names who may save the tab |

## Fields & validation

<a id="galleys-page"></a>
**The "Galleys" page.** It opens under the heading "Publication: Galleys"
("Preprint: Galleys" on a preprint server) with one table headed
"Galleys". An "Order" button sits above the table, shown to those who
manage the galleys and only while the list has at least one galley (Rule
8). An "Add galley" button sits below it, for the same people. A list
with no galley shows the single line "No Items". <sup>d</sup> <sup>q5</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Name** | — | An icon for the file's type, then the galley's label. While the galley has a file, the label is a link that downloads the file; a galley with no file (a remote galley no file was uploaded to, Rule 4, or one whose upload was never finished, Rule 2b) shows the label as plain text. <sup>d</sup> <sup>q1</sup> |
| **Language** | — | The name of the galley's language, such as "English". <sup>d</sup> |
| **More Actions** | — | The "…" button at the end of the row, which opens the row menu: "Edit" or "View", "Change File", "More Information" and "Delete", as Actors offers them. A row with nothing to offer has no button. <sup>d</sup> |

<a id="galley-window"></a>
**The "Create New Galley" window and the "Edit Metadata" tab.** "Add
galley" opens a window titled "Create New Galley"; a row's "Edit" opens
the same fields in the "Edit Metadata" tab of the galley's window (Rule
6). <sup>e</sup> <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Galley Label** | Yes | Help: "Typically used to identify the file format (e.g. PDF, HTML, etc.)." Any text. Empty, "Save" is refused under the box with "This field is required." and nothing is sent. <sup>f</sup> <sup>q6</sup> |
| **Language** | Yes | A list of the journal's submission languages (Settings bullet 3), plus the submission's own languages and the galley's current one if they are not among them. A new galley arrives on the journal's primary language, whatever the submission's language. <sup>f</sup> <sup>q11</sup> |
| **This galley will be available at a separate website.** | No | A box. Ticking it shows "URL of remotely-hosted content" and hides "URL Path", emptying it; unticking it hides the address box and empties it (Rule 4). <sup>f</sup> |
| **URL of remotely-hosted content** | No | Shown only while the box above is ticked. Any text is kept, whether or not it is a web address ⚠ [A6](#a6). <sup>f</sup> <sup>q9</sup> |
| **URL Path** | No | Help: "An optional path to use in the URL instead of the ID." Shown only while the box above is unticked. Refusals in Rule 5; what it changes for readers in Side effects. <sup>g</sup> |
| **Dependent Files** | — | Only in an HTML galley's "Edit" window, never in "Create New Galley": the list of images and style sheets the page needs, described in *[Submission files](U36-submission-files.md#dependent-files)*. <sup>f</sup> |
| **Save** / **Cancel** | — | "Save" stores the fields and closes the window (Rules 2, 6); "Cancel" closes it and stores nothing. A read-only window greys "Save" and has no "Cancel" (Rule 7). <sup>f</sup> |

**The delete dialog.** Titled "Delete", with the text "Are you sure you
wish to delete this item? This action cannot be undone." and the buttons
"OK" and "Cancel" (Rule 9). <sup>k</sup>

## Rules & state

1. **What a galley is.** A galley has a label, a language, and either a
   file uploaded to it or the address of a copy hosted elsewhere. It
   belongs to one version of the publication: the "Galleys" page lists
   the galleys of the version chosen in the side menu, in their saved
   order (Rule 8). <sup>a</sup> <sup>d</sup>
<a id="add-galley"></a>
2. **Adding a galley.** "Add galley" opens "Create New Galley" (Fields).
   "Save" creates the galley, closes the window, and at once opens the
   upload wizard titled "Upload a File Ready for Publication" for the new
   galley's file. Its first step asks for the file's component, as any
   first upload does
   ([→ the upload wizard](U36-submission-files.md#upload-wizard)). After
   "Complete" the list shows the new row, its label a link to the file.
   <sup>e</sup> <sup>q6</sup>
   - 2a. **"Cancel"** in "Create New Galley" closes it and adds nothing,
     without asking. The window's header "Close" asks first when a field
     was changed (Rule 6a). <sup>e</sup> <sup>h</sup>
   - 2b. **The wizard left unfinished.** The galley exists from the
     moment "Save" was pressed. Closing or cancelling the wizard before a
     file is uploaded leaves a row whose label is plain text and whose menu
     offers "Edit", "Change File" and "Delete" but no "More Information".
     "Change File" then starts the same first upload. <sup>e</sup> <sup>q7</sup>
3. **Replacing the file.** A row's "Change File" opens the upload wizard
   on the galley's current file; what the wizard shows and what "Cancel"
   and "Close" do there is
   *[Submission files](U36-submission-files.md#cancel-restore)*' (its Rule
   9a). After "Complete" the galley's link, and the reader's link once the
   version is published, download the new file; the label is unchanged.
   <sup>e</sup>
4. **Remote galleys.** A **remote galley** is one saved with "This galley
   will be available at a separate website." ticked: it points readers to
   the address in "URL of remotely-hosted content" and has no file. Its
   "Save" in "Create New Galley" still opens the upload wizard, and its
   row menu still offers "Change File" ⚠ [A3](#a3). Its row's label is
   plain text until a file is uploaded to it. After "Change File" ›
   "Complete" the label links to that file and the row menu adds "More
   Information". Its "Edit" still shows the box ticked and the address,
   and the reader's link still goes to the address. <sup>f</sup>
   <sup>p</sup> <sup>q8</sup>
5. **URL Path is checked on "Save".** An empty box is fine. The window
   stays open, nothing is saved, and the reason replaces the help line
   under the box when the path: <sup>g</sup> <sup>q10</sup>
   - is only digits: "The URL path can not be a number.";
   - holds anything but letters and digits joined by single dots, dashes
     or underscores (a space, a "/", a leading or doubled dash): "This may
     only contain letters, numbers, dashes, underscores and periods.";
   - is already the path of another galley of the same version: "The URL
     path has already been used and can not be used again." A galley of
     another version, or of another article, may use the same path.
6. **Editing a galley.** The row menu's "Edit" opens the galley's window,
   headed "Upload a File Ready for Publication" although nothing is
   uploaded there ⚠ [A1](#a1). Its tabs are "Edit Metadata" (Fields) and,
   while the journal gives galleys an identifier (Settings bullets 1 and
   2), "Identifiers", whose contents are
   *[Identifiers](U44-identifiers.md)*'. "Save" stores the tab's fields,
   closes the window, and the row shows the new label and language at
   once, with no notice. <sup>h</sup>
   - 6a. **Leaving with unsaved changes.** After a field is changed,
     moving to the other tab or pressing the window's header "Close"
     first asks "The data on this form has changed. Do you wish to
     continue without saving?". "OK" drops the change and switches the
     tab or closes the window; "Cancel" stays where it was. "Create New Galley"'s header "Close"
     asks the same. The form's own "Cancel" closes without asking and
     stores nothing. <sup>h</sup>
7. **The read-only window.** On a preprint server, "View" opens the same
   window headed "View Galley", with every field greyed out, "Save"
   greyed out and no "Cancel"; its "Identifiers" tab is read-only as
   well. A Moderator refused editing (Actors) gets the same read-only
   fields under the heading "Upload a File Ready for Publication".
   <sup>i</sup> <sup>q3</sup> <sup>q4</sup>
<a id="order"></a>
8. **Ordering.** The list's order is the order readers see (Side
   effects). <sup>j</sup>
   - 8a. **Ordering mode.** "Order" relabels itself "Save Order", and each
     row's "…" button gives way to an up arrow and a down arrow. The up
     arrow of the first row and the down arrow of the last do nothing.
     The arrows carry no name a screen reader can announce ⚠ [A5](#a5).
     There is no "Cancel": "Add galley" stays below the list. <sup>j</sup>
   - 8b. **"Save Order"** stores the order shown, leaves ordering mode,
     and the list keeps that order after a reload. <sup>j</sup>
   - 8c. **Leaving without saving.** Opening another page before "Save
     Order" keeps the earlier order. <sup>j</sup> <sup>q12</sup>
   - 8d. **A new galley** has no place of its own. Until an order is
     saved it may land at the end of the list or at the top; after an
     order has been saved it lands next to the first galley. "Order" ›
     "Save Order" fixes its place. <sup>j</sup> <sup>q12</sup>
   - 8e. **An edit before any order is saved.** While no order has ever
     been saved, "Edit" › "Save" on a galley moves it to the end of the
     list ⚠ [A7](#a7). <sup>j</sup> <sup>q12</sup>
9. **Deleting a galley.** The row menu's "Delete" opens the delete
   dialog (Fields). "OK" closes it and removes the row, with no notice;
   the galley's file and its dependent files are deleted with it.
   "Cancel" closes the dialog and changes nothing. <sup>k</sup>
   <sup>q13</sup>
10. **Publishing changes nothing on this page.** Once the version is
    published (posted), the list, "Order", "Add galley" and every row
    action stay as they were, and the galley's window still saves; only
    who may use them on a preprint server changes (Actors). Every change
    reaches readers at once (Side effects). <sup>l</sup> <sup>q14</sup>
<a id="versions"></a>
11. **A new version starts with copies of the galleys.** "Create New
    Version"
    ([→ Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    its Rule 11) gives the new version a copy of each galley with the
    same label, language, URL path, remote address and order. Each copy
    is then changed or deleted on the new version's "Galleys" page
    without touching the earlier version's list. The copy is not given a
    file of its own, though: it opens the same stored file as the galley
    it was copied from, and "Change File" on either one replaces the
    file of both, the published version's reader download included
    ⚠ [A4](#a4). Deleting the earlier version's galley also reaches the
    copy, which uses its file. On a preprint server the row goes and the copy's
    label turns plain text. On a journal the row goes, but a window
    titled "Error" opens and the copy's label stays a link that no
    longer downloads ⚠ [OJS1](#ojs1). <sup>m</sup> <sup>q15</sup>
12. **The stage does not matter.** The page, its list and every action
    are the same whichever stage the submission is on; a galley can be
    built while the article is still in Review, by whoever the side menu
    offers the page to. <sup>n</sup> <sup>q16</sup>

## Side effects

- **The journal's Production notice.** On a journal, adding a galley, or
  deleting the version's last one, changes the assigned editors' notice
  on the Production entry
  ([→ Production stage, notices](U33-production-stage.md#notices)). A
  preprint server has no such notice. <sup>o</sup>
- **What readers see.** Once the version is published, the article's
  page lists its galleys as links by label, in the order of Rule 8, with
  the galley's language added in brackets when it is not the language
  the reader is browsing in. A galley's reader address ends in its URL
  Path instead of its number when one is set. A remote galley's link
  opens the remote address. Which galleys the page lists, and under which
  heading, is *Article landing page & reading*'s. <sup>p</sup> <sup>q17</sup>
- **Files deleted.** Deleting a galley deletes its file and the file's
  dependent files (Rule 9). <sup>k</sup>
- **No email, no notice.** Adding, editing, ordering or deleting a galley
  sends no email and shows no notice. <sup>o</sup> <sup>q18</sup>
- **Activity Log.** A galley's upload writes the same lines as any file
  upload, into the submission's Activity Log and into the file's "More
  Information" history
  ([→ Submission files](U36-submission-files.md#more-information)).
  Deleting a galley writes 'A file "{file name}" was deleted for
  submission {number} by {username}.' into the Activity Log for its file
  and for each dependent file. Changing a label or the order writes
  nothing. <sup>o</sup> <sup>q18</sup>
- **DOIs.** A journal that gives galleys DOIs assigns them to a version's
  galleys when the version is published (*DOIs*). <sup>o</sup>
- **Search.** A galley's text is never searched
  ([→ Search, A11](U15-search.md#a11)).

## Settings that modify behavior

1. **"Enable for Galleys"** under "Publisher ID" (Settings › Workflow ›
   Submission › "Metadata"). Unticked on a new journal or preprint
   server: the galley's window has the "Edit Metadata" tab alone. Ticked:
   the window gains the "Identifiers" tab (Rule 6), described in
   *[Identifiers](U44-identifiers.md)*. <sup>q</sup>
2. **{OJS} The "URN" plugin with "Galleys" ticked** (Settings › Website ›
   "Plugins", the "URN" row's "Settings"). Off on a new journal. On with
   "Galleys" ticked: the galley's window gains the "Identifiers" tab, as
   in bullet 1. A preprint server installs no URN plugin. <sup>q</sup>
3. **The journal's submission languages** (Settings › Website › Setup ›
   "Languages", the "Submission Languages" list's "Submissions" column).
   A new journal has its primary language alone there, and the
   "Language" list offers that one language. Another language joins the
   "Language" list (Fields) once it is added with "Add/Remove Languages"
   (it arrives with "Submissions" unticked) and then ticked under
   "Submissions". <sup>q</sup> <sup>q11</sup>
4. **{OPS} "Permit submission metadata edit." for the Author role**
   (Settings › Users & Roles › Roles, the Author role's "Edit"). Ticked on
   a new preprint server: the Author manages the galleys of their own
   unposted preprint (Actors). Unticked before the Author submits: the
   Author still adds galleys in the submission wizard's "Upload Files"
   step ("Add File"), and once the preprint is submitted their rows on
   the "Galleys" page offer "View" only (Rule 7). On a journal it changes
   nothing on this page. <sup>q</sup> <sup>q19</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)**:
  who is offered the "Galleys" page, and the page heading and frame.
- **[Publication metadata](U40-publication-metadata.md#edit-gate)**: the
  edit gate a preprint server applies to galleys (Actors).
- **[Submission files](U36-submission-files.md)**: the upload wizard that
  "Add galley" and "Change File" open (its Rules 5 and 9a), the "More
  Information" window (its Rule 13) and the "Dependent Files" list (its
  Rule 11).
- **[Identifiers](U44-identifiers.md)**: the "Identifiers" tab of the
  galley's window, and what a new version's galley copy keeps of it.
- **[Production stage](U33-production-stage.md#notices)**: the journal's
  Production notice that galleys clear and bring back.
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  publishing, and "Create New Version", whose copies Rule 11 describes.
- **[Submission wizard](U21-submission-wizard.md)**: a preprint server's
  "Upload Files" step, where the Author adds the first galleys through
  its own "Add File", on the older galley list that [A1](#a1) and
  [A3](#a3) compare against.
- **[Stage participants](U35-stage-participants.md)**: the assignment's
  "Permissions" box (Actors).
- **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the reader's article page and the galley links on it (Side effects).
- **[DOIs](U45-dois.md)**: galley DOIs.
- **[Issues](U50-issues.md)**: an issue's own galleys, a different form on
  the Issues page.
- **[Search](U15-search.md#a11)**: galley text is not searched.

## Canonical scenarios

Scenarios 1, 5 and 6 run on the seeded journal, press and preprint
server with ready accounts, the others on a scratch journal or
preprint server with throwaway accounts. The footnote holds
accounts, passwords, mail catcher's address and tooling recipe. <sup>s</sup>

1. **Build a galley and its file**

   Given: Journal Manager, on a scratch article with no galley that is
   still in Review (a scratch preprint, on a preprint server).

   - **An empty page, the article still in Review**: open the article's
     workflow, then side menu "Publication" ("Preprint" on a preprint
     server) › the version › "Galleys":
     the page is headed "Publication: Galleys" ("Preprint: Galleys" on a
     preprint server), its table "Galleys" reads "No Items", "Add
     galley" sits below it, and there is no "Order" (Fields, the
     "Galleys" page; Rule 12).
   - **"Create New Galley"**: press "Add galley": a window titled
     "Create New Galley" shows "Galley Label" with the help "Typically
     used to identify the file format (e.g. PDF, HTML, etc.).",
     "Language" set to "English", the box "This galley will be available
     at a separate website." unticked, and "URL Path" with the help "An
     optional path to use in the URL instead of the ID." Tick the box:
     "URL of remotely-hosted content" appears and "URL Path" goes.
     Untick it: the address box goes and "URL Path" is back (Fields).
   - **"Close" and "Cancel"**: type "Draft" in "Galley Label" and press
     the window's header "Close": it asks "The data on this form has
     changed. Do you wish to continue without saving?". Press "Cancel":
     the window stays, "Draft" still typed. Press the form's "Cancel":
     the window closes without asking, and the list still reads "No
     Items" (Rules 2a, 6a).
   - **"Galley Label" left empty**: press "Add galley", then "Save" with
     the label empty: "This field is required." shows under the box and
     the window stays open (Fields).
   - **"Add galley" with a file**: type "PDF" in "Galley Label" and press
     "Save": the window closes and the upload wizard "Upload a File Ready
     for Publication" opens, its first step asking for the file's
     component. Choose "Article Text" ("Preprint Text"), attach
     "article.pdf" ("preprint.pdf") and go on to "Complete" (see
     *[Submission files](U36-submission-files.md#upload-wizard)*): the
     list shows the row "PDF" with "English", and pressing the label
     "PDF" downloads "article.pdf" ("preprint.pdf") (Rule 2; Fields,
     Name).
   - **The row menu**: press the "PDF" row's "…" button: it offers
     "Edit", "Change File", "More Information" and "Delete" (Fields, More
     Actions; Actors rows 2 and 4).
   - **A galley left without a file**: press "Add galley", type "HTML" in
     "Galley Label", press "Save", then the wizard's "Cancel": the list shows a row
     "HTML" whose label is plain text and whose menu offers "Edit",
     "Change File" and "Delete", with no "More Information". Its "Change
     File" opens the upload wizard at the same first step, asking for the
     component; close it with its "Cancel" (Rule 2b).
   - **"Change File"**: on the "PDF" row press "Change File", attach
     "replacement.pdf" and go on to "Complete": the row still reads
     "PDF", and its link now downloads "replacement.pdf" (Rule 3).
   - **Control**: the page now shows "Order" above the list, which the
     empty list did not (Fields, the "Galleys" page). <sup>s</sup>

2. **Edit, order and delete galleys**

   Given: Journal Manager, on a scratch journal whose submission
   languages are English and French (Canada), with a scratch submission
   in English that carries two galleys with files, "PDF" and "HTML", both
   in English.

   - **The "Language" list with a second submission language**: open the
     submission's workflow, then side menu "Publication" › the version ›
     "Galleys", and the "PDF" row's "Edit": "Galley Label" holds "PDF", and "Language" holds "English" and offers
     "English" and "French (Canada)" (Fields, Language; Settings
     bullet 3).
   - **Leaving with unsaved changes**: replace the label with "PDF draft"
     and press the window's header "Close": it asks "The data on this
     form has changed. Do you wish to continue without saving?". Press
     "OK": the window closes and the row still reads "PDF". Open "Edit"
     again, replace the label with "PDF draft" and press the form's
     "Cancel": the window closes without asking, and the row still reads
     "PDF" (Rule 6a).
   - **Edit and save**: open "Edit" again, replace the label with "PDF2",
     choose "French (Canada)" in "Language" and press "Save": the window
     closes, and the row reads "PDF2" and "French (Canada)" at once, with
     no notice (Rule 6).
   - **"URL Path" refusals**: open the "PDF2" row's "Edit", type "pdf" in
     "URL Path" and press "Save": the window closes. Open the "HTML" row's
     "Edit" and press "Save" with each of these in "URL Path": "123"
     shows "The URL path can not be a number." under the box in place of
     its help line; "my galley" shows "This may only contain letters,
     numbers, dashes, underscores and periods."; "pdf" shows "The URL
     path has already been used and can not be used again."; each time
     the window stays open. Type "pdf_v1.x" and press "Save": the window
     closes (Rule 5).
   - **Ordering mode**: press "Order": it now reads "Save Order", each
     row's "…" button gives way to an up arrow and a down arrow, there is
     no "Cancel", and "Add galley" stays below the list. The first row's
     up arrow and the last row's down arrow move nothing (Rule 8a).
   - **Leaving without saving**: press the first row's down arrow: the
     two rows swap. Open "Title & Abstract" from the side menu and come
     back to "Galleys": the rows are in their earlier order (Rule 8c).
   - **"Save Order"**: press "Order", the first row's down arrow and
     "Save Order": the button reads "Order" again and the rows show their
     "…" buttons. Reload the page: the swapped order stays (Rule 8b).
   - **"Delete", then "Cancel"**: on the "HTML" row press "Delete": a
     window titled "Delete" asks "Are you sure you wish to delete this
     item? This action cannot be undone." with "OK" and "Cancel". Press
     "Cancel": the window closes and the row stays (Rule 9).
   - **"Delete", then "OK"**: press "Delete" again, then "OK": the row
     goes, with no notice (Rule 9).
   - **The Activity Log**: open the workflow header's "Activity Log": it
     reads 'A file "article.html" was deleted for submission {number} by
     {username}.' ("preprint.html" on a preprint server), {username}
     being the Journal Manager's (Side effects).
   - **No email**: the mail catcher holds no email to the scratch
     journal's accounts from any of these actions (Side effects).
   - **Control**: the "PDF2" row's link still downloads "article.pdf"
     ("preprint.pdf") (Rule 9). <sup>s</sup>

3. **A published version's galleys, its readers and a new version**

   Given: Journal Manager, on a scratch journal whose submission
   languages are English and French (Canada), with a published scratch
   article in English that carries three galleys: "PDF" (a file,
   English), "HTML" (a file, French (Canada)) and "Remote" (English,
   hosted at "https://example.org/paper").

   - **The published version's page**: open the article's workflow,
     then side menu "Publication" › the published version › "Galleys":
     "Order" sits above the list and "Add galley" below it, and the
     "PDF" row's menu offers "Edit", "Change File", "More Information"
     and "Delete" (Rule 10).
   - **The remote galley**: the "Remote" row's label is plain text and
     its menu has no "More Information". Its "Edit" shows "This galley
     will be available at a separate website." ticked, "URL of
     remotely-hosted content" holding "https://example.org/paper", and no
     "URL Path". Untick the box: the address box goes and "URL Path"
     appears. Tick it again: the address box is back, empty. Press the
     form's "Cancel" and open "Edit" again: the box is ticked and the
     address reads "https://example.org/paper" (Rules 4, 6a; Fields).
   - **A URL Path and an order on the published version**: open the
     "PDF" row's "Edit", type "pdf" in "URL Path" and press "Save": the
     window closes. Press "Order", arrange the rows as "Remote", "PDF",
     "HTML" with the arrows and press "Save Order" (Rules 8b, 10).
   - **The reader's page**: open the published article's page on the
     journal's public site: its galley links read "Remote", "PDF" and
     "HTML (French (Canada))", in that order. The "PDF" link's address
     ends in "pdf" and the "HTML" link's in a number; the "Remote" link
     opens "https://example.org/paper" (Side effects, "What readers
     see").
   - **A change reaches readers at once**: on "Galleys" open the "PDF"
     row's "Edit", replace the label with "PDF (corrected)" and press
     "Save". Reload the article's page: the link reads "PDF (corrected)"
     (Rule 10).
   - **The new version's copies**: press "Create New Version" in the side
     menu and confirm the dialog unchanged (see
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*,
     scenario 4). The new version's "Galleys" page (side menu › the new
     version › "Galleys") lists "Remote", "PDF
     (corrected)" and "HTML" in that order, with the same languages. The
     "Remote" row's "Edit" holds "https://example.org/paper", and the
     "PDF (corrected)" row's "Edit" holds "pdf" in "URL Path" (Rule 11).
   - **Changing the copies**: on the new version open the "PDF
     (corrected)" row's "Edit", replace the label with "PDF v2" and press
     "Save": the window closes,
     the path "pdf" accepted though the published version's galley has
     it. Delete "Remote" with "Delete" › "OK": the row goes (Rules 5,
     11).
   - **The earlier version untouched**: choose the published version in
     the side menu, then "Galleys": it still lists "Remote", "PDF
     (corrected)" and "HTML", in that order (Rules 1, 11).
   - **Control**: the article's page still reads "Remote", "PDF
     (corrected)" and "HTML (French (Canada))" (Rule 11; Side effects).
     <sup>s</sup>

4. **The Layout Editor builds, the Author reads** {OJS}

   Given: a Layout Editor and a Section Editor assigned to a scratch
   article in Production, the Section Editor's "Permissions" box
   unticked, and the article's Author.

   - **The Layout Editor**: open the article's workflow, then side menu
     "Publication" › the version › "Galleys": it reads "No Items", with "Add galley" below. Press "Add galley", type "PDF"
     in "Galley Label", press "Save", choose "Article Text" as the
     component, attach "article.pdf" and go on to "Complete": the row
     "PDF" appears with "English", "Order" shows above the list, and the
     row's menu offers "Edit", "Change File", "More Information" and
     "Delete" (Actors row 2; Rule 2).
   - **The Section Editor without "Permissions"**: the Section Editor
     opens the same page and the "PDF" row's "Edit", replaces the label
     with "PDF (final)" and presses "Save": the window closes and the row
     reads "PDF (final)" (Actors row 2; [OPS1](#ops1)).
   - **The Author**: the Author opens the article with "View" on My
     Submissions, then side menu "Publication" › the version ›
     "Galleys": the row "PDF (final)" with "English", its label
     downloading "article.pdf"; there is no "Order", no "Add galley" and
     no "…" button on the row (Actors rows 2–4).
   - **Control**: the Layout Editor's page, opened the same way, showed
     "Order", "Add galley" and the row's "…" button (Actors row 2).
     <sup>s</sup>

5. **No galleys on a press** {OMP}

   Given: Press Manager, with a scratch monograph on the seeded press.

   - **The publication's side menu**: open the monograph's workflow,
     then side menu "Publication" › the version: its pages include no
     "Galleys" (Purpose).
   - **Control**: the same list of pages offers "Publication Formats"
     (Purpose). <sup>s</sup>

6. **The preprint's Author before and after posting** {OPS}

   Given: an Author with two preprints on the seeded preprint server, one
   not yet posted with no galley and one posted that carries a galley
   "PDF", and the Preprint Server Manager.

   - **The Author, before posting**: the Author opens the unposted
     preprint with "View" on My Submissions, then side menu "Preprint" ›
     the version › "Galleys": it reads "No Items", with "Add galley"
     below. Press "Add galley", type "PDF" in "Galley Label", press
     "Save", choose "Preprint Text" as the component, attach
     "preprint.pdf" and go on to "Complete": the row "PDF" appears, its
     label downloading "preprint.pdf", and "Order" shows above the list
     (Actors row 2; Rule 2).
   - **The Author's row menu**: the row's "…" button offers "Edit",
     "Change File" and "Delete", and no "More Information" (Actors rows 2
     and 4).
   - **"Change File" on the Author's own galley**: press "Change File",
     attach "replacement.pdf" and go on to "Complete": the "PDF" link now
     downloads "replacement.pdf" (Actors row 2; Rule 3).
   - **"Edit"**: open "Edit", replace the label with "PDF (author)" and
     press "Save": the row reads "PDF (author)" (Actors row 2; Rule 6).
   - **The Author, after posting**: on the posted preprint's "Galleys"
     page there is no "Order" and no "Add galley", and the "PDF" row's
     menu offers only "View". "View" opens a window headed "View Galley"
     with every field greyed out, "Save" greyed out and no "Cancel"
     (Actors row 3; Rule 7).
   - **Control**: the Preprint Server Manager opens the posted preprint's
     "Galleys" page: it shows "Order" and "Add galley", and the "PDF"
     row's menu offers "Edit", "Change File", "More Information" and
     "Delete" (Actors row 2; Rule 10). <sup>s</sup>

7. **A Moderator's galleys and the "Permissions" box** {OPS}

   Given: a Moderator assigned to three preprints on a scratch preprint
   server, each carrying a galley "PDF": two not yet posted, the
   assignment's "Permissions" box ticked on one and unticked on the
   other, and one posted, with the box unticked.

   - **"Permissions" ticked, before posting**: open the first preprint's
     workflow, then side menu "Preprint" › the version › "Galleys", and
     the "PDF" row's "Edit"; replace the label with "PDF2" and press
     "Save": the window closes and the row reads "PDF2" (Actors row 2).
   - **"Permissions" unticked, before posting**: on the second preprint
     the "PDF" row's "Edit" opens the window with every field greyed out,
     "Save" greyed out and no "Cancel" (Actors row 2; Rule 7;
     [OPS2](#ops2)).
   - **"Permissions" unticked, after posting**: on the posted preprint
     open the "PDF" row's "Edit", replace the label with "PDF posted" and
     press "Save": the window closes and the row reads "PDF posted"
     (Actors row 2; Rule 10).
   - **Control**: the first preprint's "Edit" window, opened the same
     way, let its fields be changed and had "Save" and "Cancel" (Actors
     row 2). <sup>s</sup>

8. **The Author role without "Permit submission metadata edit."** {OPS}

   Given: an Author and the Preprint Server Manager, on a scratch
   preprint server whose Author role has "Permit submission metadata
   edit." unticked.

   - **A galley added in the submission wizard**: the Author starts a
     new submission; on the wizard's "Upload Files" step they press "Add
     File", give the galley the label "PDF", upload "preprint.pdf" (see
     *[Submission wizard](U21-submission-wizard.md)*, scenario 15) and
     submit (Settings bullet 4).
   - **The "Galleys" page after submitting**: the Author opens the
     preprint with "View" on My Submissions, then side menu "Preprint" ›
     the version › "Galleys": the row "PDF" is listed, there is no
     "Order" and no "Add galley", and the row's menu offers only "View"
     (Actors row 3; Rule 7; Settings bullet 4).
   - **Control**: the Preprint Server Manager opens the same page: it
     shows "Order" and "Add galley", and the "PDF" row's menu offers
     "Edit", "Change File", "More Information" and "Delete" (Actors
     row 2). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for OPS2 (issue report
    `docs/issues/U46-OPS2-moderator-galleys-offered-then-refused.md`):
    before posting, a Moderator whose assignment has "Permissions" unticked
    edits a galley, adds one and saves an order, and each change holds after
    a reload (or, if the team rules the box binds, the page offers that
    Moderator "View" only)
  - the guard for OPS3 (issue report
    `docs/issues/U46-OPS3-author-galley-change-file-refused.md`): before
    posting, the Author offered the galleys sees "Change File" on a galley
    whose file they uploaded and not on one whose file the Preprint Server
    Manager uploaded
  - the guard for A7 (issue report
    `docs/issues/U46-A7-galley-format-moves-in-list-when-saved.md`): with no
    order ever saved, "Edit" › "Save" on the first of three galleys leaves
    the list and the public page in the order the galleys were added
- **Nothing new to test**:
  - a new galley's place in the list, before and after a saved order
    (Rule 8d)
  - the unsaved-changes question on a switch to the "Identifiers" tab,
    which needs galley identifiers switched on (Rule 6a; Settings
    bullets 1 and 2)
  - the Production Editor, Designer, Indexer and Proofreader, offered
    what the Layout Editor of scenario 4 is, and a Guest Editor with
    "Permissions" unticked, offered what the Section Editor of scenario
    4 is (Actors row 2)
  - a Site Administrator whatever their role in the journal or preprint
    server, offered what the Journal Manager of scenario 1 is (Actors,
    opening paragraph; Actors row 2)
- **Register carries it**:
  - OPS2 (a Moderator without "Permissions" offered "Add galley" and
    "Save Order" that do not hold, while "Delete" and "Change File"
    work; Actors row 2; scenario 7 passes it)
  - OPS3 (the preprint's Author offered "Change File" on a galley whose
    file someone else uploaded; Actors row 2)
  - A3 (a remote galley sent to the upload wizard and offered "Change
    File"; Rule 4)
  - A6 (any text kept as the remote address; Fields, the galley window)
  - A1 (the "Edit" window headed as an upload; Rule 6)
  - A7 (an edit moving a galley to the end of the list before any order
    is saved; Rule 8e)
  - A5 (the ordering arrows unnamed for screen readers; Rule 8a)
  - A4 (a new version's copy sharing the published galley's file;
    Rule 11)
  - A4 and OJS1 (deleting the published version's galley after a new
    version copied it; Rule 11)
- **Owned by another feature**:
  - the roles the side menu does not offer the page (Actors row 1;
    *Workflow screen & stage access*, scenario 4)
  - the "Identifiers" tab of the galley's window (Actors row 5; Rule 6;
    *Identifiers*, scenarios 1 and 7)
  - "Enable for Galleys" ticked (Settings bullet 1; *Identifiers*,
    scenario 1)
  - the "URN" plugin with "Galleys" ticked {OJS} (Settings bullet 2;
    *Identifiers*, scenarios 4 and 5)
  - the journal's Production notice (Side effects; *Production stage*,
    scenario 6)
  - the "Dependent Files" list of an HTML galley (Fields, the galley
    window; *Submission files*, scenario 5)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A galley's "Edit" window is headed "Upload a File Ready for Publication" | 🐞 | minor | — |
| [A3](#a3) | A remote galley is still sent to the upload wizard and offered "Change File" | 🐞 | minor | — |
| [A4](#a4) | A new version's galley shares its file with the published version's galley | 🐞 | user-visible | — |
| [A5](#a5) | The ordering arrows have no names for screen readers | 🐞 | minor | — |
| [A6](#a6) | "URL of remotely-hosted content" keeps text that is not a web address | 🐞 | minor | — |
| [A7](#a7) | Until an order is saved, editing a galley moves it to the end of the list | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OJS1](#ojs1) | Deleting a published galley that a new version copied fails with an error | 🐞 | user-visible · crash: both | — |
| [OPS2](#ops2) | Before posting, a Moderator without "Permissions" cannot edit, add or reorder the galleys the page offers | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OPS3](#ops3) | A preprint's Author is offered "Change File" on every galley and refused on files others uploaded | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [OPS1](#ops1) | On a preprint server galley editing follows the publication's edit permission; on a journal, Production access | ✅ | — | — |
| [A2](#a2) | Retired: the galley window's "Close" was thought to drop unsaved changes without asking | ✅ | retired | — |

### All apps

<a id="a1"></a>
**A1 — The edit window is headed as an upload** · 🐞 · minor.
A galley's "Edit" opens a window headed "Upload a File Ready for
Publication", the same heading as the upload wizard, although the window
holds only the galley's label, language, address, URL Path and
identifiers (and, for an HTML galley, its Dependent Files) and uploads
nothing of the galley's own file. The older galley list, still the one
in a preprint server's submission wizard, heads it "Edit a Layout
Galley"; the heading was lost when the workflow's galley page was
rebuilt.
Since: 2024-09-19 (the rebuilt workflow's galley list) · Basis: probe, 2026-09-24. <sup>f-a1</sup>

<a id="a3"></a>
**A3 — A remote galley is asked for a file** · 🐞 · minor.
A galley saved in "Create New Galley" with "This galley will be available
at a separate website." ticked needs no file, yet "Save" opens the upload
wizard for it exactly as for a file galley, and its row keeps offering
"Change File". A file uploaded there turns the row's label into a link
to it, but it never reaches readers, whose link goes to the remote
address. The older galley list, still the one in a preprint server's
submission wizard, asks for a file only when the galley has neither a
file nor an address, and offers no file upload on a remote galley.
Since: 2024-09-19 · Basis: probe, 2026-09-24. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A new version's galley shares the published file** · 🐞 · user-visible.
After "Create New Version", the new version's galley opens the same
stored file as the published version's galley it was copied from. An
editor who uses "Change File" on the draft version's galley, expecting to
prepare the next version, replaces the file readers download from the
published version at once. On a preprint server, deleting the published
version's galley deletes the file the draft's copy uses (on a journal
that delete fails, [OJS1](#ojs1)). A version's other files (its JATS
XML, its media) are copied as files of their own.
Basis: probe, 2026-09-24. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The ordering arrows are unnamed** · 🐞 · minor.
In ordering mode each galley row shows an up and a down arrow that carry
no text and no label, so a screen reader announces two unnamed buttons
per row, with nothing to say which galley they move or in which
direction. The Contributors list's arrows read "Increase position of
{name}" and "Decrease position of {name}".
Basis: probe, 2026-09-24. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The remote address is not checked** · 🐞 · minor.
"URL of remotely-hosted content" keeps whatever is typed, such as
"example" or "www.example.org" without "https://", and the reader's link
for the galley then lands on the journal's own "404 Not Found" page. The
galley's own data rules call for a web address, but the window never
applies them.
Basis: probe, 2026-09-24. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — An edit moves a galley to the end of the list** · 🐞 · medium.
An editor who has never pressed "Save Order" expects the "Galleys" list
to keep its order when a galley is edited. Instead "Edit" › "Save" moves
the edited galley to the end: Alpha, Beta, Gamma become Beta, Gamma,
Alpha1 once Alpha's label is changed. The same looseness puts a new
galley at the end of the list or at the top (Rule 8d). Once an order is
saved, an edit keeps the galley's place.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — Deleting a published galley that a new version copied fails** · 🐞 · user-visible · crash: both.
After "Create New Version", an editor who deletes the published
version's galley ("Delete" › "OK") expects the row to go. The app fails
instead: a window titled "Error" reads "An unexpected error has
occurred. Please reload the page and try again." The galley is gone from
the published version anyway, and readers lose its link. The new
version's copy keeps its label as a link, and pressing it fails with a
server error instead of downloading the file. A published galley that no
version copied, and the copy itself, delete cleanly; on a preprint
server the same delete works ([A4](#a4)).
Basis: probe, 2026-09-24. <sup>f-ojs1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Galley editing follows the publication's edit permission** · ✅ · intended divergence.
On a preprint server the galleys are the Author's to manage while they
may edit the preprint, and a Moderator's right to change them before
posting follows their assignment's "Permissions" box; after posting, the
Preprint Server Manager and every assigned Moderator may change them and
the Author may only view them. On a journal the galleys are production
work: every role that reaches the "Galleys" page may change them,
whatever its "Permissions" box, and the Author never may. Intended: the
preprint server has no layout staff, and its Author was given the
galleys deliberately.
Since: 2025-05-28 (editing kept open after posting), 2026-07-27 (the
Author's offer) · Basis: commit, 2026-09-24. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — Before posting, a Moderator without "Permissions" cannot edit, add or reorder the galleys the page offers** · 🐞 · medium.
On a preprint server, a Moderator whose assignment on the preprint has
"Permissions" unticked (the box that allows changes to the publication)
is offered the whole "Galleys" page before the preprint is posted: "Add
galley", "Order", and "Edit", "Change File", "More Information" and
"Delete" on each galley. Three of them fail. "Edit" opens the galley's
window with every field and "Save" greyed out. A new galley's "Save"
greys the "Create New Galley" window out, shows no message and adds
nothing; at the next page load (a reload, say) a notice reads "This
galley can not be edited because it has already been published." "Save
Order" puts the old order back at once, with no message. "Change File"
and "Delete" work for the same Moderator, and once the preprint is
posted everything on the page does. Basis: probe, 2026-10-02.
<sup>f-ops2</sup>

<a id="ops3"></a>
**OPS3 — A preprint's Author is offered "Change File" on every galley and refused on files others uploaded** · 🐞 · low.
On a preprint server, the Author who may edit their preprint (their
assignment has "Permissions" ticked, as installed, and the preprint is
not yet posted) is offered "Change File" on every galley. On a galley
whose file someone else uploaded (the Preprint Server Manager, a
Moderator), it opens "Upload a File Ready for Publication" showing only
"The current role does not have access to this operation.", and the
galley keeps its old file. On a galley whose file the Author uploaded,
"Change File" works. Nothing is lost, and the galley's file can still be
replaced another way. Basis: probe, 2026-10-02. <sup>f-ops3</sup>

### Retired

<a id="a2"></a>
**A2 — "Close" drops unsaved changes without asking** · ✅ · retired. Overturned by the drive of 2026-09-24: the header "Close" asks as a tab switch does (Rule 6a). <sup>f-a2</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 at the checkouts' tips: ojs `71bb244152`, ops
`07141ae4df`, omp `a36551804`, each on lib/pkp `25182919bf` and
ui-library `1afd40a9`. The ui-library's `managers/GalleyManager/` is one
shared copy; the server side is two app-side copies (OJS
`controllers/grid/articleGalleys/`, OPS `controllers/grid/preprintGalleys/`),
diffed line by line: they differ only where notes b, c, e and f say.
Every claim was then driven on 2026-09-24 on scratch journals and
preprint servers, as the roles each note names, with a scratch press as
the control for OMP's absence; notes q1 to q19 held the author's open
questions before the drive and now record what the screens showed.

<a id="fn-a"></a>
**a** — The page: `workflowConfigEditorialOJS.js` and
`workflowConfigAuthorOJS.js` `PublicationConfig.galleys` mount
`GalleyManager` with `canCurrentUserEditPublication:
permissions.canEditPublication` (the publication's
`canCurrentUserChangeMetadata`); OPS inherits both through
`useWorkflowConfigOPS()`'s `deepMerge` and overrides neither. The menu
item `galleys` (`submission.layout.galleys` "Galleys") is pushed by
`useWorkflowNavigationConfig{OJS,OPS}.js` under `canAccessProduction` in
the editorial view and unconditionally in the author view; OMP's
navigation has no `galleys` item (its `WorkflowPageOMP.vue` imports the
component but no OMP config mounts it; U36's probe of 2026-09-23 saw
"Publication Formats" and no "Galleys" on a press). "More Information":
`useGalleyManagerConfig.getItemActions()` adds `galleyMoreInfo` only when
`galley.submissionFileId` is set and the action is permitted; the Author's
action lists never include it. The window is
`FileInformationCenterHandler::viewInformationCenter` at the Production
stage, titled `informationCenter.informationCenter` + ": " + the label.

<a id="fn-b"></a>
**b** — Journal gate. Client: `getGalleyManagerConfiguration()` gives
`ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN` and
`ROLE_ID_ASSISTANT` every action but `galleyView`, and `ROLE_ID_AUTHOR`
`galleyList` alone outside OPS; `getManagerConfig()` keeps an action when
`hasCurrentUserAtLeastOneAssignedRoleInStage(submission, PRODUCTION,
roles)` (the stage's `currentUserAssignedRoles`, which carries a manager's
role unassigned). Server: `ArticleGalleyGridHandler` grants the edit
operations to the same four roles and never to `ROLE_ID_AUTHOR`;
`canEdit()` is `canUserAccessStage(PRODUCTION)`, with no publication
status and no metadata permission in it, so every role that passes
`WorkflowStageAccessPolicy(PRODUCTION)` gets an editable form. OJS roles
whose default stage set includes Production (`registry/userGroups.xml`):
Editor, Production Editor, Section Editor, Guest Editor (manager or
sub-editor level), Designer, Indexer, Layout Editor, Proofreader
(assistant level). U44's drive of 2026-09-24 saw an assigned Section
Editor save a galley's "Identifiers" tab with "Permissions" unticked.
Site Administrator: live-probed 2026-09-24 on OJS and OPS, `admin`
whose only role in the context was Copyeditor (OJS) or Editorial Board
Member (OPS), the manager role removed on screen, got "Order", "Add
galley" and the full row menu; "Edit" › "Save" held and "Add galley" ›
"Save" reached the upload wizard, on OPS before and after posting.

<a id="fn-c"></a>
**c** — Preprint server gate. Client: `getAuthorActions()` returns, on
OPS, every action but "More Information" and "View" when
`canCurrentUserEditPublication`, else `galleyList` + `galleyView`
(ui-library `e26e36b6`, 2026-07-27, pkp/pkp-lib#13039); the editorial
roles get the journal's set whatever their assignment. Server:
`PreprintGalleyGridHandler` grants every operation to
`ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT` and
`ROLE_ID_AUTHOR`; its `canEdit()` is true for a site administrator,
then, on a published version, only for a manager or sub-editor, then
for a submission not yet submitted, then when
`Repo::submission()->canEditPublication()` holds. OPS's Author group has
`permitMetadataEdit="true"` and its Moderator (sub-editor) group too
(`registry/userGroups.xml`); OPS has no assistant group with a stage.
`canEdit()` feeds `editGalleyTab`/`updateGalley` (the form's
`$isEditable`) and `initFeatures()` (ordering), and not `addGalley`'s
form or `deleteGalley`. U44's drive of 2026-09-24 saw a Moderator with
"Permissions" unticked get the "Identifiers" tab read-only before
posting, and the Author's row menu read "View" after posting.

<a id="fn-d"></a>
**d** — `GalleyManager.vue` (`PkpTable`, label
`submission.layout.galleys` "Galleys"; top controls
`GalleyManagerSortButton`, bottom controls `GalleyManagerActionButton`
`grid.action.addGalley` "Add galley"); columns from
`useGalleyManagerConfig.getColumns()`: `common.name` "Name"
(`GalleyManagerCellName.vue`: `FileTypeIcon` by
`galley.file.documentType`, the label in an `<a target="_blank">` to
`galley.file.url` when present, plain text otherwise), `common.language`
"Language" (`GalleyManagerCellLanguage.vue`:
`submission.metadataLocales[galley.locale]`), and a screen-reader-only
`common.moreActions` "More Actions" column whose `DropdownActions`
renders only when `itemActions.length`. Empty body: `TableBody.vue`
`grid.noItems` "No Items". scenarios.md's parity note of 2026-09-23: a
galley row reads "<label> <language>".

<a id="fn-e"></a>
**e** — Adding: `galleyManagerStore.galleyAdd()` →
`useGalleyManagerActions.galleyAdd()` opens the legacy `addGalley`
operation titled `submission.layout.newGalley` "Create New Galley"; on
close, when `closeData.dataChanged[0]` (the id that `updateGalley`
returns through `DAO::getDataChangedEvent($galley->getId())`) is set, it
calls `galleyChangeFile()` with that id, which opens
`FileUploadWizardHandler::startWizard` titled `submission.upload.proof`
"Upload a File Ready for Publication" with `fileStage` proof, the galley
as association, and `revisedFileId` + `revisionOnly` only when the galley
already has a `submissionFileId`; otherwise the wizard's
`SubmissionFilesUploadForm` requires a component
(`submission.upload.noGenre` "Missing or invalid component!"). The
wizard's close runs `triggerDataChange()`, reloading the list. The
galley row is inserted by the form's `execute()` before the wizard
opens. The legacy grid's `fetchRow()` instead raised its upload event
only for a galley with neither `urlRemote` nor a file. OPS's legacy
grid titles the same operation `common.addFile` "Add File" (the
submission wizard's list); the workflow page uses the ui-library's
"Add galley" / "Create New Galley" on both apps.

<a id="fn-f"></a>
**f** — The form: `ArticleGalleyForm` / `PreprintGalleyForm` and
`articleGalleyForm.tpl` / `preprintGalleyForm.tpl` (identical but for
ids): `submission.layout.galleyLabel` "Galley Label" (required, help
`submission.layout.galleyLabelInstructions`), `common.language`
"Language" (select from the context's
`getSupportedSubmissionLocaleNames()` + the submission's
`getPublicationLanguageNames()` + the galley's own, sorted by locale
code, preselected `$locale|default:$formLocale`; live-probed 2026-09-24,
note q11: a new galley preselects the context's primary language,
whatever the submission's language, in the English and the French
interface alike), the checkbox
`submission.layout.galley.remotelyHostedContent` "This galley will be
available at a separate website." with `submission.layout.galley.remoteURL`
"URL of remotely-hosted content", `publication.urlPath` "URL Path" (help
`publication.urlPath.description`), the dependent-files grid when
`Repo::submissionFile()->supportsDependentFiles()` holds for the galley's
file, and `fbvFormButtons` "Save"/"Cancel" with `submitDisabled` and
`hideCancel` both bound to `$formDisabled`. The toggling is
`RepresentationFormHandler.js` (`toggleRemote_()` empties `urlPath` on
tick and `urlRemote` on untick; `#remote` shown only for a remote galley
on load). Server checks: label required (OJS message
`editor.issues.galleyLabelRequired` "An issue galley label is
required."; OPS `editor.submissions.galleyLabelRequired`, a key with no
English text), a locale among the submission's publication languages,
CSRF; the template marks the label `required`, so the client check
("This field is required.") fires first. `urlRemote` gets no check in
the form; the schema's `url` rule (`schemas/galley.json`) is applied only
by the API. The tab handler's changed-data check (`form.dataHasChanged`)
runs on a tab switch; the header "Close" asks the same question
(note h).

<a id="fn-g"></a>
**g** — `ArticleGalleyForm::validate()` (OPS copy identical): digits only
→ `publication.urlPath.numberInvalid` "The URL path can not be a
number."; `Repo::galley()->getByUrlPath($path, $publication)` finding
another galley of the same publication →
`publication.urlPath.duplicate` "The URL path has already been used and
can not be used again."; the regex `^[a-zA-Z0-9]+([.\-_][a-zA-Z0-9]+)*$`
→ `validator.alpha_dash_period` "This may only contain letters, numbers,
dashes, underscores and periods.". A refused save re-renders the form
with the field error in place of the box's help line; no "Errors
occurred processing this form" notice shows (live-probed 2026-09-24,
note q10).

<a id="fn-h"></a>
**h** — Editing: `galleyEdit()` opens the legacy `editGalley` operation
titled `submission.upload.proof`; `editGalley()` renders
`editFormat.tpl`, a tab set with `grid.action.editMetadata` "Edit
Metadata" (`editGalleyTab`) and, when `enableIdentifiers` (publisher IDs
on for `galley`, or a pub-id plugin with
`isObjectTypeEnabled('Representation')`), `submission.identifiers`
"Identifiers". `updateGalley()` answers with a data-changed event; the
list reloads through `triggerDataChange()`; no notification is sent.
Live-probed 2026-09-24 (Rules 2a, 6a), OJS and OPS: after a typed
label, or the remote box ticked, the header "Close" asked the same
question as a tab switch, in "Edit" and in "Create New Galley"; "OK"
closed the window with nothing sent and the old label kept. The form's
"Cancel" closed without asking and sent nothing. Rule 6's "Save"
showed the new label ("PDF2") and language ("French (Canada)") at once,
with no notice 3 seconds later.

<a id="fn-i"></a>
**i** — `galleyView()` opens the same `editGalley` operation titled
`submission.layout.viewGalley` "View Galley" (the app's locale); the
form arrives with `$formDisabled` true because `canEdit()` is false,
which greys every field and "Save" and hides "Cancel", and a forced save
is refused with `galley.cantEditPublished` "This galley can not be
edited because it has already been published.".

<a id="fn-j"></a>
**j** — `GalleyManagerSortButton.vue`: `grid.action.order` "Order" /
`grid.action.saveOrdering` "Save Order", shown by `getTopItems()` when
the action is permitted and `galleys.value.length`;
`GalleyManagerCellActions.vue` swaps the row's `DropdownActions` for
`TableCellOrder` (two icon-only `<button>`s, `ChevronUp` /
`ChevronDown`, no text or aria-label) while `sortingEnabled`;
`useOrdering()` works on a copy, `moveUp()`/`moveDown()` stop at the
ends, `saveSorting()` posts the id list to the legacy `saveSequence`
and leaves ordering mode; its `cancelSorting()` is not wired to any
control. The server stores the order through `OrderGridItemsFeature`,
which `initFeatures()` adds only when `canEdit()`; without it
`saveSequence` answers success and stores nothing. The list is read
with `Collector::getMany()` ordered by `seq` alone. Every new galley,
seeded or added on screen, is stored at position 0 (read in the database
on 2026-09-24), and a saved order numbers the galleys from 0, so
galleys sharing a position come in whatever order the database returns
(Rules 8d, 8e).

<a id="fn-k"></a>
**k** — `galleyDelete()`: `openDialog` titled `common.delete` "Delete",
message `common.confirmDelete`, actions `common.ok` "OK" (warnable) and
`common.cancel` "Cancel"; "OK" posts `deleteGalley`, which checks only
the CSRF token, calls `Repo::galley()->delete()` (deleting every
submission file associated with the galley, whose own deletion takes its
dependent files), deletes the galley's notifications and, on a journal
in Copyediting or Production, updates the production notices.

<a id="fn-l"></a>
**l** — ui-library `2a64c475` (2025-05-28, pkp/pkp-lib#10263 "Relax
editing metadata on published/posted materials") removed
`actionsRequiresUnpublishedState` (add, change file, delete, sort
withheld on a published version); OJS `canEdit()` ignores the status;
OPS `canEdit()` narrows a published version to managers, sub-editors and
the site administrator. Seen in passing on 2026-09-23 on OJS and OPS: a
published (posted) version's galley menu still offered "Edit", "Change
File", "More Information" and "Delete", and the "Edit" window kept its
fields and "Save" enabled.

<a id="fn-m"></a>
**m** — OJS and OPS `classes/publication/Repository::version()` clone
each galley with a new id and publication id and keep
`submissionFileId` (clearing `doiId` only for a major version with DOI
versioning on); lib/pkp `Repository::version()` copies the JATS file
(`versionSubmissionFile()`) and the media files as new submission files,
not the galley files. `SubmissionFilesUploadForm::execute()` revises by
editing the same submission-file row (`fileId`, name, uploader), so both
galleys serve the new file; `Repo::galley()->delete()` deletes files by
`assocId` = the galley's id, which the copy's file row carries only for
the original galley.

<a id="fn-n"></a>
**n** — The grid's `WorkflowStageAccessPolicy` asks for access to the
Production stage, not for the submission to be there; the page itself
follows the side menu's rules (note a). The notice update in `deleteGalley()`
and `updateGalley()` runs only when the submission sits in Copyediting
or Production.

<a id="fn-o"></a>
**o** — No `Mail::send`, `SubmissionLog` or `EventLog` call in either
grid handler or form; `DAO::getDataChangedEvent()` carries no
notification. Notices: `NOTIFICATION_TYPE_ASSIGN_PRODUCTIONUSER` and
`NOTIFICATION_TYPE_AWAITING_REPRESENTATIONS` (OJS), the latter alone
(OPS, which shows no notice box). DOIs: `Repository::publish()` mints a
galley DOI through `Repo::doi()->mintGalleyDoi()` for each galley
without one when galley DOIs are enabled.

<a id="fn-p"></a>
**p** — Reader side (not this spec's screen): `ArticleHandler` /
`PreprintHandler` split a published version's galleys into primary and
supplementary by the file's component, skip a galley with neither a
file nor `urlRemote`, and redirect a remote galley's view and download
to `urlRemote` before any file is read; `frontend/objects/galley_link.tpl`
builds the address from `Galley::getBestGalleyId()` (the URL Path when
set, else the id) and the text from `getGalleyLabel()`, which appends
" ({language name})" when the galley's locale differs from the page's.

<a id="fn-q"></a>
**q** — Settings. Bullet 1: each app's `MetadataSettingsForm`
`enablePublisherId` value `galley` (U44's Settings). Bullet 2: the URN
plugin's `isObjectTypeEnabled('Representation')`, `enableRepresentationURN`
(OJS and OMP only; OPS has no `plugins/pubIds`). Bullet 3:
`PKPContextService::add()` sets `supportedSubmissionLocales` to the
default submission locale when none is given; the form's language list
reads it (note f). Bullet 4: the role's `permitMetadataEdit`, copied
into each new stage assignment as `canChangeMetadata` (U40's edit gate).

<a id="fn-s"></a>
**s** — Scenario seeding. Scenarios 1, 5 and 6 run on the seeded
journal, press and preprint server (`publicknowledge`, primary language
English) with ready accounts, passwords as users.md gives them:
`manager.maya` (scenarios 1 and 5, and scenario 6's control) and
`author.alex` (scenario 6, the submitter; the seeded preprint server
keeps the Author role's "Permit submission metadata edit." ticked, as
installed). Scenarios 2, 3, 4, 7 and 8 run on their own scratch context
from `POST scenarios/context`, with throwaway `users[]` (password: the
username twice): `manager` and `author` everywhere, plus `layoutEditor`
and `sectionEditor` (scenario 4, OJS) and `sectionEditor`, the
Moderator (scenario 7, OPS). Scenarios 2 and 3 seed
`context.supportedSubmissionLocales: ['en', 'fr_CA']` (Settings
bullet 3); scenario 8 seeds `roles: {author: {permitMetadataEdit:
false}}` (Settings bullet 4). Scratch submissions come from `POST
scenarios/submission`: galleys from `galleys[]`, each `{label, locale,
file}` or `{label, locale, urlRemote}`, `file` the app's fixture
(`article.pdf`, `article.html` on OJS; `preprint.pdf`, `preprint.html`
on OPS), scenario 3's "HTML" with `locale: 'fr_CA'` and "Remote" with
`urlRemote: 'https://example.org/paper'`; a published or posted version
from `published: true`; the stage from `decisions` (scenario 1 on OJS
`['sendExternalReview']`, scenario 4 `['sendExternalReview', 'accept',
'sendToProduction']`; scenario 2 seeds none); assignments from
`participants[]` with `canChangeMetadata` (`false` for scenario 4's
Section Editor and for scenario 7's second and third preprints). Each
seeded galley's file is uploaded as `admin`, so the Author's "Change
File" in scenario 6 runs on the galley the Author adds on screen (OPS3),
and seeded galleys all share one position, so no scenario reads a list's
order before an order is saved (A7). No key sets a galley's URL Path
(typed on screen) or makes a second version: scenario 3 uses "Create New
Version". Scenario 5's monograph is a scratch submission of the seeded
press, which has none; `galleys` on OMP is refused ("OMP has
publication formats, not galleys"). The replacement file is the fixture
`replacement.pdf`. Mail is read in the mail catcher (Mailpit,
`http://127.0.0.1:8025`), scoped by the scratch context's addresses; a
seeded submission's own emails never reach it. In the scenarios
{number} is the submission's number and {username} the signed-in
account's username.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-24 (Actors rows 2–3; Fields, Name), OJS:
the Author's "Galleys" page, empty or filled, had no "Order", no "Add
galley" and no row button, also on a journal whose Author role had
"Permit submission metadata edit." ticked. Pressing the "PDF" label
downloaded the file and left an empty new tab, for the Author as for the
Journal Manager (OJS and OPS); nothing refused it.

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-24 (Actors row 2), OJS: the Journal
Manager, the unassigned Editor, the assigned Production Editor, Section
Editor and Guest Editor (both with "Permissions" unticked), Layout
Editor, Designer, Indexer, Proofreader and `admin` each got "Order",
"Add galley" and the row menu "Edit", "Change File", "More Information",
"Delete" ("Edit", "Change File", "Delete" on a remote galley), and each
one's "Edit" › "Save" held after a reload. The Section Editor, the
Layout Editor and the Production Editor also added a galley with a file,
saved an order, changed a file and deleted a galley; each held after a
reload. An assigned Copyeditor, whose role has no Production stage, got
no "Galleys" in the side menu.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-24 (Actors row 2; Rule 7; OPS2), OPS, in
four runs across two sessions: a Moderator with "Permissions" unticked
on an unposted preprint was offered "Order", "Add galley" and "Edit",
"Change File", "More Information", "Delete". "Edit" opened "Upload a
File Ready for Publication" with every field and "Save" greyed and no
"Cancel". "Add galley" › "HTML2" › "Save" sent one save, then showed the
window with every control greyed and no message; no galley was added.
"Order" › down arrow › "Save Order" put the old order back at once and
after a reload. "Change File" with `replacement.pdf` › "Complete" served
the new file; "Delete" › "OK" removed the row. Once the preprint was
posted, the same Moderator's "Edit" › "Save" stored "PDF posted" and the
whole set held. Control: a Moderator with "Permissions" ticked had the
whole set before posting.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-24 (Actors row 3; Rule 7), OPS: after
posting, and before posting with the Author role's permission unticked,
the Author's page had no "Order" and no "Add galley", and the row menu
read "View" alone. "View" opened "View Galley" with every field greyed,
"Save" greyed and no "Cancel", and only the "Edit Metadata" tab at the
install defaults; with "Enable for Galleys" ticked, its "Identifiers"
tab was read-only too, with its "Save" greyed.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-24 (Fields, the "Galleys" page), OJS and
OPS: the heading read "Publication: Galleys" / "Preprint: Galleys"
(shown in capitals), above one table captioned "Galleys". With no galley
the table read "No Items", "Order" was absent and "Add galley" present,
for every editorial role and for the preprint's Author before posting;
the journal's Author got neither button.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-24 (Rule 2; Fields), OJS and OPS: "Create
New Galley" showed the Galley Label (with its help and asterisk),
Language, the remote box and URL Path. "Save" with the label empty
showed "This field is required." under the box and sent nothing. "PDF" ›
"Save" opened "Upload a File Ready for Publication" (steps "1. Upload
File", "2. Review Details", "3. Confirm"), step 1 asking "Select article
component" (OJS) or "Select preprint component" (OPS). After "Complete"
the row read "PDF | English", its label a link serving the file, with
the menu "Edit", "Change File", "More Information", "Delete".

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-24 (Rule 2b), OJS and OPS: closing the
upload wizard with its header "Close", or with its "Cancel", before
uploading left an "Unfinished" row with a plain-text label and the menu
"Edit", "Change File", "Delete". "Change File" on it opened step 1 with
the component list.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-24 (Rule 4; A3), OJS and OPS: ticking
the box hid "URL Path" and emptied it. "Save" with
"https://example.org/paper" opened the upload wizard; closed without a
file, the row "Remote" was plain text with "Edit", "Change File",
"Delete". After "Change File" › a PDF › "Complete" the label linked to
the file and the menu added "More Information", while "Edit" still
showed the box ticked and the address. Once published, the reader's
"Remote" link redirected to https://example.org/paper.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-24 (Fields; A6), OJS and OPS:
"www.example.org" and "example" were saved in "Create New Galley" and in
"Edit", and "Edit" reopened with "example". Once published, the reader's
link redirected to the bare text under the article's own address
(`…/article/view/508/example`, OPS `…/preprint/view/297/example`),
which showed the journal's or server's "404 Not Found".

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-24 (Rule 5), OJS and OPS: "123" gave the
number message; "my galley", "pdf-", "-pdf", "pdf--x" and "a/b" gave the
letters message; "pdf_v1.x" and an empty box were accepted; "pdf" on a
second galley of the same version gave the duplicate message. Each
refusal kept the window open and showed the message under the box in
place of the help line, with nothing at the top of the window. Another
article's galley accepted "pdf", and so did a new version's copy, which
arrived already carrying it.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-24 (Fields, Language; Settings bullet 3),
OJS and OPS: a new context offered "English" alone. French (Canada),
added with "Add/Remove Languages", arrived unticked and joined the list
once ticked under "Submissions"; unticked again, an English submission's
"Create New Galley" offered English alone, while a French galley's
"Edit" and a French submission still offered French. A French (Canada)
submission in an English-primary context preselected "English", in the
English and the French interface; with French primary, English and
French submissions both preselected "French (Canada)". A galley saved in
French read "French (Canada)" in its row.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-24 (Rules 8a–8e; A7), OJS and OPS: with
"PDF" moved down, opening "Metadata" and coming back, or reloading,
showed PDF, HTML again, out of ordering mode, with no question. Before
any saved order a new "XML" landed last on OJS and first on OPS; on a
published version a new "HTML" did the same, and on OPS new galleys
landed last in four other runs. After a saved order, a new "EPUB"
landed second on both apps. With no order saved, Alpha, Beta, Gamma
became Beta, Gamma, Alpha1 after Alpha's "Edit" › "Save", and each
further edit moved its galley to the end the same way. The reader's
page was not read in that state.

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-24 (Rule 9; Side effects), OJS and OPS:
"Cancel" changed nothing, also after a reload. "OK" removed the row with
no notice. The preview's "PDF" reader address and its download, served
before, answered "not found" (404) afterwards. An HTML galley's
dependent image, served before, stopped downloading once the galley was
deleted, and the Activity Log recorded its deletion.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-24 (Rule 10), OJS and OPS: on a published
(posted) version, the Journal Manager, Section Editor and Layout Editor
(OJS) and the Preprint Server Manager and assigned Moderator (OPS) kept
"Order", "Add galley" and the full row menu, and the "Edit" window kept
its fields and "Save" enabled. "Edit" › "PDF (corrected)" › "Save"
showed "PDF (corrected)" on the article page opened at once; a saved
order and an added galley also showed there at once.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-24 (Rules 1, 11; A4; OJS1), OJS and OPS:
version 1 was set to Remote, HTML (French (Canada)), PDF (with a URL
Path), in that order. "Create New Version" gave version 1.1 the same
three rows, order, languages, URL Path and address; relabelling and
deleting on 1.1, or adding an "EPUB" there, left version 1's list as it
was. The copy's label link carried the same file: "Change File" on the
copy made both versions and the published reader download serve
`replacement.pdf`, and "Change File" on the published galley did the
same for the copy. Deleting the copy, or a published galley no version
copied, left everything else intact. Deleting the published galley
after the copy was made: on OPS the row went and the copy's label turned
plain text with "Edit", "Change File", "Delete"; on OJS see note f-ojs1.
The JATS XML (OJS) and media files were copied as files of their
own.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-24 (Rule 12), OJS: on an article in Review
and one in Submission, the unassigned Editor and the assigned Section
Editor got "Galleys" with "No Items" and "Add galley", and completed
"Add galley" › "PDF" › "Save" › the wizard's "Complete". Control: an
unassigned Layout Editor typing the page's address got an "Error" window
reading "The current role does not have access to this operation." A
preprint server's only stage is Production.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-24 (Side effects, What readers see), OJS
and OPS: the links read by label in list order. On the English page the
French galley read "HTML (French (Canada))"; on the French page the
others read "PDF (anglais)" and "Remote (anglais)" and the French one
"HTML". The HTML galley's address ended in "/html-fr", the others in
their number; the remote galley's view and download redirected to its
address.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-24 (Side effects), OJS and OPS: adding,
editing, ordering and deleting galleys sent no email to any user of the
context (control: the on-screen publish delivered "Publication
Published" to the Author) and showed no notice. The Activity Log gained
the upload's 'Revision "article.pdf" was uploaded for file {number}.'
and 'The metadata for file "article.pdf" was edited by {username}.'
lines and the delete's 'A file "article.pdf" was deleted for submission
{number} by {username}.', naming the account's username; a label or
order change added none.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-24 (Settings bullet 4), OPS: with the
Author role's permission unticked before submitting, the Author added a
PDF galley in the submission wizard's "Upload Files" step with "Add
File"; once submitted, their rows read "View" only, with no "Add galley"
and no "Order". On a journal with it ticked, the Author still had no
controls.

<a id="fn-f-a1"></a>
**f-a1** — `useGalleyManagerActions.galleyEdit()` titles the modal
`submission.upload.proof`; the legacy `ArticleGalleyGridRow` /
`PreprintGalleyGridRow` titled it `submission.layout.editGalley` "Edit a
Layout Galley" (or "View Galley"). `GalleyManager.vue` first appears in
ui-library `f77229c3` (2024-09-19, "Initial Workflow side modal
implementation"). Live-probed 2026-09-24 on OJS and OPS: every "Edit"
was headed "Upload a File Ready for Publication", for the Journal
Manager, Section Editor, Layout Editor, the Moderator and the preprint's
Author; an HTML galley's window carried the "Dependent Files" list with
its own "Upload File". A preprint server's submission wizard, which
still shows the legacy grid, headed its "Edit" "Edit a Layout Galley"
and its add window "Add File".

<a id="fn-f-a2"></a>
**f-a2** — Retired. Live-probed 2026-09-24 (note h), OJS and OPS: the
header "Close" asked "The data on this form has changed. Do you wish to
continue without saving?" in "Edit" and in "Create New Galley". The
draft's reading of the legacy modal's close button, and an earlier
sighting in passing, did not match a deliberate drive.

<a id="fn-f-a3"></a>
**f-a3** — `galleyAdd()` chains `galleyChangeFile()` on any
`dataChanged[0]`; `getItemActions()` adds "Change File" with no check of
`urlRemote`. The legacy grid (`ArticleGalleyGridHandler::fetchRow()`
raising `uploadFile` only for a galley with neither `urlRemote` nor a
file; `ArticleGalleyGridRow` adding its upload action only when
`!urlRemote`) did both checks. The reader's redirect to `urlRemote`
(note p) wins over any file. Live-probed 2026-09-24 (note q8); the
submission wizard's legacy grid on OPS opened no upload wizard for a
remote galley and gave its row "Edit" and "Delete" only.

<a id="fn-f-a4"></a>
**f-a4** — Note m. The earlier version's galley file keeps
`assocId` = the earlier galley. Live-probed 2026-09-24 (note q15).

<a id="fn-f-a5"></a>
**f-a5** — `TableCellOrder.vue` (note j). The Contributors list's
arrows carry screen-reader text (*Contributors & affiliations*, Rule
6). Live-probed 2026-09-24 on OJS and OPS: the galley arrows read as
`button: img` in the accessibility tree; the Contributors arrows as
"Increase position of Ava Author" / "Decrease position of Ava
Author".

<a id="fn-f-a6"></a>
**f-a6** — `ArticleGalleyForm` / `PreprintGalleyForm` add no check for
`urlRemote`; `schemas/galley.json` gives it `validation: ["url"]`, used
by `Repo::galley()->validate()`, which the grid never calls.
Live-probed 2026-09-24 (note q9).

<a id="fn-f-a7"></a>
**f-a7** — Note j: every galley shares position 0 until an order is
saved, so the database's own order decides the list. Live-probed
2026-09-24 (note q12) on OJS and OPS, the same on both.
Issue report: [pkp-e2e#617](https://github.com/jardakotesovec/pkp-e2e/issues/617) ([docs/issues/U46-A7-galley-format-moves-in-list-when-saved.md](../issues/U46-A7-galley-format-moves-in-list-when-saved.md)).

<a id="fn-f-ojs1"></a>
**f-ojs1** — Live-probed 2026-09-24 (note q15), twice on OJS: the
delete request answered a server error (500 on
`…/grid/article-galleys/article-galley-grid/delete-galley`; the server
log read a database refusal on deleting the shared file,
`publication_galleys_submission_file_id_foreign`), then the page's
script failed ("Cannot read properties of null (reading 'status')").
The copy's label link, `…/api/file/file-api/download-file`, answered
500 ("File N is not a revision of submission file M" in the server log),
and its menu still offered "More Information". OPS ran the same steps
with no error. Controls on both apps: a published galley no version
copied, and the copy itself, deleted cleanly.

<a id="fn-f-ops1"></a>
**f-ops1** — Notes b, c and l: OPS `PreprintGalleyGridHandler::canEdit()`
(`7d9c84e9b6`, 2025-05-28, pkp/pkp-lib#10263; `ab4b990d96`, 2026-09-08,
pkp/pkp-lib#13109) and ui-library `e26e36b6` (2026-07-27,
pkp/pkp-lib#13039: "galleys should be editable by author in OPS if he got
the permission"), against OJS's stage-access `canEdit()`.

<a id="fn-f-ops2"></a>
**f-ops2** — Note c: the client offers a sub-editor every action
whatever `canCurrentUserEditPublication`; the server's `canEdit()` then
disables the form, refuses `updateGalley` for a new galley with
`galley.cantEditPublished`, and leaves the ordering feature out, so
`saveSequence` answers success and stores nothing (note j), while
`deleteGalley` and the upload wizard do not consult `canEdit()`.
Live-probed 2026-09-24 (note q3): the refused new galley's window
showed no message, neither the `galley.cantEditPublished` text nor any
other.
Issue report: [pkp-e2e#613](https://github.com/jardakotesovec/pkp-e2e/issues/613) ([docs/issues/U46-OPS2-moderator-galleys-offered-then-refused.md](../issues/U46-OPS2-moderator-galleys-offered-then-refused.md)).

<a id="fn-f-ops3"></a>
**f-ops3** — Note c: the Author's row menu offers "Change File" from
the edit permission alone; the refusal comes from the upload wizard.
Live-probed 2026-09-24, OPS, three runs: "Change File" on a seeded
galley (its file uploaded as `admin`) and on a galley the Preprint
Server Manager added on screen opened the wizard showing only "The
current role does not have access to this operation.", and the galley
still served `preprint.pdf`. Control: on a galley the Author added,
"Change File" with `replacement.pdf` › "Complete" served the new
file.
Issue report: [pkp-e2e#614](https://github.com/jardakotesovec/pkp-e2e/issues/614) ([docs/issues/U46-OPS3-author-galley-change-file-refused.md](../issues/U46-OPS3-author-galley-change-file-refused.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Galleys" page, its list and columns | workflow › "Publication" / "Preprint" › version › "Galleys" | AFFW-419 · VUE-040 |
| "Order" / "Save Order" | above the list | AFFW-524 |
| "Add galley" → "Create New Galley" | below the list | AFFW-525 · GRID-068 · GRID-101 |
| Up and down arrows | the list in ordering mode | AFFW-526 |
| The label's file link | a row's "Name" | AFFW-527 |
| Row "Edit" / "View" | a row's "…" menu | AFFW-528 |
| Row "Change File" | a row's "…" menu | AFFW-529 |
| Row "More Information" | a row's "…" menu | AFFW-530 |
| Row "Delete" and its dialog | a row's "…" menu | AFFW-531 |
| Galley window tabs "Edit Metadata", "Identifiers" {OJS} | row "Edit" | AFFW-735 · AFFW-736 |
| "Edit Metadata" form, "Save" / "Cancel" {OJS} | the window's first tab | AFFW-737 |
| Remote-content box and address {OJS} | the same tab | AFFW-738 |
| "Dependent Files" list {OJS} | the same tab, an HTML galley | AFFW-739 |
| Galley window tabs {OPS} | row "Edit" / "View" | AFFW-752 |
| "Edit Metadata" form, "Save" / "Cancel", remote box, "Dependent Files" {OPS} | the window's first tab | AFFW-753 |
| The galley's stored fields | — | SET-030 · SET-042 |

The legacy galley grids' own rendering (their list, row menu and "Add
galley" link) is reached by no current screen on a journal; on a
preprint server it survives only as the submission wizard's "Upload
Files" list (*Submission wizard*). Recorded in UNASSIGNED.md.

## Reference — code anchors

- Vue page: `lib/ui-library/src/managers/GalleyManager/` — `GalleyManager.vue`, `GalleyManagerCellName.vue`, `GalleyManagerCellLanguage.vue`, `GalleyManagerCellActions.vue`, `GalleyManagerSortButton.vue`, `GalleyManagerActionButton.vue`, `galleyManagerStore.js`, `useGalleyManagerActions.js`, `useGalleyManagerConfig.js`; `lib/ui-library/src/composables/useOrdering.js`; `lib/ui-library/src/components/Table/TableCellOrder.vue`, `TableBody.vue`
- Workflow mounts: `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`, `workflowConfigAuthorOJS.js`, `useWorkflowConfigOPS.js`; `useWorkflowNavigationConfig/useWorkflowNavigationConfig{OJS,OPS}.js`; `useWorkflowPermissions.js`
- Legacy grids and forms: `ojs/controllers/grid/articleGalleys/{ArticleGalleyGridHandler,ArticleGalleyGridRow,ArticleGalleyGridCellProvider}.php`, `form/ArticleGalleyForm.php`; `ops/controllers/grid/preprintGalleys/{PreprintGalleyGridHandler,PreprintGalleyGridRow,PreprintGalleyGridCellProvider}.php`, `form/PreprintGalleyForm.php`; `templates/controllers/grid/{articleGalleys,preprintGalleys}/editFormat.tpl`, `form/{articleGalleyForm,preprintGalleyForm}.tpl`; `lib/pkp/js/controllers/grid/representations/form/RepresentationFormHandler.js`; `lib/pkp/classes/controllers/grid/feature/OrderGridItemsFeature.php`
- Model: `lib/pkp/classes/galley/{Galley,Repository,Collector,DAO}.php`; `ojs/schemas/galley.json`, `ops/schemas/galley.json`; `ojs|ops/classes/publication/Repository.php` (`version()`, `delete()`, DOI minting)
- Upload: `lib/pkp/controllers/wizard/fileUpload/form/SubmissionFilesUploadForm.php` (revision path)
- Reader: `ojs/pages/article/ArticleHandler.php`, `ops/pages/preprint/PreprintHandler.php`, `templates/frontend/objects/galley_link.tpl`
- Unreached: `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php` (`representationsGridUrl`), `ojs|ops/pages/authorDashboard/AuthorDashboardHandler.php` and `ops/pages/workflow/WorkflowHandler.php` (`_getRepresentationsGridUrl()`)
