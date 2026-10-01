# A message typed in "Assign" or "Notify" with no predefined message chosen is not sent

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12842` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4) · merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open; fix in PR `pkp/pkp-lib#13385`, open and unmerged on 2026-10-01, last changed 2026-09-25). The PR fixes every stage that has a "Discussion (…)" message. A press's Internal Review has none and still fails with it
- **Tracked in** spec U35 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a3), [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The request behind "Notify" and behind "OK" on "Assign Participant"
fails on the server when a message is typed and the list "Choose a
predefined message to use, or fill out the form below." is left on its
blank entry. The window stays open with the typed text in it and shows
no error. No email goes out and no discussion opens.

On "Assign" the person is assigned all the same. Their row shows once
the page is opened again, and the Activity Log has no line for the
assignment. Pressing "OK" again fails the same way and does not assign
them twice.

The message goes out when a predefined message is chosen first and its
text replaced, or from the stage's discussions panel. A press's
Internal Review offers no predefined message, so nothing can be sent
from its Participants panel.

The server failure was seen on PostgreSQL. Setting the list back to its
blank entry after a predefined message was chosen fails there too.

## Impact

- **Lost**: the message, and on "Assign" the Activity Log's record of
  who was added.
- **Who**: every editor or assistant who writes their own message in
  "Notify" or "Assign Participant" instead of picking a predefined one,
  on any stage.
- **Way round**: choose a "Discussion (…)" entry in the list and replace
  its text; or use "Add" in the stage's discussions panel.

Medium: a way round exists in the same window. It would be high
if on MySQL the window closes with "Notification sent to users." while
nothing is sent, which the code suggests and no walk checked (Evidence).

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`, on PostgreSQL (the dataset's
  `pgsql` dump). On MySQL the requests are not expected to fail; what
  to look for there is under Observed.
- OMP and OPS take the same steps. Where a step names OJS's submission,
  stage, role or "Discussion (…)" entry, use the row's:

  | | Submission | Stage the steps use | Address in step 2 | Role (step 7) | "Discussion (…)" entry (step 12 and the control) |
  |---|---|---|---|---|---|
  | OJS | 4, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice" | Submission, its current stage | `…?workflowSubmissionId=4&workflowMenuKey=workflow_1` | "Section editor" | "Discussion (Submission)" |
  | OMP | 9, "Enabling Openness: The future of the information society in Latin America and the Caribbean" | Submission, an earlier stage: the submission is in Internal Review | `…?workflowSubmissionId=9&workflowMenuKey=workflow_1` | "Series editor" | "Discussion (Submission)" |
  | OPS | 1, "The influence of lactation on the quantity and quality of cashmere production" | Production, its current stage | `…?workflowSubmissionId=1&workflowMenuKey=workflow_5` | "Moderator" | "Discussion (Production)" |

"Notify":

1. Sign in as `dbarnes`.
2. Open submission 4 on its Submission stage by its address
   (`/index.php/publicknowledge/dashboard/editorial?workflowSubmissionId=4&workflowMenuKey=workflow_1`;
   the table has OMP's and OPS's).
3. In "Participants", on David Buskins's row: "More Actions" › "Notify".
4. Leave "Choose a predefined message to use, or fill out the form
   below." on its blank entry and type "Hello David" in "Message".
5. Press "Notify".

"Assign":

6. Reload the page and press "Assign" in "Participants".
7. Choose "Section editor" in the role list, press "Search", and choose
   "Minoti Inoue".
8. Leave the predefined message list on its blank entry and type "Hello
   Minoti" in "Message".
9. Press "OK".
10. Reload the page, read "Participants", and open "Activity Log".

A press's Internal Review (OMP):

11. Open submission 9 from the dashboard: it opens on "Internal Review".
    Take steps 3 to 5 there, then steps 6 to 10 with "Stephanie
    Berardo".

The list set back to its blank entry:

12. On the stage of step 2, open "Notify" on David Buskins's row again.
    Choose "Discussion (Submission)" in the list: "Message" fills with
    that predefined message's text, "Please enter your message.". Then
    choose the blank entry.

**Expected.** Step 5 closes the window with "Notification sent to
users."; David Buskins receives the email and the stage's discussions
panel lists a new discussion. Step 9 closes the window with
"Notification sent to users." and "User added as a stage participant.";
Minoti Inoue receives the message, and the Activity Log reads "Minoti
Inoue (minoue) was assigned to this submission as a Section editor."
and "Notification sent to users.". Step 12 changes nothing and no
request fails. This is what 3.5 does at every step, on a press's
Internal Review too.

**Observed.** Step 5: the window stays open as filled, with no notice.
No email arrives and the discussions panel stays empty. The request
answers 500 with an empty body:

```
POST /index.php/publicknowledge/$$$call$$$/grid/users/stage-participant/stage-participant-grid/send-notification?stageId=1&submissionId=4 → 500

PHP Fatal error:  Uncaught PDOException: SQLSTATE[22P02]: Invalid text representation: 7 ERROR:  invalid input syntax for type bigint: ""
(… SQL: select * from "edit_task_templates" where "context_id" = 1 and "edit_task_templates"."edit_task_template_id" =  limit 1)
#13 lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php(179): Illuminate\Database\Eloquent\Builder->find()
```

Step 9: the window stays open as filled, with no notice;
`…/stage-participant-grid/save-participant` answers 500 with the same
error. After step 10 "Minoti Inoue, Section editor" is in
"Participants", the Activity Log has no line for her assignment, no
email arrived and no discussion was added.

Step 11: the list holds only its blank entry in both windows, and both
requests fail the same way. Stephanie Berardo is assigned, nothing is
sent.

Step 12: `…/stage-participant-grid/fetch-template-body` answers 500
with the same error. "Message" keeps the predefined message's text and
no error shows.

On MySQL (not walked; read in the code and reported in a comment on
`pkp/pkp-lib#12593`) the requests do not fail and still nothing is
sent. Look for the missing email and the missing discussion after
steps 5 and 9; by the code both windows then close with "Notification
sent to users.".

Control: with "Discussion (Submission)" chosen and the same text typed,
"Notify" closes the window with "Notification sent to users.", David
Buskins receives "Discussion (Submission)" and the discussion is listed.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
line 179) looks the predefined message up by the posted value without
checking that one was chosen:

