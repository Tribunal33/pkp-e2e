# Whoever opens a discussion or replies gets their own message back by email and as a Tasks row

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS (a press and a preprint server only once `pkp/pkp-lib#13072` is fixed)
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12323` for `pkp/pkp-lib#12322` · [139bde1e65](https://github.com/pkp/pkp-lib/commit/139bde1e6574f8a55e8c27c4e250d41e7b6bfa1f) · committed 2026-02-10, merged 2026-02-11 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Opening a discussion or task emails the writer a copy of what they just
wrote, sent from themselves. It also adds a row "{writer} started a
discussion: {name}: {message}" to their own Tasks list. A reply does the
same to the person replying, and their row is worded like the opening's.
The writer expects only the other participants to be told, as they were
before tasks and discussions were reworked (`pkp/pkp-lib#12322`).

Every message still reaches the people it is for. But each message a
person writes adds one email to their inbox and one row to their Tasks
list, which they have to clear by hand.

Journal users meet it today. Press and preprint server users do not yet:
there, saving a discussion or reply fails before anyone is told
(`pkp/pkp-lib#13072`). Once that is fixed, they will meet it too.

## Impact

- **Lost**: nothing. The writer gets an email of their own message, and
  a Tasks row that the number on the "Tasks" button counts.
- **Who**: everyone who opens a discussion or task or replies in one,
  every time they do it.
- **Way round**: none that keeps the useful part. Each row can be
  cleared in the Tasks window ("Mark Read", "Delete"). "Do not send me
  an email for these types of notifications." stops the copies, but it
  also stops the emails about everyone else's messages.

Low: every message reaches its readers, and only the writer's inbox and
Tasks list fill with their own messages. The number on the "Tasks"
button then also counts an editor's own messages. If the team finds that
this misleads editors about what is waiting for them, it is medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Nothing else
  is needed on a journal.
- Journal: submission 3, "The Facets Of Job Satisfaction: A Nine-Nation
  Comparative Study Of Construct Equivalence" (Copyediting). `dbarnes`
  (Journal editor) writes and `mfritz` (Maria Fritz, Copyeditor)
  replies. [Press: submission 7, "Accessible Elements: Teaching Science
  Online and at a Distance" (Copyediting), with the same two users.
  Preprint server: submission 1, "The influence of lactation on the
  quantity and quality of cashmere production" (Production), with
  `dbarnes` (Preprint Server manager) and `dbuskins` (David Buskins,
  Moderator) in place of `mfritz`.]
- A press or a preprint server cannot show this as shipped: step 3's
  "Save" fails first with `Class "APP\notification\Notification" not
  found` (`pkp/pkp-lib#13072`). To walk it there, add the class the app
  lacks, an empty subclass, as `classes/notification/Notification.php`
  in the app:

  ```php
  <?php
  namespace APP\notification;

  class Notification extends \PKP\notification\Notification
  {
  }
  ```

- Each user's email address is `<username>@mailinator.com`. Read the
  mail in the install's outgoing mailbox.

Opening:

1. Sign in as `dbarnes`. Open submission 3 and its "Copyediting" stage
   [preprint server: "Production"].
