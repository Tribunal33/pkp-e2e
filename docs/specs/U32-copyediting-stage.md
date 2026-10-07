---
name: copyediting-stage
status: verified
---

# Copyediting stage {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

An accepted submission stops at the **Copyediting stage** before production.
Here the editor hands the accepted text to a Copyeditor: the files that came
out of review are listed as draft files, the Copyeditor uploads the polished
versions as copyedited files, and the author follows the work and answers
questions in the stage's discussions. When the copyedited files are ready,
the editor sends the submission on to Production with one decision; if the
acceptance was a mistake, a second decision moves it back to review.

This spec covers the Copyediting-stage screen itself: which panels, notices
and decision buttons each role is offered, what the two file lists hold, and
what each decision does to the submission. The guided wizard behind every
decision button (its email page and its file page) belongs to *Editorial
decision recording*; the file lists' upload and edit windows to *Submission
files*; the Participants panel to *Stage participants*; the discussions panel
to *Tasks & discussions*. Who may open a submission's workflow at all is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
<sup>q</sup>

A preprint server installs a single-stage workflow: a preprint's workflow
menu lists "Production" alone, its Roles settings screen installs no
Copyeditor role, and none of the panels, notices or decision buttons in this
file appear there [OPS1](#ops1). <sup>k</sup>

## Actors & permissions

Who may **open** the Copyediting stage at all is the shared workflow gate,
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access): a
Journal Manager or Editor reaches it on every submission; every other role
only on submissions they are assigned to, and only when their role's stage
set includes Copyediting. By default that set includes Copyediting for
Production editor, Section Editor, Guest Editor, Copyeditor, Marketing and
sales coordinator, Author and Translator, and on a press for Volume editor
and Chapter Author too; Layout Editor, Proofreader and Funding Coordinator
are turned away with the no-access box. Translator, Volume editor and
Chapter Author are author-level roles: the editorial dashboard refuses them
("The current role does not have access to this operation.") and they open
the stage from My Submissions, in the author view (Rule 11). "Assigned
editors" below means Journal Managers, Editors, Production editors (a
manager-level role: the Roles screen lists it at the permission level
"Journal Manager") and Section and Guest Editors listed on this stage's
Participants panel. The rows record what each role is offered **on** the
screen once it is open. <sup>a</sup> <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the stage's panels** ("Draft Files", "Copyediting Tasks & Discussions", "Copyedited Files", "Participants"; Rule 1) | • Site Administrator (holding a journal role); Journal Manager; Editor: every submission<br>• Assigned Production editor, Section Editor, Guest Editor, Copyeditor, Marketing and sales coordinator: their assigned submissions<br>• Author, and Translator, Volume editor and Chapter Author alike: their own submission, in the author view, which shows "Copyediting Tasks & Discussions" and "Copyedited Files" only (Rule 11) <sup>a</sup> |
| **See the notice box** ("Assign a copyeditor using the Assign link in the Participants list." / "Awaiting Copyedits."; Rule 3) | • Assigned editors, on this stage, while the notice's condition holds (Rule 3); on a submission accepted without review, on a press from Internal Review, or moved back from Production, "Assign a copyeditor…" never shows (Rule 3a) [A6](#a6). A Section Editor whose participation is limited to recommendations reads the notice like the Editor beside them; {OMP} one assigned on this stage through "Assign" with no message read none ⚠ [A11](#a11)<br>• A Journal Manager or Editor who is not assigned to the submission: no notice, although the panels show<br>• Copyeditor and the other assistants; Author: never <sup>d</sup> |
| **Add to and manage "Draft Files"** ("Upload/Select Files" above the list; "Update File Details", "More Information" and "Delete" in a row's menu; Rules 4–5) | • Site Administrator; Journal Manager; Editor: every submission<br>• Assigned Section Editor, Guest Editor, Copyeditor and the other assistants who reach the stage: their assigned submissions<br>• Author: never; the list is not shown in the author view (Rule 11) <sup>e</sup> |
| **Add to and manage "Copyedited Files"** (the same controls; Rule 6) | • The same roles as the row above<br>• Author: reads the list only: no "Upload/Select Files", no row menu (Rule 11) <sup>f</sup> |
| **"Send to Text Editor"** (a row-menu entry on both lists, for a Word, OpenDocument, RTF, LaTeX or Markdown file) | • Site Administrator; Journal Manager. It opens the window "Send File to Text Editor", which belongs to *Submission files* <sup>n</sup> |
| **Record "Send To Production"** (Rule 8) | • [Deciding editors](GLOSSARY.md#roles-and-access), while Copyediting is the active stage<br>• Recommending editors: no decision buttons and no recommendation controls on this stage ⚠ [A5](#a5)<br>• Copyeditor and the other assistants; Author: never <sup>c</sup> |
| **Record "Move to Review"** (Rule 9) | • The same deciding editors, at the same time; the button reads "Move to Review" whatever stage it leads to, and the decision page it opens names that stage (Rule 9) [A1](#a1) <sup>c</sup> |
| **Assign a participant** ("Assign" on the Participants panel) | • Owned by *Stage participants*. On this stage the "Assign" form offers the roles whose stage set includes Copyediting, Copyeditor among them, but never Journal Manager, although that role holds every stage; its "Choose a predefined message" list reads "Discussion (Copyediting)" and "Request Copyedit", and the latter is what raises the Copyeditor's task and email (Side effects). "Cancel" after a user is chosen closes the form and assigns nobody <sup>j</sup> |
| **Open or answer a discussion** ("Copyediting Tasks & Discussions") | • Owned by *Tasks & discussions*. The panel is shown to every role that opens the stage, the Author included (Rules 1, 11) <sup>a</sup> |

## Fields & validation

N/A. The Copyediting stage's own surfaces are panels, notices and buttons;
the forms they open belong to the features Purpose names (this spec says
what the "Upload/Select Files" window lists, Rule 5). <sup>q</sup>

## Rules & state

<a id="panels"></a>
1. **What the screen shows.** When a submission at Copyediting is opened at
   that stage, the editorial view shows, top to bottom: the notice box when
   one applies (Rule 3); the **"Draft Files"** list, described under its
   heading as "These are files from the review stage which are to be
   copyedited"; the **"Copyediting Tasks & Discussions"** panel; and the
   **"Copyedited Files"** list, described as "These are edited files that
   will be taken to the production stage". The **"Participants"** panel
   stands in the right-hand column. The decision buttons sit at the top of
   the screen: "Send To Production", highlighted, then "Move to Review"
   (Rules 8–9). Neither a journal nor a press shows a "Schedule For
   Publication" shortcut on this stage (both carry one on Production, a
   journal on Submission too); the publication pages are reached from the
   workflow's side menu instead. The header's "Preview" button while the
   submission sits here is
   [→ the header buttons](U24-workflow-screen-and-stage-access.md#stage-label).
   <sup>a</sup> <sup>m</sup>
<a id="arrival"></a>
2. **How a submission arrives.** A submission reaches Copyediting through
   "Accept Submission" on the review stage (on a press, on Internal or
   External Review) or "Accept and Skip Review" on the Submission stage
   (see *Review stage & rounds*, *[Submission
   stage](U25-submission-stage.md#send-to-review)*). The files ticked on
   that decision's "Select Files" page appear in "Draft Files" (Rule 4):
   "Accept Submission" offers the round's "Revisions" alone (a file in
   "Files for Review" is not offered, so with no revision uploaded "Draft
   Files" starts empty), "Accept and Skip Review" offers the "Submission
   Files". A submission sent to Production can also come back here
   through that stage's "Move To Copyediting" decision
   ([→ Production stage](U33-production-stage.md#move-to-copyediting)).
   The stage bubble under the title reads "Copyediting", and no
   status box is shown while the submission is active here
   ([→ the status box](U24-workflow-screen-and-stage-access.md#status-box)).
   On a submission accepted from a journal's review round or a press's
   External Review, the notice box of Rule 3 takes that slot on arrival;
   after "Accept and Skip Review", a press's "Accept Submission" on
   Internal Review, or "Move To Copyediting", nothing does [A6](#a6).
   <sup>g</sup>
<a id="notices"></a>
3. **The notice box.** Above "Draft Files", an assigned editor (Actors)
   sees one framed notice or none, on a submission accepted from a
   journal's review round or a press's External Review (3a covers the
   other decisions that bring a submission here). The notice follows the "Assign" form and the file lists as
   they change; a discussion added from the panel below is read the next
   time the workflow is opened: <sup>d</sup>
   - 3a. **"Assign a copyeditor using the Assign link in the Participants
     list."** while no discussion exists on this stage and no file has been
     added to "Copyedited Files". After three of the decisions that bring a
     submission here (Rule 2), the assigned editors see no notice box
     ⚠ [A6](#a6):
     - "Accept and Skip Review": none on landing, nor after a reload,
       nor after a further editor is assigned through "Assign" with no
       message;
     - on a press, "Accept Submission" on Internal Review: none on
       landing, nor after a reload;
     - "Move To Copyediting" on the Production stage, on a submission with
       no copyedited file and no discussion on this stage: none on
       landing, nor after a reload.

     After the first two, once a Copyeditor is assigned through "Assign"
     with the "Request Copyedit" message, the assigned editors read
     "Awaiting Copyedits.", as in 3b.
   - 3b. **"Awaiting Copyedits."** once a discussion exists on this stage
     (the "Assign" form's message opens one, whichever predefined message
     was chosen) and "Copyedited Files" is still empty. The notice follows
     the discussion, not the assignment: a Copyeditor assigned with no
     predefined message chosen and the message box left empty leaves 3a
     standing, and a discussion opened with no Copyeditor assigned flips it
     to 3b ⚠ [A3](#a3).
   - 3c. **No notice** once "Copyedited Files" holds at least one file, or
     once the submission has left the stage (Rule 10). Deleting the last
     copyedited file brings no notice back, on the same page or when the
     workflow is opened again ⚠ [A7](#a7).
   The notice is the editor's own: a Journal Manager who is not assigned to
   the submission sees the panels with no notice. <sup>d</sup>
<a id="draft-files"></a>
4. **"Draft Files".** The list holds the files to be copyedited. Each row
   shows the file's number ("No"), "File Name", "Date uploaded" and "Type",
   and, for the roles Actors names, a row menu ("More Actions") offering
   "Update File Details", "More Information" and "Delete"; "Delete" asks
   "Are you sure you wish to delete this item? This action cannot be
   undone." in a "Delete" dialog with "OK" and "Cancel". The file name is a
   link that downloads the file. "Upload/Select Files" above the list opens
   the window of Rule 5. Uploading a file here changes no notice (Rule 3).
   <sup>e</sup>
<a id="select-window"></a>
5. **The "Upload/Select Files" window.** Pressing "Upload/Select Files"
   above "Draft Files" or above "Copyedited Files" opens a window titled
   "Upload/Select Files".
   Pressing "OK" closes the window with no confirmation message: the list
   shows the rows it gained (Rules 5b, 5c), and the upload wizard's
   "Complete" shows none either. The review round's file window, by
   contrast, reports "Review files updated."
   ([→ Files for Review](U26-review-stage-and-rounds.md#review-files)).
   <sup>e</sup>
   - 5a. **What it lists.** The window opens on one group, "Copyediting",
     holding every file of the stage, the other list's files included, each
     with a tick box in a "Select" column. Every box opens clear, a row just
     uploaded (Rule 5b) or copied in (Rule 5c) included; only a listed file
     whose own box was ticked and saved opens ticked from then on. Ticking "Show files from
     all accessible workflow stages." regroups the files under the stages
     the reader may open.
   - 5b. **Uploading.** "Upload File" at the top opens the upload wizard,
     titled "Upload File" on "Draft Files" and "Upload Copyedited File" on
     "Copyedited Files", with the steps "1. Upload File", "2. Review
     Details", "3. Confirm" and "Complete". The new file then appears as a
     row in the window with its box clear; it joins the list when that box
     is ticked and the window is saved with "OK", and saving with the box
     clear leaves the list as it was. Leaving either unsaved asks nothing:
     the window's "Cancel" drops a tick, the wizard's "Cancel" leaves the
     list as it was.
   - 5c. **Ticking and clearing.** Ticking a file not yet in the list, from
     another stage or from the stage's other list, and pressing "OK" copies
     it in as a new row whose "No" differs from the source's; the source
     stays where it was. Clearing a box and saving removes nothing: a file
     leaves the list only through its row menu's "Delete" (Rule 4). Deleting
     a copyedited file took the copy of it in "Draft Files" with it, with no
     word of that in the "Delete" dialog ⚠ [A8](#a8).
<a id="copyedited-files"></a>
6. **"Copyedited Files".** The list holds the copyedited versions. It offers
   the same columns, row menu and "Upload/Select Files" as "Draft Files"
   (Rules 4–5) to the roles Actors names. The Author sees the rows and
   nothing to press (Rule 11). The first file added here clears the notice
   box (Rule 3c) and is counted on the author's My Submissions list
   ("Copyedited Files Uploaded: {count}", *[My
   Submissions](U22-my-submissions.md)*); the count follows the rows, a
   file copied in from "Draft Files" included. <sup>f</sup>
7. **Discussions and participants on this stage.** "Copyediting Tasks &
   Discussions" and "Participants" are the stage's instances of the shared
   discussions and participants panels and work as their own features
   describe (*Tasks & discussions*, *Stage participants*). What is this
   stage's: the discussions
   panel is shown in both views (Rule 11); the "Assign" form offers the
   roles whose stage set includes Copyediting, Journal Manager excepted, with
   the two predefined messages Actors names; and a discussion opened here
   drives the notice box (Rule 3). <sup>a</sup> <sup>j</sup>
<a id="send-to-production"></a>
8. **"Send To Production".** Pressing it opens the decision wizard with two
   pages: "Notify Authors", an email to the submission's authors that can be
   skipped, and "Select Files", headed "Select files that should be sent to
   the production stage.", which lists the "Copyedited" files, all ticked,
   and the "Draft Files", none ticked. Recording the decision moves the
   submission to the Production stage: the bubble reads "Production", the
   ticked files appear in Production's "Production Ready Files" list (*Production
   stage*), and the wizard closes on "Sent to Production" with the message
   "The submission, {title}, was sent to the production stage. The author
   has been notified, unless you chose to skip that email." The notices of
   Rule 3 are removed. <sup>g</sup>
<a id="move-to-review"></a>
9. **"Move to Review".** Pressing it opens the wizard with the "Notify
   Authors" page alone. The page names the stage the submission goes back
   to (Rule 9a): the last item of the breadcrumb above it and the browser
   tab's title read "Move to Review" when it goes back to review, "Move to
   Submission" when it goes back to the Submission stage. The heading at
   the top of the page reads "Move to Submission" on every submission, so
   a submission going back to review gets that heading under a breadcrumb
   reading "Move to Review" ⚠ [A13](#a13). Recording the decision closes the
   wizard on "Sent Back from Copyediting" with "The submission, {title},
   was sent back from the copyediting stage. The author has been notified,
   unless you chose to skip that email." <sup>h</sup>
   - 9a. **Where it lands.** The submission goes back to where it came from:
     to the review stage, on its last round, when it has had a review round
     (on a press, to External Review if it ever had an external round,
     otherwise to Internal Review [OMP1](#omp1)). The round's status box
     then reads by the round's reviewers, as *[Review stage &
     rounds](U26-review-stage-and-rounds.md#round-status)* describes
     ("Waiting for reviewers to be assigned." when none is on the round);
     the return itself is not announced there. A submission that was
     accepted without review goes back to the Submission stage, although
     the button, the "Notify Authors" page's text and the author's email
     speak of review ⚠ [A1](#a1).
   - 9b. **The files.** They are kept but hidden: until the submission is
     accepted again, its "Copyediting" entry shows "The Copyediting stage
     has not yet been initiated." above the Participants panel. The next
     acceptance brings both lists back with the earlier files, and the
     files ticked on its "Select Files" page join "Draft Files" beside them.
10. **No decision off the active stage.** The two buttons appear only while
    Copyediting is the submission's active stage. Once the submission has
    moved on, its "Copyediting" entry shows the two file lists and a
    discussions panel under the status box "The submission is currently in
    the Production stage.", with no buttons and no notice. When the entry
    is reached by selecting "Copyediting" in the workflow menu, that panel
    is headed "Production Tasks & Discussions"; reloading the page on the
    entry heads it "Copyediting Tasks & Discussions", as in Rule 1
    ⚠ [A12](#a12). <sup>c</sup>
<a id="author-view"></a>
11. **The author's view.** An Author opening their own submission at
    Copyediting sees the "Copyediting Tasks & Discussions" panel and, under
    it, the "Copyedited Files" list (with the line under its heading that
    Rule 1 quotes), its rows and no controls: no "Upload/Select Files", no
    row menu. There is no "Draft Files" list, no "Participants" panel, no
    notice box and no decision button. Before the submission reaches
    Copyediting the same entry shows only the box "The Copyediting stage has
    not yet been initiated." <sup>i</sup>

    That box is [→ the status box](U24-workflow-screen-and-stage-access.md#status-box);
    the author's entry route (View on My Submissions) is *[My
    Submissions](U22-my-submissions.md)*'s. <sup>q</sup>
12. **The old author-dashboard address forwards.** An old author-dashboard
    bookmark (`…/authorDashboard/submission/<number>`) forwards the
    submission's own Author to the workflow panel on My Submissions; its
    former "Copyediting" tab is never shown. <sup>l</sup>

    The forward and its refusals are
    [→ workflow addresses](U24-workflow-screen-and-stage-access.md#workflow-addresses).
    <sup>q</sup>

## Side effects

- **On "Send To Production".** The authors receive the email "Next steps for
  publishing your submission" unless the editor skipped it on the "Notify
  Authors" page; the Activity Log gains "{editor} sent this submission to the
  production stage."; the ticked files are copied into "Production Ready
  Files" (Rule 8). The wizard's own mechanics are *Editorial decision
  recording*'s. <sup>g</sup> <sup>o</sup>
- **On "Move to Review".** The authors receive the email "Your submission
  has been moved to review" unless skipped; the Activity Log gains "{editor}
  has sent this submission back from the copyediting stage.", under the name
  of whoever pressed the button (Rule 9). <sup>h</sup>
- **On assigning a Copyeditor with the "Request Copyedit" message.** The
  Copyeditor receives the email "Request Copyedit" from the assigning editor
  (its body opens "A new submission is ready to be copyedited: {number} —
  "{title}"", lists the steps to follow and ends with a reply link into the
  discussion) and two rows in the header's Tasks panel (*Notifications
  center*): "{editor} started a discussion: Request Copyedit: …" and the task
  "You have been asked to review copyedits for "{title}"." The task is not
  cleared by any later action on this stage; the Copyeditor removes it with
  the panel's "Delete", and the discussion row stays ⚠ [A4](#a4). A
  Copyeditor assigned with the message box left empty receives no email.
  The message also
  opens the discussion that flips the notice box (Rule 3b); the discussions
  panel lists that discussion as created by the editor who sent it.
  <sup>j</sup> <sup>[f-a9](#fn-a9)</sup>
- **On adding or removing a copyedited file.** On adding, the notice box of
  every assigned editor changes to match (Rule 3); on removing the last one
  it does not [A7](#a7). The author's My Submissions cell counts the files either
  way (Rule 6). <sup>d</sup> <sup>f</sup>

## Settings that modify behavior

- **"Stage Assignment"** (Settings › Users & Roles › Roles › a role's "Edit"
  form, the stage tick boxes; the Journal Manager row has no "Edit" and
  holds every stage). The install default gives Copyediting to Editor,
  Production editor, Section Editor, Guest Editor, Copyeditor, Marketing and
  sales coordinator, Author and Translator, and on a press to Volume editor
  and Chapter Author too; Layout Editor, Proofreader, Funding Coordinator,
  Reviewer and Reader have it unticked. With Copyediting ticked, an assigned
  member of the role reaches the stage's panels (Actors) and the role is
  offered in this stage's "Assign" form; unticked, an assigned member gets
  the no-access box here
  ([→ stage gate](U24-workflow-screen-and-stage-access.md#stage-gate)) and
  the role is not offered. Unticking a role's only remaining stage answers
  "Your changes have been saved." but the box is ticked again when the form
  is reopened; unticking one stage while ticking another saves
  ⚠ [A10](#a10). The form itself is *Roles configuration*'s. <sup>b</sup>
- **The email templates** "Sent to Production" and "Submission Sent Back
  from Copyediting" (Settings › Workflow › Emails; *Emails management*). The
  install defaults carry the subjects Side effects quotes; an edited subject
  or body is what the "Notify Authors" page prefills. <sup>p</sup>
- **The task template** "Request Copyedit" (Settings › Workflow › Tasks and
  Discussions, under "Copyediting Stage"; *Tasks & discussions*). Its
  Discussion body is what the "Assign" form's "Request Copyedit" message
  prefills, and its name is the subject of the Copyeditor's email (Side
  effects). <sup>p</sup>
- **The app's workflow stages.** A preprint server ships a single-stage
  workflow, which is why its submissions never occupy a Copyediting stage
  [OPS1](#ops1). This is a fixed property of each application, not a
  configurable setting. <sup>k</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)**:
  who may open a submission's workflow and reach this stage; the stage
  bubble, the "Preview" header button, the status box and the no-access
  box. This spec owns only what the Copyediting stage offers once opened.
  <sup>q</sup>
- **Editorial decision recording**: the wizard behind "Send To Production"
  and "Move to Review" (Rules 8–9). This spec owns the buttons' presence and
  the stage change each decision makes. <sup>q</sup>
- **[Review stage & rounds](U26-review-stage-and-rounds.md#decisions)**:
  "Accept Submission", the usual way in (Rule 2), and the destination of
  "Move to Review" with its round status (Rule 9a). <sup>q</sup>
- **[Internal Review stage](U71-internal-review-stage.md)**: on a press,
  "Accept Submission" on Internal Review, a further way in (Rule 2), which
  brings no first notice (Rule 3a). <sup>q</sup>
- **[Submission stage](U25-submission-stage.md#send-to-review)**: "Accept and
  Skip Review", the other way in (Rule 2), and the destination of "Move to
  Review" for a submission never reviewed (Rule 9a). <sup>q</sup>
- **[Production stage](U33-production-stage.md#move-to-copyediting)**: the
  destination of "Send To Production" and its "Production Ready Files" list
  (Rule 8), and "Move To Copyediting", the way back (Rule 2), which brings
  no first notice (Rule 3a). <sup>q</sup>
- **Submission files**: the two lists' upload wizard, "Update File Details",
  "More Information", "Delete" and "Send to Text Editor" (Rules 4–6).
  <sup>q</sup>
- **Stage participants**: the "Participants" panel and its "Assign" form,
  whose "Request Copyedit" message raises the Copyeditor's task (Rule 7;
  Side effects). <sup>q</sup>
- **Tasks & discussions**: the "Copyediting Tasks & Discussions" panel
  (Rule 7) and the task template "Request Copyedit" (Settings). <sup>q</sup>
- **[Notifications center](U05-notifications-center-and-email-preferences.md)**:
  the Tasks panel where the Copyeditor's two rows are listed (Side effects).
  <sup>q</sup>
- **[My Submissions](U22-my-submissions.md)**: the author's entry route
  (Rule 11) and the "Copyedited Files Uploaded: {count}" cell (Rule 6).
  <sup>q</sup>
- **Submission activity log & notes**: the log lines Side effects names.
  <sup>q</sup>
- **Emails management**: the two email templates (Settings). <sup>q</sup>
- **Roles configuration**: the Roles "Edit" form and its "Stage Assignment"
  boxes (Settings). <sup>q</sup>

## Canonical scenarios

Scenarios 3, 6 and 7 run on a scratch journal with throwaway accounts, since
each reads a mailbox; every other scenario runs on the seeded journal with
ready accounts and scratch submissions. A preprint server has no Copyediting
stage, so only scenario 10, its absence scenario, runs there; the accounts,
their passwords, the mail catcher's address and the tooling recipe are in
the footnote. <sup>s</sup>

1. **Open a submission at Copyediting** {OJS OMP}

   Given: Editor, on the dashboard, assigned to a submission accepted from
   review ("External Review" on a press) that sits at Copyediting with no
   file in either list, and on the same submission a Journal Manager who
   is not assigned and a Section Editor whose participation is limited to
   recommendations (on a journal not assigned through "Assign"; on a press
   assigned through "Assign" after the acceptance).

   - **The Copyediting stage**: open the submission's workflow at its
     "Copyediting" entry: the stage bubble under the title reads
     "Copyediting"; the main column shows, top to bottom, the notice box
     "Assign a copyeditor using the Assign link in the Participants list.",
     the "Draft Files" list described under its heading as "These are files
     from the review stage which are to be copyedited", the "Copyediting
     Tasks & Discussions" panel and the "Copyedited Files" list described as
     "These are edited files that will be taken to the production stage";
     the "Participants" panel stands in the right-hand column (Rules 1, 2,
     3a).
   - **The decision buttons**: at the top of the screen, "Send To
     Production", highlighted, then "Move to Review"; no "Schedule For
     Publication" shortcut (Rule 1).
   - **The Journal Manager not assigned**: opens the same submission at
     "Copyediting": the same four panels and both buttons, and no notice
     box (Rule 3; Actors row 2).
   - **The recommending Section Editor**: opens the same submission at
     "Copyediting": the same four panels, with "Assign" on the
     "Participants" panel; no "Send To Production", no "Move to Review",
     and no "Recommend Revisions", "Recommend Accept" or "Recommend
     Decline" control [A5](#a5) (Actors row 6). The notice box turns on
     how they joined the submission (Actors row 2): on a journal it reads
     "Assign a copyeditor using the Assign link in the Participants list."
     as for the Editor; on a press none shows [A11](#a11).
   - **Control**: no status box sits above "Draft Files": the notice box
     takes that slot while the submission is active here (Rule 2).

2. **Accept a submission with its revision** {OJS OMP}

   Given: Editor, on the review round of a submission in review ("External
   Review" on a press), the round holding one file in "Files for Review" and
   one revision uploaded on the round.

   - **"Accept Submission"**: press it; on the wizard's "Select Files" page
     the revision is offered under "Revisions" and the file in "Files for
     Review" is not; tick the revision and complete the wizard: the stage
     bubble reads "Copyediting" and "Draft Files" lists the revision with
     its "No", "File Name", "Date uploaded" and "Type" (Rules 2, 4).
   - **The notice**: above "Draft Files" the notice box reads "Assign a
     copyeditor using the Assign link in the Participants list." (Rules 2,
     3a).
   - **The file's name**: press it: the file downloads (Rule 4).
   - **Control**: the file in "Files for Review" is not listed in "Draft
     Files" (Rule 2).

3. **Assign a Copyeditor with "Request Copyedit"** {OJS OMP}

   Given: Editor, on a scratch journal, assigned to a submission accepted
   from review at Copyediting, with two Copyeditors of the journal not yet
   assigned to it.

   - **"Assign"**: on the "Participants" panel press "Assign", choose the
     first Copyeditor, choose "Request Copyedit" in "Choose a predefined
     message" and complete the form: the notice box above "Draft Files"
     reads "Awaiting Copyedits.", and the "Copyediting Tasks & Discussions"
     panel lists a discussion "Request Copyedit", shown as created by the
     editor (Rule 3b; Side effects).
   - **The Copyeditor's mailbox**: holds the email "Request Copyedit" from
     the assigning editor; its body opens "A new submission is ready to be
     copyedited: {number} — "{title}"", lists the steps to follow and ends
     with a reply link into the discussion (Side effects).
   - **The Copyeditor's Tasks panel**: Copyeditor: sign in and open the
     header's Tasks panel: two rows, "{editor} started a discussion: Request
     Copyedit: …" and "You have been asked to review copyedits for
     "{title}"."; press the panel's "Delete" on the task: the task row is
     gone and the discussion row stays [A4](#a4) (Side effects).
   - **Control**: the second Copyeditor, assigned on the same submission
     through "Assign" with no predefined message chosen and the message box
     left empty, receives no email (Side effects).

4. **The Copyeditor uploads the copyedited file** {OJS OMP}

   Given: Copyeditor, assigned without a message to a submission accepted
   from review ("External Review" on a press) at Copyediting, with an
   Editor assigned to it and no file in either list.

   - **The Editor's notice before the upload**: Editor: open the submission
     at "Copyediting": the notice box reads "Assign a copyeditor using the
     Assign link in the Participants list.", the Copyeditor's assignment
     having opened no discussion [A3](#a3) (Rule 3b).
   - **The Copyeditor's screen**: Copyeditor: open the submission at
     "Copyediting": "Draft Files", "Copyediting Tasks & Discussions",
     "Copyedited Files" and "Participants", with "Upload/Select Files" above
     each list; no notice box, no "Send To Production" and no "Move to
     Review" (Actors rows 1–4, 6).
   - **"Upload/Select Files" on "Copyedited Files"**: press it: the window
     opens titled "Upload/Select Files"; press "Upload File": the
     wizard is titled "Upload Copyedited File", with the steps "1. Upload
     File", "2. Review Details", "3. Confirm" and "Complete"; attach a file,
     finish the wizard, tick the new row in the window and press the
     window's "OK": the file is listed in "Copyedited Files" with its "No",
     "File Name", "Date uploaded" and "Type" (Rules 5, 5b, 6).
   - **The Editor's screen after the upload**: Editor: open the submission
     at "Copyediting" again: no notice box above "Draft Files" (Rule 3c;
     Side effects).
   - **"Delete" on the copyedited file**: Copyeditor: in the file's row menu
     press "Delete": a "Delete" dialog asks "Are you sure you wish to delete
     this item? This action cannot be undone."; press "OK": the row is gone
     from "Copyedited Files"; no notice comes back for the Editor
     [A7](#a7) (Rules 4, 3c).
   - **Control**: the Editor's screen offers "Send To Production" and "Move
     to Review" before and after the upload, which the Copyeditor's never
     does (Actors row 6).

5. **The "Upload/Select Files" window on "Draft Files"** {OJS OMP}

   Given: Editor, on a submission at Copyediting whose "Copyedited Files"
   list holds one file and whose Submission stage holds one submission file,
   "Draft Files" being empty.

   - **The window**: press "Upload/Select Files" above "Draft Files": a
     window titled "Upload/Select Files" opens on one group, "Copyediting",
     listing the copyedited file with its box in the "Select" column clear
     (Rules 5, 5a).
   - **"Show files from all accessible workflow stages."**: tick it: the
     files regroup under the stages, and the Submission stage's file is
     listed under its stage (Rule 5a).
   - **A file from another stage**: tick the Submission stage's file and
     press "OK": "Draft Files" lists it as a new row whose "No" differs from
     the file's on the Submission stage; select "Submission" in the workflow
     menu: the Submission stage still lists the file (Rule 5c).
   - **"Upload File"**: press "Upload/Select Files" again, then "Upload
     File" at the top of the window: the wizard is titled "Upload File",
     with the steps "1. Upload File", "2. Review Details", "3. Confirm" and
     "Complete"; attach a file, finish the wizard, tick the new row in the
     window and press "OK": the new file joins "Draft Files" (Rule 5b).
   - **Control**: open the window once more, tick the copyedited file and
     press the window's "Cancel": the window closes without a question, and
     "Draft Files" lists the same rows as before (Rules 5b, 5c).

6. **"Send To Production"** {OJS OMP}

   Given: Editor, on a scratch journal, with a submission at Copyediting
   holding one file in "Draft Files" and one in "Copyedited Files", its
   Author holding an account on the journal.

   - **The wizard**: press "Send To Production": the wizard opens on "Notify
     Authors", an email to the submission's authors; continue to "Select
     Files", headed "Select files that should be sent to the production
     stage.": the "Copyedited" file is ticked and the "Draft Files" file is
     not; record the decision: the wizard closes on "Sent to Production"
     with "The submission, {title}, was sent to the production stage. The
     author has been notified, unless you chose to skip that email.", and
     the stage bubble reads "Production" (Rule 8).
   - **"Production Ready Files"**: on the Production stage the list holds
     the copyedited file and not the draft file (Rule 8; Side effects).
   - **The "Copyediting" entry after the move**: select "Copyediting" in the
     workflow menu: the two file lists and a discussions panel, headed
     "Production Tasks & Discussions" [A12](#a12), show under the status
     box "The submission is currently in the Production stage.", with no
     decision buttons and no notice; reload the page: the panel between
     the two lists is headed "Copyediting Tasks & Discussions" (Rule 10).
   - **The Author's mailbox**: holds the email "Next steps for publishing
     your submission" (Side effects).
   - **Control**: before the decision the same "Copyediting" entry offered
     "Send To Production" and "Move to Review" and showed no status box
     (Rules 1, 2).

7. **"Move to Review" after a review round** {OJS OMP}

   Given: Editor, on a scratch journal, with a submission accepted from its
   Round 1 at Copyediting, the round holding no reviewer, and one file in
   "Draft Files".

   - **The wizard**: press "Move to Review": the wizard opens on its one
     page, "Notify Authors", headed "Move to Review" (not "Move to
     Submission" [A13](#a13)), under a breadcrumb ending the same; record
     the decision: it closes on "Sent Back from Copyediting" with "The
     submission, {title}, was sent back from the copyediting stage. The
     author has been notified, unless you chose to skip that email." (Rule
     9).
   - **Where it lands**: the workflow shows the review stage on Round 1
     ("External Review" on a press [OMP1](#omp1)), its status box reading
     "Waiting for reviewers to be assigned." (Rule 9a).
   - **The "Copyediting" entry**: select it in the workflow menu: "The
     Copyediting stage has not yet been initiated." above the
     "Participants" panel, and no file list (Rule 9b).
   - **The Author's mailbox**: holds the email "Your submission has been
     moved to review" (Side effects).
   - **Control**: before the decision the "Copyediting" entry listed the
     file in "Draft Files" and offered both buttons (Rules 1, 4).

8. **The author's view** {OJS OMP}

   Given: Author, on My Submissions, with their own submission at
   Copyediting whose "Copyedited Files" holds one file.

   - **The Copyediting stage**: open the submission's workflow at its
     "Copyediting" entry: the "Copyediting Tasks & Discussions" panel and,
     under it, the "Copyedited Files" list described as "These are edited
     files that will be taken to the production stage", listing the file
     with nothing to press: no "Upload/Select Files" above it and no row
     menu (Rule 11; Actors row 4).
   - **What the view leaves out**: no "Draft Files" list, no "Participants"
     panel, no notice box, no "Send To Production" and no "Move to Review"
     (Rule 11).
   - **Control**: an Editor opening the same submission at "Copyediting"
     sees "Draft Files", the "Participants" panel, "Upload/Select Files"
     above "Copyedited Files" and both decision buttons (Rule 1; Actors
     rows 3, 4, 6).

App-specific:

9. **{OMP} "Move to Review" after an internal round only**

   Given: Press Editor, with a monograph accepted from its Internal Review
   round at Copyediting, the round holding no reviewer, and a second
   monograph accepted after an internal and then an external round, also
   at Copyediting.

   - **"Move to Review" on the first monograph**: press it: the decision
     page is headed "Move to Review" (not "Move to Submission"
     [A13](#a13)); record the decision: the workflow shows "Internal
     Review" on Round 1, its status box reading "Waiting for reviewers to
     be assigned." [OMP1](#omp1) (Rules 9, 9a).
   - **Control**: the second monograph, moved alike, lands on
     "External Review" [OMP1](#omp1) (Rule 9a).

10. **{OPS} No Copyediting stage on a preprint server**

    Given: Preprint Server Manager, with a submitted preprint.

    - **The workflow menu**: open the preprint's workflow: the menu lists
      "Production" alone; no "Copyediting" entry [OPS1](#ops1).
    - **The decision buttons**: the Production stage offers "Post the
      preprint" and "Decline Submission"; neither "Send To Production" nor
      "Move to Review" appears anywhere on the screen [OPS1](#ops1).
    - **The "Assign" form**: on the "Participants" panel press "Assign":
      "Choose a predefined message" lists "Discussion (Production)" and
      "Assign Editor", and no "Request Copyedit" or "Discussion
      (Copyediting)"; no Copyeditor is among the roles offered
      [OPS1](#ops1).
    - **The Roles screen**: Settings › Users & Roles › Roles lists Preprint
      Server Manager, Moderator, Author, Reader and Editorial Board Member,
      and no Copyeditor [OPS1](#ops1).
    - **Control**: "Production" in the menu, "Post the preprint" at the top,
      "Assign Editor" in the message list and Moderator on the Roles screen
      are present, so each screen that shows an absence is working
      [OPS1](#ops1).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the only copyedited file deleted: the "Assign a copyeditor…" notice back for the assigned editor ([A7](#a7)): the guard the issue report proposes
  - the "Notification" box "Assign a copyeditor using the Assign link in the Participants list." for an assigned editor after "Accept and Skip Review", after {OMP} "Accept Submission" on Internal Review and after "Move To Copyediting" from Production ([A6](#a6); Rule 3): the guard the issue report proposes, once fixed
  - scenario 1's recommending Section Editor bullet, no notice box on a
    press (A11; Actors row 2): no assertion in the OMP suite
  - scenario 6's "Copyediting" entry bullet, the panel headed "Production
    Tasks & Discussions" from the workflow menu and "Copyediting Tasks &
    Discussions" after a reload (Rule 10): the OJS and OMP suites read only
    the "Tasks & Discussions" ending and never reload
- **Rarely met**:
  - both lists back with their earlier files after a second acceptance, the newly ticked files joining "Draft Files" beside them (Rule 9b): accepting again a submission moved back to review is not an ordinary week's action; scenario 7 stops at the hidden "Copyediting" entry
  - "Stage Assignment" changed on the Roles form, Copyediting unticked for Copyeditor and ticked for Layout Editor (Settings bullet 1): a manager changes a role's stages rarely, not in an ordinary week
- **Nothing new to test**:
  - no confirmation message after the "Upload/Select Files" window's "OK" or the upload wizard's "Complete" (Rule 5): an absence the list's new row already answers; scenarios 4 and 5 press "OK" and read the row
  - "Awaiting Copyedits." after "Assign" with the "Request Copyedit" message on a submission accepted without review or, on a press, from Internal Review (Rule 3a): the flip scenario 3 reads on a submission accepted from review
  - an assigned Section Editor, Guest Editor, Production editor or Site Administrator opening the stage (Actors preamble, rows 1, 6): the panels, notice and buttons scenario 1 reads as the Editor
  - Marketing and sales coordinator assigned here (Actors row 1): the panels and lists scenario 4 reads as the Copyeditor
  - Translator, Volume editor or Chapter Author on their own submission (Actors preamble, row 1): the author view scenario 8 reads as the Author
- **Register carries it**:
  - A6 (no "Assign a copyeditor…" notice on a submission accepted without review, on a press from Internal Review, or moved back from Production; Rules 2, 3a)
  - A3 (the notice flips on a discussion, not on the assignment; Rule 3b; scenario 4 marks it)
  - A7 (no notice back after the last copyedited file is deleted; Rule 3c; scenario 4 marks it)
  - A8 (deleting a copyedited file took its "Draft Files" copy with it; Rule 5c)
  - A1 ("Move to Review" on a never-reviewed submission landing on the Submission stage, its page reading "Move to Submission" while the button and the email say review; Rules 9, 9a)
  - A4 (the Copyeditor's task not cleared by the copyedits; Side effects; scenario 3 marks it)
  - A9 (the message's discussion listed under the Copyeditor's name; Side effects; scenario 3 marks it)
  - A10 (a role's only stage unticked: "saved", still ticked; Settings bullet 1)
  - A11 (no notice for a recommending Section Editor assigned through "Assign" after the acceptance; Actors row 2; scenario 1 marks it)
  - A12 (the "Copyediting" entry's discussions panel headed "Production Tasks & Discussions" after the move when reached from the workflow menu; Rule 10; scenario 6 marks it)
  - A13 (the decision page headed "Move to Submission" on a submission going back to review; Rule 9; scenarios 7 and 9 mark it)
- **Owned by another feature**:
  - a Copyeditor assigned to a submission still in Review: the no-access box (Actors preamble; *Workflow screen & stage access*, scenario 3)
  - the author's "The Copyediting stage has not yet been initiated." before the stage is reached (Rule 11; *Workflow screen & stage access*, scenario 3)
  - "Send to Text Editor" for a Journal Manager (Actors row 5; *Submission files*)
  - clearing a listed file's box removing nothing (Rules 4, 5c; *Submission files*)
  - the row menu's "Update File Details", "More Information" and "Delete" windows (Rule 4; *Submission files*)
  - "Notify Authors" skipped: no email (Rule 8; Side effects; *Editorial decision recording*)
  - the Activity Log lines of both decisions (Side effects; *Submission activity log & notes*)
  - the "Assign" form's roles, Journal Manager absent, and "Cancel" assigning nobody (Actors row 8; *Stage participants*)
  - "Copyedited Files Uploaded: {count}" on My Submissions (Rule 6; *My Submissions*, scenario 3)
  - an edited email template prefilling "Notify Authors" and an edited task template prefilling the "Assign" message (Settings bullets 2–3; *Emails management*, *Tasks & discussions*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-19), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A6](#a6) | No "Assign a copyeditor" notice on Copyediting after skipped review, a press's Internal Review or a return from Production | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A7](#a7) | Deleting the last copyedited file brings no notice back | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A13](#a13) | The page "Move to Review" opens is headed "Move to Submission", also on a submission going back to review | 🐞 | minor | — |
| [A1](#a1) | "Move to Review" sends a submission accepted without review back to the Submission stage; the decision page says so, the button and the author's email still say review | ❓ | user-visible | claim check (claude), 2026-09-26 — reworded: the decision page now names the Submission stage |
| [A3](#a3) | The "Assign a copyeditor" notice flips on a discussion, not on the assignment | ❓ | minor | claim check (claude), 2026-09-18 — holds |
| [A4](#a4) | The Copyeditor's "You have been asked to review copyedits" task is never cleared by the copyedits | ❓ | minor | claim check (claude), 2026-09-18 — holds |
| [A5](#a5) | A recommend-only editor is offered nothing at all on the Copyediting stage | ❓ | minor | claim check (claude), 2026-09-19 — holds |
| [A8](#a8) | Deleting a copyedited file also removed the copy of it in "Draft Files" | ❓ | minor | — |
| [A10](#a10) | A role's last stage cannot be unticked on the Roles form, which still says saved | ❓ | minor | — |
| [A11](#a11) | A recommending Section Editor assigned through "Assign" after the acceptance reads no "Assign a copyeditor" notice | ❓ | minor | claim check (claude), 2026-09-26 — narrowed: the limit to recommendations is not the cause |
| [A12](#a12) | After "Send To Production" the "Copyediting" entry, reached from the workflow menu, heads its discussions panel "Production Tasks & Discussions" | ❓ | minor | claim check (claude), 2026-09-26 — narrowed: a reload shows the Copyediting heading |
| [OMP1](#omp1) | A press's "Move to Review" returns to External Review or, failing any external round, to Internal Review | ✅ | — | claim check (claude), 2026-09-18 — holds |
| [OPS1](#ops1) | A preprint server has no Copyediting stage and no Copyeditor role | ✅ | — | claim check (claude), 2026-09-19 — holds |
| [A2](#a2) | Copyediting: "Upload/Select Files" on "Copyedited Files" opened a window titled "Upload Review File" | ✅ | retired | housekeeping (claude), 2026-10-07 — fixed by pkp/ui-library#1008 |
| [A9](#a9) | The discussion opened by the "Request Copyedit" message was listed as created by the Copyeditor | ✅ | retired | PR review merge (claude), 2026-10-05 — fixed by pkp/pkp-lib#13385 |

### All apps

<a id="a1"></a>
**A1 — "Move to Review" lands on the Submission stage for a submission never reviewed** · ❓ · user-visible.
A deciding editor who accepted a submission with "Accept and Skip Review"
and now presses "Move to Review" expects the submission in review. It goes
back to the Submission stage instead, because there is no review round to
return to. The decision page the button opens says so: its heading, the
last item of its breadcrumb and the browser tab read "Move to Submission".
Everything else still says review: the button itself ("Move to Review"),
the page's "Notify Authors" text ("their submission will undergo further
editorial review") and the author's email ("Your submission has been moved
to review", "It will undergo further review before it can be accepted").
Nothing is lost: the Submission stage offers its decisions again.
Question: should the button and the email follow the destination as the
decision page does, or should the decision open a review round? Lean:
follow the destination; the page has done so since 2026-09-25, and the
button and the email were left behind.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a3"></a>
**A3 — The notice reads the discussions, not the participants** · ❓ · minor.
The notice box tells an editor to assign a copyeditor until a discussion
exists on this stage, and reads "Awaiting Copyedits." from then on. The
"Assign" form's message opens such a discussion, whichever predefined
message is chosen, so the ordinary assignment flips the notice as expected.
But an editor who assigns a Copyeditor with the message box left empty
keeps reading "Assign a copyeditor…", and any discussion opened on this
stage, with no Copyeditor assigned, reads "Awaiting Copyedits.".
Question: should the notice read the Participants panel (a Copyeditor
assigned) rather than the discussions? Lean: yes; the notice names the
Participants list as its condition.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — The Copyeditor's task outlives the copyedits** · ❓ · minor.
The "Request Copyedit" message puts "You have been asked to review copyedits
for "{title}"." into the Copyeditor's Tasks panel. Uploading the copyedited
files, and even "Send To Production", leave the task there; only the
Copyeditor's own "Delete" in the panel removes it, and the discussion row
the same message created stays beside it. The layout and index requests of
the Production stage have completion emails that clear theirs; copyediting
has none.
Question: should the first copyedited file, or "Send To Production", clear
the task? Lean: clear it on "Send To Production", when the copyedits are
accepted.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A recommend-only editor has nothing to do on Copyediting** · ❓ · minor.
An editor whose participation is limited to recommendations gets dedicated
"Recommend Revisions", "Recommend Accept" and "Recommend Decline" controls
on the review stage while a deciding editor is assigned beside them. On
Copyediting they get nothing: the panels show, "Assign" is offered, and no
decision button or recommendation control appears, with or without a
deciding editor beside them, so they cannot send the submission on, move it
back, or recommend either.
Question: is that intended, or should a recommendation be possible here as on
review? Lean: intended; there is no decision to recommend at this stage
short of the move itself, and a deciding editor is always assigned above
them.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — No "Assign a copyeditor" notice on Copyediting after skipped review, a press's Internal Review or a return from Production** · 🐞 · low.
An assigned editor opens Copyediting and finds no "Assign a copyeditor
using the Assign link in the Participants list." notice when the
submission got there in one of three ways:

- "Accept and Skip Review" on the Submission stage;
- "Accept Submission" on a press's Internal Review;
- "Move To Copyediting" on Production.

The notice shows only after "Accept Submission" on a journal's review
round or a press's External Review. Up to 3.3 it showed after skipped
review and after a press's Internal Review too.

Nothing else on the stage is affected, and "Assign" works without the
notice.

The press's Internal Review path is also recorded as
[→ Internal Review stage OMP10](U71-internal-review-stage.md#omp10).
Basis: probe, 2026-10-02. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — The notice does not return when the last copyedited file is deleted** · 🐞 · low.
An editor who deletes the only file in "Copyedited Files" expects the notice
they read before that file was added ("Assign a copyeditor…" or "Awaiting
Copyedits.") to come back, since the list is empty again. No notice shows:
not on the same page, not when the workflow is opened again, not later.
Adding a copyedited file removes the notice as intended; only the removal is
one-sided. The notice shows only on that submission's Copyediting page, where
the empty list still tells the editor where the work stands. The same fault
keeps the author's revisions task from coming back after the only revised
file is deleted (*Review stage & rounds* [A9](U26-review-stage-and-rounds.md#a9)).
Basis: probe, 2026-10-04. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — Deleting a copyedited file removed its copy in "Draft Files"** · ❓ · minor.
A manager copied a copyedited file into "Draft Files" through the
"Upload/Select Files" window (Rule 5c), then deleted the original from
"Copyedited Files" with its row menu's "Delete". The copy in "Draft Files"
went with it, although the "Delete" dialog ("Are you sure you wish to delete
this item? This action cannot be undone.") speaks of one item. Seen once per
app, in that direction only.
Question: is a copied file meant to share its fate with its source? Lean: a
defect, minor; the dialog promises one deletion and the copy's row shows
nothing of the link. What would settle it: copy a draft file into
"Copyedited Files", delete the draft original, and record whether the copy
stays.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a10"></a>
**A10 — A role's last stage cannot be unticked, and the form says saved** · ❓ · minor.
On Settings › Users & Roles › Roles, a manager who opens a role's "Edit"
form, clears its only ticked box under "Stage Assignment" and saves reads
"Your changes have been saved."; the form, reopened, shows the box ticked
again. Clearing one stage while ticking another saves. The form is *Roles
configuration*'s.
Question: is a role meant to keep at least one stage, and if so should the
form say so instead of "saved"? Lean: the guard is intended, the message is
wrong.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — No notice for a recommending editor assigned after the acceptance** · ❓ · minor.
A Section Editor assigned to the Copyediting stage through "Assign" with no
message, after the submission was accepted from review, with participation
limited to recommendations, expects the notice their fellow editors read.
They open the stage to the four panels and no notice, while the Editor already assigned
reads "Assign a copyeditor using the Assign link in the Participants list."
on the same submission. Seen once, on a press. A Section Editor with the
same limit who was not assigned through "Assign" reads the notice, on a
journal and on a press, so the limit is not what withholds it.
Question: should an editor assigned through "Assign" once the submission
sits at Copyediting read the notice the other assigned editors read? Lean:
yes, a defect of that route: the form brings the editors' notices up to
date only when it sends a message, and an editor assigned without one to
a submission accepted without review gets no notice either ([A6](#a6));
what settles it is a deciding Section Editor assigned through the same
form at this stage, with no message, reading or not reading the notice.
Basis: test run. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — The "Copyediting" entry's discussions panel takes the Production heading when reached from the menu** · ❓ · minor.
An editor who selects "Copyediting" in the workflow menu after "Send To
Production" expects the panel between the two file lists to read
"Copyediting Tasks & Discussions", as it did while the submission sat here.
It reads "Production Tasks & Discussions", the heading of the stage the
submission is now in. Reloading the page on the same entry heads the panel
"Copyediting Tasks & Discussions". The lists and the status box are the
Copyediting entry's either way.
Question: after the menu switch, is the panel the Copyediting stage's
discussions under the wrong heading, or the Production stage's discussions
left in place? Lean: the Production stage's panel left in place, since a
reload brings the Copyediting heading; what settles it is a discussion
added on each stage and which one the panel lists after the menu switch.
Basis: test run. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — The page "Move to Review" opens is headed "Move to Submission"** · 🐞 · minor.
A deciding editor who presses "Move to Review" on a submission that has had
a review round expects the decision page to be headed "Move to Review", like
the button, the last item of the breadcrumb above the heading and the
browser tab. The heading reads "Move to Submission" on every submission,
although recording the decision sends this one back to review. Nothing is
lost, but the page contradicts the button at the moment the editor confirms
the email to the authors. Until 2026-09-25 the heading read "Move to
Review"; a regression, not a choice.
Since: 2026-09-25 (1 day) · Basis: probe. <sup>[f-a13](#fn-a13)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — "Move to Review" on a press returns to the review stage the monograph last had** · ✅ · —.
A press has two review stages. "Move to Review" returns the monograph to
External Review when it ever had an external round, otherwise to Internal
Review when it had an internal round, and to Submission when it had neither
(the last case is [A1](#a1)). A journal, with one review stage, needs no such
choice. Intended: the press's two stages are the difference, not the
decision.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server has no Copyediting stage** · ✅ · —.
A preprint server's workflow is a single stage, Production. Its workflow
menu lists "Production" alone (a typed Copyediting address lands on
Production), its Roles screen installs Preprint Server Manager, Moderator,
Author, Reader and Editorial Board Member and no Copyeditor, its "Assign"
form offers those three roles with the predefined messages "Discussion
(Production)" and "Assign Editor", and neither "Send To Production" nor
"Move to Review" exists anywhere on its screens. Intended: the application
ships that way.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

### Retired

<a id="a2"></a>
**A2 — Copyediting: "Upload/Select Files" on "Copyedited Files" opened a window titled "Upload Review File"** · ✅ · retired. Fixed upstream (pkp/ui-library#1008, for pkp/pkp-lib#13461, merged 2026-10-07), verified 2026-10-07 on OJS and OMP: the window opens titled "Upload/Select Files" above "Copyedited Files" as above "Draft Files" (Rule 5). <sup>[f-a2](#fn-a2)</sup>

<a id="a9"></a>
**A9 — The "Request Copyedit" discussion was listed under the Copyeditor's name** · ✅ · retired. Fixed by pkp/pkp-lib#13385 (for pkp/pkp-lib#12593), merged 2026-10-05, with *Stage participants*' A5; seen fixed on OMP `main`. <sup>[f-a9](#fn-a9)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-18 at the checkouts' tips (`checkouts/ojs`, `checkouts/omp`,
`checkouts/ops`, each with its `lib/pkp` and `lib/ui-library`). Every claim
was then driven on running OJS and OMP installs, with OPS as the control, on
2026-09-18 (the notice box, the file lists and window, the two decisions and
their mails) and 2026-09-19 (the screen by role, the settings screens, the
preprint server); each block below names what its drive covered. After
pkp/pkp-lib#12798 (lib/pkp `8240fbe6cc`, PR #12959, and its follow-up
`1ad4a14bb2`, PR #13398, both 2026-09-25, in all three apps; OMP's
matching change `dfa8fce57`), the "Move to Review" decision, the notice
box by role and the "Copyediting" entry after the move were driven again
on OJS and OMP, with OPS as the control, on 2026-09-26 (notes h, f-a1,
f-a11, f-a12, f-a13).

<a id="fn-a"></a>
**a** — The stage's panels: `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`, `WorkflowConfig[WORKFLOW_STAGE_ID_EDITING]`: `getPrimaryItems` pushes `WorkflowNotificationDisplay`, `FileManager` namespace `FINAL_DRAFT_FILES`, `DiscussionManager`, `FileManager` namespace `COPYEDITED_FILES`, in that order; `getSecondaryItems` pushes `ParticipantManager`. `useWorkflowConfigOMP.js` deep-merges `workflowConfigEditorialOMP.js` over the OJS config, and the OMP file defines no `WORKFLOW_STAGE_ID_EDITING` key of its own, so the press shows the OJS roster. Titles and descriptions from `useFileManagerConfig.js`: `FINAL_DRAFT_FILES` → `submission.finalDraft` "Draft Files" and `fileManager.draftFilesDescription`; `COPYEDITED_FILES` → `fileManager.copyeditedFiles` "Copyedited Files" and `fileManager.copyeditedFilesDescription`. The discussions heading is `getDiscussionTitleByStage()` in `managers/DiscussionManager/useDiscussionManagerHelpers.js` → `submission.queries.editorial` "Copyediting Tasks & Discussions". The `common.getPrimaryItems` guard shows `user.authorization.accessibleWorkflowStage` (the no-access box) when the stage is outside `permissions.accessibleStages`, which is U24's rule. Live-probed 2026-09-19 (Rule 1, Actors rows 1 and 9): the four panels in that order, both description lines verbatim and "Participants" on the right for every editorial account on OJS and OMP; "Copyediting Tasks & Discussions" with "Add" and "Copyedited Files" alone for the Author, Translator, Volume editor and Chapter Author; the no-access box for Layout Editor, Proofreader and Funding Coordinator.

<a id="fn-b"></a>
**b** — Stage sets: `registry/userGroups.xml`. OJS: manager (no `stages`, every stage), editor `1,3,4,5,6`, productionEditor `4,5,6`, sectionEditor and guestEditor `1,3,4,5,6`, copyeditor `4`, marketing `4`, designer / indexer / layoutEditor / proofreader `5,6`, funding `1,3`, author and translator `1,3,4,5,6`, externalReviewer `3`, reader / subscriptionManager / editorialBoardMember none. OMP: the same with `2` (Internal Review) added to editor, sectionEditor, funding (`1,2,3`), author and translator; plus volumeEditor `1,2,3,4,5,6`, chapterAuthor `4,5,6`, internalReviewer `2`. Stage 4 is `WORKFLOW_STAGE_ID_EDITING`. Permission levels: `productionEditor` is declared with `roleId` `ROLE_ID_MANAGER` (the Roles grid's "Journal Manager" / "Press Manager"), which is why the role decides, assigns and reads the editors' notices; `translator`, `volumeEditor` and `chapterAuthor` are `ROLE_ID_AUTHOR`, refused by the editorial dashboard's `roleBasedAccessDenied` and served the author config. On-screen names: `default.groups.name.marketing` "Marketing and sales coordinator", `default.groups.name.productionEditor` "Production editor", `default.groups.name.volumeEditor` "Volume editor", `default.groups.name.chapterAuthor` "Chapter Author". The Roles form (`controllers/grid/settings/roles/form/UserGroupForm.php`) heads the boxes "Stage Assignment"; the manager row has no "Edit" because `RoleDAO::getAlwaysActiveStages()` gives `ROLE_ID_MANAGER` every stage. No passthrough key sets a role's stages (scenarios.md), so the other end is reached on the screen only. Live-probed 2026-09-19 (Actors preamble and row 1, Settings bullet 1): every default tick for every role with an "Edit" on OJS and OMP; Copyediting unticked for Copyeditor → the assigned Copyeditor gets "You don't currently have access to that stage of the workflow." and the "Assign" form drops "Copyeditor"; ticked for Layout Editor → the panels and the role offered; the Production editor's notice, buttons and "Assign"; the three author-level roles refused on the editorial address and landing in the author view.

<a id="fn-c"></a>
**c** — Decision roster: `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` in OJS and OMP, `case WORKFLOW_STAGE_ID_EDITING: [new SendToProduction(), new BackFromCopyediting()]`, with no status branch (a submission cannot be declined here). Buttons: `workflowConfigEditorialOJS.js` `getActionItems` pushes `WorkflowActionButton` `editor.submission.decision.sendToProduction` ("Send To Production", `isPrimary`) and `editor.submission.decision.backFromCopyediting` ("Move to Review", `isWarnable`), each guarded by `isDecisionAvailable(submission, DECISION_*)`, which matches the submission's active stage, so the buttons vanish once it moves on (Rule 10). Permissions: `lib/pkp/classes/submission/maps/Schema.php::checkDecisionPermissions()`; an assistant never satisfies `canMakeDecision`; a recommend-only editor gets `canMakeDecision` only when `Repo::decision()->getDecisionTypesMadeByRecommendingUsers($stageId)` is non-empty, and both apps' `classes/decision/Repository.php` return an empty list for every stage but Submission, so the roster is empty for them here (A5). Live-probed 2026-09-18 and 2026-09-19 (Actors rows 6–7, Rule 10, A5): both buttons for the administrator, manager, Editor, assigned Section and Guest Editors and Production editor, none for the Copyeditor, the coordinator or the author; the recommend-only flag set on the Participants row menu's "Edit" › "Edit Assignment" ("This participant is only allowed to recommend an editorial decision…"), after which that Section Editor's Copyediting entry offers no decision button and no "Recommend…" control, with or without a deciding editor assigned beside them, while "Assign" stays; after "Send To Production" every level reads "The submission is currently in the Production stage." with the lists and no buttons.

<a id="fn-d"></a>
**d** — The notice box is `WorkflowNotificationDisplay.vue`, which posts to `notification/fetchNotification` for the types `NOTIFICATION_TYPE_ASSIGN_COPYEDITOR` and `NOTIFICATION_TYPE_AWAITING_COPYEDITS` on `ASSOC_TYPE_SUBMISSION`; `PKPNotificationHandler::fetchNotification()` reads the signed-in user's own rows, so the box is per user. Texts: `notification.type.assignCopyeditors` "Assign a copyeditor using the Assign link in the Participants list." and `notification.type.awaitingCopyedits` "Awaiting Copyedits.". Rows are created and deleted by `PKPEditingProductionStatusNotificationManager::updateNotification()`, for each `StageAssignment` of the submission at its current stage with role `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` (an unassigned manager has no row and sees nothing): at `WORKFLOW_STAGE_ID_EDITING`, with any `SUBMISSION_FILE_COPYEDIT` file both types are deleted; otherwise, with an `EditorialTask` at that stage (the code's comment: "a copyeditor is assigned i.e. there is a copyediting discussion") AWAITING is created and ASSIGN deleted, and with none ASSIGN is created and AWAITING deleted. The recomputation runs on a decision listed by `lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()`, which names `ACCEPT` and `SEND_TO_PRODUCTION` and not `SKIP_EXTERNAL_REVIEW`, `ACCEPT_INTERNAL` or `BACK_FROM_PRODUCTION`, so a submission arriving by those never gets the pair computed (A6); on a participant removed (`StageParticipantGridHandler::deleteParticipant()`), but not on one added: `saveParticipant()`, which saves the "Assign" form, recomputes only the decision-stage notices, and only for a manager-level group; on the assign form's message (`PKPStageParticipantNotifyForm::execute()` → `sendMessage()`, which `AddParticipantForm` inherits and runs only when the message box is not empty, and `StageParticipantGridHandler::sendNotification()`); on a copyedited file added (`submissionFile/Repository.php`, `ManageCopyeditFilesGridHandler::updateCopyeditFiles()`) and on a task saved (`EditorialTaskController`). On a copyedited file deleted, `Repository::delete()` recomputes before `$this->dao->delete()` runs, so the manager still finds the file and deletes both types; nothing runs afterwards (A7). Live-probed 2026-09-18 (Rule 3, Side effects) and 2026-09-19 (Actors row 2): the box is a level-3 "Notification" heading and one paragraph between "Current Submission Language" and "Draft Files"; "Assign a copyeditor…" for every assigned editor on every submission accepted from review (five per app), none for the unassigned manager, the administrator, the Copyeditor or the author; the no-message assignment leaves 3a on the same page and re-landed; the "Request Copyedit" message and the "Discussion (Copyediting)" message both flip it to "Awaiting Copyedits." on the same page, for the editor not in the discussion too; a discussion added from the panel's "Add" leaves the same page unchanged and reads "Awaiting Copyedits." on the next opening; the first copyedited file removes it on the same page; deleting the only copyedited file brings none back (same page, re-landed, minutes later, from 3a and from 3b); after either decision no notice; on a submission seeded or moved by "Accept and Skip Review" no notice for the assigned Section Editor before or after a further editor is assigned through "Assign". Live-probed 2026-09-28 on OJS and OMP (Rules 3, 3a, 3c, 4; Actors row 2; A6), in two to four runs each: "Accept Submission" recorded on screen on a press's Internal Review round 1 ("Notify Authors", "Notify Reviewers", "Select Files" with "Revisions" reading "No items found.", closing on "Submission Accepted") and a seeded `['sendInternalReview', 'acceptFromInternal']` monograph showed the assigned Press editor and Series editor no "Notification" heading on landing or after a reload, while "Accept Submission" on External Review and a journal's review round showed both editors "Assign a copyeditor…" on landing and after a reload; on the internal path and on a seeded "Accept and Skip Review" submission (OJS and OMP) no heading before the assignment, then after "Assign" of a Copyeditor with the "Request Copyedit" message (page notices "Notification sent to users." and "User added as a stage participant.", the panel listing "Discussion Request Copyedit…") both assigned editors read "Awaiting Copyedits." on the same page and after a reload, as the External Review and journal controls flipped from "Assign a copyeditor…"; a file ticked into or uploaded to "Draft Files" left "Assign a copyeditor…" standing, and the first "Copyedited Files" row removed the box for the Editor and the Section editor, on the same page and after a reload.

<a id="fn-e"></a>
**e** — "Draft Files": `useFileManagerConfig.js` `FINAL_DRAFT_FILES`, `fileStage` `SUBMISSION_FILE_FINAL`, actions for `ROLE_ID_SUB_EDITOR` / `MANAGER` / `SITE_ADMIN` / `ASSISTANT`: `FILE_LIST`, `FILE_SELECT_UPLOAD`, `FILE_EDIT`, `FILE_DELETE`, `FILE_SEE_NOTES`; no `ROLE_ID_AUTHOR` entry, so the author's config never mounts it. Roles are matched by `useCurrentUser().hasCurrentUserAtLeastOneAssignedRoleInStage()` against `stage.currentUserAssignedRoles`, which `lib/pkp/classes/submission/maps/Schema.php` fills from the user's stage assignments, or from the global manager / site-admin role when the user is assigned in no role (so an unassigned Journal Manager gets the full controls). Columns from `getColumns()`: `common.numero` "No", `common.fileName` "File Name", `common.dateUploaded` "Date uploaded", `common.type` "Type", plus a screen-reader-only `common.moreActions` "More Actions" column; row menu from `getItemActions()`: `grid.action.updateFile` "Update File Details" (window "Edit a file"), `grid.action.moreInformation` "More Information" (window "Information Center: {file}"), `grid.action.delete` "Delete" (a `common.delete` dialog with `common.ok` / `common.cancel`). Top button `editor.submission.uploadSelectFiles` "Upload/Select Files" → `useFileManagerActions.fileSelectUpload()` opens the legacy grid `grid.files.final.FinalDraftFilesGridHandler` op `selectFiles`, whose `ManageFinalDraftFilesForm` renders the `ManageFinalDraftFilesGridHandler` grid (`SubmissionFilesCategoryGridDataProvider(SUBMISSION_FILE_FINAL)`); its categories are the stages in `ASSOC_TYPE_ACCESSIBLE_WORKFLOW_STAGES`, shown only once "Show files from all accessible workflow stages." is ticked. Save runs `ManageSubmissionFilesForm::execute()`: a ticked file not yet in the list is copied in by `importFile()` (a clone carrying `sourceSubmissionFileId`); a listed file's tick sets its `viewable` flag and a cleared box removes nothing. The window is *Submission files*' mechanism; the instantiation facts are here. Live-probed 2026-09-18 (Rules 4–5, Actors row 3): the columns, the row menu at every editorial level, the "Delete" dialog's sentence with OK and Cancel, the file-name download; the window opening on the single "Copyediting" group with the other list's files included and every box clear, a row just copied in included (only a listed file whose own box was ticked and saved shows ticked on later opens, and in that list's window alone), the stage groups after the box is ticked (OJS Submission / Review / Copyediting / Production; OMP with Internal and External Review; a Section Editor also "Done"; a Copyeditor "Copyediting" alone); the upload control rendered as the link "Upload File" (not the "Add a file" the code read expected) and the wizard's titles and steps; the Submission stage's file copied in as a new row with a new number while "Submission Files" kept the original; a copyedited file copied into "Draft Files" and a draft file into "Copyedited Files" the same way; every box cleared and saved removing nothing; the window's "Cancel" dropping a tick and the wizard's "Cancel" leaving "No Items", both without a dialog. Test runs 2026-09-19 on OJS and OMP (scenarios 4, 5, 6, 7; every upload of the runs): a file uploaded through the window's wizard appeared in the window's grid with its box clear and joined the list only once that box was ticked and the window saved with "OK"; saved with the box clear, the list stayed as it was. Live-probed 2026-09-28 on OJS and OMP (Rules 5, 5a, 5b, 5c; Actors row 3), two runs: "OK" after a Submission-stage file ticked into "Draft Files", a file uploaded into "Draft Files", the draft copy ticked into "Copyedited Files" and a "Copyedited Files" upload, as the Editor, the same ticks as the Section editor and a "Copyedited Files" upload as the Copyeditor: no notice on the page, read at once and after a reload, and none on the wizard's "Complete", each list showing its new row; control on the review round's "Upload/Select Files" ("Current Review Files For Round 1"), a file ticked and "OK" as the Editor and the Section editor: "Review files updated." each time on both apps. The same drives saw again the two window titles of that date ("Upload/Select Files" from "Draft Files", "Upload Review File" from "Copyedited Files"), the link "Upload File" and the wizard titles, every box opening clear, the window's "Cancel" dropping a tick with no dialog, and both "Upload/Select Files" buttons for the Copyeditor. Live-probed 2026-10-07 on OJS and OMP (Rule 5), after pkp/ui-library#1008: the window opened titled "Upload/Select Files" from each list (note f-a2).

<a id="fn-f"></a>
**f** — "Copyedited Files": `useFileManagerConfig.js` `COPYEDITED_FILES`, `fileStage` `SUBMISSION_FILE_COPYEDIT`; `ROLE_ID_AUTHOR` gets `FILE_LIST` alone (no top button, `getItemActions()` returns an empty list); the editorial roles the same set as `FINAL_DRAFT_FILES`. `uploadSelectTitleKey` is `editor.submission.uploadSelectFiles` "Upload/Select Files", as on `FINAL_DRAFT_FILES` (until pkp/ui-library#1008, 2026-10-07, it was `editor.submissionReview.uploadFile` "Upload Review File": note f-a2); `gridComponent` `grid.files.copyedit.CopyeditFilesGridHandler` op `selectFiles` → `ManageCopyeditFilesGridHandler`, whose `updateCopyeditFiles()` recomputes the notices (note d). Server side the author may read copyedit files: `lib/pkp/classes/submissionFile/Repository.php::getAssignedFileStages()` adds `SUBMISSION_FILE_COPYEDIT` for an author assignment at `WORKFLOW_STAGE_ID_EDITING` with `SUBMISSION_FILE_ACCESS_READ` and never `SUBMISSION_FILE_FINAL`; `PKPSubmissionFileController::getMany()` filters the listing by that set. The My Submissions cell is *My Submissions*' rule 7c. Live-probed 2026-09-18 (Rule 6, Rule 11, Actors row 4): the same columns and row menu as "Draft Files" at every editorial level; the author's rows carrying the file-name link only, which downloads the file, and no "More Actions" or "Upload/Select Files"; the first copyedited file removing the assigned editor's notice; "Copyedited Files Uploaded: 0", "2" and "1" on the author's My Submissions row as files were added and deleted, a file copied in from "Draft Files" counted.

<a id="fn-g"></a>
**g** — `lib/pkp/classes/decision/types/SendToProduction.php`: `getStageId()` `WORKFLOW_STAGE_ID_EDITING`, `getNewStageId()` `WORKFLOW_STAGE_ID_PRODUCTION`; `getSteps()` adds an `Email` step (`editor.submission.decision.notifyAuthors` "Notify Authors", mailable `DecisionSendToProductionNotifyAuthor`, `toRoleIds` `[ROLE_ID_AUTHOR]`) only when the submission has author participants, then a `PromoteFiles` step (`editor.submission.selectFiles` "Select Files", `editor.submission.decision.promoteFiles.production` "Select files that should be sent to the production stage.", target `SUBMISSION_FILE_PRODUCTION_READY`) with `addFileList(__('submission.copyedited'), …SUBMISSION_FILE_COPYEDIT)` selected by default and `addFileList(__('submission.finalDraft'), …SUBMISSION_FILE_FINAL, false)` not selected. `getCompletedLabel()` `editor.submission.decision.sendToProduction.completed` "Sent to Production"; `getCompletedMessage()` `….completed.description`. The arrival at Copyediting is `Accept` (review) and `SkipExternalReview` (submission) with `getNewStageId()` `WORKFLOW_STAGE_ID_EDITING`; their `PromoteFiles` target is `SUBMISSION_FILE_FINAL`, which is why the ticked files land in "Draft Files"; `Accept` lists the round's `SUBMISSION_FILE_REVIEW_REVISION` files ("Revisions") and `SkipExternalReview` the `SUBMISSION_FILE_SUBMISSION` files. No app subclasses either decision type. Live-probed 2026-09-18 (Rule 8, Side effects) and 2026-09-19 (Rule 2): the two pages, "Skip this email" landing on "Select Files", "Copyedited" ticked and "Draft Files" clear, an empty pair still recording, the bubble "Production", the ticked files as new rows in "Production Ready Files" and the unticked draft absent, the closing window "Sent to Production" with its message and the one link "View Submission Summary" back to the workflow; the wizard's "Cancel" asking "Are you sure you want to cancel this decision?" ("Cancel Decision" / "Keep Working"), "Cancel Decision" returning to Copyediting with both buttons and an edited subject dropped (the dialog is *Editorial decision recording*'s); "Accept Submission" listing "Revisions" alone (OJS with a file in "Files for Review" only: no box, "Draft Files" "No Items"; OMP with a revision ticked: a new "Draft Files" row) and "Accept and Skip Review" listing "Submission Files". Live-probed 2026-09-28 on OMP (Rule 2; note d): "Accept Submission" on Internal Review round 1 also moved the monograph to Copyediting, its "Select Files" page offering "Revisions". The way back from Production is `BackFromProduction` (`getNewStageId()` `WORKFLOW_STAGE_ID_EDITING`); walked 2026-10-02 on OJS and OMP (Rule 2; note f-a6): "Move To Copyediting" recorded on Production reopened the submission on "Copyediting".

<a id="fn-h"></a>
**h** — `lib/pkp/classes/decision/types/BackFromCopyediting.php`: since pkp/pkp-lib#12798 (2026-09-25) `getLabel(?string $locale = null, ?Submission $submission = null)` matches `getNewStageId($submission, null)`: a review stage gives `editor.submission.decision.backFromCopyediting` "Move to Review", anything else, a call without the submission included, gives `editor.submission.decision.backFromCopyediting.toSubmission` "Move to Submission" (lib/pkp's `locale/en/submission.po`, no app override). `DecisionHandler` passes the submission for the browser title and the breadcrumb, and so do the submission's `availableEditorialDecisions`, the decision POST's answer and the email variable `{$decision}`; `templates/decision/record.tpl` builds the page heading from `{$decisionType->getLabel()}` without it (A13). The workflow button is the ui-library's fixed `t('editor.submission.decision.backFromCopyediting')` in `workflowConfigEditorialOJS.js` (note c), not the API's label, so it reads "Move to Review" on every submission (A1). `getNewStageId()` returns `WORKFLOW_STAGE_ID_EXTERNAL_REVIEW` when `ReviewRoundDAO::submissionHasReviewRound()` finds an external round, else `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` when it finds an internal one, else `WORKFLOW_STAGE_ID_SUBMISSION` (A1, OMP1); `runAdditionalActions()` sets the last review round's status to `REVIEW_ROUND_STATUS_RETURNED_TO_REVIEW`, a value that never reaches a screen (the round's status box is recomputed from its reviewers, *Review stage & rounds* Rules 5–6), and sends `DecisionBackFromCopyeditingNotifyAuthor`; `getSteps()` adds the "Notify Authors" `Email` step only. `getCompletedLabel()` "Sent Back from Copyediting". Files are never deleted by a decision; the Copyediting entry hides its lists while the stage is behind the active one and `Accept`'s `PromoteFiles` copies the newly ticked files into `SUBMISSION_FILE_FINAL` beside them. Live-probed 2026-09-18 (Rule 9, Side effects, A1, OMP1): the one-page wizard; a journal's submission landing on "Review (Round 1)" and a press's on External Review, a press with an internal round only on "Internal Review (Round 1)", a press with both on External Review; the round's box "Waiting for reviewers to be assigned." with no reviewers and "New reviews have been submitted." with a completed review, never a returned sentence; the round's decisions offered again; the never-reviewed submission landing on Submission with its decisions offered again; the closing window "Sent Back from Copyediting" with its message and "View Submission Summary"; while back in review the Copyediting entry reading "The Copyediting stage has not yet been initiated." with the Participants panel and no lists; after "Accept Submission" again both lists back with the earlier files, and a revision ticked on a third acceptance joining "Draft Files"; the log line under the assigned Section Editor's own name; the email sent, and none when skipped. Live-probed 2026-09-26 on OJS and OMP, after pkp/pkp-lib#12798 (Rule 9, 9a, 9b; Actors row 7): the button read "Move to Review" for the manager, the Editor and the assigned Section Editor on every submission, reviewed or not, and a recommend-only Section Editor had none; the one-step page "1 Notify Authors"; the breadcrumb's last item and the browser title "Move to Review" after a review round (OMP: after an internal round only too) and "Move to Submission" on a never-reviewed submission, the heading "Move to Submission" on both (A13); the landings, the round boxes, the hidden Copyediting entry and the lists back after a new acceptance as above; the email "Your submission has been moved to review" on every path, none when skipped; the log line under the name of whoever pressed the button.

<a id="fn-i"></a>
**i** — `workflowConfigAuthorOJS.js` and `workflowConfigAuthorOMP.js` both define `[WORKFLOW_STAGE_ID_EDITING].getPrimaryItems` as `DiscussionManager` then `FileManager` namespace `COPYEDITED_FILES`; neither defines `getSecondaryItems` or `getActionItems` for the stage, and the author config has no `WorkflowNotificationDisplay` anywhere. The common `getPrimaryItems` stops at `WorkflowSubmissionStatus` while `hasNotSubmissionStartedStage()` holds (the "has not yet been initiated." box, U24 Rule 15a). The author's controls on the file list are note f's. Live-probed 2026-09-18 (Rule 11): the author's headings "Copyediting Tasks & Discussions" and "Copyedited Files" only, buttons "Library" and the panel's "Add", no "Notification" heading; before the stage, "Status" with "The Copyediting stage has not yet been initiated." and nothing else.

<a id="fn-j"></a>
**j** — `lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php::execute()` → `sendMessage()`: the message creates an `EditorialTask` of type `DISCUSSION` with `createdBy` the recipient's id (A9: the panel therefore lists the Copyeditor as the creator) and a `NOTIFICATION_TYPE_NEW_QUERY` task row for them, and mails the message with `subject($template->getLocalizedData('title'))`, so the subject is the template's name "Request Copyedit" and the sender the signed-in editor; the locale's `emails.copyeditRequest.subject` ("Submission {$submissionId} is ready to be copyedited for {$contextAcronym}") is not used on this path. For the `COPYEDIT_REQUEST` template it also calls `_addAssignmentTaskNotification()` with `NOTIFICATION_TYPE_COPYEDIT_ASSIGNMENT` for the assignee and logs `SubmissionEmailLogEventType::COPYEDIT_NOTIFY_COPYEDITOR`. Task text: `PKPNotificationManager::getNotificationMessage()` → `notification.type.copyeditorRequest` "You have been asked to review copyedits for "{$title}"."; its link is the editorial dashboard with `workflowSubmissionId`. No code path deletes `NOTIFICATION_TYPE_COPYEDIT_ASSIGNMENT` (the grep of lib/pkp and both apps finds its creation only; the `LAYOUT_COMPLETE` / `INDEX_COMPLETE` branches clear their siblings) (A4). The Vue "Participants" panel opens the legacy `StageParticipantGridHandler` ops `addParticipant` and `viewNotify`, so the same form serves both; its "Choose a predefined message" list holds the stage's task templates (the registry templates the context factory installs; on a preprint "Discussion (Production)" and "Assign Editor"). Live-probed 2026-09-18 (Side effects, A4, A9) and 2026-09-19 (Actors row 8, Rule 7): the form's groups on OJS (Journal editor, Production editor, Section editor, Guest editor, Copyeditor, Marketing and sales coordinator, Author, Translator) and OMP (Press editor, Production editor, Series editor, Copyeditor, Marketing and sales coordinator, Author, Volume editor, Chapter Author, Translator), never the manager group; the templates "Discussion (Copyediting)" and "Request Copyedit"; "Cancel" after a user is chosen leaving the participants unchanged; the email "Request Copyedit" from the editor with the body quoted in Side effects and the discussion footer, none for a Copyeditor assigned without a message; the two Tasks rows, both surviving the first copyedited file and "Send To Production", the task row removed at once by the panel's "Delete" with the discussion row staying; the discussion row "Discussion Request Copyedit Created by: {Copyeditor}" without a "Discussion created by … on …" line, against an editor's own discussion carrying both.

<a id="fn-k"></a>
**k** — OPS: `classes/core/Application.php::getApplicationStages()` returns `[WORKFLOW_STAGE_ID_PRODUCTION]`; `registry/userGroups.xml` installs manager, sectionEditor, author (`5,6`), reader and editorialBoardMember only, no copyeditor; `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` returns nothing outside Production and Done. `workflowConfigEditorialOPS.js` names `WORKFLOW_STAGE_ID_EDITING` once, in the header's "Preview" condition, and defines no stage entry for it. The scenario API rejects `copyeditor` as a role key on OPS (users.md section 2). Live-probed 2026-09-19 (Purpose, OPS1): the workflow menu "Workflow › Production" alone with "Post the preprint" and "Decline Submission"; a typed `workflowMenuKey=workflow_4` rewritten to `workflow_5` for the manager and the Moderator and landing the author on the publication pages; the Roles grid's five rows; the "Assign" form's three roles and two Production templates; Manage Emails without any of the three template names; the scenario API refusing `copyeditor`.

<a id="fn-l"></a>
**l** — `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php::submission()` answers `redirectUrl()` to `dashboard/mySubmissions?workflowSubmissionId=<id>`; the template `lib/pkp/templates/controllers/tab/authorDashboard/editorial.tpl` (the old "Copyediting" tab with its copyedited-files grid, guarded by `stageId >= WORKFLOW_STAGE_ID_EDITING` and `$canAccessCopyeditingStage`, else `submission.stageNotInitiated` "Stage not initiated.") is therefore never rendered. The forward itself is U24's Rule 2b. Live-probed 2026-09-18 (Rule 12): the own author lands on My Submissions with the Copyediting panels (`workflowMenuKey=workflow_4`) and no tab strip; a manager, a Copyeditor and a stranger author get U24's refusals; a preprint's author lands on the preprint's publication pages.

<a id="fn-m"></a>
**m** — `workflowConfigEditorialOJS.js` pushes the `editor.submission.schedulePublication` button in `[WORKFLOW_STAGE_ID_SUBMISSION].getActionItems` and `[WORKFLOW_STAGE_ID_PRODUCTION].getActionItems` only; `[WORKFLOW_STAGE_ID_EDITING].getActionItems` holds the two decision buttons alone. OMP shows the shortcut on Production only; its Submission stage has none (*[Submission stage](U25-submission-stage.md)* Rule 7). Live-probed 2026-09-19 (Rule 1): none on Copyediting on either app; OJS Submission and Production carry it, OMP Production alone.

<a id="fn-n"></a>
**n** — `useFileManagerConfig.js`: `FILE_SEND_TO_EDITOR` is granted to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER` on both lists and offered per row only when the file's extension is in `PANDOC_IMPORT_EXTENSIONS` (`docx`, `odt`, `rtf`, `tex`, `latex`, `md`, `markdown`); label `grid.action.sendToTextEditor` "Send to Text Editor"; it opens `WorkflowVersionDialogBody` in mode `sendToTextEditor` (dialog title `fileManager.sendFileToTextEditor` "Send File to Text Editor"). Mechanics belong to *Submission files*. Live-probed 2026-09-19 (Actors row 5): the entry on a Markdown row and not on a PDF row for the administrator and the manager, never for the Section Editor, the Copyeditor or the coordinator; pressing it opens "Send File to Text Editor" ("To which version would you like to send this file?", "Create New Version" / an unassigned version, Cancel / Confirm).

<a id="fn-o"></a>
**o** — `PKPNotificationManager` maps `Decision::SEND_TO_PRODUCTION` to `NOTIFICATION_TYPE_EDITOR_DECISION_SEND_TO_PRODUCTION`; `EditorDecisionNotificationManager::updateNotification()` deletes the submission's earlier editor-decision rows for the given users and creates the new one at `NOTIFICATION_LEVEL_NORMAL` (not a task), text `notification.type.editorDecisionSendToProduction` "Production process started.", title `notification.type.editorDecisionTitle` "Latest editor decision.". Live-probed 2026-09-18 (Side effects): the row is written but no author screen shows "Production process started." (not the My Submissions row, the header's Tasks panel, which lists tasks only, nor the workflow's Copyediting or Production entries), so the body no longer claims it. Log lines: `editor.submission.decision.sendToProduction.log` "{$editorName} sent this submission to the production stage."; for the other decision `….backFromCopyediting.log` "{$editorName} has sent this submission back from the copyediting stage." (the log is *Submission activity log & notes*'); both seen the same day, plus "An email has been sent: Next steps for publishing your submission" when the email was not skipped.

<a id="fn-p"></a>
**p** — Template names on Settings › Workflow › Emails: `mailable.decision.sendToProduction.notifyAuthor.name` "Sent to Production", `mailable.decision.backFromCopyediting.notifyAuthor.name` "Submission Sent Back from Copyediting"; default subjects `emails.editorDecisionSendToProduction.subject` "Next steps for publishing your submission", `emails.editorDecisionBackFromCopyediting.subject` "Your submission has been moved to review". Both mailables carry `fromRoleIds [ROLE_ID_SUB_EDITOR]`, `toRoleIds [ROLE_ID_AUTHOR]`. "Request Copyedit" is not a mailable on that screen: it is an `EditorialTask` template (`PKP\editorialTask\Template`) listed on the Workflow Settings tab "Tasks and Discussions" under "Copyediting Stage", edited in the window "Edit Task and Discussion Template" (Name, "Mark as unrestricted" / "Limit access to specific roles", the task information, a Discussion body, "Automatically add this task and/or discussion when a submission reaches the stage"); its title is the sent email's subject (note j). No passthrough key edits a template (scenarios.md). Live-probed 2026-09-19 (Settings bullets 2–3): Manage Emails listing the two mailables with their subjects and finding "No items found." for "Request Copyedit"; an edited "Sent to Production" subject and body prefilling "Send To Production: Notify Authors" on OJS and OMP; an edited "Request Copyedit" Discussion body prefilling the "Assign" form's message.

<a id="fn-q"></a>
**q** — Pointers and scope prose. The passages carrying this mark name features that describe their own screens and claim no screen of their own; the drives of 2026-09-18 and 2026-09-19 opened the screens they name only on the way to this stage's ("Edit a file", "Information Center: {file}", "Production Ready Files", the header's Tasks panel, Manage Emails, the Roles "Edit" form, My Submissions' "View").

<a id="fn-s"></a>
**s** — Seeding for the scenarios: the seeded journal `publicknowledge` and roster accounts (passwords = username doubled), scratch submissions through `POST scenarios/submission` with submitter `author.alex`. A submission at Copyediting after review: `decisions: ['sendExternalReview', 'accept']` with one `reviewRounds` entry (a completed `reviewer.julia`; on the press add `series: 'monographs'`); accepted without review: `decisions: ['skipExternalReview']`, which carries no "Assign a copyeditor…" notice for its editors (A6), nor does a press's `['sendInternalReview', 'acceptFromInternal']`, so a notice scenario seeds `accept` (on the press after External Review); a press with an internal round only: `decisions: ['sendInternalReview', 'acceptFromInternal']` with one `reviewRounds` entry of `stage: 'internal'`. A Copyeditor: `participants: [{username: 'copyeditor.carla', role: 'copyeditor'}]`, which writes the assignment row without the "Assign" form's message, so on an `accept` seed the notice stays at "Assign a copyeditor…" (Rule 3a) until a discussion exists; the "Request Copyedit" path is driven on screen. Seeded submissions carry no files: a test uploads into "Draft Files" or "Copyedited Files" through "Upload/Select Files" › "Upload File" (a submission-stage file for the tick case comes from the Submission stage's "Submission Files" panel; a revision for the acceptance case is uploaded on the round). The notice box is read by its level-3 "Notification" heading. Mail reads are scoped by recipient in Mailpit at `http://127.0.0.1:8025`, so an email scenario runs on a scratch journal from `POST scenarios/context` with throwaway `roles: ['editor']`, `['copyeditor']` and `['author']` accounts. The roster holds no recommend-only assignment (the flag is set on screen through the Participants row's "Edit Assignment"). Editors: `editor.diana` (OJS, OMP), `manager.maya` for the unassigned-manager case; `sectioneditor.ana` is auto-assigned on a journal (section ART) but a monograph needs an explicit `participants` entry for a Series editor. Never decide on a shared roster submission. Per scenario: 1 an `accept` seed with `sectioneditor.omar` in `participants`, whose recommend-only flag the test sets on screen through the Participants row's "Edit Assignment" before the read, and `manager.maya` as the unassigned Journal Manager (on the press `sectioneditor.omar` is a Series editor of `monographs` and auto-assigned on submit, so the recommending editor is `sectioneditor.ravi`, assigned on screen through "Assign" with "Assignment privileges" ticked after the seed; the two routes are what A11 turns on); 2 a `sendExternalReview` seed, the test uploading one file through the round's "Files for Review" panel and one revision through its "Revisions Uploaded" panel before pressing "Accept Submission"; 4 an `accept` seed with `copyeditor.carla` in `participants`, the Copyeditor uploading through "Copyedited Files"; 5 an `accept` seed, the test uploading one copyedited file through "Copyedited Files" and one submission file through the Submission stage's "Submission Files" panel first; 8 an `accept` seed with one file uploaded by `editor.diana` through "Copyedited Files", read as `author.alex`; 9 `['sendInternalReview', 'acceptFromInternal']` for the first monograph and `['sendInternalReview', 'sendExternalReview', 'accept']` for the second; 10 a submitted preprint on the preprint server's `publicknowledge`, read as its manager. Scenarios 7 and 9 seed no `reviewRounds` entry, so the round the submission returns to has no reviewer and its box reads "Waiting for reviewers to be assigned.". Scenarios 3, 6 and 7 run on one scratch journal from `POST scenarios/context` with throwaway `users[]` of `roles: ['editor']`, `['copyeditor']` (two accounts, for scenario 3's control) and `['author']`; each of its submissions is seeded with the throwaway author as `submitter` and the throwaway editor in `participants` (nobody is auto-assigned on a scratch journal, and the notice shows only to an assigned editor); scenario 6's submission has one file uploaded through each list first, scenario 7's one through "Draft Files". Mailpit is read by recipient address; scenario 3's no-mail control is bounded by the first Copyeditor's email arriving. The recipe is the tooling's: no screen shows it.

<a id="fn-a1"></a>
**f-a1** — `BackFromCopyediting::getNewStageId()` (note h) falls through to `WORKFLOW_STAGE_ID_SUBMISSION` when `submissionHasReviewRound()` is false for both review stages. Issue pkp/pkp-lib#12798 asked for "move to" wording that follows the destination; its change (lib/pkp `8240fbe6cc` and `1ad4a14bb2`, 2026-09-25) made `getLabel()` return "Move to Submission" on this path (note h), which reaches the decision page's breadcrumb and title, the submission's `availableEditorialDecisions` ("30:Move to Submission" here, "30:Move to Review" on a reviewed submission), the decision POST's `label` and `{$decision}`, but not the ui-library's workflow button (a fixed key), the "Notify Authors" step's description `editor.submission.decision.backFromCopyediting.notifyAuthorsDescription` or the mailable, whose subject and body are unchanged. Before it, the label key `editor.submission.decision.backFromCopyediting` read "Move to Review" everywhere, and the mailable's body (`emails.editorDecisionBackFromCopyediting.body`) says "has been moved to the review stage. It will undergo further review before it can be accepted for publication." The class doc-comment states the three-way fall-through as designed, which is why the lean is on the wording. Live-probed 2026-09-18 on OJS and OMP: the never-reviewed submission landed on "WORKFLOW: SUBMISSION" with the bubble "Submission" and its decisions offered again; the wizard's page read "Send an email to the authors to let them know that copyediting is cancelled and their submission will undergo further editorial review."; the author's mail carried the subject and body quoted. Live-probed 2026-09-26 on OJS and OMP, after that change: the button "Move to Review"; the page's heading, breadcrumb and browser title "Move to Submission"; the same "Notify Authors" sentence; the recorded decision answered "Move to Submission"; the author's mail "Your submission has been moved to review" with the body quoted; the landing on "WORKFLOW: SUBMISSION" with the bubble "Submission" and its decisions offered. `{$decision}` typed into the email body rendered "Move to Submission" on a never-reviewed submission and "Move to Review" on a reviewed one; no default template uses it.

<a id="fn-a2"></a>
**f-a2** — Before the fix: `useFileManagerConfig.js` `COPYEDITED_FILES.uploadSelectTitleKey: tk('editor.submissionReview.uploadFile')` ("Upload Review File"), where `FINAL_DRAFT_FILES` uses `editor.submission.uploadSelectFiles` ("Upload/Select Files"); `fileSelectUpload()` passes the key straight to `openLegacyModal({title})`. Live-probed 2026-09-18 on OJS and OMP at every editorial level: the outer title "Upload Review File", the inner heading "Copyedited", the wizard "Upload Copyedited File"; uploads through it landed in the list.
Fixed by pkp/ui-library#1008 (for pkp/pkp-lib#13461; ui-library `main` `79d20a20`, merged 2026-10-07; on `stable-3_5_0` pkp/ui-library#1009, `79ce6e3b`): `COPYEDITED_FILES.uploadSelectTitleKey` is now `editor.submission.uploadSelectFiles`, the key `FINAL_DRAFT_FILES` uses. Live-probed 2026-10-07 on OJS and OMP `main` (ojs `3265fdc673`, omp `0c6a3ebed1`, `lib/ui-library` `7503fab4` in the three apps), default dataset freshly reset, as the assigned editor `dbarnes` on the dataset's submission at Copyediting (OJS 3, OMP 7): "Upload/Select Files" above "Draft Files" and above "Copyedited Files" each opened a window titled "Upload/Select Files", holding the group "Copyediting" with "No Items"; OPS has no Copyediting stage.

<a id="fn-a3"></a>
**f-a3** — `PKPEditingProductionStatusNotificationManager::updateNotification()`, the `WORKFLOW_STAGE_ID_EDITING` branch (note d): the "copyeditor assigned" test is `EditorialTask::withAssoc(ASSOC_TYPE_SUBMISSION, $submissionId)->withStageId(WORKFLOW_STAGE_ID_EDITING)->first()`, the code's own comment reading "If a copyeditor is assigned i.e. there is a copyediting discussion"; no stage-assignment or user-group check enters it. The same proxy is used for the production notices. Live-probed 2026-09-18 on OJS and OMP: the no-message assignment left "Assign a copyeditor…" for both assigned editors; an editor's own discussion with the author, no Copyeditor on the submission, read "Awaiting Copyedits." once the workflow was reopened; the "Discussion (Copyediting)" template sent through "Assign" flipped it as the "Request Copyedit" one does.

<a id="fn-a4"></a>
**f-a4** — `PKPStageParticipantNotifyForm::execute()` creates `NOTIFICATION_TYPE_COPYEDIT_ASSIGNMENT` on `COPYEDIT_REQUEST`; `NotificationManagerDelegate` subclasses and the decision repository touch only the `ASSIGN_COPYEDITOR` / `AWAITING_COPYEDITS` pair; a grep for the constant across `lib/pkp`, `ojs` and `omp` finds `Notification.php` (definition), `PKPNotificationManager.php` (message and link) and the notify form (creation) only. Live-probed 2026-09-18 on OJS and OMP: the row survived the first copyedited file and "Send To Production"; ticking it and pressing the panel's "Delete" removed it at once without a confirmation, the "{editor} started a discussion" row staying.

<a id="fn-a5"></a>
**f-a5** — Note c: `checkDecisionPermissions()` grants `canMakeDecision` to a recommend-only user only when `getDecisionTypesMadeByRecommendingUsers($stageId)` is non-empty, and both apps' `decision/Repository.php` list a type for `WORKFLOW_STAGE_ID_SUBMISSION` alone; `getAvailableEditorialDecisions()` then returns `[]`, and the review stage's `Recommend…` controls are the review config's, absent from `[WORKFLOW_STAGE_ID_EDITING]`. The Submission-stage counterpart is *Submission stage*'s A2 (probed 2026-08-02). Live-probed 2026-09-18 and 2026-09-19 on OJS and OMP: the recommend-only Section Editor saw "Recommend Revisions", "Recommend Accept", "Recommend Decline" on the review round only with a deciding editor assigned, and on Copyediting no button or control in either case while the deciding editor beside them had both buttons; "Assign" stayed.

<a id="fn-a6"></a>
**f-a6** — `lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()` returns the `ASSIGN_COPYEDITOR` / `AWAITING_COPYEDITS` pair for `Decision::ACCEPT` and `Decision::SEND_TO_PRODUCTION` only; `Decision::SKIP_EXTERNAL_REVIEW` (the "Accept and Skip Review" decision, whose `getNewStageId()` is also `WORKFLOW_STAGE_ID_EDITING`) falls through to an empty list, so the decision creates no notice row for the editors assigned at that moment. A later "Assign" creates none either because the form's save, `StageParticipantGridHandler::saveParticipant()`, never recomputes the pair (`addParticipant()` only renders the form); the pair is recomputed on a participant removed (`deleteParticipant()`) and on a message sent (`PKPStageParticipantNotifyForm::sendMessage()`, `sendNotification()`), so an editor assigned with the message box empty gets no row (code read 2026-10-02 and again 2026-10-05, lib/pkp `987776cd04` under OJS and `3dc90c81a6` under OMP, the handler identical in both). Live-probed 2026-09-19 on OJS and OMP: a seeded `skipExternalReview` submission and one moved on screen by "Accept and Skip Review" showed the assigned Section Editor no "Notification" heading on landing, on the Copyediting entry, and after a second Section Editor was assigned through "Assign" (that editor saw none either); the same accounts read "Assign a copyeditor…" on submissions accepted from review the same day. OMP's internal "Accept Submission" is `Decision::ACCEPT_INTERNAL` (`classes/decision/types/AcceptFromInternal.php`), which the same list omits and OMP's `classes/decision/Repository.php` does not override; the Internal Review spec records that path as its OMP10. Live-probed 2026-09-28 (note d): the internal path on OMP without the notice; on it and on "Accept and Skip Review" (OJS and OMP) "Awaiting Copyedits." for both assigned editors after a Copyeditor was assigned through "Assign" with the "Request Copyedit" message. A further editor assigned through "Assign" was not driven again. `Decision::BACK_FROM_PRODUCTION` ("Move To Copyediting") is missing from the same list, and "Send To Production" deletes the editors' copyediting pair, so a submission moved back has none. Walked 2026-10-02 on OJS and OMP `main` (lib/pkp `ddd8ab243a` and `3dc90c81a6`) and `stable-3_5_0`, on the PKP test dataset (Rule 3a, A6): after "Accept and Skip Review", an internal "Accept Submission" on the press and "Move To Copyediting" on submissions with no copyedited file and no Copyediting discussion (on 3.5 the button reads "Back To Copyediting"), the assigned editors found no "Notification" heading above "Draft Files", on landing or after a reload, while the dataset's submissions accepted from a review round showed "Assign a copyeditor…"; no request or page script failed. With the three decisions added to the list, tried on `main`, every one of those pages showed the notice once per assigned editor. Up to 3.3 one "Accept" decision served the skip-review and internal paths and was in the list (code read).
Issue report: [docs/issues/U71-OMP10-copyediting-no-assign-copyeditor-notice.md](../issues/U71-OMP10-copyediting-no-assign-copyeditor-notice.md), filed as [pkp-e2e#560](https://github.com/jardakotesovec/pkp-e2e/issues/560).

<a id="fn-a7"></a>
**f-a7** — `lib/pkp/classes/submissionFile/Repository.php::delete()`: for a `SUBMISSION_FILE_COPYEDIT` file it calls `updateNotification()` for the pair before `$this->dao->delete($submissionFile)`, so `PKPEditingProductionStatusNotificationManager` still counts the file being deleted, deletes both types, and nothing recomputes them once the row is gone. Live-probed 2026-09-18 on OJS and OMP: "Delete" › OK on the only copyedited file left "Copyedited Files" at "No Items" and both assigned editors with no notice, on the same page, re-landed and minutes later, from the "Assign a copyeditor…" state and from the "Awaiting Copyedits." state.
Issue report: [pkp-e2e#862](https://github.com/jardakotesovec/pkp-e2e/issues/862) ([docs/issues/U26-A9-deleted-revision-no-task-back.md](../issues/U26-A9-deleted-revision-no-task-back.md)).

<a id="fn-a8"></a>
**f-a8** — `ManageSubmissionFilesForm::importFile()` clones the ticked file into the target file stage with `sourceSubmissionFileId` set to the original's id. `Repository::delete()` removes dependent files (`SUBMISSION_FILE_DEPENDENT` rows attached to the file) and the stored file only when no other row shares it, and names no source link, so the code read gives no cause; the live observation stands alone. Live-probed 2026-09-18 on OJS and OMP, once each: "Draft Files" held the copy of copyedited file 16 as row 17; after "Delete" › OK on row 16 in "Copyedited Files", "Draft Files" listed rows 14 and 13 only. The reverse direction was not driven.

<a id="fn-a9"></a>
**f-a9** — `PKPStageParticipantNotifyForm::sendMessage()` creates the `EditorialTask` with `'createdBy' => $user->getId()`, where `$user` is the message's recipient, and adds the recipient and the sender as participants; the panel's row prints `createdBy`, and the row's "Discussion created by … on …" line is absent for it. Live-probed 2026-09-18 on OJS and OMP: the row "Discussion Request Copyedit Created by: {the Copyeditor's username}" after the editor's "Assign" with the "Request Copyedit" message, against the editor's own "Add" discussion listed as "Created by: {editor} Discussion created by {editor} ({role}) on {date}"; the Copyeditor's Tasks row "{editor} started a discussion: Request Copyedit: …".
Fixed by pkp/pkp-lib#13385 (merged 2026-10-05; `createdBy` the sender), with U35 A5: the kept walk of the A5 report on OMP `main` (omp `592914b83`, lib/pkp `e39fdee199`), default dataset, 2026-10-05: after "Assign" with "Request Copyedit" the Copyediting panel lists "Discussion Request Copyedit Created by: dbarnes" and Sarah Vogt's Tasks row "Daniel Barnes started a discussion: Request Copyedit: …"; OJS shows it once its `lib/pkp` pointer passes the merge. Issue report (with U35 A5): pkp-e2e#343, closed at the merge (the report and its walk deleted; git keeps them).

<a id="fn-a10"></a>
**f-a10** — `lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php::execute()`: the stages are rewritten by `_assignStagesToUserGroup()` only inside `if ($assignedStages)`, so a form saved with every box clear leaves the stored stages untouched while the grid answers "Your changes have been saved."; `getAlwaysActiveStages()` (`ROLE_ID_MANAGER`) explains the manager row's missing "Edit". Live-probed 2026-09-19 on OJS and OMP: the Copyeditor role with Copyediting as its only stage, unticked and saved, twice; the same with Production as the only stage; the form reopened with the box ticked each time; unticking Copyediting while ticking Production saved.

<a id="fn-a11"></a>
**f-a11** — Test run 2026-09-19 on OMP (scenario 1, one run): `sectioneditor.ravi`, assigned as Series editor through the "Assign" form with "Assignment privileges" ticked after the `accept` seed had run, opened the monograph's Copyediting entry to the headings "Draft Files", "Copyediting Tasks & Discussions" and "Copyedited Files" with no "Notification" heading, while `editor.diana`, in the seed's `participants`, read "Assign a copyeditor using the Assign link in the Participants list." on the same monograph. The same day on OJS, `sectioneditor.omar`, in the seed's `participants` (a row the scenario API writes after its decisions have run, so also after the acceptance, without the "Assign" form) and flagged through the Participants row's "Edit Assignment", read the "Notification" heading; the route, not the timing, is what differs between the two reads. Note d's code path accounts for it: the "Assign" form's save (`StageParticipantGridHandler::saveParticipant()`) never recomputes the pair, and its message path runs only with a message, which the test left empty, so no row was written for the added editor; note f-a6 records the same silence after "Assign" on the skip-review path. Live-probed 2026-09-26 on OJS and OMP (Actors row 2, scenario 1; two runs each): a Section Editor in the seed's `participants` (on the press a Series editor added the same way), flagged through the Participants row's "Edit Assignment" ("This participant is only allowed to recommend an editorial decision…"), read "Assign a copyeditor using the Assign link in the Participants list." on the Copyediting entry, beside the Editor reading the same; so the recommend-only flag does not withhold the notice. The press's "Assign" route was not driven again.

<a id="fn-a12"></a>
**f-a12** — Test run 2026-09-19 on OMP (scenario 6, one run) and on OJS the same day: after "Send To Production", the "Copyediting" entry's main column read "Status" ("The submission is currently in the Production stage."), "Draft Files", "Production Tasks & Discussions", "Copyedited Files", with "Participants" on the right and no button; no discussion existed on either stage. Note a's `getDiscussionTitleByStage()` in `useDiscussionManagerHelpers.js` names the heading by a stage id; which id the entry passes after the move was not read. Live-probed 2026-09-26 on OJS and OMP (Rule 10, scenario 6), on two submissions sent to production: selecting "Copyediting" in the workflow menu headed the panel "Production Tasks & Discussions"; reloading the same address (`workflowMenuKey=workflow_4`) headed it "Copyediting Tasks & Discussions", as did a fresh load of that address in a separate run; the "Status" box, the two lists, no button and no notice either way.

<a id="fn-a13"></a>
**f-a13** — pkp/pkp-lib#12798 (PR #12959, lib/pkp `8240fbe6cc`, and PR #13398, `1ad4a14bb2`, 2026-09-25; all three apps' pointers): `BackFromCopyediting::getLabel()` now takes the submission and answers "Move to Submission" when none is passed (note h). `DecisionHandler` passes it for the breadcrumb and the page title, but `lib/pkp/templates/decision/record.tpl` prints the `h1.app__pageHeading` from `{$decisionType->getLabel()}` with no argument, so the `match` falls to `….toSubmission`. Before the change `getLabel()` returned "Move to Review" unconditionally. Live-probed 2026-09-26 on OJS and OMP, in four separate runs, as the manager, the Editor and the assigned Section Editor: after a review round (with and without a completed review, email sent or skipped) and, on the press, after an internal round only and after internal and external rounds, the heading read "Move to Submission" while the breadcrumb's last item and the browser title read "Move to Review"; recording the decision landed on the review round each time. The same heading turned the suites' "Move to Review" scenarios 7 and 9 red on CI from the day of the change. Written up for the team as `docs/reports/2026-09-26-pkp-lib-12798.md`.

<a id="fn-omp1"></a>
**f-omp1** — Note h: the external-then-internal-then-submission order of `BackFromCopyediting::getNewStageId()`; OMP's `Schema.php` uses the shared class unchanged, and OMP's `Application::getApplicationStages()` lists both review stages. Live-probed 2026-09-18 on OMP: an internal round only → "Internal Review (Round 1)"; internal then external → External Review, the internal entry reading "The submission is currently in the External Review stage."; an external round only → External Review; neither → Submission.

<a id="fn-ops1"></a>
**f-ops1** — Note k. Live-probed 2026-09-19 on OPS: the manager, the Moderator and the author at their three levels; the typed `workflow_4` address; the Roles grid; the "Assign" form; Manage Emails; the scenario API's refusal of `copyeditor`.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Copyediting stage (editorial view): notice box, Draft Files, discussions, Copyedited Files | workflow → "Copyediting" menu entry | AFFW-356, 357, 358, 359 |
| Copyediting stage: Participants panel | workflow → "Copyediting" → right column | AFFW-360 |
| Copyediting decision buttons "Send To Production", "Move to Review" | workflow "Copyediting" → action buttons | AFFW-361, 362 |
| Copyediting stage (author view): discussions and Copyedited Files | My Submissions → View → "Copyediting" | AFFW-363 |
| "Upload/Select Files" window on Draft Files (select op, selection grid) | "Draft Files" → "Upload/Select Files" | GRID-019 · GRID-020 |
| "Upload/Select Files" window on Copyedited Files (select op, selection grid) | "Copyedited Files" → "Upload/Select Files" | GRID-014 · GRID-015 |
| Notice box texts and the Copyeditor's task | workflow "Copyediting" notice box; header Tasks panel | NOTIF-042 · NOTIF-043 · NOTIF-032 |
| Legacy author-dashboard "Copyediting" tab | `{journal}/authorDashboard/submission/{id}` (forwards to the current workflow; the tab never renders) | AFFW-705 |

## Reference — code anchors

- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` · `workflowConfigEditorialOMP.js` (no editing-stage override) · `workflowConfigEditorialOPS.js` (no editing stage) — panels, notice component and buttons
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOJS.js` · `workflowConfigAuthorOMP.js` — the author view
- `lib/ui-library/src/pages/workflow/components/primary/WorkflowNotificationDisplay.vue` — the notice box
- `lib/ui-library/src/managers/FileManager/useFileManagerConfig.js` (`FINAL_DRAFT_FILES`, `COPYEDITED_FILES`) · `useFileManagerActions.js` · `fileManagerStore.js` · `FileManager.vue`
- `lib/ui-library/src/managers/DiscussionManager/useDiscussionManagerHelpers.js` — the "Copyediting Tasks & Discussions" heading
- `lib/ui-library/src/composables/useCurrentUser.js::hasCurrentUserAtLeastOneAssignedRoleInStage()` · `lib/pkp/classes/submission/maps/Schema.php` (`currentUserAssignedRoles`, `checkDecisionPermissions()`)
- `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` (OJS, OMP, OPS) · `classes/decision/Repository.php::getDecisionTypesMadeByRecommendingUsers()` (OJS, OMP)
- `lib/pkp/classes/decision/types/SendToProduction.php` · `BackFromCopyediting.php` (`getLabel()` by destination, A1) · `Accept.php` · `SkipExternalReview.php` · `lib/pkp/pages/decision/DecisionHandler.php` · `lib/pkp/templates/decision/record.tpl` (the page heading, A13) · `lib/pkp/classes/decision/steps/PromoteFiles.php` · `lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()` (A6)
- `lib/pkp/classes/mail/mailables/DecisionSendToProductionNotifyAuthor.php` · `DecisionBackFromCopyeditingNotifyAuthor.php`
- `lib/pkp/classes/notification/managerDelegate/PKPEditingProductionStatusNotificationManager.php` · `EditorDecisionNotificationManager.php` · `lib/pkp/classes/notification/PKPNotificationManager.php` · `lib/pkp/pages/notification/NotificationHandler.php::fetchNotification()`
- `lib/pkp/controllers/grid/files/final/{FinalDraftFilesGridHandler,ManageFinalDraftFilesGridHandler}.php` (GRID-019/020) · `lib/pkp/controllers/grid/files/copyedit/{CopyeditFilesGridHandler,ManageCopyeditFilesGridHandler}.php` (GRID-014/015) · `lib/pkp/controllers/grid/files/form/ManageSubmissionFilesForm.php` (`importFile()`, A8) · `lib/pkp/controllers/grid/files/SubmissionFilesCategoryGridDataProvider.php`
- `lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php` · `form/PKPStageParticipantNotifyForm.php` (`COPYEDIT_REQUEST`, `sendMessage()`, A9)
- `lib/pkp/classes/submissionFile/Repository.php` (`getAssignedFileStages()`, `delete()` and its notice recompute, A7) · `lib/pkp/api/v1/submissions/PKPSubmissionFileController.php::getMany()`
- `lib/pkp/classes/editorialTask/Template.php` — the "Request Copyedit" task template (Settings › Workflow › Tasks and Discussions)
- `registry/userGroups.xml` (OJS, OMP, OPS) — stage sets and permission levels · `lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php` (A10) · `lib/pkp/classes/security/RoleDAO.php::getAlwaysActiveStages()` · `ops/classes/core/Application.php::getApplicationStages()`
- `lib/pkp/pages/authorDashboard/PKPAuthorDashboardHandler.php::submission()` · `lib/pkp/templates/controllers/tab/authorDashboard/editorial.tpl` (AFFW-705, never rendered)
- Locale: `lib/pkp/locale/en/{submission,editor,notification,emails,manager}.po` (`editor.submission.decision.backFromCopyediting` "Move to Review" and `….backFromCopyediting.toSubmission` "Move to Submission" are `submission.po`, no app override)
- App divergence points checked: no app subclass of the decision types, grid handlers or notification delegates; OMP's editorial and author configs add no editing-stage entry; OPS has no editing stage, no Copyeditor group and no editing decisions
