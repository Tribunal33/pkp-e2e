---
name: media-files
status: verified
---

# Media files

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

An article's full text often shows figures, videos or a style sheet of
its own. Media files are those pieces, kept with the publication instead
of inside one galley: the production team uploads them once on the
version's "Media" page, gives each its name and its details (caption,
credit, copyright), and pairs a figure's web-resolution copy with its
high-resolution original. When a reader of a journal or press opens an
HTML galley of the same version, every image or style sheet the HTML
names by file name is shown from the web-resolution media file of that
name ⚠ [OPS1](#ops1). The high-resolution
original is kept for the record and never shown in the page. This spec
describes the "Media" page, its four windows, and what readers see.
<sup>a</sup> <sup>m</sup>

## Actors & permissions

Everything happens on the publication's **"Media" page**: workflow ›
side menu › "Publication" ("Preprint" on a preprint server) › the
version › "Media". Who is offered the page at all is the workflow
screen's rule
([→ the Publication tabs](U24-workflow-screen-and-stage-access.md#publication-tabs)):
editorial roles whose role reaches Production (on a press, every
editorial role that reaches the Publication pages), and the Author on
their own submission. **Manage the media files** means the whole set:
"Add Media File", "Batch Link Media", and the row menu's "Edit
Metadata", "Manually Link Media" and "Delete File". The page offers the
set by the person's role on the submission's Production stage: a role
counts when the person is assigned to the submission in it and the
role's stages include Production (Settings bullet 5); the Journal
Manager, Editor, Production Editor and Site Administrator count without
an assignment. **May edit the publication** is the publication's edit
gate ([→ edit gate](U40-publication-metadata.md#edit-gate)): every
change the page sends is checked against it, whatever the page offered.
<sup>a</sup> <sup>b</sup> <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the "Media" page and its list** | • everyone the side menu offers the page. They all see the same list (Fields), and pressing a file name downloads the file for each of them, the Author included <sup>a</sup> <sup>d</sup> <sup>q1</sup><br>• on a press, the exception: the roles that see the list outside Production (next row, last bullet). Pressing a file name opens a new tab showing a line of raw text that holds "The current role does not have access to this operation.", and no file arrives ⚠ [OMP2](#omp2) <sup>q3</sup> |
| **Manage the media files** ("Add Media File", "Batch Link Media", "Edit Metadata", "Manually Link Media", "Delete File") | • the Journal Manager, Editor, Production Editor and Site Administrator: always, on any version, published ones included (Rules 8, 10) <sup>b</sup> <sup>c</sup> <sup>q4</sup><br>• an assigned Section Editor or Guest Editor (Series Editor on a press, Moderator on a preprint server), and on a journal or press an assigned Layout Editor, Designer, Indexer or Proofreader: offered the whole set. Their changes hold only while their assignment carries the "Permissions" box (Settings bullet 4). Without it, the install default for the Guest Editor and the four assistant roles, every change fails and nothing changes: "Save" in "Edit Metadata" without a word, the others with an "Error" window (Rule 7) ⚠ [A1](#a1) <sup>b</sup> <sup>c</sup> <sup>q2</sup><br>• the Author: never. Their list has no "Batch Link Media", no "Add Media File" and no "…" button <sup>b</sup> <sup>q1</sup><br>• on a press, the Funding Coordinator while the monograph is in review, and the Copyeditor or Marketing and Sales Coordinator while it is in copyediting, see the list alone, as the Author does. In any other stage, Production included, their "Publication" heading has nothing under it <sup>b</sup> <sup>q3</sup> |
| **"More Information"** (row menu) | • the roles offered "Manage the media files", on every row. The window it opens is *[Submission files](U36-submission-files.md#more-information)*'; for the assistant roles its "History" tab keeps showing "Loading" ⚠ [→ Submission files A3](U36-submission-files.md#a3) <sup>r</sup> <sup>q24</sup> |

## Fields & validation

<a id="media-page"></a>
**The "Media" page.** Under the page heading ("Publication: Media",
"Preprint: Media" on a preprint server) sits one table titled "Media
Files" with the line "Upload media files in bulk, including
high-resolution versions. After uploading, link each file to its web or
high resolution counterpart by clicking Manually Link Media from the
More Actions dropdown, or use Batch Link Media to link multiple files at
once." Above the table, for those who manage the media files, are
"Batch Link Media" and "Add Media File". A list with no file shows the
single line "No Items". <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **ID** | — | An icon for the file's kind and a number. Two linked files (Rule 3) share one cell spanning both rows, holding the pair's number; a file with no counterpart shows a number of its own ⚠ [A2](#a2). <sup>d</sup> <sup>q12</sup> |
| **File Name** | — | The file's "Name of the file" (Rule 4), as a link that downloads the file (a new, empty tab opens for it); the one exception, on a press, is in Actors row 1 [OMP2](#omp2). <sup>d</sup> <sup>q1</sup> |
| **Type** | — | The file's media type as a badge, such as "Image". A high-resolution file has a second badge, "High resolution". <sup>d</sup> |
| **Size** | — | The file's size. <sup>d</sup> |
| **Date uploaded** | — | The day the file was added. <sup>d</sup> |
| **More Actions** | — | The "…" button at the end of the row, which opens the row menu: "More Information", "Edit Metadata", "Manually Link Media" and "Delete File" (in red), as Actors offers them. "Manually Link Media" is offered only on a file whose media type supports web and high-resolution versions ("Image" by default; Settings bullet 2). A row with nothing to offer has no button. <sup>d</sup> |

<a id="upload-window"></a>
**The "Upload Media File" window.** "Add Media File" opens a window
titled "Upload Media File" with the line "Upload image or multimedia
files in bulk. You can manually adjust or link files later if needed."
and, under the heading "Upload File", a drop area reading "Drag and drop
files here.", "or" and the link "Click to upload files". While no
file is on the window, a screen reader also finds a button "Drop files
here to upload" that nothing on screen shows ⚠ [A3](#a3). Each file
dropped or chosen gets a card with its name and size, a red "Remove"
button (an ×), a progress bar while it uploads, and then the two lists
below (Rule 2). If no component is marked as a dependent file, the
window holds only the line "No media types are configured. Please
contact the system administrator." (Rule 2e). <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **What kind of media is this? (Required)** | Yes | Help: "Select a media type from the dropdown." Lists the journal's components marked as dependent files (Settings bullet 1): "Multimedia", "Image" and "HTML Stylesheet" on a new journal or preprint server, "Image" and "HTML Stylesheet" on a new press. Starts empty. <sup>e</sup> <sup>q5</sup> |
| **File resolution type (Required)** | Yes | Help: "Select a file resolution from the dropdown." "Web resolution" or "High resolution"; starts on "Web resolution". Greyed out unless the chosen media type supports both versions (Settings bullet 2) (Rule 2a). <sup>e</sup> <sup>q5</sup> |
| **Upload Files** | — | Shown once a file is on the window. Greyed out until every file has finished uploading, has a media type and shows no error (Rule 2). <sup>e</sup> <sup>q5</sup> |

<a id="metadata-window"></a>
**The "Edit Metadata" window.** A row's "Edit Metadata" opens a window
titled "Edit Metadata". Which fields it holds depends on the file's
media type, through the component's "File Metadata" (Settings bullet 3):
"Artwork" ("Image" by default) adds the four artwork fields, "Supplementary
Content" (no media type by default) adds the eight supplementary fields,
and "Document" ("Multimedia" and "HTML Stylesheet" by default) adds
none. Each field arrives holding the file's current value. <sup>f</sup>
<sup>q13</sup> <sup>q26</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Name of the file** | Yes | Help: "(e.g., Manuscript; Table 1)". Starts with the uploaded file's own name. Empty, "Save" is refused with "This field is required." under the box (Rule 4a). What the name does for readers is in Side effects. <sup>f</sup> <sup>q13</sup> |
| **Caption**, **Credit**, **Copyright Owner**, **Permission Terms** | No | "Artwork" only. Multi-line text boxes. <sup>f</sup> |
| **Description**, **Creator (or owner) of file**, **Publisher**, **Source**, **Subject**, **Contributor or sponsoring agency**, **Date**, **Language** | No | "Supplementary Content" only. "Date" is a date picker. <sup>f</sup> <sup>q26</sup> |
| **Save** / **Cancel** | — | "Save" stores the fields and closes the window (Rule 4); "Cancel" closes it (Rule 6). <sup>f</sup> |

<a id="manual-link-window"></a>
**The "Manually Link Media" window.** A row's "Manually Link Media"
opens a window titled "Manually Link Media". <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| **Selected File** | — | The row's file name, greyed out. <sup>g</sup> |
| **Select the media file to link as its counterpart** | — | Help: "Only one file can be linked. The file types must differ (web <> high-res)." The files it offers are in Rule 3a; its last entry is "No high-resolution file" on a web-resolution row, "No web version file" on a high-resolution row. <sup>g</sup> <sup>q9</sup> |
| **Link Media** / **Cancel** | — | "Link Media" saves the choice and closes the window (Rule 3a); "Cancel" closes it (Rule 6). <sup>g</sup> |

<a id="batch-link-window"></a>
**The "Batch Link Media" window.** "Batch Link Media" opens a window
titled "Batch Link Media" with the line "Link web version media files to
their high-resolution counterparts. Select a high-resolution file for
each web version below." It holds a table with the columns "Selected Web
Version" (a web-resolution file's name) and "Link High-Resolution
Version" (a list per row, Rule 3b), then "Cancel" (in red) and "Link
Media". <sup>h</sup> <sup>q11</sup>

**The delete dialog.** Titled "Delete media file?", with the text "Are
you sure you want to delete "{file name}"? This action cannot be undone.
If this file is linked to other media, those links will be removed."
(the name in bold) and the buttons "OK" and "Cancel" (Rule 5). <sup>j</sup>
<sup>q14</sup>

**The unsaved-changes dialog.** Titled "Warning", with the text "The
data on this form has changed. Do you wish to continue without saving?"
and the buttons "Yes" and "No" (Rule 6). <sup>k</sup> <sup>q7</sup>

## Rules & state

1. **What a media file is.** A media file belongs to one version of the
   publication, not to a galley. It has a name, a media type (one of the
   journal's components marked as dependent files, Settings bullet 1)
   and a resolution, "Web resolution" or "High resolution". The "Media"
   page lists the media files of the version chosen in the side menu,
   the newest first (files added by one "Upload Files" in no fixed order
   among themselves), a linked pair together at the place of its newer
   file, its web-resolution file first. A media file never shows on a stage's file
   lists or under an HTML galley's "Dependent Files"
   ([→ dependent files](U36-submission-files.md#dependent-files)).
   <sup>d</sup> <sup>q12</sup>
<a id="add"></a>
2. **Adding media files.** "Add Media File" opens "Upload Media File"
   (Fields). Dropping files on the drop area, or pressing anywhere on it
   ("Click to upload files" included) and choosing them, puts each on
   the window as a card; it uploads at once, with its progress bar and
   percentage, and then shows the two lists. "Upload Files" adds every file on the window,
   closes it, and the list shows one row per file: named after the
   uploaded file's own name, with its media type, its size and today's
   date, and the "High resolution" badge on a high-resolution one. Each
   new file stands alone, linked to nothing (Rule 3). Each file added
   also leaves a warning in the server's log, which nothing on screen
   shows ⚠ [A6](#a6). <sup>e</sup> <sup>q5</sup>
   - 2a. **The resolution list.** It is choosable only while the chosen
     media type supports both versions ("Image" by default); for any
     other media type it is greyed out on "Web resolution". Choosing
     such a media type after "High resolution" was chosen sets it back
     to "Web resolution". <sup>e</sup> <sup>q5</sup>
   - 2b. **"Remove"** on a card takes that file off the window; it is
     not added. <sup>e</sup>
   - 2c. **A failed upload** (a file larger than the install accepts)
     shows "Invalid JSON response from server." on its card instead of
     the lists ⚠ [A4](#a4), and "Upload Files" stays greyed out until
     the card is removed. <sup>e</sup> <sup>q28</sup>
   - 2d. **Closing with files on the window.** The window's "Close"
     with at least one card on it opens the unsaved-changes dialog
     (Fields): "Yes" closes the window and adds nothing, "No" keeps it
     open with its cards. Leaving or reloading the page with a card on
     the window first asks the browser's own "Leave site?" question;
     leaving adds nothing. <sup>k</sup> <sup>q7</sup>
   - 2e. **No media types.** When no component is marked as a dependent
     file (Settings bullet 1), the window shows "No media types are
     configured. Please contact the system administrator." instead of
     the drop area, and nothing can be added. <sup>e</sup> <sup>q8</sup>
   - 2f. **Any file is accepted.** The window does not check the file's
     kind against the media type: a text file can be added as an
     "Image". <sup>e</sup> <sup>q6</sup>
<a id="link"></a>
3. **Linking a web-resolution file to its high-resolution original.**
   A web-resolution file and a high-resolution file of the same media
   type can be linked as counterparts. A file has at most one
   counterpart, and only a media type that supports both versions
   ("Image" by default, Settings bullet 2) can be linked at all. A
   linked pair shows as two rows sharing one "ID" cell, the
   web-resolution file first (Fields, ID). <sup>i</sup> <sup>q9</sup>
   - 3a. **"Manually Link Media".** From a web-resolution row the list
     offers the high-resolution files of the same media type that are
     not linked to another file, then "No high-resolution file"; from a
     high-resolution row, the web-resolution files of the same media
     type not linked to another file, then "No web version file". It
     opens on the file's current counterpart, or on the "No …" entry
     when it has none. "Link Media" closes the window and the list shows
     the two as a pair. Choosing the "No …" entry and pressing "Link
     Media" unlinks the file: both rows then show a number of their own.
     A file already linked can be linked to another one from its own
     row: the earlier pair ends and its other file stands alone.
     <sup>g</sup> <sup>i</sup> <sup>q9</sup>
   - 3b. **"Batch Link Media".** The table has one row per
     web-resolution file of a media type that supports both versions.
     Each row's list offers the high-resolution files of the same media
     type not chosen in another row, then "No high-resolution file", and
     opens on the row's current counterpart. Choosing a file in one row
     takes it off the other rows' lists. "Link Media" saves every row at
     once and closes the window: each choice becomes a pair, and a row
     left on "No high-resolution file" is unlinked. With no
     web-resolution file the table holds the single line "No Items" and
     "Link Media" is greyed out. <sup>h</sup> <sup>i</sup> <sup>q11</sup>
   - 3c. **Linking copies the shared details.** When two files are
     linked, the details a pair shares (the artwork and supplementary
     fields of Fields, never the name) are copied from the file the link
     was made from onto its counterpart: the row whose "Manually Link
     Media" was used, or the web-resolution file in "Batch Link Media".
     A detail the first file leaves empty is not copied. <sup>i</sup>
     <sup>q10</sup>
<a id="edit"></a>
4. **Editing a file's details.** "Edit Metadata" opens the window of
   Fields. "Save" stores the fields, closes the window, and the row
   shows the new name. <sup>f</sup> <sup>q13</sup>
   - 4a. **The name is required.** With "Name of the file" emptied,
     "Save" shows "This field is required." under the box and the window
     stays open. <sup>f</sup> <sup>q13</sup>
   - 4b. **A linked file's shared details.** Saving a linked file's
     details saves the shared details (Rule 3c) on its counterpart too;
     each file keeps its own name. <sup>i</sup> <sup>q13</sup>
<a id="delete"></a>
5. **Deleting a file.** A row's "Delete File" opens the delete dialog
   (Fields). "OK" closes it and removes the row. When the file had a
   counterpart, that file stays and stands alone, with a number of its
   own. "Cancel" closes the dialog and changes nothing. <sup>j</sup>
   <sup>q14</sup>
6. **Leaving a window with unsaved changes.** In "Edit Metadata",
   "Manually Link Media" and "Batch Link Media", after a field or list
   was changed, the window's "Close" and its own "Cancel" first open the
   unsaved-changes dialog (Fields). "Yes" closes the window and saves
   nothing; "No" keeps it open with the change. Without a change both
   close at once. Leaving the page (another address, a reload) while
   "Edit Metadata" holds an unsaved change first asks the browser's own
   "Leave site?" question; with no change, or with no window open, it
   does not. While a window is open, the side menu behind it cannot be
   pressed. <sup>k</sup> <sup>q15</sup>
   - 6a. **A name left with "Yes".** When the change in "Edit Metadata"
     included a new "Name of the file", "Yes" still saves nothing, but
     the file's row in the list shows the typed name, and "Edit Metadata"
     opened again arrives holding it. A reload of the page brings back
     the saved name ⚠ [A5](#a5). <sup>f-a5</sup>
7. **A refused change.** When the edit gate refuses a change (Actors),
   pressing "Upload Files", "Link Media" or the delete dialog's "OK"
   opens a window titled "Error" reading "You are not allowed to edit
   this publication." with "OK". Pressing "Save" in "Edit Metadata"
   opens nothing: the window stays open with the new value and no
   message. The list stays as it was ⚠ [A1](#a1). <sup>c</sup>
   <sup>s</sup> <sup>q2</sup>
8. **Publishing changes nothing on this page.** Once the version is
   published (posted, on a preprint server), the list, its buttons and
   every row action stay as they were for everyone Actors names, and
   changes still save. They reach signed-in readers at once (Side
   effects). <sup>c</sup> <sup>q16</sup>
<a id="versions"></a>
9. **A new version starts with copies of the media files.** "Create New
   Version"
   ([→ Publish, schedule & versions](U49-publish-schedule-and-versions.md),
   its Rule 11) gives the new version a copy of each media file with the
   same name, media type, resolution, details and pairs. Each copy is
   then edited, relinked or deleted on the new version's "Media" page
   without touching the earlier version's list, and deleting either one
   leaves the other's file downloading from its name. <sup>l</sup>
   <sup>q17</sup>
10. **The stage does not matter.** The page, its list and every action
    are the same whichever stage the submission is on; media files can
    be added while the article is still in Review, by whoever Actors
    offers them to. <sup>b</sup> <sup>q23</sup>
11. **The page in French.** With the interface in French, parts of the
    page and its windows read raw codes where French words belong
    ⚠ [A7](#a7):
    - on the page: the table's title and line, "Batch Link Media", "Add
      Media File" and the "More Actions" column heading;
    - in "Upload Media File": the title, the line and "Click to upload
      files";
    - in "Batch Link Media": every text but the file names and "Cancel";
    - the row menu's "Manually Link Media", and every text of its window
      but the file name and "Cancel";
    - in "Edit Metadata": "Name of the file" and its help;
    - in the delete dialog: the title and the text.

    The other column headings, the row menu's other entries, the other
    fields of "Edit Metadata" and the "Cancel" and "OK" buttons read
    French. The side menu's "Media" and the page heading are the
    workflow screen's
    ([→ Workflow screen & stage access A11](U24-workflow-screen-and-stage-access.md#a11)).
    <sup>f-a7</sup>

## Side effects

- **What readers see on a journal or press.** Once the version is
  published, an HTML galley of that version that names a file, such as an image
  written as `figure.png` or a style sheet `article.css`, is shown with
  the media file whose "Name of the file" is that name. Only a
  web-resolution file is used; a high-resolution file is never shown in
  the page. Renaming a media file (Rule 4) stops the old name from
  finding it. Which galleys a reader is offered, and the page that shows
  them, are *[Galleys](U46-galleys.md)*' and *Article landing page &
  reading*'s. <sup>m</sup> <sup>q18</sup>
  - On a press the same holds for an HTML file of one of the version's
    publication formats, opened from the book's page. <sup>m</sup>
    <sup>q19</sup>
  - On a journal, a dependent file of the galley's own HTML file with
    the same name wins over the media file ([→ dependent
    files](U36-submission-files.md#dependent-files)). <sup>m</sup>
    <sup>q18</sup>
  - On a journal, a signed-in reader always gets the current page. A
    reader who is not signed in gets the page as it was first shown to
    anyone not signed in, for up to a day: a media file added, renamed
    or deleted after that reaches them only once the day is over
    ⚠ [OJS1](#ojs1). <sup>m</sup> <sup>q29</sup>
- **On a preprint server nothing reaches readers.** An HTML galley's
  link on the preprint's page downloads the HTML file itself; no page
  shows it, so the preprint's media files are shown nowhere ⚠ [OPS1](#ops1). <sup>n</sup> <sup>q20</sup>
- **Activity Log.** Adding a media file writes the same lines as any
  file upload, into the submission's Activity Log and into the file's
  "More Information" history
  ([→ Submission files](U36-submission-files.md#more-information)). Each
  "Edit Metadata" save adds "The metadata for file "{file name}" was
  edited by {username}." to both. A link made from a file's "Manually
  Link Media" adds that line once for that file and twice for its
  counterpart, in the Activity Log and in each file's history; an
  unlink adds it once for each of the two files. Deleting a file writes
  'A file "{file name}" was deleted for submission {number} by
  {username}.' into the Activity Log. <sup>o</sup> <sup>q21</sup>
- **No email, no notice.** Adding, linking, editing or deleting a media
  file sends no email and raises no notice or task. <sup>o</sup>
  <sup>q22</sup>

## Settings that modify behavior

1. **The component's "File Type" box "These are dependent files, such
   as images displayed by a HTML file, and will not be displayed with
   published content."** (Settings › Workflow › Submission ›
   "Components", a component's "Edit"; *Submission intake
   configuration*). Ticked at install for "Multimedia", "Image" and
   "HTML Stylesheet" on a journal or preprint server, and for "Image"
   and "HTML Stylesheet" on a press. The ticked components are the media
   types "What kind of media is this?" offers (Fields). Unticked on every
   component, the "Upload Media File" window adds nothing (Rule 2e).
   <sup>p</sup> <sup>q8</sup>
2. **The component's "File Variants" box "These files support file
   variants types, such as 'web' or 'high resolution' images."** (the
   same window). Ticked at install for "Image" alone. Ticked on another
   media type, such as "Multimedia": its files can be added as "High
   resolution" (Rule 2a), its rows offer "Manually Link Media", and its
   web-resolution files join "Batch Link Media" (Rule 3); a pair still
   links only files of the same media type. <sup>p</sup> <sup>q25</sup>
3. **The component's "File Metadata"** (the same window): "Document",
   "Artwork" or "Supplementary Content". At install "Image" is
   "Artwork" and "Multimedia" and "HTML Stylesheet" are "Document".
   It decides the fields of "Edit Metadata" (Fields); set to
   "Supplementary Content" on "Multimedia", that window shows the eight
   supplementary fields for a Multimedia file. <sup>p</sup> <sup>q26</sup>
4. **"Permit submission metadata edit."** (Settings › Users & Roles ›
   Roles, a role's "Edit") and the assignment's "Permissions" box it
   pre-ticks ([→ the two boxes](U35-stage-participants.md#boxes)). At
   install on for Section Editor and Moderator, off for Guest Editor and
   the assistant roles. Ticked for an assigned Layout Editor, their
   changes on the "Media" page hold; unticked, each fails as Rule 7
   describes (Actors). <sup>c</sup> <sup>q2</sup>
5. **A role's stages** (Settings › Users & Roles › Roles, a role's
   "Edit", "Stage Assignment"). A role whose stages include Production
   is offered "Manage the media files" once assigned; which roles reach
   the "Media" page is *[Workflow screen & stage
   access](U24-workflow-screen-and-stage-access.md#publication-tabs)*'.
   At install the Section Editor (Series Editor on a press), the Guest
   Editor (on a journal), the Layout Editor, Designer, Indexer and
   Proofreader reach Production (the Moderator on a preprint server).
   <sup>b</sup> On a press, a role without Production sees the list
   alone while the monograph is in one of that role's own stages
   (Actors). <sup>q3</sup>
6. **{OJS OMP} The "HTML Article Galley" plugin ("HTML Monograph File"
   on a press)** (Settings › Website › "Plugins"). On at install. Off,
   a journal's HTML galley link downloads the HTML file instead of
   showing a page, so none of the media files are shown; on
   a press, opening a book's HTML file from the book page shows a blank
   page ⚠ [OMP1](#omp1). <sup>m</sup> <sup>q27</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)**:
  who is offered the "Media" page, and the page heading and frame.
- **[Publication metadata](U40-publication-metadata.md#edit-gate)**: the
  edit gate every change on the page is checked against (Actors).
- **[Stage participants](U35-stage-participants.md#boxes)**: the
  assignment's "Permissions" box (Settings bullet 4).
- **[Submission files](U36-submission-files.md)**: the "More
  Information" window (its Rule 13), the "Dependent Files" of an HTML
  file (its Rule 11), and the upload lines of the Activity Log (its Side
  effects).
- **[Galleys](U46-galleys.md#galleys-page)**: the HTML galleys whose
  pages show the media files (Side effects).
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  publishing, and "Create New Version", whose copies Rule 9 describes.
- **[Submission activity log & notes](U38-submission-activity-log-and-notes.md)**:
  the Activity Log that holds the lines of Side effects.
- **[Submission intake configuration](U58-submission-intake-configuration.md)**:
  the "Components" list whose boxes Settings bullets 1 to 3 describe.
- **[Languages & locales](U57-languages-and-locales.md#a4)**: why a text
  the French translation lacks shows as a raw code (Rule 11).
- **[JATS & Body Text](U48-jats-and-body-text.md)**: the "Body Text" page of a
  journal's side menu, and the images added there.
- **[Article landing page & reading](U13-article-landing-page-and-reading.md)**:
  the reader's page that shows an HTML galley, and the "HTML Article Galley"
  plugin.

## Canonical scenarios

Scenarios 1 and 2 run on the seeded journal, press and preprint server
with ready accounts, the others on a scratch journal, press or preprint
server with throwaway accounts. The footnote holds accounts, passwords,
mail catcher's address and tooling recipe. <sup>t</sup>

1. **Add media files**

   Given: Journal Manager, on a scratch article with no media file that
   is still in Review (a scratch preprint in Production, on a preprint
   server).

   - **An empty page, the article still in Review**: open the article's
     workflow, then side menu "Publication" ("Preprint" on a preprint
     server) › the version › "Media": the page is headed "Publication:
     Media" ("Preprint: Media"), its one table is titled "Media Files"
     with the line "Upload media files in bulk, including
     high-resolution versions. After uploading, link each file to its
     web or high resolution counterpart by clicking Manually Link Media
     from the More Actions dropdown, or use Batch Link Media to link
     multiple files at once.", "Batch Link Media" and "Add Media File"
     sit above it, and the list reads "No Items" (Fields, the "Media"
     page; Rule 10).
   - **"Batch Link Media" with no web-resolution file**: press "Batch
     Link Media": a window titled "Batch Link Media" holds a table
     reading "No Items", and "Link Media" is greyed out. Press its
     "Cancel": the window closes at once (Rules 3b, 6).
   - **The "Upload Media File" window**: press "Add Media File": a
     window titled "Upload Media File" shows the line "Upload image or
     multimedia files in bulk. You can manually adjust or link files
     later if needed.", the heading "Upload File" and a drop area reading
     "Drag and drop files here.", "or" and "Click to upload files"; there
     is no "Upload Files" button (Fields, the upload window;
     [A3](#a3)).
   - **A card**: press "Click to upload files" and choose "figure.png": a
     card shows "figure.png", its size and a red "Remove" button. Once
     the file has uploaded, the card shows "What kind of media is this?
     (Required)" with nothing chosen and "File resolution type
     (Required)" on "Web resolution", greyed out, and "Upload Files"
     shows, greyed out (Fields; Rule 2).
   - **The resolution list**: choose "Image" in "What kind of media is
     this?": "File resolution type" can now be chosen. Choose "High
     resolution", then choose "Multimedia" ("HTML Stylesheet" on a
     press) as the media type: "File resolution type" is back on "Web
     resolution", greyed out (Rule 2a).
   - **"Close" with a card on the window**: press the window's "Close":
     a dialog titled "Warning" asks "The data on this form has changed.
     Do you wish to continue without saving?" with "Yes" and "No". Press
     "No": the window stays open with its card. Press "Close" again,
     then "Yes": the window closes and the list still reads "No Items"
     (Rule 2d).
   - **Four cards and a "Remove"**: press "Add Media File" again and
     choose "figure.png", "profile-image-400.png", "not-an-image.txt"
     and "replacement.pdf": four cards show. Press "Remove" on the
     "replacement.pdf" card: the card goes (Rule 2b). Choose "Image" and
     "Web resolution" on "figure.png", "Image" and "High resolution" on
     "profile-image-400.png"; while "not-an-image.txt" has no media type,
     "Upload Files" stays greyed out. Choose "HTML Stylesheet" on
     "not-an-image.txt" (Fields, Upload Files).
   - **The new rows**: press "Upload Files": the window closes and the
     list shows three rows, "figure.png" with "Image",
     "profile-image-400.png" with "Image" and "High resolution", and
     "not-an-image.txt" with "HTML Stylesheet", each with its size,
     today's date and an "ID" of its own; there is no "replacement.pdf"
     (Rule 2).
   - **The file name**: press "figure.png": a new, empty tab opens and
     the browser downloads the file (Fields, File Name).
   - **The Activity Log**: open the workflow header's "Activity Log": it
     holds a line naming each of the three files for its upload, the
     lines any uploaded file adds (see *[Submission
     files](U36-submission-files.md)*) (Side effects).
   - **Control**: the "not-an-image.txt" row's "…" button offers "More
     Information", "Edit Metadata" and "Delete File", with no "Manually
     Link Media", while the "figure.png" row's also offers "Manually
     Link Media" (Fields, More Actions). <sup>t</sup>

2. **Link a web image to its high-resolution original**

   Given: Journal Manager, on a scratch article in Production that
   carries four unlinked "Image" media files, "fig1-web.png" and
   "fig2-web.png" at "Web resolution" and "fig1-high.png" and
   "fig2-high.png" at "High resolution".

   - **Captions on three files**: open the article's workflow, then
     side menu "Publication" ("Preprint" on a preprint server) › the
     version › "Media". On the "fig1-web.png" row press "…" › "Edit
     Metadata", type "Web caption" in "Caption" and press "Save"; do the
     same with "High caption" on "fig1-high.png" and with "Batch
     caption" on "fig2-web.png" (Rule 4). Open the workflow header's
     "Activity Log", count the lines "The metadata for file …" naming
     "fig1-web.png" and those naming "fig1-high.png", and close it.
   - **"Manually Link Media" from a high-resolution row**: on the
     "fig1-high.png" row press "…" › "Manually Link Media": a window
     titled "Manually Link Media" shows "Selected File" reading
     "fig1-high.png", greyed out, and "Select the media file to link as
     its counterpart" with the help "Only one file can be linked. The
     file types must differ (web <> high-res).", set to "No web version
     file" and offering "fig1-web.png" and "fig2-web.png", then "No web
     version file" (Fields, the "Manually Link Media" window; Rule 3a).
   - **"Cancel" with a change**: choose "fig1-web.png" and press
     "Cancel": the "Warning" dialog asks "The data on this form has
     changed. Do you wish to continue without saving?". Press "No": the
     window stays open with "fig1-web.png" chosen (Rule 6).
   - **The link**: press "Link Media": the window closes, and
     "fig1-web.png" and "fig1-high.png" show as two rows sharing one
     "ID" cell, "fig1-web.png" first (Rules 3, 3a).
   - **The details copied from the file the link was made from**: open
     "fig1-web.png"'s "Edit Metadata": "Caption" reads "High caption".
     Press "Cancel": the window closes at once (Rules 3c, 6).
   - **The Activity Log after the link**: open the workflow header's
     "Activity Log": it holds "The metadata for file "fig1-high.png" was
     edited by {username}." once more than before the link, and "The
     metadata for file "fig1-web.png" was edited by {username}." twice
     more (Side effects).
   - **A web row's list**: on the "fig2-web.png" row press "…" ›
     "Manually Link Media": the list is set to "No high-resolution file"
     and offers "fig2-high.png" alone, then "No high-resolution file"
     (Rule 3a). Press "Cancel": the window closes at once (Rule 6).
   - **Relinking ends the earlier pair**: on the "fig1-web.png" row
     press "…" › "Manually Link Media": the list is set to
     "fig1-high.png". Choose "fig2-high.png" and press "Link Media":
     "fig1-web.png" and "fig2-high.png" share one "ID" cell, and
     "fig1-high.png" shows a number of its own (Rule 3a).
   - **Unlinking**: count the Activity Log's "The metadata for file …"
     lines naming "fig1-web.png" and those naming "fig2-high.png". On
     the "fig1-web.png" row open "Manually Link Media" again, choose "No
     high-resolution file" and press "Link Media": "fig1-web.png" and
     "fig2-high.png" each show a number of their own (Rule 3a), and the
     Activity Log holds one more line for each of the two files (Side
     effects).
   - **"Batch Link Media"**: press "Batch Link Media": a window titled
     "Batch Link Media" shows the line "Link web version media files to
     their high-resolution counterparts. Select a high-resolution file
     for each web version below." and a table with the columns "Selected
     Web Version" and "Link High-Resolution Version", one row for
     "fig1-web.png" and one for "fig2-web.png", each list set to "No
     high-resolution file" and offering "fig1-high.png" and
     "fig2-high.png", then "No high-resolution file". Choose
     "fig1-high.png" in the "fig1-web.png" row: the "fig2-web.png" row's
     list no longer offers it. Choose "fig2-high.png" in the
     "fig2-web.png" row and press "Link Media": the window closes and the
     list shows two pairs, each sharing one "ID" cell, the web file
     first (Fields, the "Batch Link Media" window; Rule 3b).
   - **The web file's details copied in a batch link**: open
     "fig2-high.png"'s "Edit Metadata": "Caption" reads "Batch caption"
     (Rule 3c). Press "Cancel".
   - **One row unlinked**: press "Batch Link Media" again: the
     "fig1-web.png" row is set to "fig1-high.png" and the "fig2-web.png"
     row to "fig2-high.png". Set the "fig2-web.png" row to "No
     high-resolution file" and press "Link Media": "fig2-web.png" and
     "fig2-high.png" each show a number of their own, while
     "fig1-web.png" and "fig1-high.png" still share one cell (Rule 3b).
   - **Control**: "fig1-high.png"'s "Edit Metadata" still holds
     "fig1-high.png" in "Name of the file": linking never copies the name
     (Rule 3c). <sup>t</sup>

3. **Edit and delete media files**

   Given: Journal Manager, on a scratch journal, with a scratch article
   in Production that carries a linked pair of "Image" media files,
   "figure.png" at "Web resolution" and "figure-large.png" at "High
   resolution", and an "HTML Stylesheet" file "article.css".

   - **"Edit Metadata" on an image**: open the article's workflow and
     note the Tasks bell's number, then side menu "Publication"
     ("Preprint" on a preprint server) › the version › "Media", and on the "figure.png" row press "…" › "Edit
     Metadata": a window titled "Edit Metadata" holds "Name of the file"
     with the help "(e.g., Manuscript; Table 1)", reading "figure.png",
     then "Caption", "Credit", "Copyright Owner" and "Permission Terms",
     each empty (Fields, the "Edit Metadata" window).
   - **An empty name**: clear "Name of the file" and press "Save": "This
     field is required." shows under the box and the window stays open
     (Rule 4a).
   - **Leaving the window with a change**: type "figure-1.png" in "Name
     of the file" and "Figure 1" in "Caption", then press the window's
     "Close": the "Warning" dialog asks "The data on this form has
     changed. Do you wish to continue without saving?". Press "No": the
     window stays open with both values. Press "Cancel": the dialog
     asks again; press "Yes": the window closes. Reload the page and
     open "figure.png"'s "Edit Metadata" again: "Name of the file" reads
     "figure.png" and "Caption" is empty (Rules 6, 6a; [A5](#a5)).
   - **"Save"**: type "figure-1.png" in "Name of the file" and "Figure
     1" in "Caption" and press "Save": the window closes and the row
     reads "figure-1.png" (Rule 4).
   - **The counterpart's shared details**: open "figure-large.png"'s
     "Edit Metadata": "Caption" reads "Figure 1" and "Name of the file"
     still reads "figure-large.png". Type "Photo: Ana Silva" in "Credit"
     and press "Save". Open "figure-1.png"'s "Edit Metadata": "Credit"
     reads "Photo: Ana Silva" and "Name of the file" still reads
     "figure-1.png" (Rule 4b). Press "Cancel".
   - **A stylesheet's window**: open "article.css"'s "Edit Metadata": it
     holds "Name of the file" alone (Fields, the "Edit Metadata"
     window). Press "Cancel".
   - **"More Information"**: on the "figure-1.png" row press "…" › "More
     Information": the file's window opens, and its "History" tab lists
     "The metadata for file "figure-1.png" was edited by {username}."
     (Actors row 3; Side effects). Close it.
   - **"Delete File", then "Cancel"**: on the "figure-large.png" row
     press "…" › "Delete File": a dialog titled "Delete media file?"
     asks "Are you sure you want to delete "figure-large.png"? This
     action cannot be undone. If this file is linked to other media,
     those links will be removed." with "OK" and "Cancel". Press
     "Cancel": the dialog closes and the row stays, still paired with
     "figure-1.png" (Rule 5).
   - **"Delete File", then "OK"**: press "Delete File" on
     "figure-large.png" again, then "OK": the row goes, and
     "figure-1.png" stays, with a number of its own (Rule 5).
   - **The Activity Log**: open the workflow header's "Activity Log": it
     holds "The metadata for file "figure-1.png" was edited by
     {username}." and 'A file "figure-large.png" was deleted for
     submission {number} by {username}.' (Side effects).
   - **No email, no notice**: the mail catcher holds no email to the
     scratch journal's accounts from any of these actions, and the Tasks
     bell's number is unchanged (Side effects).
   - **Leaving the page with a change**: open "figure-1.png"'s "Edit
     Metadata", type "Draft credit" in "Credit", then type the journal's
     home page address in the browser's address bar: the browser first
     asks its own "Leave site?" question. Leave (Rule 6).
   - **Control**: open the article's "Media" page again and, with no
     window open, type the home page address: the browser leaves at
     once, without asking (Rule 6). <sup>t</sup>

4. **An assigned Section Editor and Layout Editor, and the Author**

   Given: a Section Editor and, on a journal or press, a Layout Editor
   whose role has "Permit submission metadata edit." ticked, both
   assigned to a scratch article in Production on a scratch journal with
   the assignment's "Permissions" box ticked, and the article's Author;
   the article carries an "Image" media file "figure.png" at "Web
   resolution".

   - **The Section Editor**: open the article's workflow, then side menu
     "Publication" ("Preprint" on a preprint server) › the version ›
     "Media": "Batch Link Media" and "Add Media File" sit above the list,
     and the "figure.png" row's "…" button offers "More Information",
     "Edit Metadata", "Manually Link Media" and "Delete File". Press "Add
     Media File", choose "profile-image-400.png", "Image" and "High
     resolution", and press "Upload Files": the row
     "profile-image-400.png" appears with "High resolution" (Actors row
     2).
   - **The Layout Editor** {OJS OMP}: the Layout Editor opens the same
     page: the same two buttons and the same row menu. On the
     "figure.png" row press "…" › "Manually Link Media", choose
     "profile-image-400.png" and press "Link Media": the two rows share
     one "ID" cell, "figure.png" first (Actors row 2; Settings bullet 4).
   - **The Author**: the Author opens the article with "View" on My
     Submissions, then side menu "Publication" › the version › "Media":
     the list shows "figure.png" and "profile-image-400.png" (as a pair,
     on a journal or press), with no "Batch Link Media", no "Add Media
     File" and no "…" button on any row (Actors rows 1–2).
   - **The Author's download**: press "figure.png": a new, empty tab
     opens and the browser downloads the file (Actors row 1; Fields,
     File Name).
   - **Control**: the Section Editor's page, opened the same way, showed
     "Batch Link Media", "Add Media File" and each row's "…" button
     (Actors row 2). <sup>t</sup>

   On a preprint server there is no Layout Editor; the Section Editor's
   steps are the scenario there.

5. **A published version's media files and a new version**

   Given: Journal Manager, on a scratch journal, with a published
   scratch article (a posted preprint) that carries a linked pair of
   "Image" media files, "figure.png" at "Web resolution" and
   "figure-large.png" at "High resolution", and a lone "Image" file
   "extra.png" at "Web resolution".

   - **The published version's page**: open the article's workflow, then
     side menu "Publication" ("Preprint" on a preprint server) › the
     published version › "Media": "Batch Link Media" and "Add Media File"
     sit above the list, and each row's "…" button offers "More
     Information", "Edit Metadata", "Manually Link Media" and "Delete
     File" (Rule 8).
   - **A change on the published version**: on the "figure.png" row
     press "…" › "Edit Metadata", type "Figure 1" in "Caption" and press
     "Save": the window closes; opened again, "Caption" reads "Figure 1"
     (Rule 8).
   - **The new version's copies**: press "Create New Version" in the
     side menu and confirm the dialog unchanged (see *[Publish, schedule
     & versions](U49-publish-schedule-and-versions.md)*, scenario 4).
     The new version's "Media" page (side menu › the new version ›
     "Media") lists "figure.png" and "figure-large.png" sharing one "ID"
     cell, "figure-large.png" with "High resolution", and "extra.png",
     each with "Image"; "figure.png"'s "Edit Metadata" holds "Figure 1"
     in "Caption" (Rule 9).
   - **Changing the copies**: on the new version, rename "figure.png"
     to "figure-v2.png" in its "Edit Metadata" and press "Save"; on
     "figure-large.png" open "Manually Link Media", choose "No web
     version file" and press "Link Media"; on "extra.png" press "Delete
     File", then "OK": the list shows "figure-v2.png" and
     "figure-large.png", each with a number of its own, and no
     "extra.png" (Rules 3a, 5, 9).
   - **The earlier version untouched**: choose the published version in
     the side menu, then "Media": it still lists "figure.png" and
     "figure-large.png" sharing one "ID" cell, and "extra.png" (Rule 9).
   - **Control**: on the published version press "extra.png": a new,
     empty tab opens and the browser downloads the file, though its copy
     on the new version was deleted (Rule 9). <sup>t</sup>

6. **A component with file variants and supplementary details**

   Given: Journal Manager, on a scratch journal whose "Multimedia"
   component ("HTML Stylesheet" on a press) has "File Variants" ticked
   and "File Metadata" set to "Supplementary Content", with a scratch
   article in Production that carries two unlinked media files,
   "clip-web.pdf", a "Multimedia" file ("HTML Stylesheet") at "Web
   resolution", and "figure-large.png", an "Image" at "High
   resolution".

   - **"High resolution" for "Multimedia"**: open the article's
     workflow, then side menu "Publication" ("Preprint" on a preprint
     server) › the version › "Media". Press "Add Media File", press
     "Click to upload files" and choose "not-an-image.txt", then choose
     "Multimedia" ("HTML Stylesheet") in "What kind of media is this?":
     "File resolution type" can be chosen. Choose "High resolution" and
     press "Upload Files": the row "not-an-image.txt" reads "Multimedia"
     ("HTML Stylesheet") with "High resolution" (Settings bullet 2;
     Rule 2a).
   - **"Manually Link Media" on a "Multimedia" row**: the "clip-web.pdf"
     row's "…" button offers "Manually Link Media"; its list offers
     "not-an-image.txt", then "No high-resolution file", and not
     "figure-large.png". Press "Cancel" (Settings bullet 2; Rule 3a).
   - **"Batch Link Media"**: press "Batch Link Media": the table has one
     row, "clip-web.pdf", its list offering "not-an-image.txt", then "No
     high-resolution file", and not "figure-large.png". Choose
     "not-an-image.txt" and press "Link Media": "clip-web.pdf" and
     "not-an-image.txt" share one "ID" cell, "clip-web.pdf" first
     (Settings bullet 2; Rule 3b).
   - **Supplementary details**: open "clip-web.pdf"'s "Edit Metadata": it
     holds "Name of the file", then "Description", "Creator (or owner) of
     file", "Publisher", "Source", "Subject", "Contributor or sponsoring
     agency", "Date" (a date picker) and "Language". Type "Interview
     recording" in "Description", set "Date" to 15 January 2026 and
     press "Save". Opened again, "Description" reads "Interview
     recording" and "Date" holds 15 January 2026 (Settings bullet 3;
     Fields, the "Edit Metadata" window).
   - **Control**: "figure-large.png"'s "Edit Metadata" holds "Caption",
     "Credit", "Copyright Owner" and "Permission Terms", and none of the
     eight fields above (Settings bullet 3). <sup>t</sup>

7. **What readers see** {OJS OMP}

   Given: Journal Manager and a Reader, on a scratch journal, with a
   published scratch article whose HTML galley "HTML" shows an image
   named "figure.png" (on a press, a published monograph whose
   publication format "HTML" has an HTML file that shows it), and one
   media file, an "Image" named "figure.png" at "High resolution".

   - **A high-resolution file alone**: the Reader, signed in, opens the
     published article's page on the journal's public site and its
     "HTML" galley link (on a press, the book's page and its "HTML"
     link): the page shows the HTML, and the image "figure.png" does not
     load (Side effects).
   - **A web-resolution file added on the published version**: the
     Journal Manager opens the article's workflow, then side menu
     "Publication" › the published version › "Media", presses "Add Media
     File", chooses "figure.png", "Image" and "Web resolution", and
     presses "Upload Files": a second row "figure.png" appears, without
     "High resolution" (Rules 2, 8).
   - **The reader, at once**: the Reader reloads the page: the image
     "figure.png" shows (Rule 8; Side effects).
   - **A rename**: the Journal Manager renames the web-resolution
     "figure.png" to "figure-web.png" in its "Edit Metadata" and presses
     "Save". The Reader reloads the page: the image no longer loads (Side
     effects).
   - **Control**: the Journal Manager renames "figure-web.png" back to
     "figure.png"; the Reader reloads the page: the image shows again
     (Side effects). <sup>t</sup>

   On a preprint server an HTML galley's link downloads the HTML file
   and no page shows it, so no media file reaches readers
   [OPS1](#ops1); the scenario has no analogue there.

8. **The press roles outside Production** {OMP}

   Given: a Funding Coordinator, a Copyeditor and a Marketing and Sales
   Coordinator, each assigned to two scratch monographs on a scratch
   press that carry the media file "figure.png", one in External Review
   and one in Copyediting.

   - **The Funding Coordinator, in External Review**: open the monograph
     in External Review, then side menu "Publication" › the version ›
     "Media": the list shows "figure.png" as a link, with no "Batch Link
     Media", no "Add Media File" and no "…" button (Actors rows 1–2;
     [OMP2](#omp2)).
   - **The Copyeditor, in Copyediting**: the Copyeditor opens the
     monograph in Copyediting the same way: the list shows "figure.png"
     alone, with no buttons and no "…" button (Actors row 2).
   - **The Marketing and Sales Coordinator, in Copyediting**: the same
     page, the same list alone (Actors row 2).
   - **Control**: the Copyeditor opens the monograph in External Review:
     its side menu's "Publication" heading has nothing under it (Actors
     row 2). <sup>t</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A1 (Actors row 2; Rule 7; issue report
    `docs/issues/U47-A1-media-actions-offered-without-permissions.md`):
    an assigned Layout Editor without "Permissions" shown the "Media"
    list without its write actions, and an editor still offered every
    action
  - the guard for A5 (Rule 6a; scenario 3 reloads before reopening the
    window; issue report
    `docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md`):
    a file's name changed in "Edit Metadata" and left with "Yes", the
    row and the reopened window holding the saved name, and the next
    "Save" of another box keeping it
- **Rarely met**:
  - no component marked as a dependent file, where "Upload Media File"
    holds only "No media types are configured. Please contact the
    system administrator." and nothing can be added (Rule 2e; Settings
    bullet 1)
- **Nothing new to test**:
  - any file accepted as any media type, such as a text file added as
    an "Image" (Rule 2f)
  - the Editor and the Production Editor, offered what the Journal
    Manager of scenarios 1 to 3 is (Actors row 2)
  - a Site Administrator not assigned to the submission, offered what
    the Journal Manager of scenarios 1 to 3 is (Actors row 2)
- **Register carries it**:
  - A3 (the "Drop files here to upload" button only a screen reader
    finds; Fields, the upload window; scenario 1 passes it)
  - A4 (a file over the upload limit failing on its card; Rule 2c)
  - A6 (the warning each added file leaves in the server's log; Rule 2)
  - A7 (raw codes on the page, its windows and the delete dialog with
    the interface in French; Rule 11)
  - OJS1 (a reader who is not signed in sees a media change up to a day
    late; Side effects)
  - OPS1 (a preprint server's HTML galley link downloads the file, so
    no media file reaches readers; Side effects)
  - OMP1 ("HTML Monograph File" off, a book's HTML file opening as a
    blank page; Settings bullet 6)
  - OMP2 (a press role outside Production pressing a file name gets a
    refusal instead of the file; Actors row 1; scenario 8 passes the
    link without pressing it)
- **Owned by another feature**:
  - "More Information"'s "History" tab kept on "Loading" for the
    assistant roles (Actors row 3; *[Submission
    files](U36-submission-files.md)*, scenario 6)
  - a role whose stages do not include Production, offered no "Media"
    page (Settings bullet 5; *[Workflow screen & stage
    access](U24-workflow-screen-and-stage-access.md)*, scenario 4)
  - {OJS} "HTML Article Galley" off, the galley link downloading the
    HTML file (Settings bullet 6; *Article landing page & reading*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A Layout Editor, or anyone without "Permissions", is offered every "Media" action, and the server refuses each change | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A3](#a3) | The empty "Upload Media File" window lists a button "Drop files here to upload" for screen readers that nothing on screen shows | 🐞 | minor | — |
| [A4](#a4) | A file over the request size limit fails with a server error; its card reads "The POST data is too large." | 🐞 | medium · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A5](#a5) | A name typed in "Edit Metadata" and left with "Yes" shows in the list, unsaved, until a reload | 🐞 | medium | issues (claude), 2026-09-30 — re-verified |
| [A6](#a6) | Each media file added leaves a warning in the server's log | 🐞 | invisible | — |
| [A7](#a7) | In French the "Media" page, its windows and the delete dialog show raw codes such as "##publication.mediaFiles.add##" | 🐞 | minor | — |
| [OMP1](#omp1) | With "HTML Monograph File" off, a book's HTML file opens as a blank page | 🐞 | critical · crash: both | issues (claude), 2026-09-30 — re-verified |
| [OMP2](#omp2) | On a press, a role that sees the list outside Production cannot download its files: the tab shows a refusal | 🐞 | user-visible | — |
| [A2](#a2) | The "ID" column shows a pair's number for linked files and another kind of number for the rest | ❓ | minor | — |
| [OJS1](#ojs1) | A reader who is not signed in sees a media change on an HTML galley up to a day late | ❓ | user-visible | — |
| [OPS1](#ops1) | A preprint server offers the "Media" page, but no reader page shows its files | ❓ | user-visible | — |

### All apps
<a id="a1"></a>
**A1 — A Layout Editor, or anyone without "Permissions", is offered every "Media" action, and the server refuses each change** · 🐞 · medium.
A participant whose assignment on a submission in Production has
"Permissions" unticked sees "Add Media File", "Batch Link Media" and the
full row menu on the version's "Media" page (the version's images and
multimedia files). Every change they try is refused. "Upload Files",
"Link Media" and "OK" in the delete dialog each open a dialog titled
"Error" that reads "You are not allowed to edit this publication.".
"Save" in "Edit Metadata" shows "An unexpected error has occurred.
Please reload the page and try again." and leaves the window open.
Nothing is saved.
This report takes the server's rule as the intended one. The
"Permissions" box on the assignment decides who may change the
publication, its media included, so these participants should not be
offered the changes. Whether they should be allowed to make them is a
product decision (Proposed fix, Alternatives).
"Permissions" is unticked by default for the Layout Editor, Designer,
Indexer and Proofreader, and in OJS also for the Guest Editor. So the
roles that usually prepare production files meet this unless an editor
ticks the box for them. The "Media" page is new on `main` and not yet
in a release.
Basis: probe, 2026-09-30. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The "ID" column mixes two kinds of number** · ❓ · minor.
The "ID" cell of a linked pair shows the pair's number; the cell of a
file with no counterpart shows the number of its stored file. A file's
number changes each time it is linked or unlinked, and a pair linked
again gets a new number. The same list can also show two unrelated rows
with the same number.
Question: should the column show one kind of number throughout? Lean:
yes; show each file's own number, and show the pairing by the shared
cell alone.
Basis: probe, 2026-09-24 (the changing numbers); code (two rows with
one number). <sup>f-a2</sup>

<a id="a3"></a>
**A3 — The empty upload window offers screen readers a button nobody sees** · 🐞 · minor.
While no file is on "Upload Media File", a screen reader lists a
button "Drop files here to upload" that has nothing visible behind it:
a sighted user sees only the drop area and "Click to upload files". The
button goes once a file is on the window. A screen-reader user is
offered a control the page does not show.
Basis: probe, 2026-09-24. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A file over the request size limit fails with a server error** · 🐞 · medium · crash: server.
A file larger than the server takes in one request (PHP's
`post_max_size`) fails on the server: its card on "Upload Media File"
reads "The POST data is too large." instead of the app's own size
message with the limit, and nothing is stored. The user learns that the
file is too large, in English whatever the site's language, but not how
large a file may be. Smaller files on the same window upload normally.
The window checks no size in the browser below Dropzone's own 256 MiB.
Same fault: [Submission files' A21](U36-submission-files.md#a21).
Basis: probe, 2026-09-30. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A name left with "Yes" shows in the list, unsaved** · 🐞 · medium.
A user types a new "Name of the file" in "Edit Metadata", then leaves
the window with "Close" or "Cancel" and "Yes" in the "Warning" dialog
("continue without saving"). Nothing is saved, yet the file's row in
the list shows the typed name, and "Edit Metadata" opened again arrives
holding it. The next "Save" in that window, made only to set another
box such as "Caption", stores the abandoned name. Until then only a
reload of the page shows the saved name again. The same fault as
[Institutions' A2](U66-institutions.md#a2).
Basis: probe, 2026-09-30 (OJS, OMP and OPS). <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Each media file added leaves a warning in the server's log** · 🐞 · invisible.
Every file "Upload Files" adds writes a PHP warning ("foreach()
argument must be of type array|object, string given") to the web
server's error log. The file is added normally; no screen shows it.
Basis: test run, 2026-09-25. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — In French the "Media" page and its windows show raw codes** · 🐞 · minor.
With the interface in French, the "Media" page and the windows it opens
read raw codes where French words belong, on a journal, a press and a
preprint server:
- the page: the table's title "##publication.mediaFiles##", its line
  "##publication.mediaFiles.description##" and the "More Actions" column
  heading "##common.moreActions##", which the Author sees too; for those
  who manage the media files, "Batch Link Media" and "Add Media File"
  read "##publication.mediaFiles.batchLinkMedia##" and
  "##publication.mediaFiles.add##";
- "Upload Media File": the title "##publication.mediaFiles.upload##",
  the line "##publication.mediaFiles.upload.description##" and the link
  "##common.clickToUploadFiles##";
- "Batch Link Media": the title
  "##publication.mediaFiles.batchLinkMedia##", the line
  "##publication.mediaFiles.batchLinkMedia.description##", the columns
  "##publication.mediaFiles.selectedWebVersion##" and
  "##publication.mediaFiles.linkHighResolutionVersion##", each row's
  list (a screen reader names it
  "##publication.mediaFiles.selectHighResolutionFor##"; unlinked, it
  shows "##publication.mediaFiles.noHighResolutionFile##") and the button
  "##publication.mediaFiles.linkMedia##";
- "Manually Link Media": the row menu entry and the window's title
  "##publication.mediaFiles.manuallyLinkMedia##", then the labels
  "Selected File" "##common.selectedFile##" and "Select the media file
  to link as its counterpart"
  "##publication.mediaFiles.selectMediaFileToLink##" with the help
  "##publication.mediaFiles.selectMediaFileToLink.description##", its
  entry "##publication.mediaFiles.noHighResolutionFile##" and the button
  "##publication.mediaFiles.linkMedia##";
- "Edit Metadata": "Name of the file" reads
  "##publication.mediaFiles.metadataName##", its help
  "##publication.mediaFiles.metadataNameDescription##";
- the delete dialog: the title "##publication.mediaFiles.delete##" and
  the text "##publication.mediaFiles.confirmDelete##", above "OK" and
  "Annuler".

Expected: French words, as the rest of the page shows (the other column
headings, the row menu's "Information détaillée", "Éditer les
métadonnées" and "Supprimer le fichier", the other fields of "Éditer
les métadonnées", "Annuler"); the English screen shows none of these
codes. A French-speaking Production Editor has to guess what each
button and window does, and the delete dialog does not name the file it
deletes. The side menu's "Media" and the page heading are [Workflow
screen & stage access](U24-workflow-screen-and-stage-access.md#a11)'s,
and why a missing French text shows as a code at all is [Languages &
locales](U57-languages-and-locales.md#a4)'.
Basis: probe, 2026-09-30. <sup>f-a7</sup>

### OJS
<a id="ojs1"></a>
**OJS1 — Media changes reach readers who are not signed in up to a day late** · ❓ · user-visible.
A reader who is not signed in gets an HTML galley as it was first shown
to anyone not signed in, for up to a day. A media file added, renamed
or deleted on the "Media" page in that time does not reach them: an
image fixed on the "Media" page stays broken for them, while a
signed-in reader already sees it. Nothing on the "Media" page says so.
Question: should a change on the "Media" page reach every reader at
once? Lean: yes; the page is kept for speed, but no media change clears
it, so a correction reaches most readers only the next day.
Basis: probe, 2026-09-24. <sup>f-ojs1</sup>

### OMP
<a id="omp1"></a>
**OMP1 — With "HTML Monograph File" off, a book's HTML file opens as a blank page** · 🐞 · critical · crash: both.
With the plugin off, a reader who opens a book's HTML file from the
book page gets a blank page: the server fails behind it, and the file
is neither shown nor downloaded. A journal with "HTML Article Galley"
off downloads the file instead. The reader gets neither the book's HTML
nor a message.
Basis: probe, 2026-09-30. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — Press roles outside Production cannot download the media files they see** · 🐞 · user-visible.
On a press, the Funding Coordinator on a monograph in External Review
sees the "Media" list with each file name as a link, as the Author
does. Pressing a name opens a new tab showing a line of raw text,
{"status":false,"content":"The current role does not have access to
this operation.",…}, and no file arrives. The page offers a download
it then refuses. The Copyeditor and the Marketing and Sales Coordinator
on a monograph in Copyediting get the same link, and by the code the
same refusal.
Basis: test run, 2026-09-25 (the Funding Coordinator); code (the
Copyeditor and the Marketing and Sales Coordinator). <sup>f-omp2</sup>

### OPS
<a id="ops1"></a>
**OPS1 — Media files reach no reader on a preprint server** · ❓ · user-visible.
A preprint server offers the "Media" page with every action a journal
has, but it installs nothing that shows an HTML galley as a page: the
galley's link on the preprint's page downloads the HTML file, and the
media files are shown nowhere.
Question: should a preprint server show HTML galleys with their media
files, or not offer the "Media" page? Lean: show them; the preprint's
download address already accepts a media file (read in the code, used
by no page), so the missing piece looks like an unfinished port rather
than a choice.
Basis: probe, 2026-09-24 (the download); code (the download address).
<sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-24 on checkouts ojs `71bb244152`, omp `a36551804`,
ops `07141ae4df`, lib/pkp `25182919bf`, ui-library `1afd40a9` (the
three apps carry the same lib/pkp and ui-library commits). The body was
live-probed on 2026-09-24 on OJS, OMP and OPS (notes q1–q29, each naming
the rules it settled and the apps it ran on); a claim still read only in
the code says so where it is made.

<a id="fn-a"></a>
**a** — The page: `useWorkflowNavigationConfig{OJS,OMP,OPS}.js` push the
`media` item (`publication.media` "Media") in `getPublicationItemsAuthor()`
unconditionally and in `getPublicationItemsEditorial()` inside
`permissions.canAccessProduction` on OJS and OPS, outside it on OMP
(U24's OMP2). `workflowConfigEditorialOJS.js` and `workflowConfigAuthorOJS.js`
key `media` mount `MediaFileManager` with `{submission, publication}`
(the editorial config adds `canEdit: permissions.canEditPublication`,
which the component does not declare and so never reads); OMP and OPS
deep-merge these configs (`useWorkflowConfig{OMP,OPS}.js`) and define
no `media` key of their own. Table title `publication.mediaFiles` "Media
Files", description `publication.mediaFiles.description`. The reader
side: note m.

<a id="fn-b"></a>
**b** — What the page offers: `useMediaFileManagerConfig.js`
`MediaFileManagerConfigurations.permissions` gives `ROLE_ID_AUTHOR`
`MEDIA_FILE_LIST` alone and `ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`,
`ROLE_ID_SITE_ADMIN`, `ROLE_ID_ASSISTANT` every action;
`getManagerConfig()` keeps an action when
`hasCurrentUserAtLeastOneAssignedRoleInStage(submission,
WORKFLOW_STAGE_ID_PRODUCTION, roles)` (`composables/useCurrentUser.js`),
i.e. the Production entry of the submission's `stages[].currentUserAssignedRoles`.
`PKPSubmission` `maps/Schema::getPropertyStages()` fills that per
stage from the user's assignments through the user group's
`userGroupStages`, and, when the user is assigned in no role and holds
no live review assignment, gives every stage the user's global
`ROLE_ID_MANAGER` / `ROLE_ID_SITE_ADMIN` (so the Journal Manager, Editor
and Production Editor, all manager-level, and the Site Administrator
count unassigned). Stage sets at install (`registry/userGroups.xml`):
Section Editor and Guest Editor `1,3,4,5,6` (OMP `1,2,3,4,5,6`),
Designer, Indexer, Layout Editor, Proofreader `5,6`, Copyeditor and
Marketing `4`, Funding Coordinator `1,3` (OMP `1,2,3`), OPS Moderator
and Author `5,6`, OJS Author `1,3,4,5,6`. No check of the publication's
status, of `recommendOnly` or of `canChangeMetadata`. `getTopItems()`
pushes "Batch Link Media" then "Add Media File"; `getItemActions()`
pushes "More Information", "Edit Metadata", "Manually Link Media"
(only when `mediaFile.genreSupportsFileVariants`) and "Delete File"
(`isWarnable`); `MediaFileManagerCellActions.vue` renders the "…"
(`common.moreActions` "More Actions") only when the list is non-empty.

<a id="fn-c"></a>
**c** — What the server accepts: `lib/pkp/api/v1/submissions/MediaFilesController.php`
(pkp/pkp-lib#12702, PR #13054): `getMany` in a route group for Site
admin, Manager, Sub editor, Assistant and Author; `add`, `linkMany`,
`link`, `edit`, `delete` in a group without Author. `authorize()` adds
`PublicationWritePolicy` for the writes (`PublicationAccessPolicy`,
`StageRolePolicy([SUB_EDITOR, ASSISTANT, AUTHOR])` on the submission's
current stage with recommend-only allowed, and
`PublicationCanBeEditedPolicy` with `api.submissions.403.userCantEdit`
"You are not allowed to edit this publication.") and
`PublicationAccessPolicy` for the read. `PublicationCanBeEditedPolicy`
permits the Site Administrator, then `Repo::submission()->canEditPublication()`:
true for users who may access unassigned submissions (manager-level),
false for an Author on a published or scheduled version, else true
only when an assignment has `canChangeMetadata`. Publication status
does not lock an editorial role. `edit`, `delete` and `link` add
`SubmissionFileMatchesSubmissionPolicy`, and each action also checks
that the file's `assocType`/`assocId` is this publication.

<a id="fn-d"></a>
**d** — The list: `MediaFileManager.vue` (`PkpTable`, label slot
`publication.mediaFiles`, description slot, top controls,
`TableBodyGroup` per `mediaFilesGrouped`, `grid.noItems` "No Items"
when empty). Columns from `getColumns()`: `common.fileName` "File
Name", `common.type` "Type", `common.size` "Size", `common.dateUploaded`
"Date uploaded", `common.moreActions` (screen-reader only); the first
column `common.id` "ID" is `MediaFileManagerCellGroupId.vue`, spanning
the group's rows, showing a `FileTypeIcon` and `variantGroupId` when
set, else `mediaFile.fileId` (the stored file's id, not the submission
file's). `MediaFileManagerCellName.vue` links `mediaFile.url`
(`FileApiHandler::downloadFile` with `stageId` Production, from
`submissionFile/maps/Schema`) with `target="_blank"`; the address
answers with `Content-Disposition: attachment`, so the browser
downloads the file and the new tab stays empty (note q1).
`MediaFileManagerCellType.vue`: the genre's name badge, plus
`publication.mediaFiles.upload.variantTypeHighRes` "High resolution"
for `MEDIA_VARIANT_TYPE_HIGH_RESOLUTION`. Size `useFile::formatFileSize`,
date `useDate::formatShortDate(createdAt)`. `mediaFileManagerStore.js`
fetches `GET …/mediaFiles` (the Collector orders `sf.created_at desc`)
and groups by `variantGroupId` in first-seen order, web variant first
within a group, then by id. Media files are `SUBMISSION_FILE_MEDIA`
(23) with `assocType` publication; the stage file lists filter by their
own file stages and the dependent-file lists by
`SUBMISSION_FILE_DEPENDENT`.

<a id="fn-e"></a>
**e** — Adding: `MediaFileManagerAddFileModal.vue` (title
`publication.mediaFiles.upload` "Upload Media File", description
`publication.mediaFiles.upload.description`, `FileMediaUploader` only
`v-if="mediaFileManagerStore.genreOptions?.length"`, else
`publication.mediaFiles.upload.noMediaTypes`). `genreOptions` are the
`GET genres` items with `dependent`, carrying `supportsFileVariants`.
`components/FileMediaUploader/FileMediaUploader.vue` and
`useFileMediaUploader.js`: heading `common.upload.addFile` "Upload
File", `common.dragAndDropHere`, `common.or`, `common.clickToUploadFiles`;
each file POSTs to `temporaryFiles` at once (Dropzone, no type filter;
`PKPTemporaryFilesController::uploadFile()` refuses only size and
upload errors, shown by `FieldError` from `parseDropzoneError`); the
card's `common.remove` button, `ProgressBar`, and after success the
selects `publication.mediaFiles.upload.selectMediaType` "What kind of
media is this?" / `…selectMediaTypeDescription` and
`publication.mediaFiles.upload.fileResType` "File resolution type" /
`…fileResTypeDescription`, each with `common.required` "(Required)".
A new card has `genreId: ''` and `variantType` web; the resolution
select is `:disabled="!genreSupportsFileVariants(file.genreId)"` and
`onGenreChange()` resets it to web. `canSubmit` needs every card
uploaded, with a genre and a variant and no error; the button is
`common.upload.addFiles` "Upload Files", shown only `v-if="files.length"`.
`useMediaFileManagerAddFileModal.js::onFilesUploaded()` POSTs all cards
to `…/mediaFiles`; `MediaFilesController::add()` creates each
submission file (name = the temporary file's original name in the
submission locale, `fileStage` 23, `assocType` publication) in one
transaction, with no `variantGroupId`, and on success the window closes
and the list reloads. Default dependent genres, `registry/genres.xml`:
OJS and OPS `MULTIMEDIA` (category 1, dependent), `IMAGE` (category 2,
dependent, `supportsFileVariants="1"`), `STYLE` (category 1,
dependent); OMP `IMAGE` and `STYLE` only. Labels `default.genres.multimedia`
"Multimedia", `default.genres.image` "Image", `default.genres.styleSheet`
"HTML Stylesheet".

<a id="fn-f"></a>
**f** — "Edit Metadata": `MediaFileManagerMetadataFormModal.vue`
(title `grid.action.editMetadata`) and
`useMediaFileManagerMetadataFormModal.js`: `PUT …/mediaFiles/{id}`,
`showErrorFooter: false`; `name` (`publication.mediaFiles.metadataName`
"Name of the file", help `…metadataNameDescription` "(e.g., Manuscript;
Table 1)", `isRequired`, multilingual); for `genreMetadataType ===
GENRE_CATEGORY_ARTWORK` `caption`, `credit`, `copyrightOwner`, `terms`
(`grid.artworkFile.caption` "Caption", `…credit` "Credit",
`…copyrightOwner` "Copyright Owner", `…permissionTerms` "Permission
Terms"); for `GENRE_CATEGORY_SUPPLEMENTARY` `description`
(`common.description`), `creator` (`submission.supplementary.creator`
"Creator (or owner) of file"), `publisher`, `source` (`common.source`),
`subject`, `sponsor` ("Contributor or sponsoring agency"), `dateCreated`
(`common.date`, a date field), `language` (`common.language`). Buttons
`common.save`, `common.cancel`. `MediaFilesController::edit()` via
`EditMediaFile` (drops `submissionId`, `fileId`, `uploaderUserId`,
`createdAt`, `fileStage`; refuses an empty body with
`api.submissionsFiles.400.noParams`), then
`VariantGroup::applyMetadataToSiblings()`.

<a id="fn-g"></a>
**g** — "Manually Link Media": `MediaFileManagerManualLinkImageFormModal.vue`
(title `publication.mediaFiles.manuallyLinkMedia`) and
`useMediaFileManagerManualLinkImageFormModal.js`: `currentFile`
(`common.selectedFile` "Selected File", disabled), select
`targetSubmissionFileId` (`publication.mediaFiles.selectMediaFileToLink`,
help `…selectMediaFileToLink.description`), options from
`useMediaFileImageLinking.js::getHighResOptionsForWebFile()` or
`getWebFileOptionsForHighRes()` (same `genreId`, minus files already
selected for another file, then `publication.mediaFiles.noHighResolutionFile`
"No high-resolution file" / `…noWebVersionFile` "No web version file",
value `''`), initial value the current counterpart from `linkSelections`.
Submit `publication.mediaFiles.linkMedia` "Link Media" sends
`PUT …/mediaFiles/{id}/link` with `parseInt(value)`: an empty value is
`NaN`, which JSON sends as `null`, which `MediaFilesController::link()`
treats as unlink (`VariantGroup::unlink()`). `LinkMediaFile` refuses
self-links, a target outside the submission or not a media file, and
two files of the same variant type (`api.submissionFiles.422.*`); the
form's option lists never offer those.

<a id="fn-h"></a>
**h** — "Batch Link Media": `MediaFileManagerBatchLinkImagesModal.vue`
(title and description `publication.mediaFiles.batchLinkMedia[.description]`,
columns `publication.mediaFiles.selectedWebVersion` "Selected Web
Version" and `…linkHighResolutionVersion` "Link High-Resolution
Version", per-row `SelectInput` with aria label
`…selectHighResolutionFor`; `PkpButton is-warnable` "Cancel", and
"Link Media" `:disabled="!webVersionFiles?.length"`).
`useMediaFileManagerBatchLinkImagesModal.js::handleLinkMedia()` sends
every web file as `{primarySubmissionFileId, secondarySubmissionFileId
|| null}` to `POST …/mediaFiles/link`; `MediaFilesController::linkMany()`
links or unlinks each in one transaction. `isWebVersion()` needs
`genreSupportsFileVariants` and variant web.

<a id="fn-i"></a>
**i** — Pairs: `lib/pkp/classes/submissionFile/VariantGroup.php`.
`link(primary, secondary)` returns at once when both share a group;
otherwise unlinks each from its former group (`unlink()` clears
`variantGroupId` on every file of the group and deletes the group, so
a former partner is left alone), creates a group, sets both files'
`variantGroupId`, then copies `array_intersect_key(primary->getAllData(),
getCommonMediaFileFields())` onto the secondary (`caption`,
`copyrightOwner`, `creator`, `credit`, `dateCreated`, `description`,
`language`, `publisher`, `source`, `sponsor`, `subject`, `terms`;
`Repository::getCommonMediaFileFields()`), so only fields the primary
holds are copied. Manual link: primary = the row's file
(`link($sourceFile, $targetFile)`); batch: primary = the web file.
`applyMetadataToSiblings()` copies the same fields of an edit onto the
group's other files; `cleanupAfterDelete()` ungroups a lone survivor.
`MediaVariantType` enum: `web`, `high_resolution`.

<a id="fn-j"></a>
**j** — Delete: `useMediaFileManagerActions.js::mediaFileDelete()` opens
`openDialog` titled `publication.mediaFiles.delete` "Delete media file?"
with `publication.mediaFiles.confirmDelete` (the name inside `<strong>`),
"OK" (`isWarnable`, sends `DELETE …/mediaFiles/{id}` and closes the
dialog whatever the answer) and "Cancel". `MediaFilesController::delete()`
calls `Repo::submissionFile()->delete()` (deletes the stored file only
when no other submission file uses it) and
`VariantGroup::cleanupAfterDelete()`.

<a id="fn-k"></a>
**k** — Unsaved changes: `composables/useFormChanged.js` with
`warnOnClose: true` in the four windows (the upload window counts its
cards, the batch window its `linkSelections`, the two forms their
fields). A registered close callback opens `openDialog` titled
`common.warning` "Warning", message `form.dataHasChanged`, buttons
`common.yes` "Yes" and `common.no` "No". The forms' `@cancel` and the
batch window's "Cancel" call the injected `closeModal`, which runs the
same close callbacks.

<a id="fn-l"></a>
**l** — Versions: `lib/pkp/classes/publication/Repository::version()`
("Copy over publication media files") clones every media file of the
old publication with a new id and `assocId` = the new publication,
mapping each old `variantGroupId` to a new `VariantGroup`; the clone
keeps `fileId`, so both rows share the stored file, and
`Repo::submissionFile()->delete()` removes that file only when no row
references it any more.

<a id="fn-m"></a>
**m** — Readers, OJS: `plugins/generic/htmlArticleGalley/classes/HtmlGalleyHelper::getHTMLContents()`
collects the galley file's dependent files and the publication's media
files minus `MediaVariantType::HIGH_RESOLUTION`, keys them by localized
name with the dependent files last (they win), and rewrites every
`src`/`href`/`data` attribute ending in `rawurlencode(name)` (and
Flowplayer `url:` and CSS `url()` forms) to
`article/download/{id}/version/{publicationId}/{galleyId}/{fileId}/{name}`;
`ArticleHandler` serves a media file only when it belongs to the
galley's publication. OMP: `plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper::getHTMLContents()`
does the same for an HTML publication-format file, web variants only,
precedence media < dependent < any proof file of the submission,
matching the raw name, rewriting to `catalog/download/…`;
`CatalogBookHandler` serves `ASSOC_TYPE_PUBLICATION` media files of the
format's publication. Both plugins ship `settings.xml` with `enabled`
true ("HTML Article Galley", "HTML Monograph File").

<a id="fn-n"></a>
**n** — OPS: `plugins/generic` holds no HTML galley plugin (crossref,
citationStyleLanguage, customBlockManager, googleAnalytics,
googleScholar, pdfJsViewer, tinymce, usageEvent, webFeed). With no
`PreprintHandler::view::galley` hook taker, `PreprintHandler::view()`
redirects a galley view to `preprint/download/…`, which sends the HTML
file as a download (note q20). `PreprintHandler::download()` nonetheless accepts a media
file of the galley's publication as the requested file (the same
allowance as OJS `ArticleHandler`), which no OPS page produces.

<a id="fn-o"></a>
**o** — Log lines: `lib/pkp/classes/submissionFile/Repository::add()`
writes `submission.event.fileUploaded` on the file and
`submission.event.fileRevised` on the submission (U36's A22);
`edit()` writes `submission.event.fileEdited` "The metadata for file
"{$filename}" was edited by {$username}." on both, for every call:
`VariantGroup::link()` edits each file once or twice (group, then the
copied fields) plus once per file of a dissolved group, `unlink()` once
per file; `delete()` writes `submission.event.fileDeleted` on both.
None of `MediaFilesController`'s actions sends an email or creates a
notification.

<a id="fn-p"></a>
**p** — Settings: the component form `lib/pkp/templates/controllers/grid/settings/genre/form/genreForm.tpl`:
"File Type" (`manager.setup.genres.label`) boxes `dependent`
(`manager.setup.genres.dependent`) and `supplementary`; "File Variants"
(`manager.setup.genres.supportsFileVariants.title`) box
`supportsFileVariants` (`…supportsFileVariants.label`); "File Metadata"
(`manager.setup.genres.metatadata`) select `category` (1 Document, 2
Artwork, 3 Supplementary Content; `Genre::GENRE_CATEGORY_*`).
`GenreDAO` stores `supports_file_variants`. Install defaults: note e.

<a id="fn-r"></a>
**r** — "More Information": `useMediaFileManagerActions.js::mediaFileInfo()`
opens the legacy `informationCenter.FileInformationCenterHandler`
`viewInformationCenter` with `submissionFileId`, `submissionId` and
`stageId` Production, titled `informationCenter.informationCenter`
"Information Center: {name}".

<a id="fn-s"></a>
**s** — The error window: `useFetch` calls
`modalStore.openDialogNetworkError()` for a refused request (the manual
link form only handles 400 and 422 itself), a dialog titled
`common.error` "Error" with the response's `error` text and "OK". The
"Edit Metadata" form is built with `showErrorFooter: false` (note f);
live-probed 2026-09-24, its refused `PUT …/mediaFiles/{id}` (401) opened
no dialog and left no text on the form, on all three apps.

<a id="fn-t"></a>
**t** — Scenario seeding. Scenarios 1 and 2 run on the seeded journal,
press and preprint server (`publicknowledge`) as `manager.maya`
(password as users.md gives it), on a scratch submission of that
context from `POST scenarios/submission`. Scenarios 3 to 8 run on their
own scratch context from `POST scenarios/context`, with throwaway
`users[]` (password: the username twice): `manager` everywhere, plus
`author` (the submitter), `sectionEditor` (the Moderator on OPS) and,
on OJS and OMP, `layoutEditor` in scenario 4, with `roles:
{layoutEditor: {permitMetadataEdit: true}}` so that `participants[]`
(both roles, `canChangeMetadata` left to the role) arrives with
"Permissions" ticked (Settings bullet 4); `reader` in scenario 7;
`funding`, `copyeditor` and `marketing` in scenario 8, each in
`participants[]` of both monographs. Scenario 6 seeds `components:
{Multimedia: {fileVariants: true, metadata: 'supplementary'}}` (OMP:
`'HTML Stylesheet'`, a press having no Multimedia). The stage comes from
`decisions`: scenario 1 `['sendExternalReview']` on OJS and OMP, none on
OPS; the Production stage on OJS `['sendExternalReview', 'accept',
'sendToProduction']`, on OMP `['skipExternalReview',
'sendToProduction']`, none on OPS; scenario 8 `['sendExternalReview']`
and `['skipExternalReview']`. Scenarios 5 and 7 add `published: true`.
Media files come from `mediaFiles[]`, `genre` "Image" and `resolution`
web unless stated: scenario 2 `figure.png` and `not-an-image.png` named
`fig1-web.png` and `fig2-web.png`, `profile-image-400.png` and
`not-an-image.txt` at `high_resolution` named `fig1-high.png` and
`fig2-high.png`; scenarios 3 and 5 the pair `{file: 'figure.png', pair:
'p'}` and `{file: 'profile-image-400.png', resolution:
'high_resolution', name: 'figure-large.png', pair: 'p'}`, plus in
scenario 3 `{file: 'not-an-image.txt', genre: 'HTML Stylesheet', name:
'article.css'}` and in scenario 5 `{file: 'not-an-image.png', name:
'extra.png'}`; scenario 4 and both scenario 8 monographs `{file:
'figure.png'}`; scenario 6 `{file: 'replacement.pdf', genre:
'Multimedia' (OMP 'HTML Stylesheet'), name: 'clip-web.pdf'}` and
`{file: 'profile-image-400.png', resolution: 'high_resolution', name:
'figure-large.png'}`; scenario 7 `{file: 'profile-image-400.png',
resolution: 'high_resolution', name: 'figure.png'}`. Scenario 7's reader
file is the fixture `article.html`, which names `figure.png`: on OJS
`galleys: [{label: 'HTML', locale: 'en', file: 'article.html'}]`, on
OMP `publicationFormats: [{name: 'HTML', file: 'article.html'}]`. All
entries of one seed share their upload second, so no scenario reads the
order of seeded rows (Rule 1). Scenario 7 reads the galley signed in:
the HTML galley plugin keeps a page for readers who are not signed in
for up to a day under the galley's id, and a reset leaves that cache in
place (OJS1). No key makes a second version: scenario 5 uses "Create
New Version". The files the scenarios upload on screen are fixtures in
each app's `fixtures/files/`. Mail is read in the mail catcher
(Mailpit, `http://127.0.0.1:8025`), scoped by the scratch context's
addresses. In the scenarios {number} is the submission's number and
{username} the signed-in account's username.

<a id="fn-q1"></a>
**q1** — Live-probed 2026-09-24 (Actors rows 1–2; Fields, File Name),
OJS, OMP and OPS: every role offered the page saw the same rows. The
Author on their own submission had no "Batch Link Media", no "Add Media
File" and no "…" button, before and after publishing. Pressing a file
name opened an empty new tab and the file arrived as a browser download
(200, `Content-Disposition: attachment`), for the Journal Manager,
Section Editor or Moderator (either end of "Permissions"), Layout
Editor, Site Administrator and Author alike. Typing the page's address
as a role the side menu does not offer it to: an assigned Copyeditor or
Funding Coordinator outside their stage landed on the stage's page
reading "You don't currently have access to that stage of the
workflow." (OJS, OMP); an unassigned Section Editor or Moderator got an
"Error" window reading "The current role does not have access to this
operation." with "OK" (all three).

<a id="fn-q2"></a>
**q2** — Live-probed 2026-09-24 (Actors row 2; Rule 7; Settings bullet
4; A1). Offered the whole set, exactly as the Journal Manager: on OJS
the assigned Guest Editor, Layout Editor, Designer, Indexer and
Proofreader; on OMP the same without the Guest Editor; on all three a
Section Editor, Series Editor or Moderator with "Permissions" unticked.
With the box unticked, "Upload Files", "Link Media" (both windows) and
the delete dialog's "OK" answered 401 and opened "Error" / "You are not
allowed to edit this publication." / "OK", the list unchanged; "Save" in
"Edit Metadata" answered 401 and opened nothing, the window staying open
with the new value (seen seven times across OJS, OMP and OPS). With the
box ticked, every change held (Layout Editor on OJS and OMP; Section
Editor, Series Editor, Moderator on all three). The "Assign" window's
box arrived ticked for the Section and Series Editor and unticked for
the Guest Editor, Layout Editor, Designer and Proofreader. The Roles
form's "Permit submission metadata edit." was ticked on Section Editor,
Series Editor and Moderator and unticked on Guest Editor and every
assistant role.

<a id="fn-q3"></a>
**q3** — Live-probed 2026-09-24 (Actors row 2, press bullet; Settings
bullet 5), OMP: with the monograph in External Review, the Funding
Coordinator saw the list with no buttons and no "…" (the name's tab
held the refusal "The current role does not have access to this
operation.", no file; OMP2), while the Copyeditor and Marketing and Sales Coordinator
had no version under "Publication". In Copyediting, the Copyeditor and
the Marketing and Sales Coordinator saw the list alone, and the Funding
Coordinator's typed address landed on "You don't currently have access
to that stage of the workflow.". In Production none of the three had
anything under "Publication". OJS control: the Copyeditor and Funding
Coordinator were never offered "Media". The Roles grid ticked
Production for the Section Editor, Guest Editor, Designer, Indexer,
Layout Editor and Proofreader (OJS), for the Series Editor, Designer,
Indexer, Layout Editor and Proofreader (OMP, which has no Guest Editor)
and for the Moderator (OPS). A Copyeditor role saved with Production on
a scratch journal and press was offered the whole set once assigned.

<a id="fn-q4"></a>
**q4** — Live-probed 2026-09-24 (Actors row 2), OJS, OMP and OPS: the
Journal Manager and Site Administrator, and on OJS and OMP the Editor
and the Production Editor, none of them assigned, were offered "Add
Media File", "Batch Link Media" and the full row menu; an upload held.

<a id="fn-q5"></a>
**q5** — Live-probed 2026-09-24 (Fields, upload window; Rules 2, 2a),
OJS, OMP and OPS: "What kind of media is this?" listed "Multimedia",
"Image", "HTML Stylesheet" (OJS, OPS) and "Image", "HTML Stylesheet"
(OMP), with nothing chosen at first. "Upload Files" was absent on the
empty window and greyed while a card had no media type, while another
card was still uploading, and while a failed card was on the window.
"File resolution type" was greyed before a media type was chosen and
for "Multimedia" (a press: "HTML Stylesheet"), choosable for "Image";
"Image" › "High resolution" › "Multimedia" left it on "Web resolution",
greyed. Pressing the text "Drag and drop files here." opened the file
chooser, as "Click to upload files" does; one file was also dropped. A
slow 1 MB upload showed the bar at 22–30 %. After "Upload Files", each
row carried the uploaded file's name ("figure.png", "notes.md"), its
media type, its size ("3.1 KB") and the day's date, "High resolution"
on the high-resolution one, which stood alone with its own number.

<a id="fn-q6"></a>
**q6** — Live-probed 2026-09-24 (Rule 2f), OJS, OMP and OPS:
`not-an-image.txt` chosen as "Image" uploaded and was added; its row
read "not-an-image.txt", "Image", "41 B", with a document icon.

<a id="fn-q7"></a>
**q7** — Live-probed 2026-09-24 (Rule 2d; Fields, unsaved-changes
dialog), OJS, OMP and OPS: "Close" with one card opened "Warning" with
the quoted text and "Yes" / "No"; "No" kept the window with its card and
choices; "Close" again and "Yes" closed it with no request sent, the
list still "No Items". "Close" on the empty window, or after "Remove"
took the last card, closed at once. Leaving the page with a card on the
window raised the browser's leave question (one `beforeunload`), and
the list had the same rows afterwards.

<a id="fn-q8"></a>
**q8** — Live-probed 2026-09-24 (Rule 2e; Settings bullet 1), OJS, OMP
and OPS: on a scratch context with every default component's "These
are dependent files…" unticked, the window showed only its title, its
line and "No media types are configured. Please contact the system
administrator."; no drop area. "Batch Link Media" was still offered
there and opened on "No Items" with "Link Media" greyed. The box label
is verbatim; at install it is ticked as Settings bullet 1 says (every
component read); with "Other" (a press: "Glossary") ticked as well, the
media-type list offered it.

<a id="fn-q9"></a>
**q9** — Live-probed 2026-09-24 (Rules 3, 3a; Fields, manual link
window), OJS, OMP and OPS, with web A and C and high-resolution B and D
unlinked: A's list offered B and D, then "No high-resolution file"
(chosen); after A–B was linked, C's list offered D alone, then "No
high-resolution file"; B's list offered A (chosen) and C, then "No web
version file"; A's window reopened on B. The linked pair showed one "ID"
cell spanning two rows, the web file first, also when the link was
made from the high-resolution row. Choosing D on A's row made A–D a pair
under a new number and left B alone. "No high-resolution file" and
"Link Media" unlinked A and D, each with its own number. A "Multimedia"
row (a press: "HTML Stylesheet") had no "Manually Link Media". The
order of B and D in the list differed by app (OJS D first, OMP and OPS
B first).

<a id="fn-q10"></a>
**q10** — Live-probed 2026-09-24 (Rule 3c), OJS, OMP and OPS: A "Web
caption", B "High caption", linked from B's "Manually Link Media": both
read "High caption". Linked through "Batch Link Media": both read "Web
caption". With A's caption empty, a batch link left A empty and B on
"High caption". Names never changed.

<a id="fn-q11"></a>
**q11** — Live-probed 2026-09-24 (Rule 3b; Fields, batch window), OJS,
OMP and OPS: rows for the two web images only, each list offering both
high-resolution files, then "No high-resolution file"; a file chosen
in one row left the other row's list. "Link Media" sent every row at
once and the list showed two pairs; reopened, each row started on its
counterpart; one row set to "No high-resolution file" unlinked that
pair alone, the other keeping its number. With only a high-resolution
image and a "Multimedia" file, the table held the single line "No
Items" and "Link Media" was greyed.

<a id="fn-q12"></a>
**q12** — Live-probed 2026-09-24 (Rule 1; Fields, ID; A2), OJS, OMP and
OPS: three "Upload Files" rounds listed newest first; the two files of
one round swapped places between two reads of the same list. A web
file from round 1 linked to a high-resolution file from round 3 moved
to the top, web first. Pair numbers (8–21) and single-file numbers
(97–232) came from separate ranges; no row pair shared a number. A
second version's "Media" and the first version's, reached from the side
menu, each listed only their own files. The Submission and Production
file lists read "No Items" on a submission with four media files (OJS,
OMP; a preprint server's Production has no file list), and the HTML
galley's "Dependent Files" read "No Files" (OJS, OPS).

<a id="fn-q13"></a>
**q13** — Live-probed 2026-09-24 (Rules 4, 4a, 4b; Fields, metadata
window), OJS, OMP and OPS: "Image" showed the name and the four artwork
boxes (all multi-line); "Multimedia" (not on a press) and "HTML
Stylesheet" showed the name alone. The name started as the uploaded
file's name; a saved name and "Caption" came back on reopening and the
row showed the new name. Emptied, "Save" showed "This field is
required." once under the box, sent nothing and kept the window open.
"Credit" saved on a pair's web file showed on its high-resolution file
and the other way round; each kept its own name.

<a id="fn-q14"></a>
**q14** — Live-probed 2026-09-24 (Rule 5; Fields, delete dialog), OJS,
OMP and OPS: the dialog read as quoted, the name in bold (with its
quotation marks). "Cancel" sent nothing and changed nothing. "OK"
removed the row at once; the counterpart stayed with a number of its
own (OJS 9 → 178, OMP 15 → 181, OPS 15 → 100). A lone file deleted the
same way.

<a id="fn-q15"></a>
**q15** — Live-probed 2026-09-24 (Rule 6), OJS, OMP and OPS: in "Edit
Metadata" (a caption changed), "Manually Link Media" and "Batch Link
Media" (a list changed), the window's "Cancel" and its "Close" each
opened the unsaved-changes dialog, in either order; "No" kept the
change, "Yes" closed with no request, the old value on reopening.
Without a change both closed at once. Typing another address or
reloading while "Edit Metadata" held a change raised the browser's leave
question; with no change, or no window, none. A press on the side menu
behind an open window did nothing. The two link windows were not driven
for the leave question.

<a id="fn-q16"></a>
**q16** — Live-probed 2026-09-24 (Rule 8), OJS, OMP and OPS: on a
published article, published monograph and posted preprint, the
Journal Manager (Preprint Server Manager) and an assigned Section
Editor, Series Editor or Moderator were offered the same buttons and
menus; an upload, a rename, a manual link, a batch link and a delete
all held. On OJS and OMP a media file added and then deleted on the
published version showed and then vanished on a signed-in reader's
next view.

<a id="fn-q17"></a>
**q17** — Live-probed 2026-09-24 (Rule 9), OJS, OMP and OPS: "Create
New Version" gave the new version all seven rows with the same names,
media types and "High resolution" badges; the pair stayed a pair under
a new number (OJS 35 → 48, OMP 29 → 42, OPS 24 → 33), its captions and
credits copied. A rename, an unlink and a delete on the new version left
the earlier version's list unchanged, and its deleted file's twin still
downloaded. Deleting a file on the earlier, published version left the
new version's copy in place and downloading.

<a id="fn-q18"></a>
**q18** — Live-probed 2026-09-24 (Side effects, journal), OJS, as a
signed-in reader: the HTML galley showed the web `figure.png` (120 px)
from its rewritten address, and its `article.css` link was rewritten to
the media file. A high-resolution `figure.png` alone left the image
unresolved; beside a web one, the web one showed. A dependent
`figure.png` (400 px) added to the galley's HTML file won over the
media file. Renaming the web file left the image unresolved. The
stylesheet came from a text fixture, so only its rewrite was judged.

<a id="fn-q19"></a>
**q19** — Live-probed 2026-09-24 (Side effects, press), OMP: an "HTML"
publication format built on screen and published; the book page's
link opened the file in a frame showing the web `figure.png` (120 px),
through `catalog/download/…?inline=1`. A high-resolution `figure.png`
did not replace it, and a rename left the image unresolved. Whether a
dependent or proof file of the same name wins on a press was not
driven; note m reads that it does.

<a id="fn-q20"></a>
**q20** — Live-probed 2026-09-24 (Side effects, preprint server;
OPS1), OPS, two runs: the posted preprint's HTML galley link went
`preprint/view/{id}/{galley}` → 302 → `preprint/download/{id}/{galley}`
and the browser downloaded "preprint.html"; no page opened. The "Media"
page was still offered on the posted preprint with its list and row
menu.

<a id="fn-q21"></a>
**q21** — Live-probed 2026-09-24 (Side effects, Activity Log), OJS, OMP
and OPS: adding `figure.png` wrote 'Revision "figure.png" was uploaded
for file {n}.' to the Activity Log (*Submission files*' A22 wording)
and 'A file "figure.png" was uploaded for submission {n} by
{username}.' to its "History". A caption save wrote the metadata line
once to each. A link made from `figure.png`'s "Manually Link Media",
with a caption to copy, wrote the line once for `figure.png` and twice
for its counterpart, in the log and in each "History"; an unlink wrote
it once per file. A delete wrote the quoted delete line. A batch link,
and a link with nothing to copy, were not counted.

<a id="fn-q22"></a>
**q22** — Live-probed 2026-09-24 (Side effects, email), OJS, OMP and
OPS: the mail catcher's counts for the context's manager, author and
reader and for `admin` did not change across the five actions of q21,
and the Tasks bell read the same before and after. Positive control: a
lost-password request arrived.

<a id="fn-q23"></a>
**q23** — Live-probed 2026-09-24 (Rule 10), OJS and OMP: as Journal
Manager on an article or monograph in Review, and on one just
submitted, "Media" was in the side menu with both buttons and an upload
held; the assigned Section Editor saw the same buttons in Review. A
preprint server has only Production, where every other probe ran.

<a id="fn-q24"></a>
**q24** — Live-probed 2026-09-24 (Actors row 3), OJS, OMP and OPS:
offered on every row to every role with the whole set, never to the
Author. The window is titled "Information Center: {name}" with the
tabs "History" and "Notes". For the Journal Manager, Section Editor or
Moderator and Site Administrator, "History" listed the upload and
metadata lines; the upload line names the file as it was uploaded ('A
file "profile-image-400.png" was uploaded…') even after "Edit Metadata"
gave it another name, while the metadata line uses the current name.
For the Layout Editor and Proofreader (OJS, OMP), "History" stayed on
"Loading" for 45 s, its request answering "The current role does not
have access to this operation.".

<a id="fn-q25"></a>
**q25** — Live-probed 2026-09-24 (Settings bullet 2), OJS, OMP and OPS:
the box label is verbatim and ticked at install on "Image" alone. Ticked
on "Multimedia" (a press: "HTML Stylesheet"), its "File resolution
type" was choosable and a "High resolution" upload held; its rows
offered "Manually Link Media"; its web file joined "Batch Link Media";
its counterpart lists offered only files of its own media type, never
an "Image".

<a id="fn-q26"></a>
**q26** — Live-probed 2026-09-24 (Settings bullet 3; Fields, metadata
window), OJS, OMP and OPS: the choices are "Document", "Artwork" and
"Supplementary Content", set at install as bullet 3 says. With
"Multimedia" (a press: "HTML Stylesheet") on "Supplementary Content",
its "Edit Metadata" showed the eight quoted boxes, "Date" a date
picker; a saved "Description" and "Date" came back on reopening. An
"Image" on the same context kept the artwork boxes.

<a id="fn-q27"></a>
**q27** — Live-probed 2026-09-24 (Settings bullet 6), OJS and OMP:
"HTML Article Galley" (OJS) and "HTML Monograph File" (OMP) were ticked
on every scratch context; unticking asked "Are you sure you want to
disable this plugin?". Off, the article page's "HTML" link downloaded
"article.html" (OJS, three runs), and the book page's HTML file link
showed a blank page (OMP, two runs; OMP1). Ticked again, the image
showed again on both. OPS control: its Plugins list has no HTML galley
plugin.

<a id="fn-q28"></a>
**q28** — Live-probed 2026-09-24 (Rule 2c; A4), OJS, OMP and OPS: 3 MB
and 9 MB files uploaded normally; a 101 MB file's card read "Invalid
JSON response from server." in place of the lists, and "Upload Files"
stayed greyed until that card was removed, then was enabled at once.

<a id="fn-q29"></a>
**q29** — Live-probed 2026-09-24 (Side effects, journal; OJS1), OJS:
after a signed-out reader had viewed the galley, the web media file was
renamed and renamed back; a signed-out reader still got the image
unresolved, a signed-in reader got it (120 px). A second sighting: a
reused galley on a freshly reset install served an earlier install's
page to a signed-out reader.

<a id="fn-f-a1"></a>
**f-a1** — Notes b and c: the page's offer reads only the role on the
Production stage; the writes pass `PublicationWritePolicy`, whose
`PublicationCanBeEditedPolicy` needs `canEditPublication()`, i.e.
`canChangeMetadata` on the assignment for any non-manager. Install
defaults: `permitMetadataEdit` true for Section Editor (OJS, OMP) and
OPS Moderator and Author; absent (false) for Guest Editor and every
`ROLE_ID_ASSISTANT` group (`registry/userGroups.xml`). The
`canEdit: permissions.canEditPublication` the editorial config passes
(note a) would carry exactly the server's answer
(`publication.canCurrentUserChangeMetadata`) but `MediaFileManager.vue`
declares only `publication` and `submission`. The silent "Save": note s.
Live-probed 2026-09-24: note q2. Compare the galley page, where on a
journal the "Permissions" box plays no part (*Galleys*).
Issue report: [pkp-e2e#59](https://github.com/jardakotesovec/pkp-e2e/issues/59) ([docs/issues/U47-A1-media-actions-offered-without-permissions.md](../issues/U47-A1-media-actions-offered-without-permissions.md)).

<a id="fn-f-a2"></a>
**f-a2** — Note d: `MediaFileManagerCellGroupId.vue` shows
`variantGroupId` (the `variant_groups` key) or `mediaFile.fileId` (the
`files` key); the two sequences are independent, and `link()` always
creates a new group, so a relinked pair gets a new number. Live-probed
2026-09-24, OJS, OMP and OPS: link, unlink and relink of one file gave
OJS 223 → 20 → 223 → 21, OMP 189 → 16 → 189 → 17, OPS 108 → 16 → 108 →
17. After "Create New Version" the copies of unlinked files showed the
originals' numbers (they share the stored file, note l), while the
copied pair got a new one. Two unrelated rows with one number were not
reached: the two ranges did not overlap on these installs (note q12),
so that sentence rests on the code.

<a id="fn-f-a3"></a>
**f-a3** — Live-probed 2026-09-24 on OJS, OMP and OPS: the accessibility
tree of the empty "Upload Media File" window holds `button "Drop files
here to upload"`, with no visible element; the button is gone once a
card is on the window. The text is that of Dropzone's default message
(lib/pkp `form.dropzone.dictDefaultMessage`); the source of the hidden
button was not traced further.

<a id="fn-f-a4"></a>
**f-a4** — Note q28. The 101 MB request failed with a server error on
all three apps: 500 on `POST …/api/v1/temporaryFiles`, the server log
reading "POST Content-Length of 105906466 bytes exceeds the limit of
104857600 bytes". The limit is PHP's `post_max_size` /
`upload_max_filesize` (100 MB on the probe hosts); the card shows the
client's failure to read the answer, not a message from
`PKPTemporaryFilesController::uploadFile()` (note e).
Issue report: [pkp-e2e#43](https://github.com/jardakotesovec/pkp-e2e/issues/43) ([docs/issues/U36-A21-upload-over-request-limit-server-error.md](../issues/U36-A21-upload-over-request-limit-server-error.md)).

<a id="fn-f-a5"></a>
**f-a5** — Test run 2026-09-25, OJS (scenario 3): after "figure-1.png"
was typed in "Name of the file", "Close" › "No", then "Cancel" › "Yes",
the list's rows read "figure-1.png" and "figure-large.png", no
"figure.png", and no media request was sent after the page loaded (no
save, no fresh read of the list). A throwaway repeat on a scratch
journal the same day gave the same for "Cancel" › "Yes" and for the
header "Close" › "Yes": the row showed the typed name, the window
reopened holding it, and after a reload the row read "figure.png"
again. A changed "Caption" alone comes back empty (note q15). Code:
`useMediaFileManagerMetadataFormModal.js` builds the name field on the
file's own multilingual name object (`value: mediaFile.name`), so
typing edits the list's copy in place, and "Yes" does not re-read the
list. The window is the shared ui-library `MediaFileManager`, the same
commit in the three apps; OMP and OPS were not driven for it.
Issue report: [pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4) ([docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md](../issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md)).

<a id="fn-f-a6"></a>
**f-a6** — Test run 2026-09-25, OJS, OMP and OPS: the worker servers'
logs held "PHP Warning: foreach() argument must be of type
array|object, string given in …/lib/pkp/classes/core/PKPBaseController.php"
once per file before each `POST …/publications/{id}/mediaFiles` (200)
and once per seeded media file; no 5xx. Code: the upload window posts
each card's temporary-file answer as it came back
(`{...f.uploadedFile, temporaryFileId, genreId, variantType}`,
`useFileMediaUploader.js`), whose `name` is a plain string;
`AddMediaFiles::prepareForValidation()` runs
`PKPBaseController::convertStringsToSchema()`, which walks every
multilingual property as a locale map, before
`MediaFilesController::add()` wraps a string name into the
submission's locale. The added file's name is right.

<a id="fn-f-a7"></a>
**f-a7** — Rule 11. Live-probed 2026-09-30 at ojs `7ce98ec09e`, omp
`3b0ecf794`, ops `c8af945bb7` (lib/pkp `3dc90c81a6`, ui-library
`280f98c5`), two runs per app, each on its own scratch journal, press or
preprint server with English and French (Canada) as interface
languages, as its Journal Manager and as the submitting Author, on a
submission in Production with no media file, one holding a single
web-resolution "Image" `figure.png`, and the same one published. On the
second, in French and in English, every window was opened ("Add Media
File", "Batch Link Media", the row menu's four entries, the delete
dialog, cancelled). The codes were the same on the three apps, in both
runs and on every state, the Author seeing the page's three; English
showed none of them. The row's "…" button's accessible name also reads
`##common.moreActions##`. None of the `publication.mediaFiles.*` keys
(lib/pkp `locale/en/submission.po`) nor `common.moreActions`,
`common.selectedFile` or `common.clickToUploadFiles` (`common.po`) has
a `fr_CA` entry; the English `publication.mediaFiles.confirmDelete`
carries the file name. The "More Information" window's History line
with an empty file name is *Submission activity log & notes*' finding.

<a id="fn-f-ojs1"></a>
**f-ojs1** — Note q29. `HtmlArticleGalleyPlugin`, the galley view: a
signed-in request gets `HtmlGalleyHelper::getHTMLContents()` fresh;
any other request gets `Cache::remember('htmlArticleGalley-'.$galleyId,
86400, …)`, which nothing on the media side clears. The press plugin
(`htmlMonographFile`) has no such cache (code read), and a preprint
server has no HTML galley plugin (note n).

<a id="fn-f-omp1"></a>
**f-omp1** — Note q27. With the plugin off, `GET
/catalog/view/{book}/{format}/{file}` answered 500 twice with an empty
page: `CatalogBookHandler::view()` calls `download(…, inline=true)`, no
plugin takes the inline view, and the handler reaches the `UsageEvent`
built with `$this->publication`, never set on that path ("Typed property
APP\pages\catalog\CatalogBookHandler::$publication must not be accessed
before initialization", app log). The same path probably fails for any
format file no viewer plugin takes; that was not driven. Control:
plugin on, the page showed the image.
Issue report: [pkp-e2e#38](https://github.com/jardakotesovec/pkp-e2e/issues/38) ([docs/issues/U69-A9-omp-book-files-fail-to-open.md](../issues/U69-A9-omp-book-files-fail-to-open.md)).

<a id="fn-f-omp2"></a>
**f-omp2** — Test run 2026-09-25, OMP (scenario 8): the Funding
Coordinator pressing "figure.png" on the External Review monograph
opened a new tab answered 200 `application/json`, with no
`Content-Disposition: attachment`, reading
`{"status":false,"content":"The current role does not have access to
this operation.","elementId":"0","events":[]}`; the server log shows
`GET …/$$$call$$$/api/file/file-api/download-file?submissionFileId=…&submissionId=…&stageId=5`.
A probe of 2026-09-24 had already recorded the same tab (note q3).
Code: the name links `mediaFile.url`, built with
`stageId` Production whatever the monograph's stage (note d);
`FileApiHandler` authorizes through `SubmissionFileAccessPolicy`, whose
branches check that stage with `WorkflowStageAccessPolicy`, and the
Funding Coordinator's, Copyeditor's and Marketing and Sales
Coordinator's stages do not include Production (note b). The
Copyeditor's and the Marketing and Sales Coordinator's link in
Copyediting is the same address and was not pressed. The Author and every
role with Production download normally (note q1).

<a id="fn-f-ops1"></a>
**f-ops1** — Notes a and n: the OPS side menu lists "Media" for
editorial roles with Production access and for the Author
(`useWorkflowNavigationConfigOPS.js`), `MediaFilesController` is shared
lib/pkp, and `PreprintHandler::download()` admits media file ids, but
no OPS plugin or template renders an HTML galley. Live-probed
2026-09-24: note q20. The download address's media allowance was not
tried: no page links a media file through it.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Media" page, its "Media Files" list and columns | workflow › "Publication" / "Preprint" › version › "Media" | AFFW-420 · VUE-041 |
| "Batch Link Media" → "Batch Link Media" window, "Link Media" / "Cancel" | above the list | AFFW-558 · AFFW-569 · VUE-063 |
| "Add Media File" → "Upload Media File" window | above the list | AFFW-559 · VUE-062 |
| Drop area, "Click to upload files" | the upload window | AFFW-566 |
| A card's "Remove" | the upload window | AFFW-567 |
| "Upload Files" | the upload window | AFFW-568 |
| The file name's link | a row's "File Name" | AFFW-560 |
| Row "More Information" | a row's "…" menu | AFFW-561 |
| Row "Edit Metadata" → window, "Save" / "Cancel" | a row's "…" menu | AFFW-562 · AFFW-571 · VUE-065 |
| Row "Manually Link Media" → window, "Link Media" / "Cancel" | a row's "…" menu | AFFW-563 · AFFW-570 · VUE-064 |
| Row "Delete File" and its dialog, "OK" / "Cancel" | a row's "…" menu | AFFW-564 · AFFW-565 |
| Media files API: `GET`, `POST`, `POST /link`, `PUT /{id}/link`, `PUT /{id}`, `DELETE /{id}` on `submissions/{submissionId}/publications/{publicationId}/mediaFiles` | the page's requests | API-041 |

The API's `variantGroupIds` and `variantTypes` filters on `GET` are used
by no screen. The editorial page config's `canEdit` value is never read
by the page (A1). On a preprint server the download address's media
allowance serves no page (OPS1). Recorded in UNASSIGNED.md.

## Reference — code anchors

- Vue page: `lib/ui-library/src/managers/MediaFileManager/` — `MediaFileManager.vue`, `MediaFileManagerActionButton.vue`, `MediaFileManagerCell{GroupId,Name,Type,Size,DateUploaded,Actions}.vue`, `mediaFileManagerStore.js`, `useMediaFileManagerConfig.js`, `useMediaFileManagerActions.js`, `MediaFileManagerAddFileModal.vue` + `useMediaFileManagerAddFileModal.js`, `MediaFileManagerBatchLinkImagesModal.vue` + `useMediaFileManagerBatchLinkImagesModal.js`, `MediaFileManagerManualLinkImageFormModal.vue` + `useMediaFileManagerManualLinkImageFormModal.js`, `MediaFileManagerMetadataFormModal.vue` + `useMediaFileManagerMetadataFormModal.js`, `useMediaFileImageLinking.js`; `lib/ui-library/src/components/FileMediaUploader/{FileMediaUploader.vue,useFileMediaUploader.js}`; `composables/useFormChanged.js`, `stores/modalStore.js`
- Workflow mounts: `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/{workflowConfigEditorialOJS,workflowConfigAuthorOJS,useWorkflowConfigOMP,useWorkflowConfigOPS}.js`; `useWorkflowNavigationConfig/useWorkflowNavigationConfig{OJS,OMP,OPS}.js`; `useWorkflowPermissions.js`; `composables/useCurrentUser.js`
- API: `lib/pkp/api/v1/submissions/MediaFilesController.php`, `formRequests/{AddMediaFiles,EditMediaFile,LinkMediaFile,LinkManyMediaFiles,MediaFileValidationTrait}.php`; `lib/pkp/api/v1/temporaryFiles/PKPTemporaryFilesController.php`
- Authorization: `lib/pkp/classes/security/authorization/{PublicationWritePolicy,PublicationAccessPolicy,StageRolePolicy}.php`, `internal/{PublicationCanBeEditedPolicy,SubmissionFileMatchesSubmissionPolicy}.php`; `lib/pkp/classes/submission/Repository.php` (`canEditPublication()`), `classes/submission/maps/Schema.php` (`getPropertyStages()`)
- Model: `lib/pkp/classes/submissionFile/{VariantGroup,Repository,Collector,SubmissionFile}.php`, `enums/MediaVariantType.php`, `maps/Schema.php`; `lib/pkp/schemas/submissionFile.json`; `lib/pkp/classes/submission/{Genre,GenreDAO}.php`; `registry/genres.xml` per app; `lib/pkp/classes/publication/Repository.php` (`version()`)
- Settings: `lib/pkp/controllers/grid/settings/genre/`, `lib/pkp/templates/controllers/grid/settings/genre/form/genreForm.tpl`; `registry/userGroups.xml` per app
- Reader: `ojs/plugins/generic/htmlArticleGalley/classes/HtmlGalleyHelper.php`, `ojs/pages/article/ArticleHandler.php`; `omp/plugins/generic/htmlMonographFile/classes/HtmlGalleyHelper.php`, `omp/pages/catalog/CatalogBookHandler.php`; `ops/pages/preprint/PreprintHandler.php`
