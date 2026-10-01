---
name: tasks-and-discussions
status: verified
---

# Tasks & discussions

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Everyone who works on a submission needs a place to talk about it and to
hand each other work: the editor asks the author a question, the
Copyeditor is asked to start, a reviewer asks the editor about a file.
Every workflow stage carries a panel for this, headed "Desk Review Tasks &
Discussions" on the Submission stage, "Review Tasks & Discussions" on a
review stage, "Copyediting Tasks & Discussions" and "Production Tasks &
Discussions". On it a person opens a **discussion**, a named thread of
messages between the people ticked as its participants, or a **task**, a
discussion that also has a due date and one participant responsible for
it (its "Task Owner"), and that is started and completed; both are the
panel's **items**. Participants
reply and attach files; whoever may manage the item closes it when it is
done. Each message reaches the others by email and in their Tasks panel. A Journal Manager
keeps a library of **templates** under Settings › Workflow › "Tasks and
Discussions" that pre-fill a new item, and can have a template turn into
a discussion or task by itself whenever a submission reaches its stage.
<sup>a</sup>

Which panels a stage shows, and to whom, belongs to the stage's feature:
*[Submission stage](U25-submission-stage.md)*, *[Review stage &
rounds](U26-review-stage-and-rounds.md)*, *[Copyediting
stage](U32-copyediting-stage.md#panels)* and *[Production
stage](U33-production-stage.md#panels)*; a reviewer meets the review
stage's panel in the review form (*[Reviewer's
review](U28-reviewers-review.md#step-3)*), and a preprint server's Author
meets it on the "Production Tasks & Discussions" page of the Preprint
entries (*[Production stage](U33-production-stage.md#author-view)*). This
spec describes how the panel, its windows and the template screen work
once they are on screen. The header's Tasks panel, where each message
also lands, is a different screen (*[Notifications
center](U05-notifications-center-and-email-preferences.md)*). <sup>a</sup>

## Actors & permissions

Who may open a stage at all is the shared workflow gate,
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
The rows below use three terms. <sup>b</sup>

- **Manager-level**: the Site Administrator, the Journal Manager, the
  Editor and the Production editor, in the journal, whether assigned
  to the submission or not. An assigned Production editor may open only
  some stages, never the Submission stage, so never sees its panel
  ([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)).
  A preprint server's manager-level role is its
  Preprint Server Manager. <sup>b</sup>
- **Participant**: a person ticked under "Participants" of that
  discussion or task (Rule 7). <sup>b</sup>
- **May manage the item**: a manager-level person; the person the row
  names under "Created by" (for a task, whoever created it); and, for a
  task, its "Task Owner". Everyone else sees the row with no "More
  Actions" button and its boxes greyed. <sup>b</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the panel and its items** (Rules 1–4) | • Everyone who can open the stage sees the panel. The Reviewer sees the review stage's panel in the review form, from step 3 on, while their review is neither declined nor cancelled<br>• Manager-level: every discussion and task of the stage, participant or not<br>• Everyone else (Section Editor, Guest Editor {OJS}, the assistant roles, Author, Reviewer): only the items they are a participant of <sup>b</sup> <sup>c</sup> |
| **"Add"** a discussion or task (Rules 6–11) | • Everyone who sees the panel <sup>c</sup> |
| **Open an item** (its name; Rule 12) | • Everyone who sees the row <sup>c</sup> |
| **Reply** ("Add New Message"; Rule 13) | • Participants only. A manager-level person who is not a participant reads the item and sees "To add a new message, please assign yourself as a participant." instead of the button <sup>d</sup> |
| **"Edit"**, **"Add Task Details"** (Rule 15) | • Whoever may manage the item, while it is not closed. "Save" in "Edit" is refused to some of them: a task's owner who is an assistant role or the Author and did not write the first message ⚠ [A6](#a6), and an Author or assistant role an hour after writing it ⚠ [A12](#a12) <sup>e</sup> |
| **"History"** (Rule 18), **"Delete"** (Rule 19) | • Whoever may manage the item <sup>e</sup> |
| **Start a task** ("Started", "Start this task"; Rule 16) | • Whoever may manage the task, while it is "Yet to begin" and has an owner <sup>f</sup> |
| **Close or reopen** ("Closed", "Close this Discussion", "Complete this task"; Rule 17) | • Whoever may manage the item. A closed task cannot be reopened by anyone ⚠ [A13](#a13) <sup>f</sup> |
| **Attach files** to a message ("Attach Files"; Rule 14) | • "Upload File": everyone who writes a message<br>• "Workflow Files" (files already on the submission): manager-level people, and the Section Editor, Guest Editor {OJS} and assistant roles assigned to the submission<br>• Author, Reviewer: never "Workflow Files" <sup>g</sup> |
| **Use a template** in the "Add" window (Rule 10) | • Everyone who adds an item. A template limited to some roles is listed only to people holding one of them; manager-level people see every template (Settings bullet 3) <sup>i</sup> |
| **Manage the templates** (Settings › Workflow › "Tasks and Discussions"; Rules 25–26) | • The Journal Manager, the Editor and the Site Administrator (whoever may open the journal's Settings)<br>• A Section Editor who types the screen's address gets "The current role does not have access to this operation." <sup>h</sup> |

## Fields & validation

**The "Add" and "Edit" window** (Rules 6–11, 15). Every group carries a
one-line description under its heading (Rule 6). <sup>m</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Templates to get you started!" | No | A "Find Template" search box over one button per template of the stage (Rule 10). <sup>q</sup> |
| "Name" | Yes | Hint "Please enter the name for the task and discussion.". Empty, "Save" is refused with "This field is required." under it. At most 255 characters; a longer name is refused on "Save" with "This may not be greater than 255 characters." under it <sup>td11</sup>. The name is the subject of every email the item sends (Side effects). <sup>m</sup> <sup>o</sup> |
| "Participants" | Yes | Hint "You have the option to assign participants or allocate it solely to yourself.". A list of boxes, one per person offered (Rule 7), opening with the signed-in person ticked. The refusals on "Save" are Rule 8's. <sup>m</sup> <sup>n</sup> |
| "Enter task information" | No | A box under the heading "Task Information". Ticked, the item is a task and the three fields below show. Greyed when editing a task: a task never turns back into a discussion (Rule 15). <sup>p</sup> |
| "Due Date" | Yes, for a task | Hint "If there is a deadline for this task, you can indicate it here. The due date will be communicated and established for each participant assigned to this task.". A date; today or later. The picker greys the days before today; an earlier date typed into the box is accepted there, and "Save" is refused with "Start date should be greater than or equal to today" under "Due Date" ⚠ [A10](#a10). Left empty on a task: "This field is required.". <sup>p</sup> <sup>td11</sup> |
| "Responsible to complete this task (Task owner)" | Yes, for a task | Hint "If there is a specific participant designated to complete this task, please assign it to them here.". One radio button per person ticked under "Participants"; exactly one owner. None chosen: "This field is required." (Rule 8c). <sup>p</sup> |
| (no label) "Begin Task Upon Saving" / "Create Task (Do Not Start)" | — | A drop-down, "Begin Task Upon Saving" by default; greyed when editing (Rule 9), still reading "Begin Task Upon Saving" when an edit turns a discussion into a task (Rule 15b). <sup>p</sup> |
| The message box (heading "Discussion") | Yes | Rich text with bold, italic, underline, a bulleted list and "Attach Files" (Rule 14); the files attached show under the box, each with a remove control. Empty, "Save" is refused with "This field is required.". When editing, it holds the item's first message (Rule 15). <sup>m</sup> |

**The discussion window** (opened from an item's name; Rules 12–13, 16–17).
<sup>t</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Start this task" / "Complete this task" | No | A box for a task, shown to whoever may manage it: "Start this task" while it is "Yet to begin", "Complete this task" once started; greyed when the task is closed or has no owner (Rules 16–17). <sup>f</sup> |
| "Close this Discussion" | No | A box for a discussion, shown to whoever may manage it; ticked while the discussion is closed (Rule 17). <sup>f</sup> |
| The new message (after "Add New Message") | Yes, once opened | Rich text like the message box above, with "Attach Files". Empty, "Save" is refused with "This field is required." under it. <sup>u</sup> |

**The template window** (Settings › Workflow › "Tasks and Discussions",
"Add template" or a row's "Edit"; Rule 25). <sup>ae</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name" | Yes | Hint "Please enter the name for the task and discussion.". Becomes the name of the item the template makes. <sup>ae</sup> |
| "Mark as unrestricted" | — | Two radio buttons under a heading of the same name, with the hint "Unrestricted templates will be accessible to all roles.": "Mark as unrestricted" (the default) and "Limit access to specific roles". <sup>ae</sup> |
| "Limit access to specific roles" | Yes, when shown | Shown only with "Limit access to specific roles" chosen; hint "Select the roles that can access this template."; one box per role that works on the template's stage (Settings bullet 3). At Copyediting a journal offers "Journal editor", "Production editor", "Section editor", "Guest editor", "Copyeditor", "Marketing and sales coordinator", "Author" and "Translator"; a press "Press editor", "Production editor", "Series editor", "Copyeditor", "Marketing and sales coordinator", "Author", "Volume editor", "Chapter Author" and "Translator". A preprint server's Production Stage offers "Preprint Server manager", "Moderator" and "Author". Other stages change the assistant roles: Submission adds "Funding coordinator"; Production has "Designer", "Indexer", "Layout Editor" and "Proofreader"; a review stage adds "Reviewer" ("Internal Reviewer" and "External Reviewer" on a press). A journal and a press offer no box for their manager; a preprint server does. None ticked: "This field is required.". <sup>ae</sup> |
| "Enter task information" | No | Ticked, the template makes a task, and "Due Date" shows. <sup>ae</sup> |
| "Due Date" | Yes, when shown | A drop-down: "1 week from the creation date", "2 weeks …", "3 weeks …", "4 weeks …", "1 month …", "1.5 months …", "2 months …", "2.5 months …", "3 months from the creation date". <sup>ae</sup> |
| The message box (heading "Discussion") | Yes | Rich text with bold, italic, underline, a bulleted list and "Insert Content", which inserts placeholders such as the recipient's name or the submission's title (Rule 10d). <sup>ae</sup> |
| "Automatically add this task and/or discussion when a submission reaches the stage" | No | Unticked by default; the same switch as the list's "Auto-add at stage" box (Rule 26). <sup>ae</sup> |

## Rules & state

<a id="panel"></a>
1. **The panel.** Under its heading (Purpose) the panel reads "Use this
   space to start discussions, assign tasks to others, or create your
   personal task list to help you move this submission to the next
   stage." with "Add" at its top right. Both review stages of a press
   share the heading "Review Tasks & Discussions". Its table has the
   columns "Name", "Activity", "Due Date", "Started" and "Closed", and a
   "More Actions" button on each row that offers anything (Rule 5). The
   rows are grouped under three headings, always in this order: "Yet to
   begin", "In progress" and "Closed"; an empty group reads "No Items".
   Within a group the oldest item comes first. <sup>j</sup>
<a id="states"></a>
2. **Where an item sits.** <sup>j</sup>
   - 2a. A discussion sits under "In progress" until it is closed, then
     under "Closed". It never sits under "Yet to begin".
   - 2b. A task sits under "Yet to begin" until it is started, then under
     "In progress", then under "Closed" once completed or closed.
   - 2c. The windows show the same word in a badge under their title: "Yet
     to begin", "In progress", "Closed", or "New" in the "Add" window.
   - 2d. A task is **overdue** from the start of its due date ⚠
     [A16](#a16). While it is not closed, the window's badge reads
     "Overdue". Its "Activity" shows only "This task
     is overdue. Remind the task owner to complete it as soon as
     possible", and its History opens with that line, dated with the due
     date and with no user. The row stays in its group. <sup>l</sup>
   - 2e. Once an overdue task is closed, only its badge changes, to
     "Closed": its "Activity" still reads the overdue line instead of
     "Task closed by …", and its History still opens with it ⚠
     [A17](#a17). <sup>l</sup>
<a id="row"></a>
3. **A row's "Name" cell.** The word "Discussion" or "Task" with its icon,
   the item's name as a link that opens the discussion window (Rule 12),
   and under it "Created by: {username}" for a discussion or "Task Owner:
   {username}" for a task. A discussion the application made by itself
   (Rule 21) reads "Created by: system"; a task it made has no owner, so,
   like any task without an owner, it reads "Task Owner:" with nothing
   after it. "Due Date" shows a task's date as year-month-day; a
   discussion's is empty. <sup>k</sup>
<a id="activity"></a>
4. **"Activity".** The cell shows the item's latest event in the words of
   its History (Rule 18), cut to two lines. When a reply was posted in the
   last seven days and the item has another event, the cell shows instead
   a numbered list of two: the latest reply ("{username} ({roles})
   posted a response on {date}") and the latest other event. An item
   that another screen or an auto-added template opened (Rule 21) has no
   event yet: its cell is empty and its History reads "No Items" ⚠
   [A18](#a18). <sup>l</sup> <sup>td17</sup>
<a id="row-menu"></a>
5. **The row menu.** For whoever may manage the item, "More Actions"
   offers, in this order: "Edit" (greyed while the item is closed), "Add
   Task Details" (on a discussion that is not closed), "History" and
   "Delete" (in red). Everyone else gets no menu. <sup>e</sup>
<a id="add-window"></a>
6. **The "Add" window.** "Add" opens a side window titled with the panel's
   heading. Under the title stands the text "Open for What? Open to What?
   Beyond Content" ⚠ [A2](#a2), and the badge "New". It holds three
   groups, each with its own hint: <sup>m</sup>
   - "Details" ("Use this space to share essential information."): the
     templates (Rule 10), "Name" and "Participants";
   - "Task Information" ("Enter the tasks details here to help manage this
     task effectively, if selected."): Rule 9's fields;
   - "Discussion" ("You can start a discussion thread here by adding a
     message. This space is also available for providing a brief overview
     of the task, including any key details, goals, or specific
     instructions to help guide the assignees."): the message box;
   - and "Save" and "Cancel" at the bottom (Rule 11). The fields are
     Fields' first table.
<a id="offered"></a>
7. **Who is offered under "Participants".** Each person is listed as
   "{full name} ({username})", the signed-in person with "(Me)" added, and
   under the name the roles they hold on the submission (Rule 20). A
   participant's manager-level role is printed only to viewers who hold
   that same role themselves and are not assigned to the submission: a
   Journal Manager assigned as Section Editor reads "Section editor,
   Journal manager" to an unassigned Journal Manager and the Site
   Administrator, and "Section editor" to themselves, the other editors
   and the Author ⚠ [A19](#a19). The list loads a moment after
   the window opens. <sup>n</sup>
   - 7a. Always: the signed-in person, and everyone assigned to the stage
     on the Participants panel (editors, assistant roles, the Author).
     A manager-level person who is not assigned is not offered to
     others. <sup>n</sup>
   - 7b. On a review stage, also the reviewers of the submission who
     accepted their request, each with a second line per round such as
     "Round 1 - Anonymous Reviewer/Anonymous Author" (the review type,
     *[Reviewer assignment &
     management](U27-reviewer-assignment-and-management.md)*). A reviewer
     who has not answered, who declined, or whose request was cancelled
     is not offered. <sup>n</sup>
   - 7c. To an Author, a review stage offers only the reviewers of an
     "Open" review; the others stay hidden. <sup>n</sup>
   - 7d. To a Reviewer, the review stage offers themselves and the people
     assigned to the stage, never another reviewer. A reviewer whose own
     review is "Anonymous Reviewer/Anonymous Author" is not offered the
     Author; one whose review is "Anonymous Reviewer/Disclosed Author" is
     offered the Author and refused on "Save" if they tick them ⚠
     [A14](#a14). <sup>n</sup> <sup>td1</sup>
   - 7e. When editing, the item's current participants are listed too,
     ticked, even if the person editing is not offered them (an
     unassigned manager-level participant in an Author's item). A person
     removed from the stage is no longer among them (Rule 23); a
     discussion left with one participant that way cannot be saved from
     "Edit" at all, even to rename it: "At least two participants are
     required for a discussion." ⚠ [A20](#a20). <sup>n</sup>
<a id="save-refusals"></a>
8. **What "Save" refuses about participants.** Each refusal leaves the
   window open with the reason under the field, "Participants" unless
   said otherwise, and the summary of Rule 11a. When two refusals apply,
   both reasons show, one under the other. <sup>o</sup>
   - 8a. A discussion needs at least two participants: "At least two
     participants are required for a discussion.". A task needs one: with
     nobody ticked the window says "This field is required.". A task
     with only oneself ticked is how a person keeps a private to-do.
   - 8b. The person saving must be among the participants, unless they
     are manager-level: "The creator must participate in the
     task/discussion.". On an edit the rule applies to the item's creator,
     not to the person editing.
   - 8c. A task needs exactly one owner. With none chosen, the window
     says "This field is required." under "Responsible to complete this
     task (Task owner)". Unticking the chosen owner's box drops their
     radio button but not the choice, and "Save" is then refused with
     "There should be one user responsible for the task.".
   - 8d. When a participant is a reviewer whose review is "Anonymous
     Reviewer/Anonymous Author" or "Anonymous Reviewer/Disclosed Author",
     the item may hold no other reviewer ("Cannot disclose the identity of
     reviewers in the task/discussion.") and no Author ("Cannot allow
     participation of authors together with reviewers in a
     task/discussion during anonymous reviews."). Reviewers of "Open"
     reviews may share an item with each other and with the Author.
<a id="task-information"></a>
9. **Task information.** Ticking "Enter task information" makes the item
   a task: "Due Date" and "Responsible to complete this task (Task owner)"
   become required, and the owner list offers only the people ticked under
   "Participants", updated as boxes are ticked. The drop-down decides what
   "Save" does with a new task: "Begin Task Upon Saving" saves it started,
   under "In progress" (Rule 16); "Create Task (Do Not Start)" saves it
   under "Yet to begin". <sup>p</sup>
<a id="templates-in-window"></a>
10. **Templates in the "Add" window.** Under "Templates to get you
    started!" the window lists every template of the stage (Settings
    bullet 1) a person may use (Actors), newest first (Rule 25a), each as
    a button reading "DISCUSSION - {name}" or "TASK - {name}" over the
    line "This discussion template pre-fills the name, participants, and
    starting message. You can adjust the details before starting." or "This task
    template auto-fills the task name, due date, description, and roles.
    After selecting the template, you can modify any details before saving
    the task.". A stage with none reads "No items found.". <sup>q</sup>
    - 10a. "Find Template" narrows the list when Enter is pressed; typing
      alone changes nothing. It keeps the templates whose name or text
      holds every word typed, in any case, also inside a longer word. Its
      clear control brings the whole list back; emptying the box by hand
      keeps the last result until Enter is pressed. Any search holding
      "discussion", "discussions", "task" or "tasks" fails ⚠ [A4](#a4).
      <sup>q</sup> <sup>td3</sup>
    - 10b. Pressing a template fills "Name" with its name, replaces the
      message with its text, ticks or unticks "Enter task information" to
      match it, sets "Due Date" to today plus the template's interval for
      a task, and empties the owner. "Participants" stays as it was, though
      the button's line says the template fills it ⚠ [A5](#a5).
      <sup>q</sup> <sup>td4</sup>
    - 10c. When editing an existing item, pressing a template first asks
      "Apply Template" ("Applying this template will replace information in
      related fields on the form. These changes won't be saved unless you
      choose to save. Continue?"), "Yes" or "No". "No" changes nothing.
      While a task is edited, the discussion templates are greyed. While
      a discussion is edited, the task templates stay pressable: after
      "Apply Template" › "Yes", one ticks "Enter task information" and
      sets "Due Date", so "Save" would turn the discussion into a task
      (Rule 15b). <sup>q</sup>
    - 10d. A template's text may hold placeholders (the recipient's name,
      the submission's title, the journal's name). The message box shows
      them as typed; "Save" replaces them in the first message and its
      email, the recipient being every participant but the writer: "Dear
      {full name}," for one, "Dear {full name}, {full name}," for two. An
      item "Auto-add at stage" makes is filled differently (Rule 26b).
      <sup>q</sup> <sup>td5</sup>
    - 10e. A template added in Settings behaves like the installed ones
      here <sup>td7</sup>. A preprint server's "Assign Editor" fills
      "Name" but leaves the message box showing its old text, while "Save"
      treats the box as empty ⚠ [OPS1](#ops1). <sup>q</sup> <sup>td6</sup>
<a id="save-cancel"></a>
11. **"Save" and "Cancel".** <sup>r</sup>
    - 11a. "Save" with a required field empty keeps the window open,
      sends nothing, and puts "This field is required." under each empty
      one: a discussion's "Name" and message box, a task's "Due Date" and
      "Responsible to complete this task (Task owner)" too, and
      "Participants" only when every box is unticked. Beside "Cancel" and
      "Save" it shows "Please correct one error." ("Please correct {n}
      errors.") with "Jump to next error"; the list a screen reader hears
      there calls the message box "undefined" ⚠ [A21](#a21). Each
      field's line stays until that field is changed, and "Save" stays
      greyed while any line still shows: a task refused for its owner can
      be saved again only once an owner is chosen. A refusal from the
      server (Rules 8, 15c) adds the notice "The form was not
      saved because 1 error(s) were encountered. Please correct these
      errors and try again.".
    - 11b. A successful "Save" closes the window with no notice; the panel
      shows the item in its group (Rule 2) and the emails and Tasks rows of
      Side effects go out.
    - 11c. "Cancel", the window's close control and Escape close an
      unchanged window at once. When anything was changed (the name, the
      message, a participant, a template pressed; a "Find Template" search
      does not count), each first asks "Warning", "The data on this form
      has changed. Do you wish to continue without saving?", with "Yes"
      or "No". "No" returns to the window as it was; "Yes" closes it and
      discards the changes. The "Edit" window does the same. <sup>td2</sup>
    - 11d. Leaving the workflow page while the window holds unsaved
      changes raises the browser's leave-page prompt. After the window
      closes, whether by a successful "Save", by "Warning" › "Yes" or
      untouched, leaving the page asks nothing. <sup>td16</sup>
<a id="discussion-window"></a>
12. **The discussion window.** An item's name opens a side window titled
    with the item's name, with its badge (Rule 2) and, for whoever may
    manage the item, an "Edit" button at the top right, greyed while the
    item is closed (Rule 15). Its groups show: <sup>t</sup>
    - "Details": the participants as a numbered list ("1. {full name}
      ({username})"), each with their roles;
    - "Task Information": for a task, its "Due Date", its owner, the
      start or complete box (Fields) and, once started, "Task started by"
      and "Start Date"; for a discussion, the hint "You can convert this
      into a task by clicking Edit." ("…by re-opening the discussion and
      clicking Edit." while it is closed), shown to every participant,
      also to one who has no "Edit" ⚠ [A23](#a23);
    - "Discussion": the "Close this Discussion" box (Fields), then every
      message, oldest first, each headed "Message from {username}" with its
      date and time, its text and its attached files as links that
      download them; then "Add New Message" (Rule 13).
    - "Save" stays greyed until a box is changed or "Add New Message" is
      pressed. A save keeps the window open, shows "Saved" and the
      result, and greys "Save" again. <sup>t</sup>
<a id="reply"></a>
13. **Replying.** "Add New Message" opens a message box under the
    messages and greys itself. <sup>u</sup>
    - 13a. "Save" with the box empty shows "This field is required." under
      it and saves nothing.
    - 13b. "Save" adds the message at the end, headed with the writer's
      username, and sends it to every participant (Side effects).
      The item's "Activity" and History gain "{username} ({roles})
      posted a response on {date}". <sup>td12</sup>
    - 13c. A closed discussion or task still takes replies: closing ends
      the work, not the thread.
<a id="attach-files"></a>
14. **Attaching files.** "Attach Files" on a message box opens the "Attach
    Files" window, whose mechanics are *[Editorial decision
    recording](U34-editorial-decision-recording.md#attach-files)*'s. Here
    it offers "Upload File" ("Upload a file from your computer.") and,
    to the people Actors names, "Workflow Files" ("Attach files uploaded
    during the submission workflow, such as revisions or files to be
    reviewed.", button "Attach Workflow Files"). <sup>g</sup>
    - 14a. The "Select submission stage" list of "Workflow Files" offers
      the stages up to Production. On a journal and a press, a Copyeditor
      or Layout Editor is offered every stage too, but choosing
      "Submission" or "Review" ("Internal Review" or "External Review" on
      a press) shows nothing between the list and "Back": no file list,
      no "No Items" ⚠ [A24](#a24). A preprint server offers "Production"
      alone, whose "Production Ready Files" list reads "No Items" on every
      preprint, a preprint server's files being its galleys ⚠
      [OPS2](#ops2). <sup>g</sup>
    - 14b. The chosen files list under the message box, each with
      "Remove" until "Save". Saved, each file is listed under its message
      and attached to the message's emails; a workflow file is attached
      as a copy with a new file number, so the file stays where it was.
      <sup>g</sup>
<a id="edit"></a>
15. **"Edit" and "Add Task Details".** Both open the "Add" window's fields
    on the item, titled with the panel's heading and badged with the
    item's state; "Add Task Details" opens it with "Enter task
    information" ticked and scrolled to "Task Information". <sup>v</sup>
    - 15a. "Save" rewrites the name, participants, due date, owner and
      first message. Newly ticked participants receive the item's first
      message (Side effects); nobody else is told. The edited first
      message replaces the old one and keeps its original time. The
      item's History records who was added or removed, a changed due date
      or owner, and each file added to or removed from the first message
      (Rule 18); a changed name or message text leaves no line.
    - 15b. Ticking "Enter task information" on a discussion ("Add Task
      Details", or "Edit" and the box) turns it into a task; it moves to
      "Yet to begin", keeping its messages, and its menu loses "Add Task
      Details". The drop-down under "Task Information" reads "Begin Task
      Upon Saving", greyed, but the new task is not started: it is
      started from its row or window (Rule 16) ⚠ [A25](#a25). Its History
      then reads "Task created by …" (Rule 18, [A28](#a28)). A task never
      turns back (Fields).
    - 15c. Whoever is not manager-level, not a Section Editor and not a
      Guest Editor {OJS} may save an edit only when they wrote the item's
      first message, and only within an hour of writing it; a task's
      owner who did not write it is refused ⚠ [A6](#a6). The form sends
      the first message back with every "Save", so the limit binds the
      whole edit: past the hour, the Author or assistant cannot even
      rename the item or add a participant ⚠ [A12](#a12). Refused, "Save"
      shows "You can only edit your own discussion message." or "This
      discussion message can only be edited within 1 hour of creation."
      under the message box, with the notice of Rule 11a; a press and a
      preprint server show a raw key instead ⚠ [A7](#a7). A discussion a
      Participants message opened is the exception: the Author or
      assistant it was sent to did not write its first message, yet saves
      at any time, and their first "Save" adds a message instead of
      rewriting it (15e, [A9](#a9)). <sup>v</sup> <sup>td8</sup>
    - 15d. An Author who attached an uploaded file to the first message
      cannot save an edit of it: the refusal names no field ⚠ [A8](#a8).
      <sup>v</sup> <sup>td9</sup>
    - 15e. A discussion a Participants message opened ("Notify" or
      "Assign", Rule 21) has a first message the edit does not recognize
      as such. The message box holds that message, and the first "Save",
      even one that changes only the name or the participants, adds the
      box's text as a further message instead of replacing it, credited
      to the person the row names under "Created by:", whoever pressed
      "Save". Each later "Save" rewrites that added message. The History
      records nothing ⚠ [A9](#a9). The other items of Rule 21 are edited
      as 15a says. <sup>v</sup> <sup>td10</sup>
<a id="start"></a>
16. **Starting a task.** A task is started by "Begin Task Upon Saving"
    (Rule 9), by ticking its "Started" box in the row, which first asks
    "Start this task" / "Are you sure you want to start this task?" with
    "Yes" and "No", or by ticking "Start this task" in its window and
    pressing "Save" (no question). Started, it moves to "In progress",
    the window shows "Task started by" and "Start Date", and the History
    gains "Task initiated by {username} ({roles}) on {date}". "No" in the
    row's question sends nothing and the box still looks empty, though a
    screen reader now hears it as ticked ⚠ [A26](#a26). A started task
    cannot be unstarted: the box stays ticked and greyed. A task without
    an owner cannot be started (its boxes are greyed). <sup>w</sup>
<a id="close"></a>
17. **Closing and reopening.** <sup>x</sup>
    - 17a. A discussion's "Closed" box in the row asks "Close this
      Discussion" / "Are you sure you want to close this discussion?
      Closing the discussion won't stop you from sending or receiving
      messages in this thread - this ensures no message is lost."; ticked
      again on a closed one it asks "Reopen this Discussion" / "Are you
      sure you want to reopen this discussion?". "Yes" moves it, "No"
      leaves it ([A26](#a26)). In the window, "Close this Discussion" ticked
      or unticked and "Save" does the same without asking.
    - 17b. A task's "Closed" box asks "Close this Task" / "Are you sure you
      want to close this task? Closing the task won't end the discussion -
      you can still send messages on it."; in the window "Complete this
      task" and "Save" closes it. A task can be closed straight from "Yet
      to begin".
    - 17c. Once closed, a task's boxes are greyed in the row and in the
      window: nobody can reopen it ⚠ [A13](#a13).
    - 17d. Closing or reopening adds "{Discussion|Task} closed by
      {username} on {date}" or "Discussion reopened by {username} on
      {date}" to the History; nobody is emailed.
<a id="history"></a>
18. **"History".** The row menu's "History" opens a side window titled
    "History", with the item's name under it, and a table "Date", "User",
    "Event", newest first; events saved in the same second come in no
    fixed order. "User" is the person's full name; "Event" uses the
    username. During Login As, "User" reads "{real person} (acting as {the
    person impersonated})", and "Event" and the row's "Activity" name the
    real person, while the message itself reads "Message from {the
    impersonated person's username}" and its email comes from the
    impersonated person's address ⚠ [A27](#a27). The events: <sup>y</sup>
    - "{Discussion|Task} created by {username} ({roles}) on {date}",
      naming what the item is now: a discussion turned into a task reads
      "Task created by …", and "Task assigned to {owner} by …" is the only
      trace of the change ⚠ [A28](#a28);
    - "{username} ({roles}) posted a response on {date}";
    - "{username (roles), …} added by {username} ({roles}) on {date}" and
      "… removed by …", for participants changed by an edit;
    - "Task assigned to {owner} by {username} on {date}" when a task gets
      its first owner, "Task reassigned from {old} to {new} by {username}
      on {date}" when the owner changes;
    - "Due date changed from {old} to {new} by {username} on {date}";
    - "Task initiated by …", "… closed by …", "Discussion reopened by …"
      (Rules 16–17);
    - "{file name} uploaded by {username} on {date}", with a "Download"
      link in the last column that downloads the file in place, for a file
      attached to a reply or added by "Edit"; a file attached to the first
      message in the "Add" window gets no such line ⚠ [A29](#a29);
    - "{file name} removed by {username} on {date}", for any file taken
      off the first message by "Edit";
    - and, first, the overdue line of Rules 2d and 2e.
<a id="delete"></a>
19. **"Delete".** The row menu's "Delete" opens a dialog titled "Delete",
    "Are you sure you wish to delete this item? This action cannot be
    undone.", with "OK" (in red) and "Cancel". "OK" removes the item, its
    messages and its attached files from the panel, and the "Discussion
    added." rows it gave people in their Tasks panel; nobody is emailed.
    "Cancel" changes nothing. <sup>z</sup>
<a id="roles-in-window"></a>
20. **Anonymity in what people see.** The roles printed under a
    participant's name and in the History are the roles that person holds
    on the submission (who sees a manager-level role is Rule 7's). A
    reviewer is printed as "Reviewer" on a journal; on a press the
    External Review stage's reviewers read "Internal Reviewer" or
    "External Reviewer", varying from one press to the next and between
    windows ⚠ [OMP1](#omp1). The rules that keep reviewers and authors
    apart are Rules 7c, 7d and 8d. <sup>n</sup>
<a id="other-sources"></a>
21. **Items that other screens open.** Besides "Add", discussions and
    tasks come from: <sup>aa</sup>
    - a message sent from the Participants panel's "Assign" or "Notify"
      ([→ predefined messages](U35-stage-participants.md#predefined-messages));
      the panel lists it as created by the person it was sent to
      ([→ Stage participants' A5](U35-stage-participants.md#a5));
    - the submission wizard's comments box (*[Submission
      wizard](U21-submission-wizard.md)*): on submit, a discussion titled
      "Comments for the Editor" ("Cover Note to Editor" on a press,
      "Comments for the Moderator" on a preprint server) on the Submission
      stage (Production on a preprint server), whose first message is the
      comment, created by the submitting author, with every editor,
      assistant and author assigned to that stage as participants;
    - a recommending editor's recommendation (*[Editorial decision
      recording](U34-editorial-decision-recording.md#recommendation)*):
      "Editor Recommendation", "Created by: {recommender}", its first
      message the recommendation email, with the deciding editors as its
      only participants
      ([→ Editorial decision recording's A4](U34-editorial-decision-recording.md#a4)).
      The recommending editor sees no row for it, and a manager's "Edit" ›
      "Save" is refused with "At least two participants are required for
      a discussion." and "The creator must participate in the
      task/discussion." (Rule 8) until the recommending editor is ticked;
    - a template with "Auto-add at stage" on (Rule 26): made by the
      application ("Created by: system" on a discussion, "Task Owner:"
      with nothing after it on a task), with no participants, so only
      manager-level people see it until someone adds participants through
      "Edit" (on a discussion at least two: one alone is refused, Rule
      8a); its first message is "Message from system". <sup>td19</sup>
    - The first three send their own emails. The Participants message's
      first message is not the one "Edit" rewrites ([A9](#a9)).
<a id="disabled-participants"></a>
22. **A disabled account stays named.** When a participant's account is
    disabled, the items keep showing them: in "Created by" and "Task
    Owner", in the window's participants, in "Edit"'s list (ticked), and
    in the History. A disabled person assigned to the stage is not
    offered to new items, and receives no email or Tasks row from an item
    they are in. <sup>ab</sup> <sup>td14</sup>
<a id="leaving"></a>
23. **Leaving the submission leaves its items.** A person removed from the
    Participants panel is taken off every discussion and task of the
    submission, unless they hold a manager-level role
    ([→ Remove](U35-stage-participants.md#remove)). A reviewer whose last
    request on the submission is cancelled or unassigned is taken off
    them the same way; one who still holds another open request stays.
    The items stay, without them. A task whose owner is taken off keeps
    no owner: its row reads "Task Owner:" with nothing after it, and its
    History records nothing of the removal ⚠ [A30](#a30). <sup>ac</sup>
    <sup>td13</sup>
<a id="languages"></a>
24. **Languages.** The panel's texts follow the interface language. With
    the interface in French, every panel, its windows and the "Add"
    window show raw keys such as "##discussion.description##",
    "##common.yetToBegin##" and "##common.closed##" where the French text
    should be ⚠ [A15](#a15). <sup>ad</sup>
<a id="template-screen"></a>
25. **The template screen.** Settings › Workflow › the "Tasks and
    Discussions" tab shows a table "Tasks and Discussions Templates" with
    the line "Use this space to create templates for tasks and
    discussions. These templates automatically fill in the task name, due
    date, description, and roles, giving you a head start.". <sup>ae</sup>
    - 25a. One group per workflow stage, headed "Submission Stage",
      "Review Stage", "Copyediting Stage" and "Production Stage" ("Internal
      Review Stage" and "External Review Stage" on a press; "Production
      Stage" alone on a preprint server), each with an "Add template"
      button (styled as a link) on the stage's row. Under each, the
      stage's templates, newest first (the installed ones in the reverse
      of Settings bullet 1's order) <sup>td15</sup>, with
      the columns "Task and discussion template name" and "Auto-add at
      stage" (a box, Rule 26), and a "More Actions" menu with "Edit" and
      "Delete". An empty stage reads "No Items".
    - 25b. "Add template" opens "Add Task and Discussion Template in
      {stage}" ("…in Copyediting Stage"); "Edit" opens "Edit Task and
      Discussion Template". Both hold the fields of Fields' last table,
      with "Save" and "Cancel"; "Save" closes the window and the list
      shows the change. "Save" with a required field empty is refused as
      in Rule 11a, the message box also listed as "undefined" ([A21](#a21));
      here the required fields also take in "Limit access to specific
      roles" with no role ticked and "Due Date" with "Enter task
      information" ticked. Closing, and leaving the page, work as in Rules
      11c and 11d.
    - 25c. "Delete" asks as Rule 19 does. The template leaves the list and
      every "Add" window; the items already made from it stay.
<a id="auto-add"></a>
26. **Auto-add.** <sup>af</sup>
    - 26a. Ticking or unticking a template's "Auto-add at stage" box asks
      "Confirm Automatic Addition" with "Are you sure you want this
      task/discussion template to be automatically added when a submission
      reaches the {stage}?" (or "…to stop automatically adding this
      task/discussion template when a submission reaches the {stage}?"),
      "Yes" or "No"; "Yes" saves it and shows "Your changes have been
      saved." at the top right. "No" saves nothing ([A26](#a26)). The
      list's box and the window's "Automatically add…" box are one switch.
    - 26b. While it is on, a submission that reaches the template's stage
      gets an item made from the template (Rule 21): the first stage when
      the author submits, a later stage when a decision sends the
      submission there. The item's due date is the template's interval
      counted from that moment. Its first message is the template's text
      under "Message from system", with the submission's title and the
      journal's name filled in but the recipient and sender placeholders
      not: "Galleys Complete" reads "Dear {$recipientName}," and ends
      "{$signature}" on a journal ("{$senderName}" on a press) ⚠
      [A31](#a31).
    - 26c. A submission gets each template's item once: returning to the
      stage adds no second one. Deleting the item lets the next arrival
      make it again. <sup>af</sup>

## Side effects

- **Emails.** Saving a new item, and every reply, emails each
  participant. The subject is the item's name, the From line names the
  person who wrote the message, the body is the message (for a new item,
  its first message), with the files attached to it, followed by the
  discussion footer and its unsubscribe link, which *[Notifications
  center](U05-notifications-center-and-email-preferences.md)* describes.
  The writer receives a copy of their own message ⚠ [A3](#a3). An edit
  emails only the newly added participants, with the first message.
  Starting, closing, reopening and deleting email nobody. <sup>ag</sup>
- **Tasks rows.** The same events give each participant a "Discussion
  added." row in the header's Tasks panel; its wording, and the fact that
  a reply is worded like an opening, are *[Notifications
  center](U05-notifications-center-and-email-preferences.md)*'s. <sup>ag</sup>
- **Who is not told.** A participant who unticked "Enable these types of
  notifications." for "Discussion added." in their Notifications tab gets
  neither email nor row; one who ticked "Do not send me an email for these
  types of notifications." gets the row alone. A disabled account gets
  neither (Rule 22). <sup>ag</sup>
- **{OMP OPS} As shipped, a press and a preprint server fail on these
  notices** ⚠ [A1](#a1); a test install adds the missing piece and
  notifies as a journal does. <sup>ag</sup>
- **The stage's notice box.** On Copyediting, and on a journal's
  Production, the first discussion or task saved on the stage moves the
  assigned editor's notice from "Assign a copyeditor using the Assign
  link in the Participants list." to "Awaiting Copyedits." (Production:
  "Assign a user to create galleys using the Assign link in the
  Participants list." to "Awaiting Galleys."), whether or not the
  Copyeditor or Layout Editor is among its participants. The box changes
  the next time the workflow is opened, not on the page where the item
  was saved. A press's Production box keeps "Awaiting approval."; a
  preprint server has no notice box
  ([→ Copyediting notices](U32-copyediting-stage.md#notices),
  [→ Production notices](U33-production-stage.md#notices)). <sup>ah</sup>
- **The submission's logs.** On the Activity Log (*Submission activity
  log & notes*) each email is one line "An email has been sent: {item
  name}" per recipient, the writer's own copy included, with an empty
  "User" column and "View Email". Each file attached to a message adds
  "Revision "{file name}" was uploaded for file {number}." under the
  writer's name, with "Download"
  ([→ Submission files' A22](U36-submission-files.md#a22)). The item's
  own events are recorded in its History (Rule 18), not on the Activity
  Log. <sup>y</sup> <sup>td18</sup>
- **Auto-added items** (Rule 26) email nobody and raise no Tasks row.
  <sup>af</sup>

## Settings that modify behavior

- **The stage's templates** (Settings › Workflow › "Tasks and
  Discussions"; Rule 25). Install default, every template a discussion,
  unrestricted, with "Auto-add at stage" off: <sup>ai</sup>
  - on a journal: Submission Stage "Discussion (Submission)" and "Assign
    Editor"; Review Stage "Discussion (Review)" and "Assign Editor";
    Copyediting Stage "Discussion (Copyediting)" and "Request Copyedit";
    Production Stage "Discussion (Production)", "Assign Editor", "Ready
    for Production" and "Galleys Complete";
  - on a press: the same under "Submission Stage", "External Review
    Stage", "Copyediting Stage" and "Production Stage", the Production
    Stage also holding "Index Requested" and "Index Completed"; nothing
    under "Internal Review Stage";
  - on a preprint server: Production Stage "Discussion (Production)" and
    "Assign Editor".
  - The "Discussion (…)" templates' text is "Please enter your message.";
    the others hold a letter about the submission that opens "Dear
    {$recipientName}," (the placeholder shown as a tag), except a
    preprint server's "Assign Editor", which is empty [OPS1](#ops1).
  - A stage's templates are what the "Add" window lists (Rule 10). Its
    discussion templates, not its task templates, are what the
    Participants panel offers as predefined messages
    ([→ predefined messages](U35-stage-participants.md#predefined-messages)).
- **"Auto-add at stage"** (per template, the list's box or the window's
  "Automatically add this task and/or discussion when a submission
  reaches the stage"; Rule 26). Off for every installed template. On,
  each submission reaching the stage gets an item made from the template;
  off, it gets none. <sup>af</sup>
- **"Limit access to specific roles"** (per template, the window's "Mark
  as unrestricted" choice). Default "Mark as unrestricted": every person
  who adds an item on the stage sees the template. Limited, the "Add"
  window lists it only to people holding one of the ticked roles and to
  manager-level people (Rule 10); the Participants panel's predefined
  messages follow the same limit. The roles offered are listed in Fields'
  template-window table. <sup>i</sup>
- **"Enter task information" and "Due Date"** (per template). Default
  off: the template makes a discussion. On, it makes a task: choosing it
  ticks "Enter task information" and sets "Due Date" (Rule 10b), and an
  auto-added item is a task due after the interval (Rule 26b), with no
  owner. <sup>q</sup>
- **The journal's review type** (Settings › Workflow › Review, "Default
  Review Mode"; *[Review setup & review
  forms](U29-review-setup-and-review-forms.md)*) and each request's own
  review type (*[Reviewer assignment &
  management](U27-reviewer-assignment-and-management.md)*). Install
  default "Anonymous Reviewer/Anonymous Author": reviewers are never
  offered to the Author, and one reviewer shares an item with neither
  another reviewer nor the Author. "Open": the Author is offered the
  reviewer and they may share an item (Rules 7c, 8d). <sup>n</sup>
- **The person's "Discussion added." boxes** (Profile › Notifications;
  *[Notifications center](U05-notifications-center-and-email-preferences.md)*).
  By default "Enable these types of notifications." is ticked and "Do not
  send me an email for these types of notifications." unticked; their
  effect is Side effects' third bullet. <sup>ag</sup>

## Cross-feature interactions

- **[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#stage-access)**:
  who may open a stage, and so see its panel. <sup>aj</sup>
- **[Submission stage](U25-submission-stage.md)**, **[Review stage &
  rounds](U26-review-stage-and-rounds.md)**, **[Copyediting
  stage](U32-copyediting-stage.md#panels)**, **[Production
  stage](U33-production-stage.md#panels)**: where the panel stands on each
  stage, in the editorial and author views; the Production stage also
  owns the preprint server Author's "Production Tasks & Discussions"
  page. The stage notices a save moves are theirs (Side effects). <sup>aj</sup>
- **[Reviewer's review](U28-reviewers-review.md#step-3)**: the review
  form's "Review Tasks & Discussions" panel on steps 3 and 4. <sup>aj</sup>
- **[Stage participants](U35-stage-participants.md#predefined-messages)**:
  who is assigned to a stage (and so offered, Rule 7a), the "Assign" and
  "Notify" messages that open discussions from this spec's templates, and
  the removal of Rule 23. <sup>aj</sup>
- **[Reviewer assignment & management](U27-reviewer-assignment-and-management.md#unassign)**:
  the review types of Rules 7–8, and the cancel and unassign of Rule 23. <sup>aj</sup>
- **[Submission wizard](U21-submission-wizard.md)**: the comments box whose
  text opens a discussion, and the submit that runs the first stage's
  auto-added templates (Rules 21, 26). <sup>aj</sup>
- **[Editorial decision recording](U34-editorial-decision-recording.md#attach-files)**:
  the "Attach Files" window (Rule 14), the recommendation discussion
  (Rule 21), the decisions that send a submission into a stage (Rule 26),
  and the fact that its email composer's "Find Template" never reaches
  these templates, which are not email templates
  ([→ templates](U34-editorial-decision-recording.md#templates)). <sup>aj</sup>
- **[Notifications center](U05-notifications-center-and-email-preferences.md)**:
  the "Discussion added." rows and boxes, the discussion email's footer
  and unsubscribe page, and the "Discussion activity." row nothing raises. <sup>aj</sup>
- **[Submission files](U36-submission-files.md)**: the workflow files the
  "Workflow Files" source offers; files attached to messages are this
  spec's. <sup>aj</sup>
- **Submission activity log & notes**: the email and file lines of Side
  effects. <sup>aj</sup>
- **Languages & locales**: the fallback behind Rule 24. <sup>aj</sup>

## Canonical scenarios

Scenarios 8 and 9, and the "Open" review of scenario 11, run on a scratch
journal with throwaway accounts, since each needs a template or a review
type away from its install default; every other scenario runs on the
seeded journal with ready accounts and scratch submissions. The accounts
and the tooling recipe are in the footnote. <sup>s</sup>

1. **Open a discussion and reply**

   Given: Journal Manager, on the Production stage of a submission with a
   Section Editor assigned, whose "Production Tasks & Discussions" panel
   is empty and whose "Submission Files" list holds "article.pdf" {OJS
   OMP}.

   - **The panel**: under its heading it reads "Use this space to start
     discussions, assign tasks to others, or create your personal task
     list to help you move this submission to the next stage." with "Add"
     at its top right; the table has the columns "Name", "Activity", "Due
     Date", "Started" and "Closed", and the groups "Yet to begin", "In
     progress" and "Closed", in this order, each reading "No Items" (Rule
     1).
   - **The "Add" window**: press "Add": a side window titled "Production
     Tasks & Discussions" opens with the badge "New" and the groups
     "Details", "Task Information" and "Discussion"; under "Participants"
     the Journal Manager is listed as "{full name} ({username}) (Me)",
     ticked, and the Section Editor as "{full name} ({username})",
     unticked, with "Section editor" ("Series editor" on a press,
     "Moderator" on a preprint server) under the name (Rules 2c, 6, 7,
     7a).
   - **"Save"**: type "Figure permissions" in "Name" and "Please confirm
     the permissions for figure 2." in the message box, tick the Section
     Editor and press "Save": the window closes with no notice, and the
     panel shows, under "In progress", a row reading "Discussion",
     "Figure permissions" and "Created by: {the Journal Manager's
     username}", an empty "Due Date" and, under "Activity", "Discussion
     created by {username} ({roles}) on {date}" (Rules 2a, 3, 4, 11b).
   - **The Section Editor's email and Tasks row**: the Section Editor's
     mailbox holds an email whose subject is "Figure permissions", whose
     From line names the Journal Manager and whose body is "Please confirm
     the permissions for figure 2." followed by the discussion footer and
     its unsubscribe link; the Section Editor's Tasks panel in the header
     holds a "Discussion added." row (Side effects) [A1](#a1).
   - **The Section Editor's view**: Section Editor: open the submission at
     Production: the row shows no "More Actions" button and a greyed
     "Closed" box; press "Figure permissions": a side window titled
     "Figure permissions" opens with the badge "In progress", "Details"
     lists the two participants as "1. {full name} ({username})" and "2.
     …", each with their roles, and "Discussion" shows "Message from {the
     Journal Manager's username}" with its date and time and the text;
     the window has no "Edit" button and no "Close this Discussion" box
     (Actors, "May manage the item"; Rule 12).
   - **The reply**: press "Add New Message": a message box opens under
     the message and the button greys; press "Save": "This field is
     required." shows under the box; type "Permissions confirmed for
     figure 2." and press "Save": the message is added at the end, headed
     "Message from {the Section Editor's username}", and the window shows
     "Saved" (Rules 12, 13a, 13b).
   - **The Journal Manager's side**: Journal Manager: the row's "Activity"
     shows a numbered list of two, "{the Section Editor's username}
     ({roles}) posted a response on {date}" and "Discussion created by
     …"; the mailbox holds an email with the subject "Figure permissions"
     carrying the reply (Rules 4, 13b; Side effects).
   - **A workflow file** {OJS OMP}: Section Editor: press "Add New
     Message", then "Attach Files" on the box: the "Attach Files" window
     offers "Upload File" and "Workflow Files"; press "Attach Workflow
     Files", choose "Submission" in "Select submission stage" and attach
     "article.pdf": it is listed under the box with "Remove"; type "The
     signed form is attached." and press "Save": the message shows a link
     to "article.pdf" that downloads the file; the Journal Manager's email
     of this reply has "article.pdf" attached, and "Submission Files"
     still lists "article.pdf" once (Actors row 9; Rules 12, 14, 14b;
     Side effects).
   - **Control**: in the Journal Manager's window the same discussion
     shows the "Edit" button and the "Close this Discussion" box, and its
     row the "More Actions" button, none of which the Section Editor was
     offered (Actors, "May manage the item").

2. **What the "Add" window refuses, and "Cancel"**

   Given: Journal Manager, on the Production stage of a submission with a
   Section Editor assigned, whose "Production Tasks & Discussions" panel
   is empty.

   - **Required fields**: press "Add", then "Save" at once: "This field is
     required." shows under "Name" and under the message box, "Please
     correct 2 errors." with "Jump to next error" shows beside "Cancel" and
     "Save", and the window stays open (Fields; Rule 11a) [A21](#a21).
   - **One participant**: type "Layout question" in "Name" and "Is the
     layout final?" in the message box, and press "Save" with only the
     Journal Manager ticked: "At least two participants are required for a
     discussion." shows under "Participants", with "Please correct one
     error." and the notice "The form was not saved because 1 error(s)
     were encountered. Please correct these errors and try again." (Rules
     8, 8a, 11a).
   - **A task with nobody ticked**: tick "Enter task information":
     "Due Date", "Responsible to complete this task (Task owner)" and the
     drop-down reading "Begin Task Upon Saving" show; choose the date
     seven days from today in "Due Date", untick the Journal Manager's own
     box and press "Save": "This field is required." shows under
     "Participants" and under "Responsible to complete this task (Task
     owner)" (Fields; Rules 8a, 11a).
   - **No owner chosen**: tick the Journal Manager and the Section Editor:
     the owner list offers one radio button for each, "This field is
     required." stays under "Responsible to complete this task (Task
     owner)", and "Save" stays greyed (Rules 8c, 9, 11a).
   - **The owner unticked**: choose the Section Editor as owner: "Save"
     can be pressed again; untick the Section Editor under
     "Participants": their radio button disappears; press "Save": "There
     should be one user responsible for the task." shows under
     "Participants" (Rules 8c, 11a).
   - **"Cancel" on a changed window**: press "Cancel": a "Warning" asks
     "The data on this form has changed. Do you wish to continue without
     saving?" with "Yes" and "No"; press "No": the window is as it was,
     "Name" still reading "Layout question"; press Escape: the same
     question; press "Yes": the window closes, and every group of the
     panel still reads "No Items" (Rule 11c).
   - **An untouched window**: press "Add", then "Cancel": the window closes
     at once, with no question (Rule 11c).
   - **Control**: press "Add", type "Layout question" in "Name" and "Is
     the layout final?" in the message box, tick the Section Editor and
     press "Save": the discussion is saved under "In progress", so the
     refusals above were the window's rules at work (Rules 8a, 11b).

3. **Templates in the "Add" window**

   Given: Journal Manager, on the Production stage of a submission with a
   Section Editor assigned, whose templates are the install default.

   - **The list**: press "Add": under "Templates to get you started!" the
     buttons include "DISCUSSION - Discussion (Production)" and
     "DISCUSSION - Assign Editor", each over the line "This discussion
     template pre-fills the name, participants, and starting message. You
     can adjust the details before starting." (Rule 10; Settings bullet
     1).
   - **"Find Template"**: type "assign" in "Find Template": the list does
     not change; press Enter: "DISCUSSION - Assign Editor" is listed and
     "DISCUSSION - Discussion (Production)" is not; press the box's clear
     control: the whole list is back (Rule 10a).
   - **Choosing a template**: type "Layout check" in "Name", then press
     "DISCUSSION - Discussion (Production)": "Name" reads "Discussion
     (Production)", the message box "Please enter your message.", and
     "Enter task information" stays unticked (Rule 10b; Settings bullet 1)
     [A5](#a5).
   - **Placeholders filled on "Save"** {OJS OMP}: press "DISCUSSION -
     Assign Editor": "Name" reads "Assign Editor" and the message box holds
     a letter opening "Dear" and the recipient-name placeholder, shown as a
     tag; tick the Section Editor and press "Save": the discussion "Assign
     Editor" is listed under "In progress"; open it: its first message
     opens "Dear {the Section Editor's full name},", and so does the email
     the Section Editor receives (Rule 10d; Settings bullet 1). A preprint
     server's "Assign Editor" has no text [OPS1](#ops1).
   - **Control**: press "Add", type "production" in "Find Template" and
     press Enter: "DISCUSSION - Discussion (Production)" is listed again,
     so the "assign" search left it out by its words (Rule 10a).

4. **A task: begun, started, closed, overdue**

   Given: Journal Manager, on the Production stage of a submission with a
   Section Editor assigned, whose panel holds the task "Update the
   references", begun, owned by the Section Editor and due three days
   ago.

   - **"Begin Task Upon Saving"**: press "Add", type "Prepare the galley
     note" in "Name" and tick "Enter task information": the owner list
     offers only the Journal Manager; tick the Section Editor under
     "Participants": their radio button appears; choose them as owner,
     choose the date fourteen days from today in "Due Date", leave the
     drop-down at "Begin Task Upon Saving", type "Please prepare the galley
     note." in the message box and press "Save": the panel lists, under
     "In progress", a row reading "Task", "Prepare the galley note" and
     "Task Owner: {the Section Editor's username}", with that date under
     "Due Date" as year-month-day (Rules 3, 9, 16).
   - **"Create Task (Do Not Start)"**: add a second task the same way,
     "Check the proofs", owned by the Section Editor, due seven days from
     today, with "Please check the proofs." as its message and the
     drop-down set to "Create Task (Do Not Start)": it is listed under
     "Yet to begin"; the Section Editor receives an email whose subject is
     "Check the proofs" (Rule 9; Side effects).
   - **Started from the row**: Section Editor: open the submission at
     Production: the row of "Check the proofs" offers "More Actions", and
     its "Started" box can be ticked; tick it: "Start this task" asks "Are
     you sure you want to start this task?" with "Yes" and "No"; press
     "No": after a reload the task still sits under "Yet to begin"
     [A26](#a26); tick the box again and press "Yes": the task moves to
     "In progress", and its "Started" box stays ticked and greyed (Actors
     row 7; Rule 16).
   - **The start recorded**: Journal Manager: open "Check the proofs": the
     window shows "Task started by" and "Start Date"; its row's "More
     Actions" › "History" lists "Task initiated by {the Section Editor's
     username} ({roles}) on {date}" (Rules 12, 16, 18).
   - **Closed from the row**: Section Editor: tick the task's "Closed" box:
     "Close this Task" asks "Are you sure you want to close this task?
     Closing the task won't end the discussion - you can still send
     messages on it."; press "Yes": the task moves to "Closed"
     [A13](#a13), and its History adds "Task closed by {the Section
     Editor's username} on {date}" (Rules 17b, 17d).
   - **A reply on the closed task**: Journal Manager: open "Check the
     proofs": the badge reads "Closed"; press "Add New Message", type
     "Thanks, the proofs are final." and press "Save": the message is
     added, and the Section Editor receives it by email under the subject
     "Check the proofs" (Rule 13c; Side effects).
   - **The overdue task**: "Update the references" stays under "In
     progress", its "Activity" reads only "This task is overdue. Remind the
     task owner to complete it as soon as possible"; its window's badge
     reads "Overdue"; its History opens with that line, dated with the due
     date and with an empty "User" (Rule 2d).
   - **Control**: the window of "Prepare the galley note", due fourteen
     days from today, has the badge "In progress", not "Overdue" (Rule
     2d).

5. **Close, reopen, and turn a discussion into a task**

   Given: Journal Manager, on the Production stage of a submission with a
   Section Editor assigned, whose panel holds the discussion "Cover
   image" that the Journal Manager opened with the Section Editor.

   - **Closed from the row**: tick the row's "Closed" box: "Close this
     Discussion" asks "Are you sure you want to close this discussion?
     Closing the discussion won't stop you from sending or receiving
     messages in this thread - this ensures no message is lost." with
     "Yes" and "No"; press "No": after a reload the discussion still sits
     under "In progress" [A26](#a26); tick the box again and press "Yes":
     it moves to "Closed" (Rule 17a).
   - **The closed discussion's menu**: its "More Actions" offers "Edit",
     greyed, "History" and "Delete", and no "Add Task Details"; "History"
     lists "Discussion closed by {the Journal Manager's username} on
     {date}" (Rules 5, 17d).
   - **A reply on the closed discussion**: Section Editor: open "Cover
     image", press "Add New Message", type "One more change to the cover."
     and press "Save": the message is added, and the Journal Manager
     receives it by email under the subject "Cover image" (Rule 13c; Side
     effects).
   - **Reopened from the window**: Journal Manager: open "Cover image": the
     badge reads "Closed", the "Close this Discussion" box is ticked, the
     "Edit" button is greyed, and "Task Information" reads "You can
     convert this into a task by re-opening the discussion and clicking
     Edit."; untick the box and press "Save": nothing asks, the window
     shows "Saved" and the badge "In progress"; the row is back under "In
     progress", and its History adds "Discussion reopened by {the Journal
     Manager's username} on {date}" (Rules 12, 17a, 17d).
   - **"Add Task Details"**: choose it in the row's "More Actions": the
     window opens with "Enter task information" ticked and "Task
     Information" in view; choose the Section Editor as owner and the date
     seven days from today in "Due Date", and press "Save": the row reads
     "Task" and "Task Owner: {the Section Editor's username}" with that
     date, and its window still holds the two messages [A25](#a25)
     [A28](#a28) (Rule 15b).
   - **The task's menu**: "More Actions" offers "Edit", "History" and
     "Delete", and no "Add Task Details"; in "Edit", "Enter task
     information" is ticked and greyed (Fields; Rules 5, 15b).
   - **Control**: the Section Editor's mailbox gains no email with the
     subject "Cover image" from the close or the reopen, while the
     Journal Manager's holds the Section Editor's reply: closing and
     reopening email nobody (Rule 17d).

6. **Edit a discussion, read its History, delete it**

   Given: Journal Manager, on the Production stage of a submission with
   two Section Editors and its Author assigned, whose panel holds the
   discussion "Proof corrections", which the Journal Manager opened with
   the first Section Editor and the Author, its first message "Please
   send your corrections.".

   - **The row menu**: "More Actions" offers, in this order, "Edit", "Add
     Task Details", "History" and "Delete", the last in red (Rule 5).
   - **"Edit"**: choose it: a window titled "Production Tasks &
     Discussions" opens with the badge "In progress"; "Participants" lists
     the Journal Manager, the first Section Editor and the Author ticked,
     and the second Section Editor unticked; the message box holds "Please
     send your corrections." (Rules 7e, 15).
   - **The edit saved**: replace the name with "Final proof corrections",
     tick the second Section Editor, untick the Author, replace the message
     with "Please send your final corrections.", attach
     "profile-image-400.png" through "Attach Files" › "Upload File", and
     press "Save": the window closes and the row reads "Final proof
     corrections" (Rules 14, 15a).
   - **Who is told**: the second Section Editor receives an email whose
     subject is "Final proof corrections" and whose body is "Please send
     your final corrections." (Rule 15a; Side effects).
   - **The discussion window**: open "Final proof corrections": "Details"
     lists the Journal Manager and the two Section Editors, and the first
     message reads "Please send your final corrections.", with the date and
     time it had before the edit (Rules 12, 15a).
   - **"History"**: choose it in the row's "More Actions": a side window
     titled "History", with "Final proof corrections" under the title,
     shows a table "Date", "User", "Event", newest first, whose "User"
     cells give full names; its events include "{the second Section
     Editor's username} ({roles}) added by {the Journal Manager's username}
     ({roles}) on {date}", "{the Author's username} ({roles}) removed by …",
     "profile-image-400.png uploaded by {the Journal Manager's username} on
     {date}" with a "Download" link that downloads the file in place, and
     "Discussion created by {the Journal Manager's username} ({roles}) on
     {date}"; no line records the new name or the new text (Rules 15a,
     18).
   - **The Author's panel**: Author: open the submission at Production (on
     a preprint server, the "Production Tasks & Discussions" page of the
     preprint's entries): the panel no longer lists the discussion (Actors
     row 1).
   - **"Delete"**: Journal Manager: choose "Delete" in the row's "More
     Actions": a dialog titled "Delete" asks "Are you sure you wish to
     delete this item? This action cannot be undone." with "OK", in red,
     and "Cancel"; press "Cancel": the row stays; choose "Delete" again and
     press "OK": the row is gone, also after a reload; the first Section
     Editor's Tasks panel no longer holds the "Discussion added." row the
     discussion gave them (Rule 19).
   - **Control**: the Author and the first Section Editor have no email
     with the subject "Final proof corrections", while the second Section
     Editor has one: the edit told only the newly added participant
     (Rule 15a).

7. **The Author's discussions**

   Given: Author, on their submission at Production (on a preprint
   server, the "Production Tasks & Discussions" page of the preprint's
   entries), with a Section Editor assigned and the Journal Manager not
   assigned; the panel holds "Proof queries", a discussion the Section
   Editor opened with the Author, and "Editorial notes", one the Journal
   Manager opened with the Section Editor.

   - **The Author's panel**: it lists "Proof queries" under "In
     progress", its row with no "More Actions" button (Actors rows 1, 5).
   - **The reply**: open "Proof queries": the window has no "Edit" button;
     press "Add New Message", type "The proofs look fine." and press
     "Save": the message is added at the end, headed "Message from {the
     Author's username}", and the Section Editor receives it by email
     under the subject "Proof queries" (Actors row 4; Rules 12, 13b).
   - **Who the Author is offered**: press "Add": "Participants" lists the
     Author as "{full name} ({username}) (Me)", ticked, and the Section
     Editor, and not the Journal Manager (Rules 7, 7a).
   - **The creator unticked**: type "Figure 3" in "Name" and "Here is the
     corrected figure 3." in the message box, untick the Author's own box,
     tick the Section Editor and press "Save": "At least two participants
     are required for a discussion." and "The creator must participate in
     the task/discussion." show under "Participants", since the Section
     Editor alone is one participant (Rules 8, 8a, 8b).
   - **An uploaded file**: tick the Author's own box again, press "Attach
     Files" on the message box: the "Attach Files" window offers "Upload
     File" and no "Workflow Files"; upload "profile-image-400.png": it is
     listed under the box with a remove control; press "Save": the panel
     lists "Figure 3" with "Created by: {the Author's username}", and its
     window shows a link to "profile-image-400.png" under the message that
     downloads the file (Actors row 9; Rules 12, 14, 14b).
   - **The Section Editor's email**: its subject is "Figure 3", its From
     line names the Author, and "profile-image-400.png" is attached (Rule
     14b; Side effects).
   - **The Journal Manager, not a participant**: Journal Manager: open the
     submission at Production: the panel lists "Proof queries" and "Figure
     3"; open "Figure 3": in place of "Add New Message" it reads "To add a
     new message, please assign yourself as a participant." (Actors rows
     1, 4).
   - **Control**: the Journal Manager's panel also lists "Editorial
     notes", which the Author's panel did not (Actors row 1).

8. **Manage the templates**

   Given: Journal Manager, on a scratch journal's Settings › Workflow ›
   "Tasks and Discussions" tab, its templates at the install default,
   with a Section Editor and an Author assigned to a submission at
   Production whose panel holds "Layout notes", a discussion the Journal
   Manager opened with the Section Editor.

   - **The screen**: a table "Tasks and Discussions Templates" with the
     line "Use this space to create templates for tasks and discussions.
     These templates automatically fill in the task name, due date,
     description, and roles, giving you a head start."; the groups
     "Submission Stage", "Review Stage", "Copyediting Stage" and
     "Production Stage" (on a press "Internal Review Stage", reading "No
     Items", and "External Review Stage" in place of "Review Stage"; on a
     preprint server "Production Stage" alone), each with "Add template";
     "Production Stage" lists "Discussion (Production)" and "Assign Editor"
     among its templates, under the columns "Task and discussion template
     name" and "Auto-add at stage", their boxes unticked (Rule 25a;
     Settings bullets 1, 2).
   - **Required fields**: press "Add template" on "Production Stage": a
     window titled "Add Task and Discussion Template in Production Stage"
     opens; choose "Limit access to specific roles", tick "Enter task
     information" and press "Save": "This field is required." shows under
     "Name", "Limit access to specific roles", "Due Date" and the message
     box (Fields; Rule 25b) [A21](#a21).
   - **A limited task template**: type "Proof check" in "Name", tick
     "Section editor" ("Series editor" on a press, "Moderator" on a
     preprint server), choose "2 weeks from the creation date" in "Due
     Date", type "Please check the proofs." in the message box and press
     "Save": the window closes and "Production Stage" lists "Proof check"
     first (Rules 25a, 25b; Settings bullets 3, 4).
   - **"Edit"**: choose it in the row's "More Actions": a window titled
     "Edit Task and Discussion Template" opens; replace the name with
     "Final proof check" and press "Save": the list shows "Final proof
     check" (Rule 25b).
   - **The Section Editor's "Add" window**: Section Editor: open the
     submission at Production and press "Add": the templates include
     "TASK - Final proof check" over the line "This task template
     auto-fills the task name, due date, description, and roles. After
     selecting the template, you can modify any details before saving the
     task."; press it: "Name" reads "Final proof check", the message box
     "Please check the proofs.", "Enter task information" is ticked,
     "Due Date" is today plus two weeks and no owner is chosen; choose the
     Section Editor as owner and press "Save": the task "Final proof
     check" is listed under "In progress" (Rules 9, 10, 10b; Settings
     bullets 3, 4).
   - **The Author's "Add" window**: Author: open the submission at
     Production (on a preprint server, the "Production Tasks &
     Discussions" page of the preprint's entries) and press "Add": the
     templates include "DISCUSSION - Discussion (Production)" and no
     "TASK - Final proof check" (Actors row 10; Settings bullet 3).
   - **A task template on a discussion's "Edit"**: Journal Manager: on the
     submission, choose "Edit" in the "More Actions" of "Layout notes":
     the templates include "TASK - Final proof check"; press it: "Apply
     Template" asks "Applying this template will replace information in
     related fields on the form. These changes won't be saved unless you
     choose to save. Continue?"; press "No": "Name" still reads "Layout
     notes"; press the template again and "Yes": "Name" reads "Final
     proof check", "Enter task information" is ticked and "Due Date" is
     set; press "Cancel", then "Yes" in the "Warning": the row still reads
     "Discussion" and "Layout notes" (Rules 10c, 11c).
   - **"Delete"**: on the "Tasks and Discussions" tab, choose "Delete" in
     the "More Actions" of "Final proof check": the dialog "Delete" asks
     "Are you sure you wish to delete this item? This action cannot be
     undone."; press "OK": the template leaves the list; the Section
     Editor's "Add" window no longer lists it, and the task "Final proof
     check" stays in the panel (Rule 25c).
   - **The Section Editor refused**: Section Editor: open the address of
     the Journal Manager's Settings › Workflow page: the page reads "The
     current role does not have access to this operation." (Actors row
     11).
   - **Control**: the Journal Manager, at the same address, has the
     "Tasks and Discussions" tab (Actors row 11).

9. **"Auto-add at stage"**

   Given: Journal Manager, on a scratch journal's Settings › Workflow ›
   "Tasks and Discussions" tab, its templates at the install default,
   with a Section Editor and an Author; once the box is on, the Author's
   submission arrives, the Section Editor assigned, with no message or
   comment.

   - **Switching it on**: tick the "Auto-add at stage" box of "Discussion
     (Submission)" under "Submission Stage" ("Discussion (Production)"
     under "Production Stage" on a preprint server): "Confirm Automatic
     Addition" asks "Are you sure you want this task/discussion template to
     be automatically added when a submission reaches the {stage}?" with
     "Yes" and "No"; press "No": after a reload the box is unticked
     [A26](#a26); tick it again and press "Yes": "Your changes have been
     saved." shows at the top right, and the template's "Edit" window
     shows "Automatically add this task and/or discussion when a
     submission reaches the stage" ticked (Rule 26a; Settings bullet 2).
   - **The item the template makes**: Journal Manager: open the
     submission at the Submission stage (Production on a preprint server):
     its panel lists "Discussion (Submission)" ("Discussion (Production)")
     under "In progress", with "Created by: system" and an empty "Due
     Date"; its window lists nobody under "Details", and its one message,
     headed "Message from system", reads "Please enter your message."
     (Rules 3, 21, 26b; Settings bullet 1) [A18](#a18).
   - **Not yet the Section Editor's**: Section Editor: the same panel does
     not list the discussion (Rule 21).
   - **Participants added**: Journal Manager: choose "Edit" in the
     discussion's "More Actions"; with the Section Editor the only box
     ticked, press "Save": "At least two participants are required for a
     discussion." shows under "Participants"; tick the Journal Manager's
     own box too and press "Save": the window closes; Section Editor: the
     panel now lists the discussion (Rules 8a, 21).
   - **Control**: the panel holds no item named "Assign Editor", the
     stage's other template, whose "Auto-add at stage" stayed off
     (Settings bullet 2).

App-specific:

10. **{OJS OMP} The Copyeditor's task**

    Given: Copyeditor, on the Copyediting stage of a submission with a
    Section Editor and the Copyeditor assigned, whose "Copyediting Tasks &
    Discussions" panel holds "Copyedit the manuscript", a task between the
    Journal Manager, who created it, and the Copyeditor, its owner, not
    started and due fourteen days from today, and "Editorial notes", a
    discussion between the Journal Manager and the Section Editor.

    - **The Copyeditor's panel**: it lists "Copyedit the manuscript" under
      "Yet to begin", with "Task Owner: {the Copyeditor's username}", and
      its "More Actions" offers "Edit" [A6](#a6), "History" and "Delete"
      (Actors rows 1, 5; Rule 5).
    - **Started from the window**: open "Copyedit the manuscript": the
      badge reads "Yet to begin" and "Task Information" shows its "Due
      Date", its owner and the "Start this task" box; tick it and press
      "Save": nothing asks, the window shows "Saved" and the badge "In
      progress", and "Task Information" adds "Task started by" and "Start
      Date" (Rules 12, 16).
    - **A reply with a file**: press "Add New Message", then "Attach Files"
      on the box: the "Attach Files" window offers "Upload File" and
      "Workflow Files"; upload "notes.md", type "Copyedits done; my notes
      are attached." and press "Save": the message shows a link to
      "notes.md" (Actors row 9; Rules 13b, 14b).
    - **Completed from the window**: tick "Complete this task" and press
      "Save": the badge reads "Closed" (Rule 17b).
    - **The Journal Manager's side**: Journal Manager: the task sits under
      "Closed"; its "History" includes "Task initiated by {the
      Copyeditor's username} ({roles}) on {date}", "{the Copyeditor's
      username} ({roles}) posted a response on {date}", "notes.md uploaded
      by {the Copyeditor's username} on {date}" with a "Download" link, and
      "Task closed by {the Copyeditor's username} on {date}"; the Journal
      Manager's mailbox holds the reply under the subject "Copyedit the
      manuscript", with "notes.md" attached (Rules 16, 17d, 18; Side
      effects).
    - **Control**: the Journal Manager's panel lists "Editorial notes",
      which the Copyeditor's panel did not (Actors row 1).

    A preprint server has no Copyediting stage and no Copyeditor; the
    Moderator's task in scenario 4 is its analogue.

11. **{OJS OMP} Reviewers and the Author on a review stage**

    Given: Section Editor, assigned to a submission in its first review
    round with its Author and two Reviewers who accepted, under the
    journal's default review type "Anonymous Reviewer/Anonymous Author";
    and, on a scratch journal whose "Default Review Mode" is "Open", a
    Section Editor assigned to a submission in review with its Author, one
    Reviewer who accepted, one who has not answered and one who declined.

    - **Who the Section Editor is offered**: on the review round, press
      "Add" on "Review Tasks & Discussions": "Participants" lists the
      Section Editor "(Me)", the Author and both Reviewers, each Reviewer
      with "Round 1 - Anonymous Reviewer/Anonymous Author" under the name
      and, on a journal, "Reviewer" as the role [OMP1](#omp1) (Rules 7,
      7a, 7b, 20).
    - **Two reviewers**: type "Question for the reviewer" in "Name" and
      "Please look again at figure 2." in the message box, tick both
      Reviewers and press "Save": "Cannot disclose the identity of
      reviewers in the task/discussion." shows under "Participants" (Rule
      8d).
    - **A reviewer with the Author**: untick the second Reviewer, tick the
      Author and press "Save": "Cannot allow participation of authors
      together with reviewers in a task/discussion during anonymous
      reviews." shows under "Participants" (Rule 8d).
    - **Saved**: untick the Author and press "Save": the panel lists
      "Question for the reviewer" under "In progress", with "Created by:
      {the Section Editor's username}" and a "More Actions" button
      (Actors, "May manage the item"; Rule 3).
    - **The Reviewer's panel**: the first Reviewer: open the review and go
      on to step 3 of the review form: its "Review Tasks & Discussions"
      panel lists "Question for the reviewer"; open it, press "Add New
      Message", type "Figure 2 is fine now." and press "Save": the Section
      Editor receives the message by email under the subject "Question
      for the reviewer" (Actors rows 1, 4; Rule 13b).
    - **Who the Reviewer is offered**: press "Add" on the same panel:
      "Participants" lists the Reviewer "(Me)" and the Section Editor, and
      neither the Author nor the other Reviewer (Rule 7d).
    - **The Author on the review stage**: Author: open the submission at
      its review round and press "Add" on "Review Tasks & Discussions":
      "Participants" lists the Section Editor and no Reviewer; the panel
      does not list "Question for the reviewer" (Actors row 1; Rule 7c).
    - **A cancelled request**: Section Editor: cancel the first Reviewer's
      request with "Cancel Reviewer" on the Reviewers panel: "Question for
      the reviewer" stays in the panel, and its window lists the Section
      Editor alone under "Details" (Rule 23) [A20](#a20).
    - **The Section Editor's list after the cancel**: press "Add": the
      second Reviewer is still listed, and the first is not (Rule 7b).
    - **An "Open" review, the Section Editor's list**: on the scratch
      journal, the Section Editor's "Add" lists the Reviewer who accepted,
      with "Round 1 - Open" under the name, and neither the Reviewer who
      has not answered nor the one who declined (Rule 7b; Settings bullet
      5).
    - **An "Open" review, the Author's discussion**: Author: on the same
      submission, press "Add" on "Review Tasks & Discussions":
      "Participants" lists the Reviewer who accepted, with "Round 1 -
      Open"; type "About point 3" in "Name" and "Could you say more about
      point 3?" in the message box, tick the Reviewer and press "Save":
      the discussion is listed under "In progress"; Reviewer: the panel at
      step 3 of the review form lists "About point 3" (Rules 7c, 8d;
      Settings bullet 5).
    - **Control**: on the seeded journal, the Author's "Add" listed no
      Reviewer, where the "Open" review's Author is offered one: the review
      type alone makes the difference (Rule 7c; Settings bullet 5).

    A preprint server has no review stage, so this scenario has no
    analogue there.

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - no leave-page question once the window has closed, by "Save", by "Warning" › "Yes" or untouched (Rule 11d; A22 retired)
  - the "Select submission stage" list of "Workflow Files" offering the stages up to Production and never Done (Rule 14a): likely a bullet in scenario 1's "A workflow file", read before "Submission" is chosen
  - the browser's leave-page prompt while the window holds unsaved changes (Rule 11d)
  - an edit of the comments-box discussion, by the submitting Author within the hour and by the Journal Manager, and of the recommendation discussion, each replacing the first message in place (Rules 15a, 15c, 21; A9 no longer covers them)
- **Rarely met**:
  - a participant whose account is disabled: still named on their items and ticked in "Edit", not offered to new items, sent no email and no Tasks row (Rule 22; Side effects)
- **Nothing new to test**:
  - the Editor, the Production editor and the Site Administrator (Actors, "Manager-level"): the Journal Manager's offer, which the scenarios read as the Journal Manager
  - the Guest Editor {OJS} (Actors rows 1, 9; Rule 15c): the Section Editor's offer, which scenarios 1, 8 and 11 read
- **Register carries it**:
  - A1 (a press and a preprint server failing the notices as shipped; Side effects; scenario 1 marks it)
  - A3 (the writer's own copy of each message and its Tasks row; Side effects)
  - A4 (a "Find Template" search holding "discussion" or "task" ending in an "Error" window; Rule 10a)
  - A6 and A7 (a task owner's refused edit, and the raw key a press and a preprint server show for it; Rule 15c; scenario 10 marks A6)
  - A8 (an Author's edit of a first message carrying an upload; Rule 15d)
  - A9 (an edit of a discussion a Participants message opened, and the Author or assistant it was sent to saving it at any time; Rules 15c, 15e)
  - A13 (a closed task that cannot be reopened; Rule 17c; scenario 4 marks it)
  - A15 (the panel in French; Rule 24)
  - A16 (a task due today reading "Overdue"; Rule 2d)
  - A17 (a closed task past its due date still reading overdue; Rule 2e)
  - A18 (an auto-added item's empty "Activity" and History; Rule 4; scenario 9 marks it)
  - A19 (the role line under a manager-level participant, per viewer; Rule 7)
  - A20 (a discussion left with one participant, refused on "Edit"; Rule 7e; scenario 11 marks it)
  - A21 (the error list's "Go to undefined"; Rule 11a; scenarios 2 and 8 mark it)
  - A23 (the convert hint shown to people without "Edit"; Rule 12)
  - A24 and OPS2 ("Workflow Files" stages that show an assistant nothing, and a preprint server's empty "Production"; Rule 14a)
  - A25 and A28 (a converted task not begun, and its History's "Task created by"; Rules 15b, 18; scenario 5 marks them)
  - A26 (what a screen reader hears after "No" in a row box's question; Rule 16; scenarios 4, 5 and 9 mark it)
  - A27 (the History during Login As; Rule 18)
  - A29 (a file attached in the "Add" window missing from the History; Rule 18)
  - A30 (a task whose owner is taken off, left with no owner; Rule 23)
  - A31 (an auto-added item's unfilled placeholders; Rule 26b)
  - OMP1 (a press's reviewers listed as "Internal Reviewer"; Rule 20; scenario 11 marks it)
  - OPS1 (a preprint server's empty "Assign Editor" template; Rule 10e; scenario 3 marks it)
- **No seed**:
  - an edit an hour after the first message, refused to the Author and the assistant roles (Rule 15c; A12)
- **Owned by another feature**:
  - an assigned Production editor refused the Submission stage, and so its panel (Actors, "Manager-level"; *Workflow screen & stage access*, and *Stage participants*, whose A8 records it)
  - a person removed on the Participants panel taken off the items (Rule 23; *Stage participants*, scenario 5)
  - the comments-box discussion (Rule 21; *Submission wizard*, scenario 2) and the recommendation discussion (Rule 21; *Editorial decision recording*, scenario 5)
  - the person's "Discussion added." boxes unticked (Settings bullet 6; Side effects; *Notifications center*, scenarios 3 and 4 for the boxes, scenario 5 for a discussion's email)
  - the stage's notice box after a save (Side effects; *Copyediting stage*, scenario 3, and *Production stage*, scenario 3)
  - the Activity Log's email and file lines (Side effects; *Submission activity log & notes*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-23), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | On a press and a preprint server as shipped, saving a discussion or a reply ends in an error dialog, and nobody is emailed or told | 🐞 | user-visible · crash: server | — |
| [A2](#a2) | The "Add" window's subtitle reads "Open for What? Open to What? Beyond Content" | 🐞 | minor | — |
| [A3](#a3) | The writer of a message receives it by email and as a Tasks row | 🐞 | minor | — |
| [A4](#a4) | Searching "Find Template" for the word "discussion" or "task" opens an "Error" window when adding or editing a discussion | 🐞 | low · crash: server | issues (claude), 2026-09-30 — re-verified |
| [A5](#a5) | Choosing a template leaves "Participants" as it was, though the template says it fills them | 🐞 | minor | — |
| [A6](#a6) | A task's owner who did not write its first message is offered "Edit" and refused on "Save" | 🐞 | user-visible | — |
| [A7](#a7) | On a press and a preprint server the edit refusals show a raw key | 🐞 | minor | — |
| [A8](#a8) | An Author cannot save an edit of a discussion whose first message has an uploaded file, and the refusal names no field | 🐞 | user-visible | — |
| [A9](#a9) | Editing a discussion a Participants message opened adds a second message, under the name of the person it was sent to | 🐞 | user-visible | — |
| [A10](#a10) | A past "Due Date" is refused with "Start date should be greater than or equal to today" | 🐞 | minor | — |
| [A16](#a16) | A task due today already reads "Overdue" | 🐞 | minor | — |
| [A17](#a17) | A closed task past its due date still reads "This task is overdue. Remind the task owner…" | 🐞 | minor | — |
| [A21](#a21) | The error list read to a screen reader calls the message box "undefined" | 🐞 | minor | — |
| [A24](#a24) | An assistant's "Workflow Files" offers stages that show nothing | 🐞 | minor | — |
| [A25](#a25) | A discussion turned into a task reads "Begin Task Upon Saving" but is not begun | 🐞 | minor | — |
| [A26](#a26) | After "No" in a row box's question, a screen reader hears the opposite state | 🐞 | minor | — |
| [A28](#a28) | A discussion turned into a task reads "Task created by …" in its History | 🐞 | minor | — |
| [A29](#a29) | A file attached in the "Add" window never appears in the item's History | 🐞 | minor | — |
| [A31](#a31) | An auto-added item's letter keeps "{$recipientName}" and the sender placeholder | 🐞 | minor | — |
| [OMP1](#omp1) | A press lists its External Review reviewers as "Internal Reviewer" or "External Reviewer", varying | 🐞 | minor | — |
| [OPS1](#ops1) | A preprint server's "Assign Editor" template has no text, and choosing it leaves the message box showing text "Save" ignores | 🐞 | minor | — |
| [A12](#a12) | An hour after writing it, an Author or assistant can change nothing in their own discussion | ❓ | user-visible | — |
| [A13](#a13) | A closed task cannot be reopened | ❓ | minor | — |
| [A14](#a14) | A reviewer of an "Anonymous Reviewer/Disclosed Author" review is offered the Author and refused on "Save" | ❓ | minor | — |
| [A15](#a15) | With the interface in French every panel and window shows raw keys | ❓ | minor | — |
| [A18](#a18) | An item another screen or an auto-added template opened has an empty "Activity" and no History | ❓ | minor | — |
| [A19](#a19) | The role line under a manager-level participant depends on who looks | ❓ | minor | — |
| [A20](#a20) | A discussion left with one participant after a removal cannot be saved from "Edit" | ❓ | minor | — |
| [A23](#a23) | The hint "You can convert this into a task by clicking Edit." shows to people who have no "Edit" | ❓ | minor | — |
| [A27](#a27) | During Login As, a reply is headed with one person's name and logged under another's | ❓ | minor | — |
| [A30](#a30) | A task whose owner leaves the submission is left with no owner, and nothing says so | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server offers a "Workflow Files" source that never holds a file | ❓ | minor | — |
| [A11](#a11) | Retired: "Cancel" asks before discarding, like the close control | ✅ | retired | — |
| [A22](#a22) | Retired: leaving the page after a discarded window asks nothing | ✅ | retired | — |

### All apps

<a id="a1"></a>
**A1 — A press and a preprint server fail on saving a discussion** · 🐞 · user-visible · crash: server.
On a press and a preprint server, as the applications ship, "Save" on a
new discussion or task or a reply on any stage, or on an edit on
Copyediting or Production, shows an error dialog reading `Class
"APP\notification\Notification" not found`. The item or message is
stored and appears once the panel reloads, but no participant is emailed
and no Tasks row is raised. A journal, or a test install (which adds
that class), is not affected.
Since: 2026-02-10 · Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — Placeholder text under the "Add" window's title** · 🐞 · minor.
Every "Add" and "Edit" window, for every role, shows "Open for What? Open
to What? Beyond Content" under its title, a sentence that says nothing
about the window; a tester would expect a line describing the form, or
nothing.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — The writer is told of their own message** · 🐞 · minor.
Opening a discussion or replying emails the writer a copy of what they
just wrote and adds a "Discussion added." row to their own Tasks panel.
The writer expects only the other participants to be told; before the
2026 rework the writer was left out.
Since: 2026-02-10 · Basis: probe. <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Searching "Find Template" for the word "discussion" or "task" opens an "Error" window when adding or editing a discussion** · 🐞 · low · crash: server.
In the "Add" or "Edit" window of a task or discussion, a "Find Template"
search fails on the server when it includes one of the words
"discussion", "discussions", "task" or "tasks" as a separate word,
alone or with other words. A window "Error" opens with a programming
error and "OK", and the template list reads "No items found.". Even a
template's full name, "Discussion (Production)", fails this way.
These words are meant to narrow the list to one kind of template.
Every template the application installs is a discussion, and a manager
can add task templates in Settings, so "task" is the one search that
would list only those.
Only `main` has tasks, discussion templates and this search; no
released version does, so the fault would ship with the next release
unless fixed.
Basis: probe, 2026-10-01. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A template does not fill "Participants"** · 🐞 · minor.
Each template button says the template "pre-fills the name, participants,
and starting message", and a template limited to some roles names the
people meant to receive it. Choosing one fills the name and the message
but leaves "Participants" exactly as it was.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — A task's owner cannot save an edit** · 🐞 · user-visible.
The "Task Owner" of a task someone else opened, when that owner is an
assistant role or the Author, is offered "Edit", but "Save" is refused
with "You can only edit your own discussion message." under the message
box (a raw key on a press and a preprint server, A7), even when they
changed only the due date or ticked one more participant. The person the
task is handed to cannot move its due date.
Basis: probe. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Raw keys for the edit refusals on a press and a preprint server** · 🐞 · minor.
Where a journal refuses an edit with "You can only edit your own
discussion message." or "This discussion message can only be edited
within 1 hour of creation.", a press and a preprint server print
"##submission.task.validation.error.headnote.author##" or
"##submission.task.validation.error.headnote.editExpired##".
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — An Author's discussion with an upload cannot be edited** · 🐞 · user-visible.
An Author who attached an uploaded file to the first message of their
discussion opens "Edit", changes only "Name" and presses "Save". The
window stays open with the notice "The form was not saved because 1
error(s) were encountered. Please correct these errors and try again."
and "Please correct one error.", but no field shows an error, and "Save"
stays greyed for the rest of that window, even after the file's
"Remove". A screen reader hears the error list's only entry as "Go to
submissionFileIds: ##validator.prohibited##". Only pressing the file's
"Remove" first, in a fresh "Edit" window, lets the save through, and
that takes the file off the message.
A Copyeditor with an upload of their own, and the Journal Manager, save
the same edit.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Editing a Participants message's discussion adds a second message** · 🐞 · user-visible.
A discussion opened by a Participants "Notify" or "Assign" shows its
first message in "Edit". The first "Save", even one that only renames
the item, does not replace that message: the discussion window then
shows the original first message and, after it, a second message with
the box's text, headed with the name the row gives as "Created by:"
(the person the message went to), whoever pressed "Save". Later saves
rewrite that second message. The History records nothing, so the text
reads as written by someone who never wrote it. An Author or assistant
role the message went to saves this way at any time, though Rule 15c
holds everyone else in those roles to their own first message and its
first hour.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — A due-date refusal speaks of a start date** · 🐞 · minor.
A "Due Date" before today, typed into the box, is refused on "Save" with
"Start date should be greater than or equal to today"; the form has no
start date.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a12"></a>
**A12 — The one-hour limit locks the whole item** · ❓ · user-visible.
An Author or an assistant role may change the first message of their
own discussion or task for an hour only. Because every "Save" of "Edit"
sends that message back, after the hour they can change nothing in the
item: not its name, participants, due date or owner.
Question: should the hour bind the message only? Lean: yes; the limit
protects what others have read, not the item's other fields.
Basis: probe. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — A closed task cannot be reopened** · ❓ · minor.
Once a task is closed its "Closed" box and its window's "Complete this
task" are greyed for everybody, a Journal Manager included, while a
closed discussion reopens with one press.
No screen shows the application's own texts "Reopen this task" and "Are you sure you want to reopen this task?".
Question: may a closed task be reopened? Lean: intended as built (the
screen blocks it on purpose), with the unused texts a leftover.
Basis: probe. <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — A reviewer is offered an Author they may not add** · ❓ · minor.
A reviewer whose review is "Anonymous Reviewer/Disclosed Author" sees the
Author under "Participants"; ticking them and pressing "Save" is refused
with "Cannot allow participation of authors together with reviewers in a
task/discussion during anonymous reviews.".
Question: should the Author be left off the reviewer's list, as for an
"Anonymous Reviewer/Anonymous Author" review? Lean: yes; the refusal is
right (it keeps the reviewer hidden from the Author), the offer is not.
Basis: probe. <sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — Raw keys in French** · ❓ · minor.
With the interface in French, every Tasks & Discussions panel (the
editorial ones and the Reviewer's), its windows and the "Add" window
show raw keys such as "##discussion.description##",
"##common.yetToBegin##", "##common.closed##", "##task.owner##" and
"##submission.event.task.created##" in place of text, on a journal, a
press and a preprint server. A preprint server's panel heading is raw
too ("##submission.queries.production##"), where a journal and a press
read "Discussions sur la production". The "Add" window's template search
box reads "Trouver un modèle de courriel" ("find an email template"),
though these templates are not email templates.
Question: should a text the translation lacks fall back to English?
Lean: yes; that fallback is *Languages & locales*' to settle, the
missing French texts and the search box's wording a translation gap.
Basis: probe. <sup>[f-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — A task due today is already overdue** · 🐞 · minor.
A task whose "Due Date" is today reads "Overdue" in its window, and its
"Activity" and History open with "This task is overdue. Remind the task
owner to complete it as soon as possible" from the start of that day,
although the owner still has the day to finish it.
Basis: probe. <sup>[f-a16](#fn-a16)</sup>

<a id="a17"></a>
**A17 — A closed overdue task still asks for a reminder** · 🐞 · minor.
Once a task past its due date is closed, its row under "Closed" still
reads "This task is overdue. Remind the task owner to complete it as
soon as possible" in "Activity" instead of "Task closed by …", and its
History still opens with that line; only the window's badge changes to
"Closed". A finished task tells people to chase its owner.
Basis: probe. <sup>[f-a17](#fn-a17)</sup>

<a id="a18"></a>
**A18 — Items other screens open record no start** · ❓ · minor.
An item opened by a Participants message, the submission wizard's
comments box, a recommendation or an auto-added template shows an empty
"Activity" cell, and its History reads "No Items". Nothing records when
it began or who opened it, where an item made with "Add" starts with
"Discussion created by …".
Question: should these items record their creation? Lean: yes; the
History is where participants look for how an item began.
Basis: probe. <sup>[f-a18](#fn-a18)</sup>

<a id="a19"></a>
**A19 — The role line depends on who looks** · ❓ · minor.
Under "Participants", a Journal Manager assigned to the submission as
Section Editor reads "Section editor, Journal manager" to another Journal
Manager and to the Site Administrator, but "Section editor" to
themselves, to the other editors and to the Author. One person carries
two role lines depending on the viewer.
Question: should the line read the same for everyone? Lean: yes; either
every viewer sees the manager-level role or none does.
Basis: probe. <sup>[f-a19](#fn-a19)</sup>

<a id="a20"></a>
**A20 — A discussion left with one participant cannot be edited** · ❓ · minor.
When a person removed on the Participants panel leaves a two-person
discussion (Rule 23), the one participant left cannot save anything from
"Edit", not even a new name: "Save" is refused with "At least two
participants are required for a discussion.".
Question: should "Edit" keep working on such an item? Lean: yes; the
item was valid when made, and a rename should not need a second person.
Basis: probe. <sup>[f-a20](#fn-a20)</sup>

<a id="a21"></a>
**A21 — The error list calls the message box "undefined"** · 🐞 · minor.
When "Save" is refused with the message box empty, the error list beside
the buttons, as a screen reader reads it, names each field ("Go to Name:
This field is required.") but calls the message box "Go to undefined:
This field is required.", in the "Add", "Edit" and template windows. A
screen-reader user cannot tell which field is meant.
Basis: probe. <sup>[f-a21](#fn-a21)</sup>

<a id="a23"></a>
**A23 — The convert hint shows to people who cannot convert** · ❓ · minor.
A discussion's window tells every participant "You can convert this into
a task by clicking Edit.", also one who has no "Edit" (a Section Editor
who did not create it, the Author, a Reviewer).
Question: should the hint show only to whoever has "Edit"? Lean: yes;
for the others it points at a button they do not have.
Basis: probe. <sup>[f-a23](#fn-a23)</sup>

<a id="a24"></a>
**A24 — An assistant's "Workflow Files" stages show nothing** · 🐞 · minor.
On a journal and a press, a Copyeditor or Layout Editor in a discussion
is offered every stage under "Select submission stage", but choosing
"Submission" or "Review" ("Internal Review" or "External Review" on a
press) shows nothing between the list and "Back": no file list and no
"No Items". Only "Copyediting" and "Production" show their files. The
assistant is offered sources that neither list files nor say why not.
Basis: probe. <sup>[f-a24](#fn-a24)</sup>

<a id="a25"></a>
**A25 — A converted task is not begun** · 🐞 · minor.
When "Add Task Details" or "Edit" turns a discussion into a task, the
drop-down under "Task Information" reads "Begin Task Upon Saving",
greyed, but "Save" leaves the new task under "Yet to begin", not
started. The window promises a start it does not make.
Basis: probe. <sup>[f-a25](#fn-a25)</sup>

<a id="a26"></a>
**A26 — After "No", a screen reader hears the opposite state** · 🐞 · minor.
After "No" in a row box's question ("Start this task", "Close this
Discussion", "Reopen this Discussion", "Close this Task", and the
template screen's "Confirm Automatic Addition"), nothing is saved and
the box still looks as it did, but a screen reader hears the opposite
state ("checked" for a task that was not started, "not checked" for a
discussion that stays closed) until the page is reloaded.
Basis: probe. <sup>[f-a26](#fn-a26)</sup>

<a id="a27"></a>
**A27 — During Login As, one reply is credited to two people** · ❓ · minor.
When a Journal Manager uses Login As on a Section Editor and replies,
the message reads "Message from {the Section Editor's username}" and its
email comes from the Section Editor's address, while the History's
"Event" and the row's "Activity" read "{the Journal Manager's username}
(Journal manager) posted a response on {date}". "User" names both:
"{the Journal Manager's name} (acting as {the Section Editor's name})".
Question: which account should "Event" name? Lean: the account the
message is shown under, as "User" already names both people.
Basis: probe. <sup>[f-a27](#fn-a27)</sup>

<a id="a28"></a>
**A28 — A converted discussion's History says it began as a task** · 🐞 · minor.
Once "Add Task Details" or "Edit" turns a discussion into a task, the
History's first line reads "Task created by {username} ({roles}) on
{date}", where the row's "Activity" read "Discussion created by …"
before. Nothing records the change itself beyond "Task assigned to
{owner} by …", so the History misstates how the item began.
Basis: probe. <sup>[f-a28](#fn-a28)</sup>

<a id="a29"></a>
**A29 — A file attached in the "Add" window never shows in the History** · 🐞 · minor.
A file attached to the first message in the "Add" window gets no "{file
name} uploaded by …" line in the item's History, so it has no
"Download" row there; files attached to replies or added by "Edit" do.
Its removal through "Edit" is logged ("… removed by …"), so the History
shows the file leaving but never arriving.
Basis: probe. <sup>[f-a29](#fn-a29)</sup>

<a id="a30"></a>
**A30 — A task loses its owner silently** · ❓ · minor.
When a task's owner is removed from the submission (Rule 23), the task
stays with no owner: its row reads "Task Owner:" with nothing after it,
and its History records nothing of the removal. An ownerless task cannot
be started (Rule 16), and nothing on the panel says why.
Question: should the History record who left? Lean: yes; the stage needs
to know the task wants a new owner.
Basis: probe. <sup>[f-a30](#fn-a30)</sup>

<a id="a31"></a>
**A31 — An auto-added item keeps placeholders in its letter** · 🐞 · minor.
An item "Auto-add at stage" makes shows the template's text under
"Message from system" with the submission's title and the journal's name
filled in, but the recipient and sender placeholders left as they are:
"Galleys Complete" reads "Dear {$recipientName}," and ends
"{$signature}" on a journal ("{$senderName}" on a press). The same
template chosen in the "Add" window fills them on "Save" (Rule 10d).
Basis: probe. <sup>[f-a31](#fn-a31)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — A press's reviewers read "Internal Reviewer" on External Review** · 🐞 · minor.
On a press, the External Review stage's reviewers are listed under
"Participants" as "Internal Reviewer" or "External Reviewer", varying
from one press to the next and between the Press Manager's, the
Author's and the reviewer's own windows. A journal prints "Reviewer".
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — The preprint server's "Assign Editor" template is empty** · 🐞 · minor.
A preprint server installs its Production Stage template "Assign Editor"
with no text. Choosing it in the "Add" window fills "Name" and leaves
the message box as it was (empty on a fresh window, the typed text
otherwise), yet "Save" answers "This field is required." under the box
until something is typed into it. Under Settings its "Discussion" box is
empty and "Save" is refused with "This field is required.". With
"Auto-add at stage" on, it makes a discussion with no first message. A
journal's and a press's "Assign Editor" carry a letter.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — An empty "Workflow Files" source** · ❓ · minor.
On a preprint server, "Attach Files" › "Workflow Files" offers
"Production" alone under "Select submission stage", and its "Production
Ready Files" list reads "No Items" on every preprint, a preprint
server's files being its galleys. The source is offered but never holds
a file.
Question: should a preprint server offer "Workflow Files"? Lean: no, a
defect; hide it, or list the preprint's galley files.
Basis: probe. <sup>[f-ops2](#fn-ops2)</sup>

### Retired

<a id="a11"></a>
**A11 — "Cancel" loses typed text silently** · ✅ · retired. Overturned on screen 2026-09-23 (all three apps): "Cancel" on a changed window asks "Warning" like the close control and Escape (Rule 11c); the 2026-09-19 observation of a silent "Cancel" did not reproduce. <sup>[f-a11](#fn-a11)</sup>

<a id="a22"></a>
**A22 — The leave-page prompt after a discarded window** · ✅ · retired. Overturned on screen 2026-09-29 (all three apps): leaving the page after a window was closed with "Warning" › "Yes" asks nothing, as after a save or an untouched close (Rule 11d); the 2026-09-23 prompt came from test tooling reloading the page within a fraction of a second of the close. <sup>[f-a22](#fn-a22)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The panel is `DiscussionManager` (ui-library `managers/DiscussionManager/`), pushed onto every stage by `workflowConfigEditorialOJS/OMP/OPS.js` and `workflowConfigAuthorOJS/OMP.js`, and onto the preprint server Author's publication menu by `workflowConfigAuthorOPS.js` (`PublicationConfig.discussions`, `submissionStageId: WORKFLOW_STAGE_ID_PRODUCTION`). The reviewer's copy is `<discussion-manager-reviewer>` in `lib/pkp/templates/reviewer/review/step3.tpl` and `reviewCompleted.tpl` (fetches the submission, mounts the same manager with the assignment's stage). The template screen is `<task-template-manager />` in `lib/pkp/templates/management/workflow.tpl`, tab `taskTemplates`, label `manager.template.tasksAndDiscussions` "Tasks and Discussions". Data: `PKP\editorialTask\EditorialTask` (table `edit_tasks`; `type` 1 discussion / 2 task, `EditorialTaskType`), participants `Participant` (`edit_task_participants`, `isResponsible` = owner), messages `PKP\note\Note` (`is_headnote` marks the first), templates `Template` (`edit_task_templates`). Headings: `getDiscussionTitleByStage()` → `submission.queries.submission` "Desk Review Tasks & Discussions", `.review` "Review Tasks & Discussions" (both `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` and `_EXTERNAL_REVIEW`), `.editorial` "Copyediting Tasks & Discussions", `.production` "Production Tasks & Discussions" (each app overrides this last key with the same text). ui-library and lib/pkp are identical across the three checkouts for every file this spec cites (ojs `802202cb3e`/pkp-lib `5af3b3933`, omp `7f9455d5a`, ops `15f0b6e0bd`, ui-library `managers/` trees byte-identical); lib/pkp's locale files differ only as A7 says. Live-probed 2026-09-23 (Purpose; all three apps): the four headings on their stages, "Review Tasks & Discussions" on both of a press's review stages, "Production Tasks & Discussions" alone on a preprint server (a typed Submission-stage address lands there); the Reviewer's panel from step 3 of the review form, none on steps 1 and 2 (OJS, OMP); the preprint server Author's publication menu ending with "Production Tasks & Discussions"; a participant who may not manage an item finding its "Closed" box greyed; a template with auto-add on making its item when a submission reached its stage.

<a id="fn-b"></a>
**b** — Server: `EditorialTaskController::getRouteGroupMiddleware()` admits `ROLE_ID_SITE_ADMIN, MANAGER, SUB_EDITOR, ASSISTANT, AUTHOR, REVIEWER`; `getTasks()` returns every task of the stage when `$currentUser->hasRole([SITE_ADMIN, MANAGER], contextId)`, otherwise `->withParticipantIds([$currentUser])`. Single items: `QueryAccessPolicy` → `QueryAssignedToUserAccessPolicy` (a participant, or manager/admin access to the stage). Manage: client `useDiscussionManagerConfig::userHasWriteAccess()` = `isCurrentUserJournalManager()` (`SITE_ADMIN` or `MANAGER` in any group of the context) or `workItem.createdBy === me` or the `isResponsible` participant is me; server `QueryWritePolicy` = manager/admin, `createdBy`, or (tasks only) the responsible participant with a role on the stage. Manager-level roles: OJS "Journal editor" and "Production editor" carry `ROLE_ID_MANAGER` (`registry/userGroups.xml`; users.md "`editor` is a manager-level role"). Live-probed 2026-09-23 (Actors preamble, row 1; all three apps): the Site Administrator, the Journal Manager and the unassigned Editor and Production editor (OJS, OMP), and the Preprint Server Manager, saw every Copyediting (Production) item with a menu on each, participants or not; an assigned Production editor saw every Copyediting item and got "You don't currently have access to that stage of the workflow." on the Submission stage (OJS, OMP); creators and task owners had the menu and live boxes, every other participant neither; a Section Editor saw 8 of 12 items, a Copyeditor 5, the Author 2.

<a id="fn-c"></a>
**c** — `getManagerConfig()` grants every action (list, add, edit, delete, history, add-task-details) when `hasCurrentUserAtLeastOneAssignedRoleInStage(submission, stageId, [SUB_EDITOR, MANAGER, SITE_ADMIN, ASSISTANT, AUTHOR, REVIEWER])` or `isCurrentUserAssignedAsReviewer(submission)` (an active review assignment); `getTopItems()` shows "Add" (`common.add`) from that. Server: `addTask`, `getTasks`, `fromTemplate`, `getParticipants` sit behind `QueryWorkflowStageAccessPolicy` (stage access, with `QueryUserAccessibleWorkflowStageRequiredPolicy` adding the reviewer role to both review stages for a user with any review assignment). The reviewer panel's steps: *Reviewer's review* Actors row 7 (live there 2026-09-04). Live-probed 2026-09-23 (Actors rows 1–3; all three apps): every role that saw the panel had "Add" and opened the rows it saw; a Reviewer whose request was declined or cancelled gets "The current user is not assigned as a reviewer for the requested document." at the review form's address, so no panel (OJS, OMP); an unassigned Editorial Board Member on a preprint server gets the access-denied page.

<a id="fn-d"></a>
**d** — `DiscussionMessages.vue`: `hasAccessToAddMessage` = the signed-in user is among `workItem.participants`; otherwise `discussion.noAccessToAddMessage` "To add a new message, please assign yourself as a participant.". Server: `addNote()` answers forbidden to a non-participant; `AddNote` requires `userId` in `edit_task_participants` of the task. Live-probed 2026-09-23 (Actors row 4; all three apps): participants got "Add New Message"; the Site Administrator, the Journal Manager, the Editor and the Production editor, none of them a participant, read the sentence instead.

<a id="fn-e"></a>
**e** — `getItemActions()`: with write access, `common.edit` "Edit" (`disabled: !!workItem.dateClosed`), `discussion.addTaskDetails` "Add Task Details" (type discussion and status `EDITORIAL_TASK_STATUS_IN_PROGRESS`), `common.history` "History", `common.delete` "Delete" (`isWarnable`); no write access, no actions, and `DiscussionManagerCellActions` renders nothing. Server: `editTask`, `deleteTask`, `closeTask`, `openTask`, `startTask` add `QueryWritePolicy`. Live-probed 2026-09-23 (Actors rows 5–6; Rule 5; all three apps): the menu "Edit", "Add Task Details" (on an open discussion only), "History", "Delete" in red text; "Edit" greyed and "Add Task Details" gone on a closed item; a task's menu "Edit", "History", "Delete"; no menu for anyone else.

<a id="fn-f"></a>
**f** — Row boxes: `DiscussionManagerCellStarted.vue` (hidden unless a task; disabled unless write access, status pending and a responsible participant; confirm `task.startThisTask` / `task.confirmStartTask`), `DiscussionManagerCellClosed.vue` (disabled without write access or on a closed task; confirm `discussion.closeThisDiscussion` / `discussion.confirmCloseDiscussion`, `discussion.reopenThisDiscussion` / `discussion.confirmReopenDiscussion`, `task.closeThisTask` / `task.confirmCloseTask`; the task reopen texts `task.reopenThisTask` / `task.confirmReopenTask` are unreachable, the box being disabled). The confirm dialog is `TableCellSelect.vue` with `common.yes` / `common.no`. Window boxes: `DiscussionManagerTaskInfo.vue` (`task.startThisTask` "Start this task" while pending, else `task.completeThisTask` "Complete this task"; disabled when closed or without a responsible participant) and `DiscussionManagerDiscussion.vue` (`discussion.closeThisDiscussion`, discussions in display mode only). Live-probed 2026-09-23 (Actors rows 7–8; Fields, the discussion window; all three apps): the row's "Started" box live for whoever may manage a "Yet to begin" task with an owner, greyed on the ownerless auto-added task and on every started task; the questions as quoted; a closed task's boxes ticked and greyed for the Journal Manager, the owner, the Site Administrator and an Author participant, a press on them asking nothing; an Author participant gets no box in the window.

<a id="fn-g"></a>
**g** — `useDiscussionMessages.js`: toolbar button `pkpAttachFiles` ("Attach Files") opens the Composer's `FileAttacherModal` titled `common.attachFiles`, with `FileAttacherUpload` (`common.upload.addFile` "Upload File", `common.upload.addFile.description`) always, and `FileAttacherWorkflowStage` (`workflow.files` "Workflow Files", `workflow.attachUploadedFiles`, button `workflow.attachWorkflowFiles`) only when `hasCurrentUserAtLeastOneAssignedRoleInAnyStage(submission, EditorialRoles)` (`SITE_ADMIN, MANAGER, SUB_EDITOR, ASSISTANT`). Server: `EditTask`/`AddNote` `submissionFileIds` is `prohibitedIf` the user is neither manager/admin nor holds an assistant or sub-editor stage assignment on the task's stage. Saving: `SaveNoteWithFiles::saveTemporaryFiles()` stores uploads as submission files of stage `SUBMISSION_FILE_QUERY` tied to the note; `attachSubmissionFiles()` copies a workflow file (`sourceSubmissionFileId` set). `notifyParticipants()` attaches the note's files to each email. The stage list's end at Production: *Workflow screen & stage access* Rule 18 (its A10, retired). Live-probed 2026-09-23 (Actors row 9; Rule 14; all three apps): "Workflow Files" offered to the Journal Manager, the Editor, an assigned Section Editor (Moderator), the Guest Editor (OJS) and the Copyeditor and Layout Editor (OJS, OMP), never to the Author or the Reviewer; the stage lists "Submission", "Review", "Copyediting", "Production" (OJS), "Submission", "Internal Review", "External Review", "Copyediting", "Production" (OMP), "Production" alone and empty (OPS2); an assistant's "Submission" and "Review" empty with no "No Items" (A24); each chosen file listed as "{number} {file name}" with "Remove"; saved, a download link under its message (the file downloads as an attachment) and an attachment on every participant's email; a workflow file attached as a copy with a new number, the original still the only row of its list.

<a id="fn-h"></a>
**h** — `PKPEditTaskTemplateController`: POST, PUT, DELETE and GET `variables` for `ROLE_ID_MANAGER, SITE_ADMIN` plus `CanAccessSettingsPolicy`; GET `/` for every editorial role, the Author and the Reviewer. Client `TaskTemplateManagerConfigurations` offers list, add, edit, delete to `MANAGER, SITE_ADMIN`. Live-probed 2026-09-23 (Actors row 11; all three apps): the tab with one "Add template" per stage for the Site Administrator, the Journal Manager and the Editor (OJS, OMP; a preprint server has no Editor); a Section Editor (Moderator) typing `…/management/settings/workflow` lands on `user/authorizationDenied` with the access-denied text.

<a id="fn-i"></a>
**i** — `PKPEditTaskTemplateController::getMany()`: for a user with no `MANAGER`/`SITE_ADMIN` group in the context, `Template::scopeWithUserGroupsAccess()` keeps templates with `restrict_to_user_groups = false` or a linked group the user holds. The Participants panel's copy of the rule: `Repository::isTemplateAccessibleToUser()` (*Stage participants*, its Rule 5a and Settings). Live-probed 2026-09-23 (Actors row 10; Settings bullet 3; all three apps): a template limited to the Copyeditor (a preprint server: the Moderator) listed in "Add" and in "Notify" for the manager and that role, not for the Section Editor or the Author; unrestricted templates listed for the Author and, on a review stage, the Reviewer.

<a id="fn-j"></a>
**j** — `DiscussionManager.vue`: `PkpTable` label = the stage heading, description `discussion.description`, top control "Add"; columns from `getColumns()`: `common.name` "Name", `submission.query.activityName` "Activity", `common.dueDate` "Due Date", `submission.query.started` "Started", `submission.query.closed` "Closed", `common.moreActions` (screen-reader only). `discussionManagerStore.js`: three groups `common.yetToBegin` "Yet to begin" (`EDITORIAL_TASK_STATUS_PENDING` 1), `common.inProgress` "In progress" (2), `common.closed` "Closed" (3), empty text `grid.noItems` "No Items", loading `common.loading`; list fetched as `…/stages/{stageId}/tasks?orderBy=dateCreated` (ascending). Status: `TaskResource::determineStatus()` — a task is closed if `dateClosed`, else in progress if `dateStarted`, else pending; a discussion is closed or in progress. Badge: `useDiscussionManagerForm::getBadgeProps()` (`common.new` "New" for a new item). Live-probed 2026-09-23 (Rules 1, 2a–2c; all three apps): the description, "Add" at the top right, the columns, the groups in their order with "No Items", two items added a second apart sitting oldest first, the badges "Yet to begin", "In progress", "Closed", "Overdue" and "New". Items seeded in one call come in no fixed order between loads.

<a id="fn-k"></a>
**k** — `DiscussionManagerCellName.vue`: `submission.query.task` "Task" / `discussion.name` "Discussion"; the owner line `task.owner` "Task Owner" + the responsible participant's `username`, or `common.createdBy` "Created by" + `createdByUsername`, or `mailable.system` lowercased ("system") when `createdBy` is null. Username, not the full name: seed-facts (live 2026-09-20, journal and press). `DiscussionManagerCellDueDate.vue` shows `dateDue` (`Y-m-d`) for tasks only. Live-probed 2026-09-23 (Rule 3; all three apps): "Created by: system" on an auto-added discussion and "Task Owner:" with nothing after it on an auto-added task, the date as `YYYY-MM-DD`, a discussion's empty. The name is a button styled as a link (`getByRole('button')`).

<a id="fn-l"></a>
**l** — `DiscussionManagerCellActivity.vue`: `latestActivities[0].message` (`line-clamp-2`); when a `SUBMISSION_LOG_TASK_NOTE_POSTED` activity is within 7 days (`useDate::isWithinDays`) and there are two distinct lines, an `<ol>` of that reply and the latest non-reply activity. `TaskResource::toArray()` builds `latestActivities` from the event log entries with `assocType = ASSOC_TYPE_QUERY`, newest first, prefixed by `submission.event.task.overdue` when `dateDue` has passed (`Carbon::now()->gt($dateDue)`; the resource adds it whether or not the task is closed, the badge only while open). The due date is stored as a date, so `Carbon::now()->gt($dateDue)` holds from the first second of the due day (A16), and the prefix ignores `dateClosed` (A17). Live-probed 2026-09-23 (Rules 2d, 2e, 4; all three apps): a task due 2026-09-23 read "Overdue" that day; overdue tasks stayed in "Yet to begin" and "In progress"; the overdue line first in the History, dated with the due date, "User" empty; a closed overdue task keeping the line in "Activity" and History with the badge "Closed"; a reply posted today giving the numbered list of two ("… posted a response on 2026-09-23", then "Discussion created by …"); an auto-added item's empty cell. The seven-day end was not driven: a reply cannot be backdated.

<a id="fn-m"></a>
**m** — `useDiscussionManagerForm.js`: side window `DiscussionManagerFormModal.vue`, title `getDiscussionTitleByStage()`, description `discussion.form.description`, badge. Groups: `details` (`common.details` "Details", `discussion.form.detailsDescription`), field `title` (`common.name`, `discussion.form.detailsNameDescription`, required), `participants` (checkbox, `editor.submission.stageParticipants` "Participants", `discussion.form.detailsParticipantsDescription`, `showNumberedList`, default `[currentUserId]` for a new item); `taskInformation` (`discussion.form.taskInformation`, `discussion.form.taskInfoDescription`); `discussion` (`discussion.name`, `discussion.form.discussionDescription`), field `description` (rich text, toolbar `bold italic underline bullist | pkpAttachFiles`, required, value `notes[0].contents` when editing, attached files footer `FileAttacherAttachedFiles`). Page buttons `common.save` "Save", `common.cancel` "Cancel". Server: `EditTask` `title` `required|string|max:255`. Live-probed 2026-09-23 (Rule 6; Fields, the "Add" window; all three apps): the title, A2's line, the badge "New", the three groups with their hints, "Cancel" and "Save"; the participants as plain boxes with no numbers (the numbered list is the discussion window's); a 255-character name saved, 256 refused under "Name" with "This may not be greater than 255 characters." by the server; the name as the email's subject.

<a id="fn-n"></a>
**n** — `EditorialTaskController::getParticipants()`: `$users` starts with the current user; adds each `StageAssignment` of the stage (`Repo::user()->get()`, which skips disabled accounts), skipping Author-role assignments when the current user is a reviewer with a `SUBMISSION_REVIEW_METHOD_DOUBLEANONYMOUS` assignment on the stage; on a review stage and unless the user's only role there is reviewer, adds `getReviewers()`: assignments `filterByIsAccessibleByReviewer(true)`, dropping double-anonymous ones for a user holding the reviewer role and anonymous or double-anonymous ones for a user holding the author role. A reviewer-only user gets forbidden outside review stages or with no accessible assignment. Client `mapParticipantOptions()`: label `"{fullName} ({username})"` + `(common.me)` "(Me)", `subLabel` the roles joined by `common.commaListSeparator`, `subLabelSecondary` per review `common.reviewRoundNumber` "Round {n}" + " - " + `editor.submissionReview.doubleAnonymous` / `.anonymous` / `.open`. `getAllParticipants()` merges the task's own participants in. Roles: `EditorialTaskParticipantResource` (stage-assignment groups, manager/admin groups, the context's reviewer group for a reviewer). Review-type defaults: *Review setup & review forms*; scenarios.md `review.defaultReviewMode` (double-anonymous when unset). Live-probed 2026-09-23 (Rules 7, 7a–7e, 20; all three apps, reviewers OJS and OMP): each role offered itself and the stage's assignees, an unassigned manager-level person never offered to others; of five reviewers only the two who accepted were offered (one invited, one declined, one cancelled on screen absent), with "Round 1 - Anonymous Reviewer/Anonymous Author", "… - Anonymous Reviewer/Disclosed Author" or "… - Open"; the list arriving 130–360 ms after the window; an unassigned manager in an Author's item listed ticked in the Author's "Edit"; a person removed on the Participants panel gone from the item and its "Edit". Role lines: `getParticipants()` merges only the current user's own manager and admin groups (`UserGroup::withUserIds([$currentUser])`), and only for a manager or admin, into the roles the resource prints (A19); the reviewer's role is `UserGroup::where('role_id', ROLE_ID_REVIEWER)->first()`, unordered, and a press has two such groups (OMP1).

<a id="fn-o"></a>
**o** — `EditTask::rules()` (inherited by `AddTask`): `participants` required array; responsible count must be 1 for a task (`submission.task.validation.error.participant.responsible`); anonymity closure (blinded reviewers >1 or any non-blinded reviewer → `…reviewer.anonymous`; a blinded reviewer plus an Author stage assignment → `…review.anonymous`); counts (`…participant.required` for a task under 1, `…participants.required` for a discussion under 2); creator closure (`getCreatorId()`: the request user on add, the task's `createdBy` on edit; null or manager/admin passes; else `…participant.creator`); each `participants.*.userId` a manager/admin, a stage assignee or a reviewer of the submission (`…assignment.required` "Participant must be assigned to the submission in the current stage or be a reviewer."). Two-participant refusal text live 2026-09-04 (Notifications center; scenarios.md "The cheapest positive control is a discussion"). Live-probed 2026-09-23 (Rules 8a–8d; all three apps, 8d OJS and OMP): the discussion and creator refusals under "Participants" (the creator one also on an edit removing the creator), a task with nobody ticked and a task with no owner stopped by the window's own "This field is required." with no request sent, so `…participant.required` "At least one participant is required for a task." is not reached from the window; an owner chosen and then unticked sent and refused with "There should be one user responsible for the task."; the anonymity refusals, and two reviewers or a reviewer with the Author saving under an "Open" review. Test run 2026-09-23 (Rule 8; scenario 7): on OJS the Author's "Save" with only the Section Editor ticked showed "At least two participants are required for a discussion." above "The creator must participate in the task/discussion." in the one error under "Participants"; the OMP and OPS runs read the creator line there.

<a id="fn-p"></a>
**p** — `addFieldCheckbox('taskInfoAdd', discussion.form.taskInfoLabel "Enter task information")`, `disabled` when the item is already a task; `dateDue` (`addFieldDate`, `common.dueDate`, `discussion.form.taskInfoDueDateDescription`, `min: 'today'`, required for a task), `taskInfoAssignee` (radio, `discussion.form.taskInfoAssigneesLabel`, `…AssigneesDescription`, options = the ticked participants), `taskInfoShouldStart` (select, no label, `discussion.form.startTaskUponSaving` "Begin Task Upon Saving" true / `discussion.form.createDontStartTask` "Create Task (Do Not Start)" false, `disabled: !!workItem`). `addWorkItem()` POSTs, then `startWorkItem()` when both boxes say so. Server: `dateDue` `requiredIf` task, `prohibitedIf` discussion, `Y-m-d`, `after_or_equal:today`. Live-probed 2026-09-23 (Rule 9; Fields, the task rows; all three apps): the owner radios following the boxes; "Begin Task Upon Saving" sending the add then the start, the task under "In progress"; "Create Task (Do Not Start)" leaving it under "Yet to begin"; yesterday typed into "Due Date" accepted by the box and refused by the server (A10); on a discussion turned into a task the drop-down greyed at "Begin Task Upon Saving" and the task pending, since `startWorkItem()` follows `addWorkItem()` only (A25).

<a id="fn-q"></a>
**q** — `DiscussionManagerTemplates.vue` (hidden in display mode): `discussion.form.templatesLabel`, `Search` with `common.findTemplate` "Find Template", buttons `{submission.query.task|discussion.name} - {title}` (CSS `uppercase`), lines `discussion.template.taskDescription` / `discussion.template.discussionDescription`, disabled for discussion templates while a task is edited, `common.noItemsFound` "No items found." when empty. `useDiscussionManagerTemplates.js` fetches `editTaskTemplates?stageId=…&search=…` (`orderByPkDesc`). `setValuesFromTemplate()` calls `…/stages/{stageId}/tasks/fromTemplate/{templateId}` (`EditorialTaskController::fromTemplate()` → `Template::promote()`), then sets `title`, `taskInfoAdd`, `dateDue` (now + `dueInterval`), clears `taskInfoAssignee`, sets `description` from `notes[0].contents`; the participants `promote()` computes are returned but never set. On an existing item `onSelectTemplate()` asks `taskTemplate.apply` / `taskTemplate.applyConfirmation`. Placeholders: `EditorialTask::compileDescription()` renders the head note through `TemplateVariables` on save (sender = the note's writer, recipients = the other participants; authors blanked for a double-anonymous reviewer). The search request goes out when Enter is pressed, twice per Enter, not on typing; the clear control refetches the whole list. Live-probed 2026-09-23 (Rule 10; all three apps): the list newest first; "No items found." on a press's Internal Review; Enter narrowing by every word of a name or text, in any case, inside longer words; any search holding "task(s)" or "discussion(s)" failing (A4); a task template setting "Due Date" to today plus one week or three months with no owner; "Participants" unchanged (A5); "Apply Template" with "Yes" and "No", discussion templates greyed while a task is edited, task templates live while a discussion is edited; placeholders shown as typed and filled on "Save", in the first message and the email; a template added in Settings filling like an installed one; a preprint server's "Assign Editor" (OPS1).

<a id="fn-r"></a>
**r** — `handleFormSubmission()`: on success `setInitialState()`, `onDataChangedFn()` (panel refetch), `closeModal()`; no notify. Client-side required check `Form.vue` → `validator.required` "This field is required.", summary `form.errorSummaryOne` / `form.errorSummaryMany`. `useFormChanged(form, …, {warnOnClose: true})`: `beforeunload` handler while changed; a close callback registered with `SideModal` asks `common.warning` "Warning" / `form.dataHasChanged` with `common.yes` / `common.no`. The form's `@cancel` calls the same injected `closeModal`, so "Cancel" asks too (A11, retired). The `beforeunload` handler goes on the form's `onUnmounted`: with animations off, the closed form outlives its window by about 0.3–0.5 s and still counts as changed, so a reload issued in that gap asks (A22, retired); with the closing slide running, the window and the handler go together. Live-probed 2026-09-23 (Rule 11; Rule 25b; all three apps): no "… errors detected!" line anywhere; the footer "Please correct one error." / "Please correct {n} errors." with "Jump to next error" and no request; the screen-reader list's "Go to undefined" (A21); "Cancel", the close control and Escape all asking on a changed "Add", "Edit" or template window, a "Find Template" search alone not counting, "No" keeping the typed text, "Yes" discarding it; an untouched window closing at once; a leave-page prompt after a typed name, and after a "Yes" discard (A22, retired), none after an untouched close; a save closing the window with no notice. Live-probed 2026-09-29 (Rule 11d; A22; all three apps, two runs; the Journal Manager and a Section Editor): no prompt on a reload or a typed address 2 s or 15 s after a save or a discard; a prompt only for a reload issued within the gap above with animations disabled; with the closing slide running, none even at once (td16). Test run 2026-09-23 (Rule 11a; scenario 2; all three apps): after the task was refused with nobody ticked, ticking two participants left "This field is required." under the owner list, and choosing an owner let "Save" send again; on OJS a press of "Save" before that waited on a `disabled` button for three minutes, the window showing "Please correct one error." with the owner's line only, the message under "Participants" gone.

<a id="fn-s"></a>
**s** — Accounts: `users.md` (the seeded roster; `admin`/`admin`, everyone else their username twice; throwaway accounts the username twice). Where each scenario runs: 1–7, 10 and the first part of 11 on the seeded journal, press or preprint server `publicknowledge`, with scratch submissions from `POST scenarios/submission` (submitter `author.alex`); 8, 9 and the "Open" part of 11 on scratch contexts from `POST scenarios/context` with throwaway users. On `publicknowledge` the Journal Manager is `manager.maya`, the Section Editor `sectioneditor.ana` and the second Section Editor of 6 `sectioneditor.omar` (`sectioneditor.ravi` on the preprint server), both assigned automatically through the submission's section (`ART`, the press's series `monographs`, `PRE`), the Copyeditor `copyeditor.carla`, the Reviewers `reviewer.julia` and `reviewer.paul`, the Author `author.alex`. Stages: Production is `decisions: ['skipExternalReview', 'sendToProduction']` on OJS and OMP and the submitted seed itself on OPS; Copyediting (10) `decisions: ['skipExternalReview']` with `participants: [{username: 'copyeditor.carla', role: 'copyeditor'}]`; the review round (11) `decisions: ['sendExternalReview']` with `reviewRounds: [{reviewers: [{username: 'reviewer.julia', status: 'accepted'}, {username: 'reviewer.paul', status: 'accepted'}]}]`. An item a scenario's given names is seeded with `tasks[]`, which saves it as the "Add" window does, acting as its creator; its emails are faked, so a given item leaves nothing in a mailbox, and every step in a scenario's body is driven on screen. Recipes: 1 — `files: [{file: 'article.pdf'}]` on OJS and OMP (OPS refuses `files`), no tasks; 2, 3 — no tasks; 4 — `{title: 'Update the references', type: 'task', creator: 'manager.maya', participants: ['manager.maya', 'sectioneditor.ana'], owner: 'sectioneditor.ana', dateDue: <three days before today>}`, begun by the default `started`, a past `dateDue` being the key's one lifted rule; 5 — `{title: 'Cover image', creator: 'manager.maya', participants: ['manager.maya', 'sectioneditor.ana']}`; 6 — `{title: 'Proof corrections', creator: 'manager.maya', participants: ['manager.maya', 'sectioneditor.ana', 'author.alex'], message: 'Please send your corrections.'}`, whose seeded Tasks rows are the ones "Delete" takes back; 7 — `{title: 'Proof queries', creator: 'sectioneditor.ana', participants: ['sectioneditor.ana', 'author.alex']}` and `{title: 'Editorial notes', creator: 'manager.maya', participants: ['manager.maya', 'sectioneditor.ana']}`, read as `author.alex`, then `manager.maya`; 8 — a scratch context with throwaway `manager`, `sectionEditor` and `author` users and one submission at Production with the section editor in `participants[]` and `{title: 'Layout notes', creator: <the manager>, participants: [<the manager>, <the section editor>]}`, the templates at the install default; the Section Editor's refusal is the manager's Settings › Workflow address typed; 9 — a scratch context with the same three users; the box is ticked on screen first, then the submission is seeded, submitted with the section editor in `participants[]`, which runs the auto-add at the submit as the wizard's does; 10 — `{title: 'Copyedit the manuscript', type: 'task', creator: 'manager.maya', participants: ['manager.maya', 'copyeditor.carla'], owner: 'copyeditor.carla', dateDue: <fourteen days after today>, started: false}` and "Editorial notes" as in 7, read as `copyeditor.carla`, then `manager.maya`; 11 — the anonymous part on `publicknowledge`, whose "Default Review Mode" is "Anonymous Reviewer/Anonymous Author" (seed-facts); the "Open" part on a scratch journal or press created with `review: {defaultReviewMode: 'open'}` and throwaway `sectionEditor`, `author` and three `externalReviewer` users, seeded as `accepted`, `invited` and `declined`; "Cancel Reviewer" is driven on screen, since no seed key cancels a request. On a preprint server the roster has no `copyeditor.carla`, `layouteditor.leo` or `reviewer.julia`. A seeded `accepted` reviewer lands on step 1 of the review form, which has no panel; the panel shows from step 3. No seed key ages a first message, so the past-the-hour state (Rule 15c) has no seed. Live-probed 2026-09-23: `participants[]`, `tasks[]`, `taskTemplates[]` (with `include`, `roles`, `dueInterval`), `users[]` (with `disabled`), `reviewRounds[]` and `review.defaultReviewMode` each seeded what the screens then showed.

<a id="fn-t"></a>
**t** — `DiscussionManagerFormDisplayModal.vue`: title `workItem.title`, badge, `common.edit` "Edit" in `#actions` for write access (`disabled: isWorkItemClosed || isLoadingWorkItem`); refetches `…/tasks/{id}` and `refreshFormData()` after each save. The same `useDiscussionManagerForm` in display mode (`canSubmit: false` until `toggleSaveBtnOnDisplayMode()`; save keeps the window open). Task details: `task.startedBy` "Task started by", `common.startDate` "Start Date"; hints `discussion.form.taskInfoConvertToTask` / `…ReopenAndConvertToTask`. Messages: `DiscussionMessages.vue` — `discussion.messageFrom` "Message from {$from}" with `createdByUsername` (or "system"), `formatShortDateTime(dateCreated)`, contents, `File` links per note file; `discussion.addNewMessage` "Add New Message". Live-probed 2026-09-23 (Rule 12; all three apps): the title, badge and "Edit" for the manager, the creator and the task owner, absent for other participants, greyed on a closed item; the numbered participants with their roles; the task details and the convert hints; messages oldest first under "Message from {username}" with date and time; file links downloading the file; "Save" live after a box or "Add New Message", then "Saved" and greyed again; "Start this task", "Complete this task" and "Close this Discussion" plus "Save" starting, closing and reopening the item (one earlier run that saw these boxes do nothing did not reproduce in two later chunks).

<a id="fn-u"></a>
**u** — `onNewMessage()` shows `FieldRichTextarea` `newMessage` and disables the button; `validateNewMessage()` → `validator.filled` "This field is required."; `addNewMessage()` POSTs `…/tasks/{id}/notes` (`AddNote`: `contents` required, max 65535). `addNote()` logs `SUBMISSION_LOG_TASK_NOTE_POSTED` (`submission.event.task.notePosted`) and calls `notifyParticipants()` with every participant. Closing does not gate notes: `addNote()` never reads `dateClosed`. Live-probed 2026-09-23 (Rule 13; all three apps): the box and the greyed button; an empty "Save" refused with no request; a reply added last, mailed to every participant and the writer, and logged in "Activity" and History; replies saved and mailed on a closed discussion and a closed task.

<a id="fn-v"></a>
**v** — `discussionEdit()` opens `DiscussionManagerFormModal` with the item; `discussionAddTaskDetails()` the same with `autoAddTaskDetails` (checkbox pre-ticked, `DiscussionManagerTaskInfo` `scrollIntoView`). `saveWorkItem()` PUTs `type`, `title`, `stageId`, `dateDue`, `participants`, `description` (always the message box), `submissionFileIds` (every file listed under the box, the head note's own files included, tagged `FileAttacherWorkflowStage`). `EditTask` `description` closure: passes for `MANAGER`/`SUB_EDITOR` in the context or a site admin; else fails `submission.task.validation.error.headnote.author` when the head note's `userId` is not the user, `…headnote.editExpired` when it is over 3600 s old; no head note, it passes. `editTask()`: `$editTask->update()`, `notifyParticipants(array_diff(new, old))`, `logParticipants()`, `logTaskFiles()`, and for tasks `logDueDate()` (only when there was a due date) and `logOwner()`. `EditorialTask::saveHeadnote()` updates the note flagged `is_headnote`, or saves a new flagged note when there is none. `determineStatus()` puts a converted discussion (no `dateStarted`) under pending. Live-probed 2026-09-23 (Rule 15; all three apps): "Edit" and "Add Task Details" as described (the latter landing on "Task Information"); one edit changing name, participants, due date, owner, message and a file, mailing only the new participant and logging the added, removed, due-date, reassigned and uploaded lines, none for the name or the text; the message replaced in place, keeping its time; both conversion routes landing under "Yet to begin"; the owner's refusal (Copyeditor on OJS and OMP, the Author everywhere) under the message box with the notice; a Section Editor, a Guest Editor (OJS) and the Author on their own item within the hour saving; past the hour (a scratch first message moved back two hours in the database) the Author's rename or added participant and the Copyeditor's rename refused, the Journal Manager's and a Section Editor's saved.

<a id="fn-w"></a>
**w** — `startTask()`: conflict when already started or a discussion; refuses with `…participant.required` without participants and `…participant.responsible` without exactly one owner; stamps `dateStarted`, `startedBy`; logs `SUBMISSION_LOG_TASK_STARTED` (`submission.event.task.started` "{$taskType} initiated by {$username} ({$userGroupName}) on {$dateLogged}"). No unstart route exists. Live-probed 2026-09-23 (Rule 16; all three apps): the row question, "No" sending nothing (still "Yet to begin" after a reload), "Yes" starting; the window's "Start this task" and "Save" starting with no question; "Task started by" and "Start Date"; "Task initiated by {username} ({roles}) on {date}"; the box ticked and greyed after, asking nothing; the ownerless auto-added task's boxes greyed.

<a id="fn-x"></a>
**x** — `closeTask()` / `openTask()` stamp or clear `dateClosed` and log `…TASK_CLOSED` ("{$taskType} closed by {$username} on {$dateLogged}") / `…TASK_OPENED` ("{$taskType} reopened by …"); neither emails. Client `discussionSetClosed()` returns early for a closed task ("Tasks cannot be reopened"); the server's `openTask()` would reopen one. `updateWorkItemStatus()` in the window maps pending → start (close for a discussion), in progress → close, closed → open, without a dialog. Live-probed 2026-09-23 (Rule 17; all three apps): the questions verbatim, "No" leaving the item (after a reload too) and "Yes" moving it; the window's box and "Save" closing and reopening a discussion and completing a task with no question; a task closed straight from "Yet to begin"; "Discussion closed by …", "Discussion reopened by …", "Task closed by …"; no email for a close or a reopen.

<a id="fn-y"></a>
**y** — `DiscussionManagerHistoryModal.vue`: title `common.history`, `workItem.title`, columns `common.date`, `common.user`, `common.event`, `common.download` (screen-reader header), a `common.download` link when `activity.settings.downloadUrl` (upload events only, `api.file.FileApiHandler/downloadFile`). `TaskResource`: `userFullName`, with `submission.event.impersonation.userLabel` "{$userName} (acting as {$impersonatedName})" when `impersonatedUserId` is set; every log call attributes to `Validation::loggedInAs()` when present. Messages (`lib/pkp/locale/en/submission.po`): `submission.event.task.created`, `.notePosted`, `.participantsAdded` / `.participantsRemoved` ("{$taskParticipantsModifiedUsernames} added by {$username} ({$userGroupName}) on {$dateLogged}", names as `username (roles)`), `.assigned`, `.reassigned`, `.datedue.modified`, `.started`, `.closed`, `.opened`, `.fileUploaded`, `.fileRemoved`, `.overdue`; `{$taskType}` is the item's current type. These entries are logged with `assocType = ASSOC_TYPE_QUERY`, not the submission. Live-probed 2026-09-23 (Rule 18; Side effects, the logs; all three apps): every event line as quoted, only "initiated" carrying roles; the "Download" column read only by screen readers, its link downloading in place; events of one second in different orders between apps; during Login As "User" reading the pair while "Event" and "Activity" name the impersonator and the message the impersonated person (A27); a converted item's "Task created by" (A28); a file attached at "Add" logged only on its removal (A29); one Activity Log line "An email has been sent: {item name}" per recipient, the writer's copy included, "User" empty, "View Email" showing From, To, Subject and the message; a "Revision … was uploaded for file …" line per message file; none of the item's own events on the Activity Log.

<a id="fn-z"></a>
**z** — `discussionDelete()`: dialog `common.delete` / `common.confirmDelete`, `common.ok` (warnable) and `common.cancel`; DELETE `submissions/{id}/tasks/{taskId}`. `EditorialTask::booted()` `deleted` removes the task's notes and its `Notification` rows (`withAssoc(ASSOC_TYPE_QUERY, id)`, the header Tasks rows); participants go with the task's foreign key. The note removal is a query delete, which does not fire `Note::booted()`'s file clean-up, so the attached files' records stay in the database. Live-probed 2026-09-23 (Rule 19; all three apps): "Delete" in red text, the dialog as quoted, "OK" in red and "Cancel"; "Cancel" sending nothing; "OK" removing the row at once and after a reload, and the item's Tasks rows from the Section Editor's and the Author's panels; nobody mailed; a download link to one of its files, kept from before, answering "The current role does not have access to this operation.".

<a id="fn-aa"></a>
**aa** — Participants messages: `PKPStageParticipantNotifyForm::sendMessage()` (`EditorialTask::create`, `Participant::create`, `Note::create` without `isHeadnote`). Comments box: `Submission\Repository::submit()` → `Repo::editorialTask()->addCommentsForEditorsQuery()` → `addQuery()` (title `submission.submit.coverNote`: OJS "Comments for the Editor", OMP "Cover Note to Editor", OPS "Comments for the Moderator"; participants = stage assignments with `MANAGER, SUB_EDITOR, ASSISTANT, AUTHOR` on the submission's stage; `createdBy` = the first Author assignment's user, else the request user; `Note::create` with `isHeadnote => true` since pkp/pkp-lib#13409, `3dc90c81a6`, 2026-09-29, before which the flag was missing (f-a9); its own notification and plain `Mailable`). Recommendation: `IsRecommendation::addRecommendationQuery()` → `addQuery()`, so its first note is flagged too. Auto-add: `Repository::autoCreateFromTemplates()` → `Template::promote($submission, false)` (no participants, `createdBy` null, head note `userId` null → "Message from system" in `DiscussionMessages::getNoteCreatedBy()`), no log entry, no notification. None of the three `addQuery`/notify paths writes an event-log entry, so their "Activity" is empty. Live-probed 2026-09-23 (Rule 21; all three apps, the recommendation OJS and OMP): "Notify" and "Assign" making a discussion named after the template, "Created by: {recipient}", sender and recipient its participants, its own email; the comments box making "Comments for the Editor" / "Cover Note to Editor" / "Comments for the Moderator" with every assignee of the stage (not an unassigned Journal Manager) as participants, all of them mailed, the Author included; "Editor Recommendation" with the deciding editor alone as participant, no row for the recommender, and a manager's "Save" refused with the two texts until the recommender is ticked; the auto-added discussion seen by manager-level people only, one added participant refused, two saved; every one of these items with an empty "Activity" and a History reading "No Items" (A18).

<a id="fn-ab"></a>
**ab** — pkp/pkp-lib#13334 (`360badeef5`, 2026-09-16): `getTasks()`, `fromTemplate()`, `getTaskData()` and `recordParticipantsAction()` load users with `filterByStatus(UserCollector::STATUS_ALL)`, so a disabled participant or creator still resolves to a name in the list, the item, the edit form's merged options and the History. Not offered anew: `getParticipants()` uses `Repo::user()->get($id)` (disabled excluded, the `null` filtered out). Not notified: `notifyParticipants()` loads recipients with the collector's default (active) status. Live-probed 2026-09-23 (Rule 22; all three apps): a disabled Section Editor (Moderator) still named on her rows, in the window, ticked in "Edit" (kept ticked by a rename-only "Save") and in the History; not offered in "Add"; no email and no Tasks row for a reply while disabled, both again once enabled.

<a id="fn-ac"></a>
**ac** — `Repository::removeParticipantFromSubmissionTasks()` deletes the user's `edit_task_participants` rows on every task of the submission unless they hold `MANAGER`/`SITE_ADMIN` in the context. Callers: `StageParticipantGridHandler::deleteParticipant()` (*Stage participants* Rule 10, live there 2026-09-22) and `PKPReviewerGridHandler::updateClearReview()` (cancel and unassign) when the reviewer has no other active assignment on the submission (pkp/pkp-lib#12359, `8fb92743b`, 2026-02-19). *Reviewer assignment & management* reads "No discussion cleanup happens" on unassignment; the code since 2026-02-19 says otherwise. Live-probed 2026-09-23 (Rule 23; all three apps, reviewers OJS and OMP): a removed Section Editor (Moderator) taken off her discussion, a removed manager-level participant kept; "Cancel Reviewer" on an accepted reviewer and "Unassign Reviewer" on an invited one each taking the reviewer off; a reviewer with requests on rounds 1 and 2 kept after the round-2 cancel and removed after the round-1 cancel; a removed task owner leaving the task ownerless with no History line (A30).

<a id="fn-ad"></a>
**ad** — Live-probed 2026-09-06 (Review setup & review forms' claim check, OJS and OMP): the French reviewer wizard's "Review Tasks & Discussions" panel printing "##discussion.description##", "##common.yetToBegin##" and "##common.closed##". `lib/pkp/locale/fr_CA/` lacks `discussion.description`, `common.yetToBegin`, `common.closed`, `discussion.form.*`, `task.*`, `submission.query.*` among others (it has `submission.queries.review` and `common.inProgress`). Live-probed 2026-09-23 (Rule 24; all three apps): the editorial panels, the discussion window and the "Add" window showing raw keys ("##task.owner##", "##common.createdBy##", "##submission.event.task.created##", "##common.new##", "##discussion.form.templatesLabel##", "##common.me##" among them); a preprint server's heading "##submission.queries.production##" where a journal and a press read "Discussions sur la production", "Discussions sur la révision" and "Discussions préévaluation"; the template search box "Trouver un modèle de courriel".

<a id="fn-ae"></a>
**ae** — `TaskTemplateManager.vue`: title `taskTemplates.title` "Tasks and Discussions Templates", description `taskTemplates.description`; groups from `useApp::getAppStages()` (`stage.submission` "Submission Stage", `stage.review` "Review Stage", OMP `stage.review.internal` "Internal Review Stage" / `stage.review.external` "External Review Stage", `stage.copyediting`, `stage.production`; OPS Production only), each with `taskTemplates.add` "Add template"; columns `taskTemplates.templateName`, `taskTemplates.templateAutoAddAtStage`; row menu `common.edit`, `common.delete` (`useTaskTemplateManagerConfig`). Window `TaskTemplateManagerFormModal.vue`: `taskTemplates.addInStage` / `taskTemplates.edit`. `useTaskTemplateManagerForm.js`: `title` (required), radio `restrictToUserGroups` labelled `admin.workflow.email.userGroup.assign.unrestricted` "Mark as unrestricted" with note `…unrestricted.template.note`, options "Mark as unrestricted" / `…limitAccess` "Limit access to specific roles"; checkboxes `userGroupIds` (`…limitAccess.template.note`, options from `userGroups?stageIds={stage}`, required); `taskInfoAdd`; `dueInterval` select (`taskTemplates.dueDateFromCreationDate` "{$dueDate} from the creation date" with `common.oneWeek`, "2 weeks"…, `common.oneMonth`, "1.5 months"…; values `P1W`…`P3M`, `EditorialTaskDueInterval`); `description` prepared-content field (toolbar `pkpInsert`, `common.insertContent`, placeholders from GET `editTaskTemplates/variables` = `TemplateVariables::getDataDescriptions()`), required; `include` checkbox `taskTemplates.templateAutoAddInStage`. `AddTaskTemplate`/`UpdateTaskTemplate` validate the same. Delete: `useTaskTemplateManagerActions::templateDelete()` (same dialog as note z); `edit_tasks.edit_task_template_id` is `nullOnDelete` (pkp/pkp-lib#13214), so items stay. Live-probed 2026-09-23 (Rule 25; Fields, the template window; all three apps): the tab, the table and its line; the stage groups per app; "Add template" a button (`button "Add template"`) on each group's row; each stage newest first, installed templates in the reverse of their install order (a journal's Production Stage: "Galleys Complete", "Ready for Production", "Assign Editor", "Discussion (Production)"), the screen's request returning them by id, highest first; the columns and the row menu; the window titles and fields, the nine intervals, "Insert Content" listing placeholders; the role boxes per app and stage as Fields lists them; the refusals and closing of Rule 25b; "Delete" with the Rule 19 dialog, the template gone from the list and the "Add" window, its items kept.

<a id="fn-af"></a>
**af** — `TaskTemplateManagerCellAutoAdd.vue` confirm `taskTemplates.confirmAutoAdd` "Confirm Automatic Addition" with `taskTemplates.confirmAutoAddEnable` / `…Disable` (`{$stage}` = the group's name); `templateUpdateAutoAdd()` PUTs `include` and notifies `common.changesSaved`. `Repository::autoCreateFromTemplates($submission, $stageId)` runs from `Submission\Repository::submit()` (the submission's stage) and from `DecisionType` on every stage change; `Template::scopeIsNotAlreadyCreated()` skips a template that already has an item on the submission (pkp/pkp-lib#13214, `b48c22ca06`); the due date is `now()->add(dueInterval)`. Verified at the database 2026-09-11 on all three apps (the upstream sync's #13214 read): one item per switched-on template at submit, none added on re-entering a stage, a deleted template leaving its items; the screens were not driven. Live-probed 2026-09-23 (Rule 26; Settings bullets 2 and 4; all three apps): the questions with the group's name, "No" saving nothing and "Yes" saving with the notice, the list's and the window's boxes one switch; one item per switched-on template at submit and at an on-screen stage change ("Send To Production", "Move To Copyediting"; on a preprint server "Unpost" back to Production), none from a template switched off, due today plus two weeks or three months, ownerless, without participants; none again on returning to the stage, one again after the item was deleted; the first message's recipient and sender placeholders unfilled (A31); no email and no Tasks row for the item.

<a id="fn-ag"></a>
**ag** — `EditorialTaskController::notifyParticipants()`: for each participant (`addTask()`: the task's participants plus the current user; `addNote()`: every participant; `editTask()`: the added ones only), skip when `NOTIFICATION_TYPE_NEW_QUERY` is in the blocked-notification settings; create a `NOTIFICATION_LEVEL_TASK` notification; skip the email when it is in the blocked-email settings; else send `TemplateVariables` with `sender` = current user, subject = title, body = the note, the note's files attached, `allowUnsubscribe()` (the `Discussion` trait's footer `emails.footer.unsubscribe.discussion`), and log `SubmissionEmailLogEventType::DISCUSSION_NOTIFY`. Live 2026-09-04 on OJS, OMP and OPS (Notifications center's claim check, with the A1 overlay on OMP and OPS): subject the name, From the writer, the footer, the Manager's own copy, the email stopped and the task kept by "Do not send me an email…", a reply reaching the others as a task and an email. The Tasks row wording and U05's A1: *Notifications center*. Live-probed 2026-09-23 (Side effects; all three apps): the subject, From, body, footer and attachments; each mail to its recipient alone; the writer's own copy and Tasks row (A3); an edit mailing only the newly ticked person; starting, closing, reopening and deleting mailing nobody and raising no row; each row reading "{opener's full name} started a discussion: {item name}: …", a reply's too; "Enable these types of notifications." unticked stopping mail and row, "Do not send me an email…" ticked stopping the mail alone, a disabled participant getting neither; both boxes at their defaults on a new account.

<a id="fn-ah"></a>
**ah** — `notifyParticipants()` on `WORKFLOW_STAGE_ID_EDITING` or `_PRODUCTION` calls `updateNotification()` for `NOTIFICATION_TYPE_ASSIGN_COPYEDITOR`, `AWAITING_COPYEDITS`, `ASSIGN_PRODUCTIONUSER`, `AWAITING_REPRESENTATIONS` (`PKPEditingProductionStatusNotificationManager`), whatever the participants; the same move through a Participants message was live 2026-09-22 (*Stage participants*, Side effects). The workflow page reads the notice when it loads, so the box changes on the next opening. Live-probed 2026-09-23 (Side effects; all three apps): on Copyediting (OJS, OMP) "Assign a copyeditor…" still shown after the save on the same page and "Awaiting Copyedits." on the next opening, also for a discussion between the Section Editor and the Author only; a journal's Production moving to "Awaiting Galleys." the same way, with the Layout Editor or without; a press's Production box "Awaiting approval." throughout; no box on a preprint server.

<a id="fn-ai"></a>
**ai** — `registry/taskTemplates.xml` per app (OJS and OMP 10 templates across stages 1, 3, 4, 5; OMP adds `INDEX_REQUEST`, `INDEX_COMPLETE`; OPS `DISCUSSION_NOTIFICATION_PRODUCTION`, `EDITOR_ASSIGN_PRODUCTION`), installed by `Repository::installTaskTemplates()` as type discussion, `include` false, unrestricted, no interval; names `mailable.discussionSubmission.name` "Discussion (Submission)" etc., `mailable.editorAssignedManual.name` "Assign Editor", `mailable.copyeditRequest.name` "Request Copyedit", `mailable.layoutRequest.name` "Ready for Production", `mailable.layoutComplete.name` "Galleys Complete" (OJS/OMP app locale), OMP `mailable.indexRequest.name` "Index Requested", `mailable.indexComplete.name` "Index Completed"; texts `emails.discussion.body` "Please enter your message." and the `emails.*.body` letters opening "Dear {$recipientName},". No template on OMP's Internal Review (`WORKFLOW_STAGE_ID_INTERNAL_REVIEW` appears in no entry). The same set in the Participants panel: *Stage participants* Rule 5a, live 2026-09-22. Every context carries them (seed-facts, 2026-09-11). These templates were email templates until pkp/pkp-lib#12593 (`I12593_EmailToTaskTemplates`), which is why the decision composer's "Find Template" does not reach them. Live-probed 2026-09-23 (Settings bullet 1; all three apps): the installed templates per stage and app as listed, each a discussion, unrestricted, auto-add off; the "Discussion (…)" texts "Please enter your message."; every other letter opening "Dear" and the recipient-name tag, except a preprint server's empty "Assign Editor"; the Participants panel's "Notify" listing a stage's discussion templates and none of its task templates, even for the manager.

<a id="fn-aj"></a>
**aj** — Live-probed 2026-09-23 (Cross-feature interactions; all three apps unless named): a Copyeditor assigned on Copyediting seeing the panel there and "You don't currently have access to that stage of the workflow." at the Submission stage's address (OJS, OMP); the Author's first-stage panel, and on a preprint server the publication menu's "Production Tasks & Discussions"; the review form's panel on steps 3 and 4, a completed reviewer landing on "4. Completion" (OJS, OMP); "Assign", "Notify", the comments box and the removals of Rule 23; the decision composer's "Find Template" listing email templates for "Decline" and nothing, or only email templates, for "Discussion", "Request Copyedit" and "Assign Editor"; Profile › Notifications listing "Discussion added." and "Discussion activity.", the footer and the unsubscribe page, no "Discussion activity." row after many replies; "Submission Files" still "No Items" after message files were attached (OJS, OMP); the Activity Log's one line per email; a French panel mixing French words and raw keys.

<a id="fn-td1"></a>
**td1** — Live-probed 2026-09-23 (Rule 7d; A14; OJS and OMP, twice each): under "Anonymous Reviewer/Anonymous Author" the Reviewer is offered themself "(Me)" and the assigned Section Editor; under "Anonymous Reviewer/Disclosed Author" themself, the Author and the Section Editor, the Author refused on "Save" with the quoted text under "Participants"; under "Open" themself, the Author and the Section Editor, never the other reviewer, and a save with the Author goes through.

<a id="fn-td2"></a>
**td2** — Live-probed 2026-09-23 (Rule 11c; all three apps, three separate drives): "Cancel", the close control and Escape each asked "Warning" after a typed name, a typed message, a ticked participant or a pressed template, and on the "Edit" and template windows; an untouched window closed at once; a "Find Template" search alone did not count. The 2026-09-19 silent "Cancel" did not reproduce (A11, retired).

<a id="fn-td3"></a>
**td3** — Live-probed 2026-09-23 (Rule 10a; A4; all three apps): typing without Enter changed nothing and sent no request; Enter on "Copyedit" kept "Request Copyedit" and "Discussion (Copyediting)"; "discussion", "discussions", "task", "tasks", "Task" and searches mixing them with other words each opened the "Error" window, for the Journal Manager, the Section Editor, the Copyeditor and the Author alike.

<a id="fn-td4"></a>
**td4** — Live-probed 2026-09-23 (Rule 10b; A5; all three apps): a template limited to the Copyeditor (a preprint server: the Moderator) left that person unticked, on a window with other ticks and on a fresh one; "Name" and the message filled; its "Save" as filled refused with "At least two participants are required for a discussion.".

<a id="fn-td5"></a>
**td5** — Live-probed 2026-09-23 (Rule 10d; all three apps): after "Save" the first message and the email read "Dear {the Section Editor's full name},"; with two recipients "Dear {full name}, {full name},"; the writer never among them; a template added in Settings with the recipient, title and journal placeholders filled all three.

<a id="fn-td6"></a>
**td6** — Live-probed 2026-09-23 (Rule 10e; OPS1; OPS, OJS and OMP the control): on a preprint server "Assign Editor" filled "Name" and left the box as it was (empty, or "Hello" typed before), "Save" answering "This field is required." under the box; text typed after the press saved as the first message; under Settings its "Discussion" box empty and "Save" refused; a journal's and a press's "Assign Editor" filling the letter and saving.

<a id="fn-td7"></a>
**td7** — Live-probed 2026-09-23 (Rule 10e; all three apps): a template added under Copyediting Stage filled "Name" and the message box with its own text, and saved.

<a id="fn-td8"></a>
**td8** — Live-probed 2026-09-23 (Rule 15c; A6, A7; all three apps): the Copyeditor owning the Journal Manager's task (a preprint server: the Author) changed only "Due Date" and was refused with "You can only edit your own discussion message." under the message box (a raw key on a press and a preprint server), the notice of Rule 11a and "Please correct one error."; the row kept its date. Live-probed 2026-09-30 (sync pkp/pkp-lib#13409; Rule 15c; A6, A7, A12; all three apps, two runs): on the comments-box discussion the submitting Author's "Save" within the hour replaced the comment in place (one message, their name, the original minute); past the hour (its message moved back two hours in the database) the Author's rename, and a "Save" with nothing changed, were refused with the one-hour text (a raw key on a press and a preprint server), the notice and "Please correct one error.", and the Journal Manager's rename saved; turned into a task owned by the Funding Coordinator (journal, press), the owner's due-date change was refused with the own-message text (a raw key on a press), and with the Author as owner the same change saved. The recommendation discussion meets none of these limits: its creator is the recommending Section Editor, whom 15c does not bind. The Author or assistant a "Notify" went to saving past the hour: td10.

<a id="fn-td9"></a>
**td9** — Live-probed 2026-09-23 (Rule 15d; A8; all three apps): the Author's rename of a discussion whose first message carries an upload refused with no field marked; "Save" greyed for the rest of the window, even after "Remove"; in a fresh window "Remove" first let the rename through. Live-probed 2026-09-30 (sync pkp/pkp-lib#13409; Rule 15d; A8; all three apps, two runs): on the comments-box discussion the Author's upload attached through "Edit" saved ("notes.md uploaded by {Author}" in "Activity" and the History), and the next rename was refused with the notice and "Please correct one error.", no field marked, "Save" greyed; the error list's screen-reader text read "Go to submissionFileIds: ##validator.prohibited##", the answer a 422 on `submissionFileIds`.

<a id="fn-td10"></a>
**td10** — Live-probed 2026-09-23 (Rule 15e; A9; all three apps): a "Notify" discussion's "Edit" held "First text"; with "Second text" typed, "Save" closed the window and the discussion window showed "Message from {sender} … First text" then "Message from {recipient} … Second text"; the History read "No Items" before and after. Re-probed 2026-09-30 after pkp/pkp-lib#13409 (Rules 15c, 15e, 21; A9; all three apps, two runs, the recommendation on OJS and OMP): a Journal Manager's "Save" on a "Notify" discussion changing only "Name" added a copy of the first message under the recipient Section Editor's name, and the next "Save" with a new text rewrote that copy, two messages in all; the Author and the Funding Coordinator (journal, press) a "Notify" went to, its first message moved back two hours in the database, saved "Edit" from their own row, the window then showing the manager's message at its old time and a second message under the recipient's name at the time of the save, and a second "Save" rewrote it; the History read "No Items" throughout. The comments-box, recommendation and auto-added discussions, and an auto-added task, kept one message after an edit, its text replaced under the original heading and minute.

<a id="fn-td11"></a>
**td11** — Live-probed 2026-09-23 (Fields "Name" and "Due Date"; A10; all three apps): 256 characters refused under "Name" with "This may not be greater than 255 characters.", 255 saved; yesterday typed into "Due Date" accepted by the box and refused under it with "Start date should be greater than or equal to today"; an empty "Due Date" on a task "This field is required.".

<a id="fn-td12"></a>
**td12** — Live-probed 2026-09-23 (Rule 13b; all three apps): the Author's two replies in a row ("One", then "Two") both saved and both show under "Message from {the Author's username}"; the 2026-09-04 loss did not reproduce.

<a id="fn-td13"></a>
**td13** — Live-probed 2026-09-23 (Rule 23; OJS and OMP, review type "Open"): "Cancel Reviewer" on an accepted reviewer and "Unassign Reviewer" on an invited one each took the reviewer off the discussion; a reviewer with open requests on rounds 1 and 2 stayed after the round-2 cancel and left after the round-1 cancel.

<a id="fn-td14"></a>
**td14** — Live-probed 2026-09-23 (Rule 22; all three apps): after the Section Editor (Moderator) replied and was disabled, the window listed her and headed her reply "Message from {her username}", "Edit" listed her ticked, the History's "User" read her full name, "Add" did not offer her, and a reply sent while she was disabled mailed the others and not her.

<a id="fn-td15"></a>
**td15** — Live-probed 2026-09-23 (Rule 25a; all three apps): an untouched Production Stage reads, top to bottom, "Galleys Complete", "Ready for Production", "Assign Editor", "Discussion (Production)" on a journal; "Index Completed", "Index Requested", "Galleys Complete", "Ready for Production", "Assign Editor", "Discussion (Production)" on a press; "Assign Editor", "Discussion (Production)" on a preprint server.

<a id="fn-td16"></a>
**td16** — Live-probed 2026-09-23 (Rule 11d; A22; all three apps): a reload with a typed name raised the leave-page prompt; none after an untouched "Cancel" or with no window opened; one after a "Warning" › "Yes" discard (A22, retired). Live-probed 2026-09-29 (Rule 11d; A22; all three apps, two runs; the Journal Manager and a Section Editor): a reload or a typed address 2 s after a typed name or a ticked participant raised the prompt, none with the window open and untouched; none 2 s or 15 s after a successful "Save" (a discussion on the Submission, Copyediting or Production stage, a task with owner and due date, an "Edit" rename) or after a "Warning" › "Yes" discard of the "Add", "Edit" or template window, nor after an untouched close; with the window's closing slide running, none even for a reload issued at once. A second reload never asked.

<a id="fn-td17"></a>
**td17** — Live-probed 2026-09-23 (Rule 4; all three apps): after a participant replied today the cell was a numbered list of two, "{username} ({roles}) posted a response on 2026-09-23" then "Discussion created by {username} ({roles}) on 2026-09-23"; with no reply, one line.

<a id="fn-td18"></a>
**td18** — Live-probed 2026-09-23 (Side effects, the logs; all three apps): after a discussion with six participants was saved (four mailed) and answered, the Activity Log listed "An email has been sent: {name}" once per email, the writer's copy included, with an empty "User" and "View Email", and one "Revision … was uploaded for file {number}." line per attached file under the writer's name; none of the item's own events.

<a id="fn-td19"></a>
**td19** — Live-probed 2026-09-23 (Rule 21; all three apps): with "Discussion (Submission)" (a preprint server: "Discussion (Production)") set to auto-add, the Author's submit left the discussion "Created by: system" under "In progress", with an empty "Activity", a History reading "No Items", no participants and "Message from system" "Please enter your message."; the manager-level Editor saw it, the assigned Section Editor, Funding Coordinator and Author did not; nobody was mailed or given a row; after the Journal Manager ticked the Section Editor and the Editor in "Edit", the Section Editor saw it.

<a id="fn-a1"></a>
**f-a1** — Live-probed 2026-09-04 on OMP and OPS (Notifications center's probes): "Add" › "Save" and a reply each showing the dialog; the row stored, no Tasks row, no email. Cause: `EditorialTaskController` imports `APP\notification\Notification` (pkp/pkp-lib#12322, `139bde1e657`, 2026-02-10), a class only OJS ships (`ojs/classes/notification/Notification.php`); OMP (`7f9455d5a`) and OPS (`15f0b6e0bd`) still track none. The class is resolved only where `notifyParticipants()` touches a constant: every add and reply, and an edit on Copyediting or Production (the notice update). The test installs mount an empty subclass for both apps so the other features can run, which is why a drive on them does not show the error: the as-shipped error cannot be seen on these test installs. Re-read 2026-09-23: the OMP (`7f9455d5a`) and OPS (`15f0b6e0bd`) checkouts still track no `classes/notification/Notification.php` (the file there is the mounted subclass, excluded from git), and lib/pkp's `EditorialTaskController.php` still imports `APP\notification\Notification`; with the subclass, every save and reply on OMP and OPS stored the item and sent the emails and rows.

<a id="fn-a2"></a>
**f-a2** — `DiscussionManagerFormModal.vue` `#description` = `discussion.form.description` "Open for What? Open to What? Beyond Content" (lib/pkp `locale/en/submission.po`), for add and edit alike. Live-probed 2026-09-04 (Reviewer's review probes, the reviewer's "Add" window). Live-probed 2026-09-23 on all three apps: the line in every "Add" window (Journal Manager, Site Administrator, Editor, Section Editor, Copyeditor, Author, a Reviewer under each review type) and every "Edit" window driven.

<a id="fn-a3"></a>
**f-a3** — `addTask()` adds the current user to the notified list; `addNote()` notifies every participant, the writer included. Live 2026-09-04 on all three apps (Notifications center's scenario 5: the Manager's own mailbox holds the copy). The pre-rework `QueriesGridHandler::updateQuery()` removed the current user ("Don't notify the current user", pkp-lib `958592a15`, 2025); the rework is pkp/pkp-lib#12322 (2026-02-10). Live-probed 2026-09-23 on all three apps: the writer's mailbox holding each message they wrote, with its attachments, the Activity Log's "View Email" reading From and To the same person, and a "Discussion added." row per message in the writer's own Tasks panel.

<a id="fn-a4"></a>
**f-a4** — `Template::scopeWithSearch()` maps the words `task(s)`/`discussion(s)` to a type and calls `$query->filterByType($typeFilter)`; the model has `scopeWithType()` and no `scopeFilterByType()`, so the query builder throws `BadMethodCallException` and `GET editTaskTemplates?search=…` fails. Live-probed 2026-09-23 (all three apps): each Enter sends `GET /api/v1/editTaskTemplates?stageId={4|5}&search=…` twice and each answers 500; the "Error" window reads "Call to undefined method PKP\core\SettingsBuilder::filterByType()" with "OK".
Issue report: [pkp-e2e#199](https://github.com/jardakotesovec/pkp-e2e/issues/199) ([docs/issues/U37-A4-find-template-discussion-task-error.md](../issues/U37-A4-find-template-discussion-task-error.md)).

<a id="fn-a5"></a>
**f-a5** — `Template::promote()` fills participants from the template's roles' stage assignments; `setValuesFromTemplate()` sets title, task box, due date, owner and message, never `participants`. Texts `discussion.template.discussionDescription` / `…taskDescription`. Live-probed 2026-09-23 on all three apps (td4).

<a id="fn-a6"></a>
**f-a6** — `EditTask` `description` closure (note v) against `QueryWritePolicy` (note b): a responsible participant who holds neither `MANAGER` nor `SUB_EDITOR` passes the write policy and fails the closure unless they wrote the head note; `saveWorkItem()` always sends `description`. The recorded-creator case: *Stage participants* A5 (a Participants message's `createdBy` is the recipient, its note's writer the sender), though that note is unflagged (A9), so the closure there finds no head note and passes. Live-probed 2026-09-23 (all three apps): the owner case refuses (td8), also with only one more participant ticked; the recorded creator of a Participants message saves, and the save adds a message (A9).

<a id="fn-a7"></a>
**f-a7** — The two texts are defined in `ojs/locale/en/locale.po` only (pkp/pkp-lib#12278, `05ade99f1e`, 2026-03-22, added them to OJS's own file); neither `lib/pkp/locale/en/*.po` nor OMP's or OPS's locale files have them, and the application prints a missing key as `##key##`. Live-probed 2026-09-23: both keys on a press and a preprint server, both texts on a journal (td8, and past the hour).

<a id="fn-a8"></a>
**f-a8** — `useDiscussionManagerForm` seeds `selectedFiles` with the head note's files tagged `FileAttacherWorkflowStage`, so `saveWorkItem()` sends their ids as `submissionFileIds`; `EditTask` makes `submissionFileIds` `prohibitedIf` the user is not manager/admin or an assigned sub-editor or assistant, and a non-empty value then fails validation. Live-probed 2026-09-23 (all three apps): the answer is 422 on `submissionFileIds` "##validator.prohibited##", heard only in the error list's screen-reader text "Go to submissionFileIds: ##validator.prohibited##"; "Jump to next error" moves focus to itself; the Copyeditor's and the manager's same edit answered 200 (td9).

<a id="fn-a9"></a>
**f-a9** — The Participants message path of note aa (`PKPStageParticipantNotifyForm::sendMessage()`) creates its first `Note` without `isHeadnote`; `addQuery()` (the comments box and the recommendation) has flagged it since pkp/pkp-lib#13409 (`3dc90c81a6`, 2026-09-29, issue pkp/pkp-lib#13345), and the auto-added item was never affected. On the Participants path `editTask()` reads the head note as `null` (its later `$headnote->id` reads a property of null, a warning); `EditorialTask::saveHeadnote()` finds no flagged note and saves a new flagged one with the edited text, which later saves update; the window heads it with the item's `createdBy`. With no head note the `EditTask` `description` closure passes (note v), so the recipient's save is held neither to the message's writer nor to the hour. Live-probed 2026-09-23, before that change (all three apps, the recommendation OJS and OMP): the "Notify", comments-box and recommendation discussions each gaining a second message under the recipient's, the Author's or the recommender's username after another person's "Save". Re-probed 2026-09-30: the Participants path alone, a name-only "Save" adding the copy and the next one rewriting it, and the recipient Author's and Funding Coordinator's saves past the hour (td10).

<a id="fn-a10"></a>
**f-a10** — `EditTask::messages()` maps `dateDue.after_or_equal` to `validation.after_or_equal` "Start date should be greater than or equal to today" (lib/pkp `locale/en/validation.po`). The date field's `min: 'today'` greys earlier days in the picker; typed, it reaches the server (td11, live-probed 2026-09-23).

<a id="fn-a11"></a>
**f-a11** — Live 2026-09-19 on all three apps (Production stage's claim check): "Cancel" in the discussions "Add" window closed it with the typed content lost and no prompt. The close control's question: note r. Live-probed 2026-09-23 in three separate drives on all three apps: "Cancel" on a changed window asks "Warning" (td2); the silent close did not reproduce, so the entry is retired.

<a id="fn-a12"></a>
**f-a12** — Note v: the one-hour closure applies to every user without `MANAGER`/`SUB_EDITOR` in the context (Author, assistant roles, Reviewer) and runs whenever `description` is posted, which the form always does. `NoteAccessPolicy` (write) states the same rule ("Other users can only edit their own headnotes within 1 hour of creation"), so the hour itself is intended (pkp/pkp-lib#12278). Live-probed 2026-09-23 (all three apps): with a scratch item's first message moved back two hours in the database (no seed key does this), the Author's rename and added participant and the Copyeditor's rename were refused, the Journal Manager's and a Section Editor's saved. Since pkp/pkp-lib#13409 the hour binds the submitting Author's edit of the comments-box discussion too (td8); the Author or assistant a Participants message went to is not bound (f-a9).

<a id="fn-a13"></a>
**f-a13** — Note x: `discussionSetClosed()` and both disabled boxes block a closed task on purpose; `task.reopenThisTask` / `task.confirmReopenTask` are defined and only reachable through the disabled box's confirm props. Live-probed 2026-09-23 (all three apps): the boxes greyed for the Journal Manager, the owner, the Site Administrator and an Author participant; a press on the row's box asking nothing; a closed discussion reopening with one press and "Yes".

<a id="fn-a14"></a>
**f-a14** — `getParticipants()` drops Author assignments only for a reviewer with a `SUBMISSION_REVIEW_METHOD_DOUBLEANONYMOUS` assignment; `EditTask`'s anonymity closure refuses an Author alongside a reviewer of either anonymous method (note o). Live-probed 2026-09-23 on OJS and OMP (td1).

<a id="fn-a15"></a>
**f-a15** — Note ad. Live-probed 2026-09-23 on all three apps: the editorial panels, the windows and the "Add" window, besides the Reviewer's panel.

<a id="fn-a16"></a>
**f-a16** — Note l: the overdue test compares now with the due date's midnight. Live-probed 2026-09-23 on all three apps: a task due 2026-09-23 (seeded, and one saved on screen with that date) read "Overdue" with the overdue line that day.

<a id="fn-a17"></a>
**f-a17** — Note l: `TaskResource::toArray()` prefixes the overdue line whether or not the task is closed; the badge alone checks `dateClosed`. Live-probed 2026-09-23 on all three apps: a task three days past due, closed from its row, kept the line in "Activity" and History under "Closed".

<a id="fn-a18"></a>
**f-a18** — Note aa: none of these paths writes an event-log entry. Live-probed 2026-09-23 on all three apps (the recommendation on OJS and OMP): "Notify", "Assign", the comments box, the recommendation and an auto-added template each left an empty "Activity" and a History reading "No Items".

<a id="fn-a19"></a>
**f-a19** — Note n. Live-probed 2026-09-23 on all three apps: a manager also assigned as Section Editor (Series Editor, Moderator) read "Section editor, Journal manager" ("Series editor, Press manager", "Moderator, Preprint Server manager") in the Journal Manager's and the Site Administrator's windows and "Section editor" in their own, a Section Editor's, the Editor's and the Author's.

<a id="fn-a20"></a>
**f-a20** — Note o: the two-participant count applies to every save. Live-probed 2026-09-23 on all three apps: after the Section Editor was removed on the Participants panel, the discussion's unchanged "Save" in "Edit" answered 422 with the text.

<a id="fn-a21"></a>
**f-a21** — Note r: the message box field has no label, so the error summary's link reads `undefined`. Live-probed 2026-09-23 on all three apps, in the "Add", "Edit" and template windows.

<a id="fn-a22"></a>
**f-a22** — Note r. Live-probed 2026-09-23 on all three apps: the browser's `beforeunload` dialog on the next load after each "Warning" › "Yes", the "Edit" window's included (td16). Live-probed 2026-09-29 on all three apps, two runs: no dialog 2 s or 15 s after a "Warning" › "Yes" of the "Add", "Edit" or template window, nor at once with the closing slide running; with animations disabled a reload issued at once still met it, as did one right after the test tooling's settle wait (4 of 6), because the closed form's handler outlives its window by about 0.3 s (note r). The 2026-09-23 reloads were of that kind, so the entry is retired.

<a id="fn-a23"></a>
**f-a23** — Note t. Live-probed 2026-09-23 on all three apps: the hint with no "Edit" button for a participating Section Editor who did not create the item, a Copyeditor, the Author and a Reviewer (OJS, OMP).

<a id="fn-a24"></a>
**f-a24** — Note g. Live-probed 2026-09-23 on OJS and OMP: in a reply box, a Copyeditor's and a Layout Editor's "Select submission stage" offered every stage; "Submission" and "Review" ("Internal Review", "External Review") drew nothing under the list.

<a id="fn-a25"></a>
**f-a25** — Note p. Live-probed 2026-09-23 on all three apps: "Add Task Details" and "Edit" with the box ticked showed the drop-down at "Begin Task Upon Saving", greyed; after "Save" the task sat under "Yet to begin" with its "Started" box empty.

<a id="fn-a26"></a>
**f-a26** — `TableCellSelect.onChange()` calls `preventDefault()` on the change event, too late to undo the browser's own toggle, so the input keeps the new state while the icon is drawn from the saved one. Live-probed 2026-09-23 on all three apps: after "No" the row's "Started" read checked and a closed discussion's "Closed" not checked to the accessibility tree until a reload; the same on the template screen's "Auto-add at stage" box.

<a id="fn-a27"></a>
**f-a27** — Note y: every log call attributes to `Validation::loggedInAs()` when present, while the note is written as the impersonated user. Live-probed 2026-09-23 (OJS twice, OMP and OPS once): "User" "{Journal Manager} (acting as {Section Editor})", "Event" and "Activity" naming the manager's username, the message headed with the Section Editor's, the email from the Section Editor's address. *Login & sessions* says impersonation is total.

<a id="fn-a28"></a>
**f-a28** — Note y: `{$taskType}` is the item's current type. Live-probed 2026-09-23 on all three apps: a discussion's "Activity" read "Discussion created by …" before "Add Task Details" and its History "Task created by …" and "Task assigned to …" after. Test run 2026-09-23 on all three apps (scenario 5): "Add Task Details" choosing the first owner answered 200 and wrote "Task assigned to …", while the server logged `PHP Warning: Attempt to read property "userId" on null` twice: `EditorialTaskController::logOwner()` picks the "assigned" event when there is no old owner, then reads the old owner's `userId` for `taskOwnerOldUserId` and `taskOwnerOldUsername` anyway. Nothing on screen fails.

<a id="fn-a29"></a>
**f-a29** — Note v: `editTask()` logs the first message's files through `logTaskFiles()`; the add path logged no file line in the drive. Live-probed 2026-09-23 (OJS twice, OMP and OPS once): a file attached at "Add" listed in the window, absent from the History until "Edit" removed it ("… removed by …"); a reply's file logged as "… uploaded by …".

<a id="fn-a30"></a>
**f-a30** — Note ac: the removal deletes the person's participant rows, the owner's included; the drive saw no History line. Live-probed 2026-09-23 (OJS twice, OMP and OPS once): "Task Owner: {username}" before the Participants panel's "Remove", "Task Owner:" after, the History holding only the created and initiated lines.

<a id="fn-a31"></a>
**f-a31** — Note aa: the auto-add path makes the item with no participants and no writer, so the recipient and sender placeholders have nobody to stand for. Live-probed 2026-09-23 on all three apps: "Galleys Complete" auto-added (OJS, OMP) and a template text with "{$recipientName}" (all three) under "Message from system".

<a id="fn-omp1"></a>
**f-omp1** — Note n: the reviewer group is the first of the press's two reviewer groups the database returns. Live-probed 2026-09-23 on OMP, two fresh presses: "External Reviewer" in one run's manager window, "Internal Reviewer" in others, the manager's, the Author's and the reviewer's windows differing; OJS prints "Reviewer".

<a id="fn-ops1"></a>
**f-ops1** — OPS `registry/taskTemplates.xml` gives `EDITOR_ASSIGN_PRODUCTION` the text `emails.editorAssignProduction.body`, which neither OPS's locale nor lib/pkp defines (OJS and OMP define it in their own `emails.po`); `installTaskTemplates()` installs a missing key as an empty string (`setMissingKeyHandler(fn () => '')`). The Participants panel's side of the same template: *Stage participants* OPS2 (live 2026-09-22). Live-probed 2026-09-23 (td6): auto-add on, it made a discussion with no first message.

<a id="fn-ops2"></a>
**f-ops2** — Note g. Live-probed 2026-09-23 on OPS: the manager's and the Moderator's "Workflow Files" offered "Production" alone, its "Production Ready Files" ("These are the files that will be sent for publication") reading "No Items".

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The discussions panel on each stage, editorial and author views | workflow › a stage › "{Stage} Tasks & Discussions" | VUE-036 |
| The reviewer's panel | review form steps 3 and 4 | VUE-037 |
| The preprint server Author's panel (presence homed in *Production stage*) | workflow › Preprint › "Production Tasks & Discussions" | AFFW-429 (rider) |
| "Add" | the panel's top right | AFFW-507 |
| An item's name → the discussion window | a row | AFFW-508 · VUE-059 |
| "Edit", "Add Task Details", "History", "Delete" | a row's "More Actions" | AFFW-509, 510, 511, 512 |
| The delete dialog "OK" / "Cancel" | "Delete" | AFFW-513 |
| The "Add"/"Edit" window, "Save" / "Cancel" | "Add", "Edit" | AFFW-514 · VUE-058 |
| "Begin Task Upon Saving" / "Create Task (Do Not Start)" | "Task Information" | AFFW-515 |
| Templates and "Find Template" | "Details" | AFFW-516 |
| "Start this task" / "Complete this task" | the discussion window | AFFW-517 |
| "Close this Discussion" | the discussion window | AFFW-518 |
| "Add New Message" | the discussion window | AFFW-519 |
| "Attach Files" and a file's remove control | a message box | AFFW-520, 521 |
| The window's "Edit" | the discussion window | AFFW-522 |
| History "Download" | "History" | AFFW-523 · VUE-060 |
| Task & discussion templates: "Add template", "Auto-add at stage", "Edit", "Delete" | Settings › Workflow › "Tasks and Discussions" | AFFM-086, 087, 088, 089 · VUE-050, 071 |
| Templates API (add, edit, delete, list, placeholders) | `{journal}/api/v1/editTaskTemplates` | API-017 |
| Tasks and discussions API (add, edit, delete, get, list, close, open, start, from template, notes, participants) | `{journal}/api/v1/submissions/{id}/tasks…`, `…/stages/{stageId}/tasks…` | API-044 |
| The discussion email (one email built from the item; the four stage mailables the atlas names were retired when their templates became task templates) | the mail catcher | MAIL-020, 021, 022, 023 |
| The installed templates "Request Copyedit", "Assign Editor" (three stages), "Index Completed" and "Index Requested" {OMP}, "Galleys Complete", "Ready for Production" (once email templates; the decision composer's "Find Template" does not reach them, *Editorial decision recording*) | Settings › Workflow › "Tasks and Discussions" | MAIL-076, 077, 078, 079, 080, 081, 082, 083 |
| "Discussion added." notice; "Discussion activity." (raised by nothing) | header Tasks panel, owned by *Notifications center* | NOTIF-040, 041 |
| The header Tasks grid and its rows (owned by *Notifications center*) | header "Tasks" | AFFW-698, 699, 700 (not here) |
| Temporary-file upload behind "Upload File" | `{journal}/api/v1/temporaryFiles` | — |

## Reference — code anchors

- Server: `lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php`, `formRequests/AddTask.php`, `EditTask.php`, `AddNote.php`, `resources/TaskResource.php`, `EditorialTaskParticipantResource.php`, `NoteResource.php`; `lib/pkp/api/v1/editTaskTemplates/PKPEditTaskTemplateController.php`, `formRequests/AddTaskTemplate.php`, `UpdateTaskTemplate.php`, `resources/TaskTemplateResource.php`.
- Model: `lib/pkp/classes/editorialTask/EditorialTask.php`, `Participant.php`, `Repository.php` (`addQuery`, `addCommentsForEditorsQuery`, `autoCreateFromTemplates`, `removeParticipantFromSubmissionTasks`, `installTaskTemplates`), `Template.php`, `TemplateVariables.php`, `enums/`; `lib/pkp/classes/note/Note.php`, `SaveNoteWithFiles.php`; `registry/taskTemplates.xml` in each app.
- Access: `lib/pkp/classes/security/authorization/QueryAccessPolicy.php`, `QueryWritePolicy.php`, `QueryWorkflowStageAccessPolicy.php`, `NoteAccessPolicy.php`, `internal/QueryAssignedToUserAccessPolicy.php`, `internal/QueryUserAccessibleWorkflowStageRequiredPolicy.php`.
- Callers: `lib/pkp/classes/submission/Repository.php` (`submit`), `classes/decision/DecisionType.php`, `classes/decision/types/traits/IsRecommendation.php`, `controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`, `StageParticipantGridHandler.php`, `classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`.
- ui-library: `src/managers/DiscussionManager/` (`DiscussionManager.vue`, `discussionManagerStore.js`, `useDiscussionManagerConfig.js`, `useDiscussionManagerActions.js`, `useDiscussionManagerForm.js`, `DiscussionManagerFormModal.vue`, `DiscussionManagerFormDisplayModal.vue`, `DiscussionManagerHistoryModal.vue`, `DiscussionManagerTemplates.vue`, `DiscussionManagerTaskInfo.vue`, `DiscussionManagerDiscussion.vue`, `DiscussionMessages.vue`, `useDiscussionMessages.js`, the `DiscussionManagerCell*.vue` cells, `DiscussionManagerReviewer.vue`); `src/managers/TaskTemplateManager/`; `src/components/Table/TableCellSelect.vue`; `src/composables/useFormChanged.js`.
- Templates: `lib/pkp/templates/management/workflow.tpl`, `lib/pkp/templates/reviewer/review/step3.tpl`, `reviewCompleted.tpl`.
- Locale: `lib/pkp/locale/en/submission.po` (`discussion.*`, `task.*`, `submission.task.*`, `submission.event.task.*`, `submission.queries.*`), `manager.po` (`taskTemplates.*`, `mailable.*.name`), `emails.po`; `ojs/locale/en/locale.po` (the two head-note texts, A7).
