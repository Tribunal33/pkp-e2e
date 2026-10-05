---
name: stage-participants
status: verified
---

# Stage participants

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every submission has a team: the editors, assistants and authors who work
on it. The **Participants** panel, in the right-hand column of the
workflow screen's stages (Rule 1), is where that team is managed. A
Journal Manager or Editor, or a Section Editor assigned to the
submission, adds a person with **"Assign"**: they choose the person and the role the person holds on this
submission, decide whether an editor may only recommend decisions and
whether the person may change the publication's details, and may send the
person a message that also opens a discussion. The same panel changes those
two limits later ("Edit"), takes a person off the submission ("Remove") and
starts a discussion with one participant ("Notify"). Being listed here is
what lets a Section Editor, a Guest Editor or an assistant open the
submission at all
([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)).
Some participants arrive without anyone pressing "Assign": the author who
submitted, and the editors a section is set up to receive, who are told by
an automatic email that this spec also describes (except on a preprint
server, [OPS3](#ops3)). <sup>a</sup>

This spec covers the panel, its three windows ("Assign Participant", "Edit
Assignment", "Notify"), the "Remove Participant" dialog, the recommend-only
limit and the metadata permission as properties of an assignment, and the
automatic "Editor Assigned (Auto)" email. What the two limits then do is
described where they show: recording a recommendation in *[Editorial decision
recording](U34-editorial-decision-recording.md#recommendation)*, the
deciding editor's view of it in *[Review stage &
rounds](U26-review-stage-and-rounds.md#recommendations)*, the permission to
edit in *[Publication metadata](U40-publication-metadata.md#edit-gate)*.
"Login As" on a participant's row and "Logout as {name}" at the top of the
panel belong to *[Login & sessions](U01-login-and-sessions.md#who-may-impersonate)*. <sup>q</sup>

On a journal or press, the dashboard's "Needs editor" view offers an
"Assign Editor" button that opens the same "Assign Participant" window as
the panel's "Assign"
(*[Submissions dashboard](U23-submissions-dashboard.md#activity)*). <sup>r</sup>

Apart from that button, the panel is the only place these actions live: no
older participants list is shown anywhere. <sup>o</sup>

## Actors & permissions

**Terms used below.** An **assignment** is one person in one role on one
submission; a **participant** is a person with at least one assignment. Each
role has a **stage set**, the stages it works in (Settings › Users & Roles ›
Roles; see [→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)),
and an assignment shows on every stage of its role's set (Rule 2). The
**editor roles** are the roles an assignment can make a deciding or
recommending editor: Editor and Production editor (both manager-level),
Section Editor and Guest Editor; on a preprint server, Preprint Server
Manager and Moderator. The **manager-level roles** are Journal Manager,
Editor and Production editor. "Deciding editor" and "recommending editor"
are the [glossary's](GLOSSARY.md#roles-and-access). A Site Administrator
below is one who holds a journal role. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the Participants panel** (Rule 1) | • Journal Manager; Editor; a Production editor who is not assigned to the submission: on every stage of every submission<br>• A Production editor assigned to the submission: on Copyediting and Production only; Submission and Review (on a press also Internal Review) show "You don't currently have access to that stage of the workflow." instead ⚠ [A8](#a8)<br>• Section Editor; Guest Editor; assistant roles: on the stages they may open of a submission they are assigned to ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access))<br>• Author: never; the author's view of the workflow has no Participants panel<br>• Reviewer; Reader: never; they do not reach the workflow screen <sup>a</sup> <sup>b</sup> |
| **"Assign"** (Rules 3–6) | • Journal Manager; Editor; Site Administrator; a Production editor who is not assigned to the submission: on every stage<br>• An assigned Section Editor, Guest Editor or Production editor (a Moderator on a preprint server): on the stages they are assigned to, a recommending editor included<br>• Assistant roles: never; for them the panel offers "Notify" and nothing else <sup>b</sup> |
| **"Edit"** (row menu; Rule 8) | • Journal Manager; Editor; Site Administrator; a Production editor, assigned or not: on every row<br>• An assigned Section Editor or Guest Editor: on the rows of other people, never on their own and never on a row whose role is manager-level (Journal editor, Production editor; Preprint Server manager on a preprint server). A recommending one is not offered it on a Section Editor's or Guest Editor's row either. Their "OK" saves nothing ⚠ [A1](#a1) <sup>b</sup> <sup>td3</sup> |
| **"Remove"** (row menu; Rule 10) | • Everyone offered "Assign", on every row: their own, the Author's and the manager-level rows included, which "Edit" does not offer them ⚠ [A2](#a2) <sup>b</sup> <sup>td10</sup> |
| **"Notify"** (row menu; Rule 11) | • Everyone who sees the panel, the assistant roles included: on every row, their own included <sup>b</sup> |
| **Set the recommend-only limit** ("Assignment privileges" box; Rules 4, 8) | • Whoever assigns or edits, on an assignment in an editor role. "Edit Assignment" never shows the box to a Section Editor or Guest Editor on their own row, nor to anyone who is a recommending editor on this stage <sup>e</sup> <sup>h</sup> |
| **Grant or withdraw the metadata permission** ("Permissions" box; Rules 4, 8) | • Whoever assigns or edits, on an assignment in any role but a manager-level one (a manager-level assignment always holds the permission); "Edit Assignment" never shows it to a Section Editor or Guest Editor on their own row <sup>e</sup> <sup>h</sup> |
| **"Login As"** (row menu) and **"Logout as {name}"** (top of the panel) | • Owned by *[Login & sessions](U01-login-and-sessions.md#who-may-impersonate)* |
| **Receive "Editor Assigned (Auto)"** (Rule 12) | • Each editor assigned automatically when a submission arrives, in an editor role that works on the Submission stage, once per person; not a person assigned through "Assign"<br>• On a preprint server: nobody [OPS3](#ops3) <sup>l</sup> <sup>td12</sup> |

## Fields & validation

**The "Assign Participant" window** (Rule 3). Everything above the two boxes
sits under the heading "Locate a User". A note "Required fields are marked
with an asterisk: *" closes the form, though no field carries an asterisk.
<sup>d</sup> <sup>e</sup> <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The role list (an unlabelled drop-down, first under "Locate a User") | yes, preselected | The roles offered on this stage, by permission level (the table below). The first listed is preselected: always a role of the highest level offered, and on a stage whose highest level holds two roles either of them. Choosing another role hides both boxes (Rule 4c) [A9](#a9); the list of people follows the new role only after "Search" (Rule 3) <sup>d</sup> |
| "Search User By Name" | no | Narrows the list of people on "Search" <sup>d</sup> |
| "Search" | — | Reloads the list of people for the chosen role and name <sup>d</sup> |
| The list of people: a choice button, "Name", "Assignments", "Affiliation", "Reviewing interests" | one person | Everyone holding the chosen role in the journal, minus those already assigned in that role (Rule 3). "Assignments" counts the journal's active submissions the person is assigned to or has a review request on that they have not declined; published submissions are not counted. Twenty rows show, with "20 of {total} items" and a "Load more" link under the list; "Load more" shows the rest, and scrolling loads nothing. "OK" with nobody chosen assigns nobody ⚠ [A4](#a4) <sup>d</sup> |
| "Assignment privileges": "This participant is only allowed to recommend an editorial decision and will require an authorised editor to record editorial decisions." | no | Shown once a person is chosen, for an editor role only; ticked at the start when the role itself is set to recommend only (Rule 4) <sup>e</sup> |
| "Permissions": "Allow this person to make changes to the publication, such as the title, abstract, metadata and other publication details. You may wish to revoke this privilege if the submission has received a final check and is ready for publication." | no | Shown once a person is chosen, for every role but the manager-level ones; ticked at the start when the role's "Permit submission metadata edit." is on (Rule 4) <sup>e</sup> |
| "Choose a predefined message to use, or fill out the form below." | no | Opens on a blank entry, followed by the stage's predefined messages (Rule 5a). Choosing one replaces the text of "Message" with the message's text; choosing the blank entry again leaves the text as it is <sup>f</sup> |
| "Message" | no | Rich text. Sent only together with a predefined message (Rule 5b) [A3](#a3). The letters ("Assign Editor", "Request Copyedit", "Ready for Production", "Galleys Complete", "Index Requested", "Index Completed") show the recipient's name as a tag reading "NAME" ("EDITOR" in "Galleys Complete" and "Index Completed"); the email and the discussion carry the recipient's name there <sup>f</sup> |
| "Cancel", "OK" | — | Rule 6 <sup>d</sup> |

**Roles offered by "Assign"**, install defaults: every role whose stage set
includes the stage, no reviewer role ever (Rule 3). The list gives them by
permission level, as the panel orders its rows (Rule 1). Roles of one
level come in no fixed order among themselves, and may show in another
order the next time the window opens. Below, a semicolon separates two
levels and a comma two roles of one level. <sup>d</sup>

| Stage | Journal | Press | Preprint server |
|-------|---------|-------|-----------------|
| Submission | Journal editor; Section editor, Guest editor; Funding coordinator; Author, Translator | Press editor; Series editor; Funding coordinator; Author, Volume editor, Translator | — <sup>d</sup> |
| Internal Review | — | as Submission | — <sup>d</sup> |
| Review (External Review) | as Submission | as Submission | — <sup>d</sup> |
| Copyediting | Journal editor, Production editor; Section editor, Guest editor; Copyeditor, Marketing and sales coordinator; Author, Translator | Press editor, Production editor; Series editor; Copyeditor, Marketing and sales coordinator; Author, Volume editor, Chapter Author, Translator | — <sup>d</sup> |
| Production | Journal editor, Production editor; Section editor, Guest editor; Designer, Indexer, Layout Editor, Proofreader; Author, Translator | Press editor, Production editor; Series editor; Designer, Indexer, Layout Editor, Proofreader; Author, Volume editor, Chapter Author, Translator | Preprint Server manager; Moderator; Author [OPS1](#ops1) <sup>d</sup> |

**The "Edit Assignment" window** (Rule 8). <sup>h</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Participant" | shown, fixed | "{name} ({role})", the person's name in bold; neither can be changed <sup>h</sup> |
| "Assignment privileges" | no | The recommend-only box of the "Assign" window, ticked as the assignment stands; shown per Rule 8 <sup>h</sup> |
| "Permissions" | no | The metadata box of the "Assign" window, ticked as the assignment stands; shown per Rule 8 <sup>h</sup> |
| "No changes can be made to this participant" | — | Shown under "Participant" in place of both boxes when neither is shown (Rule 8c); "Cancel" and "OK" stay <sup>h</sup> |
| "Cancel", "OK" | — | Rule 8 <sup>h</sup> |

**The "Notify" window** (Rule 11). <sup>j</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Start Discussion" | — | A heading over the sentence "Begin a discussion between yourself and {name}." <sup>j</sup> |
| "Choose a predefined message to use, or fill out the form below." | no | As on the "Assign" window (Rule 5), the blank entry chosen again included [A3](#a3); "Notify" from there: Rule 11b <sup>j</sup> |
| "Message" | yes | Rich text. "Notify" with it empty keeps the window open, and a warning at the top right of the page reads "Please ensure that you have filled out the message field and included someone other than yourself in the discussion."; no discussion is added <sup>td11</sup> |
| "Notify" | — | The window's only button; there is no "Cancel" <sup>j</sup> |

## Rules & state

<a id="panel"></a>
1. **The panel.** In the editorial view every stage entry shows a box
   headed "Participants" in its right-hand column, a stage the submission
   has not reached included
   ([→ the status box](U24-workflow-screen-and-stage-access.md#status-box)).
   The one exception is a press's Internal Review before that stage starts
   {OMP}: its entry shows only "The Internal Review stage has not yet been
   initiated." and no Participants panel. "Assign" sits at the right of
   the heading for the roles Actors names.
   Below, one row per assignment whose role's stage set includes this stage
   (Rule 2); reviewers are never listed here. A row shows a round badge with
   the person's initials, their full name, under it the role's name as the
   Roles screen spells it ("Section editor", "Journal editor", "Author"),
   and, for a recommend-only assignment, a third line "Only allowed to
   recommend an editorial decision". At the row's right a "More Actions"
   button ("…") opens the row's menu: "Edit", "Notify", "Login As" and
   "Remove", in that order, each only for the roles Actors names. Rows are
   ordered by permission level (manager-level roles first, then Section and
   Guest Editors, then the assistant roles, then Author and the other
   author-level roles) and, within a level, grouped by role. A person
   assigned in two roles has two rows. <sup>a</sup>
<a id="assignment"></a>
2. **One assignment, every stage of its role.** An assignment belongs to
   the submission, not to the stage whose "Assign" made it. It is listed on
   every stage in its role's stage set: a Section Editor assigned from the
   Submission stage is listed on Submission, Review, Copyediting and
   Production, and a Copyeditor assigned from Copyediting is listed on
   Copyediting alone. "Edit" and "Remove" act on the assignment on every
   stage at once. A person holds at most one assignment per role on a
   submission: once assigned in a role they leave that role's list of
   people in "Assign"; assigned again in another role, they get a second
   row. <sup>c</sup>
<a id="assign-window"></a>
3. **The "Assign Participant" window.** "Assign" opens a side panel titled
   "Assign Participant" (Fields). Its role list offers the roles whose
   stage set includes this stage, never a reviewer role, by permission
   level and in no fixed order within a level (the table in Fields).
   The Journal Manager and Press Manager roles have no stage set and so
   are never offered; a preprint server's manager role works on
   Production and is offered there [OPS1](#ops1). The list of people shows
   everyone who holds the chosen role in the journal, the role started and
   not ended, except those already assigned to this submission in that
   role (Rule 2). It opens on the first listed role's people. After choosing
   another role, the list, and the person chosen in it, stay the previous
   role's until "Search" is pressed; "OK" then assigns nobody (Rule 6b).
   <sup>d</sup>
<a id="boxes"></a>
4. **The two boxes on "Assign".** Both are hidden until a person is chosen
   in the list. Then: <sup>e</sup>
   - 4a. "Assignment privileges" (the recommend-only limit) appears when
     the chosen role is an editor role. It starts ticked when the role
     itself is set to recommend only on the Roles screen (Settings); at
     install no role is. <sup>e</sup>
   - 4b. "Permissions" (the metadata permission) appears for every role
     but a manager-level one, and starts ticked when the role's "Permit
     submission metadata edit." is on (Settings): at install on for
     Section Editor (and Moderator), off for Guest Editor and the
     assistant roles, and off for Author on a journal or press but on for
     Author on a preprint server. An assignment in a manager-level role
     always carries the permission. <sup>e</sup>
   - 4c. Choosing another role hides both boxes again and unticks
     "Assignment privileges". "Permissions" keeps any tick it had: the
     next person chosen shows it ticked, whatever the new role's "Permit
     submission metadata edit." says, and "OK" saves it that way
     ⚠ [A9](#a9).
     <sup>e</sup>
<a id="predefined-messages"></a>
5. **The message.** The message is optional on "Assign". <sup>f</sup>
   - 5a. The list "Choose a predefined message…" opens on a blank entry,
     followed by the stage's discussion templates from Settings › Workflow
     › "Tasks and Discussions" (the install's set is the table below; a
     template saved there with "Enter task information" is a task and is
     not offered). Choosing one replaces the text of "Message" with the
     template's text (Fields); the "Discussion (…)" templates' text is
     "Please enter your message.". A template added in Settings is listed
     but cannot be used ⚠ [A10](#a10). <sup>f</sup>
   - 5b. On "OK" a message goes out only when a predefined message is
     chosen and "Message" is not empty; what it sends is in Side effects.
     A message typed while the list stays on its blank entry is not sent:
     "OK" leaves the window open as filled, with no reason given, yet the
     person is assigned. The row appears once the page is opened again,
     and the Activity Log gets no line for it ⚠ [A3](#a3). <sup>g</sup>
     <sup>td4</sup>
   - 5c. On a press's Internal Review the list has nothing but the blank
     entry, so no message can be sent from that stage ⚠ [OMP1](#omp1).
     <sup>[f-omp1](#fn-omp1)</sup>
   - 5d. On a preprint server choosing "Assign Editor" leaves "Message" as
     it was ⚠ [OPS2](#ops2). <sup>[f-ops2](#fn-ops2)</sup>

   | Stage | Journal | Press | Preprint server |
   |-------|---------|-------|-----------------|
   | Submission | "Discussion (Submission)", "Assign Editor" | the same | — <sup>f</sup> |
   | Internal Review | — | none | — <sup>f</sup> |
   | Review (External Review) | "Discussion (Review)", "Assign Editor" | the same | — <sup>f</sup> |
   | Copyediting | "Discussion (Copyediting)", "Request Copyedit" | the same | — <sup>f</sup> |
   | Production | "Discussion (Production)", "Assign Editor", "Ready for Production", "Galleys Complete" | the same, then "Index Requested", "Index Completed" | "Discussion (Production)", "Assign Editor" <sup>f</sup> |
6. **"OK" and "Cancel" on "Assign".** <sup>d</sup>
   - 6a. With a person chosen, "OK" saves the assignment with the boxes as
     ticked, closes the window and refreshes the panel, which lists the new
     row (Rule 2); a notice at the top right of the page reads "User added
     as a stage participant.". <sup>k</sup> <sup>td1</sup>
   - 6b. With nobody chosen, or with a person chosen under the previous
     role (Rule 3), "OK" shows the form again on the first role and its
     people, assigns nobody and gives no reason [A4](#a4). <sup>td5</sup>
   - 6c. "Cancel" closes the window with nobody assigned and never asks.
     The window's close control ("<") always asks first, even when nothing
     was changed, in a box reading "The data on this form has changed. Do
     you wish to continue without saving?": "OK" closes the window,
     "Cancel" keeps it as it was. Leaving the page while the window is open
     (another address, a reload) raises the browser's leave-page box, also
     when nothing was changed. Nothing is saved either way. <sup>d</sup>
     <sup>td2</sup>
<a id="anonymous-reviewer"></a>
7. **Choosing someone who reviews anonymously** {OJS OMP}. A person with
   a review request on this submission appears in the list only through
   another role they hold, since no reviewer role is offered (Rule 3).
   While the submission sits in a review stage, choosing such a person
   whose request is not declined and whose review type is "Anonymous
   Reviewer/Anonymous Author" or "Anonymous Reviewer/Disclosed Author"
   shows nothing, and "OK" assigns them ⚠ [A11](#a11). <sup>n</sup>
<a id="edit-window"></a>
8. **"Edit Assignment".** The row menu's "Edit" opens a side panel titled
   "Edit Assignment" showing the participant and the role (Fields), no
   message, and the boxes, ticked as the assignment stands: <sup>h</sup>
   - 8a. "Assignment privileges" when the row's role is an editor role,
     unless the row is the editing Section Editor's or Guest Editor's own,
     or the person editing is a recommending editor on this stage;
     <sup>h</sup>
   - 8b. "Permissions" when the row's role is not manager-level, unless the
     row is the editing Section Editor's or Guest Editor's own; <sup>h</sup>
   - 8c. neither box: the sentence "No changes can be made to this
     participant" in their place, under "Participant". With "Edit" offered
     as Actors says, this is left for a person who is themselves a
     recommending editor on the stage opening a manager-level row, their
     own included. "OK" there still closes the window with "The stage
     assignment has been changed." ⚠ [A12](#a12). <sup>h</sup>
   - 8d. "OK" saves the boxes, closes the window and refreshes the panel,
     where the row gains or loses "Only allowed to recommend an editorial
     decision"; a notice at the top right of the page reads "The stage
     assignment has been changed.". <sup>k</sup> <sup>td1</sup>
   - 8e. A Section Editor's or Guest Editor's "OK" saves nothing: the
     window shows its form again with the boxes as they were before
     [A1](#a1). <sup>td3</sup>
   - 8f. "Cancel" closes the window and saves nothing, without asking,
     whatever was changed. After a change, the window's close control
     asks "The data on this form has changed. Do you wish to continue
     without saving?": "Cancel" keeps the window open, "OK" closes it, and
     nothing is saved either way. <sup>d</sup> <sup>h</sup>
<a id="recommend-only"></a>
9. **What the two limits do.** The recommend-only limit makes the
   participant a recommending editor on every stage their role covers: on
   a review stage they record a recommendation instead of a decision, and
   only while a deciding editor is also assigned
   ([→ recording a recommendation](U34-editorial-decision-recording.md#recommendation),
   [→ the deciding editor's view](U26-review-stage-and-rounds.md#recommendations));
   what it leaves on the other stages is each stage's own rule. It limits
   whoever holds it, an Editor's assignment included. <sup>p</sup>
   <sup>td9</sup> The metadata permission is one of the ways past the
   publication pages' edit gate
   ([→ the edit gate](U40-publication-metadata.md#edit-gate)). <sup>e</sup>
<a id="remove"></a>
10. **"Remove".** The row menu's "Remove" (in red) opens a dialog titled
    "Remove Participant" reading "You are about to remove this participant
    from all stages." with "OK" (in red) and "Cancel". "Cancel" changes
    nothing. "OK" deletes the assignment on every stage (Rule 2) and
    refreshes the panel; the person's other assignments stay. The person
    is also taken off every discussion of this submission, unless they hold
    the Journal Manager role or another manager-level role in the journal.
    A Section Editor may remove their own row. When no other assignment
    lets them in, an "Error" window reading "The current role does not
    have access to this operation." follows at once, and again whenever
    they open the submission
    ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)).
    <sup>i</sup> <sup>td10</sup>
<a id="notify"></a>
11. **"Notify".** The row menu's "Notify" opens a side panel titled
    "Notify" (Fields) addressed to that row's person. <sup>j</sup>
    - 11a. "Notify" with a predefined message chosen and "Message" filled
      sends the message as Side effects describe and closes the window,
      and a notice at the top right of the page reads "Notification sent
      to users.". <sup>j</sup> On a preprint server every "Notify" shows
      that notice instead in a box headed "Notification" at the top of the
      Production entry, above "Production Tasks & Discussions", and nothing
      at the top right ⚠ [OPS4](#ops4). <sup>[f-ops4](#fn-ops4)</sup>
    - 11b. With the list never touched, "Notify" leaves the window open
      as filled; nothing is sent and nothing on screen says why
      [A3](#a3). With the list set back to its blank entry after a
      predefined message, "Notify" was never pressed ⚠ [A17](#a17).
      <sup>g</sup> <sup>td4</sup>
    - 11c. While the list "Choose a predefined message…" has not been
      touched, the window's close control ("<") closes the window at
      once, a typed message included. Once a predefined message has been
      chosen, even if typed over or set back to the blank entry, the close
      control asks first, as on "Edit Assignment" (Rule 8f): "Cancel" keeps
      the window as filled, "OK" closes it. Nothing is sent either way.
      <sup>j</sup>
    - 11d. After a predefined message has been chosen, Escape asks
      first as the close control does; its "OK" closes the "Notify"
      window and leaves the workflow open. Reloading the page with a predefined message chosen
      raises the browser's leave-page box; after the reload no discussion
      is added and no email goes out. <sup>j</sup>
<a id="auto-email"></a>
12. **The automatic assignment email.** When a submission arrives, the
    editors on it are emailed: those already assigned, an editor submitting
    in that role included (Rule 12c), and those its section (or category)
    assigns automatically (*[Submission wizard](U21-submission-wizard.md)*).
    That assignment happens only on the install's first journal
    ([→ the wizard's finding](U21-submission-wizard.md#a8)); elsewhere
    only those already assigned are. <sup>l</sup> <sup>td12</sup>
    - 12a. Every editor then assigned to the submission in an editor role
      that works on the Submission stage gets one email, once per person
      even when they hold two such roles. A Production editor or a Funding
      coordinator on the submission gets none. A preprint server sends
      this email to nobody ⚠ [OPS3](#ops3). <sup>l</sup> <sup>td12</sup>
    - 12b. The email, "You have been assigned as an editor on a submission
      to {journal name}", comes from the journal's contact. It carries a
      link to the submission, its title, authors and abstract, and asks
      the editor to send it for review or decline it ⚠ [OJS1](#ojs1).
      <sup>l</sup> <sup>td12</sup>
    - 12c. A user with an editorial role who submits in that role ("Submit
      As" › "Journal editor" on the wizard's start page) gets this email
      about their own submission. <sup>td12</sup>
    - 12d. A person who opted out of it on their Notifications tab
      (Settings) gets none. <sup>l</sup> <sup>td12</sup>
    - 12e. An automatic assignment carries its role's recommend-only
      setting and metadata default (Rule 4) ⚠ [A13](#a13). <sup>l</sup>

## Side effects

- **On "Assign" ("OK").** The Activity Log gains "{name} ({username}) was
  assigned to this submission as a {role}.", its "User" column showing
  the assigned person, not the one who assigned ⚠ [A14](#a14). For an
  assignment in an editor role, the task "A new article has been
  submitted to which an editor needs to be assigned." leaves the Tasks
  panel of every Journal Manager and every Editor in the journal
  (*[Notifications center](U05-notifications-center-and-email-preferences.md)*,
  Rule 6's roster), and on a journal or press the submission leaves the
  dashboard's "Needs editor" view {OJS OMP}
  (*[Submissions dashboard](U23-submissions-dashboard.md#activity)*).
  No email goes out unless a message does (next bullet). <sup>k</sup>
- **On a message sent from "Assign" or "Notify".** Rule 5 says when one is
  sent. <sup>g</sup>
  - The person receives an email from the signed-in sender, its subject the
    predefined message's name ("Assign Editor", "Discussion (Review)"), its
    body the "Message" text, with the discussion footer and unsubscribe
    link *[Notifications center](U05-notifications-center-and-email-preferences.md)*
    describes. The Submission stage's "Assign Editor" email ends with two
    footers ⚠ [A15](#a15).
  - The email and the Tasks row below follow the "Enable these types of
    notifications." box on the "Discussion added." row of the person's
    Notifications tab: with it unticked neither comes, though the
    discussion still opens and the sender still sees "Notification sent
    to users.". The row's "Do not send me an email for these types of
    notifications." box is ignored: the email still arrives ⚠ [A16](#a16).
    <sup>td7</sup>
  - A discussion titled with the predefined message's name opens on the
    stage's discussions panel with the person and the sender as its
    participants and the message as its first entry; the panel lists it as
    created by the person it was sent to ⚠ [A5](#a5).
  - The person's Tasks panel gains "{sender} started a discussion: {name}:
    {message}".
  - "Request Copyedit", "Ready for Production" and "Index Requested" also
    give the person a task of their own
    (*[Copyediting stage](U32-copyediting-stage.md)*,
    *[Production stage](U33-production-stage.md)*); "Assign Editor" gives
    none, on any stage ⚠ [A6](#a6), and neither does "Galleys Complete".
    <sup>td6</sup>
  - On Copyediting and Production the message's discussion moves the
    stage's notice box on, from telling the editor to assign someone to
    awaiting their work
    ([→ Copyediting notices](U32-copyediting-stage.md#notices),
    [→ Production notices](U33-production-stage.md#notices)). An
    assignment without a message leaves the notice telling the editor to
    assign someone, a finding those stages record
    ([Copyediting's](U32-copyediting-stage.md#a3),
    [Production's](U33-production-stage.md#ojs1)).
  - The Activity Log gains "Notification sent to users." under the
    sender's name and, when the email went out, "An email has been sent:
    {subject}" with a "View Email" link. An unsent message (Rule 5b) logs
    nothing, not even the assignment.
    <sup>td7</sup>
- **On "Edit" ("OK").** No email. The Activity Log gains the same
  "{name} ({username}) was assigned to this submission as a {role}." line
  as a new assignment ⚠ [A7](#a7), its "User" column showing the edited
  person [A14](#a14). <sup>k</sup> <sup>td8</sup>
- **On "Remove" ("OK").** No email and no notice. The Activity Log gains
  "{name} ({username}) was removed from this submission as a {role}.",
  its "User" column showing the removed person [A14](#a14). The person
  leaves the submission's discussions (Rule 10). On Copyediting and
  Production the notice box stays as it was while the request discussion
  to the removed person remains ("Awaiting Copyedits.", "Awaiting
  Galleys."). On a journal or press, removing the last editor of a
  submission on the Submission stage puts it back in the dashboard's
  "Needs editor" view with its "Assign Editor" button {OJS OMP}
  (*[Submissions dashboard](U23-submissions-dashboard.md#activity)*).
  <sup>i</sup>
- **On an automatic assignment.** The email of Rule 12, once per editor
  (never on a preprint server, [OPS3](#ops3)), each logged in the Activity
  Log as "An email has been sent: You have been assigned as an editor on a
  submission to {journal name}". <sup>l</sup> <sup>td12</sup>

## Settings that modify behavior

- **A role's "Stage Assignment" boxes** (Settings › Users & Roles › Roles,
  the role's "Edit"; *Roles configuration*). Install defaults: the Roles
  table of Fields follows from them; the Journal Manager and Press Manager
  roles have none, the Preprint Server manager has Production. Each ticked
  stage lists the role's assignments there (Rule 2) and offers the role in
  that stage's "Assign" (Rule 3); unticking a stage takes both away there.
  <sup>d</sup> <sup>m</sup>
- **A role's "This role is only allowed to recommend a review decision and
  will require an authorised editor to record a final decision."** (the
  same form, under "Role Options"; on every role's form, but it can be
  ticked only on an editor role's; the manager role has no form). Off for
  every role at install. On: the "Assign" window's "Assignment privileges"
  box starts ticked for that role (Rule 4a), and an automatic assignment in
  that role is expected to be recommend-only (Rule 12e) [A13](#a13).
  Assignments made before are left as they are. <sup>m</sup>
- **A role's "Permit submission metadata edit."** (the same form). At
  install: on for Editor, Production editor and Section Editor (Moderator),
  off for Guest Editor and the assistant roles, off for Author on a journal
  or press and on for Author on a preprint server; always on for the
  manager-level roles. The "Permissions" box starts from it (Rule 4b), and
  changing it rewrites the permission of every existing assignment in that
  role, on every submission of the journal. <sup>m</sup>
- **The task and discussion templates** (Settings › Workflow › "Tasks and
  Discussions"; *Tasks & discussions*). A discussion template's stage puts
  it in that stage's predefined messages (Rule 5a; the install's set is
  the table there); a template saved with "Enter task information" is a
  task and is never offered. A template's "Limit access to specific roles"
  offers only the roles that work on that stage. A template limited to
  some roles is listed only for people who hold one of them, except that
  everyone with a manager-level role (Journal Manager, Editor, Production
  editor; on a preprint server the Preprint Server manager) sees every
  template. A template added here cannot be sent, whoever it is sent to
  [A10](#a10). <sup>f</sup> <sup>g</sup>
- **The email "Editor Assigned (Auto)"** ("Moderator Assigned (Auto)" on a
  preprint server; Settings › Workflow › Emails, *Emails management*): the
  subject and body of Rule 12's email. A preprint server lists it and lets
  it be edited but never sends it [OPS3](#ops3). <sup>l</sup> <sup>td12</sup>
- **The editors a section or category receives automatically** (the
  "Editorial Assignments" boxes of a section's or category's form,
  *Submission wizard*'s rule): who is assigned on submission. Those in an
  editor role that works on the Submission stage get Rule 12's email. The
  list also offers Funding coordinators, who are assigned but not emailed.
  <sup>l</sup> <sup>td12</sup>
- **"Do not send me an email…" on the person's Notifications tab**
  (*[Notifications center](U05-notifications-center-and-email-preferences.md)*),
  on the row "A new article, "Title," has been submitted." under
  "Submission Events"; on a press the row reads "A new monograph, "Title,"
  has been submitted.", on a preprint server "A new preprint , "Title", has
  been submitted." (the stray space is
  [that tab's finding](U05-notifications-center-and-email-preferences.md#ops2)).
  Unticked at install; ticked, Rule 12's email is not sent to that person.
  <sup>l</sup> <sup>td12</sup>

## Cross-feature interactions

- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)*:
  what an assignment lets a person open, the author's view without this
  panel, and the Participants column on a stage not yet reached. This spec
  owns only who is assigned.
- *[Submissions dashboard](U23-submissions-dashboard.md#activity)*: the
  "Assign Editor" button that opens this spec's "Assign Participant"
  window, and the "Needs editor" view an editor assignment ends {OJS OMP}.
- *[Submission wizard](U21-submission-wizard.md)*: the automatic assignment
  on submission (and its failure off the install's first journal); this
  spec owns the email it sends.
- *[Editorial decision recording](U34-editorial-decision-recording.md#recommendation)*
  and *[Review stage & rounds](U26-review-stage-and-rounds.md#recommendations)*:
  what a recommending editor does and what the deciding editor sees; this
  spec owns the limit's box. *[Submission stage](U25-submission-stage.md#a2)*,
  *[Copyediting stage](U32-copyediting-stage.md)* and
  *[Production stage](U33-production-stage.md)* say what a recommending
  editor is offered on those stages.
- *[Copyediting stage](U32-copyediting-stage.md)* and
  *[Production stage](U33-production-stage.md)*: the notice boxes that tell
  an assigned editor to use "Assign" (Copyediting on a journal and a press;
  Production on a journal only), and the tasks "Request Copyedit", "Ready
  for Production" and "Index Requested" raise.
- *[Publication metadata](U40-publication-metadata.md#edit-gate)*: what the
  metadata permission allows.
- *[Login & sessions](U01-login-and-sessions.md#who-may-impersonate)*:
  "Login As" and "Logout as {name}" on this panel.
- *[Notifications center](U05-notifications-center-and-email-preferences.md)*:
  the "Discussion added." and "needs an editor" rows, the discussion
  email's footer, and the opt-out box of Rule 12.
- [Tasks & discussions](U37-tasks-and-discussions.md): the discussions a
  message opens and the template screen that supplies the predefined messages.
- [Roles configuration](U54-roles-configuration.md): the stage sets and the
  two role options of Settings.
- [Submission activity log & notes](U38-submission-activity-log-and-notes.md):
  the screen the log lines land on.

## Canonical scenarios

Scenario 3 runs on the seeded journal with ready accounts and a scratch
submission; every other scenario runs on a scratch journal with throwaway
accounts, since each reads a mailbox, needs a role the ready accounts lack
or changes a role's options. The accounts, their passwords, the mail
catcher and the tooling recipe are in the footnote. <sup>s</sup>

1. **Assign a Section Editor with "Assign Editor"** {OJS OMP}

   Given: Editor, on a scratch journal, on the Submission stage of a
   submission with no editor assigned, the journal holding two Section
   Editors and a Journal Manager.

   - **The "Assign Participant" window**: on the "Participants" panel,
     which lists the Author's row, press "Assign": a side panel titled
     "Assign Participant" opens; under "Locate a User" the role list offers
     "Journal editor" first, then "Section editor" and "Guest editor" in
     either order, then "Funding coordinator", then "Author" and
     "Translator" in either order, with "Journal editor" preselected and no
     "Journal manager" and no reviewer role (on a press: "Press editor",
     then "Series editor", then "Funding coordinator", then "Author",
     "Volume editor" and "Translator" in any order); neither "Assignment
     privileges" nor "Permissions" shows (Rules 3, 4; Fields).
   - **Another role and "Search"**: choose "Section editor": the list of
     people stays as it was; press "Search": the list shows the two Section
     Editors (Rule 3).
   - **The two boxes**: choose the first Section Editor: "Assignment
     privileges" appears unticked and "Permissions" appears ticked (Rules
     4a, 4b).
   - **The predefined message**: "Choose a predefined message to use, or
     fill out the form below." opens on a blank entry followed by
     "Discussion (Submission)" and "Assign Editor"; choose "Assign Editor":
     "Message" fills with the letter, the recipient's name shown as a tag
     reading "NAME" (Rule 5a; Fields "Message").
   - **"OK"**: press it: the window closes, a notice at the top right of
     the page reads "User added as a stage participant.", and the panel
     lists a new row above the Author's: a round badge with the Section
     Editor's initials, their full name, and "Section editor" under it
     (Rules 1, 6a).
   - **The other stages**: select "Review", "Copyediting" and "Production"
     in the workflow menu in turn: each entry's "Participants" panel lists
     the Section Editor's row; on a press "Internal Review" shows only "The
     Internal Review stage has not yet been initiated." and no
     "Participants" panel {OMP} (Rules 1, 2).
   - **The Section Editor's mailbox**: holds an email from the Editor with
     the subject "Assign Editor", its body the letter with the Section
     Editor's name where "NAME" stood, and the discussion footer with its
     unsubscribe link [A15](#a15) (Side effects).
   - **The discussion**: the Submission stage's discussions panel ("Desk
     Review Tasks & Discussions") lists a discussion "Assign Editor"
     [A5](#a5); open it: its participants are the Section Editor and the
     Editor, and its first entry is the message (Side effects).
   - **The Section Editor's Tasks panel**: Section Editor: sign in and open
     the header's Tasks panel: it lists "{sender} started a discussion:
     Assign Editor: {message}" [A6](#a6) (Side effects).
   - **The Journal Manager's Tasks panel and dashboard**: Journal Manager:
     sign in and open the header's Tasks panel: it no longer lists "A new
     article has been submitted to which an editor needs to be assigned.";
     the dashboard's "Needs editor" view no longer lists the submission
     (Side effects).
   - **The Activity Log**: Editor: press "Activity Log" in the workflow's
     header: the log holds "{name} ({username}) was assigned to this
     submission as a Section editor." [A14](#a14), "Notification sent to
     users." under the Editor's name, and "An email has been sent: Assign
     Editor" with a "View Email" link (Side effects).
   - **"Assign" again**: press "Assign", choose "Section editor" and press
     "Search": the list shows the second Section Editor and not the first
     (Rule 2).
   - **"Cancel" and the close control**: choose the second Section Editor
     and press "Cancel": the window closes without a question; press
     "Assign" and then the window's close control ("<"): a box asks "The
     data on this form has changed. Do you wish to continue without
     saving?"; press the box's "Cancel": the window stays; press "<" again
     and the box's "OK": the window closes; press "Assign" and reload the
     page: the
     browser's leave-page box appears; after each, the panel lists one
     Section editor row only (Rule 6c).
   - **Control**: before "OK", the Journal Manager's Tasks panel listed "A
     new article has been submitted to which an editor needs to be
     assigned." and the "Needs editor" view listed the submission (Side
     effects).

   A preprint server has no Submission stage; scenario 9 is its analogue.

2. **A Section Editor assigns a Copyeditor with "Request Copyedit"** {OJS OMP}

   Given: Section Editor, on a scratch journal, assigned to a submission at
   Copyediting, the journal holding twenty-one Copyeditors, none of them
   assigned to it.

   - **The role list at Copyediting**: on the Copyediting entry's
     "Participants" panel press "Assign": the role list offers "Journal
     editor" and "Production editor", then "Section editor" and "Guest
     editor", then "Copyeditor" and "Marketing and sales coordinator", then
     "Author" and "Translator", each pair in either order, one of the first
     pair preselected (on a press: "Press editor" and "Production editor"
     in either order, then "Series editor", then "Copyeditor" and
     "Marketing and sales coordinator" in either order, then "Author",
     "Volume editor", "Chapter Author" and "Translator" in any order)
     (Rule 3; Fields).
   - **"Copyeditor" and "Search"**: choose "Copyeditor": the list of people
     stays as it was; press "Search": twenty rows
     show, with "20 of 21 items" and a "Load more" link under the list;
     scroll to the list's end: no further row loads; press "Load more": the
     list shows all twenty-one Copyeditors (Rule 3; Fields).
   - **The box**: choose the first Copyeditor: "Permissions" appears
     unticked, and "Assignment privileges" does not appear (Rules 4a, 4b).
   - **"Request Copyedit"**: the predefined messages are "Discussion
     (Copyediting)" and "Request Copyedit"; choose "Request Copyedit":
     "Message" fills with the letter, the recipient's name shown as the tag
     "NAME"; press "OK": the notice "User added as a stage participant."
     shows at the top right of the page, and the panel lists the
     Copyeditor's row with "Copyeditor" under the name (Rules 5a, 6a;
     Fields "Message").
   - **The Production entry**: select "Production" in the workflow menu:
     its "Participants" panel lists no Copyeditor row (Rule 2).
   - **The Copyeditor's mailbox**: holds an email "Request Copyedit" from
     the Section Editor, its body the letter with the Copyeditor's name
     where "NAME" stood (Side effects).
   - **The Copyeditor's screen**: Copyeditor: sign in and open the
     submission at "Copyediting": the "Participants" panel has no "Assign",
     and each row's "More Actions" menu offers "Notify" and nothing else;
     the header's Tasks panel lists "{sender} started a discussion: Request
     Copyedit: {message}" (Actors rows "Assign", "Edit", "Remove", "Notify";
     Side effects).
   - **Control**: the Section Editor's panel shows "Assign" at its heading
     and "Edit" and "Remove" in the Copyeditor's row menu, which the
     Copyeditor's panel never offers (Actors rows "Assign", "Edit",
     "Remove").

   A preprint server has no Copyediting stage and no Copyeditor.

3. **Change an assignment with "Edit"**

   Given: Journal Manager, on the workflow of a submission with two Section
   Editors assigned, each with the metadata permission and without the
   recommend-only limit.

   - **"Edit Assignment"**: on the "Participants" panel press the first
     Section Editor's "More Actions" button ("…") and choose "Edit": a side
     panel titled "Edit Assignment" shows "Participant" as "{name} (Section
     editor)", the name in bold, "Assignment privileges" unticked,
     "Permissions" ticked, and no message box (Rule 8; Fields "Edit
     Assignment").
   - **Both boxes changed**: tick "Assignment privileges", untick
     "Permissions" and press "OK": the window closes, a notice at the top
     right of the page reads "The stage assignment has been changed.", and
     the row gains a third line, "Only allowed to recommend an editorial
     decision" (Rules 1, 8d).
   - **"Edit" again**: open the same row's "Edit": "Assignment privileges"
     is ticked and "Permissions" unticked; press "Cancel": the window
     closes (Rules 8, 8f).
   - **Another stage** {OJS OMP}: select "Production" in the workflow menu:
     the Section Editor's row there also reads "Only allowed to recommend an
     editorial decision" (Rule 2).
   - **Back to the start**: open the row's "Edit" once more, untick
     "Assignment privileges", tick "Permissions" and press "OK": the notice
     "The stage assignment has been changed." shows and the row loses its
     third line (Rule 8d).
   - **Control**: the second Section Editor's row shows its name and
     "Section editor" and no third line throughout (Rules 1, 2).

4. **What an assigned editor may change on the panel**

   Given: two Section Editors, an Editor (a Preprint Server Manager on a
   preprint server), a Production editor {OJS OMP} and a Journal Manager of
   a scratch journal, with a submission to which the first Section Editor
   is assigned as a deciding editor, the second Section Editor and the
   Editor are assigned limited to recommendations, and its Author is
   assigned, the Production editor and the Journal Manager being assigned
   to nothing.

   - **The deciding Section Editor**: First Section Editor: sign in and open
     the submission: "Assign" sits at the panel's heading; the menu of their
     own row offers "Notify" and "Remove" and no "Edit"; the Editor's row
     offers no "Edit"; the second Section Editor's row offers "Edit", which
     opens "Edit Assignment" with "Assignment privileges" ticked and
     "Permissions" ticked; press "Cancel": the window closes without a
     question (Actors rows "Assign", "Edit", "Remove"; Rules 8a, 8b, 8f).
   - **The recommending Section Editor**: Second Section Editor: sign in and
     open the submission: "Assign" sits at the heading; the deciding Section
     Editor's row offers no "Edit"; the Author's row offers "Edit", which
     opens "Edit Assignment" with "Permissions" and no "Assignment
     privileges"; press "Cancel" (Actors rows "Assign", "Edit"; Rule 8b).
   - **The recommending Editor**: Editor: sign in and open the submission:
     the deciding Section Editor's row offers "Edit", which opens "Edit
     Assignment" with "Permissions" and no "Assignment privileges"; press
     "Cancel" (Actors row "Set the recommend-only limit"; Rule 8a).
   - **The Production editor not assigned** {OJS OMP}: Production editor:
     sign in and open the submission: its "Participants" panel carries
     "Assign" at the heading and "Edit" in every row's menu, the Editor's
     included; select "Review", "Copyediting" and "Production" in the
     workflow menu: each entry shows the same panel with "Assign" (Actors
     rows "See the Participants panel", "Assign", "Edit").
   - **Control**: Journal Manager, not assigned: open the submission: the
     menus of the deciding Section Editor's row and of the Editor's row
     offer "Edit", the two rows on which the deciding Section Editor had
     none (Actors row "Edit").

5. **Remove a participant**

   Given: Journal Manager, on a scratch journal, on the Submission stage
   (Production on a preprint server) of a submission whose only editor is
   a Section Editor who shares a discussion of that stage with the Journal
   Manager and who, on a journal or press, is also assigned as Copyeditor.

   - **The dialog**: in the Section Editor's row press "More Actions" and
     choose "Remove", shown in red: a dialog titled "Remove Participant"
     reads "You are about to remove this participant from all stages." with
     "OK" in red and "Cancel"; press "Cancel": the row stays (Rule 10).
   - **"OK"**: choose "Remove" again and press "OK": the Section editor row
     is gone from the panel (Rule 10).
   - **The other stages** {OJS OMP}: select "Review", "Copyediting" and
     "Production" in the workflow menu: no entry lists a Section editor row
     for the person, and "Copyediting" still lists their Copyeditor row
     (Rules 2, 10).
   - **The discussion**: open it on the stage's discussions panel: the
     Section Editor is no longer among its participants (Rule 10).
   - **The Activity Log**: press "Activity Log" in the workflow's header:
     the log holds "{name} ({username}) was removed from this submission as
     a Section editor." (Side effects).
   - **The dashboard** {OJS OMP}: the "Needs editor" view lists the
     submission again, with its "Assign Editor" button (Side effects).
   - **Control**: before "OK", the "Needs editor" view did not list the
     submission and the discussion named the Section Editor among its
     participants (Side effects; Rule 10).

6. **Notify a participant**

   Given: Journal Manager, on a scratch journal, on the Submission stage
   (Production on a preprint server) of a submission with two Section
   Editors assigned, the second of whom has unticked "Enable these types of
   notifications." on the "Discussion added." row of their Notifications
   tab.

   - **The "Notify" window**: in the first Section Editor's row press "More
     Actions" and choose "Notify": a side panel titled "Notify" shows the
     heading "Start Discussion" over "Begin a discussion between yourself
     and {name}.", the list "Choose a predefined message to use, or fill out
     the form below.", "Message", and one button, "Notify", with no
     "Cancel" (Rule 11; Fields "Notify").
   - **"Message" empty**: press "Notify": the window stays open, a warning
     at the top right of the page reads "Please ensure that you have filled
     out the message field and included someone other than yourself in the
     discussion.", and the stage's discussions panel gains no discussion
     (Fields "Notify").
   - **A predefined message**: choose "Discussion (Submission)"
     ("Discussion (Production)" on a preprint server, here and in every
     step below): "Message" reads "Please enter your message."; replace it with "Please check the
     reference list." and press "Notify": the window closes and a notice
     at the top right of the page reads "Notification sent to users.";
     on a preprint server the notice shows instead in a box headed
     "Notification" at the top of the Production entry [OPS4](#ops4)
     (Rules 5a, 11a; Side effects).
   - **The first Section Editor's mailbox**: holds an email from the
     Journal Manager with the subject "Discussion (Submission)", its body
     "Please check the reference list." followed by the discussion footer
     and its unsubscribe link (Side effects).
   - **The discussion**: the stage's discussions panel lists "Discussion
     (Submission)"; open it: its participants are the first Section Editor
     and the Journal Manager, and its first entry is "Please check the
     reference list." (Side effects).
   - **The first Section Editor's Tasks panel**: First Section Editor: sign
     in and open the header's Tasks panel: it lists "{sender} started a
     discussion: Discussion (Submission): Please check the reference list."
     (Side effects).
   - **The Activity Log**: Journal Manager: press "Activity Log" in the
     workflow's header: the log holds "Notification sent to users." under
     the Journal Manager's name and "An email has been sent: Discussion
     (Submission)" with a "View Email" link (Side effects).
   - **"Notify" to the second Section Editor**: send the same message
     through the second Section Editor's row: the window closes with
     "Notification sent to users." and the discussions panel lists a
     second "Discussion (Submission)" (Side effects).
   - **The second Section Editor's mailbox and Tasks panel**: the mailbox
     holds no email "Discussion (Submission)"; Second Section Editor: sign
     in and open the header's Tasks panel: it lists no row for the
     discussion (Side effects).
   - **Control**: the first Section Editor's email, sent the same way,
     reached their mailbox, so the second one's empty mailbox is not a slow
     delivery (Side effects).

7. **A role's options: recommend only, and no metadata permission**

   Given: Journal Manager, on a scratch journal whose roles keep their
   install options, on the Submission stage (Production on a preprint
   server) of two submissions that each have a Section Editor assigned,
   and a third Section Editor and an Editor (a second Preprint Server
   Manager on a preprint server) assigned to neither.

   - **An assignment before the change**: on the first submission open the
     Section Editor's "Edit": "Assignment privileges" is unticked and
     "Permissions" ticked; press "Cancel" (Rule 8).
   - **The Role Options**: open Settings › Users & Roles › Roles and the
     "Section editor" role's "Edit"; under "Role Options" tick "This role
     is only allowed to recommend a review decision and will require an
     authorised editor to record a final decision.", untick "Permit
     submission metadata edit." and save the form (Settings bullets 2, 3).
   - **The existing assignments**: on each submission open the Section
     Editor's "Edit": "Permissions" is unticked and "Assignment privileges"
     still unticked; press "Cancel"; neither row reads "Only allowed to
     recommend an editorial decision" (Settings bullets 2, 3).
   - **A new assignment**: on the first submission press "Assign", choose
     "Section editor", press "Search" and choose the third Section Editor:
     "Assignment privileges" appears ticked and "Permissions" appears
     unticked; press "OK": the new row reads "Only allowed to recommend an
     editorial decision" (Rules 4a, 4b, 6a).
   - **Control**: press "Assign" again and, with "Journal editor"
     preselected ("Preprint Server manager" on a preprint server), choose
     the Editor (on a preprint server, the second Preprint Server Manager):
     "Assignment privileges" appears unticked, that role being left as it
     was, and no "Permissions" box shows (Rules 4a, 4b).

8. **The automatic "Editor Assigned (Auto)" email** {OJS OMP}

   Given: Author, on a scratch journal, with a draft submission to which an
   Editor, a Section Editor, a second Section Editor who ticked "Do not
   send me an email…" on the "A new article, "Title," has been submitted."
   row of their Notifications tab, a person holding both the Editor and
   the Section Editor role (assigned in both), a Production editor and a
   Funding coordinator are already assigned, the journal also holding a
   second Editor, not assigned, who holds the Author role too.

   - **"Submit"**: finish the draft in the submission wizard and press
     "Submit" (Rule 12).
   - **The editors' mailboxes**: the Editor, the first Section Editor and
     the person holding both roles each hold exactly one email "You have
     been assigned as an editor on a submission to {journal name}", from
     the journal's contact, carrying a link to the submission, its title,
     authors and abstract, and asking the editor to send it for review or
     decline it [OJS1](#ojs1) (Rules 12a, 12b).
   - **The link**: Editor: open the email's link: the submission's
     workflow opens (Rule 12b).
   - **The Activity Log**: press "Activity Log" in the workflow's header:
     the log holds "An email has been sent: You have been assigned as an
     editor on a submission to {journal name}" once for each of the three
     people emailed (Side effects).
   - **An editor's own submission**: second Editor: sign in, start a new
     submission, choose "Submit As" › "Journal editor" on the wizard's
     start page, finish the wizard and press "Submit": their mailbox holds
     the email "You have been assigned as an editor on a submission to
     {journal name}" about their own submission (Rule 12c).
   - **Control**: the second Section Editor, the Production editor and the
     Funding coordinator hold no such email, while the first Section
     Editor's arrived from the same "Submit" (Rules 12a, 12d).

   A preprint server sends this email to nobody [OPS3](#ops3), so the
   scenario has no run there.

App-specific:

9. **{OPS} Assign a Moderator on a preprint server**

   Given: Preprint Server Manager, on a scratch preprint server, on the
   Production stage of a submitted preprint with no Moderator assigned,
   the server holding a Moderator, a second Author and a second Preprint
   Server Manager.

   - **The role list**: on the "Participants" panel press "Assign": the
     role list offers "Preprint Server manager", "Moderator" and "Author",
     "Preprint Server manager" preselected [OPS1](#ops1) (Rule 3; Fields).
   - **"Moderator"**: choose "Moderator", press "Search" and choose the
     Moderator: "Assignment privileges" appears unticked and "Permissions"
     ticked (Rules 4a, 4b).
   - **The predefined message**: the list opens on a blank entry followed
     by "Discussion (Production)" and "Assign Editor"; choose "Discussion
     (Production)": "Message" reads "Please enter your message."; replace
     it with "Please moderate this preprint." and press "OK": the notice
     "User added as a stage participant." shows at the top right of the
     page, and the panel lists the Moderator's row with "Moderator" under
     the name (Rules 5a, 6a).
   - **The Moderator's mailbox**: holds an email from the Preprint Server
     Manager with the subject "Discussion (Production)", its body "Please
     moderate this preprint." followed by the discussion footer and its
     unsubscribe link (Side effects).
   - **The Activity Log**: press "Activity Log" in the workflow's header:
     the log holds "{name} ({username}) was assigned to this submission as
     a Moderator." (Side effects).
   - **"Author"**: press "Assign", choose "Author", press "Search" and
     choose the second Author: "Permissions" appears ticked and
     "Assignment privileges" does not appear; press "Cancel" (Rules 4a,
     4b).
   - **Control**: press "Assign" and choose the second Preprint Server
     Manager from the preselected role's list: "Assignment privileges"
     appears and no "Permissions" box shows (Rules 4a, 4b).

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A6 (issue report
    `docs/issues/U35-A6-assign-editor-message-gives-no-task.md`):
    "Assign" with "Assign Editor", the new editor's Tasks panel holding
    "You have been assigned as an editor to the submission…"
  - the guard for A7 (issue report
    `docs/issues/U35-A7-edit-assignment-logged-as-assignment.md`):
    an "Edit Assignment" save logged as a change, and an untouched "OK"
    adding no line
  - the guard for A14 (issue report
    `docs/issues/U35-A14-activity-log-names-participant-not-editor.md`):
    the Activity Log's "User" column naming the acting editor on the
    "was assigned" and "was removed" lines
  - the guard for A4 (issue report
    `docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md`):
    "OK" on "Assign Participant" with nobody chosen, the notice read and
    the window's role, person and message kept
  - the guard for OPS4 (issue report
    `docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md`):
    on a preprint server "Notification sent to users." at the top right
    after "Notify", and no "Notification" box in the Production entry
  - the guard for OJS1 (issue report
    `docs/issues/U35-OJS1-assigned-email-names-send-to-review.md`):
    the "Editor Assigned (Auto)" email naming the Submission stage's
    button as the screen shows it
  - the guard for A12 (issue report
    `docs/issues/U35-A12-no-changes-window-ok-reports-change.md`):
    the "No changes can be made to this participant" window, "OK"
    disabled or closing with no "The stage assignment has been changed."
  - the guard for A15 (issue report
    `docs/issues/U35-A15-assign-editor-email-two-footers.md`):
    the Submission stage's "Assign Editor" letter ending with the
    sender's signature and the discussion footer alone
  - the guard for A5 (issue report
    `docs/issues/U35-A5-message-discussion-created-by-recipient.md`):
    after "Notify" the discussions panel's row reading "Created by:"
    the sender
  - the guard for A9 (issue report
    `docs/issues/U35-A9-permissions-tick-carries-to-other-role.md`):
    in "Assign Participant" a Section Editor chosen, then the role
    changed to Author and a person chosen, "Permissions" read unticked
  - the guard for A11 (issue report
    `docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md`):
    a person with an anonymous review of the submission chosen in
    "Assign", the warning read before "OK"
  - the guard for OPS2 (issue report
    `docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md`):
    on a preprint server each predefined message of the Production stage
    filling "Message"
  - the guard for A16 (issue report
    `docs/issues/U35-A16-notify-message-ignores-email-opt-out.md`):
    "Notify" to a participant who ticked "Do not send me an email…"
    under "Discussion added.", the mailbox empty and the Tasks entry there
  - the guards for A10 (issue reports
    `docs/issues/U35-A10-added-message-template-not-sent.md` and
    `docs/issues/U35-A10-role-limited-message-template-not-sent.md`):
    a template added in Settings sent from "Notify", and a template
    limited to a role sent from "Notify" by a manager outside that role
  - the guard for OPS3 (issue report
    `docs/issues/U35-OPS3-moderator-assigned-email-never-sent.md`):
    a preprint submitted to a section with Moderators under "Editorial
    Assignments", each assigned moderator's mailbox read for "Moderator
    Assigned (Auto)"
  - the guard for A1 (issue report
    `docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md`):
    a Section Editor changing the Author's "Permissions" in "Edit
    Assignment", the notice and the changed box read
  - the guard for OMP1 (issue report
    `docs/issues/U35-OMP1-internal-review-no-predefined-message.md`):
    the predefined messages of a press's Internal Review, read as a set
  - the guard for A3 (issue report
    `docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md`):
    a message typed in "Notify" and in "Assign Participant" with the
    list on its blank entry, the recipient's mailbox and the stage's
    discussions panel read
  - the "Notify" window's close control, asking first or not (Rule 11c)
  - Escape and a reload on the "Notify" window (Rule 11d)
- **Nothing new to test**:
  - "Cancel" on "Edit Assignment" after a box was changed, and its close control asking first (Rule 8f): scenario 3 cancels only an unchanged window
  - "Assignments" counting open review requests and leaving out published submissions (Fields "Assign Participant")
  - "No changes can be made to this participant" for a recommending editor opening a manager-level row (Rule 8c)
- **Register carries it**:
  - A1 (a Section Editor's or Guest Editor's "OK" on "Edit Assignment" saving nothing; Rule 8e)
  - A2 ("Remove" offered on the rows "Edit" is not, a Section Editor's own row and its "Error" window included; Actors row "Remove"; Rule 10)
  - A3 (a message typed with the list on its blank entry not sent, and the blank entry chosen again failing on the server; Rules 5b, 11b; Fields "Notify")
  - A4 ("OK" with nobody chosen, or with a person listed under the previous role, assigning nobody; Rule 6b)
  - A5 (the message's discussion listed as created by its recipient; Side effects; scenario 1 marks it)
  - A6 ("Assign Editor" giving no task of its own; Side effects; scenario 1 marks it)
  - A7 ("Edit" logged as a new assignment; Side effects "On Edit")
  - A8 (a Production editor assigned to the submission refused its Submission and Review stages; Actors row "See the Participants panel")
  - A9 (a "Permissions" tick carried over to another role; Rule 4c)
  - A10 (a template restricted to some roles, or any template added in Settings; Rule 5a; Settings bullet 4)
  - A11 (a person who reviews the submission anonymously chosen with no warning; Rule 7)
  - A12 ("OK" on "No changes can be made to this participant" reporting a change; Rule 8c)
  - A14 (the Activity Log's "User" column naming the participant; Side effects; scenario 1 marks it)
  - A15 (two footers on the Submission stage's "Assign Editor" email; Side effects; scenario 1 marks it)
  - A16 (the "Do not send me an email…" box on "Discussion added." ignored; Side effects)
  - A17 ("Notify" after the list set back to blank; Rule 11b)
  - OJS1 (the automatic email naming "Send to Review"; Rule 12b; scenario 8 marks it)
  - OMP1 (no predefined message on a press's Internal Review; Rule 5c)
  - OPS2 ("Assign Editor" leaving "Message" as it was on a preprint server; Rule 5d)
  - OPS3 (no automatic assignment email on a preprint server; Rule 12a; scenario 8 notes it)
  - OPS4 (a preprint server's "Notification sent to users." after "Notify" showing in the Production entry's "Notification" box; Rule 11a; scenario 6 marks it)
- **No seed**:
  - an automatic assignment in a role set to recommend only (Rule 12e; A13): no test install can make one
- **Owned by another feature**:
  - the Author's view without a Participants panel (Actors row "See the Participants panel"; *Workflow screen & stage access*, scenario 7)
  - "Login As" in the row menu and "Logout as {name}" at the top of the panel (Actors; *Login & sessions*, scenario 8)
  - what the recommend-only limit leaves a recommending editor on each stage (Rule 9; *Editorial decision recording*, scenario 5, and *Review stage & rounds*, scenario 11)
  - what the metadata permission allows (Rule 9; *Publication metadata*, scenario 12)
  - the tasks "Request Copyedit", "Ready for Production" and "Index Requested" raise (Side effects; *Copyediting stage*, scenario 3, and *Production stage*, scenario 3)
  - the stage's notice box after an assignment, a message or a removal (Side effects; *Copyediting stage*, scenarios 3 and 4, and *Production stage*, scenario 3)
  - the dashboard's "Assign Editor" opening the "Assign Participant" window (Purpose; *Submissions dashboard*, scenario 8)
  - a role's stage unticked on the Roles screen (Settings bullet 1; *Roles configuration*)
  - the "Editor Assigned (Auto)" template edited (Settings bullet 5; *Emails management*)
  - the editors a section receives automatically, a Funding coordinator among them (Settings bullet 6; *Submission wizard*, scenario 11)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-22), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | A Section Editor's "OK" on a participant's "Edit Assignment" saves nothing and shows the form again | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A3](#a3) | A message typed in "Assign" or "Notify" with no predefined message chosen is not sent | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A4](#a4) | "OK" on "Assign Participant" with nobody chosen, or with a person from the previous role's list, assigns nobody and gives no reason | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A5](#a5) | A message sent from "Notify" or "Assign" opens a discussion listed as created by its recipient | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A6](#a6) | The "Assign Editor" message gives the new editor no "You have been assigned as an editor" task | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A7](#a7) | Changing a participant's assignment with "Edit" adds a "was assigned to this submission" line to the Activity Log | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A9](#a9) | In "Assign Participant", the "Permissions" box stays ticked after the editor chooses another role | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A10](#a10) | A message template added in Settings is listed but fills nothing and cannot be sent | 🐞 | medium · crash: server | issues (claude), 2026-10-01 — re-verified |
| [A11](#a11) | No warning opens when an editor assigns, as a participant, a person who reviews the submission anonymously | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A12](#a12) | "OK" on the "No changes can be made to this participant" window reports "The stage assignment has been changed." | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A14](#a14) | The Activity Log's "User" column names the participant who was assigned or removed, not the editor who did it | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [A15](#a15) | The Submission stage's "Assign Editor" message ends "This is an automated message from…" instead of the editor's signature | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A16](#a16) | A message sent with "Notify" is emailed to a participant who opted out of emails for new discussions | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OJS1](#ojs1) | A journal's "Editor Assigned" email tells the editor to select "Send to Review"; the button reads "Send for Review" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OMP1](#omp1) | A press's Internal Review offers no predefined message in "Assign" and "Notify" | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [OPS2](#ops2) | On a preprint server, choosing the predefined message "Assign Editor" leaves "Message" unfilled | 🐞 | low · crash: server | issues (claude), 2026-10-02 — re-verified |
| [OPS3](#ops3) | A preprint server never emails its moderators that a new preprint was assigned to them | 🐞 | medium | issues (claude), 2026-10-01 — re-verified |
| [OPS4](#ops4) | On a preprint server, "Notification sent to users." shows in a box in the Production stage instead of at the top right | 🐞 | low | issues (claude), 2026-10-01 — re-verified |
| [A2](#a2) | A Section Editor may "Remove" rows they may not "Edit": their own, manager-level ones, and a recommending editor another editor's | ❓ | minor | — |
| [A8](#a8) | A Production editor assigned to a submission can open fewer of its stages than one who is not assigned | ❓ | minor | — |
| [A13](#a13) | Whether an automatic assignment in a recommend-only role is recommend-only was never seen | ❓ | latent | — |
| [A17](#a17) | "Notify" after the list is set back to blank was never pressed | ❓ | latent | — |
| [OPS1](#ops1) | A preprint server offers its manager role in "Assign" | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — A Section Editor's "OK" on a participant's "Edit Assignment" saves nothing and shows the form again** · 🐞 · medium.
A Section Editor assigned to a submission (a Series Editor on a press, a
Moderator on a preprint server) is offered "Edit" on the Participants
rows of the Author, the assistants and the other section editors, never
on their own. The "Edit Assignment" window shows the "Permissions" box,
and on another section editor's row also "Assignment privileges".
Pressing "OK" is expected to save the boxes and close the window.
Instead the window shows its form again with the boxes as they were,
with no notice and no reason, and nothing is saved.
A Journal Manager or Editor making the same change on the same row saves
it.
Since: 2026-04-02 · Basis: probe, 2026-10-01. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — "Remove" is offered where "Edit" is refused** · ❓ · minor.
A Section Editor may not "Edit" their own row or a manager-level row (an
Editor's, a Production editor's), and a recommending editor may not
"Edit" another Section Editor's row; "Remove" is offered on all of them and
deletes the assignment. A recommending editor can so take the deciding
editor off the submission, which leaves the recommending editor unable to
record anything until someone assigns a new one.
Question: should "Remove" follow the same row rules as "Edit"? Lean: yes;
the rows a person may not change should not be removable by them either.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — A message typed in "Assign" or "Notify" with no predefined message chosen is not sent** · 🐞 · medium · crash: server.
The request behind "Notify" and behind "OK" on "Assign Participant"
fails on the server when a message is typed and the list "Choose a
predefined message to use, or fill out the form below." is left on its
blank entry. The window stays open with the typed text in it and shows
no error. No email goes out and no discussion opens.
On "Assign" the person is assigned all the same. Their row shows once
the page is opened again, and the Activity Log has no line for the
assignment. Pressing "OK" again fails the same way and does not assign
them twice.
The message goes out when a predefined message is chosen first and its
text replaced, or from the stage's discussions panel. A press's
Internal Review offers no predefined message, so nothing can be sent
from its Participants panel.
The server failure was seen on PostgreSQL. Setting the list back to its
blank entry after a predefined message was chosen fails there too.
Basis: probe, 2026-10-01. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — "OK" on "Assign Participant" with nobody chosen, or with a person from the previous role's list, assigns nobody and gives no reason** · 🐞 · medium.
In the "Assign Participant" window, an editor who presses "OK" with
nobody chosen in the list of people expects to be told that a person is
needed. Instead the window shows its form again, emptied: the role list
is back on its first role with that role's people, and a predefined
message chosen and a message typed for the participant are gone. There
is no message, and nobody is assigned.
"OK" gives the same result in a second case, with a person chosen. The
role list does not reload the list of people until "Search" is pressed,
and nothing in the window says so. An editor who chooses a person and
then another role still sees the earlier role's people with that person
chosen, and "OK" assigns nobody, because the person does not hold the
role now chosen.
Nothing is stored wrong. The window staying open, where it closes after
an assignment, is the only sign that nobody was assigned.
Basis: probe, 2026-10-01. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A message sent from "Notify" or "Assign" opens a discussion listed as created by its recipient** · 🐞 · low.
A message sent from "Assign" or "Notify" opens a discussion, and the
person it was sent to is recorded as its creator: the stage's
discussions panel lists it as "Created by: {the person it was sent
to}". The discussion's first entry and the recipient's task name the
sender.
The message, the email and the task arrive as written. To see who
started a discussion, a reader has to open it. The fix is small: one
line, where the discussion is created, takes the sender instead of the
recipient.
Every predefined message sent from the Participants panel is affected,
in every stage. A preprint server has two of them, "Discussion
(Production)" and "Assign Editor"; "Request Copyedit" exists on a
journal and a press only. A discussion added with the panel's "Add"
names the person who added it.
The Copyediting stage's instance of this is that spec's
[finding](U32-copyediting-stage.md#a9).
Basis: probe, 2026-10-01. <sup>[f-a5](#fn-a5)</sup>
Report: refresh owed — security side, unreleased (`main` only; @jarda.kotesovec on Mattermost 2026-10-05: security label on the report and issue): because the recipient is the creator, a recipient who is not a manager (an Author, a Copyeditor) is offered "Edit", "Add Task Details", "History" and "Delete" on that discussion and can rename it (`PUT /submissions/{id}/tasks/{taskId}` 200) and delete it (`DELETE` 200, the `edit_tasks` row gone); "Edit" › message › "Save" adds a message under the recipient's name, since the first note is stored without `is_headnote` (pkp/pkp-lib#12278's own-message guard never applies; with the U37 A9 fix the save answers 422); the sending section editor who is not a manager gets no row menu on it. Walked 2026-10-01 on OJS submission 5 (`ddiouf`), OMP 1 (`aclark`), OPS 1 (`ccorino`), and 2026-10-02 for the "Edit" save; not walked: "Assign", a Copyeditor recipient. Rows already stored on `main` keep the recipient as creator; a repair would set `created_by` to the head note's `user_id`, as `I10406_EditorialTasks` does (2026-10-05).

<a id="a6"></a>
**A6 — The "Assign Editor" message gives the new editor no "You have been assigned as an editor" task** · 🐞 · low.
When an editor assigns a participant, or messages one with "Notify",
and chooses the predefined message "Assign Editor", the person it is
sent to gets no task for the assignment. Their Tasks panel is expected
to gain "You have been assigned as an editor to the submission
"{title}"."; it gains only the discussion row, "{sender} started a
discussion: Assign Editor: {message}".
Only that row is missing: the person is assigned, and the email and the
discussion arrive. The other request messages still give a task beside
their discussion row; "Request Copyedit", for one, gives "You have been
asked to review copyedits for "{title}".".
It was seen on the Submission stage of a journal and a press and on the
Production stage of a preprint server, the only stage a preprint server
offers the message on. The Review and Production stages of a journal or
press have the same fault by the code. On a 3.5 preprint server the
message is listed as "Editor Assigned".
Basis: probe, 2026-10-01. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Changing a participant's assignment with "Edit" adds a "was assigned to this submission" line to the Activity Log** · 🐞 · low.
An editor opens "Edit" on a participant's row of the workflow's
Participants panel to change "Permissions" (whether the person may edit
the publication's details) or "Assignment privileges" (whether an editor
may only recommend a decision). After "OK", the submission's Activity
Log gains "{name} ({username}) was assigned to this submission as a
{role}.", the line a new assignment writes, where a line saying the
assignment was changed is expected. "OK" with no box touched adds the
same line.
The log shows an assignment that did not happen and holds no record of
the change that did. The edit itself is saved.
Basis: probe, 2026-10-01. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — Assigning a Production editor narrows the stages they can open** · ❓ · minor.
A Production editor who is not assigned to a submission opens every stage
of it and gets the whole Participants panel there, "Assign", "Edit" and
"Remove" included, as an Editor does. Once assigned to the submission as
Production editor, the same person opens only Copyediting and Production;
Submission and Review (on a press also Internal Review) show "You don't
currently have access to that stage of the workflow." instead. Being
assigned takes away access the role gave them.
Question: should an assignment narrow a Production editor's reach to the
stages of that role? Lean: no; the assignment replacing the role's
journal-wide access looks unintended.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — In "Assign Participant", the "Permissions" box stays ticked after the editor chooses another role** · 🐞 · low.
In "Assign Participant", an editor who chooses a person in a role that
starts with "Permissions" ticked, such as Section editor, and then
changes the role to one that starts without it, such as Author, sees
"Permissions" ticked for the person chosen next. The editor expects the
box to start from the new role's setting, as "Assignment privileges"
does. "OK" saves the assignment with the tick.
That person may then change the submission's title, abstract and other
publication details, although their role's "Permit submission metadata
edit." is off, until an editor unticks the box under the row's "Edit"
or removes the person with "Remove". The editor can also untick the box
before "OK".
On a preprint server the fault shows only after a manager has switched
a role's "Permit submission metadata edit." off: as installed, every
role "Assign" offers there has it on.
Basis: probe, 2026-10-01. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — Templates added in Settings cannot be used** · 🐞 · medium · crash: server.
A template under Settings › Workflow › "Tasks and Discussions" cannot be
used from the Participants panel in two cases, each a fault of its own.
A template added on that screen is listed in "Choose a predefined
message…", but choosing it leaves "Message" empty, and "Notify" with a
message typed leaves the window open and shows no error. No email goes
out, and each press of "Notify" leaves a discussion named after the
template, with no message in it, on the stage's discussions panel.
A template with "Limit access to specific roles" set, installed or
added, fails the same way on the choice and on "Notify", and opens no
discussion. In both cases the request behind the action fails on the
server and nothing on screen says so; the text goes out once it is typed
again under an installed template that is not limited.
Basis: probe, 2026-10-01. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — No warning opens when an editor assigns, as a participant, a person who reviews the submission anonymously** · 🐞 · medium.
In "Assign", an editor chooses a person who reviews the submission
anonymously. A warning is meant to open, saying that this person "will
have access to the author's identity". Nothing opens, and "OK" assigns
the person with "User added as a stage participant.".
From then on the reviewer can open the submission's workflow as one of
its editors. It shows the author's name, which a reviewer of the type
"Anonymous Reviewer/Anonymous Author" is not meant to have.
It happens while the submission is in a review stage. Besides being a
reviewer, the person must hold a role in the journal that can be
assigned on a review stage, such as Section editor. Their review of
this submission must be of the type "Anonymous Reviewer/Anonymous
Author" or "Anonymous Reviewer/Disclosed Author" and not declined. A
preprint server has no review and is not affected.
The fault is one line of script. The effort is medium because the fix
also has to be shipped as a rebuilt script bundle in each app.
Basis: probe, 2026-10-01. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — "OK" on the "No changes can be made to this participant" window reports "The stage assignment has been changed."** · 🐞 · low.
A Journal manager, Journal editor or Production editor (Press manager,
Press editor; Preprint Server manager) whose own assignment on a
submission is ticked "only allowed to recommend an editorial decision"
opens "Edit" on the Participants row of a person assigned in one of
those roles, their own row included. The window reads "No changes can be
made to this participant", yet its "OK" can be pressed and closes the
window with the notice "The stage assignment has been changed."
On `main`, 3.5 and 3.4 nothing is lost: the assignment stays as it was,
and only the notice misleads. "Cancel" closes the window without it.
The same "OK" also adds a line to the submission's activity log, but
every "Edit Assignment" save does that, a real one included: it is a
separate fault ("Edit" is logged as a new assignment) and is not counted
here. The proposed fix is one condition in the window's template that
disables "OK" when there is nothing to change.
Basis: probe, 2026-10-01. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — An automatic assignment's recommend-only limit was never seen** · ❓ · latent.
When a role is set to recommend only, an editor in that role who is
assigned automatically on submission is expected to be a recommending
editor, as one assigned through "Assign" starts out (Rule 4a). The
application builds the assignment that way, but no test install can make
an automatic assignment in a recommend-only role, so the result was never
seen.
Question: does an automatic assignment in a recommend-only role come out
recommend-only? Lean: yes, as the application builds it; one automatic
assignment on the install's first journal with its Section Editor role
set to recommend only, then that row's "Edit Assignment" read, settles
it.
Basis: code. <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — The Activity Log's "User" column names the participant who was assigned or removed, not the editor who did it** · 🐞 · medium.
When an editor assigns a participant to a submission or removes one, the
submission's Activity Log gains a line such as "Minoti Inoue (minoue)
was assigned to this submission as a Section editor."; changing an
assignment writes the same "was assigned" line. The "User" column of
that line is expected to name the editor who did it, as it does on the
log's other lines. It names the participant.
The log therefore never shows who assigned, changed or removed a
participant, and no other screen does.
No setting is involved: every such line of every submission reads this
way, the lines written before today included.
Basis: probe, 2026-10-01. <sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — The Submission stage's "Assign Editor" message ends "This is an automated message from…" instead of the editor's signature** · 🐞 · low.
An editor who assigns a participant on the Submission stage and chooses
the predefined message "Assign Editor" sends a letter that closes, after
"Kind regards,", with "— This is an automated message from {journal
name}." where the editor's own signature is expected. The discussion
footer that follows it ("— Reply to this comment at #{submission
number} {authors} or unsubscribe from emails sent by {journal name}.")
is expected; only the "automated message" line is wrong, and with it
the email ends with two footers.
The letter opens a discussion the recipient can reply to, yet it says
it is automated and names nobody. The line is the journal's or press's
email signature: one that changed its signature under Settings gets its
own signature there, which is still not the editor's. The Review and
Production stages' "Assign Editor" letters close with the sender's
signature.
The wrong text is stored per journal or press when it is installed, so
a fix corrects new installs only; an existing one keeps the line until
a manager edits the message under Settings › Workflow. The fix is
medium because it changes each app's own files and adds a text in every
language. A preprint server installed on `main` has no "Assign Editor"
letter at all today, a separate fault; one on 3.5 has this one.
Basis: probe, 2026-10-01. <sup>[f-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — A message sent with "Notify" is emailed to a participant who opted out of emails for new discussions** · 🐞 · low.
On the profile's Notifications tab, the row named "Discussion added."
has a box "Do not send me an email for these types of notifications.".
A person ticks it, and a message an editor sends them with "Notify" on
the workflow's Participants panel still arrives in their mailbox.
Only the Participants panel's message window ignores the box: a
discussion started from the stage's discussions panel sends that person
no email. "Assign" with a message sends the email too, through the same
code; that was read in the code and not tried on screen.
The email's own "unsubscribe" link sets this same box, so a person who
unsubscribes through the email keeps getting these emails. This too was
read in the code and not tried on screen.
Basis: probe, 2026-10-01. <sup>[f-a16](#fn-a16)</sup>

<a id="a17"></a>
**A17 — "Notify" after the list is set back to blank was never seen** · ❓ · latent.
With a predefined message chosen and the list then set back to its blank
entry, "Notify" was never pressed: it may send the kept text, the earlier
message, or nothing (Rule 11b).
Question: does it act as with a list never touched? Lean: yes; the list
reads blank either way.
Basis: judgment. <sup>[f-a17](#fn-a17)</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — A journal's "Editor Assigned" email tells the editor to select "Send to Review"; the button reads "Send for Review"** · 🐞 · low.
When an author submits to a journal, each editor assigned automatically
through the section's "Editorial Assignments" gets the email "You have
been assigned as an editor on a submission to {journal name}". Its English
text asks them to forward the submission "by selecting "Send to Review"".
No button has that name: the Submission stage's button reads "Send for
Review".
The editor still finds the button, since it is the only one about review
on that stage. A journal manager can correct the sentence under Settings ›
Workflow › Emails › "Editor Assigned (Auto)".
The reach is narrow. Only journals installed on 3.4 or later hold the
sentence; a journal upgraded from 3.3 still sends the older letter, which
names no button. A press's email names its own button correctly, and a
preprint server's email names none. The French text is right; the other
translations were not checked.
Basis: probe, 2026-10-01. <sup>[f-ojs1](#fn-ojs1)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's Internal Review offers no predefined message in "Assign" and "Notify"** · 🐞 · low.
On a press's Internal Review the list "Choose a predefined message to
use, or fill out the form below." of "Assign Participant" and "Notify"
holds only its blank entry. On 3.5 it offers "Discussion (Review)" and
"Assign Editor" there, as External Review still does.
Every press has this stage, and every other stage of a press offers at
least a "Discussion (…)" message. "OK" on "Assign" with "Message" left
empty still assigns the person.
A second fault makes this one worse today: a message typed with no
predefined message chosen is not sent on any stage
([U35-A3-OMP1-typed-participant-message-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md)).
With both faults, the Internal Review stage's Participants panel sends
nothing.
Basis: probe, 2026-10-01. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The preprint server's manager is offered in "Assign"** · ✅ · —.
A journal's or press's manager role has no stage set and never appears in
"Assign"; a preprint server's "Preprint Server manager" role works on
Production and is offered there, next to "Moderator" and "Author". An
install difference in the roles, not in the panel.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — On a preprint server, choosing the predefined message "Assign Editor" leaves "Message" unfilled** · 🐞 · low · crash: server.
On a preprint server, the predefined message "Assign Editor" is
installed with no text. A manager or moderator who picks it in the
"Notify" or "Assign Participant" window gets nothing in "Message": the
request that fetches the text fails on the server because the text is
empty, and no error is shown. "Message" keeps what it held before. The
other predefined message, "Discussion (Production)", fills as it should.
With "Message" empty, "Notify" refuses to send and asks for a message.
"OK" on "Assign Participant" assigns the person and sends them nothing;
only "User added as a stage participant." shows. The same empty text
shows in "Tasks & Discussions". Picked in the "Add" window, "Assign
Editor" fills "Name" and leaves "Message" as it was, yet "Save" answers
"This field is required." until something is typed. Under Settings the
template's "Discussion" box is empty, and "Save" is refused until a text
is typed. With "Auto-add at stage" on, each new preprint gets an "Assign
Editor" discussion with no message. Every preprint server created on
`main` is affected: the server of a new install, and a server added to a
site that was upgraded from 3.5. A server that existed before the
upgrade keeps its letter.
Basis: probe, 2026-10-02. <sup>[f-ops2](#fn-ops2)</sup>

<a id="ops3"></a>
**OPS3 — A preprint server never emails its moderators that a new preprint was assigned to them** · 🐞 · medium.
A preprint server lists "Moderator Assigned (Auto)" under Settings ›
Workflow › Emails and lets it be edited, but never sends it. When an
author submits a preprint, the Moderators named under the section's
"Editorial Assignments" are added to it as on a journal, but "You have
been assigned as a moderator on a submission to {server name}" is not
sent to any of them: no send is attempted and the preprint's Activity Log
records none.
The managers' "A new submission needs an editor to be assigned" email is,
by design, sent only when nobody was assigned. So on a server whose
section names Moderators, no email at all says that a preprint waits for
moderation. A server with no Moderators under "Editorial Assignments" is
not affected: nobody is assigned there and the managers get their email.
Basis: probe, 2026-10-01. <sup>[f-ops3](#fn-ops3)</sup>

<a id="ops4"></a>
**OPS4 — On a preprint server, "Notification sent to users." shows in a box in the Production stage instead of at the top right** · 🐞 · low.
On a preprint server, an editor who sends a participant a message with
"Notify" gets the confirmation "Notification sent to users." in a box
headed "Notification" at the top of the workflow's main column, above
"Production Tasks & Discussions". The editor expects it as a notice at
the top right of the page. A journal and a press show it there, and so
does the preprint server for "Assign" and "Edit".
The message is sent. The box sits in a place that is otherwise empty on
a preprint server, so it covers nothing, and it goes away with the
editor's next action on the page or when the page is loaded again.
Every "Notify" on a preprint server does this. The fix is one condition
in the component that draws the box.
Basis: test run, 2026-10-01. <sup>[f-ops4](#fn-ops4)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The panel is the Vue `lib/ui-library/src/managers/ParticipantManager/ParticipantManager.vue` (heading `editor.submission.stageParticipants` "Participants"; each row a `UserAvatar` with `displayInitials`, then the item-info components `ParticipantManagerItemInfoName`, `ParticipantManagerItemInfoRole` (`stageAssignmentUserGroup.name`) and, when `recommendOnly`, `ParticipantManagerItemInfoRecommendOnly` (`participantManager.onlyAllowedToRecommend` "Only allowed to recommend an editorial decision"); the row menu is `DropdownActions` with `button-variant="ellipsis"`, labelled "{fullName} More Actions" (`common.moreActions`)). Its list is `GET submissions/{id}/participants/{stageId}` (`PKPSubmissionController::getParticipants()`, route group gated to `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_ASSISTANT`), whose users come from `user/Collector::assignedTo($submissionId, $stageId)` joined through `user_group_stage`, and whose per-user `stageAssignments` come from `user/Repository::stageAssignmentsForUsers()`, which drops `ROLE_ID_REVIEWER` groups. `participantManagerStore.participantsList` makes one entry per stage assignment and sorts by `roleId`, then `userGroupId`. The panel is pushed by `getSecondaryItems` of every stage in `pages/workflow/composables/useWorkflowConfig/workflowConfigEditorialOJS.js` (Submission, External Review, Editing, Production), of Internal Review in `workflowConfigEditorialOMP.js`, and reaches OPS's Production through `useWorkflowConfigOPS`'s `deepMerge` of the OJS config; the author configs (`workflowConfigAuthor*.js`) push none. The submitter's own row is the Author-group stage assignment the wizard's submit creates. Live-probed 2026-09-22 (Purpose; Actors row 1; Rules 1, 2; all three apps): the panel in the right-hand column of every stage entry, stages not yet reached included, except a press's Internal Review before it is initiated, whose entry shows only "The Internal Review stage has not yet been initiated."; the rows, their three lines, the menu order "Edit", "Notify", "Login As", "Remove" and the row order as described; a Section editor assigned from Submission listed on every later stage, the same person assigned as Copyeditor listed on Copyediting alone, and "Remove" taking the Section editor row off every stage while the Copyeditor row stays.

<a id="fn-b"></a>
**b** — Offers: `ParticipantManager/useParticipantManagerConfig.js`. `getTopItems()` pushes "Assign" (`common.assign`) when `useCurrentUser::hasCurrentUserAtLeastOneAssignedRoleInStage(submission, stageId, [ROLE_ID_MANAGER, ROLE_ID_SITE_ADMIN, ROLE_ID_SUB_EDITOR])` holds, read from the stage's `currentUserAssignedRoles` (for an unassigned manager-level user the global-role fallback of `submission/maps/Schema::getPropertyStages()`). `getItemActions()` pushes "Edit" (`common.edit`) when that holds and `canCurrentUserEditParticipant()` does (a Manager or Site Admin role anywhere in the journal: every row; else an assigned `ROLE_ID_SUB_EDITOR`: not the own row, not a row whose `roleId` is `ROLE_ID_MANAGER` or `ROLE_ID_SITE_ADMIN`, and a current user with a `recommendOnly` assignment not on a `ROLE_ID_SUB_EDITOR` row), "Notify" (`submission.stageParticipants.notify`) always, "Login As" (`grid.action.logInAs`) when `participant.canLoginAs`, and "Remove" (`common.remove`, warnable) on the "Assign" condition alone. Server: `StageParticipantGridHandler::__construct()` gives `ROLE_ID_ASSISTANT` `fetchGrid`, `fetchCategory`, `fetchRow`, `viewNotify`, `fetchTemplateBody`, `sendNotification`, and `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUB_EDITOR` those plus `addParticipant`, `deleteParticipant`, `saveParticipant`, `fetchUserList`; `authorize()` adds `WorkflowStageAccessPolicy` for the posted `stageId`. The Production editor is a `ROLE_ID_MANAGER` group with stages Copyediting and Production (`registry/userGroups.xml`, OJS and OMP). The Author's view mounts no panel (note a), and the workflow screen is closed to Reviewer and Reader ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)). The code of this feature is identical in the three apps: `lib/pkp/controllers/grid/users/stageParticipant/`, `…/userSelect/`, the two templates folders, `classes/security/Validation.php` and `lib/ui-library/src/managers/ParticipantManager/` diff clean between the checkouts (ojs 7c8d69af3e, omp c6a132892, ops 4bb66b1469; ui-library 977e460c), and no app subclasses or overrides any of them; the apps differ only in their registry files (roles, stage sets, templates) and locale strings, each noted where it matters. Live-probed 2026-09-22 (Actors; all three apps, one account per role level): the offers per row as tabled; an unassigned Production editor (journal, press) given "Assign" on every stage and "Edit" on every row; an assigned one refused Submission and Review (A8); the assistant roles offered "Notify" alone; the Author's view with no panel; Reviewer and Reader refused the workflow with "The current role does not have access to this operation.".

<a id="fn-c"></a>
**c** — `stage_assignments` (`classes/migration/install/RolesAndUserGroupsMigration.php`) holds `submission_id`, `user_group_id`, `user_id`, `date_assigned`, `recommend_only`, `can_change_metadata`, unique on (submission, group, user), and no stage column; `StageAssignment::scopeWithStageIds()` reaches a stage through the group's `userGroupStages`. `Repo::stageAssignment()->build()` is `firstOr()` on (submission, user, group). `StageParticipantGridHandler::deleteParticipant()` deletes the one row, so every stage loses it; the dialog says so (`editor.submission.removeStageParticipant.description` "You are about to remove this participant from <strong>all</strong> stages."). Live-probed 2026-09-22 (Rule 2; all three apps): the Rule 2 part of note a; a person once assigned in a role gone from that role's list of people in "Assign", by name and in the full list, and still offered under their other role.

<a id="fn-d"></a>
**d** — The window: `ParticipantManager/useParticipantManagerActions.js::participantAssign()` opens the legacy `StageParticipantGridHandler` op `addParticipant` in a side modal titled `editor.submission.addStageParticipant` "Assign Participant"; `form/AddParticipantForm::fetch()` renders `templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl`, which loads `UserSelectGridHandler` (title `editor.submission.findAndSelectUser` "Locate a User"). Its filter `templates/controllers/grid/users/userSelect/searchUserFilter.tpl` has the unlabelled select `filterUserGroupId` (options `Repo::userGroup()->getUserGroupsByStage()` without `ROLE_ID_REVIEWER`, the first preselected; the query orders by `role_id` alone (`UserGroup::scopeOrderByRoleId()`), so the groups of one role (`ROLE_ID_MANAGER` 16, `ROLE_ID_SUB_EDITOR` 17, `ROLE_ID_ASSISTANT` 4097, `ROLE_ID_AUTHOR` 65536) come in whatever order the database returns them, which a group's row being rewritten changes), the text box `manager.userSearch.searchByName` "Search User By Name" and the button `common.search` "Search". Columns: the radio `userSelectRadioButton.tpl`, `common.name` "Name", `common.assignments` "Assignments" (`UserSelectGridCellProvider::getCountUserAssignments()`: the context's `STATUS_QUEUED` submissions `assignedTo` the user), `user.affiliation` "Affiliation", `user.interests` "Reviewing interests"; `InfiniteScrollingFeature` with 20 items (on screen a "Load more" link, `a.pkp_linkaction_moreItems`). Rows: `user/Collector::filterExcludeSubmissionStage()`, users in the group whose group is in `user_group_stage` for the stage, whose membership is active (`date_start` passed, `date_end` not), and who have no `stage_assignments` row in that group on this submission. `js/controllers/grid/users/stageParticipant/form/AddParticipantFormHandler.js` copies the select into the form's `userGroupId` on change; the grid reloads only on the filter form's submit. The form's buttons are `{fbvFormButtons}` with their defaults `common.cancel` "Cancel" and `common.ok` "OK". The roles table is each app's `registry/userGroups.xml` `stages` attribute (OJS: Journal editor 1,3,4,5; Production editor 4,5; Section editor and Guest editor 1,3,4,5; Copyeditor 4; Designer, Indexer, Layout Editor, Proofreader 5; Funding coordinator 1,3; Marketing and sales coordinator 4; Author and Translator all; the manager group none. OMP adds stage 2 to Press editor, Series editor, Funding coordinator, Author, Volume editor, Translator; Chapter Author 4,5; no Guest editor. OPS: Preprint Server manager, Moderator, Author at 5), names from the app locale (`default.groups.name.*`). The closing prompt: `js/controllers/form/FormHandler.js::containerCloseHandler()` asks `confirm(form.dataHasChanged)` ("The data on this form has changed. Do you wish to continue without saving?") when it counts the form as changed, which "Assign Participant" always is and "Edit Assignment" is after a change; the footer's "Cancel" closes without it; `SiteHandler` binds `beforeunload`. Live-probed 2026-09-19 (Fields roles table, Copyediting and Production rows; Rules 3, 6; all three apps, while checking the Copyediting and Production stages): the role lists of those two rows exactly as tabled, with no Journal manager or Press manager and with Preprint Server manager on the preprint server; the list of people following a newly chosen role only after "Search"; "Cancel" after a person was chosen assigning nobody; leaving the window with an unsaved change raising the browser's leave prompt and saving nothing. Live-probed 2026-09-22 (Fields "Assign Participant"; the roles table; Rules 3, 6; all three apps): every stage's role list as tabled, the journal's Review stage listing Translator before Author; the asterisk note with no asterisk on any field; twenty rows with "20 of {total} items" and "Load more", scrolling loading nothing; "Assignments" counting open review requests as well as assignments and leaving out published submissions and declined requests; a role ended on the Users screen dropping the person from that role's list; "OK" after another role was chosen without "Search" assigning nobody (A4); "Cancel" never asking, the close control always asking, the browser's leave-page box on another address or a reload. Rule 3's "the role started" half was not driven: the Users screen sets no future start date. Code read 2026-09-26 (Fields roles table and role list; Rule 3; scenarios 1, 2): the order within a level is not fixed; an OJS run of 2026-09-24 on a reset database showed the journal's Copyediting list with "Marketing and sales coordinator" before "Copyeditor", the reverse of what the 2026-09-19 and 2026-09-22 probes saw, and the 2026-09-22 probe's "Translator" before "Author" on the Review stage is the same tie.

<a id="fn-e"></a>
**e** — The boxes: `js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js`. `updateRecommendOnly()` shows `.recommendOnlyWrapper` when `userIdSelected` changes and the chosen group is in `possibleRecommendOnlyUserGroupIds` (`AddParticipantForm::initialize()`: every `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` group) and ticks it when the group is in `recommendOnlyUserGroupIds` (groups with `recommendOnly`); `updateSubmissionMetadataEditPermitOption()` shows `.submissionEditMetadataPermit` unless the group is in `notChangeMetadataEditPermissionRoles` (the `ROLE_ID_MANAGER` groups) and ticks it when the group has `permitMetadataEdit`; a change of `userGroupId` hides both, and on screen only the recommend-only box comes back unticked (A9). `AddParticipantForm::execute()` forces `canChangeMetadata` true for a `ROLE_ID_MANAGER` group. Labels: `stageParticipants.options` "Assignment privileges", `stageParticipants.recommendOnly`, `stageParticipants.submissionEditMetadataOptions` "Permissions", `stageParticipants.canChangeMetadata`. Defaults (`registry/userGroups.xml`): `permitMetadataEdit` on the manager, editor, production-editor and section-editor groups of OJS and OMP and on the manager, section-editor and author groups of OPS; `recommendOnly` on none. What the permission allows: `submission/maps/Schema` and [→ the edit gate](U40-publication-metadata.md#edit-gate). Live-probed 2026-09-09 (Rule 4b; all three apps, for the publication-metadata spec): the "Permissions" box unticked by default for a Copyeditor and for the journal's and press's Author, ticked for the preprint server's Author; ticking it let the person save. Live-probed 2026-09-22 (Rule 4 at both ends; all three apps): the boxes hidden until a person is chosen, shown and pre-ticked per role at install and on a scratch journal with the Role Options changed; a manager-level assignment made with no box carrying the permission.

<a id="fn-f"></a>
**f** — The list: `form/PKPStageParticipantNotifyForm::fetch()`, only for a user with `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR` or `ROLE_ID_ASSISTANT` in the context, lists `editorialTask/Template::withContextId()->withStageId($stageId)->withType(EditorialTaskType::DISCUSSION)`, all of them for a user with a Site Admin or `ROLE_ID_MANAGER` role (Journal Manager, Editor, Production editor), else `withUserGroupsAccess(<the user's groups>)` (templates not restricted, or restricted to one of the user's groups); the select is `defaultValue="" defaultLabel=""`, hence the blank first entry. The query orders the list by nothing, and the order varies: a re-used test database listed "Request Copyedit" before "Discussion (Copyediting)" (2026-09-23), so the suites read the entries as a set. Choosing one posts to `StageParticipantGridHandler::fetchTemplateBody()`, which returns the template's `description` compiled for the submission, and `updateTemplate()` sets it into the editor. The templates are installed per context by `Repo::editorialTask()->installTaskTemplates()` (context creation and the test context factory) from each app's `registry/taskTemplates.xml`: OJS `DISCUSSION_NOTIFICATION_SUBMISSION`, `…_REVIEW`, `…_COPYEDITING`, `…_PRODUCTION`, `COPYEDIT_REQUEST`, `EDITOR_ASSIGN_SUBMISSION`, `EDITOR_ASSIGN_REVIEW`, `EDITOR_ASSIGN_PRODUCTION`, `LAYOUT_REQUEST`, `LAYOUT_COMPLETE`; OMP the same plus `INDEX_REQUEST`, `INDEX_COMPLETE`, and none with `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`; OPS `DISCUSSION_NOTIFICATION_PRODUCTION` and `EDITOR_ASSIGN_PRODUCTION` only. Names: `mailable.discussionSubmission.name` "Discussion (Submission)" and its Review, Copyediting, Production siblings, `mailable.editorAssignedManual.name` "Assign Editor", `mailable.copyeditRequest.name` "Request Copyedit", `mailable.layoutRequest.name` "Ready for Production", `mailable.layoutComplete.name` "Galleys Complete" (OJS and OMP app locale), `mailable.indexRequest.name` "Index Requested" and `mailable.indexComplete.name` "Index Completed" (OMP app locale); the discussion templates' text `emails.discussion.body` "Please enter your message.". Live-probed 2026-09-18 and 2026-09-19 (Rule 5's Copyediting and Production rows; all three apps): the lists as tabled, opening on a blank entry, and choosing one filling the message box. Live-probed 2026-09-22 (Rule 5 and its table, every stage of all three apps, as Journal Manager, assigned Section Editor and Copyeditor): the lists as tabled; choosing one replacing typed text, and the blank entry chosen again leaving it; the letters' "NAME" and "EDITOR" tags (the box holds `{$recipientName}`), the recipient's name in the email and the discussion; a template saved with "Enter task information" not offered; a template limited to Author listed for the Journal Manager, the Editor, the Production editor and a Section Editor who also holds Author, and not for one who does not.

<a id="fn-g"></a>
**g** — Sending: `PKPStageParticipantNotifyForm::execute()` acts only when `message` is set: `sendMessage()` returns at once when no template is posted (`!is_a($template, Template::class)`) or when `Repo::editorialTask()->isTemplateAccessibleToUser($template, $recipient)` is false; otherwise it creates the `EditorialTask` (`type` DISCUSSION, the stage, `title` the template's title, `createdBy` the recipient, A5), adds the recipient and, when different, the sender as `Participant`s, writes the head `Note` from the sender with the message, and raises `NOTIFICATION_TYPE_NEW_QUERY` at task level for the recipient; only when that notification is created (the recipient has not switched the type off) is the `TemplateVariables` mailable sent, from the signed-in user, subject the template's title, body the message, with `allowUnsubscribe()`. It then switches on the template key (`COPYEDIT_REQUEST`, `LAYOUT_REQUEST`, `INDEX_REQUEST` add their assignment tasks; `EDITOR_ASSIGN` is never a default key, A6), and re-reads the Copyediting and Production notice types while the submission sits in either stage. With no template posted, `sendMessage()` first looks up an empty template id, which fails on the test database (A3's footnote), so nothing else runs. After `sendMessage()` returns, `_logEventAndCreateNotification()` writes an event-log entry `SUBMISSION_LOG_MESSAGE_SENT` (`informationCenter.history.messageSent` "Notification sent to users.") and the trivial notice `stageParticipants.history.messageSent` "Notification sent to users.". Nothing on this path reads the recipient's "Do not send me an email…" choice (A16). `AddParticipantForm::isMessageRequired()` is false; the Notify form requires `message` and `userId`. Live-probed 2026-09-19 (Side effects; OJS and OMP, scratch journals, from the Production stage's "Assign"): the recipient's email from the assigning editor with the template's name as subject and the discussion footer; the Tasks rows "{editor} started a discussion: Ready for Production: …" and the layout task; a participant assigned with the message box empty receiving no email and no Tasks row. Live-probed 2026-09-22 (Rule 5b; Side effects "On a message sent"; all three apps): as note td7 and note td4; a predefined message chosen and its text then deleted assigning the person with no email and no Tasks row; the email's sender, subject, body and discussion footer as described; the discussion's window listing sender and recipient, its first entry "Message from {sender}".

<a id="fn-h"></a>
**h** — Edit: `useParticipantManagerActions.js::participantEdit()` opens op `addParticipant` with `assignmentId`, titled `editor.submission.editStageParticipant` "Edit Assignment". `addParticipantForm.tpl`'s `{if $assignmentId}` branch shows `stageParticipants.selectedUser` "Participant" as `<b>{name}</b> ({group})`, the recommend-only box under `{if $isChangeRecommendOnlyAllowed}`, the metadata box under `{if $isChangePermitMetadataAllowed}`, else `stageParticipants.noOptionsToHandle` "No changes can be made to this participant", and no message area (`{if !isset($assignmentId)}`). `AddParticipantForm::_isChangeRecommendOnlyAllowed()`: false for a `ROLE_ID_SUB_EDITOR` row that is the current user's own, false when the current user holds a `recommendOnly` assignment on the stage, else true only for `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR` groups; `_isChangePermitMetadataAllowed()`: false for the current user's own `ROLE_ID_SUB_EDITOR` row and for `ROLE_ID_MANAGER` groups. `execute()`'s edit branch writes only the allowed flags. `saveParticipant()` first checks `Validation::canEditParticipant()` (A1), and on success raises `notification.editStageParticipant` "The stage assignment has been changed.". Live-probed 2026-09-22 (Fields "Edit Assignment"; Rule 8; all three apps): the window as tabled; the boxes per row and viewer as Rule 8 says; "No changes can be made to this participant" under "Participant", with "Cancel" and "OK", for a recommending Editor on a manager-level row, their own included; "Cancel" closing without a question after a box was changed, the close control asking, nothing saved either way.

<a id="fn-i"></a>
**i** — Remove: `useParticipantManagerActions.js::participantRemove()` opens a dialog titled `editor.submission.removeStageParticipant` "Remove Participant", message `editor.submission.removeStageParticipant.description`, actions `common.ok` (warnable) and `common.cancel`, style negative; "OK" posts `deleteParticipant` and opens the network-error dialog when the answer is not a success. `StageParticipantGridHandler::deleteParticipant()` checks the CSRF token and that the assignment belongs to the submission, deletes it, calls `Repo::editorialTask()->removeParticipantFromSubmissionTasks()` (which returns early for a user holding `ROLE_ID_MANAGER` or `ROLE_ID_SITE_ADMIN` in the context, the Editor and Production editor roles included, and otherwise deletes the user's `Participant` rows on every task and discussion of the submission), re-reads the editor-assignment notices and, for the Copyediting and Production stages, the stage notice types, and logs `SUBMISSION_LOG_REMOVE_PARTICIPANT` (`submission.event.participantRemoved`). The dashboard's "Needs editor" view and "Assign Editor" button read the submission's `editorAssigned` ([→ the activity cell](U23-submissions-dashboard.md#activity)). Live-probed 2026-09-22 (Rule 10; Side effects "On Remove"; all three apps): the dialog as described; the row gone from every stage, the person's other row kept; the removed Section Editor taken off the discussion, a removed Editor and Preprint Server manager kept on theirs; no email, no notice, the log line; the notice box unchanged after the Copyeditor or Layout Editor who had been sent a request was removed; the submission back under "Needs editor" with "Assign Editor" after its only Section Editor was removed, on a journal and a press, a preprint server having no such view.

<a id="fn-j"></a>
**j** — Notify: `useParticipantManagerActions.js::participantNotify()` opens op `viewNotify` with the row's `userId`, titled `submission.stageParticipants.notify` "Notify"; `templates/controllers/grid/users/stageParticipant/form/notify.tpl`: section `stageParticipants.notify.startDiscussion` "Start Discussion" with `stageParticipants.notify.startDiscussion.description` "Begin a discussion between yourself and {$userFullName}.", `stageParticipants.notify.chooseMessage`, `stageParticipants.notify.message` "Message" (required), `common.requiredField`, and `{fbvFormButtons … hideCancel=true submitText="submission.stageParticipants.notify"}`. `StageParticipantGridHandler::sendNotification()` validates (message and user required; the server's refusal text is `stageParticipants.notify.warning` "Please ensure that you have filled out the message field and included someone other than yourself in the discussion.", shown as a warning notice at the top right of the page), runs `execute()` and answers success with the `stageStatusUpdated` event. Live-probed 2026-09-22 (Fields "Notify"; Rule 11; all three apps): note td11; "Notify" with a predefined message and a typed message closing the window with "Notification sent to users."; the close control closing the window at once with only a typed message in it, nothing asked and nothing sent. Live-probed 2026-09-29 (Rule 11c, 11d; all three apps, two runs each, as Journal Manager, Section editor (Series editor, Moderator) and, on a journal and a press, Copyeditor): the close control asking after a predefined message was chosen, typed over or not, or chosen and set back to the blank entry; "Cancel" keeping the window as filled, "OK" closing it; the window closing at once untouched or with only a typed message, also after the box lost focus; Escape, with the focus on the list after a predefined message was chosen, asking the same and its "OK" closing the window only; a reload after a predefined message was chosen and typed over raising the browser's leave-page box with no text of the app's own; no discussion added (read after a reload too), no email. Control: a message sent through the same window reaching the recipient and opening a discussion. Code: `lib/pkp/js/controllers/form/FormHandler.js` marks the form changed on a `change` event of its inputs (the list) and asks through `confirm(form.dataHasChanged)` in `containerCloseHandler()`; typing in the rich-text box raises no such event; `SiteHandler` binds `beforeunload`. Test runs 2026-09-22 (Rule 11; scenario 6; all three apps): "Notification sent to users." at the top right of the page after "Notify", on a preprint server once in the Production entry's "Notification" box instead; the walk of 2026-10-01 found the box after every "Notify" on a preprint server (note f-ops4).

<a id="fn-k"></a>
**k** — `StageParticipantGridHandler::saveParticipant()`, after `execute()`: for a `ROLE_ID_MANAGER` group it re-reads the per-stage editor-assignment notices; for every stage with a `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` assignment it deletes the submission's `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED` rows, every user's (the task `notification.type.editorAssignmentTask`: "A new article has been submitted to which an editor needs to be assigned.", "A new monograph…", on OPS "A new preprint has been submitted to which a moderator needs to be assigned."); it raises the trivial notice `notification.addedStageParticipant` "User added as a stage participant." for a new row, else `notification.editStageParticipant`; and it logs `SUBMISSION_LOG_ADD_PARTICIPANT` with `submission.event.participantAdded` "{$userFullName} ({$username}) was assigned to this submission as a {$userGroupName}." on both branches (A7), `userId` the signed-in user (the impersonator when impersonating), and the participant's name as the entry's `userFullName`, which `EventLogEntry::getUserFullName()` shows in the "User" column in preference to `userId` (A14; `deleteParticipant()` does the same). It answers `DAO::getDataChangedEvent()`, on which `components/Modal/AjaxModalWrapper.vue` triggers `notifyUser`, the page's fetch of pending notices. Live-probed 2026-09-22 (Side effects "On Assign", "On Edit"; Rules 6a, 8d; all three apps): note td1; the log line with the assigned person in its "User" column; the needs-an-editor task leaving the Tasks panel of every Journal Manager and every Editor on an editor assignment, and staying on a Funding coordinator's (a preprint server's: an Author's); the submission leaving "Needs editor" on a journal and a press.

<a id="fn-l"></a>
**l** — `classes/context/SubEditorsDAO.php::assignEditors()`, called on submit: builds an assignment for each sub-editor of the section and of the submission's categories who still holds the group (`Repo::stageAssignment()->build(…, $userGroup->recommendOnly)`, the metadata flag from the group's default), raises `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED` for each, then emails every stage assignment of the submission with `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` whose group works on `WORKFLOW_STAGE_ID_SUBMISSION` (so also an editor who submits in that role, whose assignment the wizard made); every OPS role works on Production only (`registry/userGroups.xml` `stages="5,6"`), so a preprint server emails nobody (OPS3); skipping a user whose `BLOCKED_EMAIL_NOTIFICATION_KEY` settings hold `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED` (the Notifications tab's "Do not send me an email…" box on "A new article, "Title," has been submitted.") and anyone already emailed. The mailable is `PKP\mail\mailables\EditorAssigned` (`mailable.editorAssigned.name` "Editor Assigned (Auto)"; OPS app locale "Moderator Assigned (Auto)"), template key `EDITOR_ASSIGN` (template name `mailable.editorAssign.name` "Editor Assigned"), from the context's `contactEmail` / `contactName`; subject `emails.editorAssign.subject` "You have been assigned as an editor on a submission to {$contextName}" (OJS, OMP app locale; OPS "…as a moderator on a submission to {$contextName}"); body `emails.editorAssign.body` per app (OJS "…please forward the submission to the review stage by selecting "Send to Review"…", OMP "…"Send to Internal Review"…", OPS "…Please post the preprint once you are satisfied…"); logged as `SubmissionEmailLogEventType::EDITOR_ASSIGN`. The automatic assignment fails off the install's first journal: *[Submission wizard](U21-submission-wizard.md#a8)* and *[Notifications center](U05-notifications-center-and-email-preferences.md#a11)*, where the email was never seen; it is seen in note td12. Live-probed 2026-09-22 (Rule 12): note td12.

<a id="fn-m"></a>
**m** — Roles: `controllers/grid/settings/roles/form/UserGroupForm.php` and `templates/controllers/grid/settings/roles/form/userGroupForm.tpl`: the stage boxes `grid.roles.stageAssignment` "Stage Assignment", and under `settings.roles.roleOptions` "Role Options" the boxes `settings.roles.recommendOnly` "This role is only allowed to recommend a review decision and will require an authorised editor to record a final decision." (kept only for `getRecommendOnlyRoles()`: `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`) and `settings.roles.permitMetadataEdit` "Permit submission metadata edit." (forced on for `NOT_CHANGE_METADATA_EDIT_PERMISSION_ROLES`). `execute()`: when `permitMetadataEdit` changes, every `StageAssignment` of the group in the context gets `canChangeMetadata` set to it; a change of `recommendOnly` touches no assignment. Live-probed 2026-09-19 (Settings bullet 1; all three apps, Settings › Users & Roles › Roles): the manager role's row with every stage box empty on OJS and OMP and ticked on OPS, and no "Edit" on it; every other role's stages set through its "Edit" form. Live-probed 2026-09-22 (Settings bullets 2, 3; all three apps): the recommend-only box on every role's form, tickable on the editor roles only and greyed out on the others, the manager row with no form; ticked on the Section Editor role, "Assign" starting with "Assignment privileges" ticked while two earlier assignments stayed as they were; "Permit submission metadata edit." unticked on that role unticking "Permissions" on its existing assignments on two submissions.

<a id="fn-n"></a>
**n** — `AddParticipantForm::fetch()`: while the submission's `stageId` is Internal or External Review it collects the reviewer ids of the submission's review assignments with `SUBMISSION_REVIEW_METHOD_ANONYMOUS` or `SUBMISSION_REVIEW_METHOD_DOUBLEANONYMOUS` that are not declined, and passes them with `editor.submission.addStageParticipant.form.reviewerWarning` and `common.ok`; `StageParticipantNotifyHandler.js::maybeTriggerReviewerWarning()` is to open a `ConfirmationModalHandler` with that text, an "OK" and no cancel button when the chosen user is among them, but it tests the chosen value, read from the form as text, with `indexOf` against a list of numbers, so it never matches (A11). Nothing refuses the assignment afterwards. Live-probed 2026-09-22 (Rule 7; journal and press): note f-a11.

<a id="fn-o"></a>
**o** — The legacy grid `PKP\controllers\grid\users\stageParticipant\StageParticipantGridHandler` still renders its own list (`fetchGrid`, `fetchRow`, `fetchCategory`, rows `StageParticipantGridRow`, the empty text `editor.submission.noneAssigned` "None Assigned", its own "Assign" and "Logout as" link actions) and answers `fetchUserList`, but no template, page or Vue component of the three checkouts loads those ops; the Vue panel calls only `addParticipant`, `saveParticipant`, `deleteParticipant`, `viewNotify`, `sendNotification` and `fetchTemplateBody` (`useParticipantManagerActions.js`, the form templates). The dashboard's "Assign Editor" is `pages/dashboard/dashboardPageStore.js::participantAssign()`, the same action with the submission's current `stageId`. The per-stage notices `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_SUBMISSION`, `…_EXTERNAL_REVIEW`, `…_EDITING`, `…_PRODUCTION` (and OMP's `…_INTERNAL_REVIEW`; texts `notification.type.editorAssignment` "An editor must be assigned before review is initiated. Please add editor using the Participants list." and its editing and production siblings) are still created and deleted by `EditorAssignmentNotificationManager::updateNotification()` for no user, but no screen fetches them (`WorkflowNotificationDisplay.vue` asks for the copyediting and production types only; `WorkflowHandler::getEditorAssignmentNotificationTypeByStageId()` has no caller). Code-verified 2026-09-22; recorded as dead-surface candidates in the campaign's unassigned list.

<a id="fn-p"></a>
**p** — `submission/maps/Schema::getPropertyStages()`: for each of the current user's assignments in a `ROLE_ID_MANAGER` or `ROLE_ID_SUB_EDITOR` group it sets `isCurrentUserDecidingEditor` when the assignment is not `recommendOnly` and `currentUserCanRecommendOnly` on the group's stages when it is, whatever the group's role, so an Editor's (`ROLE_ID_MANAGER`) recommend-only assignment counts too; the global-role fallback that makes an unassigned manager a deciding editor applies only to a user with no assignment at all. Which decisions a recommending editor gets per stage: `checkDecisionPermissions()` and `decision/Repository::getDecisionTypesMadeByRecommendingUsers()`, described by the stage and decision specs. Live-probed 2026-09-22 (Rule 9): note td9.

<a id="fn-q"></a>
**q** — Live-probed 2026-09-22 (Purpose, the scope paragraph; all three apps): the three windows and the "Remove Participant" dialog as the sections below describe; "Login As" in the row menu of Journal Manager, Site Administrator, Editor and Production editor viewers, on other people's rows only, asking "Log in as this user? All actions you perform will be attributed to this user."; while impersonating, the panel's first item "Logout as {the user's full name}", which returns to the same submission. The linked passages exist.

<a id="fn-r"></a>
**r** — Live-probed 2026-09-22 (Purpose; journal and press): the dashboard's "Needs editor" view listing a submission with no editor; its row's "Assign Editor" opening "Assign Participant" with the Submission stage's roles, search and predefined messages, as the panel's "Assign" does; assigning a Section Editor there taking the submission out of the view. A preprint server's dashboard has no "Needs editor" view. The button is `pages/dashboard/dashboardPageStore.js::participantAssign()` (note o).

<a id="fn-s"></a>
**s** — Where each scenario runs: scenario 3 on the seeded journal/press/server `publicknowledge` with roster accounts (passwords the username doubled); scenarios 1, 2 and 4–9 on a scratch context from `POST scenarios/context` whose `users[]` are throwaway accounts (password the username twice, address `<username>@mail.test`), every mailbox read in the mail catcher scoped by that address. Scratch submissions come from `POST scenarios/submission` with a throwaway `author` as submitter (`author.alex` in scenario 3). `participants[]` of `{username, role, recommendOnly?, canChangeMetadata?}` writes the row "Assign" writes, without its email or log line, each box defaulting to the role's option; a user seeded there is not offered by that submission's "Assign", so a person a scenario assigns on screen is seeded in the context only. The automatic assignment happens only on the install's first journal, so a scratch submission has no editor unless seeded. Recipes: 1 — `editor`, `manager`, two `sectionEditor`s and the author; a submitted seed with no participants, which carries the needs-an-editor task and the "Needs editor" state the wizard's submit leaves. 2 — a `sectionEditor` seeded as participant on a seed at Copyediting (`sendExternalReview`, `accept`) and twenty-one `copyeditor` users. 3 — a submitted seed on `publicknowledge` (on the press in the `monographs` series), which arrives with its section's editors assigned automatically: `sectioneditor.ana` is edited, `sectioneditor.omar` (`sectioneditor.ravi` on the server) is the control, `manager.maya` signs in. 4 — participants: a `sectionEditor`, a second `sectionEditor` and an `editor` (`manager` on the server) with `recommendOnly: true`, the author; a `productionEditor` in the context only (journal, press). 5 — one user with the roles `sectionEditor` and `copyeditor` (the first alone on the server), seeded as participant in both; the discussion is opened before the scenario through that row's "Notify" with "Discussion (Submission)" ("Discussion (Production)"). 6 — two `sectionEditor` participants; the second signs in and unticks the box on Profile › Notifications before the scenario (no seed key sets it). 7 — two submitted seeds, each with a `sectionEditor` participant, a third `sectionEditor` and an `editor` (a second `manager` on the server) in the context; the Role Options are changed on screen, since the context key `roles` saves them before any assignment exists. 8 — a `submitted: false` draft with the participants of the given (the person holding both roles seeded twice, once per role), the opt-out ticked on Profile › Notifications by that Section Editor before the submit, and the second `editor` holding `author` too; the wizard's submit needs a file with a genre (seed-facts). 9 — two `manager`s, a `sectionEditor` (Moderator) and two `author`s on a scratch server; a submitted seed with no participants. Live-probed 2026-09-22 (all three apps): seeded `participants[]` rows listed on the panel and missing from that submission's "Assign" list; a seeded `recommendOnly` row reading "Only allowed to recommend an editorial decision".

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-22 (Rules 6a, 8d; all three apps, as Journal Manager on a scratch submission): "User added as a stage participant." after "Assign" and "The stage assignment has been changed." after "Edit", each a notice at the top right of the page about half a second after "OK", with no further action; the panel listing the new row, and the edited row's new third line, at once. Code: note k.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-22 (Rule 6c; all three apps): "Cancel" closing "Assign Participant" with no question, before and after a person was chosen and a message typed; the close control asking "The data on this form has changed. Do you wish to continue without saving?" every time, untouched included, its "Cancel" keeping the window with the choice made and its "OK" closing it; another address or a reload with the window open raising the browser's leave-page box, untouched included; nobody assigned after any of them. Code: note d.

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-22 (Actors row "Edit"; Rule 8e; all three apps, a journal's Guest Editor too): an assigned Section Editor (Moderator) ticking "Permissions" on the Author's row, or unticking it on another Section Editor's row, and pressing "OK": the window showing its form again with the box as before, no notice, and "Edit" reopened showing the old state; the Journal Manager's and the Production editor's same steps saving. The Section Editor's own row and an Editor's row offering "Notify" and "Remove" only. Code: note b and A1's footnote.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-22 (Rules 5b, 11; A3; all three apps, two scratch journals each): "Assign" with the list left blank and a message typed: the window open as filled, no notice, the person assigned (the row there after reopening), no Activity Log line, no email; "Notify" the same way: the window open as filled, nothing sent, no discussion. Control: "Discussion (Submission)" ("Discussion (Production)" on a preprint server) chosen sends the email and opens the discussion. Code: note g and A3's footnote.

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-22 (Rule 6b; A4; all three apps): "OK" with nobody chosen, and "OK" with a person chosen under the previous role after another role was chosen without "Search": the form shown again on the first role, no message, no field error, no notice, a second "OK" the same, nobody new on the panel. Code: A4's footnote.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-22 (Side effects, the tasks bullet; A6; all three apps): "Assign Editor" from the Submission, Review and Production stages giving the new editor only "{editor} started a discussion: Assign Editor: …"; "Request Copyedit" giving the Copyeditor "You have been asked to review copyedits for "{title}".", "Ready for Production" "You have been asked to review layouts for "{title}".", "Index Requested" on a press "You have been asked to create an index for "{title}"."; "Galleys Complete" giving no task. Code: A6's footnote.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-22 (Side effects, the Notifications-tab and log bullets; A16; all three apps): the log lines "Notification sent to users." under the sender and "An email has been sent: {subject}" with "View Email"; none for a message typed with the list left blank; a recipient with "Enable these types of notifications." unticked on "Discussion added." getting neither email nor Tasks row while the discussion opened and the log carried "Notification sent to users." alone; a recipient with "Do not send me an email…" ticked getting the email and the Tasks row. Code: note g.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-22 (Side effects "On Edit"; A7; all three apps): no email to the edited person; each "Edit" › "OK" adding "{name} ({username}) was assigned to this submission as a Section editor." ("Series editor", "Moderator") to the Activity Log, two edits two lines. Code: note k.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-22 (Rule 9; journal and press): an Editor assigned with "Assignment privileges" ticked, with a deciding Section Editor also assigned, offered "Recommend Revisions", "Recommend Accept" and "Recommend Decline" on the review round, and no action button at all once no deciding editor was assigned; an unassigned Editor on the same round offered "Request Revisions", "Accept Submission", "Create New Review Round", "Cancel Review Round" and "Decline Submission". On a preprint server a recommend-only Preprint Server manager is offered "Post the preprint" without "Decline Submission". Code: note p.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-22 (Actors row "Remove"; Rule 10; A2; all three apps): an assigned Section Editor's "Remove" › "OK" on an Editor's (a Preprint Server manager's) row removing it; on their own row removing it, with the "Error" window "The current role does not have access to this operation." at once and on every later opening of the submission; a recommending Section Editor offered "Remove" on the deciding Section Editor's row and on the manager-level rows, and left with no action button on the round after removing the deciding one. Code: A2's footnote.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-22 (Fields "Notify"; all three apps): "Notify" with "Message" empty keeping the window open, the warning "Please ensure that you have filled out the message field and included someone other than yourself in the discussion." at the top right of the page, nothing under the box, no discussion added. Code: note j.

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-22 (Rule 12; all three apps, on scratch journals, presses and servers): editors seeded on an unsubmitted draft and the draft submitted by its author through the wizard; each Journal editor and Section editor got exactly one "You have been assigned as an editor on a submission to {journal name}", a person holding both roles one, from the journal's contact, its link opening the submission's Submission stage; the Production editor, the Funding coordinator, the Author and the Journal Manager got none; a Section editor who had ticked "Do not send me an email…" on "A new article, "Title," has been submitted." got none; an editor submitting as "Journal editor" ("Press editor") got one about their own submission; the Notifications-tab rows read as Settings quotes them. A press the same. A preprint server, on two servers, sent it to nobody, the manager who submitted as "Preprint Server manager" included. A submission seeded on the install's first journal listed its section's editors on the panel with the emails logged (none logged on a preprint server). The automatic assignment itself happens only on that journal ([→ the wizard's finding](U21-submission-wizard.md#a8)). Code: note l.

<a id="fn-a1"></a>
**f-a1** — Live-probed 2026-09-22 (all three apps, a journal's Guest Editor too): note td3. `Validation::canEditParticipant()` (added by pkp/pkp-lib#12497, lib/pkp `7ce4f2e80`, 2026-04-02) lets a Manager or Site Admin through, and for anyone else looks up the current user's assignments with `StageAssignment::withStageIds([$stageAssignment->stageId])`. A `StageAssignment` has no `stageId` (the table has no stage column, note c), so the lookup runs with a null stage, finds nothing and returns false for every Section Editor and Guest Editor; `StageParticipantGridHandler::saveParticipant()` then answers `new JSONMessage(true, $form->fetch($request))`, which redraws the form in the window without saving. The panel's own test (`useCurrentUser::canCurrentUserEditParticipant()`) offers the button on those rows. A new assignment through "Assign" is not affected (the check runs only with an `assignmentId`).
Issue report: [pkp-e2e#311](https://github.com/jardakotesovec/pkp-e2e/issues/311) ([docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md](../issues/U35-A1-section-editor-edit-assignment-saves-nothing.md)).

<a id="fn-a2"></a>
**f-a2** — Live-probed 2026-09-22 (all three apps): note td10. `useParticipantManagerConfig.js::getItemActions()` pushes "Remove" on the "Assign" condition alone, while "Edit" also needs `canCurrentUserEditParticipant()` (note b); `StageParticipantGridHandler::deleteParticipant()` checks only the CSRF token and that the assignment belongs to the submission, with no counterpart of `Validation::canEditParticipant()`. What a recommending editor sees with no deciding editor assigned is *[Review stage & rounds](U26-review-stage-and-rounds.md#recommendations)*'.

<a id="fn-a3"></a>
**f-a3** — Live-probed 2026-09-22 (all three apps, two scratch journals each; a press's Internal Review too): note td4. With the list blank, `PKPStageParticipantNotifyForm::sendMessage()` runs `Template::withContextId()->find('')`, which the Postgres test database refuses ("invalid input syntax for type bigint"), so both requests answer a server error; on "Assign" the person is assigned all the same, and neither the log line nor a notice follows. Introduced with pkp/pkp-lib#12593 (lib/pkp `b3b882bec`, 2026-06-01). A MySQL install may read the empty id as no template and return early, and would then show "Notification sent to users." with nothing sent (not driven). The list's own wording (`stageParticipants.notify.chooseMessage` "Choose a predefined message to use, or fill out the form below.") presents the message box as an alternative to the list. Live-probed 2026-09-29 (Fields "Notify"; all three apps, two runs each, as Journal Manager): a predefined message chosen in "Notify" and the list set back to its blank entry, the text kept and nothing shown, while the request it posts (`StageParticipantGridHandler::fetchTemplateBody()` with an empty `template`) answered a server error with an empty body, the only one of each run. The handler runs `Template::with('userGroups')->withContextId()->find('')`, the same empty-id lookup as `sendMessage()`. The "Assign" window's list posts the same request (not driven).
Issue report: [pkp-e2e#307](https://github.com/jardakotesovec/pkp-e2e/issues/307) ([docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md](../issues/U35-A3-OMP1-typed-participant-message-not-sent.md)).

<a id="fn-a4"></a>
**f-a4** — Live-probed 2026-09-22 (all three apps): note td5. `AddParticipantForm::validate()` returns `Repo::userGroup()->userInGroup($userId, $userGroupId) && Repo::userGroup()->get($userGroupId) && parent::validate()`: with no user, or with a user who does not hold the newly chosen role, the first test is false and `parent::validate()`, which would record the `userId` check's message, never runs; `saveParticipant()` answers the redrawn form with no error.
Issue report: [pkp-e2e#348](https://github.com/jardakotesovec/pkp-e2e/issues/348) ([docs/issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md](../issues/U35-A4-assign-participant-ok-assigns-nobody-no-reason.md)).

<a id="fn-a5"></a>
**f-a5** — `PKPStageParticipantNotifyForm::sendMessage()` creates the discussion with `'createdBy' => $user->getId()`, `$user` being the recipient, while the head note's `userId` and the task's sender are the signed-in user. Live-probed 2026-09-18 (Copyediting stage, OJS and OMP): the "Request Copyedit" discussion listed as "Discussion Request Copyedit Created by: {Copyeditor}"; live-probed 2026-09-19 (all three apps, the "Notify" window): the discussion reading "Created by: {the recipient}". Live-probed 2026-09-22 (all three apps, from "Assign" and "Notify"): the panel row "Discussion {name} Created by: {the recipient's username}", the discussion's first entry "Message from {the sender's username}", the recipient's task naming the sender.
Issue report: [pkp-e2e#343](https://github.com/jardakotesovec/pkp-e2e/issues/343) ([docs/issues/U35-A5-message-discussion-created-by-recipient.md](../issues/U35-A5-message-discussion-created-by-recipient.md)).

<a id="fn-a6"></a>
**f-a6** — Live-probed 2026-09-22 (all three apps): note td6. `sendMessage()`'s `switch ($templateKey)` raises `NOTIFICATION_TYPE_EDITOR_ASSIGN` (`notification.type.editorAssign` "You have been assigned as an editor to the submission "{$title}".") only for the key `EDITOR_ASSIGN`; the installed "Assign Editor" templates carry `EDITOR_ASSIGN_SUBMISSION`, `EDITOR_ASSIGN_REVIEW` and `EDITOR_ASSIGN_PRODUCTION` (`registry/taskTemplates.xml`, keys made mandatory by pkp/pkp-lib#12593, ojs `4157f8331c`, 2026-08-07), so they fall to the default branch, which only logs. No other code raises that task.
Issue report: [pkp-e2e#351](https://github.com/jardakotesovec/pkp-e2e/issues/351) ([docs/issues/U35-A6-assign-editor-message-gives-no-task.md](../issues/U35-A6-assign-editor-message-gives-no-task.md)).

<a id="fn-a7"></a>
**f-a7** — Live-probed 2026-09-22 (all three apps): note td8. Note k: `saveParticipant()` logs `SUBMISSION_LOG_ADD_PARTICIPANT` with `submission.event.participantAdded` on the edit branch as well, where only the trivial notice distinguishes the two.
Issue report: [pkp-e2e#350](https://github.com/jardakotesovec/pkp-e2e/issues/350) ([docs/issues/U35-A7-edit-assignment-logged-as-assignment.md](../issues/U35-A7-edit-assignment-logged-as-assignment.md)).

<a id="fn-a8"></a>
**f-a8** — Live-probed 2026-09-22 (journal and press): an unassigned Production editor opening every stage of a submission with "Assign" and every row's "Edit"; the same role assigned to a submission opening Copyediting and Production, and the Submission and Review entries (a press's Internal Review too) showing "You don't currently have access to that stage of the workflow.". Code, not traced further: an assigned user's stages come from their assignments' roles, and the fallback that gives a manager-level user every stage applies only to a user with no assignment on the submission (`submission/maps/Schema::getPropertyStages()`, note p).

<a id="fn-a9"></a>
**f-a9** — Live-probed 2026-09-22 (all three apps; on a preprint server with the Author's default switched off): a Section Editor (Moderator) chosen with "Permissions" ticked, the role switched to Funding coordinator (Author), whose default is off, and a person chosen: the box shown ticked; "OK"; that row's "Edit" showing it ticked. After the switch the box is hidden but still ticked. Code: note e.
Issue report: [pkp-e2e#339](https://github.com/jardakotesovec/pkp-e2e/issues/339) ([docs/issues/U35-A9-permissions-tick-carries-to-other-role.md](../issues/U35-A9-permissions-tick-carries-to-other-role.md)).

<a id="fn-a10"></a>
**f-a10** — Live-probed 2026-09-22 (all three apps): templates added under a stage's "Add template", unrestricted, limited to Author and limited to an editor role, each listed; choosing one leaving "Message" unchanged; "Notify" to a person who holds the role, to one who does not and to the Author each staying open with no notice, no email; the unrestricted one adding its discussion with no message to the panel; "OK" on "Assign" staying open with the person assigned. Both the choice's request and the send answer a server error. For a role-limited template the cause is traced: `editorialTask/Repository::isTemplateAccessibleToUser()` filters on an unqualified `user_group_id`, which the Postgres test database refuses as ambiguous; the unrestricted template's failure was seen, not traced. Control: "Discussion (Submission)" on the same screen sends.
Issue report (a template added in Settings): [pkp-e2e#315](https://github.com/jardakotesovec/pkp-e2e/issues/315) ([docs/issues/U35-A10-added-message-template-not-sent.md](../issues/U35-A10-added-message-template-not-sent.md)).
Issue report (a template limited to specific roles): [pkp-e2e#317](https://github.com/jardakotesovec/pkp-e2e/issues/317) ([docs/issues/U35-A10-role-limited-message-template-not-sent.md](../issues/U35-A10-role-limited-message-template-not-sent.md)).

<a id="fn-a11"></a>
**f-a11** — Live-probed 2026-09-22 (journal and press): a reviewer on round 1 with "Anonymous Reviewer/Anonymous Author", found under their Funding coordinator and Translator roles and chosen on the Submission stage and on the review stage, and a reviewer with "Anonymous Reviewer/Disclosed Author" on a scratch journal set to that type, and a press's Internal Review: no warning, and "OK" assigning them with "User added as a stage participant.". The window's data listed the right reviewers (not declined, anonymous types only, "Open" left out). Controls with no warning expected: a declined reviewer, a person with no review, Copyediting, and an "Open" review. Cause: note n. The warning dates from 2018; when the check broke was not traced.
Issue report: [pkp-e2e#338](https://github.com/jardakotesovec/pkp-e2e/issues/338) ([docs/issues/U35-A11-anonymous-reviewer-assign-no-warning.md](../issues/U35-A11-anonymous-reviewer-assign-no-warning.md)).

<a id="fn-a12"></a>
**f-a12** — Live-probed 2026-09-22 (all three apps): a recommending Editor opening "Edit" on an Editor's, a Production editor's or (preprint server) a Preprint Server manager's row, their own included, and pressing "OK": the window closing with "The stage assignment has been changed.". Code: note h; the save runs the edit branch of note k.
Issue report: [pkp-e2e#345](https://github.com/jardakotesovec/pkp-e2e/issues/345) ([docs/issues/U35-A12-no-changes-window-ok-reports-change.md](../issues/U35-A12-no-changes-window-ok-reports-change.md)).

<a id="fn-a13"></a>
**f-a13** — `SubEditorsDAO::assignEditors()` builds each automatic assignment with `Repo::stageAssignment()->build(…, $userGroup->recommendOnly)` and the metadata flag from the group's default (note l). An automatic assignment happens only on the install's first journal (*[Submission wizard](U21-submission-wizard.md#a8)*), the seeded journal, whose roles keep their install options, so the case was not reached; a role's recommend-only change leaves earlier assignments alone (note m).

<a id="fn-a14"></a>
**f-a14** — Live-probed 2026-09-22 (all three apps): the "User" column of "… was assigned …" lines naming the assigned person when a Journal Manager or a Section Editor assigned them, of the lines "Edit" writes naming the edited person, and of "… was removed …" lines naming the removed person; "Notification sent to users." lines naming the sender. Cause: note k.
Issue report: [pkp-e2e#349](https://github.com/jardakotesovec/pkp-e2e/issues/349) ([docs/issues/U35-A14-activity-log-names-participant-not-editor.md](../issues/U35-A14-activity-log-names-participant-not-editor.md)).

<a id="fn-a15"></a>
**f-a15** — Live-probed 2026-09-22 (journal and press): the Submission stage's "Assign Editor" email ending "— This is an automated message from {journal name}." and then the discussion footer; the Review and Production letters, and the other messages, with the footer alone. The first closing is part of the template's own text, which the discussion email then adds its footer to (note g).
Issue report: [pkp-e2e#344](https://github.com/jardakotesovec/pkp-e2e/issues/344) ([docs/issues/U35-A15-assign-editor-email-two-footers.md](../issues/U35-A15-assign-editor-email-two-footers.md)).

<a id="fn-a16"></a>
**f-a16** — Live-probed 2026-09-22 (all three apps): note td7. The email is sent whenever the discussion's task-level notification is created, which follows "Enable these types of notifications." only (note g).
Issue report: [pkp-e2e#336](https://github.com/jardakotesovec/pkp-e2e/issues/336) ([docs/issues/U35-A16-notify-message-ignores-email-opt-out.md](../issues/U35-A16-notify-message-ignores-email-opt-out.md)).

<a id="fn-a17"></a>
**f-a17** — Not driven. The 2026-09-29 probe (note j, A3's footnote) chose a predefined message in "Notify", set the list back to its blank entry and read the window (the list's value empty, "Message" as filled; `.reports/U35/ccI29/r2-cases-<app>.json`, `mgr-tplBack`), then only closed it; "Notify" was pressed only in the control with a predefined message chosen. The lean, from the code and not seen: the list then holds an empty value as when untouched, and `fetchTemplateBody()` (note f) only returns the text for the editor, so the form would post no template and `sendMessage()` take A3's path (note g). One press of "Notify" in that state, then the stage's discussions panel and the recipient's mailbox read, settles it. Rule 11b's untouched-list sentence rests on note td4.

<a id="fn-ojs1"></a>
**f-ojs1** — OJS `locale/en/emails.po` `emails.editorAssign.body`: "…please forward the submission to the review stage by selecting \"Send to Review\" and then assign reviewers by clicking \"Add Reviewer\"."; the decision's label is lib/pkp `editor.submission.decision.sendExternalReview` "Send for Review" (no OJS override). OMP's app body names "Send to Internal Review", OMP's `editor.submission.decision.sendInternalReview` label. Live-probed 2026-09-22 (journal and press): the received email and Settings › Workflow › Emails › "Editor Assigned (Auto)" say "Send to Review"; the Submission stage's button reads "Send for Review" for the Editor and the Section Editor; the press's email and button both read "Send to Internal Review".
Issue report: [pkp-e2e#346](https://github.com/jardakotesovec/pkp-e2e/issues/346) ([docs/issues/U35-OJS1-assigned-email-names-send-to-review.md](../issues/U35-OJS1-assigned-email-names-send-to-review.md)).

<a id="fn-omp1"></a>
**f-omp1** — Live-probed 2026-09-22 (press): "Assign" (as Press Manager and as Series editor) and "Notify" on Internal Review offering only the blank entry; "Notify" with "Hello" typed staying open as filled, nothing received, no discussion; "OK" on "Assign" with a typed message staying open while the person was assigned; neither logged. Control: External Review lists "Discussion (Review)" and "Assign Editor". Code: OMP `registry/taskTemplates.xml` has no template with `stageId="WORKFLOW_STAGE_ID_INTERNAL_REVIEW"` and OMP's locale no Internal Review discussion name; `PKPStageParticipantNotifyForm::fetch()` filters by the stage (note f), and `sendMessage()` needs a template (A3's footnote).
Issue report: [pkp-e2e#308](https://github.com/jardakotesovec/pkp-e2e/issues/308) ([docs/issues/U35-OMP1-internal-review-no-predefined-message.md](../issues/U35-OMP1-internal-review-no-predefined-message.md)).
Issue report (a typed message not sent, this stage included): [pkp-e2e#307](https://github.com/jardakotesovec/pkp-e2e/issues/307) ([docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md](../issues/U35-A3-OMP1-typed-participant-message-not-sent.md)).

<a id="fn-ops1"></a>
**f-ops1** — OPS `registry/userGroups.xml` gives the manager group `stages="5,6"`, OJS and OMP none. Live-probed 2026-09-19 (all three apps, the Production stage's "Assign"): the preprint server's role list "Preprint Server manager, Moderator, Author", the journal's and press's without their manager role; seen before on 2026-09-04 (OPS, the notifications probes). Live-probed 2026-09-19 (the Roles screen): the manager row's stage boxes ticked on OPS only (note m). Live-probed 2026-09-22 (all three apps, every stage's "Assign" and the Roles screen): as on 2026-09-19.

<a id="fn-ops2"></a>
**f-ops2** — Live-probed 2026-09-22 (preprint server): "Assign Editor" chosen in a fresh window leaving "Message" empty, after typed text keeping the text, after "Discussion (Production)" keeping "Please enter your message."; left empty, "OK" assigning with only "User added as a stage participant." and nothing sent; with text typed, the email "Assign Editor" sent with it, the discussion and the Tasks row there, no editor task. Control: a journal and a press fill the letter. The choice's request answers a server error. Code: OPS `registry/taskTemplates.xml` gives `EDITOR_ASSIGN_PRODUCTION` the description key `emails.editorAssignProduction.body`, which neither OPS's `locale/en` nor lib/pkp's defines (OJS and OMP define it in their app locale).
Issue report: [pkp-e2e#337](https://github.com/jardakotesovec/pkp-e2e/issues/337) ([docs/issues/U35-OPS2-preprint-assign-editor-message-not-filled.md](../issues/U35-OPS2-preprint-assign-editor-message-not-filled.md)).

<a id="fn-ops3"></a>
**f-ops3** — Live-probed 2026-09-22 (two preprint servers): editors seeded on a draft (two Preprint Server managers, three Moderators, one holding both roles, one who ticked the opt-out) and the draft submitted by its author: nobody got "You have been assigned as a moderator…", only "A new submission needs an editor to be assigned: …"; a manager who submitted as "Preprint Server manager" got the same; a submission seeded on the install's first server, with its Moderators assigned automatically, logged no such email. "Moderator Assigned (Auto)" is listed and opens in "Edit Template". Cause: note l; the template itself asks the moderator to post the preprint.
Issue report: [pkp-e2e#314](https://github.com/jardakotesovec/pkp-e2e/issues/314) ([docs/issues/U35-OPS3-moderator-assigned-email-never-sent.md](../issues/U35-OPS3-moderator-assigned-email-never-sent.md)).

<a id="fn-ops4"></a>
**f-ops4** — Live-probed 2026-10-01 (Rules 6a, 8d, 11a; scenario 6; preprint server on `main` and `stable-3_5_0`, PKP's default dataset, as `dbarnes`, kept walk `shared/playwright/checks/issues/participant-notice-lands-in-stage-box/walk.js`): on submission 1's Production stage, "Assign" (a Moderator) and "Edit" (the recommend-only box ticked, then unticked) each showed their notice at the top right; every "Notify" press (three in a row, and one more after a later "Edit") showed nothing at the top right and one box headed "Notification" reading "Notification sent to users." at the top of the main column, above "Production Tasks & Discussions", the boxes never piling up; the box went away at the next "Edit" "OK" and on a reload. Control: a journal (submission 5) and a press (submission 4) showed every notice at the top right, their Production box keeping its own text. The test runs of 2026-09-22 had seen the box once, after scenario 6's "Notify", and the top right in the next full run. Cause: the stage's `pages/workflow/components/primary/WorkflowNotificationDisplay.vue` refetches on every data change (`useDataChanged(() => fetch())`, added in d61faa2b2e, 2024-12-16) without the `if (requestBody)` guard its mount-time watch has; for OPS `getRequestOptionsPerStage()` returns null, so it posts `notification/fetchNotification` with no `requestOptions`, and `NotificationHandler::fetchNotification()` then returns the user's trivial notices and deletes them. The page's own fetch on `notifyUser` (note k) races it. "Assign" and "Edit" answer with a data-changed event, on which `AjaxModalWrapper.vue` triggers `notifyUser` before the window closes, so the page's fetch wins; "Notify" (`StageParticipantGridHandler::sendNotification()`) answers `stageStatusUpdated`, and `AjaxFormHandler` triggers `formSubmitted` (the window closes and the data-change callbacks run) before `notifyUser`, so the component's fetch wins. A journal's or press's component posts options filtered by the context, which a trivial notice (stored with no context) never matches. 3.4 read in the code only: its Production tab's in-place notification posts options, so no box. Proposed fix: guard the data-change callback with `if (requestBody.value)`; tried on `main` (three apps) and `stable-3_5_0` (OPS): every notice at the top right, the journal's and press's box unchanged.
Issue report: [pkp-e2e#347](https://github.com/jardakotesovec/pkp-e2e/issues/347) ([docs/issues/U35-OPS4-participant-notice-lands-in-stage-box.md](../issues/U35-OPS4-participant-notice-lands-in-stage-box.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Participants panel | workflow → any stage → right-hand column, "Participants" | VUE-043, GRID-054 |
| "Assign" | the panel's heading | AFFW-466 |
| "Assign Participant" / "Edit Assignment" window, "Cancel" / "OK" | "Assign"; row menu "Edit" | AFFW-671 |
| "Locate a User": role list, name box, "Search", list of people | "Assign Participant" window | AFFW-672, AFFW-679, AFFW-680, GRID-055 |
| "Assignment privileges" box | "Assign Participant"; "Edit Assignment" | AFFW-673 |
| "Permissions" box | "Assign Participant"; "Edit Assignment" | AFFW-674 |
| "No changes can be made to this participant" | "Edit Assignment" | AFFW-675 |
| Predefined message and "Message" | "Assign Participant" | AFFW-676 |
| "Edit" | row menu | AFFW-468 |
| "Notify" and its window ("Notify" button, predefined message, "Message") | row menu | AFFW-469, AFFW-677, AFFW-678 |
| "Remove" and the "Remove Participant" dialog | row menu | AFFW-471, AFFW-472 |
| "Login As" / "Logout as {name}" | row menu; top of the panel — owned by *Login & sessions* | AFFW-470, AFFW-467 |
| "Editor Assigned (Auto)" email | sent on submission to automatically assigned editors | MAIL-024 |
| The "needs an editor" task, cleared by an editor assignment | header Tasks panel | NOTIF-039 |
| The assignee's "You have been assigned as an editor…" task | never raised (A6) | NOTIF-046 |
| Per-stage "An editor must be assigned…" notices | written, shown on no screen (note o) | NOTIF-014, NOTIF-016, NOTIF-017, NOTIF-018 |
| Dashboard "Assign Editor" | editorial dashboard, activity cell — owned by *Submissions dashboard* | — |

## Reference — code anchors

- UI library: `lib/ui-library/src/managers/ParticipantManager/` (`ParticipantManager.vue`, `participantManagerStore.js`, `useParticipantManagerConfig.js`, `useParticipantManagerActions.js`, `ParticipantManagerItemInfo*.vue`, `ParticipantManagerActionButton.vue`) · `src/composables/useCurrentUser.js` (`hasCurrentUserAtLeastOneAssignedRoleInStage`, `canCurrentUserEditParticipant`) · `src/composables/useLegacyGridUrl.js` · `src/components/Modal/AjaxModalWrapper.vue` · `src/pages/workflow/composables/useWorkflowConfig/workflowConfigEditorial{OJS,OMP,OPS}.js` · `src/pages/dashboard/dashboardPageStore.js` (`participantAssign`)
- Legacy handlers and forms: `lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php` · `form/AddParticipantForm.php` · `form/PKPStageParticipantNotifyForm.php` · `lib/pkp/controllers/grid/users/userSelect/UserSelectGridHandler.php` · `UserSelectGridCellProvider.php`
- Templates and scripts: `lib/pkp/templates/controllers/grid/users/stageParticipant/addParticipantForm.tpl` · `…/form/notify.tpl` · `lib/pkp/templates/controllers/grid/users/userSelect/searchUserFilter.tpl` · `userSelectRadioButton.tpl` · `lib/pkp/js/controllers/grid/users/stageParticipant/form/StageParticipantNotifyHandler.js` · `AddParticipantFormHandler.js` · `lib/pkp/js/controllers/form/FormHandler.js`
- Model and services: `lib/pkp/classes/stageAssignment/StageAssignment.php` · `Repository.php` (`build`) · `lib/pkp/classes/security/Validation.php` (`canEditParticipant`) · `lib/pkp/classes/user/Collector.php` (`filterExcludeSubmissionStage`, `assignedTo`) · `lib/pkp/classes/user/Repository.php` (`stageAssignmentsForUsers`) · `lib/pkp/api/v1/submissions/PKPSubmissionController.php` (`getParticipants`) · `lib/pkp/classes/submission/maps/Schema.php` (`getPropertyStages`)
- Messages: `lib/pkp/classes/editorialTask/Template.php` · `Repository.php` (`installTaskTemplates`, `isTemplateAccessibleToUser`, `removeParticipantFromSubmissionTasks`) · each app's `registry/taskTemplates.xml`
- Automatic assignment and its email: `lib/pkp/classes/context/SubEditorsDAO.php` (`assignEditors`) · `lib/pkp/classes/mail/mailables/EditorAssigned.php` · each app's `registry/emailTemplates.xml` (`EDITOR_ASSIGN`) and `locale/en/emails.po`
- Notices: `lib/pkp/classes/notification/managerDelegate/EditorAssignmentNotificationManager.php` · `lib/pkp/classes/notification/PKPNotificationManager.php` (`getDecisionStageNotifications`) · `ojs/pages/workflow/WorkflowHandler.php` (`getEditorAssignmentNotificationTypeByStageId`, uncalled)
- Roles: `lib/pkp/controllers/grid/settings/roles/form/UserGroupForm.php` · each app's `registry/userGroups.xml`
- App divergence points checked: no app subclasses or overrides any class, template or component above (note b); the apps differ in `registry/userGroups.xml`, `registry/taskTemplates.xml` and their locale files alone.
