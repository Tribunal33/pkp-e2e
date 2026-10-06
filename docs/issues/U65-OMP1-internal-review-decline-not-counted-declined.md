# A press's Editorial Activity leaves books declined at Internal Review out of "Submissions Declined"

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; an Internal Review decline was recorded as the same "Decline" as a Review one)
- **Introduced** `pkp/pkp-lib#7631` and `pkp/omp#1071` for `pkp/pkp-lib#7265` · [f75706b](https://github.com/pkp/pkp-lib/commit/f75706ba57d498fe981584edb2f999a0ac4aaefa), [fdfeefd](https://github.com/pkp/omp/commit/fdfeefdb1dd1e486091158e8fbbf8383a9411372) · 2022-01-18, 2022-02-22 (author dates) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** U65 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A book declined with Internal Review's "Decline Submission" is counted
in neither "Submissions Declined" nor its sub-rows, nor in the rejection
rates, although "Days to Reject" counts it and an Internal Review
"Accept Submission" counts as accepted. The monthly email's "Declined
submissions this month" leaves it out too.

The press's decline figures and rejection rates read lower than they
are, and nothing on screen corrects them. The figures are counted from
the stored decisions each time they are shown, so the fix brings back
every past Internal Review decline with no data repair; only the monthly
emails already sent stay wrong.

A press upgraded from 3.3 lost its older Internal Review declines from
the figures too. 3.3 stored them as the same decision as a Review
decline and counted them; the upgrade to 3.4 relabels those stored
decisions as Internal Review declines, so they dropped out on upgrade,
even where the press has declined nothing at Internal Review since.

## Impact

- **Lost**: correct decline figures and rejection rates, on the page and
  in the monthly email and its spreadsheet; the counts fall short by exactly
  the press's Internal Review declines. Nothing says one is missing.
- **Who**: press managers and editors on Statistics › "Editorial
  Activity", and whoever receives the monthly statistics email, on a
  press that declines books at Internal Review now or did under 3.3.
- **Way round**: counting the declined books by hand from the archive.

Medium: a secondary output, the editorial statistics, is silently wrong
in its decline figures, while no submission or decision is affected and
the fix restores the past figures; it would be high if presses were
known to report these rates on to funders or indexes.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Nothing else: the press holds no
  declined book yet.

Steps:

1. Sign in as `dbarnes`.
2. Open Statistics › "Editorial Activity"
   (`/index.php/publicknowledge/en/stats/editorial/editorial`). In
   "Trends", the "Total" column reads "Submissions Declined" 0,
   "Submissions Declined (After Review)" 0, "Rejection Rate" 0%.
3. Open submission 6, "The Information Literacy User's Guide" (Internal
   Review, Round 1).
4. Press "Decline Submission", then "Record Decision" on its one step,
   "Notify Authors" (the page is titled "Decline Submission"). The window
   reads "Submission Declined".
5. Open Statistics › "Editorial Activity" again and read the "Total"
   column.

**Expected**: the declined book is counted: "Submissions Declined" 1,
"Submissions Declined (After Review)" 1, "Rejection Rate" and "After
Review Reject Rate" 6% (1 of the press's 18 received submissions).

**Observed**: nothing changed. "Total" reads:

```
Submissions Received                  18 (0/year)
Submissions Accepted                  7 (0/year)
Submissions Declined                  0
Submissions Declined (Desk Reject)    0
Submissions Declined (After Review)   0
Rejection Rate                        0%
After Review Reject Rate              0%
```

Control: the same steps on submission 16, "A Designer's Log: Case Studies
in Instructional Design" (External Review): "Decline Submission",
"Continue" past "Notify Authors", "Record Decision" on "Notify
Reviewers", then the page reads
"Submissions Declined" "1 (0/year)", "Submissions Declined (After
Review)" "1 (0/year)", "Rejection Rate" and "After Review Reject Rate"
6%. That one decline counts; the Internal Review one still does not.

## Cause

OMP records an Internal Review decline as its own decision,
`Decision::DECLINE_INTERNAL`, and tells the statistics so: its
`APP\services\StatsEditorialService::getDeclinedDecisions()` returns
`DECLINE`, `INITIAL_DECLINE` and `DECLINE_INTERNAL`, as its
`getAcceptedDecisions()` adds `ACCEPT_INTERNAL`.

The shared `PKP\services\PKPStatsEditorialService` reads that list only
in `getDaysToDecisions()`. Every other declined figure names the
decisions itself:

- `getOverview()` counts `$declinedDesk` from `Decision::INITIAL_DECLINE`
  and `$declinedReview` from `Decision::DECLINE` (lines 42–43), and the
  rates it computes when a date range is set the same way (lines
  68–69). "Submissions Declined" is
  their sum, so it, "(After Review)" and every rejection rate leave
  `DECLINE_INTERNAL` out.
