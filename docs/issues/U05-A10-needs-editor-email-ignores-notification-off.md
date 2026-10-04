# A manager who turns off the "needs an editor" notification still gets its email for every new submission

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the email went out only with the task)
- **Introduced** `pkp/pkp-lib#8495` for `pkp/pkp-lib#7191` · [e79fc21e20](https://github.com/pkp/pkp-lib/commit/e79fc21e20f7c47c194d87e25b23897bbc036e77) · committed 2022-10-18, merged 2022-12-14 · Nate Wright (NateWr), in a PR opened by Alec Smecher (asmecher)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U05 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A journal manager unticks "Enable these types of notifications." under
"A new article has been submitted to which an editor needs to be
assigned." on the profile's "Notifications" tab and saves. The tab
promises that the event will then neither show up in the system nor be
emailed. The next submission that nobody is assigned to adds no task to
their "Tasks", as promised. But the "A new submission needs an editor to
be assigned" email still arrives.

The only box that stops this email is "Do not send me an email for these
types of notifications.", and it is greyed out while "Enable…" is
unticked. A manager who wants neither the task nor the email cannot have
that. The announcement
and issue emails do stop when "Enable…" is unticked.

The email goes to everyone with a manager-level role in the journal,
press or server. It is sent only for a submission that nobody is assigned
to: one in a section or series with no editors under "Editorial
Assignments", or a book submitted with no series.

## Impact

- **Lost**: nothing but unwanted email. Nothing tells them their choice
  does not cover it, and the email has no unsubscribe link.
- **Who**: a journal manager, journal editor or site administrator
  enrolled as a manager (press and preprint server managers likewise)
  who unticks "Enable…" on this row. A new journal's or server's default
  section, and every section or series a manager adds, starts with nobody
  ticked under "Editorial Assignments", and a book's "Series" starts at
  "None". Until editors are ticked, each submission sends one email to
  every manager-level account.
- **Way round**: leave "Enable…" ticked and tick "Do not send me an
  email…" instead. The email stops, but the task for each submission
  stays in "Tasks".

Low: no work or data is lost, and there is a way round on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP and OPS differ only
  where a bracket says so.
- In the dataset every section has editors under "Editorial
  Assignments", so a new submission gets its editors automatically and
  the "needs an editor" email is never sent. Step 2 removes them from the
  section the author submits to. [OMP: not needed; the author leaves
  "Series" at "None", which assigns nobody.]
- Outgoing mail caught locally (a mail catcher such as Mailpit, set in
  `[email]`), since the dataset's addresses are at `mailinator.com`.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager.
2. Go to Settings › Journal › "Sections". On "Articles", open "Edit".
   Under "Editorial Assignments", untick "Assign Daniel Barnes as Journal
   editor", "Assign David Buskins as Section editor" and "Assign
   Stephanie Berardo as Section editor". Press "Save". [OMP: skip this
   step. OPS: Settings › Server › "Sections", "Preprints"; untick "Assign
   David Buskins as Moderator" and "Assign Stephanie Berardo as
   Moderator".]
3. Open the profile's "Notifications" tab
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
4. Under "A new article has been submitted to which an editor needs to
   be assigned." [OMP: "A new monograph has been submitted to which an
   editor needs to be assigned."; OPS: "A new preprint has been submitted
   to which a moderator needs to be assigned."], untick "Enable these
   types of notifications.". The "Do not send me an email for these types
   of notifications." box under it greys out. Press "Save": "Your changes
   have been saved." Sign out.
5. Sign in as `ccorino` [OMP: `aclark`]. Start a new submission with the
   title "u05a needs editor" in the section "Articles" [OPS: "Preprints";
   OMP: leave "Series" at "None" on "For the Editors"]. Go through the
   wizard with a file and an abstract, press "Submit" and confirm. Sign
   out.
6. Open the mail catcher's messages to `rvaca@mailinator.com`, and to
   `dbarnes@mailinator.com`, who changed nothing.
7. Sign in as `rvaca` and press the "Tasks" bell.
8. Sign in as `dbarnes` and press the "Tasks" bell.

**Expected**: `rvaca` gets neither a task nor an email for "u05a needs
editor". The tab says: "Unchecking an item will prevent notifications of
the event from showing up in the system and also from being emailed to
you." `dbarnes` gets both.

**Observed**: after the save the row reads "Enable these types of
notifications." unticked and "Do not send me an email for these types of
notifications." unticked and greyed out. `rvaca`'s "Tasks" has no row for
the submission. The email arrives all the same:

```
From: Ramiro Vaca <rvaca@mailinator.com>
To: Ramiro Vaca <rvaca@mailinator.com>
Subject: A new submission needs an editor to be assigned: "u05a needs editor"

Dear Ramiro Vaca,

The following submission has been submitted and there is no editor assigned.
```

`dbarnes` gets the same email, and his "Tasks" lists "A new article has
been submitted to which an editor needs to be assigned. u05a needs
editor", as expected.

Control: with "Enable…" left ticked and "Do not send me an email…"
ticked in step 4 instead, `rvaca` gets the task and no email.

## Cause

`AssignEditors::handle()` (pkp-lib
`classes/observers/listeners/AssignEditors.php`, lines 68 to 122) runs
when a submission is submitted and nobody was assigned to it. For each
manager it creates the `NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED`
task and then sends the `SubmissionNeedsEditor` email. It ignores what
`createNotification()` returned:

```php
$notification = $notificationManager->createNotification(
    $manager->getId(),
    Notification::NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED,
    ...
);

// Check if subscribed to this type of emails
$unsubscribed = in_array(
    Notification::NOTIFICATION_TYPE_EDITOR_ASSIGNMENT_REQUIRED,
    $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings(
        NotificationSubscriptionSettingsDAO::BLOCKED_EMAIL_NOTIFICATION_KEY, ...
```

"Enable these types of notifications." unticked is stored as
`blocked_notification`. `PKPNotificationOperationManager::createNotification()`
reads that setting and returns null for a blocked type. The email branch
reads only `blocked_emailed_notification`, the setting the "Do not send
me an email…" box writes. Unticking "Enable…" makes the form's script
(`FormHandler.js` `toggleDependentElement_`, wired by the template's
`enableDisablePairs`) disable that box, so the browser leaves it out of
the save and `PKPNotificationSettingsForm::execute()` stores no email
block for the type. So a
manager who unticks "Enable…" reaches `Mail::send()` every time.

The rule it breaks: an event the person turned off is neither raised nor
emailed. Up to 3.3, `createNotification()` sent the notification email
itself, and only for a notification it had created.
`pkp/pkp-lib#8116` (`pkp/pkp-lib#7286`) took the email out of
`createNotification()`. `pkp/pkp-lib#8495` then brought the
"needs an editor" email back, in this listener, checking only the
email setting. `pkp/pkp-lib#11572` later fixed which type that check
reads (it read `NOTIFICATION_TYPE_SUBMISSION_SUBMITTED`), and left the
"Enable…" box unread.

Reach:

- OJS, OMP and OPS, the one shared listener (on screen).
- Every manager-level account of the context: the journal manager,
  journal editor and production editor groups (OMP the press manager,
  press editor and production editor; OPS the preprint server manager),
  and the site administrator wherever enrolled in one (in the code; the
  walks read `rvaca`, `dbarnes` and `admin`).
- On an install where the `SUBMISSION_NEEDS_EDITOR` template is missing
  (`pkp/pkp-lib#9217`), the fallback in the same loop passes the null
  `$notification` to `getNotificationContents()`, whose parameter is
  typed `Notification`. For a manager who unticked "Enable…", that would
  be an error during the submit itself (in the code, not driven; the
  dataset has the template).

## Proposed fix

Skip the email when `createNotification()` created no notification
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/needs-editor-email-ignores-notification-off/fix.diff)):

