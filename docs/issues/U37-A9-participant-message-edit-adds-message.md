# Editing a discussion that "Notify" or "Assign" opened adds a copy of its message instead of changing it

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11828` for `pkp/pkp-lib#11701` · [b898737294](https://github.com/pkp/pkp-lib/commit/b8987372949baa561955d8cd1adbac78042905d0) · committed 2025-09-15, merged 2025-09-22 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#13345` (closed, fixed by `pkp/pkp-lib#13409`), covering the "Comments for the Editor" and recommendation discussions only
- **Tracked in** spec U37 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a9)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-06.** Since `pkp/pkp-lib#13385`, which OMP's `main`
carries and OJS's and OPS's do not yet, a press heads the copy with the
sender's name and offers the recipient no "Edit"; the sections below
say which app does what.

## Summary

A user with a manager role (such as Journal Manager or Journal Editor)
who uses "Edit" on a discussion opened by a message from the
Participants panel ("Notify", or the "Message" box of "Assign
Participant") does not change that message. The first "Save", even one
that only renames the discussion or adds a participant, adds the
window's message text as a second message. Later saves rewrite that
copy, and the original message stays as it was.

The copy is headed with the name the discussion's row shows under
"Created by". On a journal or a preprint server that is the person the
message was sent to, who is also offered "Edit" and whose "Save" adds a
message of their own. On a press it is the sender.

Nobody can remove the copy. Every discussion such a message opens is
affected, in every stage.

## Impact

- **Lost**: nothing is deleted, but the discussion's record is wrong.
  On a journal or a preprint server the copy a manager's "Save" adds is
  credited to the recipient, who wrote none of it; on a press it is
  credited to the sender, which is wrong when someone else rewrote the
  text. A
  "Save" that changes only the name or the text emails no one; a
  participant added in that "Edit" is emailed the text under the name of
  the person who saved.
- **Who**: on every app, users in a Manager-level role (Journal Manager,
  Journal Editor) and the site administrator, who may edit any
  discussion. On a press, also the person who sent the message. On a
  journal or a preprint server, also the person it was sent to (an
  author, a copyeditor, a layout editor). "Notify" and "Assign" each go
  to one person, so the copy carries one name. Any rename, added
  participant or correction of such a discussion meets it.
- **Way round**: to correct the text, post a new message instead of
  using "Edit". Renaming the discussion or adding people has none.

Medium: the copy is emailed to no one, but every participant sees it in
the discussion, under the recipient's name on a journal or a preprint
server, and it cannot be avoided or removed. A wrong entry in the
discussion stays medium; a copy emailed to people under the recipient's
name would be high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else. [OMP: submission 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", with Bart Beaty (`bbeaty`). OPS: submission
  1, "The influence of lactation on the quantity and quality of cashmere
  production", with Carlo Corino (`ccorino`).]

A manager's edit (`dbarnes` is the Journal Editor):

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 5, "Genetic transformation of forest trees", and its
   "Production" stage.
3. Under "Participants", open "More Actions" on Diaga Diouf's row and
   press "Notify".
4. Choose "Discussion (Production)" in the predefined-message list,
   replace the text in "Message" with "u37r4 first message" and press
   "Notify".
5. Open the page again. In "Production Tasks & Discussions" open the
   "Discussion (Production)" row's menu and press "Edit". The message box
   holds "u37r4 first message".
6. Change only "Name", to "u37r4 renamed", and press "Save".
7. Press "u37r4 renamed" and read the messages, then close the window.
8. Open the row's "Edit" again, replace the message with "u37r4 edited
   text" and press "Save".
9. Press "u37r4 renamed" and read the messages.

The person it was sent to (OJS and OPS only: a press offers the
recipient no "Edit", so OMP stops after step 9):

10. Back on the stage, "Notify" Diaga Diouf again with "Discussion
    (Production)" and the message "u37r4 second message".
11. Sign in as `ddiouf` (password `ddioufddiouf`), open submission 5 and
    its "Production Tasks & Discussions" [OPS: the "Production Tasks &
    Discussions" link in the preprint's side menu].
12. Open the "Discussion (Production)" row's menu, press "Edit", replace
    the message with "u37r4 author text" and press "Save".
13. Press "Discussion (Production)" and read the messages.

[3.5, where the fault does not show: the panel is the stage's
"Production Discussions" list, which names the discussion "A message
regarding Journal of Public Knowledge"; "Edit" is in the row's settings
and changes "Subject" where `main` has "Name"; in step 11 the Author's
list is "Production Discussions" (OPS: the side menu's "Discussions").]

**Expected:** step 7 shows one message, "Message from dbarnes" with
"u37r4 first message", and step 9 the same message reading "u37r4
edited text". Step 12 is refused under the message box with "You can
only edit your own discussion message.", and the discussion keeps
dbarnes's message alone. [OPS: the refusal reads
`##submission.task.validation.error.headnote.author##`, since only
OJS's locale defines that text, a separate fault.]

**Observed:** step 7 shows two messages, and step 9 rewrites only the
second:

```text
Message from dbarnes 2026-10-06 03:21 AM    u37r4 first message
Message from ddiouf  2026-10-06 03:21 AM    u37r4 edited text
```

[OMP: the second message is headed "Message from dbarnes" too.]

Step 12 saves, and step 13 shows "Message from dbarnes" with "u37r4
second message", then "Message from ddiouf" with "u37r4 author text".

The first "Save" of an edit on such a discussion, by anyone, logs
`PHP Warning: Attempt to read property "id" on null in
…/api/v1/submissions/tasks/EditorialTaskController.php on line 401`;
the request answers 200.

Control: a discussion `dbarnes` adds with the panel's "Add" keeps one
message through the same rename and text edit, its text replaced in
place.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
lines 227–235; OMP 252–260) creates the discussion's first message with
`Note::create()` and no `'isHeadnote' => true`. Since 3.6 a discussion's
first message is the note flagged `is_headnote`, not its oldest note, so
a discussion `sendMessage()` opens has none.

An edit finds the first message only by that flag.
`EditorialTask::saveHeadnote()` looks for the flagged note, finds none
and saves a new flagged note with the `description` the edit sent. Each
later save updates the new note. `fillHeadnote()` gives that note the
discussion's `createdBy` as its writer.

`sendMessage()` set `createdBy` to the recipient until
[1c3367a163](https://github.com/pkp/pkp-lib/commit/1c3367a1634a585bae56aca5aa15faac11e24c90)
("Fix sender access check to the template", labelled
`pkp/pkp-lib#12593`) set it to the sender. That commit came in with PR
`pkp/pkp-lib#13385`, merged 2026-10-05, so `git log --grep` finds it by
12593, not 13385. OMP's `lib/pkp` (e39fdee199) includes it; OJS's and
OPS's (a7f5e3081b) do not yet. The copy is therefore headed with the
recipient's name on OJS and OPS and the sender's on OMP.

The edit form fills its message field from the oldest message
(`useDiscussionManagerForm.js`, `notes[0]`) and sends it with every
save, so a rename or a participant change saves it too.

In `EditorialTaskController::editTask()` the save comes first, so
`notifyParticipants()` (line 1031) then finds the new flagged note and
emails its text to each participant the edit added, sent as the current
user. Line 401 reads `$headnote->id` from the head note loaded before the
save, which is null here, hence the warning.

The missing flag also lifts the edit limit. The `description` rule in
`api/v1/submissions/tasks/formRequests/EditTask.php` holds anyone
without the Manager or Sub-editor role in the context, other than a site
administrator, to their own first message within its first hour, and
passes when there is no flagged message. The panel's
`userHasWriteAccess()` (ui-library `useDiscussionManagerConfig.js`)
offers "Edit" to a Manager-role user or site administrator, the
discussion's `createdBy` and its responsible participant. On OJS and
OPS the recipient is the `createdBy`, so they are offered "Edit" and the
rule accepts their "Save". On OMP they are none of the three and are
offered nothing, while the sender is offered "Edit" as `createdBy`.

The omission came with b898737294, which added the `is_headnote` column
in its upgrade migration `I11701_Notes` (the install schema,
`NotesMigration`, followed in
[27024a4969](https://github.com/pkp/pkp-lib/commit/27024a49698d9de5c16c28ada6a745c73c29b88d)
for `pkp/pkp-lib#11871`), made
`saveHeadnote()` look for it, and edited both places that wrote a
discussion's first note (`sendMessage()` and `Repository::addQuery()`)
without setting it. `I11701_Notes` flags the oldest note of every
`assoc_type`/`assoc_id` pair, so discussions carried over from 3.5 are
fine. `pkp/pkp-lib#13409` later added the flag to `addQuery()` only.

Reach:

- "Assign Participant" with a message, and "Notify" in the other stages:
  `AddParticipantForm` ends in the same `sendMessage()` (read in the
  code).
- A participant added in "Edit": checked on screen on OJS. The added
  Graham Cox received "u37r4 mailed" from "Daniel Barnes" with the
  window's text, and the discussion gained the copy.
- Removing a message: no screen offers it, and
  `EditorialTaskController::deleteNote()` refuses a flagged note while
  `NoteAccessPolicy` refuses writes to an unflagged one, so neither
  message can be removed through the API either (read in the code).
- The other places a discussion's first note is written set the flag:
  `EditorialTask::fillHeadnote()` (items added in the panel, tasks from
  templates) and `Repository::addQuery()` (read in the code).
  `NewNoteForm` writes notes on submissions and files, not on
  discussions.

## Proposed fix

Flag the first note where `sendMessage()` creates it, as
`pkp/pkp-lib#13409` did in `addQuery()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/fix.diff)):

```diff
                 array_intersect_key($mailable->getData(), $additionalVariables)
             ),
+            'isHeadnote' => true,
         ]);
```

It was tried on the three apps, OMP again with 1c3367a163 in (the hunk
lands at line 252 there). Steps 7 and 9 then showed one message,
"Message from dbarnes", reading "u37r4 first message" and then "u37r4
edited text", and step 12 was refused on OJS and OPS as Expected says.
The control kept one message with and without the fix.

**Alternatives**

- Make every reader of the flag fall back to the oldest note when none
  is flagged (eight places on `main`, among them `saveHeadnote()`, the
  `EditTask` rule, `editTask()`, `notifyParticipants()` and
  `deleteNote()`): it would mend stored discussions too, but spreads a
  second rule across all of them and hides the next writer that forgets
  the flag.
- Open the discussion with `EditorialTask::create()` and its
  `description` attribute: `fillHeadnote()` would take the note's writer
  from `createdBy`, still the recipient on OJS and OPS, and
  `compileDescription()` would fill in the email's template variables a
  second time over text `sendMessage()` already filled in.

**What goes with it**

- Discussions already opened this way on installs of `main` stay
  unflagged. No repair is proposed, because the code is unreleased. A
  one-off step would flag, for each discussion (`assoc_type`
  `ASSOC_TYPE_QUERY`) that has no flagged note, its oldest note, one per
  discussion (the lowest `note_id` on a tied date). `I11701_Notes`'s own
  query is not that step: it covers every note's assoc, and a tie flags
  several.
- The fix does not depend on 1c3367a163 (the sender as `createdBy`,
  reported as [pkp-e2e#343](https://github.com/jardakotesovec/pkp-e2e/issues/343)).
- Guard: an e2e scenario that edits a "Notify" discussion and reads one
  message, replaced in place.

Small: one line and the guard; no release holds discussions to repair.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js),
  with its helpers in `lib.js` beside it. On an install freshly loaded
  from the default dataset:
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js`
  (without the first two variables for `main`).
- [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/neighbour.js)
  takes the Control;
  [email.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/email.js)
  is the participant-added check, run on OJS `main` without the fix.
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets 5a53d3d, 2026-10-05), on PostgreSQL.
- 3.5, walked: after the same steps the discussion's window listed one
  message, "u37r4 first message" and then "u37r4 edited text" by
  dbarnes, and the Author's row offered no "Edit". There
  `Repo::note()->getHeadNote()` takes the oldest note, and
  `QueriesAccessHelper::getCanEdit()` lets an Author edit only a first
  message they wrote, within the hour.
- Tips: OJS `main` 1f4cef786f (lib/pkp a7f5e3081b, lib/ui-library
  64d6736318), OMP `main` 592914b831 (lib/pkp e39fdee199, lib/ui-library
  280f98c570), OPS `main` 21e41026b2 (lib/pkp a7f5e3081b, lib/ui-library
  280f98c570). `stable-3_5_0`: OJS 4342473090 (lib/pkp 771474347e), OMP
  9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335), lib/ui-library
  d4e0188353. `stable-3_4_0` lib/pkp 767353f4fe; `stable-3_3_0` lib/pkp
  ac3fa73402.
- 3.4 and 3.3 (code): `Query::getHeadNote()` takes the oldest note by
  date; there is no flag.
- Not driven: an assistant role (a copyeditor, a layout editor) as the
  recipient (read in the code). On OMP, a save by the recipient: the
  panel offers none, and the `EditTask` rule that would let it through
  is unchanged (read in the code).
- Upstream, searched 2026-10-06: `pkp/pkp-lib#12716` is a different
  fault (a template task's notification failing).
