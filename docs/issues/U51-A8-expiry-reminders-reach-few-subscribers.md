# Most subscribers get no expiry reminder: the reminder task runs once a month and matches one end date

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** the monthly schedule:
  [02cf6157b9](https://github.com/pkp/ojs/commit/02cf6157b9eb815512a51a6984f80bfc8661d744)
  for `pkp/pkp-lib#5460` · 2020-01-30 · Alec Smecher (asmecher), no PR;
  restored on 3.5 and main by `pkp/ojs#5051` for `pkp/pkp-lib#11683` ·
  [b795decf26](https://github.com/pkp/ojs/commit/b795decf26cecc39b7b54aa0cf2ed916dd3dd201)
  · 2025-08-13 · Touhidur Rahman (touhidurabir), after 3.5's
  development had made it daily
- **Upstream** `pkp/pkp-lib#9143` (open), reported on 3.3, covering the
  monthly schedule; the date arithmetic below is not in it
- **Tracked in** spec U51 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a8)
- **Checked** 2026-10-01 and 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

"Subscription Expiry Reminders" promise each subscriber an email a set
number of months or weeks before and after their subscription ends. The
task that sends them runs once a month, on the 1st, and each run looks
only for subscriptions ending on one day: the 1st moved by the chosen
interval (1 November for "1 Months" before, 8 October for "1 Weeks"
before). A subscriber whose end date is not one of those days gets no
reminder: in 2027, 17 end dates out of 365 get the "1 Months" notice.

Even run daily, the task's date arithmetic never reaches end dates in
December for the reminders before expiry, nor the 31st of a month for
the weeks-before reminder.

This cannot be seen today: the task stops with an error before sending
anything ([Subscribers get no expiry reminders: the reminder task stops
with an error and sends nothing](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A27-expiry-reminder-task-stops-with-error.md)).
The two are best fixed together.

## Impact

- **Lost**: the expiry reminders of most subscribers, silently: all but
  the end dates one interval away from the 1st of a month.
- **Who**: subscribers of journals that require subscriptions and set
  any of the four reminders (months or weeks before, months or weeks
  after the end date).
- **Way round**: none on screen; the subscription contact can write to
  each subscriber by hand.

Medium: the subscriptions themselves stay correct and can be renewed;
what most subscribers lose is the advance notice.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`), "Journal
  of Public Knowledge".
- Steps 4 and 5 need the fix of the report linked in the Summary: the
  task stops before sending anything without it. Step 3 does not.

1. As `rvaca`, take steps 1 to 5 of that report: subscriptions required,
   the type "u51sb1 Online Year", "Subscription Policies" with the
   months-before reminder at "1 Months", and an "Active" subscription for
   `dbarnes` from today to the same day next month (a run day from the
   1st to the 28th, not in November).
2. Payments › "Individual Subscriptions" › "Create New Subscription":
   `dbuskins`, "u51sb1 Online Year", "Active", start date today, end
   date 14 days after dbarnes's; "Save".
3. In the OJS root, list the schedule:
   `php lib/pkp/tools/scheduler.php list`
4. Run the reminder task:
   `php lib/pkp/tools/scheduler.php test --name='APP\tasks\SubscriptionExpiryReminder'`
5. Open the mailboxes of dbarnes@mailinator.com and
   dbuskins@mailinator.com.

**Expected**: the task is scheduled every day (`0 0 * * *`), so each
subscriber gets "Notice of Subscription Expiry" one month before their
end date: dbarnes today, dbuskins 14 days from now.

**Observed**: the schedule reads

```
0 0 1 * *  APP\tasks\SubscriptionExpiryReminder ..... Next Due: 4 weeks from now
```

that is, 00:00 on the 1st of each month.

What the steps prove: step 3 shows the monthly schedule, and it is the
step that differs once fixed. Steps 4 and 5 run the task for today
whatever the schedule says, and show the matching rule: the run reaches
dbarnes, whose end date is exactly one month away, and not dbuskins.
That no later scheduled run reaches dbuskins (the 1 November run looks
for 1 December) is read in the code; the server's date cannot be moved
for today's task, which reads `date()`.

## Cause

`Scheduler::registerSchedules()`
([classes/scheduler/Scheduler.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/scheduler/Scheduler.php#L55-L60))
schedules `SubscriptionExpiryReminder` with `->monthlyOn(1)`. The task
is written for a daily run. `sendJournalReminders()`
([classes/tasks/SubscriptionExpiryReminder.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/tasks/SubscriptionExpiryReminder.php#L67-L236))
turns the run's date into one end date per reminder: today plus the
months before, plus the weeks before, minus the weeks after, minus the
months after. `getByDateEnd()` then matches subscriptions ending on
exactly that day. On the 1st after a short month, `executeActions()`
also runs as if it were the 31st, 30 February or 29 February, the days a
daily run cannot have; only a daily run needs that.

The task ran daily when it was written (registry `hour="0"`, 2006). It
was dropped from the registry in 2016 and came back in 02cf6157b9 with
`<frequency day="1"/>`, which the old scheduler ran on the 1st of each
month. 3.5's Laravel scheduler first gave it `daily()`; b795decf26, which
dealt with the statistics report being sent every day, copied the old
registry's frequencies and set `monthlyOn(1)` for this task too.

The date arithmetic, written by hand on month and day numbers, has three
more holes, which a daily run would still meet:

- Months and weeks before, December: `$expiryMonth = (int)fmod($curMonth + $beforeMonths, 12)`
  gives 0 for December, and the year is moved on by one, so the run
  looks for "2027-0-1" instead of 1 December 2026. No subscription
  ending in December gets a "Notice of Subscription Expiry".
- Weeks before, the 31st: `$expiryDay = (int)fmod($curDay + $beforeDays, 31)`
  is never 31, so subscriptions ending on 31 January, March, May, July,
  August and October never get the weeks-before notice.
- The leap-year test of the 29 February block,
  `date('L', mktime(0, 0, 0, 0, 0, $curDate['year']))`, reads 30
  November of the year before: in a leap year a daily run would reach 29
  March twice, and in the year after one not at all.

Simulated over 2027 with today's arithmetic, a daily run reaches 334 of
365 end dates for "1 Months" before and 328 for "1 Weeks" before; the
monthly run reaches 17 for each.

Reach:

- All four reminders, individual and institutional subscriptions alike
  (code).
- On the shipped configuration (`task_runner = On`) the scheduler runs
  inside web requests and a task runs only if a request arrives in the
  minute it is due, `pkp/pkp-lib#13041`. A daily schedule does not cure
  that: each day without a request at 00:00 still loses that day's
  reminders (code).

## Proposed fix

Run the task daily, and compute the end dates with real date
arithmetic, so that each end date is reached on exactly one day:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/fix.diff).

