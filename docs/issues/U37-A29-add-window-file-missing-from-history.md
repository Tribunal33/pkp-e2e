# A file attached to the first message in the "Add" window never shows in the discussion's History

- **Severity** low
- **Effort** small
- **Kind** intention gap
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no History for a discussion)
  - 3.4: none (code; no History for a discussion)
  - 3.3: none (code; no History for a discussion)
- **Introduced** `pkp/pkp-lib#12344` for `pkp/pkp-lib#12248` · [756d7004a1](https://github.com/pkp/pkp-lib/commit/756d7004a11f581e9757740ac2ed3c0a09ebaf1a) · merged 2026-02-15 · Vitaliy Bezsheiko (Vitaliy-1); the reply's "… uploaded by …" line followed in `pkp/pkp-lib#12451` · [c69d929b26](https://github.com/pkp/pkp-lib/commit/c69d929b26472e4e810aac9f294742eefe7f9a3e) · merged 2026-03-15
- **Upstream** none found (2026-10-12)
- **Tracked in** spec U37 [A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a29)
- **Checked** 2026-10-12, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-12: the order of History lines saved within one second
is a fault of its own, reported as
[pkp-e2e#948](https://github.com/jardakotesovec/pkp-e2e/issues/948).
The fix proposed here does not depend on it, and the Proposed fix says
how the two go together. Walked again on each branch's tip, with the
fix tried again. A sentence of Evidence said the History's sort would
work with its argument written as pairs; it would not, and Evidence now
says so.

## Summary

Someone starts a discussion or task with the "Add" button of a stage's
"Tasks & Discussions" panel and attaches a file to its first message.
That file gets no "{file name} uploaded by …" line in the discussion's
or task's History, so the History has no "Download" link for it. Files
attached to a reply, or added later through "Edit", do get that line.

The file itself is not lost: it stays under the first message, where it
can still be opened. When it is later taken off through "Edit", it is
gone from the message and the History logs "… removed by …", so the
History shows the file leaving but never arriving.

The History is on `main` alone, so no released install holds such a
discussion or task. Those started this way on an install that runs
`main` keep the gap after a fix.

## Impact

- **Lost**: no work and no file; nobody is told that the History leaves
  the file out.
- **Who**: whoever may open "History":
  - the site administrator;
  - on a journal or press, its Manager, Editor and Production editor;
    on a preprint server, the Preprint Server manager;
  - the person who started the discussion or task, and a task's owner.
- **Way round**: while the file is attached, open the discussion or
  task: its first message shows the file, with its link, and who
  posted it. Once the file is removed, the submission's "Activity Log"
  still lists its upload, with the date and the person (by the code;
  not opened on screen). Only a file attached in the "Add" window lacks
  its History line, so it came from the person who started the
  discussion or task, when they started it.

Low: nothing is lost, and the History misses one line.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, with nothing added.
- The submission, at its Production stage:
  - OJS: submission 5, "Genetic transformation of forest trees"; the
    participant is David Buskins (`dbuskins`).
  - OMP: submission 4, "How Canadians Communicate: Contexts of Canadian
    Popular Culture"; the participant is Graham Cox (`gcox`).
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production"; the participant is David Buskins
    (`dbuskins`).
- Two small files on your computer, here `figure.png` and
  `replacement.pdf`.

Adding a discussion with a file:

1. Sign in as `dbarnes`.
2. Open the submission's workflow at its Production stage by its
   address, with the submission's number from the list above (OJS
   shown):
   `<your install>/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`.
   On the preprint server `dbarnes` is assigned to no submission, so
   the dashboard's "Assigned to me" list is empty there.
3. Under "Production Tasks & Discussions", press "Add".
4. "Name": `u37r14 file at Add`. Tick the participant named above.
5. Type `Please see the attached file.` as the message.
6. In the message box's toolbar, press "Attach Files" › "Upload File" ›
   choose `figure.png` › "Attach Files". The file is listed under the
   message box.
7. Press "Save".
8. On the new row, open "More Actions" › "History".

Expected: the History lists two lines: "figure.png uploaded by dbarnes
on 2026-10-12", with a "Download" link in its row, and "Discussion
created by dbarnes (…) on 2026-10-12".

Observed: one line only (OJS shown; OMP reads "Press editor", OPS
"Preprint Server manager"), and no "Download" link:

```
Discussion created by dbarnes (Journal editor) on 2026-10-12
```

Replying with a file (the control):

9. Close "History" with the X in the window's header (labelled "Close"
   for screen readers). Press the discussion's name, then "Add New
   Message". Type `A second file.`, then "Attach Files" › "Upload File"
   › `replacement.pdf` › "Attach Files". Press "Save", then close the
   window with the same X.
