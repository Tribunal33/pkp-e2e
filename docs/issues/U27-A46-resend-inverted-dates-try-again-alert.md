# "Resend Review Request" with the review due date before the response date shows a "Please try again" alert, and the window never states the date rule

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the Resend window has no dates)
  - 3.3: none (code; no "Resend Review Request")
- **Introduced** `pkp/pkp-lib#9896` for `pkp/pkp-lib#4789` · [924e208ada](https://github.com/pkp/pkp-lib/commit/924e208ada664a4b7dc5f2dd5f9012b0db445e86) · merged 2024-10-10 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U27 [A46](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#a46)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In the "Resend Review Request" window, an editor who sets the review due
date before the response due date and presses "Resend Review Request"
gets two messages. A short-lived notice at the top right of the page
refuses the dates. A browser alert also opens: "There was an error
requesting the reviewer to reconsider the review invitation. Please try
again." "Try again" suggests a temporary failure, but the only problem
is the dates. Unlike "Add Reviewer" and "Edit", this window never shows
the guidance "Review due date must be greater or equal to response due
date.", so the editor learns the rule only when the request is refused.

## Impact

- **Lost**: nothing. The request is not re-sent, the window stays open
  with the dates as picked, and Paul Hudson's row (in the Steps) still
  reads "Request Declined". The editor is pointed the wrong way: the
  alert says to try again, and trying again with the same dates gives
  the same alert.
- **Who**: editors of every journal and press who re-send a declined
  review request and change its dates so that the review due date comes
  before the response due date. The window opens with a valid pair
  prefilled. OPS has no review stage, so it has no such window.
- **Way round**: dismiss the alert, set the review due date on or after
  the response due date, and press "Resend Review Request" again. The
  notice names the two dates (in the wording reported in
  [U27-A45-inverted-review-dates-notice-says-adding.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U27-A45-inverted-review-dates-notice-says-adding.md)),
  but it disappears after a few seconds.

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
  (step 2).

1. Sign in as `phudson`. Open his review request for submission 12,
   "Sodium butyrate improves growth performance of weaned piglets
   during the first period after weaning"
   (`/index.php/publicknowledge/en/reviewer/submission/12`). Press
   "Decline Review Request", press "Decline Review Request" in the
   window, and sign out.
2. Sign in as `dbarnes` and open submission 12
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`).
3. On Julie Janssen's row, open "More Actions" and choose "Edit". Under
   "Important Dates" the window reads "Review due date must be greater
   or equal to response due date." Press "Cancel".
4. On Paul Hudson's row ("Request Declined"), open "More Actions" and
   choose "Resend Review Request". Read the "Important Dates" section.
5. Click "Response Due Date" and pick a date three weeks from today in
   the calendar that opens. Do the same for "Review Due Date" with a
   date two weeks from today (on the walk: 2026-11-03 and 2026-10-27).
   Press "Resend Review Request".

**Expected.** In step 4, the window states the date rule under
"Important Dates", as "Edit" does in step 3. In step 5, the pair is
refused with the notice at the top right only, and no browser alert
opens.

**Observed.** In step 4, "Important Dates" shows only the two date
fields, with no guidance sentence. In step 5, the notice at the top
right reads "There was an error adding the reviewer as review due date
must be equal or greater than responde due date.", and a browser alert
also opens:

```
There was an error requesting the reviewer to reconsider the review invitation.  Please try again.
```

The request is not re-sent. The save's answer is `200` with:

```
{"status":false,"content":"There was an error requesting the reviewer to reconsider the review invitation.  Please try again.", …}
```

## Cause

`pkp/pkp-lib#9612` (commit 41b38eb240, 2024-08-30) gave "Add Reviewer"
and "Edit" a date-order check, a refusal that leaves the message to the
page notice, and the guidance sentence. `pkp/pkp-lib#9896` (commit
924e208ada, written 2024-09-02 and merged 2024-10-10) added the same
check to the Resend form but not the other two parts:

1. **The alert.** `PKPReviewerGridHandler::updateResendRequestReviewer()`
   (pkp-lib
   `classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php`,
   line 641) answers any failed validation with its own text:

   ```php
   if (!$resendRequestReviewerForm->validate()) {
       return new JSONMessage(false, __('editor.review.errorResendingReviewerRequest'));
   }
   ```

   `Handler.handleJson()` (`js/classes/Handler.js`, line 391) shows the
   content of any `status: false` answer with `alert()`.
   `Form::validate()` has already posted the failed check's message as
   the page notice, whatever the handler answers, so the editor gets
   both. The handlers of "Add Reviewer" (`saveReviewerForm()`, line
   422, called by `updateReviewer()`) and "Edit" (`updateReview()`,
   line 460) answer `new JSONMessage(false)` and leave the refusal to
   the notice. The Resend line dates from the first Resend form
   (79daa4200a, 2022). Until 924e208ada, the only checks behind it
   were the form's POST and CSRF checks, which no editor input can
   fail.
2. **The missing guidance.** `resendRequestReviewerForm.tpl` (line 37)
   opens its dates section with
   `{fbvFormSection title="editor.review.importantDates"}`. The
   sections of "Edit" (`editReviewForm.tpl`, line 26) and "Add
   Reviewer" (`reviewerFormFooter.tpl`, line 32) also carry
   `description="editor.review.importantDates.notice"`, which #9612
   added.

Reach:

- OJS and OMP share the handler and the template from pkp-lib. Each
  app's `ReviewerGridHandler` subclass leaves
  `updateResendRequestReviewer()` alone.
- The other row actions that refuse with `JSONMessage(false, …)` are
  "Reinstate Reviewer" (line 582), "Unassign Reviewer" and "Cancel
  Reviewer" (line 705), "Thank Reviewer" (line 920) and "Send Reminder"
  (line 970). Their forms check only the POST and CSRF token, so no
  editor input reaches their alerts (read in the code).

## Proposed fix

Make the Resend window refuse and guide the way "Edit" does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-inverted-dates-try-again-alert/fix.diff)):

