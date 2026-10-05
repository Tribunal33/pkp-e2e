# A submission's activity log "View changes" opens any edited review on the site by its number, not only the submission's own

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP (OPS has no review stage)
  - 3.5: none (code; no editable-reviews feature)
  - 3.4: none (code; no editable-reviews feature)
  - 3.3: none (code; no editable-reviews feature)
- **Introduced** `pkp/pkp-lib#13197` for `pkp/pkp-lib#13192` · [30a2572a7a](https://github.com/pkp/pkp-lib/commit/30a2572a7a5a9b44a1a29346caa1eb425bc5f2b9) · 2026-08-20 · Taslan A. Graham (taslangraham)
- **Upstream** `pkp/pkp-lib#13192` (open): reopened 2026-10-02, "`SubmissionReviewEventLogGridHandler::viewReviewChange` accepts any log entry ID, whether or not it's associated with the current submission/journal/etc. This only affects `main`"; no fix in main yet
- **Tracked in** U38 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a11)
- **Checked** 2026-10-05, each branch's tip (the commits in Evidence)

## Summary

When an editor edits a submitted review in the "Modify Review" window, the
submission's "Activity Log" records the change, and its "View changes"
link opens a "View Review" window with the review's old and new values.
That window serves whatever change entry it is asked for by its number: a
Section Editor assigned only to other submissions reads the old and new
comments, recommendation, review-form answers and competing interests of
any review an editor has edited in the journal, the content of
double-anonymous reviews included. A manager, who may open every
submission in the journal, reaches every edited review there, and by the
same missing check reads other journals' edited reviews too.

The window shows the review's content but names neither the reviewer nor
the submission; the reader works the submission out from the text. The
change-entry numbers run in a short sequence that anyone can step through.
The confidentiality of review content, which is meant to hold against an
editor who is not on the submission, does not.

## Impact

- **Lost**: the confidentiality of edited reviews. Reviewers' comments,
  recommendations, form answers and competing-interests statements, and
  the content of double-anonymous reviews, are readable by an editorial
  user the submission is not open to. Nobody is told.
- **Who**: any Section/Series editor, for the edited reviews of
  submissions in their journal they are not assigned to; any manager, for
  every edited review in their journal and in other journals on the
  installation. Only reviews an editor has edited through "Modify Review"
  are exposed, since only those are logged.
- **Way round**: none in configuration. A site tracking `main` can hold
  off editing reviews until the fix lands, since an unedited review is
  never logged and so never served.

Medium: a read-only leak of review content, reachable only with an
editorial account and only for reviews that have been edited. The
cross-journal reach a manager has would support high; it stays medium
because the read changes nothing and the reviewer is not named. Triage may
still rank it ahead of other mediums, to close it before the feature
ships.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`); the
  same on OMP `main` (press `publicknowledge`).
- The dataset's own users: `dbarnes` (Journal editor; a manager-level
  group, so every submission is open to him), `minoue` (Section editor
  assigned to submissions 2, 9 and 19, not 10), `svogt` (Copyeditor),
  `zwoods` (Author of submission 19).
  [OMP: `dbarnes` is the Press editor, again manager-level; `minoue` is a
  Series editor assigned to submission 6 only; the edited review is on
  submission 16, whose author account is `mpower`; `svogt` is a
  Copyeditor. Submission 6 is `minoue`'s accessible submission.]
- The edited review of step 1 is the only state the steps create.

Steps:

1. Sign in as `dbarnes`. Open submission 10, "Condensing Water
   Availability Models to Focus on Specific Water Management Systems", at
   its review stage. In "Reviewers", press "Read Review" on Aisla McCrae's
   completed review, then "Modify Review" and "Modify Review" in the
   "Modify this review?" dialog. Replace the "For author and editor"
   comment with "u38x4 edited by the editor." and press "Save Changes".
   [OMP: submission 16, "A Designer's Log: Case Studies in Instructional
   Design", Adela Gallego's row.]

2. Open the header's "Activity Log" and expand the line "The following was
   modified in this review: Comments.". Its "View changes" link opens a
   pop-up by JavaScript, so read the request it sends in the browser's
   Network panel: a GET to
   `…/index.php/publicknowledge/$$$call$$$/grid/event-log/submission-review-event-log-grid/view-review-change?submissionId=10&logEntryId=347`.
   The window it opens shows "Updated Comments" with the new text and
   "Previous Comments" with the old. Sign out. [OMP: the request is
   `submissionId=16&logEntryId=641`.]

3. Sign in as `minoue`. Take the step-2 request — paste it into the
   address bar, which issues the GET in `minoue`'s session — but change
   its `submissionId` to `19`, a submission `minoue` is assigned to, and
   leave its `logEntryId` at submission 10's entry (`347`). [OMP:
   `submissionId=6&logEntryId=641`.]

**Expected**: refused, as the same grid's "View Email" request is: that
request checks the entry belongs to the request's submission and answers
`{"status":false,"content":"The requested resource was not found."}`
otherwise (scoped for `pkp/pkp-lib#13434`).

