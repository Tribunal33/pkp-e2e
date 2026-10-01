# Editing a participant's assignment is logged in the Activity Log as a new assignment

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4753` for `pkp/pkp-lib#3758` · [8484a16aff](https://github.com/pkp/pkp-lib/commit/8484a16affc13b7d0d0830c73522d53f31c542d4) · 2018-10-30 (merged 2019-05-21) · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Changing a participant's "Assignment privileges" (whether an editor may
only recommend a decision) or "Permissions" (whether the person may
change the publication's details) through "Edit" adds "{name}
({username}) was assigned to this submission as a {role}." to the
Activity Log, the line a new assignment writes, so the log shows an
assignment that did not happen and not the change that did.

The assignment is saved as changed; only the log's record of the change
is wrong. The false line carries the date of the edit, and its "User"
column names the participant, not the editor who made the change. The
participant gets no notice or email. Only editors read the Activity
Log: managers and the editors assigned to the submission.

Every "Edit" › "OK" on a Participants row does it, even one that changes
nothing, on any submission and stage.

## Impact

- **Lost:** the history of the change. The Activity Log gains a false
  "was assigned" line, and no line says that the person's
  "Assignment privileges" or "Permissions" changed.
- **Who:** the editors who read a submission's Activity Log after "Edit"
  was used on a Participants row, typically to make an editor
  recommend-only or to grant or revoke an author's permission to change
  the publication details.
- **Way round:** none on screen. The current settings can be read from
  the row ("Only allowed to recommend an editorial decision") or its
  "Edit" window, but not when or by whom they were changed.

Low: the task gets done and only a history line that editors read
misleads. It would be medium where a journal relies on the Activity Log to show
who was allowed to decide on a submission, and when.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission and the participant whose row is edited:
- OJS: submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice"; "Stephanie Berardo"
  (Section editor).
- OMP: submission 6, "The Information Literacy User’s Guide"; "Minoti
  Inoue" (Series editor, already recommend-only).
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production"; "Stephanie Berardo" (Moderator).

1. Sign in as `dbarnes` and open the submission's workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. Press "Activity Log" at the top. On "History", note the lines that
   name the participant, then close the window.
3. In "Participants", open the participant's "More Actions" menu and
   choose "Edit".
4. In "Edit Assignment", under "Assignment privileges", tick the box
   "This participant is only allowed to recommend an editorial decision
   and will require an authorised editor to record editorial decisions."
   (OMP: it is ticked; untick it).
5. Press "OK".
6. Press "Activity Log" again.

**Expected:** step 5 closes the window with "The stage assignment has
been changed." and the row gains (OMP: loses) "Only allowed to recommend
an editorial decision". In step 6, "History" has a new line saying that
the participant's assignment was changed, and no new line saying they
were assigned.

**Observed:** step 5 behaves as expected. In step 6, "History" has a new
top line, dated today:

```
Stephanie Berardo (sberardo) was assigned to this submission as a Section editor.
```

("Minoti Inoue (minoue) was assigned to this submission as a Series
editor." on OMP, "Stephanie Berardo (sberardo) was assigned to this
submission as a Moderator." on OPS), its "User" column showing the
participant. On OJS and OPS the dataset's original assignment wrote no
log line (step 2 shows none naming the participant), so this false line
is the log's only record of the assignment and makes it look as if it
happened on the day of the edit. On OMP the new line repeats the one the
original assignment wrote. Nothing in the log mentions the
recommend-only change.

Control: pressing "OK" in "Edit Assignment" without changing a box adds
the same line again; "Assign" with a new participant adds it once, as it
should.

## Cause

`StageParticipantGridHandler::saveParticipant()`
(`lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php`)
saves both a new assignment ("Assign") and a change to an existing one
("Edit", which posts an `assignmentId`). After `AddParticipantForm::execute()`
it tells the two apart for the notice it shows (`$stageAssignmentId !=
$assignmentId`: "User added as a stage participant." or "The stage
assignment has been changed."), but then writes the same log entry on
both branches (around line 385):

```php
// Log addition.
...
    'eventType' => PKPSubmissionEventLogEntry::SUBMISSION_LOG_ADD_PARTICIPANT,
    ...
    'message' => 'submission.event.participantAdded',
```

The entry was right when this method only added people. `pkp/pkp-lib#4753`
(for `pkp/pkp-lib#3758`, letting editors give or take an author's right
to change the metadata) routed "Edit" through the same method: it added
the `assignmentId` and the branch for the notice, and left the log entry
as it was. No log message or event type for a changed assignment has
existed since.

Reach:
- The handler logs on every edit, whether or not `execute()` saved
  anything: `AddParticipantForm::execute()` saves only when one of the
  two settings may be changed, and the handler neither checks that nor
  compares. So "OK" on an "Edit Assignment" that offers no setting ("No
  changes can be made to this participant") logs too (read in the code,
  not driven).
- The "User" column of these lines names the participant, not the editor
  (`userFullName` is the participant's): a separate entry, U35
  [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a14),
  whose fix touches the neighbouring lines of the same entry; the two can
  land in either order.
- "Remove" (`deleteParticipant()`) logs its own "was removed" entry
  correctly. No other screen edits one assignment's settings; the role
  settings' bulk update of authors' metadata permission
  (`UpdateAuthorStageAssignments`, `RestrictAuthorAssignment`) logs
  nothing per submission, which is a different question (all read in
  the code).
- Entries already written cannot be told apart from real assignments
  (same event type and message), so no repair is possible.

## Proposed fix

Log an edit as an edit, and only when it changed something
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-logged-as-assigned/fix.diff)).
In `saveParticipant()`, keep the two settings of the assignment the
handler already loads for the permission check, compare them after
`execute()`, and write a new event type and message for an edit that
changed them:

```diff
+            $limitsBefore = $stageAssignment ? [(bool) $stageAssignment->recommendOnly, (bool) $stageAssignment->canChangeMetadata] : null;
             [$userGroupId, $userId, $stageAssignmentId] = $form->execute();
…
-            // Log addition.
+            // Log the addition, or the change of an existing assignment's limits.
+            $isNew = $stageAssignmentId != $assignmentId;
+            $edited = $isNew ? null : StageAssignment::find($stageAssignmentId);
+            $isChanged = $edited && $limitsBefore !== [(bool) $edited->recommendOnly, (bool) $edited->canChangeMetadata];
+            if ($isNew || $isChanged) {
                 …
-                'eventType' => PKPSubmissionEventLogEntry::SUBMISSION_LOG_ADD_PARTICIPANT,
+                'eventType' => $isNew ? PKPSubmissionEventLogEntry::SUBMISSION_LOG_ADD_PARTICIPANT : PKPSubmissionEventLogEntry::SUBMISSION_LOG_EDIT_PARTICIPANT,
                 …
-                'message' => 'submission.event.participantAdded',
+                'message' => $isNew ? 'submission.event.participantAdded' : 'submission.event.participantEdited',
```

with `SUBMISSION_LOG_EDIT_PARTICIPANT = 268435466; // 0x1000000A` in
`PKPSubmissionEventLogEntry` (free in pkp-lib and in the three apps'
`SubmissionEventLogEntry`) and, in `lib/pkp/locale/en/submission.po`:

```
msgid "submission.event.participantEdited"
msgstr "The assignment of {$userFullName} ({$username}) as a {$userGroupName} was changed."
```

The new entry takes the same parameters as its "added" and "removed"
siblings, so the History tab shows it with no other change.

Tried on `main`, all three apps: the Steps now add "The assignment of
Stephanie Berardo (sberardo) as a Section editor was changed." (Series
editor, Moderator) and no "was assigned" line. "Assign" still adds one
"was assigned" line, and "OK" on "Edit Assignment" with nothing changed
adds no line, where it added a "was assigned" line without the fix.

**Alternatives:**
- Say what changed ("… may now only recommend a decision"): clearer, but
  needs a message per setting and direction (four strings): the log
  stores its parameters as given and translates only the message when
  shown, so a setting's name cannot be passed as a parameter. A
  follow-up if the team wants it.
- Only skip the log on an edit: removes the false line, but leaves the
  change with no record at all.
- Keep `SUBMISSION_LOG_ADD_PARTICIPANT` with the new message: the event
  type would still say "added" to anything that filters by it
  (`Collector::filterByEventType()`).

**What goes with it:**
- The new English string; other languages fall back to English until
  translated.
- The REST API reads only discussions'
  activity from the event log, and no code reads
  `SUBMISSION_LOG_ADD_PARTICIPANT` apart from the 3.4 upgrade migration.
  A plugin on the `EventLog::add` hook sees the new event type for an
  edit, and no entry for an edit that changed nothing.
- Backport: the same change on `stable-3_5_0`, whose log block differs
  in two lines (no `impersonatedUserId`, `getFullName()`), so the diff's
  hunks there need rebasing. 3.4 compares through the DAO getters
  (`getRecommendOnly()`, `getCanChangeMetadata()`) on the assignment the
  handler already loads. The 3.3 handler loads no assignment before
  `execute()`, so it needs a `getById($assignmentId)` first, and its
  string uses `{$name}`, the parameter its `SubmissionLog::logEvent()`
  call passes, in `locale/en_US/submission.po`.
- Guard: a test of `saveParticipant()` that an edit writes one
  `participantEdited` entry, an edit that changes nothing writes none,
  and an assignment writes one `participantAdded` entry.

Small: one method in one shared handler, a constant and an English
string, tried.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-logged-as-assigned/walk.js)
  takes the Steps on the three apps
  (`node bin/probe.js all shared/playwright/checks/issues/edit-assignment-logged-as-assigned/walk.js`
  on an install freshly reset to the default dataset) and reads the
  submission's newest `event_log` rows: the new row is event type
  `268435459` with `submission.event.participantAdded`. The neighbour
  cases, walked with the fix in and out, are in
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-logged-as-assigned/neighbour.js)
  ("Assign" of a new participant, then "Edit" › "OK" with nothing
  changed). The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/edit-assignment-logged-as-assigned/fix.diff ojs omp ops`.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). Nothing in the fault depends on the database.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`,
  OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), ui-library `280f98c5`;
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`, ui-library `1a7a4750`); lib/pkp `stable-3_4_0`
  `df13621c2d`, `stable-3_3_0` `d446601ebe`; OJS `stable-3_4_0`
  `9571d8fde7`, `stable-3_3_0` `9fdb9bcf9a`; OMP `0aec65441`,
  `8e72fc883`; OPS `acd8ae704b`, `c5532e2161`.
- 3.5, walked: the same Steps add the same "was assigned" line on the
  three apps. Code: `saveParticipant()` writes the same unconditional
  entry.
- 3.4 (code): `saveParticipant()` in lib/pkp `stable-3_4_0` writes the
  same entry on both branches; `StageParticipantGridRow` offers "Edit"
  (`addParticipant` with the `assignmentId`).
- 3.3 (code): `StageParticipantGridHandler.inc.php` calls
  `SubmissionLog::logEvent(…, SUBMISSION_LOG_ADD_PARTICIPANT,
  'submission.event.participantAdded', …)` after `execute()` on both
  branches; `StageParticipantGridRow.inc.php` offers "Edit". OMP and OPS
  share lib/pkp on each branch.
- Introduced: the log block's lines blame to later reformatting
  commits; the commit that added the edit branch beside the
  unconditional log is `8484a16aff` (`git log -S editStageParticipant`),
  the first commit of `pkp/pkp-lib#4753` as it landed on the branch;
  the PR's last commit is `fa42b26653` (2019-05-21).
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched by
  the symptom's words ("activity log", "edit", "participant",
  "was assigned to this submission") and by `saveParticipant`,
  `participantAdded`, `editStageParticipant`; nothing on this fault.
  `pkp/pkp-lib#12497` is about who may change the recommend-only box.
- Who reads the Activity Log (code): `SubmissionInformationCenterHandler::authorize()`
  admits a site administrator, a manager, or a user whose role on the
  submission is manager or sub-editor; authors and assistants are refused.
  That the participant gets no notice or email (code):
  `PKPStageParticipantNotifyForm::execute()` sends only when a message
  is posted, the "Edit Assignment" form has none, and the handler's
  trivial notice goes to the signed-in editor.
- Not driven: "OK" on an "Edit Assignment" with no settings; an edit
  while logged in as another user; the participant's mailbox.
