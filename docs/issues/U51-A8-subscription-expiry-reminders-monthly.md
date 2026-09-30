# Subscription expiry reminders run once a month, so most subscribers never get one

- **Severity** high
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/ojs#5029` (3.5) and `pkp/ojs#5051` (main) for `pkp/pkp-lib#11683` · [5185b53553](https://github.com/pkp/ojs/commit/5185b53553e8e04b2a21df4dad6e971f81b8da48) (2025-07-29) and [b795decf26](https://github.com/pkp/ojs/commit/b795decf26cecc39b7b54aa0cf2ed916dd3dd201) (2025-08-13) · Touhidur Rahman (touhidurabir); 3.5.0-0 and 3.5.0-1 ran the task daily. On 3.4 and 3.3 the monthly schedule dates from [02cf6157b9](https://github.com/pkp/ojs/commit/02cf6157b9eb815512a51a6984f80bfc8661d744) (2020-01-30, Alec Smecher, asmecher, for `pkp/pkp-lib#5460`)
- **Upstream** `pkp/pkp-lib#9143` (open), reported on OJS 3.3
- **Tracked in** spec U51 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a8)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

"Subscription Expiry Reminders" promise an email a set number of months
or weeks before and after each subscription's end. The task that sends
them is scheduled for the first day of each month only. Each run matches
one end date per reminder period: the run's own day, moved by the
months or weeks chosen.

So with "1 Months" before expiry, only subscriptions ending on the 1st
of a month, or on one of the few month-end days the task adds on the
1st, get the notice. Every other subscriber gets none, loses access
without warning and misses the prompt to renew, and nobody is told.

On 3.3 this is what journals live with today. On the later versions the
task currently stops with an error before it sends anything
("Subscribers get no expiry reminders: the reminder task stops with an
error on every run"); once that is fixed, this decides who gets a
notice.

## Impact

- **Lost.** The expiry notices of about 29 subscribers in 30, for each
  of the four reminder periods: readers are cut off without warning,
  and renewals the notices would have prompted are missed. Nobody is
  told which notices were skipped.
- **Who.** Subscribers of every journal that requires subscriptions and
  has set expiry reminders, every month.
- **Way round.** Only by hand: a manager searches the subscription lists
  by end date and writes to each subscriber. On `main` and 3.5 a site
  administrator could also run the task by name from a daily cron line,
  once the task no longer fails; nothing prompts anyone to.

High: for every journal that uses them, the expiry notices silently
reach about one subscriber in thirty.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  needs to be set up on screen.
- You have a shell in the OJS directory.

1. List the site's scheduled tasks:
   `php lib/pkp/tools/scheduler.php list`.

**Expected:** `APP\tasks\SubscriptionExpiryReminder` is scheduled every
day (`0 0 * * *`), since each run matches only the end dates one period
away from that day (Cause).

**Observed:** it is scheduled for 00:00 on the first of the month,
beside the daily tasks (the list, shortened):

```
0 0 *  * *  PKP\task\ReviewReminder ............. Next Due: 3 hours from now
0 0 1  * *  PKP\task\EditorialReminders ......... Next Due: 3 hours from now
0 0 1  * *  APP\tasks\SubscriptionExpiryReminder  Next Due: 3 hours from now
0 0 *  * *  APP\tasks\OpenAccessNotification .... Next Due: 3 hours from now
```

What a run matches: with the other report's fix in place so that the
task runs, a journal set to "1 Months" with one subscription ending
2026-10-30 and another ending 2026-10-29 was run by hand on 2026-09-30.
Only the first subscriber received "Notice of Subscription Expiry"; the
second's notice could only come from a run on 29 September. The next
scheduled run, on 1 October, matches end dates of 1 November and, since
September has 30 days, 31 October.

## Cause

`APP\scheduler\Scheduler::registerSchedules()` (OJS
`classes/scheduler/Scheduler.php` line 58) schedules
`SubscriptionExpiryReminder` with `->monthlyOn(1)`, 00:00 on the first
of each month.

The task was written for a daily run. `sendJournalReminders()` turns
the run's date into one end date per reminder period (the run's day
plus or minus the months or weeks) and sends to the active
subscriptions that end on exactly that day (`getByDateEnd()`, which
compares year, month and day).

