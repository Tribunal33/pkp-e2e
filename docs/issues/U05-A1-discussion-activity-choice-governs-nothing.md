# A reply in a discussion ignores the "Discussion activity." choices and is announced as the discussion's start

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (a press and a preprint server once `pkp/pkp-lib#13072`, which stops them saving any discussion, is fixed)
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12323` for `pkp/pkp-lib#12322` · [139bde1e65](https://github.com/pkp/pkp-lib/commit/139bde1e6574f8a55e8c27c4e250d41e7b6bfa1f) · committed 2026-02-10, merged 2026-02-11 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U05 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a1)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

The profile's Notifications tab offers a "Discussion activity." row
with two boxes, "Enable these types of notifications." and "Do not send
me an email for these types of notifications.". Neither does anything.
When someone adds a message to a discussion, every other participant
still gets a Tasks row and an email, whatever they chose on that row.

The Tasks row for the reply repeats the discussion's opening word for
word ("{who opened it} started a discussion: {name}: {opening
message}"), so it cannot be told from the opening without opening it.
The email does carry the reply.

On 3.5 a reply raises its own "… replied to …" row and obeys both
"Discussion activity." boxes. Both halves of the fault came with one
change (`pkp/pkp-lib#12323`), so one fix restores both. A press or a
preprint server cannot save a discussion at all today
(`pkp/pkp-lib#13072`), so it shows this only once that is fixed.

## Impact

- **Lost**: nothing. Every message reaches its readers. The cost is
  notices the person asked not to get, and a Tasks list in which each
  reply looks like a second copy of the opening.
- **Who**: editors, assistants and authors alike, in any discussion
  they take part in.
- **Way round**: the "Discussion added." boxes stop reply notices too,
  but they also stop notices of new discussions. Nothing on screen says
  that "Discussion activity." does nothing.

Low: no message, work or data is lost, and the notices still lead to the
right discussion.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded.
- Journal: submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence" (Copyediting). `dbarnes`
  (Journal editor) writes; `mfritz` (Maria Fritz, Copyeditor) and
  `sberardo` (Stephanie Berardo, Section editor) are the other
  participants. [Press: submission 7, "Accessible Elements: Teaching
  Science Online and at a Distance" (Copyediting), with `dkennepohl`
  (Dietmar Kennepohl, Author) in place of `sberardo`. Preprint server:
  submission 1, "The influence of lactation on the quantity and quality
  of cashmere production" (Production), with `dbuskins` (David Buskins,
  Moderator) in place of `mfritz`.]
- A press or a preprint server cannot save a discussion today: step 6's
  "Save" fails with `Class "APP\notification\Notification" not
  found` (`pkp/pkp-lib#13072`). To walk it there, add the class the app
  lacks, an empty subclass, as `classes/notification/Notification.php`
  in the app:

  ```php
  <?php
  namespace APP\notification;

  class Notification extends \PKP\notification\Notification
  {
  }
  ```

- Each user's email address is `<username>@mailinator.com`. Read the
  mail in the install's outgoing mailbox.

Switching off "Discussion activity.":

1. Sign in as `mfritz` [preprint server: `dbuskins`] and open the
   profile's "Notifications" tab
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
2. Under "Discussion activity.", tick "Do not send me an email for these
   types of notifications.". Press "Save", then sign out.
3. Sign in as `sberardo` [press: `dkennepohl`] and open the same tab.
4. Under "Discussion activity.", untick "Enable these types of
   notifications.". Press "Save", then sign out.

The discussion and a reply:

5. Sign in as `dbarnes`. Open submission 3 and its "Copyediting" stage
   [preprint server: "Production"].
