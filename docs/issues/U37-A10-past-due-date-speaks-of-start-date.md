# A task's "Due Date" before today is refused with a message about a start date

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** `pkp/pkp-lib#12451` for `pkp/pkp-lib#12248` · [be9d75f5c5](https://github.com/pkp/pkp-lib/commit/be9d75f5c5825732c927187083c0c94c0ca8df21) · committed 2026-03-14, merged 2026-03-15 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A "Due Date" before today, typed into the box, is refused on "Save"
with "Start date should be greater than or equal to today"; the form has
no start date.

The wording sends the editor looking for a field the window does not
have. The date picker greys the days before today, so only a date typed
by hand triggers this message.

## Impact

- **Lost**: nothing. The other fields stay filled in the open window;
  the task is not saved until the date is changed.
- **Who**: anyone who adds a task, or edits one, in a stage's "Tasks &
  Discussions" panel and types a past date into "Due Date".
- **Way round**: the error sits under "Due Date", so the editor can guess
  what it means and pick today or a later day.

Low: the refusal is correct and only its wording names the wrong field.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OJS, OMP or OPS).
- The submission and the task's owner:
  - OJS: submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
    Comparative Study Of Construct Equivalence" (Copyediting); the
    Copyeditor `mfritz`.
  - OMP: submission 7, "Accessible Elements: Teaching Science Online and
    at a Distance" (Copyediting); the Copyeditor `mfritz`.
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production" (Production); its Author `ccorino`.

1. Sign in as `dbarnes` and open the submission's "Copyediting Tasks &
   Discussions" (OPS: "Production Tasks & Discussions"). Press "Add".
2. "Name" "Past due date"; tick the owner; tick "Enter task
   information".
3. In the "Due Date" box, type the day, month and year of a date two
   days before today into the box's segments, without opening the
   picker.
4. "Task Owner" the owner; message "Due date check."; press "Save".

**Expected**: the window stays open with a message under "Due Date"
that speaks of the due date, such as "The due date cannot be earlier
than today."

**Observed**: the window stays open with "Please correct one error."
and, under "Due Date":

```
Start date should be greater than or equal to today
```

The save answers `422` with that text as the `dateDue` error.

Control: the same window with today's date saves, and the task is
listed due today.

## Cause

`EditTask::messages()` (lib/pkp
`api/v1/submissions/tasks/formRequests/EditTask.php`, line 314) maps
the due date's `after_or_equal:today` rule to `validation.after_or_equal`.
That key is defined only in the user invitations' locale file,
`locale/en/invitation.po` (line 358), as "Start date should be greater
than or equal to today".

The mapping is needed; only its key is wrong. PKP's validator
(`ValidationServiceProvider::registerValidationFactory()`, its
`getMessage()` override) fills in a rule's default message from the
`validator.<rule>` keys that `ValidatorFactory::getMessages()` lists.
That list has `after` but no `after_or_equal`, so without `messages()`
the refusal would read `##validator.after_or_equal##`.

be9d75f5c5 (`pkp/pkp-lib#12248`) changed the rule from `after:today` to
`after_or_equal:today` so that a task may be due today, and added the
mapping with it. Before that change, the rule took the default
`validator.after` text, "This date must be after {$date}.". Laravel fills
`{$date}` by looking up `validation.values.dateDue.today`, which no
locale defines. So by the code, a past date then read "This date must be
after ##validation.values.dateDue.today##.": the message was never
right.

Reach:

- "Add", "Edit" and "Add Task Details" all save through `EditTask`
  (`AddTask` extends it), so all three show the same text. "Add" was
  walked; the other two were read in the code.
- This refusal is the only place the text appears. No rule in pkp-lib
  names `validation.after_or_equal`, no invitation rule uses
  `after_or_equal` (an invitation's `dateStart` is `required|date`), and
  nothing in the ui-library names the key. PKP's validator never looks
  `validation.<rule>` keys up by itself.

## Proposed fix

Give the task's due date a message of its own, beside the other task
validation texts in pkp-lib's `locale/en/submission.po`, and point the
mapping at it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/past-due-date-start-date-text/fix.diff)):