- `getAverages()` lists `[Decision::INITIAL_DECLINE, Decision::DECLINE]`
  for "submissionsDeclined" and `[Decision::DECLINE]` for
  "submissionsDeclinedPostReview" (lines 236, 238), so the "/year"
  figures leave it out too.

The accepted side already reads its list: `pkp/pkp-lib#9310`
([502a8b5](https://github.com/pkp/pkp-lib/commit/502a8b55aa5642be48ea3f49fa647bc57a8e926b),
2023) moved the accepted total in `getOverview()` onto
`getAcceptedDecisions()`, and `pkp/pkp-lib#9813`
([ec74bd6](https://github.com/pkp/pkp-lib/commit/ec74bd64af97196bcc6e50898baee4ad4b9ae165), 2024) the
acceptance rate computed for a date range and `getAverages()`. The
declined side was not changed with them.

This broke in 3.4. Before `pkp/pkp-lib#7265`, OMP recorded an Internal
Review decline as the same `SUBMISSION_EDITOR_DECISION_DECLINE` as a
Review decline, so it was counted under "(After Review)". That change
gave it its own constant and the 3.4 upgrade
(`I7265_EditorialDecisions`) rewrote the stored ones to it, while
`getOverview()` and `getAverages()` kept counting `DECLINE` alone.

Reach:

- Statistics › "Editorial Activity": the date-range column and the
  "Total" column of "Trends", with its "/year" figures (walked).
- The monthly statistics email and its spreadsheet:
  `PKP\jobs\notifications\StatisticsReportMail` reads `getOverview()`
  (code).
- `GET /api/v1/stats/editorial` and `…/averages`, which return the same
  two methods (code).
- OJS has no decline beyond `DECLINE` and `INITIAL_DECLINE`, and OPS
  overrides `getOverview()` with its own rows, so neither shows it
  (code).

## Proposed fix

Count every declined figure from `getDeclinedDecisions()`, the list each
app already keeps for the statistics, in the shared service, the way
`pkp/pkp-lib#9310` and `pkp/pkp-lib#9813` did for
`getAcceptedDecisions()`. The desk reject stays
`INITIAL_DECLINE`; "after review" becomes every other declining decision,
through one new protected method in
`lib/pkp/classes/services/PKPStatsEditorialService.php`:

```diff
-        $declinedReview = $this->countByDecisions(Decision::DECLINE, $args);
+        $declinedReview = $this->countByDecisions($this->getDeclinedPostReviewDecisions(), $args);
 …
-            $declinedReviewForSubmissionDate = $this->countByDecisionsForSubmittedDate(Decision::DECLINE, $args);
+            $declinedReviewForSubmissionDate = $this->countByDecisionsForSubmittedDate($this->getDeclinedPostReviewDecisions(), $args);
 …
-            'submissionsDeclined' => [Decision::INITIAL_DECLINE, Decision::DECLINE],
+            'submissionsDeclined' => $this->getDeclinedDecisions(),
             'submissionsDeclinedDeskReject' => [Decision::INITIAL_DECLINE],
-            'submissionsDeclinedPostReview' => [Decision::DECLINE],
+            'submissionsDeclinedPostReview' => $this->getDeclinedPostReviewDecisions(),
 …
+    protected function getDeclinedPostReviewDecisions(): array
+    {
+        return array_values(array_diff($this->getDeclinedDecisions(), [Decision::INITIAL_DECLINE]));
+    }
```

The whole diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-decline-not-counted-declined/fix.diff).
Tried on `main`: with it applied, the Steps read "Submissions Declined"
1, "(After Review)" 1 and both rates 6% after the Internal Review
decline, and 2, 2 and 11% after the control, and a desk decline on OMP
stays under "(Desk Reject)" alone.

Where else: these four lines are every place the service names
`Decision::DECLINE` itself (the desk-reject figures rightly keep
`INITIAL_DECLINE`), and the query builder's status check reads the decision repository's
decline types, which include `DECLINE_INTERNAL` on OMP. Outside the
statistics, `PKPNotificationManager::getNotificationTypeByEditorDecision()`
maps only `DECLINE` and `INITIAL_DECLINE` to the decline notification,
and OMP's override in `APP\notification\NotificationManager` adds no
Internal Review decline; that is a separate behaviour, not checked on
screen, and left out of this fix.

**Alternatives**:

- Override `getOverview()` and `getAverages()` in OMP's
  `StatsEditorialService`: copies two long methods into one app and
  leaves the shared ones ready to drift again.
- Read the declining decisions from `Repo::decision()->getDeclineDecisionTypes()`
  instead of `getDeclinedDecisions()`: one list fewer, but it bypasses the
  method whose docblock reserves it for the statistics, and OPS's repository lists only
  `INITIAL_DECLINE`, so the change would reach further than this fault.
- Count `DECLINE_INTERNAL` as its own sub-row ("Declined after Internal
  Review"): a new row and string for one app; a product choice, not
  needed to make the total right.

**What goes with it**:

- No data repair: the decisions are stored correctly and every figure is
  computed when read, so past Internal Review declines, those the 3.4
  upgrade relabelled included, count at once.
- What changes for others: on OMP the page, the email and
  `GET /api/v1/stats/editorial` return higher declined figures and
  rates. OJS and OPS return the same figures as before, since their
  `getDeclinedDecisions()` is the base list: with the fix in and out, a
  desk and a Review decline on OJS and the OPS page read the same. A plugin that overrides
  `getDeclinedDecisions()` now sees its decisions counted, which is what
  the method says it is for.
- Backport: the diff applies as it stands to `stable-3_5_0` and
  `stable-3_4_0` (line offsets only).
- Guard: a test that a press's Internal Review decline raises
  "Submissions Declined" (an e2e scenario of U65 here, or a pkp-lib unit
  test of `getOverview()` with a service whose `getDeclinedDecisions()`
  adds a decision).

Small: one method and four lines in one shared pkp-lib class, with a
test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-decline-not-counted-declined/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/internal-review-decline-not-counted-declined/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL): `PROBE_FEATURE=<feature>
  PROBE_AGENT=<id> node bin/probe.js omp
  shared/playwright/checks/issues/internal-review-decline-not-counted-declined/walk.js`
  (the Steps); `… all … walk.js neighbour` (the neighbour check: desk
  decline of OMP submission 3; desk decline of OJS submission 4 and
  Review decline of OJS submission 7; the OPS page read).
- Walked on OMP `main` and `stable-3_5_0`, same figures; no request
  failed and no page script failed. The decisions the walk stored:
  `Decision::DECLINE_INTERNAL` at Internal Review for submission 6,
  `Decision::DECLINE` at External Review for submission 16.
- "Days to Reject" is left out of the Steps: the dataset's books were
  submitted the day the dataset was built, so the figure reads 0 either
  way on a fresh load. An earlier walk on a press with older submissions
  read it at 15 after an Internal Review decline
  ([U65 footnote td6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#fn-td6)).
- The monthly email was not sent in this walk; its reach is read in the
  code (`StatisticsReportMail::handle()` reads `getOverview()`). An
  earlier walk's August email read "Declined submissions this month: 1"
  for one Internal Review and one desk decline
  ([U65 footnote f-omp1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#fn-f-omp1)).
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6, 2026-09-29);
  `stable-3_5_0` 9c5e24246 (lib/pkp cf3f984335, 2026-10-01);
  `stable-3_4_0` 0aec65441 (lib/pkp 9e41f10273); `stable-3_3_0`
  8e72fc883 (lib/pkp ac3fa73402).
- Code reads: `lib/pkp/classes/services/PKPStatsEditorialService.php`
  (`getOverview()`, `getAverages()`, `getDeclinedDecisions()`) and OMP
  `classes/services/StatsEditorialService.php` on `main`, 3.5 and 3.4 (the
  same lines on each); OMP `classes/decision/Repository.php`
  `getDeclineDecisionTypes()`; `PKPStatsEditorialQueryBuilder::countByDecisions()`;
  3.4's `classes/migration/upgrade/v3_4_0/I7265_EditorialDecisions.php`
  (stage 2 declines rewritten to `DECLINE_INTERNAL`); 3.3's
  `classes/workflow/EditorDecisionActionsManager.inc.php`
  (`_internalReviewStageDecisions()` offers
  `SUBMISSION_EDITOR_DECISION_DECLINE`) and
  `classes/services/PKPStatsEditorialService.inc.php` (counts it under
  "(After Review)"). OJS and OPS `StatsEditorialService` for the reach.
- Introduced: `git blame` on `getOverview()` line 43 gives f75706b
  (pkp-lib, `pkp/pkp-lib#7631`), which renamed the old constant to
  `Decision::DECLINE` and added `getDeclinedDecisions()`; fdfeefd (OMP,
  `pkp/omp#1071`, the same issue) added `DECLINE_INTERNAL`, OMP's
  `getDeclinedDecisions()` override and the upgrade step. The fault needs
  both. The header gives the commits' author dates; both PRs merged on
  2022-02-24, and the change first shipped in 3.4.0. The accepted-side
  history: `git blame` on `getOverview()` line 37 gives 502a8b55aa
  (`pkp/pkp-lib#9310`, 2023-09-22), on lines 67 and 235 ec74bd64af
  (`pkp/pkp-lib#9813`, 2024-03-29).
- Upstream search (pkp/pkp-lib, pkp/omp, pkp/ui-library; issues and PRs)
  by the symptom's words and by `PKPStatsEditorialService`,
  `getDeclinedDecisions` and `DECLINE_INTERNAL`: `pkp/pkp-lib#9813`
  (closed) changed the accepted side only, and `pkp/pkp-lib#7709` is
  OPS's own statistics; neither is this fault.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/internal-review-decline-not-counted-declined/fix.diff
  ojs omp ops`, the Steps on OMP and the neighbour check on all three
  apps with the fix in and out, then `revert`.
