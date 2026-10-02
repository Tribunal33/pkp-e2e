# After "Request Revisions" on Internal Review, a press author gets no task in the Tasks panel

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; the author gets the task)
- **Introduced** `pkp/pkp-lib#7631` with `pkp/omp#1071` for `pkp/pkp-lib#7265` · [f75706ba57](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa) · 2022-01-18 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U71 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U71-internal-review-stage.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

After a press editor records "Request Revisions" on Internal Review,
the author's Tasks panel in the page header gains nothing: it reads "No
Items", and the "Tasks" button shows no count. After the same decision
on External Review the panel lists "Revisions to consider in External
Review." with the monograph's title.

The request is recorded and the author can still answer it: the
monograph's row on My Submissions reads "Revision requested" with a
"Submit revisions" button.

## Impact

- **Lost**: the author's to-do entry for the requested revisions.
- **Who**: every author of a monograph whose Internal Review round ends
  in "Request Revisions", on any press; no setting is involved.
- **Way round**: My Submissions shows the request, and the author is
  also told by email ("Your submission has been reviewed and we
  encourage you to submit revisions").

Low: the author is told on My Submissions and by email and can submit
the revision; only the Tasks panel's entry is missing.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`).
  Nothing else is needed.

Steps:

1. Sign in as `dbarnes`. He is not assigned to submission 17, so it is
   not on "Assigned to me", the view that opens: choose "Active
   submissions" and open submission 17, "Open Development: Networked
   Innovations in International Development" (or go to
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   The workflow opens on "Internal Review (Round 1)".
2. Press "Request Revisions".
3. On the "Request Revisions" page press "Record Decision".
4. Sign in as `msmith`, the monograph's author. "My Submissions" opens.
5. Press "Tasks" in the page header.

**Expected**: the Tasks panel lists "Revisions to consider in Internal
Review." with the monograph's title, and the "Tasks" button shows "1".

**Observed**: the Tasks panel reads "No Items" and "0 - 0 of 0 items";
the button reads "Tasks" with no count. The row on My Submissions reads
"Internal Review (Round 1)", "Revision requested", with "Submit
revisions".

Control, on submission 16, "A Designer's Log: Case Studies in
Instructional Design" (External Review; reached the same way as 17):
"Request Revisions"; leave "Revisions will not be subject to a new round
of peer reviews." chosen and press "Next"; "Continue" on "Notify
Authors"; "Record Decision" on "Notify Reviewers". Its author `mpower`
then sees "Tasks 1" and "Revisions to consider in External Review. A
Designer's Log: Case Studies in Instructional Design".

## Cause

`PKP\notification\managerDelegate\PendingRevisionsNotificationManager::updateNotification()`
(`lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php`,
line 117) decides whether the author's task should exist by asking for
the stage's active revisions decision. It always asks for
`Decision::PENDING_REVISIONS`, whichever stage it serves:

```php
$pendingRevisionDecision = Repo::decision()->getActivePendingRevisionsDecision($submissionId, $expectedStageId, Decision::PENDING_REVISIONS);
```

On Internal Review the decision that is recorded is
`Decision::PENDING_REVISIONS_INTERNAL` (OMP's `RequestRevisionsInternal`).
`PKP\decision\Repository::getActivePendingRevisionsDecision()` accepts
only `PENDING_REVISIONS_INTERNAL` and `RESUBMIT_INTERNAL` for the
internal stage and returns `null` for anything else.

So when the delegate serves the internal task type
(`NOTIFICATION_TYPE_PENDING_INTERNAL_REVISIONS`), the lookup always
returns `null` and the `else` branch runs, which only deletes. The task
is never built.

Until 3.3 an internal revision request was stored as the same
`SUBMISSION_EDITOR_DECISION_PENDING_REVISIONS` as an external one, on
the internal stage, and the lookup found it. The decisions refactor
(`pkp/pkp-lib#7265`) gave Internal Review decision types of its own and
OMP mapped the new one to this task
(`APP\notification\NotificationManager::getNotificationTypeByEditorDecision()`),
but the delegate's lookup kept the external constant. `pkp/pkp-lib#11219`
later made the lookup stage-aware and fixed its other caller,
`ReviewRound::determineStatus()`, which picks the decision by stage;
this caller was left as it was.

Reach:

- The delegate runs after every decision
  (`PKP\decision\Repository::updateNotifications()`), after a
  revised file's upload and delete
  (`PKP\submissionFile\Repository::add()` and `delete()`) and after a
  file's metadata form is saved (`PKPManageFileApiHandler`, to which
  OMP's `ManageFileApiHandler` adds the internal type). All go through
  the same line (code).
- External Review's task and a journal's "Revision required." task are
  not affected (on screen, OMP and OJS).
- The task's wording and its link to the monograph work once the task
  exists (on screen, with the fix below).

## Proposed fix

Ask for the stage's own decision, as `ReviewRound::determineStatus()`
does. Proposed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-revisions-request-gives-author-no-task/fix.diff)):

