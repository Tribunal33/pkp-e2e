# The Activity Log credits a participant's assignment or removal to the participant, not the editor

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#8941` for `pkp/pkp-lib#8933` · [13653090ce](https://github.com/pkp/pkp-lib/commit/13653090ce48072081ca249544e3ec468b53ddee) · 2023-05-17 (merged 2023-06-02) · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the "{name} ({username}) was assigned to this submission as a {role}."
and "{name} ({username}) was removed from this submission as a {role}."
lines of a submission's Activity Log, the "User" column should name the
editor who acted. It names the participant instead, so the log never
says who assigned or removed them. "Edit" on a participant writes the
same "was assigned" line ([reported separately](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A7-edit-assignment-logged-as-assigned.md)), with the same
wrong "User". The other lines, such as "Article submitted" or a
decision, name the person who acted.

The assignment or removal itself is done as asked, and the database
still records who acted; only the Activity Log shows the wrong person,
and no screen shows the right one.

This holds for every such line, new or old. On 3.3 these lines name the
editor; once an install is upgraded to 3.4 or later, the same lines name
the participant. The proposed fix also corrects the lines already in the
log, through an upgrade migration, which is why its effort is medium.

## Impact

- **Lost:** who assigned or removed each participant, as the Activity
  Log shows it. The line reads as if the participant acted.
- **Who:** the editors who read a submission's Activity Log: managers
  and the editors assigned to the submission.
- **Way round:** none on screen.

Low: only the history's attribution is wrong. It would be medium where a
journal relies on the Activity Log to audit who changed a submission's
editors.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, OJS, OMP or OPS.

The submission and a person not yet on it, in an editor role:
- OJS: submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice"; "Minoti Inoue",
  "Section editor".
- OMP: submission 6, "The Information Literacy User’s Guide";
  "Stephanie Berardo", "Series editor".
- OPS: submission 1, "The influence of lactation on the quantity and
  quality of cashmere production"; "Minoti Inoue", "Moderator".

Assigning:
1. Sign in as `dbarnes` (Daniel Barnes) and open the submission's
   workflow at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<ID>`.
2. In "Participants", press "Assign".
3. Choose the role, press "Search", choose the person and press "OK",
   with no message.
4. Press "Activity Log" at the top and read the top line of "History",
   then close the window.

Removing:
5. In "Participants", open the person's "More Actions" menu, choose
   "Remove" and press "OK".
6. Press "Activity Log" again and read the top line of "History".

**Expected:** both new lines show "Daniel Barnes" in the "User" column.

**Observed:** both new lines show the participant in the "User" column
(OJS):

```
User: Minoti Inoue   Event: Minoti Inoue (minoue) was assigned to this submission as a Section editor.
User: Minoti Inoue   Event: Minoti Inoue (minoue) was removed from this submission as a Section editor.
```

OMP shows "Stephanie Berardo" on the "Series editor" lines, and OPS
shows "Minoti Inoue" on the "Moderator" lines. [On 3.5 the removal
message is worded differently, with the name in quotation marks:
`"Minoti Inoue" (minoue) is removed as a Section editor.`]

Control: in the same "History", "Article submitted" shows the author
who submitted ("Craig Montgomerie" on OJS).

## Cause

The "User" column of the Activity Log's History
(`EventLogGridCellProvider::getTemplateVarsFromRowColumn()`) shows
`EventLogEntry::getUserFullName()`. That method returns the entry's
stored `userFullName` and falls back to the name of `userId`, the user
who triggered the event. So `userFullName` stands for the user who
acted, and every other place that logs it stores that user: the
copyright agreement (`PKPSubmissionController`), the task and discussion
events (`EditorialTaskController`, the "actioned" user) and OMP's
sign-off (`PublicationFormatGridHandler`).

`StageParticipantGridHandler::saveParticipant()` and `deleteParticipant()`
(`lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php`)
store the participant's name under that key instead, because the message
`submission.event.participantAdded` (and `participantRemoved`) needs it
as the `{$userFullName}` parameter:

```php
'userId' => Validation::loggedInAs() ?? $user->getId(),   // the editor, correct
...
'userFullName' => $assignedUser->getFullNames(),          // the participant
```

`getUserFullName()` finds the participant's name there and never
reaches `userId`. This came in with `pkp/pkp-lib#8933` (3.4), which
moved the event log to schema properties. Until then these entries
passed the name as the parameter `name`, which the 3.3 History does not
read as the user. The same change's upgrade migration
(`I8933_EventLogLocalized::mapSettings()`) renamed `name` to
`userFullName` for these two event types, which is how lines written on
3.3 come to show the participant after an upgrade. Their `user_id` has
always held the editor, so every stored line can be corrected.

Reach:
- Only these two methods log a name other than the actor's under
  `userFullName` (searched in pkp-lib and the three apps). "Edit" logs
  through `saveParticipant()`, so its line is covered too. The
  file-auditor messages that also use `{$userFullName}` are no longer
  logged by any code.
- Stored entries: every "was assigned" and "was removed" entry on an
  install since 3.4 (event types `0x10000003`, `0x10000004`).
- No other screen reads these entries' `userFullName`. The REST API
  exposes only discussions' activity from the event log
  (`TaskResource`), which these entries are not part of (read in the
  code).

## Proposed fix

Give the participant's name a key of its own, as the event log already
does for a reviewer (`reviewerName`), an editor (`editorName`) and an
email's recipient (`recipientName`), and move the stored entries to it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/fix.diff)):

- `schemas/eventLog.json`: a multilingual `participantFullName`, "The
  full name of the user assigned to or removed from the submission, when
  that is not the user who triggered the event."