6. Under "Copyediting Tasks & Discussions" [preprint server: "Production
   Tasks & Discussions"], press "Add". Type "Reference check u05c" in
   "Name", tick the two participants, type "Please check the
   references." as the message, and press "Save".
7. Press "Reference check u05c", then "Add New Message". Type "One more:
   check the DOIs too." and press "Save". Sign out.

What each participant got:

8. Sign in as `mfritz` [`dbuskins`], go to the dashboard and press
   "Tasks" in the header. Read the mail sent to them.
9. Do the same as `sberardo` [`dkennepohl`].

**Expected**: the opening reaches both, as a "Discussion added." Tasks
row and email. The reply gives `mfritz` a Tasks row "Daniel Barnes
replied to Reference check u05c: One more: check the DOIs too." and no
email, and gives `sberardo` nothing.

**Observed**: each holds two identical Tasks rows for the discussion:

```
Daniel Barnes started a discussion: Reference check u05c: Please check the references.
The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence
```

and two emails, the second one carrying the reply:

```
From:    Daniel Barnes <dbarnes@mailinator.com>
To:      mfritz@mailinator.com
Subject: Reference check u05c
One more: check the DOIs too. — Reply to this comment at #3 Kwantes or unsubscribe from emails sent by Journal of Public Knowledge …
```

`sberardo` gets the same row and email. The same on the press and the
preprint server.

On 3.5 (its own default dataset, no subclass needed), the same steps in the stage's "Discussions" list ("Add
discussion", then the discussion's "Add Message") give the Expected:
`mfritz` has the opening's row and a row "Daniel Barnes replied to
Reference check u05c: One more: check the DOIs too.", and one email;
`sberardo` has the opening's row and email only.

## Cause

`EditorialTaskController::notifyParticipants()`
(`lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php`) is
the one place that tells a discussion's participants about a message. It
always creates a `NOTIFICATION_TYPE_NEW_QUERY` ("Discussion added.")
Tasks notification. It also reads only the recipient's blocked settings
for that type, both "Enable…" and "Do not send me an email…".

`addNote()`, the reply endpoint, calls it the same way as `addTask()`
and `editTask()`. So a reply is a second "Discussion added." notice.
`QueryNotificationManager::getNotificationMessage()` words a
`NEW_QUERY` notice from the discussion's head note, which is why the
reply's row repeats the opening.

`NOTIFICATION_TYPE_QUERY_ACTIVITY` ("Discussion activity.") is still
defined, offered on the Notifications tab
(`PKPNotificationSettingsForm`), mapped in
`PKPNotificationManager::getNotificationSettingsMap()` and worded in
`QueryNotificationManager` ("{responderName} replied to {noteTitle}:
{noteContents}", `submission.query.activity`). Nothing in pkp-lib or
the three apps creates a notification of that type.

Until January 2026, `QueryNotesGridHandler::insertedNoteNotify()` sent
reply notices as `QUERY_ACTIVITY`. It also deleted the person's earlier
activity notice for the discussion first, and checked the
`QUERY_ACTIVITY` email setting. Commit 1b200a5549
(`pkp/pkp-lib#12242`) removed that handler, and the task endpoints that
replaced it sent no notices. Commit 139bde1e65 (`pkp/pkp-lib#12322`,
whose point 3 is "When new note/reply is posted") added notices for
replies through `notifyParticipants()`, with the type of a new
discussion.

Reach:

- A reply's Tasks row and email, for both "Discussion activity." boxes:
  walked on the three apps.
- The "Unsubscribe" page that a discussion email's footer opens lists
  "Discussion activity." too, and ticking it there stores the same
  ignored setting (code). The test installs have no `api_key_secret`,
  so the link was not opened (spec U05
  [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a6)).
- A reply to a task, as against a discussion, takes the same
  `addNote()` path (code).
- Not this fault: whoever writes a message also gets it back
  (`pkp-e2e` U37
  [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A3-writer-told-of-own-message.md)),
  in the same method. That report's fix leaves the writer out; this one
  sets the type.

## Proposed fix

Give `notifyParticipants()` the notification type, and have `addNote()`
pass `NOTIFICATION_TYPE_QUERY_ACTIVITY`. The method then uses that type
for the notification it creates and for both blocked settings it reads.
For a reply, it first deletes the recipient's earlier activity notice
for the discussion, as `insertedNoteNotify()` did on 3.5. The activity
row's message is worded from the latest reply, so earlier rows would
otherwise all show that same latest reply
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/fix.diff)):

```diff
@@ addNote()
-        $this->notifyParticipants($participantIds, $task, $note);
+        $this->notifyParticipants($participantIds, $task, $note, Notification::NOTIFICATION_TYPE_QUERY_ACTIVITY);
@@ notifyParticipants()
-    protected function notifyParticipants(array $participantIds, EditorialTask $editorialTask, ?Note $note = null): void
-    {
+    protected function notifyParticipants(
+        array $participantIds,
+        EditorialTask $editorialTask,
+        ?Note $note = null,
+        int $notificationType = Notification::NOTIFICATION_TYPE_NEW_QUERY
+    ): void {
 ...
-            if (in_array(Notification::NOTIFICATION_TYPE_NEW_QUERY, $notificationSubscriptionSettings)) {
+            if ($notificationType == Notification::NOTIFICATION_TYPE_QUERY_ACTIVITY) {
+                // Replace any earlier activity notification for this task/discussion; its message shows the latest reply
+                Notification::withAssoc(PKPApplication::ASSOC_TYPE_QUERY, $editorialTask->id)
+                    ->withUserId($user->getId())
+                    ->withType(Notification::NOTIFICATION_TYPE_QUERY_ACTIVITY)
+                    ->withContextId($context->getId())
+                    ->delete();
+            }
+
+            if (in_array($notificationType, $notificationSubscriptionSettings)) {
 ...
-                Notification::NOTIFICATION_TYPE_NEW_QUERY,
+                $notificationType,
 ...
-            if (in_array(Notification::NOTIFICATION_TYPE_NEW_QUERY, $emailSubscriptionSettings)) {
+            if (in_array($notificationType, $emailSubscriptionSettings)) {
```

