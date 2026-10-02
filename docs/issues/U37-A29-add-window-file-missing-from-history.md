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
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A29](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a29)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Someone starts a discussion or task with the "Add" button of a stage's
"Tasks & Discussions" panel and attaches a file to its first message.
That file gets no "{file name} uploaded by …" line in the discussion's
or task's History, so the History has no "Download" row for it. Files
attached to a reply, or added later through "Edit", do get that line.

When the file is later taken off through "Edit", the History logs "…
removed by …", so it shows the file leaving but never arriving. The file
itself stays under the first message, where it can still be opened.
Discussions and tasks already started this way keep the gap after a fix.

## Impact

- **Lost**: no work and no file; nobody is told that the History leaves
  the file out.
- **Who**: whoever may open "History": the site administrator, the
  Journal or Press Manager, the Editor and the Production editor (on a
  preprint server, its Manager), the person who started the discussion
  or task, and a task's owner.
- **Way round**: open the discussion or task. Its first message shows
  the file, with its link, and who posted it.

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
2. Open the submission from the dashboard, then "Production" in the
   workflow's side menu.
3. Under "Production Tasks & Discussions", press "Add".
4. "Name": `u37r14 file at Add`. Tick the participant named above.
5. Type `Please see the attached file.` as the message.
6. Under the message box: "Attach Files" › "Upload File" › choose
   `figure.png` › "Attach Files". The file is listed under the message.
7. Press "Save".
8. On the new row, open "More Actions" › "History".

Expected: the History lists "figure.png uploaded by dbarnes on
2026-10-02" with a "Download" link in its row, beside "Discussion created
by dbarnes (…) on 2026-10-02".

Observed: one line only (OJS shown; OMP reads "Press editor", OPS
"Preprint Server manager"), and no "Download" link:

```
Discussion created by dbarnes (Journal editor) on 2026-10-02
```

Replying with a file (the control):

9. Close "History". Press the discussion's name, then "Add New Message".
   Type `A second file.`, then "Attach Files" › "Upload File" ›
   `replacement.pdf` › "Attach Files". Press "Save", then "Close".
10. "More Actions" › "History".

Observed: the reply's file is logged, with "Download", and figure.png
still is not:

```
dbarnes (Journal editor) posted a response on 2026-10-02
replacement.pdf uploaded by dbarnes on 2026-10-02        Download
Discussion created by dbarnes (Journal editor) on 2026-10-02
```

Removing the first message's file:

11. Close "History". Open "More Actions" › "Edit". Under the message
    box, press figure.png's "Remove", then "Save".
12. "More Actions" › "History".

Observed: the removal is logged, but the upload never was:

```
figure.png removed by dbarnes on 2026-10-02
dbarnes (Journal editor) posted a response on 2026-10-02
replacement.pdf uploaded by dbarnes on 2026-10-02        Download
Discussion created by dbarnes (Journal editor) on 2026-10-02
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
(line 1180), and only two methods call it. `editTask()` (line 409)
compares the first message's files before and after an edit, and logs
those added and those removed. `addNote()` (line 786) logs a reply's
files. Nothing logs the files the first message had from the start. So
when an edit takes one off, the History gets its "… removed by …" line,
but it never had an "… uploaded by …" line for it.

`pkp/pkp-lib#12248` asked for "File Attached … Logged for any file
uploaded to the discussion". `pkp/pkp-lib#12344` (756d7004a1) added
`logTaskFiles()` to `editTask()` only, and `pkp/pkp-lib#12451`
(c69d929b26) added it to `addNote()`. Neither touched the creation path.

Reach:

- A task started with a file in the "Add" window goes through the same
  `addTask()` (code).
- A workflow file attached at "Add" ("Attach Files" › "Attach Workflow
  Files") is copied onto the first message the same way and is not
  logged either (code).
- The other ways to start a discussion add no files: the participant
  "Notify" (`PKPStageParticipantNotifyForm`), `Repository::addQuery()`
  and the discussions and tasks auto-added from templates (`Repository`,
  line 214) (code).
- The History's "Download" link is built in `TaskResource` only from
  `SUBMISSION_LOG_TASK_FILE_UPLOADED` entries, so a file without that
  entry has no "Download" row (code; seen on screen).

## Proposed fix

In `addTask()`, once the discussion or task is saved and its creation
logged, log the first message's files with the same `logTaskFiles()`
call that `addNote()` makes for a reply
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/fix.diff).

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
dbarnes on 2026-10-02" with "Download" after step 8. In the control, an
"Add" without a file still logged only the created line, and an "Edit"
that changes only the name added no second "… uploaded by …" line.
Through `logTaskFiles()` the new line also gets what the other file
lines have: the real person's name during "Login As", and the stage the
"Download" link needs.

