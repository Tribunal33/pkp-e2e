# A Section Editor can delete, and another journal's manager delete or rewrite, an author's response to reviews

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS; OMP too, but a press's screens never create a response, so a press has none to lose
  - 3.5: none (code; no author responses)
  - 3.4: none (code; no author responses)
  - 3.3: none (code; no author responses)
- **Introduced** `pkp/pkp-lib#12207` for `pkp/pkp-lib#12048` · [3dff6a7b6e](https://github.com/pkp/pkp-lib/commit/3dff6a7b6e1a51e40849562ee24a5a16b3824be4) · 2026-01-23 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U30 [A11](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U30-author-response-to-reviews.md#a11)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An author's response to the reviews can be removed or rewritten by
editors outside the submission and journal they work in. The delete and
edit requests name a submission and a review round, and the journal
checks only the submission. So, through a submission they may act on:

- a Section Editor can delete the response on any other submission's
  round, in their journal or, by the same route, in the site's other
  journals; they cannot rewrite it;
- a Journal Manager can delete the response on a round of another
  journal on the same site, or rewrite its text and the contributors it
  is attributed to.

The response is gone or changed, and nobody is told. Nothing on screen
offers this; it takes requests typed into the browser's console.

## Impact

- **Lost**: the author's written response to the reviewers, with no copy
  kept. A rewritten one still reads "A response was submitted by" the
  author. The same mistake in "Request Response" costs less: the other
  round's author is offered "Submit Response" unasked, and the request
  email goes to the authors of the editor's own submission.
- **Who**: every author whose submission has a response. The editors
  who can do it: any Section Editor or Guest Editor assigned to at least
  one submission, against every round of their journal and (code) of the
  other journals on the site; any Journal Manager against the rounds of
  every other journal on the site. Round and response numbers run in
  sequence across the site, so they are easy to guess.
- **Way round**: after a deletion the author can submit a new response,
  since the round still offers "Submit Response", but only if someone
  notices. A rewritten response looks normal to everyone.

Medium: the loss is silent, but it takes a deliberate act by someone
who already holds an editorial role on the site; it would be high if a
Section Editor could rewrite responses too.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`, freshly loaded (journal
  `publicknowledge`). Submission 13, "Hydrologic Connectivity in the
  Edwards Aquifer between San Marcos Springs and Barton Springs during
  2009 Drought Conditions", is in review with revisions requested (round
  id 10); its author is `lkumiega` (Lise Kumiega, contributor id 22).
  `minoue` (Section editor) is assigned to submission 2, "The influence
  of lactation on the quantity and quality of cashmere production", and
  not to submissions 10 or 13.
- Lise Kumiega's response: as `lkumiega`, open submission 13 from "My
  Submissions". The review stage ends with the card "Author Response"
  ("Respond to Reviews"). Press "Submit Response", type "Our answer to
  the reviewers (u30r1).", tick "Lise Kumiega", press "Submit Response".
  On a freshly loaded dataset the response's id is 1 (the workflow's own
  request `GET …/api/v1/submissions/13` lists it under `reviewRounds`).
- For the other-journal part only, a second journal, since the dataset
  has one: as `admin`, Administration › "Hosted Journals" › "Create
  Journal", name "u30r1 Journal", acronym "U30R1", path `u30r1`, English,
  "Save". In it, Settings › "Users & Roles" › "Invite to a role": search
  `phudson@mailinator.com` (Paul Hudson, a reviewer of `publicknowledge`
  and nothing more), role "Journal manager" from today, "Appear on the
  masthead", "Save And Continue", "Invite user to the role". As
  `phudson`, open the email "You are invited to new roles", follow its
  link and press "Accept And Continue to …". As `phudson`, in "u30r1
  Journal", "New Submission": title "u30r1 placeholder", tick "Yes, my
  submission meets all of these requirements." and "Yes, I agree to have
  my data collected and stored according to the privacy statement.",
  "Begin Submission". The address now ends in `id=21`.

The requests are the ones the "Author Response" table and window send.
Paste this into the browser console on the editorial dashboard of the
journal the user is in (`/index.php/publicknowledge/en/dashboard/editorial`,
or `/index.php/u30r1/en/dashboard/editorial`):

```js
const ar = (method, path, body) => fetch(pkp.context.apiBaseUrl + 'reviews/' + path, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Csrf-Token': pkp.currentUser.csrfToken,
    ...(method === 'POST' ? {} : {'X-Http-Method-Override': method}),
  },
  body: body && JSON.stringify(body),
}).then(async (r) => [r.status, await r.json()]);
```

A Section Editor, through their own submission's address:

1. Sign in as `minoue`, open the editorial dashboard and paste the
   snippet.
2. `await ar('DELETE', '13/10/authorResponse/1')` (submission 13's own
   address).
3. `await ar('PUT', '2/10/authorResponse/1', {authorResponse: {en: '<p>Changed by minoue</p>'}, associatedAuthorIds: [22]})`
4. `await ar('DELETE', '2/10/authorResponse/1')` (submission 2's
   address, submission 13's round).
5. As `dbarnes`, open submission 13: the "Author Response" table.

A manager of another journal:

6. As `lkumiega`, open submission 13 again. Press "Submit Response",
   type "Our second answer (u30r1).", tick "Lise Kumiega", press "Submit
   Response" (response id 2).
7. Sign in as `phudson` and open
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=13`.
8. Open "u30r1 Journal"'s editorial dashboard and paste the snippet.
9. `await ar('PUT', '21/10/authorResponse/2', {authorResponse: {en: '<p>Changed from another journal</p>'}, associatedAuthorIds: [22]})`
10. As `lkumiega`, open submission 13 and press "View Submitted
    Response".
