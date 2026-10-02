# A task's owner is offered "Edit" but cannot save even a new due date on a task someone else opened

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no tasks)
  - 3.4: none (code; no tasks)
  - 3.3: none (code; no tasks)
- **Introduced** `pkp/pkp-lib#12313` for `pkp/pkp-lib#12278` · [dae787f9c2](https://github.com/pkp/pkp-lib/commit/dae787f9c227ac825009bbe928892b7d412641f6) · committed 2026-03-16, merged 2026-03-31 · hafsa-naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor opens a task and makes a Copyeditor (or another assistant
role) or the Author its "Task Owner". That owner is offered "Edit" on
the task. But their "Save" is refused with "You can only edit your own
discussion message." under the message box, even when they changed only
the due date or ticked one more participant and left the message alone.

The person who opened the task, or a manager-level user, can make the
change for them.

## Impact

- **Lost**: the owner's change to their own task (due date, name,
  participants); it stays in the open window, unsaved. Nothing already
  saved is lost. The refusal blames the message, which the owner did not
  touch.
- **Who**: a task owner who holds an assistant role or is the Author, on
  any task they did not open themselves. That is the usual case: an
  editor opens a task for the copyeditor or the author.
- **Way round**: the person who opened the task, or a manager-level user
  (a Journal manager or Journal editor, say), makes the change in
  "Edit", which saves for them. An assigned section editor who is
  neither cannot: the task is not even listed for them.

Medium: the owner cannot change their own task, but the person who
opened it can do it for them on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence", in Copyediting, with
  `dbarnes` (Journal editor) and `mfritz` (Copyeditor) assigned. [Press:
  submission 7, "Accessible Elements: Teaching Science Online and at a
  Distance", in Copyediting, the same two assigned. Preprint server:
  submission 1, "The influence of lactation on the quantity and quality
  of cashmere production", in Production; a preprint server has no
  Copyeditor, so the owner is its Author, `ccorino`.]

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open the
   submission at its "Copyediting" stage [preprint server:
   "Production"].
2. Under "Copyediting Tasks & Discussions" [preprint server: "Production
   Tasks & Discussions"] press "Add".
3. Name it "Copyedit the manuscript", tick "Maria Fritz (mfritz)"
   [preprint server: "Carlo Corino (ccorino)"], tick "Enter task
   information", set "Due Date" to two weeks from today, choose Maria
   Fritz [Carlo Corino] as the task owner, type "Please copyedit the
   manuscript." in the message box and press "Save".
4. Sign out and sign in as `mfritz` [preprint server: `ccorino`].
5. Open the same submission at the same stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3&workflowMenuKey=workflow_4`
   on the journal) [press: the same address with
   `workflowSubmissionId=7`; preprint server: "My Submissions", the
   submission, then "Production Tasks & Discussions" in its menu]. The row
   "Copyedit the manuscript" reads "Task Owner: mfritz".
6. Open the row's "More Actions": it offers "Edit", "History" and
   "Delete". Choose "Edit".
7. Change only "Due Date", to three weeks from today, and press "Save".

**Expected:** the window closes, the row shows the new due date, and the
History records "Due date changed from … to … by mfritz". The message
stays the editor's.

**Observed:** the window stays open. Under the message box: "You can
only edit your own discussion message." (a press and a preprint server
show the raw key `##submission.task.validation.error.headnote.author##`
instead, [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a7)).
Beside "Save": "Please correct one error.". The page notice reads "The
form was not saved because 1 error(s) were encountered. Please correct
these errors and try again.". The row keeps its old date. The request
(a PUT, sent as a POST with `X-Http-Method-Override`):

```
POST /index.php/publicknowledge/api/v1/submissions/3/tasks/2   422
{"description":["You can only edit your own discussion message."]}
```

Ticking one more participant instead of changing the date gives the same
refusal.

## Cause

The save is checked by two rules that disagree. The write policy lets
the task's owner change the task: `QueryWritePolicy::effect()` permits a
participant marked `isResponsible` on a task (since `pkp/pkp-lib#11912`).
The edit's validation then refuses them.

`EditTask::rules()`
(`lib/pkp/api/v1/submissions/tasks/formRequests/EditTask.php`, lines
77–112) guards `description`, the first message, with a closure. For
anyone without the manager or sub-editor role in the context (and not a
site administrator) it fails with
`submission.task.validation.error.headnote.author` when the head note's
writer is someone else (line 103), and with `…headnote.editExpired` when
the head note is an hour old (line 108). `pkp/pkp-lib#12278` asked for
exactly this, for edits of the message.

But the closure runs whenever `description` is posted, and the edit form
posts it with every "Save": ui-library's `saveWorkItem()`
(`useDiscussionManagerForm.js`) sends the message box, which "Edit"
fills with the head note's text. So the rule meant for a changed message
judges every save, and an owner who did not write the message can save
nothing. Before dae787f9c2 the rule was `['sometimes', 'string']`, and
the owner's save passed.

Reach:

- The one-hour limit sits in the same closure, so it locks the whole
  item for the same reason: an hour after writing the first message, the
  Author or an assistant cannot rename their own item or add a
  participant
  ([A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a12),
  an open product question in the spec).
- A task that `Repository::autoCreateFromTemplates()` adds when a
  submission reaches a stage has a head note with no writer: the task
  has no creator, so `EditorialTask::fillHeadnote()` stores a null
  `userId`. When a manager makes an assistant or the Author its owner,
  the owner's save fails the same way.
- Managers, site administrators and section editors pass the closure
  before it reads the head note. But since `pkp/pkp-lib#11912` the write
  policy lets a section editor change a task only when they opened it or
  own it. ui-library's `userHasWriteAccess()` follows the same rule, and
  an assigned section editor who is neither does not see the task listed.
  So only the task's creator or a manager-level user can make the
  owner's change.

