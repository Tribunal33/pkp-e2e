# A submission's activity log "View changes" opens any edited review on the site by its number, not only the submission's own

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP (OPS has no review stage)
  - 3.5: none (no editable-reviews feature)
  - 3.4: none (code; no editable-reviews feature)
  - 3.3: none (code; no editable-reviews feature)
- **Introduced** `pkp/pkp-lib#13197` for `pkp/pkp-lib#13192` · [30a2572a7a](https://github.com/pkp/pkp-lib/commit/30a2572a7a5a9b44a1a29346caa1eb425bc5f2b9) · 2026-08-20 · Taslan A. Graham (taslangraham)
- **Upstream** `pkp/pkp-lib#13192` (open): reopened 2026-10-02, "`SubmissionReviewEventLogGridHandler::viewReviewChange` accepts any log entry ID, whether or not it's associated with the current submission/journal/etc. This only affects `main`"; no fix PR yet
- **Tracked in** U38 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a11)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

Update 2026-10-07: re-verified end to end on today's tips; the fault,
cause, severity and effort are unchanged. The report now also covers the
recommendation entry and the server error on an unknown entry number, and
says who gains what on single- and multi-journal sites.

## Summary

When an editor edits a submitted review in the "Modify Review" window,
the submission's "Activity Log" records the change. Its "View changes"
link opens a window with the review's old and new values. The link's
address names the submission and the change by number, and only the
submission is checked. A Section Editor who pastes that address into the
browser with one of their own submissions and another change's number is
shown that change, from any submission. The reply shows as raw text in
the browser tab.

The reader sees the old and new comments, recommendation, review-form
answers and competing interests. The window names neither the reviewer
nor the submission; the reader tells the submission from what the review
discusses. The change numbers run in one sequence across the site, so a
reader can step through them. On a site hosting several journals, a
manager or Section Editor of one journal reads the other journals' edited
reviews the same way.

## Impact

- **Lost**: the confidentiality of review content. Only reviews an editor
  has changed through "Modify Review" are exposed, since only those
  changes are logged. Nobody is told of a read.
- **Who** gains access they should not have:
  - a Section/Series Editor, to the edited reviews of the submissions in
    their journal they are not assigned to;
  - on a multi-journal site, a manager or Section/Series Editor of one
    journal, to every other journal's edited reviews;
  - a Section/Series Editor who is also an author, to the edited reviews
    of their own submission, which the activity log hides from them.

  A manager gains nothing within their own journal, where every review is
  already open to them.
- **Way round**: none in configuration. A site tracking `main` can hold
  off editing reviews until the fix lands.

