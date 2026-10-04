---
name: author-response-to-reviews
status: verified
---

# Author response to reviews {OJS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Once the reviews of a round are in, an editor can ask the author for a
formal written response to them, in one place, before deciding. The editor
sends the request as an email from a dedicated page; the author answers
through a window on their own view of the review stage, saying which of the
submission's contributors the response speaks for; editors read the
response on the same stage and may correct or remove it. One response
exists per review round. This spec covers the editor's "Author Response"
table, the "Request Author Response" page and its email, the author's
"Author Response" card and the response window, on OJS. The round the
response belongs to is
[→ review stage & rounds](U26-review-stage-and-rounds.md#rounds); the
reviews it answers are completed in *Reviewer's review* and read by the
editor in
[→ reviewer assignment & management](U27-reviewer-assignment-and-management.md#read-review).

A press installs the same code but shows none of it on the workflow
screen: neither the editor's "Author Response" table nor the author's
"Author Response" card appears on the External Review or Internal Review
stage, whatever the round's state. The "Request Author Response" page
still opens by its address (Rule 14) and sends its email, and the Request
Revisions decision email still carries a "Submit Author Response" button;
both land the author on a workflow screen with nothing to respond in
⚠ [OMP1](#omp1). A preprint server has no review stage, so no round exists
to respond to: a preprint's Production stage shows no "Author Response"
table, and the request page's address shows the access-denied page, reading
"A workflow stage was not specified." for the Preprint Server Manager and a
Moderator and "The current role does not have access to this operation."
for the Author. <sup>a</sup>

## Actors & permissions

**Terms used below.** An **assigned author** is an Author listed on the
review stage's Participants panel: the submitting author always, a
co-author only once an editor assigned them there (*Stage participants*).
A **contributor** is a name on the submission's Contributors list, with or
without an account. The **editorial roles** of this spec are Journal
Manager, Editor, Site Administrator, and Section Editor and Guest Editor
assigned to the review stage; the Funding Coordinator, the one
assistant-level role that reaches the review stage
([→ stage access](U24-workflow-screen-and-stage-access.md#stage-access)),
is named where it differs. Who opens the review stage at all is the review
stage spec's row "Open the review stage". <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **See the "Author Response" table** (editorial view of the review stage) | • Editorial roles; Funding Coordinator when assigned: on every round, always (Rule 1) <sup>c</sup> |
| **Request a response** ("Request Response" → the "Request Author Response" page) | • Editorial roles: while the round is ready (Rule 3) and holds no response<br>• Funding Coordinator: the button is offered like everyone else's, but pressing it shows the access-denied page instead of the request page ⚠ [A3](#a3) <sup>e</sup> |
| **See the "Author Response" card** (author view) | • Assigned author: while the round is in one of the three states of Rule 6 <sup>h</sup> |
| **Submit a response** | • Assigned author: once per round, while the card offers "Submit Response" (Rules 6, 8); any assigned author may, naming the contributors it speaks for <sup>j</sup> |
| **Read a submitted response** | • Assigned author, the submitter or another: "View Submitted Response" on the card (Rule 9)<br>• Editorial roles; Funding Coordinator: row action "View" on the row of the author who submitted it (Rule 10) <sup>k</sup> |
| **Edit a submitted response** | • Editorial roles: "Save" in the "Author Response to Reviews" window (Rule 10)<br>• Author: never; the window says so (Rule 9)<br>• Funding Coordinator: the window opens with the editors' note, but in place of "Save" it shows a "Submit Response" button that stays greyed [A3](#a3) <sup>k</sup> |
| **Delete a submitted response** | • Editorial roles: row action "Delete" (Rule 11)<br>• Funding Coordinator: the action is offered like everyone else's, but "OK" in its dialog is refused with the dialog "Error" / "The current role does not have access to this operation." and the response stays [A3](#a3) <sup>l</sup> |
| **Open the request page by its address** | • Editorial roles who may open the submission: the page opens for any of its rounds (Rule 14)<br>• Everyone else (an unassigned Section Editor or Guest Editor, Funding Coordinator, Author, Reviewer, Reader): the access-denied page (Rule 14) <sup>o</sup> |

## Fields & validation

The request page is an email editor; the response window is a two-field
form.

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "To" (request page) | fixed | The assigned authors, one chip per person; there is no box to add anyone (Rule 13) <sup>f</sup> |
| "Add CC/BCC" → "CC", "BCC" (request page) | no | Pressing "Add CC/BCC" replaces the button with two empty boxes, "CC" and "BCC"; email addresses typed there, comma-separated, go on the email <sup>f</sup> |
| "Subject" (request page) | yes | Prefilled "Request For Author Response To Reviewer Feedback" from the template; emptied, "Submit Request" is refused with a generic "Error" dialog (Rule 4a) ⚠ [A5](#a5) <sup>f</sup> |
| "Message" (request page) | yes | Rich text (bold, italic, superscript, subscript, link) prefilled from the "Request Author Review Response" template (Rule 4), with the "Submit Author Response" button and the reviewers' comments (Rule 5) already in it; emptied, "Submit Request" is refused the same way [A5](#a5) <sup>f</sup> |
| "Attach Files" (request page) | no | A toolbar button opening the "Attach Files" window with four sources: "Upload File", "Submission Files" (the author's files from the submission stage), "Review Files" (files uploaded by this round's reviewers) and "Library Files" <sup>f</sup> |
| "Author Response" (response window) | yes | Rich text (bold, italic, underline, bullet list), one box per form language, so one on the seeded journal; the submit button stays greyed while the box is empty <sup>b</sup> |
| "Authors" (response window) | yes, at least one | One checkbox per contributor of the submission, described as "Author contributors who this response is being submitted on behalf of."; an assigned co-author who is not on the Contributors list has no box; the submit button stays greyed while none is ticked <sup>b</sup> |

## Rules & state

<a id="panels"></a>
1. **Where the feature lives.** In the editorial view of the review stage,
   each round shows a table headed "Author Response", described "Invite the
   author to respond to reviewer feedback before moving forward", after the
   Reviewers panel and before the discussions. It has one row per assigned
   author, columns "Author" and "Response Status", and the header button
   "Request Response"; once a response exists, a third column without a
   visible heading holds the row actions of Rule 10. In the author view
   the same stage ends with a card headed "Author Response", only in the
   states of Rule 6; in any other state the author sees no card. <sup>c</sup>

<a id="status"></a>
2. **"Response Status"** reads one of three things:

   | Cell | When |
   |------|------|
   | "Awaiting reviews" | The round is not ready (Rule 3) |
   | "Ready to invite author" (shown with every word capitalised, "Ready To Invite Author") over "Editor can now request the author's response." | The round is ready and holds no response |
   | "A response was submitted by {name}" | A response exists; {name} is the person who submitted it |

   Every author row shows the same cell: the status is the round's, not
   the person's. <sup>d</sup>

<a id="ready"></a>
3. **When "Request Response" is enabled.** The round is **ready** when it
   has at least one reviewer whose request was not declined or cancelled
   ⚠ [A8](#a8), and every such reviewer has submitted their review
   ("Review Submitted",
   "Review Viewed", "Complete" or "Reviewer Thanked" in the Reviewers
   panel); a round with no reviewer is not ready. With "Minimum Confirmed
   Reviews Required" above 0 (Settings › Workflow › Review › "Setup";
   *Review setup & review forms*), the round is also ready as soon as that
   many reviews stand "Complete" (the editor's "Mark as Complete" in Read
   Review, confirmed with "Mark as Complete" in the dialog "Mark this
   review as complete?"), whatever the other reviewers have done. "Request Response" is
   greyed until the round is ready and again once a response exists.
   Sending a request changes nothing on this table: the cell still reads
   "Ready to invite author" and the button stays enabled, so the next press
   sends a second request; only the author's "Notifications" list shows
   every send ⚠ [A1](#a1). <sup>e</sup>

<a id="request-page"></a>
4. **The "Request Author Response" page.** "Request Response" leaves the
   workflow screen for a full page headed "Request Author Response" (the
   browser tab shows the journal's name), with the line "You’re about to
   email the author to request a response to the completed reviews. Use
   the template below or customize your message as needed" and the
   breadcrumb Dashboard › "{family name}, {submission title}" › Request
   Author Response. Under the heading "Modify email shared with the user"
   (shown in capitals) sit "Templates to get you started!" with its "Find
   Template" box, the language switch ("Switch to French" on the seeded
   journal) and the email editor of Fields, prefilled from the "Request
   Author Review Response" template. "Cancel" returns to the workflow
   screen with the round open, nothing sent. "Submit Request" sends the
   email (Side effects) and shows the dialog "Request for review response
   sent" / "The author of the submission, {submission title}, have been
   notified and asked to submit their response to the reviewers' comments."
   with one link, "View Submission Summary", which returns to the workflow
   screen on the round. The dialog has no close button; Escape closes it
   and lands on the same screen. <sup>f</sup>

4a. **Refusals at "Submit Request".** Every refusal is a dialog headed
   "Error" with one button, "OK", and the page keeps what was typed:

   - an emptied "Subject" or "Message": "An unexpected error has occurred.
     Please reload the page and try again.", with nothing under the field
     to say what is wrong ⚠ [A5](#a5);
   - a round that is not ready (Rule 3): "This review round has review
     assignments that needs to be completed before a response can be
     requested from the Author.";
   - a round that already holds a response, whether or not every review is
     in: "Unable to complete the intended action on resource.".

   The last two are met only through a typed address (Rule 14), because
   the button is greyed in both states. <sup>f</sup>

<a id="email"></a>
5. **What the email says.** Subject "Request For Author Response To
   Reviewer Feedback". The body opens "Hello {author name}," naming every
   assigned author, comma-separated, in no fixed order; says "All peer
   reviews for your
   submission titled "{submission title}" have now been completed." and
   invites a response, shows the button "Submit Author Response" (Rule 7)
   and then, under a line, "The following comments were received from
   reviewers." followed by one block per completed review of the round:

   - the heading: "Reviewer 1:", "Reviewer 2:" … for anonymous reviews,
     numbered in the order the message lists them, which does not follow
     the Reviewers panel and can differ from one opening of the page to
     the next; or the reviewer's name alone for a review conducted openly;
   - "Recommendation: {the reviewer's recommendation}";
   - the text the reviewer wrote "For author and editor"; for a review on
     a review form, instead, each question marked "Included in message to
     author" as a line of its own with its answer as the paragraph under
     it, the other questions absent.

   A second line and "Kind regards," over the sender's name close the
   body. Reviews still outstanding and declined or cancelled requests
   contribute nothing [A8](#a8), and under a minimum (Rule 3) the opening sentence
   still says every review is in ⚠ [A6](#a6). A reviewer's uploaded files
   are not attached by themselves; the editor picks them under "Attach
   Files". The editor may rewrite any of this before sending. <sup>g</sup>

<a id="card"></a>
6. **The author's card.** The "Author Response" card appears on a round
   when any of three things holds: a request was sent for it (Rule 4); its
   status reads "Revisions have been requested."; or the submission was
   accepted from it with "Accept Submission", in which case the round's
   status box reads "The submission is currently in the Copyediting
   stage." for the author and the editor alike
   ([→ round status](U26-review-stage-and-rounds.md#round-status)). Until
   a response exists it reads "Respond to Reviews" with the button "Submit
   Response"; afterwards "A response was submitted by {name}" with "View
   Submitted Response". The Request Revisions decision email carries the
   same "Submit Author Response" button as the request email, so an author
   asked for revisions can respond without a separate request; that
   email's subject is "Your submission has been reviewed and we encourage
   you to submit revisions" <sup>f-omp1</sup>. Once shown, the card stays
   on a requested round: a request is remembered even after the response is
   deleted (Rule 11). The card a Request Revisions decision brings is not
   remembered: once the author uploads a revision, the round's status reads
   "Revisions have been submitted and a decision is needed." and the card
   is gone until an editor sends a request ⚠ [A7](#a7). <sup>h</sup>

<a id="link"></a>
7. **The email's button.** "Submit Author Response" opens My Submissions
   with the submission's workflow open on the review stage, that round
   selected, and the response window (Rule 8) already open once the screen
   has loaded; a signed-out author passes through Login first and lands on
   the same screen with the window open. Closing the window leaves the
   screen on the round, and a reload does not reopen the window
   ([→ deep links](U24-workflow-screen-and-stage-access.md#deep-link)).
   <sup>i</sup>

<a id="author-window"></a>
8. **Writing the response.** "Submit Response" opens a side window titled
   "Submit Your Response to Reviewer Feedback" whose intro reads "All
   reviews for your submission have been completed. Please review the
   comments and provide a written response to the reviewers. You can
   address their suggestions, clarify any points, and indicate any
   revisions you plan to make. Your response will be shared with the
   editorial team and may be sent back to reviewers if needed." Under it
   the two fields of Fields, then "Submit Response" (greyed until both fields are
   filled) and "Cancel" (closes, nothing kept). "Submit Response" closes
   the window with no message; the card flips to "A response was submitted
   by {name}" (Rule 6), and in the editor's table every author row shows
   the same cell and gains a "More Actions" button ("…") (Rule 10). The
   response belongs to the round: a second assigned author sees the
   flipped card with "View Submitted Response" only and cannot add a
   response of their own. <sup>j</sup>

<a id="author-reread"></a>
9. **Re-reading as the author.** "View Submitted Response" opens the same
   window with the intro "A review response has been submitted and is
   displayed below. This response cannot be edited by authors. If you
   would like any changes, please contact the assigned editor." The text
   and the ticked contributors are shown in the two fields, which still
   accept typing and unticking; "Submit Response" stays greyed whatever is
   changed in them, and "Cancel" closes with nothing saved. <sup>j</sup>

<a id="editor-window"></a>
10. **Reading and editing as an editor.** Once a response exists, every
    author row ends in a "More Actions" button ("…") with "View" and
    "Delete" (in red); both are greyed on every row except the one of the
    person who submitted the response. "View" opens the side window
    "Author Response to Reviews" with the note "The following response was
    submitted by the author, {name}. Editors may review the response and
    make edits if necessary.", the two fields editable, and "Save" and
    "Cancel"; "Save" greys while no "Authors" box is ticked. "Save"
    replaces the text and the ticked contributors and closes the window
    with no message; the author's "View Submitted Response" then shows the
    edited version, still headed with the original submitter's name. An
    assigned Funding Coordinator is offered the same row actions
    [A3](#a3). <sup>k</sup>

<a id="delete"></a>
11. **Deleting.** "Delete" opens the dialog "Delete" / "Are you sure you
    wish to delete this item? This action cannot be undone." with "OK" (in
    red) and "Cancel". "OK" removes the response, and the table catches up
    on its own a few seconds after the dialog closes: every row returns to
    "Ready to invite author" (Rule 2), the "…" buttons go, and "Request
    Response" is enabled again. The author's card returns to "Respond to Reviews"
    with "Submit Response": because the round remembers the request (Rule
    6), the author may submit a new response without being asked again.
    "Cancel" changes nothing. <sup>l</sup>

<a id="rounds"></a>
12. **Rounds.** Each round carries its own request and its own response.
    A new round starts at "Awaiting reviews" and shows the author no card,
    while the earlier round keeps whatever card it had (its status box for
    the author then reads "The submission has been advanced to the next
    round of review"). A past round keeps its response, readable through
    the same "View" once that round is chosen in the workflow menu, and
    its "Request Response" still follows Rule 3, so a past round with
    its reviews complete and no response can be asked for one. Nothing on
    the Copyediting or Production stage shows a response. <sup>m</sup>

<a id="recipients"></a>
13. **Who is asked, who is named.** The request goes to every assigned
    author of the review stage as one email: "To" lists them, one chip
    each, and cannot be edited, and the greeting names them all, in no
    fixed order. With "Notify All Authors" at its default
    (Settings › Workflow › Emails, under "Editorial Decisions": "Send an
    email notification to all authors of the submission."), every other
    contributor who has an email address also receives a copy (Side
    effects). The "Authors" boxes of the response window list the
    submission's contributors, account or not, so a response can speak
    for a contributor who was never emailed (Fields). <sup>n</sup>

<a id="by-address"></a>
14. **By address.** The request page's address is
    `{journal}/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId={round id}&submissionId={id}`
    (3 is the review stage, External Review on a press; the round id is
    the number after "workflow_3_" in the address bar with that round
    chosen in the workflow menu). The Journal Manager, Editor, Site
    Administrator and a Section or Guest Editor assigned to the submission
    get the page for any of its rounds; with a round id no submission has,
    or another submission's, the access-denied page reads "Invalid review
    round.". Every other role gets the access-denied page "The current
    role does not have access to this operation." and not the review
    stage: an unassigned Section or Guest Editor; Author, Reviewer, Reader
    and every assistant-level role, assigned or not. A page reached by a
    typed address (not through "Request Response") has nowhere to return
    to: "Cancel", and Escape on the sent dialog, land on a page reading
    only "404 Not Found"; "Submit Request" still sends the email, but the
    dialog's control reads "View Submission" and does nothing
    ⚠ [A4](#a4). <sup>o</sup>

<a id="french"></a>
15. **In French.** With the interface in French, the table, the author's
    card, both response windows and the request page show raw codes (the
    text's internal name between hash signs, such as
    "##submission.reviewRound.authorResponse##" where English reads
    "Author Response") for most of their headings, status lines and
    buttons, and the request email stays English; requesting, responding
    and reading the response work as in English ⚠ [A9](#a9). <sup>f-a9</sup>

## Side effects

- **The request email** "Request For Author Response To Reviewer Feedback"
  (Rule 5) goes to the assigned authors from the editor who pressed "Submit
  Request", with the CC, BCC and attachments typed on the page. It is
  recorded as an email the editor sent the author: the author's
  "Notifications" list on the review stage gains one row per send, and
  each row opens the "Notifications" window with the email as sent, its
  button working
  ([→ the "Notifications" list](U26-review-stage-and-rounds.md#author-emails)).
  <sup>p</sup>
- **A copy to the other contributors.** With "Notify All Authors" at its
  default, each contributor who has an email address and is not an assigned
  author receives an email with the same subject. Its body opens "The
  following email was sent to {author} from {journal} regarding
  "{submission title}"." and "You are receiving a copy of this notification
  because you are identified as an author of the submission. Any
  instructions in the message below are intended for the submitting author,
  {author}, and no action is required of you at this time.", then the
  editor's message, button included (the "Notify Other Authors" template,
  *Emails management*). Switched to "Only send an email to authors assigned
  to the submission workflow. Usually, this is the submitting author.",
  nobody else is mailed. <sup>p</sup>
- **The round is marked as asked.** After "Submit Request" the round
  remembers the request for good: the author's card shows from then on
  (Rule 6), even after a deletion (Rule 11). <sup>h</sup>
- **No task, no notification.** The author gets no task and no in-app
  notification; the email is the only notice. Submitting, editing or
  deleting a response sends no email and raises no task or notification for
  anyone: the header's "Tasks" panel stays at "No Items", the dashboard row
  does not change, and an editor learns of a response only by opening the
  round ⚠ [A2](#a2). <sup>p</sup>
- **The activity log** gains an email row "An email has been sent: Request
  For Author Response To Reviewer Feedback" per send, and no row for the
  response, its edit or its deletion (*Submission activity log & notes*).
  <sup>p</sup>
- **A flag for the article page.** When every review of the round was
  conducted with its comments publicly visible ("Publicly Show Reviewer
  Comments", *Review setup & review forms*), the response is marked as
  public for the article page's display of the peer reviews (*Article
  landing page & reading*); nothing on the workflow screen shows the flag.
  <sup>q</sup>

## Settings that modify behavior

- **"Minimum Confirmed Reviews Required"** (Settings › Workflow › Review,
  "Setup"; *Review setup & review forms*): 0 on a fresh install and on the
  seeded journal, so a round is ready only when every reviewer has
  submitted; above 0, as soon as that many reviews stand "Complete"
  (Rule 3).
- **"Notify All Authors"** (Settings › Workflow › Emails, under "Editorial
  Decisions"; *Emails management*): the default, "Send an email
  notification to all authors of the submission.", copies the request to
  every other contributor who has an email address (Rule 13, Side
  effects); the other choice sends the request to the assigned authors
  only.

## Cross-feature interactions

- **Review stage & rounds** owns the round, its status sentences (Rule 6
  reads two of them), the author view this card sits in, and the
  "Notifications" list where the request email is re-read.
- **Reviewer assignment & management** owns the Reviewers panel whose row
  statuses define "ready" (Rule 3) and the "Mark as Complete" that counts
  under "Minimum Confirmed Reviews Required".
- **Reviewer's review** owns the wizard that produces the completed reviews
  the email quotes (Rule 5); the scenarios here start from reviews already
  in.
- **Review setup & review forms** owns "Minimum Confirmed Reviews
  Required", "Publicly Show Reviewer Comments", the review type and review
  forms; this spec states only their effect on Rules 3 and 5.
- **Editorial decision recording** owns the Request Revisions and Accept
  Submission decisions and their emails; this spec keeps one line: the
  revisions email, and the "Notify Authors" message it is written in, carry
  the "Submit Author Response" button (Rule 6).
- **Workflow screen & stage access** owns the stage-set gate behind the
  Actors table and the deep link the email uses (Rule 7).
- **Stage participants** owns who is an assigned author (Rule 13).
- **Contributors & affiliations** owns the Contributors list the "Authors"
  boxes are drawn from.
- **Emails management** owns the "Request Author Review Response" and
  "Notify Other Authors" templates.
- **Submission activity log & notes** owns the log, where this feature
  leaves only the request email's row "An email has been sent: Request For
  Author Response To Reviewer Feedback" (Side effects); the response's
  submit, edit and delete write nothing there.
- **Languages & locales** owns why a text the French translation lacks
  shows as a raw code (Rule 15).
- **Article landing page & reading** owns the public display of open
  reviews and the response flagged in Side effects.

## Canonical scenarios

Scenarios 1 to 4, 6 and 8 run on the seeded journal with ready accounts
and scratch submissions; scenario 5, which raises "Minimum Confirmed
Reviews Required" and conducts its reviews openly, runs on a scratch
journal configured for both, with throwaway accounts; the press and
preprint-server absence, scenario 7, runs on the seeded press and preprint
server with ready accounts. A review that is "in" is a completed
review the scenario starts from. Each email is read in the mailbox of the
address it was sent to. Accounts, passwords and the tooling recipe are in
the footnote. <sup>s</sup>

1. **From "Awaiting reviews" to a sent request**

   Given: Editor, with two submissions in review, the first with one
   Reviewer who accepted the request and has not reviewed, the second with
   its one review in, recommending "Revisions Required" with the comment
   "The method needs a control group.", beside a second Reviewer whose
   request was declined.

   - **"Awaiting reviews"**: open the first submission's review stage.
     After the Reviewers panel the table "Author Response" lists one row,
     the Author, whose "Response Status" reads "Awaiting reviews", and
     "Request Response" is greyed.
   - **"Ready to invite author"**: open the second submission's review
     stage: the row reads "Ready to invite author" over "Editor can now
     request the author's response." and "Request Response" is enabled.
   - **The request page**: press it: the page "Request Author Response"
     opens with the Author as the one chip in "To" and no box to add
     anyone, "Subject" reading "Request For Author Response To Reviewer
     Feedback", and "Message" holding the "Submit Author Response" button,
     "The following comments were received from reviewers.", "Reviewer
     1:", "Recommendation: Revisions Required" and "The method needs a
     control group.".
   - **"Cancel"**: press "Cancel": the workflow screen shows the round
     again and no request reaches the Author's mailbox.
   - **"Submit Request"**: press "Request Response" again, then "Submit
     Request": the dialog "Request for review response sent" opens, and
     its link "View Submission Summary" returns to the round, where the
     row still reads "Ready to invite author" and "Request Response" is
     still enabled ⚠ [A1](#a1).
   - **The email**: in the Author's mailbox the email "Request For Author
     Response To Reviewer Feedback" opens "Hello {author name},", says
     "All peer reviews for your submission titled "{submission title}"
     have now been completed.", shows the "Submit Author Response" button,
     then the same reviewer block, and closes with "Kind regards," over
     the Editor's name.
   - **The declined request contributes nothing**: the row read "Ready to
     invite author" although the second Reviewer's request was declined,
     and the email holds one reviewer block, none for the declined
     request.
   - **The author's view**: Author: open the second submission's review
     stage from My Submissions: the "Notifications" list holds one row for
     that email, and the stage ends with the card "Author Response"
     reading "Respond to Reviews" with "Submit Response".
   - **Control**: the first submission's review stage shows the Author no
     "Author Response" card.

2. **The author responds from the email**

   Given: Author, signed out, with scenario 1's request sent and its email
   in their mailbox.

   - **The email's button while signed out**: press "Submit Author
     Response" in the email. The Login page shows; sign in: My Submissions
     opens with the submission's workflow on the review stage, the round
     selected, and the window "Submit Your Response to Reviewer Feedback"
     already open, its intro opening "All reviews for your submission have
     been completed.".
   - **"Cancel" and a reload**: press "Cancel": the window closes and the
     screen stays on the round; reload the page: no window opens, and the
     card "Author Response" reads "Respond to Reviews" with "Submit
     Response".
   - **Writing the response**: press "Submit Response": the window opens
     again with "Submit Response" greyed. Type "We added a control group."
     in the one "Author Response" box: still greyed. Under "Authors" ("Author
     contributors who this response is being submitted on behalf of.")
     tick the one box, the Author's own name: "Submit Response" is
     enabled. Press it: the window closes with no message and the card
     reads "A response was submitted by {name}", {name} being the Author,
     with "View Submitted Response".
   - **Re-reading**: press "View Submitted Response": the window opens with
     the intro "A review response has been submitted and is displayed
     below. This response cannot be edited by authors. If you would like
     any changes, please contact the assigned editor.", the text and the
     tick shown; type "More." after the text and untick the box: "Submit
     Response" stays greyed; press "Cancel".
   - **The editor's side**: Editor: open the round: the Author's row reads
     "A response was submitted by {name}" and ends in a "More Actions"
     button ("…"), and the header's "Tasks" panel reads "No Items".
   - **Control**: the Editor's mailbox holds no email about the response
     and the submission's dashboard row is unchanged ⚠ [A2](#a2).

3. **The editor edits, deletes, and the author answers again**

   Given: Journal Manager, with scenario 2's response on the round.

   - **"View" and "Save"**: open the round and press "…" › "View" on the
     Author's row. The window "Author Response to Reviews" opens with the
     note "The following response was submitted by the author, {name}.
     Editors may review the response and make edits if necessary.", the
     text and the ticked box, and the buttons "Save" and "Cancel". Untick
     the box: "Save" greys; tick it again, replace the text with "We added
     a control group and a power analysis." and press "Save": the window
     closes with no message.
   - **The author's re-read**: Author: on the round press "View Submitted
     Response": the window shows "We added a control group and a power
     analysis." and the card still reads "A response was submitted by
     {name}", the Author's own name.
   - **"Delete"**: Journal Manager: press "…" › "Delete" (in red): the
     dialog "Delete" / "Are you sure you wish to delete this item? This
     action cannot be undone." opens with "OK" (in red) and "Cancel".
     Press "Cancel", then "…" › "Delete" › "OK": within a few seconds the
     row reads "Ready to invite author", its "…" is gone and "Request
     Response" is enabled.
   - **A second response without a new request**: Author: the card reads
     "Respond to Reviews" with "Submit Response", with no new request in
     the mailbox or the "Notifications" list; press it, type "We have
     reworked the analysis." in "Author Response", tick the box and press
     "Submit Response": the card reads "A response was submitted by
     {name}" again.
   - **The editor's table and the activity log**: Journal Manager: the row
     reads "A response was submitted by {name}" with its "…" back, and the
     submission's activity log holds one row "An email has been sent:
     Request For Author Response To Reviewer Feedback" and no row for the
     response, its edit, its deletion or the second response.
   - **Control**: "Cancel" in the "Delete" dialog left the row reading "A
     response was submitted by {name}" with its "…" in place.

4. **Revisions requested: the card without a request, and the co-author's
   response**

   Given: Author and a second assigned author (a co-author with an account
   who is not on the Contributors list), with a submission whose round has
   its one review in and a Request Revisions decision recorded, its
   decision email in the Author's mailbox, and no request sent.

   - **The decision email's button**: Author: in the mailbox the email
     "Your submission has been reviewed and we encourage you to submit
     revisions" carries "Submit Author Response"; press it: My Submissions
     opens with the submission's workflow on the review stage, the round
     selected, and the window "Submit Your Response to Reviewer Feedback"
     already open; press "Cancel": the window closes, the screen stays on
     the round, and the card "Author Response" reads "Respond to Reviews"
     with "Submit Response".
   - **The card without a request**: the co-author opens the review stage
     from My Submissions. The status box reads "Revisions have been
     requested." and the stage ends with the card "Author Response"
     reading "Respond to Reviews" with "Submit Response".
   - **The co-author's response**: press it: under "Authors" the only box
     is the Author's name, the co-author having none; type "We will add
     the control group." in the "Author Response" box, tick the box and press
     "Submit Response": the card reads "A response was submitted by
     {name}", {name} being the co-author.
   - **The Author's view**: Author: open the same round: the card reads "A
     response was submitted by {name}" with "View Submitted Response" only
     and no "Submit Response".
   - **The editor's two rows**: Journal Manager: open the round: the
     "Author Response" table has two rows, the Author and the co-author,
     both reading "A response was submitted by {name}" and each ending in
     "…"; "View" on the co-author's row opens "Author Response to Reviews"
     with the note naming the co-author.
   - **Control**: on the Author's row "View" and "Delete" are greyed, on
     the co-author's row both are enabled.

5. **One confirmed review is enough when the minimum says so**

   Given: Journal Manager, on a scratch journal with "Minimum Confirmed
   Reviews Required" set to 1 whose reviews are conducted openly, and a
   submission in review with two Reviewers, the first's review in
   recommending "Revisions Required" with the comment "Shorten the
   introduction." and the second's request accepted.

   - **Before "Mark as Complete"**: open the round. The "Author Response"
     row reads "Awaiting reviews" and "Request Response" is greyed.
   - **"Mark as Complete"**: in the Reviewers panel open the first
     reviewer's "Read Review", press "Mark as Complete" and confirm with
     "Mark as Complete" in the dialog "Mark this review as complete?": the
     row now reads "Ready to invite author" and "Request Response" is
     enabled while the second review is still due.
   - **The email**: press "Request Response", then "Submit Request", and
     read the email in the Author's mailbox: it opens "All peer reviews
     for your submission titled "{submission title}" have now been
     completed." ⚠ [A6](#a6) and holds one reviewer block, "Recommendation:
     Revisions Required" and "Shorten the introduction.".
   - **The open review's heading**: the block is headed with the first
     Reviewer's name alone, in place of "Reviewer 1:", the review having
     been conducted openly.
   - **Control**: the email holds no second reviewer block; the review
     still due contributes nothing.

6. **Who may request**

   Given: Section Editor and Funding Coordinator assigned to the review
   stage, Author, a co-author with an account assigned to the review
   stage, and Journal Manager, with a ready round (its one review in) on a
   submission in the Section Editor's section.

   - **Section Editor**: open the round: the "Author Response" table reads
     "Ready to invite author" and "Request Response" is enabled; press it:
     the page "Request Author Response" opens, its address holding the
     round id (Rule 14); press "Cancel": the round shows again.
   - **The request to both assigned authors**: the table lists two rows,
     the Author and the co-author, both reading "Ready to invite author";
     press "Request Response" again: "To" holds two chips, the Author and
     the co-author, with no box to add anyone; press "Submit Request": the
     Author's mailbox and the co-author's hold the same email, "Request
     For Author Response To Reviewer Feedback", whose greeting "Hello"
     names both, in either order.
   - **Funding Coordinator**: open the round: the same table with "Request
     Response" enabled; press it: the access-denied page "The current role
     does not have access to this operation." shows instead of the request
     page ⚠ [A3](#a3).
   - **Author, by the typed address**: type the Rule 14 address with
     that round id: the access-denied page "The current role does not
     have access to this operation." shows and the review stage does not.
   - **A round id that does not exist**: Journal Manager: type the
     address with 99999 as the round id: the access-denied page reads
     "Invalid review round.".
   - **Control**: the Journal Manager typing the address with the round's
     own id gets the "Request Author Response" page (reached this way
     it has nowhere to return to ⚠ [A4](#a4)).

7. **A press and a preprint server** {OMP OPS}

   Given: Press Editor and press Author, with a monograph in External
   Review whose one review is in, revisions requested and the decision
   email in the press Author's mailbox; Preprint Server Manager, Moderator
   and preprint Author, with a submitted preprint.

   - **Press Editor**: open the monograph's External Review stage: no
     "Author Response" table follows the Reviewers panel.
   - **Press Author, from the decision email**: in the mailbox the email
     "Your submission has been reviewed and we encourage you to submit
     revisions" carries "Submit Author Response"; press it: the
     monograph's External Review stage opens reading "Revisions have been
     requested." with no "Author Response" card and no window
     ⚠ [OMP1](#omp1).
   - **Preprint Server Manager**: open the preprint's Production stage: no
     "Author Response" table; type the preprint's Rule 14 address (stage
     3, round id 1): the access-denied page "A workflow stage was not
     specified.".
   - **Moderator**: the same address shows the same page.
   - **Preprint Author**: the same address shows "The current role does
     not have access to this operation.".
   - **Control**: the Press Editor typing the monograph round's address
     (Rule 14) gets the "Request Author Response" page with the press
     Author in "To"; the absence is the workflow screen's alone.

8. **A past round's response beside an empty new round**

   Given: Editor and Author, with a submission in its second review
   round, round 1's one review in and round 2's one Reviewer having
   accepted the request and not reviewed.

   - **The new round**: open the review stage and choose round 2 in the
     workflow menu: the "Author Response" row reads "Awaiting reviews" and
     "Request Response" is greyed.
   - **The past round's request**: choose round 1 in the workflow menu:
     the row reads "Ready to invite author" and "Request Response" is
     enabled; press it, then "Submit Request": the dialog "Request for
     review response sent" opens, and its link "View Submission Summary"
     returns to round 1.
   - **The author's past round**: Author: open the review stage from My
     Submissions and choose round 1 in the workflow menu: the status box
     reads "The submission has been advanced to the next round of review"
     and the stage ends with the card "Author Response" reading "Respond
     to Reviews" with "Submit Response"; press it, type "We answered the
     first round's reviews." in the "Author Response" box, tick the one box and
     press "Submit Response": the card reads "A response was submitted by
     {name}", {name} being the Author.
   - **The editor's two rounds**: Editor: choose round 1 in the workflow
     menu: the row reads "A response was submitted by {name}" and "…" ›
     "View" opens "Author Response to Reviews" showing "We answered the
     first round's reviews."; choose round 2: the row still reads
     "Awaiting reviews" with no "…" and "Request Response" greyed.
   - **Control**: Author: choose round 2 in the workflow menu: the stage
     ends with no "Author Response" card; the request and the response
     belong to round 1 alone.

## Coverage

Left out of the scenarios above, by reason:

- **Planned**:
  - the guard for A1 (issue report
    `docs/issues/U30-A1-author-response-request-leaves-no-trace.md`):
    after "Submit Request" the editor's "Author Response" row reads
    "Response requested", for a second editor of the submission too
  - the guard for A3 (issue report `docs/issues/U30-A3-funding-coordinat
    or-author-response-refused.md`): an assigned Funding coordinator
    sees no "Request Response" and no "Delete" on the "Author Response"
    table, and "View" opens the response read-only
  - the guard for A4 (issue report `docs/issues/U30-A4-request-author-re
    sponse-typed-address-returns-nowhere.md`): the "Request Author
    Response" page opened by its address, without a return address, then
    "Cancel", the sent dialog's link and Escape each open the submission
  - the guard for A5 (issue report `docs/issues/U30-A5-request-author-re
    sponse-empty-field-generic-error.md`): an emptied "Subject", then an
    emptied "Message", at "Submit Request" shows "This field is
    required." under the field and no "Error" dialog
- **Nothing new to test**:
  - Site Administrator (the Journal Manager's offer, scenarios 1 and 3)
  - Guest Editor (the Section Editor's gate, scenario 6)
  - Reviewer, Reader, and a Section Editor or Guest Editor not assigned to the submission, by the request page's typed address (the Author's access-denied page, scenario 6)
  - the typed address on a preprint server with the preprint's own stage (scenario 7's page)
  - Press Editor on Internal Review (External Review's absence, scenario 7)
  - no reviewer on the round (the "Awaiting reviews" cell of scenario 1)
  - the accepted round's card without a request (scenario 4's card under another status sentence)
  - a review form on the assignment (the email's form block is the one *Reviewer's review* documents)
- **Register carries it**:
  - A3 (the Funding Coordinator's "View" window and refused "Delete")
  - A4 (the request page by typed address on a round that is not ready or holds a response)
  - A5 (an emptied "Subject" or "Message" at "Submit Request")
  - A7 (revisions uploaded before responding)
  - A8 (a cancelled request beside a completed review)
  - A9 (the table, the card, both windows and the request page with the
    interface in French; Rule 15)
- **No seed**:
  - "Notify All Authors" at its default, the copy to other contributors (needs a contributor with an email and no account)
  - "Notify All Authors" off (no scenario key)
- **Owned by another feature**:
  - the "Request Author Review Response" template (*Emails management*)
  - "Publicly Show Reviewer Comments" (*Article landing page & reading*)
  - a second form language's two "Author Response" boxes (*Languages & locales*)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-06), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|------------------------------|------|--------|--------|
| [A1](#a1) | Editors' "Author Response" table still reads "Ready to invite author" after the request was sent | 🐞 | medium | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | A Funding coordinator is offered "Request Response" and "Delete" on "Author Response", then refused | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A4](#a4) | "Request Author Response" page opened by its address: "Cancel" and the sent dialog lead to "404 Not Found" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A5](#a5) | "Request Author Response" refuses an empty subject or message with "An unexpected error has occurred" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A7](#a7) | The decision email's "Submit Author Response" leads nowhere once revisions are uploaded | 🐞 | user-visible | — |
| [A9](#a9) | In French the "Author Response" table, the author's card, both windows and the request page show raw codes such as "##submission.reviewRound.authorResponse##" | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [OMP1](#omp1) | A press author's decision email offers "Submit Author Response" that leads to nothing | 🐞 | user-visible | — |
| [A2](#a2) | Nobody is told when the author's response arrives | ❓ | user-visible | — |
| [A6](#a6) | Under a minimum, the request email says every review is in while one is still due | ❓ | minor | — |
| [A8](#a8) | A cancelled reviewer's effect on readiness and on the email was not seen | ❓ | minor | — |

### All apps

<a id="a1"></a>
**A1 — Editors' "Author Response" table still reads "Ready to invite author" after the request was sent** · 🐞 · medium.
After an editor sends the author a request for a response to the
reviews ("Request Response", then "Submit Request"), the round's
"Author Response" table still reads "Ready to invite author" / "Editor
can now request the author's response.", and "Request Response" stays
enabled. Nothing on the round shows that the author was asked.

So another editor of the submission, or the same one later, reads the
round as never asked and sends the request again. Each send emails the
author once more.

It holds on every review round from the first request until the author
responds, on any journal whose editors use "Request Response"; no
setting turns the feature on or off.
Since: 2026-01-23 (pkp/ui-library#767) · Basis: probe, 2026-10-04. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — Nobody is told when the response arrives** · ❓ · user-visible. The
editor asks by email and is expected to notice the answer; the app sends no
email, raises no task and shows no notification when the author submits,
edits and deletions are not announced either, and the submissions
dashboard row does not change. The editor learns of the response only by
opening the round. Question: should a submitted response notify the
assigned editors (a task, an email, or a dashboard indicator)? Lean: yes,
at least an email, because the other author actions the editor waits for
do announce themselves: a discussion the author starts raises a task and
an email, and an uploaded revision the email "Revised Version Uploaded".
Basis: probe. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — A Funding coordinator is offered "Request Response" and "Delete" on "Author Response", then refused** · 🐞 · low.
A Funding coordinator assigned to a submission sees the review
round's "Author Response" table with the same controls as an editor.
"Request Response" is enabled once the reviews are in, and once the
author has responded the row's menu offers "View" and "Delete". The
app refuses both actions. "Request Response" leads to a page reading
"The current role does not have access to this operation.". "Delete"
› "OK" ends in the dialog "Error" with that same sentence, and the
response stays.

"View" is part of the same fault. It opens the editors' window
"Author Response to Reviews" with editable fields and, where an editor
has "Save", the author's greyed "Submit Response", a button no
non-author can use.

The fix makes the controls follow the role the server checks. The
coordinator keeps "View", which then shows the response to read.
Since: 2026-01-23 (pkp/ui-library#767) · Basis: probe, 2026-10-04. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Request Author Response" page opened by its address: "Cancel" and the sent dialog lead to "404 Not Found"** · 🐞 · low.
An editor who opens the "Request Author Response" page by its address,
rather than through "Request Response" on the round, has nowhere to go
back to. "Cancel" lands on a page reading only "404 Not Found".
"Submit Request" sends the email, but the sent dialog's only control,
"View Submission", is plain text that does nothing, and closing the
dialog with Escape lands on the same "404 Not Found" page.

The request still goes out, and the editor finds the way back by hand.

Nothing in the app links to the page without the return address, so a
journal editor meets this only from a bookmark or a copied address. A
press has no way to the page from its screens at all, so there too only
someone who has the address reaches it, which is rare. The fix lets the
page fall back to the submission's address it already receives.
Since: 2026-01-23 (pkp/ui-library#767) · Basis: probe, 2026-10-04. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — "Request Author Response" refuses an empty subject or message with "An unexpected error has occurred"** · 🐞 · low.
An editor who clears "Subject" or "Message" on the "Request Author
Response" page and presses "Submit Request" gets a dialog headed
"Error": "An unexpected error has occurred. Please reload the page and
try again." Nothing under either field says that it is required.

The editor who sees which field is empty can fill it in and send. On a
journal the page opens from "Request Response" on a review round; a
press shows no "Author Response" table, so there the page is reached
only by its address.
Since: 2026-01-23 (pkp/ui-library#767) · Basis: probe, 2026-10-04. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — Under a minimum, the email says every review is in** · ❓ · minor.
With "Minimum Confirmed Reviews Required" at 1 and a second review still
due, the request email opens "All peer reviews for your submission titled
"{submission title}" have now been completed." and quotes the one confirmed
review, so the author is told the reviews are over while one is
outstanding. Question: should the template say only that the required
reviews are in when a minimum made the round ready? Lean: yes; the
sentence misstates the round, and the outstanding review's comments will
reach the author later, if at all, through a further request. Basis:
probe. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — The decision email's "Submit Author Response" leads nowhere once revisions are uploaded** · 🐞 · user-visible.
An author asked for revisions
gets the email's "Submit Author Response" and the "Author Response" card on
the round, but if they upload their revised file first, the card disappears
with the round's new status "Revisions have been submitted and a decision
is needed.", and the email's button then opens the round with no card and
no window, so the response the email asked for cannot be written. The
editor's table meanwhile reads "Ready to invite author" with "Request
Response" enabled, so only a fresh request brings the card back (sending
that request was not tried). Basis: probe. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — A cancelled reviewer's effect was not seen** · ❓ · minor. Rule 3
counts a cancelled request like a declined one, so a round with one
completed review and one cancelled request should read "Ready to invite
author", and Rule 5 leaves the cancelled reviewer out of the email; neither
was seen on a screen. Question: does "Cancel Reviewer" on the accepted
request of such a round leave the cell at "Ready to invite author" and the
request page with one reviewer block? Lean: yes; the app drops a cancelled
request wherever it drops a declined one. Basis: code. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — In French the Author Response screens show raw codes** · 🐞 · low.
With the interface in French (Canada), the Journal Manager and the Author
read raw codes where French words belong on every screen of this feature:
- **the "Author Response" table**: the heading, which is also the name a
  screen reader gives the table, "##submission.reviewRound.authorResponse##";
  the line under it
  "##editor.submission.reviewRound.RequestAuthorResponse.description##";
  the button "##editor.submission.reviewRound.RequestResponse##"; the
  column heading "##editor.submission.reviewRound.responseStatus##"; on a
  ready round the cell
  "##editor.submission.reviewRound.authorResponse.readyToInvite##" (shown
  with capitals, like the English cell) over
  "##editor.submission.reviewRound.authorResponse.editorCanRequest##";
  once a response exists the cell
  "##editor.submission.reviewRound.responseWasSubmitted##", so the editor
  no longer sees who submitted it, and a screen reader hears
  "##common.moreActions##" as the name of each row's "…" button. "Awaiting
  reviews" reads "En attente d'évaluations", the other column headings
  "Auteur-e" and "Actions", and the row menu "Afficher" and "Supprimer";
- **the editor's "View" window**: the title
  "##submission.reviewRound.authorResponseToReviews##", the note
  "##submission.reviewRound.authorResponse.noteForEditor##", the field
  "##submission.reviewRound.authorResponse##" and the "Authors"
  description "##submission.reviewRound.associatedAuthors.description##",
  above French "Annuler" and "Enregistrer". The "Delete" dialog reads
  French throughout ("Supprimer" / "Êtes-vous certain-e de vouloir
  supprimer cet élément ? Cette opération est irréversible." / "OK" /
  "Annuler");
- **the author's card**: the heading
  "##submission.reviewRound.authorResponse##", then
  "##submission.reviewRound.respondToReviews##" with the button
  "##submission.reviewRound.authorReviewResponse.submit##"; once a
  response exists "##editor.submission.reviewRound.responseWasSubmitted##"
  with the button
  "##submission.reviewRound.authorReviewResponse.viewSubmittedResponse##";
- **the author's window**: the title
  "##submission.reviewRound.submitYourResponse##"; the intro
  "##submission.reviewRound.authorResponse.note##", or, on re-reading a
  submitted response, "##submission.reviewRound.authorResponse.authorCannotEdit##";
  the field "##submission.reviewRound.authorResponse##"; the "Authors"
  description "##submission.reviewRound.associatedAuthors.description##";
  and the submit button
  "##submission.reviewRound.authorReviewResponse.submit##". "Auteurs-es",
  "* Obligatoire" and "Annuler" read French;
- **the "Request Author Response" page**: the heading, repeated as the
  breadcrumb's last item,
  "##editor.submission.reviewRound.requestAuthorResponse##"; the line under
  it "##editor.submission.reviewRound.aboutToRequestAuthorReviewResponse##";
  "##emails.modifyEmailSharedWithUser##" (shown in capitals);
  "##discussion.form.templatesLabel##" beside the French "Trouver un
  modèle de courriel" box; and the button
  "##editor.submission.reviewRound.authorReviewResponse.submitRequest##".
  The sent dialog reads
  "##editor.submission.reviewRound.authorReviewResponseRequestSent##" /
  "##editor.submission.reviewRound.authorReviewResponseRequestSent.description##"
  above French "Voir le résumé de la soumission".

The email the page prefills and sends reads English, subject and body:
the French translation has no text for the "Request Author Review
Response" template. Expected: French throughout, as the rest of the stage
reads. A French-speaking editor has to guess what the table, its button
and the request page are for, and the author what the card and the window
ask of them. Requesting, responding and reading still work: the response
is saved, the card and the table read it at once and after a reload, and
the cell after a request stays at its ready code as in English
[A1](#a1). The English screens show none of these codes. The workflow
screen's menu and heading around the stage are
[→ Workflow screen & stage access A11](U24-workflow-screen-and-stage-access.md#a11)'s
finding, the discussions panel on the same stage is
[→ Tasks & discussions A15](U37-tasks-and-discussions.md#a15)'s, and why a
missing French text shows as a code at all is the question
[→ Languages & locales A4](U57-languages-and-locales.md#a4) asks.
On `main` these codes and the English email are texts new with the
author response feature, which 3.5 does not have, and they await their
French; the "…" button's "##common.moreActions##", which French (Canada)
lacks on 3.5 too, is reported.
Basis: probe, 2026-10-04. <sup>f-a9</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The press's decision email offers a response with nowhere to go** · 🐞 · user-visible.
A press author asked for revisions receives the
"Submit Author Response" button in the decision email, like a journal
author (the editor sees it in the "Notify Authors" message before
recording). Pressing it opens the monograph's External Review stage, which
reads "Revisions have been requested." and shows "Revisions Uploaded" and
the "Notifications" list, but no "Author Response" card and no window, so
the author cannot do what the email asked. Neither review stage shows the
editor's "Author Response" table, so no request can be sent from a screen;
the "Request Author Response" page still opens by its address (Rule 14),
sends the request email (its reviewer block reading "Recommendation:" with
nothing after it, since a press collects none) and shows the sent dialog,
and that email's button lands the author on the same empty stage. Since: 2026-07-31
(seen on a press while the review stage was probed) · Basis: probe.
<sup>f-omp1</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

<a id="fn-a"></a>
**a** — Roles. The request page `PKP\pages\reviewResponse\ReviewResponseHandler::__construct()` assigns `requestAuthorResponse` to `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUB_EDITOR` and adds `SubmissionAccessPolicy`, `ReviewStageAccessPolicy` (the `stageId` query parameter) and `ReviewRoundRequiredPolicy`. The API `PKP\API\v1\reviews\PKPReviewController::getGroupRoutes()` gates `POST …/authorResponse/requestResponse`, `PUT …/authorResponse/{responseId}` and `DELETE …/authorResponse/{responseId}` on the same three roles and `POST …/authorResponse/` on `ROLE_ID_AUTHOR`; `authorize()` adds `SubmissionAccessPolicy`. Form requests: `AddResponse::passedValidation()` requires a `StageAssignment` with `ROLE_ID_AUTHOR` on the round's stage, no existing `AuthorResponse` for the round (409 otherwise) and the round in `REVIEW_ROUND_STATUS_REVISIONS_REQUESTED` / `REVIEW_ROUND_STATUS_ACCEPTED` or `isAuthorResponseRequested`; `EditResponse::passedValidation()` requires an assigned `ROLE_ID_SUB_EDITOR`, or the manager role in the context, or site admin. The "editorial roles" of the Actors table are the union of those three gates. Absence on OMP and OPS: `workflowConfigEditorialOMP.js` / `workflowConfigAuthorOMP.js` and the OPS pair (`lib/ui-library/src/pages/workflow/composables/useWorkflowConfig/`) never push `AuthorResponseRequestManager` or `AuthorResponseManager`, and `WorkflowPageOMP.vue` / `WorkflowPageOPS.vue` do not import them; only `WorkflowPageOJS.vue` and the OJS configs do. `api/v1/reviews/index.php` exists in OJS and OMP, not in OPS. Live-probed 2026-09-06 (Actors rows 1–2, 8; the absence paragraph): `sectioneditor.ana` and `admin` see the table and open the page; `assistant.rita` (Funding Coordinator) is sent to `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied` from the button; on OMP neither `workflow_3_{round}` (External Review) nor `workflow_2_{round}` (Internal Review) renders the table for `editor.diana`, while the typed page renders and `POST …/requestResponse` answers 200; on OPS the typed address redirects to `user/authorizationDenied?message=user.authorization.workflowStageRequired` for `manager.maya` and `sectioneditor.ana` (Moderator) and `…roleBasedAccessDenied` for `author.alex`, never a 404. With the preprint's own stage in the address (`stageId=5`) the Preprint Server Manager lands on `…invalidReviewRound` ("Invalid review round."); an Editorial Board Member and a Reader get the Author's page, "The current role does not have access to this operation." (scratch server, 2026-09-06).

<a id="fn-b"></a>
**b** — The response form is `lib/ui-library/src/managers/ReviewRoundResponseManager/useAuthorResponseForm.js`: `addFieldRichTextArea('authorResponse', {toolbar: 'bold italic underline bullist', isRequired: true, isMultilingual: true, label: submission.reviewRound.authorResponse})` and `addFieldOptions('associatedAuthorIds', 'checkbox', {options: authorOptions (the publication's authors), label: submission.authors, description: submission.reviewRound.associatedAuthors.description, isRequired: true})`; `setCanSubmit(canUserSubmitForm)` where `canUserSubmitForm` needs both `hasFormResponseValue` and `hasFormAuthorsValue`, plus (author) no existing response or (editor) an existing one. `isEditor` is `hasCurrentUserAtLeastOneAssignedRoleInStage(submission, stageId, [SUB_EDITOR, MANAGER, SITE_ADMIN])`, which is why an assigned Funding Coordinator (`ROLE_ID_ASSISTANT`) opens the window with "Save" greyed. Server side `ReviewRoundAuthorResponseCommonValidator::commonRules()` requires `authorResponse` (array) and `associatedAuthorIds` (array) and `commonAfter()` checks every id against the publication's authors (the round's `publicationId`, else the current publication). Live-probed 2026-09-06 (Fields rows 6–7): the button greys and enables with the text and the tick in every combination; `author.bea`, assigned on the stage but not a contributor, has no box, while a contributor added on the Contributors list without an account does; one editor box on the seeded journal (one form language).

<a id="fn-c"></a>
**c** — `workflowConfigEditorialOJS.js`, `[WORKFLOW_STAGE_ID_EXTERNAL_REVIEW].getPrimaryItems()`: `FileManager` (revisions), `FileManager` (review files), `ReviewerManager`, `AuthorResponseRequestManager` (props `submission`, `reviewRoundId`, `reviewRound`, `contextMinReviewsPerSubmission`, `stageId`), `DiscussionManager`, unconditionally. `workflowConfigAuthorOJS.js`, same stage: `WorkflowListingEmails`, `ReviewerManager` (when open/completed assignments exist), `FileManager`, `DiscussionManager`, then `AuthorResponseManager` only when `selectedReviewRound?.isAuthorResponseRequested` or `statusId ∈ {REVIEW_ROUND_STATUS_ACCEPTED, REVIEW_ROUND_STATUS_REVISIONS_REQUESTED}`. Table chrome: `AuthorResponseRequestManager.vue` (`PkpTable` label `submission.reviewRound.authorResponse` "Author Response", description `editor.submission.reviewRound.RequestAuthorResponse.description`); columns from `useReviewRoundAuthorResponseConfig::getColumns()` (`user.role.author` "Author", `editor.submission.reviewRound.responseStatus` "Response Status", and `grid.columns.actions` only when `reviewRound.authorResponse`); rows = participants of the stage whose stage assignment's user group has `roleId === ROLE_ID_AUTHOR` (`AuthorResponseRequestManagerStore::authors`, from `GET submissions/{id}/participants/{stageId}`). Live-probed 2026-09-06 (Rule 1): the table sits after "Reviewers" and before "Review Tasks & Discussions" for every editorial role and the Funding Coordinator; the "Actions" header is `<span class="sr-only">` and the column exists only once a response does (two headers before, three after, read again 2026-09-06); the author's card is an `h4` box after the discussions, absent before any request or decision; reached through the workflow menu from another stage the table first shows "No Items" and fills within seconds.

<a id="fn-d"></a>
**d** — `AuthorResponseRequestManagerCellStatus.vue`: `canRequestReviewRoundAuthorResponse` → `editor.submission.reviewRound.authorResponse.readyToInvite` "Ready to invite author" (CSS `capitalize`, so it may render with capitals) over `…editorCanRequest` "Editor can now request the author's response."; else `reviewHasResponse` → `editor.submission.reviewRound.responseWasSubmitted` "A response was submitted by {$userFullName}" (`authorResponse.submittedByUser.fullName`); else `submission.dashboard.view.awaitingReviews` "Awaiting reviews". The cell reads the store, not the row, so every row is identical. Live-probed 2026-09-06 (Rule 2): all three cells seen, identical on `author.alex`'s and `author.bea`'s rows; the DOM and accessible name read "Ready to invite author" while the rendered text is "Ready To Invite Author" (tests match the DOM string).

<a id="fn-e"></a>
**e** — `AuthorResponseRequestManagerStore::canRequestReviewRoundAuthorResponse`: `!reviewHasResponse && (passesMinimumReviewsCheck || areAllReviewAssignmentsCompleted)`; `areAllReviewAssignmentsCompleted` = the round's `getActiveReviewAssignments()` (statuses not declined/cancelled) is non-empty and every status is in `CompletedReviewAssignmentStatuses` (`RECEIVED`, `COMPLETE`, `THANKED`, `VIEWED`, `useSubmission.js`); `passesMinimumReviewsCheck` = `checkMinimumConsideredReviews()` with `contextMinReviewsPerSubmission` > 0 and at least that many `ConfirmedReviewAssignmentStatuses` (`COMPLETE` only). `AuthorResponseRequestManagerActionButton.vue` binds `:is-disabled="!store.canRequestReviewRoundAuthorResponse"`; nothing reads `isAuthorResponseRequested` on the editorial side (finding A1). Server twin `PKPReviewController::requestAuthorResponse()`: assignments filtered `filterByIsAccepted(true)`, "completed" = `getDateCompleted() !== null`, minimum = `$context->getNumReviewsPerSubmission()` counting completed (not confirmed) reviews — a looser gate than the screen's, reachable only by a typed page (Rule 4a's refusal text `api.reviewRound.422.reviewAssignments`); an existing response answers 409 `api.409.resourceActionConflict`. Live-probed 2026-09-06 (Rule 3; Coverage states rows 1–4): a round with no reviewer and a round with one accepted request both read "Awaiting reviews" with the button `disabled`; a completed review beside a declined request is ready (the cancelled twin was not driven, note f-a8); on a scratch journal with `numReviewsPerSubmission: 1` a "Review Submitted" row is not enough and "Complete" (Read Review › "Mark as Complete" › the dialog "Mark this review as complete?") is.

<a id="fn-f"></a>
**f** — Page: `useReviewRoundAuthorResponseConfig::getTopItems()` → `AuthorResponseRequestManagerStore::navigateToRequestAuthorReviewResponsePage()` → `redirectToPage('reviewResponse/requestAuthorResponse', {stageId, reviewRoundId, submissionId, ret: 'dashboard/editorial?…workflowSubmissionId=…'})`. `ReviewResponseHandler::requestAuthorResponse()` renders `lib/pkp/templates/reviewResponse/requestAuthorResponse.tpl` (`<request-review-round-author-response>`, registered in `lib/pkp/js/load.js`) with `RequestReviewResponsePage::getConfig()`: `recipients` = users with an author stage assignment on `stageId`, `canChangeRecipients: false`, `initialTemplateKey: REQUEST_REVIEW_ROUND_AUTHOR_RESPONSE`, `emailTemplates` = that template plus its alternates, `attachers` = `Upload`, `FileStage` (submission files), `ReviewFiles` (this round's assignments), `Library`; breadcrumb `navigation.dashboard`, the truncated title, `editor.submission.reviewRound.requestAuthorResponse` "Request Author Response". `RequestReviewRoundAuthorResponse.vue`: `RequestResponseHeader` (`…requestAuthorResponse`, `…aboutToRequestAuthorReviewResponse`), heading `emails.modifyEmailSharedWithUser` in `class="uppercase"`, the `Composer` with `email.to` "To", `common.addCCBCC`, `email.subject`, `stageParticipants.notify.message` "Message", `common.attachFiles`; buttons `common.cancel` (warnable; `window.location.href = ret`) and `editor.submission.reviewRound.authorReviewResponse.submitRequest` "Submit Request" → `POST reviews/{submissionId}/{reviewRoundId}/authorResponse/requestResponse` with `{bcc, cc, locale, recipients: [], subject, body, attachments}`; on success `openDialog` `…authorReviewResponseRequestSent` / `…RequestSent.description` (`{$submissionTitle}`), `modalStyle: 'success'`, one action `submission.list.viewSubmissionSummary` "View Submission Summary" when `ret` is present (else `submission.list.viewSubmission` "View Submission" with `href: null`, finding A4), `close: () => window.location = ret`. `RequestAuthorResponse` form request: `subject`, `body`, `locale` required strings; `cc`, `bcc`, `attachments` nullable arrays; attachments validated per kind. Live-probed 2026-09-06 (Rules 4, 4a; Fields rows 1–5): the page as described, browser title "Journal of Public Knowledge", breadcrumb "Dashboard / Author, {title} / Request Author Response"; an emptied subject or message posts and gets 422, shown as `openDialogNetworkError`'s generic "Error" dialog; the not-ready and holds-a-response refusals are the 422 and 409 dialogs quoted in Rule 4a, and a response on the round answers 409 before the not-ready 422, with or without `ret` (2026-09-06); the sent dialog's "View Submission Summary" is an `<a>` to `ret`, and Escape lands on `ret` too. Not driven: a send with CC, BCC or an attachment filled. Seen once, automation-caveated: "Submit Request" is enabled while "Message" still reads "Loading", and a press then gets the "Error" dialog (a 422 with no email).

<a id="fn-g"></a>
**g** — `PKP\mail\mailables\RequestReviewRoundAuthorResponse` (`REQUEST_REVIEW_ROUND_AUTHOR_RESPONSE`, `GROUP_REVIEW`, from `ROLE_ID_SUB_EDITOR` to `ROLE_ID_AUTHOR`, `Configurable`, `supportsTemplates`): built by `AuthorResponseManager::getMailable()` with `getCompletedReviewAssignments()` (`filterByCompleted(true)` on the round). Template `emails.reviewRound.requestAuthorResponse.subject` / `.body` (`lib/pkp/locale/en/emails.po`): greeting `{$recipientName}`, the "Submit Author Response" anchor on `{$reviewRoundAuthorResponseUrl}`, `<hr>`, "The following comments were received from reviewers." and `{$allReviewerComments}`. `PKP\mail\traits\ReviewerComments::setupReviewerCommentsVariable()`: per assignment `<strong>` = reviewer full name when `getReviewMethod() == SUBMISSION_REVIEW_METHOD_OPEN`, else `submission.comments.importPeerReviews.reviewerLetter` "Reviewer {$reviewerLetter}:" (A, B…), then `submission.recommendation` "Recommendation: {$recommendation}", the `SubmissionComment` rows with `getViewable()` (the "For author and editor" text), then `getReviewFormComments()` for elements with `getIncluded()`. Live-probed 2026-09-06 (Rule 5; Coverage settings rows 5–6): the block is `<p><strong>Reviewer 1:</strong><br>Recommendation: Revisions Required</p><p>{comment}</p>` (a digit, on the page, in the email and in the author's "Notifications" window; a round with two anonymous reviews showed "Reviewer 1:" and "Reviewer 2:", once with each review first, 2026-09-06); an open review on a scratch journal (`defaultReviewMode: 'open'`) is headed `<strong>Rowan Openreviewer</strong>` with no colon; a review form (`reviewForms: [{elements: [{included: true}, {included: false}]}]`) gives `<p>Is the method sound?</p><p>Sound.</p>` on the page, while in the sent email the question sits outside any `<p>` with the answer as the paragraph under it, and omits the not-included question; no attachments; on OMP the same block reads "Recommendation:" with nothing after it.

<a id="fn-h"></a>
**h** — `isAuthorResponseRequested` is a review-round setting (`ReviewRoundDAO::getAdditionalFieldNames()`), set true by `PKPReviewController::requestAuthorResponse()` after the send and never cleared; exposed per round by `PKP\submission\maps\Schema::getPropertyReviewRounds()` together with `authorResponse` (`ReviewRoundAuthorResponseResource`). Card `AuthorResponseManager.vue`: heading `submission.reviewRound.authorResponse`, text `editor.submission.reviewRound.responseWasSubmitted` when `reviewRound.authorResponse` else `submission.reviewRound.respondToReviews` "Respond to Reviews", button `…viewSubmittedResponse` "View Submitted Response" / `…authorReviewResponse.submit` "Submit Response". The Request Revisions email: `PKP\mail\mailables\DecisionRequestRevisionsNotifyAuthor` uses `ReviewRoundAuthorResponse::setupReviewAuthorResponseVariable()` and the template `emails.editorDecisionRevisions.body` carries the same "Submit Author Response" anchor. Live-probed 2026-09-06 (Rule 6; Coverage states rows 8–9): the card on a requested round, on a `requestRevisions` round without a request, and on an `accept` round without a request, whose "Status" box reads "The submission is currently in the Copyediting stage." for `author.alex` and `manager.maya` alike; after a delete the card reads "Respond to Reviews" again and a second response is accepted; on the `requestRevisions` round with no request, the card was gone once the author uploaded a revision (status "Revisions have been submitted and a decision is needed."), note f-a7.

<a id="fn-i"></a>
**i** — `PKP\mail\traits\ReviewRoundAuthorResponse::setupReviewAuthorResponseVariable()`: `{$reviewRoundAuthorResponseUrl}` = `dashboard/mySubmissions?workflowSubmissionId={id}&workflowMenuKey=workflow_{stageId}_{reviewRoundId}&reviewResponseAction=respond`. `AuthorResponseManager.vue` watches `isReady` (round, publication and submission loaded) and, when `queryParamsUrl.reviewResponseAction === 'respond'`, calls `openReviewResponseFormModal()`; `cleanQueryParams()` nulls the parameter on success and on close. The `workflowMenuKey` handling is the dashboard's (`dashboardPageStore.js`). Live-probed 2026-09-06 (Rule 7): signed in, the href lands with the window open; "Cancel" drops `reviewResponseAction` from the address and a reload opens the round without the window; signed out, Login shows with `source=` carrying the address and the sign-in lands on the same screen with the window open. Seen once, not re-driven in a fresh session: the href still opened the window after a response existed, in its "cannot be edited" state.

<a id="fn-j"></a>
**j** — `AuthorResponseFormModal.vue`: title `submission.reviewRound.submitYourResponse` when `isAuthor` (`hasCurrentUserAtLeastOneAssignedRoleInStage(…, [ROLE_ID_AUTHOR])`), description `submission.reviewRound.authorResponse.note` (no response) or `…authorCannotEdit` (response exists); submit label `submission.reviewRound.authorReviewResponse.submit` for non-editors, `common.cancel`. Submit `POST reviews/{submissionId}/{reviewRoundId}/authorResponse` → `PKPReviewController::submitAuthorResponse()` (`AuthorResponse::create()` with the current user as `userId`, then `associateAuthorsToResponse()`); `onSuccessFn` triggers `triggerDataChange()` and closes. Live-probed 2026-09-06 (Rules 8, 9; Actors rows 3–5): the intro texts verbatim (the same on an open, form-based round); the re-read window's box is still `contenteditable` and the tick can be removed, with "Submit Response" `disabled` throughout and nothing saved on "Cancel"; `author.bea` sees the flipped card with "View Submitted Response" only.

<a id="fn-k"></a>
**k** — `useReviewRoundAuthorResponseConfig::getAuthorItemActions()`: no actions without a response; with one, `common.view` "View" (`responseView`) and `common.delete` "Delete" (`responseDelete`, warnable), each `disabled: submittingUser.id !== authorUser.id`; rendered by `AuthorResponseRequestManagerCellMoreActions.vue` (`DropdownActions` labelled `common.moreActions` "More Actions", ellipsis). Editor window: title `submission.reviewRound.authorResponseToReviews` "Author Response to Reviews", description `submission.reviewRound.authorResponse.noteForEditor` (`{$userFullName}`), submit label `common.save` when `isEditor`; `PUT reviews/{submissionId}/{reviewRoundId}/authorResponse/{responseId}` → `PKPReviewController::editAuthorResponse()` updates `authorResponse` and re-associates the authors; `userId` (the submitter) is untouched, hence the unchanged name. Live-probed 2026-09-06 (Rule 10; Actors rows 5–6): "More Actions" on both author rows, "View" and "Delete" `aria-disabled` on the non-submitter's, "Delete" styled `text-negative`; the editor's "Save" greys with the box unticked; the saved text is what the author's window then shows; `assistant.rita` gets the same title and note with a `disabled` "Submit Response" and no "Save".

<a id="fn-l"></a>
**l** — `AuthorResponseRequestManagerStore::responseDelete()`: `openDialog({title: common.delete, message: common.confirmDelete, modalStyle: 'negative', actions: [common.ok (warnable) → DELETE reviews/{id}/{roundId}/authorResponse/{responseId}, common.cancel]})`, then `triggerDataChange()`. `PKPReviewController::deleteAuthorResponse()` deletes by round and response id with no further check; `isAuthorResponseRequested` is not touched, so `AddResponse` accepts a new response afterwards. Live-probed 2026-09-06 (Rule 11; Actors row 7): the dialog's "OK" is `text-negative` and precedes "Cancel"; after "OK" the settled read still shows the old cell and the table changes by itself within 15 s (a test polls for "Ready to invite author"); after a reload no row has "…"; the Funding Coordinator's `DELETE` answers 401 and the dialog turns into "Error" / "The current role does not have access to this operation." with the response intact for `manager.maya`.

<a id="fn-m"></a>
**m** — One `AuthorResponse` per round (`AddResponse::passedValidation()` 409 on an existing one; `Schema::getPropertyReviewRounds()` maps `first()` per round). The editorial config pushes `AuthorResponseRequestManager` for whichever round is selected (note c), and `canRequestReviewRoundAuthorResponse` reads that round's assignments, so a past round's button follows Rule 3. Live-probed 2026-09-06 (Rule 12; Coverage states row 15): two rounds seeded as `decisions: ['sendExternalReview']` with two `reviewRounds[]` entries (round 1 completed, round 2 accepted): round 1 ready and requested, its response readable under "View" after "Review Round 1" is chosen in the workflow menu, round 2 "Awaiting reviews" with no card for the author; the author's round 1 status box reads "The submission has been advanced to the next round of review."; an accepted submission's Copyediting and Production stages show nothing of the response.

<a id="fn-n"></a>
**n** — Recipients: `RequestReviewResponsePage::getAssignedAuthors()` and `AuthorResponseManager::getAssignedAuthorIds()` both read `StageAssignment` rows with `ROLE_ID_AUTHOR` on the review stage. `AuthorResponseManager` uses `PKP\decision\types\traits\NotifyAuthors::sendAuthorEmail()`: `Mail::send()` to those users, then, when `$context->getData('notifyAllAuthors')` (`PKPEmailSetupForm`, label `manager.setup.notifyAllAuthors` "Notify All Authors", options `…allAuthors` / `…assignedAuthors`, schema default true), a `DecisionNotifyOtherAuthors` mailable per publication author with an email not among the assigned authors' addresses, body = that template with `{$messageToSubmittingAuthor}` = the editor's body. "Authors" options: `publication.value.authors` from `GET submissions/{id}/publications/{publicationId}` (the round's `publicationId` or the current one). Live-probed 2026-09-06 (Rule 13; Side effects bullet 2; Coverage settings rows 3–4): with `author.bea` assigned, one message with both in the To header and a greeting naming both, in either order across runs; on a scratch journal a contributor added through Publication › Contributors › "Add Contributor" (no account) receives the copy with the request's own subject and the two wrapper sentences quoted in Side effects; the setting lives under "Editorial Decisions" on the Emails tab with the question "Who should receive a notification email when an editorial decision is recorded?", and with the second radio saved the contributor's mailbox stays unchanged on a second send.

<a id="fn-o"></a>
**o** — Address `{journal}/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId={round}&submissionId={id}[&ret=…]` (`lib/pkp/pages/reviewResponse/index.php`). Roles per note a; a role outside the assignment gets the handler's standard access denial; `ReviewRoundRequiredPolicy` returns 404 for an unknown round, and `requestAuthorResponse()` throws `NotFoundHttpException` when the round's submission is not in the current context. `ret` handling per note f. Live-probed 2026-09-06 (Rule 14; Actors row 8): `author.alex`, `reader.rosa`, `reviewer.julia` and `assistant.rita` land on `user/authorizationDenied?message=user.authorization.roleBasedAccessDenied`, and so do an unassigned scratch `sectionEditor` (OJS, OMP) and `guestEditor` (OJS); `reviewRoundId=99999`, or another submission's round id, on `…?message=user.authorization.invalidReviewRound` ("Invalid review round."); `manager.maya` without `ret` gets the page, "Cancel" and Escape go to `reviewResponse/null` ("404 Not Found") and the dialog's `<a class="pkpButton">` has no `href`; each "Submit Request" there sent a real email; the same shape on OMP (`editor.diana`).

<a id="fn-p"></a>
**p** — `NotifyAuthors::sendAuthorEmail()` logs the mailable with `Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::EDITOR_NOTIFY_AUTHOR, …)`, the event type `WorkflowListingEmails.vue` lists (review stage spec note k). No `Notification`, no `EventLog` row and no mailable is created by `submitAuthorResponse()`, `editAuthorResponse()` or `deleteAuthorResponse()`, and none by `requestAuthorResponse()` beyond the email log (grep of `lib/pkp/classes/notification`, `classes/log`, `classes/observers` for `authorResponse`: nothing). Live-probed 2026-09-06 (Side effects bullets 1, 4, 5; A1, A2): the author's "Notifications" list holds one `listitem` per send, each opening the "Notifications" window with the email and its link; "Activity Log & Notes" › History gains "An email has been sent: Request For Author Response To Reviewer Feedback" per send and nothing for the submit, edit, delete or re-submit; "Tasks" reads "No Items" and the dashboard row is unchanged for `editor.diana`; Mailpit counts for `editor.diana` and `sectioneditor.ana` on the title stayed 0 through every author action.

<a id="fn-q"></a>
**q** — `AuthorResponse::isPublic()`: true when the round's non-declined, non-cancelled `review_assignments` rows all have `is_review_publicly_visible` set; surfaced in `ReviewRoundAuthorResponseResource` as `isPublic` and consumed by `lib/ui-library/src/frontend/components/PkpOpenReview/PkpOpenReviewAuthorResponseContent.vue`. `AuthorResponse` also carries a `doiId` whose settings form fields are commented out in `ojs classes/components/forms/context/DoiSetupSettingsForm.php` ("Functionality for author response DOIs exists but is not currently supported"), so no screen sets it. Not probed: no screen in this feature shows either.

<a id="fn-s"></a>
**s** — Scenario tooling. Ready accounts: `editor.diana` (Editor; manager level), `manager.maya` (Journal Manager), `sectioneditor.ana` (Section Editor of "Articles"), `assistant.rita` (Funding Coordinator, review-stage access), `reviewer.julia` and `reviewer.paul` (Reviewers), `author.alex` (submitter) and `author.bea` (co-author with an account, never a contributor); passwords per `docs/process/users.md`. A submission in review: `POST scenarios/submission` `{submitter: 'author.alex', decisions: ['sendExternalReview'], reviewRounds: [{reviewers: [{username: 'reviewer.julia', status: 'accepted'}]}], participants: [{username: 'sectioneditor.ana', role: 'sectionEditor'}]}`. A review that is in: `status: 'completed'`, with the optional `recommendation` (OJS only: `accept` by default, `pendingRevisions` = "Revisions Required") and `comments` (the "For author and editor" text; default "Seeded review comments for {tag}."); the seed runs the reviewer wizard's own steps, so the app's "Review complete…" and "Thank you for your submission…" emails go out and a mailbox count is matched by the submission title. The round id for a typed address comes from the seed response (`reviewRounds[].id`). Scenario 1: two submissions, one `accepted`, one `completed` with `recommendation: 'pendingRevisions', comments: 'The method needs a control group.'` beside `{username: 'reviewer.paul', status: 'declined'}` in the same `reviewers[]`; the seeded journal's review mode is anonymous, so the email's heading reads "Reviewer 1:"; a test waits for the composer (the iframe present and "Loading" gone) before "Submit Request", and reads the sent email by the submission title in `author.alex`'s mailbox. Scenario 2: scenario 1's ready submission after one request; the signed-out click on the email's button is a fresh browser context opening the href; `editor.diana`'s mailbox is counted by the submission title before and after. Scenario 3: scenario 2's state (the request sent and `author.alex`'s response submitted through the window); after "Delete" › "OK" a test polls the table for "Ready to invite author" (note l). Scenario 4: `decisions: ['sendExternalReview']` with the reviewer `completed` and `{username: 'author.bea', role: 'author'}` in `participants`, then the Request Revisions decision recorded by `manager.maya` through the wizard, as scenario 7's press decision is, which sends the decision email the Author's bullet reads in `author.alex`'s mailbox by the submission title (a seeded `requestRevisions` sends none); the co-author opens the round from My Submissions; the co-author is a stage assignment, not a contributor, so the "Authors" boxes show one name. Scenario 5: `POST scenarios/context` with `review: {numReviewsPerSubmission: 1, defaultReviewMode: 'open'}` and `users[]` holding a `manager`, two `externalReviewer`s and an `author`, then a submission with the first reviewer `completed` (`recommendation: 'pendingRevisions', comments: 'Shorten the introduction.'`) and the second `accepted`; a submission seeded after the mode is set carries open as its assignments' review type (seed-facts 2026-09-05), so the email's block is headed with the first reviewer's full name and no colon (note g); a roster reviewer named on a scratch context is assigned but not enrolled (seed-facts 2026-09-05), hence the throwaway reviewers. Scenario 6: scenario 1's ready shape without the declined reviewer (section "Articles", `sectioneditor.ana` assigned) plus `{username: 'assistant.rita', role: 'funding'}` and `{username: 'author.bea', role: 'author'}` in `participants`; the one request email is found in `author.alex`'s and `author.bea`'s mailboxes by the submission title (both addresses sit in its To header, note n); the wrong-round address uses `reviewRoundId=99999`; the Journal Manager's real-round address is opened without `ret`, hence the A4 aside. Scenario 7: OMP `decisions: ['sendExternalReview']` with `reviewRounds: [{stage: 'external', reviewers: [{username: 'reviewer.julia', status: 'completed'}]}]` (no `recommendation` on a press) and the Request Revisions decision recorded by `editor.diana` through the wizard ("Require New Review Round" › "Next", "Notify Authors", "Notify Reviewers", "Record Decision"), which sends the decision email the scenario reads; OPS a plain submitted preprint (OPS refuses `reviewRounds`), with `manager.maya` as Preprint Server Manager, `sectioneditor.ana` as Moderator and `author.alex` as its Author, the address typed with `stageId=3&reviewRoundId=1`. Scenario 8: `decisions: ['sendExternalReview']` with two `reviewRounds[]` entries, `[{reviewers: [{username: 'reviewer.julia', status: 'completed'}]}, {reviewers: [{username: 'reviewer.paul', status: 'accepted'}]}]`: the decision seeds the first entry into round 1 and the entry left over builds round 2 (the shape note m relies on; seed-facts 2026-09-06), so round 1 is the past round and round 2 the current one; the response is written through the window on round 1, never seeded; the request email is read in `author.alex`'s mailbox by the submission title. Emails are read in Mailpit by recipient address (PRINCIPLES A8; the roster mailboxes are shared, so a test matches the submission title in the subject line's body or uses a throwaway author). The request page's address: `…/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId={id}&submissionId={id}` (on a press `stageId=3` is External Review).

<a id="fn-f-a1"></a>
**f-a1** — Note e: neither `AuthorResponseRequestManagerCellStatus.vue` nor `canRequestReviewRoundAuthorResponse` reads `isAuthorResponseRequested`, and `PKPReviewController::requestAuthorResponse()` refuses only when a response exists, so a second `POST …/requestResponse` sends a second email and sets the flag again. The author's config (note c) does read the flag. Live-probed 2026-09-06: three sends on one round, each `POST …/requestResponse` 200, three Mailpit messages, three "Notifications" rows and three "An email has been sent" log rows, the table unchanged throughout.
Issue report: [pkp-e2e#811](https://github.com/jardakotesovec/pkp-e2e/issues/811) ([docs/issues/U30-A1-author-response-request-leaves-no-trace.md](../issues/U30-A1-author-response-request-leaves-no-trace.md)).

<a id="fn-f-a2"></a>
**f-a2** — Note p: `submitAuthorResponse()` creates the row and returns the resource; no `Notification`, `EventLog` or mailable. Compare `PendingRevisionsNotificationManager` for uploaded revisions and the discussion reply notifications, both of which raise a task or email. Live-probed 2026-09-06 (note p): nothing for the editor after a submit, an edit, a delete and a second submit.

<a id="fn-f-a3"></a>
**f-a3** — Notes a, c, k: the editorial config pushes the table for every editorial-view user; the button's `is-disabled` and the row actions' `disabled` depend on readiness and on the submitting user only, never on the viewer's role, while `ReviewResponseHandler` assigns the page to manager, admin and sub-editor and the DELETE route to the same three. Live-probed 2026-09-06 (notes a, k, l): the button leads to `user/authorizationDenied`, the window shows "Submit Response" `disabled` (`isEditor` false for `ROLE_ID_ASSISTANT`), and the `DELETE` answers 401 with the "Error" dialog.
Issue report: [pkp-e2e#812](https://github.com/jardakotesovec/pkp-e2e/issues/812) ([docs/issues/U30-A3-funding-coordinator-author-response-refused.md](../issues/U30-A3-funding-coordinator-author-response-refused.md)).

<a id="fn-f-a4"></a>
**f-a4** — Note f: `getReturnUrlToSubmissionSummary()` returns `null` without `ret`; `cancelResponseRequest()` sets `window.location.href = null` and the dialog's action gets `href: null` with the label `submission.list.viewSubmission`. Live-probed 2026-09-06 (note o): `reviewResponse/null` renders "404 Not Found"; the dialog's anchor has no `href` and a press on it changes nothing; the same on OMP.
Issue report: [pkp-e2e#813](https://github.com/jardakotesovec/pkp-e2e/issues/813) ([docs/issues/U30-A4-request-author-response-typed-address-returns-nowhere.md](../issues/U30-A4-request-author-response-typed-address-returns-nowhere.md)).

<a id="fn-f-a5"></a>
**f-a5** — Note f: `RequestAuthorResponse` refuses a missing `subject` or `body` with 422, and `RequestReviewRoundAuthorResponse.vue` routes every non-2xx answer of "Submit Request" to `openDialogNetworkError` (the generic "Error" dialog) instead of `setErrors` on the composer, so the field-level message never shows. Live-probed 2026-09-06: two 422s, the same dialog both times, the page's content intact after "OK".
Issue report: [pkp-e2e#815](https://github.com/jardakotesovec/pkp-e2e/issues/815) ([docs/issues/U30-A5-request-author-response-empty-field-generic-error.md](../issues/U30-A5-request-author-response-empty-field-generic-error.md)).

<a id="fn-f-a6"></a>
**f-a6** — Note g: `emails.reviewRound.requestAuthorResponse.body` opens with a fixed sentence ("All peer reviews for your submission titled "{$submissionTitle}" have now been completed.") and `getCompletedReviewAssignments()` quotes only the reviews with a `dateCompleted`, so the minimum branch of note e sends the sentence with one block. Live-probed 2026-09-06 on a scratch journal with `numReviewsPerSubmission: 1`, the second reviewer "Request Accepted".

<a id="fn-f-a7"></a>
**f-a7** — Note c: the author's config shows the card only for `isAuthorResponseRequested` or a round in `REVIEW_ROUND_STATUS_REVISIONS_REQUESTED` / `REVIEW_ROUND_STATUS_ACCEPTED`; an uploaded revision moves the round to `REVIEW_ROUND_STATUS_REVISIONS_SUBMITTED` (`editor.submission.roundStatus.revisionsSubmitted`), and the Request Revisions decision sets no request flag, so the card goes and the email's `reviewResponseAction=respond` finds no card to open. Live-probed 2026-09-06 (OJS, `author.alex` on a `requestRevisions` round without a request): the card present after the decision (status "Revisions have been requested."); after the author's upload under "Revisions Uploaded", the status "Revisions have been submitted and a decision is needed." and no card; the decision email's href, still carrying `reviewResponseAction=respond`, landed with no card and no window; the editor's table read "Ready to invite author" with "Request Response" enabled.

<a id="fn-f-a8"></a>
**f-a8** — Note e: `getActiveReviewAssignments()` drops declined and cancelled assignments alike, and `ReviewerComments::setupReviewerCommentsVariable()` iterates the completed assignments only, so a cancelled request should count like a declined one on both the cell and the email. Not driven: the scenario API seeds no `cancelled` reviewer status. The settling read: on a round with one completed review and one accepted request, the editor takes the accepted reviewer's "…" › "Cancel Reviewer", then reads the cell (expected "Ready to invite author", "Request Response" enabled) and opens the request page (expected one reviewer block).

<a id="fn-f-a9"></a>
**f-a9** — Notes c, d, f, h, j and k name the keys. None of the keys quoted in A9 has an entry in lib/pkp's `locale/fr_CA/` (`submission.po`, `common.po`, `emails.po`), while `submission.dashboard.view.awaitingReviews` has one; `emails.reviewRound.requestAuthorResponse.subject` and `.body` exist in `locale/en/emails.po` only. Live-probed 2026-09-30 at ojs `7ce98ec09e`, omp `3b0ecf794c` (lib/pkp `3dc90c81a6`), two runs, each on a scratch journal and a scratch press with English and French (Canada) as interface languages, as their Journal Manager and the submitting Author, on a round awaiting reviews, a ready round and a round with revisions requested; every French read was paired with the same read in `/en/`, where the only code on screen was the header's help link (the workflow screen's, U24 A11). On the ready round the Journal Manager sent a request from the page reached through "Request Response"; the Author opened the window, typed and pressed "Annuler" (the window closed with no question and reopened with its submit button greyed), then typed, ticked themself and submitted: one saved response per run, the card reading the submitted code at once and after a reload; the Journal Manager then read the table, the row's menu, the "View" window (closed with "Annuler") and the "Delete" dialog ("Annuler", the row unchanged). The ready cell's capitals come from the same CSS as the English cell's (note d), the page's capitals from the heading's `uppercase` class (note f). The request page's language switch read "Passer à français" and was not pressed. Control: the press's External Review stage showed no table and no card in either language. No response of 500 or more and no script error. Re-walked 2026-10-04 on OJS `main` (issues session): split two ways. The row's "…" button, named `common.moreActions`, joined [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457) ([docs/issues/U53-A11-users-tab-french-raw-keys.md](../issues/U53-A11-users-tab-french-raw-keys.md)), low; every other key is in lib/pkp `locale/en` on `main` only (22 from 3dff6a7b6e, 2026-01-23, `pkp/pkp-lib#12048`; the email's subject and body from 4f3b6f906e, 2026-02-20, `pkp/pkp-lib#12307`; `discussion.form.templatesLabel` from 2ceea5cd28, 2025-09-15, `pkp/pkp-lib#11825`), no other language has them and `stable-3_5_0` has none, so they get no report under the 2026-10-02 ruling on main-only locale keys. The entry's impact, low, is its reported part's.
Issue report: [pkp-e2e#457](https://github.com/jardakotesovec/pkp-e2e/issues/457) ([docs/issues/U53-A11-users-tab-french-raw-keys.md](../issues/U53-A11-users-tab-french-raw-keys.md)).

<a id="fn-f-omp1"></a>
**f-omp1** — Note a for the missing components; note h for the shared `DecisionRequestRevisionsNotifyAuthor` and template. Seen 2026-07-31 on a press during the review-stage probes (recorded in the review stage spec's note a: no Author Response panel in either view, console clean, while the author still received the letter inviting a response). Re-observed 2026-09-06 on the current build: no table on `workflow_3_{round}` or `workflow_2_{round}`; the typed page renders, `POST …/requestResponse` 200, the email's anchor `…mySubmissions?workflowSubmissionId={id}&workflowMenuKey=workflow_3_{round}&reviewResponseAction=respond`; the Request Revisions wizard's "Notify Authors" message and the "Your submission has been reviewed and we encourage you to submit revisions" email carry the same anchor; the author lands on External Review with the headings "Round 1 Status", "Notifications", "Revisions Uploaded", "Review Tasks & Discussions", no "Author Response" and no window, console clean (own console listeners; the kit's `screen()` does not capture it).

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| "Author Response" table (editorial view, review stage) | `{journal}/dashboard/editorial?workflowSubmissionId={id}` → Review › round | AFFW-326 · VUE-049 (the atlas file `ReviewRoundResponseManager.vue` no longer exists; the manager is split into `AuthorResponseRequestManager/` and `AuthorResponseManager/`) |
| "Request Response" header button | the table | AFFW-579 |
| "Response Status" cell and the "Actions" column | the table | AFFW-582 |
| Row "…" › "View" / "Delete" | the table, once a response exists | AFFW-580 · AFFW-581 |
| Delete dialog "OK" / "Cancel" | row "Delete" | AFFW-583 |
| "Request Author Response" page | `{journal}/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId={round}&submissionId={id}&ret=…`; sends `POST api/v1/reviews/{id}/{round}/authorResponse/requestResponse` | ROUTE-023 · VUE-008 · API-032 (authorResponse cluster) |
| The request email | "Request Author Review Response" template, key `REQUEST_REVIEW_ROUND_AUTHOR_RESPONSE` | MAIL-033 |
| "Author Response" card (author view) | `{journal}/dashboard/mySubmissions?workflowSubmissionId={id}` → Review › round | AFFW-354 |
| "Submit Response" / "View Submitted Response" | the card | AFFW-577 |
| The email's "Submit Author Response" button | `…/dashboard/mySubmissions?workflowSubmissionId={id}&workflowMenuKey=workflow_3_{round}&reviewResponseAction=respond` | AFFW-578 |
| Response window ("Submit Your Response to Reviewer Feedback" / "Author Response to Reviews") | the card's button, the row's "View"; `POST` / `PUT api/v1/reviews/{id}/{round}/authorResponse[/{responseId}]` | VUE-070 · AFFW-584 · AFFW-585 |
| Row "Delete" › "OK" | `DELETE api/v1/reviews/{id}/{round}/authorResponse/{responseId}` | API-032 |

## Reference — code anchors

- `lib/pkp/api/v1/reviews/PKPReviewController.php` (`getGroupRoutes()`, `requestAuthorResponse()`, `submitAuthorResponse()`, `editAuthorResponse()`, `deleteAuthorResponse()`); `formRequests/AddResponse.php`, `EditResponse.php`, `RequestAuthorResponse.php`, `ReviewRoundAuthorResponseCommonValidator.php`; `resources/ReviewRoundAuthorResponseResource.php` · `ojs api/v1/reviews/index.php`, `omp api/v1/reviews/index.php` (no OPS file)
- `lib/pkp/pages/reviewResponse/ReviewResponseHandler.php`, `index.php`; `lib/pkp/classes/components/RequestReviewResponsePage.php`; `lib/pkp/templates/reviewResponse/requestAuthorResponse.tpl`
- `lib/pkp/classes/submission/reviewRound/authorResponse/AuthorResponse.php`, `AuthorResponseManager.php`; `lib/pkp/classes/submission/reviewRound/ReviewRound.php` (`getAuthorResponse()`), `ReviewRoundDAO.php` (`isAuthorResponseRequested`); `lib/pkp/classes/submission/maps/Schema.php` (`getPropertyReviewRounds()`); `lib/pkp/classes/migration/install/ReviewRoundAuthorResponse.php`
- `lib/pkp/classes/mail/mailables/RequestReviewRoundAuthorResponse.php`, `DecisionRequestRevisionsNotifyAuthor.php`; `lib/pkp/classes/mail/traits/ReviewRoundAuthorResponse.php`, `ReviewerComments.php`; `lib/pkp/classes/decision/types/traits/NotifyAuthors.php`; `lib/pkp/locale/en/emails.po` (`emails.reviewRound.requestAuthorResponse.*`), `submission.po` (`submission.reviewRound.*`, `editor.submission.reviewRound.*`)
- lib/ui-library `src/managers/ReviewRoundResponseManager/` (`AuthorResponseFormModal.vue`, `useAuthorResponseForm.js`, `AuthorResponseManager/AuthorResponseManager.vue`, `AuthorResponseRequestManager/*.vue`, `AuthorResponseRequestManagerStore.js`, `useReviewRoundAuthorResponseConfig.js`); `src/pages/requestReviewRoundAuthorResponse/RequestReviewRoundAuthorResponse.vue`, `RequestResponseHeader.vue`; `src/pages/workflow/WorkflowPageOJS.vue`, `composables/useWorkflowConfig/workflowConfigEditorialOJS.js`, `workflowConfigAuthorOJS.js`; `src/composables/useSubmission.js` (`CompletedReviewAssignmentStatuses`, `checkMinimumConsideredReviews()`); `lib/pkp/js/load.js`
- `lib/pkp/classes/components/forms/context/PKPEmailSetupForm.php` (`notifyAllAuthors`); `lib/pkp/schemas/context.json`, `reviewRound.json`
