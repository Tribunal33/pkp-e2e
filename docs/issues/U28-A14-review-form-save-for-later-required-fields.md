# Typing a first answer on a review form shows the reviewer "Please fill in required fields."; "Save for Later" then shows its notice beside it

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; the review's third step has no such box)
  - 3.3: none (code; the review's third step has no such box)
- **Introduced** `pkp/pkp-lib#12515` for `pkp/pkp-lib#11760` · [21941ebcc2](https://github.com/pkp/pkp-lib/commit/21941ebcc204f470d6bff39c7d1e0aa6ed8a40cc)
  on 3.5, forward-ported to `main` as [93f6c0bf44](https://github.com/pkp/pkp-lib/commit/93f6c0bf44259c5d59554e294336b8c5596cd347) · 2026-04-02 · Blesilda Biazon (blesildaramirez)
- **Upstream** no issue reports this fault (2026-10-02); the QA
  sign-off on `pkp/pkp-lib#11760`, the introducing issue, lists the
  behaviour as expected. `pkp/pkp-lib#12534` (open; PR
  `pkp/pkp-lib#12561`, not yet in main) rebuilds the step in Vue on
  `main` and deletes the script at fault, which ends this fault on
  `main` when it lands (the rebuilt step itself was not read); 3.5
  keeps the script
- **Tracked in** spec U28 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a14)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A reviewer whose review uses a review form types a first answer on the
review's third step, "3. Download & Review". At once the step shows
the box "Please fill in required fields." / "Some required fields are
not filled in. Please complete them before submitting your review."
under the buttons, and "This field is required." under every required
question not yet answered. On a journal the same mark also shows under
"Recommendation". These are the messages of a refused "Submit Review",
and the reviewer has pressed nothing.

"Save for Later" is not what brings the messages: pressed afterwards,
it shows "Your changes have been saved." beside them. The save goes
through, a reload shows the saved answers without the messages, and
the review can be finished and submitted.

It shows on a review form with a required question, and on a journal
on every review form, because "Recommendation" counts as a required
answer. A review without a review form is not affected.

The QA of the change that brought the box in accepted the messages
appearing after the first answer. This report asks the team to decide
whether that stands, and proposes the fix for the case that it does
not.

## Impact

- **Lost**: nothing.
- **Who**: a reviewer whose review uses a review form (on a press, one
  with a required question), at the first key typed or answer chosen.
- **Way round**: none is needed; the messages go when every required
  answer is given, or on a reload.

Low: the task gets done; the fault is a refusal shown when nothing was
refused. The effort is small: one line in one pkp-lib script, needed
on 3.5 in any case and on `main` until the rebuild lands.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`).
- The dataset has no review form, so steps 1 to 4 make one and give it
  to a reviewer.
- On OJS, submission 12, "Sodium butyrate improves growth performance
  of weaned piglets during the first period after weaning"; on OMP,
  submission 17, "Open Development: Networked Innovations in
  International Development". `jjanssen` has an unanswered review
  request on both.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open Settings ›
   Workflow › "Review" › "Review Forms", press "Create Review Form",
   type the Title "u28i review form" and press "Save".
2. On the form's row press "Edit", open the "Form Items" tab and press
   "Create New Item": Item "u28i comments", Item type "Extended text
   box", "Save". Press "Create New Item" again: Item "u28i verdict",
   tick "Reviewers required to complete item", Item type "Single line
   text box", "Save". Close the window.
3. Tick the row's "Active" box and press "OK".
4. Open the submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`,
   17 on OMP). On Julie Janssen's row choose "Edit", choose "u28i
   review form" under "Review Form" and press "OK".
5. Sign in as `jjanssen` (password `jjanssenjjanssen`) and open the
   review (`/index.php/publicknowledge/en/reviewer/submission/12`, 17
   on OMP). Press "Accept Review, Continue to Step #2" (tick the
   privacy box when it shows), then "Continue to Step #3".
6. Type "u28i first notes" into "u28i comments". Leave "u28i verdict"
   empty.
7. Press "Save for Later".
8. Reload the page.

**Expected**: after step 6 the step shows no message. After step 7 it
shows "Your changes have been saved." and nothing else: the review was
saved, not submitted. After step 8 the typed text is in its box.

**Observed**: after step 6, with no button pressed, this box shows
under the buttons:

```
Please fill in required fields.
Some required fields are not filled in. Please complete them before submitting your review.
```

and "This field is required." shows under "u28i verdict" and, on OJS,
under "Recommendation" (which reads "Choose One"). After step 7 the
notice "Your changes have been saved." shows, and the box and the
marks stay. The form was posted with the typed text and answered
`"status": true`. After step 8 "u28i comments" holds "u28i first
notes", and the box and the marks are gone.

On OMP the box's first line is
`##reviewer.submission.reviewFormResponse.form.responseRequired##`
(spec U28 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#omp3)),
and the step has no "Recommendation".

Control: Paul Hudson, given the form on the same submission as in step
4, signs in as `phudson`, reaches the third step as in step 5 and
presses "Save for Later" before typing anything: "Your changes have
been saved." shows alone.

## Cause

The handler written to hide the refusal box runs a full validation,
and that validation shows the box.
`lib/pkp/js/pages/reviewer/reviewStep3Required.js`, loaded on the
review's third step when the review has a review form, shows `#reviewStep3MessageBox` on
jQuery Validation's `invalid-form` event and tries to hide it again
once the form is complete (lines 51 to 56):

```js
// Hide warning box when form becomes valid again
$form.on('change keyup', ':input', function() {
    if ($form.valid && $form.valid()) {
        $box.hide();
    }
});
```

On a form, `$form.valid()` runs
`validator.form()`, which checks every field, shows every error and,
when one is found, fires `invalid-form`. So each key typed and each
answer chosen validates the whole form as a submit does: the marks
appear under every unanswered required field, and the script's own
`invalid-form` handler shows the box.

On OJS the "Recommendation" list is rendered with `required`
(`required=$required|default:true` in OJS's
`templates/reviewer/review/reviewerRecommendations.tpl`; step 3 passes
no `$required`). `updateRecommendationRequired_()` in
`lib/pkp/js/controllers/form/reviewer/ReviewerReviewStep3FormHandler.js`
takes it off when "Save for Later" is pressed and puts it back when
"Submit Review" is pressed. So the form is invalid while the list reads
"Choose One", whatever the review form asks.

"Save for Later" is not the trigger. The script sets
`validator.cancelSubmit` on that button, so the press validates
nothing and the save goes out; the messages on screen are those the
typing left. The server answers with a data-changed event and no new
form, so nothing redraws the step until a reload.

Reach:

- A journal's review form without a required question: the box, and
  the mark under "Recommendation". Not walked: read in the code, where
  "Recommendation" alone makes the form invalid; the walk of the Steps
  saw that mark.
- A press's review form without a required question: no message
  (code: nothing on the form is required).
- A refused "Submit Review" followed by "Save for Later": the box and
  the marks of the refusal stay beside "Your changes have been saved."
  (walked). Here a submit did ask for them, and they go when the
  answers are given.
- A review without a review form: the script is not loaded
  (`PKPReviewerHandler::submission()` adds it only when the assignment
  has a review form); "Save for Later" shows the notice alone (walked).

## Proposed fix

Ask the validator without showing anything, and only while the box is
shown
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/fix.diff)):

