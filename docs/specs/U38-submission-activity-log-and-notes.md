---
name: submission-activity-log-and-notes
status: verified
---

# Submission activity log & notes

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Editors need to know what has happened to a submission and who did it,
and they need a place for remarks meant for each other only. The button
**"Activity Log"** in the workflow screen's header opens a window titled
"Activity Log & Notes" with two tabs. **"History"** is the submission's
permanent record: one line per event (a decision, an assignment, a file
uploaded, an email sent), each with its date and the person who acted,
and for an email the full text as it was sent. **"Notes"** holds short
internal notes the editors write on the submission; the Author, the
reviewers and the assistant roles never see them. <sup>a</sup>

This spec owns the window, how its lines read, the email and file
lines, and the notes. Every other line is written by an action on
another feature's screen, and that feature's spec quotes its wording
(Rule 3). <sup>p</sup>

Two neighbouring records are not this window: a file's own "History"
and "Notes" in its "More Information" window
([→ Submission files](U36-submission-files.md#more-information)), and
a discussion's own "History"
([→ Tasks & discussions](U37-tasks-and-discussions.md#history)). On a
journal or a press {OJS OMP} the Author re-reads the emails editors
sent them on their own "Notifications" list on the review stage, not
here ([→ the author's letters](U26-review-stage-and-rounds.md#author-emails)).
A preprint server's Author has no such list: a decision email such as
"Your submission has been declined" is listed on the editors' "History"
and nowhere in the Author's view. <sup>a</sup>

## Actors & permissions

Who is offered the header's "Activity Log" button is the workflow
screen's rule ([→ Workflow screen & stage access](U24-workflow-screen-and-stage-access.md),
its Actors row "Activity Log"). In the rows below, the **editorial
readers** are the people it is offered to: the manager-level roles (a
Journal Manager, and on a journal or a press {OJS OMP} an Editor and a
Production editor), and an assigned Section Editor or an assigned Guest
Editor {OJS} (a press has no Guest Editor). Each is a reader while the
header offers them the button. Nothing inside
the window depends on the stage the submission is in. <sup>b</sup>

A Site Administrator is an editorial reader through a manager or
editor role in the journal. The rows below also name an administrator
whose journal roles are all assistant roles (a Copyeditor, say; on a
preprint server an Editorial Board Member). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open "Activity Log & Notes"** (the header's "Activity Log"; Rule 1) | • The editorial readers<br>• A Site Administrator whose journal roles are all assistant roles: yes ([A4](#a4))<br>• Assistant roles (Copyeditor, Layout Editor, Proofreader, Funding Coordinator and the others), Author, Reviewer, Reader: never; their header has no "Activity Log"<br>• A Site Administrator whose only journal role is Reader: never; the submission does not open for them (an "Error" window reading "The current role does not have access to this operation." over an empty workflow screen with no header buttons) <sup>b</sup> <sup>c</sup> |
| **Read "History"**, with its "Download" and "View Email" (Rules 2–9) | • Every editorial reader. One who is also an author of the submission reads it with the reviewers of anonymous reviews hidden (Rule 9)<br>• A Site Administrator whose journal roles are all assistant roles: no; the window shows the "Notes" tab alone ⚠ [A4](#a4) <sup>c</sup> |
| **"View changes"** {OJS OMP} (a review line's action; Rule 5) | • The editorial readers, except one who is also an author of the submission (Rule 9). The window it opens is [→ Reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review)'s <sup>f</sup> |
| **Add a note** ("Notes"; Rule 10a) | • Everyone the window opens for, the Site Administrator with assistant roles included <sup>d</sup> |
| **Delete a note** ("Notes"; Rule 10c) | • Every editorial reader, on any note, whoever wrote it<br>• A Site Administrator whose journal roles are all assistant roles: no "Delete" on any note, their own included ([A4](#a4)) <sup>d</sup> |

## Fields & validation

**"Notes" tab** (Rule 10). <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Add Note" | No | A text box headed "Add Note", with a button "Add Note" under it. The window shows no length limit. An empty box is accepted ⚠ [A2](#a2). How the text shows is Rule 10a. <sup>d</sup> |

"History" has no fields: no search, no filter and no pages (Rule 2).
<sup>e</sup>

## Rules & state

<a id="window"></a>
1. **The window.** "Activity Log" opens a window titled "Activity Log &
   Notes" over the workflow screen, with the tabs "History" and "Notes",
   in that order. It opens on "History". Closing it ("Close", or the
   Escape key) returns to the workflow screen as it was; text typed in
   "Add Note" is Rule 10d. <sup>a</sup> <sup>b</sup>
   - 1a. **Loading.** Each tab shows a loading indicator until its
     contents arrive, then the table or the list. <sup>td1</sup>
   - 1b. **Each switch reloads the tab.** A note just posted shows as a
     "Posted new note." line when "History" is opened again from the
     tab, without closing the window. <sup>td2</sup>

<a id="history"></a>
2. **"History".** A table with the columns "Date", "User" and "Event",
   one row per line, newest first. It lists every line the submission
   has, with no search, filter or pages. "Date" shows the day alone, in
   the journal's "Date (Short)" format (Settings bullet 1); lines written
   within the same second have no fixed order among them. A submission
   has lines from its first save: one just begun with "Begin Submission"
   already lists two "Submission metadata updated" lines. <sup>e</sup>
   <sup>td3</sup>

<a id="what-is-logged"></a>
3. **What the log records.** Every line is written by an action taken
   elsewhere, at the moment it is taken; nothing in the window adds a
   line except a note (Rule 10a). Which spec quotes the wording of each
   family of lines: <sup>g</sup>

   | Lines about | For example | Wording stated in |
   |---|---|---|
   | Submitting | "Article submitted" ("Initial submission completed." on a press, "Preprint submitted" on a preprint server), under the Author who pressed "Submit" in the [Submission wizard](U21-submission-wizard.md) | this spec: the three wordings quoted here <sup>g</sup> |
   | Decisions and recommendations | "{editor} declined this submission.", "An email about the decision was sent to {n} reviewer(s) with the subject {subject}." | [Editorial decision recording](U34-editorial-decision-recording.md#email-page) <sup>g</sup> |
   | Participants | "{name} ({username}) was assigned to this submission as a {role}.", "Notification sent to users." | [Stage participants](U35-stage-participants.md#assignment) <sup>g</sup> |
   | Reviewers and reviews {OJS OMP} | the request, reminders, the reviewer's answer, completion, "The following was modified in this review: Comments." | [Reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review), [Reviewer's review](U28-reviewers-review.md) <sup>g</sup> |
   | Publishing and versions | "The submission was published." ("The submission was posted." on a preprint server), "A new version was created." (with a "Submission metadata updated" line from the same act) | [Publish, schedule & versions](U49-publish-schedule-and-versions.md) <sup>g</sup> |
   | Metadata | "Submission metadata updated" | [Publication metadata](U40-publication-metadata.md), [Contributors & affiliations](U41-contributors-and-affiliations.md) <sup>g</sup> |
   | Files | uploads, revisions, edits, deletions | this spec, Rule 6 <sup>g</sup> |
   | Emails | "An email has been sent: {subject}" | this spec, Rule 7 <sup>g</sup> |
   | Notes | "Posted new note." | this spec, Rule 10a <sup>g</sup> |
   | Publication formats {OMP} | "The publication format "{name}" is made available." | this spec, Rule 11 <sup>g</sup> |

   A discussion's own events (started, completed, closed) stay in its
   History and never reach this log; its emails and attached files do
   (Rules 6, 7). <sup>g</sup>

<a id="user-column"></a>
4. **The "User" column.** <sup>h</sup> <sup>i</sup>
   - 4a. **Event lines** name the person who acted. The participant lines
     are the exception
     ([→ Stage participants' A14](U35-stage-participants.md#a14)).
     <sup>h</sup>
   - 4b. **Under "Login As".** An event line written while someone acts
     as another person through "Login As"
     ([→ who may impersonate whom](U01-login-and-sessions.md#who-may-impersonate))
     reads "{the person signed in} (acting as {the person acted as})"
     under "User". This holds for every event line, notes and file lines
     included. <sup>h</sup>
   - 4c. **Email lines** name the sender when a person sent the email
     from a window of their own: a decision's email, a reviewer's
     request, reminder or thanks, the reviewer's own answer, the
     "Revised Version Uploaded" email. The column is empty for the
     emails the journal sends by itself: the submission acknowledgement,
     "needs an editor", the editor assigned automatically at submission,
     and the automatic review reminders (read from the code, not a
     tester's check: test installs never send them, so no screen shows
     their line). It is empty as well for a discussion's emails and for
     the Participants panel's "Notify" and "Assign" messages, although a
     person sent them ⚠ [A1](#a1).
     <sup>i</sup> <sup>td4</sup>
     - The "Review complete" email {OJS OMP} is also one the journal
       sends by itself, when a Reviewer submits a review, yet its line
       names the editor who received it under "User" ⚠ [A5](#a5).
       <sup>i</sup>

<a id="row-actions"></a>
5. **Row actions.** A line with an action starts with an arrow at its
   left (a screen reader reads "Settings"). Pressing the arrow opens a
   strip under the line holding the action: "Download" on a file's
   upload or revision line (Rule 6a), "View Email" on an email line
   (Rule 7), "View changes" on a review-change line (Actors row 3).
   Other lines have no arrow. <sup>f</sup>

<a id="file-lines"></a>
6. **File lines.** Each change to a submission file adds a line naming
   the file by the name it had at that moment: <sup>j</sup>
   - a new file: "Revision "{file name}" was uploaded for file
     {number}.", worded as a revision
     ([→ Submission files' A22](U36-submission-files.md#a22));
   - a revision of a file: "A file revision "{file name}" was uploaded
     for submission {number} by {username}.";
   - a save of the file's details, the upload wizard's "2. Review
     Details" step included: "The metadata for file "{file name}" was
     edited by {username}.", so an upload through the wizard adds two
     lines;
   - a deletion: "A file "{file name}" was deleted for submission
     {number} by {username}.".

   A file copied into another list through "Upload/Select Files", and a
   file attached to a discussion's message, count as new files.
   <sup>j</sup> <sup>td5</sup>
   - 6a. **"Download".** A new-file or revision line offers "Download",
     which fetches the version that line records, under the name it had
     then. A line whose file has since been deleted keeps its text and
     loses its arrow; so does a discussion's file line once the
     discussion is deleted. <sup>j</sup> <sup>td6</sup>
   - 6b. **A revision keeps its line.** Uploading a revision of a file
     adds the revision line to this log as well as to the file's own
     "History", with its own "Download". <sup>k</sup> <sup>td7</sup>
   - 6c. **A cancelled revision leaves no line.** A revision uploaded
     in the upload wizard and then cancelled with "Cancel", at any step,
     leaves the file list as before
     ([→ Submission files](U36-submission-files.md#cancel-restore)), and
     neither this log nor the file's own "History" keeps a line of it,
     its metadata line included. A galley's "Change File" {OJS OPS}
     cancelled: the same. <sup>j</sup> <sup>td7</sup>
     - When "History" was opened in a second browser window between
       the upload and "Cancel" at step 1, that window still lists the
       line "A file revision …", with its arrow, until reopened. Its
       "Download" then leaves the workflow for a page reading
       "404 Not Found". <sup>td7</sup>

<a id="email-lines"></a>
7. **Email lines.** Each email the workflow sends about the submission
   adds the line "An email has been sent: {subject}". An email sent to
   each recipient separately (a discussion's, for one) adds one line per
   recipient. "View Email" opens a window titled "View Email" holding
   "From: "{name}" <{address}>", "To: "{name}" <{address}>", "CC:
   {address}" and "BCC: {address}" (only when the email had them,
   addresses only), "Subject: …", and under them the body as it was
   sent, without the footer the journal adds to the recipient's copy.
   Attached files are not listed. <sup>i</sup> <sup>td8</sup>

8. **Language.** Each event line is worded in the interface language of
   the person reading it, not of the person who acted; an email's
   subject stays as it was sent. <sup>l</sup> <sup>td9</sup>
   - 8a. **File lines in another language.** Read in French (Canada),
     the file lines written while the person acting worked in English
     print an empty file name: "La révision « » a été
     téléversée pour le fichier 12." and "Les métadonnées du fichier « »
     ont été modifiées par {username}.", where an English reader of the
     same lines reads "Revision "article.pdf" was uploaded for file 12."
     and "The metadata for file "article.pdf" was edited by {username}."
     ⚠ [A7](#a7). <sup>l</sup>

<a id="author-editor"></a>
9. **An editorial reader who is also an author** {OJS OMP}. When the
   reader is assigned to the submission as its author as well, the
   log hides the reviewers of reviews whose review type is not "Open":
   <sup>m</sup> <sup>td10</sup>
   - a reviewer's acceptance and decline lines read "Anonymous Reviewer"
     under "User", and reviewer names inside event texts read
     "Anonymous Reviewer";
   - a file a reviewer uploaded has its line read "Anonymous Reviewer",
     with no file name and no "Download";
   - review-change lines offer no "View changes", whatever the review
     type;
   - the line of an editor's "Revert Decision" ("{editor} has marked the
     round {n} review for submission {number} as unconsidered.") reads
     "Anonymous Reviewer" under "User", whatever the review type.

   An "Open" review's other lines read as for any editorial reader,
   except its assignment line ("{reviewer} has been assigned to review
   submission {number} for review round {n}."), which reads "Anonymous
   Reviewer" whatever the review type ⚠ [A8](#a8). A preprint server
   has no reviews. <sup>m</sup>

<a id="notes"></a>
10. **"Notes".** The tab lists the submission's notes, oldest first,
    each with its writer's full name, its date and time in the journal's
    "Date & Time (Short)" format (Settings bullet 2), its text and, for
    the people Actors row 5 names, a "Delete" button. A submission with
    no note reads "There are no notes to display.". Under the list sits
    the "Add Note" box and button. These are the submission's notes only:
    a file's notes and a discussion's messages are not listed here.
    A note posted while someone acts as another person through "Login
    As" is listed under the name of the person acted as; its "History"
    line reads "{the person signed in} (acting as {the person acted
    as})" (Rule 4b). <sup>d</sup>
    - 10a. **Adding.** "Add Note" saves the text as a new note: the
      message "Note posted." appears, the note joins the bottom of the
      list, the box empties, and "History" gains "Posted new note."
      under the writer's name. With the box empty, "Add Note" posts a
      note with no text all the same ⚠ [A2](#a2). Line breaks typed in
      the box are not kept, so the text shows in one run. Tags are
      applied rather than shown: "<b>bold</b>" shows the word bold in
      bold type. <sup>d</sup> <sup>td11</sup>
    - 10b. **A tall note.** A note taller than about eight lines on
      screen (some 1,500 characters and more) shows cut short with a
      "Read More" button under it; pressing it shows the whole note and
      the button goes. A note typed on many short lines shows as one run
      (Rule 10a) and gets no button; nor does a short note. <sup>n</sup>
      <sup>td12</sup>
    - 10c. **Deleting.** "Delete" opens a dialog titled "Confirm" asking
      "Are you sure you wish to delete this note?" with "OK" and
      "Cancel". "OK" removes the note with the message "Note deleted.";
      "Cancel" keeps it. The "Posted new note." line stays on "History",
      and the deletion adds no line. <sup>d</sup>
    - 10d. **Text not added.** With text typed in the box and not added:
      <sup>td13</sup>
      - Switching to "History" asks "The data on this form has changed.
        Do you wish to continue without saving?". "Cancel" keeps "Notes"
        and the text; "OK" opens "History", and the box is empty on the
        way back. This holds with notes or without.
      - After "OK" on that switch, on a submission with no note, pressing
        "Close" on "History" asks the same question again, although the
        switch already discarded the text ⚠ [A10](#a10). "Cancel" keeps
        the window on "History"; "OK" closes it, and the next page reload
        asks nothing. Opening "Notes" again before "Close" ends this: the
        window then closes without asking.
      - Closing the window ("Close", or Escape while the cursor is not
        in the box) asks the same question while the submission has no
        note: "Cancel" keeps the window and the text, "OK" closes it and
        the text is gone. Once the submission has a note, closing drops
        the text at once, without asking ⚠ [A3](#a3). After such a
        close, the next page change or reload asks the browser's "Leave
        site?" although nothing is typed ⚠ [A9](#a9).
      - Escape pressed while typing in the box does nothing.
      - Going to another page asks the browser's own "Leave site?":
        staying keeps the window and the text, leaving drops the text.
        This holds with notes or without.

11. **Publication formats** {OMP}. Creating, deleting, approving and
    making available a publication format each add a line naming the
    format: "The publication format "{name}" is made available.", "…is
    no longer available.", "…is approved for publication.", "…is no
    longer published.". The lines for a new format and a deleted one
    print "The publication format "{$formatName}" was created." and
    "…was removed." with the placeholder unfilled ⚠ [OMP1](#omp1).
    <sup>o</sup>

## Side effects

- **Posting a note** adds "Posted new note." to "History" under the
  writer's name (Rule 10a) and shows "Note posted.". Nobody is emailed,
  no Tasks row is raised, and nothing reaches the Author. <sup>d</sup>
- **Deleting a note** shows "Note deleted." and adds no line (Rule 10c).
  <sup>d</sup>
- **Opening the window, "Download" and "View Email"** add no line and
  send nothing. <sup>f</sup>

## Settings that modify behavior

- **"Date (Short)"** (Settings › Website › Setup › "Date & Time"; install
  default the year-month-day form, "2026-09-23"). The "Date" column of
  "History" prints each day in the chosen form (Rule 2). <sup>e</sup>
- **"Date & Time (Short)"** (the same tab; install default "2026-09-23
  11:55 AM"). Each note prints its date and time in the chosen form
  (Rule 10). <sup>d</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md)*:
  the header's "Activity Log" button and who is offered it. <sup>b</sup>
- *[Submission files](U36-submission-files.md#more-information)*: a
  file's own "More Information" window, with its "History" ("Show events
  from prior versions" included) and "Notes" ("Earlier Revision Notes"
  included); the actions whose lines Rule 6 states. <sup>j</sup>
- *[Tasks & discussions](U37-tasks-and-discussions.md#history)*: a
  discussion's own "History"; the discussion emails and attached files
  whose lines Rules 6 and 7 state. <sup>g</sup>
- *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review)*
  {OJS OMP}: the "View changes" window and the review lines. <sup>f</sup>
- *[Login and sessions](U01-login-and-sessions.md#who-may-impersonate)*:
  "Login As", whose lines Rule 4b states. <sup>h</sup>
- *[Review stage & rounds](U26-review-stage-and-rounds.md#author-emails)*
  {OJS OMP}: the Author's "Notifications" list of the emails sent to
  them. <sup>a</sup>
- The specs in Rule 3's table: the wording of each family of lines.
  <sup>g</sup>

## Canonical scenarios

Scenarios 1 to 3 run on the seeded journal with ready accounts, each on
a submission seeded for it; scenario 4, about a person who is both
author and editor, runs on two scratch journals with throwaway
accounts. The accounts, the passwords and the tooling recipe are in the
footnote. <sup>s0</sup>

1. **A note posted, read on "History" and deleted**

   Given: Journal Manager, on a submission its Author submitted, with a
   Section Editor assigned and no note.

   - **The window**: press "Activity Log" in the header: a window titled
     "Activity Log & Notes" opens on "History", the first of its two tabs,
     "History" and "Notes"; "History" is a table with the columns "Date",
     "User" and "Event", newest first, whose lines include "Article
     submitted" ("Initial submission completed." on a press, "Preprint
     submitted" on a preprint server), and each "Date" reads a day alone
     in year-month-day form, such as "2026-09-24"; press Escape: the
     window closes and the workflow screen is as it was (Rules 1, 2, 3;
     Settings bullet 1).
   - **"Notes" with no note**: press "Activity Log" again and select
     "Notes": the tab reads "There are no notes to display.", with the
     "Add Note" box and the "Add Note" button under it (Rule 10).
   - **Text not added, then "Close"**: type "Draft remark." in the box and
     press "Close": the window asks "The data on this form has changed. Do
     you wish to continue without saving?"; press "Cancel": the window
     stays, with "Draft remark." in the box; press "Close" again, then
     "OK": the window closes; press "Activity Log" and select "Notes": the
     box is empty and the tab still reads "There are no notes to display."
     (Rules 1, 10d).
   - **Posting a note**: type "Checked the figures." in the box and press
     "Add Note": the message "Note posted." appears, the note is listed
     with the Journal Manager's full name, its date and time in the form
     "2026-09-24 10:52 PM", its text and a "Delete" button, and the box is
     empty (Rules 10, 10a; Settings bullet 2).
   - **The note on "History"**: select "History" without closing the
     window: its top line reads "Posted new note." under the Journal
     Manager's name (Rules 1b, 10a; Side effects).
   - **The Section Editor's "Delete"**: Section Editor: open the
     submission and press "Activity Log": "History" lists "Posted new
     note." under the Journal Manager's name; select "Notes": "Checked
     the figures." is listed under the Journal Manager's name with
     "Delete"; press "Delete": a dialog titled "Confirm" asks "Are you sure
     you wish to delete this note?" with "OK" and "Cancel"; press "Cancel":
     the note stays; press "Delete" again, then "OK": the message "Note
     deleted." appears and the tab reads "There are no notes to display."
     (Actors row 5; Rule 10c).
   - **The line kept**: select "History": it holds the same lines as when
     the Section Editor opened it, "Posted new note." among them, and none
     for the deletion (Rule 10c; Side effects).
   - **Under "Login As"**: Site Administrator: use "Login As" on the
     Section Editor ([→ who may impersonate whom](U01-login-and-sessions.md#who-may-impersonate)),
     open the submission, press "Activity Log" and select "Notes"; type
     "Posted while acting." and press "Add Note": the note is listed under
     the Section Editor's full name; select "History": its top line reads
     "Posted new note." under "{the Site Administrator's full name}
     (acting as {the Section Editor's full name})" (Rules 4b, 10).
   - **The Journal Manager's "Delete"**: Journal Manager: press "Activity
     Log" and select "Notes": "Posted while acting." is listed under the
     Section Editor's name with "Delete"; press "Delete", then "OK": "Note
     deleted." appears; "History" still lists both "Posted new note."
     lines (Actors row 5; Rule 10c).
   - **Control**: on "History", the older "Posted new note." line, from
     "Checked the figures.", reads the Journal Manager's name alone, with
     no "(acting as …)" (Rules 4a, 4b).

2. **An email line and "View Email"**

   Given: Journal Manager, on a submission its Author submitted, awaiting
   a decision on its first stage (on a preprint server, Production).

   - **The decision**: press "Decline Submission" and record the decision
     with its email to the Author as the email page offers it, noting the
     page's "Subject:" ([→ the email page](U34-editorial-decision-recording.md#email-page)).
   - **The lines, the sender named**: press "Activity Log": "History"
     lists "{the Journal Manager's name} declined this submission." and
     "An email has been sent: {that subject}", both with the Journal
     Manager's name under "User" (Rules 3, 4a, 4c, 7).
   - **The arrow**: the email line starts with an arrow at its left; press
     it: a strip opens under the line holding "View Email"; the line
     "{the Journal Manager's name} declined this submission." has no arrow
     (Rule 5).
   - **"View Email"**: press it: a window titled "View Email" holds "From:
     "{the Journal Manager's full name}" <{their address}>", "To: "{the
     Author's full name}" <{their address}>" and "Subject: {that
     subject}", and under them the letter the email page held (Rule 7).
   - **Control**: close "View Email", select "Notes", then "History": the
     table holds the same lines as before, with none added for opening the
     window or "View Email" (Side effects).

3. **File lines and "Download"** {OJS OMP}

   Given: Journal Manager, on a submission whose "Submission Files" list
   holds "article.pdf", uploaded by its Author.

   - **The upload's line**: press "Activity Log": "History" lists
     "Revision "article.pdf" was uploaded for file {the file's number}.",
     starting with an arrow; press it, then "Download": "article.pdf"
     downloads (Rules 5, 6, 6a).
   - **A revision**: close the window; revise "article.pdf" with
     "notes.md" through "Upload" on "Submission Files"
     ([→ revising a file](U36-submission-files.md#revise)): "Continue" on
     "2. Review Details", then "Complete" closes the wizard; press
     "Activity Log": "History" gains "A file revision "notes.md" was
     uploaded for submission {number} by {the Journal Manager's
     username}." and "The metadata for file "notes.md" was edited by {the
     Journal Manager's username}." (Rule 6).
   - **Each version's "Download"**: the revision line starts with an
     arrow, and its "Download" downloads "notes.md"; the upload line's
     "Download" still downloads "article.pdf", under that name (Rules 6a,
     6b).
   - **The file's own "History"**: close the window and open "More
     Actions" › "More Information" on "notes.md"
     ([→ Submission files](U36-submission-files.md#more-information)):
     its "History" lists the same revision line, with its own arrow and
     "Download" (Rule 6b).
   - **The deletion**: close that window, delete the file from
     "Submission Files" ("Delete", then "OK";
     [→ deleting](U36-submission-files.md#delete)) and press "Activity
     Log": "History" gains "A file "notes.md" was deleted for submission
     {number} by {the Journal Manager's username}."; the upload line and
     the revision line keep their text and no longer start with an arrow
     (Rules 6, 6a).
   - **Control**: the line "The metadata for file "notes.md" was edited
     by {the Journal Manager's username}." has no arrow, before the
     deletion as after it: only upload and revision lines offer
     "Download" (Rule 5).

   A preprint server has no "Submission Files" list
   ([→ Submission files](U36-submission-files.md#file-lists)).

4. **An editor who is also the author** {OJS OMP}

   Given: a person holding the Author and Section Editor roles, who
   submitted the submission and is assigned to it as its Section Editor,
   on a scratch journal whose review type is "Anonymous
   Reviewer/Anonymous Author", with a review round where one Reviewer
   accepted and another declined.

   - **The author-editor's "History"**: press "Activity Log": the lines
     recording the one Reviewer's acceptance and the other's decline
     read "Anonymous Reviewer" under "User"; the assignment lines read
     "Anonymous Reviewer has been assigned to review submission {number}
     for review round 1."; no line names either Reviewer (Rule 9).
   - **An "Open" review**: the same state on a second scratch journal,
     whose review type is "Open", read by its author-editor: the acceptance
     and decline lines name the Reviewer under "User", and the assignment
     lines still read "Anonymous Reviewer has been assigned to review
     submission {number} for review round 1." [A8](#a8) (Rule 9).
   - **Control**: Journal Manager, on the first journal's submission: the
     acceptance and decline lines name the Reviewer under "User", and the
     assignment lines read "{the Reviewer's name} has been assigned to
     review submission {number} for review round 1." (Rules 4a, 9).

   A preprint server has no reviews (Rule 9).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - "Add Note" with the box empty in "Activity Log & Notes": refused, no note listed and no "Posted new note." line in "History" ([A2](#a2)): the guard the issue report proposes
  - a "Notify" message, an "Assign" message and a discussion's email: their "History" lines name the editor who sent them under "User" (Rule 4c; [A1](#a1)): the guard the issue report proposes
  - a Reviewer's "Submit Review": the "Review complete" lines with nothing under "User" (Rule 4c; [A5](#a5)): the guard the issue report proposes
  - text typed in "Add Note" and not added on a submission with a note: "Close" asks; after a switch to "History" answered "OK", "Close" asks nothing; no "Leave site?" after either (Rule 10d; [A3](#a3), [A9](#a9), [A10](#a10)): the guard the issue report proposes
- **Nothing new to test**:
  - a revision cancelled with "Cancel", leaving no line of it, metadata line included, on either "History" (Rule 6c)
  - a preprint server's file lines, from a galley's file, and its "Change File" cancelled (Rules 6, 6c)
  - a "History" open in a second window over a cancelled revision: the revision line stays until reopened, and its "Download" leads to a page reading "404 Not Found" (Rule 6c)
  - the author-editor's review-change line, with no "View changes", and the "Revert Decision" line reading "Anonymous Reviewer" under "User" (Rule 9)
  - text typed in "Add Note" and not added, then a switch to "History": the question, "Cancel" and "OK" (Rule 10d)
  - leaving the page with text typed: the browser's "Leave site?" (Rule 10d)
  - a tall note's "Read More" (Rule 10b)
  - a note typed on several lines, and one with tags typed (Rule 10a)
  - a discussion's file line losing its arrow once the discussion is deleted (Rule 6a)
  - event lines in the reader's interface language, email subjects as sent (Rule 8)
  - "Date (Short)" at another format (Settings bullet 1; Rule 2)
  - "Date & Time (Short)" at another format (Settings bullet 2; Rule 10)
  - a preprint server's Author, with no "Notifications" list, and the decline email listed on the editors' "History" only (Purpose)
  - the Editor and the Production editor {OJS OMP}, and the Guest Editor {OJS} (Actors row 1): the Journal Manager's and the Section Editor's offer, which scenario 1 reads
- **Register carries it**:
  - A2 (an empty note; Rule 10a)
  - A7 (file lines read in French; Rule 8a)
  - OMP1 (a publication format's lines; Rule 11)
- **No seed**:
  - a Site Administrator whose journal roles are all assistant roles: "Notes" alone, no "Delete" (Actors rows 1, 2, 4, 5; A4)
  - a reviewer's file line read by the author-editor: "Anonymous Reviewer", no file name, no "Download" (Rule 9)
- **Owned by another feature**:
  - no "Activity Log" in the header of the assistant roles, the Author, the Reviewer and the Reader (Actors row 1; *Workflow screen & stage access*, scenarios 4, 7 and 12)
  - a Site Administrator whose only journal role is Reader, refused the submission (Actors row 1; *Workflow screen & stage access*)
  - "View changes" on a review-change line (Rule 5; *Reviewer assignment & management*, scenario 16)
  - a file's own "More Information" window, "Earlier Revision Notes" and "Show events from prior versions" (Cross-feature interactions; *Submission files*, scenarios 3 and 6)
  - the Author's "Notifications" list {OJS OMP} (Purpose; *Review stage & rounds*, scenario 12)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-24), unreviewed
unless an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | The Activity Log shows no sender for the emails an editor sends with "Notify", "Assign" or a discussion | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A2](#a2) | "Add Note" with an empty box posts a note with no text, on a file's "Notes" and in "Activity Log & Notes" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A3](#a3) | Once the submission has a note, closing the window drops a note typed and not added, without asking | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A5](#a5) | The Activity Log names the editor who received a "Review complete" email as its sender | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | Read in French, file lines print an empty file name | 🐞 | user-visible | — |
| [A9](#a9) | After closing drops a typed note, the next page change asks "Leave site?" with nothing typed | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | After a switch to "History" discarded a typed note, "Close" asks again whether to continue without saving | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [OMP1](#omp1) | A new or deleted publication format's line prints "{$formatName}" | 🐞 | minor | — |
| [A4](#a4) | A Site Administrator whose journal roles are all assistant roles gets "Notes" alone | ❓ | latent | — |
| [A8](#a8) | An "Open" review's assignment line reads "Anonymous Reviewer" for an editor who is also the author | ❓ | minor | — |
| [A6](#a6) | Retired: a cancelled revision left two revision lines on "History", and the first one's "Download" opened a blank page; it now leaves no line (Rule 6c) | ✅ | retired | upstream change + claim check (claude), 2026-09-27 — fixed upstream |

### All apps

<a id="a1"></a>
**A1 — The Activity Log shows no sender for the emails an editor sends with "Notify", "Assign" or a discussion** · 🐞 · low.
Three kinds of email an editor sends from the workflow are listed on the
submission's "Activity Log" › "History" with nothing under "User": a
"Notify" message to a participant, the message sent with "Assign", and
the emails of a discussion and of its replies. On 3.5 and 3.4 the
feature is a discussion; on `main` it is "Tasks & Discussions", and a
task's emails are listed the same way. The decision emails the same
editor sends name the editor there.

The log's other email lines already name their sender (decisions,
review requests, an editor's reminders and thanks, the reviewer's
answers) or are the journal's own emails, sent from its contact and
listed with nothing under "User" by design (the acknowledgement, the
automatic review reminders), so these three are the whole list. The
"Review complete" email, which names the wrong person, is a separate
report.
Basis: probe, 2026-10-04. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — "Add Note" with an empty box posts a note with no text, on a file's "Notes" and in "Activity Log & Notes"** · 🐞 · low.
Pressing "Add Note" with the box empty posts a note with no text. It
happens in a file's "More Information" › "Notes" and in the
submission's "Activity Log & Notes" › "Notes". The message "Note
posted." appears, the list gains a note that shows only its writer, its
date and "Delete", and "History" gains "Posted new note.". An empty note
is expected to be refused.

The empty note stays in the list until an editor deletes it. The
"History" line stays whatever happens.

Only the editorial team sees either: neither window opens for an author
or a reviewer, and adding a note sends no email. On a preprint server
before `main`, a galley has no "More Information", so only "Activity Log
& Notes" shows the fault there.
*Submission files* carries the file's "Notes" tab ([→ its A10](U36-submission-files.md#a10)).
Basis: probe, 2026-10-02. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Closing the window drops a note not yet added, once the submission has a note** · 🐞 · low.
With text typed in "Add Note" and not added, closing the window ("Close",
Escape or a click beside it) asks
whether to continue without saving while the submission has no note.
Once it has one, closing drops the text at once, with no question. The
question is expected in both cases, as on the tab switch. A file's
"More Information" window never asks on closing, with notes or without
([→ Submission files' A18](U36-submission-files.md#a18)).
Basis: probe, 2026-10-04. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — A Site Administrator with only assistant roles gets "Notes" alone** · ❓ · latent.
A Site Administrator whose journal roles are all assistant roles is
offered "Activity Log", but the window shows only the "Notes" tab. They
can add notes, and no note has "Delete", their own included. "History"
is reserved to people holding a manager or editor role in the journal.
Question: should a Site Administrator read "History" without a manager or editor role in the journal? Lean: yes (a product call no screen settles); the header offers the button on the strength of the administrator role, and the notes they may add sit beside a history they cannot read.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — The Activity Log names the editor who received a "Review complete" email as its sender** · 🐞 · low.
When a Reviewer submits a review, the journal emails "Review complete"
to each editor of the submission, from the journal's contact. The
submission's "Activity Log" lists one line per editor, "An email has been
sent: Review complete: …", and each line names under "User" the editor
who received it, as if that editor had sent it.

"User" should be empty there, as it is for the journal's other automatic
emails (the submission acknowledgement, the automatic review reminder).
"Review complete" is the only email the log records under someone who
did not send it.
Basis: probe, 2026-10-04. <sup>[f-a5](#fn-a5)</sup>

<a id="a7"></a>
**A7 — File lines lose the file name in another language** · 🐞 · user-visible.
Read in French (Canada), the file lines written while the person acting
worked in English print an empty name: "La révision « » a été téléversée
pour le fichier 12." where an English reader reads "Revision
"article.pdf" was uploaded for file 12.". The name is expected in every
language. An editor who works in another language than the person
who acted cannot tell from the log which file a line is about.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — An "Open" review's assignment line hides the reviewer from an editor who is also the author** · ❓ · minor.
For an editorial reader who is also an author of the submission, an
"Open" review's acceptance, decline and file lines name the reviewer,
but its assignment line reads "Anonymous Reviewer has been assigned to
review submission {number} for review round {n}.".
Question: should the assignment line of an "Open" review name the
reviewer for this reader, as its other lines do? Lean: yes, a minor
defect; the log hides a name the review type discloses.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — A stray "Leave site?" after a note was dropped** · 🐞 · low.
After "Close" dropped typed text without asking (A3), the next page
change or reload asks the browser's "Leave site?" although nothing is
typed on screen; answering "Leave" loses nothing. After a close that asked and was answered "OK",
leaving asks nothing. A file's window does the same
([→ Submission files' A18](U36-submission-files.md#a18)).
Basis: probe, 2026-10-04. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — "Close" asks about a note the tab switch already discarded** · 🐞 · low.
On a submission with no note, with text typed in "Add Note", a switch to
"History" asks whether to continue without saving, and "OK" discards the
text. Pressing "Close" on "History" then asks the same question again,
though nothing typed is left to lose. The question is expected only
while typed text would be lost; once "Notes" is opened again, "Close"
rightly asks nothing. A user asked twice cannot tell whether the text
was kept.
Basis: probe, 2026-10-04. <sup>[f-a10](#fn-a10)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — "{$formatName}" on a publication format's line** · 🐞 · minor.
Creating a publication format adds the line "The publication format
"{$formatName}" was created.", and deleting one "The publication format
"{$formatName}" was removed.": the format's name is expected where the
placeholder prints. The press's other publication format lines name the
format.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

### Retired

<a id="a6"></a>
**A6 — A cancelled revision leaves lines behind, and a broken "Download"** · ✅ · retired. Fixed upstream (pkp/pkp-lib#13288, 2026-09-27), verified 2026-09-27 on OJS and OMP, and on OPS through a galley's "Change File": a revision cancelled with "Cancel", at any step, leaves no line of it, metadata line included, on either "History", and no "Download" is left for the cancelled version (Rule 6c). <sup>[f-a6](#fn-a6)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read on the checkouts OJS `802202cb3e` (lib/pkp `5af3b3933`,
ui-library `2034439a`), OMP `7f9455d5a` (lib/pkp `63945bbd82`) and OPS
`15f0b6e0bd` (lib/pkp `f8bacd7658`). No app subclasses or overrides the
information-center handlers, the event-log grid or their templates
(`controllers/informationCenter/`, `controllers/grid/eventLog/`,
`templates/controllers/informationCenter/` exist in lib/pkp only), so the
window is one shared code path (RUNBOOK rule 8). The three lib/pkp pins
differ in the event-log grid only by pkp/pkp-lib#13291 (competing-interest
review changes, in OJS's pin and not yet in OMP's and OPS's).

<a id="fn-a"></a>
**a** — The header action `WORKFLOW_VIEW_ACTIVITY_LOG` (label
`editor.activityLog` "Activity Log") in `workflowConfigEditorialOJS.js` /
`OMP.js` / `OPS.js`; `useWorkflowActions.js::workflowViewActivityLog()`
opens `informationCenter.SubmissionInformationCenterHandler` /
`viewInformationCenter` through `useLegacyGridUrl().openLegacyModal()`
(a side modal, `LegacyAjax`) titled `submission.list.infoCenter` "Activity
Log & Notes". `informationCenter.tpl` renders the tabs
`submission.informationCenter.history` "History" (unless
`removeHistoryTab`) then `submission.informationCenter.notes` "Notes";
`InformationCenterHandler::setupTemplate()` selects index 0 unless a
`tab` parameter is passed, and no caller passes one. The Author's
"Notifications" list is `WorkflowListingEmails.vue` on
`emails/authorEmails` (the review-stage spec's Rule 16). The file window
is `FileInformationCenterHandler` (the submission-files spec); a
discussion's History is `DiscussionManagerHistoryModal.vue`. Live-probed 2026-09-24 (Purpose; Rule 1), all three apps on scratch
contexts: the title, the tabs in that order with "History" selected,
"Close" and Escape returning to the same workflow address; the Author,
the Reviewer (OJS, OMP), the Reader and an assigned Copyeditor (OPS: an
Editorial Board Member) got no "Activity Log" (a header of "Library"
alone, or no header buttons on OPS; the editorial address gave the
access-denied page). A file's "More Information" window ("Information
Center: article.pdf"; OPS a galley's "Information Center: PDF") and a
discussion's "History" window held their own records. The Author's
"Notifications" list, OJS and OMP: empty until an editor's email; after
"Request Revisions" it listed "Your submission has been reviewed and we
encourage you to submit revisions". OPS: after "Decline Submission" the
editors' "History" read "An email has been sent: Your submission has
been declined", and none of the Author's side-menu entries ("Preprint",
its version, "Title & Abstract" … "Production Tasks & Discussions")
listed it.

<a id="fn-b"></a>
**b** — Page side: `useWorkflowPermissions.js` sets
`canAccessEditorialHistory` when the active stage's
`currentUserAssignedRoles` include `ROLE_ID_MANAGER`,
`ROLE_ID_SITE_ADMIN` or `ROLE_ID_SUB_EDITOR`; the workflow spec's note f
and Actors row "Activity Log" hold the probes. Server side:
`InformationCenterHandler` admits `ROLE_ID_SUB_EDITOR`, `ROLE_ID_MANAGER`,
`ROLE_ID_SITE_ADMIN` behind `SubmissionAccessPolicy`;
`SubmissionInformationCenterHandler::authorize()` additionally requires a
manager, sub-editor or admin role on some accessible stage of the
submission (or, with no stage access at all, a global admin or manager
role). `Repo::user()->getAccessibleWorkflowStages()` gives an unassigned
manager or admin every stage. The window's contents never read the stage. Live-probed 2026-09-24 (Actors paragraph and
row 1), all three apps: "Activity Log" offered to the Journal Manager,
the Site Administrator as manager, an unassigned Editor and Production
editor (OJS, OMP), an assigned Section Editor and an assigned Guest
Editor (OJS); an unassigned Section Editor got a workflow screen with no
header buttons. A preprint server ships no Editor or Production editor
role, so its manager is its one manager-level reader. The window read the
same on a submission at its first stage and on one further on.

<a id="fn-c"></a>
**c** — `SubmissionInformationCenterHandler::viewInformationCenter()`
assigns `removeHistoryTab` when the user lacks `ROLE_ID_MANAGER` and
`ROLE_ID_SUB_EDITOR` in the submission's context
(`$user->hasRole([...], contextId)`) or is not an assigned editor. The
History grid (`SubmissionEventLogGridHandler`) admits manager, site admin
and sub-editor behind `SubmissionAccessPolicy` and
`UserAccessibleWorkflowStageRequiredPolicy`. The test tooling enrols the
installer's administrator as a manager of every context it creates
(seed-facts "Users"). The state is reached by seeding the administrator
with a second role in `users[]`, then ending the manager role on the
administrator's Users & Roles "Edit" page ("Remove Role") and signing in
again; a journal keeps a user's last role, so an administrator with no
role at all in such a journal is not a state the screens make.
Live-probed 2026-09-24 (Actors rows 1, 2, 4, 5), all three apps: with
Copyeditor (OPS: Editorial Board Member) as the remaining role the
workflow opened, "Activity Log" showed "Notes" alone, a note posted and
no note had "Delete"; with Reader as the remaining role the workflow
address showed "Error" / "The current role does not have access to this
operation." / "OK" over an empty screen with no header buttons, and the
editorial dashboard opened on "Search Results (0)". Control: the same
administrator as manager read both tabs.

<a id="fn-d"></a>
**d** — Notes: `SubmissionInformationCenterHandler::viewNotes()` /
`saveNote()`, `NewSubmissionNoteForm` → `NewNoteForm` (template
`notes.tpl`, `newNoteForm.tpl`: `fbvFormSection title="informationCenter.addNote"`
"Add Note" over a `textarea`, submit text `informationCenter.addNote`;
checks `FormValidatorPost` and `FormValidatorCSRF` only, none on the
text). `notesList.tpl` lists `Note::withAssoc(ASSOC_TYPE_SUBMISSION,
submissionId)->get()` with no `withSort()` (insertion order), or
`informationCenter.noNotes` "There are no notes to display.". `note.tpl`:
the writer's `getFullName()`, `dateCreated|date_format:$datetimeFormatShort`,
the text through `revealMore.tpl` with `strip_unsafe_html` (no
`nl2br`, and `informationCenter.less` sets no `white-space` on a note, so
typed line breaks collapse), and the
`common.delete` button inside `{if $notesDeletable &&
array_intersect([ROLE_ID_MANAGER, ROLE_ID_SUB_EDITOR], $userRoles)}`
(`$userRoles` = the user's roles in the context, `PKPHandler::setupTemplate()`),
confirmed by `buttonConfirmationLinkAction.tpl` with
`informationCenter.deleteConfirm` "Are you sure you wish to delete this
note?". `saveNote()` logs `SUBMISSION_LOG_NOTE_POSTED`
(`informationCenter.history.notePosted` "Posted new note.") on the
submission, with `userId`/`impersonatedUserId` as every event line, and
raises the trivial notification `notification.addedNote` "Note posted.";
`deleteNote()` checks CSRF and that the note belongs to the submission,
deletes it, raises `notification.removedNote` "Note deleted." and logs
nothing. No mailable and no `Notification` row besides the trivial ones.
`notes.tpl`'s "Earlier Revision Notes" (`showEarlierEntries`) is set only
by `NewFileNoteForm`. The date format: `PKPTemplateManager` assigns
`datetimeFormatShort` from the context's `getLocalizedDateTimeFormatShort()`
(`config.inc.php` default `Y-m-d h:i A`). The same form, list and dialog
on a file's window were live-probed 2026-09-23 by the submission-files
spec (its notes d14, f-a10): "Confirm" with "OK" and "Cancel", notes
oldest first, "Mira Manager 2026-09-23 11:55 AM". Live-probed 2026-09-24 (Actors rows 4–5;
Fields; Rule 10), all three apps: every editorial reader saw "Delete" on
every note, others' included, and an assigned Section Editor deleted the
manager's note through "Confirm" / "Are you sure you wish to delete this
note?" / "OK" / "Cancel", then "Note deleted."; the text box carries no
`maxlength`; notes listed oldest first across 64 notes posted, deleted
and re-read on reopening, dated like "2026-09-23 10:52 PM" at the
default; "There are no notes to display." on a submission with none,
where a note added in a file's window and a discussion's first message
were not listed; "First line", Enter, "Second line" showed "First line
Second line" (the stored text keeps the line break) and "<b>bold</b>"
the word bold in bold type (`strip_unsafe_html` keeps `<b>`); a note
posted under "Login As" was listed under the account acted as ("Sean
Section"), its "History" line under "admin admin (acting as Sean
Section)"; the empty box posted a note 0 px high; a deletion left the
number of "History" lines unchanged. One read of 32 notes posted within
two minutes listed a later note first, on OJS and on OMP; twelve later
reads on all three apps did not repeat it (the list query has no sort).

<a id="fn-e"></a>
**e** — `SubmissionEventLogGridHandler::initialize()`: columns `date`
(`common.date` "Date", `DateGridCellProvider` with the context's
`getLocalizedDateFormatShort()`), `user` (`common.user` "User"), `event`
(`common.event` "Event"); no filter template (the "Search" box
`eventLogGridFilter.tpl` belongs to `SubmissionFileEventLogGridHandler`
only) and no paging. `loadData()` merges the submission's event log
entries (`filterByAssoc(ASSOC_TYPE_SUBMISSION)`, ordered
`date_logged desc` with no tie-break), the review-change entries
(`getReviewChangeEntries()`) and the email log entries
(`EmailLogEntry::withAssocId()->withAssocType(ASSOC_TYPE_SUBMISSION)`),
then `usort()`s them newest first by `dateLogged`/`dateSent`, returning 0
on equal dates. An empty grid prints `grid.noItems` "No Items". The
"Date (Short)" field is `PKPDateTimeForm`'s `dateFormatShort`
(`manager.setup.dateTime.shortDate`), default `Y-m-d`. Live-probed 2026-09-24 (Rule 2; Fields), all three apps:
the columns in that order, newest first, 40 lines (OJS, OMP) and 38
(OPS) on one page with no search, filter or pager; lines of one second
out of time order (the seeded file lines above "Article submitted");
"Date" at the default "2026-09-23", and "23.09.2026" after "Date
(Short)" was saved as "d.m.Y".

<a id="fn-f"></a>
**f** — `EventLogGridRow::initialize()`: `DownloadFileLinkAction`
(label `common.download` "Download") for `SUBMISSION_LOG_FILE_UPLOAD` and
`SUBMISSION_LOG_FILE_REVISION_UPLOAD`; `ReviewChangeLinkAction`
(`common.viewChanges` "View changes", window `submission.event.viewReview`
"View Review", `SubmissionReviewEventLogGridHandler::viewReviewChange()`)
for the four `*_MODIFIED` review types unless the reader is an assigned
author; `EmailLinkAction` (`submission.event.viewEmail` "View Email", an
`AjaxModal` on `viewEmail`) for every email entry. `gridRow.tpl` puts
default-position actions behind `a.show_extras` (screen-reader text
`grid.settings` "Settings") and a `row_controls` row. Live-probed
2026-09-17 (review-change rows, the reviewer-management spec's note on
the activity log: "View changes" behind the "Settings" arrow opening
"View Review") and 2026-09-23 (the tasks spec's note td18: email lines
with "View Email", attached-file lines with "Download"; the upstream
revision fix's regression read: the new revision lines with working
Download links). `FileApiHandler::recordDownload`/`downloadFile` write no
event log entry. Live-probed 2026-09-24 (Rule 5;
Side effects), all three apps: the arrow sits in the line's "Date" cell (a
screen reader reads the cell as "Settings 2026-09-23"); "View changes"
(OJS, OMP) opened "View Review" with "Updated Comments" over "Previous
Comments"; opening the window, "Download" and "View Email" added no line
and sent no email, and no Tasks count changed.

<a id="fn-g"></a>
**g** — The lines are written by `Repo::eventLog()->add()` in the
triggering code (decision `Repository::add()`, `AddParticipantForm`,
`PKPReviewerGridHandler`, `ReviewerAction`, `PKPPublicationController`,
`submissionFile\Repository`, …) and by `Repo::emailLogEntry()->logMailable()`
(Rule 7); the wording of each is quoted, with its probe, in the spec named
in Rule 3's table. OJS overrides `submission.event.submissionSubmitted`
("Article submitted") and OPS ("Preprint submitted") in their own
`locale/en/locale.po`; OMP uses lib/pkp's "Initial submission completed."
(seed-facts, Install defaults). Discussion events (`submission.event.task.*`)
are logged on the task, not on the submission
(`EditorialTaskController`); the tasks spec's note td18 saw none of them on
this log. Other specs state that their actions write no line: reader
comments, reviewer suggestions, funding. Live-probed 2026-09-24 (Rule 3), all three apps:
the Author's "Submit" in the wizard wrote "Article submitted" (OJS),
"Initial submission completed." (OMP), "Preprint submitted" (OPS) under
the Author; "Decline Submission" "{editor} declined this submission.";
"Request Revisions" with the reviewers' email step "An email about the
decision was sent to 1 reviewer(s) with the subject Thank you for your
review." (OJS, OMP); a publish "The submission was published." (OJS,
OMP), "The submission was posted." (OPS, seeded and on-screen "Post");
"Create New Version" "A new version was created." plus "Submission
metadata updated"; a discussion closed, and a task created, started and
closed, wrote no line here (the task's own "History" read "Task created
/ initiated / closed by …"), while the discussion's file and emails did.

<a id="fn-h"></a>
**h** — `EventLogGridCellProvider` (`user` column):
`EventLogEntry::getUserFullName()` (the stored `userFullName` when the
entry carries one, else the full name of `userId`); when
`impersonatedUserId` is set, `submission.event.impersonation.userLabel`
"{$userName} (acting as {$impersonatedName})", with `userId` =
`Validation::loggedInAs()` (the person signed in) and
`impersonatedUserId` = the account acted as, as every logging call sets
them. Live-probed 2026-08-28 (the publication-metadata spec, OJS scratch
journal, the administrator acting as a scratch manager through Users &
Roles › Login As): the save's line read "2026-08-28 admin admin (acting as
Mona Manager) Submission metadata updated". The participant lines' stored
`userFullName` is the participant's (the stage-participants spec's A14). Live-probed 2026-09-24 (Rules 4a, 4b), all three apps: the
Site Administrator, through a Participants row's "Login As" as the
Section Editor, posted a note and changed a file (OJS, OMP a file-details
save; OPS a discussion's attached file); both lines read "admin admin
(acting as Sean Section)" under "User". The participant line named the
participant ("Sara Second") though an Editor assigned her.

<a id="fn-i"></a>
**i** — Email lines: `EventLogGridCellProvider` prints
`EmailLogEntry::prefixedSubject` (`submission.event.subjectPrefix` "An
email has been sent:" + the stored subject, cut to 252 characters and
"..." on save) and, under "User", `senderFullName` (empty when
`senderId` is null). `logMailable()` callers that pass a sender:
`NotifyAuthors`, `NotifyReviewers` (the editor), `EditorAction` (review
request), `ReviewReminderForm`, `ThankReviewerForm`, `EmailReviewerForm`,
`EditReviewForm`, `PKPReviewerGridHandler` (reinstate, resend, cancel),
`ReviewerAction` (the reviewer's answer, `getSenderUser()`),
`submissionFile\Repository` (revised version uploaded, the author).
`PKPReviewerReviewStep3Form` (review complete) passes the notified
editor, the recipient, as the sender (A5). Callers that pass none:
`SendSubmissionAcknowledgement`, `AssignEditors` (needs an editor),
`SubEditorsDAO` (automatic editor assignment), `ReviewReminder` job,
`EditorialTaskController` (`DISCUSSION_NOTIFY`), `PKPStageParticipantNotifyForm`
(Notify/Assign messages). "View Email":
`SubmissionEventLogGridHandler::_formatEmail()`: `email.from` "From",
`email.to` "To", `email.cc` "CC" and `email.bcc` "BCC" only when
non-empty, `email.subject` "Subject", then `PKPString::stripUnsafeHtml()`
of the stored body; `logMailable()` stores `render()` of a clone after
`removeFooter()` and no attachment. One entry per `Mail::send()`: the
discussion email is sent per recipient. The `ReviewReminder` job runs only from the job runner, which
the test installs keep off (seed-facts). Live-probed 2026-09-24 (Rules
4c, 7): a named "User" on the decision email (all three apps; OPS the
Moderator), the reviewer request, reminder, "Your review assignment has
been changed", thanks, the reviewer's "Review accepted" and "Revised
Version Uploaded" (the Author), OJS and OMP; an empty "User" on the
acknowledgement, "A new submission needs an editor to be assigned", "You
have been assigned as an editor on a submission to {journal}" (OJS, OMP;
OPS sends none), the discussion's emails, "Notify" and "Assign". A
discussion message to three participants gave three lines and a reply
three more (OPS two and two). "View Email" read `From: "Eddie Editor"
<address>` and `To: "Ava Author" <address>`; "CC:" and "BCC:" only on a
decline email sent with both, addresses alone; the footer of the
recipient's copy ("Reply to this comment at … or unsubscribe …") absent;
the attached file not named. Re-probed 2026-09-28 (Rule 4c), all three
apps, two runs each, on scratch contexts: a named "User" on the decline
email (a Journal Manager who was not a participant; OPS at Production),
and, OJS and OMP, on the reviewer request, the reviewer's "Review
accepted" and "Review complete" (the editor it went to, A5); an empty
"User" on a discussion's email lines and on the wizard's acknowledgement,
"A new submission needs an editor to be assigned" and "You have been
assigned as an editor on a submission to {journal}" lines (OPS sends
none of the last).

<a id="fn-j"></a>
**j** — `submissionFile\Repository::add()` logs
`submission.event.fileUploaded` on the file and
`submission.event.fileRevised` ("Revision "{$filename}" was uploaded for
file {$submissionFileId}.", type `SUBMISSION_LOG_FILE_REVISION_UPLOAD`)
on the submission; `copy()` goes through `add()`; `edit()` logs
`submission.event.revisionUploaded` ("A file revision "{$filename}" was
uploaded for submission {$submissionId} by {$username}.") when a new
`fileId` is set, else `submission.event.fileEdited` ("The metadata for
file "{$filename}" was edited by {$username}."), on both; `delete()` logs
`submission.event.fileDeleted` ("A file "{$filename}" was deleted for
submission {$submissionId} by {$username}.") on both. The log data carry
the file's `name`, `fileId` and `submissionFileId` at that moment.
`EventLogGridRow` builds "Download" with that `fileId` and the logged
`filename`, and none when `Repo::submissionFile()->get()` finds no file,
when that `fileId` is no longer one of the file's revisions
(`Repo::submissionFile()->getRevisions()`, since pkp/pkp-lib#13288), or
when the file is a discussion's (`SUBMISSION_FILE_QUERY`) whose stage
cannot be resolved (its discussion deleted). Live-probed 2026-09-23 (the
submission-files spec's note d20, all three apps): an upload logged
"Revision "article.pdf" was uploaded for file 182." plus a "The metadata
for file "article.pdf" was edited by …" line; a revision "A file revision
"notes.md" was uploaded for submission 387 by …"; a rename "The metadata
for file "Renamed manuscript" was edited by …"; a delete "A file
"notes.md" was deleted for submission 387 by …". The tasks spec's note
td18 (2026-09-23): one "Revision … was uploaded for file {number}." line
per attached file under the writer's name, with "Download". A cancelled
revision (Rule 6c), since pkp/pkp-lib#13288 (merge `f38c4a4a10`,
2026-09-27): `PKPManageFileApiHandler::cancelFileUpload()` puts the
previous version back through `edit(…, log: false)`, which writes no
entry, and `submissionFile\Repository::deleteRevisionLogEntries()`
deletes every entry carrying the cancelled `fileId`, on the file and on
the submission, before the cancelled file is deleted. Live-probed 2026-09-24
(Rules 6, 6a, 6b), OJS and OMP on "Submission Files", OPS on a galley's
file: an upload's two lines ("Revision "not-an-image.txt" was uploaded
for file 10." and its metadata line); a copy through "Upload/Select
Files", one line naming the copy's number ("… for file 11."); a
revision's line; a details save; a deletion. Earlier lines kept the name
the file had then, and their "Download" fetched that version under that
name. After the deletion the upload line lost its arrow, as did a
discussion's file line once the discussion was deleted (all three apps).
Live-probed 2026-09-27 (Rules 6, 6a, 6c; after pkp/pkp-lib#13288), OJS
and OMP on "Submission Files", OPS on a galley's file: the same four
line shapes ("Revision "not-an-image.txt" was uploaded for file 30."
(OMP "…for file 24.") and its metadata line; "A file revision "profile-image-400.png" was uploaded
for submission 41 by …"; "The metadata for file "Renamed notes" was
edited by …"; "A file "Renamed notes" was deleted for submission 41 by
…"), the copy's single line and a discussion file's line; the cancelled
revision: note td7.

<a id="fn-k"></a>
**k** — pkp/pkp-lib#12352 (issue #12347; commits `386635ebde`,
`1ae5ee47ae`, `6dac76becb`, `c830e1b4f0`, `74a8d58571`):
`submissionFile\Repository::edit()` now persists the submission-level
entry of a revision it used to drop, alongside the file-level one; the
migration `I12347_FixRevisionUploadLogData` repairs old data on upgrade
and never runs on the test installs. The regression read of the
upstream sync (2026-09) saw the new lines render complete with working
Download links. The same change's effect on "Cancel" after a revision is
the submission-files spec's A1 (`PKPManageFileApiHandler::findMatchedLogEntry()`
read these entries until pkp/pkp-lib#13288 removed it). A cancelled
revision: Rule 6c and note j. Live-probed 2026-09-24 and 2026-09-27
(Rule 6b), OJS and OMP: note td7.

<a id="fn-l"></a>
**l** — `EventLogEntry::getTranslatedMessage(null, …)` translates the
stored message key at display time in `Locale::getLocale()`, the
reader's current interface locale, unless the entry is stored
`isTranslated`; email subjects are stored text. A file line's file name is stored as a per-language
value under the language the person acting worked in, and
`getTranslatedMessage()` reads such parameters with `getData($key,
$locale)` in the reader's language, so a reader in another language gets
no name (A7). Live-probed 2026-09-24 (Rule 8), all three apps, a French
(Canada) reader: "Journal d'événements" / "Historique et notes", the
columns "Date", "Utilisateur-trice", "Événement", event lines in French
("Nouvelle note enregistrée."), email subjects as sent ("Un courriel a
été envoyé : Review accepted: …"); an English reader of the same lines
read them in English, the note the manager posted while working in
French included.

<a id="fn-m"></a>
**m** — `SubmissionEventLogGridHandler::authorize()` sets
`_isCurrentUserAssignedAuthor` when any accessible stage carries
`ROLE_ID_AUTHOR` for the reader ("Prevent authors from accessing review
details, even if they are also assigned as an editor"). With it:
`EventLogEntry::getTranslatedMessage(…, true)` replaces `reviewerName`
with `editor.review.anonymousReviewer` "Anonymous Reviewer" unless the
entry's review assignment is Open, and blanks `username` and `filename`
for a `SUBMISSION_FILE_REVIEW_ATTACHMENT` file of a non-open assignment;
`EventLogGridCellProvider` puts "Anonymous Reviewer" under "User" for
`SUBMISSION_LOG_REVIEW_ACCEPT` / `_DECLINE` / `_UNCONSIDERED` unless the
entry's `reviewAssignmentId` resolves to an Open review (the
unconsidered entry, written by `PKPReviewerGridHandler` and
`ReviewAssignmentController` with `editorName` and no
`reviewAssignmentId`, never does), and hides an impersonated name the
same way; `EventLogGridRow` gives no "Download" for such a reviewer file
and no "View changes" at all. The scenario API builds this reader from
existing keys: a scratch context user with the `author` and
`sectionEditor` roles as the submitter, the same user in
`participants[]` as `sectionEditor`. Live-probed 2026-09-24 (Rule 9), OJS and OMP, two scratch
journals (review type "Anonymous Reviewer/Anonymous Author" and "Open"),
a user holding Author and Section Editor who submitted and is assigned
as Section Editor: in the anonymous journal the acceptance and decline
lines read "Anonymous Reviewer" under "User" and in the text, the
reviewer's file lines read 'Revision "" was uploaded for file 35.' under
"Anonymous Reviewer" with no arrow, the review-change line had no arrow,
and "{manager} has marked the round 1 review for submission {number} as
unconsidered." read "Anonymous Reviewer" under "User". In the "Open"
journal the acceptance, decline and file lines read as for the manager,
the review-change and unconsidered lines as in the anonymous one, and
the assignment lines still read "Anonymous Reviewer has been assigned to
review submission {number} for review round 1." (A8). The reviewer's
file needs the reviewer's own upload on screen; no scenario key seeds
it.

<a id="fn-n"></a>
**n** — `revealMore.tpl` (`common.readMore` "Read More") with
`RevealMoreHandler.js`: content taller than 192 px gets `isHidden` and a
192 px `max-height`; the button removes both. Shorter content keeps the
button hidden (`revealMore.less`). Live-probed 2026-09-24 (Rule 10b), all
three apps: a note of 30 short lines showed as one run 48 px high with
no "Read More"; a paragraph of about 4,000 characters was cut at 192 px
with "Read More", and pressing it showed the whole note (672 px) and
removed the button; a one-line note had none.

<a id="fn-o"></a>
**o** — OMP `locale/en/submission.po`:
`submission.event.publicationFormatCreated` and `…Removed` use
`{$formatName}`, while `PublicationFormatForm::execute()` and
`PublicationFormatService::deleteFormat()` log the name as
`publicationFormatName` (renamed by the 3.4 migration
`I8933_EventLogLocalized`); `…MadeAvailable`, `…MadeUnavailable`,
`…Published`, `…Unpublished` (`PublicationFormatGridHandler`) use
`{$publicationFormatName}` and fill. `submission.event.publicationMetadataUpdated`
has no caller. Live-probed 2026-09-24 (Rule 11), OMP scratch press, the Press
Editor on one format "K2 Format": created, approved, made available, made
unavailable, approval withdrawn, deleted; each line read as Rule 11
quotes it, under the editor's name.

<a id="fn-p"></a>
**p** — An editorial statement of which spec quotes which family of
lines; no screen shows it. The lines themselves were read on the screens
Rule 3's table names (note g).

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-24 (Rule 1a), all three apps: after the
press the window showed its title within about 20 ms and its tabs by
about 50–190 ms, then "Loading" with a spinner until the rows arrived
(140–560 ms on first open); a switch to "Notes" showed a spinner for
about 40–80 ms, and back on "History" "Loading" again. The 30-second
blank an earlier probe saw on 2026-09-04 did not recur.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-24 (Rule 1b), all three apps: after the
note "Checked the figures." on "Notes", pressing "History" fetched the
tab again and its top line was "Posted new note." under the writer.
Code: `TabHandler.js` sets `ajaxSettings.cache = false` on every tab load.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-24 (Rule 2), all three apps: no
submission reached a "History" with no line. A seeded submission with no
decision listed 8 lines (OJS, OMP) or 6 (OPS), a seeded draft 2–4, and a
draft begun with "Begin Submission" (title only) two "Submission
metadata updated" lines when the manager opened it; the seeded draft
submitted through the wizard by its Author then listed 10 (OJS, OMP) or
9 (OPS). The empty table's "No Items" (note e) was reached on none.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-24 (Rule 4c): every sender read is in
note i; the "Review complete" line in f-a5. The automatic review
reminders were not driven: the job that sends them is off on the test
installs.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-24 (Rule 6): the copy's line (OJS, OMP)
and a discussion file's line (all three apps) as note j reports; the
discussion file's line under the message's writer, with "Download".

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-24 (Rule 6a): a deleted file's upload
line (OJS, OMP; OPS a galley's file) and a deleted discussion's file line
(all three apps) kept their text and lost their arrow; the upload line of
a file renamed since downloaded under its old name "notes.md".

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-24 (Rule 6b), OJS and OMP:
"Download" on a file's first upload line fetched the original PDF as
"article.pdf", on the revision line the new PNG; the revision line was
on this log and on the file's own "History", each with "Download".
Live-probed 2026-09-27 (Rules 6b, 6c; after pkp/pkp-lib#13288), OJS and
OMP (Journal Manager, Editor, Section Editor; on the press its Series
editor), OPS on a galley's "Change File": the revision line again on both logs
(OPS "Information Center: PDF"), each "Download" fetching the new file.
A revision cancelled with "Cancel" at step 1, 2 or 3 (at step 3 after
step 2's details were saved), of a file renamed
or not, by the person who renamed it or another, and a second revision
cancelled after a completed one, left the list as before and added no
line to this log or to the file's "History", no metadata line either; `cancel-file-upload`
answered `status:true` every time; a galley's "Change File" cancelled
the same (OJS, OPS; Journal Manager and Section Editor, on OPS the
Moderator). With this log opened in a second window after the upload
and before the cancel, both at step 1, it listed "A file revision
"rev-stale.pdf" was uploaded for submission 24 by …" with "Download"
and no metadata line for "rev-stale.pdf";
after "Cancel" in the first window, that "Download" left the workflow
for a page reading "404 Not Found" (`download-file` answering 404:
`FileApiHandler` refuses a `fileId` that is not a revision), and the
log opened again no longer listed the line (OJS, OMP).

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-24 (Rule 7), all three apps: the window
titled "View Email", its lines as note i reports.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-24 (Rule 8): note l.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-24 (Rule 9): note m.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-24 (Rule 10a): note d.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-24 (Rule 10b): note n.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-24 (Rules 1, 10d), all three apps, on
a submission with no note and on one with notes. The tab switch asked
"The data on this form has changed. Do you wish to continue without
saving?" in both: "Cancel" kept "Notes" and the text, "OK" opened
"History" and the box was empty on return. "Close", and Escape with the
focus off the box, asked with no note ("Cancel" kept the window and the
text, "OK" closed it, the box empty on reopening) and closed at once
with notes, the text gone. Escape in the box did nothing. Going to
another address with the box blurred raised the browser's page-leave
question ("Leave site?"): staying kept the page, the window and the
text, leaving left; the same with notes or without. Why closing depends
on the notes: f-a3. Re-probed 2026-09-28 (Rule 10d), all three apps, two
runs each, on a submission with no note: the switch asked once, "OK"
opened "History" and the box was empty back on "Notes", and "Close" from
there asked nothing; "Close" pressed on "History" straight after the
switch asked again: f-a10.

<a id="fn-s0"></a>
**s0** — Accounts: `docs/process/users.md` (the seeded roster; `admin`/`admin`, every other account its username twice; throwaway accounts likewise). Where each scenario runs: 1–3 on the seeded journal, press or preprint server `publicknowledge`, each on a scratch submission from `POST scenarios/submission` with submitter `author.alex`; 4 on two scratch contexts from `POST scenarios/context`. On `publicknowledge` the Journal Manager is `manager.maya`, the Section Editor `sectioneditor.ana` (a Moderator on the preprint server), assigned automatically through the submission's section (`ART`, the press's series `monographs`, `PRE`), the Site Administrator `admin`, the Author `author.alex`. No seed key writes a submission's note or its "Login As", so every note and every step in a scenario's body is driven on screen. Recipes: 1 — no decisions; the Site Administrator's "Login As" is the Section Editor's Participants row's "Login As" (note h), left again through "Logout as {username}"; 2 — no decisions (OJS and OMP on the Submission stage, OPS on Production), the decline recorded on screen, since a seeded decision acts as `admin` (scenarios.md); 3 — `files: [{file: 'article.pdf'}]` (the submitter's file, uploaded through the wizard's "Files" panel before the submit), the revision with the fixture `notes.md`; OPS refuses `files`; 4 — a scratch context at the install's "Default Review Mode" ("Anonymous Reviewer/Anonymous Author", seed-facts) with a throwaway user holding `author` and `sectionEditor` and two throwaway `externalReviewer`s, the submission seeded with that user as `submitter` and in `participants[]` as `sectionEditor`, `decisions: ['sendExternalReview']` and `reviewRounds: [{reviewers: [{username: <the first>, status: 'accepted'}, {username: <the second>, status: 'declined'}]}]`; the "Open" part the same on a second scratch context created with `review: {defaultReviewMode: 'open'}`; the control's Journal Manager is `admin`, whom the tooling enrols as a manager of every context it creates (seed-facts "Users"). The reviewer's own file (Rule 9) is the reviewer's step-3 upload on screen; no seed key writes it. Live-probed 2026-09-24, OJS and OMP: the author-and-editor recipe reaches Rule 9's state.

<a id="fn-a1"></a>
**f-a1** — Note i: `EditorialTaskController` and
`PKPStageParticipantNotifyForm` call `logMailable()` without a sender.
Live-probed 2026-09-23 (the tasks spec's note td18, all three apps):
"An email has been sent: {name}" once per email of a discussion, with an
empty "User"; the same observation named the wizard's acknowledgement
line. Live-probed 2026-09-24
again (all three apps): the discussion's, "Notify"'s and "Assign"'s lines had
an empty "User" while their "View Email" read "From:" the editor who sent
them; the decision's email line named the editor.
Issue report: [pkp-e2e#893](https://github.com/jardakotesovec/pkp-e2e/issues/893) ([docs/issues/U38-A1-sent-email-lines-name-no-sender.md](../issues/U38-A1-sent-email-lines-name-no-sender.md)).

<a id="fn-a2"></a>
**f-a2** — Note d: `NewNoteForm` has no check on the text. Live-probed
2026-09-24, all three apps: the submission's window and a file's (OPS a
galley's) posted an empty note ("Note posted.", a note 0 px high,
"Posted new note." on "History"); the file window's form did the same on
2026-09-23 (the submission-files spec's f-a10).
Issue report: [pkp-e2e#521](https://github.com/jardakotesovec/pkp-e2e/issues/521) ([docs/issues/U36-A10-add-note-empty-box-posts-empty-note.md](../issues/U36-A10-add-note-empty-box-posts-empty-note.md)).

<a id="fn-a3"></a>
**f-a3** — The window is a side modal holding the legacy form.
`AjaxFormHandler` tracks changes for the tab switch. On closing,
`AjaxModalWrapper.vue`'s `registerCloseCallback` checks only the first
form in the window (`find('form').first()`): the note form while no note
exists, a listed note's delete form (`deleteNoteForm-{id}`) once one
does, and in a file's window the History search form
(`eventLogFilterForm`), so that window never asks. Live-probed
2026-09-24, all three apps: note td13; the file window did not ask on
"Close", with notes or without, and asked on the tab switch.
Issue report: [pkp-e2e#892](https://github.com/jardakotesovec/pkp-e2e/issues/892) ([docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md](../issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md)), with A9 and A10.

<a id="fn-a4"></a>
**f-a4** — Note c. The header gate reads the active stage's roles, where
an unassigned administrator holds `ROLE_ID_SITE_ADMIN`; the History tab's
gate reads journal roles only, and the note's "Delete" reads manager and
sub-editor roles only. Live-probed 2026-09-24, all three apps (note c).

<a id="fn-a5"></a>
**f-a5** — Note i: `PKPReviewerReviewStep3Form` calls `logMailable(…,
$submission, $user)` with `$user` the editor being notified, one entry
per notified editor. Live-probed 2026-09-24, OJS and OMP: after a
Reviewer's "Submit Review" the line named "Eddie Editor" under "User";
its "View Email" read "From:" "Site Admin" (the journal's contact) and
"To:" that editor.
Issue report: [pkp-e2e#894](https://github.com/jardakotesovec/pkp-e2e/issues/894) ([docs/issues/U38-A5-review-complete-line-names-recipient.md](../issues/U38-A5-review-complete-line-names-recipient.md)).

<a id="fn-a6"></a>
**f-a6** — Notes j, k. Live-probed 2026-09-24, OJS and OMP ("Submission
Files", Journal Manager): the list showed the file as before the
cancelled revision; "Download" on the cancelled version's line took the
page to a blank page, the request `GET
$$$call$$$/api/file/file-api/download-file` (that line's `fileId` and
name) answering 500. Fixed by pkp/pkp-lib#13288 (issue #13286, merge
`f38c4a4a10`, 2026-09-27): the cancelled revision's entries are
deleted, "Download" is offered only for a version that is still one of
the file's revisions, and a stale download answers 404, no longer 500.
Live-probed 2026-09-27, OJS and OMP, and OPS on a galley: note td7.

<a id="fn-a7"></a>
**f-a7** — Note l. Live-probed 2026-09-24, all three apps: the file lines
of the scratch submissions, written in English, read « » in French
(Canada) where the English reader read "article.pdf".

<a id="fn-a8"></a>
**f-a8** — Note m. Live-probed 2026-09-24, OJS and OMP, the "Open"
scratch journal: the three assignment lines read "Anonymous Reviewer has
been assigned …" for the author-editor and named the reviewer for the
Journal Manager.

<a id="fn-a9"></a>
**f-a9** — Live-probed 2026-09-24, all three apps: after "Close" dropped
the typed text on a submission with notes, the next page change raised
the browser's page-leave question (a `beforeunload`); after a close that
asked and was answered "OK" (no note), leaving raised none. A file's
window, whose close never asks (f-a3), did the same.
Issue report: [pkp-e2e#892](https://github.com/jardakotesovec/pkp-e2e/issues/892) ([docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md](../issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md)), with A3 and A10.

<a id="fn-a10"></a>
**f-a10** — On "OK", `TabHandler::tabsBeforeActivate()` triggers
`unregisterAllForms` (the page-leave tracking) but leaves the note form's
`formChangesTracked` set. The window's tabs keep the content of the tab
left (no `emptyLastTab`), so the close check, which asks the window's
first form (f-a3), finds that note form still marked changed. Opening
"Notes" again reloads the tab with a fresh form (note td2). Live-probed
2026-09-28, all three apps, two runs each, the Journal Manager on a
submission with no note: "Draft remark." typed, "History" pressed, the
question answered "OK"; "Close" asked "The data on this form has changed.
Do you wish to continue without saving?", "Cancel" kept the window on
"History", "Close" again and "OK" closed it; the two reloads after it
raised no page-leave question, and "Notes" read "There are no notes to
display." before and after. Control: the same switch, then "Notes"
opened again before "Close": no question.
Issue report: [pkp-e2e#892](https://github.com/jardakotesovec/pkp-e2e/issues/892) ([docs/issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md](../issues/U38-A3-A9-A10-activity-log-close-drops-typed-note.md)), with A3 and A9.

<a id="fn-omp1"></a>
**f-omp1** — Note o. Live-probed 2026-09-23 (the submission-files claim
check, OMP scratch press, "Add publication format"): the line "The
publication format "{$formatName}" was created." under the Journal
Manager's name. Live-probed 2026-09-24 (OMP scratch press, the Press
Editor): a format created and then deleted from its row ("Delete",
"OK") wrote "…"{$formatName}" was created." and "…"{$formatName}" was
removed." under the editor's name, while its approval and availability
lines named "K2 Format".

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Activity Log" (workflow header) → the "Activity Log & Notes" window | workflow › header | AFFW-235 · GRID-058 (parent GRID-057) |
| "History" and "Notes" tabs | the window | AFFW-687, 688 |
| The "History" table (lines, "Download", "View Email", "View changes") | "History" | AFFW-694 · GRID-008 |
| "Add Note" box and button | "Notes" | AFFW-690 |
| A note's "Delete" and its "Confirm" dialog | "Notes" | AFFW-691 |
| "There are no notes to display." | "Notes" | AFFW-693 |
| "Read More" on a long note | "Notes" | AFFW-695 |
| A note's attached-file download link: never rendered (no handler sets it) | — | AFFW-692 (dead, UNASSIGNED) |
| "Earlier Revision Notes" and its toggle; a file's "History" with "Show events from prior versions" (the file window, *Submission files*) | a file's "More Information" | AFFW-689, 696, 697 · GRID-009, GRID-056 |
| The Author's emails (`GET emails/authorEmails`, the "Notifications" list, *Review stage & rounds*); `GET emails/{id}` has no caller | `{journal}/api/v1/emails/…` | API-018 |
| The records behind "History": logged emails and logged events | database | SET-011, SET-013 |

## Reference — code anchors

- Window: `lib/pkp/controllers/informationCenter/InformationCenterHandler.php`, `SubmissionInformationCenterHandler.php`, `form/NewNoteForm.php`, `form/NewSubmissionNoteForm.php`; templates `lib/pkp/templates/controllers/informationCenter/informationCenter.tpl`, `submissionHistory.tpl`, `notes.tpl`, `notesList.tpl`, `note.tpl`, `newNoteForm.tpl`, `lib/pkp/templates/controllers/revealMore.tpl`; `lib/pkp/js/controllers/TabHandler.js`, `informationCenter/NotesHandler.js`, `RevealMoreHandler.js`.
- History: `lib/pkp/controllers/grid/eventLog/SubmissionEventLogGridHandler.php`, `EventLogGridCellProvider.php`, `EventLogGridRow.php`, `SubmissionReviewEventLogGridHandler.php`, `linkAction/EmailLinkAction.php`, `linkAction/ReviewChangeLinkAction.php`; `lib/pkp/templates/controllers/grid/gridRow.tpl`.
- Records: `lib/pkp/classes/log/event/EventLogEntry.php`, `PKPSubmissionEventLogEntry.php`, `SubmissionFileEventLogEntry.php`, `Repository.php`, `Collector.php`; `lib/pkp/classes/log/EmailLogEntry.php`, `Repository.php` (`logMailable`), `SubmissionEmailLogEventType.php`; `lib/pkp/schemas/eventLog.json`, `emailLog.json`; `lib/pkp/classes/note/Note.php`.
- Writers named here: `lib/pkp/classes/submissionFile/Repository.php` (`add`, `edit`, `copy`, `delete`, `getSubmissionFileLogData`); OMP `controllers/grid/catalogEntry/form/PublicationFormatForm.php`, `PublicationFormatGridHandler.php`, `classes/services/PublicationFormatService.php`.
- ui-library: `src/pages/workflow/composables/useWorkflowActions.js` (`workflowViewActivityLog`), `useWorkflowPermissions.js` (`canAccessEditorialHistory`), `useWorkflowConfig/workflowConfigEditorial{OJS,OMP,OPS}.js`, `src/composables/useLegacyGridUrl.js`.
- API: `lib/pkp/api/v1/emails/PKPEmailController.php`.
- Locale: `lib/pkp/locale/en/common.po` (`informationCenter.*`, `notification.addedNote`, `notification.removedNote`, `common.readMore`), `submission.po` (`submission.informationCenter.*`, `submission.list.infoCenter`, `submission.event.*`), `editor.po` (`editor.activityLog`, `editor.review.anonymousReviewer`); OJS/OPS `locale/en/locale.po`, OMP `locale/en/submission.po` (publication format lines).
