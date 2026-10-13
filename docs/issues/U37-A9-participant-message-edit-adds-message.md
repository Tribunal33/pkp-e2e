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
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A user who uses "Edit" on a discussion opened by a message from the
Participants panel ("Notify", or the "Message" box of "Assign
Participant") does not change that message. The first "Save", even one
that only renames the discussion or adds a participant, adds the
window's message text as a second message. Later saves rewrite that
copy, and the original message stays as it was. The copy is headed with
the name of the person who sent the message, whoever saved the edit.

Nobody can remove the copy. Every discussion such a message opens is
affected, in every stage, on OJS, OMP and OPS.

## Impact

- **Lost**: nothing is deleted, but the discussion's record is wrong.
  Every participant sees the message twice, and a correction shows
  beside the original instead of replacing it. When someone other than
  the sender saves the edit (another manager), the copy is still
  credited to the sender, who did not write it. A "Save" that changes
  only the name or the text emails no one; a participant added in that
  "Edit" is emailed the text under the name of the person who saved.
- **Who**: users in a Manager-level role (Journal Manager, Journal
  Editor) and the site administrator, who may edit any discussion, and
  the person who sent the message. Any rename, added participant or
  correction of such a discussion meets it.
- **Way round**: to correct the text, post a new message instead of
  using "Edit". Renaming the discussion or adding people has none.

Medium: correcting or renaming a discussion leaves a misleading record
that every participant sees and nobody can remove, though nothing is
emailed and a correction can be posted as a new message instead. A copy
emailed to the discussion's participants would raise it to high.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else. [OMP: submission 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", with Bart Beaty (`bbeaty`). OPS: submission
  1, "The influence of lactation on the quantity and quality of cashmere
  production", with Carlo Corino (`ccorino`).]

`dbarnes` is the Journal Editor:

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

[3.5, where the fault does not show: the panel is the stage's
"Production Discussions" list, which names the discussion "A message
regarding Journal of Public Knowledge"; "Edit" is in the row's settings
and changes "Subject" where `main` has "Name".]

**Expected:** step 7 shows one message, "Message from dbarnes" with
"u37r4 first message", and step 9 the same message reading "u37r4
edited text".

**Observed:** step 7 shows "u37r4 first message" twice, both headed
"Message from dbarnes", and step 9 rewrites only the second:

```text
Message from dbarnes 2026-10-13 12:04 PM    u37r4 first message
Message from dbarnes 2026-10-13 12:04 PM    u37r4 edited text
```

The first "Save" of an edit on such a discussion logs
`PHP Warning: Attempt to read property "id" on null in
…/api/v1/submissions/tasks/EditorialTaskController.php on line 401`;
the request answers 200.

Control: a discussion `dbarnes` adds with the panel's "Add" keeps one
message through the same rename and text edit, its text replaced in
place.

## Cause

`PKPStageParticipantNotifyForm::sendMessage()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
lines 252–260) creates the discussion's first message with
`Note::create()` and no `'isHeadnote' => true`. Since 3.6 a discussion's
first message is the note flagged `is_headnote`, not its oldest note, so
a discussion `sendMessage()` opens has none.

An edit finds the first message only by that flag.
`EditorialTask::saveHeadnote()` looks for the flagged note, finds none
and saves a new flagged note with the `description` the edit sent. Each
later save updates the new note. `fillHeadnote()` gives that note the
discussion's `createdBy` as its writer, which `sendMessage()` sets to
the sender.

The edit form fills its message field from the oldest message
(`useDiscussionManagerForm.js`, `notes[0]`) and sends it with every
save, so a rename or a participant change saves it too.

In `EditorialTaskController::editTask()` the save comes first, so
`notifyParticipants()` (line 1031) then finds the new flagged note and
emails its text to each participant the edit added, sent as the current
user. Line 401 reads `$headnote->id` from the head note loaded before the
save, which is null here, hence the warning.

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

It was tried on the three apps on 2026-10-06. Steps 7 and 9 then showed
one message, "Message from dbarnes", reading "u37r4 first message" and
then "u37r4 edited text". The control kept one message with and without
the fix. On 2026-10-13 the diff still applies to the three apps' `main`
unchanged.

**Alternatives**

- Make every reader of the flag fall back to the oldest note when none
  is flagged (eight places on `main`, among them `saveHeadnote()`, the
  `EditTask` rule, `editTask()`, `notifyParticipants()` and
  `deleteNote()`): it would mend stored discussions too, but spreads a
  second rule across all of them and hides the next writer that forgets
  the flag.
- Open the discussion with `EditorialTask::create()` and its
  `description` attribute: `compileDescription()` would fill in the
  email's template variables a second time over text `sendMessage()`
  already filled in.

**What goes with it**

- Discussions already opened this way on installs of `main` stay
  unflagged. No repair is proposed, because the code is unreleased. A
  one-off step would flag, for each discussion (`assoc_type`
  `ASSOC_TYPE_QUERY`) that has no flagged note, its oldest note, one per
  discussion (the lowest `note_id` on a tied date). `I11701_Notes`'s own
  query is not that step: it covers every note's assoc, and a tie flags
  several.
- Guard: an e2e scenario that edits a "Notify" discussion and reads one
  message, replaced in place.

Small: one line and the guard; no release holds discussions to repair.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js),
  with its helpers in `lib.js` beside it. On an install freshly loaded
  from the default dataset:
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js`
  (without the first two variables for `main`). After the Steps it
  notifies Diaga Diouf again and signs in as them: on 2026-10-13 their
  row offered no "Edit" on any of the three apps, and the discussion
  held dbarnes's message alone.
- [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/neighbour.js)
  takes the Control;
  [email.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/email.js)
  is the participant-added check, run on OJS `main` on 2026-10-06
  without the fix.
- Walked on `main` on 2026-10-13, each app on PKP's default dataset, on
  PostgreSQL: OJS `main` 7c6fba2064, OMP `main` eb9381314, OPS `main`
  1bc3f78888, each with lib/pkp f4c2578c94 (pkp-lib `main`'s tip that
  day).
- Narrowed on 2026-10-13. Until then OJS's and OPS's `lib/pkp` lacked
  [1c3367a163](https://github.com/pkp/pkp-lib/commit/1c3367a1634a585bae56aca5aa15faac11e24c90)
  (`pkp/pkp-lib#12593`, which came in with PR `pkp/pkp-lib#13385`), so
  `sendMessage()` set the discussion's `createdBy` to the recipient
  there: the copy carried the recipient's name, and the recipient was
  offered "Edit" and could add a copy of their own. With 1c3367a163 in
  all three apps the `createdBy` is the sender, so that part no longer
  shows (reported as [pkp-e2e#343](https://github.com/jardakotesovec/pkp-e2e/issues/343)).
  The line-401 warning is from the 2026-10-06 walks; the line is
  unchanged.
- 3.5, walked 2026-10-06 (`stable-3_5_0` OJS 4342473090 with lib/pkp
  771474347e, OMP 9c5e24246c and OPS 38b61882d3 with lib/pkp
  cf3f984335): after the same steps the discussion's window listed one
  message, "u37r4 first message" and then "u37r4 edited text" by
  dbarnes. There `Repo::note()->getHeadNote()` takes the oldest note.
- 3.4 and 3.3 (code; `stable-3_4_0` lib/pkp 767353f4fe, `stable-3_3_0`
  lib/pkp ac3fa73402): `Query::getHeadNote()` takes the oldest note by
  date; there is no flag.
- Not driven: an edit saved by a manager other than the sender (the
  copy's writer is the `createdBy`, read in the code).
- Upstream, searched 2026-10-13: no pkp-lib issue or PR covers the
  Participants path; `pkp/pkp-lib#12716` is a different fault (a
  template task's notification failing).
