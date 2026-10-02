# A closed task keeps telling people to chase its owner, and a task reads "Overdue" on its due date

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** the overdue line: [b641a430ff](https://github.com/pkp/pkp-lib/commit/b641a430ff56ad33ef89351e3f0ce5baf06cb5d3), PR `pkp/pkp-lib#12244` for `pkp/pkp-lib#12243`, 2026-01-26, Vitaliy Bezsheiko (Vitaliy-1). The badge: [c3bd2bc256](https://github.com/pkp/ui-library/commit/c3bd2bc2561fdc7b9a1e9b9a55d356243a54fd48), PR `pkp/ui-library#699` for `pkp/pkp-lib#11291`, 2025-09-15, Blesilda Biazon (blesildaramirez)
- **Upstream** `pkp/pkp-lib#12570` (open), covering the closed task only, not the due date
- **Tracked in** spec U37 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a16), [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a17)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A task in a stage's "Tasks & Discussions" that is closed on or after
its due date keeps "This task is overdue. Remind the task owner to
complete it as soon as possible" as its "Activity" and at the top of its
History, in place of "Task closed by …". Only the window's badge
changes, to "Closed". A finished task goes on asking people to chase
its owner.

A task also reads as overdue from the start of its due date: the badge
reads "Overdue" and the same line appears. The app says the same of a
review on its review due date ("The reviewer has missed the review due
date."), so whether a task is late on its due date is a product call.
What is wrong either way is that the badge and the line use different
clocks. On an install whose time zone is not UTC, they disagree for some
hours around the start of the due date.

Nothing is stored wrong and nobody is emailed.

## Impact

- **Lost**: nothing stored or sent. The status line of a task closed on
  or after its due date stays wrong for good.
- **Who**: everyone who reads a stage's "Tasks & Discussions" panel
  (editors, managers, the task's participants), for every task closed
  on or after its due date.
- **Way round**: none: the line cannot be cleared. The true state shows
  elsewhere on the same panel: the row is listed under "Closed", and the
  History holds "Task closed by …" lower down.

Low: a status line that misleads while the task and its closing are
stored right. It would be medium if the overdue state sent reminders or
fed the weekly editorial emails, which `pkp/pkp-lib#12701` asks for.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS).
- The install's `time_zone` in `config.inc.php` left at the dataset's
  `UTC`. On an install east of UTC, in the first hours of the due date
  (until midnight UTC), the line already reads overdue while the badge
  still reads "In progress".

The submission (each is in Production): OJS submission 5, "Genetic
transformation of forest trees"; OMP submission 4, "How Canadians
Communicate: Contexts of Canadian Popular Culture"; OPS submission 1,
"The influence of lactation on the quantity and quality of cashmere
production".

A task due today:

1. Sign in as `dbarnes`.
2. Open the submission and its "Production" stage.
3. Under "Production Tasks & Discussions", press "Add".
4. Fill in "Name": `u37r5 due today`. Leave "Participants" as offered
   (Daniel Barnes ticked). Tick "Enter task information". Set "Due Date"
   to today's date. Under "Responsible to complete this task (Task
   owner)" choose Daniel Barnes. Leave "Begin Task Upon Saving". Type the
   message `Please finish this today.` and press "Save".
5. Read the task's row under "In progress": its "Activity".
6. Press the task's name and read the badge under the window's title.
   Close the window.
7. In the row's "More Actions", choose "History" and read the first
   line. Close it.
8. Press the row's "Closed" box and answer "Yes" to "Close this Task".
9. Read the row, now under "Closed": its "Activity", the first line of
   its "History", and the badge in its window.

A task past its due date:

10. Add a second task as in steps 3–4, named `u37r5 past due`, due
    today.
11. On any later day, open the stage again. The row's "Activity" reads
    the overdue line and the badge reads "Overdue", which is right: the
    task is late.
12. Close the task as in step 8, and read the row as in step 9.

**Expected**: a closed task does not read overdue. In steps 9 and 12,
"Activity" reads "Task closed by dbarnes on {date}", the History opens
with that line, and the badge reads "Closed". In steps 5–7 the badge and
the line agree. With the rule the fix below proposes, the task is not
late on its due date: "Activity" shows "Task created by dbarnes (Journal
editor) on 2026-10-02" ("Press editor" on OMP, "Preprint Server manager"
on OPS), and the badge reads "In progress".

