# A press's Internal Review offers no predefined message in "Assign" and "Notify"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12842` and `pkp/omp#2423` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4), [914b392b10](https://github.com/pkp/omp/commit/914b392b106862c2a3ed7d3af6a6a4bc25f26d7a) · pkp-lib's merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (open). The empty list is not reported there. A review linked from that issue on 2026-09-28 names the missing Internal Review template, but only as the reason a typed message fails on that stage. PR `pkp/pkp-lib#13385` does not add the template
- **Tracked in** spec U35 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a press's Internal Review the list "Choose a predefined message to
use, or fill out the form below." of "Assign Participant" and "Notify"
holds only its blank entry. On 3.5 it offers "Discussion (Review)" and
"Assign Editor" there, as External Review still does.

Every press has this stage, and every other stage of a press offers at
least a "Discussion (…)" message. "OK" on "Assign" with "Message" left
empty still assigns the person.

A second fault makes this one worse today: a message typed with no
predefined message chosen is not sent on any stage
([U35-A3-OMP1-typed-participant-message-not-sent.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U35-A3-OMP1-typed-participant-message-not-sent.md)).
With both faults, the Internal Review stage's Participants panel sends
nothing.

## Impact

- **Lost**: the "Assign Editor" letter and the "Discussion (Review)"
  entry on Internal Review. Nothing is stored wrong.
- **Who**: a press's editors and assistants, each time they assign or
  notify someone while a submission is in Internal Review.
- **Way round**: "Add" in the stage's discussions panel, which emails
  the people chosen as participants and gives them a Tasks row. The
  editor writes the letter's text by hand.

Low: what this fault takes away is a ready-made text. That the stage's
panel sends nothing today is the typed-message fault's doing and is
rated in that report.

Order of the two fixes: if PR `pkp/pkp-lib#13385` merges and this fault
stays, the Internal Review panel still sends nothing, because the PR
sends a typed message under the stage's "Discussion (…)" template and
this stage has none (read in the PR's diff, not walked). The fix here
is medium rather than small because presses upgraded from 3.5 need a
migration that copies their review-stage messages to Internal Review.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`.

1. Sign in as `dbarnes`.
2. Open submission 9, "Enabling Openness: The future of the information
   society in Latin America and the Caribbean", from the dashboard. It
   opens on "Internal Review".
3. In "Participants", on David Buskins's row: "More Actions" › "Notify".
4. Open the list "Choose a predefined message to use, or fill out the
   form below.".
5. Reload the page, press "Assign" in "Participants", and open the same
   list.

**Expected.** Both lists offer "Discussion (Review)" and "Assign
Editor" after the blank entry, as on 3.5 and as on External Review.

**Observed.** Both lists hold the blank entry only.

Control: on submission 2, "The West and Beyond: New Perspectives on an
Imagined Region" (External Review), "Notify" on Alvin Finkel's row and
"Assign" both list "Discussion (Review)" and "Assign Editor".

## Cause

`PKPStageParticipantNotifyForm::fetch()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`)
fills the list with the press's discussion templates of the window's
stage:

```php
$collector = Template::withContextId($context->getId())
    ->withStageId($this->_stageId)
    ->withType(EditorialTaskType::DISCUSSION->value);
```

A template belongs to one stage (`edit_task_templates.stage_id`), and
OMP's `registry/taskTemplates.xml` installs templates for Submission,
External Review, Copyediting and Production. It has no row with
`stageId="WORKFLOW_STAGE_ID_INTERNAL_REVIEW"`, so a press has nothing
to list there.

Before `pkp/pkp-lib#12842` the list came from the stage's discussion
email template and its alternates, and
`StageMailable::getStageMailable()` gave both review stages the same
one (`DiscussionReview`, with "Assign Editor" as its alternate). Now
that each template row belongs to a single stage, External Review got
the rows and Internal Review got none.

Reach:

- A press upgraded from 3.5 is in the same place:
  `I12593_EmailToTaskTemplates::emailKeyToStageMap()` moves
  `DISCUSSION_NOTIFICATION_REVIEW` and its alternates to External
  Review only, so messages a press reworded for its review stages are
  not offered on Internal Review after the upgrade (code; the upgrade
  was not run).
- Settings › Workflow › "Tasks and Discussions" lists templates per
  stage of the app (`taskTemplateManagerStore.js`, `appStages`), so a
  press's "Internal Review" group starts empty (code).

## Proposed fix

Give Internal Review its own two rows in OMP's
`registry/taskTemplates.xml`, and name the new "Assign Editor" key in
`PKPStageParticipantNotifyForm::getEmailVariableNames()` (pkp-lib) so
its letter gets the recipient's name:
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/fix-omp.diff).

```xml
<template title="mailable.discussionReview.name" description="emails.discussion.body" key="DISCUSSION_NOTIFICATION_INTERNAL_REVIEW" stageId="WORKFLOW_STAGE_ID_INTERNAL_REVIEW"/>
<template title="mailable.editorAssignedManual.name" description="emails.editorAssignReview.body" key="EDITOR_ASSIGN_INTERNAL_REVIEW" stageId="WORKFLOW_STAGE_ID_INTERNAL_REVIEW"/>
```

The keys are new because `edit_task_templates` allows a key once per
press (`unique(['key', 'context_id'])`), so External Review's rows
cannot serve a second stage. This follows how the registry already
gives each stage its own "Assign Editor" row
(`EDITOR_ASSIGN_SUBMISSION`, `…_REVIEW`, `…_PRODUCTION`).

