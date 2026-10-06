# The Activity Log's "User" column names the participant who was assigned or removed, not the editor who did it

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: none (code; the column showed the acting user)
- **Introduced** `pkp/pkp-lib#8941` for `pkp/pkp-lib#8933` · [13653090ce](https://github.com/pkp/pkp-lib/commit/13653090ce48072081ca249544e3ec468b53ddee) · 2023-05-17 · Vitalii Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a14)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor assigns a participant to a submission or removes one, the
submission's Activity Log gains a line such as "Minoti Inoue (minoue)
was assigned to this submission as a Section editor."; changing an
assignment writes the same "was assigned" line. The "User" column of
that line is expected to name the editor who did it, as it does on the
log's other lines. It names the participant.

The log therefore never shows who assigned, changed or removed a
participant, and no other screen does.

No setting is involved: every such line of every submission reads this
way, the lines written before today included.

## Impact

- **Lost**: the name of the editor who acted. Nobody is told; the line
  looks complete. The database still holds the acting editor for each
  line, so a fix can show it for past lines too. That is also why the
  effort is medium: the participant's name sits under the key the
  column reads first, so every stored line has to be rekeyed, and the
  line's text changes a placeholder in 47 languages.
- **Who**: anyone reading a submission's Activity Log. On an install
  upgraded from 3.3, the lines 3.3 wrote show the participant too after
  the upgrade (from the code; no upgrade was run).
- **Way round**: none on screen. Someone with database access can read
  the acting editor from the line's row (`event_log.user_id`).

Medium: the "User" column is wrong on every participant line, silently
and with no way round on screen; no editorial task fails.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (pkp/datasets, 2026-10-01),
  nothing else; the `stable-3_5_0` dataset holds the same people and
  submissions. The steps name OJS. On OMP use submission 1 ("The ABCs of
  Human Survival: A Paradigm for Global Citizenship") and the role
  "Series editor"; on OPS submission 1 ("The influence of lactation on
  the quantity and quality of cashmere production") and the role
  "Moderator".

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), Daniel Barnes, the
   Journal editor (Press editor on OMP, Preprint Server manager on OPS).
2. On the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial`) press "View" on
   submission 4, "Computer Skill Requirements for New and Existing
   Teachers: Implications for Policy and Practice". On OMP and OPS
   `dbarnes` is not assigned to submission 1, so open it by address:
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=1`.
3. In the "Participants" panel press "Assign". Choose "Section editor"
   in the role list, press "Search", choose "Minoti Inoue", leave the
   message as it is and press "OK". The notice reads "User added as a
   stage participant.".
4. On Minoti Inoue's row press "Minoti Inoue More Actions", then "Edit".
   Tick the box under "Assignment privileges" and press "OK". The notice
   reads "The stage assignment has been changed.".
5. On the same row press "More Actions", then "Remove", and "OK" in the
   "Remove Participant" dialog.
6. Press "Activity Log" in the workflow's header and read the top three
   lines of "History".

**Expected**: the three lines carry "Daniel Barnes" in the "User"
column: he assigned her, changed her assignment and removed her.

**Observed**: all three carry the participant's name.

```
Date        User          Event
2026-10-01  Minoti Inoue  Minoti Inoue (minoue) was removed from this submission as a Section editor.
2026-10-01  Minoti Inoue  Minoti Inoue (minoue) was assigned to this submission as a Section editor.
2026-10-01  Minoti Inoue  Minoti Inoue (minoue) was assigned to this submission as a Section editor.
```

[On 3.5 the removal line reads ""Minoti Inoue" (minoue) is removed as a
Section editor."; its "User" is the same.] The second "was assigned"
line is step 4's edit, a fault of its own:
[U35-A7-edit-assignment-logged-as-assignment.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A7-edit-assignment-logged-as-assignment.md).

A line the dataset already holds reads the same way. On the journal's
submission 3 ("The Facets Of Job Satisfaction: …"), "Maria Fritz
(mfritz) was assigned to this submission as a Copyeditor." carries
"Maria Fritz"; on the press's submission 1 it is Sarah Vogt's line.

Control: in the log of the journal's submission 3, "Daniel Barnes
accepted this submission and sent it to the copyediting stage." carries
"Daniel Barnes" (the press's submission 1 has the same line). On the
preprint server's submission 1, "Preprint submitted" carries its
author, "Carlo Corino".

## Cause

`StageParticipantGridHandler::saveParticipant()` and
`deleteParticipant()`
(`lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php`,
lines 395 and 480) store the participant's name in the log entry under
the key `userFullName`, as a parameter of the message
("{$userFullName} ({$username}) was assigned …"). The entry's `userId`
is right: the signed-in editor.

`userFullName` is also the key the "User" column reads.
`EventLogEntry::getUserFullName()`
(`lib/pkp/classes/log/event/EventLogEntry.php`, line 237) returns the
entry's stored `userFullName` and looks up `userId` only when none is
stored, and `EventLogGridCellProvider` (line 71) prints that value. The
schema (`lib/pkp/schemas/eventLog.json`) describes the key as the name
of the user behind the event.

The event log refactoring 13653090ce brought it in. Before it, the
handler passed the name as the parameter `name`, and the column fell
back to `userId`. The change renamed the parameter to `userFullName` in
the handler.

Reach:

- "Assign", "Edit" and "Remove" in the Participants panel, on every
  stage (walked, the three apps). The handler is the only writer of the
  two messages (code read).
- Every such line stored since 3.4 (walked for the dataset's own lines).
- On an install upgraded from 3.3, the lines 3.3 wrote as well: the
  3.4 upgrade migration `I8933_EventLogLocalized::mapSettings()`
  renames their stored `name` to `userFullName` for both event types
  (code read; no upgrade was run).
- Only the Activity Log shows it: `getUserFullName()` has no caller but
  the log's grid, and no API or export returns a submission's log (code
  read).
- The other entries that store `userFullName` are right. The copyright
  agreement (`PKPSubmissionController`) and the task entries
  (`EditorialTaskController`) store the acting user's own name there.
  Entries about another person use a key of their own (`reviewerName`,
  `editorName`, `recipientName`) (code read).

## Proposed fix

Store the participant's name under a key of its own, as the reviewer
entries do with `reviewerName`, and leave `userFullName` unset so the
column falls back to the entry's `userId`. Four parts, the first three
in [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/fix.diff):

```diff
--- a/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
+++ b/lib/pkp/controllers/grid/users/stageParticipant/StageParticipantGridHandler.php
@@ -392,7 +392,7 @@
                 'message' => 'submission.event.participantAdded',
                 'isTranslated' => false,
                 'dateLogged' => Core::getCurrentDate(),
-                'userFullName' => $assignedUser->getFullNames(),
+                'participantName' => $assignedUser->getFullNames(),
                 'username' => $assignedUser->getUsername(),
                 'userGroupName' => $userGroup->name,
             ]);
@@ -477,7 +477,7 @@
             'message' => 'submission.event.participantRemoved',
             'isTranslated' => false,
             'dateLogged' => Core::getCurrentDate(),
-            'userFullName' => $assignedUser->getFullNames(),
+            'participantName' => $assignedUser->getFullNames(),
             'username' => $assignedUser->getUsername(),
             'userGroupName' => $userGroup->name,
         ]);
```

- `lib/pkp/schemas/eventLog.json`: a multilingual string property
  `participantName`. `EntityDAO::fromRow()` drops a setting the schema
  does not name.
- `lib/pkp/locale/*/submission.po`, the strings
  `submission.event.participantAdded` and
  `submission.event.participantRemoved`, 47 files:
  - `{$userFullName}` becomes `{$participantName}` in the 46 locales
    that use it in either string.
  - The stale `{$name}`, which no entry has filled since 3.4, becomes
    `{$participantName}` too: both strings in `lt`, the removal string
    in `az` and `sv`.
  - Left out: `vi`, whose two strings name no person and carry a broken
    `{username})`, and the locales where a string is empty.
  - The diff edits the translated files directly. A locale left with
    `{$userFullName}` would print the placeholder as text.
- An upgrade migration, not in the diff, that rekeys the stored entries:

  ```sql
  UPDATE event_log_settings SET setting_name = 'participantName'
  WHERE setting_name = 'userFullName'
    AND log_id IN (SELECT log_id FROM event_log WHERE event_type IN (268435459, 268435460));
  ```

Tried on `main`, the three apps: with the diff applied the steps' three
lines carry "Daniel Barnes" under "User" and the same "Event" text. A
second check read the whole logs of the journal's submission 3 and the
press's and the server's submission 1 with the fix out and in: the lines
that are not about participants kept their "User" and "Event".

With the diff alone, the dataset's stored line read "{$participantName}
(mfritz) was assigned to this submission as a Copyeditor.". After the
SQL statement above it read "Maria Fritz (mfritz) was assigned …" again,
with "Daniel Barnes" under "User". The migration class was not written
or run: only its statement, by hand on the test database.

**Alternatives**

- Make `EventLogEntry::getUserFullName()` or the grid's "User" cell
  ignore the stored name for these two event types. No locale or data
  change, but it patches the reader, and the key keeps two meanings for
  whatever reads the entries next.
- Always read the column from `userId`. The copyright and task lines
  would then show the user's present name, not the name stored when
  the line was written.

**What goes with it**

- Where the migration runs: on `main`, a `v3_6_0` class listed in each
  app's `dbscripts/xml/upgrade.xml`. A backport needs its own class on
  that stable branch (`v3_5_0`, `v3_4_0`), listed there and again in the
  later branches' lists, as `I13128_FixEmailUrlLinks` is ("Already added
  to 3.5.0-5 but idempotent").
- Repeat runs are harmless: after one run no entry of the two types
  holds `userFullName`. `down()` can reverse the rename exactly, or
  throw `DowngradeNotSupportedException` as 20 of the 46 `v3_6_0`
  migrations do.
- Editing `I8933_EventLogLocalized::mapSettings()` cannot replace the
  new migration: an install already past 3.4.0 never runs it again. The
  new migration runs after it and covers a 3.3 upgrade too, so I8933
  can stay as it is.
- Rows written by 3.4 and 3.5 carry no locale (a plain string; seen in
  the 3.5 dataset), while `participantName` is multilingual on `main`.
  `EntityDAO::fromRow()` hands such a row back as a plain string and
  `getTranslatedMessage()` prints a plain string as it is. Read in the
  code, not run: the trial's stored rows were written by `main`.
- A backport to 3.5 and 3.4 is the same change by hand: there the
  handler stores `getFullName()` (a plain string, so the schema property
  is not multilingual) and the removal string differs.
- Not part of this fix, and kept by it: `getFullNames()` holds a name
  only for the languages the user filled in, so in another language the
  line has no name. In French, an author with an English-only name
  gives "(cmontgomerie) a été ajouté-e à cette soumission en tant que
  Auteur-e.".
- The guard: an e2e scenario that assigns and removes a participant and
  reads the "User" column of both lines, a Planned item in the spec.

Medium: stored entries need a migration, and the rename spans the
schema, the handler and 47 locale files.

## Evidence

- Kept scripts (pkp-e2e's probe kit, on an install loaded from the
  default dataset; `<feature>` names that install's fleet file, `<id>`
  the output folder):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js)
  takes the steps;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-names-participant-not-editor/neighbour.js)
  is the second check: it reads the whole Activity Log of OJS 3, OMP 1
  and OPS 1 as `dbarnes`, and with `repair` as its argument first runs
  the SQL statement above. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/activity-log-names-participant-not-editor/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/activity-log-names-participant-not-editor/fix.diff ojs omp ops`,
  `neighbour.js`, `neighbour.js repair`, `walk.js`, then `revert`.
- The walk opens the workflow by address on every app. It also reads
  the stored entries: each of the three has `dbarnes` as its `user_id`
  and the settings `userFullName`, `username`, `userGroupName`
  (`participantName` in place of the first with the fix in). So do the
  dataset's own lines for Maria Fritz and Sarah Vogt, which is how the
  report knows Daniel Barnes assigned them. The OPS dataset holds no
  stored assignment line.
- Walked on `main`: OJS 4408b94def (lib/pkp f5bd392a69), OMP 3b0ecf794c
  and OPS c8af945bb7 (lib/pkp 3dc90c81a6). Walked on `stable-3_5_0`: OJS
  4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491): the
  same result on every app. Dataset: pkp/datasets c657990 (2026-10-01).
  PostgreSQL.
- Code read, 3.4 (pkp-lib `stable-3_4_0` df13621c2d): the same two
  writes and the same reader as 3.5; 13653090ce is in 3.4.0-0. Not
  walked.
- Code read, 3.3 (pkp-lib `stable-3_3_0` d446601ebe): the locale string
  reads `{$name}` and the entry stores no `userFullName`. Not walked.
- Introduced: `git blame` on the two `newDataObject([…])` blocks gives
  13653090ce; their `userFullName` lines blame to 173bde9155
  (`pkp/pkp-lib#12821`, 2026), which only switched `getFullName()` to
  `getFullNames()`. GitHub's API (`commits/<sha>/pulls`) names
  `pkp/pkp-lib#8941`, merged 2023-06-02.
- The locale count: every `locale/*/submission.po` of pkp-lib `main`
  read for the placeholders of both strings (66 files; 12 lack the keys,
  6 and 7 have them empty).
- The French line was read as `dbarnes` at the log grid's own address
  after switching the language, in the walk of
  [U35-A7-edit-assignment-logged-as-assignment.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A7-edit-assignment-logged-as-assignment.md).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ui-library and
  the pkp organisation, issues and PRs, by Activity Log, participant,
  assigned, user column, editorial history, and by `participantAdded`,
  `SUBMISSION_LOG_ADD_PARTICIPANT`, `getUserFullName`, `userFullName`
  and `saveParticipant`. `pkp/pkp-lib#12700` (who a task was assigned
  to, in the task's history and emails) is about another log.
- Not driven: an upgrade from 3.3; a stored row without a locale; the
  lines under "Login As"; the fix on `stable-3_5_0`; the migration as a
  class.