Medium: a read-only leak of review content, open only to editorial
accounts. It would be high if it reached unedited reviews too, or named
the reviewer. Being unreleased, it can be closed before any release
carries it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`); the
  same on OMP `main` (press `publicknowledge`).
- The dataset's own users:
  - `dbarnes`: Journal editor, a manager-level group, so every submission
    is open to him.
  - `minoue`: Section editor assigned to submissions 2, 9 and 19, not 10.
  - `svogt`: Copyeditor.
  - `zwoods`: Author of submission 19.

  [OMP: `dbarnes` is the Press editor, again manager-level. `minoue` is a
  Series editor assigned to submission 6 only. `mpower` is the author of
  submission 16. `svogt` is a Copyeditor.]
- The edited review of step 1 is the only state the steps create.

Steps:

1. Sign in as `dbarnes`. Open submission 10, "Condensing Water
   Availability Models to Focus on Specific Water Management Systems", at
   its review stage. In "Reviewers", press "Read Review" on Aisla McCrae's
   completed review, then "Modify Review", and "Modify Review" again in
   the "Modify this review?" dialog. Replace the "For author and editor"
   comment with "u38x4 edited by the editor.", change the recommendation
   from "Revisions Required" to "Accept Submission", and press "Save
   Changes".
   [OMP: submission 16, "A Designer's Log: Case Studies in Instructional
   Design", Adela Gallego's row. The window has no recommendation.]
2. Open the header's "Activity Log". Expand the line "The following was
   modified in this review: Comments.", and press its "View changes". The
   window shows "Updated Comments" with the new text and "Previous
   Comments" with the old. The link sends this GET (browser Network
   panel):
   `…/index.php/publicknowledge/$$$call$$$/grid/event-log/submission-review-event-log-grid/view-review-change?submissionId=10&logEntryId=347`.
   The "Reviewer Recommendation" line's link sends `logEntryId=348`.
   Sign out.
   [OMP: `submissionId=16&logEntryId=641`; there is no recommendation
   line.]
3. Sign in as `minoue`. Paste the step-2 address into the address bar,
   with `submissionId` changed to `19` (a submission `minoue` is assigned
   to) and `logEntryId` left at `347`.
   [OMP: `submissionId=6&logEntryId=641`.]

**Expected**: refused with
`{"status":false,"content":"The requested resource was not found."}`.
The same grid's "View Email" link gives that answer when the email
belongs to another submission.

**Observed**: the tab shows submission 10's review change:

```
{"status":true,"content":"<form class=\"pkp_form\"><div><h3>Updated Comments<\/h3><div><p><p>u38x4 edited by the editor.<\/p><\/p><\/div><\/div><div><h3>Previous Comments<\/h3> <div><p><p>Here are my review comments<\/p><\/p><\/div><\/div><\/form>","elementId":"0","events":[]}
```

With `logEntryId=348`, the reply holds "Updated Reviewer Recommendation:
Accept Submission" and "Previous Reviewer Recommendation: Revisions
Required".

**Controls** (same sessions):

- Refused with "The current role does not have access to this
  operation.":
  - `minoue` with `submissionId=10`;
  - `svogt` and `zwoods` with the step-3 address [OMP: `svogt`,
    `mpower`].
- Shows the entry: `dbarnes` with `submissionId=10`, the legitimate read
  [OMP: `submissionId=16`].

## Cause

`SubmissionReviewEventLogGridHandler::viewReviewChange()`
(`lib/pkp/controllers/grid/eventLog/SubmissionReviewEventLogGridHandler.php`,
line 46 on `main`) loads the entry by primary key alone, with
`Repo::eventLog()->get((int)$args['logEntryId'])`. It then formats the
entry without checking that it belongs to the request's submission.

The handler's authorization checks only the `submissionId` argument.
`SubmissionEventLogGridHandler::authorize()` adds two policies:

- `SubmissionAccessPolicy`, whose `SubmissionRequiredPolicy` requires a
  submission of the current journal;
- `UserAccessibleWorkflowStageRequiredPolicy` (line 102). It admits a
  sub-editor only on a submission assigned to them, and a manager or site
  administrator on any submission of the journal.

The operation then ignores `submissionId` and serves whatever
`logEntryId` names. An `event_log` row has no journal column, so nothing
limits the entry to the user's journal either.

The grid's own list is scoped correctly, and `viewReviewChange()` applies
neither of its limits:

- `getReviewChangeEntries($submission)` gathers only the review-change
  entries of the submission's own review assignments and viewable review
  comments.
- `EventLogGridRow` hides "View changes" from a reader who is also
  assigned as the submission's author.

Reach:

- The entry types: `formatReviewChange()` serves all four (comments,
  recommendation, review-form response, competing interests) through the
  same unscoped `get()`. OMP logs no recommendation changes, since
  `hasCustomizableReviewerRecommendation()` is false there.
- An entry number that names another kind of event-log row (a decision,
  say) answers `200` with an empty `content`, because
  `formatReviewChange()` falls through all four branches.
- An entry number that does not exist answers a server error (`500`):
  `get()` returns `null`, which goes to
  `formatReviewChange(EventLogEntry $logEntry)`. The server log reads
  `PHP Fatal error: Uncaught TypeError:
  PKP\controllers\grid\eventLog\SubmissionReviewEventLogGridHandler::formatReviewChange():
  Argument #1 ($logEntry) must be of type PKP\log\event\EventLogEntry,
  null given`. The screens never send such a number.
- Neighbouring paths are scoped:
  - `viewEmail()` on the parent handler, scoped on 2026-10-02 for
    `pkp/pkp-lib#13434`;
  - the grid's `fetchGrid`/`fetchRow`, which read through `loadData()`;
  - the review-edit API, which loads the assignment with
    `Repo::reviewAssignment()->get($id, $submissionId)`: in
    `ReviewAssignmentController` for the reads (line 132 and on), and in
    the form request `formRequests/EditReview.php` (lines 40-43) for
    `editReview`, the method that writes these entries.

  No other `Repo::eventLog()->get()` takes an id from a request.

## Proposed fix

Serve only an entry from the submission's own review-change list, the
list the grid shows, and refuse anything else, the way `viewEmail()`
does. This goes in `SubmissionReviewEventLogGridHandler::viewReviewChange()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/fix.diff),
against the app root; it also drops the `Repo` import it leaves unused):

```diff
     public function viewReviewChange($args): JSONMessage
     {
-        $logEntry = Repo::eventLog()->get((int)$args['logEntryId']);
+        // Authors, even those also assigned as an editor, may not read review details.
+        if ($this->_isCurrentUserAssignedAuthor) {
+            return new JSONMessage(false, __('api.403.unauthorized'));
+        }
+
+        // Serve only an entry from this submission's own review history, the list the grid shows.
+        // The log entry id alone names any review change on the site.
+        $logEntryId = (int) $args['logEntryId'];
+        $logEntry = collect($this->getReviewChangeEntries($this->getSubmission()))
+            ->first(fn (EventLogEntry $entry): bool => (int) $entry->getId() === $logEntryId);
+
+        if (!$logEntry) {
+            return new JSONMessage(false, __('api.404.resourceNotFound'));
+        }
+
         return new JSONMessage(true, $this->formatReviewChange($logEntry));
     }
