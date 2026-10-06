# Readers get the "Free to read" email twice for an issue opening on 1 March, May, July, October or December

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; the open-access email is not scheduled)
- **Introduced** [b33af3e5a5](https://github.com/pkp/ojs/commit/b33af3e5a54e81369fd3641e1297bf21d58e7bf6)
  · 2006-04-18 · michaelf (the commit's author; no PR), the first
  version of the open-access email
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a29)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal that requires subscriptions and has the open-access email
turned on, every user who keeps "An issue has been made open access." on
should get one "Free to read: {issue} of {journal} is now open access"
email on the day an issue's "Open access date" comes. When that day is 1
May, 1 July, 1 October or 1 December, each of them gets the same email
twice; on 1 March this happens in every year but the one after a leap
year.

On 1 March the daily open-access email also goes out for issues opening
on 2 or 3 March, a day or two early, and again on their day. A reader
who follows it finds the issue still restricted. In a leap year an issue
opening on 29 February gets its email again on 1 March.

## Impact

- **Lost**: nothing; every notified user of the journal gets a second
  copy, and in March some get "is now open access" for an issue that is
  still restricted.
- **Who**: all users of a subscription journal with the open-access
  email turned on who have not turned it off, for issues opening on the
  days above.
- **Way round**: none on screen; an editor can choose another "Open
  access date".

Medium: the early March email tells the whole readership that an issue
is free while its articles still ask for a subscription; the duplicate
copies alone would be low.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`),
  "Journal of Public Knowledge".
- The open-access email reads the day from the server's clock, so the
  run must happen on 1 October (or 1 May, 1 July, 1 December; 1 March in
  a year that does not follow a leap year), in the install's time zone.
  On another day, run step 5 under a faked clock, for example with
  libfaketime: `faketime '2026-10-01 08:00:00' php lib/pkp/tools/scheduler.php …`.

1. Sign in as `rvaca` (Journal manager).
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
3. Payments › "Subscription Policies": fill "Name" (Ramiro Vaca),
   "Email" (rvaca@mailinator.com) and "Mailing Address"; tick
   "Registered readers will have the option of receiving the table of
   contents by email when an issue becomes open access."; "Save".
4. Issues › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Edit" › "Access":
   "Access Status" "Subscription"; type the day the task will run on into
   "Open access date" (`2026-10-01`); "Save".
5. In the OJS root, run the open-access email as the site's scheduler
   does:
   `php lib/pkp/tools/scheduler.php test --name='APP\tasks\OpenAccessNotification'`
6. Let the queued emails go: load any page of the site (the dataset's
   config runs jobs on web requests), or run
   `php lib/pkp/tools/jobs.php work --stop-when-empty`.
7. Open the mailboxes of dbarnes@mailinator.com and
   rvaca@mailinator.com.

**Expected**: one email each, "Free to read: Vol. 1 No. 2 (2014) of
Journal of Public Knowledge is now open access".

**Observed**: two identical emails each, about two seconds apart, both
with that subject.

The same holds for every one of the dataset's 19 accounts that are not
authors (about 38 emails in all); the author accounts have this email
turned off. The sender is the journal's contact (rvaca in the dataset),
not the "Subscription Policies" email of step 3. With "Open access date"
set to the day after, the same run sends nothing.

## Cause

`OpenAccessNotification::executeActions()`
([classes/tasks/OpenAccessNotification.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/tasks/OpenAccessNotification.php#L95-L158))
first calls `sendNotifications()` for today. It then calls it again for
days that do not exist:

- on 1 March, May, July, October and December, for the 31st of the
  month before (`$shortMonths = [2,4,6,9,11]`);
- on 1 March, also for 30 February and, depending on a leap-year test,
  29 February.

`sendNotifications()` matches an issue when
`strtotime($openAccessDate) == mktime(0, 0, 0, $curMonth, $curDay, $curYear)`.
PHP's `mktime()` rolls a day that does not exist over into the next
month: 31 September is 1 October, 31 April 1 May, 31 June 1 July, 31
November 1 December. 29, 30 and 31 February are 1, 2 and 3 March in a
common year, and 29 February, 1 and 2 March in a leap year. So the
extra day is today, a day just ahead, or (29 February in a leap year)
yesterday, and an issue opening on it is matched again.

Each match queues one `OpenAccessMailUsers` job per chunk of subscribed
users. The job creates an "An issue has been made open access."
notification for each user and then mails them, so a second match also
gives every user a second notification.

The extra days were copied from the expiry reminder task, which builds
its target date as text and compares its parts in SQL; there a simulated
31st reaches end dates its month arithmetic would otherwise skip. An
open access date is a real calendar date and this task runs daily
(`classes/scheduler/Scheduler.php`, `daily()`), so the extra runs can
only repeat a day or anticipate one.

The leap-year test reads the wrong year:
`date('L', mktime(0, 0, 0, 0, 0, $curDate['year']))` is 30 November of
the year before. That is why 1 March escapes the duplicate only in the
year after a leap year.

Reach:

- Every subscription journal of the site with the open-access email on;
  the task loops over all journals (code).
- The expiry reminder task carries the same block and leap-year test,
  but compares date parts in SQL, so it does not double up today (code).

## Proposed fix

Take the two blocks of extra days out of
`OpenAccessNotification::executeActions()`, so the task matches only
today: [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-access-email-sent-twice/fix.diff)
(47 lines removed).

```diff
         while ($journal = $journals->next()) {
             // Send notifications based on current date
             $this->sendNotifications($journal, $todayDate);
         }
 
-        // If it is the first day of a month but previous month had only
-        // 30 days then simulate 31st day for open access dates that end on
-        // that day.
-        $shortMonths = [2,4,6,9,11];
-        ...
-        }
-
         return true;