```diff
-    // Hide warning box when form becomes valid again
+    // Hide warning box when form becomes valid again. checkForm() only
+    // checks: valid() would validate the whole form, mark every unanswered
+    // required field and fire invalid-form (the box) at the first answer.
     $form.on('change keyup', ':input', function() {
-        if ($form.valid && $form.valid()) {
+        if ($box.is(':visible') && validator.checkForm()) {
             $box.hide();
         }
     });
```

`validator.checkForm()` checks every field and returns the result
without showing errors or firing `invalid-form`. `FormHandler` uses it
the same way, for its "Initial form validation" and in `showErrors()`.
The box is still shown by a refused "Submit Review" and still hidden
once every required answer is given, which is what
`pkp/pkp-lib#11760` asked for.

Tried on `main`, OJS and OMP. With the fix, typing the first answer
shows no message and "Save for Later" shows "Your changes have been
saved." alone. With the fix and without, "Submit Review" and "OK"
with "u28i verdict" empty is refused with the box and the marks, and
they go once the answer is typed (on OJS once "Recommendation" is
chosen too).

**Alternatives**

- Remove the hiding handler and leave the box until the next submit.
  Simpler, but the box would stay after every answer is given.
- Wait for the Vue rebuild of step 3 (`pkp/pkp-lib#12534`). It removes
  the script on `main`; 3.5 would keep the fault.

