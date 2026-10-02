# Subscribers get no expiry reminders: the reminder task stops with an error and sends nothing

- **Severity** high
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: none (code; no Institutions)
- **Introduced** `pkp/ojs#3465` for `pkp/pkp-lib#6782` ·
  [11f902f20f](https://github.com/pkp/ojs/commit/11f902f20f45c803d9b42e21032d0bd57608ca10)
  · 2022-03-16 · Bozana Bokan (bozana); it joined institution names into
  the institutional subscriptions' queries
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U51 [A27](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U51-subscriptions.md#a27)
- **Checked** 2026-10-01 and 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

The scheduled task that sends "Subscription Expiry Reminders" stops with
a server error whenever it reaches a journal that requires subscriptions
and has any reminder set on its "Subscription Policies" tab. That
journal does not need any institutional subscription, and the error
does not depend on the database. No reminder goes out from any journal
of the site: subscribers get no "Notice of Subscription Expiry" before
their access ends and no "Subscription Expired" after it.

The error shows only in the scheduler's output and the server's log;
the journal sees its reminders set and believes they are sent.

## Impact

- **Lost**: every expiry reminder email of the site, silently.
- **Who**: subscribers of every journal that requires subscriptions and
  sets a reminder; the journal managers who set them.
- **Way round**: none on screen; the subscription contact can write to
  each subscriber by hand.

High: a feature a journal turns on to keep its subscribers renewing
produces nothing at all, and nothing tells the journal.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`),
  "Journal of Public Knowledge".
- For the Expected, a run day from the 1st to the 28th of any month but
  November: on other days the task's own date arithmetic misses "the
  same day next month" (see [Expiry reminders reach only subscribers
  whose subscription ends on the 1st of a month](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A8-expiry-reminders-reach-few-subscribers.md)).
  The error of the Observed shows on any day.

1. Sign in as `rvaca` (Journal manager).
2. Settings › Distribution › "Access": choose "The journal will require
   subscriptions to access some or all of its contents.", "Save".
3. Payments › "Subscription Types" › "Create New Subscription Type":
   name "u51sb1 Online Year", currency "US Dollar (USD)", cost 40,
   duration 12, "Save".
4. Payments › "Subscription Policies": fill "Name" (Ramiro Vaca),
   "Email" (rvaca@mailinator.com) and "Mailing Address"; under
   "Subscription Expiry Reminders" set the months-before reminder to
   "1 Months"; "Save".
5. Payments › "Individual Subscriptions" › "Create New Subscription":
   find `dbarnes` in "Locate a User" and choose him, type "u51sb1 Online
   Year", status "Active", start date today, end date the same day next
   month; "Save".
6. In the OJS root, run the reminder task as the site's scheduler does
   (cron runs `php lib/pkp/tools/scheduler.php run`, which runs it at
   00:00 on the 1st; `test` runs it now):
   `php lib/pkp/tools/scheduler.php test --name='APP\tasks\SubscriptionExpiryReminder'`
7. Open the mailbox of dbarnes@mailinator.com, and the task's log in
   `files_dir/scheduledTaskLogs/`.

**Expected**: the task reports `DONE`; dbarnes gets "Notice of
Subscription Expiry" from rvaca@mailinator.com.

**Observed**: the task fails and no email goes out:

```
Running [APP\tasks\SubscriptionExpiryReminder] ....... 22.67ms FAIL
PHP Fatal error:  Uncaught Error: Call to a member function getPrimaryLocale() on null
in classes/subscription/InstitutionalSubscriptionDAO.php:672
#0 classes/subscription/InstitutionalSubscriptionDAO.php(596): APP\subscription\InstitutionalSubscriptionDAO->getInstitutionNameFetchParameters()
#1 classes/tasks/SubscriptionExpiryReminder.php(99): APP\subscription\InstitutionalSubscriptionDAO->getByDateEnd()
```

The task's log holds "Task process started." and nothing after it.

## Cause

The task loops over the site's journals in one run. For each journal
requiring subscriptions, and for each of the four reminders that is set
(months before, weeks before, months after, weeks after the end date),
it asks both subscription DAOs for the subscriptions ending on one day.
`InstitutionalSubscriptionDAO::getByDateEnd()`
([classes/subscription/InstitutionalSubscriptionDAO.php](https://github.com/pkp/ojs/blob/b84f8e2e4495c7453dc1569fc160ea364a0dae51/classes/subscription/InstitutionalSubscriptionDAO.php#L592-L618))
is written for a web request and breaks in two ways outside one.

First, it binds the institution name's locales from
`getInstitutionNameFetchParameters()`, which reads the journal from the
request: `Application::get()->getRequest()->getContext()->getPrimaryLocale()`.
A task run by the command-line scheduler has no request context, so the
call is fatal before the query is built, whether or not the journal has
institutional subscriptions. The error ends the whole run, so the
journals after it are not reached either. `getByDateEnd()` is given the
journal (`$journalId`) and does not use it for this.

Second, its parameters are in the wrong order:
`array_merge([year, month, day, $journalId], $this->getInstitutionNameFetchParameters())`,
while the query's placeholders run the other way: the two institution
name joins first, the WHERE clause after. Once a journal is available,
PostgreSQL stops the query:
`SQLSTATE[22P02]: Invalid text representation: 7 ERROR: invalid input
syntax for type numeric: "name"`. On MySQL the query is expected to
match no institutional subscription, silently (code; MySQL not
checked). `retrieveRange()` returns a lazy `DB::cursor()`, so the query
runs at the first `next()`, after the individual reminders of that
reminder have been sent; the reminders after it are not.

The shipped configuration runs the scheduler inside web requests
(`task_runner = On`). There the task runs in the request that happens
to trigger it, after the response is sent, with errors going only to
the PHP error log. From a site-level page the journal is null and the
first fault stops it; from a journal's page the second fault stops it on
PostgreSQL (code).

`pkp/pkp-lib#11740` (OJS 9f3f9a8589, 2025) fixed a misplaced comma in
the same query, not these two faults.

Reach:

- `InstitutionalSubscriptionDAO::getAll()` also calls
  `getInstitutionNameFetchParameters()` without a journal, and its SELECT
  lacks the comma 9f3f9a8589 added to `getByDateEnd()`; nothing in OJS
  calls it (code).
- `IndividualSubscriptionDAO::getByDateEnd()` has neither fault (code).

## Proposed fix

Make `getInstitutionNameFetchParameters()` take the journal from its
caller, and bind the parameters in the order the query reads them:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/fix.diff).

```diff
-        $params = array_merge([$dateEnd[0], $dateEnd[1], $dateEnd[2], (int) $journalId], $this->getInstitutionNameFetchParameters());
+        // The institution name joins come before the WHERE clause, so their parameters do too.
+        $params = array_merge($this->getInstitutionNameFetchParameters((int) $journalId), [$dateEnd[0], $dateEnd[1], $dateEnd[2], (int) $journalId]);
 ...
-    public function getInstitutionNameFetchParameters()
+    public function getInstitutionNameFetchParameters(?int $journalId = null)
     {
         $locale = Locale::getLocale();
-        $journal = Application::get()->getRequest()->getContext();
+        // A scheduled task or a CLI tool has no request context: it names the journal.
+        $journal = $journalId === null
+            ? Application::get()->getRequest()->getContext()
+            : Application::getContextDAO()->getById($journalId);
         $primaryLocale = $journal->getPrimaryLocale();
```

The fix loads the journal by ID because `getByDateEnd($dateEnd,
$journalId)` is declared that way in the abstract `SubscriptionDAO` and
takes an ID from every caller; passing the task's `Journal` object would
change that signature for both DAOs. The cost is one context query per
call, four per journal per run at most. Loading by ID is how other code
outside a request gets a context (`Application::getContextDAO()->getById()`,
as in `SendReviewToOrcid`). The request fallback keeps `getAll()` and
any plugin calling the method without an argument as they are.

Tried on OJS `main`: with the fix in, the steps report `DONE` and
dbarnes gets "Notice of Subscription Expiry". A second run added two
institutional subscriptions of a new institution, one ending on the
reminder's day and one 14 days later: only the first got its reminder
(fix out: the same fatal error, nothing sent).

**Alternatives**:

- Pass the `Journal` object down: saves the query, but changes the
  declared signature of `getByDateEnd()` in both DAOs.
- Set a context on the request before the task runs: one request
  context cannot stand for every journal the task loops over.
- Drop the institution name join from `getByDateEnd()`: the reminder does
  not need it, but the query orders by it, and the method would then
  differ from its siblings.

**What goes with it**:

- No stored data to repair.
- A test that runs the task from the command line with a reminder set,
  on PostgreSQL, with one institutional subscription ending on the
  reminder's day.
- `getAll()` keeps its missing comma; worth the same one-character fix
  while there.
- 3.5: the diff applies as written. 3.4 also needs the comma of
  `pkp/pkp-lib#11740`, which is not on `stable-3_4_0`.
- Even fixed, the task runs once a month and reaches few subscribers:
  [Expiry reminders reach only subscribers whose subscription ends on the 1st of a month](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U51-A8-expiry-reminders-reach-few-subscribers.md),
  best fixed together with this one.

Small: two changes in one DAO method and its caller, plus a test.

## Evidence

- Kept script, which takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/walk.js);
  the run with institutional subscriptions:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/neighbour.js).
- Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/walk.js` (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix: `node bin/try-fix.js apply shared/playwright/checks/issues/expiry-reminder-task-stops-with-error/fix.diff ojs`.
- Walked on PostgreSQL, datasets pkp/datasets c657990 (2026-10-01): the
  Steps on main and 3.5 on 1 October; the PostgreSQL parameter error on
  main with the journal half of the fix alone; the institutional run on
  main on 2 October, fix in and out.
- Code reads: on 3.4 the same two faults plus the misplaced comma, with
  the task run by `tools/runScheduledTasks.php` (command line) or the
  Acron plugin; on 3.3 `getByDateEnd()` reads the institution's name
  from its own column, with no request and no extra parameters.
- Not driven: the web-based task runner (a monthly task runs there only
  on a request in the first minute of the month), and MySQL.