```

With a daily run every calendar date gets its own run, and an open
access date can only be a calendar date, so no date is left without one.

Tried on OJS `main`: with the fix in, the steps send one email each to
dbarnes and rvaca. With "Open access date" set to the day after, the run
sends nothing, with the fix in and out.

**Alternatives**:

- Keep the extra days and skip one that rolls over: the blocks would
  remain and reach nothing.
- Compare dates as `Y-m-d` text: it ends the duplicate but keeps the
  blocks, which would then reach nothing.

**What goes with it**:

- A regression test has to run `executeActions()` with today set to the
  1st of October and count one batch. The method reads `date()`, so the
  test needs a date seam first: `Carbon::today()` in place of the three
  `date()` calls, which `Carbon::setTestNow()` can then move.
- No stored data to repair. A day the server misses (down at midnight)
  still sends nothing for that day, as now.
- 3.5 and 3.4 have the same method; the diff applies there as written.

Small: two blocks removed, a three-line date seam, and one test.

## Evidence

- Kept script, which takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-access-email-sent-twice/walk.js);
  the run with "Open access date" the day after:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/open-access-email-sent-twice/neighbour.js).
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/open-access-email-sent-twice/walk.js` (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/open-access-email-sent-twice/fix.diff ojs`.
- Walked on 1 October 2026 on PostgreSQL, datasets pkp/datasets c657990
  (2026-10-01), main and 3.5, with "Open access date" picked as today in
  the calendar (the real date, no faked clock).
- Code reads: on 3.4 the same method, scheduled `hour="0"` (daily) in
  `registry/scheduledTasks.xml`; on 3.3
  `classes/tasks/OpenAccessNotification.inc.php` holds the same blocks,
  but `registry/scheduledTasks.xml` does not schedule the task (removed
  in OJS 12468cc643, 2016; restored for 3.4 by `pkp/pkp-lib#7186`).
- History: the first version had `$shortMonths = array(2,4,6,8,10,12)`;
  OJS 3f4cc343cc (2020-01-30, Alec Smecher) copied today's list from the
  expiry reminder task, which added 1 October and 1 December.
- Not driven: 1 March, May, July and December, the early March email
  and the leap-year 29 February repeat; they follow from the same code
  and from PHP's `mktime()`, checked on the command line for 2026 to
  2029. MySQL not checked; nothing here depends on the database.
