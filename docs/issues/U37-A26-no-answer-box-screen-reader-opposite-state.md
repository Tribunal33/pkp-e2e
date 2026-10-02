# After "No" to a Tasks & Discussions box's question, a screen reader hears the box in the opposite state

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no question on the discussions grid's "Closed" box; no tasks or templates)
  - 3.4: none (code; no question on the "Closed" box)
  - 3.3: none (code; no question on the "Closed" box)
- **Introduced** `pkp/ui-library#691` for `pkp/pkp-lib#11291` · [652ce6460](https://github.com/pkp/ui-library/commit/652ce6460c7270bde542da21f32c1c62f1561898) · 2025-08-28 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A26](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a26)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Some boxes in Tasks & Discussions ask a question before they save
anything: a row's "Started" box ("Start this task"), its "Closed" box
("Close this Discussion", "Reopen this Discussion", "Close this Task"),
and the template screen's "Auto-add at stage" box ("Confirm Automatic
Addition"). After "No", nothing is saved and the box still looks as it
did, but a screen reader hears the opposite state. A task that was not
started reads "checked", and a discussion that stays closed reads "not
checked", until the page is reloaded. Closing the question with Escape
instead of "No" has the same effect.

Nothing is stored wrong, and pressing the box again asks the same
question again.

## Impact

- **Lost**: nothing is saved or sent. A screen reader user is given a
  wrong state for the box.
- **Who**: screen reader users who answer "No" to one of the questions:
  editors, assistants and authors in a stage's Tasks & Discussions
  panel, and managers in Settings › Workflow › "Tasks and Discussions".
- **Way round**: on a task or discussion row, the group heading ("Yet to
  begin", "In progress", "Closed") still gives the true state. On the
  template screen's "Auto-add at stage" box, only a reload does.

A user who believes the wrong state and presses the box again to undo
the change gets the same question as the first time. That question names
the true state ("Start this task" for a task that was not started,
"Reopen this Discussion" for one still closed). A second "No" leaves
everything as it was, and the box then reads right. "Yes" makes the
change the question names.

Low: nothing is lost, and a refused change is never saved without a new
"Yes" to a question that names it.

## Steps to reproduce

Preconditions:

- The default dataset, OJS, OMP or OPS `main`.
- A screen reader, or the browser's inspector to read a box's state:
  in Chrome DevTools › Elements, select the hidden
  `<input type="checkbox">` inside the box's cell (the visible box is
  its `<label>`, which has no checked state) and read "Checked" under
  Accessibility, or use the full accessibility tree view. A task row's
  "Started" and "Closed" boxes share one name (the task's name), so tell
  them apart by column.

The submission is at Production: OJS submission 5, "Genetic
transformation of forest trees"; OMP submission 4, "How Canadians
Communicate: Contexts of Canadian Popular Culture"; OPS submission 1,
"The influence of lactation on the quantity and quality of cashmere
production".

Starting a task:

1. Sign in as `dbarnes` and open the submission's workflow at
   "Production" (OJS:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`).
2. In "Production Tasks & Discussions" press "Add". For "Name" type
   "u37r13 task", tick "Enter task information", set a "Due Date" a week
   ahead, choose the owner "Daniel Barnes" and the drop-down's "Create
   Task (Do Not Start)", type "Please check." as the message, and press
   "Save". The task is listed under "Yet to begin".
3. Press the task's "Started" box. "Start this task" asks "Are you sure
   you want to start this task?". Press "No".
4. Read the "Started" box (the first of the row's two boxes).

Closing and reopening a discussion:

5. Press "Add". For "Name" type "u37r13 discussion" and tick a second
   participant beside Daniel Barnes ("David Buskins"; OMP: "Bart
   Beaty"), since a discussion needs two. Type "Please look." and press
   "Save". The discussion is listed under "In progress".
6. Press its "Closed" box. "Close this Discussion" asks; press "No".
   Move the screen reader to the box.
7. Press its "Closed" box again and press "Yes". It moves to "Closed".
8. Press its "Closed" box again. "Reopen this Discussion" asks "Are you
   sure you want to reopen this discussion?"; press "No". Move the
   screen reader to the box.

Closing a task:

9. Press "u37r13 task"'s "Closed" box. "Close this Task" asks; press
   "No". Read the "Closed" box (the second of the row's two boxes).

The template screen:

10. Go to Settings › Workflow › "Tasks and Discussions". Press the
    "Auto-add at stage" box of "Discussion (Submission)" under
    "Submission Stage" (OPS: "Discussion (Production)" under "Production
    Stage"). "Confirm Automatic Addition" asks "Are you sure you want
    this task/discussion template to be automatically added when a
    submission reaches the Submission Stage?"; press "No". Move the
    screen reader to the box.
11. Reload both pages and read the boxes again.

**Expected**: after each "No", the box reads the same to the screen
reader as before the press, and as it looks: "not checked" at steps 4,
6, 9 and 10, and "checked" at step 8.

**Observed**: no request is sent, and each box looks as it did and
keeps its row in the same group. The screen reader hears the opposite.
The accessibility tree at step 4 reads, for the "Started" box:

```
before the press:  checkbox "u37r13 task"
after "No":        checkbox "u37r13 task" [checked]
```

It is the same at steps 6, 9 and 10 ("[checked]" on an empty box). At
step 8 the box of the closed discussion still looks ticked, but it is
read without "[checked]". After the reload (step 11) every box reads as
it looks.

Control: "Yes" in the same questions saves, and the box's look and what
the screen reader hears then agree ("Started" ticked and greyed, "In progress"; "Auto-add at
stage" ticked, with "Your changes have been saved.").

## Cause

ui-library's `Checkbox` component (`src/components/Checkbox/Checkbox.vue`)
draws its icon from its `checked` prop. Its `<input>`, which is
screen-reader only (`sr-only`), is bound to the same prop
(`:checked="checked"`), but it is not held to it. The browser toggles
the input on the click before `change` fires, and the component only
passes the event on (`@change="emit('change', $event)"`). So the input
goes back to the prop only when the prop itself changes and Vue patches
the input.

`TableCellSelect.onChange()` (`src/components/Table/TableCellSelect.vue`)
is the table's box. When it has `confirmTitle` and `confirmMessage`, it
calls `$event.preventDefault()` and opens the question, and the "No"
action's callback calls `$event.preventDefault()` once more. A `change`
event cannot be cancelled: the toggle has already happened, and only a
cancelled `click` undoes it. On "No", `isChecked` and so `checked` stay
as they were and Vue has nothing to patch. The icon is right, but the
input, which is what the accessibility tree reads, keeps the browser's
toggle.

`Checkbox.vue` came in with 652ce6460 (`pkp/ui-library#691`), which
made the "Started" and "Closed" boxes pressable behind a question.
`TableCellSelect.vue` already existed (81685375, `pkp/pkp-lib#6528`,
the dashboard's bulk delete); 652ce6460 rewrote it onto `Checkbox` and
added the question and the `preventDefault()` calls.

Reach:

- The three boxes that pass a question to `TableCellSelect`:
  `DiscussionManagerCellStarted`, `DiscussionManagerCellClosed` (close
  and reopen, task and discussion) and `TaskTemplateManagerCellAutoAdd`
  (added by `pkp/ui-library#703`). All were walked.
- Leaving the question without an answer runs no callback. The dialog
  can be dismissed by default (`Dialog.vue` `isDismissible`), so Escape
  and a click outside it act like "No". It shows no close button,
  because it has actions. Escape was driven in the browser on the
  template screen; the click outside was read in the code only.
- `WorkflowPublicationJats.vue`, OJS's JATS XML "Make public" box, also
  uses `Checkbox` behind a question. Its "Cancel" puts the input back
  itself (`event.target.checked = this.jatsPublicVisibility`, 02a9e42c),
  but Escape or a click outside that question does not (read in the
  code, not driven).
- The boxes without a question (`FileManagerCellSelect`, the
  "Attach Workflow Files" list; `DashboardCellBulkDelete`) toggle
  `isChecked` at once, so the input and the icon agree. This was walked
  on the file list.

## Proposed fix

Make `Checkbox` a controlled input: after passing `change` on, put the
input back on `checked`. A parent that accepts the change, whether at
once or after "Yes", changes `checked`, and Vue then sets the input to
match. Remove the two `preventDefault()` calls in `TableCellSelect`,
which do nothing:

```diff
--- a/lib/ui-library/src/components/Checkbox/Checkbox.vue
+++ b/lib/ui-library/src/components/Checkbox/Checkbox.vue
-			@change="emit('change', $event)"
+			@change="onChange"
 ...
+function onChange(event) {
+	emit('change', event);
+	event.target.checked = props.checked;
+}
```

The whole change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-answer-box-screen-reader-state/fix.diff).
The fix belongs in `Checkbox` because that component already draws its
icon from `checked`, so it is the one place that can keep its input
agreeing with that prop. It covers every way of leaving the question,
and the JATS box as well. Every parent of `Checkbox` already updates
`checked` when it accepts a change, since its icon would be wrong
otherwise, so no caller changes behavior. The JATS box's own reset on
"Cancel" becomes redundant but does no harm.

The order of the two lines in `onChange()` matters: emit first, then
reset. `WorkflowPublicationJats.handleVisibilityChange()` reads the
toggled `event.target.checked` in its handler to choose its question and
the value it saves. If the reset ran first, that box would ask the
opposite question and save the old value.

The fix was tried on all three apps. After "No" each box read as it
looked; after Escape on the template screen too. "Yes" still saved
(start, close, auto-add on and off), and the workflow files' box with no
question still ticked and unticked.

Alternatives:

- Put the input back in `TableCellSelect.onChange()` before opening the
  question (`$event.target.checked = isChecked.value`). This covers the
  five questions, Escape and a click outside, but leaves the JATS box's
  dismissal as it is.
- Reset the input in each "No" callback, as the JATS box does. This
  misses Escape and a click outside.
- Cancel the `click` instead of the `change`. That needs `Checkbox` to
  pass `click` on, and it changes what keyboard and pointer users trigger.

What goes with it:

- No stored data is wrong, and no API or plugin hook changes.
- Test: ui-library has no component tests (its Vitest tests cover
  composables and stores), so the test is an e2e check in the U37
  scenarios that reads the box's checked state after "No" (Playwright
  `isChecked()` on the row's input).

Small: a few lines in one ui-library component, plus the e2e check.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-answer-box-screen-reader-state/walk.js)
  takes the Steps. It reads each box's icon (the path of ui-library's
  `CheckboxTicked` or `Checkbox`) and its state in the accessibility tree
  (Playwright `isChecked()` and the cell's aria snapshot), and records
  every non-GET request a press sends.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-answer-box-screen-reader-state/neighbour.js)
  covers the box with no question in "Attach Workflow Files", "Yes" on
  "Start this task" and "Close this Task", Escape on "Confirm Automatic
  Addition", and "Yes" on it in both directions.
  [again.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/no-answer-box-screen-reader-state/again.js)
  presses each box again after "No" (the Impact's second press), driven
  on OJS. Each script runs on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/no-answer-box-screen-reader-state/walk.js`.
- With the fix applied (the JavaScript rebuilt), walk.js and
  neighbour.js were run on each app. Without the fix, neighbour.js gave
  the same results except Escape, which left the box reading "checked".
- Driven on OJS, OMP and OPS `main`, on PostgreSQL; the fault does not
  depend on the database. Dataset: pkp/datasets c657990 (2026-10-01).
  On OPS, "Attach Workflow Files" listed no file at Production, so the
  box with no question was read on OJS and OMP only. The browser's
  accessibility tree stands in for a screen reader; no screen reader
  was run.
- `stable-3_5_0` was walked on the three apps. The Production stage
  shows the legacy "Production Discussions" grid (no tasks), and
  Settings › Workflow has no "Tasks and Discussions" tab. In the code,
  the grid's "Closed" box (`QueriesGridCellProvider::getCellActions()`)
  is a plain `AjaxAction` to `closeQuery`/`openQuery` with no question,
  and ui-library's `TableCellSelect` there is a bare input with no
  confirmation.
- 3.4 and 3.3 were read in the code: pkp-lib
  `QueriesGridCellProvider` (`.inc.php` on 3.3) has the same plain
  `AjaxAction`, and ui-library has no `TableCellSelect` or `Checkbox`.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `Checkbox.vue` and
  `TableCellSelect.vue` are the same in all three. `stable-3_5_0`: OJS
  c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e, OPS 8eaf899468 (lib/pkp
  1fb843f491), lib/ui-library d4e01883. `stable-3_4_0`: pkp-lib
  32b0f4b4af, ui-library ee684b34. `stable-3_3_0`: pkp-lib f6ab331645,
  ui-library 96959f9e.
- A search of ui-library for `openDialog` next to a checkbox found no
  other box behind a question (`DoiListItem.vue` asks none).
- Introduced: `git blame` on the `preventDefault()` lines of
  `TableCellSelect.vue` gives 652ce6460, which also created
  `Checkbox.vue`. Before it, the table's boxes had no question. The
  auto-add box joined in 111b9aa7 (`pkp/ui-library#703` for
  `pkp/pkp-lib#11826`).
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library were searched for
  the symptom's words and for `TableCellSelect`. `pkp/pkp-lib#11825` and
  `pkp/pkp-lib#11291` list the confirmations but say nothing about the
  state after "No".
- Unverified: the JATS "Make public" box after Escape (code only).
