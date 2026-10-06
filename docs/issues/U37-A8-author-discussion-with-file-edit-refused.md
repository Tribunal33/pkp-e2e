# An Author cannot save an edit of their discussion once its first message has an uploaded file

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12176` for `pkp/pkp-lib#12175` · [eb7fa6b8be](https://github.com/pkp/pkp-lib/commit/eb7fa6b8be07f486d8a5219a8df8008f42a75c0f) · 2026-01-01 · Vitaliy Bezsheiko (Vitaliy-1), which added the rule; no screen sent it a file list until `pkp/ui-library#765` for `pkp/pkp-lib#11825` · [185571a9b](https://github.com/pkp/ui-library/commit/185571a9b1f9061909444e47d24ccc695f0070ad) · 2026-01-21 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An Author attaches an uploaded file to the first message of a discussion
they start on their submission. Later they open "Edit", change only the
name and press "Save". The window stays open with "The form was not
saved because 1 error(s) were encountered." and "Please correct one
error.", but no field is marked. "Save" stays greyed out for the rest of
that window, even after the file's "Remove".

The Author cannot rename the discussion, change its participants or
message, or turn it into a task while the file is on it. Removing the
file and uploading it again in a fresh window lets one save through.
Every other role that may edit the discussion saves the same edit and
keeps the file.

## Impact

- **Lost**: the Author's edit, with no reason given.
- **Who**: Authors only. An Author may edit a discussion only during the
  first hour after they wrote its first message, so it bites in that
  hour. Managers, editors, and section editors and assistants assigned
  to the stage save such edits, with files of their own too.
- **Way round**: in a fresh "Edit" window, press the file's "Remove",
  upload the same file again, make the change and press "Save". It
  saves. "Remove" deletes the file from the submission, so the Author
  needs it at hand to upload it again, and the next edit is refused
  again for the new upload.

Medium: the edit fails, and the way round must be guessed from an error
that names nothing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded.
- A small text file to upload, such as `notes.md`.
- Step 8 comes within an hour of step 6. After that hour every Author
  save is refused instead, with "This discussion message can only be
  edited within 1 hour of creation." (a raw key on a press and a
  preprint server).

Each app uses its own submission and Author; the discussion goes to
David Buskins (`dbuskins`) on all three:

- OJS: submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice" (Submission stage).
  Author `cmontgomerie`.
- OMP: submission 1, "The ABCs of Human Survival: A Paradigm for Global
  Citizenship" (Copyediting). Author `aclark`.
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production". Author `ccorino`.

1. Sign in as the Author (`cmontgomerie` / `cmontgomeriecmontgomerie`).
2. Open the submission from "My Submissions"
   (`/index.php/publicknowledge/en/dashboard/mySubmissions?workflowSubmissionId=4`).
3. In "Desk Review Tasks & Discussions" ("Copyediting Tasks &
   Discussions", "Production Tasks & Discussions"), press "Add".
4. Type the name "Author question u37r3", tick David Buskins, and type the
   message "Please see the attached file."
5. Press "Attach Files", then "Upload File", choose the file, and press
   "Attach Files". The file is listed under the message.
6. Press "Save". The discussion is listed under "In progress".
7. Open the row's "More Actions" menu and choose "Edit". The window
   shows the file under the message, with "Remove".
8. Change "Name" to "Author question u37r3 renamed" and press "Save".

**Expected**: the window closes, the row reads "Author question u37r3
renamed", and the first message still carries the file.

**Observed**: the window stays open. The notice reads "The form was not
saved because 1 error(s) were encountered. Please correct these errors
and try again.", and the window's footer reads "Please correct one
error. Jump to next error". No field is marked, and "Save" is greyed out.
Pressing the file's "Remove" leaves "Save" greyed out. The error list's
screen-reader text reads "Go to submissionFileIds:
##validator.prohibited##". The save request answers:

```
PUT /api/v1/submissions/4/tasks/2   (sent: … "submissionFileIds":[46])
422 {"submissionFileIds":["##validator.prohibited##"]}
```

Control: after step 8, sign in as Daniel Barnes (`dbarnes`, the
editor), open the same stage and rename "Author question u37r3" through
its "Edit". It saves, and the file stays on the message.

"Add Task Details" on the same discussion (a due date, the Author as
owner, "Save") is refused with the same answer.

## Cause

The edit window sends the first message's attached files back on every
"Save", and the API refuses that list from an Author.

The API needs the list back. `EditorialTask::save()` hands the files to
`SaveNoteWithFiles::manageFiles()`, which deletes every file already on
the first message whose ID is missing from `submissionFileIds`. So
ui-library's `useDiscussionManagerForm` seeds the window's selection
with the first message's files (`headnoteFiles`, tagged
`FileAttacherWorkflowStage`), and `saveWorkItem()` sends their IDs as
`submissionFileIds` with every save.

