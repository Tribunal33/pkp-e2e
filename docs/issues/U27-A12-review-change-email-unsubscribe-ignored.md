# A reviewer who unsubscribes through the "Your review assignment has been changed" email keeps getting it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP; OPS (code; the new-version email only)
  - 3.5: OJS, OMP; OPS (code; the new-version email only)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the email has no unsubscribe link)
- **Introduced** `pkp/pkp-lib#8452` for `pkp/pkp-lib#7874` · [6ce041ca01](https://github.com/pkp/pkp-lib/commit/6ce041ca016af92e5072b28455ed615ef2cb2105) · committed 2022-11-07, merged 2022-12-12 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a12)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor changes a reviewer's due dates or review type, the
reviewer gets "Your review assignment has been changed", whose footer
says "You can unsubscribe from this email at any time." The link opens
an "Unsubscribe" page that does not list this email. Pressing
"Unsubscribe" there reads "You have been unsubscribed … We'll no longer
send you those emails", and the next change sends the email again.

The profile's "Notifications" tab has no row for it either. The code
that sends the email does skip a reviewer who has opted out of it, but
no screen can record that choice.

## Impact

- **Lost**: no data. Pressing "Unsubscribe" with the page's boxes as
  they open (all ticked) turns off, for that journal or press, every
  email the page lists, new discussions and announcements among them,
  which the reviewer did not ask to stop. They can be turned back on
  in the profile.
- **Who**: any reviewer whose assignment an editor edits. The email
  goes out on every save of the "Edit" window that changes the review
  due date, the response due date or the review type. The links work
  only on an install whose configuration file sets `api_key_secret`.
  A new install leaves it empty, and then every unsubscribe link opens
  "404 Not Found", which is a separate fault. Sites that set the secret
  (it is also what users' API keys need) meet this one.
- **Way round**: none. The reviewer has no screen that stops the email.
  The editor's "Edit" window has no option to skip it, and it is not
  one of the emails a manager can disable under "Emails" (in the code).

Medium: the unsubscribe looks done and is not, and the reviewer has no
way to stop the email. Nothing is lost, which keeps it below high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP differs only where a
  bracket says so.
- `api_key_secret` under `[security]` in `config.inc.php` set to any
  text. The dataset leaves it empty, and then the email's unsubscribe
  link opens "404 Not Found" instead of the page step 5 needs.
- Outgoing mail caught locally (a mail catcher such as Mailpit, set in
  `[email]`), since the dataset's addresses are at `mailinator.com`.
  Steps 3 and 7 read the reviewer's messages there.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open submission
   12, "Sodium butyrate improves growth performance of weaned piglets
   during the first period after weaning", on its Review stage. [OMP:
   submission 2, "The West and Beyond: New Perspectives on an Imagined
   Region", on its External Review stage.]
2. In "Reviewers", open "More Actions" on "Julie Janssen" [OMP:
   "Gonzalo Favio"] and choose "Edit". Pick a later "Review Due Date"
   and press "OK".
3. In the mail catcher, open the message to `jjanssen@mailinator.com`
   [OMP: `gfavio@mailinator.com`].
4. Sign in as `jjanssen` [OMP: `gfavio`] and open the profile's
   "Notifications" tab
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
5. In the email from step 3, open the "unsubscribe" link. Leave every
   box ticked and press "Unsubscribe".
6. Sign in as `dbarnes` again, open the same "Edit" and pick another
   "Review Due Date"; press "OK".
7. Look for a new message to the reviewer in the mail catcher.

**Expected**: the "Unsubscribe" page lists this email, as the
"Notifications" tab does, and after step 5 the edit in step 6 sends the
reviewer nothing.

**Observed**: step 3 finds "Your review assignment has been changed
for Journal of Public Knowledge" [OMP: "… for Public Knowledge
Press"], ending:

```
—
This is an automated message from Journal of Public Knowledge. You can unsubscribe from this email at any time.
```

Step 4: the tab lists eleven rows [OMP: nine], from "A new
announcement has been created." to "Statistics report summary.", and
none for this email. [3.5: ten rows, OMP eight, since 3.5 has no "A
new version of your submission, "Title", was published." row.]

Step 5: the "Unsubscribe" page lists the same eleven [OMP: nine] boxes,
none for this email. "Unsubscribe" then reads:

```
You have been unsubscribed
The email address jjanssen@mailinator.com has been successfully unsubscribed. We'll no longer send you those emails. You can resubscribe to email notifications at any time from your user profile.
```

Step 7 finds a second "Your review assignment has been changed for
Journal of Public Knowledge", with the same footer.

## Cause

`EditReviewForm::execute()` (pkp-lib
`controllers/grid/users/reviewer/form/EditReviewForm.php`, lines 217 to
247) creates a `NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED`
notification, skips the email when the reviewer's
`blocked_emailed_notification` setting lists that type, and otherwise
sends `EditReviewNotify` with `allowUnsubscribe($notification)`, which
adds the footer and the `List-Unsubscribe` header.

Three screens write `blocked_emailed_notification`, and each takes its
types from `PKPNotificationManager::getNotificationSettingsMap()`
(`classes/notification/PKPNotificationManager.php`, line 418) or from
the groups built on it:

- `PKPNotificationsUnsubscribeForm`, the page the link opens, lists the
  map and saves only its types, replacing the person's whole list with
  the ticked boxes.
- `PKPNotificationSettingsForm`, the profile's tab, shows the map's
  types grouped by `getNotificationSettingCategories()`.
- `RegistrationForm::execute()` blocks the "public" group's types for
  a new user who declines emails at registration.

`NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED` is in neither the map nor
a group. So the email offers an unsubscribe link for a type no screen
can block, and the check in `execute()` never fires.

The rule it breaks: an email sent with `allowUnsubscribe()` belongs to
a notification type the person can unsubscribe from. The other callers'
types are in the map (`REVIEWER_COMMENT`, `NEW_QUERY`,
`EDITORIAL_REMINDER`, `EDITORIAL_REPORT`, `NEW_ANNOUNCEMENT`, and on a
journal the two issue types), apart from one:
`PKPSubmissionController::createNewPublicationVersionAndNotify()`
(`api/v1/submissions/PKPSubmissionController.php`, lines 2481 to 2535)
emails every participant of a submission when a new version is
created, as `NOTIFICATION_TYPE_SUBMISSION_NEW_VERSION`, with the same
check and `allowUnsubscribe()`, and that type is outside the map too.

Reach:

- The edit of a due date, a response date or the review type, on a
  journal and a press (due date walked; the others take the same
  branch, in the code).
- A mail program's own "Unsubscribe" button (the `List-Unsubscribe`
  header points at the same page; in the code, not driven).
- The new-version email, on all three apps (in the code, not driven).

## Proposed fix

Add both types to the map and to the profile tab's groups, the change
notice under "Reviewing Events" and the new-version email under
"Submission Events". The unsubscribe page and the tab then offer them,
and the existing checks in `EditReviewForm::execute()` and
`createNewPublicationVersionAndNotify()` take effect
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-change-email-unsubscribe-omits-type/fix.diff)):

