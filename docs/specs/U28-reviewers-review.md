---
name: reviewers-review
status: verified
---

# Reviewer's review {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A reviewer is asked by email to review a submission. This feature is
everything that happens on the reviewer's side of that request: the list of
their assignments under "My Assignments as Reviewer", the four-step review
wizard where they accept or decline, read the guidelines, download the files,
write or fill in the review and submit it, and the "Previous Reviews" box
where they re-read what they wrote in an earlier round. It also covers the
sign-in-free link a journal can put into its request emails. The editor's
side of the same assignment (inviting, reminding, reading the review) is
[→ reviewer assignment & management](U27-reviewer-assignment-and-management.md#statuses);
the review round the assignment belongs to is
[→ review stage & rounds](U26-review-stage-and-rounds.md#rounds). The
settings that shape the wizard (review type, forms, guidelines, one-click
access, deadlines) are configured in *Review setup & review forms* and take
effect here.

OPS does not install a reviewer role or a review stage: its Roles settings
list no reviewer group, the sidebar of every installed role has no "My
Assignments as Reviewer" group, and the review wizard has no page on a
preprint server. The list's address typed by any installed role shows the
access-denied page; the wizard's address shows a bare "404 Not Found" page
for every account (scenario 17). A Preprint Server Manager can still create
a role at the "Reviewer" permission level, though the server has no
review stage to give it, and invite a user to it. That user's sidebar
then shows a "My Assignments as Reviewer" heading with no entries under
it, and after signing in they land on the list's page, which is headed
"undefined (0)", lists nothing, and opens an "Error" window over the
empty table ⚠ [OPS1](#ops1). <sup>p</sup>

On a press the wizard runs on both review stages. An Internal Reviewer's
wizard shows the press's "Internal Review Guidelines" and an External
Reviewer's the "External Review Guidelines"; everything else is the same.
A press collects no reviewer recommendation, so its step 3 has no
"Recommendation" list [OMP1](#omp1). <sup>q</sup>

## Actors & permissions

**Terms used below.** A **reviewer** is an account holding a reviewer role
in the journal (on a press: Internal Reviewer or External Reviewer). The
**assigned reviewer** of a submission is the reviewer with a review
assignment on it (a row in the editor's Reviewers panel). An assignment is
**answered** once the reviewer accepted or declined, and **closed** once the
review is submitted or the editor cancelled it. A Site Administrator or an
editor takes part only through a reviewer role of their own; editorial roles
give no access to any screen in this spec. <sup>l</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See "My Assignments as Reviewer"** (the sidebar group and its list) | • Reviewer: always, listing only their own assignments in this journal (Rule 2)<br>• Any other account: no sidebar group; the typed address shows the access-denied page <sup>a</sup> <sup>l</sup> |
| **Open the review wizard** | • The assigned reviewer: while the assignment is neither declined nor cancelled, in any round; also after the review is submitted (to read it; nothing can be saved then, Rule 13), and after the submission moved on without the review (the review can still be written and submitted, Rule 17)<br>• The assigned reviewer of a declined or cancelled assignment, and everyone else: refused, with the message Rule 15 gives for each case <sup>l</sup> |
| **Accept or decline** the request (step 1) | • The assigned reviewer: while the request is unanswered (the editor's side of the answer is [→ Log Response](U27-reviewer-assignment-and-management.md#unassign)) <sup>f</sup> |
| **Download the files for review** | • The assigned reviewer: on steps 1 and 3, the files the editor ticked for them; with "Restrict File Access" on, on step 3 only, after accepting (Settings)<br>• The submission's editors: a file link from the wizard downloads for them too (Rule 15)<br>• An account with no access to the submission's files (a reviewer with no assignment on it): opening a file link is refused (Rule 15) <sup>e</sup> <sup>l</sup> |
| **Write, save and submit the review** (step 3) | • The assigned reviewer: after accepting, until the review is submitted <sup>h</sup> <sup>i</sup> |
| **Upload reviewer files** (step 3) | • The assigned reviewer: until the review is submitted; afterwards "Upload File" and each row's "Delete" are gone and only the row's "Edit" is offered <sup>h</sup> <sup>j</sup> |
| **Use the "Review Tasks & Discussions" panel** on steps 3 and 4 | • The assigned reviewer: add a discussion, reply, edit or delete their own. The mechanics are *Tasks & discussions*; this spec owns only the fact that the panel is offered here <sup>h</sup> |
| **Read an earlier round's review** ("Previous Reviews") | • The assigned reviewer: for their own assignments on rounds the submission has moved past, their current one included once a later round opened without them (Rule 14, ⚠ [A12](#a12)) <sup>k</sup> |
| **Open a one-click review link** | • The addressed reviewer, signed out or signed in as themselves. A browser signed in as somebody else gets a blank page (Rule 16, [A10](#a10)) <sup>m</sup> |

## Fields & validation

**Step 1 ("1. Request")** <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "I do not have any competing interests" / "I may have competing interests (Specify below)" | no | Radio pair, shown only on a journal with a competing-interests policy (Settings). The first is preselected. Choosing the second reveals a rich-text box for the statement. What is saved is Rule 8 |
| Competing-interests statement (the box under the radios, no label of its own) | no | Rich text. Saved only with "I may have competing interests"; otherwise discarded |
| "Yes, I agree to have my data collected and stored according to the privacy statement." | yes, until accepted | Checkbox, shown while the request is unanswered on a journal with a privacy statement (Settings); its words "privacy statement" link to the journal's privacy page. "Accept Review, Continue to Step #2" with the box unticked is refused with "This field is required." under the box, and the step stays. The box is gone once the request is accepted |

**Decline Review Request window** <sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The message (one rich-text box under "You may provide the editor with any reasons why you are declining this review in the field below.") | no | Prefilled with the journal's "Unable to Review" email: "Editors:" {OJS} / "Editor(s):" {OMP}, then "I am afraid that at this time I am unable to review the submission, "{title}," for {journal}. Thank you for thinking of me, and another time feel free to call on me." and the reviewer's name. The reviewer may edit or empty it; it becomes the body of the decline email (Side effects) |

**Step 3 ("3. Download & Review")** <sup>h</sup> <sup>i</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "For author and editor" | no | Rich text under "Review", shown when the assignment carries no review form. Nothing requires it: "Submit Review" with both boxes empty and no file under "Reviewer Files" ({OJS}: with a recommendation chosen) submits the review ⚠ [A7](#a7) |
| "For editor" {OJS} / "For editor only" {OMP} | no | Rich text, same condition. Never required |
| The review form's questions | per question, marked "*" | Shown instead of the two text boxes when the assignment carries a review form: the form's title and description, then each question as the form defines it (a text box, a checkbox group, a radio group or a drop-down). A required question left unanswered stops "Submit Review" only after its confirmation: the step stays, nothing is submitted, and the box "Please fill in required fields." / "Some required fields are not filled in. Please complete them before submitting your review." appears under the buttons ({OMP}: the first sentence prints as a raw key ⚠ [OMP3](#omp3)). On a form with a required "Single line text box" question (an item type), "This field is required." also appears under each unanswered required question, a radio group included; on a form whose only required question is a radio group, a press marks no question and a journal shows none in view ⚠ [A16](#a16). The page stays scrolled at the buttons, so a mark on a question higher up is out of sight until the reviewer scrolls up. "Save for Later" saves whether or not a required question is answered and shows "Your changes have been saved.". With that question unanswered it also shows the box and the marks, as a refused submit does; {OJS} so does any review form saved while "Recommendation" reads "Choose One", with the mark under the list ⚠ [A14](#a14). A reload keeps what was saved and clears the box and the marks |
| "Reviewer Files" (the list under "Upload") | no | The reviewer's own attachments: "Upload File" opens the shared upload wizard (*Submission files*; here three steps, "1. Upload File", "2. Review Details" and "3. Confirm", with no file-type question), and each row offers "Edit" and "Delete". Once the review is submitted, "Upload File" and "Delete" are gone and "Edit" stays |
| "Recommendation" {OJS} | yes, on submit | Drop-down preset to "Choose One" listing the journal's active recommendations (by default "Accept Submission", "Revisions Required", "Resubmit for Review", "Resubmit Elsewhere", "Decline Submission" and "See Comments"), in no fixed order [→ recommendation order](U29-review-setup-and-review-forms.md#a7). "Submit Review" with "Choose One" is asked for confirmation first; after "OK" the step stays and "This field is required." appears under the list. It is the only check a free-form submit meets (row 1). "Save for Later" keeps whatever is chosen. A press has no such field [OMP1](#omp1) |

## Rules & state

<a id="reviewer-dashboard"></a>
1. **Where the list lives.** The backend sidebar shows a "My Assignments as
   Reviewer" group to every reviewer. Its entries are the views of Rule 2,
   each written as its count and then its name ("3 Action Required by me");
   choosing one opens the list under a heading that reads the view's name
   with the count in brackets, "Action Required by me (3)". The browser
   tab reads "Submissions". For a reviewer with no other role the sidebar
   holds nothing else but "Start A New Submission". A reviewer who holds
   no editorial role lands here after signing in on the journal's Login
   page; the precedence between this list, the editorial Dashboard and My
   Submissions is [→ landing](U22-my-submissions.md#landing). The sidebar
   group next to it for editorial roles is
   [→ the editorial dashboard](U23-submissions-dashboard.md#views-sidebar).
   <sup>a</sup>
2. **The views.** One assignment sits in exactly the views whose condition
   it meets. A cancelled assignment sits in none of them: the list never
   shows it. The six views, in the sidebar's order: <sup>b</sup>

   | View | Lists |
   |------|-------|
   | "Action Required by me" | unanswered or accepted assignments whose review is not yet submitted, while the submission is still on that review stage |
   | "All assignments" | every assignment that is neither declined nor cancelled, as long as the submission is still on the stage or, once the review is submitted, not yet published |
   | "Completed" | submitted reviews on submissions that are not yet published |
   | "Declined" | assignments the reviewer declined, until the editor re-sends the request; a re-sent one is back under "Action Required by me" with "Respond to request" |
   | "Published" | submitted reviews on published submissions |
   | "Archived" | reviews never submitted on submissions that moved on to Copyediting or Production |

   "Action Required by me" is the landing view.
3. **The table.** Four columns: "ID" (the submission's number, with a
   "Sort" control that does not reorder the rows ⚠ [A1](#a1)), "Submissions" (the title, plain text), "Editorial
   Activity" (one sentence about the assignment's state) and "Actions" (one
   button, or none). Dates in the sentences are written year-month-day
   (2026-10-02). The sentence and the button follow the assignment's
   state: <sup>c</sup>

   | State | "Editorial Activity" reads | "Actions" button |
   |-------|----------------------------|----------------|
   | request unanswered, response not yet due (also after an editor re-sent a declined request) | "Please accept or decline this request by {date}" | "Respond to request" |
   | request unanswered, response overdue | "Deadline for responding to this request has passed. Please accept or decline this request at the earliest." | "Respond to request" |
   | accepted, review not yet due | "Please complete this review by {date} 00:00:00." (the date carries a midnight clock time ⚠ [A5](#a5)) | "Finish review" |
   | accepted, review overdue | "Deadline for completing this review has passed. Please complete the review at the earliest." | "Finish review" |
   | review submitted (whether or not the editor has confirmed it) | "Review submitted on {date}" | "View" |
   | declined | "Request declined on {date}" | none |
   | not submitted, and the submission moved on to Copyediting or Production | "Incomplete" | none |

   "Respond to request", "Finish review" and "View" all open the review
   wizard (Rule 6). A submitted review's wizard opens on "4. Completion"
   (Rule 13). The list offers no bulk controls and no row menu.
4. **Search and filters.** The list carries the search box "Search
   submissions, ID, authors, keywords, etc." and a "Filters" button opening
   the "Filters" window. A typed phrase shows above the table as "Search:
   {phrase}" with a "Clear search phrase" control, but the rows stay as
   they were ⚠ [A1](#a1). Past 30 rows a pager appears, but every page
   lists every row ⚠ [A1](#a1). The window offers the groups the journal
   has: on the seeded journal "Section" ("Articles", "Reviews"), "Issues",
   "Categories" and "Days since last activity" {OJS}, "Categories" and
   "Days since last activity" {OMP}; a journal with one section, no issues
   and no categories offers "Days since last activity" alone. Every window
   has "Clear Filters" and "Apply Filters"; with nothing applied, nothing
   about filters shows above the table. <sup>a</sup>
5. **The header's "Dashboard" link.** For a reviewer without an editorial
   role, the reader-side header's "Dashboard" item lands on this list. The
   item itself belongs to *Navigation menus & site chrome*. <sup>a</sup>
<a id="wizard"></a>
6. **The review wizard.** Every action link on the list opens the wizard,
   a page headed "Review: {submission title}", at the address
   `{journal path}/reviewer/submission/{submission id}`. The address names
   the submission, not the assignment: it opens the reviewer's assignment on
   the latest round they are assigned to. Under the heading sit the
   "Previous Reviews" box (Rule 14, only when earlier rounds exist) and four
   tabs: "1. Request", "2. Guidelines", "3. Download & Review",
   "4. Completion". The wizard remembers the furthest step reached: the tabs
   beyond it are disabled, the tabs up to it can be revisited, and the page
   opens on the furthest step. A step number typed into the address beyond
   the reached step falls back to the reached step. <sup>d</sup>
<a id="step-1"></a>
7. **Step 1, the request.** The step shows, in order: the "Request for
   Review" text ("You have been selected as a potential reviewer of the
   following submission. Below is an overview of the submission, as well as
   the timeline for this review. We hope that you are able to participate.");
   "Article Title" {OJS} / "Book Title" {OMP}; "Abstract" {OJS} /
   "Description" {OMP}; "Review Type" with the assignment's type
   ("Anonymous Reviewer/Anonymous Author", "Anonymous Reviewer/Disclosed
   Author" or "Open"); the "Review Files" list of the files the editor ticked
   for this reviewer, one row per file with its name (a download link),
   date and component (the whole list absent, before and after accepting,
   when "Restrict File Access" is on: the files are then on step 3 only,
   Settings); the link "View All Submission Details", which opens a
   read-only window with the title and the abstract; the authors, and
   any supporting agencies the journal has recorded, appear in that
   window only when the review type discloses the authors (an "Open"
   review does, "Anonymous Reviewer/Anonymous Author" does not, and
   then neither row is shown); the "Review Schedule" block
   with three read-only dates, "Editor's Request", "Response Due Date" and
   "Review Due Date"; the link "About Due Dates", which opens a dialog
   reading "The editor asks that you either accept or decline the review
   before the Response Due Date and complete the review by the Review Due
   Date."; on a journal with a competing-interests policy, the "Competing
   Interests" section (Rule 8); and, while unanswered, the privacy consent
   box (Fields). While the request is unanswered the step ends with the
   link "Decline Review Request" and the button "Accept Review, Continue to
   Step #2"; once accepted, with a single "Save and continue" button.
   <sup>e</sup>
8. **Competing interests.** On a journal with a competing-interests policy
   the step shows "Competing Interests" with the guidance "This publisher
   has a policy for disclosure of potential competing interests from its
   reviewers. Please take a moment to review this policy.", a "Competing
   Interests" link opening the policy text in a dialog, and the radio pair
   of Fields. Accepting, "Save and continue" and declining all record the
   choice: the statement is kept with "I may have competing interests" and
   discarded with "I do not have any competing interests". A recorded
   statement shows to the editor as the row's "Competing Interests" badge
   ([→ the status column](U27-reviewer-assignment-and-management.md#statuses)).
   On a journal without a policy the section is absent and nothing is
   recorded. <sup>e</sup>
<a id="accept"></a>
9. **Accepting.** "Accept Review, Continue to Step #2" records the
   acceptance and moves to step 2. The editor's row turns "Request
   Accepted", the assigned editors receive the acceptance email, and the
   reviewer's list row moves to the accepted wording of Rule 3 with
   "Finish review" (Side effects). From then on step 1 shows "Save and
   continue" instead of the two response buttons. <sup>f</sup>
<a id="decline"></a>
10. **Declining.** "Decline Review Request" opens the "Decline Review
    Request" window (Fields). Its "Decline Review Request" button records
    the refusal, emails the editors the message, and sends the reviewer to
    the journal's public home page, where nothing mentions the decline,
    rather than back to their assignments ⚠ [A3](#a3). The list then shows "Request declined on {date}" with no
    action, and the assignment appears under "Declined". The wizard is
    closed to the reviewer from then on (Rule 15). An editor may ask again
    with "Resend Review Request", which reopens the request as unanswered
    ([→ resend](U27-reviewer-assignment-and-management.md#unassign)).
    <sup>f</sup>
11. **Step 2, the guidelines.** The step shows the journal's "Reviewer
    Guidelines" text ("Review Guidelines" from the review setup; on a press
    the stage's own guidelines) or, when none is configured, "This publisher
    has not set any reviewer guidelines.". "Continue to Step #3" moves on;
    "Go Back" returns to step 1. <sup>g</sup>
<a id="step-3"></a>
12. **Step 3, download and review.** The step shows, in order: the "Review
    Files" list again (always, whatever the file-access setting, because
    the reviewer has accepted by now); when guidelines are configured, a
    "Reviewer Guidelines" line with the link "Review Guidelines", which
    opens them in a dialog of that name; the review itself; the "Upload"
    section ("Upload files you would like the editor and/or author to
    consult, including revised versions of the original review file(s).")
    with the "Reviewer Files" list, "No Files" while empty; the "Review
    Tasks & Discussions" panel with its "Add" button (Actors; a second
    copy sits on step 4, Rule 13); {OJS} the
    "Recommendation" list under "Select a recommendation and submit the
    review to complete the process. You must enter a review or upload a
    file before selecting a recommendation." (a sentence nothing enforces,
    Rule 13); and, last, the link "Go Back" (to step 2) and the buttons
    "Save for Later" and "Submit Review". The review is either the two
    free-text boxes under "Review" ("Enter (or paste) your review of this
    submission into the form below."): "For author and editor" ("These
    comments will be shared with the author and editor. If this is an open
    peer review, they will also appear publicly alongside the article.")
    and "For editor" {OJS} / "For editor only" {OMP} ("These comments are
    private between you and the editor."); or, when the assignment carries
    a review form, the form's title, description and questions in the two
    boxes' place. Which one applies is the editor's choice per assignment
    ([→ review type, visibility, form](U27-reviewer-assignment-and-management.md#read-review));
    the forms themselves are built in *Review setup & review forms*.
    <sup>h</sup>
<a id="save-submit"></a>
13. **Saving and submitting.** "Save for Later" keeps everything typed,
    answered and chosen, shows "Your changes have been saved." and stays on
    step 3; nothing reaches the editor. On a review form the same press can
    also show the refusal's messages; Fields step 3 says when
    ([A14](#a14)). Leaving the step without saving is Rule 18. Text that
    is saved and later emptied
    is not emptied by a further save: the field shows blank, but the earlier
    text is what stays on record and what the editor reads ⚠ [A4](#a4).
    "Submit Review" asks "Are you sure you
    want to submit this review?" at once, whatever the step holds;
    "Cancel" leaves step 3 as it was. Only after "OK" are the checks of
    Fields run: a review form's unanswered required question, and {OJS} a
    "Recommendation" left at "Choose One", keep the step with their
    messages; nothing else stops the submit, so a review with nothing typed
    and no file goes through ⚠ [A7](#a7). A submit that passes moves to
    step 4. Step 4 ("4. Completion") reads "Review Submitted" and "Thank
    you for completing the review of this submission. Your review has been
    submitted successfully. We appreciate your contribution to the quality
    of the work that we publish; the editor may contact you again for more
    information if needed.", with the "Review Tasks & Discussions" panel
    under them (a second copy of step 3's panel, with its own "Add"). From
    then on nothing can be
    saved or submitted: all four tabs open; step 1's "Save and continue",
    step 2's "Continue to Step #3", "Save for Later" and "Submit Review"
    are disabled; the review boxes ({OJS}: and the "Recommendation" list)
    still take typing, which goes nowhere; and "Reviewer Files" offers no
    "Upload File" and no "Delete", only each row's "Edit". The list's
    "View" opens this wizard on "4. Completion". <sup>i</sup> <sup>j</sup>
<a id="round-history"></a>
14. **Previous Reviews.** The wizard opens with a "Previous Reviews" box
    above the tabs whenever the reviewer's round is no longer the
    submission's latest round: one line per such round, their current one
    included when a later round opened without them (on a press, as soon
    as the monograph has an External Review round, the Internal Reviewer's
    own review is listed this way) ⚠ [A12](#a12). Each line reads "Round
    {N} Review Submitted on {date}" with a "Read Round {N} Review" button.
    For a round the reviewer declined, the date is the decline date; for a
    round they accepted but never finished, and for their current round
    before they submit, the line ends after "Submitted on" with no date at
    all ⚠ [A2](#a2). The button opens a side window titled "Round {N}
    Review submitted by you for" with the submission title under it. Its
    left column shows, for a submitted review: {OJS} "Recommendation";
    "Reviewer Comments" split into "For editors and authors" and "For
    editors only", each entry numbered ("Comment 1: "); and "Attachments"
    ("These are files that you attached along with your review"), a
    download list shown only when the reviewer attached files; the files
    the editor sent for review are not listed ⚠ [A13](#a13). For a
    declined round it shows "Declined Date" and "Decline reason sent by
    email" with the email's subject "Unable to Review" on one line and the
    message sent under it; a decline sent with an empty message shows the
    "Decline Review Request" window's prefilled text there instead
    (Fields). For an unfinished round it shows only "The review was not
    completed.". The right column shows "Article Metadata" (the same
    heading on a press) with "Type" (the section) and "Abstract", each
    only when set, and "General Information" ("Editor's Request", "Response Due Date", and for a
    non-declined round "Review Accepted On", "Review Due Date", "Review
    Submitted On", each only when it has a date). <sup>k</sup>
<a id="access"></a>
15. **Who is refused.** The wizard address opens only for the assigned
    reviewer of a live assignment. Anyone else who types it gets a page in
    the journal's public layout with one of two messages: an editor, the
    author, or any account without a reviewer role reads "The current role
    does not have access to this operation." (the access-denied page); a
    reviewer with no assignment on that submission, or whose assignment
    was declined or cancelled, reads "The current user is not assigned as
    a reviewer for the requested document.". A signed-out visitor gets the
    journal's Login page, and signing in there as the assigned reviewer
    continues to the wizard. A file link from the wizard downloads for the
    reviewer it was ticked for and for the submission's editors (an
    assigned Section Editor, a Journal Manager); an account with no access
    to the submission's files, such as a reviewer with no assignment on
    it, gets a bare line of text, "The current role does not have access
    to this operation.", and no file, instead of the access-denied page
    ⚠ [A6](#a6). With "Restrict File Access" on, step 1 lists no files at
    all; the reviewer reaches them on step 3 after accepting (Settings).
    "My Assignments as Reviewer" typed by an account without a
    reviewer role shows the access-denied page. <sup>l</sup>
<a id="one-click"></a>
16. **One-click access.** With "One-click Reviewer Access" on (Settings),
    the request email and the reminders the editor sends carry a personal
    link that needs no sign-in: opening it in a signed-out browser signs
    the reviewer in and lands on the wizard. Opening the link does not use it up: a second
    open lands on the wizard again. A link stops working once the review
    is submitted or the request declined; such a link shows the
    "Invitation Unavailable" page
    ([→ the invitation-link landing](U06-user-invitations.md#invitation-landing)).
    Each reminder mints a link of its own, and the earlier link dies the
    moment the reminder is sent: it shows a bare "404 Not Found" page, not
    "Invitation Unavailable" ⚠ [A9](#a9); a request on another submission
    of the same journal does the same to the reviewer's earlier request
    link. A browser already signed in as somebody else gets a blank page
    with no message at all ⚠ [A10](#a10). With the setting off, the
    emails carry the plain wizard address, which asks for sign-in on the
    journal's Login page and then opens the wizard. <sup>m</sup>
17. **After the submission moves on.** When the editor decides the round
    without this review and the submission reaches Copyediting or
    Production, an unfinished assignment reads "Incomplete" with no action
    under "Archived" (Rule 3). The wizard address still opens the wizard at
    the step reached, and it still works: nothing on it says the round is
    over, and the review can be written and submitted as if the round were
    open ⚠ [A11](#a11); once submitted, the row leaves "Archived" for
    "Completed". A finished review on a submission that moves on keeps
    its "View" button, under "Completed" and later "Published". <sup>b</sup>
    <sup>c</sup>
18. **Leaving step 3 unsaved.** A changed review-form answer is guarded.
    Pressing another tab asks "The data on this form has changed. Do you
    wish to continue without saving?": "Cancel" keeps step 3 with the
    change; "OK" opens the tab, and back on step 3 the answer shows its
    last saved value. Leaving the page through the address bar asks the
    browser's own leave-page question, and leaving drops the change too.
    Text typed into "For author and editor" or "For editor" {OJS} / "For
    editor only" {OMP} is not guarded: either way out asks nothing, and
    back on step 3 the typed text is gone ⚠ [A15](#a15). <sup>i</sup>

## Side effects

- **Accepting** → the assigned editors of the stage (Journal Manager or
  Section Editor assigned to the submission; the journal's principal contact
  when nobody is assigned) receive the email "Review accepted: {reviewer}
  accepted review assignment for #{id} {authors} — "{title}"", sent under
  the reviewer's name with their address as reply-to. The submission's
  activity log records the acceptance, the editor's row turns "Request
  Accepted" and its History gains the "Request Accepted" date
  ([→ history](U27-reviewer-assignment-and-management.md#history)). What
  the acceptance does to an earlier reminder on the editor's row is
  [→ reminders](U27-reviewer-assignment-and-management.md#reminders).
  <sup>n</sup>
- **Declining** → the same editors receive the email "Unable to Review",
  its body the window's message, sent the same way. The activity log
  records the decline, the editor's row turns "Request Declined", and a
  one-click link for the assignment stops working. <sup>n</sup>
- **Submitting** → every Journal Manager and Section Editor assigned to the
  stage receives the email "Review complete: {reviewer} recommends
  {recommendation} for #{id} {authors} — "{title}"", sent from the
  journal's principal contact, its body naming the recommendation and the
  review type with a link to the submission, unless they opted out of it in
  their notification preferences (*Notifications center & email
  preferences*). On a press the subject reads "recommends None" and the
  body "Recommendation: None" ⚠ [OMP2](#omp2). The editors' header "Tasks"
  panel gains no entry; any other notice of the review on their screens is
  *Notifications center & email preferences*'s. The reviewer's own "Review
  pending." task is cleared, the activity log records "The round {N} review
  assigned to {reviewer} for submission {id} has been completed.", the
  editor's row turns "Review Submitted" ({OJS}: with the recommendation
  under it), the round status box moves on
  ([→ round status](U26-review-stage-and-rounds.md#round-status)), and a
  one-click link for the assignment stops working. <sup>n</sup>
- **Saving for later** → nothing leaves the reviewer's screen beyond the
  saved values; no email, no task, no log entry. <sup>i</sup>
- **Uploading a reviewer file** → the file joins "Reviewer Files" on step 3
  and, once the review is submitted, the editor's "Reviewer Files" in the
  Review Details window
  ([→ Review Details](U27-reviewer-assignment-and-management.md#read-review)).
  <sup>h</sup>

## Settings that modify behavior

All of these are configured on other features' screens; they are listed for
their effect on the reviewer's screens. Unless said otherwise the screen is
Settings › Workflow › Review (its sub-tab "Setup" for the first two, "Reviewer
Guidance" for the guidelines and the policy), owned by *Review setup & review
forms*. <sup>o</sup>

- **"Restrict File Access"** (the box reads "Reviewers will not be given
  access to the submission file until they have agreed to review it." {OJS}
  / "Reviewers will have access to the submission file only after agreeing
  to review it." {OMP}): on, step 1 shows no "Review Files" list and the
  files appear on step 3 once the reviewer accepts; off (the install
  default), the files are on step 1 already.
- **"One-click Reviewer Access"** ("Include a secure link in the email
  invitation to reviewers."): on, Rule 16; off (the default), the emails
  carry the plain wizard address.
- **"Review Guidelines"** (on a press "Internal Review Guidelines" and
  "External Review Guidelines"): the text of step 2 and of step 3's
  "Review Guidelines" dialog (Rules 11–12). Empty by default, when step 2
  reads "This publisher has not set any reviewer guidelines.".
- **"Competing Interests"** (the policy text): set, step 1 asks the
  competing-interests question (Rule 8); empty (the default), it does not.
- **Privacy Statement** (Settings › Website › Setup › Privacy Statement,
  *Journal identity & about pages*): present (the default on the seeded
  journal and on scratch journals), step 1 asks for consent before
  acceptance (Fields); empty, no box is shown.
- **Review forms** and the per-assignment **"Review Form"** choice: a form
  replaces the two free-text boxes on step 3 (Rule 12).
- **The assignment's "Review Type"**: shown on step 1, and it decides
  whether "View All Submission Details" names the authors (Rule 7). The
  default type comes from "Default Review Mode".
- **The assignment's due dates** ("Response Due Date", "Review Due Date",
  set by the editor from the journal's weeks-to-respond and weeks-to-review
  defaults): shown on step 1 and in the history window, and they decide the
  overdue wording of Rule 3; the defaults are *Review setup & review
  forms*'.
- **{OJS} Reviewer recommendations** (the journal's configurable set):
  the options of step 3's "Recommendation" list; a journal's own entries
  lengthen it, and an added entry takes no fixed place in it.
- **Automatic reminders**: sent to the reviewer by *reviewer assignment &
  management*, clocked in *Review setup & review forms*; on this side they
  are only more emails.

## Cross-feature interactions

- **Reviewer assignment & management**: the editor's Reviewers panel, where
  every state this spec produces is read (the row statuses, History, Read
  Review, Log Response, Resend Review Request, Cancel Reviewer).
- **Review stage & rounds**: the round the assignment belongs to and its
  status box; what the author sees of a completed review is described
  there.
- **Review setup & review forms**: every setting above, and the review forms
  rendered on step 3.
- **User invitations**: the invitation record behind a one-click link and
  the "Invitation Unavailable" landing.
- **Submissions dashboard** and **My Submissions**: the neighbouring sidebar
  groups and the landing precedence.
- **Submission files**: the upload wizard behind "Upload File" on step 3.
- **Tasks & discussions**: the discussions panel on step 3, and the
  reviewer's "Review pending." task.
- **Notifications center & email preferences**: any notice the editors get
  of a submitted review, and the review-complete email's opt-out.
- **Submission activity log & notes**: the log rows written on accept,
  decline and submit.
- **ORCID integration**: the deposit of a completed review is triggered
  from the editor's side, never from the wizard.

## Canonical scenarios

Scenarios 1 to 7, 11, 12, 14, 16 and 18 run on the seeded journal with
ready accounts and scratch submissions; scenarios 8, 9, 10, 13 and 15 run
on a scratch journal configured for them, with throwaway accounts; scenario
17 runs on the seeded preprint server and, for its variant, on a scratch
one. Each email is read in the mailbox of the address it was sent to.
Accounts, passwords and the tooling recipe are in the footnote. <sup>s</sup>

1. **The request appears in the reviewer's list**

   Given: Reviewer, with a fresh review request on a submission in review.

   - **Landing**: sign in on the journal's Login page: the landing page is
     the view "Action Required by me" under "My Assignments as Reviewer",
     headed "Action Required by me ({count})", and the browser tab reads
     "Submissions".
   - **The sidebar**: the "My Assignments as Reviewer" group lists its six
     views each as its count then its name ("1 Action Required by me"), the
     count including the request, and holds nothing else but "Start A New
     Submission".
   - **The row**: shows the submission's ID and title, "Please accept or
     decline this request by {date}" (the date written year-month-day) and
     the button "Respond to request"; the row has no menu and the table no
     bulk controls.
   - **The views**: the same row is under "All assignments"; "Completed",
     "Declined", "Published" and "Archived" do not list it.
   - **"Filters"**: press it: the window offers "Section" ("Articles",
     "Reviews"), "Issues", "Categories" and "Days since last activity"
     {OJS} / "Categories" and "Days since last activity" {OMP}, with "Clear
     Filters" and "Apply Filters"; with nothing applied, nothing about
     filters shows above the table.
   - **Control**: the same account's sidebar holds no "Editor Dashboard"
     group.

2. **Accept a review request**

   Given: Reviewer, on their list with an unanswered request whose
   submission has an assigned Section Editor.

   - **"Respond to request"**: press it: the page "Review: {title}" opens
     on "1. Request" with tabs 2 to 4 disabled. Type the wizard address
     with `?step=3` appended: step 1 shows again.
   - **Step 1**: "Review Type" reads "Anonymous Reviewer/Anonymous Author";
     "Review Schedule" shows "Editor's Request", "Response Due Date" and
     "Review Due Date". Press "View All Submission Details": the window
     shows the title and the abstract and no authors; close it. Press
     "About Due Dates": the dialog reads "The editor asks that you either
     accept or decline the review before the Response Due Date and complete
     the review by the Review Due Date."; close it.
   - **The privacy box**: its words "privacy statement" link to the
     journal's privacy page. Press "Accept Review, Continue to Step #2"
     without ticking it: "This field is required." appears under the box
     and the step stays.
   - **The acceptance**: tick the box and press again: "2. Guidelines"
     opens, reading "This publisher has not set any reviewer guidelines.".
     Reload the page: it opens on step 2, and step 1 now offers "Save and
     continue" alone.
   - **The list**: the row reads "Please complete this review by {date}
     00:00:00." (the clock time ⚠ [A5](#a5)) with "Finish review".
   - **The editor's side**: the Section Editor's mailbox holds "Review
     accepted: …", sent under the reviewer's name with the reviewer's
     address as reply-to. Section Editor: the Reviewers panel row reads
     "Request Accepted", its History holds "Request Accepted: {date and
     time}", and the submission's activity log records the acceptance.
   - **Control**: with step 2 reached, the wizard address with `?step=2`
     appended opens step 2, and with `?step=3` falls back to it.

3. **Decline a review request**

   Given: Reviewer, with an unanswered request on a round where the editor
   ticked one file for them, and a second Reviewer of the journal with no
   assignment on the submission.

   - **A reviewer with no assignment**: the second Reviewer types the
     wizard address: the page reads "The current user is not assigned as a
     reviewer for the requested document.". Opening the address of the
     file's download link, copied from the first Reviewer's step 1, shows a
     page holding one bare line of text, "The current role does not have
     access to this operation.", and no file ⚠ [A6](#a6).
   - **"Decline Review Request"**: Reviewer: on step 1 press it: the window
     opens with the prefilled message ("Editors:" {OJS} / "Editor(s):"
     {OMP}, "I am afraid that at this time I am unable to review the
     submission, …" and the reviewer's name). Add the line "No time this
     month" and press its "Decline Review Request": the browser lands on
     the journal's home page, which says nothing about the decline
     ⚠ [A3](#a3).
   - **The list**: open "My Assignments as Reviewer": the row reads
     "Request declined on {date}" with no button, under "Declined" only.
     Type the wizard address: the page reads "The current user is not
     assigned as a reviewer for the requested document.".
   - **The editor's side**: the assigned Section Editor's mailbox holds
     "Unable to Review" with the edited message as its body. Section
     Editor: the row reads "Request Declined" and the submission's activity
     log records the decline.
   - **"Resend Review Request"**: Section Editor: press it on the row and
     send ([→ resend](U27-reviewer-assignment-and-management.md#unassign)).
     Reviewer: the row has left "Declined" and reads "Please accept or
     decline this request by {date}" under "Action Required by me" with
     "Respond to request"; step 1 again offers "Decline Review Request" and
     "Accept Review, Continue to Step #2".
   - **Control**: the submission is in none of the second Reviewer's six
     views: the list holds their own assignments alone.

4. **Download the files for review**

   Given: Reviewer, with an accepted request on a round where the editor
   ticked one file for them and left a second file unticked.

   - **Step 1**: the "Review Files" list shows the ticked file, one row
     with its name as a download link, its date and its component; press
     the name: the file downloads.
   - **Step 3**: press "Save and continue", then "Continue to Step #3" on
     step 2: the same "Review Files" list heads step 3, and its name
     downloads the file there too.
   - **The editor's download**: the Section Editor assigned to the
     submission opens the same download link: the file downloads.
   - **Control**: the second file of the round, which the editor did not
     tick, is in neither list.

5. **Save a review for later**

   Given: Reviewer, on step 3 of an accepted request whose submission has
   an assigned Section Editor.

   - **The review**: type "Sound method, thin data." into "For author and
     editor" and "Check the second table." into "For editor" {OJS} / "For
     editor only" {OMP}; {OJS} choose "Revisions Required" in
     "Recommendation".
   - **"Cancel" on the confirmation**: press "Submit Review": "Are you sure
     you want to submit this review?" appears; press "Cancel": step 3 is
     as it was, both texts still in their boxes.
   - **"Save for Later"**: press it: "Your changes have been saved."
     appears and the step stays.
   - **Signed in again**: sign out and in again: the list row still reads
     "Please complete this review by {date} 00:00:00." with "Finish
     review"; the wizard opens on step 3 with both texts ({OJS}: and the
     choice) restored.
   - **Control**: the Section Editor's mailbox holds no "Review complete:
     …" and the Reviewers panel row still reads "Request Accepted".

6. **Submit a free-form review**

   Given: Reviewer, on step 3 of an accepted request whose submission has
   an assigned Section Editor.

   - **Step 3**: shows, in order, the "Review Files" list, "Review" with
     the boxes "For author and editor" and "For editor" {OJS} / "For editor
     only" {OMP}, "Upload" with "Reviewer Files" reading "No Files", the
     "Review Tasks & Discussions" panel with its "Add" button, {OJS} the
     "Recommendation" list, and last the link "Go Back" and the buttons
     "Save for Later" and "Submit Review".
   - **The submit**: type "Sound method, thin data." into "For author and
     editor" and "Check the second table." into the other box, {OJS}
     choose "Revisions Required", press "Submit Review" and "OK" on "Are
     you sure you want to submit this review?": "4. Completion" opens
     reading "Review Submitted" and "Thank you for completing the review of
     this submission. Your review has been submitted successfully. We
     appreciate your contribution to the quality of the work that we
     publish; the editor may contact you again for more information if
     needed.", with the "Review Tasks & Discussions" panel under them.
   - **The tabs**: all four are now open; on step 3 "Submit Review" and
     "Save for Later" are disabled.
   - **The list**: the row reads "Review submitted on {date}" with "View",
     under "Completed".
   - **The reviewer's task**: the header's "Tasks" panel, which held
     "Review pending." for the submission before the submit, holds it no
     longer.
   - **The editor's side**: the mailbox of each editor assigned to the
     stage holds "Review complete: …" with the recommendation in its
     subject ({OMP}: "recommends None" ⚠ [OMP2](#omp2)); the Section
     Editor's header "Tasks" panel gains no entry; the Reviewers panel row
     reads "Review Submitted", and the submission's activity log records
     "The round 1 review assigned to {reviewer} for submission {id} has
     been completed.".
   - **Control**: "View" on the list row opens the wizard on
     "4. Completion".

7. **Nothing stops an empty review**

   Given: Reviewer, with two accepted requests whose submissions have an
   assigned Section Editor, on step 3 of the first with nothing typed and
   no file.

   - **"Submit Review" on an empty step**: press it: "Are you sure you want
     to submit this review?" appears at once, with no field marked. Press
     "OK": {OJS} the step stays and "This field is required." shows under
     "Recommendation"; choose "Decline Submission", then press "Submit
     Review" and "OK" again. {OMP} nothing intervenes. Either
     way "4. Completion" opens and the Section Editor's mailbox holds
     "Review complete: …" for a review with nothing in it ⚠ [A7](#a7).
   - **"Upload File"**: on the second request's step 3 press "Upload File"
     under "Upload": the "Upload File" wizard opens with the tabs
     "1. Upload File", "2. Review Details" and "3. Confirm"; attach a file
     and finish: it lists under "Reviewer Files" with "Edit" and "Delete"
     in place of "No Files".
   - **A file alone**: with the boxes still empty ({OJS}: and "Decline
     Submission" chosen), press "Submit Review" and "OK": "4. Completion"
     opens the same way.
   - **The editor's "Reviewer Files"**: Section Editor: the second
     submission's row opens the "Review Details" window, whose "Reviewer
     Files" lists the uploaded file
     ([→ Review Details](U27-reviewer-assignment-and-management.md#read-review)).
   - **Control**: the "Upload File" wizard asks no file-type question,
     unlike the submission's own file upload.

8. **A review form instead of free text**

   Given: Reviewer, on a scratch journal with an active review form of four
   questions (a radio group marked required, then a text box, a checkbox
   group and a drop-down), on step 3 of an accepted request assigned with
   that form.

   - **Step 3**: shows the form's title, its description and its four
     questions in place of the two text boxes: the radio group marked "*",
     the text box, the checkbox group and the drop-down, each as the form
     defines it.
   - **"Submit Review" with the required question unanswered**: ({OJS}:
     with "Accept Submission" chosen) press it and "OK" on the
     confirmation: the step stays and the box "Please fill in required
     fields." / "Some required fields are not filled in. Please complete
     them before submitting your review." appears under the buttons
     ({OMP}: the first line is the raw key ⚠ [OMP3](#omp3)); nothing is
     submitted. Whether "This field is required." shows under the radio
     group is not judged here ⚠ [A16](#a16).
   - **"Save for Later"**: type "Two figures are unlabeled." into the text
     box, tick "Figures" in the checkbox group, pick "Biology" in the
     drop-down, leave the radio group unanswered and press "Save for
     Later": "Your changes have been saved." appears; after a reload the
     three answers are restored and the radio group is still unanswered.
   - **Leaving with a change**: type "Three figures are unlabeled." into
     the text box and press the "2. Guidelines" tab: the browser asks "The
     data on this form has changed. Do you wish to continue without
     saving?"; press "Cancel": step 3 stays, the text box holding "Three
     figures are unlabeled.".
   - **The submit**: choose "Yes" in the radio group ({OJS}: with "Accept
     Submission" chosen), press "Submit Review" and "OK": step 4 opens.
   - **Control**: neither "For author and editor" nor "For editor" {OJS} /
     "For editor only" {OMP} is on the step.

9. **Restricted file access**

   Given: Reviewer, on a scratch journal with "Restrict File Access" on and
   "Default Review Mode" "Open", with one section, no issues and no
   categories, holding an unanswered request with one ticked file.

   - **Step 1**: shows no "Review Files" list. "Review Type" reads "Open";
     press "View All Submission Details": the window names the authors,
     with the title and the abstract; close it.
   - **After accepting**: tick the privacy box, press "Accept Review,
     Continue to Step #2", then "Continue to Step #3": step 3 lists the
     file under "Review Files" and its name downloads it.
   - **"Filters" on a bare journal**: on "My Assignments as Reviewer" press
     "Filters": the window offers "Days since last activity" alone, with
     "Clear Filters" and "Apply Filters".
   - **Control**: on the seeded journal (the setting off) the list is on
     step 1 before acceptance (scenario 4), and the window of its
     "Anonymous Reviewer/Anonymous Author" request names no authors
     (scenario 2).

10. **One-click access**

    Given: Reviewer, on a scratch journal with "One-click Reviewer Access"
    on, holding the request email ("Invitation to review" {OJS} /
    "Manuscript Review Request" {OMP}) with its review link, for a
    submission nobody is assigned to; a Journal Manager of the journal.

    - **The link, signed out**: open it in a signed-out browser: the wizard
      opens on "1. Request" with the reviewer signed in. Open the same link
      in a second signed-out browser: the wizard again. Open it once more
      in the first browser, still signed in as the reviewer: the wizard
      again.
    - **Response overdue**: Journal Manager: in the row's "Edit" window
      move "Response Due Date" into the past
      ([→ deadlines](U27-reviewer-assignment-and-management.md#due-dates)).
      Reviewer: the list row reads "Deadline for responding to this request
      has passed. Please accept or decline this request at the earliest."
      with "Respond to request".
    - **A reminder's link**: Journal Manager: press the row's "Send
      Reminder" and send it
      ([→ reminders](U27-reviewer-assignment-and-management.md#reminders)).
      Reviewer: the reminder email carries its own link; opened in a
      signed-out browser it lands on the wizard; the request email's link,
      opened in that same browser, now shows a bare "404 Not Found" page
      ⚠ [A9](#a9).
    - **The acceptance**: tick the privacy box and press "Accept Review,
      Continue to Step #2": the journal's principal contact's mailbox holds
      "Review accepted: …", nobody being assigned to the submission.
    - **Review overdue**: Journal Manager: move "Review Due Date" into the
      past the same way. Reviewer: the row reads "Deadline for completing
      this review has passed. Please complete the review at the earliest."
      with "Finish review".
    - **The link after the submit**: press "Save and continue", "Continue
      to Step #3", type "Sound method, thin data." into "For author and
      editor" ({OJS}: and choose "Accept Submission"), press "Submit
      Review" and "OK". Open the reminder's link once more: the
      "Invitation Unavailable" page.
    - **Control**: with the setting off (the seeded journal), the request
      email's link shows the journal's Login page first, and signing in
      there opens the wizard.

11. **Read an earlier round's review**

    Given: Reviewer, assigned on round 2 of two submissions whose round-1
    requests they submitted and accepted but never finished, and a second
    Reviewer assigned on round 2 of a third submission whose round-1
    request they declined with the typed reason "No time this month".

    - **"Previous Reviews"**: the first submission's wizard opens with
      "Previous Reviews" above the tabs, reading "Round 1 Review Submitted
      on {date}" with "Read Round 1 Review".
    - **"Read Round 1 Review"**: press it: the window "Round 1 Review
      submitted by you for" shows the title under it. Its left column
      shows {OJS} "Recommendation" with the choice, then "Reviewer
      Comments" with the round-1 text under "For editors and authors" as
      "Comment 1: ". Its right column shows "Article Metadata" with
      "Abstract" and, {OJS}, "Type" reading the section's name ({OMP}: no
      "Type", the monograph being in no series), and "General Information"
      with "Editor's Request", "Response Due Date", "Review Accepted On",
      "Review Due Date" and "Review Submitted On".
    - **An unfinished round**: on the second submission the line reads
      "Round 1 Review Submitted on " with no date ⚠ [A2](#a2), and its
      window reads "The review was not completed." alone, with "General
      Information" lacking "Review Submitted On".
    - **A declined round**: on the third submission the second Reviewer's
      line reads "Round 1 Review Submitted on {date}", the decline's date;
      its window shows "Declined Date" and "Decline reason sent by email"
      with "Unable to Review" on one line and "No time this month" under
      it, and "General Information" with "Editor's Request" and "Response
      Due Date" only.
    - **Control**: no line names round 2, the round each wizard is open on.

12. **Nothing can be saved after submission**

    Given: Reviewer, with a submitted review that carries one reviewer
    file, and a second, still-open assignment.

    - **"View"**: press it on the list row: the wizard opens on
      "4. Completion", and every tab opens.
    - **Steps 1 and 2**: step 1's "Save and continue" and step 2's
      "Continue to Step #3" are disabled.
    - **Step 3**: "Submit Review" and "Save for Later" are disabled. Type
      "Late addition" into "For author and editor": the box takes it,
      though nothing on the step can keep it; after a reload the submitted
      text is back without it. "Reviewer Files" offers no "Upload File",
      and the file's row offers "Edit" but no "Delete".
    - **Control**: the same Reviewer's other, still-open assignment offers
      all of them.

13. **Declare competing interests**

    Given: Reviewer, on a scratch journal with a competing-interests policy
    and a "Review Guidelines" text, holding an unanswered request; a
    Journal Manager of the journal.

    - **"Competing Interests" on step 1**: the section shows with its
      guidance, a "Competing Interests" link (press it: the policy text
      opens in a dialog; close it) and the radio pair, "I do not have any
      competing interests" preselected. Choose "I may have competing
      interests (Specify below)": a rich-text box appears; type "I
      co-authored with the author in 2020." into it.
    - **The acceptance**: tick the privacy box and press "Accept Review,
      Continue to Step #2". Journal Manager: the Reviewers panel row
      carries a "Competing Interests" badge.
    - **The guidelines**: Reviewer: "2. Guidelines" shows the journal's
      "Review Guidelines" text; press "Continue to Step #3": step 3 shows
      "Reviewer Guidelines" with the link "Review Guidelines", which opens
      the same text in a dialog headed "Review Guidelines".
    - **The statement discarded**: open "1. Request", choose "I do not have
      any competing interests" and press "Save and continue". Journal
      Manager: the row carries no "Competing Interests" badge any more.
    - **Control**: on the seeded journal, which has no policy and no
      guidelines, step 1 has no "Competing Interests" section and step 3
      no "Review Guidelines" link (scenario 6).

14. **Left behind when the submission moves on**

    Given: Reviewer, with an accepted request whose wizard was never opened
    past step 1 on a submission the editor has since sent to Copyediting,
    a submitted review on a second submission in Copyediting, and a
    submitted review on a third, published submission.

    - **"Archived"**: the first submission's row reads "Incomplete" with no
      button, under "Archived" only.
    - **The wizard address**: type it: the wizard opens on "1. Request"
      with "Save and continue" enabled and nothing saying the round is over
      ⚠ [A11](#a11). Press "Save and continue", then "Continue to Step #3",
      type "Late review." into "For author and editor" ({OJS}: and choose
      "Accept Submission"), press "Submit Review" and "OK": "4. Completion"
      opens.
    - **"Completed"**: the row now sits under "Completed" as "Review
      submitted on {date}" with "View", no longer under "Archived".
    - **"Published"**: the third submission's row reads "Review submitted
      on {date}" with "View", under "Published" and under neither
      "Completed" nor "All assignments".
    - **Control**: the second submission's row reads "Review submitted on
      {date}" with "View", under "Completed".

App-specific:

15. **Two stages, no recommendation** {OMP}

    Given: Internal Reviewer, with a request on a monograph in Internal
    Review on a scratch press with both guideline texts set and an editor
    assigned to the stage; an External Reviewer with a request on a second
    monograph of the press, in External Review.

    - **Step 2**: shows the press's "Internal Review Guidelines" text.
    - **Step 3**: has no "Recommendation" list [OMP1](#omp1); its "Review
      Guidelines" link opens the "Internal Review Guidelines" text in a
      dialog.
    - **The submit**: type "Internal remarks." into "For author and
      editor", press "Submit Review" and "OK": the assigned editor's
      mailbox holds "Review complete: …" with the subject reading
      "recommends None" ⚠ [OMP2](#omp2).
    - **External Review**: External Reviewer: step 2 shows the "External
      Review Guidelines" text.
    - **Control**: on a journal, step 3 carries the "Recommendation" list
      and the email's subject names the choice (scenario 6).

16. **The recommendation reaches the editor** {OJS}

    Given: Reviewer, on step 3 of an accepted request whose submission has
    an assigned Section Editor.

    - **"Recommendation"**: the list is preset to "Choose One" and, after
      it, offers "Accept Submission", "Revisions Required", "Resubmit for
      Review", "Resubmit Elsewhere", "Decline Submission" and "See
      Comments", in no fixed order. Choose "Revisions Required", type "Please add a control
      group." into "For author and editor", press "Submit Review" and "OK".
    - **The editor's row**: Section Editor: the Reviewers panel row shows
      "Review Submitted" with "Revisions Required" under it.
    - **A later round**: Section Editor: open round 2 and ask the Reviewer
      again (the editor's side is *Reviewer assignment & management*).
      Reviewer: the "Read Round 1 Review" window shows "Revisions Required"
      under "Recommendation" (scenario 11).
    - **Control**: the Section Editor's "Review complete: …" email names
      "Revisions Required" in its subject.

17. **No reviewer surfaces on a preprint server** {OPS}

    Given: Preprint Server Manager (a Moderator and an Author see the
    same), on the seeded server holding one preprint.

    - **The sidebar**: has no "My Assignments as Reviewer" group.
    - **The typed addresses**: type the list's address
      (`{server path}/dashboard/reviewAssignments`): the access-denied
      page. Type the wizard's address
      (`{server path}/reviewer/submission/{preprint id}`): a bare
      "404 Not Found" page with no server header around it.
    - **Roles**: Settings › Users & Roles › Roles lists no reviewer group
      among the installed roles (a journal lists "Reviewer", a press
      "Internal Reviewer" and "External Reviewer"); its "Create New Role"
      window still offers the "Reviewer" permission level, and choosing it
      hides the "Stage Assignment" list with its "Production" box, while
      the role still saves.
    - **A home-made reviewer role**: a user holding such a role, alone or
      beside Author, signs in on the server's login page and lands on the
      list's page: the sidebar shows a "My Assignments as Reviewer" heading
      with no entries under it, the page is headed "undefined (0)", its
      table reads "No Items" over "Showing 0 to 0 of 0", and an "Error"
      window reads "The current role does not have access to this
      operation." with "OK". The wizard's address still shows the bare
      "404 Not Found" page ⚠ [OPS1](#ops1).
    - **Control**: the "Editor Dashboard" group and its list open
      normally. <sup>p</sup>

18. **Who is refused**

    Given: Reviewer, with an accepted request on each of two submissions in
    review; the first submission's Author, and the Section Editor assigned
    to it.

    - **The Author**: Author: the sidebar has no "My Assignments as
      Reviewer" group; the list's typed address shows the access-denied
      page; the first submission's wizard address reads "The current role
      does not have access to this operation.".
    - **The Section Editor**: Section Editor: the same wizard address reads
      "The current role does not have access to this operation.".
    - **The editor cancels**: Section Editor: on the first submission's
      accepted row choose "Cancel Reviewer" and confirm
      ([→ cancel](U27-reviewer-assignment-and-management.md#unassign)).
    - **The cancelled reviewer**: Reviewer: the first submission sits in
      none of the six views of "My Assignments as Reviewer"; its wizard
      address reads "The current user is not assigned as a reviewer for
      the requested document.".
    - **Control**: the second submission's row still reads "Please complete
      this review by {date} 00:00:00." with "Finish review", and its wizard
      address opens the wizard.

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the "Supporting Agencies" row in the "View All Submission Details" window: shown on a review type that discloses the authors, absent on an anonymous one (Rule 7): likely a bullet in scenario 9, which opens the window on an "Open" review
  - {OPS} "Reviewer" chosen in "Create New Role" hiding the whole "Stage Assignment" list, not only greying out its "Production" box (scenario 17, "Roles")
  - a reviewer asked again after a round they left unfinished reading "The review was not completed." on that round's "Previous Reviews" row, and no row ending in "Submitted on" without a date ([A2](#a2); Rule 14): the guard the issue report proposes, once fixed
  - a round-1 reviewer whose submission gets round 2 without them, and a press's Internal Reviewer after "Send to External Review" {OMP}, finding no "Previous Reviews" box on their review, while a reviewer asked again on round 2 finds the round-1 line ([A12](#a12); Actors row 8, Rule 14): the guard the issue report proposes, once fixed
  - a reviewer who saves a text, empties the box, saves again and reopens the review finding the box empty, and the editor reading no text ([A4](#a4); Rule 13): the guard the issue report proposes, once fixed
  - a reviewer's search for a word of one title listing that row alone under "All assignments (1)", and a search for no title's word reading "No Items" ([A1](#a1); Rules 3–4): the guard the issue report proposes, once fixed
  - the accepted row of the reviewer's list reading "Please complete this review by" with the due date in the journal's short date format and no clock time ([A5](#a5); Rule 3): the guard the issue report proposes, once fixed
- **Rarely met**:
  - the "Read Round {N} Review" window of a round declined with an empty message, showing the "Decline Review Request" window's prefilled text in place of a typed reason (Rule 14)
- **Nothing new to test**:
  - the competing-interests choice recorded by declining, and its badge on the declined row (Rule 8)
  - "OK" on the review form's leave question, which opens the tab and drops the change (Rule 18)
  - a changed review-form answer left through the address bar, which asks the browser's own leave-page question (Rule 18)
  - a one-click link after a decline, dead the same way as after a submit (Rule 16, Side effects)
  - an empty Privacy Statement: step 1 without the consent box, one tick fewer (Fields, Settings)
- **Register carries it**:
  - A1 (the search box, "Sort" and the pager leaving the rows as they were; Rules 3–4)
  - A2 (the dateless "Round {N} Review Submitted on" line of an unfinished round; Rule 14)
  - A3 (the decline landing on the journal's public home page; Rule 10)
  - A4 (a saved text emptied and saved again keeping its old content on record; Rule 13)
  - A5 (the accepted row's due date printed with a midnight clock time; Rule 3)
  - A6 (the file refusal as a bare line of text, not the access-denied page; Rule 15)
  - A7 (a review with nothing typed and no file going through; Fields, Rule 13)
  - A9 (a reminder or another submission's request killing the earlier one-click link with a bare "404 Not Found"; Rule 16)
  - A10 (a one-click link opened while signed in as somebody else showing a blank page; Actors row 9, Rule 16)
  - A11 (the left-behind assignment's wizard still taking and submitting a review; Rule 17)
  - A12 (the reviewer's own round listed under "Previous Reviews" once a later round opened without them; Actors row 8, Rule 14)
  - A13 (the files sent for review never listed in the "Read Round {N} Review" window; Rule 14)
  - A14 ("Save for Later" on a review form showing the refusal's messages beside "Your changes have been saved."; Fields step 3)
  - A15 (unsaved free-form review text dropped without a warning on leaving step 3; Rule 18)
  - A16 (a refused review-form submit marking the unanswered questions on one form and none on another; Fields step 3)
  - OMP2 (the press's review-complete email saying "recommends None"; Side effects)
  - OMP3 (the press's review-form refusal opening with a raw key; Fields)
  - OPS1 (a home-made reviewer role landing on a page headed "undefined (0)" that lists nothing under an "Error" window; Purpose, scenario 17)
- **No seed**:
  - "Attachments" in the "Read Round {N} Review" window, for an earlier round whose review carried a reviewer file (Rule 14)
  - {OJS} a journal's own reviewer recommendations lengthening step 3's "Recommendation" list (Fields, Settings)
- **Owned by another feature**:
  - what else Settings › Users & Roles › Roles and its "Create New Role" window list as stages beside "Production" (scenario 17; *Roles configuration*)
  - the "Review Tasks & Discussions" panel's mechanics on steps 3 and 4 (Actors row 7, Rules 12–13; *Tasks & discussions*)
  - the landing precedence between this list, the editorial Dashboard and My Submissions (Rule 1; *My Submissions*)
  - the reader-side header's "Dashboard" item landing on the list (Rule 5; *Navigation menus & site chrome*)
  - the review-complete email's opt-out and the editors' other notices of a submitted review (Side effects; *Notifications center & email preferences*)
  - the round status box moving on after a submit (Side effects; *Review stage & rounds*)
  - the automatic reminders, only more emails on this side (Settings; *Reviewer assignment & management*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-04), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The summary
is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact
and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | Reviewer's "My Assignments as Reviewer" list: search, "Sort", "Filters" and the pager leave the rows unchanged | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A2](#a2) | "Previous Reviews" says "Round 1 Review Submitted on" with no date for a round the reviewer never finished | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A4](#a4) | Reviewer empties a saved review text and saves again: the old text stays saved and is what the editor reads | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [A5](#a5) | A reviewer's list shows an accepted review's due date with a midnight clock time, "2026-10-30 00:00:00" | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A6](#a6) | A file link opened by an account without file access answers a bare line of text, not the access-denied page | 🐞 | minor | — |
| [A7](#a7) | A review with nothing typed and no file attached can be submitted | 🐞 | user-visible | — |
| [A9](#a9) | A reminder, or a request on another submission, kills the reviewer's earlier one-click link, which then shows a bare "404 Not Found" | 🐞 | user-visible | — |
| [A10](#a10) | A one-click link opened in a browser signed in as somebody else shows a blank page, never the intended message | 🐞 | user-visible | — |
| [A12](#a12) | A reviewer's own review is listed under "Previous Reviews" once the submission has a later round | 🐞 | low | issues (claude), 2026-10-02 — re-verified |
| [A14](#a14) | "Save for Later" on a review form says "Your changes have been saved." and, on the same screen, "Please fill in required fields." | 🐞 | minor | — |
| [A15](#a15) | Unsaved free-form review text is lost without a warning when the reviewer leaves step 3, while a review form's answers are guarded | 🐞 | minor | — |
| [OMP2](#omp2) | {OMP} The review-complete email tells editors the reviewer "recommends None" | 🐞 | minor | — |
| [OMP3](#omp3) | {OMP} A review form's "required fields" refusal opens with a raw locale key | 🐞 | minor | — |
| [OPS1](#ops1) | {OPS} A home-made reviewer role opens a "My Assignments as Reviewer" page headed "undefined (0)" under an "Error" window | 🐞 | minor · crash: script | claim check (claude), 2026-09-30 — "Loading" corrected to "No Items" under an "Error" window; the landing after sign-in and the page's console "TypeError" added |
| [A3](#a3) | Declining a request sends the reviewer to the journal's public home page instead of their assignments | ❓ | minor | — |
| [A11](#a11) | An assignment left behind under "Archived" still opens a wizard that takes and submits a full review | ❓ | minor | — |
| [A13](#a13) | The "Read Round {N} Review" window never lists the files that were sent for review | ❓ | minor | — |
| [A16](#a16) | A refused review-form submit marks the unanswered questions on one form and none on another | ❓ | minor | — |
| [OMP1](#omp1) | A press's wizard collects no recommendation, and each review stage shows its own guidelines | ✅ | — | — |
| [A8](#a8) | Retired: "Save for Later" with a required question open did save and confirm after all | ✅ | retired | — |
| [OMP4](#omp4) | Retired: the press's "Previous Reviews" oddity is every app's (A12) | ✅ | retired | — |

### All apps

<a id="a1"></a>
**A1 — Reviewer's "My Assignments as Reviewer" list: search, "Sort", "Filters" and the pager leave the rows unchanged** · 🐞 · low.
On "My Assignments as Reviewer", the search box, the "Sort" control
on the "ID" column and the "Filters" window do nothing: every phrase,
every sort and every filter shows the same rows in the same order.
The page still prints "Search: {phrase}" or "Section: Reviews" above
rows that do not match. The list is never cut into pages either: a
view with more than 30 rows shows them all on every page of its pager.

Nothing is lost: all of the reviewer's assignments stay on screen and
each one opens. The editors' dashboard has the same controls, and
there they work; its search cannot simply be reused, because it
matches author names, which a reviewer under anonymous review must
not find.

The fault came with the reviewer's list of 3.5. In 3.4 the reviewer's
list searched, filtered and paged; "Sort" is new with the 3.5 list
and has never worked on it.
Basis: probe, 2026-10-02. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — "Previous Reviews" says "Round 1 Review Submitted on" with no date for a round the reviewer never finished** · 🐞 · low.
A reviewer who is asked again on a later round finds their earlier
rounds under "Previous Reviews" on the page of the new review. For a
round on which they never submitted a review, whether they accepted the
request or never answered it, the line reads "Round 1 Review Submitted
on" and then nothing. It should say that the review was not completed,
as the window behind the "Read Round 1 Review" button beside it does:
"The review was not completed.".

Nothing is lost. A round the reviewer declined does not show the
dateless line: it reads "Submitted on" with the date of the decline
(code).

The state comes about when an editor opens a new round and adds a
reviewer whose earlier request is still open; the "Add Reviewer" list
offers them like anyone else. The fix is one branch in one ui-library
template, with a string that exists.

The same dateless line shows for the reviewer's own unsubmitted round once a later round opened without them ([A12](#a12)).
Basis: probe, 2026-10-02. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Declining lands on the journal's home page** · ❓ · minor.
After "Decline Review Request" the reviewer is sent to the journal's public
home page, not to "My Assignments as Reviewer" where the declined row now
sits. Nothing on the home page confirms the decline; the reviewer has to
find their way back to the list to see "Request declined on {date}".
Question: is the home page the intended destination? Lean: an old default
nobody revisited; the assignments list, or the wizard's own confirmation
step, would tell the reviewer what happened.
Basis: probe (2026-09-04, both apps). <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Reviewer empties a saved review text and saves again: the old text stays saved and is what the editor reads** · 🐞 · medium.
A reviewer who has saved text in "For author and editor" or "For
editor" ("For editor only" on a press) with "Save for Later", then
deletes all of it and saves again, sees "Your changes have been
saved." and an empty box. The deleted text is still the saved one. It
is back in the box when the review is opened again, and when the
reviewer submits with the box showing nothing, the editor reads the
deleted text as the review.

The editor has no sign that the text was withdrawn. A withdrawn "For
author and editor" text also goes on by itself: the default emails
that ask the author for revisions or decline the submission open with
every submitted review's "For author and editor" text in them, so it
reaches the author unless the editor cuts it out. An editor-only
remark first typed into that box by mistake is the plain case.

It needs a review without a review form, which is the default. The
fix is in one place, this step's save.
Basis: probe, 2026-10-02. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — A reviewer's list shows an accepted review's due date with a midnight clock time, "2026-10-30 00:00:00"** · 🐞 · low.
Once a reviewer accepts a review request, the row of their assignments
list reads "Please complete this review by 2026-10-30 00:00:00.": the
due date followed by a midnight time. Before they accept, the same row
reads "Please accept or decline this request by 2026-10-30", and the
review page shows "Review Due Date" as 2026-10-30, the date alone.

The reviewer reads a deadline of midnight that nobody set, since an
editor chooses a day and no time. The day itself is not misleading: the
list calls the review overdue from the start of the 30th.

The clock time shows on every review the reviewer has accepted and not
yet submitted, while it is not overdue and the submission is still in
review. The fix is one line in one ui-library file.
Basis: probe, 2026-10-02. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — A file link opened by an account without file access answers a bare line of text** · 🐞 · minor.
A file link copied from the wizard and opened by an account with no access
to the submission's files (a reviewer without an assignment on that
submission; the submission's editors download the file) shows a page
holding nothing but one line of machine text with the message "The current
role does not have access to this operation." inside it, and no file,
instead of the access-denied page every other refused address shows. The
refusal itself holds.
Basis: probe (2026-09-04 and 2026-09-05, both apps). <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — An empty review can be submitted** · 🐞 · user-visible.
Step 3 presents the two review boxes as the point of the step and, on a
journal, says "You must enter a review or upload a file before selecting
a recommendation.", yet "Submit Review" with nothing typed and no file
under "Reviewer Files" goes through: on a press at once, on a journal as
soon as a "Recommendation" is chosen. The editors receive "Review complete:
…" and the row turns "Review Submitted" for a review that holds nothing.
Basis: probe (2026-09-04, both apps). <sup>[f-a7](#fn-a7)</sup>

<a id="a9"></a>
**A9 — A later one-click email kills the earlier link** · 🐞 · user-visible.
A reviewer holds a request email with its one-click link. When the journal
sends them a second one-click email, a reminder for the same review or a
request on another submission, the first email's link stops working:
opening it shows a bare "404 Not Found" page, not the wizard and not
"Invitation Unavailable". A reviewer who goes back to the original request
email is locked out without a word of explanation; only the newest email's
link works.
Basis: probe (2026-09-04, both apps); the reason is a code reading.
<sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — A one-click link opened as somebody else shows a blank page** · 🐞 · user-visible.
When a browser signed in as another user (an author was tried) opens a
reviewer's one-click link, the screen is entirely blank: no page, no
message, no way on. The sentence written for this case, "You are logged in
as a different user. Please log out and try the invitation link again.",
never shows.
Basis: probe (2026-09-04, both apps). <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — An archived assignment still opens a wizard that takes a full review** · ❓ · minor.
When the submission has moved on to Copyediting or Production without the
review, the list marks the assignment "Incomplete" with no button, yet the
wizard address opens the wizard exactly as it was: nothing says the round
is over, and the review can be written and submitted in full. The row
then reads "Review submitted on {date}" under "Completed", and the editor,
who has moved on to Copyediting, gets a review nobody asked for.
Question: should the wizard close (as it does for a cancelled assignment)
or open read-only once the submission has moved on? Lean: read-only with a
line saying the review is no longer needed.
Basis: probe (2026-09-04, step 1 to step 2; 2026-09-05, through "Submit
Review"; both apps). <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — A reviewer's own review is listed under "Previous Reviews" once the submission has a later round** · 🐞 · low.
A reviewer's review page shows a "Previous Reviews" box for the reviews
they gave on earlier rounds of the submission. A reviewer who was only
ever asked on round 1 has no earlier round, and at first sees no box.
Once the submission has a later round that the reviewer is not part of,
the box appears and lists the review the page itself is for: "Round 1
Review Submitted on {date}" with a "Read Round 1 Review" button, which
opens a window showing only the reviewer's own review.

A reviewer who has not answered yet reads "Round 1 Review Submitted on"
with no date. Under the box the page still shows the request and its
"Accept Review, Continue to Step #2" button, so it stays plain that the
review is due. Nothing is lost, and the review can be accepted, written
and submitted as before.

On a journal it needs a new review round opened without the reviewer,
which is ordinary: an editor chooses the reviewers of each round anew.
On a press every Internal Reviewer gets it as soon as the monograph is
sent to External Review. The fault is one rule in one pkp-lib method.

The line without a date for an unsubmitted round is [A2](#a2).
Basis: probe, 2026-10-02. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — The "Read Round {N} Review" window never lists the files sent for review** · ❓ · minor.
The window has a "Files For Review" block ("These files were sent to you
for review") that never appeared: with a file sent to the reviewer for
round 1 and another for round 2, the round-1 window listed only the
reviewer's own "Attachments".
Question: which reviewer is the block meant for? Lean: it does not show
for a reviewer assigned again on the next round; one whose later-round
request was declined, or who has none, may see it.
Basis: probe (2026-09-05, both apps). <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — "Save for Later" on a review form also reports missing required answers** · 🐞 · minor.
On a review form with a required "Single line text box" question left
unanswered, "Save for Later" shows "Your changes have been saved." and,
on the same screen, the box "Please fill in required fields." / "Some
required fields are not filled in. …" under the buttons (on a press its
first line a raw key, [OMP3](#omp3)) and "This field is required." under
each unanswered required question, exactly as a refused submit does.
{OJS} Any review form saved while "Recommendation" reads "Choose One"
does the same, with the mark under the list. The save did go through: a reload shows what was typed and clears the messages.
The reviewer is told in one breath that the review was saved and that
it cannot be accepted as it is.
Basis: probe (2026-09-28, both apps). <sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — An unsaved free-form review is dropped without a warning** · 🐞 · minor.
A reviewer who types into "For author and editor" or "For editor" {OJS} /
"For editor only" {OMP} and then presses another tab or leaves the page
before "Save for Later" is asked nothing, and back on step 3 the text is
gone. The same step asks "The data on this form has changed. Do you wish
to continue without saving?" before dropping a changed review-form
answer, so only the free-form review is left unprotected.
Basis: probe (2026-09-28, both apps). <sup>[f-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — A refused review-form submit marks the unanswered questions on one form and none on another** · ❓ · minor.
After "Submit Review" and "OK" with a required question unanswered, a
form whose required questions are a radio group and a "Single line text
box" shows "This field is required." under both, beside the box under
the buttons. A form whose only required question is a radio group
(scenario 8's) shows the box and marks nothing on a press; on a journal
no mark shows in view, and the page above it has not been checked. A
reviewer on the unmarked form must find the unanswered question alone.
Question: should the refusal mark every unanswered required question,
whatever the form? Lean: yes; the step's own script is written to mark
each required group, so the unmarked form looks like a defect whose
trigger (the form's make-up is the first suspect) is not yet known.
Basis: probe (2026-09-04 and 2026-09-28, both apps); test run
(2026-09-26, the press). <sup>[f-a16](#fn-a16)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — No recommendation on a press; guidelines per stage** · ✅ ·
intended divergence.
A press's step 3 has no "Recommendation" list, its "Previous Reviews"
window shows no "Recommendation" block, and nothing gates "Submit Review"
on a recommendation. The press's two review stages each show their own
guidelines text ("Internal Review Guidelines" on Internal Review,
"External Review Guidelines" on External Review) on step 2 and in step 3's
dialog. The editor-facing half of the same absence is recorded with
[→ reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review).
Basis: probe (2026-09-04, both press stages), and code for the design
intent (the press disables reviewer recommendations, and the OJS-only step-3
template carries the list). <sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — The review-complete email says "recommends None"** · 🐞 · minor.
On a press the email that tells the editors a review is in has the subject
"Review complete: {reviewer} recommends None for #{id} …" and a
"Recommendation: None" line in its body, because the subject template
prints a recommendation the press never collects. The editor reads a
recommendation of "None" where there was no question.
Basis: probe (2026-09-04, on both press stages). <sup>[f-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — The review form's refusal opens with a raw key** · 🐞 · minor.
When "Submit Review" is refused for an unanswered required question, the
box under the buttons opens with
"##reviewer.submission.reviewFormResponse.form.responseRequired##" where
a journal reads "Please fill in required fields."; the second sentence,
"Some required fields are not filled in. Please complete them before
submitting your review.", is the same on both. The reviewer reads a code
where a sentence belongs.
Basis: probe (2026-09-04). <sup>[f-omp3](#fn-omp3)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A home-made reviewer role opens a "My Assignments as Reviewer" page headed "undefined (0)" under an "Error" window** · 🐞 · minor · crash: script.
A Preprint Server Manager can create a role at the "Reviewer" permission
level and invite a user to it. Whether that user holds the role alone or
beside Author, signing in on the server's login page lands them on a
page headed "undefined (0)". Its table reads "No Items" over "Showing 0
to 0 of 0", under an "Error" window "The current role does not have
access to this operation.", and every load logs a "TypeError" in the
browser's console. "OK" leaves the empty page, and "Filters" › "Apply Filters" opens
the window again. The sidebar's "My Assignments as Reviewer" heading has
no entries and pressing it opens nothing; the wizard's address stays a
bare "404 Not Found" page. A journal or press shows the
same account an empty "Action Required by me (0)" list with no window.
An Author still reaches their own submissions under "My Submissions as
Author". Reached only through a role the install never creates.
Basis: probe (2026-09-05, 2026-09-30). <sup>[f-ops1](#fn-ops1)</sup>

### Retired

<a id="a8"></a>
**A8 — "Save for Later" says nothing while a required question is open** · ✅ · retired. Withdrawn 2026-09-05: four later saves on both apps went through with "Your changes have been saved." (Fields step 3). <sup>[f-a8](#fn-a8)</sup>

<a id="omp4"></a>
**OMP4 — A press lists the reviewer's own review as a previous one** · ✅ · retired. Folded into A12 on 2026-09-05: a journal shows the same box once a later round opens without the reviewer. <sup>[f-omp4](#fn-omp4)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The list is the shared dashboard page in its reviewer flavour:
`PKPDashboardHandler` (lib/pkp `pages/dashboard/`) op `reviewAssignments`,
constructed with `DashboardPage::MyReviewAssignments`, role assignment
`ROLE_ID_REVIEWER` only; the app dispatchers (`ojs pages/dashboard/index.php`,
`omp …`, `ops …`) all route the op to the same base with no override
(ROUTE-008; the OPS dispatcher routes it too, but no OPS account can hold
the role). The Vue page is `DashboardPage.vue` (VUE-003, owned by the
editorial dashboard); the reviewer view differs only in its columns, cells
and controls (`useDashboardConfig.js` `MY_REVIEW_ASSIGNMENTS` branch,
AFFW-029, AFFU-197..204). Sidebar group and its entries:
`PKPTemplateManager` builds `$menu['reviewAssignments']` (label key
`navigation.reviewAssignments` = "My Assignments as Reviewer", icon
`ReviewAssignments`) from `Repo::submission()->getDashboardViews(…,
[ROLE_ID_REVIEWER])` for any user holding the role; page heading key
`navigation.submissions` = "Submissions". Bulk controls:
`useDashboardBulkDelete.js` `bulkDeleteIsAvailableForUser` returns true only
for the editorial dashboard and My Submissions (AFFU-204). The filters
window is `getSubmissionFiltersForm`, the app's `SubmissionFilters` form,
the same one the editorial dashboard uses. Live-probed 2026-09-04 on OJS
and OMP (Rules 1, 4, 5; Actors row 1 control): the page heading is the view
name with its count ("Action Required by me (13)"), the window title
"Submissions | {journal}"; the sidebar entries read "{count} {name}" in the
order of Rule 2, with "Start A New Submission" the only item under the
group; signing in on the journal's login page lands on the "Action Required
by me" view, signing in on the site's login page on the journal's home
page; the reader-side header's "Dashboard" item lands on the same view;
the filters window offers on OJS "Section" ("Articles", "Reviews"),
"Issues", "Categories" (with "Select Categories"), "Days since last
activity" (a slider, 0–180), "Clear Filters" / "Apply Filters", on OMP the
last two groups only; no pager under 30 rows; nothing about filters above
the table with none applied; an editor without a reviewer role has no "My
Assignments as Reviewer" group on either app. Live-probed 2026-09-05 on
OJS and OMP (Rule 4): a scratch journal with one section, no issues and no
categories offered "Days since last activity" alone, with "Clear Filters"
and "Apply Filters".

<a id="fn-b"></a>
**b** — Views: `Repo::submission()->getDashboardViews()` cases
`TYPE_REVIEWER_ASSIGNMENTS_ACTION_REQUIRED` ("Action Required by me"),
`_ALL` ("All assignments"), `_COMPLETED`, `_PUBLISHED`, `_ARCHIVED`,
`_DECLINED` (locale keys `submission.dashboard.view.reviewAssignments.*`),
each a `ReviewAssignment` collector filter: `filterByActionRequiredByReviewer`
(not declined, not cancelled, `submissions.stage_id = ra.stage_id`,
`date_completed` null); `filterByActive` (not declined/cancelled, and stage
matches OR (not published AND completed)); `filterByCompleted` (completed,
submission not published, `stage_id <> SUBMISSION`); `filterByPublished`
(completed, submission published); `filterByIsArchived` (not completed,
submission in EDITING or PRODUCTION); `filterByDeclined`. Cancelled rows
match no view (`Collector.php`). The landing view is the first entry.
Live-probed 2026-09-04 on OJS and OMP (Rule 2): unanswered and accepted →
"Action Required by me" + "All assignments"; submitted → "All assignments"
+ "Completed"; declined → "Declined" only; moved to Copyediting unsubmitted
→ "Archived" only; cancelled by the editor → none of the six.
Live-probed 2026-09-05 on OJS and OMP (Rule 2): every seed sat in exactly
the views above; an unanswered request the editor removed with "Unassign
Reviewer" sits in no view; "Completed" was verified for submitted,
unpublished reviews only, and the collector's further exclusion (a
submission back on the Submission stage, `stage_id <> SUBMISSION`) has no
editor screen that reaches it, so the body does not claim it; an accepted,
unsubmitted review on a submission published through the scenario tooling
appeared in no view ("Archived" counted the Copyediting and Production
rows only) — not settled for a submission published from the editor's
Production screens.

<a id="fn-c"></a>
**c** — Columns: `useDashboardConfig.js::getColumns` for
`MY_REVIEW_ASSIGNMENTS`: `id` ("ID", `common.id`, sortable), `title`
("Submissions", `navigation.submissions`), `activity` ("Editorial Activity",
`stats.editorialActivity`), `actions` ("Actions", `admin.jobs.list.actions`)
(AFFU-201). Activity sentence:
`useDashboardConfigEditorialActivity.js::getEditorialActivityForMyReviewAssignments`
— `REVIEW_ASSIGNMENT_STATUS_DECLINED` → `dashboard.reviewAssignment.declined`
(date = `dateConfirmed`); submission stage EDITING/PRODUCTION and status not
in `CompletedReviewAssignmentStatuses` → `submissions.incomplete`;
`AWAITING_RESPONSE` / `REQUEST_RESEND` → `.acceptOrDeclineRequestDate`
(`dateResponseDue`); `RESPONSE_OVERDUE` →
`.deadlineForRespondingAcceptOrDecline`; `ACCEPTED` → `.completeReviewByDate`
(`dateDue`, passed unformatted — the probe records the date's shape);
`REVIEW_OVERDUE` → `.deadlineForCompletingReviewHasPassed`; completed
statuses (received, viewed, complete, thanked) → `.reviewSubmitted`
(`dateCompleted`) (AFFU-202). Action label:
`DashboardCellReviewAssignmentActions.vue` — EDITING/PRODUCTION and not
completed → none; `AWAITING_RESPONSE`/`RESPONSE_OVERDUE`/`REQUEST_RESEND` →
`dashboard.actions.respondToRequest`; `ACCEPTED`/`REVIEW_OVERDUE` →
`dashboard.actions.finishReview`; `DECLINED` → none; else `common.view`
(AFFU-203). Every label calls `dashboardPageStore.openReviewerForm`, a full
redirect to `reviewer/submission/{submissionId}` (AFFW-057). Live-probed
2026-09-04 on OJS and OMP (Rule 3): every row wording verbatim; the
"Actions" cell is a button and the title cell plain text; the accepted
sentence prints the raw `dateDue` as "2026-10-02 00:00:00." (finding A5),
the unanswered one "2026-10-02" with no period, the declined one
"2026-09-04"; the two overdue sentences carry no date; "View" opens the
wizard on "4. Completion".

<a id="fn-d"></a>
**d** — Wizard page: `PKPReviewerHandler::submission()` (lib/pkp
`pages/reviewer/`), reached only through the app subclasses
`APP\pages\reviewer\ReviewerHandler` of OJS (ROUTE-047; adds an override of
`getReviewForm()` for step 3) and OMP (ROUTE-066; no override beyond the
constructor and `authorize()`); both register ops `submission`, `step`,
`saveStep`, `showDeclineReview`, `saveDeclineReview`, `downloadFile` for
`ROLE_ID_REVIEWER` (the `downloadFile` op has no method anywhere in the
chain — inert). OPS has no `pages/reviewer/` directory (ROUTE-022 apps
column). Page title: `__('semicolon', ['label' => __('submission.review')])
. title` = "Review: {title}". Which assignment: `SubmissionAccessPolicy` →
`ReviewAssignmentAccessPolicy` fetches
`filterByReviewerIds([$user], true)` (`isLastReviewRoundByReviewer`)
`->first()`, i.e. the reviewer's assignment on their latest round. Step
gating: `$step = min(requested, max(assignment step, 1))`, then a `1..4`
range check that throws "Invalid step!"; because the clamp runs first, a
high number never reaches the check (live-probed 2026-09-04 on OJS and
OMP: `?step=3`, `?step=4` and `?step=9` on an unanswered assignment all
rendered step 1 with HTTP 200 and the address unchanged), while `?step=-1`
answered HTTP 500 with an empty body on both apps — an address no screen
offers, kept here and not in the body; `ReviewerTabHandler.js::getDisabledSteps` disables
tab indexes beyond the reached step; a `setStep` event after each successful
save enables the next. Tabs: `reviewStepHeader.tpl` (`#reviewTabs`,
AFFU-138..141), keys `reviewer.reviewSteps.*` = "1. Request",
"2. Guidelines", "3. Download & Review", "4. Completion". The
`<reviewer-submission-page>` mount above the tabs is footnote k.
Live-probed 2026-09-04 on OJS and OMP (Rule 6): heading, address, the four
tab labels, tabs beyond the reached step `aria-disabled`, the page opening
on the furthest step; an assignment seeded as accepted through the
scenario API opens on step 1 with "Save and continue" (the reached step
advances only on a screen acceptance or that press).

<a id="fn-e"></a>
**e** — Step 1: `PKPReviewerReviewStep1Form` + lib/pkp
`templates/reviewer/review/step1.tpl` (AFFU-143..154), included by
`ojs templates/reviewer/review/step1.tpl` with `descriptionFieldKey =
article.abstract` ("Abstract") and by OMP's with `submission.description`
("Description") (AFFU-155, 156); "Article Title"/"Book Title" are the apps'
`submission.title` strings. Request text key `reviewer.step1.requestBoilerplate`;
review type `__($reviewAssignment->getReviewMethodKey())` →
`editor.submissionReview.open` / `.anonymous` / `.doubleAnonymous`. Review
files grid: `ReviewerReviewFilesGridHandler` (GRID-028; title
`reviewer.submission.reviewFiles` = "Review Files"; rows filtered by
`ReviewFilesDAO::check` per assignment; the grid's own policy passes
`permitDeclined = !restrictReviewerFileAccess`), rendered only when
`!$restrictReviewerFileAccess` (AFFU-144); per-file download authorisation
is `SubmissionFileAssignedReviewerAccessPolicy` (skips unconfirmed
assignments when the setting is on). "View All Submission Details":
`ReviewerViewMetadataLinkAction` → Vue modal `ReviewerSubmissionDetailsModal`
(`useReviewerSubmissionDetailsForm.js`: title, authors only when
`publication.authorsString` is non-empty — the API blanks it for anonymous
review types —, abstract, data citations when enabled, data availability,
funding statement, keywords, subjects, disciplines, and since 2026-09-11
supporting agencies, `submission.supportingAgencies` "Supporting Agencies",
only when the localized list is non-empty, added after disciplines by
ui-library `db5b2813` (pkp/pkp-lib#13304, ui-library #983), while the
publication API map answers `supportingAgencies` as an empty list when
the caller's review assignment anonymizes the authors, lib/pkp
`40df36903d` (fix PR #13309); both in every app's tip on 2026-09-14, ojs
`f0cde27fda`, omp `bbd28d570`, ops `04bbf46097`) (AFFU-145; GRID-063 is
the legacy modal handler the atlas recorded, now superseded by the Vue
modal — the probe confirms which one renders). Schedule fields
`dateNotified`/`responseDue`/`dateDue` read-only (AFFU-146; labels
`reviewer.submission.reviewRequestDate` "Editor's Request",
`.responseDueDate`, `.reviewDueDate`); "About Due Dates" = `ConfirmationModal`
with `reviewer.aboutDueDates.text` (AFFU-147). Competing interests: link
action only when `$context->getLocalizedData('competingInterests') != ''`
(AFFU-148), radios/textarea only when `$currentContext->getData('competingInterests')`
(AFFU-149..151), `disabled=$reviewIsClosed`. Privacy consent: rendered when
`!getDateConfirmed() && privacyStatement` (AFFU-152), validated by
`FormValidator … 'privacyConsent' 'required'
'user.profile.form.privacyConsentRequired'` ("You must agree to the terms of
the privacy statement."); the label is `user.register.form.privacyConsent`
with the journal's privacy page as the link. Buttons: `getDateConfirmed()`
→ "Save and continue" (`common.saveAndContinue`), else
`reviewer.submission.acceptReview` + `reviewer.submission.declineReview`
(AFFU-153, 154). Live-probed 2026-09-04 on OJS and OMP (Rules 7, 8; Fields
step 1; scenarios 4, 13): the sections in Rule 7's order with the per-app
labels; the request text and the "About Due Dates" text verbatim; the file
row is name (a download link; the file arrives as
`jpk-review-assignment-{id}-…` on OJS, `pkp-review-assignment-{id}-…` on
OMP), date, component; "View All Submission Details" showed "Title" and
"Abstract" alone for "Anonymous Reviewer/Anonymous Author" and "Title",
"Authors", "Abstract" for "Open" ("Anonymous Reviewer/Disclosed Author" not
driven; the seeded submissions carry no keywords, so the window's other
metadata rows listed above were never seen and the body named only the
title, the abstract and the authors until 2026-09-14). Live-probed
2026-09-14 (OJS, scratch journal, Supporting Agencies enabled, the term
"Agency Alpha 13304" on the publication, two reviewers on one round; kept
script `shared/playwright/checks/sync/pkp-lib-13304/details-modal.js`,
outputs `.reports/sync/s14-13304/`): the "Anonymous Reviewer/Anonymous
Author" reviewer's window listed the rows "Title" and "Abstract" only and
its `publications/{id}` fetch answered `supportingAgencies: {"en": []}` and
`authorsString: ""`; the "Open" reviewer's window listed "Title",
"Authors", "Abstract", "Supporting Agencies" (authors "Au Thorside
(Author)", value "Agency Alpha 13304") and the fetch carried the term;
"Anonymous Reviewer/Disclosed Author" not driven (the anonymizer treats
it like Open); OMP not driven; scenarios 4 and 13 keep their text, the
seeded submissions carrying no agencies; dates `YYYY-MM-DD`; the
consent box is `required` and the unticked press is stopped by the
browser-side validator with a `label.error` "This field is required."
under the box (the server's "You must agree to the terms of the privacy
statement." is the fallback behind it); "Decline Review Request" is an
`<a>` and "Accept Review, Continue to Step #2" a `<button>`, in that
order; on a scratch journal with a policy, the "Competing Interests"
section, its dialog, the radio pair with the first preselected, and the
typed statement kept across toggles and shown to the editor; whether the
statement box hides again when "I do not have any competing interests" is
chosen back was not captured, so the body does not say. On the seeded
journal the privacy statement is present and the policy and guidelines
are empty. Live-probed 2026-09-28 on OJS and OMP, two runs (Rule 7,
scenario 4): on step 1 of an unanswered request the file's name link
carries no `target`, `rel` or `download` attribute; pressing it sent
`record-download` and then `download-file` (`Content-Disposition:
attachment`), the browser downloaded the file, and the address, the tab
and step 1 with "Accept Review, Continue to Step #2" stayed as they were;
step 3's link on an accepted request carries the same attributes.

<a id="fn-f"></a>
**f** — Accept: `PKPReviewerReviewStep1Form::execute()` records the CI
declaration (only when the context has `competingInterests`), bumps the
step, and, when `getDateConfirmed()` is null, calls
`ReviewerAction::confirmReview($request, $ra, $submission, false)`. Decline:
`PKPReviewerHandler::showDeclineReview()` renders
`reviewer/review/modal/regretMessage.tpl` (AFFU-176..178; prompt key
`reviewer.submission.declineReviewMessage`; body prefilled from the
`REVIEW_DECLINE` template compiled via `ReviewerAction::getResponseEmail()`);
`saveDeclineReview()` refuses a completed review ("Review already
completed!" exception), records CI as above, calls `confirmReview(…, true,
$declineReviewMessage)` and answers `redirectUrlJson(url(ROUTE_PAGE, null,
'index'))` — the journal's index page (finding A3). The modal copies the
step-1 CI radio and textarea into hidden inputs so the declaration is
recorded with the decline. `confirmReview()` is idempotent: it acts only
while `dateConfirmed` is null, then sets `declined`, `dateConfirmed`, clears
`dateReminded`/`reminderWasAutomatic`, marks the access invitation DECLINED
on decline, and logs `SUBMISSION_LOG_REVIEW_ACCEPT`/`_DECLINE`. The API's
`PUT reviews/{submissionId}/{reviewAssignmentId}/confirmReview` (API-032,
owned by *Author response to reviews*) drives the same method for the
editor's Log Response; a rider, not a screen of this spec.
Live-probed 2026-09-04 on OJS and OMP (Rules 9, 10; scenarios 2, 3):
acceptance moves to step 2 in-page, a reload opens step 2, step 1 then
offers "Save and continue" alone; the decline window's prefilled text opens
"Editors:" (OJS) / "Editor(s):" (OMP) and an added line arrived in the
"Unable to Review" body; after the decline the browser was on the
journal's home page with nothing about the decline (finding A3), the
"Declined" view held the row with an empty "Actions" cell, and "All
assignments" did not; the editor's row read "Request Declined" with
"Resend Review Request" added to its menu; the accepted row's History
gained "Confirm". Since pkp/pkp-lib#13346 (issue pkp/pkp-lib#13263;
driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge) that line reads
`Request Accepted: {date and time}`, and both suites asserted it green that
day. Live-probed 2026-09-05 on OJS and OMP (Rules 2, 10):
after the editor's "Resend Review Request" the row left "Declined" ("0
Declined") and read "Please accept or decline this request by {date}"
under "Action Required by me" with "Respond to request", and step 1
offered "Decline Review Request" and "Accept Review, Continue to Step #2"
again.

<a id="fn-g"></a>
**g** — Step 2: `PKPReviewerReviewStep2Form::fetch()` picks
`internalReviewGuidelines` for `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`, else
`reviewGuidelines`; empty → `reviewer.submission.noGuidelines`.
`step2.tpl` (AFFU-157, 158): label `reviewer.submission.reviewerGuidelines`
("Reviewer Guidelines"), buttons `reviewer.submission.continueToStepThree`
and `navigation.goBack` (a link to `submission?step=1`). Live-probed
2026-09-04 on OJS and OMP (Rule 11): heading "Reviewer Guidelines", the
seeded journal's "This publisher has not set any reviewer guidelines."
(OJS says "publisher" too), the link "Go Back" back to step 1 and the
button "Continue to Step #3" switching to step 3 in-page; a scratch
journal's configured text shown in its place, and on the press each
stage's own text (the internal reviewer's step 2 "Internal Review
Guidelines", the external reviewer's "External Review Guidelines").

<a id="fn-h"></a>
**h** — Step 3: `PKPReviewerReviewStep3Form` + `step3.tpl` (AFFU-159..168);
OJS wraps it in `ojs templates/reviewer/review/step3.tpl`, which captures
`reviewerRecommendations.tpl` into `$additionalFormFields` (AFFU-166, 169:
select `#reviewerRecommendationId`, options from
`Repo::reviewerRecommendation()->getRecommendationOptions()`, label
`reviewer.article.recommendation`, description
`reviewer.article.selectRecommendation`, default `common.chooseOne`); OMP
has no step-3 override, so the slot renders empty. Files grid as step 1
without the restrict guard (AFFU-160). Guidelines link:
`ViewReviewGuidelinesLinkAction` (label and dialog title
`reviewer.submission.guidelines` = "Review Guidelines") assigned only when
`getGuidelines()` is non-empty (AFFU-161); the surrounding section title is
`reviewer.submission.reviewerGuidelines`. Free-form boxes `#comments` /
`#commentsPrivate` (labels `submission.comments.canShareWithAuthor` /
`.cannotShareWithAuthor` with their `.description` strings) under
`submission.review` + `reviewer.submission.reviewDescription`, only in the
`{else}` of `{if $reviewForm}` (AFFU-162, 163); review form:
`reviewFormResponse.tpl` iterates `reviewFormElements`, element types
SMALL_TEXT_FIELD / TEXT_FIELD / TEXTAREA / CHECKBOXES / RADIO_BUTTONS /
DROP_DOWN_BOX (AFFU-170..175), `readonly`/`disabled=$disabled` where
`disabled = dateCompleted != null`. Attachments:
`ReviewerReviewAttachmentsGridHandler` (GRID-013; title
`reviewer.submission.reviewerFiles` = "Reviewer Files"; capabilities ADD |
DELETE | EDIT, add and delete dropped when the template passes
`reviewIsClosed`) under `common.upload` + `reviewer.submission.uploadDescription`
(AFFU-164). Discussions: `<discussion-manager-reviewer>` (AFFU-165, 181)
fetches the submission and mounts the shared `DiscussionManager`;
`useDiscussionManagerConfig.js::getManagerConfig` grants every action to a
user for whom `isCurrentUserAssignedAsReviewer(submission)` holds
(AFFU-182..191 are that manager's controls; mechanics owned by *Tasks &
discussions*). Buttons: `fbvFormButtons submitText=reviewer.submission.submitReview
confirmSubmit=reviewer.confirmSubmit saveText=reviewer.submission.saveReviewForLater
cancelText=navigation.goBack` (AFFU-167); message box
`#reviewStep3MessageBox` with `…form.responseRequired` ("Please fill in
required fields.") and `…form.notFilledIn` (AFFU-168). Live-probed
2026-09-04 on OJS and OMP (Rule 12, Fields step 3, Actors rows 6–7): the
sections in the rule's order; the private box is labelled "For editor" on
OJS and "For editor only" on OMP (`submission.comments.cannotShareWithAuthor`
differs per app; the editor's "Review Details" window uses the same label);
"Reviewer Guidelines" is a form-section label, not a heading element,
followed by the link "Review Guidelines" whose dialog is headed "Review
Guidelines"; the panel is "Review Tasks & Discussions" with "Add"; "Upload
File" opens the "Upload File" dialog with tabs "1. Upload File",
"2. Review Details", "3. Confirm" and no genre select, and the new row's
expander offers "Edit" and "Delete"; the footer is the link "Go Back",
then "Save for Later", then "Submit Review". The editor's "Review Details"
window listed the uploaded file on some openings and "No Items" on others
while its data request answered the same each time; that window belongs to
*Reviewer assignment & management*. Re-read 2026-09-26 (Fields step 3
"Recommendation", Settings, scenario 16): `getRecommendationOptions()`
reads the journal's active recommendations with no ordering, so the
options after "Choose One" come in whatever order the database returns
them; on the test installs this list has not been seen out of order (the
order question is the review-setup feature's
[A7](U29-review-setup-and-review-forms.md#a7)).

<a id="fn-i"></a>
**i** — Save vs submit: `ReviewerReviewStep3FormHandler.js` sets the hidden
`isSave` from the button pressed, and before validation makes `#comments`
required only when `#reviewAttachmentsGridContainer tbody.empty` is visible
(`updateCommentsRequired_`), and `#reviewerRecommendationId` required only
for the submit button (`updateRecommendationRequired_`). Those `required`
flags sit on textareas the rich-text editors hide, so the browser never
shows a required-field message and the "Confirm" dialog opens first
(finding A7).
`reviewStep3Required.js` (loaded only when the assignment has a review form)
adds one `required` rule per `fieldset[aria-required=true]`, shows
`#reviewStep3MessageBox` on `invalid-form.validate`, hides it once valid,
and sets `validator.cancelSubmit` for "Save for Later". Server:
`PKPReviewerHandler::saveStep()` — `isSave` → `saveForLater()` (saves form
responses or comments, stores the recommendation, `null` when 0) + trivial
notification `common.changesSaved` ("Your changes have been saved.");
else `validate()` (required review-form elements via
`getRequiredReviewFormElementIds`, `…form.responseRequired`; OJS
`ReviewerReviewStep3Form` adds `reviewerRecommendationId` required with
`…form.recommendationRequired` = "Must select a recommendation associated
with journal") then `execute()`. `saveReviewForm()` writes a comment only
when `strlen(...) > 0` (finding A4), through
`Repo::reviewAssignment()->saveReviewComment()`, which updates the existing
viewable / non-viewable comment row in place (no duplicates). Submitting a
completed review is refused server-side ("Review already completed!").
Live-probed 2026-09-04 on OJS and OMP (Rule 13, Fields step 3, scenarios
7 and 8): "Submit Review" opened "Confirm" ("Are you sure you want to
submit this review?", "OK" / "Cancel") at once with every field empty;
"Cancel" left the step unchanged; after "OK" OMP submitted the empty
review, OJS kept the step with "This field is required." under
"Recommendation" and submitted once one was chosen; a text-only and a
file-only review submitted on both. With a one-question form: after "OK"
the step stayed with the message box under the buttons and no field
marked in view (OMP's first line the raw key, finding OMP3; the marks on
another form, finding A16). "Save for Later" with
the question open showed nothing once per app on 2026-09-04 (the retired
A8); live-probed 2026-09-05 on OJS and OMP, four saves on two assignments
per app (a fresh `?step=3` load and the landing after "Continue to Step
#3"): `POST reviewer/saveStep/{id}?step=3` answered 200 and "Your changes
have been saved." showed each time, the question still unanswered after a
reload (what else such a save shows, finding A14). Not driven, so the
body does not claim it: a "Save for Later" with "Choose One" selected
after an earlier choice (only a chosen value was seen restored).
Live-probed 2026-09-28 on OJS, two runs (Fields step 3 "Recommendation",
Rule 13, scenario 7): a free-form review with "For author and editor"
typed and "Choose One" left, "Submit Review" and "OK": the step stayed,
"This field is required." under the list, in view in a 1280×900 window,
no save request sent, the mark still there 3 s and 6 s later, the box
under the buttons hidden; on that page, with no reload, a second "Submit
Review" asked "Are you sure you want to submit this review?" again and
was refused the same way; once a recommendation was chosen, "Submit
Review" and "OK" opened step 4 on the same page. OMP, the same drive: no
list, and step 4 opened. Live-probed 2026-09-28 on OJS and OMP, four
runs (Rule 18): the leave question and the lost free-form text, footnote
f-a15. Seen once per app and not settled:
after "Cancel" on the confirmation, a second "Submit Review" press on the
same page did nothing until the page was reloaded.

<a id="fn-j"></a>
**j** — After submission: `ReviewerReviewForm::fetch()` sets `reviewIsClosed
= dateCompleted || cancelled`, which disables the step-1 and step-2 submit
buttons and CI controls, makes the step-3 textareas `readonly`, disables
"Submit Review"/"Save for Later" (`submitDisabled`), and strips add/delete
from the attachments grid; review-form elements get `disabled` from
`dateCompleted`. Step 4: `reviewCompleted.tpl` (AFFU-179, 180; keys
`reviewer.complete` = "Review Submitted", `reviewer.complete.whatNext`) with
a second `<discussion-manager-reviewer>`. `submission()` opens on
`max(step, 1)` = 4 for a submitted review, which is what "View" shows.
Step 4 holds the heading, the paragraph and a second "Review Tasks &
Discussions" panel (the template's second `<discussion-manager-reviewer>`,
container `discussionManagerComplete-*`, while step 3's stays in the DOM
hidden), which renders only after the panel's own
`GET /api/v1/submissions/{id}` returns: a snapshot taken the instant the
tab lands shows the heading and the paragraph over an empty container,
which is what the 2026-09-04 probe recorded as "no panel". Live-probed
2026-09-05 on OJS and OMP (Rule 13, Actors row 7, scenario 6): the panel
there, with the same text as step 3's, on the in-page landing after "OK",
on a fresh load, on a typed `?step=4` and after the list's "View"; its
"Add" opens the same "Review Tasks & Discussions" window as step 3's
(cancelled; saving from step 4 was not driven).
Live-probed 2026-09-04 on OJS and OMP (Rule 13, Actors rows 2 and 6,
scenario 12): typed `?step=3` and the tabs then showed both boxes still
editable (toolbar shown) with the submitted text, OJS's "Recommendation"
enabled at its value, "Save for Later" and "Submit Review" disabled,
"Upload File" gone, the file row's expander offering "Edit" only, the
discussions "Add" still there; step 1's "Save and continue" and step 2's
"Continue to Step #3" disabled. Whether the row's "Edit" still saves after
submission was not driven.

<a id="fn-k"></a>
**k** — Previous rounds: `PKPReviewerHandler::submission()` collects the
reviewer's assignments on the submission and stage, and for every round
other than the last round of the submission
(`getLastReviewRoundBySubmissionId`) pushes `{reviewRoundNumber,
submittedOn = declined ? dateConfirmed : dateCompleted}` into
`pageInitConfig.reviewRoundHistories`; `ReviewerSubmissionPage.vue`
(VUE-009, AFFU-142, 192, 193) renders the box only when the array is
non-empty, with `reviewer.submission.reviewRound.info` ("Previous Reviews"),
`.info.submittedOn` ("Round {round} Review Submitted on {submittedOn}",
`formatShortDate(null)` → empty, finding A2) and `.info.read` ("Read Round
{round} Review"). `RoundHistoryModal.vue` (VUE-076, AFFU-194..196) via
`roundHistoryModalStore.js` fetches `GET reviews/history/{submissionId}/{reviewRoundId}`
(`PKPReviewController::getHistory()`, part of API-032): declined →
`reviewRound.reviewDeclineDate` ("Declined Date") + `.emailLog` ("Decline
reason sent by email") with the `REVIEW_DECLINE` log entry whose sent date
equals the confirm date, else `.emailLog.defaultMessage` ("No reason given
to the decline of the review invitation.", a fallback an on-screen
decline never produces: an emptied window still sends the template's
default body, see below); `dateCompleted`
null → `.reviewNotCompleted`; else recommendation
(`getLocalizedRecommendation()`, empty on a press), comments split by
`viewable` under `.comments.authorAndEditor` ("For editors and authors") /
`.comments.editorOnly` ("For editors only") prefixed `.comments.prefix`
("Comment {index}: "), `.attachments` (reviewer's REVIEW_ATTACHMENT files of
the round) and `.files` (the round's REVIEW_FILE files, only when the
reviewer's latest assignment on the stage is not declined). Right column:
`articleMetadata` (Type = section title, Abstract, Keywords) and
`generalInformation` (Editor's Request, Response Due Date; non-declined
only: Review Accepted On, Review Due Date, Review Submitted On). Window
title `.info.modal.title` ("Round {round} Review submitted by you for"),
pre-title the submission id, description the localized title. Live-probed
2026-09-04 on OJS and OMP (Rule 14, scenario 11; a reviewer re-added on
round 2 after a submitted, a declined and an unfinished round 1): the box
sits above the tabs with a heading "Previous Reviews" and one line per
round made of the text and a button (no link in the box); the submitted
round read "Round 1 Review Submitted on 2026-09-04", the unfinished one
"Round 1 Review Submitted on " (finding A2); the window's title,
pre-title and description as above with "Close" its only control; the
submitted review showed {OJS} "Recommendation" / "Revisions Required",
then "Reviewer Comments" with "For editors and authors" and "For editors
only", each "Comment 1:" plus the text (no "Attachments" or "Files For
Review" block: the round carried no files); the declined round showed
"Declined Date", then "Decline reason sent by email" with the subject
"Unable to Review" as its own paragraph above the message (the typed
reason for a screen decline; for an API-seeded decline the raw template
with its `{$submissionTitle}`-style placeholders, a seed artefact); the
unfinished round "The review was not completed." alone; the right column
"Article Metadata" on both apps ({OJS} "Type:" "Articles" and "Abstract:";
{OMP} "Abstract:" only, the monograph having no series) and "General
Information" with the rows per state as written. Live-probed 2026-09-05 on
OJS and OMP (Rule 14, Actors row 8): a reviewer accepted on round 1 whose
round 2 opened with another reviewer only saw "Previous Reviews" / "Round
1 Review Submitted on " / "Read Round 1 Review" on her own round-1 wizard
(finding A12; the window "The review was not completed."); a decline sent
from the window with its message emptied showed "Unable to Review" and
then the template's default body with the placeholders resolved
("Editors:" / "Editor(s):", the sentence, the reviewer's name), never the
fallback sentence; with a file sent for round 1 (listed on the reviewer's
step 3) and another for round 2, the round-1 window showed "Attachments"
with the reviewer's own upload and no "Files For Review" heading on
either app (finding A13); the "Keywords" row and a "Comment 2:" line
were never seen (no seeded keywords; a second comment in one group needs
the editor's "Modify Review"), so the body does not name them. Not
driven: whether the declined line's date is the decline date rather than
the request date (both fell on the same day).

<a id="fn-l"></a>
**l** — Access: the app `ReviewerHandler::authorize()` adds
`SubmissionAccessPolicy` with `permitDeclined = false`; for the reviewer role
that is `RoleBasedHandlerOperationPolicy` + `ReviewAssignmentAccessPolicy`,
which denies when no assignment exists for the user on the submission, when
`getCancelled()`, or when `getDeclined()` (message key
`user.authorization.submissionReviewer`, "The current user is not assigned
as a reviewer for the requested document."). Only `ROLE_ID_REVIEWER` is in
the handler's role assignments, so a manager, editor, assistant or author
hits the role check first. The dashboard op `reviewAssignments` is
assigned to `ROLE_ID_REVIEWER` alone (`PKPDashboardHandler` constructor) under
`PKPSiteAccessPolicy`. Site Administrator: no admin branch on the reviewer
handler — same as any other non-reviewer. Live-probed 2026-09-04 on OJS
and OMP (Rule 15; Actors rows 1, 2, 4): the role refusal lands on
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
(the assigned Section Editor and the Author at the wizard address; the
Author at the list address too), the assignment refusal on
`…?message=user.authorization.submissionReviewer` (a reviewer with no
assignment, and the declined and the cancelled reviewer), both HTTP 200 in
the reader-side layout; signed out → `login?source=…`, and signing in
there continued to the wizard. The file link
(`$$$call$$$/api/file/file-api/download-file?submissionFileId=…`) opened
by a reviewer without an assignment answered HTTP 200 with
`Content-Type: application/json` and the body
`{"status":false,"content":"The current role does not have access to this
operation.","elementId":"0","events":[]}` (finding A6): the JSON handler
answers in place and never redirects to the denied page. Live-probed
2026-09-05 on OJS and OMP (Rule 15, Actors row 4): the same file link
opened by the Section Editor assigned to the submission and by the Journal
Manager downloaded the file (`article.pdf`, 243 bytes); a reviewer with no
assignment on the submission got the JSON refusal above. A file address
before acceptance with "Restrict File Access" on was not driven (step 1
offers no link to copy); `SubmissionFileAssignedReviewerAccessPolicy`
skips unconfirmed assignments when the setting is on.

<a id="fn-m"></a>
**m** — One-click: `EditorAction::createReviewRequestMailable()` (OJS/OMP
`lib/pkp/classes/submission/action/EditorAction.php`) creates a
`ReviewerAccessInvite` (payload `reviewAssignmentId`, expiry
`(numWeeksPerReview + 4) * 7` days from `getExpiryDays()`) and replaces the
`{$reviewAssignmentUrl}` variable with the invitation's accept URL when
`reviewerAccessKeysEnabled`; the `OneClickReviewerAccess` trait does the
same for `ReviewRemind`, `ReviewRemindAuto`, `ReviewResponseRemindAuto`
(AFFU-205; each send mints a new invitation). The link is the invitation
page (`InvitationHandler::accept`, AFFU-206, owned by *User invitations*),
which calls `ReviewerAccessInviteRedirectController::acceptHandle()`
(AFFU-207): 404 unless the invitation is PENDING, then `handleAccess()`
(refuses when the setting is off; throws
`"You are logged in as a different user. Please log out and try the
invitation link again."` for a browser signed in as a different user,
`ReviewerAccessInvite.php`; otherwise
`Validation::registerUserSession($reviewer)`) and redirects to
`reviewer/submission?submissionId=…&reviewId=…`. The invitation is marked
ACCEPTED by `finalize()` on review submission and DECLINED by
`confirmReview(decline)`; a non-pending link that still exists falls into
the invitation feature's "Invitation Unavailable" handling. The app
`ReviewerHandler::authorize()` also honours a `key` query parameter
directly (a legacy link shape) by running the same accept path.
`confirmDecline()` (AFFU-208) redirects to the login page after a decline
through the invitation page; no reviewer email carries a decline link
today, so nothing in this feature reaches that path. Without the setting
`ReviewAssignmentEmailVariable::getReviewUrl()` is the plain
`reviewer/submission?submissionId=` address.
Live-probed 2026-09-04 on OJS and OMP (Rule 16, Actors row 9, scenario
10; a scratch context with the setting on, the reviewer added through the
editor's "Add Reviewer" window because an API-seeded assignment sends no
request email): the request email is "Invitation to review" (OJS) /
"Manuscript Review Request" (OMP), from the editor's own address, its two
links the same `{context path}/invitation/accept?id=N&key=…` (the body
says "logging into the journal site" / "logging into the press"); a fresh
signed-out browser was redirected once to
`reviewer/submission?submissionId=…&reviewId=…` and showed the wizard on
"1. Request" with the reviewer's name in the header; the same link in a
second signed-out browser landed there again; after accepting and
submitting through the link, it answered HTTP 200 with the reader-side
page "Invitation Unavailable" / "This invitation is no longer available.
It may have already been accepted, declined, or expired. Please contact
the journal manager for further assistance." (the words "journal manager"
on the press too), "Login" / "Register" — whether accepting alone already
spends the link was not separated; after a decline through the wizard's
window the same link rendered "Invitation Unavailable" too (live-probed
2026-09-05, both apps). The expiry end (`getExpiryDays()`, the review
period plus four weeks) cannot be driven on the test installs, whose
clock nothing advances, so the body does not claim it; automatic reminders (`ReviewRemindAuto`,
`ReviewResponseRemindAuto`) carry the link by the same trait but were not
driven either. The
row's "Send Reminder" (an overdue row's control; dialog "Review Reminder",
email "A reminder to please complete your review", body "login to the
journal" / "login to the press") minted a new invitation (new `id` and
`key`) that landed on the wizard the same way. The older link answered a
bare HTTP 404 "404 Not Found" (no app page) on every open after a later
one-click email to the same reviewer on the same context, whether that
was a reminder or a request on another submission; a request link opened
with no later email in between worked (finding A9). Opened while signed
in as the scratch author, both a request and a reminder link answered
HTTP 500 with an empty body; the server log holds the exception above
(finding A10). With the setting off (the seeded journal), the request
email's links were `reviewer/submission?submissionId=N` with no key, a
signed-out open was redirected to `login?source=…`, and signing in there
as the reviewer continued to the wizard on "1. Request" (scenario 10's
control). Incidental, another feature's: the "Edit" window's date-change
email carries keyless wizard links even with the setting on (*Reviewer
assignment & management*).

<a id="fn-n"></a>
**n** — Emails and bookkeeping. Accept/decline:
`ReviewerAction::getResponseEmail()` builds `ReviewConfirm` (MAIL-036, key
`REVIEW_CONFIRM`, subject `emails.reviewConfirm.subject`) or `ReviewDecline`
(MAIL-037, `REVIEW_DECLINE`, subject "Unable to Review", body the window's
text or the template), sender and reply-to the reviewer, recipients the
stage assignments whose group is MANAGER or SUB_EDITOR, falling back to the
context contact; logged as `SubmissionEmailLogEventType::REVIEW_CONFIRM`/`_DECLINE`.
Both mailables are `canDisable` (Settings › Workflow › Emails). Live-probed
2026-09-04 (Side effects "Accepting", "Declining"): both emails From and
Reply-To the reviewer; on the seeded OJS journal they reached three
editors (the section's auto-assigned Editor and Section Editors plus the
participant), on the press the participant alone — the recipient set
differs with the seed, not the rule. Live-probed 2026-09-05 on a scratch
journal, both apps: with a Section Editor as the only stage participant
the "Review accepted" email went to them alone, not to the unassigned
Journal Manager; with nobody assigned, to the principal contact alone.
Submit:
`PKPReviewerReviewStep3Form::execute()` — for each MANAGER/SUB_EDITOR stage
assignment, `NOTIFICATION_TYPE_REVIEWER_COMMENT` (NOTIF-013,
`notification.type.reviewerComment` = "A reviewer has commented on
"{$title}"."), then `ReviewCompleteNotifyEditors` (MAIL-035, key
`REVIEW_COMPLETE`, subject `emails.reviewComplete.subject` — on a press
`{$reviewRecommendation}` resolves to "None", finding OMP2 — from the
context contact, with the `emails.footer.unsubscribe.automated` footer)
unless the type is in the user's blocked email list; deletes the reviewer's
`NOTIFICATION_TYPE_REVIEW_ASSIGNMENT` task ("Review pending."); logs
`SUBMISSION_LOG_REVIEW_READY` (`log.review.reviewReady`); finalizes the
access invitation. The editor-side consequences (row status, History,
round status) are the neighbouring specs'. Live-probed 2026-09-04 on OJS
and OMP (Side effects "Submitting", scenario 6): the email reached every
editor assigned to the stage — three on the seeded OJS journal (the
section's auto-assigned Editor and Section Editors plus the participant),
the participant alone on the press — From "Site Admin" <admin@mail.test>
(the context contact); subject "Review complete: {reviewer} recommends
{recommendation} for #{id} Author — "{title}"", body "Dear {name}," /
"{reviewer} completed the following review:" / the submission line with
its workflow link / "*Recommendation:* {recommendation}" ("None" on the
press) / "*Type:* {review type}" / "Login to view all files and comments
({link}) provided by this reviewer." / the "This is an automated message
from {journal} … You can unsubscribe …" footer. The editor's header
"Tasks" panel (the header has no other notifications button) read "No
Items" after the submit on both apps, so the `REVIEWER_COMMENT`
notification was not seen anywhere; the editor's workflow page right
after the submit was not opened and is where to look. The reviewer's
"Review pending." line left their Tasks panel; the editor's row read
"Review Submitted", with "Revisions Required" under it on OJS.

<a id="fn-o"></a>
**o** — Settings: `restrictReviewerFileAccess` (label
`manager.setup.reviewOptions.restrictReviewerFileAccess` "Restrict File
Access"), `reviewerAccessKeysEnabled` ("One-click Reviewer Access"),
`reviewGuidelines` / OMP `internalReviewGuidelines` (labels
`manager.setup.reviewGuidelines` — "Review Guidelines" on OJS, "External
Review Guidelines" on OMP — and `manager.setup.internalReviewGuidelines`),
`competingInterests` (`manager.setup.competingInterests`), all on
`PKPReviewSetupForm`; `privacyStatement` on the website setup form;
`defaultReviewMode`, `numWeeksPerResponse`, `numWeeksPerReview`, review
forms and OJS reviewer recommendations per the review-setup feature. Scratch
configuration through the scenario API: `POST scenarios/context` takes
`review {defaultReviewMode, restrictReviewerFileAccess,
reviewerAccessKeysEnabled, reviewGuidelines, competingInterests, OMP
internalReviewGuidelines, numWeeksPerResponse, numWeeksPerReview, …}` and
`reviewForms[]`, and a reviewer entry takes `reviewForm: "<title>"`
(scenarios.md "Configuring a scratch context", built 2026-09-05; OPS
answers 400 on the review keys).
Live-probed 2026-09-04 on OJS and OMP: Settings › Workflow › Review has the
sub-tabs "Setup" and "Reviewer Guidance"; on the seeded journal "Restrict
File Access" and "One-click Reviewer Access" are unticked, "Review
Guidelines" (OMP: both guideline boxes) and "Competing Interests" empty,
"Default Review Mode" "Anonymous Reviewer/Anonymous Author"; the "Restrict
File Access" box label differs per app (OJS "Reviewers will not be given
access to the submission file until they have agreed to review it.", OMP
"Reviewers will have access to the submission file only after agreeing to
review it."), the "One-click Reviewer Access" label and group text are the
same on both. With "Restrict File Access" on (a scratch journal, both
apps): step 1 has no "Review Files" section at all, before and after
accepting (2026-09-05), and step 3 lists the granted file as a download
link. Live-probed 2026-09-05: after "Default Review Mode" was set to
"Open", a newly seeded assignment's step 1 read "Review Type" / "Open";
on OJS the "Reviewer Recommendations" sub-tab's "Add Recommendation"
(textbox "Review Recommendations *", list "Recommendation type *") added
the new entry to step 3's "Recommendation" list, where it showed last that
day (the list has no fixed order, footnote h).

<a id="fn-p"></a>
**p** — OPS: no `pages/reviewer/` directory in `ops-main` (ROUTE-022 lists
OJS and OMP only), no reviewer user group in its `registry/userGroups.xml`
(seed-facts "OPS has no reviewer role", live-probed 2026-09-02), the
`reviewAssignments` dashboard op present but assigned to a permission
level no installed OPS role carries (a manager can create one and a user
can accept it, below), and no review-flow email templates
([→ the OPS absence](U27-reviewer-assignment-and-management.md#ops1)). The
absence is probed as install facts (scenario 17), never asserted from code.
Live-probed 2026-09-04 on OPS as `manager.maya`, `sectioneditor.ana`
(Moderator) and `author.alex`: the sidebar holds "Editor Dashboard" and
its views, "Start A New Submission", "DOIs", "Settings", "Statistics",
"Tools" (fewer for the Moderator) and no reviewer group; typed
`dashboard/reviewAssignments` was redirected for all three to
`user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
(HTTP 200, the reader-side layout, "The current role does not have access
to this operation."); typed `reviewer/submission/1`, with and without a
preprint of that id and with `?step=1`, answered HTTP 404 with no
redirect and a 23-byte body holding only the heading "404 Not Found";
Settings › Users & Roles › Roles listed five roles ("Preprint Server
manager", "Moderator", "Author", "Reader", "Editorial Board Member") with
one stage column, "Production", and no "Reviewer" permission level. The
same screen on the seeded journal lists "Reviewer" (permission level
"Reviewer") and on the press "Internal Reviewer" and "External Reviewer"
(both "Reviewer"). The seeded OPS server holds no submissions; the probe
seeded one for the wizard-address check. Live-probed 2026-09-05 on a
scratch OPS server (scenario 17, finding OPS1): the same two pages for the
installer's `admin`, an Editorial Board Member and a Reader; "Create New
Role" lists the permission levels "Manager", "Moderator", "Assistant",
"Author", "Reviewer", "Reader" (OJS and OMP offer "Reviewer" there too,
the level of their installed reviewer groups), choosing "Reviewer"
hides the whole "Stage Assignment" block (`#userGroupStageContainer`,
read settled 1.5 s after the choice, re-driven 2026-09-30 in three runs):
its "Production" box is disabled and unticked and the hint "You need to
define a stage to assign to." sits in the page, both hidden, while at
"Manager", the level the window opens on, the block shows with
"Production" greyed; "OK" saved "Scratch Reviewer" · "Reviewer" as a
sixth row; Users › More Actions › "Edit" opened "Invite user to take a
role" offering it, and the invitation's "Accept And Continue to OPS"
opens the dialog "You've been assigned a new role in OPS" ("View All
Submissions") and the role is held on the next sign-in (the revisited
link reads "Invitation Unavailable"; re-driven 2026-09-30). That account's
sidebar held "My Assignments as Reviewer" (href `#`, no views under it)
and "My Submissions as Author"; `dashboard/reviewAssignments` answered
HTTP 200 with the heading "undefined (0)", the columns "ID Sort",
"Submissions", "Editorial Activity", "Actions", "No Items" under an
"Error" window (re-driven 2026-09-30, f-ops1) and "Showing 0 to 0 of 0",
its data request `GET api/v1/_submissions?…` answering 401 (OJS and OMP
fetch `_submissions/reviewerAssignments` for this list); `dashboard/
editorial` sent it to the access-denied page and `reviewer/submission/2`
stayed the bare 404. Live 2026-09-12 (the suite's run on the seeded
server, scenario 17): the Roles grid carried a second stage column,
"Done", and the "Stage Assignment" list under "Reviewer" held "Production"
disabled and a "Done" box left enabled; Done joined every app's stage
list on 2026-09-08 (pkp/pkp-lib#13109, ops `a72cacc1c5` / pkp-lib
`b48c22ca06`; [→ Done](U24-workflow-screen-and-stage-access.md#done)) and
the Roles screen was written for its absence, which upstream was fixing in
pkp/pkp-lib#13312 (open that day). The scenario therefore reads the "Production"
box and the role saved and does not count the stages; once the fix
lands, the list under "Reviewer" holds "Production" alone and the grid no
"Done" column (read settled on 2026-09-30, the list under "Reviewer" is
hidden altogether, above). The fix landed 2026-09-12 (pkp/pkp-lib#13312 "Use DONE stage only for auth checks" (lib/pkp `65901c4f7a` + `716419c770`, merge `0356122fdc`; ojs `0dbb274a45` / omp `ce63a5cd8` / ops `97d8a0d2e8`, merged 2026-09-12)): Done is out of
every app's `getApplicationStages()` again and kept in
`PKPApplication::getValidStages()` for the auth policy alone, so the grid
(`UserGroupGridHandler`) and the role form's "Stage Assignment" boxes
(`UserGroupForm`, `WorkflowStageDAO::getWorkflowStageTranslationKeys()`
filtered by the app list) no longer know it. Live 2026-09-14 (OJS, a reset
server at ojs `f0cde27fda`; the kept reproduction
`shared/playwright/checks/sync/pkp-lib-13109/regressions.js`, outputs
`.reports/sync/s14-13109/`): the Roles grid's headers read "Role Name",
"Permission level", "Submission", "Review", "Copyediting", "Production" —
no "Done" column — and the Author role's "Edit" form offers exactly the
four "Stage Assignment" boxes "Submission", "Review", "Copyediting",
"Production" (the second run of the day, `.reports/sync/s14-13109b/`,
after the script's Author-row filter was fixed); OMP and OPS not
re-driven (the same one-line app-side change). The scenario's text
stands.

<a id="fn-q"></a>
**q** — OMP: `Application::hasCustomizableReviewerRecommendation()` returns
false on the press and its `templates/reviewer/review/` holds only
`step1.tpl` (the description label), so `$additionalFormFields` is empty
and no recommendation is collected or validated; `getLocalizedRecommendation()`
is empty in the history payload; the stage-specific guidelines come from
footnote g. OMP's `ReviewerHandler` adds nothing beyond OJS's minus the
step-3 form override, and both apps' step-3 forms share
`PKPReviewerReviewStep3Form` — shared-behaviour evidence for every unmarked
claim on the wizard, with the recommendation-related lines the only
divergence.

<a id="fn-s"></a>
**s** — Scenario tooling. Ready accounts on the seeded journal
`publicknowledge`: `reviewer.julia` (OJS/OMP External Reviewer) as the
Reviewer, `reviewer.paul` as the second Reviewer, `reviewer.amara` (OMP
Internal Reviewer), `sectioneditor.ana` as the assigned Section Editor,
`author.alex` as the Author and submitter; passwords per
`docs/process/users.md`. A submission in review with a request: `POST
scenarios/submission` with `submitted: true`, `decisions:
['sendExternalReview']` (OMP internal: `sendInternalReview` with
`reviewRounds[].stage: 'internal'`), `reviewRounds: [{reviewers:
[{username, status: 'invited' | 'accepted' | 'completed'}]}]` and, on the
seeded journal, `participants: [{username: 'sectioneditor.ana', role:
'sectionEditor'}]`, so the response and review-complete emails have a
recipient; with no participant they go to the principal contact, which
scenario 10 relies on. An assignment seeded `accepted` opens its wizard on
"1. Request" with "Save and continue"; a test reaches step 2 by pressing
it. Review files are grant-based (patterns.md): seeded submissions carry
no files, so the test uploads one to the round and ticks it in the
editor's Add Reviewer or Edit window, or the builder grants it. Scratch
journals come from `POST scenarios/context` with throwaway `users[]`
(`manager`, `author`, `externalReviewer`; OMP `internalReviewer`,
`sectionEditor`) and the `review` keys and `reviewForms[]` of footnote o;
a scratch journal has one section (OMP: no series), no issues and no
categories. Mail is read in Mailpit at the fleet's port by the recipient's
address and, for a roster reviewer, scoped by the scratch submission's
title. An overdue row is produced by moving the due date into the past
through the editor's row "Edit" window (the screen's only route to a past
date), never by waiting. Per scenario: 1 and 2: julia seeded `invited`. 3:
julia `invited` on a round with one uploaded file ticked for her; paul
holds no assignment there; the resend is the row's "Resend Review
Request". 4: julia `accepted`, two files uploaded to the round, one
ticked. 5, 6 and 16: julia `accepted`; 16's round 2 is "Create New Review
Round" recorded on screen and julia added again through "Add Reviewer".
7: two submissions, julia `accepted` on both. 8: a scratch journal with
`reviewForms[]` holding one active form of four `elements[]`, a
`radiobuttons` question (`required: true`, `options: ['Yes', 'No']`), a
`textfield`, a `checkboxes` question (`options: ['Figures', 'Tables']`)
and a `dropdownbox` (`options: ['Biology', 'Physics']`); the throwaway
reviewer seeded `accepted` with `reviewForm: "<title>"`. 9: a scratch
journal with `review: {restrictReviewerFileAccess: true,
defaultReviewMode: 'open'}`, the throwaway reviewer seeded `invited` with
one uploaded file ticked (a submission seeded after the mode is set
carries "Open"). 10: a scratch journal with `review:
{reviewerAccessKeysEnabled: true}`, `context.contactEmail` a throwaway
address (the principal contact's mailbox), a throwaway `manager` and
`externalReviewer`, and no `participants[]`; the reviewer is added through
the manager's "Add Reviewer" window, because an assignment seeded through
the API sends no request email and so carries no one-click link; the
request link is opened before any further email reaches that reviewer,
since the reminder kills it (finding A9), and every later open uses the
reminder's link; the control is a seeded-journal request added the same
way for julia. 11: three submissions: julia `accepted` on round 1 of the
first and submitting on screen; julia `accepted` on round 1 of the second,
never finishing; paul `invited` on round 1 of the third, declining on
screen with the typed reason (an API-seeded decline stores the email
template with its placeholders unresolved, so the decline is made on
screen); on each, "Create New Review Round" is recorded on screen and the
reviewer added again through "Add Reviewer" (its "Reassign" entry). 12:
two submissions, julia `accepted` on both; on the first she uploads a
reviewer file and submits on screen. 13: a scratch journal with `review:
{competingInterests: "<policy text>", reviewGuidelines: "<guidelines
text>"}` and a throwaway `manager`, `author` and `externalReviewer`
seeded `invited`. 14: three submissions: julia `accepted` on the first,
moved on with `decisions: ['sendExternalReview', 'accept']` (the API's
promote-from-review decision is `accept`; `acceptFromReview` is refused);
julia `accepted` on the second, submitting on screen before the editor
records "Accept Submission" on screen; julia `completed` on the third,
seeded `published: true`. 15: a scratch press with `review:
{internalReviewGuidelines, reviewGuidelines}`, a throwaway
`internalReviewer` seeded `invited` on a monograph with `decisions:
['sendInternalReview']` and `reviewRounds[].stage: 'internal'`, a
throwaway `externalReviewer` seeded `invited` on a second monograph in
External Review, and a throwaway `sectionEditor` in `participants[]` on
both as the assigned editor. 17: the seeded server with one seeded
preprint; the variant's role is made on a scratch server in Settings ›
Users & Roles › Roles › "Create New Role" ("Reviewer" level, no stage) and
the throwaway user is invited from Users › More Actions › "Edit" › "Invite
user to take a role"; the "Accept And Continue to OPS" press on the
emailed link shows no confirmation, and the role is held on the next
sign-in. 18: two submissions, julia `accepted` on both, `author.alex` the
submitter and `sectioneditor.ana` the participant of the first; the cancel
is the row's "Cancel Reviewer".

<a id="fn-a1"></a>
**f-a1** — patterns.md ("The reviewer dashboard endpoint
`_submissions/reviewerAssignments` ignores `searchPhrase` AND pagination",
recorded 2026-08 while writing the review-stage suites);
`PKPDashboardHandler` passes the same search control to every page type
(`DashboardControlSearch`, AFFU-198), and the reviewer endpoint's collector
applies neither. On screen the search box and pager render as on the
editorial dashboard. Live-probed 2026-09-04 on OJS and OMP: with 13 / 10
rows in "All assignments", a phrase matching one title and a phrase
matching nothing both put `&searchPhrase=…` in the address, showed
"Search: {phrase}" with "Clear search phrase", sent
`GET _submissions/reviewerAssignments?searchPhrase=…` and listed the same
rows, with no empty-state message. Live-probed 2026-09-05 on OJS and OMP
with 34 rows in "All assignments": the pager showed "Showing 1 to 30 of
34" under all 34 rows, and page 2 sent `offset=30&page=2` and listed the
same 34 rows under "Showing 31 to 34 of 34"; "Sort" on "ID" put
`sortColumn=id&sortDirection=…` in the address and sent
`orderBy=id&orderDirection=DESC` then `ASC`, the rows unchanged both
times; the editorial dashboard's pager showed 30 of 38 and its search cut
30 rows to 1. Cosmetic, both apps: "Clear search phrase" leaves an empty
`searchPhrase=` in the address.
Issue report: [docs/issues/U28-A1-reviewer-list-search-sort-pager-inert.md](../issues/U28-A1-reviewer-list-search-sort-pager-inert.md), filed as [pkp-e2e#581](https://github.com/jardakotesovec/pkp-e2e/issues/581).

<a id="fn-a2"></a>
**f-a2** — `PKPReviewerHandler::submission()` sets `submittedOn` to
`dateCompleted` for a non-declined assignment, null when never submitted;
`ReviewerSubmissionPage.vue` interpolates `formatShortDate(review.submittedOn)`
into "Round {round} Review Submitted on {submittedOn}" with no branch for
the unfinished case, while the window's store has one
(`isIncomplete`). Live-probed 2026-09-04 on OJS and OMP: a reviewer who
accepted round 1 and never submitted, re-assigned on round 2, saw "Round 1
Review Submitted on " with nothing after "on"; the window read "The review
was not completed." and its "General Information" stopped at "Review Due
Date". Live-probed 2026-09-05 on OJS and OMP: the same dateless line on
the reviewer's own round-1 wizard once round 2 opened without them
(finding A12), and on a press before the internal reviewer submitted.
Issue report: [docs/issues/U28-A2-previous-reviews-unfinished-round-reads-submitted-on.md](../issues/U28-A2-previous-reviews-unfinished-round-reads-submitted-on.md), filed as [pkp-e2e#578](https://github.com/jardakotesovec/pkp-e2e/issues/578).

<a id="fn-a3"></a>
**f-a3** — `PKPReviewerHandler::saveDeclineReview()` ends with
`$request->redirectUrlJson($dispatcher->url($request, ROUTE_PAGE, null,
'index'))`; `null` page with op `index` is the context's index page, i.e.
the journal's public home. Unchanged since the wizard's first version.
Live-probed 2026-09-04 on OJS and OMP: after the window's button the
browser was on `{journal path}/index` (OJS: the "Current Issue" home; OMP:
the press home), with nothing on the page about the decline.

<a id="fn-a4"></a>
**f-a4** — `PKPReviewerReviewStep3Form::saveReviewForm()`: `if
(strlen($comments = $this->getData('comments')) > 0) saveReviewComment(…)`
and the same for `commentsPrivate`; `saveReviewComment()` updates the
existing row in place, so a non-empty save overwrites but an empty one is
never written. `initData()` reloads the newest row per visibility, which
is how the old text reappears. Review-form answers take a different path
(`saveReviewFormResponse` per element) and are not affected by this
reading. Live-probed 2026-09-04 on OJS and OMP: text in both boxes saved,
both boxes cleared and saved again ("Your changes have been saved." both
times, the save request answering `status: true`), reload → both boxes
showed the first-save texts; new text in one box only → that box updated,
the other still the first-save text; no email left, the editor's row still
"Request Accepted".
Issue report: [docs/issues/U28-A4-emptied-review-text-kept-after-save.md](../issues/U28-A4-emptied-review-text-kept-after-save.md), filed as [pkp-e2e#580](https://github.com/jardakotesovec/pkp-e2e/issues/580).

<a id="fn-a5"></a>
**f-a5** — `useDashboardConfigEditorialActivity.js::getEditorialActivityForMyReviewAssignments`
passes `reviewAssignment.dateDue` unformatted into
`dashboard.reviewAssignment.completeReviewByDate` ("Please complete this
review by {$date}."), while the unanswered branch formats `dateResponseDue`
and the declined branch `dateConfirmed`. Live-probed 2026-09-04 on OJS and
OMP: "Please complete this review by 2026-10-02 00:00:00." on every
accepted row, step 1's "Review Due Date" "2026-10-02".
Issue report: [docs/issues/U28-A5-accepted-review-row-due-date-clock-time.md](../issues/U28-A5-accepted-review-row-due-date-clock-time.md).

<a id="fn-a6"></a>
**f-a6** — The file link is the legacy JSON endpoint
`$$$call$$$/api/file/file-api/download-file?submissionFileId=…&submissionId=…&stageId=3`;
a refused `$$$call$$$` request is answered by the JSON handler with
`{"status":false,"content":"<message>"}` and HTTP 200, never with the
`user/authorizationDenied` redirect the page handlers use. Live-probed
2026-09-04 on OJS and OMP with a reviewer holding no assignment on the
submission: `Content-Type: application/json`, the body quoted in the
entry, no file. The assigned reviewer's own click downloaded the fixture
(243 bytes) and stayed on the wizard. Live-probed 2026-09-05 on OJS and
OMP: the assigned Section Editor and the Journal Manager downloaded the
same link (`SubmissionFileAssignedReviewerAccessPolicy` is one of several
policies the file endpoint accepts; the editors pass on their stage
assignment); a reviewer with no assignment got the JSON refusal.

<a id="fn-a7"></a>
**f-a7** — The hidden textareas behind the two editors carry the browser's
`required` (and the OJS select its own), but the rich-text editors hide
them, so no browser message ever shows and `confirmSubmit` opens the
dialog first. Server-side `PKPReviewerReviewStep3Form::validate()` checks
only the required review-form elements, and OJS's subclass adds
`reviewerRecommendationId`; nothing checks for empty comments with no
attachment, so `execute()` completes the review. Live-probed 2026-09-04
on OJS and OMP: both boxes empty and no file — OMP reached step 4 "Review
Submitted"; OJS stopped at "Choose One" ("This field is required." under
the list) and reached step 4 once "Decline Submission" was chosen; a
text-only review and a file-only review reached step 4 on both, and the
"Review complete" email arrived each time.

<a id="fn-a8"></a>
**f-a8** — Retired. Seen once per app on 2026-09-04 (a one-question form,
"Save for Later" with the question unanswered: no toast, no message box,
the page unchanged) and read then as `reviewStep3Required.js` setting
`validator.cancelSubmit` for the save. Live-probed 2026-09-05 on OJS and
OMP, four saves on two assignments per app (a fresh `?step=3` load and the
landing after "Continue to Step #3"): `POST reviewer/saveStep/{id}?step=3`
answered 200 and "Your changes have been saved." showed every time, the
question still unanswered after a reload. The first sighting did not
reproduce; the body now says the save goes through (Fields step 3,
scenario 8).

<a id="fn-a9"></a>
**f-a9** — `Invitation::invite()` (`lib/pkp/classes/invitation/core/Invitation.php`)
ends by deleting every other PENDING invitation of the same type for the
same user and context, so each `ReviewerAccessInvite` sent (a request, a
`ReviewRemind`, an automatic reminder) removes the reviewer's earlier
ones; a deleted id no longer resolves in `InvitationHandler` and falls to
a `NotFoundHttpException`, which is why the bare 404 renders instead of
the "Invitation Unavailable" page that a still-existing, non-pending
invitation gets. Live-probed 2026-09-04 on OJS and OMP (a scratch context
with "One-click Reviewer Access" on): a request link opened after a
reminder had gone to the same reviewer, and a request link opened after
a request on another submission had gone to them, both answered HTTP 404
with the plain body "404 Not Found" on every open (three opens on OMP);
a request link opened with no later email in between landed on the
wizard. The code reading is the explanation, not a driven fact.

<a id="fn-a10"></a>
**f-a10** — `ReviewerAccessInvite::handleAccess()` (or its redirect
controller) throws a plain `Exception` with the message quoted in the
entry when the session's user is not the invited reviewer; nothing
catches it on the page route, so the response is HTTP 500 with an empty
body. Live-probed 2026-09-04 on OJS and OMP: a browser signed in as the
scratch author opened a request link and a reminder link; each answered
HTTP 500 with a zero-length body, and the app's server log recorded
`Uncaught Exception: You are logged in as a different user. Please log
out and try the invitation link again. in
…/lib/pkp/classes/invitation/invitations/reviewerAccess/ReviewerAccessInvite.php`.
Not security-shaped: the link denies the wrong user, only without a page.

<a id="fn-a11"></a>
**f-a11** — `ReviewerReviewForm::fetch()` sets `reviewIsClosed` from
`dateCompleted` and `getCancelled()` only; a submission that left the
review stage changes neither, and `ReviewAssignmentAccessPolicy` still
finds the live assignment, so the wizard renders and `saveStep` accepts.
Live-probed 2026-09-04 on OJS and OMP: with the reviewer accepted and the
submission moved to Copyediting through the `accept` decision, the row
sat under "Archived" alone as "Incomplete" with an empty "Actions" cell;
the typed wizard address answered HTTP 200 with the full step 1 and an
enabled "Save and continue", which posted `reviewer/saveStep/{id}?step=1`
(200) and moved to "2. Guidelines" with no dialog or error. Live-probed
2026-09-05 on OJS and OMP: "Continue to Step #3", both boxes typed ({OJS}
"Accept Submission" chosen), "Submit Review" and "OK" reached
"4. Completion" ("Review Submitted" and the thank-you text); the list then
read "Archived (0)" and the row sat under "All assignments" and
"Completed" as "Review submitted on 2026-09-04" with "View". A published
submission's wizard behaved the same. Whether the editor receives the
"Review complete" email for such a submit was not driven (their mailbox
after one is where to look).

<a id="fn-a12"></a>
**f-a12** — `PKPReviewerHandler::submission()` lists every round the
reviewer is assigned to on the submission and stage except the
submission's last review round (`getLastReviewRoundBySubmissionId`, which
is not stage-aware), so any round that is no longer the last, the
reviewer's own current one included, lands in `reviewRoundHistories` and
renders as a "Previous Reviews" line. Live-probed 2026-09-05 on OJS and
OMP: a reviewer accepted on round 1, with round 2 opened for another
reviewer only, saw "Previous Reviews" / "Round 1 Review Submitted on " /
"Read Round 1 Review" on her own round-1 wizard, the window reading "The
review was not completed."; on a scratch press the Internal Reviewer's
wizard showed the dateless line before she submitted and on the in-page
step 4 after "Submit Review", and "Round 1 Review Submitted on
2026-09-04" after a reload. The press half was first seen 2026-09-04
(footnote f-omp4).
Issue report: [docs/issues/U28-A12-reviewer-own-round-listed-under-previous-reviews.md](../issues/U28-A12-reviewer-own-round-listed-under-previous-reviews.md), filed as [pkp-e2e#579](https://github.com/jardakotesovec/pkp-e2e/issues/579).

<a id="fn-a13"></a>
**f-a13** — `PKPReviewController::getHistory()` fills `.files` (the round's
REVIEW_FILE files, "Files For Review") only when the reviewer's latest
assignment on the stage is not declined — a condition the round-2
reviewer met, so the reading does not explain the absence; the lean
(the block is meant for a reviewer without a live later assignment) is
untested. Live-probed 2026-09-05 on OJS and OMP: the editor uploaded a
review file on round 1 and added the reviewer with it ticked (her step 3
"Review Files" listed `article.pdf`); she uploaded a reviewer file and
submitted; re-added on round 2, her round-1 window showed "Attachments"
with her upload and no "Files For Review" heading; after the editor put
a file on round 2 and granted it to her, the round-1 window still showed
none. Settling observation: the window for a reviewer whose later-round
assignment is declined or absent.

<a id="fn-a14"></a>
**f-a14** — `reviewStep3Required.js` (loaded only when the assignment has
a review form) binds a click handler on `[name="saveFormButton"]` that
sets `validator.cancelSubmit`, meant to skip the browser-side check for
"Save for Later"; the box `#reviewStep3MessageBox` and the `label.error`
marks show anyway, the same as on a refused submit, and the save request
still goes out. Live-probed 2026-09-28 on OJS and OMP, two runs each, a
scratch journal and press with a form of a required radio group, an
optional text box and a required one-line text answer (item type
"Single line text box", `textfield`; the input carrying the browser's `required` flag): on a fresh `?step=3` load, text
typed into the optional box and "Save for Later" pressed with both
required questions unanswered, the toast "Your changes have been saved."
showed, the box (OMP: its raw first line, finding OMP3) showed under the
buttons and "This field is required." under the radio group and under
the one-line box; `POST reviewer/saveStep/{id}?step=3` answered 200; the
same right after a refused submit; after a reload the typed text was
back, both questions still unanswered, the box and the marks gone. OJS,
a form with the same three questions none required, "Recommendation" at
"Choose One": the toast, the box and "This field is required." under
"Recommendation"; OMP, the same form: the toast alone. Control, both
apps: an empty free-form review saved (OJS: at "Choose One") showed the
toast alone. With a form whose only required question is a radio group
(footnote i), the 2026-09-05 saves recorded the toast and not the box;
the retired A8 sighting of 2026-09-04 saw neither.

<a id="fn-a15"></a>
**f-a15** — The legacy form handler tracks unsaved changes only through
the inputs' `change` events; the rich-text boxes of a free-form review
send none, so their text never counts as changed. Live-probed 2026-09-28
on OJS and OMP, four runs (two of the leave alone, two as the last step
of a full pass): a changed answer in a review form's text box, then the
"2. Guidelines" tab: the dialog "The data on this form has changed. Do you wish to continue
without saving?"; "Cancel" kept step 3 with the text; "OK" opened step 2,
and back on step 3 the box showed the last saved value; a change left
through the address bar raised the browser's leave-page prompt, and the
change was gone after it. Text typed into "For author and editor" with
nothing saved before, then the tab or the address bar: no question
either way, and back on step 3 the box was empty.

<a id="fn-a16"></a>
**f-a16** — `reviewStep3Required.js` adds one `required` rule to the first
radio or checkbox of each `fieldset[aria-required="true"]` and places its
message inside that fieldset, so each unanswered required group is meant
to be marked. Live-probed 2026-09-28 on OJS and OMP, two runs each, the
three-question form of footnote f-a14 ({OJS} "Accept Submission"
chosen): after "Submit Review" and "OK" no save request went out, the
box showed under the buttons, "This field is required." sat under the
radio group's options and under the one-line box, and the page stayed
scrolled at the buttons with the radio group's mark above the visible
area on both apps and the one-line box's mark above it on OJS. The
form of scenario 8 (its only required question a radio group): on
2026-09-04 both apps showed the box and no mark in view; the OMP suite's
scenario-8 test finds no "This field is required." anywhere on the page
after the same refusal and ran green on 2026-09-26; OJS's page was not
checked below the visible area. Settling observation: the same refusal
on OJS with scenario 8's form, read over the whole page, and on both
apps with a form of one required radio group plus one required one-line
answer versus one without it.

<a id="fn-omp1"></a>
**f-omp1** — OMP `classes/core/Application.php::hasCustomizableReviewerRecommendation()`
→ false; no `templates/reviewer/review/step3.tpl` in omp-main;
`PKPReviewerReviewStep2Form::fetch()` and `ViewReviewGuidelinesLinkAction::getGuidelines()`
select `internalReviewGuidelines` for the internal stage. The editor-side
half was live-probed 2026-08-29 under the reviewer-assignment feature.
Live-probed 2026-09-04 on a scratch press with both guideline texts set:
the Internal Reviewer's step 2 and step 3 dialog showed the internal text,
the External Reviewer's the external text; `select#reviewerRecommendationId`
matched nothing and the word "Recommendation" was absent on both stages'
step 3.

<a id="fn-omp2"></a>
**f-omp2** — `emails.reviewComplete.subject` = "Review complete:
{$reviewerName} recommends {$reviewRecommendation} for #{$submissionId}
…"; `ReviewAssignmentEmailVariable::getRecommendation()` has no
recommendation to resolve on a press and the placeholder prints "None".
Live-probed 2026-09-04 on the press, External Review (seeded journal) and
Internal Review (scratch press): subject "Review complete: {reviewer}
recommends None for #{id} …" and the body line "*Recommendation:* None";
first seen the same day in the notifications feature's claim check.

<a id="fn-omp3"></a>
**f-omp3** — The key `reviewer.submission.reviewFormResponse.form.responseRequired`
is defined in OJS's own `locale/en/locale.po` and not in lib/pkp's, while
`step3.tpl`'s `#reviewStep3MessageBox` uses it on every app; OMP has no
definition, so the key prints wrapped in `##`. Live-probed 2026-09-04 on
OMP with a one-question form: the box read
"##reviewer.submission.reviewFormResponse.form.responseRequired##" over
"Some required fields are not filled in. Please complete them before
submitting your review."; on OJS the same box read "Please fill in
required fields." over the same second line.

<a id="fn-omp4"></a>
**f-omp4** — `PKPReviewerHandler::submission()` lists every round the
reviewer is assigned to on the submission and stage except the
submission's last review round (`getLastReviewRoundBySubmissionId`,
which is not stage-aware): once an External Review round exists, the
Internal Review round is no longer the last one, so the internal
reviewer's own round lands in `reviewRoundHistories`. Live-probed
2026-09-04 on a scratch press: the Internal Reviewer's wizard had no box
on steps 2 and 3 while only the internal round existed; after the
section editor recorded "Send to External Review" and added an External
Reviewer, her reloaded wizard showed "Previous Reviews" / "Round 1 Review
Submitted on 2026-09-04" / "Read Round 1 Review", whose window held her
own comments and "Review Submitted On: 2026-09-04"; on the in-page step 4
right after "Submit Review", before any reload, the same line read "Round
1 Review Submitted on " with no date. The External Reviewer, with no
other round, had no box. Live-probed 2026-09-05 on OJS and OMP: a journal
shows the same box to a round-1 reviewer once round 2 opens without them,
so the entry retired into A12 (footnote f-a12).

<a id="fn-ops1"></a>
**f-ops1** — The `reviewAssignments` op and the sidebar's
`$menu['reviewAssignments']` branch key on `ROLE_ID_REVIEWER`, the
permission level, not on an installed group, and OPS's "Create New Role"
form still offers that level; OPS has no `pages/reviewer/` directory and
its dashboard page requests `api/v1/_submissions` for the reviewer view,
which refuses the role. Live-probed 2026-09-05 on a scratch OPS server:
"Scratch Reviewer" · "Reviewer" saved with no stage; the invited user,
after accepting, had the sidebar group, the list page at HTTP 200 with
the heading "undefined (0)" and "Showing 0 to 0 of 0", its data request
answering 401, and the wizard address a bare 404. Live-probed 2026-09-30
on scratch OPS servers, three runs (kept script
`shared/playwright/checks/U28/I30/i30.js`), for a seeded Reviewer-level
role with no stage held alone and beside Author, and for an Author the
manager invited on screen to a role created on screen: signing in on the
server's login page, and typing `dashboard` or `submissions`, ends on
`dashboard/reviewAssignments`; the table reads "No Items" (unchanged 8 s
later, and after a reload) under the "Error" window "The current role
does not have access to this operation." with "OK"; `GET
api/v1/_submissions?offset=0&count=30&page=1&perPage=30` answers 401
while `_submissions/viewsCount?assignedWithRoles[]=4096` answers 200;
and each load logs "TypeError: Cannot read properties of undefined
(reading 'id')" through `console.error` (Vue catches it, so no uncaught
page error). "OK" closes the window and sends nothing. "Filters" opens its
window ("Days since last activity", "Clear Filters", "Apply Filters");
"Apply Filters" refetches, the list request answers 401 again, and the
"Error" window reopens, with no TypeError on the refetch. The sidebar's
"My Assignments as Reviewer" is a link to `#` that expands to no entries.
Beside Author, "My Submissions as Author" and `dashboard/mySubmissions`
("Active submissions (0)") work; `dashboard/editorial` shows the
access-denied page. Controls, three runs each: on OJS and OMP the same
shapes of account, and an installed External Reviewer, land on
`dashboard/reviewAssignments?currentViewId=reviewer-action-required`,
"Action Required by me (0)" with "No Items", its request
`_submissions/reviewerAssignments?actionRequired=true…` answering 200,
the sidebar listing the six views, "Apply Filters" refetching with 200,
and no window and no console error. Not security-shaped: the page shows
nothing and the request is refused.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "My Assignments as Reviewer" sidebar group and list | backend sidebar → view; `{journal}/dashboard/reviewAssignments?currentViewId=…` | ROUTE-008 (owned by the editorial dashboard) · AFFW-029, 050, 057 · AFFU-197..204 |
| Review wizard | list row action → `{journal}/reviewer/submission/{id}` (`?step=N`) | ROUTE-022, 047, 066 · AFFU-138..142, 209 · VUE-009 |
| Step 1 "1. Request" | wizard tab | AFFU-143..156 · GRID-028 · GRID-063 (superseded legacy modal) |
| Decline Review Request window | step 1 → "Decline Review Request" | AFFU-176..178 · MAIL-037 |
| Step 2 "2. Guidelines" | wizard tab | AFFU-157, 158 |
| Step 3 "3. Download & Review" | wizard tab | AFFU-159..169 · GRID-013, 028 · AFFU-170..175 (review-form elements) |
| Discussions panel (step 3) | wizard | AFFU-165, 180..191 |
| Step 4 "4. Completion" | wizard tab | AFFU-179, 180 |
| Previous Reviews box and Round history window | wizard header → "Read Round {N} Review" | AFFU-192..196 · VUE-076 · API-032 (`history` op; owned by *Author response to reviews*) |
| One-click review link | request/reminder email → invitation page → wizard | AFFU-205, 207, 208 · AFFU-206 (owned by *User invitations*) |
| Response emails to editors | on accept / decline | MAIL-036, 037 |
| Review-complete notification and email | on submit | NOTIF-013 · MAIL-035 |
| Log Response (editor's side) | Reviewers panel row menu | API-032 `confirmReview` op (rider) |

## Reference — code anchors

- `lib/pkp/pages/reviewer/PKPReviewerHandler.php` — the wizard's page, step, save, decline ops and the past-round history payload
- `ojs pages/reviewer/ReviewerHandler.php` (adds the OJS step-3 form) · `omp pages/reviewer/ReviewerHandler.php` (constructor and authorize only)
- `lib/pkp/classes/submission/reviewer/form/` — `ReviewerReviewForm`, `PKPReviewerReviewStep1Form`, `PKPReviewerReviewStep2Form`, `PKPReviewerReviewStep3Form`; `ojs classes/submission/reviewer/form/ReviewerReviewStep3Form.php` (recommendation required)
- `lib/pkp/classes/submission/reviewer/ReviewerAction.php` — accept/decline bookkeeping and the response emails
- `lib/pkp/templates/reviewer/review/` — `reviewStepHeader.tpl`, `step1.tpl`, `step2.tpl`, `step3.tpl`, `reviewFormResponse.tpl`, `reviewCompleted.tpl`, `modal/regretMessage.tpl`; `ojs templates/reviewer/review/step3.tpl`, `reviewerRecommendations.tpl`
- `lib/pkp/js/controllers/form/reviewer/ReviewerReviewStep3FormHandler.js`, `lib/pkp/js/pages/reviewer/reviewStep3Required.js`, `ReviewerTabHandler.js` — client-side required rules and tab locking
- `lib/pkp/classes/security/authorization/internal/ReviewAssignmentAccessPolicy.php`, `SubmissionFileAssignedReviewerAccessPolicy.php` — who reaches the wizard and its files
- `lib/pkp/pages/dashboard/PKPDashboardHandler.php` (`reviewAssignments`), `lib/pkp/classes/submission/Repository.php::getDashboardViews()`, `lib/pkp/classes/submission/reviewAssignment/Collector.php` — the list and its views
- lib/ui-library `pages/dashboard/components/DashboardTable/DashboardCellReviewAssignment*.vue`, `composables/useDashboardConfigEditorialActivity.js` — the list's cells
- lib/ui-library `pages/reviewerSubmission/` — `ReviewerSubmissionPage.vue`, `RoundHistoryModal.vue`, `roundHistoryModalStore.js`, `ReviewerSubmissionDetailsModal.vue`; `lib/pkp/api/v1/reviews/PKPReviewController.php::getHistory()`
- `lib/pkp/classes/invitation/invitations/reviewerAccess/` — `ReviewerAccessInvite.php`, `handlers/ReviewerAccessInviteRedirectController.php`; `lib/pkp/classes/mail/traits/OneClickReviewerAccess.php`; `lib/pkp/classes/submission/action/EditorAction.php::createReviewRequestMailable()`
- `lib/pkp/classes/mail/mailables/ReviewConfirm.php`, `ReviewDecline.php`, `ReviewCompleteNotifyEditors.php`