11. As `phudson`, on "u30r1 Journal"'s dashboard:
    `await ar('DELETE', '21/10/authorResponse/2')`.

A request through another submission's address:

12. As `jnovak`, open submission 10, "Condensing Water Availability
    Models to Focus on Specific Water Management Systems" (round id 8,
    both reviews in, no request sent), from "My Submissions".
13. As `minoue`, type
    `/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=8&submissionId=2`.
14. As `minoue`, on the editorial dashboard:
    `await ar('POST', '2/8/authorResponse/requestResponse', {subject: 'Response requested (u30r1)', body: '<p>Please respond to the reviews (u30r1).</p>', locale: 'en', cc: [], bcc: [], attachments: [], recipients: []})`
15. As `jnovak`, open submission 10 again.

**Expected:** the requests of steps 4, 9, 11 and 14 are refused, as
steps 2 and 3 are and as the screens refuse the same people: `minoue`
may not open submission 13 or 10, and `phudson` may not open anything
in `publicknowledge` (step 7).

**Observed:**

- Step 2 answers `401` `{"error":"user.authorization.roleBasedAccessDenied","errorMessage":"The current role does not have access to this operation."}`.
  Step 3 answers `401` `{"error":"You are not authorized to access the requested resource."}`;
  the response is unchanged.
- Step 4 answers `200` `[]`. In step 5 the row reads "Lise Kumiega Ready
  To Invite Author Editor can now request the author's response." with
  no "…" button, and Lise Kumiega's card reads "Respond to Reviews" with
  "Submit Response" again. The response is gone.
- Step 7 shows "The current role does not have access to this
  operation.".
- Step 9 answers `200` with the response, `"response":{"en":"<p>Changed from another journal</p>"}`,
  still `"submittedByUser":{"id":29,"fullName":"Lise Kumiega"}`. In step
  10 the window reads "A review response has been submitted and is
  displayed below. This response cannot be edited by authors. …" over
  "Changed from another journal".
- Step 11 answers `200` `[]`; the response is gone again.
- Step 12 shows no "Author Response" card. Step 13 shows the
  access-denied page "Invalid review round.". Step 14 answers `200` `[]`.
  In step 15 the stage ends with the card "Author Response", "Respond to
  Reviews", with "Submit Response". The email "Response requested (u30r1)" went
  to `ccorino@mailinator.com`, submission 2's author, and nothing to
  `jnovak`.

Control: the same `DELETE` as `phudson` through `publicknowledge`'s own
address (`13/10/authorResponse/2`, from his reviewer dashboard there)
answers `401` "The current role does not have access to this
operation.".

## Cause

The author-response routes of `PKPReviewController`
(`lib/pkp/api/v1/reviews/`) authorize the submission in the address but
then act on the review round in the address, loaded by its id alone,
without checking that the round belongs to that submission.