This keeps the intent of `pkp/pkp-lib#12322`: a reply is still
announced, now as the kind of notice the person can switch off. The
opening and the participants an edit adds stay "Discussion added.".

The fix was tried on the three apps. With it in, the Steps show the
Expected. As a control, the opening and an "Edit" behave the same with
the fix in and out: a participant who switched off "Discussion added."
and is ticked in "Add" gets nothing, and a participant whom "Edit" adds
gets the "started a discussion" row and email.

**Alternatives**

- Remove the "Discussion activity." row from the tab, the "Unsubscribe"
  page and the settings map, and let "Discussion added." cover replies.
  That drops a choice 3.5 users have, and the reply's row would still
  repeat the opening.
- Pick the type inside `notifyParticipants()` from whether a `$note` is
  given. It is shorter, but it ties the type to an argument that means
  something else.

**What goes with it**

- Every instance: `addNote()` is the only reply path. The other
  creators of `NEW_QUERY` (`addTask()`, `editTask()`,
  `PKP\editorialTask\Repository::addQuery()`,
  `PKPStageParticipantNotifyForm::sendMessage()`) announce a new
  discussion or a new participant, which is right.
- Data: no repair. "Discussion added." rows already raised for replies
  stay until their owner clears them.
- API and hooks: the REST responses do not change.
- U37 A3's fix also edits `notifyParticipants()`, on other lines;
  whichever lands second is rebased onto the first.
- Backport: none; 3.5 and older raise "Discussion activity." for
  replies.
- Guard: an e2e scenario in spec U05 (Planned): a reply with
  "Discussion activity." switched off reaches neither the Tasks list nor
  the mailbox, and with it on, the row reads "… replied to …". Or a
  pkp-lib feature test of `addNote()` with `Mail::fake()`.

Small: one method in pkp-lib and its one reply caller, plus a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/lib.js),
  which needs `writer-told-of-own-message/lib.js` from the same folder
  tree) takes the Steps on each app and reads the two participants'
  Tasks windows and mailboxes. Its `control` argument takes the
  control from Proposed fix instead. On an install freshly loaded from
  the default dataset, from a pkp-e2e checkout (`<feature>` names the
  set of test installs, `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/discussion-activity-choice-governs-nothing/fix.diff ojs omp ops`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Dataset: pkp/datasets
  566bb1f (2026-10-03). No server error and no page script error.
- The emails in Observed are the text part's first line, with the
  footer cut short.
- Not driven: two replies in a row with the fix in (the deletion of the
  earlier activity row is read in the code only); the fix on 3.5.
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363); OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `EditorialTaskController.php`
  is the same in the three. `stable-3_5_0`: OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335).
  pkp-lib `stable-3_4_0` 767353f4fe, `stable-3_3_0` ac3fa73402.
- Code reads. 3.5: `QueryNotesGridHandler::insertedNoteNotify()`
  (`controllers/grid/queries/QueryNotesGridHandler.php`) deletes the
  earlier `QUERY_ACTIVITY` notice, creates a `QUERY_ACTIVITY` one, and
  checks that type's email setting. 3.4 (`origin/stable-3_4_0`): the
  same method does the same. 3.3 (`origin/stable-3_3_0`):
  `QueryNoteForm::execute()` (`controllers/grid/queries/form/QueryNoteForm.inc.php`)
  deletes and creates `NOTIFICATION_TYPE_QUERY_ACTIVITY`, and there
  `createNotification()` sends the email after checking the email
  setting. `main`: a grep over `lib/pkp` and the three apps finds
  `NOTIFICATION_TYPE_QUERY_ACTIVITY` only in `Notification.php`,
  `PKPNotificationManager.php`, `PKPNotificationSettingsForm.php` and
  `QueryNotificationManager.php`.
- The trace: `git blame` on `notifyParticipants()` gives 139bde1e65 for
  every line that picks the type and the settings. Its parent's
  `EditorialTaskController.php` creates no notification. 1b200a5549
  deleted `QueryNotesGridHandler.php`.
- Upstream searches (2026-10-04), pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library: "discussion activity",
  `QUERY_ACTIVITY`, `notificationQueryActivity`, `notifyParticipants`,
  "EditorialTaskController notification", "started a discussion" reply,
  "replied to" discussion notification, reply discussion notification
  disabled still email, addNote notification reply task. Read and not
  this fault: `pkp/pkp-lib#12725` (the tab's boxes read as
  contradictory, open), `pkp/pkp-lib#12700` (what the task emails say,
  open), `pkp/pkp-lib#13072` (the missing class on a press and a
  preprint server, open).
