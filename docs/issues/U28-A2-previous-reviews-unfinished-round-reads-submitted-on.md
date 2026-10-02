# "Previous Reviews" says "Round 1 Review Submitted on" with no date for a round the reviewer never finished

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no "Previous Reviews" box)
  - 3.3: none (code; no "Previous Reviews" box)
- **Introduced** `pkp/ui-library#341` for `pkp/pkp-lib#9453` · [fe684d60](https://github.com/pkp/ui-library/commit/fe684d60a80a8192ae8e8b3c77f4f8060db4d04d) · 2024-01-17 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U28 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A reviewer who is asked again on a later round finds their earlier
rounds under "Previous Reviews" on the page of the new review. For a
round on which they never submitted a review, whether they accepted the
request or never answered it, the line reads "Round 1 Review Submitted
on" and then nothing. It should say that the review was not completed,
as the window behind the "Read Round 1 Review" button beside it does:
"The review was not completed.".

Nothing is lost. A round the reviewer declined does not show the
dateless line: it reads "Submitted on" with the date of the decline
(code).

The state comes about when an editor opens a new round and adds a
reviewer whose earlier request is still open; the "Add Reviewer" list
offers them like anyone else. The fix is one branch in one ui-library
template, with a string that exists.

## Impact

- **Lost** The reviewer is told that a review was submitted when none
  was. They know they did not submit one, so no decision rests on it.
- **Who** The reviewer alone, each time they open the review of the
  later round.
- **Way round** The window behind "Read Round 1 Review".

Low: a wrong line about the reviewer's own earlier round; the review
they are now asked for is not affected.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`. Submission 12, "Sodium butyrate
  improves growth performance of weaned piglets during the first period
  after weaning", is in review round 1; `phudson` and `jjanssen` have
  not answered the request.
- On a press, the default dataset, OMP `main`: submission 17, "Open
  Development: Networked Innovations in International Development", in
  Internal Review round 1, with the same two reviewers.

Steps:

1. Sign in as `phudson`, open the review
   (`/index.php/publicknowledge/en/reviewer/submission/12`) and press
   "Accept Review, Continue to Step #2".
2. Sign in as `dbarnes`, open submission 12
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`),
   press "Create New Review Round" and go through "New Review Round"
   with "Continue" to "Record Decision".
3. Open the submission again; it is on round 2. Press "Add Reviewer",
   search "Hudson", press "Select Reviewer" on Paul Hudson, then "Add
   Reviewer". Do the same for Julie Janssen, who never answered round 1.
4. Sign in as `phudson` and open the review.
5. Press "Read Round 1 Review".
6. Sign in as `jjanssen` and open the same address.

On a press: the same steps with submission 17.

**Expected** The round-1 line says that the review was not completed,
as the window does, with no "Submitted on".

**Observed** In steps 4 and 6 the box above the tabs reads:

```
Previous Reviews
Round 1 Review Submitted on     Read Round 1 Review
```

The window of step 5 is titled "Round 1 Review submitted by you for",
says "The review was not completed." and lists under "General
Information" the request and due dates, with no "Review Submitted On".
The press shows the same.

A round the reviewer did submit reads "Round 1 Review Submitted on
2026-10-02" in the same box.

## Cause

`ReviewerSubmissionPage.vue`
(`lib/ui-library/src/pages/reviewerSubmission/`) prints every row of the
box with one sentence, whatever became of the round:

```vue
t('reviewer.submission.reviewRound.info.submittedOn', {
	round: review.reviewRoundNumber,
	submittedOn: formatShortDate(review.submittedOn),
})
```

The string is "Round {$round} Review Submitted on {$submittedOn}".
`PKPReviewerHandler::submission()` sends `submittedOn` as the
assignment's completion date, which is null until the review is
submitted, and `formatShortDate(null)` gives an empty text. The sentence
then ends after "on".

The window opened from the same row does tell the states apart:
`roundHistoryModalStore.js` has `isIncomplete` (no completion date) and
`RoundHistoryModal.vue` prints
`reviewer.submission.reviewRound.reviewNotCompleted`, "The review was
not completed.", for it. The page was first built as bare "Round {N}"
buttons (aeaa864d); the box and its one sentence came with fe684d60.

Reach:

- A round the reviewer accepted and left, and one they never answered
  (both walked, journal and press).
- The reviewer's own current round before they submit, when the box
  lists it by the fault of
  [U28-A12-reviewer-own-round-listed-under-previous-reviews.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U28-A12-reviewer-own-round-listed-under-previous-reviews.md)
  (walked there).
- A declined round has a date, the day of the decline, because the
  handler sends that one instead (commit 7a72169c, "Fixed a null date
  when the reviewer has declined the review"). Its line therefore reads
  "Round {N} Review Submitted on {date}" too (code; not driven).
- The window's title, "Round {N} Review submitted by you for", is the
  same for a review that was not completed (seen in step 5).

## Proposed fix

Give the row the branch the window has: when the round has no date,
print the window's own sentence instead of "Submitted on"
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/previous-reviews-unfinished-round-reads-submitted-on/fix.diff)):

