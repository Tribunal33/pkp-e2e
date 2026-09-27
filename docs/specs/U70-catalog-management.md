---
name: catalog-management
status: verified
---

# Catalog management {OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A press shows its books to readers through its catalog. Press staff decide
which books are in it and how it presents them: they add finished books to
the catalog, mark some as **featured** (shown first, in an order the staff
choose) and some as **new releases**, for the whole catalog and separately
for each category and series, and they fill each book's **Catalog Entry**
page (its series, its categories, its cover, its web address). The work
happens on two screens: the press's **Catalog** page, reached from the
side menu's "Content" group, and the **Catalog Entry** page of each
version in a book's workflow. What readers then see (the public catalog,
the "New Releases" page, the category and series pages, the book's own
page) belongs to *Catalog browse* and *Monograph landing page*. <sup>a</sup>

A journal and a preprint server do not install catalog management. A
journal's side menu has a "Content" group holding "Issues" and no
"Catalog"; a preprint server's side menu has no "Content" group. On
both, the Catalog page's address answers with a not-found page, signed
in or out, and the workflows show neither a "Catalog Entry" page nor a
"Catalog Management" notice. A journal places an article through its
issue and its "Publication Settings" page, and a preprint server places a
preprint on its "Preprint entry" page
([Publish, schedule & versions](U49-publish-schedule-and-versions.md)).
<sup>b</sup> <sup>td1</sup>

## Actors & permissions

