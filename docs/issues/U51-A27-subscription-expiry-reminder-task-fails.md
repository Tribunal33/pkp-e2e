# Subscribers get no expiry reminders: the reminder task stops with an error on every run

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the query read the institution's name from the subscription, with no request)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` · [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10) · 2022-03-16 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30); `pkp/pkp-lib#11740` fixed another fault in the same query (a misplaced comma), not this one
- **Tracked in** spec U51 [A27](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a27)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The scheduled task that sends the "Subscription Expiry Reminders" stops
with an error on the server as soon as one journal on the site requires
subscriptions and has any of its four reminder periods set on
"Subscription Policies". No reminder goes out, for that journal or any
other, in the monthly run or a run started by hand.

Readers lose access at the end of their subscription with no warning,
and the renewals the reminders were meant to prompt are missed. Nothing
on screen tells the journal. The only way round is by hand: finding the
expiring subscriptions and writing to each subscriber.

It happens with the site's scheduler run from cron, and with the
built-in web task runner on PostgreSQL. On MySQL, a web-runner run
started from a journal's page still sends the individual subscribers'
reminders. A journal needs no institutional subscription for it.

## Impact

- **Lost.** Every "Notice of Subscription Expiry", "Subscription
  Expired" and "Subscription Expired - Final Reminder" email, for every
  journal on the site. Readers are cut off without notice, and renewals
  the notices would have prompted are missed. Nobody is told.
- **Who.** Subscribers of every journal that requires subscriptions and
  has set expiry reminders, at every run of the task.
- **Way round.** Only by hand: a manager searches the "Individual
  Subscriptions" and "Institutional Subscriptions" lists by end date and
  writes to each subscriber, individual and institutional.

High: a secondary task fails for every journal that uses it, silently,
and readers lose access without the warning they were promised.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Its
  `publicknowledge` journal is open access and has no subscription
  types, subscriptions or subscription policies.
- `rvaca` is its Journal Manager; `ccorino` (Carlo Corino,
  ccorino@mailinator.com) is a reader.
- The install sends mail to a mail catcher, and you have a shell in the
  OJS directory.
