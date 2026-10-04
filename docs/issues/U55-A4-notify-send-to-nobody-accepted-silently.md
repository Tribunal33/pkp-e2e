# Users & Roles › "Notify": an email to roles nobody holds is accepted with "Saved" and sent to no one

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; "Email was successfully sent to all recipients.")
- **Introduced** `pkp/pkp-lib#6374` for `pkp/pkp-lib#4017` · [891eba2020](https://github.com/pkp/pkp-lib/commit/891eba202036ec9d41ff8896949330918c0a4565) · 2020-11-25 · Nate Wright (NateWr): the send was written with no check for an empty recipient list, and every later rewrite kept that
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U55 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U55-notify-users.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On Settings › Users & Roles › "Notify", a manager ticks only roles that
nobody currently holds, leaves "Copy" unticked and presses "Send Email".
The send is accepted and no email goes out, but nothing says so: the
form stays filled in, with "Saved" beside the button. An ordinary send
replaces the form with the "queued" line, so "Saved" appears only here.

The manager expects to be told that nobody would receive the email, or
expects the send to be refused. With "Copy" ticked (the box that sends
the manager a copy of the email), the same send shows "Emails are
successfully queued to be sent at the earliest convenience." and only
that copy goes out, which reads like proof that the roles were reached.

## Impact

- **Lost**: no email, since nobody holds the roles. The manager is left
  believing one went out, and with "Copy" ticked their own copy
  confirms it.
- **Who**: managers and the Site Administrator who send to a role with
  no current member (nobody was given it, or its members are disabled,
  their role has ended or has not started yet), on a journal, press or
  server where the site allows bulk email.
- **Way round**: the only warning is the confirmation window's "0 users"
  before the send; the Users tab, filtered by role, shows the role is
  empty.

Low: no email is lost and the window warns before the send. A manager
who acts on their copy as proof that the roles were reached would raise
it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS (OMP and OPS the same; their
  names in brackets). In it nobody holds the role "Editorial Board
  Member". `rvaca` is the Journal manager [Press manager, Preprint Server
  manager].
- The dataset allows no journal bulk email, so step 1 turns it on.

Steps:

1. Sign in as `admin`. Open Administration › "Site Settings" › "Site
   Setup" › "Bulk Emails", tick "Journal of Public Knowledge" ["Public
   Knowledge Press", "Public Knowledge Preprint Server"] and press
   "Save". Sign out.
2. Sign in as `rvaca` and open Settings › Users & Roles › "Notify"
   (`/index.php/publicknowledge/en/management/settings/access#notify`).
3. Tick "Editorial Board Member" and leave "Copy" unticked. Type "Board
   meeting" in "Subject" and "The board meets on Friday." in "Email".
4. Press "Save". The window "Send Email" reads "You are about to send an
   email to 0 users. Are you sure you want to send this email?". Press
   "Send Email".
5. Open Settings › Users & Roles › "Notify" again. Tick "Editorial Board
   Member" and "Copy" ("Send a copy of this email to me at
   rvaca@mailinator.com."), type the same "Subject" and "Email", press
   "Save" (the window again reads "…to 0 users…") and "Send Email".
6. Let the queued jobs run (on page requests when the install's job
   runner is on, or with `php lib/pkp/tools/jobs.php run`), then count
   the emails "Board meeting" in the install's mail catcher or mail log.

**Expected** Steps 4 and 5: the send is refused with a message under
"Roles" saying that nobody holds the ticked roles, and nothing is
queued. Step 6: no email.

**Observed** Step 4: the window closes, "Saved" shows beside "Save" for
about five seconds, the form stays as typed, and no "queued" line
appears. The send answers:

```
POST /index.php/publicknowledge/api/v1/_email   200
{"totalBulkJobs":0}
```

Step 5: the form gives way to "Emails are successfully queued to be sent
at the earliest convenience." with "Send another email" (200,
`{"totalBulkJobs":1}`). Step 6: one email, to `rvaca@mailinator.com`.

## Cause

`PKPEmailController::create()` (pkp-lib,
`api/v1/_email/PKPEmailController.php`) checks the subject, the body and
that at least one allowed role is ticked, then collects the recipients
and queues them in batches of 50:

```php
$userIds = Repo::user()->getCollector()
    ->filterByContextIds([$contextId])
    ->filterByUserGroupIds($params['userGroupIds'])
    ->getIds()
    ->toArray();

if (!empty($params['copy'])) { /* adds the sender */ }

$batches = array_chunk($userIds, Mailer::BULK_EMAIL_SIZE_LIMIT);
...
Bus::batch($jobs)->dispatch();

return response()->json(['totalBulkJobs' => count($batches)], Response::HTTP_OK);
```

