# Saving Profile › "Notifications" while it hides the statistics row stops that editor's monthly statistics email

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the row is always shown)
- **Introduced** journal path: `pkp/pkp-lib#8407` for `pkp/pkp-lib#5716` · [1a7fbb216f](https://github.com/pkp/pkp-lib/commit/1a7fbb216faff64f262d5ac14f263ea70f7ae6f5) · 2022-11-03 · Nate Wright (NateWr); site-level path: `pkp/pkp-lib#8600` for `pkp/pkp-lib#8592` · [7e687266fd](https://github.com/pkp/pkp-lib/commit/7e687266fd6c2cba56ba9f7c125b8932bcc20a49) · 2023-02-02 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** U65 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a14)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Profile › "Notifications" hides the "Statistics report summary." row in
two cases: while the journal's "Editorial statistics" setting is at "Do
not send the email to editors.", and always on the site-level profile
(the profile opened outside any journal). An editor who presses "Save"
on the tab in either case is stored as having switched the row off,
although they never saw it. From then on they get neither the monthly
statistics email nor its Tasks entry.

On the journal path the loss shows once the journal switches the email
back on: the editor's row then reads "Enable these types of
notifications." unticked. After a save on the site-level profile, every
journal's row still reads ticked, yet the email stops in every journal.

Only the people the email goes to are affected: Journal Managers and
Section Editors (Press Managers and Series Editors, Preprint Server
Managers and Moderators). The site-level case needs an editor with roles
in two or more journals of the site, because a one-journal user is sent
on to the journal's own profile.

The proposed fix stops new opt-outs but does not bring back editors
already stored as opted out. Those who saved the site-level profile keep
missing every journal's email until `pkp/pkp-lib#12769` makes the
email's recipient list read each journal's own choices.

## Impact

- **Lost**: the monthly statistics email and its Tasks entry, for an
  editor who never chose so: until they tick the row again on the
  journal path, and for good on the site-level path. No one is told.
- **Who**: one save is enough, even with nothing changed. Editors
  already affected can be listed from the database (Cause), but on the
  journal path they cannot be told apart from editors who switched the
  email off themselves.
- **Way round**: on the journal path, ticking the row again once the
  email is back on, if the editor notices it is unticked. On the
  site-level path there is none on screen: the journal's row reads
  ticked and the site-level tab has no row to tick. Only deleting the
  stored row in the database helps.

Medium: the email is a secondary output, not a core task. A site where
editors depend on it for their monthly reporting would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`): OJS "Journal
  of Public Knowledge", OMP "Public Knowledge Press", OPS "Public
  Knowledge Preprint Server", each at the path `publicknowledge`.
  "Editorial statistics" is at "Send a monthly email to editors.", the
  default.
- A shell in the application's root. The monthly task runs on the 1st of
  each month from the site's scheduler. The steps below run it now with
  the scheduler's own command.

The steps use OJS words. On OMP, `rvaca` is a Press manager, and
`dbuskins` and `sberardo` are Series editors. On OPS, `rvaca` is a
Preprint Server manager, and `dbuskins` and `sberardo` are Moderators.

Switching the email off and back on:

1. Sign in as `rvaca` (Journal manager). Open Settings › Workflow ›
   "Emails". Under "Editorial statistics", choose "Do not send the email
   to editors." and press "Save".
2. Sign out. Sign in as `dbuskins` (Section editor). Open Profile ›
   "Notifications"
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
   The group "Editors" lists "Weekly email of outstanding tasks" only.
3. Press "Save" without changing anything. The page shows "Your changes
   have been saved."
4. Sign out. Sign in as `rvaca`. Open Settings › Workflow › "Emails",
   choose "Send a monthly email to editors." and press "Save".
5. Sign out. Sign in as `dbuskins`. Open Profile › "Notifications". The
   row "Statistics report summary." is back under "Editors".
6. Sign out. Sign in as `sberardo` (Section editor, who did not save in
   between). Open Profile › "Notifications" and look at the same row.
7. In the application's root, run the monthly task:
   `php lib/pkp/tools/scheduler.php test --name='PKP\task\StatisticsReport'`
8. Run the waiting jobs: `php lib/pkp/tools/jobs.php run`. Opening any
   page does the same, because the dataset runs jobs on web requests.
9. Open the mailboxes of dbuskins@mailinator.com and
   sberardo@mailinator.com in the mail catcher the install delivers to.
10. Sign in as `dbuskins`, then as `sberardo`, and open the "Tasks"
    panel (the bell) on the dashboard.

The site-level profile (a fresh dataset; the email stays on throughout):

1. Sign in as `admin`. Open Administration › "Hosted Journals" ›
   "Create Journal" and create "u65ir9 Journal" (OMP "u65ir9 Press",
   OPS "u65ir9 Server"): initials "U65IR9", contact "u65ir9 Journal",
   u65ir9@mailinator.com, country "Canada", path "u65ir9", English,
   enabled. Press "Save".
2. Sign out. Sign in as `dbuskins`. Open Profile › "Roles", press
   "Register with other journals", tick "Reader" under "u65ir9 Journal"
   and press "Save". `dbuskins` now has roles in two journals, so the
   site-level profile is no longer forwarded to the journal's.
3. Open the site-level profile's "Notifications" tab
   (`/index.php/index/en/user/profile/notificationSettings`). The group
   "Editors" lists "Weekly email of outstanding tasks" only. Press
   "Save".
4. Open "Journal of Public Knowledge"'s Profile › "Notifications"
   (`/index.php/publicknowledge/en/user/profile/notificationSettings`).
5. Run steps 7 to 9 above.

**Expected**: at step 5, `dbuskins`'s "Statistics report summary."
row reads "Enable these types of notifications." ticked, as it did
before step 1 and as `sberardo`'s does. He never changed it. Both editors
get the email for the previous month, "Editorial activity for <month>,
<year>" (OPS "Preprint Server activity for <month>, <year>"), and the
Tasks entry. On the site-level path, `dbuskins` gets "Journal of Public
Knowledge"'s email.

**Observed**: at step 5, `dbuskins`'s row reads "Enable these types of
notifications." unticked, and "Do not send me an email for these types
of notifications." unticked and greyed out. `sberardo`'s row reads
ticked. After the task:

- `sberardo` gets "Editorial activity for September, 2026" (the walk
  ran on 2026-10-03) from
  rvaca@mailinator.com, and his Tasks panel lists "This is a kind
  reminder for you to check your publication's health through the
  editorial report."
- `dbuskins` gets no email, and his Tasks panel has no such entry.

On the site-level path, at step 4 the journal's row reads "Enable these
types of notifications." ticked. Still, `dbuskins` gets no email, while
`sberardo` gets his. No request failed and no page script failed.

## Cause

`PKPNotificationSettingsForm::execute()`
(`lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php`,
lines 153–166 on `main`) loops over every type in
`getNotificationSettingsMap()`. It stores a type as blocked whenever its
"Enable…" box was not posted, and as email-blocked only when its "Do not
send me an email…" box was posted. It then replaces the user's whole
`blocked_notification` and `blocked_emailed_notification` sets for the
context with the result. That assumes the form showed every type in the
map, so an absent box can only mean "unticked".

`getNotificationSettingCategories()` (line 104) breaks that assumption
for `NOTIFICATION_TYPE_EDITORIAL_REPORT`, on two paths:

- The journal path: 1a7fbb216f (the Manage Emails rework) leaves the
  row out while the context's `editorialStatsEmail` is off, so that no
  one is offered a choice about an email the journal does not send.
- The site-level path: 7e687266fd made the method accept no context, so
  that the site-level profile's tab could open at all, and with no
  context the row is always left out.

The form then posts neither box for that row, so a save stores it as
blocked. It also drops a stored "Do not send me an email…" choice for
it (code): an editor who had asked for the Tasks entry without the email
gets the email again once they tick the row back.

`StatisticsReport::executeActions()` reads the stored block through
`NotificationSubscriptionSettingsDAO::getSubscribedUserIds()`. It
leaves the user out of both the Tasks entry (`blocked_notification`)
and the email (both keys).

Where else the fault shows:

- The site-level block has no context, yet it stops every journal's
  email, because `getSubscribedUserIds()`'s subquery does not filter on
  `context_id`: a block stored for any context, or for none, counts for
  every journal. That second fault is `pkp/pkp-lib#12769` (open), and it
  stays a separate fix.
- Other rows: on `main` the tab shows every other type of the map in
  OJS (whose `NotificationSettingsForm` adds the issue and open-access
  rows), OMP and OPS. So today the statistics row is the only one the tab
  hides, and the only one a save stores as switched off unseen (code). A
  plugin that removes a row through the
  `…::getNotificationSettingCategories` hook would get the same effect
  for that row. No plugin in the three checkouts does (code).
- `PKPNotificationsUnsubscribeForm` lists every type of the map, so it
  hides no row. `RegistrationForm` writes only a new user's
  public-notification email choices. Neither has the fault (code).
- Stored data: every account that saved the tab on either path since
  3.4 holds the block. This query lists every account stored as not
  wanting the statistics email or entry (on 3.4 the column is
  `context`):

  ```sql
  SELECT u.username, n.context_id
  FROM notification_subscription_settings n
  JOIN users u ON u.user_id = n.user_id
  WHERE n.setting_name = 'blocked_notification'
    AND n.setting_value = '16777258'; -- NOTIFICATION_TYPE_EDITORIAL_REPORT
  ```

  Rows with a journal's `context_id` look the same whether this fault
  wrote them or the editor unticked the row. Rows with no context were
  written by the site-level path, since no tab from 3.4 on shows the row
  there. The exception would be a choice made on a 3.3 site-level tab
  and kept through the upgrade (not checked).

"(code)" marks a fact found by reading the code, not on screen.

## Proposed fix

Have `execute()` save only the rows the form showed, and keep the
stored choices for the others:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/fix.diff).
The DAO lookup moves up from line 164 so the stored sets can be read
first:

```diff
--- a/lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php
+++ b/lib/pkp/classes/notification/form/PKPNotificationSettingsForm.php
@@ -148,9 +148,23 @@
-        $blockedNotifications = [];
-        $emailSettings = [];
+        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO'); /** @var NotificationSubscriptionSettingsDAO $notificationSubscriptionSettingsDao */
+
+        // Only the rows the form showed were sent; keep the stored choices for the others
+        // (e.g. "Statistics report summary." while the context sends no editorial statistics email)
+        $shownSettingIds = array_merge(...array_column($this->getNotificationSettingCategories($context), 'settings'));
+        $blockedNotifications = array_values(array_diff(
+            $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings($notificationSubscriptionSettingsDao::BLOCKED_NOTIFICATION_KEY, $userId, $contextId),
+            $shownSettingIds
+        ));
+        $emailSettings = array_values(array_diff(
+            $notificationSubscriptionSettingsDao->getNotificationSubscriptionSettings($notificationSubscriptionSettingsDao::BLOCKED_EMAIL_NOTIFICATION_KEY, $userId, $contextId),
+            $shownSettingIds
+        ));
         foreach ($this->getNotificationSettingsMap() as $settingId => $notificationSetting) {
+            if (!in_array($settingId, $shownSettingIds)) {
+                continue;
+            }
@@ -161,7 +175,6 @@
-        $notificationSubscriptionSettingsDao = DAORegistry::getDAO('NotificationSubscriptionSettingsDAO'); /** @var NotificationSubscriptionSettingsDAO $notificationSubscriptionSettingsDao */
         $notificationSubscriptionSettingsDao->updateNotificationSubscriptionSettings($notificationSubscriptionSettingsDao::BLOCKED_NOTIFICATION_KEY, $blockedNotifications, $userId, $contextId);
```

