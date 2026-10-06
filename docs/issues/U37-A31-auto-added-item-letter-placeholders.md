# A discussion's letter keeps "{$signature}" when its writer is not a participant: auto-added, or a manager stays out

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (on a preprint server, with a template a manager writes)
  - 3.5: none (no task templates)
  - 3.4: none (code; no task templates)
  - 3.3: none (code; no task templates)
- **Introduced** `pkp/pkp-lib#12630` for `pkp/pkp-lib#12592` · [cf2196a83c](https://github.com/pkp/pkp-lib/commit/cf2196a83cee49b4817be5ce9f8ddf71dcdff053) · 2026-05-13 · Vitaliy-1 (Vitaliy-1); the auto-added case's unset variables: no PR, [d1e56bae71](https://github.com/pkp/pkp-lib/commit/d1e56bae717d228a2a2fc5dac9f0543a84bc7e70) · 2026-05-16 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A31](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a31)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A discussion that "Auto-add at stage" creates shows the template's text
under "Message from system" with the submission's title and the
journal's name filled in, but the recipient and sender placeholders left
as they are: "Galleys Complete" reads "Dear {$recipientName}," and ends
"{$signature}" on a journal ("{$senderName}" on a press). When a manager
adds participants in "Edit", the greeting fills with their names, but
the closing never fills by itself, while the email those participants
get is signed with the manager's name.

The same happens to a discussion a manager adds from a template in the
"Add" window without ticking themself as a participant. Ticked, the
writer's name fills the closing on "Save".

## Impact

- **Lost**: nothing; the first message shows template code in its
  closing.
- **Who**: an editor or manager who uses a template whose text names the
  sender, as most of a journal's and a press's installed letters do
  ("Galleys Complete", "Request Copyedit", "Ready for Production"). An
  auto-added discussion is seen by managers until they add
  participants; then every participant reads it, an Author included when
  the manager adds them (walked). "Auto-add at stage" is off for every
  installed template, so this needs a manager to turn it on; then every
  submission reaching the stage gets such a discussion. Nothing is
  mailed when it is created.
- **Way round**: a manager can edit the template once in Settings ›
  Workflow › "Tasks and Discussions" and drop the sender placeholder, or
  rewrite the closing of a single discussion in "Edit" (the app saves a
  manager's or editor's change to any first message). A manager adding a
  discussion can stay ticked as a participant.

Low: a wording fault; it would rise if Authors or reviewers were made
participants without a manager's choice.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP, OPS).
- Preprint server only: none of the server's installed templates names
  the recipient or the sender ("Discussion (Production)" reads "Please
  enter your message.", "Assign Editor" is empty), so steps 1–2 there
  create one. The server assigns its section's moderators, David Buskins
  and Stephanie Berardo, to every new preprint.

Journal and press:

1. Sign in as `dbarnes`.
2. Settings › Workflow › "Tasks and Discussions". Under "Production
   Stage", tick "Auto-add at stage" on the "Galleys Complete" row and
   answer "Yes" in "Confirm Automatic Addition".
3. Open the submission waiting in Copyediting: on the journal, 3 "The
   Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
   Construct Equivalence"; on the press, 1 "The ABCs of Human Survival:
   A Paradigm for Global Citizenship".
4. Press "Send To Production", press "Continue" through the steps,
   press "Record Decision", then "View Submission Summary".
5. In "Production Tasks & Discussions", press "Galleys Complete".
6. Close the window. On the "Galleys Complete" row, "More Actions" ›
   "Edit": tick "David Buskins" and "Stephanie Berardo" (press: "David
   Buskins" and "Arthur Clark"), and press "Save".
7. Press "Galleys Complete" again.
8. Press "Add", then "DISCUSSION - Galleys Complete". Name it "Galleys
   Complete u37r15 (no writer)", untick "Daniel Barnes", tick the two
   people of step 6, press "Save", then press the new discussion.

Preprint server:

1. Sign in as `dbarnes`. Settings › Workflow › "Tasks and Discussions",
   "Production Stage" › "Add template": "Name" "Galleys Complete
   u37r15", "Discussion" `Dear {$recipientName}, galleys are ready for
   {$submissionTitle} at {$contextName}. Kind regards, {$signature}`,
   "Save".
2. Tick "Auto-add at stage" on its row and answer "Yes".
3. Sign in as `ccorino`, start "New Submission" and submit a preprint
   titled "u37r15 auto-add" with a PDF.
4. Sign in as `dbarnes`, open "u37r15 auto-add" and, in "Production
   Tasks & Discussions", press "Galleys Complete u37r15".
5. Close the window. "More Actions" › "Edit" on its row: tick "David
   Buskins" and "Carlo Corino", press "Save", then press the discussion
   again.

**Expected.** No placeholder is left as typed in a first message:
the closing is filled in steps 5, 7 and 8 (server steps 4–5), and the
greeting is filled once the discussion has participants.

**Observed.** Step 5, under "Message from system 2026-10-02 02:59 AM":

```
Dear {$recipientName}, Galleys have now been prepared for the following
submission and are ready for final review. The Facets Of Job
Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence
Journal of Public Knowledge If you have any questions, please contact
me. Kind regards, {$signature}
```

The press's ends "Kind regards, {$senderName}"; the server's (step 4)
reads "Dear {$recipientName}, galleys are ready for u37r15 auto-add at
Public Knowledge Preprint Server. Kind regards, {$signature}". After step
7 the journal's reads "Dear David Buskins, Stephanie Berardo, …" and
still ends "Kind regards, {$signature}" (the press's "Dear David
Buskins, Arthur Clark, …" and "{$senderName}"; the server's "Dear David
Buskins, Carlo Corino, …"). The email each added participant receives,
subject "Galleys Complete", ends "Kind regards, Daniel Barnes". Step 8,
under "Message from dbarnes": "Dear David Buskins, Stephanie Berardo, …
Kind regards, {$signature}" (press: "{$senderName}").

Control: step 8 with "Daniel Barnes" left ticked and "David Buskins"
alone: "Dear David Buskins, …" and "Kind regards, Daniel Barnes".

## Cause

`PKP\editorialTask\EditorialTask::compileDescription()` fills a first
message's placeholders through `TemplateVariables` when the discussion
is saved. It looks for the sender only among the participants (the one
whose id is the message's `userId`), and takes the other participants as
recipients. A writer who is not a participant gives no sender, so the
sender variables stay unset (lines 484–492, which d1e56bae71 added to
stop the `TypeError` `sender(null)` threw).

Two paths save a first message whose writer is not a participant:

- `Repository::autoCreateFromTemplates()` makes the discussion with
  `Template::promote($submission, false)`: no participants and no writer
  (`createdBy` and the message's `userId` null), by design
  (`pkp/pkp-lib#11993`: the system creates it and a manager assigns
  participants).
- `EditTask::rules()` (lines 209–213, inherited by `AddTask`) lets a
  manager-level user add a discussion without taking part.

The recipient placeholder of an auto-added discussion resolves later:
`saveHeadnote()` compiles the message again on every save that carries
it, and the "Edit" save that adds participants carries it. The sender
placeholders never do. `EditorialTaskController::notifyParticipants()`
then mails the stored text with the editing user as sender, and the
mail's own compile fills `{$signature}` with that user's name, so the
email and the discussion differ.

Reach:

- Every template whose text holds a sender variable: on OJS and OMP the
  installed "Galleys Complete", "Request Copyedit", "Ready for
  Production", the Review and Production "Assign Editor" letters, and
  OMP's "Index Requested" and "Index Completed" (code; the Submission
  stage's "Assign Editor" signs with `{$contextSignature}`); and a
  manager's own template (walked on the preprint server).
- No other path leaves the writer out: `addCommentsForEditorsQuery()`
  and `IsRecommendation` pass a user who is a participant, and "Notify"
  on the Participants panel compiles its own message with its writer as
  sender (`PKPStageParticipantNotifyForm`, code).
- Discussions saved before a fix keep the placeholders in the stored
  message; the feature is not released, so no upgrade repair is needed.

## Proposed fix

In `compileDescription()`, take the writer as sender even when they are
not a participant, and sign for the context only when the message has
no writer, the way `SenderEmailVariable` signs for a user without a
signature (their name):
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/auto-added-item-letter-placeholders/fix.diff).

```php
        // A manager may write a message without taking part: they still sign it
        if (!$sender && $headnote->userId) {
            $sender = Repo::user()->get((int) $headnote->userId);
        }
        // … sender(), recipients(), setData() as now …

        // A message without a writer is signed by the context, in the
        // mailable's locale, as a user without a signature signs with a name
        if (!$sender) {
            $contextName = $mailable->viewData[ContextEmailVariable::CONTEXT_NAME] ?? '';
            $mailable->addData([
                SenderEmailVariable::SENDER_NAME => $contextName,
                SenderEmailVariable::SENDER_EMAIL => $mailable->viewData[ContextEmailVariable::CONTACT_EMAIL] ?? '',
                SenderEmailVariable::SENDER_CONTACT_SIGNATURE => '<p>' . $contextName . '</p>',
            ]);
        }
```

`compileDescription()` compiles every first message, at creation and on
each edit, so both paths and any later caller are covered. The context's
name is read from the variables `setData()` filled, so it is in the
mailable's locale like the rest of the letter. Tried on all three apps:
the auto-added letter closes with the journal's, press's or server's
name; the greeting fills once participants are added; the email they
get signs the same way; step 8 closes with "Daniel Barnes"; and a
message written by a ticked participant is unchanged.

**Alternatives**:

- Use the context's `emailSignature` (`{$contextSignature}`): it is
  written as an email footer (on the dataset a rule and "This is an
  automated message from Journal of Public Knowledge."), not a name to
  close a letter with, and the discussion's email already ends with a
  footer of its own.
- Sign an auto-added discussion with the manager who adds the
  participants: it reads "Message from system", and the closing would
  show code until someone is added.
- Auto-add with participants (`promote($submission, true)`): against
  `pkp/pkp-lib#11993`'s design, and the message still has no writer.
- Fill the recipient placeholder at creation with an empty name: "Dear
  ," before anyone is added, and the later fill is lost. How the
  greeting reads before anyone is added stays a product call.

**What goes with it**: a unit test in pkp-lib (a discussion saved with
no `createdBy`, and one whose writer is not a participant, store a
filled closing) and an e2e check.

Small: a few lines in one method, following `SenderEmailVariable`.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/auto-added-item-letter-placeholders/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/auto-added-item-letter-placeholders/lib.js))
  takes the Steps on each app; its `control` and `nowriter` steps are
  the neighbour checks of the fix, walked with it in and out. On an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/auto-added-item-letter-placeholders/walk.js`.
- Walked on OJS, OMP and OPS `main` and `stable-3_5_0`, on PostgreSQL;
  the fault does not depend on the database. Dataset: pkp/datasets
  c657990 (2026-10-01). No server error and no page script error. The
  emails were read in the install's outgoing mail. The script's step 8
  runs on OJS submission 5 and OPS submission 1 (at Production already);
  the press's on submission 1, as written.
- Not walked: the template edit and the single-discussion rewrite under
  Way round (read in the template window's fields and `EditTask::rules()`,
  which lets managers and sub-editors change any first message); a task
  template (`promote()` and `compileDescription()` treat both alike); a
  reviewer as participant (`EditTask::rules()` allows the stage's
  reviewers, code).
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5), `EditorialTask.php` the same in
  the three; `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88e, OPS
  8eaf899468; pkp-lib `stable-3_4_0` 32b0f4b4af and `stable-3_3_0`
  f6ab331645 (no `classes/editorialTask`).
- The auto-add itself is c79c233d2d (`pkp/pkp-lib#12186` for
  `pkp/pkp-lib#11993`); the manager exemption in `EditTask::rules()` is
  631ffce52c (2026-03-14), before cf2196a83c.
