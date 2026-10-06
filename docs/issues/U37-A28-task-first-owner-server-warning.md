# Turning a discussion into a task logs two PHP warnings on the server

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** `pkp/pkp-lib#12344` for `pkp/pkp-lib#12248` · [756d7004a1](https://github.com/pkp/pkp-lib/commit/756d7004a11f581e9757740ac2ed3c0a09ebaf1a) · 2026-02-15 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a28)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor can turn a discussion into a task in two ways: the row's
"Add Task Details", or "Edit" with "Enter task information" ticked.
Either way, when they save it with its owner, the server writes two
PHP warnings to its error log: `Attempt to read property "userId" on
null`.

The save succeeds and the screens show nothing wrong: the History reads
"Task assigned to {owner} by …" as it should. Tasks are new in `main`
and not yet released, so no live site meets it.

The fix is a missing null check, two characters in one method.

## Impact

- **Lost**: nothing; the server's error log gains two warnings per
  save.
- **Who**: the people who read the server's logs.
- **Way round**: none needed.

Low: nothing in PKP turns a PHP warning into an error, so the save
cannot fail on it. On an install that displays errors
(`[debug] display_errors = On`, Off by default), the warnings are
printed into the save's answer; what the window does with that answer
was not checked, and a failed save there would raise the severity.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded, with PHP
  warnings logged and not displayed (`[debug] display_errors = Off`,
  the default, and PHP's `log_errors` on), and access to that log.
  Journal: submission 5, "Genetic transformation of forest trees", in
  Production. [Press: submission 4, "How Canadians Communicate:
  Contexts of Canadian Popular Culture". Preprint server: submission 1,
  "The influence of lactation on the quantity and quality of cashmere
  production".]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   5 at its "Production" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`)
   [press: submission 4; preprint server: submission 1].
2. Under "Production Tasks & Discussions" press "Add". Name: "Galley
   check". Under "Participants", "Daniel Barnes (dbarnes) (Me)" is
   ticked [preprint server: he is listed and ticked too, as the
   server's manager, though not assigned to the submission]; tick
   Graham Cox (gcox) as well [preprint server: David Buskins
   (dbuskins)]. Leave "Enter task information" unticked, type "Please
   check the galley." as the message and press "Save".
3. In its row, open "More Actions" and choose "Add Task Details". Set
   "Due Date" to seven days from today, choose Daniel Barnes under
   "Responsible to complete this task (Task owner)" and press "Save".
4. Read the server's error log.

**Expected:** the save answers 200 and the log gains nothing.

**Observed:** the save answers 200 and the task's History reads "Task
assigned to dbarnes by dbarnes on 2026-10-02", but the log gains:

```
PHP Warning:  Attempt to read property "userId" on null in …/lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php on line 1302
PHP Warning:  Attempt to read property "userId" on null in …/lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php on line 1303
```

The same through "Edit" with "Enter task information" ticked. As a
control check, changing the owner of a task that already has one logs
nothing ("Task reassigned from dbarnes to gcox by dbarnes on …").

## Cause

`EditorialTaskController::editTask()` calls `logOwner()` on every save
of a task, passing the owner found before the save as `$oldOwner`. A
discussion has no owner, so `$oldOwner` is null when it becomes a task.
`logOwner()` takes `?Participant $oldOwner = null`, reads it null-safely
in its first line, and picks the "assigned" event for null, but then
reads the old owner's id with a plain `->`:

```php
'taskOwnerOldUserId' => $oldOwner->userId,
'taskOwnerOldUsername' => $oldOwner->userId ? Repo::user()->get($oldOwner->userId, true)->getUsername() : '',
```

On null, each read warns and gives null, so the event is still stored
with an empty old owner.

756d7004a1 wrote the method with `Repo::user()->get($oldOwner->userId)`
unguarded, so this save first failed outright: `get()` takes an `int`
and null raised a `TypeError` (read in the code, not driven).
2137abb867 ("Suppress null argument warning when oldOwner was not
assigned", Alec Smecher, 2026-02-24, committed without a PR) guarded
both user lookups, the old owner's and the new one's, which reduced the
failure to these two warnings.

Reach:

- A task with no owner that "Edit" gives one: `logOwner()`'s own
  comment says a task added automatically from a template may have
  none. Read in the code, not driven.
- `logOwner()` has no other caller, and the new owner cannot be null
  there: the save of a task requires exactly one owner.

## Proposed fix

Read the old owner null-safely, as the method's first line already
does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-first-owner-server-warning/fix.diff)):

```diff
-            'taskOwnerOldUserId' => $oldOwner->userId,
-            'taskOwnerOldUsername' => $oldOwner->userId ? Repo::user()->get($oldOwner->userId, true)->getUsername() : '',
+            'taskOwnerOldUserId' => $oldOwner?->userId,
+            'taskOwnerOldUsername' => $oldOwner?->userId ? Repo::user()->get($oldOwner->userId, true)->getUsername() : '',
```

The stored values stay as they are today (null and an empty string).

Tried on OJS, OMP and OPS `main`. With the fix, both saves of the Steps
logged nothing, and the History still read "Task assigned to dbarnes by
dbarnes on …". With and without the fix, changing the owner of a task
that already had one read "Task reassigned from dbarnes to gcox by
dbarnes on …" and logged nothing.

**Alternatives**

- Leave out the old-owner keys when there is none: it changes what the
  "assigned" event stores, for no reader's benefit.

**What goes with it**

- No data repair.
- Guard: a pkp-lib test of `editTask()` turning a discussion into a
  task under an error handler that fails on warnings.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/walk.js)
  takes the Steps on each app and reads the PHP log lines each "Save"
  adds;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/neighbour.js)
  is the second check named in the fix. On an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/converted-task-not-begun/walk.js`.
- Driven on screen on OJS, OMP and OPS `main` and on `stable-3_5_0`,
  on PostgreSQL, under PHP's built-in server with warnings logged and
  not displayed; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp ddd8ab243a and 3dc90c81a6, the file the same); `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 3bb4450bea and 1fb843f491); pkp-lib `stable-3_4_0` 32b0f4b4af, `stable-3_3_0` f6ab331645.
- Code reads: no `set_error_handler()` and no Laravel `HandleExceptions`
  bootstrap in pkp-lib or OJS (`PKPExceptionHandler` handles exceptions
  only); `PKPApplication` sets `display_errors` from `[debug]`;
  `Repo::user()->get(int $id, …)` at 2137abb867's parent. On
  `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`: no
  `api/v1/submissions/tasks` in pkp-lib.
- Unverified: what the window shows when `display_errors` is On and the
  warnings precede the save's JSON; the template-added task without an
  owner.
- Related but not this fault: `pkp/pkp-lib#12716` (a notification error
  when a template task is assigned, closed).