```diff
--- a/lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php
+++ b/lib/pkp/classes/notification/managerDelegate/PendingRevisionsNotificationManager.php
@@ -114,7 +114,9 @@
         }
         $expectedStageId = $stageData['id'];
 
-        $pendingRevisionDecision = Repo::decision()->getActivePendingRevisionsDecision($submissionId, $expectedStageId, Decision::PENDING_REVISIONS);
+        // Each review stage records its own revisions decision (as ReviewRound::determineStatus() asks).
+        $decisionToCheck = $expectedStageId === WORKFLOW_STAGE_ID_EXTERNAL_REVIEW ? Decision::PENDING_REVISIONS : Decision::PENDING_REVISIONS_INTERNAL;
+        $pendingRevisionDecision = Repo::decision()->getActivePendingRevisionsDecision($submissionId, $expectedStageId, $decisionToCheck);
         $removeNotifications = false;
 
         if ($pendingRevisionDecision) {
```

Tried on `main`, OMP and OJS: after the steps the author's panel reads
"Tasks 1" and "Revisions to consider in Internal Review. Open
Development: Networked Innovations in International Development", and
the External Review control is unchanged. The new task goes away when
the author uploads a revised file and when the editor records "Send to
External Review", and a journal's author still gets "Revision
required.".

What the fix touches:

- OJS and OPS: `Decision::PENDING_REVISIONS_INTERNAL` is defined in
  pkp-lib's `Decision`, so the new line is valid there. Its internal
  side is never reached there, because only OMP creates the delegate
  with the internal task type.
- The branch the fix opens for the internal stage skips the build when
  the author already holds a
  `NOTIFICATION_TYPE_EDITOR_DECISION_PENDING_REVISIONS` notification on
  the monograph (lines 126 to 131). On a press only an External Review
  request creates one, and the delegate's internal pass deletes it in
  the same update (which is why a press's external task reads
  "Revisions to consider…" where a journal's reads "Revision
  required."). So the guard finds nothing on the internal stage (code;
  the trial agrees).
- "Resubmit for Review" is not this delegate's. On External Review its
  task comes from `EditorDecisionNotificationManager`
  (`NOTIFICATION_TYPE_EDITOR_DECISION_RESUBMIT`), and no manager maps
  `RESUBMIT_INTERNAL` to a task; the fix leaves both as they are
  (code).

**Alternatives**

- Let `getActivePendingRevisionsDecision()` translate
  `PENDING_REVISIONS` to the internal constant for the internal stage:
  it hides the caller's mistake in the lookup and departs from how
  `determineStatus()` calls it.

**What goes with it**

- No data repair. A monograph waiting for internal revisions when the
  fix lands gets no task after the fact; the next request does.
- Backport: the diff applies as written to `stable-3_5_0` (the same
  line 117) and to `stable-3_4_0` (`patch` places the hunk ten lines
  up, at line 107; the context lines are the same). Both have the
  stage-aware lookup and the internal constant.
- Guard: an e2e step in the Internal Review scenario that reads the
  author's Tasks panel after "Request Revisions" (a Planned item in the
  spec).

Small: one line in the shared delegate, following the pattern of the
lookup's other caller, and one test step.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-revisions-request-gives-author-no-task/walk.js).
  It takes the Steps and the control on OMP; `MODE=nb` runs alone the
  checks of what the fix must leave alone. Run on a dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/internal-revisions-request-gives-author-no-task/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front for 3.5;
  `MODE=nb … node bin/probe.js ojs,omp …` for the fix's checks).