**Observed**: in steps 5–7 "Activity" reads "This task is overdue.
Remind the task owner to complete it as soon as possible", the badge
reads "Overdue", and the History opens with that line, dated 2026-10-02
with an empty "User". In steps 9 and 12 the badge reads "Closed", but
"Activity" still reads the overdue line, and the History still opens
with it, above "Task closed by dbarnes on 2026-10-02".

## Cause

The rule "this task is overdue" is written twice: on the server for the
line, and in the browser for the badge.

The line: `TaskResource::toArray()`
(`lib/pkp/api/v1/submissions/tasks/resources/TaskResource.php`, lines
69–79) puts the overdue entry at the head of `latestActivities` when
`Carbon::now()->gt($dateDue)`. That condition never reads `dateClosed`,
so a closed task keeps the entry (A17). The panel's "Activity" cell shows
`latestActivities[0]`, and the History lists the whole array.

A due date is a day. The "Due Date" box posts `Y-m-d`, `EditTask::rules()`
accepts today (`after_or_equal:today`), and `edit_tasks.date_due` stores
it as midnight (`2026-10-02 00:00:00`). So the condition holds from the
first second of the due date, in the server's time zone (`time_zone` in
`config.inc.php`) (A16).

The badge: ui-library's `useDiscussionManagerForm.js`, `getBadgeProps()`,
computes its own `isOverdue` as `new Date(dateDue) < new Date()`.
`new Date('2026-10-02')` is midnight UTC on the due date, whatever the
server's or the browser's time zone. The badge checks `dateClosed` and
the status, so a closed task's badge is right.

So the two agree only on an install set to UTC. East of UTC the line
turns overdue at local midnight and the badge some hours later. West of
UTC the badge turns "Overdue" on the evening before the due date (code;
the walks ran in UTC).

The reach:

- A task made from a template, chosen in "Add" or added automatically
  when the submission reaches the stage, gets a due date with a time of
  day: `now()->add($dueInterval)` (`Template`, line 216). Its line turns
  overdue at that hour of the due date, not at midnight (code).
- No reminder, email or notification reads a task's due date. The only
  other reader of `SUBMISSION_LOG_TASK_OVERDUE` is its definition, and
  the submissions list's "Overdue" filter (`Collector::filterByOverdue()`)
  is about reviews (code).

## Proposed fix

Decide "overdue" once, on the server, and have the badge show the
server's answer. In `TaskResource`, beside `determineStatus()`, a task
is overdue while it is open and its due date is before today. The
resource uses that for the line and returns it as `isOverdue`, and the
badge reads that field instead of comparing dates itself
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-due-today-reads-overdue/fix.diff)):

```php
// lib/pkp/api/v1/submissions/tasks/resources/TaskResource.php
protected function isOverdue(): bool
{
    return $this->dateDue && !$this->dateClosed && $this->dateDue->lt(Carbon::today());
}
// toArray(): $isOverdue = $this->isOverdue(); the overdue entry only when $isOverdue;
// 'isOverdue' => $isOverdue beside 'status'
```

```js
// lib/ui-library/src/managers/DiscussionManager/useDiscussionManagerForm.js, getBadgeProps()
// the server decides whether a task is overdue (TaskResource::isOverdue())
if (workItemRef.value?.isOverdue) {
```

This follows review assignments in two ways. The server decides, and
the reviewer list's badge shows the status it worked out. A completed
review is never overdue. Review assignments give no single answer on the
day boundary, though. `ReviewAssignment::getStatus()` moves a date-only
due time to 23:59:59. A missed response date therefore counts from the
day after (`$responseDueTime < time()`). A missed review date counts on
the due date itself (`$reviewDueTime < strtotime('tomorrow')`).

The fix takes the response date's rule: the owner has the whole due
date. `Carbon::today()` is the server's date in its configured time
zone, the zone the due date was stored in. A template-made task's due
date carries a time of day. With the fix, that task also turns overdue
at the start of the day after its due date, like one entered by hand.

Tried on OJS, OMP and OPS `main`: the Steps then show the Expected.
As a control, an open task due the day before still reads "Overdue"
with the line.