```diff
                 Notification::NOTIFICATION_LEVEL_TASK
             );
 
+            // The manager turned this notification off ("Enable these types of notifications." unticked)
+            if (!$notification) {
+                continue;
+            }
+
             // Check if subscribed to this type of emails
```

This is how the other senders that create a notification and then email
it already behave: `PKPReviewerReviewStep3Form::execute()`,
`PKPSubmissionController` (the new-version email) and
`NotifyAuthorOnPublication` all `continue` on a null `$notification`
before reading the email setting. The guard also keeps the null out of
the missing-template fallback.

Tried on `main` on OJS, OMP and OPS: with the fix, the Steps show the
Expected (`rvaca` gets no task and no email; `dbarnes` gets both). The
control case behaves the same with the fix and without it: "Enable…"
ticked and "Do not send me an email…" ticked gives the task and no email.

**Alternatives**

- Fold the check into the existing condition,
  `if (!$notification || in_array(...))`, as
  `PKPReviewerReviewStep3Form` writes it. This is the same fix in another
  shape; the separate guard also skips the setting lookup.
- A shared helper that decides "may this person be emailed about this
  type" for every sender (for example making
  `PKPNotificationOperationManager::getUserBlockedEmailedNotifications()`
  public, or adding one method that reads both settings). It would stop
  the same mistake for good, but it changes about ten senders, which
  is more than this fault needs.
- Keeping the email box usable while "Enable…" is unticked. That changes
  what the tab means, which is a product decision, and it still leaves
  the tab's own sentence broken.

