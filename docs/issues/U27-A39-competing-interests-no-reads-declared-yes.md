# The activity log's "View changes" reads "Competing Interests declared: YES" for a reviewer who declared none

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#13369` for `pkp/pkp-lib#13291` · [5af3b39336](https://github.com/pkp/pkp-lib/commit/5af3b393360bdc307dea5e2a9a2d455b0452ae5b) · 2026-09-22 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-03)
- **Tracked in** U27 [A39](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a39)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

When an editor changes a reviewer's competing-interests answer in the
"Modify Review" window, the submission's "Activity Log" gets a line
saying the review's competing interests were modified. Its "View
changes" reads "Competing Interests declared: YES", with an empty
statement under it, for an answer of "I do not have any competing
interests". A stated interest reads "declared: YES" as well.

So a change from no interests to a statement reads as one declared
interest replacing another, and a change back reads as an interest
still declared. The Review Details window shows the current answer
correctly; the log records the opposite of what the reviewer answered.

It happens on a journal or press whose Settings › Workflow › "Review" ›
"Reviewer Guidance" has a "Competing Interests" text, the setting that
makes reviewers answer the question.

## Impact

- **Lost**: a correct history of the reviewer's answer. Nothing on the
  screen marks the "YES" as wrong.
- **Who**: editors and managers who read a review's history in the
  Activity Log after a competing-interests answer was changed.
- **Way round**: the empty "Competing Interests:" line under "declared:
  YES" hints that nothing was declared. The Review Details window shows
  the current answer, but no screen shows what the answer was before a
  change.

Low: a misleading word in a secondary record, while the review keeps
the right answer. It would be medium if the log were the record a
journal relies on for its competing-interests history.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (journal `publicknowledge`).
- A "Competing Interests" text under "Reviewer Guidance", typed in
  step 2 (the dataset sets none).

Steps:

1. Sign in as `dbarnes` (Journal editor).
2. Open Settings › Workflow › "Review" › "Reviewer Guidance", type
   "u27k7 policy: declare any competing interests." into "Competing
   Interests" and press "Save".
3. Open submission 7, "Developing efficacy beliefs in the classroom",
   and press "Read Review" on Paul Hudson's row in "Reviewers".
4. Press "Modify Review" and answer "Modify Review" in the "Modify this
   review?" dialog. Under "Competing Interests" choose "I do not have
   any competing interests" and press "Save Changes".
5. Press "Modify Review" again (answer "Modify Review"), choose "I may
   have competing interests (Specify below)", type "u27k7 statement"
   in the box under it and press "Save Changes".
6. Press "Modify Review" again (answer "Modify Review"), choose "I do
   not have any competing interests" and press "Save Changes".
7. Press "Cancel", then "Activity Log". "History" lists three lines
   "The following was modified in this review: Reviewer Competing
   Interests. Select "View changes" to see a detailed summary of all
   modifications.". On each, press the arrow at the start of the line,
   then "View changes".

On OMP the same steps run on submission 16, "A Designer's Log: Case
Studies in Instructional Design", Adela Gallego's row.

**Expected**: "I do not have any competing interests" reads "Competing
Interests declared: NO": step 4's and step 6's "Updated Competing
Interests", and step 5's "Previous Competing Interests". The statement
reads "Competing Interests declared: YES" with "Competing Interests:
u27k7 statement".

**Observed**: the "View Review" window of each line (newest first):

```
Step 6:  Updated Competing Interests   Competing Interests declared: YES  Competing Interests:
         Previous Competing Interests  Competing Interests declared: YES  Competing Interests: u27k7 statement
Step 5:  Updated Competing Interests   Competing Interests declared: YES  Competing Interests: u27k7 statement
         Previous Competing Interests  Competing Interests declared: YES  Competing Interests:
Step 4:  Updated Competing Interests   Competing Interests declared: YES  Competing Interests:
         Previous Competing Interests  Competing Interests declared: NO   Competing Interests:
```

On OMP the six "View Review" texts are the same, line for line.

## Cause

`ReviewAssignmentController::editReview()` (lib/pkp
`api/v1/submissions/reviewAssignments/ReviewAssignmentController.php`,
lines 698–701) writes the log entry's two texts when it saves a changed
answer. For "I do not have any competing interests" the browser sends
`"competingInterests": ""`, which the `ConvertEmptyStringsToNull`
middleware (`PKPRoutingProvider`) turns into null before the
controller sees it. The new answer always gets
`submission.event.review.competingInterestsWithDeclaration`
("Competing Interests declared: YES"); the previous one gets it
whenever the stored `competingInterestsDeclared` flag is set, and
`…competingInterestsWithNoDeclaration` ("declared: NO") only when it
is not.

