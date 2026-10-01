# A message sent from "Participants" opens a discussion listed as "Created by" the person it was sent to

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11587` for `pkp/pkp-lib#10406` · [134f6f077b](https://github.com/pkp/pkp-lib/commit/134f6f077b893e139675ed3fedc2cb4645df4c3a) · 2025-04-01 (merged 2025-08-05) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a5), spec U32 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U32-copyediting-stage.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An editor can send a message from a submission's "Participants" panel,
from "Assign" or from a participant's "Notify", by choosing a
predefined message. The message opens a discussion with the person it
is sent to. The stage's "Tasks & Discussions" panel lists that
discussion as "Created by:" that person, not the editor who wrote it:
a Copyeditor seems to have opened "Request Copyedit" themselves. The
discussion's first entry and the recipient's own entry in their
"Tasks" list name the editor correctly.

The wrong creator is stored with the discussion. A fix corrects new
discussions; the ones already stored exist only on `main`, which is not
released yet.

## Impact

- **Lost:** a correct record of who started the discussion. The panel
  and the REST API's task (`createdBy`, `createdByName`) name the
  recipient.
- **Who:** everyone who reads a stage's discussions panel, on every
  stage. Editors send "Request Copyedit" and the other predefined
  messages this way in ordinary use.
- **Way round:** to learn who really started a discussion, open it: its
  first entry reads "Message from {sender}".

Low: the panel names the wrong person as a discussion's creator.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission, the person to assign, the person to notify and the
predefined messages:

| App | Submission (stage) | Assign (role), predefined message | Notify, predefined message |
|---|---|---|---|
| OJS | 3, "The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence" (Copyediting) | Sarah Vogt (`svogt`, "Copyeditor"), "Request Copyedit" | Maria Fritz (`mfritz`), "Discussion (Copyediting)" |
| OMP | 7, "Accessible Elements: Teaching Science Online and at a Distance" (Copyediting) | Sarah Vogt (`svogt`, "Copyeditor"), "Request Copyedit" | Maria Fritz (`mfritz`), "Discussion (Copyediting)" |
| OPS | 1, "The influence of lactation on the quantity and quality of cashmere production" (Production) | Minoti Inoue (`minoue`, "Moderator"), "Discussion (Production)" | David Buskins (`dbuskins`), "Discussion (Production)" |

1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
   Select the stage ("Copyediting", on OPS "Production") in the
   workflow menu.
2. In "Participants", press "Assign". Choose the role, search for the
   person's last name and choose the person.
3. Choose the predefined message, replace the text in "Message" with
   "u35w33 assign" and press "OK".
4. In "Participants", open the person to notify's "More Actions" menu
   and choose "Notify".
5. Choose the predefined message, replace the text in "Message" with
   "u35w33 notify" and press "Notify".
6. Reload the page and read the stage's "Tasks & Discussions" panel
   ("Copyediting Tasks & Discussions", on OPS "Production Tasks &
   Discussions").
7. Open the discussion of step 3.
8. Sign out, sign in as the assigned person and open the "Tasks" panel
   from the page header.

**Expected:** both new discussions read "Created by: dbarnes", as a
discussion `dbarnes` adds with the panel's "Add" does.

**Observed:** under "In progress", the panel lists (OJS and OMP):

```
Discussion
Request Copyedit
Created by: svogt

Discussion
Discussion (Copyediting)
Created by: mfritz
```

On OPS the two "Discussion (Production)" rows read "Created by: minoue"
and "Created by: dbuskins". The discussion of step 3 lists `dbarnes`
and the assigned person as participants, and its first entry reads
"Message from dbarnes". The assigned person's "Tasks" panel lists "Daniel
Barnes started a discussion: Request Copyedit: u35w33 assign" (OPS:
"… Discussion (Production): …").

