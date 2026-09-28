---
name: chapters-work-type
status: verified
---

# Chapters & work type {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A press publishes two kinds of book: a **monograph**, written as a whole
by its authors, and an **edited volume**, whose chapters each have their
own authors. The book's **work type** records which of the two it is. Any
book, of either type, can carry a **chapter list**: for each chapter its
title, subtitle, abstract and pages, its authors (picked from the book's
contributors), the book files that hold it, whether it gets a page of its
own for readers, and, when the book allows it, its own publication date
and, on an edited volume, its own license. The author starts the list
while submitting; press staff keep it current on the workflow's
"Chapters" page and change the work type from the workflow's header. What
readers then see (the table of contents on the book's page, each
chapter's own page, the chapter authors there) belongs to *Monograph
landing page* (no spec yet); a chapter's DOI belongs to
[DOIs](U45-dois.md). <sup>a</sup>

A journal and a preprint server do not install chapters or a work type.
Their submission wizard asks for no "Submission Type" and its Details step
has no "Chapters" section; their workflow lists no "Chapters" page under a
version, its header has no work-type control, and its side menu has no
"Marketing" group. <sup>b</sup> <sup>td1</sup>

## Actors & permissions

"The Chapters page" is the workflow's "Publication" › the version ›
"Chapters"; the wizard shows the same list as the "Chapters" section of
its Details step (Rule 2). "Author" below also covers the press's other
author-level roles, Volume editor, Chapter Author and Translator, on a
book they submitted. "May edit the publication" is the one gate
[Publication metadata](U40-publication-metadata.md#edit-gate) defines:
the Press manager, Press editor and Production editor, the Site
Administrator, and a participant whose assignment carries the
metadata-edit permission (by default the Series editor; not the assistant
roles, not the Author). Whoever may not change the list sees it as plain
text (Rule 3). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See a version's chapter list** | • everyone the workflow shows the version's pages to, the Author included: "Chapters" is listed in the editorial view and in the author's view, with no Production-stage requirement ([→ the publication pages](U24-workflow-screen-and-stage-access.md#publication-tabs))<br>• an assistant role only while the book is in a stage its role takes part in: on a book in Copyediting the Layout Editor, Designer and Funding coordinator find no version under "Publication", and the Chapters page opened by its address shows "You don't currently have access to that stage of the workflow."; on a book in Production the Copyeditor, Marketing and sales coordinator and Funding coordinator find the same. Once the version is published, every assistant role opens the Chapters page (row 4)<br>• the submitting Author, in the wizard (Rule 2) <sup>c</sup> <sup>td2</sup> |
| **Add, edit, order and delete chapters: a book still in the wizard** (Rules 4–9) | • the submitting Author, from the wizard's Details step <sup>c</sup> |
| **Add, edit, order and delete chapters: a version that is not published** | • whoever may edit the publication (the preamble)<br>• everyone else who sees the list (row 1), the Author after submitting included, gets the plain-text list (Rule 3) <sup>c</sup> <sup>td2</sup> |
| **Add, edit, order and delete chapters: a published version** (Rule 14) | • Press manager, Press editor, Production editor, Series editor, the Site Administrator, and every assistant role that opens the page (Copyeditor, Layout Editor, Designer, Indexer, Proofreader, Marketing and sales coordinator, Funding coordinator), whatever their assignment's metadata-edit permission ⚠ [A1](#a1)<br>• the Author: the plain-text list <sup>c</sup> <sup>td3</sup> |
| **Open a chapter's "Identifiers" tab** | • see [Identifiers](U44-identifiers.md) (the chapter window's tab, and who is offered it) |
| **Change the work type** (Rule 13) | • Press manager, Press editor, Production editor, the Site Administrator; an assigned Series editor, whatever their assignment's metadata-edit permission<br>• every other role that opens the editorial view, the assistant roles included: the control is offered, but a choice is refused with a window headed "Error" ⚠ [A2](#a2)<br>• the Author: the author's view has no such control; while the book is still in the wizard, the wizard's "Change" offers the choice ([Submission wizard](U21-submission-wizard.md#reconfigure)) <sup>d</sup> <sup>td4</sup> |
| **Set "Publication Dates"** (Rule 11) | • the roles of the row above, from the editorial view's "Marketing" › "Publication Dates"<br>• the assistant roles: the page opens with "Save" pressable, but saving is refused [A2](#a2)<br>• the Author: the author's view has no "Marketing" group <sup>e</sup> <sup>td5</sup> |

## Fields & validation

**The chapter list** (the Chapters page, and the wizard's "Chapters"
section). A table headed "Chapters". Above it, for whoever may change the
list, "Add Chapter", and "Order" once the list holds two or more
chapters. After a chapter window's "Save", "Order" also shows above a
single chapter that has an author, until the page is opened again;
above a single chapter with no author it still does not show. One row
per chapter, in the book's chapter order, showing the chapter's title
(without its subtitle); for whoever may change the list the title is a
link that opens the chapter window, and an arrow before
the title opens a line with the row's "Delete". Under each chapter, one
row per chapter author with three columns: "Name", "Email" and "Role"
(the contributor's roles as the Contributors list names them, joined by
commas, such as "Author, Volume editor"). A list with no chapters reads
"No Items", and so does the space under each chapter that has no
authors. In the wizard the section carries the description "Please
provide all of the chapters of this submission. If you are submitting an
edited volume, please make sure that each chapter indicates the
contributors for that chapter." <sup>f</sup>

**The chapter window.** "Add Chapter" opens a window headed "Add
Chapter" holding the form below. A chapter's title opens a window headed
"Edit Chapter" with the tabs "Edit Metadata" (the form below) and, when
the press has "Enable for Chapters" under "Publisher ID" or "Chapters"
among the URN items on (Settings bullet 5), "Identifiers" (see
[Identifiers](U44-identifiers.md)). DOIs for chapters alone do not add
the tab. The form ends with the note "Required fields are marked with an
asterisk: *", then "Save" and "Cancel". <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Title** | Yes, in the book's language | One box per language the press offers for forms (Settings › Website › Setup › Languages, "Forms"), the book's language first; with a single form language the one box is in the book's language. Typing stops at 255 characters. An empty title in the book's language is refused with "This field is required." under its box: the window stays open and nothing is saved <sup>td6</sup> |
| **Subtitle** | No | One box per language, like Title; typing stops at 255 characters <sup>g</sup> |
| **Abstract** | No | A rich-text editor, one per language, like Title <sup>g</sup> |
| **Pages** | No | Free text (for example "1-24"); nothing checks its form <sup>g</sup> |
| **Date Published** | No | Shown only while the book's "Publication Dates" reads "Each chapter may have its own publication date." (Rule 11). A date picker. On a chapter that has no date the box shows today's date, which "Save" does not store ⚠ [A4](#a4) <sup>g</sup> <sup>e</sup> |
| **License URL** | No | Shown on an Edited Volume only (Rule 12a). Above the box, when a license applies by default, the sentence "The license will be set automatically to {license} when this is published." <sup>g</sup> <sup>o</sup> |
| **Chapter Page** | — | One box, "Show this chapter on its own page and link to that page from the book's table of contents.", unticked for a new chapter. On a chapter that has a DOI, the note "(This chapter will always be shown on its own page because it has a DOI.)" under it (Rule 10) <sup>g</sup> <sup>n</sup> |
| **Add Contributor** | No | One box per contributor of this version, by full name: this chapter's authors first, ticked, in their chapter order, then the version's other contributors in their Contributors-list order. Absent when the version has no contributors (Rule 6) <sup>td7</sup> |
| **Files** | No | One box per file of the book that no other chapter holds, by file name (Rule 7). Absent when no file is left to offer <sup>td8</sup> |

**The work-type control.** In the editorial view's header, a button
reading the book's work type, "Monograph" or "Edited Volume"; it opens a
menu with "Edited Volume" and "Monograph". <sup>d</sup>

**The "Publication Dates" page.** The editorial view's side menu, group
"Marketing" › "Publication Dates", headed "Marketing: Publication Dates".
One choice, "Publication Dates", with two options: "All chapters will use
the publication date of the monograph." and "Each chapter may have its
own publication date.", then "Save". Opening another page of the
workflow drops an unsaved choice without any prompt, as on the version's
pages ([Publication metadata](U40-publication-metadata.md)). <sup>e</sup>

**The wizard's Review panel "Chapters".** On the wizard's Review step,
right after the "Details" panel: a panel headed "Chapters" with "Edit",
then one item per chapter: its title and subtitle as "Tides: A Study",
and under it the chapter's author names joined by commas (none for a
chapter with no authors) (Rule 16). Pressing that "Edit" leaves the
wizard on Review ⚠ [A5](#a5). <sup>h</sup>

## Rules & state

1. **Two work types.** Every book is a Monograph or an Edited Volume. The
   Author picks one on the wizard's first screen, "Submission Type",
   where "Monograph: Authors are associated with the book as a whole." is
   preselected ([Submission wizard](U21-submission-wizard.md)). Both types
   carry a chapter list; the type never adds or removes chapters. The type
   changes: <sup>i</sup>
   - the chapter window's "License URL" (Rule 12a) and the chapter
     licenses written at publishing (Rule 12b);
   - the "Default Chapter License URL" field on the version's "Permissions
     & Disclosure" page ([Publication metadata](U40-publication-metadata.md));
   - the wizard's "Submitting a Monograph." / "Submitting an Edited
     Volume." line ([Submission wizard](U21-submission-wizard.md));
   - who the book's page credits: an Edited Volume with at least one
     contributor whose roles include "Volume editor" credits those
     contributors alone, each as "{name} (ed)"; without one it credits
     every author, as a Monograph does
     ([Contributors & affiliations](U41-contributors-and-affiliations.md),
     and *Monograph landing page*). <sup>i</sup>
2. **Each version has its own chapter list.** The workflow's Chapters page
   shows the chapters of the version chosen under "Publication"; choosing
   another version shows that version's list. In the wizard the "Chapters"
   section is the last section of the Details step, whichever work type
   was chosen, and holds the chapters of the book's only version.
   <sup>f</sup>
3. **The plain-text list.** For whoever may not change the list (Actors),
   the list shows the chapters' titles as plain text with their author
   rows, and no "Add Chapter", no "Order" and no arrow before a title, so
   no "Delete". <sup>c</sup> <sup>td2</sup>
4. **Adding a chapter.** "Add Chapter" › fill the window › "Save" adds the
   chapter at the end of the list. <sup>g</sup>
5. **Saving or leaving a chapter window.**
   - 5a. A chapter window's "Save" writes that chapter at once, on its
     own: the wizard's autosave and "Save for Later" play no part. On
     success the window closes, the notice "Your changes have been
     saved." appears, and the list shows the change. <sup>g</sup>
   - 5b. "Cancel" closes the window without asking and keeps nothing
     typed in it. With a change typed, the window's close arrow, or a
     switch between "Edit Metadata" and "Identifiers", asks "The data on
     this form has changed. Do you wish to continue without saving?":
     the question's "Cancel" keeps the window and the change, its "OK"
     drops the change.
     Leaving the page with text typed in "Add Chapter" raises the
     browser's own "Leave site?" question, and leaving drops the
     chapter. <sup>g</sup>
6. **Chapter authors.** The contributors ticked under "Add Contributor"
   are the chapter's authors: they are listed under the chapter, and the
   chapter's page credits them. A chapter may have no authors. The window
   offers only this version's contributors, as they stand when it opens:
   in the wizard, the Details step comes before the Contributors step, so
   at first only the submitting Author's own entry is offered, and
   contributors added later appear the next time the window opens. An
   author ticked on a chapter that already has authors joins after them.
   Deleting a contributor from the Contributors list removes them from
   every chapter of that version. <sup>j</sup> <sup>td7</sup> <sup>td10</sup>
7. **Chapter files.** The files ticked under "Files" belong to the
   chapter. A file belongs to one chapter at most: a file another chapter
   holds is not offered. The list offers every file of the book, whatever
   the file list or stage it sits on, by its name. Unticking a file, or
   deleting its chapter (Rule 9), offers it to every chapter again.
   <sup>k</sup> <sup>td8</sup> <sup>td9</sup>
8. **Ordering.** "Order" shows a handle on each chapter and on each
   chapter author, and the buttons "Done" and "Cancel ordering". <sup>l</sup>
   - 8a. Dragging a chapter does not move it: the chapter row drags only
     within its own block, in among that chapter's authors, and "Done"
     leaves the chapter order as it was ⚠ [A6](#a6). The chapter order
     is the order the chapters were added in, and it is the book's
     table-of-contents order. <sup>l</sup> <sup>td11</sup>
   - 8b. Dragging an author moves them among that chapter's authors, and
     "Done" saves the new order; after an earlier "Done" in the same
     visit, a new author order is lost ⚠ [A7](#a7). "Cancel ordering" puts the
     list back as it was. <sup>l</sup> <sup>td11</sup>
9. **Deleting a chapter.** The arrow before a chapter's title, then
   "Delete", opens a window headed "Delete", "Are you sure you wish to
   delete this item? This action cannot be undone.", with "OK" and
   "Cancel". "OK" removes the chapter from the list at once. The book
   keeps its contributors and its files; the files the chapter held are
   offered to the other chapters again. There is no undo. <sup>m</sup> <sup>td9</sup>
10. **Chapter Page.** The ticked box gives the chapter a page of its own
    for readers, linked from the book's table of contents (*Monograph
    landing page*). Once the chapter has a DOI, the box stays ticked:
    it shows ticked with the note of the Fields table, and a "Save" with
    it unticked leaves it ticked. Which chapters get a DOI is Settings
    bullet 4. <sup>n</sup> <sup>td14</sup>
11. **Chapter publication dates.** The book's "Publication Dates" choice
    decides whether chapters may carry their own date. With "Each chapter
    may have its own publication date." saved, every chapter window shows
    "Date Published"; with "All chapters will use the publication date of
    the monograph." saved, the box is gone, and a date typed there earlier
    is kept and shows again when the first choice is saved back. A new
    book opens the page with neither option selected, and its chapter
    windows show no "Date Published" until the first option is saved.
    The choice is the book's, shared by all its versions. Which date a
    chapter's page then shows belongs to *Monograph landing page*.
    <sup>e</sup> <sup>td5</sup> <sup>td12</sup>
12. **Chapter licenses (Edited Volume).**
    - 12a. On an Edited Volume the chapter window offers "License URL".
      The sentence above it names the license the chapter will receive at
      publishing when its box is left empty: the version's "Default
      Chapter License URL", else the version's own "License URL", else
      the press's default license; with none of the three set, no
      sentence shows. The same sentence shows above a box that already
      holds the chapter's own address, which publishing keeps, and it goes
      on showing once the version is published ⚠ [A8](#a8). A
      Monograph's chapter window has no "License URL". <sup>o</sup> <sup>td13</sup>
    - 12b. When an Edited Volume's version is published, its "Default
      Chapter License URL", if empty, takes the version's "License URL",
      and every chapter whose "License URL" is empty takes the "Default
      Chapter License URL". Reopening such a chapter's window after
      publishing shows that address in the box. A chapter's own address
      is kept. A Monograph's chapters receive nothing. A chapter added
      after the version is published may keep an empty "License URL"
      ⚠ [A9](#a9). <sup>o</sup> <sup>td13</sup>
13. **Changing the work type in the workflow.**
    - 13a. Choosing the other entry of the work-type control changes the
      book's type at once, with no confirmation and no "Save", and the
      control then reads the new type. The control works the same on a
      published book: a published Monograph switched to Edited Volume
      reads "Edited Volume" at once, and its chapter windows then show
      "License URL". Choosing the entry the control already reads
      changes nothing. <sup>d</sup> <sup>td16</sup>
    - 13b. The chapters, their authors, files and licenses stay as they
      were. A chapter window opened afterwards shows or hides "License
      URL" by the new type, and an address typed there earlier shows
      again when the book is an Edited Volume once more. <sup>d</sup> <sup>td16</sup>
14. **Published versions.** On a published version the Chapters page
    carries, in the editorial view, "Warning: This version has been
    published. Editing it may impact the published content." above the
    list, and the roles of the Actors table may still change the list;
    their changes reach the published book at once. The author's view
    shows "This version has been published and can not be edited." and
    the plain-text list. <sup>p</sup> <sup>td3</sup>
15. **A new version.** "Create New Version" ([Publish, schedule &
    versions](U49-publish-schedule-and-versions.md)) copies every chapter
    into the new version with its title, subtitle, abstract, pages, date,
    license, "Chapter Page" box and place in the order, and with its
    authors (the new version's copies of the same contributors). A proof
    file of a publication format that the chapter held is copied with the
    format and belongs to the copied chapter. The chapter's other files
    stay with the earlier version's chapter, so the new version's chapter
    neither holds them nor offers them under "Files" ⚠ [A3](#a3).
    <sup>q</sup> <sup>td15</sup>
16. **The wizard's Review step.** The Review panel "Chapters" lists the
    chapters as the Details step left them, each title followed by its
    subtitle, and follows additions, edits and deletions made in the same
    wizard at once. A new order of a chapter's authors saved with "Order"
    shows in the panel only after the wizard is reloaded (a chapter itself
    cannot be moved, Rule 8a). The wizard asks for no chapter: an Edited
    Volume, or a Monograph, can be submitted with an empty list, and the
    panel then shows only its heading and "Edit". <sup>h</sup> <sup>td11</sup> <sup>td18</sup>

## Side effects

- A chapter's "Save" shows "Your changes have been saved." to the person
  who saved (Rule 5a). Nothing else is sent: no email, no Tasks entry, no
  notice to other people, for adding, editing, ordering or deleting a
  chapter, changing the work type or saving "Publication Dates".
  <sup>r</sup> <sup>td17</sup>
- None of these actions adds a line to the submission's Activity Log
  ([Submission activity log & notes](U38-submission-activity-log-and-notes.md)).
  <sup>r</sup> <sup>td17</sup>
- Deleting a chapter frees its files for the other chapters (Rule 9);
  deleting a contributor takes them off every chapter (Rule 6).
- Publishing an Edited Volume writes the default chapter license into its
  empty chapter licenses (Rule 12b).

## Settings that modify behavior

1. **"Publication Dates"** (per book: the editorial view's "Marketing" ›
   "Publication Dates"). A new book has neither option saved, which works
   as "All chapters will use the publication date of the monograph.": no
   "Date Published" in the chapter window. "Each chapter may have its own
   publication date." adds "Date Published" to every chapter window of
   the book (Rule 11). <sup>e</sup> <sup>td5</sup> <sup>td12</sup>
2. **The work type** (per book: the wizard's "Submission Type", then the
   workflow header's control). Default "Monograph": the chapter window
   has no "License URL". "Edited Volume" adds "License URL" with its
   sentence (Rule 12a) and the licenses written at publishing (Rule 12b). <sup>i</sup> <sup>td16</sup>
3. **"Default Chapter License URL"** (per version, Edited Volume only:
   the version's "Permissions & Disclosure" page, *[Publication
   metadata](U40-publication-metadata.md)*). Empty by default: the
   chapter window's sentence names the version's own license or the
   press's. Set: the sentence names it, and publishing gives it to every
   chapter with an empty "License URL" (Rule 12). While the press or the
   version has a license, the field arrives greyed out behind "Override"
   ([Publication metadata OMP4](U40-publication-metadata.md#omp4)). <sup>o</sup> <sup>td13</sup>
4. **"Chapters" among the DOI "Items with DOIs"** (Settings ›
   Distribution › "DOIs", *[DOIs](U45-dois.md)*). Off by default: no
   chapter gets a DOI. On: when the book's DOIs are created ("Upon
   publication"), each chapter whose "Chapter Page" box is ticked gets a
   DOI; a chapter left unticked gets none, and ticking it after
   publishing gives it none either. A chapter that has a DOI keeps its
   box ticked (Rule 10). <sup>n</sup> <sup>td14</sup>
5. **"Enable for Chapters" under "Publisher ID", or "Chapters" among the
   URN items** (*[Identifiers](U44-identifiers.md)*). Off by default: the
   "Edit Chapter" window has no "Identifiers" tab. On: the tab appears. <sup>g</sup>
6. **The assignment's metadata-edit permission** ("Permit submission
   metadata edit." per role, and the assignment's box, *[Stage
   participants](U35-stage-participants.md)* and *[Publication
   metadata](U40-publication-metadata.md#edit-gate)*). Off by default for
   the Author and the assistant roles: they get the plain-text list on an
   unpublished version. On: they may change the list there (Actors). <sup>c</sup> <sup>td2</sup>

## Cross-feature interactions

- *[Submission wizard](U21-submission-wizard.md)*: the "Submission Type"
  choice, its "Change", and the presence of the Details step's
  "Chapters" section and the Review step's "Chapters" panel. What the
  section and panel do is this spec's.
- *[Contributors & affiliations](U41-contributors-and-affiliations.md)*:
  the contributors a chapter's authors are picked from, and their role
  names in the "Role" column; the Edited Volume's credits on the book's
  page.
- *[Publication metadata](U40-publication-metadata.md)*: the edit gate
  (Actors) and the "Default Chapter License URL" field.
- *[Identifiers](U44-identifiers.md)*: the "Edit Chapter" window's
  "Identifiers" tab.
- *[DOIs](U45-dois.md)*: the DOI settings, with the "Chapters" box
  whose effect on chapters is Settings bullet 4 here, and the DOIs page's
  chapter rows.
- *Monograph landing page* (no spec yet): the book's table of contents,
  chapter pages, chapter authors, dates and license badges as readers see
  them.
- *[Search engine metadata & analytics](U20-search-engine-metadata-and-analytics.md)*:
  a chapter page's metadata tags and its place in the press's sitemap.
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  the listing of "Chapters" among the version's pages, the header that
  holds the work-type control, and the "Marketing" group.
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  publishing (Rule 12b) and "Create New Version" (Rule 15).
- *[Submission files](U36-submission-files.md)*: the file lists and
  components the chapter "Files" list draws its files from.
- [Publication formats & proof terms](U73-publication-formats-proof-terms.md): the proof files a
  chapter can hold.

## Canonical scenarios

Scenarios 2, 4, 5, 6 and 10 run on the seeded press with ready accounts
and scratch books, and scenario 11 on the seeded journal and the seeded
preprint server, its control on the seeded press. Scenarios 1, 3, 7, 8
and 9 each run on a scratch press with a throwaway Press manager and a
throwaway Author, scenario 8's press with no license and scenario 9's
giving chapters DOIs (its control on the seeded press). The accounts,
the passwords, the mail catcher and the tooling recipe are in the
footnote. <sup>s</sup>

1. **A chapter list built on the Chapters page**

   Given: Press manager, on a submitted Monograph with no chapters, whose
   Contributors list reads the Author's own entry, then Ada Lovel
   (ada@example.org) and Ben Barrow (ben@example.org), each with the role
   "Author", and whose files are article.pdf and notes.md.

   - **The empty list**: open the book's Chapters page (the workflow's
     "Publication" › the version › "Chapters"): a table headed "Chapters"
     reads "No Items", with "Add Chapter" above it and no "Order"
     (Fields, the chapter list).
   - **"Add Chapter"**: press it: a window headed "Add Chapter" holds
     "Title", "Subtitle", "Abstract", "Pages", "Chapter Page" with its box
     unticked, "Add Contributor" offering the Author's own entry, Ada
     Lovel and Ben Barrow in that order, all unticked, and "Files"
     offering article.pdf and notes.md, then the note "Required fields
     are marked with an asterisk: *", "Save" and "Cancel" (Fields, the
     chapter window).
   - **An empty title**: press "Save" with nothing typed: "This field is
     required." shows under the "Title" box, the window stays open, and
     the list still reads "No Items" (Fields, Title).
   - **"Tides"**: type Tides in "Title", A Study in "Subtitle" and 1-24 in
     "Pages", tick Ben Barrow and article.pdf, and press "Save": the
     window closes, the notice "Your changes have been saved." appears,
     and the list shows "Tides", without its subtitle, over one row
     reading Ben Barrow, ben@example.org and "Author" under "Name",
     "Email" and "Role"; "Add Chapter" still stands above the list
     (Rules 4, 5a, 6, 7; Fields).
   - **"Harbours", with no author**: press "Add Chapter": "Files" offers
     notes.md alone, since "Tides" holds article.pdf (Rule 7). Type
     Harbours in "Title" and press "Save": "Harbours" is listed after
     "Tides" with "No Items" under it, and "Order" and "Add Chapter" show
     above the list (Rule 4; Fields).
   - **"Tides" edited**: press the title "Tides": a window headed "Edit
     Chapter" opens on its "Edit Metadata" tab, holding Tides, A Study and
     1-24; "Add Contributor" lists Ben Barrow first, ticked, then the
     Author's own entry and Ada Lovel, unticked; "Files" lists
     article.pdf ticked and notes.md unticked. Tick Ada Lovel and press
     "Save": the rows under "Tides" read Ben Barrow, then Ada Lovel (Rule
     6; Fields).
   - **Leaving the window unsaved**: open "Tides", replace 1-24 with 1-30
     in "Pages" and press "Cancel": the window closes without asking, and
     reopened it reads 1-24. Type 1-30 again and press the window's close
     arrow: the question "The data on this form has changed. Do you wish
     to continue without saving?" shows; its "Cancel" keeps the window
     with 1-30 typed; press the close arrow again and the question's
     "OK": the window closes, and reopened it reads 1-24 (Rule 5b).
   - **Leaving the page**: press "Add Chapter", type Coda in "Title" and,
     in the same browser tab, open the press's home page: the browser
     asks "Leave site?"; leave, then open the book's Chapters page again:
     it lists "Tides" and "Harbours" and no "Coda" (Rule 5b).
   - **Control**: the mail catcher holds no email to the Author, Ada
     Lovel or Ben Barrow about the chapters, and the submission's
     Activity Log ([Submission activity log &
     notes](U38-submission-activity-log-and-notes.md)) holds the lines it
     held before the first "Add Chapter" (Side effects bullets 1, 2).
     <sup>s</sup>

2. **Chapter authors ordered, and a contributor and a chapter deleted**

   Given: Press manager, on a submitted Monograph whose Contributors list
   reads the Author's own entry, Ada Lovel and Ben Barrow, with two
   chapters: "Tides", whose authors are Ada Lovel, then Ben Barrow, and
   which holds article.pdf, and "Harbours", whose author is Ada Lovel; the
   book's other file, notes.md, belongs to no chapter.

   - **"Order"**: on the book's Chapters page press "Order": a handle shows
     on each chapter and on each author row, with the buttons "Done" and
     "Cancel ordering" (Rule 8).
   - **Authors reordered**: drag Ben Barrow above Ada Lovel under "Tides"
     and press "Done": the rows under "Tides" read Ben Barrow, then Ada
     Lovel, and still do after a reload; the chapters still read "Tides",
     then "Harbours" (Rules 8a, 8b).
   - **"Cancel ordering"**: press "Order", drag Ada Lovel above Ben Barrow
     and press "Cancel ordering": the rows read Ben Barrow, then Ada Lovel
     again (Rule 8b).
   - **A contributor deleted**: on the version's "Contributors" page
     ("Publication" › the version › "Contributors") delete Ada Lovel (the
     list: [Contributors &
     affiliations](U41-contributors-and-affiliations.md)); back on the
     Chapters page, "Tides" lists Ben Barrow alone and "Harbours" reads
     "No Items" (Rule 6; Fields).
   - **"Tides" deleted**: press the arrow before "Tides", then "Delete": a
     window headed "Delete" reads "Are you sure you wish to delete this
     item? This action cannot be undone.", with "OK" and "Cancel"; press
     "OK": "Tides" is gone at once, "Harbours" is listed alone with no
     "Order" above the list, and after a reload "Tides" is still gone
     (Rule 9; Fields).
   - **Its file freed**: press "Harbours": "Files" offers article.pdf and
     notes.md, both unticked (Rules 7, 9).
   - **Control**: the version's "Contributors" page still lists Ben
     Barrow: deleting his chapter kept him on the book (Rule 9).
     <sup>s</sup>

3. **The Author builds the chapter list while submitting**

   Given: the Author, on the Details step of their draft Edited Volume,
   which holds one file and no chapters and whose Contributors list holds
   only the Author's own entry; and Press manager.

   - **The "Chapters" section**: the Details step ends with a section
     "Chapters", described "Please provide all of the chapters of this
     submission. If you are submitting an edited volume, please make sure
     that each chapter indicates the contributors for that chapter.", its
     table reading "No Items" under "Add Chapter" (Rule 2; Fields).
   - **"Tides"**: press "Add Chapter": "Add Contributor" offers the
     Author's own entry alone (Rule 6). Type Tides in "Title" and A Study
     in "Subtitle", tick the Author's entry and press "Save": the notice
     "Your changes have been saved." appears, and "Tides" is listed over
     the Author's row (Rules 4, 5a).
   - **"Harbours"**: add a chapter titled Harbours with no author ticked:
     it is listed after "Tides" with "No Items" under it (Rule 4; Fields).
   - **A contributor added later**: on the wizard's Contributors step add
     a contributor named Zed Zephyr with the address zed@example.org (the
     window: [Contributors &
     affiliations](U41-contributors-and-affiliations.md)); back on the
     Details step, press "Tides": "Add Contributor" lists the Author's
     entry, ticked, then Zed Zephyr. Tick him and press "Save": "Tides"
     lists the Author's row, then Zed Zephyr's (Rule 6).
   - **The Review step**: open the wizard's Review step: right after the
     "Details" panel, a panel headed "Chapters", with "Edit", lists "Tides:
     A Study" over the Author's name and Zed Zephyr, joined by a comma,
     then "Harbours" with no line under it (Fields, the Review panel; Rule
     16).
   - **Changes follow at once**: back on the Details step, replace A Study
     with A Survey in "Tides"' "Subtitle" and press "Save", then delete
     "Harbours" (the arrow, "Delete", "OK"); on the Review step the panel
     lists "Tides: A Survey" alone (Rule 16).
   - **Submitted**: submit the book ([Submission
     wizard](U21-submission-wizard.md)), open it from My Submissions and
     choose "Publication" › the version › "Chapters": "Tides" shows as
     plain text over its two author rows, with no "Add Chapter", no
     "Order" and no arrow before the title; the header has no button
     reading "Edited Volume", and the side menu has no "Marketing" group
     (Actors rows 1, 3, 6, 7; Rule 3).
   - **Control**: Press manager: the same Chapters page offers "Add
     Chapter", with "Tides" as a link and the arrow before it (Actors row
     3). <sup>s</sup>

4. **Staff without the permission read a plain-text list**

   Given: Press manager, and a Copyeditor, a Layout Editor and a Series
   editor assigned to a submitted Monograph in Copyediting, the Series
   editor's assignment without the metadata-edit permission (its
   "Permissions" box unticked); the book has the chapter "Tides", whose
   author is Ben Barrow.

   - **The Copyeditor**: open the book from the Dashboard and choose
     "Publication" › the version › "Chapters": "Tides" shows as plain text
     over Ben Barrow's row, with no "Add Chapter", no "Order" and no arrow
     before the title (Actors rows 1, 3; Rule 3).
   - **The Series editor**: the same Chapters page shows the same
     plain-text list (Actors row 3; Settings bullet 6).
   - **The Layout Editor, outside its stage**: open the book: "Publication"
     lists no version under it, and the Chapters page's address, as the
     Copyeditor opened it, shows "You don't currently have access to that
     stage of the workflow." (Actors row 1).
   - **Control**: Press manager: the same Chapters page offers "Add
     Chapter", with "Tides" as a link and the arrow before it (Actors row
     3). <sup>s</sup>

5. **The work type changed from the header**

   Given: Press manager, on a submitted Monograph with the chapter
   "Tides", whose author is Ben Barrow and which holds article.pdf.

   - **The button**: the workflow's header shows a button reading
     "Monograph"; press it: a menu offers "Edited Volume" and "Monograph"
     (Fields, the work-type control).
   - **"Edited Volume"**: choose it: no confirmation opens and no "Save"
     is asked for; the button reads "Edited Volume", and still does after
     a reload (Rule 13a).
   - **The chapter kept**: on the Chapters page "Tides" still lists Ben
     Barrow, and its window now holds "License URL", with Ben Barrow and
     article.pdf still ticked. Type https://example.org/own-license in
     "License URL" and press "Save" (Rules 12a, 13b; Settings bullet 2).
   - **Back to "Monograph"**: choose "Monograph" from the button: it reads
     "Monograph"; "Tides" still lists Ben Barrow, and its window has no
     "License URL", with Ben Barrow and article.pdf still ticked (Rule
     13b).
   - **"Edited Volume" again**: choose it: "Tides"' window shows
     https://example.org/own-license in "License URL" again (Rule 13b).
   - **Control**: choose "Edited Volume" while the button reads it: the
     button still reads "Edited Volume", and "Tides"' window still holds
     https://example.org/own-license (Rule 13a). <sup>s</sup>

6. **Chapters with their own publication dates**

   Given: Press manager, on a submitted Monograph with the chapter "Tides"
   and no "Publication Dates" choice saved.

   - **No choice saved**: "Tides"' window has no "Date Published"; close
     it with "Cancel" (Rule 11).
   - **The "Publication Dates" page**: choose the side menu's "Marketing" ›
     "Publication Dates": the page is headed "Marketing: Publication
     Dates", with the options "All chapters will use the publication date
     of the monograph." and "Each chapter may have its own publication
     date.", neither selected, then "Save" (Fields; Rule 11).
   - **"Each chapter may have its own publication date."**: select it and
     press "Save"; on the Chapters page "Tides"' window now holds "Date
     Published" (what it shows before a date is typed is [A4](#a4),
     neither a pass nor a fail here). Type 2024-05-01 in it and press
     "Save": reopened, the window shows 2024-05-01 (Rule 11; Settings
     bullet 1).
   - **"All chapters will use the publication date of the monograph."**:
     select it on the "Publication Dates" page and press "Save": "Tides"'
     window has no "Date Published" (Rule 11).
   - **Control**: select "Each chapter may have its own publication date."
     again and press "Save": "Tides"' window shows 2024-05-01 in "Date
     Published" again (Rule 11). <sup>s</sup>

7. **A published book's chapters**

   Given: Press manager and the Author, on the Author's published
   Monograph with the chapters "Tides" and "Harbours".

   - **The warning**: Press manager: on the Chapters page, "Warning: This
     version has been published. Editing it may impact the published
     content." shows above the list, with "Add Chapter", "Order", the
     titles as links and the arrows before them (Rule 14; Actors row 4).
   - **A chapter added**: add a chapter titled Epilogue: the notice "Your
     changes have been saved." appears, and "Epilogue" is listed after
     "Harbours", still there after a reload (Rules 4, 14).
   - **The work type of a published book**: choose "Edited Volume" from
     the header's button: it reads "Edited Volume" at once, and "Tides"'
     window now holds "License URL" (Rule 13a).
   - **Control**: Author: open the book from My Submissions and choose
     "Publication" › the version › "Chapters": "This version has been
     published and can not be edited." shows above the plain-text list of
     "Tides", "Harbours" and "Epilogue", with no "Add Chapter", no
     "Order" and no arrow (Rules 3, 14). <sup>s</sup>

8. **Chapter licenses on an Edited Volume**

   Given: Press manager, on a scratch press with no license, with three
   books in Production: an Edited Volume whose version's "License URL"
   reads https://example.org/version-license and whose "Default Chapter
   License URL" is empty, with the chapters "Tides", its "License URL"
   empty, and "Harbours", its "License URL" reading
   https://example.org/own-license; a second Edited Volume whose version
   has no "License URL" and whose "Default Chapter License URL" reads
   https://example.org/chapter-default, with the chapter "Tides", its
   "License URL" empty; and a Monograph whose version's "License URL"
   reads https://example.org/version-license, with the chapter "Tides".

   - **The version's license**: on the first volume's Chapters page open
     "Tides": its "License URL" is empty, and above it "The license will
     be set automatically to {license} when this is published." names
     https://example.org/version-license (Rule 12a).
   - **A chapter's own address**: open "Harbours": its "License URL" holds
     https://example.org/own-license (the sentence above it is
     [A8](#a8), neither a pass nor a fail here) (Rule 12a).
   - **The chapter default**: on the second volume, "Tides"' sentence
     names https://example.org/chapter-default (Rule 12a; Settings bullet
     3).
   - **Published**: publish the first volume ([Publish, schedule &
     versions](U49-publish-schedule-and-versions.md)); on its Chapters
     page reopen "Tides": its "License URL" holds
     https://example.org/version-license, and "Harbours"' still holds
     https://example.org/own-license (Rule 12b; Side effects bullet 4).
   - **Control**: the Monograph's "Tides" window has no "License URL" and
     no sentence (Rule 12a). <sup>s</sup>

9. **Chapter DOIs follow "Chapter Page"**

   Given: Press manager, on a scratch press whose DOI settings tick
   "Chapters" among "Items with DOIs" and create DOIs "Upon publication",
   with a published book whose chapter "Tides" had "Chapter Page" ticked
   when the book was published and whose chapter "Harbours" did not.

   - **"Tides"**: open its window: "Chapter Page" is ticked, with "(This
     chapter will always be shown on its own page because it has a DOI.)"
     under it (Fields; Rule 10; Settings bullet 4).
   - **Unticked and saved**: untick the box and press "Save": the notice
     "Your changes have been saved." appears; reopened, the box is ticked,
     with the note (Rule 10).
   - **"Harbours"**: its box is unticked, with no note. Tick it and press
     "Save": reopened, the box is ticked with no note under it (Settings
     bullet 4).
   - **Control**: on the seeded press, whose "Items with DOIs" leave
     "Chapters" unticked, a published book's chapter "Tides" with "Chapter
     Page" ticked shows the box ticked with no note (Settings bullet 4).
     <sup>s</sup>

10. **A new version copies the chapters**

    Given: Press manager, on a published Monograph with the chapters
    "Tides", with the subtitle "A Study", the pages "1-24", "Chapter
    Page" ticked and the author Ben Barrow, and "Harbours", with the pages
    "25-40" and the author Ada Lovel.

    - **"Create New Version"**: create a version with the header's "Create
      New Version" ([Publish, schedule &
      versions](U49-publish-schedule-and-versions.md)): the new version's
      Chapters page lists "Tides" over Ben Barrow's row, then "Harbours"
      over Ada Lovel's (Rule 15).
    - **"Tides" copied**: open "Tides": its boxes hold Tides, A Study and
      1-24, "Chapter Page" is ticked, and Ben Barrow is ticked under "Add
      Contributor" (Rule 15). What its "Files" offers is [A3](#a3),
      neither a pass nor a fail here.
    - **A chapter on the new version**: add a chapter titled Coda: it is
      listed after "Harbours" (Rule 4).
    - **Control**: choose the earlier version under "Publication": its
      Chapters page lists "Tides" and "Harbours" and no "Coda" (Rule 2).
      <sup>s</sup>

