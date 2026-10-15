# An author assigned as their submission's editor can read a review as it stood before an editor changed it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP
  - 3.5: none (no "Modify Review")
  - 3.4: none (code; no editable reviews)
  - 3.3: none (code; no editable reviews)
- **Introduced** `pkp/pkp-lib#13197` for `pkp/pkp-lib#13192` · [30a2572a7a](https://github.com/pkp/pkp-lib/commit/30a2572a7a5a9b44a1a29346caa1eb425bc5f2b9) · 2026-08-20 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-15)
- **Tracked in** U38 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U38-submission-activity-log-and-notes.md#a12)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A person who is one of a submission's authors and is also assigned to it
as its Section editor (Series editor on a press) can read what a
reviewer wrote before an editor changed the review with "Modify Review".
In the submission's "Activity Log" they see the line "The following was
modified in this review: Comments. Select "View changes" to see a
detailed summary of all modifications." with no arrow and no "View
changes". But the address that the other editors' "View changes" link
opens, typed into the browser's address bar, shows them the change as
the server's raw reply: "Updated Comments" with the editor's text and
"Previous Comments" with the reviewer's own.

That address is expected to refuse them, just as the list withholds the
link: an author is kept from their submission's review details even when
also assigned as its editor. The reviewer is not named. The exposed
comments are the reviewer's comments for the author and editor; the
comments for the editor only are never logged. An author who holds the
Journal editor role (Press editor) but is not assigned to the
submission is refused, and so is an author with no editor role; the
submission's other editors read the change through the link as before.

## Impact

- **Lost**: the version of a review the editors chose not to pass on.
  An editor may use "Modify Review" to take a remark or a hint at the
  reviewer's identity out of the comments before the author sees them.
  An author who is also the submission's editor can still read the
  original. Read in the code, the same address serves the
  recommendation and the competing-interests statement before and after
  a change, and every review-form answer, the ones meant for the editor
  only included. Nobody is told.
- **Who**: an author who is also assigned as an editor of the same
  submission, which happens where editors publish in their own journal
  or press. They have to type the address with the change's number,
  which no screen gives them; the numbers run in sequence.
- **Way round**: no setting closes it; a journal can only avoid
  assigning an author as an editor of their own submission.

Medium: a protection built for exactly this setup fails, but the setup
is uncommon, the reader has to work the address out, and the reviewer
stays unnamed. The editor-only form answers are reached only where a
review form is in use and an editor changed its answers. It would be
high if every editor could read any author's review changes this way.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`); the
  same on OMP `main` (press `publicknowledge`).
- The dataset's own users and submission:
  - `dbarnes`: Journal editor, a manager-level group.
  - `jnovak`: John Novak, Author and Reader, the author of submission
    10, "Condensing Water Availability Models to Focus on Specific Water
    Management Systems", which is in Review with Aisla McCrae's completed
    double-anonymous review.

  [OMP: `dbarnes` is the Press editor; `mpower`, Michael Power, is the
  author of submission 16, "A Designer's Log: Case Studies in
  Instructional Design", with Adela Gallego's completed review.]
- What the dataset lacks, made in steps 4-7: an author of the submission
  who is also its assigned Section editor.

Steps:

The edited review:

1. Sign in as `dbarnes`. Open submission 10 at its review stage. In
   "Reviewers", press "Read Review" on Aisla McCrae's completed review,
   then "Modify Review", and "Modify Review" again in the "Modify this
   review?" dialog. Replace the "For author and editor" comment with
   "u38x4 edited by the editor.", change the recommendation from
   "Revisions Required" to "Accept Submission", and press "Save
   Changes".
   [OMP: submission 16, Adela Gallego's row. The window has no
   recommendation.]
2. Open the header's "Activity Log". Expand the line "The following was
   modified in this review: Comments.", and press its "View changes".
   The "View Review" window shows "Updated Comments" with the new text
   and "Previous Comments" with the old. The link sends this GET
   (browser Network panel):
   `…/index.php/publicknowledge/$$$call$$$/grid/event-log/submission-review-event-log-grid/view-review-change?submissionId=10&logEntryId=347`.
   Sign out.
   [OMP: `submissionId=16&logEntryId=641`.]
3. Sign in as `jnovak` and paste the step 2 address into the address
   bar. The tab reads `{"status":false,"content":"The current role does
   not have access to this operation.",…}`. Sign out.
   [OMP: `mpower`.]

The author becomes the submission's editor:

4. Sign in as `dbarnes`. Settings › Users & Roles › "Users", press
   "Invite to a role", type `jnovak@mailinator.com` and press "Search
   User".
5. In the row "Select a new role" choose "Section editor", start date
   today, "Appear on the masthead"; press "Save And Continue", then
   "Invite user to the role". Sign out.
   [OMP: `mpower@mailinator.com`, "Series editor".]
6. Open the invitation email sent to `jnovak@mailinator.com`. The
   dataset's `config.inc.php` sends mail by SMTP to `localhost:1025`, the
   usual port of a local mail catcher such as Mailpit. Follow the email's
   link while signed out. The page opens on "Review & create account"
   (no ORCID step); press "Accept And Continue to OJS". The dialog reads
   "You've been assigned a new role in OJS".
   [OMP: "Accept And Continue to OMP".]
7. Sign in as `dbarnes`, open submission 10 and press "Assign" in
   "Participants". Choose the role "Section editor", pick "John Novak",
   press "OK". Sign out.
   [OMP: "Series editor", "Michael Power".]

The author-editor:

8. Sign in as `jnovak`. "Assigned to me" lists submission 10; open it
   and press "Activity Log". On its "History" tab the lines "The
   following was modified in this review: Comments. …" and "… Reviewer
   Recommendation. …" have no arrow and no "View changes".
   [OMP: the Comments line alone.]
9. Paste the step 2 address into the address bar.

**Expected**: refused, as the list withholds the link from this reader;
with the proposed fix the tab reads
`{"status":false,"content":"Access denied.",…}`.

**Observed**: the tab shows the change, with the reviewer's original
text:

```
{"status":true,"content":"<form class=\"pkp_form\"><div><h3>Updated Comments<\/h3><div><p><p>u38x4 edited by the editor.<\/p><\/p><\/div><\/div><div><h3>Previous Comments<\/h3> <div><p><p>Here are my review comments<\/p><\/p><\/div><\/div><\/form>","elementId":"0","events":[]}
```

[OMP: "Previous Comments" reads "I recommend that the author revise
this submission."]

Control: with "Journal editor" (a manager-level role) chosen in step 5
instead and step 7 left out, step 9 answers
`{"status":false,"content":"You don't currently have access to that
stage of the workflow.",…}`. [OMP: "Press editor", the same.]

## Cause

`SubmissionEventLogGridHandler::authorize()`
(`lib/pkp/controllers/grid/eventLog/SubmissionEventLogGridHandler.php`,
lines 106-115 on `main`) sets `_isCurrentUserAssignedAuthor` when any
stage assignment of the reader carries the Author role ("Prevent
authors from accessing review details, even if they are also assigned
as an editor, sub-editor or assistant."). Only the drawing of the list
reads the flag:

- `EventLogGridRow::initialize()` leaves out `ReviewChangeLinkAction`
  (line 116) and, for a non-open review, a reviewer file's download
  link;
- `EventLogEntry::getTranslatedMessage()` and
  `EventLogGridCellProvider` put "Anonymous Reviewer" in place of the
  reviewer of a non-open review, in the event texts and on the
  acceptance, decline and unconsidered lines.

No operation of the grid checks it.

`SubmissionReviewEventLogGridHandler`, the handler behind "View
changes", inherits that `authorize()` and never reads the flag. Its
`viewReviewChange()` (line 45) checks only that the entry belongs to the
request's submission (added by `pkp/pkp-lib#13465`) before formatting
it. Its role assignment (line 37) admits a sub-editor, and both
`SubmissionAccessPolicy`'s sub-editor branch and the handler's own
`UserAccessibleWorkflowStageRequiredPolicy` admit the reader, whose
stage assignments include the Section editor one. Without that
assignment the editorial-workflow check refuses them, which is why the
editor role alone is not enough.

Reach:

- Every entry type: `formatReviewChange()` serves the comments, the
  recommendation (OJS; OMP logs none), the review-form answers and the
  competing interests the same way (code; the comments driven on both
  apps). The comments entry is written only for the comments for the
  author and editor (`ReviewAssignmentController::editReview()`); the
  form entry holds every element of the form,
  `ReviewFormElementDAO::getByReviewFormId()` being called without the
  "included" filter.
- Every review type: the list hides the link whatever the review type,
  and the request answers whatever the review type (code; walked on a
  double-anonymous review).
- The other places that keep review details from an author who is also
  an editor refuse the request itself:
  `PKPReviewerGridHandler::authorize()` returns false for
  `_getAuthorDeniedOps()` and, on anonymous reviews,
  `_getAuthorDeniedAnonymousOps()` ("Read Review" among them); a
  reviewer's file is refused by `SubmissionFileAuthorEditorPolicy`
  (code).

## Proposed fix

Refuse the handler to a reader the parent marks as an assigned author,
in `SubmissionReviewEventLogGridHandler`, as `PKPReviewerGridHandler`
refuses its review ops
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-editor-reads-review-change-by-address/fix.diff)):

```diff
+    public function authorize($request, &$args, $roleAssignments)
+    {
+        $success = parent::authorize($request, $args, $roleAssignments);
+
+        // Prevent authors from accessing review changes, even if they are also
+        // assigned as an editor or sub-editor (EventLogGridRow offers them no link).
+        if ($success && $this->_isCurrentUserAssignedAuthor) {
+            return false;
+        }
+
+        return $success;
+    }
```

The override refuses every operation of this handler, the inherited
`fetchGrid`, `fetchRow` and `viewEmail` included. That costs nothing:
`ReviewChangeLinkAction` is the handler's one caller, and the "Activity
Log" and its "View Email" go through the parent handler. The flag is set
for anyone with an Author stage assignment, so a manager or site
administrator assigned as an editor of a submission they also wrote
loses "View changes" by address as well. That is intended: the list
already withholds the link from them.

Tried on `main`, OJS and OMP: with the fix in, step 9 answers
`{"status":false,"content":"Access denied.",…}` while step 8's
"Activity Log" still lists both lines. `dbarnes`, and on OJS the
assigned Section editor `dbuskins`, who is not an author, still open
"View changes" and read the change, with the fix in and out.

**Alternatives**:

- The same check at the top of `viewReviewChange()`, answering a
  refusal message: the same effect; the reviewer grid's pattern refuses
  in `authorize()`.
- Refuse only for non-open reviews, as "Read Review" and a reviewer's
  file do: the list hides "View changes" whatever the review type, so
  the two would then disagree. Showing an Open review's changes to this
  reader is a product choice that would change the row and the handler
  together.

**What goes with it**:

- No stored data to repair, no API or plugin hook touched.
- A test that an author assigned as the submission's editor is refused
  the change by its address.

Small: one method in one pkp-lib class, following the reviewer grid's
pattern, and its test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-editor-reads-review-change-by-address/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-editor-reads-review-change-by-address/lib.js)
  (it reuses the helpers of `activity-log-view-changes-reads-any-review/`
  and `modify-review-offered-then-refused/`), on an install freshly
  reset to PKP's default test dataset (pkp/datasets 7912e09,
  2026-10-14, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/author-editor-reads-review-change-by-address/walk.js`;
  `MODE=nb` in front runs only the check that editors who are not
  authors still read the change, `MODE=reach` the manager-level control
  (and the OJS recommendation line's address).
- Walked on `main` and 3.5, OJS and OMP. On 3.5 the Steps stop at
  step 1.
- Fix trial: `fix.diff` applied to OJS and OMP `main`; the walk and the
  `MODE=nb` check run with it, the `MODE=nb` check again after the
  revert.
- Tips: `main` OJS 378eced941, OMP f4836d4fba, lib/pkp b17fadae59
  (both). 3.5: OJS ca763c91cd, OMP a70bbb9c4d, lib/pkp 4045d9241e. 3.4:
  OJS daf0ca971d, OMP 0aec65441f, lib/pkp 55c8e406b3. 3.3: OJS
  d7d9dd14ec, OMP 8e72fc8836, lib/pkp 5e84acd11b.
- Code reads beyond the Cause: `PKPRouter`'s authorization failure
  ("Access denied." when no policy names a message),
  `Repo::user()->getAccessibleWorkflowStages()` and
  `PKPApplication::getWorkflowTypeRoles()` (the manager-level control).
  On 3.5 and on `stable-3_4_0` and `stable-3_3_0` (lib/pkp): no
  `SubmissionReviewEventLogGridHandler`, no `viewReviewChange`, no
  review-change event types.
- Introduced: `git blame` on `SubmissionReviewEventLogGridHandler.php`
  gives 30a2572a7a for the constructor and `viewReviewChange()`, apart
  from the submission check that 15f9f72323 (`pkp/pkp-lib#13465`,
  2026-10-08) added; `EventLogGridRow`'s withheld link came in the same
  30a2572a7a for the comments, recommendation and form entries, and with
  5af3b39336 (`pkp/pkp-lib#13369`, 2026-09-22) for the
  competing-interests entry and `formatCompetingInterestChange()`.
- Upstream searches (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library;
  issues and PRs): "view changes" author editor review, activity log
  review changes author, viewReviewChange,
  SubmissionReviewEventLogGridHandler, isCurrentUserAssignedAuthor.
  `pkp/pkp-lib#13192` was reopened on 2026-10-02 for the entry of
  another submission only, and closed with `pkp/pkp-lib#13465`; its
  comments do not name the author-editor case.
- Not driven: the recommendation, review-form and competing-interests
  entries read by this reader (the recommendation entry's address was
  read by `dbarnes` and by the manager-level control); an Open review; a
  manager assigned as an editor of their own submission; MySQL (the
  fault does not depend on the database).