That flag records that the question was answered, not which answer was
given. Every writer sets it to true for "I do not have any competing
interests" and stores no statement: the reviewer's step 1
(`PKPReviewerReviewStep1Form::execute()`), the reviewer's decline
(`PKPReviewerHandler`, lines 264–269) and this save. The answer is in the statement:
every screen that shows it (the Review Details window's
`useReviewDetailsForm.js`, the public open-review block
`PkpOpenReviewReviewContent.vue`) reads "no interests" from a set flag
with an empty statement. The log alone reads the flag as "declared an
interest".

Reach:

- Only this log entry (`SUBMISSION_LOG_REVIEW_REVIEWER_COMPETING_INTERESTS_MODIFIED`);
  `SubmissionReviewEventLogGridHandler::formatCompetingInterestChange()`
  prints the stored texts as they are (checked in the code).
- Stored data: the texts are rendered when the entry is written and
  stored as text, so the fix cannot correct entries already logged;
  they keep "YES". No released version writes this entry.
- Other apps: a preprint server has no review.

## Proposed fix

Choose the text by the statement, as the screens do, in one helper the
controller calls for both sides:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/competing-interests-no-reads-declared-yes/fix.diff),
against the app root:

```diff
-                'reviewerNewCompetingInterests' => __('submission.event.review.competingInterestsWithDeclaration', ['competingInterests' => $validated['competingInterests']]),
-                'reviewerOldCompetingInterests' => $oldCompetingInterestsDeclared ?
-                    __('submission.event.review.competingInterestsWithDeclaration', ['competingInterests' => $oldCompetingInterests])
-                    : __('submission.event.review.competingInterestsWithNoDeclaration', ['competingInterests' => $oldCompetingInterests]),
+                'reviewerNewCompetingInterests' => $this->describeCompetingInterests(true, $validated['competingInterests']),
+                'reviewerOldCompetingInterests' => $this->describeCompetingInterests($oldCompetingInterestsDeclared, $oldCompetingInterests),
…
+    protected function describeCompetingInterests(bool $declared, ?string $competingInterests): string
+    {
+        return __(
+            $declared && (string) $competingInterests !== ''
+                ? 'submission.event.review.competingInterestsWithDeclaration'
+                : 'submission.event.review.competingInterestsWithNoDeclaration',
+            ['competingInterests' => (string) $competingInterests]
+        );
+    }
```

"YES" then means a statement was given, which is what a reader takes
"declared" to mean, and what the Review Details window shows as "I may
have competing interests". Tried on OJS and OMP `main`: the Steps then
showed the Expected texts. As a neighbour, two statements were saved in
a row, "u27k7 first" then "u27k7 second". With and without the fix,
the second save's line read "declared: YES" on both sides, with each
statement, and the first save's "Previous" side, a question never
answered, read "declared: NO".

**Alternatives**

- A third text for "answered: no competing interests", apart from a
  question never answered (both read "declared: NO" with the fix). It is
  more exact, but adds a string for every translator; the Review Details
  window already tells the two apart.
- Storing the raw answer (flag and statement) in the entry and wording
  it when "View changes" opens, as the review-form entries store their
  responses. That also stops freezing the text in the editor's language
  at save time, but changes the entry's stored shape.

**What goes with it**

- Data: entries logged before the fix keep their text (see Cause).
- Test: lib/pkp has no test that reaches this controller, so the guard
  is an e2e step: the Steps above, checking each "View Review" text.

Small: one method in one pkp-lib controller, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/competing-interests-no-reads-declared-yes/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-details-guidance-promises-upload/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/competing-interests-no-reads-declared-yes/walk.js`
  takes the Steps. Its neighbour mode (`MODE=nb`, "neighbour") saves
  two statements in a row. Every save answered 200.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d6736318), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, ui-library
  280f98c570); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c (lib/pkp cf3f984335), ui-library d4e0188353; `stable-3_4_0`
  lib/pkp 767353f4fe; `stable-3_3_0` lib/pkp ac3fa73402. The OJS and OMP
  `main` pointers carry the same controller, grid handler and
  `submission.po`.
- 3.5: the review window offers no "Modify Review", so steps 4–7
  cannot be taken and the log has no such line.
- Code reads: the two
  `competingInterestsWith…` keys in lib/pkp's English `submission.po` on
  3.5, 3.4 and 3.3 (absent); on `main`, the flag's writers
  (`PKPReviewerReviewStep1Form::execute()`, `PKPReviewerHandler`, this
  controller) and its readers (`useReviewDetailsForm.js`,
  `PkpOpenReviewReviewContent.vue`, `SubmissionPeerReviewResource`).
- Introduced: `git blame` on the controller's lines 698–701 and on
  `submission.po` lines 3974–3980 gives 5af3b39336, their first commit.
  Before `pkp/ui-library#993` (for `pkp/pkp-lib#13282`, 2026-09-28) put
  the answer in the "Modify Review" window, no screen could send the
  change that writes this entry.
- Upstream searched in pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library by "Competing Interests declared",
  `competingInterestsWithDeclaration` and modify review competing
  interests. `pkp/pkp-lib#13424` (open) is about the flag's upgrade
  migration, another fault.