- **Alternatives**:
  - The review date's rule (late on the due date itself): the same
    method with `Carbon::now()->gte($this->dateDue)`. That is the
    product call in the Summary, and it changes only that one condition.
  - Fix each copy where it is (`!dateClosed` and a day comparison in
    the resource, a local-date comparison in the badge). This is as
    small, but it keeps two clocks, so the badge and the line can still
    disagree.
- **What goes with it**:
  - The task API's answer gains `isOverdue`, an added field. Its
    `latestActivities` no longer carries the overdue entry for a closed
    task. The entry is computed on each read, so no stored data needs
    repair.
  - The guard: an end-to-end test (pkp-e2e's U37 scenario S4 already
    seeds a task three days past due and reads it open). It would close
    that task and expect "Task closed by …" in "Activity", and add a task
    due today whose badge and line agree. A unit test would need the
    rule as a public method (`EditorialTask::isOverdue()`), since
    `toArray()` needs six data keys and a request, and lib/pkp has no
    task test to extend; it would pin the clock with
    `Carbon::setTestNow()`.

Medium: a few lines, but in two repos: the pkp-lib resource decides
and the ui-library badge reads its answer.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-due-today-reads-overdue/walk.js)
  takes steps 1–9 on each app. On an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/task-due-today-reads-overdue/walk.js`.
  Steps 10–12, and the control, are in
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-due-today-reads-overdue/neighbour.js).
  It does not wait a day. Instead it moves the task's stored due date
  back one day (`UPDATE edit_tasks SET date_due = date_due - INTERVAL '1 day'`),
  which is the value the screen would have saved the day before.
- Walked on OJS, OMP and OPS `main` on 2026-10-02 between 02:12 and
  02:22 UTC, on PostgreSQL. The comparison runs in PHP and in the
  browser, so it does not depend on the database. Dataset: pkp/datasets
  c657990 (2026-10-01). Time zones: the server's PHP and the dataset's
  `config.inc.php` (`time_zone = UTC`) were both UTC, and so was the
  browser (Chromium).
- `stable-3_5_0` walked on the three apps with the same script
  (`PKP_E2E_LINE=stable-3_5_0` in front). The Production stage offers
  only "Production Discussions" ("Discussions" on OPS) with "Add
  discussion". That window has no task and no "Due Date", so the Steps
  cannot be taken there.
- Not driven:
  - An install whose `time_zone` is not UTC. The disagreement between
    badge and line is read in the code only.
  - A template-made task (code only).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `TaskResource.php` and
  `useDiscussionManagerForm.js` are the same in the three.
  `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e, OPS
  8eaf899468 (lib/pkp 1fb843f491), lib/ui-library d4e01883. pkp-lib
  `stable-3_4_0` 32b0f4b4af and `stable-3_3_0` f6ab331645; ui-library
  `stable-3_4_0` ee684b34 and `stable-3_3_0` 96959f9e.
- Code reads of the older lines:
  - `stable-3_5_0` has no `classes/editorialTask` and no task API in
    lib/pkp. Its ui-library `DiscussionManager.vue` wraps the older
    discussions grid, which has no due date.
  - pkp-lib and ui-library `stable-3_4_0` and `stable-3_3_0` have no
    task classes, no `DiscussionManager` and no
    `submission.event.task.overdue`.
- The trace:
  - `git blame` on `TaskResource.php` lines 69–79: the condition
    (lines 69–72) comes from 9d8433e48e (2026-01-26, message
    `pkp/pkp-lib#i12243`). That commit only moved it into the
    `latestActivities` array. Lines 73 and 75–77, the entry's fields,
    come from c69d929b26 (`pkp/pkp-lib#12248`, 2026-02-23).
  - At 9d8433e48e's parent, the condition came from b641a430ff (message
    `pkp/pkp-lib#12243`). The GitHub API names its PR as
    `pkp/pkp-lib#12244`.
  - In ui-library, lines 213–216 come from 56c9af1132
    (`pkp/pkp-lib#11825`), which only renamed `workItem` to
    `workItemRef.value`. Before it they come from c3bd2bc256
    (`pkp/ui-library#699`), which added the comparison.
- Upstream searched on 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library. `pkp/pkp-lib#12570` (open, assigned to Vitaliy-1 on
  2026-07-14) reports the closed task's overdue line; no PR names it.
