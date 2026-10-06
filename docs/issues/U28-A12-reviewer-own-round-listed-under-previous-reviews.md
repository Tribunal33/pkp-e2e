# A reviewer's own review is listed under "Previous Reviews" once the submission has a later round

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no "Previous Reviews" box)
  - 3.3: none (code; no "Previous Reviews" box)
- **Introduced** `pkp/pkp-lib#9920` for `pkp/pkp-lib#9453` · [d6bd991a](https://github.com/pkp/pkp-lib/commit/d6bd991a0c6d47fa33f11820eecaf8766ff5cd9d) · 2024-01-17 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a12)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reviewer's review page shows a "Previous Reviews" box for the reviews
they gave on earlier rounds of the submission. A reviewer who was only
ever asked on round 1 has no earlier round, and at first sees no box.
Once the submission has a later round that the reviewer is not part of,
the box appears and lists the review the page itself is for: "Round 1
Review Submitted on {date}" with a "Read Round 1 Review" button, which
opens a window showing only the reviewer's own review.

A reviewer who has not answered yet reads "Round 1 Review Submitted on"
with no date. Under the box the page still shows the request and its
"Accept Review, Continue to Step #2" button, so it stays plain that the
review is due. Nothing is lost, and the review can be accepted, written
and submitted as before.

On a journal it needs a new review round opened without the reviewer,
which is ordinary: an editor chooses the reviewers of each round anew.
On a press every Internal Reviewer gets it as soon as the monograph is
sent to External Review. The fault is one rule in one pkp-lib method.

## Impact

- **Lost** The reviewer is told of an earlier review they never gave;
  what the box offers to read is the review already on the page.
- **Who** The reviewer alone, each time they open that review.
- **Way round** None is needed.

Low: the box misleads, and the open request under it stays in plain
sight.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 7, "Developing efficacy
  beliefs in the classroom", is in review round 1: `phudson` has
  submitted his review, `amccrae` has not answered the request.
- On a press, the default dataset, OMP `main`. Submission 12,
  "Connecting ICTs to Development", is in Internal Review round 1:
  `phudson` has submitted, `jjanssen` has not answered.

On a journal:

1. Sign in as `phudson` and open the review
   (`/index.php/publicknowledge/en/reviewer/submission/7`). The page is
   on "4. Completion" and has no "Previous Reviews" box.
2. Sign in as `dbarnes`, open submission 7
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=7`),
   press "Create New Review Round" and go through "New Review Round"
   with "Continue" to "Record Decision".
3. Sign in as `phudson` and open the review again.
4. Press "Read Round 1 Review".
5. Sign in as `amccrae`, open the same address and press "Read Round 1
   Review".

On a press: the same steps with submission 12 and `jjanssen` in place of
`amccrae`. In step 2 press "Send to External Review" and go through
"Send to External Review" with "Continue" to "Record Decision".

**Expected** No "Previous Reviews" box in steps 3 and 5, as in step 1:
neither reviewer has an earlier round on the submission.

**Observed** In step 3 the box shows above the tabs:

```
Previous Reviews
Round 1 Review Submitted on 2026-10-02    Read Round 1 Review
```

The window of step 4 is titled "Round 1 Review submitted by you for" and
shows `phudson`'s own recommendation and comments, the review whose "4.
Completion" tab is open under the box. In step 5 the box reads "Round 1
Review Submitted on" with no date, above "1. Request" and its "Accept
Review, Continue to Step #2" button; the window says "The review was not
completed.". The press shows the same in both steps.

A reviewer who is asked again on the new round also gets the box, and
there it is right: it lists round 1 above their round-2 request.

## Cause

`PKPReviewerHandler::submission()`
(`lib/pkp/pages/reviewer/PKPReviewerHandler.php`) builds the box's list.
It takes every assignment the reviewer has on the submission and stage
and keeps those whose round is not the submission's last one (lines 72
and 83):

```php
$lastRoundId = $reviewRoundDao->getLastReviewRoundBySubmissionId($submissionId)->getId();
…
if ($reviewRoundId != $lastRoundId) {
```

The rule assumes the reviewer's current review is on the submission's
last round. It is not whenever the submission moved on without them.
The page always shows the reviewer's own latest assignment:
`ReviewAssignmentAccessPolicy::effect()` picks it with
`filterByReviewerIds([$user->getId()], true)`. "Previous" should
therefore mean every round other than that assignment's, and the
submission's last round has no part in it.

Reach:

- A new review round without the reviewer, on a journal or within one
  review stage of a press (walked on a journal; a press's Internal
  Review by code).
- A press's External Review. `getLastReviewRoundBySubmissionId()` is
  called without a stage and orders by `stage_id DESC, round DESC`, so
  the External Review round is the last one for every Internal Reviewer
  (walked).
- The loop reuses `$reviewAssignment` as its variable, so after it the
  method holds the last listed assignment instead of the page's. The
  check for the review form's script below the loop (line 123) reads
  that one. It bites only when the reviewer has two rounds on the stage
  and one has a review form while the other has none; the collector sets
  no order, so which one is read is the database's choice (code; not
  driven).
- The list keeps an earlier round the reviewer declined, or one the
  editor cancelled, before and after the fix (code): the fix changes
  only which round counts as the current one.
- The line without a date is a second fault, in the sentence the page
  prints for a round that was not submitted:
  [U28-A2-previous-reviews-unfinished-round-reads-submitted-on.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A2-previous-reviews-unfinished-round-reads-submitted-on.md).

## Proposed fix

List the reviewer's other rounds, not the rounds before the submission's
last one: compare each assignment's round with the round of the
assignment the page shows, and give the loop its own variable
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/fix.diff)):

```diff
-        $lastRoundId = $reviewRoundDao->getLastReviewRoundBySubmissionId($submissionId)->getId();
-        $reviewAssignments = Repo::reviewAssignment()->getCollector()
+        $currentRoundId = $reviewAssignment->getReviewRoundId();
+        $stageReviewAssignments = Repo::reviewAssignment()->getCollector()
 …
-        foreach ($reviewAssignments as $reviewAssignment) {
-            $reviewRoundId = $reviewAssignment->getReviewRoundId();
-            if ($reviewRoundId != $lastRoundId) {
+        foreach ($stageReviewAssignments as $stageReviewAssignment) {
+            $reviewRoundId = $stageReviewAssignment->getReviewRoundId();
+            if ($reviewRoundId != $currentRoundId) {
```

The fix follows the access policy, which already defines the page's review as
the reviewer's latest assignment, and it keeps what `pkp/pkp-lib#9453`
was for: a reviewer asked again on round 2 still gets round 1 in the
box. The `ReviewRoundDAO` lookup and its import go, since nothing else
in the handler uses them. No other caller of
`getLastReviewRoundBySubmissionId()` decides what a reviewer sees.

Tried on `main`, journal and press: with the fix the steps show no box
for either reviewer; a reviewer who submitted round 1 and is asked again
on round 2, the control (journal submission 10, `amccrae`; press
submission 16, `agallego`), still reads "Round 1 Review Submitted on 2026-10-02" with
"Read Round 1 Review", with the fix and without it.

**Alternatives**

- Pass the stage to `getLastReviewRoundBySubmissionId()`. That stops the
  press's External Review case only; a later round in the same stage
  still lists the reviewer's own.
- Leave the row out in the page's script. The page does not know which
  round it shows; the handler does.

**What goes with it**

- No stored data is involved and the API the window reads
  (`reviews/history/{submissionId}/{reviewRoundId}`) is untouched.
- 3.5 holds the same lines; the diff's hunks do not apply there as
  written (the surrounding lines differ), so the change is made by hand.
- Guard, an e2e scenario: a round-1 reviewer whose submission
  gets round 2 without them, and a press's Internal Reviewer after "Send
  to External Review", open their review and find no "Previous Reviews"
  box; a reviewer asked again on round 2 finds the round-1 line.

Small: a few lines, following the access policy's own pick.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/walk.js)
  (helpers in `lib.js` beside it). It takes the steps on the journal and
  the press: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js
  ojs,omp shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/walk.js`
  on a dataset fleet (harness.md "Dataset fleets"); `MODE=nb` in front
  runs the control alone (the reviewer asked again on round 2);
  `PKP_E2E_LINE=stable-3_5_0` in front walks 3.5.
- The fix was applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/fix.diff
  ojs omp`, walked, and reverted.
- Tips walked: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP
  3b0ecf794c (lib/pkp 3dc90c81a6); `stable-3_5_0` OJS 091fb65453, OMP
  9c5e24246c (lib/pkp cf3f984335). Dataset: pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL.
- The dates in Observed are the day the dataset was built, when its
  reviews were submitted.
- Code read on 3.5: `PKPReviewerHandler::submission()` holds the same
  rule (lines 67 and 78) and `ReviewAssignmentAccessPolicy` the same
  pick.
- Code read on 3.4 and 3.3 (lib/pkp `stable-3_4_0` 6f96165c90,
  `stable-3_3_0` 4156e50233; OJS 75cc2d488b and ac77c9fb35, OMP
  0aec65441f and 8e72fc8836): `pages/reviewer/PKPReviewerHandler` builds
  no list of rounds and `locale/en/reviewer.po` has no
  `reviewer.submission.reviewRound.info`; the box came with
  `pkp/pkp-lib#9453` in 3.5.
- Introduced: the header names who opened `pkp/pkp-lib#9920`; the
  commit's author is Nicolas Boulay (nibou230). `git log -L` on the
  handler's condition ends at d6bd991a, which compared round numbers
  with the submission's last round; b4f4e518 of the same day moved the
  list to the Vue page and compared round ids. Both are part of
  `pkp/pkp-lib#9920`, merged 2024-05-01.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp): "Previous
  Reviews", "Read Round", `reviewRoundHistories`. `pkp/pkp-lib#11422`
  (open) and a comment on `pkp/pkp-lib#12273` are about the empty box
  shown when there was no row at all, which `pkp/ui-library#820` and
  `#821` removed; neither is about the reviewer's own round as a row.
- Not driven: OPS, which has no review.
