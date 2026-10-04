# Registering on the site-wide Register page ignores an unticked "notify me" box: announcement emails stay on

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3964` for `pkp/pkp-lib#3836` · [15c1290474](https://github.com/pkp/pkp-lib/commit/15c1290474b5597a0cb0e005d2ee313eaf139181) · 2018-08-02 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U02 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U02-registration-and-account-validation.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

The site-wide Register page offers "Yes, I would like to be notified of
new publications and announcements.", the same box as a journal's own
Register page, but the answer is never recorded. A visitor who registers
there, ticks a role under a journal and leaves the box unticked keeps
that journal's public notification emails on: new announcements, and on
a journal also published and open-access issues. The same choice on the
journal's own Register page switches those emails off.

Nothing tells the visitor that their choice was dropped. The box starts
unticked, so a visitor who leaves it alone has declined and still gets
the emails.

On a site with several journals, the site's own pages link to the
site-wide Register page (the "Register" item of the site's menu). On a
site with one journal, the site's home page forwards to the journal,
whose links lead to the journal's own Register page, so the site-wide
page is reached only by typing its address.

## Impact

- **Lost**: the newcomer's refusal of the journal's announcement and
  issue emails, which go out anyway.
- **Who**: visitors who register from the site-wide Register page and
  tick a role under a journal, press or server, in practice on sites
  with several journals.
- **Way round**: on each journal's Profile › "Notifications" tab, the
  newcomer ticks "Do not send me an email for these types of
  notifications." on every row under "Public Announcements". Each email
  has its own row: three on a journal (announcements, published issues,
  open-access issues), one on a press or server. Nothing points them
  there.

Medium: no work is lost and the newcomer can switch the emails off on
screen, but the choice is dropped on every site-wide registration. It
would be high if the emails could not be switched off.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (OMP and OPS the same, with
  "Public Knowledge Press" and "Public Knowledge Preprint Server" for
  the journal).
- Nothing else. The site hosts one journal, so its home page forwards
  to the journal; open the site-wide Register page by its address.

Steps:

1. Signed out, open `/index.php/index/en/user/register`, the site-wide
   "Register" page.
2. Fill "Given Name" `u02d`, "Family Name" `Visitor`, "Affiliation"
   `u02d`, "Country" "Canada", "Email" `u02d.visitor@mailinator.com`,
   "Username" `u02dvisitor`, and "Password" and "Repeat password"
   `u02dvisitoru02dvisitor`.
3. Under "Journal of Public Knowledge", tick "Reader", then tick the
   journal's privacy line that appears under it ("Yes, I agree to have
   my data collected and stored according to this journal's privacy
   statement.").
4. Leave "Yes, I would like to be notified of new publications and
   announcements." unticked.
5. Press "Register". The page reads "Registration complete" and the
   visitor is signed in (email validation is off in the dataset).
6. Open `/index.php/publicknowledge/en/user/profile` and select the
   "Notifications" tab.

**Expected**: under "Public Announcements", every row's "Do not send me
an email for these types of notifications." is ticked, as for an account
registered on the journal's own Register page with the box unticked.

**Observed**: under "Public Announcements" ("A new announcement has been
created.", "An issue has been published.", "An issue has been made open
access."), each row has "Enable these types of notifications." ticked and
"Do not send me an email for these types of notifications." unticked.
OMP and OPS show the same for their one row, "A new announcement has
been created.".

Control: the same visitor on the journal's own Register page
(`/index.php/publicknowledge/en/user/register`), box unticked, gets
every "Do not send me an email…" box under "Public Announcements"
ticked.

## Cause

`RegistrationForm::execute()` in pkp-lib
(`classes/user/form/RegistrationForm.php`, line 329 on `main`) saves the
choice only when the request has a context:

```php
// Save the email notification preference
if ($request->getContext() && !$this->getData('emailConsent')) {
    // … the context's 'notification.type.public' types →
    // updateNotificationSubscriptionSettings('blocked_emailed_notification', …, $request->getContext()->getId())
}
```

The site-wide page has no context, so the block is skipped. Yet the
same form reads `emailConsent` on both pages (`readInputData()`), and
`templates/frontend/pages/userRegister.tpl` (lines 144–152) prints the
box in its `{if !$currentContext}` branch. The roles the visitor ticks
on that page are saved for each journal by
`UserFormHelper::saveRoleContent()`, so the new account does join the
journal; only the email choice has no writer.

The context condition is from `pkp/pkp-lib#3600` (9ade5371b1,
2018-05-10), when the box existed only on a journal's page. The
site-wide copy of the box came with `pkp/pkp-lib#3836` (site privacy
statement and consent during registration), which did not extend the
write.

Reach:

- The mail recipients for these types read this setting:
  `NotificationSubscriptionSettingsDAO::getSubscribedUserIds()` leaves
  out a user with a `blocked_emailed_notification` row for the type, and
  otherwise includes every user with a role in the journal. All three
  emails go through it: a new announcement whose editor chose to email
  it (`PKPAnnouncementController::notifyUsers()`), and on a journal a
  published issue (`IssueGridHandler`) and an issue made open access
  (the scheduled task `classes/tasks/OpenAccessNotification.php`)
  (code).
- A separate fault, outside this report and its fix: that query matches
  the blocked row without its journal (no `context_id` condition in the
  `notification_subscription_settings` subquery), so a block saved for
  one journal stops that email from every journal the user has a role
  in, while the other journals' "Notifications" tabs show it on (code).
  pkp tracks it as `pkp/pkp-lib#12769` (open).
- A site-wide registration with no role ticked joins no journal, so no
  journal mails that account until it takes a role (code).
- `emailConsent` is read nowhere else. Joining another journal later
  from Profile › "Roles", or by invitation, asks no such question, so
  those paths have no choice to drop (code).

## Proposed fix

Save the choice on the site-wide form too, for every journal the new
account was given a role in. Move the existing block into a helper that
takes the context, and call it for the request's context or, on the
site-wide form, for the contexts of the user's new groups:

```php
// Save the email notification preference: for the context registered with, or, on
// the site-wide form, for every context the new user was given a role in
if (!$this->getData('emailConsent')) {
    $contextIds = $request->getContext()
        ? [$request->getContext()->getId()]
        : UserGroup::query()->withUserIds([$user->getId()])->get()
            ->pluck('contextId')->filter()->unique()->all();
    $contextDao = Application::getContextDao();
    foreach ($contextIds as $contextId) {
        $this->blockPublicNotificationEmails($user->getId(), $contextDao->getById($contextId));
    }
}
```

`blockPublicNotificationEmails(int $userId, Context $context)` is the
current block unchanged, with `$context` in place of
`$request->getContext()`. The full change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-register-email-optout-not-kept/fix.diff).
It reads the contexts from the groups the user holds once
`saveRoleContent()` has run, not from the ticked groups that
`validate()` reads for the consent check. So a ticked role that is not
saved (not self-registering, or a journal closed to registration)
writes nothing. The journal-level path is unchanged.

The fix was tried on `main` in OJS, OMP and OPS. With it, the steps above
show every "Do not send me an email…" box under "Public Announcements"
ticked. The neighbour checks gave the same result with and without the
fix: the journal's own page with the box unticked still blocks the
emails, and the site-wide page with the box ticked still leaves them on.

**Alternatives**

- Block the emails for every journal on the site. That records a
  refusal for journals the visitor did not register with, which the
  journal-level page does not do. Because of the separate fault in
  Reach, it would change only what those journals' "Notifications" tabs
  show, not which emails are sent.
- Remove the box from the site-wide page. That drops the visitor's
  choice instead of keeping it, and the journal-level page would still
  offer it.

**What goes with it**

- Accounts registered on the site-wide page since 2018 keep the emails
  on, and the fix does not change them: they stored no choice, so there
  is nothing to restore.
- Until the separate fault in Reach is fixed, the block this fix saves
  also stops these emails from a journal the user joins later, as a
  block saved on a journal's own Register page already does.
- No API or hook change; the `registrationform::execute` hook runs as
  before.
- 3.5 takes the diff as it stands (same file, same `UserGroup` model).
  3.4 and 3.3 have the same condition but no Eloquent `UserGroup`. There
  the contexts come from `Repo::userGroup()->getCollector()->filterByUserIds()`
  (3.4) or `UserGroupDAO::getByUserId()` (3.3); not tried.
- Guard: an e2e scenario in spec U02 (site-wide registration with the
  box unticked, then Profile › "Notifications"), or a unit test of
  `execute()` without a context.

Small: one method in one pkp-lib class, and a test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/site-register-email-optout-not-kept/walk.js)
  (helpers in `lib.js` beside it) takes steps 1–6 through the screens on
  OJS, OMP and OPS, on an install freshly loaded from the default
  dataset, and reads the "Notifications" tab and the server log.
  `neighbour` as its argument runs the two nearby paths: the journal's
  own Register page with the box unticked, and the site-wide page with
  the box ticked:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/site-register-email-optout-not-kept/walk.js [walk|neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/site-register-email-optout-not-kept/fix.diff ojs omp ops`,
  then the steps and the neighbour paths, then `revert` and the
  neighbour paths again.
- A database read after step 5 on each app: the account holds the
  Reader group of context 1 and no `notification_subscription_settings`
  row.
- Datasets: pkp/datasets 566bb1f (2026-10-03), `main` and
  `stable-3_5_0`, on PostgreSQL. MySQL not checked; the fault does not
  depend on the database.
- Branch tips. `main`: OJS ff004d0973 (pkp-lib 987776cd04), OMP
  3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6). 3.5: OJS
  c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c and OPS 38b61882d3
  (pkp-lib cf3f984335). 3.4: pkp-lib 767353f4fe; OJS d68934d0d1, OMP
  0aec65441, OPS acd8ae704b. 3.3: pkp-lib ac3fa73402; OJS ac77c9fb35,
  OMP 8e72fc883, OPS c5532e2161.
- Code reads. `main` and 3.5: pkp-lib
  `classes/user/form/RegistrationForm.php` (`readInputData()`,
  `validate()`, `execute()`; the same in the three apps' pkp-lib on each
  line, and on 3.5 apart from its imports and two session lines),
  `templates/frontend/pages/userRegister.tpl`,
  `classes/user/form/UserFormHelper.php::saveRoleContent()`,
  `classes/notification/NotificationSubscriptionSettingsDAO.php`
  (`updateNotificationSubscriptionSettings()`, `getSubscribedUserIds()`,
  lines 93–112 on `main`),
  `api/v1/announcements/PKPAnnouncementController.php::notifyUsers()`,
  OJS `classes/tasks/OpenAccessNotification.php`,
  and every `emailConsent` and `blocked_emailed_notification` use in
  pkp-lib and OJS. 3.4: pkp-lib `stable-3_4_0`
  `classes/user/form/RegistrationForm.php` line 283 has the same
  condition, and `templates/frontend/pages/userRegister.tpl` prints the
  box in the site-wide branch (line 139). 3.3: pkp-lib `stable-3_3_0`
  `classes/user/form/RegistrationForm.inc.php` line 287 and the same
  template (line 139), the same way. `PKPNotificationSettingsForm` has
  the `notification.type.public` category on both. The separate fault:
  `getSubscribedUserIds()` has the same unscoped subquery on 3.5 and on
  pkp-lib `stable-3_4_0` (line 186; it came with `pkp/pkp-lib#7286`,
  640018cfbe); `stable-3_3_0` has no such query and checks the block
  per journal (`PKPNotificationOperationManager`).
- Introduced: `git blame` on the condition gives e3f570bc37 (the PSR-12
  reformat); before it, 9ade5371b1. `git log -S emailConsent` names 15c1290474 as the commit
  that put the box on the site-wide page; `commits/<sha>/pulls` names
  `pkp/pkp-lib#3964`, merged 2018-08-28. It is on `stable-3_3_0`,
  `stable-3_4_0`, `stable-3_5_0` and `main`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/omp for the
  registration box, "emailConsent", site-wide registration and
  notifications, and `RegistrationForm` with
  `blocked_emailed_notification`. `pkp/pkp-lib#6536` and
  `pkp/pkp-lib#3575` discuss the box and announcement emails, not this
  fault.
- That the site's own "Register" menu link opens the site-wide page on a
  site with several journals is read in the code and the dataset's site
  menu (an `NMI_TYPE_USER_REGISTER` item in the site's user menu), not
  walked. On a one-journal site the home page's forward is
  `IndexHandler::index()` (OJS; `getTargetContext()`), and the journal's
  own menu item points at the journal's Register page (code and the
  dataset's menus). No announcement or issue email was sent in the walks; that
  those emails follow the setting is read in the code.
- Not driven: 3.4 and 3.3 (read in the code), and the fix's backport.
