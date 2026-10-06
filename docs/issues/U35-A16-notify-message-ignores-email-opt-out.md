# A message sent with "Notify" is emailed to a participant who opted out of emails for new discussions

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the message is a plain email, not a "Discussion added." notification)
- **Introduced** `pkp/pkp-lib#8407` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · committed 2022-11-03, merged 2022-11-30 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a16)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the profile's Notifications tab, the row named "Discussion added."
has a box "Do not send me an email for these types of notifications.".
A person ticks it, and a message an editor sends them with "Notify" on
the workflow's Participants panel still arrives in their mailbox.

Only the Participants panel's message window ignores the box: a
discussion started from the stage's discussions panel sends that person
no email. "Assign" with a message sends the email too, through the same
code; that was read in the code and not tried on screen.

The email's own "unsubscribe" link sets this same box, so a person who
unsubscribes through the email keeps getting these emails. This too was
read in the code and not tried on screen.

## Impact

- **Lost**: no data and no work. The discussion opens and the person's
  Tasks list shows it; the cost is an email they asked not to get, and
  nothing tells them their choice does not cover it.
- **Who**: anyone listed in a submission's Participants panel (editor,
  assistant, author) who ticked the box or unsubscribed through an
  email's link, each time an editor sends them a message with "Notify"
  or with "Assign".
- **Way round**: the person can untick "Enable these types of
  notifications." on the same row. That stops these emails, and it also
  removes new discussions from their Tasks list, whichever way they
  were started. An editor could start the discussion from the stage's
  discussions panel instead, but no screen shows the editor who ticked
  the box, so they have no reason to.

Low: the editorial work is done and nothing is lost; the opt-out fails
for one kind of message only, and on screen the person can still stop
it. It would be medium once the unsubscribe link is seen to fail on
screen, because a person who unsubscribed from the very email that then
keeps coming has a task that looks done and is not.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP and OPS differ only
  where a bracket says so.

Steps:

1. Sign in as `dbuskins` (password `dbuskinsdbuskins`).
2. Open the profile's "Notifications" tab
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
3. Under "Discussion added.", tick "Do not send me an email for these
   types of notifications." and leave "Enable these types of
   notifications." ticked. Press "Save", then sign out.
4. Sign in as `dbarnes` and open submission 4, "Computer Skill
   Requirements for New and Existing Teachers: Implications for Policy
   and Practice", on its Submission stage. [OMP: submission 9,
   "Enabling Openness…", which opens on Internal Review: choose
   "Submission" in the workflow's menu and use that stage's
   Participants panel, since step 6's message is the Submission
   stage's. OPS: submission 1, "The
   influence of lactation…", Production stage.]
5. In "Participants", on the row "David Buskins", open "More Actions"
   and choose "Notify".
6. In "Choose a predefined message to use, or fill out the form below."
   choose "Discussion (Submission)" [OPS: "Discussion (Production)"],
   type "Hello David" in "Message" and press "Notify".
7. Read the mailbox of `dbuskins@mailinator.com`.
8. Sign in as `dbuskins` and open "Tasks".

**Expected**: no email to David Buskins. "Tasks" lists the discussion,
since "Enable these types of notifications." is still ticked.

**Observed**: step 6 shows "Notification sent to users." and the email
arrives:

```
From: Daniel Barnes <dbarnes@mailinator.com>
To: dbuskins@mailinator.com
Subject: Discussion (Submission)

Hello David
— Reply to this comment at #4 Montgomerie et al. or unsubscribe from emails sent by Journal of Public Knowledge.
```

"Tasks" lists "Daniel Barnes started a discussion: Discussion
(Submission): Hello David", as expected. [3.5: the same, with the
subject "A message regarding Journal of Public Knowledge".]