```php
$templateId = $this->getData('template');
$template = Template::withContextId($context->getId())->find($templateId);

if (!is_a($template, Template::class)) {
    return;
}
```

The list's blank entry posts `template=""`. `find('')` compares the
`bigint` key with an empty string, which PostgreSQL refuses, so the
request dies before anything is sent.

Even where the lookup returns nothing, the method returns without
sending: a typed message needs a predefined message to exist. Before
`pkp/pkp-lib#12842` the same method fell back to the stage's own
discussion email template when none was chosen (through
`getStageMailable()`, still so on `stable-3_5_0`), which is what the
list's label promises. That change moved the predefined messages from
email templates to discussion templates and put the early return in
the fallback's place; `getStageMailable()` and its mailables were then
removed (fdfbb8f14a, the same issue).

Reach:

- "Notify" (`StageParticipantGridHandler::sendNotification()`): walked.
- "Assign" (`saveParticipant()`): `AddParticipantForm::execute()`
  stores the assignment and then calls the parent's `execute()`, which
  fails in `sendMessage()`. The handler's notice and its
  `SUBMISSION_LOG_ADD_PARTICIPANT` log entry come after and never run.
  Walked.
- A second "OK" in the window that stayed open: the assignment is
  stored through `Repo::stageAssignment()->build()`, which returns the
  existing row (`firstOr()`), so no second assignment is made, and the
  request fails in `sendMessage()` again. Code; not walked.
