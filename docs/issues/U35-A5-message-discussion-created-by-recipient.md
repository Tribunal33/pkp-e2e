# A message sent from "Notify" or "Assign" opens a discussion listed as created by its recipient

- **Severity** low
- **Effort** small
- **Kind** regression
- **Security** unreleased
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11587` for `pkp/pkp-lib#10406` · [134f6f077b](https://github.com/pkp/pkp-lib/commit/134f6f077b893e139675ed3fedc2cb4645df4c3a) · committed 2025-04-01, merged 2025-08-05 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U35 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#a5), spec U32 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U32-copyediting-stage.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A message sent from "Assign" or "Notify" opens a discussion, and the
person it was sent to is recorded as its creator: the stage's
discussions panel lists it as "Created by: {the person it was sent
to}". The discussion's first entry and the recipient's task name the
sender.

The message, the email and the task arrive as written. To see who
started a discussion, a reader has to open it. The fix is small: one
line, where the discussion is created, takes the sender instead of the
recipient.

Every predefined message sent from the Participants panel is affected,
in every stage. A preprint server has two of them, "Discussion
(Production)" and "Assign Editor"; "Request Copyedit" exists on a
journal and a press only. A discussion added with the panel's "Add"
names the person who added it.

## Impact

- **Lost**: nothing. A list of discussions misleads about who started
  each one.
- **Who**: everyone who reads a stage's discussions panel after an
  editor used "Notify", or "Assign" with a predefined message such as
  "Request Copyedit". That is the ordinary way to brief a copyeditor or
  a layout editor.
- **Way round**: open the discussion; its first entry reads "Message
  from {sender}".

Low: a wrong name on a list while the message and its outcome are
right. It would be medium if a reader had no screen that names the
sender.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded. Nothing
  else. [OMP: submission 4, "How Canadians Communicate: Contexts of
  Canadian Popular Culture", with Bart Beaty for "Notify", and
  submission 7, "Accessible Elements: Teaching Science Online and at a
  Distance", for "Assign", with the same role "Copyeditor" and the same
  person, Sarah Vogt. OPS: submission 1, "The influence of
  lactation on the quantity and quality of cashmere production", with
  Carlo Corino for "Notify"; a preprint server has no Copyediting
  stage, so the "Assign" steps do not apply.]

Notify:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open submission 5, "Genetic transformation of forest trees", and its
   "Production" stage.
3. Under "Participants", open "More Actions" on Diaga Diouf's row and
   press "Notify".
4. In "Choose a predefined message to use, or fill out the form below."
   choose "Discussion (Production)".
5. Replace the text the predefined message put into "Message" with
   "u35r8 hello" (select all of it and type over it) and press
   "Notify".
6. Open the page again and read the "Discussion (Production)" row of
   "Production Tasks & Discussions".
7. Press the row's name and read the first entry.

Assign:

8. Open submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence", and its "Copyediting"
   stage.
9. Under "Participants" press "Assign", choose the role "Copyeditor",
   press "Search" and choose Sarah Vogt.
10. Choose "Request Copyedit" in the predefined-message list and press
    "OK".
11. Open the page again and read the "Request Copyedit" row of
    "Copyediting Tasks & Discussions".
12. Sign in as `svogt` (password `svogtsvogt`) and open "Tasks" in the
    header.

**Expected:** the rows of steps 6 and 11 read "Created by: dbarnes",
the person who wrote and sent the message.

**Observed:** step 6 reads "Discussion Discussion (Production) Created
by: ddiouf" and step 11 "Discussion Request Copyedit Created by:
svogt". In step 7 the first entry reads "Message from dbarnes", and in
step 12 the Tasks window lists "Daniel Barnes started a discussion:
Request Copyedit: Dear Sarah Vogt, …".

Control: a discussion `dbarnes` adds with the panel's "Add" is listed
as "Created by: dbarnes".

## Cause

`PKPStageParticipantNotifyForm::sendMessage()` (`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`,
line 204) creates the discussion with `'createdBy' => $user->getId()`.
In that method `$user` is `Repo::user()->get($userId)`, the person the
message goes to; the sender is `$request->getUser()`. The same method
uses the sender for the head note's `userId` and for the email's
`sender()`, which is why the first entry and the task name the right
person.

`TaskResource::toArray()` turns `createdBy` into `createdByName` and
`createdByUsername`, and the panel's name cell
(`DiscussionManagerCellName.vue`) prints `createdByUsername` after
"Created by:".

The line came with 134f6f077b, which replaced `Query::create()` with
`EditorialTask::create()` and gave the new model its `createdBy`,
`type` and `status`. Until then a discussion had no creator of its own,
and the list's "From" column printed the head note's author, the
sender. The same commit's upgrade migration (`I10406_EditorialTasks`)
fills `created_by` from the head note's `user_id`, so a discussion
carried over from 3.5 names its sender.

Reach:

- "Notify" in Production on the three apps, and "Assign" with "Request
  Copyedit" in Copyediting on OJS and OMP: checked on screen.