- `StageParticipantGridHandler::saveParticipant()` and
  `deleteParticipant()`: `'participantFullName' =>
  $assignedUser->getFullNames()` in place of `'userFullName' => …`.
- `locale/*/submission.po`: both messages use `{$participantFullName}`
  in every language that translates them (47 files), as
  `pkp/pkp-lib#9072` did for the 3.4 renames. Most used
  `{$userFullName}`; Lithuanian (both messages), Azerbaijani and Swedish
  (the removal) still use the 3.3 `{$name}`, which today shows as the
  raw text "{$name}".
- An upgrade migration that renames the stored setting for the two
  event types, registered in the 3.6.0 block of each app's
  `dbscripts/xml/upgrade.xml` (the same line and context in all three).
  Its class name, `IXXXXX_EventLogParticipantName`, is a placeholder
  that awaits the issue number:

```php
DB::table('event_log_settings')
    ->where('setting_name', 'userFullName')
    ->whereIn('log_id', DB::table('event_log')->select('log_id')->whereIn('event_type', self::EVENT_TYPES))
    ->update(['setting_name' => 'participantFullName']);
```

With that, `userFullName` again means only the user who acted, and the
"User" column falls back to `userId` for these lines.

Tried on `main`, all three apps. The Steps now show "Daniel Barnes" on
both new lines, with the messages unchanged. After the migration ran on
the same installs, the lines already there did too (OJS submission 9's
"was assigned" lines, OMP submission 6's "Minoti Inoue (minoue) was
assigned …"). Every other History line of those submissions read as
before, and the migration left the other event types' `userFullName`
alone (OMP's sign-off entries). The three locales above and the
`upgrade.xml` lines were added to the diff afterwards and were not
tried; the migration was run directly instead.

**Alternatives:**
- Make `getUserFullName()` ignore `userFullName` for the two participant
  event types: one place, and it corrects the stored lines with no
  migration. But it is a guard where the value is read. The key keeps
  two meanings, and the next code that logs someone other than the
  actor under it repeats the fault.
- Rename the actor's key instead: every other place that logs it and
  `TaskResource` use it correctly, so far more would change.
- Also move `username` to a `participantUsername`: it is the same kind
  of mix-up, but no screen reads `username` as the actor today. It is
  optional and can come with this change.

**What goes with it:**
- The fix for "Edit" being logged as a new assignment
  ([report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A7-edit-assignment-logged-as-assigned.md)) adds a "was changed" message with the same
  parameters. Whichever of the two fixes lands second uses
  `participantFullName` there.
- A plugin on the `EventLog::add` hook, or a report that reads these
  entries' `userFullName`, finds the name under `participantFullName`.
- Backport: none proposed, for a low-severity fault. Should the team
  want one on 3.5 (3.4 is the same), the migration needs a new
  `3.5.0.x` `<upgrade>` block in each app's `upgrade.xml`; the property
  is a plain string there, since 3.5 and 3.4 do not make `userFullName`
  multilingual and call `getFullName()`; and the locale edits must be
  redone, since 3.5's English removal message is worded differently.
- Guard: a handler test that `saveParticipant()` and
  `deleteParticipant()` store the editor's `userId` and no
  `userFullName`, and an e2e check that the Activity Log line shows the
  editor.

Medium: a migration registered in three apps and 47 locale files, on
top of a two-line handler change.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js)
  takes the Steps on the three apps:
  `node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js`.
  The neighbour check is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/neighbour.js),
  and [migrate.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/migrate.php)
  runs the diff's migration on one install.
- Walked on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). MySQL not checked for the migration's
  `UPDATE … WHERE log_id IN (SELECT …)`.
- Tips: `main` OJS `bade233f73` (lib/pkp `2e377d27fc`), OMP `3b0ecf794`,
  OPS `c8af945bb7` (lib/pkp `3dc90c81a6`), ui-library `280f98c5`;
  `stable-3_5_0` OJS `92b9a16b48`, OMP `3081c9b00`, OPS `cf4fce69bd`
  (lib/pkp `a9c76aed62`, ui-library `1a7a4750`); lib/pkp `stable-3_4_0`
  `df13621c2d`, `stable-3_3_0` `d446601ebe`; OJS `stable-3_4_0`
  `9571d8fde7`, `stable-3_3_0` `9fdb9bcf9a`.
- 3.5 code: both handler methods store `'userFullName' =>
  $assignedUser->getFullName()`, and `getUserFullName()` reads
  `getData('userFullName')` first.
- 3.4 (code): lib/pkp `stable-3_4_0` has the same two methods, the same
  `getUserFullName()` and the same `I8933_EventLogLocalized` rename; the
  History's cell provider shows `getUserFullName()`. OMP and OPS share
  lib/pkp on each branch.
- 3.3 (code): `StageParticipantGridHandler.inc.php` logs through
  `SubmissionLog::logEvent()` with `['name' => …]`. `EventLogDAO::build()`
  keeps the settings as the entry's params, so `getUserFullName()` finds
  no `userFullName` and shows the user of `user_id`, the editor.
- Introduced: `git log -S` on the `'userFullName' => $assignedUser`
  lines finds `13653090ce`, which replaced the `name` parameter;
  `commits/13653090ce/pulls` gives `pkp/pkp-lib#8941` for
  `pkp/pkp-lib#8933`. `173bde9155` (`pkp/pkp-lib#12821`, 2026) later made
  `userFullName` multilingual and did not change the fault.
- Upstream: related but different, `pkp/pkp-lib#12821` (`{$userGroupName}`
  on the same lines) and `pkp/pkp-lib#7150` (discussions credited to the
  wrong user).
- Not driven: an assignment made while logged in as another user; the
  migration through `tools/upgrade.php`; translated interfaces.
