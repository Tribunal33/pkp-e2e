---
name: submission-files
status: verified
---

# Submission files

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every piece of work a journal handles travels as files: the manuscript the
author uploads, the versions reviewers read, the revisions the author sends
back, the copyedited text and the files the Layout Editor turns into
galleys. This feature is how anyone with access to a stage of a submission
puts files there, replaces them with revised versions, names and labels
them, reads their history and notes, removes them and downloads them. It
owns the machinery every file list uses: the lists on the workflow stages
with their "More Actions" menu, the three-step **upload wizard** (the window
that opens on "Upload", with the steps "1. Upload File", "2. Review
Details" and "3. Confirm"), the "Update File Details" window (titled
"Edit a file") and the "More Information" window (titled "Information
Center: {file name}"), the delete dialog and the downloads, plus the
"Files" panel of the submission wizard's "Upload Files" step. <sup>a</sup>

Which lists a stage shows, and the stage's own rules about them, belong to
the stage's feature:
*[Submission stage](U25-submission-stage.md#panels)* ("Submission Files"),
*[Review stage & rounds](U26-review-stage-and-rounds.md#review-files)*
("Files for Review", "Revisions Uploaded"),
*[Copyediting stage](U32-copyediting-stage.md#draft-files)* ("Draft
Files", "Copyedited Files") and
*[Production stage](U33-production-stage.md#production-ready-files)*
("Production Ready Files"). This spec describes how the lists and windows
work once they are on screen. Each file carries a **component**, the kind
of file it is: the upload wizard asks for the "Article Component"
("Submission Component" on a press, "Preprint Component" on a preprint
server), the lists show it under "Type", and the submission wizard asks
"What kind of file is this?". The journal's list of components is configured under
Settings › Workflow › Submission › "Components" (*Submission intake
configuration*). <sup>a</sup> <sup>q</sup>

A preprint server lists no files on its workflow: its single Production
stage shows discussions and participants only, and its submission wizard's
first step manages galleys. On a preprint server this feature's machinery
appears only through the galleys: a galley's "Change File" opens the
upload wizard and its "More Information" the window of Rule 13
[OPS1](#ops1). <sup>a</sup> <sup>l</sup>

## Actors & permissions

Who may open a stage at all is the shared workflow gate,
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access). In
the rows below, **the stage's team** means: <sup>b</sup>

- on every submission: a Site Administrator holding a journal role, a
  Journal Manager, an Editor, and a Production editor who is not assigned
  to the submission; <sup>b</sup>
- on the submissions they are assigned to: a Production editor, on
  Copyediting and Production only (the other stages read "You don't
  currently have access to that stage of the workflow.";
  [→ Stage participants' A8](U35-stage-participants.md#a8)); and a
  Section Editor, a Guest Editor {OJS} (a press has no such role) and
  every assistant role (Copyeditor, Designer, Funding coordinator,
  Indexer, Layout Editor, Marketing and sales coordinator, Proofreader),
  on the stages their role's stage set includes. <sup>b</sup>

An Author sees a list only where the stage's author view shows it:
"Submission Files", "Revisions Uploaded" and "Copyedited Files". The rows
record what each role is offered once the list is on screen. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See a workflow file list** (Rule 1) | • The stage's team, on every list of the stage<br>• Author: "Submission Files", "Revisions Uploaded" and "Copyedited Files" of their own submission, in the author view of each stage (the stage specs above)<br>• On a preprint server: nobody; there are no workflow lists [OPS1](#ops1) <sup>b</sup> |
| **Add a file to a list** ("Upload" or "Upload/Select Files" above it; Rules 2, 5, 15) | • The stage's team: "Upload" on "Submission Files", "Revisions Uploaded" and "Production Ready Files"; "Upload/Select Files" on "Files for Review", "Draft Files" and "Copyedited Files"<br>• Author: "Upload" on "Revisions Uploaded" and the "Upload revisions" button under the round, while the round asks for revisions ([→ Revisions Uploaded](U26-review-stage-and-rounds.md#revisions)). "Upload revisions" shows only then; "Upload" shows on every round, and before revisions are requested its window refuses them ⚠ [A7](#a7)<br>• Author: never on "Submission Files" once the submission is submitted: before that, the submission wizard's "Files" panel is their upload (Actors row 9) <sup>c</sup> |
| **"Update File Details"** (a row's "More Actions" menu; Rule 10) | • The stage's team, on every list<br>• Author: on "Submission Files" and "Revisions Uploaded", for files they uploaded themselves. The entry is offered on every row of those lists, and on a file somebody else uploaded the window refuses them ⚠ [A2](#a2)<br>• Author: never on "Copyedited Files" <sup>d</sup> <sup>d1</sup> |
| **"More Information"** (row menu; Rules 13–14) | • The stage's team, on every list. The window's "History" tab never loads for the assistant roles: it keeps showing "Loading" ⚠ [A3](#a3)<br>• Adding a note: everybody the window opens for<br>• Deleting a note: a Journal Manager, Editor, Production editor, Section Editor or Guest Editor {OJS}, any note, whoever wrote it; never an assistant role, not even on their own note<br>• Author: never; the menu has no such entry for them <sup>e</sup> <sup>d2</sup> |
| **"Delete"** (row menu; Rule 4) | • The stage's team, on every list<br>• Author: on "Revisions Uploaded" only <sup>g</sup> |
| **"Download All Files"** (under a list; Rule 3) | • The stage's team: under "Submission Files" and "Production Ready Files"<br>• Author: under "Submission Files"<br>• Every role, only while the list holds at least one file; the other lists never offer it <sup>h</sup> <sup>d1</sup> |
| **Download a file** (its name in a list; Rule 3) | • Everyone the list shows the file to<br>• A reviewer: the files their review gives them (*[Reviewer's review](U28-reviewers-review.md#step-1)*), under a neutral name in an "Anonymous Reviewer/Anonymous Author" review, under the file's own name in an "Anonymous Reviewer/Disclosed Author" or "Open" one (Rule 3) <sup>i</sup> |
| **"Send to Text Editor"** (row menu, for a Word, OpenDocument, RTF, LaTeX or Markdown file) | • Site Administrator; Journal Manager, Editor and Production editor (the manager-level roles), on every list<br>• Section Editor, Guest Editor {OJS}, the assistant roles, Author: never. The window it opens, "Send File to Text Editor", is *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*' Rule 16; what the send does is *JATS & Body Text*'s <sup>j</sup> <sup>d10</sup> |
| **The submission wizard's "Files" panel** {OJS OMP} (add, choose the component, change it, remove; Rules 17–18) | • Whoever may open the draft's wizard (*[Submission wizard](U21-submission-wizard.md)*, its Actors), until the submission is submitted <sup>k</sup> |
| **A galley's file** {OJS OPS} ("Change File" and "More Information" on the publication's "Galleys" page) | • Who is offered them is *Galleys*'. "Change File" opens this spec's upload wizard for that one file (Rule 9a), "More Information" this spec's window (Rule 13)<br>• A press's publication formats belong to *Publication formats & proof terms* {OMP} <sup>l</sup> |

## Fields & validation

**Upload wizard, "1. Upload File"** (Rules 5–6). <sup>o</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "If you are uploading a revision of an existing file, please indicate which file." | No | A drop-down of the files already in the list, opening on "This is not a revision of an existing file". Shown only when the list already holds a file, and listing that list's files only, each by its name alone, with no number or component ⚠ [A8](#a8). Choosing a file makes the upload a revision of it (Rule 8). <sup>o</sup> |
| "Article Component" ("Submission Component" on a press, "Preprint Component" on a preprint server) | Yes, for a new file | A drop-down opening on "Select article component" ("Select component", "Select preprint component"), listing the journal's components (with the install's list, in the "Components" tab's order), except the ones marked as dependent files (Settings bullet 1). Choosing a file to revise sets it to that file's component and greys it out. <sup>o</sup> |
| The upload box | Yes | Hidden until a component or a file to revise is chosen; a screen reader reads it all the same ⚠ [A9](#a9). A button "Upload File" and the text "Drag and drop a file here to begin upload"; once a file is uploaded, its name and "Change File" (Rule 5a). <sup>o</sup> |
| "How to ensure all files are anonymized" | — | A link, shown only with the journal's anonymizing setting on, and only on the Submission and review stages (Settings bullet 2). <sup>o</sup> |

**"2. Review Details" and the "Update File Details" window** (Rules 10–12). <sup>t</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name the file (e.g., Manuscript; Table 1)" | Yes | Arrives holding the uploaded file's own name, extension included. One box per language the journal accepts for submissions, shown one at a time behind language tabs ("English", "French (Canada)"); the form opens on the submission's own language, whose box holds the name. A journal with one such language shows one box and no tabs (Settings bullet 5). Emptied, the save is refused: "This field is required." under the box, and the window stays open. <sup>d11</sup> |
| "Summary of Changes (Amendment Notice)" | No | Shown only for a file in "Revisions Uploaded", with the hint "Describe the key changes made in this version - for example, corrected figures, updated data, or revised methodology. The editor will review this before it appears publicly." One text, not per language (Rule 12). <sup>t</sup> |
| "Description", "Creator (or owner) of file", "Publisher", "Source", "Subject", "Contributor or sponsoring agency", "Date", "Language" | No | Shown only when the file's component has "Supplementary Content" metadata (Settings bullet 1). <sup>t</sup> |
| "Caption", "Credit", "Copyright Owner", "Permission Terms" | No | Shown only when the file's component has "Artwork" metadata (Settings bullet 1). <sup>t</sup> |
| "Dependent Files" | — | A list shown under the fields for an HTML or XML file (Rule 11). <sup>u</sup> |

**"More Information" › "Notes"** (Rule 14). <sup>v</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Add Note" | No | A text box with an "Add Note" button under it. An empty box is accepted (Rule 14, [A10](#a10)). <sup>d14</sup> |

**The submission wizard's "Edit {file name}" panel** {OJS OMP} (Rule 18). <sup>k</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "What kind of file is this?" | No | One radio button per component, dependent ones excluded, under the hint "Choose the option that best describes this file."; "Save" stores the choice. "Save" with no button chosen fails (Rule 18, [A11](#a11)). <sup>k</sup> |

## Rules & state

<a id="file-lists"></a>
1. **A workflow file list** {OJS OMP}. Each list is a table under its
   heading and a one-line description (the stage specs name them). Its
   columns read "No" (the file's number, with an icon for its kind of
   document), "File Name", "Date uploaded" and "Type" (the component, and
   "Amendment Notice" beside it on a revision that carries a summary, Rule
   12), then a "More Actions" button on each row that has anything to
   offer. An empty list reads "No Items". The same file number follows a
   file through its revisions (Rule 8); a copy of a file on another list
   has a number of its own (Rule 15). <sup>m</sup>
<a id="row-menu"></a>
2. **What a list offers.** Above the list sits "Upload" (Rules 5–7) or
   "Upload/Select Files" (Rule 15), depending on the list (Actors row 2).
   A row's "More Actions" menu offers, in this order, the entries the
   reader may use: "Send to Text Editor" (for an importable file,
   Actors), "Update File Details", "More Information" and "Delete". The
   menu button reads "More Actions" on every row, with no file name in
   it ⚠ [A6](#a6). <sup>m</sup> <sup>j</sup>
<a id="download"></a>
3. **Downloading.** A file's name in a list is a link that downloads the
   file (in a new browser tab), under the name the list shows; <sup>d19</sup> when that
   name lacks the file's extension, the download adds it ("Manuscript"
   downloads as "Manuscript.pdf"). While "Submission Files" or
   "Production Ready Files" holds at least one file, "Download All Files"
   under it downloads the whole list as one zip file named after the
   submission's number and the list, with two hyphens between them:
   "12--submission-files.zip", "12--production-ready-files.zip"
   ⚠ [A12](#a12). An empty list shows no such button. <sup>h</sup> A
   reviewer on an "Anonymous Reviewer/Anonymous Author" review downloads
   each file under a neutral name built from the journal's acronym, the
   words "review-assignment", the submission's number, the component and
   the file's number, never the name the author gave it; the editors
   download the same file under its own name. On an "Anonymous
   Reviewer/Disclosed Author" or "Open" review the reviewer gets the
   file's own name too. <sup>i</sup> <sup>d9</sup>
<a id="delete"></a>
4. **Deleting.** "Delete" asks, in a window titled "Delete", "Are you sure
   you wish to delete this item? This action cannot be undone." with "OK"
   and "Cancel". "OK" removes the file from the list and the message
   "Removed file." appears; its dependent files go with it (Rule 11).
   "Cancel" closes the window and changes nothing. "OK" also removes
   every copy made from the file through "Upload/Select Files" (Rule 15):
   deleting a "Submission Files" file empties its copy from "Draft
   Files", although the dialog speaks of one item ⚠ [A13](#a13).
   <sup>g</sup>
<a id="upload-wizard"></a>
5. **The upload wizard.** "Upload", or a window's upload link, opens the
   wizard in a window titled after where it was opened: <sup>n</sup>
   - "Submission Files": "Upload Submission File";
   - "Revisions Uploaded", the author's "Upload revisions" and the review
     round's "Upload/Select Files" window: "Upload Review File";
   - "Production Ready Files": "Upload a Production Ready File";
   - the "Draft Files" window: "Upload File"; the "Copyedited Files"
     window: "Upload Copyedited File";
   - a galley's "Change File": "Upload a File Ready for Publication";
   - a "Dependent Files" list: "Upload a Dependent File" (Rule 11);
   - a reviewer's own file (*[Reviewer's
     review](U28-reviewers-review.md#step-3)*): "Upload File". Here step
     1 shows the upload box at once, with no component or file list, so
     the file has no component. <sup>n</sup>

   The steps read "1. Upload File", "2. Review Details" and "3. Confirm";
   under them sit a "Continue" button and a "Cancel" link. Once the
   wizard moves on, "1. Upload File" can no longer be pressed; from "3.
   Confirm", pressing "2. Review Details" opens step 2 again (Rule 5b).
   The three step names look alike whatever their state. The window
   offers the same components and the same files to revise whoever
   opens it. <sup>n</sup> <sup>d21</sup>
   - 5a. **Step 1.** The upload box stays hidden until a component is
     chosen, or a file to revise (Fields). "Continue" is greyed out until
     a file has finished uploading. "Change File" uploads another file
     in place of the first on screen, but the first one stays on the
     list as a file of its own ⚠ [A14](#a14). <sup>o</sup> <sup>p</sup>
   - 5b. **Step 2, "Review Details".** The fields of the Fields table.
     "Continue" saves them and moves to step 3. Opened again from step
     3, the step's button reads "Complete" ⚠ [A15](#a15). <sup>t</sup>
   - 5c. **Step 3, "Confirm".** The heading "File Added", an "Add Another
     File" button that starts again at step 1 in the same window, and
     "Complete", which closes the window; the list then shows the new
     file. A galley's upload has no "Add Another File". <sup>n</sup>
<a id="stored-at-step-1"></a>
6. **The file is stored as soon as it is uploaded.** A file exists on the
   list from the moment step 1's upload finishes, before "Continue" is
   pressed. Closing the window with its header "Close", at any step,
   keeps the file with the component chosen in step 1. Closed before
   step 2's "Continue", the file keeps its uploaded name, even if another
   name was typed on step 2; closed after it, the name saved there. On
   step 1 the browser first asks "The data on this form has changed. Do
   you wish to continue without saving?": "OK" closes the window with
   the file kept, "Cancel" keeps the window open. Steps 2 and 3 ask
   nothing. A galley's "Change File" asks nothing either (Rule 9a).
   <sup>p</sup>
<a id="wizard-cancel"></a>
7. **"Cancel" undoes the upload.** Pressing the wizard's "Cancel" link
   after a file has been uploaded, before "Complete", removes that file:
   a new file is gone from the list, and a revision gives back the file it
   replaced (Rule 9). "Cancel" asks nothing at any step. <sup>p</sup> <sup>s</sup>

   What that means for an author's revision request is [→ Revisions Uploaded](U26-review-stage-and-rounds.md#revisions)'s. <sup>aa</sup>
<a id="revise"></a>
8. **Revising a file.** Choosing a file in step 1's "If you are uploading a
   revision…" list makes the upload replace it: after "Complete" the list
   shows one row with the same file number, the new file's name, and the
   component of the file it replaced; there is no second row. The earlier
   version is not lost: the file's "More Information" › "History" lists
   each upload, and each upload row offers, behind its arrow, a
   "Download" that fetches that version (Rule 13b). <sup>r</sup>
<a id="cancel-restore"></a>
9. **Cancelling a revision restores the file it replaced.** When the
   upload in step 1 was a revision, "Cancel", at any step, closes the
   window and puts back the previous file under the name it had when the
   wizard opened: a rename through "Update File Details" since its last
   upload, by anyone, is kept. The file's "History"
   (Rule 13a) keeps no line of the cancelled upload. Closing the window
   with its header "Close" instead keeps the new file (Rule 6), and the
   earlier version stays in "History" as a "Download" (Rule 8).
   <sup>s</sup> <sup>d5</sup>
   - 9a. **A galley's "Change File"** {OJS OPS} is always a revision of
     the galley's current file. Step 1 shows the heading "Current file"
     and the upload box, and no component or file list. Nothing stands
     under "Current file" until a file is uploaded; then it names the
     new file ⚠ [A5](#a5). "Cancel" puts the galley's previous file
     back, and "History" in the galley's "More Information" keeps no
     line of the cancelled upload. Closing the window with its header "Close" instead asks
     nothing, and the galley serves the new file from then on
     ⚠ [A16](#a16). <sup>d4</sup>
   - 9b. **A second pick, then "Cancel".** A revision uploaded on step
     1 can be swapped there for another file with the upload box's
     "Change File" (Rule 5a). "Cancel" after such a swap, here or in a
     galley's "Change File" {OJS OPS}, puts back the file as it was
     before the wizard opened, not the file picked first ⚠ [A23](#a23).
     <sup>s</sup>
   - 9c. **One file revised in two windows.** When the same person has
     the upload wizard open on the same file in two browser windows,
     each with a revision uploaded, "Cancel" in each window closes it,
     and once both are cancelled the file is as it was before either
     opened ⚠ [A24](#a24). <sup>s</sup>
<a id="file-details"></a>
10. **"Update File Details".** The row menu's "Update File Details" opens
    a window titled "Edit a file" with the fields of step 2 (Fields) and
    "Save" and "Cancel". "Save" stores the changes and closes the window;
    the list shows the new name at once. It changes the file's details
    only: the file itself is replaced by revising it (Rule 8), and the
    component is chosen once, at upload. <sup>t</sup> <sup>d11</sup>
<a id="dependent-files"></a>
11. **Dependent files.** An HTML or XML file carries its own "Dependent
    Files" list (images, style sheets, media the page needs), shown under
    the fields of step 2, of "Edit a file" and of an HTML galley's "Edit"
    window. Its "Upload File" opens the
    wizard titled "Upload a Dependent File", whose component list offers
    only the components marked as dependent files (by default "Image" and
    "HTML Stylesheet", and "Multimedia" on a journal or preprint server),
    which the main lists never offer. A dependent file appears only in that list, never as a row of
    the stage's list; deleting the main file deletes its dependent files
    (Rule 4). On a galley whose version is published, the list keeps only
    each file's "More Information". <sup>u</sup> <sup>d13</sup>
<a id="amendment-notice"></a>
12. **The amendment notice.** A file uploaded to "Revisions Uploaded"
    offers the "Summary of Changes (Amendment Notice)" box in step 2 and in
    "Edit a file". A saved summary shows as the badge "Amendment Notice"
    in the file's "Type" cell, and is what the publication's "Insert
    Content" offers ([→ Publish, schedule &
    versions](U49-publish-schedule-and-versions.md), its Rule 14).
    <sup>t</sup> <sup>m</sup>
<a id="more-information"></a>
13. **"More Information".** The row menu's "More Information" opens a
    window titled "Information Center: {file name}" ("Information Center:
    {galley label}" for a galley on a preprint server, such as
    "Information Center: PDF") with two tabs, "History" and "Notes", and
    opens on "History". <sup>v</sup> <sup>d16</sup>
    - 13a. **"History".** A table with the columns "Date", "User" and
      "Event", newest first. Its rows: <sup>v</sup> <sup>d3</sup>
      - the file's upload ("A file "{file name}" was uploaded for
        submission {number} by {username}.") and each revision ("A file
        revision "{file name}" was uploaded for submission {number} by
        {username}."), each with a second row "The metadata for file
        "{file name}" was edited by {username}." from the upload's
        "Review Details" step;
      - each "Update File Details" save (the same "The metadata for
        file…" row);
      - each note ("Posted new note."), kept after the note is deleted.

      A copy made through "Upload/Select Files" starts with one upload
      row, naming whoever made the copy. <sup>v</sup> <sup>d3</sup>
    - 13b. **Downloads and the prior-versions box.** An upload or
      revision row starts with an arrow (a screen reader calls it
      "Settings"); pressing it shows "Download", which fetches the
      version the row records. After two such downloads, closing the
      window can make the page's script fail, with nothing on screen
      ⚠ [A17](#a17). For the stage's team the tab has a "Search" button
      that opens the box "Show events from prior versions"; ticking it
      and pressing "Search" reloads the same rows, with the box closed
      and unticked again ⚠ [A4](#a4). <sup>v</sup> <sup>d3</sup>
<a id="notes"></a>
14. **"Notes".** The tab lists the file's notes, each with its writer's
    name and date, or "There are no notes to display." when there are
    none. "Add Note" saves the text as a new note: the list shows it and
    the message "Note posted." appears. With the box empty, "Add Note"
    posts a note with no text all the same ⚠ [A10](#a10). A note's
    "Delete" (Actors row 4) asks "Are you sure you wish to delete this
    note?"; confirming removes it with the message "Note deleted.".
    <sup>d14</sup>
    Under the list, "Earlier Revision
    Notes" opens the notes of the file this one was copied from (Rule 15),
    with no "Delete", or "There are no notes to display." for a file that
    was not copied. <sup>v</sup> <sup>d18</sup>
    - 14a. **Text not added.** Switching to "History" with text typed in
      the box and not added asks "The data on this form has changed. Do
      you wish to continue without saving?"; "OK" opens "History", and
      the box is empty on the way back.
      Closing the window instead drops the text without asking
      ⚠ [A18](#a18). <sup>v</sup>
<a id="select-window"></a>
15. **"Upload/Select Files".** On "Files for Review", "Draft Files" and
    "Copyedited Files", "Upload/Select Files" opens a window listing the
    stage's files under the stage's name, each with a tick box; ticking
    "Show files from all accessible workflow stages." above them adds the
    other stages the reader may open, each under its name (for a Section
    Editor also an empty "Done" after "Production"). An "Upload File"
    link ("Upload Review File" in the "Files for Review" window) opens the
    upload wizard, and "OK" and "Cancel" close the window. Ticking a file
    that sits on another list and pressing "OK" copies it onto this list
    as a new row with a number of its own; the original stays where it
    was. Within the window a row offers "More Information", and on the
    Copyediting lists also "Edit" (the "Edit a file" window) and "Delete".
    They work on the list's own stage; on a file listed under another
    stage they fail, the Journal Manager included ⚠ [A19](#a19).
    What the tick boxes mean on each stage, and what the window's title
    reads, are the stage's:
    [→ the review window](U26-review-stage-and-rounds.md#review-files),
    [→ the Copyediting window](U32-copyediting-stage.md#select-window).
    <sup>w</sup>
16. **Older file lists.** The file lists inside other windows (the
    "Dependent Files" list, the reviewer's "Review Files" list, the file
    list in the editor's windows for a reviewer's request) show the file's
    number and name, the name a download link, and a "Search" control
    that narrows the list to files whose name contains the typed text. On
    the reviewer's "Review Files" list the search keeps every file
    ⚠ [A20](#a20). <sup>x</sup> <sup>d13</sup>
<a id="wizard-panel"></a>
17. **The submission wizard's "Files" panel** {OJS OMP}. On the "Upload
    Files" step the panel is headed "Files", with "Add File" at the top
    right; the journal's upload guidance stands beside it, to its left,
    under the heading "Upload Files" (Settings bullet 4). An empty panel
    reads "Upload any files the editorial team will need to evaluate your
    submission." with an "Upload File" link. "Add File" or the link opens
    the computer's file picker; a file can also be dropped anywhere on the
    panel. A finished file is stored at once, as its own row: its name (a
    link that downloads it), "Edit" and "Remove". <sup>k</sup>
    - 17a. **While a file uploads** its row shows its name, a progress bar
      and "Cancel upload" (a screen reader hears "Uploading {percent}%
      complete"). "Cancel upload" removes the row at once without asking.
      Pressed while the file is still on its way, it keeps nothing. The
      button stays until the server has answered, and pressed once the
      whole file has been sent (its bar full, its name not yet a link) it
      keeps the file: after a reload it is back on the panel ⚠ [A25](#a25).
      Leaving the page while a file uploads asks nothing and keeps
      nothing. <sup>k</sup>
    - 17b. **The upload limit.** A file larger than the install allows is
      refused in its row with "File is too big ({size}MiB). Max filesize:
      {limit}MiB.", for example "File is too big (101MiB). Max filesize:
      100MiB."; "Cancel upload" clears the row. A file of exactly the
      limit is not refused there: it starts uploading and ends with
      "Invalid JSON response from server." in its row, and nothing is
      stored ⚠ [A21](#a21). <sup>k</sup>
18. **Choosing the component in the panel** {OJS OMP}. A new row reads
    "What kind of file is this?" followed by one link per main-work
    component ("Article Text" on a journal; "Book Manuscript" and "Chapter
    Manuscript" on a press) and "Other". Choosing a component saves it
    at once (a spinner shows briefly), and the row shows it as a badge.
    "Other" and the row's "Edit" open a side panel titled "Edit {file
    name}" with every component except the dependent ones as a radio
    button (Fields); "Save" stores the choice. "Save" with no button
    chosen shows "An unexpected error has occurred. Please reload the
    page and try again." ⚠ [A11](#a11). "Remove" asks, in a window titled
    "Remove", "Are you sure you want to remove this file?" with "Yes" and
    "No"; "Yes" removes the file. <sup>k</sup>
    - 18a. **A file without a component** stays on the panel with its
      question and does not stop the submission: it goes through, and
      shows in "Submission Files" with an empty "Type". Only a component
      the journal requires with no file stops "Submit" (Settings bullet
      1; [→ what must be complete to submit](U21-submission-wizard.md#submit-gates)).
      After the submit the files are the "Submission Files" list.
      <sup>k</sup> <sup>d8</sup>

## Side effects

- **An upload, a revision, an edit, a note.** Each adds its rows to the
  file's "History" (Rule 13a). The submission's Activity Log also gains a
  line naming the file for each upload, revision, edit and delete, and
  none for a note; a revision cancelled with "Cancel" leaves no line in
  either (Rule 9). A new file's upload reads there "Revision "{file
  name}" was uploaded for file {number}." ⚠ [A22](#a22). That log is
  *Submission activity log & notes*'. <sup>y</sup> <sup>d20</sup>
- **A deleted file.** "Removed file." appears; the file's dependent files
  and every copy made from it are deleted with it (Rule 4, [A13](#a13)).
  What a deleted copyedited file does to the Copyediting notice box is
  [→ the Copyediting notices](U32-copyediting-stage.md#notices)'.
  <sup>g</sup> <sup>y</sup>
- **An author's revision.** An Author's upload to "Revisions Uploaded"
  sends the assigned editors the "Revised Version Uploaded" email, moves
  the round's status and clears the author's "Revision required." task
  ("Revisions to consider in External Review." on a press), all as
  [→ Revisions Uploaded](U26-review-stage-and-rounds.md#revisions)
  describes. <sup>y</sup>
- **A note.** "Note posted." and "Note deleted." appear on screen (Rule
  14); nobody is emailed and no task is raised. <sup>v</sup>
- **Nothing else is emailed**: no upload but the Author's revision, no
  edit, delete, note or download sends an email. <sup>y</sup>

## Settings that modify behavior

- **"Components"** <sup>z</sup> (Settings › Workflow › Submission › the "Components"
  tab, the list titled "Article Components", "Monograph Components" on a
  press, "Preprint Components" on a preprint server; *Submission intake
  configuration*). Install default on a journal: "Article Text", "Research
  Instrument", "Research Materials", "Research Results", "Transcripts",
  "Data Analysis", "Data Set", "Source Texts", "Multimedia", "Image",
  "HTML Stylesheet", "Other"; on a press "Appendix", "Bibliography", "Book
  Manuscript", "Chapter Manuscript", "Glossary", "Index", "Preface",
  "Prospectus", "Table", "Figure", "Photo", "Illustration", "Image",
  "HTML Stylesheet", "Other"; a preprint server as a journal, with
  "Preprint Text" first. Each component's form decides, in this feature:
  - its "File Type" boxes: a component marked as dependent files ("Image"
    and "HTML Stylesheet", and "Multimedia" on a journal or preprint
    server, by default) is offered only
    in the "Upload a Dependent File" wizard (Rule 11); one marked neither
    dependent nor supplementary is a main-work component, offered as a
    link in the submission wizard's panel (Rule 18) and shown with a
    highlighted badge in the lists;
  - its "File Metadata": "Document" adds no field to step 2,
    "Supplementary Content" adds the supplementary fields, "Artwork" the
    artwork fields (Fields). By default "Research Instrument" to "Source
    Texts" and "Other" carry "Supplementary Content" on a journal or
    preprint server, "Prospectus" and "Other" on a press; "Image" carries
    "Artwork", and on a press so do "Table", "Figure", "Photo" and
    "Illustration"; the rest carry "Document";
  - "Require with Submissions": the submit gate of
    [→ what must be complete to submit](U21-submission-wizard.md#submit-gates)
    ("Article Text" by default). While a required component has no file,
    "Submit" is greyed and the "Review" step reads "You must upload at
    least one Article Text file." ("…Book Manuscript file." on a press,
    "…Preprint Text file." on a preprint server);
  - a removed component is no longer offered anywhere.
- **"Present a link to how to ensure all files are anonymized during
  upload"** (Settings › Workflow › Review › "Reviewer Guidance"; *[Review setup & review
  forms](U29-review-setup-and-review-forms.md)*, its Rule 11). Off by
  default. On, step 1 of the upload wizard shows the link "How to ensure
  all files are anonymized" when it is opened on the Submission stage or a
  review stage, never on Copyediting or Production; the link opens the
  instructions of the same name. A preprint server has no such setting.
  <sup>z</sup>
- **"Stage Assignment"** (Settings › Users & Roles › Roles, a role's
  stage boxes; *Roles configuration*). Which stages a role's members reach
  decides which lists they see (Actors preamble;
  [→ stage gate](U24-workflow-screen-and-stage-access.md#stage-gate)).
  <sup>b</sup>
- **"Upload Files" guidance** (Settings › Workflow › Submission › "Author
  Guidance", the "Upload Files" box; *Submission intake configuration*).
  The text shown beside the submission wizard's "Files" panel (on a
  preprint server, beside its galley list). Install
  default: "Provide any files our editorial team may need to evaluate
  your submission. In addition to the main work, you may wish to submit
  data sets, conflict of interest statements, or other supplementary
  files if these will be helpful for our editors." (a preprint server:
  "Upload the preprint you would like to share…"). <sup>z</sup>
- **The journal's submission languages** (Settings › Website › Setup ›
  "Languages"). With one language, "Name
  the file" is one box; with several, one box per language behind
  language tabs, opening on the submission's own language (Fields).
  <sup>t</sup> <sup>d11</sup>
- **The largest file an upload accepts** is the server's upload limit, a
  server setting with no screen (Rule 17b). <sup>z</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)**:
  who opens which stage, and so which lists (Actors). <sup>q</sup>
- **[Submission stage](U25-submission-stage.md#panels)**, **[Review stage
  & rounds](U26-review-stage-and-rounds.md#review-files)**,
  **[Copyediting stage](U32-copyediting-stage.md#draft-files)**,
  **[Production stage](U33-production-stage.md#production-ready-files)**:
  which lists each stage shows, their headings and descriptions, the
  author view, the stage's rules about its lists (the review round's file
  selection and the author's revision gate, the Copyediting window's
  tick boxes, the notices that files change). This spec owns what a list,
  its menu and its windows do. <sup>q</sup>
- **[Submission wizard](U21-submission-wizard.md#steps)**: the "Upload
  Files" step that hosts the "Files" panel {OJS OMP} (a preprint
  server's step holds its galley list instead), and the submit gate on
  required components (Rules 17–18). <sup>q</sup>
- **[Editorial decision recording](U34-editorial-decision-recording.md#select-files)**
  {OJS OMP}: a decision's "Select Files" page copies files onto the next
  stage's list (Rule 15), and the email composer's "Attach Files" lists
  the submission's files ([→ Attach Files](U34-editorial-decision-recording.md#attach-files)).
  A preprint server's decisions have no "Select Files" page, and its
  "Decline Submission" email's "Attach Files" offers "Upload File" and
  "Library Files" only. <sup>q</sup>
- **[Reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review)**:
  the files a reviewer is given, and the reviewer's own files the editor
  sees in the review's window, with an empty "Type" (Rule 5). **[Reviewer's
  review](U28-reviewers-review.md#step-3)**: the reviewer's own uploads,
  through this spec's wizard. <sup>q</sup>
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  the "Send File to Text Editor" window (its Rule 16) and "Insert
  Content", which offers the amendment notices (Rule 12). **JATS & Body
  Text**: what a file sent to the text editor becomes. <sup>q</sup>
- **Galleys** {OJS OPS}: the "Galleys" page, whose "Change File" and
  "More Information" open this spec's wizard and window (Actors row 10).
  <sup>q</sup>
- **Submission intake configuration**: the "Components" list and the
  "Upload Files" guidance (Settings). <sup>q</sup>
- **[Review setup & review forms](U29-review-setup-and-review-forms.md)**:
  the anonymizing link's setting (Settings bullet 2). <sup>q</sup>
- **Submission activity log & notes**: the Activity Log lines of Side
  effects. **Tasks & discussions**: files attached to discussion messages,
  which are that feature's. **Submission & Publisher Libraries**: the
  library files, which are not submission files. <sup>q</sup>

## Canonical scenarios

Scenario 10, and the "Open" review of scenario 8, run on a scratch
journal with throwaway accounts, since each needs a setting away from its
install default; every other scenario runs on the seeded journal with
ready accounts and scratch submissions. The accounts, the files and the
tooling recipe are in the footnote. <sup>s0</sup>

1. **Upload a new file** {OJS OMP}

   Given: Journal Manager, on the Submission stage of a submission whose
   "Submission Files" list holds "article.pdf" as "Article Text", with a
   Section Editor assigned to it.

   - **The window**: press "Upload" above "Submission Files": a window
     titled "Upload Submission File" opens on the steps "1. Upload File",
     "2. Review Details" and "3. Confirm", with a "Continue" button and a
     "Cancel" link under them (Rule 5).
   - **Step 1 before a choice**: "If you are uploading a revision of an
     existing file, please indicate which file." opens on "This is not a
     revision of an existing file" and lists "article.pdf"; "Article
     Component" ("Submission Component" on a press) opens on "Select
     article component" ("Select component") and offers neither "Image"
     nor "HTML Stylesheet"; no upload box shows, and "Continue" is greyed
     out (Fields; Rule 5a; Settings bullet 1).
   - **The upload box**: choose "Research Instrument" ("Prospectus" on a
     press): the box appears with "Upload File" and "Drag and drop a file
     here to begin upload"; attach "notes.md": once it has uploaded, the
     box shows "notes.md" with "Change File", and "Continue" can be
     pressed (Fields; Rule 5a).
   - **"2. Review Details" for a supplementary component**: press
     "Continue": "Name the file (e.g., Manuscript; Table 1)" holds
     "notes.md", and under it stand "Description", "Creator (or owner) of
     file", "Publisher", "Source", "Subject", "Contributor or sponsoring
     agency", "Date" and "Language", the fields of a "Supplementary
     Content" component (Fields; Settings bullet 1).
   - **"3. Confirm"**: press "Continue": the heading "File Added", an "Add
     Another File" button and "Complete" (Rule 5c).
   - **"Add Another File"**: press it: the same window shows "1. Upload
     File" again; choose "Article Text" ("Book Manuscript"), attach
     "article.pdf" and press "Continue": step 2 holds the name box alone;
     replace its text with "Final manuscript", press "Continue", then
     "Complete": the window closes (Rule 5c; Fields; Settings bullet 1).
   - **The list**: "Submission Files" lists "notes.md" with "Research
     Instrument" and "Final manuscript" with "Article Text" in the "Type"
     column, each with a number of its own under "No" and its "Date
     uploaded" (Rule 1).
   - **The assigned Section Editor**: Section Editor: open the same
     submission at the Submission stage: "Upload" stands above
     "Submission Files" and opens "Upload Submission File" with the same
     components and the same files to revise as the Journal Manager's;
     each row's "More Actions" offers "Update File Details", "More
     Information" and "Delete" (Actors rows 2–5; Rule 5).
   - **Control**: the Section Editor's "More Actions" on "notes.md"
     offers no "Send to Text Editor", which the Journal Manager's menu
     offers on the same row (scenario 4; Actors row 8).

2. **Leave the wizard before "Complete"** {OJS OMP}

   Given: Journal Manager, on the Submission stage of a submission whose
   "Submission Files" list holds "article.pdf".

   - **"Close" on step 1**: press "Upload", choose "Research Instrument"
     ("Prospectus" on a press), attach "notes.md" and press the window's
     header "Close": the browser asks "The data on this form has changed.
     Do you wish to continue without saving?"; press "Cancel": the window
     stays open on step 1; press "Close" again, then "OK": the window
     closes, and "Submission Files" lists "notes.md" with "Research
     Instrument" (Rule 6).
   - **"Close" on step 2**: press "Upload", choose "Research Instrument",
     attach "profile-image-400.png" and press "Continue"; replace the name
     with "Instrument photo" and press the header "Close": nothing asks,
     the window closes, and the list shows "profile-image-400.png", not
     "Instrument photo", with "Research Instrument" (Rule 6).
   - **"Close" on step 3**: press "Upload", choose "Research Instrument",
     attach "notes.md" and press "Continue"; replace the name with "Closed
     at step three", press "Continue", then the header "Close" on "3.
     Confirm": nothing asks, and the list shows "Closed at step three"
     (Rule 6).
   - **"Cancel" after a new upload**: press "Upload", choose "Other",
     attach "article.html" and press the "Cancel" link: nothing asks, and
     "Submission Files" does not list "article.html" (Rule 7).
   - **Control**: the list holds "article.pdf", "notes.md",
     "profile-image-400.png" and "Closed at step three", and no
     "article.html" (Rules 6, 7).

3. **Revise a file** {OJS OMP}

   Given: Journal Manager, on the Submission stage of a submission whose
   "Submission Files" list holds "article.pdf" as "Article Text", uploaded
   by its Author and never renamed.

   - **The file to revise**: press "Upload" and choose "article.pdf" in
     "If you are uploading a revision of an existing file, please indicate
     which file.": "Article Component" shows "Article Text" ("Submission
     Component" and "Book Manuscript" on a press), greyed out, and the
     upload box appears (Fields; Rule 5a).
   - **"Cancel" after a revision**: attach "notes.md", then press the
     "Cancel" link: nothing asks, the window closes, and the list shows
     "article.pdf" again under its number (Rules 7, 9).
   - **The revision**: press "Upload" again, choose "article.pdf" to
     revise, attach "notes.md" and press "Continue": the name box holds
     "notes.md"; press "Continue", then "Complete": "Submission Files"
     shows one row with the same number under "No" as before, "notes.md"
     under "File Name" and "Article Text" under "Type" (Rule 8).
   - **"History"**: open the row's "More Actions" › "More Information":
     the window "Information Center: notes.md" opens on "History", whose
     rows include, newest first, the revision ("A file revision "notes.md"
     was uploaded for submission {number} by {username}.") with "The
     metadata for file "notes.md" was edited by {username}.", and below
     them the first upload ("A file "article.pdf" was uploaded for
     submission {number} by {username}.") (Rules 13, 13a).
   - **The earlier version**: press the arrow at the start of the first
     upload's row, then "Download": the PDF first uploaded downloads
     (Rules 8, 13b).
   - **Control**: "Submission Files" holds one row for the file, not two
     (Rule 8).

4. **Rename a file and download the list** {OJS OMP}

   Given: Journal Manager, on the Submission stage of a submission whose
   "Submission Files" list holds "article.pdf" as "Article Text" and
   "notes.md" as "Research Instrument" ("Prospectus" on a press), and a
   second submission with no file.

   - **The row menu**: open "More Actions" on "notes.md": it offers, in
     this order, "Send to Text Editor", "Update File Details", "More
     Information" and "Delete"; on "article.pdf" the same entries without
     "Send to Text Editor" (Rule 2; Actors row 8).
   - **"Update File Details"**: choose it on "article.pdf": a window
     titled "Edit a file" opens with "Name the file (e.g., Manuscript;
     Table 1)" holding "article.pdf", and "Save" and "Cancel" (Rule 10;
     Fields).
   - **The emptied name**: clear the name box and press "Save": "This
     field is required." shows under the box, and the window stays open
     (Fields).
   - **The rename**: type "Manuscript" in the box and press "Save": the
     window closes, and the list shows "Manuscript" at once (Rule 10).
   - **Supplementary fields in "Edit a file"**: choose "Update File
     Details" on "notes.md": under the name box stand "Description",
     "Creator (or owner) of file", "Publisher", "Source", "Subject",
     "Contributor or sponsoring agency", "Date" and "Language"; press
     "Save" (Fields; Settings bullet 1).
   - **Download by name**: press "Manuscript" in the list: the file
     downloads, in a new browser tab, as "Manuscript.pdf"; press
     "notes.md": it downloads as "notes.md" (Rule 3).
   - **"Download All Files"**: press it under "Submission Files": one zip
     file downloads, named after the submission's number and the list
     [A12](#a12), holding the list's two files (Rule 3; Actors row 6).
   - **Control**: the second submission's "Submission Files" reads "No
     Items" and shows no "Download All Files" (Rules 1, 3).

5. **Dependent files, and deleting a file** {OJS OMP}

   Given: Journal Manager, on the Submission stage of a submission whose
   "Submission Files" list holds "article.html" and "article.pdf".

   - **The "Dependent Files" list**: choose "Update File Details" on
     "article.html": "Edit a file" shows a "Dependent Files" list under
     the fields (Rule 11).
   - **"Upload a Dependent File"**: press the list's "Upload File": the
     wizard opens titled "Upload a Dependent File", its component list
     offering only "Multimedia", "Image" and "HTML Stylesheet" ("Image"
     and "HTML Stylesheet" on a press); choose "Image", attach
     "profile-image-400.png", press "Continue", "Continue" and
     "Complete": the "Dependent Files" list shows "profile-image-400.png";
     press "Save" in "Edit a file" (Rules 5, 11, 16).
   - **Not a row of the stage's list**: "Submission Files" still lists
     "article.html" and "article.pdf" alone (Rule 11).
   - **"Delete", then "Cancel"**: open "More Actions" › "Delete" on
     "article.pdf": a window titled "Delete" asks "Are you sure you wish
     to delete this item? This action cannot be undone." with "OK" and
     "Cancel"; press "Cancel": the window closes and the list is as
     before (Rule 4).
   - **"Delete", then "OK"**: do the same on "article.html" and press
     "OK": the message "Removed file." appears, and the list no longer
     shows "article.html" (Rule 4; Actors row 5).
   - **The dependent file with it**: open the submission's Activity Log:
     it reads "A file "profile-image-400.png" was deleted for submission
     {number} by {username}.", and one for "article.html"
     (Rule 11; Side effects).
   - **Control**: "article.pdf" is still listed (Rule 4).

6. **"More Information": history and notes** {OJS OMP}

   Given: Journal Manager, on a submission at Copyediting whose
   "Submission Files" list holds "article.pdf" carrying the note "Check
   figure 2." and whose "Draft Files" list is empty, with a Copyeditor
   assigned to it.

   - **The window**: select "Submission" in the workflow menu and open
     "More Actions" › "More Information" on "article.pdf": a window titled
     "Information Center: article.pdf" opens on "History", the first of
     its two tabs, "History" and "Notes" (Rule 13).
   - **"History"**: a table with the columns "Date", "User" and "Event",
     listing "Posted new note." and the upload row "A file "article.pdf"
     was uploaded for submission {number} by {username}." (Rule 13a).
   - **"Notes"**: select it: "Check figure 2." is listed with its writer's
     name and date; type "Figures checked." in "Add Note" and press "Add
     Note": the message "Note posted." appears, and the list shows the new
     note (Rule 14).
   - **Deleting a note**: press "Delete" on "Figures checked.": "Are you
     sure you wish to delete this note?"; confirm: the message "Note
     deleted." appears and the note is gone; "History" still holds two
     "Posted new note." rows, and the newer one, from adding "Figures
     checked.", heads the table, newest first (Rules 13a, 14; Actors row 4).
   - **A copy on "Draft Files"**: close the window, select "Copyediting",
     press "Upload/Select Files" above "Draft Files", tick "Show files from
     all accessible workflow stages.", tick "article.pdf" under
     "Submission" and press "OK": "Draft Files" lists "article.pdf" as a
     new row with a number of its own (Rules 1, 15).
   - **"Earlier Revision Notes"**: open "More Information" on the copy:
     "History" starts with one upload row naming the Journal Manager;
     "Notes" reads "There are no notes to display.", and "Earlier Revision
     Notes" under it opens "Check figure 2." with no "Delete" (Rules 13a,
     14).
   - **The Copyeditor's note**: Copyeditor: open the submission at
     "Copyediting" and "More Information" on the "Draft Files" copy: the
     window opens on "History" [A3](#a3); select "Notes", type "Copyedit
     started." in "Add Note" and press "Add Note": "Note posted." appears,
     and the note is listed with no "Delete" (Actors row 4; Rule 14).
   - **The Journal Manager on that note**: Journal Manager: the copy's
     "Notes" lists "Copyedit started." with "Delete" (Actors row 4).
   - **Control**: on the original "article.pdf" in "Submission Files",
     "Earlier Revision Notes" opens "There are no notes to display.", since
     that file was not copied from another (Rule 14).

7. **The author's lists** {OJS OMP}

   Given: Author, on My Submissions, with their own submission in review,
   its round asking for no revisions, whose "Submission Files" list holds
   "article.pdf", which they uploaded, and "notes.md", which a Section
   Editor uploaded.

   - **"Submission Files"**: open the submission and select "Submission":
     the list shows both files, with no "Upload" above it (Actors row 2).
   - **The row menu**: "More Actions" on "article.pdf" offers "Update File
     Details", and neither "More Information" nor "Delete" (Actors rows
     3–5); "notes.md" offers the entry too [A2](#a2).
   - **Renaming their own file**: choose "Update File Details" on
     "article.pdf": the "Edit a file" window opens; type "Manuscript" in
     place of "article.pdf" and press "Save": the list shows "Manuscript"
     (Actors row 3; Rule 10).
   - **"Download All Files"**: press it under "Submission Files": one zip
     file downloads, holding both of the list's files (Actors row 6; Rule
     3).
   - **"Revisions Uploaded" before revisions are requested**: select the
     review round in the workflow menu: no "Upload revisions" button
     shows under the round, and "Upload" stands above "Revisions
     Uploaded" [A7](#a7); press it: the window "Upload Review File" reads
     only "You are not allowed to add and edit these files." with
     "Close", and the list stays "No Items" (Actors row 2; Rule 5).
   - **Control**: Journal Manager: on the same submission "Upload" stands
     above "Submission Files", and each row's "More Actions" offers "More
     Information" and "Delete" (Actors rows 2, 4–5).

8. **Files on a review round** {OJS OMP}

   Given: Section Editor, assigned to a submission in review whose round's
   "Files for Review" list holds "article.pdf", given to a Reviewer who
   has accepted the request on an "Anonymous Reviewer/Anonymous Author"
   review, and, on a scratch journal, a second Reviewer who has accepted
   a request on an "Open" review whose round holds "article.pdf" as well.

   - **"Files for Review"**: select the review round in the workflow
     menu: the list shows "article.pdf", with no "Download All Files"
     under it (Actors row 6; Rule 3).
   - **The Reviewer's download**: Reviewer: open the review from the
     reviewer dashboard and press "article.pdf" in its "Review Files"
     list: the file downloads under a name built from the journal's
     acronym, the words "review-assignment", the submission's number, the
     component and the file's number, not as "article.pdf" (Actors row 7;
     Rule 3).
   - **The "Open" review**: the second Reviewer: the same press downloads
     the file as "article.pdf" (Actors row 7; Rule 3).
   - **"Summary of Changes (Amendment Notice)"**: Section Editor: press
     "Upload" above "Revisions Uploaded": the window "Upload Review File"
     opens; choose "Article Text" ("Book Manuscript" on a press), attach
     "notes.md" and press "Continue": step 2 shows "Summary of Changes
     (Amendment Notice)" with the hint "Describe the key changes made in
     this version - for example, corrected figures, updated data, or
     revised methodology. The editor will review this before it appears
     publicly."; type "Corrected figure 2." in it, press "Continue", then
     "Complete": "Revisions Uploaded" lists "notes.md" with "Article Text"
     and the badge "Amendment Notice" in its "Type" cell (Rules 1, 5, 12;
     Fields).
   - **Control**: the Section Editor's press on "article.pdf" in "Files
     for Review" downloads it as "article.pdf" (Rule 3).

9. **The submission wizard's "Files" panel** {OJS OMP}

   Given: Author, on the "Upload Files" step of their own draft
   submission, whose other steps are filled in and whose "Files" panel is
   empty.

   - **The empty panel**: the panel is headed "Files", with "Add File" at
     its top right; beside it, to its left, the journal's guidance stands
     under the heading "Upload Files", opening "Provide any files our
     editorial team may need to evaluate your submission."; the panel
     reads "Upload any files the editorial team will need to evaluate your
     submission." with an "Upload File" link (Rule 17; Settings bullet 4).
   - **"Cancel upload"**: press "Add File" and pick "article.pdf" in the
     computer's file picker: while it uploads, its row shows "article.pdf",
     a progress bar and "Cancel upload"; press "Cancel upload": the row is
     gone at once, nothing asks, and after a reload of the page the panel
     is still empty (Rule 17a).
   - **A finished file**: press "Upload File" and pick "article.pdf"
     again: once it has uploaded, its row shows the name as a link, "Edit"
     and "Remove", and "What kind of file is this?" followed by "Article
     Text" and "Other" ("Book Manuscript", "Chapter Manuscript" and "Other"
     on a press) (Rules 17, 18).
   - **"Review" before a component is chosen**: open the wizard's "Review"
     step: it reads "You must upload at least one Article Text file."
     ("…Book Manuscript file." on a press), and "Submit" is greyed out;
     return to "Upload Files" (Settings bullet 1).
   - **A component link**: press "Article Text" ("Book Manuscript"): a
     spinner shows briefly, and the row shows "Article Text" as a badge
     (Rule 18).
   - **"Other"**: add "notes.md" with "Add File" and press "Other" on its
     row: a side panel titled "Edit notes.md" opens with the hint "Choose
     the option that best describes this file." and one radio button per
     component, "Image" and "HTML Stylesheet" not among them; choose
     "Research Instrument" ("Prospectus" on a press) before pressing
     "Save" ⚠ [A11](#a11) (Rule 18; Fields).
   - **"Remove"**: add "profile-image-400.png" and press "Remove" on its
     row: a window titled "Remove" asks "Are you sure you want to remove
     this file?" with "Yes" and "No"; press "Yes": the row is gone (Rule
     18).
   - **A file left without a component**: add "article.html" and leave its
     row's question unanswered; submit the submission from the "Review"
     step: it goes through; open it from My Submissions: its "Submission
     Files" list shows "article.pdf" with "Article Text", "notes.md" with
     "Research Instrument" and "article.html" with an empty "Type" (Rules
     18, 18a).
   - **Control**: "profile-image-400.png", removed before the submit, is
     not in "Submission Files" (Rule 18).

10. **A journal's own components and the anonymizing link** {OJS OMP}

    Given: Journal Manager, on a scratch journal whose "Components" list
    has gained "Survey Data" with "Supplementary Content" metadata and lost
    "Transcripts" ("Glossary" on a press), and whose "Present a link to how
    to ensure all files are anonymized during upload" is on, with one
    submission at the Submission stage and a second at Production.

    - **Step 1 on the Submission stage**: on the first submission press
      "Upload" above "Submission Files": step 1 shows the link "How to
      ensure all files are anonymized"; "Article Component" ("Submission
      Component" on a press) offers "Survey Data" and no "Transcripts"
      ("Glossary") (Fields; Settings bullets 1–2).
    - **The added component**: choose "Survey Data", attach "notes.md" and
      press "Continue": step 2 shows, under the name box, "Description",
      "Creator (or owner) of file", "Publisher", "Source", "Subject",
      "Contributor or sponsoring agency", "Date" and "Language"; press
      "Continue", then "Complete": "Submission Files" lists "notes.md" with
      "Survey Data" (Rule 1; Fields; Settings bullet 1).
    - **Control**: on the second submission, "Upload" above "Production
      Ready Files" opens "Upload a Production Ready File", whose step 1
      shows no "How to ensure all files are anonymized" link and whose
      component list offers no "Transcripts" ("Glossary") (Rule 5;
      Settings bullets 1–2).

App-specific:

11. **{OPS} No file lists on a preprint server**

    Given: Preprint Server Manager, with a submitted preprint whose galley
    "PDF" holds "preprint.pdf".

    - **The workflow**: open the preprint's workflow at "Production": the
      stage shows its discussions and participants panels and no file
      list, no "Upload" and no "Upload/Select Files" [OPS1](#ops1)
      (Purpose).
    - **The galley's "More Information"**: open the publication's
      "Galleys" page in the workflow's side menu and choose "More
      Information" in the "PDF" galley's menu: a window titled
      "Information Center: PDF" opens on "History", the first of its tabs
      "History" and "Notes" (Rule 13; Actors row 10).
    - **Control**: the Production stage's discussions and participants
      panels are on screen, so the missing file list is not a page that
      failed to load [OPS1](#ops1) (Purpose).

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — variants:
  - "Cancel" after revising a file renamed since its last upload: the previous file back, its rename kept, and no line of the cancelled upload in its "History" (Rule 9)
  - the header "Close" after a revision: the new file kept, the earlier version a "Download" in "History" (Rule 9)
  - a file over the upload limit refused in its row with "File is too big ({size}MiB). Max filesize: {limit}MiB." (Rule 17b)
  - a journal with two submission languages: one "Name the file" box per language behind language tabs, opening on the submission's own language (Fields; Settings bullet 5)
  - leaving the page while a file uploads in the "Files" panel, which asks nothing and keeps nothing (Rule 17a)
  - switching to "History" with note text typed and not added: the question first, then an empty box (Rule 14a)
  - the artwork fields of an "Artwork" component, such as "Image" or, on a press, "Figure" (Fields; Settings bullet 1)
  - the step names: "1. Upload File" locked once passed, "2. Review Details" reopened from "3. Confirm" (Rule 5)
  - the "Dependent Files" list in an HTML galley's "Edit" window (Rule 11)
  - the "Dependent Files" list keeping only "More Information" on a galley whose version is published (Rule 11)
  - the "Search" control of an older file list narrowing it by name (Rule 16)
- **Nothing new to test**:
  - the Author deleting their own file on "Revisions Uploaded" (Actors row 5): the "Delete" dialog and "Removed file." scenario 5 reads as the Journal Manager
- **Register carries it**:
  - A2 (the Author offered "Update File Details" on a file an editor uploaded, and refused; Actors row 3; scenario 7 marks it)
  - A3 ("History" keeps showing "Loading" for the assistant roles; Actors row 4; scenario 6 marks it)
  - A4 ("Show events from prior versions" changing nothing; Rule 13b)
  - A5 (a galley's "Change File" naming no current file; Rule 9a)
  - A6 (every row's menu button named "More Actions" alone; Rule 2)
  - A7 (the Author's "Upload" above "Revisions Uploaded" offered on a round that asks for no revisions; Actors row 2; scenario 7 marks it)
  - A8 (the revise list naming files by name alone; Fields)
  - A9 (step 1's hidden upload box read by a screen reader, its drop-downs unnamed; Fields)
  - A10 (an empty note posted; Rule 14)
  - A11 ("Save" in "Edit {file name}" with no component chosen failing; Rule 18; scenario 9 marks it)
  - A12 (the "Download All Files" zip named with two hyphens; Rule 3; scenario 4 marks it)
  - A13 (deleting a file also deleting its copies on other lists; Rule 4)
  - A14 ("Change File" in step 1 keeping the first upload as a file of its own; Rule 5a)
  - A15 (step 2 reopened from step 3 offering "Complete" and showing "File Added" again; Rule 5b)
  - A16 (a galley's "Change File" closed with "Close" keeping the new file; Rule 9a)
  - A17 (the page's script failing after two "History" downloads and closing the window; Rule 13b)
  - A18 (note text not added dropped when the window closes; Rule 14a)
  - A19 (another stage's files in "Upload/Select Files" refusing their row actions; Rule 15)
  - A20 (the reviewer's "Review Files" search keeping every file; Rule 16)
  - A21 (a file of exactly the upload limit failing on the server; Rule 17b)
  - A22 (the Activity Log recording a new file's upload as a "Revision"; Side effects)
  - A23 ("Cancel" after a second pick on step 1 leaving the first pick as the file; Rule 9b)
  - A24 (one file revised in two windows: one "Cancel" doing nothing, the file keeping a cancelled upload; Rule 9c)
  - A25 ("Cancel upload" pressed after the whole file has been sent keeping the file; Rule 17a)
- **Owned by another feature**:
  - a Production editor's lists: every stage's while not assigned, Copyediting and Production only once assigned (Actors preamble; *Workflow screen & stage access*, and *Stage participants*, whose A8 records the assigned case)
  - the Author's revision upload through "Upload revisions" (Actors row 2; *Review stage & rounds*, scenario 4)
  - the "Revised Version Uploaded" email and the cleared "Revision required." task after the Author's revision (Side effects; *Review stage & rounds*, scenario 4)
  - the reviewer's own "Upload File", with the upload box at once and no component (Rule 5; *Reviewer's review*, scenario 7)
  - the "Send File to Text Editor" window (Actors row 8; *Publish, schedule & versions*, scenario 18) and what the send does (*JATS & Body Text*)
  - "Upload/Select Files": what the tick boxes mean on each stage and the window's title (Rule 15; *Copyediting stage*, scenario 5, and *Review stage & rounds*)
  - the Activity Log lines for uploads, revisions, edits and deletes (Side effects; *Submission activity log & notes*)
  - "Stage Assignment" changed on the Roles screen (Settings bullet 3; *Roles configuration*)
  - the "Upload Files" guidance edited (Settings bullet 4; *Submission intake configuration*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-23), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A2](#a2) | The Author is offered "Update File Details" on every row and refused on files they did not upload | 🐞 | minor | — |
| [A3](#a3) | "More Information"'s "History" tab keeps showing "Loading" for the Copyeditor, Layout Editor and the other assistant roles | 🐞 | minor | — |
| [A4](#a4) | The "History" tab's "Show events from prior versions" box changes nothing | 🐞 | minor | — |
| [A5](#a5) | A galley's "Change File" shows "Current file" with no file name under it | 🐞 | minor | — |
| [A7](#a7) | The Author's "Upload" on "Revisions Uploaded" shows on every round and is refused before revisions are requested | 🐞 | minor | — |
| [A9](#a9) | A screen reader reads step 1's hidden upload box, and the step's two drop-downs have no name | 🐞 | minor | — |
| [A10](#a10) | "Add Note" with an empty box posts an empty note | 🐞 | minor | — |
| [A11](#a11) | "Save" in the submission wizard's "Edit {file name}" with no component chosen fails with "An unexpected error has occurred." | 🐞 | minor · crash: server | — |
| [A12](#a12) | The "Download All Files" zip is named with two hyphens ("12--submission-files.zip") | 🐞 | minor | — |
| [A14](#a14) | "Change File" in step 1 keeps the first upload on the list as a file of its own | 🐞 | user-visible | — |
| [A15](#a15) | Step 2 reopened from step 3 offers "Complete" but shows "File Added" again instead of closing | 🐞 | minor | — |
| [A19](#a19) | In "Upload/Select Files", another stage's files refuse their "More Information", "Edit" and "Delete" | 🐞 | minor | — |
| [A20](#a20) | The reviewer's "Review Files" search keeps every file | 🐞 | minor | — |
| [A21](#a21) | A file of exactly the upload limit ends with "Invalid JSON response from server." instead of being refused | 🐞 | minor · crash: server | — |
| [A23](#a23) | Revising a file, a second pick on step 1 and then "Cancel" leave the first pick as the file instead of the original | 🐞 | minor | — |
| [A24](#a24) | One file revised in two windows: the first window's "Cancel" does nothing, and the file keeps the upload cancelled there | 🐞 | minor | — |
| [A25](#a25) | "Cancel upload" pressed after the whole file has been sent removes the row, but the file is stored and back after a reload | 🐞 | user-visible | — |
| [A6](#a6) | Every file row's menu button is named "More Actions" alone, so a screen reader cannot tell the rows apart | ❓ | minor | — |
| [A8](#a8) | The revise list names files only, so two files with the same name read the same | ❓ | minor | — |
| [A13](#a13) | Deleting a file also deletes every copy made from it on other lists | ❓ | user-visible | — |
| [A16](#a16) | Closing a galley's "Change File" with "Close" replaces the galley's file without asking | ❓ | user-visible | — |
| [A17](#a17) | The page's script failed after two "History" downloads and closing the window (seen once per app) | ❓ | minor · crash: script | — |
| [A18](#a18) | Note text not added is lost without a question when the window closes | ❓ | minor | — |
| [A22](#a22) | The Activity Log records a new file's upload as a "Revision" | ❓ | minor | — |
| [OPS1](#ops1) | A preprint server has no workflow file lists; its files are its galleys' files | ✅ | — | — |
| [A1](#a1) | Retired: "Cancel" after revising a file that was renamed left the window open and the new file in place; it now restores the old file (Rule 9) | ✅ | retired | upstream change + claim check (claude), 2026-09-27 — fixed upstream |

### All apps

<a id="a2"></a>
**A2 — The Author is offered "Update File Details" on files they cannot edit** · 🐞 · minor.
On "Submission Files" and "Revisions Uploaded" the Author's row menu
offers "Update File Details" on every file. On a file they uploaded
themselves the "Edit a file" window opens and saves. On a file an editor
uploaded it shows only "The current role does not have access to this
operation." and "Close", on a round that asks for revisions too. The
menu should offer the entry only where it works.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — "More Information" never loads its "History" tab for the assistant roles** · 🐞 · minor.
A Copyeditor, Layout Editor, Proofreader or other assistant role assigned
to a stage is offered "More Information" on that stage's files, and the
window opens on its "History" tab. The tab never loads for them: it keeps
showing "Loading", with no message. Their "Notes" tab works. Either the
tab should load for them or the window should open without it.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — "Show events from prior versions" does nothing** · 🐞 · minor.
The "History" tab of "More Information" offers the stage's team, behind
its "Search" button, the box "Show events from prior versions". Ticking
it and pressing "Search" reloads the tab with the same rows as before:
the file's own events, nothing from the file it was copied from or from
earlier stages. The box is unticked again afterwards.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A galley's "Change File" names no current file** · 🐞 · minor.
On a journal or preprint server, "Change File" on a galley opens the
upload wizard with the heading "Current file", which promises the name of
the file about to be replaced. Nothing stands under it, so the editor
cannot see which file they are about to replace. Once a file is uploaded,
the line under "Current file" names the new file, not the one it
replaces.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — File rows' menu buttons carry no file name** · ❓ · minor.
Every row of a workflow file list ends in a "More Actions" button whose
name, read by a screen reader or used by keyboard users to jump between
controls, is "More Actions" alone. On a list of several files the buttons
cannot be told apart except by their position.
Question: should the button's name include the file name ("More Actions
for article.pdf")? Lean: yes; the file name cell is already the row's
heading, so the fix is cheap.
Basis: probe. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — The Author's "Upload" on "Revisions Uploaded" is offered on every round** · 🐞 · minor.
Above "Revisions Uploaded" the Author sees "Upload" on every review
round. Before the editor has asked for revisions, pressing it opens
"Upload Review File" reading only "You are not allowed to add and edit
these files." with "Close". The "Upload revisions" button under the round
shows only once revisions are requested; "Upload" should follow it.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — The revise list shows file names only** · ❓ · minor.
Step 1's list "If you are uploading a revision of an existing file,
please indicate which file." shows each file by its name alone, with no
number or component. Two files both named "article.pdf" read the same,
so the uploader cannot tell which one the revision will replace.
Question: should each entry carry the file's number or component beside
its name? Lean: yes; the list's "No" column already numbers every file.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Step 1 of the upload wizard misleads screen readers** · 🐞 · minor.
Before a component is chosen, step 1's upload box is hidden on screen,
yet a screen reader still reads "Drag and drop a file here to begin
upload", "Upload File" and "Choose File". The two drop-downs above it
(the revise list and the component list) have no name for a screen
reader: their labels are not tied to them.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — "Add Note" posts an empty note** · 🐞 · minor.
In "More Information" › "Notes", pressing "Add Note" with the box empty
adds a note with no text (only its writer, its date and "Delete"), shows
"Note posted." and adds "Posted new note." to "History". An empty note
should be refused.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — "Save" in "Edit {file name}" with no component chosen fails** · 🐞 · minor · crash: server.
In the submission wizard's "Files" panel, "Other" or a row's "Edit"
opens "Edit {file name}". Pressing "Save" there without choosing a
component makes the app fail: "An unexpected error has occurred. Please
reload the page and try again." appears, the panel stays open and
nothing is saved. Expected: a message asking for a component, or no
save until one is chosen.
Basis: probe. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — The "Download All Files" zip's name has two hyphens** · 🐞 · minor.
"Download All Files" names its zip after the submission's number and the
list, with two hyphens between them: "12--submission-files.zip",
"12--production-ready-files.zip". Expected "12-submission-files.zip".
Basis: probe. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — Deleting a file also deletes its copies on other lists** · ❓ · user-visible.
A file copied onto another list through "Upload/Select Files" is a row
of its own there, with its own number. Deleting the original also
removes every such copy: deleting a "Submission Files" file empties its
copy from "Draft Files", although the dialog ("Are you sure you wish to
delete this item? This action cannot be undone.") speaks of one item.
The Activity Log records only the original's deletion. *Copyediting
stage* saw the same from "Copyedited Files" ([→ its
A8](U32-copyediting-stage.md#a8)).
Question: is a copy meant to share its source's fate? Lean: no, a
defect; the dialog promises one deletion and the copy's row shows
nothing of the link.
Basis: probe. <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — "Change File" in step 1 keeps the first upload** · 🐞 · user-visible.
In step 1 of the upload wizard, "Change File" should replace the file
just uploaded. It uploads the new one, but the first stays: after
"Complete" the list holds both, the first under its uploaded name and
the step-1 component. The app refuses the screen's request to delete the
first file, even for a Journal Manager, and nothing on screen says so.
Basis: probe. <sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — Step 2 reopened from step 3 offers "Complete" but does not close** · 🐞 · minor.
Pressing "2. Review Details" on "3. Confirm" opens step 2 again, its
button now reading "Complete". Pressing it saves the name and shows "File
Added" again instead of closing the window; the window closes only when
"Complete" is pressed a second time.
Basis: probe. <sup>[f-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — Closing a galley's "Change File" replaces the file without asking** · ❓ · user-visible.
On a journal or preprint server, a galley's "Change File" stores the new
file as soon as it is uploaded. Closing the window then with its header
"Close", before "Continue" or "Complete", leaves the galley serving the
new file: nothing asks and nothing says so. "Cancel" at the same point
puts the previous file back, and the file lists' wizard at least asks on
step 1 (Rule 6).
Question: should a galley's "Change File" closed before "Complete" keep
the old file, or ask? Lean: ask; a galley is what readers download.
Basis: probe. <sup>[f-a16](#fn-a16)</sup>

<a id="a17"></a>
**A17 — The page's script failed after two "History" downloads** · ❓ · minor · crash: script.
Seen once on a journal and once on a preprint server: after two
"Download" links in a file's "History" (a revision's, then the
upload's) and closing the window, the page's own script failed about a
second later. Nothing showed on screen. One download followed by
"Close" did not repeat it.
Question: is this a defect to fix? Lean: yes, minor; repeating the two
downloads and "Close" on a press would settle it.
Basis: probe. <sup>[f-a17](#fn-a17)</sup>

<a id="a18"></a>
**A18 — Note text not added is lost without a question** · ❓ · minor.
Text typed in "More Information" › "Notes" and not added disappears when
the window is closed, and nothing asks. The browser's leave-page
question then comes up at the next move off the page, although the
window that held the text is gone. Switching to "History" instead does
ask first (Rule 14a).
Question: should closing the window with unsaved note text ask, as the
tab switch does? Lean: yes, and the stray leave-page question should go.
Basis: probe. <sup>[f-a18](#fn-a18)</sup>

<a id="a19"></a>
**A19 — "Upload/Select Files" refuses the row actions of another stage's files** · 🐞 · minor.
With "Show files from all accessible workflow stages." ticked, a file
listed under another stage offers "More Information" (and, on the
Copyediting lists, "Edit" and "Delete"), and none of them works, even
for a Journal Manager. "More Information" pops up "The current role does
not have access to this operation." and "undefined", then stays on
"Loading"; "Edit" opens "Edit a file" holding only that refusal; "Delete"
asks its question and, on "OK", keeps its dialog open with a spinner,
deleting nothing. The same controls work on the list's own stage.
Basis: probe. <sup>[f-a19](#fn-a19)</sup>

<a id="a20"></a>
**A20 — The reviewer's "Review Files" search changes nothing** · 🐞 · minor.
The reviewer's "Review Files" list has the same "Search" control as the
other older file lists. There a search keeps every file listed, even a
text no file name contains, while the same search in the editor's
windows for a reviewer's request narrows the list.
Basis: probe. <sup>[f-a20](#fn-a20)</sup>

<a id="a21"></a>
**A21 — A file of exactly the upload limit fails on the server** · 🐞 · minor · crash: server.
In the submission wizard's "Files" panel a file larger than the limit is
refused at once in its row. A file of exactly the limit (100 MiB on a
server that allows 100 MiB) passes that check, starts uploading and ends
with "Invalid JSON response from server." in its row: the app failed,
and nothing is stored. It should be refused like a larger file, or
stored.
Basis: probe. <sup>[f-a21](#fn-a21)</sup>

<a id="a22"></a>
**A22 — The Activity Log records a new file as a "Revision"** · ❓ · minor.
A new file's upload shows in the submission's Activity Log as "Revision
"{file name}" was uploaded for file {number}.", while the file's own
"History" reads "A file "{file name}" was uploaded…". A reader of the
log cannot tell a first upload from a revision.
Question: should the log word a first upload as an upload? Lean: yes;
the file's "History" already does.
Basis: probe. <sup>[f-a22](#fn-a22)</sup>

<a id="a23"></a>
**A23 — A second pick on step 1, then "Cancel", leaves the first pick as the file** · 🐞 · minor.
Revising a file in the upload wizard, a person uploads a file on step 1,
swaps it there for another with "Change File", then presses "Cancel".
They expect the file as it was before the wizard opened (Rule 9b). The
window closes, but the list shows the first pick's name, and the
Activity Log & Notes window keeps its line "A file revision "{file
name}" was uploaded for submission {number} by {username}." naming who
cancelled, with a working "Download" behind its arrow; nothing says the
original was not restored. The same happens in any galley's "Change
File". A regression: "Cancel" restored the original until the September
2026 change that made it restore a renamed file too ([A1](#a1)).
Since: 2026-09-27 · Basis: probe. <sup>[f-a23](#fn-a23)</sup>

<a id="a24"></a>
**A24 — One file revised in two windows: one "Cancel" does nothing, and a cancelled upload stays** · 🐞 · minor.
The same person opens the upload wizard on the same file in two browser
windows: the first uploads a revision, the second then uploads another
revision of the same file. Each "Cancel" is expected to close its window
and, once both are cancelled, leave the file as it was before either
opened. Instead, "Cancel" in the first window does nothing and shows no
message, and the window stays open, whichever window is cancelled first.
Either way the list ends up showing the first window's revision, and
the Activity Log & Notes window and the file's "History" both keep its
line "A file revision "{file name}" was uploaded…", with a working
"Download" behind its arrow. A regression: both cancels restored
the original until the September 2026 change that made "Cancel" restore
a renamed file too ([A1](#a1)).
Since: 2026-09-27 · Basis: probe. <sup>[f-a24](#fn-a24)</sup>

<a id="a25"></a>
**A25 — "Cancel upload" pressed after the whole file has been sent keeps the file** · 🐞 · user-visible.
In the submission wizard's "Files" panel, the Author who presses "Cancel
upload" expects the file to be dropped, and the row goes at once without
a question. Pressed after the whole file has been sent but before the
server has answered, only the row goes: the file is stored, is back on
the panel with "Edit" and "Remove" after a reload, and, like any file
there, goes in with the submission. Nothing says so when the row goes.
On a slow connection, or with a server slow to answer, that window is
long enough to press in.
Basis: probe. <sup>[f-a25](#fn-a25)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server has no workflow file lists** · ✅ · —.
A journal or press shows its submission files on each stage in the lists
this spec describes. A preprint server's workflow is the single Production
stage, which shows discussions and participants only, and its submission
wizard's first step manages the galleys readers download. Its files are
the galleys' files, reached through the "Galleys" page. Intended: the
single-stage workflow has no copyediting or review files to list.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

### Retired

<a id="a1"></a>
**A1 — "Cancel" after a revision does not restore a file that was renamed** · ✅ · retired. Fixed upstream on 2026-09-27, verified that day on OJS and OMP: "Cancel" after a revision, at any step, puts back a file renamed by anyone since its last upload under the name it had when the wizard opened (Rule 9). <sup>[f-a1](#fn-a1)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Mechanism home. The workflow lists are the Vue file manager
(`lib/ui-library/src/managers/FileManager/FileManager.vue`, one component per
list, configured by namespace in `useFileManagerConfig.js`
`FileManagerConfigurations`: `SUBMISSION_FILES`, `EDITOR_REVIEW_FILES`,
`WORKFLOW_REVIEW_REVISIONS`, `FINAL_DRAFT_FILES`, `COPYEDITED_FILES`,
`PRODUCTION_READY_FILES`, `REVIEWER_ATTACHMENT_FILES` and the `*_SELECT`
variants); the stages mount them in
`pages/workflow/composables/useWorkflowConfig/workflowConfig{Editorial,Author}{OJS,OMP}.js`
(OMP deep-merges the OJS configs, `useWorkflowConfigOMP.js`, and adds the
Internal Review lists). The upload wizard is legacy:
`PKP\controllers\wizard\fileUpload\FileUploadWizardHandler` (ops
`startWizard`, `displayFileUploadForm`, `uploadFile`, `editMetadata`,
`finishFileSubmission`), templates under
`templates/controllers/wizard/fileUpload/`, JS
`js/controllers/wizard/fileUpload/`. The row windows are legacy modals opened
from Vue (`useFileManagerActions.js`). OPS: `workflowConfigEditorialOPS.js`
and `workflowConfigAuthorOPS.js` mount no `FileManager` (Production stage:
`WorkflowNotificationDisplay` and `DiscussionManager` only), and
`APP\pages\submission\SubmissionHandler::getFilesStep()` (ops) swaps the
wizard's files step for the galleys template. Code read 2026-09-23 at ojs
`38781720df`, lib/pkp `f8bacd765`, ui-library `5d138aa9`.
Live-probed 2026-09-23 (Purpose; all three apps): every stage's lists as the
stage specs name them; the wizard's steps "1. Upload File", "2. Review
Details", "3. Confirm"; a draft's "Upload Files" step with its "Files" panel;
the row windows titled "Edit a file" and "Information Center: article.pdf";
the component label "Article Component" (OJS), "Submission Component" (OMP),
"Preprint Component" (OPS's galley wizard). OPS: a manager's and a Moderator's
workflow heads "Workflow: Production" with "Production Tasks & Discussions"
and "Participants" only, typed addresses of the other stages land on
Production, the wizard's first step "Upload Files" holds a galley list
("Name", "Language", "Add File"), and a galley's menu reads "Edit, Change
File, More Information, Delete".

<a id="fn-b"></a>
**b** — Each list's actions are filtered by
`useFileManagerConfig.getManagerConfig()`: an action is permitted when one
of its `permissions[].roles` is in the current user's
`stage.currentUserAssignedRoles` for the list's stage
(`useCurrentUser.hasCurrentUserAtLeastOneAssignedRoleInStage()`). The server
fills that per stage from the user's stage assignments, and for an unassigned
Journal Manager or Site Administrator with every stage's global roles
(`PKP\submission\maps\Schema::getPropertyStages()`; not when the same user
holds a live review assignment on the submission). Editorial permission sets
name `ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`,
`ROLE_ID_ASSISTANT`; the Author's sets are per namespace (`SUBMISSION_FILES`:
list, edit, download all; `WORKFLOW_REVIEW_REVISIONS`: list, upload, edit,
delete; `COPYEDITED_FILES`: list). The author's config mounts
`SUBMISSION_FILES` (Submission), `WORKFLOW_REVIEW_REVISIONS` (review) and
`COPYEDITED_FILES` (Copyediting) only (`workflowConfigAuthorOJS.js`). Stage
sets: *Roles configuration*; access: the workflow-screen spec.
Live-probed 2026-09-23 (Actors preamble, rows 1 and 8; OJS and OMP): the Site
Administrator holding a journal role, the Journal Manager, the unassigned
Editor and the unassigned Production editor had every list on every submission
(the Production editor with "Upload", "Download All Files" and "Send to Text
Editor"); assigned, the Production editor had Copyediting and Production only,
the other stages reading "You don't currently have access to that stage of the
workflow." (the Roles grid puts the Production editor at manager level with
the stages Copyediting and Production). OMP's Roles list has no Guest editor.
The Funding coordinator had "Submission Files" and the review lists, the
Copyeditor the Copyediting lists, the Layout Editor and the Proofreader
"Production Ready Files"; an unassigned Section Editor, Guest Editor or
Funding coordinator typing the address got the "Error" dialog "The current
role does not have access to this operation.". The Author's view showed
"Submission Files", "Revisions Uploaded" and "Copyedited Files", never the
other three. "Stage Assignment" at both ends: a Copyeditor refused the
Submission stage saw "Submission Files" with its file and "Upload" once the
manager ticked the Copyeditor row's "Submission" box (toast "Copyeditor role
assigned to Submission stage."), and was refused again once it was unticked.
OPS: the Roles grid has the one stage column "Production".

<a id="fn-c"></a>
**c** — `getTopItems()`: `FILE_UPLOAD` renders "Upload" (`common.upload`),
`FILE_SELECT_UPLOAD` "Upload/Select Files" (`editor.submission.uploadSelectFiles`).
`FILE_UPLOAD` is granted on `SUBMISSION_FILES`, `WORKFLOW_REVIEW_REVISIONS`,
`PRODUCTION_READY_FILES`; `FILE_SELECT_UPLOAD` on `EDITOR_REVIEW_FILES`,
`FINAL_DRAFT_FILES`, `COPYEDITED_FILES`. The Author's write to the submission
file stage is allowed only while `submissionProgress` is set
(`SubmissionFileStageAccessPolicy::effect()`), to the revision stage only
after an accept / request-revisions / new-round / resubmit decision on the
last round. The author's "Upload revisions" button:
`workflowConfigAuthorOJS.js` `[WORKFLOW_STAGE_ID_EXTERNAL_REVIEW].getActionItems()`.
Live-probed 2026-09-23 (Actors row 2; OJS and OMP): the team's "Upload" on
"Submission Files", "Revisions Uploaded" and "Production Ready Files" and
"Upload/Select Files" on the other three lists; no "Upload" for the Author on
a submitted "Submission Files"; the Author's "Upload revisions" only on a
round with revisions requested, their "Upload" above "Revisions Uploaded" on
every round (A7).

<a id="fn-d"></a>
**d** — `FILE_EDIT` → `useFileManagerActions.fileEdit()` opens
`api.file.ManageFileApiHandler` `editMetadata` in a legacy modal titled
`grid.action.editFile` ("Edit a file"). `PKPManageFileApiHandler::authorize()`
adds `SubmissionFileAccessPolicy` in MODIFY mode; for the Author
(`SubmissionFileAccessPolicy::buildFileAccessPolicy()`, author branch)
modify passes only when the file was uploaded by them
(`SubmissionFileUploaderAccessPolicy`) or sits in a review round with a
requested revision (`SubmissionFileRequestedRevisionRequiredPolicy`); the
read-only options (3c–3i) apply only to read. The Vue menu does not check
the uploader. Earlier record: the submission-stage spec's footnote (live
2026-08-02, OJS and OMP) saw the author's "Submission Files" offer no
"Upload"; the row menu was not recorded.
Live-probed 2026-09-23: notes d1 and f-a2.

<a id="fn-d1"></a>
**d1** — Live-probed 2026-09-23 (Actors rows 3 and 6; OJS and OMP): on the
Author's submitted submission whose "Submission Files" held their own
"article.pdf" and the Section Editor's "notes.md", the Author's menus offered
"Update File Details" on both rows and nothing else, and "Download All Files"
stood under the list, its zip holding both files. On their own row "Edit a
file" showed "Name the file (e.g., Manuscript; Table 1)" holding
"article.pdf"; saved as "Manuscript", the list read "Manuscript" (after a
fresh landing too). On the Section Editor's row the same window showed only
"The current role does not have access to this operation." and "Close" (A2).
On "Revisions Uploaded" the Author's own rows offered "Update File Details"
and "Delete"; on "Copyedited Files" their row had no menu button. The Journal
Manager's menus on the same rows: "Update File Details", "More Information",
"Delete", with "Send to Text Editor" first on "notes.md".

<a id="fn-e"></a>
**e** — `FILE_SEE_NOTES` → `fileSeeNotes()` opens
`informationCenter.FileInformationCenterHandler` `viewInformationCenter` in a
modal titled `informationCenter.informationCenter` + ": " + the file name.
Role assignment: `InformationCenterHandler` (manager, site admin,
sub-editor) plus `ROLE_ID_ASSISTANT` in `FileInformationCenterHandler`. The
History tab loads `grid.eventLog.SubmissionFileEventLogGridHandler`, whose
role assignment is inherited from `SubmissionEventLogGridHandler` (manager,
site admin, sub-editor only), hence A3. Note deletion: `note.tpl` shows
"Delete" when `$notesDeletable` and the user's context roles include
`ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR`; past notes are rendered with
`notesDeletable` false.
Live-probed 2026-09-23 (Actors row 4; OJS and OMP): the window opened titled
"Information Center: article.pdf" with "History" selected, for the team and
the assistant roles; for the Copyeditor, the Layout Editor and the Proofreader
"History" still read "Loading" after 10 s (A3). The Copyeditor's note
"Checked" posted with "Note posted." and showed no "Delete"; the Journal
Manager and the Section Editor saw "Delete" on it. The Author's menus had no
"More Information".

<a id="fn-d2"></a>
**d2** — Live-probed 2026-09-23 (Actors row 4; OJS and OMP): as a Copyeditor
on "Draft Files", "More Information" opened "Information Center: article.pdf"
on "History", which kept showing "Loading" with no message (A3); in "Notes",
"Checked" and "Add Note" gave "Note posted." and a note with no "Delete". The
Journal Manager on the same file: the "Date User Event" table, and a "Delete"
on the Copyeditor's note.

<a id="fn-g"></a>
**g** — `FILE_DELETE` → `fileDelete()`: a Vue dialog `common.delete` /
`common.confirmDelete` with `common.ok` (warnable) and `common.cancel`; OK
posts `ManageFileApiHandler` `deleteFile` and, on success, triggers
`notifyUser` (the trivial notification `notification.removedFile`); failure
opens the network-error dialog. `PKP\submissionFile\Repository::delete()`
deletes the file's dependent files and notes (the notes' fate shows on no
page, since the copy whose "Earlier Revision Notes" could show them is deleted
too), updates the revision and copyedit notifications, deletes the stored
files no other submission file references, and logs
`submission.event.fileDeleted` on the file and the submission.
`source_submission_file_id` is declared `ON DELETE CASCADE`
(`SubmissionFilesMigration`), so every copy `Repository::copy()` made goes
with its source, with no log line of its own (A13); U32's A8 is the same seen
from "Copyedited Files".
Live-probed 2026-09-23 (Actors row 5; Rule 4; Side effects; OJS and OMP): the
dialog "Delete" / "Are you sure you wish to delete this item? This action
cannot be undone." with "OK" and "Cancel"; "Cancel" left the rows as they
were; "OK" removed the row with "Removed file."; the Author's own delete on
"Revisions Uploaded" the same. Deleting an HTML file also logged "A file
"profile-image-400.png" was deleted…" for its dependent image. Deleting
"Submission Files" originals emptied their "Draft Files" copies (A13).

<a id="fn-h"></a>
**h** — `FILE_DOWNLOAD_ALL` is granted on `SUBMISSION_FILES` (Author and
editorial) and `PRODUCTION_READY_FILES` (editorial) only;
`getBottomItems()` renders it only when `filesCount` is non-zero. It points
the window at `api.file.FileApiHandler` `downloadAllFiles` with
`nameLocaleKey` = the list's title key; the archive is named
`{submissionId}-{kebab-cased title}` + `.zip` (`.tar.gz` where zip is
unavailable). Authorisation checks read access on every file of that file
stage (`PolicySet::COMBINING_DENY_OVERRIDES`), so one unreadable file refuses
the whole archive.
`downloadAllFiles()` names the archive "{submissionId}-{list title}" passed
through `Str::kebab()`, which also puts a hyphen before the title's capital,
hence "349--submission-files" (A12). Live-probed 2026-09-23 (Actors row 6;
Rule 3; OJS and OMP): "349--submission-files.zip" (OMP
"289--submission-files.zip") and "353--production-ready-files.zip" (OMP
"293--production-ready-files.zip"), downloaded in place, holding
"Manuscript.pdf" and "notes.md"; the Author's zip held the Section Editor's
file too; no button under an empty list or under "Files for Review",
"Revisions Uploaded", "Draft Files" or "Copyedited Files".

<a id="fn-i"></a>
**i** — `FileManagerCellFileName.vue`: an `<a :href="file.url" target="_blank">`
when the file has a URL. `FileApiHandler::downloadFile()`: the file name is
the submission file's localized name passed through
`PKPFileService::formatFilename()`, which appends the stored file's
extension when the name lacks it; for the assigned reviewer of a
`SUBMISSION_REVIEW_METHOD_DOUBLEANONYMOUS` assignment the name is
`sprintf('%s-%s-%d-%s-%d', lower(acronym), kebab(__('submission.list.reviewAssignment')), submissionId, kebab(genre name), submissionFileId)`,
e.g. `jpk-review-assignment-12-article-text-45.pdf` on the seeded journal
(acronym "JPK"; "PKP" on the press). Who may download: read access under
`SubmissionFileAccessPolicy`.
Live-probed 2026-09-23: notes d9 and d19.

<a id="fn-d9"></a>
**d9** — Live-probed 2026-09-23 (Actors row 7; Rule 3; OJS and OMP): on an
"Anonymous Reviewer/Anonymous Author" round the reviewer's step-1 link
downloaded "kone-review-assignment-350-article-text-70.pdf" (OMP
"kone-review-assignment-290-book-manuscript-55.pdf"; the scratch journal's
acronym "KONE"), and the Section Editor's link in "Files for Review"
"article.pdf". On "Anonymous Reviewer/Disclosed Author" and on "Open" the
reviewer's download was "article.pdf".

<a id="fn-d19"></a>
**d19** — Live-probed 2026-09-23 (Rule 3; OJS and OMP): the name link opens a
new tab and the file downloads as an attachment, not displayed; "Manuscript"
downloaded as "Manuscript.pdf", "notes.md" as "notes.md". "Download All Files"
downloaded one zip in place, "349--submission-files.zip", holding
"Manuscript.pdf" and "notes.md" (A12).

<a id="fn-j"></a>
**j** — `getItemActions()`: `FILE_SEND_TO_EDITOR` first, then `FILE_EDIT`
(`grid.action.updateFile`), `FILE_SEE_NOTES` (`grid.action.moreInformation`),
`FILE_DELETE` (`grid.action.delete`, warnable). Send to Text Editor is
granted to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER` on every workflow
namespace and offered only when the name's extension is in
`PANDOC_IMPORT_EXTENSIONS` (`docx`, `odt`, `rtf`, `tex`, `latex`, `md`,
`markdown`); it opens `WorkflowVersionDialogBody` in `sendToTextEditor` mode
titled `fileManager.sendFileToTextEditor`. The menu button's label is
`common.moreActions` (`FileManagerCellMoreActions.vue`), with no file name.
Live-probed 2026-09-23 (Rule 2; OJS and OMP): the entries in that order, and
every row's button named "More Actions", for every role (d10).

<a id="fn-d10"></a>
**d10** — Live-probed 2026-09-23 (Actors row 8; OJS and OMP): "Send to Text
Editor" first on "notes.md" and absent on "article.pdf" for the Site
Administrator, the Journal Manager, the Editor and the Production editor,
assigned or not, on "Submission Files", "Draft Files" and "Production Ready
Files"; never offered to the Section Editor, Guest Editor, Funding
coordinator, Copyeditor, Layout Editor, Proofreader or Author.

<a id="fn-k"></a>
**k** — `PKPSubmissionHandler::getSubmissionFilesListPanel()`: title
`submission.files` ("Files"), `addFileLabel` `common.addFile`, empty text
`submission.upload.instructions` with `common.upload.addFile`, prompt
`submission.submit.genre.label`, `otherLabel` `about.other`, remove text
`submission.submit.removeConfirm`, progress
`submission.upload.percentComplete`, cancel `form.dropzone.dictCancelUpload`,
`dropzoneDictFileTooBig`; genres exclude dependent ones, and `isPrimary` =
neither supplementary nor dependent. The edit form is `PKPSubmissionFileForm`
(a `genreId` radio, `submission.submit.genre.description`). Vue:
`SubmissionFilesListPanel.vue` (Remove dialog `common.remove` / `common.yes` /
`common.no`, DELETE through the submission files API),
`SubmissionFilesListItem.vue` (`setGenre()` PUTs `genreId`, "Saving" then
"Saved"), `SubmissionFilesEditModal.vue`, `FileUploader.vue` (Dropzone, POSTs
to `submissions/{id}/files` with `fileStage` 2, so the file exists on upload).
OPS: the files step is the galleys template (no panel). The submit gate reads
only required genres (`PKP\submission\Repository::validateSubmit()`, "You must
upload at least one {$genre} file."); nothing checks for a file without a
genre. An earlier harness note (2026-09-05) read "every uploaded file needs
its type chosen before "Submit""; d8 settles it the other way.
The component choices and the empty panel's "Upload File" are buttons styled
as links (`-linkButton`), so a test finds them by the button role. The
progress text is a screen-reader status; the row shows a progress bar. The
panel passes its size message as `dropzoneDictFileTooBig`, but the uploader
shows its own English text ("File is too big (…MiB). Max filesize: …MiB."), so
the app's translated message does not appear. Live-probed 2026-09-23 (Actors
row 9; Fields; Rules 17–18; OJS and OMP; OPS's absence): the heading "Files"
and "Add File"; the guidance in its own column to the panel's left, headed
"Upload Files", at a 1280 px wide window (a narrow window was not driven); the
empty text with "Upload File"; the file picker from both; a drop on the list
and on the header uploads; while uploading (throttled), the name, a bar and
"Cancel upload", which removed the row with nothing stored after a reload;
leaving the page mid-upload asked nothing and the panel was empty on return; a
finished file stored before any component was chosen, its name link
downloading in place; the component links "Article Text", "Other" (OMP "Book
Manuscript", "Chapter Manuscript", "Other"), a choice saved with a spinner and
shown as a badge; "Edit notes.md" with the dependent components left out of
the radios; "Save" with no radio chosen showed "An unexpected error has
occurred. Please reload the page and try again." (A11); a radio changed and
the panel closed stored nothing; the "Remove" window, "No" keeping the row,
"Yes" removing it for good. 101 MiB was refused with "File is too big
(101MiB). Max filesize: 100MiB.", 99 MiB stored, 100 MiB ended with "Invalid
JSON response from server." (A21). OPS: the "Upload Files" step holds a galley
table with "Add File" and "No Items", no panel.

<a id="fn-d8"></a>
**d8** — Live-probed 2026-09-23 (Rule 18a; Settings bullet 1; OJS and OMP):
with "article.pdf" as "Article Text" ("Book Manuscript") and "notes.md" left
without a component, "Review" showed no error and listed "notes.md" with no
component; "Submit" and its confirmation went through ("Submission complete"),
and the Editor's "Submission Files" showed "notes.md" with an empty "Type".
With "notes.md" alone (no component, or "Research Instrument" / "Prospectus"),
"Review" read "There are one or more problems that need to be fixed before you
can submit. Please review the information below and make the requested
changes." and "You must upload at least one Article Text file." ("…Book
Manuscript file."), with "Submit" greyed. Back on "Upload Files" the unset
file still carried its question. OPS: "…Preprint Text file." on a draft with
no galley.

<a id="fn-l"></a>
**l** — `GalleyManager/useGalleyManagerConfig.js` `getItemActions()`:
"Change File" (`submission.changeFile`) and "More Information" (only when the
galley has a file) for the editorial roles; on OPS an Author allowed to edit
the publication gets "Change File" and no "More Information".
`useGalleyManagerActions.galleyChangeFile()` opens the wizard with
`fileStage` proof, the galley as association, and, when the galley has a
file, `revisedFileId` plus `revisionOnly`; `galleyMoreInfo()` opens
`FileInformationCenterHandler` at the Production stage. The "Galleys" page
itself is *Galleys*'.
Live-probed 2026-09-23 (Actors row 10; OJS and OPS): the galley menu "Edit,
Change File, More Information, Delete" for the manager and the Section Editor
or Moderator, on a PDF and an HTML galley; "Change File" opened "Upload a File
Ready for Publication" with the three steps; "More Information" opened
"Information Center: PDF" ("…: HTML") on "History". OMP: the publication menu
lists "Publication Formats" and no "Galleys".

<a id="fn-m"></a>
**m** — `useFileManagerConfig.getColumns()`: `common.numero` ("No",
`FileManagerCellNumero.vue`: `FileTypeIcon` + `file.id`),
`common.fileName` ("File Name"), `common.dateUploaded` ("Date uploaded",
`formatShortDate(file.createdAt)`, so a revision keeps the first upload's
date), `common.type` ("Type", `FileManagerCellType.vue`: the genre badge,
primary unless dependent or supplementary, and
`submission.files.amendmentNotice` on a review-revision file with
`summaryOfChanges`), and the menu column. Empty body text `grid.noItems`
(`TableBody.vue`). The list heading and description come from each
namespace's `titleKey` / `descriptionKey`.
Live-probed 2026-09-23 (Rules 1, 12; OJS and OMP): the column headers "No",
"File Name", "Date uploaded", "Type"; "No" a number with an icon; "Amendment
Notice" beside the component of a revision saved with a summary; no button on
a row with nothing to offer (the Author's "Copyedited Files"); "No Items" on
an empty list; a revision kept the file's number (68 on OJS, 53 on OMP),
copies got numbers of their own.

<a id="fn-n"></a>
**n** — Titles: `wizardTitleKey` per namespace (`submission.submit.uploadSubmissionFile`,
`editor.submissionReview.uploadFile`, `submission.upload.productionReady`)
and, inside the legacy windows, `AddFileLinkAction::_getTextLabels()`
(review file `editor.submissionReview.uploadFile`, final
`submission.upload.finalDraft` "Upload File", copyedit
`submission.upload.copyeditedVersion`, proof `submission.upload.proof`,
dependent `submission.upload.dependent`). Steps: `fileUploadWizard.tpl`
(`submission.submit.uploadStep`, `metadataStep`, `finishingUpStep`),
buttons `common.continue` / `common.complete` and the `common.cancel` link
(`WizardHandler.addWizardButtons_()`); `FileUploadWizardHandler.js`
disables step 1 after advancing. Step 3: `fileSubmissionComplete.tpl`
(`submission.submit.fileAdded`, "Add Another File" `submission.submit.newFile`
unless the file stage is proof), whose button restarts the wizard
(`startWizard`). The `uploaderRoles` value the Vue lists pass (4096,
"not used anymore" per `useFileManagerActions.js`) is read into
`FileUploadWizardHandler::_uploaderRoles` and never consulted when building
the form (`uploadFile()` passes null); the only role-dependent filter is
`getRevisionSubmissionFilesSelection()`, which drops review files from the
revise list for a user holding an Author assignment at the stage.
Incidental from the review-setup probes (2026-09-05): the manager's upload
address carries `uploaderRoles=4096`.
The reviewer's step-3 upload opens the wizard without a component select, so
its file has no genre. Live-probed 2026-09-23 (Rule 5; OJS and OMP; OPS's
galley wizard): every title of Rule 5 read from the window's heading, the
reviewer's "Upload File" included (the upload box at once, "3. Confirm" with
"Add Another File", and the file in the editor's "Reviewer Files" with an
empty "Type"); "Continue" greyed until the upload finished; the three step
names in the same link colour at every step; pressing "1. Upload File" after
moving on did nothing; "2. Review Details" pressed on "3. Confirm" reopened
step 2 with its name box and a button reading "Complete" (A15). "Add Another
File" restarted at step 1 with steps 2 and 3 disabled, the component reset and
the revise list holding the file just added; a galley's step 3 had no "Add
Another File", a dependent file's did.

<a id="fn-d21"></a>
**d21** — Live-probed 2026-09-23 (Rule 5; OJS and OMP): "Upload" on
"Submission Files" gave the Journal Manager, a second manager-level editor,
the assigned Section Editor (Series Editor on OMP) and the assigned Funding
coordinator the same title, the same component list (10 entries on OJS, 14 on
OMP) and the same revise list; on "Revisions Uploaded" the Author's "Upload
revisions" and the editor's "Upload" offered the same entries.

<a id="fn-o"></a>
**o** — `fileUploadForm.tpl` use cases: not `revisionOnly` → the genre
select (`submission.upload.fileContents`, default label
`submission.upload.selectComponent`, overridden per app: OJS "Article
Component" / "Select article component", OMP "Submission Component" /
"Select component", OPS "Preprint Component" / "Select preprint
component") and, when the stage's list has files, the optional revise
select (`submission.upload.selectOptionalFileToRevise`, first option
`submission.upload.uploadNewFile`); `revisionOnly` with a preset file →
"Current file" (`submission.submit.currentFile`) and `$revisedFileName`,
which no PHP assigns (A5); `revisionOnly` without a file and without
options → `submission.upload.noAvailableReviewFiles`. The genre list is
`GenreDAO::getByDependenceAndContextId($dependentFilesOnly, …)` (enabled,
ordered by sequence). `FileUploadFormHandler.js`: `setUploaderVisibility_()`
hides the uploader until a genre or revised file is chosen,
`revisedFileChange()` sets and disables the genre select,
`prepareFileUploadRequest()` disables both selects once the upload starts.
Uploader widget: `fileUploadContainer.tpl` (`common.upload.addFile`,
`common.upload.changeFile`, `common.upload.dragFile`). The anonymizing link:
`PKPSubmissionFilesUploadBaseForm::fetch()` when `showEnsuringLink` and the
stage is Submission, Internal or External Review (`review.anonymousPeerReview.title`).
Server refusal of a missing genre (`submission.upload.noGenre`) cannot be
reached from the screen, since the uploader stays hidden.
The uploader is hidden with the `pkp_screen_reader` class, which keeps it in
the accessibility tree, and the two selects' labels are not tied to them (A9).
Live-probed 2026-09-23 (Fields "1. Upload File"; Rule 5a; OJS, OMP, OPS's
galley wizard): the labels and first options per app as above; the revise list
absent on an empty list and present once it held a file, listing that list's
files only, by name alone (A8); the component list the install's list in its
default order, the dependent components left out (a reordered list was not
driven); a file chosen to revise selected and greyed its component. The
anonymizing link with the setting on: shown on "Submission Files", "Revisions
Uploaded" and the round's "Upload Review File" (OMP's internal round too),
never on the Copyediting windows or "Production Ready Files"; with the setting
off, absent; pressed, a window titled "How to ensure all files are anonymized"
with the instructions.

<a id="fn-p"></a>
**p** — `FileUploadWizardHandler::uploadFile()` runs
`SubmissionFilesUploadForm::execute()`, which stores the file and creates
(or revises) the submission file before step 2 loads. JS
(`FileUploadWizardHandler.js`): the Continue button starts disabled and is
enabled by the form's `formValid` once `uploadedFile_` is set;
`wizardCancelRequested()` posts `ManageFileApiHandler` `cancelFileUpload`
with the uploaded file and, for a revision, `originalFile`; the plupload
`FilesRemoved` event ("Change File") posts `deleteFile` with
`suppressNotification`. Closing the modal fires neither. Incidental from the
production-stage claim check (2026-09-19, OJS and OMP): "Upload a Production
Ready File" left at "2. Review Details" with no prompt listed the file
anyway, under the component chosen in step 1 (the first in the list, as the
check chose it). The review-stage spec's A11 (test run 2026-09-12) saw the
header "Close" keep an author's revision and "Cancel" remove it.
"Change File" posts `deleteFile` for the first upload, which the app refuses
(A14). The question on "Close" at step 1 is the legacy form's changed-data
prompt; steps 2 and 3 have none. Live-probed 2026-09-23 (Rules 5a, 6, 7; OJS
and OMP): after "Close" at steps 1, 2 and 3 the file was listed with the
step-1 component ("Research Instrument" / "Prospectus"); at step 1 the
browser's question came first, "OK" closing with the file kept, "Cancel"
keeping the window open; at step 2 no question, the list reading the uploaded
name "close-step2.pdf" although another name had been typed; closed at step 3,
the name saved at step 2. "Cancel" at steps 1, 2 and 3 removed a new file and
asked nothing. After "Change File" and "Complete" the list held
"change-first.pdf" beside the second file (A14).

<a id="fn-q"></a>
**q** — Cross-feature pointers only; each linked spec states its own
behavior with its own evidence.
Live-probed 2026-09-23 (Purpose; Cross-feature interactions; all three apps):
each pointer's screen as its bullet says, every linked anchor resolving; a
decision's "Select Files" copying the author's file onto "Files for Review"
under a new number (OJS 222 to 236), the original staying; a preprint server's
"Upload Files" step holding its galley list, its decisions ("Post the
preprint", "Decline Submission") without a "Select Files" page, and the
"Decline Submission" email's "Attach Files" offering "Upload File" and
"Library Files" only; a reviewer's file in the editor's "Reviewer Files" with
an empty "Type".

<a id="fn-r"></a>
**r** — Revision: `SubmissionFilesUploadForm::execute()` with
`revisedFileId` calls `Repo::submissionFile()->edit()` with the new
`fileId`, `name` = the uploaded file's name in the submission locale, and
`uploaderUserId`; the submission file keeps its id and genre. Revisions:
`Repository::getRevisions()` (table `submission_file_revisions`). The
History tab's upload rows carry `DownloadFileLinkAction` with that entry's
`fileId` (`EventLogGridRow::initialize()`), so each version stays
downloadable.
Live-probed 2026-09-23 (Rule 8; OJS and OMP): after "Complete" one row, "89
article-rev.pdf … Article Text" (OMP "83 … Book Manuscript"); "History" listed
the revision and the original upload, each "Download" behind its row's arrow
fetching that version (OJS fileId 166 "article-rev.pdf" and 84 "article.pdf").

<a id="fn-s"></a>
**s** — Since pkp/pkp-lib#13288 (issue #13286, merge `f38c4a4a10`,
2026-09-27): `FileUploadWizardHandler::uploadFile()` keeps the replaced
file's `fileId`, `name` and `uploaderUserId` in the session under
`revisionUploadOriginalFile.<submissionFileId>`, one key per submission
file, which every revision upload writes anew.
`PKPManageFileApiHandler::cancelFileUpload()` accepts only the file the
submission file currently points at and newest among its revisions,
restores the revision just below it (`$revisions->get(1)`) with the stored
name and uploader through `edit(…, log: false)`, deletes every log entry
carrying the cancelled `fileId` (`deleteRevisionLogEntries()`), then the
uploaded file, and removes the key; with no key, or for another file, it
answers `status:false` and changes nothing. The `originalFile` the wizard
still posts (note p) is no longer read. Before the change it restored the
posted `originalFile` once `findMatchedLogEntry()` (removed) found a log
entry with the original uploader's username, name and file id, which a
rename since the last upload defeated (A1, f-a1). The one key per file and
the restore to the revision just below are what A23 and A24 run into.
Live-probed 2026-09-27 (Rules 7, 9): note d5.

<a id="fn-aa"></a>
**aa** — A pointer only: this spec makes no screen claim of its own about an
author's revision request; the review-stage spec states it with its own
evidence.

<a id="fn-d5"></a>
**d5** — Live-probed 2026-09-27 (Rule 9; OJS and OMP; the Journal
Manager, an Editor, and a Section Editor, on the press a Series editor, as
revisers): "article.pdf" revised and cancelled at steps 1, 2 and 3, with
the file not renamed, renamed by the reviser, renamed by another editor
and revised by the one who renamed it, renamed by a manager and revised by
the Section Editor, and a revision of an already-replaced file
("rev-c8.pdf" back): the previous file back under its previous name and
number every time, at once and after a reload, `cancel-file-upload`
answering `status:true`, and no line added to the file's "History" or to
the Activity Log. Choosing the file to revise showed its component,
greyed. The header "Close" after a revision (the browser's question at
step 1, then "OK") left "rev-c9.pdf" under the original number, and
"History" offered the earlier "article.pdf" as a "Download". On
2026-09-23, before the fix, a rename by anyone since the last upload made
`cancel-file-upload` answer `status:false`, the window staying open with
no message (A1).

<a id="fn-d4"></a>
**d4** — Live-probed 2026-09-23 (Rule 9a; OJS and OPS): a galley's "Change
File" step 1 held the heading "Current file" and nothing else in its section,
then the upload box at once, with no component or revise list; the same for
the manager and the Section Editor or Moderator, on a PDF and an HTML galley,
and after an earlier completed "Change File". Once a file was chosen the line
read "replacement.pdf" with "Change File" (A5). Closed with the header "Close"
after the upload, with no question, the Preview's galley download served
"replacement.pdf"; "Cancel" at the same point served "article.pdf"
("preprint.pdf") again (A16). Live-probed 2026-09-27 (Rule 9a; OJS and
OPS; the manager and the Section Editor or Moderator): the same step 1
and the same two outcomes; the cancelled upload (`status:true`) left no
line in the galley's "History" or the Activity Log, while the one closed
with "Close" left "A file revision "replacement.pdf" was uploaded…" in
both.

<a id="fn-t"></a>
**t** — `SubmissionFilesMetadataForm` (name required,
`submission.submit.fileNameRequired` "You must enter a file name for this
file"; locales = the submission's publication languages within the
context's submission metadata locales) mounts the Vue `FileMetadataForm`
(`useFileMetadataForm.js`): `name` multilingual required
(`submission.form.name`); `summaryOfChanges` rich text only for
`SUBMISSION_FILE_REVIEW_REVISION` / `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`
(`submission.form.summaryOfChanges`, `.description`); a supplementary group
when the genre's category is `GENRE_CATEGORY_SUPPLEMENTARY` (description,
creator, publisher, source, subject, sponsor, date, language); an artwork
group for `GENRE_CATEGORY_ARTWORK` (caption, credit, copyright owner,
permission terms). In the wizard the form has no buttons and the wizard's
Continue submits it (`wizardAdvanceRequested` bridge); in "Edit a file"
`showButtons` gives "Save" and "Cancel". Save posts
`ManageFileApiHandler` `saveMetadata`; a validation failure re-renders the
legacy form server-side and triggers `notifyUser`. `saveMetadata` also
deletes the authors' pending-revisions notifications when the file belongs
to a review round. The genre is not a field of this form.
The probes contradict the locales clause for a one-language submission: an
English-only submission on an English and French journal showed both language
tabs. Both "Submissions" and "Metadata" were ticked for both languages, so
which of the two columns decides was not separated. Live-probed 2026-09-23
(Fields "2. Review Details"; Rules 5b, 10, 12; OJS, OMP, OPS's galley wizard):
the name arriving as "article.pdf"; emptied, "This field is required." under
the box and "Please correct one error. Go to Name the file (e.g., Manuscript;
Table 1): This field is required. Jump to next error", the window open and
nothing sent; the summary box only on "Revisions Uploaded" files, its hint
verbatim, one box across the language tabs; the supplementary fields for
"Research Instrument" / "Prospectus", the artwork fields for "Image" and OMP's
"Figure"; "Edit a file" with the same fields and "Cancel" / "Save", the new
name in the list at once; "Amendment Notice" beside the component; "Insert
Content" listing both summaries under "Review (Round 1) • 2026-09-23 •
notes.md" (OMP "External Review (Round 1) • …").

<a id="fn-d11"></a>
**d11** — Live-probed 2026-09-23 (Fields; Rule 10; Settings bullet 5; OJS,
OMP, OPS's galley wizard): step 2 for "Article Text" showed the name box
alone, for "Research Instrument" also the eight supplementary fields; "Update
File Details" opened "Edit a file" with the same fields; the emptied name was
refused with "This field is required." and the window stayed open. On an
English and French journal the form showed the tabs "English" and "French
(Canada)", one box at a time, opening on the submission's own language with
"article.pdf" in its box (a French submission opened on "French (Canada)"); a
one-language journal showed one box and no tabs.

<a id="fn-u"></a>
**u** — `Repository::supportsDependentFiles()`: mimetype `text/html`,
`application/xml` or `text/xml`, not itself a dependent or discussion file.
`submissionFileMetadataForm.tpl` loads
`grid.files.dependent.DependentFilesGridHandler` (title
`submission.submit.dependentFiles`; add action `AddFileLinkAction` with
`dependentFilesOnly`, wizard title `submission.upload.dependent`, button
`submission.addFile`); capabilities add, delete, view notes, edit, reduced
to view notes when the grid is given a published publication. Dependent
files are excluded from the Vue lists by the collector's default
(`includeDependentFiles` false).
Live-probed 2026-09-23 (Rule 11; OJS, OMP; OPS's HTML galley): the list under
step 2 and in "Edit a file" for an HTML and an XML file, not for a PDF, and in
an HTML galley's "Edit" window; "Dependent Files", "Search", "Upload File",
the columns "Name", "Date", "Component", and "No Files" when empty; "Upload a
Dependent File" offering "Multimedia", "Image", "HTML Stylesheet" (OMP
"Image", "HTML Stylesheet"); the image not a row of "Production Ready Files";
on a published galley the list's row offered "More Information" alone and its
"Upload File" was gone.

<a id="fn-d13"></a>
**d13** — Live-probed 2026-09-23 (Rules 11, 16; OJS and OMP): the HTML file's
step 2 showed the "Dependent Files" list with "Search" and "Upload File"; the
wizard it opened was titled "Upload a Dependent File" with the dependent
components only; the image uploaded as "Image" was not a row of "Production
Ready Files". "Search" with "profile" left one row, "zzzz" gave "No Files", an
empty search restored the row. Deleting the HTML file logged the image's
deletion as well; the same HTML file uploaded again started with "No Files".

<a id="fn-v"></a>
**v** — `informationCenter.tpl`: tabs `submission.informationCenter.history`
("History", unless `removeHistoryTab`) then
`submission.informationCenter.notes` ("Notes"); `setupTemplate()` selects
tab index 0 unless `tab=notify|history` is passed, so the first tab,
History, opens. History grid columns `common.date`, `common.user`,
`common.event`; messages `submission.event.fileUploaded`,
`submission.event.revisionUploaded`, `submission.event.fileEdited`,
`informationCenter.history.notePosted`; `common.download` links (note r).
The filter form `eventLogGridFilter.tpl` (`allEvents`,
`submission.informationCenter.history.allEvents`) renders for manager,
site admin, sub-editor and assistant, but
`SubmissionFileEventLogGridHandler::loadData()` ignores the filter (A4).
Notes: `notes.tpl` / `notesList.tpl` / `note.tpl` (`informationCenter.noNotes`,
`informationCenter.deleteConfirm`, `common.delete`), `newNoteForm.tpl`
(`informationCenter.addNote` as label and button), messages
`notification.addedNote` / `notification.removedNote`;
`NewFileNoteForm` always shows "Earlier Revision Notes"
(`informationCenter.pastNotes`), listing the notes of
`sourceSubmissionFileId` (set by `Repository::copy()`). `NewNoteForm` has no
check on the note text (d14).
The wizard's step-2 save runs `edit()`, which logs
`submission.event.fileEdited`, hence the second row per upload. The rows'
download links sit behind `EventLogGridRow`'s extras arrow (accessible name
"Settings"), and the filter form is collapsed behind "Search". Live-probed
2026-09-23 (Rules 13–14; all three apps): notes d3, d14, d16, d18; the empty
note (A10), the note text lost (A18) and the script failure (A17) in their
entries.

<a id="fn-d3"></a>
**d3** — Live-probed 2026-09-23 (Rule 13; all three apps): "Date", "User"
("Mira Manager") and "Event", newest first; each message verbatim, a fresh
upload giving an upload row and a "The metadata for file…" row, a "Change
File" on OPS the same pair; a deleted note kept its "Posted new note." row; a
copy made through "Upload/Select Files" started with one upload row by the
copier. Each upload and revision row showed "Download" only once its arrow was
pressed, and each download fetched the version the row records (fileId 186
"article.pdf", 187 "notes.md"). The box sat behind "Search" for the Journal
Manager, the Section Editor and the OPS manager and Moderator; ticked and
searched, the same rows came back with the box unticked (A4).

<a id="fn-d14"></a>
**d14** — Live-probed 2026-09-23 (Rule 14; all three apps): a file with no
notes read "There are no notes to display."; "Add Note" with the box empty
posted a note with no text (A10); "First check" posted a row with its writer
and date ("Mira Manager 2026-09-23 11:55 AM") and "Note posted."; the row's
"Delete" opened a window titled "Confirm" asking "Are you sure you wish to
delete this note?" with "OK" and "Cancel", and "OK" removed it with "Note
deleted.". Notes list oldest first.

<a id="fn-d16"></a>
**d16** — Live-probed 2026-09-23 (Rule 13; all three apps): the title
"Information Center: article.pdf", following a rename or a revision; on a
preprint server "Information Center: PDF" for a galley whose file is
"preprint.pdf"; the tabs "History" then "Notes", with "History" selected on
landing.

<a id="fn-d18"></a>
**d18** — Live-probed 2026-09-23 (Rule 14; OJS and OMP, OPS for a file not
copied): on a "Draft Files" copy the closed "Earlier Revision Notes" opened
the source's note ("admin admin 2026-09-23 11:49 AM · From submission") with
no "Delete", the copy's own list reading "There are no notes to display."; on
a file not copied (the original, a fresh upload, a production file, an OPS
galley) it opened "There are no notes to display."; no "Delete" on past notes
for the Journal Manager, the Section Editor or the Copyeditor.

<a id="fn-w"></a>
**w** — `FileManagerActions.fileSelectUpload()` opens the list's
`gridComponent` `selectFiles` (`EditorReviewFilesGridHandler`,
`FinalDraftFilesGridHandler`, `CopyeditFilesGridHandler`) in a modal titled
`uploadSelectTitleKey`; the window's grid is a
`SelectableSubmissionFileListCategoryGridHandler` subclass
(`ManageReviewFilesGridHandler`: add, view notes;
`ManageFinalDraftFilesGridHandler`, `ManageCopyeditFilesGridHandler`: add,
delete, view notes, edit), categories = accessible stages, filter
`editor.submission.fileList.includeAllStages`, rows `SubmissionFilesGridRow`
(`FileInfoCenterLinkAction` "More Information", `EditFileLinkAction`
"Edit", `DeleteFileLinkAction` "Delete"), name column
`FileNameGridColumn` with `DownloadFileLinkAction`. OK copies through
`ManageSubmissionFilesForm` (`Repository::copy()` sets
`sourceSubmissionFileId`). The per-stage behavior is the review-stage and
copyediting specs' (their Rules 8 and 5).
The rows of another stage act through the window's own grid, which the app
refuses for them (A19). Live-probed 2026-09-23 (Rule 15; OJS and OMP): the
three windows listing the stage's files under its name with tick boxes (a
round's files arriving ticked); the all-stages box adding OJS "Submission,
Review, Copyediting, Production" (OMP "Submission, Internal Review, External
Review, Copyediting, Production") for the Journal Manager, nothing for the
Copyeditor, and an empty "Done" after "Production" for the Section Editor; the
link "Upload File" in the Copyediting windows and "Upload Review File" in
"Files for Review"; "OK" copying "Submission Files" 172 to "Draft Files" 184
with 172 kept (OMP 126 to 137); "Cancel" copying nothing; on the own stage
"More Information" and "Edit" working.

<a id="fn-x"></a>
**x** — `SubmissionFilesGridHandler::getFilterForm()` →
`filesGridFilter.tpl` (a search box, a column select with "Name",
`common.search`), collapsible (`GridHandler::isFilterFormCollapsible()`
true); `SubmissionFilesGridDataProvider` keeps rows whose name contains the
text. Live grids of this kind: the dependent files grid (this spec), the
reviewer's files (`ReviewerReviewFilesGridHandler`, the reviewer's-review
spec), `LimitReviewFilesGridHandler` in the reviewer's "Edit" window (the
reviewer-management spec).
Live-probed 2026-09-23 (Rule 16; OJS and OMP): the "Dependent Files" list
(note d13) and the "Files To Be Reviewed" list of the editor's reviewer "Edit"
and "Add Reviewer" windows narrowed on "notes" and gave "No Files" on "zzzz";
the reviewer's grid sent `search=notes` and `search=zzzz` and answered both
rows each time (A20).

<a id="fn-y"></a>
**y** — `PKP\submissionFile\Repository`: `add()` logs
`submission.event.fileUploaded` on the file and, on the submission,
`submission.event.fileRevised` ("Revision "{$filename}" was uploaded for
file {$submissionFileId}.", event type revision upload) even for a new
file (d20); `edit()` logs `submission.event.revisionUploaded` or
`submission.event.fileEdited` on both; `delete()` logs
`submission.event.fileDeleted` on both. `add()` on a review revision
updates the round status and the authors' pending-revisions notifications
and, when the uploader is an assigned author, calls
`notifyEditorsRevisionsUploaded()` (the review-stage spec's email). No other
mailable is sent from these paths.
Live-probed 2026-09-23 (Side effects; all three apps): note d20 for the log
lines. The Author's upload to "Revisions Uploaded" sent the assigned Section
Editor one "Revised Version Uploaded" email, none to the unassigned Journal
Manager, moved the round from "Revisions have been requested." to "Revisions
have been submitted and a decision is needed." and cleared the Author's task
"Revision required." (OMP "Revisions to consider in External Review."). No
email reached anyone for an editor's uploads, a copy, a revision through
"Upload/Select Files", a rename, deletes, notes, downloads or an OPS "Change
File"; notes changed nobody's Tasks count.

<a id="fn-d20"></a>
**d20** — Live-probed 2026-09-23 (Side effects; all three apps): in the
"Activity Log & Notes" window, an upload logged "Revision "article.pdf" was
uploaded for file 182." (A22) plus a "The metadata for file "article.pdf" was
edited by …" line; a revision "A file revision "notes.md" was uploaded for
submission 387 by …"; a rename "The metadata for file "Renamed manuscript" was
edited by …"; a delete "A file "notes.md" was deleted for submission 387 by
…"; a note nothing.

<a id="fn-z"></a>
**z** — Defaults: `registry/genres.xml` per app (installed by
`GenreDAO::installDefaults()`, sequence in file order; OMP lists `OTHER`
twice, so its one "Other" sits last). Categories: OJS/OPS `SUBMISSION`
document, `RESEARCHINSTRUMENT`…`SOURCETEXTS` and `OTHER` supplementary
content, `MULTIMEDIA` document + dependent, `IMAGE` artwork + dependent,
`STYLE` document + dependent; OMP `APPENDIX`, `BIBLIOGRAPHY`, `GLOSSARY`,
`INDEX`, `PREFACE` document + supplementary flag, `MANUSCRIPT`, `CHAPTER`
document, `PROSPECTUS`, `OTHER` supplementary content, `TABLE`, `FIGURE`,
`PHOTO`, `ILLUSTRATION` artwork, `IMAGE` artwork + dependent, `STYLE`
document + dependent. Required: `SUBMISSION` / `MANUSCRIPT`. Genre form:
`genreForm.tpl` (`manager.setup.genres.label` "File Type",
`manager.setup.genres.metatadata` "File Metadata" with `submission.document`,
`submission.art`, `submission.supplementary`,
`manager.setup.genres.submitRequired.label` "Require with Submissions").
Tab: `management/workflow.tpl` `grid.genres.title.short` "Components",
grid title `grid.genres.title` per app. `showEnsuringLink`:
`PKPReviewSetupForm`; the review-setup spec owns the box. Guidance:
`SubmissionGuidanceSettings` `uploadFilesHelp`, default
`default.submission.step.uploadFiles`. Upload limit:
`Application::getIntMaxFileMBs()` (the wizard panel) and plupload's
`UPLOAD_MAX_FILESIZE` (the legacy wizard), from PHP's configuration.
Live-probed 2026-09-23 (Settings; all three apps): the "Components" tab and
its list titles; the defaults in the order given, OMP with one "Other", last;
the component forms' "File Type" and "File Metadata" defaults as listed; each
other end on a scratch journal (a component made dependent leaving the panel,
the radios and the upload lists for "Upload a Dependent File"; one unticked on
both boxes offered as a panel link with the filled badge; the "File Metadata"
deciding step 2's fields whatever the boxes; a component made required
stopping "Submit"; a removed one gone everywhere). The anonymizing box on
Review › "Reviewer Guidance" (none on "Setup"), unticked by default; OPS's
Workflow tabs have no "Review". The guidance defaults verbatim and a custom
text shown in the author's step. The probe servers' PHP limit is 100M.

<a id="fn-s0"></a>
**s0** — Accounts: `users.md` (the seeded roster; `admin`/`admin`, everyone
else their username twice; throwaway accounts the username twice). Files:
`apps/<app>/playwright/fixtures/files/` (`article.pdf`, `notes.md`,
`article.html` and `profile-image-400.png` on OJS and OMP; `preprint.pdf` on
OPS). A scenario's starting files are seeded through the scenario API:
`files[]` (OJS and OMP; OPS refuses it) puts files on "Submission Files" with
their component (`genre`, default the first main-work component), uploader
and note, `reviewRounds[].files[]` on a round's "Files for Review", given to
the round's seeded reviewers, and `galleys[]` a galley's file; every other
file in a scenario is uploaded on screen. Where each scenario runs: 1–7 and 9
and the first half of 8 on the seeded journal or press `publicknowledge`,
submissions from `POST scenarios/submission` with submitter `author.alex`
(on the press `series: 'monographs'`, so the series' editors are assigned
automatically as on the journal's section ART); 10 and the "Open" review of 8
on scratch contexts from `POST scenarios/context`; 11 on the seeded preprint
server. The Journal Manager is `manager.maya`, the Section Editor
`sectioneditor.ana` (assigned automatically), the Copyeditor
`copyeditor.carla`, the Reviewer `reviewer.julia`, the Author `author.alex`.
Recipes: 1 — `files: [{file: 'article.pdf'}]`, read as `manager.maya` then
`sectioneditor.ana`. 2, 3 — the same seed as `manager.maya`; 3's file is the
submitter's, so nobody renamed it. 4 — `files: [{file: 'article.pdf'},
{file: 'notes.md', genre: 'Research Instrument'}]` (`'Prospectus'` on the
press) beside a seed with no `files`. 5 — `files: [{file: 'article.html'},
{file: 'article.pdf'}]`; the Activity Log is the workflow header's "Activity
Log" window. 6 — `decisions: ['skipExternalReview']`, `files: [{file:
'article.pdf', note: 'Check figure 2.'}]` (the note's writer reads "admin
admin"), `participants: [{username: 'copyeditor.carla', role:
'copyeditor'}]`; "Draft Files" starts empty since seeded submissions carry no
Copyediting files. 7 — `decisions: ['sendExternalReview']`, `participants:
[{username: 'sectioneditor.ravi', role: 'sectionEditor'}]`, `files: [{file:
'article.pdf'}, {file: 'notes.md', uploader: 'sectioneditor.ravi'}]`, read as
`author.alex`, the control as `manager.maya`. 8 — `decisions:
['sendExternalReview']`, `reviewRounds: [{files: [{file: 'article.pdf'}],
reviewers: [{username: 'reviewer.julia', status: 'accepted'}]}]` on
`publicknowledge`, whose "Default Review Mode" is "Anonymous
Reviewer/Anonymous Author" (seed-facts); the "Open" review on a scratch
journal created with `review: {defaultReviewMode: 'open'}` and throwaway
`author` and `externalReviewer` users, the same seed shape with the throwaway
author as submitter and the throwaway reviewer on the round; the reviewer's
download name on the seeded journal starts with the acronym "JPK" ("PKP" on
the press). 9 — a `submitted: false` draft of `author.alex` with no files,
which reopens on "Upload Files"; the test continues through the other steps
to "Review" and ticks what that step asks before "Submit", as the
submission wizard spec's scenarios do; "Cancel upload" is pressed on a
throttled upload. 10 — a scratch journal or press created with `review:
{showEnsuringLink: true}` and `components: {'Survey Data': {metadata:
'supplementary'}, 'Transcripts': false}` (`'Glossary': false` on the press),
a throwaway `manager` and `author`; one submitted seed and one with
`decisions: ['skipExternalReview', 'sendToProduction']`. 11 — a submitted
preprint with `galleys: [{label: 'PDF', file: 'preprint.pdf'}]`, read as
`manager.maya`. The recipe is the tooling's: no screen shows it.
Live-probed 2026-09-23: the claim check seeded its submissions through these
keys on all three apps, OPS refusing `files[]`.

<a id="fn-a1"></a>
**f-a1** — pkp/pkp-lib#13286 (tracking issue; introduced by pkp-lib
`74a8d58571`, pkp/pkp-lib#12352 for issue #12347, merged 2026-09-04:
`Repository::edit()` now logs the edit under the new file, so
`findMatchedLogEntry()` finds no entry with the original uploader's username
plus the pre-revision name and file id). Working at `4ddab4b9cf`, broken at
`74a8d58571` (upstream-sync 2026-09-07; the kept check
`shared/playwright/checks/sync/pkp-lib-12352/cancel-restore.js`). Last re-run
2026-09-22 at ojs `38781720df` / pkp-lib `f8bacd7658` on a reset database:
after "Cancel" the file list read fileId 2 `article-rev.pdf`,
`cancel-file-upload` answered `status:false`. The stable-3_5_0 line's backport logs under the original
file and restores (read 2026-09-21). Upstream's #13286 also records the
renamer revising (the check's MODE=other) failing on 3.4 and 3.5. Live-probed
2026-09-23 on OJS and OMP: a rename by anyone since the last upload, the
uploader's included, defeated the restore, and the window stayed open with no
message. Fixed by pkp/pkp-lib#13288 (merge `f38c4a4a10`, 2026-09-27; note s),
in ojs `72b85f4ba0` / lib/pkp `26ae6431b5`, omp `3cd59e9443` and ops
`e2111e3aae` / lib/pkp `17a1f01fed`. Live-probed 2026-09-27 on OJS and OMP
(note d5): every renamed-file case restored the previous file; the kept check
restored it on both, in both of its modes. Retired 2026-09-27. The same change
brought A23 and A24.

<a id="fn-a2"></a>
**f-a2** — Note d. Live-probed 2026-09-23 (d1; OJS and OMP): on "Submission
Files" and on "Revisions Uploaded" the Author's "Update File Details" on a
file an editor uploaded opened "Edit a file" with the one line "The current
role does not have access to this operation." and the header "Close". On a
round with revisions requested the manager's file in "Revisions Uploaded" was
refused the same way, so `SubmissionFileRequestedRevisionRequiredPolicy` does
not open another's file to the Author.

<a id="fn-a3"></a>
**f-a3** — Note e; `FileManagerConfigurations` grants `FILE_SEE_NOTES` to
`ROLE_ID_ASSISTANT` on every workflow namespace. Live-probed 2026-09-23 (d2;
OJS and OMP; Copyeditor, Layout Editor, Proofreader): "Loading" after 10 s;
the History grid's `fetch-grid` answered `status:false` "The current role does
not have access to this operation.", which the tab never shows. Their notes
posted with "Note posted.".

<a id="fn-a4"></a>
**f-a4** — Note v. Live-probed 2026-09-23 (d3; all three apps; Journal
Manager, Section Editor, Moderator): the filter form hidden until "Search";
the POST to `submission-file-event-log-grid/fetch-grid` carried `allEvents=on`
and returned the same rows (eight on an OJS file; on a copy the same three,
none of its source's), and the form came back collapsed and unticked.

<a id="fn-a5"></a>
**f-a5** — Note o: `fileUploadForm.tpl` prints `{$revisedFileName}` under
`submission.submit.currentFile`; no PHP in lib/pkp or the three apps assigns
it (grep, 2026-09-23). Live-probed 2026-09-23: note d4.

<a id="fn-a6"></a>
**f-a6** — Production-stage claim check, 2026-09-19 (K2, OJS and OMP): the
"Production Ready Files" rows' menu buttons carry no file name in their
accessible name, so rows were told apart by position. Code: note j.
Live-probed 2026-09-23 (Rule 2; OJS and OMP): every row's button named "More
Actions" on every list and for every role; the file name cell is a row header
holding the link.

<a id="fn-a7"></a>
**f-a7** — Note c: the Author's Vue permissions on `WORKFLOW_REVIEW_REVISIONS`
include upload with no round check (note b), while
`SubmissionFileStageAccessPolicy` allows the revision stage only after a
revisions decision. Live-probed 2026-09-23 (Actors row 2; OJS and OMP): on a
round awaiting reviewers ("Awaiting responses from reviewers.") the Author had
"Upload" above "Revisions Uploaded" and no "Upload revisions"; "Upload" opened
"Upload Review File" with "You are not allowed to add and edit these files."
and "Close" alone, and the list stayed "No Items". Seen again from the review
stage's side the same day.

<a id="fn-a8"></a>
**f-a8** — Note o. Live-probed 2026-09-23 (OJS and OMP): one list's revise
options read "article.pdf", "article.pdf", "close-step1.pdf",
"close-step1.pdf".

<a id="fn-a9"></a>
**f-a9** — Note o. Live-probed 2026-09-23 (OJS, OMP, OPS): the accessibility
snapshot of step 1 before a component was chosen held two unnamed comboboxes,
"Drag and drop a file here to begin upload", the button "Upload File" and the
button "Choose File", while the screenshot showed no box.

<a id="fn-a10"></a>
**f-a10** — Note v (`NewNoteForm` has no check on the text). Live-probed
2026-09-23 (d14; all three apps): an empty note row "Mira Manager 2026-09-23
11:57 AM · Delete", "Note posted.", and a "Posted new note." row in "History".

<a id="fn-a11"></a>
**f-a11** — Note k. Live-probed 2026-09-23 (OJS and OMP): "Other" › "Save"
with no radio chosen showed the message with the panel still open; the save, a
POST to `…/api/v1/submissions/{id}/files/{fileId}?stageId=1` with a PUT
override, answered 500.

<a id="fn-a12"></a>
**f-a12** — Note h (`Str::kebab()`). Live-probed 2026-09-23: note d19.

<a id="fn-a13"></a>
**f-a13** — Note g (`source_submission_file_id` `ON DELETE CASCADE`).
Live-probed 2026-09-23 (OJS and OMP): deleting the "Submission Files"
originals 128 and 129 emptied their "Draft Files" copies 131 and 132 ("Draft
Files" reading "No Items"); on OMP deleting 58 removed its copy 68; the
Activity Log had deletion lines for the originals only. *Copyediting stage*'s
A8 saw it from "Copyedited Files" to "Draft Files".

<a id="fn-a14"></a>
**f-a14** — Note p. Live-probed 2026-09-23 (OJS three runs, OMP one): after
"Change File" the screen posted `delete-file` for the first upload, answered
`status:false` "The current user is not authorized to access the specified
submission file." (HTTP 200); after "Complete" the list held "change-first.pdf
… Research Instrument" beside the renamed second file.

<a id="fn-a15"></a>
**f-a15** — Note n. Live-probed 2026-09-23 (OJS twice, OMP once): "2. Review
Details" pressed on "3. Confirm" reopened step 2 with the name box, its button
reading "Complete"; pressing it posted `save-metadata` with the new name and
showed "File Added" in the window, still open; the list then read "Back at
step two.pdf".

<a id="fn-a16"></a>
**f-a16** — Notes l and p. Live-probed 2026-09-23 (d4; OJS and OPS, two runs):
"Close" after the upload sent only the upload and raised no question, and the
Preview's galley download served "replacement.pdf"; "Cancel" sent
`cancel-file-upload` (`status:true`) and the download served the original.

<a id="fn-a17"></a>
**f-a17** — Live-probed 2026-09-23 (one run each, OJS and OPS): a page error
"There is no handler bound to this element!" about a second after two History
downloads (a revision's, then the upload's) and "Close", on OJS's Submission
stage and on OPS's galleys page. A replay with one download and "Close", and a
control with "Close" alone, raised none on OJS and OMP.

<a id="fn-a18"></a>
**f-a18** — Note v. Live-probed 2026-09-23 (Rule 14a; the tab switch on all
three apps, the close on OJS and OMP): the tab switch raised the browser's
question and, accepted, left the box empty; closing the window with text typed
raised nothing, and the next navigation raised a leave-page question (the
navigation stopped when it was dismissed, went on when accepted); "Notes" then
read "There are no notes to display.". "Edit a file" with a changed name and
"Cancel" raised no question and kept the old name.

<a id="fn-a19"></a>
**f-a19** — Note w. Live-probed 2026-09-23 (OJS and OMP; the "Draft Files",
"Copyedited Files" and "Files for Review" windows, OMP's internal round too):
"More Information" raised two browser alerts and still read "Loading" after 10
s; "Edit" showed the refusal; `delete-file?…&stageId=4` answered
`status:false` "The current role does not have access to this operation.", the
dialog still spinning after 13 s and "notes.md" still in "Submission Files"
(twice per app).

<a id="fn-a20"></a>
**f-a20** — Note x. Live-probed 2026-09-23 (OJS and OMP): the reviewer's grid
sent `search=notes` and `search=zzzz` and answered both rows each time; the
same searches in the editor's reviewer "Edit" window answered one row and
none.

<a id="fn-a21"></a>
**f-a21** — Note k. Live-probed 2026-09-23 (OJS and OMP; probe servers with
PHP `upload_max_filesize` and `post_max_size` at 100M): the 100 MiB file's
POST to `…/api/v1/submissions/{id}/files` answered 500, the server log reading
"POST Content-Length of 104857994 bytes exceeds the limit of 104857600 bytes":
the form fields push the request past the limit the panel's size check
compares against.

<a id="fn-a22"></a>
**f-a22** — Note y: `add()` logs `submission.event.fileRevised` on the
submission even for a new file. Live-probed 2026-09-23 (d20; all three apps):
a fresh upload 182 logged "Revision "article.pdf" was uploaded for file 182.";
every production upload the same; OPS's seeded galley file "Revision
"preprint.pdf" was uploaded for file 6.".

<a id="fn-a23"></a>
**f-a23** — Introduced by pkp/pkp-lib#13288 (issue #13286, merge
`f38c4a4a10`, 2026-09-27; note s): the second upload writes the session
key anew with the first pick as "the original", and the cancel restores the
revision just below the cancelled one, the first pick, ignoring the
`originalFile` the wizard posts (fileId 1, "article.pdf"). The first pick
is still a revision because the wizard's own request to delete it is
refused (A14: the page script posts `id=`, not `submissionFileId=`), which
was harmless before. Live-probed 2026-09-27 at ojs `72b85f4ba0`, omp
`3cd59e9443`, ops `e2111e3aae`: as an Editor on "Submission Files" (OJS,
OMP), "article.pdf" revised with "rev-one.pdf", then "rev-two.pdf" picked on
step 1, then "Cancel" (`status:true`): the files API read fileId 2
"rev-one.pdf" uploaded by the Editor instead of fileId 1 "article.pdf" by
the Author, and Activity Log & Notes kept "A file revision "rev-one.pdf" was
uploaded for submission 1 by …" with a "Download" answering 200; OPS's "PDF"
galley read "rev-a.pdf" instead of "preprint.pdf". Live-probed 2026-09-27
on a journal's galley "Change File" (OJS, `MODE=s1g`): before, fileId 7
"article.pdf"; after "rev-a.pdf", then "rev-b.pdf", then "Cancel"
(`status:true`), fileId 8 "rev-a.pdf", the first pick. Held on a freshly
reset OJS the same day; with
lib/pkp at `1ad4a14bb2`, before the change, on a reset database, the same
steps restored fileId 1 "article.pdf". Kept check
`shared/playwright/checks/sync/pkp-lib-13288/cancel-picks.js` (`MODE=s1`,
`MODE=s1g` for a galley). Written up for the team in
`docs/reports/2026-09-27-pkp-lib-13288.md` (Finding 1; a temporary report,
deleted once addressed; git history keeps it).

<a id="fn-a24"></a>
**f-a24** — Introduced by pkp/pkp-lib#13288 (issue #13286, merge
`f38c4a4a10`, 2026-09-27; note s): the second window's upload writes the one
session key per file with the first window's upload as "the original".
Cancelled first, the first window's cancel is refused because its upload is
no longer the file's current one; cancelled second, it finds no key (the
second window's cancel removed it). Either way it answers
`{"status":false,"content":""}` and the page shows nothing. Live-probed
2026-09-27 (OJS and OMP, one run each; the Journal Manager): window A
uploaded "rev-A.pdf", window B then "rev-B.pdf"; "Cancel" in A answered
`status:false` and A stayed open; a second press closed it without a
request, the list reading "rev-B.pdf"; "Cancel" in B (`status:true`)
closed B and the list read "rev-A.pdf", with its revision line and
"Download" in the Activity Log and the file's "History". The reverse order
on OJS (an Editor; "rev-a.pdf" then "rev-b.pdf"; B cancelled first,
`status:true`, the list reading "rev-a.pdf"; then A, `status:false`, the
window staying open) held on a freshly reset OJS the same day and left
"rev-a.pdf" with its "A file revision "rev-a.pdf" was uploaded …" line and
"Download". With lib/pkp at `1ad4a14bb2`, before the change, on a reset
database, both cancels answered `status:true` and restored "article.pdf".
Not driven on a galley or on a preprint server. Kept check
`shared/playwright/checks/sync/pkp-lib-13288/cancel-picks.js` (`MODE=s2`).
Written up for the team in `docs/reports/2026-09-27-pkp-lib-13288.md`
(Finding 2; a temporary report, deleted once addressed; git history keeps
it).

<a id="fn-a25"></a>
**f-a25** — Note k. The row's "Cancel upload" (`FileUploader.vue`
`cancelUpload()`, Dropzone `removeFile()`) only aborts the browser's
request and drops the row; nothing is sent to the server, and the row's id
is Dropzone's, not a submission file id. `PKPSubmissionFileController::add()`
runs once the server holds the whole request body and stores the file
before it writes any output, so a request abandoned after its last byte is
stored anyway. Live-probed 2026-09-28 (Rule 17a; OJS and OMP; a throwaway
Author's draft on a scratch journal or press; "article.pdf", a 636-byte
request): with the answer slowed to 64 bytes/s and the request leaving at
once, "Cancel upload" pressed as the upload reached 636 of 636, the row
reading "article.pdf" with its bar and "Cancel upload": the row went, and
after a reload the panel listed "article.pdf" with "Edit", "Remove" and
"What kind of file is this?" (OJS 3 of 3, OMP 2 of 2); with no throttle,
pressed 40–50 ms after the upload started, the file was already stored
(OJS 4 of 4). No request answered an error and no page error. Pressed while
the request was still held back (the upload throttled to 64 bytes/s and
kept so until after the reload), nothing was stored (OJS 10 of 10, OMP 6
of 6). Under an emulated upload throttle the bar fills before the request
has left the browser, so there a full bar does not mean the file was sent.
Scenario 9 presses mid-upload; no test drives the window after the last
byte.

<a id="fn-ops1"></a>
**f-ops1** — Note a (the OPS workflow and wizard configs). Live-probed
2026-09-23 (OPS): the manager's and the Moderator's workflow shows Production
only, with discussions and participants; the typed stage addresses land there;
no "Upload/Select Files" anywhere; the wizard's first step holds the galley
list; the Roles grid has the one stage column "Production". The
production-stage spec's OPS1 records the missing "Production Ready Files" list
live.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Workflow file lists ("Submission Files", "Files for Review", "Revisions Uploaded", "Draft Files", "Copyedited Files", "Production Ready Files") | `{journal}/dashboard/editorial?workflowSubmissionId={id}` › a stage | VUE-038 · AFFW-474 · AFFW-476 · AFFW-478 |
| "Upload/Select Files" button and window | above "Files for Review", "Draft Files", "Copyedited Files" | AFFW-475 · AFFW-609 · AFFW-610 · AFFW-611 · AFFW-614 · GRID-031 |
| Per-row select box (a decision's file pickers, the composer's "Attach Files") | owned by *Editorial decision recording* | AFFW-477 · AFFW-145 |
| Row menu: "Update File Details", "More Information", "Delete" and its dialog | a list row's "More Actions" | AFFW-480 · AFFW-481 · AFFW-482 · AFFW-483 |
| Row menu: "Send to Text Editor" | a list row, importable file | AFFW-479 (rider; mechanism *JATS & Body Text*) |
| "Edit a file" window (Vue form in a legacy modal) | row › "Update File Details" | AFFW-484 · VUE-053 · GRID-002 |
| Upload wizard: tabs, buttons, step 1 form, revise and component selects, anonymizing link, upload widget, "Review Details", dependent files, "Add Another File" | "Upload" on a list; "Upload File" in a window; a galley's "Change File" | AFFW-586 · AFFW-587 · AFFW-588 · AFFW-589 · AFFW-590 · AFFW-591 · AFFW-592 · AFFW-593 · AFFW-595 · AFFW-596 · AFFW-485 · AFFW-597 · AFFW-598 · GRID-066 |
| Revision-only wizard with no file to revise ("There are no files for you to revise at this time.") | only the pending-revisions notice's own upload link, which no current screen was found to render (UNASSIGNED) | AFFW-594 |
| Dependent files list | step 2 / "Edit a file" of an HTML or XML file | GRID-016 · GRID-017 |
| Older file lists' search | dependent files list; the reviewer's lists | AFFW-613 · GRID-035 · GRID-018 |
| "More Information" window (History, Notes) | row › "More Information"; a galley's row | AFFW-481 (window: legacy information center) |
| Downloads (one file, all files) | a file's name; "Download All Files" | GRID-001 |
| Submission wizard "Files" panel | `{journal}/submission?id={id}` › "Upload Files" | AFFW-133 · AFFW-134 · AFFW-135 · AFFW-136 · AFFW-137 · AFFW-138 · AFFW-139 · AFFW-140 · AFFW-141 · AFFW-142 · AFFW-143 · AFFW-144 · VUE-100 |
| Submission files API (the lists, the panel) | `{journal}/api/v1/submissions/{id}/files` | API-043 |
| Temporary-file upload (other features' upload boxes: the composer, discussions, settings images) | `{journal}/api/v1/temporaryFiles` | API-045 (waived: no submission-file surface of this feature uses it) |
| "Edit Metadata" tab of a proof file | no screen on a journal or preprint server; OMP publication formats only (UNASSIGNED) | AFFW-599 |
| "Select proof files" window | OMP publication formats only (UNASSIGNED, the production-stage entry) | AFFW-612 |
| Submission file record (name, component, summary of changes, supplementary and artwork metadata) | the forms above | SET-026 |

## Reference — code anchors

- Vue file manager: `lib/ui-library/src/managers/FileManager/` (`FileManager.vue`, `fileManagerStore.js`, `useFileManagerConfig.js`, `useFileManagerActions.js`, `FileManagerCell*.vue`, `FileManagerActionButton.vue`, `modals/FileMetadataForm.vue`, `modals/useFileMetadataForm.js`); mounts in `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfig{Editorial,Author}{OJS,OMP,OPS}.js`; `components/FileAttacher/FileAttacherWorkflowStage.vue` (the `*_SELECT` namespaces); `managers/ReviewerManager/useReviewDetailsForm.js` (`REVIEWER_ATTACHMENT_FILES`, read-only).
- Submission wizard panel: `lib/ui-library/src/components/ListPanel/submissionFiles/` (`SubmissionFilesListPanel.vue`, `SubmissionFilesListItem.vue`, `SubmissionFilesEditModal.vue`, `SelectSubmissionFileListItem.vue`), `components/FileUploader/FileUploader.vue`; `lib/pkp/pages/submission/PKPSubmissionHandler.php` (`getFilesStep()`, `getSubmissionFilesListPanel()`), `lib/pkp/classes/components/forms/submission/PKPSubmissionFileForm.php`, `lib/pkp/templates/submission/review-files.tpl`; OPS `pages/submission/SubmissionHandler.php::getFilesStep()`.
- Upload wizard: `lib/pkp/controllers/wizard/fileUpload/FileUploadWizardHandler.php` (`uploadFile`, `getOriginalFileSessionKey`), `form/PKPSubmissionFilesUploadBaseForm.php`, `form/SubmissionFilesUploadForm.php`, `form/SubmissionFilesMetadataForm.php`; templates `lib/pkp/templates/controllers/wizard/fileUpload/{fileUploadWizard,form/fileUploadForm,form/submissionFileMetadataForm,form/fileSubmissionComplete}.tpl`, `controllers/fileUploadContainer.tpl`; JS `lib/pkp/js/controllers/wizard/{WizardHandler,fileUpload/FileUploadWizardHandler,fileUpload/form/FileUploadFormHandler}.js`, `js/controllers/UploaderHandler.js`.
- File operations: `lib/pkp/controllers/api/file/PKPManageFileApiHandler.php` (`deleteFile`, `cancelFileUpload`, `editMetadata`, `editMetadataTab`, `saveMetadata`) and each app's `controllers/api/file/ManageFileApiHandler.php` (OJS, OPS: identifiers ops only; OMP: also `editMetadata` for proof files and `getUpdateNotifications()` adding internal revisions); `lib/pkp/controllers/api/file/FileApiHandler.php`; link actions under `lib/pkp/controllers/api/file/linkAction/`.
- More Information: `lib/pkp/controllers/informationCenter/{InformationCenterHandler,FileInformationCenterHandler}.php`, `form/{NewNoteForm,NewFileNoteForm}.php`; `lib/pkp/controllers/grid/eventLog/{SubmissionEventLogGridHandler,SubmissionFileEventLogGridHandler,EventLogGridRow,EventLogGridCellProvider}.php`; templates `lib/pkp/templates/controllers/informationCenter/*.tpl`, `controllers/grid/eventLog/eventLogGridFilter.tpl`.
- Legacy grids: `lib/pkp/controllers/grid/files/` (`SubmissionFilesGridHandler`, `SelectableSubmissionFileListCategoryGridHandler`, `SubmissionFilesGridRow`, `FileNameGridColumn`, `dependent/`, `fileList/`, `review/ManageReviewFilesGridHandler`, `final/ManageFinalDraftFilesGridHandler`, `copyedit/ManageCopyeditFilesGridHandler`, `form/ManageSubmissionFilesForm`), `lib/pkp/templates/controllers/grid/files/*.tpl`.
- Model, access and API: `lib/pkp/classes/submissionFile/Repository.php` (`add`, `edit`, `copy`, `delete`, `deleteRevisionLogEntries`, `getAssignedFileStages`, `supportsDependentFiles`, `getRevisions`), `lib/pkp/classes/security/authorization/SubmissionFileAccessPolicy.php`, `internal/SubmissionFileStageAccessPolicy.php`, `lib/pkp/api/v1/submissions/PKPSubmissionFileController.php`, `lib/pkp/api/v1/temporaryFiles/PKPTemporaryFilesController.php`, `lib/pkp/schemas/submissionFile.json` (OMP overlay `schemas/submissionFile.json`, `chapterId`).
- Components: `registry/genres.xml` per app, `lib/pkp/classes/submission/GenreDAO.php`, `lib/pkp/controllers/grid/settings/genre/`.
- Galleys' entries: `lib/ui-library/src/managers/GalleyManager/useGalleyManager{Config,Actions}.js`.
