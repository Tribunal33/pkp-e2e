---
name: emails-management
status: verified
---

# Emails management

> Conventions (markers, badges, footnotes): [Reading a spec](GLOSSARY.md#reading-a-spec).

## Purpose

A journal sends dozens of kinds of email: the confirmation an author gets
on submitting, a review request, a decision letter, a password reset. Each
kind is an *email* in the sense of this spec, and each email is sent with a
*template*: its name, subject and body, with placeholders such as
"{$recipientName}" that are filled in when it goes out. The journal's
managers use two screens to control this. The "Emails" tab of Settings ›
Workflow holds the journal's email choices: the signature added to
automatic emails, who gets the submission confirmation, who is told about
editorial decisions, whether editors get the monthly statistics email.
Choosing not to send an email also takes it off the second screen, "Manage
Emails", reached from that tab, which lists the emails the journal can
send whose templates a manager may edit (Rule 21 names the exceptions).
There a manager reads what each email is for, edits its default
template, adds further templates that the people sending it can choose
from, and resets or removes what they changed. This spec owns both screens
and how templates are stored and restored. When each email is sent, to
whom, and how its sending window uses the templates belong to the feature
that sends it.

## Actors & permissions

Both screens are Settings pages, so who opens them is the Settings gate
that [Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)
describes: the journal's manager-level roles while their role has "Permit
changes to Settings" ticked (the Journal Manager and the Editor on a
journal and a press, the Preprint Server Manager on a preprint server),
and the Site Administrator. Below, "a manager" is anyone who opens them.
Every manager has the same offer on both screens; no control on them
depends on the role. <sup>a</sup>

