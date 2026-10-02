# Editing a discussion that "Notify" or "Assign" opened adds a copy of its message under the recipient's name

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
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An editor who uses "Edit" on a discussion opened by a message from the
Participants panel ("Notify", or the "Message" box of "Assign
Participant") does not change that message. The first "Save", even one
that only renames the discussion or adds a participant, adds a copy of
the message box's text as a second message, headed with the name of the
person the message was sent to. Later saves rewrite that copy, and the
original message stays as it was.

The copy cannot be removed afterwards, since a single message cannot be
deleted. The person the message was sent to is offered "Edit" too, and
their "Save" adds a message under their own name.

Every discussion such a message opens is affected, in every stage.

## Impact

- **Lost**: nothing. The edit is not applied in place: the discussion
  keeps the original message and gains a copy credited to someone who
  did not write it. A participant added in that "Edit" is emailed the
  box's text under the editor's name, as with any edit.
- **Who**: managers and editors with a manager-level role, who may edit
  any discussion, each time they rename such a discussion, add people to
  it or correct its message. Briefing an author, a copyeditor or a
  layout editor through "Notify" or "Assign" is ordinary use.
- **Way round**: to correct the text, post a new message instead of
  using "Edit". Renaming the discussion or adding people has none: any
  "Save" makes the copy.

Medium: every rename or added participant leaves a message credited to
the wrong person in the discussion's record, with no way to avoid or
remove it, but what reaches people is right: the email to an added
participant carries the editor's name and text. It would be high if the
copy reached anyone under the recipient's name.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else. [OMP: submission 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", with Bart Beaty (`bbeaty`). OPS: submission
  1, "The influence of lactation on the quantity and quality of cashmere
  production", with Carlo Corino (`ccorino`).]

An editor's edit:

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

The person it was sent to:

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
dbarnes's message alone.

**Observed:** step 7 shows two messages, and step 9 rewrites only the
second:

```text
Message from dbarnes 2026-10-02 02:10 AM    u37r4 first message
Message from ddiouf  2026-10-02 02:10 AM    u37r4 edited text
```

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
lines 227–235) creates the discussion's first message with
`Note::create()` and no `'isHeadnote' => true`. Since 3.6 a discussion's
first message is the note flagged `is_headnote`, not its oldest note, so
a discussion `sendMessage()` opens has none.

An edit finds the first message only by that flag.
`EditorialTask::saveHeadnote()` looks for the flagged note, finds none
and saves a new flagged note with the box's text. `fillHeadnote()` gives
that note the discussion's `createdBy` as its writer, and
`sendMessage()` stores the recipient there. Each later save updates the
new note. The edit form fills its message box from the oldest message
(`useDiscussionManagerForm.js`, `notes[0]`) and sends it with every
save, so a rename or a participant change saves it too.

In `EditorialTaskController::editTask()` the save comes first, so
`notifyParticipants()` (line 1031) then finds the new flagged note and
emails its text to each participant the edit added, sent as the current
user. Line 401 reads `$headnote->id` from the head note loaded before the
save, which is null here, hence the warning.

The missing flag also lifts the edit limit. The `description` rule in
`api/v1/submissions/tasks/formRequests/EditTask.php` holds anyone who is
not an editor to their own first message within its first hour, and
passes when there is no flagged message. That is why the recipient's
"Save" is accepted.

The omission came with b898737294, which added the `is_headnote`
column, made `saveHeadnote()` look for it, and edited both places that
wrote a discussion's first note (`sendMessage()` and
`Repository::addQuery()`) without setting it. Its upgrade migration
(`I11701_Notes`) flags the oldest note of every discussion, so
discussions carried over from 3.5 are fine. `pkp/pkp-lib#13409` later
added the flag to `addQuery()` only.

Reach:

- "Assign Participant" with a message, and "Notify" in the other stages:
  `AddParticipantForm` ends in the same `sendMessage()` (read in the
  code).
- A participant added in "Edit": checked on screen on OJS. The added
  Graham Cox received "u37r4 mailed" from "Daniel Barnes" with the box's
  text, and the discussion gained the copy.
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

Flag the first note where `sendMessage()` creates it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/fix.diff)):