10. "More Actions" › "History".

Observed: the reply's file is logged, with "Download", and figure.png
still is not:

```
dbarnes (Journal editor) posted a response on 2026-10-12
replacement.pdf uploaded by dbarnes on 2026-10-12        Download
Discussion created by dbarnes (Journal editor) on 2026-10-12
```

The reply's two lines can be listed the other way round, depending on
whether they were saved within one second. That is the fault of
[pkp-e2e#948](https://github.com/jardakotesovec/pkp-e2e/issues/948),
not this one.

Removing the first message's file:

11. Close "History". Open "More Actions" › "Edit". Under the message
    box, press figure.png's "Remove", then "Save".
12. "More Actions" › "History".

Observed: the removal is logged, but the upload never was:

```
figure.png removed by dbarnes on 2026-10-12
dbarnes (Journal editor) posted a response on 2026-10-12
replacement.pdf uploaded by dbarnes on 2026-10-12        Download
Discussion created by dbarnes (Journal editor) on 2026-10-12
```

## Cause

`EditorialTaskController::addTask()` (lib/pkp
`api/v1/submissions/tasks/EditorialTaskController.php`, lines 196–240)
saves the discussion or task and logs `SUBMISSION_LOG_TASK_CREATED`, but
it never logs the files saved with the first message.
`EditorialTask::save()` stores them through `SaveNoteWithFiles::manageFiles()`: an upload
(`temporaryFileIds`) becomes a submission file attached to the first
message, and a workflow file (`submissionFileIds`) is copied the same
way.

The "… uploaded by …" History line is written only by `logTaskFiles()`
(line 1180), and only two methods call it:

- `editTask()` (from line 367; the call is at line 409) compares the
  first message's files before and after an edit, and logs those added
  and those removed. That is why a file attached at "Add" gets its "…
  removed by …" line when an edit takes it off.
- `addNote()` (from line 726; the call is at line 786) logs a reply's
  files.

`pkp/pkp-lib#12248` asked for "File Attached … Logged for any file
uploaded to the discussion". `pkp/pkp-lib#12344` (756d7004a1) added
`logTaskFiles()` to `editTask()` only, and `pkp/pkp-lib#12451`
(c69d929b26) added it to `addNote()`. Both changed the created line
that `addTask()` logs, and neither added a file log there.

Reach:

- A task started with a file in the "Add" window goes through the same
  `addTask()` (code).
- A workflow file attached at "Add" ("Attach Files" › "Attach Workflow
  Files") is copied onto the first message the same way and is not
  logged either (code).
- The other ways to start a discussion add no files: the participant
  "Notify" (`PKPStageParticipantNotifyForm`), `Repository::addQuery()`
  and the discussions and tasks auto-added from templates
  (`Repository::autoCreateFromTemplates()`) (code).
- The History's "Download" link is built in `TaskResource` only from
  `SUBMISSION_LOG_TASK_FILE_UPLOADED` entries, so a file without that
  entry has no "Download" row (code; seen on screen).

## Proposed fix

In `addTask()`, once the discussion or task is saved and its creation
logged, log the first message's files with the same `logTaskFiles()`
call that `addNote()` makes for a reply
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/fix.diff)).

```diff
@@ addTask()
         Repo::eventLog()->add($eventLog);
 
+        // Log the files attached to the first message, as addNote() and editTask() do for theirs
+        $headnote = $editorialTask->notes->where(fn (Note $note) => $note->isHeadnote == true)->first();
+        if ($headnote) {
+            $headnoteFiles = Repo::submissionFile()->getCollector()
+                ->filterByAssoc(PKPApplication::ASSOC_TYPE_NOTE, [$headnote->id])
+                ->getMany()
+                ->toArray();
+            $this->logTaskFiles($headnoteFiles, $submission, $editorialTask, $currentUser);
+        }
+
         $newParticipants = $editorialTask->participants->pluck('userId')->toArray();
```

Tried on all three apps: the walk then shows "figure.png uploaded by
dbarnes on 2026-10-12" with "Download" after step 8. In the control, an
"Add" without a file still logged only the created line, and an "Edit"
that changes only the name added no second "… uploaded by …" line.
Through `logTaskFiles()` the new line names the real person during
"Login As", as the other file lines do (code).

