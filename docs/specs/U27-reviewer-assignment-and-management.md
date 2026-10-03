---
name: reviewer-assignment-and-management
status: verified
---

# Reviewer assignment & management {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Once a submission is in a review round, someone has to find the reviewers,
invite them, keep them on schedule, and read what they send back. That work
happens in the "Reviewers" panel on the review stage. An editor searches the
journal's reviewer pool, or creates a brand-new reviewer account, or enrolls
an existing user. They set the deadlines, the review type and the files the
reviewer may see. Then they follow each invitation through its life: they
remind an overdue reviewer, record a response the reviewer gave by email,
read the finished review in its Review Details window, rate it, mark it
complete, or even modify what the reviewer wrote, or submit a review on the
reviewer's behalf. They thank the reviewer,
or unassign and later reinstate them. This spec covers that panel and every
window it opens. The round machinery around it (round numbers, the status
box, the decision buttons) is the neighboring feature
[→ round machinery](U26-review-stage-and-rounds.md#rounds). What the reviewer
themself sees and does is the *Reviewer's review* feature. How review
defaults and forms are configured is *Review setup & review forms*.

OPS does not install a review stage or any reviewer role. A preprint server's
workflow goes straight from submission to Production, no "Reviewers" panel
exists on any screen, and its role settings offer no reviewer group. The
absence of the stage itself is documented with
[→ the review stage](U26-review-stage-and-rounds.md#rounds). The same
deliberate absence covers the review emails: OPS ships no reviewer-flow
email templates at all. An earlier reading of one missing template as a
latent fault is retired [OPS1](#ops1). <sup>p</sup>

On a press, everything in this file runs twice. The Internal Review stage and
the External Review stage each carry their own Reviewers panel with the same
controls. The reviewer pool differs by stage: searching the Add Reviewer
window offers the press's Internal Reviewers on the internal stage and its
External Reviewers on the external stage [OMP1](#omp1). The window's opening,
unsearched list does not apply that split, and a reviewer of the other stage
picked from it is added to the round all the same ⚠ [OMP2](#omp2).
<sup>o</sup>

## Actors & permissions

The Reviewers panel renders on the editorial view of the review stage. Who
can open that stage at all is
[→ stage access](U24-workflow-screen-and-stage-access.md#stage-access).
Within the panel, "review managers" below means:
Journal Manager, Editor, and an assigned Section Editor or Guest Editor. A
Site Administrator takes part through whatever journal role grants them
stage access. Holding no role in the journal, they are refused at the
workflow screen itself ([A3](#a3), retired) <sup>a</sup>. A review manager
who is themself a reviewer of the submission is kept off every stage of it,
so they never see the panel, their own row included
([→ a reviewing manager's access](U24-workflow-screen-and-stage-access.md#a4)).
On the seeded installs the one assistant-level group the stage's assignment
dialog offers for this stage is Funding Coordinator. The Author reaches the same workflow screen for their
own submission, but while reviews are underway they get no Reviewers panel at
all: no table, no reviewer identities. Whether and when a reduced read-only
list of completed reviews appears is owned by
[→ reading reviews as the author](U26-review-stage-and-rounds.md#author-read-review).

| Action | Who may — and when |
|--------|--------------------|
| **See the Reviewers panel and its rows** | • Review managers and assistant-level participants: every round of the stage<br>• Author: no panel while reviews are underway. Any reduced list of completed reviews belongs to the neighboring feature (see the preamble) <sup>a</sup> |
| **See declined and cancelled rows** | • Review managers only. An assistant-level participant's table silently omits those rows ⚠ [A6](#a6) <sup>a</sup> |
| **Add a reviewer** (search & select, "Add Reviewer") | • Review managers and assistant-level participants: any round, including past rounds. The past-round oddity is recorded with the [→ round machinery](U26-review-stage-and-rounds.md#rounds) <sup>a</sup> |
| **"Create New Reviewer" / "Enroll Existing User"** | • Journal Manager, Editor, assigned Section Editor and Guest Editor: the two links inside the Add Reviewer window. A Site Administrator's access runs through such a journal role (see the preamble)<br>• Assistant-level participants: the two links never appear <sup>a</sup> |
| **Manage an assignment** (row actions: "Read Review", "Send Reminder", "Thank Reviewer", "Revert Decision", and the menu's "Review Details", "Edit", "Unassign Reviewer"/"Cancel Reviewer", "Email Reviewer", "History", "Resend Review Request", "Log Response", "Reinstate Reviewer") | • Review managers and assistant-level participants, depending on the assignment's state. Rule 3 says when each action appears and in which order the menu lists them; the operations are Rules 12–21; the Email Reviewer window is described under Fields<br>• Inside the Review Details window (Rules 14a–14d): the rating stars and "Mark as Complete" work for both groups. Saving in "Modify Review" is a review manager's. An assistant-level participant is offered the button, its dialog and the edit window all the same, but "Save Changes" answers "Error" / "The current role does not have access to this operation." / "OK" and nothing is saved ⚠ [A31](#a31) <sup>a</sup> |
| **"Editorial Notes"** | • Site Administrator, Journal Manager, Editor, Section Editor, Guest Editor: about a user holding a Reviewer role. They never meet their own row, because a reviewer of the submission is kept off its stages (see the preamble)<br>• Assistant-level participants: the entry is absent <sup>l</sup> |
| **"Login As" the reviewer** | • Whoever may impersonate that reviewer. The row entry appears only then. The rule is [→ who may impersonate whom](U01-login-and-sessions.md#who-may-impersonate) <sup>l</sup> |
| **Author on the workflow screen** | • None of the above. An assigned Author gets none of these entries, even when they also hold an editorial role on the submission, because the panel itself is absent (see the preamble). The server-side refusals behind that, including the read operations for anonymous review types, are recorded in the footnote <sup>a</sup> |

## Fields & validation

**Add Reviewer window** (title "Add Reviewer"; opened by the panel's "Add
Reviewer" button). Its upper half is the reviewer search (Rules 5–8). Once a
reviewer is chosen, the name and email address are shown with a "Change" link
back to the search. The window's "Cancel" closes it at once, even with a
reviewer chosen: nothing asks and no reviewer is added.
The lower half holds the request form shared by all three add modes:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Reviewer selection | yes | The request form below, and its submit button, stay hidden until a reviewer is chosen. The window offers no way to submit without one <sup>d</sup> |
| "Choose a predefined message to use, or fill out the form below." | no | Email template chooser. It renders on every add, even with no alternate request templates to offer, as a one-option select ("Review Request") ⚠ [A19](#a19). When alternates do exist, all of them are listed ([A5](#a5), retired; the access check it questioned was reverted upstream) <sup>d</sup> |
| "Email to be sent to reviewer" | no | Rich-text request letter, prefilled from the chosen template. Placeholders for name, deadlines and the review link are filled at send time. Effectively required: submitting with the letter emptied fails with no on-screen feedback of any kind, yet still creates the assignment and never sends the request email ⚠ [A18](#a18) <sup>d</sup> |
| "Do not send email to Reviewer." | no | Checkbox. Skips the request email; the assignment is still created <sup>d</sup> |
| "Response Due Date" / "Review Due Date" (under "Important Dates") | yes | Date pickers, prefilled per the journal's review setup (Rule 9). The permanent guidance "Review due date must be greater or equal to response due date." states the rule; the Edit window shows it too. Submitting with the dates inverted is refused with no visible feedback: the window stays open and nothing is added ⚠ [A8](#a8). The pickers, shared with the Edit and Resend windows, take calendar picks or a date typed in the YYYY-MM-DD format (e.g. 2026-08-02). Input in any other format looks accepted on screen while the old value is silently submitted ⚠ [A16](#a16). They also accept dates already past without any warning ⚠ [A17](#a17) <sup>f</sup> |
| "Files To Be Reviewed" | no | Collapsed file list with one checkbox per file of the round, all ticked by default. The inline warning "No Files Selected" appears here only when the round has no files at all. Unticking every box triggers no warning in this window (Rule 11) <sup>d</sup> |
| "Review Type" | yes | Radio group "Anonymous Reviewer/Anonymous Author", "Anonymous Reviewer/Disclosed Author", "Open". Preselected per the journal's review setup <sup>d</sup> |
| "Public Visibility" | no | Checkbox "Publicly Show Reviewer Comments". Preselected per the journal's public-visibility default. Ticked, it adds a sentence to the "Mark this review as complete?" dialog (Rule 14a) and a confirmation before a completed review is modified (Rule 14b) <sup>d</sup> |
| "Review Form" | no | Select, shown only when the journal has active review forms. Default "None / Free Form Review". A section may designate a default form (Rule 10) <sup>d</sup> |

**Create New Reviewer mode** (link "Create New Reviewer" inside the Add
Reviewer window) adds account fields above the shared form:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Given name | yes | Required in the site's primary language <sup>e</sup> |
| Family name | no | A family name in a language requires a given name in that language <sup>e</sup> |
| Affiliation | no | Free text <sup>e</sup> |
| "Reviewing Interests" | no | Tag field over the site-wide interests vocabulary. Suggestions appear while typing <sup>e</sup> |
| Username | yes | Hint: "The username must contain only lowercase letters, numbers, and hyphens/underscores.". A duplicate is refused with the toast "The selected username is already in use by another user.". "Suggest" fills a lowercase proposal from the given name <sup>e</sup> |
| Email | yes | Must be a valid address. A duplicate is refused with the toast "The selected email address is already in use by another user." <sup>e</sup> |
| Reviewer role select | yes | Shown only when more than one reviewer group serves the stage. Otherwise the single group is used silently <sup>e</sup> |
| "Appear on the masthead" checkbox | — | Shown ticked and disabled. A new reviewer always appears on the masthead list of that group; the box is informational only <sup>e</sup> |

**Enroll Existing User mode** (link "Enroll Existing User"; the form is
headed "Enroll an Existing User as Reviewer"):

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Search By Name" (user autocomplete) | yes | Searches users already enrolled in the journal who hold no reviewer role of any kind. On a press, membership in either stage's reviewer group excludes the user on both stages. Submitting with the field empty shows the generic "This field is required." above it. Picking a user clears the message and the submit succeeds ([A14](#a14), retired) <sup>e</sup> |
| Reviewer role select | yes | Always shown. Even a single reviewer group renders as a one-option select, unlike Create New Reviewer, which then hides it <sup>e</sup> |
| "Appear on the masthead" checkbox | — | Shown ticked and disabled, as in Create New Reviewer <sup>e</sup> |

**Edit Review window** (row action "Edit"; title "Edit Review"): the two due
dates, "Review Type" radios, "Public Visibility" checkbox, the "Files To Be
Reviewed" file list, and the "Review Form" select. The select is offered only
while the review has not been submitted. Here, and only here, the "No Files
Selected" warning reacts to the checkboxes, appearing and disappearing as
boxes are ticked and unticked (Rule 11). Saving with the review due date
before the response due date is refused under the same date rule as at add
time ⚠ [A8](#a8). Its "Cancel" closes the window at once, even with a due
date changed: nothing asks, nothing is saved, and "Edit" opened again shows
the old date. Its top "Close" asks first after a change to the review due
date, the "Review Type" or the "Public Visibility" box (no other control
tried): "The data on this form has changed. Do you wish to continue
without saving?". Answered "Cancel", the question leaves the window open
with the change in place. Answered "OK", it closes the window and saves
nothing: the row is unchanged, and "Edit" opened again, on the same page or
after a reload, shows the old values. With nothing changed, "Close" closes
at once. <sup>g</sup>

**Send Review Reminder window** (row action "Send Reminder"; window title
"Review Reminder"): the reviewer's name and address (read-only); a template
chooser ("Choose a predefined message to use, or fill out the form below.")
preset to the reminder template and listing it with any alternates, where
picking one refills the message below; the editable message; and a read-only
"Review Schedule" block of three dates. While the reviewer has not responded
the dates are "Editor's Request", "Response Due Date" and "Review Due Date".
Once they have responded, "Response Due Date" gives way to "Review Acceptance
Date". The review due date shows in both variants. Submit button "Send
Reminder". <sup>h</sup>

**Thank Reviewer window** (row action "Thank Reviewer"): the reviewer's name
(read-only), a prefilled thank-you message, and the "Do not send email to
Reviewer." checkbox. Submit "Thank Reviewer". <sup>j</sup>

**Unassign/Cancel window** (row action "Unassign Reviewer" while the request
is unanswered, "Cancel Reviewer" once it is answered): the same template chooser as the reminder
window, here preset to the unassign or cancel notice template; the prefilled
notice message; and the "Do not send email to Reviewer." checkbox. The submit
button reads "Unassign Reviewer" or "Cancel Reviewer" to match (Rule 17).
**Reinstate Reviewer window**: the same shape, chooser included, with the
submit "Reinstate Reviewer" ([A20](#a20), retired: the shipped script bundle
briefly opened these windows, Send Reminder included, without their message
editor).
**Resend Review Request window** (on a declined row; no template chooser):
the message, the skip-email checkbox, plus fresh "Response Due Date" and
"Review Due Date" pickers. Each picker is preset from its own configured
interval, exactly as at add time ([A9](#a9), retired) (Rule 19).
<sup>k</sup>

**Email Reviewer window** (row action "Email Reviewer"): "To" (read-only,
showing the reviewer's name), Subject and Body. Both are marked required,
but only the subject is enforced ⚠ [A13](#a13). With both empty, the one
error shown is "This field is required." under Subject. Submit button
"Send Email". <sup>l</sup>

**Editorial Notes window** (row action "Editorial Notes"): one rich-text
field holding the notes kept about this reviewer, under the guidance "Record
notes about this reviewer that you would like to make visible to other
administrators, managers and all editors. Notes will be visible for future
review assignments." ⚠ [A4](#a4). **Log Response window** (row
action "Log Response"): one required radio, "Reviewer has accepted the
invitation to review" / "Reviewer has declined the invitation to review",
under the prompt "Record the response on behalf of the reviewer". Submit
"Log Response". <sup>k</sup> <sup>l</sup>

## Rules & state

1. **One table per round.** The "Reviewers" panel lists the selected round's
   review assignments. Each row is one reviewer of that round. There are five
   columns: "Reviewer" (full name), "Reviewer status", "Type" (review-type
   icons), "Actions" (the state's primary button or buttons, Rule 3) and
   "More Actions" (the ellipsis menu holding the remaining row actions). The
   same reviewer may sit on several rounds; each round shows only its own
   row. <sup>a</sup>
2. <a id="statuses"></a> **The status column.** Each row's status is
   recomputed from the assignment's real state every time the screen loads:

   | Status reads | When | Second line |
   |---|---|---|
   | "Request Sent" | Invitation out, no response, response not yet due | none. The "Response due: {date}" line is missing here, though the date is set ⚠ [A7](#a7) |
   | "Request Accepted" | Reviewer accepted, review not yet due | "Review due: {date}" |
   | "Overdue" (red) | No response and the response date passed | "Response due: {date}" |
   | "Overdue" (red) | Accepted and the review date passed | "Review due: {date}" |
   | "Request Declined" | Reviewer declined (hover: "The reviewer declined this review request.") | — |
   | "Request Resent" | Request re-sent after a decline, no response yet | "Response due: {date}", but the date shown is the review deadline ⚠ [A2](#a2) |
   | "Review Submitted" | Review in, no editor has opened it yet ([A10](#a10), retired: opening now marks it viewed); also after "Revert Decision" on a "Complete" row (Rule 16) | reviewer's recommendation {OJS} |
   | "Review Viewed" | An editor opened the review (Rule 14a); also after "Revert Decision" on a "Reviewer Thanked" row (Rule 16) | reviewer's recommendation {OJS} |
   | "Complete" | An editor marked the review complete (Rule 14a) | reviewer's recommendation {OJS} |
   | "Reviewer Thanked" | Thank-you sent or recorded; also a second "Mark as Complete" on a reverted, previously thanked review (Rule 16) | reviewer's recommendation {OJS} |
   | "Request Cancelled" | Assignment cancelled (hover: "The editor cancelled this review request.") | — |

   A "Competing Interests" badge is appended while the review carries a
   declared interest, the reviewer's or one an editor entered (Rule 14b),
   and stays once the policy that asked for it is emptied (Settings). An
   answer of "I do not have any competing interests" shows none.
   On a press, no recommendation line ever shows, because a press's review
   collects none [OMP1](#omp1). <sup>b</sup>
3. **What each status admits.** The row's offered actions follow the status.
   "Send Reminder" is the "Actions" button only in the two "Overdue" states.
   "Read Review" is the button in "Review Submitted" and "Review Viewed".
   "Thank Reviewer" and "Revert Decision" are the buttons in "Complete", and
   "Revert Decision" alone in "Reviewer Thanked". The other states get no
   "Actions" button. The "More Actions" menu of a non-cancelled row offers,
   in order: "Review Details" (the same window the "Read Review" button
   opens, Rule 14a), "Edit", the unassign entry ("Unassign Reviewer" while
   the request is unanswered, "Cancel Reviewer" once it is answered, Rule
   17), "Email Reviewer", "History", then "Login As" and "Editorial Notes"
   per the Actors table, "Resend Review Request" only on "Request
   Declined", "Log Response" only while the request is unanswered, and
   "Send Review To ORCID" when the reviewer has an authenticated ORCID iD
   (Rule 23). A request the reviewer never answered counts as answered from
   the moment an editor submits a review for them in "Modify Review" (Rule
   14d): the row then offers "Cancel Reviewer" and no "Log Response". On a
   cancelled row, "Reinstate Reviewer" stands in place of the first three
   entries; the rest of the menu is unchanged. <sup>a</sup>
4. **The round's status line follows this table.** Adding reviewers,
   receiving reviews and confirming reviews move the round status box
   described in
   [→ the round status](U26-review-stage-and-rounds.md#round-status). This
   spec never restates those sentences.
5. <a id="search"></a> **Finding a reviewer.** The Add Reviewer window opens
   on "Locate a Reviewer": a searchable list of every user holding a
   reviewer role for the stage. On a press the opening, unsearched list does
   not honor the stage split, and a reviewer of the other stage selected
   from it is added ⚠ [OMP2](#omp2). Past 30 entries the list
   is paged behind a "View additional pages" bar. Each entry shows the name,
   affiliation and ORCID iD. The iD is a link showing the iD URL; an
   unauthenticated iD carries the suffix "(unauthenticated)" and an outline
   ORCID logo, an authenticated one the bare URL and the solid logo. The
   entry also shows the count of completed reviews ("0" for a reviewer never
   assigned), a "{N} active" badge only while the reviewer has at least one
   active review (a never-assigned reviewer's entry carries none), "Reviewer
   rating: {N}" stars, days since the last assignment, and reviewing
   interests. The days read "{N} days ago" from two days on, "Yesterday"
   for one day and also for a reviewer assigned today ⚠ [A36](#a36), and
   "Never assigned" for a reviewer never assigned. The entry expands to
   full statistics, always shown: active reviews, "Reviews completed",
   "Review requests declined", "Review requests cancelled", "Days since
   last review assigned", "Average days to complete review". For a
   reviewer never assigned, "Days since last review assigned" carries no
   figure. "Reviewing Interests",
   "Editorial Notes" (when the viewer may read them) and "Biography" appear
   only when there is data; an empty section is omitted, not shown blank.
   <sup>c</sup>
6. **Search aids.** There is a name search box and a "Filters" sidebar with
   five slider controls: "Rated at least" (stars), "Reviews completed",
   "Days since last review assigned" (range), "Active reviews currently
   assigned" (range), "Average days to complete review". Each slider sits
   disabled until its per-filter enable button is pressed; pressing the same
   button again clears the filter and disables the slider. While "Reviews
   completed" is enabled, a name search for a reviewer never assigned
   answers "No items found." ⚠ [A28](#a28). Above the list,
   the submission's author names with affiliations are shown so the editor
   can spot conflicts: the first four in bold, the rest collapsed behind a
   "Show All {N} Authors" / "Show Less" toggle. A reviewer whose affiliation
   matches an author's (case-insensitively) is badged "Same institution as
   author". <sup>c</sup>
7. **Locks and notices in the list.**
   - A reviewer already on this round is dimmed with "This reviewer has
     already been assigned to this review round." and cannot be selected
     again.
   - A user who can see the author's identity is locked. That means anyone
     with any assignment on the submission, and every Journal Manager and
     Site Administrator. The lock reads "This reviewer is locked because they
     have been assigned a role which allows them to view the author's
     identity. Anonymous peer review can not be guaranteed. Would you like to
     unlock this reviewer anyway?" with an "Unlock" link. Unlocking frees the
     Select button for that entry. <sup>c</sup>
8. **Later rounds.** From Round 2 on, reviewers who completed a review in the
   previous round are hoisted to the top of the list and flagged "This
   reviewer completed a review in the last round.". Their button reads
   "Reassign" instead of "Select Reviewer". The request email for any
   assignment on a later round defaults to the subsequent-round request
   template, sent as "Request to review a revised submission" (Side
   effects). <sup>c</sup> <sup>d</sup>
9. <a id="due-dates"></a> **Deadlines.** Every request carries a response due
   date (the date to accept or decline by) and a review due date. The
   defaults come from the journal's review setup, as weeks from today for
   each. When unset, the install falls back to 3 weeks for the response and
   4 for the review; the numbers belong to *Review setup & review forms*.
   The review due date may not precede the response due date ⚠ [A8](#a8),
   and nothing warns against a date already past ⚠ [A17](#a17) (Fields).
   <sup>f</sup>
10. **Review type, visibility, form.** Each assignment carries its own review
    type (the three-way anonymity choice), a public-visibility flag, and
    optionally one of the journal's review forms. The defaults come from the
    review setup and, for the form, from the submission's section. The type
    gates the author's access to the finished review
    ([→ reading as the author](U26-review-stage-and-rounds.md#author-read-review)).
    What the reviewer wizard shows is the *Reviewer's review* feature. The
    form can be changed (Edit window) only until the review is submitted;
    afterwards the selector disappears. <sup>d</sup> <sup>g</sup>
11. **File access.** The reviewer sees exactly the round files ticked in the
    "Files To Be Reviewed" list, at add time and at any later "Edit".
    Editing replaces the whole selection with the current checkboxes. Which
    files populate that list is the round's Files for Review set
    ([→ Files for Review](U26-review-stage-and-rounds.md#review-files)). The
    "No Files Selected" warning appears in the Add window only when the
    round's list is empty. Only the Edit window shows and hides it reactively
    as boxes are ticked and unticked. Either way nothing blocks saving: an
    assignment can be created or saved with no files granted at all.
    <sup>d</sup> <sup>g</sup>
12. **Editing notifies the reviewer.** Saving the Edit window with a changed
    due date or review type puts a "Review assignment updated." task in the
    reviewer's own list and emails them ([A11](#a11), retired) ⚠ [A12](#a12)
    (Side effects). An edit that changes only files or visibility sends
    nothing. <sup>g</sup>
13. <a id="reminders"></a> **Reminders.** "Send Reminder" exists only while a
    row shows "Overdue". An editor cannot send the reminder form to an
    on-schedule reviewer; the free-form "Email Reviewer" window has no such
    gate. Sending stamps a dated "Reviewer Reminded" milestone into the
    row's History (Rule 21).
    The reviewer's subsequent response erases that line ⚠ [A15](#a15).
    Separately, the install sends automatic reminder emails around each
    deadline. Their day-offsets are configured in *Review setup & review
    forms*, and each automatic send also lands in History. <sup>h</sup>
14a. <a id="read-review"></a> **The Review Details window.** "Read Review",
    or the menu's "Review Details", opens a side window titled "Review
    Details: {submission title}". The same window also opens from the
    submissions dashboard list's
    [→ review activity indicators](U23-submissions-dashboard.md#review-indicators):
    their popover's "View details" button (review not yet submitted) or
    "View unread recommendation" button (review submitted) leads here, and
    both entry paths show the same window, {OJS} recommendation included
    ([A25](#a25), retired: the popover path once dropped it). The rest of
    this rule is the window of a submitted review; what it shows on a
    request with no review yet is Rule 14c. The window
    shows the reviewer's name. It shows a
    guidance paragraph that still tells the editor they "may upload the file
    below", though the window offers no upload control ⚠ [A22](#a22).
    The window then shows the "Download Review Form" menu (Rule 15), and a
    summary block with a dated line naming the most advanced step the
    assignment has reached (at the end of this rule) and {OJS}
    "Recommendation: {label}". Where the journal has a competing-interests
    policy (Settings), or the review carries an answer given while it had
    one, a "Competing Interests" group follows the summary block. Its
    "Declaration" reads "I do not have any competing interests", or "I may
    have competing interests" followed by "Competing Interests" and the
    statement. Where nothing was answered, "Declaration" reads "-": on a
    request not yet reviewed (Rule 14c), and on a review an editor
    submitted without recording an answer (Rule 14d). Without a
    policy and without an answer the group is absent. Next come the
    "Reviewer Comments": the review form answers, or "For author and editor" and,
    separately, the editor-only comments, headed "For editor" {OJS} /
    "For editor only" {OMP}. It shows the
    "Reviewer Files" the reviewer attached, read-only. {OJS} It also shows a
    display-only "Reviewer Recommendation" group, so the recommendation
    appears twice, under two labels ⚠ [A23](#a23). Last comes a "Reviewer
    rating" star row ("No rating" or 1–5, under "Rate the quality of the
    review provided. This rating is not shared with the reviewer."). The
    footer buttons are "Cancel", "Modify Review" (Rule 14b) and "Mark as
    Complete". Merely opening the window marks a submitted review viewed,
    as soon as the window has loaded the review ([A10](#a10), retired: the
    label now means what it says). The row behind it reads "Review Viewed"
    once the window closes, when the table reloads, and stays there. A
    window closed within a moment of opening, before the mark is saved,
    can leave the row at "Review Submitted" until the page is reloaded
    ⚠ [A32](#a32). Clicking a
    rating star saves immediately, with the toast "Reviewer rating saved",
    and the rating persists across close and reopen. A star pressed while
    the window is still marking the review viewed is saved, toast
    included, but the stars can then fall back to "No rating" until the
    window is opened again ⚠ [A21](#a21).
    On a submitted review "Mark as Complete" is enabled; the two messages
    that keep it disabled belong to a request with no review (Rule 14c).
    Pressing it asks "Mark this review as complete?" with the text "You can
    still modify this review after marking it as complete. You will have
    the opportunity to thank the reviewer in the next step.". When the
    assignment's "Publicly Show Reviewer Comments" box is ticked (Edit
    window), that text opens with "This review will be made publicly
    visible alongside the article.". "Cancel" in the dialog changes
    nothing. Confirming shows "The review has been marked as complete.".
    The row turns "Complete" (with the recommendation
    under the status {OJS}) and offers "Thank Reviewer" and "Revert
    Decision"; a review thanked before a revert turns "Reviewer Thanked"
    instead (Rule 16). In the still-open window "Mark as Complete" goes
    disabled and "Modify Review" stays available.

    The dated line reads "{step}: {date and time}" and names the most
    advanced step the assignment has reached, ranked in this fixed order
    (a priority order, not the latest date):
    - "Reviewer Thanked", once the review is thanked (Rule 16) and while it
      is marked complete; "Revert Decision" hides it until the review is
      marked complete again.
    - "Review Completed", while the review is marked complete.
    - "Review Submitted".
    - "Request Accepted" or "Request Declined".
    - "Reviewer Reminded", once a reminder was sent (Rule 13).
    - "Request Sent".

    A reviewer who accepted and was then reminded (scenario 7's overdue
    review) reads "Request Accepted: …", because "Request Accepted" ranks
    above "Reviewer Reminded". After a second reminder a "Reviewer
    Reminded" line carries the latest reminder's date (Rule 21).
    A review thanked, taken back and marked complete again, either in this
    window or by a review decision whose "Notify Reviewers" step thanks the
    reviewer, still names the first thank and its date: "Revert Decision"
    takes back only the completion, and the thank, already sent, stands
    ([A33](#a33), retired).
    <sup>i</sup>
14b. **Modifying a review.** "Modify Review" first asks "Modify this
    review?" with the text "You are about to modify the review submitted by
    {reviewer name}. All modifications will be recorded in the activity
    log." and the buttons "Modify Review" and "Cancel". It then opens a
    second side window, "Modify Review", stacked over the first. That
    window names the submission, repeats "You are modifying a submitted
    review. All modifications will be recorded in the activity log." and
    {OJS} shows a "Submitted recommendation:" line. These are editable
    there:
    - The "For author and editor" comment, under the note "If this is an
      open peer review, this comment will also appear publicly alongside
      the article.". When the assignment carries a review form, the form
      stands in place of both comment blocks: its title, the line "The
      questions this journal asks reviewers to answer." (a press prints
      "this journal" too ⚠ [OMP6](#omp6)) and each question as an editable
      field, a required one marked "* Required". "Save Changes" with a
      required question empty is refused on screen, with "This field is
      required." under the question, and nothing is saved.
    - The "Reviewer Files": the "Upload" control lives here, not in the
      view window. It opens a three-step upload window ("1. Upload File",
      "2. Review Details", "3. Confirm"). Once that completes, the file is
      in "Reviewer Files" at once and stays whether or not the edit window
      is saved: after "Cancel", which then asks nothing, the view window
      lists it (Side effects).
    - {OJS} A required "Recommendation" select, preset to the submitted
      recommendation.
    - The competing-interests answer, where the journal has a
      competing-interests policy or the review already carries an answer:
      a "Competing Interests" group, "Declaration" with the radios "I do
      not have any competing interests" and "I may have competing
      interests (Specify below)"; the second opens a "Competing Interests"
      box for the statement. The reviewer's answer is preset. On a request
      with no answer neither radio is ticked, and a save that leaves both
      unticked records no answer. A saved change shows in the view window
      at once and adds or removes the row's badge (Rule 2).

    The editor-only comment is editable nowhere. It stays display-only in
    both windows, in both apps. "Cancel" returns to the view window. With
    anything typed, a dialog titled "Warning" first asks "The data on this
    form has changed. Do you wish to continue without saving?" with "Yes"
    and "No"; "Yes" drops the change, and the window opened again shows the
    comment as it was. "Save Changes" saves and closes the edit window with no
    notice, and the view window refreshes showing "Last modified by {user
    full name}" under its title along with the edited values. There is no
    further confirmation, with one exception: a review already marked
    complete whose assignment has "Publicly Show Reviewer Comments" ticked
    (Edit window) gets the dialog "Save changes to this review?" / "This
    review is publicly visible. Saving your changes will update it
    immediately on the public article page. All modifications will be
    recorded in the activity log." with "Save Changes" and "Cancel".
    "Cancel" there saves nothing and leaves the edit window open; "Save
    Changes" saves and closes it. Before the review is marked complete, the
    same ticked box asks nothing. Each save lands attributed in the
    submission's activity log (Side effects). On a request with no review
    the same save submits the review for the reviewer (Rule 14d).
    <sup>i</sup>
14c. <a id="no-review-window"></a> **The window on a request with no
    review.** "Review Details" sits in the menu of every row that is not
    cancelled (Rule 3), so the window also opens on a request whose review
    is not submitted: unanswered, accepted or declined. What it shows on a
    "Request Resent" row is open ⚠ [A42](#a42). Opening it changes nothing
    on the row. The dated line (Rule 14a) reads "Request Sent: …" on an
    unanswered request, "Reviewer Reminded: …" once that request was sent a
    reminder, "Request Accepted: …" on an accepted one and "Request
    Declined: …" on a declined one. "For author and editor" and the
    editor-only block each read "-", "Reviewer Files" reads "No Items",
    {OJS} the "Reviewer Recommendation" group reads "Recommendation -", and
    a review form's questions show unanswered. Where the "Competing
    Interests" group shows (Rule 14a), its "Declaration" reads "-". The
    "Download Review Form" menu, the rating row and the three footer
    buttons are all there, and a star saves with "Reviewer rating saved"
    although nothing was reviewed. "Modify Review" is enabled in each of
    these states (Rule 14d). "Mark as Complete" depends on the app:
    - {OJS} It sits disabled beside "A recommendation is required before
      this review can be marked as complete." in all three states, because
      a review nobody submitted carries no recommendation.
    - With a review form it sits disabled while a required question of
      the form is unanswered. A press shows "This review is incomplete and
      cannot be marked as complete yet." beside it; a journal shows the
      recommendation message there, since such a request carries no
      recommendation either.
    - {OMP} A press has no recommendation gate [OMP1](#omp1). On a request
      without a review form the button is enabled, and confirming it
      records a completed review nobody wrote ⚠ [OMP4](#omp4).
      <sup>i</sup>
14d. <a id="submit-for-reviewer"></a> **Submitting a review for the
    reviewer.** On a request whose review is not submitted, "Modify Review"
    is how an editor submits the review for the reviewer. The dialog
    and the window read as in Rule 14b, "the review submitted by
    {reviewer name}" and "a submitted review" included, and nothing on them
    says that the save submits anything ⚠ [A29](#a29); {OJS} the "Submitted
    recommendation:" line is absent and the "Recommendation" select opens
    empty. On an unanswered, accepted or "Request Resent" row, "Save
    Changes" does this:
    - The row turns "Review Submitted" ({OJS}: with the recommendation
      picked) with "Read Review", and its menu becomes an answered
      request's (Rule 3).
    - The view window reads "Review Submitted: {the moment of the save}"
      under "Last modified by {user full name}", with what the editor
      entered.
    - The request counts as accepted on the reviewer's behalf, and an
      acceptance the reviewer had already given keeps its date. The row's
      "History" (Rule 21) then lists "Request Accepted: {the moment of the
      save}" on a request that was not answered, and the reviewer's own
      acceptance date on an accepted one, above "Review Submitted". The
      reviewer is no longer asked to accept or decline: their list shows
      the review as submitted, and "View" opens it read-only on "4. Completion"
      ([→ after a submitted review](U28-reviewers-review.md#save-submit)).
    - No acceptance email goes out and no acceptance is logged (Side
      effects).

    {OJS} The save needs a "Recommendation". With none picked it is refused
    on screen, with "This field is required." under the select and the
    summary "Please correct one error. Go to Recommendation: This field is
    required."; nothing is saved, and "Save Changes" stays disabled until
    the select changes. On a press, a request without a review form (Rule
    14b) requires nothing: the window can be saved as it opens,
    submitting a review with no content ⚠ [OMP5](#omp5). A save that
    records only the competing-interests answer (Rule 14b) submits the
    review too: on a press with no content, on a journal once a
    "Recommendation" is picked ⚠ [A40](#a40). A "Request
    Declined" row offers the button, the dialog and the window too, but
    the save is refused with "This review not editable because it was
    declined." ⚠ [A30](#a30); once the request is re-sent (Rule 19) it
    goes through. Changing an already submitted review (Rule 14b) moves
    none of this: it keeps the reviewer's own submission date.
    <sup>i</sup>
15. **Downloading a review.** The Review Details window's "Download Review
    Form" menu offers the same four exports as ever: "Author-Only Sections
    Displayed" and "Editor Form Shows All Review Sections", each as PDF or
    XML. The author-only variants omit the editor-only comments and also
    hide the reviewer's identity; the reviewer is presented anonymized. The
    file downloads through the browser. <sup>i</sup>
16. **Thanking, and taking it back.** "Thank Reviewer" sends the
    acknowledgement, or only records it when the skip box is ticked. The row
    turns "Reviewer Thanked" and the on-screen notice reads "Thank you email
    sent to reviewer." or "Review marked as acknowledged. Email not sent.".
    "Revert Decision" asks "Unconsider this Review". Confirming returns a
    "Complete" row to "Review Submitted" and a "Reviewer Thanked" row to
    "Review Viewed", with no notice shown either way, so the review can be
    re-examined. The acknowledgement itself survives the revert: "Mark as
    Complete" on that "Review Viewed" row turns it "Reviewer Thanked"
    straight away, with "Revert Decision" alone and no second "Thank
    Reviewer": the thank already went out, and the revert takes back only
    the completion ([A27](#a27), retired). The review content is untouched and the revert
    is logged. <sup>j</sup>
17. <a id="unassign"></a> **Unassign vs Cancel.** While the request is
    unanswered, the entry reads "Unassign Reviewer", and removing them
    deletes the row outright. The notice reads "Reviewer removed." and
    nothing of the invitation remains on the round. Once it is answered, by
    the reviewer's accept or decline or by an editor submitting the review
    for them (Rule 14d), the entry reads "Cancel Reviewer". Cancelling
    shows the notice "Reviewer cancelled.". The row then stays, as
    "Request Cancelled", and only review managers keep seeing it
    ⚠ [A6](#a6). Both windows offer the notice email, each with its own
    template chooser and a skip box (Fields). <sup>k</sup>
18. **Reinstate.** "Reinstate Reviewer" on a cancelled row restores the
    assignment to the state its dates imply (accepted, overdue, submitted…),
    with an optional notice email. The notice reads "Reviewer reinstated."
    <sup>k</sup>
19. **Resend after a decline.** "Resend Review Request" on a declined row
    asks the reviewer to reconsider, with fresh response and review due dates
    (Fields) and an optional email. The notice reads "Request to reconsider
    the review assignment was sent." The row becomes "Request Resent" until
    the reviewer responds again ⚠ [A2](#a2). Its menu again offers "Unassign
    Reviewer" and "Log Response", because the request counts as unanswered
    once more. <sup>k</sup>
20. **Logging a response.** When a reviewer answers by email instead of
    clicking, "Log Response" records the acceptance or decline on their
    behalf. The row moves to "Request Accepted" or "Request Declined"
    exactly as if the reviewer had clicked. The reviewer receives no email,
    and the assigned editors get the same response notification a real
    reviewer click sends, with its From header set to the reviewer's own
    address. The entry exists only while the invitation is unanswered.
    <sup>k</sup>
21. <a id="history"></a> **History.** "History" opens a side modal titled
    "History" listing the assignment's dated milestones, one line each,
    "{milestone}: {date and time}" with the milestone in bold, oldest
    first. The milestones are:
    - "Request Sent"
    - "Reviewer Reminded"
    - "Request Accepted" or "Request Declined"
    - "Review Submitted"
    - "Review Completed", the moment the review was marked complete
    - "Reviewer Thanked"

    A milestone the assignment has not reached is left out. The assignment
    keeps one reminder date, overwritten by each reminder, so a reviewer
    reminded twice shows one "Reviewer Reminded" line carrying the latest
    reminder's date. The reviewer's
    response erases the "Reviewer Reminded" line ⚠ [A15](#a15). After
    "Revert Decision" the list ends at "Review Submitted": the "Review
    Completed" and "Reviewer Thanked" lines are gone, although the
    thank-you email went out: History shows only the dates the
    assignment currently tracks as reached, by design until a full event
    log replaces it ([A35](#a35), retired). Marked complete again, the
    review lists the first "Reviewer Thanked" date again, followed by the
    new "Review Completed" one.
    <sup>l</sup>
22. **Editorial Notes.** "Editorial Notes" opens the notes editors keep
    about a reviewer. Its guidance text names the audience: "administrators,
    managers and all editors" (Fields). The notes belong to the person, not
    the assignment: the same text appears, and is overwritten, wherever that
    reviewer is opened, on any submission ⚠ [A4](#a4). The reviewer never
    sees them. They also surface read-only in the reviewer search (Rule 5)
    for those allowed. <sup>l</sup>
23. **ORCID deposit.** A row whose reviewer has an authenticated ORCID iD
    offers "Send Review To ORCID", with the confirm "Send this review to the
    reviewer's ORCID?". The action is intended for completed reviews but is
    offered in every state ⚠ [A1](#a1). Confirming a completed review's
    deposit sends the review to the reviewer's ORCID record. The ORCID
    plumbing is the *ORCID integration* feature. <sup>i</sup>

## Side effects

- **Adding a reviewer** → the row appears with the notice "{name} was
  assigned to review this submission and sent an email notification.", or
  "{name} was assigned to review this submission and was not sent an email
  notification." with the skip box. The reviewer
  gets a "Review pending." task in their own task list. Unless skipped, they
  also get the request email (subject "Invitation to review" {OJS} /
  "Manuscript Review Request" {OMP}, or "Request to review a revised
  submission" on later rounds), sent under the acting editor's name. When
  the journal has reviewer one-click access enabled, the email carries a
  sign-in-free review link. The landing is the *Reviewer's review* feature;
  the invitation record is
  [→ user invitations](U06-user-invitations.md#invitation-states). The
  assignment is logged in the submission's activity log. <sup>m</sup>
- **Creating a new reviewer** → a user account is created with a generated
  password. Unless the skip box is ticked, a welcome email ("Registration as
  Reviewer…") carries the username and that password. The account must
  change its password at first sign-in
  ([→ forced password change](U01-login-and-sessions.md)). The new account
  joins the chosen reviewer group and its masthead list. <sup>e</sup>
- **Enrolling an existing user** → the user gains the chosen reviewer role
  permanently. No separate email is sent beyond the request itself.
  <sup>e</sup>
- **Editing an assignment** (date or type changed) → the reviewer task
  "Review assignment updated." plus the change-notice email. The email
  reports the just-saved deadlines (it long reported the pre-edit ones;
  [A11](#a11), retired: fixed upstream). Its unsubscribe link opens a page
  that does not offer this email type ⚠ [A12](#a12). <sup>g</sup>
- **Manual reminder** → the reminder email (subject "A reminder to please
  complete your review"), a "Notification sent." notice to the editor, a
  "Reviewer Reminded" date in History (erased once the reviewer responds
  ⚠ [A15](#a15)), and an activity-log entry. <sup>h</sup>
- **Automatic reminders** → the overdue-response and overdue-review reminder
  emails go out from the journal's principal contact when the configured
  day-offsets are reached (the clocks are in *Review setup & review forms*).
  Each send stamps the History "Reviewer Reminded" date and the activity
  log. A reviewer response resets the reminder bookkeeping. That is the
  same reset that erases the History "Reviewer Reminded" milestone
  ⚠ [A15](#a15). <sup>h</sup>
- **Marking a review complete** (Rule 14a) → the completion is logged in
  the submission's activity log, and the review is deposited to the
  reviewer's ORCID record when one is authenticated (the deposit consent
  flow is the *ORCID integration* feature). The reviewer's "Review
  pending." task is already gone by then: their own submit clears it
  (*Reviewer's review*). <sup>i</sup>
- **Modifying a review** (Rule 14b) → each save leaves one attributed
  activity-log row per part it changed: "The following was modified in this
  review: Comments.", {OJS} "…Reviewer Recommendation." and, for a
  changed competing-interests answer, "…Reviewer Competing Interests.".
  Each ends 'Select
  "View changes" to see a detailed summary of all modifications.'. The
  Comments row's "Settings" arrow holds that one action, "View changes",
  which opens a "View Review" window with "Updated Comments" over
  "Previous Comments": the new text, then the old. On a competing-interests
  row it shows "Updated Competing Interests" over "Previous Competing
  Interests", each "Competing Interests declared: YES" over "Competing
  Interests: {statement}", even for an answer of "I do not have any
  competing interests", whose statement is empty ⚠ [A39](#a39). A file added through the window's "Upload"
  is logged at once, saved or not, as 'Revision "{file}" was uploaded for
  file {N}.' under the editor's name. {OJS} Changing the recommendation on
  the reviewer's behalf runs through this window. <sup>i</sup>
- **Submitting a review for the reviewer** (Rule 14d) → the same rows
  under the editor's name (a comment and {OJS} a recommendation leave one
  each; a save with no comment ⚠ [A41](#a41)), and no "accepted" line for
  the reviewer. No acceptance email goes to the assigned editors, and the
  reviewer is sent nothing.
  <sup>i</sup>
- **Thanking** → the acknowledgement email (unless skipped) and the
  "Reviewer Thanked" date in History. <sup>j</sup>
- **Unassigning/cancelling** → the notice email (unless skipped). Both
  notices arrive under the subject "Your review for "{title}" has been
  cancelled"; the unassign notice's own subject, "Your reviewer assignment
  for "{title}" has been removed", is never the one sent, though its body
  is the removal text ("…you have been removed from the reviewer assignment
  for "{title}"…") ⚠ [A26](#a26). On a press that body ends "in
  {$journalName}." with the placeholder printed literally where the press's
  name belongs ⚠ [OMP3](#omp3). The reviewer's "Review pending." task is
  removed. The action is logged. The reviewer also leaves the submission's
  discussions: their "Details" no longer list them, even when one
  participant remains. A reviewer still holding an accepted request on
  another round stays; which others count is open ⚠ [A38](#a38)
  ([→ leaving the submission leaves its items](U37-tasks-and-discussions.md#leaving)).
  A place the reviewer holds on a stage's Participants panel stays.
  <sup>k</sup>
- **Reinstating / resending** → the respective email (unless skipped; the
  reinstate notice asks "Can you still review something for {journal}?")
  and a line in the submission's activity log. The resend's line reads
  "Resent the request to review in round {n} to {reviewer} for submission
  {$submissionid}.", with that placeholder printed literally where the
  submission's number belongs ⚠ [A37](#a37). <sup>k</sup>
- **Logging a response** → the same emails and bookkeeping as the reviewer's
  own accept or decline (owned by the *Reviewer's review* feature).
  <sup>k</sup>
- **Adding a suggested reviewer** → when the added or enrolled reviewer
  matches one of the author's reviewer suggestions, the suggestion is marked
  approved and disappears from the suggestions panel (the panel is the
  *Reviewer suggestions* feature). <sup>m</sup>

## Settings that modify behavior

All of these live on other features' screens. They are listed here for their
effect on this panel. The configuration surfaces belong to *Review setup &
review forms* unless said otherwise. <sup>n</sup>

- **Default review type**: preselects the "Review Type" radios.
- **Weeks to respond / weeks to complete**: the due-date defaults (Rule 9).
- **Automatic reminder day-offsets**: arm the automatic reminder emails
  (Rule 13).
- **Reviewer one-click access**: adds the sign-in-free keyed link to request
  and reminder emails. With it on, the editor-facing preview shows the link
  as a placeholder rather than the live address, and each sent reminder
  mints a fresh keyed link of its own. <sup>h</sup>
- **Public visibility default**: preselects the "Public Visibility" box.
- **"Competing Interests"** (Settings › Workflow › Review, "Reviewer
  Guidance"; empty at install): with a policy text there, the reviewer is
  asked about competing interests, a declared one badges the row (Rule 2),
  the Review Details window shows the answer (Rule 14a) and "Modify
  Review" lets an editor change it (Rule 14b). Emptied, new reviewers are
  not asked and a review never answered shows none of it; an answer given
  while a policy was set keeps its badge and its group, and stays
  editable.
- **Review forms**: populate the "Review Form" selects. A section's default
  form preselects it (section configuration is *Sections* territory).
- **Reviewer suggestions enabled** (workflow settings): the Add Reviewer
  window can be opened from a suggestion, arriving with that person
  preselected or prefilled. The suggestions panel itself is the *Reviewer
  suggestions* feature. <sup>d</sup>

## Cross-feature interactions

- **Review stage & rounds**: the stage screen, round machinery, round
  status box, Files for Review, and the author's read-only reviewers list.
  This spec owns everything inside the Reviewers panel and its windows.
- **Reviewer's review**: the reviewer's own experience, meaning the request
  landing, accept/decline, the wizard, and one-click access. Log Response
  (Rule 20) drives that feature's accept/decline path from the editor's
  side, and a review an editor submits for the reviewer (Rule 14d) ends it
  on that feature's completion step.
- **Review setup & review forms**: every default named in Settings, the
  reminder clocks, and review-form authoring.
- **Reviewer suggestions**: the suggestions panel and its "add" entry into
  this feature's window.
- **User invitations**: the invitation record behind one-click review
  links.
- **Sign-in & sessions**: "Login As" on a reviewer row, and the forced
  password change a created reviewer account goes through.
- **Users management**: the reviewer role memberships this feature creates
  (Create/Enroll) are otherwise managed there.
- **Editorial decision recording**: decisions close rounds. Nothing in this
  panel records a decision.
- **ORCID integration**: the review deposit behind Rule 23.
- **Tasks & discussions**: the reviewer's "Review pending." task cleanup on
  unassignment. An unassigned or cancelled reviewer also leaves the
  submission's discussions (Side effects); the rule is
  [→ leaving the submission leaves its items](U37-tasks-and-discussions.md#leaving).

## Canonical scenarios

Scenarios 2, 3, 4, 6, 7, 9, 11 and 20 run on a scratch journal with
throwaway accounts: a Journal Manager who also holds the Reviewer role and
a reviewer pool past thirty (2), a fresh address (3), a user to enroll (4),
reviewers whose mailbox and task list are read (6, 7, 9, 11), an active
review form (9) and a review setup of the journal's own (20). Every other
scenario, and scenario 20's control, runs on the seeded journal with ready
accounts and scratch submissions. Each email is read in the mailbox of the
address it was sent to. The accounts, the passwords and the tooling recipe
are in the footnote. <sup>s</sup>

1. **Invite a reviewer**

   Given: Editor, on a round with review files, with two Reviewers of the
   journal not yet invited.

   - **"Add Reviewer"**: press it: the window opens on "Locate a Reviewer"
     with no request form and no submit button below the list. Search the
     first reviewer by name and press "Select Reviewer": the name and email
     address show with a "Change" link, and the request form appears below
     them with the prefilled request letter and the two due dates
     ("Response Due Date", "Review Due Date"), preset from the journal's
     review setup.
   - **"Change"**: press it: the search shows again. Select the same
     reviewer again.
   - **The add**: press "Add Reviewer": the notice reads "{name} was
     assigned to review this submission and sent an email notification."
     and the row reads "Request Sent" (its "Response due:" line is missing
     ⚠ [A7](#a7)). The reviewer's mailbox holds the request email
     ("Invitation to review" {OJS} / "Manuscript Review Request" {OMP}),
     sent under the Editor's name, and the submission's activity log
     records the assignment. Verify the email arrived: a request submitted
     with the letter emptied creates the row without any feedback and sends
     nothing ⚠ [A18](#a18).
   - **"Editorial Notes"**: open the row's "More Actions" menu: it lists
     "Review Details", "Edit", "Unassign Reviewer", "Email Reviewer" and
     "History" in that order, then "Editorial Notes" and "Log Response".
     Press "Editorial Notes": the window shows one text field under the guidance
     "Record notes about this reviewer that you would like to make visible
     to other administrators, managers and all editors. Notes will be
     visible for future review assignments." ⚠ [A4](#a4).
   - **"Do not send email to Reviewer."**: add the second reviewer the same
     way with that box ticked: the notice reads "{name} was assigned to
     review this submission and was not sent an email notification." and
     the row reads "Request Sent".
   - **Control**: the second reviewer's mailbox holds no request email.
     <sup>s</sup>

2. **The list warns before anonymity breaks**

   Given: Journal Manager holding no Reviewer role, on a round with one
   reviewer invited, on a journal with over thirty Reviewers, one also a
   Journal Manager, the rest never assigned.

   - **The opening list**: press "Add Reviewer": the submission's author is
     named in bold above the list, the "Filters" sidebar offers the five
     sliders "Rated at least", "Reviews completed", "Days since last review
     assigned", "Active reviews currently assigned" and "Average days to
     complete review", each slider disabled until the enable button beside
     it is pressed, and the list shows 30 entries above a "View additional
     pages" bar. Press the enable button beside "Reviews completed": that
     slider is enabled (a name search made while it stays enabled drops the
     never-assigned reviewers ⚠ [A28](#a28)). Press the same button again,
     now reading "Clear filter: Reviews completed": the slider is disabled
     again. Search one of the never-assigned reviewers by name: the entry
     shows the name, the completed count "0" and "Never assigned", with no
     "{N} active" badge.
   - **A locked entry**: in "Locate a Reviewer", search the manager-reviewer
     by name: the entry is locked with "This reviewer is locked because they
     have been assigned a role which allows them to view the author's
     identity. Anonymous peer review can not be guaranteed. Would you like
     to unlock this reviewer anyway?" and no Select button. Press "Unlock":
     the "Select Reviewer" button appears. Select them and press "Add
     Reviewer": their row reads "Request Sent".
   - **An already-assigned entry**: open "Add Reviewer" again and search
     the first reviewer: the entry is dimmed with "This reviewer has already
     been assigned to this review round." and cannot be selected.
   - **Control**: the signed-in manager owns no row: "More Actions" on the
     first reviewer's row offers "Editorial Notes". <sup>s</sup>

3. **Create a brand-new reviewer**

   Given: Journal Manager, in the Add Reviewer window of a round, with a
   fresh email address.

   - **"Create New Reviewer"**: choose it: the account fields appear above
     the request form, and "Appear on the masthead" is ticked and disabled.
     Type "Petra" as the given name and the fresh address in Email, then
     press "Suggest" beside Username: a lowercase username appears.
   - **Duplicates refused**: replace the username with the Journal Manager's
     own username and press "Add Reviewer": the toast "The selected username
     is already in use by another user." appears. Restore the suggested
     username, replace the email with the Journal Manager's own address and
     press "Add Reviewer": the toast "The selected email address is already
     in use by another user." appears.
   - **The add**: restore the fresh address and press "Add Reviewer": the
     row reads "Request Sent", and the journal's users list shows the new
     account with the Reviewer role.
   - **The new account's mailbox**: holds the welcome email ("Registration
     as Reviewer…") with the username and a password, and the request
     email.
   - **First sign-in**: sign in with that password: the "Change Password"
     form opens ([→ sign-in flows](U01-login-and-sessions.md)).
   - **Control**: the create form shows no reviewer role select, one
     reviewer group serving the stage. <sup>s</sup>

4. **Enroll an existing user**

   Given: Journal Manager, in the Add Reviewer window of a round, with an
   Author of the journal who holds no reviewer role.

   - **"Enroll Existing User"**: choose it: the form is headed "Enroll an
     Existing User as Reviewer" with "Search By Name", a one-option
     reviewer role select and the ticked, disabled "Appear on the masthead"
     box. Press "Add Reviewer" with the field empty: "This field is
     required." shows above it. Type the Author's name and pick them: the
     message clears. Press "Add Reviewer": the row reads "Request Sent".
   - **The users list**: the journal's users list shows the user now also
     holds the Reviewer role.
   - **Control**: typing the name of an existing reviewer into the same
     autocomplete finds nothing. <sup>s</sup>

5. **Deadlines are validated**

   Given: Editor, in the Add Reviewer window of a round with no files, with
   a reviewer selected.

   - **"Files To Be Reviewed"**: the list is empty and shows the inline
     warning "No Files Selected".
   - **Inverted dates**: set "Review Due Date" before "Response Due Date"
     and press "Add Reviewer": no assignment is created and the window
     stays open. The only statement of the rule is the guidance sentence
     "Review due date must be greater or equal to response due date."; no
     error message appears ⚠ [A8](#a8).
   - **Control**: correct the dates and press "Add Reviewer": the row
     appears.

6. **Edit an assignment, reviewer is told**

   Given: Editor, on a round with two review files and a "Request Sent"
   row, whose Reviewer is ready to sign in.

   - **"Edit", the dates**: open the row's "Edit": the "Edit Review" window
     shows the guidance "Review due date must be greater or equal to
     response due date.". Set "Review Due Date" before "Response Due Date"
     and save: the save is refused and the window stays open ⚠ [A8](#a8).
     Set "Review Due Date" a week after the original date and save.
   - **The reviewer's side**: Reviewer: sign in: the header's Tasks panel
     holds "Review pending." and "Review assignment updated." for the
     submission, and the mailbox holds the change notice.
   - **"Files To Be Reviewed"**: Editor: open "Edit" again and untick every
     file: "No Files Selected" appears. Tick the first file back: the
     warning disappears. Save. Reviewer: the files offered for review are
     the first file alone.
   - **Control**: the reviewer's mailbox holds no second change notice and
     the Tasks panel no second "Review assignment updated.": an edit that
     changes only the file ticks sends nothing. <sup>s</sup>

7. **Remind an overdue reviewer**

   Given: Editor, on a round with three reviewers: one whose response date
   has passed without an answer, one who accepted and whose review date
   has passed, and one still on schedule.

   - **The overdue row**: reads "Overdue" in red with "Response due:
     {date}", and its button reads "Send Reminder".
   - **"Review Reminder"**: press "Send Reminder": the window shows the
     reviewer's name and address, the template chooser preset to the
     reminder template, the message, and the "Review Schedule" dates
     "Editor's Request", "Response Due Date" and "Review Due Date". Press
     "Send Reminder": the notice "Notification sent." appears and the
     reviewer's mailbox holds "A reminder to please complete your review".
   - **"History"**: open the row's "History": the "History" modal lists
     "Request Sent: {date and time}" and "Reviewer Reminded: {date and
     time}". Check it before the reviewer responds, because their response
     erases the "Reviewer Reminded" line ⚠ [A15](#a15).
   - **The overdue review**: the accepted reviewer's row reads "Overdue" in
     red with "Review due: {date}", and its button reads "Send Reminder".
     Press it: this time the "Review Schedule" dates are "Editor's
     Request", "Review Acceptance Date" and "Review Due Date". Press "Send
     Reminder" in the window: the notice "Notification sent." appears and
     the accepted reviewer's mailbox holds "A reminder to please complete
     your review".
   - **"Email Reviewer"**: on the on-schedule row open "Email Reviewer":
     "To" shows the reviewer's name. Type "A question about your review" in
     Subject and "Will you meet the review date?" in Body, then press "Send
     Email": the reviewer's mailbox holds that email.
   - **Control**: the on-schedule row, reading "Request Sent", offers no
     "Send Reminder" button. <sup>s</sup>

8. **Log a response on the reviewer's behalf**

   Given: Editor, on a "Request Sent" row.

   - **"Log Response"**: open it, choose "Reviewer has accepted the
     invitation to review", and press "Log Response": the row reads
     "Request Accepted" with "Review due: {date}".
   - **Control**: the "Log Response" entry is gone from that row's menu
     afterwards.

9. **Read, rate, mark complete, thank**

   Given: Editor, on a round of a journal with an active review form, where
   one Reviewer has submitted a review with both comment blocks and a second
   Reviewer's request is unanswered; both Reviewers are ready to sign in.

   - **"Read Review"**: the row reads "Review Submitted". Press "Read
     Review": the "Review Details: {submission title}" window opens and
     shows "Review Submitted: {date and time}" and the reviewer's comments
     split into "For author and editor" / "For editor" ({OMP}: "For editor
     only").
   - **"Reviewer rating"**: once the window has settled ⚠ [A21](#a21),
     click a star under "Reviewer rating": the toast "Reviewer rating
     saved" appears.
   - **The row after the window closes**: press "Cancel": the row reads
     "Review Viewed" ⚠ [A32](#a32), and still does after a reload of the
     page. Press "Read Review" again: the star is still selected.
   - **"Edit" after submission**: open the row's "Edit": the window offers
     no "Review Form" select.
   - **The unanswered row**: the second reviewer's row ("Request Sent") has
     no button where the first row shows "Read Review"; its "Edit" still
     offers the "Review Form" select.
   - **"Mark as Complete"**: in "Read Review" press it and confirm "Mark
     this review as complete?": the toast "The review has been marked as
     complete." appears; in the still-open window "Mark as Complete" is
     disabled and "Modify Review" stays available; the row turns
     "Complete" and offers "Thank Reviewer" and "Revert Decision".
   - **The reviewer's side**: Reviewer: sign in: the Tasks panel holds no
     "Review pending." for the submission. Editor: the submission's
     activity log records the completion.
   - **"Thank Reviewer"**: press it, then "Thank Reviewer" in the window:
     the notice reads "Thank you email sent to reviewer.", the row reads
     "Reviewer Thanked", and the
     thank-you is in the reviewer's mailbox. The row's "History" lists
     "Request Sent", "Request Accepted", "Review Submitted", "Review
     Completed" and "Reviewer Thanked", each followed by its date and
     time.
   - **"Revert Decision"**: press it and confirm "Unconsider this Review":
     the row returns to "Review Viewed" with no notice. "Read Review" shows
     the comments unchanged, and the activity log records the revert.
   - **The second reviewer's review**: Reviewer (the second): accept the
     request and submit a review. Editor: that row reads "Review
     Submitted".
   - **"Revert Decision" on "Complete"**: press that row's "Read Review",
     then "Mark as Complete" and confirm: the row reads "Complete". Press
     "Revert Decision" and confirm "Unconsider this Review": the row
     returns to "Review Submitted" with no notice, and "Read Review" shows
     the comments unchanged.
   - **Thank without email**: press that row's "Read Review", then "Mark as
     Complete" and confirm: the row reads "Complete" and offers "Thank
     Reviewer"; press "Thank Reviewer" and submit the window
     with "Do not send email to Reviewer." ticked: the notice reads "Review
     marked as acknowledged. Email not sent." and the row reads "Reviewer
     Thanked".
   - **Control**: the second reviewer's mailbox holds no thank-you, while
     the first reviewer's holds one. <sup>s</sup>

10. **Download the review**

    Given: Editor, in the "Review Details" window of a submitted review
    with both comment blocks.

    - **"Download Review Form"**: open it and fetch "Author-Only Sections
      Displayed (PDF)" and "Editor Form Shows All Review Sections (PDF)":
      both download.
    - **The author-only file**: omits the editor-only remarks and shows the
      reviewer anonymized.
    - **Control**: the full file carries both comment blocks and the
      reviewer's name.

11. **Unassign before, cancel after**

    Given: Editor, on a round with two reviewers: one invited and
    unanswered, and one who accepted and is also listed on the stage's
    Participants panel as a Funding Coordinator; the unanswered Reviewer is
    ready to sign in.

    - **"Unassign Reviewer"**: on the unanswered row the menu entry reads
      "Unassign Reviewer". Open it: the window shows the template chooser
      above the notice and the "Do not send email to Reviewer." box. Press
      "Unassign Reviewer": the notice reads "Reviewer removed." and the row
      is gone.
    - **The unassigned reviewer's side**: their mailbox holds the removal
      notice ("…you have been removed from the reviewer assignment for
      "{title}"…"), under the subject "Your review for "{title}" has been
      cancelled" ⚠ [A26](#a26) ({OMP}: its last words print "in
      {$journalName}." ⚠ [OMP3](#omp3)). Reviewer: sign in: the Tasks
      panel holds no "Review pending." for the submission.
    - **"Cancel Reviewer"**: Editor: on the accepted row the same menu entry
      reads "Cancel Reviewer". The window opens with its template chooser
      above the notice. Press "Cancel Reviewer": the notice reads "Reviewer
      cancelled.", the row stays as "Request
      Cancelled" (hover: "The editor cancelled this review request."), its
      menu offers "Reinstate Reviewer" in place of "Review Details", "Edit"
      and the cancel entry, and the reviewer's mailbox holds "Your review
      for "{title}" has been cancelled".
    - **Participants**: the stage's Participants panel still lists the
      cancelled reviewer as a Funding Coordinator.
    - **"Reinstate Reviewer"**: press it, then "Reinstate Reviewer" in the
      window: the notice reads "Reviewer reinstated.", the row returns to
      its dated state ("Request
      Accepted" or "Overdue"), and the reviewer's mailbox holds the
      reinstate notice ("Can you still review something for {journal}?").
    - **Control**: the reinstated row's menu again offers "Review Details",
      "Edit" and "Cancel Reviewer", with no "Reinstate Reviewer" entry.
      <sup>s</sup>

12. **Decline, then ask again**

    Given: Editor, on a round whose Reviewer declined the request.

    - **The declined row**: reads "Request Declined" (hover: "The reviewer
      declined this review request."), and its menu offers "Resend Review
      Request" and no "Log Response".
    - **"Resend Review Request"**: open it: the message, the "Do not send
      email to Reviewer." box and fresh "Response Due Date" and "Review Due
      Date" pickers, each preset from its own configured interval as at add
      time. Keep the dates and send: the notice reads "Request to reconsider
      the review assignment was sent.", the row reads "Request Resent" (its
      "Response due:" line prints the review deadline ⚠ [A2](#a2)), and the
      reviewer's mailbox holds the reconsider request.
    - **Control**: the resent row's menu again offers "Unassign Reviewer"
      and "Log Response". <sup>s</sup>

App-specific:

13. **Two review stages, two reviewer pools** {OMP}

    Given: Press Editor, on a monograph in Internal Review, with an Internal
    Reviewer, an External Reviewer and an Author of the press.

    - **Internal Review's "Add Reviewer"**: search the Internal Reviewer by
      name: found. Search the External Reviewer by name: "No items found.".
      Assert through the search, because the window's opening, unsearched
      list does not apply the split ⚠ [OMP2](#omp2).
    - **Internal Review's "Enroll Existing User"**: type the External
      Reviewer's name into "Search By Name": nothing is found.
    - **Control**: type the Author's name: found.
    - **External Review's "Add Reviewer"**: record "Send to External
      Review", press "Add Reviewer" there and repeat: now the External
      Reviewer is found and the Internal one is not [OMP1](#omp1).
    - **External Review's "Enroll Existing User"**: type the Internal
      Reviewer's name: nothing is found; the Author's name is still found.
      <sup>o</sup> <sup>s</sup>

14. **The recommendation runs through the table** {OJS}

    Given: Editor, on a "Complete" row of a journal (the end of scenario
    9's "Mark as Complete").

    - **The status cell**: shows the reviewer's recommendation under
      "Complete".
    - **"Review Details"**: the window displays it read-only, on its
      "Recommendation:" line and again in the "Reviewer Recommendation"
      group ⚠ [A23](#a23). Changing it on the reviewer's behalf runs
      through "Modify Review" (scenario 16).
    - **Control** {OMP}: on a press neither the status cell nor the window
      shows any recommendation [OMP1](#omp1).

15. **No reviewer surfaces on a preprint server** {OPS}

    Given: Preprint Server Manager, on any preprint's workflow.

    - **The workflow screen**: no "Reviewers" panel exists on any of its
      screens.
    - **Users & Roles**: offers no reviewer group to assign.
    - **Email templates**: the server's email templates (Settings ›
      Workflow › Emails) hold no reviewer-flow template: no review request,
      no reminder, no cancel notice.
    - **Control**: the same workflow screen offers the Production stage's
      own controls, so the screen itself is working. <sup>p</sup>

16. **The editor modifies a submitted review**

    Given: Editor, in the "Review Details" window of a submitted review
    with both comment blocks.

    - **"Modify Review"**: press it: the dialog "Modify this review?" reads
      "You are about to modify the review submitted by {reviewer name}. All
      modifications will be recorded in the activity log.". Confirm: the
      "Modify Review" window opens stacked over the first, naming the
      submission ({OJS}: with a "Submitted recommendation:" line).
    - **"Cancel"**: with nothing typed, press it: the "Modify Review"
      window closes and the view window shows again. Press "Modify Review"
      and confirm again.
    - **"Save Changes"**: replace the "For author and editor" comment with
      "Revised by the editor." ({OJS}: also pick a different
      "Recommendation") and press "Save Changes": the edit window closes,
      and the view window shows "Last modified by {name}" under its title
      with the edited text ({OJS}: and the new recommendation; a press has
      no recommendation field [OMP1](#omp1)).
    - **The activity log**: lists "The following was modified in this
      review: Comments." ({OJS}: and a second row, "…Reviewer
      Recommendation.") attributed to the Editor. Open the Comments row's
      "Settings" arrow: "View changes" is its one action.
    - **Control**: the "For editor" ({OMP}: "For editor only") comment
      offers no edit control in either window. <sup>s</sup>

17. **The Author sees no Reviewers panel**

    Given: Author, whose submission is in review with a reviewer's request
    underway.

    - **The review stage**: open the submission from My Submissions and
      its review stage: no "Reviewers" panel, no table, no "Add Reviewer"
      and no reviewer identity anywhere on the screen.
    - **Control**: Editor: the same submission's review stage lists the
      reviewer's row in the "Reviewers" panel. <sup>s</sup>

18. **An assistant-level participant's panel**

    Given: Funding Coordinator, assigned to the review stage of a
    submission whose round has one reviewer invited.

    - **The panel**: the "Reviewers" panel lists the row with its five
      columns: "Reviewer", "Reviewer status", "Type", "Actions" and "More
      Actions".
    - **"Add Reviewer"**: press it: the window opens on "Locate a
      Reviewer" with no "Create New Reviewer" and no "Enroll Existing
      User" link.
    - **The row menu**: open the row's "More Actions" menu: it holds no
      "Editorial Notes" entry.
    - **Control**: Editor: on the same submission the Add Reviewer window
      offers both links and the row's menu offers "Editorial Notes".
      <sup>s</sup>

19. **A later round's request**

    Given: Editor, on Round 2 of a submission whose only Round 1 reviewer's
    review was marked complete, with a second Reviewer of the journal never
    assigned.

    - **Round 2's panel**: lists no reviewer, while "Review Round 1" still
      lists the completed reviewer's row alone.
    - **"Add Reviewer" on Round 2**: press it: the Round 1 reviewer sits at
      the top of the list, flagged "This reviewer completed a review in the
      last round.", with the button "Reassign".
    - **"Reassign"**: press it and, with the request letter prefilled, press
      "Add Reviewer": the row reads "Request Sent" on Round 2, and the
      reviewer's mailbox holds "Request to review a revised submission".
    - **Control**: the second reviewer's entry carries no flag and its
      button reads "Select Reviewer". <sup>s</sup>

20. **The journal's review setup presets the request**

    Given: Editor, on a round of a journal whose review setup allows one
    week to respond and two to complete, defaults the review type to
    "Open" and reviewer comments to publicly shown, with a Reviewer of the
    journal not yet invited.

    - **The request form**: press "Add Reviewer", search the reviewer by
      name and press "Select Reviewer": "Response Due Date" is preset to
      the date one week from today and "Review Due Date" to the date two
      weeks from today, "Open" is the selected "Review Type", and
      "Publicly Show Reviewer Comments" is ticked.
    - **The add**: press "Add Reviewer": the row reads "Request Sent". Open
      the row's "Edit": the "Edit Review" window shows "Open" selected and
      "Publicly Show Reviewer Comments" ticked.
    - **Control**: Editor, on the seeded journal: the Add Reviewer window,
      with a reviewer selected, presets both dates four weeks from today,
      selects "Anonymous Reviewer/Anonymous Author" and leaves "Publicly
      Show Reviewer Comments" unticked. <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the Review Details dated line past "Review Submitted:": "Review Completed:" on a review marked complete, "Reviewer Thanked:" on a thanked one, "Review Submitted:" again after "Revert Decision" (Rule 14a): likely bullets in scenario 9, which walks these states on the row and reads "History" on the thanked one
  - the reviewer's own file listed under "Reviewer Files", read-only, in the Review Details window (Rule 14a): reached through the reviewer's upload on their own screens, which scenario 9's reviewer skips
  - the thanked review marked complete again after "Revert Decision" turning "Reviewer Thanked" at once, with "Revert Decision" alone and no second "Thank Reviewer" (Rule 16): likely a bullet in scenario 9, after its "Revert Decision"
  - Review Details on that review naming the first thank and its date (Rule 14a): the same bullet
  - History ending at "Review Submitted" after "Revert Decision" on the thanked review, then, once it is marked complete again, listing the first "Reviewer Thanked" date followed by the new "Review Completed" (Rule 21): the same place in scenario 9
  - {OJS} the Review Details window opened from the dashboard's "View unread recommendation" showing the recommendation, as the row's window does (Rule 14a): likely a bullet in scenario 14
  - the competing-interests answer in "Modify Review": preset to the reviewer's answer, changed to a statement and back to "I do not have any competing interests", the row's badge added and removed with it, and the "…Reviewer Competing Interests." row in the activity log (Rules 2, 14b, Side effects): needs a journal with a "Competing Interests" policy, which no scenario sets
  - answers given under a "Competing Interests" policy kept after the policy is emptied: the badge and the group still shown, the answer still editable, and new reviewers no longer asked (Settings, Rule 2): the same journal, with its policy then emptied
  - the "Edit Review" window's top "Close" asking first after a change to the review due date, the "Review Type" or the "Public Visibility" box (no other control tried), the window kept open on "Cancel" and the change dropped on "OK", and closing at once with nothing changed (Fields): likely a bullet in scenario 6, which opens the row's "Edit"
  - the guard for A16 (issue report
    `docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md`): a review
    due date typed in another format ("11/12/2030") in the "Edit" and "Add
    Reviewer" windows is refused with a message beside the box, and the
    stored date is unchanged
  - the guard for A7 (issue report
    `docs/issues/U27-A7-request-sent-row-no-response-due.md`): an unanswered
    row reads "Request Sent" with "Response due:" and the response date,
    with the response and review dates set apart
  - the guard for A2 (issue report
    `docs/issues/U27-A2-request-resent-row-shows-review-deadline.md`): a
    resent request with two different dates reads "Response due:" with the
    response date
- **Rarely met**:
  - submitting a review for the reviewer: "Save Changes" in "Modify Review" on an unanswered, an accepted or a "Request Resent" row, with the row, its menu, the reviewer's side and the missing acceptance email after it, and {OJS} the save refused without a "Recommendation" (Rule 14d, Side effects): an editor enters a review on a reviewer's behalf in a rare week
  - the Review Details window on a request with no review: "Request Sent:", "Reviewer Reminded:", "Request Accepted:" or "Request Declined:", the empty blocks, and "Mark as Complete" disabled beside its recommendation message {OJS} or, with a review form, its incomplete-review message (Rule 14c): an editor opens the window to read a review, and on a request that has none only in a rare week
  - "Save changes to this review?" before modifying a complete review whose assignment has "Publicly Show Reviewer Comments" ticked, and the sentence the same box adds to "Mark this review as complete?" (Rules 14a, 14b): an editor completes or modifies a publicly shown review in a rare week
  - "Send Review To ORCID" with "Send this review to the reviewer's ORCID?" for a reviewer with an authenticated iD (Rules 3, 23): met only on a journal with ORCID enabled and a reviewer who linked an iD
  - the one-click placeholder in the editor's preview and a fresh keyed link per reminder (Settings, Rule 13): one-click access is off by default, and an editor with it on reads past the placeholder and never compares two reminders' links
  - "Editorial Notes" read-only in the reviewer search (Rules 5, 22): read there only after someone saved a note on that reviewer, a rare week
  - the reviewer search entry expanded to its full statistics (Rule 5): opened only when an editor weighs candidates, not on every add
  - the ORCID iD link styles in the reviewer search (Rule 5): shown only on a journal with ORCID enabled and reviewers who linked an iD
  - narrowing the reviewer search with a "Filters" slider (Rule 6): a pool of a page or two is read whole, never narrowed
  - the "{N} active" badge on a reviewer with a review underway (Rule 5): read only when an editor weighs a busy reviewer against a free one, not on every add
  - the "Competing Interests" group in the Review Details window ("Declaration": "I do not have any competing interests", "I may have competing interests" with the statement, or "-"), and the row's "Competing Interests" badge (Rules 2, 14a, 14c, Settings): met only on a journal that sets a "Competing Interests" policy, which the install leaves empty, or on reviews answered while one was set
- **Nothing new to test**:
  - the "Reviewing Interests" tag field of Create New Reviewer (Fields): filled only when an editor creates an account with interests to record
  - the chooser's refill on a pick (Fields): needs an alternate template a journal seldom adds
  - the blank list sections omitted (Rule 5): seen only in an expanded entry
  - "Modify Review" on a review with a review form: the questions editable, an empty required one refused (Rule 14b): the comment's path is the one scenario 16 walks
  - a file added through "Upload" in "Modify Review", kept and logged without a save (Rule 14b, Side effects): an editor attaches a file for a reviewer in a rare week
  - the unsaved-changes "Warning" on leaving "Modify Review" with something typed (Rule 14b): a close control
  - "View changes" opened to its "View Review" window (Side effects): scenario 16 reads the action, not the window behind it
  - "Cancel" in the Add Reviewer window with a reviewer chosen, and in the "Edit Review" window with a due date changed, closing without a question (Fields): a close control
  - the second ends of covered controls: an edit changing only the review type (Rule 12), the XML exports (Rule 15), a logged decline (Rule 20)
  - the press's Internal Review stage running scenarios 1–12 as External Review does (Purpose; scenario 13 covers what differs)
- **Register carries it**:
  - A6 (an assistant-level participant's table omitting declined and cancelled rows; Actors row 2, Rule 17)
  - A4 (one shared note per reviewer, rewritten from any submission; Rule 22)
  - A19 (the template chooser as a one-option select on every add; Fields)
  - A18 (an emptied request letter: the row created with no feedback and no email; Fields)
  - A8 (the inverted-date refusal showing no message; Fields, Rule 9)
  - A16 (a wrongly formatted typed date looking accepted while the old value is submitted; Fields)
  - A17 (past dates accepted without a warning; Fields, Rule 9)
  - A13 (Email Reviewer sending with an empty body; Fields)
  - A7 (a "Request Sent" row without its "Response due:" line; Rule 2)
  - A2 (a "Request Resent" row's "Response due:" line showing the review deadline; Rule 2)
  - A1 (the ORCID entry offered in every state; Rule 23)
  - OMP2 (the press's opening list ignoring the stage split, and the other stage's reviewer added from it; Rule 5)
  - A22 (the window's guidance promising an upload control; Rule 14a)
  - A23 (the recommendation shown twice, under two labels; Rule 14a)
  - A21 (a rating star pressed early saved while the open window can fall back to "No rating"; Rule 14a)
  - A12 (the change notice's unsubscribe page omitting the type; Side effects)
  - A15 (the reviewer's response erasing the "Reviewer Reminded" milestone; Rules 13, 21)
  - A26 (the unassign notice arriving under the cancel notice's subject; Side effects)
  - OMP3 (the press's unassign notice printing "{$journalName}" literally; Side effects)
  - A28 (a never-assigned reviewer dropping out of the search while "Reviews completed" is enabled; Rule 6)
  - A29 ("Modify Review" worded as an edit on a request with no review; Rule 14d)
  - A30 ("Modify Review" offered on a declined request and its save refused; Rule 14d)
  - A31 (an assistant-level participant offered "Modify Review" and refused on "Save Changes"; Actors row 5)
  - A32 (a Review Details window closed within a moment of opening, before the mark is saved, leaving the row "Review Submitted"; Rule 14a)
  - OMP4 (a press's "Mark as Complete" enabled on a request with no review; Rule 14c)
  - OMP5 (a press accepting an empty "Save Changes" as the reviewer's review; Rule 14d)
  - OMP6 (the review-form block saying "this journal" on a press; Rule 14b)
  - A36 (a reviewer assigned today reading "Yesterday" in the reviewer search; Rule 5)
  - A37 (the resend's activity-log line printing "{$submissionid}"; Side effects)
  - A39 ("View changes" reading "Competing Interests declared: YES" for an answer of no competing interests; Side effects)
  - A40 (the competing-interests answer recorded alone on a request with no review, submitting the review; Rule 14d)
- **No seed**:
  - the automatic reminder emails from the principal contact at the configured day-offsets, with their "Reviewer Reminded" and log stamps (Rule 13, Side effects, Settings)
  - a section's default "Review Form" preselected in the Add Reviewer window (Rule 10, Settings): the seed sets no default review form on a section
  - the reviewer role select when more than one reviewer group serves the stage (Fields): the seed creates no second reviewer group
  - "Show All {N} Authors" over the reviewer search (Rule 6): the seed builds no submission with more than four contributors
  - the "Same institution as author" badge (Rule 6): seeded accounts and contributors carry no affiliation
- **Owned by another feature**:
  - a review manager who is also a reviewer of the submission opening its review stage: the no-access box on every stage, so their own row's menu is never reached (Actors preamble and row 6; *Workflow screen & stage access*, its finding A4)
  - "Login As" on a reviewer row (Actors row 7; *Sign-in & sessions*)
  - the ORCID deposit itself, from the menu entry and on completion (Rule 23, Side effects; *ORCID integration*)
  - the round status box, adds on a past round and the review type gating the author's access (Rules 4, 10, Actors row 3; *Review stage & rounds*)
  - the 3- and 4-week fallback when the review setup is unset (Rule 9; *Review setup & review forms*)
  - a logged response's emails and bookkeeping (Rule 20, Side effects; *Reviewer's review*)
  - the invitation record behind the request (Side effects; *User invitations*)
  - adding a suggested reviewer, and the window opened from a suggestion (Side effects, Settings; *Reviewer suggestions*)
  - the one-click keyed link in request and reminder emails (Settings; *Reviewer's review*)
  - an unassigned or cancelled reviewer leaving the submission's discussions (Side effects; *Tasks & discussions*, scenario 11)

## Findings register

Verdicts are the author's judgment (claude, 2026-08-02), unreviewed unless an
entry notes otherwise; the team settles them on spec review. The summary is
sorted 🐞 → ❓ → ✅ and the entries below are the source; badges, Impact and
Basis: [Reading a spec](GLOSSARY.md#reading-a-spec).

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | "Send Review To ORCID" is offered on rows in every state, not only completed reviews | 🐞 | latent | — |
| [A2](#a2) | A reviewer's "Request Resent" row reads "Response due:" with the review deadline, not the response deadline | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A7](#a7) | Editors see no "Response due" date on a reviewer's "Request Sent" row in the Reviewers table | 🐞 | low | issues (claude), 2026-10-03 — re-verified |
| [A8](#a8) | Submitting inverted due dates is refused with no message; the form just stays open | 🐞 | user-visible | — |
| [A12](#a12) | The assignment-changed email's opt-out is offered nowhere; its own unsubscribe page omits the type | 🐞 | minor | — |
| [A13](#a13) | Email Reviewer sends with an empty body despite the body being marked required | 🐞 | minor | — |
| [A15](#a15) | The reviewer's response erases the dated "Reviewer Reminded" milestone from the assignment's History | 🐞 | minor | claim check (claude), 2026-08-02 — settled |
| [A16](#a16) | A due date typed in the wrong format looks accepted on screen, but the old value is silently submitted | 🐞 | medium | issues (claude), 2026-10-03 — re-verified |
| [A18](#a18) | Emptying the request letter makes the add fail silently, yet the assignment is created and the request email never goes out | 🐞 | user-visible | — |
| [A19](#a19) | The template chooser renders on every add, as a one-option select even with zero alternate templates | 🐞 | minor | — |
| [A21](#a21) | A rating star pressed just after the Review Details window opens is saved, yet the open window can fall back to "No rating" | 🐞 | user-visible | @beaug 2026-08-29 · risk accepted |
| [A22](#a22) | The Review Details guidance tells the editor to "upload the file below", but the window has no upload control | 🐞 | minor | @beaug 2026-08-29 · ticket to follow |
| [OMP2](#omp2) | {OMP} The Add Reviewer window's opening list ignores the internal/external stage split, and a reviewer of the other stage picked from it is added to the round; only searching filters by stage | 🐞 | user-visible | — |
| [A26](#a26) | The unassign notice reaches the reviewer under the cancel notice's subject, "Your review for "{title}" has been cancelled" | 🐞 | minor | — |
| [OMP3](#omp3) | {OMP} The unassign notice's body prints "{$journalName}" literally where the press's name belongs | 🐞 | minor | — |
| [A30](#a30) | "Modify Review" is offered on a "Request Declined" row, and its "Save Changes" is refused with "This review not editable because it was declined." | 🐞 | minor | — |
| [A31](#a31) | An assistant-level participant is offered "Modify Review", and "Save Changes" answers "The current role does not have access to this operation." | 🐞 | minor | — |
| [OMP4](#omp4) | {OMP} "Mark as Complete" is enabled on a request with no review; confirming records a completed review nobody wrote and leaves the reviewer on a first step that offers nothing | 🐞 | user-visible | — |
| [OMP6](#omp6) | {OMP} The Review Details windows introduce a review form with "The questions this journal asks reviewers to answer." on a press | 🐞 | minor | — |
| [A32](#a32) | A Review Details window closed within a moment of opening, before its mark as viewed is saved, can leave the row "Review Submitted", and the dashboard's "View unread recommendation", until a page reload | 🐞 | minor | @blessie 2026-09-24 · risk accepted, not fixing |
| [A36](#a36) | A reviewer assigned today reads "Yesterday" in the Add Reviewer list, while the entry's statistics give 0 days since the last assignment | 🐞 | minor | — |
| [A37](#a37) | After "Resend Review Request" the activity log reads "…for submission {$submissionid}." with the placeholder printed | 🐞 | minor | — |
| [A39](#a39) | "View changes" on a competing-interests change reads "Competing Interests declared: YES" for an answer of "I do not have any competing interests" | 🐞 | minor | @beaug 2026-09-30 · confirmed |
| [A40](#a40) | On a request with no review, "Save Changes" with only the competing-interests answer recorded submits the review for the reviewer, with no content on a press | 🐞 | minor | @beaug 2026-09-30 · confirmed on OMP |
| [A4](#a4) | Editorial Notes are one shared note per reviewer; editing them on one submission silently rewrites them everywhere | ❓ | user-visible | — |
| [A6](#a6) | Declined and cancelled rows are silently hidden from assistant-level participants, so the same table shows different reviewers per role | ❓ | minor | — |
| [A17](#a17) | The due-date pickers accept dates already past without any warning | ❓ | minor | — |
| [A23](#a23) | {OJS} The Review Details window shows the recommendation twice, under two different labels | ❓ | minor | — |
| [A28](#a28) | With the "Reviews completed" slider enabled, a name search for a reviewer never assigned answers "No items found." | ❓ | minor | — |
| [A29](#a29) | On a request with no review, "Modify Review" still speaks of "the review submitted by {reviewer name}", and nothing says that "Save Changes" submits the review for the reviewer | ❓ | user-visible | — |
| [A38](#a38) | Whether a request only sent, a completed review or {OMP} a request on the other review stage keeps a cancelled or unassigned reviewer in the submission's discussions is unsettled | ❓ | minor | — |
| [A41](#a41) | Which activity-log rows a review submitted for the reviewer with no comment leaves is unsettled | ❓ | minor | — |
| [A42](#a42) | What the Review Details window shows on a "Request Resent" row, its dated line included, is unsettled | ❓ | minor | — |
| [OMP5](#omp5) | {OMP} "Save Changes" with nothing entered is accepted on an unanswered request and submits an empty review for the reviewer | ❓ | minor | — |
| [OMP1](#omp1) | A press's review runs without reviewer recommendations, and with a per-stage reviewer pool (Internal vs External Reviewers) | ✅ | — | — |
| [A24](#a24) | Retired: a modification save on a request with no review completes it because it submits the review on the reviewer's behalf, the behavior upstream designed (pkp/pkp-lib#13337); screens do reach it (Rule 14d) | ✅ | retired | upstream change + claim check (claude), 2026-09-17 — overturned by design |
| [A25](#a25) | Retired: {OJS} opened from the dashboard popover, a submitted review's Review Details window omitted the recommendation; fixed upstream (pkp/ui-library#971) | ✅ | retired | re-verified live (claude), 2026-09-03 — fixed upstream |
| [A10](#a10) | Retired: opening the Review Details window now marks a submitted review viewed; the once-dead "Review Viewed" status is the designed behavior | ✅ | retired | upstream rework (claude), 2026-08-29 — overturned by design |
| [A27](#a27) | Retired: a review thanked, reverted and marked complete again reads "Reviewer Thanked" at once, with no second "Thank Reviewer"; intended, the revert takes back only the completion and the thank already went out | ✅ | retired | @jarda.kotesovec 2026-09-24 · intended |
| [A33](#a33) | Retired: a review thanked, taken back and marked complete again names the first thank in Review Details, not the newer completion; intended, the thank stands after a revert | ✅ | retired | @jarda.kotesovec 2026-09-24 · intended |
| [A34](#a34) | Retired: the new "Reviewer Reminded" label read as a raw key outside English before its translations arrived; not a finding, translations follow through the usual process | ✅ | retired | @jarda.kotesovec 2026-09-24 · not a finding |
| [A35](#a35) | Retired: after "Revert Decision", History drops the "Reviewer Thanked" line although the thank-you email went out; intended, History shows only the dates tracked today until an event log replaces it | ✅ | retired | @jarda.kotesovec 2026-09-24 · intended |
| [A20](#a20) | Retired: with minified scripts on, the Send Reminder, Unassign, Cancel and Reinstate windows opened without their message editor; fixed upstream (each app's script bundle recompiled) | ✅ | retired | re-probe (claude), 2026-08-27 — fixed upstream |
| [OPS1](#ops1) | Retired: {OPS} the unassign window's never-installed notice template is OPS's deliberate exclusion of all review email templates; no review process, and the window is unreachable | ✅ | retired | maintainer ruling + registry check (claude), 2026-08-27 — overturned |
| [A11](#a11) | Retired: the change notice reported the pre-change deadlines; fixed upstream (pkp/pkp-lib#13162) | ✅ | retired | rebase check (claude), 2026-08-25 — fixed upstream |
| [A5](#a5) | Retired: the alternate-template access check it questioned was reverted wholesale upstream (pkp/pkp-lib#10403 revert); all alternates are now listed unconditionally | ✅ | retired | rebase check (claude), 2026-08-25 — moot |
| [A3](#a3) | Retired: a role-less Site Administrator is refused at the workflow screen; the earlier full-surface observation was of the seeded admin's silent Journal Manager enrollment | ✅ | retired | claim check (claude), 2026-08-02 — overturned |
| [A9](#a9) | Retired: the Resend window presets each date from its own interval; the earlier collapse was a same-interval coincidence | ✅ | retired | claim check (claude), 2026-08-02 — overturned |
| [A14](#a14) | Retired: the enroll "required" message appears only on an empty submit and clears on pick, which is ordinary validation | ✅ | retired | claim check (claude), 2026-08-02 — overturned |

### All apps

<a id="a1"></a>
**A1 — ORCID deposit offered regardless of review state** · 🐞 · latent.
A reviewer row whose reviewer has an authenticated ORCID iD shows "Send
Review To ORCID" in its menu in every state, including before the reviewer
has even responded. The action only makes sense for a completed review. It
is latent because it needs ORCID configured and an authenticated reviewer
iD, which default test installs lack.
Basis: code reading. A live probe (2026-08-02) could only confirm the flip
side: without an ORCID on the reviewer, the entry is absent in every state
checked. Attaching an iD needs the external OAuth flow no screen here
provides. Settled by: a reviewer with a verified iD, any non-complete row,
open the menu. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — A reviewer's "Request Resent" row reads "Response due:" with the review deadline, not the response deadline** · 🐞 · low.
After an editor resends a review request to a reviewer who declined, the
reviewer's row in the Reviewers table reads "Request Resent" and
"Response due: {date}", but the date is the review deadline set in the
same window, not the response deadline. With a response due in two weeks
and a review in six, the row gives the six-week date as the day the
reviewer must answer by, until the reviewer answers. Only this row is
wrong: the reviewer's own list and the automatic response reminder count
from the response deadline. The real date is in the row's "Edit" window.
Basis: probe, 2026-10-03. <sup>[f-a2](#fn-a2)</sup>

<a id="a3"></a>
**A3 — Retired: the "role-less site admin" was a Journal Manager** · ✅ ·
retired.
Does not reproduce. A Site Administrator holding no journal role cannot
reach the workflow screen at all: the attempt is refused with the Error
dialog "The current role does not have access to this operation.". Positive
control: the same account renders the full Administration area. The
complete add surface observed earlier belonged to the seeded `admin`
account, which silently holds a Journal Manager role in every journal of
the install. A manager was observed, not a role-less site admin. The
Actors section now records the corrected fact. The live behavior is more
restrictive than was documented, and no open question remains.
Re-checked: claim check (claude), 2026-08-02 — overturned (was an open
question). <sup>[f-a3](#fn-a3)</sup>

<a id="a4"></a>
**A4 — Editorial Notes are one note per reviewer, everywhere** · ❓ ·
user-visible.
The "Editorial Notes" window is opened from one submission's reviewer row,
but the note it edits belongs to the reviewer as a person. The same text
shows for that reviewer on every other submission, and saving here
overwrites what a colleague wrote there. The window does name its audience
and future use: "Record notes about this reviewer that you would like to
make visible to other administrators, managers and all editors. Notes will
be visible for future review assignments.". It never says the note is one
shared text across submissions.
Question: is a single cross-submission note the intended design? Lean: the
storage is clearly deliberate (the search list shows the same note, and the
guidance promises future visibility), but the silent cross-submission
overwrite deserves a word in the window.
Basis: live probe (a note written on one submission read back verbatim from
another) + code reading (the note is stored on the user account, not the
assignment). <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Alternate templates listed under the wrong access check** · ✅ ·
retired.
The Add Reviewer window's template chooser builds its list of alternates to
the subsequent-round request template by checking, for each alternate,
whether the *subsequent-round template itself* is accessible to the editor,
not the alternate. A journal restricting individual alternate templates to
certain roles would find them offered (or hidden) wholesale.
Question: is per-alternate access meant to be enforced here? Lean: yes. The
sibling code path for the first-round template checks each alternate
individually; the mechanism is in the footnote.
Basis: code reading. <sup>[f-a5](#fn-a5)</sup>

> **Retired — rebase check (claude), 2026-08-25**: moot upstream. The whole
> per-user-group email-template access feature was reverted (pkp/pkp-lib#10403
> revert), removing both loops this entry compares — every alternate is now
> listed unconditionally, and no per-role template restriction remains to
> enforce. [A19](#a19)'s unconditional subsequent-round append is unchanged.

<a id="a6"></a>
**A6 — Assistant-level participants see a shorter reviewers table** · ❓ ·
minor.
For a review manager the table keeps declined and cancelled rows visible,
with their tooltips and the resend and reinstate entries. An assistant-level
participant assigned to the stage gets the same table with those rows
silently omitted. Nothing indicates rows are missing, so two people looking
at "the same" round see different reviewer counts.
Question: is hiding declined and cancelled history from assistants intended?
Lean: intended as written, because the visibility rule names exactly the
manager roles, but the silence is worth a product look.
Basis: live probe (a manager control saw all three row kinds where the
assistant's table showed one; the assistant's row menu also lacked "Login
As" and "Editorial Notes") + code reading.
<sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — Editors see no "Response due" date on a reviewer's "Request Sent" row in the Reviewers table** · 🐞 · low.
When an editor has invited a reviewer who has not answered yet, the
reviewer's row in the submission's Reviewers table reads "Request Sent"
and nothing else. The "Response due: {date}" line under it is missing,
though the date is set and the row's "Edit" window shows it. An accepted
row prints "Review due: {date}" there, and a request past its response
date "Response due: {date}". The editor has to open "Edit" on each row
to see by when a reviewer should answer. Basis: probe, 2026-10-03.
<sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — Inverted due dates are refused without a word** · 🐞 · user-visible.
Submitting the Add Reviewer form with the review due date set before the
response due date does nothing visible. There is no error and no notice; the
window simply stays open and no assignment is created. Only the permanent
guidance sentence states the rule. The server's own error message never
reaches the screen.
Basis: live probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — Retired: the Resend window presets dates correctly** · ✅ · retired.
Does not reproduce. On a journal whose response and review intervals differ,
the Resend window's fresh pickers arrive preset exactly as a new request's:
each date is today plus its own configured interval. The earlier "both
preset to the response interval" observation was made where the two
intervals coincide, so the apparent collapse was a coincidence, not a
behavior.
Re-checked: claim check (claude), 2026-08-02 — overturned (was a defect).
<sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — "Review Viewed" does not mean viewed** · ✅ · retired.
Opening the legacy "Read Review" window and closing it without confirming
left the row at "Review Submitted". Viewing never produced "Review Viewed".
The only route to that status was "Revert Decision" on a "Reviewer Thanked"
row, so the label misstated what happened in both directions.
Basis: live probe. <sup>[f-a10](#fn-a10)</sup>

> **Retired — upstream rework (claude), 2026-08-29**: overturned by design.
> The modify-reviews rework replaced the legacy read window with the Review
> Details window, and merely opening that window now marks a submitted
> review viewed — the row flips to "Review Viewed" live and survives a
> reload (probed 2026-08-29, both apps). The label finally means what it
> says; Rule 14a records the behavior.

<a id="a11"></a>
**A11 — The change notice tells the reviewer the old deadlines** · ✅ ·
retired.
When an editor saves new due dates in the Edit window, the email telling
the reviewer their assignment changed reports the dates as they were before
the edit. The screen shows the new dates; the reviewer is told the wrong
ones.
Basis: live probe (both apps; on OJS twice independently, and with both
date fields). <sup>[f-a11](#fn-a11)</sup>

> **Retired — rebase check (claude), 2026-08-25**: fixed upstream by
> pkp/pkp-lib#13162 — the notice is now composed from the assignment
> re-fetched after the edit is saved, so it reports the just-saved dates.
> Code-anchored, not re-probed. [A12](#a12) (the unreachable opt-out) is
> untouched and stands.

<a id="a12"></a>
**A12 — The change notice's opt-out is unreachable** · 🐞 · minor.
The assignment-changed email is suppressed for reviewers who opted out of
it, but no screen offers that opt-out. The email type is missing from the
profile's notification settings, and the unsubscribe page the email's own
footer links to does not list it either. The link dead-ends for its own
email type.
Basis: live probe. <sup>[f-a12](#fn-a12)</sup>

<a id="a13"></a>
**A13 — Email Reviewer enforces only the subject** · 🐞 · minor.
The window marks both Subject and Body required, but filling only the
Subject sends the email with an empty body. With both empty, the only error
shown is "This field is required." under Subject. The body never shows one.
Basis: live probe (both apps). <sup>[f-a13](#fn-a13)</sup>

<a id="a14"></a>
**A14 — Retired: the enroll "required" error is ordinary validation** · ✅ ·
retired.
Does not reproduce as stated. Driving the sequence cleanly (open the enroll
form, type, pick a user) shows no "This field is required." message at any
point. The message appears only after submitting with the field empty, and
picking a user then clears it; submitting afterwards succeeds. The earlier
observation most likely read that post-submit state as the post-pick state.
The empty-submit error is also the generic "This field is required.", not
an "existing user must be selected" wording.
Re-checked: claim check (claude), 2026-08-02 — overturned (was a defect).
<sup>[f-a14](#fn-a14)</sup>

<a id="a15"></a>
**A15 — The reviewer's response erases the History "Reviewer Reminded" line** · 🐞 ·
minor.
Sending a reminder stamps a dated "Reviewer Reminded" milestone into the
assignment's History. Once the reviewer responds, the line is gone. The
response resets the reminder bookkeeping, the same reset that re-arms the automatic
reminders (Side effects), and erases the dated History milestone with it.
The mechanism is deliberate; the user-facing cost is the lost History line.
Basis: live probe (the settling recipe run exactly: reminder, then History
shows the reminder line; an acceptance logged, then the line is gone).
Re-checked: claim check (claude), 2026-08-02 — settled from an open question
to a defect; both prior conflicting observations are explained (one read
History before the response, one after). <sup>[f-a15](#fn-a15)</sup>

<a id="a16"></a>
**A16 — A wrong-format typed due date is silently thrown away** · 🐞 · medium.
The due-date pickers (the Add, Edit and Resend windows share the widget)
accept a date typed in the YYYY-MM-DD format (e.g. 2026-08-02): it saves
and flows downstream. Input in any other format only looks accepted. The
visible field keeps the keystrokes while the old value is silently
submitted, so the editor's correction does not happen and nothing says so.
Basis: probe, 2026-10-03.
Re-checked: claim check (claude), 2026-08-02 — rescoped (a correctly
formatted typed date is accepted end-to-end; only wrong-format input is
discarded). <sup>[f-a16](#fn-a16)</sup>

<a id="a17"></a>
**A17 — Past due dates pass without a warning** · ❓ · minor.
The same pickers accept dates already in the past with no warning or
confirmation. A saved past date immediately renders the row "Overdue".
Question: should the screen warn? Lean: arguably intentional, since this is
the only screen route to backdating a deadline, but a warning would cost
nothing.
Basis: live probe. <sup>[f-a17](#fn-a17)</sup>

<a id="a18"></a>
**A18 — Emptying the request letter half-completes the add, silently** · 🐞
· user-visible.
Submitting the Add Reviewer form with the request letter emptied shows
nothing at all: no error, no toast, no error page. The window simply stays
open. But the assignment IS created. After a reload the reviewer sits at
"Request Sent" with a full row menu, while the request email never goes out
and reopening Add Reviewer shows the reviewer dimmed as already assigned.
The editor is told nothing and the reviewer is never actually invited. The
letter can also end up empty without the editor clearing it, though only at
a speed no person reaches: a reviewer selected within about a fifth of a
second of the window opening, before the letter's editor has loaded, leaves
the letter empty, and it never fills afterwards.
Basis: live probe (both apps, driven once per app; positive control: a
normal add delivers the request mail). <sup>[f-a18](#fn-a18)</sup>

<a id="a19"></a>
**A19 — The template chooser renders with nothing to choose** · 🐞 · minor.
The Add Reviewer window's template chooser ("Choose a predefined message to
use, or fill out the form below.") is meant to appear only when alternate
request templates exist, but it renders on every add. On a baseline journal
with zero alternates it shows a select with exactly one option, "Review
Request": a chooser with nothing to choose. Which alternates the chooser
lists is a separate question; see [A5](#a5).
Basis: live probe (both apps, baseline contexts checked to hold no
alternates; two acting roles on OJS) + code reading.
<sup>[f-a19](#fn-a19)</sup>

<a id="a20"></a>
**A20 — Four dialogs lose their editor under minified scripts** · ✅ ·
retired.
With the server's minified-script bundling on (the production default, and
the test installs' configuration), the Send Reminder, Unassign, Cancel and
Reinstate windows opened without their rich-text message. The editor never
initialized, so the notice could be neither read nor edited. With bundling
off the same flows worked end to end. The cause was app-side in all three
apps: the shipped script bundle was not recompiled after the 2026-08
dialog rework. Reported upstream 2026-08-27.
Since: 2026-08-26 (the rework's merge) · Basis: probe + code reading.
<sup>[f-a20](#fn-a20)</sup>

> **Retired — re-probe (claude), 2026-08-27**: fixed upstream the same day
> it was reported — each app recompiled its shipped script bundle, which
> now carries the dialogs' handler. Re-verified live with minified scripts
> on, on fresh installs: scenarios 7 and 11 ran green end to end on OJS and
> OMP. OPS's unassign observation [OPS1](#ops1) was tracked separately and
> was itself retired the same day.

<a id="a21"></a>
**A21 — An early rating shows "No rating" after it is saved** · 🐞 ·
user-visible.
On the opening that marks a submitted review viewed (Rule 14a), the
"Reviewer rating" stars can be pressed before that mark has been saved,
even once "Modify Review" is enabled. A star pressed then is saved and
"Reviewer rating saved" appears, but if the mark completes after the save,
the stars fall back to "No rating", with no message. The editor sees the
rating gone although it is stored: pressing "Cancel" and opening the
window again shows the star selected. A star pressed after the mark has
completed stays selected. The window offers no signal that the mark is
done, and the gap widens on a slow connection or a busy server.
Since: 2026-08-29 (the modify-reviews rework) · Basis: probe + code
reading. <sup>[f-a21](#fn-a21)</sup>

> **Reviewed — @beaug, 2026-08-29**: confirmed 🐞, risk accepted. Ruling: the
> entry stands and no fix is planned; the impact is low, since a failed
> early click is recoverable by clicking again. The maintainer will attempt
> a manual repro under network throttling. The mechanism was re-confirmed
> in code at that day's main tip (claude).

<a id="a22"></a>
**A22 — The window's guidance promises an upload control it lacks** · 🐞 ·
minor.
The Review Details window's guidance paragraph tells the editor they "may
upload the file below and then press 'Mark as Complete'". The window offers
no upload control anywhere; uploading a reviewer file lives only in the
"Modify Review" window (Rule 14b). The text contradicts the screen it sits
on. Upstream has already flagged the sentence's translation entry for
review.
Since: 2026-08-29 (the rework kept the legacy window's text) · Basis:
probe + code reading. <sup>[f-a22](#fn-a22)</sup>

> **Reviewed — @beaug, 2026-08-29**: confirmed 🐞 (the wording was called
> out before). Ruling: an upstream ticket to investigate is to follow. The
> string was re-confirmed unchanged at that day's main tip (claude).

<a id="a23"></a>
**A23 — The recommendation shows twice, under two labels** · ❓ · minor.
On a journal, the Review Details window prints the reviewer's
recommendation twice: once as the summary line "Recommendation: {label}"
and again in the display-only "Reviewer Recommendation" group further
down. It is the same value under two headings.
Question: is the duplication intended? Lean: an artifact of composing the
new window from stock blocks; one of the two would do. A press shows
neither ([OMP1](#omp1)).
Since: 2026-08-29 (the modify-reviews rework) · Basis: probe.
<sup>[f-a23](#fn-a23)</sup>

<a id="a26"></a>
**A26 — The unassign notice arrives under the cancel notice's subject** · 🐞
· minor.
An unanswered reviewer removed with "Unassign Reviewer" gets an email whose
subject reads "Your review for "{title}" has been cancelled" over the
removal wording ("…you have been removed from the reviewer assignment for
"{title}"…"). The unassign notice's own subject, "Your reviewer assignment
for "{title}" has been removed", is never sent. The reviewer is told two
different things in one message.
Basis: test run. <sup>[f-a26](#fn-a26)</sup>

<a id="a28"></a>
**A28 — "Reviews completed" hides the never-assigned reviewers** · ❓ · minor.
In "Locate a Reviewer", once the "Reviews completed" slider is enabled, at
its lowest value and nothing else changed, a name search for a reviewer
who was never assigned answers "No items found.". Clearing the filter
brings the entry back. An editor narrowing the list by completed reviews
loses the newcomers without a word.
Question: should a count filter admit reviewers with no review history, or
is dropping them the design? Lean: a defect, because the slider's lowest
value reads as "any number" and the same list shows those reviewers the
moment the filter is cleared; seen once per app, so it stays a question
until the search is re-driven with the slider enabled.
Basis: test run. <sup>[f-a28](#fn-a28)</sup>

<a id="a29"></a>
**A29 — "Modify Review" reads as an edit where it submits a review** · ❓ ·
user-visible.
On a request with no review (unanswered, accepted, re-sent or declined) the
dialog still reads "You are about to modify the review submitted by
{reviewer name}. …" and the window "You are modifying a submitted review.
…", although no review exists; {OJS} only the "Submitted recommendation:"
line is missing. Nothing on either screen says that "Save Changes" will
submit a review in the reviewer's name and end their request (Rule 14d).
Question: should the texts, and the button, say what they do when there is
no review to modify? Lean: yes. Submitting for the reviewer is the designed
behavior (pkp/pkp-lib#13337), but it reads as an edit, and an editor who
saves a note there has closed the reviewer's request.
Since: 2026-08-29 (the modify-reviews rework opened the window on every
row) · Basis: probe. <sup>[f-a29](#fn-a29)</sup>

<a id="a30"></a>
**A30 — "Modify Review" on a declined request is offered, then refused** · 🐞 · minor.
On a "Request Declined" row the Review Details window offers an enabled
"Modify Review", and the dialog and the edit window open as on any other
row. "Save Changes" is refused only after the editor has entered the
review: the notice reads "The form was not saved because 1 error(s) were
encountered. Please correct these errors and try again." and the window's
error summary "Please correct one error. Go to error: This review not
editable because it was declined.". There is nothing to correct. Nothing is
saved, the window stays open, the row stays "Request Declined", and leaving
asks the unsaved-changes warning (Rule 14b). The button should sit disabled
with that reason beside it, as "Mark as Complete" does on a journal, or the
message should name the way forward: once the request is re-sent with
"Resend Review Request", the same save goes through.
Since: 2026-08-29 (the modify-reviews rework) · Basis: probe.
<sup>[f-a30](#fn-a30)</sup>

<a id="a31"></a>
**A31 — An assistant-level participant is offered a "Modify Review" they cannot save** · 🐞 · minor.
A Funding Coordinator assigned to the stage gets the same Review Details
window as a review manager, "Modify Review" enabled. The dialog opens, and
the edit window opens with its fields, the competing-interests answer
(Rule 14b) included, and takes entries; "Save Changes" then answers "Error" /
"The current role does not have access to this operation." / "OK". Nothing
is saved, the row is unchanged, and leaving asks the unsaved-changes
warning (Rule 14b). The refusal is right and the offer is not: the button
should not be shown to a role that may not save.
Since: 2026-08-29 (the modify-reviews rework) · Basis: probe.
<sup>[f-a31](#fn-a31)</sup>

<a id="a32"></a>
**A32 — A review window closed quickly can leave the review unread on screen** · 🐞 · minor.
Opening a submitted review's Review Details window marks the review
viewed as soon as the window has loaded it, and the table behind it
reloads when the window closes (Rule 14a). An editor who closes the
window within a moment of opening it can still see "Review Submitted" in
the workflow's Reviewers row, or "View unread recommendation" in the
submissions dashboard's popover. Closed before the window has loaded the
review (about a fifth of a second on a quick server, longer on a slow
connection), the mark is sent only after the close: the Reviewers table
does not reload at all, and the dashboard's list reloads before the mark.
Closed later, while the mark is being saved, the table or list reloads
at the close but can read the review before the mark is saved. A page
reload shows "Review Viewed" and "View recommendation": the review was
marked, only the screen missed it. Expected, as before this change, the
row to read "Review Viewed" and the popover to offer "View
recommendation" once the mark is saved.
Since: pkp/ui-library#853 (`cab09538`, narrowed at `51f0c727`; merged
2026-09-24 as `1afd40a9`; issue pkp/pkp-lib#13359) · Basis: probe. <sup>[f-a32](#fn-a32)</sup>

> **Reviewed — @blessie, 2026-09-24**: confirmed 🐞, risk accepted.
> Ruling: not worth fixing; a person rarely closes the window that fast,
> and a reload shows the right state. A test that expects "Review Viewed"
> or "View recommendation" waits for the mark as viewed to be saved
> before it closes the window, as scenario 9 of the submissions dashboard
> does.

<a id="a36"></a>
**A36 — A reviewer assigned today reads "Yesterday"** · 🐞 · minor.
In the Add Reviewer list, a reviewer whose last request was sent today
reads "Yesterday" where the days since the last assignment show, while the
same entry expanded reads "0" for "Days since last review assigned". A
reviewer assigned one day ago reads "Yesterday" too, so an editor cannot
tell a reviewer invited this morning from one invited the day before. The
entry should read the same interval its own statistics give.
Basis: probe. <sup>[f-a36](#fn-a36)</sup>

<a id="a37"></a>
**A37 — The resend's activity-log line prints "{$submissionid}"** · 🐞 ·
minor.
After "Resend Review Request" on a declined row, the submission's activity
log gains "Resent the request to review in round 1 to {reviewer} for
submission {$submissionid}.", with the placeholder printed literally where
the submission's number belongs. The lines of the same log about the
assignment and the decline print the number.
Basis: probe. <sup>[f-a37](#fn-a37)</sup>

<a id="a38"></a>
**A38 — Which other requests keep a removed reviewer in discussions** · ❓ ·
minor.
A reviewer whose request is cancelled or unassigned leaves the
submission's discussions, and one still holding an accepted request on
another round stays (Side effects, "Unassigning/cancelling"). Whether a
request only sent, a submitted or completed review (a completed round 1
review when the round 2 request is cancelled), or {OMP} a request on the
other review stage keeps them there too has not been seen on screen.
Question: which of the reviewer's other requests should keep them in the
discussions? Lean: any request not declined or cancelled, a completed
review included, since that reviewer may still be asked about it there.
Basis: code. <sup>[f-a38](#fn-a38)</sup>

<a id="a39"></a>
**A39 — "View changes" says an interest was declared when none was** · 🐞 ·
minor.
On a "…Reviewer Competing Interests." row of the activity log, "View
changes" opens "View Review" with "Updated Competing Interests" and
"Previous Competing Interests", each reading "Competing Interests declared:
YES" over "Competing Interests: {statement}" (Side effects). An answer of
"I do not have any competing interests" reads "Competing Interests
declared: YES" too, with an empty statement, so a change from no interests
to a statement reads as one declared interest replacing another, and a
change back reads as an interest still declared. Expected, "declared: NO"
for that answer: "declared" read as "declared an interest" says the
opposite of the reviewer's answer.
Since: pkp/pkp-lib#13369 (issue pkp/pkp-lib#13291, 2026-09-23), on screen
since pkp/ui-library#993 (issue pkp/pkp-lib#13282, 2026-09-29) · Basis:
probe. <sup>[f-a39](#fn-a39)</sup>

> **Reviewed — @beaug, 2026-09-30**: confirmed 🐞. Ruling: valid; checked
> by hand in the activity log, which reads "Competing Interests Declared:
> YES" whatever the answer is changed to.

<a id="a40"></a>
**A40 — Recording a competing-interests answer submits the review** · 🐞 ·
minor.
On an accepted or unanswered request, an editor who opens "Modify Review"
only to record the reviewer's competing-interests answer (Rule 14b) submits
the review with it (Rule 14d). {OMP} On a press, ticking "I may have
competing interests (Specify below)", typing the statement and pressing
"Save Changes" turns the row "Review Submitted" with "Read Review" and the
"Competing Interests" badge, "-" in both comment blocks, and the
reviewer's request is closed: nothing asks for a review first. {OJS} On a
journal the save first asks for a "Recommendation" ("This field is
required."), and then submits. Expected, a change to the answer alone to
leave the request open; the editor changed the reviewer's declaration, not
the review. Next to [OMP5](#omp5).
Since: pkp/ui-library#993 with pkp/pkp-lib#13394 (issue
pkp/pkp-lib#13282, 2026-09-29) · Basis: probe. <sup>[f-a40](#fn-a40)</sup>

> **Reviewed — @beaug, 2026-09-30**: confirmed 🐞 on OMP. Ruling: a
> valid defect of OMP; a press's "Modify Review" has no validation in place
> of the journal's required "Recommendation", so the save submits
> whatever was entered.

<a id="a41"></a>
**A41 — The log rows of a review submitted with no comment** · ❓ · minor.
Which activity-log rows a save leaves when it submits the review for the
reviewer with no comment typed (Rule 14d) has not been seen on screen:
{OJS} a "Recommendation" alone, a press save with nothing entered
([OMP5](#omp5)), or the competing-interests answer alone ([A40](#a40)).
Question: should such a save leave a "…Comments." row? Lean: no; the log
should name only what the editor entered.
Basis: judgment. <sup>[f-a41](#fn-a41)</sup>

<a id="a42"></a>
**A42 — The Review Details window on a re-sent request** · ❓ · minor.
The window opened from a "Request Resent" row's "Review Details" has not
been seen on screen. The resend clears the decline, so its dated line
(Rule 14a) would no longer read "Request Declined: …"; which step and date
it names instead is unsettled.
Question: what should the dated line read? Lean: "Request Sent: {the
moment of the resend}", as the request is out again (Rule 19).
Basis: code. <sup>[f-a42](#fn-a42)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Per-stage reviewer pools, no recommendations** · ✅ · intended
divergence.
A press runs this feature on both of its review stages, each with its own
reviewer pool. Searching the Add Reviewer list on Internal Review finds the
users holding the Internal Reviewer role, and on External Review those with
External Reviewer. The window's opening, unsearched list does not yet apply
that split; that defect is OMP2. A press's review also collects no reviewer
recommendation, so the status cell's recommendation line and the Review
Details windows' recommendation displays and select simply do not exist
there. Nor does the recommendation gate on "Mark as Complete"; the
review-form gate is the same on both apps (Rule 14c). The author-facing side of that
same absence is recorded with the review stage (its finding "No reviewer
recommendation on a press").
Basis: live probe (the searched pool split, with positive and negative
controls on both stages; the read-review window verified without a
recommendation control) + code (the press disables reviewer recommendations
by design, since the 2026-08-25 rebase explicitly, via
`Application::hasCustomizableReviewerRecommendation()` returning `false`,
and scopes reviewer groups per stage). The author-side counterpart was
live-probed 2026-07-31 under the review-stage feature. Re-driven in the
claim check (2026-08-02): the search split held with positive and negative
controls in both directions on both stages, and the read-review window
again rendered no recommendation control. Re-probed 2026-08-29 on the
reworked Review Details windows: no recommendation group, line or select
anywhere, and "Mark as Complete" enabled immediately, no gate.
<sup>[f-omp1](#fn-omp1)</sup>

<a id="omp2"></a>
**OMP2 — The Add Reviewer window opens with both stages' pools** · 🐞 ·
user-visible.
On a press, the Add Reviewer window's opening list shows the reviewers of
both stages: Internal and External Reviewers alike, on either stage. Only
searching applies OMP1's per-stage split. A name from the other stage's
group returns "No items found." while the stage's own reviewers are found.
Picked from the opening list instead, a reviewer of the other stage is
added all the same. On Internal Review, "Select Reviewer" and "Add
Reviewer" on a person holding only External Reviewer show "{name} was
assigned to review this submission and sent an email notification.", the
row reads "Request Sent" on the internal round, also after a reload, and
the person's own reviewer list offers the request with "Respond to
request". The
stage split an editor relies on when searching does not hold when they
pick from the list.
Basis: live probe (positive and negative controls on both stages; the add
from the opening list driven on Internal Review).
<sup>[f-omp2](#fn-omp2)</sup>

<a id="omp3"></a>
**OMP3 — The unassign notice prints "{$journalName}" on a press** · 🐞 ·
minor.
On a press, the removal notice's sentence "…you have been removed from the
reviewer assignment for "{title}" in {$journalName}." reaches the reviewer
with that placeholder printed literally where the press's name belongs. On
a journal the same sentence carries the journal's name.
Basis: test run. <sup>[f-omp3](#fn-omp3)</sup>

<a id="omp4"></a>
**OMP4 — A press marks complete a review nobody wrote** · 🐞 ·
user-visible.
On a press the Review Details window of a request with no review and no
review form (unanswered, accepted or declined) offers an enabled "Mark as
Complete"; on a journal the missing recommendation keeps it disabled (Rule
14c). Confirming shows "The review has been marked as complete.". An
unanswered or accepted request's row turns "Complete" with "Thank Reviewer"
and "Revert Decision", its menu swaps "Unassign Reviewer" for "Cancel
Reviewer" and loses "Log Response", and the window's dated line (Rule 14a)
carries the moment of the click over two empty comment blocks. The reviewer finds
the request gone from "Action Required by me" and listed under "All
assignments" and "Completed" as "Review submitted on {date}"; "View" opens
step 1, "Request for Review", with a disabled "Save and continue" and steps
2 to 4 disabled: no accept, no decline, no completion page. On a declined
request the same notice shows and the row stays "Request Declined", while
the window's dated line takes the moment of the click and the button goes
disabled.
The window's guidance does invite completing a review that arrived
elsewhere, so the completion itself may be meant. Leaving the reviewer on a
first step that offers nothing is not: the upstream change that settles the
reviewer's side of a review an editor submits for them (pkp/pkp-lib#13338)
covers "Save Changes" only (Rule 14d).
Since: 2026-08-29 (the modify-reviews rework opened the window on every
row) · Basis: probe. <sup>[f-omp4](#fn-omp4)</sup>

<a id="omp5"></a>
**OMP5 — A press accepts an empty save as the reviewer's review** · ❓ ·
minor.
On a press "Modify Review" on an unanswered request can be saved exactly as
it opens, nothing typed: the window closes, the row turns "Review
Submitted" with "Read Review", and the view window reads "Review Submitted:
{the moment of the save}", "Last modified by {user full name}" and "-" in
both comment blocks. The reviewer's request is closed by a review with no
content. On a journal the required "Recommendation" happens to stop the
same save (Rule 14d). A save that records only the competing-interests
answer closes the request the same way ([A40](#a40)).
Question: should a save with no content be refused where no review exists?
Lean: yes. A press requires nothing unless a review form is attached, and
the reviewer's own empty submit is already recorded as a defect
([→ an empty review can be submitted](U28-reviewers-review.md#a7)).
Basis: probe. <sup>[f-omp5](#fn-omp5)</sup>

<a id="omp6"></a>
**OMP6 — The review-form block says "this journal" on a press** · 🐞 ·
minor.
On a press both Review Details windows introduce a review form's questions
with "The questions this journal asks reviewers to answer.", the journal's
sentence unchanged, where every other line of a press's screens says
"press".
Basis: probe. <sup>[f-omp6](#fn-omp6)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Retired: the missing unassign template is deliberate** · ✅ ·
retired.
The code observation stands: OPS never installs the default unassign
notice template, so the Unassign Reviewer window would fail outright
rather than render. But it is not a finding. The window is unreachable,
because no Reviewers panel exists anywhere on a preprint server (the
absence paragraph). And the "missing" pieces match OPS's baseline, which
deliberately ships no review-flow email templates at all: no review
request, reminder or cancel notice either (one review-round template in
its registry against nineteen in OJS's). So the 2026-08 rework's
template-and-locale companion was never applicable there. The one piece
OPS did need, the recompiled script bundle, it received ([A20](#a20)).
The earlier "latent fault" framing measured OPS against the OJS/OMP
baseline instead of its own.
Basis: code reading + registry check. <sup>[f-ops1](#fn-ops1)</sup>

> **Retired — maintainer ruling + registry check (claude), 2026-08-27**:
> overturned (was 🐞). Ruling: OPS has no review process, so a reviewer
> unassign notice cannot be relevant there — the never-reachable window is
> the deliberate absence's shadow, not a defect. Registry counts in the
> footnote.

### Retired

<a id="a24"></a>
**A24 — A modification save completes an incomplete review** · ✅ · retired. Overturned, 2026-09-17: screens do reach the save (Rule 14d), and completing the request is the editor submitting the review on the reviewer's behalf, designed upstream (pkp/pkp-lib#13337, finished by pkp/pkp-lib#13338); what stays open is [A29](#a29), [A30](#a30), [OMP4](#omp4) and [OMP5](#omp5). <sup>[f-a24](#fn-a24)</sup>

<a id="a25"></a>
**A25 — The dashboard popover's window drops the recommendation** · ✅ · retired. Fixed upstream (pkp/ui-library#971, `d3e19fc4`), in all three apps' lib/ui-library and re-verified live on OJS, 2026-09-03. <sup>[f-a25](#fn-a25)</sup>

<a id="a27"></a>
**A27 — A re-completed review skips "Complete" once it was thanked** · ✅ · retired. Intended, ruled by @jarda.kotesovec on 2026-09-24: "Revert Decision" takes back "Mark as Complete" only, and the thank, already sent, stands, so a re-completed review reads "Reviewer Thanked" with no second "Thank Reviewer" (Rule 16). <sup>[f-a27](#fn-a27)</sup>

<a id="a33"></a>
**A33 — Review Details names an older thank as the latest step** · ✅ · retired. Intended, ruled by @jarda.kotesovec on 2026-09-24: the thank stands after "Revert Decision", so a review marked complete again names that first thank and its date in Review Details (Rule 14a). <sup>[f-a33](#fn-a33)</sup>

<a id="a34"></a>
**A34 — "Reviewer Reminded" is untranslated in other languages** · ✅ · retired. Not a finding, ruled by @jarda.kotesovec on 2026-09-24: a new label arrives in English first and its translations follow through the usual process. <sup>[f-a34](#fn-a34)</sup>

<a id="a35"></a>
**A35 — History drops the thank after "Revert Decision"** · ✅ · retired. Intended, ruled by @jarda.kotesovec on 2026-09-24: History shows only the dates the assignment currently tracks, and a proper event log is to replace it later, so the "Reviewer Thanked" line leaving it after "Revert Decision" stands (Rule 21). <sup>[f-a35](#fn-a35)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Panel: lib/ui-library `managers/ReviewerManager/ReviewerManager.vue`
(VUE-046) mounted by the external-review block of
`workflowConfigEditorialOJS.js` (both apps — OMP defines no external-review
override; its internal-review block mounts the same component, atoms
AFFW-486, 488..501). Columns/top button:
`useReviewerManagerConfig.js::getColumns/getTopItems` (redacted author
variant drops status/actions columns and the Add button — the author view is
owned by review-stage-and-rounds, GRID-053/AFFW-487). Server ops:
`PKPReviewerGridHandler` (lib/pkp classes/controllers/grid/users/reviewer/) —
role map: manager, site admin, sub-editor = all ops; assistant = all minus
`createReviewer`, `enrollReviewer`, `gossip`; stage gate
`WorkflowStageAccessPolicy` + `ReviewRoundRequiredPolicy` /
`ReviewAssignmentRequiredPolicy`. Author denial:
`authorize()` blocks `_getAuthorDeniedOps()` (all mutating ops) for any user
with an author assignment on the submission — even one who also holds an
editorial role — and `_getAuthorDeniedAnonymousOps()` (reviewHistory,
reviewRead, sendEmail, gossip; the roster still lists `readReview`, an op
the 2026-08-29 modify-reviews rework deleted along with `readReview.tpl`
and `ReadReviewHandler.js`, so that entry is inert — code-read at lib/pkp
pkp/pkp-lib#13156) when the review method is anonymous/double-anonymous.
App chains: OJS `ReviewerGridHandler` still overrides `reviewRead`
(recommendation-by-proxy on the legacy op — the Vue windows no longer post
to it, note i; GRID-086); OMP's subclass is EMPTY (GRID-098) —
shared-behavior evidence. Row-menu roster and order (Rule 3):
`useReviewerManagerConfig.js::getItemActions`, code-read 2026-08-29 at the
same rework and probed live the same day on both apps — the primary
"Read Review" button on submitted/viewed rows and the menu's "Review
Details" both open the Review Details window (note i); on a cancelled row
the reinstate entry replaces the Review Details/Edit/unassign block while
the unconditional entries (Email Reviewer, History, and the gated ones)
still append. Declined/cancelled row visibility:
`PKP\submission\maps\Schema::getPropertyReviewAssignments()` skips
declined/cancelled rows unless `canSeeAllReviewAssignments()` — manager,
sub-editor or site admin among the user's roles at that stage (finding A6).
Assignment data shape: `reviewAssignment.json` schema (SET-020), serialized
per row incl. `canLoginAs`, `canGossip`, `reviewerHasOrcid`,
`competingInterests`. Live-probed 2026-08-02 (OJS + OMP, all round types):
the table's five column headers read "Reviewer" · "Reviewer status" ·
"Type" · "Actions" · "More Actions". Also live-probed 2026-08-02: the
submitting author's workflow view of a round with an active assignment
rendered no Reviewers panel at all — no table, no "Add Reviewer", no
reviewer identities (the reduced completed-reviews list is asserted with
review-stage-and-rounds); and the assistant-level participant's shortened
table is finding A6's live half (note f-a6). Claim check 2026-08-02, acting
as a Section Editor (Series Editor on the press): panel and rows, per-state
row menus, a completed add, both create/enroll links offered and the
Editorial Notes guidance verbatim — all as written; no "Login As" entry
appeared in any of that editor's row menus, consistent with the
impersonation rule. Site-admin gate: a genuinely role-less Site
Administrator is stopped by the stage-access check before the screen
renders (note f-a3); the seeded `admin` is enrolled as Journal Manager in
every journal of the test install, so any earlier full-surface "site admin"
observation was a manager observation. Claim check 2026-09-17 (OJS + OMP scratch contexts, after
pkp/pkp-lib#13338): the row menus re-read at three levels, Journal Manager,
an assigned Section Editor (Series Editor on the press) and an assigned
Funding Coordinator, in the states request sent, accepted, declined,
submitted, viewed, complete and cancelled — the order as in Rule 3, "Login
As" for the manager only, "Editorial Notes" for the manager and the
Section Editor, the Funding Coordinator's table without the declined row
(finding A6). The unassign entry and "Log Response" key on the assignment's
`dateConfirmed` (`getItemActions`), which `editReview` stamps since
pkp/pkp-lib#13338 (note f-a24): after an editor's "Save Changes" on an
unanswered request both apps' rows offered "Cancel Reviewer" and no "Log
Response". Inside the Review Details window the Funding Coordinator's star
saved with its toast and their "Mark as Complete" on a submitted review
turned the row "Complete"; their "Modify Review" save was refused (finding
A31, note f-a31). Still undriven: a Guest Editor
actor, a Section Editor completing create/enroll (the links are offered;
completion was probed as a manager), and a cancelled row viewed as a
Section Editor (code lean: the same visibility branch admits sub-editors).

<a id="fn-b"></a>
**b** — Status machine: `ReviewAssignment::getStatus()` (order: declined →
cancelled → request-resent → due-date arithmetic → thanked/complete/viewed/
received). Since the 2026-08-29 modify-reviews rework the viewed state is
set by opening the Review Details window — the PUT `…/consider` fired on
open (note i); re-driven live 2026-08-29 on both apps: opening flipped a
"Review Submitted" row to "Review Viewed" without a reload and the status
survived one. With pkp/ui-library#853 (driven 2026-09-23 at the PR heads
`cab09538` and `51f0c727`, before its merge) the row catches up when the
window closes instead, through the table's reload (Rule 14a, note f-a32). Cell rendering:
`useReviewerManagerConfig.js::getCellStatusItems` — titles quoted in Rule 2
from `editor.review.requestSent` "Request Sent", `.requestAccepted`,
`common.overdue`, `editor.review.requestDeclined`(+`.tooltip`),
`.requestCancelled`(+`.tooltip`), `.reviewSubmitted`, `.reviewViewed`,
`common.complete`, `editor.review.reviewerThanked`,
`editor.review.ReviewerResendRequest` "Request Resent"; sub-lines
`editor.review.responseDue` "Response due: {$date}" / `.reviewDue` "Review
due: {$date}" (the Request Sent cell renders no sub-line live — finding
A7); badge `reviewer.competingInterests`. Overdue math: response
overdue once the response date-time passes; review overdue from the day
before the review date ends (both dates fall back to end-of-day when no time
is stored). Recommendation line: `getRecommendationString()` resolves
against the journal's recommendation roster passed only by the OJS dashboard
(`DashboardHandler::setupIndex`, `pageInitConfig['recommendations']`); OMP
passes none (note f-omp1). Live-probed 2026-08-02: all eleven statuses
driven on OJS with titles, second lines, red "Overdue" styling and both
hover tooltips as quoted (a five-state OMP spot-check matched; the two
deviations are findings A7 and A2). The "Competing Interests" badge
renders from the assignment's `competingInterests` when it is non-empty
(`useReviewerManagerConfig.js`). Driven 2026-09-29 (OJS and OMP, two runs
each; contexts with a policy, without one, and with the policy emptied
mid-run): it showed for the reviewer's statement and for one an editor
entered in "Modify Review", not for "I do not have any competing
interests" (through the wizard or seeded), went when an editor set the
answer back to that, and stayed after the policy was emptied, where an
editor's new statement on a review answered "I do not have…" added it.
The same runs read the status table as quoted in Rule 2: an invited
request whose response date (two days back) and review date (one day
back) had both passed read "Overdue" / "Response due: {response date}",
and an accepted one with a past review date "Overdue" / "Review due:
{date}".

<a id="fn-c"></a>
**c** — Search surface: legacy form template `advancedSearchReviewerForm.tpl`
mounts `AdvancedSearchReviewerContainer.vue` (VUE-016; AFFW-621, 213–214) →
`SelectReviewerListPanel.vue` (AFFW-215, 217..220) and
`SelectReviewerListItem.vue` (AFFW-221..224). Data:
`AdvancedSearchReviewerForm::fetch()` builds
`PKPSelectReviewerListPanel` — apiUrl `users/reviewers` (the endpoint is the
users API's reviewers listing, owned by *Users management*; API-047 rider),
filters exactly as Rule 6 (`reviewer.list.filterRating` "Rated at least",
`.completedReviews`, `.daysSinceLastAssignmentDescription`,
`.activeReviewsDescription`, `.averageCompletion`), item labels
`reviewer.list.*` quoted in Rules 5–8 (`currentlyAssigned`, `warnOnAssign`,
`warnOnAssignUnlock` "Unlock", `reviewerSameInstitution`,
`assignedToLastRound`, `reassign` "Reassign", `neverAssigned`, `biography`,
`empty` "No reviewers found", filter
`showOnlyReviewersFromPreviousRound` "Assigned to Earlier Round"). Lock
roster (`warnOnAssignment`): all user ids with any stage assignment on the
submission + every manager/site-admin (comment: cannot guarantee anonymous
review); unlock is client-side per item (`isWarningBypassed`). Same-
institution badge: client-side affiliation string match against the
publication's author affiliations. Last-round list: assignments of round
N-1 with status complete/thanked. Author list aid: `submissionAuthorList`
labels, collapse guard `authorCount > 4` (AFFW-213/214). Interests roster
for the tag field and display: the site-wide interests vocabulary, served by
the interests lookup (API-048; mounted ojs+omp — OPS mounts only the generic
vocab controller, an install fact consistent with the absence paragraph).
Live-probed 2026-08-02 (OJS + OMP): the five filters and their strings as
quoted, each slider disabled until its per-filter enable button is pressed;
pagination past 30 entries (30 per page, "View additional pages"); expanded
entries omit the interests/notes/biography sections entirely when empty;
the author list bolds the first four names behind "Show All {N} Authors" /
"Show Less"; the same-institution badge fired on a live case-insensitive
affiliation match; round 2 hoisted the last-round reviewer to the top with
the notice and "Reassign" button. The locale string "Assigned to Earlier
Round" (`reviewer.list.showOnlyReviewersFromPreviousRound`) is wired to no
control — neither the Vue panel nor the PHP filter config references it, and
the live Filters sidebar shows exactly the five sliders; an orphaned string,
recorded here rather than in the register. ORCID display top-up probe
2026-08-07 (OJS; scratch journal, scratch reviewer with a DB-seeded `orcid`
user setting — no seeded reviewer carries an iD): with `orcidIsVerified`
unset, the entry rendered the iD as a new-tab link reading
"https://orcid.org/0000-0002-1825-0097 (unauthenticated)" — the
`orcid.unauthenticated` suffix appended by
`Identity::getOrcidDisplayValue()` — beside the outline (hollow) ORCID
logo (`OrcidUnauthenticated` icon); with `orcidIsVerified` set, the same
entry showed the bare iD URL, no suffix, beside the solid green logo
(`Orcid` icon). Both icons are decorative SVGs with no accessible name, so
the "(unauthenticated)" suffix is the only textual marker
(`SelectReviewerListItem.vue`: `item.orcid` → link, `item.orcidIsVerified`
→ icon, `item.orcidDisplayValue` → visible text). Test run 2026-09-13
(OJS and OMP, scenario 2, one run each): a never-assigned reviewer's entry
read the name, the completed count "0" and "Never assigned", with no
"active" text anywhere in it — `SelectReviewerListItem.vue` renders the
active badge only while `item.reviewsActive` is non-zero (`v-if=
"item.reviewsActive && canSelect"`), so "{N} active" is a conditional
badge, not a headline every entry shows; the earlier "0 active" reading
never appears. Neither suite asserts the badge either way. The count
filter's exclusion of never-assigned reviewers is finding A28 (note
f-a28). Driven 2026-09-28 (OJS and OMP, two runs each, browser and server
at UTC, 06:04–06:29; entries read in another journal's window and in the
assigning journal's own): a reviewer whose request was sent that morning
read "Yesterday" collapsed and "0" under "Days since last review assigned"
expanded (finding A36, note f-a36); one whose last review was backdated a
day read "Yesterday" and 1; two days, "2 days ago" and 2; a reviewer never
assigned "Never assigned", with no figure under "Days since last review
assigned".

<a id="fn-d"></a>
**d** — Add form shell: `ReviewerForm` (defaults: review method from context
`defaultReviewMode`, else double-anonymous; visibility from
`getDefaultReviewPublicVisibility()`; section review form via
`section->getReviewFormId()`); footer template `reviewerFormFooter.tpl`
(AFFW-634..641; labels quoted in Fields:
`stageParticipants.notify.chooseMessage`,
`editor.review.personalMessageToReviewer`, `editor.review.skipEmail`,
`editor.review.importantDates`(+`.notice`), `submission.task.responseDueDate`,
`editor.review.reviewDueDate`, `editor.submissionReview.restrictFiles`
"Files To Be Reviewed" / `.hide`, `.reviewType`, `.publicVisibility`,
`manager.setup.reviewOptions.publicReviewerComments.show`,
`submission.reviewForm`, `editor.submission.noReviewerFilesSelected`
"No Files Selected"); file list = `LimitReviewFilesGridHandler` (GRID-026)
over the round's review-file stage. Selection validation
`editor.review.mustSelect` "You must select a reviewer"
(AdvancedSearchReviewerForm) is a server-side backstop only — live-probed
2026-08-02: the request form and its submit button stay hidden until a
reviewer is chosen, so the screen cannot trip the message. Selected-reviewer
sub-form `advancedSearchReviewerAssignmentForm.tpl` (AFFW-623/624; "Change"
link = `manager.reviewerSearch.change`; since the 2026-08-25 rebase it also
renders `#selectedReviewerEmail` beside the name — dev-team#178). Execute path:
`EditorAction::addReviewer()` — duplicate-in-round and has-reviewer-role
checks (`_isValidReviewer`), assignment stamped notified/new, ticked files
granted per assignment (`ReviewFilesDAO::grant`), trivial notice
`notification.addedReviewer`/`.addedReviewerNoEmail`. Template roster:
round 1 default REVIEW_REQUEST, later rounds default
REVIEW_REQUEST_SUBSEQUENT, both plus all their alternates (unconditionally
since the 2026-08-25 rebase — finding A5, retired); the `hasCustomTemplates = count > 1` chooser gate
is meant to hide the chooser with only one template, but the unconditional
subsequent-template append always satisfies it, so the chooser always
renders (finding A19, note f-a19). The empty-letter failure mode of the
same form is finding A18 (note f-a18). Files-warning wiring: the
change-driven show/hide of `noFilesWarning` exists only in the Edit
window's handler (`EditReviewFormHandler.js`); the Add window's handler
(`AdvancedReviewerSearchHandler.js`) has no reference to it — live-probed
2026-08-02 (claim check): untick-all in Add showed no warning and saved
(row created, zero grants), while the warning rendered in Add over a
zero-file round, and the Edit window showed/hid it reactively. Suggestion
entry: `reviewerSuggestionId` prefills
selection (search), or name/email/affiliation (create), or user (enroll) —
`getReviewerForm()`; approval side effect note m. Driven 2026-09-28 (OJS
and OMP, two runs each, on a journal with an active review form and on
one without): "Cancel" pressed with a reviewer selected closed the window
with no browser or window dialog and no request sent; the same drive
timed the request letter's fill (note f-a18).

<a id="fn-e"></a>
**e** — `CreateReviewerForm`: validators quoted in Fields (username unique +
alphanumeric via `FormValidatorUsername`, email valid + unused, given name
required in site primary locale, family-name-needs-given-name custom check,
user group required); template `createReviewerForm.tpl` (AFFW-626..630;
"Suggest" button → username suggestion op; user-group select rendered only
with >1 reviewer group for the stage — `getUserGroupsByStage`; masthead
checkbox disabled+checked). Account creation: generated password
(`Validation::generatePassword()`), `mustChangePassword` set (the forced
change itself is *Sign-in & sessions*'), interests stored via the user-
interests repository, group joined with masthead flag on. Welcome mail
`ReviewerRegister` (MAIL-038, key REVIEWER_REGISTER) carrying the password;
reply-to = journal principal contact; skipped by `skipEmail`.
`EnrollExistingReviewerForm`: autocomplete op
`getUsersNotAssignedAsReviewers` (excludes holders of any reviewer group in
the context); validation `isValidUserAndGroup` (user exists, has no
reviewer role, group is a reviewer group of this context); template
`enrollExistingReviewerForm.tpl` (AFFW-631..633). Live-probed 2026-08-02
(OJS + OMP, plus a two-group OJS scratch journal): the create-mode group
select is hidden with one reviewer group and shown with two; the enroll
form is headed "Enroll an Existing User as Reviewer" and always renders the
group select; the "Appear on the masthead" checkbox is present, ticked and
disabled in both modes; duplicate username/email refusals surface as toasts
(strings quoted in Fields); "Suggest" filled "petra" from given name Petra;
the enroll autocomplete lists only users already enrolled in the context
and excludes holders of ANY of its reviewer groups — on an OMP internal
round, External Reviewers were excluded too; the empty-submit validation
message is the generic "This field is required." and clears on pick
(retired finding A14, note f-a14) — claim check 2026-08-02: an enroll
driven end-to-end on a scratch journal granted the role and produced a
"Request Sent" row. Same probe: the welcome mail carried
the username and generated password and first sign-in landed on the "Change
Password" screen; an enrolled user held the reviewer role permanently
afterwards (visible in the journal's users list).

<a id="fn-f"></a>
**f** — Due dates: `HasReviewDueDate` trait — context
`numWeeksPerResponse`/`numWeeksPerReview`, fallbacks 3/4 weeks, both
end-of-day today-based. Validators: both dates required
(`editor.review.errorAddingReviewer`), review ≥ response
(`FormValidatorDateCompare`, message
`editor.review.errorAddingReviewer.dateValidationFailed` — "…must be equal
or greater than responde due date", typo as shipped; live-probed 2026-08-02
on OJS + OMP the message never reaches the screen — the refusal is silent,
finding A8; control: valid dates on the same path succeed). The same pair
guards the Edit and Resend windows. Defaults live-probed 2026-08-02: each
date arrived as today + its own configured week count, independently (2/6
weeks on a scratch journal, 4/8 cross-check on the baseline; the 3/4-week
unset fallback was not exercised). The pickers' wrong-format-input discard
and missing past-date guard are findings A16/A17 (notes f-a16, f-a17).

<a id="fn-g"></a>
**g** — `EditReviewForm` (template `editReviewForm.tpl`, AFFW-642..644):
review-form select rendered only while `!getDateCompleted()`; execute
revokes all file grants then re-grants the ticked ones; a change to either
due date or the review method creates the reviewer task
NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED (NOTIF-048, task level; text
`notification.type.reviewAssignmentUpdated` "Review assignment updated.")
and sends `EditReviewNotify` (MAIL-026, key REVIEW_EDIT) with
`allowUnsubscribe`, suppressed when the reviewer blocked that notification
type's emails; changing only files/visibility/form skips both. Live-probed
2026-08-02 (OJS, two independent runs; also on OMP via a calendar-driven
due-date edit, claim check): the sent change notice carried the
pre-change dates — the mail was composed before the edit was applied
(finding A11, retired: since the 2026-08-25 rebase the mailable is built
from a post-edit re-fetch, pkp/pkp-lib#13162); the email type is offered
neither on the profile's notification
settings nor on the unsubscribe page its footer links to (finding A12).
Driven 2026-09-28 (OJS and OMP, two runs each): "Cancel" in "Edit Review"
with the review due date retyped closed the window with no dialog and no
request; reopened after a reload, "Edit" showed the old date. Driven
2026-09-29 (OJS; OMP on both review stages; as the Journal Manager and as
an assigned Section Editor, Series Editor on the press; two runs each),
on accepted rows: the top "Close" raised the browser's own `confirm()`
with `form.dataHasChanged` (lib/pkp `FormHandler`
`containerCloseHandler()`) after a ticked
"Publicly Show Reviewer Comments" box, a retyped review due date or
another review type, never on an untouched form. Dismissed, the window
stayed open with the change; accepted, it closed with no request, and the
row, "Edit" reopened on the page and after a reload, and
`review_assignments` (`is_review_publicly_visible`, the due date) kept the
old values. "Cancel" with the box ticked asked nothing and sent nothing.

<a id="fn-h"></a>
**h** — Manual reminder: Vue guard statuses RESPONSE_OVERDUE/REVIEW_OVERDUE
(AFFW-488); form `ReviewReminderForm` (template `reviewReminderForm.tpl`,
AFFW-646..648; schedule readout branches on `getDateConfirmed()`; since
pkp/pkp-lib#13035 — folded 2026-08-27 — the dialog renders the template
chooser and attaches the shared `ReviewerActionFormHandler` in place of the
retired `ReviewReminderFormHandler`, note k), mailable
`ReviewRemind` (MAIL-042, key REVIEW_REMIND), editor sender; stamps
`dateReminded`; success notice `notification.sentNotification`; event log
`submission.event.reviewer.reviewerReminded`. The template-body preview op
masks the one-click URL variable so editors never see a live reviewer link
(`fetchReviewerActionTemplateBody`, the same op the chooser's re-fetch
uses — note k; previously `fetchReviewReminderTemplateBody`). Automatic
reminders: scheduled task
`PKP\task\ReviewReminder` (JOB-054, owned by *Review setup & review forms* —
clock thresholds `numDaysBefore/AfterReviewResponseReminderDue`,
`numDaysBefore/AfterReviewSubmitReminderDue`) dispatches one queued job per
due assignment — `PKP\jobs\email\ReviewReminder` (JOB-012) sending
`ReviewResponseRemindAuto` (MAIL-046, key REVIEW_RESPONSE_OVERDUE_AUTO) or
`ReviewRemindAuto` (MAIL-043, key REVIEW_REMIND_AUTO) from the journal's
principal contact, with one-click link when enabled; stamps
`dateReminded` + `reminderWasAutomatic`, email-logged and event-logged
(`reviewerRemindedAuto`). A reviewer response resets both reminder fields
(`ReviewerAction::confirmReview`), re-arming the automatic clock for the
next phase — the reset that also erases the History reminder line,
observed live (finding A15, note f-a15). The automatic clocks themselves
cannot run in this environment (`task_runner` off); their behavior stands
on this code basis. Live-probed 2026-08-02 (OJS + OMP; claim check re-drove
the manual path as a Section Editor — the overdue row's Actions button
reads "Send Reminder" and a "Request Sent" row's menu offers no reminder
entry): window title
"Review Reminder"; the "Review Schedule" readouts as in Fields ("Editor's
Request" · "Response Due Date" · "Review Due Date", the response field
giving way to "Review Acceptance Date" once confirmed); toast "Notification
sent."; reminder subject "A reminder to please complete your review".
One-click access (scratch journal): the request email carried a keyed
invitation URL that landed a fresh logged-out browser authenticated on the
reviewer request page; the sent reminder resolved the preview's placeholder
to a fresh keyed URL of its own (new id and key); edit-change notices
carried plain links even with one-click on.

<a id="fn-i"></a>
**i** — Review Details windows (the 2026-08-29 modify-reviews rework,
pkp/pkp-lib#13156 — it deleted the legacy grid `readReview` op,
`readReview.tpl` and `ReadReviewHandler.js`): lib/ui-library
`managers/ReviewerManager/` — `ReviewDetailsModal.vue` (view; title key
`editor.review.reviewDetails`), `ReviewDetailsEditModal.vue` (modify),
`ReviewDetailsRating.vue`, composables `useReviewDetails`,
`useReviewDetailsForm`, `useReviewAssignment`, `useReviewContent`
(comments split `submission.comments.canShareWithAuthor` "For author and
editor" / `.cannotShareWithAuthor` "For editor only"). API
(`submissions/{submissionId}/reviewAssignments/{reviewAssignmentId}`,
`ReviewAssignmentController`): GET/PUT on the assignment — a star click
PUTs `{quality}` at once, toast "Reviewer rating saved" (the early-click
race is finding A21, note f-a21); PUT `…/consider`, fired on window open
(marks viewed) and by "Mark as Complete" (sets considered, stamps the
consideration date, clears the reviewer's "Review pending." task
(NOTIF-019), logs `log.review.reviewConfirmed`, and triggers the ORCID
deposit `SendReviewToOrcid` — consent/config is the ORCID feature);
GET/PUT `…/review` behind "Save Changes" (`editReview`; on a request with
no review it stamps `dateCompleted`, `dateConfirmed` and `step` 4, Rule
14d, note f-a24). The UI sends each PUT
as a POST carrying `X-Http-Method-Override: PUT`. Since pkp/ui-library#853
(`51f0c727`, merged 2026-09-24 as `1afd40a9`) the window no longer reloads the Reviewers
table itself after the mark; `useReviewAssignment.js` sets the window's
`dataChanged` flag (`markDataChanged?.()`) just before sending the mark,
and the table's `onClose` reloads at the close when it is set
(note f-a32). Labels:
`editor.review.markAsComplete` "Mark as Complete", `common.saveChanges`
"Save Changes", `editor.review.reviewLastModifiedBy` "Last modified by
{$username}"; guidance `editor.review.readConfirmation`, upstream-tagged
fuzzy (finding A22, note f-a22). Mark-as-Complete gate: the recommendation half is OJS-only
(`isOJS()`-guarded in `useReviewDetails`), the review-form half runs on
both apps. Both strings driven 2026-09-17: the no-recommendation string
(`editor.review.confirmReview.missingRecommendation`) on OJS, beside the
disabled button of an unanswered, an accepted and a declined request, at
the three levels of note a; the incomplete-review string on OMP, on an
unanswered request carrying a review form with one required question, the
button enabling once the answer was saved through "Modify Review". On OJS
the same form request showed the recommendation message, and the second
string was not met there: the reviewer's wizard and "Modify Review" both
require the answers, so a review that has a recommendation never has an
unanswered required question. Private comment: the modify form's
`canEditPrivateComment` parameter is passed true by no caller — the
editor-only block is display-only cross-app (code-read 2026-08-29, not a
press divergence). Save-confirm dialog: "Save changes to this review?"
driven 2026-09-17 on OJS and OMP scratch contexts at their defaults
(review type "Anonymous Reviewer/Anonymous Author", no journal-wide
setting touched). With the assignment's own "Publicly Show Reviewer
Comments" box ticked in the Edit window, a save before "Mark as Complete"
asked nothing; after it the dialog showed as quoted in Rule 14b, its
"Cancel" sent no request and left the edit window open, its "Save Changes"
saved and closed it. The same box put "This review will be made publicly
visible alongside the article." at the head of the "Mark this review as
complete?" text (control without the box: the two sentences of Rule 14a).
Activity log: attributed modification entries
(`SUBMISSION_LOG_REVIEW_REVIEWER_COMMENTS_MODIFIED`,
`…REVIEWER_RECOMMENDATION_MODIFIED`, `…REVIEWER_FORM_RESPONSE_MODIFIED`),
each with a "View changes" action behind the legacy grid row's "Settings"
expander (`a.show_extras`); driven 2026-09-17 on both apps, it opened the
"View Review" window with "Updated Comments" over "Previous Comments"
(opened from a Comments row). Rows per save, read the same day: on OJS each
of three saves that entered a comment and a recommendation (on a submitted
review by the Journal Manager; on unanswered requests by the Journal
Manager and by the Section Editor) left two rows, a Comments row and a Reviewer Recommendation
row, each with its own "Settings" arrow; on OMP every row read Comments.
{OJS} recommendation: shown on the
info line and in the "Reviewer Recommendation" group (finding A23, note
f-a23); editable only in the modify window's required select
(`reviewerRecommendationId`). Legacy anchors the rework retired: the
{OJS} `reviewerRecommendations.tpl` capture (AFFW-664) and {OMP} empty
override (AFFW-665) no longer render in an editor window — the per-app
gate is `hasCustomizableReviewerRecommendation()` (note f-omp1) — and
the legacy `reviewRead` grid op (GRID-086) remains in code with no window
posting to it (note a). Downloads (Rule 15): "Download Review Form" menu
labels `editor.review.download`, `editor.review.authorOnly` (PDF/XML),
`editor.review.allSections` (PDF/XML) → reviews API `export-pdf`/
`export-xml` with `authorFriendly`, then the temporary-file download op
(the `reviews` endpoints are owned by *Author response to reviews*;
API-032 rider); export rendering `reviewDownload.tpl` (AFFW-668) drops
the private-comments block in author-friendly mode. Live-probed
2026-08-02 from the legacy window: author-friendly variants anonymize the
reviewer — "Reviewer: C" in the PDF, `<anonymous/>` in the JATS XML (all
four variants fetched on OJS, one on OMP; every variant saves under the
same filename; the menu renders for free-form reviews too — not gated on
a review form). Re-checked 2026-08-29 from the new window: the same four
exports offered under the same menu button. Live probe 2026-08-29 (OJS
scratch journal + OMP publicknowledge press, manager role; apps ojs
0471e029b9 / omp d34542e83, lib/pkp 13b621e42): window contents, dialog
and toast texts, the live row flips (Viewed on open, Complete on
mark-as-complete, surviving reload), rating persistence across
close/reopen, "Last modified by {name}" after a save, the stacked Modify
Review window, and the OMP absences — all as written in Rules 14a/14b.
ORCID row action guard bug: finding A1 (note f-a1). Test run 2026-09-12 (OMP, scenario 9, one run): the reviewer's Tasks
panel read "No Items" right after their own "Submit Review", before any
editor had opened the review — `PKPReviewerReviewStep3Form::execute()`
deletes the reviewer's REVIEW_ASSIGNMENT task on submit, and
`reviewConfirmed()`'s own delete of the same task then finds nothing left;
the clearing belongs to the reviewer's submit (*Reviewer's review*). Both
suites read the panel after "Mark as Complete" and find no "Review
pending.", which still holds. Claim check 2026-09-17 (OJS + OMP, scratch
contexts, Journal Manager and an assigned Section Editor or Series Editor;
apps at the pkp/pkp-lib#13338 pointers, lib/pkp `2dbdd585a6`; every fact
seen in at least two runs per app). Rule 14b: the dialog's two buttons; the
unsaved-changes "Warning" with "Yes" and "No" after typing, and the comment
as it was on reopening; the three-step "Upload" window, the file listed in
the view window after "Cancel" with no dialog, and its 'Revision "{file}"
was uploaded for file {N}.' log line under the editor's name; with a review
form, the form's title, the fixed line "The questions this journal asks
reviewers to answer." (`editor.review.reviewerForm.description.default`)
on both apps (finding OMP6) and the questions as fields, an empty required one refused
on screen with no request sent; a successful save shows no notice. Rule
14c: the window opened from the "Review Details" entry of an unanswered, an
accepted and a declined request, "Notified:" / "Confirmed:" / "Confirmed:",
both comment blocks "-", "No Items", {OJS} "Recommendation -", a star
saving with its toast, the row unchanged on close. Rule 14d: after "Save
Changes" on an unanswered request the assignment the window refetches read
`dateConfirmed` = `dateCompleted` = the save's second and `step` 4 (before:
null, null, 1), the row and menu as written, the same for the Section
Editor; {OJS} with no "Recommendation" picked no request was sent, both
messages showed and "Save Changes" sat disabled until the select changed.
The reviewer's side, read the same day on both apps (it belongs to
*Reviewer's review*): absent from "Action Required by me", "Review
submitted on {date}" with "View" under "All assignments" and "Completed",
the review page on "4. Completion" with its discussions panel loaded, step
1 with no accept or decline and a disabled "Save and continue", step 3
holding the editor's text with "Save for Later" and "Submit Review"
disabled. Read on OMP only, on the shared lib/pkp path (no app override of
the controller): an accepted reviewer's `dateConfirmed` unchanged across
the save; a "Request Resent" row turning "Review Submitted" with "Cancel
Reviewer" and no "Log Response"; a save on an already submitted review
leaving both dates and `step` as they were; the mail catcher holding no
"Review accepted: …" message for the reviewer the editor submitted for,
and no message to that reviewer, while a control reviewer's on-screen
accept produced one to the assigned editor; the activity log with "has been
accepted" lines for the reviewers who accepted themselves and none for that
reviewer. Mechanism: the acceptance email, its email-log entry and
`SUBMISSION_LOG_REVIEW_ACCEPT` live in `ReviewerAction::confirmReview`,
which `editReview` never calls. The kept acceptance date was read from the
assignment's data that day, and on the row's "History" on 2026-09-29
(below).
The dated line (Rules 14a, 14c), since pkp/ui-library#987 with
pkp/pkp-lib#13346 (issue pkp/pkp-lib#13263): driven 2026-09-24 on OJS
at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge, one scratch submission with one reviewer per
state. Invited: `Request Sent: 2026-09-24 06:10 AM`; made overdue by
"Edit", then "Send Reminder": `Reviewer Reminded: 2026-09-24 06:10 AM`;
declined: `Request Declined: 2026-09-24 06:10 AM`; accepted: `Request
Accepted: …`; submitted: `Review Submitted: …`; marked complete: `Review
Completed: …`; thanked with the email skipped: `Reviewer Thanked: …`;
marked complete, then "Revert Decision": `Review Submitted: …`. The
window's own fetch of the assignment carried `declined`, `considered`,
`dateConsidered`, `dateAcknowledged`, `dateNotified` and `dateReminded`,
and the line is drawn from it, not from the table's summary; no request
answered 400 or above and no console error was logged. Mechanism:
`ReviewDetailsInfo.vue` `latestActivity` takes the first non-empty entry
in the fixed order of Rule 14a, the thank only while `considered` is not
`REVIEW_ASSIGNMENT_UNCONSIDERED` (finding A33); before the change the
order was submitted, confirmed, reminded, notified, assigned (note
f-a29), so the "Notified:" / "Confirmed:" readings above are that
earlier wording. OMP carries the same component (its suite green that
day; the window's line not driven there). Two readings of Rule 14a follow
from that order and the stored data, read from the code on 2026-09-24 and
not driven: an accepted, then reminded reviewer reads "Request Accepted:
…" (accepted ranks above reminded), and after a second reminder the
"Reviewer Reminded" line carries the latest date, because the review
assignment has one `date_reminded` column, set by each reminder, manual
or automatic (note l).
Driven 2026-09-28 (OJS and OMP, two runs each; scratch contexts, one
with a "Competing Interests" policy and an active review form, one with
neither; the Editor and an assigned Section or Series Editor). "Reviewer
Files": a file the reviewer uploaded on step 3 of their wizard was listed
(number, name, date) on every read taken after the window's own files
request (`…/files/review/{assignmentId}?fileStages=5`) had answered, 44
of 44 openings; that request answered 0.17–0.72 s after the click, and
"No Items" was read only before it. "Download Review Form": the same four
entries on a free-form review, a form-based one, the declared-interests
one and a seeded free-form one.
Competing interests (Rules 2, 14a–14d, Settings), since ui-library
`19802b78` (pkp/ui-library#993) with pkp-lib `c4303c66af`
(pkp/pkp-lib#13394, issue pkp/pkp-lib#13282), which removed the
"Competing Interests" block ("No competing interests were disclosed.")
from `ReviewDetailsInfo.vue`: the answer is a form group of
`useReviewDetailsForm.js` (`addCompetingInterestsFields`, radio
`competingInterestOption`, rich text `competingInterests`), shown when
`isCompetingInterestsRequested` (the page config's `publicationSettings`,
`Context::isReviewCompetingInterestRequired()`) or the assignment's
`competingInterestsDeclared` is set; display mode prints
`editor.review.competingInterests.hasCompetingInterests` "I may have
competing interests" and hides the radio of an unanswered assignment
("Declaration" "-"). The PUT `…/review` carries `competingInterests` (""
for no interests) only once a radio is ticked; pkp-lib `46ac5ea933`
(pkp/pkp-lib#13388, issue pkp/pkp-lib#13291) refuses it with 422 when the
context has no policy and the assignment no answer, and refuses
`comments` on a review-form review; the window sends neither (read from
its own traffic, 2026-09-29: `reviewFormResponses` and never `comments`
on a form review, no `competingInterests` on a context without a
policy). A change logs `SUBMISSION_LOG_REVIEW_REVIEWER_COMPETING_INTERESTS_MODIFIED`.
Driven 2026-09-29 (OJS and OMP, two runs each; contexts with a policy,
without one, and with the policy emptied on screen mid-run; the Editor,
an assigned Section or Series Editor and an assigned Funding
Coordinator, and from the dashboard popover): the group sat between the
"Download Review Form" menu and "Reviewer Comments" (after the summary
block), read "I do not have any competing interests" for a review
answered so through the wizard and for a seeded `completed` one, "I may
have competing interests" with the statement for a declared one, and
"Declaration -" on an unanswered, an accepted and a declined request and
on a review an editor submitted without an answer; "No competing
interests were disclosed." showed in no window, and the context without a
policy showed no group in either window. "Modify Review": the reviewer's
answer preset, neither radio ticked on an unanswered request; a statement
saved showed in the view window and badged the row on the same page and
after a reload, and set back to "I do not have…" removed the badge; the
log row "…Reviewer Competing Interests." attributed to the Editor or the
Section Editor, its "View changes" as in finding A39; a radio change
alone asked the unsaved-changes "Warning" on leaving, and on a complete,
publicly shown review "Save changes to this review?". With the policy
emptied (the box saved empty, "Saved"), new reviewers' step 1 offered no
radios, reviews answered before kept their badge and group, and an
editor's changes to them saved (200). The History of a review an editor
submitted for the reviewer (Rule 14d), read on screen the same day:
"Request Accepted: {save time}" on an unanswered and a re-sent request
and on one carrying a required review form, the seeded acceptance time on
two accepted ones.

<a id="fn-j"></a>
**j** — `ThankReviewerForm` (template `thankReviewerForm.tpl`, AFFW-645):
mailable `ReviewAcknowledgement` (MAIL-034, key REVIEW_ACK), stamps
`dateAcknowledged` (status → Thanked), notices
`notification.reviewerThankedEmail` / `notification.reviewAcknowledged`
(skip variant). Revert: confirm dialog (AFFW-490/506; title
`editor.review.unconsiderReview` "Unconsider this Review", body
`…unconsiderReviewText`) → op `unconsiderReview` sets considered =
UNCONSIDERED (status falls back to Received, or Viewed when previously
thanked — `getStatus()` branch), logs `log.review.reviewUnconsidered`;
review content and note history untouched (handler comment). Live-probed
2026-08-02 (OJS): revert returned a "Complete" row to "Review Submitted"
and a "Reviewer Thanked" row to "Review Viewed", with no toast either way;
both thank notices verbatim, and the thank-you-mail / suppressed-mail
controls both passed. Claim check 2026-08-02: the same journey re-driven as
a Section Editor on OJS and on the OMP twin — both revert directions
identical; the OMP thank mail "Thank you for your review" arrived under the
acting editor's name. Test run 2026-09-12 (OJS and OMP, scenario 9, one run each): a second
"Mark as Complete" on the reverted, previously thanked row landed straight
on "Reviewer Thanked" (finding A27, note f-a27).

<a id="fn-k"></a>
**k** — Unassign/cancel (machinery reworked upstream by pkp/pkp-lib#13035,
folded on the 2026-08-27 upstream-rebase check): abstract `ClearReviewForm`
over `ReviewerNotifyActionForm`, concrete `UnassignReviewerForm` (before a
response; template `unassignReviewerForm.tpl`, AFFW-649/650; op unchanged)
and new `CancelReviewForm` (after one; op `updateCancelReview`, template
`reviewCancelForm.tpl`) — replacing the old single form whose submit label
switched on `dateConfirmed`. Execute unchanged: no
response → assignment DELETED; responded → flagged cancelled with date;
either way the reviewer's task row (NOTIF-019) is deleted, the notice mail
goes unless skipped — unassign sends `ReviewerUnassign` (MAIL-041), since
the rework on its own key REVIEWER_UNASSIGN (template installed by
migration `I12903_ReviewerUnassignEmailTemplate`, registered in ojs+omp
upgrade.xml) with a new email log event type REVIEWER_UNASSIGN
(0x40000010); cancel sends the new mailable `ReviewCancel`, which took over
key REVIEW_CANCEL with its subject changed to the one quoted in Side
effects — notices `notification.removedReviewer`/`.cancelledReviewer`, log
`log.review.reviewCleared`. Template chooser (the Unassign, Cancel,
Reinstate and Send Reminder dialogs alike): `ReviewerNotifyActionForm`
lists the action's default template plus its alternates (email-template
Collector `alternateTo`); a pick re-fetches the body via AJAX op
`fetchReviewerActionTemplateBody`, wired by the new JS handler
`ReviewerActionFormHandler` (replacing `ReviewReminderFormHandler` — the
once-stale committed `pkp.min.js` consequence is retired finding A20, note
f-a20). Discussions: `updateClearReview()`
calls `Repository::removeParticipantFromSubmissionTasks()` when the
reviewer holds no other active assignment on the submission
(pkp/pkp-lib#12359, 2026-02-19; *Tasks & discussions* note ac), which
takes them off every discussion and task of the submission; stage
assignments are untouched. Driven 2026-09-28 (OJS and OMP, two runs
each): on a round with three reviewers, each sharing a review-stage
discussion with the Editor, "Unassign Reviewer" on the invited one
("Reviewer removed.") and "Cancel Reviewer" on an accepted one
("Reviewer cancelled.", the row "Request Cancelled") left each of their
discussions' "Details" listing the Editor alone, on the same page and
after a reload; the untouched reviewer stayed on theirs. Reinstate: `ReinstateReviewerForm`
(AFFW-651) clears the cancelled flags, mail `ReviewerReinstate` (MAIL-039,
key REVIEW_REINSTATE), notice `notification.reinstatedReviewer`, log
`log.review.reviewReinstated`. Resend: `ResendRequestReviewerForm`
(AFFW-652; live-probed 2026-08-02 on a distinct-interval journal: each
picker arrives preset from its own interval, as at add time — the
once-recorded collapse is retired finding A9, note f-a9) clears declined,
sets
`requestResent`, nulls `dateConfirmed`, sets both dates; mail
`ReviewerResendRequest` (MAIL-040, key REVIEW_RESEND_REQUEST), notice
`notification.reviewerResendRequest`; status REQUEST_RESEND until the next
response; event log `log.review.reviewerResendRequest` (finding A37,
note f-a37). Log Response: side modal `WorkflowLogResponseModal.vue` (VUE-067,
AFFW-501/505) posting the log-response form (radio labels quoted in Fields
from `editor.review.logResponse.form.*`) to the reviews API `confirmReview`
op (API-032 rider) → `ReviewerAction::confirmReview` — acts only while
`dateConfirmed` is null; stamps the response, resets reminder bookkeeping,
sends the editor-side response acknowledgement mails owned by the
*Reviewer's review* feature, declines also void the one-click invitation.
Vue action guard `!reviewAssignment.dateConfirmed` (AFFW-501). Live-probed
2026-08-02 (OJS, OMP where noted): notices as quoted; after a resend the
row's menu again offered "Unassign Reviewer" and "Log Response"; the
unassigned reviewer's own dashboard lost the assignment (before/after, both
apps). Mail split re-probed 2026-08-27 (OMP, full
unassign→cancel→reinstate flow with the minified bundle off — note f-a20):
cancel subject received verbatim `Your review for "{title}" has been
cancelled` (previously "Request for Review Cancelled") and reinstate
subject "Can you still review something for {journal}?"; the unassign
subject `Your reviewer assignment for "{title}" has been removed` stands on
the installed template, its wording verified identical in ojs and omp
locale/en/emails.po. Log
Response (both apps): accept → "Request Accepted", decline → "Request
Declined", no mail to the reviewer, and the assigned editors received the
same response mails a real reviewer click sends, From set to the reviewer's
address. Test run 2026-09-12 (OJS and OMP, scenario 11): the unassigned
reviewer's message arrived under the cancel subject with the unassign body
(finding A26, note f-a26), and on the press with its `{$journalName}`
uncompiled (finding OMP3, note f-omp3).

<a id="fn-l"></a>
**l** — Email: `EmailReviewerForm` (template `emailReviewerForm.tpl`,
AFFW-653; subject/body validators `email.subjectRequired`/
`email.bodyRequired`, but live-probed 2026-08-02 on OJS and OMP only the
subject's error renders — as "This field is required." — and a subject-only
submit sends with an empty body, finding A13; "To" shows the reviewer's
name — the earlier username reading came from throwaway accounts whose name
equals their username (claim check 2026-08-02, seeded "Paul Reviewer");
submit button "Send Email"), plain mailable from/reply-to the acting
editor, email-logged. History: op `reviewHistory` → `workflow/reviewHistory.tpl`
(AFFW-498/708) listing the dated milestones quoted in Rule 21, sorted by
date, blanks skipped. Label keys until pkp/pkp-lib#13346:
`common.assigned/notified/reminder/confirm|declined/completed/acknowledged`,
shown "{date} {label}"; since it, `editor.review.*` keys
(`editor.review.reviewerReminded`, `editor.review.reviewerThanked`, …)
shown "{label}{semicolon} {date}", "Assigned" dropped, "Review Completed"
reading `dateConsidered` and "Reviewer Thanked" `dateAcknowledged` only
while `considered` is not `REVIEW_ASSIGNMENT_UNCONSIDERED` (finding A35).
PHP's stable sort over an array built in lifecycle order keeps equal
timestamps as Accepted, Submitted, Completed, Thanked. Gossip: op guarded by
`Repo::user()->canCurrentUserGossip()` — viewer must hold manager, site
admin or sub-editor in the context, target must hold a reviewer role, never
self; assistants additionally lack the op in the role map (note a); form
`ReviewerGossipForm` (template `reviewerGossipForm.tpl`, AFFW-654) reads and
writes the user-level gossip field (finding A4). Login As: row entry on
`canLoginAs` (AFFW row action; the flag and flow are
[→ who may impersonate whom](U01-login-and-sessions.md#who-may-impersonate));
confirm text `grid.user.confirmLogInAs`. Live-probed 2026-08-02 (OJS +
OMP): History opens as a side modal titled "History"; milestones observed
verbatim "Assigned · Notified · Confirm · Completed · Acknowledged", dated
"YYYY-MM-DD hh:mm AM/PM", blanks omitted (the bare-verb "Confirm" is as
shipped). The row-menu entry is labeled "Editorial Notes" — the internal
name "gossip" never appears on screen; the window's guidance text is quoted
in Fields, and a note written on one submission was read back verbatim from
another (finding A4). Driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge (Rule 21):
each line reads "{Label}: {date and time}" with the label bold, e.g.
`Request Sent: 2026-09-24 06:10 AM`; per state, invited `Request Sent`;
reminded `Request Sent`, `Reviewer Reminded`; declined `Request Sent`,
`Request Declined`; accepted `Request Sent`, `Request Accepted`; submitted
adds `Review Submitted`; marked complete adds `Review Completed`; thanked
adds `Reviewer Thanked`; marked complete, then reverted, ends at `Review
Submitted`. No "Assigned" line. Both suites asserted the scenario 7 and 9
labels green the same day (OJS and OMP). A second reminder was read from
the code on 2026-09-24, not driven with two reminders: the review
assignment has one `date_reminded` column, which the manual reminder
(`ReviewReminderForm`) and the automatic one (`jobs/email/ReviewReminder`)
each set to the current date, so History's one "Reviewer Reminded" line
carries the latest reminder's date.

<a id="fn-m"></a>
**m** — Add-reviewer side effects: task NOTIFICATION_TYPE_REVIEW_ASSIGNMENT
(NOTIF-019, task level, text `notification.type.reviewAssignment` "Review
pending.", linking to the reviewer's submission page); request mail
round 1 `ReviewRequest` (MAIL-044, key REVIEW_REQUEST), later rounds
`ReviewRequestSubsequent` (MAIL-045, key REVIEW_REQUEST_SUBSEQUENT), sender
= acting editor, body = the edited personal message; with
`reviewerAccessKeysEnabled` a `ReviewerAccessInvite` invitation is created
and its one-click URL substituted into the mail (invitation lifecycle
[→ user invitations](U06-user-invitations.md#invitation-states); the landing is
the *Reviewer's review* feature). Event log `log.review.reviewerAssigned`;
email log records the request (the request/subsequent event-type switch
compares the round number against an unrelated status constant that happens
to equal 1 — behaviorally correct today, footnote-only). Suggestion
approval: after any successful add, a pending suggestion matching the
reviewer's email (or the one the window was opened from) is marked approved
with reviewer attached — the panel is the *Reviewer suggestions* feature.
Live-probed 2026-08-02 (OJS + OMP): success notices verbatim, skip-email
suppressed the mail (positive and negative controls), sender = the acting
editor; request subjects "Invitation to review" (OJS) / "Manuscript Review
Request" (OMP), and "Request to review a revised submission" with the
reconsider wording for the subsequent-round template. Claim check
2026-08-02: a UI-added reviewer's own Tasks list showed "Review pending."
with the submission title (OMP). Test run 2026-09-12 (OJS and OMP, scenario 1): the skip-email notice
reads the full sentence "{name} was assigned to review this submission and
was not sent an email notification." (`notification.addedReviewerNoEmail`);
the shorter quote the spec once carried never appears.

<a id="fn-n"></a>
**n** — Settings inventory (config surfaces owned elsewhere): context data
`defaultReviewMode`, `numWeeksPerResponse`, `numWeeksPerReview`,
`numDaysBefore/AfterReviewResponseReminderDue`,
`numDaysBefore/AfterReviewSubmitReminderDue`, `reviewerAccessKeysEnabled`,
default public visibility, review forms + section default
(`section.reviewFormId`), `reviewerSuggestionEnabled`, `competingInterests`
(the "Competing Interests" policy text; empty at install, seed-facts.md).

<a id="fn-o"></a>
**o** — OMP parameterization: `APP\controllers\grid\users\reviewer\
ReviewerGridHandler` (omp-main) is an empty subclass (GRID-098);
`workflowConfigEditorialOMP.js` mounts ReviewerManager on the internal stage
(no `recommendations` prop) and inherits the OJS external-review block
through the config deep-merge. Stage split: reviewer groups are fetched per
stage (`getUserGroupsByStage`), and the seeded press assigns the Internal
Reviewer group to Internal Review and External Reviewer to External Review;
file grants use the internal-review file stage on the internal stage. The
recommendation absence: OMP's dashboard passes no recommendation roster,
and `Application::hasCustomizableReviewerRecommendation()` returns `false`
in OMP against OJS's `true` — since the 2026-08-29 rework that flag (with
the `isOJS()` completeness-gate guard) is what keeps every recommendation
block and the Mark-as-Complete gate out of the Vue Review Details windows
(note f-omp1; the legacy template overrides AFFW-664/665 are retired with
the read window, note i).
Live-probed 2026-08-02: the stage split held for the searched roster —
positive and negative name searches on both stages, and the underlying
reviewers listing filtered per stage — while the window's opening list
showed both groups on either stage (finding OMP2, note f-omp2); the OMP
read-review window rendered no recommendation control, re-verified
2026-08-29 on the reworked windows.

<a id="fn-p"></a>
**p** — OPS absence, install facts: the preprint server's stage roster is
Production only and it seeds no reviewer user groups (glossary roles table:
no reviewer keys in the OPS group roster); no workflow config block mounts a
ReviewerManager; the OPS `vocabs` API entry point mounts only the generic
vocabulary controller, not the reviewer-interests one (API-048). The
review-stage absence itself is owned by *Review stage & rounds* (its
scenario 14); scenario 15 here probes only the reviewer-specific surfaces.
Live-probed 2026-08-02: no Reviewers panel anywhere on a preprint's
workflow (stage tree: Production only), no Reviewer role in the Roles list,
a "Reviewer" role filter returning zero users, with Production's own
controls rendering as the positive control. One install nuance: the generic
"Create New Role" permission-level list still offers "Reviewer" — an
application-level enum; no reviewer group is seeded and none is reachable.

<a id="fn-s"></a>
**s** — Scenario seeding. The seeded journal or press is `publicknowledge`;
roster accounts sign in with the username doubled as the password:
`editor.diana` is the Editor, `manager.maya` the Journal Manager,
`assistant.rita` the Funding Coordinator, `author.alex` the Author, and
`reviewer.julia`, `reviewer.paul`, `reviewer.amara` and `reviewer.adam` the
Reviewers (OMP splits julia/paul as External and amara/adam as Internal
Reviewers). Submissions are scratch, built through `POST
scenarios/submission` (scenarios.md) with `decisions:
['sendExternalReview']` (OMP: `['skipInternalReview']` with
`reviewRounds[].stage: 'external'`) for a submission in Round 1 and
`reviewRounds[].reviewers[]` for the reviewer state (`invited`, `accepted`,
`declined`, `completed`); the seed carries no files, so review files are
uploaded through the round's Files for Review panel first; a reviewer
named in the seed leaves the Add Reviewer search, so a scenario that adds
through the screen keeps a spare reviewer out of the seed. Scratch journals
come from `POST scenarios/context` with throwaway `users[]` (role keys
`manager`, `author`, `externalReviewer`, `funding`); the mail catcher is
Mailpit, read by the recipient's address and, for a roster reviewer,
scoped by the scratch submission's title. Overdue rows are produced with a
passed due date rather than waited for. Per scenario: 1 seeds no reviewer
and adds two roster reviewers on screen. 2: a scratch journal with a
throwaway `manager`, an `author`, a user holding `['externalReviewer',
'manager']`, a second `externalReviewer` seeded `invited`, and thirty more
throwaway `externalReviewer` accounts never assigned, so the opening list
pages and one of them is the entry read. 3: a scratch
journal; the fresh address is a throwaway mailbox never used before. 4: a
scratch journal with a throwaway `author` to enroll and an
`externalReviewer` for the control. 5: any round with a spare roster
reviewer; the seed carries no files, so nothing is uploaded. 6: a scratch
journal with a throwaway `externalReviewer` seeded
`invited`, two files uploaded to the round before the edit. 7: a scratch
journal with three throwaway reviewers, two seeded `invited` and one
`accepted`; one invited reviewer is given a past response date through
the Edit window (the screen's only route to backdating, finding A17), and
the accepted one past response and review dates the same way. 8: a
roster reviewer seeded `invited`. 9: a
scratch journal with `reviewForms[]` holding one active form, a throwaway
reviewer seeded `accepted` who submits the review on their own screen with
both comment blocks, and a second throwaway reviewer seeded `invited`. 10
and 16: a roster reviewer seeded `completed` with `comments`. 11: a
scratch journal with two throwaway reviewers, one seeded `invited`, the
other holding `['externalReviewer', 'funding']`, seeded `accepted` and
assigned to the stage through `participants[]` as `funding`. 12: a roster
reviewer seeded `declined`. 13: a monograph seeded `decisions:
['sendInternalReview']` with `reviewRounds[].stage: 'internal'`; "Send to
External Review" recorded on screen. 14: 9's end state; the press control
on a monograph with a `completed` reviewer. 15: any seeded preprint. 17:
`author.alex` submits, `reviewer.julia` seeded `invited`. 18:
`assistant.rita` assigned through `participants[]` as `funding`,
`reviewer.julia` seeded `invited`. 19: `reviewer.julia` seeded `completed`
on Round 1, "Mark as Complete" pressed in her Review Details window and
"Create New Review Round" recorded on screen (the wizard belongs to
*Review stage & rounds*); `reviewer.paul` is the never-assigned control.
20: a scratch journal created with the `review` passthrough
(`numWeeksPerResponse: 1`, `numWeeksPerReview: 2`, `defaultReviewMode:
'open'`, `defaultReviewPublicVisibility: true`; scenarios.md "Configuring
a scratch context") and a throwaway `externalReviewer` kept out of the
round's seed; the control is a scratch submission on `publicknowledge`
with a spare roster reviewer, the seeded journal being at the install
defaults (seed-facts.md: both deadlines 4 weeks, "Anonymous
Reviewer/Anonymous Author", "Publicly Show Reviewer Comments" off).
Claim check 2026-08-02: scenario 1 driven end-to-end as a Section
Editor (previously covered by other roles); scenarios 8–14 re-driven as a
Section Editor on OJS with OMP twins for 9, 13 and 14; scenario 15 stands
on the earlier OPS probe of the same date. Upstream-sync probe 2026-08-29
(modify-reviews rework; OJS scratch journal + OMP publicknowledge press,
manager role): scenarios 9, 10 and 14 re-driven on the reworked Review
Details windows, and scenario 16 driven end-to-end on both apps. Test run 2026-09-12 (OJS and OMP): scenario 2's own-row read was
dropped, because the manager-reviewer opening the editorial dashboard met
"You don't currently have access to that stage of the workflow." with no
panel on both apps (the reviewing-manager finding of *Workflow screen &
stage access*, its A4); scenario 9's "Thank without email" runs on the
second reviewer after their own accept and submit (the OMP suite; the OJS
suite leaves that bullet undriven, since its earlier shape on the reverted
row met finding A27); scenario 11 reads the removal notice by recipient
and title (OJS) or body (OMP), never by subject (finding A26). Test run
2026-09-13 (OJS and OMP): scenario 2's never-assigned entry is read after
"Reviews completed" is cleared on the OMP suite, while the OJS suite still
searches with the slider enabled (finding A28, note f-a28); neither
asserts the "{N} active" badge either way (note c). Claim check 2026-09-17
(OJS and OMP, after pkp/pkp-lib#13338): scenario 16 re-driven as a scratch
journal's Journal Manager on a review submitted through the reviewer's own
screens with both comment blocks, a file and {OJS} "Revisions Required";
every bullet held, "Cancel" with nothing typed asking nothing, and "View
changes" sitting behind the log row's "Settings" arrow.

<a id="fn-a1"></a>
**f-a1** — `useReviewerManagerConfig.js::getItemActions`: the guard reads
`reviewAssignment.reviewerHasOrcid && pkp.const.
REVIEW_ASSIGNMENT_STATUS_COMPLETE` — the second operand is the constant
itself (truthy, value 8), not a comparison with `statusId`, so only the
ORCID half gates. `reviewerHasOrcid` requires `orcidIsVerified` on the
reviewer account (note a). The deposit endpoint itself
(`reviews/…/sendToOrcid`) was not exercised. Live check 2026-08-02 (OJS,
three states including "Complete"): with no reviewer holding an ORCID, the
entry appeared in no menu — the with-ORCID display stays code-based. Claim
check 2026-08-02: the guard re-read verbatim at the same site
(`useReviewerManagerConfig.js:385–388`, constant compare, always truthy)
and the deposit call re-confirmed in the confirm path
(`PKPReviewerGridHandler::reviewConfirmed` → `SendReviewToOrcid`,
PKPReviewerGridHandler.php:818); attaching an iD still needs the external
OAuth flow no screen here provides. Settling observation unchanged.

<a id="fn-a2"></a>
**f-a2** — `getCellStatusItems`, case REQUEST_RESEND: `message:
t('editor.review.responseDue', {date: formatShortDate(reviewAssignment.
dateDue)})` — the label key is response-due, the value passed is `dateDue`
(the review deadline); every other state pairs the label with its own date.
Live-confirmed 2026-08-02 (OJS): with response due 2026-08-20 and review
due 2026-09-10 set in the Resend window, the resent row's cell read
"Response due: 2026-09-10". Re-driven in the claim check (2026-08-02, as a
Section Editor) with a second distinct pair — response +10 days / review
+20 days — and the cell again printed the review date under the
response-due label.
Issue report: [docs/issues/U27-A2-request-resent-row-shows-review-deadline.md](../issues/U27-A2-request-resent-row-shows-review-deadline.md).

<a id="fn-a3"></a>
**f-a3** — Disproof live-probed 2026-08-02 (claim check, OJS): a throwaway
account holding ONLY the site-level administrator group opened the workflow
URL and was refused with the Error dialog "The current role does not have
access to this operation." — no Workflow heading rendered; positive
control: the same account rendered the full Administration page.
Methodology note, worth keeping: the seeded `admin` account is enrolled as
Journal Manager in every journal of this install (its user-group rows
include each journal's manager group), so the earlier "site admin was
offered both links and completed an add" observations — made with `admin` —
were observations of a Journal Manager. The handler's role map does admit
ROLE_ID_SITE_ADMIN to `createReviewer`/`enrollReviewer`, but the
stage-access policy stops a role-less site admin before any panel op is
reachable.

<a id="fn-a4"></a>
**f-a4** — `ReviewerGossipForm::execute()` writes `User::setGossip()` — a
field of the user record, no submission or assignment key. The reviewer
search list serves the same field per user (`gossipLabel`, note c), which is
also why the search shows it identically everywhere. Live-probed 2026-08-02
(OJS): a note saved on one submission's row was read back verbatim from
another submission's row for the same reviewer, and read-only in the search
expander; the window's guidance text is quoted in the entry and was
re-observed verbatim as a Section Editor in the claim check (2026-08-02;
the cross-submission overwrite was not re-driven).

<a id="fn-a5"></a>
**f-a5** — `AdvancedSearchReviewerForm::getEmailTemplates()`: the alternate
loop tests `isTemplateAccessibleToUser($user, $subsequentTemplate, …)` for
every `$alternateTemplate`; the base-class loop for the first-round template
(`ReviewerForm::getEmailTemplates()`) correctly tests each alternate.
Re-verified in the claim check (2026-08-02): both loops re-read, the wrong
variable still in place. The chooser's always-rendering is the separate
finding A19 (note f-a19). Update 2026-08-25 (rebase check): the pkp/pkp-lib
#10403 revert deletes `isTemplateAccessibleToUser()` and both loops' access
filtering entirely — the alternates are now appended unconditionally in
`ReviewerForm::getEmailTemplates()` and `AdvancedSearchReviewerForm`; A5
retired as moot.

<a id="fn-a6"></a>
**f-a6** — `Schema::getPropertyReviewAssignments()` skips rows with
declined/cancelled set unless `canSeeAllReviewAssignments()` grants
manager/sub-editor/site-admin at the assignment's stage (note a). The
legacy grid ops still authorize assistants for `reinstateReviewer` etc., but
the Vue table is the only current surface and it never receives the rows.
Live-probed 2026-08-02 (OJS + OMP): the manager control saw active,
declined and cancelled rows; the assistant-level participant's table showed
only the active row, and its row menu lacked "Login As" and "Editorial
Notes".

<a id="fn-a7"></a>
**f-a7** — Live-probed 2026-08-02 (OJS + OMP): every fresh invitation's
status cell rendered the title alone; the response due date was set and
visible in the Edit window. An earlier code reading placed the
`editor.review.responseDue` sub-line here (note b); the live cell never
shows it.
Issue report: [docs/issues/U27-A7-request-sent-row-no-response-due.md](../issues/U27-A7-request-sent-row-no-response-due.md).

<a id="fn-a8"></a>
**f-a8** — Live-probed 2026-08-02 (OJS + OMP): review date set before the
response date, submit — no toast, no inline error, the window stayed open
and no row appeared. Control: correcting the dates on the same form
succeeded. The undisplayed server message string is quoted in note f.

<a id="fn-a9"></a>
**f-a9** — Disproof live-probed 2026-08-02 (claim check; OJS scratch
journal with intervals set to 2/6 weeks): the Resend pickers arrived preset
response +2 weeks and review +6 weeks — each from its own interval, exactly
as a new request's (note f). Code agrees: `ResendRequestReviewerForm` takes
its defaults from the same due-dates trait as the Add form. Recorded so the
entry doesn't come back: the original observation ran where the two
intervals were equal, making "both preset to the response interval"
indistinguishable from correct behavior.

<a id="fn-a10"></a>
**f-a10** — Live-probed 2026-08-02 (OJS + OMP; shared handler; the claim
check re-drove both apps, OJS as a Section Editor): open "Read
Review", close without confirming → row still "Review Submitted" on both
apps; "Review Viewed" only ever appeared after revert-from-Thanked, both
apps. Mechanism: the legacy window's viewed-marking branch compared
strictly against a state new assignments never hold, so it never fired.
Update 2026-08-29 (modify-reviews rework, pkp/pkp-lib#13156): the legacy
window and its dead branch are deleted; the Review Details window PUTs
`…/consider` on open, and the probe of the same date saw the row flip to
"Review Viewed" live on both apps, surviving reload (note i). A10 retired
— the recorded defect is now the implemented behavior.

<a id="fn-a11"></a>
**f-a11** — Live-probed 2026-08-02 (shared mailable): on OJS twice
independently, then re-driven in the claim check with both date fields —
a review-due edit (2026-09-27 → 2026-10-11) reported "Submit Review By:
2026-09-27" and a response-due edit (2026-08-30 → 2026-08-01) reported
"Accept or Decline By: 2026-08-30" — and on OMP via a calendar-driven
due-date edit, whose notice also carried the pre-change date. The edit
saves the new dates on screen while the change-notice
email carries the old ones — the message is composed before the edit is
applied (note g). Update 2026-08-25 (rebase check): fixed upstream —
`EditReviewForm::execute()` now sends `EditReviewNotify` after
`Repo::reviewAssignment()->edit()`, built from a re-fetched assignment
(pkp/pkp-lib#13162); A11 retired. The `isset($notification)` guard is
unchanged, so a files/visibility-only edit still sends nothing.

<a id="fn-a12"></a>
**f-a12** — Live-probed 2026-08-02 (OJS; shared forms): the
assignment-changed email type appears neither in the profile's notification
settings roster nor on the unsubscribe page the email's footer links to.
Re-driven in the claim check (2026-08-02) by fetching the actual
unsubscribe link out of a live change notice: the page lists eleven email
types (issues, submissions, discussions, announcements, tasks, statistics)
— the changed-assignment type absent. The suppression guard itself: note g.

<a id="fn-a13"></a>
**f-a13** — Live-probed 2026-08-02 (OJS + OMP; the OMP subject-only send
was the claim check's, delivered with an empty body): a subject-only submit
delivered a
mail with an empty body on both apps; a both-empty submit showed "This
field is
required." under Subject only — the body's error node never renders
(note l).

<a id="fn-a14"></a>
**f-a14** — Disproof live-probed 2026-08-02 (claim check; OJS, the sequence
driven in both orders): zero "This field is required." messages before or
after picking a user; submitting with the field empty produced the generic
message, picking a user then cleared it, and the subsequent submit
succeeded (row "Request Sent"). The earlier observation's screen state
matches the empty-submit-then-pick order — the post-submit message was read
as a post-pick one.

<a id="fn-a15"></a>
**f-a15** — Settled 2026-08-02 (claim check, OJS; the entry's own recipe
run exactly): reminder sent → History read "Assigned / Notified / Reminder"
(the stamp verbatim "2026-08-02 01:53 PM Reminder" on the same-day probe);
an acceptance logged on the same row → History read "Assigned / Notified /
Confirm" — the Reminder milestone gone and the reminder stamp cleared.
The two earlier conflicting observations are both explained: one read
History before the response, one after. Mechanism: the response path resets
both reminder fields (note h), erasing the line. Since pkp/pkp-lib#13346
(driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge) the line reads
`Reviewer Reminded: {date and time}`; the reset that erases it is
untouched by that change (code-read, not re-driven after a response).

<a id="fn-a16"></a>
**f-a16** — Rescoped by the claim check, live-probed 2026-08-02 (OJS + OMP;
the Add, Edit and Resend windows share the picker widget): a date typed in
the field's own Y-m-d format synced to the hidden field while typing,
survived save and reopen, and appeared in downstream mails (typed
2026-10-11, end-to-end); input in another format — typed 10/20/2026 — left
the visible field showing "10202026" while the hidden field silently kept
the prior value, which was what the form submitted. The earlier
"calendar picks only" reading was over-broad; the wrong-format half of the
symptom stands. Re-driven 2026-09-28 (Edit window; OJS and OMP, two runs
each; the Editor and an assigned Section or Series Editor): a date typed
from the keyboard as YYYY-MM-DD saved, read back on the row ("Review due:
{date}") and in "Edit" on the same page and after a reload, and reached
the change notice ("*Submit Review By:* {date}"); typed as MM/DD/YYYY it
showed "11122026" and kept the old date (the save answered 200, nothing
sent). A date set with a script's `fill()` behaves like the wrong format,
which is how an earlier "typed dates are not saved" reading arose.
Issue report: [pkp-e2e#230](https://github.com/jardakotesovec/pkp-e2e/issues/230) ([docs/issues/U13-OJS8-impossible-typed-date-saved-wrong.md](../issues/U13-OJS8-impossible-typed-date-saved-wrong.md)).

<a id="fn-a17"></a>
**f-a17** — Live-probed 2026-08-02 (OJS + OMP): past response and review
due dates saved through the Edit window with no warning — the probes'
overdue rows were produced exactly this way; only the review-after-response
comparison guards the pair (note f).

<a id="fn-a18"></a>
**f-a18** — Live-probed 2026-08-02 (claim check; OJS + OMP, once per app on
scratch submissions, the letter cleared through the screen): the form's
POST returned HTTP 500 with an empty body and nothing surfaced — no error,
no toast, no error page; after reload the panel showed the reviewer at
"Request Sent" with a fully functional row menu, and the mail catcher held
zero request mails for the probe's tag (positive control: a normal add
delivered "Invitation to review"). Mechanism lean: the assignment row is
written before the mailable is composed; the empty body throws during mail
composition, after the DB writes, outside any transaction. The empty
letter without a clearing (measured 2026-09-28, OJS and OMP, two runs
each, with and without an active review form): "Select Reviewer" copies
the template into the letter's TinyMCE client-side, and a press before
that editor has initialised, 60–177 ms after the search box shows, leaves
the letter empty for good; a press after it filled the letter 8 times of
8 per app. No person presses that fast.

<a id="fn-a19"></a>
**f-a19** — Live-probed 2026-08-02 (claim check; OJS with two acting roles
and OMP, baseline contexts DB-checked to hold zero alternates of the
request template): the chooser section and its one-option select ("Review
Request") rendered on every baseline add. Mechanism:
`AdvancedSearchReviewerForm::getEmailTemplates()` appends the
subsequent-round request template unconditionally on every round, so the
count-based chooser gate (note d) always passes; the subsequent entry then
drops out of the rendered select, leaving a single visible option. Adjacent
to finding A5, retired 2026-08-25 — no alternate access check remains
(note f-a5); the unconditional append this note describes is unchanged.

<a id="fn-a20"></a>
**f-a20** — Live-probed 2026-08-27 (OMP, fresh reset, `enable_minified =
On` — the apps' production default and the test config): the Unassign and
Send Reminder dialogs rendered without their TinyMCE message iframe — the
editor never initializes. Cause verified in all three apps' checkouts
(lib/pkp 774240665; ojs 014c084231, omp d0226ccac, ops 5b7157a984):
`registry/minifiedScripts.txt` now lists `ReviewerActionFormHandler.js`,
but the committed `js/pkp.min.js` was not recompiled — the compiled bundle
contains zero occurrences of `ReviewerActionFormHandler` (control: the
retired `ReviewReminderFormHandler` string still appears in it), so
`$.pkp.controllers.grid.users.reviewer.form.ReviewerActionFormHandler` is
undefined at attach time. With `enable_minified = Off` the full
unassign→cancel→reinstate flow ran end to end (the mail capture in note k).
App-side packaging defect (a `pkp.min.js` recompile ships the fix);
reported upstream 2026-08-27. Update 2026-08-27 (same day): fixed
upstream — each app recompiled its committed `pkp.min.js` (commits
"pkp/pkp-lib#12903 Update pkp.min.js": ojs fcf2f00807, omp aba3ce08b, ops
3829458df3; checkout HEADs ojs fcf2f00807, omp 244a04311, ops 94f6bbc59a,
lib/pkp a9767b7f14 — the #13035 merge). The same grep now finds
`ReviewerActionFormHandler` twice in each bundle, matching the control.
Re-probed on fresh resets with `enable_minified = On`: scenarios 7 and 11
green on OJS and OMP (template chooser present in the unassign/cancel/
reinstate windows; the new cancel subject received). A20 retired. OPS's
registry is unchanged at ops 94f6bbc59a (note f-ops1) — OPS1 was itself
overturned the same day: the absence is OPS's deliberate baseline.

<a id="fn-a21"></a>
**f-a21** — Live-probed 2026-08-29 (OJS): a star clicked immediately after
the window opened flashed selected, then reverted, in one run of four;
that sighting was read as nothing saved, without reopening the window.
Clicks after the window settled saved every time (toast "Reviewer rating
saved", value persisted across close and reopen). Driven 2026-09-29 (OMP,
two of two runs, a newly submitted review, as the Press Manager), with the
answer to the on-open PUT `…/consider` held 4 s in the browser after the
server had answered: "5 out of 5 stars" pressed after "Modify Review"
enabled sent PUT `{quality}` (200), "Reviewer rating saved" showed and the
five stars stayed selected until the held answer arrived, then the radios
read "No rating"; "Cancel" and "Read Review" again showed 5 stars. Control
without the hold (the mark answered before the save's own reload of the
assignment): the five stars stayed. Mechanism, code-read at that
day's tip (lib/ui-library): `useReviewDetails` runs
`loadReviewAssignment().then(markViewedIfNew)`; `markViewedIfNew()` in
`useReviewAssignment` acts only on a completed, not yet considered
assignment and replaces `reviewAssignment` with the PUT's answer, which
carries the quality from before the press; `ReviewDetailsRating.vue`
watches the whole assignment and resets the radios to that quality. The
suite's bounded re-press in the rating helper absorbs the flip and never
asserts it. OJS runs the same lib/ui-library window; its 2026-08-29
sighting is the same revert. Not reproduced without a hold on 2026-09-29
(OJS and OMP, two runs each): a star pressed 36–63 ms after the window
showed, "Modify Review" still disabled, saved with its toast and stayed
selected 2.5 s after the window settled and on reopening, four of four;
the entry stands on the held-answer runs above until the maintainer's
throttled repro.

<a id="fn-a22"></a>
**f-a22** — `editor.review.readConfirmation` still carries the legacy
window's wording — "…you may upload the file below and then press 'Mark
as Complete'…" as displayed — and the same rework's commit
(pkp/pkp-lib#13156) tagged the key fuzzy, flagging the text for review.
Live-probed 2026-08-29 (OJS + OMP): the view window renders no upload
control anywhere; the "Upload" control exists only in
`ReviewDetailsEditModal.vue` (Rule 14b).

<a id="fn-a23"></a>
**f-a23** — Live-probed 2026-08-29 (OJS): "Recommendation: {label}" in
the window's info block and the same value again in the display-only
"Reviewer Recommendation" group below the comments. OMP renders neither
(note f-omp1).

<a id="fn-a24"></a>
**f-a24** — `ReviewAssignmentController::editReview` (lib/pkp
`api/v1/submissions/reviewAssignments/`) sets `dateCompleted` to the
current date when the assignment carries none, as part of a modification
save; since pkp/pkp-lib#13338 (lib/pkp `2dbdd585a6`, 2026-09-16, closing
pkp/pkp-lib#13337; on the OJS, OMP and OPS pointers 2026-09-17) the same
branch also sets `step` to 4 and, when it is empty, `dateConfirmed`. The
entry's premise, code-read 2026-08-29, was that the Review Details window
and its "Modify Review" open only from rows in the submitted and viewed
states. Driven 2026-09-17 on OJS and OMP, that is wrong: the row menu's
"Review Details" opens the window on every row that is not cancelled, and
"Modify Review" is enabled there at all three levels of note a. The issue
states the intention in its own words: an editor can submit a review on
the reviewer's behalf (since pkp/pkp-lib#13156); once that happens the
reviewer is no longer offered the decline and can open the review and read
what was submitted for them, read-only; the review is treated as accepted
on the reviewer's behalf, a reviewer who already accepted keeps the
original acceptance date, no acceptance email goes to the editor, and a
change to an already submitted review affects none of this. Retired
2026-09-17 as the designed behavior, which Rule 14d now states (evidence in
note i); what the screens leave open is findings A29, A30, OMP4 and OMP5.

<a id="fn-a25"></a>
**f-a25** — Reported by the PKP team (2026-08-31); live-probed the same day
(OJS), the same submitted review (recommendation "Accept Submission")
opened on both paths. Dashboard-popover path ("View unread
recommendation"): no "Recommendation:" heading or value between "Review
Submitted:" and the Reviewer Comments, and the "Reviewer Recommendation"
group's "Recommendation" value read "-" (the group and its guidance
sentence render; only the value is empty). Workflow path, same assignment:
"Recommendation: Accept Submission" on the info line and in the group.
Every other item — reviewer name line, guidance paragraph, "Download
Review Form", the "Review Submitted:" date, both Reviewer Comments blocks
(seeded marker strings found once on each path), the empty Reviewer Files
grid, the Reviewer rating row, footer "Cancel" / "Modify Review" / "Mark
as Complete" — was identical across the paths. Parity control: a
not-yet-submitted review ("View details" vs the row menu's "Review
Details") rendered identically on both paths, item for item. The window's
own API traffic is the same on both paths — the same
`reviewAssignments/{id}` and `reviewAssignments/{id}/review` GETs, all
200 — so the omission is in the window's rendering, not a failed or
missing request. Retired 2026-09-03: fixed by lib/ui-library `d3e19fc4`
("Set recommendation options when opened from submissions listing",
pkp/ui-library#971, merged 2026-09-01) — `dashboardPageStore.js` now passes
`recommendations` into the workflow modal props, and `ReviewDetailsModal.vue`
/ `ReviewDetailsEditModal.vue` declare the prop required; the commit sits in
all three apps' `lib/ui-library` as of 2026-09-03 (OJS `762415103f`, OMP
`a1aefa3fe`, OPS `6bda92fb03`). Verified live 2026-09-03 on OJS
`762415103f` (env 0, fresh reset): a submitted review with recommendation
"Accept Submission", opened through the dashboard's Editorial Activity
popover button "View unread recommendation", showed "Recommendation: Accept
Submission" on the info line and "Accept Submission" as the "Reviewer
Recommendation" group's value; the window's full text was
character-for-character identical to the one opened from the workflow's
Reviewers panel ("Read Review") — reviewer name line, "Review Submitted:"
date, both Reviewer Comments blocks, the empty Reviewer Files grid, the
rating row and the footer buttons. Incidental: opening the window from the
popover marks the review viewed (the Reviewers row then reads "Review
Viewed"), which is the existing behavior of Rule 14a, not a discrepancy. A
parity scenario and tests for the two entry paths remain PARKED by
maintainer ruling (2026-09-01) pending a separate discussion; none were
added here.

<a id="fn-a26"></a>
**f-a26** — Test run 2026-09-12 (OJS and OMP, scenario 11): the message
to the unassigned throwaway reviewer read subject `Your review for
"{title}" has been cancelled` over the `emails.reviewerUnassign.body` text,
both read from Mailpit the same day. Mechanism:
`PKPReviewerGridHandler::updateClearReview()` fetches the email template by
`ReviewCancel::getEmailTemplateKey()` for the Unassign and the Cancel form
alike, and `createMail()` sets the mailable's subject from that template,
so `ReviewerUnassign`'s own REVIEWER_UNASSIGN subject (installed by
`I12903_ReviewerUnassignEmailTemplate`, note k) never reaches the mail. The
suites match the removal mail by recipient and title (OJS) or body (OMP)
and assert the subject neither way.

<a id="fn-a27"></a>
**f-a27** — Test run 2026-09-12 (OJS and OMP, scenario 9, one run each):
after "Revert Decision" the row read "Review Viewed"; confirming a second
"Mark as Complete" left it at "Reviewer Thanked" with "Revert Decision"
alone, no "Complete" state in between. Mechanism, note j: `unconsiderReview`
resets only the considered flag, `dateAcknowledged` is never cleared, and
`ReviewAssignment::getStatus()` ranks a set acknowledged date above a
completed one, so the acknowledgement wins again on re-confirm. Neither
suite asserts the path (the register carries it). Driven 2026-09-24 on OJS
at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge: after the second "Mark as Complete" History listed
`Reviewer Thanked: 2026-09-24 06:10 AM` and then `Review Completed:
2026-09-24 06:12 AM`; between the revert and that completion it listed
neither (findings A33, A35).

<a id="fn-a28"></a>
**f-a28** — Test run 2026-09-13 (scenario 2, one run per app). OMP: the
suite's name search for a throwaway never-assigned reviewer, made after
pressing "Add filter: Reviews completed" with the slider at its minimum,
ended on "No items found." with the "Clear filter: Reviews completed"
button showing; the same search after clearing the filter found the entry
(the suite now clears first). OJS: the suite searches with the filter still
enabled and passes, yet the screen it recorded that day read the same way
— the search box holding the name, "Clear filter: Reviews completed"
shown, the list "No items found." — once the filtered list had loaded; the
assertion had matched the entry before that load, so the pass is a race,
not a journal difference. Mechanism lean: the reviewers listing's
completed-reviews clause compares the count against a per-reviewer
statistics row a never-assigned reviewer does not have
(`lib/pkp/classes/user/Collector.php`, the completed-reviews `when`
clause), so the comparison fails for them at any value. Not re-driven;
neither suite asserts the filtered result.

<a id="fn-a29"></a>
**f-a29** — Driven 2026-09-17 (OJS + OMP, scratch contexts): on an
unanswered, an accepted and a declined request, and on an unanswered one
carrying a review form, the dialog read "Modify this review? You are about
to modify the review submitted by {reviewer name}. All modifications will
be recorded in the activity log." and the edit window "You are modifying a
submitted review. …" over "Notified:" or "Confirmed:"; {OJS} no "Submitted
recommendation:" line and an empty required select. The declined request's
"Confirmed: {date and time}" line showed in both windows on both apps. The
texts are the rework's own (pkp/pkp-lib#13156, keys
`editor.review.modifyReview.confirmMessage` and `.description`), written
for a submitted review. The date line is `ReviewDetailsInfo.vue`'s latest
activity, the first date set among submitted, confirmed, reminded,
notified and assigned; a decline stamps `dateConfirmed` too, hence
"Confirmed:". By the same code a reminded, unanswered request would read
"Reminded:" (code-read, not driven). The date-line half was fixed by
pkp/ui-library#987 with pkp/pkp-lib#13346 (issue pkp/pkp-lib#13263):
driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge, a declined request reads
`Request Declined: 2026-09-24 06:10 AM` and a reminded, unanswered one
`Reviewer Reminded: 2026-09-24 06:10 AM` (note i); the entry keeps the
"Modify Review" wording half.

<a id="fn-a30"></a>
**f-a30** — Driven 2026-09-17 (OJS + OMP, every run): on a "Request
Declined" row "Modify Review" was enabled, the dialog and window opened,
and "Save Changes" showed the notice and the error summary quoted in the
entry; the browser's save call answered 422 with `{"error":"This review not
editable because it was declined."}` and the assignment read unchanged.
`EditReview::prepareForValidation` refuses declined and cancelled
assignments, while `ReviewDetailsModal.vue` disables the button only while
the review loads. After "Resend Review Request" the same save went through
and the row read "Review Submitted" (OMP, the same day).

<a id="fn-a31"></a>
**f-a31** — Driven 2026-09-17 (OJS + OMP): a throwaway Funding Coordinator
assigned to the stage opened the Review Details window of a submitted
review with all three footer buttons enabled; "Modify Review", its dialog
and the edit window opened; "Save Changes" showed the "Error" dialog quoted
in the entry and the review read unchanged; "Cancel" then asked the
unsaved-changes warning. `ReviewAssignmentController` registers GET/PUT on
the assignment, `…/consider` and GET `…/review` for manager, sub-editor,
site admin and assistant roles, and PUT `…/review` (`editReview`) for the
first three only; the view window's button reads no role. The same account
saved a star ("Reviewer rating saved") and marked the review complete (row
"Complete"). Driven 2026-09-29 (OJS + OMP, two runs each, a context with a
"Competing Interests" policy): the Funding Coordinator's view window showed
the "Competing Interests" group with "Modify Review" enabled, the edit
window offered the competing-interests radios, and "Save Changes" answered
401 with the same "Error" dialog; "Cancel" asked the unsaved-changes
warning and the row was unchanged.

<a id="fn-a32"></a>
**f-a32** — `useReviewDetails.js` used to reload the opener once the mark
answered (`loadReviewAssignment().then(async () => { if (await
markViewedIfNew()) onDataChangedFn(); })`); pkp/ui-library#853 (issue
pkp/pkp-lib#13359) removes that (`loadReviewAssignment().then(markViewedIfNew)`,
the `onDataChangedFn` prop gone) and relies on the modal store's
`dataChanged` flag. At the PR's earlier head `cab09538`, `useFetch` set
the flag through `modalStore.markModalDataChanged()` only when the
`…/consider` call had answered; `closeSideModalById()` reads the flag at
the moment of closing, so a mark answering after the close flagged a
window already closed and the Reviewers table's `onClose`
(`triggerDataChange`) returned without reloading. The dashboard passes
its unconditional `refetchCallback`, which reloads at every close and can
go out before the mark (in a failing trace the `_submissions` GET at
+0 ms, the `…/consider` POST at +18 ms). Driven 2026-09-23 on OJS at
`cab09538`, before its merge, with the kept check
`shared/playwright/checks/sync/ui-library-853/stale-read.js`, which holds
the `…/consider` call until the window has closed: from the workflow, the
row read "Review Submitted" after "Cancel" with no GET sent after it, and
"Review Viewed" after a reload; from the dashboard, `/_submissions`
reloaded once and the popover still offered "View unread recommendation".
The same check at the tip's lib/ui-library `2034439a`, on the same
database: the row read "Review Viewed" right after "Cancel", and the
popover offered "View recommendation". The OJS PR check of pkp/ojs#5444
(run 35770880623) was red on *Submissions dashboard*'s scenario 9 for the
same race, and the same test went red once in eight repeats at
`cab09538`. OMP shares the window and gets the change with its next
submodule update. Written up for the team in
`docs/reports/2026-09-23-ui-library-853.md` (a temporary report, deleted
once addressed; git history keeps it). At the PR head `51f0c727`, before
its merge (driven 2026-09-23 on OJS on a fresh reset with lib/ui-library
at `51f0c727`): `useReviewAssignment.js` calls `markDataChanged?.()` just
before sending the mark (POST `…/reviewAssignments/{id}/consider`), so a
window closed while that call is in flight is flagged and the Reviewers
table reloads at the close. Two gaps remain. (a) That reload runs
alongside the mark and can read the review before it is saved:
`stale-read.js`, holding the call until after the close, still read
stale on both surfaces (the workflow refetched `/submissions/{id}`, its
files, tasks and participants, and the row still read "Review
Submitted"; the dashboard reloaded `/_submissions` and the popover still
offered "View unread recommendation"). (b) A window closed before the
call is even sent (within about 0.2 s of opening, before the assignment
has loaded) is not flagged: the workflow table does not reload, and the
dashboard's unconditional reload runs before the call. In real
conditions: the earlier form of *Submissions dashboard* scenario 9's
test, with no wait before "Cancel", repeated 16 times at `51f0c727`, went
red twice; both traces show the list GET 14–25 ms before the mark's
POST. A page reload shows "Review Viewed" and "View recommendation".

<a id="fn-a33"></a>
**f-a33** — Driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge, on a
scratch journal. In the window: a submitted review marked complete,
thanked with the email at 06:10, "Revert Decision" › "OK", then "Read
Review" and "Mark as Complete" again at 06:12. The row read "Reviewer
Thanked"; Review Details read `Reviewer Thanked: 2026-09-24 06:10 AM`
(then `Recommendation: Accept Submission`); History read `Request Sent:
2026-09-24 06:10 AM` / `Request Accepted: 2026-09-24 06:10 AM` / `Review
Submitted: 2026-09-24 06:10 AM` / `Reviewer Thanked: 2026-09-24 06:10 AM`
/ `Review Completed: 2026-09-24 06:12 AM`. The window's own fetch of the
assignment: `considered` 2 (reconsidered), `dateConsidered` 06:12:41,
`dateAcknowledged` 06:10:40. By a decision, on a second submission: a
review thanked at 06:10:56 and reverted, then "Request Revisions" ›
"Notify Authors" › "Notify Reviewers" (the reviewer ticked) › "Record
Decision" at 06:12:51. The mail catcher held the reviewer's "Thank you
for your review" at 06:10:56 and again at 06:12:51; `dateAcknowledged`
stayed 06:10:56 while `dateConsidered` became 06:12:51; Review Details
read `Reviewer Thanked: 2026-09-24 06:10 AM` and History ended `Reviewer
Thanked: 2026-09-24 06:10 AM` / `Review Completed: 2026-09-24 06:12 AM`.
Control, the same decision: a submitted review never thanked read
`Reviewer Thanked: 2026-09-24 06:12 AM` in Review Details and `Review
Completed: 2026-09-24 06:12 AM` then `Reviewer Thanked: 2026-09-24 06:12
AM` in History. Before the change the window's line on a submitted review
was always `Review Submitted: {submission date}`. Mechanism:
`ReviewDetailsInfo.vue` `latestActivity` takes the first non-empty entry
in a fixed order, the thank first, instead of the latest date;
`ReviewAssignmentController::markReviewConsidered` sets `considered` to
RECONSIDERED without touching `dateAcknowledged`, and
`NotifyReviewers::sendReviewersEmail` stamps `dateAcknowledged` only
`if (!getDateAcknowledged())`. OMP runs the same component and code paths
(not driven there).

<a id="fn-a34"></a>
**f-a34** — Driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge, on two
scratch journals with the interface switched to Français (Canada), for a
reviewer sent a reminder and not answering. History: `Demande envoyée :
2026-09-24 06:15 AM` / `##editor.review.reviewerReminded## : 2026-09-24
06:15 AM`. Review Details: `##editor.review.reviewerReminded## :
2026-09-24 06:15 a.m.`; `pkp.localeKeys['editor.review.reviewerReminded']`
held that placeholder string. Every other new label rendered in French
(`Demande acceptée`, `Évaluation soumise`, `Recommandation : Accepter la
soumission`; `editor.review.reviewerThanked` = `Évaluateur-trice
remercié-e`). Before the change the History line read "{date} Rappel"
(`common.reminder`, fr_CA "Rappel"). Mechanism: `editor.review.reviewerReminded`
exists only in `locale/en/editor.po` (1 of 71 locales) and the translator
has no English fallback; the Vue side receives the same string. OMP uses
the same keys (not driven there).

<a id="fn-a35"></a>
**f-a35** — Driven 2026-09-24 on OJS at the PR head `26a5efcb74` (pkp-lib) / `ad0fdd33` (ui-library), before its merge, on two
reviews of scratch submissions. Before "Revert Decision" on a thanked
review History read `Request Sent: 2026-09-24 06:10 AM` / `Request
Accepted: …` / `Review Submitted: …` / `Review Completed: 2026-09-24 06:10
AM` / `Reviewer Thanked: 2026-09-24 06:10 AM`; after it `Request Sent:
2026-09-24 06:10 AM` / `Request Accepted: 2026-09-24 06:10 AM` / `Review
Submitted: 2026-09-24 06:10 AM` and nothing more, while the mail catcher
held the reviewer's "Thank you for your review" (06:10:56) and the
assignment still carried `dateAcknowledged`; Review Details read `Review
Submitted: 2026-09-24 06:10 AM`. Mechanism: `PKPReviewerGridHandler::reviewHistory`
passes the thank date as `getConsidered() == REVIEW_ASSIGNMENT_UNCONSIDERED
? null : getDateAcknowledged()`, matching `latestActivity` (note i); the
code before the change listed `common.acknowledged` in every state, so
History read "{date} Acknowledged" here (code-read). The "Review Completed"
line leaving is not new: `unconsiderReview` clears `dateConsidered`, which
History did not show before. The question was put to the team on the
change's review thread, 2026-09-24.

<a id="fn-a36"></a>
**f-a36** — Driven 2026-09-28 (OJS and OMP, two runs each; browser and
server at UTC, drives 06:04–06:29 UTC, so no day boundary was near): a
throwaway reviewer invited that morning on one scratch journal read "1
active … 0 · Yesterday" collapsed and "0" under "Days since last review
assigned" expanded, in the other journal's Add Reviewer window and in the
assigning journal's own; a reviewer whose completed review was backdated
one day read "Yesterday" and 1, one backdated two days "2 days ago" and
2. The press's Internal Review opening list likewise showed every
reviewer assigned that morning as "Yesterday". Mechanism:
`SelectReviewerListItem.vue` `daysSinceLastAssignmentLabelCompiled`
prints `reviewer.list.daysSinceLastAssignment` ("{$days} days ago") only
for a figure above 1, and `reviewer.list.daySinceLastAssignment`
("Yesterday") for any figure of 1 or less, 0 included; the figure is the
whole days since `dateLastReviewAssignment`, floored at 0, so the hour
does not matter.

<a id="fn-a37"></a>
**f-a37** — Driven 2026-09-28 (OJS and OMP, two runs each, as the Editor
on a declined row): after the window's "Resend Review Request" the notice
read "Request to reconsider the review assignment was sent.", the row
"Request Resent · Response due: …", and the Activity Log's top line
"Resent the request to review in round 1 to {reviewer} for submission
{$submissionid}.", while the assignment and decline lines below it read
the submission's number. Mechanism: the string
`log.review.reviewerResendRequest` in lib/pkp `locale/en/submission.po`
names `{$submissionid}`, while `ResendRequestReviewerForm::execute()`
logs the parameter as `submissionId`, so the lower-case placeholder finds
no value.

<a id="fn-a38"></a>
**f-a38** — Driven: *Tasks & discussions* note td13 and its kept check
`shared/playwright/checks/U37/K7/k7.js` (phase leave2, OJS and OMP): a
reviewer with accepted requests on rounds 1 and 2 stayed in the discussion
after the round 2 cancel and left after the round 1 cancel. Not driven: a
request only sent, a submitted or completed review, a press's other review
stage. Code-read 2026-09-28 (rewrite, no drive):
`PKPReviewerGridHandler::updateClearReview()` calls
`removeParticipantFromSubmissionTasks()` only when the review-assignment
Collector with `filterByActive(true)` finds none for the reviewer on the
submission; `isActive` keeps assignments neither declined nor cancelled
that are on the submission's current stage, or completed while the
submission is not published. On that reading a completed review keeps the
reviewer until publication, a request only sent keeps them, and on a press
a not-completed request on the other review stage does not.

<a id="fn-a39"></a>
**f-a39** — Driven 2026-09-29 (OJS + OMP, two runs each, the Editor, a
context with a "Competing Interests" policy): a review answered "I do not
have any competing interests" through the wizard, changed in "Modify
Review" to a statement: "View changes" on the new log row showed Updated
"Competing Interests declared: YES" / "Competing Interests: {statement}"
over Previous "Competing Interests declared: YES" / "Competing Interests:"
empty; set back to "I do not have…", Updated read "declared: YES" with an
empty statement. Code-read the same day (lib/pkp):
`ReviewAssignmentController` logs the new answer always with
`submission.event.review.competingInterestsWithDeclaration` ("declared:
YES") and the previous one by the stored `competingInterestsDeclared`
flag, which records that the question was answered, not which answer;
"Competing Interests declared: NO"
(`…competingInterestsWithNoDeclaration`) prints only for a previous state
never answered.

<a id="fn-a40"></a>
**f-a40** — Driven 2026-09-29 (a context with a "Competing Interests"
policy, the Editor, an accepted request, two runs per app). OMP: only
"I may have competing interests (Specify below)" ticked and a statement
typed; the save sent `{"competingInterests": "<p>…</p>", "comments": ""}`
and answered 200; the row read "Review Submitted" with "Read Review" and
the "Competing Interests" badge, its menu without "Log Response", and
History "Review Submitted: {save time}". OJS: the same entry sent no
request, "This field is required." showed under the empty
"Recommendation", and the row stayed "Request Accepted". The journal's
save with a recommendation picked was not driven with the answer; it is
the save of Rule 14d.

<a id="fn-a41"></a>
**f-a41** — Not driven. The saves whose rows were read (note i,
2026-09-17) all entered a comment. The empty press save (note f-omp5) and
the answer-only save (note f-a40) were not followed to the log, and the
kept activity-log reads of 2026-09-29 mix several reviewers' saves on one
submission, with rows that do not name the reviewer.

<a id="fn-a42"></a>
**f-a42** — Code-read, not driven, 2026-09-29: the resend
(`ResendRequestReviewerForm`, note k) clears `declined` and nulls
`dateConfirmed`, and the window's line takes the first non-empty entry of
Rule 14a's order from its own fetch (note i); whether the resend stamps a
new send date was not read. No read of the window (note i, 2026-09-17,
2026-09-24 and 2026-09-29) took a re-sent request; the 2026-09-29 claim
check saved "Modify Review" on one (Rule 14d) but kept no read of its
window before the save.

<a id="fn-omp1"></a>
**f-omp1** — Mechanism in notes b, i, o: recommendation roster passed only
by `ojs-main DashboardHandler`; the authoritative per-app switch is
`Application::hasCustomizableReviewerRecommendation()` — `true` in OJS,
`false` in OMP (code-read 2026-08-29) — which the Review Details windows
and the OJS-only Mark-as-Complete gate follow (`isOJS()`, note i; probed
2026-08-29: OMP button enabled at once, no recommendation surface;
2026-09-17: the review-form half of the gate does run on OMP, note i);
reviewer groups resolved per stage via
`getUserGroupsByStage($contextId, $stageId, ROLE_ID_REVIEWER)`. The
author-side absence and the empty "Recommendation:" letter label are
recorded in review-stage-and-rounds (its own register), probed live
2026-07-31.

<a id="fn-omp2"></a>
**f-omp2** — Live-probed 2026-08-02 (OMP, both stages; re-driven in the
claim check the same day): the opening roster
listed Internal and External Reviewers alike on an internal and an external
round; name searches filtered correctly per stage (positive and negative
controls), as did the underlying reviewers listing queried per stage.
Mechanism: the server-rendered panel builds its initial list without the
review-stage filter that its own request parameters carry
(`PKPSelectReviewerListPanel`); the search's refetch goes through the
reviewers listing, which applies it. Driven 2026-09-28 (OMP, two runs;
Internal Review, Round 1, as the Press Editor): the opening list showed a
person holding only External Reviewer beside an Internal Reviewer; a
search for him answered "No items found." while the Internal Reviewer
was found; after a reopen, "Select Reviewer" on him in the opening list
and "Add Reviewer" showed "{name} was assigned to review this submission
and sent an email notification." under the heading "Internal Review
(Round 1)", the add request answering 200 with `status: true`; his row
read "Request Sent" on the same page and after a reload, and signed in as
him, his list showed "Please accept or decline this request by …" with
"Respond to request", the review page opening on "1. Request".

<a id="fn-omp3"></a>
**f-omp3** — Test run 2026-09-12 (scenario 11; the two messages read from
Mailpit the same day): the OMP message's body read `… in {$journalName}.`
verbatim, while the OJS message read the scratch journal's name in that
place. The template text is the same in both apps' own `locale/en/emails.po`
(`emails.reviewerUnassign.body`, the 2026-08 unassign template of note k):
it names `{$journalName}`, the journal-only variable, where the app-neutral
context-name variable belongs, so a press leaves the placeholder as typed.

<a id="fn-omp4"></a>
**f-omp4** — Driven 2026-09-17 (OMP, three runs; OJS as the control): on
an unanswered, an accepted and a declined request with no review form
"Mark as Complete" was enabled; confirming "Mark this review as complete?"
showed the notice, and the assignment read `dateCompleted` and
`dateConfirmed` = the click's second with `step` left at 1 — the accepted
reviewer's own acceptance date overwritten, which the "Save Changes" path
guards (note f-a24). Unanswered and accepted rows read "Complete" with
"Thank Reviewer" and "Revert Decision" and the menu of an answered row; the
declined row stayed "Request Declined" with the button disabled afterwards;
all three windows read "Review Submitted: …" over "-" and "-". Both
reviewers, signed in: nothing under "Action Required by me", "Review
submitted on {date}" with "View" under "All assignments" and "Completed",
the review page on "1. Request" with tabs 2 to 4 disabled and one disabled
"Save and continue". OJS control: the same three windows showed the button
disabled beside the recommendation message, and the unanswered reviewer's
page still offered the accept and the decline. Mechanism: the `…/consider`
PUT behind the button sets `dateConfirmed` and `dateCompleted` together
whenever the assignment carries no `dateCompleted` (its own comment:
"Editor completes the review."), without the guard on an existing
`dateConfirmed` and without `step`; the button's guards are the
recommendation ({OJS}) and the review form alone. The guidance the entry
cites is `editor.review.readConfirmation` (finding A22). Since
pkp/ui-library#987 with pkp/pkp-lib#13346 (issue pkp/pkp-lib#13263) the
window's dated line follows Rule 14a's order, and the button also stamps
the consideration date, so these windows would now read "Review
Completed: …" (code-read 2026-09-24, not driven on OMP); the entry names
only the moment, which both labels carry. The same code reading raises an
unprobed side: History would now show "Request Accepted" and "Review
Submitted" for the editor's click, where it read "Confirm" and
"Completed" before.

<a id="fn-omp5"></a>
**f-omp5** — Driven 2026-09-17 (OMP, three runs): "Save Changes" pressed
in the just-opened "Modify Review" window of an unanswered request, nothing
typed: the save call answered 200, the window closed, the row read "Review
Submitted" with "Read Review" and the menu of an answered row, the view
window "Last modified by {name}", "Review Submitted: …" and "-" in both
blocks; the assignment read both dates = the save's second and `step` 4.
OJS control: the same press sent no request, "This field is required."
under the empty "Recommendation".

<a id="fn-omp6"></a>
**f-omp6** — Seen 2026-09-05 in the view window of a form-based review on a
press and driven 2026-09-17 (OMP) in both windows of a request carrying a
review form: the block's title is the form's own, the line under it the
fixed string "The questions this journal asks reviewers to answer."
(`editor.review.reviewerForm.description.default`, lib/pkp
`locale/en/editor.po`), shared by OJS and OMP with no press override.

<a id="fn-ops1"></a>
**f-ops1** — Code+registry inspection 2026-08-27 (pkp/ops main
5b7157a984): of the pkp/pkp-lib#13035 companion changes, OPS took only the
`registry/minifiedScripts.txt` swap — its `registry/emailTemplates.xml` has
no `REVIEWER_UNASSIGN` entry, `locale/en/emails.po` carries no
`emails.reviewerUnassign.*` / `emails.reviewCancel.*` keys, and
`dbscripts/xml/upgrade.xml` lacks the `I12903_ReviewerUnassignEmailTemplate`
migration (ojs and omp carry all three). `ReviewerNotifyActionForm::
initData()` calls `Repo::emailTemplate()->getByKey($contextId,
'REVIEWER_UNASSIGN')` and immediately calls `->getData('key')` and
`->getLocalizedData('body')` on the result, so the missing template yields
a null-method fatal before the unassign window renders. Not live-probed —
no OPS screen reaches the window on a default install (absence note p).
Overturned 2026-08-27 (maintainer ruling, interactive session + registry
check at ops 94f6bbc59a): OPS has never shipped reviewer-flow email
templates — its `registry/emailTemplates.xml` contains no `REVIEW_REQUEST`,
`REVIEW_REMIND` or `REVIEW_CANCEL` either (a single `REVIEW*` hit, the
author-response round template, vs 19 `REVIEW*` registrations in OJS's) —
so the #12903 app-side companion (template + locale + migration) was never
applicable to OPS's baseline; the only piece OPS needed, the
`minifiedScripts.txt` swap, it received. Ruling: OPS has no review
process, so `REVIEWER_UNASSIGN` cannot be relevant there; the earlier
"latent fault" framing measured OPS against the OJS/OMP baseline instead
of its own.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| Reviewers panel | workflow → Review → Review Round {N} → "Reviewers" | VUE-046 · AFFW-486, 488..501, 503 |
| Add Reviewer window | Reviewers panel → "Add Reviewer" | AFFW-621..624 · VUE-016 · AFFW-213..215, 217..224 |
| Create New Reviewer | Add Reviewer window → link | AFFW-626..630 · MAIL-038 |
| Enroll Existing User | Add Reviewer window → link | AFFW-631..633 |
| Shared request form footer | all three add modes | AFFW-634..641 · GRID-026 |
| Default (fallback) add form | add modes without a search surface | AFFW-625 |
| Edit Review window | row menu → "Edit" | AFFW-642..644 · GRID-026 · MAIL-026 · NOTIF-048 |
| Send Reminder window | row button (overdue only) | AFFW-646..648 · MAIL-042 |
| Automatic reminder emails | scheduled, per due assignment | JOB-012 · MAIL-043, 046 |
| Review Details window (view · modify) | row button "Read Review" / row menu → "Review Details"; "Modify Review" inside | AFFW-655..663 · VUE-068 · AFFW-504, 657 |
| Review export (download) | Review Details → "Download Review Form" | AFFW-668 |
| {OJS} recommendation control | Review Details window (display) · Modify Review (select) | AFFW-664 · GRID-086 |
| {OMP} recommendation absence | Review Details windows | AFFW-665 · GRID-098 |
| Thank Reviewer window | row button | AFFW-645 · MAIL-034 |
| Revert / ORCID confirm dialogs | row actions | AFFW-490, 506 |
| Unassign / Cancel window | row menu | AFFW-649..650 · MAIL-041 |
| Reinstate window | row menu (cancelled rows) | AFFW-651 · MAIL-039 |
| Resend Request window | row menu (declined rows) | AFFW-652 · MAIL-040 |
| Email Reviewer window | row menu | AFFW-653 |
| Editorial Notes window | row menu → "Editorial Notes" | AFFW-654 |
| Log Response side modal | row menu | AFFW-501, 505 · VUE-067 |
| History side modal | row menu → "History" | AFFW-498, 708 |
| Reviewer task ("Review pending.") | reviewer's task list | NOTIF-019 |
| Reviewer interests lookup | create form + search list | API-048 |
| Assignment data shape | review assignments on the submission payload | SET-020 |
| Request emails | keys REVIEW_REQUEST / REVIEW_REQUEST_SUBSEQUENT | MAIL-044, 045 |

## Reference — code anchors

- `lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php` — the remaining legacy window ops (the `readReview` op is deleted), role map, author denial
- `lib/pkp/api/v1/submissions/reviewAssignments/ReviewAssignmentController.php` — Review Details endpoints: assignment fetch/rating, consider (viewed / mark as complete), review fetch/modify
- `ojs-main/controllers/grid/users/reviewer/ReviewerGridHandler.php` (recommendation by proxy) · `omp-main/…/ReviewerGridHandler.php` (empty)
- `lib/pkp/controllers/grid/users/reviewer/form/` — `ReviewerForm`, `AdvancedSearchReviewerForm`, `CreateReviewerForm`, `EnrollExistingReviewerForm`, `EditReviewForm`, `ReviewReminderForm`, `ThankReviewerForm`, `ClearReviewForm`, `UnassignReviewerForm`, `CancelReviewForm`, `ReinstateReviewerForm`, `ResendRequestReviewerForm`, `EmailReviewerForm`, `ReviewerGossipForm`, `traits/HasReviewDueDate`
- `lib/pkp/classes/submission/action/EditorAction.php` — assignment creation + request mail
- `lib/pkp/classes/submission/reviewAssignment/ReviewAssignment.php` — status machine; `lib/pkp/schemas/reviewAssignment.json`
- `lib/pkp/classes/submission/maps/Schema.php::getPropertyReviewAssignments()` — row serialization and visibility
- lib/ui-library `src/managers/ReviewerManager/` — table, cells, actions, log-response modal; `ReviewDetailsModal.vue` / `ReviewDetailsEditModal.vue` / `ReviewDetailsRating.vue` + `useReviewDetails` / `useReviewDetailsForm` / `useReviewAssignment` / `useReviewContent` — the Review Details view & modify windows
- lib/ui-library `src/components/ListPanel/users/SelectReviewerListPanel.vue` · `SelectReviewerListItem.vue` + `lib/pkp/classes/components/listPanels/PKPSelectReviewerListPanel.php` — reviewer search
- `lib/pkp/classes/submission/reviewer/ReviewerAction.php` — response recording (log response)
- `lib/pkp/jobs/email/ReviewReminder.php` (send) · `lib/pkp/classes/task/ReviewReminder.php` (clock, owned by review setup)
- `lib/pkp/classes/mail/mailables/` — `ReviewRequest`, `ReviewRequestSubsequent`, `ReviewerRegister`, `EditReviewNotify`, `ReviewRemind`, `ReviewRemindAuto`, `ReviewResponseRemindAuto`, `ReviewAcknowledgement`, `ReviewerUnassign`, `ReviewCancel`, `ReviewerReinstate`, `ReviewerResendRequest`
- `lib/pkp/api/v1/vocabs/PKPInterestController.php` — interests lookup
