# A press's Internal Review offers no "Assign Editor" message in "Assign Participant" and "Notify"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: OMP (code; Internal Review never offered "Assign Editor" there)
- **Introduced** `pkp/pkp-lib#12842` and `pkp/omp#2423` for `pkp/pkp-lib#12593` · [b3b882bec9](https://github.com/pkp/pkp-lib/commit/b3b882bec95e2d328799f0a3d36724042ff246c4), [914b392b10](https://github.com/pkp/omp/commit/914b392b106862c2a3ed7d3af6a6a4bc25f26d7a) · the pkp-lib PR merged 2026-08-21 · Vitaliy Bezsheiko (Vitaliy-1)
- **Upstream** `pkp/pkp-lib#12593` (closed 2026-10-05), covering "Discussion (Review)" only
- **Tracked in** spec U35 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U35-stage-participants.md#omp1)
- **Checked** 2026-10-06, each branch's tip (the commits in Evidence)

Update 2026-10-06: `pkp/omp#2487` (merged 2026-10-05) added "Discussion
(Review)" to a press's Internal Review, so this report now covers only
the missing "Assign Editor".

## Summary

On a press's Internal Review, the predefined-message list in the
"Assign Participant" and "Notify" windows offers only "Discussion
(Review)". "Assign Editor", the ready-made letter to a newly assigned
editor, is missing.

On External Review the same list still offers "Assign Editor". On 3.5
the Internal Review list offered it too.

## Impact

- **Lost**: the ready-made "Assign Editor" letter on Internal Review.
  If a press edited its "Assign Editor" text in 3.5, the upgrade keeps
  that text on External Review only (code).
- **Who**: a press's editors and assistants, when they assign an editor
  to a submission in Internal Review.
- **Way round**: choose "Discussion (Review)", or leave the list blank,
  and write the letter by hand. The message is sent either way.

Low: the editor loses a ready-made text, but nothing fails and nothing
is stored wrong.

## Steps to reproduce

Preconditions:

- The default dataset, OMP `main`.
- A dataset built before `pkp/omp#2487` (merged 2026-10-05 14:59 UTC;
  `pkp/datasets` b23aab9 is one) lists nothing at all on Internal
  Review. To bring its press to the state a press created on today's
  `main` has, run `Repo::editorialTask()->installTaskTemplates($press)`
  once. This is the call `PKPContextController::add()` makes when a
  press is created. On the unedited dataset it only adds the missing
  row. On a press whose templates were edited it overwrites them (see
  "What goes with it").

1. Sign in as `dbarnes`.
2. Open "Active submissions" in the dashboard and open submission 9,
   "Enabling Openness: The future of the information society in Latin
   America and the Caribbean". It opens on "Internal Review".
3. In "Participants", on David Buskins's row: "More Actions" › "Notify".
4. Open the list labelled "Choose a predefined message to use, or fill
   out the form below.".
5. Reload the page, press "Assign" in "Participants", and in the
   "Assign Participant" window open the same list.

**Expected.** Both lists offer "Discussion (Review)" and "Assign
Editor" after the blank entry, as on 3.5 and as on External Review.

**Observed.** Both lists offer "Discussion (Review)" alone after the
blank entry.

Control: on submission 2, "The West and Beyond: New Perspectives on an
Imagined Region" (External Review), "Notify" on Alvin Finkel's row and
"Assign Participant" both list "Discussion (Review)" and "Assign
Editor".

## Cause

`PKPStageParticipantNotifyForm::fetch()`
(`lib/pkp/controllers/grid/users/stageParticipant/form/PKPStageParticipantNotifyForm.php`)
fills the list with the press's discussion templates for the window's
stage:

```php
$collector = Template::withContextId($context->getId())
    ->withStageId($this->_stageId)
    ->withType(EditorialTaskType::DISCUSSION->value);
```

A template belongs to one stage (`edit_task_templates.stage_id`). In
OMP's `registry/taskTemplates.xml`, Internal Review has only
`DISCUSSION_NOTIFICATION_INTERNAL_REVIEW`. "Assign Editor" has one row
for each other stage: `EDITOR_ASSIGN_SUBMISSION`,
`EDITOR_ASSIGN_REVIEW` (External Review) and
`EDITOR_ASSIGN_PRODUCTION`.

Before `pkp/pkp-lib#12842`, the list was the stage's discussion email
template plus that template's alternates.
`StageMailable::getStageMailable()` gave both review stages
`DiscussionReview`, so its alternate, `EDITOR_ASSIGN_REVIEW`, was
offered on both review stages.

Reach:

- Presses upgraded from 3.5 lack the row too (code).
  `I12593_EmailToTaskTemplates` gives each migrated template the stage
  that `emailKeyToStageMap()` names for it, or for the template it is
  an alternate of (`alternate_to`). The map sends
  `DISCUSSION_NOTIFICATION_REVIEW` to External Review and names no
  Internal Review key, so `EDITOR_ASSIGN_REVIEW`, with any wording the
  press gave it, lands on External Review only. OMP's
  `I12593_DiscussionInternalReviewTemplate` then installs only the
  discussion row on Internal Review.
- Settings › Workflow › "Tasks and Discussions" lists templates by
  stage, so a press's "Internal Review" group holds only "Discussion
  (Review)" (code; not driven).

## Proposed fix

Give Internal Review its own "Assign Editor" in the same places that
`pkp/omp#2487` used for "Discussion (Review)":
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/fix-omp.diff).