`executeActions()` fills the gaps a daily run would leave. On the first
of a month that follows a shorter month, it also runs the match as if
the day were the 31st of the month just ended; on 1 March, also as if
it were 29 and 30 February. Run monthly, the task matches the 1st of
the target month and those added days, and nothing else.

On 3.5 and `main` the task first ran on Laravel's scheduler with
`daily()` (b591b8d987, `pkp/pkp-lib#9678`, 2024), as 3.5.0-0 and
3.5.0-1 shipped it. `pkp/pkp-lib#11683` ("fix schedule task frequency",
raised because the monthly statistics report arrived every day) then
moved several tasks back to the frequencies of the old
`registry/scheduledTasks.xml`, this one from `daily()` to
`monthlyOn(1)`: 5185b53553 on 3.5 (in 3.5.0-2) and b795decf26 on
`main`.

That XML entry, `<frequency day="1"/>`, came with 02cf6157b9 (2020,
`pkp/pkp-lib#5460`), which re-enabled the task; its first entry (2006)
ran it daily (`<frequency hour="0"/>`). `pkp/pkp-lib#5460` describes the
reminders as "only sent out on the single day on which they are
intended to go", which only a daily run delivers.

Reach:

- Every reminder period, before and after expiry, in months and weeks:
  each is matched to one day per run (read in the code; "1 Months"
  walked).
- 3.4 and 3.3: the XML entry, read by `ScheduledTaskHelper::checkFrequency()`
  (lib/pkp), runs the task on the first of the month, or at the next
  run when the last one is over a month old (read in the code).
- A separate fault, left out here: the date arithmetic in
  `sendJournalReminders()` assumes 31-day months and computes December
  as month 0 (the method's arithmetic run in PHP, not walked):
  - "1 Months" on any day of November looks for month 0 of the next
    year (`2027-0-15`), so December end dates never get it;
  - "1 Weeks" looks for month 0 all through December;
  - after a 30-day month it is a day off (25 September gives
    `2026-10-1`);
  - on some days it looks for day 0 (24 October gives `2026-11-0`).

## Proposed fix

A proposal, tried on `main` as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-expiry-reminders-monthly/fix.diff)
together with the other report's fix: the list then shows
`0 0 * * *  APP\tasks\SubscriptionExpiryReminder`, and
`PKP\task\EditorialReminders` stays on `0 0 1 * *`.

Recommended: schedule the task daily, in
`APP\scheduler\Scheduler::registerSchedules()`.

```php
->call(fn () => (new SubscriptionExpiryReminder())->execute())
->daily()
->name(SubscriptionExpiryReminder::class)
```