Control: with "Enable these types of notifications." unticked instead,
neither the email nor the Tasks entry comes.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (pkp-lib
`controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
lines 238 to 264) creates the `NOTIFICATION_TYPE_NEW_QUERY`
notification for the recipient and sends the email whenever that
notification was created:

```php
if ($notification) {
    // Only send the email if notifications have not been disabled
    $mailable->allowUnsubscribe($notification);
    ...
    Mail::send($mailable);
```

`createNotification()` returns null only when the recipient unticked
"Enable these types of notifications." (the `blocked_notification`
setting). The "Do not send me an email…" box is stored as
`blocked_emailed_notification`
(`NotificationSubscriptionSettingsDAO::BLOCKED_EMAIL_NOTIFICATION_KEY`),
and nothing on this path reads it. The rule it breaks: an email tied to
a notification type is sent only when the recipient has not blocked
emails for that type. Every other sender of such an email checks the
setting itself, since `createNotification()` no longer sends email.

`pkp/pkp-lib#8407` made this message a "Discussion added." notification
with an unsubscribe footer, and sent the email without that check.
`pkp/pkp-lib#10385` later added the `if ($notification)` guard, which
covers "Enable these types of notifications." only.

Reach:

- "Notify" on all three apps (on screen).
- "Assign" with a predefined message: `AddParticipantForm` extends this
  form and reaches the same `sendMessage()` (in the code, not driven).
- The email's own "unsubscribe" link (in the code, not driven). The
  link opens `NotificationHandler::unsubscribe()`, whose form
  (`templates/notification/unsubscribeNotificationsForm.tpl`) lists
  every notification type, each ticked, "Discussion added." among
  them. `PKPNotificationsUnsubscribeForm::execute()` stores the ticked
  types as `blocked_emailed_notification`, the setting the profile's
  box writes, so unsubscribing does not stop these emails either. The
  link works only on an install with `api_key_secret` set; without it
  the link's token is empty and the page answers not found, which is
  tracked separately (spec U05
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a6)).
- A discussion started from the stage's discussions panel is not
  affected on any of the three versions (in the code): on `main`
  `EditorialTaskController::notifyParticipants()` reads the setting
  before it sends; on 3.5 and 3.4
  `QueriesGridHandler::updateQuery()` does
  (`controllers/grid/queries/QueriesGridHandler.php`, the
  `BLOCKED_EMAIL_NOTIFICATION_KEY` lookup before `Mail::send()`).

## Proposed fix

Read the recipient's `blocked_emailed_notification` setting in
`sendMessage()` and skip the email when it lists
`NOTIFICATION_TYPE_NEW_QUERY`, as the sibling senders do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-message-ignores-email-opt-out/fix.diff)):

```diff
+        /** @var NotificationSubscriptionSettingsDAO $notificationSubscriptionSettingsDao */
+        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO');
+        $emailBlocked = in_array(
+            Notification::NOTIFICATION_TYPE_NEW_QUERY,
+            $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings(
+                NotificationSubscriptionSettingsDAO::BLOCKED_EMAIL_NOTIFICATION_KEY,
+                $userId,
+                $request->getContext()->getId()
+            )
+        );
+
         $logRepository = null;
-        if ($notification) {
+        if ($notification && !$emailBlocked) {
```

The discussion, its head note and the notification are still created,
so the person keeps the Tasks entry. No email is logged when none is
sent, because `$logRepository` stays null. This is the pattern of
`EditorialTaskController::notifyParticipants()`,
`PKP\editorialTask\Repository::addQuery()` and
`EditReviewForm::execute()`.

Tried on `main` on the three apps: with the fix the Steps show the
Expected (no email, the Tasks entry there). The two
adjacent cases behave the same with the fix and without it: a recipient
who ticked nothing gets the email with its footer, and one who unticked
"Enable these types of notifications." gets neither email nor Tasks
entry.

**Alternatives**

- Call `PKPNotificationOperationManager::getUserBlockedEmailedNotifications()`
  (`classes/notification/PKPNotificationOperationManager.php`, line
  253), which does this lookup. It is `protected` and has had no caller
  since `createNotification()` stopped sending email, so it would have
  to be made public. The diff here would be shorter (no DAO, no new
  `use` lines), but this form would then be the only sender using it
  while about ten others keep the inline DAO lookup. Not tried. It is
  the better choice if the team wants to move every sender to the one
  method, which changes each of those callers and is more than this
  fault needs.
