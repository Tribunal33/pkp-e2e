# A discussion turned into a task reads "Task created by …" in its History

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** `pkp/pkp-lib#12244` for `pkp/pkp-lib#12243` · [b641a430ff](https://github.com/pkp/pkp-lib/commit/b641a430ff56ad33ef89351e3f0ce5baf06cb5d3) · 2026-01-26 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A28](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a28)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An item's History (its row's "More Actions" › "History") lists its
events newest first. Before a discussion is turned into a task, the
History's oldest line and the row's "Activity" both read "Discussion
created by {username} ({role}) on {date}".

Once "Add Task Details", or "Edit" with "Enter task information"
ticked, turns it into a task, that oldest line reads "Task created by
…". Above it, "Task assigned to {owner} by …" is the only trace of the
change, and the row's "Activity" shows that newest line. So the History
says the item began as a task. Anyone who may turn a discussion into a
task meets it: the manager-level roles and whoever wrote the
discussion.

The fix is a one-line change in how the History's lines are worded.

## Impact

- **Lost**: nothing is stored wrong: the event log keeps the type
  (discussion or task) each event had, and the History shows the
  item's current type instead.
- **Who**: anyone who reads the History of an item that began as a
  discussion, on any stage.
- **Way round**: none on screen, and none needed to get work done.

Low: a wording in a record that nothing downstream reads. A History
that an editor or an audit relied on to show who opened a discussion
would raise the severity.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 5, "Genetic transformation of forest trees", in
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
   ticked; tick Graham Cox (gcox) as well [preprint server: David
   Buskins (dbuskins)]. Leave "Enter task information" unticked, type
   "Please check the galley." as the message and press "Save".
3. In its row, open "More Actions" and choose "History". It reads
   "Discussion created by dbarnes (Journal editor) on {today}". Close
   it.
4. In the row's "More Actions" choose "Add Task Details". Set "Due
   Date" to seven days from today, choose Daniel Barnes under
   "Responsible to complete this task (Task owner)" and press "Save".
5. In the row's "More Actions" choose "History".

**Expected:** the History reads, newest first:

```
Task assigned to dbarnes by dbarnes on 2026-10-02
Discussion created by dbarnes (Journal editor) on 2026-10-02
```

**Observed:**

```
Task assigned to dbarnes by dbarnes on 2026-10-02
Task created by dbarnes (Journal editor) on 2026-10-02
```

[Press: "(Press editor)"; preprint server: "(Preprint Server
manager)".] The same through "Edit" with "Enter task information"
ticked. As a control check, a task made as a task through "Add" reads
"Task created by …", rightly.

## Cause

`TaskResource::toArray()` (`lib/pkp/api/v1/submissions/tasks/resources/TaskResource.php`)
words each History line with `{$taskType}` taken from the item as it is
now:

```php
'taskType' => EditorialTaskType::from($this->type)->label(),
```

Each event that shows the type stores the type the item had when it
was logged: `EditorialTaskController::addTask()`, `closeTask()`,
`openTask()` and `startTask()` save `taskType`, and
`schemas/eventLog.json` declares it ("The type of the task associated
with the event"). The resource never reads it, so once `editTask()`
changes the item's `type`, every earlier line is relabelled.
b641a430ff added this wording and the stored `taskType` of the
created, started and closed events.

Reach:

- A discussion closed and reopened before it became a task: its
  "Discussion closed by …" and "Discussion reopened by …" lines read
  "Task closed by …" and "Task reopened by …" after the change. Read in
  the code, not driven; the reopened event and its stored `taskType`
  came with 756d7004a1 (`pkp/pkp-lib#12344` for `pkp/pkp-lib#12248`).
- No other code words these messages: `TaskResource` is the only reader
  of the `submission.event.task.*` keys, and the submission's own
  Activity Log loads only submission events, while these are logged
  against the item (checked in the code).

## Proposed fix

Word each line with the type its event stored
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-history-says-task-created/fix.diff)):

```diff
             $activityMessage = __($activity->getMessage(), [
-                'taskType' => EditorialTaskType::from($this->type)->label(),
+                // the type the item had when the event was logged: a discussion turned into a task was created as a discussion
+                'taskType' => EditorialTaskType::from((int) ($activity->getData('taskType') ?? $this->type))->label(),
```

The cast is needed because `eventLog.json` declares `taskType` a
string, so it is read back as `"1"` or `"2"`. The `?? $this->type`
fallback serves the events that store no type (assignments, notes,
files, participants): their messages do not show it, but the parameter
is computed for every line, and `from(0)` would throw.

Tried on OJS, OMP and OPS `main`. With the fix, the Steps' History read
"Discussion created by dbarnes …" under "Task assigned to dbarnes …",
through "Add Task Details" and through "Edit". With and without the
fix, a task made through "Add" read "Task created by …" and "Task
initiated by …", and a reassignment read "Task reassigned from dbarnes
to gcox by dbarnes on …".

**Alternatives**

- Log the change itself, "Discussion turned into a task by {username}
  on {date}", in `editTask()`: it records more, but needs a new event
  type and message, a product call; it goes with this fix, not instead
  of it.
- Rewrite the stored events' `taskType` on the change: the record would
  then say the item began as a task.
- Declare `taskType` an integer in `eventLog.json`: it saves the cast,
  but changes a schema others read.

**What goes with it**

- No data repair: the stored values are right, so the History of items
  converted before the fix reads right too.
- Guard: a pkp-lib test of `TaskResource` with a "created" event stored
  as a discussion on an item that is now a task. The harness is new: no
  test under `lib/pkp/tests` covers `TaskResource` or `EditorialTask`,
  and `toArray()` needs the eight data keys of `requiredKeys()`.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/walk.js)
  takes the Steps on each app and reads the History before and after
  each change;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/neighbour.js)
  is the second check named in the fix. On an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/converted-task-not-begun/walk.js`.
- Driven on screen on OJS, OMP and OPS `main` and on `stable-3_5_0`,
  on PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7 (lib/pkp ddd8ab243a and 3dc90c81a6, the file the same); `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 3bb4450bea and 1fb843f491); pkp-lib `stable-3_4_0` 32b0f4b4af, `stable-3_3_0` f6ab331645.
- Code reads: on `main`, also `EntityDAO::fromRow()` (settings read
  back by their schema type) and `SubmissionEventLogGridHandler` (the
  Activity Log). On `stable-3_5_0`, `stable-3_4_0` and `stable-3_3_0`:
  no `api/v1/submissions/tasks` in pkp-lib.
- Related but not this fault: `pkp/pkp-lib#11825` (the screens'
  specification, open).
