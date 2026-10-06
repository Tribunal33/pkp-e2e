# No "Assign a copyeditor" notice on Copyediting after skipped review, a press's Internal Review or a return from Production

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: none (code; skipped review and Internal Review recorded the same "Accept" decision)
- **Introduced** `pkp/pkp-lib#7631` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp10) · spec U32 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U32-copyediting-stage.md#a6)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An assigned editor opens Copyediting and finds no "Assign a copyeditor
using the Assign link in the Participants list." notice when the
submission got there in one of three ways:

- "Accept and Skip Review" on the Submission stage;
- "Accept Submission" on a press's Internal Review;
- "Move To Copyediting" on Production.

The notice shows only after "Accept Submission" on a journal's review
round or a press's External Review. Up to 3.3 it showed after skipped
review and after a press's Internal Review too.

Nothing else on the stage is affected, and "Assign" works without the
notice.

## Impact

- **Lost**: the notice that tells the editor the next step on
  Copyediting. The Participants panel on the same page still lists
  who is assigned.
- **Who**: every assigned editor on a submission that arrived in one of
  the three ways. Acceptance from a journal's review round is not
  affected; a press that accepts from Internal Review meets it on each
  such monograph.
- **Way round**: none is needed.

Low: no data, file or message is lost and the editor's task gets done.
It would be medium if the stage or "Assign" depended on the notice.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` and OMP `main` (context
  `publicknowledge`). Nothing else is needed.

Each group is taken once per submission it names.

Accept and Skip Review (OJS submission 4, "Computer Skill Requirements
for New and Existing Teachers: Implications for Policy and Practice";
OMP submission 8, "Editorial"):

1. Sign in as `dbarnes`, who is assigned to the submission, and open it
   from the dashboard. The workflow opens on "Submission".
2. Press "Accept and Skip Review".
3. Press "Continue" on each page that offers it, then "Record
   Decision".
4. Open the submission again. The workflow opens on "Copyediting".
5. On OJS, sign in as `dbuskins`, a Section Editor assigned to
   submission 4, and open it.

Accept Submission on Internal Review (OMP submission 6, "The
Information Literacy User's Guide"):

6. As `dbarnes`, open submission 6. The workflow opens on "Internal
   Review (Round 1)".
7. Press "Accept Submission", "Continue" on "Notify Authors", then
   "Record Decision" on "Select Files".
8. Open the submission again. The workflow opens on "Copyediting".
9. Sign in as `dbuskins`, a Series Editor assigned to the submission,
   and open it.

Move To Copyediting (OJS submission 5, "Genetic transformation of
forest trees"; OMP submission 4, "How Canadians Communicate: Contexts
of Canadian Popular Culture"; neither has a copyedited file or a
Copyediting discussion):

10. As `dbarnes`, open the submission. The workflow opens on
    "Production".
11. Press "Move To Copyediting" [3.5: "Back To Copyediting"],
    "Continue" on each page that offers it, then "Record Decision".
12. Open the submission again. The workflow opens on "Copyediting".

**Expected**: in steps 4, 5, 8, 9 and 12, above "Draft Files", a framed
box headed "Notification" that reads "Assign a copyeditor using the
Assign link in the Participants list.".

**Observed**: no box in any of them, on either app, when the page opens
or after a reload. The page starts with "Draft Files".

Control: `dbarnes` reads the box on the dataset's submissions that were
accepted from a review round, OJS submission 3 "The Facets Of Job
Satisfaction: A Nine-Nation Comparative Study Of Construct Equivalence"
and OMP submission 7 "Accessible Elements: Teaching Science Online and
at a Distance". `mfritz` is a Copyeditor in their Participants list,
but the notice changes to "Awaiting Copyedits." only once a Copyediting
discussion exists, and neither has one.

## Cause

The notice is a stored notification, one per assigned editor, and the
page only shows what is stored. After each decision,
`PKP\decision\Repository::updateNotifications()` calls
`getSubmissionNotificationTypes()`
(`lib/pkp/classes/decision/Repository.php`, line 493) to learn which
notice types to re-evaluate. That list names two decisions, "Accept
Submission" and "Send to Production":

```php
switch ($decision->getData('decision')) {
    case Decision::ACCEPT:
        return [
            Notification::NOTIFICATION_TYPE_ASSIGN_COPYEDITOR,
            Notification::NOTIFICATION_TYPE_AWAITING_COPYEDITS
        ];
    case Decision::SEND_TO_PRODUCTION:
        …
}
return [];
```

Of the two, only `Decision::ACCEPT` brings a submission to Copyediting.
Three more decision types do, and none is in the list:
`Decision::SKIP_EXTERNAL_REVIEW` ("Accept and Skip Review"),
`Decision::ACCEPT_INTERNAL` (OMP's `AcceptFromInternal`) and
`Decision::BACK_FROM_PRODUCTION`. They get the empty list, so
`PKPEditingProductionStatusNotificationManager::updateNotification()`
is not called and no notice is stored.

Up to and including 3.3 the same list sat in `PKPEditorDecisionHandler`, keyed on
`SUBMISSION_EDITOR_DECISION_ACCEPT`, and that one constant was the
decision behind "Accept and Skip Review" and behind a press's internal
"Accept Submission" as well. The decisions refactor
(`pkp/pkp-lib#7265`) gave each of them a decision type of its own, and
added the decisions that move a submission back, but carried the list
over with the same two entries, Accept and Send to Production.

