---
name: production-stage
status: verified
---

# Production stage {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

The **Production stage** is the last stop of the workflow. On a journal or
press a submission arrives here from Copyediting with its copyedited files,
now listed as production ready files; the editor asks a Layout Editor to
turn them into galleys through the Participants panel's "Assign" form, the
team follows the work in the stage's discussions, and the "Schedule For
Publication" button hands the submission over to publishing. If the
copyedits turn out to need more work, one decision moves the submission
back to Copyediting. On a preprint server the Production stage is the whole
workflow: a preprint sits here from the moment it is submitted, and the
stage carries the server's only editorial decisions, "Decline Submission",
"Revert Decline" and, for a declined preprint, "Delete". <sup>a</sup>
<sup>h</sup>

This spec covers the Production-stage screen itself: which panels, notices
and buttons each role is offered, what the "Production Ready Files" list
holds, and what each decision does to the submission. The galleys a Layout
Editor builds belong to *Galleys* (a press's publication formats to
*Publication formats & proof terms* {OMP}); publishing, scheduling and versions to
*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*;
the guided wizard behind every decision button to *Editorial decision
recording*; the file list's upload wizard and row windows to *Submission
files*; the Participants panel to *Stage participants*; the discussions
panel to *Tasks & discussions*. Who may open a submission's workflow at all
is [→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
<sup>q</sup>

## Actors & permissions

Who may **open** the Production stage at all is the shared workflow gate,
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access): a
Journal Manager or Editor reaches it on every submission; every other role
only on submissions they are assigned to, and only when their role's stage
set includes Production. By default that set includes Production for
Editor, Production editor, Section Editor, Guest Editor, Designer, Indexer,
Layout Editor, Proofreader, Author and Translator, and on a press for
Volume editor and Chapter Author too; an assigned Copyeditor, Marketing and
sales coordinator or Funding coordinator opens the workflow and finds the
"Production" entry showing "You don't currently have access to that stage
of the workflow." and nothing else. On a preprint server the set includes
Production for Preprint Server Manager, Moderator and Author; an Editorial
Board Member assigned to a preprint is refused the workflow altogether: the
dialog "Error / The current role does not have access to this operation. /
OK" over the dashboard, which still lists the preprint under "Assigned to
me".
Translator, Volume editor and Chapter Author are author-level roles: the
editorial dashboard refuses them and they open the stage from My
Submissions, in the author view (Rule 12). "Assigned editors" below means
Journal Managers, Editors, Production editors (a manager-level role) and
Section and Guest Editors listed on this stage's Participants panel;
"deciding editors" and "recommending editors" are the
[glossary's](GLOSSARY.md#roles-and-access). The rows record what each role
is offered **on** the screen once it is open. <sup>a</sup> <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the stage's panels** ("Production Ready Files", "Production Tasks & Discussions", "Participants"; Rule 1) | • Site Administrator (holding a journal role); Journal Manager; Editor: every submission<br>• Assigned Production editor, Section Editor, Guest Editor, Designer, Indexer, Layout Editor, Proofreader: their assigned submissions<br>• Author, and Translator, Volume editor and Chapter Author alike: their own submission, in the author view, which shows "Production Tasks & Discussions" alone on a journal and the notice box above it on a press (Rule 12)<br>• On a preprint server: Preprint Server Manager on every preprint and the assigned Moderator, with no file list [OPS1](#ops1); the Author has no stage screen at all and finds the discussions under the "Preprint" group (Rule 12) <sup>a</sup> <sup>m</sup> |
| **See the notice box** ("Assign a user to create galleys using the Assign link in the Participants list." / "Awaiting Galleys." on a journal; "Awaiting approval." on a press; Rule 3) | • On a journal: assigned editors, while the notice's condition holds. A Section Editor whose participation is limited to recommendations read it like a deciding editor ⚠ [A1](#a1)<br>• On a journal, a Journal Manager or Editor who is not assigned to the submission: no notice, although the panels show<br>• On a press: every role that opens the entry, the Author included [OMP1](#omp1)<br>• Designer, Indexer, Layout Editor, Proofreader: never on a journal<br>• On a preprint server: nobody [OPS1](#ops1) <sup>d</sup> <sup>f</sup> <sup>t1</sup> |
| **Add to and manage "Production Ready Files"** ("Upload" above the list; "Update File Details", "More Information" and "Delete" in a row's menu; "Download All Files" under the list; Rule 4) | • Site Administrator; Journal Manager; Editor: every submission<br>• Assigned Production editor, Section Editor, Guest Editor, Designer, Indexer, Layout Editor, Proofreader: their assigned submissions<br>• Author: never; the list is not shown in the author view (Rule 12) <sup>e</sup> |
| **"Send to Text Editor"** (a row-menu entry, for a Word, OpenDocument, RTF, LaTeX or Markdown file) | • Site Administrator; Journal Manager, Editor and Production editor (the manager-level roles)<br>• Section Editor, Guest Editor and the assistant roles (Designer, Indexer, Layout Editor, Proofreader): never. It opens the window "Send File to Text Editor", which belongs to *Submission files* <sup>n</sup> |
| **Press "Schedule For Publication"** ("Post the preprint" on a preprint server; Rule 6) | • Every role the editorial view admits, whether or not they may publish: it is a shortcut to the publication pages, not a decision; on a preprint server a Moderator, deciding or limited to recommendations, lands on a "Title & Abstract" page that offers no "Post" ([→ publishing is managers-only on screen](U49-publish-schedule-and-versions.md#a2))<br>• Author: never (Rule 12) <sup>k</sup> <sup>t5</sup> |
| **Record "Move To Copyediting"** {OJS OMP} (Rule 7) | • [Deciding editors](GLOSSARY.md#roles-and-access), while Production is the active stage<br>• Recommending editors: no decision button and no recommendation control on this stage; "Upload", "Schedule For Publication" and "Assign" are offered like a deciding editor's [A1](#a1)<br>• Designer, Indexer, Layout Editor, Proofreader; Author: never <sup>c</sup> |
| **Record "Decline Submission"** {OPS} (Rule 9) | • Preprint Server Manager, and an assigned Moderator whose participation is not limited to recommendations, while the preprint is queued at Production<br>• A Moderator whose participation is limited to recommendations: the preprint opens with "Post the preprint" alone, no decision button and no recommendation control [A1](#a1) <sup>h</sup> <sup>t9</sup> |
| **Record "Revert Decline"** {OPS} (Rule 10) | • The same deciding roles, while the preprint stands declined <sup>h</sup> |
| **"Delete"** {OPS} (Rule 11) | • Preprint Server Manager (assigned or not) and Site Administrator: only while the preprint stands declined; a Moderator never sees the button <sup>i</sup> <sup>t8</sup> |
| **Assign a participant** ("Assign" on the Participants panel) | • Owned by *Stage participants*. On this stage the "Assign" form offers the roles whose stage set includes Production, never Journal Manager on a journal or press, although that role holds every stage; a preprint server's form lists its managers too. Its "Choose a predefined message" list reads "Discussion (Production)", "Assign Editor", "Ready for Production" and "Galleys Complete", on a press also "Index Requested" and "Index Completed", on a preprint server "Discussion (Production)" and "Assign Editor" alone; "Ready for Production" and "Index Requested" are what raise the assignee's task and email (Side effects) <sup>j</sup> <sup>t11</sup> |
| **Open or answer a discussion** ("Production Tasks & Discussions") | • Owned by *Tasks & discussions*. The panel is shown to every role that opens the stage, the Author included (Rules 1, 12) <sup>a</sup> |

## Fields & validation

N/A. The Production stage's own surfaces are panels, notices and buttons;
the forms they open belong to the features Purpose names. <sup>q</sup>

## Rules & state

<a id="panels"></a>
1. **What the screen shows.** When a submission at Production is opened at
   that stage, the editorial view shows, top to bottom: the notice box when
   one applies (Rule 3); the **"Production Ready Files"** list, described
   under its heading as "These are the files that will be sent for
   publication"; and the **"Production Tasks & Discussions"** panel. The
   **"Participants"** panel stands in the right-hand column. The buttons sit
   at the top of the screen: "Schedule For Publication", highlighted, then
   "Move To Copyediting" (Rules 6–7). A preprint server shows the notice
   slot empty and no file list, only the discussions and "Participants"
   panels [OPS1](#ops1); its buttons are "Post the preprint", highlighted,
   then "Decline Submission" while the preprint is queued, or "Revert
   Decline" and, for a manager, "Delete" while it stands declined (Rules
   9–11). The header's "Preview" button while the submission sits here is
   [→ the header buttons](U24-workflow-screen-and-stage-access.md#stage-label).
   <sup>a</sup> <sup>m</sup> <sup>t15</sup>
<a id="arrival"></a>
2. **How a submission arrives.** A submission reaches Production through
   "Send To Production" on the Copyediting stage
   ([→ Send To Production](U32-copyediting-stage.md#send-to-production)):
   the files ticked on that decision's "Select Files" page appear in
   "Production Ready Files" (Rule 4), each as a new row of its own. The
   stage bubble under the title reads "Production", and no status box is
   shown while the submission is active here and unpublished
   ([→ the status box](U24-workflow-screen-and-stage-access.md#status-box));
   on a journal the notice box of Rule 3 takes that slot. A preprint is at
   Production from the moment its author submits it, with the bubble
   "Production" and the workflow menu listing "Production" alone. <sup>g</sup>
   <sup>h</sup> <sup>t2</sup>
<a id="notices"></a>
3. **The notice box.** Above the file list, the box is a framed notice
   with a heading, "Notification" on a journal, and one paragraph. What
   it says differs by application:
   <sup>d</sup> <sup>f</sup>
   - 3a. **{OJS} "Assign a user to create galleys using the Assign link in
     the Participants list."** for an assigned editor (Actors), while no
     discussion exists on this stage and the newest version has no galley.
     The notice is the editor's own: a Journal Manager who is not assigned
     to the submission sees the panels with no notice.
   - 3b. **{OJS} "Awaiting Galleys."** once a discussion exists on this
     stage (the "Assign" form's message opens one, whichever predefined
     message was chosen) and the newest version still has no galley. The
     notice follows the discussion, not the assignment: a Layout Editor
     assigned with the message box left empty leaves 3a standing, and a
     discussion opened with no Layout Editor assigned flips it to 3b
     ⚠ [OJS1](#ojs1).
   - 3c. **{OJS} No notice** once the newest version has at least one
     galley (galleys are added on the publication's "Galleys" page, *Galleys*),
     or once the submission has left the stage (Rule 7). Deleting the last
     galley brings the notice back. Publishing clears nothing: a published
     article whose version has no galley keeps telling its assigned editor
     to assign a user to create galleys, after "Unpublish" too
     ⚠ [OJS2](#ojs2). The notice is re-read when the workflow is next
     opened after a discussion is added from the panel or a galley is added
     or removed; the "Assign" form's message changes it on the same page.
     <sup>t1</sup>
   - 3d. **{OMP} "Awaiting approval."** with the paragraph "The monograph
     will not be listed in the catalog until it has been published. To add
     this book to the catalog, click on the Publication tab.", shown to
     every role (Actors) from the monograph's arrival at Production until
     it is first published, never before (Rules 7b, 12); from then on
     the box reads "Catalog Management" with "The monograph has been
     approved. Please visit Marketing and Publication to manage its catalog
     details, using the links just above.", and it stays so after
     "Unpublish", although the monograph is back at Production
     ⚠ [OMP2](#omp2). A press has no galley notices [OMP1](#omp1).
     With the interface in French the heading reads "En attente
     d'approbation." or "Gestion du catalogue", but the paragraph under it
     is a raw code, the text's internal name between hash signs, such as
     "##notification.type.visitCatalog##" ⚠ [OMP3](#omp3).
     <sup>t3</sup> <sup>[f-omp3](#fn-omp3)</sup>
   - 3e. **{OPS} No notice box ever** [OPS1](#ops1).
<a id="production-ready-files"></a>
4. **"Production Ready Files".** The list holds the files the Layout Editor
   works from. Each row shows the file's number ("No"), "File Name", "Date
   uploaded" and "Type", and, for the roles Actors names, a row menu ("More
   Actions") offering "Update File Details", "More Information" and
   "Delete"; "Delete" asks "Are you sure you wish to delete this item? This
   action cannot be undone." in a "Delete" dialog with "OK" and "Cancel".
   The file name is a link that downloads the file. "Upload" above the list
   opens the upload wizard directly, titled "Upload a Production Ready
   File", with the steps "1. Upload File", "2. Review Details" and "3.
   Confirm", finished with "Complete"; the finished upload joins the list
   at once. Unlike the Copyediting lists there is no "Upload/Select Files"
   window here: a file from an earlier stage reaches this list only through
   "Send To Production" (Rule 2). While the list holds at least one file, a
   "Download All Files" button under it downloads them together as one zip
   file. Adding or deleting a file here changes no notice (Rule 3).
   <sup>e</sup> <sup>t4</sup>
5. **Discussions and participants on this stage.** "Production Tasks &
   Discussions" and "Participants" are the stage's instances of the shared
   discussions and participants panels and work as their own features
   describe (*Tasks & discussions*, *Stage participants*). What is this
   stage's: the discussions panel is shown in both views (Rule 12); the
   "Assign" form offers the roles and the predefined messages Actors names;
   and a discussion opened here drives the journal's notice box (Rule 3b).
   <sup>a</sup> <sup>j</sup> <sup>q</sup>
<a id="schedule"></a>
6. **The "Schedule For Publication" button.** It records no decision. It
   opens the newest version's "Title & Abstract" page under the workflow's
   "Publication" group ("Preprint" on a preprint server), where the real
   publish control is offered to the roles that may publish and nothing is
   offered to the others. The button reads "Post the preprint" on a
   preprint server. On a journal or press it is shown to every role in the
   editorial view whenever the "Production" entry is selected: while the
   submission rests in Done (Rule 8), and also while the submission is
   still in Copyediting, above the box "The Production stage has not yet
   been initiated." (Rule 7b), where pressing it opens "Title & Abstract"
   as usual ⚠ [A4](#a4). On a preprint server it is shown only while
   Production is the preprint's active stage, so it is gone once the
   preprint is posted, and it is still offered while the preprint stands
   declined ⚠ [OPS3](#ops3). <sup>k</sup> <sup>t5</sup>

   Who is offered the publish control on that page is
   *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'s.
   <sup>q</sup>
<a id="move-to-copyediting"></a>
7. **"Move To Copyediting"** {OJS OMP}. Pressing it opens the decision
   wizard with the "Notify Authors" page alone, an email to the
   submission's authors that can be skipped. Recording the decision closes
   the wizard on "Moved to Copyediting" with "The submission, {title}, was
   moved to the copyediting stage. The author has been notified, unless
   you chose to skip that email." <sup>g</sup>
   - 7a. **Where it lands.** The submission goes back to the Copyediting
     stage: the bubble reads "Copyediting", and the Copyediting entry shows
     "Draft Files" and "Copyedited Files" with the files they held before,
     with "Send To Production" and "Move to Review" offered again. No
     "Assign a copyeditor…" notice is raised by the return ⚠ [A3](#a3).

     The Copyediting entry's panels are
     [→ the Copyediting panels](U32-copyediting-stage.md#panels). <sup>q</sup>
   - 7b. **The files.** The production ready files are kept but hidden:
     until the submission is sent to production again, its "Production"
     entry shows "The Production stage has not yet been initiated." with
     "Schedule For Publication" above it [A4](#a4) and the "Participants"
     panel with its "Assign" beside it, and nothing else: the file list and
     the discussions panel are hidden. The next "Send To Production" brings
     the list back with the earlier files, and the files ticked on its
     "Select Files" page join them as new rows. <sup>t6</sup>
8. **No decision off the active stage.** "Move To Copyediting" appears only
   while Production is the submission's active stage. Once a version has
   been published and the submission rests in Done, its "Production" entry
   shows the file list and the discussions panel under the status box
   "Submission published.", with "Schedule For Publication" still offered
   (Rule 6) and no "Move To Copyediting". Between the status box and the
   list a press shows its "Catalog Management" box (Rule 3d), and a journal
   its galley notice while the version has no galley [OJS2](#ojs2). A
   preprint that has been posted shows the same entry with no button at
   all. <sup>c</sup> <sup>t14</sup>

   Done itself is [→ Done](U24-workflow-screen-and-stage-access.md#done).
   <sup>q</sup>
<a id="decline"></a>
9. **"Decline Submission"** {OPS}. Pressing it opens the decision wizard
   with the "Notify Authors" page alone. Recording the decision closes it
   on "Submission Declined" with "The submission, {title}, has been declined
   and sent to the archives. All notifications have been sent, except any
   you chose to skip." The preprint stays on Production: the bubble reads
   "Declined", the preprint lists under the dashboard's "Declined" view
   (*[Submissions dashboard](U23-submissions-dashboard.md)*), and the
   buttons flip to "Revert Decline" and, for a manager, "Delete" (Rules
   10–11), with "Post the preprint" still beside them [OPS3](#ops3). A
   declined preprint's workflow opens on its "Title & Abstract" page, not
   on the stage that holds the buttons
   ([→ where the screen lands](U24-workflow-screen-and-stage-access.md#initial-selection)),
   so the reader selects "Production" to reach them. <sup>h</sup> <sup>t7</sup>
<a id="revert-decline"></a>
10. **"Revert Decline"** {OPS}. Pressing it opens the wizard with the
    "Notify Authors" page alone. Recording the decision closes it on
    "Submission Reactivated" with "The submission, {title}, is now active in
    the submission stage. The author has been notified, unless you chose to
    skip that email.", although a preprint server has no Submission stage
    ⚠ [OPS2](#ops2). The bubble reads "Production" again, the preprint
    leaves the "Declined" view, and the buttons of Rule 1 return. <sup>h</sup>
<a id="delete"></a>
11. **"Delete"** {OPS}. While the preprint stands declined, a Preprint
    Server Manager or Site Administrator also sees a "Delete" button
    (Actors). The dialog and what confirming does are
    [→ the Delete dialog](U24-workflow-screen-and-stage-access.md#delete-dialog).
    <sup>i</sup> <sup>t8</sup>
<a id="author-view"></a>
12. **The author's view.** An Author opening their own submission at
    Production on a journal sees the "Production Tasks & Discussions" panel
    and nothing else: no file list, no "Participants" panel, no notice box
    and no button. On a press the notice box of Rule 3d stands above the
    panel [OMP1](#omp1). Before the submission reaches Production the same
    entry shows only the box "The Production stage has not yet been
    initiated." On a preprint server the author's side menu has no
    "Workflow" group at all: the view opens on the newest version's "Title &
    Abstract" page, and the stage's discussions are the last page of the
    "Preprint" group, "Production Tasks & Discussions", which shows the same
    panel with its "Add" button. Once the preprint is declined (Rule 9) it
    leaves the author's "Active submissions" list; opened by its address,
    the same pages show under the bubble "Declined", with "Status:
    Unposted" on "Title & Abstract" and no word of the decision, which
    reaches the author by email alone (Side effects). <sup>l</sup> <sup>t13</sup>

    That box is [→ the status box](U24-workflow-screen-and-stage-access.md#status-box);
    the author's entry route (View on My Submissions) and the view that
    lists a declined preprint are *[My Submissions](U22-my-submissions.md)*'s.
    <sup>q</sup>

## Side effects

- **On "Send To Production"** (the arrival, Rule 2): on a journal the
  assigned editors read the galley notice (Rule 3a) and their Copyediting
  notice is gone. <sup>d</sup>

  The decision's own email and log line are
  *[Copyediting stage](U32-copyediting-stage.md#send-to-production)*'s.
  <sup>q</sup>
- **On "Move To Copyediting"** {OJS OMP}. The authors receive the email
  "Your submission has been moved to copyediting" unless the editor skipped
  it on the "Notify Authors" page; the Activity Log gains "{editor} moved
  this submission to the copyediting stage.", under the name of whoever
  pressed the button, and "An email has been sent: Your submission has been
  moved to copyediting" unless the email was skipped (Rule 7). <sup>g</sup>
  <sup>o</sup>

  The wizard's own mechanics are *Editorial decision recording*'s.
  <sup>q</sup>
- **On "Decline Submission"** {OPS}. The authors receive the email "Your
  submission has been declined" unless skipped; the Activity Log gains
  "{editor} declined this submission." (Rule 9). <sup>h</sup> <sup>o</sup>
- **On "Revert Decline"** {OPS}. The authors receive the email "We have
  reversed the decision to decline your submission" unless skipped; the
  Activity Log gains "{editor} reversed the decision to decline this
  submission." (Rule 10). <sup>h</sup> <sup>o</sup>
- **On "Delete"** {OPS}. Nothing is emailed; the submission and its records
  are gone ([→ the Delete dialog](U24-workflow-screen-and-stage-access.md#delete-dialog)).
  <sup>i</sup>
- **On assigning a participant with the "Ready for Production" message.**
  The assignee receives the email "Ready for Production" from the assigning
  editor, ending with "Reply to this comment at #{id} {authors' family
  names}", whose link opens the submission's workflow, and an unsubscribe
  link; and two rows in the header's Tasks panel: "{editor} started a
  discussion: Ready for Production: …" and the task "You have been asked
  to review layouts for "{title}"." The task is not cleared by any later
  action: a "Galleys Complete" message sent from the Participants panel is
  emailed and logged and clears nothing, a galley added or the article
  published clears nothing, and the assignee removes the task with the
  panel's "Delete" ⚠ [A2](#a2). On a press "Index Requested" works the
  same way with the task "You have been asked to create an index for
  "{title}"." and "Index Completed" as its silent counterpart. A
  participant assigned with the message box left empty receives no email
  and no Tasks row. The message also opens the discussion that flips the
  journal's notice box (Rule 3b).
  <sup>j</sup> <sup>t10</sup>

  The Tasks panel is
  *[Notifications center](U05-notifications-center-and-email-preferences.md)*'s.
  <sup>q</sup>
- **On a discussion opened from the panel, or a galley added or removed**
  {OJS}: the assigned editors' notice box changes to match when the
  workflow is next opened; the "Assign" form's message changes it on the
  same page (Rule 3c). <sup>d</sup>
- **On publishing a monograph** {OMP}: the notice box flips from "Awaiting
  approval." to "Catalog Management" (Rule 3d). Unpublishing does not flip
  it back [OMP2](#omp2). <sup>f</sup>

  The publishing itself is
  *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'s.
  <sup>q</sup>

## Settings that modify behavior

- **"Stage Assignment"** (Settings › Users & Roles › Roles: the stage tick
  boxes of a role's "Edit" form, or one click on the same box in the list's
  "Production" column, which saves at once with the message "{role} role
  assigned to Production stage." or "{role} role unassigned from Production
  stage."; the Journal Manager row has no "Edit", its boxes are greyed,
  and the role reaches every stage). The install default gives Production
  to Editor,
  Production editor, Section Editor, Guest Editor, Designer, Indexer,
  Layout Editor, Proofreader, Author and Translator, and on a press to
  Volume editor and Chapter Author too; Copyeditor, Marketing and sales
  coordinator, Funding coordinator, Reviewer (a press's Internal Reviewer
  and External Reviewer), Reader, Editorial Board Member and a journal's
  Subscription Manager have it unticked. On a preprint server Preprint
  Server Manager, Moderator and Author hold it and Reader and Editorial
  Board Member do not. With Production ticked, an assigned member of the
  role reaches the stage's panels (Actors) and the role is offered in this
  stage's "Assign" form; unticked, an assigned member reads "You don't
  currently have access to that stage of the workflow." here
  ([→ stage gate](U24-workflow-screen-and-stage-access.md#stage-gate)) and
  the role is not offered. <sup>b</sup>

  The form and the list are *Roles configuration*'s. <sup>q</sup>
- **The email templates** "Submission Moved to Copyediting" (a journal or
  press), "Submission Declined" and "Reinstate Submission Declined Without
  Review" (a preprint server) (Settings › Workflow › Emails; *Emails
  management*). The install defaults carry the subjects Side effects
  quotes; an edited subject or body is what the "Notify Authors" page
  prefills. <sup>p</sup>
- **The task templates** under "Production Stage" (Settings › Workflow ›
  Tasks and Discussions; *Tasks & discussions*): "Discussion (Production)",
  "Assign Editor", "Ready for Production" and "Galleys Complete" on a
  journal, the same plus "Index Requested" and "Index Completed" on a
  press, "Discussion (Production)" and "Assign Editor" on a preprint
  server, each with "Automatically add this task and/or discussion when a
  submission reaches the stage" off. A template's Discussion body is what
  the "Assign" form's message prefills, and its name is the subject of the
  assignee's email (Side effects). <sup>p</sup>
- **The app's workflow stages** are fixed per application, not a setting: a
  preprint server ships a single-stage workflow, so its workflow menu lists
  "Production" alone, a preprint sits there from its submission and the
  server's decisions live here (Rules 9–11). <sup>h</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)**:
  who may open a submission's workflow and reach this stage; the stage
  bubble, the "Preview" header button, the status box, the no-access box,
  where a declined preprint's workflow lands, Done and the "Delete" dialog.
  This spec owns only what the Production stage offers once opened.
  <sup>q</sup>
- **[Copyediting stage](U32-copyediting-stage.md#send-to-production)**:
  "Send To Production", the way in (Rule 2), and the destination of "Move
  To Copyediting" (Rule 7a). <sup>q</sup>
- **Editorial decision recording**: the wizard behind "Move To
  Copyediting", "Decline Submission" and "Revert Decline" (Rules 7, 9, 10).
  This spec owns the buttons' presence and the stage or status change each
  decision makes. <sup>q</sup>
- **[Publish, schedule & versions](U49-publish-schedule-and-versions.md)**:
  the "Title & Abstract" page the "Schedule For Publication" button lands
  on and the publish, post, unpublish and version controls there (Rule 6);
  Done (Rule 8). <sup>q</sup>
- **Galleys**: the "Galleys" page where a Layout Editor builds the galleys
  that clear a journal's notice (Rule 3c). A press's publication formats
  belong to *Publication formats & proof terms*. <sup>q</sup>
- **Submission files**: the list's upload wizard, "Update File Details",
  "More Information", "Delete", "Download All Files" and "Send to Text
  Editor" (Rule 4). <sup>q</sup>
- **Stage participants**: the "Participants" panel and its "Assign" form,
  whose "Ready for Production" message raises the Layout Editor's task
  (Rule 5; Side effects). <sup>q</sup>
- **Tasks & discussions**: the "Production Tasks & Discussions" panel (Rule
  5) and the task templates (Settings). <sup>q</sup>
- **[Notifications center](U05-notifications-center-and-email-preferences.md)**:
  the Tasks panel where the assignee's two rows are listed (Side effects).
  <sup>q</sup>
- **[My Submissions](U22-my-submissions.md)**: the author's entry route
  (Rule 12). <sup>q</sup>
- **[Submissions dashboard](U23-submissions-dashboard.md)**: the "Declined"
  view a declined preprint lists under (Rule 9). <sup>q</sup>
- **Submission activity log & notes**: the log lines Side effects names.
  <sup>q</sup>
- **Emails management**: the email templates (Settings). <sup>q</sup>
- **Roles configuration**: the Roles "Edit" form and its "Stage Assignment"
  boxes (Settings). <sup>q</sup>
- **Catalog management**: the "Marketing and Publication" pages a press's
  "Catalog Management" notice points at (Rule 3d). <sup>q</sup>
- **[Languages & locales](U57-languages-and-locales.md#a4)**: why a text
  the French translation lacks shows as a raw code (Rule 3d, OMP3).
  <sup>q</sup>

## Canonical scenarios

Scenarios 3, 4 and 9 run on a scratch journal with throwaway accounts,
since each reads a mailbox; every other scenario runs on the seeded journal
with ready accounts and scratch submissions. A preprint server runs
scenarios 8 and 9 alone, the first of them doubling as its absence scenario
for the journal's file list and notices; the accounts, their passwords, the
mail catcher's address and the tooling recipe are in the footnote.
<sup>s</sup>

1. **Open a submission at Production** {OJS OMP}

   Given: Editor, on the dashboard, assigned to a submission sent to
   production after its acceptance from review, with no discussion on the
   stage and no galley on its newest version, and on the same submission
   an unassigned Journal Manager and a Section Editor whose participation
   is limited to recommendations; and a second submission of the same
   journal, published, the Editor assigned to it and no galley on its
   published version.

   - **The Production stage**: open the submission's workflow at its
     "Production" entry: the stage bubble under the title reads
     "Production"; the main column shows, top to bottom, the notice box,
     the "Production Ready Files" list described under its heading as
     "These are the files that will be sent for publication", and the
     "Production Tasks & Discussions" panel; the "Participants" panel
     stands in the right-hand column (Rules 1, 2).
   - **The notice box**: on a journal it reads "Assign a user to create
     galleys using the Assign link in the Participants list." under the
     heading "Notification" (Rule 3a); on a press it reads "Awaiting
     approval." with "The monograph will not be listed in the catalog
     until it has been published. To add this book to the catalog, click
     on the Publication tab." [OMP1](#omp1) (Rule 3d).
   - **The decision buttons**: at the top of the screen, "Schedule For
     Publication", highlighted, then "Move To Copyediting" (Rule 1).
   - **"Schedule For Publication"**: press it: the newest version's "Title
     & Abstract" page opens under the workflow's "Publication" group;
     select "Production" in the workflow menu again: the entry is as
     before, the bubble "Production" and both buttons, since the button
     records no decision (Rule 6).
   - **The Journal Manager not assigned**: opens the same submission at
     "Production": the same three panels and both buttons; on a journal no
     notice box, on a press the same "Awaiting approval." box
     [OMP1](#omp1) (Rules 3a, 3d; Actors rows 1–2).
   - **The recommending Section Editor**: opens the same submission at
     "Production": the three panels, "Upload" above "Production Ready
     Files", "Schedule For Publication" at the top and "Assign" on the
     "Participants" panel; no "Move To Copyediting" and no recommendation
     control [A1](#a1) (Actors row 6).
   - **The published submission**: Editor: open its "Production" entry:
     the status box "Submission published." stands above the file list and
     the discussions panel; "Schedule For Publication" is the only button,
     no "Move To Copyediting"; between the status box and the list a
     journal shows the notice "Assign a user to create galleys using the
     Assign link in the Participants list." [OJS2](#ojs2), a press its
     "Catalog Management" box (Rule 8).
   - **Control**: on the active submission no status box sits above
     "Production Ready Files": the notice box takes that slot while the
     submission is active here and unpublished (Rule 2).

2. **Arrive through "Send To Production"** {OJS OMP}

   Given: Editor, on a submission at Copyediting accepted from review,
   whose "Copyedited Files" list holds one file and whose "Draft Files"
   list is empty.

   - **The "Production" entry before the decision**: select "Production"
     in the workflow menu: the box "The Production stage has not yet been
     initiated.", with "Schedule For Publication" highlighted above it
     [A4](#a4) (Rule 6).
   - **"Send To Production"**: select "Copyediting" and press "Send To
     Production"; on the wizard's "Select Files" page tick the copyedited
     file and record the decision: the stage bubble reads "Production",
     and the "Production" entry lists the file in "Production Ready Files"
     as a new row of its own, with its "No", "File Name", "Date uploaded"
     and "Type" (Rules 2, 4).
   - **The notice**: on a journal the notice box above the list reads
     "Assign a user to create galleys using the Assign link in the
     Participants list." under the heading "Notification" (Rules 2, 3a;
     Side effects); on a press the box reads "Awaiting approval.", as it
     did before the decision [OMP1](#omp1) (Rule 3d).
   - **The "Copyediting" entry after the decision**: select it in the
     workflow menu: on a journal no notice box stands above "Draft Files"
     any more (Side effects).
   - **Control**: after the decision no status box stands above
     "Production Ready Files", where before it the entry showed "The
     Production stage has not yet been initiated." (Rules 2, 6).

3. **Assign a Layout Editor with "Ready for Production"** {OJS OMP}

   Given: Editor, on a scratch journal, assigned to a submission at
   Production with no discussion on the stage and no file in "Production
   Ready Files", with two Layout Editors of the journal not yet assigned
   to it.

   - **"Assign" with the message box empty**: on the "Participants" panel
     press "Assign", choose the first Layout Editor, choose nothing in
     "Choose a predefined message", leave the message box empty and
     complete the form: on a journal the notice box still reads "Assign a
     user to create galleys using the Assign link in the Participants
     list." [OJS1](#ojs1) (Rule 3b); on a press it reads "Awaiting
     approval." throughout this scenario [OMP1](#omp1) (Rule 3d).
   - **"Assign" with "Ready for Production"**: press "Assign" again, choose
     the second Layout Editor, choose "Ready for Production" in "Choose a
     predefined message" and complete the form: on the same page the
     notice box on a journal reads "Awaiting Galleys.", and the "Production
     Tasks & Discussions" panel lists a discussion (Rules 3b, 3c; Side
     effects).
   - **The second Layout Editor's mailbox**: holds the email "Ready for
     Production" from the assigning editor, ending with "Reply to this
     comment at #{id} {authors' family names}", whose link opens the
     submission's workflow, and an unsubscribe link (Side effects).
   - **The second Layout Editor's Tasks panel**: sign in as that
     Layout Editor and open
     the header's Tasks panel: two rows, "{editor} started a discussion:
     Ready for Production: …" and "You have been asked to review layouts
     for "{title}"."; press the panel's "Delete" on the task: the task row
     is gone and the discussion row stays [A2](#a2) (Side effects).
   - **The second Layout Editor's stage**: open the submission at "Production":
     "Production Ready Files", "Production Tasks & Discussions" and
     "Participants", with "Upload" above the list and "Schedule For
     Publication" at the top; no "Move To Copyediting", and on a journal
     no notice box (Actors rows 1–3, 5–6; Rule 3).
   - **"Upload"**: press "Upload" above "Production Ready Files": the
     wizard "Upload a Production Ready File" opens with the steps "1.
     Upload File", "2. Review Details" and "3. Confirm"; attach a file, go
     through the steps and press "Complete": the file is listed at once
     with its "No", "File Name", "Date uploaded" and "Type"; press the
     file's name: it downloads; press "Download All Files" under the list:
     one zip file downloads (Rule 4).
   - **The Editor's screen after the upload**: Editor: open the submission
     at "Production" again: on a journal the notice box still reads
     "Awaiting Galleys." (Rule 4).
   - **Control**: the first Layout Editor, assigned with the message box
     left empty, receives no email and has no row in the Tasks panel
     (Side effects).

4. **"Move To Copyediting"** {OJS OMP}

   Given: Editor, on a scratch journal, assigned to a submission at
   Production that arrived through "Send To Production" with one
   copyedited file ticked, so that "Production Ready Files" holds that
   file, its Author holding an account on the journal.

   - **The wizard**: press "Move To Copyediting": the wizard opens with the
     "Notify Authors" page alone; record the decision: it closes on "Moved
     to Copyediting" with "The submission, {title}, was moved to the
     copyediting stage. The author has been notified, unless you chose to
     skip that email." (Rule 7).
   - **Where it lands**: the stage bubble reads "Copyediting", and the
     "Copyediting" entry shows "Draft Files" and "Copyedited Files" with
     the files they held before the move, "Send To Production" and "Move
     to Review" offered again, and no notice box above "Draft Files"
     [A3](#a3) (Rule 7a).
   - **The "Production" entry**: select it in the workflow menu: the box
     "The Production stage has not yet been initiated." with "Schedule For
     Publication" highlighted above it [A4](#a4) and the "Participants"
     panel with its "Assign" beside it, and nothing else: no "Production
     Ready Files" list and no "Production Tasks & Discussions" panel (Rule
     7b).
   - **The Author's mailbox**: holds the email "Your submission has been
     moved to copyediting" (Side effects).
   - **Control**: before the decision the "Production" entry listed the
     file in "Production Ready Files", showed the "Production Tasks &
     Discussions" panel under it and offered both buttons (Rules 1, 4).

5. **The author's view** {OJS OMP}

   Given: Author, on My Submissions, with their own submission at
   Production.

   - **The Production stage**: open the submission's workflow at its
     "Production" entry: the "Production Tasks & Discussions" panel and
     nothing else: no "Production Ready Files" list, no "Participants"
     panel and no button; on a journal no notice box, on a press the
     "Awaiting approval." box above the panel [OMP1](#omp1) (Rule 12).
   - **Control**: an Editor opening the same submission at "Production"
     sees "Production Ready Files", the "Participants" panel, "Schedule
     For Publication" and "Move To Copyediting" (Rule 1).

   On a preprint server the author's view is scenario 9's.

App-specific:

6. **{OJS} No notice once a galley exists**

   Given: Editor, assigned to a submission at Production whose newest
   version has one galley, and to a second submission at Production whose
   newest version has none, neither with a discussion on the stage.

   - **The submission with a galley**: open its "Production" entry: no
     notice box above "Production Ready Files"; the list, the "Production
     Tasks & Discussions" panel and both buttons show as usual (Rules 1,
     3c).
   - **Control**: the second submission's "Production" entry shows "Assign
     a user to create galleys using the Assign link in the Participants
     list." under the heading "Notification" above the list (Rule 3a).

   A press has no galley notices [OMP1](#omp1) and a preprint server no
   notice box [OPS1](#ops1): scenarios 7 and 8.

7. **{OMP} The press's notice box**

   Given: Press Editor, assigned to a monograph at Production with a
   Layout Editor assigned to it, on the same press a Press Manager who is
   not assigned and the monograph's Author, and a second monograph of the
   same Author that is published.

   - **The Press Editor's entry**: open the monograph at "Production":
     above "Production Ready Files" the box "Awaiting approval." with "The
     monograph will not be listed in the catalog until it has been
     published. To add this book to the catalog, click on the Publication
     tab." (Rule 3d).
   - **The Press Manager not assigned**: opens the same monograph at
     "Production": the same box (Rule 3d; Actors row 2).
   - **The Layout Editor**: opens the same monograph at "Production": the
     same box (Rule 3d; Actors row 2).
   - **The Author**: Author: open the monograph from My Submissions at its
     "Production" entry: the same box above the "Production Tasks &
     Discussions" panel [OMP1](#omp1) (Rule 12).
   - **The published monograph**: Press Editor: open its "Production"
     entry: under the status box "Submission published." the box reads
     "Catalog Management" with "The monograph has been approved. Please
     visit Marketing and Publication to manage its catalog details, using
     the links just above.", above the file list (Rules 3d, 8).
   - **Control**: none of these views shows "Assign a user to create
     galleys using the Assign link in the Participants list." or "Awaiting
     Galleys.", the journal's notices, which a press never shows
     [OMP1](#omp1) (Rule 3d).

8. **{OPS} Open a preprint on a preprint server**

   Given: Preprint Server Manager, on the dashboard, with a submitted
   preprint to which a Moderator whose participation is limited to
   recommendations is assigned, and a second preprint that has been
   posted.

   - **The workflow menu**: open the preprint's workflow: the menu lists
     "Production" alone, and the stage bubble under the title reads
     "Production" (Rule 2).
   - **The Production stage**: the main column shows the "Production Tasks
     & Discussions" panel, with the "Participants" panel in the right-hand
     column; no "Production Ready Files" list and no notice box
     [OPS1](#ops1); at the top "Post the preprint", highlighted, then
     "Decline Submission" (Rules 1, 3e).
   - **"Post the preprint"**: press it: the newest version's "Title &
     Abstract" page opens under the "Preprint" group; select "Production"
     again: the entry is as before, with both buttons (Rule 6).
   - **The recommending Moderator**: Moderator: open the preprint at
     "Production": the two panels and "Post the preprint" alone; no
     "Decline Submission" and no recommendation control [A1](#a1) (Actors
     row 7).
   - **The posted preprint**: Preprint Server Manager: open its
     "Production" entry: the status box "Submission published." above the
     discussions and "Participants" panels, and no button at all (Rule 8).
   - **Control**: "Production" in the menu, the two panels, "Post the
     preprint" and "Decline Submission" are present on the queued
     preprint, so each screen that shows an absence is working
     [OPS1](#ops1).

9. **{OPS} Decline, revert and delete a preprint**

   Given: Preprint Server Manager, on a scratch preprint server, with a
   submitted preprint whose Author holds an account on the server and to
   which a Moderator is assigned, and a second preprint of the same Author
   that stands declined.

   - **The Author's view**: Author: open the preprint from My Submissions:
     the side menu has no "Workflow" group; the view opens on the newest
     version's "Title & Abstract" page, and the last page of the
     "Preprint" group, "Production Tasks & Discussions", shows the panel
     with its "Add" button (Rule 12).
   - **"Decline Submission"**: Preprint Server Manager: open the preprint's
     "Production" entry and press "Decline Submission": the wizard opens
     with the "Notify Authors" page alone; record the decision: it closes
     on "Submission Declined" with "The submission, {title}, has been
     declined and sent to the archives. All notifications have been sent,
     except any you chose to skip.", and the stage bubble reads
     "Declined" (Rule 9).
   - **The declined preprint's buttons**: reopen the preprint's workflow:
     it opens on the "Title & Abstract" page; select "Production" in the
     menu: the buttons are "Revert Decline" and "Delete", with "Post the
     preprint" still beside them [OPS3](#ops3) (Rule 9).
   - **The dashboard's "Declined" view**: lists the preprint (Rule 9).
   - **The Author's mailbox**: holds the email "Your submission has been
     declined" (Side effects).
   - **The Author's view after the decision**: Author: My Submissions no
     longer lists the preprint under "Active submissions"; opened by the
     address it had before, the same pages show under the bubble
     "Declined", with "Status: Unposted" on "Title & Abstract" and no word
     of the decision (Rule 12).
   - **The Moderator on the declined preprint**: Moderator: open the
     preprint at "Production": "Post the preprint" and "Revert Decline";
     no "Delete" (Rule 11; Actors rows 8–9).
   - **"Revert Decline"**: Preprint Server Manager: press "Revert Decline":
     the wizard opens with the "Notify Authors" page alone; record the
     decision: it closes on "Submission Reactivated" with "The submission,
     {title}, is now active in the submission stage. The author has been
     notified, unless you chose to skip that email." [OPS2](#ops2); the
     bubble reads "Production", the preprint has left the "Declined" view,
     and the buttons are "Post the preprint" and "Decline Submission"
     again (Rule 10); the Author's mailbox holds the email "We have
     reversed the decision to decline your submission" (Side effects).
   - **"Delete" on the second, declined preprint**: open it at
     "Production": "Delete" stands beside "Revert Decline"; press it and
     confirm the dialog that opens: the preprint no longer lists under the
     "Declined" view, and the Author's mailbox holds no new email (Rule
     11; Side effects).
   - **Control**: before the decision the entry offered "Post the
     preprint" and "Decline Submission" and neither "Revert Decline" nor
     "Delete" (Rule 1).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the press's notice box in French: the heading "En attente
    d'approbation." on a monograph never published, "Gestion du
    catalogue" once it is published, each over a French paragraph and
    no `##` code (Rule 3d; the guard for OMP3, issue report
    `docs/issues/U69-A15-omp-french-book-page-raw-keys.md`)
  - the guard for OMP2 (issue report
    `docs/issues/U70-A6-unpublished-book-notice-still-approved.md`): the
    Production stage reads "Awaiting approval." after "Unpublish"
  - the guard for OPS2 (issue report
    `docs/issues/U33-OPS2-preprint-revert-decline-names-submission-stage.md`):
    scenario 9's "Revert Decline" reads a closing text naming Production,
    and a "Notify Authors" instruction and template name that speak of
    no review (Rule 10)
- **Rarely met**:
  - a second "Send To Production" bringing the earlier production ready files back beside the newly ticked ones (Rule 7b): sending a submission to production twice is not an ordinary week's action; scenario 4 stops at the hidden "Production" entry
  - "Stage Assignment" changed on the Roles screen, Production ticked for Copyeditor and unticked again (Settings bullet 1): a manager changes a role's stages rarely, not in an ordinary week
- **Nothing new to test**:
  - an assigned Designer, Indexer or Proofreader (Actors rows 1, 3): the panels, "Upload" and the buttons scenario 3 reads as the Layout Editor
  - Site Administrator, Production editor or Guest Editor opening the stage (Actors preamble, row 1): the panels, notice and buttons scenario 1 reads as the Editor
  - the notice on a submission accepted without review then sent to production (Rule 2): the same "Assign a user to create galleys…" box scenario 2 reads
  - "Index Requested" on a press (Side effects): the email and the two Tasks rows scenario 3 reads for "Ready for Production"
  - the Site Administrator's "Delete" on a declined preprint (Rule 11; Actors row 9): the button scenario 9 presses as the Preprint Server Manager
  - a preprint server's single-stage workflow (Settings bullet 4): the workflow menu scenario 8 reads
- **Register carries it**:
  - OMP2 (the press's notice still "Catalog Management" after "Unpublish"; Rule 3d)
  - OJS2 (a published article with no galley still showing the galley notice; Rule 3c; scenario 1 marks it)
  - OJS1 (a discussion opened from the panel with no Layout Editor assigned flipping the notice to "Awaiting Galleys."; Rule 3b; scenario 3 marks the assignment half)
  - OPS3 ("Post the preprint" still offered while the preprint stands declined; Rule 6; scenario 9 marks it)
  - A4 ("Schedule For Publication" on the "Production" entry before the stage begins; Rule 6; scenarios 2 and 4 mark it)
  - A3 (no "Assign a copyeditor…" notice after the return; Rule 7a; scenario 4 marks it)
  - A2 (the layout task outliving "Galleys Complete"; Side effects; scenario 3 marks it)
- **Owned by another feature**:
  - a Copyeditor, Marketing and sales coordinator or Funding coordinator assigned here: "You don't currently have access to that stage of the workflow." (Actors preamble; *Workflow screen & stage access*, scenario 3)
  - an Editorial Board Member assigned to a preprint: the "Error" dialog (Actors preamble; *Workflow screen & stage access*)
  - "Send to Text Editor" for a manager-level role (Actors row 4; *Submission files*)
  - a production ready file's "Update File Details", "More Information" and "Delete" windows (Rule 4; *Submission files*)
  - the publish control on "Title & Abstract", its absence for a Moderator, and publishing on screen, whose flip to "Catalog Management" scenario 7 reads on a published monograph (Actors row 5; Rule 3d; Side effects; *Publish, schedule & versions*)
  - deleting a galley on the "Galleys" page, the step that brings the notice back (Rule 3c; *Galleys*)
  - a declined preprint's workflow landing on "Title & Abstract" (Rule 9; *Workflow screen & stage access*)
  - the "Delete" dialog's text and buttons, and what confirming removes (Rule 11; *Workflow screen & stage access*)
  - the author's "The Production stage has not yet been initiated." before the stage is reached (Rule 12; *Workflow screen & stage access*, scenario 3)
  - "Notify Authors" skipped: no email (Rules 7, 9, 10; Side effects; *Editorial decision recording*)
  - the Activity Log lines of the three decisions (Side effects; *Submission activity log & notes*)
  - the "Assign" form's roles and predefined messages, the Journal Manager absent (Actors row 10; *Stage participants*)
  - an edited email template prefilling "Notify Authors" and an edited task template prefilling the "Assign" message (Settings bullets 2–3; *Emails management*, *Tasks & discussions*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-19 and 2026-09-30), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [OPS2](#ops2) | "Revert Decline" on a preprint says it is active "in the submission stage", and its email speaks of a review the preprint never had | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [OMP2](#omp2) | On a press, an unpublished book's Production stage still says the monograph has been approved | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [OMP3](#omp3) | In French the press's Production notice keeps its French heading, but its paragraph is a raw code | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A1](#a1) | A recommend-only editor is offered "Upload", "Schedule For Publication" and "Assign" on Production, and no decision or recommendation | ❓ | minor | — |
| [A2](#a2) | The "You have been asked to review layouts" task is never cleared, not by "Galleys Complete" | ❓ | minor | — |
| [A3](#a3) | "Move To Copyediting" raises no "Assign a copyeditor…" notice on the Copyediting stage it returns to | ❓ | minor | — |
| [A4](#a4) | "Schedule For Publication" is offered on the "Production" entry before the stage begins | ❓ | minor | — |
| [OJS1](#ojs1) | The "Assign a user to create galleys" notice flips on a discussion, not on the assignment | ❓ | minor | — |
| [OJS2](#ojs2) | A published article with no galley still tells its editor to assign a user to create galleys | ❓ | minor | — |
| [OPS3](#ops3) | "Post the preprint" stays offered on a declined preprint | ❓ | minor | — |
| [OMP1](#omp1) | A press heads every Production view with "Awaiting approval." until the monograph is published, the author's included | ✅ | — | — |
| [OPS1](#ops1) | A preprint server's Production stage has no "Production Ready Files" list and no notice box | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — A recommend-only editor has nothing to decide on Production** · ❓ · minor.
An editor whose participation is limited to recommendations gets dedicated
"Recommend…" controls on the review stage while a deciding editor is
assigned beside them. On Production they get the panels, "Upload" above the
file list, "Schedule For Publication" and "Assign", exactly like a deciding
editor, and no "Move To Copyediting" and no recommendation control, with or
without a deciding editor beside them. On a preprint server a Moderator
limited to recommendations likewise opens the preprint to the panels and
"Post the preprint" alone, with no "Decline Submission" and no
recommendation control. The Copyediting stage treats them the same way
(*[Copyediting stage](U32-copyediting-stage.md)*, its A5).
Question: is that intended, or should a recommendation be possible here as
on review? Lean: intended; there is no decision to recommend at this stage
short of the move back, and a deciding editor is always assigned above
them.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — The layout task outlives the galleys** · ❓ · minor.
The "Ready for Production" message puts "You have been asked to review
layouts for "{title}"." into the assignee's Tasks panel, and a press's
"Index Requested" puts "You have been asked to create an index for
"{title}"." there. Building the galleys, sending "Galleys Complete" or
"Index Completed" back through the Participants panel, and publishing all
leave the task where it is; only the assignee's own "Delete" in the panel
removes it, and the discussion row the message created stays beside it.
The Copyeditor's "Request Copyedit" task behaves the same way
(*[Copyediting stage](U32-copyediting-stage.md)*, its A4).
Question: should "Galleys Complete" and "Index Completed", or the first
galley, clear the task? Lean: clear it on the "…Complete" message, which
is what the message is for.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — No copyediting notice after "Move To Copyediting"** · ❓ · minor.
An editor who moves a submission back to Copyediting expects the notice
they read there before ("Assign a copyeditor using the Assign link in the
Participants list." or "Awaiting Copyedits.") to be back, since the
submission is at Copyediting again with the same files. The return raises
none: the notices are recomputed on "Accept Submission" and "Send To
Production" and not on this decision, so the Copyediting entry shows its
lists with no notice until something else on that stage recomputes them.
Question: should the return recompute the Copyediting notices? Lean: a
defect, minor; the same silence on the skip-review path is that spec's A6.
Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — "Schedule For Publication" is offered before the stage begins** · ❓ · minor.
An editor who selects the "Production" entry of a submission still in
Copyediting reads "The Production stage has not yet been initiated." and,
above it, the highlighted "Schedule For Publication", which opens the
"Title & Abstract" page as it does from the live stage. The shortcut
records nothing, so the cost is a misleading button, the same one the
Submission stage shows on a declined submission (*[Submission
stage](U25-submission-stage.md)*, its A1).
Question: should the shortcut be hidden until the submission reaches
Production? Lean: hide it; it invites a step the stage is not ready for.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="ojs1"></a>
**OJS1 — The galley notice reads the discussions, not the participants** · ❓ · minor.
The notice box tells an assigned editor to assign a user to create galleys
until a discussion exists on this stage, and reads "Awaiting Galleys." from
then on. The "Assign" form's message opens such a discussion, whichever
predefined message is chosen, so the ordinary assignment flips the notice
as expected. But an editor who assigns a Layout Editor with the message box
left empty keeps reading "Assign a user…", and any discussion opened on
this stage, with no Layout Editor assigned, reads "Awaiting Galleys.". The
Copyediting notice has the same rule (*[Copyediting
stage](U32-copyediting-stage.md)*, its A3).
Question: should the notice read the Participants panel rather than the
discussions? Lean: yes; the notice names the Participants list as its
condition.
Basis: probe. <sup>[f-ojs1](#fn-ojs1)</sup>

<a id="ojs2"></a>
**OJS2 — The galley notice outlives publishing** · ❓ · minor.
An assigned editor who opens the "Production" entry of a published article
whose version has no galley still reads "Assign a user to create galleys
using the Assign link in the Participants list." between the status box
"Submission published." and the file list, and reads it again after
"Unpublish". By the notice's own rule (Rule 3a) that is right, since no
galley exists; to a reader of a published article it is a stale
instruction.
Question: should the galley notices stop once the article is published?
Lean: yes; the stage is over.
Basis: probe. <sup>[f-ojs2](#fn-ojs2)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press shows "Awaiting approval." to everyone until the monograph is published** · ✅ · —.
A journal's Production entry carries per-editor galley notices ("Assign a
user to create galleys…", "Awaiting Galleys."). A press carries none of
them: instead every role that opens the entry, the Author included, reads
"Awaiting approval." with "The monograph will not be listed in the catalog
until it has been published…" from the monograph's arrival at Production
until published, and "Catalog Management" with "The monograph has been
approved…" after. Intended: the press's notice family is about the
catalog, not the galleys, and its publication formats belong to
*Publication formats & proof terms* {OMP}.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — On a press, an unpublished book's Production stage still says the monograph has been approved** · 🐞 · low.
When an editor of any press unpublishes a book, its Production stage
keeps the "Catalog Management" notice: "The monograph has been approved.
Please visit Marketing and Publication to manage its catalog details,
using the links just above." Expected is the notice an unpublished book
has: "Awaiting approval." with "The monograph will not be listed in the
catalog until it has been published. To add this book to the catalog,
click on the Publication tab."

The wrong notice stays until the book is published again. The fix is one
condition in one shared class; the fault has been there since 3.2.
The same fault is [Catalog management, its A6](U70-catalog-management.md#a6).
Basis: probe, 2026-10-03. <sup>[f-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — In French the press's Production notice is a heading over a raw code** · 🐞 · medium.
With the interface in French (Canada), the notice box of Rule 3d keeps
its French heading, but the paragraph under it is a raw code, the text's
internal name between hash signs:
- on a monograph never published, "En attente d'approbation." above
  "##notification.type.formatNeedsApprovedSubmission##" (English "The
  monograph will not be listed in the catalog until it has been
  published. To add this book to the catalog, click on the Publication
  tab.");
- once it is published, "Gestion du catalogue" above
  "##notification.type.visitCatalog##" (English "The monograph has been
  approved. Please visit Marketing and Publication to manage its catalog
  details, using the links just above.").

Every role that sees the box reads it so, the Author included, and after
"Unpublish" the box still reads "Gestion du catalogue" with the code, as
[OMP2](#omp2) says it does in English. A French-speaking editor or author
learns the monograph's state but not what to do about it. A journal's
galley notice reads French ("Assigner un-e utilisateur-trice à la
création des épreuves en utilisant le lien « Assigner » dans la liste
des participants."). The workflow screen's own codes around the box are
[Workflow screen & stage access, its A11](U24-workflow-screen-and-stage-access.md#a11),
and why a missing French text shows as a code at all is
[Languages & locales, its A4](U57-languages-and-locales.md#a4).
Expected: a French paragraph under the French heading; the English
screen shows no code. Both paragraphs read in French (Canada) up to OMP
3.1.2; their entries have been empty since 3.2.0. One of several French
(Canada) texts the press lacks, with its book and chapter pages
([→ Monograph landing page, A15](U69-monograph-landing-page.md#a15)),
whose report covers it.
Basis: probe, 2026-10-04. <sup>[f-omp3](#fn-omp3)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A preprint server's Production stage has no file list and no notice** · ✅ · —.
A preprint server's Production entry shows the "Production Tasks &
Discussions" and "Participants" panels and its decision buttons, and never
a "Production Ready Files" list or a notice box: the preprint's files are
its galleys, managed on the "Galleys" page of the "Preprint" group, and the
journal's galley notices are not shown to its editors. Intended: the
application ships that way.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — "Revert Decline" on a preprint says it is active "in the submission stage", and its email speaks of a review the preprint never had** · 🐞 · low.
A Preprint Server Manager or Moderator who reverts the decline of a
preprint reads, on the closing window, "The submission, {title}, is now
active in the submission stage. The author has been notified, unless you
chose to skip that email." A preprint server has no Submission stage.
The preprint is back in Production, as its stage bubble and buttons
show.

The email this decision sends is named and described as if the preprint
had been declined without review. The "Notify Authors" page offers the
template "Reinstate Submission Declined Without Review" and asks the
moderator to tell the author "whether the submission is expected to
undergo further review". Settings › Workflow › Emails describes the
email as "This email notifies the author that a previous decision to
decline their submission without review is being reverted." The author
receives the right email, "We have reversed the decision to decline your
submission", which says "A moderator will look further at your
submission before deciding whether to decline or post the submission."

Nothing is lost, since the decline is reverted as intended. Only the
staff's screens mislead. The template's name is stored when a server is
installed, so existing servers keep the old name unless it is repaired.
Basis: probe, 2026-10-04. <sup>[f-ops2](#fn-ops2)</sup>

<a id="ops3"></a>
**OPS3 — "Post the preprint" is offered on a declined preprint** · ❓ · minor.
A Preprint Server Manager who declines a preprint expects the top of the
Production entry to offer "Revert Decline" and "Delete" alone. "Post the
preprint" stays beside them, since it is hidden only once the preprint has
left the stage, and pressing it lands on the "Title & Abstract" page where
"Post" is still offered to the manager. A Moderator who presses it,
deciding or limited to recommendations, lands on that page with no "Post"
at all (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md#a2)*,
its A2). A journal's Submission stage has the same oddity with its
"Schedule For Publication" shortcut (*[Submission
stage](U25-submission-stage.md)*, its A1).
Question: should the shortcut be hidden while the preprint stands
declined? Lean: yes; a declined preprint is not meant to be posted.
Basis: probe. <sup>[f-ops3](#fn-ops3)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-19 at the checkouts' tips (`checkouts/ojs`, `checkouts/omp`,
`checkouts/ops`, each with its `lib/pkp` and `lib/ui-library`). Every claim
of the body was live-probed 2026-09-19 on scratch contexts of all three apps
(one throwaway account per registry role, scratch submissions, the mail
catcher read by recipient), with the preprint server as the control for
every journal-only claim and the journal and press as the control for the
preprint server's decisions; each note below names what its drive saw, and
the `t` notes hold the drives of the draft's open questions.

<a id="fn-a"></a>
**a** — The stage's panels: `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js`, `WorkflowConfig[WORKFLOW_STAGE_ID_PRODUCTION]`: `getPrimaryItems` pushes `WorkflowNotificationDisplay`, `FileManager` namespace `PRODUCTION_READY_FILES`, `DiscussionManager`, in that order; `getSecondaryItems` pushes `ParticipantManager`; `getActionItems` pushes the `editor.submission.schedulePublication` button (`isPrimary`, `action: 'navigateToMenu'` to `publication_{id}_titleAbstract`) and, guarded by `isDecisionAvailable(submission, DECISION_BACK_FROM_PRODUCTION)`, the `editor.submission.decision.backToCopyediting` button (`isWarnable`). `useWorkflowConfigOMP.js` deep-merges `workflowConfigEditorialOMP.js` over it and that file defines no `WORKFLOW_STAGE_ID_PRODUCTION` key, so the press shows the journal's roster. `useWorkflowConfigOPS.js` deep-merges `workflowConfigEditorialOPS.js`, which redefines `getPrimaryItems` (`WorkflowNotificationDisplay`, `DiscussionManager`; no `FileManager`) and `getActionItems` (note h) and leaves `getSecondaryItems` to the journal's definition (`utils/deepMerge.js` replaces a key only where the source defines it), so the preprint server keeps the "Participants" panel. Titles from `managers/FileManager/useFileManagerConfig.js` `PRODUCTION_READY_FILES`: `editor.submission.production.productionReadyFiles` "Production Ready Files", `fileManager.productionReadyFilesDescription` "These are the files that will be sent for publication" (OJS's own `editor.submission.production.productionReadyFilesDescription`, "The layout editor prepares these files…", is the legacy grid's and never rendered by the Vue list). The discussions heading is `getDiscussionTitleByStage()` in `managers/DiscussionManager/useDiscussionManagerHelpers.js` → `submission.queries.production` "Production Tasks & Discussions" (each app carries the same text). The `common.getPrimaryItems` guard shows `user.authorization.accessibleWorkflowStage` when the stage is outside `permissions.accessibleStages`, which is U24's rule. `WorkflowActionChangeDecision.vue` (`editor.submission.workflowDecision.changeDecision` "Change decision") is imported and registered in `WorkflowPageOPS.vue` and mounted by no config in any app (a grep of the three `lib/ui-library/src` trees finds only the import and the `Components` entry): a dead candidate, recorded in `docs/tracking/UNASSIGNED.md`. Sighted 2026-09-18 and 2026-09-19 on the Copyediting drives (Rule 1 in part): the OJS and OMP Production entry after "Send To Production" with "Production Ready Files" holding the promoted files; on OPS the Production entry with "Post the preprint" and "Decline Submission" at the top and "Assign" on the Participants panel. Live-probed 2026-09-19 (the Actors preamble, rows 1 and 11, Rule 1, Rule 2's arrival): on OJS and OMP every role the preamble admits opened the entry to "Production Ready Files", "Production Tasks & Discussions" and "Participants" (heading order top to bottom, "Participants" in the right column, the line "These are the files that will be sent for publication" under the list heading, "Schedule For Publication" highlighted before "Move To Copyediting"); an assigned Copyeditor, Marketing and sales coordinator or Funding coordinator got the in-stage box "You don't currently have access to that stage of the workflow." under the entry's heading, while a role not assigned to the submission at all (a Section Editor, Layout Editor or Copyeditor typing the address) and on OPS the assigned Editorial Board Member got the dialog "Error / The current role does not have access to this operation. / OK" over the dashboard list, the panel's own request answering 401 ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)); the Editorial Board Member's "Assigned to me (1)" still listed the preprint. On OPS the manager and the assigned Moderator saw one table ("Production Tasks & Discussions") and "Participants", no notice; the discussions panel and its "Add" showed for every admitted role, the author included.

<a id="fn-b"></a>
**b** — Stage sets: `registry/userGroups.xml`. OJS: manager (no `stages`, every stage), editor `1,3,4,5,6`, productionEditor `4,5,6`, sectionEditor and guestEditor `1,3,4,5,6`, designer / indexer / layoutEditor / proofreader `5,6`, author and translator `1,3,4,5,6`, copyeditor and marketing `4`, funding `1,3`, externalReviewer `3`, reader / subscriptionManager / editorialBoardMember none. OMP: the same with `2` added to editor, sectionEditor, funding (`1,2,3`), author and translator, no guestEditor, plus volumeEditor `1,2,3,4,5,6`, chapterAuthor `4,5,6`, internalReviewer `2`. OPS: manager `5,6`, sectionEditor `5,6`, author `5,6`, reader and editorialBoardMember none. Stage 5 is `WORKFLOW_STAGE_ID_PRODUCTION`. Permission levels: `productionEditor` is `ROLE_ID_MANAGER`; `translator`, `volumeEditor` and `chapterAuthor` are `ROLE_ID_AUTHOR`, refused by the editorial dashboard's `roleBasedAccessDenied` and served the author config (the Copyediting drive of 2026-09-19 saw the refusal and the author-view landing on OJS and OMP). On-screen names: `default.groups.name.designer` "Designer", `.indexer` "Indexer", `.layoutEditor` "Layout Editor", `.proofreader` "Proofreader", `.productionEditor` "Production editor". The Roles form (`controllers/grid/settings/roles/form/UserGroupForm.php`) heads the boxes "Stage Assignment"; the manager row has no "Edit" (`RoleDAO::getAlwaysActiveStages()`). No passthrough key sets a role's stages (scenarios.md), so the other end is reached on the screen only. Live-probed 2026-09-19 (Settings bullet 1, all three apps, as the manager): every default above read from each role's "Edit" form and from the list; the list has one column per stage with a live box per row (a click saves at once with the status "Copyeditor role assigned to Production stage." / "Copyeditor role unassigned from Production stage.", the row refetched), greyed on the manager-level rows, the Reviewer rows outside their review column and the Reader row; the "Journal manager" / "Press manager" row shows every box empty and greyed while the "Preprint Server manager" row shows its one box ticked and greyed (the role reaches every stage either way; the display is the *Roles configuration* screen's, `docs/tracking/incidentals.md`). With the Copyeditor's Production box ticked, the assigned Copyeditor reached the panels and "Copyeditor" was offered by "Assign"; unticked again, both reverted. The Layout Editor's box could not be unticked: Production is that role's last stage and the form answers "Your changes have been saved." with the box still ticked (the Copyediting spec's A10), so the unticked end was driven on the Copyeditor alone.

<a id="fn-c"></a>
**c** — Decision roster: `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` in OJS and OMP, `case WORKFLOW_STAGE_ID_PRODUCTION: $decisionTypes[] = new BackFromProduction()`, with no status branch; `case WORKFLOW_STAGE_ID_DONE: [new ReturnToWorkflow()]`, and the `ReturnToDone` addition when a published version exists with a Done history (U24's Rule 18). The roster is empty off the active stage (`$isActiveStage`), for assistants (`checkDecisionPermissions()` never grants `canMakeDecision` to `ROLE_ID_ASSISTANT`) and for a recommend-only editor (`canMakeDecision` needs `getDecisionTypesMadeByRecommendingUsers($stageId)` non-empty, and both apps' `classes/decision/Repository.php` list a type for `WORKFLOW_STAGE_ID_SUBMISSION` alone), which is A1. `isDecisionAvailable()` in `composables/useSubmission.js` matches `submission.availableEditorialDecisions` against the active stage's id, so the button vanishes once the submission leaves Production, while the shortcut button of note k has no such guard. Live-probed 2026-09-19 (Rule 8, Actors row 6; all three apps): "Move To Copyediting" offered to the manager, the Editor and the assigned Section Editor, Guest Editor and Production editor at Production, to no assistant, to no recommend-only editor and to nobody once the submission is published; never on the preprint server.

<a id="fn-d"></a>
**d** — The journal's notice box is `WorkflowNotificationDisplay.vue`, whose `getRequestOptionsPerStage()` posts to `notification/fetchNotification` for `NOTIFICATION_TYPE_ASSIGN_PRODUCTIONUSER` and `NOTIFICATION_TYPE_AWAITING_REPRESENTATIONS` on `ASSOC_TYPE_SUBMISSION` when `isOJS()`, for `NOTIFICATION_TYPE_VISIT_CATALOG` and `NOTIFICATION_TYPE_FORMAT_NEEDS_APPROVED_SUBMISSION` when `isOMP()`, and returns `null` on OPS (Rule 3e); `PKPNotificationHandler::fetchNotification()` reads the signed-in user's own rows plus the rows with no user. Texts: OJS's `locale/en/locale.po` `notification.type.assignProductionUser` "Assign a user to create galleys using the Assign link in the Participants list." and `notification.type.awaitingRepresentations` "Awaiting Galleys."; the heading is the default title, which the Copyediting drive of 2026-09-18 saw rendered as "Notification". Rows are created and deleted by `lib/pkp/classes/notification/managerDelegate/PKPEditingProductionStatusNotificationManager::updateNotification()`, for each `StageAssignment` of the submission at its current stage with role `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` (an unassigned manager has no row): at `WORKFLOW_STAGE_ID_PRODUCTION`, with any representation of the latest publication (`RepresentationDAO::getByPublicationId()`, a galley) both types are deleted; otherwise, with an `EditorialTask` at that stage (the code's comment: "a production user is assigned i.e. there is a production discussion") AWAITING is created and ASSIGN deleted, and with none ASSIGN is created and AWAITING deleted; the same call at Production deletes the copyediting pair. The recomputation runs on `Decision::SEND_TO_PRODUCTION` (`lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()` names both pairs for it; `BACK_FROM_PRODUCTION` is not listed, A3); on a participant added or removed at Copyediting or Production (`StageParticipantGridHandler`); on the assign form's message (`PKPStageParticipantNotifyForm::execute()`); on a task saved (`api/v1/submissions/tasks/EditorialTaskController.php`); and on a galley added or deleted through the legacy `controllers/grid/articleGalleys/ArticleGalleyGridHandler.php` (OJS) or `preprintGalleys/PreprintGalleyGridHandler.php` (OPS, the AWAITING type alone); the Vue "Galleys" page's own requests recompute it too (note t1). The manager runs whatever the publication's status, so a published article with no galley and no discussion keeps the ASSIGN row (OJS2). Sighted 2026-09-18 on OJS (the incidental from the Copyediting claim check): "Assign a user to create galleys using the Assign link in the Participants list." on the Production entry for the assigned editor after "Send To Production". Live-probed 2026-09-19 (Rule 3, Actors row 2, the notice side effects; OJS, with OMP and OPS as controls): a framed box with the level-3 heading "Notification" and one paragraph above "Production Ready Files" for the assigned Section Editor, Guest Editor and Production editor; none for the unassigned manager or editor, the assistants or the author; the states of notes t1 and t2.

<a id="fn-e"></a>
**e** — "Production Ready Files": `useFileManagerConfig.js` `PRODUCTION_READY_FILES`, `fileStage` `SUBMISSION_FILE_PRODUCTION_READY`, actions for `ROLE_ID_SUB_EDITOR` / `MANAGER` / `SITE_ADMIN` / `ASSISTANT`: `FILE_LIST`, `FILE_UPLOAD`, `FILE_EDIT`, `FILE_DELETE`, `FILE_SEE_NOTES`, `FILE_DOWNLOAD_ALL`; `FILE_SEND_TO_EDITOR` for `SITE_ADMIN` / `MANAGER`; no `ROLE_ID_AUTHOR` entry, and the author configs never mount the namespace (note l). Roles are matched by `useCurrentUser().hasCurrentUserAtLeastOneAssignedRoleInStage()` against `stage.currentUserAssignedRoles`, which `lib/pkp/classes/submission/maps/Schema.php` fills from the user's stage assignments or from the global manager / site-admin role when the user is assigned in no role. Columns from `getColumns()`: `common.numero` "No", `common.fileName` "File Name", `common.dateUploaded` "Date uploaded", `common.type` "Type", a screen-reader-only `common.moreActions` "More Actions"; row menu from `getItemActions()`: `grid.action.updateFile` "Update File Details", `grid.action.moreInformation` "More Information", `grid.action.delete` "Delete". Top button from `getTopItems()`: `FILE_UPLOAD` → `common.upload` "Upload" → `useFileManagerActions.fileUpload()` opens the legacy `wizard.fileUpload.FileUploadWizardHandler` op `startWizard` with the config's `wizardTitleKey` `submission.upload.productionReady` "Upload a Production Ready File"; the namespace has no `FILE_SELECT_UPLOAD`, so no "Upload/Select Files" window (the Copyediting lists' `gridComponent` is absent here). Bottom link from `getBottomItems()`: `FILE_DOWNLOAD_ALL` with `filesCount` → `submission.files.downloadAll` "Download All Files" → `api.file.FileApiHandler` op `downloadAllFiles`. The legacy `lib/pkp/controllers/grid/files/productionReady/ProductionReadyFilesGridHandler.php` (the same file stage, ops `fetchGrid`, `addFile`, `downloadFile`, `deleteFile`) is referenced by no template, config or page in the three checkouts: the Vue list is the live surface and the handler a dead candidate (`docs/tracking/UNASSIGNED.md`). `lib/pkp/controllers/grid/files/proof/ManageProofFilesGridHandler.php` (`SUBMISSION_FILE_PROOF`, title `submission.pageProofs`) is mounted only from `templates/controllers/grid/files/proof/manageProofFiles.tpl`, which only OMP's `controllers/grid/catalogEntry/PublicationFormatGridHandler.php` renders, inside the publication-format window (*Publication formats & proof terms*): unreachable on a journal or preprint server, recorded there too. Sighted 2026-09-18 on OJS and OMP: the promoted files as rows of the list after "Send To Production". Live-probed 2026-09-19 (Rule 4, Actors row 3; OJS and OMP): the header cells "No", "File Name", "Date uploaded", "Type" and a screen-reader-only "More Actions"; a row such as "10 article.pdf 2026-09-19 Article Text" ("Appendix" on the press, its first genre); the row menu "Update File Details", "More Information", "Delete" for the Section Editor, Layout Editor and Proofreader; the "Delete" dialog's text and buttons, "Cancel" keeping the row and "OK" removing it; the file name's link downloading the file; "Upload" opening "Upload a Production Ready File" with the steps "1. Upload File", "2. Review Details", "3. Confirm" and "Complete" as the third step's button, the file listed at once; "Download All Files" a `<button>` under the list, absent on the empty list ("No Items"), downloading `{id}--production-ready-files.zip`, offered with "Upload" to the Layout Editor and Proofreader and not to the author. A wizard left at "2. Review Details" (no prompt) leaves the file listed with the first genre: the wizard stores the file at its first step, a *Submission files* observation (`docs/tracking/incidentals.md`).

<a id="fn-f"></a>
**f** — The press's notice: `WorkflowNotificationDisplay.vue` asks for `NOTIFICATION_TYPE_FORMAT_NEEDS_APPROVED_SUBMISSION` and `NOTIFICATION_TYPE_VISIT_CATALOG`; rows are created and deleted by `lib/pkp/classes/notification/managerDelegate/PKPApproveSubmissionNotificationManager::updateNotification()` with no user id (`isVisibleToAllUsers()` true, so every reader gets them): with the current publication unpublished (`datePublished` empty) the `FORMAT_NEEDS_APPROVED_SUBMISSION` row exists and `VISIT_CATALOG` is deleted, published the other way round. It runs on the submission's submit (`PKPSubmissionController::submit()`), on publish and unpublish (`omp/classes/publication/Repository.php`), and when the scenario API submits (`PKPSubmissionScenarioBuilder`). Texts from `omp/locale/en/locale.po` through `omp/classes/notification/managerDelegate/ApproveSubmissionNotificationManager.php`: title `notification.type.approveSubmissionTitle` "Awaiting approval." with `notification.type.formatNeedsApprovedSubmission` "The monograph will not be listed in the catalog until it has been published. To add this book to the catalog, click on the Publication tab."; title `notification.type.visitCatalogTitle` "Catalog Management" with `notification.type.visitCatalog` "The monograph has been approved. Please visit Marketing and Publication to manage its catalog details, using the links just above.". `workflowConfigAuthorOMP.js` mounts `WorkflowNotificationDisplay` on the author's Production entry (note l), which is why the author reads it too. Sighted 2026-09-18 on OMP (the incidental): "Awaiting approval." heading every Production view. Live-probed 2026-09-19 (Rule 3d, Side effects, OMP1, OMP2; OMP, with OJS as the control): the "Awaiting approval." box for the assigned Series editor, the unassigned Press Manager, the assigned Layout Editor and Indexer and the author on an unpublished monograph; "Catalog Management" with its paragraph for the editor, manager and author after "Publish" on screen and on a seed-published monograph alike; after "Unpublish" (the dialog "Are you sure you don't want this to be published?", the request answered 200) the same three still read "Catalog Management" with the header back at "Production" and both buttons offered, five seconds later too, on two monographs, and a second publish left it there (OMP2): the unpublish path evidently leaves the `VISIT_CATALOG` row standing, which the code above does not explain; not traced further. On the journal, unpublishing left the galley notice as it was.

<a id="fn-g"></a>
**g** — `lib/pkp/classes/decision/types/BackFromProduction.php`: `getStageId()` `WORKFLOW_STAGE_ID_PRODUCTION`, `getNewStageId()` `WORKFLOW_STAGE_ID_EDITING`, `getNewStatus()` null; `getLabel()` `editor.submission.decision.backToCopyediting`, whose text in lib/pkp's `locale/en/editor.po` is "Move To Copyediting" (no app override; the atlas row's "Back to Copyediting" is the key's name, not the screen's word); `getSteps()` adds the `Email` step (`editor.submission.decision.notifyAuthors` "Notify Authors", mailable `DecisionBackFromProductionNotifyAuthor`, `toRoleIds [ROLE_ID_AUTHOR]`, attachers Upload, the "Production Ready Files" stage and Library) only when the submission has author participants, and no file step; `getCompletedLabel()` `….completed` "Moved to Copyediting"; `getCompletedMessage()` `….completed.description` "The submission, {$title}, was moved to the copyediting stage. The author has been notified, unless you chose to skip that email."; `getLog()` `….log` "{$editorName} moved this submission to the copyediting stage." Files are never deleted by a decision; the Production entry hides its list while the stage is ahead of the active one (`hasNotSubmissionStartedStage()` is `submission.stageId < stageId`, which stops the common config at the status box "The Production stage has not yet been initiated.", U24's Rule 15a), and `SendToProduction`'s `PromoteFiles` step copies the newly ticked files into `SUBMISSION_FILE_PRODUCTION_READY` beside the earlier ones. The arrival is `SendToProduction` (`getNewStageId()` `WORKFLOW_STAGE_ID_PRODUCTION`), whose promoted files the Copyediting spec's Rule 8 describes. Scenario keys: `decisions: [..., 'sendToProduction']` and `'backFromProduction'` resolve on OJS and OMP (`lcfirst(class_basename())` of the app's `getDecisionTypes()`). Live-probed 2026-09-19 (Rules 7, 7a, 7b; OJS and OMP): the wizard headed "Move To Copyediting" / "Notify Authors" with the one step, "To: {author}", the template "Submission Moved to Copyediting", "Skip this email", "Cancel" and "Record Decision"; the closing dialog "Moved to Copyediting" with the quoted text verbatim and "View Submission Summary" landing on the Copyediting entry; the bubble "Copyediting", "Draft Files" and "Copyedited Files" as before, "Send To Production" and "Move to Review" again, no "Notification" box for the assigned editor or the manager; the "Production" entry then reading "The Production stage has not yet been initiated." with "Schedule For Publication" above and the Participants panel ("Assign" and its rows) beside, no file list, no discussions panel; a second "Send To Production" with a newly uploaded copyedited file listing that file and the earlier one as two rows.

<a id="fn-h"></a>
**h** — OPS: `classes/core/Application.php::getApplicationStages()` returns `[WORKFLOW_STAGE_ID_PRODUCTION]`; `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` returns nothing outside Production and Done, and at Production `[new RevertDecline()]` for `STATUS_DECLINED`, `[new Decline()]` for `STATUS_QUEUED`, plus the `ReturnToDone` addition. `ops/classes/decision/types/Decline.php` extends lib/pkp's `InitialDecline` with `getStageId()` `WORKFLOW_STAGE_ID_PRODUCTION` (decision `Decision::INITIAL_DECLINE`, `getNewStatus()` `STATUS_DECLINED`, no stage change; label `editor.submission.decision.decline` "Decline Submission", completed `….decline.completed` "Submission Declined" with `….completed.description` "The submission, {$title}, has been declined and sent to the archives. All notifications have been sent, except any you chose to skip.", log `….decline.log` "{$editorName} declined this submission.", mailable `DecisionInitialDeclineNotifyAuthor` whose template `EDITOR_DECISION_INITIAL_DECLINE` carries `emails.editorDecisionInitialDecline.subject` "Your submission has been declined" and the name `mailable.decision.initialDecline.notifyAuthor.name`, "Submission Declined" in OPS's locale); `RevertDecline.php` extends `RevertInitialDecline` the same way (`Decision::REVERT_INITIAL_DECLINE`, `getNewStatus()` `STATUS_QUEUED`; label `editor.submission.decision.revertDecline` "Revert Decline", completed `….revertDecline.completed` "Submission Reactivated" with `….revertInitialDecline.completed.description` "The submission, {$title}, is now active in the submission stage. The author has been notified, unless you chose to skip that email." (OPS2), log `….revertDecline.log` "{$editorName} reversed the decision to decline this submission.", mailable `DecisionRevertInitialDeclineNotifyAuthor`, template `EDITOR_DECISION_REVERT_INITIAL_DECLINE`, subject `emails.editorDecisionRevertInitialDecline.subject` "We have reversed the decision to decline your submission", name "Reinstate Submission Declined Without Review"). Both `getSteps()` add the "Notify Authors" `Email` step only, with Upload and Library attachers. Buttons: `workflowConfigEditorialOPS.js` `[WORKFLOW_STAGE_ID_PRODUCTION].getActionItems` pushes `editor.submission.schedulePublication` (OPS's `locale/en/locale.po` override "Post the preprint", `isPrimary`, guarded by `getActiveStage(submission).id === WORKFLOW_STAGE_ID_PRODUCTION` alone, OPS3), `editor.submission.decision.decline` (`isWarnable`, `isDecisionAvailable(…DECISION_INITIAL_DECLINE)`), `editor.submission.decision.revertDecline` (`isSecondary`, `…DECISION_REVERT_INITIAL_DECLINE`) and `common.delete` (note i). Recommend-only: `$decisionTypes[] = Repo::decision()->getDecisionTypesMadeByRecommendingUsers($stageId)` appends the returned array itself as one element (OPS's `classes/decision/Repository.php` returns `[]` unless a hook fills it), and `Schema.php`'s `availableEditorialDecisions` map calls `getDecision()` on each element, which the draft expected to fail the request; the drive below shows it does not. The stage bubble's "Declined" and the dashboard's "Declined" view are U24's and U23's. Scenario keys: `decisions: ['decline']` and `['decline', 'revertDecline']` resolve on OPS. Sighted 2026-09-19 on OPS (the Copyediting drive): "Post the preprint" and "Decline Submission" at the top of a queued preprint's Production entry. Live-probed 2026-09-19 (Rules 9–11, Actors rows 7–9, the three preprint-server side effects, OPS1–OPS3; OPS, with OJS and OMP as controls that never show "Decline Submission", "Revert Decline" or "Delete"): the decline wizard headed "Decline Submission" / "Notify Authors" with the one step, closing on "Submission Declined" with the quoted text verbatim; the bubble "Declined", the "Declined (1)" view listing the preprint as "Declined during the Production stage.", the buttons "Post the preprint", "Revert Decline", "Delete" for the unassigned manager and the administrator and "Post the preprint", "Revert Decline" for the assigned Moderator; the workflow opening on "Preprint: Title & Abstract" whether by address, from the view's "View" or from the closing link; the revert wizard with the subject "We have reversed the decision to decline your submission" and the template button "Reinstate Submission Declined Without Review", closing on "Submission Reactivated" with the quoted text verbatim, the bubble "Production" again, "Declined (0)", the buttons "Post the preprint" and "Decline Submission" back; the emails and log lines of the side effects, a skipped email adding nothing to the author's inbox and no email line to the log. The recommend-only case: after the Participants row's "Edit" › "Edit Assignment" ticks "This participant is only allowed to recommend an editorial decision and will require an authorised editor to record editorial decisions", the row reads "Only allowed to recommend an editorial decision" and that Moderator's Production entry opens normally, from the dashboard and by address, to the two panels and "Post the preprint" alone, the submission request answering 200 with no console error, on two servers: the nested-array premise the draft read in `getAvailableEditorialDecisions()` does not show on screen (A1).

<a id="fn-i"></a>
**i** — The "Delete" button: `workflowConfigEditorialOPS.js` pushes `common.delete` "Delete" (`isWarnable`, `WORKFLOW_DELETE_SUBMISSION`) when `isDecisionAvailable(…DECISION_REVERT_INITIAL_DECLINE)` (so only while declined) and `hasCurrentUserAtLeastOneAssignedRoleInAnyStage(submission, [ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN])`, which reads every stage's `currentUserAssignedRoles`, filled from the global manager role for a manager assigned in no role (note e), so an unassigned Preprint Server Manager is expected to see it and a Moderator never. `useWorkflowActions.js::workflowDeleteSubmission()` opens the dialog `common.delete` / `editor.submissionArchive.confirmDelete` "Are you sure you want to permanently delete this submission?" with `common.confirm` / `common.cancel`, then sends `DELETE _submissions/{id}`; `lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php::delete()` refuses with `api.submissions.403.unauthorizedDeleteSubmission` unless `Repo::submission()->canCurrentUserDelete()`, which grants managers of the context and site administrators (and an author on their own incomplete draft). The dialog and the aftermath are U24's Rule 19. That the server refuses a non-manager's deletion was not driven: a Moderator has no button that sends the request, so the refusal rests on `canCurrentUserDelete()` as read. Live-probed 2026-09-19 (Rule 11, Actors row 9; OPS): "Delete" offered on a declined preprint to the unassigned Preprint Server Manager and the Site Administrator, never to the assigned Moderator and never while the preprint is queued; the dialog "Delete" / "Are you sure you want to permanently delete this submission?" with "Confirm" and "Cancel"; "Cancel" leaving the entry unchanged; "Confirm" landing on the dashboard's "Assigned to me" with the panel closed, "Declined (0)", the author's inbox unchanged, the old address answering "Error / Invalid submission. / OK" (404).

<a id="fn-j"></a>
**j** — The "Assign" form and its messages: the Vue "Participants" panel opens the legacy `StageParticipantGridHandler` ops `addParticipant` and `viewNotify`, whose `PKPStageParticipantNotifyForm::execute()` → `sendMessage()` creates an `EditorialTask` of type `DISCUSSION` with `createdBy` the recipient's id, a `NOTIFICATION_TYPE_NEW_QUERY` task row for them, and mails the message with `subject($template->getLocalizedData('title'))`, so the subject is the template's name and the sender the signed-in editor. For the `LAYOUT_REQUEST` template it also calls `_addAssignmentTaskNotification()` with `NOTIFICATION_TYPE_LAYOUT_ASSIGNMENT` and logs `SubmissionEmailLogEventType::LAYOUT_NOTIFY_EDITOR`; for `INDEX_REQUEST` with `NOTIFICATION_TYPE_INDEX_ASSIGNMENT` and `INDEX_NOTIFY_INDEXER`; `LAYOUT_COMPLETE` and `INDEX_COMPLETE` only log (`LAYOUT_NOTIFY_COMPLETE`, `INDEX_NOTIFY_COMPLETE`), the comment above the switch ("remove the INDEX_ and LAYOUT_ tasks if a user has sent the appropriate _COMPLETE email") notwithstanding (A2). Task texts: `PKPNotificationManager::getNotificationMessage()` → `notification.type.layouteditorRequest` "You have been asked to review layouts for "{$title}"." and `notification.type.indexRequest` "You have been asked to create an index for "{$title}"."; their link is the editorial dashboard with `workflowSubmissionId`. The templates are the registry's `registry/taskTemplates.xml` entries with `stageId="WORKFLOW_STAGE_ID_PRODUCTION"`: OJS `DISCUSSION_NOTIFICATION_PRODUCTION` (`mailable.discussionProduction.name` "Discussion (Production)"), `EDITOR_ASSIGN_PRODUCTION` (`mailable.editorAssignedManual.name` "Assign Editor"), `LAYOUT_REQUEST` (`mailable.layoutRequest.name` "Ready for Production"), `LAYOUT_COMPLETE` (`mailable.layoutComplete.name` "Galleys Complete"); OMP the same plus `INDEX_REQUEST` ("Index Requested") and `INDEX_COMPLETE` ("Index Completed", both OMP locale); OPS the first two. The form's role list is the stage's groups without the manager group on OJS and OMP (the Copyediting drive of 2026-09-19 saw the manager group absent on both); on OPS the managers are offered (note t11). After the message, `execute()` recomputes both notice pairs (note d). Live-probed 2026-09-19 (Actors row 10, the assignment side effects, A2; OJS, OMP, OPS): the form's groups and messages of note t11; the assignee's mail "Ready for Production" from the assigning editor, "Dear {name}, A new submission is ready for layout editing: {id} — {title} …", ending "Reply to this comment at #{id} {authors} ( {the submission's workflow address} ) or unsubscribe ( … )" (`emails.po`: `#{$submissionId} {$authorsShort}` linking `{$submissionUrl}`), the same footer on "Index Requested"; the assignee's Tasks panel rows "{editor} started a discussion: Ready for Production: …" (its link landing on that submission's Production entry) and "You have been asked to review layouts for "{title}"."; the layout task still there after "Galleys Complete" (mailed to the editor from the Layout Editor, logged "An email has been sent: Galleys Complete"), after a galley was added and, on the press, after publishing; the panel's "Delete" removing it with no confirmation and leaving the discussion row; a Layout Editor assigned with the message box empty (no template, the editor empty) receiving no mail and no Tasks row.

<a id="fn-k"></a>
**k** — The shortcut: `workflowConfigEditorialOJS.js` and `workflowConfigEditorialOPS.js` push `editor.submission.schedulePublication` ("Schedule For Publication"; OPS "Post the preprint") with `action: 'navigateToMenu'` and `actionArgs` `publication_{latestPublicationId}_titleAbstract`, which `useWorkflowMenu.js::navigateToMenu()` resolves to the "Title & Abstract" entry of the newest version under the "Publication" ("Preprint") group (`useWorkflowNavigationConfigOJS.js` `publication.titleAbstract`). The journal's push has no condition, so the button shows whenever the Production entry's action items render, including while the submission rests in Done (`hasNotSubmissionStartedStage()` is false for `stageId` 6 > 5); the OPS push is guarded by the active stage being Production. The publish controls on the landing page, and their absence for the roles that may not publish, are *Publish, schedule & versions*' Rule 2 and its A2. Sighted 2026-09-18 on OJS and OMP (the incidental): a recommend-only Section Editor's Production entry offering "Upload", "Schedule For Publication" and "Assign". Live-probed 2026-09-19 (Rule 6, Actors row 5, A4; all three apps): pressed by the manager, the assigned Layout Editor, the Designer, the recommend-only Section Editor and the Editor it lands on `workflowMenuKey=publication_{id}_titleAbstract`, headed "Publication: Title & Abstract" on OJS and OMP and "Preprint: Title & Abstract" under the "Preprint" group on OPS; the manager's landing offers "Schedule For Publication" (OJS), "Publish" (OMP) or "Post" (OPS) beside "Change", the assistants' and the recommend-only editor's no publish control, and the Moderator's, deciding or recommend-only, "Change", "Relations" and "Save" with no "Post" and no "Preview"; nothing is logged by the press. Offered on the published submission's entry under "Submission published." on OJS and OMP; on OPS the posted preprint's entry has no button at all and the declined preprint keeps "Post the preprint" beside "Revert Decline" and "Delete", its landing offering "Post" to the manager. Offered, highlighted, on the "Production" entry of a submission still in Copyediting, before its first "Send To Production" and after "Move To Copyediting" alike, above "The Production stage has not yet been initiated." (A4); earlier stages were not read.

<a id="fn-l"></a>
**l** — The author view: `workflowConfigAuthorOJS.js` defines `[WORKFLOW_STAGE_ID_PRODUCTION].getPrimaryItems` as `DiscussionManager` alone, with no `getSecondaryItems` or `getActionItems`; `workflowConfigAuthorOMP.js` redefines it as `WorkflowNotificationDisplay` then `DiscussionManager`; `workflowConfigAuthorOPS.js` defines an empty `WorkflowConfig` (the journal's entry survives the merge but is never reached, because `useWorkflowNavigationConfigOPS.js::getMenuItems()` pushes the "workflow" group for the editorial dashboard only) and a `PublicationConfig.discussions` entry mounting `DiscussionManager` with `submissionStageId: WORKFLOW_STAGE_ID_PRODUCTION`, listed for the author as the last page of the "Preprint" group under `submission.queries.production` "Production Tasks & Discussions" (`getPublicationItemsAuthor()`); `getInitialSelectionItemKey()` lands the author on `publication_{id}_titleAbstract`. The common `getPrimaryItems` stops at `WorkflowSubmissionStatus` while `hasNotSubmissionStartedStage()` holds (the "has not yet been initiated." box, U24's Rule 15a). The author's absence of file controls is note e's. Live-probed 2026-09-19 (Rule 12, Actors row 1; all three apps, from My Submissions): on the journal the entry shows the "Production Tasks & Discussions" panel with "Add" and nothing else (buttons "Tasks", "Close", "Library", "Add"; the stage menu still lists every stage); on the press the "Awaiting approval." box above it; before the submission reaches Production (at Submission and at Copyediting) the "Status" box "The Production stage has not yet been initiated." alone; Translator, Volume editor and Chapter Author refused by the editorial dashboard ("The current role does not have access to this operation.") and opening the same author view from My Submissions. On the preprint server the side menu lists the "Preprint" group alone ("Title & Abstract" first, "Production Tasks & Discussions" last, headed "Preprint: Production Tasks & Discussions" with "Add"); after "Decline Submission" the preprint left "Active submissions" (two others still listed) and opened by its address to the same pages under the bubble "Declined" with "Status: Unposted" and no decline text.

<a id="fn-m"></a>
**m** — OPS's Production entry: note a's OPS `getPrimaryItems` (no `FileManager`), and `WorkflowNotificationDisplay.vue` returning `null` request options on OPS (note d), so the component renders nothing; the preprint's files are the "Galleys" page's (`PublicationConfig.galleys` → `GalleyManager`, *Galleys*). The `_SELECT` namespaces of `useFileManagerConfig.js` (`PRODUCTION_READY_FILES_SELECT`) serve the galley file picker, not this stage. Live-probed 2026-09-19 (Rule 1, Rule 3e, OPS1; OPS): the manager's and the assigned Moderator's entry with one table, "Production Tasks & Discussions", the "Participants" panel and no notice heading; the "Preprint" group's "Galleys" page offering "Add galley".

<a id="fn-n"></a>
**n** — `useFileManagerConfig.js`: `FILE_SEND_TO_EDITOR` is granted to `ROLE_ID_SITE_ADMIN` and `ROLE_ID_MANAGER` on this list and offered per row only when the file's extension is in `PANDOC_IMPORT_EXTENSIONS` (`docx`, `odt`, `rtf`, `tex`, `latex`, `md`, `markdown`); label `grid.action.sendToTextEditor` "Send to Text Editor"; it opens `WorkflowVersionDialogBody` in mode `sendToTextEditor` (dialog title `fileManager.sendFileToTextEditor` "Send File to Text Editor"). Mechanics belong to *Submission files*; the Copyediting drive of 2026-09-19 saw the same entry on that stage's lists for the administrator and the manager only. Live-probed 2026-09-19 (Actors row 4; OJS and OMP): on a Markdown file's row the entry is offered to the Site Administrator, the manager, the Editor and the Production editor and not to the Section Editor, Layout Editor or Designer.

<a id="fn-o"></a>
**o** — `PKPNotificationManager::getNotificationTypeByEditorDecision()` maps the decisions to `NOTIFICATION_TYPE_EDITOR_DECISION_*` rows written by `EditorDecisionNotificationManager::updateNotification()` at `NOTIFICATION_LEVEL_NORMAL` under the title `notification.type.editorDecisionTitle` "Latest editor decision."; the Copyediting drive of 2026-09-18 found no author screen that shows such a row, so the body claims none. Log lines: the decision types' `getLog()` keys quoted in notes g and h, written by `lib/pkp/classes/decision/Repository.php::add()`, plus "An email has been sent: {subject}" when the email is not skipped (the log is *Submission activity log & notes*'). Live-probed 2026-09-19 (the decision side effects; OJS, OMP, OPS): the author's mail "Your submission has been moved to copyediting" from the deciding editor and the log rows "{editor} moved this submission to the copyediting stage." and "An email has been sent: Your submission has been moved to copyediting"; with "Skip this email" the move row under the manager's name and no email row, the author's inbox unchanged; on the preprint server "Your submission has been declined" and "{editor} declined this submission.", "We have reversed the decision to decline your submission" and "{editor} reversed the decision to decline this submission.", each with its "An email has been sent" row unless skipped.

<a id="fn-p"></a>
**p** — Template names on Settings › Workflow › Emails: `mailable.decision.backToCopyediting.notifyAuthor.name` "Submission Moved to Copyediting" (`EDITOR_DECISION_BACK_FROM_PRODUCTION`, subject `emails.editorDecisionBackFromProduction.subject` "Your submission has been moved to copyediting"); on OPS `mailable.decision.initialDecline.notifyAuthor.name` "Submission Declined" (OJS and OMP name the same template "Submission Declined (Pre-Review)") and `mailable.decision.revertInitialDecline.notifyAuthor.name` "Reinstate Submission Declined Without Review". All three mailables carry `fromRoleIds [ROLE_ID_SUB_EDITOR]`, `toRoleIds [ROLE_ID_AUTHOR]`. The task templates are `PKP\editorialTask\Template` rows listed on the Workflow Settings tab "Tasks and Discussions" under "Production Stage" (note j), edited in the window "Edit Task and Discussion Template" (Name, the access boxes, a Discussion body, "Automatically add this task and/or discussion when a submission reaches the stage"), installed by the context factory with "include" off on every context (seed-facts.md). No passthrough key edits a template (scenarios.md). Live-probed 2026-09-19 (Settings bullets 2 and 3; all three apps, as the manager): Settings › Workflow › Emails lists "Submission Moved to Copyediting" on the journal and press (absent on the preprint server) and on the preprint server "Submission Declined" ("This email notifies the author that their preprint has been declined and will not be posted.") and "Reinstate Submission Declined Without Review" ("This email notifies the author that a previous decision to decline their submission without review is being reverted.") with the subjects the body quotes; a subject edited there was what "Notify Authors" prefilled. The "Tasks and Discussions" tab's "Production Stage" rows are the four, six and two templates named, each "Edit Task and Discussion Template" window with the automatic-add box unticked; a "Ready for Production" body edited there prefilled the "Assign" form's message and opened the Layout Editor's mail, subject "Ready for Production", and the discussion "Ready for Production" under "In progress".

<a id="fn-q"></a>
**q** — Pointers and scope prose. The passages carrying this mark name features that describe their own screens and claim no screen of their own; the drives of 2026-09-19 opened the screens they name only on the way to this stage's (the Copyediting entry, "Title & Abstract", the header's Tasks panel, Manage Emails, the Roles screen, My Submissions' "View", the "Declined" view, the "Delete" dialog) and found them as pointed.

<a id="fn-s"></a>
**s** — Seeding for the scenarios: the seeded journal `publicknowledge` and roster accounts (passwords = username doubled), scratch submissions through `POST scenarios/submission` with submitter `author.alex`. A submission at Production: `decisions: ['sendExternalReview', 'accept', 'sendToProduction']` with one `reviewRounds` entry (a completed `reviewer.julia`; on the press add `series: 'monographs'`); on a scratch journal the same decisions with no `reviewRounds` entry, since its reviewers are throwaway. The `sendToProduction` decision computes the journal's notice rows for the editors assigned at that moment (note d), so an assigned editor in `participants` reads "Assign a user to create galleys…" on landing (confirmed 2026-09-19 on the `accept` and the `skipExternalReview` path alike, unlike the Copyediting notice). `editor.diana` is auto-assigned on both apps (sections ART and REV; series `monographs`) and `manager.maya` is the unassigned manager. Seeded submissions carry no files: a production ready file is uploaded through "Upload", and a submission that must arrive with a file gets one copyedited file uploaded on its Copyediting entry through "Copyedited Files" › "Upload/Select Files" › "Upload File" before "Send To Production" is recorded on screen. The notice box is read by its level-3 heading: "Notification" on the journal, "Awaiting approval." or "Catalog Management" on the press. A published submission: `published: true` (an OJS issue from the seed, `{volume: 1, number: 2, year: 2014}`); such an article carries no galley, so its assigned editor reads the galley notice on it (OJS2), on the press the seed writes the "Catalog Management" notice the screen's "Publish" writes, and on the preprint server it is the posted state. The roster holds no recommend-only assignment: the flag is set on screen through the Participants row's "Edit" › "Edit Assignment" before the read; a user seeded in `participants[]` is not offered by that submission's "Assign" form, so a scenario that assigns through the form leaves the user out of `participants[]`. Mail reads are scoped by recipient in Mailpit at `http://127.0.0.1:8025`, so an email scenario runs on a scratch context from `POST scenarios/context` with throwaway `users[]`. Never decide on a shared roster submission. Per scenario: 1 a Production seed with `sectioneditor.omar` in `participants` (`sectioneditor.ravi` on the press, whose series is not the monograph's, so the seed's row is his only assignment), flagged recommend-only on screen, and a second seed `published: true`, read as `editor.diana`, `manager.maya` and the flagged Section Editor; 2 a `['sendExternalReview', 'accept']` seed, `editor.diana` uploading one copyedited file first; 3 a scratch journal with throwaway `roles: ['editor']`, `['layoutEditor']` (two accounts) and `['author']`, the submission seeded with the throwaway author as `submitter` and the throwaway editor in `participants` (nobody is auto-assigned on a scratch journal, and the journal's notice shows only to an assigned editor), both Layout Editors assigned on screen, the no-mail control bounded by the second Layout Editor's email arriving; 4 a scratch journal with `['editor']` and `['author']`, the submission seeded at Copyediting the same way, one copyedited file uploaded and "Send To Production" recorded on screen before the test presses "Move To Copyediting"; 5 a Production seed read as `author.alex`, the control as `editor.diana`; 6 a Production seed whose newest version carries one galley, `galleys: [{label: 'PDF', file: <a fixture under apps/ojs/playwright/fixtures/files/>}]`, a key the scenario API does not offer yet (scenarios.md "Field shapes not built yet"; the harness step builds it before the suite runs), beside a second Production seed with none, both read as `editor.diana`; 7 a Production seed with `series: 'monographs'` and `layouteditor.leo` in `participants`, read as `editor.diana`, `manager.maya`, `layouteditor.leo` and `author.alex`, and a second seed `published: true`; 8 a submitted preprint on the preprint server's `publicknowledge` with `sectioneditor.ana` in `participants` (`role: 'sectionEditor'` seeds a Moderator; there is no `recommendOnly` key), flagged on screen, read as `manager.maya` and `sectioneditor.ana`, and a second seed `published: true`; 9 a scratch preprint server with throwaway `roles: ['manager']`, `['sectionEditor']` and `['author']`, one submitted preprint with the throwaway author as `submitter` and the throwaway Moderator in `participants`, and a second with `decisions: ['decline']` for the "Delete" bullet. The recipe is the tooling's: no screen shows it.

<a id="fn-t1"></a>
**t1** — Live-probed 2026-09-19 (Rules 3a–3c, OJS1; OJS): the assigned Section Editor reads "Notification" / "Assign a user to create galleys using the Assign link in the Participants list." on a submission just sent to production; after "Assign" with "Ready for Production" the box already reads "Awaiting Galleys." on the same page once the "Assign Participant" window closes, and on the next landing; a Layout Editor assigned with the message box empty leaves "Assign a user…" standing, on the same page and relanded; a discussion added from the panel's "Add" (the author as its other participant, no Layout Editor assigned) leaves the old text on the same page and reads "Awaiting Galleys." on the next landing; a galley added on the "Galleys" page ("Add galley" › "Create New Galley" › "Upload a File Ready for Publication") removes the box on the next landing, for the manager too; the galley deleted brings "Awaiting Galleys." back on the next landing. The unassigned manager reads nothing in any state. The press read "Awaiting approval." and the preprint server nothing throughout.

<a id="fn-t2"></a>
**t2** — Live-probed 2026-09-19 (Rule 2; OJS): "Send To Production" recorded on screen on a submission accepted from review and on one accepted with "Accept and Skip Review", and seeded on the same two paths: the assigned Section Editor read "Assign a user to create galleys…" on all four, unlike the Copyediting notice, which the skip path never raises.

<a id="fn-t3"></a>
**t3** — Live-probed 2026-09-19 (Rule 3d; OMP): the states of note f, read as the assigned Series editor, the unassigned Press Manager, the assigned Layout Editor and Indexer and the Author; published on screen through "Schedule For Publication" › "Title & Abstract" › "Publish" (the window titled "Schedule For Publication", "All publication requirements have been met. Are you sure you want to make this catalog entry public? …", button "Publish").

<a id="fn-t4"></a>
**t4** — Live-probed 2026-09-19 (Rule 4; OJS and OMP): the findings of note e; the notice unchanged before and after two uploads and two deletions, on the same page and relanded.

<a id="fn-t5"></a>
**t5** — Live-probed 2026-09-19 (Rule 6, Actors row 5, OPS3; all three apps): the landings, offers and states of note k.

<a id="fn-t6"></a>
**t6** — Live-probed 2026-09-19 (Rules 7–7b, A3; OJS and OMP): the wizard, the closing window, the Copyediting entry, the reduced "Production" entry and the second "Send To Production" of note g, driven as the assigned Section Editor on the skip-review path and on a submission accepted from a review round, and as the manager with "Skip this email".

<a id="fn-t7"></a>
**t7** — Live-probed 2026-09-19 (Rule 9; OPS): the decline of note h; the assigned Moderator's entry offering "Post the preprint" and "Decline Submission" while queued and "Post the preprint" and "Revert Decline" while declined.

<a id="fn-t8"></a>
**t8** — Live-probed 2026-09-19 (Rule 11, Actors row 9; OPS): the offers, the dialog and the aftermath of note i, on two servers.

<a id="fn-t9"></a>
**t9** — Live-probed 2026-09-19 (Actors row 7, A1; OPS, two servers): the recommend-only Moderator of note h opened the preprint to the panels and "Post the preprint" alone, with no error dialog; the draft's expectation of a failing screen did not reproduce.

<a id="fn-t10"></a>
**t10** — Live-probed 2026-09-19 (the assignment side effects, A2; OJS and OMP, scratch journals): the mail, the Tasks rows, the "Galleys Complete" round trip and the empty-message assignment of note j; on the press "Index Requested" mailed the assigned Indexer with the same footer and put "{editor} started a discussion: Index Requested: …" and "You have been asked to create an index for "{title}"." in their Tasks panel, "Index Completed" mailed the editor and cleared nothing, publishing cleared nothing, "Delete" removed it.

<a id="fn-t11"></a>
**t11** — Live-probed 2026-09-19 (Actors row 10; all three apps): the "Assign" form's groups on the journal "Journal editor, Production editor, Section editor, Guest editor, Designer, Indexer, Layout Editor, Proofreader, Author, Translator" (no Journal manager), on the press "Press editor, Production editor, Series editor, Designer, Indexer, Layout Editor, Proofreader, Author, Volume editor, Chapter Author, Translator" (no Press manager), on the preprint server "Preprint Server manager, Moderator, Author"; "Choose a predefined message" opening on a blank first entry, then "Discussion (Production), Assign Editor, Ready for Production, Galleys Complete" on the journal, the same plus "Index Requested, Index Completed" on the press, "Discussion (Production), Assign Editor" on the preprint server.

<a id="fn-t13"></a>
**t13** — Live-probed 2026-09-19 (Rule 12; all three apps): the author views of note l; the preprint server's menu "Preprint › {version}, Title & Abstract, Contributors, Metadata, References, Funding, Galleys, Media, Production Tasks & Discussions", landing on "Title & Abstract".

<a id="fn-t14"></a>
**t14** — Live-probed 2026-09-19 (Rule 8; all three apps): on a published article or monograph the entry reads "Status / Submission published." above the file list and the discussions panel with "Schedule For Publication" as the only button, for the manager, the assigned Section Editor and the Layout Editor; the press shows "Catalog Management" between the status box and the list, the journal "Assign a user to create galleys…" on the seeded galley-less article (OJS2); the workflow lands on "Title & Abstract" when opened without an entry; the posted preprint's entry reads "Submission published." above the discussions and Participants panels with no button.

<a id="fn-t15"></a>
**t15** — Live-probed 2026-09-19 (Rule 1; OJS, OMP, OPS): the panel order, the description line, the right-hand column and the buttons of note a; the unassigned manager's entry the same with no notice; the header's "Preview" for every editorial role and absent in the author view.

<a id="fn-a1"></a>
**f-a1** — Note c: `checkDecisionPermissions()` grants `canMakeDecision` to a recommend-only user only when `getDecisionTypesMadeByRecommendingUsers($stageId)` is non-empty, and both apps' `decision/Repository.php` list a type for `WORKFLOW_STAGE_ID_SUBMISSION` alone; the review stages' `WorkflowRecommendOnlyControls` are the review configs' and absent from `[WORKFLOW_STAGE_ID_PRODUCTION]`; the "Upload", "Schedule For Publication" and "Assign" offers are notes e, k and j. Seen 2026-09-18 on OJS and OMP in passing during the Copyediting claim check (`docs/tracking/incidentals.md`, absorbed here): a Section Editor whose participation was limited to recommendations opened the Production entry to "Upload", "Schedule For Publication" and "Assign" like a deciding editor's, with no decision button. Live-probed 2026-09-19: the same on OJS and OMP beside a deciding editor and alone, the OJS entry also carrying the "Assign a user to create galleys…" notice; on OPS the recommend-only Moderator of note h opened the preprint to the panels and "Post the preprint" alone (the draft's expectation of a failing screen, read in `getAvailableEditorialDecisions()`, did not reproduce and is folded here).

<a id="fn-a2"></a>
**f-a2** — `PKPStageParticipantNotifyForm::execute()` creates `NOTIFICATION_TYPE_LAYOUT_ASSIGNMENT` on `LAYOUT_REQUEST` and `NOTIFICATION_TYPE_INDEX_ASSIGNMENT` on `INDEX_REQUEST`; its `LAYOUT_COMPLETE` and `INDEX_COMPLETE` branches call `logMailable()` and nothing else; a grep for either constant across `lib/pkp`, `ojs` and `omp` finds `Notification.php` (definition), `PKPNotificationManager.php` (message, link) and the notify form (creation) only, so no code path deletes the row. Live-probed 2026-09-19 (note t10): the task survived "Galleys Complete", a galley and publishing on both apps, the index task the same on the press; only the panel's "Delete" removed it.

<a id="fn-a3"></a>
**f-a3** — `lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()` returns the notice pairs for `Decision::ACCEPT` and `Decision::SEND_TO_PRODUCTION` only; `Decision::BACK_FROM_PRODUCTION` falls through to an empty list, so `updateNotifications()` recomputes nothing for the editors when the stage becomes `WORKFLOW_STAGE_ID_EDITING`, and `PKPEditingProductionStatusNotificationManager` is not run until a participant, message, copyedited file or task on that stage triggers it (note d). Live-probed 2026-09-19 (note t6): after "Move To Copyediting" the Copyediting entry showed no "Notification" box to the assigned Section Editor or the manager, on the skip-review path and on a submission that had read "Assign a copyeditor…" before "Send To Production"; the next "Send To Production" recomputed the Production notice and cleared the Copyediting entry as note d says.

<a id="fn-a4"></a>
**f-a4** — Note k: the OJS push of `editor.submission.schedulePublication` carries no condition, and `WorkflowPage`'s action items render whenever the entry is selected, while the common `getPrimaryItems` stops at the status box for a stage the submission has not reached (`hasNotSubmissionStartedStage()`, U24's Rule 15a) and `getSecondaryItems` (the Participants panel) has no such guard. Live-probed 2026-09-19 on OJS and OMP: the "Production" entry of a submission in Copyediting, before its first "Send To Production" and after "Move To Copyediting", read "Status / The Production stage has not yet been initiated." with "Schedule For Publication" highlighted above and the Participants panel beside, and the button landed on "Title & Abstract"; the entry at the Submission and Review stages was not read.

<a id="fn-ojs1"></a>
**f-ojs1** — `PKPEditingProductionStatusNotificationManager::updateNotification()`, the `WORKFLOW_STAGE_ID_PRODUCTION` branch (note d): the "production user assigned" test is `EditorialTask::withAssoc(ASSOC_TYPE_SUBMISSION, $submissionId)->withStageId(WORKFLOW_STAGE_ID_PRODUCTION)->first()`, the code's own comment reading "If a production user is assigned i.e. there is a production discussion"; no stage-assignment or user-group check enters it. The Copyediting stage's branch uses the same proxy and was driven on 2026-09-18 (that spec's A3). Live-probed 2026-09-19 (note t1): the empty-message assignment kept "Assign a user…", the discussion alone read "Awaiting Galleys.".

<a id="fn-ojs2"></a>
**f-ojs2** — Note d: `PKPEditingProductionStatusNotificationManager::updateNotification()` tests the latest publication's representations and the stage's tasks and never the publication's status, and `WorkflowNotificationDisplay.vue` mounts on the Production entry in Done as at Production. Live-probed 2026-09-19 on OJS, two seeded published articles (`published: true` seeds no galley): the assigned Section Editor read "Notification" / "Assign a user to create galleys using the Assign link in the Participants list." between "Submission published." and the file list, and again after "Unpublish" on screen; the unassigned manager read none. Publishing a galley-less article on screen, rather than by seed, was not driven; the observation would be the same read after "Schedule For Publication" › "Publish" on such an article.

<a id="fn-omp1"></a>
**f-omp1** — Note f: the OMP display asks for the approve-submission pair, the journal's for the editing-production pair, and lib/pkp's `PKPApproveSubmissionNotificationManager` writes its rows with no user id. Seen 2026-09-18 on OMP in passing during the Copyediting claim check (`docs/tracking/incidentals.md`, absorbed here): "Awaiting approval." heading every view of the Production entry. Live-probed 2026-09-19 (note t3): every role's view on the unpublished monograph, the author's included; "Catalog Management" after publishing on screen and on a seed-published monograph.

<a id="fn-omp2"></a>
**f-omp2** — Note f: `PKPApproveSubmissionNotificationManager::updateNotification()` is meant to delete `NOTIFICATION_TYPE_VISIT_CATALOG` and recreate `FORMAT_NEEDS_APPROVED_SUBMISSION` when the current publication has no `datePublished`, and `omp/classes/publication/Repository.php` calls it on unpublish. Live-probed 2026-09-19 on OMP, two monographs (one published on screen, one by seed), one run each: after "Unpublish" (`POST …/publications/{id}/unpublish` 200) the assigned Series editor, the unassigned Press Manager and the author read "Catalog Management" / "The monograph has been approved. …" on the entry, five seconds later too, with the header back at "Production" and "Schedule For Publication" and "Move To Copyediting" offered; a second "Publish" left it at "Catalog Management". Why the unpublish path leaves the row was not traced.
Issue report: [pkp-e2e#744](https://github.com/jardakotesovec/pkp-e2e/issues/744) ([docs/issues/U70-A6-unpublished-book-notice-still-approved.md](../issues/U70-A6-unpublished-book-notice-still-approved.md)), shared with [Catalog management A6](U70-catalog-management.md#a6).

<a id="fn-omp3"></a>
**f-omp3** — Note f. OMP `locale/fr_CA/locale.po` (omp checkout
`3b0ecf794`, lib/pkp `3dc90c81a6`) translates the two titles,
`notification.type.approveSubmissionTitle` "En attente d'approbation."
and `notification.type.visitCatalogTitle` "Gestion du catalogue", and
leaves `notification.type.formatNeedsApprovedSubmission` and
`notification.type.visitCatalog` empty (`msgstr ""`). Live-probed
2026-09-30 (U24's French claim check, chunk I30 FRb), two runs, each on
a scratch press, journal and preprint server with English and French
(Canada) as interface languages, every French read paired with the same
read in English. On the press: the manager, the assigned Series editor
and the Author on a monograph at Production never published, the manager
and the Author on two published monographs (one of them sent to
Production and published by the seed); every French read showed the
heading and the code above, every English read Rule 3d's text. The
second monograph unpublished in French (the window "Dépublier /
Êtes-vous certain-e de ne pas vouloir que cela soit publié ? / Dépublier
/ Annuler", confirmed) was back at Production and still read "Gestion du
catalogue" with the code for the manager and the Author, on the same
page and after a reload, and "Catalog Management" in English (OMP2).
Controls: on the journal the assigned Section Editor read "Avis" with
the French galley notice, the unassigned manager and the Author no box
(Rule 3a); on the preprint server no box for anyone (Rule 3e). No
response of 500 or more and no script error. Evidence:
`.reports/U24/ccI30frb/prod-*`, kept script
`shared/playwright/checks/U24/I30/frb.js`.
Issue report: [pkp-e2e#291](https://github.com/jardakotesovec/pkp-e2e/issues/291) ([docs/issues/U69-A15-omp-french-book-page-raw-keys.md](../issues/U69-A15-omp-french-book-page-raw-keys.md)) (its Steps 51 to 58, walked on main and 3.5 from the default dataset), shared with [Monograph landing page A15](U69-monograph-landing-page.md#a15); the report's severity, medium, comes from the editors' names on the book page.

<a id="fn-ops1"></a>
**f-ops1** — Notes a, d and m: `workflowConfigEditorialOPS.js` mounts no `FileManager` at Production and `WorkflowNotificationDisplay.vue` returns `null` options on OPS; `PublicationConfig.galleys` mounts `GalleyManager`. Live-probed 2026-09-19 (notes m, t15): the entry with one table, "Production Tasks & Discussions", "Participants", no notice heading, for the manager and the assigned Moderator; the "Galleys" page under "Preprint" offering "Add galley"; the journal and press entries with "Production Ready Files" beside the discussions as the control.

<a id="fn-ops2"></a>
**f-ops2** — `ops/classes/decision/types/RevertDecline.php` inherits `RevertInitialDecline::getCompletedMessage()`, which reads `editor.submission.decision.revertInitialDecline.completed.description` ("…is now active in the submission stage…", lib/pkp's `editor.po`, no OPS override), and the mailable's name key `mailable.decision.revertInitialDecline.notifyAuthor.name` ("Reinstate Submission Declined Without Review", lib/pkp's `manager.po`, no OPS override; OPS overrides the decline mailable's name to "Submission Declined" and its description, but not this one). Live-probed 2026-09-19 (note t7): the closing text verbatim; Settings › Workflow › Emails listing "Reinstate Submission Declined Without Review" with the description "This email notifies the author that a previous decision to decline their submission without review is being reverted." (one template, "Default") and "Submission Declined" with "This email notifies the author that their preprint has been declined and will not be posted.".
Issue report: [pkp-e2e#916](https://github.com/jardakotesovec/pkp-e2e/issues/916) ([docs/issues/U33-OPS2-preprint-revert-decline-names-submission-stage.md](../issues/U33-OPS2-preprint-revert-decline-names-submission-stage.md)).

<a id="fn-ops3"></a>
**f-ops3** — Note h: the OPS `getActionItems` guards the shortcut with `getActiveStage(submission).id === WORKFLOW_STAGE_ID_PRODUCTION` only, and `Decline` sets `STATUS_DECLINED` without a stage change; the journal's Submission-stage counterpart is *Submission stage*'s A1 (probed 2026-08-02). Live-probed 2026-09-19 (note t5): on a declined preprint the manager's entry offered "Post the preprint" beside "Revert Decline" and "Delete", and pressing it landed on "Preprint: Title & Abstract" with "Status: Unposted", "Change", "Relations", "Preview" and "Post"; nothing posted. The Moderator's landing on the same page, deciding or recommend-only, offered "Change", "Relations" and "Save" with no "Post" and no "Preview" (U49's A2).


## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Production stage (editorial view): notice box, Production Ready Files, discussions | workflow → "Production" menu entry | AFFW-364, 365, 366 |
| Production stage: Participants panel | workflow → "Production" → right column | AFFW-367 |
| "Schedule For Publication" shortcut and "Move To Copyediting" | workflow "Production" → action buttons | AFFW-368, 369 |
| Production stage (editorial view, preprint server): notice slot and discussions | workflow → "Production" | AFFW-370 |
| "Post the preprint", "Decline Submission", "Revert Decline", "Delete" (preprint server) | workflow "Production" → action buttons | AFFW-371, 372, 373, 374 |
| Production stage (author view): discussions (journal); notice and discussions (press) | My Submissions → View → "Production" | AFFW-375 · AFFW-376 |
| "Production Tasks & Discussions" page (preprint server, author view) | My Submissions → View → "Preprint" › last page | AFFW-429 |
| "Change decision" link | registered in the preprint server's workflow page, mounted by no config: dead candidate (`docs/tracking/UNASSIGNED.md`) | AFFW-243 |
| Notice box texts and the assignee's tasks | workflow "Production" notice box; header Tasks panel | NOTIF-045 · NOTIF-044 · NOTIF-033 · NOTIF-034 |
| Legacy production-ready files grid | mounted by no screen; the Vue list above is the live surface (`docs/tracking/UNASSIGNED.md`) | GRID-022 |
| Legacy proof files selection grid | OMP's publication-format window only (*Publication formats & proof terms*); unreachable on a journal or preprint server (`docs/tracking/UNASSIGNED.md`) | GRID-023 |

## Reference — code anchors

- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` · `workflowConfigEditorialOMP.js` (no production-stage override) · `workflowConfigEditorialOPS.js` (production override: no file list; decline, revert, delete) · `utils/deepMerge.js` — panels, notice component and buttons
- `lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/workflowConfigAuthorOJS.js` · `workflowConfigAuthorOMP.js` · `workflowConfigAuthorOPS.js` (`PublicationConfig.discussions`) — the author view
- `lib/ui-library/src/pages/workflow/composables/useWorkflowNavigationConfig/useWorkflowNavigationConfigOJS.js` · `useWorkflowNavigationConfigOPS.js` — the "Production" entry, the "Title & Abstract" target, the author's "Production Tasks & Discussions" page
- `lib/ui-library/src/pages/workflow/components/primary/WorkflowNotificationDisplay.vue` — the notice box · `components/action/WorkflowActionChangeDecision.vue` · `WorkflowPageOPS.vue` (AFFW-243, never mounted)
- `lib/ui-library/src/pages/workflow/composables/useWorkflowActions.js` (`workflowDeleteSubmission`) · `useWorkflowDecisions.js` · `useWorkflowMenu.js` (`navigateToMenu`) · `useWorkflowPermissions.js`
- `lib/ui-library/src/managers/FileManager/useFileManagerConfig.js` (`PRODUCTION_READY_FILES`) · `useFileManagerActions.js` (`fileUpload`, `fileDownloadAll`)
- `lib/ui-library/src/managers/DiscussionManager/useDiscussionManagerHelpers.js` — the "Production Tasks & Discussions" heading
- `lib/ui-library/src/composables/useCurrentUser.js` (`hasCurrentUserAtLeastOneAssignedRoleInStage`, `…InAnyStage`) · `useSubmission.js` (`isDecisionAvailable`, `hasNotSubmissionStartedStage`) · `lib/pkp/classes/submission/maps/Schema.php` (`currentUserAssignedRoles`, `checkDecisionPermissions()`, `availableEditorialDecisions`)
- `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` (OJS, OMP, OPS) · `classes/decision/Repository.php` (OJS, OMP, OPS; `getDecisionTypesMadeByRecommendingUsers()`, A1)
- `lib/pkp/classes/decision/types/BackFromProduction.php` · `InitialDecline.php` · `RevertInitialDecline.php` · `ops/classes/decision/types/Decline.php` · `RevertDecline.php` · `lib/pkp/classes/decision/Repository.php::getSubmissionNotificationTypes()` (A3)
- `lib/pkp/classes/mail/mailables/DecisionBackFromProductionNotifyAuthor.php` · `DecisionInitialDeclineNotifyAuthor.php` · `DecisionRevertInitialDeclineNotifyAuthor.php`
- `lib/pkp/classes/notification/managerDelegate/PKPEditingProductionStatusNotificationManager.php` · `PKPApproveSubmissionNotificationManager.php` · `omp/classes/notification/managerDelegate/ApproveSubmissionNotificationManager.php` · `lib/pkp/classes/notification/PKPNotificationManager.php` · `classes/notification/NotificationManager.php` (OJS, OMP, OPS)
- `lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php` · `form/PKPStageParticipantNotifyForm.php` (`LAYOUT_REQUEST`, `INDEX_REQUEST`, `LAYOUT_COMPLETE`, `INDEX_COMPLETE`, A2) · `registry/taskTemplates.xml` (OJS, OMP, OPS)
- `lib/pkp/controllers/grid/files/productionReady/ProductionReadyFilesGridHandler.php` (GRID-022, unmounted) · `lib/pkp/controllers/grid/files/proof/ManageProofFilesGridHandler.php` · `templates/controllers/grid/files/proof/manageProofFiles.tpl` · `omp/controllers/grid/catalogEntry/PublicationFormatGridHandler.php` (GRID-023) · `controllers/grid/articleGalleys/ArticleGalleyGridHandler.php` (OJS) · `controllers/grid/preprintGalleys/PreprintGalleyGridHandler.php` (OPS) — the galley-side notice recompute
- `lib/pkp/api/v1/_submissions/PKPBackendSubmissionsController.php::delete()` · `lib/pkp/classes/submission/Repository.php::canCurrentUserDelete()` · `lib/pkp/api/v1/submissions/PKPSubmissionController.php::submit()` · `omp/classes/publication/Repository.php` (the press notice's triggers)
- `registry/userGroups.xml` (OJS, OMP, OPS) — stage sets and permission levels · `ops/classes/core/Application.php::getApplicationStages()`
- Locale: `lib/pkp/locale/en/{editor,submission,notification,emails,manager,common}.po`; `ojs/locale/en/locale.po` (`notification.type.assignProductionUser`, `awaitingRepresentations`, `emails.layoutRequest.subject`); `omp/locale/en/locale.po` (the approval and catalog notices, the index templates); `ops/locale/en/locale.po` (`editor.submission.schedulePublication` "Post the preprint", the decline mailable's name)
- App divergence points checked: OMP's editorial config adds no production entry (the journal's roster), its author config adds the notice; OPS's editorial config replaces the primary items and the buttons and inherits the Participants panel; OPS's author config has no stage entry and mounts the discussions under the "Preprint" group; OPS's two decision types subclass lib/pkp's initial-decline pair with the stage changed and inherit their wording (OPS2)
