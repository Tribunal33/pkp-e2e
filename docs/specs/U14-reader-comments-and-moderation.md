---
name: reader-comments-and-moderation
status: verified
---

# Reader comments & moderation {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Public comments let anyone with an account discuss a published article
under it. A signed-in visitor writes a comment on the article's landing
page; the comment waits, visible only to its writer, until a Journal Manager
approves it, and every approved comment is shown to all visitors, signed in
or not. Anyone signed in can report a comment they find objectionable. The
Journal Manager switches the feature on for the journal and moderates on
the journal's **Comments page** (the editorial side menu's Content ›
Comments): approves, hides and deletes comments, and reads and deletes
reports. The feature exists so that a journal can open a moderated
discussion under its articles without any comment reaching the public
before an editor has seen it. The spec is written for a journal and its
articles; the press and preprint-server words follow the glossary. <sup>a</sup>

A press and a preprint server do not install the reader-side half: the
monograph and preprint landing pages carry no "Comments on this
publication" section, no "Comments" block in the sidebar and no way to
write, report or read a comment through the screens. Both do install the
"Comments" tab of the Website settings and the Comments page, exactly as a
journal does (Rules 2, 3c and 10 to 17 hold there as written); with nothing
that writes comments, the Comments page on a press or a preprint server
lists "No Items" under every tab, and switching the setting on changes only
the side menu (Rule 3c). <sup>a</sup>

## Actors & permissions