| Action | Who may, and when |
|--------|--------------------|
| **Open the "Emails" tab and the "Manage Emails" page** | • every manager (Rule 1, Rule 6)<br>• a manager-level role without "Permit changes to Settings", the Section Editor and every other role: the access-denied page at either address, as for every Settings page<br>• signed out: the Login page <sup>a</sup> |
| **Change the journal's email choices** (the "Emails" tab's "Save") | • every manager (Rules 1–5) <sup>b</sup> |
| **Browse, search and filter the emails** | • every manager (Rules 6–8) <sup>f</sup> |
| **Edit a template** (the default one or an added one) | • every manager, on every email of the list, except "User Role Masthead Visibility Update Notification" on a press, whose "Edit" opens nothing [OMP1](#omp1) (Rules 9–11) <sup>l</sup> |
| **Add a template to an email** | • every manager, on the emails that take several templates (Rules 9, 12) <sup>m</sup> |
| **Reset an edited default template, remove an added one** | • every manager, on the emails that take several templates (Rules 16–18) <sup>q</sup> |
| **Reset all templates** ("Reset All") | • every manager (Rule 19) <sup>t</sup> |
| **Send an email with an edited or added template** | • whoever the sending feature allows; this spec only stores the templates (Side effects) |

## Fields & validation

**The "Emails" tab** (Settings › Workflow › "Emails"; the page is headed
"Workflow Settings"), top to bottom. Each group is a heading with a
sentence under it, except "Advanced", which has its heading alone; one
"Save" under the last group saves the tab.

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Group "Manage Emails": "Edit the messages sent in emails from this journal." | — | — <sup>b</sup> |
| "Email Templates" | — | No box: the sentence "Add and edit templates for all of the emails sent by the system.", whose words "Add and edit templates" are a link to the "Manage Emails" page (Rule 6) <sup>b</sup> |
| "Signature", described "Emails sent automatically on behalf of the journal will have the following signature added." | no | Rich text with "Insert Content" (Rule 2) <sup>c</sup> |
| Group "New Submission": "Configure the email notifications to send when a new submission is made." | — | — <sup>b</sup> |
| "Submission Confirmation" (on a preprint server "Submission Acknowledgement (Pending Moderation)"), described "Who should receive an email when a new submission is completed." | no | Three choices: "Send an email to all authors." (the default), "Send an email to the submitting author only.", "Do not send an email." (Rule 3). After "Do not send an email." is saved, the tab reopens with none of the three selected ([Submission wizard A12](U21-submission-wizard.md#a12)) <sup>b</sup> |
| "Notify Primary Contact", described "Send a copy of the submission acknowledgement email to this journal's primary contact." | no | Shown only while "Submission Confirmation" is not at "Do not send an email." (Rule 4). Two choices: "Yes, send a copy to {email}", {email} being the journal's principal contact, and "No" (the default). On a press neither choice is selected when the tab opens ⚠ [OMP2](#omp2) <sup>b</sup> |
| "Notify Anyone", described "A copy of the submission acknowledgement email will be sent to any of the email addresses entered here. Separate multiple email addresses with a comma. Example: one@example.com,two@example.com" | no | A one-line box, empty by default; shown with "Notify Primary Contact" (Rule 4). An address that is not valid is refused with "One or more of these email addresses is not valid." under the box; on a press "This is not a valid email address." shows above it. A press refuses a comma-separated list with "This is not a valid email address." alone ([Submission wizard OMP2](U21-submission-wizard.md#omp2)) <sup>b</sup> |
| {OPS} Group "Preprint Posted": "Configure the email notifications to send when a new preprint is posted." | — | Only on a preprint server, after "New Submission" <sup>b</sup> |
| {OPS} "Preprint Posted", described "Whether or not to send an email to the authors of the preprint when it is posted." | no | Two choices: "Send an email to all authors." (the default) and "Do not send an email." (Rule 3) <sup>b</sup> |
| Group "Editorial Decisions": "Configure the email notifications to send to authors when an editorial decision is recorded." | — | — <sup>b</sup> |
| "Notify All Authors", described "Who should receive a notification email when an editorial decision is recorded?" | no | Two choices: "Send an email notification to all authors of the submission." (the default) and "Only send an email to authors assigned to the submission workflow. Usually, this is the submitting author." (Rule 3) <sup>b</sup> |
| Group "For Editors": "Configure the email notifications to send to editors." | — | — <sup>b</sup> |
| "Editorial statistics", described "Whether or not to send a monthly email to editors with the editorial statistics of the journal, such as accept and decline rates. Editors can unsubscribe from this email from their user profile." | no | Two choices: "Send a monthly email to editors." (the default) and "Do not send the email to editors." (Rule 3). The description says "the journal" on a press and a preprint server too ⚠ [A1](#a1) <sup>b</sup> |
| Group "Advanced" | — | — <sup>b</sup> |
| "Bounce Address" | no | On the test installs no box: the sentence "In order to send undeliverable emails to a bounce address, the site administrator must enable the allow_envelope_sender option in the site configuration file. Server configuration may be required, as indicated in the OJS documentation." ("OMP documentation", "OPS documentation" on a press and a preprint server; Rule 5) <sup>e</sup> |

**The "Manage Emails" page** (reached only through the "Add and edit
templates" link of the tab above), top to bottom:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| Page heading "Manage Emails"; the list's own heading "Emails" | — | — <sup>f</sup> |
| A search box, "Search by name or description" | no | Applied when Enter is pressed; an "×" button clears it (Rule 7) <sup>h</sup> |
| "Reset All" (a button in red lettering beside the search box) | — | Opens the confirmation of Rule 19 <sup>t</sup> |
| The list: one row per email, its name in bold and its description under it, with an "Edit" button | — | Which emails, in which order: Rule 6. "Edit": Rule 9 <sup>g</sup> |
| A "Filters" panel beside the list | — | Three blocks of filter buttons: an unheaded block of groups, "Sent From" and "Sent To" (Rule 8) <sup>i</sup> |

**An email's window** (the "Edit" of an email that takes several
templates, Rule 9): a window over the right of the page, titled with the
email's name.

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| The email's description, then "Add and edit templates that you would like to make available to the user when they are sending this email. The default will be loaded automatically, and the user will be able to quickly load any other templates you add here." | — | — <sup>k</sup> |
| A list headed "Templates", with an "Add Template" button at the top right | — | One row per template, the default first, each showing the template's name (Rule 10). "Add Template": Rule 12 <sup>k</sup> |
| On each row: a "Default" badge (the default row only), "Edit", then "Reset" or "Remove" | — | Which row shows which button: Rule 10 <sup>k</sup> |

**The "Edit Template" window** (a row's "Edit", "Add Template", or the
"Edit" of an email that takes one template), top to bottom, with "Save"
under the last field:

| Field (UI label) | Required? | Rules |
|------------------|-----------|-------|
| "Name", described "Enter a brief name to help you find this template." | yes | A one-line box. Empty: "This field is required.". Longer than 255 characters: "This may not be greater than 255 characters." (Rule 13) <sup>n</sup> |
| "Subject" | yes | A one-line box. Empty: "This field is required." (Rule 13) <sup>n</sup> |
| "Body" | yes | Rich text with the buttons Bold, Italic, Superscript, Subscript, Insert/edit link, Blockquote, Bullet list, Numbered list and "Insert Content" (Rule 14). Empty: "This field is required." (Rule 13) <sup>n</sup> |

The three fields hold one text per form language of the journal (Rule
20).

## Rules & state

**The "Emails" tab**

1. **Saving the tab.** The tab is one form. "Save" stores every choice on
   it at once and shows "Saved" beside the button; a refused value keeps
   the whole tab unsaved, with its message under the field and "Please
   correct one error." beside "Save", as on every settings form. A change
   not yet saved stays on the tab while the manager visits the page's
   other tabs; leaving the page drops it, and nothing asks first.
   <sup>b</sup>
2. **The journal's signature.** "Signature" is text the journal adds to
   its automatic emails: an email carries it where its template holds the
   placeholder "{$contextSignature}", and nowhere else. The installed
   templates that hold it are:
   - on a journal: "Submission Confirmation", "Submission Confirmation
     (Other Authors)", "Editor Assigned (Auto)", "Open Access Notify",
     "Review Reminder (Automated)", "Review Response Overdue (Automated)",
     "Statistics Report Notification" and "Validate Email (Journal
     Registration)";
   - on a press: the same without "Open Access Notify", with "Validate
     Email (Press Registration)";
   - on a preprint server: "Moderator Assigned (Auto)", "Statistics Report
     Notification", "Submission Acknowledgement (Pending Moderation)",
     "Submission Acknowledgement (No Moderation Required)", "Submission
     Confirmation (Other Authors)" and "Validate Email (Server
     Registration)".

   A template edited to drop the placeholder sends without the signature.
   A new journal's signature reads a dash, then "This is an automated
   message from {journal name}." with the journal's name as a link to its
   home page. The box's "Insert Content" lists the journal's own
   placeholders (its name, address, initials, principal contact's name and
   email, mailing address, and the addresses of the lost-password page, the
   submissions list and the user's profile), not the signature itself; on
   a preprint server the initials row is described
   "##emailTemplate.variable.context.contextAcronym##" ⚠ [OPS1](#ops1).
   This is the journal's signature, distinct from the "Signature" a user
   keeps on their own profile. <sup>c</sup>
3. **Choosing not to send an email takes it off the list.** Each choice
   below stops an email from going out, and while it stands the email has
   no row on the "Manage Emails" page, so its templates cannot be edited;
   switching the choice back brings the row back with the templates as
   they were. <sup>d</sup>

   | Choice | Rows the "Manage Emails" page loses |
   |--------|-------------------------------------|
   | "Submission Confirmation" at "Send an email to the submitting author only." | "Submission Confirmation (Other Authors)" |
   | "Submission Confirmation" at "Do not send an email." | "Submission Confirmation" ("Submission Acknowledgement (Pending Moderation)" on a preprint server) and "Submission Confirmation (Other Authors)" |
   | "Notify All Authors" at "Only send an email to authors assigned…" | "Notify Other Authors" |
   | "Editorial statistics" at "Do not send the email to editors." | "Statistics Report Notification" |
   | {OPS} "Preprint Posted" at "Do not send an email." | "Posted Acknowledgement" |

   On a preprint server "Submission Acknowledgement (No Moderation
   Required)" keeps its row whatever "Submission Confirmation" says.
4. **The copy fields follow the confirmation.** "Notify Primary Contact"
   and "Notify Anyone" show while "Submission Confirmation" is at either
   sending choice and disappear the moment "Do not send an email." is
   picked, before any "Save". <sup>b</sup>
5. **The bounce address needs the server's permission.** "Bounce Address"
   is a box only when the install's configuration file allows an envelope
   sender (its email section's "allow_envelope_sender", off by default and
   on the test installs). Off, it is the sentence of the Fields table and
   holds nothing to save. The on end is read from the code, since the
   test installs keep the option off: the box is expected to take one
   email address, with the tip "Any undeliverable emails will result in
   an error message to this address.". <sup>e</sup>

**The "Manage Emails" page**

6. **What the list holds.** One row for every email the journal can send
   whose templates a manager may edit, minus the emails switched off on
   the "Emails" tab (Rule 3), sorted by name. With the tab at its
   defaults a journal lists 66 emails, a press 56 and a preprint server
   17:
   - a journal and a press share 55 rows; a journal adds "Issue Published
     Notify", "Open Access Notify", "Payment Request", "Purchase
     Individual Subscription", "Purchase Institutional Subscription",
     "Renew Individual Subscription", "Renew Institutional Subscription",
     "Subscription Expired", "Subscription Expired Last", "Subscription
     Expires Soon" and "Subscription Notify"; a press adds "Sent to
     Internal Review", and names its registration email "Validate Email
     (Press Registration)" where a journal has "Validate Email (Journal
     Registration)";
   - a preprint server lists "Moderator Assigned (Auto)", "New
     Announcement", "New Version Created", "New Version Posted", "Notify
     Other Authors", "Password Reset Confirm", "Posted Acknowledgement",
     "Reinstate Submission Declined Without Review", "Statistics Report
     Notification", "Submission Accepted", "Submission Acknowledgement (No
     Moderation Required)", "Submission Acknowledgement (Pending
     Moderation)", "Submission Confirmation (Other Authors)", "Submission
     Declined", "User Created", "Validate Email (Server Registration)" and
     "Validate Email (Site)". It lists "Submission Accepted" although no
     preprint server action sends it ⚠ [OPS2](#ops2).

   On a journal and a press the three ORCID emails close the list under
   the names "orcidCollectAuthorId", "orcidRequestAuthorAuthorization" and
   "orcidRequestUpdateScope" ⚠ [A2](#a2). A preprint server lists no
   ORCID email, no role-invitation email and no email-change email; the
   features that send them record those gaps. <sup>g</sup>

   - 6a. **In French.** On a journal with French ticked under "UI", a
     manager who picks French with "Change Language"
     ([Languages & locales](U57-languages-and-locales.md#change-language))
     reads the page as "Gérer les courriels", the same emails under their
     French names and descriptions. Some emails show a code between hash
     signs instead, and on a preprint server so do the Moderator's filter
     buttons ⚠ [A11](#a11). <sup>g</sup>
7. **Search.** Typing in the search box changes nothing until Enter is
   pressed; the list then keeps the rows whose name or description holds
   the typed text, letters in any case, the words together as typed
   ("Review Request" keeps "Review Request" and "Review Request
   Subsequent"). A phrase nothing holds leaves "No items found." in the
   list. The "×" button in the box, or Enter on an empty box, brings the
   whole list back. Search and filters apply together. <sup>h</sup>
8. **Filters.** Pressing a filter button marks it and narrows the list; an
   "×" beside a marked button, or pressing the button again, unmarks it.
   The buttons are, in this order:
   - the groups: "Submission", "Review", "Copyediting", "Production",
     "Other" on a journal and a press; "Submission", "Production", "Other"
     on a preprint server;
   - "Sent From": "Editor", "Reviewer", "Assistant", "Reader", then
     "Subscription Manager" on a journal only, and "System" last; on a
     preprint server "Moderator", "Reader", "System";
   - "Sent To": "Editor", "Reviewer", "Assistant", "Author", "Reader",
     then "Subscription Manager" on a journal only; on a preprint server
     "Moderator", "Author", "Reader".

   A marked button keeps the emails of that group, sent by that role or
   sent to that role ("System" meaning the journal itself, with no person
   as sender). "Sent From" › "Reader" keeps a journal's four
   subscription purchase and renewal emails; on a press and a preprint
   server it always leaves "No items found." ⚠ [A8](#a8). Every marked
   button must match: marking "Submission" and "Review" keeps only the emails that belong to both groups, rather than
   those of either ⚠ [A3](#a3). The filters and the search are forgotten
   when the page is left or reloaded. <sup>i</sup>
9. **Two kinds of email.** An email's "Edit" opens one of two windows,
   after a short full-screen spinner:
   - **emails that take several templates** open the email's window
     (Fields; Rule 10). They are the emails a person sends from a window
     where a template can be picked: on a journal and a press "New Review
     Round Initiated", "Notify Reviewers of Decision", "Recommendation
     Made", "Reinstate Declined Submission", "Reinstate Submission Declined
     Without Review", "Request Author Review Response", "Resend Review
     Request to Reviewer", "Resubmit for Review", "Review Cancel", "Review
     Confirm", "Review Reminder", "Review Request", "Review Request
     Subsequent", "Review Round Cancelled", "Reviewer Reinstate", "Reviewer
     Unassign", "Revisions Requested", "Sent to Production", "Sent to
     Review", "Submission Accepted", "Submission Accepted (Without
     Review)", "Submission Declined", "Submission Declined (Pre-Review)",
     "Submission Moved to Copyediting", "Submission Saved for Later" and
     "Submission Sent Back from Copyediting", with "Sent to Internal
     Review" on a press; on a preprint server "Reinstate Submission
     Declined Without Review", "Submission Accepted" and "Submission
     Declined";
   - **every other email takes one template** and opens straight into the
     "Edit Template" window holding its default template.

   On a press, "Edit" on "User Role Masthead Visibility Update
   Notification" opens neither: the spinner never ends, no window or
   message shows, and nothing on the page answers until a reload
   ⚠ [OMP1](#omp1). <sup>j</sup>
10. **The email's window.** The list under "Templates" starts with the
    default template, badged "Default", followed by the templates added
    to this email (Rule 12). Every row has "Edit". The default row adds
    "Reset" once its template has been edited and saved (Rule 16); an
    added row always has "Remove" (Rule 17). An email nobody has touched
    shows its default row with "Default" and "Edit" alone. <sup>k</sup>
11. **Editing a template.** "Edit" opens "Edit Template" filled with the
    template's name, subject and body. "Save" stores the change, shows
    "Saved" and closes the window about a second later; in the email's
    window the row shows the new name at once. The change belongs to this
    journal only: another journal of the install keeps its own text.
    From then on every email of that kind the journal sends starts from
    the edited text, and a sending window that shows the letter before it
    goes out opens with it (Side effects). <sup>l</sup>
12. **Adding a template.** "Add Template" opens an empty window of the
    same three fields, titled "Edit Template" like the editing window
    ⚠ [A4](#a4). "Save" adds the template as a new row under the email's
    default, and the window closes about a second later. The added
    template becomes a choice wherever that email's sending window lists
    templates; it is never sent unless someone picks it. Only the emails
    that take several templates offer "Add Template". <sup>m</sup>
13. **Refused saves.** "Name", "Subject" and "Body" must each hold text
    (in the journal's primary language when there are several, Rule 20),
    and "Name" at most 255 characters. A save that breaks this stores
    nothing and keeps the window open, with each field's message under it
    and, beside "Save", "Please correct one error." ("Please correct {n}
    errors." for more) with the button "Jump to next error". "Save" then
    stays greyed out until every field with a message holds text again;
    each message clears as its field is filled. <sup>n</sup>
14. **Placeholders.** The body's "Insert Content" button opens the window
    of that name, which works as in the decision wizard
    ([→ "Insert Content"](U34-editorial-decision-recording.md#insert-content)):
    one row per placeholder of this email, each shown as it is written
    ("{$recipientName}") with its description and an "Insert" button that
    drops the placeholder at the cursor and closes the window. The
    placeholders differ by email:
    - most emails have the journal's own (Rule 2); an email about a
      submission adds the submission's, one about a review the review's;
    - "Password Reset Confirm" and "Validate Email (Site)" have the
      site's instead ("{$siteTitle}", "{$siteSignature}",
      "{$siteContactName}", "{$siteContactEmail}");
    - "Change Email Address Invitation" (a journal and a press) has only
      the recipient's and the sender's.

    In "Edit Template" a placeholder stays as written, shown as a small
    grey tag in capitals. It is filled in when a sending window opens the
    letter (a decision letter shows the author's name where the template
    has "{$recipientName}") or when the email goes out. On a preprint
    server the initials row shows the raw description of [OPS1](#ops1).
    <sup>o</sup>
15. **Closing without saving.** The back arrow at the window's top left
    (read "Close" by a screen reader), or Escape, closes "Edit Template"
    without asking; Escape closes only "Edit Template", and the email's
    window stays. Nothing typed since the last "Save" is stored, and the
    email's list is unchanged. Pressing the same row's "Edit" next, while
    the email's window is still open, shows what was typed, although none
    of it was saved. Opening another row or "Add Template" first, or
    closing the email's window, brings back the saved text, and a
    one-template email always reopens on it. Leaving the page with unsaved
    changes asks nothing either and stores nothing. <sup>p</sup>
16. **Resetting the default template.** "Reset" on the default row opens a
    confirmation titled "Reset Template": "Are you sure you want to reset
    the subject and body to their defaults for the template {email
    name}?", with "Reset Template" in red lettering and "Cancel".
    Confirming restores the installed name, subject and body, closes the
    confirmation, and leaves the row without "Reset". "Cancel" changes nothing. <sup>q</sup>
17. **Removing an added template.** "Remove" on an added row opens a
    confirmation titled "Remove Template": "Are you sure you want to
    delete the template {subject}?", naming the template by its subject
    rather than the name its row shows ⚠ [A5](#a5), with "Remove
    Template" in red lettering and "Cancel". Confirming deletes the
    template and its row; it is no longer offered by the email's sending
    window. The default
    template cannot be removed. <sup>r</sup>
18. **One-template emails cannot be reset one by one.** The "Edit
    Template" window of an email that takes one template has "Save" and
    nothing else: once its default template is edited, only "Reset All"
    brings the installed text back, and that also throws away every other
    edited or added template of the journal ⚠ [A6](#a6). <sup>k</sup>
19. **Reset All.** "Reset All" opens a confirmation titled "Reset All": "If
    you reset all templates, all modifications to the email templates will
    be lost. Do you want to confirm this operation?", with "Reset All" in
    red lettering and "Cancel". Confirming reloads the page, and on the
    reloaded list every edited default template of every email is back to its
    installed text and every added template is gone. The "Emails" tab's
    choices, the signature included, are untouched. "Cancel" changes
    nothing. <sup>t</sup>
20. **Several languages.** When the journal has more than one form
    language (Settings bullet 9), each field of "Edit Template" holds one
    text per language:
    - At the window's top right a button names the other language
      ("French") beside the primary one ("English"). Pressing "French"
      shows beside each field its French twin, labelled "French"
      ("French Name in French" and so on for a screen reader); pressing
      it again hides them. Under each field the window counts the
      languages filled ("2/2 languages completed").
    - A new template needs all three fields in the primary language:
      saved with only the other language filled, it is refused with "This
      field is required." under each empty primary-language field. The
      other languages may stay empty, except that an emptied
      other-language field of a default template comes back
      ⚠ [A9](#a9).
    - Emptying a primary-language field of an existing template is
      refused with "You must complete this field in {language}." instead
      of "This field is required.".
    - On a preprint server "Submission Accepted" opens with its French
      subject and body empty ("1/2 languages completed").
    - On a press and a preprint server the French text of the submission
      confirmation ("Submission Confirmation"; on a preprint server
      "Submission Acknowledgement (Pending Moderation)") is a journal's,
      speaking of "la revue" ⚠ [A10](#a10).

    The seeded journal has one form language, so its fields hold one text
    and the window has no language button. <sup>u</sup>
21. **Emails the list does not show.** Beyond the emails switched off on
    the tab (Rule 3):
    - the email the manual payment method sends when a reader reports a
      payment is not listed on a journal or a press, even with "Manual
      Fee Payment" set up, so its text cannot be changed ⚠ [A7](#a7);
    - the discussion and task templates ("Request Copyedit", "Ready for
      Production"… on a journal and a press; "Assign Editor" and
      "Discussion (Production)" on a preprint server) are not emails of
      this list: they are managed on Settings › Workflow › "Tasks and
      Discussions" (*[Tasks & discussions](U37-tasks-and-discussions.md)*).
      <sup>v</sup>

## Side effects

- **A saved template is the journal's from then on.** Every later email of
  that kind the journal sends starts from it, in each language it has
  (for a second language this is read from the code; no email sent in
  one has been seen). A sending window that shows the letter first (a
  decision, a review request) opens with it and offers the added
  templates. Emails already sent are not changed. <sup>w</sup>
- **Reset, Remove and Reset All lose the manager's text for good.** There
  is no undo; the installed text is back at once. Nothing is emailed and
  nothing is written to any log by these actions or by a template save.
  <sup>w</sup>
- **The "Emails" tab changes which automatic emails go out** (Settings
  bullets 2–7); each email's sending belongs to the feature that sends it
  (Cross-feature interactions).
- **This feature sends no email of its own.**

## Settings that modify behavior

1. **"Signature"** (Settings › Workflow › "Emails", group "Manage
   Emails"; a new journal holds the automated-message line of Rule 2).
   Changed, every email whose template holds "{$contextSignature}" ends
   with the new text; emptied, those emails end with nothing (Rule 2).
   <sup>c</sup>
2. **"Submission Confirmation"** (same tab, group "New Submission";
   default "Send an email to all authors."). "Send an email to the
   submitting author only." removes "Submission Confirmation (Other
   Authors)" from the list; "Do not send an email." removes both rows and
   hides the two copy fields (Rules 3, 4). Who then receives the
   confirmation is the *[Submission wizard](U21-submission-wizard.md)*'s.
   <sup>d</sup>
3. **"Notify Primary Contact"** (same group; default "No", none selected
   on a press [OMP2](#omp2)). "Yes, send a
   copy to {email}" copies the confirmation to the principal contact
   (the *[Submission wizard](U21-submission-wizard.md)*'s side effect).
   <sup>b</sup>
4. **"Notify Anyone"** (same group; empty by default). Addresses typed
   there receive a copy of the confirmation (the *[Submission
   wizard](U21-submission-wizard.md)*'s side effect). <sup>b</sup>
5. **{OPS} "Preprint Posted"** (same tab, group "Preprint Posted";
   default "Send an email to all authors."). "Do not send an email."
   removes "Posted Acknowledgement" from the list (Rule 3); the sending is
   *[Publish, schedule & versions](U49-publish-schedule-and-versions.md)*'s.
   <sup>d</sup>
6. **"Notify All Authors"** (same tab, group "Editorial Decisions";
   default "Send an email notification to all authors of the
   submission."). The other choice removes "Notify Other Authors" from the
   list (Rule 3); who then gets decision emails is *[Editorial decision
   recording](U34-editorial-decision-recording.md)*'s. <sup>d</sup>
7. **"Editorial statistics"** (same tab, group "For Editors"; default
   "Send a monthly email to editors."). "Do not send the email to
   editors." removes "Statistics Report Notification" from the list
   (Rule 3); the email itself and the profile row it adds are
   *[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)*'s.
   <sup>d</sup>
8. **"allow_envelope_sender"** (the install's configuration file, email
   section; off by default and on the test installs). Off, "Bounce
   Address" is a sentence (Rule 5). On (read from the code), it is
   expected to become a box whose address receives the error reports for
   undeliverable emails. <sup>e</sup>
9. **The journal's form languages** (Settings › Website › Setup ›
   Languages, the "Forms" column;
   *[Languages & locales](U57-languages-and-locales.md#form-languages)*;
   the seeded journal has English alone). With more than one, templates
   hold one text per language (Rule 20). <sup>u</sup>
10. **The rest of the configuration file's email section** (how mail
    leaves the server, the envelope sender, the rewriting of the "From"
    header for DMARC) changes how emails are delivered, never what either
    screen offers; no screen shows these keys. Its two account-validation keys belong to
    *[Registration & account validation](U02-registration-and-account-validation.md)*.
    <sup>x</sup>

## Cross-feature interactions

- **[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)**:
  the Settings gate both screens sit behind, and the principal contact
  "Notify Primary Contact" names.
- **Every feature that sends an email** owns when it is sent, to whom, its
  installed text and the window that sends it. Among them:
  *[Editorial decision recording](U34-editorial-decision-recording.md)*
  (the decision letters, the "Email Templates" list and "Find Template"
  of its sending pages, which show the templates edited and added here;
  its register records the press's "Review Cancel" text printing
  "{$journalName}"), *[Reviewer assignment & management](U27-reviewer-assignment-and-management.md)*
  (the reviewer emails, and the same literal "{$journalName}" in a
  press's unassign notice), *[Submission wizard](U21-submission-wizard.md)*
  (the submission confirmation and its copies),
  *[Author response to reviews](U30-author-response-to-reviews.md)*,
  *[Copyediting stage](U32-copyediting-stage.md)*,
  *[Production stage](U33-production-stage.md)*,
  *[Stage participants](U35-stage-participants.md)*,
  *[Announcements](U12-announcements.md)*,
  *[Registration & account validation](U02-registration-and-account-validation.md)*.
- **[User profile](U03-user-profile.md)**, **[ORCID integration](U04-orcid-integration.md)**
  and **[User invitations](U06-user-invitations.md)**: the emails a
  preprint server sends but does not list (Rule 6) are recorded there, as
  is a user's own "Signature" (Rule 2).
- **[Notifications center & email preferences](U05-notifications-center-and-email-preferences.md)**:
  the monthly statistics email and the notification emails' footer, which
  is added after the template and is not edited here.
- **[Tasks & discussions](U37-tasks-and-discussions.md)**: the discussion
  and task templates of Settings › Workflow › "Tasks and Discussions",
  which this list does not show (Rule 21).
- **[Subscriptions](U51-subscriptions.md)**: the subscription and payment
  emails a journal lists (Rule 6), and the manual payment method whose
  email is missing (Rule 21).
- **[Languages & locales](U57-languages-and-locales.md)**: the form
  languages of Rule 20, the interface language of Rule 6a, and why a
  text the French translation lacks shows as a code (its Rule 21a).

## Canonical scenarios

Scenario 1 only reads the seeded journal, with ready accounts; the others
change templates and email choices, so they run on a scratch journal with
throwaway accounts and read the seeded journal only for comparison. The
accounts, passwords and tooling recipe are in the footnote. <sup>s</sup>

1. **The seeded journal's email list: search, filters, and who may open it**

   Given: Journal Manager and Section Editor, each with a ready account on
   the seeded journal, the Section Editor in a second browser.

   - **The way in**: Journal Manager: open Settings › Workflow › "Emails":
     the "Manage Emails" group holds "Email Templates", which reads "Add
     and edit templates for all of the emails sent by the system.". Press
     "Add and edit templates": the page "Manage Emails" opens, with the
     list headed "Emails", the search box "Search by name or description"
     with "Reset All" in red lettering beside it, and a "Filters" panel
     beside the list (Fields, both screens).
   - **The list**: 66 rows on a journal, 56 on a press, 17 on a preprint
     server, sorted by name, each a name in bold with its description
     under it and an "Edit" button. The registration email is "Validate
     Email (Journal Registration)" ("Validate Email (Press Registration)"
     on a press, "Validate Email (Server Registration)" on a preprint
     server). A journal lists "Issue Published Notify" and "Subscription
     Notify", a press "Sent to Internal Review". On a journal and a press
     the list ends with "orcidCollectAuthorId",
     "orcidRequestAuthorAuthorization" and "orcidRequestUpdateScope"
     ⚠ [A2](#a2). A preprint server lists "Moderator Assigned (Auto)",
     "Posted Acknowledgement" and "Submission Accepted" ⚠ [OPS2](#ops2),
     and no row whose name says ORCID (Rule 6).
   - **Search**: type submission declined in the search box: the list
     does not change. Press Enter: the list keeps the rows whose name or
     description holds those words, "Submission Declined" among them (on
     a journal and a press "Submission Declined (Pre-Review)" too).
     Replace the text with Zebra crossing and press Enter: the list reads
     "No items found.". Press the "×" in the box: the whole list is back
     (Rule 7).
   - **The filter buttons**: the "Filters" panel holds, in this order, the
     unheaded block "Submission", "Review", "Copyediting", "Production",
     "Other" (on a preprint server "Submission", "Production", "Other");
     "Sent From": "Editor", "Reviewer", "Assistant", "Reader", on a journal
     "Subscription Manager", then "System" (on a preprint server
     "Moderator", "Reader", "System"); "Sent To": "Editor", "Reviewer",
     "Assistant", "Author", "Reader", on a journal "Subscription Manager"
     (on a preprint server "Moderator", "Author", "Reader") (Rule 8).
   - **"Sent From" › "Reader"**: press "Reader" under "Sent From": the
     button is marked, with an "×" beside it. On a journal the list keeps
     "Purchase Individual Subscription", "Purchase Institutional
     Subscription", "Renew Individual Subscription" and "Renew
     Institutional Subscription"; on a press and a preprint server it
     reads "No items found." ⚠ [A8](#a8). Press "Reader" again: it is no
     longer marked and the whole list is back (Rule 8).
   - **"Submission"**: press "Submission": it is marked and the list
     holds fewer rows. Press the "×" beside it: it is no longer marked and
     the whole list is back (Rule 8).
   - **Forgotten on reload**: press "Submission", type submission declined
     in the search box and press Enter, then reload the page: no button is
     marked, the box is empty and the whole list shows (Rule 8).
   - **The Section Editor**: sign in and open the addresses of the
     "Emails" tab and of "Manage Emails", as the Journal Manager's browser
     shows them: each shows the access-denied page ("The current role does
     not have access to this operation.") (Actors row 1).
   - **Control**: the Journal Manager's browser, at the same two
     addresses, shows the "Emails" tab and the "Manage Emails" page with
     its whole list (Actors row 1). <sup>s</sup>

2. **Save the "Emails" tab, and the rows its choices take off the list**

   Given: Journal Manager, on a scratch journal whose "Emails" tab is at
   the install defaults.

   - **The tab at its defaults**: open Settings › Workflow › "Emails" (the
     page is headed "Workflow Settings"): the groups "Manage Emails", "New
     Submission", on a preprint server "Preprint Posted", then "Editorial
     Decisions", "For Editors" and "Advanced", each with a sentence under
     its heading except "Advanced", and one "Save" under the last group.
     Selected: "Send an email to all authors." under "Submission
     Confirmation" (on a preprint server "Submission Acknowledgement
     (Pending Moderation)"); "No" under "Notify Primary Contact" (on a
     press neither choice ⚠ [OMP2](#omp2)); "Notify Anyone" is empty; on a
     preprint server "Send an email to all authors." under "Preprint
     Posted"; "Send an email notification to all authors of the
     submission." under "Notify All Authors"; "Send a monthly email to
     editors." under "Editorial statistics", whose description speaks of
     "the journal" on a press and a preprint server too ⚠ [A1](#a1).
     "Bounce Address" is no box but the sentence "In order to send
     undeliverable emails to a bounce address, the site administrator
     must enable the allow_envelope_sender option in the site
     configuration file. Server configuration may be required, as
     indicated in the OJS documentation." ("OMP documentation", "OPS
     documentation") (Fields, the "Emails" tab; Rule 5).
   - **A one-template email edited**: press "Add and edit templates",
     type Statistics Report Notification in the search box and press
     Enter, then press "Edit" on "Statistics Report Notification": after a
     short full-screen spinner "Edit Template" opens straight away.
     Replace "Subject" with Monthly figures and press "Save": "Saved"
     (Rules 9, 11).
   - **A bad address refused**: open Settings › Workflow › "Emails"
     again, choose "Do not send the email to editors.", type not-an-email
     in "Notify Anyone" and press "Save": under the box "One or more of
     these email addresses is not valid." (on a press "This is not a valid
     email address." shows above it), and beside "Save" "Please correct
     one error.". Reload the page: "Editorial statistics" is at "Send a
     monthly email to editors." and "Notify Anyone" is empty (Rule 1;
     Fields, the "Emails" tab).
   - **A change left unsaved**: choose "Do not send the email to
     editors.", open the "Tasks and Discussions" tab, then "Emails" again:
     the choice is still made. Open Settings › Journal: the page changes
     and nothing asks first. Open Settings › Workflow › "Emails" again:
     "Send a monthly email to editors." is selected (Rule 1).
   - **Choices saved**: choose "Send an email to the submitting author
     only.", "Only send an email to authors assigned to the submission
     workflow. Usually, this is the submitting author.", "Do not send the
     email to editors." and, on a preprint server, "Do not send an email."
     under "Preprint Posted", and press "Save": "Saved" beside the button.
     Reload the page: every choice is as saved (Rule 1).
   - **The rows they take off**: on "Manage Emails", search each of these
     names with Enter: no row "Submission Confirmation (Other Authors)",
     "Notify Other Authors" or "Statistics Report Notification", and on a
     preprint server no row "Posted Acknowledgement"; "Submission
     Confirmation" (on a preprint server "Submission Acknowledgement
     (Pending Moderation)") keeps its row (Rule 3).
   - **No confirmation at all**: on the tab, choose "Do not send an
     email." under "Submission Confirmation": "Notify Primary Contact" and
     "Notify Anyone" disappear at once. Press "Save": "Saved". Reload the
     page: none of the three "Submission Confirmation" choices is selected
     ([Submission wizard A12](U21-submission-wizard.md#a12)). On "Manage
     Emails", "Submission Confirmation" (on a preprint server "Submission
     Acknowledgement (Pending Moderation)") has no row either, while a
     preprint server keeps "Submission Acknowledgement (No Moderation
     Required)" (Rules 3, 4).
   - **The choices set back**: on the tab, choose "Send an email to all
     authors." under "Submission Confirmation", "Send an email
     notification to all authors of the submission.", "Send a monthly
     email to editors." and, on a preprint server, "Send an email to all
     authors." under "Preprint Posted", and press "Save". "Manage Emails"
     lists again every row the choices had taken off, and "Edit" on
     "Statistics Report Notification" opens with "Monthly figures" in
     "Subject" (Rule 3).
   - **Control**: the list holds 66 rows on a journal, 56 on a press and
     17 on a preprint server, as with the tab at its defaults (Rule 6).
     <sup>s</sup>

3. **Edit, add, reset and remove the templates of an email**

   Given: Journal Manager, on a scratch journal whose templates are as
   installed, and the seeded journal's Journal Manager in a second
   browser.

   - **The email's window**: open Settings › Workflow › "Emails", press
     "Add and edit templates", type Submission Declined in the search box,
     press Enter, and press "Edit" on "Submission Declined": after a short
     full-screen spinner a window opens over the right of the page,
     titled "Submission Declined". It holds the email's description, then
     "Add and edit templates that you would like to make available to the
     user when they are sending this email. The default will be loaded
     automatically, and the user will be able to quickly load any other
     templates you add here.", and a list headed "Templates" with "Add
     Template" at its top right, holding one row badged "Default" with
     "Edit" alone (Rules 9, 10; Fields, the email's window).
   - **The default edited**: press "Edit" on that row: "Edit Template"
     opens filled with the template's name, subject and body; note the
     name and the subject. Replace "Name" with Decline, edited, "Subject"
     with About your submission and "Body" with We cannot take your
     submission further. and press "Save": "Saved" shows and the window
     closes about a second later. The default row reads "Decline, edited"
     and has "Reset" after "Edit" (Rules 10, 11).
   - **The seeded journal's Journal Manager**: opens "Submission
     Declined" there the same way: one row, badged "Default", with "Edit"
     alone, and its "Edit" shows the subject noted above, not "About your
     submission". Press the back arrow at the window's top left (Rule 11).
   - **A save refused**: on the scratch journal, press "Add Template": an
     empty window with the same three fields, titled "Edit Template"
     ⚠ [A4](#a4). Press "Save": the window stays open, with "This field is
     required." under "Name", "Subject" and "Body", "Please correct 3
     errors." beside "Save" with the button "Jump to next error", and
     "Save" greyed out. Type Short decline in "Name": its message clears
     and "Save" stays greyed out. Type A short decline in "Subject": the
     same. Type Dear in "Body": "Save" can be pressed (Rule 13).
   - **"Insert Content"**: in "Body", after "Dear", press "Insert
     Content": a window of that name lists one row per placeholder of this
     email, each shown as it is written ("{$recipientName}"), with its
     description and an "Insert" button. Press "Insert" on
     "{$recipientName}": the window closes, and the body shows the
     placeholder after "Dear" as a small grey tag in capitals (Rule 14).
   - **The template added**: press "Save": "Saved", the window closes
     about a second later, and a row "Short decline" with "Edit" and
     "Remove" follows the default row (Rules 10, 12).
   - **Closed without saving**: press "Edit" on "Short decline", replace
     "Subject" with Unsaved subject and press Escape: "Edit Template"
     closes without asking, the email's window stays, and its rows are
     unchanged. Press "Edit" on "Short decline" again: "Subject" reads
     "Unsaved subject", although it was never saved. Press the back arrow,
     then "Edit" on the default row, the back arrow again, and "Edit" on
     "Short decline": "Subject" reads "A short decline". Press the back
     arrow (Rule 15).
   - **"Reset"**: press "Reset" on the default row: a confirmation titled
     "Reset Template" reads "Are you sure you want to reset the subject
     and body to their defaults for the template Submission Declined?",
     with "Reset Template" in red lettering and "Cancel". Press "Cancel":
     the row still reads "Decline, edited". Press "Reset", then "Reset
     Template": the confirmation closes, and the row shows the name noted
     above, badged "Default", with "Edit" and no "Reset"; its "Edit" shows
     the subject noted above. Press the back arrow (Rule 16).
   - **"Remove"**: press "Remove" on "Short decline": a confirmation
     titled "Remove Template" reads "Are you sure you want to delete the
     template A short decline?", naming the template by its subject
     ⚠ [A5](#a5), with "Remove Template" in red lettering and "Cancel".
     Press "Remove Template": the row is gone (Rule 17).
   - **Control**: reload the page and press "Edit" on "Submission
     Declined": one row, badged "Default", with "Edit" alone and no
     "Remove" (Rules 10, 17). <sup>s</sup>

4. **The journal's signature, a one-template email, and "Reset All"**

   Given: Journal Manager, on a scratch journal whose "Emails" tab and
   templates are at the install defaults, with an Author who holds two
   submission drafts ready to submit.

   - **The signature as installed**: open Settings › Workflow › "Emails":
     "Signature" reads a dash, then "This is an automated message from
     {journal name}.", the journal's name a link to its home page (Rule 2).
   - **The signature changed**: replace the "Signature" text with The
     Scratch Journal team and press "Save": "Saved" beside the button
     (Rule 1; Settings bullet 1).
   - **The Author's first submission**: the Author submits the first draft
     through the [submission wizard](U21-submission-wizard.md). The
     Author's mailbox holds the email "Submission Confirmation" (on a
     preprint server "Submission Acknowledgement (Pending Moderation)"),
     ending with "The Scratch Journal team" (Rule 2; Settings bullet 1).
   - **A one-template email**: press "Add and edit templates", search
     that email's name with Enter, and press its "Edit": after a short
     full-screen spinner "Edit Template" opens straight away with the
     template's name, subject and body, and has "Save" and no other
     button ⚠ [A6](#a6). Note the body. Replace "Body" with Thank you
     for your submission. and press "Save": "Saved", and the window
     closes about a second later (Rules 9, 11, 18).
   - **The Author's second submission**: the Author submits the second draft.
     The Author's mailbox holds a second confirmation reading
     "Thank you for your submission." without "The Scratch Journal team"
     (Rule 2; Side effects).
   - **The site's placeholders**: search Password Reset Confirm with Enter
     and press its "Edit": "Edit Template" opens straight away. In "Body"
     press "Insert Content": the window offers the site's placeholders
     "{$siteTitle}", "{$siteSignature}", "{$siteContactName}" and
     "{$siteContactEmail}" and none of the journal's own. Press "Insert"
     on "{$siteTitle}": the window closes. Press the back arrow: "Edit
     Template" closes without asking, and nothing is stored (Rules 14,
     15).
   - **An added template**: search Submission Declined with Enter, press
     its "Edit", then "Add Template"; type Short decline in "Name", A short
     decline in "Subject" and We cannot take it further. in "Body", and
     press "Save": a row "Short decline" with "Edit" and "Remove" follows
     the default row (Rule 12).
   - **"Reset All" cancelled**: reload the page and press "Reset All": a
     confirmation titled "Reset All" reads "If you reset all templates,
     all modifications to the email templates will be lost. Do you want to
     confirm this operation?", with "Reset All" in red lettering and
     "Cancel". Press "Cancel": "Edit" on "Submission Declined" still lists
     "Short decline" (Rule 19).
   - **"Reset All" confirmed**: reload the page, press "Reset All", then
     "Reset All" in the confirmation: the page reloads. "Edit" on
     "Submission Confirmation" (on a preprint server "Submission
     Acknowledgement (Pending Moderation)") shows the body noted above, and
     "Edit" on "Submission Declined" lists the default row alone (Rule
     19).
   - **Control**: open Settings › Workflow › "Emails": "Signature" still
     reads "The Scratch Journal team" (Rule 19). <sup>s</sup>

5. **Templates in two languages**

   Given: Journal Manager, on a scratch journal whose forms are in English
   and French, its templates as installed, and the seeded journal's
   Journal Manager in a second browser.

   - **The language button**: open Settings › Workflow › "Emails", press
     "Add and edit templates", search Review Request (on a preprint server
     Submission Accepted) with Enter, press "Edit" on "Review Request" (on
     a preprint server "Submission Accepted"), then "Edit" on the default
     row: "Edit Template" has at its top right a "French" button beside
     the text "English", and under each field "2/2 languages completed";
     on a preprint server "Subject" and "Body" read "1/2 languages
     completed" (Rule 20).
   - **The French twins**: press "French": beside each field its French
     twin appears, labelled "French"; on a preprint server the French
     "Subject" and "Body" are empty. Press "French" again: the twins are
     hidden (Rule 20).
   - **The English subject emptied**: empty the English "Subject" and
     press "Save": the window stays open, with "You must complete this
     field in English." under "Subject" and "Please correct one error."
     beside "Save". Press the back arrow: the window closes without asking
     (Rules 13, 15, 20).
   - **A template added in French only**: press "Add Template", then
     "French", and type Refus court in the French "Name", Un refus court
     in the French "Subject" and Nous ne pouvons pas poursuivre. in the
     French "Body". Press "Save": the window stays open, with "This field
     is required." under the English "Name", "Subject" and "Body" and
     "Please correct 3 errors." beside "Save" (Rules 13, 20).
   - **English added, a French field emptied**: type Short decline in the
     English "Name", A short decline in the English "Subject" and We
     cannot take it further. in the English "Body", empty the French
     "Subject", and press "Save": "Saved", and a row "Short decline" with
     "Edit" and "Remove" follows the default row. Press its "Edit":
     "Subject" reads "1/2 languages completed", and after "French" is
     pressed its French twin is empty (Rule 20).
   - **Control**: the seeded journal's Journal Manager opens the same
     email's default template there the same way: "Edit Template" has no
     language button (Rule 20). <sup>s</sup>

## Coverage

Left out of the scenarios above, by reason:

- **Nothing new to test**:
  - "Signature" emptied, so that the emails carrying it end with nothing
    (Settings bullet 1)
  - the search and a filter applied together (Rule 7)
  - the Editor whose role has "Permit changes to Settings" ticked, and the
    Site Administrator: the same offer on both screens as the Journal
    Manager of every scenario (Actors & permissions, the opening
    paragraph and row 1)
  - "Name" longer than 255 characters refused (Rule 13): the same refused
    save as the empty fields of scenario 3
- **Register carries it**:
  - A2 (the ORCID emails listed under code names; Rule 6; scenario 1
    passes it)
  - A3 (two filters of one block narrowing each other; Rule 8)
  - A4 (the "Add Template" window titled "Edit Template"; Rule 12;
    scenario 3 passes it)
  - A5 ("Remove Template" naming the template by its subject; Rule 17;
    scenario 3 passes it)
  - A6 (a one-template email with no "Reset"; Rule 18; scenario 4 passes
    it)
  - A7 (the manual payment email missing from the list; Rule 21)
  - A8 ("Sent From" › "Reader" empty on a press and a preprint server;
    Rule 8; scenario 1 passes it)
  - A9 (an emptied French field of a default template coming back;
    Rule 20)
  - A10 (a press's and a preprint server's French submission
    confirmation speaking of "la revue"; Rule 20)
  - A11 (codes in the list and the filters of the French "Manage
    Emails"; Rule 6a)
  - OMP1 (the press's masthead email whose "Edit" leaves the page stuck;
    Rule 9)
  - OMP2 (a press's "Notify Primary Contact" with neither choice
    selected; Fields, the "Emails" tab; scenario 2 passes it)
  - OPS1 (the preprint server's initials placeholder described by a raw
    key; Rules 2, 14)
  - OPS2 ("Submission Accepted" listed on a preprint server; Rule 6;
    scenario 1 passes it)
- **No seed**:
  - "allow_envelope_sender" on, with "Bounce Address" as a box (Rule 5;
    Settings bullet 8): the test installs keep it off
  - the configuration file's other email keys (Settings bullet 10): no
    screen shows them
- **Owned by another feature**:
  - a manager-level role without "Permit changes to Settings", and every
    other role, refused the Settings pages (Actors row 1; *[Journal
    identity & about pages](U07-journal-identity-and-about-pages.md)*,
    scenarios 2 and 11)
  - sending with an edited or an added template (Actors row 8; Side
    effects bullet 1; *[Editorial decision
    recording](U34-editorial-decision-recording.md)*, scenario 7)
  - who receives the submission confirmation at each "Submission
    Confirmation" choice, and the copies "Notify Primary Contact" and
    "Notify Anyone" send (Settings bullets 2–4; *[Submission
    wizard](U21-submission-wizard.md)*, scenario 10)
  - the posted acknowledgement not sent at "Do not send an email."
    (Settings bullet 5; *[Publish, schedule &
    versions](U49-publish-schedule-and-versions.md)*, scenario 15)
  - who gets the decision emails at "Only send an email to authors
    assigned to the submission workflow. Usually, this is the submitting
    author." (Settings bullet 6; *[Editorial decision
    recording](U34-editorial-decision-recording.md)*, scenario 8)
  - the statistics email and the profile row it adds (Settings bullet 7;
    *[Notifications center & email
    preferences](U05-notifications-center-and-email-preferences.md)*,
    which has no scenario for it)
  - the account-validation keys of the configuration file (Settings
    bullet 10; *[Registration & account
    validation](U02-registration-and-account-validation.md)*, scenario 7)
  - the discussion and task templates (Rule 21; *[Tasks &
    discussions](U37-tasks-and-discussions.md)*, scenario 8)

## Findings register

Verdicts are the author's judgment (claude, 2026-09-26), unreviewed unless
an entry notes otherwise; the team settles them on spec review.

| ID | Finding (one line, symptom) | Bug? | Impact | Review |
|----|-----------------------------|------|--------|--------|
| [A1](#a1) | On a press or a preprint server, the "Emails" settings call editorial statistics the journal's | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A2](#a2) | "Manage Emails" lists the three ORCID emails under code names, after every other email | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A4](#a4) | The "Add Template" window is titled "Edit Template" | 🐞 | minor | — |
| [A5](#a5) | "Remove Template" names the template by its subject, not its name | 🐞 | minor | — |
| [A10](#a10) | A press's and a preprint server's French submission confirmation speaks of "la revue" | 🐞 | minor | — |
| [A11](#a11) | In French, "Manage Emails" shows codes instead of some emails' names and descriptions | 🐞 | minor | — |
| [OMP1](#omp1) | On a press, "Edit" on the masthead email leaves the page stuck behind a spinner | 🐞 | medium | issues (claude), 2026-10-02 — re-verified |
| [OMP2](#omp2) | On a press, "Notify Primary Contact" opens with neither choice selected | 🐞 | minor | — |
| [OPS1](#ops1) | Preprint server emails: "Insert Content" describes the server's initials with a raw code | 🐞 | low | issues (claude), 2026-10-04 — re-verified |
| [A3](#a3) | Two filters of one block narrow the list instead of widening it | ❓ | minor | — |
| [A6](#a6) | An edited one-template email can only be restored by "Reset All" | ❓ | user-visible | — |
| [A7](#a7) | The manual payment email is not on the list | ❓ | latent | — |
| [A8](#a8) | "Sent From" › "Reader" never lists anything on a press or a preprint server | ❓ | minor | — |
| [A9](#a9) | An emptied second-language field of a default template comes back on save | ❓ | minor | — |
| [OPS2](#ops2) | A preprint server lists "Submission Accepted", which it never sends | ❓ | latent | — |

### All apps

<a id="a1"></a>
**A1 — On a press or a preprint server, the "Emails" settings call editorial statistics the journal's** · 🐞 · low.
On a press and a preprint server, Settings › Workflow › "Emails"
describes the "Editorial statistics" choice as "Whether or not to send a
monthly email to editors with the editorial statistics of the journal,
…". It should say "of the press" or "of the preprint server".
English shows it on both apps. So do the languages that translate the
shared text (French reads "…de la revue…"), until translators add each
app's own wording.
Basis: probe, 2026-10-04. <sup>f-a1</sup>

<a id="a2"></a>
**A2 — "Manage Emails" lists the three ORCID emails under code names, after every other email** · 🐞 · low.
On a journal or a press, the "Manage Emails" list ends with three rows
named "orcidCollectAuthorId", "orcidRequestAuthorAuthorization" and
"orcidRequestUpdateScope", after "Validate Email (Site)" instead of
among the other names. Each email's "Edit Template" window shows its
code in the "Name" box, so only the subject ("Submission ORCID",
"Requesting ORCID record access", "Requesting updated ORCID record
access") says which email it is.
A manager can still find, open and edit the three emails. Most other
interface languages show the codes too.
New English strings, as the open PR `pkp/pkp-lib#13207` proposes, fix
the list on every site at once. They do not fix the "Name" box on
existing sites, which stored the code names when the emails were
installed and keep them until an upgrade step rewrites them.
Basis: probe, 2026-10-04. <sup>f-a2</sup>

<a id="a3"></a>
**A3 — Filters of one block narrow each other** · ❓ · minor.
Marking two buttons of the same filter block (the groups "Submission" and
"Review", or "Sent To" "Author" and "Reviewer") keeps only the emails that
match both, so the list usually shrinks to a handful or to "No items
found." where a manager expects the emails of either.
Question: should two buttons of one block combine as "either"?
Lean: yes; within one block the buttons are alternatives.
Basis: probe, 2026-09-26. <sup>f-a3</sup>

<a id="a4"></a>
**A4 — "Add Template" opens a window titled "Edit Template"** · 🐞 · minor.
Pressing "Add Template" in an email's window opens an empty form titled
"Edit Template", the title of the window that edits an existing template.
A manager expects the window to say it adds one.
Basis: probe, 2026-09-26. <sup>f-a4</sup>

<a id="a5"></a>
**A5 — "Remove Template" names the subject** · 🐞 · minor.
The confirmation reads "Are you sure you want to delete the template
{subject}?", quoting the template's subject line, while the row the
manager pressed "Remove" on shows the template's name. When the two
differ, the manager cannot tell from the confirmation which template goes.
Basis: probe, 2026-09-26. <sup>f-a5</sup>

<a id="a6"></a>
**A6 — No "Reset" for one-template emails** · ❓ · user-visible.
An email that takes one template ("Submission Confirmation", on a
preprint server "Submission Acknowledgement (Pending Moderation)";
"Password Reset Confirm"; and every automatic email, those under "Sent
From" › "System", on a press all but the one of [OMP1](#omp1)) opens
straight into "Edit Template" with "Save"
alone. After an edit, the only way back to the installed text is "Reset
All", which also throws away every other edited and added template of
the journal.
Question: should these emails offer a "Reset" of their own?
Lean: yes; the emails with several templates have one, and the same
restore serves both.
Basis: probe, 2026-09-26. <sup>f-a6</sup>

<a id="a7"></a>
**A7 — Manual payment email not listed** · ❓ · latent.
A journal whose payment method is "Manual Fee Payment" emails its
principal contact "Manual Payment Notification" when a reader reports a
payment, from a stored template; a press is expected to do the same
(read from the code, not seen sent). The "Manage Emails" list of a
journal and of a press has no row for that email, so its text cannot be
reviewed or changed.
Question: intended, or an omission from the list?
Lean: omission; it is a template-backed email like the others.
Basis: probe, 2026-09-26. <sup>f-a7</sup>

<a id="a8"></a>
**A8 — "Sent From" › "Reader" lists nothing on a press or a server** · ❓ · minor.
On a press and a preprint server the "Sent From" filter offers
"Reader", but marking it always empties the list to "No items found.":
no email there is sent by a reader. On a journal it keeps the four
subscription purchase and renewal emails.
Question: should a press and a preprint server offer the button?
Lean: no; a filter that can only empty the list suggests emails that do
not exist.
Basis: probe, 2026-09-26. <sup>f-a8</sup>

<a id="a9"></a>
**A9 — An emptied second-language field of a default template comes back** · ❓ · minor.
On a journal or a press with French as a second form language, emptying
the French subject of an email's default template ("Review Request") and
pressing "Save" closes the window as a save does, but the field reopens
with the installed French text, at once and after a reload. On an added
template the emptied field stays empty. A preprint server was not tried:
the one default template driven there has no French text to empty.
Question: should an emptied language of a default template stay empty?
Lean: yes, as it does on an added template; the manager is shown a
successful save of a change that was not kept.
Basis: probe, 2026-09-26. <sup>f-a9</sup>

<a id="a10"></a>
**A10 — The French submission confirmation speaks of "la revue" on a press and a server** · 🐞 · minor.
On a press and a preprint server with French as a form language, the
French body of the submission confirmation ("Submission Confirmation";
on a preprint server "Submission Acknowledgement (Pending Moderation)")
is a journal's text, word for word: "Nous vous remercions d'avoir soumis
le manuscrit intitulé « {$submissionTitle} » à la revue
{$contextName}.", "… en accédant au site Web de la revue :" and "Nous
vous remercions d'avoir pensé à notre revue pour la publication de vos
travaux.". A French-speaking author of a press or a server is thanked
for choosing "notre revue". On a preprint server the French text also
says nothing of the moderator the English body announces, and its French
"Name" reads "Confirmation de soumission". In the French interface
(Rule 6a) the list of a press and of a server describes this email as
sent once a manuscript's submission "à la revue" is complete, and
"Création de l'utilisateur-trice" as welcoming the new user "à la
revue". A manager expects the press's or the server's own word, as the
English text gives.
Basis: probe, 2026-09-28. <sup>f-a10</sup>

<a id="a11"></a>
**A11 — Codes in the French "Manage Emails"** · 🐞 · minor.
In the French interface (Rule 6a) the "Gérer les courriels" list shows
some emails under a code between hash signs instead of a French name or
description; rows named by a code head the list:
- a journal, 6 rows: "##mailable.authorPublicationPublished.name##",
  "##mailable.reviewCancel.name##",
  "##mailable.reviewRound.requestAuthorResponse.name##",
  "##mailable.userRoleMastheadUpdateNotify.name##" and
  "##orcid.orcidRequestUpdateScope.name##", each described by a code
  too, and "Changer l'adresse courriel d'invitation", described
  "##mailable.changeProfileEmailInvitationNotify.description##";
- a press, 12 rows: the journal's six, then
  "##mailable.decision.sendInternalReview.notifyAuthor.name##",
  "##mailable.publicationVersionNotify.name##" and
  "##mailable.validateEmailContext.name##", each described by a code,
  and three French names described by a code: "Notification sur les
  rapports statistiques" ("##mailable.statisticsReportNotify.description##"),
  "Soumission en attente de rédacteur-trice"
  ("##mailable.submissionNeedsEditor.description##") and "Soumission
  refusée avant évaluation"
  ("##mailable.decision.initialDecline.notifyAuthor.description##");
- a preprint server, 7 rows: "##mailable.postedAck.name##",
  "##mailable.postedNewVersionAck.name##",
  "##mailable.publicationVersionNotify.name##",
  "##mailable.submissionAckCanPost.name##" and
  "##mailable.validateEmailContext.name##", each described by a code,
  and "Notification sur les rapports statistiques" and "Soumission
  refusée avant évaluation", described by the same codes as on a press.
  Under "Envoyé par" and "Envoyé à" the Moderator's filter button reads
  "##default.groups.name.sectionEditor##", where a journal and a press
  read "Rédacteur-trice".

A screen reader hears the code in the row's button too ("Modifier
##mailable.postedAck.name##"); on screen every row's button reads
"Edit", in English. The English list shows no code. A French-speaking
manager cannot tell what these emails are. The same Moderator code
shows on other preprint server screens
([Users management OPS1](U53-users-management.md#ops1),
[Journal identity & about pages OPS4](U07-journal-identity-and-about-pages.md#ops4));
the general question is [Languages & locales A4](U57-languages-and-locales.md#a4).
Basis: probe, 2026-09-28. <sup>f-a11</sup>

### OMP

<a id="omp1"></a>
**OMP1 — The masthead email's "Edit" leaves the page stuck** · 🐞 · medium.
On a press, "Manage Emails" lists "User Role Masthead Visibility Update
Notification", but its "Edit" greys the page behind a spinner that
never ends: no window opens, no message shows, and nothing else on the
page answers until a reload. The press has no template for this email,
so its text can never be read or changed. A journal opens "Edit
Template" for the same row; a preprint server does not list it.
Basis: probe, 2026-10-02. <sup>f-omp1</sup>

<a id="omp2"></a>
**OMP2 — "Notify Primary Contact" arrives unselected on a press** · 🐞 · minor.
On a press the "Emails" tab opens with neither "Yes, send a copy to
{email}" nor "No" selected, on the seeded press and on a new one, where
a journal and a preprint server show "No". No copy goes out until
"Yes…" is saved, but the manager sees a choice that looks unmade.
Basis: probe, 2026-09-26. <sup>f-omp2</sup>

### OPS

<a id="ops1"></a>
**OPS1 — Preprint server emails: "Insert Content" describes the server's initials with a raw code** · 🐞 · low.
On a preprint server, every "Insert Content" window in an email lists
the server's initials with the description
"##emailTemplate.variable.context.contextAcronym##" instead of a
sentence. A journal reads "The journal's initials", a press "The
press's initials".
The row's "Insert" button still works, and every other row reads as a
sentence. The raw code shows in a decision's email (such as "Decline
Submission"), in the server's "Signature" under Settings › Workflow ›
"Emails", and in the body of "Edit Template" on the Emails page.
It shows in every interface language, because no language of OPS has
the sentence. Released servers have shown it since OPS 3.5.0-2.
The decision wizard's window is the same fault ([Editorial decision recording OPS2](U34-editorial-decision-recording.md#ops2)).
Basis: probe, 2026-10-04. <sup>f-ops1</sup>

<a id="ops2"></a>
**OPS2 — "Submission Accepted" listed on a preprint server** · ❓ · latent.
A preprint server lists "Submission Accepted" as an email with several
templates, although no action on a preprint server records an acceptance
or sends it; it belongs to the "Review" group, which the server's filters
do not offer, so no group filter shows it.
Question: should the preprint server list it?
Lean: no; an email that is never sent only invites edits that do nothing.
Basis: probe, 2026-09-26. <sup>f-ops2</sup>

---

<a id="footnotes"></a>
## Footnotes — mechanism & evidence

Code read 2026-09-26 at the checkouts' tips (ojs `d9b567efec`, omp
`187f0f40d`, ops `61cd158ce3`, one lib/pkp `76a315591b` and ui-library
`03d1cee2` in all three). Both screens are lib/pkp's and the
ui-library's: `ManagementHandler::manageEmails()` and `workflow()`,
`templates/management/manageEmails.tpl` and `workflow.tpl` (tab
`emails`), `PKPEmailSetupForm`, `EmailTemplateForm`,
`ManageEmailsPage.vue`, `pages/manageEmails/EditMailableModal.vue` and
`EditTemplateModal.vue`, and the `emailTemplates` and `mailables` API
controllers are identical in the three checkouts, and no app overrides a
template. The subclass chain (RUNBOOK rule 8): each app's
`pages/management/SettingsHandler` extends `ManagementHandler`; OMP's
overrides none of the email methods; OJS's `getEmailFromFilters()` and
`getEmailToFilters()` add "Subscription Manager"; OPS's overrides
`getEmailGroupFilters()`, `getEmailFromFilters()`, `getEmailToFilters()`
and `getEmailSetupForm()` (its `EmailSetupForm` adds "Preprint Posted").
The list of emails is each app's `APP\mail\Repository`: OJS and OMP
extend lib/pkp's `map()`, OPS replaces it and adds a case to
`isMailableEnabled()`. Every claim was driven on 2026-09-26 on all three
apps, every change on scratch contexts with throwaway managers and the
seeded journals only read, except the ends the body says are read from
the code; each note below says what was seen.

<a id="fn-a"></a>
**a** — Live-probed 2026-09-26 (Actors), all three apps: `manager.maya`,
`editor.diana` (OJS, OMP) and `admin` opened both screens with the same
offer (the same rows and filters, "Reset All", the same windows and tab
fields); `sectioneditor.ana`, `reviewer.julia`, `copyeditor.carla`,
`assistant.rita`, `author.alex` and `reader.rosa` (on OPS ana, rita,
alex, rosa) got "The current role does not have access to this
operation." at both addresses, and so did a scratch Journal or Press
editor with "Permit changes to Settings" unticked (OJS, OMP); signed out,
both addresses led to the Login page. On scratch contexts the manager,
the editor (OJS, OMP) and the Site Administrator each saved the tab,
edited, added, reset and removed templates and confirmed "Reset All".
Gate: both screens are ops of `management/settings`
(`settings/workflow`, `settings/manageEmails`), so `ManagementHandler::authorize()`
adds `CanAccessSettingsPolicy` (site admin, or a manager role with
`permitSettings`); role assignments in each app's `SettingsHandler`
(OJS: site admin `access`, `settings`; manager `settings`; OMP and OPS:
site admin `access` only, manager `settings`), which is the press and
server administrator case of the Settings-gate spec's finding. The API
behind the page: `PKPEmailTemplateController` (reads for site admin,
manager, sub-editor, assistant; writes for site admin and manager; every
route behind `CanAccessSettingsPolicy`, which is why a Section Editor's
"Find Template" is refused in the decision wizard), and
`PKPMailableController` (site admin and manager, no settings policy; it
only reads). The gate itself is
[Journal identity & about pages](U07-journal-identity-and-about-pages.md#settings-access)'s
note b.

<a id="fn-b"></a>
**b** — The tab: `workflow.tpl` `<tab id="emails">`
(`manager.publication.emails` "Emails") around `<pkp-form
v-bind="components.emailSetup">`; `PKPEmailSetupForm` groups and fields
in order: `emailTemplates` group (`manager.manageEmails` "Manage Emails",
`manager.manageEmails.description` "Edit the messages sent in emails from
this journal." / press / preprint server), `FieldHTML emailTemplates`
(`manager.emails.emailTemplates` "Email Templates",
`manager.manageEmailTemplates.description` with the link to
`management/settings/manageEmails`), `FieldPreparedContent emailSignature`;
`newSubmission` group (`manager.newSubmission`,
`.description`), `FieldOptions submissionAcknowledgement` radio
(`mailable.submissionAck.name`, which OPS's locale names "Submission
Acknowledgement (Pending Moderation)"; `manager.submissionAck.*`; values
`allAuthors`, `submittingAuthor`, `null`), `copySubmissionAckPrimaryContact`
(`FieldRadioInput`, "Yes, send a copy to {$email}" / "No", `showWhen`
`submissionAcknowledgement`), `copySubmissionAckAddress` (`FieldText`,
same `showWhen`); `decisions` group, `notifyAllAuthors`; `editors` group
(`manager.forEditors`), `editorialStatsEmail`
(`manager.editorialStatistics*`); `advanced` group (`manager.setup.advanced`),
`envelopeSender`. OPS `APP\components\forms\context\EmailSetupForm` adds
group `posted` after `newSubmission` with `postedAcknowledgement`
(`manager.preprintPosted*`, options `manager.submissionAck.allAuthors` /
`.off`). Defaults (`schemas/context.json`): `submissionAcknowledgement`
`allAuthors`, `copySubmissionAckPrimaryContact` false (OMP's own schema
drops that default, note f-omp2), `copySubmissionAckAddress` empty,
`notifyAllAuthors` true, `editorialStatsEmail` true; OPS
`postedAcknowledgement` true. "Notify Primary Contact" falls back to a
sentence when the context has no contact email, a case the Settings
pages never produce (UNASSIGNED item 37). The form saves by
`PUT {journal}/api/v1/contexts/{id}` (FormComponent). Live-probed
2026-09-26 (Fields, the "Emails" tab; Rules 1, 4; Settings bullets 3,
4), all three apps, on the seeded journal and scratch ones: every group,
label, description and choice as the table quotes, the defaults selected
on arrival (on OMP neither "Notify Primary Contact" choice), "Advanced"
followed directly by "Bounce Address". "Save" answered 200 and showed
"Saved", and the choices read the same after a reload. "not-an-email" in
"Notify Anyone" saved together with a changed "Editorial statistics"
was refused (400) with the box's message and "Please correct one
error.", and after a reload "Editorial statistics" still held its old
value. A change left unsaved stayed on the tab after a visit to another
Workflow tab and was gone after leaving the page, with no dialog of any
kind. "Do not send an email." hid the two copy fields at once, before
"Save". Two comma-separated addresses saved on OJS and OPS and were
refused on OMP. With "Yes, send a copy to …" and an address in "Notify
Anyone", the next confirmation reached both as blind copies (Bcc).

<a id="fn-c"></a>
**c** — Live-probed 2026-09-26 (Rule 2; Settings bullet 1), all three
apps: on the seeded journal and a scratch one "Signature" arrived as a
dash line and "This is an automated message from {name}.", the name a
link to the context's home page on the server the context was created on.
Its "Insert Content" listed nine rows ("{$contactEmail}",
"{$contactName}", "{$contextAcronym}", "{$contextName}",
"{$contextUrl}", "{$mailingAddress}", "{$passwordLostUrl}",
"{$submissionsUrl}", "{$userProfileUrl}"), no signature row. The
templates of every row of a new context were read: OJS holds
"{$contextSignature}" in exactly the eight named, OMP in seven, OPS in
six. A typed and saved signature ended the next submission confirmation;
emptied and saved, the confirmation ended with the template's last line;
a confirmation template saved without the placeholder went out without
the signature. Code: `emailSignature` has `defaultLocaleKey`
`default.contextSettings.emailSignature`
("<br><br>—<br><p>This is an automated message from <a
href="{$contextUrl}">{$contextName}</a>.</p>"), set at context creation
by `PKPSchemaService::setDefaults()`. `ContextEmailVariable`
`CONTEXT_SIGNATURE` "contextSignature" renders the setting through
`PKPString::stripUnsafeHtml()`; the templates carrying it were read from
each app's `locale/en/emails.po` (lib/pkp's where the app has none):
`emails.submissionAck.body`, `submissionAckNotAuthor`, `editorAssign`,
`openAccessNotify` (OJS), `reviewRemindAuto`, `reviewResponseOverdueAuto`,
`statisticsReportNotification`, `userValidateContext`; OPS
`editorAssign`, `statisticsReportNotification`, `submissionAck`,
`submissionAckCanPost`, `submissionAckNotAuthor`, `userValidateContext`.
The field's `preparedContent` is `ContextEmailVariable::descriptions()`
without `contextSignature`. The user's own signature is
`SenderEmailVariable`'s `signature` (*User profile*).

<a id="fn-d"></a>
**d** — Live-probed 2026-09-26 (Rule 3; Settings bullets 2, 5–7), all
three apps, on scratch contexts: each choice of the table saved took
exactly its rows off the list (searched by name with Enter: no row) and
no other; set back, each row returned, with a subject edit made before
still in place (read on OMP and OPS). All the table's choices together
took the list from 66 to 62 rows on a journal, 56 to 52 on a press, 17
to 12 on a preprint server, where "Submission Acknowledgement (No
Moderation Required)" stayed. With "Do not send an email." saved, a
submission produced no confirmation to its author, while the managers'
"A new submission needs an editor to be assigned" arrived. Code: `ManagementHandler::manageEmails()` lists
`Repo::mailable()->getMany($context, null, false, true)` (disabled
excluded, configurable only); `PKP\mail\Repository::isMailableEnabled()`:
`StatisticsReportNotify` ⇔ `editorialStatsEmail`;
`SubmissionAcknowledgement` hidden at `null` (off);
`SubmissionAcknowledgementNotAuthor` shown only at `allAuthors`;
`DecisionNotifyOtherAuthors` ⇔ `notifyAllAuthors`; OPS adds
`PostedAcknowledgement` ⇔ `postedAcknowledgement`.
`SubmissionAcknowledgementCanPost` has no case. Templates are stored
apart from the setting, so a hidden row's edits survive.

<a id="fn-e"></a>
**e** — `PKPEmailSetupForm::addEnveloperSenderField()`: with
`Config::getVar('email', 'allow_envelope_sender')` a `FieldText
envelopeSender` (`manager.setup.emailBounceAddress` "Bounce Address",
tooltip `.description`), validated `email_or_localhost` by the context
schema; otherwise a `FieldHTML` with `manager.setup.emailBounceAddress.disabled`
(each app's own wording naming its documentation). Every
`config.test*.inc.php` of the three checkouts leaves
`allow_envelope_sender` unset (off). Live-probed 2026-09-26 (Fields;
Rule 5; Settings bullet 8), all three apps: the sentence, no box, ending
"OJS documentation.", "OMP documentation." and "OPS documentation.". The
on end was not driven: it needs a server started on a configuration
with the option on, and the checkouts are left unchanged.

<a id="fn-f"></a>
**f** — `manageEmails.tpl`: `<h1>` `manager.manageEmails` "Manage
Emails"; `<list-panel>` with header `manager.publication.emails` "Emails",
`<search search-label="manager.mailables.search">` ("Search by name or
description"), `<pkp-button @click="confirmResetAll" :is-warnable="true">`
`manager.emails.resetAll` "Reset All"; rows show `item.name` and
`item.description` with an "Edit" button (`common.editItem` "Edit {$name}"
for screen readers); sidebar headed `common.filter` "Filters". The page
component is `ManageEmailsPage.vue`. The only link to the page is the
"Email Templates" field of the tab (no side-menu entry). Live-probed
2026-09-26 (Fields, the page), all three apps: the headings, the search
box, the "Filters" panel and the rows (bold name, description, "Edit")
as the table says; the tab's link is the only one to the page, and the
address opens it too. "Reset All" is white with red lettering
(rgb(208, 10, 108)) and a grey border, as are "Reset Template" and
"Remove Template" in their confirmations.

<a id="fn-g"></a>
**g** — Live-probed 2026-09-26 (Rule 6), all three apps: 66, 56 and 17
rows on the seeded journals and on new scratch ones, in code-point order
with the three ORCID names last on a journal and a press; a journal and
a press share the 55 rows the rule counts, and the preprint server's 17
names are exactly those listed. "Submission Confirmation (Other
Authors)" is on every app's list and leaves it with "Submission
Confirmation" at "Do not send an email.". On a preprint server "ORCID",
"Invitation" and "Change Email" (Enter) each left "No items found.".
Code: `Repo::mailable()->getMany()` keeps classes using the
`Configurable` trait (directly or through a parent),
`summarizeMailable()` per class, `sortBy('name')` (byte order, so
lower-case names sort after every capitalized one). Counts from the maps
at the tips with every Rule 3 choice at its default: lib/pkp's map
holds 56 mailables, 55 of them configurable; OJS adds 11 = 66 (the
manual payment plugin's `Mailer::Mailables` hook does not run on this
page, note v); OMP adds `DecisionSendInternalReviewNotifyAuthor` = 56;
OPS's own map holds 17. Names are each
mailable's `$name` key through the app's locale: OJS/OMP/OPS
`mailable.validateEmailContext.name` "Validate Email (Journal / Press /
Server Registration)"; OPS `mailable.editorAssign.name` "Moderator
Assigned (Auto)", `mailable.decision.initialDecline.notifyAuthor.name`
"Submission Declined". The ORCID mailables' keys
`orcid.orcidCollectAuthorId.name`, `orcid.orcidRequestAuthorAuthorization.name`,
`orcid.orcidRequestUpdateScope.name` translate to the bare identifiers in
lib/pkp `locale/en/emails.po` (two entries marked fuzzy). The preprint
server's missing ORCID, invitation and email-change emails are
[ORCID integration OPS2](U04-orcid-integration.md#ops2),
[User invitations OPS1](U06-user-invitations.md#ops1) and
[User profile OPS2](U03-user-profile.md#ops2).
Live-probed 2026-09-28 (Rule 6a), all three apps, two runs, on scratch
contexts with French under "UI" and "Forms": `/{context}/fr_CA/management/settings/manageEmails`
headed "Gérer les courriels", the same 66, 56 and 17 rows under French
names and descriptions, the ones of note f-a11 excepted; the English
list of the same contexts showed no code.

<a id="fn-h"></a>
**h** — Live-probed 2026-09-26 (Rule 7), all three apps: "Change Email"
typed without Enter left the full list; with Enter it kept "Change Email
Address Invitation" (OJS, OMP) or left "No items found." (OPS).
"review request" and "REVIEW REQUEST" kept the same six rows on a
journal and a press, "Review Request" and "Review Request Subsequent"
among them; "request review" and "Review  Request" (two spaces) left
"No items found.". The "×" (named "Clear search phrase") and Enter on an
emptied box brought the full list back; emptying the box without Enter
kept the narrowed list. With "Submission" marked, a search narrowed the
filtered list further. Code: `Search.vue` emits `search-phrase-changed` only on
`keydown.enter` and on the clear button (`common.clearSearch` "Clear
search phrase"); `ManageEmailsPage::currentMailables()` keeps mailables
whose `name` or `description`, lower-cased, `includes()` the lower-cased
phrase; `ListPanel` shows `common.noItemsFound` "No items found." for an
empty list.

<a id="fn-i"></a>
**i** — Live-probed 2026-09-26 (Rule 8; A3), all three apps: the buttons
in the order listed; a pressed button is marked and gains an "×"
("Clear filter: {name}"), and the "×" or a second press unmarks it.
"Submission" kept 10, 11 and 8 rows; with "Review" also marked only
"Notify Other Authors" stayed (OJS, OMP; OPS "Submission" and
"Production" the same); "Sent To" "Author" and "Reviewer" kept 8 rows
(OJS, OMP), "Author" and "Moderator" 4 (OPS). "Sent From" › "Reader"
kept 4 rows on a journal and none on a press or a preprint server.
After a reload, after leaving through the tab and coming back through
its link, and after the browser's Back, no button was marked, the box
was empty and the full list showed. Code:
`ManagementHandler::getEmailGroupFilters()` (`submission.submission`,
`submission.review`, `submission.copyediting`, `submission.production`,
`common.other`), `getEmailFromFilters()` (`user.role.editor`,
`user.role.reviewer`, `user.role.assistant`, `user.role.reader`,
`mailable.system` "System" for `Mailable::FROM_SYSTEM` −1),
`getEmailToFilters()` (editor, reviewer, assistant, `user.role.author`,
reader); OJS adds `user.role.subscriptionManager`; OPS sets groups
submission/production/other, from sub-editor
(`default.groups.name.sectionEditor` "Moderator") / reader / system, to
sub-editor / author / reader. The role filters are objects keyed by role
id, so the page lists the numeric keys ascending and "System" (−1) last.
`ManageEmailsPage::currentMailables()` applies every active value in
turn (`mailable[filter].includes(value)`), which is an "and" within a
block too. `Filter.vue`: the label toggles, the "×" (`common.filterRemove`)
removes.

<a id="fn-j"></a>
**j** — `ManageEmailsPage::openMailable()`: with `supportsTemplates`
it fetches `GET mailables/{key}` behind the full-screen spinner and opens
`EditMailableModal`; without, it fetches `GET emailTemplates/{key}` and
calls `openTemplate()` directly. `$supportsTemplates = true` in lib/pkp's
decision mailables, `RecommendationNotifyEditors`,
`RequestReviewRoundAuthorResponse`, `ReviewRemind`, `ReviewConfirm`,
`ReviewerReinstate`, `ReviewerUnassign` (and `ReviewCancel` through it),
`ReviewerResendRequest`, `ReviewRequest`, `ReviewRequestSubsequent`,
`SubmissionSavedForLater`; OMP's `DecisionSendInternalReviewNotifyAuthor`
inherits it; OPS's list keeps three of them. Live-probed 2026-09-26
(Rule 9), all three apps, every row of a new context: the spinner showed
on each "Edit"; the listed emails (26, 27, 3) opened the email's window
and every other one (40, 28, 14) "Edit Template" directly, none of them
with "Add Template". The press's masthead email is note f-omp1.

<a id="fn-k"></a>
**k** — Live-probed 2026-09-26 (Fields, the windows; Rules 10, 18;
A6), all three apps: every several-template email's window is titled
with its name and holds the description, the sentence, "Templates" with
"Add Template", and one row "Default" "Edit" while untouched; a saved
default adds "Reset", an added row reads "Edit" "Remove", the same after
a reload and for the Site Administrator and the Journal or Press editor.
"Submission Confirmation" (OPS "Submission Acknowledgement (Pending
Moderation)") and "Password Reset Confirm", untouched and after a saved
edit, open "Edit Template" with Name, Subject, Body and "Save", no reset
of any kind; only "Reset All" brought the edited one back. The windows'
header also carries a help link reading "##common.help##". Code: `EditMailableModal.vue` shows
`mailable.description`, `manager.mailables.addTemplates`, a `ListPanel`
headed `manager.mailables.templates` "Templates" with `manager.emails.addEmail`
"Add Template"; per item `localize(item.name)`, `Badge` `common.default`
when `item.key === mailable.emailTemplateKey`, `common.edit`, then
`common.reset` when that key and `item.id` (a context copy exists), else
`common.remove` when `item.id`. `describeMailable()` lists the default
(`getByKey`) then `alternateTo([key])`. `EditTemplateModal.vue` holds the
form alone.

<a id="fn-l"></a>
**l** — Live-probed 2026-09-26 (Actors row 4; Rule 11), all three apps:
"Edit" opened the stored name, subject and body; "Save" answered 200
within about 0.1 s, "Saved" showed at about 0.3 s and the window closed
at about 1.2–1.5 s, the email's window listing the new name while "Edit
Template" was still open, and the same after a reload. The seeded
journal and another scratch journal kept the installed text ("Invitation
to review", OMP "Manuscript Review Request", OPS "Your submission has
been declined"). With "Submission Declined (Pre-Review)" (OPS
"Submission Declined") edited, "Decline Submission" opened the letter
with the edited subject and body, and the author's email carried them.
Code: the edit form is `EmailTemplateForm`
(`PUT` to the template's `_href`); `PKPEmailTemplateController::edit()`
sets `contextId` to the request's journal and `Repository::edit()`
inserts a context row when the template had none (a default) or updates
it; `ManageEmailsPage::templateSaved()` closes the window after
`setTimeout(…, 1000)` and replaces the row. Templates are read with
`Repo::emailTemplate()->getByKey($contextId, $key)`, the journal's copy
ahead of the installed default.

<a id="fn-m"></a>
**m** — Live-probed 2026-09-26 (Rule 12; A4), all three apps: "Add
Template" opened an empty window titled "Edit Template"; "Save"
(`POST emailTemplates`, 200) added a row "Edit" "Remove" under the
default and closed the window about 1.2–1.6 s after the click; the row
stayed after a reload. The decision's "Email Templates" listed it beside
the default; the letter opened on the default, an email sent without
picking it carried the default, and one sent after picking it carried
the added text. Code: `openTemplate(null)` sets `template = template || {}`, so the
`this.currentTemplate ? t('manager.mailables.editTemplate') :
t('manager.emails.addEmail')` title is always "Edit Template";
`setCurrentTemplateForm()` sets the hidden `alternateTo` to the email's
key for a new template, posted to `POST emailTemplates`
(`PKPEmailTemplateController::add()`); `DAO::getUniqueKey()` builds the
key from the name. The composer's template list is
`Repo::emailTemplate()->getByKey()` plus `alternateTo([$key])`
(*Editorial decision recording*, note d).

<a id="fn-n"></a>
**n** — Live-probed 2026-09-26 (Fields, "Edit Template"; Rule 13), all
three apps: each field emptied alone, on a new template, an edited
default and a one-template email, was refused (400) with "This field is
required." and the window open, the stored template unchanged after a
reload; 256 characters in "Name" gave "This may not be greater than 255
characters." and 255 saved. Beside "Save": "Please correct one error.",
"Please correct 2 errors.", "Please correct 3 errors.", with a "Jump to
next error" button (the "Go to {field}: {message}" lines under it are
for screen readers only). Filling the fields one by one, "Save" stayed
greyed out until the last was filled. Code: `schemas/emailTemplate.json` requires `contextId`, `body`, `name`,
`subject`; `name` `max:255` (`validator.max.string` "This may not be
greater than {$max} characters."); `ValidatorFactory::required()` gives
`validator.required` "This field is required." on a new template, and on
an existing one `form.requirePrimaryLocale` "You must complete this field
in {$language}." when the journal has more than one form language. The
error line is the form's (`form.errorOne`, `form.errorMany`,
`form.errorGoTo`). Fields: `common.name` with
`manager.emailTemplate.name.description`, `email.subject`, `email.body`
(`FieldPreparedContent`, toolbar `bold italic superscript subscript |
link | blockquote bullist numlist`, `lists` and `link` plugins).

<a id="fn-o"></a>
**o** — `setCurrentTemplateForm()` gives the body field one
`preparedContent` item per key of the mailable's `dataDescriptions`
(`key`, `value: '{$' + key + '}'`, the description), so "Insert" drops
the placeholder itself and `renderPreparedContent()` leaves it unchanged
in the editor. The window is `FieldPreparedContentInsertModal` with
`InsertContent` (search on Enter over key, value and description), the
same component as the decision wizard's. The data descriptions come from
`Mailable::getDataDescriptions()`, built from the mailable's constructor
parameters (context, submission, review assignment…). Live-probed
2026-09-26 (Rule 14), all three apps: "Insert" dropped the placeholder
at the caret and the window closed after each press; the window's
search applies on Enter. "Review Request" offers 32 rows (with
"{$reviewDueDate}"), "Submission Confirmation" 21; every row's window
of a new context was read, and "Password Reset Confirm", "Validate Email
(Site)" and (OJS, OMP) "Change Email Address Invitation" offer no
journal placeholder. The editor shows a placeholder as a grey tag in
capitals ("{$RECIPIENTNAME}"); a body saved as "… for {$recipientName}"
opened in the decision letter as "… for Ada Author", and was sent so.

<a id="fn-p"></a>
**p** — Live-probed 2026-09-26 (Rule 15), all three apps: the back arrow
(named "Close") and Escape closed "Edit Template" with no question,
Escape leaving the email's window open; the stored template and the
email's rows were unchanged. The same row's "Edit" pressed next showed
the typed subject and body (also after Escape, and for French text);
after "Add Template" or another row's "Edit" in between, or after the
email's window was closed and reopened, it showed the saved text, and a
one-template email always did. Leaving the page with unsaved changes
raised no dialog and stored nothing. Code: the side window closes through
`useModal`, which calls none of the page's close handlers;
`currentTemplate` keeps the same object, so its watcher does not rebuild
`currentTemplateForm`, which `updateCurrentTemplateForm()` has been
changing with every keystroke; reopening the email refetches it and
rebuilds the form. Live-probed 2026-09-28 with French fields, all three
apps, two runs: on the one-template submission confirmation a changed
French subject was gone after the back arrow and a changed French body
after opening another page, the installed French text back at once and
after a reload, with no question either time.

<a id="fn-q"></a>
**q** — Live-probed 2026-09-26 (Rule 16), all three apps: after the
default's name, subject and body were changed and saved, "Reset" asked
"…for the template Review Request?" (OPS "…Submission Accepted?"), the
email's name although the template had been renamed; "Cancel" changed
nothing, also after a reload; confirming sent the delete and then read
the template back, closed the confirmation, and left the row with the
installed name and "Edit" alone, the template reopening with the
installed name, subject and body at once and after a reload. Code:
`confirmResetTemplate()` (`manager.mailables.resetTemplate` "Reset
Template", `manager.mailables.resetTemplate.confirm` with `{$template}`
= `currentMailable.name`, a warnable button of that name and
`common.cancel`) calls `DELETE emailTemplates/{key}`, which deletes the
journal's row (`PKPEmailTemplateController::delete()` answers "not
found" for a template with no row), then `GET emailTemplates/{key}`
returns the installed default, name included, with no `id`.

<a id="fn-r"></a>
**r** — Live-probed 2026-09-26 (Rule 17; A5), all three apps: "Cancel"
changed nothing, also after a reload; confirming removed the row at once
and for good. Before the removal "Decline Submission" listed the added
template under "Email Templates" and "Find Template" found it; after,
neither did, while a second added template was still offered. The
default row never showed "Remove", edited or not. Code: `confirmRemoveTemplate()`
(`manager.mailables.removeTemplate` "Remove Template",
`manager.mailables.removeTemplate.confirm` "Are you sure you want to
delete the template <strong>{$template}</strong>?" with `{$template}` =
`localize(template.subject)`), `DELETE emailTemplates/{key}`, the row
filtered out on success. The default template has no row to delete
until edited, and its row shows "Reset" instead.

<a id="fn-s"></a>
**s** — Scenario seeding. Every scenario runs on OJS, OMP and OPS. The
seeded journal (press, preprint server) is `publicknowledge`, only read:
its Journal Manager (Press Manager, Preprint Server Manager) is
`manager.maya` (scenario 1, and the second browser of scenarios 3 and 5),
its Section Editor (Moderator on OPS) `sectioneditor.ana` (scenario 1);
passwords are the username twice. Scenarios 2 to 5 each run on their own
scratch context from `POST scenarios/context` with throwaway `users[]`
whose first entry, `roles: ['manager']`, is the Journal Manager signed in;
nothing else is configured, so the "Emails" tab and the templates are the
install's. Scenario 4 adds an `author` throwaway and two drafts from `POST
scenarios/submission` (`submitter` the Author, `submitted: false`, with
the file the wizard's required component needs), each finished through
the wizard's "Submit" (a seeded submission sends no email; the wizard's
submit does); both confirmations are read in Mailpit through
`pkpMail.find()` scoped to the Author's address. Scenario 5's context
adds `context: {supportedLocales: ['en', 'fr_CA'], supportedFormLocales:
['en', 'fr_CA']}`. See `docs/process/scenarios.md` and `users.md`.

<a id="fn-t"></a>
**t** — Live-probed 2026-09-26 (Rule 19; A6), all three apps, on scratch
contexts: with a several-template default edited, a template added to
it, a one-template email edited and "Signature" changed, "Cancel" left
all of them in place after a reload; confirming reloaded the page, the
row count unchanged, with both defaults back to their installed text,
the added template gone, and the signature and the tab's choices as
saved. Nothing was emailed. Code:
`confirmResetAll()` (`manager.emails.resetAll` "Reset All",
`manager.emails.resetAll.message`) posts `DELETE
emailTemplates/restoreDefaults` and reloads on success;
`Repository::restoreDefaults()` deletes every row of the journal
(`isModified(true)` is the journal's own table: edited defaults and added
templates alike) and reinstalls the registry's alternate templates, of
which the registries at the tips have none. The context settings are
not touched.

<a id="fn-u"></a>
**u** — Live-probed 2026-09-26 (Rule 20; Settings bullet 9), all three
apps, on scratch contexts with English and French: "Edit Template"
("Review Request", OPS "Submission Accepted", and a one-template email)
shows a "French" button beside the text "English"; pressed, a second
box labelled "French" appears beside each field, pressed again they
hide; each field reads "2/2 languages completed" (OPS "Submission
Accepted" "1/2", its French subject and body empty). A template added
with the English fields only saved; with the French fields only it was
refused with "This field is required." under the three English fields
and "Please correct 3 errors.". The English subject of an existing
template emptied gave "You must complete this field in English.". On a
one-language context and on the seeded journals the window has no
language button and an emptied subject gives "This field is required.".
Code: the form's `locales` are the
journal's `getSupportedFormLocaleNames()`, the three fields
`isMultilingual`; required checks are in the primary locale only (note
n). The seeded journals' form languages are English alone
(seed-facts). Live-probed 2026-09-28 (Rules 18, 20; A10), all three
apps, two runs, on the one-template submission confirmation of scratch
contexts with French under "UI" and "Forms": the controls "Close",
"French", "Insert Content" and "Save" and no other, the French twins
labelled "French" ("French Name in French", "French Subject in French",
"French Body in French" for a screen reader), and "2/2 languages
completed" under each field.

<a id="fn-v"></a>
**v** — Live-probed 2026-09-26 (Rule 21; A7), OJS: on a scratch journal
with "Manual Fee Payment" set up and a subscription type, "Manual" left
"No items found." and "payment" kept "Payment Request" alone; a reader's
"Send notification of payment" delivered "Manual Payment Notification"
to the principal contact, and the list still had no such row. OMP:
"Manual Fee Payment" saved under Settings › Distribution › "Payments",
and neither search found a row; the press's sending was not tried.
Settings › Workflow › "Tasks and Discussions" lists "Request Copyedit"
and "Ready for Production" on a journal and a press, "Assign Editor" and
"Discussion (Production)" on a preprint server, and searching the email
list for them finds nothing (all three apps). Code: `ManualPaymentPlugin::register()` adds its
`ManualPaymentNotify` (`Configurable`, key `MANUAL_PAYMENT_NOTIFICATION`,
name `plugins.paymethod.manual.manualPaymentNotify.name`) through the
`Mailer::Mailables` hook, but `paymethod` plugins are loaded only by
`PluginRegistry::loadCategory('paymethod')` on payment screens, never on
this page. The discussion templates are editorial-task templates
(`EditorialTask` templates of *Tasks & discussions*), not
`email_templates` rows.

<a id="fn-w"></a>
**w** — Storage: `email_templates` (the journal's rows: `email_key`,
`context_id`, `alternate_to`) and `email_templates_settings` (name,
subject, body per locale), apart from the installed
`email_templates_default_data`; no `event_log` row and no mail is written
by `PKPEmailTemplateController`. Mailables load their template with
`Repo::emailTemplate()->getByKey()` when built, so only emails built
after the save use it. Live-probed 2026-09-26 (Side effects), all three
apps: the next confirmation and the decision letter used the saved
template, and an email sent before the edit read unchanged in the mail
catcher; after template saves, "Reset", "Remove" and "Reset All" the mail
catcher held no message for the context until the next submission, and
the submission's Activity Log held only its own lines. A saved French
text was not followed into a sent email.

<a id="fn-x"></a>
**x** — `config.TEMPLATE.inc.php` `[email]`: `default`, `sendmail_path`,
`smtp`, `smtp_server`, `smtp_port`, `smtp_auth`, `smtp_username`,
`smtp_password`, `smtp_suppress_cert_check`, `allow_envelope_sender`,
`default_envelope_sender`, `force_default_envelope_sender`,
`force_dmarc_compliant_from`, `dmarc_compliant_from_displayname`,
`require_validation`, `validation_timeout`. The test installs
(`config.test.inc.php`, identical in the three apps) set `default = smtp`,
`smtp = On`, `smtp_server = 127.0.0.1`, `smtp_port = 1025` (Mailpit),
`require_validation = Off`, `validation_timeout = 14`, and leave the rest
unset. Read by `PKP\mail\Mailer` and the mail transport set-up. No
screen shows these keys, so this bullet was not driven.

<a id="fn-f-a1"></a>
**f-a1** — `manager.editorialStatistics.description` exists only in
lib/pkp `locale/en/manager.po` ("…editorial statistics of the journal…");
neither OMP's nor OPS's `locale/en/manager.po` overrides it, while the
tab's other context-naming strings (`manager.manageEmails.description`,
`manager.setup.emailSignature.description`,
`…copySubmissionAckPrimaryContact.description`) have press and server
versions. Live-probed 2026-09-26, all three apps: the press and the
preprint server read "…editorial statistics of the journal…" while the
tab's other lines name the press or the preprint server; the journal
reads "journal".
Issue report: [pkp-e2e#864](https://github.com/jardakotesovec/pkp-e2e/issues/864) ([docs/issues/U56-A1-emails-tab-editorial-statistics-says-journal.md](../issues/U56-A1-emails-tab-editorial-statistics-says-journal.md)).

<a id="fn-f-a2"></a>
**f-a2** — lib/pkp `locale/en/emails.po`: `orcid.orcidCollectAuthorId.name`
→ "orcidCollectAuthorId" (fuzzy), `orcid.orcidRequestAuthorAuthorization.name`
→ "orcidRequestAuthorAuthorization" (fuzzy), `orcid.orcidRequestUpdateScope.name`
→ "orcidRequestUpdateScope". `sortBy('name')` puts lower-case names
last. Live-probed 2026-09-26, OJS and OMP: the three rows end the list,
each opens "Edit Template" at once with the code name in "Name" and the
subjects "Submission ORCID", "Requesting ORCID record access" and
"Requesting updated ORCID record access".
Issue report: [docs/issues/U56-A2-orcid-emails-listed-under-code-names.md](../issues/U56-A2-orcid-emails-listed-under-code-names.md).

<a id="fn-f-a3"></a>
**f-a3** — `ManageEmailsPage::currentMailables()` filters once per active
value. Live-probed 2026-09-26, all three apps: note i.

<a id="fn-f-a4"></a>
**f-a4** — `ManageEmailsPage::openTemplate()`; see note m. Live-probed
2026-09-26, all three apps.

<a id="fn-f-a5"></a>
**f-a5** — `ManageEmailsPage::confirmRemoveTemplate()` replaces
`{$template}` with `this.localize(template.subject)`; the row shows
`localize(item.name)` (`EditMailableModal.vue`). See note r.
Live-probed 2026-09-26, all three apps: a template named "Alpha …" with
the subject "Beta …" is confirmed as "Are you sure you want to delete
the template Beta …?"; a subject "Delta {$contextName} <u>k4</u>" reads
"Delta {$contextName} k4", the placeholder unfilled and "k4"
underlined.

<a id="fn-f-a6"></a>
**f-a6** — `EditTemplateModal.vue` renders the form alone; the "Reset"
button exists only in `EditMailableModal.vue`, which one-template emails
never open (`openMailable()`, note j). `DELETE emailTemplates/{key}`
would restore such a template, but no control calls it. Live-probed
2026-09-26, all three apps: every email under "Sent From" › "System"
opened "Edit Template" alone (OJS 21, OPS 8, OMP 15 plus the masthead
email of note f-omp1). `DELETE emailTemplates/{key}` sent as the manager
restored an edited "Submission Confirmation" (200; reopened with the
installed text, at once and after a reload), the request the
several-template "Reset" sends, and answered 404 "The email template you
requested was not found." for one never edited.

<a id="fn-f-a7"></a>
**f-a7** — Live-probed 2026-09-26 on a journal and, for the list, a
press: note v. OJS and OMP ship the plugin; OPS has no payments.
The press's email is the plugin's own code path; seeing it sent needs a
press with "Manual Fee Payment", a reader's direct-sale "Send
notification of payment" and the principal contact's mailbox.

<a id="fn-f-a8"></a>
**f-a8** — Live-probed 2026-09-26: "Reader" under "Sent From" kept 0
rows on a press and a preprint server, 4 on a journal ("Purchase
Individual Subscription", "Purchase Institutional Subscription", "Renew
Individual Subscription", "Renew Institutional Subscription"). The
button comes from `ManagementHandler::getEmailFromFilters()` (OPS's own
override keeps it); see note i.

<a id="fn-f-a9"></a>
**f-a9** — Live-probed 2026-09-26, OJS and OMP, two runs each: the save
sent `subject[fr_CA]` empty (200), and the answer and every reopen held
the installed French subject ("Demande d'évaluation d'un article", OMP
"Requête d'évaluation d'un manuscrit"); an added template's emptied
French subject stayed empty on all three apps. OPS's "Submission
Accepted" has no French text installed (note u).

<a id="fn-f-a10"></a>
**f-a10** — OPS `locale/fr_CA/emails.po` leaves `emails.submissionAck.body`
empty and has no subject, and OMP has no French text of its own for it,
so both take lib/pkp `locale/fr_CA/emails.po`'s journal text; OPS
`locale/en/emails.po` has its own preprint server English body. OPS
`locale/fr_CA/manager.po` leaves `mailable.submissionAck.name` and
`.description` empty, so the French list shows lib/pkp's name
("Confirmation de soumission") and journal description. Live-probed
2026-09-28, all three apps, two runs, on scratch contexts with French
under "UI" and "Forms": the French body read the three "revue"
sentences word for word on OJS, OMP and OPS, the French subject
"Accusé de réception de la soumission à {$contextName}" on all three;
the English body read "a member of our editorial team will see it soon"
(OMP) and "We have received your preprint, {$submissionTitle}, and a
moderator will see it soon. Once the moderator has reviewed your
submission, they will post your preprint or contact you." (OPS); the
French list described the email "Ce courriel, lorsqu'activé, est envoyé
automatiquement à un-e auteur-e quand le processus de soumission d'un
manuscrit à la revue a été complété. …" on all three, where OPS's
English list reads "This email is automatically sent to an author when
they make a submission and a moderator must approve it.", and
"Création de l'utilisateur-trice" "… pour lui souhaiter la bienvenue à
la revue …".

<a id="fn-f-a11"></a>
**f-a11** — A text the language's translation lacks prints as
`##key##` (*Languages & locales*, note p). The French files lack the
keys the rows show: `mailable.reviewCancel.name`, for one, is in no
`fr_CA` file; OPS `locale/fr_CA/manager.po` leaves
`mailable.postedAck.name`, `mailable.submissionAckCanPost.name` and
others empty, and OPS `locale/fr_CA/default.po` leaves
`default.groups.name.sectionEditor` empty (OJS and OMP translate it).
The row's button is `common.editItem` for screen readers beside a
visible "Edit". Live-probed 2026-09-28, all three apps, two runs, on
scratch contexts with French under "UI" and "Forms",
`/{context}/fr_CA/management/settings/manageEmails`: the same rows
each time, 6 of 66 (OJS), 12 of 56 (OMP), 7 of 17 (OPS), and on OPS
the "Envoyé par" and "Envoyé à" button
"##default.groups.name.sectionEditor##"; OJS and OMP read
"Rédacteur-trice" there. The English list of the same contexts showed
no code.

<a id="fn-f-omp1"></a>
**f-omp1** — Live-probed 2026-09-26 on the seeded press and on a new
scratch press: `GET emailTemplates/USER_ROLE_MASTHEAD_UPDATE` answered
404 "The email template you requested was not found."; the full-screen
spinner stayed, and a later "Edit" on another row timed out. No response
of 500 or more and no page error. OMP's `registry/emailTemplates.xml`
has no `USER_ROLE_MASTHEAD_UPDATE` (OJS's has); only the 3.5 upgrade
migration `I11800_AddUserRoleMastheadUpdateEmail` installs it, so a
fresh press has the email but not its template.
`ManageEmailsPage::openMailable()` stops the spinner only in its success
callback.
Issue report: [pkp-e2e#447](https://github.com/jardakotesovec/pkp-e2e/issues/447) ([docs/issues/U53-A14-masthead-change-error-no-email.md](../issues/U53-A14-masthead-change-error-no-email.md)).

<a id="fn-f-omp2"></a>
**f-omp2** — Live-probed 2026-09-26 on the seeded press and on a new
scratch press: both "Notify Primary Contact" choices unchecked on
arrival; the journal and the preprint server arrive at "No". OMP's
`schemas/context.json` redefines `copySubmissionAckPrimaryContact`
without lib/pkp's `default: false`.

<a id="fn-f-ops1"></a>
**f-ops1** — `ContextEmailVariable::descriptions()` uses
`emailTemplate.variable.context.contextAcronym`, defined in OJS's and
OMP's `locale/en/manager.po` and in no OPS or lib/pkp locale file; every
other placeholder description resolves in all three apps (checked across
`classes/mail`). Live-probed 2026-09-26: the raw key in the signature's
and in "Edit Template"'s "Insert Content" on a preprint server; the
journal reads "The journal's initials", the press "The press's
initials".
Issue report: [pkp-e2e#861](https://github.com/jardakotesovec/pkp-e2e/issues/861) ([docs/issues/U34-OPS2-preprint-server-initials-placeholder-raw-key.md](../issues/U34-OPS2-preprint-server-initials-placeholder-raw-key.md)).

<a id="fn-f-ops2"></a>
**f-ops2** — OPS `APP\mail\Repository::map()` lists
`DecisionAcceptNotifyAuthor` (`$groupIds` `[GROUP_REVIEW]`,
`supportsTemplates`), while OPS's `Repository::getDecisionTypes()` holds
Decline, RevertDecline, MoveToDone, ReturnToWorkflow and ReturnToDone
only, and `SettingsHandler::getEmailGroupFilters()` offers no "Review".
Live-probed 2026-09-26: "Submission Accepted" opens a window with
"Templates" and "Add Template", is in none of the "Submission" (8),
"Production" (3) and "Other" (6) groups, and is listed under "Sent From"
› "Moderator"; a new submission's workflow offers "Post the preprint"
and "Decline Submission", no acceptance.

## Reference — entry points & surfaces

| Entry | Path | Atom |
|-------|------|------|
| The "Emails" tab: the email setup form and its "Save" | Settings › Workflow › "Emails" (`{journal}/management/settings/workflow#emails`) | AFFM-085 |
| "Manage Emails": the page | the tab's "Add and edit templates" link (`{journal}/management/settings/manageEmails`) | VUE-021 |
| The search box | "Manage Emails" | AFFM-121 |
| The filters | "Manage Emails", "Filters" | AFFM-122 |
| "Reset All" | "Manage Emails" | AFFM-123 |
| An email's "Edit" and its window | "Manage Emails" › a row's "Edit" | AFFM-124, VUE-072 |
| "Add Template" | an email's window | AFFM-125 |
| "Edit Template" | an email's window › a row's "Edit", or a one-template email's "Edit" | AFFM-126, VUE-073 |
| "Reset" | an email's window, the edited default row | AFFM-127 |
| "Remove" | an email's window, an added row | AFFM-128 |
| Email templates API | `{journal}/api/v1/emailTemplates` (list, one, add, edit, delete, `restoreDefaults`) | API-019 |
| Emails (mailables) API | `{journal}/api/v1/mailables` (list, one) | API-027 |
| The email template's stored shape | `lib/pkp/schemas/emailTemplate.json` | SET-012 |
| The configuration file's email section | `config.inc.php` `[email]` | SET-053 |

## Reference — code anchors

- **Pages**: `lib/pkp/pages/management/ManagementHandler.php`
  (`workflow()`, `manageEmails()`, `getEmailGroupFilters()`,
  `getEmailFromFilters()`, `getEmailToFilters()`, `getEmailSetupForm()`,
  `getEmailTemplateForm()`); each app's
  `pages/management/SettingsHandler.php`;
  `lib/pkp/templates/management/workflow.tpl`, `manageEmails.tpl`.
- **Forms**: `lib/pkp/classes/components/forms/context/PKPEmailSetupForm.php`;
  OPS `classes/components/forms/context/EmailSetupForm.php`;
  `lib/pkp/classes/components/forms/emailTemplate/EmailTemplateForm.php`.
- **Vue**: `lib/ui-library/src/components/Container/ManageEmailsPage.vue`;
  `lib/ui-library/src/pages/manageEmails/EditMailableModal.vue`,
  `EditTemplateModal.vue`; `components/Search/Search.vue`,
  `components/Filter/Filter.vue`, `components/ListPanel/ListPanel.vue`,
  `components/Form/fields/FieldPreparedContent.vue`,
  `FieldPreparedContentInsertModal.vue`.
- **API**: `lib/pkp/api/v1/emailTemplates/PKPEmailTemplateController.php`;
  `lib/pkp/api/v1/mailables/PKPMailableController.php`.
- **Templates**: `lib/pkp/classes/emailTemplate/Repository.php`
  (`validate()`, `edit()`, `restoreDefaults()`), `DAO.php`
  (`getUniqueKey()`, `installAlternateEmailTemplates()`),
  `Collector.php`; `lib/pkp/schemas/emailTemplate.json`; each app's
  `registry/emailTemplates.xml`.
- **Emails (mailables)**: `lib/pkp/classes/mail/Repository.php`
  (`getMany()`, `isMailableEnabled()`, `summarizeMailable()`,
  `describeMailable()`, `map()`); each app's `classes/mail/Repository.php`;
  `lib/pkp/classes/mail/Mailable.php`, `traits/Configurable.php`,
  `variables/ContextEmailVariable.php`; `lib/pkp/classes/mail/mailables/`,
  OMP and OPS `classes/mail/mailables/`;
  `plugins/paymethod/manual/mailables/ManualPaymentNotify.php` (OJS, OMP).
- **Strings**: lib/pkp `locale/en/manager.po` (`manager.manageEmails*`,
  `manager.emails.*`, `manager.mailables.*`, `manager.setup.emailSignature*`,
  `manager.submissionAck.*`, `manager.setup.notifications.*`,
  `manager.setup.notifyAllAuthors*`, `manager.editorialStatistics*`,
  `manager.setup.emailBounceAddress*`), `emails.po` (template texts,
  mailable names); each app's `locale/en/manager.po` and `emails.po`; OPS
  `manager.preprintPosted*`.
