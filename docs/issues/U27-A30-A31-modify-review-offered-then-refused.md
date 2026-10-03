# "Modify Review" is offered on a declined request and to a Funding coordinator, then refused after the review is typed

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: none (the review window has no "Modify Review")
  - 3.4: none (code; no "Modify Review")
  - 3.3: none (code; no "Modify Review")
- **Introduced** `pkp/ui-library#960` for `pkp/pkp-lib#13156` · [30beb5e3](https://github.com/pkp/ui-library/commit/30beb5e3ed17f98407654d5850e9b682a4005755) · 2026-08-27 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U27 [A30](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a30), [A31](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a31)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

The "Review Details" window offers an active "Modify Review" button in
two cases where saving is not allowed. The confirmation and the "Modify
Review" window open as usual, the person types the review, and only
"Save Changes" refuses it. Nothing is saved, and the typed text is lost
when the window is left.

On a "Request Declined" row, an editor who wants to record the
reviewer's review gets "Please correct one error. Go to error: This
review not editable because it was declined." There is nothing in the
form to correct. The save goes through only after "Resend Review
Request", which emails the reviewer a new request unless "Do not send
email to Reviewer." is ticked; the refusal does not mention it.

A Funding coordinator assigned to the submission, the one default
assistant role that sees the review stage, gets an "Error" dialog
reading "The current role does not have access to this operation." on
every submitted review. They may not change reviews, so the refusal is
right and the offer is the fault.

## Impact

- **Lost**: the review text typed into the window. Nothing stored
  changes.
- **Who**: an editor recording, on a declined request, a review that the
  reviewer sent in some other way, which is rare. A Funding coordinator
  meets it on every submitted review: the role covers the review stage
  by default, so any assignment of one to a submission puts them there.
  The other default assistant roles do not see the review stage.
- **Way round**: on a declined request, "Resend Review Request" with
  "Do not send email to Reviewer." ticked, then the same save. A Funding
  coordinator asks an editor to make the change, which is the intended
  path.

Low: only unsaved typing is lost, the refusal is shown, and there is a
way round. It would be medium if the declined-request path had no way
round that spares the reviewer an email, or if an assistant role with
review-stage access were a common setup.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS (the journal
  `publicknowledge`) or OMP (the press `publicknowledge`). A preprint
  server has no review.
- Nothing else is needed for the first group. The second group gives
  the copyeditor `svogt` the Funding coordinator role in steps 1 to 4.

A declined request (A30):

1. Sign in as the reviewer `jjanssen` (password `jjanssenjjanssen`).
2. Open the review request of submission 12, "Sodium butyrate improves
   growth performance of weaned piglets during the first period after
   weaning" (`/index.php/publicknowledge/en/reviewer/submission/12`). On
   a press, use submission 17, "Open Development: Networked Innovations
   in International Development".
3. Press "Decline Review Request", then "Decline Review Request" in the
   window.
4. Sign out and sign in as the editor `dbarnes` (`dbarnesdbarnes`).
5. Open the same submission. In "Reviewers", the row "Julie Janssen"
   reads "Request Declined".
6. Press the row's "More Actions" and choose "Review Details".
7. Press "Modify Review", then "Modify Review" in "Modify this review?".
8. In "For author and editor" type `u27k9 review recorded for the
   reviewer`. On a journal, also choose "Accept Submission" under
   "Recommendation".
9. Press "Save Changes".

**Expected**: on a declined request, "Modify Review" is disabled beside
a line that says why, as "Mark as Complete" is on a journal ("A
recommendation is required before this review can be marked as
complete."). "Resend Review Request" in the row's menu reopens the
request.

**Observed**: "Modify Review" is enabled (on a journal, "Mark as
Complete" beside it is disabled). The dialog and the window open, and
the window takes the entries. "Save Changes" shows the notice "The form
was not saved because 1 error(s) were encountered. Please correct these
errors and try again." The window stays open with "Please correct one
error. Go to error: This review not editable because it was declined."
The save is answered:

```
PUT /index.php/publicknowledge/api/v1/submissions/12/reviewAssignments/17/review

422 {"error":"This review not editable because it was declined."}
```

"Cancel" then asks "The data on this form has changed. Do you wish to
continue without saving?". The row still reads "Request Declined", and
nothing was stored.

An assistant (A31):

1. Sign in as `admin` (`admin`). Open Administration, "Hosted Journals"
   ("Hosted Presses" on a press), and the context's "Settings wizard".
2. On the "Users" tab search `svogt`, choose "Edit User" on Sarah Vogt,
   tick "Funding coordinator" and press "OK".
3. Sign out and sign in as `dbarnes`. Open submission 7, "Developing
   efficacy beliefs in the classroom". On a press, use submission 16,
   "A Designer's Log: Case Studies in Instructional Design".
4. Under "Participants" press "Assign", choose "Funding coordinator",
   press "Search", pick Sarah Vogt and press "OK".
5. Sign out and sign in as `svogt` (`svogtsvogt`). Open the same
   submission.
6. In "Reviewers", press "Read Review" on the row "Paul Hudson" ("Adela
   Gallego" on a press), which reads "Review Submitted".
7. Press "Modify Review", then "Modify Review" in "Modify this review?".
8. In "For author and editor" type `u27k9 assistant edit`.
9. Press "Save Changes".

**Expected**: no "Modify Review" for a Funding coordinator. The rating
stars and "Mark as Complete", which they may use, stay.

**Observed**: "Modify Review" and "Mark as Complete" are both enabled.
The dialog and the window open, and the window takes the entries. "Save
Changes" opens a dialog "Error" with "The current role does not have
access to this operation." and "OK". The save is answered:

```
PUT /index.php/publicknowledge/api/v1/submissions/7/reviewAssignments/10/review

401 {"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}
```

After "OK" the window stays open. "Cancel" asks the same "The data on
this form has changed…" warning, and the review is unchanged.

## Cause

The window's "Modify Review" button checks nothing the server checks.
In ui-library, `ReviewDetailsModal.vue` (`src/managers/ReviewerManager/`)
renders it as `<PkpButton :is-disabled="isLoadingReview"
@click="editReview">`, so it is enabled for everyone who can open the
window, on every request, as soon as the review has loaded.
`useReviewDetails.js`, which builds the window's state, has no rule for
it either.

The save goes to `PUT submissions/{id}/reviewAssignments/{id}/review`
(`ReviewAssignmentController::editReview()` in
`lib/pkp/api/v1/submissions/reviewAssignments/`), which refuses in two
places:

- `EditReview::prepareForValidation()` (the form request) answers 422
  for a cancelled or a declined assignment
  (`api.submissions.reviews.422.reviewNotEditable.*`). The window shows
  that answer as an error of the form.
- `getGroupRoutes()` admits to this route only users whose roles in the
  context include manager, section editor or site administrator; the
  controller's other routes (reading the assignment and its review, the
  rating, "Mark as Complete") also admit `ROLE_ID_ASSISTANT`. Then
  `canAccessReviewAssignment()` lets every manager and site
  administrator through, assigned or not, and a section editor only
  when they are assigned to the assignment's stage in a section-editor
  group. An assistant is answered 401 before the controller runs.

The declined and cancelled states reach the window: the assignment it
loads carries `declined` and `cancelled`. The role rule does not. The
role data the page has cannot rebuild it exactly:

- `stages[].currentUserAssignedRoles` on the submission lists the roles
  of the user's assignments in each stage, and falls back to the
  context's manager and administrator roles only for a user assigned in
  no role and not reviewing the submission.
- `pkp.currentUser.roles` lists the user's roles in every context they
  belong to, not only this one.

Reach:

- The same window opens from the submissions dashboard's review
  indicators ("View details", "View recommendation", "View unread
  recommendation"). It is the same component with the same fault.
- A cancelled request is refused the same way on the server. The
  Reviewers table offers no "Review Details" on a cancelled row
  (`getItemActions()` in `useReviewerManagerConfig.js`), so it is not
  reached from there (code).
- Assistants: in the Reviewers table, saving a modified review is the
  only operation offered to them that the server refuses. The legacy
  reviewer grid (`PKPReviewerGridHandler`) gives `ROLE_ID_ASSISTANT`
  every operation except creating or enrolling a reviewer and the
  editorial notes, and "Editorial Notes" is hidden from them already
  (`canGossip`). The stars and "Mark as Complete" save for them (code,
  and on screen as the Funding coordinator).

## Proposed fix

Let the server say whether the current user may modify reviews, in a
flag beside `canLoginAs` and `canGossip` on the submission's review
assignments, and let the window follow that flag and the assignment's
state. Unlike those two, which are computed inline in the map, the rule
goes into a repository method so the controller can share it:

- pkp-lib: a `canEditReview()` method on the review assignment
  repository holds the route's rule: a manager of the context or a site
  administrator, or a user with a section editor role in the context who
  is assigned to the submission in a section-editor group that covers
  the assignment's stage. `ReviewAssignmentController::editReview()`
  uses it in place of its `canAccessReviewAssignment()` call. The
  submission's `reviewAssignments` gain a `canEditReview` flag from it
  (map and `schemas/submission.json`, described as "Whether the current
  user may modify reviews in this assignment's stage. A declined or
  cancelled assignment is still refused."). The single assignment
  (`GET …/reviewAssignments/{id}`) does not carry the flag, so the
  window reads it from the submission's list, the object it is opened
  with; another opener that passed the single assignment would lose the
  button.
- ui-library: `useReviewDetails.js` shows "Modify Review" only when the
  flag is set, and disables it on a declined or cancelled request,
  beside the message the Reviewers table already uses on that row ("The
  reviewer declined this review request." / "The editor cancelled this
  review request."), the same way "Mark as Complete" sits disabled
  beside `confirmBlockedMessage`. The Storybook mock of a review
  assignment (`src/mockFactories/reviewAssignmentsMock.js`) gains
  `canEditReview: true`, so the Review Details stories keep the button.

The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/fix.diff)
(pkp-lib and ui-library, 68 lines added and 2 removed). An excerpt; the
file has every line:

```diff
--- a/lib/pkp/classes/submission/reviewAssignment/Repository.php
+++ b/lib/pkp/classes/submission/reviewAssignment/Repository.php
+    public function canEditReview(ReviewAssignment $reviewAssignment, int $userId, array $contextRoleIds): bool
+    {
+        if (array_intersect([Role::ROLE_ID_MANAGER, Role::ROLE_ID_SITE_ADMIN], $contextRoleIds)) {
+            return true;
+        }
+
+        return in_array(Role::ROLE_ID_SUB_EDITOR, $contextRoleIds)
+            && StageAssignment::withSubmissionIds([$reviewAssignment->getSubmissionId()])
+                ->withStageIds([$reviewAssignment->getStageId()])
+                ->withRoleIds([Role::ROLE_ID_SUB_EDITOR])
+                ->withUserId($userId)
+                ->exists();
+    }
--- a/lib/pkp/api/v1/submissions/reviewAssignments/ReviewAssignmentController.php
+++ b/lib/pkp/api/v1/submissions/reviewAssignments/ReviewAssignmentController.php
-        if (!$this->canAccessReviewAssignment($submission, $reviewAssignment, [Role::ROLE_ID_SUB_EDITOR])) {
+        $userRoles = (array) $this->getAuthorizedContextObject(Application::ASSOC_TYPE_USER_ROLES);
+        if (!Repo::reviewAssignment()->canEditReview($reviewAssignment, $user->getId(), $userRoles)) {
--- a/lib/pkp/classes/submission/maps/Schema.php
+++ b/lib/pkp/classes/submission/maps/Schema.php
+                'canEditReview' => Repo::reviewAssignment()->canEditReview($reviewAssignment, $currentUser->getId(), $this->userRoles),
--- a/lib/ui-library/src/managers/ReviewerManager/useReviewDetails.js
+++ b/lib/ui-library/src/managers/ReviewerManager/useReviewDetails.js
+	const canModifyReview = computed(() => !!reviewAssignment.canEditReview);
+
+	// A declined or cancelled request cannot be modified (EditReview) until it is sent again
+	const modifyBlockedMessage = computed(() => {
+		if (isLoadingReview.value) {
+			return null;
+		}
+
+		if (reviewAssignmentRef.value?.declined) {
+			return t('editor.review.requestDeclined.tooltip');
+		}
+
+		return reviewAssignmentRef.value?.cancelled
+			? t('editor.review.requestCancelled.tooltip')
+			: null;
+	});
--- a/lib/ui-library/src/managers/ReviewerManager/ReviewDetailsModal.vue
+++ b/lib/ui-library/src/managers/ReviewerManager/ReviewDetailsModal.vue
+				<p
+					v-if="canModifyReview && modifyBlockedMessage"
+					class="mb-4 text-end text-lg-normal text-secondary"
+				>
+					{{ modifyBlockedMessage }}
+				</p>
-					<PkpButton :is-disabled="isLoadingReview" @click="editReview">
+					<PkpButton
+						v-if="canModifyReview"
+						:is-disabled="isLoadingReview || !!modifyBlockedMessage"
+						@click="editReview"
+					>
```

Tried on `main`, OJS and OMP:

- With the fix, the declined row's "Modify Review" sits disabled under
  "The reviewer declined this review request.". The Funding
  coordinator's window has no "Modify Review" and keeps "Mark as
  Complete", whether it is opened from the workflow or from the
  dashboard's "View recommendation".
- With the fix and without it, `dbarnes` gets "Modify Review" enabled
  from the workflow and from the dashboard, and so does the assigned
  Section editor `dbuskins` on the journal. After "Resend Review
  Request" the declined request's save goes through (200, the row
  "Review Submitted").
- A Production editor assigned to the submission cannot open its review
  round at all ("You don't currently have access to that stage of the
  workflow."), with the fix and without it. The dashboard shows review
  indicators only while the submission is in a review stage
  (`useDashboardConfigEditorialActivity.js`), and "Assign" offers only
  the groups that cover the current stage, so a Production editor meets
  them only on a submission sent back to review after they were
  assigned (unverified).

**Alternatives**

- The same check in ui-library alone
  ([fix-client-side.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/fix-client-side.diff),
  tried on `main`, OJS and OMP: the declined row's button disabled, the
  Funding coordinator's gone, the editor's and an assigned Section
  editor's kept). It reads `stages[].currentUserAssignedRoles` for the
  assignment's stage, so it hides the button from people the server
  lets save:
  - a Production editor assigned to the submission (a manager-level
    group whose default stages are copyediting and production);
  - any manager or administrator assigned to the submission only in
    groups that do not cover the review stage;
  - a manager or administrator who is also an active reviewer of the
    submission.
- A client-side check on `pkp.currentUser.roles` (manager or
  administrator by role, section editor by stage assignment), as
  `canCurrentUserEditParticipant()` does: that list spans every context
  the user belongs to, so a manager of another journal would be shown
  the button and refused.
- A message that also names the way forward ("…Resend the request to
  modify the review."): clearer, at the cost of a new locale key.
- Letting the save through on a declined request, as on an unanswered
  one (`pkp/pkp-lib#13337`): a product decision; `EditReview` refuses
  declined requests on purpose.

**What goes with it**

- The REST API: `reviewAssignments` items in a submission gain one
  read-only boolean; nothing existing changes. `editReview()` refuses
  the same people as before.
- Cost: for a section editor, one `exists()` query per review
  assignment when a submission is mapped (managers and administrators
  return before the query), so a dashboard page of many submissions runs
  many. As an option, the map can answer it in memory: it already holds
  the submission's stage assignments, and `$stages[$stageId]
  ['currentUserAssignedRoles']` lists `ROLE_ID_SUB_EDITOR` exactly when
  the user is assigned in a section-editor group covering that stage
  (it also honours the dates of the user's group membership, which the
  query does not). The cost is a second copy of the rule.
- Plugins that call the window's composable get two more returned
  values. No data repair.
- Guard: pkp-lib has no test home for the review assignment
  repository; a `DatabaseTestCase` under
  `tests/classes/submission/reviewAssignment/` with stage-assignment
  fixtures would cover `canEditReview()` (an unassigned manager, a
  Production editor, a section editor assigned in and out of the
  review stage, an assistant). Without it, a **Planned** e2e scenario in
  spec U27: the Funding coordinator's window without "Modify Review",
  the declined row's disabled button and its line, and the editor's
  enabled one.

Medium: two repositories, pkp-lib (a repository method, its use in the
controller, a new flag in the submission map and schema) and ui-library
(two files and the Storybook mock), with an additive API field and its
unit test.

## Evidence

- The script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/modify-review-offered-then-refused/lib.js))
  takes both groups of steps on OJS and OMP, then opens the Funding
  coordinator's window again from the dashboard. With `MODE=nb` it takes
  the cases the fix must leave alone: `dbarnes` on the submitted review
  from the workflow and from the dashboard, the assigned Section editor
  `dbuskins` (OJS), a Production editor assigned to OJS submission 5 /
  OMP submission 4, and the declined request re-sent and saved. Each
  run starts from an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/modify-review-offered-then-refused/walk.js`.
- Database: PostgreSQL. Datasets: pkp/datasets e8dafbc (2026-10-02).
- Branch tips. `main`: OJS ff004d0973, OMP 3b0ecf794; pkp-lib
  987776cd04 (OJS) and 3dc90c81a6 (OMP); ui-library 64d67363 (OJS) and
  280f98c5 (OMP). Every file the fix touches is identical in the two
  apps' trees. 3.5: OJS c1cee76b95, OMP 9c5e24246; pkp-lib 771474347e
  (OJS) and cf3f984335 (OMP); ui-library d4e01883. 3.4: OJS
  d68934d0d1, OMP 0aec65441, pkp-lib 767353f4fe. 3.3: OJS ac77c9fb35,
  OMP 8e72fc883, pkp-lib ac3fa73402.
- 3.5, walked on OJS and OMP. Both groups of steps were taken. "Review
  Details" on the declined row and "Read Review" for the Funding
  coordinator open the older window ("Review Details: …" or "Review:
  …") with "Cancel" and "Confirm" and no "Modify Review". In the code,
  3.5's ui-library has no `ReviewDetailsModal.vue`, and its pkp-lib has
  no `reviewAssignments` API.
- 3.4 and 3.3 (code): the reviewer grid's "Read Review"
  (`PKPReviewerGridHandler::readReview`, `ReviewerGridRow`) offers no
  way to modify the review. Their "editReview" operation is the row's
  "Edit" (due dates, review method and files, `EditReviewForm`).
- Introduced: `git blame` on the button's line in
  `ReviewDetailsModal.vue` gives 30beb5e3, the commit that created the
  file. The server's refusals came earlier with the API the window was
  built on,
  [b5c86a8cb7](https://github.com/pkp/pkp-lib/commit/b5c86a8cb74d5f3c3a910f58e9e1e62cd659181f)
  (`pkp/pkp-lib#13176` for `pkp/pkp-lib#13117`, 2026-08-18).
- Resending a declined request: `ResendRequestReviewerForm::execute()`
  clears `declined`, sets the new due dates and logs it;
  `PKPReviewerGridHandler::updateResendRequestReviewer()` then sends
  `ReviewerResendRequest` unless "Do not send email to Reviewer." is
  ticked (code; the walk resent with the email).
- Upstream: `pkp/pkp-lib#13110` (open, the editable-reviews epic) and
  `pkp/pkp-lib#13156` describe the feature as the editor's; neither
  mentions declined requests or assistants.
- Not walked: a cancelled request, a Guest editor, a manager who is
  also a reviewer of the submission, and the fix on 3.5 (3.5 has no
  such window).