- The failure needs only steps 2 and 5; steps 4 and 6 are there for the
  Expected mail. The dates below are for a walk on 2026-09-30 (UTC, the
  install's time zone). On another day, make the end date one calendar
  month from today, on a day that exists next month; the task's own date
  arithmetic misses end dates in December and on days a month lacks (a
  separate fault).

1. Sign in as `rvaca`.
2. Open Settings › Distribution › "Access", select "The journal will
   require subscriptions to access some or all of its contents." and
   press "Save".
3. Open the "Payments" page by its address,
   `/index.php/publicknowledge/en/payments` (the side menu offers
   "Payments" only while payments are enabled, which the dataset does
   not do).
4. On "Subscription Types" press "Create New Subscription Type". Type
   "u51w1 Online" in "Name of Type", choose US Dollar in "Currency",
   type 40 in "Cost", choose "Online" in "Format", type 12 in
   "Duration", select "Individual" and press "Save".
5. On "Subscription Policies" type "u51w1 Subscriptions Desk" in
   "Name", "u51w1desk@mailinator.com" in "Email" and "1 Main Street" in
   "Mailing Address". Under "Subscription Expiry Reminders" set the
   first "Notify subscribers by email before subscription expiry." list
   to "1 Months", and press "Save".
6. On "Individual Subscriptions" press "Create New Subscription". Search
   for `ccorino` in "Locate a User" and choose Carlo Corino; choose
   "u51w1 Online" in "Subscription type" and "Active" in "Status"; type
   2025-10-30 in "Start date" and 2026-10-30 in "End date"; press
   "Save".
7. In the OJS directory, run the reminder task the way the site's
   scheduler runs it:
   `php lib/pkp/tools/scheduler.php test --name='APP\tasks\SubscriptionExpiryReminder'`.
   The cron entry, `php lib/pkp/tools/scheduler.php run`, starts the
   same task at 00:00 on the first of each month; `test` starts it now.
8. Read ccorino@mailinator.com's mailbox.

**Expected:** the command reports the task `DONE`, and Carlo Corino
receives "Notice of Subscription Expiry" from "u51w1 Subscriptions
Desk" <u51w1desk@mailinator.com>, since his subscription ends a month
from today and "1 Months" is set.

**Observed:** steps 2 to 6 save, and the list shows "Carlo Corino
ccorino@mailinator.com u51w1 Online Active 2025-10-30 2026-10-30". The
command in step 7 fails with exit code 255:

```
Running [APP\tasks\SubscriptionExpiryReminder] ....... FAIL
PHP Fatal error:  Uncaught Error: Call to a member function getPrimaryLocale() on null in classes/subscription/InstitutionalSubscriptionDAO.php:672
#0 classes/subscription/InstitutionalSubscriptionDAO.php(596): APP\subscription\InstitutionalSubscriptionDAO->getInstitutionNameFetchParameters()
#1 classes/tasks/SubscriptionExpiryReminder.php(99): APP\subscription\InstitutionalSubscriptionDAO->getByDateEnd(Array, 1)
#2 classes/tasks/SubscriptionExpiryReminder.php(251): APP\tasks\SubscriptionExpiryReminder->sendJournalReminders(Object(APP\journal\Journal), Array)
```

No mail reaches ccorino. The task's log in `scheduledTaskLogs/` under
the files directory holds only "Task process started.".

With all four reminder periods left "Disabled" (step 5 without "1
Months"), the same run finishes `DONE` and sends nothing, as it should.

## Cause

`InstitutionalSubscriptionDAO::getByDateEnd()` (OJS
`classes/subscription/InstitutionalSubscriptionDAO.php`, from line 592)
is the query the reminder task runs for each reminder period that is
set, whether or not any subscription matches. Its `$params` line (596)
has two faults, and each stops the task.

First, it takes the institution-name parameters from
`getInstitutionNameFetchParameters()` (line 668), which reads the
journal from the request (`Application::get()->getRequest()->getContext()`)
to get its primary locale. A scheduled task has no request journal, so
`$journal` is null and `getPrimaryLocale()` throws. The method is
handed `$journalId` but does not pass it on.

Second, it binds the parameters in the wrong order. The two
`LEFT JOIN institution_settings` clauses, whose four placeholders come
first in the SQL, get the year, month, day and journal ID; the four
`WHERE` placeholders get `'name'`, the locale, `'name'` and the primary
locale. On PostgreSQL the query then fails
(`invalid input syntax for type numeric: "name"`, the same statement
run in `psql` with those values). So a request journal alone would not
save the task on PostgreSQL.

Both came with 11f902f20f (`pkp/pkp-lib#6782`, "Introduce Institutions
(and integrate with subscriptions)"), which moved the institution's
name from the subscription row into `institution_settings` and added
the two joins. Before it, the query took no request state and bound
its four values in order.

Reach:

- One journal stops the run for all. `executeActions()` loops over the
  site's enabled journals, and the error ends the task at the first
  journal that requires subscriptions and has a reminder period set.
  Journals before it in the list have nothing to send (any of them with
  a period set would have failed first); journals after it are never
  reached, and each would fail the same way (walked for one journal,
  the loop read in the code).
- Cron, `php lib/pkp/tools/scheduler.php run`: the command runs with no
  request journal, so the first fault fails every run. The scheduler
  logs the error and goes on with its other tasks (Laravel's
  `ScheduleRunCommand::runEvent()`); `test` stops with it (walked).
- The web task runner (`[schedule] task_runner = On`, the default)
  starts due tasks at the end of a page request, and this task is due
  only in the minute 00:00 on the first of the month. If the request in
  that minute is a site-level page, the first fault fails it the same
  way. If it is a journal page, the task gets past the first fault and
  fails on the second on PostgreSQL. On MySQL the second fault only
  makes the institutional query match nothing, so individual reminders
  do go out in that one case, and institutional ones do not (read in
  the code; MySQL not checked). No other way of running the task sends
  any reminder.
- `InstitutionalSubscriptionDAO::getAll()` also calls
  `getInstitutionNameFetchParameters()` without a journal, and its
  `SELECT` lacks the comma before the name column. Nothing in OJS calls
  it (read in the code).
- `getByJournalId()`, which feeds the Payments page's lists, reads the
  request journal too, but runs only in a journal request (read in the
  code).
- No stored data is wrong: the task writes nothing before it stops, so
  nothing needs repair.

## Proposed fix

A proposal, tried on `main` and 3.5 as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/fix.diff):
with it the Steps' run finishes `DONE` and Carlo Corino receives "Notice
of Subscription Expiry" from the Subscriptions Desk. Two checks show it
reaches no further: a second subscription ending a day earlier still
gets nothing from that run, so the fix does not widen the date match;
and with all four periods "Disabled" the task still sends nothing.

Recommended: in `InstitutionalSubscriptionDAO`, let
`getInstitutionNameFetchParameters()` take the journal ID, and have
`getByDateEnd()` pass it and put the name parameters first.

```php
// getByDateEnd()
$params = array_merge(
    $this->getInstitutionNameFetchParameters((int) $journalId),
    [$dateEnd[0], $dateEnd[1], $dateEnd[2], (int) $journalId]
);

// getInstitutionNameFetchParameters(?int $journalId = null)
$journal = $journalId
    ? Application::getContextDAO()->getById($journalId)
    : Application::get()->getRequest()->getContext();
$primaryLocale = $journal?->getPrimaryLocale() ?? $locale;
```

Why here: the DAO is handed the journal and should not depend on the
request, and this is the only place both faults live. Loading a context
by ID with `Application::getContextDAO()->getById()` is what the
scheduled tasks do elsewhere (lib/pkp `ReviewReminder`). The fix keeps
the intent of `pkp/pkp-lib#6782`: the institution's name in the current
locale, with the journal's primary locale as the fallback. The new
parameter is optional, so callers that pass nothing, plugins included,
behave as before.

**Alternatives:**

- Setting a request journal in the task before each journal's run: it
  hides the dependency and leaves the parameter order wrong.
- Rewriting `getByDateEnd()` with the query builder, as `getByJournalId()`
  is: it orders the bindings by itself, but it is a larger change for the
  same result.

**What goes with it:**

- `getAll()`: pass nothing (it spans all journals, so the fallback is
  the current locale) and add the missing comma, or remove the method,
  which nothing calls.
- Backport: the diff applies as it stands to 3.5 (tried). On 3.4 apply
  the comma fix of `pkp/pkp-lib#11740` (9f3f9a8589) first, which 3.4
  never received, then this diff (both checked with `git apply` on
  `stable-3_4_0`).
- Guard: OJS has no test of a scheduled task or a subscription DAO, so
  this is a new kind of test there: one built on lib/pkp's
  `DatabaseTestCase` (as lib/pkp's `FilterDAOTest` is) that runs
  `SubscriptionExpiryReminder` with no request journal, on a journal
  with a period set and one subscription ending on the matching day;
  and the e2e scenario in U51 (a Planned item).

Small: the two faults sit in one method and its helper, and the fix
reuses the context lookup the other tasks already make.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset, then runs the task and reads
  the mailbox:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/walk.js),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/walk.js`.
  With `disabled` as its last argument it takes the Steps with all four
  periods "Disabled"; with `a8` it adds a second subscription, for
  Catherine Kwantes, ending 2026-10-29.
- The fix, tried 2026-09-30:
  `node bin/try-fix.js apply shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/fix.diff ojs`,
  then walk.js as above, with a second subscription and with the
  periods "Disabled", then `node bin/try-fix.js revert ojs`. The
  "Disabled" walk showed the same with the fix out. On the 3.5 checkout
  the same diff applied, and the walk with a second subscription mailed
  Carlo Corino only.
- Walked 2026-09-30 on PostgreSQL, OJS only (OMP and OPS have no
  subscriptions), each install freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc);
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62): the same fatal
    error at the same lines.
  - MySQL not checked.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7:
  `InstitutionalSubscriptionDAO::getByDateEnd()` and
  `getInstitutionNameFetchParameters()` as on `main`, with the misplaced
  comma of `pkp/pkp-lib#11740` still in the `SELECT`;
  `SubscriptionExpiryReminder` calls it for each period as on `main`.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a,
  `InstitutionalSubscriptionDAO::getByDateEnd()`.
- Introduced: `git blame` on lines 596 and 671 of the DAO on `main` gives
  11f902f20f (the name joins, the parameter order and the request
  lookup), 60d0213b7c (`pkp/pkp-lib#8845`, a `$` added to `dateEnd[2]`)
  and 9f3f9a8589 (`pkp/pkp-lib#11740`, the comma, 3.5.0-2).
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library by the symptom and by the class and method names.
  `pkp/pkp-lib#9143` (the task's monthly schedule) is another fault.
- Not driven: an institutional subscription's reminder, and the
  web task runner at 00:00 on the first of the month.