Reach:

- "Accept and Skip Review" and "Move To Copyediting" on a journal and a
  press, "Accept Submission" on a press's Internal Review (on screen).
- "Send to Production" removes the editors' copyediting notice (the
  delegate's Production branch), so a submission that comes back has
  none even if it had one before (code).
- The later updates are not affected: assigning a copyeditor with the
  "Request Copyedit" message, a new Copyediting discussion and a
  copyedited file each update the notice themselves, so "Awaiting
  Copyedits." still comes on these submissions (code).
- `Decision::BACK_FROM_COPYEDITING`, which moves a submission out of
  Copyediting, is not in the list either. The stored notice then stays
  until the next decision that updates it. This is a leftover notice,
  not a missing one, and the fix below does not address it (code).

## Proposed fix

Name every decision that brings a submission to Copyediting in the
list, beside `Decision::ACCEPT`. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyediting-no-assign-copyeditor-notice/fix.diff)):

```diff
--- a/lib/pkp/classes/decision/Repository.php
+++ b/lib/pkp/classes/decision/Repository.php
@@ -493,7 +493,11 @@
     protected function getSubmissionNotificationTypes(Decision $decision): array
     {
         switch ($decision->getData('decision')) {
+            // Every decision that brings a submission to the copyediting stage
             case Decision::ACCEPT:
+            case Decision::ACCEPT_INTERNAL:
+            case Decision::SKIP_EXTERNAL_REVIEW:
+            case Decision::BACK_FROM_PRODUCTION:
                 return [
                     Notification::NOTIFICATION_TYPE_ASSIGN_COPYEDITOR,
                     Notification::NOTIFICATION_TYPE_AWAITING_COPYEDITS
```

Tried on `main`, OJS and OMP: every step above then shows the box, once,
to each assigned editor. A submission accepted from review still shows
one box to its editors and none to its author, and "Send to External
Review" on a press's Internal Review stores no copyediting notice, with
the fix in and out.

What the fix touches:

- Listing a notice type does not create the notice.
  `PKPEditingProductionStatusNotificationManager::updateNotification()`
  still decides from the submission's state whether to create or remove
  it, so a submission that comes
  back from Production with a copyedited file gets no notice, and one
  with a Copyediting discussion gets "Awaiting Copyedits." (code).
- `Decision::ACCEPT_INTERNAL` is defined in pkp-lib's `Decision`, so
  the line is valid on OJS, which never records it.
- No API, hook or other caller changes: the method is `protected` and
  has one caller.
- The Production notices (`NOTIFICATION_TYPE_ASSIGN_PRODUCTIONUSER`,
  `NOTIFICATION_TYPE_AWAITING_REPRESENTATIONS`) stored while
  the submission was on Production stay stored after "Move To
  Copyediting", with the fix as without it: the delegate's Copyediting
  branch does not remove them, so listing them for
  `BACK_FROM_PRODUCTION` would change nothing. Only a journal's
  Production page asks for them (`WorkflowNotificationDisplay`); a
  press's asks for other types (code).

**Alternatives**

- Decide from the decision type's new stage
  (`$decisionType->getNewStageId()` is `WORKFLOW_STAGE_ID_EDITING`)
  instead of a list of constants: it covers a future decision type
  without an edit. The cost is one more argument on a protected method
  with one caller, which already holds `$decisionType` and
  `$submission`; it departs from the list the method has kept since
  3.3.