```diff
--- a/lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php
+++ b/lib/pkp/classes/controllers/grid/users/reviewer/PKPReviewerGridHandler.php
@@ -638,7 +638,7 @@
         $resendRequestReviewerForm->readInputData();
 
         if (!$resendRequestReviewerForm->validate()) {
-            return new JSONMessage(false, __('editor.review.errorResendingReviewerRequest'));
+            return new JSONMessage(false);
         }
 
         // Create mailable and send email
--- a/lib/pkp/templates/controllers/grid/users/reviewer/form/resendRequestReviewerForm.tpl
+++ b/lib/pkp/templates/controllers/grid/users/reviewer/form/resendRequestReviewerForm.tpl
@@ -34,7 +34,7 @@
 		{fbvElement type="checkbox" id="skipEmail" name="skipEmail" label="editor.review.skipEmail"}
 	{/fbvFormSection}
 
-	{fbvFormSection title="editor.review.importantDates"}
+	{fbvFormSection title="editor.review.importantDates" description="editor.review.importantDates.notice"}
 		{fbvElement type="text" id="responseDueDate" name="responseDueDate" label="submission.task.responseDueDate" value=$responseDueDate inline=true size=$fbvStyles.size.MEDIUM class="datepicker"}
 		{fbvElement type="text" id="reviewDueDate" name="reviewDueDate" label="editor.review.reviewDueDate" value=$reviewDueDate inline=true size=$fbvStyles.size.MEDIUM class="datepicker"}
 	{/fbvFormSection}
```

After the fix, `editor.review.errorResendingReviewerRequest` is used
nowhere and can be removed from the locale files at the next
translation sync.

Tried on `main`, OJS and OMP. With the diff in, step 4's window reads
"Review due date must be greater or equal to response due date." under
"Important Dates", and step 5 shows the notice only, with no alert. As a
control, Resend with the review due date after the response due date
re-sent the request ("Request to reconsider the review assignment was
sent.", and the row read "Request Resent") with no dialog, both with
the diff in and without it.

**Alternatives**

- Keep the handler's message but reword it to name the dates. The
  window would still show a modal alert on top of the notice, which
  the two sibling windows do not.
- Leave the alert and add only the guidance. The editor would still be
  told to "try again".

**What goes with it**

- No stored data to repair.
- A test: in "Resend Review Request", pick a review due date before the
  response due date, press the button, and assert that no dialog opens
  and that the window shows the guidance sentence.
- 3.5 has the same handler line and template (pkp-lib `stable-3_5_0`,
  `PKPReviewerGridHandler.php` line 619 at OJS's pointer and line 627 at
  OMP's), so the diff backports with only a line-offset change.
- `pkp/pkp-lib#12826` (open) plans to remove this grid code. A
  replacement window should keep the guidance and the single refusal.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/resend-inverted-dates-try-again-alert/walk.js)
  (helpers in its `lib.js`), run in pkp-e2e's harness with
  `node bin/probe.js ojs,omp shared/playwright/checks/issues/resend-inverted-dates-try-again-alert/walk.js`.
  It takes steps 1 to 5 and records each window's "Important Dates"
  text, the save's answer, the notice and every browser dialog. Its
  `WALK_MODE=neighbour` mode runs the valid-dates control.
- Walked on `main` and `stable-3_5_0`, OJS and OMP, as `phudson` and
  `dbarnes`, on PKP's default dataset (pkp/datasets 384e28b,
  2026-10-12), PostgreSQL. Each walk started from a freshly loaded
  dataset. There was no server error and no script error. The alert is
  a native `alert()`, recorded by the browser's dialog event.
- Tips: `main` OJS 7c6fba2064, OMP eb9381314, pkp-lib f4c2578c94 (both
  apps). `stable-3_5_0` OJS 5fc74d6213 (pkp-lib f4f8fcdbc0), OMP
  486cbf9eb (pkp-lib 8094f06bf5).
- 3.4, read in the code (pkp-lib `origin/stable-3_4_0`, 55c8e406b3): the
  handler has the same `JSONMessage(false, …)` line (625), but
  `resendRequestReviewerForm.tpl` has only the message and the
  skip-email box, with no dates and no check an editor can fail.
- 3.3, read in the code (pkp-lib `origin/stable-3_3_0`, 5e84acd11b): no
  `resendRequestReviewerForm.tpl` and no `updateResendRequestReviewer`.
- The app tips for 3.4 and 3.3 (OJS daf0ca971d / d7d9dd14ec, OMP
  0aec65441 / 8e72fc883) each carry a `ReviewerGridHandler` subclass,
  and none of them overrides the Resend method.
- Introduced: `git blame` on the Resend check (lines 55-63 of
  `ResendRequestReviewerForm.php`) gives 924e208ada. The template's
  dates section blames to bb5b711fda (2024-04-18, `pkp/pkp-lib#4789`).
- Upstream search (2026-10-13, pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ui-library): resend review request due date error,
  `errorResendingReviewerRequest`, reconsider review invitation alert,
  `ResendRequestReviewerForm`. Only `pkp/pkp-lib#8242` (the original
  Resend PR), `#8311`/`#8312` (a fatal error, fixed) and `#12826` (grid
  removal, open) came up. None of them is this fault.