The manager-level roles of a press are Press manager, Press editor and
Production editor. "The Catalog page" is Content › "Catalog" in the side
menu; everything on it saves at once, with no page-level "Save". A
signed-out visitor who types the page's address gets the Login page.
<sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the Catalog page** | • Press manager, Press editor, Production editor: from the side menu's "Content" › "Catalog", on any press they hold the role in<br>• Site Administrator: the same, on every press, whether or not they hold a role there<br>• Series editor: the side menu offers no "Catalog", but the page's address opens the page with the first 30 books listed; nothing on it then works for them (the rows below) ⚠ [A1](#a1)<br>• every other role (the assistant roles such as Marketing and sales coordinator, Author, Reviewer, Reader): the access-denied page <sup>c</sup> <sup>td2</sup> |
| **Tick or untick "Featured" / "New release"** (Rules 6–8) | • Press manager, Press editor, Production editor, Site Administrator<br>• Series editor: the box changes, then a window headed "Error" says "The current role does not have access to this operation." with "OK", and the flag is not saved [A1](#a1) <sup>c</sup> <sup>td2</sup> |
| **Order the featured books** ("Order Features", Rule 10) | • the same roles as the row above; the Series editor's "Save Order" is refused the same way [A1](#a1) <sup>c</sup> |
| **Add books to the catalog** ("Add Entry", Rule 12) | • the same roles as the row above; for a Series editor the picker offers only books they are assigned to, and "Save" is refused with the passing notice "An unexpected error has occurred. Please reload the page and try again." [A1](#a1) <sup>c</sup> <sup>td2</sup> |
| **Search, filter, change page** (Rules 1, 3, 5) | • the same roles as the row above; a Series editor gets the "Error" window instead of a new list [A1](#a1) <sup>td2</sup> |
| **Open and save a version's "Catalog Entry" page** (Rule 13) | • whoever the workflow shows the page to: it is one of the version's pages in the editorial view, for roles with access to the Production stage ([Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)). The Author's view never lists it<br>• saving: whoever may edit the publication ([Publication metadata](U40-publication-metadata.md#edit-gate)); anyone else sees the page with its boxes open to typing and "Save" greyed out, so nothing they type can be saved <sup>d</sup> <sup>td3</sup> |
| **Read the "Catalog Management" notice** (Rule 14) | • every role that opens the book's Production stage, the Author included ⚠ [A2](#a2) <sup>e</sup> <sup>td15</sup> |

## Fields & validation

**The Catalog page.** Headed "Catalog", with one tab, "All Monographs",
holding a list headed "Monographs". In French the tab, the list's
heading, the column headings, each row's "View Entry" and two of the
boxes' screen-reader texts show raw keys, text such as
"##catalog.manage.featured##" in place of the words ⚠ [A7](#a7). Above
the list, left to right: <sup>f</sup>

| Control (UI label) | Shown | Rules |
|--------------------|-------|-------|
| "Search" box | always, except while ordering | Narrows the list (Rule 5). A cross in the box clears it. |
| "Filters" | always, except while ordering (a column already open stays, [A12](#a12)) | Opens and closes a column on the left headed "Filters", with a group "Categories" (every category of the press in alphabetical order, a sub-category by its own name with no parent) and a group "Series" (every series). A group is left out while the press has none. The chosen filter is marked and has a cross, named "Clear filter: {name}", that removes it. One filter at a time (Rule 3). |
| "Order Features" | while at least one book on the page is featured in the current list (Rule 10) | Starts ordering. While ordering it reads "Save Order", and "Cancel" stands next to it. |
| "Add Entry" | always, except while ordering | Opens the "Add Entry" panel (below). |

Two column headings stand over the boxes at the right of the rows, while
the list has any: "Featured" and "New release"; with a category filter
"Featured in category" and "New release in category"; with a series
filter "Featured in series" and "New release in series". <sup>f</sup>

| Row part | Rules |
|----------|-------|
| Number, authors, title | The book's number on the left; the authors' names in short form above its full title, in the page's language. |
| "View Submission" | Opens the book's workflow. |
| "View Entry" | Opens the book's public page (*Monograph landing page*). |
| The "Featured" box | Ticked or empty. A screen reader hears "This monograph is featured. Make this monograph not featured." or "This monograph is not featured. Make this monograph featured." (Rule 6). |
| The "New release" box | Ticked or empty. A screen reader hears "This monograph is a new release. Make this monograph not a new release." or "This monograph is not a new release. Make this monograph a new release." (Rule 7). |

**The "Add Entry" panel.** A panel that opens from the right, headed "Add
Entry", with a back arrow named "Close" at its top left. <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Find monographs to add to the catalog" | Not marked, but "Save" with the box empty is refused (Rule 12b) | Clicking in the box without typing suggests nothing. Type part of a title, an author's name, a word of the abstract or the book's number: the box suggests, one line per book with its title and in no fixed order, the press's books that sit in Copyediting or Production and are not published (unpublished or scheduled). Each chosen book shows as a tag inside the box with a cross named "Remove {title}". A chosen book is still suggested and can be chosen again ⚠ [A9](#a9). |
| "Save" | — | Adds the chosen books (Rule 12). |

"Close" or Escape shuts the panel without asking. Books chosen and not
saved are still chosen when "Add Entry" is pressed again, until the page
is left. <sup>g</sup>

**The "Catalog Entry" page.** Workflow › "Publication" › the version ›
"Catalog Entry", headed "Publication: Catalog Entry". Five groups, top to
bottom; "Save" at the foot. <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Placement** · "Series" | No | A list, "Choose the series where this publication will appear.", whose first choice is empty (no series). The series come in the order of Settings › Press › "Series", an inactive one as "{series} (Inactive)" ([Sections](U17-sections.md#order), its Rules 4 and 5). |
| **Placement** · "Series Position" | No | Free text, "Examples: Book 2, Volume 2". |
| **Placement** · "Categories" | No | The category picker ([Categories](U16-categories.md#category-picker)). Left out while the press has no category. |
| **Publication Timing** · "Date Published" | No | "The publication date will be set automatically when the catalog entry is published. Do not enter a publication date unless this work was previously published elsewhere and you need to backdate it." Anything but a date written YYYY-MM-DD is refused with "The date must be in the format YYYY-MM-DD, such as 2019-01-01." What a date does: Rule 13d. |
| **Version and Updates** · "Update Type", "Summary of Changes (Amendment Notice)" | No | "Update Type" offers 12 kinds, "New Version" chosen at first. As on a journal's "Publication Settings" page, but without its "Associated review round"; "Insert Content" included (Rule 13e). |
| **Display** · "Cover Image" | No | "Upload an image to represent this publication." An upload box ("Upload File", or drop a file on it); once an image is in, a preview, an "Alternate text" box and "Remove". After "Remove", until "Save", the box shows "Upload File" and "Restore Original". One image per language the book's metadata is kept in. |
| **Access** · "URL Path" | No | "An optional path to use in the URL instead of the ID." Letters and digits, with single ".", "-" or "_" between them; the refusals are Rule 13g. |

## Rules & state

1. **What the list holds.** The Catalog page lists the press's published
   books: those with a published version whose Publication Stage is
   "Version of Record" ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
   its Rule 8). A scheduled book, an unpublished one and a book whose only
   published version has another stage ("Author Original") are not
   listed. The list shows 30 books at a time, with page links under it
   once there are more. With no book to show it reads "No items found."
   <sup>f</sup> <sup>td4</sup>
2. **The list's order.** Books featured in the current list come first, in
   their featured order (Rule 10). The rest follow in the press's "Order
   of monographs" (Settings bullet 1), which on a new press is publication
   date, newest first. <sup>i</sup>
3. **One filter at a time.** "Filters" › a category or a series lists
   only that category's or series' books, and the boxes, the column
   headings and "Order Features" then work on that category's or series'
   flags, not the whole catalog's. A category's filter lists only the
   books placed in that category, not those placed only in one of its
   sub-categories. Choosing another filter replaces the first; choosing
   the active one again, or its "Clear filter" cross, removes it and
   brings back the whole catalog. Closing the column with "Filters"
   keeps the filter; the column headings then show that a filter is on,
   but not which. <sup>f</sup> <sup>td5</sup>
4. **The order with a filter.** With a filter, the books not featured
   there come in the category's or series' own "Order of monographs"
   (Settings bullets 2 and 3). An ascending choice ("Title (A-Z)",
   "Publication date (oldest first)", "Series position (lowest first)")
   is listed the other way round, and once a filter is removed the whole
   catalog comes back newest first by publication date, whatever the
   press's own "Order of monographs" says ⚠ [A3](#a3). <sup>i</sup>
   <sup>td6</sup>
5. **Search.** Typing words in "Search" and pressing Enter narrows the
   list, in the current filter, to the books where every typed word is
   found, whole or in part, in the title, the abstract or a
   contributor's name, or is the book's number. Clearing the box (its
   cross, or Enter on an empty box) brings the full list back.
   <sup>f</sup> <sup>td7</sup>
6. **Featured.** Pressing a book's empty "Featured" box ticks it and
   features the book in the current list: the whole catalog with no
   filter, else the chosen category or series. Pressing a ticked box
   unticks it and takes the book off that list's featured books. The
   change is saved at once, with no message, and the book keeps its place
   in the list until the page is reloaded, when it moves among the
   featured books (Rule 2); the reload shows the box as left.
   <sup>j</sup> <sup>td8</sup>
   - 6a. **What readers see.** A book featured in the whole catalog is
     listed first on the press's public catalog page, and on its home
     page while "Featured Books" is ticked; one featured in a series comes
     first on that series' page (*Catalog browse*). A category's page
     lists first every book featured anywhere (in the whole catalog, in
     any category, in its series), whatever that category's own boxes
     say ⚠ [A10](#a10). <sup>j</sup> <sup>td8</sup>
7. **New release.** The "New release" box works the same way for the
   press's new releases: a book ticked with no filter is listed on the
   public "New Releases" page (newest first by publication date), and on
   the home page while "New Releases" is ticked; one ticked in a series
   shows in that series page's "New Releases" list (*Catalog browse*). A
   category's page has no "New Releases" list, so "New release in
   category" shows nowhere to readers [A10](#a10). A book stays a new
   release until someone unticks it. <sup>j</sup> <sup>td8</sup>
8. **Flags are kept per list.** A book can be featured or a new release in
   the whole catalog, in one of its categories and in its series,
   independently. In a second category its "Featured in category" box
   shows empty; pressing it takes the book off the first category and the
   box stays empty; pressing it again marks the book in the second.
   "New release in category" does the same. A book moved to another
   series keeps its old series' flags, hidden, until the new series' box
   is pressed, which takes them away and stays empty ⚠ [A4](#a4).
   <sup>j</sup> <sup>td9</sup>
9. **Flags outlive publication.** Unpublishing a book takes it off the
   Catalog page (Rule 1) but keeps its flags: republished, it returns
   with its boxes as they were. Deleting it removes them, which no screen
   shows.
   <sup>j</sup> <sup>td10</sup>
10. **Ordering the featured books.** "Order Features" switches the list to
    ordering. <sup>k</sup> <sup>td11</sup>
    - 10a. **What shows.** A notice reads "Drag-and-drop or tap the up
      and down buttons to change the order of features on the
      homepage." (with a filter, "…the order of features in {category or
      series}."), but no row can be dragged: only the arrows move a book
      ⚠ [A11](#a11). Only the books featured in the current list stay,
      each with an up and a down arrow; a screen reader hears the arrows
      as "Increase position of undefined" and "Decrease position of
      undefined" ⚠ [A14](#a14). The search, the "Filters" button, "Add
      Entry", the column headings, the boxes and the row links are
      hidden, but a "Filters" column already open stays and still
      switches the list ⚠ [A12](#a12).
    - 10b. **Moving.** An arrow moves the book one place. The first
      book's up arrow does nothing. The last book's down arrow changes
      nothing on screen, yet the next arrow press that should move that
      book changes nothing either ⚠ [A13](#a13).
    - 10c. **Saving.** "Save Order" saves the order and ends ordering,
      with no message; "Cancel" ends it and puts the list back as it was
      saved. Leaving the page while ordering asks nothing, and an order
      not saved with "Save Order" is lost. The saved order is the order
      of the list (Rule 2) and of the featured books on the public
      catalog page and the home page (Rule 6a); a category's page does
      not follow it [A10](#a10).
11. **A newly featured book's place.** A book ticked "Featured" joins the
    list's featured books near the top, not at the end, once the page is
    reloaded: in first or second place, or in second or third right after
    a "Save Order" of that list. "Order Features" moves it. <sup>k</sup>
    <sup>td12</sup>
12. **Adding a book to the catalog.** "Add Entry" › choose one or more
    books › "Save" publishes each chosen book's current version exactly as
    the workflow's "Publish" does, with the same requirements and results
    ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    its Rules 6–8), but with no confirmation window. The panel then closes
    and the list reloads with the book in it. A book whose "Date Published"
    lies in the future is scheduled instead, and so stays off the list
    (Rule 1); a scheduled book stays among the suggestions.
    <sup>g</sup> <sup>td13</sup>
    - 12a. **Nothing chosen.** With suggestions showing and no book
      chosen, "Save" takes the first suggestion as chosen and publishes
      it; leaving the box with Tab also makes the first suggestion a
      chosen book ⚠ [A8](#a8).
    - 12b. **Refused.** "Save" with nothing typed and nothing chosen, or
      with a chosen book that a requirement refuses (an unverified or
      duplicated ORCID iD while ORCID is on), is refused with "The form
      was not saved because 1 error(s) were encountered. Please correct
      these errors and try again.", a notice at the top right that
      disappears after about five seconds. The panel stays open with its
      chosen books, nothing in it is marked ⚠ [A5](#a5), and none of the
      chosen books is added, even those no requirement refuses.
13. **The Catalog Entry page.** Each version has its own; "Save" stores
    the whole page onto the shown version, with "Saving", then "Saved",
    beside the button, and after a reload the page shows the saved
    values. <sup>h</sup> <sup>td3</sup>
    - 13a. **Series.** The chosen series puts the book on that series'
      public page and under that series in the Catalog page's "Filters"
      (*Catalog browse*). The empty choice takes it out of every series.
    - 13b. **Series Position.** Stored as typed. The readers' series
      page and the catalog lists print it above the book's title; the
      book's own page does not show it. On the Catalog page, a series
      filter set to either "Series position" order sorts by it, highest
      first (Rule 4, [A3](#a3)). The readers' series page lists its books
      newest first whatever the series' order ([Sections](U17-sections.md#omp9),
      its OMP9).
    - 13c. **Categories.** The book's categories, with their own rules
      ([Categories](U16-categories.md#category-picker), its Rule 16).
    - 13d. **Date Published.** Empty, publishing stamps the day; a past
      date is kept; a future date saved before publishing makes the
      publish a scheduling ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      its Rules 6 and 8).
    - 13e. **Update Type, Summary of Changes.** Stored on the version;
      "Insert Content" on the submission-language box appends an author's
      summary from a review revision ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      its Rules 13–14).
    - 13f. **Cover Image.** The uploaded image is saved with the page. On
      "Save" a small copy is made at the press's cover size (Settings
      bullet 4). The catalog lists and the book's own page both show the
      small copy (*Catalog browse*, *Monograph landing page*); the full
      image shows only as the page's preview. "Remove" and "Save" take
      the image away, and the public pages fall back to the default
      picture.
    - 13g. **URL Path.** Once saved, the book's public address uses the
      path instead of the number (*Monograph landing page*). A path
      breaking the letters-and-digits rule is refused under the field with
      "This may only contain letters, numbers, dashes, underscores and
      periods."; a path of digits only with "The URL path can not be a
      number."; a path another book of the press already uses with "The
      URL path has already been used and can not be used again."; each
      time with the form notice "The form was not saved because 1
      error(s) were encountered…" and nothing saved. <sup>h</sup>
      <sup>td14</sup>
14. **The "Catalog Management" notice.** Once the book is published or
    scheduled, its Production stage shows, in place of "Awaiting
    approval." ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
    its Rule 17), a box headed "Catalog Management" reading "The monograph
    has been approved. Please visit Marketing and Publication to manage
    its catalog details, using the links just above." No links stand
    above it [A2](#a2). A "Date Published" saved on the Catalog Entry page
    before publishing, past or future, leaves "Awaiting approval.". After
    "Unpublish" the notice stays and "Awaiting approval." does not come
    back ⚠ [A6](#a6). <sup>e</sup> <sup>td15</sup>

## Side effects

- **Ticking a box, "Save Order"**: no email, no task notice and no line in
  the book's Activity Log; the public catalog pages change (Rules 6, 7,
  10). <sup>j</sup> <sup>td8</sup>
- **"Add Entry" › "Save"**: everything publishing does
  ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
  its Side effects): the "Publication Published" email to each user with
  an Author assignment on the book, the author's task notice, the
  Activity Log line "The submission was published.", the move to Done, and
  a DOI assigned on publication when the press assigns DOIs "Upon
  publication". A press hands nothing to ORCID. <sup>g</sup> <sup>td13</sup>
- **"Catalog Entry" › "Save"**: one "Submission metadata updated" line in
  the Activity Log ([Activity log & notes](U38-submission-activity-log-and-notes.md#what-is-logged)).
  <sup>h</sup>

## Settings that modify behavior

1. **"Order of monographs"** of the press (Settings › Website ›
   "Appearance" › "Setup"; no choice marked on a new press, which lists
   by publication date, newest first). Another choice orders the Catalog
   page's books that are not featured, with no filter (Rule 2); after a
   filter is removed the page ignores it [A3](#a3). <sup>i</sup>
2. **A category's "Order of monographs"** (Settings › Press ›
   "Categories" › the category's window; "Publication date (newest
   first)" on a new category). Orders the books not featured there while
   that category is the filter (Rule 4) [A3](#a3). <sup>i</sup>
3. **A series' "Order of monographs"** (Settings › Press › "Series" › the
   series' window; "Title (A-Z)" on a new series). The same for a series
   filter (Rule 4) [A3](#a3). <sup>i</sup>
4. **"Cover Image Max Width", "Cover Image Max Height"** (Settings ›
   Website › "Appearance" › "Advanced"; 106 and 100). The size of the
   small copy made from a saved "Cover Image" (Rule 13f). Saving new
   values remakes the small copy of every cover the press already holds.
   <sup>h</sup>
5. **"Featured Books", "New Releases"** (Settings › Website ›
   "Appearance" › "Setup"; both unticked on a new press). They decide
   whether the press's home page lists its featured books and new
   releases ([Appearance & theming](U10-appearance-and-theming.md), its
   Rule 17); nothing on this feature's screens changes. <sup>j</sup>
6. **ORCID** (Settings › Users & Roles › "ORCID", "Enable ORCID
   functionality"; off on a new press). On, a book whose contributor has
   an unverified or duplicated ORCID iD cannot be published, through "Add
   Entry" too (Rule 12b; [ORCID integration](U04-orcid-integration.md)).
   <sup>g</sup>
7. **"Permit submission metadata edit."** of a role (Settings › Users &
   Roles › "Roles" › the role's "Edit"; unticked for the Layout Editor).
   New assignments of the role start from it, and saving a change
   rewrites the role's existing assignments; the same box in the window
   that assigns a participant can grant it to one assignment. It decides who may save the Catalog
   Entry page (Actors; [Publication metadata](U40-publication-metadata.md#edit-gate)).
   <sup>d</sup>

## Cross-feature interactions

- [Publish, schedule & versions](U49-publish-schedule-and-versions.md):
  the act of publishing that "Add Entry" performs (Rule 12), what "Date
  Published" does, Update Type, Summary of Changes and "Insert Content"
  (Rules 13d, 13e), and the "Awaiting approval." banner the notice
  replaces (Rule 14). This spec owns the Catalog Entry page as a page and
  the notice.
- [Publication metadata](U40-publication-metadata.md#edit-gate): who may
  save the Catalog Entry page.
- [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs):
  where the Catalog Entry page is listed and for whom.
- [Categories](U16-categories.md#category-picker): the "Categories" field
  and the category's "Order of monographs". Its OMP5 records a press's
  category page that fails to load ([Categories](U16-categories.md#omp5)).
- [Sections](U17-sections.md#order): the order of the "Series" list, the
  "(Inactive)" series and a series' "Order of monographs". Its OMP9
  records a series' public page with an empty heading and its books
  newest first ([Sections](U17-sections.md#omp9)).
- [Production stage](U33-production-stage.md#omp2): the stage that shows
  the "Catalog Management" notice (Rule 14); its OMP2 records the notice
  left after "Unpublish" too.
- [Appearance & theming](U10-appearance-and-theming.md): the home page's
  featured books and new releases, the press's "Order of monographs" and
  cover sizes (Settings bullets 1, 4, 5).
- [Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md):
  the side menu's "Content" group that holds "Catalog".
- [Activity log & notes](U38-submission-activity-log-and-notes.md#what-is-logged):
  the log lines of a publish and of a page save.
- *Catalog browse* (no spec yet): the public catalog, "New Releases",
  category and series pages that show the flags, order and covers set
  here.
- *Monograph landing page* (no spec yet): the page "View Entry" opens and
  the address a URL Path sets.
- *Chapters & work type*, *Publication formats & proof terms* (no specs
  yet): the version's other pages and the "Marketing" group of the
  workflow's side menu.

## Canonical scenarios

Scenario 7 runs on the seeded journal, preprint server and press with
ready accounts; the others run on scratch presses with throwaway
accounts, because the seeded press's catalog holds what earlier runs
published. <sup>s</sup>

1. **Books added to the catalog with "Add Entry"**

   Given: Press manager and an Author, on a scratch press with no
   published book, where the Author's "Lantern Harbour" sits in
   Production, the Author's "Lantern Tides" sits in Production with
   "Date Published" 2020-05-05 saved on its Catalog Entry page, and the
   Author's "Lantern Draft" sits at the Submission stage.

   - **Nothing published yet**: the Press manager opens the side menu's
     "Content" › "Catalog": the page is headed "Catalog", with the tab
     "All Monographs" and the list "Monographs", which reads "No items
     found." with no column headings (Rule 1; Fields, the Catalog page).
   - **"Awaiting approval." with a saved date**: open "Lantern Tides"
     from the Dashboard and choose its Production stage: it reads
     "Awaiting approval.", although a "Date Published" is saved (Rule
     14).
   - **The "Add Entry" panel**: back on the Catalog page press "Add
     Entry": a panel headed "Add Entry" opens from the right, with a back
     arrow named "Close" at its top left. Type Lantern in "Find
     monographs to add to the catalog": the box suggests "Lantern
     Harbour" and "Lantern Tides", one line per book with its title, and
     not "Lantern Draft", which is not yet in Copyediting or Production
     (Fields, the "Add Entry" panel).
   - **Two books chosen**: choose "Lantern Harbour", then "Lantern
     Tides": each shows as a tag inside the box, with a cross named
     "Remove Lantern Harbour" and "Remove Lantern Tides" (Fields).
   - **"Save"**: press "Save": no confirmation window opens; the panel
     closes and the list reloads with "Lantern Harbour" and "Lantern
     Tides" under the column headings "Featured" and "New release"
     (Rule 12; Fields).
   - **The published book's workflow**: on the Catalog page press
     "Lantern Harbour"'s "View Submission": the book has moved to Done
     (the stage bubble reads "Published"), and its Activity Log holds
     "The submission was published." (Side effects bullet 2). Its Production stage shows, in place of
     "Awaiting approval.", a box headed "Catalog Management" reading
     "The monograph has been approved. Please visit Marketing and
     Publication to manage its catalog details, using the links just
     above.", with no links above it ⚠ [A2](#a2) (Rule 14).
   - **The Author's side**: the mail catcher holds a "Publication
     Published" email for the Author about each of the two books, and a
     task notice for each waits under the Author's Tasks (Side effects
     bullet 2).
   - **Control**: on the Catalog page press "Add Entry" again and type
     Lantern: nothing is suggested, since both books are now published
     and "Lantern Draft" is still at the Submission stage; press "Close"
     (Fields, the "Add Entry" panel). <sup>s</sup>

2. **Featured books and new releases, and what readers see**

   Given: Press manager, an Author and a visitor signed out, on a
   scratch press with the Author's three published books "Alpha",
   "Beta" and "Gamma", published on 2024-01-10, 2024-02-10 and
   2024-03-10, none of them featured or a new release.

   - **The Catalog page**: the Press manager opens the side menu's
     "Content" › "Catalog": above the list stand "Search", "Filters" and
     "Add Entry", and no "Order Features". The column headings read
     "Featured" and "New release", and the rows run "Gamma", "Beta",
     "Alpha", newest first by publication date; each row shows the
     book's number on the left, the author's name in short form above the
     title, and "View Submission" and "View Entry" (Rule 2; Fields, the Catalog page).
   - **"Featured" ticked**: press "Alpha"'s empty "Featured" box: it is
     ticked, with no message, "Alpha" keeps its last place, and "Order
     Features" appears above the list. Reload the page: "Alpha" comes
     first, its box ticked (Rules 2, 6; Fields).
   - **The reader side of "Featured"**: the visitor opens the press's
     public catalog page: "Alpha" is listed first (Rule 6a).
   - **"Featured" unticked**: press "Alpha"'s ticked box: it empties.
     Reload: the rows run "Gamma", "Beta", "Alpha" again and "Order
     Features" is gone. The visitor reloads the public catalog page:
     "Alpha" is no longer first (Rules 2, 6).
   - **"New release" ticked**: press the empty "New release" box of
     "Beta", then of "Gamma": each is ticked, with no message. The
     visitor opens the press's "New Releases" page: it lists "Gamma",
     then "Beta", and not "Alpha" (Rule 7).
   - **Unpublished, then published again**: press "Beta"'s "View
     Submission" and unpublish the book with "Unpublish" ([Publish,
     schedule & versions](U49-publish-schedule-and-versions.md)): the
     Catalog page, reloaded, no longer lists "Beta". Publish it again
     with the workflow's "Publish": the Catalog page lists "Beta" again
     with its "New release" box ticked, and the visitor's "New Releases"
     page lists "Gamma", then "Beta" (Rules 1, 7, 9).
   - **"New release" unticked**: press "Gamma"'s ticked "New release"
     box: it empties, and the visitor's "New Releases" page, reloaded,
     lists "Beta" alone (Rule 7).
   - **Control**: the box presses add no line to "Alpha"'s Activity Log
     (open it from its "View Submission") and bring the Author no email
     and no task notice: the one email that reaches the Author during
     the scenario is the "Publication Published" of "Beta"'s publishing
     again (Side effects bullets 1, 2). <sup>s</sup>

3. **The featured books put in order**

   Given: Press manager and a visitor signed out, on a scratch press
   whose "Order of monographs" is "Title (A-Z)", with five published
   books: "Oak", "Elm" and "Ash", featured in the whole catalog in that
   order, and "Birch" (published 2024-01-10) and "Maple" (published
   2025-01-10), not featured and both new releases.

   - **The press's order**: the Press manager opens "Content" ›
     "Catalog": the rows run "Oak", "Elm", "Ash", the featured books in
     their order, then "Birch", "Maple" by title, although "Maple" is
     the newer (Rule 2; Settings bullet 1).
   - **"Order Features"**: press it: a notice reads "Drag-and-drop or
     tap the up and down buttons to change the order of features on the
     homepage." ⚠ [A11](#a11). Only "Oak", "Elm" and "Ash" stay, each with
     an up and a down arrow; "Search", "Filters", "Add Entry", the column
     headings, the boxes and the row links are hidden; the button now
     reads "Save Order", with "Cancel" next to it (Rule 10a; Fields).
   - **The arrows**: press "Ash"'s up arrow: "Oak", "Ash", "Elm"; press
     it again: "Ash", "Oak", "Elm". Press it a third time: nothing
     moves, "Ash" being first (Rule 10b).
   - **"Cancel"**: press "Cancel": ordering ends and the rows run "Oak",
     "Elm", "Ash" again (Rule 10c).
   - **"Save Order"**: press "Order Features", press "Ash"'s up arrow
     twice and press "Save Order": ordering ends with no message, and
     the rows run "Ash", "Oak", "Elm", "Birch", "Maple", the same after
     a reload (Rules 2, 10c).
   - **The reader side of the order**: the visitor opens the press's
     public catalog page: it lists "Ash", "Oak", "Elm" first, in that
     order (Rule 10c).
   - **A newly featured book's place**: the Press manager presses
     "Maple"'s empty "Featured" box and reloads the page: "Maple" is
     second or third among the four featured books, not last (Rule 11).
   - **Leaving while ordering**: press "Order Features", press the up
     arrow of the second featured book, then, without pressing "Save
     Order", open the Dashboard: no question is asked. Back on "Content"
     › "Catalog", the featured books run in the order they had before
     "Order Features" was pressed (Rule 10c).
   - **Control**: the visitor's "New Releases" page lists "Maple", then
     "Birch", newest first by publication date, whatever the featured
     order (Rule 7). <sup>s</sup>

4. **Filters and search**

   Given: Press manager and a visitor signed out, on a scratch press
   with the categories "Arts" and "Science", "Science" holding the
   sub-category "Physics", and the series "History", and five published
   books: "Harbour Currents" by Nova Reed, in "Science" and featured in
   the whole catalog; "Tidal Patterns" by Ian Lowe, in "Arts" and
   featured in "Arts"; "Wave Mechanics" by Ian Lowe, in "Physics" only; and
   "River Histories" (published 2024-01-10) and "Coastal Towns"
   (published 2025-01-10), both by Ian Lowe and in the series
   "History".

   - **The "Filters" column**: the Press manager opens "Content" ›
     "Catalog" and presses "Filters": a column headed "Filters" opens on
     the left, with a group "Categories" listing "Arts", "Physics",
     "Science" and a group "Series" listing "History" (Fields, the
     "Filters" row).
   - **A category, not its sub-category**: choose "Science": the list
     holds "Harbour Currents" alone, not "Wave Mechanics", which sits
     only in the sub-category. The column headings read "Featured in
     category" and "New release in category", "Harbour Currents"' "Featured in
     category" box is empty although the book is featured in the whole catalog, and no
     "Order Features" shows (Rules 3, 8; Fields).
   - **Featured in the category**: press "Harbour Currents"' "Featured
     in category" box: it is ticked, and "Order Features" appears (Rule
     6; Fields).
   - **Another category**: choose "Arts": it replaces "Science"; the
     list holds "Tidal Patterns" alone, its "Featured in category" box
     ticked (Rule 3).
   - **"Clear filter"**: the chosen "Arts" is marked and carries a cross
     named "Clear filter: Arts"; press it: the whole catalog is back,
     under "Featured" and "New release", with "Harbour Currents"'
     "Featured" box ticked and "Tidal Patterns"' empty (Rules 3, 8;
     Fields).
   - **The column closed with a filter on**: choose "Science", then
     press "Filters": the column closes, the list still holds "Harbour
     Currents" alone, and the headings still read "Featured in category"
     (Rule 3).
   - **A series**: press "Filters" and choose "History": the list holds
     "River Histories" and "Coastal Towns" under "Featured in series"
     and "New release in series". Press "River Histories"' "Featured in
     series" box: it is ticked (Rules 3, 6).
   - **The series page**: the visitor opens the "History" series' public
     page: "River Histories" comes first, although "Coastal Towns" is
     the newer (Rule 6a).
   - **Search**: choose "History" again: the whole catalog is back
     (Rule 3). Type Tidal in "Search" and press Enter: the list holds
     "Tidal Patterns" alone. Press the cross in the box: all five books
     are back. Type Reed and press Enter: "Harbour Currents" alone.
     Empty the box and press Enter: all five. Type the number that
     starts "Wave Mechanics"' row and press Enter: "Wave Mechanics" alone
     (Rule 5; Fields, the "Search" row).
   - **Control**: clear the box: in the whole catalog "River Histories"'
     "Featured" box is empty, and the visitor's public catalog page lists
     "Harbour Currents" first, not "River Histories": a series' flag
     features the book in that series only (Rules 6a, 8). <sup>s</sup>

5. **A book's Catalog Entry page: series, cover and URL Path**

   Given: Press manager and a visitor signed out, on a scratch press
   with the series "History" and two published books, "Harbour
   Currents", in no series and with no cover, and "Tidal Patterns",
   whose URL Path is harbour.

   - **The page**: the Press manager opens "Content" › "Catalog",
     presses "Harbour Currents"' "View Submission", and in its workflow
     chooses "Publication" › the version › "Catalog Entry": the page is
     headed "Publication: Catalog Entry", with the groups "Placement",
     "Publication Timing", "Version and Updates", "Display" and
     "Access", top to bottom, and "Save" at the foot. The "Series"
     list's first choice is empty (Fields, the "Catalog Entry" page).
   - **Series and position saved**: choose "History" in "Series", type
     Book 2 in "Series Position" and press "Save": "Saving", then
     "Saved", shows beside the button. Reload: the page shows "History"
     and "Book 2" (Rule 13). The book's Activity Log holds a
     "Submission metadata updated" line for the save (Side effects
     bullet 3).
   - **Where the series shows**: on the Catalog page, "Filters" ›
     "History" lists "Harbour Currents" (Rule 13a). The visitor opens the
     "History" series' public page: it lists "Harbour Currents" with
     "Book 2" above its title; the book's own page, the one its "View
     Entry" opens, does not show "Book 2" (Rule 13b).
   - **A cover**: back on "Catalog Entry", under "Cover Image" press
     "Upload File" and choose the image profile-image-400.png: a preview,
     an "Alternate text" box and "Remove" appear. Type Cover of the book
     in "Alternate text" and press "Save". Reload: the preview and
     "Cover of the book" are back (Rule 13f; Fields).
   - **The cover for readers**: the visitor opens the press's public
     catalog page and the book's page: both show the cover as its small
     copy, no wider than 106 and no taller than 100 pixels (Rule 13f;
     Settings bullet 4).
   - **"Remove"**: on "Catalog Entry" press "Remove": the box shows
     "Upload File" and "Restore Original" (Fields). Press "Save": the
     visitor's book page, reloaded, shows the default picture in place
     of the cover (Rule 13f).
   - **URL Path refused**: type my book in "URL Path" and press "Save":
     "This may only contain letters, numbers, dashes, underscores and
     periods." shows under the field. Replace it with 12345 and press
     "Save": "The URL path can not be a number.". Replace it with harbour
     and press "Save": "The URL path has already been used and can not be
     used again.". Each refusal also brings the notice "The form was not
     saved because 1 error(s) were encountered…". Reload: "URL Path" is
     empty (Rule 13g).
   - **URL Path saved**: type harbour-2 in "URL Path" and press "Save".
     On the Catalog page, "Harbour Currents"' "View Entry" opens the
     book's page at an address ending in harbour-2 in place of the
     book's number (Rule 13g).
   - **Control**: on "Catalog Entry" choose the empty first choice in
     "Series" and press "Save": the visitor's "History" series page no
     longer lists "Harbour Currents", and the Catalog page's "Filters" ›
     "History" reads "No items found." (Rules 1, 13a). <sup>s</sup>

6. **Who may open the Catalog page**

   Given: Press manager, Series editor, Marketing and sales
   coordinator, Author and Reader, one account each, and a visitor
   signed out, on a scratch press.

   - **The Series editor's side menu**: the Series editor's side menu
     offers no "Catalog" (Actors row 1).
   - **Other roles at the address**: the Marketing and sales
     coordinator, the Author and the Reader each open the Catalog page's
     address, the one the Press manager's "Catalog" opens in the Control:
     each gets the access-denied page ("The current role does not have
     access to this operation.") (Actors row 1).
   - **Signed out at the address**: the visitor opens the same address:
     the Login page (Actors & permissions, the opening paragraph).
   - **Control**: the Press manager's side menu offers "Content" ›
     "Catalog", which opens the page headed "Catalog" (Actors row 1).
     <sup>s</sup>

7. **No catalog on a journal or a preprint server** {OJS OPS}

   Given: Journal Manager (Preprint Server Manager) and a visitor signed
   out, on the seeded journal (the seeded preprint server), with one
   published article (preprint) of the ready Author.

   - **The side menu**: the Journal Manager's side menu has a "Content"
     group holding "Issues" and no "Catalog"; the Preprint Server
     Manager's side menu has no "Content" group (Purpose, the absence
     paragraph).
   - **The Catalog page's address**: the Journal Manager (Preprint
     Server Manager), then the visitor, open the journal's (the
     server's) address followed by "manageCatalog", the Catalog page's
     address on a press: both get a not-found page (Purpose, the absence
     paragraph).
   - **The published article's workflow**: the Journal Manager (Preprint
     Server Manager) opens the article's (preprint's) workflow: the
     version's pages include "Publication Settings" ("Preprint entry")
     and no "Catalog Entry", and its Production stage shows no "Catalog
     Management" notice (Purpose, the absence paragraph).
   - **Control**: on the seeded press, with one published book of the
     ready Author, the Press manager's side menu offers "Content" ›
     "Catalog"; the press's address followed by "manageCatalog" opens
     the page headed "Catalog"; the book's version lists "Catalog
     Entry", and its Production stage shows the "Catalog Management"
     notice (Actors row 1; Rule 14). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — states:
  - "Add Entry" › "Save" of a book whose "Date Published" lies in the
    future: the book is scheduled, stays off the list and is still
    suggested (Rule 12)
  - other cover sizes, and the small copies of the covers a press
    already holds remade when new sizes are saved (Settings bullet 4;
    Rule 13f)
- **Budget** — variants:
  - more than 30 published books: the page links under the list (Rule 1)
  - "Add Entry" finding a book by an author's name or by its number, and
    "Close" keeping the chosen books until the page is left (Fields, the
    "Add Entry" panel)
- **Nothing new to test**:
  - the Press editor and the Production editor, offered the Catalog page
    and the Catalog Entry page the Press manager of scenarios 1 to 5 is
    (Actors rows 1–6)
  - the Site Administrator, offered the Catalog page the Press manager
    is, on every press (Actors rows 1–5)
- **Register carries it**:
  - A1 (a Series editor at the Catalog page's address, every action
    refused; Actors rows 1–5; scenario 6 stops at the side menu)
  - A2 (the "Catalog Management" notice pointing at links that are not
    there, and shown to the Author; Actors row 7; Rule 14; scenario 1
    passes it)
  - A3 (the order with a category or series filter and after one, a
    series filter by "Series position", a category's or series' "Order
    of monographs"; Rules 4, 13b; Settings bullets 2, 3)
  - A4 (a book flagged in one category and pressed in another; a book
    moved to another series; Rule 8)
  - A5 ("Add Entry" › "Save" with nothing chosen, or with a book whose
    contributor's ORCID iD is unverified or duplicated while ORCID is
    on; Rule 12b; Settings bullet 6)
  - A6 (the notice after "Unpublish" and on a scheduled book; Rule 14;
    scenario 2 passes the unpublish)
  - A7 (the Catalog page in French; Fields, the Catalog page)
  - A8 ("Add Entry" › "Save" with a word typed and nothing chosen; Rule
    12a)
  - A9 (one book chosen twice in "Add Entry"; Fields, the "Add Entry"
    panel)
  - A10 (a category's public page and its category flags; Rules 6a, 7,
    10c)
  - A11 (the "Drag-and-drop" notice while no row can be dragged; Rule
    10a; scenario 3 passes it)
  - A12 (a "Filters" column left open while ordering; Rule 10a)
  - A13 (the last featured book's down arrow; Rule 10b)
  - A14 (the ordering arrows' names for a screen reader; Rule 10a)
- **Owned by another feature**:
  - an assistant with Production access who may not edit the
    publication: the Catalog Entry page with "Save" greyed out (Actors
    row 6; [Publication metadata](U40-publication-metadata.md),
    scenario 12)
  - the Author's view with no "Catalog Entry" page (Actors row 6;
    [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md),
    scenario 7)
  - "Add Entry" handing nothing to ORCID (Side effects bullet 2;
    *[ORCID integration](U04-orcid-integration.md)*)
  - the Catalog Entry page's "Categories" (Rule 13c;
    [Categories](U16-categories.md), scenario 3)
  - the Catalog Entry page's "Date Published", "Update Type" and
    "Summary of Changes" (Rules 13d, 13e; [Publish, schedule &
    versions](U49-publish-schedule-and-versions.md), scenarios 4 and
    14)
  - "Featured Books" and "New Releases" ticked: the home page's lists
    (Settings bullet 5; *Catalog browse*)
  - a role's "Permit submission metadata edit." ticked, or one
    assignment's box (Settings bullet 7; [Publication
    metadata](U40-publication-metadata.md), scenario 12; *[Roles
    configuration](U54-roles-configuration.md)*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-27), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | The "Catalog Management" notice points at links that are not there, and the Author gets it too | 🐞 | minor | — |
| [A3](#a3) | With a filter, an ascending "Order of monographs" lists the other way round; after a filter the press's order is lost | 🐞 | user-visible | — |
| [A4](#a4) | A book holds category flags in one category only: pressing a second category's box takes the first away and stays empty | 🐞 | user-visible | — |
| [A5](#a5) | "Add Entry" › "Save" refused with "Please correct these errors", and nothing is marked | 🐞 | minor | — |
| [A6](#a6) | After "Unpublish" the Production stage still says the monograph has been approved | 🐞 | minor | — |
| [A7](#a7) | In French the Catalog page shows raw keys for its tab, list, column headings and "View Entry" | 🐞 | minor | — |
| [A8](#a8) | "Add Entry" › "Save" with a word typed and nothing chosen publishes the first suggestion | 🐞 | user-visible | — |
| [A9](#a9) | A book chosen twice in "Add Entry" is published twice and becomes "Version of Record 2.0" | 🐞 | user-visible | — |
| [A10](#a10) | A category's public page ignores "Featured in category" and shows no "New Releases" | 🐞 | user-visible | — |
| [A11](#a11) | The ordering notice says "Drag-and-drop", but no row can be dragged | 🐞 | minor | — |
| [A12](#a12) | While ordering, an open "Filters" column stays and can leave the page with no "Save Order" or "Cancel" | 🐞 | minor | — |
| [A13](#a13) | While ordering, the last book's down arrow silently costs an extra press | 🐞 | minor | — |
| [A14](#a14) | Screen readers hear "Increase position of undefined" on the ordering arrows | 🐞 | minor | — |
| [A1](#a1) | A Series editor opens the Catalog page by its address, then every action on it is refused | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The Catalog page opens for a Series editor who can do nothing on it** · ❓ · minor.
The side menu offers "Catalog" to manager-level roles and the Site
Administrator only, yet a Series editor who types the page's address gets
the page with the first 30 books. Every search, filter, page link, box
and "Save Order" then answers with the "Error" window, and "Add Entry" ›
"Save" with the passing notice "An unexpected error has occurred. Please
reload the page and try again." while the panel stays open. Nothing is
saved, yet until a reload the screen keeps what was pressed: the box
ticked, the search phrase, the chosen filter with its column headings
over the whole catalog's books, the refused order. Each row's "View
Submission" opens an empty workflow with the "Error" window for a book
they are not assigned to. Question: should a Series editor manage the
catalog (for instance their own series), or should the page refuse them
as the side menu does?
Lean: refuse them; the side menu and every save have treated the catalog as a manager's tool since the page was built (a history read from the code).
Basis: probe, 2026-09-27. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The "Catalog Management" notice points at links that are not there** · 🐞 · minor.
The notice on the Production stage tells the reader to "visit Marketing
and Publication … using the links just above", but nothing is above it:
"Marketing" and "Publication" are groups of the side menu on the left. The
same notice, addressed to whoever manages the catalog, also shows on the
Author's Production stage, where neither the Catalog Entry page nor the
catalog is open to them. Expected: a notice that names where to go, shown
to those who can act on it.
Basis: probe, 2026-09-27. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The Catalog page's order with a filter** · 🐞 · user-visible.
With a category or series as the filter, a category or series set to an
ascending "Order of monographs" ("Title (A-Z)", the default of every new
series) lists its books the other way round, Z to A. After the filter is
removed, the whole catalog comes back newest first by publication date,
although the press's own "Order of monographs" says otherwise and the page
first opened in that order. Expected: each list in the order its setting
names. The staff see the books in a different order than readers do.
Basis: probe, 2026-09-27. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A book's category flags act as one** · 🐞 · user-visible.
A book featured in category A, shown with category B as the filter, has
an empty "Featured in category" box; pressing it does not feature the
book in B: the book loses its feature in A and the box stays empty.
Pressing it again then features the book in B, and A's box shows empty.
"New release in category" does the same. A book moved to another series
keeps its old series' flags, hidden, until the new series' box is
pressed, which takes them away and leaves the box empty. Expected: each
box sets the flag of the category or series it is shown for. A press
cannot feature one book in two categories.
Since: 2017-09-05 (nine years) · Basis: probe, 2026-09-27. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — "Add Entry" refused with nothing marked** · 🐞 · minor.
"Save" with nothing chosen, or with a chosen book that a publishing
requirement refuses (an unverified or duplicated ORCID iD), shows "The
form was not saved because 1 error(s) were encountered. Please correct
these errors and try again." for about five seconds, but nothing in the
panel is marked, so the user is not told what is wrong. Expected: "You
must provide one or more submission ids to be added to the catalog.", or
the requirement's own message as the workflow's "Schedule For
Publication" window shows it: "The following requirements must be met
before this can be published." with "Unauthenticated ORCiDs for
contributors detected." or "Duplicate ORCiDs for contributors detected."
Basis: probe, 2026-09-27. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — After "Unpublish" the notice still says "approved"** · 🐞 · minor.
Unpublishing a book's only published version leaves its Production stage
showing "Catalog Management" and "The monograph has been approved…";
"Awaiting approval." and its "The monograph will not be listed in the
catalog until it has been published…" do not come back, although the book
has left the catalog. A scheduled book shows the "approved" notice too,
before it is in the catalog. Expected: the notice follows whether the
book is in the catalog.
Basis: probe, 2026-09-27. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The Catalog page shows raw keys in French** · 🐞 · minor.
With French as the interface language, the Catalog page reads
"##navigation.catalog.allMonographs##" for its tab,
"##submission.list.monographs##" for the list's heading,
"##catalog.manage.featured##" and "##catalog.manage.feature.newRelease##"
for the column headings and "##submission.list.viewEntry##" on each row,
and a screen reader hears "##catalog.manage.isNotFeatured##" and
"##catalog.manage.isNotNewRelease##" on the boxes. "Rechercher",
"Filtres" and "Nouvelle entrée de catalogue" are translated. Expected:
French throughout.
Basis: probe, 2026-09-27. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — "Add Entry" publishes a book nobody chose** · 🐞 · user-visible.
With a word typed in the "Add Entry" box and suggestions showing but no
book chosen, "Save" takes the first suggestion as chosen and publishes it
at once, with no confirmation: the book goes on the catalog and its
Authors get "Publication Published". Leaving the box with Tab also makes
the first suggestion a chosen book. The suggestions come in no fixed
order, so the user cannot tell which book that will be. Expected: only a
book the user picked is added.
Basis: probe, 2026-09-27. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — A book chosen twice in "Add Entry" is published twice** · 🐞 · user-visible.
The "Add Entry" box still suggests a book already chosen. Choosing it a
second time and pressing "Save" publishes it twice: its only version
reads "Version of Record 2.0" instead of 1.0, the Activity Log has "The
submission was published." twice, and each Author gets "Publication
Published" twice. Expected: a chosen book is no longer offered, or "Save"
takes each book once.
Basis: probe, 2026-09-27. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — Category flags do not reach the category's page** · 🐞 · user-visible.
A press's public category page should list first the books featured in
that category, in the order "Save Order" set there, and show the books
ticked "New release in category" as its new releases. Instead it lists
first every book featured anywhere (in the whole catalog, in any
category, in its series), so a book featured only in another list comes
before one featured in this category, and it has no "New Releases" list
at all. Expected: the category's page lists its own featured books
first, in their saved order, and its new releases.
Basis: probe, 2026-09-27. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The ordering notice offers a drag that does not work** · 🐞 · minor.
While ordering, the notice reads "Drag-and-drop or tap the up and down
buttons to change the order of features…", but dragging a row moves
nothing; only the arrows reorder. Expected: a notice that names the
arrows only, or a working drag.
Basis: probe, 2026-09-27. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — An open "Filters" column stays while ordering** · 🐞 · minor.
"Order Features" hides the "Filters" button but not a "Filters" column
already open. Choosing a category or series there switches the list while
ordering goes on, the notice ending "…in {that list}.". Where nothing is
featured, the page then shows only the notice: no rows, no "Save Order",
no "Cancel", no "Search", no "Add Entry". Choosing a list with featured
books, or reloading, brings them back, with the moves made so far
undone. Expected: the column hidden while ordering, as the button is.
Basis: probe, 2026-09-27. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The last featured book's down arrow costs an extra press** · 🐞 · minor.
While ordering, the last featured book's down arrow changes nothing on
screen, as expected. But the next arrow press that should move that book
(its own up arrow, or the down arrow of the book above it) changes
nothing on screen either; only a second press moves it. Expected: the
last book's down arrow does nothing, and the next press moves the book.
Basis: probe, 2026-09-27. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — Screen readers hear "undefined" on the ordering arrows** · 🐞 · minor.
While ordering, a screen reader hears every row's arrows as "Increase
position of undefined" and "Decrease position of undefined", so a
screen-reader user cannot tell which book an arrow moves. Expected: the
book's title in place of "undefined".
Basis: probe, 2026-09-27. <sup>f-a14</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The Catalog page: OMP `APP\pages\manageCatalog\ManageCatalogHandler::index()`
(`pages/manageCatalog/index.php`), `templates/manageCatalog/index.tpl`,
page component `ManageCatalogPage` (`CatalogListPanel.vue`). Its side-menu
entry: OMP `APP\template\TemplateManager::setupBackendPage()` adds the
"Content" group with `catalog` (`navigation.catalog`). The Catalog Entry
page: ui-library `workflowConfigEditorialOMP.js` `PublicationConfig.catalogEntry`
→ `WorkflowPublicationForm` with `formName: 'catalogEntry'`. Code read
2026-09-27 on the omp checkout `72a01a026` (lib/pkp and ui-library as
pinned there). Live-probed 2026-09-27 (Purpose), OMP, as Press manager:
the side menu's "Content" › "Catalog"; "Featured" and "New release" over
the whole catalog, "Featured in category" / "New release in category"
with a category filter, "Featured in series" / "New release in series"
with a series filter; the Catalog Entry page's five groups and fields;
"View Entry" opening the book's page.

<a id="fn-b"></a>
**b** — OJS and OPS carry no `pages/manageCatalog` and their
`TemplateManager::setupBackendPage()` adds no catalog entry (the "Content"
group's roster is the navigation spec's side-menu row; OPS builds no
"Content" group at all); the "Catalog Entry" item is built only by
`useWorkflowNavigationConfigOMP.js`, and `WorkflowNotificationDisplay.vue`
asks for `NOTIFICATION_TYPE_VISIT_CATALOG` only under `isOMP()`. lib/pkp's
`PKPApproveSubmissionNotificationManager` still writes that record on OJS
and OPS at submission completion, but no screen of theirs reads it (the
publishing spec's note w: live-probed 2026-08-29, OJS and OPS showed no
approval banner before or after publishing). Live-probed 2026-09-27
(Purpose, absence paragraph): note td1.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-27 (Purpose, absence paragraph), OJS and
OPS as `manager.maya` on `publicknowledge`, read only, and on a scratch
journal and a scratch server with one published item each: the
journal's "Content" group held only "Issues"; the preprint server's side
menu had no "Content" group (Editor Dashboard, Start A New Submission,
DOIs, Settings, Statistics, Tools; read twice). `{context}/manageCatalog`
answered "404 Not Found" signed in and signed out. A published item's
version menu listed "Publication Settings" (the journal) or "Preprint
entry" (the server) and no "Catalog Entry"; a typed
`publication_{id}_catalogEntry` key landed on "Title & Abstract"; the
Production stage read "Status / Submission published." with no "Catalog
Management". Positive control: OMP `publicknowledge` listed "Content" ›
"Catalog" and the address opened "Catalog".

<a id="fn-c"></a>
**c** — `ManageCatalogHandler::__construct()` grants `index` to
`ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN`
(`PKPSiteAccessPolicy`); any other role meets the role policy's
access-denied page, a signed-out visitor the Login page. The side menu adds
"Content" › "Catalog" for `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` only.
OMP `registry/userGroups.xml`: "Press manager", "Press editor" and
"Production editor" carry `ROLE_ID_MANAGER`, "Series editor"
`ROLE_ID_SUB_EDITOR`, "Marketing and sales coordinator" `ROLE_ID_ASSISTANT`.
Every request the page makes after loading is manager-or-admin only: the
list reload `GET _submissions` (lib/pkp
`PKPBackendSubmissionsController::getGroupRoutes()`), and `saveDisplayFlags`,
`saveFeaturedOrder`, `addToCatalog` (OMP
`APP\API\v1\_submissions\BackendSubmissionsController::getGroupRoutes()`).
A refusal answers 401 with `user.authorization.roleBasedAccessDenied`; the
`ajaxError` mixin opens the dialog titled `common.error` "Error" with that
text, except for `addToCatalog`, whose 401 reaches the form's generic
notice. The "Add Entry" picker searches the `submissions` API, which lists
a sub-editor's assigned submissions only. Live-probed 2026-09-27 (Actors
rows 1–5; A1), OMP, two runs, on scratch presses with a throwaway user of
each role: the Press manager, Press editor, Production editor and `admin`
(holding no role on the press) had "Content" › "Catalog", and each of
their box presses, searches, filters, "Save Order" and "Add Entry" saves
answered 200 and held after a reload; the Series editor's side menu had
no "Content" group, the typed address opened the page with every
control, each box press, search, filter, page link and "Save Order"
brought the "Error" window with "The current role does not have access
to this operation." and "OK" while the screen kept the pressed state,
and a reload showed the saved one; their "Add Entry" suggested only the
book they were assigned to, and "Save" showed "An unexpected error has
occurred. Please reload the page and try again." with the panel still
open and the book unpublished; "View Submission" of a book they were not
assigned to opened an empty workflow with the "Error" window. The
Marketing and sales coordinator, Layout Editor, Author, Reviewer and
Reader got the access-denied page ("The current role does not have access
to this operation."); a signed-out visitor got "Login".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-27 (Actors rows 1–5), OMP: see note c. On
a press with 31 published books the Series editor saw 30 rows and
"Previous 1 2 Next"; "Go to Page 2" brought the "Error" window and the
list stayed on the first 30 books, where the Press manager's page 2 showed
the 31st.

<a id="fn-d"></a>
**d** — `workflowConfigEditorialOMP.js` passes `canEdit:
permissions.canEditPublication` to `WorkflowPublicationForm`, which sets
the form's `canSubmit`; without it "Save" renders disabled and the boxes
stay open to typing. `useWorkflowNavigationConfigOMP.js` lists "Catalog
Entry" (`publication.catalogEntry`) only when
`permissions.canAccessProduction`; the author configuration lists no such
page. The form comes from
`GET submissions/{id}/publications/{publicationId}/_components/catalogEntry`
(OMP `SubmissionController::getCatalogEntryForm()`). Live-probed
2026-09-27 (Actors row 6; Settings bullet 7), OMP, two runs: a Layout
Editor assigned at Production with the install's role setting got the
page with "Save" disabled, still disabled after typing in a box; one
whose assignment had the Assign window's metadata box ticked saved (200);
once the role's "Permit submission metadata edit." was ticked and saved,
the first one's assignment carried it and saved too. A Marketing and
sales coordinator, whose role does not reach Production on the install,
had no "Catalog Entry" and could not open the Production stage.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-27 (Actors row 6; Rule 13), OMP: as Press
manager the page read "Publication: Catalog Entry" (in capitals, by the
page's styling), with the groups "Placement", "Publication Timing",
"Version and Updates", "Display", "Access" and "Save" at the foot;
"History" and "Book 2" saved, showed "Saving" then "Saved", came back
after a reload, and added one "Submission metadata updated" line to the
Activity Log. The Press editor, the Production editor, an assigned
Series editor and `admin` saved too; the Author's view listed no
"Catalog Entry", and a typed page key landed them on "Title & Abstract".
The Layout Editor: note d.

<a id="fn-e"></a>
**e** — lib/pkp `PKPApproveSubmissionNotificationManager::updateNotification()`
creates `NOTIFICATION_TYPE_VISIT_CATALOG` while the current publication's
`datePublished` is set and deletes it otherwise (the approve-submission
notice the other way round); `isVisibleToAllUsers()` is true, and the
record has no user. OMP `Publication\Repository::publish()` and
`unpublish()` refresh it (so does submission completion); a Catalog Entry
save does not, so a date saved there leaves "Awaiting approval.". lib/pkp
`Repository::unpublish()` resets the status and leaves `datePublished`;
OMP `setStatusOnPublish()` fills it for a scheduled version too.
`WorkflowNotificationDisplay.vue` requests it on OMP's Production stage in
the editorial view (the OJS editorial configuration deep-merged under
`workflowConfigEditorialOMP.js` by `useWorkflowConfigOMP`) and in
`workflowConfigAuthorOMP.js`, and prints the title and text only; OMP
`ApproveSubmissionNotificationManager::getNotificationUrl()` builds a link
to `manageCatalog` that nothing on screen uses. Texts
`notification.type.visitCatalogTitle` "Catalog Management",
`notification.type.visitCatalog`. The publishing spec live-probed
2026-08-29: after "Publish", "Status / Submission published." plus a
"Catalog Management" notice. Live-probed 2026-09-27 (Actors row 7; Rule
14): note td15.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-27 (Actors row 7; Rule 14; A2, A6), OMP,
two runs: before publishing, the Production stage read "Awaiting
approval." with "The monograph will not be listed in the catalog until it
has been published. To add this book to the catalog, click on the
Publication tab."; a "Date Published" of 2030-01-01, 2031-06-06 or
2019-03-03 saved on "Catalog Entry" left it so. After "Publish", "Status"
("Submission published.") and then "Catalog Management" with the text
verbatim, no link in the box and none above it, for the Press manager,
an assigned Series editor, an assigned Layout Editor, `admin` and the
Author. A book published with "Date Published" 2030-01-01, and so
scheduled, showed "Catalog Management". After "Unpublish" › confirm,
"Catalog Management" stayed through a reload, "Awaiting approval." did
not return, and the Catalog page no longer listed the book.

<a id="fn-f"></a>
**f** — The page: `index.tpl` (`navigation.catalog` "Catalog", tab
`navigation.catalog.allMonographs` "All Monographs"). OMP
`CatalogListPanel` (PHP): title `submission.list.monographs` "Monographs",
`count` 30, the filter groups `catalog.categories` "Categories" (every
category of the press by `getLocalizedTitle()`, no parent names) and
`catalog.manage.series` "Series", each left out when empty; get params
`status` published and `orderByFeatured`. `CatalogListPanel.vue`: `Search`
(placeholder `common.search` "Search", a clear button), `common.filter`
"Filters", `submission.list.orderFeatures` "Order Features" /
`submission.list.saveFeatureOrder` "Save Order" behind `canOrderCurrent`,
`common.cancel` "Cancel", `submission.catalogEntry.new` "Add Entry";
headings `catalog.manage.featured` "Featured",
`catalog.manage.feature.newRelease` "New release",
`catalog.manage.categoryFeatured` "Featured in category",
`catalog.manage.feature.categoryNewRelease` "New release in category",
`catalog.manage.seriesFeatured` "Featured in series",
`catalog.manage.feature.seriesNewRelease` "New release in series";
`addFilter()` replaces the active filter, `removeFilter()` clears it;
`Pagination` while `lastPage > 1`. `CatalogListItem.vue`: the number,
`authorsStringShort`, `fullTitle`, `submission.list.viewSubmission` "View
Submission" (`urlWorkflow`), `submission.list.viewEntry` "View Entry"
(`urlPublished`), the screen-reader strings `catalog.manage.isFeatured`,
`isNotFeatured`, `isNewRelease`, `isNotNewRelease`. `ListPanel` empty
label `common.noItemsFound` "No items found.". The first page is rendered
by `ManageCatalogHandler::index()` with the same collector; the search
sends `searchPhrase` to `GET _submissions`, which by the collector also
matches keywords, subjects, disciplines and an ORCID iD (not driven).
Live-probed 2026-09-27 (Fields, the Catalog page; Rules 1, 3, 5), OMP, two
runs, as Press manager: the heading, tab, list heading, controls and all
four screen-reader strings as quoted; the number is the book's ID, the
authors in short form ("Reed" for Nova Reed); "View Submission" opened
the workflow on the current version's "Title & Abstract", "View Entry"
the book's page. The "Categories" group listed "Arts", "Physics",
"Science" ("Physics" a sub-category of "Science"); "Science" listed its
own books and not the book placed only in "Physics"; the chosen filter
had a button "Clear filter: Science" that brought the whole catalog back;
closing the column left the rows filtered under "Featured in category";
a press with neither categories nor series showed the column with its
heading alone; an empty list showed "No items found." and no headings.
Search: a phrase typed without Enter changed nothing; "arbou", a given
name, a word found only in one book's abstract and a book's number each
matched; "Harbour Tidal" gave "No items found."; Enter on an empty box
and the cross brought the list back.

<a id="fn-g"></a>
**g** — OMP `AddEntryForm` (`PUT _submissions/addToCatalog`): one
`FieldSelectSubmissions` `submissionIds`, label
`catalog.manage.findSubmissions`, suggestions from the `submissions` API
with `stageIds` Copyediting and Production and `status` queued and
scheduled; the default page's submit label `common.save` "Save".
`CatalogEditModal.vue` titles the panel "Add Entry". `addToCatalog()`
answers 400 `api.submissions.400.submissionIdsRequired` with no ids, skips
a current publication already published, runs `validatePublish()`
(declined, ORCID) and answers 400 with the requirement-keyed errors, else
calls `Repo::publication()->publish()` for each id posted, which fires
`PublicationPublished` and, through OMP `setStatusOnPublish()`, schedules a
future date. `Form.vue::error()` turns a 400 into the `form.errors`
notice ("…Please correct these errors and try again." in this checkout)
and would mark the fields named by the response's keys (`error`,
`hasUnauthenticatedOrcid`, `hasDuplicateOrcids`), none of which is a field
of this form. `CatalogListPanel::addEntryFormSuccess()` closes the panel
and reloads the list. The string `submission.catalogEntry.add` "Add
Selected to Catalog" is used nowhere. OMP
`SendSubmissionToOrcid::canDepositSubmission()` returns false, so a press
queues no ORCID deposit; the publishing spec's Side effects state the
deposit for every app. Live-probed 2026-09-27 (Fields, the "Add Entry"
panel; Rule 12; Side effects bullet 2; Settings bullet 6), OMP, as Press
manager, Press editor and Production editor, two runs: the panel covered
the page from the right, the side menu still visible; a click in the box
suggested nothing; "Lantern" suggested the press's Copyediting and
Production books, not its Submission-stage, review or published books nor
another press's; an author's name, a word of the abstract and a book's
number each found books, in a different order on the two runs; a chosen
book showed as a tag with "Remove {title}" and was suggested again;
"Close" and Escape shut the panel with no question, and the tags came back
on reopening but not after leaving the page. "Save" published one book,
two at once, and a Copyediting book, opening no window: "Status:
Published", "Version of Record 1.0", "The submission was published." and
"…moved this submission to the Done stage.", "Publication Published" once
to each user with an Author assignment and to nobody else, a new task for
each Author ("A new version of your submission, "{title}", was
published."), and, with DOIs assigned "Upon publication", a DOI where
there was none. A book dated 2030-01-01 was scheduled ("Status:
Scheduled"), sent no email and stayed among the suggestions. With nothing
chosen, or with an unverified or duplicated iD while "Enable ORCID
functionality" was ticked (Settings › Users & Roles › "ORCID"; Settings ›
Distribution has no ORCID tab; the duplicated iD written into the
database, since the contributor form's "ORCID iD" cannot be typed in),
"Save" answered 400 with the notice at the top right for about five
seconds and nothing marked, and a refused book chosen with an acceptable
one left both unpublished; with the box unticked both books were added.
With ORCID on and a verified contributor, the job queue held no ORCID
deposit job before or after "Save".

<a id="fn-h"></a>
**h** — OMP `CatalogEntryForm`: groups `publication.placement`
"Placement", `publication.publicationTiming` "Publication Timing",
`publication.versionAndUpdates` "Version and Updates",
`publication.display` "Display", `publication.access` "Access"; fields
`seriesId` (`series.series`, `publication.series.description`, an empty
first option, inactive series via `publication.inactiveSeries`),
`seriesPosition` (`submission.submit.seriesPosition`, its description),
`categoryIds` (only when the press has categories), `datePublished`
(`publication.datePublished` "Date Published", its description),
`updateType`, `summaryOfChanges`, `coverImage` (`monograph.coverImage`,
multilingual `FieldUploadImage`: `common.upload.addFile` "Upload File",
`common.altText` "Alternate text", `common.remove` "Remove"), `urlPath`;
`successMessage` `publication.catalogEntry.success` "The catalog entry
details have been updated.", which the page never shows: the form's footer
shows "Saving", then "Saved". Validation: lib/pkp
`schemas/publication.json` (`datePublished` `date_format:Y-m-d`,
`publication.datePublished.errorFormat`; `urlPath`
`regex:/^[a-zA-Z0-9]+([\.\-_][a-zA-Z0-9]+)*$/`, `validator.alpha_dash_period`),
`Publication\Repository::validate()` (`publication.urlPath.numberInvalid`,
`publication.urlPath.duplicate` within the press). OMP
`Repository::edit()` makes the cover's thumbnail with `makeThumbnail()` at
`coverThumbnailsMaxWidth` × `coverThumbnailsMaxHeight`, and saving those
settings remakes every thumbnail of the press. "Insert Content"
on the Summary of Changes: `WorkflowPublicationForm.vue`
(`formName === 'catalogEntry' && isOMP()`). Live-probed 2026-09-27
(Fields, the Catalog Entry page; Rules 13, 13a–13f; Side effects bullet
3; Settings bullet 4), OMP, as Press manager: "Series" with an empty first
choice, "Anthropology (Inactive)" for an inactive series, and the Series
tab's order at both ends (unordered, and after the tab's "Order");
"Update Type" with 12 kinds, "New Version" chosen, and no "Associated
review round" (a journal's "Publication Settings" has it between the two
fields; a preprint server's "Preprint entry" has neither it nor "Insert
Content"); "Categories" left out on a press with none; "05/05/2020" and
"2024-02-30" refused under "Date Published" and not saved; an empty date
stamped the day of "Publish", 2020-05-05 was kept, 2030-01-01 scheduled;
"Correction" and a summary saved on the version; "Create New Version"
copied the page to 1.1, which then saved apart from 1.0; about 25 saves,
each "Saving" then "Saved". "History" put the book on the readers' series
page and under "Filters", the empty choice took it off both. Series
positions printed above each title on the readers' series page, not on
the book's page. A 400×400 PNG with "Cover of the book" came back after a
reload; the public catalog and the book's page both showed the 100×100
small copy with that text alternative; "Remove" showed "Restore Original"
until "Save", which removed the image and brought the default picture
back; a bilingual book offered a second cover box for French. The cover
sizes sit on Website › Appearance › "Advanced" (106 and 100; "Setup" has
neither): at 200 × 50 a new 120×80 cover became 75×50, and saving 30 × 300
turned an existing 106×71 small copy into 30×20 with no Catalog Entry
save. Each Website settings load answered the plugin gallery's known
server error (the plugins spec's A1). One "Save" added one "Submission
metadata updated" line to the Activity Log.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-27 (Rule 1), OMP, two runs, as Press
manager: a press with no published book read "No items found."; of a
published, a scheduled (2030-01-01) and an unpublished book in
Production, only the published one was listed; a book whose only
published version became "Author Original 1.0" left the list; 30 books
gave 30 rows and no page links, 31 gave 30 rows and "Previous 1 2 Next",
with the 31st on page 2.

<a id="fn-i"></a>
**i** — `ManageCatalogHandler::index()` and `CatalogListPanel::getConfig()`
read `catalogSortOption` (default `datePublished-DESC`, lib/pkp
`Repository::getDefaultSortOption()`); OMP `Collector::getQueryBuilder()`
with `orderByFeatured` puts the rows holding a `features.seq` for the
current press, category or series first, by `seq`. For each filter
`getConfig()` computes the direction as `$sortDir ==
\PKP\db\DAO::SORT_DIRECTION_ASC ? 'ASC' : 'DESC'`, but the stored options
read "title-ASC" and the like, and `'ASC' == 1` is false, so every filter
sorts descending. `catalogSortBy` / `catalogSortDir` are passed to the
panel's constructor, which keeps only declared properties, and set in
`getConfig()` before `$config = parent::getConfig()` overwrites them, so
the Vue props keep their defaults (`datePublished`, 1);
`updateSortOrder()` then sends `orderDirection=1` when a filter is
removed, which `getSubmissionCollector()` reads as descending. New
category and series defaults: the categories spec's and the sections
spec's Fields. Live-probed 2026-09-27 (Rules 2, 4; Settings bullets 1–3;
A3), OMP, two runs, as Press manager: on a new press, featured books
first in their featured order, then newest first; with the press on
"Title (A-Z)" or "Publication date (oldest first)" the books not featured
followed it. "Science" on "Title (A-Z)" and on "Title (Z-A)" listed
Gamma, Beta, Alpha, on "Publication date (oldest first)" newest first;
the series "History" on its default "Title (A-Z)" listed Gamma, Beta,
Alpha, and on either "Series position" order the request asked for
position, highest first. With the press on "Title (A-Z)", a filter chosen
and removed brought the list back newest first, and a reload restored
the press's order. The readers' "Science" page and public catalog listed
Alpha, Beta, Gamma. The six "Order of monographs" choices and their
defaults read as Settings bullets 1–3 say (none marked on a new press,
"Publication date (newest first)" on a new category, "Title (A-Z)" on a
new series); a journal's and a preprint server's "Setup" tab has neither
these choices nor "Featured Books" / "New Releases".

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-27 (Rule 3; Fields "Filters" row), OMP, two
runs: note f; "Science" gave "Featured in category" and "New release in
category" over its own books, a book featured in "Arts" ticked only
there; "Arts" replaced "Science"; "Arts" pressed again brought the whole
catalog back under "Featured" and "New release"; "Order Features" showed
where the chosen list had a featured book and not elsewhere.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-27 (Rule 4; A3): note i.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-27 (Rule 5), OMP, two runs, on a press with
"Harbour Currents" by Nova Reed and "Tidal Patterns": "Harbour" listed
"Harbour Currents", the cross both books, "Reed" "Harbour Currents", the
number of "Tidal Patterns" that book; with "Harbour" typed, choosing a
category kept the phrase and narrowed within it, and a category holding
neither book showed "No items found.".

<a id="fn-j"></a>
**j** — `CatalogListItem::toggleFeatured()` / `toggleNewRelease()` edit
the item's `featured` / `newRelease` lists and `saveDisplayFlags()` posts
both whole lists; OMP `BackendSubmissionsController::saveDisplayFlags()`
deletes every row of the book (`FeatureDAO::deleteByMonographId()`,
`NewReleaseDAO::deleteByMonographId()`) and inserts the posted ones,
resequencing each list, and answers with the stored lists. An existing
flag is looked up by `assoc_type` alone (`feature.assoc_type ===
this.filterAssocType`), while the box's state (`isFeatured`,
`isNewRelease`) matches type and id. Public side: OMP
`CatalogHandler::page()` (`orderByFeatured()`), `newReleases()`
(`NewReleaseDAO::getMonographsByAssoc()`: published submissions only,
newest `date_published` first), `series()`, and `IndexHandler` behind
`displayFeaturedBooks` / `displayNewReleases`. The category page is
lib/pkp `PKPCatalogHandler::category()`: it orders by `featured` through
the search index builder, whose `DatabaseEngine` sorts by
`MAX(features.seq)` over every feature row of the book, whatever its
list; it computes the category's sort option and never uses it, and
assigns neither `featuredMonographIds` nor `newReleasesMonographs`, which
`catalogCategory.tpl` still reads (last changed in pkp-lib `818aeda367`,
2026-01-14, pkp/pkp-lib#8920). OMP `submission\DAO` deletes a book's
flags with the book; `unpublish()` touches neither table. No mail or log
call on these paths. Live-probed 2026-09-27 (Rules 6–9; Side effects
bullet 1; Settings bullet 5), OMP, as Press manager and Press editor: a
box press saved at once with no message and held after a reload; the
ticked book kept its row until the reload; the public catalog listed a
book featured in the whole catalog first and dropped it once unticked;
the home page's "Featured" and "New Releases" lists showed only with
their "Setup" boxes ticked, and the Catalog page read the same either
way; "New Releases" listed the ticked books newest first by publication
date, not in ticking order; a series page listed its featured book first
and had a "New Releases" list. Unpublishing kept the book's flag rows,
and publishing again brought it back with its boxes ticked;
"Decline Submission" › "Delete" removed its rows (read from the database
after the on-screen delete). A second category's box took the first
category's flag away and stayed empty, a second press marked it; a book
moved to another series kept its old series' rows until the new series'
box was pressed. No tick and no "Save Order" sent an email (mail
catcher), added a task (the Author's Tasks count unchanged) or a line to
the Activity Log; the republish's "Publication Published" was the control.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-27 (Rules 6, 7; Side effects bullet 1): note
j.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-27 (Rule 8; A4): note j, both flags, two
categories and a series move.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-27 (Rule 9), OMP, two runs: note j; the
unpublished book left the Catalog page with and without a filter, the
public catalog and "New Releases", and came back first, ticked, after
"Publish".

<a id="fn-k"></a>
**k** — `CatalogListPanel::toggleOrdering()`; `itemOrderUp()` returns at
the first item, but `itemOrderDown()` only at the last of all the list's
items, the hidden rows that are not featured among them, so the last
featured book's down arrow moves it below those rows (A13);
`setItemOrderSequence()` numbers the current list's featured items from 0
and posts `saveFeaturedOrder` (no success message; the list is not
refetched); `cancelOrdering()` refetches; the `-isOrdering` styles hide
the other header buttons, the search, the item actions, the headings, the
rows not featured and the drag handle (`orderer__dragDrop`), so nothing
can be dragged (A11), and leave the filter column alone (A12). The
arrows' labels `common.orderUp` "Increase position of {$itemTitle}" /
`common.orderDown` are given `item.title`, which a catalog item lacks
(A14). The notice: `submission.list.orderingFeatures`,
`submission.list.orderingFeaturesSection`. A newly ticked book is posted
with `seq: 1` and `FeatureDAO::resequenceByAssoc()` renumbers by `seq`
with no tie-break; a box press leaves the list numbered from 1 and "Save
Order" from 0, so the new book ties with the first book after a box press
and with the second after a "Save Order". The appearance spec
live-probed 2026-09-24: "Order Features" › "Save Order" turned "Featured"
from M1, M2 to M2, M1, while "New Releases" kept M1, M2. Live-probed
2026-09-27 (Rules 10, 11; A11–A14), OMP, as Press manager: the notices as
quoted ("…on the homepage.", "…in Science.", "…in History."); only the
featured rows, each with two arrows; the search, "Filters", "Add Entry",
the boxes, the row links and the headings hidden, "Save Order" and
"Cancel" shown; a mouse drag of the third row onto the first left the
order as it was; M3's up arrow twice gave M1, M3, M2, then M3, M1, M2;
"Save Order" answered with no message, and the order held after a reload,
on the public catalog and in the home page's "Featured" list; "Cancel"
brought back the saved order at once; leaving for the Dashboard's
address mid-ordering asked nothing, and the saved order was there on
return (two runs). "Order Features" showed as soon as a first box was
ticked.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-27 (Rule 10): note k.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-27 (Rule 11), OMP: after a "Save Order" of
M1, M2, M3, a fourth book ticked "Featured" was third after a reload, in
three runs, and did not move before the reload; after box presses only,
a newly ticked book came first in one run and second in two; "Order
Features" then moved it.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-27 (Fields, the "Add Entry" panel; Rule
12; Side effects bullet 2): note g.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-27 (Rule 13g), OMP, as Press manager: "my
book" and "-lead" were refused with "This may only contain letters,
numbers, dashes, underscores and periods.", "12345" with "The URL path can
not be a number.", "harbour" (another book of the press) with "The URL
path has already been used and can not be used again.", each with the
top-right notice "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again." and nothing
saved after a reload; "elsewhere", used by a book of another press,
"harbour.v2_b" and "harbour-2" saved, and once the book was published
`catalog/book/harbour-2` opened it and the catalog's links used the
path. The cover: note h.

<a id="fn-s"></a>
**s** — Scenario seeding. Scenario 7 runs on `publicknowledge` of OJS
and OPS as `manager.maya` (the Journal Manager, the Preprint Server
Manager), its control on OMP `publicknowledge` as `manager.maya` (the
Press manager); the published article, preprint and book are scratch
submissions of `author.alex` from `POST scenarios/submission` with
`published: true` (the book of the control through `decisions:
['skipExternalReview', 'sendToProduction']` first, so it has a
Production stage); passwords as `docs/process/users.md` gives them.
The Catalog page's address is `{context}/manageCatalog`. Every other
scenario builds its own scratch press through `POST scenarios/context`
with throwaway `users[]` (password: the username twice): `manager`
(the Press manager) in each, plus `author` (the books' submitter) in
scenarios 1, 2, 3 and 5, two `author` accounts with `givenName`/`familyName` Nova Reed and Ian Lowe
in scenario 4, and `sectionEditor` (the Series editor), `marketing`
(the Marketing and sales coordinator), `author` and `reader` in
scenario 6. Scenario 3's press carries `catalogSortOption: 'title-ASC'`;
scenario 4's `categories: [{path: 'arts', title: 'Arts'}, {path:
'science', title: 'Science', children: [{path: 'physics', title:
'Physics'}]}]` and `series: [{path: 'history', title: 'History'}]`;
scenario 5's the same `series`. Books come from
`POST scenarios/submission` with `title`, the author as `submitter`,
`published: true` and `datePublished` where a date is named. Scenario
1's two Production books take `decisions: ['skipExternalReview',
'sendToProduction']`, "Lantern Tides" also `datePublished:
'2020-05-05'` without `published`, and "Lantern Draft" no decision.
Scenario 3: `featured: [{in: 'catalog', position: n}]` with n = 1, 2, 3
for "Oak", "Elm", "Ash", seeded in that order, and `newRelease: [{in:
'catalog'}]` for "Birch" and "Maple". Scenario 4: each book's
`categories` (the paths) or `series: 'history'`; "Harbour Currents"
`featured: [{in: 'catalog'}]`, "Tidal Patterns" `featured: [{in:
'category', path: 'arts'}]`; each book an `abstract` holding none of
the words searched (the default abstract names the tag). Scenario 5:
"Tidal Patterns" `urlPath: 'harbour'`; the cover is the fixture
`profile-image-400.png`, uploaded on screen (OMP's submission scenario
takes no cover). The visitor's pages: the public catalog
`{press}/catalog`, "New Releases" `{press}/catalog/newReleases`, a
series' page `{press}/catalog/series/{path}`, a book's page the row's
"View Entry". The mail catcher is Mailpit at `MAILPIT_URL`, scoped by
recipient address; the visitor is a browser with no session. The
seeded press's catalog lists whatever earlier runs published
(`docs/process/seed-facts.md`), so no scenario reads its list.
Live-probed 2026-09-27: `manager.maya` held a manager-level role on the
seeded journal and preprint server, and the seeded press's Catalog page
listed 19 books, each left by an earlier run.

<a id="fn-f-a1"></a>
**f-a1** — Note c; the symptom live-probed 2026-09-27 there, two runs.
The lean's history: the page's role assignment has admitted
`ROLE_ID_SUB_EDITOR` since the list-panel rewrite of the catalog page
(omp `c10ec7983`, 2017-05-18); the API operations it calls were
manager-and-admin only in the Slim handler that preceded the current
controller and still are.

<a id="fn-f-a2"></a>
**f-a2** — Note e: the text `notification.type.visitCatalog` predates the
current workflow screen, whose Production stage has no links above the
notice box; the author's Production configuration includes the same
display. Live-probed 2026-09-27 (note td15): no link in the box or above
it; the Author's menu has no "Marketing" group and no "Catalog Entry", a
typed page key lands them on "Title & Abstract", and the Catalog page's
address gives them the access-denied page.

<a id="fn-f-a3"></a>
**f-a3** — Note i, live-probed 2026-09-27 there. The integer comparison
fits the older numeric sort options; the stored options read "…-ASC" /
"…-DESC" today, so the check never matches (decay, not choice).

<a id="fn-f-a4"></a>
**f-a4** — Note j, live-probed 2026-09-27 there (note td9). The type-only
lookup in `toggleFeatured()` / `toggleNewRelease()` has been there since
the catalog list panel was added (ui-library `56b809dc`, 2017-09-05).

<a id="fn-f-a5"></a>
**f-a5** — Note g, live-probed 2026-09-27 there: the empty "Save" and the
ORCID refusals showed only the generic notice; the server's answer to an
empty "Save" carries "You must provide one or more submission ids to be
added to the catalog."; the workflow's "Schedule For Publication" window,
for the same books, named the requirement and offered no publish button.
"Please fix the errors marked below" is in no English locale file of the
checkout.

<a id="fn-f-a6"></a>
**f-a6** — Note e: the notices key on `datePublished`, which a scheduled
version carries and an unpublished one keeps. Live-probed 2026-09-27
(note td15). The Production stage's spec records the unpublish half as
its OMP2.

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-27, OMP, two runs, as Press manager on
`{press}/fr_CA/manageCatalog` of a press with French enabled: the keys
quoted; a book titled in both languages showed its French title. The
French strings of these keys are empty in the install's `fr_CA` locale
files. The panel headers' "##common.help##" is the navigation spec's A1.

<a id="fn-f-a8"></a>
**f-a8** — Note g. Live-probed 2026-09-27, OMP, two runs, as Press
manager: "Lantern" typed, five suggestions, no tag; "Save" posted the
first suggestion's ID to `addToCatalog` (200), the panel closed, and after
a reload that book was listed (a different book on each run). Tab out of
the box turned the first suggestion into a tag.

<a id="fn-f-a9"></a>
**f-a9** — Note g: `addToCatalog()` publishes once per ID posted.
Live-probed 2026-09-27, OMP, two books, as Press manager: the same ID
posted twice, 200, the panel closed and the book listed; one
publication, `version_major` 2; the Activity Log read "The submission was
published.", "…moved this submission to the Done stage.", "The
submission was published."; the Author's mailbox held two "Publication
Published".

<a id="fn-f-a10"></a>
**f-a10** — Note j (the category page's code). Live-probed 2026-09-27,
OMP, two runs, signed out, after the job queue ran: Gamma, featured and a
new release in "Science", came second on the "Science" page behind Alpha,
featured only in "History"; Gamma featured only in the whole catalog
came first; a book ticked "New release in category" left the page with
no "New Releases" list.

<a id="fn-f-a11"></a>
**f-a11** — Note k. Live-probed 2026-09-27, OMP, two runs: the drag
handle never visible; a mouse drag of the third row onto the first left
the order as it was.

<a id="fn-f-a12"></a>
**f-a12** — Note k. Live-probed 2026-09-27, OMP, as Press manager, three
runs: with "Science" chosen and its column open, "Order Features", then
"History" (nothing featured there) left the notice "…in History." alone
on the page; "Science" again brought back the rows, "Save Order" and
"Cancel", the moves undone. In another run "Save Order" did not come back
until a reload.

<a id="fn-f-a13"></a>
**f-a13** — Note k. Live-probed 2026-09-27, OMP, three runs, M3, M1, M2
featured: the first up arrow and the last down arrow changed nothing on
screen; then M1's down arrow changed nothing either. After M2's down
arrow alone, its up arrow pressed once changed nothing and pressed twice
gave M3, M2, M1.

<a id="fn-f-a14"></a>
**f-a14** — Note k. Live-probed 2026-09-27, OMP: every arrow of every row,
with and without a filter.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The Catalog page, its one tab | side menu "Content" › "Catalog"; `{press}/manageCatalog` | ROUTE-062, VUE-020, AFFM-263 |
| "Search", "Filters" | the Catalog page; `GET api/v1/_submissions` | AFFM-264, AFFM-265 |
| "Add Entry" panel | the Catalog page › "Add Entry"; `PUT api/v1/_submissions/addToCatalog` | AFFM-266, VUE-101, API-059 |
| "Order Features", the arrows | the Catalog page; `POST api/v1/_submissions/saveFeaturedOrder` | AFFM-267, AFFM-270, API-059 |
| "Featured", "New release" boxes | the Catalog page's rows; `POST api/v1/_submissions/saveDisplayFlags` | AFFM-268, AFFM-269, API-059 |
| "View Submission", "View Entry" | the Catalog page's rows | AFFM-271 |
| The "Catalog Entry" page | workflow › "Publication" › the version › "Catalog Entry"; `GET api/v1/submissions/{id}/publications/{publicationId}/_components/catalogEntry` | AFFW-427, API-061 (cited; *Publication metadata*) |
| "Insert Content" on "Summary of Changes" | the "Catalog Entry" page | AFFW-424 (the catalog-entry half, cited; *Publish, schedule & versions*) |
| The "Catalog Management" notice | the workflow's Production stage | NOTIF-038 |

## Reference — code anchors

- Page and handler: OMP `pages/manageCatalog/index.php`,
  `pages/manageCatalog/ManageCatalogHandler.php`,
  `templates/manageCatalog/index.tpl`, `classes/template/TemplateManager.php`
  (`setupBackendPage()`).
- List panel: OMP `classes/components/listPanels/CatalogListPanel.php`;
  ui-library `src/components/Container/ManageCatalogPage.vue`,
  `src/components/ListPanel/submissions/CatalogListPanel.vue`,
  `CatalogListItem.vue`, `CatalogEditModal.vue`,
  `src/components/Orderer/Orderer.vue`,
  `src/components/Form/fields/FieldSelectSubmissions.vue`.
- Add Entry form: OMP `classes/components/forms/catalog/AddEntryForm.php`.
- API: OMP `api/v1/_submissions/BackendSubmissionsController.php`
  (`saveDisplayFlags()`, `saveFeaturedOrder()`, `addToCatalog()`,
  `getSubmissionCollector()`); lib/pkp
  `api/v1/_submissions/PKPBackendSubmissionsController.php`; OMP
  `api/v1/submissions/SubmissionController.php` (`getCatalogEntryForm()`).
- Flags and order: OMP `classes/press/FeatureDAO.php`,
  `classes/press/NewReleaseDAO.php`, `classes/submission/Collector.php`
  (`orderByFeatured()`).
- Catalog Entry page: OMP `classes/components/forms/publication/CatalogEntryForm.php`,
  `classes/publication/Repository.php` (`edit()`, `publish()`,
  `setStatusOnPublish()`, `unpublish()`, `makeThumbnail()`); lib/pkp
  `classes/publication/Repository.php` (`validate()`, `validatePublish()`),
  `schemas/publication.json`; ui-library
  `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOMP.js`,
  `useWorkflowNavigationConfig/useWorkflowNavigationConfigOMP.js`,
  `src/pages/workflow/components/publication/WorkflowPublicationForm.vue`.
- Notice: lib/pkp `classes/notification/managerDelegate/PKPApproveSubmissionNotificationManager.php`;
  OMP `classes/notification/managerDelegate/ApproveSubmissionNotificationManager.php`;
  ui-library `src/pages/workflow/components/primary/WorkflowNotificationDisplay.vue`,
  `workflowConfigAuthorOMP.js`.
- Strings: OMP `locale/en/locale.po` (and the other OMP `.po` files) for
  `catalog.manage.*`, `submission.list.orderFeatures`,
  `submission.catalogEntry.new`, `publication.catalogEntry*`,
  `notification.type.visitCatalog*`; lib/pkp `locale/en/*.po` for
  `common.*`, `publication.urlPath.*`, `form.errors`.