`EditTask::rules()` (lib/pkp
`api/v1/submissions/tasks/formRequests/EditTask.php`, lines 281–301)
makes `submissionFileIds` `prohibitedIf` the user is not a manager or
site administrator, or an assistant or sub-editor assigned to the stage.
The rule is meant to stop Authors and reviewers attaching workflow
files (`pkp/pkp-lib#12117`: "we will not allow authors and reviewers to
attach from workflow files"). But it checks only that the list is not
empty. It does not tell an ID already attached to the first message
from a new one. So the Author's own uploaded file, sent back to keep it,
counts as a new workflow file. `SaveNoteWithFiles::attachSubmissionFiles()`
makes the distinction the rule misses: it skips an ID already on the
note ("If the submission file is already attached, skip it"). The fix
follows it.

The refusal names no field because the error sits on
`submissionFileIds`, which is not a field of the window, and
`validator.prohibited` has no text in `lib/pkp/locale/en`. "Save" stays
disabled until the field holding the error changes, and no field of the
window clears an error on `submissionFileIds`, so "Remove" does not
enable it.

The reach:

- An Author's edit of their own discussion with an uploaded file:
  walked on the three apps.
- "Add Task Details" on that discussion: offered to its creator while
  it is in progress, it saves through the same `saveWorkItem()` PUT with
  the first message's file IDs, and answers the same 422 (walked on the
  three apps).
- An edit by the Journal Manager or the editor (manager role), an
  assigned section editor or an assigned assistant: allowed by the rule.
  The editor's edit was walked; the others were read in the code.
- Reviewers: the same rule covers them; not driven.
- A new message (`AddNote`, the same rule): an Author's message never
  sends a file ID, because "Add New Message" starts with no file
  selected and Authors are offered only "Upload File", never "Workflow
  Files" (on screen). A new item (`AddTask`, which inherits the rule)
  has no files to keep (code).
- Stored data: the refused save stores nothing.

## Proposed fix

Let `EditTask` accept the IDs already attached to the task's first
message, and keep the restriction for every other ID
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-discussion-with-file-edit-refused/fix.diff)):

```diff
                     if ($currentUser && $currentUser->hasRole([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN], $this->submission->getData('contextId'))) {
                         return false;
                     }
 
+                    // The edit form sends back the files already attached to the first message to keep them:
+                    // keeping them attaches nothing new, so only the other IDs are restricted
+                    $submissionFileIds = array_filter(Arr::wrap($this->input('submissionFileIds')), 'is_scalar');
+                    if (empty(array_diff($submissionFileIds, $this->getHeadnoteFileIds()))) {
+                        return false;
+                    }
+
                     $isAssignedEditor = false;
```

`getHeadnoteFileIds()` is a new protected method. It finds the task's
first message (`notes()->withHeadnote()`) and returns
`Repo::submissionFile()->getCollector()->filterByAssoc(Application::ASSOC_TYPE_NOTE,
[$headnote->id])->getIds()->all()`, the filter
`EditorialTaskController::editTask()` uses for the History. For
`AddTask` there is no task, so the method returns nothing and the rule
is unchanged. "Add Task Details" goes through the same rule, so the fix
covers it (by code; not tried).

The fix was tried on OJS, OMP and OPS. The Author's rename saved and
the file stayed on the message. As a control, "Remove" followed by
"Save" still took the file off, and the editor's edit still saved and
kept the file.

**Alternatives**:

- Leave the files out of the save in ui-library. That does not work:
  `manageFiles()` deletes every attached file missing from the list
  whenever `temporaryFileIds` or `submissionFileIds` is sent. A new
  upload added to a kept file would then delete the kept one.