`PKPReviewController::authorize()` (lines 189-196) adds
`SubmissionAccessPolicy` on `submissionId`: the submission must be in
the request's journal, and a Section Editor must be assigned to it. No
policy covers `reviewRoundId`. The page these routes serve,
`ReviewResponseHandler`, does add `ReviewRoundRequiredPolicy`, which
refuses a round of another submission; that is the "Invalid review
round." of step 13.

The three routes then trust the round:

- `deleteAuthorResponse()` (lines 941-964) loads the round with
  `ReviewRoundDAO::getById()`, checks only that it exists, and deletes
  `AuthorResponse::withReviewRoundIds([$reviewRoundId])->where('response_id', …)`.
- `editAuthorResponse()` takes `EditResponse`. Its rules come from
  `ReviewRoundAuthorResponseCommonValidator::commonRules()`, which checks
  that the round exists (line 38) and the address's submission only with
  `Rule::exists('submissions', 'submission_id')` (line 46).
  `EditResponse::passedValidation()` then admits a Section Editor
  assigned to the round's own submission (sound: step 3's `401`), or
  anyone with `ROLE_ID_MANAGER` in the request's journal (line 79), which
  is the journal of the address, not of the round.
- `requestAuthorResponse()` takes `RequestAuthorResponse`, whose
  `rules()` load the submission within the journal and the round by id
  (line 45) and never compare them. The method then sets
  `isAuthorResponseRequested` on the round (line 932) and mails the
  address's submission's authors.

Reach:

- `submitAuthorResponse()` shares `commonRules()` but is sound:
  `AddResponse::passedValidation()` requires an Author assigned to the
  round's own submission (code).
- A Section Editor's delete reaches a round of another journal too: the
  round is never tied to the journal (code; walked for a manager only).
- OMP routes `api/v1/reviews` to the same controller (walked: the
  delete; Evidence). A press's screens show no "Author Response" table or
  card (spec U30 `OMP1`), so a press holds a response only if an author
  posted one through the API. OPS has no `api/v1/reviews`.
- Of the controller's other routes under a submission, `getHistory`, the
  review exports (`validateReviewExport()`) and `sendToOrcid` look the
  review assignment up within the authorized submission;
  `getExportedFile` reads a temporary file of the current user (code).

## Proposed fix

Refuse a round that does not belong to the authorized submission, in the
three places that already load the round
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-other-submission-round/fix.diff)).
Since `SubmissionAccessPolicy` has tied the address's submission to the
journal, this also keeps the round in the journal:

```diff
@@ PKPReviewController::deleteAuthorResponse()
+        $submission = $this->getAuthorizedContextObject(Application::ASSOC_TYPE_SUBMISSION);
 ...
-        if (!$reviewRound) {
+        // The round must belong to the submission the request was authorized for
+        if (!$reviewRound || (int)$reviewRound->getSubmissionId() !== $submission->getId()) {
@@ ReviewRoundAuthorResponseCommonValidator::commonRules(), the reviewRoundId rule
-                    if (!$this->reviewRound || (int) $this->reviewRound->getId() !== (int) $value) {
+                    if (
+                        !$this->reviewRound
+                        || (int) $this->reviewRound->getId() !== (int) $value
+                        || (int) $this->reviewRound->getSubmissionId() !== (int) $this->route('submissionId')
+                    ) {
@@ RequestAuthorResponse::rules(), the reviewRoundId rule: the same condition
```

This copies the check `PKPSubmissionController` makes for a
publication under a submission, not its answer: that one answers `403`
`api.publications.403.submissionsDidNotMatch`, while this fix keeps each
route's answer for a round that does not exist (`404` for the delete,
`422` with `api.404.resourceNotFound` for the edit and the request).
That answer is the recommended one: it tells a caller nothing about a
round outside the submission, and the screens never meet it, so no new
message is needed. It covers add, edit, request and delete.

Tried on `main`, OJS and OMP. With the fix, the deletes of steps 4 and
11 and OMP's delete (Evidence) answer `404` "The requested resource was not found.", the
edits of steps 3 and 9 and the request of step 14 answer `422`
`{"reviewRoundId":["The requested resource was not found."]}`, and the
response, its text and submission 10's card stay as they were. With
and without the fix, the author's "Submit Response", an assigned
editor's "View" › "Save" and "Delete" on submission 13, and "Request
Response" › "Submit Request" on submission 10 all work through the
screens, and on OMP the same post, edit and delete through submission
16's own address answer `200`.