2. Under "Copyediting Tasks & Discussions" [preprint server: "Production
   Tasks & Discussions"], press "Add". "Daniel Barnes (dbarnes) (Me)" is
   already ticked.
3. Type "Reference check u37r7" in "Name", tick "Maria Fritz (mfritz)
   Copyeditor", type "Please check the references." as the message, and
   press "Save".
4. Press "Tasks" in the header.
5. Read the mail sent to `dbarnes@mailinator.com`.

Replying:

6. Sign out. Sign in as `mfritz`, open submission 3 and its
   "Copyediting" stage [preprint server: `dbuskins`, "Production"].
7. Press "Reference check u37r7" in the panel, then "Add New Message".
   Type "References checked." and press "Save".
8. Press "Tasks" in the header.
9. Read the mail sent to `mfritz@mailinator.com`.

**Expected**: the writer is not told of their own message. After step 3,
`dbarnes` has no Tasks row and no email for "Reference check u37r7".
After step 7, `mfritz` still has only what the opening sent her: one
email and one Tasks row.

**Observed**: after step 3, `dbarnes`'s Tasks window lists:

```
Daniel Barnes started a discussion: Reference check u37r7: Please check the references.
The Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence
```

and his mailbox holds:

```
From:    Daniel Barnes <dbarnes@mailinator.com>
To:      dbarnes@mailinator.com
Subject: Reference check u37r7
Please check the references. — Reply to this comment at #3 Kwantes or unsubscribe from emails sent by Journal of Public Knowledge …
```

After step 7, `mfritz`'s Tasks window holds two identical rows "Daniel
Barnes started a discussion: Reference check u37r7: Please check the
references.": the opening's, and one for her own reply. Her mailbox
holds the opening and her own reply:

```
From:    Maria Fritz <mfritz@mailinator.com>
To:      mfritz@mailinator.com
Subject: Reference check u37r7
References checked. — Reply to this comment at #3 Kwantes or unsubscribe …
```

The same on the press and the preprint server. The others are told as
expected: `mfritz` (`dbuskins`) gets the opening, and `dbarnes` gets the
reply. On 3.5, the same steps in the stage's "Discussions" list ("Add
discussion", then the discussion's "Add Message") tell only the others.

## Cause

`EditorialTaskController::notifyParticipants()`
(`lib/pkp/api/v1/submissions/tasks/EditorialTaskController.php`)
creates a `NOTIFICATION_TYPE_NEW_QUERY` Tasks notification for every
user id it is given. It also sends each of them the `TemplateVariables`
mail, with the current user as its sender. It never leaves out the
current user.

Two of its callers always hand it the writer, and the third hands it
whoever made the change:

- `addTask()` takes the item's participants and, at lines 229–232,
  appends the current user when they are not among them. So the opener
  is told even when they untick "(Me)".
- `addNote()` passes every participant. The method refuses a writer who
  is not a participant (403), so the writer is always in the list.
- `editTask()` passes the participants the edit added. An editor who
  ticks themselves in "Edit" is told of the discussion they just joined
  (code).

Until January 2026 the discussions ran on the older grid handlers, which
left the writer out. `QueriesGridHandler::updateQuery()` had "Don't
notify the current user", and `QueryNotesGridHandler::insertedNoteNotify()`
had "No need to additionally notify the posting user". Commit
1b200a5549 (`pkp/pkp-lib#12242`, 2026-01-27) deleted those handlers.
The task endpoints that replaced them sent no notices at all.

Commit 139bde1e65 (`pkp/pkp-lib#12322`, two weeks later) added notices
to those endpoints. It added them without leaving the writer out, and it
added the writer to the list in `addTask()`.

Reach:

- Opening a discussion or task, and a reply: walked on the three apps.
- An edit in which the editor ticks themselves: code.
- The Activity Log: `notifyParticipants()` logs each email it sends
  (`logMailable()`), so the writer's copy is one more "An email has been
  sent" line (code).
- Not this fault: `Repository::addQuery()` (`classes/editorialTask`)
  mails every participant it is given, its `$fromUser` included. On
  the discussion that is opened from the Author's "Comments for the
  Editor" at submission, the submitting Author is both the writer and a
  participant. That path is older. 3.5's `Repo::query()->addQuery()`
  does the same (code). Left out below.

## Proposed fix

Leave the current user out in `notifyParticipants()` itself, the one
place that turns a list of ids into notices, as the old grid handlers
did. Every caller then follows the rule. Then drop the lines in
`addTask()` that add the current user to the list
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/writer-told-of-own-message/fix.diff)):