- Build the notice when the Copyediting page is opened, as the `FIXME`
  in `StageParticipantGridHandler::deleteParticipant()` suggests
  ("perhaps we can just insert the notification on page load"): it
  would also cover an editor assigned after the decision, but it is a
  new pattern.

**What goes with it**

- No data repair. A submission already on Copyediting when the fix
  lands gets the notice at the next event that updates it (a
  participant removed, a discussion added), not before.
- Backport: `patch --dry-run` of the diff succeeds on `stable-3_5_0`
  and `stable-3_4_0`; both define the three constants.
- Guard: an e2e check in the Copyediting scenario that reads the notice
  after "Accept and Skip Review", and on a press after an internal
  "Accept Submission" (a Planned item in the spec).

Small: three `case` lines in the shared repository, in the list's own
pattern, and one test step.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/copyediting-no-assign-copyeditor-notice/walk.js).
  It takes the Steps and reads the control on OJS and OMP; with
  `MODE=nb` in front it runs only the fix trial's checks of what must
  stay as it is. Run on a
  dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/copyediting-no-assign-copyeditor-notice/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5).
- The walk opens each workflow by its address
  (`dashboard/editorial?workflowSubmissionId=<id>`), not from the
  dashboard's list.
- Walked on `main`: OJS b84f8e2e44 (lib/pkp ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, ui-library 280f98c5).
  Walked on `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (both
  lib/pkp cf3f984335, ui-library d4e01883); the same Observed and
  control, the Production button named "Back To Copyediting". Dataset:
  pkp/datasets e8dafbc (2026-10-02), PostgreSQL. No request failed and
  no page script failed in any walk.
- Stored records after the walk on `main`: no
  `NOTIFICATION_TYPE_ASSIGN_COPYEDITOR` (`0x1000023`) row on OJS
  submissions 4 and 5 or OMP submissions 8, 6 and 4; one per assigned
  editor on the controls. With the fix, one per assigned editor on
  each, the editor whose participation is limited to recommendations
  (`minoue` on OMP submission 6) included, as on the controls.
- The fix trial's checks of what must stay as it is, each run with the
  fix in and out (`Repository.php` is identical in OJS and OMP): OJS submission 10, "Accept Submission" from review, one box for
  `dbarnes`, none for the author `jnovak`; OMP submission 9, "Send to
  External Review" on Internal Review, then "Accept Submission" on
  External Review, one box for the assigned `dbuskins`, none for the
  author `fperini`, and one stored notice.
- Code reads. 3.5: `getSubmissionNotificationTypes()` is as on `main`.
  3.4 (pkp-lib `stable-3_4_0` 32b0f4b4af, OJS 75cc2d488b, OMP
  0aec65441f): the same two keys in the list; `Decision` defines
  `SKIP_EXTERNAL_REVIEW`, `ACCEPT_INTERNAL` and `BACK_FROM_PRODUCTION`,
  and `PKPWorkflowTabHandler` shows the stored notice on the editing
  tab. 3.3 (pkp-lib `stable-3_3_0` f6ab331645, OJS ac77c9fb35, OMP
  8e72fc8836): `PKPEditorDecisionHandler` updates the notice for
  `SUBMISSION_EDITOR_DECISION_ACCEPT`, which
  `PKPEditorDecisionActionsManager::_submissionStageDecisions()` offers
  as "Accept and Skip Review" and OMP's
  `_internalReviewStageDecisions()` as "Accept Submission"; there is no
  decision that moves a submission back.
- Introduced: `git blame` on the list names f75706ba57, merged with
  `pkp/pkp-lib#7631`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library;
  issues and PRs, open and closed): by "Assign a copyeditor", "Awaiting
  Copyedits", "copyeditor notification skip review", and the method and
  constant names of the Cause. The nearest, `pkp/pkp-lib#10701` (open),
  is about the notice not changing after a copyeditor is assigned, and
  `pkp/pkp-lib#1702` is the request that added the notice.
- Not driven on screen (code only): "Awaiting Copyedits." on these
  submissions, the decision that moves a submission out of Copyediting,
  a return from Production with a copyedited file or a discussion, and
  3.4 and 3.3. An editor assigned through "Assign" after the decision
  was not walked.
- Unverified: whether a journal's Production page can be opened, and
  shows the leftover Production notice, while the
  submission is back on Copyediting.