**Alternatives:**

- `ReviewRoundRequiredPolicy` in `authorize()`, as `ReviewResponseHandler`
  does: the shared rule in one place, but the policy also compares the
  round's stage with an authorized workflow stage, which the API address
  does not carry. Using it would need a stage policy fed from the round
  itself, or a change to the shared policy.
- Checking the round's journal in `EditResponse` only: closes the
  managers' edit, but not the delete or the request.

**What goes with it:** a test that sends the delete, the edit and the
request with a round of another submission, as a Section Editor and as a
manager, and expects them refused, and the same requests with the
submission's own round accepted (spec U30, a **Planned** item). No data
repair; no backport, as no release has the feature.

Small: one condition in three places of one API folder, following an
existing pattern.

## Evidence

- Kept script:
  [`walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-other-submission-round/walk.js)
  with
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/author-response-other-submission-round/lib.js),
  on a fresh load of the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs|omp shared/playwright/checks/issues/author-response-other-submission-round/walk.js`.
  It sends the snippet's requests with `fetch()` from the user's page and
  takes every other step through the screens. `MODE=nb` runs the
  neighbour check; `fix-trial.sh` beside it runs the trial (the neighbour
  without the fix, then the Steps and the neighbour with it, and the
  revert): `FEATURE=<feature> DATASET=<n> AGENT=<id> bash
  shared/playwright/checks/issues/author-response-other-submission-round/fix-trial.sh`.
- The walk read the stored text of each
  response from `review_round_author_response_settings` after each
  request, and the request email from the slot's mail catcher by its
  subject.
- Request shapes: `useAuthorResponseForm.js`,
  `AuthorResponseRequestManagerStore.js` and
  `RequestReviewRoundAuthorResponse.vue` in `lib/ui-library`, through
  `useFetch.js` (PUT and DELETE as POST with `X-Http-Method-Override`).
- OMP, walked as evidence (the press `publicknowledge`): as `dbarnes`,
  the request page by its address,
  `/index.php/publicknowledge/en/reviewResponse/requestAuthorResponse?stageId=3&reviewRoundId=18&submissionId=16`
  (submission 16, "A Designer's Log: Case Studies in Instructional
  Design", External Review), "Submit Request" with the template as it
  stands. As `mpower` on "My Submissions", the snippet's
  `await ar('POST', '16/18/authorResponse', {authorResponse: {en: '<p>Press answer (u30r1).</p>'}, associatedAuthorIds: [49]})`
  (49 is Michael Power's contributor id) answered `200`, response id 1;
  no press screen offers it. As `minoue` (assigned to submission 6),
  `DELETE 16/18/authorResponse/1` answered `401` and `DELETE
  6/18/authorResponse/1` answered `200`; the round's `authorResponse`
  then read `null`. The edit and the request were not walked on OMP
  (same code).
- Not walked: a Section Editor's delete of a round in another journal
  (code); a Guest Editor (the same `ROLE_ID_SUB_EDITOR`).
- 3.5, 3.4, 3.3, code: `lib/pkp/classes/submission/reviewRound/` holds
  no `authorResponse/` and `api/v1/reviews/PKPReviewController.php` has
  no author-response route on `stable-3_5_0` (OJS and OMP checkouts);
  `stable-3_4_0` and `stable-3_3_0` have no `api/v1/reviews` and no
  author-response class.
- Introduced: `git blame` on the lines the Cause names gives
  `3dff6a7b6e` for each; `commits/<sha>/pulls` names `pkp/pkp-lib#12207`.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ui-library; issues
  and PRs, open and closed): the symptom's words and the Cause's class
  and method names; none reports this.
- Branch tips: main OJS `7c6fba2064`, OMP `eb93813147`, lib/pkp
  `f4c2578c94`; `stable-3_5_0` OJS `0c91dcce4e` (lib/pkp `32fcca27bb`),
  OMP `486cbf9eb0` (lib/pkp `8094f06bf5`); `stable-3_4_0` OJS
  `daf0ca971d`, OMP `0aec65441f`, lib/pkp `55c8e406b3`; `stable-3_3_0`
  OJS `d7d9dd14ec`, OMP `8e72fc8836`, lib/pkp `5e84acd11b`. Dataset
  pkp/datasets `384e28b` (2026-10-12). PostgreSQL.
