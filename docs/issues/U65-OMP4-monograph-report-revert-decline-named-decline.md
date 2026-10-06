# "Monograph Report" names a reverted Internal Review decline "Decline Submission"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; one "Revert Decline" decision for both review stages)
- **Introduced** `pkp/omp#1204` for `pkp/pkp-lib#7635` · [4bcffefa43](https://github.com/pkp/omp/commit/4bcffefa434cf4f47ac7d497508d482505a49f62) · 2022-10-09 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U65 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#omp4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When an editor declines a book in Internal Review and then presses
"Revert Decline", the press's "Monograph Report" (Statistics ›
"Reports") names the revert "Decline Submission". The book's line
then lists "Decline Submission" in two decision columns, the real
decline and the revert, while its "Status" column says the book is
still in Internal Review.

Anyone counting declines from the file counts one decline too many for
each such book and cannot see that the decline was undone. A revert in
External Review or at submission is named correctly.

## Impact

- **Lost**: the name of one decision in the downloaded file. The
  decision is stored correctly, and nothing besides this file reads the
  name: the editorial statistics count decisions by type, not by name.
  Since the name is worked out when the file is downloaded, every report
  comes out right once the fix is in, older periods included.
- **Who**: press managers and editors who download the report, only for
  books declined in Internal Review and later reverted.
- **Way round**: open the book's workflow on screen; while the book
  stays in Internal Review, the line's own "Status" already contradicts
  the second "Decline Submission".

Low: one decision's name is wrong in a secondary export, in a narrow
case, with nothing else reading it; it would be medium if a count on
screen or in the statistics relied on it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, press `publicknowledge`.
  Nothing else is needed.

1. Sign in as `dbarnes`.
2. Open submission 6, "The Information Literacy User’s Guide"
   (Internal Review, round 1; Daniel Barnes is assigned).
3. Press "Decline Submission" and "Record Decision".
4. Open submission 6 again. Press "Revert Decline" and "Record
   Decision".
5. Open Statistics › "Reports"
   (`/index.php/publicknowledge/en/stats/reports`) and press "Monograph
   Report".
6. In the downloaded "monographs-JPK-<date>.csv", read the line of
   submission 6: the "Editor Decision n (Editor 2)" and "Date decided n
   (Editor 2)" columns, where "Editor 2" is Daniel Barnes.

**Expected**: decision 2 reads "Decline Submission" and decision 3
reads "Revert Decline".

**Observed**: both read "Decline Submission":

```
Editor Decision 1 (Editor 2)  Send to Internal Review   2026-10-02 11:39:33
Editor Decision 2 (Editor 2)  Decline Submission        2026-10-03 01:29:08
Editor Decision 3 (Editor 2)  Decline Submission        2026-10-03 01:29:55
```

and the line's "Status" reads "Internal Review". The workflow
confirmed step 4 with "Submission Reactivated", and the REST API's
response to that "Record Decision" gives the decision the `label`
"Revert Decline".

## Cause

`Report::getDecisionMessage()` (OMP
`plugins/reports/monographReport/Report.php`, line 134) maps each
stored decision to the name the report writes, and maps
`Decision::REVERT_INTERNAL_DECLINE` to `editor.submission.decision.decline`
("Decline Submission"):

```php
Decision::REVERT_INTERNAL_DECLINE => __('editor.submission.decision.decline'),
```

Its siblings on the same list, `REVERT_DECLINE` and
`REVERT_INITIAL_DECLINE`, map to `editor.submission.decision.revertDecline`
("Revert Decline").

Reach:

- Only this one entry is wrong: every other internal entry of the list
  (`ACCEPT_INTERNAL`, `PENDING_REVISIONS_INTERNAL`, `RESUBMIT_INTERNAL`,
  `DECLINE_INTERNAL`, `SKIP_INTERNAL_REVIEW`, `NEW_INTERNAL_ROUND`, the
  internal recommendations and `CANCEL_INTERNAL_REVIEW_ROUND`) carries
  its external twin's name (code).
- No other code turns `REVERT_INTERNAL_DECLINE` into a name: the
  workflow, the REST API's decision `label` and the decision emails
  (`DecisionEmailVariable`) go through `RevertDeclineInternal`, which
  extends pkp-lib's `RevertDecline` and whose `getLabel()` is "Revert
  Decline" (code; the API `label` seen in the walk).
  `getDecisionMessage()` has one caller, the report's own column, at
  download time. OJS has no Internal Review and OPS no report plugins.
