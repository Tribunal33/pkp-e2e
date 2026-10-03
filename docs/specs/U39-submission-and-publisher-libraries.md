---
name: submission-and-publisher-libraries
status: verified
---

# Submission & Publisher Libraries

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal handles documents that are not part of the scholarly work:
permission forms, agreements, marketing material, reports. The
**libraries** keep them where the people working on a submission can reach
them. The **Publisher Library** belongs to the journal: its Journal Manager
keeps it under Settings › Workflow › "Publisher Library", and everyone
working on a submission can read it. Each submission also has its own
**Submission Library**, opened with the **"Library"** button in the
workflow screen's header, where editors, assistants and the Author put
documents about that one submission. Files from both libraries can be
attached to decision emails, and a Publisher Library file can be offered
to the public at an address of its own ("Public Access"). <sup>a</sup>

This spec owns the two libraries' lists, their "Add a file" and "Edit"
windows, "Delete", who may download which file, the public address, and
which library files the email composer's "Library Files" source lists.
Where the "Library" button sits and who can open the workflow screen at
all is *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*'s;
the "Attach Files" window itself is *[Editorial decision
recording](U34-editorial-decision-recording.md#attach-files)*'s. Library
files are not submission files: no stage's file list shows them
([→ Submission files](U36-submission-files.md)). <sup>a</sup>

## Actors & permissions

Who can open a submission's workflow screen is the workflow screen's rule
([→ Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)):
the manager-level roles (Journal Manager, Editor, Production editor; on a
preprint server the Preprint Server Manager) on any submission; the
Section Editor, the Guest Editor (a journal role: a press and a preprint
server install none) and the assistant roles (Copyeditor, Layout Editor,
Proofreader, Designer, Indexer, Funding coordinator, Marketing and sales
coordinator) on the submissions they are assigned to; and the Author on
their own. On a preprint server no assistant role reaches the workflow,
even when assigned: the Editorial Board Member opening it gets an "Error"
dialog reading "The current role does not have access to this
operation.", so it has no "Library"
([→ a preprint server's workflow](U24-workflow-screen-and-stage-access.md#ops1)).
Below, **workflow participants** means exactly those people. The Site
Administrator acts through the role they hold in the journal; on the test
installs that is a manager role. A role's **stages** are the boxes ticked
under "Stage Assignment" in its "Edit" window (Settings › Users & Roles ›
Roles; the Roles list shows the same boxes under its stage columns):
whether that set includes the Submission stage decides one row below
(Settings bullet 1). <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Submission Library" window** (the header's "Library"; Rule 1) | • Every workflow participant, the Author included, on every stage and in every status of the submission, a stage whose panels they may not open included (Rule 1b)<br>• Reviewer, Reader: never; they do not reach the workflow screen <sup>b</sup> |
| **"Add a file", "Edit" and "Delete" in the Submission Library** (Rules 3–5) | • Every workflow participant who opens the window, on every file of this submission's Library, whoever added it ⚠ [A6](#a6) <sup>c</sup> <sup>td10</sup> |
| **Download a Submission Library file** (its name in the list, or "Download" under "Library Files"; Rule 8b) | • The manager-level roles and the Site Administrator: always<br>• Anyone else: only while assigned to the submission in a role whose stages include the Submission stage. With the install's stages that is the Section Editor, the Guest Editor, the Funding coordinator, the Author and the Translator (on a press also the Volume editor); the Copyeditor, Layout Editor, Proofreader, Designer, Indexer, Marketing and sales coordinator and a press's Chapter Author are refused, and on a preprint server, where no role works on a Submission stage, the Moderator and the Author are refused ⚠ [A1](#a1) <sup>d</sup> <sup>td3</sup> |
| **Read the Publisher Library from the workflow** ("View Document Library"; Rule 6) | • Every workflow participant who opens the "Submission Library" window <sup>e</sup> |
| **"Add a file", "Edit" and "Delete" in the Publisher Library** (Rules 3–5, 9) | • The manager-level roles and the Site Administrator: on Settings › Workflow › "Publisher Library" while their role may open the Settings pages ([→ who opens Settings](U07-journal-identity-and-about-pages.md#settings-access)), and inside "View Document Library" whether or not it may ⚠ [A7](#a7)<br>• Everyone else: never; their "View Document Library" list is read-only (Rule 6) <sup>e</sup> <sup>td11</sup> |
| **Download a Publisher Library file** (its name in a list, or "Download" under "Library Files"; Rule 8c) | • Everyone who sees the list: every workflow participant, and whoever the host screen offers the email composer <sup>f</sup> |
| **Open a Publisher Library file at its public address** (Rule 10) | • Anyone, signed out included, while the file's "Public Access" is ticked<br>• Nobody while it is not: the address shows a page reading "403 Forbidden" <sup>g</sup> |
| **Attach library files to an email** ("Library Files" in "Attach Files"; Rule 11) | • Whoever the host screen gives the composer: the deciding editors on a decision's email pages ([→ Attach Files](U34-editorial-decision-recording.md#attach-files))<br>• A recommending editor on a recommendation's "Notify Editors" page {OJS OMP} ([→ recording a recommendation](U34-editorial-decision-recording.md#recommendation))<br>• On a journal {OJS}, the Editor or an assigned Section Editor on the "Request Author Response" page ([→ the request page](U30-author-response-to-reviews.md#request-page)) <sup>h</sup> |

## Fields & validation

The **"Add a file"** window is the same in both libraries except for
"Public Access", which only the Publisher Library's carries. It opens with
the title "Add a file". <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" | Yes | A text box per form language of the journal: the box for the journal's primary language shows, and the boxes for its other languages (labelled "(French)" and so on) open while it has focus. A name in the primary language alone saves. At most 255 characters (the box takes no more). This is the name every list shows. Left empty, "OK" is refused with "This field is required." under the box <sup>i</sup> <sup>td9</sup> |
| "Type" | Yes | A list opening on "Choose One", then "Marketing", "Permissions", "Reports", "Other"; on a press "Contracts" comes first [OMP1](#omp1). The type is the group the file is listed under (Rule 1). Left on "Choose One", "OK" is refused with "This field is required." <sup>i</sup> <sup>td8</sup> <sup>td9</sup> |
| "Description" | Starred, but not enforced | A text area per form language, shown the way "Name" shows its boxes. It carries the required-field star, yet an empty description saves ⚠ [A3](#a3). No list shows the description; only the "Edit" window reads it back <sup>i</sup> <sup>td5</sup> |
| "File" | Yes | An upload area reading "Drag and drop a file here to begin upload" with an "Upload File" button. The file uploads as soon as it is chosen or dropped; the button then reads "Change File". Any file type is taken. Pressing "OK" before a file has uploaded does nothing ⚠ [A2](#a2) <sup>i</sup> <sup>td4</sup> |
| "Public Access" (Publisher Library only) | No | A tick box, unticked by default. Under it: "This library file can be accessible for download, if "Public Access" is enabled, at:" and an address. In "Add a file" the address ends in "/downloadPublic/id", a placeholder, because the file has no number yet; in "Edit" it ends in the file's number (Rule 10) <sup>g</sup> <sup>td7</sup> |

Under the fields: "Required fields are marked with an asterisk: *", then
"Cancel" and "OK". <sup>i</sup>

The **"Edit"** window (a file row's "Edit") has the same "Name", "Type"
and "Description", filled with the saved values, and in place of the
upload area a "File" section with three read-only lines: "File Name" (the
name of the file as it was uploaded), "File Size" and "Date uploaded". In
the Publisher Library it also carries a "Replace file" upload area and the
"Public Access" box with its address; the Submission Library's "Edit" has
neither, so a Submission Library file cannot be replaced, only deleted and
added again. The same refusals apply. <sup>j</sup>

## Rules & state

<a id="submission-library"></a>
1. **The "Submission Library" window.** Pressing "Library" in the
   workflow header opens a window titled "Submission Library". It holds
   one list: the buttons "Add a file" and "View Document Library" above
   it, a column headed "Files", and one group per file type, in the order
   of the "Type" list (Fields). Each group lists this submission's Library
   files of that type by their "Name", in no set order; a group with no
   file reads "No Items". The window closes with its close button.
   <sup>k</sup>
   - 1a. The window lists this submission's files only: a file added to
     another submission's Library or to the Publisher Library never shows
     in it.
   - 1b. The header keeps "Library" on a stage whose panels the role may
     not open (the box "You don't currently have access to that stage of
     the workflow." in place of the panels), and the window works there as
     anywhere. <sup>td1</sup>
2. **A file row.** A row shows the file's "Name" as a link with an icon
   for its kind (a document, an image and so on); pressing the name
   downloads the file (Rule 8). Where the reader may change the file
   (Actors), the row starts with an arrow; pressing the arrow opens a
   strip under the row with "Edit" and "Delete". In a read-only list the
   row has no arrow. <sup>k</sup>
3. **"Add a file".** The button opens the "Add a file" window (Fields).
   "OK" with a name, a type and an uploaded file closes the window, and
   the new row appears in its type's group, whose "No Items" line goes.
   "Cancel" closes the window and adds nothing. Two files may share a name
   and a type: each gets its own row. <sup>i</sup>
   - 3a. Pressing "OK" before any file has uploaded leaves the window open
     with nothing added and no message [A2](#a2). <sup>td4</sup>
   - 3b. **Closing a changed window.** Closing "Add a file" or "Edit" with
     its close button after anything was typed or chosen asks, in the
     browser's own dialog, "The data on this form has changed. Do you wish
     to continue without saving?": "OK" closes the window and saves
     nothing, "Cancel" keeps it open. The "Cancel" at the foot of the
     window closes it without asking. After an "OK" pressed before any
     file has uploaded (Rule 3a), the close button of "Add a file" drops
     what was typed without asking ⚠ [A11](#a11). Leaving the page while
     "Add a file" holds typed values brings up the browser's leave-page
     question. <sup>q</sup>
4. **"Edit".** The row's "Edit" opens the "Edit" window (Fields). "OK"
   saves and closes it: the row shows the new name, and a changed type
   moves the row to that type's group. "Cancel" closes it unchanged.
   <sup>j</sup>
5. **"Delete".** The row's "Delete" opens a dialog titled "Delete":
   "Are you sure you wish to delete this item? This action cannot be
   undone.", with "OK" and "Cancel". "OK" removes the row (the group
   reads "No Items" again when it was the last) and the file with it:
   it no longer downloads (a Submission Library file's old download
   address, opened again, shows an empty page ⚠ [A8](#a8)), and it leaves
   every "Library Files" list (Rule 11) and, for a Publisher Library
   file, its public address (Rule 10b). "Cancel" keeps it. <sup>l</sup>
   - 5a. On an install running in strict mode (Settings bullet 3),
     "Delete" in the Submission Library fails ⚠ [A5](#a5).
<a id="view-document-library"></a>
6. **"View Document Library".** The button opens a second window, titled
   "View Document Library", over the first. It holds the journal's
   Publisher Library list, headed "Publisher Library" ("Press Library" on
   a press, "Preprint Server Library" on a preprint server), grouped like
   the Submission Library. For a manager-level role and the Site
   Administrator the list carries "Add a file" and the rows' arrows, and
   works as on the Settings tab (Rule 9); for everyone else it is
   read-only: no "Add a file", no arrows, each name still a download link.
   <sup>e</sup> <sup>td11</sup>
7. **The window changes its own submission's files only.** A file added
   through a submission's "Add a file" always joins that submission's
   Library, whatever the page sends; an edit or a delete sent through it
   for a file of another submission, or of the Publisher Library, is
   refused, and the file stays as it was. No screen offers such a file
   there; the rule guards against a crafted request. <sup>m</sup>
<a id="download"></a>
8. **Downloading.**
   - 8a. Pressing a file's name downloads the file; the page stays where
     it was. Opening "Add a file" or "Edit" and pressing "OK" within two
     seconds of such a download makes the page's script fail, with nothing
     shown on screen ⚠ [A9](#a9). Two seconds after the press on the name
     the whole list is drawn again: a strip with "Edit" and "Delete"
     opened under a row in those two seconds closes by itself and needs
     its arrow pressed again ⚠ [A12](#a12). The downloaded file is named
     after the uploaded file with a type code added before the extension:
     "-MAR" for Marketing, "-PER" Permissions, "-REP" Reports, "-OTH"
     Other, "-CON" Contracts on a press. A "contract.pdf" added as
     "Marketing" downloads as "contract-MAR.pdf"; when a file in any of
     the journal's libraries already downloads under that name, "-1",
     "-2" and so on follow the code ("contract-MAR-1.pdf"). The code
     comes from the type saved with an upload or a replacement, and stays
     when "Edit" changes the type alone:
     "codes.pdf" added as "Marketing", then replaced with "replacement.pdf"
     in an "Edit" that also changes "Type" to "Permissions", downloads as
     "replacement-PER.pdf". A file whose name holds its extension
     earlier on downloads under a cut name ⚠ [A4](#a4). <sup>n</sup>
     <sup>td2</sup> <sup>td6</sup>
   - 8b. A Submission Library file downloads only for the people Actors
     names. Anyone else who presses its name leaves the workflow screen
     for a bare page reading "403 Forbidden" [A1](#a1) [A10](#a10).
     <sup>d</sup> <sup>td3</sup>
   - 8c. A Publisher Library file downloads for everyone who sees it
     listed. <sup>f</sup>
<a id="publisher-library-tab"></a>
9. **The "Publisher Library" tab.** Settings › Workflow opens the page
   "Workflow Settings"; its tab "Publisher Library" ("Press Library",
   "Preprint Server Library") holds the same list, headed with the same
   name, with "Add a file" above it and no "View Document Library". Files
   added here belong to the journal, not to a submission: they show in
   every submission's "View Document Library" and "Library Files" list,
   and never in a "Submission Library" window. <sup>e</sup>
<a id="public-access"></a>
10. **The public address.**
    - 10a. A Publisher Library file with "Public Access" ticked opens for
      anyone, signed out included, at the address its "Edit" window
      prints: the journal's address followed by
      "/libraryFiles/downloadPublic/" and the file's number. The file
      opens in the browser tab (a PDF in the browser's viewer) rather than
      downloading; saved from there, it takes Rule 8a's name. No list
      links to the address; only the form shows it. <sup>g</sup>
      <sup>td7</sup>
    - 10b. The same address shows a bare page reading "403 Forbidden" for
      a file whose "Public Access" is unticked, for a Submission Library
      file, for a deleted file, for a number no file has, and for another
      journal's file. The page is sent as an ordinary, successful page,
      so only a person reading it sees the refusal ⚠ [A10](#a10).
      <sup>g</sup>
    - 10c. "Replace file" in "Edit" keeps the file's number, so the
      address stays and serves the new file. <sup>j</sup> <sup>td13</sup>
<a id="library-files"></a>
11. **"Library Files" in the email composer.** The "Library Files" source
    of an email's "Attach Files" window ("Attach files from the
    Submission and Publisher Libraries.", button "Attach Library Files")
    lists library files to attach. "Download" follows Rule 8. The
    window's mechanics and what attaching does are
    *[Editorial decision recording](U34-editorial-decision-recording.md#attach-files)*'s.
    <sup>h</sup> <sup>td12</sup>
    - 11a. The list holds this submission's Library files first, then the
      Publisher Library's, each row reading the file's number, its name,
      its type and "Download" ("144 Author contract Permissions
      Download"); a file of any other submission is never listed.
    - 11b. Within each library the files follow no set order: a file
      renamed in "Edit" moves to the end of its library's part of the
      list.
    - 11c. A library file attached to a recommendation's "Notify Editors"
      letter {OJS OMP} goes, like the letter's other attachments, into
      the discussion the recommendation opens
      ([→ recording a recommendation](U34-editorial-decision-recording.md#recommendation)):
      its first message lists a copy under the file's downloaded name
      (Rule 8a), such as "43 article-REP-1.pdf", as a download link for
      everyone in that discussion. The copy belongs to the discussion; it
      is not a library file.
    - 11d. A discussion's own "Attach Files" offers no "Library Files"
      ([→ Tasks & discussions](U37-tasks-and-discussions.md#attach-files)).
12. **Nothing else records a library change.** Adding, editing or
    deleting a library file writes no line to the submission's Activity
    Log and sends no email or notification. <sup>o</sup>

## Side effects

- **A file leaves the journal by email**: a library file attached through
  "Library Files" travels with the email to its recipients
  ([→ Attach Files](U34-editorial-decision-recording.md#attach-files))
  under its downloaded name (Rule 8a), such as "article-PER-1.pdf", not
  under its "Name"; the chip under the message shows the same name.
  <sup>h</sup>
- **A file leaves the journal by its public address**: a ticked "Public
  Access" makes the file readable by anyone who has the address (Rule
  10a). <sup>g</sup>
- **Deleting removes the file everywhere** (Rule 5); nothing else is
  logged or sent (Rule 12). <sup>l</sup> <sup>o</sup>

## Settings that modify behavior

- **A role's stages** (Settings › Users & Roles › Roles, the role's
  "Edit" window, its "Stage Assignment" boxes; the Roles list shows the
  same boxes under its stage columns; *Roles configuration*). Install
  default on a journal: the Submission stage is ticked for the Section
  editor, Guest editor, Funding coordinator, Author and Translator and
  unticked for the Copyeditor, Layout Editor, Proofreader, Designer,
  Indexer and Marketing and sales coordinator. A press has the same sets
  without the Guest editor, with the Volume editor added to the first and
  the Chapter Author to the second. A preprint server offers no
  Submission stage at all: its Roles list has the one stage column
  "Production". Ticked, an assigned person in that role downloads
  Submission Library files; unticked, they get "403 Forbidden"
  (Rule 8b). The manager-level roles download either way. <sup>d</sup>
- **"Permit changes to Settings"** on a manager-level role other than
  the Journal Manager (Settings › Users & Roles › Roles, the role's
  "Edit"; *Roles configuration*;
  [→ who opens Settings](U07-journal-identity-and-about-pages.md#settings-access)).
  The Journal Manager's row in the Roles list has no arrow, so its "Edit"
  never opens; on a preprint server, where the Preprint Server Manager is
  the only manager-level role, no role's box can be changed. Install
  default: ticked. Unticked, the role loses the "Publisher Library" tab
  with the rest of Settings, and still adds, edits and deletes Publisher
  Library files through "View Document Library" (Rule 6) [A7](#a7).
  <sup>e</sup>
- **The install's strict mode** (the configuration file's "strict"
  option, set in that file only; no screen shows or changes it). Install
  default: Off. On, "Delete" in the Submission Library fails (Rule 5a)
  [A5](#a5). <sup>p</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  the header's "Library" button, who can open the workflow screen, and the
  no-access box of a stage the role may not open. <sup>b</sup>
- *[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)*:
  the Settings pages' tab roster and who opens them. <sup>e</sup>
- *[Editorial decision recording](U34-editorial-decision-recording.md#attach-files)*:
  the "Attach Files" window and attaching, and the discussion a
  recommendation opens with its attachments (Rule 11c); this spec owns
  which library files its "Library Files" lists (Rule 11). <sup>h</sup>
- *[Author response to reviews](U30-author-response-to-reviews.md#request-page)*
  {OJS}: the request page's "Attach Files" offers "Library Files" (Rule
  11). <sup>h</sup>
- *[Tasks & discussions](U37-tasks-and-discussions.md#attach-files)*: a
  message's "Attach Files" offers no library files. <sup>h</sup>
- *[Submission files](U36-submission-files.md)*: library files are not
  submission files and no stage's file list shows them. <sup>a</sup>
- *Roles configuration*: a role's "Stage Assignment" boxes and "Permit
  changes to Settings" (Settings that modify behavior). <sup>d</sup>
- *[Stage participants](U35-stage-participants.md)*: assignment, which
  makes a Section Editor, Guest Editor or assistant a workflow
  participant. <sup>b</sup>
- *[Submission activity log & notes](U38-submission-activity-log-and-notes.md)*:
  library changes write no line there (Rule 12). <sup>o</sup>

## Canonical scenarios

Scenario 1 runs on the seeded journal with ready accounts; scenarios 2
to 5 run on scratch journals with throwaway accounts. The accounts and
passwords, the mail catcher's address and the tooling recipe are in the
footnote. <sup>s</sup>

1. **A file shared through the Submission Library**

   Given: Editor (on a preprint server, the Preprint Server Manager), on
   a submission its Author submitted, whose Submission Library is empty.

   - **The empty window**: open the submission and press "Library" in the
     header: a window titled "Submission Library" opens, with the buttons
     "Add a file" and "View Document Library" above a list whose column
     is headed "Files"; the list holds the groups "Marketing",
     "Permissions", "Reports" and "Other" (on a press "Contracts" comes
     first [OMP1](#omp1)), each reading "No Items" (Rule 1; Fields
     "Type").
   - **"Add a file" refused**: press "Add a file": a window titled "Add a
     file" opens with "Name", "Type" reading "Choose One", "Description",
     and under "File" an area reading "Drag and drop a file here to begin
     upload" with an "Upload File" button; press "OK" with every field
     left as it is: "OK" is refused, with "This field is required." under
     "Name" and "This field is required." for "Type" (Fields).
   - **Closing a changed window**: type "Draft name" in "Name" and press
     the window's close button: the browser asks "The data on this form
     has changed. Do you wish to continue without saving?"; press
     "Cancel": the window stays open with "Draft name" in "Name"; press
     the close button again, then "OK": the window closes and every group
     still reads "No Items"; press "Add a file", type "Draft name" in
     "Name" and press "Cancel" at the foot of the window: it closes
     without asking, and nothing is added (Rules 3, 3b).
   - **"Add a file"**: press "Add a file", type "Author agreement" in
     "Name", choose "Permissions" in "Type" and upload "article.pdf" under
     "File": the button then reads "Change File"; press "OK": the window
     closes, and "Author agreement" is listed under "Permissions" as a
     link with an icon for its kind, the row starting with an arrow;
     "Permissions" no longer reads "No Items", and the other groups still
     do (Rules 2, 3).
   - **The Author's list**: Author: open the submission from "My
     Submissions" and press "Library": the "Submission Library" window
     lists "Author agreement" under "Permissions" (Actors row 1; Rule 1).
   - **The Author's download** {OJS OMP}: press "Author agreement": the
     file downloads, and the page stays where it was (Actors row 3;
     Rule 8a).
   - **The Author adds a file**: press "Add a file", type "Signed
     permission" in "Name", choose "Permissions" in "Type", upload
     "article.pdf" and press "OK": "Signed permission" is listed under
     "Permissions" together with "Author agreement", in no set order
     (Actors row 2; Rules 1, 3).
   - **The Editor reads it**: Editor: press "Library": "Signed permission"
     and "Author agreement" are both listed under "Permissions"; press
     "Signed permission": the file downloads, and the page stays where it
     was (Actors row 3; Rule 8a).
   - **Control**: press "Activity Log" in the header: "History" holds no
     line naming "Author agreement" or "Signed permission" (Rule 12).

   On a preprint server the Author's press on a Submission Library file
   is refused [A1](#a1), so "The Author's download" is not run there.

2. **The Publisher Library on the Settings tab**

   Given: Journal Manager, on a scratch journal whose Publisher Library
   is empty.

   - **The tab**: open Settings › Workflow: the page "Workflow Settings"
     opens; select its tab "Publisher Library" ("Press Library" on a
     press, "Preprint Server Library" on a preprint server): it holds a
     list headed with the same name, "Add a file" above it and no "View
     Document Library", each group reading "No Items" (Rules 1, 9).
   - **"Public Access" in "Add a file"**: press "Add a file": the window
     carries "Public Access", unticked, and under it "This library file
     can be accessible for download, if "Public Access" is enabled, at:"
     with an address ending in "/downloadPublic/id" (Fields "Public
     Access"); type "Journal guide" in "Name", choose "Other" in "Type",
     upload "article.pdf", tick "Public Access" and press "OK": "Journal
     guide" is listed under "Other" (Rule 3).
   - **A second file from the same upload**: press "Add a file", type
     "Internal report" in "Name", choose "Other", upload "article.pdf",
     leave "Public Access" unticked and press "OK": "Internal report" is
     listed under "Other" too (Rule 3).
   - **The downloaded names**: press "Journal guide": the file downloads
     as "article-OTH.pdf" and the page stays where it was; press
     "Internal report": it downloads as "article-OTH-1.pdf" (Rule 8a).
   - **The "Edit" window**: press the arrow at the start of "Journal
     guide", then "Edit": a window titled "Edit" shows "Journal guide" in
     "Name", "Other" in "Type", the "File" lines "File Name" reading
     "article.pdf", "File Size" and "Date uploaded", a "Replace file"
     upload area, and "Public Access" ticked above an address made of the
     journal's address, "/libraryFiles/downloadPublic/" and the file's
     number; note the address; type "Unsaved name" in "Name" and press
     "Cancel" at the foot: the window closes without asking, and the row
     still reads "Journal guide"; open "Internal report"'s "Edit", note
     its address the same way and press "Cancel" (Fields; Rules 3b, 4,
     10a).
   - **Signed out, the public address**: sign out and open "Journal
     guide"'s address: the file opens in the browser tab rather than
     downloading; saved, it is named "article-OTH.pdf" (Rule 10a).
   - **"Edit" with "Replace file"**: Journal Manager: open "Journal
     guide"'s "Edit", type "Author guide" in "Name", choose "Permissions"
     in "Type", upload "replacement.pdf" under "Replace file" and press
     "OK": "Author guide" is listed under "Permissions", and "Other" lists
     "Internal report" alone; open "Author guide"'s "Edit": "File Name"
     reads "replacement.pdf" and the address is the one noted; press
     "Cancel" (Rules 4, 10c).
   - **The same address, the new file**: sign out and open the noted
     address again: the new file opens; saved, it is named
     "replacement-PER.pdf" (Rules 8a, 10c).
   - **"Delete" on the tab**: Journal Manager: press the arrow of "Author
     guide", then "Delete", then "OK": the row is gone and "Permissions"
     reads "No Items" again; signed out, the noted address shows a page
     reading "403 Forbidden" (Rules 5, 10b).
   - **Control**: signed out, "Internal report"'s address, whose "Public
     Access" is unticked, shows a page reading "403 Forbidden", and so
     does the same address with "999999" in place of the file's number
     (Rule 10b).

3. **The Publisher Library read from the workflow**

   Given: Section Editor, assigned to a submission its Author submitted
   with an empty Submission Library, on a scratch journal whose Publisher
   Library holds "Journal guide" under "Other".

   - **The Section Editor's read-only list**: open the submission, press
     "Library", then "View Document Library": a second window titled
     "View Document Library" opens over the first, holding a list headed
     "Publisher Library" ("Press Library" on a press, "Preprint Server
     Library" on a preprint server) with "Journal guide" under "Other";
     the list has no "Add a file", and the row has no arrow (Actors
     row 4; Rules 2, 6).
   - **Its download**: press "Journal guide": the file downloads, and the
     page stays where it was (Actors row 6; Rules 8a, 8c).
   - **The Author's read-only list**: Author: open the submission from
     "My Submissions", press "Library", then "View Document Library": the
     same list, "Journal guide" under "Other", with no "Add a file" and
     no arrow; press "Journal guide": the file downloads (Actors rows 4,
     6; Rules 6, 8c).
   - **The Editor adds from the workflow**: Editor (on a preprint server,
     the Preprint Server Manager): open the submission, press "Library",
     then "View Document Library": the list carries "Add a file", and
     "Journal guide" starts with an arrow; press "Add a file", type
     "Style sheet" in "Name", choose "Marketing" in "Type", upload
     "article.pdf" and press "OK": "Style sheet" is listed under
     "Marketing" (Actors row 5; Rules 3, 6).
   - **The tab**: Journal Manager: open Settings › Workflow › "Publisher
     Library": "Style sheet" is listed under "Marketing" and "Journal
     guide" under "Other" (Rule 9).
   - **The Section Editor's list again**: Section Editor: press "Library",
     then "View Document Library": "Style sheet" is listed under
     "Marketing" (Rule 9).
   - **Control**: close "View Document Library": the "Submission Library"
     window under it lists neither "Journal guide" nor "Style sheet", and
     every group reads "No Items" (Rules 1a, 9).

4. **Library files attached to a decision email**

   Given: Editor (on a preprint server, the Preprint Server Manager), on
   a scratch journal whose Publisher Library holds "Journal guide" under
   "Other", on a submission awaiting a decision on its first stage (on a
   preprint server, Production) whose Submission Library holds "Author
   contract" under "Permissions", uploaded as "article.pdf", and "Old
   contract" under "Reports", while another submission's Library holds
   "Other submission file" under "Other".

   - **The window, this submission's files only**: open the submission
     and press "Library": "Author contract" is listed under "Permissions"
     and "Old contract" under "Reports"; neither "Other submission file"
     nor "Journal guide" is listed, and "Other" reads "No Items"
     (Rule 1a).
   - **The "Delete" dialog**: press the arrow of "Old contract", then
     "Delete": a dialog titled "Delete" reads "Are you sure you wish to
     delete this item? This action cannot be undone." with "OK" and
     "Cancel"; press "Cancel": the row stays; press "Delete" again, then
     "OK": the row is gone, and "Reports" reads "No Items" (Rule 5).
   - **"Library Files"**: close the window, press "Decline Submission"
     and, on its email page, press "Attach Files", then "Attach Library
     Files" ([→ Attach Files](U34-editorial-decision-recording.md#attach-files)):
     the list holds "Author contract" first, its row reading "{its
     number} Author contract Permissions Download", then "Journal guide",
     reading "{its number} Journal guide Other Download"; neither "Old
     contract" nor "Other submission file" is listed; note "Author
     contract"'s number (Rules 5, 11a).
   - **"Download"**: press "Download" on "Author contract": the file
     downloads (Rules 8, 11).
   - **Attaching**: tick "Author contract" and press "Attach Selected":
     the chip under the message reads "article-PER.pdf"; press "Record
     Decision" ([→ the email page](U34-editorial-decision-recording.md#email-page))
     (Rule 8a; Side effects bullet 1).
   - **The Author's email**: in the mail catcher, the Author's email of
     the decision carries the attachment "article-PER.pdf", not "Author
     contract" (Side effects bullet 1).
   - **The public address**: sign out and open the journal's address
     followed by "/libraryFiles/downloadPublic/" and "Author contract"'s
     number: a page reading "403 Forbidden" (Rule 10b).
   - **Control**: Editor: open the other submission and press "Library":
     "Other submission file" is listed under "Other", and "Author
     contract" is not listed (Rule 1a).

5. **An assistant on a stage it may not open** {OJS OMP}

   Given: Copyeditor, assigned to a submission on the Production stage
   whose Submission Library holds "Editor contract" under "Permissions",
   on a scratch journal whose Publisher Library holds "Journal guide"
   under "Other".

   - **The stage without its panels**: open the submission and select
     "Production" in the side menu: "You don't currently have access to
     that stage of the workflow." shows in place of the stage's panels,
     and the header still offers "Library" (Rule 1b).
   - **The window**: press "Library": the "Submission Library" window
     carries "Add a file" and "View Document Library", and lists "Editor
     contract" under "Permissions" (Actors rows 1, 2; Rule 1b).
   - **"Add a file"**: press "Add a file", type "Copyedit note" in "Name",
     choose "Other" in "Type", upload "article.pdf" and press "OK": "Copyedit
     note" is listed under "Other" (Actors row 2; Rule 3).
   - **The Editor reads it**: Editor: open the submission and press
     "Library": "Copyedit note" is listed under "Other"; press it: the
     file downloads, and the page stays where it was (Actors row 3;
     Rule 8a).
   - **A Copyeditor given the Submission stage**: the same state on a
     second scratch journal whose Copyeditor role has "Submission" ticked
     under "Stage Assignment": Copyeditor: press "Library", then "Editor
     contract": the file downloads, and the page stays on the workflow
     screen (Actors row 3; Settings bullet 1).
   - **Control**: on the first journal, Copyeditor: press "Library", then
     "View Document Library": the list holds "Journal guide" under
     "Other", with no "Add a file" above it and no arrow on the row
     (Rule 6).

   A preprint server's assistant roles do not reach the workflow
   ([→ a preprint server's workflow](U24-workflow-screen-and-stage-access.md#ops1)).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the close button of "Add a file" after an "OK" refused for a missing file asks "The data on this form has changed. Do you wish to continue without saving?" (Rule 3b; A11, docs/issues/U08-A18-item-window-refused-save-closes-unasked.md)
- **Nothing new to test**:
  - a recommending editor's "Notify Editors" page {OJS OMP}: its "Library Files", and the attached file's copy listed in the discussion the recommendation opens (Actors row 8; Rule 11c)
  - the "Request Author Response" page {OJS}: the Editor's and an assigned Section Editor's "Library Files" (Actors row 8; Rule 11a)
  - a journal with a second form language: a "Name" and a "Description" box per language (Fields)
  - an assigned Section Editor, or Guest Editor {OJS}, in the "Submission Library" window: the Editor's offer, which scenario 1 reads (Actors rows 1–4)
- **Register carries it**:
  - A1 (a Submission Library file's name pressed by an assigned Copyeditor or Layout Editor, and on a preprint server by the Moderator or the Author: "403 Forbidden"; Actors row 3; Rule 8b)
  - A2 ("OK" before a file has uploaded; Rule 3a)
  - A3 ("Description" starred, yet saved empty; Fields)
  - A4 (a name holding its extension earlier on, downloaded cut; Rule 8a)
  - A6 (the Author offered "Edit" and "Delete" on the Editor's file; Actors row 2)
  - A7 ("Permit changes to Settings" unticked on the Editor, "View Document Library" still changing the Publisher Library; Settings bullet 2)
  - A8 (a deleted Submission Library file's old download address; Rule 5)
  - A9 ("OK" within two seconds of a download; Rule 8a)
  - A10 (the "403 Forbidden" pages sent as ordinary pages; Rules 8b, 10b)
  - A11 (closing "Add a file" after an "OK" with no file; Rule 3b)
  - A12 (a row's strip opened within two seconds of a download, closed by the list drawn again; Rule 8a)
- **No seed**:
  - an edit or a delete sent through a submission's window for another submission's file, refused (Rule 7)
  - strict mode on: "Delete" in the Submission Library fails (Settings bullet 3; A5)
- **Owned by another feature**:
  - a preprint server's Editorial Board Member, refused the workflow and so the "Library" (Actors intro; *Workflow screen & stage access*, scenario 11)
  - the Reviewer and the Reader, who do not reach the workflow screen (Actors row 1; *Workflow screen & stage access*, scenario 11)
  - a discussion's "Attach Files" without "Library Files" (Rule 11d; *Tasks & discussions*, scenario 1)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A Submission Library file cannot be downloaded by an assigned assistant, nor on a preprint server by the Moderator or the Author: the name leads to "403 Forbidden" | 🐞 | user-visible | — |
| [A2](#a2) | "OK" in "Add a file" before a file has uploaded does nothing and says nothing | 🐞 | minor | — |
| [A3](#a3) | "Description" is starred as required but saves empty | 🐞 | minor | — |
| [A4](#a4) | A file whose name holds its extension earlier downloads under a cut name | 🐞 | minor | — |
| [A5](#a5) | With strict mode on, "Delete" in the Submission Library fails | 🐞 | latent | — |
| [A9](#a9) | "OK" in "Add a file" or "Edit" within two seconds of a download makes the page's script fail | 🐞 | invisible · crash: script | — |
| [A11](#a11) | After an "OK" without a file, closing "Add a file" drops what was typed without asking | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A12](#a12) | A row's "Edit"/"Delete" strip opened within two seconds of a download closes by itself when the list is drawn again | 🐞 | minor | — |
| [A6](#a6) | Every workflow participant, the Author included, edits and deletes every file of the Submission Library, whoever added it | ❓ | minor | — |
| [A7](#a7) | A manager-level role without "Permit changes to Settings" still changes the Publisher Library through "View Document Library" | ❓ | minor | — |
| [A8](#a8) | A deleted Submission Library file's old download address shows an empty page | ❓ | minor | — |
| [A10](#a10) | The libraries' "403 Forbidden" pages reach the browser as ordinary pages, not as refusals | ❓ | invisible | — |
| [OMP1](#omp1) | A press's libraries have a fifth type, "Contracts", listed first | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — Submission Library files refused to the people the window serves** · 🐞 · user-visible.
The "Submission Library" window opens for every workflow participant and
lets each of them add, rename and delete its files, so a participant
expects to read them too. Pressing a file's name instead takes an
assigned Copyeditor, Layout Editor, Proofreader, Designer, Indexer,
Marketing and sales coordinator or a press's Chapter Author off the
workflow screen to a bare page reading "403 Forbidden", including for a
file they added themselves. On a preprint server no role works on a
Submission stage, so the Moderator and the Author, the submission's own
author, are refused every Submission Library file, and only the Preprint
Server Manager reads them. The "Download" link of "Library Files" in a
Moderator's decision email opens a new tab reading "403 Forbidden",
while the email page stays.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — "OK" without a file does nothing** · 🐞 · minor.
In "Add a file", pressing "OK" before any file has uploaded leaves the
window open with nothing added and no message; the explanation the app
holds for it ("A library file is required. Please ensure that you have
chosen and uploaded a file.") never shows. The user cannot tell what is
missing.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — "Description" starred but not required** · 🐞 · minor.
The "Add a file" and "Edit" windows mark "Description" with the
required-field star, and the note under the form says starred fields are
required, but a file with an empty description saves. Either the star or
the rule is wrong.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — A name holding its extension earlier downloads cut** · 🐞 · minor.
The uploaded name loses everything from the character before its
extension's first appearance; a name starting with its extension loses
only its last character. "notes-pdf-draft.pdf" added as "Marketing"
downloads as "notes-MAR.pdf", and "pdf-guide.pdf" as
"pdf-guide.pd-MAR.pdf". The name alone is wrong, not the content.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — "Delete" fails in strict mode** · 🐞 · latent.
With the configuration file's "strict" option On (Settings bullet 3),
"OK" in a Submission Library file's "Delete" dialog ends in a server
error, not a deletion. Default installs have it Off and delete normally.
Basis: code. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — Anyone on the submission may rename or delete any Library file** · ❓ · minor.
The Submission Library is one shared space: the Author, every assistant
and every editor on the submission is offered "Edit" and "Delete" on every
file in it, including a contract or report an editor put there, and a
deleted file cannot be restored.
Question: should "Edit" and "Delete" be limited to the person who added
the file and the editors? Lean: yes; reading and adding are the shared
purpose, while deleting another person's document is not.
Basis: probe. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — "Permit changes to Settings" does not cover the Publisher Library** · ❓ · minor.
A manager-level role whose "Permit changes to Settings" is unticked loses
the "Publisher Library" tab with the rest of Settings, but its "View
Document Library" window still offers "Add a file", "Edit" and "Delete"
on the journal's Publisher Library.
Question: is the Publisher Library a setting that the tick should guard?
Lean: yes; the tab lives under Settings, so a role kept out of Settings
should read the library without changing it.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — A deleted file's download address shows an empty page** · ❓ · minor.
Opened again after "Delete", the old download address of a Submission
Library file shows an empty page: no file and no message. The feature's
other refusals show a page reading "403 Forbidden" (Rules 8b and 10b),
a deleted Publisher Library file's public address included.
Question: should the address say that the file is gone? Lean: yes; an
empty page reads as a broken site, not as a deleted file.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Changing a list right after a download makes the page's script fail** · 🐞 · invisible · crash: script.
Pressing a file's name downloads it and leaves the link unready for two
seconds. Opening "Add a file" or "Edit" and pressing "OK" inside them
redraws the list; when they end the script fails, the link being gone.
Only the browser's console shows it: "There is no handler bound to this
element!". Rare at a person's pace, common in tests.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — "403 Forbidden" pages that answer as a success** · ❓ · invisible.
Every "403 Forbidden" page of the libraries (a refused Submission
Library download, Rule 8b, and each refused public address, Rule 10b)
reaches the browser as an ordinary, successful page that happens to
carry that text. A person reads the refusal; a link checker, a cache or
a script that reads the answer's status sees a success.
Question: should these pages answer as refused? Lean: yes, a defect; the
page means to refuse and only the status it is sent with disagrees.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — After an "OK" without a file, "Add a file" closes without asking** · 🐞 · low.
Closing a changed "Add a file" or "Edit" window asks "The data on this
form has changed. Do you wish to continue without saving?" (Rule 3b).
But pressing "OK" in "Add a file" with no file chosen is refused with
the notice "A library file is required. Please ensure that you have
chosen and uploaded a file.", and the window's close button then shuts
it at once and drops the typed name and the chosen type without asking;
leaving the page asks nothing either. Changing a box after the refusal
brings the question back. Both libraries, the same fault as a refused
navigation menu item's window
([→ Navigation menus](U08-navigation-menus-and-site-chrome.md#a18)).
Basis: probe, 2026-10-03. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — A strip opened right after a download closes by itself** · 🐞 · minor.
Two seconds after a press on a file's name, when the link is ready
again ([A9](#a9)), the whole library list is drawn again. On Settings ›
Workflow › "Publisher Library", a Journal Manager who presses a file's
name and then, within those two seconds, the arrow at the start of its
row sees the strip with "Edit" and "Delete" open and then close by
itself; the arrow has to be pressed a second time. Expected: the strip
stays open until the person closes it.
Basis: probe. <sup>[f-a12](#fn-a12)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A fifth file type, "Contracts"** · ✅ · intended divergence.
A press's "Type" list and both library lists carry "Contracts" before
"Marketing", "Permissions", "Reports" and "Other"; a journal and a
preprint server have the four. The press's own file-type set adds it.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The header button: `getHeaderItems()` in `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` / `OMP.js` / `OPS.js` pushes `editor.submissionLibrary` "Library" with `WorkflowActions.WORKFLOW_VIEW_LIBRARY` unconditionally, and the author configs (`workflowConfigAuthorOJS/OMP/OPS.js`) push it as their only header item (the placement is *Workflow screen & stage access*' footnote f). `useWorkflowActions.js::workflowViewLibrary()` opens the legacy modal `modals.documentLibrary.documentLibraryHandler` op `documentLibrary` titled `grid.libraryFiles.submission.title` "Submission Library" (identical in the three apps' ui-library). The Settings tab: `lib/pkp/templates/management/workflow.tpl`, `<tab id="library" label="{translate key="manager.publication.library"}">`, whose text is "Publisher Library" in OJS, "Press Library" in OMP and "Preprint Server Library" in OPS (each app's own `locale/en/manager.po`, which overrides lib/pkp's). Storage: `library_files` (`LibraryFilesMigration`, commented "Library files can be associated with the context … or with individual submissions, and are typically forms, agreements, and other administrative documents that are not part of the scholarly content."), files under the context's `contexts/{id}/library/` directory (`PKPLibraryFileManager::getBasePath()`), apart from submission files. The attachers are note h's. Live-probed 2026-09-24 (Purpose; all three apps): every workflow participant reached "Library" and "View Document Library"; Settings › Workflow opened "Workflow Settings" with the tab "Publisher Library" ("Press Library", "Preprint Server Library"); no library file's name showed on any stage's file list, the Author's view, a preprint's "Galleys" page or a decision's "Submission Files" source.

<a id="fn-b"></a>
**b** — `lib/pkp/controllers/modals/documentLibrary/DocumentLibraryHandler.php`: role assignment `SUB_EDITOR, MANAGER, SITE_ADMIN, AUTHOR, ASSISTANT` for `documentLibrary`, under `SubmissionAccessPolicy` (an Author on their own submission or one they are assigned to; an assistant or sub-editor through `UserAccessibleWorkflowStageRequiredPolicy`, i.e. assigned; a manager or site administrator on any submission), which is the same audience as the workflow screen's; no `REVIEWER` or `READER` entry. `documentLibrary.tpl` loads `grid.files.submissionDocuments.SubmissionDocumentsFilesGridHandler` `fetchGrid` for the submission, authorized by `SubmissionDocumentsFilesGridDataProvider::getAuthorizationPolicy()` (`SubmissionAccessPolicy` on `submissionId`). Nothing on the path reads the stage or the submission's status. Multi-app: the handlers, grids, forms, templates and `LibraryFileHandler` are lib/pkp files with no app copy, byte-identical across the three checkouts (lib/pkp ojs `5af3b3933`, omp `63945bbd82`, ops `f8bacd7658`; `cmp` 2026-09-24), and the three ui-library copies of `workflowViewLibrary()` are identical; the one app override is OMP's `LibraryFileManager` (OMP1). Stage sets: note d. The Guest Editor group (`guestEditor`) is in OJS's `registry/userGroups.xml` only. Live-probed 2026-09-24 (Actors intro and row 1; Rule 1b; all three apps): the Site Administrator, the manager-level roles, an assigned Section Editor, Guest Editor (OJS), Copyeditor, Layout Editor and Funding coordinator (OJS, OMP) and the Author reached "Library" on submissions at every stage and when published or declined; an assistant on a stage whose panels it may not open saw "You don't currently have access to that stage of the workflow." and still had "Library", whose window added a file there; an unassigned Section Editor or Copyeditor got the "Error" dialog "The current role does not have access to this operation.", and a Reader or Reviewer the access-denied page; on OPS, `participants[]` accepts `editorialBoardMember`, and the assigned Editorial Board Member got the same "Error" dialog.

<a id="fn-c"></a>
**c** — `SubmissionDocumentsFilesGridHandler::__construct()` assigns `addFile`, `uploadFile`, `saveFile`, `editFile`, `updateFile`, `deleteFile` and `viewLibrary` to `MANAGER, SITE_ADMIN, SUB_EDITOR, ASSISTANT, AUTHOR`; `initialize()` calls `setCanEdit(true)` ("this grid can always be edited"), so `LibraryFileGridRow::initialize()` adds `editFile` (`grid.action.edit` "Edit") and `deleteFile` (`grid.action.delete` "Delete") to every row for every reader. `library_files` has no uploader column, so nothing can distinguish the person who added a file. Live-probed 2026-09-24 (Actors row 2; all three apps): every participant level had "Add a file" and the arrow on a file someone else added; the Author and an assigned Copyeditor (OJS, OMP) renamed and deleted the Editor's files, which the Editor then no longer saw; no window offers a way back for a deleted file.

<a id="fn-d"></a>
**d** — Download from a list: `LibraryFileGridCellProvider` gives each row a `DownloadLibraryFileLinkAction` (label = the localized name, icon class = the document type), a `PostAndRedirectAction` that posts to `api.file.FileApiHandler` `enableLinkAction` and then sets `window.location` to `api.file.FileApiHandler` `downloadLibraryFile` with `libraryFileId` (and `submissionId` for a Submission Library file) (`js/classes/linkAction/PostAndRedirectRequest.js`), so an HTML answer replaces the page. `FileApiHandler::authorize()` adds `ContextAccessPolicy` for a numeric `libraryFileId` (roles `MANAGER, SITE_ADMIN, SUB_EDITOR, ASSISTANT, REVIEWER, AUTHOR`) and delegates to `PKP\pages\libraryFiles\LibraryFileHandler::downloadLibraryFile()` with itself as `_callingHandler`: for a file with a `submissionId` access is granted when the user's roles include `ROLE_ID_MANAGER` or `ROLE_ID_SITE_ADMIN`, or when the user is in `Repo::user()->getCollector()->assignedTo($submissionId, WORKFLOW_STAGE_ID_SUBMISSION)` (`buildSubmissionAssignmentsFilter()`: a `stage_assignments` row joined to `user_group_stage` with `stage_id` 1); otherwise it prints `403 Forbidden<br>` under `HTTP/1.0 403 Forbidden`, yet on the test installs' PHP servers the page arrives with status 200, `text/html` (A10). The composer's "Download" is the same address (`PKPLibraryController::fileToResponse()` `url`). Stage sets, `registry/userGroups.xml`: OJS editor and productionEditor are manager-level; sectionEditor and guestEditor `1,3,4,5,6`, funding `1,3`, author and translator `1,3,4,5,6`; copyeditor and marketing `4`; designer, indexer, layoutEditor and proofreader `5,6`. OMP the same with `2` added and no guestEditor group, plus volumeEditor `1,2,3,4,5,6` and chapterAuthor `4,5,6`. OPS manager, sectionEditor and author `5,6` (seed-facts: "no OPS role works on the Submission stage"). The role's "Edit" form heads its boxes `grid.roles.stageAssignment` "Stage Assignment"; the Roles list carries one box per stage column (OJS Submission, Review, Copyediting, Production; OMP Submission, Internal Review, External Review, Copyediting, Production; OPS Production), greyed on the manager-level rows. The `roles` scenario key's `stages` map ticks or unticks a role's "Stage Assignment" boxes as its "Edit" window saves them (scenarios.md; checked against the window 2026-09-24, the stored stages equal on all three apps). Live-probed 2026-09-24 (Actors row 3; Rule 8b; Settings bullet 1): the manager-level roles and the Site Administrator downloaded (all three apps), as did the assigned Section Editor, Funding coordinator, Translator and Author (OJS, OMP) and Volume editor (OMP), the page staying on the workflow; the Copyeditor, Layout Editor and Marketing and sales coordinator (OJS, OMP), the Chapter Author (OMP) and, on OPS, the Moderator and the Author left for a page reading "403 Forbidden", a file they had added themselves included; the Guest Editor, Proofreader, Designer and Indexer were not driven one by one (the same permission level and Submission box as a driven role). The Roles list's defaults read as Settings bullet 1 states; with "Submission" ticked for the Copyeditor the assigned Copyeditor downloaded, and with it unticked for the Funding coordinator the Funding coordinator was refused (OJS, OMP).

<a id="fn-e"></a>
**e** — `SubmissionDocumentsFilesGridHandler::initialize()` adds the grid action `viewLibrary` (`grid.action.viewLibrary` "View Document Library", an `AjaxModal` of the same title) after "Add a file" (`GridHandler::addAction()` keys actions by id, so the parent's and the subclass's "addFile" make one button). `viewLibrary()` assigns `canEdit` = the user's roles ∩ {`MANAGER`, `SITE_ADMIN`} and fetches `controllers/modals/documentLibrary/publisherLibrary.tpl`, which loads `grid.settings.library.LibraryFileAdminGridHandler` `fetchGrid` with that `canEdit`; `LibraryFileAdminGridHandler::initialize()` reads it (`setCanEdit((bool) $request->getUserVar('canEdit'))`), and `LibraryFileGridHandler::initialize()` sets the title `manager.publication.library` and adds "Add a file" only when it holds. `LibraryFileAdminGridHandler` assigns `addFile`, `uploadFile`, `saveFile`, `editFile`, `updateFile`, `deleteFile` to `MANAGER, SITE_ADMIN` only; the base constructor gives `fetchGrid`, `fetchCategory`, `fetchRow` to `MANAGER, SITE_ADMIN, SUB_EDITOR, ASSISTANT, AUTHOR`, under `ContextAccessPolicy` (`LibraryFileAdminGridDataProvider`). The Settings tab loads the same grid with `canEdit=true`; the Settings pages add `CanAccessSettingsPolicy` (a manager-level group with `permitSettings`, `ManagementHandler::authorize()`), which the grid handler does not, so the tick does not reach "View Document Library" (A7). Page heading `manager.workflow.title` "Workflow Settings". Scratch contexts take `roles: {editor: {permitSettings: false}}` (scenarios.md). Live-probed 2026-09-24 (Actors rows 4–5; Rules 6, 9; Settings bullet 2): "View Document Library" carried "Add a file" and the arrows for the manager-level roles and the Site Administrator and neither for anyone else, whose names still downloaded (all three apps); files added on the tab showed in every submission's "View Document Library" and "Library Files" and in no "Submission Library" window; the Editor of a scratch journal with "Permit changes to Settings" unticked had no "Settings" in the side menu, got the access-denied page at the Settings address, and added, renamed and deleted files in "View Document Library", which the Journal Manager then saw on the tab (OJS, OMP). In the Roles list the Journal manager, Press manager and Preprint Server manager rows have no arrow; in "Edit" the box is live and ticked on the Journal editor and Press editor and greyed on the Section editor, Series editor and Moderator (all three apps, two runs).

<a id="fn-f"></a>
**f** — A Publisher Library file has no `submissionId`, so `LibraryFileHandler::downloadLibraryFile()` sets `$allowedAccess = true` after `FileApiHandler`'s `ContextAccessPolicy` has admitted any of its six roles held in the journal. The composer's list comes from `PKPLibraryController` (note h), whose route admits `SITE_ADMIN, MANAGER, SUB_EDITOR`. Live-probed 2026-09-24 (Actors row 6; Rule 8c; all three apps): every role driven downloaded a Publisher Library file from "View Document Library", and from the composer the Section Editor (OJS, OMP) and the Moderator and Preprint Server Manager (OPS) did.

<a id="fn-g"></a>
**g** — `lib/pkp/pages/libraryFiles/LibraryFileHandler::downloadPublic()`: `LibraryFileDAO::getById($id, $context->getId())` and `getPublicAccess()`, then `downloadByPath($path, null, true)` (`Content-Disposition: inline`); otherwise `403 Forbidden<br>` under `HTTP/1.0 403 Forbidden`, which on the test installs' PHP servers arrives with status 200, `text/html` (A10). It is a page operation with no role assignment (page routes permit by default, `PKPHandler::authorize()`), so no sign-in is needed. A Submission Library file never has `public_access` set (the submission forms carry no box; the column defaults to 0). The box: `controllers/grid/settings/library/form/newFileForm.tpl` and `editFileForm.tpl`, `common.publicAccess` "Public Access" and `settings.libraryFiles.public.viewInstructions` "<p>This library file can be accessible for download, if "Public Access" is enabled, at: <blockquote>{$downloadUrl}</blockquote></p>", the URL built with `page="libraryFiles" op="downloadPublic"` and `path="id"` (a literal) in the new form, `path=$libraryFile->getId()` in the edit form; saved by `setPublicAccess()` in both settings forms. No other template, Vue component or locale string of the three apps links to `downloadPublic` (grep 2026-09-24). Live-probed 2026-09-24 (Actors row 7; Fields "Public Access"; Rules 10a–10b; all three apps): "Add a file" printed an address ending "/libraryFiles/downloadPublic/id" and "Edit" one ending in the file's number; signed out, a ticked PDF answered `application/pdf` with `Content-Disposition: inline; filename="guide-OTH.pdf"` (headless Chromium has no PDF viewer and saves it instead, under that `filename`, the name a browser gives the file saved from the tab; so "opens in the tab" is read from that header); an unticked file, a Submission Library file's number, a deleted file, 999999 and another journal's ticked file each showed "403 Forbidden", the last serving under its own journal's address; neither list nor the journal's home page links to the address.

<a id="fn-h"></a>
**h** — `lib/pkp/classes/components/fileAttachers/Library.php`: `email.addAttachment.libraryFiles` "Library Files", `.description` "Attach files from the Submission and Publisher Libraries.", `.attach` "Attach Library Files"; state `libraryApiUrl` (`GET {journal}/api/v1/_library`) and `includeSubmissionId`. `PKPLibraryController::getLibrary()`: with `includeSubmissionId` (authorized by `SubmissionAccessPolicy`) it lists `LibraryFileDAO::getBySubmissionId()` first, then `getByContextId()` (`submission_id IS NULL`); each item carries `typeName` = `__($libraryFileManager->getTitleKeyFromType($file->getType()))` and the download `url` of note d. `FileAttacherLibrary.vue` renders each as `SelectSubmissionFileListItem` (name, `genre-name` = typeName, `common.download` "Download", a tick box), "No items found." when empty. Offered by `getFileAttachers()` of `InSubmissionStage`, `InExternalReviewRound`, OMP `InInternalReviewRound`, `SendToProduction`, `BackFromCopyediting`, `BackFromProduction`, OPS `Decline` and `RevertDecline`, and `RequestReviewResponsePage` (the OJS author-response request). A discussion message's attacher is `Upload` plus `WorkflowStage` only (*Tasks & discussions* note g). Sending: `DecisionType::validateLibraryAttachment()` accepts a journal file or this submission's file; `Mailable::attachLibraryFile($id, $name)` attaches the stored file under the name the composer passes, the one its chip shows. Neither `LibraryFileDAO::getBySubmissionId()` nor `getByContextId()` orders its query, so on the test installs' Postgres the rows come in storage order and an updated row goes last. Live-probed 2026-09-24 (Actors row 8; Rule 11; Side effects; all three apps): on "Decline Submission" the list read, for example, "144 Author contract Permissions Download", this submission's files first, then the Publisher Library's ("Contracts" labelled right on a press), no other submission's; a submission with no Library file listed the Publisher Library's alone, and an empty journal read "No items found." with "Attach Selected" greyed; a file renamed in "Edit" listed last in its library's part (OJS twice, OMP and OPS once). After "Record Decision" the Author's email carried `article-PER-1.pdf` and `article-OTH.pdf` (OPS `preprint-…`), the names on the chips. On the OJS "Request Author Response" page the Editor and an assigned Section Editor got "Library Files" (two runs); a recommending Section Editor's "Notify Editors" page offered it too (OJS twice, OMP once), and the "Editor Recommendation" discussion the recommendation opened listed "43 article-REP-1.pdf", a download link of the discussion's files. A new discussion's and a reply's "Attach Files" offered "Upload File" and "Workflow Files" only.

<a id="fn-i"></a>
**i** — `lib/pkp/templates/controllers/grid/files/submissionDocuments/form/newFileForm.tpl` and `controllers/grid/settings/library/form/newFileForm.tpl`: `common.name` "Name" (text, `multilingual`, `maxlength="255"`, `required`), `common.type` "Type" (select from `getTypeTitleKeyMap()`, `defaultLabel` `common.chooseOne` "Choose One", `required`), `common.description` "Description" (textarea, `multilingual`, its section `required=true`), `common.file` "File" (`required`, `controllers/fileUploadContainer.tpl`: `common.upload.dragFile` "Drag and drop a file here to begin upload", `common.upload.addFile` "Upload File", `common.upload.changeFile` "Change File"), then `common.requiredField` "Required fields are marked with an asterisk: *" and `{fbvFormButtons}` (defaults `common.cancel` "Cancel", `common.ok` "OK"). The window title is the `AjaxModal` title `grid.action.addFile` "Add a file". Server checks, `LibraryFileForm`: `FormValidatorLocale` on `libraryFileName` (`settings.libraryFiles.nameRequired` "A name is required for this library file."), `FormValidatorCustom` on `fileType` (`settings.libraryFiles.typeRequired` "A file type is required for this library file."); the new forms add `FormValidator` on `temporaryFileId` (`settings.libraryFiles.fileRequired`). In the browser the `required` attributes trigger the form validator first, `validator.required` "This field is required.". Upload: `LibraryFileGridHandler::uploadFile()` → `TemporaryFileManager::handleUpload()`, no file-type restriction. A saved form answers `DAO::getDataChangedEvent()` and the grid reloads. No check compares names (`LibraryFileDAO::filenameExists()` concerns the stored file name, note n). Live-probed 2026-09-24 (Fields; Rules 3, 3a; all three apps, both libraries): "OK" with every field empty showed "This field is required." under "Name" and under "Type" and nothing else; 300 characters typed into "Name" kept 255; a `.txt` and a `.png` were taken; "Description" carried the star and saved empty; "OK" with no file uploaded saved nothing and showed nothing, and with a file the row listed; two files of one name and type made two rows. On a journal with English and French form languages, "Name" and "Description" showed the English box, the "(French)" box opening while the English one had focus, and an English-only name saved.

<a id="fn-j"></a>
**j** — `controllers/grid/files/submissionDocuments/form/editFileForm.tpl` (`AjaxFormHandler`): "Name", "Type" (preselected `$libraryFile->getType()`), "Description", and a "File" table with `common.fileName` "File Name" (`getOriginalFileName()`), `common.fileSize` "File Size" (`getNiceFileSize()`), `common.dateUploaded` "Date uploaded" (`datetimeFormatShort`); `controllers/grid/settings/library/form/editFileForm.tpl` adds the row `common.replaceFile` "Replace file" with the uploader and the "Public Access" box. The submission `EditLibraryFileForm::execute()` saves name, description and type only; the settings `EditLibraryFileForm::execute()`, when a temporary file was uploaded, calls `PKPLibraryFileManager::replaceFromTemporaryFile()` (new stored name, dates, size and original name; the old stored file unlinked; the same `file_id`), then saves name, description, type and "Public Access". The window title is `grid.action.edit` "Edit". Live-probed 2026-09-24 (Fields, the "Edit" window; Rules 4, 10c; all three apps): "File Name", "File Size" ("243B") and "Date uploaded" read back; an emptied "Name" or "Type" set back to "Choose One" was refused as in "Add a file"; a rename with a new type moved the row to that type's group; "Replace file" kept the address and the "Public Access" tick, and the address then served the new file.

<a id="fn-k"></a>
**k** — `lib/pkp/controllers/grid/files/LibraryFileGridHandler.php` (a `CategoryGridHandler`): one column `files`, `grid.libraryFiles.column.files` "Files"; categories = the keys of `getTypeSuffixMap()` (`loadData()`), labelled by `LibraryFileGridCategoryRow::getCategoryLabel()` → `getTitleKeyFromType()` (`settings.libraryFiles.category.marketing` "Marketing", `.permissions` "Permissions", `.reports` "Reports", `.other` "Other"; OMP `.contracts` "Contracts"); each category's rows from `SubmissionDocumentsFilesGridDataProvider::loadCategoryData()` (`getBySubmissionId($submissionId, $fileType)`) or `LibraryFileAdminGridDataProvider::loadCategoryData()` (`getByContextId($contextId, $fileType)`, `submission_id IS NULL`); an empty category prints `grid.noItems` "No Items" (`CategoryGridHandler::$_emptyCategoryRowText`, `templates/controllers/grid/gridBodyPartWithCategory.tpl`). `SubmissionDocumentsFilesGridHandler::initialize()` sets the title to null, so the window's list has no heading of its own. Row actions sit behind the legacy row's toggle (the arrow), as on the other legacy grids. The data providers' queries carry no order (note h), so rows within a group come in storage order. Live-probed 2026-09-24 (Rules 1, 1a, 2; all three apps): the heading "Submission Library", "Add a file", "View Document Library", the column "Files", the groups in the "Type" order with "No Items" when empty, neither another submission's file nor a Publisher Library file, a row icon by the file's kind (a PDF, an image, a text file), and the window's close button; on a press the "Other" group listed its files neither by name nor in the order added.

<a id="fn-l"></a>
**l** — `LibraryFileGridRow`: `deleteFile` is a `RemoteActionConfirmationModal` with `common.confirmDelete` "Are you sure you wish to delete this item? This action cannot be undone.", title `common.delete` "Delete", the default buttons `common.ok` "OK" and `common.cancel` "Cancel", style `negative`. `LibraryFileGridHandler::deleteFile()` checks the CSRF token and calls `LibraryFileManager::deleteById()`, which removes the stored file and the row (`library_file_settings` cascades); the Submission Library's override first checks the file belongs to the submission (Rule 7). Afterwards neither `_library` (note h) nor the download handlers (notes d, g) find the number. Live-probed 2026-09-24 (Rule 5; all three apps): the dialog as quoted; "Cancel" kept the row; "OK" removed it, the group reading "No Items" again, the file left the next "Library Files" list, and a deleted Publisher Library file's public address read "403 Forbidden".

<a id="fn-m"></a>
**m** — pkp/pkp-lib#13294 (`9ca884fc29`, 2026-09-11, in all three checkouts): `SubmissionDocumentsFilesGridHandler::deleteFile()` loads the file by number within the journal and throws "Invalid library file specified!" unless its `submissionId` equals the authorized submission's; the submission `NewLibraryFileForm` takes the submission id from its constructor (the handler passes the authorized submission) instead of reading the request's `submissionId` (the template still posts the hidden field, now ignored); the submission `EditLibraryFileForm` constructor already threw "Invalid library file!" for a file of another journal or submission. The grid's requests are authorized by `SubmissionAccessPolicy` on `submissionId`. A refused request answers with a server error, not a message; no screen sends one, so this rule is read from the code. The daily sync's regression verdict (2026-09-14): a well-formed add keeps working.

<a id="fn-n"></a>
**n** — `PKPLibraryFileManager::generateFileName()`: `{base}-{suffix}.{ext}` with the suffix of `getTypeSuffixMap()` (`MAR`, `PER`, `REP`, `OTH`; OMP adds `CON`), then `{base}-{suffix}-{i}.{ext}` for `i` = 1, 2, … while `LibraryFileDAO::filenameExists()` finds the name among the journal's library files (both libraries share it); names longer than 127 characters are cut first (`truncateFileName()`). `assignFromTemporaryFile()` sets the stored name at upload and at "Replace file"; `setType()` in "Edit" leaves it. `downloadLibraryFile()` calls `FileManager::downloadByPath()` without a name, which sends `Content-Disposition: attachment; filename="{basename of the stored file}"`. The settings `EditLibraryFileForm::execute()` passes the form's `fileType` to `replaceFromTemporaryFile()`, so a replaced file's stored name takes the type chosen in that same "Edit". A4's mechanism is its own footnote. Live-probed 2026-09-24 (Rule 8a; all three apps): "contract.pdf" added as "Marketing" downloaded as "contract-MAR.pdf", a second copy as "contract-MAR-1.pdf", and the first, after "Edit" to "Other", still as "contract-MAR.pdf"; the same file added on the Settings tab gave "contract-MAR-2.pdf"; "-PER", "-REP", "-OTH" and on a press "-CON"; "codes.pdf" (Marketing) replaced with "replacement.pdf" in an "Edit" that also chose "Permissions" downloaded as "replacement-PER.pdf"; the page stayed where it was after each download.

<a id="fn-o"></a>
**o** — No call to the event log, a mailable or a notification manager in `controllers/grid/files/submissionDocuments/`, `controllers/grid/settings/library/`, `controllers/grid/files/LibraryFile*.php`, `controllers/grid/files/form/LibraryFileForm.php`, `controllers/modals/documentLibrary/` or `classes/file/PKPLibraryFileManager.php` (grep 2026-09-24). Live-probed 2026-09-24 (Rule 12; all three apps): after adds, renames and deletes by the Editor, the Author and a Copyeditor, "Activity Log & Notes" › "History" held no library line; the throwaway mailboxes held only the decision's email sent afterwards as a control, and the Editor's header "Tasks" count did not change.

<a id="fn-p"></a>
**p** — `config.TEMPLATE.inc.php` `[general]` `strict = Off`, and the same in each test install's `config.test.inc.php` (OJS, OMP, OPS; read 2026-09-24); no screen shows or changes the option. `PKPApplication::__construct()` registers the global `ASSOC_TYPE_*` aliases only when `!app()->getApplicationStrictModeStatus()`; `SubmissionDocumentsFilesGridHandler::deleteFile()` (added by #13294, note m) reads the bare global `ASSOC_TYPE_SUBMISSION` instead of `Application::ASSOC_TYPE_SUBMISSION`, which is undefined in strict mode, so the call ends in a PHP error and a server-error answer. Not driven: the test installs run with strict mode off. Live-probed 2026-09-24 (Rule 5; all three apps): with strict mode off, "Delete" › "OK" removed the row with no server error.

<a id="fn-q"></a>
**q** — `lib/pkp/js/controllers/form/FormHandler.js`: a changed field sets `formChangesTracked`, and `containerCloseHandler()` then asks `confirm()` with `form.dataHasChanged` "The data on this form has changed. Do you wish to continue without saving?"; "Cancel" at the foot unregisters the form first. A submit that passes the browser's own checks clears `formChangesTracked` before the server answers, so after the silent refusal of an "OK" with no file (A2) the close button no longer asks (A11); a refusal by the browser's checks ("This field is required.") never reaches that point. Live-probed 2026-09-24 (Rule 3b; all three apps, both libraries): a fresh "Add a file" and an "Edit" with a change asked on "Close", "OK" closing the window with no row added; after "OK" with no file uploaded, "Close" asked nothing and no row was added (twice per app); "Cancel" asked nothing; leaving the page with "Add a file" filled in raised the browser's leave-page question.

<a id="fn-s"></a>
**s** — Accounts: `docs/process/users.md` (the seeded roster; `admin`/`admin`, every other account its username twice; throwaway accounts likewise). Where each scenario runs: 1 on the seeded journal, press or preprint server `publicknowledge`, on a scratch submission from `POST scenarios/submission` with submitter `author.alex` (section ART; series `monographs` on the press; section PRE on the preprint server); 2 to 5 on scratch contexts from `POST scenarios/context`, each with its own throwaway `users[]` and its submissions submitted by its throwaway `author`. A Publisher Library change on `publicknowledge` would reach every other suite's "Library Files" list, and a scenario that reads a downloaded name or deletes a file seeds a scratch context, since stored names collide across workers on `publicknowledge` (scenarios.md). On `publicknowledge` the Editor is `editor.diana` (OJS, OMP; a preprint server enrols no editor, so the Preprint Server Manager `manager.maya` takes the Editor's part there) and the Author `author.alex`. A library file named in a given is seeded through `libraryFiles[]` on the context (Publisher Library) or the submission (Submission Library), `{name, type}` with the fixture default; everything else in a scenario's body is done on screen. Uploads from the browser: `article.pdf` is the OJS and OMP fixture; OPS has `preprint.pdf`, so its suite uploads and seeds that and reads every name with "preprint" in place of "article" ("preprint-OTH.pdf", "preprint-PER.pdf"). `replacement.pdf` (scenario 2) is each app's own fixture, a one-page PDF distinct from `article.pdf` and `preprint.pdf`. After any download, a test waits until the list it pressed in has been drawn again at the end of the app's two-second timer (the list replaced, its request done and the file's name link enabled again) before it reads or presses anything in that list (A9, A12). Recipes: 1 — no decisions, no `libraryFiles`; the Control's "History" is *Submission activity log & notes*' window. 2 — a context with a throwaway `manager`; nothing else. 3 — a context with throwaway `manager`, `editor` (OJS, OMP), `sectionEditor` and `author`, and `libraryFiles: [{name: 'Journal guide', type: 'Other'}]`; the submission with the Section Editor in `participants[]` as `sectionEditor` (a Moderator on OPS). 4 — a context with throwaway `manager`, `editor` (OJS, OMP) and `author`, and `libraryFiles: [{name: 'Journal guide', type: 'Other'}]`; the decided submission with no decisions (OJS and OMP on the Submission stage, OPS on Production) and `libraryFiles: [{name: 'Author contract', type: 'Permissions'}, {name: 'Old contract', type: 'Reports'}]`, the second submission with `libraryFiles: [{name: 'Other submission file', type: 'Other'}]`; "Author contract" is the context's only Permissions file, so its stored name is `article-PER.pdf` (the response's `fileName`); the decline is recorded on screen and the Author's email read in the mail catcher, Mailpit at `http://127.0.0.1:8025` (scenarios.md). 5 {OJS OMP} — a context with throwaway `manager`, `editor`, `copyeditor` and `author`, and `libraryFiles: [{name: 'Journal guide', type: 'Other'}]`; the submission with `decisions: ['sendExternalReview', 'accept', 'sendToProduction']`, the Copyeditor in `participants[]` as `copyeditor`, and `libraryFiles: [{name: 'Editor contract', type: 'Permissions'}]`; the second context the same plus `roles: {copyeditor: {stages: {submission: true}}}` (the Copyeditor's "Stage Assignment" box "Submission" ticked, saved as the role's "Edit" window saves it; note d). Live-probed 2026-09-24: both `libraryFiles[]` keys seeded scratch journals and submissions on all three apps. Test run 2026-09-24: every suite green on its first run, OJS and OMP scenarios 1–5, OPS 1–4.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-24 (Rule 1b; OJS, OMP): an assigned Layout Editor on a submission at Copyediting, and an assigned Copyeditor on "Production" and on a submission in review, saw "You don't currently have access to that stage of the workflow." in place of the panels with "Preview" and "Library" in the header; the window was titled "Submission Library" and carried "Add a file" and "View Document Library", and "Layout note" added as "Other" listed. A preprint server has no assistant on the workflow.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-24 (Rule 8a): note n's drive, all three apps.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-24 (Actors row 3; Rule 8b): note d's drive, a file the refused person added themselves included; on OPS the Moderator's "Download" under "Library Files" on "Decline Submission" opened a new tab reading "403 Forbidden" while the email page stayed, and the Preprint Server Manager's downloaded (A1).

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-24 (Rule 3a; all three apps, both libraries): "No file" with "Other" and no upload: the window stayed open, no message showed anywhere, and no row was there after closing; with a file uploaded the window closed and the row listed under "Other".

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-24 (Fields "Description"; all three apps): "Description" carries the star; "Blank description" saved with no message, and its "Edit" showed an empty "Description".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-24 (A4; all three apps): "pdf-guide.pdf" added as "Marketing" downloaded as "pdf-guide.pd-MAR.pdf" and "notes-pdf-draft.pdf" as "notes-MAR.pdf", each file's content intact (the fixture's 243 bytes).

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-24 (Fields "Public Access"; Rules 10a–10b): note g's drive, all three apps.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-24 (Fields "Type"; OMP1): on a press "Choose One", "Contracts", "Marketing", "Permissions", "Reports", "Other", each once; files added as "Contracts" and as "Other" listed under those groups, and each file's "Edit" preselected its type; the Submission Library window, "View Document Library" and the "Press Library" tab start their groups with "Contracts"; a journal and a preprint server list the four without it.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-24 (Fields "Name", "Type"): note i's drive, all three apps, twice.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-24 (Actors row 2; A6): note c's drive; as the Author, "Editor contract" renamed to "Renamed by author" and then deleted, after which the Editor no longer saw it.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-24 (Actors rows 4–5; Rule 6; A7): note e's drive; "Editor upload", added by the Editor kept out of Settings, listed on the Journal Manager's tab (OJS, OMP).

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-24 (Rule 11): note h's drive; on "Decline Submission" "Author contract" (Permissions) and the submission's other files came first, then "Journal guide" (Other) and the rest of the Publisher Library, with no "Other submission file"; "Download" downloaded on the same page.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-24 (Rule 10c; all three apps): before "Replace file", "File Name" "article.pdf" and "File Size" "243B"; after it "replacement.pdf", "244B", a newer "Date uploaded", the same address and "Public Access" still ticked; signed out, the address served "replacement-OTH.pdf".

<a id="fn-a1"></a>
**f-a1** — The window's audience is note b's and its edit rights note c's, while the download is note d's check on the Submission stage. The check is older than the 2022 rename of the page handler (`df90557bf`, pkp/pkp-lib#6091); the grids came to lib/pkp in 2013 (`c81abf340`). Age would read the Submission-stage audience as intent, but the window offers the same files, and the rights to add and delete them, to people the download refuses, and on a preprint server it refuses the submission's own Author, hence a defect. Live-probed 2026-09-24: notes d and td3.

<a id="fn-a2"></a>
**f-a2** — `LibraryFileGridHandler::saveFile()` answers `new JSONMessage(false)` with no content when `validate()` fails; `FileUploadFormHandler` → `AjaxFormHandler::handleResponse()` → `Handler::handleJson()` shows a message only when the answer carries content (`alert(jsonData.content)`), so nothing appears and the controls are enabled again. The hidden `temporaryFileId` input has no browser-side check, so the file is the one field only the server checks, and `settings.libraryFiles.fileRequired` ("A library file is required. Please ensure that you have chosen and uploaded a file.") never reaches the screen. Live-probed 2026-09-24: note td4 (the no-upload end; a file still uploading was not driven).

<a id="fn-a3"></a>
**f-a3** — Both libraries' `newFileForm.tpl` and `editFileForm.tpl` wrap the textarea in `{fbvFormSection title="common.description" required=true}` (the star), while `LibraryFileForm` registers no validator for `description` and the textarea has no `required` attribute. Live-probed 2026-09-24: note td5.

<a id="fn-a4"></a>
**f-a4** — `PKPLibraryFileManager::generateFileName()`: `$baseName = Str::substr($truncated, 0, Str::position($originalFileName, $ext) - 1)`, where `Str::position()` returns the first occurrence of the extension text anywhere in the name: 0 for "pdf-guide.pdf", so `Str::substr(…, 0, -1)` keeps all but the last character ("pdf-guide.pd"); 6 for "notes-pdf-draft.pdf", so "notes". Live-probed 2026-09-24: note td6.

<a id="fn-a5"></a>
**f-a5** — Note p. Live-probed 2026-09-24: the strict-off end only (note p); the strict-on end was not driven.

<a id="fn-a6"></a>
**f-a6** — Note c. Live-probed 2026-09-24: note td10.

<a id="fn-a7"></a>
**f-a7** — Note e. Live-probed 2026-09-24: note td11.

<a id="fn-a8"></a>
**f-a8** — Live-probed 2026-09-24 (Rule 5; all three apps, in two separate drives): a Submission Library file's download address (note d's `downloadLibraryFile`), opened again after "Delete" › "OK", answered status 200, `text/html`, with an empty body, and the server log held no PHP error for it.

<a id="fn-a9"></a>
**f-a9** — `lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js` (identical in the three checkouts): after the post it points `window.location` at the download and schedules `finishCallback_` with `setTimeout(…, 2000)`; a list reload inside that time removes the link element, and the callback throws "There is no handler bound to this element!". Live-probed 2026-09-24 on OJS, four runs (8, 2, 2 and 2 page errors); closing the window right after a download raised nothing, and a wait of 2.1 s after each download removed every occurrence, so a test waits past the two seconds after a download before changing a list.

<a id="fn-a10"></a>
**f-a10** — Notes d and g: both handlers send `HTTP/1.0 403 Forbidden` before the text. Live-probed 2026-09-24 (Rules 8b, 10b; all three apps, every run): the public address of an unticked, a Submission Library, a deleted, an unknown (999999) and another journal's file, and a refused Submission Library download, each answered status 200, `text/html; charset=utf-8`, with the body "403 Forbidden", on the test installs' PHP servers. Other web servers were not checked.

<a id="fn-a11"></a>
**f-a11** — Note q. Live-probed 2026-09-24 (all three apps, twice each): "No file" typed, "Other" chosen, "OK" with no upload, then the window's "Close": no question, the window gone, no row added.
Issue report: [docs/issues/U08-A18-item-window-refused-save-closes-unasked.md](../issues/U08-A18-item-window-refused-save-closes-unasked.md), filed as [pkp-e2e#651](https://github.com/jardakotesovec/pkp-e2e/issues/651).

<a id="fn-a12"></a>
**f-a12** — `lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js`: the two-second `setTimeout` of note f-a9 calls `finishCallback_`, which in one task re-enables the link (`LinkActionHandler.enableLink()`) and then hands the `enable-link-action` answer to `handleJson()`; `FileApiHandler::enableLinkAction()` answers `DAO::getDataChangedEvent()` with no element id, so the event bubbles to the grid and `GridHandler.refreshGridHandler()` fetches the whole grid (`fetch-grid`); `replaceGridResponseHandler_()` replaces the grid element with the server's markup, in which every row's strip (`tr.row_controls`) is rendered hidden and every name link reads `href="#"` until its own script runs. Live-probed 2026-09-30 (Rule 8a; all three apps, the Settings tab, one run each, `.reports/flake-0930/u39s2/person-strip-{ojs,omp,ops}.json`): a throwaway manager on a scratch journal pressed "Journal guide", waited one second and pressed its arrow: "Edit" showed; about 2.1 s after the press on the name the page asked for the list again (`library-file-admin-grid/fetch-grid`), and three seconds after the arrow "Edit" was hidden and the arrow read closed (`show_extras`); no page error. Test run 2026-09-30 (the U39 files five times each, OJS 25/25, OMP 25/25, OPS 20/20, green): after every download the page object waited for the list it pressed in to be replaced, and each was, in the "Submission Library" window, in "View Document Library" and on the tab. No request failed on the path.

<a id="fn-omp1"></a>
**f-omp1** — `omp/classes/file/LibraryFileManager.php` overrides `getTypeSuffixMap()`, `getTypeTitleKeyMap()` and `getTypeNameMap()` to put `LibraryFile::LIBRARY_FILE_TYPE_CONTRACT` ("CON", `settings.libraryFiles.category.contracts` "Contracts") before the lib/pkp set; OJS's and OPS's `LibraryFileManager` are empty subclasses of `PKPLibraryFileManager` (positive chain evidence, RUNBOOK rule 8). The overrides use `array_merge()`, which renumbers integer keys, so a press stores its types as 0–4 (Contracts 0 … Other 4) instead of lib/pkp's 1–5; the numbering is consistent within OMP and nothing on screen shows it. Each override also merges into its own `static $map`, so a second call in the same request returns the four shared types again under 5–8; the lists read the first five numbers, which do not change. Live-probed 2026-09-24: note td8; the composer's "Library Files" labels a press's "Contracts" file right.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Workflow header "Library" → the "Submission Library" window | workflow header, editorial and author views | AFFW-236 · AFFW-615 · GRID-061 |
| The Submission Library list ("Add a file", "View Document Library", groups, rows, "Edit", "Delete") | "Library" window | GRID-034 · GRID-021 |
| Submission Library "Add a file" window | "Library" › "Add a file" | AFFW-617 |
| Submission Library "Edit" window | a row's arrow › "Edit" | AFFW-618 |
| "View Document Library" window (the Publisher Library, read-only or editable) | "Library" › "View Document Library" | AFFW-616 · GRID-045 |
| Settings › Workflow › "Publisher Library" tab list | Settings › Workflow › "Publisher Library" ("Press Library", "Preprint Server Library") | GRID-045 · GRID-021 · AFFM-082 · AFFM-083 · AFFM-084 |
| Publisher Library "Add a file" window ("Public Access") | the tab or "View Document Library" › "Add a file" | AFFW-619 · AFFM-082 |
| Publisher Library "Edit" window ("Replace file", "Public Access") | a row's arrow › "Edit" | AFFW-620 · AFFM-083 |
| "Delete" dialog | a row's arrow › "Delete" | AFFM-084 |
| Public address of a Publisher Library file | `{journal}/libraryFiles/downloadPublic/{number}` | ROUTE-015 |
| "Library Files" list of the email composer | "Attach Files" › "Attach Library Files" (`GET {journal}/api/v1/_library`) | API-004 |
| Tick-box Publisher Library list (no screen loads it; UNASSIGNED item 24) | `grid.files.SelectableLibraryFileGridHandler` | GRID-030 |

## Reference — code anchors

- ui-library: `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorial{OJS,OMP,OPS}.js` and `workflowConfigAuthor{OJS,OMP,OPS}.js` (`getHeaderItems()`, "Library") · `src/pages/workflow/composables/useWorkflowActions.js::workflowViewLibrary()` · `src/components/FileAttacher/FileAttacherLibrary.vue`
- Windows and grids: `lib/pkp/controllers/modals/documentLibrary/DocumentLibraryHandler.php` · `lib/pkp/templates/controllers/modals/documentLibrary/{documentLibrary,publisherLibrary}.tpl` · `lib/pkp/controllers/grid/files/{LibraryFileGridHandler,LibraryFileGridRow,LibraryFileGridCategoryRow,LibraryFileGridCellProvider,SelectableLibraryFileGridHandler}.php` · `lib/pkp/controllers/grid/files/submissionDocuments/{SubmissionDocumentsFilesGridHandler,SubmissionDocumentsFilesGridDataProvider}.php` · `lib/pkp/controllers/grid/settings/library/{LibraryFileAdminGridHandler,LibraryFileAdminGridDataProvider}.php`
- Forms: `lib/pkp/controllers/grid/files/form/LibraryFileForm.php` · `lib/pkp/controllers/grid/files/submissionDocuments/form/{NewLibraryFileForm,EditLibraryFileForm}.php` · `lib/pkp/controllers/grid/settings/library/form/{NewLibraryFileForm,EditLibraryFileForm}.php` · `lib/pkp/templates/controllers/grid/files/submissionDocuments/form/{newFileForm,editFileForm}.tpl` · `lib/pkp/templates/controllers/grid/settings/library/form/{newFileForm,editFileForm}.tpl` · `lib/pkp/templates/controllers/fileUploadContainer.tpl`
- Downloads: `lib/pkp/controllers/api/file/FileApiHandler.php` (`downloadLibraryFile`, `enableLinkAction`) · `lib/pkp/controllers/api/file/linkAction/DownloadLibraryFileLinkAction.php` · `lib/pkp/pages/libraryFiles/{index,LibraryFileHandler}.php` (`downloadPublic`) · `lib/pkp/js/classes/linkAction/PostAndRedirectRequest.js`
- Model and storage: `lib/pkp/classes/context/{LibraryFile,LibraryFileDAO}.php` · `lib/pkp/classes/file/PKPLibraryFileManager.php` · `classes/file/LibraryFileManager.php` (OJS, OPS empty; OMP adds "Contracts") · `lib/pkp/classes/migration/install/LibraryFilesMigration.php`
- Composer: `lib/pkp/api/v1/_library/PKPLibraryController.php` · `lib/pkp/classes/components/fileAttachers/Library.php` · `lib/pkp/classes/decision/DecisionType.php::validateLibraryAttachment()` · `lib/pkp/classes/mail/Mailable.php::attachLibraryFile()` · `lib/pkp/classes/components/RequestReviewResponsePage.php`
- Settings: `lib/pkp/templates/management/workflow.tpl` (tab `library`) · `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php` · `registry/userGroups.xml` (OJS, OMP, OPS; stage sets)
- Never rendered: `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php` (`submissionLibraryUrl`; the page forwards to My Submissions) · `SelectableLibraryFileGridHandler` (UNASSIGNED item 24)
- Locale: each app's `locale/en/manager.po` (`manager.publication.library`), lib/pkp `locale/en/{grid,manager,common,editor}.po` (`grid.libraryFiles.*`, `grid.action.addFile`, `grid.action.viewLibrary`, `settings.libraryFiles.*`, `common.publicAccess`, `editor.submissionLibrary`, `email.addAttachment.libraryFiles*`)
