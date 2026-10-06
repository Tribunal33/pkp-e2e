# Unticking boxes on an email's Unsubscribe page switches back on emails the person had turned off

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; no Unsubscribe page)
- **Introduced** `pkp/pkp-lib#5091` for `pkp/pkp-lib#5048` · [81d6b7a071](https://github.com/pkp/pkp-lib/commit/81d6b7a071aed602115adf59f0a035c2363b6f96) · committed 2021-02-19, merged 2021-03-04 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U05 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U05-notifications-center-and-email-preferences.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A person who had turned some emails off on Profile › "Notifications"
opens the "unsubscribe" link in another email. On the "Unsubscribe"
page a ticked box means "stop this email", and every box is ticked,
including the emails already off. To stop only this one email, they
untick the other boxes and press "Unsubscribe". That email does stop,
and the page reads "You have been unsubscribed". But every unticked box
is saved as "send me this email", so the emails they had turned off
are switched back on, without a word.

They find out when one of those emails arrives again, and can turn it
off again on the profile tab.

Many readers and authors have such emails off without ever opening the
tab: a new account that leaves "Yes, I would like to be notified of new
publications and announcements." unticked at registration starts with
the issue and announcement emails off. Only sites that set an API
secret in their configuration file can reach the page. The installer
leaves it empty, and then every unsubscribe link opens "404 Not Found".

## Impact

- **Lost**: the person's earlier choice not to get those emails, often
  the consent they declined at registration, while the page reads "You
  have been unsubscribed".
- **Who**: anyone with an email turned off who uses an emailed
  "unsubscribe" link and unticks a box there: authors, reviewers,
  editors and readers alike, on a site with the API secret set.
- **Way round**: tick "Do not send me an email for these types of
  notifications." again on Profile › "Notifications". Leaving every box
  ticked on the page also avoids it, but then every email stops.

Medium: opt-outs are silently reversed, so people get emails they
declined, but no submission work is lost and the profile tab puts it
right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS. OMP and OPS differ only
  where a bracket says so.
- `api_key_secret` under `[security]` in `config.inc.php` set to any
  text. The dataset leaves it empty, and then the email's unsubscribe
  link opens "404 Not Found" instead of the page step 5 needs.
- Outgoing mail caught locally (a mail catcher such as Mailpit, set in
  `[email]`), since the dataset's addresses are at `mailinator.com`.
- Nothing else. The dataset's authors registered without asking for
  news, so their profiles already have emails turned off: `ckwantes`
  has "An issue has been published.", "An issue has been made open
  access." and "A new announcement has been created." off. [OMP:
  `dkennepohl`, "New announcement." off. OPS: `ccorino`, "A new
  announcement has been created." off.]

Steps:

1. Sign in as `ckwantes` and open Profile › "Notifications". Under "An
   issue has been published.", "An issue has been made open access." and
   "A new announcement has been created.", "Do not send me an email for
   these types of notifications." is ticked. Sign out.
2. Sign in as `dbarnes` and open submission 3, "The Facets Of Job
   Satisfaction: A Nine-Nation Comparative Study Of Construct
   Equivalence", at "Copyediting". [OMP: submission 7, "Accessible
   Elements: Teaching Science Online and at a Distance", at
   "Copyediting". OPS: submission 1, "The influence of lactation on the
   quantity and quality of cashmere production", at "Production".]
3. In "Copyediting Tasks & Discussions" press "Add". Enter "u05d
   unsubscribe walk" as "Name", tick "Catherine Kwantes (ckwantes)", type
   any message and press "Save". Sign out. [OMP: tick "Dietmar Kennepohl
   (dkennepohl)". OPS: "Production Tasks & Discussions", tick "Carlo
   Corino (ccorino)". 3.5: under "Discussions", "Add discussion", tick
   the author, the name as "Subject", any "Message", "OK".]
4. In `ckwantes@mailinator.com`'s mailbox, open the email "u05d
   unsubscribe walk". Its footer reads "… or unsubscribe ( … ) from
   emails sent by Journal of Public Knowledge …". Open the "unsubscribe"
   link (signed out, as from a mail program). [OMP:
   `dkennepohl@mailinator.com`, "Public Knowledge Press". OPS:
   `ccorino@mailinator.com`, "Public Knowledge Preprint Server".]
5. The page "Unsubscribe" reads "Select the emails that you no longer
   wish to receive at ckwantes@mailinator.com from Journal of Public
   Knowledge." Every box is ticked, the three from step 1 included.
   [OMP, OPS: the author's address and name as in step 4; the one row
   from step 1.]
6. To stop only the discussion emails, untick every box except
   "Discussion added." and press "Unsubscribe". The page reads "You have
   been unsubscribed".
7. Sign in as `ckwantes` and open Profile › "Notifications".

**Expected:** "Discussion added." now has "Do not send me an email for
these types of notifications." ticked. The rows from step 1 still have
it ticked: the page offers to stop emails, and says "You can
resubscribe to email notifications at any time from your user profile."

**Observed:** "Discussion added." has the box ticked, and the rows from
step 1 (three on OJS, one on OMP and OPS) now have it unticked: those
emails are switched back on. The result page in step 6 read:

```
You have been unsubscribed
The email address ckwantes@mailinator.com has been successfully unsubscribed. We'll no longer send you those emails. You can resubscribe to email notifications at any time from your user profile.
```

Control: pressing "Unsubscribe" in step 6 with every box left ticked
turns every email off, the rows from step 1 included.

## Cause

`PKPNotificationsUnsubscribeForm::execute()` (pkp-lib
`classes/notification/form/PKPNotificationsUnsubscribeForm.php`, lines
116 to 131 on `main`) collects the types whose boxes were posted. It
passes that list to
`NotificationSubscriptionSettingsDAO::updateNotificationSubscriptionSettings('blocked_emailed_notification', …)`,
which deletes the user's whole list of blocked email types for the
context and inserts the new one. So a box left unticked is stored as "send this email", whatever
the user had stored before.

The page cannot show what is stored. `fetch()` never reads the user's
list, and `templates/notification/unsubscribeNotificationsForm.tpl`
(line 29) renders every box with `checked="checked"`.

The rule it breaks: the page offers to stop emails ("Select the emails
that you no longer wish to receive") and sends resubscribing to the
profile ("You can resubscribe to email notifications at any time from
your user profile."), which shows the stored choices. Both the ticked
boxes and the whole-list write come from 81d6b7a071, which added the page. In
its issue the reviewer asked for boxes "checked by default and the user
can un-check any that they want to remain subscribed to"; an email that
is already off is not one the user remains subscribed to.

Reach:

- Every email type the page lists, on all three apps. The reproductions
  re-enabled the issue, open-access and announcement emails, the ones
  `RegistrationForm::execute()` blocks for a new user who leaves the
  news box unticked.
- The senders honour the stored list: issue and announcement emails go
  only to users `getSubscribedUserIds()` returns, which leaves out a
  user whose list holds the type (read in the code, not driven). So the
  re-enabled emails are sent again.
- The "Enable these types of notifications." boxes
  (`blocked_notification`) are not touched.
- The other places that save this list do it correctly:
  `PKPNotificationSettingsForm` (the profile tab) shows the stored
  choices before it saves them all, and `RegistrationForm` writes a new
  account's first list.
- Stored data: a choice this page re-enabled cannot be told apart from
  one the user switched back on in the profile, so no repair is
  possible.

## Proposed fix

Make `execute()` add the ticked types to the stored list instead of
replacing it:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsubscribe-page-reenables-emails/fix.diff).

```diff
     public function execute(...$functionArgs)
     {
-        $emailSettings = [];
+        /** @var NotificationSubscriptionSettingsDAO */
+        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO');
+        $userId = $this->_notification->userId;
+        $contextId = $this->_notification->contextId;
+
+        // This page only unsubscribes: keep the emails the user has already turned off
+        // (Profile > Notifications) and add the ones ticked here. Resubscribing is done in the profile.
+        $emailSettings = $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings($notificationSubscriptionSettingsDao::BLOCKED_EMAIL_NOTIFICATION_KEY, $userId, $contextId);
         foreach ($this->getNotificationSettingsMap() as $settingId => $notificationSetting) {
-            // Get notifications that the user wants to be notified of by email
-            if ($this->getData($notificationSetting['emailSettingName'])) {
+            // Get notifications that the user no longer wants to receive by email
+            if ($this->getData($notificationSetting['emailSettingName']) && !in_array($settingId, $emailSettings)) {
                 $emailSettings[] = $settingId;
             }
         }
 
-        /** @var NotificationSubscriptionSettingsDAO */
-        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO');
-        $notificationSubscriptionSettingsDao->updateNotificationSubscriptionSettings('blocked_emailed_notification', $emailSettings, $this->_notification->userId, $this->_notification->contextId);
+        $notificationSubscriptionSettingsDao->updateNotificationSubscriptionSettings($notificationSubscriptionSettingsDao::BLOCKED_EMAIL_NOTIFICATION_KEY, $emailSettings, $userId, $contextId);
```

The fix belongs in the shared form, which owns the page's write. No app
subclasses it. It reads the stored list the same way the profile tab
does (`getNotificationSubscriptionSettings()` in
`PKPNotificationSettingsForm::fetch()`). It keeps what 81d6b7a071 was
for: every box ticked by default, and a person can untick an email to
keep getting it. An unticked box now means "leave this email as it
is".

Tried on `main`, all three apps: after step 6 the profile shows
"Discussion added." off and the emails from step 1 still off. The
control (every box left ticked) turns every email off with and without
the fix.

**Alternatives:**

- Tick only the stored choices when the page opens. The page would then
  stop nothing new unless the person ticks a box, which drops the
  "everything ticked" default the original issue asked for. That is a
  product decision, not a fix.
- Show the emails that are already off as ticked and disabled, with a
  note. It is clearer, but it needs a new string and a template change.
  It can follow the fix, and it does not replace it: the write would
  still replace the list.
- Change `updateNotificationSubscriptionSettings()` to merge. Wrong
  layer: the profile tab needs the replacement to switch emails back
  on.

**What goes with it:**

- 3.5: applies as written. 3.4: the same method with
  `getUserId()`/`getContextId()` on the notification; the 3.4 DAO has
  the same getter.
- Guard: an e2e scenario for this report's Steps, and a pkp-lib unit
  test of `execute()` with a stored list.

Small: one method in the shared form, using a DAO read the profile tab
already uses.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/unsubscribe-page-reenables-emails/walk.js).
  Its helpers are in `lib.js` beside it, which uses
  `review-change-email-unsubscribe-omits-type/lib.js` (the profile tab,
  the page, the mailbox) and `merge-fails-for-discussion-opener/lib.js`
  (the discussion). From a pkp-e2e checkout, on an install freshly
  loaded from the default dataset with `api_key_secret` set (`<feature>`
  names the set of test installs, `<id>` the output folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/unsubscribe-page-reenables-emails/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. `neighbour` after
  the script's path takes the control instead. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/unsubscribe-page-reenables-emails/fix.diff ojs omp ops`.
- Reproduced on OJS, OMP and OPS, `main` and `stable-3_5_0`, on
  PostgreSQL. The fault does not depend on the database. Datasets:
  pkp/datasets 566bb1f (2026-10-03).
- In the database: the author's `blocked_emailed_notification` held
  268435477, 50331659 and 8 before step 6 on OJS (8 on OMP and OPS),
  and only 16777249 (`NOTIFICATION_TYPE_NEW_QUERY`) after it. With the
  fix it held all four (OMP, OPS: two).
- 3.5: the Steps hold with the bracket in step 3. The tab and the page
  have no "A new version of your submission…" row there; the result
  matched `main`.
- Code reads. `main` and 3.5: the same `execute()` (lines 116 to 131)
  and template (line 29) in every app's `lib/pkp`.
  3.4 (`origin/stable-3_4_0`): the same `execute()` (lines 116 to 131,
  the DAO call at 128, with `getUserId()`/`getContextId()`), the same
  template line, a DAO `updateNotificationSubscriptionSettings()` that
  deletes the stored list first,
  and `NotificationHandler::unsubscribe()` running the form.
  3.3 (`origin/stable-3_3_0`): no unsubscribe page or form in pkp-lib's
  classes, pages or templates.
  Senders: `PKPAnnouncementController` and OJS `IssueGridHandler` pass
  `BLOCKED_EMAIL_NOTIFICATION_KEY` to `getSubscribedUserIds()`.
- Introduced: `git blame` on the `updateNotificationSubscriptionSettings`
  call and the loop gives 22af741d44 (2024-07-25, the move to Eloquent
  notifications: property access only) and a PSR-12 reformat
  (e3f570bc37); under them is 81d6b7a071, which added the page
  with the whole-list write and every box ticked (then `fbvElement …
  checked=1`; 22166f63db in the same PR made it `checked="checked"`).
  81d6b7a071 is on `stable-3_4_0` and not on `stable-3_3_0`. The
  reviewer's request is in `pkp/pkp-lib#5048` (comment of 2019-09-30).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library), by the symptom's words and by
  `PKPNotificationsUnsubscribeForm`. Read and not the same
  fault: `pkp/pkp-lib#8431` (open, rethinking the profile's options),
  `#12768` (open, the profile tab's clarity), `#12769` (open, opt-outs
  not per context), `#12955` (open, malformed tokens), `#7874` and
  `#5048` (closed, the link itself).
- Not driven: an issue or announcement email actually arriving after
  step 6 (the senders' filter was read in the code); a mail program's
  own "Unsubscribe" button, which goes through the same handler; the fix
  on 3.5.
- Tips: OJS `main` ff004d0973 with lib/pkp 987776cd04; OMP `main`
  3b0ecf794c and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6;
  `stable-3_5_0` OJS c1cee76b95 with lib/pkp 771474347e, OMP 9c5e24246c
  and OPS 38b61882d3 with lib/pkp cf3f984335; `stable-3_4_0` lib/pkp
  767353f4fe; `stable-3_3_0` lib/pkp ac3fa73402.