- "Assign" and "Notify" in the other stages, and "Assign" with any
  other predefined message: `AddParticipantForm` extends this form, and
  its `execute()` ends in `parent::execute()`, which calls
  `sendMessage()` only when "Message" is not empty (read in the code).
- The REST API's task and discussion answers carry the same
  `createdBy`, `createdByName` and `createdByUsername` (read in the
  code).
- The other places that create an `EditorialTask` set the acting user:
  `Repository::addQuery()` (`$fromUser`), `AddTask` and
  `EditorialTaskController` (the signed-in user); tasks created
  automatically from templates leave it null on purpose (read in the
  code).

## Proposed fix

Store the sender as the creator
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/fix.diff)):

```diff
-            'createdBy' => $user->getId(),
+            'createdBy' => $request->getUser()->getId(),
```

This is what the method already does for the head note and the email,
what `Repository::addQuery()` does with `$fromUser`, and what the
upgrade migration assumes. The change is in the one method that both
"Notify" and "Assign" reach.

It was tried on the three apps: the steps then read "Created by:
dbarnes" in steps 6 and 11, with the first entry, the email and the
recipient's task as before. A discussion added with "Add" read "Created
by: dbarnes" with and without the fix.

**Alternatives**

- Print the head note's author in the panel instead of `createdBy`: it
  would hide the wrong value on one screen and leave it in the stored
  record and the REST API.

**What goes with it**

- Discussions already stored this way on installs of `main` keep the
  recipient as creator. No repair is proposed, because the code is
  unreleased.
- `sendMessage()` also writes no "created" entry to the discussion's
  activity, so its row lacks the "Discussion created by … on …" line
  that a discussion added with "Add" shows. That is a separate omission
  and is not part of this fix.
- Guard: an e2e scenario that sends a "Notify" message and reads the
  row's "Created by" line (a Planned item in specs U35 and U32).

Small: one line in one method, following the lines beside it.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js),
  with its helpers in `lib.js` beside it; the neighbour check (a
  discussion added with "Add") is
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/message-discussion-created-by-recipient/neighbour.js).
  On an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/message-discussion-created-by-recipient/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5.
- The script adds a run tag to the typed message ("u35r8 hello <tag>")
  so that the mailbox read finds only its own email, and sends the
  "Request Copyedit" letter as the list fills it.
- The fix was tried with `walk.js` and `neighbour.js` on OJS, OMP and
  OPS `main`; `neighbour.js` was also run without it.
- Walked on `main` and on `stable-3_5_0`, each app on PKP's default
  dataset (pkp/datasets c657990, 2026-10-01), on PostgreSQL. The fault
  is a wrong user id and does not depend on the database.
- 3.5, walked: the stage's "Production Discussions" and "Copyediting
  Discussions" lists have a "From" column and no "Created by" line;
  after the same steps it read "dbarnes" on each row. There the
  discussion is named after the email's subject ("A message regarding
  Journal of Public Knowledge"), so the script reads every row of the
  list.
- Tips: OJS `main` 4408b94def (lib/pkp f5bd392a69, lib/ui-library
  64d6736318), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c570). `stable-3_5_0`: OJS
  4fca1027f4, OMP c7b45f88ea, OPS 8eaf899468 (lib/pkp 1fb843f491).
  `stable-3_4_0` lib/pkp df13621c2d; `stable-3_3_0` lib/pkp d446601ebe.
- Code reads:
  - `main`: `PKPStageParticipantNotifyForm::execute()` and
    `sendMessage()`; `AddParticipantForm`; `TaskResource` and
    `NoteResource`; `EditorialTask`, `editorialTask/Repository::addQuery()`
    and the template-created tasks; `AddTask`, `EditTask` and
    `EditorialTaskController`; `I10406_EditorialTasks`; ui-library's
    `DiscussionManagerCellName.vue` and `DiscussionMessages.vue`. Blame
    on line 204 leads to 134f6f077b, part of `pkp/pkp-lib#11587`
    (merged 2025-08-05).
  - 3.5: `sendMessage()` calls `Query::create()` with no creator, and
    `QueriesGridCellProvider` prints the head note's user under "From".
  - 3.4 and 3.3: `sendMessage()` inserts the query through `QueryDAO`
    with no creator and sets the head note's user to the signed-in
    user; `QueriesGridCellProvider` prints that user under "From".
- Not driven: "Assign" on OPS, "Assign Editor" as the message on OPS, "Assign" and "Notify" in the Submission
  and Review stages, and the REST API's answers (read in the code).
- Upstream searches (2026-10-01): pkp/pkp-lib by "created by" with
  discussion, notify, assign and participant, by `createdBy` with
  `PKPStageParticipantNotifyForm` and `sendMessage`; pkp/ojs and
  pkp/ui-library by "created by" and discussion. `pkp/pkp-lib#7150`
  (open, "Discussions sometimes being attributed to the wrong user") is
  a different fault on 3.2 and 3.3: a discussion left behind by an
  abandoned form is taken over by a later one.