- `registry/taskTemplates.xml` (OMP), for presses created from now on:

  ```xml
  <template title="mailable.editorAssignedManual.name" description="emails.editorAssignReview.body" key="EDITOR_ASSIGN_INTERNAL_REVIEW" stageId="WORKFLOW_STAGE_ID_INTERNAL_REVIEW"/>
  ```

- `I12593_DiscussionInternalReviewTemplate` (OMP), for presses upgraded
  from 3.5: install both Internal Review rows. The migration loops over
  a key → [title, description] map instead of one key, and `down()`
  removes both keys.
- `PKPStageParticipantNotifyForm::getEmailVariableNames()` (pkp-lib):
  add `EDITOR_ASSIGN_INTERNAL_REVIEW` to the `EDITOR_ASSIGN_*` cases.
  This method has two callers that need the new key:
  - `StageParticipantGridHandler::fetchTemplateBody()` passes the names
    to the "Message" editor, which shows `{$recipientName}` as its
    "NAME" tag.
  - `sendMessage()` compiles the discussion's first message with them,
    so that message gets the recipient's name.

  Without the case, both show a raw `{$recipientName}` (code).

The key is new because `edit_task_templates` allows each key only once
per press (`unique(['key', 'context_id'])`).

Tried on OMP `main`:

- A new press: with the fix applied, `installTaskTemplates()` was run
  for the dataset's press, as creating a press does. Both windows on
  Internal Review then listed "Discussion (Review)" and "Assign
  Editor".
- The letter: "Assign Editor" filled "Message" with "Dear NAME, The
  following submission has been assigned to you to see through the
  review stage. …". Once sent, David Buskins received "Dear David
  Buskins, …", and the discussion "Assign Editor" read the same.
- An upgraded press: the 3.5 dataset, upgraded by `main` with the fix
  applied, listed both entries on Internal Review.
- The neighbours: the External Review and Submission lists were the
  same with the fix in and out, each entry listed once.

**Alternatives**

- Have `fetch()` list External Review's templates on Internal Review.
  But Settings shows Internal Review as a stage of its own, so the
  window and Settings would disagree.
- Have the migration copy a press's own `EDITOR_ASSIGN_REVIEW` wording
  to Internal Review instead of the default text. This keeps a 3.5
  press's edits, but the migration's discussion row uses the default
  text, so the fix does the same. Left to the team.

**What goes with it**

- Installs already on `main`: their migration has run and will not run
  again, so they lack `EDITOR_ASSIGN_INTERNAL_REVIEW`. Those created
  before `pkp/omp#2487`, the default dataset among them, also lack
  `DISCUSSION_NOTIFICATION_INTERNAL_REVIEW`. Insert the missing keys
  alone, as the migration does.