**Observed**: the request answers `200` with submission 10's review-change
content, the JSON reply's `content` field:

```
{"status":true,"content":"<form class=\"pkp_form\"><div><h3>Updated Comments</h3><div><p><p>u38x4 edited by the editor.</p></p></div></div><div><h3>Previous Comments</h3> <div><p><p>Here are my review comments</p></p></div></div></form>"}
```

**Controls** (same session): the same request with `submissionId=10`
(submission 10, which `minoue` is not assigned to) answers
`{"status":false,"content":"The current role does not have access to this
operation."}`; so does the step-3 request when `svogt` (Copyeditor) or
`zwoods` (Author of 19) sends it, the operation being offered to managers,
site administrators and sub-editors only. As `dbarnes`, who may open
submission 10, the request with `submissionId=10` answers `200` with the
entry — the legitimate read. [OMP: the role controls are `svogt` and
`mpower`; the legitimate read is `dbarnes` on submission 16.]

## Cause

`SubmissionReviewEventLogGridHandler::viewReviewChange()`
(`lib/pkp/controllers/grid/eventLog/SubmissionReviewEventLogGridHandler.php`,
line 46 on `main`) loads the entry by primary key alone,
`Repo::eventLog()->get((int) $args['logEntryId'])`, and formats it without
checking that it belongs to the request's submission.

The handler's authorization scopes only the `submissionId` argument.
`SubmissionAccessPolicy`, through `SubmissionRequiredPolicy`, validates
that `submissionId` is a submission of the current journal and that the
user may reach it: a sub-editor passes only for a submission assigned to
them (`UserAccessibleWorkflowStageRequiredPolicy`), a manager for any
submission in their journal. The operation then ignores `submissionId`
and serves whatever `logEntryId` names, so a user who can reach any one
submission can read any review-change entry on the installation; a manager
reaches other journals' entries because the entry carries no context the
handler checks.

The grid's own list is scoped correctly —
`getReviewChangeEntries($submission)` gathers only the review-change
entries of the given submission, and `EventLogGridRow` hides the "View
changes" action from a reader assigned as the submission's author — and
`viewReviewChange()` applies neither, so it also serves the content to an
author-editor the row hides it from.

Reach:

- All four review-change event types the handler formats (comments,
  recommendation, review-form response, competing interests): the same
  unscoped `get()` serves each (checked in the code; the comments type was
  walked on OJS and OMP).
- A `logEntryId` that names an event-log row of some other kind (a
  decision, say) answers `200` with an empty `content`, because
  `formatReviewChange()` falls through all four branches; the fix refuses
  it as out of scope.
- The sibling endpoint `viewEmail()` on the parent handler had the same
  shape (`find()` by key alone) and was scoped on 2026-10-02 for
  `pkp/pkp-lib#13434`; this method was left unchanged.
- The cross-journal reach was established in the code (`SubmissionAccessPolicy`
  scopes only the `submissionId` argument), not walked: the default
  dataset holds one journal per app.
- The author-editor case was read in the code, not walked.

## Proposed fix

Scope the lookup to the submission's own review-change list and refuse
anything else, the way `viewEmail()` now does. In
`SubmissionReviewEventLogGridHandler::viewReviewChange()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/fix.diff),
against the app root):

```diff
     public function viewReviewChange($args): JSONMessage
     {
-        $logEntry = Repo::eventLog()->get((int)$args['logEntryId']);
+        // Authors, even those also assigned as an editor, may not read review details.
+        if ($this->_isCurrentUserAssignedAuthor) {
+            return new JSONMessage(false, __('api.403.unauthorized'));
+        }
+
+        // Serve only an entry that belongs to this submission's own review history. The log entry
+        // id is otherwise a primary key that names any review change on the site.
+        $logEntryId = (int) $args['logEntryId'];
+        $logEntry = collect($this->getReviewChangeEntries($this->getSubmission()))
+            ->first(fn (EventLogEntry $entry): bool => $entry->getId() === $logEntryId);
+
+        if (!$logEntry) {
+            return new JSONMessage(false, __('api.404.resourceNotFound'));
+        }
+
         return new JSONMessage(true, $this->formatReviewChange($logEntry));
     }
