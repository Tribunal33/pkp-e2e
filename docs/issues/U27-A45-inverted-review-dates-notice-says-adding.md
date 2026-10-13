# Inverted review due dates: the refusal says "adding the reviewer" in Edit and Resend, and misspells "response" everywhere

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no date-order check)
  - 3.3: none (code; no date-order check)
- **Introduced** `pkp/pkp-lib#9612` for `pkp/pkp-lib#5885` · [41b38eb240](https://github.com/pkp/pkp-lib/commit/41b38eb24052a5d7a51e658b3460d42da76e20c5) · 2024-08-30 · Touhidur Rahman (touhidurabir); reused in the Resend window by `pkp/pkp-lib#9896` for `pkp/pkp-lib#4789` · [924e208ada](https://github.com/pkp/pkp-lib/commit/924e208ada664a4b7dc5f2dd5f9012b0db445e86)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U27 [A45](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a45)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An editor picks a review due date earlier than the response due date,
then presses "Add Reviewer" in the "Add Reviewer" window, "OK" in
"Edit", or "Resend Review Request" in the "Resend Review Request"
window. Each refuses with the same notice: "There was an error adding
the reviewer as review due date must be equal or greater than responde
due date." In "Add Reviewer" the only fault is the typo "responde". In
"Edit" and "Resend Review Request" the reviewer is already on the round
and nothing is being added, so the notice also names the wrong action.
The refusal itself is right.

## Impact

- **Lost**: nothing. The dates are refused, the window stays open with
  the dates as picked, and the editor can correct them.
- **Who**: editors of every journal and press who pick an inverted pair
  in any of the three windows. OPS has no review stage, so it has none
  of these windows. In "Edit" and "Resend Review Request", the editor
  can read the notice as saying the reviewer's assignment has failed,
  when only the dates were refused. All 30 translations of the message
  say "adding the reviewer" too. The typo "responde" is in English
  only.
- **Way round**: "Add Reviewer" and "Edit" state the rule under
  "Important Dates" ("Review due date must be greater or equal to
  response due date."). "Resend Review Request" states no rule (a
  separate report, linked under Steps). There, the editor has only the
  notice, which names the two dates despite its wrong opening, and
  that is enough to correct them.

Low: a refusal message with the wrong wording, while the refusal itself
is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (pkp/datasets `ojs/main`).
  Nothing is created before the steps.
- On OMP `main` (pkp/datasets `omp/main`), the same steps work with
  submission 17, "Open Development: Networked Innovations in
  International Development". It is in Internal Review, round 1, with
  Julie Janssen and Paul Hudson as reviewers who have not responded,
  and its workflow opens on that review. Its addresses are
  `/index.php/publicknowledge/en/reviewer/submission/17` (step 1) and
  `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`
  (step 2). `dbarnes` reaches it as the press's editor, with no
  assignment needed.

1. Sign in as `phudson`. Open his review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets
   during the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`). Press
   "Decline Review Request", press "Decline Review Request" in the
   window, and sign out. (This step gives step 6 a declined row to
   resend.)
2. Sign in as `dbarnes` and open submission 12
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`).
   The "Reviewers" panel lists Julie Janssen ("Request Sent") and Paul
   Hudson ("Request Declined").
3. Press "Add Reviewer". Search "McCrae" and press "Select Reviewer" on
   Aisla McCrae. Under "Important Dates", pick a "Response Due Date"
   three weeks from today and a "Review Due Date" two weeks from today
   (on the walk: 2026-11-03 and 2026-10-27). Press "Add Reviewer".
4. Read the notice at the top right of the page. It disappears after a
   few seconds. Close the window.
5. On Julie Janssen's row, open "More Actions" and choose "Edit". Pick
   the same two dates and press "OK". Read the notice, then press
   "Cancel".
6. On Paul Hudson's row, open "More Actions" and choose "Resend Review
   Request". Pick the same two dates and press "Resend Review Request".
   Read the notice.

The walk opened the workflow again by its address before steps 3, 5
and 6. Whether that reopening is needed was not tested; nothing in the
steps depends on it.

**Expected.** Each window refuses the pair and stays open. The notice
states the rule, spelled right, and does not name another action. For
example, it could read like the sentence "Add Reviewer" and "Edit" show
under "Important Dates":

```
Review due date must be greater or equal to response due date.
```

**Observed.** In each of the three windows, the window stays open and
nothing is saved: Aisla McCrae gets no row, and Paul Hudson's row still
reads "Request Declined". The notice reads:

```
There was an error adding the reviewer as review due date must be equal or greater than responde due date.
```

In "Resend Review Request", a browser alert also appears. That alert is
a separate report:
[U27-A46-resend-inverted-dates-try-again-alert.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A46-resend-inverted-dates-try-again-alert.md).

## Cause

All three windows check the date order with one validator. Each passes
it the same message key, which was written for "Add Reviewer":

- `ReviewerForm::__construct()` (pkp-lib
  `controllers/grid/users/reviewer/form/ReviewerForm.php`, line 92),
  "Add Reviewer";
- `EditReviewForm::__construct()` (line 73), "Edit";
- `ResendRequestReviewerForm::__construct()` (line 62), "Resend Review
  Request".

```php
new FormValidatorDateCompare($this, 'reviewDueDate', Carbon::parse(…'responseDueDate'…),
    DateComparisonRule::GREATER_OR_EQUAL, 'required',   // 'optional' in EditReviewForm
    'editor.review.errorAddingReviewer.dateValidationFailed')
```

`locale/en/editor.po` has:

```
msgid "editor.review.errorAddingReviewer.dateValidationFailed"
msgstr "There was an error adding the reviewer as review due date must be equal or greater than responde due date."
```

When the check fails, `Form::validate()` posts the message as the page
notice (a form-error notification, `classes/form/Form.php` lines
320-327). "responde" has been in the English text since the key was
added.

`pkp/pkp-lib#9612` (for `pkp/pkp-lib#5885`) added the check, the key
and the guidance sentence `editor.review.importantDates.notice` to "Add
Reviewer" and "Edit". `pkp/pkp-lib#9896` (for `pkp/pkp-lib#4789`) added
the same check, with the same key, to the Resend form.

Reach:

- The 30 translations of the key (`lib/pkp/locale/*/editor.po`, read)
  all speak of adding the reviewer. None carries the typo.
- One more instance of the same mistake, which this fix leaves out: the
  "required" checks of "Edit" and "Resend Review Request"
  (`EditReviewForm` lines 63-64, `ResendRequestReviewerForm` lines
  53-54) answer an emptied date with `editor.review.errorAddingReviewer`,
  "There was an error adding the reviewer.  Please try again." It is
  left out because no existing key says "a date is missing" without
  naming an action, so it needs a new key and its translations. It was
  read in the code and not walked.

## Proposed fix

Give the three date-order checks the key that "Add Reviewer" and "Edit"
already show under "Important Dates", `editor.review.importantDates.notice`
("Review due date must be greater or equal to response due date."). It
names no action, it is spelled right, and 31 locales already translate
it. (The Resend window does not show the sentence yet;
[U27-A46](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A46-resend-inverted-dates-try-again-alert.md)
adds it there.) The change is one line in each of `ReviewerForm.php`,
`EditReviewForm.php` and `ResendRequestReviewerForm.php`, in full in
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/inverted-review-dates-notice-says-adding/fix.diff):

```diff
-                'editor.review.errorAddingReviewer.dateValidationFailed'
+                'editor.review.importantDates.notice'
```

After the fix, `editor.review.errorAddingReviewer.dateValidationFailed`
is used nowhere and can be removed from the locale files at the next
translation sync.

Tried on `main`, OJS and OMP. With the diff in, steps 3 to 6 refuse the
pair as before: the windows stay open and nothing is saved. The notice
in all three windows now reads "Review due date must be greater or equal
to response due date." As a control, "Edit" with the two dates equal
(a pair the rule allows) saved and closed the window with no refusal,
both with the diff in and without it.

**Alternatives**

- Correct the English text in place (for example "Review due date must
  be equal to or later than the response due date."). This fixes the
  typo, but the 30 translations keep "adding the reviewer" until each
  one is retranslated.
- A new message key per window. This adds more keys to translate for one
  rule, which the windows already state in one sentence.
- Move the three checks into the `HasReviewDueDate` trait, which "Add
  Reviewer" and "Resend" already use, so that the rule and its message
  live in one place. Worth doing when the grid code is removed
  (`pkp/pkp-lib#12826`), but it is more change than this wording needs.

**What goes with it**

- No stored data to repair.
- A test: in "Edit", pick a review due date before the response due date,
  press "OK", and read the notice.
- 3.5 has the same three lines (pkp-lib `stable-3_5_0`). The diff
  applies there with line offsets only.

Small: three one-line changes in pkp-lib, and a test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/inverted-review-dates-notice-says-adding/walk.js)
  (helpers in its `lib.js`). It takes steps 1 to 6 and records, for each
  window, the save's answer, the notice and any browser dialog. Its
  `WALK_MODE=neighbour` mode runs the equal-dates control in "Edit". The
  fix was tried by applying `fix.diff` to the OJS and OMP code and
  walking again on a freshly loaded dataset.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, as `phudson` and
  `dbarnes`, on PKP's default dataset (pkp/datasets 384e28b,
  2026-10-12), PostgreSQL. Each walk started from a freshly loaded
  dataset.
- The save's answers: the refused "Add Reviewer" and "Edit" saves
  answered `200` with `{"status":false,"content":""}`. The refused
  Resend save answered `200` with `{"status":false,"content":"There was
  an error requesting the reviewer to reconsider the review invitation.
  Please try again."}` (the text of the A46 alert). There was no server
  error and no script error.
- Tips: `main` OJS 7c6fba2064, OMP eb9381314, pkp-lib f4c2578c94 (both
  apps). `stable-3_5_0` OJS 5fc74d6213 (pkp-lib f4f8fcdbc0), OMP
  486cbf9eb (pkp-lib 8094f06bf5).
- 3.4 and 3.3 were read in the code (`git show origin/stable-3_4_0:…`
  and `origin/stable-3_3_0:…` in pkp-lib, 55c8e406b3 and 5e84acd11b).
  The reviewer forms have no `FormValidatorDateCompare` and there is no
  `dateValidationFailed` key, so an inverted pair is not refused there
  and this notice does not exist. The app tips (OJS daf0ca971d /
  d7d9dd14ec, OMP 0aec65441 / 8e72fc883) carry no reviewer forms of
  their own.
- Introduced: `git blame` on the three key lines. The English text
  blames to a523660d2b (`pkp/pkp-lib#11190`, "Restore mistakenly removed
  translation"), which put back the text of 41b38eb240 unchanged.
- Upstream search (2026-10-13, pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ui-library): "responde due date", "error adding the reviewer" due
  date, `dateValidationFailed`, review due date greater response due
  date, `ResendRequestReviewerForm`. Nothing reports the wording.
  `pkp/pkp-lib#12826` (open) plans to remove the grid code these forms
  belong to.
- MySQL not checked; the fault is in text, not in a query.