```diff
--- a/lib/pkp/api/v1/submissions/tasks/formRequests/EditTask.php
+++ b/lib/pkp/api/v1/submissions/tasks/formRequests/EditTask.php
@@ -311,7 +311,7 @@
     public function messages(): array
     {
         return [
-            'dateDue.after_or_equal' => __('validation.after_or_equal'),
+            'dateDue.after_or_equal' => __('submission.task.validation.error.dateDue.past'),
         ];
     }
 
--- a/lib/pkp/locale/en/submission.po
+++ b/lib/pkp/locale/en/submission.po
@@ -2556,6 +2556,9 @@
 msgid "submission.task.validation.error.participant.responsible"
 msgstr "There should be one user responsible for the task."
 
+msgid "submission.task.validation.error.dateDue.past"
+msgstr "The due date cannot be earlier than today."
+
 msgid "submission.task.validation.error.participant.creator"
 msgstr "The creator must participate in the task/discussion."
 
```

The change keeps what be9d75f5c5 was for: today is still accepted. It
was tried on all three apps. The steps now show "The due date cannot be
earlier than today." under "Due Date", and today's date still saves. The
wording is a proposal.

**Alternatives**:

- Drop `messages()`. It was tried on OJS: the refusal then reads
  `##validator.after_or_equal##`, as the Cause says.
- Add a general `after_or_equal` default to
  `ValidatorFactory::getMessages()` ("This date must be on or after
  {$date}."). It was tried on all three apps, and the refusal read "This
  date must be on or after ##validation.values.dateDue.today##.". A
  general default needs a second change, to how Laravel's `{$date}` value
  is translated, before it reads well.
- Reword `validation.after_or_equal` itself. The key is named after the
  rule, not the task, so any later rule that maps to it would show the
  task's wording.

**What goes with it**:

- The invitations' `validation.after_or_equal` entry is unused once
  this lands. It can be deleted in the same change, with its
  translations in about 20 `invitation.po` files.
- The new key is English only. Other languages show the English text
  until Weblate translates it, as with any new key.
- An e2e check that reads the message under "Due Date" after a typed
  past date.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/past-due-date-start-date-text/walk.js)
  takes steps 1–4 and the control on each app. Run it on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/past-due-date-start-date-text/walk.js`.
  It sets the box's value with Playwright's `fill()` (`YYYY-MM-DD`)
  rather than typing the segments.
- Walked on OJS, OMP and OPS `main` on 2026-10-02, on PostgreSQL. The
  date rule runs in PHP, so it does not depend on the database. Dataset:
  pkp/datasets c657990 (2026-10-01). No server error and no script error
  was recorded.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `EditTask.php`,
  `ValidatorFactory.php`, `locale/en/common.po` and
  `locale/en/submission.po` are the same in the two lib/pkp commits.
  `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e,
  OPS 8eaf899468 (lib/pkp 1fb843f491). pkp-lib `stable-3_4_0` 32b0f4b4af
  and `stable-3_3_0` f6ab331645.
- Code reads of the older lines: `stable-3_5_0`'s lib/pkp has no
  `classes/editorialTask`, no task API and no `after_or_equal:today`
  rule, and its discussions (`QueryForm`) have no due date. pkp-lib
  `stable-3_4_0` and `stable-3_3_0` hold no file under
  `classes/editorialTask` or `api/v1/submissions/tasks`. 3.5 was read,
  not walked, since it has no task to take the steps on.
- The message before be9d75f5c5 was read in the code (be9d75f5c5^'s
  `ValidatorFactory.php`, `ValidationServiceProvider.php`, `common.po`),
  not driven.
- Tracker search on 2026-10-02.