```diff
--- a/lib/pkp/classes/notification/PKPNotificationManager.php
+++ b/lib/pkp/classes/notification/PKPNotificationManager.php
@@ -430,12 +430,18 @@
             Notification::NOTIFICATION_TYPE_REVIEWER_COMMENT => ['settingName' => 'notificationReviewerComment',
                 'emailSettingName' => 'emailNotificationReviewerComment',
                 'settingKey' => 'notification.type.reviewerComment'],
+            Notification::NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED => ['settingName' => 'notificationReviewAssignmentUpdated',
+                'emailSettingName' => 'emailNotificationReviewAssignmentUpdated',
+                'settingKey' => 'notification.type.reviewAssignmentUpdated'],
             Notification::NOTIFICATION_TYPE_NEW_QUERY => ['settingName' => 'notificationNewQuery',
                 'emailSettingName' => 'emailNotificationNewQuery',
                 'settingKey' => 'notification.type.queryAdded'],
             Notification::NOTIFICATION_TYPE_QUERY_ACTIVITY => ['settingName' => 'notificationQueryActivity',
                 'emailSettingName' => 'emailNotificationQueryActivity',
                 'settingKey' => 'notification.type.queryActivity'],
+            Notification::NOTIFICATION_TYPE_SUBMISSION_NEW_VERSION => ['settingName' => 'notificationSubmissionNewVersion',
+                'emailSettingName' => 'emailNotificationSubmissionNewVersion',
+                'settingKey' => 'notification.type.submissionNewVersion'],
--- a/lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php
+++ b/lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php
@@ -91,11 +91,13 @@
                     Notification::NOTIFICATION_TYPE_QUERY_ACTIVITY,
+                    Notification::NOTIFICATION_TYPE_SUBMISSION_NEW_VERSION,
                 ]
             ],
             ['categoryKey' => 'notification.type.reviewing',
                 'settings' => [
                     Notification::NOTIFICATION_TYPE_REVIEWER_COMMENT,
+                    Notification::NOTIFICATION_TYPE_REVIEW_ASSIGNMENT_UPDATED,
                 ]
```

Each type needs both its map entry and its group line. A type in the
map but in no group is not shown on the tab, and
`PKPNotificationSettingsForm::execute()` treats its missing "Enable
these types of notifications." box as unticked. Every save of the tab
would then block the in-app notification, and with it the email. The
rows' labels are the existing texts "Review assignment updated."
(`notification.type.reviewAssignmentUpdated`) and "A new version of a
submission was created" (`notification.type.submissionNewVersion`).