The fix makes the line exist. Whether it is listed above or below
"Discussion created by …" is the History's ordering, which this fix
leaves alone:

- The created line carries the creation time and is saved first.
  `logTaskFiles()` stamps the current time on the file's line, saved
  right after it.
- In five of the six walks with this fix alone, the two lines were
  saved within one second, and the History listed "figure.png uploaded
  by …" below "Discussion created by …", as if the file came first. In
  the sixth the file's line fell in the next second and was listed on
  top.
- `logTaskFiles()` takes no date. Adding a date argument to pass the
  creation time through would not help: the two lines would then share
  a second every time.

The History has no order for lines of one second: they are listed as
the database returns them. That is the fault of
[pkp-e2e#948](https://github.com/jardakotesovec/pkp-e2e/issues/948).
Its fix
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/history-same-second-order/fix.diff))
adds the entry's id as a second order column to the event log's query
in `Collector.php` and takes a sort that sorts nothing out of
`TaskResource.php`. With both fixes applied, the walk listed
"figure.png uploaded by …" above "Discussion created by …" on all three
apps, the two lines saved within one second on each.

The recommendation: merge the two together if both are ready, since
only then is the new line listed in its place. Neither waits for the
other. This fix alone adds the line, listed below the created line
when the two share a second, which is the fault the History already
has for a reply's and an edit's lines.

**Alternatives**

- Log in `SaveNoteWithFiles::manageFiles()`. The model would then write
  event-log entries, which every other task event leaves to the
  controller. It would also log twice on the `addNote()` and
  `editTask()` paths unless those calls were removed.
- Have `TaskResource` list the first message's files as History rows
  without a log entry. That builds a History line from something other
  than the log, and leaves the log itself incomplete.

**What goes with it**

- No data repair. The feature is only on `main`, so no released install
  holds discussions or tasks without these lines.
- The two fixes change no file in common (this one
  `EditorialTaskController.php`), so the two diffs apply together as
  they stand.
- A guard. pkp-lib's tests are unit tests under `tests/classes` and
  `tests/jobs`, with none for the tasks API. The nearest test
  is OJS's `cypress/tests/integration/Discussions.cy.js`, which
  attaches no file and opens no History: a discussion started with a
  file, then its History expected to hold the "… uploaded by …" line (a
  suggestion, not tried).

Small: one call in one method, following `addNote()`, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/walk.js)
  takes the Steps as `dbarnes` on each app:
  `PROBE_FEATURE=<dataset fleet> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/add-window-file-missing-from-history/walk.js`.
  After each "History" it reads the discussion's rows of `event_log`
  (`log_id`, `date_logged`, `event_type`), which is how the report knows
  which lines shared a second and in which order they were saved.
- Control:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/neighbour.js),
  run the same way: "Add" without a file, and "Add" with figure.png
  followed by an "Edit" of the name only. Walked with the fix and
  without it; without it, both show the created line only.