The rule, "a row the user did not see keeps its stored value", belongs
in the shared form's `execute()`, which owns the write. It reads the
same `getNotificationSettingCategories($context)` that `fetch()` uses
to build the tab, so the shown and saved sets cannot drift apart. It
also covers the app subclasses and any hook that adds or removes rows,
and it keeps the stored "Do not send me an email…" choice too. It keeps
the intent of both commits: the row stays hidden while the journal sends
no email, and the site-level tab still opens.

Tried on `main`, all three apps, on both paths: `dbuskins`'s row reads
ticked after the email returns, a site-level save leaves the journal's
email alone, and he gets the email and the Tasks entry. A check that the
fix does not reach too far ran with and without it: unticking a row the
tab shows is still saved. "Weekly email of outstanding tasks" unticked
while the email is off, and "Statistics report summary." unticked while
it is on, both stayed unticked after a reload.

**Alternatives**:

- Always show the row (undo the hiding): this loses the intent of
  `pkp/pkp-lib#5716`, and an editor would be offered a choice about an
  email the journal does not send.
- Post the hidden rows as hidden inputs carrying the stored values:
  this puts the rule in the template, and the server would still trust
  posted values for rows it never showed.
- Fix only `pkp/pkp-lib#12769` (scope the read to the context): this
  ends the site-level blocks' effect on journals, but not the journal
  path. It is worth doing on its own.

**What goes with it**:

- Stored data: the fix stops new blocks and changes no stored row, so
  editors already stored as opted out stay so. No repair goes with it.
  On the journal path a repair is not possible: the query above cannot
  tell this fault's rows from an editor's own choice, so affected
  editors tick the row again on their journal's tab. On the site-level
  path, the rows with no context keep stopping every journal's email
  until `pkp/pkp-lib#12769` scopes the read to each journal; after that
  they stop nothing. If the team wants them gone before then, deleting
  the rows with no context for this type is the repair, and it belongs
  with #12769.
- Test: there is no unit test for this form today. A
  `DatabaseTestCase` for `PKPNotificationSettingsForm::execute()`, with
  a context whose `editorialStatsEmail` is off and no box posted for the
  report row, should leave the stored sets unchanged for that type. The
  e2e guard is U65 scenario 4 (Planned).