- `Scheduler.php`: `->daily()` for `SubscriptionExpiryReminder`.
- `SubscriptionExpiryReminder.php`: a new `getDueEndDates()` gives the
  end dates due on a day. Weeks are exact (`addWeeks()`, `subWeeks()`).
  Months use `addMonthsNoOverflow()` and take a range, so that end dates
  a shorter month lacks are not lost: on 30 September, "1 Months" before
  reaches 30 and 31 October; on 30 January it reaches nothing, and 31
  January reaches 28 February.
- `sendJournalReminders()` loops over the four reminders and their due
  dates and calls the existing `getByDateEnd()` for each; the simulated
  days in `executeActions()` go, and the day comes from `Carbon::today()`.

```php
$shift = fn (Carbon $date) => $before ? $date->copy()->addMonthsNoOverflow($count) : $date->copy()->subMonthsNoOverflow($count);
$from = $before ? $shift($day) : $shift($day->copy()->subDay())->addDay();
$to = $before ? $shift($day->copy()->addDay())->subDay() : $shift($day);
```

The schedule is part of the fix because the matching is built for one
run a day, as `ReviewReminder` and the open-access email are scheduled.
`pkp/pkp-lib#11683` wanted the statistics report monthly, and it stays
so: `EditorialReminders` and `StatisticsReport` keep `monthlyOn(1)`.
The DAOs and their `getByDateEnd()` signature stay as they are.

Tried on OJS `main` with the fix of the report linked in the Summary in
as well (`trial-with-a27.diff`, both diffs in one):
the schedule lists the task at `0 0 * * *`, with `EditorialReminders`
and `StatisticsReport` still at `0 0 1 * *`, and the Steps' run reaches
dbarnes alone, as it should on that day. Run as if it were other days
(`Carbon::setTestNow()`), with "1 Months" and "1 Weeks" before set: on
16 October dbuskins (ending 16 November) got his notice, on 24 October
a subscriber ending 31 October got the weeks notice, and on 1 November a
subscriber ending 1 December got hers; one email each.

Checked outside the app over 2025 to 2029: for 1, 2, 3, 6 and 12 months
and 1 to 4 weeks, before and after, every end date of 2027 and 2028 is
reached exactly once.

**Alternatives**:

- Only `->daily()`: one line, but December and the 31sts stay
  unreached for the reminders before expiry, and the leap-year block
  sends 29 March twice in leap years.
- Keep the monthly run and match a month of end dates per run: reminders
  would come up to a month early, against the "1 Months" the tab
  promises.

**What goes with it**:

- No stored data to repair; a reminder already missed is not sent
  afterwards.
- A unit test that sets the day with `Carbon::setTestNow()`, runs
  `sendJournalReminders()` for every day of a year and counts each end
  date once for each reminder, December and the 31sts included.
- 3.5: the diff applies as written. 3.4 and 3.3 schedule the task in
  `registry/scheduledTasks.xml` (`<frequency hour="0"/>` there), and
  their task files (`SubscriptionExpiryReminder.php` on 3.4, `.inc.php`
  on 3.3) take the same change, the leap-year block included; both
  ship Carbon with Laravel.

Medium: the task's date handling is rewritten in one file, beside the
schedule line, with a year-long test.

## Evidence

- Kept script, which takes the Steps (the steps of the linked report,
  the second subscription and the schedule list):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/walk.js);
  the run on moved days with the fix in:
  [seam.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/seam.js),
  which moves the day with
  [seam.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/seam.php)
  (`Carbon::setTestNow()`).
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/walk.js` (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/expiry-reminders-reach-few-subscribers/trial-with-a27.diff ojs`.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01).
  main, with the linked report's fix: as Observed, on 1 October. 3.5,
  without a fix: the schedule lists the task at `0 0 1 * *` and the run
  stops with the linked report's error; the one-day matching on 3.5 is
  read in the code, the same as main's.
- Code reads: on 3.5 the backport OJS ad6e903f96 sets `monthlyOn(1)`;
  on 3.4 and 3.3 `registry/scheduledTasks.xml` (`<frequency day="1"/>`)
  and lib/pkp's `ScheduledTaskHelper::checkFrequency()` / `_isInRange()`,
  which run a `day="1"` task on the 1st (or after a month without a run);
  the task files on all four, with the same arithmetic.
- The coverage counts come from today's arithmetic and from the fix's
  `getDueEndDates()` copied into stand-alone PHP scripts; they are not a
  run of the app.
- Not driven: a run of today's code on another day (it reads `date()`),
  the web-based task runner, MySQL.
