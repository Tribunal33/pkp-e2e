# Changing a participant's assignment with "Edit" adds a "was assigned to this submission" line to the Activity Log

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#4753` for `pkp/pkp-lib#3758` · [8484a16aff](https://github.com/pkp/pkp-lib/commit/8484a16affc13b7d0d0830c73522d53f31c542d4) · 2018-10-30 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a7)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor opens "Edit" on a participant's row of the workflow's
Participants panel to change "Permissions" (whether the person may edit
the publication's details) or "Assignment privileges" (whether an editor
may only recommend a decision). After "OK", the submission's Activity
Log gains "{name} ({username}) was assigned to this submission as a
{role}.", the line a new assignment writes, where a line saying the
assignment was changed is expected. "OK" with no box touched adds the
same line.

The log shows an assignment that did not happen and holds no record of
the change that did. The edit itself is saved.

## Impact

- **Lost**: the log's record of who was allowed to edit the publication
  or to decide, and when that changed. The false line has the same
  person, role and text as a real assignment's, so a reader cannot tell
  the two apart.
- **Who**: anyone reading a submission's Activity Log after an editor
  pressed "OK" in "Edit Assignment". The edit can be made on any stage.
- **Way round**: none in the log. The Participants panel shows today's
  state only: "Only allowed to recommend an editorial decision" on the
  row for "Assignment privileges", and "Permissions" inside "Edit".

Low: a log line with the wrong wording. No code reads the entry, and
the settings themselves are right on screen.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (pkp/datasets, 2026-10-01),
  nothing else; the `stable-3_5_0` dataset holds the same people and
  submissions, and the steps are the same there. The steps name OJS. On
  OMP use submission 1 ("The ABCs of Human Survival: A Paradigm for
  Global Citizenship", author Arthur Clark), on OPS submission 1 ("The
  influence of lactation on the quantity and quality of cashmere
  production", author Carlo Corino).

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), the Journal editor
   (Press editor on OMP, Preprint Server manager on OPS).
2. On the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) press "View" on
   submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice". On OMP and OPS
   `dbarnes` is not assigned to submission 1, so open it by address:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`.
3. In the "Participants" panel press "Craig Montgomerie More Actions" on
   the Author's row, then "Edit".
4. Tick the box under "Permissions" (on OPS it is ticked, so untick it)
   and press "OK". The notice reads "The stage assignment has been
   changed.".
5. Press "Activity Log" in the workflow's header and read the top line
   of "History".

**Expected**: a line saying that Craig Montgomerie's assignment was
changed.

**Observed**: the line of a new assignment.

```
Date        User               Event
2026-10-01  Craig Montgomerie  Craig Montgomerie (cmontgomerie) was assigned to this submission as a Author.
```

Pressing "Edit" and "OK" again without touching the box adds the same
line once more. The "User" column naming the participant is a fault of
its own:
[U35-A14-activity-log-names-participant-not-editor.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A14-activity-log-names-participant-not-editor.md).

For comparison: "Assign" on the same panel writes this line for a
person who was in fact assigned.

## Cause

`StageParticipantGridHandler::saveParticipant()`
(`lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php`)
serves both "Assign" and "Edit". It tells them apart for the notice
(line 377, `$stageAssignmentId != $assignmentId`: "User added as a stage
participant." or "The stage assignment has been changed."), but the log
entry right below (lines 384 to 399, under the comment "Log addition")
is written on both branches with the event type
`SUBMISSION_LOG_ADD_PARTICIPANT` and the message
`submission.event.participantAdded`.

8484a16aff added the edit path to this method for the "Permissions"
box. It split the notice in two and left the log entry as it was.

Reach:

- Every "OK" in "Edit Assignment" that reaches the save, on any stage.
  Walked on the three apps: the Author's "Permissions", a section
  editor's "Assignment privileges", and an "OK" with no box touched.
  `AddParticipantForm::execute()` returns the assignment's id whether or
  not it wrote anything, so the handler cannot tell.
- A refused save writes nothing: the handler returns at line 340, before
  the log, when `Validation::canEditParticipant()` says no (code read;
  that refusal is
  [U35-A1-section-editor-edit-assignment-saves-nothing.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A1-section-editor-edit-assignment-saves-nothing.md)).
- The form's template is the method's only caller, and nothing but this
  handler and the 3.4 migration `I8933_EventLogLocalized` names the
  event type, so a new type needs no other change (code read).
- Lines already in the log: a past edit's entry has the same type and
  text as an assignment's, so no migration can relabel them.

## Proposed fix

Give the edit its own event type and message, and write it only when a
box changed. `AddParticipantForm::execute()` hands back a fourth value,
whether the assignment is new or a box now differs; the handler logs
"assigned" for a new assignment, "changed" for a changed one and nothing
otherwise.
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-logged-as-assignment/fix.diff)
also adds the constant
`PKPSubmissionEventLogEntry::SUBMISSION_LOG_EDIT_PARTICIPANT` and the
English string.

```diff
--- a/lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php
+++ b/lib/pkp/controllers/grid/users/stageParticipant/form/AddParticipantForm.php
                     if ($isChangeRecommendOnlyAllowed) {
+                        $isChanged = (bool) $stageAssignment->recommendOnly !== $recommendOnly;
                         $stageAssignment->recommendOnly = $recommendOnly;
                     }
                     if ($isChangePermitMetadataAllowed) {
+                        $isChanged = $isChanged || (bool) $stageAssignment->canChangeMetadata !== $canChangeMetadata;
                         $stageAssignment->canChangeMetadata = $canChangeMetadata;
                     }
