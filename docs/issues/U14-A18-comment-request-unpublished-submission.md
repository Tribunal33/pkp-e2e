# Any signed-in account can comment on unpublished submissions by hand and learn their title and first author

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (no reader comments)
  - 3.4: none (code; no reader comments)
  - 3.3: none (code; no reader comments)
- **Introduced** `pkp/pkp-lib#11410` for `pkp/pkp-lib#11326` · [3aa127313b](https://github.com/pkp/pkp-lib/commit/3aa127313b5366cd01deddb48a096164d8d12484) · 2025-06-18 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U14 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U14-reader-comments-and-moderation.md#a18)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The article page's comment box sends a request that names its target by
a publication id, a number the site gives out in sequence. The page
offers the box only on a published article's latest version, and only
while "Enable Public Comments" is ticked; the server checks neither.
Typed into the browser's console by any signed-in account, the request
is accepted for a submission not yet published, in any stage, and with
comments switched off. The comment is kept, waiting for approval, and
the answer names the submission's full title and its first author's
family name.

So by trying the numbers in turn, any account can read the title and
first author of every submission in the workflow. That includes a Reader
with no part in the submission, and a reviewer under "Anonymous
Reviewer/Anonymous Author" review, who learns the author the review
hides. The journal can see it happen: each request leaves a pending
comment, under the account's name, and a task for each manager.

## Impact

- **Lost**: the title and first author of unpublished submissions, to
  anyone with an account. A reviewer learns the identity of the author
  they review anonymously.
- **Who**: any signed-in account of the site, with or without a role in
  the journal. Setting "User Registration" to "The Journal Manager will
  register all user accounts." stops visitors registering with this
  journal. Every existing account (authors, reviewers, readers) can
  still do it, and so can an account registered with another journal on
  the same site.
- **Way round**: nothing prevents it. A manager who notices the pending
  comments can delete them and disable the account, but what the answers
  revealed stays revealed.

Medium: review itself still works, the breach takes a deliberate typed
request, and every probe leaves a comment and a task in front of the
managers. That falls short of high, which needs a core task to fail with
no way round. It would be high if it left no trace or reached the
manuscript.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
- Submission 4, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice", is in the Submission
  stage. Its current version is publication 5.
- Submission 10, "Condensing Water Availability Models to Focus on
  Specific Water Management Systems", is in review (publication 11).
  `amccrae` (Aisla McCrae) has completed a review of it. The dataset
  stores that review's method as "Anonymous Reviewer/Anonymous Author"
  (`review_method` 2).
- Submission 17 is published (publication 18). Submission 1's
  unpublished version 1.1 is publication 2.
- `ccorino` (Carlo Corino) is an Author and Reader of the journal with
  no part in submissions 1, 4, 10 or 17.
- Publication ids are not shown on screen. The ones here are the
  dataset's.

The request is the one the article page's comment box sends
(`POST …/api/v1/comments`). Paste this into the browser console on a
signed-in page of the journal:

```js
const comment = (publicationId, commentText) => fetch(pkp.context.apiBaseUrl + 'comments', {
  method: 'POST',
  headers: {'Content-Type': 'application/json', 'X-Csrf-Token': pkp.currentUser.csrfToken},
  body: JSON.stringify({publicationId, commentText}),
}).then(async (r) => [r.status, await r.json()]);
```

Steps:

1. Sign in as `dbarnes`. Settings › Website › "Content" › "Comments":
   "Enable Public Comments" is unticked. Leave it so.
2. Sign in as `ccorino`. Open "My Submissions"
   (`/index.php/publicknowledge/en/dashboard/mySubmissions`) and paste
   the snippet.
3. `await comment(5, 'h15g comment on a submission not published')`
4. `await comment(18, 'h15g comment with comments off')`
5. Sign in as `amccrae`. Open the review of submission 10
   (`/index.php/publicknowledge/en/reviewer/submission/10`). The page
   names no author. Paste the snippet on this page.
6. `await comment(11, 'h15g comment by the anonymous reviewer')`
7. Sign in as `ccorino` again, open "My Submissions", paste the snippet,
   and run `await comment(2, 'h15g control')`. The `2` is publication 2,
   submission 1's unpublished version 1.1, not a submission number.
8. Sign in as `dbarnes` and open the Comments page by its address,
   `/index.php/publicknowledge/en/management/settings/userComments`. The
   Content menu offers it only while comments are on.

[OMP: `aclark` takes `ccorino`'s place in step 2; submission 3, "The
Political Economy of Workplace Injury in Canada" (publication 3,
Submission stage); published submission 14 (publication 14); reviewer
`agallego` on submission 16, "A Designer's Log: Case Studies in
Instructional Design" (publication 16, external review, also
`review_method` 2); no step 7, since no submission there has two
versions. OPS: `ckwantes` takes `ccorino`'s place in steps 2 and 7;
submission 1, "The influence of lactation on the quantity and quality
of cashmere production" (publication 1, Production stage, not posted);
posted submission 17 (publication 18); no reviewers, so no steps 5 and
6; step 7 on publication 3, submission 3's first version.]