**What goes with it**

- Every instance: two more senders create a notification and then email
  after checking only the email setting.
  - `PKP\editorialTask\Repository::addQuery()`, which
    `addCommentsForEditorsQuery()` calls at submission for the "Comments
    for the Editors" discussion: it ignores the `createNotification()`
    result.
  - `SubEditorsDAO::assignEditors()`: the `EditorAssigned` email to the
    editors a section assigns. Its notifications are created in an
    earlier loop.

  Neither is covered by this fix. Each is a different email under a
  different row ("Discussion added."; "A new article, "Title," has been
  submitted."), and neither was walked. `addQuery()` does not keep
  `createNotification()`'s result, so it needs the result assigned to a
  variable before the same guard. `assignEditors()` would need to read
  `blocked_notification` in its email loop.
- No stored data is wrong, and no API or hook changes.
- Backport: the block reads the same on `stable-3_5_0` and
  `stable-3_4_0`, where `createNotification()` also returns null for a
  blocked type, so the diff applies as written (not tried there).
- Guard: spec U05 scenario 3 already reads Manager A's mailbox after the
  submission. With the fix it asserts that no email arrives.

Small: one guard in one listener, following the pattern its siblings
use, and a test. It is a proposal; the team decides.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/needs-editor-email-ignores-notification-off/walk.js),
  with its helpers in `lib.js` beside it, which uses
  `section-editors-not-assigned-second-journal/lib.js` for the wizard.
  On an install freshly loaded from the default dataset, from a pkp-e2e
  checkout (`<feature>` names the set of test installs, `<id>` the
  output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/needs-editor-email-ignores-notification-off/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. `neighbour` after
  the script's path takes the control instead (step 4 ticks "Do not send
  me an email…" and leaves "Enable…" ticked). The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/needs-editor-email-ignores-notification-off/fix.diff ojs omp ops`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL.
  The fault does not depend on the database. Datasets: pkp/datasets
  566bb1f (2026-10-03). No request failed and no page script failed in
  any walk.
- The submission's title carried a run marker after "u05a needs editor",
  so each walk's emails could be told apart. The email in Observed is its
  text part, cut after the first sentence. `admin`
  (`pkpadmin@mailinator.com`) got the same email in every walk.
- 3.5: the Steps hold as written, and the observations matched `main`.
- Code reads. `main` and 3.5: `AssignEditors.php` is the same file in
  every app's `lib/pkp` on both lines.
  3.4 (`origin/stable-3_4_0`): the same loop, with
  `createNotification()` returning nothing for a type in
  `blocked_notification` and sending no email.
  3.3 (`origin/stable-3_3_0`):
  `PKPSubmissionSubmitStep4Form::execute()` creates the task for each
  manager, and `PKPNotificationOperationManager::createNotification()`
  emails only for a notification it created (`blocked_notification`
  first, then `blocked_emailed_notification`). So "Enable…" unticked
  stopped both there.
- Introduced: `git blame` on the email branch gives e79fc21e20
  (`pkp/pkp-lib#8495`, committed 2022-10-18, merged 2022-12-14), which
  added the listener with the email checking only
  `BLOCKED_EMAIL_NOTIFICATION_KEY`. Later edits
  moved the lines (6b78534ea1, `pkp/pkp-lib#9217`) and changed the type
  the check reads (ae328be800, `pkp/pkp-lib#11572`). Before it,
  640018cfbe (`pkp/pkp-lib#8116`, 2022-08-03) removed the email from
  `createNotification()`. e79fc21e20 is on `stable-3_4_0` and not on
  `stable-3_3_0`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library): "needs editor email notification disabled", "editor
  assignment required email unsubscribe", "Enable these types of
  notifications", "notification settings email still sent disabled",
  `AssignEditors`, `SubmissionNeedsEditor`, `EDITOR_ASSIGNMENT_REQUIRED`,
  "createNotification email blocked notification". Read and not the same
  fault: `pkp/pkp-lib#11568` (the "Do not send me an email…" box had no
  effect on this email, fixed by `#11572`; this report is the "Enable…"
  box), `#4115` (open, the two boxes' wording), `#10496` (the editorial
  reminder with blocked notifications, fixed), `#9217` (the missing
  template).
- Not driven: the two other senders under "What goes with it"; the
  missing-template fallback; the fix on 3.5.
- Tips: OJS `main` ff004d0973 with lib/pkp 987776cd04; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  `stable-3_5_0` OJS c1cee76b95 with lib/pkp 771474347e, OMP 9c5e24246c
  and OPS 38b61882d3 with lib/pkp cf3f984335; `stable-3_4_0` lib/pkp
  767353f4fe; `stable-3_3_0` lib/pkp ac3fa73402.