- Skipping the notification too when emails are blocked. It would take
  the Tasks entry away from a person who asked only for no email.

**What goes with it**

- Every instance: each other `allowUnsubscribe()` caller in pkp-lib and
  the three apps reads `BLOCKED_EMAIL_NOTIFICATION_KEY` before sending,
  or is given a recipient list already filtered by it. This form is the
  only one that does not.
- No stored data is wrong, and no API or hook changes.
- Backport: the same condition applies to `stable-3_5_0` and
  `stable-3_4_0`, where the block reads the same (not tried there).
- Guard: an e2e scenario in spec U35 that ticks the box, sends a
  message with "Notify" and reads the mailbox and "Tasks".

Small: one condition in one method, and a test. It is a proposal; the
team decides.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-message-ignores-email-opt-out/walk.js).
  Its `lib.js` needs `typed-participant-message-not-sent/lib.js` from
  the same folder tree.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-message-ignores-email-opt-out/neighbour.js)
  takes the two adjacent cases (nothing ticked; "Enable these types of
  notifications." unticked), the second being the Steps' control. On an install freshly loaded
  from the default dataset, from a pkp-e2e checkout (`<feature>` names
  the set of test installs, `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/notify-message-ignores-email-opt-out/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/notify-message-ignores-email-opt-out/fix.diff ojs omp ops`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Datasets: pkp/datasets c657990 (2026-10-01).
- The email in Observed is its text part, with the footer's addresses
  and the script's run marker after "Hello David" left out.
- On OPS the script recorded no "Notification sent to users." notice
  in step 6; whether OPS shows none or the script missed it was not
  settled. The discussion opened and the email arrived as on the other
  two.
- The discussion the Steps leave reads "Created by: dbuskins", the
  recipient: a separate known fault (spec U35
  [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a5)).
- Code reads. `main` and 3.5: `sendMessage()` as quoted, the same block
  on both. 3.4 (`origin/stable-3_4_0`): the same
  `if ($notification)` block, and
  `PKPNotificationOperationManager::createNotification()` reads only
  the blocked notifications; the discussions panel's
  `QueriesGridHandler.php` reads the email setting at line 675 (3.5:
  the same lookup in `updateQuery()`). 3.3 (`origin/stable-3_3_0`):
  `sendMessage()` in `PKPStageParticipantNotifyForm.inc.php` sends the
  mail template directly and creates no `NOTIFICATION_TYPE_NEW_QUERY`
  notification; there `createNotification()` itself sends the
  notification email and reads the email setting.
- Introduced: `git blame` on the `if ($notification)` line gives
  c5ebc057b1 (`pkp/pkp-lib#10385`, the guard); the block before it,
  `createNotification()` followed by an unconditional `Mail::send()`
  with `allowUnsubscribe()`, came with 1a7fbb216f, which is on
  `stable-3_4_0` and not on `stable-3_3_0`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "Do not send
  me an email", "unsubscribe discussion email", "notify participant
  notification settings", `PKPStageParticipantNotifyForm`,
  `blocked_emailed_notification`. Read and not the same fault:
  `pkp/pkp-lib#10385` (a fatal error with the notification disabled,
  fixed), `#6627` (unsubscribe for the users list's "Notify"), `#4115`
  (the two boxes' wording), `#3440` (2018, fixed).
- Not driven: "Assign" with a predefined message; the email's
  "unsubscribe" link (the test installs have no `api_key_secret`, so
  the link in the walk's emails carries an empty token); a discussion started from the discussions panel;
  the fix on 3.5.
- Tips: OJS `main` 4408b94def with lib/pkp f5bd392a69; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6
  (the fix applied to both lib/pkp commits); `stable-3_5_0` OJS
  4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 with lib/pkp 1fb843f491;
  `stable-3_4_0` lib/pkp df13621c2d; `stable-3_3_0` lib/pkp d446601ebe.