The fix leaves the date as it is. `logTaskFiles()` stamps the current
time and the created line the creation time, and in the walk with the
fix both carried the same second. On all three apps the History then
listed "figure.png uploaded by …" below "Discussion created by …", as if
the file came first. Passing the creation time to `logTaskFiles()` (an
optional date argument) would not change that, since the two lines
already share the second. The order of lines in one second is the
History's own sort:

- `getTaskData()` fetches the entries ordered by `date_logged` alone.
- `TaskResource::toArray()` then calls `sortBy(['dateLogged' => 'desc',
  'id' => 'desc'])`. Laravel's `sortByMany()` reads that array's values
  ('desc', 'desc') as the keys to sort on, so it sorts nothing.
- So lines of one second keep the database's order. A reply and its file
  show the same: OJS listed "posted a response" above "replacement.pdf
  uploaded by …", OPS the other way round.

That sort is a fault of its own, for every pair of lines in one second,
and is left out of this fix.

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
- A guard: a pkp-lib feature test that posts a discussion with one
  `temporaryFileIds` entry and expects one
  `SUBMISSION_LOG_TASK_FILE_UPLOADED` entry for it. Or the U37 e2e
  scenario for the History, as a **Planned** item in the spec.

Small: one call in one method, following `addNote()`, and a test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/walk.js)
  takes the Steps as `dbarnes` on each app:
  `PROBE_FEATURE=<dataset fleet> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/add-window-file-missing-from-history/walk.js`.
- Control:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/add-window-file-missing-from-history/neighbour.js),
  run the same way: "Add" without a file, and "Add" with figure.png
  followed by an "Edit" of the name only. Walked with the fix and
  without it; without it, both show the created line only.
- The fix's hunk changes the same lines of `addTask()` as the fix in
  [U37-A3-writer-told-of-own-message.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U37-A3-writer-told-of-own-message.md).
  The two changes are independent, but applying both needs a manual
  merge.
- Walked on OJS, OMP and OPS `main` on 2026-10-02, 02:57–03:13 UTC, on
  PostgreSQL, each walk on a freshly loaded dataset (pkp/datasets
  c657990, 2026-10-01). No request failed and no page script failed. The
  fault does not depend on the database.
- `stable-3_5_0`: walked on the three apps with the same script
  (`PKP_E2E_LINE=stable-3_5_0` in front); the "Production Discussions"
  grid's row offers only "Edit" and "Delete", no History.
- Code reads:
  - The cause, on `main`. `EditorialTaskController.php` is the same file
    in the three apps' lib/pkp.
  - The History's order: the event-log `Collector` orders by
    `date_logged` alone, and `TaskResource::toArray()`'s `sortBy()`
    (lines 62–66, from c69d929b26) was checked in PHP against the
    bundled Laravel: an array shaped `['dateLogged' => 'desc', 'id' =>
    'desc']` leaves a collection as it is, where `[['dateLogged',
    'desc'], ['id', 'desc']]` sorts it.
  - `stable-3_5_0` lib/pkp has no `classes/editorialTask`, no tasks API
    and no `submission.event.task.*` texts.
  - pkp-lib `stable-3_4_0` and `stable-3_3_0`:
    `controllers/grid/queries/QueriesGridRow` offers only `editQuery`
    and `deleteQuery`, and there is no task file log.
- The trace: `git log -L` on `logTaskFiles()` and `-S logTaskFiles`
  find two commits. 756d7004a1 added the method and its `editTask()`
  call. c69d929b26 changed its signature and added the `addNote()` call.
  The GitHub API names their PRs as `pkp/pkp-lib#12344` (merged
  2026-02-15) and `pkp/pkp-lib#12451` (merged 2026-03-15).
  `pkp/pkp-lib#12248` was closed on 2026-03-18.
- Upstream: searched on 2026-10-02 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by the symptom ("discussion history file", "task
  history uploaded") and by the code (`logTaskFiles`, "addTask log
  file", "headnote file log"). Only the feature's own issues came up
  (`pkp/pkp-lib#12248`, `#12243`, `#11825`, `#12117`) and
  `pkp/pkp-lib#12931` (the History's download link).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6). `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP
  c7b45f88e and OPS 8eaf899468 (lib/pkp 1fb843f491), lib/ui-library
  d4e01883. pkp-lib `stable-3_4_0` 32b0f4b4af and `stable-3_3_0`
  f6ab331645.
- Not driven:
  - A task started with a file, and a workflow file attached at "Add".
    Both go through the same `addTask()` and are read in the code only.
  - With the fix, the "Download" link was seen but not pressed. It is
    built the same way as the reply file's link.