Nothing checks that the roles reached anyone. With no recipient
`array_chunk()` gives no batch, an empty job batch is dispatched (a
`job_batches` row with `total_jobs` 0), and the send answers 200 with
`totalBulkJobs: 0`.

The page takes that 200 as a success. `Form.vue::success()` emits
`form-success` and stamps `lastSaveTimestamp`, from which `FormPage.vue`
shows "Saved" for five seconds. `AccessPage.vue` copies `totalBulkJobs`
from `form-success`, and `access.tpl` replaces the form with the
"queued" line only while it is above zero (`<div
v-if="totalBulkJobs">`), so the form stays. With "Copy" ticked the
sender is added after the collection, the list holds one id, and the
"queued" line shows.

In 3.3 the page showed a progress line keyed on a queue id that the
send always returns, so a send to nobody read "Email was successfully
sent to all recipients.". Issue `pkp/pkp-lib#8734` moved the sends to
batched jobs in March 2023 (PRs `pkp/pkp-lib#8827` and
`pkp/ui-library#270`). Its page change shows the "queued" line only
while `totalBulkJobs` is above zero, which turned the false "sent" into
the silent "Saved".

Reach:

- A role whose members are all disabled, whose assignments have all
  ended, or whose assignments all start later collects no recipient
  either (code: the user `Collector`, with its default active status,
  leaves out disabled accounts and assignments outside their start and
  end dates).
- A role nobody holds ticked beside a role with members is unaffected,
  since the list is not empty (walked, with the fix in and out).
- The other bulk senders, the announcement email and the monthly
  statistics report, are not user-addressed sends with a recipient count
  the user confirms, so reaching nobody is no fault there (code).

## Proposed fix

Refuse the send in `PKPEmailController::create()` when the ticked roles
reach nobody, as the same method already refuses a missing role, with a
field error under "Roles"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/fix.diff)):

```diff
             ->getIds()
             ->toArray();
 
+        if (empty($userIds)) {
+            return response()->json([
+                'userGroupIds' => [__('api.emails.400.noRecipients')],
+            ], Response::HTTP_BAD_REQUEST);
+        }
+
         if (!empty($params['copy'])) {
```

with the new string in `locale/en/api.po`:

```
msgid "api.emails.400.noRecipients"
msgstr "No active user holds the selected roles, so this email would reach no one."
```

The check sits before the sender's copy is added, so a copy of an email
that reaches no one is refused too. The server owns the recipient list,
so the check covers every client of the endpoint. The form shows the
400 like the missing-role refusal: the notice "The form was not saved
because 1 error(s) were encountered. …" at the top right, the message
under "Roles", and "Please correct one error." beside a greyed "Save"
until "Roles" changes.

Tried on `main` on all three apps: steps 4 and 5 show exactly that, and
step 6 finds no email. "Author" and "Editorial Board Member" ticked
together still show the "queued" line and reach every Author, with the
fix in and out.

**Alternatives**

- Checking in the browser before the window opens, from the per-role
  counts the page holds: those counts date from the page's load and are
  summed per role, so the server's list is the only reliable test, and
  other clients would stay unguarded.
- Keeping the 200 and showing "No one holds the selected roles" in place
  of the "queued" line: the request still succeeds for a send that did
  nothing, and the page needs a second success state.
- Placing the check after the copy is added, which keeps copy-only
  sends: the manager then still gets "queued" for an email no role
  member receives.

**What goes with it**

- Overlap: the fix proposed in
  [Notify users: the "Send Email" window counts a person once per ticked role and leaves out the copy](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A3-notify-total-counts-person-per-role.md)
  moves the recipient query of `create()` into a `getRecipientIds()`
  method; this check then follows that call. The fix proposed in
  [Users & Roles › "Notify": no field is marked required, and an empty form asks to email "0 users"](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U55-A2-notify-required-fields-unchecked.md)
  touches `NotifyUsersForm.vue` only. The diffs need merging, not
  choosing between.
- The UI's internal `_email` endpoint answers 400 for this case where it
  answered 200; no stored data changes.
- Backport: the diff applies to 3.5 as it stands. 3.4's Slim
  `PKPEmailHandler::create()` takes the same check with
  `$response->withJson(…, 400)`, and 3.3's before its `Queue::push()`
  loop, with the string in `locale/en_US/api.po`. 3.3's query also takes
  only active (not disabled) users, and 3.3 has no role start or end
  dates, so the message fits there unchanged.
