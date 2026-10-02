---
name: jats-and-body-text
status: verified
---

# JATS & Body Text {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal keeps two production copies of each article version next to its
galleys. The **"JATS XML"** page holds the version's JATS XML, the
structured XML that indexes and archives read: the journal generates one
from the version's metadata, and anyone who may edit the publication (see
Actors) may replace it with a file of their own and choose to publish it
beside the galleys, as a
**"JATS XML"** link on the article's page. The **"Body Text"** page is a
built-in editor for the article's full text: an editor writes or imports
the text (a Word, OpenDocument, RTF, LaTeX or Markdown file sent from a
file list), places figures, headings and in-text citations to the
version's references, and saves it with the version. Both pages sit under
each version in the workflow's "Publication" group. <sup>a</sup>

OMP and OPS do not install this feature: a press's and a preprint
server's publication pages list no "JATS XML" and no "Body Text", their
published pages carry no "JATS XML" link, and neither app ships the "JATS
Template Plugin". A press's file lists still offer "Send to Text Editor",
whose confirmed send leads nowhere ⚠ [OMP1](#omp1).
<sup>b</sup> <sup>d28</sup>

## Actors & permissions

Who sees the two pages at all is *Workflow screen & stage access*: "JATS
XML" is listed for every editorial role that sees the version's
publication pages, on any stage, and "Body Text" only for those with
Production access; the author view lists neither
([→ the Publication pages](U24-workflow-screen-and-stage-access.md#publication-tabs)).
**May edit the publication** below is the one edit gate of
[Publication metadata](U40-publication-metadata.md#edit-gate): the Site
Administrator, Journal Manager, Editor and Production Editor always; an
assigned Section Editor, Guest Editor or assistant role only when their
assignment carries the metadata-edit permission ("Permit submission
metadata edit.", on by default for Section Editor, off for Guest Editor
and every assistant role). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read the "JATS XML" page and press "Download"** (Rules 1, 7) | • Everyone who opens the page, for the generated XML<br>• For an uploaded file: everyone with Production access. A role without it (a Funding Coordinator on a submission in Review) is offered "Download", and pressing it saves a file "download-file.json" holding a refusal message instead of the XML ⚠ [A11](#a11) <sup>c</sup> <sup>d1</sup> |
| **"Upload" and "Delete"** a JATS file (Rules 3–5) | • Whoever may edit the publication, on every version, published ones included (Rule 8) [A12](#a12)<br>• Everyone else: neither button is offered <sup>c</sup> <sup>d30</sup> |
| **"More Information"** on an uploaded JATS file (Rule 6) | • Everyone who opens the page and has Production access, once a file is uploaded, published versions included<br>• A role without Production access is offered the button, and the window opens reading "You don't currently have access to that stage of the workflow." <sup>c</sup> <sup>d1</sup> |
| **"Make available with publication"** (Rule 9) | • Offered to everyone who opens the page, on every version, published ones included<br>• Saved for whoever may edit the publication; for anyone else "Confirm" is refused and the box keeps showing the unsaved state ⚠ [A1](#a1) <sup>c</sup> <sup>d2</sup> |
| **Write in the "Body Text" editor and press "Save"** (Rules 14–16) | • Offered to everyone who opens the page, on every version, published ones included (Rule 21)<br>• Saved for whoever may edit the publication; for anyone else "Save" is refused ⚠ [A2](#a2) <sup>c</sup> <sup>d3</sup> |
| **Send a file to the "Body Text" editor** ("Send to Text Editor" on a file row) | • Who is offered it is [Submission files](U36-submission-files.md#row-menu) (Site Administrator, Journal Manager, Editor, Production Editor); its window is [Publish, schedule & versions](U49-publish-schedule-and-versions.md) (its Rule 16). What arrives on "Body Text" is Rule 20 here <sup>c</sup> |
| **Download the published JATS XML** (the article page's "JATS XML" link; Rules 10–12) | • Anyone who opens the article's page, signed out included, while the version's box is ticked and the version is published<br>• With "Users must be registered and log in to view open access content." on, signed-in visitors only (Settings bullet 2)<br>• Before the version is published: those offered the workflow header's "Preview", and the submitting author by the link's address (Rule 11) <sup>e</sup> <sup>d13</sup> |
| **Turn the "JATS Template Plugin" on or off** | • Journal Manager, Editor and Site Administrator: on Settings › Website › "Plugins", the plugin row's box (*Plugins management*; Settings bullet 1). Ticking it shows "The plugin "JATS Template Plugin" has been enabled."; unticking asks "Are you sure you want to disable this plugin?" with "OK" and "Cancel", then shows "The plugin "JATS Template Plugin" has been disabled."<br>• A Section Editor who opens Settings › Website reads "The current role does not have access to this operation." <sup>d29</sup> |

## Fields & validation

**The "JATS XML" page** (Publication › a version › "JATS XML", headed
"Publication: JATS XML"). The page's box is headed "JATS XML"; its buttons
sit on the heading's right, left to right: <sup>a</sup> <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Upload" | — | Opens the browser's file picker, which offers any file, whatever its type. A text file or a plain-text PDF is taken [A10](#a10); an image breaks the page [A13](#a13) (Rule 3) <sup>d4</sup> |
| "More Information" | — | Only once a file is uploaded (Rule 6) |
| "Delete" | — | Only once a file is uploaded (Rule 5) |
| "Download" | — | Always, unless the XML could not be produced (Rule 7) |
| "Make available with publication" | — | A tick box. Unticked on a first version; "Create New Version" copies it from the earlier version (Rule 13). Greyed while a change is being saved (Rule 9) |
| The XML itself | — | Read-only, shown with coloured markup below the buttons |
| The line under the XML | — | "This JATS file is generated automatically by the submission metadata" for the generated XML. For an uploaded file, "Last Modification at {date} by {username}": {date} is the upload time as YYYY-MM-DD HH:MM:SS by the server's clock, not the browser's, and {username} is the uploader's username (the file's "History" shows their full name). A copied file's line is Rule 13 <sup>d5</sup> |

**The "Body Text" page** (Publication › a version › "Body Text", headed
"Publication: Body Text"): the editor on the left, a panel on the right.
<sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The editor's toolbar | — | Left to right: "Text style" ("Paragraph", "Heading 1", "Heading 2", "Heading 3", "Blockquote"), an "Insert" menu ("Insert figure", "Insert table", and "Insert equation", which is greyed), "Bold", "Italic", "Superscript", "Subscript", "Bullet list", "Ordered list", "Increase indent", "Decrease indent", "Align left", "Align center", "Align right", "Justify", "Undo", "Redo". All but "Text style" and "Insert" are greyed until the editor holds text and the cursor is in it: a click into an empty editor leaves them greyed. With the cursor in a table, a second toolbar, "Table", adds the commands for rows, columns, cells and header rows and columns, and "Delete table" <sup>d6</sup> |
| The editor | — | The text itself. Empty on a version whose Body Text was never saved (Rule 14) |
| "Document Edit" panel: "Save" | — | Always offered; reads "Saved" for a moment after a save (Rule 15) |
| "Document Edit" panel: "Unsaved Changes" | — | A badge beside "Save". It shows while the editor holds changes not yet saved, and also from the moment the page opens on a version whose Body Text was never saved [A14](#a14); "Save" hides it (Rules 14, 15) |
| "Document Edit" panel: "Fullscreen" | — | Reads "Exit fullscreen" while the editor fills the window (Rule 18) |
| "References" (a fold-out section) | — | "Drag references into the editor to place an in-text citation.", then the version's references, each with "Cite"; "No references yet." when the version has none (Rule 17) |
| "Selected Element" (a fold-out section) | — | Details of what is selected in the editor; "No element selected. Click or select an element in the editor." when nothing is (Rule 19) |
| "Document Outline" (a fold-out section) | — | The text's headings (levels 1 to 3), each a button bearing the heading's text; "No headings yet." when there are none (Rule 19) |

Nothing on either page is required, and neither page has a form-level
"Save" other than the Body Text's own. With the interface in French, the
tick box, its two confirmation windows and some of the "Body Text"
panel's labels show raw codes ⚠ [A21](#a21).

## Rules & state

### The "JATS XML" page

<a id="generated"></a>
1. **Generated until a file is uploaded.** A version with no uploaded file
   shows XML generated from the version as it is at that moment, and the
   line "This JATS file is generated automatically by the submission
   metadata". Every opening generates it anew, so a metadata change made
   on another publication page shows the next time the page opens.
   <sup>h</sup> <sup>i</sup>
2. **What the generated XML carries.** The journal's name and ISSNs, the
   article's section, title, contributors with their affiliations, the
   abstract, keywords, license and funding, the issue once the version is
   scheduled or published, and, when the version has references or data
   citations, a reference list at the end with each reference and each
   data citation (see [References](U42-citations-and-references.md)). An
   abstract that contains a bulleted or numbered list carries it as a
   list. <sup>h</sup> <sup>d7</sup>
   - 2a. **The full-text part.** When the article has an HTML galley, the
     XML gains a body taken from that galley's text. It is taken from the
     galleys of the article's current version, not the version whose page
     is open ⚠ [A6](#a6), and the galley's paragraphs arrive as one
     paragraph with their markup shown as text ⚠ [A7](#a7). With no HTML
     galley the XML has no body on a test install, since a PDF galley
     yields text only where the install has a PDF text extractor.
     <sup>j</sup> <sup>d8</sup> <sup>d9</sup>
3. **"Upload".** Choosing a file uploads it at once; a toast reads "Your
   file has been uploaded.", the file's content replaces the XML, the
   line under it becomes "Last Modification at {date} by {username}", and
   "More Information" and "Delete" appear. Each upload also leaves a
   warning in the server's log, which nothing on screen shows
   ⚠ [A20](#a20). The file is not checked to be
   XML ⚠ [A10](#a10). An image is the exception: its "Upload" shows only
   "Uploading 100% complete" and the page stays as it was, yet the file is
   stored, and the page then fails on every opening until the file is
   deleted ⚠ [A13](#a13). <sup>k</sup> <sup>d4</sup> <sup>d5</sup>
4. **Uploading again revises the same file.** A second "Upload" on a
   version that already has a file replaces the shown content and becomes
   a revision of that one file: the version never holds two JATS files,
   and the file's "History" lists the revision. <sup>k</sup> <sup>d10</sup>
5. **"Delete".** It opens "Confirm deleting JATS XML": "You are about to
   remove the existing JATS XML File from this publication. Are you
   sure?", with "Delete JATS File" and "Cancel". "Cancel" closes it and
   keeps the file. "Delete JATS File" removes the file with every
   revision, and the page returns to the generated XML of Rule 1.
   <sup>k</sup> <sup>d10</sup>
6. **"More Information".** It opens the file's window "Information
   Center: {file name}", whose "History" and "Notes" are those of any
   submission file
   ([→ Submission files](U36-submission-files.md#more-information)).
   For an assistant role, a Layout Editor for one, the window's "History"
   never loads, as on any submission file
   ⚠ [→ Submission files A3](U36-submission-files.md#a3). Closing the
   window reloads the page's XML. <sup>k</sup> <sup>d1</sup>
7. **"Download".** For the generated XML it saves
   "jats-{n}-{date}-{time}.xml" ({n} the version's internal number, as in
   Rule 10; the date as YYYYMMDD and the time as HHMMSS, in the browser's
   clock); for an uploaded file, that file under its own name. When the XML
   cannot be produced, the page shows the reason in place of the XML and
   offers neither "Download" nor the tick box. <sup>k</sup> <sup>d11</sup>
8. **A published version is not locked here.** Its page offers "Upload"
   and "Delete" to whoever may edit the publication, as before
   publication, and both change the file the article's page serves
   ⚠ [A12](#a12). "Download", "More Information" and the tick box stay. A
   scheduled version offers the same. <sup>c</sup> <sup>d30</sup>
9. **"Make available with publication".** Ticking the box opens "Enable
   JATS XML Download": "This will make the JATS XML file available for
   public download when the publication is published. Are you sure you
   want to enable this?"; unticking opens "Disable JATS XML Download":
   "This will remove the JATS XML download option from the public article
   page. Are you sure you want to disable this?". Each offers "Confirm" and
   "Cancel". "Cancel" puts the tick back as it was; "Confirm" saves at
   once, with no toast. On a published version the change reaches the
   article's page immediately. <sup>l</sup> <sup>d2</sup>

### The published "JATS XML"

<a id="public-link"></a>
10. **The link on the article's page.** While the version is published
    with its box ticked, the article's page lists a "JATS XML" link next to
    the galley links. It downloads the uploaded file's content when there
    is one, else the generated XML, as
    "submission-{n}-publication-{m}-jats.xml" ({n} the submission's number
    and {m} the version's internal number, as in the link's address
    "…/submissions/{n}/publications/{m}/jats/download") ⚠ [A9](#a9). With the box unticked
    the link is absent. <sup>e</sup> <sup>d12</sup> <sup>d27</sup>
11. **Before publication.** On an unpublished version whose box is
    ticked, the "Preview" page that the Journal Manager or Editor opens
    from the workflow header also lists "JATS XML", and it downloads
    there. The submitting author's workflow offers no "Preview", but the
    link's address downloads for them too. Another author, a reader or a
    signed-out visitor who opens the address gets a page showing only
    `{"error":"You are not authorized to access the requested resource."}`,
    and the Preview page itself reads "404 Not Found" for them. While the
    box is unticked, the Preview page lists no "JATS XML", and the address
    is refused the same way, the Journal Manager included. <sup>e</sup>
    <sup>d13</sup>
12. **The published copy is remembered for a day.** The first download
    after a change keeps the XML it served for up to 24 hours. A new
    upload, a Delete or a change of the tick box starts afresh; an edit of
    the version's metadata does not, so readers keep the old generated XML
    until the day is out ⚠ [A8](#a8). <sup>e</sup> <sup>d14</sup>
    - 12a. **A download before publication counts.** A download from the
      "Preview" page (Rule 11) is such a first download. After publishing,
      readers get the XML of that preview, without the publication date,
      until the day is out or the box is unticked and ticked again
      [A8](#a8). <sup>d14</sup>

### Versions

13. **A new version starts with the JATS of the one it copies.** "Create
    New Version"
    ([→ Publish, schedule & versions](U49-publish-schedule-and-versions.md))
    gives the new version a copy of the uploaded JATS file, as a file of
    its own, and the same tick in "Make available with publication". A
    version with no uploaded file leaves the new one generating its own
    (Rule 1). The copy's line reads "Last Modification at {date} by
    {username}" with the time "Create New Version" was pressed and the
    username of whoever uploaded the original. The new version's Body
    Text starts empty ⚠ [A4](#a4). <sup>m</sup> <sup>d15</sup>

### The "Body Text" page

14. **Starts empty, saved per version.** Each version has its own Body
    Text. A version whose Body Text was never saved opens an empty editor
    with "Unsaved Changes" already showing ⚠ [A14](#a14). Nothing is saved
    until "Save" is pressed; on a version whose Body Text was never saved,
    "Insert figure" first saves the text as it stands (Rule 22).
    <sup>g</sup> <sup>n</sup> <sup>d16</sup>
15. **"Save" and "Unsaved Changes".** Any change in the editor shows the
    "Unsaved Changes" badge; undoing back to the saved text hides it
    again. "Save" stores the whole text, hides the badge and reads "Saved"
    for about a second and a half. "Save" can be pressed with nothing
    changed, and saves again. <sup>g</sup> <sup>n</sup> <sup>d16</sup>
16. **Leaving with unsaved changes.** Nothing asks. Choosing another
    entry of the workflow's side menu, closing the workflow, reloading the
    browser page or closing the tab leaves at once, and the changes are
    lost ⚠ [A15](#a15). Choosing "Body Text" itself keeps them.
    <sup>g</sup> <sup>d17</sup>
17. **"References".** The section is open when the page opens. It lists
    the version's references
    ([References](U42-citations-and-references.md)) under "Drag
    references into the editor to place an in-text citation.", each with
    a "Cite" button that is never enabled ⚠ [A16](#a16). Dragging a
    reference into the text inserts an in-text citation to it. The
    references cited in the text, or in the part selected with the mouse,
    are highlighted in the list. <sup>o</sup> <sup>d18</sup>
18. **"Fullscreen".** It makes the editor and its panel fill the browser
    window and the button reads "Exit fullscreen"; that button or the
    Escape key restores the page. <sup>g</sup> <sup>d19</sup>
19. **One section open at a time.** Of "References", "Selected Element"
    and "Document Outline", at most one is open. Pressing a closed
    section's heading while another is open closes the open one and
    leaves all three closed; a second press opens it ⚠ [A17](#a17).
    Selecting text with the mouse opens "Selected Element" when no section
    is open; with one open, the selection closes it and nothing opens. A
    selection made with the keyboard opens nothing. <sup>g</sup>
    <sup>d19</sup>

<a id="import"></a>
20. **Importing a sent file.** After "Confirm" in the "Send File to Text
    Editor" window (see *Publish, schedule & versions*, its Rule 16) the
    workflow opens the chosen version's "Body Text" page, and a box above
    the editor reads "Importing document" with its current step:
    "Downloading document…", "Loading converter…", "Converting…", then
    "Uploading images…" when the file holds images. Then the box goes.
    The import runs once per send; reloading the page does not repeat it.
    <sup>p</sup> <sup>d20</sup>
    - 20a. **What arrives.** The converted text is placed at the start of
      the editor, before whatever it already holds, with the file's images
      as figures. The import is not saved: the "Unsaved Changes" badge
      shows until "Save". On a version whose Body Text was never saved, a
      file with images also makes "Save" read "Saved" for a moment while
      the badge still shows [A14](#a14): uploading the images saved the
      empty text, not the import. <sup>d20</sup>
    - 20b. **A file that cannot be converted.** A file that is not what
      its name says (a text file named ".docx", for one) runs the box
      through "Downloading document…", "Loading converter…" and
      "Converting…", then the box goes with no message. Nothing is
      imported and the editor keeps its text ⚠ [A18](#a18). <sup>p</sup>
      <sup>d20</sup>
21. **A published version's Body Text stays editable.** The "Body Text"
    page of a published version offers the editor and "Save" as before,
    and a save by whoever may edit the publication is kept ⚠ [A3](#a3).
    <sup>c</sup> <sup>d21</sup>

<a id="figures"></a>
22. **Figures belong to the Body Text.** "Insert" › "Insert figure" asks
    for an image, uploads it at once and places it in the text; an import
    places the file's images the same way. The figure stays in the text
    only once "Save" is pressed: reloading before that shows the text
    without it. On a version whose Body Text was never saved, the first
    figure saves the text typed so far, so that text survives the reload.
    A figure is not listed on the version's "Media" page (see
    [Media files](U47-media-files.md#media-page)). <sup>q</sup>
    <sup>d22</sup>
23. **Where the Body Text goes.** The saved text is used nowhere else: the
    "JATS XML" page's generated XML does not carry it (its body comes from
    a galley, Rule 2a), and the article's page shows nothing of it
    ⚠ [A5](#a5). <sup>r</sup> <sup>d23</sup>

## Side effects

- Each JATS "Upload", each "Delete JATS File" and each Body Text "Save"
  adds lines to the submission's "Activity Log & Notes" › "History"
  ([Submission activity log & notes](U38-submission-activity-log-and-notes.md)),
  naming the file ("bodyText.json" for the Body Text) and the person. A
  Body Text save after the first counts as a new revision of that file,
  so every "Save" adds a line. <sup>s</sup> <sup>d24</sup>
- A published "JATS XML" download whose XML has a body counts as a view
  of the article in the journal's statistics (Statistics › Articles,
  "JATS" column; *Statistics*). A download without a body is not counted.
  <sup>t</sup>
- No email is sent and no notification is created by anything on either
  page. <sup>s</sup> <sup>d24</sup>

## Settings that modify behavior

1. **"JATS Template Plugin"** — Settings › Website › "Plugins", its row
   in the installed plugins list. Default: on, on every new journal.
   - On: the Statistics › Articles table has a "JATS" column (Side
     effects).
   - Off: the "JATS" column goes. The "JATS XML" page and the published
     link keep generating the XML (Rules 1, 10): turning the plugin off
     does not stop them. <sup>u</sup> <sup>d25</sup>
2. **"Users must be registered and log in to view open access
   content."** — Settings › Users & Roles › "Site Access Options", under
   "View Article Content". Default: off.
   - Off: the published "JATS XML" link downloads for anyone (Rule 10).
   - On: a signed-out visitor who presses the link is sent to the Login
     page first. Signed in there, the file downloads, and the tab stays on
     the Login page with an empty form and "Register" and "Login" still in
     the header ⚠ [A19](#a19). A visitor signed in beforehand downloads
     at once. <sup>e</sup> <sup>d26</sup>
3. **"Permit submission metadata edit."** — Settings › Users & Roles ›
   Roles, a role's "Edit" window, and the per-assignment "Permissions" box
   of *Stage participants*. Defaults as in the Actors preamble. It decides
   who may "Upload", "Delete", change the tick box and "Save" the Body Text
   (Actors), through the edit gate of
   [Publication metadata](U40-publication-metadata.md#edit-gate).
   Changing the role's box and pressing "OK" also sets it on every
   existing assignment of that role, overriding a box set for one person
   (see
   [Stage participants](U35-stage-participants.md), its Settings).
   <sup>c</sup> <sup>d31</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#publication-tabs)*:
  which roles and stages see "JATS XML" and "Body Text" in a version's
  list, and that the author view lists neither.
- *[Publication metadata](U40-publication-metadata.md#edit-gate)*: the
  edit gate that decides who may change anything here, and the metadata
  the generated XML is made from (Rules 1, 2).
- *[References](U42-citations-and-references.md)*: the references and
  data citations in the generated XML's reference list (Rule 2) and the
  "References" section of the Body Text editor (Rule 17).
- *[Galleys](U46-galleys.md#galleys-page)*: the HTML galley whose text
  becomes the generated XML's body (Rule 2a).
- *[Media files](U47-media-files.md#media-page)*: the "Media" page, which
  does not list the Body Text's figures (Rule 22).
- *[Submission files](U36-submission-files.md#row-menu)*: the file rows'
  "Send to Text Editor" and the "Information Center" window that "More
  Information" opens (Rules 6, 20).
- *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*:
  the "Send File to Text Editor" window (its Rule 16), "Create New
  Version" (Rule 13 here), publishing (Rules 8, 10) and the header's
  "Preview" (Rule 11).
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md)*:
  the "History" lines of Side effects.
- [Article landing page & reading](U13-article-landing-page-and-reading.md):
  the article's page that carries the "JATS XML" link (Rule 10).
- [Plugins management](U62-plugins-management.md),
  [Statistics](U64-usage-statistics.md): the plugin's switch and the "JATS"
  column of Settings bullet 1.

## Canonical scenarios

Scenarios 2–6 run on the seeded journal with ready accounts,
scenarios 1, 7 and 8 on a scratch journal with throwaway accounts, and
scenario 9 on the seeded press and preprint server. The accounts,
passwords, mail catcher's address and tooling recipe are in the footnote. <sup>v</sup>

1. **The generated JATS XML, an upload and a delete**

   Given: Journal Manager, on a scratch journal, with a scratch article
   in Production titled "JATS scenario article", whose abstract holds a
   bulleted list of "First point" and "Second point", whose version
   lists the two references "Alpha, A. (2020). First reference." and
   "Beta, B. (2021). Second reference.", and which has an HTML galley
   whose text begins "A small HTML file", with no JATS file uploaded.

   - **The generated XML**: open the article's workflow and note the
     Tasks bell's number, then side menu "Publication" › the version ›
     "JATS XML": the page is headed "Publication: JATS XML", its box
     "JATS XML" offers "Upload", "Download" and "Make available with
     publication", unticked, on the heading's right, with no "More
     Information" and no "Delete", and the XML shows below them, with
     the line "This JATS file is generated automatically by the
     submission metadata" under it (Fields; Rule 1).
   - **What the XML carries**: it holds the journal's name, "JATS
     scenario article", the abstract's two points as a list, and at the
     end a reference list with both references (Rule 2).
   - **The HTML galley's text**: the XML holds a body part (the
     `<body>` element) with the galley's text, "A small HTML file…"
     ⚠ [A7](#a7) (Rule 2a).
   - **A metadata change**: choose "Title & Abstract" under the version,
     replace the "Title" with "Revised JATS article" and press "Save";
     choose "JATS XML" again: the XML holds "Revised JATS article"
     (Rule 1).
   - **"Download" of the generated XML**: press "Download": the browser
     saves a file named "jats-{n}-{date}-{time}.xml", {n} the version's
     internal number, the date as YYYYMMDD and the time as HHMMSS by the
     browser's clock (Rule 7).
   - **"Upload"**: press "Upload" and choose the JATS file "article.xml",
     whose title reads "A JATS fixture article": the toast "Your file has
     been uploaded." shows, the XML shown is the file's, with "Uploaded
     JATS fixture", the line reads "Last Modification at {date} by
     {username}", {date} the upload time as YYYY-MM-DD HH:MM:SS by the
     server's clock and {username} the Journal Manager's username, and "More Information"
     and "Delete" appear (Rule 3; Fields, the line under the XML).
   - **The uploaded file's "Download" and "More Information"**: press
     "Download": the browser saves "article.xml" (Rule 7). Press "More
     Information": a window titled "Information Center: article.xml"
     opens; close it (Rule 6).
   - **"Delete", then "Cancel"**: press "Delete": a window "Confirm
     deleting JATS XML" reads "You are about to remove the existing JATS
     XML File from this publication. Are you sure?", with "Delete JATS
     File" and "Cancel". Press "Cancel": the window closes and the page
     still shows "A JATS fixture article" (Rule 5).
   - **"Delete JATS File"**: press "Delete" again, then "Delete JATS
     File": the page shows the generated XML again, with "Revised JATS
     article" and the line "This JATS file is generated automatically by
     the submission metadata", and "More Information" and "Delete" are
     gone (Rules 1, 5).
   - **The History**: press "Activity Log" in the workflow header:
     "History" holds lines naming "article.xml" and the Journal Manager,
     for the upload and for the delete (Side effects).
   - **No email, no notice**: the mail catcher holds no email to the
     scratch journal's accounts from any of these actions, and the Tasks
     bell's number is unchanged (Side effects).
   - **Control**: press "Download" once more: the browser saves a
     "jats-{n}-{date}-{time}.xml" file again, not "article.xml" (Rules 5,
     7). <sup>v</sup>

2. **Write, save and import the Body Text**

   Given: Journal Manager, on the seeded journal, with a scratch article
   in Production whose version lists the two references "Alpha, A.
   (2020). First reference." and "Beta, B. (2021). Second reference.",
   whose "Submission Files" list holds the Markdown file "notes.md",
   which begins with the heading "Notes", and whose Body Text was never
   saved.

   - **The page**: open the article's workflow, then side menu
     "Publication" › the version › "Body Text": the page is headed
     "Publication: Body Text", the editor is empty ("Unsaved Changes"
     already shows ⚠ [A14](#a14)), the toolbar's "Bold" and "Italic" are
     greyed, and the panel on the right offers "Save" and "Fullscreen"
     (Fields; Rule 14).
   - **"References"**: the panel's "References" section is open, reading
     "Drag references into the editor to place an in-text citation.",
     then both references, each with "Cite" (greyed ⚠ [A16](#a16))
     (Fields; Rule 17).
   - **The first save**: click in the editor and type "First sentence.":
     "Bold" and "Italic" are no longer greyed (Fields). Press "Save": the
     button reads "Saved" for a moment, then "Save" again, and "Unsaved
     Changes" is gone (Rule 15).
   - **A change and its undo**: type "Z": "Unsaved Changes" shows; press
     "Undo": the badge goes (Rule 15).
   - **A citation**: drag the first reference ("Alpha, A. …") from
     "References" into the text after "First sentence.": an in-text
     citation to it appears in the text and "Unsaved Changes" shows; in
     the list the first reference is highlighted and the second is not
     (Rules 15, 17).
   - **A figure**: press "Insert" › "Insert figure" and choose
     "figure.png": the image appears in the text at once (Rule 22).
   - **"Fullscreen"**: press "Fullscreen": the editor and its panel fill
     the browser window and the button reads "Exit fullscreen"; press
     the Escape key: the page is back as it was and the button reads
     "Fullscreen" (Rule 18).
   - **Saved and reloaded**: press "Save", then reload the browser page:
     the editor holds "First sentence.", the citation and the figure, and
     no "Unsaved Changes" shows (Rules 14, 15, 22).
   - **The "Media" page**: choose "Media" under the version: its list
     holds no "figure.png" (Rule 22).
   - **"Send to Text Editor"**: choose "Submission" in the side menu; on
     the "notes.md" row of "Submission Files" press "More Actions" ›
     "Send to Text Editor": the window "Send File to Text Editor" asks
     "To which version would you like to send this file?". Choose the
     article's one existing version, listed after "Create New Version",
     and press "Confirm" (Actors row 6).
   - **The import**: the workflow opens the version's "Body Text", and a
     box above the editor reads "Importing document" with its current
     step, "Downloading document…", "Loading converter…", then
     "Converting…"; then the box goes (Rule 20).
   - **What arrives**: the file's text, beginning with "Notes", stands at
     the start of the editor, before "First sentence.", and "Unsaved
     Changes" shows (Rule 20a).
   - **A save, and a save with nothing changed**: press "Save": "Unsaved
     Changes" goes. Press "Activity Log" in the workflow header, count
     the "History" lines naming "bodyText.json" and close the window.
     Press "Save" again with nothing changed: the button reads "Saved"
     for a moment, and "History" now holds one more line naming
     "bodyText.json" and the Journal Manager (Rule 15; Side effects).
   - **Control**: reload the browser page: the editor holds the file's
     text once, not twice, before "First sentence.": the import does not
     run again (Rules 20, 20a). <sup>v</sup>

3. **Roles that may not edit the publication**

   Given: a Layout Editor, a Funding Coordinator and the Journal Manager,
   on the seeded journal: the Layout Editor assigned at the install
   default, without the metadata-edit permission, to a scratch article
   in Production whose version has the uploaded JATS file "article.xml"
   and no references, and the Funding Coordinator assigned to a second
   scratch article, in Review, that has the uploaded "article.xml".

   - **The Layout Editor on "JATS XML"**: open the article in
     Production, then side menu "Publication" › the version › "JATS
     XML": the page shows the uploaded XML with "More Information" and
     "Download", and no "Upload" and no "Delete" ("Make available with
     publication" is offered too ⚠ [A1](#a1)) (Actors rows 1–4).
   - **The Layout Editor on "Body Text"**: choose "Body Text" under the
     version: "References" reads "No references yet." (Fields). Type
     "Layout text" in the editor and press "Save": a window "Error" reads
     "You are not allowed to edit this publication." ⚠ [A2](#a2); press
     "OK" (Actors row 5).
   - **The Funding Coordinator in Review**: open the article in Review,
     then side menu "Publication" › the version › "JATS XML": the page
     shows the uploaded XML with "More Information" and "Download", and
     no "Upload" and no "Delete"; leave "Download" unpressed ⚠
     [A11](#a11) (Actors rows 1–2). Press "More Information": the window
     "Information Center: article.xml" reads "You don't currently have
     access to that stage of the workflow." (Actors row 3).
   - **The Journal Manager's "Body Text"**: the Journal Manager opens the
     article in Production, then its "Body Text": the editor holds no
     "Layout text" (Actors row 5).
   - **Control**: the Journal Manager's "JATS XML" page on the same
     article offers "Upload" and "Delete" beside "More Information" and
     "Download" (Actors row 2). <sup>v</sup>

4. **The published "JATS XML" link**

   Given: Journal Manager and a signed-out visitor, on the seeded
   journal, with a published scratch article that has a PDF galley
   "PDF", no uploaded JATS file and "Make available with publication"
   unticked.

   - **No link while unticked**: the visitor opens the article's page on
     the journal's public site: it lists "PDF" and no "JATS XML" (Rule
     10).
   - **"Cancel"**: the Journal Manager opens the article's workflow,
     then side menu "Publication" › the published version › "JATS XML",
     and ticks "Make available with publication": a window "Enable JATS
     XML Download" reads "This will make the JATS XML file available for
     public download when the publication is published. Are you sure you
     want to enable this?", with "Confirm" and "Cancel". Press "Cancel":
     the box is unticked again (Rule 9).
   - **"Confirm"**: tick the box again and press "Confirm": the window
     closes, the box stays ticked, and no toast shows (Rule 9).
   - **The link**: the visitor reloads the article's page: it lists
     "JATS XML" next to "PDF". Press "JATS XML": the browser saves
     "submission-{n}-publication-{m}-jats.xml", {n} and {m} the numbers
     in the link's address, holding the XML the
     Journal Manager's "JATS XML" page shows (Actors row 7; Rules 9, 10).
   - **Unticking**: the Journal Manager unticks the box: a window
     "Disable JATS XML Download" reads "This will remove the JATS XML
     download option from the public article page. Are you sure you want
     to disable this?"; press "Confirm". The visitor reloads the
     article's page: it lists no "JATS XML" (Rules 9, 10).
   - **Control**: "PDF" stays on the article's page throughout; only
     "JATS XML" comes and goes (Rule 10). <sup>v</sup>

5. **The "JATS XML" link before publication**

   Given: the Journal Manager, the submitting Author, another Author, a
   Reader and a signed-out visitor, on the seeded journal, with the
   submitting Author's scratch article in Production, not yet
   published, with "Make available with publication" ticked.

   - **The Journal Manager's "Preview"**: open the article's workflow and
     press "Preview" in its header: the Preview page lists "JATS XML";
     press it: the browser saves the XML. Copy the Preview page's address
     and the "JATS XML" link's address (Rule 11).
   - **The submitting Author**: open the article with "View" on My
     Submissions: the workflow offers no "Preview". Open the link's
     address: the browser saves the XML (Rule 11).
   - **Refused**: another Author, the Reader and the signed-out visitor
     each open the link's address: the page shows only
     `{"error":"You are not authorized to access the requested resource."}`.
     Each of them opens the Preview page's address: it reads "404 Not
     Found" (Rule 11).
   - **Unticked**: the Journal Manager unticks "Make available with
     publication" on the version's "JATS XML" page and presses "Confirm"
     in "Disable JATS XML Download": the Preview page lists no "JATS
     XML", and the link's address shows the Journal Manager the same
     page with only the error (Rule 11).
   - **Control**: the address that now refuses the Journal Manager is
     the one that downloaded for them and for the submitting Author while
     the box was ticked (Rule 11). <sup>v</sup>

6. **A new version keeps the JATS file**

   Given: Journal Manager, on the seeded journal, with a published
   scratch article whose version has the uploaded JATS file
   "article.xml", whose title reads "A JATS fixture article", and "Make
   available with publication" ticked.

   - **The published version's page**: open the article's workflow,
     then side menu "Publication" › the published version › "JATS XML":
     it shows "A JATS fixture article", the box ticked and the line "Last
     Modification at {date} by {username}"; note the username (Fields).
   - **"Create New Version"**: press "Create New Version" in the side
     menu and confirm the dialog unchanged (see *[Publish, schedule &
     versions](U49-publish-schedule-and-versions.md)*, scenario 4). Choose
     "JATS XML" under the new version: it shows "A JATS fixture article"
     with "Upload", "More Information", "Delete" and "Download", the box
     ticked, and the line "Last Modification at {date} by {username}",
     {date} the moment "Create New Version" was pressed and {username}
     the one noted above (Rule 13; Fields, the tick box).
   - **The copy is a file of its own**: on the new version press
     "Delete", then "Delete JATS File": the page shows the generated XML
     and the line "This JATS file is generated automatically by the
     submission metadata" (Rules 1, 5, 13).
   - **Control**: choose "JATS XML" under the published version again: it
     still shows "A JATS fixture article" and the line noted above (Rule
     13). <sup>v</sup>

7. **"JATS Template Plugin" off**

   Given: Journal Manager and a signed-out visitor, on a scratch journal
   whose "JATS Template Plugin" is off, with a published scratch article
   whose "Make available with publication" is ticked.

   - **The "JATS XML" page**: open the article's workflow, then side
     menu "Publication" › the published version › "JATS XML": it shows
     the generated XML, the line "This JATS file is generated
     automatically by the submission metadata" and "Download" (Settings
     bullet 1; Rule 1).
   - **The published link**: the visitor opens the article's page: it
     lists "JATS XML"; press it: the browser saves
     "submission-{n}-publication-{m}-jats.xml" (Settings bullet 1; Rule
     10).
   - **Statistics**: the Journal Manager opens Statistics › "Articles":
     the table has no "JATS" column (Settings bullet 1).
   - **Control**: on the seeded journal, where the plugin is on, the
     Journal Manager's Statistics › "Articles" table has a "JATS" column
     (Settings bullet 1). <sup>v</sup>

8. **Registered readers only**

   Given: a Reader, signed out, on a scratch journal with "Users must be
   registered and log in to view open access content." ticked, with a
   published scratch article whose "Make available with publication" is
   ticked.

   - **Signed out**: open the article's page and press "JATS XML": the
     Login page opens (Settings bullet 2).
   - **Signing in there**: sign in as the Reader: the browser saves
     "submission-{n}-publication-{m}-jats.xml" (the tab stays on the
     Login page ⚠ [A19](#a19)) (Settings bullet 2; Rule 10).
   - **Signed in beforehand**: open the article's page again and press
     "JATS XML": the browser saves the file at once, with no Login page
     (Settings bullet 2).
   - **Control**: on the seeded journal, where the box is unticked,
     scenario 4's signed-out visitor downloaded at once (Settings bullet
     2). <sup>v</sup>

9. **No "JATS XML" and no "Body Text"** {OMP OPS}

   Given: Press Manager (Preprint Server Manager), on the seeded press
   (the seeded preprint server), with a published scratch monograph (a
   posted scratch preprint).

   - **The version's pages**: open its workflow, then side menu
     "Publication" ("Preprint" on a preprint server) › the version: the
     list has no "JATS XML" and no "Body Text" (Purpose).
   - **The public page**: open the book's page (the preprint's page) on
     the public site: it carries no "JATS XML" link (Purpose).
   - **Control**: the same version's list shows "Title & Abstract" (see
     *[Workflow screen & stage
     access](U24-workflow-screen-and-stage-access.md#publication-tabs)*),
     and the public page shows the monograph's (preprint's) title.
     <sup>v</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A20 (issue report `docs/issues/U47-A6-media-jats-upload-server-log-warning.md`): upload a JATS file on "JATS XML" and check the server log holds no PHP warning for the request.
  - the guard for OMP1 (issue report `docs/issues/U48-OMP1-press-send-to-text-editor-leads-nowhere.md`): on a press, a Press manager's "More Actions" on a Markdown file in "Production Ready Files" lists no "Send to Text Editor".
  - the guard for A12 (issue report `docs/issues/U48-A12-published-jats-upload-delete-offered.md`): a published version's "JATS XML" page offers neither "Upload" nor "Delete" to an editor who may edit the publication.
  - the guard for A11 (issue report `docs/issues/U48-A11-jats-download-saves-refusal-json.md`): a Copyeditor's "Download" of the uploaded JATS file on "JATS XML" saves the XML.
  - the guard for A13 (issue report `docs/issues/U48-A13-jats-image-upload-breaks-page.md`): an image and an ISO-8859-1 JATS XML file uploaded on "JATS XML" are refused with a message, and the page still opens.
  - the guard for A16 (issue report `docs/issues/U48-A16-body-text-cite-never-enabled.md`): "Cite" on "Body Text" is greyed on arrival and, with the cursor in the text, places a citation when pressed with the mouse and from the keyboard.
  - the guard for A17 (issue report `docs/issues/U48-A17-body-text-side-section-needs-two-presses.md`): pressing "Document Outline" with "References" open opens "Document Outline" alone, and selecting a word opens "Selected Element" alone.
  - the guard for A1 (issue report `docs/issues/U48-A1-jats-make-available-offered-then-refused.md`): an assigned Layout Editor without "Permissions" sees "Make available with publication" greyed on "JATS XML".
  - the guard for A2 (issue report `docs/issues/U48-A2-body-text-save-offered-then-refused.md`): an assigned Layout Editor without "Permissions" sees the "Body Text" read-only, with no "Save".
  - the guard for A8 (issue report `docs/issues/U48-A8-published-jats-xml-stays-old-after-edit.md`): with "Make available with publication" ticked, a reader who downloaded "JATS XML" gets the corrected title right after the editor edits it, and the published XML right after publishing.
  - the guard for A9 (issue report `docs/issues/U48-A9-published-jats-xml-name-url-path.md`): with a URL path set, the downloaded "JATS XML" is named "<path>-publication-<id>-jats.xml", and a reader who downloaded it before the path changed gets the new name.
  - the guard for A14 (issue report `docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md`): a never-saved Body Text opens without "Unsaved Changes", and "Save" reads "Saved" only when the text is saved, "Send to Text Editor" with an image included.
  - the guard for A15 (issue report `docs/issues/U48-A15-body-text-leaving-loses-text-unasked.md`): with unsaved text on "Body Text", choosing another side-menu entry asks "The data on this form has changed. Do you wish to continue without saving?", and "Cancel" keeps the text.
  - the guard for A18 (issue report `docs/issues/U48-A18-body-text-unconvertible-file-no-message.md`): sending an unreadable file to "Body Text" ends the import with "Import failed" and its reason.
- **Nothing new to test**:
  - a second "Upload" on a version that already has a file, which
    becomes a revision of that one file, listed in its "History"
    (Rule 4)
  - "Selected Element" opening on a mouse selection while no section is
    open, and a keyboard selection opening nothing (Rule 19)
  - an assigned Section Editor, and the Editor, Production Editor and
    Site Administrator, offered what the Journal Manager of scenarios 1
    and 2 is (Actors rows 2–5)
  - a Guest Editor and the other assistant roles without the
    metadata-edit permission, offered what the Layout Editor of
    scenario 3 is (Actors rows 2–5)
- **Register carries it**:
  - A1 (the tick box offered to a role that may not change it, and
    "Confirm" refused; Actors row 4; Rule 9; scenario 3 passes the box)
  - A3 (a published version's Body Text still saved; Rule 21)
  - A4 (a new version's Body Text starting empty; Rule 13)
  - A5 (the saved Body Text absent from the XML and the article's page;
    Rule 23)
  - A6 (the body taken from the current version's galleys; Rule 2a)
  - A7 (the galley's markup shown as text in one paragraph; Rule 2a;
    scenario 1 reads the galley's text only)
  - A8 (the published copy stale after a metadata edit, or holding a
    preview's XML after publishing; Rules 12, 12a)
  - A9 (the published file's name with a URL path, and a returning
    reader's earlier name; Rule 10)
  - A10 (a text file or a PDF taken by "Upload"; Rule 3)
  - A11 ("Download" saving "download-file.json" for a role without
    Production access; Actors row 1; scenario 3 leaves it unpressed)
  - A12 ("Upload" and "Delete" still offered and working on a published
    version; Rule 8)
  - A13 (an image's "Upload" breaking the page until the file is
    deleted; Rule 3)
  - A14 ("Unsaved Changes" on arriving at a never-saved Body Text, and
    "Saved" during an import with images; Rules 14, 20a; scenarios 2 and
    3 open never-saved Body Texts)
  - A15 (leaving "Body Text" with unsaved changes: nothing asks and the
    text is lost; Rule 16)
  - A16 ("Cite" never enabled; Rule 17; scenario 2 passes it)
  - A17 (opening a section while another is open closing both; Rule 19)
  - A18 (a sent file the converter cannot read, the box going with no
    message; Rule 20b)
  - A20 (a warning in the server's log on each JATS "Upload"; Rule 3;
    scenario 1 uploads without reading the log)
  - A21 (the tick box, its two windows and labels of the "Body Text"
    panel read as raw codes in French; Fields)
  - OMP1 (a press's confirmed "Send to Text Editor" leading nowhere;
    Purpose)
- **No seed**:
  - the XML that cannot be produced: the reason in place of the XML,
    with no "Download" and no tick box (Rule 7)
- **Owned by another feature**:
  - the author view listing neither page (Actors preamble; *[Workflow
    screen & stage access](U24-workflow-screen-and-stage-access.md)*,
    scenario 7)
  - a Funding Coordinator on a submission in Review offered no "Body
    Text" (Actors preamble; *[Workflow screen & stage
    access](U24-workflow-screen-and-stage-access.md)*, scenario 4)
  - the "Information Center" window's "History" and "Notes" (Rule 6;
    *[Submission files](U36-submission-files.md)*, scenario 6)
  - the plugin's switch for the Journal Manager, Editor and Site
    Administrator, and the Section Editor turned away (Actors row 8;
    *Plugins management*)
  - the "JATS" count in the statistics for a published download whose
    XML has a body (Side effects; *Statistics*)
  - "Permit submission metadata edit." set per role or per assignment,
    and a role's "OK" setting it on every assignment (Settings bullet 3;
    *[Stage participants](U35-stage-participants.md)*, scenario 7)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-25), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A Layout Editor, other assistant or Guest Editor without "Permissions" is offered "Make available with publication", and "Confirm" is refused | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | A Layout Editor without "Permissions" can write on "Body Text", but "Save" is refused and the text is lost | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | A new or older article version's JATS XML carries the current version's galley text, not its own | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | An article's generated JATS XML gives its HTML galley as one paragraph with the tags as text | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A8](#a8) | Readers download an article's old JATS XML for up to a day after the editor corrects or publishes it | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A9](#a9) | An article's JATS XML download runs its URL path into "publication", and earlier downloaders keep the old file name | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A11](#a11) | A Copyeditor pressing "Download" on an uploaded JATS XML file saves a refusal as "download-file.json" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A12](#a12) | Editors can still replace or delete a published version's JATS XML file, which 3.5 does not offer | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A13](#a13) | Uploading an image as JATS XML stores it silently, then the "JATS XML" page fails on every opening | 🐞 | medium · crash: both | issues (claude), 2026-10-02 — re-verified |
| [A14](#a14) | A never-saved Body Text shows "Unsaved Changes" on opening, and "Saved" when an import saved nothing | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A15](#a15) | Text typed in an article's Body Text is lost without a question on leaving the page | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A16](#a16) | "Body Text": the "Cite" button beside each reference is never enabled | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A17](#a17) | On "Body Text", pressing a closed side section closes the open one and leaves the pressed one closed | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A18](#a18) | A file sent to the Body Text editor that cannot be converted ends the import with no message | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A20](#a20) | Each JATS "Upload" leaves a warning in the server's log | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A21](#a21) | In French the tick box, its two windows and labels of the "Body Text" panel show raw codes | 🐞 | minor | issues (claude), 2026-10-02 — no report: unreleased 3.6 texts |
| [OMP1](#omp1) | A press's editor is offered "Send to Text Editor" on a file, and confirming it imports nothing | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | A published version's Body Text stays editable | ❓ | minor | — |
| [A4](#a4) | A new version starts with an empty Body Text, though its JATS file and media are copied | ❓ | user-visible | — |
| [A5](#a5) | The saved Body Text reaches no reader and not the JATS XML | ❓ | user-visible | — |
| [A10](#a10) | "Upload" on "JATS XML" accepts a text file or a PDF as the article's JATS XML | ❓ | minor | — |
| [A19](#a19) | Signed in for the "JATS XML" download, the visitor is left on the Login page | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — A Layout Editor, other assistant or Guest Editor without "Permissions" is offered "Make available with publication", and "Confirm" is refused** · 🐞 · low.
A Layout Editor or other assistant, or a Guest Editor, whose assignment
has "Permissions" unticked sees no "Upload" or "Delete" on "JATS XML",
yet is offered "Make available with publication" enabled, with its
confirmation window. Pressing "Confirm" is refused with a window "Error"
/ "You are not allowed to edit this publication." and "OK". After "OK"
the box looks unticked again, as saved, but a screen reader still hears
it as the person set it until the page is reloaded. "Permissions" is
unticked by default for the Guest Editor and every assistant role. So
with default roles, every Guest Editor, Layout Editor or other assistant
assigned to an article meets this. A Section Editor meets it only when
"Permissions" has been unticked on their assignment, since it is ticked
by default for that role.
Basis: probe, 2026-10-02. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — A Layout Editor without "Permissions" can write on "Body Text", but "Save" is refused and the text is lost** · 🐞 · medium.
A Layout Editor, Proofreader or other assistant assigned in Production,
whose assignment has "Permissions" unticked, gets the text editor and an
active "Save" on "Body Text". They can write for as long as they like;
"Save" is then refused with a window "Error" reading "You are not
allowed to edit this publication.". "Unsaved Changes" stays, and the
text is lost when they reload or leave the page. The page lets anyone
who can open it write, but the server saves the text only for people who
may change the publication. For a Layout Editor or other assistant, that
means an editor has ticked "Permissions" on their assignment. An editor
can do that, but what was typed before is gone unless the person copied
it out. "Permissions" is unticked by default for the Guest Editor and
every assistant role. So with default roles, every Layout Editor,
Proofreader or other assistant assigned to an article in Production
meets this.
Basis: probe, 2026-10-02. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A published version's Body Text stays editable** · ❓ · minor.
On a published version the "Body Text" page keeps the editor and "Save",
and a save by an editorial role is kept. The version's "JATS XML" page is
not locked either [A12](#a12).
Question: may a published version's production copies change after
publication?
Lean: no; lock both once the version is published, as the "JATS XML"
page is built to do (A12). A correction is what a new version is for.
Basis: probe, 2026-09-25. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A new version's Body Text starts empty** · ❓ · user-visible.
"Create New Version" copies the uploaded JATS file and the media files
into the new version, but not the Body Text: the new version's "Body
Text" page opens empty, and the editor has to import or retype the
article.
Question: should a new version start from the Body Text of the version it
copies? Lean: yes, as it does for the JATS file; a correction is the usual
reason for a new version.
Basis: probe, 2026-09-25. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The saved Body Text goes nowhere** · ❓ · user-visible.
An editor who writes and saves the article on "Body Text" finds it on no
reader's page, and the "JATS XML" page's generated XML does not carry it:
its body still comes from an HTML galley, if any.
Question: is the Body Text meant to feed the generated JATS XML (or a
reader view) in this release? Lean: yes; until it does, the page stores
work nobody else sees.
Basis: probe, 2026-09-25. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A new or older article version's JATS XML carries the current version's galley text, not its own** · 🐞 · low.
On an article with more than one version, the JATS XML that OJS
generates for a version takes its full text (the `<body>`) from the
galleys of the article's current version: the latest published one. It
does not use the galleys of the version whose "JATS XML" page is open.
The rest of the XML is that version's own. So while a new version is
being prepared, its XML shows the published version's galley text, or no
text when that version has only PDF galleys. Once the new version is
published, the older version's XML shows the new version's text, though
it never had it. Editors see this on the version's "JATS XML" page and
in its "Download". Readers get it only from an older version's "JATS
XML" link on the article page, which shows only when an editor ticked
"Make available with publication" for that version (off by default;
`main` only). Nothing on screen says the text belongs to another
version.
Basis: probe, 2026-10-02. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — An article's generated JATS XML gives its HTML galley as one paragraph with the tags as text** · 🐞 · medium.
When an article has an HTML galley, the JATS XML that OJS generates for
it holds the galley's whole text in one paragraph. The galley's
paragraph tags appear in that paragraph as literal text, headings run
into the text, emphasis is dropped, and an "&" in the galley reads
`&amp;` in the text. Editors see this on the version's "JATS XML" page.
Readers and indexes get it only where the journal publishes the
generated XML: when an editor ticks "Make available with publication"
for the version (`main` only), or when the journal turns on the OAI-PMH
JATS format and the article has no JATS file of its own among its
galleys or production files. Both are off by default, and nothing on
screen says the body is broken.
Basis: probe, 2026-10-02. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Readers download an article's old JATS XML for up to a day after the editor corrects or publishes it** · 🐞 · medium.
After an editor corrects a published version's title, the "JATS XML"
page shows the corrected XML, but the article page's "JATS XML" link
keeps serving the XML from before the edit for up to 24 hours. The link
serves a copy of the XML kept on the server, the published copy, and it
is the first download after a change that fills it. Publishing does not
refresh it either. When the editor or author downloads "JATS XML" from
"Preview" before publishing, readers get that preview's XML for up to 24
hours after publication: no change made after the preview reaches them,
and a version that had no publication date at the preview has none in
the file. An edit of the metadata, and publishing, should refresh the
published copy, as an upload or a change of the tick box does. Only
journals that tick "Make available with publication", which is off by
default, are affected.
Basis: probe, 2026-10-02. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — An article's JATS XML download runs its URL path into "publication", and earlier downloaders keep the old file name** · 🐞 · low.
The file a reader saves from the article page's "JATS XML" link is named
"submission-{n}-publication-{m}-jats.xml" when the version has no URL
path. With a URL path such as "my-article", it is named "my-
articlepublication-{m}-jats.xml", with no separator. When the editor
sets, changes or clears the URL path, a reader whose browser already
holds the file gets it again under its earlier name, while a first-time
visitor gets the new one. The browser reuses its cached copy, and the
server's check of that copy looks at the XML's content only, so the file
name a returning reader gets changes only once the XML itself changes.
The file's content is right in every case. The editor's "Download" on
the "JATS XML" page names its file differently and is not affected.
Basis: probe, 2026-10-02. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — "Upload" accepts any file as JATS XML** · ❓ · minor.
"Upload" on "JATS XML" takes a text file or a plain-text PDF as readily
as an XML file (an image breaks the page, [A13](#a13)); the page then
shows its content in place of the XML, and the published link serves it
as the article's JATS XML.
Question: should "Upload" accept XML files only? Lean: yes, at least by
file type; a check against the JATS format is a separate question.
Basis: probe, 2026-09-25. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — A Copyeditor pressing "Download" on an uploaded JATS XML file saves a refusal as "download-file.json"** · 🐞 · low.
A Copyeditor working on a submission in Copyediting can open the "JATS
XML" page and read the JATS file an editor uploaded there. The page
offers them "Download". Pressing it saves a file named "download-
file.json" that holds the message "The current role does not have access
to this operation." instead of the XML, and the page says nothing. An
editor who presses the same "Download" gets the XML. It happens to any
participant without access to the Production stage, while the submission
is in a stage they work on and its version already has an uploaded JATS
file. Once the submission reaches Production, these participants no
longer see the publication pages.
Basis: probe, 2026-10-02. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Editors can still replace or delete a published version's JATS XML file, which 3.5 does not offer** · 🐞 · low.
On a published version's "JATS XML" page, whoever may edit the
publication is still offered "Upload" and "Delete", and both work. An
upload replaces the version's JATS file. "Delete JATS File" removes it,
and the version falls back to the generated XML: the JATS XML that OJS
builds from the version's metadata when no file is uploaded. The page
has code meant to hide both buttons once the version is published, and
that code no longer takes effect. A published version's galleys and
metadata are meant to stay editable; the JATS file is the one part the
page means to lock.
Basis: probe, 2026-10-02. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — Uploading an image as JATS XML stores it silently, then the "JATS XML" page fails on every opening** · 🐞 · medium · crash: both.
"Upload" of an image on a journal article's "JATS XML" page fails on the
server: the page shows only "Uploading 100% complete" and stays as it
was, with no message. The file is stored all the same. From then on
every opening of the page fails: a window reads "Error" / "Malformed
UTF-8 characters, possibly incorrectly encoded" / "OK", the XML area is
empty, the line reads "Last Modification at undefined by undefined",
"Download" saves "undefined.html" and "More Information" opens an error
window. "Delete" › "Delete JATS File" still works and brings back the
generated XML. The same happens to any file that is not UTF-8 text, such
as a JATS XML file saved in ISO-8859-1 with an accented letter, and to
an image uploaded over an earlier JATS file, which it replaces. With
"Make available with publication" ticked, readers of the published
article download the image as its JATS XML.
Basis: probe, 2026-10-02. <sup>f-a13</sup>

<a id="a14"></a>
**A14 — A never-saved Body Text shows the wrong save state** · 🐞 · low.
On a version whose Body Text was never saved (a new version, or one
nobody edited), "Body Text" opens empty with the "Unsaved Changes" badge
already on, before anything is typed. Sending a Word file with an
image to such a version ("Send to Text Editor") shows "Saved" on the
button beside the badge for a moment: uploading the image saved the
empty text, and the text the file brought is not saved. The badge should show only once something changes,
and "Saved" only when the text is saved.
Basis: probe, 2026-10-02. <sup>f-a14</sup>

<a id="a15"></a>
**A15 — Text typed in an article's Body Text is lost without a question on leaving the page** · 🐞 · medium.
Text typed on "Body Text" is lost without a word when the person editing
chooses another entry of the workflow's side menu, presses the
workflow's "Close", reloads the page or closes the browser tab. The page
is built to ask "The data on this form has changed. Do you wish to
continue without saving?" first, and never does. They find out only on
coming back to the page. Pressing "Save" before leaving is the only way
round. It affects anyone who writes an article's Body Text in the built-
in editor or brings it in with "Send to Text Editor".
Basis: probe, 2026-10-02. <sup>f-a15</sup>

<a id="a16"></a>
**A16 — "Body Text": the "Cite" button beside each reference is never enabled** · 🐞 · medium.
On an article version's "Body Text" page, "Cite" beside each reference
in the "References" section stays greyed, even with the cursor in the
text, and pressing it does nothing. "Cite" should place an in-text
citation to that reference at the cursor. It has never worked since the
button was added. A citation can still be placed by dragging the
reference from the list into the text, which needs a mouse: someone
working from the keyboard has no way to cite a reference. Every
reference listed on any version carries the broken button.
Basis: probe, 2026-10-02. <sup>f-a16</sup>

<a id="a17"></a>
**A17 — On "Body Text", pressing a closed side section closes the open one and leaves the pressed one closed** · 🐞 · low.
On an article version's "Body Text" page, pressing a closed side
section, such as "Document Outline", while another one is open closes
the open one and leaves the pressed one closed, so all three sections
are closed. A second press opens it. Selecting a word in the text with
the mouse while a section is open closes that section too, and "Selected
Element", the section that shows the details of what is selected in the
text, does not open. It happens on every switch from an open section to
another, starting with the first of each visit, since the page opens
with "References" open. It has been so since the side sections were
added.
Basis: probe, 2026-10-02. <sup>f-a17</sup>

<a id="a18"></a>
**A18 — A file sent to the Body Text editor that cannot be converted ends the import with no message** · 🐞 · low.
Sending a file the converter cannot read (a text file named ".docx") to
"Body Text" runs the "Importing document" box through "Converting…",
then the box goes with no message: nothing is imported, and the editor
stays as it was (empty on a version with no Body Text). The page should
say the file could not be converted. The person editing is left guessing
whether the import failed, is still running, or produced an empty
document. The same silence follows any file the converter rejects;
damaged or password-protected Word files are expected to be among them
but were not tried.
Basis: probe, 2026-10-02. <sup>f-a18</sup>

<a id="a19"></a>
**A19 — Signed in for the download, the visitor stays on the Login page** · ❓ · minor.
With "Users must be registered and log in to view open access content."
on, a signed-out visitor who presses "JATS XML" on the article's page
lands on the Login page. Signing in there downloads the file, but the tab
stays on the Login page with an empty form and "Register" and "Login"
still in the header, as if the sign-in had failed.
Question: should signing in take the visitor back to the article's page?
Lean: yes; the page left behind looks signed out.
Basis: probe, 2026-09-25. <sup>f-a19</sup>

<a id="a20"></a>
**A20 — Each JATS "Upload" leaves a warning in the server's log** · 🐞 · low.
Every "Upload" on "JATS XML" writes a PHP warning ("foreach() argument
must be of type array|object, string given") to the web server's error
log: the page hands the file's name to a shared step that expects a name
per language. The upload succeeds, and with PHP's error display off, as
PKP ships it, no screen shows the warning; where an install displays PHP
errors, it is printed into the upload's answer and the page shows no
confirmation and keeps the old XML until it is opened again, though the
file was stored. Adding a media file warns through the same step ([Media
files](U47-media-files.md#a6)).
Basis: test run, 2026-10-02. <sup>f-a20</sup>

<a id="a21"></a>
**A21 — In French the tick box and the "Body Text" panel show raw codes** · 🐞 · minor.
With the interface in French (Canada), the two pages show raw codes where
French words belong, on every version, published ones included:
- "JATS XML": the box "Make available with publication" reads
  "##publication.jats.makePublic##". Ticking it opens a window titled
  "##publication.jats.enableVisibilityTitle##" whose only sentence is
  "##publication.jats.enableVisibilityMessage##"; unticking it opens
  "##publication.jats.disableVisibilityTitle##" with
  "##publication.jats.disableVisibilityMessage##". Both windows offer
  "Confirmer" and "Annuler", so a French-speaking editor makes the
  article's JATS XML public, or withdraws it, from a window they cannot
  read. "Confirmer" and "Annuler" work as in English (Rule 9).
- "Body Text": the panel's heading "Document Edit" reads
  "##publication.bodyText.documentPanel##", the hint under "References"
  "##publication.bodyText.references.dragHint##", and the "Selected
  Element" and "Document Outline" sections
  "##publication.bodyText.selectedElement##" and
  "##publication.bodyText.outline##". A screen reader hears the panel
  and the editor named by the codes too
  ("##publication.bodyText.documentPanel##",
  "##publication.bodyText##").

Expected: French words, as the rest of both pages shows ("XML JATS",
"Téléverser", "Information détaillée", "Supprimer", "Télécharger", the
line "Dernière modification le {date} par {username}", the delete window
"Confirmer la suppression du XML JATS" with "Supprimer le fichier JATS";
"Enregistrer", "Modifications non sauvegardées", "Plein écran",
"Références"); the English screens show none of these codes. The side
menu's "Body Text" entry and the "Publication: Body Text" heading are
[Workflow screen & stage access A11](U24-workflow-screen-and-stage-access.md#a11)'s
finding, and why a missing French text shows as a code at all is
[Languages & locales](U57-languages-and-locales.md#a4)'.
Every code here came to `main` with its page, none is on
`stable-3_5_0`, and no language has them yet: the box and its windows
with pkp-lib 5f5066e1f6 (2026-02-13, `pkp/pkp-lib#10405`), the "Body
Text" panel with pkp-lib 4f5c499736 (2026-05-25, `pkp/pkp-lib#12787`).
They are unreleased 3.6 texts waiting for Weblate, which so far
translates `stable-3_5_0` only; no report (issues session ruling,
2026-10-02).
Basis: probe, 2026-09-30. <sup>f-a21</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's editor is offered "Send to Text Editor" on a file, and confirming it imports nothing** · 🐞 · low.
A press's file lists offer "Send to Text Editor" on a Word,
OpenDocument, RTF, LaTeX or Markdown file, and its window asks "To which
version would you like to send this file?". A press has no "Body Text"
page, so after "Confirm" nothing opens and nothing is imported; with
"Create New Version" chosen, a new version is created all the same. The
action should not be offered on a press. The action is the journal's
import of a file into the version's "Body Text" page, which works on OJS
and stays there.
Basis: probe, 2026-10-02. <sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-25 at the checkouts' tips (ojs `71bb244152`, omp
`187f0f40d`, ops `61cd158ce3`, lib/pkp `76a315591`, ui-library `03d1cee2`).
The body was live-probed on 2026-09-25 on OJS, with OMP and OPS read for
the absence and the exclusivity controls (notes d1–d31, each naming the
rules it settled); a claim still read only in the code says so where it
is made.

<a id="fn-a"></a>
**a** — Pages: `useWorkflowNavigationConfigOJS.js::getPublicationItemsEditorial()` pushes `jats` (`publication.jats` "JATS XML") after the settings-gated pages, outside the `permissions.canAccessProduction` block, and `bodyText` (`publication.bodyText` "Body Text") first inside it; `workflowConfigEditorialOJS.js` maps `jats` → `WorkflowPublicationJats` (props `canEdit: permissions.canEditPublication`, `submission`, `publication`) and `bodyText` → `WorkflowPublicationBodyText` (no `canEdit` prop). Both components are registered only in `WorkflowPageOJS.vue`. Heading "Publication: {page}" is U24 Rule 9. Live-probed 2026-08-28 (U40, note on its Rule 1): the OJS editorial list runs "… Funding, JATS XML, Body Text, Galleys, Media …"; live-probed 2026-09-24 (U42 claim check): the OJS "JATS XML" page generated a reference list and the "Body Text" side panel listed each reference under "References" with "Cite".

<a id="fn-b"></a>
**b** — OMP `useWorkflowNavigationConfigOMP.js` and OPS `useWorkflowNavigationConfigOPS.js` push neither `jats` nor `bodyText`; `workflowConfigEditorialOMP.js` / `…OPS.js` define no such keys. OMP and OPS `api/v1/submissions/index.php` mount neither `PKPJatsController` nor `PKPBodyTextController` (OJS's does, on `urlParts[7] == 'jats' | 'bodyText'`); neither app's templates carry a JATS link, and `plugins/generic/jatsTemplate` exists only in OJS. OMP still offers "Send to Text Editor": `useFileManagerConfig.js` grants `FILE_SEND_TO_EDITOR` to `ROLE_ID_SITE_ADMIN`/`ROLE_ID_MANAGER` in every namespace; live-probed 2026-09-23 (U36, its note d10: offered on OJS and OMP on "notes.md", absent on "article.pdf"); OPS mounts no file list (U49 note v). Live-probed 2026-09-24 (U42 claim check): OMP and OPS offer no "JATS XML" and no "Body Text" entry.

<a id="fn-c"></a>
**c** — Client gates: `WorkflowPublicationJats.vue` shows "Upload" (`common.upload`) when `publication.status !== STATUS_PUBLISHED && canEdit`; "More Information" (`grid.action.moreInformation`) when `!isDefaultContent`; "Delete" (`common.delete`, `is-warnable`, `:disabled="isLoading"`) when `!isDefaultContent && status !== STATUS_PUBLISHED && canEdit`; "Download" (`common.download`) and the `Checkbox` (`publication.jats.makePublic` "Make available with publication", `:disabled="isUpdatingVisibility"`) when `workingJatsProps.loadingContentError == null`, with no `canEdit` check. `canEdit` = `permissions.canEditPublication` = `selectedPublication.canCurrentUserChangeMetadata` (`useWorkflowPermissions.js`), which the publication map fills from `Repo::submission()->canEditPublication()` (U40 note b). Server: `PKPJatsController` and `PKPBodyTextController` admit GET to `ROLE_ID_MANAGER`, `SITE_ADMIN`, `SUB_EDITOR`, `ASSISTANT`, `AUTHOR` behind `PublicationAccessPolicy`; POST/DELETE/PUT (and the visibility PUT) to the same minus `AUTHOR`, behind `PublicationWritePolicy` = `PublicationAccessPolicy` + `StageRolePolicy([SUB_EDITOR, ASSISTANT, AUTHOR])` + `PublicationCanBeEditedPolicy` (`api.submissions.403.userCantEdit` "You are not allowed to edit this publication."; site admin passes). `canEditPublication()` locks a published/scheduled publication only for all-Author assignments, so editorial roles may write to published versions server-side (Rule 21; A3). Role defaults: seed-facts ("Permit submission metadata edit." ticked on Section editor, ticked and greyed on Journal editor and Production editor, unticked on Guest editor and every assistant-level role; U47 claim check 2026-09-24). The uploaded file's "Download" is the file's own `url` (`FileApiHandler` download, stage Production per `SubmissionFile\Repository::getWorkflowStageId()` for `SUBMISSION_FILE_JATS`); "More Information" opens `FileInformationCenterHandler` with `stageId: WORKFLOW_STAGE_ID_PRODUCTION`, whose `WorkflowStageAccessPolicy` a role without Production in its stage set does not pass. On the workflow page `pkp.const.STATUS_PUBLISHED` and `pkp.const.STATUS_SCHEDULED` read undefined (live-probed 2026-09-25), so the `status !== STATUS_PUBLISHED` test always passes and "Upload" and "Delete" stay on a published version (Rule 8; A12).

<a id="fn-d1"></a>
**d1** — Live-probed 2026-09-25 (Actors rows 1, 3; Rule 6; A11), OJS: a Funding Coordinator assigned on a submission in Review, on a version whose file the Journal Manager had uploaded, was offered "More Information" and "Download". "Download" saved "download-file.json" holding `{"status":false,"content":"The current role does not have access to this operation.",…}`, with nothing shown on the page (two runs); "More Information" opened "Information Center: article.xml" reading "You don't currently have access to that stage of the workflow.". On the generated XML the same account downloaded "jats-38-20260925-033949.xml". The window opened for every role in Production and on published versions; for the Layout Editor, with or without the permission, its "History" stayed "Loading" and the browser showed two alerts, "The current role does not have access to this operation." and "undefined", while the Guest Editor's "History" loaded.

<a id="fn-d2"></a>
**d2** — Live-probed 2026-09-25 (Actors row 4; Rule 9; Fields, the tick box; A1), OJS, two runs: the Layout Editor, the Guest Editor at the install default and a Section Editor assigned without the permission saw no "Upload" or "Delete" and the box enabled, published versions included. Ticking (and unticking) opened the confirmation window; "Confirm" answered "Error" / "You are not allowed to edit this publication." / "OK" (the save answered 401); after "OK" the box stayed as they had set it, and reopening the page showed the saved state. The Journal Manager's tick and untick saved with no toast and survived reopening, the box greyed while the save ran; "Cancel" put the box back. On a published version the article page's link went at once after unticking and came back after ticking.

<a id="fn-d3"></a>
**d3** — Live-probed 2026-09-25 (Actors row 5; A2), OJS, two runs, one account per role on a submission in Production: the Site Administrator, Journal Manager, Editor, Production Editor, a Section Editor at the default and a Layout Editor whose assignment carries the permission saved ("Saved"), and the text survived a reload. The Guest Editor, Layout Editor and Proofreader at the default were refused (401; window "Error" / "You are not allowed to edit this publication." / "OK"; "Unsaved Changes" stayed; the text was gone after a reload). On a published version the Layout Editor's refusal read "You don't currently have access to that stage of the workflow.". Every one of them was offered the editor and "Save". A Funding Coordinator on a Review submission had no "Body Text" in the list, and the author view listed neither page.

<a id="fn-d29"></a>
**d29** — Live-probed 2026-09-25 (Actors row 8; Settings bullet 1), OJS: the Journal Manager and the Editor ticked and unticked the "JATS Template Plugin" row's box, with the quoted messages (the Editor in two runs); the Site Administrator's row box was enabled (not pressed); a Section Editor opening Settings › Website read "The current role does not have access to this operation.". Every opening of the Plugins tab also answered 500 on `GET $$$call$$$/grid/plugins/plugin-gallery-grid/fetch-grid`, in OMP and OPS too: the plugin gallery's failure, *Plugins management*'s, not this feature's.

<a id="fn-d4"></a>
**d4** — Live-probed 2026-09-25 (Fields, "Upload"; Rule 3; A10, A13), OJS: the file chooser had no accepted-types filter and took one file. "not-an-image.txt" and a PDF fixture whose content is plain text were taken and shown in place of the XML (the PDF as "%PDF-1.4 1 0 obj…"), with the toast and the line; the published link served the text file as "submission-68-publication-72-jats.xml". "figure.png": note f-a13.

<a id="fn-d5"></a>
**d5** — Live-probed 2026-09-25 (Fields, the line under the XML; Rule 3), OJS: after an upload the line read "Last Modification at 2026-09-25 01:46:26 by {the Journal Manager's username}", while the browser's clock read 03:46 (the server runs on UTC); "More Information" › "History" named the same person by full name, "Mira Manager".

<a id="fn-d6"></a>
**d6** — Live-probed 2026-09-25 (Fields, the toolbar), OJS, four runs: the controls left to right by their accessible names, as listed; no "Link", no separate "Blockquote" button, no "Insert footnote", no "Table" menu. With the cursor in a table the "Table" toolbar read "Insert table", "Add column before", "Add column after", "Delete column", "Add row above", "Add row below", "Delete row", "Merge cells", "Split cell", "Toggle header row", "Toggle header column", "Next cell", "Delete table". The editor package's English strings (`@sciflow/editor-core` `i18n/en.js`: `formatBar.*`, `cmd.*.label`) name more commands than the page enables (`ALL_OPTIONAL_FEATURES` plus `createFigureFeature` in `WorkflowPublicationBodyText.vue`). Test run 2026-09-25 (the greyed state), OJS: on a never-saved Body Text, right after a click into the empty editor the focus stood in the editor's editable area and every control but "Text style" and "Insert" was still greyed ("Bold" stayed disabled for 10 s); after one typed letter "Bold" was enabled, and a later click into the paragraph kept it so. The claim check read the same greyed state after the click.

<a id="fn-e"></a>
**e** — Public download: `PKPJatsController::getGroupRoutes()` registers `GET download` (`publicDownload`) with `[RedirectGuestToLogin, 'has.user']` middleware only when the context's `restrictArticleAccess` is set; `authorize()` for `publicDownload` adds only `SubmissionRequiredPolicy`, `SubmissionCompletePolicy`, `PublicationRequiredPolicy`, `PublicationIsSubmissionPolicy`. `publicDownload()`: 403 `api.403.unauthorized` unless `jatsPublicVisibility`; when the publication is not `STATUS_PUBLISHED`, 403 unless `Repo::submission()->canPreview($user, $submission)`; content from `Repo::jats()->getPublicJatsContent()` (`Cache::remember("jats-public-content-{publicationId}", 24 h)`; `clearPublicJatsCache()` runs on `addJatsFile()`, `delete()` and `setVisibility()` only); file name `($publication->urlPath ?? "submission-{bestId}-") . "publication-{id}"` + `-jats.xml`; `Cache-Control` `public, no-cache` when published, `private, no-store` otherwise, with an ETag. Link: OJS `ArticleHandler::view()` assigns `jatsDownloadUrl` (the API route `submissions/{id}/publications/{pid}/jats/download`) when `$publication->jatsPublicVisibility`; `templates/frontend/objects/article_details.tpl` renders `.item.jats` › `a.obj_galley_link.xml` "JATS XML" (`publication.jats.download`) right after the primary galleys list. The label of Settings bullet 2: OJS `UserAccessForm` field `restrictArticleAccess`, label `manager.setup.siteAccess.viewContent` "View Article Content", option `manager.setup.restrictArticleAccess`; tab `manager.siteAccessOptions.siteAccessOptions` "Site Access Options" (`lib/pkp/templates/management/access.tpl`).

<a id="fn-d12"></a>
**d12** — Live-probed 2026-09-25 (Actors row 7; Rule 10), OJS: on published articles with the box ticked, "JATS XML" sat in its own block right after the galley block (after "PDF"; alone with no galley) and downloaded "submission-50-publication-52-jats.xml" (likewise 51/53, 52/54) for a signed-out visitor, a Reader, another Author, the submitting Author and the Journal Manager; the generated content was byte-identical to the page's own "Download", and an uploaded file's likewise. A version never ticked had no link; after the Journal Manager's untick the link went, and its saved address answered the raw error text of Rule 11 (403). Not driven: a supplementary galley, whose link the template places after the "JATS XML" block. OMP's book page and OPS's preprint page carry no "JATS" anywhere.

<a id="fn-d13"></a>
**d13** — Live-probed 2026-09-25 (Actors row 7; Rule 11), OJS: on an unpublished version with the box ticked, the Journal Manager's "Preview" (from "Title & Abstract" it opens `/article/view/{n}/version/{m}`) listed "JATS XML", and it downloaded (`Cache-Control: no-store, private`); the address downloaded for the Editor too. The submitting Author had no "Preview" on the stage page or on "Title & Abstract" (two runs), yet the copied address downloaded for them. Another Author, a Reader and a signed-out visitor got the raw `{"error":…}` text (403), and "404 Not Found" on the Preview page. With the box unticked: no link on "Preview", and the same 403 for the Journal Manager.

<a id="fn-d14"></a>
**d14** — Live-probed 2026-09-25 (Rules 12, 12a; A8), OJS: on a published article the Journal Manager changed "Title" and saved; the "JATS XML" page and the article page showed the new title, but the article page's "JATS XML" still served the old one, signed out and as the manager, and in a second run for a first-time visitor in a fresh browser. Unticking and re-ticking the box refreshed it, and "Delete JATS File" and a new "Upload" each refreshed it (seen through "Preview"). Before publication the Journal Manager downloaded "JATS XML" from "Preview" (no `<pub-date>`), changed "Title" and published; the article page's "JATS XML" then served a file byte-identical to the preview's, old title and no `<pub-date>`, signed out and for a fresh browser in a later run. Only the title was edited; the 24-hour bound is note e's `Cache::remember()`.

<a id="fn-f"></a>
**f** — `WorkflowPublicationJats.vue`: `PkpHeader` › `h2` `publication.jats`; `CodeHighlighter` `language="xml"` for `jatsContent`; footer `publication.jats.autoCreatedMessage` "This JATS file is generated automatically by the submission metadata" when `isDefaultContent`, else `publication.jats.lastModified` "Last Modification at {$modificationDate} by {$username}" with `workingJatsProps.updatedAt` and `uploaderUserName`; hidden `FileUploader` (`submission.upload.percentComplete`) posting to the JATS API with `fileStage = SUBMISSION_FILE_JATS`; while loading, a spinner in place of the box. "Delete" carries `:disabled="isLoading"`, but a watch on it during "Delete JATS File" recorded no greyed state (live-probed 2026-09-25, one run), so the Fields table claims none.

<a id="fn-g"></a>
**g** — `WorkflowPublicationBodyText.vue`: `PandocConverter` above the editor; `sciflow-formatbar` and `sciflow-editor`; right `aside` labelled `publication.bodyText.documentPanel` "Document Edit" with "Save" (`common.save`, `form.saved` "Saved" for 1500 ms after a successful PUT), `Badge` `common.unsavedChanges` "Unsaved Changes" (`v-show="isDirty"`, dirty = the serialized document differs from the last saved one), "Fullscreen" / "Exit fullscreen" (`common.fullscreen` / `common.exitFullscreen`, `aria-pressed`; `useFullscreenFocusTrap` with `onEscape: exitFullscreen`); three `details` sections from `sidebarSections`: `references` (`submission.citations` "References", hint `publication.bodyText.references.dragHint`, `sciflow-reference-list`), `selected-element` (`publication.bodyText.selectedElement` "Selected Element", `sciflow-selection-editor`), `outline` (`publication.bodyText.outline` "Document Outline", `sciflow-outline levels="1-3"`); `openAccordionSection` starts at `references` and holds one key; `handleSelectionChange()` opens `selected-element` on a range or node selection. `navigationGuard` (registered through `workflowStore.setNavigationGuard`) returns `window.confirm(t('form.dataHasChanged'))` "The data on this form has changed. Do you wish to continue without saving?" when dirty and the target key differs from the active one; there is no `beforeunload` handler, and no drive saw the question (d17; A15). Editor empty-state strings: `referenceList.noReferences` "No references yet.", `selectionEditor.noElement`, `outline.noHeadings` "No headings yet.", `outline.insertCrossReference` "Insert ref", `referenceList.insertCitation` "Cite" (`@sciflow/editor-core` `i18n/en.js`).

<a id="fn-h"></a>
**h** — `PKPJatsController::get()` → `Repo::jats()->getJatsFile()` → `new JatsFile()`: with no `SUBMISSION_FILE_JATS` file hung on the publication (`ASSOC_TYPE_PUBLICATION`), `createDefaultJatsContent()` builds the XML on every call through `APP\plugins\generic\jatsTemplate\classes\Article::convertSubmission()` (front from `ArticleFront::create()`: `journal-meta` with journal title, ISSNs, publisher; `article-meta` with `subj-group` for the section, `title-group`, `contrib-group` with affiliations and ORCID, `pub-date`/`issue` when an issue is assigned, `permissions`/`license`, `kwd-group`, `funding-group`, abstracts through `JatsHelper::htmlToJatsElement()`, which converts `<ul>`/`<ol>` to `<list list-type="bullet|order">`; back from `ArticleBack::create()`: `ref-list` with each citation as `mixed-citation` and each data citation as `element-citation publication-type="data"`, data-availability statements; open peer reviews as sub-articles via `PeerReview::create()`). A failure raises `UnableToCreateJATSContentException`, surfaced as `loadingContentError` `publication.jats.defaultContentCreationError` ("An error occured when trying to create the default JATS content. Please make sure that the JatsTemplate plugin is installed."), unreachable on a stock install because the class autoloads (note u).

<a id="fn-i"></a>
**i** — `WorkflowPublicationJats.vue` watches `publication` (`immediate`) and calls `fetchWorkingJatsFile()` on every change; nothing on the workflow side caches the generated XML (only the public copy is cached, note e).

<a id="fn-d7"></a>
**d7** — Live-probed 2026-09-25 (Rules 1, 2), OJS: a keyword saved on "Metadata", ISSNs saved on Settings › Journal › "Masthead", a license URL on "Permissions & Disclosure" and a funder on "Funding" each appeared in the XML on the next opening. The XML carried the journal title, both ISSNs, the section "Articles", the title, the author with the affiliation, the abstract's bulleted list as `<list list-type="bullet">`, the keywords, the license, the funder with its award number, the volume and number on a scheduled version, and a reference list with both references and the data citation. A published version without a license carried the copyright statement only.

<a id="fn-j"></a>
**j** — `ArticleBody::create($submission)` reads `$submission->getCurrentPublication()->getData('galleys')`, not the publication passed to `convertSubmission()` (A6); galleys sorted HTML first, then PDF, then others; for `text/html` it runs HTMLPurifier with `HTML.Allowed = 'p'` over the file and then `createElement('p', htmlspecialchars($text, ENT_IGNORE))`, so the purified `<p>` tags become escaped text inside one `<p>` (A7); other types go through `SearchFileParser`, which needs an `index[mime]` helper in `config.inc.php` (none on the test installs; seed-facts: PDF full text is not indexed, and the PDF fixtures hold no text). No text → no `<body>`.

<a id="fn-d8"></a>
**d8** — Live-probed 2026-09-25 (Rule 2a; A7), OJS: with an HTML galley made from `article.html` (and from a two-paragraph fixture), the XML's `<body>` held one `<p>` with the galley's `<p>` tags as escaped text, the heading run into it and inline emphasis dropped; with a PDF galley only, no `<body>`.

<a id="fn-d9"></a>
**d9** — Live-probed 2026-09-25 (Rule 2a; A6), OJS: a published version with a PDF galley › "Create New Version" › an HTML galley added on the new version's "Galleys": the new version's XML had no `<body>`. A published version with an HTML galley › "Create New Version": the new version's XML carried that galley's body, and still did after the new version's copied galley was deleted.

<a id="fn-k"></a>
**k** — Upload: `openFileBrowser()` clears `newJatsFiles` and opens the hidden `FileUploader`; on the API response (`isDefaultContent` present) it notifies `submission.uploadSuccessful` "Your file has been uploaded." (success). `PKPJatsController::add()` → `Repo::jats()->addJatsFile()`: no type or content check (only `UPLOAD_ERR_OK`); an existing uploaded file is revised with `Repo::submissionFile()->edit()` (new `fileId`, uploader, name), else a new submission file is added with `fileStage = SUBMISSION_FILE_JATS`, `assocType = ASSOC_TYPE_PUBLICATION`, the genre only when the context has exactly one enabled genre. Delete dialog: `publication.jats.confirmDeleteFileTitle` "Confirm deleting JATS XML", `…confirmDeleteFileMessage`, `…confirmDeleteFileButton` "Delete JATS File" (warnable), `common.cancel`; `Repo::jats()->delete()` deletes the one record ("revisions cascade via FK"). More Information: `useLegacyGridUrl` `informationCenter.FileInformationCenterHandler` `viewInformationCenter`, title `informationCenter.informationCenter` + ": " + the file name; on close `fetchWorkingJatsFile()`. Download: default content → a `Blob` saved as `jats-{publicationId}-{YYYYMMDD}-{HHMMSS}.xml` from the browser's `Date`; uploaded → an anchor on the file's `url`.

<a id="fn-d10"></a>
**d10** — Live-probed 2026-09-25 (Rules 4, 5), OJS: after "article.xml" then "jats-second.xml", the content and the line's time changed, "More Information" was titled "Information Center: jats-second.xml", and its "History" read "A file revision "jats-second.xml" was uploaded for submission {n} by {username}." above "A file "article.xml" was uploaded …"; "Download" saved "jats-second.xml". "Delete" opened the quoted window; "Cancel" kept the file; "Delete JATS File" (200) returned the generated XML with its line, and "More Information" and "Delete" went.

<a id="fn-d11"></a>
**d11** — Live-probed 2026-09-25 (Rule 7), OJS: the generated XML saved as "jats-72-20260925-035028.xml" (72 the version's internal number; the time by the browser's clock, 03:50, against the server's 01:50); uploaded files saved under their own names ("article.xml", "not-an-image.txt", "jats-second.xml"). The state in which the XML cannot be produced was not reached: with the "JATS Template Plugin" off the page still generated (note u).

<a id="fn-d30"></a>
**d30** — Live-probed 2026-09-25 (Rule 8; Actors row 2; A12, A3), OJS: a version published on screen and a seed-published one offered "Upload" and "Delete" to the Journal Manager, the Site Administrator and an assigned Section Editor, and "More Information", "Download" and the box to the Layout Editor, as before publication. An "Upload" on a published version replaced its content (200, toast, new line), and "Delete JATS File" removed a published version's file (200), each changing what the article page's link served. A scheduled version offered the same. The status constants read undefined on the page (note c).

<a id="fn-l"></a>
**l** — `handleVisibilityChange()`: dialog `publication.jats.enableVisibilityTitle` "Enable JATS XML Download" / `…enableVisibilityMessage`, or `…disableVisibilityTitle` "Disable JATS XML Download" / `…disableVisibilityMessage`; actions `common.confirm` (→ `updateVisibility()`, `PUT …/jats/visibility {jatsPublicVisibility}`, which edits the publication and clears the public cache) and `common.cancel` (resets `event.target.checked`). On error `ajaxErrorCallback` shows the error; the box keeps the state the person set (live-probed 2026-09-25, d2; A1). No success toast. Schema: `publication.json` `jatsPublicVisibility` boolean, default false.

<a id="fn-m"></a>
**m** — lib/pkp `publication/Repository::version()` clones the publication (so `jatsPublicVisibility` carries over), then copies a non-default JATS file with `Repo::submissionFile()->versionSubmissionFile()` (a new stored file) and the media files; there is no copy of the `SUBMISSION_FILE_BODY_TEXT` file (A4). Live-probed 2026-09-24 (U46, note q15): the JATS XML (OJS) and the media files were copied as files of their own.

<a id="fn-d15"></a>
**d15** — Live-probed 2026-09-25 (Rule 13; Fields, the tick box; A4), OJS, two runs: with an uploaded file, the box ticked and "Version one text" saved on version 1, then publishing and "Create New Version", the new version's "JATS XML" showed the uploaded XML with "Upload", "More Information", "Delete", "Download" and the box ticked (also for a copy made by the Editor). "Delete JATS File" on the new version left version 1's file in place; a version with no upload gave a new one generating its own XML, box ticked. The copy's line read the time of "Create New Version" and the original uploader's username: a copy made by the Editor named the Journal Manager who had uploaded. The new version's "Body Text" opened empty; version 1 kept its text.

<a id="fn-n"></a>
**n** — `PKPBodyTextController::get()` → `Repo::bodyText()->getBodyTextFile()`; with no `SUBMISSION_FILE_BODY_TEXT` file the content is `{"type":"doc","content":[]}`. `save()` → `setBodyText()`: the first save adds a submission file named "bodyText.json" (`assocType = ASSOC_TYPE_PUBLICATION`), later saves store a new file and `edit()` the record's `fileId` (deleting the old stored file). The client posts the whole document as JSON (`FormData bodyText`); `saveDocument()` returns early only when no document is loaded, so an unchanged "Save" still posts.

<a id="fn-d16"></a>
**d16** — Live-probed 2026-09-25 (Rules 14, 15; Fields, "Save" and "Unsaved Changes"; A14), OJS, two runs: on arrival at a never-saved version (new versions and versions nobody had edited) the badge showed beside "Save" over an empty editor; after the first "Save" it did not show on arrival. Typing "First sentence" showed it; "Save" hid it, and the button read "Saved" from 0.1 to 1.3 s and "Save" at 2.0 s; the text survived a reload. Typing " extra" then six Backspaces, or "Z" then "Undo", hid the badge; "Save" with nothing changed saved again.

<a id="fn-d17"></a>
**d17** — Live-probed 2026-09-25 (Rule 16; A15), OJS, every run of three drives: with "Unsaved Changes" showing, choosing "Galleys" or "JATS XML" in the side menu, closing the workflow, reloading and closing the tab each left with no question and no browser dialog; back on "Body Text" only the saved text was there. Choosing "Body Text" itself kept the text.

<a id="fn-o"></a>
**o** — `transformCitationsForEditor(publication.citations)` feeds `sciflow-reference-list`; `syncReferenceListHighlight()` highlights the ids `getCitedReferenceIds()` finds in the document or in the selection. Live-probed 2026-09-24 (U42 claim check): the side panel listed each reference under "References" with "Drag references into the editor to place an in-text citation." and "Cite".

<a id="fn-d18"></a>
**d18** — Live-probed 2026-09-25 (Rule 17; Fields, "References"; A16), OJS, two runs and a rerun: "References" was open on arrival with the hint and each reference with "Cite" and a drag handle, and read "No references yet." on a version without references. "Cite" stayed disabled on arrival, with the cursor after typed text, after a click in a paragraph and with a word double-clicked. Dragging a reference into the text inserted a citation and highlighted that reference. A mouse selection of a paragraph without a citation highlighted none, of the cited paragraph that reference, and a collapsed cursor every cited reference; keyboard selections changed nothing.

<a id="fn-d19"></a>
**d19** — Live-probed 2026-09-25 (Rules 18, 19; Fields, "Selected Element", "Document Outline"; A17), OJS, two runs and two reruns: "Fullscreen" filled the window and read "Exit fullscreen"; Escape or that button restored the page, the workflow staying open. Pressing "Document Outline" or "Selected Element" with "References" open left all three closed, and a second press opened it. A double-click selection opened "Selected Element" with no section open and closed an open section otherwise; a keyboard selection changed nothing. With one "Heading 1" in the text, "Document Outline" listed a button named after it, with no "Insert ref", on hover either; figures in the outline were not driven.

<a id="fn-p"></a>
**p** — `useWorkflowVersionForm.js` `goToBodyTextWithImport()` sets the query parameters `importFileUrl` and `importFileName` and navigates to `publication_{id}_bodyText`, after creating the version (POST `…/version`) or assigning a version stage (PUT) when chosen, or directly for an existing staged version. `PandocConverter.vue` watches them once per mount (`autoImportDone`) after the editor is ready: status box `role="status"` with `publication.bodyText.import.importing` "Importing document" and the stage label (`…downloading` "Downloading document…", `…loadingConverter` "Loading converter…", `…converting` "Converting…", `…uploadingImages` "Uploading images…"); pandoc-wasm (`js/build/pandoc.wasm`, self-hosted, loaded on first use) converts to HTML with `extract-media`; `rewriteImages()` uploads each extracted image through the page's figure upload; `emit('html-ready')` → `editorView.pasteHTML(html)` at the current selection; the parameters are cleared in `finally`. Failure: `publication.bodyText.import.failed` "Import failed", the error message, `common.dismiss` "Dismiss"; the drives never reached this box (live-probed 2026-09-25, d20): a file the converter cannot read ends with the box gone and no message (Rule 20b; A18). There is no import control of its own on the page.

<a id="fn-d20"></a>
**d20** — Live-probed 2026-09-25 (Rules 20, 20a, 20b; A14, A18), OJS, two runs: "Send to Text Editor" on "notes.md" and on a Word file holding a heading, two paragraphs and an image › an existing version › "Confirm" opened that version's "Body Text" with the box's steps in order ("Uploading images…" for the Word file only); the heading, the text and the figure with its caption arrived, with "Unsaved Changes". After a reload without "Save" the text was gone and the import did not run again. "Create New Version" in the window created the version and opened its "Body Text" with the import. Into a saved "Saved first line K3" both files landed before it. Into a never-saved version the Word file made the button read "Saved" beside the badge (the Body Text was saved, then the image uploaded). A text file named ".docx" ran to "Converting…", then the box went with no message and no "Dismiss", and the editor kept its text.

<a id="fn-d21"></a>
**d21** — Live-probed 2026-09-25 (Rule 21; A3), OJS: on a seed-published version (two runs) and on one published on screen, the Journal Manager's "After publication" saved on "Body Text" and survived a reload; the same version's "JATS XML" offered "Upload" (Rule 8).

<a id="fn-q"></a>
**q** — `createFigureFeature({imageUpload: {uploadFile: handleFigureUpload}})`; `handleFigureUpload()` calls `saveDocument()` first when the Body Text has no record yet, then posts the image to `submissions/{id}/files` with `fileStage = SUBMISSION_FILE_DEPENDENT`, `assocType = ASSOC_TYPE_SUBMISSION_FILE`, `assocId` = the Body Text file. The "Media" page lists `SUBMISSION_FILE_MEDIA` files hung on the publication (U47), so a dependent file of the Body Text is not among them. GET returns `dependentFiles` for the editor.

<a id="fn-d22"></a>
**d22** — Live-probed 2026-09-25 (Rule 22; A14), OJS, two runs: "Insert" › "Insert figure" opened an image-only chooser; "figure.png" uploaded at once and appeared in the text, with "Unsaved Changes". On a never-saved version the Body Text was saved first, then the image; after a reload without "Save", "Text before figure K3" was there and the figure was not. On a saved version a reload without "Save" lost both the figure and the text typed before it. The version's "Media" page read "No Items" after an inserted and after an imported figure.

<a id="fn-r"></a>
**r** — No reader-side or JATS code reads `SUBMISSION_FILE_BODY_TEXT`: the only users are `bodyText/Repository.php`, `PKPBodyTextController`, the file-stage lists (`SubmissionFile\Repository`, `PKPSubmissionFileController::getMany()` allowed stages, `PKPDashboardHandler` constants); `ArticleBody::create()` reads galleys only (note j); OJS `ArticleHandler` and `templates/frontend` carry nothing for it.

<a id="fn-d23"></a>
**d23** — Live-probed 2026-09-25 (Rule 23; A5), OJS, two runs: a sentence saved on the "Body Text" of a published version with no galley appeared neither in the "JATS XML" page's XML (no `<body>`) nor on the signed-out article page or in its downloaded XML; with an HTML galley the XML's body was the galley's text, and the galley view carried nothing of the sentence.

<a id="fn-s"></a>
**s** — `SubmissionFile\Repository::add()` logs `SUBMISSION_LOG_FILE_UPLOAD` on the file (`submission.event.fileUploaded` "A file "{$filename}" was uploaded for submission {$submissionId} by {$username}.") and `SUBMISSION_LOG_FILE_REVISION_UPLOAD` on the submission (`submission.event.fileRevised` "Revision "{$filename}" was uploaded for file {$submissionFileId}."); `edit()` with a new `fileId` logs `submission.event.revisionUploaded` "A file revision "{$filename}" was uploaded for submission {$submissionId} by {$username}." on both; `delete()` logs `submission.event.fileDeleted` "A file "{$filename}" was deleted for submission {$submissionId} by {$username}." on both. Neither controller sends mail or creates notifications.

<a id="fn-d24"></a>
**d24** — Live-probed 2026-09-25 (Side effects), OJS, two runs: after two uploads, "Delete JATS File" and three Body Text saves (the third unchanged), "History" gained one line per action, newest first: "A file revision "bodyText.json" was uploaded for submission {n} by {username}." twice, "Revision "bodyText.json" was uploaded for file {id}.", "A file "k3-second.xml" was deleted for submission {n} by {username}.", "A file revision "k3-second.xml" was uploaded for submission {n} by {username}.", "Revision "article.xml" was uploaded for file {id}.", each naming the Journal Manager in its user column. The mail catcher's count for each of the twelve scratch users and the header's Tasks count were unchanged.

<a id="fn-t"></a>
**t** — `publicDownload()` fires `UsageEvent(assocType: ASSOC_TYPE_JATS)` only when the XML has a `<body>` element; `TemporaryTotalsDAO` loads `ASSOC_TYPE_JATS` rows into `metrics_submission`; `StatsHandler::getTableColumns()` adds the "JATS" column (`stats.jats`) and `PKPStatsPublicationService` counts `ASSOC_TYPE_JATS` only while `isJatsPluginAvailable()` (the plugin enabled). Usage stats are compiled by a scheduled job, so the count is not observable on a test install within a test.

<a id="fn-u"></a>
**u** — `plugins/generic/jatsTemplate`: `JatsTemplatePlugin` (display name `plugins.generic.jatsTemplate.displayName` "JATS Template Plugin"; description "Automatically generate a minimal JATS document from submission metadata when no JATS document is otherwise available."), `settings.xml` `enabled = true` as its context settings file; when enabled it hooks `OAIMetadataFormat_JATS::findJats` and `LoadHandler` (the `jatsTemplate/download` page, note in the Reference table). `Repo::jats()::convertSubmissionToJatsXml()` only checks `class_exists(Article::class)`, and `APP\plugins\` is PSR-4 autoloaded (`lib/pkp/composer.json`), so the workflow page and the public download generate with the plugin disabled. The OAI JATS records also need the "JATS Metadata Format" plugin (`OAIMetadataFormatPlugin_JATS`, "Structures metadata in a way that is consistent with the JATS XML format."), unticked on a new journal and on the seeded journal (live-probed 2026-09-25, d25); the OAI interface is linked from nowhere in the app and was not opened, so the body states nothing about OAI.

<a id="fn-d25"></a>
**d25** — Live-probed 2026-09-25 (Settings bullet 1), OJS: "JATS Template Plugin" was ticked on a new journal and on the seeded journal, and Statistics › "Articles" showed a "JATS" column on both. On a scratch journal seeded with it off: no "JATS" column (again after switching it on and off); the "JATS XML" page still generated with "Download", on a version in Production and on a published one; the published link downloaded the generated XML. OMP's and OPS's Plugins lists have no JATS row.

<a id="fn-d26"></a>
**d26** — Live-probed 2026-09-25 (Settings bullet 2; A19), OJS, two runs: the box sits under "View Article Content", unticked on a new journal and on the seeded journal. With it ticked, a signed-out press on "JATS XML" led to the Login page (`login?source=…/jats/download`); signing in there downloaded the file while the tab stayed on the Login page with an empty form and "Register" and "Login" in the header; a reader signed in beforehand downloaded at once. The seeded journal downloaded signed out. OMP's and OPS's "Site Access Options" carry the same box, under "View Monograph Content" and "View Preprint Content".

<a id="fn-d31"></a>
**d31** — Live-probed 2026-09-25 (Settings bullet 3; Actors), OJS, two runs: Roles › "Layout Editor" › "Edit" lists "Permit submission metadata edit." unticked under "Role Options"; the assignment's "Edit Assignment" window carries "Permissions" with "Allow this person to make changes to the publication, such as the title, abstract, metadata and other publication details. …". A Layout Editor whose assignment carried it got "Upload", "More Information", "Delete", "Download" and working saves; at the default, "More Information", "Download" and refusals. Ticking the role's box and pressing "OK" made a default Layout Editor's save succeed; unticking it again took the permission from the Layout Editor whose assignment had carried it.

<a id="fn-v"></a>
**v** — Scenario seeding. Every article is a scratch submission from `POST scenarios/submission`, brought to Production with `decisions: ['sendExternalReview', 'accept', 'sendToProduction']` unless said otherwise; the published ones add `published: true`. Scenarios 2 to 6 run on `publicknowledge` as `manager.maya` (the Journal Manager), with `author.alex` as submitter; passwords as `docs/process/users.md` gives them. The mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), scoped by recipient address. Scenarios 1, 7 and 8 run on their own scratch journal from `POST scenarios/context`, with throwaway `users[]` (password: the username twice): `manager` and `author` (the submitter), and `reader` in scenario 8. Scenario 1: `title: 'JATS scenario article'`, an `abstract` holding a `<ul>` with "First point" and "Second point", `citationsRaw` the two reference lines, `galleys: [{label: 'HTML', file: 'article.html'}]`; the upload is the fixture `article.xml` (a small JATS article titled "A JATS fixture article"). Scenario 2: `citationsRaw` the same two lines, `files: [{file: 'notes.md'}]` (the fixture opens with the Markdown heading "Notes"); "Insert figure" takes the fixture `figure.png`. Scenario 3: the Production article with `participants: [{username: 'layouteditor.leo', role: 'layoutEditor'}]` (`canChangeMetadata` left to the role, unticked at the install default) and `jats: {file: 'article.xml'}`; the Review article with `decisions: ['sendExternalReview']`, `participants: [{username: 'assistant.rita', role: 'funding'}]` and `jats: {file: 'article.xml'}`. Scenario 4: `galleys: [{label: 'PDF', file: 'article.pdf'}]` and no `jats` key; the visitor is a browser with no session. Scenario 5: `jats: {makePublic: true}`, unpublished; another Author `author.bea`, the Reader `reader.rosa`. Scenario 6: `jats: {file: 'article.xml', makePublic: true}`; the seed uploads as `admin`, so both lines read "by admin". Scenario 7: the context with `plugins: {jatstemplateplugin: {enabled: false}}`, the article with `jats: {makePublic: true}`; the control runs on `publicknowledge` as `manager.maya`. Scenario 8: the context with `restrictArticleAccess: true`, the article with `jats: {makePublic: true}`. Scenario 9: OMP and OPS `publicknowledge` as `manager.maya` (the Press Manager, the Preprint Server Manager), the submission `published: true`, on OMP after `decisions: ['skipExternalReview', 'sendToProduction']`, on OPS with none.

<a id="fn-f-a1"></a>
**f-a1** — Note c: the tick box's only guard is `loadingContentError == null`; `updateVisibility()` hits `PublicationWritePolicy`, which refuses a user whose assignment lacks `canChangeMetadata` (`api.submissions.403.userCantEdit`, answered 401); the box is not reset (note l). Probe: d2.
Issue report: [pkp-e2e#567](https://github.com/jardakotesovec/pkp-e2e/issues/567) ([docs/issues/U48-A1-jats-make-available-offered-then-refused.md](../issues/U48-A1-jats-make-available-offered-then-refused.md)).

<a id="fn-f-a2"></a>
**f-a2** — Note c: `workflowConfigEditorialOJS.js` passes no `canEdit` to `WorkflowPublicationBodyText`, which renders "Save" unconditionally; the save goes through `PublicationWritePolicy` (401). Probe: d3.
Issue report: [pkp-e2e#568](https://github.com/jardakotesovec/pkp-e2e/issues/568) ([docs/issues/U48-A2-body-text-save-offered-then-refused.md](../issues/U48-A2-body-text-save-offered-then-refused.md)).

<a id="fn-f-a3"></a>
**f-a3** — Notes c and g: the Body Text page has no status check, and `canEditPublication()` lets editorial roles write to published versions; the JATS page's published-status test never matches (A12). Probe: d21, d30.

<a id="fn-f-a4"></a>
**f-a4** — Note m. Probe: d15.

<a id="fn-f-a5"></a>
**f-a5** — Note r. The feature arrived with the SciFlow editor (`@sciflow/editor-start` ^0.0.3 in ui-library `package.json`). Probe: d23.

<a id="fn-f-a6"></a>
**f-a6** — Note j: `$submission->getCurrentPublication()` inside `ArticleBody::create()`, while `ArticleFront` and `ArticleBack` use the publication passed in. Probe: d9.
Issue report: [pkp-e2e#563](https://github.com/jardakotesovec/pkp-e2e/issues/563) ([docs/issues/U48-A6-jats-body-from-current-version-galleys.md](../issues/U48-A6-jats-body-from-current-version-galleys.md)).

<a id="fn-f-a7"></a>
**f-a7** — Note j: purify to `<p>` only, then `htmlspecialchars()` into a single `createElement('p', …)`. Probe: d8.
Issue report: [pkp-e2e#564](https://github.com/jardakotesovec/pkp-e2e/issues/564) ([docs/issues/U48-A7-jats-body-html-markup-as-text.md](../issues/U48-A7-jats-body-html-markup-as-text.md)).

<a id="fn-f-a8"></a>
**f-a8** — Note e: the 24-hour `Cache::remember()` is cleared only by upload, delete and the visibility change; neither `Repo::publication()->edit()` nor publishing clears it, so a copy cached from "Preview" (whose download goes through the same `getPublicJatsContent()`) outlives publication. Probe: d14.
Issue report: [pkp-e2e#569](https://github.com/jardakotesovec/pkp-e2e/issues/569) ([docs/issues/U48-A8-published-jats-xml-stays-old-after-edit.md](../issues/U48-A8-published-jats-xml-stays-old-after-edit.md)).

<a id="fn-f-a9"></a>
**f-a9** — Note e: the `urlPath` branch appends no hyphen before "publication-". The returning reader's old name: the response's ETag hashes the XML alone, so an unchanged XML answers "not modified" and the browser reuses the earlier `Content-Disposition`. Probe: d27.
Issue report: [pkp-e2e#570](https://github.com/jardakotesovec/pkp-e2e/issues/570) ([docs/issues/U48-A9-published-jats-xml-name-url-path.md](../issues/U48-A9-published-jats-xml-name-url-path.md)).

<a id="fn-d27"></a>
**d27** — Live-probed 2026-09-25 (Rule 10; A9), OJS, two runs: "URL Path" "my-article" saved on the published version's "Publication Settings" gave "my-articlepublication-57-jats.xml", and "k2-second" gave "k2-secondpublication-54-jats.xml" to a first-time visitor. Clearing the path gave a first-time visitor "submission-55-publication-57-jats.xml", while the browser that had downloaded before got "my-articlepublication-57-jats.xml" again; after "k2-second" was set, the returning browser got "submission-52-publication-54-jats.xml".

<a id="fn-f-a10"></a>
**f-a10** — Note k: no MIME or extension check in `addJatsFile()`, and `FileUploader` gets no accepted-types option from the page. Probe: d4.

<a id="fn-f-a11"></a>
**f-a11** — Note c: the uploaded file's "Download" is an anchor on the file's own `url` (`FileApiHandler`, stage Production); for a role without Production in its stage set the handler answers its JSON refusal, which the browser saves as "download-file.json". Probe: d1.
Issue report: [pkp-e2e#561](https://github.com/jardakotesovec/pkp-e2e/issues/561) ([docs/issues/U48-A11-jats-download-saves-refusal-json.md](../issues/U48-A11-jats-download-saves-refusal-json.md)).

<a id="fn-f-a12"></a>
**f-a12** — Note c: `WorkflowPublicationJats.vue` withdraws "Upload" and "Delete" on `STATUS_PUBLISHED`, a constant undefined on the workflow page, so the test never matches; the server's `PublicationCanBeEditedPolicy` lets editorial roles write to a published version. Probe: d30.
Issue report: [pkp-e2e#554](https://github.com/jardakotesovec/pkp-e2e/issues/554) ([docs/issues/U48-A12-published-jats-upload-delete-offered.md](../issues/U48-A12-published-jats-upload-delete-offered.md)).

<a id="fn-f-a13"></a>
**f-a13** — Live-probed 2026-09-25 (Rule 3), OJS, as a first upload and over a text file: the upload of "figure.png" answered 500 on `POST …/api/v1/submissions/{id}/publications/{pid}/jats`, yet the file was stored ("More Information" and "Delete" offered on reopening); every reopening answered 500 on `GET …/jats`, and "More Information" 500 on `GET $$$call$$$/information-center/file-information-center/view-information-center?submissionFileId=undefined…`. No type check on upload (note k). Probe: d4.
Issue report: [pkp-e2e#562](https://github.com/jardakotesovec/pkp-e2e/issues/562) ([docs/issues/U48-A13-jats-image-upload-breaks-page.md](../issues/U48-A13-jats-image-upload-breaks-page.md)).

<a id="fn-f-a14"></a>
**f-a14** — Note g: the badge is `v-show="isDirty"`, true on arrival at a never-saved version (the console then warns "TextSelection endpoint not pointing into a node with inline content (doc)"). The "Saved" during an import: `handleFigureUpload()` saves the document first when no Body Text record exists (note q), and the import uploads its images before it pastes the text (note p). Probe: d16, d20.
Issue report: [docs/issues/U48-A14-body-text-opens-with-unsaved-changes.md](../issues/U48-A14-body-text-opens-with-unsaved-changes.md).
Issue report: [docs/issues/U48-A14-body-text-import-reads-saved-while-unsaved.md](../issues/U48-A14-body-text-import-reads-saved-while-unsaved.md).

<a id="fn-f-a15"></a>
**f-a15** — Note g: `navigationGuard` would ask `form.dataHasChanged`, yet no drive saw it or any browser dialog; there is no `beforeunload` handler. Probe: d17.
Issue report: [docs/issues/U48-A15-body-text-leaving-loses-text-unasked.md](../issues/U48-A15-body-text-leaving-loses-text-unasked.md).

<a id="fn-f-a16"></a>
**f-a16** — `referenceList.insertCitation` "Cite" in `sciflow-reference-list` (note g) stayed disabled in every state tried. Probe: d18.
Issue report: [pkp-e2e#565](https://github.com/jardakotesovec/pkp-e2e/issues/565) ([docs/issues/U48-A16-body-text-cite-never-enabled.md](../issues/U48-A16-body-text-cite-never-enabled.md)).

<a id="fn-f-a17"></a>
**f-a17** — Note g: `openAccordionSection` holds one key; `handleSelectionChange()` opens `selected-element` on a range or node selection. Probe: d19.
Issue report: [pkp-e2e#566](https://github.com/jardakotesovec/pkp-e2e/issues/566) ([docs/issues/U48-A17-body-text-side-section-needs-two-presses.md](../issues/U48-A17-body-text-side-section-needs-two-presses.md)).

<a id="fn-f-a18"></a>
**f-a18** — Note p: the box's failure state never showed; the import ended with no status. Probe: d20.
Issue report: [docs/issues/U48-A18-body-text-unconvertible-file-no-message.md](../issues/U48-A18-body-text-unconvertible-file-no-message.md).

<a id="fn-f-a19"></a>
**f-a19** — Note e: `RedirectGuestToLogin` sends the visitor to `login?source=…/jats/download`; after `login/signIn` the browser follows to the download, whose attachment response leaves the tab on the Login page. Probe: d26.

<a id="fn-f-a20"></a>
**f-a20** — Test run 2026-09-25, OJS, scenario 1 in the green run and a rerun of scenarios 1, 3 and 6: the screen showed the upload as Rule 3 says (the toast, the uploaded XML, the line), and the worker servers' logs (`apps/ojs/playwright/.server-logs/server-<port>.log`, one per worker port; `docs/process/harness.md` "Server output") held "PHP Warning: foreach() argument must be of type array|object, string given in …/lib/pkp/classes/core/PKPBaseController.php on line 428" right before the upload's `POST …/submissions/{n}/publications/{m}/jats` (200), once per run and on no other request; no 5xx. A seeded `jats.file` (scenarios 3 and 6) logged none. Code: `PKPJatsController::add()` runs `convertStringsToSchema(SCHEMA_SUBMISSION_FILE, …)` on the upload's form fields, and a field the submission-file schema declares multilingual arrives as a plain string, which `convertStringsToSchema()` walks as a locale map. The same class as U47 A6 (note f-a6 there).
Issue report: [pkp-e2e#494](https://github.com/jardakotesovec/pkp-e2e/issues/494) ([docs/issues/U47-A6-media-jats-upload-server-log-warning.md](../issues/U47-A6-media-jats-upload-server-log-warning.md)).

<a id="fn-f-a21"></a>
**f-a21** — Live-probed 2026-09-30 (A21; Rules 9, 16), OJS, two runs, each on its own scratch journal with English and French (Canada) as interface languages, as the Journal Manager, on a version in Production with no uploaded file, one with an uploaded file and two references, and a published one; every French read was paired with the same read in English, which showed no code on either page. Codes seen, as visible text: `publication.jats.makePublic`; in the windows (text and title) `publication.jats.enableVisibilityTitle`, `…enableVisibilityMessage`, `…disableVisibilityTitle`, `…disableVisibilityMessage`; on "Body Text" `publication.bodyText.documentPanel` (also the panel's `aria-label`), `…references.dragHint`, `…selectedElement`, `…outline`, and `publication.bodyText` in the editor's screen-reader-only `h2` (`WorkflowPublicationBodyText.vue`, `#sciflow-editor-heading`), not visible on screen. In French, ticking the box and pressing "Confirmer" kept it ticked right after and after a reload; "Annuler" in the untick window kept it ticked. Leaving "Body Text" for "Titre et résumé" with typed text asked nothing, and the text was gone on return and after a reload (Rule 16; A15). OMP and OPS list neither page in French either. No server error, page error or failed request on any drive. Cause: lib/pkp `locale/fr_CA/submission.po` (at `3dc90c81a6`) has no entry for these keys, nor for any other `publication.bodyText*` key, while it carries `publication.jats`, `…confirmDeleteFile*`, `…autoCreatedMessage` and `…lastModified`. Code read only, not driven: the article page's "JATS XML" link (`publication.jats.download`) and the Body Text import box's texts (`publication.bodyText.import.*`) have no French entry either.

<a id="fn-f-omp1"></a>
**f-omp1** — Note b and note p: OMP's navigation config has no `bodyText` item, so `navigateToMenu('publication_{id}_bodyText')` finds no entry after the version form's POST/PUT has run; the address keeps `importFileUrl` and `importFileName`. Probe: d28.
Issue report: [pkp-e2e#553](https://github.com/jardakotesovec/pkp-e2e/issues/553) ([docs/issues/U48-OMP1-press-send-to-text-editor-leads-nowhere.md](../issues/U48-OMP1-press-send-to-text-editor-leads-nowhere.md)).

<a id="fn-d28"></a>
**d28** — Live-probed 2026-09-25 (Purpose, absence; OMP1), OMP and OPS: a monograph's and a preprint's publication lists carry no "JATS XML" and no "Body Text"; the typed menu keys land on the stage page; the published book and preprint pages carry no "JATS" link; no installed plugin row mentions JATS. On OMP, "Send to Text Editor" on "notes.md" was offered to the Press Manager and the Press Editor, not to the Series Editor or the Author; its window asks "To which version would you like to send this file?". "Confirm" with the existing version closed the window and stayed on "Workflow: Submission" with nothing imported; with "Create New Version" the side menu gained a second "Unassigned version" entry.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "JATS XML" page (box, heading, XML view, footer line) | workflow › Publication › a version › "JATS XML" | AFFW-403 · AFFW-410 |
| "Upload" and its hidden uploader | "JATS XML" header | AFFW-404 · AFFW-409 |
| "More Information" and the "Information Center" window | "JATS XML" header (uploaded file only) | AFFW-405 · AFFW-465 |
| "Delete" and "Confirm deleting JATS XML" | "JATS XML" header (uploaded file only) | AFFW-406 · AFFW-463 |
| "Download" | "JATS XML" header | AFFW-407 |
| "Make available with publication" and its two confirmation windows | "JATS XML" header | AFFW-408 · AFFW-464 |
| "Body Text" page (editor, toolbar, "Document Edit" panel) | workflow › Publication › a version › "Body Text" (Production access) | AFFW-411 · AFFW-416 |
| "Save" / "Saved", "Unsaved Changes", "Fullscreen" | "Body Text" › "Document Edit" | AFFW-412 · AFFW-414 · AFFW-413 |
| "References", "Selected Element", "Document Outline" sections | "Body Text" › right panel | AFFW-417 |
| Leave-with-unsaved-changes question (never shown, A15) | "Body Text", choosing another side-menu entry | AFFW-418 |
| Import status box ("Importing document"; "Import failed" never reached); no control of its own | "Body Text", on arrival from "Send File to Text Editor" | AFFW-415 |
| "Send to Text Editor" row action (mounted by *Submission files*; the window by *Publish, schedule & versions*) | a file list row's "More Actions" | AFFW-479 |
| "JATS XML" link on the article's page | `{journal}/article/view/{id}` (and the "Preview" page) | AFFR-060 |
| Workflow JATS API: read, upload, delete, visibility, public download | `api/v1/submissions/{id}/publications/{pid}/jats[/visibility\|/download]` (OJS only) | API-025 |
| Workflow Body Text API: read, save, delete (delete called by no screen) | `api/v1/submissions/{id}/publications/{pid}/bodyText` (OJS only) | API-009 |
| "JATS Template Plugin" (generation, OAI JATS, `jatsTemplate/download` page op linked from no screen) | Settings › Website › Plugins | PLUG-019 |

## Reference — code anchors

- ui-library: `src/pages/workflow/components/publication/WorkflowPublicationJats.vue` · `WorkflowPublicationBodyText.vue` · `WorkflowPublicationBodyTextUtils.js` · `useFullscreenFocusTrap.js` · `src/components/PandocConverter/PandocConverter.vue` · `pandocLoader.js` · `src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOJS.js` · `useWorkflowConfig/workflowConfigEditorialOJS.js` · `useWorkflowVersionForm.js` · `useWorkflowPermissions.js` · `src/managers/FileManager/useFileManagerConfig.js` · `useFileManagerActions.js` · `src/pages/workflow/WorkflowPageOJS.vue`
- editor package: `@sciflow/editor-start` (bundle, `format-bar`, `reference-list`, `outline`, `selection-editor`) · `@sciflow/editor-core` `i18n/en.js`
- lib/pkp API: `api/v1/jats/PKPJatsController.php` · `api/v1/bodyText/PKPBodyTextController.php`; OJS `api/v1/submissions/index.php` (mounts both)
- lib/pkp classes: `classes/jats/Repository.php` · `JatsFile.php` · `exceptions/UnableToCreateJATSContentException.php` · `classes/bodyText/Repository.php` · `BodyTextFile.php` · `classes/publication/Repository.php::version()` · `classes/submissionFile/Repository.php` (`add()`, `edit()`, `delete()`, `versionSubmissionFile()`, `getWorkflowStageId()`) · `classes/submissionFile/SubmissionFile.php` (`SUBMISSION_FILE_JATS`, `SUBMISSION_FILE_BODY_TEXT`, `SUBMISSION_FILE_DEPENDENT`) · `classes/security/authorization/PublicationWritePolicy.php` · `internal/PublicationCanBeEditedPolicy.php` · `classes/submission/Repository.php::canEditPublication()`, `canPreview()` · `classes/services/PKPStatsPublicationService.php` · `schemas/publication.json` (`jatsPublicVisibility`)
- lib/pkp legacy, unread by any screen: `pages/workflow/PKPWorkflowHandler.php::getJatsPanel()` · `classes/components/PublicationSectionJats.php` (OJS `WorkflowHandler` still builds its config)
- OJS: `plugins/generic/jatsTemplate/` (`JatsTemplatePlugin.php`, `JatsTemplateDownloadHandler.php`, `classes/Article.php`, `ArticleFront.php`, `ArticleBody.php`, `ArticleBack.php`, `JatsHelper.php`, `PeerReview.php`, `settings.xml`) · `pages/article/ArticleHandler.php::view()` · `templates/frontend/objects/article_details.tpl` · `classes/components/forms/context/UserAccessForm.php` · `pages/stats/StatsHandler.php::getTableColumns()` · `classes/observers/events/UsageEvent.php` · `classes/statistics/TemporaryTotalsDAO.php`
- Locale: lib/pkp `locale/en/` `publication.jats*`, `publication.bodyText*`, `publication.sendToTextEditor.label`, `fileManager.sendFileToTextEditor`; OJS `locale/en/manager.po` `manager.setup.restrictArticleAccess`, `manager.setup.siteAccess.viewContent`