A discussion `dbarnes` adds on the same panel with "Add" reads "Created
by: dbarnes".

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (lib/pkp
`controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
line 204 on `main`) creates the discussion with
`'createdBy' => $user->getId()`. In this method `$user` is the
message's recipient (`Repo::user()->get($userId)`, the posted `userId`).
The sender is `$request->getUser()`: the method uses it for the first
note's `userId`, the mailable's sender and the second participant, but
not for the creator. `AddParticipantForm` extends this form, so "OK" in
"Assign Participant" with a message takes the same path.

The value is stored in `edit_tasks.created_by`. The panel prints it:
`TaskResource` returns
`createdByUsername` for `createdBy`, and ui-library
`DiscussionManagerCellName.vue` shows it after "Created by:". So the
line names the recipient.

Every other writer of `createdBy` stores the person who starts the
discussion. `EditorialTaskController::addTask()` (the panel's "Add")
stores the signed-in user through `AddTask`. `Repository::addQuery()`
(the discussion an editor's recommendation opens, and the comments for
the editors) stores `$fromUser`, who also writes the first note.
`autoCreateFromTemplates()` leaves it empty for tasks the system
creates.

134f6f077b moved discussions to editorial tasks and added `createdBy`,
so that the panel can show who started each discussion. In this form
it filled the field with the recipient. Before that change a discussion
had no creator field, and the discussions grid's "From" column showed
the first note's author, the sender.

Reach ("code" marks what was read in the code, not walked):
- "Assign" and "Notify" with a predefined message, on every stage:
  walked on Copyediting (OJS, OMP) and Production (OPS); one method
  serves both windows and every stage (code).
- The discussion's first entry, its participants and the recipient's
  "Tasks" entry name the right people (walked).
- The other discussion writers above store the right creator (code).
- Stored data: every discussion opened this way on an install running
  `main` stores the recipient in `created_by`. No release stores a
  creator for discussions: 3.5 and older show the first note's author
  (code).
- Not covered by this fix: the empty "Activity" cell of these rows
  (U32 A9's missing "Discussion created by … on …" line) has another
  cause, since only `EditorialTaskController::addTask()` writes that
  event-log entry (code).

## Proposed fix

Store the sender as the creator, the user the method already takes for
the first note's author and the one `addTask()` stores
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/fix.diff)):

```diff
             'seq' => REALLY_BIG_NUMBER,
-            'createdBy' => $user->getId(),
+            'createdBy' => $request->getUser()->getId(),
             'type' => EditorialTaskType::DISCUSSION,
```

During "Login as" this is the user being impersonated, as for the first
note and for `addTask()`'s creator, so the discussion stays consistent.

Tried on `main` on the three apps: with the fix in, both new rows read
"Created by: dbarnes", and the discussion's participants, its first
entry and the recipient's "Tasks" entry are unchanged. A neighbour check
adds a discussion with the panel's "Add": it reads "Created by: dbarnes"
with the fix in and out.

**Alternatives:**
- Build the discussion with `Repo::editorialTask()->addQuery()`, which
  takes the creator from `$fromUser`. That gives one writer for both
  paths, but `addQuery()` sends its own plain email to every
  participant and lacks the predefined message's mailable, footer and
  email-log entry this form needs: a much larger change for one value.
- Show the first note's author in the panel instead of `createdBy`. That
  fixes the line but leaves the stored creator wrong for every other
  reader of it, the REST API's task `createdBy` and `createdByName`
  included.

**What goes with it:**
- No upgrade migration, since no release stores these rows; a repair
  is optional for development and test installs that ran `main` (the
  discussions whose `created_by` differs from their first note's
  author).
- No backport: 3.5 and older are not affected.
- A test: the U35 e2e scenario for a message sent from "Assign" checks
  "Created by: {sender}" on the stage's panel.

Small: one value in one shared form, and a test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js)
  takes the Steps on the three apps, on an install freshly reset to the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js`.
  It adds a unique suffix to each message and also reads each new
  discussion's stored creator and first note's author in the database
  (`edit_tasks.created_by` the recipient, the note's `user_id`
  `dbarnes`, on all three apps).
- Neighbour check: [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/neighbour.js)
  adds a discussion with "Add" on the same stage as `dbarnes`, with one
  participant ticked; its row read "Created by: dbarnes" with the fix in
  and out.
- On OPS the Steps assign with "Discussion (Production)": choosing
  "Assign Editor" there leaves "Message" empty and answers a server
  error, which is its own report,
  [U35-OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-OPS2-ops-assign-editor-message-empty.md).
  No other request failed and no page script failed, on `main` or on
  `stable-3_5_0`.
- Not driven: "Ready for Production", "Index Requested" and "Assign
  Editor" on OJS and OMP.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked; the fault does not depend on the
  database.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`
  and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), the form identical in
  both lib/pkp commits, ui-library `280f98c5`; `stable-3_5_0` OJS
  `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd` (lib/pkp
  `a9c76aed62`); `stable-3_4_0` OJS `9571d8fde7`, OMP `0aec65441`, OPS
  `acd8ae704b` (lib/pkp `df13621c2d`); `stable-3_3_0` OJS `9fdb9bcf9a`,
  OMP `8e72fc883`, OPS `c5532e2161` (lib/pkp `d446601ebe`).
- 3.5, walked: the same Steps and predefined messages. The discussions
  are titled with the email's subject ("Submission 3 is ready to be
  copyedited for JPKJPK", "A message regarding Journal of Public
  Knowledge"), and the "Copyediting Discussions" grid ("Discussions" on
  OPS) shows "dbarnes" in "From" for both. Code:
  `QueriesGridCellProvider` fills "From" from the first note's author;
  `Query::create()` in `sendMessage()` stores no creator.
- 3.4 (code): lib/pkp `stable-3_4_0` `sendMessage()` inserts the query
  through `QueryDAO` with no creator, and `QueriesGridCellProvider`'s
  "From" is the first note's author.
- 3.3 (code): lib/pkp `stable-3_3_0`
  `PKPStageParticipantNotifyForm.inc.php` and
  `QueriesGridCellProvider.inc.php` do the same.
- Introduced: `git blame` on line 204 gives 134f6f077b (pkp-lib, "Migration
  schema for tasks and discussions"), which replaced `Query::create()`
  without a creator by `EditorialTask::create()` with
  `'createdBy' => $user->getId()`; it reached `main` with
  `pkp/pkp-lib#11587` (`commits/<sha>/pulls`), and is not on
  `stable-3_5_0`.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  "created by" with discussion, recipient, notify and creator,
  `PKPStageParticipantNotifyForm`, `createdBy` with discussion and
  `sendMessage`, and `DiscussionManagerCellName`. `pkp/pkp-lib#7150`
  (open, 3.2) is discussions attributed to the wrong user through the
  submission wizard's reused note, another fault. `pkp/pkp-lib#11825`
  (the panel's design, "Created By: for discussion") and
  `pkp/pkp-lib#12248` (the activity log) do not mention this path.
