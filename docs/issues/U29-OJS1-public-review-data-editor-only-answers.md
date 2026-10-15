# A review made public gives anyone, without signing in, the review form answers meant for the editor only

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Security** unreleased
- **Affects**
  - main: OJS
  - 3.5: none (no public reviews)
  - 3.4: none (code; no public reviews)
  - 3.3: none (code; no public reviews)
- **Introduced** `pkp/pkp-lib#11998` for `pkp/pkp-lib#11922` · [222d16a881](https://github.com/pkp/pkp-lib/commit/222d16a8815cdadb92a2affe8a6d4f5d60c6fb76) · 2025-10-15 · Erik Hanson (ewhanson)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U29 [OJS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#ojs1)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal's review form can hold items with "Included in message to
author" unticked: questions whose answers only the editor is meant to
read, which the decision email and the author's own reading of the
review leave out. But once the editor makes a review on such a form
public ("Publicly Show Reviewer Comments") and the article is
published, the journal's open peer review API, which anyone may call
without signing in, returns every item of the reviewer's form with its
answer, the editor-only ones included. A review written without a form
keeps its "For editor" comments out, as it should.

No page of the journal requests that data, and nothing tells the editor
or the reviewer what it gives away. An editor who knows can avoid it
only by keeping such reviews private.

It needs a review form with an editor-only item and a public review:
ticked on that review, or set as the journal's default under Settings ›
Workflow › Review › "Setup", which applies to reviewers assigned after
it is set.

## Impact

- **Lost**: the confidentiality of what a reviewer wrote for the editor
  alone. `GET /index.php/<journal>/api/v1/peerReviews/open/submissions/<id>`
  returns it to anyone; with the Open review method the reviewer's name
  comes with it.
- **Who**: every reviewer whose public review was made on a form with
  editor-only items; a journal that publishes its reviews and uses such
  forms exposes each one.
- **Way round**: keeping the review private, which gives up publishing
  it; nothing on screen warns an editor who does not know of this fault.

Medium: the editor-only answers go to anyone who asks, silently, but
only for public reviews made on a form with editor-only items, and no
page of the journal shows them today. It would be high if the article
page showed its public reviews, which is what the setting promises
("Make reviewer comments publicly visible with published content"):
every reader of the article would then see the editor-only answers.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (journal `publicknowledge`).
  Submission 1, "Signalling Theory Dividends", is published, and its
  first review round belongs to the published version (the API lists
  only such rounds); Aisla McCrae (`amccrae`) has an unanswered review
  request in it. The journal has a privacy statement, so the reviewer's
  first step asks for consent.

Building the form, as the editor:

1. Sign in as `dbarnes`. Settings › Workflow › Review › "Review Forms".
2. "Create Review Form", Title "hkk18 Open review form", "Save".
3. On its row, "Edit" › "Form Items" › "Create New Item": Item "hkk18
   Shared question", type "Extended text box", "Included in message to
   author" ticked, "Save".
4. "Create New Item": Item "hkk18 Editor-only question", type "Extended
   text box", "Included in message to author" unticked, "Save". Close
   the window.
5. Tick the form's "Activate" box and confirm with "OK".

Making the review public:

6. Open submission 1, "Review" › "Round 1".
7. On Aisla McCrae's row in "Reviewers", "Edit": "Review Form" =
   "hkk18 Open review form", tick "Publicly Show Reviewer Comments",
   "OK".

The review, as the reviewer:

8. Sign in as `amccrae` and open the review request of "Signalling
   Theory Dividends". Tick "Yes, I agree to have my data collected and
   stored according to the privacy statement.", press "Accept Review,
   Continue to Step #2", then "Continue to Step #3".
9. Answer "hkk18 Shared question" with "hkk18 answer for author and
   editor" and "hkk18 Editor-only question" with "hkk18 answer meant for
   the editor only"; Recommendation "Accept Submission"; "Submit
   Review" › "OK".

Confirming, as the editor:

10. Sign in as `dbarnes`, submission 1, "Review" › "Round 1", Aisla
    McCrae's row "Read Review": the window lists both questions with
    their answers. "Mark as Complete" › "Mark as Complete".

The public review data, which no screen requests:

11. Sign out and open
    `/index.php/publicknowledge/api/v1/peerReviews/open/submissions/1`.

**Expected**: the round's one review lists under `reviewForm.questions`
only "hkk18 Shared question" with its answer, as the decision email and
the author's reading of the review do.

**Observed**: 200 with one round and one review (`reviewMethod` 2, the
reviewer's name withheld) whose `reviewForm.questions` lists both items,
markup stripped here:

```
hkk18 Shared question       → "hkk18 answer for author and editor"
hkk18 Editor-only question  → "hkk18 answer meant for the editor only"
```

Control: a public review written without a form (Julie Janssen's, with
a comment in "For author and editor" and one in "For editor") is
returned with the first comment only.

## Cause

`PKP\API\v1\peerReviews\resources\SubmissionPeerReviewResource` builds
the public record of a submission's reviews. For a review made on a
form, `preloadFormsAndComments()` loads every element of the form
([SubmissionPeerReviewResource.php#L294](https://github.com/pkp/pkp-lib/blob/b17fadae59/api/v1/peerReviews/resources/SubmissionPeerReviewResource.php#L294)):

```php
$elements = $reviewFormElementDao->getByReviewFormId($formId);
```

and `getReviewFormQuestions()` returns `{question, responses}` for each
answered one, with no look at `ReviewFormElement::getIncluded()`. The
other places that write answers out for the author keep the rule:
`AuthorReviewerGridHandler::readReview()` loads only the included
elements (`getByReviewFormId($id, null, true)`),
`PKP\mail\traits\ReviewerComments` (the decision email) skips
`!getIncluded()`, and `PKPReviewController::generatePDF()` and
`generateXML()` skip them in the editor's "author-friendly" export. The
same resource's free-text branch already keeps to its own rule: it asks
`getReviewerCommentsByReviewerId(…, true)` for only the comments the
author may read.

The elements came in unfiltered with the API's first version,
[222d16a881](https://github.com/pkp/pkp-lib/commit/222d16a8815cdadb92a2affe8a6d4f5d60c6fb76)
("Expose Publication's Open Peer Reviews via API"). The free-text
comments were unfiltered too.
[8f3a560193](https://github.com/pkp/pkp-lib/commit/8f3a560193c91029a22bf7a44d03aaafecdaf0c5)
(`pkp/pkp-lib#12319`, "Ensure correct elements returned for review and
review summary endpoints") filtered the comments, passing `true` as
`getReviewerCommentsByReviewerId()`'s `$viewable` argument, and moved
the form elements into the same preload without the matching filter.

Reach:

- `GET …/peerReviews/open/submissions/{id}` and `GET
  …/peerReviews/open/submissions?submissionIds=…` (many submissions in
  one request), both without a session. Walked: the first; the second is
  the same resource (code).
- The journal's JATS: `plugins/generic/jatsTemplate` `PeerReview::create()`
  writes a sub-article from this resource for each public review whose
  review method is Open (`isReviewOpen`, the reviewer named), each
  question and answer a section. Such a review's editor-only answers are
  therefore in the article's generated JATS, from which the OAI-PMH
  `jats` format builds its records (`OAIMetadataFormat_JATS::findJats()`).
  The double-anonymous review walked here does not reach the JATS.
  Checked in the code.
- The article page's `OpenReviewComponent` builds this resource too;
  no template prints it today (U13 OJS12). Checked in the code.
- OMP's `publicationPeerReviews` entry point names a controller that is
  not in pkp-lib, and OPS has no review stage, so neither serves this
  data. Checked in the code.

## Proposed fix

Load only the included elements, the way the author's "Read Review"
window does, in the one place every public reader goes through
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/public-review-data-editor-only-answers/fix.diff),
paths from the OJS root, `lib/pkp/…`; drop that prefix for a pkp-lib
branch):

```diff
-        // Fetch all review form elements for each form
+        // Fetch each form's elements marked "Included in message to author": the answers to the
+        // others are for the editor only and never part of the public record
         $this->reviewFormElementsCache = $this->reviewFormElementsCache ?? collect();
         foreach ($reviewFormIds as $formId) {
…
-            $elements = $reviewFormElementDao->getByReviewFormId($formId);
+            $elements = $reviewFormElementDao->getByReviewFormId($formId, null, true);
```

Tried on OJS `main`: with the fix, step 11 lists "hkk18 Shared
question" and its answer alone, while the editor's "Read Review" window
of step 10 still shows both items. The control's review without a form
gives the same answer with the fix in and out.

With the third argument the DAO adds `WHERE rfe.included = ?` (bound
`true`) on the nullable `included` column, so an element whose
`included` is NULL is left out too, as the decision email already
treats it.

- **Alternatives**: a `getIncluded()` check in
  `getReviewFormQuestions()` works the same but keeps the editor-only
  elements in the resource's element list, where the next reader of that
  list could pick them up; a filter in the JATS plugin covers one
  reader of several.
- **What goes with it**: nothing is stored wrong, so no repair. API
  clients lose the editor-only items, which is the point. Target
  pkp-lib `main`: the open `pkp/pkp-lib#13210` (for
  `pkp/pkp-lib#13205`), also on `main`, reworks this resource's caching
  but leaves `preloadFormsAndComments()` alone, so neither has to wait
  for the other. No test covers this resource yet: the guard is a new
  `PKPTestCase` that mocks the review form DAOs through
  `getMockedDAOs()` and checks that a form with one included and one
  editor-only item yields one question.

Small: one argument following the author grid's call, and a new unit
test on the existing mocking pattern.

## Evidence

- Kept script:
  `shared/playwright/checks/issues/public-review-data-editor-only-answers/walk.js`
  (helpers in `lib.js` beside it) takes Steps 1–11 on OJS; `MODE=nb`
  takes the control. Run on an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/public-review-data-editor-only-answers/walk.js`;
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Walked 2026-10-15 on PostgreSQL, PKP's default test dataset at
  pkp/datasets `7912e09` (2026-10-14): OJS `main` (ojs
  `378eced941`, lib/pkp `b17fadae59`) and OJS `stable-3_5_0` (ojs
  `ca763c91cd`, lib/pkp `4045d9241e`). No crash recorded in either.
  The fault does not depend on the database; the fix's query does
  (`included = ?` on a nullable small integer), and was tried on
  PostgreSQL only. MySQL not checked; the author grid makes the same
  call there.
- 3.5 walk: Steps 1–5 and 7 as written, the "Edit" window showing
  "Review Form" without a public box; Steps 8–10 not taken (no review
  can be made public); step 11 answered 404. Code read: no
  `api/v1/peerReviews` in ojs or lib/pkp, no `isReviewPubliclyVisible`
  anywhere, no peer review in `jatsTemplate`.
- 3.4 and 3.3 (code): `git grep` for `isReviewPubliclyVisible` and
  `peerReviews` on `upstream/stable-3_4_0` (ojs `daf0ca971d`) and
  `upstream/stable-3_3_0` (ojs `d7d9dd14ec`), and on `origin/stable-3_4_0`
  (`55c8e406b3`) and `origin/stable-3_3_0` (`5e84acd11b`) of lib/pkp:
  no match; neither line has public reviews.
- Introduced: `git blame` on L294 names 8f3a560193 (Erik Hanson,
  2026-02-09, PR `pkp/pkp-lib#12320`), which moved the element query
  into `preloadFormsAndComments()`; at its parent the same unfiltered
  `getByReviewFormId($assignment->getReviewFormId())` sits in
  `getReviewFormQuestions()` of
  `api/v1/publicationPeerReviews/resources/PublicationPeerReviewResource.php`,
  added by 222d16a881, which Taslan A. Graham (taslangraham) authored
  and Erik Hanson committed in his PR `pkp/pkp-lib#11998` (merged
  2025-11-04).
- Upstream search 2026-10-15 (pkp/pkp-lib, pkp/ojs, pkp/ui-library;
  "review form public peer review included author", "open peer review
  API review form questions", `getReviewFormQuestions`,
  `SubmissionPeerReviewResource`, "included in message to author"):
  `pkp/pkp-lib#4602` is the 3.x author view of the whole form, fixed
  long ago; `pkp/pkp-lib#13205` and its PR `pkp/pkp-lib#13210` are
  about query counts.
- Fix trial: `fix.diff` applied to OJS `main`, then the walk and the
  control (`MODE=nb`) with the fix in, and the control again with it
  out. OMP and OPS carry the same lib/pkp file but serve no such data,
  so it was tried on OJS alone.
- Unverified: the JATS and OAI-PMH reach (open reviews only) was read in
  the code, not walked.
