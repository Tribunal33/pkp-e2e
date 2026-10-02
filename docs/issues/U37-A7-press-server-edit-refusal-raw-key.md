# A press or preprint server refuses a discussion edit with a raw key, not the reason

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP, OPS
  - 3.5: none (code; no tasks or edit limits)
  - 3.4: none (code; no tasks or edit limits)
  - 3.3: none (code; no tasks or edit limits)
- **Introduced** `pkp/pkp-lib#12313` and `pkp/ojs#5328` for `pkp/pkp-lib#12278` · [072b8e9910](https://github.com/pkp/pkp-lib/commit/072b8e9910b2d2ef263e3ece1252750b1559f89f), [05ade99f1e](https://github.com/pkp/ojs/commit/05ade99f1e0e56a51959c36ef3e97e7ffdea89ee) · committed 2026-03-22, merged 2026-03-31 · Hafsa-Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Where a journal refuses an edit with "You can only edit your own
discussion message." or "This discussion message can only be edited
within 1 hour of creation.", a press and a preprint server print
"##submission.task.validation.error.headnote.author##" or
"##submission.task.validation.error.headnote.editExpired##".

The refusal itself is right. It is the reason that is lost: an author or
an assistant role (a Copyeditor, a Layout Editor) who presses "Save" in a
discussion's or task's "Edit" window reads a code under the message box
and cannot tell what to change.

## Impact

- **Lost**: nothing stored or sent; the person is not told why the save
  was refused.
- **Who**: on a press or a preprint server, an Author or assistant role
  who edits the first message of a discussion or task someone else wrote,
  or their own first message more than an hour after writing it, in any
  stage's "Tasks & Discussions" panel.
- **Way round**: no data is at stake. The person can ask an editor, who
  is allowed to make the same edit (checked: `dbarnes`'s edit saves).

Low: a raw translation key in place of a correct refusal's reason.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (OMP or OPS; OJS for the control).
- The submission and the second person:
  - OMP: submission 7, "Accessible Elements: Teaching Science Online and
    at a Distance" (Copyediting); the Copyeditor `mfritz`.
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production" (Production); its Author `ccorino`.
  - OJS (control): submission 3, "The Facets Of Job Satisfaction: A
    Nine-Nation Comparative Study Of Construct Equivalence"
    (Copyediting); the Copyeditor `mfritz`.

Someone else's first message:

1. Sign in as `dbarnes` and open the submission's "Copyediting Tasks &
   Discussions" (OPS: "Production Tasks & Discussions"). Press "Add".
2. "Name" "Copyedit the manuscript"; tick the second person; tick "Enter
   task information"; "Due Date" two weeks ahead; "Task Owner" the
   second person; message "Please copyedit the manuscript."; "Save".
3. Sign out and sign in as the second person. Open the same panel (OPS:
   the preprint's "Production Tasks & Discussions" entry).
4. On "Copyedit the manuscript", "More Actions" › "Edit". Replace the
   message with "Rewritten by the owner." and press "Save".

Their own first message, past the hour:

5. Still as the second person, press "Add". "Name" "Own notes"; tick
   `dbarnes` (OPS: `dbuskins`); message "My own notes."; "Save".
6. Wait more than an hour.
7. On "Own notes", "More Actions" › "Edit". Replace the message with "My
   own notes, edited." and press "Save".

**Expected**: after step 4, under the message box, "You can only edit
your own discussion message."; after step 7, "This discussion message
can only be edited within 1 hour of creation." The window stays open.

**Observed** (OMP and OPS): the window stays open with "Please correct
one error." and, under the message box, after step 4:

```
##submission.task.validation.error.headnote.author##
```

after step 7:

```
##submission.task.validation.error.headnote.editExpired##
```

The screen-reader list of errors reads the same key. Both saves answer
`422` with that key as the `description` error.

Control: OJS shows both sentences. On all three apps, `dbarnes`'s edit
of the task's message saves (checked).

## Cause

`EditTask::rules()` (lib/pkp
`api/v1/submissions/tasks/formRequests/EditTask.php`, lines 103–110)
refuses the edit with `__('submission.task.validation.error.headnote.author')`
and `__('submission.task.validation.error.headnote.editExpired')`. The
rule is shared code, but the two English texts exist only in OJS's own
`locale/en/locale.po` (lines 378–382), not in any pkp-lib locale file.
OMP and OPS do not define them either, so `Locale::get()` returns the
key wrapped in `##` there. Only these two refusals are affected: every
other key the task form's validation uses is defined in pkp-lib.

Both changes came with `pkp/pkp-lib#12278` ("Enforce 1-hour edit window
for discussion messages"): pkp-lib 072b8e9910 replaced the earlier
`api.403.forbidden` with the two new keys, and OJS 05ade99f1e added
their texts. The issue and the PR name OJS only, and no OMP or OPS PR
followed.

Reach:

- Either refusal can appear on any save of an existing discussion or
  task. "Edit" and "Add Task Details" both save it with a `PUT` that
  `EditTask` checks. "Edit" was walked; "Add Task Details" was read in
  the code. "Add" never shows them, because the rule needs an existing
  item.
- No other task or discussion text has the same gap. A scan compared
  the keys lib/pkp's PHP passes to `__()` with the English locale files
  of pkp-lib, OJS, OMP and OPS. These two are the only task keys that
  some apps lack.
- The same closure is the subject of
  [U37-A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A6-task-owner-cannot-save-edit.md)
  (a task's owner refused an edit). Its fix changes when the
  own-message refusal fires, not its text.

## Proposed fix

Move the two texts into pkp-lib, beside the other
`submission.task.validation.error.*` keys in `locale/en/submission.po`,
and drop OJS's copies
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-refusal-raw-key/fix-ojs.diff);
OMP and OPS take the pkp-lib half alone,
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-refusal-raw-key/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-refusal-raw-key/fix-ops.diff)):

```diff
--- a/lib/pkp/locale/en/submission.po
+++ b/lib/pkp/locale/en/submission.po
@@ -2574,6 +2574,12 @@
 msgid "submission.task.validation.error.assignment.required"
 msgstr "Participant must be assigned to the submission in the current stage or be a reviewer."
 
+msgid "submission.task.validation.error.headnote.author"
+msgstr "You can only edit your own discussion message."
+
+msgid "submission.task.validation.error.headnote.editExpired"
+msgstr "This discussion message can only be edited within 1 hour of creation."
+
 msgid "submission.task.dueInterval.1week"
 msgstr "1 week"
 
```

Weblate then offers them for every language of every app. Tried on all
three apps: the steps now show the two sentences on OMP and OPS. On OJS
the same sentences still show, now from pkp-lib, and `dbarnes`'s edit
still saves.

**Alternatives**:

- Copy the two entries into OMP's and OPS's `locale/en/locale.po`:
  three copies of one shared rule's texts, and a fourth app or plugin
  would hit the same gap.
- Revert to `api.403.forbidden`: a text every app has, but it says
  nothing about the rule, which is what `pkp/pkp-lib#12278` added these
  texts for.

**What goes with it**:

- An e2e check that reads both sentences on a press and a preprint
  server, not just the refusal.

Small: two entries move from OJS's locale file to pkp-lib's, with no
code change.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-refusal-raw-key/walk.js)
  takes steps 1–7 and the control on each app. Run it on an install
  freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edit-refusal-raw-key/walk.js`.
  It does not wait an hour (step 6). Instead it moves the new first
  message's creation time two hours back. On PostgreSQL:
  `UPDATE notes SET date_created = date_created - interval '2 hours' WHERE is_headnote AND contents LIKE '%My own notes.%'`.
  On MySQL or MariaDB:
  `UPDATE notes SET date_created = date_created - INTERVAL 2 HOUR WHERE is_headnote AND contents LIKE '%My own notes.%'`.
- Walked on OJS, OMP and OPS `main` on 2026-10-02, on PostgreSQL.
  Dataset: pkp/datasets c657990 (2026-10-01). No server error and no
  script error was recorded.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `EditTask.php` and
  `locale/en/submission.po` are the same in the two lib/pkp commits.
  `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88e,
  OPS 8eaf899468 (lib/pkp 1fb843f491). pkp-lib `stable-3_4_0` 32b0f4b4af
  and `stable-3_3_0` f6ab331645; OJS `stable-3_4_0` 75cc2d488b,
  `stable-3_3_0` ac77c9fb35.
- Code reads of the older lines: `stable-3_5_0`'s lib/pkp has no
  `classes/editorialTask`, no task API and neither key. Its discussions
  are the older Queries form (`QueryForm`), which has no own-message or
  one-hour refusal. pkp-lib `stable-3_4_0` and `stable-3_3_0` hold no
  file under `classes/editorialTask` or `api/v1/submissions/tasks`.
  3.5 was read, not walked, since it has no such refusal.
- Trace: `git blame` on `EditTask.php` lines 104 and 109 gives
  072b8e9910; the rule itself came in dae787f9c2 (same PR, with
  `api.403.forbidden`). `git blame` on OJS `locale/en/locale.po` 378–382
  gives 05ade99f1e. The GitHub API's `commits/<sha>/pulls` names
  `pkp/pkp-lib#12313` and `pkp/ojs#5328`, both merged 2026-03-31.
- Tracker search (2026-10-02, pkp/pkp-lib, pkp/omp, pkp/ops,
  pkp/ui-library): "headnote", "only edit your own discussion",
  "within 1 hour", "editExpired", "submission.task.validation". Only
  `pkp/pkp-lib#12278` (closed), the change itself, matched.