Why here: the schedule is the one thing that does not fit the task's
design; the one-day matching and the added month-end days both assume a
daily run. It is the schedule `pkp/pkp-lib#11683` gave
`OpenAccessNotification`, which also matches one day per run (an
issue's open-access date). It keeps that change's intent, to stop tasks
from running more often than they should: each daily run matches a
different end date, so no subscriber gets a notice twice.
`EditorialReminders` and `StatisticsReport`, monthly by design, keep
`monthlyOn(1)`.

**Alternatives:**

- Keeping the monthly run and matching every end date in the month
  ahead: it sends each notice up to a month early or late, which the
  "Weeks" periods cannot allow.
- Recording the last run and matching every end date since: correct
  for any schedule, but a new pattern and a stored value for one task.

**What goes with it:**

- The other report's fix: without it the daily run fails every day
  instead of once a month.
- The web task runner: with `[schedule] task_runner = On` a due task
  runs only if a page request arrives in its minute, so a `daily()`
  task runs only on days with a request at 00:00. "Every day" holds
  where cron runs `scheduler.php run` every minute. This applies to all
  daily tasks and is not changed here.
- A fault the fix exposes, not fixes: `executeActions()` decides whether
  to add 29 February with `date('L', mktime(0, 0, 0, 0, 0, $year))`,
  which tests 30 November of the previous year. Run daily, 1 March 2028
  adds 29 February after its real run (a second notice for end dates
  of 29 March), and 1 March 2029 leaves it out (no notice for them).
  The check should test the current year.
- The date arithmetic above: worth fixing with it, by computing each
  target date with Carbon (`addMonthsNoOverflow()`, `addWeeks()`,
  `subWeeks()`, `subMonthsNoOverflow()`) and keeping the month-end
  additions; a separate change with its own test.
- No data repair. Subscriptions already past their notice day do not
  get one; nothing sends a backlog.
- Backport: the line applies as it stands to 3.5. On 3.4 and 3.3 the
  same change is `<frequency hour="0"/>` in `registry/scheduledTasks.xml`,
  as the entry of 2006 had it.
- Guard: a test that the task is scheduled `0 0 * * *`, in the shape of
  lib/pkp `tests/classes/scheduledTask/SchedulerTest.php` (OJS has no
  scheduler test yet), and the e2e scenario in U51 (a Planned item)
  that sets reminders and runs the task for subscriptions ending on
  several days.

Small: the whole change is the schedule line, and its test follows an
existing scheduler test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/walk.js).
  The Steps, on an install loaded from PKP's default test dataset:
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js ojs shared/playwright/checks/issues/subscription-expiry-reminder-task-fails/walk.js schedule`.
  The run described under Observed (the journal switched to
  subscriptions, "1 Months" set and the two subscriptions created
  through the screens, then the task run by hand and both mailboxes
  read), with the other report's fix applied: the same command with
  `a8` in place of `schedule`.
- The fix, tried 2026-09-30 on `main`: the other report's fix.diff and
  this one applied together as one diff with `node bin/try-fix.js apply
  <diff> ojs`, the run with two subscriptions walked (the list read
  `0 0 * * *`, the mail was the same), then `node bin/try-fix.js revert
  ojs`. The same list without the fix read `0 0 1 * *`.
- Walked 2026-09-30 on PostgreSQL, OJS only (OMP and OPS have no
  subscriptions), each install freshly loaded from pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30), `ojs/main/pgsql` and `ojs/stable-3_5_0/pgsql`, no
  upgrade needed:
  - main: OJS bade233f73 (lib/pkp 2e377d27fc): the Steps, and the run
    with two subscriptions (with the other report's fix).
  - stable-3_5_0: OJS 92b9a16b48 (lib/pkp a9c76aed62): the Steps (the
    same line, `Next Run: Oct 1, 2026 00:00`), and the run with two
    subscriptions (with the other report's fix), the same mail.
  - Nothing here depends on the database.
- 3.5 releases: the tags `3_5_0-0` and `3_5_0-1` schedule the task
  `daily()`, `3_5_0-2` onward `monthlyOn(1)`.
- 3.4, by code: OJS `stable-3_4_0` at 9571d8fde7,
  `registry/scheduledTasks.xml` (`<frequency day="1"/>`) and
  `classes/tasks/SubscriptionExpiryReminder.php` (the same matching);
  lib/pkp `stable-3_4_0` at df13621c2d,
  `ScheduledTaskHelper::checkFrequency()` and `_isInRange()`.
- 3.3, by code: OJS `stable-3_3_0` at 9fdb9bcf9a, the same XML entry
  and `SubscriptionExpiryReminder.inc.php`; lib/pkp `stable-3_3_0` at
  d446601ebe, `ScheduledTaskHelper.inc.php` (the same day rule since
  `pkp/pkp-lib#5362`, 2020).
- Introduced: `git blame` on the `monthlyOn(1)` line gives b795decf26
  on `main` and 5185b53553 on `stable-3_5_0`; each replaces `daily()`.
  `git log -S` on the XML entry on `main` gives 242cab0d2d (2006,
  `hour="0"`), 12468cc643 (2016, entry removed, `pkp/pkp-lib#1838`),
  02cf6157b9 (2020, `day="1"`; the same change as 12ebfe19e3, which is
  on `stable-3_1_2` only) and a0445df045 (2024, `pkp/pkp-lib#9678`, the
  XML file removed).
- Upstream: `pkp/pkp-lib#9143` asks to run the task daily (OJS 3.3.0.15,
  no reply); `pkp/ojs#2578` (2020, merged) corrected the task's list of
  short months.
- Not walked: a run on the first of the month, the "Weeks" and "after
  expiry" periods, the leap-year check (read in the code, its date run
  in PHP) and the date arithmetic, which was run as PHP outside the app.