**Expected:** steps 3, 4 and 6 are refused as step 7 is, and no comment
is kept.

**Observed:** steps 3, 4 and 6 answer `200` and the comment is kept,
unapproved. Step 3's answer, in part:

```json
{
  "id": 1,
  "contextId": 1,
  "isApproved": false,
  "publicationId": 5,
  "publication": {
    "authorsStringShort": "Montgomerie et al.",
    "id": 5,
    "submissionId": 4,
    "fullTitle": "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice"
  }
}
```

Step 6's answer names the author the review page hides:
`"publication": {"authorsStringShort": "Novak", "id": 11,
"submissionId": 10, "fullTitle": "Condensing Water Availability Models
to Focus on Specific Water Management Systems"}`. Step 7 answers `422`
`{"publicationId":["You are only allowed to comment on the most recently published publication."]}`.
In step 8, the Comments page lists the three comments as "Hidden/Needs
Approval", for example "4. Montgomerie et al. ; Computer Skill
Requirements for New and Existing Teachers: Implications for Policy and
Practice — h15g comment on a submission not published — Carlo Corino".
`admin`, `rvaca` and `dbarnes` each got one task per comment, nine in
all.

OMP and OPS answer the same way: "Barnetson", "Dawson et al." and
"Power" on the press, "Corino" and "Karbasizaed" on the server. On the
server, step 7 answers `422` too.

## Cause