- `StageParticipantGridHandler::fetchTemplateBody()` (line 602) makes
  the same lookup with the same empty value when the blank entry is
  chosen again. Walked.
- A press's Internal Review has no predefined message, so every message
  typed there takes this path. Walked. Why the list is empty there is a
  separate fault with its own report,
  [U35-OMP1-internal-review-no-predefined-message.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OMP1-internal-review-no-predefined-message.md).
- No other lookup of a discussion template can receive an empty id.
  The one other lookup by a request value,
  `EditorialTaskController::fromTemplate()`
  (`Template::find($illuminateRequest->route('templateId'))`), sits
  behind a route limited to digits (`whereNumber([…, 'templateId'])`),
  so it is not affected (code; searched `lib/pkp` and the three apps
  for `Template::` followed by `find(`).

## Proposed fix

Give `sendMessage()` a fallback again. The old one cannot be reverted
to, since its method is gone, so the diff writes a new one: with no
predefined message chosen, the typed message is sent as a discussion
named after the stage, without needing a template, and the lookup is
skipped. `fetchTemplateBody()` skips the lookup the same way. This
diff is recommended over the open PR's fallback (Alternatives) because
it also covers the stages that have no "Discussion (…)" template. The
diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-participant-message-not-sent/fix.diff);
its core:

```php
$templateId = (int) $this->getData('template');
$template = null;

if ($templateId) {
    $template = Template::withContextId($context->getId())->find($templateId);
    // the two early returns, unchanged
}

$title = $template ? $template->getLocalizedData('title') : $this->getStageDiscussionTitle();
$task = $template ? $template->promote($submission) : new EditorialTask([
    'type' => EditorialTaskType::DISCUSSION->value,
    'title' => $title,
    'stageId' => $this->_stageId,
    'assocType' => PKPApplication::ASSOC_TYPE_SUBMISSION,
    'assocId' => $submission->getId(),
]);
```

`getStageDiscussionTitle()` maps the stage to the names the installed
"Discussion (…)" templates carry (`mailable.discussionSubmission.name`
and its Review, Copyediting and Production siblings). Internal Review
takes the Review one, as 3.5's `getStageMailable()` did. The `match`
lists the five workflow stages and has no default arm, since the form
is only built for one of them.

The name is translated with `__()`, in the sender's interface
language. A chosen predefined message's title comes from
`getLocalizedData('title')`, which reads that language first, so the
two agree. Whether the recipient's language should decide instead is the
team's call and is not changed here.

The whole fix keeps what `pkp/pkp-lib#12842` was for: a chosen
predefined message is used exactly as before.

