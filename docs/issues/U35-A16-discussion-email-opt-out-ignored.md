# Messages from "Notify" and "Assign" email people who turned off emails for "Discussion added."

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the message raises no "Discussion added." notice and carries no unsubscribe link)
- **Introduced** `pkp/pkp-lib#8407` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · 2022-11-03 (merged 2022-11-30) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A message an editor or assistant sends from "Assign" or "Notify" in a
submission's "Participants" panel opens a discussion with the person and
emails it to them. A person can tick "Do not send me an email for these
types of notifications." on the "Discussion added." row of their
Notifications tab, and then expects no email when a discussion is
opened with them. These messages still arrive in their mailbox.

Nothing tells the person their choice was skipped. The "unsubscribe"
link at the foot of the email saves that very tick, so it does not stop
the next message. The sender has no way round either: nothing on
screen shows the person's choice, although a discussion opened from the
stage's discussions panel respects it.

It happens on every stage, to anyone listed in "Participants" or being
assigned there. Reviewers are not affected, since they are not listed
in "Participants".

## Impact

- **Lost:** nothing on the submission; the person gets the emails they
  asked not to get.
- **Who:** editors, assistants and authors who ticked the box, for every
  message sent to them from these two windows.
- **Way round:** the person can untick "Enable these types of
  notifications." on the same row. That stops the email, but also the
  Tasks entry ("{sender} started a discussion: …" in their "Tasks"
  list) for every new discussion.

Medium: a choice the person saved is ignored for every such message,
silently, and they cannot stop these emails without losing their Tasks
entries too. Nothing on the submission is lost, which keeps it below
high. That nobody has reported it since 3.4 does not lower it: the
scale rates what users lose, not how often it is reported.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission, the person to notify, the person to assign and the
predefined message:

| App | Submission (stage) | Notify | Assign (role) | Predefined message |
|---|---|---|---|---|
| OJS | 4, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice" (Submission) | David Buskins (`dbuskins`) | Minoti Inoue (`minoue`, "Section editor") | "Discussion (Submission)" |
| OMP | 4, "How Canadians Communicate: Contexts of Canadian Popular Culture" (Production) | Graham Cox (`gcox`) | Minoti Inoue (`minoue`, "Series editor") | "Discussion (Production)" |
| OPS | 1, "The influence of lactation on the quantity and quality of cashmere production" (Production) | David Buskins (`dbuskins`) | Minoti Inoue (`minoue`, "Moderator") | "Discussion (Production)" |

Turning off the email (first as the person to notify, then as `minoue`):
1. Sign in as the person and open Profile › "Notifications"
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
2. On the row "Discussion added.", tick "Do not send me an email for
   these types of notifications." and leave "Enable these types of
   notifications." ticked. Press "Save", then sign out.

Notify:
3. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
4. In "Participants", open the person's "More Actions" menu and choose
   "Notify".
5. Choose the predefined message, replace the text in "Message" with
   "u35w30 notify" and press "Notify".

Assign:
6. In "Participants", press "Assign", choose the role, search for
   "Inoue" and choose Minoti Inoue.
7. Choose the predefined message, replace the text in "Message" with
   "u35w30 assign" and press "OK".

Reading:
8. Open each person's mailbox (`<username>@mailinator.com`).
9. Sign in as each person and open "Tasks".

**Expected:** no email reaches either person. The discussion still
opens on the stage, and each person's "Tasks" lists "Daniel Barnes
started a discussion: …".

**Observed:** both windows close with no error, and the Tasks entries
appear. Each person also receives the email, from "Daniel Barnes",
subject the predefined message's name. David Buskins's on OJS reads:

```
Subject: Discussion (Submission)

u35w30 notify

—
Reply to this comment at #4 Montgomerie et al. ( …/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4 ) or unsubscribe ( …/index.php/publicknowledge/en/notification/unsubscribe?validate=…&id=… ) from emails sent by Journal of Public Knowledge ( …/index.php/publicknowledge/en ).
```

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (lib/pkp
`controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
lines 238–264 on `main`) opens the discussion and raises the recipient's
`NOTIFICATION_TYPE_NEW_QUERY` notice through
`NotificationManager::createNotification()`. It then sends the email
whenever that notice was created (`if ($notification) { … Mail::send($mailable); }`).
`createNotification()` returns `null` only for a type in the user's
`blocked_notification` setting, the "Enable these types of
notifications." box. `blocked_emailed_notification`, the setting
behind "Do not send me an email for these types of notifications.", is
never read on this path. `AddParticipantForm` extends this form, so
"OK" in "Assign Participant" with a message takes the same path.

Every other place that emails about a new discussion checks that
setting before `Mail::send()`. `EditorialTaskController::notifyParticipants()`
does so for the discussions panel, whatever template the discussion
or task was built from, and `Repository::addQuery()` (lib/pkp
`classes/editorialTask/Repository.php`) for the discussion an editor's
recommendation opens. On 3.4, `QueriesGridHandler` checked it for "Add
discussion".

How the form got here:
- Through 3.3, "Notify" sends the message as a plain email and then
  opens a discussion, raising no "Discussion added." notice; the email
  has no unsubscribe link, so the Notifications tab never governed it.
- [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5)
  (`pkp/pkp-lib#5716`) made the email follow the recipient's "Discussion
  added." notice and gave it that notice's unsubscribe footer
  (`allowUnsubscribe($notification)`), without the email-setting check
  `QueriesGridHandler` already made for the same notice.
- [c5ebc057b1](https://github.com/pkp/pkp-lib/commit/c5ebc057b122ca01fa174e156734fdc7ae1dcb91)
  (`pkp/pkp-lib#10385`, backported to 3.4 as
  [34fd3c8fd9](https://github.com/pkp/pkp-lib/commit/34fd3c8fd9aad7846be3ef3cb00fdd5ae0e7693d))
  skipped the email when no notice is created, which fixed a fatal
  error for users with the notice switched off. That covers the
  "Enable…" box but not the email box.

Reach ("code" marks what was read in the code, not walked):
- The email's unsubscribe link and its one-click `List-Unsubscribe`
  header save `blocked_emailed_notification`
  (`PKPNotificationsUnsubscribeForm::execute()`), the setting this path
  does not read (code).
- The predefined messages that also request work ("Request Copyedit",
  "Ready for Production", "Index Requested" on a press) and "Assign
  Editor" go through the same send (code).
- Every other `allowUnsubscribe()` caller in lib/pkp and the apps reads
  `BLOCKED_EMAIL_NOTIFICATION_KEY` (or receives it from its caller)
  before sending (code).

## Proposed fix

Read the recipient's email setting in `sendMessage()` and send only
when "Discussion added." emails are not turned off, the check
`EditorialTaskController::notifyParticipants()` makes
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-email-opt-out-ignored/fix.diff),
which also adds the `DAORegistry` and `NotificationSubscriptionSettingsDAO`
imports):

```diff
+        // Only send the email if the recipient has neither disabled the notification
+        // nor chosen not to receive its email
+        /** @var NotificationSubscriptionSettingsDAO $notificationSubscriptionSettingsDao */
+        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO');
+        $blockedEmails = $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings(
+            NotificationSubscriptionSettingsDAO::BLOCKED_EMAIL_NOTIFICATION_KEY,
+            $user->getId(),
+            $context->getId()
+        );
+
         $logRepository = null;
-        if ($notification) {
-            // Only send the email if notifications have not been disabled
+        if ($notification && !in_array(Notification::NOTIFICATION_TYPE_NEW_QUERY, $blockedEmails)) {
```

The discussion, its first note and the notice are still created, so the
person still sees the message in "Tasks" and on the stage. Every
email-log entry the method writes afterwards is written only when the
email went out, so none is written for an email held back.

The fix holds back every message the person receives this way,
work requests included: "Request Copyedit", "Ready for Production" and
"Index Requested" no longer email someone who turned off "Discussion
added." emails, and the sender is not told. This is the recommended
behaviour, for three reasons:
- the discussions panel already treats the same templates this way: a
  discussion or task built there from "Request Copyedit" follows the
  same setting, with no word to the sender;
- each of these emails carries the "Discussion added." unsubscribe
  link, so sending it anyway would ignore the link in the email itself;
- the person still sees the request: the discussion's Tasks entry, and
  for those three messages the assignment task the method adds
  (`_addAssignmentTaskNotification()`), which follows its own "Enable…"
  box (code).

Tried on `main` on the three apps, with the plain discussion messages
of the Steps: with the fix in, neither person gets an email, and both
still get the discussion and the Tasks entry. A neighbour check sends
the same message to the submission's author, who has not turned
anything off, and the author gets the email with the fix in, as
without it. The work-request messages were not walked.

**Alternatives:**
- Hold back only the plain discussion messages and always send the work
  requests. That keeps those emails, but the same template would then
  behave differently in the two panels, and the email would still carry
  an unsubscribe link that does not apply to it.
- Hold back all and tell the sender which people were not emailed (a
  notice like the one for a failed send). No other discussion sender
  does this, so it is a new pattern for every sender, best decided
  separately.
- Make the mailable itself refuse to send when its notice's email is
  turned off (in the `Unsubscribe` trait or a `NotificationManager`
  helper). That would cover future callers, but every current sender
  already checks at the call site, and a mailable that silently does
  not send changes what callers rely on.

**What goes with it:**
- No data repair: the setting is stored correctly and is simply never
  read on this path.
- The change applies as written to `stable-3_5_0` and `stable-3_4_0`,
  which have the same block. On 3.3 the message is not tied to the
  "Discussion added." notice, so the same check there would be a new
  rule, not this fix.
- A test: the U35 e2e scenario for a message sent from "Notify" or
  "Assign", with the recipient's email box ticked, checking that the
  mailbox stays empty while the Tasks entry appears.

Small: one check in one method, as the discussions panel already does
it, and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-email-opt-out-ignored/walk.js)
  takes the Steps on the three apps, on an install freshly reset to the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/discussion-email-opt-out-ignored/walk.js`.
  It adds a unique suffix to each message and also reads the saved
  setting, the notice and the discussion's note in the database.
- Neighbour check: [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-email-opt-out-ignored/neighbour.js)
  sends "Notify" to the author (Craig Montgomerie, Bart Beaty, Carlo
  Corino), whose Notifications tab is as the dataset leaves it; the
  email arrived with the fix in and out.
- Not driven: the unsubscribe link and the one-click header (the
  dataset's `config.inc.php` sets no `api_key_secret`, so the link's
  code is empty there); "Enable these types of notifications."
  unticked; the work-request messages.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; the fault does not depend on the
  database. No request failed and no page script failed, on `main` or
  on `stable-3_5_0`.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794c`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), the form identical in
  both lib/pkp commits; `stable-3_5_0` OJS `92b9a16b48`, OMP
  `3081c9b00d`, OPS `cf4fce69bd` (lib/pkp `a9c76aed62`);
  `stable-3_4_0` OJS `9571d8fde7`, OMP `0aec65441f`, OPS `acd8ae704b`
  (lib/pkp `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`, OMP
  `8e72fc8836`, OPS `c5532e2161` (lib/pkp `d446601ebe`).
- 3.5, walked: the same Steps, the same predefined messages offered,
  the same outcome. The email's subject and the Tasks entry read "A
  message regarding Journal of Public Knowledge" (Public Knowledge
  Press, Public Knowledge Preprint Server), not the predefined
  message's name. Code: `sendMessage()` has the same `if ($notification)`
  block.
- 3.4 (code): lib/pkp `stable-3_4_0`
  `PKPStageParticipantNotifyForm::sendMessage()` has the same block,
  with 34fd3c8fd9's guard and no email-setting read.
- 3.3 (code): lib/pkp `stable-3_3_0` `PKPStageParticipantNotifyForm.inc.php`
  creates no `NOTIFICATION_TYPE_NEW_QUERY` notice in `sendMessage()`.
- Introduced: `git blame` on the send block gives c5ebc057b1 over
  1a7fbb216f; `QueriesGridHandler` at 1a7fbb216f's parent already read
  `BLOCKED_EMAIL_NOTIFICATION_KEY`.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for "Do not send me an email", unsubscribe with
  discussion and notify, `PKPStageParticipantNotifyForm`,
  `blocked_emailed_notification` and `BLOCKED_EMAIL_NOTIFICATION_KEY`.
  `pkp/pkp-lib#3440` (closed, 3.1) was the same box ignored by the
  general notice email, fixed in `PKPNotificationOperationManager`.
  `pkp/pkp-lib#10385` is the "Enable…" case. The open PR
  `pkp/pkp-lib#13385` changes this form but not the email check.