`PKP\API\v1\comments\formRequests\AddComment` validates `POST comments`
([AddComment.php#L30-L70](https://github.com/pkp/pkp-lib/blob/b17fadae59/api/v1/comments/formRequests/AddComment.php#L30-L70)).
`rules()` asks only that the publication exists somewhere on the site
(`Rule::exists('publications', 'publication_id')`). `after()` asks only
that it is its submission's current publication:

```php
if (!$submission || $submission->getCurrentPublication()->getId() !== $publicationId) {
    $validator->errors()->add('publicationId', __('api.userComments.400.cannotCommentOnPublicationVersion'));
}
```

`getCurrentPublication()` only reads the submission's stored
`currentPublicationId`. The submission repository sets that value on
each update, in its protected `getCurrentPublicationIdByPublications()`
([Repository.php#L1503](https://github.com/pkp/pkp-lib/blob/b17fadae59/classes/submission/Repository.php#L1503)).
It is the latest published version or, while none is published, the
latest version. So every unpublished submission's latest version passes.

The check's message states the intended rule ("You are only allowed to
comment on the most recently published publication"), but nothing checks
that the publication is published. Nothing checks either that it belongs
to the request's journal, or that the journal has `enablePublicComments`
on.

`UserCommentController::submit()` sits in the `has.user` group with no
role check. `UserRolesRequiredPolicy` permits an account with no role in
the journal, so any signed-in account of the site reaches it. It creates
the comment under the request's journal and gives each manager a task
(`notifyModerators()`). It answers with `UserCommentResource`, whose
`publication` block holds `fullTitle` and `authorsStringShort` for the
Comments page's "Submission" column. That block was added in
[1869f217fd](https://github.com/pkp/pkp-lib/commit/1869f217fda0b6f3ce5c86445b181516ce89e552)
(`pkp/pkp-lib#11576`). Before it, the comment was accepted the same way
without the answer naming the submission.

The rule is kept only on the page. `ArticleHandler::view()` renders the
comments only when `enablePublicComments` is on. `UserCommentComponent`
hands the page the published versions alone, and the page's store
(`usePkpCommentsStore.addComment()`) posts only for the latest one.

Reach:

- Every submission not yet published, whatever its stage or decision:
  `after()` reads no status. Walked in the Submission, Review and
  Production stages. Declined and scheduled submissions were checked in
  the code.
- Published articles while comments are off: walked on all three apps.
- Another journal's publication on the same site: the existence check is
  site-wide and `after()` compares no journal, so it is accepted too and
  filed under the requesting journal. Checked in the code, since the
  dataset has one journal.
- OMP and OPS: the same lib/pkp classes. No page there writes comments,
  so every comment on a press or a server comes from a typed request.
  Walked.
- `submitReport()` (`POST comments/{id}/reports`) also skips the
  `enablePublicComments` check. It acts only on an approved comment and
  reveals nothing about an unpublished submission. Left out (see
  Proposed fix).

## Proposed fix

Make `AddComment::after()` enforce the rule its message states: the
publication belongs to a submission of the request's journal, and it is
that submission's current, published version. Then have `submit()` refuse
while the journal has public comments off. Both changes are in lib/pkp
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comment-request-unpublished-submission/fix.diff),
against the app root):

```diff
--- a/lib/pkp/api/v1/comments/formRequests/AddComment.php
+++ b/lib/pkp/api/v1/comments/formRequests/AddComment.php
                     $submission = Repo::submission()->get((int)$submissionId);
+                    $context = Application::get()->getRequest()->getContext();
 
-                    if (!$submission || $submission->getCurrentPublication()->getId() !== $publicationId) {
+                    // The publication must belong to this context's submissions
+                    if (!$submission || $submission->getData('contextId') !== $context->getId()) {
+                        $validator->errors()->add('publicationId', __('api.404.resourceNotFound'));
+                        return;
+                    }
+
+                    // Readers comment only on the most recently published version, as the article page offers
+                    if ($submission->getCurrentPublication()->getId() !== $publicationId
+                        || $publication->getData('status') !== PKPPublication::STATUS_PUBLISHED
+                    ) {
                         $validator->errors()->add('publicationId', __('api.userComments.400.cannotCommentOnPublicationVersion'));
                     }
--- a/lib/pkp/api/v1/comments/UserCommentController.php
+++ b/lib/pkp/api/v1/comments/UserCommentController.php
         $currentUser = $request->getUser();
+
+        // Comments are written only while the context has public comments on
+        if (!$context->getData('enablePublicComments')) {
+            return response()->json([
+                'error' => __('api.403.unauthorized'),
+            ], Response::HTTP_FORBIDDEN);
+        }
+
         $requestBody = $illuminateRequest->validated();
```

The diff also adds `use APP\core\Application;` and
`use PKP\publication\PKPPublication;`. The publication checks stay in the
form request that already validates the publication. The journal check
follows the controllers' own pattern
(`$submission->getData('contextId') !== $context->getId()` in
`PKPSubmissionController` and `PKPReviewController`). A publication of
another journal gets the `api.404.resourceNotFound` message inside a
`422`, as the existing `exists` rule answers for one that does not
exist.

The form request validates before `submit()` runs. So with comments off,
a target the rule refuses answers `422`, and only a valid target reaches
the `403`. Either way the comment is refused; only the message differs.
The setting check stays in `submit()` rather than in
`AddComment::authorize()`, for two reasons:

- No form request in pkp-lib uses `authorize()`.
- A `false` there throws Laravel's `AuthorizationException`, whose code
  is 0, so `PKPExceptionHandler::render()` would answer `500`. The API
  would need a `failedAuthorization()` override to return a JSON `403`,
  as `failedValidation()` does for the `422`.

Tried on all three apps, with comments off: steps 3 and 6 answer `422`
with the message of step 7, step 4 answers `403`, and no comment or task
is created. With comments switched on, the comment box on the article
page and the same request on the published version still answer `200`,
with the fix and without it.

- **Alternatives**: taking `publication` out of the answer for
  non-moderators hides the title and author, but still lets the comment
  and its tasks in. The landing page does not read the block; the
  Comments page does. Checking everything in `submit()` would split the
  publication rules between two classes.
- **What goes with it**: there is no stored data to repair, since no
  release has comments. Comments already written this way stay on the
  Comments page for the moderators to delete. `submitReport()` could
  take the same setting check; that is left to the team, since it
  reveals nothing. `pkp/pkp-lib#12972` (open) adds journal checks to the
  comment routes that take a comment number, and this fix could ride
  with it. A feature test in pkp-lib would guard it: `POST comments` as a
  Reader on an unpublished version (`422`), with comments off (`403`),
  and on the latest published version with comments on (`200`).

Small: two checks in two pkp-lib files, following patterns beside them,
and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/comment-request-unpublished-submission/walk.js)
  (helpers in `lib.js` beside it) takes steps 1 to 8 on installs loaded
  from the default dataset (pkp/datasets `7912e09`, 2026-10-14, the
  `pgsql` dumps; the walks ran on PostgreSQL):
  `node bin/probe.js all shared/playwright/checks/issues/comment-request-unpublished-submission/walk.js`.
  Its `neighbour` mode is the comments-on check: it ticks "Enable Public
  Comments", comments through the article page's box (OJS), and sends
  the request on the published and the unpublished version
  (`node bin/probe.js all …/walk.js neighbour`).
  - The steps were walked once with `fix.diff` applied to the three
    checkouts.
  - The `neighbour` mode ran once with the fix and once without it.
  - No server error and no script error in any run.
- Tips on `main`: OJS `378eced941`, OMP `f4836d4fb`, OPS `2ece50497f`,
  all three with lib/pkp `b17fadae59` and lib/ui-library `47b565cb`.
- 3.5 walked: the same script on the `stable-3_5_0` installs of the
  three apps (lib/pkp `4045d9241e`) finds no "Content" tab under
  Settings › Website, and the request answers `404`
  `{"error":"api.404.endpointNotFound"}`. lib/pkp on `stable-3_5_0`,
  `stable-3_4_0` (`55c8e406b3`) and `stable-3_3_0` (`5e84acd11b`) holds
  no `api/v1/comments` and no `userComment` classes, and its log carries
  no `pkp/pkp-lib#11326`.
- Code reads beyond the Cause's classes: `UserRolesRequiredPolicy`,
  `PKPExceptionHandler::render()`, `PKPUserAccessForm` ("User
  Registration") and `RegistrationHandler::validate()`, and ui-library's
  `pages/userComments` (the only reader of `publication`).
- Introduced: `git blame` on `AddComment::rules()` and `after()` gives
  `3aa127313b`, unchanged since.
- Upstream search 2026-10-15 (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library):
  - Searched for "AddComment", "cannotCommentOnPublicationVersion",
    "enablePublicComments" and "UserCommentController submit", and for
    user words about comments on unpublished submissions, comments
    switched off and anonymous review.
  - Found `pkp/pkp-lib#12972` (open; journal checks on the comment-number
    routes, not on `POST comments`) and `pkp/pkp-lib#11776` (open;
    comments on the press and server front ends). Neither is this fault.
- Unverified: the "User Registration" setting's effect and an account
  from another journal were read in the code, not walked.