- Send the kept files under a new key. That changes the REST API
  contract for a case the server can already recognise.

**What goes with it**:

- A test: a feature test of `EditTask` (an Author's save that sends back
  their own attachment passes, as an edit and as "Add Task Details",
  and one with another submission file is still refused), and a **Planned** e2e scenario in U37: an Author
  renames their discussion with an uploaded file, and the file is kept.
- Separately: an error on a field the window does not show (here
  `submissionFileIds`) should name the field or the message box, and
  `validator.prohibited` needs a locale text. With this fix, Authors no
  longer meet that error on screen.

Small: a few lines in one form request, following an existing
pattern, plus a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-discussion-with-file-edit-refused/walk.js)
  (helpers in `lib.js` beside it) follows the Steps. It then runs the
  editor's control and "Remove", rename, "Save" in a fresh window, the
  control for the fix. On `stable-3_5_0` it follows the same steps
  through the older discussions grid. The second script
  [wayround.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-discussion-with-file-edit-refused/wayround.js)
  takes steps 1–6, then "Add Task Details", then the way round ("Remove",
  the same file uploaded again, "Save"), and then a rename. Run on an
  install freshly loaded from the default dataset:
  `[PKP_E2E_LINE=stable-3_5_0] PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/author-discussion-with-file-edit-refused/{walk,wayround}.js`.
  On OPS the walk used the file `not-an-image.txt`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Datasets: pkp/datasets
  c657990 (2026-10-01).
  - `main`: the 422 above on every app (the file IDs were 46, 145 and
    20), and the same 422 for "Add Task Details". After the way round,
    the removed file's `submission_files` row was gone and the new
    upload had a new ID (47, 146, 21); the next rename sent it and was
    refused again. No server error and no page script error.
  - `stable-3_5_0`: the Author's "Add discussion" with a file uploaded
    through the form's "Upload File" wizard. The row's "Edit", a new
    subject and "OK" saved (200), and the file stayed on the message,
    on all three apps.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); the `EditTask.php` read is the
  same file on the three. `stable-3_5_0`: OJS c346ee00a5 (lib/pkp
  3bb4450bea), OMP c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491),
  lib/ui-library d4e01883. pkp-lib `stable-3_4_0` 32b0f4b4af and
  `stable-3_3_0` f6ab331645.
- Code reads:
  - `main`: `EditTask`, `AddTask`, `AddNote`,
    `EditorialTask::fill()`, `save()` and `saveHeadnote()`, the
    `SaveNoteWithFiles` trait, `EditorialTaskController::editTask()`,
    and ui-library's `useDiscussionManagerForm` (`headnoteFiles`,
    `saveWorkItem()`, `addNewMessage()`, `onNewMessage()`),
    `useDiscussionMessages` and `useDiscussionManagerConfig`
    (`userHasWriteAccess()`). Also a search of `lib/pkp/locale/en` for
    `validator.prohibited` (none).
  - `stable-3_5_0`, pkp-lib `stable-3_4_0` and `stable-3_3_0`:
    `QueriesAccessHelper::getCanEdit()`, which lets an Author edit their
    own discussion within the hour, and `QueryForm::readInputData()`,
    which reads only subject, comment, users and template. A
    discussion's files are managed in the form's own files grid, so an
    edit never sends them back. No tasks API exists on these branches.
- The trace: `git blame` on `EditTask.php` lines 281–301 gives
  eb7fa6b8be, the commit that added file uploads to tasks and
  discussions (PR `pkp/pkp-lib#12176`, merged 2026-01-19). A later commit
  for the same issue, 550fcb0191, moved file handling into
  `SaveNoteWithFiles` and kept the rule that removes a missing file. `git blame` on `useDiscussionManagerForm.js`
  lines 35–41 and 470–471 gives 185571a9b (`pkp/ui-library#765`), which
  first sent `submissionFileIds` and seeded the first message's files.
  Before it, the window sent no file IDs.
- `pkp/pkp-lib#12117` (closed; Attach Files in the discussion form)
  states the rule's intent. Its QA comments cover replies, not an
  Author's edit.
- Not driven: an Author sending another submission file's ID, which no
  screen offers an Author. The fix still refuses it by code. A section
  editor who did not start the discussion is not offered "Edit", so the
  editor's control uses `dbarnes`.