- `pkp/pkp-lib#12768` (open) proposes a tab that shows each user only
  the rows relevant to their roles. With today's `execute()`, every row
  hidden that way would be stored as switched off on the first save.
  The fix makes that redesign safe.
- Backport: 3.5's DAO matches the context as `main`'s does
  (`COALESCE(context_id, 0) = ?`), and 3.5 takes the diff as written, at
  an offset. 3.4's DAO reads and deletes with `context = ?`, which never
  matches the site level's null. There, the backport covers the journal
  path; on the site level it stops adding new statistics blocks, but
  cannot keep or clear a stored one, and each save still adds duplicate
  rows. The site level on 3.4 also needs `main`'s null-safe match in
  `getNotificationSubscriptionSettings()` and
  `updateNotificationSubscriptionSettings()`.

Small: one method in one shared form, and a unit test. No data repair
goes with it (above), so the size holds.

## Evidence

- Kept script, which takes the Steps on the three apps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/walk.js)
  (with [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/lib.js)).
  With no argument it takes the first group of steps, `reach` takes the
  site-level path, and `neighbour` unticks a shown row ("Weekly email of
  outstanding tasks" with the email off, "Statistics report summary."
  with it on) and reads both back after a reload.
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/walk.js [reach|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5), on a freshly loaded
  dataset each time.
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/stats-email-optout-after-saving-notifications/fix.diff ojs omp ops`,
  then the walk, the walk with `reach`, and the walk with `neighbour`
  with the fix in and out.
- Walked on PostgreSQL, datasets pkp/datasets e8dafbc (2026-10-02), on
  2026-10-03 (UTC), so the email covers September 2026. The fault has no
  database-specific part; MySQL not checked.
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp
  ddd8ab243a for OJS, 3dc90c81a6 for OMP and OPS); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` OJS c1827e3527, OMP 0aec65441f, OPS acd8ae704b
  (pkp-lib 9e41f10273); `stable-3_3_0` OJS ac77c9fb35, OMP 8e72fc8836,
  OPS c5532e2161 (pkp-lib ac3fa73402).
- Code reads: on `main`, `PKPNotificationSettingsForm` (`execute()`,
  `getNotificationSettingCategories()`, `fetch()`), the template
  `templates/user/notificationSettingsForm.tpl`, the apps'
  `NotificationSettingsForm` and OJS's
  `NotificationManager::getNotificationSettingsMap()`,
  `NotificationSubscriptionSettingsDAO`, `StatisticsReport`,
  `PKPNotificationsUnsubscribeForm::execute()`,
  `RegistrationForm::execute()`. 3.5: `PKPNotificationSettingsForm` is
  the same apart from the "Publication published" row, which 3.5 lacks;
  `StatisticsReport` and the DAO's context match are identical. 3.4: pkp-lib's
  `PKPNotificationSettingsForm.php` has the same conditional row and the
  same `execute()`; `StatisticsReport.php` and `getSubscribedUserIds()`
  read the block the same way, without a context filter; the three apps'
  `NotificationSettingsForm` do not override `execute()`;
  `NotificationSubscriptionSettingsDAO` reads and deletes with
  `context = ?`. 3.3: pkp-lib's
  `PKPNotificationSettingsForm.inc.php` lists
  `NOTIFICATION_TYPE_EDITORIAL_REPORT` unconditionally, there is no
  `editorialStatsEmail` setting, and every type of the map has a row, so
  a save posts every box.
- Introduced: `git blame` on the conditional row (line 104) goes to
  7e687266fd, which added the `$context &&` guard and made the
  method's `Context` argument optional; before it, 1a7fbb216f took a
  required `Context` and the site-level tab could not open. `git log -S
  editorialStatsEmail` on the form finds the row made conditional in
  1a7fbb216f. GitHub's `commits/<sha>/pulls` names `pkp/pkp-lib#8407`
  (merged 2022-11-30) and `pkp/pkp-lib#8600` (merged 2023-02-02). Both
  commits are on `stable-3_4_0` and not on `stable-3_3_0`.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  were searched for the symptom ("statistics report notification",
  "editorial statistics email notification", "\"Statistics report
  summary\"", "editorial report email not received") and for
  `NotificationSettingsForm`, `editorialStatsEmail` and
  `getSubscribedUserIds`. `pkp/pkp-lib#12768` and `#8431` (open) discuss
  the tab's design. None describes a hidden row being saved as switched
  off.
- Not driven: 3.4 and 3.3 (code only); the site-level path on 3.5 (code:
  the same form and query); the scheduler's own run on the 1st (step 7
  runs the same task by command); the Tasks entry on the site-level
  path; the dropped "Do not send me an email…" choice (code only).