## Proposed fix

When the posted message is the one already stored, skip the check on
who wrote it and when: in the `description` closure of
`EditTask::rules()`, return early when the posted text, trimmed, equals
the head note's stored text, trimmed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-owner-edit-refused/fix.diff)):

```diff
                     if (!$headnote) {
                         return;
                     }
 
+                    // The edit form sends the first message back with every save. Only a change
+                    // to the message is limited to its writer and its first hour (pkp/pkp-lib#12278).
+                    // The request's strings are trimmed (TrimStrings), the stored message may not be.
+                    if (trim($value) === trim((string) $headnote->contents)) {
+                        return;
+                    }
+
                     if ($headnote->userId != $currentUser->getId()) {
```

The rule lives in the API's validation, which every client goes through.
The field is already `sometimes`, so a post without the message passes;
this treats a post that sends it back unchanged the same way. Both sides
are trimmed because the global `TrimStrings` middleware
(`PKPRoutingProvider`) trims the posted text, while a stored message
need not be trimmed: a template's message from
`Repository::autoCreateFromTemplates()` is a rendered email body.

Tried on OJS, OMP and OPS `main` with the Steps: the owner's due-date
change saved, the row showed the new date and the History read "Due date
changed from … to … by mfritz" ("by ccorino" on the preprint server).
The owner's rewrite of the editor's message was still refused with the
own-message text.

**Alternatives**

- Send the message only when it changed, in ui-library's
  `saveWorkItem()` (the form already tracks its initial state). The rule
  would then hold only for this screen, and any other client sending the
  whole item would still be refused. It could go with the server fix, but
  is not needed.
- Exempt task owners from the closure. They could then rewrite a message
  someone else wrote, which `pkp/pkp-lib#12278` rules out.

**What goes with it**

- A12: the early return comes before the one-hour check, so the fix
  also lets the Author or an assistant change their own item's other
  fields after the hour; a change to the message stays limited to the
  hour. If the team rules on A12 that the hour should lock the whole
  item, the one-hour check, for the message's own writer, has to move
  above the early return.
- An unchanged save still rewrites the head note through
  `EditorialTask::saveHeadnote()`, with the same text and a new
  `dateModified`, as a manager's save already does today. No screen
  shows `dateModified`; only the API's `NoteResource` returns it. So
  the fix leaves this alone. Skipping the rewrite when the text is
  unchanged would be a separate change in `saveHeadnote()`, for every
  user.
- Left out: the Author's edit of a first message that has an uploaded
  file attached
  ([A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a8)).
  It fails for a similar reason: the form sends the message's files back
  with every save. But another rule in the same class refuses it
  (`submissionFileIds`), and it needs its own fix.
- No data repair.
- Guard: a pkp-lib feature test of `EditTask` (an assistant owner posting
  the unchanged message with a new `dateDue` passes; posting a changed
  message fails), and the e2e scenario in spec U37 that marks A6.

Small: one condition in one pkp-lib class, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/task-owner-edit-refused/walk.js)
  takes the Steps on each app. It also has two neighbour checks: the
  owner rewrites the editor's message in a fresh "Edit" (refused with the
  fix in and out), and `dbuskins`, an assigned section editor (preprint
  server: moderator), opens the panel (journal and preprint server; the
  press's submission has no section editor). On an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/task-owner-edit-refused/walk.js`.
- Walked on OJS, OMP and OPS `main`, on PostgreSQL; the fault does not
  depend on the database. Dataset: pkp/datasets c657990 (2026-10-01).
  No server error and no page script error. `dbuskins` saw "No Items" in
  all three groups of the panel.
- Not driven: `stable-3_5_0` (no tasks, below); the one-hour limit and
  the template-added task; a Layout Editor or Proofreader as owner (the
  same role, `ROLE_ID_ASSISTANT`, as the Copyeditor walked); a journal or
  press Author as owner (the preprint server's Author was walked).
- Unverified: whether the message box sends a template-filled message
  back unchanged apart from surrounding whitespace. The walked message,
  typed in the box, came back unchanged.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d6736318), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `EditTask.php` is the same in
  the three. `stable-3_5_0`: OJS c346ee00a5 (lib/pkp 3bb4450bea), OMP
  c7b45f88e, OPS 8eaf899468 (lib/pkp 1fb843f491), lib/ui-library
  d4e01883. pkp-lib `stable-3_4_0` 32b0f4b4af, `stable-3_3_0` f6ab331645.
- Code reads: on `main`, `EditTask::rules()`, `QueryWritePolicy::effect()`,
  `EditorialTask::fillHeadnote()` and `saveHeadnote()`,
  `Repository::autoCreateFromTemplates()`, and ui-library's
  `saveWorkItem()` and `userHasWriteAccess()`. On `stable-3_5_0`, and on
  pkp-lib `stable-3_4_0` and `stable-3_3_0`: no `EditTask.php` and no
  `classes/editorialTask`; the 3.5 discussions panel is the older
  discussions grid (`QueriesGridHandler`), which has no tasks or owners.
- The trace: `git blame` on lines 77–112 gives dae787f9c2 (the closure)
  and 072b8e9910 (the role exemption and the two messages), both in
  `pkp/pkp-lib#12313`. The owner permission in `QueryWritePolicy` is from
  56af8f58ab (`pkp/pkp-lib#11912`, 2025-12-10).
- Upstream searches (2026-10-02), pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by "edit your own discussion message", task owner edit
  due date, task assignee cannot edit, headnote edit, EditTask headnote.
  Related but not this fault: `pkp/pkp-lib#12278` and its PR
  `pkp/pkp-lib#12313` (the rule itself, closed); `pkp/pkp-lib#11825`
  (the tasks and discussions screens, open).