**Moderator** in this spec means a Journal Manager or an Editor of the
journal (both manager-level roles) and, on a journal, the Site
Administrator; Rule 17 says how far a Site Administrator holding no manager
role in the journal gets in each app. **A signed-in visitor** is any account signed
in to the journal, whatever its roles: a Reader, an Author, a Reviewer, a
Section Editor and a Journal Manager all get the same offer on the landing
page. Every row below assumes the journal has public comments switched on
(Rule 2); with the setting off, the landing page offers nothing (Rule 2b).
<sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Read the comments under an article** | • anyone, signed in or not, on a published article's landing page: the approved comments (Rule 6)<br>• the writer of a comment that is not approved, signed in: that comment as well, marked "Your comment will be visible when the editor approves it" (Rule 6); nobody else sees it, a moderator included <sup>e</sup> |
| **Write a comment** | • any signed-in visitor, on the article's latest published version only (Rule 4)<br>• a visitor who is not signed in is offered "Log in to comment" instead, which leads through the Login page back to the comments (Rule 4b) <sup>f</sup> |
| **Report a comment** | • any signed-in visitor, on another person's comment that is showing, through the comment's "…" menu (Rule 8); a moderator gets the same offer there and nothing more; a request made by hand, which no screen sends, also files a report on another journal's approved comment [A12](#a12)<br>• nobody on their own comment: its menu offers "Delete Comment" and no "Report" (Rule 7) <sup>g</sup> |
| **Delete a comment from the landing page** | • the comment's own writer, signed in, through the comment's "…" menu (Rule 9); the menu on anyone else's comment offers no "Delete Comment", and a moderator deletes other people's comments on the Comments page only (Rule 14) <sup>h</sup> |
| **Switch public comments on or off** | • a Journal Manager, an Editor whose role permits settings changes (the Roles screen's "Permit changes to Settings", ticked by default), and a Site Administrator working in the journal, on Settings › Website › Content › "Comments" (Rule 2) <sup>b</sup> |
| **Open the Comments page** | • a Journal Manager and an Editor, whether or not their role permits settings changes: the Content › Comments menu entry while the setting is on (Rule 3), and the page's address at any time (Rule 2b)<br>• a Site Administrator holding no manager role in the journal: on a journal the page opens; on a press or a preprint server the menu entry is offered but the address answers the access-denied page ⚠ [OMP1](#omp1) ⚠ [OPS1](#ops1) (Rule 17)<br>• a Section Editor, an Assistant, an Author, a Reviewer or a Reader: no menu entry, and the address answers the access-denied page<br>• a visitor who is not signed in: the address answers the Login page <sup>i</sup> <sup>m</sup> |
| **Approve, hide or delete a comment; view or delete a report** | • whoever can open the Comments page (the row above), on every comment of the journal, their own included (Rules 12 to 16)<br>• the screens offer this journal's comments only (Rule 10a), but a request made by hand, which no screen sends, lets a Journal Manager of this journal act on another journal's comment by its number ⚠ [A12](#a12) <sup>j</sup> |
| **Receive the moderation tasks** | • every Journal Manager and Editor of the journal, in the Tasks panel (Side effects); a Site Administrator holding no manager role in the journal gets none <sup>l</sup> |

## Fields & validation

**The landing page** (Rules 3 to 9). <sup>d</sup> <sup>f</sup> <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The comment box (no visible label; its placeholder reads "What do you think about this publication? Type your comments here.") | yes | Free text, no length limit. "Submit" stays grayed out while the box is empty or holds only spaces, and while a submit is in flight. The text is kept as typed; simple formatting tags typed into it (bold, a link) are kept and shown formatted, anything unsafe is stripped without a message (Rule 5) <sup>f</sup> |
| "Please tell us why you want to report this comment" (the "Report Comment" dialog) | yes | Free text. With the box empty or holding only spaces, "Submit" does nothing: the dialog stays open and no message appears ⚠ [A3](#a3) (Rule 8) <sup>g</sup> |

**The "Comments" tab** of Settings › Website › Content (Rule 2). <sup>b</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Comments" group: the box "Enable Public Comments" | no | Unticked on a fresh journal. "Save" is enabled whether or not the box changed and records it as it stands; "Saving" shows for a moment, then the whole page reloads on Appearance › Theme with no "Saved" [A5](#a5) (Rule 2a). Leaving the tab with an unsaved tick asks nothing: another tab of the same page keeps the tick, leaving the page drops it <sup>b</sup> |

**The Comments page** (Rules 10 to 16). <sup>i</sup> <sup>j</sup> <sup>k</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The tabs "All", "Approved", "Hidden/Needs Approval", "Reported" | — | Which comments the table lists (Rule 10). The chosen tab is written into the page's address after "#" and comes back on reload <sup>i</sup> |
| The comments table: columns "Submission", "Comment", "User", "Status" and an unlabelled "…" ("More Actions") column | — | One row per comment, newest first, 25 per page (Settings bullet 2). "Submission" reads "{submission number}. {authors} ; {title}" (the authors part is the family names, a space on each side of the semicolon), "Comment" the comment's text cut to one line, "User" the writer's name, "Status" as Rule 10b. With nothing to list the table reads "No Items" <sup>i</sup> |
| The comment panel "View comment details by {writer}" | — | Opened by "View Comment" (Rule 12). Above the title the same submission line as the table's "Submission" cell; then "Comment preview" with the date and time, the text, the writer's name, their ORCID iD when they have one (verified: the iD as a link with a solid icon; not verified: a hollow icon and "{iD} (unauthenticated)" [A6](#a6)) and their affiliation; then the "Reports" table; on the right the approval note and the three buttons "Approve Comment", "Delete Comment", "Hide Comment" <sup>j</sup> |
| The "Reports" table inside the comment panel: columns "Reported By", "Reason", "Date Reported" and an unlabelled "…" column; described "This is the list of all the users who have reported this comment" | — | One row per report, newest first, 25 per page; with none, "No one has reported this comment yet" (Rule 15) <sup>k</sup> |
| The report panel "View report details by {reporter}" | — | Opened by "View Report" (Rule 15): "Report preview" with the date and time, the reason as typed, the reporter's name, ORCID iD and affiliation, and the button "Delete Report" <sup>k</sup> |

## Rules & state

1. **Where the feature lives.** Public comments are off on a fresh journal.
   Once on, the feature has three screens: the article's landing page,
   where comments are written and read (Rules 3 to 9); the Comments page,
   where moderators work (Rules 10 to 16); and the "Comments" tab of the
   Website settings, where the switch is (Rule 2). Nothing about comments
   appears on the workflow screen, on the submissions dashboard or in the
   activity log. <sup>a</sup>
2. **The switch.** <sup>b</sup>
   - 2a. **Switching on.** Settings › Website › the "Content" tab › the
     "Comments" side tab; tick "Enable Public Comments" and press "Save":
     "Saving" shows for a moment, then the whole Website Settings page
     reloads and lands on Appearance › Theme, and no "Saved" appears
     ⚠ [A5](#a5); reopen the "Content" tab's "Comments" side tab to see
     the box ticked. On
     that reload the editorial side menu of every moderator already
     carries the entry Content › Comments (Rule 3c), and from the next
     page load every published article's landing page carries the
     comments blocks (Rule 3).
   - 2b. **Switching off.** Untick the box and "Save" (the page reloads
     as in 2a). The landing pages
     lose both comments blocks at once, and the Content › Comments entry
     leaves the side menu. The Comments page still opens by its address
     ("…/management/settings/userComments" after the journal's address)
     and still lists every comment, which stay kept; switching on again
     shows them on the landing pages exactly as before ⚠ [A4](#a4).
3. **The two blocks on the landing page.** <sup>d</sup>
   - 3a. **The main block.** Under the article's abstract and details, a
     section headed "Comments on this publication" holds one collapsible
     part per published version, newest version first, headed
     "{version} ({number of comments})" — "Version of Record 1.0 (2)". The
     newest version's part is open when the page loads and the older ones
     are closed, and one part is open at a time: pressing a closed heading
     opens its part and closes the open one, pressing the open heading
     closes it. Inside a part: the
     comment box or its substitute (Rule 4), then the comments (Rule 6),
     then "Show more ({remaining})" when there are more (Rule 6c).
   - 3b. **The sidebar block.** In the column beside the article, a block
     headed "Comments" with the link "All Comments ({count})", which
     scrolls the page to the main block, and, for a visitor who is not
     signed in, the button "Log in to comment" (Rule 4b). The count is the
     number of approved comments over every version; it does not count the
     viewer's own unapproved ones and does not change while the page is
     open.
   - 3c. **The side-menu entry.** With the setting on, the editorial side
     menu shows a "Content" group with "Comments" in it: on a journal the
     group also holds "Issues", on a press "Catalog", and on a preprint
     server the group exists only while comments are on and holds
     "Comments" alone. The group shows for moderators only.
4. **Only the latest version takes comments.** <sup>f</sup>
   - 4a. A signed-in visitor sees the comment box and "Submit" in the
     newest version's part only. An older version's part shows, in place
     of the box, the notice "Discussion is closed on this version, please
     comment on the latest version above." with an alert icon; its
     comments stay readable and keep their "…" menus (Rule 7), so a report
     is still filed from there. Publishing a new version moves the box to
     the new version's part and closes the previous one this way, with its
     comments still under its own heading (the versions themselves are
     *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'s).
     The blocks are the article's, not a version's: an older version's own
     page (its address names the version) shows the same parts, with the
     box under the newest version.
   - 4b. A visitor who is not signed in sees the button "Log in to
     comment" in the newest version's part (and in the sidebar block). It
     opens the journal's Login page; after signing in the browser returns
     to the same article at the comments' address, with the main block on
     screen part-way down the window (not at its top, where "All Comments"
     puts it), and the comment box is there.
5. **Writing a comment.** Type in the box and press "Submit". The box
   empties and the comment appears at the top of that version's comments
   with a help icon and the notice "Your comment will be visible when the
   editor approves it" above its date; the count in the version heading
   goes up by one (it counts the viewer's own unapproved comments), while
   the sidebar's "All Comments" count does not (Rule 3b). Nothing is sent
   to the writer, and no message announces the submit beyond the comment
   showing. The moderators are told (Side effects). <sup>f</sup>
6. **Who sees which comment.** <sup>e</sup>
   - 6a. **Three states, one word on screen.** A comment is *pending*
     (just written), *approved* (a moderator pressed "Approve Comment") or
     *hidden* (a moderator pressed "Hide Comment" on an approved one). The
     landing page and the Comments page both treat pending and hidden the
     same: the Comments page lists both under "Hidden/Needs Approval", and
     the landing page shows both to their writer alone with the same
     "Your comment will be visible when the editor approves it" notice, so
     a writer cannot tell a hidden comment from one not yet looked at
     ⚠ [A1](#a1).
   - 6b. **What each viewer gets.** Everyone, signed in or not, sees the
     approved comments of the article, newest first, each with its date
     and time, its text, the writer's name, the writer's ORCID iD when they
     have one (verified: the iD as a link with a solid icon; not verified:
     a hollow icon and the iD followed by "(unauthenticated)", a link that
     leads nowhere ⚠ [A6](#a6)) and the writer's affiliation. A signed-in visitor sees,
     in addition, their own pending and hidden comments on that article,
     each carrying the notice. Nobody else's unapproved comment is ever
     shown on the landing page, whatever the viewer's role. Comments on
     other articles never show, and the count in a version heading covers
     that version alone.
   - 6c. **Show more.** A version's part loads 25 comments (Settings
     bullet 2) and offers "Show more ({remaining})" below them; each press
     appends the next 25 to the list. The button is absent once every
     comment is listed.
7. **The "…" menu on a comment.** Each comment's header carries a "…"
   button for signed-in visitors only; a visitor who is not signed in gets
   no button. The button has no name a screen reader can read out, unlike
   the Comments page's row menu "More Actions" ⚠ [A7](#a7). On another
   person's comment the menu offers "Report" alone;
   on the viewer's own comment it offers "Delete Comment" alone. A
   moderator gets exactly the same menus on the landing page (Actors). <sup>g</sup>
8. **Reporting.** "Report" opens the dialog "Report Comment": the line
   "Report the following comment by {writer} ({affiliation})" (without the
   parenthesis when the writer has no affiliation), the comment's text, the
   box "Please tell us why you want to report this comment", and the
   buttons "Submit" and "Cancel". "Submit" with a reason closes the dialog;
   nothing on the page confirms the report, the comment looks as before,
   and its menu offers "Report" again, so the same person can report the
   same comment a second time, which files a second report ⚠ [A3](#a3).
   The report is visible only on the Comments page (Rule 15); the comment
   stays showing. The moderators are told (Side effects). <sup>g</sup>
9. **Deleting one's own comment.** "Delete Comment" opens the dialog
   "Delete Comment": "Are you sure you want to delete the following
   comment?" with the comment's text in bold under it, and the buttons
   "Delete" and "Cancel". "Delete" removes the comment from the list at
   once; the count in the version heading changes on the next page load.
   The comment is gone from the Comments page too, with every report made
   against it and the moderators' tasks about it (Side effects). <sup>h</sup>
10. **The Comments page.** Content › Comments in the editorial side menu,
    or its address (Rule 2b). The page is headed "Comments" and holds four
    tabs over one table (Fields). The browser tab reads the journal's
    name alone, with no page name, whichever of the four tabs is chosen
    and with a panel open ⚠ [A13](#a13). <sup>i</sup>
    - 10a. **The tabs.** "All" lists every comment of the journal;
      "Approved" the approved ones; "Hidden/Needs Approval" the pending and
      hidden ones; "Reported" every comment with at least one report,
      approved or not. Each tab keeps the page number it was last on while
      the page stays open, so coming back to a tab lands on the page it
      was left at. Comments of other journals never appear.
    - 10b. **The "Status" cell.** Under "All" it reads "Approved" or
      "Hidden/Needs Approval", followed by ", Reported" when the comment
      has a report. Under any other tab every row reads that tab's own
      word.
    - 10c. **Order and paging.** Newest first, 25 rows per page, with the
      page links under the table beyond 25 (Settings bullet 2).
11. **The "…" menu on a row.** Every row's "…" ("More Actions") menu
    offers "View Comment", which opens the comment panel (Rule 12), and
    "Delete Comment" (Rule 14). <sup>i</sup>
12. **The comment panel.** "View Comment" opens the panel described in
    Fields over the page and writes the comment's number into the page's
    address, so the address can be shared: opening it lands on the
    Comments page with that panel open (Rule 16). A number no comment has
    (a deleted comment's, for instance) opens the page on "All" under the
    dialog "Error" reading "The requested resource was not found." with
    "OK". Closing the panel drops the number from the address. The table
    behind it reloads only when something changed in the panel, a report
    deleted from it for instance; a panel only viewed and then closed does
    not reload the table. The right-hand note
    reads "Approving this comment will make it visible to all users on the
    site" while the comment is pending or hidden, and "This comment was
    approved on {date} by {moderator}." once it is approved. <sup>j</sup>
13. **Approve and Hide.** "Approve Comment" is the panel's highlighted
    button while the comment is pending or hidden and grayed out once it is
    approved; "Hide Comment" is grayed out until the comment is approved.
    Pressing either shows the notice "The comment has been updated
    successfully." at the top right, closes the panel and reloads the
    table: an approved comment leaves the "Hidden/Needs Approval" tab for
    "Approved", a hidden one the reverse. Approving makes the comment show
    to every visitor from their next page load (Rule 6b); hiding takes it
    off the landing page for everyone but its writer (Rule 6a). Hiding
    keeps the comment's reports; approving a comment again after a hide
    rewrites the note with the new date and moderator. Neither press tells
    the writer anything, and neither clears the moderators' task about the
    comment ⚠ [A2](#a2). <sup>j</sup>
14. **Deleting a comment as a moderator.** "Delete Comment", from the
    row's menu or the panel, opens the dialog "Delete Comment": "Are you
    sure you want to delete this comment? This action cannot be undone."
    with "Delete" and "Cancel". "Delete" shows "The comment has been
    deleted successfully.", closes the panel when it was open, and reloads
    the table without the row. The comment leaves the landing page, its
    reports go with it, and so do the tasks about it and them (Side
    effects). The writer is not told. <sup>j</sup>
15. **Reports.** The comment panel's "Reports" table lists the comment's
    reports (Fields). A row's "…" menu offers "View Report", which opens
    the report panel over the comment panel and writes the report's number
    into the address as well, and "Delete Report". Closing the report
    panel, or deleting the report from it, drops both numbers from the
    address, the comment's included, although the comment panel stays open
    ⚠ [A8](#a8). Once a report has been deleted, from either panel, the
    comment panel's own "Close" reloads the table (Rule 12). "Delete
    Report", from
    the row or from the report panel, opens the dialog "Delete Report":
    "Are you sure you want to delete this report? This action cannot be
    undone." with "Delete" and "Cancel"; "Delete" shows "The report has
    been deleted successfully.", closes the report panel when it was open
    and reloads the reports table. Deleting a comment's last report takes
    the comment off the "Reported" tab; deleting reports never changes
    whether the comment is approved. The reporter is not told. <sup>k</sup>
16. **Arriving from a task.** Pressing a comment task in the Tasks panel
    opens the Comments page with that comment's panel already open;
    pressing a report task opens the page with the comment panel and the
    report panel on top of it. <sup>l</sup>
17. **A Site Administrator's reach.** How far a Site Administrator who
    holds no manager role in the journal gets depends on the app and on
    the role they keep. <sup>m</sup>
    - 17a. **On a journal, with another editorial role.** With a Section
      Editor's role, say, they open the Comments page, work its panels and
      change the "Comments" setting like a Journal Manager.
    - 17b. **On a journal, with Reader as their only role.** The page opens
      with its rows listed, under an "Error" dialog reading "The current
      role does not have access to this operation." with "OK". The dialog
      is the side menu's, not this page's: every editorial page shows it
      to this account on each load ⚠ [A9](#a9). Once "OK" is pressed the
      page works as a Journal Manager's: each tab lists its comments, the
      row's "…" and the comment panel offer the same actions, and
      "Approve Comment" approves (Rules 10 to 13). The next page load
      brings the dialog back.
    - 17c. **On a press and on a preprint server.** With a Section
      Editor's role they are offered Content › Comments in the side menu,
      but the entry, the page's address and Settings › Website answer the
      access-denied page ⚠ [OMP1](#omp1) ⚠ [OPS1](#ops1). With Reader
      alone, the address and Settings › Website answer that page too, with
      no "Error" dialog. Enrolled as a Press Manager or Preprint Server
      Manager, they get in.
18. **When the article or the account goes.** Deleting a submission (an
    article published straight from the Submission stage is unpublished,
    declined there and deleted: *[Submission
    stage](U25-submission-stage.md)*'s "Delete") deletes its comments and
    their reports. Merging a user account into
    another (Users & Roles › Users › the row's "Merge user") deletes the
    comments and the reports the merged account wrote; "Remove User" on
    the same row only ends the person's roles in the journal and keeps
    their comments and reports listed. In both cases every moderator's
    tasks about the deleted comments stay in the Tasks panel, blank and
    dead ⚠ [A10](#a10). Unpublishing a version keeps its comments on the
    Comments page and takes them off the landing page with the version;
    with no published version left, the article's page itself answers
    "404 Not Found" to everyone, the writer included. A version published
    again shows its comments again: the approved ones to every visitor, a
    pending one to its writer. <sup>o</sup>

## Side effects

- **A task for each moderator on every new comment.** Writing a comment
  (Rule 5) raises, for every Journal Manager and Editor of the journal, an
  unread row in the Tasks panel reading "A comment has been submitted and
  is pending review by a moderator." with the comment's text under it
  where a task normally shows the submission's title, cut to its first 200
  characters and "..." when it is longer. Pressing the row opens the
  Comments page with the comment's panel (Rule 16). No email accompanies
  it, and no row on the Profile's Notifications tab governs it: the task
  cannot be switched off. A Site Administrator holding no manager role in
  the journal gets no row. <sup>l</sup>
- **A task for each moderator on every report.** Reporting a comment
  (Rule 8) raises the same way a row reading "A report was submitted for a
  comment and requires review by a moderator." with the reason under it,
  cut the same way; pressing it opens the comment panel with the report
  panel on top (Rule 16). No email, no Notifications-tab row. <sup>l</sup>
- **Deleting clears the tasks; approving and hiding do not.** Deleting a
  comment, by its writer or by a moderator, deletes every moderator's tasks
  about that comment and about its reports; deleting a report deletes the
  tasks about that report. {OMP OPS} On a press and a preprint server the
  comment's deletion also takes unrelated tasks with it, in any press or
  preprint server of the site: the "requires review" rows about the report
  numbered like the deleted comment, and the "pending review" rows about a
  comment numbered like one of its reports, leave every moderator's panel
  (the numbers are the ones the Comments page writes into its address,
  Rules 12 and 15) ⚠ [A11](#a11). A comment
  that goes with its submission or with its writer's account leaves its
  tasks behind [A10](#a10) (Rule 18).
  Approving or hiding a comment leaves the
  "pending review" task in every moderator's panel until each deletes it
  by hand ⚠ [A2](#a2). <sup>l</sup>
- **Nothing to the writer or the reporter.** No email, task or on-screen
  message reaches the writer when their comment is approved, hidden or
  deleted, or the reporter when a report is acted on. <sup>l</sup>
- **No activity log entry.** Comments, reports and moderation leave no
  line in the submission's activity log. <sup>a</sup>

## Settings that modify behavior

- **"Enable Public Comments"** — Settings › Website › the "Content" tab ›
  the "Comments" side tab; unticked on a fresh journal, press or preprint
  server. Ticked: the landing page carries the two comments blocks
  (Rule 3) and the side menu the Content › Comments entry (Rule 3c).
  Unticked: no comments block on any landing page and no menu entry; the
  Comments page still answers its address and keeps every comment
  (Rule 2b). <sup>b</sup>
- **"Items per page"** — Settings › Website › the "Setup" tab › the
  "Lists" side tab; 25 on a fresh journal. Sets how many comments a
  version's part shows before "Show more" (Rule 6c), how many rows the
  Comments page shows per page (Rule 10c) and how many reports the
  "Reports" table shows per page (Fields); the setting belongs to the
  Website settings and is only read here. <sup>i</sup>

## Cross-feature interactions

- **The Tasks panel** — the moderators' tasks are rows in the panel
  described by *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*;
  this spec owns only the two task sentences, who gets them and what
  pressing them opens (Side effects, Rule 16). <sup>p</sup>
- **The article landing page** — the page the blocks sit on is *Article
  landing page & reading*'s (spec not yet written); this spec owns the two
  blocks (Rule 3) and everything inside them. <sup>p</sup>
- **Versions** — creating and publishing a new version, which moves the
  comment box (Rule 4a), is
  *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'s. <sup>p</sup>
- **The writer's name, ORCID iD and affiliation** shown with a comment are
  the account's own, from *[User profile](U03-user-profile.md)* and
  *[ORCID integration](U04-orcid-integration.md)*; a comment shows whatever
  the profile holds at the moment the page loads. <sup>e</sup>
- **The Website settings screen** the "Comments" tab sits in, and its
  "Lists" tab, belong to *Journal identity & about pages* and *Appearance
  & theming* (specs not yet written); this spec owns the one tab. <sup>p</sup>
- **"Permit changes to Settings"** on a role, which gates the settings tab
  but not the Comments page (Actors rows 5 and 6), is *Users management*'s
  (spec not yet written). <sup>p</sup>

## Canonical scenarios

Every scenario runs on a scratch journal with throwaway accounts (the
seeded journal keeps public comments off and has no published article);
each scenario's accounts, seeding and the mail catcher's address are in its
footnote. Scenarios 1 to 7 run on a journal, a press and a preprint server
alike: on a press and a preprint server, where nothing writes a comment,
their comments come from the tooling. Scenarios 8 to 13 need the article's
landing page and run on a journal; scenario 14 reads the absence on a press
and a preprint server. <sup>s0</sup>

1. **Switching public comments on and off** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal with public comments on and
   a published article carrying one approved comment; a second, fresh
   scratch journal on which public comments were never switched on.

   - **The "Comments" tab**: open Settings › Website › the "Content" tab ›
     the "Comments" side tab: the box "Enable Public Comments" is ticked,
     and "Save" is enabled with nothing changed.
   - **Switching off**: untick the box and press "Save": "Saving" shows for
     a moment, then the whole Website Settings page reloads and lands on
     Appearance › Theme, and no "Saved" appears ⚠ [A5](#a5); reopen the
     "Content" tab's "Comments" side tab: the box is unticked.
   - **The side menu after the reload**: the editorial side menu no longer
     offers Content › Comments (on a journal the "Content" group keeps
     "Issues", on a press "Catalog"; on a preprint server the group is
     gone).
   - **The landing page** {OJS}: reload the article's page: neither the
     section "Comments on this publication" nor the sidebar block
     "Comments" is there.
   - **The page by address**: open the Comments page's address
     ("…/management/settings/userComments" after the journal's address):
     the page opens and still lists the comment under "All" and "Approved"
     ⚠ [A4](#a4).
   - **Switching on again**: tick the box and press "Save": the page
     reloads the same way; the side menu carries Content › Comments again,
     and {OJS} the article's page shows both blocks with the comment
     exactly as before.
   - **An unsaved tick**: untick the box without pressing "Save", open the
     "Appearance" tab and come back to the "Content" tab's "Comments" side
     tab: the box is still unticked and nothing was asked; open the
     dashboard and return to the tab: the box is ticked, the unsaved change
     dropped.
   - **Control**: on the fresh journal the same tab shows the box unticked,
     the side menu offers no Content › Comments, and the Comments page,
     opened by its address, reads "No Items" under every tab. <sup>s1</sup>

2. **Approving and hiding on the Comments page** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal with public comments on and
   a published article carrying three comments: a pending one by a Reader
   whose profile carries a verified ORCID iD and an affiliation, an
   approved one, and an approved one that a second Reader has reported; a
   second journal on the site holding a comment of its own.

   - **Content › Comments**: press the side menu's Content › Comments: the
     page headed "Comments" opens with the tabs "All", "Approved",
     "Hidden/Needs Approval" and "Reported" over a table with the columns
     "Submission", "Comment", "User" and "Status". Under "All" the three
     rows: "Submission" reads "{submission number}. {authors} ; {title}",
     "Comment" the comment's text cut to one line, "User" the writer's
     name, and "Status" "Hidden/Needs Approval" for the pending comment,
     "Approved" for the second and "Approved, Reported" for the third.
   - **The tabs**: "Approved" lists the two approved comments, every row's
     "Status" reading "Approved"; "Hidden/Needs Approval" the pending one;
     "Reported" the reported one, its "Status" reading "Reported". The
     chosen tab is written into the page's address after "#", and a reload
     comes back on it.
   - **Another journal's comment**: on no tab.
   - **The comment panel**: on the pending comment's row press "…" ("More
     Actions") › "View Comment": the panel "View comment details by
     {writer}" opens over the page, with the same submission line as the
     table's "Submission" cell above its title; "Comment preview" shows the
     date and time, the text, the writer's name, their ORCID iD as a link
     with a solid icon and their affiliation; the "Reports" table reads "No
     one has reported this comment yet"; on the right the note "Approving
     this comment will make it visible to all users on the site", "Approve
     Comment" highlighted and "Hide Comment" grayed out; the page's address
     now carries the comment's number.
   - **"Approve Comment"**: press it: the notice "The comment has been
     updated successfully." shows at the top right, the panel closes and
     the table reloads: the row has left "Hidden/Needs Approval" for
     "Approved". Reopen its panel: the note reads "This comment was
     approved on {date} by {moderator}.", "Approve Comment" is grayed out
     and "Hide Comment" enabled; press "Close": the number leaves the
     address.
   - **The landing page after the approval** {OJS}: signed out, the
     article's page lists the comment with its date and time, its text, the
     writer's name, the ORCID iD as a link with a solid icon and the
     affiliation, and the sidebar reads "All Comments (3)".
   - **"Hide Comment"**: open the reported comment's panel and press "Hide
     Comment": the notice "The comment has been updated successfully.", the
     panel closes and the row leaves "Approved" for "Hidden/Needs
     Approval"; it stays on "Reported", and under "All" its "Status" reads
     "Hidden/Needs Approval, Reported".
   - **The landing page after the hide** {OJS}: signed out, the hidden
     comment is gone and the sidebar reads "All Comments (2)"; its writer,
     signed in, sees it with the notice "Your comment will be visible when
     the editor approves it" above its date ⚠ [A1](#a1).
   - **Control**: the second journal's Comments page lists its own comment
     alone and none of this journal's. <sup>s2</sup>

3. **Reports on the Comments page** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal with public comments on and
   a published article carrying two approved comments, one of them reported
   twice, by two Readers with reasons of their own, the other never
   reported.

   - **The "Reported" tab**: lists the reported comment alone, its "Status"
     reading "Reported".
   - **The "Reports" table**: open that comment's panel ("…" › "View
     Comment"): under the preview the table "Reports", described "This is
     the list of all the users who have reported this comment", with the
     columns "Reported By", "Reason" and "Date Reported" and one row per
     report.
   - **"View Report"**: on the first row press "…" › "View Report": the
     panel "View report details by {reporter}" opens over the comment panel
     with "Report preview": the date and time, the reason as typed and the
     reporter's name, and the button "Delete Report"; the address carries
     the report's number as well as the comment's.
   - **"Close" on the report panel**: press it: the comment panel stays
     open, and both numbers leave the address, the comment's included
     ⚠ [A8](#a8).
   - **"Delete Report" from the report panel**: open the first report again
     and press "Delete Report": the dialog "Delete Report" reads "Are you
     sure you want to delete this report? This action cannot be undone."
     with "Delete" and "Cancel"; press "Delete": the notice "The report has
     been deleted successfully." shows, the report panel closes and the
     "Reports" table reloads with one row.
   - **"Delete Report" from the row**: on the remaining row press "…" ›
     "Delete Report" and then "Delete": the notice again, and the table
     reads "No one has reported this comment yet"; the note on the right
     still reads "This comment was approved on {date} by {moderator}.".
     Press "Close": with the reports deleted, the table reloads, the
     comment is gone from "Reported",
     and under "All" its "Status" reads "Approved".
   - **Control**: the never-reported comment's panel reads "No one has
     reported this comment yet", and its row is on "Approved" and never on
     "Reported", before and after. <sup>s3</sup>

4. **Deleting a comment as a moderator** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal with public comments on and
   a published article carrying three comments: two approved, one of them
   reported, and one pending.

   - **From the row**: on the unreported approved comment's row press "…" ›
     "Delete Comment": the dialog "Delete Comment" reads "Are you sure you
     want to delete this comment? This action cannot be undone." with
     "Delete" and "Cancel"; press "Delete": the notice "The comment has
     been deleted successfully." shows and the table reloads without the
     row.
   - **From the panel**: open the reported comment's panel and note the
     page's address, which carries the comment's number; press "Delete
     Comment" and then "Delete": the notice shows, the panel closes and the
     table reloads without the row; the comment is on no tab and "Reported"
     reads "No Items".
   - **The noted address**: open it: the page opens on "All" under the
     dialog "Error" reading "The requested resource was not found." with
     "OK".
   - **The landing page** {OJS}: signed out, the article's page lists no
     comment; the version's heading reads "{version} (0)" and the sidebar
     "All Comments (0)".
   - **Control**: the pending comment is still listed under "All" and
     "Hidden/Needs Approval" after both deletions. <sup>s4</sup>

5. **The moderators' tasks** {OJS OMP OPS}

   Given: a Journal Manager, an Editor {OJS OMP} and a Section Editor of a
   scratch journal with public comments on and a published article carrying
   an approved comment of more than 200 characters by a Reader, reported by
   a second Reader with a reason of more than 200 characters; no moderator
   has opened their Tasks panel yet.

   - **The Journal Manager's Tasks panel**: two unread rows: "A comment has
     been submitted and is pending review by a moderator." with the
     comment's text under it, cut to its first 200 characters and "...",
     and "A report was submitted for a comment and requires review by a
     moderator." with the reason under it, cut the same way.
   - **The Editor's Tasks panel** {OJS OMP}: the same two rows.
   - **Pressing the comment's row**: the Comments page opens with that
     comment's panel already open.
   - **Pressing the report's row**: the Comments page opens with the
     comment panel and the report panel on top of it.
   - **Profile › Notifications**: the tab lists no row about comments: the
     tasks cannot be switched off.
   - **After "Hide Comment"**: hide the comment from its panel: the
     "pending review" row stays in every moderator's panel ⚠ [A2](#a2).
   - **After "Delete Report"**: delete the report from the "Reports" table:
     the "requires review" row leaves every moderator's panel; the "pending
     review" row stays.
   - **After "Delete Comment"**: delete the comment from its panel: the
     "pending review" row leaves every moderator's panel.
   - **Mailboxes**: the writer's, the reporter's and each moderator's
     mailbox hold no email about the comment, the report, the hide or the
     deletions; judge each mailbox only after an email sent to it by
     other means has arrived (the footnote names one).
   - **Control**: the Section Editor's Tasks panel gained no row at any
     step. <sup>s5</sup>

6. **Who opens the Comments page** {OJS OMP OPS}

   Given: a Section Editor, an Author and a Reader of a scratch journal
   with public comments on, a signed-out visitor's browser, and the Journal
   Manager.

   - **The Section Editor**: signed in, the editorial side menu has no
     "Content" group; the Comments page's address
     ("…/management/settings/userComments" after the journal's address)
     answers the access-denied page ("The current role does not have access
     to this operation.").
   - **The Author**: the dashboard's side menu has no "Content" group; the
     address answers the access-denied page.
   - **The Reader**: the address answers the access-denied page.
   - **Signed out**: the address answers the Login page.
   - **Control**: the Journal Manager's side menu holds Content › Comments,
     and the address opens the page headed "Comments". <sup>s6</sup>

7. **More than a page of comments** {OJS OMP OPS}

   Given: Journal Manager, on a scratch journal with public comments on and
   a published article carrying 26 approved comments.

   - **The first page**: under "All" the table lists 25 rows with the page
     links under it; press the second page's link: one row.
   - **Coming back to a tab**: from the second page open "Approved" (25
     rows and the page links again) and come back to "All": the second
     page is still shown.
   - **The landing page** {OJS}: signed out, the version's part, headed
     "{version} (26)", lists 25 comments and then the button "Show more
     (1)"; press it: the remaining comment is appended below them and the
     button is absent.
   - **Control**: "Hidden/Needs Approval" and "Reported", with nothing to
     list, read "No Items" and carry no page links. <sup>s7</sup>

8. **Writing a comment** {OJS}

   Given: two Readers and the Journal Manager of a scratch journal with
   public comments on and a published article carrying one approved comment
   by the second Reader; a second published article of the journal with no
   comment; a signed-out visitor's browser.

   - **Signed out**: open the article's landing page: under the abstract
     and details the section "Comments on this publication" holds one part,
     headed "{version} (1)" and open, with the button "Log in to comment"
     and then the approved comment with its date and time, its text and the
     writer's name, and no "…" button on it; in the column beside the
     article the block "Comments" holds the link "All Comments (1)" and the
     button "Log in to comment". Press "All Comments (1)": the page scrolls
     to the main block.
   - **"Log in to comment"**: press it: the journal's Login page opens; sign
     in as the first Reader: the browser returns to the same article at the
     comments' address with the main block on screen and, in the version's
     part, the comment box (its placeholder "What do you think about this
     publication? Type your comments here.") and "Submit".
   - **"Submit" while the box is empty**: "Submit" is grayed out; type three
     spaces: still grayed out; type "A first reader comment." in the box:
     "Submit" is enabled.
   - **Submitting**: press "Submit": the box empties and the comment appears
     at the top of the version's comments with a help icon and the notice
     "Your comment will be visible when the editor approves it" above its
     date; the heading reads "{version} (2)" while the sidebar still reads
     "All Comments (1)"; no message announces the submit.
   - **The "…" menus**: the "…" button on the own comment offers "Delete
     Comment" alone; on the second Reader's comment it offers "Report"
     alone.
   - **Formatting**: type `<b>bold</b> <script>alert(1)</script> plain` in
     the box and press "Submit": the new comment shows "bold" in bold and
     "plain", the script gone, and no message appears.
   - **The second Reader**: signed in on the same page, sees the approved
     comment alone, the heading reading "{version} (1)"; the "…" on their
     own comment offers "Delete Comment" alone.
   - **The Journal Manager**: signed in on the same page, sees the approved
     comment alone as well, its "…" offering "Report" alone.
   - **Control**: the journal's second article shows the first Reader,
     signed in, "{version} (0)" and "All Comments (0)": comments on other
     articles never show. <sup>s8</sup>

9. **Reporting a comment** {OJS}

   Given: a Reader and the Journal Manager of a scratch journal with public
   comments on and a published article carrying an approved comment by a
   second Reader whose profile carries no affiliation.

   - **"Report"**: signed in as the Reader, on the comment's "…" press
     "Report": the dialog "Report Comment" opens with the line "Report the
     following comment by {writer}", the comment's text, the box "Please
     tell us why you want to report this comment", and the buttons "Submit"
     and "Cancel".
   - **An empty reason**: press "Submit" with the box empty: the dialog
     stays open and no message appears ⚠ [A3](#a3).
   - **A filed report**: type "Off topic." in the box and press "Submit":
     the dialog closes; nothing on the page confirms the report, the
     comment looks as before, and its "…" menu offers "Report" again
     ⚠ [A3](#a3).
   - **The Comments page**: the Journal Manager: "Reported" lists the
     comment with "Status" "Reported", and under "All" its "Status" reads
     "Approved, Reported"; its panel's "Reports" table holds one row:
     "Reported By" the Reader's name, "Reason" "Off topic." and "Date
     Reported" the day's date; the note on the right still reads "This
     comment was approved on {date} by {moderator}.".
   - **Control**: the Journal Manager, signed in on the landing page, gets
     the same "…" menu on the comment, "Report" alone, and nothing more.
     <sup>s9</sup>

10. **Deleting one's own comment** {OJS}

    Given: a Reader and the Journal Manager of a scratch journal with public
    comments on and a published article carrying two approved comments: the
    Reader's, which a second Reader has reported, and the second Reader's;
    the Journal Manager's Tasks panel holds the rows about the Reader's
    comment and its report.

    - **"Delete Comment"**: signed in as the Reader, on the own comment's
      "…" press "Delete Comment": the dialog "Delete Comment" reads "Are you
      sure you want to delete the following comment?" with the comment's
      text in bold under it, and the buttons "Delete" and "Cancel"; press
      "Delete": the comment leaves the list at once while the heading still
      reads "{version} (2)"; reload the page: "{version} (1)".
    - **The Comments page**: the Journal Manager: the comment is on no tab,
      and "Reported" reads "No Items".
    - **The Tasks panel**: the Journal Manager's panel no longer holds the
      row about the comment or the row about its report.
    - **Control**: the second Reader's comment is still listed on the
      landing page and under "All" and "Approved". <sup>s10</sup>

11. **A new version closes the old discussion** {OJS}

    Given: two Readers and the Journal Manager of a scratch journal with
    public comments on and a published article with one published version
    carrying two approved comments, one by each Reader; the Journal Manager
    on the article's workflow page.

    - **A new version**: the Journal Manager creates a new version of the
      article and publishes it (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*).
    - **The parts**: the first Reader, signed in, reloads the article's
      page: "Comments on this publication" now holds two parts: the newest
      version's, headed "{version} (0)" and open, with the comment box and
      "Submit", and the older version's, headed "{version} (2)" and closed.
    - **One part open at a time**: press the older part's heading: it opens
      and the newest closes; press it again: it closes.
    - **The older part**: shows, in place of the box, the notice
      "Discussion is closed on this version, please comment on the latest
      version above." with an alert icon, and its two comments with their
      "…" menus; on the second Reader's comment press "Report", type
      "Reported from the old version." in the box and press "Submit": the
      Journal Manager's Comments page lists the comment on "Reported".
    - **The newest part**: type "A comment on the new version." in the box
      and press "Submit": the comment appears under the newest part with
      the notice "Your comment will be visible when the editor approves
      it", and the heading reads "{version} (1)"; the older part's heading
      still reads "{version} (2)".
    - **The sidebar**: "All Comments (2)": the approved comments over every
      version, the pending one not counted.
    - **Control**: signed out, the same page shows "Log in to comment" in
      the newest part only, and the closed notice in the older.
      <sup>s11</sup>

12. **The article is unpublished, published again and deleted** {OJS}

    Given: a Reader and the Journal Manager of a scratch journal with public
    comments on and an article published straight from the Submission stage
    carrying two comments by the Reader, one approved and reported by a
    second Reader, one pending; a second published article carrying an
    approved comment; the Journal Manager on the first article's workflow
    page.

    - **Unpublished**: the Journal Manager unpublishes the version
      (*[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*):
      the Comments page still lists both comments; the article's page
      answers "404 Not Found" signed out and to the Reader.
    - **Published again**: the Journal Manager publishes the version again:
      signed out, the article's page shows the approved comment under
      "{version} (1)"; the Reader sees both, "{version} (2)", the pending
      one with its notice.
    - **Deleted**: the Journal Manager unpublishes the version again,
      presses "Decline Submission" on the Submission stage and then "Delete"
      (*[Submission stage](U25-submission-stage.md)*): the Comments page
      lists neither comment on any tab and "Reported" reads "No Items".
    - **The Tasks panel**: the Journal Manager's rows about both comments
      and the report stay in the panel, blank ⚠ [A10](#a10).
    - **Control**: the second article's comment is still listed under "All"
      and "Approved". <sup>s12</sup>

13. **The writer's account is merged away or removed from the journal** {OJS}

    Given: two Readers, A and B, and the Journal Manager of a scratch
    journal with public comments on and a published article carrying an
    approved comment by A, reported by B, and an approved comment by B; the
    Journal Manager's Tasks panel holds the rows about both comments and the
    report; the Journal Manager on Settings › Users & Roles › Users.

    - **"Merge user"**: on B's row press "Merge user" and merge the account
      into A's: B's comment is gone from every tab of the Comments page and
      from the landing page; A's comment's "Reports" table reads "No one has
      reported this comment yet" and "Reported" reads "No Items".
    - **"Remove User"**: on A's row press "Remove User" and confirm: A's
      comment is still listed under "All" and "Approved".
    - **The Tasks panel**: the Journal Manager's rows about B's comment and
      B's report stay in the panel, blank ⚠ [A10](#a10).
    - **Control**: the row about A's comment still opens the Comments page
      with that comment's panel. <sup>s13</sup>

14. **No reader-side half on a press or a preprint server** {OMP OPS}

    Given: the Press Manager (on a preprint server the Preprint Server
    Manager) and a Reader of a scratch press with public comments on and a
    published monograph (on a preprint server, a posted preprint); a
    signed-out visitor's browser.

    - **The landing page, signed out**: the monograph's landing page carries
      no section "Comments on this publication", no "Comments" block in the
      sidebar and no "Log in to comment".
    - **The landing page, signed in**: the Reader sees the same page: no
      comment box, no "Submit" and no comment.
    - **The "Comments" tab**: the Press Manager opens Settings › Website › the
      "Content" tab › the "Comments" side tab: the box "Enable Public
      Comments", ticked, and "Save".
    - **The Comments page**: the side menu's "Content" group holds
      "Comments" (beside "Catalog" on a press; alone on a preprint server);
      press it: the page headed "Comments" lists "No Items" under each of
      "All", "Approved", "Hidden/Needs Approval" and "Reported".
    - **Control**: untick the box and press "Save" (scenario 1): Content ›
      Comments leaves the side menu while the landing page reads exactly as
      before: the setting changes only the side menu here. <sup>s14</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Rarely met**:
  - an Editor whose role does not permit settings changes, refused the "Comments" tab and still opening the Comments page {OJS OMP} (Actors rows 5 and 6; a preprint server has no second manager-level role to untick): unticking "Permit changes to Settings" on a role is a setup few journals make, not a state an editor meets in an ordinary week
  - a Site Administrator holding no manager role in the journal, with no task row in their Tasks panel (Actors row 7): the state needs the Site Administrator's manager role ended on their own edit page, a setup no journal makes in an ordinary week
- **Nothing new to test**:
  - "Items per page" at another value (Settings bullet 2): the same paging scenario 7 reads at 25
  - "Cancel" on the "Report Comment", "Delete Comment" and "Delete Report" dialogs (Rules 8, 9, 14, 15): the dialogs scenarios 3, 4, 9 and 10 open, left as they are
  - the shared address with a comment number opened directly (Rule 12): the same panel scenarios 2 and 5 open by "View Comment" and from a task row
  - an older version's own page showing the article's blocks (Rule 4a): the parts scenario 11 reads on the article's page
  - an Editor as the moderator, or at the switch, instead of the Journal Manager (Actors rows 5 and 6): the same screens scenarios 1 to 4 read
  - an Assistant and a Reviewer at the Comments page's address (Actors row 6): the refusal scenario 6's Section Editor, Author and Reader meet
  - a hidden comment approved again, its note rewritten (Rule 13): the note scenario 2 reads after the first approval
  - the "Report Comment" dialog's line with the writer's affiliation in parentheses (Rule 8): a wording variant of the line scenario 9 reads
- **Register carries it**:
  - A3 (a second report on the same comment by the same person; Rule 8)
  - A6 (the unverified ORCID iD's dead link under a comment and in the comment panel; Rule 6b)
  - A7 (the comment's "…" button without a name for a screen reader; Rule 7)
  - A8 (closing the report panel clearing both numbers from the address; Rule 15; scenario 3 marks it)
  - A9 (the Site Administrator with Reader as their only journal role: the "Error" dialog over the Comments page, and the page working after "OK"; Rule 17b)
  - A11 {OMP OPS} (a comment's deletion taking the task of an unrelated report or comment that shares its number, in any press or preprint server of the site; Side effects)
  - A12 (moderating or reporting another journal's comment by requests made by hand; Actors rows 3 and 7)
  - A13 (the Comments page's browser tab without the page's name; Rule 10)
  - OMP1 and OPS1 (the Site Administrator holding no manager role: the Comments page open on a journal, refused on a press and a preprint server; Rules 17a, 17c)
- **Owned by another feature**:
  - the Tasks panel's own controls on a comment task, Mark Read and Delete (Cross-feature interactions; *Notifications center & email preferences*, scenario 2)
  - creating and publishing the new version scenario 11 needs (Cross-feature interactions; *Publish, schedule & versions*, scenarios 4 and 5)
  - unpublishing and publishing again the version scenario 12 walks through (Rule 18; *Publish, schedule & versions*, scenarios 3 and 10)
  - declining and deleting the submission scenario 12 ends with (Rule 18; *Submission stage*, scenarios 4 and 6)
  - "Remove User" and "Merge user" themselves, beyond what they do to comments (Rule 18; *Users management*)
  - "Permit changes to Settings" on a role (Cross-feature interactions; *Users management*)
  - the profile's name, ORCID iD and affiliation a comment shows (Cross-feature interactions; *User profile*, *ORCID integration*)
  - the Website settings screen around the "Comments" tab, and "Items per page" itself (Cross-feature interactions; *Journal identity & about pages*, *Appearance & theming*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-16), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The
summary is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges,
Impact and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A6](#a6) | The unverified ORCID iD under a comment and in the comment panel links to a broken address | 🐞 | minor | — |
| [A10](#a10) | A comment deleted with its submission or its writer's account leaves its moderation tasks behind, blank and dead | 🐞 | minor | — |
| [A11](#a11) | On a press and a preprint server, deleting a comment also removes the task about an unrelated report or comment that shares its number, in any press or server of the site {OMP OPS} | 🐞 | minor | — |
| [A12](#a12) | A Journal Manager of one journal can read, approve, hide and delete another journal's comments by requests made by hand, and any signed-in account can report them | 🐞 | latent | — |
| [A13](#a13) | The Comments page's browser tab carries no page name, only the journal's | 🐞 | minor | — |
| [A1](#a1) | A hidden comment reads to its writer exactly like one awaiting approval | ❓ | minor | — |
| [A2](#a2) | Approving or hiding a comment leaves every moderator's "pending review" task in place | ❓ | minor | — |
| [A3](#a3) | The report dialog neither refuses an empty reason with a message nor confirms a filed report, and the same person can report the same comment again | ❓ | minor | — |
| [A4](#a4) | With public comments switched off, the Comments page still opens by address and lists the kept comments | ❓ | minor | — |
| [A5](#a5) | The Comments tab's "Save" reloads the Website Settings page on Appearance › Theme instead of confirming in place | ❓ | minor | — |
| [A7](#a7) | The comment's "…" button has no name for a screen reader | ❓ | minor | — |
| [A8](#a8) | Closing the report panel wipes the open comment's number from the address too | ❓ | minor | — |
| [A9](#a9) | A Site Administrator whose only journal role is Reader gets an "Error" dialog on every editorial page, the Comments page included | ❓ | minor | claim check (claude), 2026-09-28 — the dialog is the side menu's |
| [OMP1](#omp1) | On a press, a Site Administrator holding no manager role is offered Content › Comments but the page answers the access-denied page | ❓ | minor | — |
| [OPS1](#ops1) | On a preprint server, a Site Administrator holding no manager role is offered Content › Comments but the page answers the access-denied page | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — A hidden comment looks like a pending one** · ❓ · minor.
A writer whose approved comment a moderator has hidden sees it again with
"Your comment will be visible when the editor approves it", the notice a
fresh comment carries, and no word says it was taken down. Expected either
a distinct notice or nothing; observed the pending notice.
Question: is a hidden comment meant to read as "awaiting approval" to its
writer? Lean: intended; moderation is deliberately silent towards the
writer, and one notice keeps the screen simple. Basis: test run. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — The moderation task outlives the moderation** · ❓ · minor.
A moderator who approves or hides a comment from the Comments page keeps
the "A comment has been submitted and is pending review by a moderator."
row in their Tasks panel, and so does every other moderator, until each
deletes it by hand; only deleting the comment clears it. Expected the task
to clear when the comment is acted on, as other tasks clear with their
action; observed it stays.
Question: should approving or hiding a comment clear the task for every
moderator? Lean: oversight; the delete path already clears the tasks, the
approve path does not. Basis: test run. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Reporting gives no feedback** · ❓ · minor.
In the "Report Comment" dialog, "Submit" with an empty reason does nothing
and shows no message; after a filed report the dialog closes with no
confirmation, the comment looks unchanged and "Report" is offered again,
so a second press files a second report by the same person. Expected a
"required" message and a confirmation or a changed menu; observed silence.
Question: is a silent, repeatable report intended? Lean: oversight; every
other dialog in the application names a missing required field. Basis:
test run. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The Comments page outlives the setting** · ❓ · minor.
With "Enable Public Comments" unticked the side menu drops Content ›
Comments, yet the page's address still opens the full Comments page with
every comment listed and every action working. Expected either the page
to follow the setting or the menu entry to stay; observed the entry gone
and the page open.
Question: is the page meant to stay reachable while the feature is off?
Lean: intended; the comments are kept for a later switch-on and a manager
may want to moderate them meanwhile. Basis: test run. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — The Comments tab's "Save" reloads the page instead of confirming in place** · ❓ · minor.
Pressing "Save" on the "Comments" tab shows "Saving" for a moment, then
the whole Website Settings page reloads and lands on its Appearance ›
Theme tab; "Saved" never appears and the box is off screen, so the
manager reopens the "Content" tab's "Comments" side tab to see the tick
kept. The other tabs
of the same page (Setup › Information, Setup › Lists) show "Saving" then
"Saved" in place and stay where they are. Expected the same in-place
"Saved"; observed the reload.
Question: is the reload meant, so that the side menu's Content › Comments
entry follows at once, or an oversight? Lean: oversight; landing on
another tab with no confirmation reads as an accident, and the menu could
follow on the next page load as the landing pages do. Basis: test run.
<sup>f-a5</sup>

<a id="a6"></a>
**A6 — The unverified ORCID iD under a comment links to a broken address** · 🐞 · minor.
Under a comment on the landing page and in the comment panel, a writer
whose ORCID iD is not verified is shown a hollow icon and a link reading
"{iD} (unauthenticated)"; the link's address is that same text, suffix
included, so pressing it does not open the iD's ORCID page. A verified
writer's link reads the bare iD and opens it. Expected the link to lead
to the iD in both cases; observed a dead link for the unverified one.
Basis: test run. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The comment's "…" button has no name for a screen reader** · ❓ · minor.
The "…" button on a landing-page comment is an image inside a button with
no name a screen reader can read out; the Comments page's row menu, the
same kind of control, reads "More Actions". Expected a name; observed
none.
Question: is the icon-only button meant to ship without a name? Lean:
oversight; the same control elsewhere is named. Basis: test run.
<sup>f-a7</sup>

<a id="a8"></a>
**A8 — Closing the report panel wipes the open comment from the address** · ❓ · minor.
With the comment panel and the report panel open, closing the report panel
("Close", or deleting the report from it) drops both numbers from the
page's address although the comment panel stays open, so the address no
longer names the comment on screen until that panel is closed too.
Expected the comment's number to stay while its panel is open, as it does
when the comment panel is opened on its own; observed both numbers gone.
Question: is that intended? Lean: oversight; the address is meant to be
shareable and briefly names nothing that is open. Basis: test run.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — A Site Administrator with only a Reader role gets an error dialog on every editorial page** · ❓ · minor.
On a journal, a Site Administrator whose only role in the journal is
Reader gets the Comments page with its rows listed under an "Error"
dialog reading "The current role does not have access to this
operation." with "OK", on each load; after "OK" the page works (Rule
17b). The dialog is the side menu's, not this page's: the menu offers
this account "Editor Dashboard" although the dashboard lists nothing for
it, and every editorial page shows the dialog to this account, the
dashboard, the settings pages, Announcements, Statistics and Tools
included. A press and a preprint server show it on the editorial pages
they open to the account. The full entry, its question and its lean are
*[Submissions dashboard (editorial)](U23-submissions-dashboard.md#a9)*'s
A9.
Re-checked: claim check (claude), 2026-09-28 — this entry's question (the
Comments page's dialog or the dashboard's) settled: the side menu's.
Basis: probe. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — A comment deleted with its submission or its writer's account leaves its tasks behind** · 🐞 · minor.
After a submission carrying comments is deleted, or a writer's account is
merged away, every moderator's Tasks panel keeps the "A comment has been
submitted and is pending review by a moderator." and "A report was
submitted for a comment and requires review by a moderator." rows about
those comments, with an empty line where the comment's text was. Pressing
a comment's row opens the Comments page under "Error" / "The requested
resource was not found."; pressing a report's opens the page with no
panel. Expected the rows to go with the comment, as they do when the
comment is deleted on its own; observed they stay, blank and dead.
Basis: test run. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Deleting a comment removes unrelated tasks that share its number** {OMP OPS} · 🐞 · minor.
Comments and reports are numbered separately across the whole site, so a
comment and a report can carry the same number. When a comment is
deleted on a press or a preprint server, every moderator's "A report was
submitted for a comment and requires review by a moderator." row about
the report numbered like that comment leaves the Tasks panel too,
whichever press or server the report belongs to; so does the "A comment
has been submitted and is pending review by a moderator." row about a
comment numbered like one of the deleted comment's reports. No message
appears. The report stays on its "Reported" tab and in its comment's
"Reports" table, but its moderators lose the task that told them it was
filed. Expected a deletion to clear only the tasks about the deleted
comment and its own reports, as it does on a journal (Side effects);
observed on a press and a preprint server it also clears unrelated tasks
that share a number.
Since: 2026-03-04 (7 months) · Basis: probe. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — Another journal's comments can be moderated and reported by requests made by hand** · 🐞 · latent.
The application finds a comment by its number alone, whichever journal a
request is made in. A Journal Manager with no role in another journal,
sending by hand the requests the Comments page sends but with that
journal's comment number, reads the comment (an unapproved one included),
approves or hides it, deletes it, and reads its reports with their
reasons. Deleting such a report was not tried; the code finds a report
the same way, so it would be carried out too. Any signed-in account, a
plain Reader included, files a report on another journal's approved
comment the same way, and the report's task goes to the moderators of
the journal the request was made in. No screen sends these requests
(Rule 10a). Expected each request refused as not this journal's, the
other journal's comment untouched; observed each carried out.
Moderation thus crosses the boundary between journals the rest of the
application keeps.
Basis: probe; code for deleting a report. <sup>f-a12</sup>

<a id="a13"></a>
**A13 — The Comments page's browser tab carries no page name** · 🐞 · minor.
The browser tab of the Comments page reads the journal's name alone,
whichever of the four tabs is chosen, with a panel open and after a
reload, for a Journal Manager and an Editor, with public comments on or
off. The side menu's other pages name themselves first: the settings
pages, Users & Roles, Announcements, Institutions and Manage Emails read
"{page heading} | {journal}" ("Website Settings | {journal}",
"Announcements | {journal}"), the dashboard "Submissions | {journal}".
Expected "Comments | {journal}"; observed "{journal}", so a moderator
with several browser tabs open cannot tell which one holds the Comments
page.
Basis: probe. <sup>f-a13</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Content › Comments offered to a Site Administrator the page refuses** · ❓ · minor.
On a press with public comments on, a Site Administrator who holds no
manager role on the press sees Content › Comments in the side menu;
pressing it lands on the access-denied page, and so does the page's
address. On a journal the same person opens the page. Expected the menu
and the page to agree; observed the offer without the access.
Question: should a Site Administrator without a manager role moderate
comments, as on a journal, or should the menu entry not be offered? Lean:
oversight; the journal lets the Site Administrator in and the press's
menu code is the journal's. Basis: test run. <sup>f-omp1</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Content › Comments offered to a Site Administrator the page refuses** · ❓ · minor.
On a preprint server with public comments on, a Site Administrator who
holds no manager role on the server sees the "Content" group with
"Comments" as its only entry in the side menu; pressing it lands on the
access-denied page, and so does the page's address. On a journal the same
person opens the page. Expected the menu and the page to agree; observed
the offer without the access.
Question: as OMP1, for the preprint server. Lean: oversight, as OMP1.
Basis: test run. <sup>f-ops1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a — reachability per app, and the badge.** Read at the 2026-09-15 tips
(ojs `ae597ff9d9`, omp `0ec98a508`, ops `9ce633ee1d`, all on pkp-lib
`b262d27b81`) and live-probed 2026-09-16 on scratch contexts of the three
apps at those tips; the code below is the mechanism behind what the
screens showed. Three surfaces:
(1) the settings form `PKP\components\forms\context\ContentCommentsForm`
(`FORM_CONTENT_COMMENT`, one `FieldOptions` checkbox `enablePublicComments`,
label `manager.userComment.comments` "Comments", option
`manager.userComment.enableComments` "Enable Public Comments"), mounted by
`lib/pkp/templates/management/website.tpl` under the top tab
`navigation.content` "Content" › side tab id `publicComments`, built in
`PKP\pages\management\ManagementHandler::website()` for all three apps
(no app override of `website()` touches it: OJS/OMP/OPS `SettingsHandler`
only add role assignments and other tabs); (2) the moderation page
`ManagementHandler::userComments()` → `management/userComments.tpl` →
`<user-comments-page>` (`lib/ui-library/src/pages/userComments/UserCommentsPage.vue`,
registered in `lib/pkp/js/load.js`), reached through the `settings` op with
arg `userComments` (`ManagementHandler::settings()` switch), in all three
apps; (3) the reader block: `ojs/pages/article/ArticleHandler::view()`
builds `PKP\components\UserCommentComponent` when
`$context->getData('enablePublicComments')` and
`ojs/templates/frontend/objects/article_details.tpl` mounts
`<pkp-comments>` inside `{if $enablePublicComments}` (main block
`#public-comments`, heading `userComment.commentsOnThisPublication`) and
`<pkp-scroll-to-comments>` in the sidebar (heading `userComment.comments`).
No OMP or OPS handler or frontend template names `UserCommentComponent`,
`enablePublicComments` or `pkp-comments` (grep of `omp/` and `ops/` outside
`lib/`, 2026-09-16), so the reader side is OJS-only and the title carries
`{OJS}`; the absence paragraph states the two shared surfaces the press and
the server keep. The install default is `enablePublicComments: false`
(`lib/pkp/schemas/context.json`). No activity-log call exists anywhere in
`lib/pkp/api/v1/comments/UserCommentController.php` or
`lib/pkp/classes/userComment/`. The upstream Cypress test
`lib/pkp/cypress/tests/integration/publicComments/PublicComments.cy.js`
returns early unless the app's default genre is "Article Text", i.e. it
runs on OJS only, which matches the reading. Live-probed 2026-09-16 (the
absence paragraph, Rule 1): on a press and a preprint server with "Enable
Public Comments" ticked, a published monograph's and a posted preprint's
landing pages, signed out and as a Reader, an Author, a Section Editor,
an Assistant and the manager, carried no block headed "Comments" or
"Comments on this publication" and no "Log in to comment"; the manager's
Content › Comments opened the page headed "Comments" with "No Items" under
each of the four tabs. On the three apps the submissions dashboard, the
workflow screen and the "Activity Log & Notes" window (on a journal after
a comment, an approval, a report, a hide, a report deletion and two
deletions) carried no line about comments.

<a id="fn-b"></a>
**b — the switch.** `ContentCommentsForm` PUTs to the context API
(`$contextApiUrl`); the form shows "Saving" and then, unlike the other
Website tabs, the browser navigates to the same address again right after
the save request and the page opens on its first tab (A5). Access to the
tab: `ManagementHandler::authorize()` adds
`CanAccessSettingsPolicy` to every `settings` op except the `announcements`
and `userComments` args (the comment in the code: "moved out of settings
without changing their URL"); the policy permits a site admin group or a
manager group with `permitSettings` (Roles screen string
`settings.roles.permitSettings` "Permit changes to Settings"). So the
Comments page is open to a manager without settings permission while the
"Comments" tab is not. Live-probed 2026-09-16 (Rule 2, Fields, Actors
rows 5 and 6, A5) on a journal, a press and a preprint server: "Save",
enabled with nothing changed, posted the box's value; "Saving" showed for
a beat, the whole page reloaded at the same address (still ending
"#publicComments") and landed on Appearance › Theme with the box off
screen and no "Saved" within 6 s; the Setup › Information (journal,
press) and Setup › Lists (server) forms, the control, showed "Saving" then
"Saved" in place. The side menu read "Content › Comments" on that reload
and lost it the same way after an untick; the landing page's blocks and
the page by address behaved as Rules 2a and 2b say, the comments written
before still listed after the untick. Leaving the tab ticked and unsaved
raised no dialog: switching to Appearance and back kept the tick, leaving
to the dashboard lost it. Roles screen: the manager row ("Journal
manager" / "Press manager" / "Preprint Server manager") offers no "Edit";
"Permit changes to Settings" was unticked on the "Journal editor" /
"Press editor" role (ticked by default), after which that role's holder
was refused Settings › Website with the access-denied page, had no
"Settings" group in the side menu and still had "Content › Comments" and
opened the Comments page; re-ticked, the tab returned. A preprint server
has no second manager-level role to edit, so that state was not reached
there. With the permission on, the Editor opened the tab and saved it.

<a id="fn-d"></a>
**d — the two blocks and the side menu.** `UserCommentComponent::getConfig()`
passes `publications` (the submission's `getPublishedPublications()` in
reverse order, each `{id, version: versionString}`), `latestPublicationId`
(`getCurrentPublication()`), `itemsPerPage` (`Repo::userComment()->getPerPage()`
= the context's `itemsPerPage`), `loginUrl` (the `login` page with
`source` = the request path + `#public-comments`), `allCommentsCount`
(approved comments over the published publications only) and
`commentsCountPerPublication` (approved plus the signed-in user's own,
approved or not). `PkpComments.vue` renders a `PkpAccordionRoot` whose
`default-value` is the first publication (the newest), one
`PkpAccordionItem` per publication headed `store.getVersionLabel()` =
`userComment.versionWithCount` "{$versionLabel} ({$versionCommentsCount})",
`versionString` being "Version of Record 1.0"-style
(`publication.versionStage.versionOfRecord`, `Publication` DAO). Inside:
`PkpCommentsLogInto` (signed out and latest), `PkpCommentsNotificationNotLatest`
(`userComment.discussionClosed` with the `Error` icon, on every
non-latest part), `PkpCommentsNew` (signed in and latest), the messages,
`PkpCommentsShowMore`. The sidebar `PkpScrollToComments` holds
`PkpScrollToCommentsAllComments` (an `<a href="#public-comments">` reading
`userComment.allComments` "All Comments ({$commentCount})" from
`allCommentsCount`, never refreshed) and `PkpScrollToCommentsLogInto`
(signed out). Side menu: each app's `classes/template/TemplateManager.php`
(`setupBackendPage`) adds a `content` menu group for manager or site-admin
roles; the `userComments` entry (`manager.userComment.comments`
"Comments", url `management/settings/userComments`) only when
`enablePublicComments` is set; OJS's group always holds `issues`, OMP's
`catalog`, and OPS builds the group only inside the `enablePublicComments`
branch ("The only submenu item for Content menu in OPS is User Comments").
Live-probed 2026-09-16 (Rule 3) on a journal with two published versions:
signed out, the main block headed "Comments on this publication" with the
parts "Version of Record 1.1 (0)" open and "Version of Record 1.0 (2)"
closed; pressing the older heading opened it and closed the newest,
pressing an open heading closed it; the sidebar block headed "Comments"
with "All Comments (3)" and, signed out, "Log in to comment"; the link put
the main block at the top of the window; the older part carried
"Discussion is closed on this version, please comment on the latest
version above." with an icon and no box; publishing 1.1 through "Create
New Version" and "Publish" moved the box to the new part, the older
version's own page showing the same parts. The sidebar count read 3 with
three approved comments over both versions, 2 after a hide, and stayed
put after a submit or a delete until the next load. Side menu on the
three apps, as the manager, a Section Editor and the Site Administrator
with the setting on and off: as Rule 3c.

<a id="fn-e"></a>
**e — who sees which comment.** `UserCommentController::getManyPublicComments()`
(route `comments/public`, no `has.user` middleware) filters
`withContextIds([current])->withIsApproved(true)` and, when a user is
signed in, `orWhere(user_id = me AND is_approved = false)`, then
`withPublicationIds([...])` — the last scope wraps the earlier OR in one
group before the publication filter (Eloquent's scope grouping), so a
signed-in user gets this publication's approved comments plus their own
unapproved ones and nothing from other publications. Order:
`Repository::getPaginatedData()` sorts `created_at DESC` and pages by
`itemsPerPage`. Per comment the resource `UserCommentResource` carries
`userName` (`getFullName()`), `userOrcidDisplayValue` and
`isUserOrcidAuthenticated` (`PkpOrcidDisplay`: icon `Orcid` when verified,
`OrcidUnauthenticated` otherwise, the iD as the link text),
`userAffiliation` (`getLocalizedAffiliation()`), `createdAt`
(`formatShortDateTime`). `PkpCommentsNotificationMessageNeedsApproval`
shows `userComment.awaitingApprovalNotice` with the `Help` icon when the
viewer is the writer and `isApproved` is false, which is the pending and
the hidden state alike (A1). Live-probed 2026-09-16 (Rule 6, A1): the
pending comment listed for its writer with "Your comment will be visible
when the editor approves it" and a help icon above the date, and absent
signed out and for a second Reader, an Author, a Reviewer, a Section
Editor, the Journal Manager and the Site Administrator (the heading "(2)"
for them, "(5)" for the writer with two pending); after a hide the writer
saw the comment again with the same notice; another article's comments
never listed; the per-version headings "1.1 (1)" and "1.0 (2)" beside the
sidebar's "(3)".

<a id="fn-f"></a>
**f — writing a comment.** `usePkpCommentsStore.addComment()` refuses
silently unless the publication is the latest, a user is signed in and the
trimmed text is non-empty; `PkpCommentsNewSubmit` sets `is-disabled` while
`commentText.trim()` is empty or a submit is in flight; the textarea
`PkpCommentsNewInput` has `is-label-sr-only` with label and placeholder
both `userComment.addYourComment`. POST `comments` (`AddComment`:
`publicationId` required, must exist, and must be the submission's
`getCurrentPublication()` — else `api.userComments.400.cannotCommentOnPublicationVersion`;
`commentText` required; `PKPString::stripUnsafeHtml()` on the text) creates
the row with `isApproved: false` and calls `notifyModerators()`, then the
store empties the box and reloads that publication's page 1, which sets
`commentsCountPerPublication[id]` from the response's `itemCount`. The
frontend renders the text through `v-strip-unsafe-html`, so safe tags
survive. The Login page honours `source` (`LoginHandler::signIn()`
redirects to it), landing on the article with the `#public-comments`
fragment. Live-probed 2026-09-16 (Rules 4, 5, Fields): "Submit" grayed
with the box empty, with three spaces, and while the submit was in
flight; a typed sentence appeared first in the list with the notice and
icon above its date, the heading 4 → 5, "All Comments (3)" unchanged, no
message; `<b>bold</b> <script>alert(1)</script> plain <a href="…">link</a>`
rendered as bold, plain and a link with the script gone and no message; a
20,199-character comment was stored and shown whole. "Log in to comment"
(either block) opened the Login page with the article's address as
`source` and, signed in, returned to "…/article/view/{id}#public-comments"
with the box present and the block's top 187–287 px down a 900 px window
on two runs, where the sidebar link puts it at 0.

<a id="fn-g"></a>
**g — the "…" menu and reporting.** `PkpCommentsMessageActions` renders
`PkpDropdownMenu` only for a signed-in user (`pkp.currentUser`, written
into the page by `PKPTemplateManager` for signed-in visitors); the trigger
is icon-only (`MoreOptions`) with no accessible name unless the caller
sets one. `getCommentActions()` pushes `userComment.report` "Report" when
the viewer is not the writer and `userComment.deleteComment` "Delete
Comment" when they are — never both, no moderator branch. `commentReport()`
opens `PkpDialog` titled `userComment.reportComment` "Report Comment" with
body `PkpCommentReportDialog` (`PkpCommentReportDialogAuthor`:
`userComment.reportCommentByUserWithAffiliation` or
`userComment.reportCommentBy`; the comment text; `PkpCommentReportDialogReasonInput`
labelled `userComment.report.reason`) and actions `form.submit` "Submit"
(primary; its callback returns without closing when `reportText.trim()`
is empty, no message) and `common.cancel`. POST `comments/{id}/reports`
(`AddReport`: `note` required; `passedValidation()` refuses a non-moderator
reporting an unapproved comment, a state the screen never offers) then
`notifyModerators()`; the store only flips a local `isReported` flag that
nothing renders, and the menu is rebuilt from the same rule, so "Report"
returns (A3). Live-probed 2026-09-16 (Rules 7, 8, A3, A7): no "…" button
signed out; signed in, one per comment, an unnamed button holding an
image (the Comments page's row menu reads "More Actions"); on another's
comment the menu "Report" alone, on one's own "Delete Comment" alone, the
same for a Reader, an Author, a Reviewer, a Section Editor, the Journal
Manager and the Site Administrator, and on an older version's comments
after a new version was published; the dialog "Report Comment" with
"Report the following comment by Rosa Writer" (no parenthesis without an
affiliation; "… by Vera Verified (K2 Verified Institute)" with one), the
text, the box under its label and "Submit" / "Cancel"; "Submit" with an
empty or blank box sent nothing and showed nothing; a filed report closed
the dialog with no message and no change, "Report" was offered again, and
eight reports by one person on two comments (six of them on the older
version's comment) were filed and listed in the panel's "Reports" table.

<a id="fn-h"></a>
**h — deleting one's own comment.** `commentDelete()` opens `PkpDialog`
titled `userComment.deleteComment` with `userComment.deleteCommentConfirmation`
("Are you sure you want to delete the following comment? <br/><br/>
<strong>{$comment}</strong>") and actions `common.delete` (the
`isDisabled: true` it passes is not a `PkpDialog` button prop and has no
effect) and `common.cancel`; DELETE `comments/{id}` allows the owner or a
moderator (`Repository::isModerator()`: manager role in the context or
site admin), deletes the row (reports cascade by foreign key) and the
`notifications` rows of `ASSOC_TYPE_COMMENT` with the comment's id and of
`ASSOC_TYPE_COMMENT_REPORT` with its reports' ids (OJS, lib/pkp
`26ae6431b5`, pkp/pkp-lib#12401, 2026-09-27); on OMP and OPS (lib/pkp
`17a1f01fed`) it deletes every row of either type whose id is the
comment's or one of its reports', every type paired with every id, in any
context (A11); the store filters the
comment out of the list without touching `commentsCountPerPublication`.
Live-probed 2026-09-16 (Rule 9): the dialog's title, text (the comment in
bold) and buttons as stated; "Cancel" kept the comment; "Delete" removed
it at once with the heading unchanged until the next load ("(6)" then
"(5)"); a hidden, twice-reported comment deleted the same way was gone
from the Comments page, its "Reported" tab read "No Items", and both
report tasks left the manager's panel. Re-driven 2026-09-27 on OJS after
`26ae6431b5` (Rule 9, Side effects): the writer's "…" on their own
approved comment offered "Delete Comment" alone; the dialog read as
stated; "Delete" removed the comment at once, the version heading's count
stayed "(1)" until a reload showed "(0)"; the moderator's rows about the
comment left the panel.

<a id="fn-i"></a>
**i — the Comments page.** `UserCommentsPage.vue`: heading
`manager.userComment.comments` "Comments" with a spinner, `Tabs` labelled
`manager.userComment.userComments` "User Comments" (hidden name) with
`track-history`, tabs from `useUserCommentsConfig.getCommentTabOptions()`:
`all` "All", `approved` "Approved", `needsApproval` "Hidden/Needs
Approval", `reported` "Reported" (`manager.userComment.*`). Store
`userCommentStore.js`: `commentsUrl` adds `?isApproved=true`,
`?isApproved=false` or `?isReported=true`; `onTabUpdate()` keeps
`trackedCommentPaginationPageHistory` per tab; `getCommentStatusText()`
joins "Approved"/"Hidden/Needs Approval" and "Reported" with
`common.commaListSeparator` under `all`, else the tab's word. Columns
(`getCommentsTableColumns`): `submission.submission` "Submission"
(`UserCommentCellSubmission`: `{submissionId}. {authorsStringShort} ;
{fullTitle}`, the family names), `manager.userComment.comment` "Comment", `common.user`
"User", `common.status` "Status", `grid.columns.actions` (sr-only) with
`DropdownActions` labelled `common.moreActions` "More Actions" offering
`manager.userComment.viewComment` "View Comment" and
`manager.userComment.deleteComment` "Delete Comment"; empty text
`grid.noItems` "No Items" (`common.loading` "Loading" while fetching).
GET `comments` (moderator route, `withContextIds([current])`) pages by
`itemsPerPage` (`PKPListsForm` field `common.itemsPerPage` "Items per
page", `context.json` default 25); `TablePagination` renders only past one
page. Role gate: the app `SettingsHandler` constructors assign the
`settings` op to `ROLE_ID_MANAGER` in all three apps and to
`ROLE_ID_SITE_ADMIN` on OJS only (footnote m); everyone else meets
`RoleBasedHandlerOperationPolicy`'s refusal, the access-denied page.
Live-probed 2026-09-16 (Rule 10, Fields) on the three apps with seeded
comments: the heading "Comments", the four tabs, the columns
"Submission", "Comment", "User", "Status" and a screen-reader-only
"Actions"; a "Submission" cell "52. Author ; K3 article one …"; a
488-character comment cut to one line with an ellipsis; "Approved,
Reported" under "All" and "Reported" under that tab; the address ending
"#approved" after the tab press and the tab kept on reload; with 36
comments "Showing 1 to 25 of 36" and "Go to Page 2", page 2 kept across a
visit to "Approved" and lost on a reload; the other journal's comment on
no tab; at "Items per page" 5, five rows and "5 of 33". A Section Editor,
an Assistant, an Author, a Reviewer and a Reader had no "Content" group
and got the access-denied page at the address on the three apps. The
browser tab (Rule 10, A13): live-probed 2026-09-28 on the three apps,
the context's name alone on every tab of the page; the mechanism and the
controls are in footnote f-a13.

<a id="fn-j"></a>
**j — the comment panel, approve, hide, delete.** `UserCommentDetailModal.vue`:
pre-title `{submissionId}. {authorsStringShort} ; {fullTitle}`, title
`manager.userComment.viewDetailsCommentBy` "View comment details by",
description the writer's name; `manager.userComment.commentPreview`
"Comment preview" with `formatShortDateTime(createdAt)`, the text, name,
ORCID (`Orcid` / `OrcidUnauthenticated` icon and the iD as a link),
affiliation; `UserCommentReportsTable`; the note
`manager.userComment.approved.note` "This comment was approved on
{$approvedAt} by {$approvedBy}." (`formatShortDate`) or
`manager.userComment.approval.warning` "Approving this comment will make
it visible to all users on the site"; buttons `approveComment` (primary
while unapproved, `is-disabled` when approved), `deleteComment`
(warnable), `hideComment` (`is-disabled` while unapproved).
`commentToggleApproval()` PUTs `comments/{id}/setApproval` with
`approved`, on success toasts `manager.userComment.commentUpdated` and
closes the modal, whose `onClose` refetches the list.
Since pkp/ui-library#853 (issue pkp/pkp-lib#13359, merged 2026-09-24 as
`1afd40a9`) that
refetch depends on the modal store's `dataChanged` flag: `useFetch` sets
it through `modalStore.markModalDataChanged()` on a successful POST, PUT
or DELETE made from the panel (the approval, a report's deletion from the
"Reports" table), a nested report panel's flag passes to the comment
panel when it closes, and `closeSideModalById()` hands `onClose` a
`{dataChanged}` object; `userCommentStore.js`'s `commentView()` `onClose`
refetches only when `shouldTriggerDataChange()` reads it true, and
`reportView()`'s `onClose` does the same for the reports. The change is
in lib/ui-library, shared by the three apps; all three carry it since
their submodule updates of 2026-09-24.
`setApproval()` stores `isApproved`, `approvedAt` = now or null,
`approvedByUserId` = the moderator or null; the resource exposes
`approvedByUserName` to moderators. `commentView()` writes `commentId`
into the query string (`useQueryParams`) and `onMounted` reopens the
panel from it. `commentDelete()` dialog: title
`manager.userComment.deleteComment`, message
`manager.userComment.deleteComment.confirm`, actions `common.delete`
(warnable) and `common.cancel`; success toast
`manager.userComment.deleteComment.success`. Nothing in
`setApproval()` touches notifications (A2) or mails. Live-probed
2026-09-16 (Rules 11 to 14, A2) on the three apps: the row menu "More
Actions" with "View Comment" and "Delete Comment"; the line above the
title, "View comment details by" with the writer's name under it,
"Comment preview" with "2026-09-16 07:29 PM", the text, name, iD and
affiliation; "Approving this comment will make it visible to all users on
the site" while pending or hidden, "This comment was approved on
2026-09-16 by Maya Moderator." after; "Approve Comment" highlighted then
grayed, "Hide Comment" grayed then enabled (a grayed press sends
nothing); the notice "The comment has been updated successfully." at the
top right (56 px down, 8 px from the right edge of a 1280 px window),
the panel closed, the row moved between the tabs, the landing page
following on its next load; the Editor's re-approval after a hide
rewrote the note with "Ed Editor"; "Delete Comment" from the row and
from the panel with the dialog as stated, "Cancel" doing nothing, the
notice "The comment has been deleted successfully." and the row gone
from every tab and from the landing page; a deleted or mistyped number in
the address gave the "Error" dialog "The requested resource was not
found." over "All"; Escape closed the panel like "Close"; the browser's
Back reopened it; the mail catcher held nothing for the writer or the
manager throughout. Driven 2026-09-23 on OJS at the PR head `cab09538`
of pkp/ui-library#853, before its merge (Rules 12, 15): a comment panel
only viewed and closed sent no `GET …/api/v1/comments` refetch, so the
tests of scenarios 2, 3 and 13, which waited for one after a view-only
"Close", went red in the OJS PR check (run 35770880623) and again
locally; the "Close" after deleting the comment's two reports still
refetched the list. The same tests pass at the tip's lib/ui-library
`2034439a`, where every close refetched.

<a id="fn-k"></a>
**k — reports.** `UserCommentReportsTable.vue`: label
`manager.userComment.reports` "Reports", description
`manager.userComment.report.description`, columns
`manager.userComment.reportedBy` "Reported By",
`manager.userComment.report.reason` "Reason",
`manager.userComment.dateReported` "Date Reported" (`formatShortDate`),
actions `manager.userComment.viewReport` "View Report" and
`manager.userComment.deleteReport` "Delete Report"; empty text
`manager.userComment.report.noReports`. GET `comments/{id}/reports` pages
like the comments. `UserCommentReportDetailModal.vue`: title
`manager.userComment.viewReportDetailsBy` "View report details by",
`manager.userComment.reportPreview` "Report preview", the note, the
reporter's name, ORCID and affiliation, button "Delete Report".
`reportDelete()` dialog: `manager.userComment.deleteReport` /
`manager.userComment.deleteReport.confirm`, actions `common.delete` and
`common.cancel`; DELETE `comments/{commentId}/reports/{reportId}` deletes
the row and its `ASSOC_TYPE_COMMENT_REPORT` notifications; success toast
`manager.userComment.deleteReport.success`. `reportView()` writes
`reportId` and `commentId` into the query string. The "Reported" tab is
`withIsReported(true)` = `whereHas('reports')`, so it empties when the last
report goes. Live-probed 2026-09-16 (Rule 15, Fields, A8) on the three
apps: the "Reports" table with its description and columns, dates as
"2026-09-16", "No one has reported this comment yet" with none; "View
Report" opened "View report details by" with the reporter's name under
it, "Report preview" with the date and time, the reason and the name,
over the comment panel at "?commentId={n}&reportId={r}", the same on a
typed address; "Close" on it left the comment panel open and the address
with neither number, as did deleting the report from it; "Delete Report"
from the panel and from the row with the dialog as stated, the notice
"The report has been deleted successfully." and the table reloaded; the
last deletion took the comment off "Reported" with "Approved" under "All"
and the approval note unchanged; a reporter with a verified iD and an
affiliation shown in the report panel as in the comment panel (the
unverified end was not driven in the report panel); at "Items per page"
5, six reports paged "Showing 1 to 5 of 6". The reporters' mail stayed
at zero.

<a id="fn-l"></a>
**l — the moderators' tasks.** `UserCommentController::notifyModerators()`
collects users with `ROLE_ID_SITE_ADMIN` or `ROLE_ID_MANAGER` filtered by
`filterByContextIds([context])`; the collector matches
`COALESCE(ug.context_id, 0)` against the context id, so the site-wide
admin group (null context) never matches and only accounts holding a
manager-level group in the journal (Journal Manager, Editor, an admin
enrolled as one) get a row. `createNotification()` with
`NOTIFICATION_LEVEL_TASK`, `assocType` `ASSOC_TYPE_COMMENT` /
`ASSOC_TYPE_COMMENT_REPORT`; `PKPNotificationOperationManager::createNotification()`
sends no mail, and the two types (`NOTIFICATION_TYPE_USER_COMMENT_POSTED`
`0x100002D`, `NOTIFICATION_TYPE_USER_COMMENT_REPORTED` `0x100002E`) are
absent from `PKPNotificationManager::getNotificationSettingsMap()`, so
the Notifications tab lists no row for them and `getUserBlockedNotifications()`
can never block them. Sentences:
`PKPNotificationManager::getNotificationMessage()` returns
`manager.userComment.moderator.commentSubmitted` /
`manager.userComment.moderator.commentReported`; the Tasks grid's
`NotificationsGridCellProvider::_getTitle()` returns
`Str::limit(commentText, 200)` / `Str::limit(note, 200)` (the first 200
characters plus "...") in the slot `task.tpl` prints under the message. URLs
(`PKPNotificationManager::getNotificationUrl()`):
`management/settings/userComments?commentId=N` and
`…?reportId=R&commentId=N`, which the page's `onMounted` turns into the
open panels. Deletion: `delete()` removes the comment's
`ASSOC_TYPE_COMMENT` notifications and its reports'
`ASSOC_TYPE_COMMENT_REPORT` ones on OJS (lib/pkp `26ae6431b5`); on OMP
and OPS (lib/pkp `17a1f01fed`) the notifications of either type whose id
is the comment's or one of its reports', every type paired with every id
and in any context (footnote h, A11);
`deleteReport()` removes the `ASSOC_TYPE_COMMENT_REPORT` ones of its
report; `setApproval()` removes none (A2). Re-driven 2026-09-27 on the
three apps (Side effects, A2, A10): the moderator's deletion of a comment
cleared its own "pending review" row and its report's row, a report's
deletion its own row only (the other report's and the comment's stayed),
and "Approve Comment" and "Hide Comment" left the rows in place; a
"Merge user" of a writer took the comment off the Comments page and left
its row in the panel, blank. Live-probed 2026-09-16 (Side effects, Rule 16, Actors rows 7 and 8,
A2, A10): the Journal Manager's and the Editor's panels each gained the
unread row with the comment's text under it (a 300-character comment and
a 300-character reason cut to 200 characters plus "..."), the Section
Editor's panel "No Items"; pressing the rows opened the Comments page
with the comment panel, and with the report panel on top for a report;
Profile › Notifications lists no row about comments; the mail catcher
held nothing for the moderators, the writer or the reporter at any step,
while a Users & Roles "Email" to the reporter arrived (the control);
after the approval and the hide the rows stayed; the writer's and the
moderator's deletion cleared the comment's and its reports' rows for
both moderators, a report's deletion its own row only. Site
Administrator: enrolled as the manager, a row; with the manager role
ended (footnote m) and a Section Editor role kept, none for a new
comment while the manager's panel had it. On a press and a preprint
server, with a comment and a report seeded (nothing on a press or a
server writes one), the manager's panel carried the same two rows,
pressing them opened the same panels, and deleting the comment from its
panel cleared both. The rows left behind by a submission's or an
account's deletion: footnote f-a10.

<a id="fn-m"></a>
**m — the Site Administrator per app.** `ojs/pages/management/SettingsHandler`
assigns `['access', 'settings']` to `ROLE_ID_SITE_ADMIN`;
`omp/pages/management/SettingsHandler` and `ops/…/SettingsHandler` assign
`['access']` only, so on OMP and OPS a site admin without a manager group
in the context fails `RoleBasedHandlerOperationPolicy` for the `settings`
op (and every settings tab too, which the settings features own), while
each app's `TemplateManager::setupBackendPage()` offers the Content menu
for `ROLE_ID_SITE_ADMIN` among the authorized roles (OMP1, OPS1). The
API's moderator routes (`roleAuthorizer([SITE_ADMIN, MANAGER])`) admit a
site admin on all three. The seeded and the scratch contexts enrol `admin`
as a manager (seed facts), so the state needs the role removed first.
Live-probed 2026-09-16 (Rule 17, Actors row 6, OMP1, OPS1, A9): `admin`'s
own row menu in Users & Roles offers "Edit" and "Email" only (no "Remove
User"), and the edit page's "Remove Role" refuses the last role, so the
state was built by seeding `admin` a second role and, as `admin`, ending
the manager role on its own edit page (Settings › Users & Roles › Users
› admin › Edit › the manager row's "Remove Role", the dialog "Are you
sure you want to remove this role? The user will lose access and
permissions associated with it."). With a Section Editor (Series Editor,
Moderator) role kept: on the journal the dashboard, "Content ›
Comments", the page and the "Comments" tab all worked and the setting was
saved both ways; on the press and the server "Content › Comments" was
offered and the entry, the page's address and Settings › Website all
answered the access-denied page. With Reader as the only role: signing
in lands on the context's home page, but every editorial page the account
opens carries the side menu ("Editor Dashboard", "Start A New
Submission", "DOIs", "Settings", "Content", "Statistics", "Tools",
"Administration"), and the dashboard's address opens "Search Results (0)"
under the same dialog (A9; live-probed 2026-09-28 on the three apps, two
runs, footnote f-a9); the press and the server refused the
address, the journal opened the page with its rows under the "Error"
dialog "The current role does not have access to this operation." /
"OK", raised by the side menu's own submissions-count request answering
401; Settings › Website the same (A9). Enrolled as the manager:
everything open on the three apps. The access-denied page is the
context's public page at
"…/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied",
answered with HTTP 200 and reading "Home / The current role does not
have access to this operation."; signed out, the Comments page's and the
Website settings' addresses answer the Login page with the address as
`source`.

<a id="fn-o"></a>
**o — when the article or the account goes.** `UserCommentsMigration`:
`user_comments.publication_id` → `publications` and `user_id` → `users`
both `onDelete('cascade')`, `user_comment_reports.user_comment_id` →
`user_comments` and `user_id` → `users` cascade. Unpublishing changes the
publication's status only; the landing page stops answering for a
submission with no published version, and `getPublishedPublications()`
drops the version from the block. The `notifications` rows have no such
cascade (footnote l, A10). Live-probed 2026-09-16 (Rule 18, A10) on a
journal, on a `published: true` seed without `decisions` (published
straight from the Submission stage, back there after the unpublish): no
stage of a published or unpublished submission offers "Delete"; after
"Decline Submission" on the Submission stage the stage
offered "Schedule For Publication, Revert Decline, Delete", and "Delete"
("Are you sure you want to permanently delete this submission?" /
"Confirm") took the submission's comments off every tab of the Comments
page. Users & Roles › Users › a row's menu: "Edit, Email, Login As,
Remove User, Disable User, Merge user"; "Remove User" ("Remove this user
from this journal? This action will unenroll the user from all roles
within this journal.") kept the row listed and the account's comment and
report in place; "Merge user" opens the window "Merge user" listing the
journal's users, a row's "Settings" reveals "Merge into this User", and
the confirm reads "Are you sure you wish to merge the account with the
username "{old}" into the account with the username "{new}"? The account
with the username "{old}" will not exist afterwards. This action is not
reversible."; afterwards the merged account's comment and report were
gone and the other writer's kept, on the Comments page and on the landing
page. Unpublishing the only version: the workflow read "Status:
Unscheduled", the Comments page still listed both comments, the article's
page answered "404 Not Found" signed out and as the writer; "Schedule For
Publication" again: "Status: Published", the approved comment back under
"Version of Record 1.0 (1)" for a visitor and both, "(2)", for the writer
of the pending one. The press and the server were not driven for this
rule.

<a id="fn-p"></a>
**p — ownership pointers.** The Cross-feature bullets marked with this
note say which spec describes a neighbouring screen and claim nothing
that screen shows: no screen to drive. The "Permit changes to Settings"
fact itself is Actors rows 5 and 6's, driven under footnote b.

<a id="fn-s0"></a>
**s0 — the scenario preamble.** The seeded `publicknowledge` keeps
`enablePublicComments` off and holds no published item (live-probed
2026-09-16: the "Comments" tab's box unticked, the Archives, the current
issue and the home page listing no article), so every scenario seeds a
scratch context and a submission with `published: true`
(`POST scenarios/submission`); readers are throwaway `users[]` with
`roles: ['reader']`, the moderator the scratch manager (`roles:
['manager']`) or an `editor` (a preprint server has no editor key, so its
second moderator level is not seeded). The context passthrough
`enablePublicComments` and the submission key `userComments[]` (`user`,
`text`, `approved?`, `reports?`) are built (scenarios.md); `userComments[]`
on a comments-off context is the "off with comments kept" state and
leaves the box unticked; `users[]` takes `{username: 'admin', roles:
[...]}` to give `admin` a second role (footnote m). Seeded comments raise
the moderators' tasks like typed ones, and a batch seeded in one call
shares a second and lists in no fixed order. Mailpit reads scope by
throwaway recipient (scenarios.md "Mailpit"); its total never moves at
the 500-message cap. The preamble itself describes how the scenarios are
set up and names no screen.

<a id="fn-s1"></a>
**s1 — scenario 1.** A scratch context seeded `enablePublicComments: true`
with a submission `published: true` carrying `userComments: [{user, text,
approved: true}]`, the writer a throwaway `reader`; the manager is the
scratch `manager`. The fresh journal of the control is a second scratch
context created without the `enablePublicComments` key and without
comments (the row at 0, scenarios.md). The save is read on the reloaded
page: the address still ends "#publicComments", the "Content" tab is
reopened by hand, and no test waits for "Saved" (A5); the side menu is
read after that reload. The Comments page's address is
`{context}/management/settings/userComments`. Runs on the three apps; the
landing-page bullets on OJS at `article/view/{id}`.

<a id="fn-s2"></a>
**s2 — scenario 2.** Throwaway `users[]`: the pending comment's writer a
`reader` with `orcid` and `orcidIsVerified: true` (the solid icon,
footnote f-a6); `users[]` has no affiliation key, so the test sets the
writer's affiliation on the account's Profile › Contact before the pages
are read (a comment shows whatever the profile holds at load), or the
harness step adds the key. Two more `reader`s: one writes the approved
comment, the other the approved-and-reported one, reported by the first
(a reporter must not be the writer). The three `userComments[]` entries
may go in one call: the bullets locate rows by their "User" or "Comment"
cell, never by position (a batch shares one second and lists in no fixed
order). A seeded approval's note names the seeding `admin`; the note the
scenario reads is the one after the on-screen "Approve Comment", which
names the manager. The second journal is a second scratch context with its
own published submission and one comment. The landing-page bullets run on
OJS, signed out and then as the writer.

<a id="fn-s3"></a>
**s3 — scenario 3.** Two approved `userComments[]` by one `reader`; the
first with `reports: [{user, note}, {user, note}]` by two other `reader`s,
the second with none. Two reports seeded in one call share a second, so
"the first row" is whichever the table lists first and no order between
them is asserted. The address after "View Report" reads
`?commentId={n}&reportId={r}` (footnote k); the A8 read is the address
with neither key while the comment panel is still open. Three apps.

<a id="fn-s4"></a>
**s4 — scenario 4.** Three `userComments[]` by two `reader`s: approved
without a report, approved with one report by the other reader, and
pending; rows are located by their "Comment" text. The noted address is
`…/userComments?commentId={n}`, which answers the "Error" dialog once the
comment is gone (footnote j). The landing page is read on OJS, signed
out. Three apps.

<a id="fn-s5"></a>
**s5 — scenario 5.** Moderators: the scratch `manager`, an `editor` (OJS
and OMP; OPS has no editor key) and a `sectionEditor` (the Moderator on
OPS). The writer and the reporter are two `reader`s; the comment's `text`
and the report's `note` are each 300 characters, so the rows show the
first 200 and "..." (footnote l). Seeded comments and reports raise the
rows as typed ones do; `admin`, the auto-enrolled manager, gets them too
and is not read. The Tasks panel is the bell on any editorial page
(*Notifications center & email preferences*). Mailboxes: Mailpit at
`MAILPIT_URL`, read by throwaway recipient, never by count; the control
email is one sent to the same recipient by the Users & Roles row's
"Email" (footnote l), waited for before the absence is judged
(`expectNone` with `afterControl`). Three apps.

<a id="fn-s6"></a>
**s6 — scenario 6.** Throwaway `sectionEditor`, `author` and `reader`
(on OPS the Section Editor is the Moderator). The access-denied page is
`…/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`,
answered with HTTP 200 (footnote m); signed out, the address answers the
Login page with the address as `source`. A Reader's login lands on the
reader-facing home and offers no dashboard (seed-facts), so only the
address is read for the Reader. Three apps.

<a id="fn-s7"></a>
**s7 — scenario 7.** 26 `userComments[]` entries, `approved: true`, by
one `reader`, seeded in one call (one second, no fixed order; no row is
located by position); "Items per page" at its install default 25
(seed-facts). The second page's link reads "Go to Page 2" under
"Showing 1 to 25 of 26" (footnote i). The landing-page bullet runs on
OJS, signed out. Three apps.

<a id="fn-s8"></a>
**s8 — scenario 8.** Two `reader`s and the `manager`; one approved
`userComments[]` entry by the second reader; a second `published: true`
submission with none. The landing page is `article/view/{id}`; "Log in to
comment" carries the article's address as `source` and returns to
"…#public-comments" (footnote f); a test asserts the address and the
box, never a scroll position. "Submit" grayed out is the button's
disabled state, not a missing button. The formatting bullet's text is
typed as written; bold and "plain" survive, the script does not
(footnote f). The sidebar's count stays until the next page load.

<a id="fn-s9"></a>
**s9 — scenario 9.** The reporter a `reader`, the writer a second `reader`
with no affiliation (a throwaway `users[]` account has none by default),
and the `manager`; one approved `userComments[]` entry by the writer. An
empty reason sends no request (footnote g); "Date Reported" shows the
date as "2026-09-16"-style (footnote k). A second report by the same
person is A3's and is not driven.

<a id="fn-s10"></a>
**s10 — scenario 10.** Two `reader`s, A and B, and the `manager`; A's
comment `approved: true` with `reports: [{user: B, note}]`, B's comment
`approved: true`. The manager's two task rows come from the seed. The
heading's count changes on the next load (footnote h).

<a id="fn-s11"></a>
**s11 — scenario 11.** Two `reader`s and the `manager`; one `published:
true` submission with two approved `userComments[]` entries, one per
reader. No scenario key seeds a second version: the manager creates and
publishes it on the workflow screen ("Create New Version", then
"Publish"; *Publish, schedule & versions* scenarios 4 and 5, whose
openers wait for the version dialog's stage select). The parts read
"Version of Record 1.1 (0)" and "Version of Record 1.0 (2)" (footnote d).

<a id="fn-s12"></a>
**s12 — scenario 12.** Reader A (`reader`) writes both comments: one
`approved: true` with `reports: [{user: B, note}]` by reader B, one
pending; both submissions `published: true` with no `decisions`, so the
unpublish returns the first to the Submission stage (the bubble read
"Submission", footnote o) and "Decline Submission" is offered there.
Unpublish and publish again on the workflow's Publication area
(*Publish, schedule & versions* scenarios 3 and 10); then "Decline
Submission" and "Delete" on the Submission stage, confirmed with
"Confirm" (footnote o). The "404 Not Found" is read signed out and as
reader A. The rows that stay: two comment rows and one report row,
pressable but dead (footnote f-a10).

<a id="fn-s13"></a>
**s13 — scenario 13.** Readers A and B (`reader`) and the `manager`; A's
comment `approved: true` with `reports: [{user: B, note}]`, B's comment
`approved: true`. "Merge user" opens the window "Merge user" listing the
journal's users; A's row's "Settings" reveals "Merge into this User", and
the confirm names both usernames (footnote o). "Remove User" asks "Remove
this user from this journal? This action will unenroll the user from all
roles within this journal." (footnote o). The rows that stay: B's comment
row and B's report row (footnote f-a10).

<a id="fn-s14"></a>
**s14 — scenario 14.** A scratch press or preprint server seeded
`enablePublicComments: true` with a `published: true` submission (posted,
on the server) and a throwaway `reader`; no `userComments[]`, so the
Comments page reads "No Items". The landing page is the published item's
public page, reached from the press's catalog or the server's archive;
its absence assertions pair with the positive control of the same
scenario (PRINCIPLES M4). OMP and OPS only.

<a id="fn-f-a1"></a>
**f-a1 — A1.** `PkpCommentsNotificationMessageNeedsApproval.vue` shows the
notice for `!message.isApproved` and the writer; `setApproval(false)`
leaves the row identical to a fresh one apart from the cleared
`approvedAt` / `approvedByUserId` settings. No other locale key exists for
a hidden state (`lib/pkp/locale/en/UserComment.po`). Live-probed
2026-09-16: after the manager's "Hide Comment" the writer's landing page
listed the comment last with the same notice and icon as the pending ones
and "Delete Comment" in its menu; the Comments page's "Hidden/Needs
Approval" tab listed it with the pending ones.

<a id="fn-f-a2"></a>
**f-a2 — A2.** `UserCommentController::setApproval()` saves the comment
and returns; `delete()`, `deleteReport()` and `deleteReports()` are the
only methods that touch `Notification`. Compare the "needs an editor" task,
cleared by the assignment (the notifications spec's roster). Live-probed
2026-09-16: the "pending review" row stayed in the Journal Manager's and
the Editor's panels after "Approve Comment" and after "Hide Comment";
only the comment's deletion, by its writer or a moderator, cleared it; a
report's deletion cleared its own row only.

<a id="fn-f-a3"></a>
**f-a3 — A3.** `usePkpCommentsStore.commentReport()`: the "Submit"
callback returns early on an empty trimmed reason with no `notify`;
`performCommentReport()` closes the top dialog and sets a local
`isReported` that no component renders; `getCommentActions()` has no
"already reported" branch; `AddReport` has no uniqueness rule, and
`Repository::addReport()` creates a row per call. Live-probed 2026-09-16:
"Submit" with an empty or blank reason sent no request and showed
nothing; a filed report closed the dialog with no message and the comment
unchanged, "Report" was offered again, and a second and then six more
reports by the same person were filed, all listed in the panel's
"Reports" table.

<a id="fn-f-a4"></a>
**f-a4 — A4.** `ManagementHandler::userComments()` and the API's moderator
routes read no `enablePublicComments`; only `TemplateManager::setupBackendPage()`
(the menu) and `ArticleHandler::view()` (the block) do. Live-probed
2026-09-16 on the three apps: with the box unticked the side menu lost
Content › Comments on the save's own reload and the address opened the
full page with every comment under its tabs (the panel's actions were not
pressed in that state). The question and the lean are the author's; no
screen settles them.

<a id="fn-f-a5"></a>
**f-a5 — A5.** Footnote b: right after the save request the browser
navigates to the same address (the console log records the navigation),
and the Website Settings page opens on its first tab. Live-probed
2026-09-16 on the three apps: "Saving" for a beat, then the reload landing
on Appearance › Theme with no "Saved" within 6 s; the Setup › Information
and Setup › Lists forms, the control, showing "Saving" then "Saved" in
place.

<a id="fn-f-a6"></a>
**f-a6 — A6.** `PkpOrcidDisplay` (the shared ORCID display the comment and
the panels use) takes `userOrcidDisplayValue`, which already carries the
"(unauthenticated)" suffix for an unverified iD, as both the link's text
and its address. Live-probed 2026-09-16, the landing page (journal) and
the comment panel (the three apps): verified, the address and the text
`https://orcid.org/0000-0002-1825-0097` with the solid icon; unverified,
the text and the address both `https://orcid.org/0000-0001-5109-3700
(unauthenticated)` with the hollow icon. The report panel's unverified
end was not driven (the same field feeds it). The profile's own display
of an iD is *[ORCID integration](U04-orcid-integration.md)*'s.

<a id="fn-f-a7"></a>
**f-a7 — A7.** `PkpCommentsMessageActions` renders `PkpDropdownMenu` with
an icon-only trigger (`MoreOptions`) and sets no trigger label.
Live-probed 2026-09-16: the only button in a comment's article element
has no accessible name (a `button` holding an `img`); the Comments page's
row menu reads "More Actions".

<a id="fn-f-a8"></a>
**f-a8 — A8.** `reportView()` writes `reportId` and `commentId` into the
query string; closing the report panel clears both keys. Live-probed
2026-09-16 on the three apps: "Close" on the report panel left the
address at "…/userComments#reported" with the comment panel still open;
deleting the report from the panel left "…/userComments" the same way.

<a id="fn-f-a9"></a>
**f-a9 — A9.** The dialog is raised by the side menu's submissions-count
request (`_submissions/viewsCount`) answering 401 for an account with no
dashboard access; the Comments page's own requests succeed. Live-probed
2026-09-16 (footnote m's Reader-only state): the journal's page with its
rows under the dialog, Settings › Website the same; the press and the
server answering the access-denied page. Live-probed 2026-09-28 on scratch
contexts of the three apps, two runs each, `admin` left with Reader
alone (manager role ended on its own edit page, fresh sign-in) (Rule
17b, A9): on the journal the dialog showed 1–2 s after each load of the
Comments page, Settings › Journal, Website and Users & Roles,
Announcements, Statistics › Articles, Tools and the dashboard ("Search
Results (0)"), and not on the journal's home page; on each the only
refused request was `GET _submissions/viewsCount` (401), the dashboard
adding `_submissions/assigned` (401), while the Comments page's `GET
comments` answered 200. On the press and the server the Comments page and
the settings pages answered the access-denied page, and the dashboard,
Statistics › Monographs / Preprints and Tools showed the same dialog from
the same 401. After "OK" on the journal's Comments page the dialog stayed
away until the next load; "Hidden/Needs Approval" listed the pending
comment (`GET comments?isApproved=false` 200), the row's "…" offered
"View Comment" and "Delete Comment", the panel "Approve Comment", "Delete
Comment" and a grayed "Hide Comment", and "Approve Comment" (`POST
comments/{id}/setApproval` 200) showed "The comment has been updated
successfully." and closed the panel; the API's moderator routes admit a
Site Administrator (footnote m). Control: `admin` still holding the
manager role got no dialog and no 401 on the Comments page and Settings ›
Journal and Website. Every load of Settings › Website, the control's
included, answered the Plugin Gallery's server error, which is
*[Plugins management](U62-plugins-management.md#a1)*'s A1 and not this
entry's. The dashboard's side of the same dialog, and the question, are
*[Submissions dashboard (editorial)](U23-submissions-dashboard.md#a9)*'s
A9.

<a id="fn-f-a10"></a>
**f-a10 — A10.** `user_comments` rows go with their publication and their
user by database cascade (footnote o), while the `notifications` rows for
`ASSOC_TYPE_COMMENT` and `ASSOC_TYPE_COMMENT_REPORT` are deleted only by
the comment and report deletion routes (footnote l), so a comment removed
by cascade leaves them. Live-probed 2026-09-16 on a journal, each path
once: after the deletion of a submission carrying a reported comment
(Decline › Delete) and after the "Merge user" of a writer, the Journal
Manager's and the Editor's panels kept five rows (two comment tasks,
three report tasks) with the sentence and an empty line under it, still
pressable: a comment's opened the Comments page at "?commentId={n}" under
"Error" / "The requested resource was not found.", a report's opened the
page at "?reportId={r}&commentId=" with no panel; the rows stayed, marked
read.

<a id="fn-f-a11"></a>
**f-a11 — A11.** On OMP and OPS (lib/pkp `17a1f01fed`),
`UserCommentController::delete()` collects the comment's
report ids, deletes the comment, then runs one
`Notification::whereIn('assoc_type', [ASSOC_TYPE_COMMENT, ASSOC_TYPE_COMMENT_REPORT])->whereIn('assoc_id', [commentId, …reportIds])->delete()`:
every type is paired with every id and no context condition applies, so
it also deletes (`ASSOC_TYPE_COMMENT_REPORT`, commentId), the tasks of
the report whose id is the comment's, and (`ASSOC_TYPE_COMMENT`,
reportId), the tasks of the comment whose id is one of the reports',
across all contexts. `user_comments` and `user_comment_reports` are two
id sequences that both start at 1 on a fresh install. OJS carries
pkp/pkp-lib `26ae6431b5` (#12401, 2026-09-27), which splits the delete
into (`ASSOC_TYPE_COMMENT`, commentId) and (`ASSOC_TYPE_COMMENT_REPORT`,
reportIds); OMP and OPS (lib/pkp `17a1f01fed`) still run the single
paired query and take the fix with their next lib/pkp pointer update, and
the sync that sees it in all three retires the entry. The delete came with
pkp/pkp-lib#12401, lib/pkp `677b737d20` "Delete associated notifications
when public comments or reports are deleted" (2026-03-04); before it a
comment's deletion cleared no task at all. Live-probed 2026-09-26, OJS, OMP and
OPS, scratch contexts only: journal B held one Reader's comment numbered
c; reports filed in a third scratch journal brought the report numbering
up to c−1; journal A held one comment with two reports, numbered c and
c+1. A's Journal Manager's Tasks window listed two "A report was
submitted for a comment and requires review by a moderator." rows and
one "A comment has been submitted and is pending review by a moderator."
row. B's Journal Manager, on B's Content › Comments, pressed the row's
"…" › "Delete Comment" › "Delete" ("The comment has been deleted
successfully."). A's Tasks window then listed one report row: report
c's was gone, report c+1's and the comment's stayed, and A's "Reported"
tab still listed the comment with both reports in its "Reports" table.
Seen with c = 52 and c = 61 on OJS and c = 3 on OMP and OPS, the row gone
each time; the control, B deleting a comment whose number no report of A
carried, left all three rows on the three apps. The comment-side
direction was seen on OJS on a freshly reset install, with several
comments deleted in parallel: a moderator's Tasks window lacked a
comment's "pending review" row, and the database then held no task for
that comment and no report of that number, deleted with its own comment.
Reported to the team on 2026-09-26 and fixed on OJS by `26ae6431b5`.
Re-driven 2026-09-27 on scratch contexts, OJS with the fix, OMP and OPS
without: with c = 3, OJS kept report c's row, OMP and OPS lost it, and
the control left all rows on the three apps; the comment-side direction
driven on its own (journal A's comment numbered like journal B's
comment's report; B's manager deleted B's comment on B's Comments page,
B's own comment row and report row leaving B's panel): OJS kept A's row
for the Journal Manager and the Editor, OMP lost it for the Press Manager
and the Press Editor, OPS for the Preprint Server Manager; the landing
page's "Delete Comment" by the writer (OJS, c = 6) kept report c's row
too, while the writer's own comment's row left B's manager's panel. In
the collision and landing drives A's "Reported" tab still listed the
comment with both reports; no message appeared and no request answered a
server error.

<a id="fn-f-a12"></a>
**f-a12 — A12.** `lib/pkp/api/v1/comments/UserCommentController.php`:
`get()`, `delete()`, `setApproval()`, `getReports()` and `deleteReports()`
load the comment with `UserComment::query()->find($commentId)`, the number
alone, and `getReport()` / `deleteReport()` with
`withCommentIds([$commentId])->withReportIds([$reportId])`; none compares
the comment's `contextId` with the request's context, while the list
routes `getMany()` and `getManyPublicComments()` scope with
`withContextIds()` (footnotes e, i). The moderator routes check the manager
role in the request's context only (`roleAuthorizer([SITE_ADMIN,
MANAGER])`, `Repository::isModerator()`), so a manager of A passes and then
names B's number; `submitReport()` sits in the signed-in group with no role
check, and `notifyModerators()` raises the task for the request's context
(footnote l). The controller is lib/pkp's, identical in the three apps at
lib/pkp `1ad4a14bb2`; the by-number routes have been unscoped since the
comments API was added. Live-probed 2026-09-26 under the one exception to
screen-only driving (an API route no screen calls with another journal's
number), on fresh scratch journals A and B of OJS, OMP and OPS, as A's
Journal Manager holding no role in B, from a page of A with the page's
CSRF token: `GET {A}/api/v1/comments/{B's id}` answered 200 with B's
unapproved and approved comments; `PUT …/setApproval` with
`{"approved": true}` answered 200 and approved B's pending comment;
`GET …/reports` and `…/reports/{id}` answered 200 with B's reports and
their reasons; `POST …/reports` filed a report on B's approved comment
(B's report count 1 → 2, the task raised in A); `DELETE` answered 200 and
B's comment was gone (a following `GET` answered 404). A plain Reader of
A, `POST {A}/api/v1/comments/{B's approved id}/reports` with a note: 200,
the report filed and the task raised in A (OJS; the controller identical
in the three). Control: the same requests naming A's own comment answered
200. No server error. Hiding (`{"approved": false}`) is the same request
as the approval and was not sent on its own; `DELETE …/reports/{id}` on
B's report was not driven. The maintainer ruled on 2026-09-26 that this is
an ordinary finding (reader comments are unreleased 3.6; stable-3_5_0 has
none). Reported to the team on 2026-09-26 together with A11; A11's fix,
pkp/pkp-lib `26ae6431b5`, changes only the notification deletion and
leaves these by-number lookups as they are.

<a id="fn-f-a13"></a>
**f-a13 — A13.** `ManagementHandler::userComments()` assigns no
`pageTitle`, while `announcements()`, which also moved out of settings
under the same address prefix, assigns `manager.setup.announcements`, and
`context()`, `website()`, `workflow()`, `distribution()`, `access()`,
`institutions()` and `manageEmails()` assign their own; `layouts/backend.tpl`
prints `{title|strip_tags value=$pageTitle}`, which with no title leaves
the context's name alone (read at ojs lib/pkp `26ae6431b5`, omp and ops
lib/pkp `17a1f01fed`). Live-probed 2026-09-28 on scratch contexts of the
three apps, two runs each (Rule 10, A13): the tab read "{context name}"
alone when the page was opened from Content › Comments and by its
address, on each of the four tabs, with a comment panel open
(`?commentId=N`) and after a reload on "#reported", for the Journal
Manager and for the Editor (OJS, OMP; a preprint server has no second
manager-level role), with the setting on and, by address, off ("No
Items"). The controls read "Journal Settings" / "Setup" (OMP) / "Server
Settings" (OPS), "Website Settings", "Workflow Settings", "Distribution
Settings", "Users & Roles", "Announcements", "Institutions" and "Manage
Emails", each followed by " | {context name}"; the dashboard "Submissions
| {context name}"; the frontend's About page "About the Journal" /
"About the Press" / "About the Server" | {context name}. Every load of
Settings › Website answered the Plugin Gallery's server error,
*[Plugins management](U62-plugins-management.md#a1)*'s A1, which is not
this entry's.

<a id="fn-f-omp1"></a>
**f-omp1 — OMP1.** Footnote m: `omp/pages/management/SettingsHandler::__construct()`
assigns `ROLE_ID_SITE_ADMIN` the `access` op only, against OJS's
`['access', 'settings']`; `omp/classes/template/TemplateManager.php`
builds the Content group for `ROLE_ID_SITE_ADMIN`. Live-probed 2026-09-16
with `admin` holding a Series Editor role and no manager role (footnote
m): "Content › Comments" offered, the entry and the address answering the
access-denied page, the journal opening the page for the same account.
The question and the lean are the author's; no screen settles them.

<a id="fn-f-ops1"></a>
**f-ops1 — OPS1.** Footnote m: `ops/pages/management/SettingsHandler::__construct()`
assigns `ROLE_ID_SITE_ADMIN` the `access` op only;
`ops/classes/template/TemplateManager.php` builds the Content group, with
"Comments" as its only entry, for `ROLE_ID_SITE_ADMIN`. Live-probed
2026-09-16 with `admin` holding a Moderator role and no manager role
(footnote m): the "Content" group with "Comments" alone offered, the
entry and the address answering the access-denied page, the journal
opening the page for the same account. The question and the lean are the
author's; no screen settles them.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Comments" settings tab ("Enable Public Comments" + Save) | Settings › Website › Content › Comments (`management/settings/website#content`) | AFFM-052 |
| Comments page (moderation) | editorial side menu Content › Comments; `management/settings/userComments` | VUE-010 (mounted by the settings dispatcher's `userComments` op, ROUTE-017, owned by *Journal identity & about pages*) |
| Status tabs "All" / "Approved" / "Hidden/Needs Approval" / "Reported" | Comments page | AFFM-141 |
| Comment row "…" › "View Comment" | Comments page table | AFFM-142 · VUE-082 |
| Comment row "…" › "Delete Comment" (confirm dialog) | Comments page table | AFFM-143 |
| Comment panel "Approve Comment" / "Hide Comment" / "Delete Comment" | comment panel | AFFM-144 · VUE-082 |
| Reports table row "…" › "View Report" | comment panel › Reports | AFFM-145 · VUE-083 |
| Reports table row "…" › "Delete Report" (confirm dialog) | comment panel › Reports; report panel | AFFM-146 · VUE-083 |
| Comments and reports paging | Comments page; comment panel › Reports | AFFM-147 |
| Landing-page blocks: "Comments on this publication" (comment box, "Submit", "Log in to comment", "Show more", the "…" menu, the "Report Comment" and "Delete Comment" dialogs) and the sidebar "Comments" ("All Comments (N)", "Log in to comment") | a published article's landing page (`article/view/{id}`), OJS only | AFFR-058 |
| Comments API | `api/v1/comments` (`public` list; POST; DELETE `{id}`; POST `{id}/reports`; moderator: list, GET `{id}`, PUT `{id}/setApproval`, reports list/get/delete) | API-012 |
| Task "A comment has been submitted and is pending review by a moderator." | the Tasks panel | NOTIF-052 |
| Task "A report was submitted for a comment and requires review by a moderator." | the Tasks panel | NOTIF-053 |

## Reference — code anchors

- `lib/pkp/api/v1/comments/UserCommentController.php` — the routes, the
  public list, submit, delete, approval, reports, `notifyModerators()`;
  `formRequests/AddComment.php`, `formRequests/AddReport.php` — the
  validation; `resources/UserCommentResource.php`,
  `resources/UserCommentReportResource.php` — what the screens receive.
- `lib/pkp/classes/userComment/UserComment.php`, `Repository.php`
  (`isModerator()`, `getPaginatedData()`, `getPerPage()`),
  `relationships/UserCommentReport.php`;
  `lib/pkp/classes/migration/install/UserCommentsMigration.php` — the
  tables and cascades.
- `lib/pkp/classes/components/forms/context/ContentCommentsForm.php` +
  `lib/pkp/schemas/context.json` (`enablePublicComments`, `itemsPerPage`)
  + `lib/pkp/templates/management/website.tpl` — the setting.
- `lib/pkp/pages/management/ManagementHandler.php` (`authorize()`,
  `settings()`, `website()`, `userComments()`) +
  `lib/pkp/templates/management/userComments.tpl`; the app
  `pages/management/SettingsHandler.php` constructors — the role gates.
- `lib/ui-library/src/pages/userComments/*` (`UserCommentsPage.vue`,
  `userCommentStore.js`, `useUserCommentsConfig.js`, the tables, cells and
  the two modals) — the moderation page.
- `lib/pkp/classes/components/UserCommentComponent.php` +
  `ojs/pages/article/ArticleHandler.php` (`view()`) +
  `ojs/templates/frontend/objects/article_details.tpl` — the OJS mount;
  `lib/ui-library/src/frontend/components/PkpComments/*`
  (`PkpComments.vue`, `usePkpCommentsStore.js`, the new-comment, actions,
  report-dialog, show-more, log-in and scroll-to components) — the reader
  block.
- `classes/template/TemplateManager.php` in each app
  (`setupBackendPage()`, the Content menu group) — the side-menu entry.
- `lib/pkp/classes/notification/PKPNotificationManager.php`
  (`getNotificationUrl()`, `getNotificationMessage()`),
  `lib/pkp/controllers/grid/notifications/NotificationsGridCellProvider.php`
  (`_getTitle()`) — the tasks.
- `lib/pkp/locale/en/UserComment.po`, `manager.po`
  (`manager.userComment.*`), `api.po` (`api.userComments.*`) — the
  strings.
