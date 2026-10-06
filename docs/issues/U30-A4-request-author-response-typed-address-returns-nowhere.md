# "Request Author Response" page opened by its address: "Cancel" and the sent dialog lead to "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP (OPS: no review stage)
  - 3.5: none (no "Request Author Response" page)
  - 3.4: none (code; no author response feature)
  - 3.3: none (code; the same)
- **Introduced** `pkp/ui-library#767` for `pkp/pkp-lib#12048` · [8d29739f](https://github.com/pkp/ui-library/commit/8d29739f60c4f2fd21417a8c68f74e42efed8cbf) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U30 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a4)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor who opens the "Request Author Response" page by its address,
rather than through "Request Response" on the round, has nowhere to go
back to. "Cancel" lands on a page reading only "404 Not Found".
"Submit Request" sends the email, but the sent dialog's only control,
"View Submission", is plain text that does nothing, and closing the
dialog with Escape lands on the same "404 Not Found" page.

The request still goes out, and the editor finds the way back by hand.

Nothing in the app links to the page without the return address, so a
journal editor meets this only from a bookmark or a copied address. A
press has no way to the page from its screens at all, so there too only
someone who has the address reaches it, which is rare. The fix lets the
page fall back to the submission's address it already receives.

## Impact

- **Lost**: nothing. The email is sent; the editor loses a few clicks
  finding the way back.
- **Who**: a Journal Manager, Editor or assigned Section Editor who opens
  the page from a bookmark or a copied address; on a press, only a Press
  Editor who has the page's address, since no screen leads there.
- **Way round**: the page's breadcrumb or the browser's Back button
  before sending; the dashboard after.

Low: only the way back from the page is broken. A screen that linked to
the page without the return address would raise it.

## Steps to reproduce

Preconditions: PKP's default test dataset, OJS `main` and OMP `main`.

Journal, the control (through the round):

1. Sign in as `dbarnes`.
2. Open submission 10, "Condensing Water Availability Models to Focus on
   Specific Water Management Systems", and choose "Review Round 1" in the
   workflow menu. The address ends in `workflowMenuKey=workflow_3_8`, so
   the round's id is 8.
3. Under "Author Response", press "Request Response". The "Request
   Author Response" page opens, its address ending in `&ret=…`.
4. Press "Cancel": the submission's "Review Round 1" opens again.

Journal, by the address:

5. Open `/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=8&submissionId=10`.
   The "Request Author Response" page opens with "John Novak" in "To".
6. Press "Cancel".
7. Open the address you opened (step 5, or step 11 on the press) again, wait for "Message" to fill, and
   press "Submit Request".
8. In the dialog "Request for review response sent", press "View
   Submission".
9. Press Escape.

Press, by the address (a press shows no "Author Response" table, so
there is no control):

10. Sign in as `dbarnes`, open submission 16, "A Designer's Log: Case
    Studies in Instructional Design", and choose "Review Round 1" under
    "External Review": the address ends in `workflow_3_18`.
11. Open `/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=18&submissionId=16`
    ("Michael Power" in "To"), then take steps 6 to 9.

**Expected**: "Cancel" (step 6), "View Submission" (step 8) and Escape
(step 9) each open the submission's workflow, as "Cancel" does in step 4.

**Observed**: "Cancel" goes to `/index.php/publicknowledge/en/reviewResponse/null`,
a blank page reading only "404 Not Found" (`GET …/reviewResponse/null`
answers 404). "Submit Request" sends the email (one "Request For Author
Response To Reviewer Feedback" to the author), and the dialog reads:

```
Request for review response sent
The author of the submission, Condensing Water Availability Models to Focus on Specific Water Management Systems, have been notified and asked to submit their response to the reviewers' comments.
View Submission
```

"View Submission" is an `<a>` without an `href`: pressing it leaves the
dialog open and the address unchanged. Escape closes the dialog and lands
on the same "404 Not Found" page. The press shows the same at each step.

## Cause

`RequestReviewRoundAuthorResponse.vue` (lib/ui-library,
`src/pages/requestReviewRoundAuthorResponse/`) decides where the page
returns to in `getReturnUrlToSubmissionSummary()`, which reads only the
`ret` query parameter and returns `null` without it. Its three callers take
that `null` as an address:

- `cancelResponseRequest()` sets `window.location.href = null`; the
  browser resolves the string "null" against the page's address, giving
  `…/reviewResponse/null`; lib/pkp `pages/reviewResponse/index.php`
  routes only `requestAuthorResponse`, so `ReviewResponseHandler` is never
  loaded and the router answers "404 Not Found".
- The sent dialog's one action is `{element: 'a', href: null}`, an anchor
  without a target, labelled `submission.list.viewSubmission` ("View
  Submission") because `ret` is missing.
- The dialog's `close` sets `window.location = null`: the same 404.

The only link to the page in the app, the editor's "Request Response"
(`AuthorResponseRequestManagerStore::navigateToRequestAuthorReviewResponsePage()`),
always adds `ret`.
The fallback is already on the page: `RequestReviewResponsePage::getConfig()`
(lib/pkp `classes/components/`) sends `submissionUrl`, the submission's
`dashboard/editorial?workflowSubmissionId=…` address, and the component
declares it as a required prop but never reads it. `DecisionPage.vue`
(the decision page), whose `ret` handling this page copies, returns to
`submissionUrl` whenever `ret` is missing, in its cancel, its completed
dialog's link and its close.

Reach:

- OPS: no review stage; the address with `stageId=3` lands on the
  access-denied page "A workflow stage was not specified." (walked).
- A press reaches the page only by its address, since
  `workflowConfigEditorialOMP.js` adds no "Author Response" table (code).
- The other readers of `ret` in ui-library: `DecisionPage.vue` has the
  fallback; `useWorkflowDecisions.js` and the store above only write it
  (code).

## Proposed fix

Fall back to the `submissionUrl` the server already sends, the same
fallback `DecisionPage.vue` uses, in the one component that lacks it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/fix.diff),
against the app root):

```diff
 			actions: [
 				{
 					label: actionLabel,
 					element: 'a',
-					href: getReturnUrlToSubmissionSummary(),
+					href: getReturnUrl(),
 				},
 			],
 			close: () => {
-				window.location = getReturnUrlToSubmissionSummary();
+				window.location = getReturnUrl();
 			},
...
+/**
+ * Get the URL to return to: the page the request was opened from (`ret`),
+ * or the submission's workflow when the page was opened by its address.
+ */
+function getReturnUrl() {
+	return getReturnUrlToSubmissionSummary() || props.submissionUrl;
+}
+
 function cancelResponseRequest() {
-	window.location.href = getReturnUrlToSubmissionSummary();
+	window.location.href = getReturnUrl();
 }
```

`ret` still wins, so the page opened through "Request Response" returns
to the exact view the editor left, as the introducing change intended;
without it, the label stays "View Submission" and now opens the
submission. Tried on OJS and OMP `main`: by the address, "Cancel", "View
Submission" and Escape each open the submission's workflow at its
current round; through "Request Response", "Cancel" and "View Submission
Summary" return to the round the editor left, with and without the fix.

**Alternatives**:

- Build the workflow address in the component from `submissionId` with
  `useUrl()`: it duplicates the address the server already sends.
- Refuse or redirect the page server-side when `ret` is missing: it
  moves a navigation concern into the handler and blocks the only way in
  on a press.
- Hide "Cancel" without `ret`: it strands the editor instead of
  returning them.

**What goes with it**: no API, plugin hook or stored data changes. Not
backported: 3.5 and earlier have no such page. The guard is an e2e
scenario in spec U30 (the page opened by its address: "Cancel", the sent
dialog's link and Escape open the submission), proposed as a Planned
item.

Small: three calls redirected to a prop the page already receives, in one
ui-library file, following `DecisionPage.vue`; no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/lib.js)):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/walk.js`.
  It reads the round id from the address bar after choosing the round in
  the workflow menu, waits for "Message" to fill before "Submit Request",
  and counts the author's mailbox by subject (one email per send).
  `WALK_MODE=neighbour` checks the OJS path through "Request Response"
  (with `ret`): "Cancel", then a send and "View Submission Summary".
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/request-author-response-typed-address-returns-nowhere/fix.diff
  ojs omp` (rebuilds the JavaScript), the dataset reloaded, the walk on
  OJS and OMP and the `ret` path on OJS, then `revert` and the `ret` path
  again without the fix. With the fix, "View Submission" links to
  `…/dashboard/editorial?workflowSubmissionId=10` (16 on the press).
