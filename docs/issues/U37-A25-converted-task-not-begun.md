# A discussion turned into a task reads "Begin Task Upon Saving", but the saved task is not begun

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** `pkp/ui-library#699` for `pkp/pkp-lib#11291` · [c3bd2bc256](https://github.com/pkp/ui-library/commit/c3bd2bc2561fdc7b9a1e9b9a55d356243a54fd48) · 2025-09-15 (the start sent after a new item only), and `pkp/ui-library#691` for `pkp/pkp-lib#11291` · [652ce6460c](https://github.com/pkp/ui-library/commit/652ce6460c7270bde542da21f32c1c62f1561898) · 2025-08-28 (the drop-down greyed on every existing item) · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a25)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When someone turns a discussion into a task, through the row's "Add
Task Details" or through "Edit" and its "Enter task information" box,
the drop-down under "Task Information" reads "Begin Task Upon Saving"
and is greyed. They expect the saved task to begin, as the drop-down
says. Instead it is listed under "Yet to begin" with its "Started" box
empty, and they cannot choose "Create Task (Do Not Start)" either.

They can start the task afterwards from its row or its window. Tasks
made through "Add" begin or not as chosen. In "Edit", every task shows
the same greyed "Begin Task Upon Saving", also one made with "Create
Task (Do Not Start)".

The fix belongs in the window: send the start after the save when a
discussion becomes a task, as "Add" does.

## Impact

- **Lost**: nothing is stored wrong. Starting a task today only moves
  it to "In progress" and records who started it and when; it tells no
  one and blocks nothing. Until someone starts it, the task's window has
  no "Task started by" and its History no "Task initiated by …" line.
- **Who**: the people who may turn a discussion into a task: the
  manager-level roles (a journal's or press's manager and editor, a preprint server's
  manager) and whoever wrote the discussion. It happens each time.
- **Way round**: tick the task's "Started" box in its row and answer
  "Yes", or tick "Start this task" in its window and "Save".

Low: the task exists with its owner and due date, its state is shown
right after the save, and one action starts it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 5, "Genetic transformation of forest trees", in
  Production. [Press: submission 4, "How Canadians Communicate:
  Contexts of Canadian Popular Culture". Preprint server: submission 1,
  "The influence of lactation on the quantity and quality of cashmere
  production".]

"Add Task Details":

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   5 at its "Production" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`)
   [press: submission 4; preprint server: submission 1].
2. Under "Production Tasks & Discussions" press "Add". Name: "Galley
   check". Under "Participants", "Daniel Barnes (dbarnes) (Me)" is
   ticked; tick Graham Cox (gcox) as well [preprint server: David
   Buskins (dbuskins)]. Leave "Enter task information" unticked, type
   "Please check the galley." as the message and press "Save". The
   discussion is listed under "In progress".
3. In its row, open "More Actions" and choose "Add Task Details". The
   window opens with "Enter task information" ticked.
4. Read the drop-down under "Task Information". Set "Due Date" to seven
   days from today, choose Daniel Barnes under "Responsible to complete
   this task (Task owner)" and press "Save".
5. Read the row.

"Edit":

6. Add a second discussion as in step 2, named "Proof check".
7. In its row, open "More Actions" and choose "Edit". Tick "Enter task
   information", then do steps 4 and 5.

**Expected:** while the item is still a discussion, the drop-down can
be set to "Begin Task Upon Saving" or "Create Task (Do Not Start)", as
in "Add". With "Begin Task Upon Saving", the saved task is listed under
"In progress" with its "Started" box ticked, and its History reads
"Task initiated by dbarnes ({their role}) on {today}" ("Journal
editor", "Press editor", "Preprint Server manager").

**Observed:** in step 4 and in step 7 the drop-down reads "Begin Task
Upon Saving" and is greyed. After "Save" each task is listed under
"Yet to begin" with its "Started" box empty, and its row's "Activity"
reads "Task assigned to dbarnes by dbarnes on 2026-10-02". The window
sends only the save of the discussion
(`PUT …/api/v1/submissions/5/tasks/{its id}`, answered 200), and no
start request (`PUT …/tasks/{its id}/start`).

As a control check, a task made through "Add" with "Begin Task Upon
Saving" is listed under "In progress".

## Cause

The start is a separate request (`PUT …/tasks/{id}/start`) that
ui-library's `useDiscussionManagerForm.js` sends after the save, when
"Enter task information" is ticked and the drop-down says "Begin Task
Upon Saving". Only `addWorkItem()` sends it, and
`handleFormSubmission()` routes every existing item to `saveWorkItem()`
instead:

```js
if (workItemRef.value) {
	result = await saveWorkItem(formData);
} else {
	result = await addWorkItem(formData);
}
```

"Add Task Details" and "Edit" open the same form on the existing
discussion. Their save turns it into a task (`type` 2 in the `PUT`),
so the item has just become a task, but no start follows.

The drop-down is added with `value: true` and `disabled:
!!workItemRef.value`. So on any existing item it is greyed at "Begin
Task Upon Saving", both when this save will not start the item and on a
task that was never started.

The drop-down came with bc9a03b9fc (`pkp/ui-library#655`, 2025-07-30),
which offered it only while the item's status was "New" or "Pending",
before anything had started. 652ce6460c drew it on every item and greyed
it on any existing one, while the save and the start were still stubs.
c3bd2bc256 wired the requests and put the start into `addWorkItem()`
alone. `pkp/pkp-lib#11825` (the screens' specification, open) lists the
drop-down among the disabled fields of the "Edit" form, which was
written for editing a task; "Add Task Details" reuses that form on a
discussion, where nothing has started yet.

Reach:

- "Edit" on an existing task: the greyed "Begin Task Upon Saving" shows
  on a started task and on one never started (driven on screen).
- The server starts a converted task when asked: `startTask()` refuses
  only a discussion, a started task, or one without participants or
  owner. Nothing else reads the drop-down (checked in the code).

## Proposed fix

Send everything that is not yet a task through `addWorkItem()`, so the
drop-down applies whenever the save makes a task. Grey the drop-down
only on a task, and show there whether that task was started
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/fix.diff);
its paths start `lib/ui-library/`, so inside ui-library apply it with
`git apply -p3`):

```diff
-			if (workItemRef.value) {
+			if (workItemRef.value?.type === pkp.const.EDITORIAL_TASK_TYPE_TASK) {
 				result = await saveWorkItem(formData);
 			} else {
+				// a new item, or a discussion being turned into a task: "Begin Task Upon Saving" applies
 				result = await addWorkItem(formData);
 			}
…
-		value: true,
+		value:
+			workItemRef.value?.type === pkp.const.EDITORIAL_TASK_TYPE_TASK
+				? workItemRef.value.status !== pkp.const.EDITORIAL_TASK_STATUS_PENDING
+				: true,
 		hideOnDisplay: true,
-		disabled: !!workItemRef.value,
+		disabled: workItemRef.value?.type === pkp.const.EDITORIAL_TASK_TYPE_TASK,
```

This brings back bc9a03b9fc's rule, a choice while nothing has
started, for the one existing item where that is still true: a
discussion becoming a task. `saveWorkItem()` already sends a `PUT` when
the item has an id, so `addWorkItem()` serves both cases. The condition
is the one "Enter task information" already uses (`disabled` when the
item is a task), and it keeps the specification's rule that an edited
task's start cannot be changed in "Edit".

Tried on OJS, OMP and OPS `main`. With the fix, in the Steps the
drop-down could be changed in both windows, and with "Begin Task Upon
Saving" both tasks were listed under "In progress", "Started" ticked,
the History holding "Task initiated by …". A second check: with the
fix, "Create Task (Do Not Start)" chosen in "Add Task Details" left the
task under "Yet to begin", and in "Edit" a started task read "Begin
Task Upon Saving" and a task never started "Create Task (Do Not
Start)", both greyed. With and without the fix, tasks made through
"Add" were begun or not as chosen, and reassigning a started task's
owner left it started.

**Alternatives**

- Hide the drop-down on any existing item: a converted task could then
  only be started afterwards, a second step the "Add" window spares.
- Keep it greyed and read "Create Task (Do Not Start)" on a discussion:
  the window would tell the truth, but a converted task would still
  always be saved unstarted.

**What goes with it**

- No data repair: tasks already converted can be started from their
  row.
- Guard: a ui-library test of `useDiscussionManagerForm` saving a
  discussion with "Enter task information" and "Begin Task Upon
  Saving". The harness is new: ui-library's vitest files cover
  composables and stores, none a manager, and this one needs
  `inject('closeModal')`, the global `pkp.const` and mocked
  `useFetch`/`useUrl`.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/walk.js)
  takes the Steps on each app;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/converted-task-not-begun/neighbour.js)
  is the second check named in the fix. On an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/converted-task-not-begun/walk.js`.
- Driven on screen on OJS, OMP and OPS `main` and on `stable-3_5_0`,
  on PostgreSQL; the fault does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01).
- Tips: `main` OJS b84f8e2e44, OMP 3b0ecf794c, OPS c8af945bb7 (lib/ui-library 64d6736318 and 280f98c570, the file the same); `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88ea, OPS 8eaf899468 (lib/ui-library d4e0188353); ui-library `stable-3_4_0` ee684b341b, `stable-3_3_0` 96959f9ed4.
- Code reads: on `main`, also `useDiscussionManagerActions.js` ("Add
  Task Details" opens the "Edit" form with `autoAddTaskDetails`),
  `useDiscussionManagerStatusUpdater.js`, pkp-lib
  `EditorialTaskController::editTask()` and `startTask()`, and
  `TaskResource::determineStatus()`. On `stable-3_5_0`, `stable-3_4_0`
  and `stable-3_3_0`: no `useDiscussionManagerForm.js` in ui-library
  and no `EditorialTaskController` in pkp-lib.
- The trace: the drop-down's `disabled: !!workItem` dates from
  652ce6460c and was kept as `!!workItemRef.value` by 56c9af1132
  (`pkp/ui-library#709`); bc9a03b9fc's version is read with `git show
  bc9a03b9:src/managers/DiscussionManager/useDiscussionManagerForm.js`.
- Related but not this fault: `pkp/pkp-lib#11825` (the specification,
  open), `pkp/pkp-lib#11965` ("Add Task Details" validation, closed).