- `installTaskTemplates()` is not a safe shortcut on a press that has
  been used. For every key the press already has, it overwrites the
  title and description in every site locale with the defaults and
  sets the stage again (`Repository.php`, the `if ($template)` branch).
  It also brings back default templates the press deleted.
- No "Assign Editor" key gives the editor-assignment task today:
  `sendMessage()`'s `switch` matches only `EDITOR_ASSIGN`. The fix
  proposed for that, spec U35 A6
  ([pkp-e2e#351](https://github.com/jardakotesovec/pkp-e2e/issues/351)),
  names the `EDITOR_ASSIGN_*` keys there and is not filed with pkp. If
  it lands, `EDITOR_ASSIGN_INTERNAL_REVIEW` belongs with those keys.
- A test: on a press's Internal Review, the list holds "Discussion
  (Review)" and "Assign Editor". Compare the entries as a set, because
  the list has no fixed order.

Medium: the fix spans two repos, OMP and pkp-lib.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js).
  Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/internal-review-no-predefined-message/walk.js`.
  Put `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5.
  `SEND=1` adds the letter check, and `NEIGHBOUR=1` alone reads the
  External Review and Submission lists.
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/internal-review-no-predefined-message/fix-omp.diff omp`.
  For a new press, run
  [replay-install.php](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-no-predefined-message/replay-install.php)
  (`installTaskTemplates()` for the press) from the OMP root, then the
  script with `SEND=1`. For an upgraded press, load the
  `stable-3_5_0` dataset into `main`. Revert afterwards.
- Walked on OMP `main` and `stable-3_5_0`, PKP's default dataset,
  PostgreSQL, as `dbarnes`. On the `main` dataset as loaded, both lists
  held only the blank entry. The Observed is the walk after
  `replay-install.php` without the fix.
- `replay-install.php` on the dataset added
  `DISCUSSION_NOTIFICATION_INTERNAL_REVIEW`. It changed none of the 48
  title and description rows of the dataset's 12 templates (compared
  with the dump), and their stages stayed the same.
- Tips, `main`: OMP 592914b83 (lib/pkp e39fdee199, lib/ui-library
  280f98c5). `stable-3_5_0`: OMP 9c5e24246 (lib/pkp cf3f984335).
  `stable-3_4_0`: OMP 0aec65441, lib/pkp 767353f4fe. `stable-3_3_0`:
  OMP 8e72fc883, lib/pkp ac3fa73402.
- 3.5, walked: Internal Review and External Review both list
  "Discussion (Review)" and "Assign Editor" in both windows.
- 3.4, code: the same `StageMailable` map, and `fetch()` lists the
  stage template's alternates. OMP's `registry/emailTemplates.xml`
  makes `EDITOR_ASSIGN_REVIEW` an alternate of
  `DISCUSSION_NOTIFICATION_REVIEW`.
- 3.3, code: OMP's `StageParticipantNotifyForm::_getStageTemplates()`
  gives `EDITOR_ASSIGN` to Submission, External Review and Production,
  but not to Internal Review. `PKPStageParticipantNotifyForm::fetch()`
  adds `NOTIFICATION_CENTER_DEFAULT` and the press's own templates on
  every stage.
- Introduced: the `withStageId()` line of `fetch()` blames to
  b3b882bec9 (2026-06-01). OMP's `registry/taskTemplates.xml` came with
  914b392b10 (2026-08-04). Neither it nor its later changes, 1fefa52ae
  and 8f9499f14 (`pkp/omp#2487`), has an Internal Review "Assign
  Editor" row.
- Upstream: read `pkp/pkp-lib#12593` with its comments and
  `pkp/omp#2487`. Searched pkp/pkp-lib and pkp/omp for "Assign Editor"
  with internal review, for `EDITOR_ASSIGN_INTERNAL_REVIEW`, and for
  the stage's template words. Nothing else was found (2026-10-06).
- Not driven: Settings › Workflow › "Tasks and Discussions" on a press;
  the upgrade from 3.5 without the fix; the "Message" editor and the
  discussion without the new `case`.
