---
name: reviewer-suggestions
status: verified
---

# Reviewer suggestions {OJS OMP}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

While making a submission, an author may name people they think should
review it, each with a reason. Editors see that list on the workflow screen
and, once the submission is in review, can turn a name into a real review
request in one move. The feature is off until a manager switches on
"Reviewer Suggestion at Submission" in the review settings. This spec covers
the wizard's "Reviewer Suggestions" step with its "Add Reviewer Suggestion"
window, the "Reviewer Suggestions" panel of the wizard's Review step, the
workflow screen's "Reviewers Suggested by Author" panel, and the "Select a
Reviewer from Reviewer Suggestions" list inside the Add Reviewer window.
<sup>a</sup>

The wizard itself is
[→ submission wizard](U21-submission-wizard.md#steps); the Add Reviewer
window and everything that follows a request are
[→ reviewer assignment & management](U27-reviewer-assignment-and-management.md#search).
<sup>p</sup>

A preprint server installs no Review settings tab, so "Reviewer Suggestion
at Submission" cannot be switched on there: its submission wizard has no
"Reviewer Suggestions" step and its workflow screen no "Reviewers Suggested
by Author" panel. <sup>a</sup>

## Actors & permissions

**Terms used below.** A **draft** is a submission the author has started and
not yet submitted (the wizard is still open on it). A **pending
suggestion** is one that has not yet been turned into a reviewer (Rule 11).
<sup>p</sup>

The **editorial roles** of this spec are Journal Manager, Editor, Site
Administrator (with or without a journal role), and Section Editor and
Guest Editor assigned to the stage (a press installs no Guest Editor role);
the Funding Coordinator, the one assistant-level role that reaches the
review stage
([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)),
is named where it differs. <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Suggest reviewers** ("Add Reviewer Suggestion", "Edit", "Delete" on the wizard step) | • Author: on their own draft, while "Reviewer Suggestion at Submission" is on (Rules 2–5); after the final "Submit" no screen offers a change (Rule 7)<br>• Journal Manager: on any author's draft, the same wizard step; the Editor Dashboard's "All in submission stage" view lists the draft as "Incomplete" with one button, "Complete submission", which opens it<br>• Section Editor, another Author, Reviewer, Reader: no screen offers another's draft, and typing its address lands on the access-denied page <sup>a</sup> <sup>t1</sup> |
| **See the "Reviewers Suggested by Author" panel** (workflow screen, Submission and Review stages) | • Editorial roles: whenever the submission carries at least one suggestion to list (Rule 8)<br>• Funding Coordinator: the panel never shows; instead a dialog titled "Error", reading "The current role does not have access to this operation." with one button, "OK", opens on the stage, with or without a suggestion ⚠ [A1](#a1)<br>• Author: never; the author view carries no such panel <sup>a</sup> |
| **"Add Reviewer" from a suggestion** (the row's "…" menu on the Review stage) | • Editorial roles: while the Review stage is the submission's current stage (Rule 9); the request itself follows the Add Reviewer window's own rules (*Reviewer assignment & management*) <sup>a</sup> |
| **"Select Reviewer" on a suggestion inside the Add Reviewer window** | • Whoever opened the Add Reviewer window, while the suggestion is pending and the person is not yet on the round (Rule 10)<br>• Funding Coordinator: offered on every entry, but on a person with no account it opens the "Create New Reviewer" form, whose "Add Reviewer" is refused with a browser alert, "The current role does not have access to this operation.", and the form stays open ⚠ [A5](#a5) <sup>a</sup> |

## Fields & validation

The "Add Reviewer Suggestion" window (also the "Edit" window, prefilled).
Its "Save" refuses the form until every required box is filled: each empty
required box shows "This field is required.", and the top of the window
lists them ("Please correct {N} errors. Go to {box}: {message}", with "Jump
to next error"). "Save" cannot be pressed again until every flagged box has
changed: changing one box clears its own message and the count in "Please
correct {N} errors." drops by one, and "Save" comes back with the last one.
<sup>b</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Given Name" | yes | One box per form language (Rule 13) <sup>b</sup> |
| "Family Name" | no | One box per form language (Rule 13) <sup>b</sup> |
| "Email" | yes | Must be an email address ("This is not a valid email address."). Two suggestions on the same submission cannot share an address: the second is refused with "The email has already been taken." under the box, and so is an "Edit" that changes an entry to another entry's address; but the same address typed in another case is accepted as a second entry ⚠ [A6](#a6) <sup>b</sup> <sup>t3</sup> |
| "ORCID iD" | no | Shown after "Email" only while the journal's ORCID functionality is enabled (*ORCID integration*). Only an iD written in full, as "https://orcid.org/0000-0002-1825-0097", saves; a bare "0000-0002-1825-0097" or anything else is refused with "The ORCID iD you specified is invalid. Please include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097")." Once saved, the iD shows again only in the author's "Edit" window ⚠ [A2](#a2) <sup>b</sup> <sup>t16</sup> |
| "Affiliation" | yes | One box per form language (Rule 13) <sup>b</sup> |
| "Reasons for suggesting reviewer" | yes | Rich text; the help under the label reads "Please share why you are recommending this reviewer and mention is there are any potential conflict of interest." ⚠ [A11](#a11). One box per form language (Rule 13) <sup>b</sup> |

## Rules & state

<a id="step"></a>
1. **Where it starts.** With "Reviewer Suggestion at Submission" on, the
   submission wizard carries a step "Reviewer Suggestions" between "For the
   Editors" and "Review". Above the panel the step shows the
   journal's guidance text, which arrives as "When submitting, you have the
   option to suggest several potential reviewers. …" (the "For Reviewer
   Suggestion" setting); the default text misspells "valuable" as
   "valueable" ⚠ [A7](#a7). <sup>c</sup> <sup>t15</sup>
2. **The step's panel.** The panel is headed "Reviewer Suggestions" with an
   "Add Reviewer Suggestion" button. Each entry shows the person's full
   name, their affiliation as a badge, and the email address on the line
   below, with "Edit" and "Delete" on the right. With no entry the panel
   reads "No items found.". <sup>c</sup> <sup>t4</sup>
3. **Adding.** "Add Reviewer Suggestion" opens the side window of that
   name (Fields). "Save" adds the entry to the panel and closes the window.
   A suggestion is stored the moment "Save" is pressed, not when the author
   presses "Continue": it survives "Save for Later" and is listed again
   when the draft is reopened. <sup>c</sup> <sup>t5</sup>
4. **Editing.** "Edit" opens the same window, titled "Edit", with the
   entry's values filled in; "Save" replaces the entry in place. Closing
   the window without "Save" drops what was typed, with no warning.
   <sup>d</sup>
5. **Deleting.** "Delete" asks "Are you sure you want to remove this
   suggestion? This action can not be undone." in a dialog titled "Delete
   Reviewer Suggestion", with the buttons "Delete Reviewer Suggestion" and
   "Cancel". Confirming removes the entry at once. <sup>d</sup>
6. **The Review step.** The wizard's Review step lists the suggestions
   under a heading "Reviewer Suggestions" with an "Edit" button that
   returns to the step: each entry shows the full name, the email address
   and the affiliation, not the reason. With no suggestion the block shows
   the warning "No reviewers have been suggested for this submission."
   instead. Suggestions are optional: the warning never blocks "Submit".
   <sup>e</sup> <sup>t17</sup>
7. **After submitting.** The author's own view of the workflow screen shows
   no suggestions panel on any stage, so once the submission is in, the
   author can neither see nor change what they suggested ⚠ [A4](#a4). The
   entries are kept for the editors. <sup>e</sup>
<a id="panel"></a>
8. **The editors' panel.** On the editorial view of the workflow screen a
   panel headed "Reviewers Suggested by Author" sits under the Participants
   panel, on the Submission stage and on the Review stage. It appears only
   while "Reviewer Suggestion at Submission" is on and there is at least one
   suggestion to list. Each row shows the person's initials, full name, affiliation and
   the author's reason. On a press the panel belongs to the External Review
   stage; the Internal Review stage shows none ⚠ [OMP1](#omp1). <sup>f</sup>
   - 8a. On the Submission stage the panel lists every suggestion, the ones
     already turned into reviewers included, and offers no action on any
     row. <sup>f</sup> <sup>t6</sup>
   - 8b. On the Review stage the panel lists only pending suggestions. While
     the Review stage is the submission's current stage, each row ends in a
     "…" menu (named "{name} More Actions" to screen readers) holding one
     action, "Add Reviewer". Once the submission has moved on to
     Copyediting, the rows show without the menu. <sup>f</sup>
   - 8c. When the last pending suggestion is turned into a reviewer, the
     panel disappears from the Review stage. <sup>f</sup>
   - 8d. Switching "Reviewer Suggestion at Submission" off hides the panel
     on every stage; the suggestions are kept, and the panel returns with
     them when the setting is switched on again. <sup>f</sup> <sup>t7</sup>
<a id="add-from-panel"></a>
9. **"Add Reviewer" from a suggestion.** The row's "Add Reviewer" opens the
   Add Reviewer window in one of three modes, chosen by the suggested email
   address: <sup>g</sup>
   - *The address belongs to an account holding a Reviewer role in this
     journal*: the window opens on "Selected Reviewer" showing that
     person's name and email, skipping "Locate a Reviewer", with the
     "Review Request" message and both due dates already filled; the editor
     changes what they want and presses "Add Reviewer". <sup>t8</sup>
     When the person is already a reviewer on the round while their
     suggestion is still pending (as [A6](#a6) can leave it), the row
     still offers "Add Reviewer", and pressing "Add Reviewer" in the window
     fails: no message shows, the window stays open and the suggestion
     stays in the panel ⚠ [A12](#a12).
   - *The address belongs to an account without a Reviewer role*: the window
     opens on the form "Enroll an Existing User as Reviewer" with that user
     already in "Search By Name" ("{name} ({email})") and "Enroll the user
     with this reviewer user group" set to the journal's reviewer role
     ("Reviewer"; on a press "External Reviewer"); the editor presses "Add
     Reviewer".
   - *No account carries the address*: the window opens on the form "Create
     New Reviewer" with "Given Name", "Family Name", "Email" and
     "Affiliation" filled from the suggestion; the editor types a
     "Username" (or presses "Suggest") and presses "Add Reviewer". With
     "Username" left empty, "Add Reviewer" is refused with "This field is
     required." under the box and the suggestion stays pending.
   In all three, a successful "Add Reviewer" adds the person to the
   Reviewers panel and the suggestion leaves the "Reviewers Suggested by
   Author" panel at once, with no reload (Rule 11). Closing the window
   before "Add Reviewer" (its "Cancel", or its "Close" arrow, which asks
   nothing even after typing) leaves the suggestion in the
   panel. The "Create New Reviewer" and "Enroll an Existing User as
   Reviewer" forms carry a "Back to Search" link that turns the window into
   the Reviewers panel's own Add Reviewer window (Rule 10); "Selected
   Reviewer" has no such link.
<a id="add-window"></a>
10. **The suggestions list inside Add Reviewer.** When the Reviewers
    panel's own "Add Reviewer" is pressed while the setting is on and the
    submission has pending suggestions, the window opens with a list "Select
    a Reviewer from Reviewer Suggestions" above "Locate a Reviewer". Each
    entry shows the full name, affiliation and reason, and a "Select
    Reviewer" button (named "Select undefined" to screen readers
    ⚠ [A8](#a8)). An entry whose person is already a reviewer on this round
    while the suggestion is still pending (Rule 11 says how) shows the
    notice "This reviewer has already been assigned to this review round."
    and no button. <sup>h</sup> <sup>t13</sup>
    - "Select Reviewer" on a person holding a Reviewer role selects them in
      this same window, exactly as "Select Reviewer" in "Locate a Reviewer"
      does. <sup>h</sup>
    - "Select Reviewer" on anyone else opens a second "Add Reviewer" window
      on top, on the "Enroll an Existing User as Reviewer" or the "Create
      New Reviewer" form, prefilled as in Rule 9. When that inner "Add
      Reviewer" succeeds, the inner window closes, the entry leaves the
      suggestions list (its emptied row stays as a gap until the window is
      reopened ⚠ [A9](#a9)), the new reviewer appears under "Locate a
      Reviewer" with the same notice and no button, and the outer window
      stays open until the editor presses the "Close" arrow at its top, its
      only close control. Closing either window discards what was typed without
      asking. The inner form's "Back to Search" opens a whole further Add
      Reviewer window inside the inner one instead of returning to the
      outer list ⚠ [A10](#a10). <sup>h</sup> <sup>t9</sup>
    - On a press the list appears in the Add Reviewer window of the
      Internal Review stage as well, although that stage shows no panel
      (Rule 8). <sup>h</sup> <sup>t10</sup>
<a id="approval"></a>
11. **What turns a suggestion into a reviewer.** The Add Reviewer window's
    "Add Reviewer" retires a suggestion the moment it puts a reviewer whose
    account email equals the suggested address on any round of the
    submission, from whichever route the editor took (Rule 9, Rule 10, or
    "Locate a Reviewer" picking the same person). A reviewer created from a
    suggestion under a different email address, changed in the "Create New
    Reviewer" form before "Add Reviewer", does not match: the suggestion
    stays pending. A reviewer who came onto a round without that window
    (scenario 3's given seeds one) leaves the suggestion pending too, and
    its entry shows Rule 10's notice. <sup>i</sup> <sup>t11</sup>
12. **Once matched, always matched.** A suggestion that has been turned
    into a reviewer never returns to the Review stage's panel or to the Add
    Reviewer list, even when that reviewer is later unassigned or
    cancelled; it stays listed on the Submission stage (Rule 8a)
    ⚠ [A3](#a3). <sup>i</sup> <sup>t12</sup>
13. **Languages.** Name, affiliation and reason are entered per form
    language. The window opens with one box each; on a journal with more
    than one form language, a button named for each other language (for
    example "French") adds that language's boxes. "Email" and "ORCID iD"
    have one box. <sup>b</sup>

## Side effects

- Adding, editing or deleting a suggestion sends no email, raises no
  notification and writes nothing to the activity log. <sup>k</sup>
- Turning a suggestion into a reviewer records, where no screen shows it,
  which reviewer and which editor it became; the request email, the new
  reviewer's welcome email and the log rows of that "Add Reviewer" are the
  Add Reviewer window's own (*Reviewer assignment & management*).
  <sup>k</sup> <sup>t14</sup>

## Settings that modify behavior

- **"Reviewer Suggestion at Submission"** (Settings › Workflow › Review;
  *Review setup & review forms*): off on a fresh install and on the seeded
  journal. On, the wizard gains the "Reviewer Suggestions" step (Rule 1)
  and the editors' panel shows on the Submission and Review stages
  (Rule 8); switched off again, the panel hides on every stage and the
  suggestions are kept (Rule 8d).
- **"For Reviewer Suggestion"** (Settings › Workflow › Submission, "Author
  Guidance"; *Submission intake configuration*): the guidance text above
  the step's panel, with a default text (Rule 1); a custom text shows on
  the next wizard visit.
- **"Enable ORCID functionality"** (Settings › Users & Roles › ORCID;
  *ORCID integration*): off by default; on, the suggestion window gains
  the "ORCID iD" box (Fields).
- **Form languages** (Settings › Website › Setup › Languages, "Forms";
  *Languages & locales*): one on the seeded and scratch journals; each
  further language adds its own name, affiliation and reason boxes to the
  window (Rule 13).

## Cross-feature interactions

- **Submission wizard** owns the step rail, the gate that adds the
  "Reviewer Suggestions" step, the Review step's chrome and "Submit"; this
  spec owns what the step and its Review block show. <sup>p</sup>
- **Review setup & review forms** owns the "Reviewer Suggestion at
  Submission" checkbox
  ([→ review setup](U29-review-setup-and-review-forms.md#access)); this
  spec states only its effects. <sup>p</sup>
- **Submission stage** and **Review stage & rounds** own the workflow
  screen's stage layout and name the panel's place under Participants
  ([→ Submission stage panels](U25-submission-stage.md#panels),
  [→ review rounds](U26-review-stage-and-rounds.md#rounds)); the panel's
  content and actions are Rule 8 here. <sup>p</sup>
- **Reviewer assignment & management** owns the Add Reviewer window, its
  "Locate a Reviewer", "Create New Reviewer" and "Enroll Existing User"
  modes, the request email and the Reviewers panel row that results; this
  spec owns the suggestions list inside the window (Rule 10) and the
  matching that retires a suggestion (Rule 11). <sup>p</sup>
- **ORCID integration** owns "Enable ORCID functionality", which adds the
  "ORCID iD" box to the suggestion window (Fields). <sup>b</sup>
- **Workflow screen & stage access** owns who reaches which stage; the
  Actors table starts from that gate. <sup>p</sup>
- **Submission intake configuration** owns the "Author Guidance" boxes,
  including "For Reviewer Suggestion" (Rule 1). <sup>p</sup>

## Canonical scenarios

Scenarios 1 to 5 run on scratch journals created with "Reviewer Suggestion
at Submission" on, with throwaway accounts and scratch submissions;
scenario 1's control and scenario 6 run on the seeded journal and preprint
server with ready accounts. Accounts, passwords, each scenario's own
suggested addresses and typed username, and the tooling recipe are in the
footnote. <sup>s</sup>

1. **The author suggests reviewers on a draft**

   Given: Author, on their own draft.

   - **The step**: open the draft's wizard; the step "Reviewer Suggestions"
     sits between "For the Editors" and "Review". On it, the guidance text
     above the panel begins "When submitting, you have the option to
     suggest several potential reviewers." (the default text misspells
     "valuable" [A7](#a7)), and the panel, headed "Reviewer Suggestions"
     with an "Add Reviewer Suggestion" button, reads "No items found.".
   - **The Review step with no suggestion**: press "Continue": the "Review"
     step shows, under the heading "Reviewer Suggestions", the warning "No
     reviewers have been suggested for this submission."; press that
     block's "Edit" to return to the step.
   - **The required boxes**: press "Add Reviewer Suggestion" and then
     "Save" with every box empty: "This field is required." shows under
     "Given Name", "Email", "Affiliation" and "Reasons for suggesting
     reviewer", the top of the window reads "Please correct 4 errors."
     with "Jump to next error", and "Save" cannot be pressed. Type Kay in
     "Given Name": its message clears, the top reads "Please correct 3
     errors." and "Save" still cannot be pressed. Type Suggested in
     "Family Name", kay.suggested@mail.test in "Email" and Public Knowledge
     University in "Affiliation": "Save" still cannot be pressed. Type
     "Expert in open access publishing; no conflict of interest." in
     "Reasons for suggesting reviewer": "Save" can be pressed again.
   - **Adding**: press "Save": the window closes and the panel lists "Kay
     Suggested" with the badge "Public Knowledge University", the address
     on the line below, and "Edit" and "Delete" on the right. Add a second
     entry the same way (Lee in "Given Name", Second in "Family Name",
     lee.second@mail.test in "Email", Second University in "Affiliation",
     "Knows the corpus." in "Reasons for suggesting reviewer").
   - **The same address twice**: start a third with kay.suggested@mail.test
     in "Email" and the other required boxes filled as for Lee: "Save" is
     refused with "The email has already been taken." under "Email" and
     the panel keeps two entries (the same address typed in capitals would
     be accepted as a third [A6](#a6)); close the window.
   - **Editing**: press "Edit" on Kay's entry: the window is titled "Edit"
     with her values filled in; change "Affiliation" to Open University
     and close the window without "Save": no warning shows and the
     entry's badge still reads "Public Knowledge University". Press "Edit"
     again, change "Affiliation" to Open University and press "Save": the
     entry's badge reads "Open University".
   - **Deleting**: press "Delete" on Lee's entry: a dialog titled "Delete
     Reviewer Suggestion" asks "Are you sure you want to remove this
     suggestion? This action can not be undone."; press "Cancel": the
     entry stays; press "Delete" again and then "Delete Reviewer
     Suggestion": the entry is gone.
   - **"Save for Later"**: press "Save for Later" and reopen the draft from
     My Submissions: the step lists "Kay Suggested" again.
   - **The Journal Manager on the draft**: Journal Manager: the Editor
     Dashboard's "All in submission stage" view lists the draft as
     "Incomplete" with one button, "Complete submission"; press it: the
     draft's wizard opens; on its "Reviewer Suggestions" step, "Kay
     Suggested" is listed with "Edit" and "Delete", and "Add Reviewer
     Suggestion" is offered.
   - **The Review step and "Submit"**: Author, on the draft again: press
     "Continue": the "Review" step's "Reviewer Suggestions" block, with
     its "Edit" button, shows the full name, the email address and the
     affiliation, and no reason. Press "Submit" and confirm in the dialog
     that follows: the submission is in.
   - **"Submit" with no suggestion**: on a second draft of the same
     Author, walked to the "Review" step with nothing added on its
     "Reviewer Suggestions" step: the block shows the warning "No
     reviewers have been suggested for this submission."; press "Submit"
     and confirm in the dialog that follows: the submission is in.
   - **The author's view after submitting**: open the first submission
     from My Submissions: no stage of the author's view shows a
     suggestions panel [A4](#a4).
   - **The Journal Manager's read**: Journal Manager, on the same
     submission's Submission stage: under the Participants panel,
     "Reviewers Suggested by Author" lists Kay's initials, "Kay Suggested",
     "Open University" and the reason, with no action on the row.
   - **Control**: on the seeded journal, where "Reviewer Suggestion at
     Submission" is off, a new draft's wizard has no "Reviewer
     Suggestions" step, and on a submission of that journal in review
     round 1 the Journal Manager's Submission and Review stages show no
     "Reviewers Suggested by Author" panel and the Reviewers panel's "Add
     Reviewer" window opens with no "Select a Reviewer from Reviewer
     Suggestions" list. <sup>s1</sup>

2. **The editor turns suggestions into reviewers from the panel**

   Given: Journal Manager, on a submission in review round 1 whose three
   suggestions are Kay Suggested (her address belongs to an account holding
   the Reviewer role), Lee Second (an account without a Reviewer role) and
   Nova Newcomer (no account carries the address).

   - **Submission stage**: under the Participants panel, "Reviewers
     Suggested by Author" lists all three with initials, full name,
     affiliation and reason, and no action on any row.
   - **Review stage**: the same panel lists the three, and each row ends in
     a "…" menu, named "{name} More Actions" to screen readers, holding one
     action, "Add Reviewer".
   - **Kay's row, an account with the Reviewer role**: press "Add
     Reviewer": the Add Reviewer window opens on "Selected Reviewer"
     showing her name and email, with no "Locate a Reviewer", the "Review
     Request" message and both due dates already filled. Press "Cancel":
     the window closes without asking and Kay stays in the panel. Open it
     again, type "Please reply within a week." at the end of the "Review
     Request" message and press the "Close" arrow: the window closes
     without asking and Kay stays in the panel. Open it again and press
     "Add Reviewer": the Reviewers panel lists Kay, and her row leaves
     "Reviewers Suggested by Author" at once, with no reload.
   - **Lee's row, an account without the role**: press "Add Reviewer": the
     window opens on "Enroll an Existing User as Reviewer" with "Search By
     Name" holding "Lee Second (lee.second@mail.test)" and "Enroll the
     user with this reviewer user group" set to "Reviewer" (on a press
     "External Reviewer"). Press "Add Reviewer": the Reviewers panel lists
     Lee and his row is gone from the panel.
   - **Nova's row, "Email" changed**: press "Add Reviewer": the window
     opens on "Create New Reviewer" with "Given Name", "Family Name",
     "Email" and "Affiliation" filled from the suggestion. Change "Email"
     to nova.other@mail.test, type novaother in "Username" and press "Add
     Reviewer": the Reviewers panel lists Nova, and Nova's row stays in
     "Reviewers Suggested by Author" with its "…" menu, the suggestion
     still pending because the address differs.
   - **Nova's row, no account**: press "Add Reviewer" on the row again:
     the window opens on "Create New Reviewer" with the four boxes filled
     as before. Press "Add Reviewer" with "Username" empty: "This field is
     required." shows under the box and Nova stays in the panel. Type nova
     in "Username" and press "Add Reviewer": the Reviewers panel lists
     Nova a second time, and "Reviewers Suggested by Author" disappears
     from the Review stage.
   - **Mailboxes**: Kay's holds the review request; Nova's, at the
     suggested address, the new reviewer's welcome email and the request.
     <sup>s</sup>
   - **Submission stage again**: "Reviewers Suggested by Author" still
     lists all three, with no action on any row.
   - **A submission moved on to Copyediting**: on a second submission of
     the same journal, moved on to Copyediting after review round 1 with
     its one suggestion, Kim Kept, still pending, open the Review stage:
     "Reviewers Suggested by Author" lists Kim with no "…" menu on the
     row; the Submission stage lists Kim with no action either.
   - **Control**: a submission of the same journal with no suggestion shows
     the panel on neither stage. <sup>s2</sup>

3. **The suggestions list inside Add Reviewer**

   Given: Journal Manager, on a submission in review round 1 whose three
   suggestions are Kay Suggested (on the round from the start, not through
   "Add Reviewer", so her suggestion is still pending: Rule 11), Pat Peer
   (an account holding the Reviewer role, not on the round) and Nova
   Newcomer (no account carries the address).

   - **The list**: press the Reviewers panel's own "Add Reviewer": the
     window opens with a list "Select a Reviewer from Reviewer
     Suggestions" above "Locate a Reviewer". Pat's and Nova's entries show
     the full name, affiliation and reason with a "Select Reviewer" button
     (named "Select undefined" to screen readers [A8](#a8)); Kay's shows
     the notice "This reviewer has already been assigned to this review
     round." and no button.
   - **Pat's entry, an account with the Reviewer role**: press "Select
     Reviewer" on Pat's entry: this same window changes to "Selected
     Reviewer" with his name and email; press "Add Reviewer": the
     Reviewers panel lists Pat. Press the Reviewers panel's "Add Reviewer"
     again: the list no longer has Pat's entry.
   - **Nova's entry, no account**: press "Select Reviewer" on Nova's entry:
     a second "Add Reviewer" window opens on top, on "Create New Reviewer"
     with "Given Name", "Family Name", "Email" and "Affiliation" filled
     from the suggestion. Type nova in "Username" and press the inner
     window's "Cancel": it closes without asking, and Nova's entry still
     shows its "Select Reviewer" button; press "Select Reviewer" on Nova's
     entry again: the inner window opens with "Username" empty, what was
     typed discarded. Type nova in "Username" and press "Add Reviewer":
     the inner window closes, Nova's entry leaves the list (its
     emptied row stays as a gap [A9](#a9)), Nova appears under "Locate a
     Reviewer" with the notice Kay's entry shows and no button, and the
     outer window stays open.
   - **After closing**: press the "Close" arrow at its top: the Reviewers
     panel lists Kay, Pat and Nova, and the Review stage's "Reviewers
     Suggested by Author" lists Kay alone, with her "…" menu.
   - **Control**: on a submission of the same journal with no suggestion,
     "Add Reviewer" opens with no "Select a Reviewer from Reviewer
     Suggestions" list. <sup>s3</sup>

4. **The Funding Coordinator meets the error dialog**

   Given: Funding Coordinator assigned to a submission in review round 1
   whose two suggestions are Kay Suggested (an account holding the Reviewer
   role) and Nova Newcomer (no account).

   - **Review stage**: open it: no "Reviewers Suggested by Author" panel
     shows; instead a dialog titled "Error" opens, reading "The current
     role does not have access to this operation.", with one button, "OK"
     [A1](#a1); press "OK".
   - **Submission stage**: open it: the same dialog; press "OK".
   - **The list inside Add Reviewer**: back on the Review stage, press the
     Reviewers panel's "Add Reviewer": the window opens with "Select a
     Reviewer from Reviewer Suggestions" listing both, each with "Select
     Reviewer". Press "Select Reviewer" on Kay's entry: this same window
     changes to "Selected Reviewer" with her name and email; press "Add
     Reviewer": the Reviewers panel lists Kay.
   - **"Create New Reviewer" as this role**: press the Reviewers panel's
     "Add Reviewer" again and "Select Reviewer" on Nova's entry: a second
     window opens on "Create New Reviewer", filled in; type nova in
     "Username" and press its "Add Reviewer": a browser alert reads "The
     current role does not have access to this operation."; press "OK":
     the form stays open with nova still in "Username", and the Reviewers
     panel does not gain Nova [A5](#a5); press the "Close" arrow of each
     window.
   - **Control**: Journal Manager, on the same submission's Review stage:
     no dialog opens, and "Reviewers Suggested by Author" lists Nova and
     not Kay. <sup>s4</sup>

5. **Internal Review offers the list without the panel** {OMP}

   Given: Press Editor, on a monograph in Internal Review round 1 whose two
   suggestions are Nova Newcomer (no account) and Kay Suggested.

   - **Internal Review stage**: open it: no "Reviewers Suggested by Author"
     panel shows [OMP1](#omp1).
   - **The list inside Add Reviewer**: press the Reviewers panel's "Add
     Reviewer": the window opens with "Select a Reviewer from Reviewer
     Suggestions" above "Locate a Reviewer", listing both. Press "Select
     Reviewer" on Nova's entry: a second "Add Reviewer" window opens on
     "Create New Reviewer", filled from the suggestion; type nova in
     "Username" and press "Add Reviewer": the inner window closes and
     Nova's entry leaves the list; press the "Close" arrow: the internal
     round's Reviewers panel lists Nova.
   - **External Review stage**: record the decision "Send to External
     Review" and open the External Review stage: "Reviewers Suggested by
     Author" lists Kay only, her row ending in the "…" menu with "Add
     Reviewer"; the Reviewers panel's "Add Reviewer" window has Kay's
     entry alone under "Select a Reviewer from Reviewer Suggestions"; the
     round's Reviewers panel starts empty.
   - **Control**: the Submission stage's "Reviewers Suggested by Author"
     lists both, with no action, so the missing panel is Internal
     Review's alone. <sup>s5</sup>

6. **No suggestions on a preprint server** {OPS}

   Given: Author and Preprint Server Manager, on the seeded preprint
   server.

   - **The wizard**: Author: start a new submission; the wizard has no
     "Reviewer Suggestions" step.
   - **The setting**: Preprint Server Manager: Settings › Workflow has no
     "Review" tab, so "Reviewer Suggestion at Submission" cannot be
     switched on.
   - **The workflow screen**: the workflow screen of a posted preprint
     shows no "Reviewers Suggested by Author" panel.
   - **Control**: on a journal with the setting on, the same wizard carries
     the step (scenario 1) and the same screen the panel (scenario 2).
     <sup>s6</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A10 (issue report
    `docs/issues/U31-A10-back-to-search-nests-add-reviewer-window.md`): open
    Add Reviewer on a submission with a no-account suggestion, press "Select
    Reviewer" and then "Back to Search", and assert a single "Add Reviewer"
    window holding the suggestions list
  - the guard for A8 (issue report
    `docs/issues/U31-A8-suggestion-select-reviewer-named-undefined.md`):
    open Add Reviewer on a submission with suggestions and assert each
    suggestion entry's "Select Reviewer" button is named "Select {name}"
  - the guard for A9 (issue report
    `docs/issues/U31-A9-suggestion-added-reviewer-leaves-blank-row.md`): add
    a no-account suggested person through the inner "Add Reviewer" window
    and assert the suggestions list keeps no empty row
  - the guard for A5 (issue report
    `docs/issues/U31-A5-funding-coordinator-create-reviewer-from-suggestion-does-nothing.md`):
    as the Funding coordinator, open Add Reviewer on a submission with a
    no-account suggestion and assert that entry offers no "Select Reviewer"
    and the panel row no "…" menu, while a suggestion holding the Reviewer
    role keeps both
  - the guard for A7 (issue report
    `docs/issues/U31-A7-reviewer-suggestion-guidance-misspells-valuable.md`):
    on a context created from the defaults, assert the "Reviewer
    Suggestions" step's guidance reads "provide valuable input"
  - the guard for A11 (issue report
    `docs/issues/U31-A11-reviewer-suggestion-reason-help-is-there.md`):
    assert the help under "Reasons for suggesting reviewer" in "Add Reviewer
    Suggestion" reads "mention if there are any potential conflicts of
    interest"
  - the guard for A6 (issue report
    `docs/issues/U31-A6-reviewer-suggestion-same-address-other-case.md`): in
    the wizard, add a suggestion and then the same address in other
    capitals, and assert the second is refused with "The email has already
    been taken."
- **Nothing new to test**:
  - assigned Section Editor, Guest Editor and Site Administrator (the Journal Manager's offer, scenarios 2 and 3)
  - Reviewer and Reader (no screen offers them anything)
- **Register carries it**:
  - A2 (the "ORCID iD" box with "Enable ORCID functionality" on)
  - A3 (a matched suggestion after the reviewer is unassigned or cancelled)
  - A6 (the same address accepted in another case)
  - A9 (the emptied entry's blank row)
  - A10 (the inner window's "Back to Search")
  - A12 (the panel's "Add Reviewer" on a suggested person already on the round)
  - A5's "Enroll an Existing User as Reviewer" path for the Funding Coordinator, not driven
- **No seed**:
  - "Reviewer Suggestion at Submission" switched off after suggestions exist, then on again (Rule 8d): no scenario key changes a journal's setting once the journal exists, and a suggestion can be seeded only where the setting is on
- **Owned by another feature**:
  - the "For Reviewer Suggestion" guidance text (*Submission intake configuration*)
  - a second form language's boxes in the suggestion window (*Languages & locales*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-06), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | The Funding Coordinator gets an error dialog on the stage instead of the panel | 🐞 | user-visible | — |
| [A5](#a5) | A Funding coordinator is offered "Add Reviewer" on a suggested person without an account, then refused | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A6](#a6) | A reviewer suggested twice in other capitals stays pending after being added, and adding them again fails | 🐞 | medium · crash: server | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | The default reviewer-suggestion guidance authors read on submission misspells "valuable" as "valueable" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A8](#a8) | In Add Reviewer's suggestions list, screen readers hear every "Select Reviewer" button as "Select undefined" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A9](#a9) | After an editor adds a suggested reviewer in the Add Reviewer window, the suggestions list keeps an empty row | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A10](#a10) | "Back to Search" in a suggested reviewer's window nests a second search whose "Add Reviewer" shows raw code | 🐞 | medium · crash: script | issues (claude), 2026-10-04 — re-verified |
| [A11](#a11) | Authors suggesting a reviewer read "mention is there are any potential conflict of interest" for "if there are any potential conflicts" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A12](#a12) | The panel offers "Add Reviewer" on a suggested person already on the round, and the request fails with no message | 🐞 | user-visible · crash: server | — |
| [A2](#a2) | An ORCID iD typed on a suggestion is seen again only in the author's "Edit" window | ❓ | minor | — |
| [A3](#a3) | A matched suggestion is offered nowhere again, even after the reviewer is unassigned or cancelled | ❓ | minor | — |
| [A4](#a4) | The author loses sight of their suggestions the moment they submit | ❓ | minor | — |
| [OMP1](#omp1) | Internal Review shows no panel, yet its Add Reviewer window offers the suggestions | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — The Funding Coordinator gets an error dialog instead of the panel** · 🐞 · user-visible.
A Funding Coordinator assigned to a submission opens its Submission or
Review stage on a journal with "Reviewer Suggestion at Submission" on and
expects the stage as usual, with or without the "Reviewers Suggested by
Author" panel. Instead a dialog titled "Error" opens, reading "The current
role does not have access to this operation.", with one button, "OK"; no
panel shows, and the dialog opens even when the submission carries no
suggestion. On a journal with the setting off no dialog opens. The rest of
the stage is usable once the dialog is dismissed.
Basis: probe. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — An ORCID iD typed on a suggestion is seen again only in the author's "Edit" window** · ❓ · minor.
With ORCID enabled the suggestion window offers an "ORCID iD" box and
checks its shape, but the saved iD shows again only in the author's own
"Edit" window before submitting: not in the wizard's panel, the Review
step, the editors' panel or the Add Reviewer list, and the "Create New
Reviewer" form opened from the suggestion has no ORCID box, so the new
account never gets it.
Question: should the iD reach the editors and the created reviewer, or
should the box go? Lean: carry it into the panel row and the new reviewer's
profile; collecting a value no editor sees is the worse outcome.
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A matched suggestion is offered nowhere again** · ❓ · minor.
An editor turns a suggestion into a reviewer and later unassigns or cancels
that reviewer. The suggestion does not come back to the Review stage's
"Reviewers Suggested by Author" panel or to the Add Reviewer list; it is
still listed on the Submission stage (Rule 8a) but offered nowhere.
Question: should unassigning restore the suggestion? Lean: intended; the
suggestion served its purpose and the reviewer stays findable in "Locate a
Reviewer".
Basis: probe. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — The author loses sight of their suggestions on submitting** · ❓ · minor.
After the final "Submit", the author's view of the workflow screen has no
suggestions panel on any stage, so the author cannot re-read what they
suggested, let alone correct a typo in an email address.
Question: should the author's view list the suggestions read-only? Lean:
list them read-only on the Submission stage; the author's own input is
otherwise invisible to them.
Basis: probe. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — A Funding coordinator is offered "Add Reviewer" on a suggested person without an account, then refused** · 🐞 · low.
A Funding coordinator assigned to a submission whose author suggested
reviewers is offered to turn a suggested person who has no account into
a reviewer. "Select Reviewer" in the "Add Reviewer" window, or "Add
Reviewer" in the person's menu under "Reviewers Suggested by Author",
opens a form on "Create New Reviewer", filled in. Its "Add Reviewer" is
refused with a browser alert, "The current role does not have access to
this operation.", and the form stays open. The coordinator's role may
not create reviewer accounts, and for that reason the "Add Reviewer"
window does not show the coordinator its own "Create New Reviewer" link.
A suggested person who has an account but no reviewer role opens the
"Enroll an Existing User as Reviewer" form instead and meets the same
refusal (read in the code, not walked). It needs "Reviewer Suggestion at
Submission" switched on. Basis: probe, 2026-10-04. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — A reviewer suggested twice in other capitals stays pending after being added, and adding them again fails** · 🐞 · medium · crash: server.
An author suggesting reviewers while submitting adds a person, then adds
them again with the address typed in other capitals
("Kay.Suggested@Mailinator.com" after "kay.suggested@mailinator.com").
The same address typed exactly is refused with "The email has already
been taken."; this one is accepted as a second entry for the same
person. The editors then see the person twice in "Reviewers Suggested by
Author", with nothing to tell the two apart. Once an editor adds the
person as a reviewer from one entry, the other stays in the panel as a
pending suggestion for good: its "Add Reviewer" opens on the person's
new account, and pressing "Add Reviewer" there fails on the server with
no message and the window left open ([A12](#a12)). No screen removes the entry. It
happens on journals and presses whose database is PostgreSQL. The same
stuck entry follows from a single suggestion whose address differs only
in capitals from a reviewer's existing account, once the editor adds
that reviewer through the Add Reviewer window's list of suggestions.
Basis: probe, 2026-10-04. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The default reviewer-suggestion guidance authors read on submission misspells "valuable" as "valueable"** · 🐞 · low.
On the submission form's "Reviewer Suggestions" step, the text above the
list says "This can help streamline the review process and provide
valueable input for the editorial team." The text is the journal's "For
Reviewer Suggestion" guidance (Settings › Workflow › "Submission" ›
"Author Guidance"), which every journal and press gets by default. Only
the English text is misspelt. Each journal and press holds its own copy
of the text, made when it was created or upgraded to 3.5. Correcting the
default reaches only those created afterwards: existing ones keep the
misspelt copy until a manager edits the box. Basis: probe, 2026-10-04.
<sup>f-a7</sup>

<a id="a8"></a>
**A8 — In Add Reviewer's suggestions list, screen readers hear every "Select Reviewer" button as "Select undefined"** · 🐞 · low.
In "Select a Reviewer from Reviewer Suggestions" every "Select Reviewer"
button carries the hidden name "Select undefined", where the same button
in "Locate a Reviewer" reads "Select {name}". That hidden name is what a
screen reader reads out for the button, so a screen-reader user cannot
tell the entries' buttons apart; sighted use is unaffected. The list is
in the Add Reviewer window of a submission's review round, on a journal
or press that has switched on "Reviewer Suggestion at Submission" and
whose author suggested reviewers. Basis: probe, 2026-10-04.
<sup>f-a8</sup>

<a id="a9"></a>
**A9 — After an editor adds a suggested reviewer in the Add Reviewer window, the suggestions list keeps an empty row** · 🐞 · low.
An editor turns a reviewer suggestion into a reviewer from the Add
Reviewer window's "Select a Reviewer from Reviewer Suggestions" list:
"Select Reviewer" on the entry opens a second "Add Reviewer" window on
top. After pressing "Add Reviewer" in that second window, the entry's
text leaves the list but its row stays behind as blank space, with
nothing in it to click. Closing the window and opening it again clears
the gap. Nothing is lost: the reviewer is added, and the remaining
entries work. It happens for a suggested person who has no account or no
Reviewer role; one who already holds the Reviewer role is selected in
the same window and is unaffected. The list needs "Reviewer Suggestion
at Submission", which is off by default. Basis: probe, 2026-10-04.
<sup>f-a9</sup>

<a id="a10"></a>
**A10 — "Back to Search" in a suggested reviewer's window nests a second search whose "Add Reviewer" shows raw code** · 🐞 · medium · crash: script.
An editor opens Add Reviewer and presses "Select Reviewer" on an
author's suggestion. A second "Add Reviewer" window opens over the
first, on a form that would create that person's account (or give an
existing account the Reviewer role). If the editor then decides to
invite someone else, "Back to Search" is that form's only link back to
the list. Pressing it does not bring the list back: the second window
fills with a complete second copy of the Add Reviewer search (the
submission's authors, the suggestions, "Locate a Reviewer"), while the
first window stays open beneath it. That second search does not work.
The editor picks a reviewer there and the window shows the choice, but
its "Add Reviewer" takes the browser off the workflow to a page of raw
code reading
`{"status":false,"content":"","elementId":"0","events":[]}`. No review
request goes to the reviewer. Nothing was created or changed before
this: the form was only shown, so no account, role or review assignment
exists. Pressing "Select Reviewer" on the suggestion again from the
second copy stacks a third window. Each "Back to Search" also makes the
page's script fail twice, which shows only in the browser's console. It
happens on a journal or press with "Reviewer Suggestion at Submission"
switched on, and only for a suggested person with no account or without
the Reviewer role: only those open the second window. A person who
already reviews for the journal is selected in the first window. Basis:
probe, 2026-10-04. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Authors suggesting a reviewer read "mention is there are any potential conflict of interest" for "if there are any potential conflicts"** · 🐞 · low.
An author who suggests a reviewer on the submission form's "Reviewer
Suggestions" step opens "Add Reviewer Suggestion" and reads, under
"Reasons for suggesting reviewer": "Please share why you are
recommending this reviewer and mention is there are any potential
conflict of interest." It should say "mention if there are any potential
conflicts of interest". The same help shows when the author presses
"Edit" on a suggestion already in that step's list. The German and
Slovenian translations carry slips of their own. Basis: probe,
2026-10-04. <sup>f-a11</sup>

<a id="a12"></a>
**A12 — The panel offers "Add Reviewer" on a suggested person already on the round, and the request fails with no message** · 🐞 · user-visible · crash: server.
On the Review stage, "Reviewers Suggested by Author" can keep a pending
suggestion whose person is already a reviewer on the round (both ways
seen come from [A6](#a6): the second entry for a person added from the
first, and an address differing only in capitals from the reviewer's
account). The Add Reviewer window's list shows such an entry as "This
reviewer has already been assigned to this review round." with no button
(Rule 10), but the panel row still offers "…" › "Add Reviewer", opening
on "Selected Reviewer" for that person. Its "Add Reviewer" fails on the
server: no message shows, the window stays open and the suggestion stays.
Basis: probe, 2026-10-04. <sup>f-a12</sup>

### OMP

<a id="omp1"></a>
**OMP1 — Internal Review shows no panel, yet its Add Reviewer window offers the suggestions** · ❓ · minor.
On a press the "Reviewers Suggested by Author" panel appears on the
Submission and External Review stages only. The Internal Review stage
shows no panel, but its Add Reviewer window still opens with "Select a
Reviewer from Reviewer Suggestions" above "Locate a Reviewer", and a
suggestion turned into an internal reviewer there is gone from the External
Review panel and list later on, while that round's Reviewers table starts
empty.
Question: do the author's suggestions apply to internal review? Lean: the
panel's absence is the intent (suggestions target external review) and the
list inside Internal Review's Add Reviewer is the leak.
Basis: probe. <sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Roles. The service behind every screen here is `PKP\API\v1\reviewers\suggestions\ReviewerSuggestionController` (`submissions/{submissionId}/reviewers/suggestions`: `GET`, `GET {suggestionId}`, `POST`, `PUT {suggestionId}`, `DELETE {suggestionId}`); `getRouteGroupMiddleware()` gates the whole group on `ROLE_ID_SITE_ADMIN`, `ROLE_ID_MANAGER`, `ROLE_ID_SUB_EDITOR`, `ROLE_ID_AUTHOR` (no `ROLE_ID_ASSISTANT`, hence A1), and `authorize()` adds `SubmissionAccessPolicy` plus, for `add`/`edit`/`delete`, `SubmissionIncompletePolicy` with the message `user.authorization.submission.complete.reviewerSuggestionRestrict` ("Add, update or delete of reviewer suggestion for completed submission is restricted."), so writes work only on a draft. The wizard is `PKP\pages\submission\PKPSubmissionHandler` (roles Author, Section Editor, Manager, Site Admin). The editors' panel is pushed by `workflowConfigEditorialOJS.js` only (`getSecondaryItems` of `WORKFLOW_STAGE_ID_SUBMISSION` and `WORKFLOW_STAGE_ID_EXTERNAL_REVIEW`, guarded by `pageInitConfig.publicationSettings.isReviewerSuggestionEnabled`, which `PKPDashboardHandler` sets from the context's `reviewerSuggestionEnabled`); `workflowConfigAuthorOJS.js` and `workflowConfigAuthorOMP.js` never push `ReviewerSuggestionManager`, so the author view has none. The row action opens `ReviewerGridHandler::showReviewerForm`, whose `PKPReviewerGridHandler::__construct()` grants review-round operations to Manager, Site Admin and Sub-editor, and to Assistant minus `createReviewer`, `enrollReviewer` and `gossip`. OPS: `ops/schemas/context.json` has no `reviewerSuggestionEnabled`, `ops/schemas/submission.json` no `reviewerSuggestions`, `ops/api/v1/submissions/index.php` does not mount the controller (OJS and OMP do), and `PKPReviewSetupForm::addReviewSuggestionControl()` adds the checkbox only when the context schema carries the property. Read 2026-09-06; the OJS and OMP copies of every file named in this tail are byte-identical. Live-probed 2026-09-06 (Purpose; the OPS absence; Actors terms and rows 1–4), OJS and OMP scratch journals with the setting switched on through Settings › Workflow › Review, OPS scratch server and `publicknowledge` read-only on all three: the seeded `admin`, holding no role on the scratch journal, saw the panel on both stages and the row's "Add Reviewer" menu; OMP's `registry/userGroups.xml` defines no guest-editor group (OJS's does); the panel and menu showed for manager, editor, section editor and (OJS) guest editor, never for the author's view; the Funding Coordinator's dialog is note f-a1. Row 1: the manager opened a draft's wizard with the step by its address and from the Editor Dashboard ("All in submission stage", the row "Incomplete" › "Complete submission"; the dashboard's views are Assigned to me, Active submissions, Needs editor, All in submission stage, Needs reviews, All in review stage, All in copyediting stage, All in production stage, no "Incomplete" view); a section editor, another author, a reviewer and a reader typing the address landed on `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied` (the unassigned sub-editor fails `SubmissionAccessPolicy` on a draft). OPS: no Review tab under Settings › Workflow on the scratch server or `publicknowledge`, `settings/workflow#review` changes nothing, the wizard's steps are Upload Files, Details, Contributors, For Readers, Review, and the manager's workflow screen of a posted preprint shows Production Tasks & Discussions and Participants only.

<a id="fn-p"></a>
**p** — Pointers and definitions. These sentences say where another spec's rules live, or define a term whose claims are Rules 2–5 and 11; they claim no screen of this spec's own and were declared, not driven, at the 2026-09-06 claim check. The screen facts they carry in passing were seen that day on the chunk snapshots: the panel sits under "PARTICIPANTS" on both stages; the setting's box reads "Allow authors to suggest potential reviewers at submission process"; the Add Reviewer window's "Locate a Reviewer", "Create New Reviewer" and "Enroll Existing User" modes exist as *Reviewer assignment & management* describes them.

<a id="fn-b"></a>
**b** — The window is `PKP\components\forms\submission\ReviewerSuggestionsForm` (id `reviewerSuggestions`, `POST`): `FieldText('givenName', isMultilingual, isRequired)`, `FieldText('familyName', isMultilingual)`, `FieldText('email', isRequired)`, `FieldText('affiliation', isMultilingual, isRequired)`, `FieldRichTextarea('suggestionReason', isMultilingual, isRequired, label reviewerSuggestion.suggestionReason, description reviewerSuggestion.suggestionReason.description)`, and `FieldText('orcidId', label user.orcid, tooltip orcid.about.orcidExplanation)` inserted `FIELD_POSITION_AFTER 'email'` when `OrcidManager::isEnabled()`. Server rules, `formRequests/AddReviewerSuggestion::rules()`: `givenName` required, `familyName` sometimes, `email` required + `email` + `Rule::unique('reviewer_suggestions')` scoped to the submission (`EditReviewerSuggestion` ignores the row being edited), `affiliation` required, `suggestionReason` required, `orcidId` nullable + `orcid`; `HasMultilingualRule` takes the context's `getSupportedFormLocales()` plus the site primary locale. Messages: `validator.required` "This field is required.", `validator.email` "This is not a valid email address."; the `orcid` rule's message as shown is "The ORCID iD you specified is invalid. Please include the full URI (e.g. "https://orcid.org/0000-0002-1825-0097")." (not `validator.orcid`'s "This is not a valid ORCID."), and it refuses the bare 16-digit form as well. The submit button is `FormComponent`'s default `common.save` "Save". Upstream `cypress/tests/data/60-content/ZzeddSubmission.cy.js` presses "Save" empty and expects "This field is required." on `givenName`, `email`, `affiliation` and `suggestionReason`. Live-probed 2026-09-06 (Fields; Rule 13; the ORCID cross-feature line), OJS and OMP: the on-screen label is "Email" (`* Required`); the help under "Reasons for suggesting reviewer" reads, letter for letter, "Please share why you are recommending this reviewer and mention is there are any potential conflict of interest." (the "is there" is the screen's); "Save" on the empty window shows the four "This field is required." messages plus the summary "Please correct 4 errors. Go to Given Name: This field is required. … Jump to next error" and leaves "Save" disabled; test run 2026-09-06 (scenario 1), OJS and OMP: with "Given Name" alone filled, three "This field is required." and "Please correct 3 errors. Go to Email … Go to Affiliation … Go to Reasons for suggesting reviewer …" stayed up and "Save" stayed disabled (the first run's "Save" press resolved to the disabled button 24 times), still disabled after "Email" and "Affiliation", enabled only once the reason was typed (lib/ui-library `FormPage.vue` disables the button while any error remains on the form's page); `not-an-email` gets the email message; a second entry with the same address, and an edit to another entry's address, get "The email has already been taken." (`validator.unique`, the `Rule::unique` match is case-sensitive: the same address in capitals saved as a second entry, finding A6); `1234` and the bare `0000-0002-1825-0097` get the ORCID message, `https://orcid.org/0000-0002-1825-0097` saves; the box carries the tooltip "ORCID is an independent non-profit organization … Learn more at https://orcid.org.". Languages: a scratch context has one form language until French is ticked under Settings › Website › Setup › Languages "Forms"; then the window opens with the single `-en` boxes and a "French" button that adds `givenName-fr_CA`, `familyName-fr_CA`, `affiliation-fr_CA` and a second reason editor (`…suggestionReason-control-fr_CA_ifr`), while `email` and `orcidId` stay single. ORCID: Settings › Users & Roles › ORCID, "Enable ORCID functionality" unticked removes the "ORCID iD" box, ticked restores it; a scratch context created with `orcid: {enabled: true}` arrives with it ticked.

<a id="fn-c"></a>
**c** — `PKPSubmissionHandler::getSteps()` inserts `getReviewerSuggestionsStep()` (id `reviewerSuggestions`, name and reviewName `submission.reviewerSuggestions` "Reviewer Suggestions", section description the context's `reviewerSuggestionsHelp`, review template `submission/review-reviewer-suggestions.tpl`) after the editors step when `reviewerSuggestionEnabled`; `getReviewerSuggestionsListPanel()` builds `PKP\components\listPanels\ReviewerSuggestionsListPanel` (id `reviewerSuggestions`, title "Reviewer Suggestions", `canEditPublication` true). `ReviewerSuggestionsListPanel.vue`: header button `grid.action.addReviewerSuggestion` "Add Reviewer Suggestion" and the per-item `common.edit` / `common.delete` are guarded by `publication.status !== STATUS_PUBLISHED && canEditPublication`, always true in the wizard; item title `localize(item.fullName)` + `Badge` `localize(item.affiliation)`, subtitle `item.email`; `formSuccess()` after a `POST` pushes the returned item into `submission.reviewerSuggestions` (`SubmissionWizardPage.vue::setReviewerSuggestion`), so the store is the API, not the wizard's autosave. `ListPanel.vue` falls back to `common.noItemsFound` "No items found." when no `emptyLabel` is given, and this panel gives none. `reviewerSuggestionsHelp` defaults to `default.submission.step.reviewerSuggestions` (migration `I4787_AddReviewSuggestionHelp`) and is edited in `SubmissionGuidanceSettings::addReviewSuggestionGuidanceDetail()` (`FieldRichTextarea('reviewerSuggestionsHelp')`, label `submission.forReviewerSuggestion` "For Reviewer Suggestion", description `manager.setup.workflow.reviewerSuggestionsHelp.description`), a form headed `manager.setup.workflow.guidance` "Author Guidance". Live-probed 2026-09-06 (Rules 1–3), OJS and OMP: the rail reads Upload Files, Details, Contributors, For the Editors, "5 Reviewer Suggestions", "6 Review"; the default guidance in full is "When submitting, you have the option to suggest several potential reviewers. This can help streamline the review process and provide valueable input for the editorial team. Please choose reviewers who are expert in your field and have no conflict of interest with your work. This feature aims to enhance the review process and support a more efficient experience for both authors and editorial team." (the misspelling is in `default.submission.step.reviewerSuggestions`, finding A7); the panel is headed "Reviewer Suggestions" with "Add Reviewer Suggestion" and reads "No items found." when empty; an entry shows the full name, the affiliation as a badge, the address on the next line, "Edit" and "Delete"; each "Save" is its own `POST …/reviewers/suggestions` before any "Continue", and entries survive "Save for Later" and a reopen from My Submissions ("Complete submission" on the Incomplete row).

<a id="fn-d"></a>
**d** — `ReviewerSuggestionsListPanel.vue::openEditModal()` fetches `GET …/suggestions/{id}`, fills the form, sets `method: 'PUT'` and titles the side modal `grid.action.edit` "Edit"; `openDeleteModal()` opens `openDialog({title: grid.action.deleteReviewerSuggestion, message: grid.action.deleteReviewerSuggestion.confirmationMessage, actions: [{label: grid.action.deleteReviewerSuggestion, isWarnable}, {label: common.cancel}]})` and on confirm sends `POST` with `X-Http-Method-Override: DELETE`, then filters the item out of `submission.reviewerSuggestions`. Strings: "Delete Reviewer Suggestion", "Are you sure you want to remove this suggestion? This action can not be undone." (the message takes no name, although the call passes one), "Cancel". The upstream Cypress test cancels once and confirms once, expecting one then zero `li.listPanel__item`. Live-probed 2026-09-06 (Rules 4–5), OJS and OMP: the "Edit" window opens prefilled, the reason included, and "Save" replaces the entry in place; the window's close control with an unsaved change closed it at once with no dialog and the entry unchanged; the delete dialog's "Cancel" keeps the entry and "Delete Reviewer Suggestion" removes it down to "No items found.".

<a id="fn-e"></a>
**e** — `lib/pkp/templates/submission/review-reviewer-suggestions.tpl`: `h3` `{$step.reviewName}`, an "Edit" `pkp-button` calling `openStep('reviewerSuggestions')`, then either a `notification type="warning"` with `submission.wizard.noReviewerSuggestions` when `!submission.reviewerSuggestions?.length`, or one `li` per suggestion with `localize(fullName)`, `email`, `localize(affiliation)`. No submit-time validation names `reviewerSuggestions` (`api/v1/submissions` has no reference), so the empty warning is advisory. After submit the author has no reading surface (note a) and the API refuses writes (`SubmissionIncompletePolicy`). Live-probed 2026-09-06 (Rules 6–7), OJS and OMP: the Review step's block is headed "Reviewer Suggestions" with "Edit" (which lands on "5 Reviewer Suggestions"), each entry the full name, then the address, then the affiliation, no reason; with none, the warning "No reviewers have been suggested for this submission." and "Submit" then the dialog's "Submit" complete the submission ("Submission complete"). Rule 7: the author's workflow view of submissions with no, one and a seeded suggestion showed no panel or text on Submission, Review (OMP: Internal and External Review), Copyediting or Production, while the manager's view of the same submissions showed "Reviewers Suggested by Author".

<a id="fn-f"></a>
**f** — `ReviewerSuggestionManager.vue`: root `v-if="reviewerSuggestionManagerStore.reviewerSuggestionsList.length > 0"`, heading `editor.submission.reviewerSuggestions` "Reviewers Suggested by Author", one `li` per item with `UserAvatar` (`displayInitials`), `fullName`, `affiliation`, `suggestionReason` (`v-strip-unsafe-html`), and a `DropdownActions` (`button-variant="ellipsis"`, label `` `${fullName} ${common.moreActions}` ``) rendered `v-if="atActiveReviewStage()"`. `reviewerSuggestionManagerStore.js`: `relativeUrl` is `…/reviewers/suggestions?approved=false` when `props.reviewRoundId` is set (the Review stage) and `…/reviewers/suggestions` otherwise (the Submission stage, whose config passes `selectedReviewRound?.id`, undefined there); `reviewerSuggestionsList` further drops items with `reviewerId` only when `reviewRoundId` is set; `atActiveReviewStage()` = `reviewRoundId && submissionStageId === WORKFLOW_STAGE_ID_EXTERNAL_REVIEW && submissionStageId === submission.stageId`. `getMany()` honours `?approved=` through `scopeWithApproved`. OMP: `useWorkflowConfigOMP.js` deep-merges `workflowConfigEditorialOJS` with `workflowConfigEditorialOMP`, which overrides only `getActionItems` of the Submission stage and defines `WORKFLOW_STAGE_ID_INTERNAL_REVIEW` with its own `getSecondaryItems` (no `ReviewerSuggestionManager`), so the panel inherits on Submission and External Review and is absent on Internal Review; `atActiveReviewStage()` is false on stage 2 regardless. Setting off: `isReviewerSuggestionEnabled` false → the item is never pushed; the rows stay in `reviewer_suggestions`. Upstream Cypress ("Submission has reviewer suggestion section visible") expects the heading with no "More Actions" button on the Submission stage, no heading after `disableReviewerSuggestion()`, and one "More Actions" per suggestion once the submission is in review. Live-probed 2026-09-06 (Rule 8, 8a–8d, both ends), OJS and OMP, as manager, section editor and site admin: the panel under "PARTICIPANTS" on the Submission stage and Review round 1; none on a submission with no suggestion, none once the last pending one was matched, none on Copyediting; rows read initials, full name, affiliation, reason; the Submission stage kept all four rows with no button after three were matched and after Copyediting, the Review stage went 4 → 3 → 2 → 1 with a "{name} More Actions" button holding one item, "Add Reviewer", and after "Accept Submission" listed the pending row without the menu; untick and "Save" removed the panel from every stage, tick and "Save" brought it back with the same names. OMP: no panel on Internal Review, the panel on the External Review round.

<a id="fn-g"></a>
**g** — `useReviewerSuggestionManagerActions.js::reviewerSuggestionApprove()` opens the legacy modal `grid.users.reviewer.ReviewerGridHandler` op `showReviewerForm` titled `editor.submission.addReviewer` "Add Reviewer" with `reviewerSuggestionId` and `selectionType` = `REVIEWER_SELECT_ADVANCED_SEARCH` when `existingUserId && hasExistingReviewerRole`, `REVIEWER_SELECT_ENROLL_EXISTING` when `existingUserId` only, else `REVIEWER_SELECT_CREATE`. `PKPReviewerGridHandler::_getReviewerForm()` loads the `ReviewerSuggestion`, throws on an unknown id and on `isApproved()`, and hands it to the form. Prefill: `AdvancedSearchReviewerForm::initData()` sets `reviewerId` to the existing user and `fetch()` assigns `reviewerName` / `reviewerEmail`, so `advancedSearchReviewerForm.tpl` skips its `{if !isset($reviewerId)}` block ("Locate a Reviewer") and shows `editor.submission.selectedReviewer` "Selected Reviewer"; `EnrollExistingReviewerForm::initData()` sets `userId` and `selectedUser` = `fullName (email)`; `CreateReviewerForm::initData()` sets `familyName`, `givenName`, `email`, `affiliation` (not `orcidId`). Each template carries `reviewerSuggestionId` as a hidden field. The model's `existingUser` is `Repo::user()->getByEmail($this->email)` and `hasExistingReviewerRole` is `existingUser->hasRole([ROLE_ID_REVIEWER], contextId)`. Live-probed 2026-09-06 (Rule 9, all three modes), OJS and OMP: "Selected Reviewer / {name} — {email}" with no "Locate a Reviewer" and no suggestions list, the "Review Request" template already in the message box under "Choose a predefined message to use, or fill out the form below." and both due dates set four weeks out; "Enroll an Existing User as Reviewer" with "Search By Name*" holding "{name} ({email})", "Enroll the user with this reviewer user group*" set to its only option ("Reviewer" on OJS, "External Reviewer" on OMP), a ticked masthead box and "Back to Search" above; "Create New Reviewer" with "Given Name*", "Family Name", "Email*", "Affiliation" filled, "Username*" empty with "Suggest", "Reviewing Interests", "Masthead", the file under "Files To Be Reviewed" preselected; "Add Reviewer" with "Username" empty sent nothing and showed "This field is required." under the box; each successful "Add Reviewer" (`update-reviewer`, `enroll-reviewer`, `create-reviewer`, 200) put "{name} / Request Sent" in the Reviewers table and the browser re-fetched `…/reviewers/suggestions?approved=false`, the row gone with no reload; the header "Close" with text typed in the message, and the form's "Cancel", closed the window with no question and the row still listed; "Back to Search" on the Create and Enroll forms showed the full window with the suggestions list, "Selected Reviewer" offers no "Change" and no such link.

<a id="fn-h"></a>
**h** — `PKPSelectReviewerListPanel::getConfig()` adds `suggestionTitle` (`editor.submission.findAndSelectReviewerFromSuggestions` "Select a Reviewer from Reviewer Suggestions"), `suggestions` (`ReviewerSuggestion::withSubmissionIds()->withApproved(false)`) and `reviewerSuggestionsApiUrl` whenever the context's `reviewerSuggestionEnabled` is set, on every stage the window opens for (OMP internal review included, hence OMP1). `SelectReviewerListPanel.vue` renders the suggestions `ListPanel` `v-if="suggestions.length > 0"` above the reviewer list, each item a `SelectReviewerSuggestionListItem` `v-if="!item.approvedAt"` with `currently-assigned` = `currentlyAssigned.includes(item.existingUserId)`. The item shows `fullName`, `affiliation`, `suggestionReason`, the notice `reviewer.list.currentlyAssigned` "This reviewer has already been assigned to this review round." when assigned, and a `PkpButton` `selectReviewerLabel` (`editor.submission.selectReviewer` "Select Reviewer") `v-if="canSelect"` (false when assigned). `select()`: with `existingUserId && hasExistingReviewerRole` it emits `pkp.eventBus 'selected:reviewer'` with the user's id, name and email (the same event the reviewer list's own button emits); otherwise `useLegacyGridUrl().openLegacyModal()` opens a second `showReviewerForm` modal titled "Add Reviewer" with `selectionType` chosen as in note g and `reviewerSuggestionId`; its close callback calls `updateReviewerSuggestionList(id)`, which re-reads the suggestion with `include_reviewer_data` and, when `approvedAt` is set, marks it approved (the item's `v-if` hides it) and pushes `r.reviewer` into the reviewer list and `currentlyAssigned`. Upstream Cypress ("Add non exist suggested reviewer from Add Reviewer list") presses "Select Reviewer", fills the username in the last "Add Reviewer" dialog, presses its "Add Reviewer", then presses "Close" on the remaining dialog. Live-probed 2026-09-06 (Rule 10, both ends, manager, section editor and site admin), OJS and OMP: the window's headings in order "Add Reviewer", "Submission Author List", "Select a Reviewer from Reviewer Suggestions", "Locate a Reviewer"; no list on a submission without suggestions and none with the setting off; the seed-invited reviewer's entry showed "This reviewer has already been assigned to this review round." and no button; "Select Reviewer" on a person with the Reviewer role rewrote the same window to "Selected Reviewer / {name} — {email} / Change", identical to the reviewer list's own button; on anyone else a second "Add Reviewer" dialog stacked (three dialogs counted) on the Create or Enroll form; after its "Add Reviewer" the inner dialog closed, a notice "{name} was assigned to review this submission and sent an email notification." showed, the entry's text left the list while its `li` stayed empty (finding A9), the new reviewer sat under "Locate a Reviewer" with the assigned notice and no button, and the outer window's only close control was one `button.DialogClose`, the "<" arrow named "Close"; the inner "Cancel" (`a.cancelButton`) with a username typed closed it with no question; "Back to Search" in the inner window rendered a full Add Reviewer inside it (author list, suggestions list, "Locate a Reviewer", an empty "Selected Reviewer … Change" block), a fourth dialog stacked from it, and the console logged `The handler "$.pkp.controllers.grid.users.reviewer.AdvancedReviewerSearchHandler" has already been bound to the selected element!` and the same for `AddReviewerFormHandler` (finding A10); the suggestion entries' "Select Reviewer" had the accessible name "Select undefined" against "Select {name}" in the reviewer list (finding A8). OMP: the Internal Review window carried the list; a no-account suggestion added there went onto the internal round and later off the External Review panel and list.

<a id="fn-i"></a>
**i** — `ReviewerForm::execute()` (the parent of all three modes), after creating the assignment: `$this->reviewerSuggestion ??= ReviewerSuggestion::withSubmissionIds([submissionId])->withApproved(false)->withEmail($reviewer->getData('email'))->first()`, then `if ($this->reviewerSuggestion?->hasExistingReviewerRole && $this->reviewerSuggestion->existingUser->getId() == $reviewerId) approveAndAttachReviewer(now, $reviewerId, $currentUser->getId())`. For Create and Enroll the suggestion is the one passed by id, and its `existingUser`/`hasExistingReviewerRole` (cached attributes) are first read after the user was created and enrolled, so they match when the email is unchanged; a changed email leaves `existingUser` null. `ReviewerSuggestion::approvedAt()` and `reviewerId()` are `Attribute::set` closures returning `$this->fresh()?->approvedAt ?? $value`, so neither can be cleared once set; nothing in `PKPReviewerGridHandler::unassignReviewer()` / `cancelReviewer()` touches `reviewer_suggestions`. Table `reviewer_suggestions` (`ReviewerSuggestionsMigration`, columns `approved_at`, `approver_id`, `reviewer_id`; `I11673_AddMissingApprovalToReviewerSuggestion` for upgrades); the feature ships with 3.5.0 (`I4787_InstallReviewerSuggestion`, 2025). Live-probed 2026-09-06 (Rules 11–12), OJS and OMP: a reviewer picked through "Locate a Reviewer" with no use of the list retired his suggestion, as did the list's own path, the inner Enroll and the inner Create; a reviewer created from the row's window with "Email" changed to another address appeared in the Reviewers table while the suggestion stayed in the panel and the list; on a two-round submission a reviewer added from round 2's list left round 1's panel and list too. After "Unassign Reviewer" (before a response) and after "Cancel Reviewer" (after "Accept Review, Continue to Step #2"; the row reads "Request Cancelled") the suggestion was in neither the Review stage's panel nor the list, "Locate a Reviewer" offered the person again with "Select Reviewer", and the Submission stage's panel still listed the name.

<a id="fn-k"></a>
**k** — No mailable, `Notification` type or `SubmissionLog` event references `ReviewerSuggestion` (`grep -r ReviewerSuggestion lib/pkp/classes/mail lib/pkp/classes/notification lib/pkp/classes/log` is empty); the controller's `add`/`edit`/`delete` write the model and return it. `approveAndAttachReviewer()` writes `approved_at`, `approver_id`, `reviewer_id` only. The request email, `ReviewerRegister` welcome email and the grid's log rows are `ReviewerForm::execute()` / `CreateReviewerForm::execute()` as documented in *Reviewer assignment & management*. Live-probed 2026-09-06 (Side effects), OJS and OMP: add, edit and delete on a draft sent nothing to the suggested or the author's address (counted per recipient; the mail catcher sits at its 500-message cap); after the submit the Activity Log held "Article submitted" (OJS) / "Initial submission completed." (OMP) and the needs-an-editor email row only; after each "Add Reviewer" from the panel it gained "{name} has been assigned to review submission {id} for review round 1." and "An email has been sent: Invitation to review" (OJS) / "Manuscript Review Request" (OMP), no row naming a suggestion; the no-account address received "Registration as Reviewer with {journal}" and the request, the others the request only.

<a id="fn-s"></a>
**s** — Tooling. A scratch journal with the feature on: `POST scenarios/context` with `review: {reviewerSuggestionEnabled: true}` and `users[]` holding the throwaway `author`, `editor` (manager level) or `sectionEditor`, plus one `externalReviewer` for the "account with a Reviewer role" path and one `reader` for the "account without a Reviewer role" path (the seeded reviewers are not enrolled on a scratch context). The wizard scenario starts from `POST scenarios/submission` with `submitted: false` and opens `submission?id={id}` as the author. The editor-side scenarios need suggestions on a submitted submission: `POST scenarios/submission` takes `reviewerSuggestions[]` (`givenName` required, `familyName`, `email` required and unique within the list, `affiliation`, `suggestionReason`; the context must carry `review.reviewerSuggestionEnabled: true`; OPS refuses the key), built 2026-09-06 and byte-identical in the database to a suggestion typed on the step. An address once turned into a reviewer holds the Reviewer role for every other submission of the context, so the Create and Enroll paths need a fresh address per submission; the "ORCID iD" box needs `orcid: {enabled: true}` on the context; a second form language is ticked under Settings › Website › Setup › Languages "Forms" (`supportedLocales` belongs under `context` in the create call). The Funding Coordinator path needs a scratch `funding` participant on the submission (`assistant.rita` is assigned to nothing on `publicknowledge`). The default-off control runs on `publicknowledge` (seed-facts: "Reviewer Suggestion at Submission" off) with `author.alex` for the draft and `manager.maya` for the editorial reads of a submission seeded in review there (`decisions: ['sendExternalReview']`, one `reviewRounds[]` entry; no `reviewerSuggestions[]`, which the seed refuses where the setting is off). A submission in Copyediting is `decisions: ['sendExternalReview', 'accept']` with one `reviewRounds[]` entry, `reviewerSuggestions[]` riding on it as on any seed; the preprint-server absence with `author.alex` and `manager.maya` on OPS. Emails are read in Mailpit by the recipient's address (PRINCIPLES A8; the catcher sits at its cap, note k, so a suite matches the fresh recipient and the tag-bearing title). Usernames belong to the install, so each scenario types a username of its own in "Create New Reviewer": the body's `nova` stands for it, and the suites tag the typed username per run as they do the fresh addresses. Passwords: the username twice; `admin`/`admin`.

<a id="fn-s1"></a>
**s1** — Scenario 1: Rules 1–7 and Fields, Actors row 1, on a scratch journal with a throwaway `author` and `editor`; `POST scenarios/submission` with `submitted: false`, opened at `submission?id={id}` as the author, and a second such draft for the same `author` for the "Submit" with no suggestion (the wizard's own required file is uploaded on each before "Submit"). The four "This field is required." messages and the "Please correct 4 errors." summary are note b; the "Edit" window closed with a change typed is Rule 4 (note d); the reopen route is My Submissions' "Complete submission"; the Journal Manager's opening of the draft is Actors row 1 (note t1), as the throwaway `editor`, from the Editor Dashboard's "All in submission stage" view; the Journal Manager's read after the submit is Rule 8a. The control runs on `publicknowledge` (the setting off, seed-facts) as `author.alex` for the draft and as `manager.maya` for the panel and list absences on a submission seeded in review there (note s), Rules 8 and 10 at the setting's off end.

<a id="fn-s2"></a>
**s2** — Scenario 2: Rules 8a–8c, 9 (all three modes) and 11, as the scratch `editor`; `POST scenarios/submission` with `reviewRounds` for round 1 and `reviewerSuggestions[]` holding the throwaway `externalReviewer`'s address, the throwaway `reader`'s address and a fresh address (note s: the Create and Enroll paths need an address no account carries in the context). The "Close" arrow after typing is Rule 9's closing sentence (note g). The "Email" change on Nova's row uses a second fresh address that no account and no suggestion of the context carries, and a username of its own, so the account it creates matches nothing and the row's second "Add Reviewer" still opens "Create New Reviewer" (note i; the suite picks both fresh addresses per run). The mailbox read is Side effects' second bullet, in Mailpit by each address (note s). The Copyediting read is Rule 8b's last sentence (note f, note t6): a second `POST scenarios/submission` on the same journal with `decisions: ['sendExternalReview', 'accept']`, one `reviewRounds[]` entry and `reviewerSuggestions[]` holding one more fresh address. The control is a third `POST scenarios/submission` in review with no `reviewerSuggestions`.

<a id="fn-s3"></a>
**s3** — Scenario 3: Rule 10 (both bullets, the assigned notice, the inner window's close with a username typed: note h) and Rule 11, as the scratch `editor`; `reviewRounds[].reviewers[]` seeds the first `externalReviewer` on round 1 while `reviewerSuggestions[]` carries their address (the seeded assignment leaves the suggestion pending: note h), a second `externalReviewer` for the in-window select, and a fresh address for the inner "Create New Reviewer"; that address and the typed username are scenario 3's own (note s), so the account it creates is not scenario 2's. The suite finds Nova under "Locate a Reviewer" by searching her name before reading the notice. The control reuses scenario 2's no-suggestion submission.

<a id="fn-s4"></a>
**s4** — Scenario 4: Actors rows 2 and 4, A1 and A5, as a scratch `funding` participant on the submission (note s); `reviewerSuggestions[]` with the `externalReviewer`'s address and a fresh address. The "Enroll an Existing User as Reviewer" path was not driven for this role (note f-a5).

<a id="fn-s5"></a>
**s5** — Scenario 5 (OMP): Rule 8's press sentence, Rule 10's third bullet, OMP1 and Rule 11, as the scratch `editor`; `POST scenarios/submission` with `reviewRounds` for the internal round and `reviewerSuggestions[]` holding a fresh address and one more; "Send to External Review" is the Review stage's decision wizard (note t10).

<a id="fn-s6"></a>
**s6** — Scenario 6 (OPS): the absence paragraph and note a, on `publicknowledge` as `author.alex` and `manager.maya`; the posted preprint is any seeded one.

<a id="fn-t1"></a>
**t1** — Settled, live-probed 2026-09-06 (Actors row 1), OJS and OMP: the Journal Manager opened the author's draft with the full wizard, the "Reviewer Suggestions" step and "Add Reviewer Suggestion" included, both by the draft's address and from the Editor Dashboard's "All in submission stage" view ("Incomplete", "Complete submission"); the dashboard has no "Incomplete" view. The section editor, another author, a reviewer and a reader were refused at the address (note a).

<a id="fn-t3"></a>
**t3** — Settled, live-probed 2026-09-06 (Fields "Email"), OJS and OMP: the second suggestion with the same "Email" was refused with "The email has already been taken." under the box (`validator.unique`) and the panel kept one entry; the same address in capitals saved as a second entry (finding A6).

<a id="fn-t4"></a>
**t4** — Settled, live-probed 2026-09-06 (Rule 2), OJS and OMP: the empty panel reads "No items found.".

<a id="fn-t5"></a>
**t5** — Settled, live-probed 2026-09-06 (Rule 3), OJS and OMP: after "Save for Later" and a reopen from My Submissions ("Complete submission" on the Incomplete row) the step listed the same entries; the wizard reopens on the step last shown.

<a id="fn-t6"></a>
**t6** — Settled, live-probed 2026-09-06 (Rules 8a, 8b), OJS and OMP: after three of four suggestions were matched the Submission stage listed all four with no button and nothing marking the matched ones; after "Accept Submission" the Review stage listed the pending row without its "…" menu.

<a id="fn-t7"></a>
**t7** — Settled, live-probed 2026-09-06 (Rule 8d), OJS and OMP: unticked and saved ("Saved"), no panel on any stage; ticked and saved, the panel back with the same names and the Review stage's "…" menus.

<a id="fn-t8"></a>
**t8** — Settled, live-probed 2026-09-06 (Rule 9, first mode), OJS and OMP: the window opened on "Selected Reviewer" with the name and email, no "Locate a Reviewer", the "Review Request" message and both dates filled; "Add Reviewer" as is put "{name} / Request Sent" in the Reviewers table, the row left the panel at once, and one request email ("Invitation to review" on OJS, "Manuscript Review Request" on OMP) reached the reviewer.

<a id="fn-t9"></a>
**t9** — Settled, live-probed 2026-09-06 (Rule 10, second bullet), OJS and OMP, manager and section editor: the inner "Add Reviewer" window opened on "Create New Reviewer" with the four boxes filled for a no-account suggestion and on "Enroll an Existing User as Reviewer" with "{name} ({email})" and the reviewer role preset for the reader's; after its "Add Reviewer" the inner window closed by itself, the outer stayed open, the entry left the list (its row a gap, finding A9), the new reviewer showed under "Locate a Reviewer" with the assigned notice, and the "<" arrow named "Close" closed the outer window onto an already refreshed panel.

<a id="fn-t10"></a>
**t10** — Settled, live-probed 2026-09-06 (Rule 10, third bullet; OMP1), OMP: the Internal Review stage showed no "Reviewers Suggested by Author" panel; its Reviewers "Add Reviewer" opened with "Submission Author List", "Select a Reviewer from Reviewer Suggestions" and "Locate a Reviewer" in that order; a no-account suggestion added from it read "{name} / Request Sent" on the internal round; after "Send to External Review" the External Review panel and its window's list carried the other suggestions only and the round's Reviewers table read "No Items"; the Submission stage still listed every suggestion.

<a id="fn-t11"></a>
**t11** — Settled, live-probed 2026-09-06 (Rule 11), OJS and OMP: with "Email" changed to another unused address in "Create New Reviewer" before "Add Reviewer", the new reviewer read "Request Sent" and the suggestion stayed in the panel and in the window's list.

<a id="fn-t12"></a>
**t12** — Settled, live-probed 2026-09-06 (Rule 12), OJS and OMP: after "Unassign Reviewer" (the row menu offered "Review Details", "Edit", "Unassign Reviewer", "Email Reviewer", "History", "Login As", "Editorial Notes", "Log Response") and after "Cancel Reviewer" on an accepted request, the suggestion returned to neither the Review stage's panel nor the list, while the Submission stage still listed it (note i).

<a id="fn-t13"></a>
**t13** — Settled, live-probed 2026-09-06 (Rule 10), OJS and OMP: the entry of a reviewer already on the round showed "This reviewer has already been assigned to this review round." and no "Select Reviewer" button; the same person in "Locate a Reviewer" carried the same notice and no button.

<a id="fn-t14"></a>
**t14** — Settled, live-probed 2026-09-06 (Side effects), OJS and OMP: the Activity Log gained the assignment row and the "An email has been sent: …" row only, no row naming a suggestion; the mailbox held the request (and, for a created account, the "Registration as Reviewer with {journal}" welcome) and nothing else (note k).

<a id="fn-t15"></a>
**t15** — Settled, live-probed 2026-09-06 (Rule 1), OJS and OMP: Settings › Workflow › Submission has the sub-tab "Author Guidance" whose last box is "For Reviewer Suggestion" with the default text (note c); a custom text saved there ("Saved") showed above the step's panel on the next wizard visit.

<a id="fn-t16"></a>
**t16** — Settled, live-probed 2026-09-06 (Fields "ORCID iD"; A2), OJS and OMP: with ORCID on the box "ORCID iD" sits after "Email" (order Given Name, Family Name, Email, ORCID iD, Affiliation); `1234` and the bare `0000-0002-1825-0097` were refused with the full-URI message, `https://orcid.org/0000-0002-1825-0097` saved; the saved iD showed in the author's "Edit" window (its "ORCID iD" box) and nowhere else: not the wizard panel, the Review step, the editors' panel on either stage, the row's Add Reviewer window, or the "Create New Reviewer" form it opened on, which has no ORCID input among its 33 inputs.

<a id="fn-t17"></a>
**t17** — Settled, live-probed 2026-09-06 (Rule 6), OJS and OMP: the block's heading, entry lines, "Edit" target, the empty warning and the completed "Submit" are as note e records.

<a id="fn-f-a1"></a>
**f-a1** — `ReviewerSuggestionManager` is pushed for every editorial-view visitor of the stage and its store fetches the list on mount; `useFetch` then calls `modalStore.openDialogNetworkError()`, which shows the response's error text under the title `common.error` "Error". Live-probed 2026-09-06, OJS and OMP, as a scratch `funding` participant: `GET …/api/v1/submissions/{id}/reviewers/suggestions[?approved=false]` is answered 401 with "The current role does not have access to this operation." (not the 403 `api.403.unauthorized` the middleware `HasRoles` would give) and the dialog shows that text with one "OK"; the same on the Submission stage and Review round 1, with suggestions and without; none on a journal with the setting off; after "OK" the stage was usable and the coordinator went on to open "Add Reviewer".

<a id="fn-f-a5"></a>
**f-a5** — `PKPReviewerGridHandler::__construct()` grants `ROLE_ID_ASSISTANT` the review-round operations minus `createReviewer`, `enrollReviewer` and `gossip` (note a), and `AdvancedSearchReviewerForm::fetch()` adds the "Create New Reviewer" / "Enroll Existing User" link actions only for `ROLE_ID_MANAGER` and `ROLE_ID_SUB_EDITOR`, but `SelectReviewerSuggestionListItem.vue::select()` opens `showReviewerForm` with `selectionType` `REVIEWER_SELECT_CREATE` for any role that reached the window. Live-probed 2026-09-06, OJS (two runs) and OMP (one run): the Funding Coordinator's "Select Reviewer" on a no-account suggestion opened "Create New Reviewer" prefilled; its "Add Reviewer" posted `reviewer-grid/create-reviewer`, answered 200, and the form stayed open, the Reviewers table still "No Items" (that probe dismissed a browser alert without recording it). Walked 2026-10-04 (Actors row 4; scenario 4), OJS and OMP, `main` and `stable-3_5_0`, PKP's default dataset as a Funding coordinator: the answer is `{"status": false, "content": "The current role does not have access to this operation."}`, which `$.pkp.classes.Handler.prototype.handleJson()` shows with `alert()`; after "OK" the form still held the typed username and the Reviewers table read "No Items"; no server or script error. The role's "Select Reviewer" on an enrolled reviewer gave the "Selected Reviewer … Change" request form. The Enroll path was not driven for this role.
Issue report: [pkp-e2e#849](https://github.com/jardakotesovec/pkp-e2e/issues/849) ([docs/issues/U31-A5-funding-coordinator-create-reviewer-from-suggestion-does-nothing.md](../issues/U31-A5-funding-coordinator-create-reviewer-from-suggestion-does-nothing.md)).

<a id="fn-f-a2"></a>
**f-a2** — Note t16 (live-probed 2026-09-06: the saved iD in the "Edit" window's box only). `CreateReviewerForm::initData()` copies `familyName`, `givenName`, `email`, `affiliation` only; `ReviewerSuggestionManager.vue`, `SelectReviewerSuggestionListItem.vue`, `ReviewerSuggestionsListPanel.vue` and `review-reviewer-suggestions.tpl` render no `orcidId`; `ReviewerSuggestionsListPanel.vue::openEditModal()` fills the form from `GET …/suggestions/{id}`, which carries it.

<a id="fn-f-a3"></a>
**f-a3** — Notes t12 and i (live-probed 2026-09-06, unassign and cancel, OJS and OMP). The attribute setters keep the first `approved_at` and `reviewer_id`; the grid's unassign and cancel paths never touch the table; the Review stage's panel and the window's list query `withApproved(false)`, the Submission stage's panel queries without the filter and shows the row.

<a id="fn-f-a4"></a>
**f-a4** — Note a: no author workflow config pushes the manager; the API's `getMany` would answer the Author, but no author screen calls it after the wizard. Live-probed 2026-09-06 (note e, Rule 7), OJS and OMP: every stage tab of the author's view, with and without suggestions, showed no panel or list.

<a id="fn-f-a6"></a>
**f-a6** — `AddReviewerSuggestion::rules()`'s `Rule::unique` on `reviewer_suggestions` is a plain SQL equality on the stored `email`, case-sensitive on the test installs' Postgres (a MySQL collation may fold case); nothing lower-cases the input. Live-probed 2026-09-06 (note b), OJS and OMP: "KAY.…@MAIL.TEST" saved beside "kay.…@mail.test" on the same draft.
Issue report: [pkp-e2e#856](https://github.com/jardakotesovec/pkp-e2e/issues/856) ([docs/issues/U31-A6-reviewer-suggestion-same-address-other-case.md](../issues/U31-A6-reviewer-suggestion-same-address-other-case.md)).

<a id="fn-f-a7"></a>
**f-a7** — `lib/pkp/locale/en/default.po`, `default.submission.step.reviewerSuggestions`: "…provide valueable input for the editorial team…", copied into every new context's `reviewerSuggestionsHelp` by `I4787_AddReviewSuggestionHelp`. Live-probed 2026-09-06 (note c), OJS and OMP, on the step and in the "For Reviewer Suggestion" box.
Issue report: [pkp-e2e#852](https://github.com/jardakotesovec/pkp-e2e/issues/852) ([docs/issues/U31-A7-reviewer-suggestion-guidance-misspells-valuable.md](../issues/U31-A7-reviewer-suggestion-guidance-misspells-valuable.md)).

<a id="fn-f-a8"></a>
**f-a8** — `SelectReviewerSuggestionListItem.vue` renders the button's screen-reader span as `{{ t('common.selectWithName', {name: fullName}) }}`, but the component defines no `fullName` property (the name is `item.fullName`, localized only inside `select()`), so the interpolation yields "undefined"; the reviewer list's `SelectReviewerListItem.vue` passes `item.fullName`. Live-probed 2026-09-06 (note h), OJS and OMP: accessible name "Select Reviewer Select undefined" on every suggestion entry, "Select Reviewer Select Rowan Reviewer" in "Locate a Reviewer".
Issue report: [pkp-e2e#844](https://github.com/jardakotesovec/pkp-e2e/issues/844) ([docs/issues/U31-A8-suggestion-select-reviewer-named-undefined.md](../issues/U31-A8-suggestion-select-reviewer-named-undefined.md)).

<a id="fn-f-a9"></a>
**f-a9** — `SelectReviewerListPanel.vue::updateReviewerSuggestionList()` marks the item approved and the item's inner `v-if="!item.approvedAt"` hides its content, while the `ListPanel`'s `li` for the item stays rendered. Live-probed 2026-09-06 (note h), OJS and OMP: `window.panels[0].items[1].lines: []` after the inner add, the row gone after the window was reopened.
Issue report: [pkp-e2e#845](https://github.com/jardakotesovec/pkp-e2e/issues/845) ([docs/issues/U31-A9-suggestion-added-reviewer-leaves-blank-row.md](../issues/U31-A9-suggestion-added-reviewer-leaves-blank-row.md)).

<a id="fn-f-a10"></a>
**f-a10** — The "Back to Search" link is `ReviewerForm::getAdvancedSearchAction()`, an `AjaxAction` on `reloadReviewerForm` with `selectionType` `REVIEWER_SELECT_ADVANCED_SEARCH` that replaces the form's content inside whichever modal holds it; from the inner modal the advanced-search form, suggestions list included, renders inside the inner dialog while the outer one still shows its own, and the grid handlers are bound twice. Live-probed 2026-09-06 (note h), OJS and OMP: three, then four, "Add Reviewer" dialogs stacked; console errors `The handler "$.pkp.controllers.grid.users.reviewer.AdvancedReviewerSearchHandler" has already been bound to the selected element!` and the same for `AddReviewerFormHandler`.
Issue report: [pkp-e2e#841](https://github.com/jardakotesovec/pkp-e2e/issues/841) ([docs/issues/U31-A10-back-to-search-nests-add-reviewer-window.md](../issues/U31-A10-back-to-search-nests-add-reviewer-window.md)).

<a id="fn-f-a11"></a>
**f-a11** — `lib/pkp/locale/en/submission.po`, `reviewerSuggestion.suggestionReason.description`, the `FieldRichTextarea('suggestionReason')` description (note b). Live-probed 2026-09-06 (note b; the K4 window snapshots), OJS and OMP, verbatim in the "Add Reviewer Suggestion" and "Edit" windows.
Issue report: [pkp-e2e#853](https://github.com/jardakotesovec/pkp-e2e/issues/853) ([docs/issues/U31-A11-reviewer-suggestion-reason-help-is-there.md](../issues/U31-A11-reviewer-suggestion-reason-help-is-there.md)).

<a id="fn-f-a12"></a>
**f-a12** — `useReviewerSuggestionManagerActions.js::getItemActions()` gives every pending row "Add Reviewer" with no look at the round's reviewers, while `SelectReviewerSuggestionListItem.vue` hides its button when `currentlyAssigned` holds the person (note h). `reviewerSuggestionApprove()` opens `showReviewerForm` on the existing account in `REVIEWER_SELECT_ADVANCED_SEARCH` (note g); on save `ReviewerForm::execute()` finds `_isValidReviewer()` false for a reviewer already on the round and throws `Exception('Invalid reviewer id.')` instead of returning a form error. Walked 2026-10-04 (Rule 9, first mode), OJS and OMP, `main` and `stable-3_5_0`, PostgreSQL, PKP's default dataset, in the A6 report's walk ([pkp-e2e#856](https://github.com/jardakotesovec/pkp-e2e/issues/856)), which names this fault separate from A6 and out of its scope: through A6's second entry after the person was added from the first, and through a single suggestion "AGallego@Mailinator.com" after the dataset reviewer holding agallego@mailinator.com was added through the window's list (note f-a6). The row's window opened on "Selected Reviewer" with the person's name; its "Add Reviewer" posted `reviewer-grid/update-reviewer`, answered 500, with the log line `PHP Fatal error:  Uncaught Exception: Invalid reviewer id. in lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php`; no message showed, the window stayed open, the row stayed in the panel, and the window's list showed the entry with the assigned notice and no "Select Reviewer".

<a id="fn-f-omp1"></a>
**f-omp1** — Note t10 (live-probed 2026-09-06, OMP: both halves hold, the internal add retires the suggestion for the External Review panel and list, that round's Reviewers table "No Items"). Note f (panel absent on `WORKFLOW_STAGE_ID_INTERNAL_REVIEW`; `atActiveReviewStage()` requires stage 3) against note h (`PKPSelectReviewerListPanel` adds the list on any stage); `ReviewerForm::execute()` matches by email whatever the stage (note i).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Reviewer Suggestions" step and panel (wizard) | `{journal}/submission?id={id}` → step "Reviewer Suggestions" | AFFW-157 · AFFW-158 · AFFW-159 |
| "Add Reviewer Suggestion" / "Edit" side window | the step's button and each entry's "Edit"; `POST` / `PUT api/v1/submissions/{id}/reviewers/suggestions[/{suggestionId}]` | AFFW-160 · VUE-099 |
| "Delete Reviewer Suggestion" dialog | each entry's "Delete"; `DELETE api/v1/submissions/{id}/reviewers/suggestions/{suggestionId}` | AFFW-159 · API-031 |
| "Reviewers Suggested by Author" panel (editorial view) | `{journal}/dashboard/editorial?workflowSubmissionId={id}` → Submission; → Review › round; `GET api/v1/submissions/{id}/reviewers/suggestions[?approved=false]` | AFFW-576 · VUE-048 · API-031 |
| Row "…" › "Add Reviewer" | the panel, current round | AFFW-575 |
| "Select a Reviewer from Reviewer Suggestions" list | the Add Reviewer window ("Locate a Reviewer" mode) | AFFW-216 |
| "Select Reviewer" on a suggestion | the list | AFFW-225 |

## Reference — code anchors

- `lib/pkp/api/v1/reviewers/suggestions/ReviewerSuggestionController.php`; `formRequests/AddReviewerSuggestion.php`, `EditReviewerSuggestion.php`; `resources/ReviewerSuggestionResource.php` · `ojs api/v1/submissions/index.php`, `omp api/v1/submissions/index.php` (no OPS mount)
- `lib/pkp/classes/submission/reviewer/suggestion/ReviewerSuggestion.php`; `lib/pkp/classes/submission/maps/Schema.php` (`getPropertyReviewerSuggestions()`, `summarizeReviewerSuggestion()`); `lib/pkp/classes/migration/install/ReviewerSuggestionsMigration.php`, `upgrade/v3_5_0/I4787_InstallReviewerSuggestion.php`, `I4787_AddReviewSuggestionHelp.php`, `I11673_AddMissingApprovalToReviewerSuggestion.php`; `ojs/schemas/context.json`, `submission.json` (and OMP's)
- `lib/pkp/classes/components/forms/submission/ReviewerSuggestionsForm.php`, `SubmissionGuidanceSettings.php` (`addReviewSuggestionGuidanceDetail()`); `lib/pkp/classes/components/forms/context/PKPReviewSetupForm.php` (`addReviewSuggestionControl()`); `lib/pkp/classes/components/listPanels/ReviewerSuggestionsListPanel.php`, `PKPSelectReviewerListPanel.php`
- `lib/pkp/pages/submission/PKPSubmissionHandler.php` (`getReviewerSuggestionsStep()`, `getReviewerSuggestionsListPanel()`); `lib/pkp/templates/submission/wizard.tpl`, `review-reviewer-suggestions.tpl`; `lib/pkp/pages/dashboard/PKPDashboardHandler.php` (`isReviewerSuggestionEnabled`)
- `lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php` (`_getReviewerForm()`); `lib/pkp/controllers/grid/users/reviewer/form/ReviewerForm.php` (`execute()`), `AdvancedSearchReviewerForm.php`, `CreateReviewerForm.php`, `EnrollExistingReviewerForm.php`; `lib/pkp/templates/controllers/grid/users/reviewer/form/advancedSearchReviewerForm.tpl`, `advancedSearchReviewerAssignmentForm.tpl`, `createReviewerForm.tpl`, `enrollExistingReviewerForm.tpl`
- lib/ui-library `src/components/ListPanel/reviewerSuggestions/ReviewerSuggestionsListPanel.vue`, `ReviewerSuggestionsEditModal.vue`; `src/components/ListPanel/users/SelectReviewerListPanel.vue`, `SelectReviewerSuggestionListItem.vue`; `src/managers/ReviewerSuggestionManager/ReviewerSuggestionManager.vue`, `reviewerSuggestionManagerStore.js`, `useReviewerSuggestionManagerActions.js`; `src/pages/workflow/WorkflowPageOJS.vue`, `WorkflowPageOMP.vue`, `composables/useWorkflowConfig/workflowConfigEditorialOJS.js`, `workflowConfigEditorialOMP.js`, `useWorkflowConfigOMP.js`; `src/components/Container/SubmissionWizardPage.vue`; `src/composables/useFetch.js`, `src/stores/modalStore.js`
- `lib/pkp/locale/en/submission.po` (`submission.reviewerSuggestions`, `editor.submission.reviewerSuggestions`, `editor.submission.findAndSelectReviewerFromSuggestions`, `submission.wizard.noReviewerSuggestions`, `reviewerSuggestion.suggestionReason*`, `submission.forReviewerSuggestion`), `grid.po` (`grid.action.*ReviewerSuggestion*`), `manager.po` (`manager.setup.reviewOptions.reviewerSuggestionEnabled*`), `user.po` (`user.authorization.submission.complete.reviewerSuggestionRestrict`), `default.po` (`default.submission.step.reviewerSuggestions`)
- upstream tests: `lib/pkp/cypress/support/command_reviewer_suggestion.js`; `ojs cypress/tests/data/60-content/ZzeddSubmission.cy.js`
