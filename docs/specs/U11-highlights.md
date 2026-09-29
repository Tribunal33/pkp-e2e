---
name: highlights
status: verified
---

# Highlights {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Highlights are the promotional slides at the top of a journal's home page:
each one is a headline, a short text, an optional picture and a button that
takes the visitor to any web address (a call for papers, a special issue, a
new book, a conference). A Journal Manager keeps the list on the journal's
Website settings, adds and edits slides in a side panel and sets their
order; the home page shows them at once, as a carousel every visitor can
page through. When the install hosts several journals, the Site
Administrator keeps a second, separate set for the site's own home page;
today nothing can be saved there ⚠ [A5](#a5). There is no scheduling, no
on/off switch and no reader-side setting: a saved highlight is live until
it is deleted. <sup>a</sup>

## Actors & permissions

A highlight belongs either to one journal or to the site (Rule 1). The
journal's list is managed on the journal's Website settings, which every
role at the manager level reaches (Journal Manager, Editor and Production
Editor: the roles whose Roles row reads "Journal Manager" for its
permission level; a preprint server installs no Editor or Production
Editor group, so there its manager alone); the site's list is managed on
the Site Settings, which only the Site Administrator reaches, and only
while the site hosts two or more journals (Rule 12). No role below the manager level has any highlights
screen. Readers need no account. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the journal's Highlights tab; add, edit, delete and reorder its highlights** | • Journal Manager, Editor and Production Editor of that journal, any time (on a preprint server its manager alone)<br>• Site Administrator working in the journal (the same tab, the same panel)<br>• Section Editor, Assistant, Author, Reviewer, Reader: no Website settings at all; the settings address answers the access-denied page <sup>b</sup> |
| **See the site's Highlights tab; add, edit, delete and reorder the site's highlights** | • Site Administrator, on the Site Settings, only while the site hosts two or more journals (Rule 12): the tab, "Order" and "Add Highlight" are offered, but no highlight can be saved or ordered there [A5](#a5)<br>• Journal Manager: never; the Site Settings are the administrator's alone <sup>b</sup> <sup>c</sup> |
| **See the carousel** | • any visitor, signed in or not, on the journal's home page (its own highlights) while at least one highlight exists there, and on the site's home page once a site highlight exists, which none can today [A5](#a5) (Rules 2, 3 and 13) <sup>j</sup> |
| **Follow a slide's button** | • any visitor; the button opens the address typed into "URL", exactly as typed (Rule 4) ⚠ [A2](#a2) <sup>e</sup> |

## Fields & validation

The "Add Highlight" and "Edit Highlight" side panels carry the same five
fields and one "Save" button; no field is marked required on the panel. A
save that fails validation is refused in place: the panel stays open,
"Please correct one error." (or "Please correct {n} errors.") appears under
the fields, above "Save", with a "Go to {field}: {message}" button per
fault and a "Jump to next error" button, the message sits under the field,
and "Save" is grayed out until every flagged box is changed. "Title",
"Description" and "Button Label" are entered per language when the form
has more than one: a language button at the top of the panel shows the
second language's boxes, labelled "{Field} in {language}" (Rule 11).
<sup>d</sup> <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Title" | yes, in the primary language | One line of formatted text: a "Formatting" button on the box opens bold, italic, underline, superscript and subscript; the box refuses a line break (Enter does nothing). Empty on save: "This field is required." (with two or more form languages, on an edit: "You must complete this field in {language}.", naming the primary language). Shown as the slide's headline and as the row's name in the list, where its formatting prints as tags ⚠ [A3](#a3) <sup>d</sup> <sup>n</sup> |
| "Description" | no | Formatted text with bold, italic, superscript, subscript and a link control. Shown under the headline on the slide; an empty description leaves the slide with headline and button only <sup>d</sup> <sup>n</sup> |
| "URL" | yes | Plain text under the hint "The full URL, including https://, for the button in the highlight." Any non-empty text is accepted and becomes the button's address as typed: nothing checks that it is a web address ⚠ [A2](#a2). Empty: "This field is required." <sup>e</sup> |
| "Button Label" | yes, in the primary language | Short plain text under the hint "The label, such as Read More, for the button in the highlight."; the text on the slide's button. Empty: "This field is required." (the primary-language wording as for "Title") <sup>d</sup> <sup>e</sup> |
| "Image" | no | An upload box ("Upload File"; "Drop files here to upload") that takes image files only. Any other file is refused and nothing is sent. Its name is listed in the box with a "Remove file" link and "You can't upload files of this type." under it, and the panel counts the refusal as a form error: "Please correct one error." with the button "Go to Image: You can't upload files of this type." and "Jump to next error" appear above "Save", and "Save" and "Upload File" are grayed out. A picture dropped in the box next uploads and clears both messages, while the refused name stays listed under the preview with its "Remove file" link. A file over the server's upload limit is likewise refused in the box, with "File is too big ({size}MiB). Max filesize: {limit}MiB.", and nothing is sent. A chosen image shows a preview (a screen reader hears it as "Preview of the currently selected image."; nothing is printed) and an "Alternate text" box under the guidance "Describe this image for visitors viewing the site in a text-only browser or with assistive devices. Example: "Our editor speaking at the PKP conference.""; "Remove" clears the image, "Restore Original" brings back the image the highlight had when the panel opened. Saved with the highlight; shown on the slide with the alternate text as the picture's description (Rule 10) <sup>g</sup> |

## Rules & state

1. **Scope.** Every highlight belongs to exactly one journal, or to the site.
   A journal's list holds only its own highlights and its home page shows
   only those; nothing is shared between journals. The site's list and the
   site's home page carry none of the journals' highlights and are meant to
   hold the site's own; today they hold nothing, because no site highlight
   can be saved [A5](#a5). <sup>a</sup> <sup>j</sup>
2. **Where the carousel shows.** On the home page the carousel is the first
   block under the header; below it come the homepage image, on a journal
   the category list, the "About the Journal" / "About the Press" text and
   the announcements, and on a preprint server the announcements, the
   preprint list and the "About the Server" text (each of those blocks
   shows only when its own setting is on). The site's home page has the
   same place for the site's carousel, above the site's about text, the
   announcements and the list of journals; none has been seen there, since
   no site highlight can be saved [A5](#a5). No other page shows
   highlights. <sup>j</sup>
3. **No highlights, no carousel.** While the list is empty the home page
   carries no carousel, no heading and no empty frame: the next block moves
   up. The list itself reads "No items found." <sup>j</sup>
4. **What a slide shows.** One slide per highlight, in the list's order
   (Rule 9): the image when there is one, then the headline
   ("Title"), the "Description" text and a button carrying the "Button
   Label" whose link is the "URL" as typed. With two or more highlights
   the carousel has a "Previous slide" and a "Next slide" arrow and one
   dot per slide; with one highlight the slide shows alone, without arrows
   or a dot. The arrows stop at the ends: "Previous slide" is disabled on
   the first slide and "Next slide" on the last. The dots show which slide
   is on and do nothing when pressed ⚠ [A6](#a6). A screen reader also
   hears the heading "Highlights" above the carousel. <sup>j</sup>
5. **Adding.** "Add Highlight" above the list opens the "Add Highlight"
   panel (Fields & validation). "Save" closes the panel; the new highlight
   appears as the last row of the list and as the last slide on the home
   page, with no reload and no further step. <sup>a</sup> <sup>d</sup>
6. **Editing.** "Edit" on a row opens the "Edit Highlight" panel with the
   row's values filled in, the current image previewed. "Save" closes the
   panel and the row shows the new title in place; the slide changes on the
   next load of the home page. Closing the panel with its close control
   instead of "Save" keeps the highlight as it was, but the row shows the
   unsaved title until the tab is reloaded ⚠ [A4](#a4). Escape on a plain
   box (inside a formatted-text box Escape does nothing), a click outside
   the panel or leaving the page also close either panel, with nothing
   saved and no warning. <sup>a</sup> <sup>d</sup>
7. **Ordering position of a new highlight.** A new highlight always goes
   last, whatever ordering was saved before. <sup>i</sup>
8. **Deleting.** "Delete" on a row opens the "Delete Highlight" dialog:
   "Are you sure you want to delete {title}? This action can not be
   undone." (the title printed with its formatting: a bold word shows bold)
   with "Yes" and "No". "Yes" removes the row, the slide and the
   highlight's image file; "No" closes the dialog and keeps everything.
   <sup>h</sup>
9. **Reordering.** "Order" above the list switches the list into ordering
   mode: "Order" is replaced by "Save Order" and "Cancel", "Add Highlight"
   is grayed out, the rows' "Edit" and "Delete" buttons give way to an up
   and a down arrow per row (read to a screen reader as "Increase position
   of {title}" and "Decrease position of {title}"). The arrows move the row
   one place; the first row's up arrow and the last row's down arrow do
   nothing. "Save Order" saves the order shown and leaves ordering mode;
   the home page follows the saved order. <sup>i</sup>

9a. **Leaving ordering mode without saving.** "Cancel" leaves ordering
   mode without saving ⚠ [A1](#a1): the rows stay where the arrows put
   them until the page is reloaded, which shows the saved order again.
   Ordering mode is kept while the manager visits another side tab of
   Setup and comes back: "Save Order", "Cancel" and the moved rows are
   still there. Leaving the page (another address, a reload) drops the
   unsaved moves with no warning. With an empty list "Order" still enters
   ordering mode, and "Save Order" then shows the dialog "Error / An
   unexpected error has occurred. Please reload the page and try again."
   with "OK", which returns the normal header ⚠ [A8](#a8). <sup>i</sup>

10. **The image.** A saved image is kept as a file of the journal's (or the
    site's) public files, one per highlight, and shown on the slide with
    the "Alternate text" as its description. On an edit, "Remove" then
    "Save" deletes the file and leaves the slide text-only; uploading a new
    image and saving puts the new picture in the old one's place, and
    empties the "Alternate text" box on the way ⚠ [A9](#a9). A highlight's
    image is deleted with the highlight. <sup>g</sup>
11. **Languages.** The panel's text fields are entered in each language
    ticked under "Forms" on the journal's Languages settings; the site's
    panel offers every language the site has. Only the primary language is
    required. The list shows each highlight's title in the language the
    panel is viewed in when it has one, otherwise in the primary language;
    the slide follows the visitor's language the same way, falling back to
    the primary language for any text not entered in theirs. In the French
    interface the Highlights side tab, the list's heading and the
    carousel's screen-reader heading read "En vedette"; on a press and a
    preprint server a screen reader hears the carousel's arrows by raw keys
    ⚠ [A7](#a7).
    <sup>d</sup> <sup>l</sup>
12. **The site's tab exists only on a multi-journal site.** The Site
    Settings show their "Highlights" tab (under "Site Setup") only while
    the site hosts two or more journals; a site with exactly one journal
    has no site-level highlights screen. The same rule hides the site's
    "Appearance", "Announcements" and "Plugins" tabs and the Site Setup
    side tabs "Settings", "Information", "Navigation" and "ORCID": a
    one-journal site shows only "Site Setup" with "Security", "Languages",
    "Bulk Emails" and "Statistics". The rule belongs to *Site settings*.
    <sup>c</sup>
13. **The site's home page.** The site's highlights are meant to show on
    the site's own home page, the page that lists the hosted journals; none
    has been seen there [A5](#a5). That page opens only on a site with two
    or more journals and no "Journal redirect" set (Settings that modify
    behavior); with one journal, the site address goes straight to that
    journal's home and the site's home page is never shown. <sup>k</sup>
14. **Live at once, for everyone.** A highlight is public from the moment
    it is saved: there is no draft state, no publish step, no date range
    and no per-role visibility. <sup>a</sup> <sup>m</sup>

## Side effects

- No email is sent and no notification or task is raised by adding,
  editing, reordering or deleting a highlight; nothing is written to any
  log. <sup>m</sup>
- The image is stored as a file in the journal's (or the site's) public
  files directory, replaced in place by a new upload, and deleted when it
  is removed or the highlight is deleted (Rule 10). <sup>g</sup>
- Deleting a journal deletes its highlights and their images with it
  (*Hosted journals* owns the deletion). <sup>m</sup>

## Settings that modify behavior

The feature has no setting of its own: no enable box, no count, no
placement choice. Three settings owned elsewhere change what is seen: <sup>a</sup>

- **"Theme"** (Website settings › Appearance › Theme; default "Default
  Theme", the only theme a stock install offers). The carousel, its arrows
  and dots are the default theme's. *Appearance & theming* owns the theme.
  <sup>o</sup>
- **"Journal redirect"** ("Press redirect" on a press, "Server redirect"
  on a preprint server; Site Settings › Site Setup › Settings; default
  blank, shown only on a multi-journal site). With a journal chosen, the
  site address opens that journal's home instead of the site's home page,
  the page the site's highlights belong to (Rule 13); with the blank
  choice saved again the site address opens the site's home page. *Site
  settings* owns it. <sup>k</sup>
- **"Forms"** column (Website settings › Setup › Languages; default: the
  primary language only). Each language ticked adds that language to the
  panel's "Title", "Description" and "Button Label" (Rule 11). *Languages &
  locales* owns it. <sup>d</sup>

## Cross-feature interactions

- *Site settings* owns the Site Settings page, the rule that hides its
  tabs on a one-journal site (Rule 12) and "Journal redirect" (Rule 13);
  this spec owns what the site's "Highlights" tab does.
- *Appearance & theming* owns the theme and the homepage image the
  carousel sits above (Rule 2); the carousel's look is the default theme's.
- *Hosted journals* owns creating and deleting journals; a deleted
  journal's highlights go with it (Side effects).
- *Languages & locales* owns the "Forms" languages that give the panel its
  language fields (Rule 11).
- *Announcements* is the neighbouring tab under Setup; nothing is shared:
  a highlight is not an announcement and appears in no announcement list
  or feed. <sup>a</sup>
- *Navigation menus & site chrome* owns the header and footer around the
  home page; the carousel is content between them.

## Canonical scenarios

Every scenario runs on a scratch journal with throwaway accounts, because
highlights change the home page and the seeded journal keeps its
defaults. Each scenario's accounts, seeding and the mail catcher's
address are in its footnote.

1. **Add, edit and delete a highlight**

   Given: Journal Manager, on a scratch journal with no highlights, with a
   throwaway Section Editor, Author and Reader.

   - **The empty list**: open Settings › Website › Setup › Highlights: the
     list reads "No items found." with "Order" and "Add Highlight" above
     it; in a second browser, signed out, the journal's home page carries
     no carousel (Rules 3, 5, 9).
   - **An empty save**: press "Add Highlight": the "Add Highlight" panel
     opens with "Title", "Description", "URL", "Button Label" and "Image",
     none marked required; press "Save" with nothing filled: the panel
     stays open, "Please correct 3 errors." appears under the fields above
     "Save", with the buttons "Go to Title: This field is required.", "Go
     to URL: This field is required." and "Go to Button Label: This field
     is required." and a "Jump to next error" button, "This field is
     required." sits under each of the three fields, and "Save" is grayed
     out (Fields).
   - **The first highlight**: type "Call for papers" in "Title",
     "Submissions open until June." in "Description",
     "https://example.org/cfp" in "URL" and "Read more" in "Button Label",
     leave "Image" empty and press "Save": the panel closes and "Call for
     papers" is the list's only row, with no reload; signed out, the home
     page shows the slide as the first block under the header, the
     headline "Call for papers", "Submissions open until June." and a
     "Read more" button, alone, without arrows or a dot (Rules 2, 4, 5,
     14).
   - **The second highlight, with a picture**: press "Add Highlight", type
     "Annual conference" in "Title", "Programme and registration." in
     "Description", "https://example.org/conference" in "URL" and
     "Register" in "Button Label"; drop a text file (notes.txt) in
     "Image": "notes.txt" is listed in the box with "Remove file" and
     "You can't upload files of this type." under it, "Please correct one
     error." with "Go to Image: You can't upload files of this type." and
     "Jump to next error" appear above "Save", "Save" and "Upload File"
     are grayed out, and nothing is sent; drop a PNG picture instead:
     "Please correct one error." and the message under the box are gone,
     a preview appears ("Preview of the currently selected image." is its
     description for a screen reader) with an "Alternate text" box, and
     "notes.txt" is still listed under it; type "Conference hall" in
     "Alternate text" and press "Save": "Annual conference" is the last
     row; signed out, the
     home page now has two slides, "Call for papers" first and "Annual
     conference" last, with the "Previous slide" and "Next slide" arrows
     and one dot per slide, and the second slide shows the picture with
     "Conference hall" as its description (Fields; Rules 4, 5, 10).
   - **Edit**: press "Edit" on "Annual conference": the "Edit Highlight"
     panel opens with the row's values filled in and the picture
     previewed; press "Remove": the picture is cleared; press "Restore
     Original": the picture is back; press "Remove" again,
     change "Title" to "Annual conference 2027" and press "Save": the
     panel closes and the row reads "Annual conference 2027" in place;
     signed out, the home page's second slide reads "Annual conference
     2027" and is text-only, with no picture (Fields; Rules 6, 10).
   - **Delete**: press "Delete" on "Annual conference 2027": the "Delete
     Highlight" dialog asks "Are you sure you want to delete Annual
     conference 2027? This action can not be undone." with "Yes" and
     "No"; press "No": the dialog closes and the row is still there;
     press "Delete" again, then "Yes": the row is gone and, signed out,
     the home page shows "Call for papers" alone again, without arrows or
     a dot (Rules 4, 8).
   - **Nothing else happens**: no email arrived in the mail catcher from
     these saves and deletes, and the header's Tasks panel holds no task
     (Side effects).
   - **Control**: Section Editor, Author and Reader each sign in and open
     the Website settings at the address the Journal Manager used: each
     gets the access-denied page (Actors row 1). <sup>s1</sup>

2. **Reorder the highlights**

   Given: Journal Manager, on a scratch journal with three highlights
   "First", "Second" and "Third", added in that order.

   - **Ordering mode**: on Settings › Website › Setup › Highlights press
     "Order": "Order" is replaced by "Save Order" and "Cancel", "Add
     Highlight" is grayed out, and each row's "Edit" and "Delete" give way
     to an up and a down arrow (Rule 9).
   - **The ends**: press the up arrow on "First" and the down arrow on
     "Third": nothing moves (Rule 9).
   - **A move saved**: press the up arrow on "Third" twice: the rows read
     "Third", "First", "Second"; press "Save Order": ordering mode ends,
     "Order" is back above the list and "Edit" and "Delete" on each row,
     with the rows still "Third", "First", "Second"; reload the tab: the
     same order; signed out, the home page's slides come "Third", "First",
     "Second" as "Next slide" walks them (Rules 4, 9, 9a).
   - **A new highlight after a saved order**: press "Add Highlight", type
     "Fourth" in "Title", "https://example.org/fourth" in "URL" and "Open"
     in "Button Label" and press "Save": "Fourth" is the last row, under
     "Second", and, signed out, the last slide on the home page (Rules 5,
     7).
   - **Control**: before "Save Order", signed out, the home page showed the
     slides "First", "Second", "Third", the order they were added in
     (Rules 4, 5). <sup>s2</sup>

3. **Read the carousel as a visitor**

   Given: any visitor, signed out, on a scratch journal with three
   highlights: "Call for papers" with the description "Submissions open
   until June.", the button "Read more" and the address
   "https://example.org/cfp" and no picture; "Annual conference" with a
   picture described "Conference hall", the description "Programme and
   registration." and the button "Register"; and "New book series" with no
   description and the button "Browse".

   - **The first slide**: open the journal's home page: the carousel is
     the first block under the header, showing "Call for papers",
     "Submissions open until June." and a "Read more" button, with the
     "Previous slide" and "Next slide" arrows and three dots; "Previous
     slide" is disabled (Rules 2, 4).
   - **The button**: press "Read more": the browser goes to
     "https://example.org/cfp", the address exactly as typed (Actors row
     4; Rule 4).
   - **The second slide**: press "Next slide": the slide shows the
     picture with "Conference hall" as its description, the headline
     "Annual conference", "Programme and registration." and a "Register"
     button; the second dot now shows which slide is on, and pressing a dot
     moves nothing ([A6](#a6)) (Rules 4, 10).
   - **The last slide**: press "Next slide" again: "New book series"
     shows its headline and its "Browse" button only, no description;
     "Next slide" is now disabled and "Previous slide" is not (Fields
     "Description"; Rule 4).
   - **Control**: the seeded journal's home page, on the same install,
     shows none of these three slides (Rule 1). <sup>s3</sup>

4. **Highlights in a second language**

   Given: Journal Manager, on a scratch journal that offers its visitors
   French beside English and has French ticked under "Forms" on Settings ›
   Website › Setup › Languages, with one highlight "Call for papers"
   (button "Read more") entered in English only.

   - **The two-language panel**: on Settings › Website › Setup › Highlights
     press "Add Highlight" and press the language button at the top of
     the panel: it shows the boxes "Title in French", "Description in
     French" and "Button Label in French" (Fields; Rule 11).
   - **A French-only save refused**: type "Appel à contributions" in
     "Title in French", "Lire" in "Button Label in French" and
     "https://example.org/appel" in "URL", leave "Title" and "Button
     Label" empty and press "Save": the panel stays open with "Please
     correct 2 errors." and "This field is required." under "Title" and
     under "Button Label" (Fields; Rule 11).
   - **Saved in both languages**: type "Second call" in "Title" and "Read
     on" in "Button Label" and press "Save": the panel closes and "Second
     call" is the last row (Rules 5, 11).
   - **The list in French**: open the same tab with "/fr_CA" in place of
     "/en" in its address: the side tab reads "En vedette" instead of
     "Highlights"; the rows read "Call for papers" and "Appel à
     contributions", the first in its primary-language title because it
     has no French one (Rule 11).
   - **The slides in French**: signed out, open the home page with
     "/fr_CA" in place of "/en" in its address: one slide reads "Call for
     papers" with the button "Read more", its primary-language text, and
     the other "Appel à contributions" with the button "Lire" (Rule 11).
   - **An edit emptying the primary language**: with "/en" back in the
     address, press "Edit" on "Second call", clear "Title" and press
     "Save": the panel
     stays open with "You must complete this field in English." under
     "Title" (Fields "Title").
   - **Control**: signed out, the home page in English shows "Second call"
     with the button "Read on" (Rule 11). <sup>s4</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - a file over the server's upload limit refused in the "Image" box
    (Fields): the same box's refusal scenario 1 meets with a text file,
    with a file larger than the limit
  - Escape on a plain box, a click outside the panel or leaving the page
    closing either panel with nothing saved (Rule 6)
  - ordering mode kept across a side-tab switch and dropped by a reload
    (Rule 9a)
  - a bold word in "Title" shown bold on the slide and in the "Delete
    Highlight" sentence (Fields "Title"; Rule 8)
  - Editor and Production Editor on the Highlights tab {OJS OMP} (Actors
    row 1): the same tab and panel scenario 1's Journal Manager uses
  - the Site Administrator working in the journal (Actors row 1): the
    same tab and panel
  - nothing written to any log (Side effects): the app's log is a file on
    the server, not a screen; scenario 1 reads the mail catcher and the
    Tasks panel
- **Register carries it**:
  - A1 ("Cancel" in ordering mode keeping the moved rows on screen; Rule
    9a)
  - A2 ("URL" accepting text that is not a web address; Fields)
  - A3 (a formatted title's tags printed in its row; Fields "Title")
  - A4 ("Edit Highlight" closed with its close control leaving the
    unsaved title on the row; Rule 6)
  - A6 (a dot pressed under the carousel; Rule 4; scenario 3 marks it)
  - A7 (a press's and a preprint server's carousel arrows, and the
    fourth tab across the top of Settings › Website, named by raw keys in
    the French interface; Rule 11)
  - A8 ("Save Order" on an empty list; Rule 9a)
  - A9 (the image replaced on an edit emptying "Alternate text"; Rule 10)
- **No seed**:
  - the Site Administrator adding a site highlight and any visitor seeing
    the site's carousel on the site's home page (Actors rows 2 and 3;
    Rules 12, 13): no site highlight can be saved (A5)
  - "Title" and "Button Label" entered in a second language at site scope
    (Rule 11): no site highlight can be saved (A5)
  - a one-journal site with no site "Highlights" tab (Rule 12): the
    install stops being a one-journal site once its first scratch journal
    exists
  - a theme other than the default (Settings "Theme"): a stock install
    offers "Default Theme" alone
- **Owned by another feature**:
  - the Journal Manager having no Site Settings (Actors row 2; *Site
    settings*)
  - "Journal redirect" set, the site's home page never opening (Settings;
    Rule 13; *Site settings*)
  - the home page's other blocks switched on under the carousel (Rule 2;
    *Appearance & theming*, *Announcements*)
  - a deleted journal's highlights and images going with it (Side
    effects; *Hosted journals*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-16), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | "Cancel" in ordering mode leaves the rows where the arrows moved them; only a reload shows the saved order | 🐞 | minor | — |
| [A3](#a3) | The list prints a formatted title's tags as text, while the slide and the delete dialog show the formatting | 🐞 | minor | — |
| [A4](#a4) | "Edit Highlight" closed without "Save" leaves the row showing the unsaved title until the tab is reloaded | 🐞 | minor | — |
| [A5](#a5) | The site's Highlights tab cannot save, order or list: "Save" does nothing, "Save Order" shows an error dialog, so no site highlight exists | 🐞 | user-visible | — |
| [A7](#a7) | In the French interface a press's and a server's carousel arrows read raw keys, and the fourth top tab of Settings › Website reads "##navigation.content##" | 🐞 | minor | claim check (claude), 2026-09-24 — narrowed: the tab, the list's heading and the carousel's heading now read "En vedette" |
| [A2](#a2) | "URL" accepts any text although its hint asks for a full web address, so a slide's button can point nowhere | ❓ | user-visible | — |
| [A6](#a6) | The carousel's dots do nothing when pressed and have no name for a screen reader | ❓ | minor | — |
| [A8](#a8) | "Save Order" on an empty list shows the generic "An unexpected error has occurred…" dialog | ❓ | minor | — |
| [A9](#a9) | Replacing a highlight's image on an edit empties "Alternate text", and the highlight saves without one unless it is typed again | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — "Cancel" in ordering mode keeps the moved order on screen** · 🐞 · minor.
A manager who moves rows with the arrows and then presses "Cancel" expects
the list to fall back to the saved order. Instead the list leaves ordering
mode with the rows still where the arrows put them, "Edit" and "Delete"
back on each row, while the home page and a reload of the tab show the
saved order. The manager cannot tell from the screen that nothing was
saved. Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "URL" accepts any text** · ❓ · user-visible.
The "URL" hint reads "The full URL, including https://, for the button in
the highlight.", and the profile's "Homepage URL" refuses an address
without "http://" with "Please enter a valid URL.". The highlight's "URL"
refuses nothing but emptiness: "read more" or "example.org/cfp" saves, and
the slide's button then links to that text as a path under the home page,
landing on a not-found page. Question: should the save refuse a value that
is not a full web address? Lean: yes, refuse it under the field with the
same "Please enter a valid URL." sentence; the hint already promises it.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The list prints a formatted title's tags** · 🐞 · minor.
A manager who makes a word of the "Title" bold expects the list to show it
bold, as the slide and the "Delete Highlight" sentence do. Instead the
row prints the tags as text: a title saved with one bold word reads
`<b>Bold title one</b>` in its row. Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Edit Highlight" closed without "Save" leaves the unsaved title on the row** · 🐞 · minor.
A manager who changes the title in "Edit Highlight" and closes the panel
with its close control expects the row to show the saved title. Instead
the row shows the unsaved title until the tab is reloaded, while the
highlight itself and the slide keep the saved one. The manager cannot tell
from the screen that nothing was saved. Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The site's Highlights tab cannot save, order or list** · 🐞 · user-visible.
On a site with two or more journals the Site Administrator's "Add
Highlight" panel under Site Setup › Highlights accepts the fields, but
"Save" leaves the panel open with no message; "Save Order" on the same
list shows "Error / Call to a member function getId() on null / OK"; the
list only ever reads "No items found.". Every request the site's panel
sends is refused, so no site highlight can be created and the site's home
page never shows a carousel. The journals' own tabs are unaffected.
Basis: probe. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — The carousel's dots are not buttons** · ❓ · minor.
A visitor who presses a dot under the carousel expects to move to that
slide. Pressing a dot does nothing, and a screen reader hears no name for
the dots; only the arrows move the slides. Question: should the dots move
to their slide and carry a name? Lean: yes; the dots look like the usual
slide picker, and the arrows alone make a long carousel slow to page.
Basis: probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Raw keys in the French interface** · 🐞 · minor.
In the French interface a screen reader hears a press's and a preprint
server's carousel arrows as "##plugins.themes.default.prevSlide##" /
"##plugins.themes.default.nextSlide##", where a journal's are "À la
diapositive précédente" / "À la diapositive suivante". On every app the
fourth tab across the top of Settings › Website, the page whose "Setup"
tab holds Highlights, reads "##navigation.content##". The Highlights
side tab, the list's heading and the carousel's heading read "En
vedette", and the highlight's own French text shows.
Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — "Save Order" on an empty list shows a generic error** · ❓ · minor.
With no highlights "Order" still switches the list into ordering mode, and
"Save Order" shows "Error / An unexpected error has occurred. Please reload
the page and try again. / OK"; "OK" returns the normal header. Refusing
the save is right, but the dialog is the generic one and nothing needs
reloading. Question: should "Order" be offered on an
empty list, and should the dialog say why the save was refused? Lean: gray
"Order" out while the list is empty. Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Replacing the image empties "Alternate text"** · ❓ · minor.
A manager who uploads a new picture over an existing one in "Edit
Highlight" expects the "Alternate text" to stay until changed. Instead the
box empties with the new preview, and unless the text is typed again the
highlight saves without an alternate text. Question: should the alternate
text survive a replaced picture? Lean: keep it; the emptied box is easy to
miss, and a picture without a description fails visitors on assistive
devices. Basis: probe. <sup>f-a9</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — the two panels and their shared code.** Journal scope:
`PKPManagementHandler::website()` builds `getHighlightsListPanel()` (a
`HighlightsListPanel` with a `HighlightForm`, items filtered by
`filterByContextIds([$context->getId()])`) and `templates/management/website.tpl`
mounts `<highlights-list-panel>` as the `highlights` side tab of the "Setup"
tab (label `common.highlights`, between "Announcements" and "Lists"). Site
scope: `AdminHandler::settings()` builds the same panel with
`withSiteHighlights(Collector::SITE_ONLY)` and `templates/admin/settings.tpl`
mounts it under "Site Setup" behind `$componentAvailability['highlights']`
(note c). Panel: ui-library `components/ListPanel/highlights/HighlightsListPanel.vue`
(header title, "Order"/"Save Order"/"Cancel", "Add Highlight", row "Edit"/"Delete",
`Orderer` arrows) and `HighlightsEditModal.vue` (a side modal wrapping
`PkpForm`). The panel's list request is capped at 100 highlights
(`HighlightsController::MAX_COUNT`); the home page has no cap. Shared-code
evidence: the handler, templates, controller, repository, form and both
components are byte-identical in the three checkouts at the 2026-09-16 tips
(ojs ae597ff9d9, omp 0ec98a508, ops 9ce633ee1d, one pkp-lib b262d27b81),
and the app-level `api/v1/highlights/index.php` in each app only mounts the
lib/pkp controller. No app overrides `getHighlightsListPanel()`. Nothing on either panel
offers a schedule, a toggle or a visibility choice, and the record has no such property: `lib/pkp/schemas/highlight.json`
has nine properties (`_href`, `contextId`, `description`, `id`, `image`,
`sequence`, `title`, `url`, `urlText`) and nothing else. The migration
`I9262_Highlights` dates the feature to the 3.5 line. Code read
2026-09-16. Live-probed 2026-09-16 (Purpose; Rules 5, 14), OJS, OMP and
OPS: the side tab reads "Highlights", fifth under Setup between
"Announcements" and "Lists" (fourth on OPS, whose Setup has no
"Information" tab); "Save" closes the panel by itself, the row appears
without a reload, and the slide is on the home page at once, in a second
signed-out browser too. The panels offer only the five fields and "Save".

<a id="fn-b"></a>
**b — who reaches the panels.** The Website settings page is guarded by
`CanAccessSettingsPolicy` (added in `ManagementHandler::authorize()` for the
`settings` op): a Site Administrator group, or a `ROLE_ID_MANAGER` group
with `permitSettings`. `registry/userGroups.xml`: on OJS and OMP the
manager, editor and productionEditor groups carry `permitSettings="true"`
(the roster's `editor.diana` is "Journal editor", manager level, seed-facts);
OPS ships one manager-level group (manager; its Moderator is a sub-editor).
The API (`HighlightsController::getRouteGroupMiddleware()`) admits
`ROLE_ID_MANAGER` and `ROLE_ID_SITE_ADMIN`; with no context in the request
`getSiteRoleAssignments()` keeps only `ROLE_ID_SITE_ADMIN`, so the site's
list is the administrator's alone even by address. Sub-editors, assistants,
authors, reviewers and readers have no settings op: `management/settings/website`
answers the access-denied page ("The current role does not have access to
this operation.", the shared `Handler` refusal). Code read 2026-09-16.
Live-probed 2026-09-16 (Actors rows 1–2), OJS, OMP and OPS, on a scratch
journal: its manager, editor and production editor reach the tab with
"Order" and "Add Highlight" (the manager alone on OPS, whose
`registry/userGroups.xml` installs no editor or productionEditor group);
the section editor, assistant (editorial board member on OPS), author,
reviewer and reader get the access-denied page at
`management/settings/website` and their navigation has no "Settings"; the
journal manager gets the same page at the site's settings address and at
`/index/en/admin`.

<a id="fn-c"></a>
**c — the site tab's availability.** `AdminHandler::siteSettingsAvailability()`
sets `highlights` (with `siteAppearance`, `navigationMenus`, `announcements`,
`siteTheme`, `siteInfo`, `siteConfig`, `orcidSiteSettings`) to
`app()->get('context')->getCount() !== 1`: the tab shows on a site with
no journal or with two or more, and never with exactly one. On a fleet the
seeded `publicknowledge` is alone until the first scratch context is
created (seed-facts, "The site has one registration-open journal…"). Code
read 2026-09-16. Live-probed 2026-09-16 (Rule 12), OJS, OMP and OPS: on a
fleet before its first scratch context, Site Settings showed one tab,
"Site Setup", with the side tabs "Security", "Languages", "Bulk Emails"
and "Statistics", and `admin/settings#highlights` typed directly landed on
the same four; after the first scratch context the tabs "Appearance",
"Announcements" and "Plugins" and the side tabs "Settings", "Information",
"Navigation", "Highlights" (between "Navigation" and "Bulk Emails") and
"ORCID" were there. The no-journal end (`getCount()` 0) is code only: a
fleet always has `publicknowledge`.

<a id="fn-d"></a>
**d — the panel's form.** `PKP\components\forms\highlight\HighlightForm`:
`FieldRichText` `title` (label `common.title`, multilingual),
`FieldRichTextarea` `description` (`common.description`, multilingual,
size large), `FieldText` `url` (`common.url`, description
`manager.highlights.url.description`), `FieldText` `urlText`
(`manager.highlights.urlText` "Button Label", description
`manager.highlights.urlText.description`, multilingual, size small),
`FieldUploadImage` `image` (`manager.highlights.image` "Image", upload
through the `temporaryFiles` API). The form's locales are
`$context->getSupportedFormLocaleNames()` at journal scope and the site's
`getSupportedLocaleNames()` at site scope (`HighlightForm::getLocales()`);
on the test installs the site is installed with `en,fr_CA`
(`make-test-config.js`, `installed_locales`) while `publicknowledge` and
every scratch context have only `en` under "Forms" (seed-facts), so the
journal's panel is single-language and the site's should offer English and
French. The default page's submit button is `common.save` "Save"
(`FormComponent`). Errors: `form.errorOne` / `form.errorMany`, the
`form.errorA11y` "Go to {$fieldLabel}: {$errorMessage}" buttons. Edit: the
panel pre-fills every field whose name is a key of the row's item
(`openEditModal`), and a successful edit replaces the item in the list from
the response (`formSuccess`); a successful add re-fetches the list
(`this.get()`) and the new item lands last by sequence (note i). Code read
2026-09-16. Live-probed 2026-09-16 (Fields), OJS, OMP and OPS: no field
carries a required mark (`required: false` on all five); the empty save
keeps the panel open with "Please correct 3 errors." under the fields,
above "Save", one "Go to {field}: This field is required." button per
fault, a "Jump to next error" button and "Save" disabled; the journal's
panel is single-language until French is ticked under "Forms", then
"Title", "Description" and "Button Label" gain a "Title in French" (and so
on) box hidden behind a "French" button at the top of the panel, with
"URL" and "Image" single; the site's panel offers English and the "French"
button with no tick; a French-only add is refused on the English "Title"
and "Button Label".

<a id="fn-e"></a>
**e — validation and the unchecked URL.** `Repository::validate()` runs
the schema's rules (`PKPSchemaService::getValidationRules()`), then
`ValidatorFactory::required()` for the schema's required props
(`sequence`, `title`, `url`, `urlText`): on an add a multilingual prop is
required in the primary locale with `validator.required` "This field is
required."; on an edit, an emptied primary-locale value gets
`form.requirePrimaryLocale` "You must complete this field in {$language}."
when more than one locale is allowed, `validator.required` otherwise;
`sequence` is filled by the controller before validation
(`HighlightsController::add()`, `getNextSequence()`). `url` is
`"type": "string"` with `"validation": ["nullable"]`: the schema's
`"format": "uri"` is not among the rules `addPropValidationRules()`
applies (only `type` and `validation` are), so no URL shape is checked, and
`highlights.tpl` prints `$highlight->getUrl()|escape` straight into the
button's `href`. Compare the profile form's "Homepage URL", which refuses
with "Please enter a valid URL." (the profile spec, its Fields table).
Code read 2026-09-16. Live-probed 2026-09-16 (A2; the "URL" and "Button
Label" rows), OJS, OMP and OPS: "read more" saves with no message, the
slide's button `href` is `read more` (`/index.php/{journal}/read%20more`)
and lands on "404 Not Found"; `https://example.org/cfp` and an address
with query and fragment are kept as typed; the hints print verbatim.

<a id="fn-g"></a>
**g — the image.** `FieldUploadImage` sets `acceptedFiles: 'image/*'`
and `maxFilesize` = `Application::getIntMaxFileMBs()` (PHP's
`upload_max_filesize`, 100M on the test installs); Dropzone refuses the
rest client-side, and because the PKP `form.dropzone.*` strings
(`dictInvalidFileType` "Files of this type can not be uploaded.",
`dictFileTooBig`) are passed to the field as options the Vue field never
maps onto Dropzone, Dropzone's own English defaults print: "You can't
upload files of this type." and "File is too big ({size}MiB). Max
filesize: {limit}MiB.". Labels `common.upload.addFile` "Upload File",
`form.dropzone.dictDefaultMessage` "Drop files here to upload",
`common.upload.thumbnailPreview`, `common.altText` "Alternate text",
`common.altTextInstructions` "Describe this image for visitors viewing the
site in a text-only browser…", `common.remove`, `common.upload.restore`
"Restore Original". On save `Repository::handleImageUpload()` copies the
temporary file to `<public files>/highlights/{highlightId}.{ext}`
(`copyContextFile` for a journal, `copySiteFile` for the site) and stores
`name`, `uploadName`, `dateUploaded`, `altText`; `edit()` deletes the old
file when the image is emptied or a new `temporaryFileId` arrives, and
`delete()` deletes it with the highlight. A failed copy answers
`api.400.errorUploadingImage` "There was an error uploading this image."
The slide's `<img>` uses `Highlight::getImageUrl()` (base URL + the public
files path + `highlights/{uploadName}?{timestamp}`) and
`getImageAltText()`. On the test installs the public files directory is
an absolute filesystem path (`make-test-config.js`, `public_files_dir`),
so, as with the profile image (seed-facts), the slide's image address is
that path appended to the origin and the picture never loads; a test
asserts the `<img>` element, its alternate text and the stored file, never
the rendered picture. Code read 2026-09-16. Live-probed 2026-09-16 (the
"Image" row; Rule 10; Side effects), OJS, OMP and OPS: a `.txt` and a
101 MiB file are refused in the box with the two Dropzone sentences and no
request is sent; the file lands as `public/journals/{id}/highlights/{highlightId}.png`
(OJS), `public/presses/{id}/…` (OMP), `public/contexts/{id}/…` (OPS); the
slide's `<img>` carries the typed `alt`, no width or height attributes, and
a `src` that answers 404, so the rendered size was not seen (the template
sets none); "Remove" › "Save" deletes the file and the slide is text-only;
a new upload over a PNG keeps the same file name with a new
`dateUploaded`, so whether the old file is deleted first is code only
(`edit()` deletes it when a new `temporaryFileId` arrives); the new
preview shows with an empty "Alternate text" box and the saved record's
`altText` is empty (A9); "Delete" › "Yes" removes the file. The refusal
as a form error: `FieldUpload.vue` `onError()` pushes Dropzone's message
into the field's errors (`set-errors`), which the form counts like a
validation fault (`form.errorOne`, the "Go to Image: …" button, "Save"
disabled); `onAddFile()` clears the errors when the next file is added,
and the "Upload File" button is `:disabled="!!uploadFile"`, so it grays
out from the refused drop on; Dropzone keeps the refused file's preview
entry (its name and "Remove file", `dictRemoveFile`) in the box. Code
read 2026-09-17. Test run 2026-09-17 (the "Image" row; scenario 1), OJS,
OMP and OPS, on a scratch context's "Add Highlight" panel with the four text
fields filled: after `notes.txt` the box lists "notes.txt" with "Remove
file" and "You can't upload files of this type." under it, "Upload File"
is disabled, "Please correct one error.", the button "Go to Image: You
can't upload files of this type." and "Jump to next error" sit above a
disabled "Save", and no temporary-file request was sent; after the PNG
(OJS) the preview `<img>` (its `alt` "Preview of the currently selected
image."; no printed caption), the "Alternate text" box and "Remove" show,
"notes.txt" with "Remove file" is still listed under them beside the
PNG's own entry, the summary and the field message are gone and "Save"
is enabled. On OMP the suite's scenario 1 asserts that whole shape, before
and after the PNG, and was green on its first run the same day.

<a id="fn-h"></a>
**h — deleting.** `HighlightsListPanel.vue` `openDeleteModal()`: dialog
title `manager.highlights.delete` "Delete Highlight", message
`manager.highlights.confirmDelete` with `{$title}` replaced by the
localized title, actions `common.yes` (warnable, sends `DELETE
highlights/{id}` through the POST override) and `common.no`; on success
the item is filtered out of the list. The title is a rich-text value
(note n) and the dialog renders its formatting. Code read 2026-09-16.
Live-probed 2026-09-16 (Rule 8), OJS, OMP and OPS: the dialog is titled
"Delete Highlight", its sentence prints "Bold title one" bold, not its
tags; "No" keeps the row, the file and the slide; "Yes" removes all three,
and the focus then lands on the page body, not the panel.

<a id="fn-i"></a>
**i — ordering and the Cancel defect.** `HighlightsListPanel.vue`:
`isOrdering` swaps the header buttons ("Order" → `i18nSaveOrder`
`grid.action.saveOrdering` "Save Order" + `common.cancel`) and disables
"Add Highlight" (`:disabled="isOrdering"`); the row actions show
`<Orderer>` instead of "Edit"/"Delete" (its drag handle is hidden by the
panel's CSS, leaving the up/down buttons with the screen-reader texts
`common.orderUp` / `common.orderDown`). `orderUp()` / `orderDown()` splice
the local items (no-op at the ends). `saveOrder()` numbers the items 0…n
and sends `PUT highlights/order` (`HighlightsController::order()`, which
edits each `sequence` and returns the list by `sequence` ascending). The
"Cancel" button is `@click="isOrdering = false"` and nothing else: the
locally reordered items stay on screen (A1). A new highlight gets
`getNextSequence()` = the highest saved sequence + 1, hence last (Rule 7);
`Collector::getQueryBuilder()` orders by `sequence` ascending everywhere
(panel and home page). "Save Order" on an empty list: the request is
refused (400, `api.highlights.400.noOrderData` "Highlight order could not
be saved because no ordering information was found.") and the panel shows
the generic error dialog instead (A8). Code read 2026-09-16.
Live-probed 2026-09-16 (Rules 7, 9, 9a), OJS (twice), OMP and OPS: every
clause as written; the drag handle is not visible; after "Cancel" the
rows stay moved on screen while the panel's own list request, the home
page and a reload show the saved order (A1); a side-tab switch and back
keeps "Save Order", "Cancel" and the moved rows; a reload or another
address drops them with no browser prompt; a fourth highlight added after
a saved order lands last in the list and on the home page.

<a id="fn-j"></a>
**j — the carousel.** `lib/pkp/templates/frontend/components/highlights.tpl`:
`<div class="highlights">` with a screen-reader `<h2>` `common.highlights`,
a `.swiper` with one `li.swiper-slide` per highlight (`-has-image` and
the `<img>` when `getImage()`; `h3.swiper-slide-title` =
`getLocalizedTitle()|strip_unsafe_html`; `.swiper-slide-desc` =
`getLocalizedDescription()`; `a.swiper-slide-button.pkp_button` with
`getUrl()` and `getLocalizedUrlText()`), then `.swiper-pagination`,
`button.swiper-button-prev`, `button.swiper-button-next`. Included as
`{if $highlights->count()}` (no block at all when empty) at the top of
`ojs/templates/frontend/pages/indexJournal.tpl` (after the
`Templates::Index::journal` hook, before the homepage image, categories,
description, current issue, announcements), `omp/templates/frontend/pages/index.tpl`
and `ops/templates/frontend/pages/indexServer.tpl` (same position), and of
each app's `indexSite.tpl` (before `.about_site`, the announcements and the
journals list). `PKPIndexHandler::getHighlights()` filters by the current
context's id, or `SITE_ONLY` on the site page, so the two sets never mix;
each app's `IndexHandler::index()` assigns it identically. The default
theme of each app loads Swiper (`DefaultThemePlugin.php`, `js/lib/swiper/`)
and `js/main.js` initialises `.swiper` with `navigation`, `pagination:
{type: 'bullets'}`, `autoHeight`, and a11y messages
`plugins.themes.default.prevSlide` "Previous slide" /
`plugins.themes.default.nextSlide` "Next slide" (each app's theme locale;
the OMP and OPS `fr_CA` theme locales lack both keys, A7); the three
apps' theme files are identical for this block. Code read 2026-09-16.
Live-probed 2026-09-16 (Rules 2–4; Actors row 3), OJS, OMP and OPS: the
`.highlights` block is the first child of the page block after the
header; with the optional blocks switched on the order below it is OJS
`homepage_image`, `categoryHeader`, `homepage_about` ("About the
Journal"), `cmp_announcements`; OMP the image, `homepage_about` ("About
the Press"), `cmp_announcements`; OPS the image, `cmp_announcements`,
`archiveHeader`, `homepage_latest_preprints`, `homepage_about` ("About the
Server"); with one highlight the arrows and the dot are in the page but
hidden (Swiper's `swiper-button-lock` / `swiper-pagination-lock`); with
three, "Next slide" moves 1→2→3, the current dot carries
`aria-current="true"`, "Next slide" is `aria-disabled` on the last slide
and "Previous slide" on the first, no wrap-around; the pagination is
initialised without `clickable`, so a dot press changes nothing and the
dots have no accessible name (A6); the `<h2>` "Highlights" is
`pkp_screen_reader`; `/about`, `/announcement`, `/search`, `/login`,
`/user/register` and the archive, catalog or preprints page carry no
block. The site's home page as found lists the journals with no
`.highlights` block; no site highlight could be saved (A5), so the site
carousel's position is the template's only.

<a id="fn-k"></a>
**k — the site's home page.** `PKPHandler::getTargetContext()`: with one
context the site path redirects to it; with two or more it consults the
site's redirect (`getSiteRedirectContext()`, the "Journal redirect"
setting, `admin.settings.redirect`, on the site's Settings form) and shows
the site index only when none is set; each app's `IndexHandler::index()`
follows that before rendering `indexSite.tpl`. Code read 2026-09-16.
Live-probed 2026-09-16 (Rule 13; the redirect bullet), OJS, OMP and OPS:
with one journal on the fleet `/index.php/index` landed on
`publicknowledge`'s home; with scratch contexts it opened the site index
listing the journals, with no carousel (A5, no site highlight exists); the
setting's label reads "Journal redirect" / "Press redirect" / "Server
redirect" with a blank first option selected by default; with a scratch
journal chosen and saved the site address opened that journal's home,
carousel first; with the blank option saved again it opened the site
index. The site's Settings form refuses every save until "Site Name" is
filled (empty on a fresh test install; "Test site" was typed on the three
fleets). The site-carousel leg stays unseen (A5).

<a id="fn-l"></a>
**l — language fallback.** `Highlight::getLocalizedTitle()` and friends
use `DataObject::getLocalizedData()`, which falls back to the context's
(or site's) primary locale; the panel's row uses the ui-library
`localize()` helper with the same fallback. Code read 2026-09-16.
Live-probed 2026-09-16 (Rule 11), OJS, OMP and OPS: under `/fr_CA/` the
list and the slide read "Troisième en vedette" / "Allez" for the highlight
with French text and the English title and label for the rest; under
`/en/` all English.

<a id="fn-m"></a>
**m — no side effects.** `Repository::add()`, `edit()`, `delete()` and
`HighlightsController` send no `Mailable`, create no `Notification`, and
write no event log entry; the only hooks are the generic
`Highlight::add|edit|delete`. `PKPContextService::delete()` runs
`Repo::highlight()->getCollector()->filterByContextIds([...])->deleteMany()`
when a journal is deleted, and `Repository::delete()` removes each image
file. Code read 2026-09-16. Live-probed 2026-09-16 (Side effects), OJS,
OMP and OPS: the mail catcher's newest message predates the run and the
count did not move; the header's Tasks window is empty before and after
adding, editing, reordering and deleting, and no badge appears. The log
half is a file read, not a screen: the app's own log
(`files/<app>-test/logs/app-{date}.log`) gained only the plugin gallery's
blocked fetch and the slide image's not-found entries, nothing from
highlights. Deleting a journal (Hosted Journals › "Remove" › "OK") removes
its highlights rows and image files and leaves the other journal's list
unchanged.

<a id="fn-n"></a>
**n — the rich-text boxes.** `FieldRichText.php` toolbar `bold italic
underline superscript subscript`, no plugins; `FieldRichText.vue` forces a
`<div>` root and cancels the Enter key ("Disable new line by preventing
enter key"). `FieldRichTextarea.php` toolbar `bold italic superscript
subscript | link`, plugins `['link']`. The templates print both through
`strip_unsafe_html`, so formatting survives on the slide; the panel's
row, `HighlightsListPanel.vue`'s `item-title` slot, interpolates
`localize(item.title)` as text, so the tags print (A3). The toolbar is
collapsed into one overflow button labelled "Formatting". Code read
2026-09-16. Live-probed 2026-09-16 (the "Title" and "Description" rows),
OJS, OMP and OPS: "Alpha", Enter, "Beta" leaves `<div>AlphaBeta</div>`;
"Formatting" opens Bold, Italic, Underline, Superscript, Subscript; the
"Description" toolbar shows Bold, Italic, Superscript, Subscript and
"Insert/edit link"; a bold word is bold on the slide and in the delete
dialog and `<b>…</b>` in the row.

<a id="fn-o"></a>
**o — the theme dependence.** The carousel's markup is lib/pkp's but its
behaviour (Swiper) and styling (`styles/components/swiper.less`) are the
default theme's; `highlight.json`'s description reads "may be used by a
theme to show a slider or similar highlighted items". A child theme
inherits the default theme's script; a theme that does not include
`highlights.tpl`'s host page or Swiper shows nothing or an unstyled list
(code only, no second theme installed). Code read 2026-09-16. Live-probed
2026-09-16 (the "Theme" bullet), OJS, OMP and OPS: the "Theme" select
offers "Default Theme" alone, and every Setup and Appearance side tab and
the theme's option list carry nothing named after highlights.

<a id="fn-s1"></a>
**s1 — scenario 1 seeding.** `POST scenarios/context` with `users[]`
`manager`, `sectionEditor`, `author` and `reader` (passwords: the
username twice); a fresh scratch context has no highlights and there is no
highlight seed key, so every highlight in every scenario is added through
the panel (the kept claim-check scripts under
`shared/playwright/checks/U11/` drive the panel and the home page on the
three apps). The picture is `apps/ojs/playwright/fixtures/files/profile-image-400.png`,
the refused file any `.txt` (the suites write `notes.txt`). The slide's picture never loads on the test
installs (note g), so the suite asserts the slide's `<img>` with its
alternate text and the stored file under the public files directory,
never the rendered picture. Signed-out reads run in a second browser
context. Mail is read in the mail catcher (Mailpit, `http://127.0.0.1:8025`);
the absence is read against a positive control the test sends the same
way (scenarios.md "Mailpit"); the Tasks panel is the header's. The access-denied page is `management/settings/website` on
the scratch context (note b).

<a id="fn-s2"></a>
**s2 — scenario 2 seeding.** As s1 with the `manager` alone; the three
highlights ("First", "Second", "Third", each with a URL and a button
label) are added through the panel in that order. The home page's order
is read from the slides' headlines in document order (note j's
`li.swiper-slide` list) and by pressing "Next slide"; the tab's order
after a reload from the rows.

<a id="fn-s3"></a>
**s3 — scenario 3 seeding.** As s1 with the `manager` alone; the three
highlights are added through the panel in the given's order, the picture
as s1, with "https://example.org/conference" and
"https://example.org/books" as the second and third addresses. The
button's address is asserted from the link (`href`, note e), since the
test installs reach no outside address. The control reads the seeded
journal `publicknowledge`'s home page signed out.

<a id="fn-s4"></a>
**s4 — scenario 4 seeding.** `POST scenarios/context` with
`context.supportedLocales: ['en', 'fr_CA']` (French under "UI" only,
seed-facts), `context.supportedFormLocales: ['en', 'fr_CA']` (French
under "Forms" too; scenarios.md "POST scenarios/context") and the
`manager`. The English-only highlight is added through the panel after
the seed. The French pages are the `/fr_CA/` addresses (note l).

<a id="fn-f-a1"></a>
**f-a1 — A1 evidence.** `HighlightsListPanel.vue`, the "Cancel" button in
the header's ordering state: `@click="isOrdering = false"`; `orderUp()` /
`orderDown()` commit each move to the shared `items` through
`setItems()` (`$emit('set', …)`), and no copy of the pre-ordering list is
kept, so nothing restores it. Compare the funders table, whose ordering
mode restores the saved order on cancel. Code read 2026-09-16.
Live-probed 2026-09-16, OJS (twice), OMP and OPS: after "Cancel" the rows
stay moved with "Edit" and "Delete" back and no message, while the home
page and a reload of the tab show the saved order.

<a id="fn-f-a2"></a>
**f-a2 — A2 evidence.** `lib/pkp/schemas/highlight.json` `url`:
`"type": "string", "format": "uri", "validation": ["nullable"]`;
`PKPSchemaService::addPropValidationRules()` builds rules from `type` and
`validation` only; `Repository::validate()` adds no rule of its own. The
profile's `user.json` `url` carries `"validation": ["nullable", "url"]`
(the "Please enter a valid URL." refusal). Code read 2026-09-16.
Live-probed 2026-09-16, OJS, OMP and OPS: "read more" saves, the button's
link is `read more` under the journal's address and lands on "404 Not
Found".

<a id="fn-f-a3"></a>
**f-a3 — A3 evidence.** `HighlightsListPanel.vue` renders the row's name
through the `item-title` slot as `{{ localize(item.title) }}`, a text
interpolation that escapes the stored HTML, while the delete dialog's
message and `highlights.tpl` render it. Live-probed 2026-09-16, OJS, OMP
and OPS: a title saved as `<b>Bold title one</b>` reads that way in the
row and bold on the slide and in the "Delete Highlight" sentence.

<a id="fn-f-a4"></a>
**f-a4 — A4 evidence.** Live-probed 2026-09-16, OJS (twice), OMP and OPS:
"Edit" › the title changed to "Changed but not saved" › the panel's close
control: no dialog, the row reads "Changed but not saved", the panel
reopened after a reload shows the old title; the panel's own list request
still returns the saved title.

<a id="fn-f-a5"></a>
**f-a5 — A5 evidence.** At the 2026-09-16 tips (pkp-lib b262d27b81) every
request the site's panel sends to `index/api/v1/highlights` (list, add,
order) answers 500 from the `has.roles` middleware: `HasRoles::handle()`'s
role matcher calls `$context->getId()` for the manager role although a
site-level request carries no context. Live-probed 2026-09-16, OJS (three
runs), OMP and OPS: "Save" leaves the "Add Highlight" panel open with no
status and no error text; "Save Order" shows "Error / Call to a member
function getId() on null / OK"; the site's list reads "No items found."
and the database holds no highlight without a context. The journals'
panels, whose requests carry the journal, are unaffected.

<a id="fn-f-a6"></a>
**f-a6 — A6 evidence.** The default theme's `js/main.js` initialises
`pagination: {type: 'bullets'}` without `clickable`, so Swiper renders the
dots as plain `<span>`s with no role or name. Live-probed 2026-09-16, OJS,
OMP and OPS: pressing the first or third dot leaves the active slide
unchanged; `aria-label` and `role` are empty on every dot; the current one
carries `aria-current="true"`.

<a id="fn-f-a7"></a>
**f-a7 — A7 evidence.** OMP's and OPS's default-theme `fr_CA` locale
lack `plugins.themes.default.prevSlide|nextSlide`, which OJS's carries;
`lib/pkp/locale/fr_CA/common.po` has no `navigation.content` entry.
Live-probed 2026-09-16, OJS, OMP and OPS: under `/fr_CA/` the side tab,
the panel's heading and the carousel's `<h2>` read
"##common.highlights##", the fourth top tab "##navigation.content##",
and the arrows' `aria-label` the raw theme keys on OMP and OPS. lib/pkp
`25182919bf` (the `translations/stable-3_5_0` merge) added
`common.highlights` "En vedette" and changed `manager.highlights.add`
from "Ajouter un clou" to "Mettre en vedette". Live-probed 2026-09-24 at
ojs `71bb244152`, omp `a36551804`, ops `07141ae4df` (lib/pkp
`25182919bf`), OJS, OMP and OPS, on a scratch journal with English and
French under "UI" and "Forms": under `/fr_CA/` the side tab and the
panel's heading "En vedette", the header's buttons "Classer" and "Mettre
en vedette", the add panel headed "Mettre en vedette" and the edit panel
"Modifier la mise en vedette", the delete dialog still titled
"Supprimer le clou"; the carousel's `<h2>` "En vedette", and the site's
Site Setup tab "En vedette"; the fourth top tab still
`##navigation.content##`; the arrows' `aria-label` "À la diapositive
précédente" / "À la diapositive suivante" on OJS and the raw theme keys
on OMP and OPS.

<a id="fn-f-a8"></a>
**f-a8 — A8 evidence.** `HighlightsController::order()` answers 400 with
`api.highlights.400.noOrderData` when no ordering arrives, and the panel's
`saveOrder()` hands any failed response to the shared `ajaxError` mixin,
which shows the `common.error` / `common.unknownError` dialog whatever the
response said. Live-probed 2026-09-16, OJS, OMP and OPS: on an empty
scratch list "Order" flips the header to "Save Order" / "Cancel"; "Save
Order" sends the request, which is refused, and the dialog "Error / An
unexpected error has occurred. Please reload the page and try again. / OK"
appears; "OK" returns the normal header.

<a id="fn-f-a9"></a>
**f-a9 — A9 evidence.** Live-probed 2026-09-16, OJS, OMP and OPS: "Edit"
on a highlight with an image and an alternate text, a new PNG dropped in
the box: the new preview shows with "Remove" and "Restore Original" and an
empty "Alternate text" box; after "Save" the stored `altText` is empty. `FieldUploadImage.vue`
watches its value and sets the box to the new value's `altText` whenever
the value changes; a fresh upload's value has none, so the box empties.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Journal's Highlights panel: "Order" / "Save Order" / "Cancel" | Settings › Website › Setup › Highlights | AFFM-037 |
| "Add Highlight" (side panel) | the same tab | AFFM-038 · VUE-097 |
| Row "Edit" | the same tab | AFFM-039 |
| Row "Delete" (confirm dialog) | the same tab | AFFM-040 |
| Site's Highlights panel (same controls, site scope) | Administration › Site Settings › Site Setup › Highlights (multi-journal site only) | AFFM-219 |
| Home-page carousel: slide button, "Previous slide" / "Next slide", dots | the journal's home page; the site's home page | AFFR-017 |
| Highlights API | `highlights` (list, get, add, edit, delete) and `highlights/order` at journal or site scope; the single-item `get` passes the context object where an id is expected and is not called by the panel | API-022 |
| Highlight record shape | — | SET-015 |

## Reference — code anchors

- `lib/pkp/api/v1/highlights/HighlightsController.php` — the six
  operations, the manager/administrator role gate, `MAX_COUNT`;
  `<app>/api/v1/highlights/index.php` mounts it.
- `lib/pkp/classes/highlight/Highlight.php`, `Repository.php`, `DAO.php`,
  `Collector.php`, `maps/Schema.php` — the record, validation, image
  storage and deletion, ordering; `lib/pkp/schemas/highlight.json` — the
  shape; `lib/pkp/classes/migration/install/HighlightsMigration.php`.
- `lib/pkp/classes/components/forms/highlight/HighlightForm.php` — the
  panel's form; `lib/pkp/classes/components/listPanels/HighlightsListPanel.php`
  — the panel's server-side config and its strings.
- `lib/pkp/pages/management/ManagementHandler.php`
  (`getHighlightsListPanel()`, `website()`),
  `lib/pkp/templates/management/website.tpl` — the journal's tab;
  `lib/pkp/pages/admin/AdminHandler.php` (`getHighlightsListPanel()`,
  `siteSettingsAvailability()`), `lib/pkp/templates/admin/settings.tpl` —
  the site's tab.
- `lib/ui-library/src/components/ListPanel/highlights/HighlightsListPanel.vue`,
  `HighlightsEditModal.vue`; `components/Orderer/Orderer.vue`;
  `components/Form/fields/FieldUploadImage.vue`, `FieldRichText.vue`.
- `lib/pkp/pages/index/PKPIndexHandler.php` (`getHighlights()`),
  `<app>/pages/index/IndexHandler.php`;
  `lib/pkp/templates/frontend/components/highlights.tpl`;
  `ojs/templates/frontend/pages/indexJournal.tpl`,
  `omp/templates/frontend/pages/index.tpl`,
  `ops/templates/frontend/pages/indexServer.tpl`, each app's
  `indexSite.tpl`.
- `<app>/plugins/themes/default/DefaultThemePlugin.php` (Swiper,
  `getSwiperI18n()`), `js/main.js`, `styles/components/swiper.less`.
- `lib/pkp/classes/services/PKPContextService.php` (`delete()`) — the
  journal-deletion cascade.
- Strings: `lib/pkp/locale/en/manager.po` (`manager.highlights.*`),
  `common.po` (`common.highlights`, `common.order`, `common.orderUp`,
  `common.orderDown`, `common.altText`, `common.upload.*`),
  `grid.po` (`grid.action.saveOrdering`), `api.po` (`api.highlights.*`),
  `<app>/plugins/themes/default/locale/en/locale.po`
  (`plugins.themes.default.prevSlide|nextSlide`).