…
-        return [$userGroup->id, $userId, $stageAssignment->id];
+        return [$userGroup->id, $userId, $stageAssignment->id, $isChanged];
--- a/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
+++ b/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
-            [$userGroupId, $userId, $stageAssignmentId] = $form->execute();
+            [$userGroupId, $userId, $stageAssignmentId, $isChanged] = $form->execute();
…
-            if ($stageAssignmentId != $assignmentId) { // New assignment added
+            $isNewAssignment = $stageAssignmentId != $assignmentId;
+            if ($isNewAssignment) {
…
+            if (!$isChanged) {
+                return \PKP\db\DAO::getDataChangedEvent($userGroupId);
+            }
…
-                'eventType' => PKPSubmissionEventLogEntry::SUBMISSION_LOG_ADD_PARTICIPANT,
+                'eventType' => $isNewAssignment
+                    ? PKPSubmissionEventLogEntry::SUBMISSION_LOG_ADD_PARTICIPANT
+                    : PKPSubmissionEventLogEntry::SUBMISSION_LOG_EDIT_PARTICIPANT,
…
-                'message' => 'submission.event.participantAdded',
+                'message' => $isNewAssignment ? 'submission.event.participantAdded' : 'submission.event.participantEdited',
--- a/lib/pkp/locale/en/submission.po
+++ b/lib/pkp/locale/en/submission.po
+msgid "submission.event.participantEdited"
+msgstr "The assignment of {$userFullName} ({$username}) to this submission as a {$userGroupName} was changed."
```

Tried on `main`, the three apps. With the diff applied:

- The edit's line reads "The assignment of Craig Montgomerie
  (cmontgomerie) to this submission as a Author was changed.".
- "Edit" and "OK" with no box touched add no line.
- An "Assign" and a "Remove" of Minoti Inoue in the same walk wrote
  "… was assigned to this submission …" and "… was removed from this
  submission …" as before.

The model is compared by hand because `StageAssignment` declares no
casts, so Eloquent's `isDirty()` would call 1 against `true` a change.
The string's wording is the team's to choose.

**Alternatives**

- Log "changed" on every "OK" of the edit form, with the test the
  notice already uses and no change to the form. Smaller, but an "OK"
  that changed nothing would log a change: the same false line in other
  words.
- Write no log entry on an edit. The false line goes, and so does any
  record of the change.
- Say in the line which box changed and to what. More useful to the
  reader, but the wording is a product decision.

**What goes with it**

- Translations. Until the new string is translated, the log shows the
  raw key in other languages: in French the line read
  "##submission.event.participantEdited##" with the fix in. The log is
  drawn when it is read, so stored lines read right once the string
  exists.
- The fix for the "User" column
  ([U35-A14-activity-log-names-participant-not-editor.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A14-activity-log-names-participant-not-editor.md))
  renames the entry's `userFullName` to `participantName` in this same
  array. The new string here is written for the array as it stands; if
  that fix lands first or with it, the string takes
  `{$participantName}`.
- The notice "The stage assignment has been changed." still shows after
  an "OK" that changed nothing. The same `$isChanged` could gate it;
  left out here.
- A backport to 3.5: `saveParticipant()` has the same condition and the
  same single entry there and `execute()` reads the same, but the entry
  has no `'impersonatedUserId'` line and stores `getFullName()`, so
  the handler's hunk does not apply as written and needs a 3.5 version.
  The constant's value, 268435466, is unused on that branch.
- The guard: an e2e scenario that edits an assignment and reads the
  log's new line, a Planned item in the spec.

Small: a flag out of the form, one condition in one handler method, a
constant and a locale string, with no data repair.

## Evidence

- Kept script (pkp-e2e's probe kit, on an install loaded from the
  default dataset; `<feature>` names that install's fleet file, `<id>`
  the output folder):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-assignment-logged-as-assignment/walk.js)
  takes the steps, reads the new line in French, presses "Edit" and "OK"
  with no box touched, then assigns and removes Minoti Inoue (Section
  editor; Series editor; Moderator) and reads the log again. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/edit-assignment-logged-as-assignment/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/edit-assignment-logged-as-assignment/fix.diff ojs omp ops`,
  the script, then `revert`.
- The walk opens the workflow by address on every app. The French line
  is read as `dbarnes` at the log grid's own address
  (`/index.php/publicknowledge/$$$call$$$/grid/event-log/submission-event-log-grid/fetch-grid?submissionId=4`)
  after switching the language at `…/user/setLocale/fr_CA`. Unfixed, it
  reads "(cmontgomerie) a été ajouté-e à cette soumission en tant que
  Auteur-e.".
- The stored entry: event type 268435459
  (`SUBMISSION_LOG_ADD_PARTICIPANT`), message
  `submission.event.participantAdded`; with the fix in, the edit leaves
  no entry of that type.
- Walked on `main`: OJS 4408b94def (lib/pkp f5bd392a69), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6). Walked on `stable-3_5_0`: OJS
  4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491): the
  same line on every app. The French read and the untouched "OK" were
  walked on `main` only. Dataset: pkp/datasets c657990 (2026-10-01).
  PostgreSQL.
- Code read, 3.5 (pkp-lib `stable-3_5_0` 1fb843f491) and 3.4
  (`stable-3_4_0` df13621c2d): `saveParticipant()` has the same split
  notice and the same single log entry. 3.4 not walked.
- Code read, 3.3 (pkp-lib `stable-3_3_0` d446601ebe):
  `StageParticipantGridHandler.inc.php` has the same split notice, then
  `SubmissionLog::logEvent(…, SUBMISSION_LOG_ADD_PARTICIPANT, 'submission.event.participantAdded', …)`
  on both branches. Not walked.
- Introduced: `git log -S"notification.editStageParticipant"` on the
  handler gives 8484a16aff, first in 3.2.0. GitHub's API
  (`commits/<sha>/pulls`) names `pkp/pkp-lib#4753`, merged 2019-05-21.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ui-library and
  the pkp organisation, issues and PRs, by Activity Log, edit
  assignment, logged, assigned, participant, recommend only, and by
  `participantAdded`, `SUBMISSION_LOG_ADD_PARTICIPANT` and
  `saveParticipant`. Nothing reports this fault.
- Not driven: a section editor's own "Edit", which is refused before
  the log today (the A1 report above); the fix on `stable-3_5_0`.