- The decisions the same list leaves unnamed (an empty cell) are a
  separate fault with its own fix, pkp-e2e#656
  (https://github.com/jardakotesovec/pkp-e2e/issues/656); the two
  fixes touch different lines of this method and apply together.

## Proposed fix

Map the internal revert to "Revert Decline", as its two siblings on
the list are mapped
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/fix.diff),
against the OMP root):

```diff
-            Decision::REVERT_INTERNAL_DECLINE => __('editor.submission.decision.decline'),
+            Decision::REVERT_INTERNAL_DECLINE => __('editor.submission.decision.revertDecline'),
```

Tried on `main`: after steps 1–6, decision 3 reads "Revert Decline" and
decision 2 still reads "Decline Submission". As a control, the report
downloaded from the unchanged dataset is byte for byte the same with
the fix in and out.

**Alternatives**

- Name every decision by its type's `getLabel()`: one source for every
  name, but it changes names the file has always written ("Recommend
  Accept" for "Recommendation: Accept Submission"), which is a product
  decision. The fix of pkp-e2e#656 keeps the list and uses `getLabel()`
  only for the types the list lacks, so it leaves this entry as it is.

**What goes with it**

- No API, hook or screen changes; only this decision's cell changes,
  and no stored data needs repair.
- Backport: applies as written to `stable-3_5_0` (the same line 134)
  and to `stable-3_4_0` (line 140). 3.3 needs nothing.
- Test: `getDecisionMessage()` is private and OMP has no plugin unit
  tests, so the guard is an end-to-end check: OMP's
  `cypress/tests/integration/plugins/reports/MonographReport.cy.js`,
  which today only checks that some data is present, could decline and
  revert a book in Internal Review and read the cell; or the same check
  in pkp-e2e's U65 suite.

Small: one line in one file, and an end-to-end check.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–6 on an install
  freshly loaded from the default dataset (3.5: with
  `PKP_E2E_LINE=stable-3_5_0` in front) and records the `label` of the
  response to each "Record Decision":
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js omp shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/walk.js`.
  With the argument `neighbour`, it only downloads the report from the
  unchanged dataset (the control above).
- The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/monograph-report-revert-decline-named-decline/fix.diff omp`.
- Branch tip commits checked: OMP `main`
  [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262)
  (lib/pkp 3dc90c81a6); `stable-3_5_0` OMP
  [9c5e24246c](https://github.com/pkp/omp/commit/9c5e24246cbb18e7fdb261be7ddceffdc406ecc9)
  (lib/pkp cf3f984335); `stable-3_4_0` OMP 0aec65441f;
  `stable-3_3_0` OMP 8e72fc8836. Dataset pkp/datasets e8dafbc
  (2026-10-02), PostgreSQL. The fault does not depend on the database.
- Walked: `main` and 3.5, OMP, on 2026-10-03, with the same buttons and
  the same result on both (the decisions stored as `DECLINE_INTERNAL`
  and `REVERT_INTERNAL_DECLINE`, labelled "Decline Submission" and
  "Revert Decline" by the API; the file's cells "Decline Submission"
  twice). 3.4 and 3.3 were not walked.
- Code reads: `Report::getDecisionMessage()` and its one caller on
  `main`, 3.5 and 3.4; 3.3's `MonographReport.inc.php`, which names
  `SUBMISSION_EDITOR_DECISION_REVERT_DECLINE` "Revert Decline", the one
  revert constant OMP 3.3's `EditorDecisionActionsManager` offers in
  Internal Review as well. `RevertDeclineInternal` (OMP) and
  `RevertDecline::getLabel()` (lib/pkp). Every use of
  `REVERT_INTERNAL_DECLINE` in OMP and its lib/pkp, and OMP's
  `StatsEditorialService`, which counts declines by decision type.
- Introduced: `git blame` on line 134 gives 397b5dfd8e, which moved the
  method out of `MonographReportPlugin.php`; `git log -S` finds the line
  first in 4bcffefa43 ("Incorporated data handling from the OJS
  ArticleReportPlugin"), part of `pkp/omp#1204` (merged 2022-10-19,
  first released in 3.4.0-0). The 3.3 report of the same feature
  (`pkp/omp#1202`) does not have the fault.
- Upstream: searched pkp/pkp-lib, pkp/omp and pkp/ui-library on
  2026-10-03 for "monograph report" (alone and with "decision",
  "decline", "revert decline"), "revert decline" with "report", and the
  names `REVERT_INTERNAL_DECLINE`, `getDecisionMessage` and
  `monographReport`; only the feature's own issue and PRs came up.