11. **No chapters on a journal or a preprint server** {OJS OPS}

    Given: Journal Manager (Preprint Server Manager) and the Author, on
    the seeded journal (the seeded preprint server), with the Author's
    draft article (preprint) and a submitted one.

    - **The start screen**: Author: start a new submission ([Submission
      wizard](U21-submission-wizard.md)): its first screen asks for no
      "Submission Type" (Purpose, the absence paragraph).
    - **The Details step**: open the draft from My Submissions and go to
      its Details step: it has no "Chapters" section (Purpose, the absence
      paragraph).
    - **The workflow**: Journal Manager (Preprint Server Manager): open the
      submitted article (preprint): "Publication" ("Preprint") › the
      version lists no "Chapters", the header has no button reading "Monograph" or "Edited
      Volume", and the side menu has no "Marketing" group (Purpose, the
      absence paragraph).
    - **Control**: on the seeded press, the Author's new submission asks
      for "Submission Type", the Author's draft book shows a "Chapters"
      section on its Details step, and the Press manager's submitted book
      lists "Chapters" under its version, a header button reading
      "Monograph" and a side-menu group "Marketing" (Rules 1, 2; Fields).
      <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — variants:
  - two form languages on the press: one "Title", "Subtitle" and
    "Abstract" box per language, the book's language first, and a title
    typed only in the other language refused (Fields, Title)
  - an Edited Volume or a Monograph submitted with no chapter, the Review
    panel showing only its heading and "Edit" (Rule 16)
  - a switch between "Edit Metadata" and "Identifiers" with a change
    typed, which asks the same question as the close arrow (Rule 5b)
  - a chapter's new author order, which the Review panel shows only after
    the wizard is reloaded (Rule 16)
  - an unsaved "Publication Dates" choice, dropped without a prompt when
    another page of the workflow opens (Fields, the "Publication Dates"
    page)
  - "Order" above a single chapter that has an author, after a chapter
    window's "Save" (Fields, the chapter list; scenario 1 passes it)
