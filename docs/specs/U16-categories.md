---
name: categories
status: verified
---

# Categories

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Categories let a journal offer its published work by topic, beside and
across its sections. A Journal Manager builds the journal's category tree
on Settings › Journal › "Categories": top-level categories and
sub-categories under them, to any depth, each with a name, a path that
becomes its address, and optionally a description, a picture, an order for
its page and editors meant to be assigned automatically to new submissions
made in it ([A13](#a13)). Editors place each version of an article in any
number of categories on the version's Publication Settings page (a
preprint server's "Preprint entry" page, a press's "Catalog Entry" page);
an author may pick categories while submitting when the journal asks for
them. Readers browse by category: every category has a public page
listing the published articles placed in it, reached from the "Browse"
block of the sidebar, from an article's own page and, on a journal with
"Include a listing of categories" ticked (Settings bullet 9) and on a
preprint server, from the home page's row of top-level categories.
Unlike a section, a category is optional and many-to-many: an article
sits in exactly one section and in as many categories as its editors
choose, none at all included. <sup>a</sup>

## Actors & permissions

"Whoever opens the Settings pages" below is the rule
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
sets: a manager-level role with "Permit changes to Settings", and the Site
Administrator on a journal. Every other role (Section Editor, the
assistant roles, Author, Reviewer, Reader) is refused the Settings pages
with the access-denied page. Readers need no account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Build the category tree** (Settings › Journal › "Categories": "Add Category", a row's "More Actions" › "Add", "Edit" and "Delete Category"; Rules 1–7) | • whoever opens the Settings pages; nobody else <sup>b</sup> |
| **Place a version in categories** (the "Categories" field of the Publication Settings page {OJS}, "Preprint entry" {OPS} or "Catalog Entry" {OMP}; Rule 16) | • whoever the workflow shows that page to and who may edit the version: [Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs) (Rule 10 there) and [Publication metadata](U40-publication-metadata.md#edit-gate) <sup>f</sup> |
| **Pick categories while submitting** (the wizard's "For the Editors" step; "For Readers" on a preprint server) | • the submitting Author, while the journal asks for categories (Settings bullet 1) and has at least one ([Submission wizard](U21-submission-wizard.md#steps)) <sup>f</sup> |
| **Be assigned automatically to a new submission** (Rule 18) | • each user ticked under the category's "Editorial Assignments", when a submission arrives carrying that category, and only on the install's first journal; on any other journal or press nobody is assigned [A13](#a13)<br>• on a preprint server: nobody; the window offers no one to tick ⚠ [OPS1](#ops1) <sup>k</sup> |
| **Browse by category** (the category pages, the "Browse" block; Rules 8–15) | • any visitor, signed in or not; on a journal that requires visitors to sign in, a signed-out visitor gets the Login page ([Journal identity & about pages](U07-journal-identity-and-about-pages.md), Rule 22) <sup>g</sup> |
| **Choose what the press's "Browse" block lists** {OMP} (Settings › Website › "Plugins", "Browse Block" › "Settings"; Rule 15) | • whoever opens the Settings pages <sup>h</sup> |

## Fields & validation

**The "Categories" tab** (Settings › Journal › "Categories"; on a press
Settings › Press, on a preprint server Settings › Server). A table headed
"Categories" with the button "Add Category" at its top right and the
columns "Category Name" and "Assigned To" (the names of the editors under
the category's "Editorial Assignments", comma-separated). Each row ends in
a "More Actions" button (three dots) whose menu reads "Add", "Edit" and
"Delete Category", and, when the category has sub-categories, an arrow
that opens and closes them (Rule 3). A journal with no category shows "No
Items" in the table. With the screens switched to French, the tab, its
delete dialog and the "Select Categories" window show raw codes such as
"##GRID.CATEGORY.CATEGORYNAME##" in place of many of their words
⚠ [A15](#a15). <sup>c</sup>

**The category window** ("Add Category" from the button or from a row's
"Add"; "Edit Category" from a row's "Edit"). It opens from the right and
holds one form with "Save" at its foot. A save the form refuses behaves as
on Settings › Journal: "This field is required." under each empty required
box, the error count and "Go to" links beside "Save" (see
[Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Fields). The window's "Close", and Escape, shut it without a question,
whatever was typed ⚠ [A16](#a16). A journal with a second form language
shows that language's button ("French") at the top and, under "Name" and
"Description", the line "0/2 languages completed"; pressing "French" adds
"Name in French" and "Description in French" under the English boxes.
"Path", "Order of articles" and "Cover Image" have one box. The fields,
top to bottom: <sup>d</sup> <sup>td1</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" | yes, in the primary language | Plain text, per language. What the tab, the category's page, the "Browse" block and the pickers show. Two categories may share a name <sup>d</sup> |
| "Path" | yes | Under it: "The category's URL will be: {address}", the journal's address followed by "catalog/category/path" ("preprints/category/path" on a preprint server). Letters, digits, "-", "_", "." and "/" are accepted; anything else is refused with "The category path must consist of only letters and numbers." ⚠ [A9](#a9). A path another category of the journal already has is refused with "The category path already exists. Please enter a unique path." A path that differs from another only in letter case is accepted ("ARTS" beside "arts"), and each address opens its own category. A path containing "/" is saved, and every link prints it ("sci%2Fphys"), but following one opens the page of the category whose path is the part before the "/" ("Slashed", path "sci/phys", opens "Science"), or the not-found page of Rule 13 when there is none ⚠ [A8](#a8). What the path does: Rule 5 <sup>d</sup> <sup>td2</sup> |
| "Description" | no | Formatted text per language with the buttons "Bold", "Italic", "Superscript", "Subscript", "Insert/edit link" and "Blockquote". Shown on the category's page (Rule 9) <sup>d</sup> |
| "Order of articles" ("Order of monographs" on a press, "Order of preprints" on a preprint server) | always has a value | A list under "Choose how to order articles in this category." ("…books…", "…preprints…"): "Title (A-Z)", "Title (Z-A)", "Publication date (oldest first)" and "Publication date (newest first)", the last preselected on a new category; a press adds "Series position (lowest first)" and "Series position (highest first)". What it changes: Rule 10 <sup>d</sup> |
| "Cover Image" | no | An upload box for a .jpg, .png or .gif picture, with its "Alternate text" box once a picture is in; the box works as the upload boxes of [Appearance & theming](U10-appearance-and-theming.md) (Fields) describe. A file of another type is refused as it is dropped ("You can't upload files of this type."); a file named as a picture but holding none is refused at "Save" with "An invalid image was uploaded. Accepted formats are .png, .gif, or .jpg.", after leaving a broken preview ⚠ [A17](#a17). Shown on the category's page (Rule 12) <sup>d</sup> |
| "Editorial Assignments" {OJS OMP} | no | A group under "Select the editorial users who should be assigned automatically to all new submissions to this category.", with one list of boxes per role that works on the Submission stage at the manager, Section Editor or assistant level and has at least one member (on a journal the lists "Journal editor", "Section editor", "Guest editor" and "Funding coordinator"; on a press "Press editor", "Series editor" and "Funding coordinator"; the Journal Manager, Production Editor and Copyeditor roles are not among them), each list headed by the role's name and each box reading "Assign {name} as {role}". What a tick does: Rule 18. With none of those roles held by anyone, the heading and sentence show with no box under them; a preprint server is always in that state ⚠ [OPS1](#ops1) <sup>k</sup> <sup>td3</sup> |

**The delete dialog** (a row's "More Actions" › "Delete Category"). Headed
"Are you absolutely sure you want to delete "{name}" category?", it reads
"Warning: Deleting this category will remove all {n} sub-categories within
it.", where {n} counts the sub-categories at every level below it (0 for a
category without any), then "This action cannot be undone. Deleting the
category will:" with the two points "Permanently remove all nested
sub-categories" and "Unassign this category from any submissions currently
using it", then "This will not delete the submissions themselves — they
will simply be left without a category." and "To confirm, please type the
name of the category "{name}" below to proceed", a text box with no name
for a screen reader ⚠ [A18](#a18), and the buttons "I understand the
consequences, delete this category" and "Cancel". What the buttons do:
Rule 7. <sup>e</sup>

<a id="category-picker"></a>
**The category picker.** One field, labelled "Categories", serves every
screen that puts an article in categories or narrows a list by them: the
Publication Settings, "Preprint entry" and "Catalog Entry" pages (under the
group "Placement", with the description "Assign categories to help
organize and filter this publication."), the wizard's "For the Editors"
step ("For Readers" on a preprint server;
[Submission wizard](U21-submission-wizard.md#steps)) and the submission
lists' "Filters" window
([Submissions dashboard (editorial)](U23-submissions-dashboard.md)). Each
screen offers it only while the journal has at least one category. It
holds a typing box with the line "Selected: None" (or the chosen
categories) and, under it, the button "Select Categories". In the wizard
the field reads "Select only the categories that are appropriate for your
submission.", and the wizard's "Review" step lists "Categories" with the
chosen names, or "None selected". How it behaves: Rule 16. <sup>f</sup>

**The "Select Categories" window** (the picker's button). It opens from the
right under the heading "Select Categories": a table with the column
"Name" listing every category of the journal as a tree, top-level names in
bold, each with a box, and every branch open; then "Save". <sup>f</sup>
<sup>td4</sup>

**A category's page** (the visitor's side). Top to bottom: <sup>g</sup>

| Part | Shows | Rules |
|------|-------|-------|
| Breadcrumb | "Home", then the parent category when there is one, then the category's name | Rule 11 <sup>g</sup> |
| Heading | the category's name | — <sup>g</sup> |
| Count | "{n} Items" ("{n} Titles" on a press): the published items listed below, over all pages; one item reads "1 Items" ("1 Titles") ⚠ [A19](#a19) | Rule 8 <sup>g</sup> |
| Picture and description | the category's "Cover Image", as a small copy, and its "Description", each only when set | Rule 12 <sup>g</sup> |
| "Subcategories" | a list of links, one per sub-category directly under this one; absent when there is none | Rule 2 <sup>g</sup> |
| "All Items" ("All Books" on a press) | a heading drawn on a press; on a journal and a preprint server only a screen reader hears it. Under it the published items placed in the category, each shown as its summary, then the page links | Rules 8–10 <sup>g</sup> |

**The "Browse" block** (the sidebar; Rules 14, 15). Headed "Browse", with
the line "Categories" and the journal's categories as links under it. A
press's block may also carry "New Releases" and a "Series" list. On a
journal and a preprint server "Browse" is a heading for a screen reader
too; on a press it is drawn like one but read as plain text, so the block
cannot be reached by heading ⚠ [OMP3](#omp3). <sup>h</sup>

## Rules & state

**The tree**

1. **Top-level categories and sub-categories.** "Add Category" at the top
   of the tab makes a top-level category. A row's "More Actions" › "Add"
   makes a sub-category of that row's category; its window is the same
   "Add Category" window and does not name the parent. A sub-category can
   have sub-categories of its own, to any depth. Once saved, a category
   stays where it was made: no window offers a parent, so a category
   cannot be moved under another one or up to the top level ⚠ [A4](#a4).
   <sup>j</sup>
2. **Order.** Every list of categories runs alphabetically by name, in the
   language the page is shown in: the tab, each level of sub-categories,
   the "Browse" block, a category page's "Subcategories" and the "Select
   Categories" window. A category with no name in that language shows its
   name in the journal's primary language and comes after every named
   one, in an order that is not alphabetical and differs from list to
   list. A journal cannot set its own order. <sup>i</sup> <sup>td5</sup>
3. **The tab's arrows.** The tab opens with only the top-level categories
   showing. A row's arrow shows its direct sub-categories, indented under
   it; pressed again, it hides them along with everything opened below
   them, and opened once more the row shows its sub-categories as they
   were left, an opened one still open. Each level opens separately, and
   a reload closes them all. After a sub-category is saved, its parent's
   row opens so the new row shows. <sup>c</sup> <sup>td1</sup>
   - 3a. **The keyboard and a screen reader.** Only a pointer opens a
     row: Tab reaches each row's arrow after its "More Actions", but Enter
     and Space on it do nothing. For a screen reader every row carries the
     arrow button, named "Expand sub-categories" whether the row is open
     or not, and also on rows with nothing under them, where it does
     nothing ⚠ [A11](#a11). <sup>c</sup> <sup>td1</sup>
4. **Saving a category.** "Save" in the window stores the category, closes
   the window, shows "Category saved" at the top right and refreshes the
   tab. A refused save keeps the window open with the messages of Fields.
   <sup>d</sup>
5. **The path is the address.** A category's page lives at the journal's
   address followed by "catalog/category/" and the path
   ("preprints/category/" on a preprint server). A path is unique within
   the journal; another journal may use the same one. Changing the path
   moves the page: the old address then answers the not-found page of
   Rule 13, and every link the site prints follows the new path.
   <sup>g</sup>
6. **Editing.** "Edit" opens the category's window filled with its saved
   values, its editors ticked. Everything the window holds can change;
   the category's place in the tree cannot (Rule 1). <sup>d</sup>
7. **Deleting.** "I understand the consequences, delete this category"
   stays grayed out until the box holds the category's name exactly as
   the tab shows it. Pressed, it deletes the category and every
   sub-category below it, at every level, and removes them from every
   article that was placed in them; the articles themselves stay as they
   are. A second dialog, "Category Deleted", then reads ""{name}" and its
   {n} sub-categories have been successfully deleted." and "All
   submissions previously tagged under these categories are now
   unassigned. You can reassign them from the submission details page.",
   with the button "Back to Categories", and the tab no longer lists them.
   The deleted categories' addresses answer the not-found page of Rule 13.
   "Cancel" closes the first dialog and deletes nothing. <sup>e</sup>
   <sup>td6</sup>

**The category's page**

8. **What the page lists.** The page lists the published articles placed
   in this category itself; an article placed only in one of its
   sub-categories is not listed on it ⚠ [A3](#a3). A scheduled article
   {OJS} and a submission still in the workflow are never listed.
   <sup>l</sup> <sup>td14</sup>
   - 8a. **Joining and leaving.** A published article joins the page once
     the site's background jobs have run after its publication (by hand on
     a test install), the same refresh that makes it findable in search
     ([Search](U15-search.md), Rule 12). Until then it is missing from the
     list and the count ("0 Items" when nothing else is listed), while the
     article's own page already names the category. An unpublished article
     ("Unpublish"; "Unpost" on a preprint server) leaves the page at once.
     <sup>l</sup> <sup>td14</sup>
9. **Paging, and the empty page.** The list shows as many articles as the
   journal's "Items per page" and then pages: under the list, "{first} -
   {last} of {total} items" and the page numbers, as the lists of
   [Appearance & theming](U10-appearance-and-theming.md) (Rules 29, 30)
   describe; a press's category page shows only its first page
   ([Appearance & theming](U10-appearance-and-theming.md#omp2) records
   it). An empty category still shows "0 Items", then "0 - 0 of 0 items"
   (a screen reader also hears the heading "All Items"); {OMP}: "0
   Titles", the heading "All Books" and nothing under it. The message
   "Nothing has been published in this category yet." ("No titles have
   been published yet." on a press) never shows ⚠ [A1](#a1). On a
   press, the first category page opened after the press's catalog
   page, its search results or a manager's save of its settings fails to
   load, whether or not the "Browse" block is placed: the browser shows
   its own error page saying the site sent no data. Opened again, the
   page shows ⚠ [OMP5](#omp5). <sup>g</sup> <sup>td7</sup> <sup>td8</sup>
10. **The order of the list.** The category's "Order of articles" is meant
    to set the order of this page. It does not: whatever it is set to, the
    page lists the articles in the same order ⚠ [A2](#a2). A press puts
    its featured books first (*Catalog browse*). <sup>i</sup> <sup>td9</sup>
11. **The breadcrumb.** "Home" links to the journal's home page and the
    parent's name to the parent's page; the category's own name is not a
    link. Only the nearest parent is named: the page of a third-level
    category skips the top-level one ⚠ [A5](#a5). <sup>g</sup>
    <sup>td10</sup>
12. **The picture.** With a "Cover Image" set, the page shows a small copy
    of it, at most 100 × 100 pixels on a journal and a preprint server.
    The picture is not a link: the full-size picture has an address, but
    nothing on the page leads to it ⚠ [A6](#a6). The "Alternate text"
    typed in the window is used nowhere: a screen reader hears "null" for the picture on a journal and
    a preprint server, the category's name on a press ⚠ [A7](#a7). On a
    press the page shows the browser's broken-picture mark, with the
    category's name beside it, instead of the picture ⚠ [OMP1](#omp1).
    <sup>g</sup> <sup>td11</sup>
13. **An unknown path.** A category address whose path no category of the
    journal has answers a bare page reading "404 Not Found", with no
    header and no links, as an unknown article's or preprint's address
    does.
    <sup>g</sup>

**The "Browse" block**

14. **On a journal and a preprint server.** Placed in the sidebar
    (Settings bullet 7), the block lists every category of the journal as
    a nested list: the top-level categories, each with its sub-categories
    under it, at every level. Each name links to its category's page. On a
    category's page the block marks that category's link: grayed, with a
    grey bar at its left. While the block is in the sidebar, the last step
    of every page's breadcrumb ("About the Journal", a category's name) is
    drawn the same way; without the block it is plain grey text
    ⚠ [A20](#a20). With no category at all, the block still shows
    "Browse" and the line "Categories", with nothing under it
    ⚠ [A10](#a10). <sup>h</sup> <sup>td12</sup>
15. **On a press** {OMP}. While its "Settings" keep "Categories" ticked
    (Settings bullet 8), the block lists every category of the press as
    links in one alphabetical run: a sub-category is indented one step,
    the same at every depth, and stands where its name falls, not under
    its parent ⚠ [OMP2](#omp2). On a category's page the block marks that
    category's link as a journal's does. With no category the line
    "Categories" is left out. The block's "New Releases" link and "Series"
    list belong to *Catalog browse*. <sup>h</sup> <sup>td12</sup>

**Placing an article in categories**

16. **The picker.** Typing in the box offers the categories whose line of
    parents contains the typed letters, in any case: "sci" offers
    "Applied Science", "Applied Science > Computer Science", "Applied
    Science > Computer Science > Computer Vision" and "Applied Science >
    Engineering". Choosing one adds a chip that reads the same line, with
    a button ("Remove {line}") that removes it again; a category already
    chosen is not offered twice. <sup>f</sup> <sup>td4</sup>
    - 16a. **The window.** "Select Categories" opens its window with the
      chosen categories ticked; ticking and unticking there and pressing
      the window's "Save" replaces the chips with the ticked categories,
      and its "Close" leaves the chips as they were. The window's arrow
      column has a heading only a screen reader reads, the raw code
      "##common.expand##" ⚠ [A12](#a12). <sup>f</sup> <sup>td4</sup>
    - 16b. **Saving the choice.** On the Publication Settings, "Preprint
      entry" and "Catalog Entry" pages the choice is stored only by the
      page's own "Save", and it belongs to the version shown. Moving to
      another page of the version, or reloading, with categories chosen
      and not saved asks nothing and shows "Selected: None" on return.
      <sup>f</sup> <sup>td4</sup>
    - 16c. **An unscheduled article** {OJS}. On a journal with at least
      one issue, the Publication Settings page of an article not yet
      scheduled also holds "Issue Assignment"; with no issue chosen there,
      the page's "Save" is refused ("Please correct one error.", "Go to
      Issue: This field is required.") until an issue or "Don't Assign To
      An Issue" is chosen
      ([Publish, schedule & versions](U49-publish-schedule-and-versions.md),
      Fields). The chosen categories stay on screen meanwhile. On a
      journal with no issue the page has no "Issue Assignment" and its
      "Save" asks for no issue (Rule 15 there). <sup>f</sup>
17. **What placing an article does.** From the page's "Save" on, the
    submission lists' "Categories" filter finds the submission
    ([Submissions dashboard (editorial)](U23-submissions-dashboard.md)).
    The filter finds only submissions placed in the chosen category
    itself: one placed in "Computer Vision" is found under "Computer
    Vision", not under its parent "Applied Science". Once the version is
    published, the article is listed on each of its categories' pages
    (Rule 8) and its own page names the categories, a preprint's page a
    sub-category after its parent ("Computer Science > Computer Vision";
    [Article landing page & reading](U13-article-landing-page-and-reading.md)).
    <sup>f</sup>
18. **"Editorial Assignments".** When a submission arrives carrying a
    category, every user ticked under that category's "Editorial
    Assignments" is meant to be assigned to it in the ticked role,
    alongside the editors of its section; the assignment itself, its email
    and its limits are [Submission wizard](U21-submission-wizard.md)'s and
    [Stage participants](U35-stage-participants.md)'s (Rule 12 there).
    <sup>k</sup>
    - 18a. **Only on the install's first journal.** On any other journal
      or press nobody is assigned ⚠ [A13](#a13). With an editor ("Eve
      Editor") ticked, the tab's "Assigned To" reading her name, a
      submission sent through the wizard with the category picked
      ("Categories Arts" on the "Review" step) arrives with the author
      alone among its participants; the ticked editor gets no email and her dashboard
      reads "Assigned to me (0)", and the managers get "A new submission
      needs an editor to be assigned: "{title}"". On a journal the
      section's editors are not assigned either. <sup>td13</sup>
    - 18b. **Only on arrival.** Only the categories the author picked in
      the wizard count: a category an editor adds later, on the
      Publication Settings page, assigns nobody, and changing the ticks
      changes nothing for submissions already received ⚠ [A14](#a14).
      <sup>k</sup> <sup>td13</sup>

## Side effects

- Saving or deleting a category sends no email and raises no
  notification; the only message is the one on screen (Rules 4, 7).
  <sup>d</sup> <sup>e</sup>
- Deleting a category takes it, and every category below it, off every
  article at once: off the articles' pages, the category pages and the
  submission lists' filter (Rule 7). <sup>e</sup>
- A submission arriving with a category is meant to assign that
  category's "Editorial Assignments" editors and send what an automatic
  assignment sends ([Stage participants](U35-stage-participants.md), Rule
  12); on any journal but the install's first it assigns and sends
  nothing (Rule 18a, [A13](#a13)). <sup>k</sup> <sup>td13</sup>
- An article's place on a category page follows the search index's
  background refresh after publication (Rule 8a;
  [Search](U15-search.md), Side effects). <sup>l</sup>

## Settings that modify behavior

1. **"Categories"** (Settings › Workflow › Submission › "Metadata", under
   "Should the submitting author be asked to select a category when they
   make a new submission?"; "No, do not show authors this field."). "Yes,
   add a categories field to the submission wizard.": the wizard's "For
   the Editors" step ("For Readers" on a preprint server) offers the
   picker while the journal has a category
   ([Submission wizard](U21-submission-wizard.md)), and the categories
   the author picks are meant to bring their editors (Rule 18,
   [A13](#a13)). <sup>m</sup>
2. **"Editorial Assignments"** {OJS OMP} (a category's window; nothing
   ticked). A ticked user: Rule 18, on the install's first journal only
   ([A13](#a13)). <sup>k</sup>
3. **"Order of articles"** (a category's window; "Publication date (newest
   first)"). Another choice: Rule 10. <sup>i</sup>
4. **"Description"** and **"Cover Image"** (a category's window; empty).
   Set: Rules 9 and 12. <sup>d</sup>
5. **"Items per page"** and **"Page links"** (Settings › Website ›
   "Setup" › "Lists"; 25 and 10). Other numbers: Rule 9. <sup>m</sup>
6. **"Cover Image Max Width"**, **"Cover Image Max Height"** {OMP}
   (Settings › Website › "Appearance" › "Advanced"; 106 and 100), with
   the line "Images will be reduced when larger than this size but will
   never be blown up or stretched to fit these dimensions.". They are
   meant to size the small copy of a category's picture made at the
   category's next save; no screen shows that copy, since a press's
   category page shows no picture ([OMP1](#omp1); Rule 12). <sup>m</sup>
7. **"Browse Block"** (Settings › Website › "Plugins"; disabled on a new
   journal and preprint server, enabled on a new press) and its box in
   "Sidebar" (Settings › Website › "Appearance" › "Setup"; unticked).
   Enabled and ticked: Rules 14, 15; placement itself is
   [Appearance & theming](U10-appearance-and-theming.md)'s (Rules 23–25).
   <sup>m</sup>
8. **The press's "Browse Block" "Settings"** {OMP} (the Plugins list's
   "Settings" for "Browse Block", a window with the group "Browse
   Possibilities" and the boxes "New releases", "Categories" and
   "Series"; all three ticked). "Categories" unticked: the block lists no
   categories and leaves out the line "Categories" (Rule 15); the other
   two boxes: *Catalog browse*. With all three unticked, the placed block
   still shows "Browse" with nothing under it ⚠ [OMP4](#omp4).
   <sup>h</sup>
9. **"Include a listing of categories"** {OJS} (Settings › Website ›
   "Appearance" › "Theme", "Journal Content Organization"; unticked on a
   journal). Ticked: the home page's row of top-level categories,
   [Appearance & theming](U10-appearance-and-theming.md) (Rule 15). <sup>m</sup>

## Cross-feature interactions

- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  who opens the Settings pages, and so the "Categories" tab.
- **[Appearance & theming](U10-appearance-and-theming.md)**: the home
  page's row of categories {OJS} (its Rule 15), "Items per page" and
  "Page links" (its Rules 29, 30), where the "Browse" block stands in the
  sidebar (its Rules 23–25), and the upload box of "Cover Image"; its
  OMP2 is a press's category page with no page links.
- **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the "Categories" links on an article's and a preprint's page, and the
  article summary each category page lists (its Rule 22).
- **[Search](U15-search.md)**: the index refresh that also decides when an
  article joins a category page (its Rule 12).
- **[Submission wizard](U21-submission-wizard.md)**: the "For the Editors"
  step's picker ("For Readers" on a preprint server) and the automatic
  assignment on arrival, which fails on every journal but the install's
  first ([its A8](U21-submission-wizard.md#a8), the same fault as
  [A13](#a13) here);
  **[Stage participants](U35-stage-participants.md)**: the email an
  automatic assignment sends.
- **[Submissions dashboard (editorial)](U23-submissions-dashboard.md)**,
  **[My submissions](U22-my-submissions.md)**,
  **[Reviewer's review](U28-reviewers-review.md)**: the "Categories"
  filter of their "Filters" windows, which uses this spec's picker.
- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)**,
  **[Publication metadata](U40-publication-metadata.md#edit-gate)**,
  **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  who sees and may save the Publication Settings and "Preprint entry"
  pages, and the "Issue Assignment" an unscheduled article's page needs
  before it saves (Rule 16c); *Catalog management*: the press's "Catalog
  Entry" page.
- **[Navigation menus & site chrome](U08-navigation-menus-and-site-chrome.md)**:
  the press's "Category" menu item type and the breadcrumb frame.
- [Catalog browse](U68-catalog-browse.md): a press's "New Releases" and featured
  books on its category pages, and the "Browse" block's "New Releases"
  and "Series".
- [Sections](U17-sections.md): a preprint server's top-level category links
  on its home page and "Archives" page.
- [Monograph landing page](U69-monograph-landing-page.md): the category links on a book's
  page.

## Canonical scenarios

Every scenario runs on a scratch journal, press or preprint server with
throwaway accounts; scenario 5 also reads the seeded press. An article a
given names as published was published before the site's background jobs
last ran (Rule 8a), unless the given says otherwise. The accounts, their
passwords and the tooling recipe are in the footnote. <sup>s</sup>

1. **Build the category tree**

   Given: Journal Manager, on a scratch journal with no category, English
   and French as its form languages, an Editor named Eve Editor (on a
   journal or press) and a scratch article in Production, and a visitor,
   signed out, in a second browser.

   - **A journal with no category**: open Settings › Journal ›
     "Categories" (Settings › Press on a press, Settings › Server on a
     preprint server): a table headed "Categories", with "Add Category"
     at its top right and the columns "Category Name" and "Assigned To",
     reads "No Items". Open the article's workflow, then side menu
     "Publication" › the version › "Publication Settings" ("Catalog
     Entry" on a press; "Preprint" › the version › "Preprint entry" on a
     preprint server): the page has no "Categories" field (Fields, the
     tab and the picker).
   - **The window, and a save with nothing typed**: back on the tab,
     press "Add Category": a window titled "Add Category" opens from the
     right with "Save" at its foot, the button "French" at its top and
     the line "0/2 languages completed" under "Name" and under
     "Description". Press "Save": "This field is required." shows under
     "Name" and under "Path", the footer beside "Save" reads "Please
     correct 2 errors." with a "Go to" link for each box (as on Settings
     › Journal, see
     [Journal identity & about pages](U07-journal-identity-and-about-pages.md),
     Fields), and the window stays open (Fields, the category window;
     Rule 4).
   - **The window's fields, in two languages**: press "French": "Name in
     French" and "Description in French" show under the English boxes. Under
     "Path" stands the line "The category's URL will be:" with an address
     ending in "catalog/category/path" ("preprints/category/path" on a
     preprint server). "Order of articles" ("Order of monographs" on a press,
     "Order of preprints" on a preprint server) is set to "Publication date
     (newest first)". "Editorial Assignments" reads "Select the editorial
     users who should be assigned automatically to all new submissions to
     this category." with a list headed "Journal editor" ("Press editor" on a
     press) holding one box, "Assign Eve Editor as Journal editor" ("…as
     Press editor"), unticked; on a preprint server nothing stands under the
     sentence [OPS1](#ops1) (Fields).
   - **A top-level category**: type "Science" in "Name", "Sciences" in
     "Name in French" and "science" in "Path", tick "Assign Eve Editor as
     Journal editor" ("…as Press editor"; not on a preprint server) and
     press "Save": the window closes, "Category saved" shows at the top
     right, and the tab lists "Science", its "Assigned To" reading "Eve
     Editor" on a journal or press (Rule 4; Fields, the tab).
   - **Refused paths**: press "Add Category", type "Arts" in "Name" and
     "science" in "Path" and press "Save": the save is refused with "The
     category path already exists. Please enter a unique path." and the
     window stays open. Change "Path" to "my arts" and press "Save": it
     is refused with "The category path must consist of only letters and
     numbers." [A9](#a9). Change "Path" to "arts" and press "Save": the
     tab lists "Arts" (Fields, "Path"; Rule 4).
   - **A path in capitals**: add "Crafts" with the path "ARTS" the same
     way: it saves, beside "Arts" with its path "arts" (Fields, "Path").
   - **Sub-categories**: on the "Science" row press "More Actions": the
     menu reads "Add", "Edit" and "Delete Category". Press "Add": the
     window is titled "Add Category" and names no parent. Type "Physics"
     in "Name" and "physics" in "Path" and press "Save": the "Science"
     row opens and shows "Physics" indented under it. On the "Physics"
     row press "More Actions" › "Add" and save "Optics" with the path
     "optics": the "Physics" row opens and shows "Optics" under it
     (Rules 1, 3).
   - **The arrows**: reload the page: the tab shows only "Arts",
     "Crafts" and "Science", in that order. Press the arrow on the
     "Science" row: "Physics" alone shows under it. Press the arrow on
     the "Physics" row: "Optics" shows. Press the arrow on the "Science"
     row: "Physics" and "Optics" are hidden. Press it again: "Physics"
     shows, and "Optics" still shows under it (Rules 2, 3).
   - **Edit**: on the "Science" row press "More Actions" › "Edit": a
     window titled "Edit Category" holds "Science" in "Name", "Sciences"
     in "Name in French", "science" in "Path" and, on a journal or press,
     "Assign Eve Editor as Journal editor" ("…as Press editor") ticked.
     Type "Work in the natural sciences." in "Description", upload
     "profile-image-400.png" in "Cover Image", change "Path" to
     "natural-science" and press "Save": "Category saved" shows
     (Rules 4, 6).
   - **The visitor's page, with its description and picture**: the visitor
     opens the journal's address followed by
     "catalog/category/natural-science" ("preprints/category/" on a preprint
     server): the breadcrumb reads "Home" then "Science", "Home" a link and
     "Science" not; the page is headed "Science"; it shows a small copy of
     the picture, at most 100 × 100 pixels (on a press the browser's
     broken-picture mark with "Science" beside it [OMP1](#omp1)), and "Work
     in the natural sciences."; "Subcategories" lists "Physics" alone, as a
     link (Fields, the category's page; Rules 11, 12).
   - **Nothing listed yet**: the same page reads "0 Items" ("0 Titles"
     on a press) and lists no article; the message "Nothing has been
     published in this category yet." does not show [A1](#a1) (Rule 9).
   - **The old address and the address in capitals**: the address ending
     in "category/science" shows a bare page reading "404 Not Found",
     with no header and no links. The address ending in "category/arts"
     opens the page headed "Arts", and the one ending in "category/ARTS"
     the page headed "Crafts" (Rules 5, 13; Fields, "Path").
   - **Control**: the article's "Publication Settings" page ("Catalog
     Entry", "Preprint entry"), reloaded, now holds "Categories" under
     "Placement", with "Selected: None" and the button "Select
     Categories" (Fields, the picker). <sup>s</sup>

2. **Delete a category with sub-categories**

   Given: Journal Manager, on a scratch journal with the categories
   "Arts" and "History" (path "history"), "History" holding "Modern
   History" ("modern-history"), which holds "Cold War" ("cold-war"), the
   article "Empires" published in "History" and the article "Wall
   Posters" published in "Cold War" and "Arts", and a visitor, signed
   out, in a second browser.

   - **The dialog**: open Settings › Journal › "Categories" and, on the
     "History" row, press "More Actions" › "Delete Category": a dialog
     headed "Are you absolutely sure you want to delete "History"
     category?" reads "Warning: Deleting this category will remove all 2
     sub-categories within it.", then "This action cannot be undone.
     Deleting the category will:" with the two points "Permanently remove
     all nested sub-categories" and "Unassign this category from any
     submissions currently using it", then "This will not delete the
     submissions themselves — they will simply be left without a
     category." and "To confirm, please type the name of the category
     "History" below to proceed", a text box [A18](#a18), the button "I
     understand the consequences, delete this category", grayed out, and
     "Cancel" (Fields, the delete dialog).
   - **"Cancel"**: press "Cancel": the dialog closes and the tab still
     lists "History" (Rule 7).
   - **The name typed**: open the dialog again and type "history" in the
     box: the delete button stays grayed out. Change the box to
     "History": the button can be pressed (Rule 7).
   - **Deleted**: press "I understand the consequences, delete this
     category": a second dialog, "Category Deleted", reads ""History"
     and its 2 sub-categories have been successfully deleted." and "All
     submissions previously tagged under these categories are now
     unassigned. You can reassign them from the submission details
     page." with the button "Back to Categories". Press it: the tab lists
     "Arts" and no longer "History" (Rule 7).
   - **The visitor's side**: the visitor opens the article "Empires": it
     still opens and no longer names "History" among its categories;
     "Wall Posters" still opens and names "Arts" alone. The addresses
     ending in "category/history", "category/modern-history" and
     "category/cold-war" each show the bare page reading "404 Not Found"
     (Rules 7, 13; Side effects).
   - **The submission lists' filter**: on the Dashboard's "Active
     submissions", press "Filters", then "Select Categories" under
     "Categories": the window lists "Arts" alone (Side effects).
   - **No email, no notice**: the mail catcher holds no email sent by
     the delete, and the header's Tasks count is what it was before
     (Side effects).
   - **Control**: "Arts", never deleted, still opens for the visitor and
     still lists "Wall Posters" (Rule 7). <sup>s</sup>

3. **Place an article in categories**

   Given: a Section Editor assigned to a scratch article in Production,
   and the Journal Manager, on a scratch journal with the categories
   "Arts" and "Applied Science", "Applied Science" holding "Computer
   Science", which holds "Computer Vision", and "Engineering"; on a
   journal, also one published issue.

   - **The field**: Section Editor: open the article's workflow, then
     side menu "Publication" › the version › "Publication Settings"
     ("Catalog Entry" on a press; "Preprint" › the version › "Preprint
     entry" on a preprint server): under "Placement" stands "Categories"
     with "Assign categories to help organize and filter this
     publication.", a typing box reading "Selected: None" and the button
     "Select Categories" (Fields, the picker).
   - **Typing**: type "sci" in the box: it offers "Applied Science",
     "Applied Science > Computer Science", "Applied Science > Computer
     Science > Computer Vision" and "Applied Science > Engineering".
     Choose "Applied Science > Computer Science > Computer Vision": a chip
     reads the same line, with a button "Remove Applied Science > Computer
     Science > Computer Vision". Type "SCI": the box offers the other
     three lines alone (Rule 16).
   - **Leaving without saving**: open "Title & Abstract" in the side
     menu, then "Publication Settings" ("Catalog Entry", "Preprint
     entry") again: nothing asks, and the field reads "Selected: None"
     (Rule 16b).
   - **The "Select Categories" window**: press "Select Categories": a
     window headed "Select Categories" opens from the right, with a
     column "Name" listing the five categories as a tree, "Applied
     Science" and "Arts" in bold, each category with a box, every branch
     open and nothing ticked. Tick "Computer Vision" and "Arts" and press
     the window's "Save": the field shows two chips, "Arts" and "Applied
     Science > Computer Science > Computer Vision" (Fields, the "Select
     Categories" window; Rule 16a).
   - **The window's "Close"**: press "Select Categories" again: "Arts"
     and "Computer Vision" are ticked. Untick "Arts" and press "Close":
     both chips are still there (Rule 16a).
   - **"Issue Assignment"** {OJS}: press the page's "Save": it is refused
     with "Please correct one error." and "Go to Issue: This field is
     required.", and both chips stay. Choose "Don't Assign To An Issue"
     under "Issue Assignment" (Rule 16c).
   - **Saved**: press the page's "Save", then reload the page: the two
     chips are back (Rule 16b).
   - **The filter** (Journal Manager): on the Dashboard's "Active
     submissions", press "Filters", choose "Arts" under "Categories" and
     apply the filter (see
     [Submissions dashboard (editorial)](U23-submissions-dashboard.md),
     scenario 5): the article is listed. With "Computer Vision" alone it
     is listed; with its parent "Applied Science" alone it is not (Rule
     17).
   - **Control**: the same "Arts" filter, applied before the page's
     "Save", did not list the article (Rule 17). <sup>s</sup>

4. **The author picks categories while submitting**

   Given: Journal Manager and an Author, on a scratch journal with the
   categories "Arts" and "Science" and its "Categories" setting as a new
   journal has it, the Author on the "For the Editors" step ("For
   Readers" on a preprint server) of their own draft.

   - **The setting**: Journal Manager: open Settings › Workflow ›
     Submission › "Metadata": "Categories", under "Should the submitting
     author be asked to select a category when they make a new
     submission?", is set to "No, do not show authors this field."
     (Settings bullet 1).
   - **"Yes"**: choose "Yes, add a categories field to the submission
     wizard." and press "Save" (Settings bullet 1).
   - **The Author's step**: the Author reloads the page: the wizard
     reopens on its first step, "Upload Files"
     ([Submission wizard](U21-submission-wizard.md), Rule 8). The Author
     presses "Continue" through "Details" and "Contributors" back to "For
     the Editors" ("For Readers"): the step now holds "Categories" with
     the line "Select only the categories that are
     appropriate for your submission.", a typing box reading "Selected:
     None" and the button "Select Categories" (Fields, the picker;
     Actors row 3).
   - **A category picked**: type "ar" in the box: it offers "Arts".
     Choose it: a chip reads "Arts", with a button "Remove Arts"
     (Rule 16).
   - **"Review"**: press "Continue": the "Review" step lists
     "Categories" with "Arts" (Fields, the picker).
   - **The editor's side**: the Author submits the draft (see
     [Submission wizard](U21-submission-wizard.md), scenario 2). The
     Journal Manager opens the new submission's workflow, then side menu
     "Publication" › the version › "Publication Settings" ("Catalog
     Entry" on a press; "Preprint" › the version › "Preprint entry" on a
     preprint server): "Categories" holds the chip "Arts" (Rules 16,
     18).
   - **Control**: before the "Save" on Settings, the Author's step had
     no "Categories" field (Settings bullet 1). <sup>s</sup>

5. **A visitor browses by category**

   Given: a visitor, signed out, on a scratch journal whose "Items per
   page" is 2, with the category "Science" holding "Astronomy" and
   "Physics", the articles "Sun Study" and "Moon Study" published in
   "Science", "Alpha Result", "Beta Result" and "Gamma Result" published
   in "Physics", and "Draft Theory" placed in "Physics" but still in the
   workflow; on a press, also the seeded press.

   - **A parent's page**: open the journal's address followed by
     "catalog/category/science" ("preprints/category/science" on a
     preprint server): the breadcrumb reads "Home" then "Science",
     "Home" a link to the journal's home page and "Science" not a link;
     the page is headed "Science"; "Subcategories" lists "Astronomy" and
     then "Physics", each a link; the list below shows "Sun Study" and
     "Moon Study" (Fields, the category's page; Rules 2, 8, 11).
   - **A sub-category's page, over two pages**: press "Physics" under
     "Subcategories": the breadcrumb reads "Home", "Science", "Physics",
     "Science" now a link; the page is headed "Physics", reads "3 Items" and
     has no "Subcategories". The list shows two of the three articles, then
     "1
     - 2 of 3 items" and the page numbers; press "2": the list shows the
     third article and "3 - 3 of 3 items" (Fields, the category's page;
     Rules 8, 9, 11).
   - **A press's page** {OMP}: the same page reads "3 Titles", shows the
     heading "All Books" over the first two books and no page numbers
     ([Appearance & theming](U10-appearance-and-theming.md#omp2) records
     the missing pages) (Fields, the category's page; Rule 9).
   - **Back up the breadcrumb**: press "Science" in the breadcrumb:
     "Science"'s page opens again (Rule 11).
   - **An unknown address**: open the journal's address followed by
     "catalog/category/nowhere" ("preprints/category/nowhere"): a bare
     page reads "404 Not Found", with no header and no links (Rule 13).
   - **The seeded press's pages** {OMP}: open the seeded press's address
     followed by "catalog/category/applied-science": the page is headed
     "Applied Science", the breadcrumb reads "Home" then "Applied
     Science", a count ending in "Titles" shows, and "Subcategories"
     lists "Computer Science" and "Engineering" (Rule 9).
   - **Control**: "Draft Theory", placed in "Physics" but still in the
     workflow, is listed on neither page, and "Physics" counts 3
     (Rule 8). <sup>s</sup>

6. **An article joins and leaves a category's page**

   Given: Journal Manager and a visitor, signed out, on a scratch journal
   with the category "Science", in which "Sun Study", "Moon Study" and,
   after the jobs last ran, "Late Study" were published.

   - **Before the jobs run**: the visitor opens "Science"'s page (page
     loads run no jobs): it reads "2 Items" ("2 Titles" on a press) and
     lists only "Sun Study" and "Moon Study". The visitor opens "Late
     Study"'s own page: it names "Science" among its categories (Rule 8a).
   - **After the jobs run**: run the site's background jobs (the footnote
     says how); the visitor reloads "Science"'s page: it reads "3 Items"
     ("3 Titles") and lists "Late Study" too (Rule 8a; Side effects).
   - **Unpublished** (Journal Manager): open "Moon Study"'s workflow and
     unpublish it ("Unpublish"; "Unpost" on a preprint server; see
     [Publish, schedule & versions](U49-publish-schedule-and-versions.md),
     scenario 3). The visitor reloads "Science"'s page at once: it reads
     "2 Items" ("2 Titles") and no longer lists "Moon Study" (Rule 8a).
   - **Control**: "Sun Study" stayed listed throughout (Rule 8).
     <sup>s</sup>

7. **The "Browse" block on a journal** {OJS OPS}

   Given: Journal Manager, on a scratch journal (preprint server) with
   French among its languages and the categories "Arts" (in French
   "Beaux-arts"), "Zoology" ("Animaux"), "Science" ("Sciences") holding
   "Physics" ("Physique"), which holds "Optics" ("Optique"), and
   "Mathematics", named in English only, and a visitor, signed out, in a
   second browser.

   - **The plugin**: open Settings › Website › "Plugins" › "Installed
     Plugins": "Browse Block" is unticked. Tick it (Settings bullet 7).
   - **Placed**: reload the page and open "Appearance" › "Setup":
     "Sidebar" holds the box "Browse Block", unticked. Tick it and press
     "Save" (Settings bullet 7; see
     [Appearance & theming](U10-appearance-and-theming.md), scenario 4).
   - **The block**: the visitor opens the journal's address followed by
     "catalog/category/arts" ("preprints/category/arts" on a preprint
     server): the sidebar holds a block headed "Browse" with the line
     "Categories" and under it "Arts", "Mathematics", "Science" and
     "Zoology", in that order, "Physics" under "Science" and "Optics"
     under "Physics", each a link; the "Arts" link is grayed, with a grey
     bar at its left (Rules 2, 14).
   - **Another category's link**: press "Optics": its page opens, and the
     block marks the "Optics" link alone (Rule 14).
   - **In French**: open the same address with "fr_CA/" before
     "catalog" ({journal address}/fr_CA/catalog/category/arts): the block
     lists "Animaux", "Beaux-arts" and "Sciences", then "Mathematics"
     last, with "Physique" under "Sciences" (Rule 2).
   - **Control**: before the "Save", the visitor's "Arts" page had no
     "Browse" block (Settings bullet 7). <sup>s</sup>

8. **The press's "Browse" block** {OMP}

   Given: Press Manager, on a scratch press with the categories "Arts"
   and "Science", "Science" holding "Physics", and a visitor, signed
   out, in a second browser.

   - **Placed**: open Settings › Website › "Appearance" › "Setup":
     "Sidebar" holds the box "Browse Block", unticked. Tick it and press
     "Save" (Settings bullet 7).
   - **The block**: the visitor opens the press's address followed by
     "catalog/category/arts" (if the browser shows its error page saying
     the site sent no data, open it again [OMP5](#omp5)): the sidebar's
     "Browse" block holds the line "Categories" and the links "Arts", "Physics" and "Science",
     "Physics" indented one step and not under "Science" [OMP2](#omp2);
     the "Arts" link is grayed, with a grey bar at its left (Rule 15).
   - **Another category's link**: press "Science": its page opens, and
     the block marks the "Science" link (Rule 15).
   - **"Categories" unticked**: open Settings › Website › "Plugins" and
     press "Settings" on the "Browse Block" row: a window holds the group
     "Browse Possibilities" with the boxes "New releases", "Categories"
     and "Series", all three ticked. Untick "Categories" and save the
     window. The visitor reloads the page, twice if the first reload
     brings the browser's error page [OMP5](#omp5): the block has no line
     "Categories" and no category link (Settings bullet 8; Rule 15).
   - **Control**: "Arts"'s own page still opens, headed "Arts": only the
     block lost its list (Settings bullet 8). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Register carries it**:
  - A2 ("Order of articles" set to another choice, with no effect on the
    page; Rule 10; Settings bullet 3)
  - A3 (an article placed only in a sub-category, missing from the
    parent's page; Rule 8)
  - A5 (a third-level category's breadcrumb, which skips the top level;
    Rule 11)
  - A8 (a path containing "/"; Fields, "Path")
  - A10 (the "Browse" block on a journal or preprint server with no
    category; Rule 14)
  - A11 (the tab's arrows from the keyboard and for a screen reader;
    Rule 3a; scenario 1 presses them with a pointer)
  - A13 (editors ticked under "Editorial Assignments" on any journal or
    press but the install's first, where nobody is assigned; Rule 18a)
  - A14 (a category added on the Publication Settings page after the
    submission arrived, or its ticks changed later; Rule 18b)
  - A15 (the tab, the delete dialog and the "Select Categories" window
    opened in French; Fields, the tab)
  - A16 (the window's "Close" or Escape with an unsaved change; Fields,
    the category window)
  - A17 (a file that is not a picture put in "Cover Image"; Fields)
  - A18 (the delete dialog's box for a screen reader; Fields, the delete
    dialog; scenario 2 types in it)
  - A19 (a category with one item, "1 Items"; Fields, the category's
    page; the scenarios keep two items or more on every page they count)
  - A20 (the breadcrumb's grey bar while the "Browse" block is placed;
    Rule 14)
  - OMP1 ("Cover Image Max Width" and "Cover Image Max Height" changed,
    with no picture shown to size; Settings bullet 6)
  - OMP3 (the press's "Browse" for a screen reader; Fields, the "Browse"
    block)
  - OMP4 (the press's "Browse" block with all three "Settings" boxes
    unticked; Settings bullet 8)
  - OMP5 (a press's first category page after its catalog page, its
    search results or a settings save, which fails to load; Rule 9;
    scenario 8 passes it)
  - OPS1 ("Editorial Assignments" on a preprint server, with nothing to
    tick; Fields; scenario 1 passes it)
- **No seed**:
  - editors ticked under a category's "Editorial Assignments" assigned
    when a submission arrives in it, on the install's first journal
    (Actors row 4; Rule 18; Settings bullet 2): that journal is the
    shared seeded one, which the scenarios only read, and every other
    journal assigns nobody (A13)
- **Owned by another feature**:
  - the roles without the Settings pages refused the "Categories" tab
    (Actors row 1; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md)*, scenario 2)
  - a Site Administrator without a role on a press or preprint server
    (Actors row 1; *[Journal identity & about
    pages](U07-journal-identity-and-about-pages.md#a1)*, its A1)
  - {OJS} the Publication Settings page on a journal with no issue,
    which has no "Issue Assignment" (Rule 16c; *[Publish, schedule &
    versions](U49-publish-schedule-and-versions.md)*, scenario 13)
  - {OJS} "Include a listing of categories" ticked, the home page's row
    of top-level categories (Settings bullet 9; *[Appearance &
    theming](U10-appearance-and-theming.md)*, scenario 9)
  - {OPS} a preprint server's home-page row of top-level categories
    (Purpose; *Sections*)
  - {OPS} a preprint's page naming a sub-category after its parent (Rule
    17; *[Article landing page &
    reading](U13-article-landing-page-and-reading.md)*, scenario 1)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A category with nothing in it never says so: "0 Items" and "0 - 0 of 0 items" instead of "Nothing has been published in this category yet." | 🐞 | minor | — |
| [A2](#a2) | A category's "Order of articles" has no effect on its page | 🐞 | user-visible | — |
| [A6](#a6) | A category's picture is not a link; its full-size version is unreachable from the page | 🐞 | minor | — |
| [A7](#a7) | The picture's "Alternate text" is used nowhere; a journal's page describes the picture as "null" | 🐞 | minor | — |
| [A8](#a8) | A path containing "/" is saved, but its links open another category's page or the not-found page | 🐞 | minor | — |
| [A9](#a9) | The path message says "only letters and numbers" while "-", "_", "." and "/" are accepted | 🐞 | minor | — |
| [A10](#a10) | With no category, the "Browse" block shows "Categories" with nothing under it | 🐞 | minor | — |
| [A11](#a11) | The tab's arrows cannot be worked from the keyboard, and all read "Expand sub-categories" to a screen reader, open or not, with or without sub-categories | 🐞 | minor | — |
| [A12](#a12) | A screen reader announces the "Select Categories" window's arrow column as "##common.expand##" | 🐞 | minor | — |
| [A13](#a13) | A category's "Editorial Assignments" assign nobody on any journal or press but the install's first | 🐞 | user-visible | — |
| [A15](#a15) | In French, the tab, the delete dialog, the "Select Categories" window and a press's category page show raw codes | 🐞 | minor | — |
| [A16](#a16) | A name changed and closed without saving comes back in the same category's next "Edit" | 🐞 | medium | — |
| [A17](#a17) | A file that is not a picture leaves a broken preview in "Cover Image" | 🐞 | minor | — |
| [A18](#a18) | The delete dialog's confirmation box has no name for a screen reader | 🐞 | minor | — |
| [A19](#a19) | A category with one item reads "1 Items" ("1 Titles" on a press) | 🐞 | minor | — |
| [A20](#a20) | With the "Browse" block placed, every breadcrumb's last step gets the block's grey bar | 🐞 | minor | — |
| [OMP1](#omp1) | A press's category page shows a broken-picture mark instead of the picture | 🐞 | user-visible | — |
| [OMP2](#omp2) | The press's "Browse" block lists sub-categories among the top-level ones, not under their parents | 🐞 | minor | — |
| [OMP3](#omp3) | A press's "Browse" is not a heading for a screen reader | 🐞 | minor | — |
| [OMP4](#omp4) | A press's "Browse" block with every "Settings" box unticked shows "Browse" alone | 🐞 | minor | — |
| [OMP5](#omp5) | A press's first category page opened after its catalog page, its search results or a settings save fails to load | 🐞 | user-visible · crash: server | — |
| [OPS1](#ops1) | The category window shows "Editorial Assignments" with nothing to tick | 🐞 | minor | — |
| [A3](#a3) | A category's page leaves out the articles of its sub-categories | ❓ | minor | — |
| [A4](#a4) | A category cannot be moved to another parent or to the top level | ❓ | minor | — |
| [A5](#a5) | The breadcrumb names only the nearest parent | ❓ | minor | — |
| [A14](#a14) | A category added after a submission arrives brings no editors | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — An empty category never says so** · 🐞 · minor.
A category with nothing listed should read "Nothing has been published in
this category yet." ("No titles have been published yet." on a press).
Instead its page shows "0 Items" and "0 - 0 of 0 items" (on a press "0
Titles" and the heading "All Books" with nothing under it), and the
message never appears. A visitor cannot tell an empty category from a list
that failed to load.
It worked until the page moved onto the search machinery in January 2026 (read from the code): a regression.
Since: 2026-01-09 · Basis: probe, 2026-09-25; the regression, code reading. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Order of articles" does nothing** · 🐞 · user-visible.
A manager sets "Order of articles" to "Title (A-Z)", expecting the
category's page to list its articles alphabetically. The page keeps the
same order whatever the choice.
It was honored until the page moved onto the search machinery in January 2026 (read from the code): a regression.
Since: 2026-01-09 · Basis: probe, 2026-09-25; the regression, code reading. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Sub-categories' articles stay off the parent's page** · ❓ · minor.
The page of "Applied Science" lists only the articles placed in "Applied
Science" itself; an article placed in its sub-category "Engineering" is
listed on "Engineering"'s page alone, so a parent whose articles all sit
in sub-categories reads "0 Items".
Question: should a category's page also list its sub-categories' articles? Lean: no, the page's own "Subcategories" links lead there, and the behavior predates the nesting of categories (read from the code), so it reads as intent.
Basis: probe, 2026-09-25; its age, code reading. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A category stays under the parent it was made in** · ❓ · minor.
The category window offers no parent, so a category made at the wrong
level can only be deleted, with every sub-category and article placement
under it, and made again.
The earlier settings screen offered a "Parent Category" choice, unavailable on a category with sub-categories (read from the code).
Question: should the window offer the parent again? Lean: yes; deleting
and re-making a category loses its articles' placements.
Basis: probe, 2026-09-25; the earlier screen, code reading. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The breadcrumb skips grandparents** · ❓ · minor.
The page of "Computer Vision" (under "Computer Science", under "Applied
Science") reads "Home / Computer Science / Computer Vision"; "Applied
Science" is not named.
Question: should the trail name every level? Lean: yes; categories nest to any depth since 2025 and the trail was written for one level (read from the code).
Basis: probe, 2026-09-25; the trail's history, code reading. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The category picture is not a link** · 🐞 · minor.
The picture on a category's page is meant to open its full-size version;
it is not a link, and nothing on the page leads to the full-size picture,
which answers only at its typed address.
Since: 2018 · Basis: probe, 2026-09-25; its age, code reading. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The picture's alternate text is ignored** · 🐞 · minor.
The window asks for "Alternate text" beside the picture, but no page uses
it: a screen reader hears "null" for the picture on a journal's and a
preprint server's category page, and the category's name on a press's.
Basis: probe, 2026-09-25; that no page at all uses it, code reading. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A path with "/" leads to the wrong page** · 🐞 · minor.
A path such as "sci/phys" is accepted, and every link to the category
prints it ("sci%2Fphys"), but following one opens the page of the
category whose path is the part before the "/" (a category "Slashed" with
the path "sci/phys" opens "Science"'s page), or the bare not-found page
when no category has that path. The category's own page cannot be
reached.
Basis: probe, 2026-09-25. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — The path message understates what a path may hold** · 🐞 · minor.
A refused path reads "The category path must consist of only letters and
numbers.", yet "-", "_", "." and "/" are accepted.
Basis: probe, 2026-09-25. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — An empty "Browse" block on a journal without categories** · 🐞 · minor.
Placed on a journal or preprint server with no category, the "Browse"
block shows its heading and the line "Categories" with nothing under
it; a press's block leaves the line out.
Basis: probe, 2026-09-25. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — The tab's arrows fail keyboard and screen-reader users** · 🐞 · minor.
Every row of the "Categories" tab has an arrow button, named "Expand
sub-categories" for a screen reader whether its row is open or closed; on
a row with no sub-categories the button is there, invisible, and does
nothing. A keyboard user cannot open a row: Tab reaches each row's arrow
after its "More Actions", but Enter and Space on it do nothing; only a
pointer click opens the row. The "Select Categories" window's arrows are
all named "Collapse" in the same way, open or closed.
Basis: probe, 2026-09-25. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — A raw code names the "Select Categories" window's arrow column** · 🐞 · minor.
A screen reader announces the window's last column, the one holding the
arrows, as "##common.expand##" instead of a word, in all three apps; on
screen the column's heading is empty.
Basis: probe, 2026-09-25. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — Category editors are assigned only on the install's first journal** · 🐞 · user-visible.
A manager ticks editors under a category's "Editorial Assignments",
expecting them to be assigned to every new submission that arrives in
that category. On any journal or press but the install's first, nobody
is: the submission arrives with the author alone among its participants,
the ticked editor gets no email and never sees it, and the managers get
the needs-an-editor email instead. It is the same fault as the section's
automatic assignment
([Submission wizard A8](U21-submission-wizard.md#a8)), which works on
the install's first journal only.
Basis: probe, 2026-09-25. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A category added after arrival brings no editors** · ❓ · minor.
Where the automatic assignment works (the install's first journal,
[A13](#a13)), only the categories on the submission when it arrives
count: a category an editor adds later on the Publication Settings page
assigns nobody, and changing a category's ticks changes nothing for
submissions already received.
No test journal can show it, as every other journal assigns nobody (read from the code).
Question: should a category added later bring its editors? Lean: no; the
assignment happens on arrival, like a section's, and an editor who adds a
category can assign its editors by hand.
Basis: code. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — Raw codes on the French category screens** · 🐞 · minor.
Opened in French (Settings › Journal › "Catégories"), the tab heads its
columns "##GRID.CATEGORY.CATEGORYNAME##" and
"##MANAGER.CATEGORY.ASSIGNEDTO##", every arrow is named
"##manager.category.expandSubcategories##", and the row menu reads
"Ajouter", "Modifier" and "##manager.category.deleteCategory##". The
delete dialog is headed "##manager.category.delete.confirmationTitle##",
its text, the instruction to type the name included, is
"##manager.category.delete.message.body##", and its button reads
"##manager.category.confirmDelete##" beside "Annuler". The picker's
button and window read "##manager.selectCategories##". A press's category
page in French shows "##catalog.browseTitles##" and
"##catalog.category.heading##" where the count and "All Books" stand; a
journal's and a preprint server's page are translated.
Basis: probe, 2026-09-25. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — An unsaved name comes back in the next "Edit"** · 🐞 · medium.
A manager changes a category's "Name" in "Edit Category" and presses
"Close" or Escape: nothing asks, and the tab keeps the old name, so the
change looks discarded. But that category's next "Edit" opens with the
unsaved name ("Path" back to the saved one), also after a switch to
"Masthead" and back, and "Save" there stores it. Another category's
"Edit" and "Add Category" open clean; a reload or leaving the page drops
the change, again without a question. The same fault as
[Institutions A2](U66-institutions.md#a2), whose row shows the unsaved
name as well.
Basis: probe, 2026-09-25; again 2026-09-30. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — A file that is not a picture leaves a broken preview** · 🐞 · minor.
After a file named as a picture but holding none (a text file renamed
".png") is put in "Cover Image", the window's preview is a broken image
whose address is "[object Event]", and the browser asks the server for a
page of that name, which does not exist. "Save" then refuses the file.
Basis: probe, 2026-09-25. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — The delete dialog's box has no name** · 🐞 · minor.
The box under "To confirm, please type the name of the category…" has no
label: a screen reader announces an unnamed edit field, so its user is
not told what the box is for.
Basis: probe, 2026-09-25. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — "1 Items"** · 🐞 · minor.
A category with one published item reads "1 Items" ("1 Titles" on a
press) where "1 Item" is expected.
Basis: probe, 2026-09-25. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — The "Browse" block restyles the breadcrumb** · 🐞 · minor.
While the "Browse" block is in the sidebar of a journal or a preprint
server, the last step of every page's breadcrumb ("About the Journal", a
category's name) is drawn like the block's marked link: grayed, with a
grey bar at its left. Without the block it is plain grey text. A press's
breadcrumb is unchanged.
Basis: probe, 2026-09-25. <sup>f-a20</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's category page shows no picture** · 🐞 · user-visible.
A press manager sets a category's "Cover Image" and saves; the category's
page shows the browser's broken-picture mark with the category's name
beside it instead of the picture, and the picture's small and full-size
addresses answer with an empty page.
The page looks for the picture where the press's earlier settings screen kept it, not where the category window now stores it (read from the code).
Basis: probe, 2026-09-25; the cause, code reading. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — The press's "Browse" block flattens the tree** · 🐞 · minor.
A journal's block nests each sub-category under its parent; the press's
lists every category in one alphabetical run, so "Computer Vision" stands
between "Computer Science" and "Engineering", indented like every
sub-category, with nothing showing which category it belongs to or how
deep it sits.
Basis: probe, 2026-09-25. <sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A press's "Browse" is not a heading** · 🐞 · minor.
On a press the block's "Browse" is drawn like a heading, but a screen
reader reads it as plain text, so the block cannot be reached by
heading; a journal's and a preprint server's "Browse" is a heading.
Basis: probe, 2026-09-25. <sup>f-omp3</sup>

<a id="omp4"></a>
**OMP4 — A "Browse" block with nothing to show still shows** · 🐞 · minor.
With "New releases", "Categories" and "Series" all unticked in the
block's "Settings", the placed block still shows its "Browse" title with
nothing under it, an empty box in the sidebar.
Basis: probe, 2026-09-25. <sup>f-omp4</sup>

<a id="omp5"></a>
**OMP5 — A press's category page fails after its catalog or a settings save** · 🐞 · user-visible · crash: server.
A visitor expects a press's category page to open. On the test install,
which runs PHP 8.3, the first category page opened after the press's
catalog page, its search results or a manager's save of the press's
settings fails on the server: nothing comes back, and the browser shows
its own error page saying the site sent no data. The "Browse" block
plays no part. The test install's server restarts by itself after the
failure, and the same page opened again shows as usual. A journal's and
a preprint server's category pages were not seen to fail. The fault lies
in PHP 8.3 itself, with its code cache (OPcache) switched on as on the
test install, not in the press's pages; later PHP releases fix it.
Basis: test run, 2026-09-25; the cause, probe. <sup>f-omp5</sup>

### OPS

<a id="ops1"></a>
**OPS1 — "Editorial Assignments" with nothing to tick** · 🐞 · minor.
A preprint server has no role that works on a Submission stage, so the
category window has no editor to offer; it still shows the heading
"Editorial Assignments" and the sentence "Select the editorial users who
should be assigned automatically to all new submissions to this
category.", with no box under them.
Basis: probe, 2026-09-25. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips: ojs `d9b567efec`, omp
`187f0f40d`, ops `61cd158ce3`, each with lib/pkp `76a315591b` and
ui-library `03d1cee2`; the stable line (`checkouts/stable-3_5_0`) read for
the regressions' "before". Every claim was driven on 2026-09-25 on OJS, OMP
and OPS, on scratch journals, presses and preprint servers with throwaway
accounts (the seeded `publicknowledge` only read), as the notes below
record. The stable line's servers were down that day, so the "before" of A1
and A2 and the earlier "Parent Category" choice of A4 rest on the code
alone.

<a id="fn-a"></a>
**a** — The management tab is lib/pkp's: each app's
`templates/management/context.tpl` mounts `<category-manager>` (ui-library
`src/managers/CategoryManager/CategoryManager.vue`) in the tab `categories`
labelled `grid.category.categories` "Categories", fed by
`ManagementHandler::context()` with `PKP\components\forms\context\CategoryForm`.
The data is `lib/pkp/schemas/category.json` (`contextId`, `parentId`,
`sortOption`, `title`, `description`, `path`, `image`, read-only
`subCategories`, `assignedEditors`); stored in `categories`,
`category_settings` and `publication_categories` (one row per version and
category). Reader side: `PKP\pages\catalog\PKPCatalogHandler::category()`
(OJS and OPS `pages/catalog/index.php`, OPS also `pages/preprints/index.php`;
OMP's `APP\pages\catalog\CatalogHandler` inherits `category()` and
overrides `fullSize()` / `thumbnail()`), each app's
`templates/frontend/pages/catalogCategory.tpl`, and the "Browse Block"
plugin (`plugins/blocks/browse`, OJS and OPS identical, OMP its own).
Placement: the `categoryIds` field of OJS and OPS `IssueEntryForm`, OMP
`CatalogEntryForm`, lib/pkp `ForTheEditors::addCategoryField()` and
`PKPSubmissionFilters::addCategories()`. Automatic assignment:
`SubEditorsDAO::assignEditors()` via the `AssignEditors` listener. The
three apps run the same lib/pkp and ui-library code for the tab, the
window, the API and the picker (no app subclasses `CategoryForm`,
`CategoryCategoryController` or the category repository), so those claims
carry no app marker by the subclass-chain evidence; the reader pages are
app-side template copies (OJS and OPS differ only in class names and the
`preprints` page; OMP's differs, notes g, h).
Live-probed 2026-09-25 (Purpose), OJS, OMP and OPS: an item placed in
"Science" and "Arts" showed "Categories Arts Science" on its page, an
unplaced one no such line; a tree four levels deep was built from the rows'
"Add". The home page's row of top-level categories showed on a scratch
journal with "Include a listing of categories" ticked
(`categoryHeader_categories`) and on a scratch preprint server with no
theme option set (`archiveHeader_categories`), and not on a press.
Automatic assignment: note td13.

<a id="fn-b"></a>
**b** — Settings access: `ManagementHandler::authorize()` adds
`CanAccessSettingsPolicy` (a site administrator, or a `ROLE_ID_MANAGER`
group with `permitSettings`) for every `settings/*` op but announcements
and user comments; the categories API
(`PKP\API\v1\categories\CategoryCategoryController`) adds the same policy
and admits only `ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN` on every route.
The visitor pages: `PKPCatalogHandler::authorize()` adds only
`ContextRequiredPolicy`; the journal-wide sign-in restriction applies as
on every public page (U07 Rule 22).
Live-probed 2026-09-25 (Actors preamble; rows 1, 2, 5, 6), on the seeded
journal, press and server: `admin`, `manager.maya` and `editor.diana` (OJS,
OMP) got the "Categories" tab; `sectioneditor.ana`, `assistant.rita`,
`copyeditor.carla`, `layouteditor.leo`, `reviewer.julia`, `author.alex` and
`reader.rosa` (OPS: the four it enrols) got the access-denied page and no
"Settings" in the side menu; signed out, the Login page. A scratch Editor
whose role lost "Permit changes to Settings" got the access-denied page
(OJS, OMP). The scratch manager and the assigned Section Editor (Series
editor, Moderator) got the entry page with the field and an enabled "Save";
the author's workflow view offers no entry page. A category page opened
signed out and as Reader; on a scratch journal that requires sign-in a
signed-out visitor landed on its Login page. Only a press's Plugins row
"Browse Block" carries "Settings". The Site Administrator holds a manager
role in every context of the test installs, so the administrator without a
role was not separable.

<a id="fn-c"></a>
**c** — The tab: `CategoryManager.vue` (table label
`grid.category.categories`, top button `grid.category.add` "Add Category",
an sr-only last column `manager.category.toggleSubcategories` "Expand or
collapse sub-categories"); columns from `useCategoryManagerConfig.js`:
`grid.category.categoryName` "Category Name", `manager.category.assignedTo`
"Assigned To" (`CategoryManagerCellAssignedTo.vue`, the editors' names
joined by `common.commaListSeparator`), `common.moreActions` "More
Actions" (sr-only header; `CategoryManagerCellMoreActions.vue`, a
`DropdownActions` with `button-variant="ellipsis"`); item actions
`common.add` "Add", `common.edit` "Edit",
`manager.category.deleteCategory` "Delete Category". Rows:
`CategoryTreeRow.vue`, recursive, children rendered only while the id is in
`categoryManagerStore.expanded`; nothing is expanded on load;
`categorySaved()` adds the saved category's `parentId` to the expanded set.
Empty table: `TableBody.vue` `grid.noItems` "No Items". The arrow:
`TableCellTreeExpand.vue` renders a `<button>` on every row, the icon (and
its click handler) only when `isDisplayed`; its sr-only text is
`props.isExpanded.value ? expandLabel : collapseLabel`, and `isExpanded`
is a boolean prop, so `.value` is always undefined and the text is always
`collapseLabel`, which `CategoryTreeRow.vue` passes as
`manager.category.expandSubcategories` "Expand sub-categories" (the two
labels are also passed swapped). The same component in the "Select
Categories" window gets no labels and falls back to `list.collapse`
"Collapse". The scenario API's parity note reads "a row's "Expand
sub-categories"" (scenarios.md, U10 harness 2026-09-24).
Live-probed 2026-09-25 (Fields, the tab; Rules 3, 3a; A11, A15), all three
apps: note td1; "Assigned To" read "Eve Editor, Sam Section" after two
ticks; a manager-alone journal's table read "No Items"; the headers are
upper-cased by the table's style. Opened at
`…/fr_CA/management/settings/context`, the tab printed the keys raw: note
f-a15.

<a id="fn-d"></a>
**d** — The window: `EditCategoryFormModal.vue` (a side modal, title
`grid.category.add` / `grid.category.edit`), the form
`CategoryForm::__construct()`: `title` `grid.category.name` "Name"
(multilingual, required), `path` `grid.category.path` "Path" (required;
description `grid.category.urlWillBe` with a sample URL built for
`catalog/category/path`, OPS `preprints/category/path`), `description`
`grid.category.description` (`FieldPreparedContent`, toolbar "bold italic
superscript subscript | link | blockquote bullist numlist"), `sortOption`
`catalog.sortBy` (OJS "Order of articles", OMP "Order of monographs", OPS
"Order of preprints"; description `catalog.sortBy.categoryDescription`;
options `Repo::submission()->getSortSelectOptions()`: lib/pkp
`catalog.sortBy.titleAsc` / `titleDesc` / `datePublishedAsc` /
`datePublishedDesc`, OMP's override adds `seriesPositionAsc` /
`seriesPositionDesc`; value `getDefaultSortOption()`
`datePublished-desc`), `image` `category.coverImage` "Cover Image"
(`FieldUploadImage`, `acceptedFiles` image/jpeg, png, gif, jpg; alt text
`common.altText` "Alternate text"). Validation:
`PKP\category\Repository::validate()` — schema-required `path`, `title`
(primary locale); `CATEGORY_PATH_REGEX` `/^[a-zA-Z0-9\/._-]+$/` else
`grid.category.pathAlphaNumeric`; a path held by another category of the
context (`filterByPaths`, compared with the edited category's own path)
`grid.category.pathExists`; an uploaded image not .jpg/.png/.gif
`form.invalidImage`. No uniqueness rule on the title. Save:
`CategoryCategoryController::saveCategory()` (POST, or PUT
`categories/{id}`), then `categorySaved()` notifies
`manager.category.saved` "Category saved", closes the modal and refetches.
Edit prefill: `getCategoryForm()` `setValues({...category,
...transformAssignedEditorsToSubEditorFields()})`. Nothing in the
controller writes an email, notification or log entry.
The tab's top button saves with `POST
api/v1/categories?parentCategoryId=undefined`, a row's "Add" with the
parent's id; the server stores a top-level category or refuses the form as
for any save. The toolbar string names `bullist numlist`, yet the window
draws no list buttons. Live-probed 2026-09-25 (Fields, the window and its
table; Rules 4, 6; Settings bullets 3, 4), all three apps: the window slid
in from the right with "Save" at its foot; empty "Name" and "Path" gave
"This field is required." under both, "Please correct 2 errors." and two
"Go to" links, with nothing sent; a path the server refused (400) added
"The form was not saved because 1 error(s) were encountered. Please correct
these errors and try again."; "my path" and "café" were refused with the
letters-and-numbers message, "a-b_c.d" and "sci/phys" saved; "arts" was
refused with the taken-path message, "ARTS" beside it saved and each
address opened its own category; "Twin" saved twice (paths twin1, twin2); a
French-only name was refused. The toolbar: "Bold", "Italic", "Superscript",
"Subscript", "Insert/edit link", "Blockquote". "Cover Image" refused a .txt
as it was dropped ("You can't upload files of this type.") and a text file
renamed .png at "Save" (400, `form.invalidImage`), after a preview whose
`src` was "[object Event]" and a GET
`…/management/settings/[object%20Event]` answering 404 (A17); a real .png
saved and reopened with its preview and "Alternate text". "Save" showed
"Category saved" as a notice at the top right, closed the window and
refreshed the tab; "Edit" reopened every saved value, and a name (both
languages), path, description, order, alternate text and an unticked editor
changed in one save all came back changed. "Close" and Escape closed the
window with no dialog (A16). The tab's "Add Category" and a row's "Add"
both open the window titled "Add Category", naming no parent.

<a id="fn-e"></a>
**e** — Delete: `categoryManagerStore.categoryDelete()` opens a dialog with
`CategoryDeleteDialogBody.vue` (title `manager.category.delete.confirmationTitle`,
body `manager.category.delete.message.body` with `subCategoryCount` from
`getSubCategoriesCount()`, which counts every descendant; the confirm
button `manager.category.confirmDelete` is `:disabled="inputValue !==
title"`, `title` being `category.localizedTitle`; `common.cancel`), then
`DELETE categories/{id}` and `openCategoryDeletedDialog()`
(`manager.category.deleted` "Category Deleted",
`manager.category.deleted.description`, `manager.category.backToCategories`).
`Repository::delete()` recurses into sub-categories and removes the image
files; `publication_categories.category_id` cascades on delete, so the
versions lose the category; `subeditor_submission_group` rows of the
deleted category are left behind (nothing shows them).
Live-probed 2026-09-25 (Fields, the delete dialog; Rule 7; Side effects),
all three apps: note td6. The box is a `textbox` with no accessible name
(A18). The dialog also has a "Close" at its top; after "Close" with a name
typed it reopened empty. No email reached the manager's mailbox after a
save or a delete (a "Reset Password" sent right after arrived at once), and
the header's "Tasks" count did not change.

<a id="fn-f"></a>
**f** — The picker: `FieldAutosuggestPreset` `categoryIds` with options
labelled by `Repository::getBreadcrumbs()` (the full chain joined by
`common.categorySeparator` "{$parent} > {$child}"; a category in a circular
chain is dropped and the description gains
`submission.categories.circularReferenceWarning`, a state the screens
cannot make, since none sets a parent after creation) and one vocabulary
(`manager.selectCategories` "Select Categories" for button and modal
title, items from `getCategoryVocabularyStructure()`). Entry pages: label
`submission.submit.placement.categories` "Categories", description
`publication.categories.description`, group `publication.placement`
"Placement", added only `if (!empty($categoryOptions))`. Suggestions:
`FieldAutosuggestPreset::getSuggestions()`, a case-insensitive match on
the label, already-chosen values excluded. The window:
`FieldBaseAutosuggest::handleOpenVocabulary()` opens
`VocabularyModal.vue` with `initiallySelectedItems`; column
`common.name` "Name" (`useVocabularyModalConfig.js`), top level bold
(`VocabularyModalCellName.vue`), every node with children expanded on open
(`vocabularyModalStore.getExpandedableItems()`), `common.save` emits the
ticked items to `setSelected()`. The arrow column's sr-only header is
`t('common.expand')`, a key no locale file defines. Who sees the entry
page and may save it: U24 Rule 10, U40 Rule 2, U49 Actors. The wizard's
field: `ForTheEditors::addCategoryField()`, only with `submitWithCategories`
and at least one category. The dashboard filter:
`PKPSubmissionFilters::addCategories()`, label `category.category`
"Categories". Reader-side use of a version's categories: U13 note (OJS
`article_details.tpl`, OPS `preprint_details.tpl`).
Live-probed 2026-09-25 (Fields, the picker and its window; Rules 16–17;
Actors rows 2, 3), all three apps: note td4. The field sat on the entry
pages under "Placement", on the wizard's last step ("For the Editors"; "For
Readers" on OPS) with the line "Select only the categories that are
appropriate for your submission." and on "Review" ("Categories Arts",
"Categories None selected"), and in "Filters" on the dashboard, "My
Submissions" and the reviewer's list (OJS, OMP); a scratch context with no
category offered it on none of them. With "Categories" at "Yes" and no
category, the wizard showed no field. The filter: "Arts" gave "Active
submissions (0)" before the page's "Save" and "(1)" after, with the chip
"Categories: Arts"; "Computer Vision" found the item placed in it, its
parent "Applied Science" did not ("No Items"). A published item's page
named "Arts" and "Computer Vision" (OJS, OMP) and "Computer Science >
Computer Vision" (OPS). OJS, on a journal with a published issue: an
unscheduled article's Publication Settings page refused "Save" with "Please
correct one error." and "Go to Issue: This field is required." until
"Don't Assign To An Issue" was chosen, then saved (200). Test run
2026-09-25 (Rule 16c), OJS, on scratch journals with no issue: the page's
groups read "Placement", "Publication Timing", "Version and Updates",
"Display" and "Access", with no "Issue Assignment", and "Please correct
one error." never showed after "Save"; the suite seeds a published issue
for scenario 3.

<a id="fn-g"></a>
**g** — The page: `PKPCatalogHandler::category()` finds the category by
`filterByPaths([$args[0]])` in the context (none: `NotFoundHttpException`),
builds `SubmissionSearchResult::builderFromRequest()` with
`whereIn('categoryIds', [id])` (OMP adds `orderBy('featured')`), and
paginates with `getRangeInfo($request, 'category')` (the context's
`itemsPerPage`). Templates: OJS and OPS `catalogCategory.tpl` (header
`pageTitleTranslated` the category title;
`breadcrumbs_catalog.tpl` with `parent=$parentCategory`;
`catalog.browseTitles` "{$numTitles} Items"; the image block; the
sub-category `nav` under `catalog.category.subcategories`
"Subcategories"; `catalog.category.heading` "All Items"; the list with
`article_summary.tpl` / `preprint_summary.tpl` `hideGalleys=true`;
`page_info` and `page_links`); OMP `catalogCategory.tpl`
("{$numTitles} Titles", "All Books" through `monographList.tpl`,
`pagination.tpl` fed by `$prevPage` / `$nextPage`, which nothing assigns
since January 2026, U10 OMP2). Only the direct children are listed
(`filterByParentIds([id])`). The picture: OJS and OPS `<div class="cover"
href="…catalog/fullSize…">` around `<img src="…thumbnail…"
alt="null">`; OMP the same `div`, `alt` the category title. The thumbnail
is made at save by `CategoryCategoryController::generateThumbnail()`
from the context's `coverThumbnailsMaxWidth` / `Height` (100 when unset;
only a press has the settings). OPS's page also answers at
`catalog/category/{path}`; the links it prints use `preprints`. Paths are
written into links through `rawurlencode()` (`PKPPageRouter`), so "/"
becomes "%2F".
Live-probed 2026-09-25 (Fields, the category's page; Rules 5, 9, 11–13),
all three apps: the breadcrumb's current step is text marked as the current
page; "{n} Items" / "{n} Titles" counted every page ("3 Items" on page 1 of
3) and read "1 Items" / "1 Titles" for one item (A19); "Subcategories"
listed direct children only; "All Items" is an `h2` clipped to 1 px on OJS
and OPS, "All Books" drawn on OMP; notes td7, td8, td10, td11. A path
changed from "movable" to "moved": the old address answered 404, the new
one opened, and the "Browse" block, the home row, the item's "Categories"
line, the child's breadcrumb and the parent's "Subcategories" all followed
it; "shared", held by two journals, opened each journal's own category. An
unknown path answered 404 with a bare page reading "404 Not Found" and
nothing else, the page an unknown article or preprint address gives on OJS
and OPS. A signed-in manager saw the same page as a visitor.

<a id="fn-h"></a>
**h** — OJS and OPS `plugins/blocks/browse/BrowseBlockPlugin.php`
(identical but for `$catalogPage`): `getContents()` assigns the
top-level categories with `subCategories` built recursively
(`formatCategoryData()`), `browseBlockSelectedCategory` only when the
request is `<catalogPage>/category`; `templates/block.tpl` prints
`plugins.block.browse` "Browse", then `{if $browseCategories}` the line
`plugins.block.browse.category` "Categories" and the nested lists, the
current link carrying class `current` (an inline style: left border,
padding, grey). `$browseCategories` is a `LazyCollection`, an object, so
`{if}` holds even when it is empty. OMP `plugins/blocks/browse`: a
settings file installed per press (`settings.xml`: `enabled` true,
`browseNewReleases`, `browseCategories`, `browseSeries` all 1),
`getActions()` adds "Settings" (`manager.plugins.settings`) opening
`BrowseBlockSettingsForm` (`templates/settingsForm.tpl`: area
`plugins.block.browse.settings.title` "Browse Possibilities", boxes
`plugins.block.browse.newReleases` "New releases",
`plugins.block.browse.category` "Categories",
`plugins.block.browse.series` "Series"); `getContents()` assigns every
category of the press (`getCollector()->filterByContextIds()`, no parent
filter) as a flat array; `block.tpl` prints one `<ul>` with an `is_sub`
class on sub-categories; an empty array is falsy, so the line is left
out. Default placement: seed-facts (U10 claim check, 2026-09-24): "Browse
Block" disabled on a journal and a server, enabled on a press, no sidebar
box ticked on a new context.
Live-probed 2026-09-25 (Fields, the "Browse" block; Rules 14, 15; Settings
bullets 7, 8), all three apps: note td12. The journal's and the server's
"Browse" is a level-2 heading, the press's a `span.title` read as text
(OMP3). The current link carries a 4 px grey left border with padding, and
while the block is placed the breadcrumb's last step (`li.current`) gets
the same (A20). OMP's block indents every `li.is_sub` one step and marks
the current category; with "New releases", "Categories" and "Series" all
unticked it showed "Browse" alone (OMP4). Thirty top-level categories were
all listed, with no cap.

<a id="fn-i"></a>
**i** — Category order: `PKP\category\Collector::getQueryBuilder()` always
orders by the `title` setting in the current UI locale (`COALESCE(…) ASC`;
a category with no title in that locale sorts last on these PostgreSQL
installs, where NULL follows every value, and would sort first on MySQL);
the `seq` column (`DAO::resequenceCategories()`) is never read for
ordering. The page's
order: `PKPCatalogHandler::category()` computes `$orderBy` / `$orderDir`
from `getSortOption()` and never uses them; the builder is ordered only
by the request's own `orderBy` / `orderDir` parameters (none on the
category page's links) and, on OMP, by `featured`;
`DatabaseEngine::buildQuery()` with no order leaves the database's.
Before: stable-3_5_0 `PKPCatalogHandler::category()` passed them to
`Repo::submission()->getCollector()->orderBy($orderBy, $orderDir)`.
Changed by pkp/pkp-lib#8920 (lib/pkp `ce23e18e83` 2026-01-09, `d6a9c82dbf`
2026-01-13).
Live-probed 2026-09-25 (Rules 2, 10; A2): notes td5 and td9.

<a id="fn-j"></a>
**j** — No parent on the form: `CategoryForm` has no parent field;
`saveCategory()` takes `parentCategoryId` from the query string, which
only "Add" from a row sets (`categoryManagerStore.getCategoryForm()`
`setAction(...?parentCategoryId=...)`), and on edit keeps the stored
parent. `parentId` is `writeDisabledInApi`. Nesting depth is unbounded
(`CategoryTreeRow.vue` and the repository recurse). Before:
stable-3_5_0's grid form (`controllers/grid/settings/category/form/CategoryForm.php`)
read and saved `parentId` from a "Parent Category" select of root
categories.
Live-probed 2026-09-25 (Rule 1; A4), all three apps, as manager, Editor
(OJS, OMP) and Site Administrator: six levels (Optics › Lenses › Coatings ›
Films), each indented one step further; "Edit Category" of a top-level
category and of a sub-category offered no parent; the row menu reads only
"Add", "Edit", "Delete Category", and no row is draggable. The stable
line's
`lib/pkp/templates/controllers/grid/settings/category/form/categoryForm.tpl`
draws the "Parent Category" select of the top-level categories, disabled on
a category with sub-categories (`CategoryForm` `cannotSelectChild`); the
stable-line servers were down, so it was not opened.

<a id="fn-k"></a>
**k** — `CategoryForm` builds the "Editorial Assignments" group
(`manager.category.form.assignEditors`,
`manager.categories.form.assignEditors.description`) under `if
(!empty($assignableUserGroups))`, where `$assignableUserGroups` is a
Laravel collection (always non-empty to `empty()`), then one
`FieldOptions` `subEditors[{groupId}]` per user group of
`Category::ASSIGNABLE_ROLES` (manager, sub-editor, assistant) with the
Submission stage and at least one member in the context, labelled with
the group's name, options `manager.sections.form.assignEditorAs`. The
default manager group ("Journal manager", "Press manager") is installed
with no stages (`registry/userGroups.xml` has no `stages` attribute on
it; `UserGroup\Repository::installSettings()` creates stage rows only
from that attribute), so it is never offered. OPS's
default groups have stages 5 and 6 only (`registry/userGroups.xml`), so no
field is added and the group shows empty (group headings render whenever
the group has no `showWhen`, `formHelpers.shouldShowGroup()`). Saving:
`Repository::updateEditors()` into `subeditor_submission_group`
(`ASSOC_TYPE_CATEGORY`). Use: `SubEditorsDAO::assignEditors()`, run once by
the `AssignEditors` listener on submission, merges the section's and the
current publication's `categoryIds` groups; nothing re-runs it when
categories change later. The section path's failure on every journal but
the install's first is the wizard spec's A8; this path shares the same
code after the lookup.
Live-probed 2026-09-25 (Fields "Editorial Assignments"; Settings bullet 2;
OPS1): on a scratch journal whose users held Journal Manager, Editor,
Production Editor, Section Editor, Guest Editor, Funding Coordinator,
Copyeditor, Reviewer, Author and Reader roles, the lists "Journal editor",
"Section editor", "Guest editor" and "Funding coordinator", boxes "Assign
Eve Editor as Journal editor"; on a press "Press editor", "Series editor",
"Funding coordinator"; every box unticked on "Add Category". A
manager-alone journal, and a preprint server with a Moderator and an
Editorial Board Member, showed the heading and sentence with no box. The
assignment itself: note td13.

<a id="fn-l"></a>
**l** — The list comes from the search index: `DatabaseEngine::buildQuery()`
selects from `submissions_fulltext` joined to published publications and
filters `categoryIds` through `publication_categories` of any published
version; `SubmissionSearchResult::newCollection()` drops a submission
whose current publication is not published. Entries are written by
`UpdateSubmissionSearchJob`, queued on publish (U15 note k). Seen
2026-09-24 on all three apps during another feature's claim check
(Appearance & theming, the category page): an item placed in a category showed on the
category's page only after the site's background jobs had run, "0 Items"
until then, while the item's own page already named the category.
Live-probed 2026-09-25 (Rules 8, 8a; Side effects): note td14. The drain
that listed a late item ran one `UpdateSubmissionSearchJob`; an unpublished
item left the page with no job run.

<a id="fn-m"></a>
**m** — "Categories" radio: `PKPMetadataSettingsForm`
`submitWithCategories` (label `category.category`, description
`manager.submitWithCategories.description`, options
`manager.submitWithCategories.yes` / `.no`), schema default false.
"Items per page" / "Page links": the context's `itemsPerPage` /
`numPageLinks` (U10 note v). Cover sizes: OMP context
`coverThumbnailsMaxWidth` / `Height` (seed-facts: 106 and 100 on a fresh
press). "Include a listing of categories": the default theme's
`journalContentOrganization` `CATEGORY_LISTING` (U10 note o).
Live-probed 2026-09-25 (Settings bullets 1, 5, 6, 7, 9), all three apps:
the "Categories" group with its question and radios, "No" on a new context
and on the seeded one; "Yes" saved (200, "Saved") turned the field on in a
draft's last step and "No" saved turned it off. Choosing "Yes" and
switching tab, or leaving Settings › Workflow, asked nothing and the page
reopened on "No", the unsaved-change behavior of every Settings page
([Journal identity & about pages](U07-journal-identity-and-about-pages.md),
Rule 5). "Items per page" 25 and "Page links" 10 on a new context. OMP
"Cover Image Max Width" 106 and "Height" 100 with their help line (OJS and
OPS have no such fields); at 50 × 40, with a category saved again, the
press's category page still asked for
`catalog/thumbnail?type=category&id=…`, which answered 200 with an HTML
body, so the small copy's size was unreadable (OMP1). "Include a listing of
categories" unticked on a new journal; ticked and saved, the home page
showed its top-level categories; OMP and OPS have no such box, and a
server's home page shows the row without one. Every Settings › Website
visit logged the Plugin Gallery's `GET
$$$call$$$/grid/plugins/plugin-gallery-grid/fetch-grid` 500 (the Plugins
feature's, not this one's).

<a id="fn-s"></a>
**s** — Seeding for the scenarios. Every scenario runs on its own scratch
context from `POST scenarios/context` (the three apps), with throwaway
`users[]` (password: the username twice): `manager` (the Journal Manager,
Press Manager or Preprint Server Manager) everywhere, and a signed-out
visitor in a second browser context. Categories come from `categories[]`
(`{path, title?, children[]?}`, the path given in each scenario or the
name lower-cased with "-" for spaces; a `title` locale map for a second
language), created as the tab's "Add Category" creates them with "Name"
and "Path" alone. Articles come from `POST scenarios/submission` by a
throwaway `author`, with `categories` (a list of paths; OMP too, the
"Catalog Entry" page's field) and `published: true`, then `runJobs()`
(the serial project) before any category page is read (the index job,
note l). By hand, the jobs run with `php lib/pkp/tools/jobs.php run` from
the application's root, the command `runJobs()` wraps; the test installs
set `[queues] job_runner = Off`, so no page load runs them. Scenario 1:
`context.supportedFormLocales: ['en', 'fr_CA']`
(French also in `supportedLocales`), no `categories[]`, an `editor`
(`givenName` "Eve", `familyName` "Editor") on OJS and OMP, and one submitted item taken to Production
by `decisions` (OJS `['sendExternalReview', 'accept',
'sendToProduction']`, OMP `['skipExternalReview', 'sendToProduction']`,
none on OPS); the picture is the fixture `profile-image-400.png`.
Scenario 2: the tree `history` › `modern-history` › `cold-war` and
`arts`; "Empires" in `history`, "Wall Posters" in `cold-war` and `arts`;
the mail catcher read for the manager's and the author's addresses.
Scenario 3: a `sectionEditor` (Series Editor on OMP, Moderator on OPS)
in the submission's `participants[]`, the item in Production as in
scenario 1, the tree `arts` and `applied-science` › `computer-science` ›
`computer-vision`, `applied-science` › `engineering`; on OJS also
`issues: [{volume: 1, number: 1, year: 2026, published: true}]`, without
which the page holds no "Issue Assignment" (Rule 16c). Scenario 4: an
`author` with a `submitted: false` draft, moved to
"For the Editors" ("For Readers") by "Continue"; `submitWithCategories`
is not seeded, so the setting arrives at "No" and the manager changes it
on screen. Test run 2026-09-25, all three apps: after the Author's reload
the rail's current step read "1 Upload Files", and on OJS the rail
offered no "For the Editors" to press (steps not yet reached, U21 Rule
8), so "Continue" walks back to the step. Scenario 5: `itemsPerPage: 2`, the tree `science` ›
`astronomy`, `physics`; "Draft Theory" `submitted: true` with
`categories: ['physics']` and no `published`; on OMP the seeded
`publicknowledge` press is only read (its seven categories are in
seed-facts; its counts vary with earlier runs, so no count is read
there). Scenario 6: "Sun Study" and "Moon Study" seeded and the jobs run,
then "Late Study" seeded without a run; "Unpublish" pressed on screen.
Scenario 7 {OJS OPS}: `context.supportedLocales` and
`supportedFormLocales` `['en', 'fr_CA']`, `title` maps `{en, fr_CA}`
("Mathematics" `en` alone); the plugin and the sidebar box ticked on
screen. Scenario 8 {OMP}: the "Browse Block" arrives enabled on a new
press with its three boxes ticked (seed-facts); the sidebar box and the
block's "Settings" are changed on screen. The seeded `publicknowledge`
carries the seven categories of seed-facts on every app and is only
read. The automatic assignment cannot be shown on a scratch context
(A13).
Live-probed 2026-09-25 (Canonical scenarios preamble), all three apps: an
item published into "Physics" read "0 Items" ("0 Titles") on its page
before the queue ran and "1 Items" after.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-25 (Fields, the tab and the window; Rules
3, 3a; A11), all three apps, as Journal Manager on scratch journals: on
load only the top-level rows; "Science"'s arrow showed "Physics" alone,
then "Physics"'s showed "Optics"; "Science" closed hid both and, opened
again, showed both without "Physics" being pressed; a reload closed every
row. Every arrow was named "Expand sub-categories" before and after
opening, with no `aria-expanded`; on "Arts" (no sub-categories) the button
was 0 × 0 with no icon and a click never landed. Tab from a row's "More
Actions" focused its arrow, where Enter and Space changed nothing; a
pointer click then opened the row. A sub-category added under a closed
leaf, under a closed parent and under an open deep parent left the parent
open showing it, with "Category saved". With en and fr_CA form languages
the window showed "French" at the top and "0/2 languages completed" under
"Name" and "Description"; pressing "French" added "Name in French" and
"Description in French"; an edited category with both read "2/2 languages
completed".

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-25 (Fields "Path"; Rule 5; A8, A9), all
three apps: the saves note d records. The "Path" line read "The
category's URL will be: …/index.php/{journal}/en/catalog/category/path"
(OPS "…/preprints/category/path"; no "/en/" on a one-language journal),
keeping the literal "path" while typing. "Slashed" with the path
"sci/phys": its links printed `…/category/sci%2Fphys` and opened
"Science"'s page ("Home / Science"); "Nowhere Slash" with "nosuch/thing"
answered 404 from its link and from the typed address.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-25 (Fields "Editorial Assignments"; OPS1),
OJS, OMP and OPS: note k.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-25 (Fields, the "Select Categories" window;
Rules 16–16c; A12), all three apps, as Editor (OJS, OMP) and an assigned
Moderator (OPS) on the entry page of a submission in Production, and as
manager in "Filters": the field under "Placement" with its description;
"sci" and "SCI" offered "Applied Science", "Applied Science > Computer
Science", "Applied Science > Computer Science > Computer Vision" and
"Applied Science > Engineering", "vis" the Computer Vision line alone,
"zzz" nothing; the chip read the whole line, its button "Remove Applied
Science > Computer Science > Computer Vision"; a chosen category was not
offered again. The window slid in from the right headed "Select
Categories": the column "Name", top-level rows bold, every row with a
box, every branch open, the chosen ones ticked; its arrow column's header
empty on screen and "##common.expand##" in the accessibility tree (A12);
every arrow named "Collapse" before and after a press. Ticking "Arts" and
the window's "Save" gave two chips, unticking one gave one, and the
window's "Close" after a tick left the chips. Leaving for "Title &
Abstract" and back, or reloading, without the page's "Save" showed
"Selected: None" with no question; after "Save" ("Saved", 200) and a
reload the chips were back. A new version carried the categories over; a
change saved on it left the earlier version and the visitor's page as
they were.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-25 (Rule 2), all three apps: "Zoology" seeded
first, "Arts" with "Sculpture" then "Painting", "Mathematics" with an
English name only and French names for the rest. In English every list
read alphabetically (Arts, Delta, Mathematics, Movable, Science, Zoology;
Painting, Sculpture). In French every named category sorted by its French
name (Animaux, Beaux-arts, Delta, Movable, Sciences; Modelage, Peinture),
and "Mathematics" came after all of them, in the tab, the "Browse" block,
the home row and the "Select Categories" window; the categories without a
French name stood in a different order in each of those lists.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-25 (Fields, the delete dialog; Rule 7;
Side effects), all three apps, as manager, Editor (OJS, OMP) and Site
Administrator: "Delta" with "Delta Sub" › "Delta Subsub", a published
item in "Delta", one in "Delta Subsub" and "Arts", a submitted one in
"Delta Sub" (jobs run). The dialog read as Fields quotes it, the count 2
("Physics" 1, a leaf 0); "delta" and "Science " kept the button grayed,
the exact name enabled it; in French the shown French name enabled it
and the English one did not. "Cancel" closed it with no request and the
row stayed. Confirmed: "Category Deleted", ""Delta" and its 2
sub-categories have been successfully deleted.", "Back to Categories".
Afterwards the three addresses answered 404; the "Delta" item's page had
no "Categories" line and the other read "Categories Arts", both still
open; "Arts" still listed its item; the submitted item's entry page read
"Selected: None" (before: "Delta > Delta Sub"); "Filters" offered no
Delta line.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-25 (Rule 9; A1), all three apps: an empty
category read "0 Items" and "0 - 0 of 0 items" (OJS, OPS; the heading
"All Items" clipped to 1 px) and "0 Titles", "All Books" and nothing under
it (OMP); "Nothing has been published in this category yet." and "No
titles have been published yet." never showed. "Items per page" 1 with
three items: "1 - 1 of 3 items 1 2 3 > >>", "2 - 2 of 3 items << < 1 2 3 >
>>", "3 - 3 of 3 items << < 1 2 3"; "Page links" 2: "1 2 > >>"; back at
25, "1 - 3 of 3 items" and no links. OMP: "3 Titles", the first book only,
no page links.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-25 (Rule 9): the seeded press's "Applied
Science" and "Computer Vision" pages and every scratch press's category
page loaded with heading, count, breadcrumb and "Subcategories"; no
connection ended.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-25 (Rule 10; A2), all three apps: "Beta
Item", "Alpha Item" and "Gamma Item" published in that order into
"Ordering" (one publication date); saved at each of the four choices (OMP
also the two series-position choices), the page listed "Beta Item",
"Alpha Item", "Gamma Item" every time. OMP: "Gamma Item" made featured in
the Catalog moved to the top.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-25 (Rule 11; A5), all three apps: the seeded
"Computer Vision" read "Home / Computer Science / Computer Vision",
"Home" and "Computer Science" as links, the name not; "Applied Science"
read "Home / Applied Science" with "Subcategories" "Computer Science",
"Engineering"; a scratch "Quantum" under "Physics" under "Science" read
"Home / Physics / Quantum".

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-25 (Rule 12; A6, A7, OMP1), all three apps:
a 300 × 200 picture showed as 100 × 67 and a 40 × 40 one at 40 × 40 (OJS,
OPS); pressing it changed nothing; its full-size address, typed, answered
the picture (OJS, OPS). "Alternate text" "A red square" saved and
reopened, yet the image was named "null" (OJS, OPS) and "Pictured", the
category's name (OMP). OMP: a broken-picture mark (0 × 0) with the
category's name beside it; the small and full-size addresses answered 200
with an empty HTML body; the description showed.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-25 (Fields, the "Browse" block; Rules 14,
15; Settings bullets 7, 8; A10, A20, OMP2, OMP3, OMP4), all three apps: on
a scratch journal, server and press with no category, the block enabled
("The plugin "Browse Block" has been enabled.") and ticked on screen
showed "Browse" and "Categories" with an empty list (OJS, OPS), or
"Browse" and "New Releases" (OMP). With "Zoology", "Arts", "Science" ›
"Physics" › "Optics" › "Lasers" and "Science" › "Astronomy" added in that
order: OJS and OPS nested every level in name order, each level indented
further, every link opening its page; on each category's page only that
link was marked, grey with a grey bar; while the block was placed the
breadcrumb's last step got the same bar on every page, and not before
(OMP's breadcrumb unchanged). OMP: one alphabetical run, every
sub-category indented one step, the current category marked;
"Categories" unticked in "Settings" and saved removed the line and the
links from the home page and the category pages, "Cancel" kept the box;
all three boxes unticked left "Browse" alone. Thirty top-level categories
were all listed. A signed-in Reader and the manager saw the same block.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-25 (Actors row 4; Rules 18, 18a; Side
effects; A13), OJS and OMP, two scratch contexts each: "Arts" ticked for
"Eve Editor" and "Sam Section" (then for a Section Editor on no section),
the tab's "Assigned To" reading their names and the window reopening
ticked. The author, with "Categories" at "Yes", submitted through the
wizard choosing "Arts" ("Categories Arts" on "Review"): the submission's
participants listed the author alone, the ticked editor's dashboard read
"Assigned to me (0)" and her mailbox stayed empty, and the managers got
"A new submission needs an editor to be assigned: "{title}""; on OJS the
section's Section Editor was not assigned either. "Arts" added later on a
second submission's entry page, and an editor unticked afterwards,
changed nothing, as nothing is assigned on a scratch context at all. The
seeded journal, the install's first, is shared and was only read, so the
working case and Rule 18b were not driven (A14).

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-25 (Rules 8, 8a; A3), all three apps:
"Physics Only Item" was listed on "Physics" alone and "Science" listed
only its own; "Science Item" left "Science" at "0 Items" before the queue
ran while its own page named "Science"; a later "Late Item" was missing
from the list and from the count ("1 Items") until the jobs ran ("2
Items"). OJS: an article scheduled into a 2030 issue was not listed. A
submission in the workflow was not listed. An article unpublished on
screen ("Unpublish", OPS "Unpost", confirming "Are you sure you don't
want this to be published?" / "…posted?") left the list before any job
ran. The seeded "Applied Science" read "0 Items" while "Engineering"
listed items.

<a id="fn-f-a1"></a>
**f-a1** — `catalogCategory.tpl` (all three apps) tests `{if
empty($results)}`, and `$results` is the `LengthAwarePaginator`
`PKPCatalogHandler::category()` assigns, an object, so `empty()` is never
true; `page_info` on an empty paginator prints `navigation.items` with
`from` 0 ("0 - 0 of 0 items"). Before: stable-3_5_0 assigned
`publishedSubmissions` as an array. Changed by pkp/pkp-lib#8920 (ojs
`606ad4ef0b` 2026-01-09, `13bd3b2eaa` 2026-01-13).
Live-probed 2026-09-25: note td7. The "before" was not opened, the
stable-line servers being down.

<a id="fn-f-a2"></a>
**f-a2** — Note i. Live-probed 2026-09-25: note td9, the order the items
were published in whatever the choice; whether that is the order Search
gives its results was not compared.

<a id="fn-f-a3"></a>
**f-a3** — Note g (`whereIn('categoryIds', [$category->getId()])`, no
descendants); the same in stable-3_5_0's collector call
(`filterByCategoryIds([$category->getId()])`). Nested categories arrived
with pkp/pkp-lib#10404 (lib/pkp `198595800a`, 2025-05-12).
Live-probed 2026-09-25: note td14.

<a id="fn-f-a4"></a>
**f-a4** — Note j. Live-probed 2026-09-25: note j.

<a id="fn-f-a5"></a>
**f-a5** — `breadcrumbs_catalog.tpl` prints one `$parent` step; its header
comment reads "This only supports one-level of nesting, as does the
category hierarchy data." `PKPCatalogHandler::category()` passes the
direct parent only.
Live-probed 2026-09-25: note td10.

<a id="fn-f-a6"></a>
**f-a6** — Note g: a `div` carries the `href`; there is no `<a>`. The
markup dates from ojs `ea9c1cefd4` (2018-12-17, pkp/pkp-lib#4158).
Live-probed 2026-09-25: note td11.

<a id="fn-f-a7"></a>
**f-a7** — Note g: OJS and OPS `alt="null"`, OMP
`alt="{$category->getLocalizedTitle()|escape}"`; `image.altText` is saved
by `saveCategory()` and read by no template.
Live-probed 2026-09-25: note td11.

<a id="fn-f-a8"></a>
**f-a8** — Note d (`/` allowed by `CATEGORY_PATH_REGEX`) and note g: the
link carries "%2F", and `category()` looks up `$args[0]` only, the part
before the first "/" once the address is split.
Live-probed 2026-09-25: note td2.

<a id="fn-f-a9"></a>
**f-a9** — `grid.category.pathAlphaNumeric` against `CATEGORY_PATH_REGEX`
(note d).
Live-probed 2026-09-25: note d ("my path" and "café" refused, "a-b_c.d" and
"sci/phys" saved).

<a id="fn-f-a10"></a>
**f-a10** — Note h (`{if $browseCategories}` on a `LazyCollection`).
Live-probed 2026-09-25: note td12.

<a id="fn-f-a11"></a>
**f-a11** — Note c. Live-probed 2026-09-25: note td1; the "Select
Categories" window's arrows: note td4.

<a id="fn-f-a12"></a>
**f-a12** — Note f (`common.expand`, a key no locale file defines, is the
arrow column's screen-reader-only header). Live-probed 2026-09-25 in all
three apps, the entry pages' and the Filters' window: the drawn header cell
empty, the accessibility tree's column header "##common.expand##". The
"##COMMON.EXPAND##" seen on 2026-09-24 during another feature's check
(Identifiers) was that hidden text read with the table's upper-case style.

<a id="fn-f-a13"></a>
**f-a13** — `SubEditorsDAO::assignEditors()` through the `AssignEditors`
listener (note k) serves sections and categories alike, so the category
path fails where the section's does (the wizard spec's A8: every context
but the install's first). Live-probed 2026-09-25 (OJS, OMP): note td13. A
preprint server offers no one to tick (OPS1).

<a id="fn-f-a14"></a>
**f-a14** — Note k: `AssignEditors` runs once, on submission, and nothing
re-runs it when categories or ticks change later. Not driven: every scratch
context assigns nobody (A13) and the install's first journal is shared and
only read (note td13), so this entry is a code reading.

<a id="fn-f-a15"></a>
**f-a15** — Live-probed 2026-09-25, all three apps (the press's category
page on OMP only; OJS and OPS showed it translated, "1 titre(s)", "Tous les
titres"): at `…/fr_CA/management/settings/context` the tab, a row's menu,
"Delete Category" and the "Select Categories" window printed
`##grid.category.categoryName##`, `##manager.category.assignedTo##`,
`##common.moreActions##`, `##manager.category.toggleSubcategories##` (the
headers upper-cased by style), `##manager.category.expandSubcategories##`,
`##manager.category.deleteCategory##`,
`##manager.category.delete.confirmationTitle##`,
`##manager.category.delete.message.body##`,
`##manager.category.confirmDelete##`, `##manager.selectCategories##` and
`##list.collapse##`: keys with no fr_CA text.

<a id="fn-f-a16"></a>
**f-a16** — Live-probed 2026-09-25, all three apps: "Science" renamed
"Science unsaved" and closed with "Close", and "Zoology" changed and closed
with Escape: no dialog, the tab kept the saved names; the same category's
"Edit" reopened the unsaved name with the saved "Path", also after the
"Masthead" tab and back; "Arts"'s "Edit" and "Add Category" opened with
their own values; after a reload "Edit" showed the saved name. Leaving the
page with the window open and changed asked nothing.
Re-walked 2026-09-30 on main, all three apps, by the issue report's
`shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/reach.js`
(a dataset category, " Draft" added to its name, the window shut with its
close control, "Edit" and an unchanged "Save"): the row kept the saved
name, the reopened "Name" held the abandoned text, and the save stored
it. Mechanism: `CategoryManager/categoryManagerStore.js`
`getCategoryForm()` fills the form through `useForm`'s `setValues()`
with a shallow copy of the row, so the form's name field is the row's
own per-language object, and `Form.vue::fieldChanged()` writes each
keystroke into it (`field[prop][localeKey] = value`); closing discards
only the form. The row prints the API's `localizedTitle` string, so it
keeps the saved name, unlike Institutions A2. The report's severity,
medium, is the entry's impact.
Issue report: [pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4) ([docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md](../issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md)).

<a id="fn-f-a17"></a>
**f-a17** — Live-probed 2026-09-25, all three apps: note d (the preview's
`src` "[object Event]", a GET `…/management/settings/[object%20Event]`
answering 404, then "Save" refused with `form.invalidImage`).

<a id="fn-f-a18"></a>
**f-a18** — `CategoryDeleteDialogBody.vue` (note e): the input has no
label, `aria-label` or placeholder. Live-probed 2026-09-25, all three apps:
the accessibility tree lists it as a `textbox` with no name.

<a id="fn-f-a19"></a>
**f-a19** — Note g: `catalog.browseTitles` "{$numTitles} Items" (OMP
"{$numTitles} Titles") has one form for every number. Live-probed
2026-09-25, all three apps: "Physics" and "Quantum", one item each.

<a id="fn-f-a20"></a>
**f-a20** — Note h: the block's inline style for the class `current` also
matches the breadcrumb's last step, `li.current`. Live-probed 2026-09-25,
OJS and OPS: "About the Journal" had no bar before the block was placed and
a 4 px left border in rgb(221, 221, 221) with padding after it, as every
category page's breadcrumb did; OMP's breadcrumb had no bar.

<a id="fn-f-omp1"></a>
**f-omp1** — OMP `CatalogHandler::thumbnail()` / `fullSize()` read
`ContextFileManager(press)->getBasePath() . '/categories/' .
thumbnailName` (full size: `name`, the original upload name), where
stable-3_5_0's grid form stored category pictures; the current
`CategoryCategoryController::saveCategory()` moves the upload into the
context's public files as `{id}-category.{ext}` and the thumbnail as
`{id}-category-thumbnail.{ext}` (`PublicFileManager`), which lib/pkp's
`PKPCatalogHandler` reads for OJS and OPS. With no file at the old place,
`downloadByPath()` sends nothing.
Live-probed 2026-09-25: note td11.

<a id="fn-f-omp2"></a>
**f-omp2** — Note h (OMP flat array, `is_sub` one indent step at any depth;
order note i). Live-probed 2026-09-25: note td12.

<a id="fn-f-omp3"></a>
**f-omp3** — OMP `plugins/blocks/browse/templates/block.tpl` prints
"Browse" in a `span.title`; OJS and OPS print it in an `h2`. Live-probed
2026-09-25: the accessibility tree read "Browse" as text on a press and as
a level-2 heading on a journal and a server.

<a id="fn-f-omp4"></a>
**f-omp4** — Note h. Live-probed 2026-09-25: note td12 (the block's text
"Browse" and no link, in two runs).

<a id="fn-f-omp5"></a>
**f-omp5** — Test run 2026-09-25 (Rule 9; scenario 8), the OMP suite,
every run: right after the sidebar's save (`POST …/api/v1/contexts/{id}`,
200) and after the block's "Settings" save
(`settings-plugin-grid/manage?…plugin=browseblockplugin…`, 200), the next
`GET …/catalog/category/arts` (then `…/category/science`) got no response
at all, no status: the server log reads "Segmentation fault (core
dumped)", the test install's PHP 8.3 built-in server (`php -S`) exits
139 before logging the GET, and the browser reports
`net::ERR_EMPTY_RESPONSE`; the respawned server answered the same page
200. The final OMP run the same day failed the same way in scenario 1
(`…/catalog/category/natural-science`, right after seeding, no "Browse"
block placed). Live-probed 2026-09-25 (Rule 9), a fresh `php -S` process per
sequence, as the harness starts it: the catalog index then a category
page crashed every time (10 of 10), also with a book page between them;
`search/search` loads the classes as the catalog does; a book page
opened before the catalog page, or no catalog page at all, left every
category page at 200; the home and "About" pages load no publication
class. The fleet's core dump and a run under gdb show the same stack:
`PKPCatalogHandler::category()` → `DatabaseEngine::buildQuery()` is the
first code to touch `PKP\publication\PKPPublication`, OPcache replays its
inheritance-cache entry, autoloads `PKP\publication\DAO` inside the
replay and dereferences the half-linked parent (`instanceof_function_slow`,
SIGSEGV; not a stack overflow). The cause is the PHP runtime: php-src
GH-20469, fixed by php-src PR #22221 in PHP 8.4.23+ and 8.5.8+ and not
backported to 8.3 (the VM runs 8.3.33, CI pins 8.3).
`-d opcache.enable=0`, or `-d opcache.file_cache={dir} -d
opcache.file_cache_only=1`, removes the crash; `pcre.jit=0` and a larger stack do not, and clearing the template
cache has no effect. OJS and OPS load `APP\publication\DAO` during
request setup, so the crashing order never occurs there: every OJS and
OPS page tried (home, archive or preprints list, an article, search,
then the category page) answered 200. Only the built-in server was run;
no other server setup was tried. The OMP suite re-opens every category
page until it answers (`docs/tracking/app-changes.md` row 18).

<a id="fn-f-ops1"></a>
**f-ops1** — Note k. Live-probed 2026-09-25: note k.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Categories" tab: table, "Add Category" | Settings › Journal (Press, Server) › "Categories" | AFFM-013, VUE-030 |
| Row "More Actions" › "Add" (sub-category) | same tab | AFFM-014 |
| Row "More Actions" › "Edit" | same tab | AFFM-015 |
| Row "More Actions" › "Delete Category" and its dialogs | same tab | AFFM-016 |
| Row arrows (per row; the atlas's "global toggle" is only the arrow column's hidden heading) | same tab | AFFM-017 |
| "Add Category" / "Edit Category" window | same tab | VUE-054 |
| Categories API (list, add, edit, delete; its `categoryFormComponent` route has no method, see UNASSIGNED) | `api/v1/categories` | API-010 |
| The category record (name, path, description, order, picture, parent) | — | SET-004 |
| A category's page, its picture and small copy | `catalog/category/{path}` (OPS `preprints/category/{path}`), `…/fullSize`, `…/thumbnail` | ROUTE-006, AFFR-072 |
| The home page's row of categories {OJS} | journal home (owned by *Appearance & theming*, its Rule 15) | AFFR-024 |
| "Browse" block {OJS OPS}, press's "Browse" block categories part {OMP} | the sidebar | AFFR-086, PLUG-001 |
| A press's "New Releases" on its category page | category page {OMP} (*Catalog browse*) | AFFR-072 (OMP rows, handed on) |
| A preprint server's category links in its home and "Archives" header | *Sections* (cited) | AFFR-078 |
| "Categories" field and "Select Categories" window | Publication Settings / "Preprint entry" / "Catalog Entry"; wizard "For the Editors" ("For Readers" on OPS); "Filters" | VUE-090 (the window, cited from *Publication metadata*) |

## Reference — code anchors

- Management UI: ui-library `src/managers/CategoryManager/`
  (`CategoryManager.vue`, `CategoryTreeRow.vue`,
  `CategoryManagerCellName.vue`, `CategoryManagerCellAssignedTo.vue`,
  `CategoryManagerCellMoreActions.vue`, `CategoryDeleteDialogBody.vue`,
  `EditCategoryFormModal.vue`, `categoryManagerStore.js`,
  `useCategoryManagerConfig.js`), `src/components/Table/TableCellTreeExpand.vue`;
  each app's `templates/management/context.tpl`;
  `lib/pkp/pages/management/ManagementHandler.php`.
- Form and API: `lib/pkp/classes/components/forms/context/CategoryForm.php`;
  `lib/pkp/api/v1/categories/CategoryCategoryController.php`.
- Model: `lib/pkp/classes/category/` (`Category.php`, `Repository.php`,
  `Collector.php`, `DAO.php`, `maps/Schema.php`);
  `lib/pkp/schemas/category.json`;
  `lib/pkp/classes/migration/install/CategoriesMigration.php`;
  `lib/pkp/classes/context/SubEditorsDAO.php`,
  `lib/pkp/classes/observers/listeners/AssignEditors.php`.
- Picker: ui-library `src/components/Form/fields/FieldAutosuggestPreset.vue`,
  `FieldBaseAutosuggest.vue`, `VocabularyModal/`; OJS and OPS
  `classes/components/forms/publication/IssueEntryForm.php`, OMP
  `classes/components/forms/publication/CatalogEntryForm.php`;
  `lib/pkp/classes/components/forms/submission/ForTheEditors.php`,
  `lib/pkp/classes/components/forms/dashboard/PKPSubmissionFilters.php`;
  `lib/pkp/classes/components/forms/context/PKPMetadataSettingsForm.php`.
- Reader pages: `lib/pkp/pages/catalog/PKPCatalogHandler.php`, OJS and OPS
  `pages/catalog/index.php`, OPS `pages/preprints/index.php`, OMP
  `pages/catalog/CatalogHandler.php`; each app's
  `templates/frontend/pages/catalogCategory.tpl`;
  `lib/pkp/templates/frontend/components/breadcrumbs_catalog.tpl`; OMP
  `templates/frontend/components/monographList.tpl`;
  `lib/pkp/classes/search/SubmissionSearchResult.php`,
  `lib/pkp/classes/search/engines/DatabaseEngine.php`.
- Browse block: each app's `plugins/blocks/browse/` (`BrowseBlockPlugin.php`,
  `templates/block.tpl`; OMP also `BrowseBlockSettingsForm.php`,
  `settings.xml`, `templates/settingsForm.tpl`).
- Locale: lib/pkp `locale/en/manager.po` (`grid.category.*`,
  `manager.category.*`, `manager.categories.*`,
  `manager.submitWithCategories.*`, `manager.selectCategories`), `common.po`
  (`common.categorySeparator`, `catalog.category.noItems`,
  `catalog.category.subcategories`, `catalog.sortBy.*`,
  `category.category`, `category.coverImage`, `navigation.items`); app
  overrides: OJS and OPS `catalog.browseTitles`, `catalog.category.heading`,
  `catalog.sortBy`, `catalog.sortBy.categoryDescription`,
  `grid.category.path`; OMP `catalog.browseTitles`,
  `catalog.category.heading`, `catalog.noTitles`, `catalog.sortBy*`;
  each app's `plugins/blocks/browse/locale/en/locale.po`.