Tried on OMP `main`. A registry change reaches only a press created
after it, so the trial called
`Repo::editorialTask()->installTaskTemplates()` again for the
dataset's press, as a press's creation does (Evidence). That method
adds the keys a press lacks and only merges translations into the ones
it has, so it is safe to run again. The steps then show the Expected: both windows list
"Discussion (Review)" and "Assign Editor" on Internal Review; "Notify"
with "Discussion (Review)" and a typed message closes with
"Notification sent to users.", the discussion is listed and David
Buskins receives it; "Assign Editor" fills "Message" with "Dear NAME,
The following submission has been assigned to you to see through the
review stage. …". External Review's lists are unchanged (the control).

**Alternatives**

- Have `fetch()` list External Review's templates on Internal Review:
  one line and no data, but Settings shows Internal Review as a stage
  of its own, so the window and Settings would disagree.
- Let one template serve several stages: a schema change.

**What goes with it**

- Presses that already exist do not get the rows from the registry.
  The upgrade from 3.5 needs a second step, not tried because it
  migrates stored data. A proposal for it:
  - Where: an OMP migration listed after
    `PKP\migration\upgrade\v3_6_0\I12593_EmailToTaskTemplates` in
    OMP's `dbscripts/xml/upgrade.xml`. The pkp-lib migration runs for
    all three apps and maps one key to one stage, so the copy does not
    belong in it; OMP already keeps its own 3.6 migrations under
    `classes/migration/upgrade/v3_6_0/`.
  - What: for each press, copy every row the pkp-lib migration put on
    External Review to Internal Review, with its settings rows.
  - Keys: `I12593_EmailToTaskTemplates` writes
    `'key' => $customTemplate->email_key` on every row it moves, and
    the table allows a key once per press. So the copy of
    `DISCUSSION_NOTIFICATION_REVIEW` takes
    `DISCUSSION_NOTIFICATION_INTERNAL_REVIEW`, the copy of
    `EDITOR_ASSIGN_REVIEW` takes `EDITOR_ASSIGN_INTERNAL_REVIEW`, and
    the copy of a press's own alternate takes a null key, as a template
    added in Settings has. Whether a null key or a suffixed one is
    wanted there is the team's call.
  - Installs already on `main`: the migration has run there, so editing
    it changes nothing. `main` is unreleased; either such installs are
    left to call `installTaskTemplates()` once, which adds the two
    default rows, or the OMP migration above is written to run on them
    too. Left to the team.
- The open PR `pkp/pkp-lib#13385` sends a typed message under the
  stage's installed "Discussion (…)" template, found by the keys of
  `Repository::getDiscussionTemplateKeys()`. With that PR the new
  `DISCUSSION_NOTIFICATION_INTERNAL_REVIEW` key belongs in that list
  (read in the PR's diff, not tried).
- A test: the list on a press's Internal Review, read as a set. The e2e
  scenario is a Planned item of spec U35.

Medium: adding the template for new presses is two lines, but presses
upgraded from 3.5 need a migration that copies their review-stage
messages, and the change spans OMP and pkp-lib.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js).
  Run:
  `PROBE_FEATURE=issues-r1 PROBE_AGENT=r1 node bin/probe.js omp shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35 PROBE_FEATURE=issues-r1-3_5`
  in front for 3.5.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/internal-review-no-predefined-message/fix-omp.diff omp`,
  then from the OMP root, under the install's config,
  `php shared/playwright/checks/issues/internal-review-no-predefined-message/replay-install.php`
  ([replay-install.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/replay-install.php)),
  which calls `Repo::editorialTask()->installTaskTemplates()` for the
  press as `PKPContextController::add()` does when a press is created;
  then the script with `SEND=1` in front, then `revert`.
- Walked on OMP `main` and `stable-3_5_0`, PKP's default dataset
  (pkp/datasets c657990, 2026-10-01), PostgreSQL, as `dbarnes`.
- Tips, `main`: OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5). `stable-3_5_0`: OMP c7b45f88e (lib/pkp 1fb843f491).
  `stable-3_4_0`: lib/pkp df13621c2d. `stable-3_3_0`: OMP 8e72fc883,
  lib/pkp d446601ebe.
- 3.5, walked: Internal Review and External Review both list
  "Discussion (Review)" and "Assign Editor" in both windows.
- 3.4 and 3.3, code: `stable-3_4_0`'s `StageMailable` map gives Internal
  Review `DiscussionReview`, as 3.5's. On `stable-3_3_0`
  `PKPStageParticipantNotifyForm::fetch()` offers
  `NOTIFICATION_CENTER_DEFAULT` on every stage.
- Introduced: `git blame` on the `withStageId()` lines of `fetch()`
  names b3b882bec9; OMP's `registry/taskTemplates.xml` came with
  914b392b10 and never had an Internal Review row. The commits are
  dated 2026-06-01 and 2026-08-04.
- Upstream: read `pkp/pkp-lib#12593` with its comments and the diff
  of PR `pkp/pkp-lib#13385` (open, head cf72cc78d8, 2026-10-01), which
  changes neither registry nor migration; pkp/pkp-lib and pkp/omp
  searched for the stage and template words, nothing else found.
- "OK" on "Assign" with "Message" empty on Internal Review: walked on
  submission 6 (the neighbouring script
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/typed-participant-message-not-sent/neighbour.js)):
  the person is assigned with "User added as a stage participant.".
- The way round's email and Tasks row are spec U37's finding, not
  walked here.
- Not driven: Settings › Workflow › "Tasks and Discussions" on a press;
  the upgrade from 3.5; whether the "Add" window of the Internal Review
  discussions panel offers templates.