- Guard: a pkp-lib API test posting to `_email` with a role nobody holds
  and expecting the 400, or a browser test taking the Steps.

Small: one check and one string in pkp-lib, following the method's own
400 pattern.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/walk.js),
  using the helpers of
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/notify-total-counts-person-per-role/lib.js)
  beside the script of the count report above.
  It takes the Steps on OJS, OMP and OPS on an install loaded from PKP's
  default test dataset, and is run from the pkp-e2e repo:
  `node bin/probe.js all shared/playwright/checks/issues/notify-send-to-nobody-accepted-silently/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5). `neighbour` as its
  argument runs the neighbouring case alone ("Author" and "Editorial
  Board Member" together).
- Fix trial: `node bin/try-fix.js apply …/fix.diff ojs omp ops`, the
  Steps and the neighbouring case, then `revert` and the neighbouring
  case again with the fix out.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, each on an
  install freshly loaded from pkp/datasets 1a5552c (2026-10-04),
  PostgreSQL; the fault does not depend on the database. No request
  failed and no page script failed on any walk.
- Branch tips:
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). The two files the fix touches are identical in all three.
  - stable-3_5_0: OJS c1cee76b95 (pkp-lib 771474347e); OMP 9c5e24246 and
    OPS 38b61882d3 (pkp-lib cf3f984335); ui-library d4e01883.
  - stable-3_4_0: OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe, ui-library ee684b34.
  - stable-3_3_0: OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161, pkp-lib
    ac3fa73402, ui-library 96959f9e.
- Code reads:
  - main and 3.5: `PKPEmailController::create()`, `user/Collector.php`
    (status and assignment dates), `access.tpl` (the `notify` tab),
    `AccessPage.vue`, `Form.vue::success()`, `FormPage.vue`
    (`hasRecentSave`, the five-second "Saved"), `NotifyUsersForm.vue`.
  - 3.4 (pkp-lib's and ui-library's `stable-3_4_0`, shared by the three
    apps): `PKPEmailHandler::create()` collects and batches the same way
    with no empty check and answers `totalBulkJobs`; `access.tpl` has
    `v-if="totalBulkJobs"`; `AccessPage.vue` and `Form.vue::success()`
    as on `main`.
  - 3.3 (`stable-3_3_0`; each app has `api/v1/_email`):
    `PKPEmailHandler::create()` takes `Services::get('user')->getIds()`
    with `status` `active` (`PKPUserQueryBuilder::filterByStatus()`,
    `u.disabled`), pushes one queue job per batch and always answers
    `{queueId, totalJobs}`; `AccessPage.vue` sets `queueId` and
    `totalJobs` (0), and `access.tpl` shows, under `v-if="queueId"`, the
    `v-else` of `completedJobs < totalJobs`:
    `manager.setup.notifyUsers.sent`, "Email was successfully sent to all
    recipients.". Not driven.
- Introduced: `git blame` on the lines the Cause shows gives e3f570bc37
  (2021-04-20, PSR-12 formatting), 858b24f31f (`pkp/pkp-lib#8092`,
  2022-08-18, the collector syntax), b955992f65 and
  59f33cb8d9 (2023-03-20 and 22, both "pkp/pkp-lib#8734 …", merged in PR
  `pkp/pkp-lib#8827` per GitHub's `commits/<sha>/pulls`), and 71e79e31e3
  (2023-10-13, the Laravel router). None of them added or removed an
  empty check. The method as first written in
  [891eba2020](https://github.com/pkp/pkp-lib/commit/891eba202036ec9d41ff8896949330918c0a4565)
  (`commits/<sha>/pulls`: `pkp/pkp-lib#6374`) already queued with no
  check for an empty list. The page's switch to `totalBulkJobs` is
  ui-library
  [c02347e8](https://github.com/pkp/ui-library/commit/c02347e82c8015f09961b7283f99e269afd92e7a)
  ("pkp/pkp-lib#8734 …", PR `pkp/ui-library#270`).
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp and pkp/ops
  searched for bulk email with no users, zero or no recipients, nothing
  sent or silently, notify users with an empty role or no members, "send
  an email to 0 users", `totalBulkJobs`, `PKPEmailController` and
  "notifyUsers queued". `pkp/pkp-lib#12548` (the per-role count) and
  `pkp/pkp-lib#13184` (closed, the count of active members) are about
  the window's number, not about a send that reaches nobody.
- Unverified: the disabled, ended and not-yet-started cases of Reach
  were read in the code, not driven.