```

Reusing the grid's scoped list covers all four entry types at once. The
author guard is the same one `EventLogGridRow` applies to the link. Any
number outside the list now answers `api.404.resourceNotFound`. That
includes another submission's entry, an entry that is not a review
change, and one that does not exist, which closes the empty `200` and the
`500` too.

**Alternatives**

- Check the fetched entry's `assocType`/`assocId`, as the `viewEmail`
  fix does. That does not work here: a review-change entry is tied to the
  review assignment (517) or the review comment (1048595), not to the
  submission, so the same check would refuse every legitimate read. The
  scoped list resolves those ids to the submission, as the grid already
  does.
- A null check alone closes the `500` but not the leak.

**What goes with it**

- No data repair: the stored entries are right, only the read is
  unscoped.
- No API client or plugin is affected: the operation serves only this
  link's window.
- Test: `lib/pkp` has no test that reaches this handler, so the guard is
  an e2e step. It takes the Steps above and checks both the step-3
  refusal and the controls.

Tried on OJS and OMP `main`. With the fix in:

- the step-3 address answered "The requested resource was not found." on
  both apps, as did the recommendation entry on OJS;
- `dbarnes` still read the comments change on screen, and on OJS the
  recommendation change too;
- the entry that is not a review change and the unknown number answered
  "not found".

The Controls gave the same answers with the fix in and out.

Small: one method in one pkp-lib handler, reusing a list the grid already
builds, and an e2e test.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/walk.js)
  (the Steps, the Controls and the reach) and
  [address.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/address.js)
  (step 3 as a plain address-bar navigation, after walk.js), with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/lib.js)
  and
  [modify-review-offered-then-refused/lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/lib.js).
  - They run on an install freshly loaded from PKP's default test dataset
    (pkp/datasets 401a013, 2026-10-06, PostgreSQL):
    `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs,omp shared/playwright/checks/issues/activity-log-view-changes-reads-any-review/walk.js`.
    `MODE=nb` runs the controls and the unknown-number read alone, which
    is how the fix was checked in and out.
  - `dbarnes` edits the review on screen and opens both "View changes"
    windows. walk.js sends the other reads as the "View changes" GET in
    the signed-in user's session; address.js sends step 3 by navigating
    the tab, as a person pasting the address does. Both showed the entry
    to `minoue` on OJS and OMP.
  - The walk created `event_log` 347 (assoc_type 1048595, review comment)
    and 348 (recommendation) on OJS, and 641 on OMP. Reviews 15 (OJS) and
    21 (OMP) are double-anonymous. No reviewer name appeared in any
    window or reply.
- Tips: OJS `main` 92bc2bb467 (lib/pkp e60013c77f) and OMP `main`
  a0e6d0a8b (lib/pkp 5a5ab2d6c7), ui-library a36dc7fe on both. The
  `controllers/grid/eventLog/` directory is identical in the two lib/pkp
  commits.
- 3.5 walked (OJS b8f5e9a951, OMP 7d6b00060, lib/pkp 6d7f1540b6, freshly
  reset to the 3.5 dataset). "Read Review" opens the old review panel,
  which offers no "Modify Review", so step 1 cannot be taken and no
  review-change line exists. In the code, lib/pkp `stable-3_5_0` has no
  `SubmissionReviewEventLogGridHandler`, no review-change event types and
  no `api/v1/submissions/reviewAssignments/`; its `viewEmail()` is
  scoped too (`pkp/pkp-lib#13434`).
- 3.4 and 3.3 by code: lib/pkp `stable-3_4_0` 767353f4fe and
  `stable-3_3_0` ac3fa73402 (OJS app d68934d0d1 and ac77c9fb35, OMP
  0aec65441 and 8e72fc883) have neither the handler nor the
  review-change event types, and their logs name none of
  `pkp/pkp-lib#13110`, `#13117`, `#13192`.
- Introduced: `git blame` on line 46 gives 30a2572a7a, which added the
  file (PR #13197 for issue #13192); the line has not changed since. The
  entries it serves are written by `pkp/pkp-lib#13117`'s review-edit API.
  The competing-interests type was added by 5af3b39336
  (`pkp/pkp-lib#13291`).
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library on
  2026-10-07 by the method, class and symptom words. Only
  `pkp/pkp-lib#13192` matches, and its timeline since the 2026-10-02
  reopening holds no PR.
- Read in the code, not walked: the cross-journal reach (the default
  dataset holds one journal per app), the author-editor case, and the
  review-form and competing-interests entry types. MySQL not checked;
  the fix casts the id before comparing, so the driver's type does not
  matter.
