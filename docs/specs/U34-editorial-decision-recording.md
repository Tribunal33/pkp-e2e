---
name: editorial-decision-recording
status: verified
---

# Editorial decision recording {OJS OMP OPS}

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

Every decision button on a submission's workflow ("Send for Review",
"Accept Submission", "Decline Submission", "Send To Production" and the
rest) leads to the same guided **decision wizard**: a full page, not a
window, that walks the editor through one page per thing the decision
does. An email page ("Notify Authors", "Notify Reviewers") holds a prefilled
letter the editor may edit, attach files to or skip; a "Select Files" page
lists the files to carry into the next stage, already ticked; on a journal
that charges a publication fee an accept decision opens with a "Request
Payment" page. "Record Decision" on the last page records the decision,
sends the emails that were not skipped, copies the ticked files and closes
on a window that says what happened. An editor whose participation is
limited to recommendations goes through the same wizard with one page,
"Notify Editors", and records a recommendation instead. <sup>a</sup>

This spec covers the wizard itself: its pages and their order for each
decision, the email composer (templates, recipients, "Attach Files", "Insert
Content", the language switch), the "Select Files" page, the footer's
"Cancel", "Previous", "Continue" and "Record Decision", the closing window,
and what every recording leaves behind (the emails and who gets them, the
Activity Log line, the author's task, the promoted files). Which buttons a
stage offers to whom, and what the recorded decision does to that stage
(the round, the files lists, the status), belong to the stage specs:
*[Submission stage](U25-submission-stage.md#send-to-review)*,
*[Review stage & rounds](U26-review-stage-and-rounds.md#decisions)*,
*[Copyediting stage](U32-copyediting-stage.md#send-to-production)* and
*[Production stage](U33-production-stage.md#move-to-copyediting)*. The
request page of *[Author response to reviews](U30-author-response-to-reviews.md)*
opens the same email composer and "Attach Files" window and describes only
what differs on its screen; the discussions form of *Tasks & discussions*
has a composer of its own (Cross-feature interactions). <sup>a</sup>
<sup>w</sup>

A preprint server installs the wizard for its two Production-stage decisions
alone, "Decline Submission" and "Revert Decline", each a one-page wizard
("Notify Authors"): it has no review stage, no Reviewer role and no
recommendation controls, so no "Notify Reviewers", "Notify Editors" or
"Select Files" page appears there, and its "Attach Files" window offers
"Upload File" and "Library Files" only (Rule 6) [OPS1](#ops1). <sup>v</sup>

## Actors & permissions

"Deciding editor" and "recommending editor" are the
[glossary's](GLOSSARY.md#roles-and-access). Who is offered which button is
each stage spec's business; the rows below record what the wizard itself
admits, refuses and offers once a button is pressed or its address typed
(Rule 12). <sup>b</sup> <sup>w</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the wizard and record a decision** | • Journal Manager; Editor; Site Administrator: every submission, assigned or not<br>• Section Editor, Guest Editor, Production editor: when assigned to the submission's active stage and not limited to recommendations<br>• On a preprint server: Preprint Server Manager, and a Moderator assigned to the preprint<br>• Everyone: only while the decision's stage is the submission's active one (Rule 12) <sup>b</sup> |
| **Record a recommendation** ("Recommend Accept", "Recommend Decline", "Recommend Revisions"; Rule 13) | • Recommending editors: on a review stage (a press's Internal Review too), only while a deciding editor is also assigned to that stage; without one the buttons are not offered and the typed address answers a bare "404 Not Found" page<br>• On a preprint server: nobody; the server records no recommendations at all, and a typed recommendation address reads "This decision could not be found. Please provide a recognized decision type." [OPS1](#ops1) <sup>b</sup> <sup>p</sup> |
| **Record "Send for Review" as a recommending editor** (Submission stage; on a press "Send to Internal Review") | • Recommending editors: the button is offered and the wizard accepts it as a real decision, the one exception to the row above; on a press the accepted decision is "Send to Internal Review", and "Send to External Review" typed by address is refused "You do not have permission to record this decision on this submission." That the button is offered at all is *[Submission stage](U25-submission-stage.md#a2)*'s open question <sup>b</sup> |
| **Reach the wizard by its address without the right** | • Copyeditor, Layout Editor, Proofreader and the other assistant roles; Reviewer; Author; Reader: the access-denied page reading "The current role does not have access to this operation."<br>• A Section Editor or Guest Editor not assigned to the submission: the access-denied page reading "You must be assigned to this submission in order to record an editorial decision."<br>• A recommending editor, for a decision: the access-denied page reading "You do not have permission to record this decision on this submission."<br>• Anyone, for a decision of another stage than the submission's active one: the access-denied page reading "The submission is not at the appropriate stage of the workflow to take this decision." (Rule 12)<br>• Anyone, for a decision number the journal does not have: the access-denied page reading "This decision could not be found. Please provide a recognized decision type." <sup>b</sup> |
| **Change the "To" list of an email page** (Rule 4) | • Whoever opened the wizard, on "Notify Reviewers" only; "Notify Authors" and "Notify Editors" list their recipients as fixed chips <sup>e</sup> |
| **Skip an email page** ("Skip this email"; Rule 3) | • Whoever opened the wizard, on "Notify Authors" and "Notify Reviewers"; "Notify Editors" cannot be skipped <sup>c</sup> <sup>p</sup> |
| **Attach files, insert content, load a template, switch the language** (Rules 5–8) | • Whoever opened the wizard, on every email page; a Section Editor's "Find Template" search is refused (Rule 7) <sup>d</sup> |
| **Choose the files to carry over** ("Select Files"; Rule 9) | • Whoever opened the wizard, on the decisions that have the page (Rule 2) <sup>i</sup> |
| **"Cancel", "Previous", "Continue", "Record Decision"** (Rules 10–11) | • Whoever opened the wizard <sup>j</sup> <sup>k</sup> |
| **Read the outcome** | • Author: the email arrives in their mailbox and is listed again on the "Notifications" list of their review stage ([→ the author's letters](U26-review-stage-and-rounds.md#author-emails)); a revision decision also puts a task in their header Tasks panel (Side effects)<br>• Deciding editors: a recommendation arrives as an email and as a discussion on the stage, and is listed in the "Recommendation" box ([→ recommendations](U26-review-stage-and-rounds.md#recommendations))<br>• Everyone with the Activity Log: the decision's line (Side effects) <sup>m</sup> <sup>o</sup> |

## Fields & validation

The email pages share one composer; the other pages are a list of tick
boxes ("Select Files"), one choice ("Require New Review Round", opened
before the wizard) or one choice ("Payment", a journal's first page).
<sup>d</sup>

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Email Templates" (email page, above the message) | no | A heading over a list of template buttons, each a name and the first 70 characters of its text: the decision's own template first (its name is the table in Side effects), then any template a manager set up as an alternative to it. Pressing one replaces "Subject" and "Message" after a short pause (Rule 7) <sup>d</sup> |
| "Find Template" (under the heading) | no | A search box over every email template of the journal, by words in the name, subject or text; ten results show with "{n} more" to unfold the rest; while it looks the list reads "Searching"; a Section Editor's search is refused (Rule 7) <sup>d</sup> |
| "Switch to {language}" (under the templates) | no | Shown only when the journal has more than one form language: the line "Switch to:" with a link named after the other language ("French"); pressing it asks for confirmation and reloads the default template in that language (Rule 8) <sup>h</sup> |
| "To" | fixed, or at least one | The recipients as chips; on "Notify Authors" and "Notify Editors" they cannot be changed. On "Notify Reviewers" each chip has a remove control and the box offers the round's reviewers back; emptied, "Record Decision" is refused with the banner "There was a problem with the Notify Reviewers step.", and "View Error" opens the page, where the box reads "None" and carries no message ⚠ [A7](#a7) (Rule 4) <sup>e</sup> |
| "Add CC/BCC" → "CC", "BCC" | no | Pressing "Add CC/BCC" replaces the link with two empty boxes labelled "CC:" and "BCC:"; addresses typed there, comma-separated, go on the email. A word that is not an email address is refused on "Record Decision" with "This is not a valid email address." under the box <sup>j</sup> |
| "Subject:" | yes | Prefilled from the template with its placeholders filled in (the journal's name, the title); emptied, "Record Decision" is refused with "This is not a valid string. This field is required." under the box and the page's banner (Rule 10) <sup>d</sup> <sup>j</sup> |
| "Message" | yes | Rich text (bold, italic, superscript, subscript, link) prefilled from the template, shown with its placeholders filled in (Rule 5); its toolbar adds "Insert Content" (Rule 5) and "Attach Files" (Rule 6). Emptied, "Record Decision" is refused like the subject <sup>d</sup> <sup>g</sup> <sup>j</sup> |
| Attached files (under the message) | no | One chip per attached file with its name and a remove cross ("Remove {file}"); a file the wizard cannot find at recording time is refused with "The file {file} could not be attached." <sup>f</sup> |
| "Select Files" tick boxes | no | One box per listed file; the page opens with the decision's default ticks (Rule 2) and records with none ticked (Rule 9) <sup>i</sup> |
| "Require New Review Round" (the window before "Request Revisions"; not on a press's Internal Review, Rule 14) | yes, preselected | Two options, "Revisions will not be subject to a new round of peer reviews." (preselected) and "Revisions will be subject to a new round of peer reviews."; "Next" opens the wizard for the chosen decision (Rule 14). For a recommending editor the options read "Revisions should not be subject to a new round of peer reviews." and "Revisions should be subject to a new round of peer reviews." <sup>q</sup> |
| "Payment" ("Request Payment" page) {OJS} | yes, preselected | Two options, "Request publication fee ({amount} {currency})" (preselected) and "Waive" (Rule 16) <sup>s</sup> |

## Rules & state

<a id="page"></a>
1. **The wizard is a page of its own.** Pressing a decision button leaves
   the workflow for a full page whose heading is the decision's name
   followed by the current page's name, "Accept Submission: Notify
   Authors", or the decision's name alone when the wizard has one page;
   under it one sentence says what the decision does (Rule 11's table).
   A step rail lists the pages in order, numbered ("1 Notify Authors",
   "2 Select Files"); a page already visited, or skipped, shows a check in
   place of its number and is a button back to it, the current page keeps
   its number, and a page not yet reached is plain text that ignores a
   click; in a narrow window the rail collapses to
   the current page with a "{n}/{total} steps" count and a button that
   unfolds it. The breadcrumb reads Dashboard › the submission (its
   authors and title, cut to 50 characters) › the decision. Each page is a
   panel headed by the page's name and a sentence of guidance, and the
   footer's buttons sit under it (Rule 10). <sup>a</sup>
<a id="pages"></a>
2. **Which pages each decision has.** The wizard builds its pages from what
   the decision does; the table gives the buttons, the pages in order and
   the default ticks. The stage in brackets is where the button lives, and
   the press's Submission-stage "Send to External Review" is the journal's
   "Send for Review" under another name. <sup>c</sup>

   | Button (stage) | Pages, in order | Apps |
   |---|---|---|
   | "Send for Review" (Submission); on a press "Send to External Review" and "Send to Internal Review" | "Notify Authors" · "Select Files": "Submission Files", all ticked | OJS OMP |
   | "Accept and Skip Review" (Submission) | "Request Payment" on a journal charging a publication fee (Rule 16) · "Notify Authors" · "Select Files": "Submission Files", all ticked | OJS OMP |
   | "Decline Submission" (Submission; on a preprint server Production) | "Notify Authors" | all |
   | "Revert Decline" (Submission; on a preprint server Production) | "Notify Authors" | all |
   | "Accept Submission" (Review; a press's Internal Review too) | "Request Payment" on a fee-charging journal · "Notify Authors" · "Notify Reviewers", only when a review is submitted · "Select Files": the round's "Revisions", all ticked; on a press's Internal Review the list reads "No items found." even when the author has uploaded a revision there ⚠ [→ Internal review stage OMP2](U71-internal-review-stage.md#omp2) | OJS OMP |
   | "Request Revisions" (Review), after the choice window (Rule 14; not on a press's Internal Review) under the heading "Request Revisions" or "Resubmit for Review" | "Notify Authors" · "Notify Reviewers", only when a review is submitted | OJS OMP |
   | "Create New Review Round" (Review; a press's Internal Review too), under the heading "New Review Round" ⚠ [A1](#a1) | "Notify Authors" · "Select Files": the round's "Revisions", all ticked; on a press's Internal Review the list reads "No items found." as on "Accept Submission" ⚠ [→ Internal review stage OMP2](U71-internal-review-stage.md#omp2) | OJS OMP |
   | "Cancel Review Round" (Review) | "Notify Authors" · "Notify Reviewers", only when a reviewer of the round has neither declined nor been cancelled | OJS OMP |
   | "Decline Submission" (Review) | "Notify Authors" · "Notify Reviewers", only when a review is submitted | OJS OMP |
   | "Revert Decline" (Review) | "Notify Authors" | OJS OMP |
   | "Send to External Review" (a press's Internal Review) | "Notify Authors" · "Select Files": the internal round's "Revisions", all ticked | OMP |
   | "Send To Production" (Copyediting) | "Notify Authors" · "Select Files": "Copyedited", all ticked, and "Draft Files", none ticked | OJS OMP |
   | "Move to Review" (Copyediting) | "Notify Authors" | OJS OMP |
   | "Move To Copyediting" (Production) | "Notify Authors" | OJS OMP |
   | "Recommend Accept", "Recommend Decline", "Recommend Revisions" (Review), the last after the choice window under the heading "Recommend Revisions" or "Recommend Resubmit for Review"; a press's Internal Review adds "Recommend Send to External Review" | "Notify Editors", which cannot be skipped | OJS OMP <sup>c</sup> |

   "Notify Authors" exists only when an Author is assigned to the stage,
   which every submitted submission has unless the assignment was
   removed; a decision whose only page is missing opens with the heading,
   the sentence and the footer alone, and "Record Decision" records it at
   once ⚠ [A2](#a2). "Notify Reviewers" lists the reviewers the table
   names, a submitted review's row reading "Review Submitted", "Review
   Viewed", "Complete" or "Reviewer Thanked"; a round with invitations
   only, or with every review still open, has no such page. <sup>c</sup>

   Publishing, "Return to Workflow" and "Return to Done" record decisions
   too, but never through this wizard
   ([→ Done](U24-workflow-screen-and-stage-access.md#done)). <sup>u</sup>
<a id="email-page"></a>
3. **An email page** opens with the letter ready: "To" filled with the
   page's recipients, "Subject:" and "Message" filled from the decision's
   template (Side effects' table) in the composer's language, and the
   "Email Templates" list above it. At the bottom left of the footer a
   small link reads "Skip this email". Pressing it replaces the letter with
   the notice "This step has been skipped and no email will be sent." and
   a link "Don't skip this email", and, when a page follows, moves to it
   at once; a skipped page keeps its place in the rail, marked like a
   finished one (Rule 1). "Don't skip this email" puts the page's default
   letter back; anything typed before skipping is gone. A skipped page
   sends nothing and is never checked for errors (Rule 10). <sup>c</sup>
   <sup>d</sup> <sup>t1</sup>
4. **Recipients.** "Notify Authors" goes to the Authors assigned to the
   stage, "Notify Editors" to the deciding editors assigned to it, both
   as fixed chips. "Notify Reviewers" lists the round's reviewers named in
   Rule 2's table, each removable; its letter keeps "{$recipientName}" on
   screen as a marked token, and each reviewer's email carries that
   reviewer's own name, whether or not the text was edited. A user whose
   account is disabled is left off every list. <sup>e</sup>
<a id="insert-content"></a>
5. **Placeholders and "Insert Content".** The letter shows its placeholders
   as their values: "Dear Alex Author," rather than "Dear
   {$recipientName},", the journal's name, the title, and the editor's
   signature, which is the "Signature" on their own profile or, when that
   is empty, their full name (Settings). The toolbar's "Insert Content"
   button opens a window of that name listing every value the letter may
   carry, each with a description and an "Insert" button that drops it at
   the cursor; a
   "Search" box, once Enter is pressed, keeps only the rows whose value
   or description carries the typed phrase (typing alone leaves the list
   whole). The values are the mail's
   variables: the journal's name, addresses, initials and contact, the
   submission's title, abstract, ID and addresses, the authors' names,
   the recipient's name and username, the editor's name and signature; a
   review-stage page adds the reviewers' comments to the author and, on
   the two revision decisions, the author's response address; "Notify
   Editors" adds the recommendation and "Notify Reviewers" the decision's
   description. The reviewers' comments and the signature are listed as
   raw markup ("\<p\>", "\<strong\>", "\<br\>" shown as text) and the
   mailing address as an empty row ⚠ [A8](#a8); on a preprint server the
   server's initials are described
   "##emailTemplate.variable.context.contextAcronym##" ⚠ [OPS2](#ops2).
   <sup>g</sup>
<a id="attach-files"></a>
6. **"Attach Files".** The toolbar's "Attach Files" button opens a side
   window titled "Attach Files" with one panel per source, each a heading,
   a sentence and a button <sup>f</sup>:
   - "Upload File" — "Upload a file from your computer." — "Upload File":
     a second window with a dashed drop zone reading "Drag and drop files
     here. Or upload a file", the buttons "Add Files" and "Attach Files"
     (greyed until a file is there) and a "Back" button. An uploaded file
     shows a progress bar, then its name with a "Remove" button.
   - "Review Files" — "Attach files that were uploaded by reviewers" —
     "Attach Review Files", on a review-stage decision: rows reading
     "{reviewer} — {file}" for every file a reviewer of the round
     uploaded, whether or not their review is submitted, one tick box
     each, or "No items found." when no reviewer attached a file; "Attach
     Selected" (greyed until a tick) and "Back".
   - "Submission Files" — "Attach Submission Files": the submission's own
     files by group, the first group's rows shown, and an "Other Files"
     dropdown to switch groups when there is more than one. The groups
     follow the decision: "Submission Files" on the Submission stage
     (sentence "Attach files uploaded by the author in the submission
     stage."); "Revisions" and "Review Files" of the round on a review
     stage ("Attach files uploaded during the submission workflow, such as
     revisions or files to be reviewed."); "Copyedited" and "Draft Files"
     for "Send To Production"; "Draft Files" for "Move to Review";
     "Production Ready Files" for "Move To Copyediting". A tick box per
     row; "Attach Selected" and "Back".
   - "Library Files" — "Attach files from the Submission and Publisher
     Libraries." — "Attach Library Files": the journal's Publisher Library
     files and this submission's Library files (*Submission & Publisher
     Libraries*), one row per file with its type ("Marketing" and the
     rest) beside its name, a "Download" link and a tick box, or "No items
     found." when the libraries are empty; "Attach Selected" and "Back".

   Attaching closes both windows and adds a chip per file under the
   message; the cross on a chip removes it. On a preprint server the
   window offers "Upload File" and "Library Files" alone [OPS1](#ops1).
   A reviewer's file attached to the authors' letter on a review-stage
   decision is listed for the author afterwards under "Reviewer Files" in
   their "Read Review" window, which exists for a completed open review
   only ([→ reading reviews as the author](U26-review-stage-and-rounds.md#author-read-review));
   with an anonymous review the author sees nothing of it, and the letter
   on their "Notifications" list shows no attachment line. <sup>f</sup>
<a id="templates"></a>
7. **Loading a template.** The list under "Email Templates" holds the
   decision's own template and its alternatives. "Find Template" searches
   every email template of the journal by name and text (ten results,
   then a "{n} more" button); the discussion templates of *Tasks &
   discussions* ("Request Copyedit", "Assign Editor", "Ready for
   Production") are not email templates and are never found. A Section
   Editor's search is refused: an "Error" window reading "You are not
   authorized to access the requested resource." with "OK", after which
   the phrase stays in the box over an empty list until "Clear search
   phrase" ⚠ [A9](#a9); a Journal Manager's or Editor's search works. The
   wizard sends whatever is loaded: the mail and the Activity Log's "An
   email has been sent: {subject}" row carry the loaded template's
   subject. Pressing a template replaces "Subject:" and "Message" after a
   short pause during which the letter is greyed; anything typed before
   is lost without a prompt. <sup>d</sup>
8. **Switching the language.** When the journal has a second form
   language, a line "Switch to:" with a link named after the other
   language ("French") appears under the templates. Pressing the link asks
   "Switch to {language}" /
   "Are you sure you want to change to {language} to compose this email?
   Any changes you have made to the subject and body of the email will be
   lost." with a highlighted "Switch to {language}" and "Cancel";
   confirming reloads the decision's default template in that language,
   the recipients' names with it, and the email goes out in it; the
   "Email Templates" entry above keeps its snippet in the first language
   ⚠ [A10](#a10). The seeded journal has one form language, so no link
   shows there. <sup>h</sup>
<a id="select-files"></a>
9. **"Select Files".** The page is headed "{Decision}: Select Files" with
   the decision's own sentence beneath; its panel "Select Files" opens
   with "Select files that should be sent to the review stage." ("…to the
   copyediting stage.", "…to the production stage."; on a press "…to the
   internal review stage." too; "New Review Round": "Select files that
   should be sent for review.") and one list per group named in
   Rule 2, each row a file with its type, a "Download" link, a tick box
   and the line "Uploaded by {username} on {date}", which names the
   uploader by their account's username where a name would be expected
   ⚠ [A12](#a12). Recording copies every ticked file into the
   destination list of the next stage (the review round's files, "Draft
   Files", "Production Ready Files") and leaves the originals in place;
   the copies appear once the closing window shows. With nothing
   ticked the decision records and nothing is copied: "Send To
   Production" on a submission with no copyedited file lists the draft
   file unticked and records with an empty "Production Ready Files".
   <sup>i</sup> <sup>t1</sup>
<a id="footer"></a>
10. **The footer.** From left to right: "Skip this email" (email pages only,
    Rule 3), a warning-styled "Cancel", "Previous" (from the second page
    on), and "Continue", which becomes the highlighted "Record Decision" on
    the last page. "Continue" and the rail move freely; nothing is checked
    until "Record Decision". Then every page with a problem gets a warning
    banner at the top of the wizard, "There was a problem with the {page}
    step." with a "View Error" link that opens that page, and the failing
    box carries its message ("This is not a valid string. This field is
    required." under an emptied subject or message, "This is not a valid
    email address." under "CC:" or "BCC:", "The file {file} could not be
    attached." under the chips; an emptied reviewers list alone gets the
    banner and no message, Fields' "To" row); the decision is
    not recorded until every banner is cleared. While the recording runs a
    spinner shows beside the buttons and all of them are greyed; a second
    press does nothing. A wizard whose submission has moved on since it
    was opened (another editor recorded first) is refused on "Record
    Decision" with an error window reading "The submission is not at the
    appropriate stage of the workflow to take this decision." <sup>j</sup>
11. **Cancelling and finishing.** "Cancel" asks "Cancel Decision" / "Are you
    sure you want to cancel this decision?" with a warning-styled "Cancel
    Decision" and "Keep Working"; confirming returns to the workflow page
    with nothing recorded and nothing sent. Leaving through the
    breadcrumb's "Dashboard" asks nothing and drops what was typed.
    "Record Decision" ends on a window titled with the decision's closing
    words and one control, the link "View Submission Summary", which
    returns to the workflow page the button was pressed on (on a preprint
    server a declined preprint opens on its "Title & Abstract" page
    instead: *[Production stage](U33-production-stage.md#decline)*). The
    sentence under the heading and the closing window's words per
    decision: <sup>k</sup> <sup>l</sup>

    | Decision | Sentence under the heading | Closing window: title · message |
    |---|---|---|
    | "Send for Review" | "This submission is ready to be sent for peer review." | "Sent for Review" · "The submission, {title}, has been sent to the review stage. The author has been notified, unless you chose to skip that email."; on a press, where the button and the heading read "Send to External Review", "Sent for External Review" · "The submission, {title}, has been sent to the external review stage." |
    | "Send to Internal Review" {OMP} | "This submission is ready to be sent for internal review." | "Sent for Internal Review" · "The submission, {title}, has been sent to the internal review stage. The author has been notified, unless you chose to skip that email." |
    | "Accept and Skip Review" | "Accept this submission for publication and skip the review stage. This decision will send the submission to the copyediting stage." | "Skipped Review" · "The submission, {title}, skipped the review stage and has been sent to the copyediting stage. The author has been notified, unless you chose to skip that email." |
    | "Decline Submission" (Submission stage; a preprint server) | "This submission will be declined for publication. No further review will be conducted and the submission will be archived." | "Submission Declined" · "The submission, {title}, has been declined and sent to the archives. All notifications have been sent, except any you chose to skip." |
    | "Revert Decline" (Submission stage; a preprint server) | "Revert a previous decision to decline this submission and return it to the active editorial process. The author has been notified, unless you chose to skip that email." | "Submission Reactivated" · "The submission, {title}, is now active in the submission stage. The author has been notified, unless you chose to skip that email." (on a preprint server the stage named is one the server has not got: *[Production stage](U33-production-stage.md#ops2)*) |
    | "Accept Submission" | "This submission will be accepted for publication and sent for copyediting." | "Submission Accepted" · "The submission, {title}, has been accepted for publication and sent to the copyediting stage. All notifications have been sent, except any you chose to skip." |
    | "Request Revisions" | "The author must provide revisions before this submission will be accepted for publication." | "Revisions Requested" · "Revisions for the submission, {title}, have been requested. All notifications have been sent, except any you chose to skip." |
    | "Resubmit for Review" | "The author must provide revisions that will be sent for another round of review before this submission will be accepted for publication." | "Revisions Requested" · "Revisions for the submission, {title}, have been requested. A decision to send the revisions for another round of reviews was recorded. All notifications have been sent, except any you chose to skip." |
    | "New Review Round" | "Open another round of review for this submission." | "Review Round Created" · "A new round of review has been created for the submission, {title}. The author has been notified, unless you chose to skip that email." |
    | "Cancel Review Round" | "Cancel the current round of review and send the submission back to the last round of review. If this is the first review round, it will be moved to the submission stage." | "Cancelled the latest round of review." · "The review round for the submission, {title}, has been cancelled. All notifications have been sent, except any you chose to skip." |
    | "Decline Submission" (Review) | "This submission will be declined for publication. The peer review stage will be closed and the submission will be archived." | "Submission Declined" · as above |
    | "Revert Decline" (Review) | as above | "Submission Reactivated" · "The submission, {title}, is now an active submission in the review stage." |
    | "Send to External Review" (a press's Internal Review) | "This submission is ready to be sent for peer review." | "Sent for External Review" · "The submission, {title}, has been sent to the external review stage." |
    | "Send To Production" | "Send this submission to the production stage to be prepared for publication." | "Sent to Production" · "The submission, {title}, was sent to the production stage. The author has been notified, unless you chose to skip that email." |
    | "Move to Review" | "Send this submission back from the copyediting stage." | "Sent Back from Copyediting" · "The submission, {title}, was sent back from the copyediting stage. The author has been notified, unless you chose to skip that email." |
    | "Move To Copyediting" | "Send this submission to the copyediting stage." | "Moved to Copyediting" · "The submission, {title}, was moved to the copyediting stage. The author has been notified, unless you chose to skip that email." |
    | "Recommend Accept" / "Recommend Decline" / "Recommend Revisions" / "Recommend Resubmit for Review" / "Recommend Send to External Review" {OMP} | "Recommend that this submission be accepted for publication and sent for copyediting." / "Recommend that the submission be declined for publication." / "Recommend that revisions be requested from the author before this submission is accepted for publication." / "Recommend that the author is asked to submit revisions for another round of review." / "Recommend that this submission be sent to the external review stage." | "Recommendation Submitted" · "Your recommendation has been recorded and the deciding editor(s) have been notified." <sup>l</sup> |

12. **Only from the active stage.** The wizard's address is
    `{journal path}/decision/record/{submission id}?decision={decision number}`,
    a review-stage decision adding `&reviewRoundId={round number}`; a
    pressed button shows it in the address bar; the scenarios' footnote
    gives the numbers to type. Opened for a submission whose
    active stage is not the decision's (a decision of another stage, a
    bookmarked page after the submission moved on), it answers the
    access-denied page "The submission is not at the appropriate stage of
    the workflow to take this decision.", and a past round's entry offers
    no decision button. A review-stage decision typed without its round's
    number, or with one that is missing or another submission's, answers
    a bare "404 Not Found" page, as does a recommendation typed with no
    deciding editor assigned (Actors). Typed with a past round of the
    current stage, the decision opens the wizard with that round's
    reviewers offered; what "Record Decision" does to the past round is
    not known ⚠ [A11](#a11).
    The stage is checked, the submission's status is not: "Revert
    Decline" typed on a submission that was never declined opens, records
    "Submission Reactivated" and emails the author ⚠ [A6](#a6).
    <sup>b</sup> <sup>s1</sup>
<a id="recommendation"></a>
13. **Recording a recommendation.** The "Notify Editors" page is headed with
    the sentence "Send a message to the deciding editors to let them know
    the recommendation. Explain why this recommendation was made in
    response to the recommendations and comments submitted by reviewers.";
    its letter is the "Recommendation Made" template, whose text names the
    recommendation ("My recommendation is: Accept Submission."), and its
    "To" chips are the deciding editors of the stage. It has no "Skip this
    email". "Record Decision" sends the letter, opens a discussion on the
    stage's discussions panel titled with the subject and holding the
    letter as its first entry, the attached files with it, and lists the
    deciding editors as its participants but not the recommending editor
    who wrote it ⚠ [A4](#a4); the closing window reads "Recommendation
    Submitted". Back on the round, the recommending editor's
    "Recommendation" box shows the recommendation's name, "Accept
    Submission", with a "Change decision" button that brings the
    recommendation buttons back (a press's Internal Review adds "Recommend
    Send to External Review"); a second recording replaces the first on
    both editors' boxes and opens a further discussion, so the deciding
    editor's list holds one "Editor Recommendation" per recording
    ([→ recommendations](U26-review-stage-and-rounds.md#recommendations)).
    The submission's stage, status and round are untouched. <sup>p</sup>
14. **The choice before "Request Revisions".** "Request Revisions" and
    "Recommend Revisions" open a side window titled "Request Revisions"
    with the choice "Require New Review Round" (Fields) and a "Next"
    button; "Next" opens the wizard under the heading of the chosen
    decision, "Request Revisions" or "Resubmit for Review" ("Recommend
    Revisions" or "Recommend Resubmit for Review"). The window's close
    control abandons the choice with nothing opened. On a press's Internal
    Review both buttons open their wizard at once: the internal round has
    no "Resubmit for Review" and no window. <sup>q</sup>
15. **The minimum-reviews warning** {OJS OMP}. On a journal whose review
    setup names a "Minimum Confirmed Reviews Required" above zero, "Accept
    Submission", "Request Revisions" and "Create New Review Round" pressed
    on a round with fewer confirmed reviews (rows "Complete" or "Reviewer
    Thanked") than that number first ask "Proceed Without
    Minimum Confirmed Reviews?" / "The minimum number of confirmed reviews
    has not been met. Do you still want to proceed with this editorial
    decision?" with a warning-styled "Yes, Continue" and "Cancel"; "Yes,
    Continue" goes on to the wizard (or the choice window of Rule 14),
    "Cancel" stays on the round. "Decline Submission", "Cancel Review
    Round", a press's "Send to External Review" and the recommendation
    buttons never ask. <sup>r</sup>
16. **"Request Payment"** {OJS}. On a journal with payments enabled and an
    "Article Processing Charge" set, "Accept Submission" and "Accept and
    Skip Review" open on a first page "Request Payment" with the choice
    "Payment" (Fields). Recording with "Request publication fee" chosen
    queues the fee against the submission, puts "The publication fee is
    due for payment." in each assigned Author's header Tasks panel and
    sends them the "Payment Request Notification" email from the journal's
    principal contact. "Waive" is meant to record the decision with none
    of that, but does the same: the fee is queued, the task and
    the email arrive ⚠ [OJS1](#ojs1). <sup>s</sup>

## Side effects

- **The decision is recorded.** The submission's stage, status and round
  change as the stage specs describe, and one line lands in the Activity
  Log naming the editor: the table gives it per decision. A
  recommendation is logged the same way ("{editor} recommended that this
  submission be accepted and sent for copyediting."). Recorded under
  "Login As", the line's text still names the editor acted as, while the
  row's user is the administrator with that editor noted beside them.
  <sup>m</sup>
- **The author's email.** An unskipped "Notify Authors" sends one email to
  the assigned Authors together, from the editor's own name and address,
  with the subject and text as left on the page and the attached files;
  it is listed on the author's "Notifications" list
  ([→ the author's letters](U26-review-stage-and-rounds.md#author-emails))
  and in the submission's email log (*Submission activity log & notes*).
  With "Notify All Authors" on (Settings), every other contributor on the
  Contributors list who has an email address gets a second email under
  the same subject, whose text opens "The following email was sent to
  {author} from {journal} regarding "{title}"." and quotes the letter. The
  template name in the "Email Templates" list and the default subject per
  decision: <sup>m</sup> <sup>t</sup>

  | Decision | Template name · default subject | Activity Log line |
  |---|---|---|
  | "Send for Review" | "Sent to Review" · "Your submission has been sent for review" | "{editor} sent this submission to the review stage." (on a press "…to the external review stage.") |
  | "Send to Internal Review" {OMP} | "Sent to Internal Review" · "Your submission has been sent for internal review" | "{editor} sent this submission to the internal review stage." |
  | "Accept and Skip Review" | "Submission Accepted (Without Review)" · "Your submission has been sent for copyediting" | "{editor} skipped the review stage and sent this submission to the copyediting stage." |
  | "Decline Submission" (Submission stage; a preprint server) | "Submission Declined (Pre-Review)" (on a preprint server "Submission Declined") · "Your submission has been declined" | "{editor} declined this submission." |
  | "Revert Decline" (Submission stage; a preprint server) | "Reinstate Submission Declined Without Review" · "We have reversed the decision to decline your submission" | "{editor} reversed the decision to decline this submission." |
  | "Accept Submission" | "Submission Accepted" · "Your submission has been accepted to {journal}" | "{editor} accepted this submission and sent it to the copyediting stage." |
  | "Request Revisions" | "Revisions Requested" · "Your submission has been reviewed and we encourage you to submit revisions" | "{editor} requested revisions for this submission." |
  | "Resubmit for Review" | "Resubmit for Review" · "Your submission has been reviewed - please revise and resubmit" | "{editor} requested revisions for this submission that should be sent for another round of review." |
  | "New Review Round" | "New Review Round Initiated" · "Your submission has been sent for another round of review" | "{editor} created a new round of review for this submission." |
  | "Cancel Review Round" | "Review Round Cancelled" · "A review round for your submission has been cancelled" | "{editor} cancelled the review round." |
  | "Decline Submission" (Review) | "Submission Declined" · "Your submission has been declined" | "{editor} declined this submission." |
  | "Revert Decline" (Review) | "Reinstate Declined Submission" · "We have reversed the decision to decline your submission" | "{editor} reversed the decision to decline this submission." |
  | "Send to External Review" (a press's Internal Review) {OMP} | "Sent to Review" · "Your submission has been sent for review" | "{editor} sent this submission to the external review stage." |
  | "Send To Production" | "Sent to Production" · "Next steps for publishing your submission" | "{editor} sent this submission to the production stage." |
  | "Move to Review" | "Submission Sent Back from Copyediting" · "Your submission has been moved to review" | "{editor} has sent this submission back from the copyediting stage." |
  | "Move To Copyediting" | "Submission Moved to Copyediting" · "Your submission has been moved to copyediting" | "{editor} moved this submission to the copyediting stage." <sup>m</sup> |

- **The reviewers' emails.** An unskipped "Notify Reviewers" sends one
  email per listed reviewer, from the editor's name and address, with the
  "Notify Reviewers of Decision" template ("Thank you for your review";
  its text names the decision in one sentence, "We have chosen to accept
  this submission without revisions." or its like); on "Cancel Review
  Round" the template is "Review Cancel" ("Your review for "{title}" has
  been cancelled"), whose text on a press leaves "{$journalName}" unfilled
  ⚠ [OMP1](#omp1). One Activity Log line records it: "An email about the
  decision was sent to {n} reviewer(s) with the subject {subject}.", and
  each emailed reviewer's row in the Reviewers panel reads "Reviewer
  Thanked" (with "Revert Decision") where it read "Review Submitted".
  <sup>n</sup>
- **The author's task.** "Request Revisions" puts "Revision required." (on
  a press "Revisions to consider in External Review.") in each assigned
  Author's header Tasks panel, "Resubmit for Review" puts "Resubmit for
  review." there on both, each linking to the submission; a later
  decision on the submission clears them. The other decisions leave a
  notice for the author that no current screen shows ("Submission
  accepted.", "Submission declined.", "Production process started." and
  the rest) ⚠ [A5](#a5). <sup>o</sup>
- **A recommendation.** "Notify Editors" sends its letter to the deciding
  editors, from the recommending editor's name and address, and opens the
  discussion of Rule 13; the "Recommendation" box on the deciding
  editors' round lists it. <sup>p</sup>
- **The stage notices.** "Accept Submission" and "Send To Production"
  recompute the Copyediting and Production notice boxes of the assigned
  editors ("Assign a copyeditor…", "Assign a user to create galleys…"),
  which *[Copyediting stage](U32-copyediting-stage.md#notices)* and
  *[Production stage](U33-production-stage.md#notices)* describe.
  <sup>o</sup>
- **Promoted files.** The files ticked on "Select Files" are copied into
  the next stage's list (Rule 9); a reviewer's file attached to the
  authors' letter on a review-stage decision is listed for the author in
  their "Read Review" window of a completed open review (Rule 6).
  <sup>f</sup> <sup>i</sup>
- **The publication fee** {OJS}: the queued payment, the author's task and
  the "Payment Request Notification" email of Rule 16, with "Waive" chosen
  too. <sup>s</sup>

## Settings that modify behavior

- **"Notify All Authors"** (Settings › Workflow › Emails, the choice "Who
  should receive a notification email when an editorial decision is
  recorded?"; *Emails management*). Install default: "Send an email
  notification to all authors of the submission.", on the seeded and
  every scratch journal alike. At that end every contributor with
  an email address who is not an assigned Author gets the copy of the
  letter (Side effects); at "Only send an email to authors assigned to
  the submission workflow. Usually, this is the submitting author." the
  assigned Authors alone are emailed. <sup>t</sup>
- **The email templates** (Settings › Workflow › Emails; *Emails
  management*). Install default: the texts of Side effects' table. An
  edited template changes the letter the page opens with; a template added
  as an alternative to a decision's template joins that decision's "Email
  Templates" list (Rule 7). <sup>t</sup>
- **"Forms" languages** (Settings › Website › Setup › Languages;
  *Languages & locales*). Install default: the primary language alone. A
  second form language adds the "Switch to:" line with its link and a
  second set of template texts (Rule 8). <sup>h</sup>
- **"Minimum Confirmed Reviews Required"** (Settings › Workflow › Review;
  *[Review setup & review forms](U29-review-setup-and-review-forms.md)*).
  Install default 0: no warning. Above 0: the warning dialog of Rule 15
  before the three decisions it names. <sup>r</sup>
- **Payments** {OJS} (Settings › Distribution › Payments, and the
  "Payments" page's "Payment Types" tab for the "Article Processing
  Charge"; *Payments & APCs*). Install default: payments off, so no
  "Request Payment" page. With payments enabled and the charge set, the
  two accept decisions gain the page of Rule 16. A press shows the
  Distribution › Payments tab but has no fee page and no payment step; a
  preprint server has neither. <sup>s</sup>
- **"Assignment privileges"** on a participant's "Edit Assignment" window
  (the Participants panel; *Stage participants*): the box "This
  participant is only allowed to recommend an editorial decision and will
  require an authorised editor to record editorial decisions.", after
  which the participant's row reads "Only allowed to recommend an
  editorial decision". Install default: unticked, so an assigned Section
  Editor or Guest Editor decides. Ticked: the editor records
  recommendations through the "Notify Editors" wizard instead (Rule 13),
  and on the Submission stage keeps "Send for Review" ("Send to Internal
  Review" on a press) as a real decision while losing "Accept and Skip
  Review" and "Decline Submission" (Actors). <sup>b</sup>
- **"Signature"** on the Contact tab of the editor's own profile
  (*[User profile](U03-user-profile.md)*). Default: empty, so the letter
  ends with the editor's full name; saved, it ends with the saved text
  instead (Rule 5). Either goes under the template's own closing
  ("Kind regards," on "Decline Submission"), so a signature that itself
  opens with "Kind regards," shows that closing twice. <sup>g</sup>

## Cross-feature interactions

- *[Submission stage](U25-submission-stage.md#send-to-review)*,
  *[Review stage & rounds](U26-review-stage-and-rounds.md#decisions)*,
  *[Copyediting stage](U32-copyediting-stage.md#send-to-production)* and
  *[Production stage](U33-production-stage.md#decline)*: which decision
  buttons each stage shows to whom, and what the recorded decision does to
  that stage's round, lists and status. This spec starts where the button
  is pressed and ends at the closing window. <sup>w</sup>
- *[Workflow screen & stage access](U24-workflow-screen-and-stage-access.md#done)*:
  "Return to Workflow" and "Return to Done", and *[Publish, schedule &
  versions](U49-publish-schedule-and-versions.md)*' publishing, record
  decisions without this wizard (Rule 2). <sup>w</sup>
- *[Internal review stage](U71-internal-review-stage.md#omp2)* {OMP}: the
  empty "Revisions" list of "Accept Submission" and "Create New Review
  Round" on a press's Internal Review is recorded there (Rule 2).
  <sup>w</sup>
- *Tasks & discussions*: the discussions form has a composer of its own
  (no "Insert Content" on its toolbar; its "Attach Files" window offers
  "Upload File" and "Workflow Files"), and its "Request Copyedit", "Assign
  Editor", "Ready for Production" and the other discussion templates are
  not email templates, so "Find Template" never turns them up (Rule 7).
  The discussion a recommendation opens lives on its panel (Rule 13).
  <sup>w</sup>
- *[Author response to reviews](U30-author-response-to-reviews.md)*: its
  request page is another instance of this composer; that spec describes
  its own recipients and template. <sup>w</sup>
- *Stage participants*: the "Edit Assignment" window's "Assignment
  privileges" box that turns decisions into recommendations (Settings).
  <sup>w</sup>
- *[User profile](U03-user-profile.md)*: the "Signature" that ends the
  letter (Settings). <sup>w</sup>
- *Emails management*: the templates and the "Notify All Authors" choice
  (Settings). <sup>w</sup>
- *Submission & Publisher Libraries*: the files "Library Files" offers.
  <sup>w</sup>
- *Submission files*: the lists the "Select Files" copies land in, and the
  file rows' own windows. <sup>w</sup>
- *Submission activity log & notes*: the Activity Log lines and the email
  log entries (Side effects). <sup>w</sup>
- *Notifications center & email preferences*: the header Tasks panel the
  author's task lands in (Side effects); the task's later life is that
  spec's and *[Review stage & rounds](U26-review-stage-and-rounds.md#author-emails)*'.
  <sup>w</sup>
- *[Review setup & review forms](U29-review-setup-and-review-forms.md)*:
  the minimum-reviews setting behind Rule 15. <sup>w</sup>
- *Payments & APCs* {OJS}: the fee behind Rule 16, the payment methods and
  the author's payment page. <sup>w</sup>

## Canonical scenarios

Scenarios 3, 5, 6, 7, 8, 9 and 10 run on a scratch journal with throwaway
accounts, since each reads a mailbox or needs a setting at its non-default
end; every other scenario runs on the seeded journal with ready accounts and
scratch submissions seeded at the stage the decision belongs to. A preprint
server runs scenario 9 alone, which doubles as its absence scenario for the
review pages; the accounts, their passwords, the mail catcher's address, the
wizard addresses typed and the tooling recipe are in the footnote. <sup>s1</sup>

1. **Accept a submission through the wizard** {OJS OMP}

   Given: Editor, assigned to a submission on its first review round with
   two reviews submitted (rows "Review Submitted"), no reviewer file and one
   revision uploaded on the round; and a second submission of the same
   journal on a round with one invited reviewer and no review.

   - **The page and the rail**: on the round press "Accept Submission": a
     full page opens headed "Accept Submission: Notify Authors" with "This
     submission will be accepted for publication and sent for copyediting."
     under it; the rail lists "1 Notify Authors", "2 Notify Reviewers" and
     "3 Select Files", the first numbered and the other two plain text ("3
     Select Files" ignores a click); the breadcrumb reads Dashboard › the
     submission › "Accept Submission" (Rule 1).
   - **"Notify Authors"**: "To" holds the Author's name as a chip with no
     remove control; "Subject:" reads "Your submission has been accepted to
     {journal}"; the letter opens "Dear {the Author's name}," with its
     placeholders shown as their values; above it "Email Templates" lists
     "Submission Accepted" with the first 70 characters of its text (Rules
     3, 4, 5; Fields; Side effects).
   - **"Skip this email" and back**: press "Skip this email" at the bottom
     left of the footer: the wizard moves to "Notify Reviewers" at once, and
     in the rail "Notify Authors" shows a check in place of its "1" and is a
     button; press it: the page reads "This step has been skipped and no
     email will be sent." with the link "Don't skip this email"; press the
     link: the default letter is back (Rules 1, 3).
   - **"Notify Reviewers"**: press "Continue": "To" lists both reviewers as
     chips, each with a remove control; the letter keeps "{$recipientName}"
     on screen as a marked token; "Email Templates" lists "Notify Reviewers
     of Decision" (Rule 4; Side effects).
   - **"Previous" and the rail's buttons**: press "Previous": "Notify
     Authors" shows again with its letter; press "Notify Reviewers" in the
     rail: that page again, nothing checked on the way (Rules 1, 10).
   - **"Attach Files" on a review decision**: press the toolbar's "Attach
     Files": the window "Attach Files" with the panels "Upload File",
     "Review Files", "Submission Files" and "Library Files"; press "Attach
     Review Files": "No items found." and "Back", no reviewer having
     uploaded a file; press "Back", then "Upload File", add a PDF file and
     press "Attach Files": both windows close and the file's chip sits
     under the message; press the chip's cross: it is gone (Rule 6).
   - **"Select Files"**: press "Continue": the heading "Accept Submission:
     Select Files" with the decision's sentence beneath; the panel "Select
     Files" opens with "Select files that should be sent to the copyediting
     stage." and the list "Revisions" holding the revision, ticked, with its
     type, "Download" and the line "Uploaded by {username} on {date}", a
     username where a name would be expected ⚠ [A12](#a12) (Rules 2, 9).
   - **"Record Decision"**: press it: the window "Submission Accepted" · "The
     submission, {title}, has been accepted for publication and sent to the
     copyediting stage. All notifications have been sent, except any you
     chose to skip."; its one control, "View Submission Summary", returns
     to the workflow page the button was pressed on (Rule 11).
   - **After the decision**: the Activity Log reads "{editor} accepted this
     submission and sent it to the copyediting stage." and "An email about
     the decision was sent to 2 reviewer(s) with the subject Thank you for
     your review."; on the round's Reviewers panel each reviewer's row
     reads "Reviewer Thanked" with "Revert Decision" where it read "Review
     Submitted" (Side effects).
   - **Control**: on the second submission "Accept Submission" opens with
     the rail "1 Notify Authors", "2 Select Files" and no "Notify Reviewers"
     page, its round holding no submitted review (Rule 2).

2. **The composer: "Insert Content", "Attach Files", the templates and the refusals** {OJS OMP}

   Given: Editor, assigned to a submission at the Submission stage.

   - **The one-page wizard**: press "Decline Submission": the page is headed
     "Decline Submission" alone, with "This submission will be declined for
     publication. No further review will be conducted and the submission
     will be archived." under it and the rail "1 Notify Authors"; "Email
     Templates" lists "Submission Declined (Pre-Review)" (Rules 1, 11; Side
     effects).
   - **"Insert Content"**: put the cursor at the end of the letter's first
     line and press the toolbar's "Insert Content": a window of that name
     lists every value the letter may carry, each with a description and an
     "Insert" button, the editor's signature shown as raw markup ⚠
     [A8](#a8); type "title" in "Search" and press Enter: the list keeps
     only the rows matching the word, the submission's title among them;
     press its "Insert": the title stands at the cursor (Rule 5).
   - **"Attach Files" › "Upload File"**: press "Attach Files": the window
     "Attach Files" with the panels "Upload File", "Submission Files" and
     "Library Files" and no "Review Files"; press "Upload File": a second
     window with the drop zone "Drag and drop files here. Or upload a file",
     the buttons "Add Files" and "Attach Files", the latter greyed, and
     "Back"; add a PDF file: a progress bar, then its name with "Remove";
     press "Attach Files": both windows close and a chip with the file's
     name and its cross "Remove {file}" sits under the message; press the
     cross: the chip is gone (Rule 6; Fields).
   - **"Add CC/BCC"**: press "Add CC/BCC": the link is replaced by two
     empty boxes "CC:" and "BCC:"; type "not.an.address" in "CC:" (Fields).
   - **"Subject:" emptied**: clear "Subject:" and press "Record Decision":
     the banner "There was a problem with the Notify Authors step." at the
     top of the wizard with "View Error", which opens the page; under
     "Subject:" "This is not a valid string. This field is required." and
     under "CC:" "This is not a valid email address."; nothing is recorded
     (Rule 10; Fields).
   - **"Find Template"**: clear "CC:"; type "Sent to Review" in "Find
     Template": the list reads "Searching", then the results, "Sent to
     Review" among them; press it: the letter is greyed for a moment, then
     "Subject:" reads "Your submission has been sent for review" and
     "Message" holds that template's text, the title inserted earlier gone
     (Rule 7; Fields).
   - **"Record Decision"**: press it: the window "Submission Declined" ·
     "The submission, {title}, has been declined and sent to the archives.
     All notifications have been sent, except any you chose to skip.";
     "View Submission Summary" returns to the workflow page (Rule 11).
   - **The Activity Log**: "{editor} declined this submission." and "An
     email has been sent: Your submission has been sent for review", the
     loaded template's subject (Rule 7; Side effects).
   - **Control**: the Activity Log holds one decision line and one "An
     email has been sent:" line under the loaded subject, and none under
     "Your submission has been declined": the refused press recorded and
     sent nothing (Rule 10).

3. **Request revisions with a reviewer's file attached** {OJS OMP}

   Given: Editor, on a scratch journal whose default review type is Open,
   assigned to a submission on a review round with two reviewers, one whose
   open review is complete (its row reading "Complete") and who uploaded a
   file with it, the other having accepted the request and not yet
   reviewed, the submission's Library holding one file; and to a second
   submission of the same Author on a round with one review submitted.

   - **The choice window**: press "Request Revisions": a side window
     "Request Revisions" with "Require New Review Round": "Revisions will
     not be subject to a new round of peer reviews.", preselected, and
     "Revisions will be subject to a new round of peer reviews.", and a
     "Next" button; press "Next": the wizard opens headed "Request
     Revisions: Notify Authors" with "The author must provide revisions
     before this submission will be accepted for publication." under it and
     the rail "1 Notify Authors", "2 Notify Reviewers" (Rules 1, 2, 14;
     Fields).
   - **"Review Files"**: press "Attach Files", then "Attach Review Files":
     one row "{reviewer} — {file}" with a tick box and "Attach Selected"
     greyed; tick the box and press "Attach Selected": both windows close
     and the file's chip sits under the message (Rule 6).
   - **"Submission Files" and "Other Files"**: press "Attach Files", then
     "Attach Submission Files": the sentence "Attach files uploaded during
     the submission workflow, such as revisions or files to be reviewed.",
     the group "Revisions" first and an "Other Files" dropdown to switch to
     "Review Files"; press "Back": the four panels again (Rule 6).
   - **"Library Files"**: press "Attach Library Files": one row with the
     Library file's name, its type beside it, a "Download" link and a tick
     box; tick it and press "Attach Selected": a second chip under the
     message (Rule 6).
   - **"Notify Reviewers" and the recording**: press "Continue": "To" lists
     the reviewer whose review is complete alone; press "Record Decision":
     the window "Revisions Requested" · "Revisions for the submission,
     {title}, have been requested. All notifications have been sent, except
     any you chose to skip." (Rules 4, 11).
   - **The Author's mailbox**: holds "Your submission has been reviewed and
     we encourage you to submit revisions" from the Editor's name and
     address, with both files attached (Side effects).
   - **The Author's workflow**: Author: open the submission from My
     Submissions: the review stage's "Notifications" list lists the email;
     the header's Tasks panel reads "Revision required." (on a press
     "Revisions to consider in External Review."), linking to the
     submission; the "Read Review" window of the completed review lists the
     reviewer's file under "Reviewer Files" (Rule 6; Side effects).
   - **The Activity Log**: Editor: "{editor} requested revisions for this
     submission." and "An email about the decision was sent to 1
     reviewer(s) with the subject Thank you for your review." (Side
     effects).
   - **"Resubmit for Review" on the second submission**: press "Request
     Revisions", choose "Revisions will be subject to a new round of peer
     reviews." and press "Next": the wizard is headed "Resubmit for Review:
     Notify Authors" with "The author must provide revisions that will be
     sent for another round of review before this submission will be
     accepted for publication." under it; record the decision: the window
     "Revisions Requested" · "Revisions for the submission, {title}, have
     been requested. A decision to send the revisions for another round of
     reviews was recorded. All notifications have been sent, except any you
     chose to skip."; the Author's mailbox holds "Your submission has been
     reviewed - please revise and resubmit" and their Tasks panel now also
     reads "Resubmit for review." (Rules 11, 14; Side effects).
   - **Control**: the reviewer who has not yet reviewed the first
     submission is not listed on its "Notify Reviewers" page and receives
     no email about it, while the other reviewer's "Thank you for your
     review" arrives; on the second submission, where that reviewer's
     review is the submitted one, the "Notify Reviewers" page lists them
     alone (Rules 2, 4; Side effects).

4. **The wizard refuses the wrong hands, the wrong stage and a stale page** {OJS OMP}

   Given: Editor, assigned to a submission at the Submission stage; on the
   same journal a Copyeditor, the submission's Author, a Section Editor not
   assigned to it, and a Journal Manager.

   - **The Copyeditor by address**: Copyeditor: open the "Decline
     Submission" address the Editor's button opens: the
     access-denied page "The current role does not have access to this
     operation." (Actors row 4).
   - **The Author by address**: Author: the same address: the same page and
     sentence (Actors row 4).
   - **The unassigned Section Editor by address**: Section Editor: the same
     address: the access-denied page "You must be assigned to this
     submission in order to record an editorial decision." (Actors row 4).
   - **A decision of another stage**: Editor: open the submission's "Send
     To Production" address, a Copyediting-stage decision: the
     access-denied page "The submission is not at the appropriate stage of
     the workflow to take this decision." (Rule 12).
   - **A wizard left open**: Editor: press "Decline Submission": the wizard
     "Decline Submission" opens; stay on it (Rule 1).
   - **The Journal Manager, not assigned**: Journal Manager: in a session of
     their own open the same submission, press "Send for Review" (on a
     press "Send to External Review") and record the decision, no
     assignment being needed (Actors row 1).
   - **"Record Decision" on the stale wizard**: Editor: press "Record
     Decision": an error window "The submission is not at the appropriate
     stage of the workflow to take this decision."; reload the page: the
     access-denied page with the same sentence (Rules 10, 12).
   - **Control**: the Editor's own press of "Decline Submission" opened the
     wizard at the address that refused the Copyeditor, the Author and the
     unassigned Section Editor (Actors row 1).

5. **Record a recommendation, then change it** {OJS OMP}

   Given: Section Editor whose participation is limited to recommendations,
   on a scratch journal, assigned together with an Editor to a submission
   on a review round with one review submitted; and assigned alone to a
   second submission on a review round.

   - **The recommendation wizard**: on the first submission's round press
     "Recommend Accept": a page headed "Recommend Accept" with "Recommend
     that this submission be accepted for publication and sent for
     copyediting." under it; the panel "Notify Editors" opens with "Send a
     message to the deciding editors to let them know the recommendation.
     Explain why this recommendation was made in response to the
     recommendations and comments submitted by reviewers."; "To" holds the
     Editor as a chip with no remove control; "Email Templates" lists
     "Recommendation Made", whose letter reads "My recommendation is:
     Accept Submission."; the footer has no "Skip this email" (Rules 1, 11,
     13; Actors rows 5, 6).
   - **"Record Decision"**: press it: the window "Recommendation Submitted"
     · "Your recommendation has been recorded and the deciding editor(s)
     have been notified."; back on the round the "Recommendation" box shows
     "Accept Submission" with a "Change decision" button, and the
     submission is still on the same round in review (Rules 11, 13).
   - **The Editor's side**: Editor: the round's "Recommendation" box lists
     the recommendation; the stage's discussions panel lists a discussion
     "Editor Recommendation" holding the letter as its first entry, with
     the Editor as its participant and the Section Editor named only as
     "Created by" ⚠ [A4](#a4); the Editor's mailbox holds "Editor
     Recommendation" from the Section Editor's name and address (Rule 13;
     Side effects; Actors row 10).
   - **The Activity Log**: "{editor} recommended that this submission be
     accepted and sent for copyediting." (Side effects).
   - **"Change decision"**: Section Editor: press "Change decision":
     "Recommend Revisions", "Recommend Accept" and "Recommend Decline" are
     back; press "Recommend Decline": the page headed "Recommend Decline"
     with "Recommend that the submission be declined for publication."
     under it; record: the "Recommendation" box on the Section Editor's
     round and on the Editor's reads "Decline Submission", and the Editor's
     discussions panel lists a second "Editor Recommendation" (Rule 13).
   - **No deciding editor**: Section Editor: open the second submission's
     round: no recommendation button; open its "Recommend Accept" address:
     a bare "404 Not Found" page (Actors row 2; Rule 12).
   - **Control**: on the first submission the Section Editor's round offers
     no "Accept Submission", "Request Revisions" or "Decline Submission",
     and the "Accept Submission" address answers the access-denied page
     "You do not have permission to record this decision on this
     submission." (Actors row 4; Settings bullet 6).

6. **Accept with the reviewers notified, below and at the minimum** {OJS OMP}

   Given: Editor, on a scratch journal whose "Minimum Confirmed Reviews
   Required" is 2, assigned to three submissions: one on a review round
   with two reviews submitted (rows "Review Submitted") and no file; one
   whose two reviews the Editor has confirmed (rows "Complete"); and one on
   its second review round, that round holding one invited reviewer.

   - **The warning**: on the first submission press "Accept Submission":
     the dialog "Proceed Without Minimum Confirmed Reviews?" / "The minimum
     number of confirmed reviews has not been met. Do you still want to
     proceed with this editorial decision?" with "Yes, Continue" and
     "Cancel"; press "Cancel": the round is unchanged and no wizard opens;
     press "Accept Submission" again and "Yes, Continue": the wizard
     "Accept Submission: Notify Authors" (Rule 15).
   - **"Notify Reviewers" emptied**: press "Continue"; remove both chips
     from "To"; press "Continue" (the "Select Files" page lists no file) and
     "Record Decision": the banner "There was a problem with the Notify
     Reviewers step." with "View Error", which opens the page, where "To:"
     reads "None" with no message under it ⚠ [A7](#a7); the box offers the
     round's reviewers back: put both back and press "Continue" (Fields;
     Rule 10).
   - **"Record Decision" with nothing ticked**: on "Select Files" press
     "Record Decision": the window "Submission Accepted"; nothing is
     copied: the "Copyediting" entry's "Draft Files" list is empty (Rules
     9, 11).
   - **The reviewers' side**: each reviewer's mailbox holds "Thank you for
     your review" from the Editor's name and address, carrying that
     reviewer's own name and the sentence "We have chosen to accept this
     submission without revisions."; on the round each reviewer's row
     reads "Reviewer Thanked" with "Revert Decision" where it read "Review
     Submitted"; the Activity Log reads "An email about the decision was
     sent to 2 reviewer(s) with the subject Thank you for your review."
     (Rule 4; Side effects).
   - **The minimum met**: on the second submission press "Accept
     Submission": the wizard opens at once, no dialog (Rule 15).
   - **"Cancel"**: press the footer's "Cancel": the dialog "Cancel Decision"
     / "Are you sure you want to cancel this decision?" with "Cancel
     Decision" and "Keep Working"; press "Keep Working": the wizard stays
     as it was; press "Cancel" again and "Cancel Decision": the workflow
     page, the submission still on its round and the Activity Log without a
     decision line (Rule 11).
   - **"Cancel Review Round"**: on the third submission press "Cancel Review
     Round": no dialog asks; the wizard "Cancel Review Round: Notify
     Authors" with "Cancel the current round of review and send the
     submission back to the last round of review. If this is the first
     review round, it will be moved to the submission stage." under it and
     the rail "1 Notify Authors", "2 Notify Reviewers", the second page
     listing the invited reviewer; record the decision: the window
     "Cancelled the latest round of review." · "The review round for the
     submission, {title}, has been cancelled. All notifications have been
     sent, except any you chose to skip."; the invited reviewer's mailbox
     holds "Your review for "{title}" has been cancelled", whose text on a
     press reads "{$journalName}" where the press's name should be ⚠
     [OMP1](#omp1); the Activity Log reads "{editor} cancelled the review
     round." (Rules 2, 11, 15; Side effects).
   - **Control**: "Decline Submission" pressed on the first submission
     before its accept opened "Decline Submission: Notify Authors" at once,
     though the round was below the minimum, and "Cancel" › "Cancel
     Decision" closed it with nothing recorded (Rules 11, 15).

7. **Decline: the author's email, the contributor's copy, then a skipped revert** {OJS OMP}

   Given: Editor, on a scratch journal whose "Submission Declined
   (Pre-Review)" template has been edited to open with "This letter was
   edited for the test." and which has an alternative to it named "Decline,
   short form" with the subject "A short decline", assigned to a submission
   at the Submission stage holding one submission file, whose Author holds
   an account on the journal and whose Contributors list carries a second
   contributor with an email address and no account.

   - **The edited template and its alternative**: press "Decline
     Submission": the letter opens with "This letter was edited for the
     test."; "Email Templates" lists "Submission Declined (Pre-Review)"
     first, then "Decline, short form"; press "Decline, short form": after
     the pause "Subject:" reads "A short decline"; press "Submission
     Declined (Pre-Review)": the edited letter is back (Rule 7; Settings
     bullet 2).
   - **"Submission Files"**: press "Attach Files", then "Attach Submission
     Files": the sentence "Attach files uploaded by the author in the
     submission stage." and the file's row with a tick box; tick it and
     press "Attach Selected": the file's chip under the message (Rule 6).
   - **"Add CC/BCC"**: press "Add CC/BCC" and type the Journal Manager's
     email address in "CC:" (Fields).
   - **"Record Decision"**: press it: the window "Submission Declined"
     (Rule 11).
   - **The Author's mailbox**: holds "Your submission has been declined"
     from the Editor's name and address, its text opening "This letter was
     edited for the test.", the file attached and the Journal Manager's
     address on its CC line (Side effects; Fields).
   - **The contributor's mailbox**: holds an email under the same subject,
     opening "The following email was sent to {author} from {journal}
     regarding "{title}"." and quoting the letter (Side effects; Settings
     bullet 1).
   - **"Revert Decline" with the email skipped**: press "Revert Decline":
     the one-page wizard; press "Skip this email": the notice "This step
     has been skipped and no email will be sent." with "Don't skip this
     email", the page staying since none follows; press "Record Decision":
     the window "Submission Reactivated" · "The submission, {title}, is now
     active in the submission stage. The author has been notified, unless
     you chose to skip that email." (Rules 3, 11).
   - **The mailboxes after the revert**: the Author's holds no "We have
     reversed the decision to decline your submission" and the
     contributor's nothing new; the Activity Log reads "{editor} reversed
     the decision to decline this submission." (Rule 3; Side effects).
   - **Control**: the decline's email reached both mailboxes, so the empty
     result after the skipped revert is the skip's doing and not a delay
     (Rule 3).

8. **Decline in French, to the assigned authors alone** {OJS OMP}

   Given: Editor, on a scratch journal with French as a second form
   language and "Notify All Authors" set to "Only send an email to authors
   assigned to the submission workflow. Usually, this is the submitting
   author.", assigned to a submission at the Submission stage whose Author
   holds an account on the journal and whose Contributors list carries a
   second contributor with an email address and no account.

   - **"Switch to: French"**: press "Decline Submission": under the
     templates the line "Switch to:" with the link "French"; press it: the
     dialog "Switch to French" / "Are you sure you want to change to French
     to compose this email? Any changes you have made to the subject and
     body of the email will be lost." with "Switch to French" and "Cancel";
     press "Switch to French": "Subject:" and "Message" hold the decision's
     template in French, while the "Email Templates" entry above keeps its
     English snippet ⚠ [A10](#a10) (Rule 8; Fields).
   - **"Record Decision"**: press it: the window "Submission Declined"; the
     Author's mailbox holds the email under the French subject the page
     showed (Rule 8; Side effects).
   - **The contributor's mailbox**: holds nothing, the Author's email
     having arrived (Settings bullet 1).
   - **Control**: on the seeded journal, whose forms have one language, a
     wizard shows no "Switch to:" line under the templates (Rule 8;
     Settings bullet 3).

App-specific:

9. **{OPS} Decline and revert a preprint**

   Given: Preprint Server Manager, on a scratch preprint server, with a
   submitted preprint whose Author holds an account on the server and to
   which a Moderator whose participation is limited to recommendations is
   assigned.

   - **The one-page wizard**: open the preprint's "Production" entry and
     press "Decline Submission": the page headed "Decline Submission" alone
     with "This submission will be declined for publication. No further
     review will be conducted and the submission will be archived." under
     it and the rail "1 Notify Authors" alone; "Email Templates" lists
     "Submission Declined"; the footer holds "Skip this email", "Cancel"
     and "Record Decision" (Rules 1, 2, 10; Side effects).
   - **"Attach Files"**: press it: the window offers "Upload File" and
     "Library Files" alone [OPS1](#ops1); press "Upload File", add a PDF
     file and press "Attach Files": the file's chip under the message (Rule
     6).
   - **"Insert Content"**: press it: the window lists the letter's values,
     the row for the server's initials described
     "##emailTemplate.variable.context.contextAcronym##" ⚠ [OPS2](#ops2);
     press "Insert" on the server's name: it stands at the cursor (Rule 5).
   - **"Record Decision"**: press it: the window "Submission Declined" ·
     "The submission, {title}, has been declined and sent to the archives.
     All notifications have been sent, except any you chose to skip."; its
     one control, "View Submission Summary", closes it (Rule 11).
   - **The Author's mailbox and the Activity Log**: the mailbox holds "Your
     submission has been declined" from the Manager's name and address with
     the file attached; the Activity Log reads "{editor} declined this
     submission." (Side effects).
   - **"Revert Decline" with the email skipped**: on the "Production" entry
     press "Revert Decline": the one-page wizard; press "Skip this email"
     and "Record Decision": the window "Submission Reactivated" · "The
     submission, {title}, is now active in the submission stage. The author
     has been notified, unless you chose to skip that email.", the stage
     named being one the server has not got
     (*[Production stage](U33-production-stage.md#ops2)*); the Author's
     mailbox holds no "We have reversed the decision to decline your
     submission"; the Activity Log reads "{editor} reversed the decision to
     decline this submission." (Rules 3, 11; Side effects).
   - **The Moderator limited to recommendations**: Moderator: open the
     preprint at "Production": "Post the preprint" alone and no
     "Recommendation" box; open the "Recommend Accept" address (Rule 12):
     "This decision could not be found. Please provide a recognized
     decision type." [OPS1](#ops1) (Actors row 2).
   - **The Author by address**: Author: open the "Decline Submission"
     address: the access-denied page "The current role does not
     have access to this operation." (Actors row 4).
   - **Control**: the review pages never appear: no "Notify Reviewers",
     "Notify Editors" or "Select Files" in the rail and no "Submission
     Files" or "Review Files" panel in "Attach Files", while "Notify
     Authors", "Upload File" and "Library Files" are there [OPS1](#ops1)
     (Purpose).

10. **{OJS} "Request Payment" on a fee-charging journal**

    Given: Editor, on a scratch journal with payments enabled and an
    "Article Processing Charge" set, assigned to a submission at the
    Submission stage whose Author holds an account on the journal; and, on
    the seeded journal, where payments are off, a second such submission.

    - **"Request Payment"**: press "Accept and Skip Review": the wizard opens
      headed "Accept and Skip Review: Request Payment" with the rail "1
      Request Payment", "2 Notify Authors", "3 Select Files"; the choice
      "Payment" offers "Request publication fee ({amount} {currency})",
      preselected, and "Waive" ⚠ [OJS1](#ojs1) (Rules 2, 16; Fields).
    - **"Record Decision"**: press "Continue" twice and "Record Decision":
      the window "Skipped Review" · "The submission, {title}, skipped the
      review stage and has been sent to the copyediting stage. The author
      has been notified, unless you chose to skip that email." (Rule 11).
    - **The Author's side**: Author: the header's Tasks panel reads "The
      publication fee is due for payment."; the mailbox holds "Payment
      Request Notification" from the journal's principal contact and "Your
      submission has been sent for copyediting" from the Editor (Rule 16;
      Side effects).
    - **Control**: on the seeded journal "Accept and Skip Review" opens
      headed "Accept and Skip Review: Notify Authors" with no "Request
      Payment" page (Settings bullet 5).

11. **{OMP} The press's internal review decisions**

    Given: Press Editor, on the seeded press, assigned to three monographs:
    one at the Submission stage holding one submission file, one on an
    internal review round with one review submitted, and one on an external
    review round with one review submitted.

    - **"Send to Internal Review"**: on the first monograph press it: the
      wizard headed "Send to Internal Review: Notify Authors" with "This
      submission is ready to be sent for internal review." under it and the
      rail "1 Notify Authors", "2 Select Files"; "Email Templates" lists
      "Sent to Internal Review" and "Subject:" reads "Your submission has
      been sent for internal review"; press "Continue": the panel "Select
      Files" opens with "Select files that should be sent to the internal
      review stage." and the list "Submission Files" holding the file,
      ticked; record the decision: the window "Sent for Internal Review" ·
      "The submission, {title}, has been sent to the internal review stage.
      The author has been notified, unless you chose to skip that email.";
      the Activity Log reads "{editor} sent this submission to the internal
      review stage." (Rules 2, 9, 11; Side effects).
    - **"Request Revisions" on the internal round**: on the second monograph
      press "Request Revisions": no choice window; the wizard opens at once
      headed "Request Revisions: Notify Authors"; press "Cancel" and "Cancel
      Decision" (Rules 11, 14).
    - **"Send to External Review" from the internal round**: press "Send to
      External Review": the wizard headed "Send to External Review: Notify
      Authors" with "This submission is ready to be sent for peer review."
      under it and the rail "1 Notify Authors", "2 Select Files"; "Email
      Templates" lists "Sent to Review"; record the decision: the window
      "Sent for External Review" · "The submission, {title}, has been sent
      to the external review stage."; the Activity Log reads "{editor} sent
      this submission to the external review stage." (Rules 2, 11; Side
      effects).
    - **Control**: on the third monograph "Request Revisions" opens the side
      window "Request Revisions" with "Require New Review Round" first, and
      its close control abandons the choice with nothing opened (Rule 14).

## Coverage

Left out of the scenarios above, by reason:

- **Budget** — variants:
  - a "Signature" saved on the editor's profile, ending the letter in place of the editor's full name (Settings bullet 7; Rule 5)
- **Nothing new to test**:
  - a Section Editor or Guest Editor assigned and deciding, a Production editor, or a Site Administrator recording a decision (Actors row 1): the wizard scenario 1 walks as the Editor
  - "Message" emptied (Fields; Rule 10): the banner and "This is not a valid string. This field is required." scenario 2 reads under "Subject:"
  - leaving the wizard through the breadcrumb's "Dashboard" (Rule 11): the unrecorded outcome scenario 6 reads after "Cancel Decision"
  - recording under "Login As" (Side effects): the same Activity Log line, naming the editor acted as
- **Register carries it**:
  - A6 ("Revert Decline" typed on a submission never declined; Rule 12)
  - A11 (a review-stage decision typed with a past round's number; Rule 12)
  - A8 and OPS2 (the "Insert Content" rows shown as markup, the empty address row and the untranslated row; Rule 5; scenarios 2 and 9 mark them)
  - A9 (a Section Editor's "Find Template" refused; Rule 7)
  - A2 (the wizard with no page and its closing sentence; Rule 2)
  - A1 (the "New Review Round" heading under "Create New Review Round"; Rule 2)
  - OJS1 ("Waive" requesting the fee; Rule 16; scenario 10 marks it)
  - A5 (the author notices no screen shows; Side effects)
  - A4 (the recommendation's discussion without its writer; Rule 13; scenario 5 marks it)
  - A12 (the "Select Files" row's uploader shown by username; Rule 9; scenario 1 marks it)
- **Owned by another feature**:
  - a recommending editor's "Send for Review" ("Send to Internal Review" on a press) recorded as a real decision (Actors row 3; Settings bullet 6; *Submission stage*)
  - the ticked files' copies landing in the next stage's list (Rule 9; Side effects; *Copyediting stage*, scenario 2, and *Production stage*, scenario 2)
  - the closing window of "Send for Review", "Accept and Skip Review", "New Review Round", the review round's "Decline Submission" and "Revert Decline", "Send To Production", "Move to Review" and "Move To Copyediting" (Rule 11; *Submission stage*, *Review stage & rounds*, *Copyediting stage* and *Production stage*)
  - a declined preprint's workflow landing on "Title & Abstract" after "View Submission Summary" (Rule 11; *Production stage*, scenario 9)
  - the empty "Revisions" list of "Accept Submission" and "Create New Review Round" on a press's Internal Review after the author's revision (Rule 2; *Internal review stage*, its register's OMP2)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-20), unreviewed unless an
entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A6](#a6) | "Revert Decline" typed by address on a submission never declined records it and emails the author | 🐞 | minor | — |
| [A9](#a9) | A Section Editor's "Find Template" answers an "Error" window and no results | 🐞 | user-visible | — |
| [OJS1](#ojs1) | "Waive" on "Request Payment" requests the fee like "Request publication fee" | 🐞 | user-visible | — |
| [OMP1](#omp1) | A press's "Review Cancel" email reads "{$journalName}" where the press's name should be | 🐞 | minor | — |
| [OPS2](#ops2) | "Insert Content" describes the server's initials with an untranslated key | 🐞 | minor | — |
| [A1](#a1) | "Create New Review Round" opens a wizard headed "New Review Round" | ❓ | minor | — |
| [A2](#a2) | A decision with no author assigned opens a wizard with no page, and its closing window still reports an email | ❓ | minor | — |
| [A4](#a4) | The discussion a recommendation opens lists the deciding editors, not the editor who wrote it | ❓ | minor | — |
| [A5](#a5) | Most decisions leave the author a notice that no screen shows | ❓ | invisible | — |
| [A7](#a7) | An emptied "To:" on "Notify Reviewers" is refused with the banner alone; the box reads "None" | ❓ | minor | — |
| [A8](#a8) | "Insert Content" lists the reviewers' comments and the signature as raw markup | ❓ | minor | — |
| [A10](#a10) | After the language switch the "Email Templates" entry keeps its first-language snippet | ❓ | minor | — |
| [A11](#a11) | A review-stage decision typed with a past round's number opens the wizard for that round | ❓ | minor | — |
| [A12](#a12) | A "Select Files" row names its uploader by username: "Uploaded by {username} on {date}" | ❓ | minor | — |
| [A3](#a3) | Retired: the "Notify Reviewers" letter keeps "{$recipientName}" and each email carries one name | ✅ | retired | — |
| [OPS1](#ops1) | A preprint server's wizard has "Decline Submission" and "Revert Decline" alone, with no review page and a two-source "Attach Files" | ✅ | user-visible | — |

### All apps

<a id="a1"></a>
**A1 — Wizard heading differs from the button** · ❓ · minor.
The review stage's button reads "Create New Review Round"; the wizard it
opens is headed "New Review Round", its breadcrumb and closing window
using the shorter name too. A tester matching the heading to the button
does not find it.
Question: should the wizard carry the button's name? Lean: intended
shortening, ✅; the closing window's "Review Round Created" reads well.
Basis: probe. <sup>[f-a1](#fn-a1)</sup>

<a id="a2"></a>
**A2 — A wizard with nothing on it** · ❓ · minor.
When no Author is assigned to the stage (the submitter's assignment was
removed on the Participants panel), a decision whose only page would be
"Notify Authors" ("Decline Submission", "Revert Decline", "Move to
Review", "Move To Copyediting") opens as a heading, a sentence and a
footer with "Cancel" and "Record Decision", and records at once; its
closing window still reads "All notifications have been sent, except any
you chose to skip." ("Submission Declined") or "The author has been
notified, unless you chose to skip that email." ("Submission
Reactivated"), though nobody was emailed and the Activity Log shows no
email line.
Question: should the wizard say that nobody will be notified? Lean: 🐞
minor for the closing sentence, which reports an email that was not
sent; recording at once is right for a rare state.
Basis: probe. <sup>[f-a2](#fn-a2)</sup>

<a id="a4"></a>
**A4 — The recommender is not on their own discussion** · ❓ · minor.
The discussion "Notify Editors" opens lists the deciding editor alone
under "Participants" and shows the recommending editor only as "Created
by" on the row and "Message from" in the window, so the editor who wrote
it does not see it on their discussions panel and cannot follow the
replies.
Question: should the recommending editor be a participant? Lean: 🐞, the
reply is addressed to them.
Basis: probe. <sup>[f-a4](#fn-a4)</sup>

<a id="a5"></a>
**A5 — Author notices nobody sees** · ❓ · invisible.
Every decision but the two revision ones writes the author a notice
("Submission accepted.", "Submission declined.", "External review process
started.", "A new round of reviews was initiated.", "Declined submission
reactivated.", "Production process started."), replacing the previous
one; no current screen lists them, neither the workflow page nor the
header Tasks panel, which shows tasks only.
Question: is the record still wanted? Lean: ✅ a leftover of the earlier
author dashboard; nothing is lost on screen.
Basis: probe. <sup>[f-a5](#fn-a5)</sup>

<a id="a6"></a>
**A6 — "Revert Decline" recorded on a submission never declined** · 🐞 · minor.
A Journal Manager who types the "Revert Decline" address for a queued
submission (or for an active review round) expects the refusal a decision
the stage does not offer gets. The wizard opens; "Record Decision" closes
on "Submission Reactivated", the author receives "We have reversed the
decision to decline your submission" and the Activity Log reads "{editor}
reversed the decision to decline this submission.", though no decline was
ever recorded; the same on a press and on a preprint server. Reachable by
address only: the button is offered on a declined submission alone.
Basis: probe. <sup>[f-a6](#fn-a6)</sup>

<a id="a7"></a>
**A7 — An emptied reviewers list is refused without a message** · ❓ · minor.
With every chip removed from "Notify Reviewers", "Record Decision" shows
the banner "There was a problem with the Notify Reviewers step." and "View
Error" opens the page, where the "To:" box reads "None" and carries no
message, while every other refused box names its problem under itself.
Question: should the box carry "This field is required." like the others?
Lean: 🐞; the banner alone leaves the editor to guess.
Basis: probe. <sup>[f-a7](#fn-a7)</sup>

<a id="a8"></a>
**A8 — "Insert Content" shows markup and an empty row** · ❓ · minor.
The "Insert Content" window lists the reviewers' comments (on a
review-stage page) and the editor's signature (on every page) as raw
markup, "\<p\>", "\<strong\>", "\<br\>" and links shown as text, and the
journal's mailing address as a row with no value.
Question: should the window render the values as the letter will? Lean:
🐞; the window is there for the editor to read and pick from.
Basis: probe. <sup>[f-a8](#fn-a8)</sup>

<a id="a9"></a>
**A9 — A Section Editor's template search is refused** · 🐞 · user-visible.
A Section Editor recording a decision expects "Find Template" to search
like the "Email Templates" list beside it. Typing a phrase opens an
"Error" window reading "You are not authorized to access the requested
resource." with "OK"; after it the phrase stays in the box over an empty
list until "Clear search phrase". A Journal Manager's or Editor's search
works; a Moderator on a preprint server is refused the same way.
Basis: probe. <sup>[f-a9](#fn-a9)</sup>

<a id="a10"></a>
**A10 — The template list stays in the first language after a switch** · ❓ · minor.
After "Switch to: French" the letter and the recipients' names are French,
but the "Email Templates" entry above still shows its snippet in the first
language.
Question: should the list follow the composer's language? Lean: ✅; the
list is the interface's, the letter is the mail's.
Basis: probe. <sup>[f-a10](#fn-a10)</sup>

<a id="a11"></a>
**A11 — A past round's decision opens by address** · ❓ · minor.
A review-stage decision typed with a past round's number on a submission
at a later round opens the wizard ("Accept Submission: Notify Authors",
the past round's reviewers on "Notify Reviewers") instead of the refusal a
stage the submission has left gets. What "Record Decision" would do to the
past round was not recorded.
Question: should the wizard refuse a round that is not the current one?
Lean: 🐞; the stage is checked, the round is not. The observation that
settles it: record "Accept Submission" from the past round's address and
read which round's status and files change.
Basis: probe. <sup>[f-a11](#fn-a11)</sup>

<a id="a12"></a>
**A12 — The "Select Files" row names its uploader by username** · ❓ · minor.
An editor reading a "Select Files" row expects the uploader named the way
the "To" chips and the "Attach Review Files" rows name people. The row's
line reads "Uploaded by {username} on {date}" with the account's username
instead, on a journal and a press alike.
Question: should the line carry the uploader's name? Lean: 🐞 minor; the
line is written for a person to read, and a username is not a name.
Basis: test run. <sup>[f-a12](#fn-a12)</sup>

### OJS

<a id="ojs1"></a>
**OJS1 — "Waive" requests the fee** · 🐞 · user-visible.
An Editor who chooses "Waive" on the "Request Payment" page expects the
decision recorded with no fee. The fee is queued all the same, the
author's header Tasks panel gains "The publication fee is due for
payment." and the "Payment Request Notification" email arrives, exactly as
with "Request publication fee".
Basis: probe. <sup>[f-ojs1](#fn-ojs1)</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The press's "Review Cancel" email leaves "{$journalName}" unfilled** · 🐞 · minor.
A reviewer emailed by "Cancel Review Round" on a press reads "…agreeing to
review "{title}" for {$journalName}." where the press's name should be; a
journal's reviewer reads the journal's name.
Basis: probe. <sup>[f-omp1](#fn-omp1)</sup>

### OPS

<a id="ops1"></a>
**OPS1 — A two-decision wizard on a preprint server** · ✅ · user-visible.
A preprint server's only decisions are the Production stage's "Decline
Submission" and "Revert Decline", each a one-page wizard; its "Attach
Files" window offers "Upload File" and "Library Files" and no submission
file source; it records no recommendations, so a Moderator limited to
recommendations is offered no decision at all ("Post the preprint" alone,
no "Recommendation" box) and a typed recommendation address reads "This
decision could not be found. Please provide a recognized decision type.";
it asks no minimum-reviews question. A journal or press runs the full
roster of Rule 2.
Basis: probe. <sup>[f-ops1](#fn-ops1)</sup>

<a id="ops2"></a>
**OPS2 — An untranslated row in "Insert Content"** · 🐞 · minor.
On a preprint server the "Insert Content" row for the server's initials is
described "##emailTemplate.variable.context.contextAcronym##"; a journal's
reads "The journal's initials", a press's "The press's initials".
Basis: probe. <sup>[f-ops2](#fn-ops2)</sup>

### Retired

<a id="a3"></a>
**A3 — Reviewer names shown where one will be sent** · ✅ · retired. Overturned on screen 2026-09-20 (OJS and OMP): the "Notify Reviewers" letter keeps "{$recipientName}" as a marked token and each reviewer's email carries that reviewer's own name whether or not the text was edited (Rule 4); the code reading behind the entry did not hold. <sup>[f-a3](#fn-a3)</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-20 at the checkouts' tips (`checkouts/ojs`, `checkouts/omp`,
`checkouts/ops`, each with its `lib/pkp` and `lib/ui-library`), and every
rule, row and side effect driven the same day on running installs of all
three apps by this spec's own checks: the "Live-probed 2026-09-20" sentence
in each note says what was seen. Earlier features' drives are cited with
their own dates.

<a id="fn-a"></a>
**a** — The page: `lib/pkp/pages/decision/DecisionHandler.php::record()` (route `decision/record/{submissionId}?decision=N[&reviewRoundId=M]`, dispatched by each app's `pages/decision/index.php` with no subclass), rendering `lib/pkp/templates/decision/record.tpl` around `lib/ui-library/src/components/Container/DecisionPage.vue`. Heading: `{translate key="semicolon" label=$decisionType->getLabel()} {{ currentStep.name }}` when `steps.length > 1` (`semicolon` is "{$label}: "), the label alone otherwise; `app__pageDescription` is `$decisionType->getDescription()`. Rail: `<steps>` with `label` `editor.decision.completeSteps` "Complete the following steps to take this decision" (the list's accessible name), `progress-label` `common.showingSteps` "{$current}/{$total} steps", `show-steps-label` `common.showAllSteps` "Show all steps"; `Steps.vue` renders a numbered `<ol>`, a visited step (`startedSteps`) as a `<button>`, an unvisited one as a `<span>`, and switches to `collapsed` when the buttons' summed width exceeds the container. Breadcrumb: `DecisionHandler::getBreadcrumb()` (`navigation.dashboard` "Dashboard", then `getShortAuthorString()` + `getLocalizedFullTitle()` limited to 50 characters with "...", then the label); browser title `getLabel() | authors-or-title`. The buttons that open it: `lib/ui-library/src/pages/workflow/composables/useWorkflowDecisions.js::openDecisionPage()` redirects to the page with `decision`, `ret` (the dashboard address to return to), `reviewRoundId` and `stageId`. Live-driven 2026-09-19 and 2026-09-20 by the Copyediting and Production stages' suites on all three apps: the heading "{Decision}: {Step}" on multi-step wizards and "{Decision}" alone on one-step ones, the rail item "1 Notify Authors", "Continue", "Record Decision" (`apps/*/playwright/pages/{CopyeditingStagePages,ProductionStagePages,DecisionPage}.js`). Live-probed 2026-09-20 (Rules 1, 10, 11; all three apps): the heading "Accept Submission: Notify Authors" and the sentence under it; the rail "1 Notify Authors", "2 Notify Reviewers", "3 Select Files", a visited or skipped item a button with a check in place of its number, the current one numbered, an unreached one plain text that ignores a click; the breadcrumb Dashboard › the submission › the decision; in a narrow window the collapsed rail's "{n}/{total} steps" count and its unfold button.

<a id="fn-b"></a>
**b** — Permissions: `DecisionHandler::__construct()` role-assigns `record` to `ROLE_ID_MANAGER`, `ROLE_ID_SITE_ADMIN`, `ROLE_ID_SUB_EDITOR` (an assistant, author, reviewer or reader fails `RoleBasedHandlerOperationPolicy` and lands on `user/authorizationDenied`, the access-denied page); `authorize()` stacks `UserRequiredPolicy`, `ContextAccessPolicy`, `SubmissionRequiredPolicy`, `DecisionWritePolicy` = `DecisionTypeRequiredPolicy` (an unknown `decision` number denies with `editor.submission.workflowDecision.typeInvalid`) + `DecisionStageValidPolicy` (`$submission->stageId === $decisionType->getStageId()`, else `editor.submission.workflowDecision.invalidStage`) + `DecisionAllowedPolicy` (`lib/pkp/classes/security/authorization/DecisionAllowedPolicy.php`): with no stage assignment at the active stage, a `ROLE_ID_SITE_ADMIN` or `ROLE_ID_MANAGER` user is permitted and anyone else denied with advice `editor.submission.workflowDecision.noUnassignedDecisions` "You must be assigned to this submission in order to record an editorial decision."; with assignments, a manager- or sub-editor-group assignment permits when `!recommendOnly`, or when `recommendOnly` and the decision `isRecommendation()`, or when the decision is in `getDecisionTypesMadeByRecommendingUsers($stageId)` (OJS `classes/decision/Repository.php`: `[new SendExternalReview()]` at `WORKFLOW_STAGE_ID_SUBMISSION`; OMP `[new SendInternalReview()]`; OPS none); the policy's own message is `editor.submission.workflowDecision.disallowedDecision` "You do not have permission to record this decision on this submission.". `PKPPageRouter::handleAuthorizationFailure()` redirects to `user/authorizationDenied?message=<key>`, so the denied page prints the failing policy's message. `record()` itself throws `NotFoundHttpException` (the bare "404 Not Found" page) when the stage does not match, when a review-stage decision lacks a `reviewRoundId` or the round is not the submission's, when a `DecisionRetractable` decision (`CancelReviewRound`) cannot retract, and when a recommendation is opened with no deciding editor (`StageAssignment … withRecommendOnly(false)` empty). The API twin: `PKPSubmissionController::addDecision()` (`POST submissions/{id}/decisions`) under the same `DecisionWritePolicy`, answering the `Repo::decision()->validate()` errors as 400. The same-role ordering in the Actors table: the deciding roles of the stage specs. Live-probed 2026-09-20 (Actors rows 1–4, Rule 12; all three apps): an assistant, a reviewer, an author and a reader read "The current role does not have access to this operation."; an unassigned Section Editor "You must be assigned to this submission in order to record an editorial decision."; an unassigned Journal Manager opens the wizard; a decision of another stage, and a bookmarked page reloaded after the submission moved on, read "The submission is not at the appropriate stage of the workflow to take this decision." (the `DecisionStageValidPolicy` advice on the access-denied page, not the handler's 404); a review-stage decision typed without its round, with a missing round or another submission's round, and a recommendation with no deciding editor assigned answer the bare "404 Not Found"; an unknown decision number, and on the preprint server every number but its two (recommendations included), "This decision could not be found. Please provide a recognized decision type."; a recommending editor typing a decision "You do not have permission to record this decision on this submission." and, on a press, the same for "Send to External Review" while "Send to Internal Review" opens; a hand-typed "Revert Decline" on a never-declined submission opens and records (A6); a past round's number opens the wizard (A11).

<a id="fn-c"></a>
**c** — The page roster is each type's `getSteps()` (`lib/pkp/classes/decision/types/*.php`), each `Steps::addStep()` dropping a step whose `isValidStep()` is false, which for `steps/Email.php` means "no recipients" (`$this->recipients` after filtering `getDisabled()` users); every type also guards the authors' step with `if (count($authors))` on `Steps::getStageParticipants(ROLE_ID_AUTHOR)` (authors assigned at `getStageId()`). `SendExternalReview` (trait `InSubmissionStage`): `Email` `notifyAuthors` + `PromoteFiles` `promoteFilesToReview` (`editor.submission.selectFiles` "Select Files", `editor.submission.decision.promoteFiles.externalReview`, target `SUBMISSION_FILE_REVIEW_FILE`) listing `submission.submit.submissionFiles` "Submission Files" (`SUBMISSION_FILE_SUBMISSION`, `selectedByDefault` true); `SkipExternalReview`: the same lists, target `SUBMISSION_FILE_FINAL`, description `…promoteFiles.copyediting`; `InitialDecline`, `RevertInitialDecline`, `RevertDecline`, `BackFromCopyediting`, `BackFromProduction`: the authors' step alone; `Accept` (trait `InExternalReviewRound`): authors, then `notifyReviewers` when `getReviewAssignments(…, REVIEW_ASSIGNMENT_COMPLETED)` (status in `ReviewAssignment::REVIEW_COMPLETE_STATUSES`: `RECEIVED`, `VIEWED`, `COMPLETE`, `THANKED`, the rows "Review Submitted", "Review Viewed", "Complete", "Reviewer Thanked") is non-empty, with `canChangeRecipients(true)` and `anonymizeRecipients(true)`, then `PromoteFiles` `promoteFilesToCopyediting` listing `editor.submission.revisions` "Revisions" (`SUBMISSION_FILE_REVIEW_REVISION` of the round); `RequestRevisions`, `Resubmit`, `Decline`: authors + reviewers (completed); `NewExternalReviewRound`: authors + `PromoteFiles` "Revisions" (target `SUBMISSION_FILE_REVIEW_FILE`); `CancelReviewRound`: authors + reviewers with `REVIEW_ASSIGNMENT_ACTIVE` (`!getDeclined() && !getCancelled()`) through `ReviewCancel`, `canChangeRecipients(true)`; `SendToProduction`: authors + `PromoteFiles` `promoteFilesToProduction` listing `submission.copyedited` "Copyedited" (ticked) and `submission.finalDraft` "Draft Files" (`false`); the four `Recommend*` types (trait `IsRecommendation`): one `Email` `discussion` "Notify Editors" with `canSkip(false)`. OJS `classes/decision/types/{Accept,SkipExternalReview}.php` prepend `RequestPayment::getPaymentForm()` when `getPaymentManager($context)->publicationEnabled()` (note s). OMP `classes/decision/types/`: `SendInternalReview` (authors + "Select Files" listing "Submission Files", description `…promoteFiles.internalReview`, target `SUBMISSION_FILE_INTERNAL_REVIEW_FILE`), `SkipInternalReview extends PKP SendExternalReview` (the Submission-stage "Send to External Review", label from the OMP override of `editor.submission.decision.sendExternalReview`), OMP `SendExternalReview` with trait `InInternalReviewRound` (the Internal Review stage's button; "Select Files" lists "Revisions" of `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`), and the `*Internal` twins (`AcceptFromInternal`, `RequestRevisionsInternal`, `ResubmitInternal`, `DeclineInternal`, `RevertDeclineInternal`, `NewInternalReviewRound`, `CancelInternalReviewRound`, `Recommend*Internal`, `RecommendSendExternalReview`), which change the decision number and stage, except that `AcceptFromInternal` and `NewInternalReviewRound` inherit lib/pkp's "Revisions" list unchanged, filtered on the external revision file stage (`SUBMISSION_FILE_REVIEW_REVISION`) where an internal round's revised files sit in `SUBMISSION_FILE_INTERNAL_REVIEW_REVISION`, so the list is empty there (the internal review stage spec's note f-omp2). OPS `classes/decision/types/Decline.php extends InitialDecline` and `RevertDecline.php extends RevertInitialDecline`, both with `getStageId()` `WORKFLOW_STAGE_ID_PRODUCTION`. `getLabel()` of `NewExternalReviewRound` is `editor.submission.decision.newReviewRound` "New Review Round" while the workflow button is `editor.submission.createNewRound` "Create New Review Round" (`workflowConfigEditorialOJS.js`, A1). With no author step and no other step, `record.tpl` renders `.decision__footer--noSteps` (A2). Skipping: `record.tpl` `.decision__skipStep` (`editor.decision.skipEmail` "Skip this email", `v-if="currentStep.type === 'email' && currentStep.canSkip && !skippedSteps.includes(currentStep.id)"`); `DecisionPage.vue::toggleSkippedStep()` pushes the id, clears the step's errors and calls `nextStep()` unless the step is the last; the skipped panel shows `editor.decision.emailSkipped` "This step has been skipped and no email will be sent." with `editor.decision.dontSkipEmail` "Don't skip this email". Live-probed 2026-09-20 (Rule 2; OJS and OMP, the preprint server for its two): every row's pages in their order and default ticks; "New Review Round: Notify Authors" under the "Create New Review Round" button (A1); the wizard with no page recording at once (A2); no "Notify Reviewers" on a round with an invited reviewer only, and "Cancel Review Round" listing that reviewer; on the press's Internal Review "Request Revisions" and "Recommend Revisions" opening their wizard with no choice window. Live-probed 2026-09-28 (Rule 2, the rows "Accept Submission" and "Create New Review Round"; OMP, two runs, a scratch press and its Press Editor): on Internal Review Round 1 after "Request Revisions" and the Author's "Upload revisions" of one file (listed under "Revisions Uploaded" on the Author's page, after a reload too), "Accept Submission" › "Select Files" ("Select files that should be sent to the copyediting stage.") and "Create New Review Round" › "Select Files" ("Select files that should be sent for review.") both showed "Revisions" reading "No items found."; on the same round "Send to External Review" › "Select Files" listed the revision, ticked; on External Review Round 1 of the same press in the same state both decisions listed it under "Revisions", ticked. The pages of both decisions and the heading "New Review Round" were as the table gives them on both rounds.

<a id="fn-d"></a>
**d** — The composer: `lib/ui-library/src/components/Composer/Composer.vue`, mounted by `record.tpl` with the labels `common.emailTemplates` "Email Templates" (`loadTemplateLabel`), `common.findTemplate` "Find Template", `common.switchTo` "Switch to", `email.to` "To", `common.addCCBCC` "Add CC/BCC", `email.cc` "CC", `email.bcc` "BCC", `email.subject` "Subject" (each label passed through `semicolon`, so the boxes read "To:", "CC:", "BCC:", "Subject:"), `stageParticipants.notify.message` "Message", `common.attachFiles` "Attach Files", `common.attachedFiles` "Attached Files", `common.insert` "Insert", `common.insertContent` "Insert Content", `common.content` "Content", `common.insertContentSearch` "Find content to insert", `common.numberedMore` "{$number} more", `common.searching` "Searching", `search.searchResults` "Search Results", `common.removeItem` "Remove {$item}", `common.deselect` "Deselect". Template list: `steps/Email.php::getEmailTemplates()` = `Repo::emailTemplate()->getByKey($contextId, $mailable::getEmailTemplateKey())` plus the collector's `alternateTo([$key])`; each item shows `localize(name)` and `getBodySnippet()` (70 characters, "..."); `loadTemplate(key)` for a listed template runs `setTimeout(…, 1000)` behind `.composer__loadingTemplateMask` ("Fake a small delay so that the user notices the change"), for an unlisted one fetches `GET emailTemplates/{key}`; `created()` loads `initialTemplateKey` (the mailable's key) at once; `setSubject()` runs `renderPreparedContent()` over the subject so placeholders are resolved in the box, `setBody()` sets the raw body. Search: `search()` calls `GET emailTemplates?searchPhrase=` (`PKPEmailTemplateController::getMany()`, the collector's `searchPhrase` over name, subject and body words, no key filter), `showSearchResultCount` 10 with the "{n} more" button. The default `canSkip` of `steps/Email.php` is true. `Composer` is also mounted by the discussions form (`DiscussionManager`, with the workflow-stage attacher and no prepared-content field: seen 2026-09-20 on all three apps, its toolbar has no "Insert Content" and its "Attach Files" offers "Upload File" and "Workflow Files") and by the author-response request page (*Author response to reviews*, whose "Attach Files" window with four sources its Fields table records). Live-probed 2026-09-20 (Rule 7, Fields; all three apps): the "Email Templates" entries with their 70-character snippets, the subject prefilled with its placeholders resolved, the letter greyed for about a second on a template press and a word typed before it lost; "Find Template" answering ten results and a "{n} more" button from the journal's email templates alone ("Request", "Copyedit" and "discussion" typed on scratch contexts: no "Request Copyedit", "Assign Editor" or "Ready for Production", which are editorial-task templates, not email templates); a template of another decision ("Submission Declined (Pre-Review)") loaded from a result and sent as loaded, the mail and the Activity Log's "An email has been sent: {subject}" row carrying its subject; the sub-editor role's search (Section Editor, Series Editor, Moderator) answering 401 with the "Error" window (A9) while the manager-level editor's works; a template edited under Manage Emails prefilling the page and an alternative added with "Add Template" joining the list; after "Switch to: French" the list's English snippet (A10).

<a id="fn-e"></a>
**e** — Recipients: `steps/Email.php::getRecipientOptions()` (id + names per locale); `DecisionPage.vue::created()` seeds `recipients` with every option; `Composer.vue` renders `FieldAutosuggestPreset name="to"` with `:is-disabled="!canChangeRecipients"` and `deselectLabel`; `Email::canChangeRecipients` is false by default and set true on the reviewers' step of `Accept`, `Decline`, `RequestRevisions`, `Resubmit` and `CancelReviewRound` only; `DecisionPage::submit()` sends `recipients` only when `canChangeRecipients`, and `NotifyReviewers::validateNotifyReviewersAction()` adds `validator.required` "This field is required." on `.recipients` when empty, and `editor.submission.workflowDecision.invalidRecipients` "You can not send an email to the following recipients: {$names}." for an id outside the round's reviewers. Names in the letter: `Composer.vue::compiledVariables()` overrides `recipientName` with `recipientVariable` (the selected chips' labels joined by `common.commaListSeparator`) when `canChangeRecipients` and `!separateEmails`, and `record.tpl` never passes `separate-emails`, so the reviewers' page renders every name; `FieldPreparedContent.vue::renderedValue()` feeds the editor the rendered text and `fieldChanged()` emits the editor's content, so an edit stores the names (A3); untouched, the raw template body is sent and `NotifyReviewers::sendReviewersEmail()` loops `Mail::send($mailable->recipients([$recipient]))` per reviewer, each `RecipientEmailVariable` resolving to one name. `Email::__construct()` filters `$recipient->getDisabled()`. Live-probed 2026-09-20 (Rule 4, Fields "To"; OJS and OMP): "Notify Authors" and "Notify Editors" chips fixed; "Notify Reviewers" chips each with a remove control and the box offering the round's reviewers back; the letter on screen keeping "{$recipientName}" as a marked token (the `recipientVariable` override above does not reach the field on this build; why was not traced) and each reviewer's email opening with that reviewer's own name, untouched and edited alike (A3 retired); the emptied "To:" refused with the banner alone, the box reading "None" (A7).

<a id="fn-f"></a>
**f** — Attachers per decision: `InSubmissionStage::getFileAttachers()` = `Upload` + `FileStage` ("Submission Files" with `withFileStage(SUBMISSION_FILE_SUBMISSION, "Submission Files")`) + `Library`; `InExternalReviewRound::getFileAttachers()` = `Upload` + `ReviewFiles` (`reviewer.submission.reviewFiles` "Review Files", files with `ASSOC_TYPE_REVIEW_ASSIGNMENT` of the round's assignments) + `FileStage` (`email.addAttachment.submissionFiles.reviewDescription`, groups "Revisions" = `SUBMISSION_FILE_REVIEW_REVISION` and "Review Files" = `SUBMISSION_FILE_REVIEW_FILE`, both `reviewRoundIds` of the round) + `Library`; OMP `InInternalReviewRound` the same with the internal file stages; `SendToProduction` = `Upload` + `FileStage` ("Copyedited", "Draft Files") + `Library`; `BackFromCopyediting` = `Upload` + `FileStage` ("Draft Files") + `Library`; `BackFromProduction` = `Upload` + `FileStage` (`editor.submission.production.productionReadyFiles` "Production Ready Files") + `Library`; OPS `Decline` and `RevertDecline` override to `Upload` + `Library` (OPS1). Labels: `lib/pkp/classes/components/fileAttachers/{Upload,FileStage,ReviewFiles,Library}.php` (`common.upload.addFile` "Upload File" and `.description` "Upload a file from your computer."; `email.addAttachment.reviewFiles.description` / `.attach` "Attach Review Files"; `email.addAttachment.submissionFiles.submissionDescription` / `.attach` "Attach Submission Files"; `email.addAttachment.libraryFiles` "Library Files" / `.description` "Attach files from the Submission and Publisher Libraries." / `.attach` "Attach Library Files"; `common.attachSelected` "Attach Selected", `common.back` "Back", `common.addFiles` "Add Files", `common.dragAndDropHere` "Drag and drop files here.", `common.orUploadFile` "Or upload a file", `common.noItemsFound` "No items found."). Vue: `Composer.vue::bodyInit()` registers the `pkpAttachFiles` toolbar button (`common.attachFiles`) opening `FileAttacherModal.vue` (title `attachFilesLabel`), which mounts `FileAttacher.vue` (one `ActionPanel` per attacher) and, on a button, `AttacherModal.vue` (title = the attacher's label) with `FileAttacherUpload.vue` (`FileUploader` to `temporaryFiles`, `FileUploadProgress` with the untranslated "Cancel Upload", the uploaded row's `common.remove` "Remove", "Attach Files" `:is-disabled="!files.length || isUploading"`), `FileAttacherFileStage.vue` (`ListPanel` headed by `currentFileStage.label`, `Dropdown label="Other Files"` when `fileStages.length > 1`, `GET submissions/{id}/files?fileStages[]=…`), `FileAttacherReviewFiles.vue` (`file.reviewerName + ' — ' + name`), `FileAttacherLibrary.vue` (`GET _library?includeSubmissionId=`). `addAttachments()` maps each source to `{name, temporaryFileId | submissionFileId | libraryFileId}` and closes the modal; `removeAttachment(i)` drops a chip. Server validation: `DecisionType::validateEmailAction()` checks each attachment against the temporary-file owner, the submission and `getAllowedAttachmentFileStages()` (submission stage `SUBMISSION_FILE_SUBMISSION`; review `REVIEW_ATTACHMENT`, `REVIEW_FILE`, `REVIEW_REVISION`; `SendToProduction` `FINAL`, `COPYEDIT`; `BackFromCopyediting` `FINAL`; `BackFromProduction` `PRODUCTION_READY`) or the library, adding `email.attachmentNotFound` "The file {$fileName} could not be attached." to `attachments`. Sending: `DecisionType::addEmailDataToMailable()` → `attachTemporaryFile` / `attachSubmissionFile` / `attachLibraryFile`. Author visibility: `NotifyAuthors::shareReviewAttachmentFiles()` sets `viewable` on every attached `SUBMISSION_FILE_REVIEW_ATTACHMENT` of the round after `Accept`, `Decline`, `RequestRevisions` and `Resubmit`. Live-probed 2026-09-20 (Rule 6; all three apps, the review source on OJS and OMP): the four panels' headings, sentences and buttons; "Upload File" with the drop-zone text, "Attach Files" greyed until a file is there, the progress bar, the row with "Remove", the chip and its cross; every second window closing with a "Back" button; "Submission Files" with the first group's rows and the "Other Files" dropdown; "Attach Review Files" listing "{reviewer} — {file}" for a file uploaded by a reviewer whose review was not yet submitted (OJS; the press's reviewer had submitted); "Attach Library Files" reading "No items found." on empty libraries and, after "Add a file" in the workflow header's Library, one row with the file's type ("Marketing"; "Contracts" on the press) and "Download"; the preprint server's "Upload File" and "Library Files" alone; afterwards the author finding the reviewer's file under "Reviewer Files" in the "Read Review" window of a completed open review only, an anonymous review's round listing neither reviewers nor attachments and the "Notifications" letter showing no attachment line.

<a id="fn-g"></a>
**g** — Placeholders: `steps/Email.php::getVariables()` builds `{key, value, description}` per form locale from `$mailable->getData($locale)` and `getDataDescriptions()`; `Composer.vue` passes `compiledVariables` as `prepared-content` to `FieldPreparedContent.vue`, whose `renderedValue()` shows the text with `{$key}` replaced by the value, and whose toolbar `pkpInsert` button (`common.insertContent`) opens `FieldPreparedContentInsertModal.vue` (title `insertModalLabel` "Insert Content") around `InsertContent.vue`: a search (`insertSearchLabel` "Find content to insert"), an `<ol>` labelled `insertContentLabel` "Content" of `item.value` + `item.description` rows, each with an "Insert" button that `insertContent()`s the value at the cursor and closes the modal. Variable roster: `Mailable::getDataDescriptions()` (`emailTemplate.variable.*`: the context name, url, submission title, id, url, sender name and signature, recipient name and username), plus per mailable `reviewerComments` (`ReviewerComments` trait on `DecisionAcceptNotifyAuthor`, `DecisionDeclineNotifyAuthor`, `DecisionRequestRevisionsNotifyAuthor`, `DecisionResubmitNotifyAuthor`, `RecommendationNotifyEditors`), `authorReviewResponseUrl` (`ReviewRoundAuthorResponse` trait on the revisions mailables), `recommendation` (`RecommendationNotifyEditors`), `decisionDescription` (`DecisionNotifyReviewer`). Live-probed 2026-09-20 (Rule 5; all three apps): the letter's first line resolved ("Dear Alex Author,"); the "Insert Content" window with a "Search" box and 28 rows on a Submission-stage "Notify Authors" (the journal's name, addresses, initials and contact; the submission's title, abstract, ID and addresses; the authors' names; the recipient's name and username; the editor's name and signature), plus the reviewers' comments, the author's response address, the recommendation and the decision's description where the mailable carries them, each row ending in an "Insert" button that drops the value at the cursor; the comments and signature rows showing "<p>", "<strong>", "<br>" and "<a href>" as text and the mailing address row empty (A8); on the preprint server the initials row described "##emailTemplate.variable.context.contextAcronym##" (OPS2). Live-probed 2026-09-20 by the test run (scenario 2, OJS and OMP): "title" typed in "Search" left all 28 rows listed until Enter was pressed, after which the matching rows alone remained; the box is `lib/ui-library`'s `Search.vue`, which emits its phrase on Enter and on "Clear search phrase" only, so the preprint server's window, driven for its rows and "Insert" but not for the search, reads the same by that code. Signature: `lib/pkp/classes/mail/variables/SenderEmailVariable.php::getSignature()` gives the sender's `signature` in the locale, or `<p>` + the sender's full name when it is empty; the "Decline Submission" template (`emails.editorDecisionInitialDecline.body`) ends `<p>Kind regards,</p>{$signature}`. Live-probed 2026-09-28 (Rule 5, the signature; Settings bullet 7; all three apps, three runs each; a throwaway Section Editor on a scratch context's "Decline Submission" › "Notify Authors", on the Submission stage of the journal and the press and the Production stage of the preprint server): with the profile's "Signature" empty the letter closed "Kind regards," / the editor's full name, and the context manager's, whose signature was never set, closed with the manager's full name; saved as "Kind regards, {name}" (read back after "Save" and after a reload) it closed "Kind regards," / "Kind regards, {name}"; saved as a name and a job title it closed "Kind regards," / that text, and the author's email "Your submission has been declined" ended the same way.

<a id="fn-h"></a>
**h** — Locales: `steps/Email.php` receives `$context->getSupportedFormLocales()` and emits `locales` (`{locale, name}`) and `variables` per locale; `Composer.vue::otherLocales` lists the rest, rendered under `switchToLabel` ("Switch to") as one `-linkButton` per locale name; `openSwitchLocale()` opens a dialog titled `switchToNamedLanguageLabel` (`common.switchToNamedItem` "Switch to {$name}") with message `email.confirmSwitchLocale` "Are you sure you want to change to {$localeName} to compose this email? Any changes you have made to the subject and body of the email will be lost.", a primary "Switch to {$name}" and `common.cancel`; `switchLocale()` emits the new `locale` then `loadTemplate(initialTemplateKey)`; `DecisionPage::submit()` sends `locale` per step and `sendAuthorEmail()` passes it to `recipients($recipients, $email->locale)` so names and the letter go out in it. `publicknowledge` has `fr_CA` under "UI" only (seed-facts, 2026-09-03), so no link; a scratch context seeded `context.supportedFormLocales: ['en','fr_CA']` has both (scenarios.md). Live-probed 2026-09-20 (Rule 8; all three apps, scratch contexts with French under "Forms"): the line "Switch to:" with the link "French"; the dialog's title, text and buttons as quoted; after confirming, the French subject and letter and the recipient chip's French name, the "Email Templates" entry keeping its English snippet (A10).

<a id="fn-i"></a>
**i** — "Select Files": `steps/PromoteFiles.php` (`type` `promoteFiles`, `to` file stage, `lists[]` of `{name, files}` from `addFileList(name, collector, selectedByDefault)`, `selected` prefilled with every file of a default-selected list); `record.tpl` renders one `<list-panel :title="list.name">` per list with `SelectSubmissionFileListItem` rows (`download-label` `common.download` "Download", genre name, uploader, `createdAt`) and a checkbox `v-model="step.selected"`. On submit `DecisionPage::submit()` posts the decision first, then, on success, `copyFile()` per selected id: `PUT submissions/{id}/files/{fileId}/copy?stageId=` with `toFileStage` (`PKPSubmissionFileController::copy()`, which picks the latest round of the target review stage when none is given) and opens the completion dialog only after the last copy (`copyCompleted`); a review-stage target lands in the round's files. Descriptions: `editor.submission.decision.promoteFiles.externalReview` "Select files that should be sent to the review stage." (OJS and OMP override lib/pkp's "…sent for review."), `.copyediting` "…to the copyediting stage.", `.production` "…to the production stage.", OMP `.internalReview` "…to the internal review stage.". Live-probed 2026-09-19 (the Copyediting stage's claim check, OJS and OMP): "Send To Production" with no copyedited file lists the draft file unticked on "Select Files" and records with nothing promoted. Live-probed 2026-09-20 (Rule 9; OJS and OMP): the heading "{Decision}: Select Files" with the decision's sentence beneath and the panel "Select Files" opening with "Select files that should be sent to the review stage." (the internal-review sentence on the press; "New Review Round": "Select files that should be sent for review."); the rows' "Download", type and date, the uploader named by username (A12); one file unticked: the round's files list holding the ticked one only and "Submission Files" both.

<a id="fn-j"></a>
**j** — Footer and errors: `record.tpl` `.decision__footer`: `common.cancel` "Cancel" (`is-warnable`), `help.previous` "Previous" (`v-if="!isOnFirstStep && steps.length > 1"`), `common.continue` "Continue" / `editor.decision.recordDecision` "Record Decision" (`is-primary` when `isOnLastStep`), a `<spinner v-if="isSubmitting">`, every button `:disabled="isSubmitting"`. `DecisionPage::nextStep()` opens the next step with no check and `submit()` on the last. `submit()` posts `{decision, actions[], reviewRoundId}` to `POST submissions/{id}/decisions`; a 400 with `decision` opens `ajaxErrorCallback` (the generic error dialog) with `decision[0]`, a 400 with `actions` runs `setStepErrors()` mapping errors by step index into `step.errors` (or `step.form.errors` for a form step), which the `errors` computed turns into one `<notification type="warning">` per step reading `editor.decision.stepError` "There was a problem with the {$stepName} step." with `common.viewError` "View Error" (`openStep(stepId)`); field messages render through `FieldError` under "CC:", "BCC:", "Subject:" and the attachments, and the message editor's own error slot. Server rules: `DecisionType::validateEmailAction()` (`subject` and `body` `required` → `validator.required` "This field is required."; `cc`/`bcc` items `email_or_localhost`); `Repository::validate()` (`editor.submission.workflowDecision.invalidStage` "The submission is not at the appropriate stage of the workflow to take this decision." when `stageId !== $submission->stageId`, the case of a submission moved on since the page loaded; `requiredDecidingEditor`; `requiredReviewRound`; `invalidReviewRound`). Note `DecisionAllowedPolicy` on the API answers a stale page a 403 dialog when the user lost the right meanwhile. Live-driven 2026-09-19/20 by the shipped suites: a submit during the template load mask posts an empty body and fails server-side (`docs/process/patterns.md` pitfall 12). Live-probed 2026-09-20 (Rule 10; all three apps): the banner "There was a problem with the Notify Authors step." at the top of the wizard with "View Error" opening the page; "This is not a valid string. This field is required." under an emptied subject or message, "This is not a valid email address." under "CC:", "The file {file} could not be attached." under the chips for a file deleted after attaching; the spinner and greyed buttons while the recording runs, one record per double press; the stale wizard's "Error" window "The submission is not at the appropriate stage of the workflow to take this decision." after another tab recorded first.

<a id="fn-k"></a>
**k** — Cancel and completion: `DecisionPage::cancel()` opens a `modalStyle: 'negative'` dialog titled `abandonDecisionLabel` (`editor.decision.cancelDecision` "Cancel Decision") with `cancelConfirmationPrompt` (`editor.decision.cancelDecision.confirmation` "Are you sure you want to cancel this decision?"), actions "Cancel Decision" (`isWarnable`, `window.location = submissionUrl`) and `keepWorkingLabel` (`common.keepWorking` "Keep Working"); `submissionUrl` is `returnUrlToSubmissionSummary` (the `ret` query parameter, always set by `openDecisionPage()` to `dashboard/editorial?workflowSubmissionId=…`) or the handler's `submissionUrl` (the same address). `openCompletedDialog()` (`modalStyle: 'success'`) is titled `decisionCompleteLabel` (`getCompletedLabel()`) with `decisionCompleteDescription` (`getCompletedMessage()`) and, with `ret`, one action `viewSubmissionSummaryLabel` (`submission.list.viewSubmissionSummary` "View Submission Summary", `element: 'a'`); its `close` also navigates there; without `ret` (a hand-typed address) the actions are `submission.list.viewSubmission` "View Submission" and `submission.list.viewAllSubmissions` "View All Submissions". Live-probed 2026-09-19 (the Production stage's claim check, all three apps): "Cancel" asks "Are you sure you want to cancel this decision?", and "Skip this email" flips to "Don't skip this email"; live-driven 2026-09-19/20 by the Copyediting and Production stages' suites: the completion dialog by its title and its "View Submission Summary" link back to the workflow. Live-probed 2026-09-20 (Rule 11; all three apps): the "Cancel" dialog's title, text and buttons, "Keep Working" leaving the page unchanged, "Cancel Decision" landing on the workflow page; the closing window's title, message and its one control "View Submission Summary" (no close cross), landing on the stage entry the button was pressed on, on the preprint server a declined preprint's "Title & Abstract" page; from a hand-typed address the window offering "View Submission" and "View All Submissions"; the breadcrumb's "Dashboard" with an edited subject leaving without a prompt.

<a id="fn-l"></a>
**l** — Descriptions and closing words are each type's `getDescription()`, `getCompletedLabel()` and `getCompletedMessage()` (`lib/pkp/locale/en/editor.po` `editor.submission.decision.*.description`, `*.completed`, `*.completed.description` / `*.completedDescription`; `editor.submission.recommend.*`), with the OMP `locale/en/editor.po` overrides for `sendExternalReview.completed` "Sent for External Review", `.completed.description` "The submission, {$title}, has been sent to the external review stage." (no author sentence) and the `sendInternalReview.*` set, and OJS/OMP overrides of `promoteFiles.externalReview`. OPS's "Revert Decline" message names the submission stage: *[Production stage](U33-production-stage.md#ops2)*. Live-probed 2026-09-20 (Rule 11's table; each row on the app that has it): every sentence under the heading and every closing window's title and message as quoted, the press's Submission-stage decision named "Send to External Review" on its button and heading.

<a id="fn-m"></a>
**m** — Recording: `lib/pkp/classes/decision/Repository.php::add()` inserts the row, writes the event log entry (`SUBMISSION_LOG_EDITOR_DECISION`, or `SUBMISSION_LOG_EDITOR_RECOMMENDATION` for `isRecommendation()`, `userId` `Validation::loggedInAs() ?? request user`, `impersonatedUserId` when impersonating, `message` `$decisionType->getLog()` with `editorName`), runs `runAdditionalActions()` (status, stage, review round status, `Repo::editorialTask()->autoCreateFromTemplates()`, then the emails), fires `DecisionAdded`, then `updateNotifications()` (note o). Log keys: `editor.submission.decision.*.log` and `editor.submission.recommend.*.log` (Side effects' table; OMP overrides `sendExternalReview.log` "…to the external review stage."). Author email: `NotifyAuthors::sendAuthorEmail()` → `addEmailDataToMailable()` (`sender($editor)`: `Sender::sender()` sets the From address to the editor's email and full name; subject, body, cc, bcc, attachments) → `Mail::send($mailable->recipients($assignedAuthors, $locale))` → `Repo::emailLogEntry()->logMailable(EDITOR_NOTIFY_AUTHOR, …)` (the row *Review stage & rounds* Rule 16's list reads); then, when `$context->getData('notifyAllAuthors')`, one `DecisionNotifyOtherAuthors` per `getCurrentPublication()->getData('authors')` whose email is set and not among the assigned authors' emails, `subject` the letter's subject (the template's own `emails.decision.notifyOtherAuthors.subject` "An update regarding your submission" is not used), `body` the `EDITOR_DECISION_NOTIFY_OTHER_AUTHORS` template (body "<p>The following email was sent to {$submittingAuthorName} from {$contextName} regarding "{$submissionTitle}".</p>…" with `{$messageToSubmittingAuthor}` = the letter). Template names: `mailable.decision.*.name` (`lib/pkp/locale/en/mailable.po`; OPS overrides `initialDecline.notifyAuthor.name` to "Submission Declined"); subjects `emails.editorDecision*.subject` in `lib/pkp/locale/en/emails.po`, with OJS and OMP overriding `editorDecisionAccept.subject` "Your submission has been accepted to {$contextName}" and `editorDecisionSkipReview.subject` "Your submission has been sent for copyediting" (identical texts) and OMP adding `editorDecisionSendToInternal.subject`. Live-probed 2026-09-20 (Side effects; all three apps): the author's email from the editor's name and address with the subject, text and attachment as left on the page, listed on the author's "Notifications" list; the Activity Log's decision line per the table; under "Login As" the line naming the editor acted as; the contributor's copy arriving under the letter's subject and opening "The following email was sent to {author} from {journal} regarding "{title}".".

<a id="fn-n"></a>
**n** — Reviewer emails: `NotifyReviewers::sendReviewersEmail()` loops the posted `recipients`, `Mail::send($mailable->recipients([$recipient], $locale))` per reviewer, for `DecisionNotifyReviewer` (template `EDITOR_DECISION_NOTIFY_REVIEWERS`, name `mailable.decision.notifyReviewer.name` "Notify Reviewers of Decision", subject `emails.decision.notifyReviewers.subject` "Thank you for your review", variable `decisionDescription` from `mailable.decision.notifyReviewer.variable.decisionDescription.{accept,decline,pendingRevisions,resubmit}`) sets `dateAcknowledged` when empty, `considered` to `REVIEW_ASSIGNMENT_CONSIDERED` (from NEW/VIEWED) or `RECONSIDERED`, and `dateConsidered`; each send logs `REVIEW_NOTIFY_REVIEWER` (or `REVIEW_EDIT_NOTIFY_REVIEWER` for `ReviewCancel`) and one event `SUBMISSION_LOG_DECISION_EMAIL_SENT` `submission.event.decisionReviewerEmailSent` "An email about the decision was sent to {$recipientCount} reviewer(s) with the subject {$subject}." closes the loop. `CancelReviewRound` uses `ReviewCancel extends ReviewerUnassign` (key `REVIEW_CANCEL`, name `mailable.reviewCancel.name` "Review Cancel", subject `emails.reviewCancel.subject` "Your review for "{$submissionTitle}" has been cancelled", in OJS and OMP `locale/en/emails.po`). Live-probed 2026-09-20 (Side effects; OJS and OMP): one "Thank you for your review" email per reviewer naming the decision in one sentence; the Activity Log line "An email about the decision was sent to 2 reviewer(s) with the subject …"; each emailed reviewer's row reading "Reviewer Thanked" with "Revert Decision" where it read "Review Submitted"; the press's "Review Cancel" text leaving "{$journalName}" unresolved where the journal's names the journal (OMP1).

<a id="fn-o"></a>
**o** — Notifications: `Repository::updateNotifications()` calls `NotificationManager::updateNotification()` for the assigned authors with the decision's type from `PKPNotificationManager::getNotificationTypeByEditorDecision()` (`ACCEPT` → `NOTIFICATION_TYPE_EDITOR_DECISION_ACCEPT`, `EXTERNAL_REVIEW`, `PENDING_REVISIONS`, `RESUBMIT`, `NEW_EXTERNAL_ROUND` → `NEW_ROUND`, `DECLINE` and `INITIAL_DECLINE` → `DECLINE`, `REVERT_DECLINE`, `SEND_TO_PRODUCTION`; no type for the revert of an initial decline, the back-from decisions, the cancel or the recommendations) plus the app's `getReviewNotificationTypes()` (`PENDING_EXTERNAL_REVISIONS`, OMP also `PENDING_INTERNAL_REVISIONS`); `managerDelegate/EditorDecisionNotificationManager.php::updateNotification()` deletes the submission's earlier editor-decision rows for those users and creates one at `NOTIFICATION_LEVEL_TASK` for `PENDING_REVISIONS` and `RESUBMIT` (`notification.type.editorDecisionPendingRevisions` "Revision required.", `…Resubmit` "Resubmit for review.") and `NOTIFICATION_LEVEL_NORMAL` for the rest (`…Accept` "Submission accepted.", `…ExternalReview` "External review process started.", `…NewRound` "A new round of reviews was initiated.", `…Decline` "Submission declined.", `…RevertDecline` "Declined submission reactivated.", `…SendToProduction` "Production process started."; title `notification.type.editorDecisionTitle` "Latest editor decision."), with `getNotificationUrl()` the author's workflow address. The task level is what the header Tasks panel lists (*Notifications center*, Rule 2); the normal level is fetched by no current screen: `WorkflowNotificationDisplay.vue` asks `notification/fetchNotification` for the copyediting and production notice types alone, and the retired author dashboard was the list that showed them (A5). `PendingRevisionsNotificationManager` (the "Revisions to consider in {$stage}." row) is *Review stage & rounds*' note m. `getSubmissionNotificationTypes()` recomputes `ASSIGN_COPYEDITOR` / `AWAITING_COPYEDITS` on `ACCEPT` and those plus `ASSIGN_PRODUCTIONUSER` / `AWAITING_REPRESENTATIONS` on `SEND_TO_PRODUCTION` (the stage specs' notices). Live-probed 2026-09-20 (Side effects; OJS and OMP): after "Request Revisions" the author's header Tasks panel reads "Revision required." on the journal and "Revisions to consider in External Review." on the press (the `PendingRevisionsNotificationManager` row), "Resubmit for review." on both, each linking to the submission; after "Accept Submission" the row is gone and no screen shows "Submission accepted." (A5).

<a id="fn-p"></a>
**p** — Recommendations: trait `lib/pkp/classes/decision/types/traits/IsRecommendation.php`: `getSteps()` adds one `Email` `discussion` (`editor.submissionReview.recordRecommendation.notifyEditors` "Notify Editors", `editor.submission.recommend.notifyEditors.description`) with `Steps::getDecidingEditors()` (manager / sub-editor assignments at the stage with `recommendOnly` false) as recipients, mailable `RecommendationNotifyEditors` (key `EDITOR_RECOMMENDATION`, name `mailable.decision.recommendation.notifyEditors.name` "Recommendation Made", subject `emails.editorRecommendation.subject` "Editor Recommendation", body "…My recommendation is: {$recommendation}…" with `recommendation` = `getRecommendationLabel()`: "Accept Submission", "Decline Submission", "Request Revisions", "Resubmit for Review", OMP "Send to External Review"), `canSkip(false)`; `runAdditionalActions()` → `addRecommendationQuery()`: `Repo::editorialTask()->addQuery($submissionId, $stageId, $subject, $body, $editor, $queryParticipantIds, $contextId, false)` with participants = the non-`recommendOnly` editor assignments only (the creator is `createdBy`, not a participant: A4), the attachments copied into the head note as `SUBMISSION_FILE_QUERY` files, then `sendEditorsEmail()` `from($editor->getEmail(), $editor->getFullName())` `to` the participants. `DecisionHandler::record()` 404s a recommendation when no deciding editor is assigned; `Repository::validate()` adds `editor.submission.workflowDecision.requiredDecidingEditor` for the API. After recording: `lib/pkp/classes/submission/maps/Schema.php::getPropertyStages()` sets `currentUserRecommendation` (the user's latest recommendation, `{decision, label}`) and `recommendations` for the deciding editor; `WorkflowRecommendOnlyControls.vue` shows the `editor.submission.recommendation` "Recommendation" box with `currentRecommendation.label`, the `editor.submission.workflowDecision.changeDecision` "Change decision" link revealing `getRecommendationActions()` (`editor.submission.recommend.revisions` "Recommend Revisions", `.accept` "Recommend Accept", `.decline` "Recommend Decline"; Internal Review adds `.sendExternalReview` "Recommend Send to External Review"), or `editor.submission.recommendation.noDecidingEditors` "You can not make a recommendation until an editor is assigned with permission to record a decision." when `!submission.editorAssigned`. OPS `classes/decision/Repository.php::isRecommendation()` returns false and its roster holds no `Recommend*` type. Live-probed 2026-09-20 (Rule 13; OJS and OMP): the heading, the sentence, the "To" chips, no "Skip this email", the letter's "My recommendation is: Accept Submission."; the closing window; the "Recommendation" box with a "Change decision" button bringing the three buttons back (four on the press's Internal Review); the discussion listed for the Editor with "Participants" naming the deciding editor alone, the recommender as "Created by" on the row and "Message from" in the window, and absent from the recommender's own panel (A4); the email from the recommender's name; a second recording ("Recommend Decline") replacing the first on both boxes and adding a second "Editor Recommendation" discussion.

<a id="fn-q"></a>
**q** — The choice window: `useWorkflowDecisions.js::decisionRequestRevision()` (after the minimum-reviews check) and `decisionRecommendRevision()` open `WorkflowSelectRevisionFormModal.vue` (title `editor.submission.decision.requestRevisions` "Request Revisions") around `SelectRevisionDecisionForm` / `SelectRevisionRecommendationForm` (`lib/pkp/classes/components/forms/decision/`): radio `decision` labelled `editor.review.newReviewRound` "Require New Review Round", options `editor.review.NotifyAuthorRevisions` "Revisions will not be subject to a new round of peer reviews." (`PENDING_REVISIONS`, preselected) and `editor.review.NotifyAuthorResubmit` "Revisions will be subject to a new round of peer reviews." (`RESUBMIT`), submit button `help.next` "Next"; the recommendation form's options `….recommendation` "Revisions should not be subject…" / "Revisions should be subject…" (`RECOMMEND_PENDING_REVISIONS`, `RECOMMEND_RESUBMIT`); on success `openDecisionPage(submission, decision, {reviewRoundId})`. The decision variant's options are also *Review stage & rounds* Rule 11's. Live-probed 2026-09-20 (Rule 14; OJS and OMP): the window "Request Revisions" with "Require New Review Round", both option texts (the decision's and the recommendation's) and "Next"; the second option opening "Recommend Resubmit for Review: Notify Editors"; the cross closing it with nothing opened; on the press's Internal Review "Request Revisions" and "Recommend Revisions" opening their wizard at once, the internal round having no "Resubmit for Review".

<a id="fn-r"></a>
**r** — The warning: `useWorkflowDecisions.js::showWarningDialogAboutMinimumReviewsIfEnabled()` wraps `decisionAccept`, `decisionNewExternalRound`, `decisionRequestRevision` (and OMP's `decisionAcceptInternal`, `decisionPendingRevisionsInternal`, `decisionNewInternalRound`), not `decisionDecline`, `decisionCancelReviewRound`, `decisionResubmitInternal` or any `decisionRecommend*`; `useSubmission.js::checkMinimumConsideredReviews()` returns `shouldMinimumReviewsBeConsidered` when `contextMinReviewsPerSubmission` (the context's `numReviewsPerSubmission`) is set and the stage is a review stage, and `hasMinimumReviewsCount` when the round's `getConfirmedReviewAssignments()` (active assignments whose `statusId` is in `ConfirmedReviewAssignmentStatuses` = `REVIEW_ASSIGNMENT_STATUS_COMPLETE`, `_THANKED`) number at least that; the dialog is `dashboard.proceedWithoutMinimumReviews` "Proceed Without Minimum Confirmed Reviews?" / `dashboard.minimumConfirmedReviewsNotMet` with `common.yesContinue` "Yes, Continue" (`isWarnable`) and `common.cancel`, `modalStyle: 'negative'`. The setting is *Review setup & review forms*' "Minimum Confirmed Reviews Required" (`review.numReviewsPerSubmission` in the context scenario, scenarios.md). A seeded `completed` review is "Review Submitted" and does not count until the editor's "Mark as Complete" or "Thank Reviewer". Live-probed 2026-09-20 (Rule 15; OJS and OMP, a scratch journal with the minimum at 2): the dialog's title, text and buttons; "Cancel" leaving the round unchanged; "Yes, Continue" opening the wizard; "Decline Submission", "Cancel Review Round", the recommendation buttons and the press's "Send to External Review" asking nothing; with two reviews confirmed "Accept Submission" opening the wizard at once; below the minimum the "Round 1 Status" box reading "Minimum number of confirmed reviews required: 2." in place of "New reviews have been submitted." (the box is *Review stage & rounds*').

<a id="fn-s"></a>
**s** — OJS payment step: `classes/decision/types/traits/RequestPayment.php::getPaymentForm()` = `Form` `payment` (`editor.article.payment.requestPayment` "Request Payment", OJS `locale/en/editor.po`) around `classes/components/forms/decision/RequestPaymentDecisionForm.php`: radio `requestPayment` labelled `common.payment` "Payment", options `payment.requestPublicationFee` "Request publication fee ({$feeAmount})" with `publicationFee . ' ' . currency` (value true, preselected) and `payment.waive` "Waive"; prepended (`addStep(…, true)`) by OJS `Accept::getSteps()` and `SkipExternalReview::getSteps()` when `OJSPaymentManager::publicationEnabled()` (payments on and a publication fee above zero); `validatePaymentAction()` (`payment.requestPublicationFee.notEnabled` "No publication fee is enabled."; `validator.required`); `requestPayment()` → `createQueuedPayment(PAYMENT_TYPE_PUBLICATION)`, `NOTIFICATION_TYPE_PAYMENT_REQUIRED` at task level per assigned author, and `PaymentRequest` mail (key `PAYMENT_REQUEST_NOTIFICATION`, name "Payment Request", subject `emails.paymentRequestNotification.subject` "Payment Request Notification") `from($context->contactEmail, contactName)`. Neither OMP nor OPS subclasses the two types (OMP's `AcceptFromInternal extends Accept` is lib/pkp's). Payments settings have no scenario key (scenarios.md "Field shapes not built yet" lists none; the screen is Settings › Distribution › Payments). `Accept::runAdditionalActions()` calls `requestPayment()` for every payment action present without reading the action's `requestPayment` value, and `validatePaymentAction()` checks only that the key is set (OJS1). Live-probed 2026-09-20 (Rule 16, Settings; OJS on a scratch journal with payments enabled on Settings › Distribution › Payments, the manual plugin's own boxes filled, and the charge set on the "Payments" page's "Payment Types" tab): the first page "Request Payment", the choice "Payment" with "Request publication fee (…)" preselected and "Waive"; with the fee requested the author's Tasks row "The publication fee is due for payment." and the "Payment Request Notification" email from the journal's principal contact; with "Waive", twice on fresh submissions, the same row and email (OJS1). The press shows the Distribution › Payments tab, its "Payments" page answers "404 Not Found" and "Accept Submission" opens with no payment page; the preprint server has no tab.

<a id="fn-t"></a>
**t** — Settings: `lib/pkp/schemas/context.json` `notifyAllAuthors` `default: true`; `PKPEmailSetupForm.php` field `notifyAllAuthors` labelled `manager.setup.notifyAllAuthors` "Notify All Authors", description `manager.setup.notifyAllAuthors.description` "Who should receive a notification email when an editorial decision is recorded?", options `.allAuthors` "Send an email notification to all authors of the submission." (true) and `.assignedAuthors` "Only send an email to authors assigned to the submission workflow. Usually, this is the submitting author." (false); live-probed 2026-09-06 on OJS at "Send an email notification to all authors of the submission." on a scratch journal (seed-facts), with no scenario passthrough (scenarios.md "Field shapes not built yet": `notifyAllAuthors`). Templates: `Repo::emailTemplate()->getByKey()` returns the context's edited copy when one exists; alternatives are templates with `alternate_to` = the key (*Emails management*). Live-probed 2026-09-20 (Settings; all three apps): the choice and its two options on Settings › Workflow › Emails, the first selected on the seeded journal and on every scratch context; at that end a contributor with an email and no account receiving the copy under the letter's subject; at the assigned-authors option the assigned Author alone; a template edited under Manage Emails prefilling the page, an "Add Template" alternative joining the decision's list.

<a id="fn-t1"></a>
**t1** — Live-probed 2026-09-19 (the Copyediting and Production stages' claim checks; OJS and OMP for the file page, all three apps for the dialog and the link): the "Select Files" page of "Send To Production" listing the draft file unticked and recording with nothing promoted; the "Cancel" dialog "Are you sure you want to cancel this decision?"; "Skip this email" flipping to "Don't skip this email" when pressed. Live-probed 2026-09-20 again by this spec's own checks (notes c, i, k).

<a id="fn-u"></a>
**u** — `MoveToDone`, `ReturnToDone` and `ReturnToWorkflow` (`lib/pkp/classes/decision/types/`) return `null` from `getSteps()`; they are recorded by the publish flow (`Repo::publication()->publish()` and *Publish, schedule & versions*) and the workflow header's "Return to Workflow" / "Return to Done" (`POST submissions/{id}/returnToDone`, *Workflow screen & stage access*), never through this page, whose `record()` would call `getState()` on `null` for them. No page or menu links to `decision/record` with their numbers (33, 34, 35): no screen offers them through this wizard.

<a id="fn-v"></a>
**v** — Multi-app: `DecisionHandler`, `record.tpl`, `DecisionPage.vue`, `Composer.vue`, the `FileAttacher*` components and the `steps/` classes are lib/pkp and ui-library with no app copy (positive chain evidence). App rosters: OJS `classes/decision/Repository.php::getDecisionTypes()` (21 types), OMP (34, the internal twins added), OPS (5: `Decline`, `RevertDecline`, `MoveToDone`, `ReturnToWorkflow`, `ReturnToDone`); OPS `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` returns nothing outside Production and Done, `isRecommendation()` false, `getReviewNotificationTypes()` empty; OPS `Decline` and `RevertDecline` override `getFileAttachers()` to `Upload` + `Library` (OPS1); OPS `registry/userGroups.xml` installs no reviewer group and `getApplicationStages()` returns Production alone (seed-facts). Locale overrides checked in each app's `locale/en/`: OMP `editor.submission.decision.sendExternalReview` "Send to External Review", `sendInternalReview.*`, `sendExternalReview.completed*` and `.log`, `recommend.sendExternalReview*`, `promoteFiles.internalReview`; OJS and OMP `promoteFiles.externalReview`, `editorDecisionAccept.subject`, `editorDecisionSkipReview.subject`, `reviewCancel.*`; OPS `editorDecisionAccept.subject` (unused: no accept), `editorDecisionRevertInitialDecline.body` ("A moderator will look further…"), `mailable.decision.initialDecline.notifyAuthor.name` "Submission Declined". Live-driven 2026-09-19/20 on all three apps by the Production stage's suites: the one-page "Decline Submission" and "Revert Decline" wizards on the preprint server. Live-probed 2026-09-20 (the preprint server): the rail "1 Notify Authors" alone on "Decline Submission" and "Revert Decline", the "Email Templates" entry "Submission Declined", the "Attach Files" panels "Upload File" and "Library Files"; a Moderator limited to recommendations offered "Post the preprint" alone with no "Recommendation" box, and every decision number but the two answering "This decision could not be found. Please provide a recognized decision type." (OPS1).

<a id="fn-w"></a>
**w** — Pointers and scope prose. The passages carrying this mark name what this spec covers and the features that describe their own screens; they claim no screen of their own. The drives of 2026-09-20 opened the screens they name only on the way to the wizard's (the stage entries, the header's Tasks panel, Manage Emails, the "Edit Assignment" window, the Library's "Add a file", the discussions form's "Add" window, Settings › Distribution › Payments) and found them as pointed.

<a id="fn-s1"></a>
**s1** — Seeding for the scenarios: the seeded journal `publicknowledge` and roster accounts (passwords = username doubled), scratch submissions through `POST scenarios/submission` with submitter `author.alex` in section ART (series `monographs` on the press), so `editor.diana` is auto-assigned as the Editor on both apps and `sectioneditor.ravi`, whose section and series are others, is the unassigned Section Editor; `manager.maya` is the Journal Manager and `copyeditor.carla` the Copyeditor. A round with submitted reviews: `decisions: ['sendExternalReview']` and `reviewRounds: [{reviewers: [{username: 'reviewer.julia', status: 'completed'}, {username: 'reviewer.paul', status: 'completed'}]}]`; a round with an invited reviewer: `[{username: 'reviewer.julia'}]` (`invited` is the default); a second round holding an invited reviewer: two `reviewRounds` entries, the first with completed reviewers and the second with an invited one (scenarios.md "Decision behaviour worth knowing"); the press's internal round: `decisions: ['sendInternalReview']` and `reviewRounds: [{stage: 'internal', reviewers: [{username: 'reviewer.amara', status: 'completed'}]}]`. Seeded submissions carry no files, and the states below have no seed key yet, so the tooling builds them on screen before the scenario's first step: a submission file through the Submission stage's "Upload", a revision through the round's revisions list, a Library file through the workflow header's "Library" › "Add a file", a reviewer's file through the reviewer wizard's "Upload" step of a reviewer seeded `accepted`, who then submits the review (on OJS step 3's recommendation list must be chosen first; no `reviewRounds[].reviewers[].files[]` key, scenarios.md "Field shapes not built yet"), a confirmed review ("Complete") through the editor's "Read Review" › "Mark as Complete" (a `completed` seed is "Review Submitted", note r), the recommend-only flag through the Participants row's "Edit" › "Edit Assignment" › "Assignment privileges" box, a contributor without an account through the "Contributors" page's "Add Contributor", an edited template and an alternative through Settings › Workflow › Emails ("Edit" and "Add Template"), the "Notify All Authors" choice on the same screen, and a fee-charging journal through Settings › Distribution › Payments (enable, currency, the manual plugin and its instructions) and the "Payments" page's "Payment Types" tab (note s). The wizard's address is `{contextPath}/decision/record/{submissionId}?decision=N[&reviewRoundId=M]` (note a) with the app's `Decision` constants for `N` (Submission-stage decline 8, "Send To Production" 7, "Recommend Accept" 9, "Accept Submission" 2) and the round's id for `M`, read from the address bar after a Journal Manager presses a review-round button on that submission, or from the seed's response. Mailbox scenarios run on a scratch journal from `POST scenarios/context` with throwaway `users[]` (`manager`, `editor`, `sectionEditor`, `externalReviewer`, `author`), each with `givenName` and `familyName`, since the chips and the letters show them, and addresses naming the app and the test; nobody is auto-assigned on a scratch journal, so the Editor and the Section Editor go in `participants[]` (`role: 'editor'`, `'sectionEditor'`); the mail catcher is Mailpit at `MAILPIT_URL` (default `http://127.0.0.1:8025`), every read scoped by recipient, every absence bounded by an email that did arrive. A two-form-language journal: `context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales: ['en', 'fr_CA'], supportedSubmissionLocales: ['en', 'fr_CA']}`, the submission languages too: with French under "Forms" alone, "Add Contributor" › "Save" on scenario 8's given stays open under "Saving" with no message, the save being refused for the language the submission does not accept (seen 2026-09-20 on OJS and OMP; a finding of *Contributors & affiliations*); a minimum-reviews journal: `review: {numReviewsPerSubmission: 2}`; an open-review journal: `review: {defaultReviewMode: 'open'}`. Per scenario: 1 two seeds on the seeded journal, the first with the two completed reviewers and a revision, the second with `reviewer.julia` invited, read as `editor.diana`; 2 a Submission-stage seed, `editor.diana`; 3 the open-review journal with two `externalReviewer` users, the first submission `reviewRounds: [{reviewers: [{username: rv1, status: 'accepted'}, {username: rv2, status: 'accepted'}]}]` with rv1's review submitted through the wizard with a file and confirmed by the Editor, the second submission with rv2 `completed`, both submitted by the throwaway author; 4 a Submission-stage seed read as `copyeditor.carla`, `author.alex`, `sectioneditor.ravi` and `editor.diana`, with `manager.maya` recording "Send for Review" in a second browser session; 5 a scratch journal with throwaway `editor` and `sectionEditor`, the first submission with both in `participants[]` and one `externalReviewer` `completed`, the second with the Section Editor alone, the flag set on screen on both; 6 the minimum-reviews journal with three `externalReviewer` users: submission one with two `completed`, submission two with two `completed` then confirmed on screen, submission three with two `reviewRounds` entries, `[{reviewers: [{username: rv1, status: 'completed'}]}, {reviewers: [{username: rv3}]}]`; 7 a scratch journal with a throwaway `manager` (the CC address), the template edited and the alternative added by that manager, the submission with a submission file and the contributor added on screen; 8 the two-form-language journal, its "Notify All Authors" flipped by the throwaway manager, the contributor added on screen, the control a Submission-stage seed on the seeded journal; 9 a scratch preprint server with throwaway `manager`, `sectionEditor` (a Moderator, `role: 'sectionEditor'`) and `author`, the Moderator in `participants[]` and flagged on screen, the recommendation address `decision=9`; 10 a scratch journal with throwaway `manager`, `editor` and `author`, payments enabled and the charge set by the manager on screen, the control a Submission-stage seed on the seeded journal read as `editor.diana`; 11 three seeds on the seeded press, the first at the Submission stage with a file uploaded on screen, the second with the internal round above, the third with `decisions: ['sendExternalReview']` and `reviewer.julia` `completed`, read as `editor.diana`. The recipe is the tooling's: no screen shows it.

<a id="fn-a1"></a>
**f-a1** — Note c: `NewExternalReviewRound::getLabel()` is `editor.submission.decision.newReviewRound` ("New Review Round", also the breadcrumb and `pageTitle`), `getCompletedLabel()` `…newReviewRound.completed` "Review Round Created"; the button is `workflowConfigEditorialOJS.js` `t('editor.submission.createNewRound')` "Create New Review Round". OMP's `NewInternalReviewRound` inherits the label. Live-probed 2026-09-20 on OJS and OMP: the button "Create New Review Round", the wizard "New Review Round: Notify Authors", the breadcrumb "New Review Round", the closing window "Review Round Created".

<a id="fn-a2"></a>
**f-a2** — Note c: every one-page type guards its `Email` with `if (count($authors))`; `Steps::getState()` then returns `[]`, `record.tpl` renders no `<steps>` (`v-if="steps.length"`) and the footer with class `decision__footer--noSteps`; `DecisionPage::created()` skips `openStep`, `isOnLastStep` is true (index −1 === length −1), so the one button reads "Record Decision" and `submit()` posts `actions: []`. The author's assignment is removed through the Participants panel's row menu (*Stage participants*). Live-probed 2026-09-20 on all three apps: the wizard with no page recording at once; the closing sentences as quoted; no new mail for the author and no "An email has been sent" line in the Activity Log.

<a id="fn-a3"></a>
**f-a3** — Note e: the code reading behind the entry (`Composer.vue::compiledVariables()` overriding `recipientName` with the chips' names through `recipientVariable` when `canChangeRecipients` and `!separateEmails`, `record.tpl` passing no `separate-emails`) does not match the screen: live-probed 2026-09-20 on OJS and OMP, the "Notify Reviewers" letter shows "{$recipientName}" as a token and both reviewers' emails open with their own name, untouched and after an edit alike. Why the override does not reach the field was not traced.

<a id="fn-a4"></a>
**f-a4** — Note p: `IsRecommendation::addRecommendationQuery()` builds `$queryParticipantIds` from the stage's manager / sub-editor assignments with `!recommendOnly`, and `Repo::editorialTask()->addQuery()` stores `createdBy` = the recommending editor and `participants` = that list; the discussions panel lists a discussion for its participants (*Tasks & discussions*). Live-probed 2026-09-20 on OJS and OMP: the window's "Participants" list the deciding editor alone, the recommender shown as "Created by" on the row and "Message from" in the window; the recommender's own panel lists no discussion.

<a id="fn-a5"></a>
**f-a5** — Note o: `EditorDecisionNotificationManager::_getNotificationTaskLevel()` gives `NOTIFICATION_LEVEL_NORMAL` to every type but `PENDING_REVISIONS` and `RESUBMIT`; a grep of `lib/ui-library/src`, `lib/pkp/templates` and the three apps' `templates/` for `NOTIFICATION_TYPE_EDITOR_DECISION_*` or `editorDecisionTitle` finds no reader of the normal-level rows outside `PKPNotificationManager` itself; the retired author dashboard (`lib/pkp/pages/authorDashboard/`, forwarding since the 3.5 workflow) was their surface. Live-probed 2026-09-20 on OJS and OMP: after "Accept Submission" the author's Tasks panel row is gone and no screen shows "Submission accepted."; the notice itself is read from the code alone.

<a id="fn-ops1"></a>
**f-ops1** — Note v: OPS `classes/decision/Repository.php::getDecisionTypes()`, `classes/decision/types/{Decline,RevertDecline}.php::getFileAttachers()`, `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` (Production: `Decline`, or `RevertDecline` while `STATUS_DECLINED`), `isRecommendation()` false; `useWorkflowDecisions.js` has no OPS branch, so the minimum-reviews wrapper never runs there (no review stage). Live-probed 2026-09-20 on the preprint server (note v).

<a id="fn-ops2"></a>
**f-ops2** — Note g: the OPS locale has no text for `emailTemplate.variable.context.contextAcronym`, so `Mailable::getDataDescriptions()` hands the window the key between `##`. Live-probed 2026-09-20 on OPS (the "Insert Content" row's description); OJS reads "The journal's initials", OMP "The press's initials".

<a id="fn-a6"></a>
**f-a6** — Note b: `DecisionStageValidPolicy` compares the submission's stage with the decision's and `DecisionAllowedPolicy` the user's assignment; nothing reads the submission's status, and `Repository::validate()` does not either. Live-probed 2026-09-20: `decision=16` typed on a queued Submission-stage submission (OJS, OMP) and on a queued preprint (OPS), and `decision=15` on an active review round: the one-page wizard, "Submission Reactivated" on record, the author's email "We have reversed the decision to decline your submission" and the log line "reversed the decision to decline this submission".

<a id="fn-a7"></a>
**f-a7** — Note e: `NotifyReviewers::validateNotifyReviewersAction()` adds `validator.required` on `.recipients`, which `DecisionPage::setStepErrors()` maps into `step.errors`, but the composer renders no error slot under the "To" field. Live-probed 2026-09-20 on OJS and OMP: the banner, "View Error" opening the page, "To:" reading "None" with nothing under it.

<a id="fn-a8"></a>
**f-a8** — Note g: `steps/Email.php::getVariables()` passes each `$mailable->getData($locale)` value as it is and `InsertContent.vue` prints `item.value` as text, so the HTML of `reviewerComments`, of `signature` (a rich-text setting) and the empty `mailingAddress` of the seeded and scratch contexts reach the list as typed. Live-probed 2026-09-20 on OJS and OMP (the signature row on OPS too).

<a id="fn-a9"></a>
**f-a9** — Note d: `Composer.vue::search()` calls `GET emailTemplates?searchPhrase=`, which the run record shows answering 401 for the sub-editor role ("You are not authorized to access the requested resource."), while the listed templates load with the page; the controller's role gate was not traced. Live-probed 2026-09-20: a Section Editor on OJS, a Series Editor on OMP, a Moderator on OPS: the "Error" window with "OK", the empty list, the phrase kept until "Clear search phrase"; the manager-level editor's search working on all three.

<a id="fn-a10"></a>
**f-a10** — Note h: `Composer.vue::switchLocale()` reloads the template body for the new locale (`loadTemplate(initialTemplateKey)`), while the "Email Templates" list keeps the `getBodySnippet()` computed for the page's locale. Live-probed 2026-09-20 on all three apps: after "Switch to: French" the entry "Submission Declined (Pre-Review)" still shows "Dear {$recipientName},I'm sorry to inform you…".

<a id="fn-a11"></a>
**f-a11** — Note b: `DecisionStageValidPolicy` checks the stage and `record()` only that the round belongs to the submission. Live-probed 2026-09-20 on OJS and OMP: `decision=2&reviewRoundId={round 1}` on a submission at round 2 answered "Accept Submission: Notify Authors" with the rail "1 Notify Authors", "2 Notify Reviewers", "3 Select Files" and round 1's reviewers offered; not recorded.

<a id="fn-a12"></a>
**f-a12** — Note i: `record.tpl` passes `item.uploaderUserName` as each row's `uploaded-by`, `lib/pkp/classes/submissionFile/maps/Schema.php` fills `uploaderUserName` with the uploader's username, and `SelectSubmissionFileListItem.vue` prints it through `common.uploadedByAndWhen` "Uploaded by {$name} on {$date}". Live-probed 2026-09-20 by the test run (scenario 1, OJS and OMP): the "Revisions" row read "Uploaded by editor.diana on 2026-09-20" where the suite first expected the Editor's name; the suites assert the username form.

<a id="fn-ojs1"></a>
**f-ojs1** — Note s: OJS `classes/decision/types/Accept.php::runAdditionalActions()` (and `SkipExternalReview`'s through the shared trait) calls `requestPayment()` for every `ACTION_PAYMENT` action present, never reading the action's `requestPayment` value; `RequestPayment::validatePaymentAction()` only checks the key is set. Live-probed 2026-09-20 on OJS, twice on fresh submissions: "Waive" chosen, the author's "The publication fee is due for payment." row and the "Payment Request Notification" email arriving as with the fee requested.

<a id="fn-omp1"></a>
**f-omp1** — Note n: OMP's `locale/en/emails.po` `emails.reviewCancel.body` still reads "{$journalName}", a variable `ReviewCancel` does not carry (`contextName` is the one it has). Live-probed 2026-09-20: the press's email "…agreeing to review "{title}" for {$journalName}."; the journal's names the journal.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The decision wizard page (heading, sentence, error banners, step rail, page panels, footer) | `{journal}/decision/record/{submissionId}?decision=N[&reviewRoundId=M][&ret=…]`, opened by every decision and recommendation button | ROUTE-009 · AFFW-161, 162, 163, 164, 165, 166, 167, 168, 169, 170, 171, 172 · VUE-017 |
| The wizard's behaviour (step types, email seeding, cancel dialog, return address, submit, file copy, completion dialog, navigation) | the same page | AFFW-173, 174, 175, 176, 177, 178, 179, 180 |
| The email composer (templates, search, "{n} more", "Searching", language switch, "To", "Add CC/BCC", "CC", "BCC", "Subject", "Message", "Attach Files" button, chips, errors and load mask, side window) | an email page of the wizard | AFFW-181, 182, 183, 184, 185, 186, 187, 188, 189, 190, 191, 192, 193, 194, 195, 196 · VUE-087 |
| The "Attach Files" window and its sources ("Upload File", "Submission Files" with "Other Files", "Review Files", "Library Files", the attached-files list) | "Attach Files" on an email page | AFFW-197, 198, 199, 200, 201, 202, 203, 204, 205, 206, 207, 208, 209, 210, 211, 212 · VUE-088 |
| "Insert Content" window | the "Message" toolbar | VUE-089 |
| The recommend-only controls on a review round ("Recommendation" box, "Change decision", the no-deciding-editor sentence, "Recommend Revisions", "Recommend Accept", "Recommend Decline") | workflow › review stage; their display is *Review stage & rounds*', their recording flow this spec's | AFFW-331, 340, 341, 342, 343, 344 |
| The "Request Revisions" choice window, the minimum-reviews warning, the redirect to the wizard | any review-stage decision button | AFFW-460, 461, 462 · VUE-086 |
| Author and reviewer decision emails | the mail catcher; the author's "Notifications" list | MAIL-004, 005, 006, 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018, 019 |
| The recommendation email | the mail catcher; the stage's discussions panel | MAIL-032 |
| The discussion templates ("Request Copyedit", "Assign Editor", "Index Completed" and "Index Requested" on a press only, "Galleys Complete", "Ready for Production") | not email templates: "Find Template" does not reach them (note d); their home is *Tasks & discussions* | MAIL-076, 077, 078, 079, 080, 081, 082, 083 (riders) |
| The author's decision notices ("Revision required.", "Resubmit for review." in the Tasks panel; the normal-level ones no screen shows, A5) | header Tasks panel | NOTIF-021, 022, 023, 024, 025, 026, 027, 028 |
| The decision record's shape (number, stage, round, editor, date, actions) | the API's decisions cluster, cited from *Workflow screen & stage access* (API-042) | SET-009 |
| "Return to Workflow", "Return to Done" and publishing's "Move to Done" | recorded without the wizard (note u) | — |

## Reference — code anchors

- `lib/pkp/pages/decision/DecisionHandler.php` (`record()`, `getBreadcrumb()`, `getFileGenres()`) · `pages/decision/index.php` (OJS, OMP, OPS: no subclass) · `lib/pkp/templates/decision/record.tpl`
- `lib/ui-library/src/components/Container/DecisionPage.vue` · `components/Composer/{Composer,FileAttacherModal}.vue` · `components/FileAttacher/{FileAttacher,AttacherModal,FileAttacherFileStage,FileAttacherLibrary,FileAttacherReviewFiles,FileAttacherUpload,FileAttacherWorkflowStage,FileAttacherAttachedFiles}.vue`, `useFileAttacherWorkflowStage.js` (the workflow-stage source is the discussions form's, mounted by no decision type) · `components/Form/fields/{FieldPreparedContent,FieldPreparedContentInsertModal}.vue` · `components/InsertContent/InsertContent.vue` · `components/Steps/{Steps,Step}.vue` · `mixins/preparedContent.js`
- `lib/ui-library/src/pages/workflow/composables/useWorkflowDecisions.js` (`openDecisionPage`, `showWarningDialogAboutMinimumReviewsIfEnabled`) · `pages/workflow/modals/WorkflowSelectRevisionFormModal.vue` · `pages/workflow/components/action/WorkflowRecommendOnlyControls.vue` · `composables/useSubmission.js` (`checkMinimumConsideredReviews`, `ConfirmedReviewAssignmentStatuses`)
- `lib/pkp/classes/decision/{DecisionType,Decision,Repository,Step,Steps}.php` · `steps/{Email,Form,PromoteFiles}.php` · `types/*.php` · `types/traits/{InSubmissionStage,InExternalReviewRound,IsRecommendation,NotifyAuthors,NotifyReviewers,WithReviewAssignments}.php` · `types/interfaces/DecisionRetractable.php`
- `classes/decision/Repository.php` (OJS, OMP, OPS rosters) · OJS `classes/decision/types/{Accept,SkipExternalReview}.php`, `traits/RequestPayment.php`, `classes/components/forms/decision/RequestPaymentDecisionForm.php` · OMP `classes/decision/types/*.php`, `traits/InInternalReviewRound.php` · OPS `classes/decision/types/{Decline,RevertDecline}.php`
- `lib/pkp/classes/components/forms/decision/{SelectRevisionDecisionForm,SelectRevisionRecommendationForm}.php` · `lib/pkp/classes/components/fileAttachers/{BaseAttacher,Upload,FileStage,ReviewFiles,Library}.php`
- `lib/pkp/classes/security/authorization/{DecisionWritePolicy,DecisionAllowedPolicy,DecisionStageValidPolicy,DecisionTypeRequiredPolicy}.php` · `lib/pkp/classes/core/PKPPageRouter.php::handleAuthorizationFailure()`
- `lib/pkp/api/v1/submissions/PKPSubmissionController.php::addDecision()` · `PKPSubmissionFileController.php::copy()` · `lib/pkp/api/v1/emailTemplates/PKPEmailTemplateController.php::getMany()` · `lib/pkp/classes/emailTemplate/{Repository,Collector}.php`
- `lib/pkp/classes/mail/mailables/Decision*.php`, `RecommendationNotifyEditors.php`, `ReviewCancel.php`, `DecisionNotifyOtherAuthors.php` · `lib/pkp/classes/mail/traits/{Sender,Recipient,ReviewerComments,ReviewRoundAuthorResponse}.php` · `registry/emailTemplates.xml` (OJS, OMP, OPS) · `lib/pkp/schemas/decision.json`
- `lib/pkp/classes/notification/PKPNotificationManager.php::getNotificationTypeByEditorDecision()` · `managerDelegate/{EditorDecisionNotificationManager,PendingRevisionsNotificationManager,PKPEditingProductionStatusNotificationManager}.php` · `lib/pkp/classes/editorialTask/Repository.php::addQuery()` · `lib/pkp/classes/submission/maps/Schema.php` (`getPropertyStages()`, `checkDecisionPermissions()`) · `classes/submission/maps/Schema.php::getAvailableEditorialDecisions()` (OJS, OMP, OPS)
- `lib/pkp/classes/components/forms/context/PKPEmailSetupForm.php` (`notifyAllAuthors`) · `lib/pkp/schemas/context.json`
- Locale: `lib/pkp/locale/en/{editor,common,email,emails,mailable,notification,submission,manager,help,search}.po`; app overrides in `locale/en/{editor,emails,mailable,submission,manager}.po` (OJS: `editor.article.payment.requestPayment`, `payment.*`, `promoteFiles.externalReview`, `editorDecisionAccept.subject`, `editorDecisionSkipReview.subject`; OMP: the internal-review set; OPS: `mailable.decision.initialDecline.notifyAuthor.name`)
- App divergence points checked: no app subclass of the handler, the template, the page component, the composer, the attachers or the steps; the decision-type rosters and their app subclasses as listed; OPS's attacher override and empty recommendation set
