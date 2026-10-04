# The Activity Log shows no sender for the emails an editor sends with "Notify", "Assign" or a discussion

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; these messages name their sender, and discussion emails are not logged)
- **Introduced** `pkp/pkp-lib#8116` for `pkp/pkp-lib#7286` · [640018cfbe](https://github.com/pkp/pkp-lib/commit/640018cfbed748456338f03dfc7c3ded72728cb5) · 2022-08-03 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U38 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

Three kinds of email an editor sends from the workflow are listed on the
submission's "Activity Log" › "History" with nothing under "User": a
"Notify" message to a participant, the message sent with "Assign", and
the emails of a discussion and of its replies. On 3.5 and 3.4 the
feature is a discussion; on `main` it is "Tasks & Discussions", and a
task's emails are listed the same way. The decision emails the same
editor sends name the editor there.

The log's other email lines already name their sender (decisions,
review requests, an editor's reminders and thanks, the reviewer's
answers) or are the journal's own emails, sent from its contact and
listed with nothing under "User" by design (the acknowledgement, the
automatic review reminders), so these three are the whole list. The
"Review complete" email, which names the wrong person, is a separate
report.

## Impact

- **Lost**: nothing. The emails go out and are listed; only the "User"
  column is empty.
- **Who**: every editor who reads a submission's "Activity Log", on
  every journal, press and preprint server; discussion and
  participant messages are among the most frequent lines there.
- **Way round**: "View Email" on each line shows "From:", the editor who
  sent it. The fix names the sender on new lines only; lines already
  logged stay empty, since no repair is proposed.

Low: nothing else in the application relies on the missing name.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- Outgoing email works: a "Notify" or "Assign" message whose sending
  fails is not logged at all. A local mail catcher, or the `log` mailer
  in `config.inc.php`, is enough.

The steps use OJS submission 4, "Computer Skill Requirements for New and
Existing Teachers: Implications for Policy and Practice", at its
"Submission" stage. On OMP use submission 9, "Enabling Openness: The
future of the information society in Latin America and the Caribbean",
at "Submission" (the role is "Series editor"); on OPS submission 1, "The
influence of lactation on the quantity and quality of cashmere
production", at "Production" (the role is "Moderator", the predefined
messages "Discussion (Production)").

1. Sign in as `dbarnes` (Daniel Barnes).
2. Open submission 4 at its "Submission" stage.
3. In "Participants", open "David Buskins"'s "More Actions" and choose
   "Notify". Choose the predefined message "Discussion (Submission)",
   type a message and press "Notify".
4. In "Participants", press "Assign". Choose "Section editor", press
   "Search", choose "Minoti Inoue", choose the predefined message
   "Assign Editor" and press "OK". (OPS: "Discussion (Production)", since
   a preprint server installed on `main` has no text for "Assign Editor".)