Tried on `main` on the three apps: the steps now show the Expected. The
typed message arrives under the subject "Discussion (Submission)"
("Discussion (Review)" on a press's Internal Review, "Discussion
(Production)" on a preprint server), the discussion is listed, the
assignment is logged, and choosing the blank entry again answers 200.
Two neighbouring cases behave the same with and without the fix:
"Notify" with "Message" empty is refused with "Please ensure that you have filled out
the message field and included someone other than yourself in the
discussion.", and "OK" on "Assign" with "Message" empty assigns the
person and sends nothing.

**Alternatives**

- Cast the id only (`find((int) $templateId)`): the server error goes,
  but the message is still dropped, and the window then closes with
  "Notification sent to users." because `execute()` logs that whatever
  `sendMessage()` did. Worse than today.
- Require a predefined message and say so in the window: honest, but it
  contradicts the list's label, takes away what 3.5 offered, and leaves
  a press's Internal Review with no way to send.
- Fall back to the stage's installed "Discussion (…)" template by its
  key, which is what the open PR `pkp/pkp-lib#13385` does. It fixes the
  steps on every stage that has such a template. Where there is none (a
  press's Internal Review, or a stage whose "Discussion (…)" template a
  manager deleted in Settings) its lookup returns nothing and
  `$template->promote()` is called on null (read in the PR's diff, head
  cf72cc78d8; not walked here). If the team merges that PR as it is,
  one part of this diff is still needed on top of it: the
  `new EditorialTask([...])` branch, taken when the fallback finds no
  template. That combination was not tried.

**What goes with it**

- No stored data is wrong: nothing was written for the lost messages.
  The participants assigned through a failed "OK" have no Activity Log
  line; that is not repaired.
- `execute()` logs "Notification sent to users." after every return of
  `sendMessage()`, the two early returns included. This fix leaves that
  as it is.
- A test: "Notify" and "Assign" with a typed message and the blank
  entry, reading the recipient's mailbox and the discussions panel, run
  on MySQL as well. The e2e scenario is a Planned item of spec U35.

Small: about thirty lines in two files of pkp-lib. That size includes
a press's Internal Review, which this diff covers and the open PR does
not.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-participant-message-not-sent/walk.js)
  takes the steps on the three apps;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-participant-message-not-sent/neighbour.js)
  is the fix's neighbour check (OJS submission 8, OMP submission 6 on
  Internal Review, OPS submission 1). Run:
  `PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js all shared/playwright/checks/issues/typed-participant-message-not-sent/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r1-3_5`
  in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/typed-participant-message-not-sent/fix.diff ojs omp ops`,
  the same two scripts, then `revert`.
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets c657990, 2026-10-01), PostgreSQL, as `dbarnes`
  only.
- Tips, `main`: OJS 4408b94def (lib/pkp f5bd392a69), OMP 3b0ecf794 and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS 4fca1027f4,
  OMP c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491). `stable-3_4_0`:
  lib/pkp df13621c2d. `stable-3_3_0`: lib/pkp d446601ebe.
- 3.5, walked: every step sends. The discussion and the email are named
  "A message regarding Journal of Public Knowledge" (the stage
  template's subject) there; on `main` a predefined message's name is
  used, and the fix follows `main`. The blank entry chosen again answers
  200 with an empty body on 3.5, and with the fix.
- 3.4 and 3.3, code: `sendMessage()` on `stable-3_4_0` has the same
  fallback as 3.5 (`getStageMailable()`); on `stable-3_3_0` the form
  builds a `MailTemplate` and never reads the discussion-template
  table. The introducing commit is on `main` only
  (`git branch -r --contains b3b882bec9`).
- Introduced: `git blame` on lines 178 to 186 of
  `PKPStageParticipantNotifyForm.php` and on line 602 of
  `StageParticipantGridHandler.php` names b3b882bec9, whose diff
  removes the fallback; `pkp/pkp-lib#12842` merged 2026-08-21.
- Upstream: `pkp/pkp-lib#12593` is the issue the introducing change
  was made for. Its comment of 2026-09-24 reports this fault (the
  server error on PostgreSQL, no error on MySQL, no email on either),
  and PR `pkp/pkp-lib#13385` (open, head cf72cc78d8, read 2026-10-01)
  answers it; the PR is not in the tips walked here. Also searched
  pkp/pkp-lib for the form's class name, `fetchTemplateBody`, "notify
  participant predefined message", "notify participant message not
  sent" and "assign participant message template discussion", and read
  `#13287` (a 3.5 failure of the same window on a template without a
  name, another fault), `#12761` and `#12700`.
- Unverified: MySQL. The comment on `pkp/pkp-lib#12593` says the
  request does not fail there and nothing is sent. By the code
  `sendMessage()` then returns and `execute()` logs and shows
  "Notification sent to users."; what the window shows was not walked.
- Not driven: other roles than the Journal editor (Press editor,
  Preprint Server manager); stages other than those in the steps; the
  way round through "Add" in the discussions panel, which spec U37
  covers.
- The neighbouring report on templates added in Settings (spec U35 A10)
  proposes a change to `getEmailVariableNames()` in the same file; the
  two diffs touch neighbouring lines and do not depend on each other.