**What goes with it**

- Backport: the file is the same on `stable-3_5_0`, so the diff applies
  as written. Not tried there.
- No bundle to rebuild: the script is loaded by its own address and is
  not in `registry/minifiedScripts.txt`.
- No stored data, API or plugin hook is involved.
- Left as it is: the box and marks that stay after a refused submit
  followed by "Save for Later". Hiding them on that press would be one
  more line in the script's `saveFormButton` handler; the team decides.
- Guard: an e2e scenario in pkp-e2e that types a first answer on a
  review form with a required question and expects no message, then
  "Save for Later" and the notice alone.

Small: one line in one script.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/lib.js).
  It takes the Steps on an install loaded from the default dataset
  (pkp/datasets e8dafbc, 2026-10-02; PostgreSQL) and records, after
  each of steps 5 to 8, the box, the marks, the answers and the
  notices, and what "Save for Later" posted:
  `PROBE_FEATURE=issues-u28i PROBE_AGENT=u28i node bin/probe.js ojs,omp shared/playwright/checks/issues/review-form-save-for-later-required-fields/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5).
  `MODE=nb` in front runs alone a second walk of the adjacent cases,
  as `phudson` with the same form: "Save for Later" with nothing typed (the Control), a
  refused "Submit Review", "Save for Later" after it, the answers
  given, and `jjanssen`'s "Save for Later" on a review without a form.
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02; the
  3.5 walk showed the same as `main` at every step.
- Fix trial on `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/review-form-save-for-later-required-fields/fix.diff ojs omp`,
  both walks, `revert`.
- Branch tips the walks and code reads were made on. `main`: OJS
  b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
  3dc90c81a6). `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335). `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, lib/pkp
  6f96165c90. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, lib/pkp
  4156e50233.
- Code read on `main` and 3.5: `reviewStep3Required.js` (identical on
  both and in OJS's and OMP's lib/pkp), `PKPReviewerHandler` (where the
  script is added), `step3.tpl` and `reviewFormResponse.tpl`,
  `ReviewerReviewStep3FormHandler.js`, `FormHandler.js` (validator
  set-up, `showErrors()`, `checkForm()` uses),
  `PKPReviewerHandler::saveStep()`, and `valid()`, `form()` and
  `checkForm()` in jquery-validation 1.21.0 (`main`).
- Code read on 3.4 and 3.3: neither branch has
  `reviewStep3Required.js` or `#reviewStep3MessageBox` in `step3.tpl`,
  and nothing under `js/` or `templates/reviewer` listens for
  `invalid-form`.
- Other instances: `.valid()` on a form appears once more in pkp-lib's
  scripts, in `FileUploadFormHandler.js`, where showing the errors
  after an upload is the purpose; nothing else listens for
  `invalid-form`.
- Kind: before the change a first answer showed no message (3.4, and
  3.5 until April 2026; code), and the change brought the messages, so
  REPORT's "regression" fits. The change's QA saw and accepted them
  (below); if the team holds to that, nothing broke and the report is a
  request to change accepted behaviour. `pkp/pkp-lib#12496`, the first
  PR against `main`, was closed unmerged; the `main` commit is the
  forward-port of `pkp/pkp-lib#12515`.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for review form required fields,
  "Please fill in required fields", "Save for Later" review form
  required, "This field is required" typing, `reviewStep3Required`,
  `reviewStep3MessageBox`, `responseRequired`. No issue reports this
  fault. In `pkp/pkp-lib#11760` the QA sign-off of 2026-04-01 lists the
  behaviour as item 7, marked as passing: "Although it is expected it
  will now validate all required fields after one field has been
  entered and prompts user to fill them in."
  (<https://github.com/pkp/pkp-lib/issues/11760#issuecomment-4171996413>);
  `pkp/pkp-lib#12561` (open, last
  updated 2026-07-29) deletes `reviewStep3Required.js` and
  `ReviewerReviewStep3FormHandler.js`; the rebuilt step was not read.
  `pkp/pkp-lib#11390` (closed) was
  "Save for Later" blocked by a required field, another fault.
- Not driven: a review form without a required question (code); an
  answer chosen in a radio group, checkbox or list as the first answer
  (the handler listens for `change` as for `keyup`; code); the fix on
  3.5; 3.4 and 3.3; OPS (no review).
- Unverified: that the rebuilt step of `pkp/pkp-lib#12561` shows no
  such message at the first answer.
