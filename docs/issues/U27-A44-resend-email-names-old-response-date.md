# The "Resend Review Request" email gives the reviewer the old response date, not the one the editor just picked

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the resend window has no date fields)
  - 3.3: none (code; no "Resend Review Request")
- **Introduced** `pkp/pkp-lib#9896` for `pkp/pkp-lib#4789` · [bb5b711fda](https://github.com/pkp/pkp-lib/commit/bb5b711fda960831d1cac860c051516080a7420b) · 2024-04-18 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U27 [A44](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a44)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Resend Review Request" on a declined reviewer's row offers new
"Response Due Date" and "Review Due Date" fields, preset to today plus
the journal's or press's default response and review times. Its email
asks the reviewer to "accept or decline the request by {date}", but
that date is the response date the request had before the resend, not
the one in the window. With "Response Due Date" set to 2026-10-20, the
email read "by 2026-11-09".

The preset dates are new ones, so even an editor who changes nothing
sends a date the request no longer has. Nobody is warned. The default
email names no review date, so only the response date is wrong.

It happens on every resend of a declined request. When the old response
date has already passed, as for a request declined long ago, the email
asks for an answer by a date already gone.

## Impact

- **Lost**: the reviewer gets the wrong deadline for answering; the
  request itself carries the dates set in the window. A reviewer who
  goes by the emailed date can still accept after the real date, but the
  editor, working to the real date, may meanwhile have asked someone
  else. Where the journal sends automatic reminders after a missed
  response date, one goes out once the real date has passed, which can
  be before the date the reviewer was given.
- **Who**: editors who resend a declined request on a journal or a
  press, a rare step, and the reviewers they write to.
- **Way round**: the window's message shows the old date before it is
  sent, and the editor can type the new date over it.

Medium: every resent request gives the reviewer a wrong deadline. It is
not higher because resending is rare and the date can be corrected by
hand.

## Steps to reproduce

Preconditions: the default dataset, OJS `main`, with outgoing mail
delivered somewhere it can be read (a mail catcher such as Mailpit, or
mail written to the log). OMP is the same with the names given in
brackets. Nothing else.

1. Sign in as `phudson` and open the review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets during
   the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`) [OMP:
   submission 17, "Open Development: Networked Innovations in
   International Development"].
2. Press "Decline Review Request", then the window's "Decline Review
   Request".
3. Sign in as `dbarnes` and open submission 12 from "Assigned to me"
   [OMP: submission 17 from "Active submissions"]. Paul Hudson's row in
   "Reviewers" reads "Request Declined".
4. On that row, open "More Actions" › "Resend Review Request". The
   window's message reads "…please accept or decline the request by
   2026-11-09, so that we can find an alternate reviewer." This is the
   response date the request already has in the dataset. Below the
   message, "Response Due Date" and "Review Due Date" both read
   2026-11-10: today plus four weeks, the dataset journal's default for
   both.
5. In "Response Due Date", pick a date one week from today from the
   calendar (2026-10-20 on the walk). In "Review Due Date", pick a date
   four weeks from today (2026-11-10). The message does not change.
6. Press the window's "Resend Review Request". The row reads "Request
   Resent".
7. Open Paul Hudson's mailbox and read the email "Requesting your review
   again for Journal of Public Knowledge" [OMP: "… for Public Knowledge
   Press"].
8. On his row, open "More Actions" › "Edit".

**Expected**: the email asks him to accept or decline the request by
2026-10-20, the "Response Due Date" picked in step 5. The "Edit" window
shows the same date.

**Observed**: the email names the old date (OMP the same):

```
Either way, please accept or decline the request ( http://…/index.php/publicknowledge/en/reviewer/submission?submissionId=12 ) by 2026-11-09, so that we can find an alternate reviewer.
```

The "Edit" window reads "Response Due Date" 2026-10-20 and "Review Due
Date" 2026-11-10, so the request carries the picked dates.

## Cause

The window's message is filled in when the window opens.
`ResendRequestReviewerForm::initData()` first calls
`ReviewerNotifyActionForm::initData()` (lib/pkp
`controllers/grid/users/reviewer/form/ReviewerNotifyActionForm.php`,
line 103). That runs `Mail::compileParams()` over the
`REVIEW_RESEND_REQUEST` template body with the data of a mailable built
from the review assignment as stored. Each date variable becomes its
stored column: `{$responseDueDate}` the stored `date_response_due`, and
`{$reviewDueDate}`, should a journal's text use it, the stored
`date_due`. Only after that does `ResendRequestReviewerForm::initData()`
preset the two date fields to fresh defaults
(`HasReviewDueDate::getDueDates()`, line 90). The window therefore opens
with a message and date fields that already disagree.

On "Resend Review Request", `ResendRequestReviewerForm::execute()`
stores the posted dates (`Repo::reviewAssignment()->edit()`, lines
129-135). `PKPReviewerGridHandler::updateResendRequestReviewer()`
(lib/pkp
`classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`)
builds `ReviewerResendRequest` at line 650 and sends the posted
`personalMessage` as its body through `createMail()` at line 652. The
date in that body is already fixed text. The mailable is also built from
`$reviewAssignment`, the object loaded before the save, and
`Repository::edit()` saves a clone (`classes/submission/reviewAssignment/Repository.php`
line 215), so that object still holds the old dates. Even a placeholder
left in the message would be filled with the old date.

The other windows that pair a message with due dates avoid both
mistakes:

- "Add Reviewer": `ReviewerForm::getMailable()` (lines 507-510) removes
  `reviewDueDate`, `responseDueDate` and `reviewAssignmentUrl` from the
  mailable's data before its letter is filled, so they stay in the
  letter as placeholders. `EditorAction::createMail()` (line 216, called
  from `addReviewer()`) builds `ReviewRequest` from the new assignment,
  which fills them when the email is sent.
- "Edit": its notice had the same stale-object fault and was fixed in
  `pkp/pkp-lib#13162` by building `EditReviewNotify` from
  `Repo::reviewAssignment()->get()` after the save.

The date fields came with
[bb5b711fda](https://github.com/pkp/pkp-lib/commit/bb5b711fda960831d1cac860c051516080a7420b),
so that a resent request gets a new deadline (`pkp/pkp-lib#4789`). The
change left the message's date filled at opening.

Reach:

- The response date in the default text, and the review date in any
  edited text that uses `{$reviewDueDate}` (read in the code).
- The other windows built on `ReviewerNotifyActionForm` ("Reinstate
  Reviewer", "Unassign Reviewer", "Cancel Reviewer") and "Send Reminder"
  have no date fields, so their filled messages stay correct (read in
  the code; "Unassign Reviewer" walked).
- The email log stores the rendered mailable, so its entry for the
  resend shows the old date too (read in the code).
- The reviewer's own review page shows the stored response date
  (`templates/reviewer/review/step1.tpl`), so it disagrees with the
  email (read in the code).
- OMP has no override of the form, the template or the handler (read in
  the code; walked).

## Proposed fix

Leave the two date variables in the resend message as placeholders, as
"Add Reviewer" does, and fill them when the email is sent from the
assignment as saved, as the `pkp/pkp-lib#13162` fix does for "Edit".
The diff
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-email-names-old-response-date/fix.diff))
changes three places:

- `ReviewerNotifyActionForm` gains `getVariablesFilledOnSend()` (empty
  by default). `initData()` leaves those variables out of
  `compileParams()`, the same move as `ReviewerForm::getMailable()`, and
  passes them to the template as `emailVariables`.
- `ResendRequestReviewerForm` returns `responseDueDate` and
  `reviewDueDate` from `getVariablesFilledOnSend()`, labelled
  "Response Due Date" and "Review Due Date", and its template passes
  `variables=$emailVariables` to the message box.
- `PKPReviewerGridHandler::updateResendRequestReviewer()` builds
  `ReviewerResendRequest` from the saved assignment:

```diff
-            $mailable = new ReviewerResendRequest($context, $submission, $reviewAssignment);
+            $mailable = new ReviewerResendRequest($context, $submission, Repo::reviewAssignment()->get($reviewAssignment->getId()));
```

The message box shows each placeholder as a tag labelled "Response Due
Date", and posts it back as `{$responseDueDate}`: the editor's
`GetContent` handler (`js/controllers/SiteHandler.js`) turns each tag
back into its placeholder, and the trial's email carried the picked
date, which only the placeholder filled at send could give.

With the fix, the editor sees a tag instead of a date in the message.
That is how "Add Reviewer" already shows the same dates, and the date
itself is in the fields right below, so this report recommends it; the
team decides. Keeping a visible date would need the message rewritten
in the browser whenever a field changes.

Tried on `main` in OJS and OMP: the steps gave an email asking for an
answer by 2026-10-20, and "Unassign Reviewer" sent the same message
with the fix in and out.

**Alternatives**:

- Rewrite the message in the browser whenever a date field changes: a
  new pattern, which would have to find the date inside text the editor
  may already have edited.
- Compile the template again on the server at send time: throws away
  the editor's edits to the message.
- Remove the date fields: drops what `pkp/pkp-lib#4789` asked for.

**What goes with it**:

- No data repair: emails already sent cannot be corrected.
- A 3.5 backport: the handler, form and template changes apply as
  written. The `ReviewerNotifyActionForm` change has to be redone by
  hand, since 3.5 fills the message in a single `compileParams()` line
  without the template list. 3.4 needs nothing.
- A test that resends with new dates and reads the date in the email.

Small: about twenty lines in pkp-lib, all in the resend window's form,
template and handler and their shared base form, copying two patterns
the code already has; tried as written.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-email-names-old-response-date/walk.js)
  (helpers in `lib.js` beside it and in
  `../reviewer-response-erases-reminder-history/lib.js`), which takes
  steps 1–8 on an install of the default dataset:
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/resend-email-names-old-response-date/walk.js`.
- Walked on 2026-10-13 on installs freshly reset to the default dataset
  (pkp/datasets 384e28b, PostgreSQL), once per app and line. On every
  walk, OJS and OMP, `main` and `stable-3_5_0`, the window opened with
  the stored response date in the message (main: 2026-11-09 on both
  apps; 3.5: 2026-11-09 OJS, 2026-11-08 OMP) and both date fields at
  2026-11-10. After picking 2026-10-20 and 2026-11-10, the resend
  answered 200, the stored dates became 2026-10-20 and 2026-11-10, and
  the email still named the old date.
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp` on a freshly
  reset install, the steps walked on `main` (OJS and OMP: the window
  shows the tag, and the email reads 2026-10-20), then "Unassign
  Reviewer" on Julie Janssen's unanswered row of the same submission as
  the control, and `revert`. The control ran again with the fix out, on
  a fresh reset; on both apps its message and email were the same text
  in and out.
- Tips walked or read: OJS `main` 7c6fba2064 and OMP `main` eb9381314,
  both with lib/pkp f4c2578c94. OJS `stable-3_5_0` 5fc74d6213 (lib/pkp
  f4f8fcdbc0) and OMP `stable-3_5_0` 486cbf9eb (lib/pkp 8094f06bf5).
  lib/pkp `stable-3_4_0` 55c8e406b3 and `stable-3_3_0` 5e84acd11b.
- 3.5 code: `ReviewerNotifyActionForm::initData()` line 90 fills the
  message with `$mailable->getData()`. The resend form has the date
  fields (line 89) and stores them (line 133). The handler builds the
  mailable from the pre-save object (line 628).
- 3.4 code (lib/pkp `origin/stable-3_4_0`):
  `ResendRequestReviewerForm` and `resendRequestReviewerForm.tpl` have
  no date fields, and `execute()` keeps the assignment's dates. The
  email's date (filled the same way) is therefore the date the request
  still carries.
- 3.3 code (lib/pkp `origin/stable-3_3_0`): there is no
  `ResendRequestReviewerForm` under
  `controllers/grid/users/reviewer/form/`.
- Introduced: `git blame` on the `dateResponseDue` line of
  `ResendRequestReviewerForm::execute()` and the `getDueDates()` call in
  `initData()` gives bb5b711fda ("Due date fields added for declined
  review request resending"). The `compileParams()` line in
  `ReviewerNotifyActionForm` dates from fd3311ce10 (2022-09-13, before
  the resend window had dates), and was last reshaped by a629da8a99
  (`pkp/pkp-lib#12903`, the template chooser).
  `commits/bb5b711fda/pulls` gives `pkp/pkp-lib#9896` (merged
  2024-10-10), which links `pkp/pkp-lib#4789`'s comment asking for a
  new deadline on a resent request.
- Upstream search (2026-10-13, pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ui-library): `pkp/pkp-lib#13162` (closed, fixed) is
  the same stale-object fault in the "Edit" window's notice, and the fix
  follows its pattern. `pkp/pkp-lib#12964` (open) is about the resend
  option after a cancelled request, a different fault.
- Not driven: a resend with the offered dates left as they are (by the
  code the email names the old date there too, and the walk saw the
  message read 2026-11-09 beside fields reading 2026-11-10); an edited
  email template that uses `{$reviewDueDate}`;
  the email log entry for the resend; the reviewer's own review page
  after the resend; "Do not send email to the reviewer" ticked.