- Tips walked: `main` OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e) and OMP 9c5e24246c (lib/pkp cf3f984335), lib/ui-library
  d4e01883. Dataset: pkp/datasets 566bb1f (2026-10-03), PostgreSQL.
- 3.5, walked on OJS and OMP: the round shows no "Author Response" table,
  and the address of step 5 (step 11 on the press) answers "404 Not
  Found" because the page does not exist; lib/pkp `stable-3_5_0` has no
  `pages/reviewResponse/` and lib/ui-library no
  `requestReviewRoundAuthorResponse` page; no commit for
  `pkp/pkp-lib#12048` on either branch.
- 3.4 and 3.3 (code; lib/pkp 767353f4fe and ac3fa73402, lib/ui-library
  ee684b34 and 96959f9e): no `pages/reviewResponse/` and no request page.
- OPS `main`, walked: as `dbarnes` (Preprint Server manager), the address
  with `stageId=3&reviewRoundId=1&submissionId=1` lands on
  `user/authorizationDenied?message=user.authorization.workflowStageRequired`.
- Introduced: `git blame` on `getReturnUrlToSubmissionSummary()` and its
  three callers gives 8d29739f, the commit that created the page
  (`pkp/ui-library#767`, merged 2026-01-23). `submissionUrl` has been in
  `RequestReviewResponsePage::getConfig()` since the matching pkp-lib PR,
  `pkp/pkp-lib#12207`.
- Upstream: pkp/pkp-lib, pkp/ui-library, pkp/ojs and pkp/omp searched
  for "Request Author Response" with cancel, 404 and "View Submission",
  and for `requestAuthorResponse`, `RequestReviewRoundAuthorResponse` and
  `getReturnUrlToSubmissionSummary`; `pkp/pkp-lib#13206` (the page
  without an email form) and `pkp/pkp-lib#12307` (when "Request Response"
  is enabled) are other faults of the same page.
- Not driven: the page as Site Administrator or an assigned Section
  Editor (the handler admits manager, site administrator and sub-editor);
  a send with CC, BCC or an attachment.