- **Nothing new to test**:
  - a Series editor whose assignment carries the metadata-edit
    permission, the Press editor, the Production editor and the Site
    Administrator, offered on an unpublished version what the Press
    manager is (Actors rows 3, 4; scenario 1)
- **Register carries it**:
  - A1 (the assistant roles changing a published version's chapters;
    Actors row 4)
  - A2 (the work-type control and the "Publication Dates" "Save" offered
    to the assistant roles and refused; Actors rows 6, 7)
  - A3 (a new version's chapters without their earlier files; Rule 15;
    scenario 10 passes it)
  - A4 (today's date in an undated chapter's "Date Published"; Fields;
    scenario 6 passes it)
  - A5 (the Review panel's "Edit"; Fields, the Review panel)
  - A6 (a chapter dragged with "Order" stays in place; Rule 8a)
  - A7 (a second author reorder in one visit lost; Rule 8b)
  - A8 (the license sentence above a chapter's own address, and after
    publishing; Rule 12a; scenario 8 passes it)
  - A9 (a chapter added after an Edited Volume is published; Rule 12b)
- **Owned by another feature**:
  - the chapter window's "Identifiers" tab and who is offered it (Actors
    row 5; *[Identifiers](U44-identifiers.md)*)
  - chapter identifiers switched on (Settings bullet 5;
    *[Identifiers](U44-identifiers.md)*)
  - the Author whose assignment carries the metadata-edit permission
    (Settings bullet 6; *[Publication
    metadata](U40-publication-metadata.md#edit-gate)*)
  - chapter pages, the table of contents, chapter credits and an Edited
    Volume's "(ed)" credits as readers see them (Rules 1, 6, 8, 10, 11;
    *Monograph landing page*, no spec yet)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-28), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A6](#a6) | "Order" cannot move a chapter: a dragged chapter stays where it was | 🐞 | user-visible | — |
| [A4](#a4) | A chapter's "Date Published" shows today's date when the chapter has none, and "Save" does not store it | 🐞 | user-visible | — |
| [A2](#a2) | The work-type control and "Publication Dates" are offered to the assistant roles, and their choice is refused | 🐞 | minor | — |
| [A3](#a3) | After "Create New Version" the new version's chapters lose their files, which no chapter of the new version can take back | 🐞 | minor | — |
| [A5](#a5) | The "Edit" of the wizard's Review panel "Chapters" does nothing | 🐞 | minor | — |
| [A7](#a7) | A chapter's new author order is lost after an earlier "Done" in the same visit | 🐞 | minor | — |
| [A8](#a8) | The chapter window promises an automatic license above a box whose own address publishing keeps, and after publishing | 🐞 | minor | — |
| [A1](#a1) | The assistant roles may change a published version's chapters, though not an unpublished one's | ❓ | minor | — |
| [A9](#a9) | A chapter added to a published Edited Volume may stay without a license | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The assistant roles may change published chapters only** · ❓ · minor.
On a version that is not published, a Layout Editor, Copyeditor or other
assistant role (and a Series editor whose assignment lacks the
metadata-edit permission) gets the plain-text chapter list. Once the
version is published, the same person gets "Add Chapter", "Order",
"Delete" and the chapter windows, whatever the permission says. The
version's other pages ("Title & Abstract", "Contributors", "Metadata",
"References", "Catalog Entry", "Permissions & Disclosure") follow the
permission on both sides; "Publication Formats" ("Add publication
format") and "Media" ("Add Media File") offer theirs to these roles on
both sides, and a format added so is saved.
Question (a product ruling no screen settles): should a published version's chapters follow the same edit gate as the rest of the publication?
Lean: yes; the published-version opening was added in 2025 so editors could correct published books, and the assistant roles came along with no permission check (a history read from the code).
Since: 2025-05-28, a date read from the code's history · Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The work type and "Publication Dates" refuse the assistant roles they are offered to** · 🐞 · minor.
The editorial view's header shows the work-type control to every role
that opens it, and the "Marketing" › "Publication Dates" page opens with
"Save" pressable for them too. For the assistant roles (Copyeditor,
Layout Editor, Marketing and sales coordinator and the others) choosing
"Edited Volume" or "Monograph" opens a window headed "Error", "The
current role does not have access to this operation.", with "OK", and
the type stays; "Save" on "Publication Dates" shows the passing notice
"An unexpected error has occurred. Please reload the page and try
again." and nothing is saved. After that refused "Save" the page keeps
showing the new choice selected; only a reload shows that nothing
changed. The "Marketing" › "Audience" page (*ONIX metadata & export*, no
spec yet) is offered and refused the same way. Expected: controls these
roles cannot use are not offered, or shown read-only.
Basis: probe, with the cause read from the code. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A new version's chapters lose their files** · 🐞 · minor.
After "Create New Version", each copied chapter in the new version holds
only the proof files copied with its publication formats. The other
files the chapter held (for example a "Chapter Manuscript" on the
submission's file list) are not ticked in the new version's chapter
window and are not offered there at all, because the earlier version's
chapter still holds them. Expected: the copied chapter keeps its files,
or can pick them again.
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Date Published" shows today's date on a chapter that has none** · 🐞 · user-visible.
With "Each chapter may have its own publication date." saved, the window
of a chapter that has no date shows today's date in "Date Published".
"Save" leaves the chapter without a date, and the next opening shows
today's date again, so a user who wants today's date believes it is set
when it is not. Expected: an empty box.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The Review panel's "Edit" does nothing for chapters** · 🐞 · minor.
On the wizard's Review step, the "Chapters" panel's "Edit" leaves the
wizard on Review. An author who spots a chapter mistake there must use
the wizard's numbered steps or the "Details" panel's "Edit", which opens the Details
step. Expected: "Edit" opens the Details step.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A chapter cannot be moved with "Order"** · 🐞 · user-visible.
After "Order", dragging a chapter row above another does not move it: the
row drags only within its own block, in among that chapter's authors, and
"Done" leaves the chapter order as it was, on the page and after a
reload. The same holds in the wizard. The chapters stay in the order they
were added in, which is the book's table of contents. Expected: dragging
a chapter moves it in the list, and "Done" keeps the new order.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — A chapter's new author order is lost after an earlier "Done"** · 🐞 · minor.
On a chapter with two authors, "Order" › "Done", then "Order" again, the
second author dragged above the first and "Done", shows the old order
again, at once and after a reload. A single reorder in a visit is kept.
Expected: the new order is kept.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — The chapter window promises a license publishing will not write** · 🐞 · minor.
On an Edited Volume the chapter window says "The license will be set
automatically to {license} when this is published." above a box that
already holds the chapter's own address, which publishing keeps, and
goes on saying it once the version is published. Expected: the sentence
shows only above an empty box on a version that is not published.
Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A chapter added after publishing may stay without a license** · ❓ · minor.
A chapter added to a published Edited Volume was seen once keeping an
empty "License URL" after a reload, while its window said "The license
will be set automatically to {license} when this is published.":
publishing, which fills empty chapter licenses (Rule 12b), does not run
again.
Question (a product ruling no screen settles): should a chapter added to a published version take the version's "Default Chapter License URL" when it is saved?
Lean: yes, or the sentence should not show there; a second sighting of the empty box would make this a 🐞.
Basis: probe. <sup>f-a9</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Code read 2026-09-28 on the omp checkout `72a01a026` (lib/pkp
`1ad4a14bb2`, ui-library `03d1cee2`). The chapter list is the legacy
category grid `APP\controllers\grid\users\chapter\ChapterGridHandler`
(ops `fetchGrid`, `fetchRow`, `fetchCategory`, `saveSequence`,
`addChapter`, `editChapter`, `editChapterTab`, `updateChapter`,
`deleteChapter`, and `identifiers`, `updateIdentifiers`, `clearPubId`
for the Identifiers tab), shown in the workflow by the Vue shell
`ChapterManager.vue` (`GridWrapper`) and in the wizard by
`templates/submission/chapters.tpl` (`load_url_in_div`). The work type is
the submission's `workType` (`Submission::WORK_TYPE_AUTHORED_WORK` = 2,
the schema default; `WORK_TYPE_EDITED_VOLUME` = 1). Reader side:
`pages/catalog/CatalogBookHandler.php` (the chapter request, `isPageEnabled()`).
Live-probed 2026-09-28 (Purpose): the start screen's "Submission Type"
offers both types; the chapter window of a Monograph with no "Publication
Dates" choice holds "Title", "Subtitle", "Abstract", "Pages", "Chapter
Page", "Add Contributor" and "Files", and an Edited Volume's with dates
per chapter adds "Date Published" and "License URL"; the list shows in
the wizard's Details step and on the Chapters page; a published book's
page lists its chapters, a chapter with "Chapter Page" ticked as a link.

<a id="fn-b"></a>
**b** — OJS (`3162c105bf`) and OPS (`e9f6f4f550`) carry no chapter grid
(`controllers/grid/users/chapter` absent), no `workType` on the
submission, no `StartSubmission` work-type field, and their workflow
configs (`workflowConfigEditorialOJS.js`, `…OPS.js`,
`useWorkflowNavigationConfigOJS.js`, `…OPS.js`) build no `chapters`
item, no `WorkflowWorkTypeOMP` header item and no `marketing` group; the
wizard's Chapters section comes only from OMP's
`SubmissionHandler::getDetailsStep()`. Live-probed 2026-09-28: note td1.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-28 (Purpose, the absence paragraph) on the
seeded journal and preprint server and a scratch one of each, as the
manager and the Author. The start screen's required fields are "Title",
"Section", "Submission Checklist" and "Privacy Consent" on the journal,
and "Title", "Submission Checklist" and "Privacy Consent" on the
preprint server, with no "Submission Type"; a draft's Details step has
no "Chapters" section; the version's pages list no "Chapters" in either
view; the header reads "Activity Log", "Library" (the preprint server
adds "Preview") with no work-type control; the side menu has no
"Marketing". Test run 2026-09-28 (scenario 11): the side menu's groups
read "Workflow" and "Publication" on the journal, "Workflow" and
"Preprint" on the preprint server, the version listing no "Chapters".
Control: on the seeded press all five are present, the
header reading "Activity Log", "Library", "Monograph" and "Marketing"
holding "Audience", "Representatives" and "Publication Dates".

<a id="fn-c"></a>
**c** — Who may change the list: `ChapterGridHandler::canAdminister()`
(read by `initFeatures()`, which also turns on ordering, and by every
write op): the Site Administrator always; on a published publication
(`status` published) any user holding a manager, sub-editor or assistant
role; otherwise, a submission with no `dateSubmitted` (a draft) always;
otherwise `Repo::submission()->canEditPublication()` (the edit gate).
`initialize()` additionally sets read-only on a published publication for
anyone without the site-admin, manager, sub-editor or assistant role.
Read-only: `ChapterGridCategoryRow` adds no "Delete",
`ChapterGridCategoryRowCellProvider` renders the title as a label
instead of the `editChapter` link, and no "Add Chapter" or "Order" is
added. Access to the grid at all: `PublicationAccessPolicy` on the role
assignments of the constructor (author, sub-editor, manager, assistant;
the reviewer role is granted `fetchGrid` and `fetchRow` too, but no
reviewer screen shows the list). The "Chapters" item: ui-library
`useWorkflowNavigationConfigOMP.js` pushes `chapters` in both
`getPublicationItemsAuthor()` and `getPublicationItemsEditorial()`,
outside the `canAccessProduction` block. Role defaults: OMP
`registry/userGroups.xml` (`permitMetadataEdit` on Press editor,
Production editor, Series editor; not on the assistant groups or the
author-level groups). Live-probed 2026-09-28 (Actors preamble, rows
1–4; Rule 3; Settings bullet 6): notes td2 and td3. A Volume editor, a
Chapter Author and a Translator, each the submitter of a book in
Copyediting, were turned away by the editorial address and saw in their
own view "Chapters" with the plain-text list, a header with "Library"
alone and no "Marketing". Settings › Users & Roles › Roles › Edit had
"Permit submission metadata edit." ticked for the Series editor and
unticked for the Author, Layout Editor, Copyeditor and Volume editor. On
a book still in the Submission stage, "Chapters" opened for the Author
and the Press manager.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-28 (Actors rows 1 and 3; Rule 3; Settings
bullet 6), two runs. On a submitted, unpublished book in Copyediting the
Press manager, Press editor, Production editor (none assigned), the Site
Administrator and an assigned Series editor with the permission got "Add
Chapter", "Order", title links and the arrow with "Delete"; a Series
editor assigned without the permission, the assigned Copyeditor and the
Author got the plain-text list, with no arrow. The assigned Layout
Editor, Designer and Funding coordinator saw "Publication" with no
version under it, and the Chapters page opened by its address showed
"You don't currently have access to that stage of the workflow." On a
book in Production the assigned Layout Editor, Designer, Indexer and
Proofreader got the plain-text list, and the Copyeditor, Marketing and
sales coordinator and Funding coordinator found no version. When the
Press manager ticked the "Permissions" box of the Author's, then the
Layout Editor's, assignment ("Edit Assignment" in the Participants
panel), each got the full controls and a chapter they added was kept
after a reload; a Copyeditor assigned with the box ticked could change
the list too; unticking the Layout Editor's box brought back the
plain-text list. Which stages show an assistant the version's pages is
*Workflow screen & stage access*'s Rule 9.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-28 (Actors row 4; Rule 14; A1). On a
published book the Press manager, Press editor, Production editor, the
Site Administrator, both assigned Series editors (with and without the
permission) and all seven assigned assistant roles got "Warning: This
version has been published. Editing it may impact the published
content." above the list, with "Add Chapter", "Order", title links and
"Delete". The Layout Editor's "Add Chapter" › "Epilogue" › "Save" showed
"Your changes have been saved."; the chapter stayed after a reload and
appeared in a reader's table of contents. The Layout Editor also saved a
subtitle and deleted a chapter, and the Series editor without the
permission and the Funding coordinator added chapters. The Author got
"This version has been published and can not be edited." above the
plain-text list.

<a id="fn-d"></a>
**d** — The control: ui-library
`src/pages/workflow/components/header/WorkflowWorkTypeOMP.vue`
(`DropdownActions`; label `submission.workflowType.editedVolume.label`
"Edited Volume" or `common.publication`, which OMP's `locale.po`
renders "Monograph"; actions `setAsEditedVolume`, `setAsAuthoredWork`),
pushed unconditionally by `workflowConfigEditorialOMP.js::getHeaderItems()`;
the author config's `getHeaderItems()` pushes only "Library". The
choice: `useWorkflowActions.js::workflowChangeWorktype()` sends `PUT
api/v1/submissions/{id}` with `{workType}`, then the store's
`triggerDataChange()` reloads the submission; no dialog precedes it.
That route sits in lib/pkp `PKPSubmissionController::getGroupRoutes()`
behind `roleAuthorizer([MANAGER, SUB_EDITOR, AUTHOR])` plus
`SubmissionAccessPolicy` (a sub-editor must be assigned); no
`canEditPublication()` check. Other roles get 401 with
`user.authorization.roleBasedAccessDenied` "The current role does not
have access to this operation."; `useFetch` shows it through
`modalStore.openDialogNetworkError()` (title `common.error` "Error",
button "OK"). Live-probed 2026-09-28 (Fields, the work-type control;
Actors row 6; Rule 13): notes td4 and td16; the button's name is
exactly "Monograph" or "Edited Volume", and its menu lists "Edited
Volume", then "Monograph". Choosing the entry already shown still sends
the same request and reloads the submission.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-28 (Actors row 6; A2), two runs. The Press
manager, Press editor, Production editor, the Site Administrator and
assigned Series editors with and without the permission changed the
type with no window before it, and the control read the new type after
a reload (for the Site Administrator the label updated a second or two
later). The assigned Layout Editor, Copyeditor, Designer and Marketing
and sales coordinator were offered the control with "Edited Volume" and
"Monograph"; their choice answered 401 and opened "Error", "The current
role does not have access to this operation.", "OK", and the control
read "Monograph" after a reload. On a book in Copyediting, the Layout
Editor, who cannot open that stage, still had the control and the
"Marketing" group. The Author's header read "Library" alone; the
wizard's "Change" offered both types, the current one selected.

<a id="fn-e"></a>
**e** — The page: `useWorkflowNavigationConfigOMP.js::getMarketingItems()`
(`publicationDates`, `grid.catalogEntry.publicationDates` "Publication
Dates"; the group only for `EDITORIAL_DASHBOARD`; heading from
`getMarketingTitle()`, "Marketing: {label}"); `workflowConfigEditorialOMP.js`
`MarketingConfig.publicationDates` → `WorkflowMarketingForm`
(`formName: 'publicationDates'`), which loads `GET
api/v1/submissions/{id}/publications/{firstPublicationId}/_components/publicationDates`
(OMP `SubmissionController`, roles sub-editor, manager, site admin,
assistant) and saves with `PUT api/v1/submissions/{id}` (the route of
note d: manager, sub-editor, author). The form: OMP
`classes/components/forms/submission/PublicationDatesForm.php`, field
`enableChapterPublicationDates` (radio, options `false`
"submission.catalogEntry.disableChapterPublicationDates", `true`
"…enableChapterPublicationDates"), value the submission's stored value;
`omp/schemas/submission.json` gives the property no default, so a new
book stores none. The chapter form reads it as
`(bool) getEnableChapterPublicationDates()`. `Form.vue::error()` shows
`common.unknownError` for a 401. Live-probed 2026-09-28 (Fields, the
page; Actors row 7; Rule 11; Settings bullet 1): notes td5 and td12;
with "All chapters…" chosen and not saved, opening "Audience" asked
nothing, and back on the page, and after a reload, the saved "Each…"
was selected (two runs).

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-28 (Actors row 7; Rule 11; A2), two runs.
A new book opened the page with neither option selected, for the Press
manager and for the Layout Editor. The Press manager, Press editor,
Production editor, the Site Administrator and assigned Series editors
with and without the permission saved a choice, saw "Saved", and found
it selected after a reload. The assigned Layout Editor, Copyeditor and
Marketing and sales coordinator had "Save" pressable; it answered 401
and showed "An unexpected error has occurred. Please reload the page and
try again.", the page kept showing the new choice selected, and a reload
showed the stored choice unchanged. The Author's view had no
"Marketing", and the page's address landed on "Workflow: Production"
with no choice.

<a id="fn-f"></a>
**f** — The grid: `ChapterGridHandler::initialize()` (title
`submission.chapters` "Chapters"; "Add Chapter" `submission.chapter.addChapter`;
columns `common.name` "Name", `email.email` "Email", `common.role`
"Role", the role cell from `Author::getLocalizedContributorRoleNames()`
in `ChapterGridAuthorCellProvider`); category rows are the chapters
(`loadData()` → `ChapterDAO::getByPublicationId()`, ordered by `seq`),
their rows the chapter's authors (`loadCategoryData()` →
`Chapter::getAuthors()`); the chapter cell shows
`getLocalizedTitle()` (no subtitle). Empty grid: `grid.noItems` "No
Items". The wizard section: OMP `pages/submission/SubmissionHandler.php::getDetailsStep()`
appends the `chapters` section (name "Chapters", description
`submission.wizard.chapters.description`) after the parent's sections
for both work types, fed by the current publication. Workflow:
`ChapterManager.vue` is keyed by submission and publication, so the
version switch reloads it. When the grid redraws a changed chapter,
lib/pkp `OrderItemsFeature.js::updateOrderLinkVisibility_()` shows
"Order" by the count of `getRows()`, chapter rows and author rows
alike. Live-probed 2026-09-28 (Fields, the chapter
list; Rule 2): "Add Chapter" alone on an empty list and on a list of
one chapter as the page opened, "Order" from two chapters; after
"Save" of a first chapter with no author, "Add Chapter" alone;
after an in-place change, "Order" above a one-chapter list whose
chapter had an author; "Tides" with the subtitle "A
Study" listed as "Tides", a link for the Press manager, the permitted
Series editor and the Site Administrator and plain text for the others;
the arrow before the title (named "Settings" for a screen reader)
opening a line with "Delete"; a Role cell reading "Author, Volume
editor"; "No Items" on an empty list and under each chapter with no
authors, gone once an author was ticked. In the wizard the description
quoted, and "Chapters" the last Details section after "Submission
Details" and "Funders", for both work types. After "Create New Version"
version 1.1 listed its own chapters and version 1.0 its own. The
journal's and preprint server's Details steps hold "Submission Details"
and "Funders" only. Test run 2026-09-28 (Fields, the chapter list;
scenario 1): after "Save" of the first chapter, "Tides" with Ben
Barrow, "Order" and "Add Chapter" stood above it throughout a
ten-second wait.

<a id="fn-g"></a>
**g** — The window: `ChapterGridHandler::addChapter()` →
`editChapterTab()` (the bare form, window title "Add Chapter");
`editChapter()` renders `templates/controllers/grid/users/chapter/editChapter.tpl`
(tabs `grid.action.editMetadata` "Edit Metadata" and, for manager,
sub-editor and assistant roles when `enablePublisherId` holds `chapter`
or a pub-id plugin enables `Chapter`, `submission.identifiers`
"Identifiers"). The form: `form/ChapterForm.php`,
`templates/controllers/grid/users/chapter/form/chapterForm.tpl` (Title
`common.title`, `maxlength="255"`, multilingual, required; Subtitle
`metadata.property.displayName.subTitle`, `maxlength="255"`; Abstract
`common.abstract`, rich `extended`; Pages `submission.chapter.pages`;
"Date Published" `publication.datePublished` under
`$enableChapterPublicationDates`, class `datepicker`; "License URL"
`publication.chapter.licenseUrl` under `WORK_TYPE_EDITED_VOLUME`;
"Chapter Page" `publication.chapter.landingPage` with the box
`publication.chapter.hasLandingPage`; `submission.submit.addAuthor` "Add
Contributor" under `$chapterAuthorOptions`; `submission.files` "Files"
under `$chapterFileOptions`; `common.requiredField`; `fbvFormButtons`
"Save"). Save: `updateChapter()` validates (`FormValidatorLocale` on
`title` in the publication's locale, message
`metadata.property.validationMessage.title` "Please enter a valid
title.", plus POST and CSRF checks), creates a trivial notification (the
default success text "Your changes have been saved."), executes, and
returns a data-changed event; a failed validation returns a bare
`JSONMessage(false)` with no form. In the browser the form's own
required-field check answers an empty title first, so no request is
sent. `execute()` inserts a new chapter at `REALLY_BIG_NUMBER`, then
`resequenceChapters()`. Live-probed 2026-09-28
(Fields, the chapter window and its table; Rules 4, 5; Settings bullet
5): "Add Chapter" opened "Add Chapter" with no tabs, a title "Edit
Chapter" with "Edit Metadata"; "Identifiers" joined it on a press with
"Enable for Chapters" under "Publisher ID" and on one with the URN
plugin on for chapters, not on a press with DOIs for chapters, even for
a chapter with a DOI; with every identifier off it was absent. Subtitle
stopped at 255; the abstract is a rich-text editor with a language
switch on a two-language press; "not pages !! ?? xii–iv" saved unchanged
in Pages; "Date Published" opened a calendar. "Alpha", then "Beta" read
Alpha, Beta on the page and after a reload. "Save" closed the window
with "Your changes have been saved." (beside the wizard's "Last saved"
line there), and two chapters added in the wizard were there when it
was reopened without "Save for Later". "Cancel" after typing closed with
no question, and "Add Chapter" reopened empty. The close arrow with a
typed change asked "The data on this form has changed. Do you wish to
continue without saving?", and "Cancel" there kept the window and the
text (four runs); switching to "Identifiers" with a
changed box asked the same, and continuing dropped the change (two
presses); leaving the page with a title typed in "Add Chapter" raised
the browser's "Leave site?", and after leaving the list held no new
chapter (two runs).

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-28 (Fields, Title). An empty Title with
"Save" showed "This field is required." under the box; the window stayed
open, the list was unchanged and no request was sent. 300 characters
typed left 255 in the box, and 255 after saving and reopening. On a
press whose form languages are English and French, two boxes show, the
book's language first; a title typed in the French box only was refused
under the English box on an English book, and the reverse on a French
book, and filling the book's own language saved. On a press whose only
form language is English but whose submission languages are English
and French, one box shows, in the book's language: English on an
English book, French on a French book, where the title saved under
French.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-28 (Fields, Add Contributor; Rule 6). On a
book whose Contributors list read Alma (the submitter), Ada, Ben, Cy,
"Add Chapter" offered the four in that order, unticked. With Ben ticked
alone and saved, the reopened window listed Ben (ticked), then Alma, Ada,
Cy; with Ada ticked as well, the rows under the chapter read Ben, Ada. A
book whose only contributor was deleted showed no "Add Contributor", and
its chapter saved. In the wizard the Details step offered only the
submitting Author; after "Zed Zephyr" was added on the Contributors
step, the reopened chapter offered both.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-28 (Fields, Files; Rule 7). On a book with
a file on "Submission Files", a message attachment in "Desk Review Tasks
& Discussions", a review round's "Files for Review" file, a "Production
Ready Files" upload and a publication format's proof file, "Files"
listed all five once each, by file name, in no fixed order; a name
appeared twice only where two files share it. A book with no file, or
whose only file another chapter holds, shows no "Files".

<a id="fn-h"></a>
**h** — The panel: OMP `templates/submission/review-chapters.tpl`
(heading `submission.chapters`, "Edit" → `openStep()`), fed by the page
state `chapters` from `getDetailsStep()`
(`ChapterGridHandler::getChapterData()`: `getLocalizedFullTitle()`,
title and subtitle joined by `PKPString::concatTitleFields()`, and the
authors' full names joined by `common.commaListSeparator`); ui-library
`SubmissionWizardPageOMP.vue` pushes on `chapter:added`, replaces on
`chapter:edited`, filters on `chapter:deleted` (the global events
`updateChapter()` and `deleteChapter()` send); `saveSequence` sends no
such event. The panel's "Edit" calls `openStep('')`: the template reads
`$step.id`, which is empty in the hook that renders it, so no step
opens. OMP has no `validateSubmit` override touching chapters
(*Submission wizard*, note l there). Live-probed 2026-09-28: note td18.

<a id="fn-i"></a>
**i** — `workType` is read by OMP `ChapterForm::initData()` (the chapter
license description) and `chapterForm.tpl`, `PublicationLicenseForm`
(the default chapter license field), `publication\Repository::addChapterLicense()`,
`SubmissionHandler::getSubmittingTo()`, `templates/frontend/components/authors.tpl`
and `CatalogBookHandler` (volume editors), and the native and CSV
import/export filters; nothing reads it to add or hide chapters. The
wizard showing the Chapters section for both types: live-probed
2026-08-25 (*Submission wizard*, note fn-omp1 there). Live-probed
2026-09-28 (Rule 1; Settings bullet 2): "Monograph: Authors are
associated with the book as a whole." preselected under "Submission
Type"; the Details step's "Chapters" for both types, and "Change" to
Monograph leaving a draft's list unchanged; "Permissions & Disclosure"
adding "Default Chapter License URL" on the Edited Volume only;
"Submitting an Edited Volume." and "Submitting a Monograph.", rewritten
by "Change" and kept after a reload. Through the header's "Preview", an
Edited Volume with no "Volume editor" credited every author; once one
contributor had that role, the page credited "Ben Tide (ed)" alone;
switched to Monograph, every author again with no "(ed)" (two runs).

<a id="fn-j"></a>
**j** — `ChapterForm::fetch()`: `chapterAuthorOptions` = the chapter's
authors (collector `filterByChapterId`, `filterByPublicationIds`), then
every other author of the publication; `execute()` removes the chapter's
author links (`removeChapterAuthors()`) and re-adds the ticked ones with
`seq` = their position among the posted boxes. `submission_chapter_authors.author_id`
references `authors` with `onDelete('cascade')` (OMP
`OMPMigration`), so a deleted contributor leaves every chapter.
`Chapter::getAuthors()` is what the chapter page credits. Live-probed
2026-09-28 (Rule 6): notes td7 and td10; a chapter saved with no author;
a published chapter with the submitter ticked credited her under
"Authors" on its own page, and the book's table of contents listed her
name under the chapter.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-28 (Rule 6; Side effects bullet 3). Ben,
the author of "Tides", deleted on the Contributors page no longer showed
under "Tides", whose window then offered Ada (ticked), Alma and Cy. Ada,
the author of two chapters, deleted left both reading "No Items". The
submitter, ticked on a chapter in versions 1.0 and 1.1 and deleted from
1.1's Contributors list, left 1.1's chapter and stayed on 1.0's.

<a id="fn-k"></a>
**k** — `ChapterForm::fetch()`: `Repo::submissionFile()->getCollector()->filterBySubmissionIds()`
with no file-stage filter (so every stage, dependent files included,
since the collector drops dependent files only when a stage filter is
set); a file is offered when its `chapterId` is empty or is this
chapter's; the label is the file's localized `name`. `execute()` →
`submissionFile` DAO `updateChapterFiles()` with the ticked ids.
Live-probed 2026-09-28 (Rule 7): notes td8 and td9.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-28 (Rules 7, 9). A file ticked in chapter
"One" was not offered in "Two"; unticked in a chapter, it was offered to
another again; after "One" was deleted ("Delete" › "OK"), "Two" was
offered it again.

<a id="fn-l"></a>
**l** — `ChapterGridHandler::initFeatures()` adds
`OrderCategoryGridItemsFeature(ORDER_CATEGORY_GRID_CATEGORIES_AND_ROWS)`
for those `canAdminister()` allows: the grid action `grid.action.order`
"Order", a handle per chapter and per author row, and
`gridOrderFinishControls.tpl` ("Done" `common.done`, "Cancel ordering"
`grid.action.cancelOrdering`). `saveSequence` (CSRF-checked) calls
`setDataElementSequence()` (chapter `seq`) and
`setDataElementInCategorySequence()` (removes and re-adds the author
link with the new `seq`), both guarded by `canAdminister()`. In the
page, a press on a chapter row starts the drag of that chapter's own
author sortable (items `tr.orderable`), not of the chapter list's
(items `tbody.orderable`). Live-probed 2026-09-28: note td11.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-28 (Rule 8; Rule 16; A6, A7). "Order"
showed a handle on every chapter and author row with "Done" and "Cancel
ordering", and chapter titles stopped being links. In six runs on five
books, the wizard among them, a chapter dragged above another never
moved, and "Done" left the order unchanged; dragging a chapter title
only moved it in among its own authors. Of two authors, the second
dragged above the first with "Done" held, on the page and after a
reload; after an earlier "Order" › "Done" in the same visit, the same
drag and "Done" showed the old order at once and after a reload, on two
books, while with three authors the drag held. The page posts the new
order, and both author links are then stored at the same position.
"Cancel ordering" after an author move put the list back, on the page
and after a reload. In the wizard, a chapter's authors reordered with
"Done" read in the new order on the Details step while the Review panel
kept the old order until a reload. A reader's table of contents follows
the stored chapter order.

<a id="fn-m"></a>
**m** — `ChapterGridCategoryRow::initialize()`: `RemoteActionConfirmationModal`
with text `common.confirmDelete` "Are you sure you wish to delete this
item? This action cannot be undone.", title `common.delete` "Delete",
buttons "OK" and "Cancel" (`ConfirmationModal` defaults).
`deleteChapter()` removes the chapter's author links, then
`ChapterDAO::deleteById()` deletes the files' `chapterId` settings and
the chapter; no notification. Live-probed 2026-09-28 (Rule 9): the
arrow, then "Delete", opened the window quoted; "Cancel" kept the
chapter; "OK" removed it at once with no notice, still gone after a
reload; its file was offered to the other chapter again, the author
stayed on the Contributors list, and nothing offered an undo.

<a id="fn-n"></a>
**n** — OMP `classes/monograph/Chapter.php`: `isPageEnabled()` returns
true when the stored flag is set or the chapter has a DOI;
`setPageEnabled()` stores true whenever a DOI exists. `ChapterForm::initData()`
reads `isPageEnabled()`; `fetch()` assigns `doi`, which shows
`publication.chapter.landingPage.doi.description`. The reader-side check
(`CatalogBookHandler`: a chapter request for a chapter without its page
answers not found) is *Monograph landing page*'s. Live-probed
2026-09-28 (Fields, Chapter Page; Rule 10; Settings bullet 4): note
td14; the box is unticked in "Add Chapter".

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-28 (Rule 10; Settings bullet 4), on two
presses and a seeded publish. A new press's "Items with DOIs" had
"Monographs" ticked and "Chapters" unticked; with "Chapters" off and
DOIs made "Upon publication", publishing gave no chapter a DOI. With
"Chapters" on, publishing gave a DOI only to "Tides", whose "Chapter
Page" was ticked; its box then showed ticked with "(This chapter will
always be shown on its own page because it has a DOI.)". "Harbours",
unticked, got none, and ticking its box after publishing gave it none.
Unticking "Tides"' box and pressing "Save" showed "Your changes have
been saved.", and the box reopened ticked with the note, at once and
after a reload.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-28 (Rule 11; Settings bullet 1), two
runs. A new book's chapter windows had no "Date Published"; after "Each
chapter may have its own publication date." ("Saved", still selected
after a reload) both chapters showed it; "2024-05-01" saved read back
after reopening and after a reload; after "All chapters…" the box was
gone, and after "Each…" again it showed 2024-05-01. On a published book
given a second version (one run), the page read "Each…" and both
versions' windows showed 2024-05-01; after "All chapters…" neither did.

<a id="fn-o"></a>
**o** — The sentence: `ChapterForm::initData()` builds
`submission.license.description` ("The license will be set
automatically to <a href='{$licenseUrl}'>{$licenseName}</a> when this is
published.") from the publication's `chapterLicenseUrl`, else its
`licenseUrl`, else the press's `licenseUrl`, naming a Creative Commons
address by its `Application::getCCLicenseOptions()` name and any other
by the address itself; only for `WORK_TYPE_EDITED_VOLUME`, whatever the
chapter's own `licenseUrl` and the publication's status. The fill:
OMP `publication\Repository::addChapterLicense()` on the
`Publication::publish::before` hook: when the new status is published and
the work type is Edited Volume, an empty `chapterLicenseUrl` takes
`licenseUrl`, and every chapter with no license takes `chapterLicenseUrl`
(`ChapterDAO::updateLocaleFields()`). `ChapterForm::readInputData()`
reads `licenseUrl` with no validation. Live-probed 2026-09-28: note
td13; an address is named by its Creative Commons name only when it
matches one of the press's license choices exactly (with a trailing "/"
it shows as the address).

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-28 (Rule 12; Settings bullet 3; Side
effects bullet 4; A8). A new scratch press has no license (Settings ›
Distribution › License opens on "Other license URL", empty), so its
Edited Volumes' chapter windows showed no sentence; "CC Attribution
4.0" was saved there first. The sentence read "…to CC Attribution 4.0…"
with the press license alone (the name a link), "…to CC
Attribution-NonCommercial 4.0…" with the version's own "License URL",
and "…to https://example.org/chapter-default…" with that "Default
Chapter License URL"; a Monograph's window had no "License URL". Each
volume published on screen: its empty "Tides" then held, in turn, the
press's address, the version's and the chapter default, and an empty
"Default Chapter License URL" was filled from the version's "License
URL"; "Harbours" kept https://example.org/own-license. A Monograph's
chapter got no license, its box empty once the book was switched to
Edited Volume. The sentence showed above "Harbours"' own address before
and after publishing, and on published volumes (two runs each). With a
license on the press or the version, "Default Chapter License URL"
arrived greyed out behind "Override"; with none anywhere it was open.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-28 (Rule 13; Settings bullet 2), two
runs. The Press manager's "Edited Volume" asked nothing, and the control
read "Edited Volume" at once and after a reload. The chapter showed an
empty "License URL" with no sentence (no license on that press);
"https://example.org/own-license" saved; "Monograph" hid the box with
the authors, the file and the list unchanged; "Edited Volume" again
showed the address. Choosing the entry already shown changed nothing.
A published Monograph switched to Edited Volume read "Edited Volume" at
once, and its chapter window showed "License URL". The Chapters page's
rows were the same before and after each switch.

<a id="fn-p"></a>
**p** — The lines: ui-library `workflowConfigEditorialOJS.js`
`PublicationConfig.common.getPrimaryItems()` pushes
`WorkflowPublicationEditWarning` (`publication.editorEditWarning`) and
`workflowConfigAuthorOJS.js` pushes `WorkflowPublicationEditDisabled`
(`publication.editDisabled`, which OMP's `submission.po` words "This
version has been published and can not be edited.") for a published
version, with `shouldContinue`; `useWorkflowConfigOMP.js` deep-merges
the OJS configs under the OMP ones, so the Chapters page gets them
before `ChapterManager`. History: omp `92fd2bb60` (2025-05-28,
pkp/pkp-lib#10263 "Relax editing metadata on published/posted
materials") replaced the published-version lock of `canAdminister()`
and `initialize()` with the manager, sub-editor and assistant opening.
Live-probed 2026-09-28 (Rule 14): note td3; "Prologue", added by the
Press manager to a published book, was at once in a reader's table of
contents.

<a id="fn-q"></a>
**q** — OMP `publication\Repository::version()`: clones every chapter
(`insertChapter()`, the DOI dropped only with DOI versioning on a major
version), re-links authors through the old-to-new author map built by
position, and re-points `chapterId` only on the files it copies itself,
the publication formats' files (`$newSubmissionFiles`); every other file
keeps the old chapter's id, which `ChapterForm::fetch()` then treats as
held by another chapter. Live-probed 2026-09-28 (Rule 15): note td15.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-28 (Rule 15; A3). A published book whose
"Tides" carried the subtitle "A Study", an abstract, pages "1-24", the
date 2024-05-01, its own license, "Chapter Page" ticked, the author Ben
and the files `article.pdf` (a Chapter Manuscript) and `replacement.pdf`
(the "PDF" format's proof file), and whose "Harbours" had pages "25-40"
and Ada, got "Create New Version". The new version listed "Tides" (Ben),
then "Harbours" (Ada). Its "Tides" window held every value, with Ben
ticked as the new version's copy of him, and "Files" listed only the
new copy of `replacement.pdf`, ticked; `article.pdf` was not listed, and
the new "Harbours" had no "Files". The earlier version's "Tides" still
held both files, ticked.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-28 (Fields, the Review panel; Rule 16;
A5). On a draft Edited Volume the Review step listed the panels "Files",
"Details", "Chapters", "Contributors" and "For the Editors"; "Chapters"
read "Tides: A Study" over "Alma Author, Ada Lovel, Ben Barrow", then
"Harbours" with no line under it; a Monograph draft showed the same
panel. Its "Edit" left the wizard on "5 Review" (two runs), while the
"Details" panel's "Edit" opened "2 Details". A subtitle edit, an added
chapter and a deletion on the Details step showed in the panel at once.
As the Author, an Edited Volume and a Monograph with no chapter showed
the panel with its heading and "Edit" alone and no problem listed, and
"Submit" completed with "Submission complete". The journal's and
preprint server's Review steps have no "Chapters" panel.

<a id="fn-r"></a>
**r** — No `Repo::eventLog()` / `SubmissionLog` call in
`ChapterGridHandler`, `ChapterForm`, lib/pkp
`PKPSubmissionController::edit()` or the submission repository's
`edit()` for `workType` or `enableChapterPublicationDates`; no mailable
or notification other than the trivial "saved" one of note g.
Live-probed 2026-09-28 (Side effects): note td17.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-28 (Side effects bullets 1–2). The Press
manager added two chapters, edited one, pressed "Order" › "Done",
deleted one, switched the type to Edited Volume and saved "Publication
Dates". The Activity Log kept the same eight lines, the mail catcher's
counts for the manager, the Author and a contributor did not change,
and the manager's and the Author's Tasks panels held the same items.

<a id="fn-s"></a>
**s** — Scenario seeding. Scenarios 2, 4 to 6 and 10 run on OMP
`publicknowledge` with ready accounts (passwords as `docs/process/users.md`
gives them): `manager.maya` (the Press manager), `sectioneditor.ana` (the
Series editor), `copyeditor.carla` (the Copyeditor), `layouteditor.leo`
(the Layout Editor) and `author.alex` (the Author, Alex Author, the
books' submitter). Scenarios 1, 3 and 7 read the chapter window's "Your
changes have been saved.", which the server queues for the person who
saved and hands to that person's next page load in any browser
(`updateChapter()` calls `createTrivialNotification()`; lib/pkp
`SiteHandler.js` `notifyUser` → `fetchNotification`), so a parallel test
signed in as the same ready account can take it first. They therefore
run on a scratch press from `POST scenarios/context` with a throwaway
`manager` (the Press manager) and a throwaway `author` (the Author, Ava
Author, the books' submitter), passwords the username twice, the
givens' roles unchanged. Every book is a scratch submission from `POST
scenarios/submission` with its press's Author as `submitter`, `workType:
'editedVolume'` for an Edited Volume (a Monograph is the default), the
named contributors as `contributors[]` (`{givenName: 'Ada', familyName:
'Lovel', email: 'ada@example.org'}`, `{givenName: 'Ben', familyName:
'Barrow', email: 'ben@example.org'}`), the files as `files[]` (`{file:
'article.pdf'}`, `{file: 'notes.md'}`), and the chapters as `chapters[]`,
each `authors` the addresses in Contributors-list order and `files`
`['files.0']` for article.pdf. Scenario 1: both contributors and both
files, no chapter. Scenario 2: the same, with `chapters: [{title:
'Tides', authors: ['ada@example.org', 'ben@example.org'], files:
['files.0']}, {title: 'Harbours', authors: ['ada@example.org']}]`.
Scenario 3: `submitted: false`, `workType: 'editedVolume'`, `files:
[{file: 'article.pdf'}]` and no `contributors[]`; the test opens the
draft's wizard on the Details step. Scenario 4: `decisions:
['skipExternalReview']` (Copyediting), Ben Barrow as the one contributor
and the author of "Tides", and
`participants[]` for `copyeditor.carla` (`copyeditor`),
`layouteditor.leo` (`layoutEditor`) and `sectioneditor.ana`
(`sectionEditor`, `canChangeMetadata: false`); an assistant role reads
the list only on a book in its own stage (Actors row 1). Scenario 5: Ben
Barrow as the one contributor, and he and article.pdf on "Tides". Scenario 6: "Tides" alone, no
`enableChapterPublicationDates`. Scenarios 7, 9 and 10: `published:
true`, which also makes the chapter DOIs, as a screen publish does.
Scenario 10's "Tides" carries `subtitle: 'A Study'`, `pages: '1-24'`,
`page: true` and Ben Barrow, its "Harbours" `pages: '25-40'` and Ada
Lovel (both contributors). The chapters of scenarios 6, 7 and 9 have no
author. Scenario 8 builds its scratch press the same way as scenarios 1,
3 and 7, with no license (a new press has none); its three books take `decisions:
['skipExternalReview', 'sendToProduction']`, the first volume's
"Harbours" `licenseUrl: 'https://example.org/own-license'`. The API has
no license key for a press or a version, so the test types and saves the
two versions' "License URL" and the second volume's "Default Chapter
License URL" on each version's "Permissions & Disclosure" page before the
scenario starts. Scenario 9 builds its scratch press the same way with
`enableDois: true`, `doiPrefix: '10.1234'`, `enabledDoiTypes:
['publication', 'chapter']` and `doiCreationTime: 'publication'`, its
book's "Tides" `page: true`; its control is a `published: true` book on
`publicknowledge`, whose "Items with DOIs" tick "Monographs" alone.
Scenario 11 runs on `publicknowledge` of OJS and OPS as `manager.maya`
(the Journal Manager, the Preprint Server Manager) and `author.alex`, the
draft `submitted: false`; its control on OMP `publicknowledge` with the
same accounts, a draft book and a submitted one. The mail catcher of scenario 1 is read by the three
addresses. Live-probed 2026-09-28: Settings › Users & Roles showed each
account with the role named; `POST scenarios/context` answered 400
`Unsupported spec key "licenseUrl"` (two runs). Test run 2026-09-28: scenarios 1, 3
and 7 passed on scratch presses built so.

<a id="fn-f-a1"></a>
**f-a1** — Notes c and p: the published branch of
`ChapterGridHandler::canAdminister()` and `initialize()` checks the
role alone (`ROLE_ID_ASSISTANT` among them), while the unpublished
branch calls `canEditPublication()`. `PublicationFormatGridHandler` got
the same opening in the same commit (*Publication formats & proof
terms*). Live-probed 2026-09-28: notes td2 and td3. On the version's
other pages, the Layout Editor and the Series editor without the
permission had "Save" greyed out on "Title & Abstract", "Metadata",
"Catalog Entry" and "Permissions & Disclosure", no "Add Contributor",
and "Add" and "Delete all references" greyed out on "References",
unpublished and published alike; "Add publication format" and "Add
Media File" were offered to both, and the Series editor's new format
was saved and listed after a reload (two runs; "Add Media File" was not
pressed).

<a id="fn-f-a2"></a>
**f-a2** — Notes d and e: the header item and the Marketing page are
pushed with no role or permission test, the form loads for the assistant
role, and the save route admits manager, sub-editor and author only.
Live-probed 2026-09-28: notes td4 and td5; the refused "Publication
Dates" save carries the same server message as the work-type refusal,
which the form replaces with its generic notice. The Layout Editor's
"Save" on "Audience" answered 401 with the same notice (two runs).

<a id="fn-f-a3"></a>
**f-a3** — Note q. Live-probed 2026-09-28: note td15; in the stored data
`article.pdf` keeps the old chapter's id, and the new proof file points
at the new chapter.

<a id="fn-f-a4"></a>
**f-a4** — Note g (the `datepicker` field). Live-probed 2026-09-28, in
two processes: "Harbours", undated, on both versions of a book with
dates per chapter showed "2026-09-28" in "Date Published" while its
stored date was empty; "Save" with the box untouched posted an empty
date, and the next opening showed the date again.

<a id="fn-f-a5"></a>
**f-a5** — Note h: the panel's "Edit" calls `openStep('')`.
Live-probed 2026-09-28: note td18, two runs and a second press after a
pause.

<a id="fn-f-a6"></a>
**f-a6** — Note l: the drag a chapter row starts belongs to that
chapter's author rows. Live-probed 2026-09-28: note td11, six runs.

<a id="fn-f-a7"></a>
**f-a7** — Note l (`setDataElementInCategorySequence()`). Live-probed
2026-09-28: note td11, two books.

<a id="fn-f-a8"></a>
**f-a8** — Note o: the sentence is built for every chapter of an Edited
Volume, whatever its own address or the version's status. Live-probed
2026-09-28: note td13, two runs each before and after publishing; a
Monograph published with a version license and then switched to Edited
Volume showed the sentence above its empty box.

<a id="fn-f-a9"></a>
**f-a9** — Note o: the fill runs only on the publish hook, so a chapter
inserted later gets nothing. Live-probed 2026-09-28, one run: "Coda",
added to a published Edited Volume whose chapters had CC Attribution
4.0, kept an empty "License URL" after a reload under "The license will
be set automatically to CC Attribution 4.0 when this is published.". A
second run of the same settles it.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The workflow's "Chapters" page | workflow › "Publication" › the version › "Chapters", editorial and author views | AFFW-275, AFFW-425, VUE-031 |
| The chapter list (legacy grid in the Vue shell) | the Chapters page; the wizard's Details step, "Chapters" section; component `grid.users.chapter.ChapterGridHandler` | AFFW-572, AFFW-123, GRID-097 |
| "Add Chapter", "Edit Chapter" (tabs "Edit Metadata", "Identifiers") | the chapter list | AFFW-772 (the "Identifiers" tab cited; *Identifiers*) |
| The chapter form: "Save", "Chapter Page", "Add Contributor", "Files", "Date Published", "License URL" | the chapter window | AFFW-773, AFFW-774, AFFW-775, AFFW-776, AFFW-777 |
| "Order", "Delete" | the chapter list; `saveSequence`, `deleteChapter` | GRID-097 |
| The wizard's chapter list state | the wizard page (`chapter:added`, `chapter:edited`, `chapter:deleted`) | AFFW-111 |
| The wizard's Review panel "Chapters" | the wizard's Review step | AFFW-124 |
| The work-type control, "Edited Volume" / "Monograph" | the workflow's editorial header; `PUT api/v1/submissions/{id}` | AFFW-237, AFFW-238, AFFW-239 |
| "Marketing" › "Publication Dates" | the workflow's editorial side menu; `GET api/v1/submissions/{id}/publications/{publicationId}/_components/publicationDates`, `PUT api/v1/submissions/{id}` | AFFW-433 |

## Reference — code anchors

- Chapter grid: OMP `controllers/grid/users/chapter/ChapterGridHandler.php`,
  `ChapterGridCategoryRow.php`, `ChapterGridCategoryRowCellProvider.php`,
  `ChapterGridAuthorCellProvider.php`; lib/pkp
  `classes/controllers/grid/CategoryGridHandler.php`,
  `classes/controllers/grid/feature/OrderCategoryGridItemsFeature.php`,
  `OrderItemsFeature.php`, `templates/controllers/grid/feature/gridOrderFinishControls.tpl`,
  `classes/linkAction/request/RemoteActionConfirmationModal.php`.
- Chapter form: OMP `controllers/grid/users/chapter/form/ChapterForm.php`,
  `templates/controllers/grid/users/chapter/editChapter.tpl`,
  `templates/controllers/grid/users/chapter/form/chapterForm.tpl`.
- Model: OMP `classes/monograph/Chapter.php`, `classes/monograph/ChapterDAO.php`,
  `classes/author/Repository.php` (`addToChapter()`, `removeChapterAuthors()`),
  `classes/publication/Repository.php` (`version()`, `addChapterLicense()`),
  `classes/migration/install/OMPMigration.php` (`submission_chapters`,
  `submission_chapter_authors`), `schemas/submission.json` (`workType`,
  `enableChapterPublicationDates`), `schemas/publication.json`
  (`chapterLicenseUrl`).
- Wizard: OMP `pages/submission/SubmissionHandler.php` (`getDetailsStep()`,
  `getSubmittingTo()`, `getReconfigureSubmissionProps()`),
  `classes/components/forms/submission/StartSubmission.php`,
  `ReconfigureSubmission.php`, `templates/submission/chapters.tpl`,
  `review-chapters.tpl`; ui-library
  `src/components/Container/SubmissionWizardPageOMP.vue`.
- Workflow: ui-library `src/managers/ChapterManager/ChapterManager.vue`,
  `src/components/GridWrapper/GridWrapper.vue`,
  `src/pages/workflow/components/header/WorkflowWorkTypeOMP.vue`,
  `src/pages/workflow/composables/useWorkflowActions.js`
  (`workflowChangeWorktype()`),
  `useWorkflowConfig/workflowConfigEditorialOMP.js`,
  `workflowConfigAuthorOMP.js`, `useWorkflowConfigOMP.js`,
  `useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`,
  `src/pages/workflow/WorkflowPageOMP.vue`,
  `src/pages/workflow/components/publication/WorkflowMarketingForm.vue`; OMP `pages/workflow/WorkflowHandler.php`.
- Publication dates: OMP `classes/components/forms/submission/PublicationDatesForm.php`,
  `api/v1/submissions/SubmissionController.php` (`getPublicationDatesForm()`);
  lib/pkp `api/v1/submissions/PKPSubmissionController.php` (`edit()`),
  `classes/middleware/HasRoles.php`.
- Strings: OMP `locale/en/submission.po` (`submission.chapter*`,
  `submission.workflowType*`, `publication.chapter.*`,
  `submission.catalogEntry.*ChapterPublicationDates`,
  `publication.editDisabled`), `locale/en/locale.po` (`common.publication`,
  `grid.catalogEntry.publicationDates`); lib/pkp `locale/en/*.po`
  (`common.*`, `grid.action.*`, `submission.submit.addAuthor`,
  `publication.editorEditWarning`, `api.403.unauthorized`).