```diff
-			<span>
+			<span v-if="review.submittedOn">
 				{{
 					t('reviewer.submission.reviewRound.info.submittedOn', {
 …
 			</span>
+			<span v-else>
+				{{ t('reviewer.submission.reviewRound.reviewNotCompleted') }}
+			</span>
```

The wording is the page's to choose, so the fix sits in the page; the
handler's null is the true state. It follows the window, which for a
round that was not declined tests the same completion date and prints
the same string, so the row and the window agree. The string exists: 31
of pkp-lib's 71 locale folders hold it, each filled in, and the others
fall back to English. "Read Round 1 Review" beside it names the round.

Tried on `main`, journal and press: with the fix steps 4 and 6 read "The
review was not completed." followed by "Read Round 1 Review"; a reviewer
who submitted round 1 and is asked again on round 2, the control
(journal submission 10, `amccrae`; press submission 16, `agallego`),
still reads "Round 1
Review Submitted on 2026-10-02", with the fix and without it.

**Alternatives**

- A sentence of its own that names the round ("Round {$round} Review Not
  Completed"). It reads better among several rows, and costs a new
  string in pkp-lib besides the ui-library change, untranslated until
  the translators reach it.
- Send the round's state from the handler and choose among three
  sentences, the declined one included. More than this finding needs; it
  is the way to go if the team also wants the declined row reworded.
- Leave unfinished rounds out of the list. That drops a row whose window
  still shows the request's dates, a product decision.

**What goes with it**

- Left out, for the team to decide, since each needs a new string: the
  declined row's "Submitted on {date of the decline}" and the window's
  title "Round {N} Review submitted by you for" over a review that was
  not completed.
- No stored data, API or hook is involved. The file is the same on 3.5,
  so the diff applies there as written.
- `ReviewerSubmissionPage.stories.js` gives each of its three rows a
  `submittedOn` date, so the story needs a null one on its incomplete
  row to show the new branch.
- Guard, an e2e scenario: a reviewer asked again after an
  unfinished round reads "The review was not completed." on the round's
  row, and no row ends in "Submitted on" without a date.

Small: three lines, following the window's own branch.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/previous-reviews-unfinished-round-reads-submitted-on/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/reviewer-own-round-listed-under-previous-reviews/lib.js)).
  It takes the steps on the journal and the press:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/previous-reviews-unfinished-round-reads-submitted-on/walk.js`
  on a dataset fleet (harness.md "Dataset fleets"); `MODE=nb` in front
  runs the control alone (a submitted round 1); `PKP_E2E_LINE=stable-3_5_0`
  in front walks 3.5.
- The fix was applied with `node bin/try-fix.js apply
  shared/playwright/checks/issues/previous-reviews-unfinished-round-reads-submitted-on/fix.diff
  ojs omp` (it rebuilds the JavaScript), walked, and reverted.
- Tips walked: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5); `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335, lib/ui-library d4e01883). Dataset: pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL.
- The date in the control is the day the dataset was built, when its
  reviews were submitted.
- Code read on 3.5: `ReviewerSubmissionPage.vue` is the same file as on
  `main`, and `PKPReviewerHandler::submission()` sends the same
  `submittedOn` (lines 83 to 85).
- Code read on 3.4 and 3.3 (lib/pkp `stable-3_4_0` 6f96165c90,
  `stable-3_3_0` 4156e50233; OJS 75cc2d488b and ac77c9fb35, OMP
  0aec65441f and 8e72fc8836): `pages/reviewer/PKPReviewerHandler` builds
  no list of rounds and `locale/en/reviewer.po` has no
  `reviewer.submission.reviewRound.info.submittedOn`; the box came with
  `pkp/pkp-lib#9453` in 3.5.
- Introduced: the header names who opened `pkp/ui-library#341`; the
  commit's author is Nicolas Boulay (nibou230). `git log -S submittedOn`
  on the page's folder ends at fe684d60, part of that PR, merged
  2024-04-24; ffdec8ab of the same PR
  reshaped the markup and kept the sentence.
- Upstream search (pkp/pkp-lib, pkp/ui-library, pkp/ojs, pkp/omp):
  "Previous Reviews", "Read Round", "Submitted on" with reviewer and
  round, `reviewRoundHistories`, `ReviewerSubmissionPage submittedOn`.
  `pkp/pkp-lib#11422` (open) and a comment on `pkp/pkp-lib#12273` are
  about the empty box shown when there was no row at all, which
  `pkp/ui-library#820` and `#821` removed; neither is about a row's
  wording.
- Not driven: OPS, which has no review.