5. In "Desk Review Tasks & Discussions" (OPS: "Production Tasks &
   Discussions"), press "Add". Type the name "u38b discussion walk", tick
   "David Buskins", type a message and press "Save". [3.5: the stage's
   discussions list, "Add discussion", the same participant, subject
   and message, "OK".]
6. Press "Activity Log" and read the newest lines on "History". Press the
   arrow at the start of each "An email has been sent" line and "View
   Email".

**Expected**: the new email lines name "Daniel Barnes" under
"User", the person who sent them, as the dataset's decision email lines
do (on submission 9 of OMP, "An email has been sent: Your submission has
been sent for internal review" reads "Daniel Barnes").

**Observed** (OJS): every new email line has an empty "User" (the
discussion's email is listed twice, once for David Buskins and once for
the copy its writer receives):

```
2026-10-04                 An email has been sent: u38b discussion walk
2026-10-04                 An email has been sent: u38b discussion walk
2026-10-04  Minoti Inoue   Minoti Inoue (minoue) was assigned to this submission as a Section editor.
2026-10-04  Daniel Barnes  Notification sent to users.
2026-10-04                 An email has been sent: Assign Editor
2026-10-04  Daniel Barnes  Notification sent to users.
2026-10-04                 An email has been sent: Discussion (Submission)
```

"View Email" on each reads `From: "Daniel Barnes" <dbarnes@mailinator.com>`
(and `To:` David Buskins, Minoti Inoue or Daniel Barnes). The same on OMP and OPS.
On 3.5 the "Notify" message's subject is "A message regarding Journal of
Public Knowledge" and the "Assign" message's "You have been assigned as
an editor on a submission to Journal of Public Knowledge"; their lines
are empty the same way.

Control: the "Notification sent to users." line the same "Notify" and
"Assign" add names "Daniel Barnes".

## Cause

`PKP\log\Repository::logMailable(EmailLogEventType $eventType, Mailable $mailable, Submission $submission, ?User $sender = null)`
stores `$sender` as `email_log.sender_id`, and "History"
(`EventLogGridCellProvider`) prints `EmailLogEntry::senderFullName`, the
sender's name, under "User". The sender is not read from the mailable:
each caller says who sent the email. Two callers that send a person's
email leave it out:

- `PKPStageParticipantNotifyForm::sendMessage()` (lib/pkp
  `controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
  lines 271–292 on `main`) builds the mailable with
  `->sender($request->getUser())` and logs it in seven `logMailable(…,
  $mailable, $submission)` calls, one per predefined message (Assign
  Editor, copyediting, layout and indexing requests, their "complete"
  messages, any other). "Notify" and "Assign" (`AddParticipantForm`
  extends it) both go through it.
- `EditorialTaskController::notifyParticipants()` (lib/pkp
  `api/v1/submissions/tasks/EditorialTaskController.php`, line 1103)
  builds each email with `->sender($currentUser)` and logs it without
  passing `$currentUser`. It sends the emails of a new discussion or task, of a reply, and
  of participants added later.

Before the change in the header, the Participants messages went through
`SubmissionMailTemplate::send($request)`, which logged the signed-in user
as the sender (3.3 still does); its new `logMailable()` calls left the
sender out. The same change was the first to log a discussion's emails, also
without a sender. `pkp/pkp-lib#12322` later moved the discussion emails
to `EditorialTaskController` and kept the call as it was.

Reach:

- Every `logMailable()` caller on `main` was read. The others pass the
  person who sent the email (decisions, the reviewer request, reminders,
  thanks, "Email Reviewer", the reviewer's answer, "Revised Version
  Uploaded"), or none for the emails the journal sends from its contact
  (the acknowledgement, "needs an editor", the automatic editor
  assignment, the automatic review reminder). Those stay as they are.
  The "Review complete" email passes its recipient instead, a separate
  finding (U38 A5).
- Screens: "Notify", "Assign" with a message and a discussion's first
  message, on the Steps' path (all three apps). A reply was driven only
  in the check of the paths the fix must leave alone (below); a task and
  a participant added to a discussion later were read in the code (the
  same method).
- Stored data: every such line logged since 3.4 has no sender. The
  sender can be guessed only from the stored "From:" address, so no
  repair is proposed.

## Proposed fix

Pass the sender at the two callers, as every other caller that sends a
person's email does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sent-email-lines-name-no-sender/fix.diff)):

```diff
--- a/lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php
-            Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::DISCUSSION_NOTIFY, $mailable, $submission);
+            Repo::emailLogEntry()->logMailable(SubmissionEmailLogEventType::DISCUSSION_NOTIFY, $mailable, $submission, $currentUser);
--- a/lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php
-                !$logRepository ?: $logRepository->logMailable(SubmissionEmailLogEventType::EDITOR_ASSIGN, $mailable, $submission);
+                !$logRepository ?: $logRepository->logMailable(SubmissionEmailLogEventType::EDITOR_ASSIGN, $mailable, $submission, $request->getUser());
                 (the same for the six other cases of the switch)
```

The user passed is the one the mailable's `sender()` was given, so
"User" and "View Email"'s "From:" name the same person. A reply logs its
writer, not the discussion's creator.

Tried on `main`, all three apps: with the fix every new line of the
Steps names "Daniel Barnes". The paths the fix must leave alone were
checked too. David Buskins replied to Daniel Barnes's discussion: the
discussion's two lines (to David Buskins and the writer's own copy) named
Daniel Barnes, the reply's two named David Buskins, and the journal's
own acknowledgement line stayed empty. Without the fix all four
discussion lines were empty.

**Alternatives**:

- Let `logMailable()` default `$sender` to the mailable's own sender
  (the `Sender` trait's `getSenderUser()`, which `ReviewerAction`
  already passes) when no sender is given. It would cover future callers
  too, but the trait's property is unset until `sender()` is called, so
  the method needs a new guard, and the behaviour of a method that
  plugins call changes. A follow-up the team may prefer; the two callers are the
  direct fix.
- Fold the seven calls in `sendMessage()` into one, with the event type
  chosen in the switch. Tidier, but a larger change than the finding
  needs.

**What goes with it**:

- "Login As": on `main` the event lines read "{administrator} (acting
  as {user})" (`pkp/pkp-lib#13059`), but the email log has no column for
  the account signed in. With the fix, an email line written under
  "Login As" names only the account acted as, the same person the email
  is "From:", as the other callers' lines already do. Bringing email
  lines into that change is a follow-up, not part of this fix.
- Backport: 3.5 has the same seven calls in
  `PKPStageParticipantNotifyForm` and the discussion email in
  `QueriesGridHandler::updateQuery()` (line 691, built with
  `->sender($currentUser)`). On 3.4 the calls go through
  `SubmissionEmailLogDAO::logMailable()` instead of the repository:
  `PKPStageParticipantNotifyForm.php` lines 259–280 and
  `QueriesGridHandler.php` line 697. Adding the sender applies the same
  way.
- Guard: a unit test that sends a "Notify" message and a discussion and
  asserts the logged entries carry the sender's id; or the spec's Rule
  4c scenario as a **Planned** e2e item.

Small: no data repair, no change to an API or a hook, and the pattern
is the one the other callers already follow.

## Evidence

- Kept script: [shared/playwright/checks/issues/sent-email-lines-name-no-sender/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sent-email-lines-name-no-sender/walk.js)
  (helpers in `lib.js` beside it), run with pkp-e2e's own probe runner on
  an install loaded from PKP's default test dataset (pkp/datasets
  566bb1f, 2026-10-03, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/sent-email-lines-name-no-sender/walk.js`;
  `MODE=nb` in front runs the reply check alone. The fix was applied with
  `node bin/try-fix.js apply …/fix.diff ojs omp ops` and reverted after.
- Branch tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794
  (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6);
  `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246c and
  OPS 38b61882d3 (lib/pkp cf3f984335); 3.4 and 3.3 read in pkp-lib
  `origin/stable-3_4_0` 767353f4fe and `origin/stable-3_3_0` ac3fa73402.
- No request failed and no page script failed in any walk. On `main` a
  discussion's email also goes to its writer (a known defect, already
  filed by pkp-e2e: the writer is told of their own message); on 3.5 it
  does not.
- Code reads beyond the Cause: none of the three apps calls
  `logMailable()` in its own code. 3.3: `PKPStageParticipantNotifyForm.inc.php`
  sends with `$email->send($request)`, which logs `$request->getUser()`
  as the sender; `QueryForm.inc.php` notifies the participants through
  `NotificationManager` and logs no email.
- Introduced: `git blame` on `main` gives 34574ebd86 (a constant rename)
  for the seven calls and 139bde1e65 (`pkp/pkp-lib#12322`, the move to
  `EditorialTaskController`) for the discussion call; `git log -S
  logMailable` on both files leads to 640018cfbe, whose PR is
  `pkp/pkp-lib#8116`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by symptom words and by the class and method names.
- Not driven: a task and a participant added to a discussion later;
  MySQL (the stored value is a plain id).