```

Reusing the grid's scoped list covers all four entry types at once, and
the `_isCurrentUserAssignedAuthor` guard matches the one `EventLogGridRow`
already applies to the action. An unknown, out-of-scope or non-review id
now answers `api.404.resourceNotFound`, which also closes the `TypeError`
(a 500) that a missing id gives today, when `get()` returns `null` and
`formatReviewChange(EventLogEntry $logEntry)` is handed it, and the empty
`200` a non-review id gives.

**Alternatives**

- A direct `assocType`/`assocId` check on the fetched entry, as the
  `viewEmail` fix does with the email's submission id. It does not work
  here: review-change entries carry `assocType` review assignment (517) or
  submission review comment (1048595) with the assignment's or comment's
  id, not the submission's, so the same check would refuse every
  legitimate read too. The scoped list resolves those ids to the
  submission as the grid already does.

**What goes with it**

- Nothing stored is wrong; the entries are correct, only the read is
  unscoped. No backport (the handler and the editable-reviews API are
  main-only).
- Test: `lib/pkp` has no test reaching this handler, so the guard is an
  e2e step — the Steps above, checking the step-3 leak and the controls.

Tried on OJS and OMP `main` (the tips in Evidence): with the fix, the
step-3 leak answered `api.404.resourceNotFound` on both, while the
submission's own editor still read the entry; a neighbour run showed the
no-access and wrong-role refusals and the legitimate read unchanged with
the fix in and out.

Small: one method in one pkp-lib handler, reusing an existing scoped list,
and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/lib.js),
  reusing
  [modify-review-offered-then-refused/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/lib.js),
  on an install loaded from PKP's default test dataset (pkp/datasets
  58f1d08, 2026-10-05, PostgreSQL):
  `PROBE_FEATURE=issues-x4 PROBE_AGENT=x4 node bin/probe.js ojs,omp shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/walk.js`.
  `dbarnes` edits the review on screen; the reads issue the "View changes"
  GET (the request the button sends) in the signed-in user's own session,
  varying only `submissionId` and `logEntryId`. The walk created
  `event_log` 347 on OJS (assoc_type 1048595, submission review comment)
  and 641 on OMP. No reviewer name appeared in any window or reply.
- The fix was applied with `bin/try-fix.js` for the walk and the
  `MODE=nb` neighbour run, then reverted; the checkouts were clean
  afterwards.
- Tips, each install freshly reset to the default dataset: OJS `main`
  1f4cef786f, OMP `main` a989fdc379, both on lib/pkp a7f5e3081b (so the
  handler is identical) and ui-library 64d6736318 / 280f98c570.
- 3.5 walked, feature absent: the review window offered no "Modify
  Review" and no review-change log line appeared. Confirmed in the code —
  `stable-3_5_0` has no `SubmissionReviewEventLogGridHandler` and no
  `reviewAssignments/ReviewAssignmentController.php` (OJS lib/pkp
  771474347e, OMP lib/pkp cf3f984335).
- 3.4 and 3.3 by code: lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402 have neither the handler nor the review-edit
  API; the editable-reviews feature (`pkp/pkp-lib#13110`) is main-only,
  which the maintainer confirms on `pkp/pkp-lib#13192`.
- Introduced: `git blame` on line 46 gives 30a2572a7a, which also added
  the file (PR #13197 for issue #13192). The entries it reads come from
  `pkp/pkp-lib#13117`'s edit API and `pkp/pkp-lib#13291`'s
  competing-interests type.
- Upstream: `pkp/pkp-lib#13192` is open; the maintainer's reopening
  comment (quoted in the header) names this method and says it affects
  `main` only, and no fix is in `main` at the tip above. Searched
  pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library for `viewReviewChange`
  and the symptom words; the sibling fix `pkp/pkp-lib#13434` (`viewEmail`)
  is a different endpoint.
- Unverified: the author-editor case, the cross-journal reach, and the
  review-form and competing-interest entry types were read in the code,
  not walked (the walk covered the comments type on OJS and OMP). MySQL
  not checked; `getId()` is cast to int by the schema, so the `===`
  holds there too.