```diff
                 array_intersect_key($mailable->getData(), $additionalVariables)
             ),
+            'isHeadnote' => true,
         ]);
```

It is the flag `fillHeadnote()` sets and the line added to
`addQuery()` for the same fault, so every place that opens a discussion
then flags its first message.

It was tried on the three apps. Steps 7 and 9 then showed one message,
"Message from dbarnes", reading "u37r4 first message" and then "u37r4
edited text". Step 12 was refused with "You can only edit your own
discussion message." (on a press and a preprint server the refusal
shows its raw key, a separate fault). The control kept one message with
and without the fix.

**Alternatives**

- Make every reader of the flag fall back to the oldest note when none
  is flagged (eight places on `main`, among them `saveHeadnote()`, the
  `EditTask` rule, `editTask()`, `notifyParticipants()` and
  `deleteNote()`): it would mend stored discussions too, but spreads a
  second rule across all of them and hides the next writer that forgets
  the flag.
- Open the discussion with `EditorialTask::create()` and its
  `description` attribute: `fillHeadnote()` would take the note's writer
  from `createdBy`, which `sendMessage()` sets to the recipient, and
  `compileDescription()` would fill in the email's template variables a
  second time over text `sendMessage()` already filled in.

**What goes with it**

- Discussions already opened this way on installs of `main` stay
  unflagged. No repair is proposed, because the code is unreleased; a
  one-off step that flags the oldest note of each discussion without a
  flagged one (the rule `I11701_Notes` uses) would mend them.
- `sendMessage()` storing the recipient as the discussion's creator is
  pkp-e2e's
  [U35 A5 report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A5-message-discussion-created-by-recipient.md),
  a separate one-line fix.
- Guard: an e2e scenario that edits a "Notify" discussion and reads one
  message, replaced in place.

Small: one line where the discussion is created, with no change to
stored data or the API.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js),
  with its helpers in `lib.js` beside it. On an install freshly loaded
  from the default dataset:
  `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/participant-message-edit-adds-message/walk.js`
  (without the first two variables for `main`).
- [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/neighbour.js)
  takes the Control, run with the fix and without it on the three apps;
  [email.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/participant-message-edit-adds-message/email.js)
  is the participant-added check, run on OJS `main` without the fix.
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets c657990, 2026-10-01), on PostgreSQL.
- 3.5, walked: after the same steps the discussion's window listed one
  message, "u37r4 first message" and then "u37r4 edited text" by
  dbarnes, and the Author's row offered no "Edit". There
  `Repo::note()->getHeadNote()` takes the oldest note, and
  `QueriesAccessHelper::getCanEdit()` lets an Author edit only a first
  message they wrote, within the hour.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d6736318), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c570). `stable-3_5_0`: OJS
  c346ee00a5 (lib/pkp 3bb4450bea), OMP c7b45f88ea and OPS 8eaf899468
  (lib/pkp 1fb843f491). `stable-3_4_0` lib/pkp 32b0f4b4af;
  `stable-3_3_0` lib/pkp f6ab331645.
- Code reads:
  - `main`: `PKPStageParticipantNotifyForm::sendMessage()` and
    `AddParticipantForm`; `EditorialTask::fillHeadnote()`,
    `saveHeadnote()` and `compileDescription()`;
    `editorialTask/Repository::addQuery()`; `EditTask`'s `description`
    rule; `EditorialTaskController::editTask()`, `deleteNote()` and
    `notifyParticipants()`; `NoteAccessPolicy`; `NewNoteForm`;
    `I11701_Notes`; ui-library's `useDiscussionManagerForm.js` and
    `DiscussionMessages.vue`.
  - 3.4 and 3.3: `Query::getHeadNote()` takes the oldest note by date;
    there is no flag.
- Not driven: an assistant role (a copyeditor, a layout editor) as the
  recipient (read in the code).
- Upstream searches (2026-10-02): pkp/pkp-lib by headnote, `is_headnote`,
  `PKPStageParticipantNotifyForm`, and discussion with edit, notify,
  duplicate and second message; pkp/ojs and pkp/ui-library by discussion
  with edit and headnote. `pkp/pkp-lib#12716` is a different fault (a
  template task's notification failing).