- The walk opens each workflow by its address
  (`dashboard/editorial?workflowSubmissionId=<id>`), not through "Active
  submissions".
- Walked on `main`: OMP 3b0ecf794 (lib/pkp 3dc90c81a6, ui-library
  280f98c5). Walked on `stable-3_5_0`: OMP 9c5e24246 (lib/pkp
  cf3f984335, ui-library d4e01883); the same screens and the same
  Observed and control. Dataset: pkp/datasets e8dafbc (2026-10-02),
  PostgreSQL. No request failed and no page script failed in any walk.
- The email: on `main` and on 3.5 the test mailbox held, within twenty
  seconds of the walk's decision, a message to `msmith@mailinator.com`
  with the subject quoted in Impact, whose links name the walked
  install's own address and submission 17.
- Stored records after the walk on `main`: `msmith` holds no
  task-level notification on submission 17; `mpower` holds one of type
  `0x1000016` (`NOTIFICATION_TYPE_PENDING_EXTERNAL_REVISIONS`) on
  submission 16. With the fix, `msmith` holds one of type `0x1000015`
  (`NOTIFICATION_TYPE_PENDING_INTERNAL_REVISIONS`).
- Fix trial on `main`, the diff applied to OMP and to OJS (lib/pkp
  ddd8ab243a; the file is identical in the three apps), each check run
  with the fix in and out. OMP submission 12 (`lelder`), "Request
  Revisions", then the author uploads `u71a-revision.txt` with "Upload
  revisions": the task is there, then gone (fix out: "No Items" both
  times). OMP submission 9 (`fperini`), "Request Revisions", then
  `dbarnes` records "Send to External Review": the task is there, then
  gone (fix out: "No Items" both times). OJS submission 10 (`jnovak`),
  "Request Revisions" without a new round: "Revision required." with
  the fix in and out. OPS has no review rounds: not applied, not
  walked.
- Code reads. 3.5: the delegate's line 117 and the lookup are as on
  `main`. 3.4 (pkp-lib `stable-3_4_0` 32b0f4b4af, OMP `stable-3_4_0`
  0aec65441): the delegate's line 107 passes
  `Decision::PENDING_REVISIONS`, the lookup is stage-aware, OMP's
  `RequestRevisionsInternal` records `PENDING_REVISIONS_INTERNAL` and
  its `NotificationManager` maps it to the internal task; `patch
  --dry-run` of the diff on that branch's file succeeds. 3.3 (pkp-lib
  `stable-3_3_0` f6ab331645, OMP 8e72fc883):
  `_internalReviewStageDecisions()` offers
  `SUBMISSION_EDITOR_DECISION_PENDING_REVISIONS`, which
  `EditDecisionDAO::findValidPendingRevisionsDecision()` matches on the
  internal stage, so the delegate builds the task.
- Introduced: `git blame` on line 117 names f75706ba57 (pkp-lib PR
  `pkp/pkp-lib#7631`), which replaced the `EditDecisionDAO` lookup with
  this call; the app half, OMP
  [fdfeefdb1](https://github.com/pkp/omp/commit/fdfeefdb1dd1e486091158e8fbbf8383a9411372)
  (`pkp/omp#1071`), added `PENDING_REVISIONS_INTERNAL` and its mapping
  to the task. `pkp/pkp-lib#11219`
  ([46508ce82d](https://github.com/pkp/pkp-lib/commit/46508ce82df38ef27bef6b6a895885fb02d99b94),
  2025-04-09) is not where the fault starts: before it the lookup did
  not return early, searched the internal stage for a
  `PENDING_REVISIONS` decision, found none and returned `null` too.
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ui-library; issues and
  PRs, open and closed): by "internal review revisions task
  notification", "Revisions to consider", and the class, method and
  constant names of the Cause. The nearest, `pkp/pkp-lib#11219` (the
  internal round's status after an upload), is fixed and does not
  mention the task.
- Not driven on screen: the metadata-save path, the guard on an
  existing decision notification and "Resubmit for Review" (code only).