- The fix's trial, on 2026-10-12: `node bin/try-fix.js apply
  shared/playwright/checks/issues/add-window-file-missing-from-history/fix.diff
  ojs omp ops`, a freshly loaded dataset, the walk and neighbour.js,
  then `node bin/try-fix.js revert` with the same arguments and
  neighbour.js again.
  - The created line and figure.png's line as saved: OJS both at
    03:11:09 and OPS both at 03:12:04 (History: the created line on
    top); OMP 03:11:38 and 03:11:39 (History: figure.png's line on
    top).
  - The first trial, on 2026-10-02, had the two lines in one second on
    all three apps, each History with the created line on top. With
    the three walks above, those are the six walks of the Proposed fix.
- The two fixes together, on 2026-10-12: the two diffs were joined into
  one patch file, which was applied and reverted the same way, and the
  walk was run on a freshly loaded dataset. The two lines were saved at
  03:13:58 on OJS, 03:14:24 on OMP and 03:14:48 on OPS. The control was
  not walked with both fixes.
- The fix's hunk changes the same lines of `addTask()` as the fix in
  [U37-A3-writer-told-of-own-message.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A3-writer-told-of-own-message.md).
  The two changes are independent, but applying both needs a manual
  merge.
- Walked on OJS, OMP and OPS `main` on 2026-10-12, 03:08–03:16 UTC, on
  PostgreSQL, each walk on a freshly loaded dataset (pkp/datasets
  fac2371, 2026-10-11). No request failed and no page script failed. The
  fault does not depend on the database. Where the fix's new line
  is listed within a second does: MySQL and MariaDB not checked.
- `stable-3_5_0`: walked on the three apps with the same script
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front). The stage has
  the older "Production Discussions" grid; "Add discussion" with the
  participant, a subject, a message and figure.png, then the row's
  actions: "Edit" and "Delete" only, no History.
- The Steps' wording against the walk: step 2's address is the one the
  walk opens. On OPS the dashboard behind the workflow read "Assigned
  to me (0)". Whether the submission can be opened from another
  dashboard view there was not walked.
- Code reads:
  - The cause, on `main`. `EditorialTaskController.php` is the same file
    in the three apps' lib/pkp.
  - Once the file is removed: `SaveNoteWithFiles::manageFiles()`
    deletes a file taken off the first message
    (`Repo::submissionFile()->delete()`), so the message no longer shows
    it. Its upload was also logged against the submission
    (`submission.event.fileRevised`, "Revision "{$filename}" was
    uploaded for file {$submissionFileId}."), which the submission's
    "Activity Log" lists (`SubmissionEventLogGridHandler::loadData()`),
    and `delete()` leaves that entry. The entry was read in the
    database of each app after an "Add" with figure.png. Neither the
    discussion after step 11 nor the "Activity Log" was opened on
    screen.
  - Who may open "History": the registry's manager-level groups
    (`registry/userGroups.xml`, role id `0x00000010`) are three on OJS
    and OMP and one on OPS.
  - The History's order: the event-log `Collector` orders by
    `date_logged` alone (line 116). The `sortBy()` in
    `TaskResource::toArray()` (lines 62–66) sorts nothing, as it is
    written or with its argument written as pairs: the
    [sortcheck.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/history-same-second-order/sortcheck.php)
    of pkp-e2e#948, run from OJS's root on 2026-10-12.
  - The "Download" link's stage: `TaskResource.php` (line 118) takes it
    from the log entry and falls back to the task's own.
  - The guard: lib/pkp's `tests/` and OJS's
    `cypress/tests/integration/Discussions.cy.js` were searched for a
    file attached and a History opened.
  - `stable-3_5_0` lib/pkp has no `classes/editorialTask`, no tasks API
    and no `submission.event.task.*` texts; its `QueriesGridRow` offers
    `editQuery` and `deleteQuery`.
  - pkp-lib `stable-3_4_0` and `stable-3_3_0`:
    `controllers/grid/queries/QueriesGridRow` offers only `editQuery`
    and `deleteQuery`, and there is no task file log.
- The trace, made on 2026-10-02 and not repeated, the controller being
  unchanged since: `git log -L` on `logTaskFiles()` and `-S
  logTaskFiles` find only the two commits the Cause names, and the
  GitHub API names their PRs. c69d929b26 also changed the method's
  signature. Read again on 2026-10-12: both commits have hunks in
  `addTask()`. `pkp/pkp-lib#12248` was closed on 2026-03-18.
- Upstream: searched on 2026-10-12 in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops and pkp/ui-library, by the symptom ("discussion history file
  uploaded", "task history attached file") and by the code
  (`logTaskFiles`, "addTask file log"). Only the feature's own issues
  came up (`pkp/pkp-lib#12248`, `#11825`, `#12117`) and issues that
  are about other faults by their titles and the text the search
  matched (`pkp/pkp-lib#5836`, `#6003`, `#11320`).
- Tips: OJS `main` d0b69b108d (lib/pkp 1ec9023e8a), OMP `main`
  eb4c30aa3c and OPS `main` 8d04ca333c (lib/pkp 58c7f454ff),
  lib/ui-library 38814ea1. `stable-3_5_0`: OJS c90dfdb577 (lib/pkp
  f4f8fcdbc0), OMP 486cbf9eb0 and OPS 399c4ebca3 (lib/pkp 8094f06bf5),
  lib/ui-library 2576e00a. pkp-lib `stable-3_4_0` 55c8e406b3 and
  `stable-3_3_0` 5e84acd11b.
- Not driven:
  - A task started with a file, and a workflow file attached at "Add".
    Both go through the same `addTask()` and are read in the code only.
  - With the fix, the "Download" link was seen but not pressed. It is
    built the same way as the reply file's link.