```diff
@@ addTask()
-        $newParticipants = $editorialTask->participants->pluck('userId')->toArray();
-        if (!in_array($currentUser->getId(), $newParticipants)) {
-            $newParticipants[] = $currentUser->getId();
-        }
-
-        $this->notifyParticipants($newParticipants, $editorialTask);
+        $this->notifyParticipants($editorialTask->participants->pluck('userId')->toArray(), $editorialTask);
@@ notifyParticipants()
+        // Don't notify the user who wrote the message or made the change
+        $participantIds = array_diff($participantIds, [$currentUser->getId()]);
         $users = Repo::user()->getCollector()->filterByUserIds($participantIds)->getMany();
```

The lines in `addTask()` look deliberate, perhaps meant as a receipt
for the opener. Nothing in the code, in `pkp/pkp-lib#12322` or in its
PR says so. The team should confirm the issue's intent before removing
them. If a receipt is wanted, it should go to the opener alone, not
through the reply path too.

The fix was tried on the three apps. With it in, the writer's mailbox
and Tasks window stay empty after the opening and after the reply, and
the others still get both. As a control, an "Edit" that ticks a third
person emails that person alone, with the fix in and out.

**Alternatives**

- Leave the writer out in each caller (`addTask()`, `addNote()`,
  `editTask()`). That is three places, and a fourth caller would need it
  again.
- Compare with the note's writer instead of the current user. During
  Login As both are the impersonated user, so it gains nothing.

**What goes with it**

- Callers, API and hooks: the REST responses do not change, and no hook
  is involved.
- Data: no repair. Rows already raised are cleared by their owner in
  the Tasks window.
- Backport: none; 3.5 and older leave the writer out already.
- Left out: `Repository::addQuery()` (Cause, last bullet).
- Guard: an e2e scenario in U37 (Planned): after an opening and a
  reply, the writer's mailbox and Tasks window stay empty and the others
  get both. Or a pkp-lib feature test of `addTask()` and `addNote()`
  with `Mail::fake()`.

Small: a few lines in one pkp-lib method, plus a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/writer-told-of-own-message/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/writer-told-of-own-message/lib.js))
  takes the Steps on each app, reads the four mailboxes and the two Tasks
  windows, and ends with the "Edit" control. On an install freshly
  loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/writer-told-of-own-message/walk.js`.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL.
  The fault does not depend on the database. Dataset: pkp/datasets
  c657990 (2026-10-01). No server error and no page script error.
- OMP and OPS were walked with the empty subclass from the Steps in
  place.
- Not driven: an edit in which the editor ticks themselves; a task (the
  walk opened a discussion, and `addTask()` takes the same path for
  both); the Activity Log lines; the "Comments for the Editor"
  discussion.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5). `EditorialTaskController.php`
  is the same in the three. `stable-3_5_0`: OJS c346ee00a5 (lib/pkp
  3bb4450bea), OMP c7b45f88ea and OPS 8eaf899468 (lib/pkp 1fb843f491),
  lib/ui-library d4e01883. pkp-lib `stable-3_4_0` 32b0f4b4af,
  `stable-3_3_0` f6ab331645.
- Code reads beyond the Cause: 3.4 has the same two grid handlers as
  3.5. On 3.3, `QueryForm::execute()` ("Skip sending a message to the
  current user") and `QueryNoteForm::execute()` ("No need to
  additionally notify the posting user") do the job.
- The trace: `git blame` on lines 229–234 and on `notifyParticipants()`
  gives 139bde1e65. Its parent's `EditorialTaskController.php` creates
  no notification. 1b200a5549 removed the two grid handlers.
- Upstream searches (2026-10-02), pkp/pkp-lib, pkp/ojs and
  pkp/ui-library: notifyParticipants; discussion email own message;
  discussion notification current user; task notification sender
  receives; EditorialTaskController notification; discussion copy
  myself. Related but not this fault: `pkp/pkp-lib#13072` (the missing
  class on a press and a preprint server, open); `pkp/pkp-lib#12700`
  (what the task emails say, open).