Tried on `main` on OJS and OMP: with the fix, the "Notifications" tab
shows a "Review assignment updated." row under "Reviewing Events" and
"A new version of a submission was created" under "Submission Events",
the "Unsubscribe" page lists both, and after step 5 the edit in step 6
sends nothing. A reviewer who has not unsubscribed, and who saves the
tab without changing it, still gets the email after an edit, with the
fix and without it. The new-version email itself was not sent in
the walk, with the fix or without.

**Alternatives**

- Treat the change notice like the review request and the reminders:
  drop `allowUnsubscribe()` and the blocked-email check, so it always
  arrives and promises nothing. Reasonable if the team holds that a
  reviewer must always learn of new deadlines; it is a product choice,
  and it takes away the unsubscribe `pkp/pkp-lib#7874` gave this email.
- Have the unsubscribe page add the type of the notification its link
  carries. It fixes the page but leaves the profile tab without the
  row, so a reviewer could not undo the choice.

**What goes with it**

- Every instance: searched for `allowUnsubscribe(` in pkp-lib and the
  three apps; the two types above are the only ones outside the map.
- The new rows show on every profile's tab, a preprint server's too,
  where "A reviewer has commented on "Title"." already shows though the
  server has no reviews (spec U05
  [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#ops1));
  a fix for that would hide the "Reviewing Events" rows there.
- Unticking "Enable these types of notifications." on a new row also
  stops that in-app notification, as on every other row.
- No stored data to repair, no API or hook change.
- Backport: the diff applies as written to `stable-3_5_0`. On
  `stable-3_4_0` both files name the class `PKPNotification::` instead
  of `Notification::`, so a backport there needs its own diff with that
  name; both types and both label texts exist on 3.4.
- Guard: an e2e scenario in spec U27 that unsubscribes through the
  email and edits the assignment again.

Small: four entries in pkp-lib's notification settings, and a test.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-change-email-unsubscribe-omits-type/walk.js)
  (helpers in `lib.js` beside it). Its `neighbour` mode checks that a
  reviewer who saves the "Notifications" tab unchanged still gets the
  email after an edit. From a pkp-e2e checkout, on an install freshly
  loaded from the default dataset with `api_key_secret` set:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/review-change-email-unsubscribe-omits-type/walk.js [walk|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on OJS and OMP, `main` and `stable-3_5_0`, on PostgreSQL; the
  fault does not depend on the database. Datasets: pkp/datasets e8dafbc
  (2026-10-02).
- After step 5 the reviewer's `blocked_emailed_notification` setting
  holds every type the page listed and not `REVIEW_ASSIGNMENT_UPDATED`
  (16777257), read in the database.
- Code reads. `main` and 3.5: `EditReviewForm::execute()` as quoted
  (3.5: lines 214 to 244), and `getNotificationSettingsMap()` without
  either type. 3.4 (`origin/stable-3_4_0`): the same check and
  `allowUnsubscribe($notification)` in `EditReviewForm.php` (lines 209
  and 231), the same map, the same `PKPNotificationsUnsubscribeForm`,
  and the new-version email in `PKPSubmissionHandler.php` (lines 1047
  to 1074). 3.3 (`origin/stable-3_3_0`): no unsubscribe page; the
  notification email went out from
  `PKPNotificationOperationManager::createNotification()` with the
  generic "NOTIFICATION" template and no link. `api_key_secret`:
  `config.TEMPLATE.inc.php` ships it empty, and no install class writes
  it. The manager's "Emails" list offers disabling only for mailables
  with `$canDisable = true`; `EditReviewNotify` keeps the default
  `false`.
- Introduced: `git blame` on `->allowUnsubscribe($notification)` gives
  1a661818c1 (`pkp/pkp-lib#13162`, which moved the block); before it
  ee47a53d5d renamed `unsubscribe()` to `allowUnsubscribe()`, and
  6ce041ca01 added the call. The blocked-email check came earlier, with
  640018cfbe (`pkp/pkp-lib#7286`, 2022-08-03), when the email became a
  mailable; the type was never added to the map.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library):
  "unsubscribe review assignment changed", "unsubscribe reviewer
  email", "unsubscribe page notification type missing", "review
  assignment updated notification email opt out", `EditReviewNotify`,
  `REVIEW_ASSIGNMENT_UPDATED`, `reviewAssignmentUpdated`,
  `getNotificationSettingsMap`. Read and not the same fault:
  `pkp/pkp-lib#6627` (unsubscribe for the users list's "Notify"),
  `#12879` (a discussion footer naming the author), `#13050` (Manage
  Emails loading a mailable).
- Not driven: the new-version email, with the fix or without; the fix
  on 3.5.
- Tips: OJS `main` ff004d0973 with lib/pkp 987776cd04; OMP `main`
  3b0ecf794c with lib/pkp 3dc90c81a6; `stable-3_5_0` OJS c1cee76b95
  with lib/pkp 771474347e, OMP 9c5e24246c with lib/pkp cf3f984335;
  `stable-3_4_0` OJS d68934d0d1, OMP 0aec65441, lib/pkp 767353f4fe;
  `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc883, lib/pkp ac3fa73402.
