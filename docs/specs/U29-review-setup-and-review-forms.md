---
name: review-setup-and-review-forms
status: verified
---

# Review setup & review forms {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A Journal Manager decides how peer review runs before any reviewer is
invited. Everything for that sits on one screen, Settings › Workflow › Review,
in four side tabs: "Setup" (the default review mode, what reviewers may
access, the default deadlines, the minimum number of reviews, and the clocks
of the automatic reminder emails), "Reviewer Guidance" (the guidelines and
the competing-interests policy reviewers read), "Review Forms" (structured
questionnaires a reviewer fills in instead of two free-text boxes) and, on a
journal, "Reviewer Recommendations" (the list a reviewer picks a
recommendation from). None of it is visible to a reviewer directly: each
setting takes effect on the editor's Reviewers panel
([→ reviewer assignment & management](U27-reviewer-assignment-and-management.md#search))
or in the reviewer's wizard
([→ reviewer's review](U28-reviewers-review.md#wizard)), and this spec says
which setting lands where. The wizard itself, the request emails and the
editor's windows stay with their own specs. <sup>a</sup>

OPS does not install a review stage, so its Workflow Settings screen has no
"Review" tab: a Preprint Server Manager sees "Submission", "Preprint Server
Library", "Emails" and "Tasks and Discussions" only, and nothing in this
spec has a screen on a preprint server (scenario 11). <sup>b</sup>

On a press the "Review" tab has three side tabs: "Setup", "Reviewer
Guidance" and "Review Forms". A press collects no reviewer recommendation,
so it has no "Reviewer Recommendations" tab [OMP1](#omp1); its "Reviewer
Guidance" tab carries two guideline boxes, one per review stage, and a few
labels are worded differently [OMP2](#omp2). <sup>b</sup>

## Actors & permissions

**Terms used below.** The **manager roles** are the roles at the Journal
Manager permission level whose role settings allow access to the journal's
settings: on the seeded journals the Journal Manager and the Editor (a
Journal Editor group at the manager level). A **form in use** is a review
form that at least one review assignment carries (an assignment the
reviewer has not declined; Rule 12). A **recommendation in use** is one
some reviewer has chosen on a submitted review (Rule 18). <sup>c</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open Settings › Workflow › Review** (all its side tabs) | • Manager roles and the Site Administrator: the sidebar's "Settings" is a collapsed group; opened, it lists "Workflow", which leads there<br>• Section Editor, Assistant, Reviewer, Author: the sidebar has no "Settings" group, and the typed address lands on a page reading "The current role does not have access to this operation."<br>• Reader: no sidebar at all (the journal's sign-in lands on the reader site); the typed address lands on the same page <sup>c</sup> |
| **Save "Setup" and "Reviewer Guidance"** | • Manager roles and the Site Administrator: the tab's "Save" <sup>c</sup> |
| **Create, edit, copy, preview, order, activate and deactivate review forms** | • Manager roles and the Site Administrator. "Edit" and "Delete" are offered only on a form not in use (Rule 12); "Copy", "Preview" and the "Active" tick are offered on every form <sup>c</sup> |
| **Add, edit, delete and order a form's items** | • Manager roles and the Site Administrator, only while the form is not in use (Rule 12): the "Form Items" tab is greyed out for a form in use <sup>c</sup> |
| **Add, edit, delete, activate and deactivate a reviewer recommendation** {OJS} | • Manager roles and the Site Administrator. "Edit" and "Delete" are offered only on a recommendation not in use (Rule 18); the "Activate" tick is offered on every row <sup>c</sup> |

## Fields & validation

**"Setup" tab.** One form with "Save" at the bottom. The boxes below are
the form's, in screen order. <sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Default Review Mode" | yes (one is always selected) | Radio: "Anonymous Reviewer/Anonymous Author" (the install default), "Anonymous Reviewer/Disclosed Author", "Open". Effect: Rule 3 |
| "Publicly Show Reviewer Comments" (help "Enable this setting if you'd like the review process to be made publicly visible alongside published submissions. This supports transparent peer review practices and can help foster greater trust and accountability.") — box "Make reviewer comments publicly visible with published content" | no | Off by default. Effect: Rule 4 |
| "Restrict File Access" (no help text) — box "Reviewers will not be given access to the submission file until they have agreed to review it." (on a press "Reviewers will have access to the submission file only after agreeing to review it." [OMP2](#omp2)) | no | Off by default. Effect: Rule 5 |
| "One-click Reviewer Access" (help "Reviewers can be sent a secure link in the email invitation, which will log them in automatically when they click the link.") — box "Include a secure link in the email invitation to reviewers." | no | Off by default. Effect: Rule 5 |
| "Reviewer Suggestion at Submission" (help "Author can suggest several potential reviewers before completing the submission which can streamline the review process and provide valuable input for editorial team.") — box "Allow authors to suggest potential reviewers at submission process" | no | Off by default. Effect: Rule 6 |
| "Default Response Deadline" (help "Number of weeks to accept or decline a review request.") | no | A whole number of weeks, 0 or more; the install default is 4. Letters or a decimal are refused with "This is not a valid integer."; a negative number with "This must be at least 0.". An emptied box is accepted, comes back blank after a reload and behaves like 0 (Rule 7). Effect: Rule 7 |
| "Default Completion Deadline" (help "Weeks allowed to complete the review"; on a press "Weeks allowed for review completion" [OMP2](#omp2)) | no | As above; install default 4. Effect: Rule 7 |
| "Minimum Confirmed Reviews Required" (help "Minimum number of confirmed reviews required for a submission") | no | A whole number, 0 or more; install default 0. The same refusals as the deadlines; an emptied box comes back as "0". Effect: Rule 8 |
| "Set Reminders for Review" (help "Send an email reminder before or after for review request response (if reviewer has not responded to review request yet) or review submission (if reviewer has not submitted review yet)") — four sliders: "Review Request Response - Before Due Date", "Review Request Response - After Due Date", "Review Submission - Before Due Date", "Review Submission - After Due Date" | no | Each slider runs between its end labels "None" and "14", set by dragging, by a click on the track or by the keyboard arrows (one day per press); a box beside it reads the value back: "No reminder set" at the left end, otherwise "{n} days before due date" / "{n} days after due date" ("1 days" at 1; there is no singular). The install default is "No reminder set" on all four. Effect: Rule 9 |

**"Reviewer Guidance" tab.** One form with "Save". Every text box here is a
rich-text box. With more than one form language the form shows a language
switch at its top ("French" beside "English"), each box reads "{n}/2
languages completed", and pressing "French" shows a second box "… in French"
under each; one "Save" saves both languages (the seeded journals have
English only). No box carries help text. <sup>e</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| {OMP} "Internal Review Guidelines" | no | Empty by default. Shown to Internal Reviewers on their wizard's step 2 and 3 (Rule 10). Its toolbar has no quote or list buttons, unlike the two boxes under it ⚠ [OMP3](#omp3) |
| "Review Guidelines" (on a press "External Review Guidelines") | no | Empty by default. Shown to reviewers on the wizard's step 2 and 3 (Rule 10) |
| "Competing Interests" | no | Empty by default. Set, the wizard's step 1 asks the reviewer to declare competing interests (Rule 10) |
| Box "Present a link to how to ensure all files are anonymized during upload" | no | Off by default. The words "how to ensure all files are anonymized" inside the sentence are a button that opens a window "How to ensure all files are anonymized" with the instructions, closed with "Close" (there is no "OK"); pressing the words does not tick the box. Effect: Rule 11 |

**"Review Forms" tab.** A list titled "Review Forms" with "Create Review
Form" above it ("Order" joins it once the list has two forms) and the
columns "Title", "In Review", "Completed" and "Active"; "No Items" while
the journal has none. The windows opened from it are headed "Create Review
Form", "Edit" (a form's and an item's edit window alike), "Preview" and
"Create New Item". A refused save leaves the window open: an empty "Title"
or an unchosen "Item type" shows "This field is required." under the box,
while an empty "Item" with a type chosen shows the notice "A question is
required for the form item. (English)" and nothing under the box:
<sup>f</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Create Review Form" window (and the "Review Form" tab of a form's "Edit" window): "Title" | yes | Text, one box per form language. Refused empty |
| Same window: "Description and Instructions" | no | Rich text, one box per form language. Shown to the reviewer above the questions and in the preview |
| "Create New Item" window (and an item's "Edit" window): "Item" | yes | Rich text, per form language: the question the reviewer answers. Refused empty, by the notice quoted above the table |
| Same window: "Description" | no | Rich text, per form language: help shown under the question |
| Same window: box "Reviewers required to complete item" | no | Off by default. On, the reviewer cannot submit the review with the item unanswered (Rule 15) |
| Same window: box "Included in message to author" | no | On by default. Off, the item and its answer are left out of what the author gets to read (Rule 15) |
| Same window: "Item type" | yes | A list: "Choose item type" (preselected, the empty choice), "Single word text box", "Single line text box", "Extended text box", "Checkboxes (you can choose one or more)", "Radio buttons (you can only choose one)", "Drop-down box". Saved with "Choose item type" still selected, the window is refused |
| Same window: "Response Options" list with an "Add Item" link (no column heading) | for the three choice types | Each row is one answer the reviewer can pick, per form language. "Add Item" is offered whatever the type, even before one is chosen: it adds an editable row at the bottom, one text box at a time, and fixes the previous row. Changing "Item type" shows no warning and the rows stay listed; they are kept when the item is saved with a choice type and dropped when it is saved with a text type ⚠ [A5](#a5) (Rule 14) |

**"Reviewer Recommendations" tab {OJS}.** A table titled "Reviewer
Recommendations" with the button "Add Recommendation", the columns
"Recommendations" and "Activate" (a tick per row, with no name for a
screen reader ⚠ [A12](#a12)), and an unnamed third column holding the
"More Actions" menu of a row not in use. Its window
("Add Recommendation" / "Edit Recommendation") has one button, "Save"; a
refused save shows "This field is required." under each empty required
box and, at the foot, "Please correct 2 errors." (or "Please correct one
error." for one) with "Jump to next error"; it sends nothing, stays open,
and "Save" is greyed out until the boxes are filled: <sup>g</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Review Recommendations" (help "e.g. accept, reject") | yes | Text, one box per form language: the words the reviewer picks. Refused empty |
| "Recommendation type" | yes | A list: "Approved", "Not Approved", "Revisions Requested", "With Comments"; nothing is preselected, and the entry is refused without a choice. The type is shown nowhere else: not to the reviewer, not in the editor's review windows, not in the table |
| The unlabelled list under it | yes | A list: "Active Upon Saving" (preselected) or "Deactivate": whether the entry is offered to reviewers as soon as it is saved (Rule 17). A screen reader announces it with no name [A12](#a12) |

## Rules & state

<a id="screen"></a>
1. **The screen.** Settings › Workflow (page heading "Workflow Settings")
   has a "Review" tab between "Submission" and "Publisher Library" (on a
   press "Press Library" [OMP2](#omp2)). Its side tabs are "Setup",
   "Reviewer Guidance", "Review Forms" and, on a journal, "Reviewer
   Recommendations". Pressing a tab or a side tab changes the page
   address. <sup>a</sup>
   - 1a. **A reload.** A reload after pressing "Review" alone keeps
     "Review" › "Setup" open. A reload right after pressing a side tab of
     "Submission" keeps that side tab open; for a reload after another
     tab and back, see
     [→ Submission intake configuration](U58-submission-intake-configuration.md),
     Rule 1b.
     A reload after pressing a side tab of "Review", "Setup" included,
     lands on "Submission" › "Disable Submissions" instead; pressing
     "Review" then shows the side tab that was open ⚠ [A4](#a4).
   - 1b. **Coming back to "Review".** Pressing "Submission" and then
     "Review" again shows the side tab last open under "Review", but the
     address is back to the one "Review" alone gives, so a reload opens
     "Review" › "Setup".

2. **Saving "Setup" and "Reviewer Guidance".** "Save" writes the whole form
   at once. A successful save shows no page notice: "Saving" then "Saved"
   appear beside the button, and "Saved" is gone after about five seconds.
   A refused box shows its reason in a red badge under the box; beside
   "Save" at the foot of the form, "Please correct one error." (or "Please
   correct {n} errors.") and a button "Jump to next error" appear; a page
   notice reads "The form was not saved because 1 error(s) were
   encountered. Please correct these errors and try again."; "Save" is
   greyed out ⚠ [A10](#a10); and nothing on the form is saved, not even
   the boxes that passed. Unsaved edits stay, with no warning, through a
   switch to another side tab and back and, on "Setup", through
   "Submission" and back to "Review". A reload drops them, again with no
   warning, and shows the saved values. Nothing here sends an
   email. <sup>d</sup>

<a id="review-mode"></a>
3. **"Default Review Mode"** is what the editor's Add Reviewer window
   preselects as "Review Type" on every new request ([→ finding a
   reviewer](U27-reviewer-assignment-and-management.md#search)). Changing
   it later changes the preselection only: requests already made keep the
   type they were made with. The type is what the reviewer reads on the
   wizard's step 1 ([→ step 1](U28-reviewers-review.md#step-1)). <sup>d</sup>

4. **"Publicly Show Reviewer Comments"** sets the default of the "Publicly
   Show Reviewer Comments" box in the editor's Add Reviewer window and the
   assignment's "Edit" window: on, that box arrives ticked on every new
   request; off, unticked. A request made before the change keeps its box
   as it was. What a ticked box does to the published article belongs to
   *Article landing page & reading*. <sup>d</sup>

<a id="access"></a>
5. **Reviewer access.** "Restrict File Access" on: a reviewer sees the
   files for review only after accepting the request (the wizard's step 3
   instead of step 1). "One-click Reviewer Access" on: every request and
   reminder email to a reviewer carries a personal sign-in-free link. Both
   effects are the reviewer's-review spec's
   ([→ one-click access](U28-reviewers-review.md#one-click)); the automatic
   reminders of Rule 9 mint such a link too when the box is on (no screen
   shows those emails on the test installs, Rule 9e). <sup>d</sup>

6. **"Reviewer Suggestion at Submission"** on: the submission wizard gains
   the step "Reviewer Suggestions", between "For the Editors" and "Review",
   where the author names potential reviewers (*Submission wizard*); how
   the editors then see the suggestions belongs to *Reviewer suggestions*.
   Off (the default), the step is absent. <sup>d</sup>

<a id="deadlines"></a>
7. **The default deadlines.** When an editor opens Add Reviewer, "Response
   Due Date" is preset to today plus "Default Response Deadline" weeks and
   "Review Due Date" to today plus "Default Completion Deadline" weeks; the
   editor can change both before sending
   ([→ deadlines](U27-reviewer-assignment-and-management.md#due-dates)).
   A deadline saved as 0 or left empty is not "no deadline": Add Reviewer
   then presets three weeks for the response and four for the review
   ⚠ [A3](#a3). Requests already sent keep their dates. <sup>h</sup>

8. **"Minimum Confirmed Reviews Required"** above 0 adds a first line to
   the round status on the review stage: "Minimum number of confirmed
   reviews required: {N}." A review counts as confirmed once the editor has
   marked it complete (Read Review › "Mark as Complete") or thanked the
   reviewer; an accepted, submitted or viewed review does not count. When
   that many are confirmed the line stays and the round's own line under it
   becomes "Minimum required number of reviews have been confirmed. A
   decision is needed."
   ([→ the round status box](U26-review-stage-and-rounds.md#round-status)).
   At 0 nothing is required and no such line appears. <sup>d</sup>

<a id="reminders"></a>
9. **The automatic reminder clocks.** Once a day the install looks at every
   review request that is still open (sent, not declined, not cancelled, not
   yet submitted) on a submission still awaiting a decision, and sends the
   reviewer a reminder email when one of the four sliders says so. A slider
   at "No reminder set" never sends. <sup>i</sup>
   - 9a. **Before the reviewer has answered**, the two "Review Request
     Response" sliders count against the request's response due date:
     "Before Due Date" sends once when today is within that many days
     before the due date and the reviewer has not been reminded yet;
     "After Due Date" sends once when the due date is at least that many
     days past. The email is "Review Response Overdue (Automated)"
     (subject "Will you be able to review this for us?"; on a press
     "Manuscript Review Request" [OMP2](#omp2)).
   - 9b. **After the reviewer has accepted**, the two "Review Submission"
     sliders count the same way against the review due date, and the email
     is "Review Reminder (Automated)" (subject "A reminder to please
     complete your review").
   - 9c. Each reminder, automatic or the editor's own "Send Reminder",
     stamps the assignment's "Reminder" date
     ([→ reminders](U27-reviewer-assignment-and-management.md#reminders))
     and writes "An automatic reminder email was sent to {reviewer}
     regarding their review assignment" to the activity log. The
     reviewer's acceptance clears that date, which is what lets the
     submission-side clock start afresh.
   - 9d. An "After Due Date" reminder is sent only to a reviewer who has
     already been reminded once (by the "Before" clock or by an editor).
     With "Before Due Date" at "No reminder set" and nobody pressing "Send
     Reminder", the "After Due Date" slider never sends ⚠ [A1](#a1).
   - 9e. Both emails are templates the manager can edit on the "Manage
     Emails" page, reached from the "Add and edit templates" link on
     Settings › Workflow › "Emails" (*Emails management*); they are sent
     from the journal's principal contact. On the test installs the daily
     clock is switched off, so no scenario drives it (Settings).

<a id="guidance"></a>
10. **Guidance texts.** "Review Guidelines" set: the reviewer wizard's
    step 2 shows "Reviewer Guidelines" and then the text, and step 3 gains
    a "Reviewer Guidelines" block whose link "Review Guidelines" opens the
    text in a window closed with "OK". Left empty, step 2 reads "This
    publisher has not set any reviewer guidelines." and step 3 has no such
    block. On a press an Internal Reviewer reads the "Internal Review
    Guidelines" text and an External Reviewer the "External Review
    Guidelines" text, both under the wizard's "Reviewer Guidelines" heading
    and its "Review Guidelines" window [OMP2](#omp2). "Competing Interests"
    set: step 1 shows a "Competing
    Interests" block reading "This publisher has a policy for disclosure
    of potential competing interests from its reviewers. Please take a
    moment to review this policy.", a link "Competing Interests" that opens
    the typed text in a window closed with "OK", and the choices "I do not
    have any competing interests" (preselected) and "I may have competing
    interests (Specify below)"; the text itself is not printed on the step.
    Empty: the block is absent. On a press the one "Competing Interests"
    text reaches Internal and External Reviewers alike. The wizard's
    rendering is [→ step 1](U28-reviewers-review.md#step-1). <sup>e</sup>

11. **The anonymizing link.** With "Present a link to how to ensure all
    files are anonymized during upload" on, the file upload window on the
    Submission and Review stages shows a link "How to ensure all files are
    anonymized" that opens the same instructions the settings box links
    to, here with "OK" and "Cancel" (*Submission files*). Off, the upload
    window has no such link. <sup>e</sup>

<a id="forms"></a>
12. **A review form's life.** "Create Review Form" saves a new form as
    inactive, at the bottom of the list, with no items. Only an **active**
    form (the "Active" tick) is offered to editors. While the journal has
    at least one active form, Add Reviewer and the "Edit" window of a
    review still in progress show a "Review Form" list whose first entry is
    "None / Free Form Review" (the assignment's own form selected); with no
    active form those windows have no "Review Form" list at all, and a
    completed review's "Edit" window never has one. A journal section's
    "Review Form" list (*Sections*) offers the active forms the same way. The list's "In Review" column counts the
    assignments carrying the form whose review is not yet submitted,
    "Completed" those submitted; a declined request counts in neither ⚠
    [A8](#a8). A form with both at 0 is **not in use**: its row offers "Edit", "Copy",
    "Preview" and "Delete". A **form in use** offers "Copy" and "Preview"
    only; its window opens on "Preview Form" with the "Review Form" and
    "Form Items" tabs greyed out, so a form in use never changes under the
    reviewers who have it. The "Active" tick still toggles on a form in
    use, and the confirmation says the opposite ⚠ [A2](#a2). <sup>f</sup>
    - 12a. **Activate / deactivate.** Ticking "Active" opens a window
      "Confirm" asking "Are you sure you wish to activate this review form?
      Once it's assigned to a review you will no longer be able to
      deactivate it." (asked even on a form assignments already carry);
      unticking asks "Are you sure you wish to deactivate this review form?
      It will no longer be available for new review assignments.". "OK"
      applies it with the notice "Your changes have been saved.", "Cancel"
      leaves the tick as it was. A deactivated form leaves the editors'
      lists at once; assignments already carrying it keep it, and their
      reviewers still see the form on the wizard's step 3, but the
      reviewer row's "Edit" window no longer shows the form it carries and
      its "OK" detaches it ⚠ [A9](#a9).
    - 12b. **Copy** asks, in the same "Confirm" window, "Are you sure you
      wish to create a copy of this review form?" and adds an inactive
      form at the bottom of the list with the same title (no suffix), the
      same description and the items in their current order, with "Edit"
      and "Delete" offered again. It is the only way to change a form in
      use: copy it, edit the copy, activate the copy.
    - 12c. **Delete** asks, in the same window, "Are you sure you wish to
      delete this review form?" and removes the form with its items. It is
      offered on a form not in use only.
    - 12d. **Order.** "Order" above the list switches to ordering mode:
      rows are dragged, then "Done" (under the rows) keeps the new order
      with no notice and "Cancel ordering" restores the old. "Order" and
      "Create Review Form" stay above the list meanwhile. The order is the
      order of the editors' "Review Form" lists.

<a id="edit-window"></a>
13. **The form's window** (row "Edit"; headed "Edit") has three tabs:
    "Review Form" (the title and description form with "Save"), "Form
    Items" (the items list) and "Preview Form" (the form as a reviewer will
    see it: title, description, then every item in order; a required item
    carries "*" right after its question, an item's description sits
    between that mark and the answer control, and the controls can be
    typed into, though nothing is sent). Saving on "Review Form" closes
    the window and shows the page notice "Your changes have been saved.",
    with the list behind updated. Row "Preview" opens the same window
    headed "Preview" on "Preview Form"; on a form in use the two other
    tabs are greyed out and pressing them does nothing (Rule 12).
    <sup>f</sup>

<a id="items"></a>
14. **Items.** "Form Items" lists the items in order under the column
    "Item" with "Create New Item" above ("Order" joins it once items are
    listed) and "No Items" while empty. Each row offers "Edit" (the item
    window again, headed "Edit") and "Delete" (which asks "Confirm delete of a published form item..."
    before removing). The item window is Fields; a saved item closes the
    window with the notice "Your changes have been saved." and lands at
    the bottom, and "Order" reorders items as Rule 12d does forms. The
    three choice types keep the "Response Options" rows as the choices the
    reviewer sees. Of the text types, "Single word text box" and "Single
    line text box" both show the same one-line box and "Extended text box"
    a several-line box. Saving an item that has "Response Options" with a
    text type drops the options without the warning the app carries for
    it ⚠ [A5](#a5). <sup>f</sup>

15. **What an item does for the reviewer.** The wizard's step 3 shows the
    form's title, description and items instead of its two free-text boxes
    ([→ step 3](U28-reviewers-review.md#step-3)). "Reviewers required to
    complete item" makes the item one the reviewer must answer: "Submit
    Review" and its "Are you sure you want to submit this review?"
    confirmation still run, then step 3 stays with "This field is
    required." under the item. "Included in message to author" unticked
    keeps the item and its answer out of everything the author is given: the reviews
    an editor copies into a decision email (*Editorial decision recording*)
    and the author's own reading of an open review
    ([→ reading reviews as the author](U26-review-stage-and-rounds.md#author-read-review));
    the editor still reads it in full. <sup>f</sup>

16. **Languages.** A journal with more than one form language gives every
    multilingual box in this spec a version per language, shown in two
    ways: the "Reviewer Guidance" form and, on a journal, the "Add
    Recommendation" window carry a language switch at the top ("French"
    beside "English") that reveals a second box under each; in the "Review
    Forms" windows the twin, labelled "(French)" on a text box and "French"
    on a rich-text box, opens under the main-language box only while that
    box is focused. The reviewer reads the version of their interface
    language and falls back to the journal's main language. The seeded
    journals have one form language, so every box appears once (Settings).
    <sup>e</sup>

<a id="recommendations"></a>
17. **Reviewer recommendations {OJS}.** A journal starts with six entries,
    all active: "Accept Submission", "Revisions Required", "Resubmit for
    Review", "Resubmit Elsewhere", "Decline Submission" and "See Comments".
    The active entries are the "Recommendation" list a reviewer picks from
    on the wizard's step 3; an inactive entry is hidden there, except on a
    review that already carries it. "Add Recommendation" opens the window
    of Fields; saving closes it and the new entry appears in the table,
    active or not as the last list said. Closed with the "Close" at its
    top instead, even after typing, the window shuts with no question and
    no notice, and nothing is added: the table keeps its rows, also after
    a reload. The "Activate" tick asks "Are you sure you want to activate
    the recommendation {title}" (window "Activate Reviewer
    Recommendation") or "Are you sure you want to deactivate the
    recommendation {title}" ("Deactivate Reviewer Recommendation"), with
    "Yes" / "No". Neither the table nor the reviewer's list has a fixed
    order ⚠ [A7](#a7). Adding, editing and the tick redraw the table with
    no notice. <sup>g</sup>

18. **A recommendation in use** (chosen on at least one submitted review)
    has no "More Actions" menu: it can be neither edited nor deleted, only
    deactivated and reactivated. While it is deactivated, the Reviewers
    table still prints it under the reviewer's status ("Review Submitted",
    or "Review Viewed" once an editor has opened the review), and the
    editor's "Read Review" window still lists "Recommendation: {title}" at
    the top but prints "-" in its "Reviewer Recommendation" section
    ⚠ [A6](#a6). An entry not in use offers "Edit" (the same window,
    prefilled, "Edit Recommendation") and "Delete", which asks "Are you
    sure you want to delete the recommendation {title}" (window "Delete
    Recommendation"), "Yes" / "No". The six starting entries can be
    edited and deleted like any other while not in use. <sup>g</sup>
    When the text in "Review Recommendations" is changed and "Edit
    Recommendation" is closed with its back arrow ("Close"), not "Save",
    the row shows the changed text, "Edit" reopens with it, and the next
    "Save" stores it ⚠ [A11](#a11). <sup>f-a11</sup>

## Side effects

- **Saving "Setup" or "Reviewer Guidance"**: the journal's settings change;
  the form's own "Saved" is the only notice (Rule 2); no email.
  <sup>d</sup>
- **The automatic reminder** (Rule 9): one email to the reviewer per
  trigger, from the principal contact, with a one-click link when Rule 5's
  box is on; the assignment's "Reminder" date; an activity-log row "An
  automatic reminder email was sent to {reviewer} regarding their review
  assignment"; the email is also logged on the submission. <sup>i</sup>
- **Review form actions** (create, save, copy, activate, deactivate, delete,
  and every item action): the page notice "Your changes have been saved."
  and the list redrawn; ordering's "Done" redraws with no notice; nothing
  is emailed. Deleting a form is silent towards assignments: it is offered
  only when none carries it. <sup>f</sup>
- **Recommendation actions** {OJS}: the table redraws with no notice;
  nothing is emailed. Deactivating an entry hides it from reviewers who
  have not yet chosen; a review already submitted with it keeps it in the
  Reviewers table and in the "Recommendation:" line of the editor's "Read
  Review" window but loses it in that window's "Reviewer Recommendation"
  section ⚠ [A6](#a6) (Rule 18). <sup>g</sup>

## Settings that modify behavior

The tabs of this spec are themselves the settings other review features
read; the list below is what changes *these* screens.

- **The app's review stages.** OPS has none, so the "Review" tab is absent
  (the absence paragraph). A press has two, which is why "Reviewer
  Guidance" carries two guideline boxes [OMP2](#omp2).
- **Reviewer recommendations are a journal feature.** The "Reviewer
  Recommendations" tab exists on a journal only [OMP1](#omp1).
- **Form languages** (Settings › Website › Setup › Languages, the "Forms"
  column; *Languages & locales*): a second form language adds a language
  switch at the top of the "Reviewer Guidance" form and a twin under each
  "Review Forms" box (Rule 16).
- **A role's settings access** (Settings › Users & Roles › Roles; *Roles
  configuration*): a manager-level role whose settings access is switched
  off loses the "Settings" group and this screen with it (Actors).
- **A section's default "Review Form"** (Settings › Journal › Sections, on a
  journal; *Sections*): set, Add Reviewer preselects that form for
  submissions in the section instead of "None / Free Form Review" (Rule
  12).
- **The test installs' clock.** The daily reminder task and the mail queue
  are off on the test installs, so no scenario drives Rule 9. <sup>i</sup>

## Cross-feature interactions

- **Reviewer assignment & management**: the Add Reviewer and "Edit"
  windows where the review mode, the deadlines, the public-visibility box
  and the "Review Form" list take effect; "Send Reminder" and the
  assignment's "Reminder" date; the editor's "Read Review" window with its
  "Download Review Form" button and "Recommendation" line.
- **Reviewer's review**: the wizard where the guidelines, the
  competing-interests declaration, the restricted files, the one-click link,
  the review form's questions and the recommendation list appear.
- **Review stage & rounds**: the round status sentence driven by "Minimum
  Confirmed Reviews Required", and the author's reading of a review.
- **Editorial decision recording**: the decision email's copied reviews,
  where "Included in message to author" filters the items.
- **Submission wizard** and **Reviewer suggestions**: the author's
  suggestion step switched on by "Reviewer Suggestion at Submission", and
  what the editors see of the suggestions.
- **Submission files**: the upload window's "How to ensure all files are
  anonymized" link.
- **Sections**: a journal section's default "Review Form".
- **[Submission intake configuration](U58-submission-intake-configuration.md)**:
  the "Submission" tab of the same Workflow Settings page, where a reload
  on a "Review" side tab lands (Rule 1a).
- **Emails management**: the two automated reminder templates, on the
  "Manage Emails" page.
- **Submission activity log & notes**: the automatic-reminder row (no screen
  shows it on the test installs, whose clock is off; Rule 9c).
- **Roles configuration** and **Languages & locales**: the settings access
  and the form languages listed under Settings.
- **Article landing page & reading**: what "Publicly Show Reviewer Comments"
  eventually shows on a published article.

## Canonical scenarios

Scenarios 1 to 10 and 13 each start on their own scratch journal at the
install defaults (scenario 13's with the two settings its given names),
with throwaway accounts (Journal Manager, Reviewer, Author) and a seeded
submission in review; scenario 12 runs on the seeded journal with ready
accounts and scenario 11 on the seeded preprint server with one. The
accounts, their passwords, the mail catcher's address and the tooling
recipe are in the footnote. <sup>s0</sup>

1. **Save the review setup**

   Given: Journal Manager, on a scratch journal at the install defaults,
   with a submission in review whose one request to the Reviewer was made
   before any change.

   - **"Setup"**: open Settings › Workflow › "Review" › "Setup"; choose
     "Open" under "Default Review Mode", tick "Make reviewer comments
     publicly visible with published content" under "Publicly Show Reviewer
     Comments", type 2 in "Default Response Deadline" and 1 in "Minimum
     Confirmed Reviews Required", drag "Review Request Response - Before
     Due Date" to 3 (the box beside it reads "3 days before due date") and
     press "Save": "Saved" appears beside the button (Rule 2; Fields).
   - **After a reload**: reload the page and open "Review" › "Setup" again:
     every value shows as saved (Rule 2).
   - **Add Reviewer**: open the submission's review stage and press "Add
     Reviewer": "Review Type" has "Open" preselected, "Publicly Show
     Reviewer Comments" arrives ticked and "Response Due Date" is two weeks
     from today (Rules 3, 4, 7).
   - **The round status**: the round status box on the review stage now
     opens with the line "Minimum number of confirmed reviews required: 1."
     (Rule 8).
   - **The earlier request**: in the Reviewers panel, open the Reviewer's
     row's "Edit" window: the request keeps what it was made with: "Anonymous Reviewer/Anonymous
     Author" as its review type, "Publicly Show Reviewer Comments" unticked
     and "Response Due Date" four weeks from today, the day it was made
     (Rules 3, 4, 7).
   - **The Reviewer's mailbox**: no email has arrived from the save (Rule 2;
     Side effects).
   - **Control**: before the save, "Setup" read the install defaults:
     "Anonymous Reviewer/Anonymous Author", the box under "Publicly Show
     Reviewer Comments" unticked, 4 in both deadlines, 0 in "Minimum
     Confirmed Reviews Required" and "No reminder set" beside all four
     sliders (Fields). <sup>s1</sup>

2. **A refused deadline saves nothing**

   Given: Journal Manager, on "Setup" of a scratch journal at the install
   defaults.

   - **The refusal**: type `abc` in "Default Completion Deadline", change
     "Default Review Mode" to "Anonymous Reviewer/Disclosed Author" and
     press "Save": "This is not a valid integer." appears under the
     deadline, "Please correct one error." beside "Save" at the foot of the
     form and the page notice "The form was not saved because 1 error(s)
     were encountered. Please correct these errors and try again."; "Save"
     is greyed out (Rule 2; Fields).
   - **After a reload**: reload and open "Setup" again: the deadline reads 4
     and the review mode reads "Anonymous Reviewer/Anonymous Author"
     (Rule 2).
   - **A negative number**: repeat with `-1`: the refusal under the box
     reads "This must be at least 0." (Fields).
   - **Control**: the same box takes a whole number: scenario 1's 2 saves
     with "Saved" beside the button and no page notice (Rule 2; Fields).
     <sup>s2</sup>

3. **Unsaved edits survive a tab switch, not a reload**

   Given: Journal Manager, on "Setup" of a scratch journal at the install
   defaults.

   - **The tab switch**: change "Default Response Deadline" to 6, press the
     "Reviewer Guidance" side tab without saving and come back to "Setup":
     no warning appeared and the box still reads 6 (Rule 2).
   - **The reload**: reload the page and open "Setup" again: no prompt
     appeared and the box reads 4 (Rule 2).
   - **Control**: a saved value does survive the reload: scenario 1's values
     show as saved after its reload (Rule 2). <sup>s3</sup>

4. **Guidance reaches the reviewer**

   Given: Journal Manager, on "Reviewer Guidance" of a scratch journal at
   the install defaults; a Reviewer with an open request on the journal's
   submission.

   - **The texts**: type "Judge the method first." into "Review Guidelines"
     and "Declare any funding link." into "Competing Interests", press
     "Save": "Saved" appears beside the button (Rule 2; Fields).
   - **The Reviewer's step 1**: Reviewer: open the request: step 1 shows a
     "Competing Interests" block with the choices "I do not have any
     competing interests" and "I may have competing interests (Specify
     below)", and its link "Competing Interests" opens a window reading
     "Declare any funding link."; press "OK" (Rule 10).
   - **Step 2**: accept the request: step 2 shows "Reviewer Guidelines"
     then "Judge the method first." (Rule 10).
   - **Control**: step 1 does not print "Declare any funding link." itself;
     only the link's window does (Rule 10). <sup>s4</sup>

5. **The guidelines box per app**

   Given: Journal Manager, on Settings › Workflow › "Review" of a scratch
   journal at the install defaults.

   - **The side tabs**: "Review" lists "Setup", "Reviewer Guidance", "Review
     Forms" and "Reviewer Recommendations"; on a press the first three
     only, a press having no "Reviewer Recommendations" tab [OMP1](#omp1)
     (Rule 1).
   - **The guideline boxes**: on "Reviewer Guidance" the guideline box reads
     "Review Guidelines" on a journal; on a press two boxes read "Internal
     Review Guidelines" and "External Review Guidelines", in that order
     [OMP2](#omp2) (Fields; Rule 10).
   - **The instructions window**: press the words "how to ensure all files
     are anonymized" inside the sentence "Present a link to how to ensure
     all files are anonymized during upload": a window "How to ensure all
     files are anonymized" opens; "Close" closes it (Fields).
   - **The anonymizing box**: tick the box, press "Save", reload and open
     "Reviewer Guidance" again: the box stays ticked (Fields; Rule 2).
   - **Control**: pressing the words left the box unticked; only the tick
     sets it (Fields). <sup>s5</sup>

6. **Build a review form and offer it**

   Given: Journal Manager, on "Review Forms" of a scratch journal at the
   install defaults, which reads "No Items", with a submission in review.

   - **A refused form**: press "Create Review Form" and "Save" with "Title"
     empty: "This field is required." appears under the box and the window
     stays open (Fields).
   - **The form**: type "Method check" as "Title" and press "Save": the
     window closes, the page shows "Your changes have been saved." and the
     list has a row "Method check" with "In Review" 0, "Completed" 0 and
     "Active" unticked (Rules 12, 13).
   - **A refused item**: open the row's "Edit" › "Form Items", which reads
     "No Items", and press "Create New Item"; press "Save" with nothing
     filled: "This field is required." appears under "Item type"; choose
     "Radio buttons (you can only choose one)" and press "Save" with "Item"
     still empty: the notice "A question is required for the form item.
     (English)" shows and nothing under the box (Rule 14; Fields).
   - **The items**: type "Is the method sound?" as "Item", tick "Reviewers
     required to complete item", keep "Radio buttons (you can only choose
     one)", add "Yes" and "No" under "Response Options", each with "Add
     Item", typed into the new row and fixed with Enter, and press "Save":
     the window closes with "Your changes have been saved." and the row is
     listed under "Item". Add a second item "Other remarks" of type
     "Extended text box": it lands under the first (Rule 14; Fields).
   - **Edit and delete an item**: add a third item "Scratch question" of
     type "Single line text box"; open its row's "Edit" (the item window,
     headed "Edit"), change "Item" to "Scratch question, reworded"
     and press "Save": "Your changes have been saved." shows and the row
     reads the new text; press the row's "Delete", read "Confirm delete of
     a published form item..." and confirm: the row is gone and two items
     remain (Rule 14).
   - **"Preview Form"**: shows the title, "Is the method sound?" followed by
     "*" with two radio buttons and "Other remarks" with a text box; close
     the window (Rule 13).
   - **Activate**: tick "Active" on the row, read "Are you sure you wish to
     activate this review form? Once it's assigned to a review you will no
     longer be able to deactivate it." and press "OK" in the "Confirm"
     window: "Your changes have been saved." shows and the submission's
     "Add Reviewer" now has a "Review Form" list with "None / Free Form
     Review" and "Method check" (Rules 12, 12a).
   - **Control**: before the tick, the submission's "Add Reviewer" had no
     "Review Form" list, the form being inactive (Rule 12).
     <sup>s6</sup>

7. **A form in use is frozen**

   Given: Journal Manager, on "Review Forms" of a scratch journal whose
   active form "Method check", of two items, is carried by the Reviewer's
   open request on the submission, beside a second Reviewer's request
   whose free-form review is already submitted.

   - **The row**: "Method check" reads "In Review" 1 and offers "Copy" and
     "Preview" but no "Edit" and no "Delete" (Rule 12).
   - **"Preview"**: opens a window headed "Preview" on "Preview Form" with
     "Review Form" and "Form Items" greyed out; pressing them does nothing;
     close it (Rule 13).
   - **"Copy"**: press "Copy" and "OK" on "Are you sure you wish to create a
     copy of this review form?": "Your changes have been saved." shows, a
     second, unticked "Method check" row appears at the bottom with "Edit"
     and "Delete" offered, and its "Edit" › "Form Items" lists the same
     items (Rule 12b).
   - **The open request's "Edit" window**: on the submission's review
     stage, open the Reviewer's row's "Edit": its "Review Form" list has
     "Method check" selected, not the first entry "None / Free Form
     Review"; close it without saving (Rule 12).
   - **The completed request's "Edit" window**: open the other row's
     "Edit": the window has no "Review Form" list, though "Method check" is
     active; close it (Rule 12).
   - **Deactivate while carried**: back on "Review Forms", untick "Active"
     on the first "Method check" row, read "Are you sure you wish to
     deactivate this review form? It will no longer be available for new
     review assignments." and press "OK": "Your changes have been saved."
     shows and the tick is gone, though in use [A2](#a2) (Rule 12a).
   - **The Reviewer's step 3**: Reviewer: open the request and go on to
     step 3: it still shows "Method check" with its items instead of the
     two free-text boxes (Rules 12a, 15).
   - **Control**: the submission's "Add Reviewer" now has no "Review Form"
     list, the copy being inactive: the deactivated form left the editors'
     lists at once (Rule 12a).
     <sup>s7</sup>

8. **Deactivate and delete an unused form**

   Given: Journal Manager, on "Review Forms" of a scratch journal with one
   active form, "Style check", that no request carries, and a submission
   in review.

   - **Deactivate**: untick "Active", read "Are you sure you wish to
     deactivate this review form? It will no longer be available for new
     review assignments." and press "OK": "Your changes have been saved."
     shows and the tick is gone (Rule 12a).
   - **Add Reviewer**: with no other active form, the submission's "Add
     Reviewer" has no "Review Form" list (Rules 12, 12a).
   - **Delete**: open the row's "Delete", press "OK" on "Are you sure you
     wish to delete this review form?": the row is gone (Rule 12c).
   - **Control**: before the untick, the submission's "Add Reviewer" offered
     the "Review Form" list with "Style check" under "None / Free Form
     Review" (Rule 12). <sup>s8</sup>

9. **Add and retire a recommendation** {OJS}

   Given: Journal Manager, on "Reviewer Recommendations" of a scratch
   journal at the install defaults; a Reviewer with an accepted request on
   the journal's submission.

   - **The starting entries**: the table lists six rows, in no fixed
     order: "Accept Submission", "Revisions Required", "Resubmit for
     Review", "Resubmit Elsewhere", "Decline Submission" and "See
     Comments", all ticked (Rule 17).
   - **A refused entry**: press "Add Recommendation" and "Save" with the
     boxes empty: "This field is required." appears under "Review
     Recommendations" and under "Recommendation type", "Please correct 2
     errors." with "Jump to next error" at the foot; the window stays open
     and "Save" is greyed out until the boxes are filled (Fields).
   - **The new entry**: type "Accept with minor changes" in "Review
     Recommendations", choose "Approved" under "Recommendation type", leave
     "Active Upon Saving" and press "Save": the window closes and the table
     lists seven rows, "Accept with minor changes" among them, ticked
     (which place it takes is not fixed [A7](#a7)) (Rule 17).
   - **Deactivate an entry**: untick "See Comments" and press "Yes" on "Are
     you sure you want to deactivate the recommendation See Comments": the
     row is unticked, and the table still lists the same seven rows
     (Rule 17).
   - **The Reviewer's list**: Reviewer: open the request and go on to step
     3: its "Recommendation" list offers "Accept with minor changes" and
     has no "See Comments" (Rule 17).
   - **Control**: the five starting entries left ticked are all on the
     Reviewer's list (Rule 17). <sup>s9</sup>

10. **A recommendation in use loses its menu** {OJS}

    Given: Journal Manager, on "Reviewer Recommendations" of a scratch
    journal with two custom entries, "Accept with minor changes", chosen by
    the Reviewer on a submitted review, and "Needs a native speaker",
    chosen by nobody.

    - **The entry in use**: the row "Accept with minor changes" has no "More
      Actions" menu (Rule 18).
    - **Deactivate the entry in use**: untick "Accept with minor changes"
      and press "Yes" on "Are you sure you want to deactivate the
      recommendation Accept with minor changes": on the submission's review
      stage the Reviewers panel still prints "Accept with minor changes"
      under the Reviewer's status "Review Submitted", and its "Read Review"
      still lists "Recommendation: Accept with minor changes" at the top
      while its "Reviewer Recommendation" section prints "-" [A6](#a6)
      (Rules 17, 18; Side effects).
    - **The unused entry**: back on the table, the row "Needs a native
      speaker" offers "More Actions" with "Edit" and "Delete"; press
      "Delete" and "Yes" on "Are you sure you want to delete the
      recommendation Needs a native speaker": the row is gone (Rule 18).
    - **Control**: tick "Accept with minor changes" again and press "Yes" on
      "Are you sure you want to activate the recommendation Accept with
      minor changes": the "Reviewer Recommendation" section of "Read
      Review" prints the title again (Rule 18). <sup>s10</sup>

11. **No review settings on a preprint server** {OPS}

    Given: Preprint Server Manager, on the seeded preprint server.

    - **Settings › Workflow**: shows the tabs "Submission", "Preprint Server
      Library", "Emails" and "Tasks and Discussions" and no "Review" tab
      (Purpose).
    - **Control**: the same screen on the seeded journal and press shows
      "Review" between "Submission" and the library tab (Rule 1).
      <sup>s11</sup>

12. **The other roles are refused the screen**

    Given: on the seeded journal, a Section Editor, an Assistant, a
    Reviewer and an Author, each signed in in turn.

    - **Section Editor**: the sidebar has no "Settings" group; type the
      address of Settings › Workflow, the one a Journal Manager's
      "Settings" › "Workflow" opens: the page reads "The current role does
      not have access to this operation." (Actors row 1).
    - **Assistant**: the same: no "Settings" group in the sidebar, and the
      typed address lands on "The current role does not have access to
      this operation." (Actors row 1).
    - **Reviewer**: the same (Actors row 1).
    - **Author**: the same (Actors row 1).
    - **Control**: the Journal Manager's sidebar has the collapsed
      "Settings" group, which opened lists "Workflow", leading to the page
      with its "Review" tab (Actors row 1; Rule 1). <sup>s12</sup>

13. **A submitted review on a form with an item kept from the author**

    Given: on a scratch journal with "Minimum Confirmed Reviews Required"
    at 1 and an active form "Method check" of two items, "Is the method
    sound?" ("Radio buttons (you can only choose one)", "Yes" / "No") with
    "Included in message to author" ticked and "Other remarks" ("Extended
    text box") with it unticked, a Reviewer with an accepted request
    carrying the form on a submission in review, and a Journal Manager.

    - **The form's row before the review**: Journal Manager: on "Review
      Forms", "Method check" reads "In Review" 1 and "Completed" 0
      (Rule 12).
    - **The Reviewer's step 3**: Reviewer: open the request and go on to
      step 3: it shows "Method check", "Is the method sound?" with its two
      radio buttons and "Other remarks" with a text box instead of the two
      free-text boxes; choose "Yes", type "The sample is small." in "Other
      remarks", on a journal pick "Accept Submission" under
      "Recommendation", press "Submit Review" and confirm "Are you sure you
      want to submit this review?" (Rules 15, 17).
    - **The form's row after the review**: Journal Manager: "Method check"
      now reads "In Review" 0 and "Completed" 1 (Rule 12).
    - **The round status**: on the submission's review stage the round
      status opens with "Minimum number of confirmed reviews required: 1."
      (Rule 8).
    - **"Read Review"**: the Reviewer's row reads "Review Submitted"; press
      "Read Review": the window shows both items with their answers, "Is
      the method sound?" with "Yes" and "Other remarks" with "The sample is
      small.": the editor reads the review in full, whatever the item's box
      (Rule 15).
    - **"Mark as Complete"**: press it in the window and confirm: the round
      status keeps its first line and the round's own line under it reads
      "Minimum required number of reviews have been confirmed. A decision
      is needed." (Rule 8).
    - **Control**: with the review submitted but not yet marked complete,
      the line under "Minimum number of confirmed reviews required: 1." did
      not read "Minimum required number of reviews have been confirmed. A
      decision is needed.": a submitted or viewed review does not count as
      confirmed (Rule 8). <sup>s13</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - an unsaved "Setup" edit staying through "Submission" and back to
    "Review", and a reload then dropping it (Rule 2)
  - the guard for A11 {OJS} (Rule 18; issue report
    `docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md`): a
    changed "Review Recommendations" closed with "Close", then "Edit"
    and "Save", the row keeping its title from before the change
  - the guard for OMP3 (issue report
    `docs/issues/U29-OMP3-press-internal-guidelines-no-list-buttons.md`): on
    a press, Settings › Workflow › "Review" › "Reviewer Guidance" shows the
    same toolbar (with Blockquote, Bullet list and Numbered list) on
    "Internal Review Guidelines" as on "External Review Guidelines" and
    "Competing Interests".
  - the guard for A5 (issue report
    `docs/issues/U29-A5-review-form-item-text-type-drops-options.md`): a
    review form item with "Response Options" switched from a choice type to
    a text type raises the confirmation, and "Cancel" keeps the type and its
    options.
  - the guard for A9 (issue report
    `docs/issues/U29-A9-edit-review-drops-deactivated-form.md`): a form a
    request carries deactivated, then "OK" in the reviewer row's "Edit"
    window with nothing changed: the window lists the carried form selected,
    and the request and the reviewer's step 3 keep it.
  - "Add Recommendation" closed with "Close" after typing in "Review
    Recommendations" {OJS}: no question, no notice, and the table keeping
    its rows, also after a reload (Rule 17)
- **Rarely met**:
  - ordering the forms and a form's items with "Order", "Done" and "Cancel
    ordering", and the editors' "Review Form" lists following the order
    (Rules 12d, 14): scenario 6 builds one form and scenario 7's second row
    is a copy with the same title, so no scenario holds two forms it can
    tell apart
- **Nothing new to test**:
  - a reload after pressing "Review" alone keeping "Review" › "Setup"
    open (Rule 1a): every scenario that reloads opens "Review" again
  - coming back to "Review" from "Submission" showing the side tab last
    open, and a reload then opening "Setup" (Rule 1b)
  - the Editor and the Site Administrator opening the screen (Actors row
    1): the same "Settings" group and offer scenario 1's Journal Manager
    uses
  - the Reader's typed address (Actors row 1): the page scenario 12's four
    roles land on, with no sidebar to look at first
  - "Review Due Date" preset from "Default Completion Deadline" (Rule 7):
    the way scenario 1 reads "Response Due Date"
  - an emptied "Minimum Confirmed Reviews Required" coming back "0"
    (Fields)
  - step 3's "Reviewer Guidelines" block and its "Review Guidelines" window
    (Rule 10): the text scenario 4 reads on step 2
  - "Cancel" on the activate or deactivate "Confirm" window leaving the
    tick as it was (Rule 12a)
  - saving on the "Edit" window's "Review Form" tab closing it with the
    notice (Rule 13): the notice scenario 6 reads on the create
  - the "Single word text box", "Checkboxes (you can choose one or more)"
    and "Drop-down box" item types (Rule 14): scenario 6's radio buttons
    keep "Response Options" and its text boxes show a box the same way
  - "Edit Recommendation" on an unused entry, prefilled, and the six
    starting entries editing and deleting alike {OJS} (Rule 18): the
    "Delete" scenario 10 presses on an unused custom entry
  - "Recommendation type" shown nowhere after the save (Fields)
- **Register carries it**:
  - A1 (an "After Due Date" reminder never sent without an earlier
    reminder; Rule 9d)
  - A2 (the "Active" tick still toggling on a form in use; Rule 12;
    scenario 7 marks it)
  - A3 (a deadline saved as 0 or empty presetting three and four weeks;
    Rule 7)
  - A4 (a reload on a "Review" side tab landing on "Submission" ›
    "Disable Submissions"; Rule 1a)
  - A5 (a text-type save dropping "Response Options" without the warning;
    Rule 14)
  - A6 (a deactivated recommendation reading "-" in the "Reviewer
    Recommendation" section; Rule 18; scenario 10 marks it)
  - A7 (the "Reviewer Recommendations" table and the reviewer's list in
    no fixed order; Rule 17; scenario 9 marks it)
  - A8 (a declined request counting in neither column; Rule 12)
  - A9 (the reviewer row's "Edit" window detaching a deactivated form;
    Rule 12a)
  - A11 ("Edit Recommendation" closed with "Close" leaving the
    unsaved title on the row for the next "Save" to store; Rule 18)
  - A12 (the "Activate" tick boxes and the "Active Upon Saving" list
    without a name for a screen reader; Fields "Reviewer Recommendations")
  - OMP3 (the "Internal Review Guidelines" toolbar without quote and list
    buttons; Fields)
- **No seed**:
  - the automatic reminder email, the "Reminder" date and the activity-log
    row (Rule 9; Side effects): the test installs' daily clock is off
    (Settings)
  - a second form language's switch and twin boxes (Rule 16; Settings)
- **Owned by another feature**:
  - a reload keeping a pressed side tab of "Submission" (Rule 1a;
    *Submission intake configuration*, scenarios 3 and 5)
  - "Restrict File Access" on: the files only after accepting (Rule 5;
    *Reviewer's review*, scenario 9)
  - "One-click Reviewer Access" on: the sign-in-free link in the request
    and reminder emails (Rule 5; *Reviewer's review*, scenario 10)
  - "Reviewer Suggestion at Submission" on: the wizard's "Reviewer
    Suggestions" step and the editors' view of the suggestions (Rule 6;
    *Submission wizard*, scenario 13; *Reviewer suggestions*)
  - the guidelines left empty, "This publisher has not set any reviewer
    guidelines." on step 2, and "Competing Interests" left empty, no block
    on step 1 (Rule 10; *Reviewer's review*, scenarios 2 and 13)
  - a press's Internal Reviewer reading the internal text and its External
    Reviewer the external [OMP2](#omp2) (Rule 10; *Reviewer's review*)
  - the upload window's "How to ensure all files are anonymized" link with
    the box on (Rule 11; *Submission files*)
  - a journal section's "Review Form" list and its default form preselected
    in Add Reviewer (Rule 12; Settings; *Sections*)
  - a required item stopping "Submit Review" on the wizard's step 3
    (Rule 15; *Reviewer's review*, scenario 8)
  - the reviews an editor copies into a decision email, the unticked item
    left out (Rule 15; *Editorial decision recording*)
  - the author's own reading of an open review, the unticked item left out
    (Rule 15; *Review stage & rounds*, scenario 12)
  - a manager-level role whose settings access is switched off losing the
    screen (Settings; *Roles configuration*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-06), unreviewed unless
an entry notes otherwise; the team settles them on spec review. The summary
is sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact
and Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | Reviewers get no "After Due Date" reminder unless an earlier reminder was sent | 🐞 | high | issues (claude), 2026-10-04 — re-verified |
| [A5](#a5) | Switching a review form item to a text box deletes its answer options on Save, with no warning | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [OMP3](#omp3) | A press's "Internal Review Guidelines" box has no list or quote buttons, unlike the external one | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A9](#a9) | Saving a reviewer's "Edit" window silently takes a deactivated review form off the review | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A11](#a11) | A recommendation title abandoned in "Edit Recommendation" stays on the row and is stored by the next "Save" | 🐞 | medium | — |
| [A12](#a12) | On "Reviewer Recommendations", a screen reader announces each row's "Activate" tick box, and the window's "Active Upon Saving" list, without a name | 🐞 | minor | — |
| [A2](#a2) | A form in use can still be deactivated, although the activation confirmation promises it cannot | ❓ | minor | — |
| [A3](#a3) | A deadline saved as 0 or left empty makes Add Reviewer preset three weeks for the response but four for the review | ❓ | minor | — |
| [A4](#a4) | A reload on a "Review" side tab lands on "Submission" › "Disable Submissions", although the address names the side tab and a pressed "Submission" side tab survives a reload | ❓ | minor | — |
| [A6](#a6) | A recommendation deactivated after a reviewer chose it reads "-" in the "Reviewer Recommendation" section of the editor's "Read Review" window while the window's own "Recommendation:" line still names it | ❓ | user-visible | — |
| [A7](#a7) | The "Reviewer Recommendations" table and the reviewer's list have no fixed order: a new entry is not always last, and an edited or ticked row sometimes stays put and sometimes drops to the bottom | ❓ | minor | — |
| [A8](#a8) | A form whose only requests were declined reads 0 / 0 and offers "Edit" and "Delete" like a fresh one; deleting it drops it from the declined request | ❓ | minor | — |
| [A10](#a10) | After a refused "Setup" save, what gives back the greyed-out "Save" is not known | ❓ | minor | — |
| [OMP1](#omp1) | A press has no "Reviewer Recommendations" tab | ✅ | — | — |
| [OMP2](#omp2) | A press words five strings differently and has a guideline box per review stage | ✅ | — | — |

### All apps

<a id="a1"></a>
**A1 — Reviewers get no "After Due Date" reminder unless an earlier reminder was sent** · 🐞 · high.
A journal or press that sets "Review Request Response - After Due Date"
or "Review Submission - After Due Date" expects a reminder to go out
when a reviewer has not responded, or has not submitted, by the due
date. No such reminder is ever sent to a reviewer who was not already
reminded before the due date. Settings keeps showing "1 days after due
date", and nobody is told that nothing went out. So with the two "Before
Due Date" sliders at "No reminder set", the automatic reminders stop
completely. Every journal and press that used reminders in 3.4 is in
that state after upgrading to 3.5 or later, and so is a new install
whose manager sets only the "After Due Date" sliders. Setting a "Before
Due Date" reminder too, or reminding reviewers by hand before the due
date, gets round it.
Since: 2024-08-30 (two years) · Basis: probe, 2026-10-04. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Deactivating a form in use** · ❓ · minor.
Ticking "Active" warns "Once it's assigned to a review you will no longer
be able to deactivate it.", yet the tick on a form in use still toggles and
the deactivation goes through with "Your changes have been saved."; the
reviewers who carry the form keep it on their wizard's step 3, and only new
requests lose the option (with no other active form, Add Reviewer loses
its "Review Form" list). Question: is the deactivation of a form in use
intended (the warning is wrong) or should the tick be locked (the code is
wrong)? Lean: intended, since nothing breaks for the assignments that
carry it, and the warning text should change. Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Zero weeks means three for one deadline and four for the other** · ❓ · minor.
"Default Response Deadline" and "Default Completion Deadline" both accept 0
and both accept an emptied box (saved blank). Add Reviewer then presets the
response due date three weeks out and the review due date four weeks out,
while the settings screen shows 0 or nothing and says nothing about a
fallback. Question: should 0 and empty be refused, or should the fallbacks
be shown? Lean: refuse them with a message that the box must be at least
1, since no reviewer can answer in zero weeks. Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — A reload on a "Review" side tab lands on "Submission" › "Disable Submissions"** · ❓ · minor.
Pressing any side tab of "Review" changes the page address, as a side
tab of "Submission" does. A reload right after pressing a "Submission"
side tab keeps it open, but a reload right after pressing a "Review" side
tab lands on "Submission" › "Disable Submissions". The side tab is not lost: after the reload, pressing
"Review" opens the side tab that was open. A manager who reloads after a
save has to press "Review" again to get back to it. Question: is a
"Review" side tab meant to survive a reload? Lean: yes, and this is a
defect, since the address names the side tab and a "Submission" side tab
comes back from the same kind of address. Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — Switching a review form item to a text box deletes its answer options on Save, with no warning** · 🐞 · medium.
A manager edits a review form item that offers answers to choose from
(radio buttons, checkboxes or a drop-down) and changes its "Item type"
to a text box. No warning appears, and the "Response Options" stay
listed with "Add Item" as if they were kept. "Save" reports "Your
changes have been saved." and deletes every option. The loss shows when
the manager switches the item back to a choice type, after catching a
wrong type later or while trying types out: "Response Options" reads "No
Items" and every option has to be typed again, in each of the form's
languages. The app has a text key for a warning about this change, but
nothing ever shows it. Basis: probe, 2026-10-04. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A deactivated recommendation reads "-" in the editor's window** · ❓ · user-visible.
When a recommendation is deactivated after a reviewer submitted a review
with it, the Reviewers table still prints it under the reviewer's status
and the editor's "Read Review" window still lists "Recommendation:
{title}" among its lines at the top, but the window's "Reviewer
Recommendation" section prints "-"; reactivating the entry makes the
section print the title again. The window contradicts itself: the editor
reads the recommendation at the top and none in the section meant for it.
Question: should the window show a recommendation whose entry is inactive?
Lean: yes, and this is a defect, since the review carries it and the table
and the window's own line show it. Basis: probe.
<sup>f-a6</sup>

<a id="a7"></a>
**A7 — Recommendation order is not fixed** · ❓ · minor.
The "Reviewer Recommendations" table and the reviewer's "Recommendation"
list have no fixed order. A new entry usually shows last, but not always:
the table has listed a just-saved entry first. After an edit or a tick
the changed row sometimes stays where it is and sometimes drops to the
bottom, and the same steps give either on different runs; there is no
control to order the list. Question: should the table and the reviewer's
list have a fixed order (creation order, or one the manager sets)? Lean: yes, and this is a defect, since a manager cannot
rely on where a row will be after a tick. Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — Declined requests do not count as use** · ❓ · minor.
"In Review" and "Completed" skip declined requests, so a form whose only
requests were declined reads 0 / 0 and offers "Edit", "Copy", "Preview"
and "Delete" like a fresh one. Deleting it drops the form from the
declined request: its "Edit" window then shows "None / Free Form Review".
Question: intended? Lean: intended; a declined request holds no answers,
so nothing is lost. Basis: probe. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — Saving a reviewer's "Edit" window silently takes a deactivated review form off the review** · 🐞 · medium.
A journal or press deactivates a review form while a review request
still carries it. Deactivating promises only that the form "will no
longer be available for new review assignments". But when an editor then
opens that reviewer's "More Actions" › "Edit" window, its "Review Form"
list leaves the form out and shows "None / Free Form Review" selected.
Pressing "OK", even with nothing changed, takes the form off the review,
silently. The reviewer's "3. Download & Review" step then shows the
free-text boxes instead of the form's questions, and the answers already
saved there disappear from it. The answers come back if the form is
attached again while it still exists: a manager activates it again and
the editor attaches it again in the same window. But the form now reads
0 under "In Review" and "Completed" and offers "Delete", as for a form
no one uses. Deleting it, which that count invites, removes the
reviewer's saved answers for good. It needs a form deactivated while a
request carrying it is still open. That is how a journal revises a form
in use: a form in use cannot be edited, so the journal copies it, edits
the copy and deactivates the old one. Any later "OK" in the window, such
as one to move a due date, then detaches the old form. Basis: probe,
2026-10-04. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — What gives "Save" back after a refused save** · ❓ · minor.
After a refused save on "Setup", "Save" is greyed out, and what makes it
pressable again was not tried. Question: should correcting every refused
box give "Save" back? Lean: yes, as the "Reviewer Recommendations" window does.
Basis: probe. <sup>d</sup>

<a id="a11"></a>
**A11 — A recommendation title abandoned in "Edit Recommendation" stays on the row and is stored by the next "Save"** · 🐞 · medium.
A Journal Manager changes "Review Recommendations" in "Edit
Recommendation", then closes the window with "Close", not "Save", and
expects the change dropped. Instead the row shows the
changed title ("Accept Submission" with " Draft" added reads "Accept
Submission Draft"), and "Edit" reopens with it in the box; a "Save"
there, even with nothing else changed, stores the title the manager had
abandoned.
The same fault as [Institutions' A2](U66-institutions.md#a2).
Since: 2026-09-24 (a week) · Basis: probe, 2026-09-30. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — On "Reviewer Recommendations", a screen reader announces each row's "Activate" tick box, and the window's "Active Upon Saving" list, without a name** · 🐞 · minor.
No row's "Activate" tick box has a label, so a screen reader announces
"checkbox" and its state with nothing more, for the Journal Manager and
the Site Administrator alike. A manager who cannot see the screen can
tell which recommendation a box switches only from the row's name, read
just before the box. The list under "Recommendation type" in the "Add
Recommendation" window ("Active Upon Saving" / "Deactivate") has no name
either, so nothing says what it decides. Both controls work from the
keyboard: Space on a ticked box opens "Deactivate Reviewer
Recommendation", as a click does. The same mistake as the DOIs page's
row tick boxes ([DOIs' A8](U45-dois.md#a8)).
Basis: probe, 2026-10-05. <sup>f-a12</sup>

### OMP

<a id="omp1"></a>
**OMP1 — No "Reviewer Recommendations" tab on a press** · ✅ · —.
A press's "Review" tab has "Setup", "Reviewer Guidance" and "Review Forms"
only. A press collects no reviewer recommendation (the reviewer's wizard on
a press has no "Recommendation" list), so there is nothing to configure.
Basis: probe. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — Press wording and the second guideline box** · ✅ · —.
On a press, the library tab reads "Press Library" (journal: "Publisher
Library"), "Restrict File Access" reads "Reviewers will have access to the
submission file only after agreeing to review it.", the completion
deadline's help reads "Weeks allowed for review completion", the "Review
Response Overdue (Automated)" email's subject reads "Manuscript Review
Request" (journal: "Will you be able to review this for us?"), and
"Reviewer Guidance" shows "Internal Review Guidelines" above "External
Review Guidelines" instead of a single "Review Guidelines"; the internal
text goes to Internal Reviewers, the external one to External Reviewers,
and the one "Competing Interests" text to both. Basis: probe.
<sup>f-omp2</sup>

<a id="omp3"></a>
**OMP3 — A press's "Internal Review Guidelines" box has no list or quote buttons, unlike the external one** · 🐞 · low.
On a press, a list or quote can be typed into "External Review
Guidelines" but not into "Internal Review Guidelines". On Settings ›
Workflow › "Review" › "Reviewer Guidance", the internal box's toolbar
offers Bold, Italic, Superscript, Subscript and Insert/edit link only,
while "External Review Guidelines" and "Competing Interests" on the same
form also offer Blockquote, Bullet list and Numbered list. A manager
cannot make a list or a quote in the internal guidelines on screen;
pasting a list from another document works round it. Basis: probe,
2026-10-04. <sup>f-omp3</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — The screen is `lib/pkp/templates/management/workflow.tpl`, rendered
by `ManagementHandler::workflow()` (lib/pkp `pages/management/`) and the
app's `SettingsHandler::workflow()`; the "Review" tab is wrapped in
`{if $hasReviewStage}`, computed by `ManagementHandler::hasReviewStage()`
from `Application::getApplicationStages()` (OJS: submission, external
review, editing, production; OMP adds internal review; OPS: production
only; since pkp/pkp-lib#13109 (ojs `3bfe1f9f68` / omp `5d2b2fea7` / ops
`16bbd9b90e`, 2026-09-08) each list ended with done,
`WORKFLOW_STAGE_ID_DONE`, which is no review stage, so the test's outcome
was unchanged in every app; since pkp/pkp-lib#13312 (ojs `0dbb274a45` / omp
`ce63a5cd8` / ops `97d8a0d2e8`, lib/pkp `65901c4f7a`, 2026-09-12) done is out
of the lists again, kept in `PKPApplication::getValidStages()` for the
stage-access policy alone, the outcome unchanged either way). Side tabs: `reviewSetup` (`PKPReviewSetupForm::FORM_REVIEW_SETUP`),
`reviewerGuidance` (`PKPReviewGuidanceForm::FORM_REVIEW_GUIDANCE`),
`reviewForms` (`ReviewFormGridHandler` fetched into
`reviewFormGridContainer`) and, under `{if $hasCustomizableRecommendation}`,
`reviewerRecommendations` (`<reviewer-recommendation-manager>`). Both Vue
forms PUT to the context API (`contexts/{id}`, the app's
`ContextController`) and are validated by the context schema
(`lib/pkp/schemas/context.json`, the app's `schemas/context.json` on top).
Labels: `manager.workflow.title` "Workflow Settings",
`manager.publication.reviewStage` "Review", `navigation.setup` "Setup",
`manager.publication.reviewerGuidance` "Reviewer Guidance",
`manager.reviewForms` "Review Forms", `manager.reviewerRecommendations`
"Reviewer Recommendations" (OJS `locale/en/manager.po`); the library tab is
`manager.publication.library` as each app's locale renders it ("Publisher
Library", "Press Library", "Preprint Server Library"), the last tab
`manager.template.tasksAndDiscussions` "Tasks and Discussions". Live-probed
2026-09-05 (Rule 1; OJS and OMP, `manager.maya` and a scratch manager):
heading, tab and side-tab names as quoted. The address: pressing "Review"
writes `#review`, a side tab writes a one-part hash (`#reviewSetup`,
`#reviewerGuidance`, …) that replaces it; a reload on `#reviewSetup` lands
on "Submission" › "Disable Submissions" on both apps (finding A4). A typed
`#review/<sideTab>` (e.g. `#review/reviewerGuidance`) opens that side tab
directly, but the address is rewritten to the one-part
`#reviewerGuidance` on landing, so a reload of it falls back as well; a
typed `#submission/metadata` is rewritten to `#metadata`, which a reload
keeps. Pressing "Review" alone writes `#review`, which a reload keeps
("Review" › "Setup"); pressing "Submission" and then "Review" again writes
`#review` whatever side tab shows (Rule 1b). The tabs are
`<tabs :track-history="true">` wrappers. Live-probed 2026-09-28 (Rules 1a,
1b; A4) on OJS, OMP and OPS, two runs each, scratch contexts: the typed
`#review/reviewerGuidance` and `#review/reviewForms` (OJS, OMP) and
`#submission/metadata` and `#submission/components` (all three apps)
behaved as described; `#review` and `#submission` survived a reload.

<a id="fn-b"></a>
**b** — OPS: `ops classes/core/Application.php::getApplicationStages()`
returns production only (production and done from pkp/pkp-lib#13109, ops
`16bbd9b90e`, 2026-09-08, until pkp/pkp-lib#13312, ops `97d8a0d2e8`,
2026-09-12, production only again since), neither a review stage, so `$hasReviewStage` is
false and the template skips the whole tab; `ops pages/management/SettingsHandler.php::workflow()`
adds nothing review-related. OMP: `omp classes/core/Application.php::
hasCustomizableReviewerRecommendation()` returns false (OJS true, OPS
false), which hides the recommendations tab; `omp
classes/components/forms/context/ReviewGuidanceForm.php` adds the
`internalReviewGuidelines` box before `reviewGuidelines`, whose label the
OMP locale overrides to "External Review Guidelines"
(`manager.setup.reviewGuidelines` in `omp locale/en/manager.po`; OJS
"Review Guidelines"). The OPS tab names quoted in the absence paragraph are
the template's remaining tabs (`manager.publication.submissionStage`,
`manager.publication.library`, `manager.publication.emails`,
`manager.template.tasksAndDiscussions`). Live-probed 2026-09-06 (absence
paragraph, OMP1, OMP2, scenario 11): OPS `manager.maya` sees "Submission",
"Preprint Server Library", "Emails", "Tasks and Discussions" and no
"Review"; the seeded journal and press show "Review" second; the press's
"Review" has three side tabs and the word "Recommendation" appears nowhere
on it.

<a id="fn-c"></a>
**c** — Access: the settings page is `ManagementHandler` with
`CanAccessSettingsPolicy` (permit for `ROLE_ID_SITE_ADMIN`, and for
`ROLE_ID_MANAGER` groups whose `permitSettings` flag is set; both seeded
manager-level groups, "Journal manager" and "Journal editor", carry
`permitSettings="true"` in `registry/userGroups.xml`, OJS and OMP alike).
The grids (`ReviewFormGridHandler`, `ReviewFormElementsGridHandler`,
`ReviewFormElementResponseItemListbuilderHandler` through
`SetupListbuilderHandler`) assign their ops to `ROLE_ID_MANAGER` and
`ROLE_ID_SITE_ADMIN` and add the same policy. The forms' PUT goes through
the context API's own manager gate. "Edit" and "Delete" on a form: `
ReviewFormGridRow::initialize()` adds them only when
`getIncompleteCount() == 0 && getCompleteCount() == 0`; the elements grid's
`updateReviewFormElement`/`deleteReviewFormElement` refuse a form that
`ReviewFormDAO::unusedReviewFormExists()` does not report as unused. The
recommendation manager (`ReviewerRecommendationManager.vue`) renders the
row menu only for `item.removable`, and the OJS API
(`api/v1/reviewers/recommendations/ReviewerRecommendationController.php`)
refuses `edit` and `delete` on a non-removable entry with 406. Live-probed
2026-09-06 (Actors rows 1–5; OJS, OMP and OPS, one account per level:
`manager.maya`, `editor.diana`, `admin`, `sectioneditor.ana`,
`assistant.rita`, `reviewer.julia`, `author.alex`, `reader.rosa`): the three
manager-level accounts have the collapsed "Settings" group (expanded: OJS
"Journal", "Website", "Workflow", "Distribution", "Users & Roles"; "Press"
on OMP, "Server" on OPS) and reach the page by the typed address
`{journal}/management/settings/workflow`; the others have no "Settings" in
their sidebar and the typed address redirects to
`{journal}/en/user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`
(final status 200) reading "The current role does not have access to this
operation."; `reader.rosa` lands on `{journal}/en/index` after the
journal's login. On OPS `sectioneditor.ana` (Moderator) is denied the same
way. `editor.diana` and `admin` are offered "Create Review Form" and, on a
scratch context's inactive form, "Edit", "Copy", "Preview", "Delete".

<a id="fn-d"></a>
**d** — `PKPReviewSetupForm` (lib/pkp `classes/components/forms/context/`):
`defaultReviewMode` radio (`manager.setup.reviewOptions.reviewMode`;
options `editor.submissionReview.doubleAnonymous` = 2 "Anonymous
Reviewer/Anonymous Author", `.anonymous` = 1 "Anonymous Reviewer/Disclosed
Author", `.open` = 3 "Open"; schema default 2);
`defaultReviewPublicVisibility` checkbox (`publicReviewerComments.show`,
`.label`, `.description`) whose single option carries `'value' => false`
(finding A3); `restrictReviewerFileAccess` (`.restrictReviewerFileAccess`,
`.description`; the OMP locale overrides the description);
`reviewerAccessKeysEnabled` (`.reviewerAccessKeysEnabled`, `.label`,
`.description`); `reviewerSuggestionEnabled`, added by
`addReviewSuggestionControl()` after the one-click box when the app's
context schema has the property (OJS and OMP do);
`numWeeksPerResponse` (`defaultReviewResponseTime` "Default Response
Deadline", help `numWeeksPerResponse`), `numWeeksPerReview`
(`defaultReviewCompletionTime` "Default Completion Deadline", help
`numWeeksPerReview`, which OJS overrides to "Weeks allowed to complete the
review"; lib/pkp and OMP "Weeks allowed for review completion"),
`numReviewsPerSubmission` ("Minimum Confirmed Reviews Required"), all
`FieldText` size small; schema: integer, `nullable`, `min:0`, defaults 4,
4, 0, so the API's validator answers `validator.integer` "This is not a
valid integer." and `validator.min.numeric` "This must be at least 0.".
The four `FieldSlider`s: min 0, max 14, `minLabel` "None", `valueLabel`
"{$value} days before due date" / "{$value} days after due date",
`valueLabelMin` "No reminder set"; schema integer `min:0` with no default.
Effects: `ReviewerForm::initData()` (lib/pkp
`controllers/grid/users/reviewer/form/`) presets `reviewMethod` from
`defaultReviewMode` (double-anonymous when unset) and
`isReviewPubliclyVisible` from `Context::getDefaultReviewPublicVisibility()`;
`EditorAction::addReviewer()` stores the visibility flag on the assignment;
`reviewerFormFooter.tpl` and the assignment's `editReviewForm.tpl` carry
the box under `manager.setup.reviewOptions.publicReviewerComments.show`.
`reviewerSuggestionEnabled` is read by `PKPSubmissionHandler` (the wizard
step) and `PKPSelectReviewerListPanel` / `PKPDashboardHandler` (the
suggestions panel). Rule 2's refusal shape (`form.errorOne` "Please
correct one error.", `form.errorMany`, `form.errorGoTo` "Go to {label}:
{message}", `form.errorNext` "Jump to next error") is the shared Vue
form's; the page notice is `form.errors` "The form was not saved because
{count} error(s) were encountered. Please correct these errors and try
again." raised on the `400`; the "Saving"/"Saved" text is the form's
`role="status"` footer; live-probed 2026-09-06 (Rule 2, scenario 2; OJS and
OMP): the `form.errorGoTo` buttons sit in a screen-reader-only list
(`ul.-screenReader`) and are never visible, the summary and "Jump to next
error" render at the foot beside "Save" (`.pkpFormErrors`), and the badge
sits directly under the box (label, help, box, badge). The email "Your
review assignment has been changed for {journal}", sent when the editor
changes an assignment's dates, links the plain
`reviewer/submission?submissionId=…` address with no key; only requests and
reminders carry the one-click `invitation/accept?id=N&key=…` link
(live-probed 2026-09-06, Rule 5; OJS and OMP). Live-probed 2026-09-05
(Rules 2, 3, 4, 6, 8; Fields "Setup"; OJS and OMP, `manager.maya` read-only on the seeded contexts and a
scratch manager on scratch contexts): every label, help text, option and
default as quoted; `abc`, `-1` and `2.5` refused in both number boxes with
the strings quoted and a `400`, the "Open" radio chosen in the same edit
not saved; an emptied deadline saved blank, an emptied minimum saved as
"0"; a successful save answered `200` with no page notice and "Saved" gone
after 5 s; a side-tab switch with edits kept them (no dialog recorded), a
reload showed the saved values (no `beforeunload` prompt). Finding A3 of
the draft (the public-visibility tick) did not hold: the tick survived
"Save" and a reload on both apps, Add Reviewer's box arrived ticked, and
the earlier request's "Edit Review" window kept its unticked box. "Minimum
Confirmed Reviews Required" 1 printed "Minimum number of confirmed reviews
required: 1." above "Awaiting responses from reviewers." (the accepted
state) and 0 removed the line; live-probed 2026-09-06 (Rule 8; OJS and
OMP): the first line stayed after the review was submitted ("New reviews
have been submitted." under it) and after "Read Review", and after Read
Review › "Mark as Complete" › "Mark this review as complete?" › "Mark as
Complete" the second line read "Minimum required number of reviews have
been confirmed. A decision is needed." with the row at "Complete". The
suggestion box added the wizard step "5 Reviewer Suggestions" before "6
Review" on both apps; with the box on and no suggestion entered, nothing
on the review stage or in Add Reviewer mentions suggestions (2026-09-06),
and the editors' side with a suggestion entered was not driven here. When
"Save" is re-enabled after a refusal was not driven. Live-probed
2026-09-30 (Rule 2; OJS and OMP, two runs, a scratch Journal Manager, a
scratch Editor and `admin` on scratch contexts): "Default Response
Deadline" 4 typed over as 7 still read 7 after "Reviewer Guidance" and
back and after "Submission" › "Review" (address `#review`, "Setup"
shown), and a reload showed 4; no browser dialog at any step.

<a id="fn-e"></a>
**e** — `PKPReviewGuidanceForm`: `reviewGuidelines` and
`competingInterests` are multilingual `FieldRichTextarea`s (toolbar bold,
italic, super/subscript, link, blockquote, lists); `showEnsuringLink` is a
`FieldShowEnsuringLink` (extends `FieldOptions`; option label
`manager.setup.reviewOptions.showAnonymousReviewLink`, whose `<button>` the
Vue field turns into the dialog `review.anonymousPeerReview.title` "How to
ensure all files are anonymized" with the body `review.anonymousPeerReview`
and "OK"). Effects: the reviewer wizard's step 2 and step 3 link
(`PKPReviewerReviewStep2Form`, `step3.tpl`) and the step-1 competing
interests section (`PKPReviewerReviewStep1Form`), owned by the
reviewer's-review spec; the upload window's link:
`PKPSubmissionFilesUploadBaseForm::fetch()` adds the `ensuringLink`
`LinkAction` (a `ConfirmationModal` with the same title and text) when
`showEnsuringLink` is on and the stage is submission, internal review or
external review. Form languages: `ManagementHandler::getSupportedFormLocales()`
feeds the forms' `locales`; the seeded and scratch contexts have `en` as
their only form locale (seed-facts.md). Live-probed 2026-09-06 (Rule 16,
Fields "Reviewer Guidance"; OJS and OMP, a scratch context with French
ticked under "Forms" in Settings › Website › Setup › Languages): the form
gained the "French"/"English" switch at its top and no box gained a tab,
each box read "0/2 languages completed" while empty, "French" revealed
"Review Guidelines in French" (OMP "Internal Review Guidelines in French",
…) under the English box, "Setup" gained no language control, and the
French guidance reached a reviewer reading the wizard in French; the
French "Forms" box was unticked on the fresh scratch context, so the
one-language premise holds. Live-probed 2026-09-05 (Rules 10,
11; Fields "Reviewer Guidance"; OJS and OMP, scratch contexts with a
throwaway manager, an external reviewer and, on OMP, an internal reviewer;
a second untouched context as the control): box labels and order as
quoted, no help text; the words are a `<button>` inside the label and the
window's only control is the header "Close"; the typed guidance and policy
reached the reviewer's steps 1, 2 and 3 with the strings quoted in Rule
10, the control context showed none of them; the upload windows of the
Submission and Review stages ("Upload Submission File", "Upload Review
File") carried the link only with the box on, opening the same text with
"OK" and "Cancel"; on OMP the internal box reached the internal round's
reviewer and the external box the external round's.

<a id="fn-f"></a>
**f** — Grid: `ReviewFormGridHandler` (lib/pkp
`controllers/grid/settings/reviewForms/`): title `manager.reviewForms`,
action `createReviewForm` ("Create Review Form", `AjaxModal`), columns
`name` ("Title"), `inReview` ("In Review", `getIncompleteCount()`),
`completed` ("Completed", `getCompleteCount()`), `active`
(`selectStatusCell.tpl`, a checkbox whose click runs the
`activateReviewForm`/`deactivateReviewForm` `RemoteActionConfirmationModal`
with `manager.reviewForms.confirmActivate` / `confirmDeactivate`);
`initFeatures()` adds `OrderGridItemsFeature` ("Order",
`grid.action.order`; finish controls `common.done` "Done" and
`grid.action.cancelOrdering` "Cancel ordering"); rows ordered by `seq`
(`ReviewFormDAO::getByAssocId()`, `getActiveByAssocId()` `ORDER BY rf.seq`).
The counts: `ReviewFormDAO` sub-selects on `review_assignments` with
`declined <> 1`, split on `date_completed`. Row actions
(`ReviewFormGridRow`): `edit` and `delete` under `$canEdit` (both counts
0), `copy` (`manager.reviewForms.confirmCopy`), `preview` (the edit op with
`preview=1`). `editReviewForm()` renders
`controllers/grid/settings/reviewForms/editReviewForm.tpl`: tabs
`manager.reviewForms.edit` "Review Form", `manager.reviewFormElements` "Form
Items", `manager.reviewForms.preview` "Preview Form"; `{if !$canEdit}
disabled: [0, 1]{/if}` and `selected: {if $preview}2{else}0{/if}`.
`ReviewFormForm` (`manager/reviewForms/reviewFormForm.tpl`): `title`
required (`FormValidatorLocale`, `manager.reviewForms.form.titleRequired`),
`description` rich, both multilingual; a new form gets `active = 0` and
`REALLY_BIG_NUMBER` then resequenced. `copyReviewForm()` inserts the form
inactive at the end and copies every element; `deleteReviewForm()` requires
both counts 0 (and clears `reviewFormId` on any assignment, moot by then);
`deactivateReviewForm()` checks only `getActive()` (finding A2). Every
mutating op ends in `NotificationManager::createTrivialNotification()`
("Your changes have been saved.") and a `DataChangedEvent` that redraws
the grid; the ordering feature's `saveSequence` raises no notification. Items: `ReviewFormElementsGridHandler`
(title "Form Items", action `createReviewFormElement` "Create New Item",
column `question` "Item" capped at 220 characters of text, ordering
feature); `ReviewFormElementGridRow` adds `edit` and `delete`
(`manager.reviewFormElements.confirmDelete`); `ReviewFormElementForm`
(`manager/reviewForms/reviewFormElementForm.tpl`): `question` required
(`questionRequired`), `description`, `required`, `included` (default 1 on a
new item), `elementType` required (`elementTypeRequired`; options
`ReviewFormElement::getReviewFormElementTypeOptions()`: 1 "Single word text
box", 2 "Single line text box", 3 "Extended text box", 4 "Checkboxes (you
can choose one or more)", 5 "Radio buttons (you can only choose one)", 6
"Drop-down box"), the listbuilder
`ReviewFormElementResponseItemListbuilderHandler` (title
`grid.reviewFormElement.responseItems` "Response Options", column
`manager.reviewFormElements.possibleResponse` "Selection", "Add Item")
enabled by `togglePossibleResponses()` for the three multiple-response
types, with the `alert()` `manager.reviewFormElement.changeType`; on save a
non-choice type stores `possibleResponses = null`. Preview:
`PreviewReviewForm` renders `manager/reviewForms/previewReviewForm.tpl`
(title, description, then `reviewer/review/reviewFormResponse.tpl`, the
same template the wizard's step 3 uses; a required item gets the section's
required mark). OMP still ships an unused legacy
`templates/controllers/grid/settings/reviewForm/previewReviewForm.tpl`
(mock inputs per type) that nothing renders. Effects of `included`:
`PKPReviewController::getReviewFormResponses()` `authorFriendly`,
`reviewDownload.tpl` `authorFriendly`, and the decision email's
`ReviewerComments` mail trait skip elements with `getIncluded()` false;
`required` is enforced by `ReviewFormElementDAO::getRequiredReviewFormElementIds()`
in the wizard's step 3. Live-probed 2026-09-05 (Rules 12–15; Fields "Review
Forms"; OJS and OMP, scratch contexts with a throwaway manager, and
submissions in review with an accepted and a declined reviewer where the
counts were read): the empty list and the empty items list both read the
generic "No Items" (`grid.noItems`), never the locale's own empty strings;
the windows are headed "Create Review Form", "Edit" (form and item alike),
"Preview", "Create New Item"; every save and every confirmed action showed the page notice "Your
changes have been saved." (`common.changesSaved`) and the form window
closed on its own save; the confirmations are page windows headed
"Confirm" with "OK" / "Cancel"; a copy kept the title verbatim and the
items in the source's current order; ordering's "Done" showed no notice;
the counts read 1 / 0 with one accepted and one declined assignment and
0 / 1 after the review was submitted; the in-use row offered "Copy",
"Preview" only, its "Preview" window opened on "Preview Form" with the two
other tabs `ui-state-disabled` and inert; the item with `included` off was
absent from the author's "Review: {title}" window and present in the
editor's "Review Details: {title}" window with its "Download Review Form"
button; a journal section's "Edit" window listed the active form only and
its choice preselected the form in Add Reviewer, while a press series
window has no "Review Form" list. Add Reviewer showed no "Review Form"
`select` at all while no form was active (`ReviewerForm::fetch()` renders
the list only with active forms). The listbuilder's "Add Item" is a plain
link never disabled, the `select` carries no `onchange`, so
`togglePossibleResponses()` and its `alert()` never run (finding A5); no
column header row is rendered. In the preview, "Single word text box" and
"Single line text box" are both `<input type="text">`; the required mark
is `<span class="req">*</span>` after the question and the description a
paragraph before the control. Live-probed 2026-09-06 (Fields "Review
Forms", Rules 12, 14, 15, 16; OJS and OMP): "Order" is present but hidden
on the empty and the one-row forms list and on the empty items list, and
appears with the second form (an items list with exactly one item was not
observed); the empty "Title" and the unchosen "Item type" are refused in
the browser with "This field is required." (`form.required`), so
`titleRequired` and `elementTypeRequired` are never reached through the
screen, while an empty "Item" with a type chosen reaches the server's
`questionRequired` notice "A question is required for the form item.
(English)" with nothing under the box (whether that notice is the page bar
or sits inside the window was not settled: it was gone four seconds
later); a completed review's "Edit" window had no "Review Form" list with
an active form present, while a review in progress had the list with its
own form selected; the required item let "Submit Review" and its "Are you
sure you want to submit this review?" confirmation run, then step 3 stayed
with "This field is required." under the item; with French ticked under
"Forms", "Title" and a "Response Options" row gained a "(French)" twin
(`title[fr_CA]`, `newRowId[possibleResponse][fr_CA]`) and each rich-text box a
"French" editor, hidden until the English box was focused, the toolbar's
globe icon revealing nothing, and a reviewer reading the wizard in French
saw the French item text with the untranslated title, description, items
and options in English.

<a id="fn-g"></a>
**g** — OJS only. `ojs pages/management/SettingsHandler::
addReviewFormWorkflowSupport()` builds `ReviewerRecommendationsListPanel`
(`ojs classes/components/listPanels/`) with the entries of
`ReviewerRecommendation::query()->withContextId()`, and assigns
`hasCustomizableRecommendation`. The Vue manager
`lib/ui-library/src/managers/ReviewerRecommendationManager/
ReviewerRecommendationManager.vue` with `reviewerRecommendationManagerStore.js`
and `ReviewerRecommendationsEditModal.vue`: button
`grid.action.addReviewerRecommendation` "Add Recommendation"; columns
`manager.reviewerRecommendations.list.name.title` "Recommendations" and
`.list.status.title` "Activate"; the row checkbox is `:checked="item.status"`
with a `click.prevent` that opens the dialog
(`manager.reviewerRecommendations.activate.title` / `deactivate.title`,
messages `confirmActivate` / `confirmDeactivate`, `common.yes` /
`common.no`) and then `PUT reviewers/recommendations/{id}/status`;
`DropdownActions` (label `common.moreActions` "More Actions") only
`v-if="item.removable"`, with `common.edit` and `common.delete` (the delete
dialog: `grid.action.deleteReviewerRecommendation` "Delete Recommendation",
`manager.reviewerRecommendations.confirmDelete`); add/edit open the side
modal titled "Add Recommendation" / `grid.action.editReviewerRecommendation`
"Edit Recommendation" over `ReviewerRecommendationForm`
(`ojs classes/components/forms/context/`): `title` required multilingual
(`manager.reviewerRecommendations.title.label`, help `.title.description`),
`type` required `FieldSelect` over
`Repo::reviewerRecommendation()->getRecommendationTypeLabels()` (1
"Approved", 2 "Not Approved", 3 "Revisions Requested", 4 "With Comments"),
`status` `FieldSelect` with no label (1 "Active Upon Saving", 0
"Deactivate", value 1). API (`ReviewerRecommendationController`, base
`reviewers/recommendations`): GET, GET {id}, POST, PUT {id}, PUT
{id}/status, DELETE {id}; `removable` is
`!Repo::reviewAssignment()->…->filterByReviewerRecommendationIds([$id])->exists()`.
Defaults: `ContextService::afterAddContext` calls
`Repo::reviewerRecommendation()->addDefaultRecommendations()`, six rows
from `reviewer.article.decision.accept` ("Accept Submission"),
`.pendingRevisions` ("Revisions Required"), `.resubmitHere` ("Resubmit for
Review"), `.resubmitElsewhere` ("Resubmit Elsewhere"), `.decline` ("Decline
Submission"), `.seeComments` ("See Comments"), `status` 1, titled in every
supported locale. The reviewer's list:
`Repository::getRecommendationOptions()` returns the active entries plus
the one the assignment already carries, consumed by
`PKPReviewerReviewStep3Form`. Live-probed 2026-09-06 (Rules 17, 18; Fields
"Reviewer Recommendations"; OJS scratch context with a throwaway manager
and an accepted external reviewer): the table, the six defaults, the
dialogs and the reviewer's list as quoted; "Recommendation type" is a
`select` with no selected option and the status list a `select`; an empty
save is refused in the browser with "This field is required." under both
required boxes and "Please correct 2 errors." at the foot (no request
sent), "Save" then `[disabled]` until every error is cleared, and with one
box empty the foot reads "Please correct one error." (live-probed
2026-09-06); with French ticked under "Forms" the window gains the
"French"/"English" switch and a second box "Review Recommendations in
French" (`title-fr_CA`) behind "French"; add is `POST reviewers/recommendations`, edit a `POST …/{id}`, both
redrawing the table with no notice; the rows are listed by
`ReviewerRecommendation::query()->withContextId()->get()` with no
ordering, so the table shows whatever order the database returns: in this
probe an edited or toggled row dropped to the bottom, on later drives the
same day it stayed in place (finding A7, footnote f-a7), and the
reviewer's `select` followed the table either way; the type appears in no
window the editor or the reviewer opens.
The in-use entry lost its "More Actions" cell after the submit; deactivated,
the Reviewers table's status cell still printed it ("Review Submitted",
and "Review Viewed" once the review had been opened) while "Read Review" /
"Review Details" kept its "Recommendation:" summary line and printed "-"
in its "Reviewer Recommendation" section; reactivated, the section printed
the title again (finding A6; re-read 2026-09-06).
Live-probed 2026-10-05 (Rule 17; OJS `main`, a scratch journal's
throwaway Journal Manager, two runs): "Add Recommendation" opened,
"Review Recommendations" filled, "Recommendation type" left unchosen, the
window left by its "Close" (the button at its top): no dialog, no notice,
the window gone, and the table listed the six starting rows, the same
after a reload. Kept script
`shared/playwright/checks/U28/I05/i05.js` (phase `recs`).

<a id="fn-h"></a>
**h** — `HasReviewDueDate` trait (lib/pkp
`controllers/grid/users/reviewer/form/traits/`):
`getReviewResponseDueDate()` is `Carbon::today()->endOfDay()->addWeeks(n)`
with `n = numWeeksPerResponse`, falling back to
`REVIEW_RESPONSE_DEFAULT_DUE_WEEKS = 3` when the setting is 0 or empty;
`getReviewSubmitDueDate()` the same with `numWeeksPerReview` and
`REVIEW_SUBMIT_DEFAULT_DUE_WEEKS = 4` (finding A4). `ReviewerForm::
initData()` calls `getDueDates($context)` for the Add Reviewer window;
the one-click invitation's lifetime is `(numWeeksPerReview + 4) * 7` days
(`ReviewerAccessInvite::getExpiryDays()`). The scenario API's
`reviewRounds[]` builder stamps dates the same way (scenarios.md).
Live-probed 2026-09-05 (Rule 7, finding A3; OJS and OMP, scratch contexts):
with 4 / 4 both dates were today + 28 days; with 2 / 5, today + 14 and + 35;
with 0 / 0 and with both boxes emptied, today + 21 and + 28; the accepted
request's row kept "Review due: {date}" throughout.

<a id="fn-i"></a>
**i** — The clock is `PKP\task\ReviewReminder` (lib/pkp `classes/task/`),
registered `->daily()` in `ojs classes/scheduler/Scheduler.php` and `omp
classes/scheduler/Scheduler.php` (OPS registers none). It iterates
`Repo::reviewAssignment()->getCollector()->filterByIsIncomplete(true)`
(notified, not completed, not declined, not cancelled), skips submissions
whose status is not `STATUS_QUEUED`, and reads the four `numDays…` settings
per context. With `dateConfirmed` null and `dateReminded` null it sends
`ReviewResponseRemindAuto` when `numDaysBeforeReviewResponseReminderDue > 0`
and the response due date is ahead by at most that many days; with
`dateReminded` set, when `numDaysAfterReviewResponseReminderDue > 0`, today
is past the due date by at least that many days and the last reminder
predates the due date. After confirmation the same two branches run on the
review due date with the submit thresholds and `ReviewRemindAuto`. The
"after" branch sits inside `else` of `dateReminded === null` (finding A1).
The job `PKP\jobs\email\ReviewReminder` builds the mailable from the
template (`REVIEW_RESPONSE_OVERDUE_AUTO`, name
`mailable.reviewResponseOverdueAuto.name` "Review Response Overdue
(Automated)", subject `emails.reviewResponseOverdueAuto.subject` "Will you
be able to review this for us?", which the OMP locale overrides to
"Manuscript Review Request"; `REVIEW_REMIND_AUTO`, name "Review
Reminder (Automated)", subject "A reminder to please complete your
review" on both apps; names and subjects read on the "Manage Emails" page,
reached from the "Add and edit templates" link of Settings › Workflow ›
"Emails", live-probed 2026-09-06 on OJS and OMP), from
`contactEmail`/`contactName`, mints a `ReviewerAccessInvite`
when `reviewerAccessKeysEnabled`, sends, sets `dateReminded` and
`reminderWasAutomatic`, logs the email
(`SubmissionEmailLogEventType::REVIEW_REMIND_AUTO`) and the event
(`SUBMISSION_LOG_REVIEW_REMIND_AUTO`,
`submission.event.reviewer.reviewerRemindedAuto` "An automatic reminder
email was sent to {$recipientName} regarding their review assignment").
`ReviewerAction::confirmReview()` resets `dateReminded` and
`reminderWasAutomatic` on accept or decline. The test installs run with
`[schedule] task_runner = Off` and `[queues] job_runner = Off`
(seed-facts.md), so the clock, its emails and its log row are not
observable through any screen there: Rule 9 and the reminder side effect
are read from the code, except Rule 9d, live-probed 2026-10-04 with the
task started by hand (footnote [f-a1](#fn-f-a1)).

<a id="fn-s0"></a>
**s0** — Scratch journal: `POST scenarios/context` with a throwaway
`manager`, an `externalReviewer` and an `author` in `users[]` (a seeded
reviewer is not enrolled on a scratch context, so the reviewer must be
created there), then `POST scenarios/submission` with
`decisions: ['sendExternalReview']` and `reviewRounds: [{reviewers:
[{username, status: 'accepted'}]}]` where a request is needed; `review:`
and `reviewForms[]` passthrough keys (scenarios.md "Configuring a scratch
context") seed the configured ends where a scenario starts from them
(scenario 7 seeds an active form and a reviewer carrying it through
`reviewForm:`, beside a second `externalReviewer` with `status:
'completed'` and no `reviewForm`; scenario 1's request is seeded before
the save, at the defaults; scenario 13's context keys are in its own
footnote). Access checks and scenario 12: the seeded journal `publicknowledge` with
`manager.maya`, `editor.diana`, `sectioneditor.ana`, `assistant.rita`,
`reviewer.julia`, `author.alex`, `reader.rosa` (passwords: the username
twice; `admin` / `admin`). Scenario 11: the seeded OPS server with
`manager.maya`; the journal and press controls with the same account.
Mail is read in the mail catcher (Mailpit, `http://127.0.0.1:8025`),
scoped by the throwaway reviewer's address; scenario 1's absence read
needs a positive control the same way (scenarios.md "Mailpit"), and no
scenario here expects mail.

<a id="fn-s1"></a>
**s1** — Scenario 1 exercises Rules 2, 3, 7 and the sliders' saving; the
Add Reviewer read is the effect end of Rules 3 and 7 (`ReviewerForm::
initData()`). The scratch journal starts at the install defaults (seed-facts
"Settings › Workflow › Review on the seeded journal", 2026-09-04).
Live-probed 2026-09-05 in parts (footnotes d, h): the sliders set by
keyboard saved and read back after a reload; "Open" and a 2-week response
deadline reached Add Reviewer. For the test author (2026-09-06): a mouse
drag lands where the pointer is released and is not pixel-exact (a drag
from the left end read 2), so the suite sets the slider by keyboard (focus
it, Home, then ArrowRight three times) and reads "3 days before due date"
in the box beside it.

<a id="fn-s2"></a>
**s2** — Scenario 2: the context schema's `integer` and `min:0` rules and
the Vue form's per-field error rendering (footnote d). Live-probed
2026-09-05 with `abc`, `-1` and `2.5` (the decimal is refused like the
letters) in "Default Completion Deadline", the mode change in the same
edit unsaved after the refusal, both apps.

<a id="fn-s3"></a>
**s3** — Scenario 3: the Vue tab switch keeps the page and the form's
state; only a reload re-reads the saved values. Live-probed 2026-09-05 on
"Setup" (a deadline and a slider) and "Reviewer Guidance" (a guideline
text) on both apps: no dialog on the switch, values still present on
return, saved values after the reload, no `beforeunload` prompt.
Live-probed 2026-09-28 (Rule 2), OJS and OMP, two runs: "Default Response
Deadline" changed from 4 to 9 and not saved, then a reload: no page-leave
question, and "Setup" read 4 once "Review" was opened again.

<a id="fn-s4"></a>
**s4** — Scenario 4: `reviewGuidelines` and `competingInterests` saved
through the guidance form; the wizard's step 1 and 2 rendering is the
reviewer's-review spec's (`PKPReviewerReviewStep1Form`,
`PKPReviewerReviewStep2Form`). Live-probed 2026-09-05 on both apps
(footnote e). The reviewer's "Accept Review, Continue to Step #2" does
nothing until the privacy box is ticked ("This field is required." under
it otherwise).

<a id="fn-s5"></a>
**s5** — Scenario 5: `omp ReviewGuidanceForm` adds `internalReviewGuidelines`
before `reviewGuidelines`; `FieldShowEnsuringLink` (footnote e).
Live-probed 2026-09-05 on both apps: box order, the button in the sentence,
the window's "Close", the tick after "Save" and a fresh navigation.

<a id="fn-s6"></a>
**s6** — Scenario 6: `createReviewForm` → `updateReviewForm`;
`createReviewFormElement` → `updateReviewFormElement` with the listbuilder's
`possibleResponses`; `reviewFormPreview`; `activateReviewForm`; the Add
Reviewer list is `ReviewerForm::fetch()` over
`ReviewFormDAO::getActiveByAssocId()` with `manager.reviewForms.noneChosen`
"None / Free Form Review" as the empty choice, rendered only when at least
one form is active. Live-probed 2026-09-05 on both apps (footnote f): the
create, item and preview steps on one context, the activation and the Add
Reviewer list on another seeded with two inactive forms. The options: the
suites add each one with "Add Item", the text typed into the new
`newRowId[possibleResponse]` box and Enter, which lists it as a fixed row,
and press "Save" with no row open (every green run since 2026-09-05 on both
apps); a row still open at "Save" once raced the save and left the window
open.

<a id="fn-s7"></a>
**s7** — Scenario 7: `reviewForms: [{title: 'Method check', elements: […]}]`
and a `reviewRounds[].reviewers[]` entry with `reviewForm: 'Method check'`
(scenarios.md); `getIncompleteCount()` 1 → `$canEdit` false →
`ReviewFormGridRow` without `edit`/`delete`, `editReviewForm.tpl` with tabs
0 and 1 disabled; `copyReviewForm()`. Live-probed 2026-09-05 on both apps
(footnote f): row 1 / 0, "Copy" and "Preview" only, the "Preview" window's
greyed tabs inert under a forced click, the copy at the bottom with
"Edit" / "Delete" and the same items.

<a id="fn-s8"></a>
**s8** — Scenario 8: `deactivateReviewForm` (confirmation
`manager.reviewForms.confirmDeactivate`) and `deleteReviewForm`
(`manager.reviewForms.confirmDelete`) on a form with both counts 0.
Live-probed 2026-09-05 on both apps (footnote f) with a second active form
present, so the Add Reviewer list shrank rather than vanished; the
zero-active end was read on the in-use form's deactivation (footnote
f-a2).

<a id="fn-s9"></a>
**s9** — Scenario 9 (OJS): `POST reviewers/recommendations` from the side
modal, `PUT …/status` from the tick dialog; the reviewer's list is
`Repository::getRecommendationOptions()` on step 3 (`ojs
templates/reviewer/review/reviewerRecommendations.tpl`). Live-probed
2026-09-06 (footnote g): the new entry last and ticked, "See Comments"
unticked (moved to the bottom in that run and in a second the same day;
left in place, above the new entry, on the suite's first run and on a
later 15-change drive, also 2026-09-06: finding A7), the reviewer's list
ending with the new entry and without "See Comments" either way. A test
run 2026-09-26 listed the new entry first in the table (footnote f-a7),
so the scenario reads the table's rows and the reviewer's options as
sets.

<a id="fn-s10"></a>
**s10** — Scenario 10 (OJS): the submitted review stores
`reviewerRecommendationId` (`PKPReviewerReviewStep3Form::execute()`), which
makes `removable` false and hides the `DropdownActions`; the API refuses
`edit`/`delete` with 406 behind it. The submit itself follows the
reviewer's-review spec's scenario. Live-probed 2026-09-06 (footnote g): the
chosen entry's row without "More Actions", an unused custom entry deleted
through "Delete" › "Yes".

<a id="fn-s11"></a>
**s11** — Scenario 11: footnote b, live-probed 2026-09-06 on all three
apps.

<a id="fn-s12"></a>
**s12** — Scenario 12: footnote c (`CanAccessSettingsPolicy`), live-probed
2026-09-06 on the seeded journal and press with `sectioneditor.ana`,
`assistant.rita`, `reviewer.julia` and `author.alex`, the typed address
`{journal}/management/settings/workflow`; the control with `manager.maya`.

<a id="fn-s13"></a>
**s13** — Scenario 13: `POST scenarios/context` with `review:
{numReviewsPerSubmission: 1}` and `reviewForms: [{title: 'Method check',
elements: [{question: 'Is the method sound?', type: 'radiobuttons',
options: ['Yes', 'No']}, {question: 'Other remarks', type: 'textarea',
included: false}]}]`, then the submission with `reviewRounds:
[{reviewers: [{username, status: 'accepted', reviewForm: 'Method
check'}]}]` (scenarios.md "reviewForms[]" and "reviewRounds[]"); the
review is submitted through the wizard on screen so the answers are the
scenario's (a `completed` seed carries a form only while no item is
required, and its answers are the seed's). The counts and the editor's
window: footnote f (0 / 1 after the submit; the item with `included` off
present in the editor's window, 2026-09-05); the round status lines before
and after "Mark as Complete": footnote d (2026-09-06).

<a id="fn-f-a1"></a>
**f-a1** — `PKP\task\ReviewReminder::executeActions()`: the
`numDaysAfterReviewResponseReminderDue` and
`numDaysAfterReviewSubmitReminderDue` checks live in the `else` branch of
`if ($reviewAssignment->getDateReminded() === null)`, so an assignment
never reminded is only ever considered for the "before" thresholds.
Live-probed 2026-10-04 (Rule 9d; A1) on OJS and OMP, `main` and
`stable-3_5_0`, on the default datasets, by the kept script
`shared/playwright/checks/issues/after-due-reminders-never-sent/walk.js`:
both "After Due Date" sliders at 1 day and both "Before Due Date" sliders
at "No reminder set" (the form then read "1 days after due date"); an
unanswered and an accepted request moved past their due dates in the
reviewer row's "Edit" window (both rows read "Overdue"); the task started
by hand with `php lib/pkp/tools/scheduler.php test
--name='PKP\task\ReviewReminder'` (it reported `DONE`), then the jobs it
queued run. Neither reviewer got a reminder, the Activity Log had
no reminder line, and both assignments' `date_reminded` stayed empty.
With the report's fix applied on `main`, the same steps sent "Will you
be able to review this for us?" (OMP "Manuscript Review Request") and
"A reminder to please complete your review" and logged both reminder
lines. The upgrade reach is read in the code: the 3.5 migration
`I5885_RenameReviewReminderSettingsName` renames 3.4's
`numDaysBeforeInviteReminder` and `numDaysBeforeSubmitReminder` (which
3.4 used as days after the due date) to the two "After Due Date"
settings and leaves the "Before" ones unset; the walk did not run an
upgrade. The way round by "Send Reminder" before the due date is read in
the code (`ReviewReminderForm` stamps the same `dateReminded`). Since:
pkp-lib 41b38eb240 (`pkp/pkp-lib#9612`, 2024-08-30), the reminder rewrite
that introduced the four sliders; 3.4 and 3.3 send their one overdue
reminder to any assignment not yet reminded (read in the code).
Issue report: [pkp-e2e#909](https://github.com/jardakotesovec/pkp-e2e/issues/909) ([docs/issues/U29-A1-after-due-reminders-never-sent.md](../issues/U29-A1-after-due-reminders-never-sent.md)).

<a id="fn-f-a2"></a>
**f-a2** — `ReviewFormGridHandler::deactivateReviewForm()` tests
`$request->checkCSRF() && isset($reviewForm) && $reviewForm->getActive()`
only; `ReviewFormGridCellProvider::getCellActions()` offers the toggle on
every row; the warning is `manager.reviewForms.confirmActivate`.
Live-probed 2026-09-05 on both apps on a form carried by an accepted and a
declined assignment: the untick asked the deactivation question, "OK"
showed "Your changes have been saved.", the row read unticked and 1 / 0
after a reload, Add Reviewer on the same submission had no "Review Form"
list (it was the only form), the accepted reviewer's step 3 still showed
the form's items, and re-ticking asked the activation question again.

<a id="fn-f-a3"></a>
**f-a3** — Footnote h: `REVIEW_RESPONSE_DEFAULT_DUE_WEEKS = 3` versus
`REVIEW_SUBMIT_DEFAULT_DUE_WEEKS = 4`, against schema defaults of 4 and 4;
the schema's `nullable` lets the emptied box through. Live-probed
2026-09-05 on both apps: 0 / 0 and empty / empty both gave today + 21 and
today + 28 in Add Reviewer.

<a id="fn-f-a4"></a>
**f-a4** — Footnote a: the side tabs' `<tabs :track-history="true">` writes
a one-part hash, and both side-tab groups read it back on load: a
"Submission" side tab's hash opens that side tab, and a "Review" side
tab's hash selects that side tab inside "Review" (pressing "Review" after
the reload shows it), but the top tabs do not open "Review" for it, so
"Submission" › "Disable Submissions" shows. Live-probed 2026-09-05 on OJS
and OMP, scratch contexts: reload on `…/workflow#reviewSetup` selected
"Submission" and "Disable Submissions" with the hash still in the address.
Live-probed 2026-09-28 (Rules 1a, 1b; A4), two runs per app, OJS and OMP
with OPS as the control ("Submission" only), as a scratch Journal Manager
on a scratch context: a reload on `#reviewSetup`,
`#reviewerGuidance`, `#reviewForms` and (OJS) `#reviewerRecommendations`
landed on "Submission" › "Disable Submissions" with the hash kept, and
pressing "Review" then showed that side tab, address `#review`; a reload
on each of the five "Submission" side tabs (`#disableSubmissions`,
`#instructions`, `#metadata`, `#components`, `#contributorRoles`) and on
`#library`, `#emails`, `#taskTemplates` kept the tab. "Review" ›
"Reviewer Guidance" › "Setup" (`#reviewSetup`) fell back too; "Review" ›
"Review Forms" › "Submission" › "Review" showed "Review Forms" with the
address `#review`, and a reload opened "Review" › "Setup". The same at
three more permission levels, reading "Metadata" (OPS: "Metadata" and
"Components", kept) and "Reviewer Guidance" (fell back, then shown on
pressing "Review"): a scratch Editor (OJS, OMP; OPS has no manager-level
editor group), `admin` on the scratch context and `manager.maya` on
`publicknowledge` (reload only, nothing saved). No page-leave question,
no response of 400 or more, no console error. Candidate for
`app-changes.md` if a suite needs the tab after a reload. Re-driven
2026-09-30 (Rule 1a; A4), two runs, OJS, OMP and OPS, a scratch Journal
Manager, a scratch Editor (OJS, OMP) and `admin` on scratch contexts:
"Metadata" and "Contributor Roles" pressed, then a reload, kept the side
tab; the same side tabs after "Review" (OPS "Preprint Server Library")
and "Submission" again read `#submission` and reloaded onto "Disable
Submissions", and pressing the side tab again made the reload keep it.
Every "Review" side tab and Rule 1b behaved as before. A "Setup" save
("Default Response Deadline", "Saved" beside the button) left
`#reviewSetup` in the address and its reload fell back the same way,
"Review" then showing "Setup" with the saved value; a "Metadata" save
kept "Metadata" through the reload on all three apps. No response of 400
or more, no console error, no browser dialog.

<a id="fn-f-a5"></a>
**f-a5** — Footnote f: `reviewFormElementForm.tpl` defines
`togglePossibleResponses()` with the
`alert(manager.reviewFormElement.changeType)` for the type list's change
(its own comment says "onchange"), but the `{fbvElement type="select"}`
it renders carries no `onchange`, so the listbuilder is never disabled and
no warning fires; `ReviewFormElementForm::
execute()` stores `possibleResponses = null` for a text type. Live-probed
2026-09-05 on both apps: "Add Item" pressed with "Choose item type" still
selected added a row; a saved radio item with "Yes" / "No" switched to
"Extended text box" and saved showed "Your changes have been saved." and,
reopened, "No Items" under "Response Options"; `page.on('dialog')` recorded
nothing. Since: the elided warning was wired when the listbuilder was
written; the age of the missing binding was not traced.
Issue report: [pkp-e2e#910](https://github.com/jardakotesovec/pkp-e2e/issues/910) ([docs/issues/U29-A5-review-form-item-text-type-drops-options.md](../issues/U29-A5-review-form-item-text-type-drops-options.md)).

<a id="fn-f-a6"></a>
**f-a6** — Footnote g: `Repository::getRecommendationOptions()` returns the
active entries plus the one the assignment carries, which is what the
reviewer's list shows. The editor's window is the Vue
`ReviewerManager/ReviewDetailsModal.vue` (the "Read Review" row button and
the "Review Details" menu entry open the same one); it prints the title it
finds for the assignment's `reviewerRecommendationId` in the
`recommendations` list it is handed (`useReviewerManagerConfig.js
getRecommendationString()`, null when the id is not in the list). Which
list each surface is handed was not traced. Live-probed 2026-09-06 on OJS,
twice in separate runs and read once the comments block had filled in:
with the entry deactivated the window still carried "Review Submitted:
{date}" and "Recommendation: Accept with minor changes" among its summary
lines and printed "-" in its "Reviewer Recommendation" section (help "The
reviewer's suggested outcome for this submission."); reactivated, the
section printed the title too, and the "Review Details" menu entry opened
the same window. An earlier read that saw the summary lines missing was
taken before the window had filled in. The Reviewers row's label was
"Review Submitted" until the editor opened the review and "Review Viewed"
after, the title under either. The window itself is the reviewer
assignment & management spec's surface.

<a id="fn-f-a7"></a>
**f-a7** — Footnote g: `ReviewerRecommendationController::getMany()`
(`ReviewerRecommendation::query()->withContextId()->get()`) feeds the
table and `Repository::getRecommendationOptions()` (`withActive()->get()`)
the reviewer's list; neither orders, so both show the rows as the database
returns them. Live-probed 2026-09-06 on OJS, two fresh scratch journals
with a throwaway manager and an accepted external reviewer each, 15 changes
(4 adds, 3 edits, 8 ticks), the table read after every change at once and
again after the settings page was reopened, the reviewer's step 3 list
after 11 of them: every new row last; no edited or ticked row ever moved
(creation order throughout, the same after the reopen); the reviewer's
`select` was the ticked rows in the table's order on all 11 reads. Earlier
the same day on the same install, three separate drives saw every edited
or toggled row drop to the bottom, and the OJS suite's first run saw
scenario 9's toggled row stay above the new entry. The browser's traffic
is the same each time (footnote g's add, edit and status calls, then `GET
reviewers/recommendations`, all 200) and the table is redrawn from that
GET, so the difference sits in the database's answer to an unordered query
(a lean, not an observation: a rewritten row's physical place); which of
the two a run gets is not something the tester can steer, so a test
asserts the tick and the reviewer's list, never the row's position.
Re-read 2026-09-26 (Rule 17; scenario 9): the table's query
(`ReviewerRecommendationController::getMany()`) and the reviewer's
(`Repository::getRecommendationOptions()`, `withContextId()->withActive()`
plus the carried entry, then `get()`) still have no ordering, so the
database decides both orders, a new row's place included; the six starting
rows and a just-added one are therefore read as a set. Seen in a test run
2026-09-26 on OJS (scenario 9, a scratch journal among three parallel
runs): right after "Save" the table listed "Accept with minor changes"
first, above the six starting rows. The reviewer's list has not been seen
out of the table's order; its no-order reading is from the code.


<a id="fn-f-a8"></a>
**f-a8** — Live-driven 2026-09-06 on OJS from the register entry alone, on
a fresh scratch journal: a form carried by one declined request read 0 / 0
with "Edit", "Copy", "Preview" and "Delete"; after "Delete" › "OK" the
declined request's "Edit" window listed "None / Free Form Review" selected.
Editing the questions under a declined request was not driven. First seen
2026-09-05 by the earlier build of this spec.

<a id="fn-f-a9"></a>
**f-a9** — Live-driven 2026-09-06 on OJS and OMP from the register entry
alone, on a fresh scratch context each: an accepted request carrying an
active form; the form deactivated on "Review Forms" ("OK" on the
confirmation); the reviewer row's "Edit" window then listed only the
still-active forms with "None / Free Form Review" selected; "OK" unchanged
answered 200, the form's "In Review" went 1 → 0, and the reviewer's step 3
showed "For author and editor" and "For editor" instead of the questions.
The count still read 1 before the "OK", so the window's save does the
detaching. First seen 2026-09-05 by the earlier build of this spec.
Issue report: [pkp-e2e#911](https://github.com/jardakotesovec/pkp-e2e/issues/911) ([docs/issues/U29-A9-edit-review-drops-deactivated-form.md](../issues/U29-A9-edit-review-drops-deactivated-form.md)).

<a id="fn-f-a11"></a>
**f-a11** — Folded 2026-10-01 from the issue report's walk (Rule 18;
A11). `reviewerRecommendationManagerStore.js` `handleEdit()` passes the
row to `useForm`'s `setValues(item)`, so the form's multilingual `title`
field holds the row's own object, and `Form.vue` `fieldChanged()` writes
a change into it (`field[prop][localeKey] = value`); the row prints the
same object, and closing discards only the form. Seen on screen
2026-09-30 on OJS `main` (lib/ui-library 280f98c5), signed in as `rvaca`
on PKP's default test dataset: "Edit" on "Accept Submission", " Draft"
added to "Review Recommendations" (`title-en`), the window closed with
its "Close"; the row read "Accept Submission Draft", the reopened
box held it, and "Save" unchanged stored it (read again after a
reload). Kept script
`shared/playwright/checks/issues/unsaved-name-kept-after-closing-edit-panel/reach.js`.
Since: ui-library 1afd40a9 (`pkp/ui-library#853`, 2026-09-24) reloads the
list on close only after a save; before it every close reloaded the list
and hid the fault (read in the code, not reproduced). Not on 3.5, which
has no such manager. A press has no "Reviewer Recommendations" tab
(OMP1). Issue report: [pkp-e2e#4](https://github.com/jardakotesovec/pkp-e2e/issues/4) ([docs/issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md](../issues/U66-A2-unsaved-name-kept-after-closing-edit-panel.md)).

<a id="fn-f-a12"></a>
**f-a12** — `ReviewerRecommendationManager.vue` (lib/ui-library
`src/managers/ReviewerRecommendationManager/`) wraps each row's
`<input type="checkbox" name="recommendation_status[]">` in a `<label>`
that holds nothing else, with no `aria-label`, `title` or `label[for]`;
`ReviewerRecommendationForm`'s `status` `FieldSelect` has no label
(footnote g). Live-probed 2026-10-05 on OJS `main` (lib/ui-library
`64d67363`), a scratch journal, as its throwaway Journal Manager and as
the Site Administrator, two runs: Chromium's accessibility tree gave all
six starting rows' boxes the role checkbox, focusable, with an empty name
(the only name source the empty label); the page's accessibility snapshot
read `rowheader "Accept Submission"`, then `checkbox [checked]`, then
`button "More Actions"` on every row, and in "Add Recommendation" a
`combobox` with no name holding "Active Upon Saving" [selected] and
"Deactivate". The first box, reached with Tab and pressed with Space,
opened "Deactivate Reviewer Recommendation" / "Are you sure you want to
deactivate the recommendation Accept Submission"; "No" left it ticked and
nothing was sent. No server error, page error or console error in either
run. Kept script `shared/playwright/checks/U28/I05/i05.js` (phase `recs`).
First noted 2026-10-01 in the code by the DOIs page's A8 write-up, which
names it as outside that fix (`docs/issues/U45-A8-doi-page-controls-unnamed.md`).

<a id="fn-f-omp1"></a>
**f-omp1** — Footnote b (`hasCustomizableReviewerRecommendation()`); the
press wizard's missing "Recommendation" list is the reviewer's-review
spec's OMP1. Live-probed 2026-09-06 on the seeded press: three side tabs,
no "Recommendation" anywhere on the "Review" tab; the press reviewer's step
3 had no "Recommendation" list (2026-09-05).

<a id="fn-f-omp2"></a>
**f-omp2** — `omp locale/en/manager.po` overrides
`manager.setup.reviewOptions.restrictReviewerFileAccess.description` and
`manager.setup.reviewGuidelines`, and does not override
`manager.setup.reviewOptions.numWeeksPerReview` (lib/pkp wording), while
`ojs locale/en/manager.po` overrides the last one; `omp
ReviewGuidanceForm` adds `internalReviewGuidelines`
(`manager.setup.internalReviewGuidelines`); `manager.publication.library`
is "Publisher Library" in OJS and "Press Library" in OMP; the OMP locale
also overrides `emails.reviewResponseOverdueAuto.subject` to "Manuscript
Review Request" (footnote i). Live-probed 2026-09-05 on both apps
(footnotes d, e): every string as quoted; the subject read on the "Manage
Emails" page of the seeded journal and press 2026-09-06. The internal
box's toolbar is OMP3.

<a id="fn-f-omp3"></a>
**f-omp3** — Footnote e: `omp ReviewGuidanceForm` adds
`internalReviewGuidelines` as a `FieldRichTextarea` with its own toolbar
list, shorter than the one `PKPReviewGuidanceForm` gives `reviewGuidelines`
and `competingInterests`. Live-probed 2026-09-05 on one scratch press and
again on a second 2026-09-06: "Internal Review Guidelines" shows five
toolbar buttons (Bold, Italic, Superscript, Subscript, Insert/edit link);
"External Review Guidelines" and "Competing Interests" show eight (plus
Blockquote, Bullet list, Numbered list).
Issue report: [pkp-e2e#907](https://github.com/jardakotesovec/pkp-e2e/issues/907) ([docs/issues/U29-OMP3-press-internal-guidelines-no-list-buttons.md](../issues/U29-OMP3-press-internal-guidelines-no-list-buttons.md)).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Settings › Workflow › "Review" › "Setup" | sidebar Settings › Workflow → `{journal}/management/settings/workflow`, tab "Review" › "Setup"; saves `PUT api/v1/contexts/{id}` | AFFM-065 |
| "Review" › "Reviewer Guidance" | same page, side tab | AFFM-066 |
| "Review" › "Review Forms" list | same page, side tab (legacy grid) | GRID-047 · AFFM-067 (Create Review Form), AFFM-068 (Edit), AFFM-069 (Copy), AFFM-070 (Preview), AFFM-071 (Active tick), AFFM-072 (Delete), AFFM-073 (Order) |
| Review form window (tabs "Review Form", "Form Items", "Preview Form") | row "Edit" / "Preview" | AFFW-670 · GRID-046 · AFFM-074 (Create New Item), AFFM-075 (Edit item), AFFM-076 (Delete item), AFFM-077 (Order items) |
| "Response Options" list in the item window | item window | GRID-059 · GRID-060 |
| OMP legacy preview template (not rendered) | — | AFFW-669 |
| "Review" › "Reviewer Recommendations" {OJS} | same page, side tab; `api/v1/reviewers/recommendations` | VUE-047 · VUE-069 · API-054 · AFFM-078 (Add), AFFM-079 (Activate tick), AFFM-080 (Edit), AFFM-081 (Delete) |
| Automatic reminder clock | daily scheduled task, no screen | JOB-054 |

## Reference — code anchors

- `lib/pkp/templates/management/workflow.tpl` — the Workflow Settings page and its tabs
- `lib/pkp/pages/management/ManagementHandler.php` (`workflow()`, `hasReviewStage()`, `addReviewFormWorkflowSupport()`) · `ojs pages/management/SettingsHandler.php` (adds the recommendations panel) · `omp pages/management/SettingsHandler.php` · `ops pages/management/SettingsHandler.php`
- `lib/pkp/classes/components/forms/context/PKPReviewSetupForm.php`, `PKPReviewGuidanceForm.php` · `omp classes/components/forms/context/ReviewGuidanceForm.php` · `lib/pkp/classes/components/forms/FieldShowEnsuringLink.php` · lib/ui-library `components/Form/fields/FieldSlider.vue`, `FieldShowEnsuringLink.vue`, `FieldOptions.vue`
- `lib/pkp/schemas/context.json`, `ojs schemas/context.json`, `omp schemas/context.json` — the settings' types, defaults and rules; `lib/pkp/api/v1/contexts/PKPContextController.php::edit()`
- `lib/pkp/controllers/grid/settings/reviewForms/` — `ReviewFormGridHandler.php`, `ReviewFormGridRow.php`, `ReviewFormGridCellProvider.php`, `ReviewFormElementsGridHandler.php`, `ReviewFormElementGridRow.php`, `form/ReviewFormForm.php`, `form/ReviewFormElementForm.php`, `form/PreviewReviewForm.php`
- `lib/pkp/controllers/listbuilder/settings/reviewForms/ReviewFormElementResponseItemListbuilderHandler.php`, `lib/pkp/controllers/listbuilder/settings/SetupListbuilderHandler.php`
- `lib/pkp/templates/manager/reviewForms/` (`reviewFormForm.tpl`, `reviewFormElementForm.tpl`, `previewReviewForm.tpl`), `lib/pkp/templates/controllers/grid/settings/reviewForms/editReviewForm.tpl`, `lib/pkp/templates/reviewer/review/reviewFormResponse.tpl`, `lib/pkp/templates/controllers/grid/common/cell/selectStatusCell.tpl`
- `lib/pkp/classes/reviewForm/` — `ReviewForm.php`, `ReviewFormDAO.php`, `ReviewFormElement.php`, `ReviewFormElementDAO.php`
- `lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php`, `EditReviewForm.php`, `traits/HasReviewDueDate.php` — where the defaults land
- `lib/pkp/classes/submission/reviewer/recommendation/` — `ReviewerRecommendation.php`, `Repository.php`, `enums/ReviewerRecommendationType.php`; `ojs api/v1/reviewers/recommendations/ReviewerRecommendationController.php` and its `formRequests/`; `ojs classes/components/forms/context/ReviewerRecommendationForm.php`, `ojs classes/components/listPanels/ReviewerRecommendationsListPanel.php`; `ojs classes/services/ContextService.php` (default entries); lib/ui-library `managers/ReviewerRecommendationManager/`
- `lib/pkp/classes/task/ReviewReminder.php`, `lib/pkp/jobs/email/ReviewReminder.php`, `lib/pkp/classes/mail/mailables/ReviewRemindAuto.php`, `ReviewResponseRemindAuto.php`, `ojs classes/scheduler/Scheduler.php`, `omp classes/scheduler/Scheduler.php`
- `lib/pkp/classes/security/authorization/CanAccessSettingsPolicy.php`, `ojs registry/userGroups.xml`, `omp registry/userGroups.xml`
