# Saving a reviewer's "Edit" window silently takes a deactivated review form off the review

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/pkp-lib#3649` for `pkp/pkp-lib#3608` · [71ec2683ab](https://github.com/pkp/pkp-lib/commit/71ec2683ab6b18a701baf13f7b78a035385f4b1d) · 2018-04-26 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U29 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A journal or press deactivates a review form while a review request
still carries it. Deactivating promises only that the form "will no
longer be available for new review assignments". But when an editor
then opens that reviewer's "More Actions" › "Edit" window, its "Review
Form" list leaves the form out and shows "None / Free Form Review"
selected. Pressing "OK", even with nothing changed, takes the form off
the review, silently.

The reviewer's "3. Download & Review" step then shows the free-text
boxes instead of the form's questions, and the answers already saved
there disappear from it. The answers come back if the form is attached
again while it still exists: a manager activates it again and the
editor attaches it again in the same window. But the form now reads 0
under "In Review" and "Completed" and offers "Delete", as for a form no
one uses. Deleting it, which that count invites, removes the reviewer's
saved answers for good.

It needs a form deactivated while a request carrying it is still open.
That is how a journal revises a form in use: a form in use cannot be
edited, so the journal copies it, edits the copy and deactivates the
old one. Any later "OK" in the window, such as one to move a due date,
then detaches the old form.

## Impact

- **Lost**: the review form on a review in progress, and with it the
  reviewer's saved answers, which no screen shows any more. They come
  back only if the form is attached again; once the form is deleted,
  they are gone for good.
- **Who**: editors of a journal or press that uses review forms, the
  first time they press "OK" in the "Edit" window of a request whose
  form was deactivated after it was attached; the reviewer of that
  request, who then writes free text instead of the journal's
  questions.
- **Way round**: none in the window, which does not offer the form.
  Once someone notices, and only while the form exists, a manager
  activates it again and the editor attaches it again.

Medium: a review in progress loses its form and the reviewer's work
silently, and deleting the unused-looking form makes the loss final,
but only in a state that is not met every day. It would be high if it
reached reviews without that state, for example if deactivating alone
detached the form.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS or OMP (the context `publicknowledge`).
- The dataset has no review form, so steps 1 and 2 make two.
- On OJS, submission 12, "Sodium butyrate improves growth performance
  of weaned piglets during the first period after weaning"; on OMP,
  submission 17, "Open Development: Networked Innovations in
  International Development". Julie Janssen (`jjanssen`) has an
  unanswered review request on both.

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`). Open Settings ›
   Workflow › "Review" › "Review Forms", press "Create Review Form",
   type the Title "u29w3 form A" and press "Save". On its row press
   "Edit", open "Form Items", press "Create New Item", type the Item
   "u29w3 question", choose "Extended text box" and press "Save". Close
   the window. Tick the row's "Active" box and press "OK".
2. Make "u29w3 form B" the same way, with the Item "u29w3 other
   question", and make it active.
3. Open the submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`,
   17 on OMP). On Julie Janssen's row choose "More Actions" › "Edit",
   choose "u29w3 form A" under "Review Form" and press "OK".
4. Sign in as `jjanssen` (password `jjanssenjjanssen`) and open the
   review (`/index.php/publicknowledge/en/reviewer/submission/12`, 17 on
   OMP). Press "Accept Review, Continue to Step #2", then "Continue to
   Step #3". Type "u29w3 answer" into "u29w3 question" and press "Save
   for Later".
5. Sign in as `dbarnes`. Open "Review Forms": "u29w3 form A" reads 1
   under "In Review". Untick its "Active" box and press "OK" on "Are you
   sure you wish to deactivate this review form? It will no longer be
   available for new review assignments."
6. Open the submission's workflow again and choose "More Actions" ›
   "Edit" on Julie Janssen's row. Read "Review Form".
7. Press "OK" without changing anything.
8. Open "Review Forms" and read "u29w3 form A"'s row.
9. Sign in as `jjanssen` and open the review again.

Deleting the old form, from step 7 on:

10. Sign in as `rvaca` (password `rvacarvaca`). Open "Review Forms",
    press "Delete" on "u29w3 form A" and "OK" on "Are you sure you wish
    to delete this review form?".
11. Sign in as `jjanssen` and open the review again.
12. Sign in as `dbarnes` and open "Edit" on Julie Janssen's row again.

**Expected**: at step 6 "Review Form" shows "u29w3 form A" selected,
the form the request carries. Step 7 leaves it on the review. At step 8
"u29w3 form A" still reads 1 under "In Review". At step 9 the review's
third step still asks "u29w3 question", with "u29w3 answer" in its box.
Step 10 cannot be taken: a form a review still carries offers only
"Copy" and "Preview".

**Observed**: at step 6 "Review Form" lists "None / Free Form Review",
selected, and "u29w3 form B"; "u29w3 form A" is not in the list. At
step 7 the window closes as after any save, with no message. At step 8
"u29w3 form A" reads 0 under "In Review" and 0 under "Completed", and
its row offers "Edit", "Copy", "Preview" and "Delete", as for a form no
one uses. At step 9 "3. Download & Review" has no "u29w3 question" and
no answer; it shows the free-text boxes "For author and editor" and
"For editor" ("For editor only" on OMP).

After the deletion (walked on OJS): at step 10 the list holds only
"u29w3 form B". At step 11 the review shows the free-text boxes, as at
step 9. At step 12 "Review Form" lists "None / Free Form Review" and
"u29w3 form B": the form can no longer be attached again. The
reviewer's saved answer is no longer stored.

## Cause

`EditReviewForm` builds the window's "Review Form" list from the active
forms only, and its save takes whatever the list posts as the review's
form. In `lib/pkp/controllers/grid/users/reviewer/form/EditReviewForm.php`,
`fetch()` (line 109) reads
`$reviewFormDao->getActiveByAssocId(...)` and assigns it with
`'reviewFormId' => $this->_reviewAssignment->getReviewFormId()` as the
selected value. A deactivated form is not among the options, so the
browser selects the first one, "None / Free Form Review" (value `0`).
`execute()` (lines 207 to 213) then reads the posted `reviewFormId`,
finds no form with ID 0 and stores `null`:

```php
$reviewFormId = (int) $this->getData('reviewFormId');
$reviewForm = $reviewFormDao->getById($reviewFormId, Application::getContextAssocType(), $context->getId());
$reviewNewParams['reviewFormId'] = $reviewForm ? $reviewFormId : null;
```

When no form is active at all, the template
(`editReviewForm.tpl`, `{if $reviewForms}`) shows no list, nothing is
posted, and the same lines store `null`. That breaks the rule
deactivation sets: an inactive form is withheld from new assignments,
and assignments already carrying it keep it (the confirmation's own
words, and the reviewer's step 3, which reads the form by ID whatever
its state).

The list came with `pkp/pkp-lib#3608` ("edit review assignment to add
review form"), which let editors attach a form after the request was
sent. Before it the window did not touch the form.

Reach:

- Every request not yet completed is affected, unanswered or accepted
  (accepted walked, unanswered from the code): `fetch()` and
  `execute()` test only the completion date. "Edit" is offered on a
  completed review too (`useReviewerManagerConfig.js`
  `getItemActions()`, every state but cancelled), but there the window
  has no "Review Form" list and the save leaves the form alone, so a
  completed review keeps its form and the editor's view of its answers
  is unchanged (code).
- The reviewer's saved answers stay in `review_form_responses` after
  the detach, but step 3 (`PKPReviewerReviewStep3Form::fetch()`) reads
  them only while the review carries a form (code; the row was still
  there after the walk).
- The form's counts (`ReviewFormDAO`, `incomplete_count`) follow the
  assignment, so the form reads 0 / 0 and its row offers "Edit" and
  "Delete" (seen on screen). "Delete"
  (`ReviewFormGridHandler::deleteReviewForm()`, guarded by both counts
  being 0) runs `ReviewFormDAO::deleteById()`, which deletes the items
  (`ReviewFormElementDAO::deleteByReviewFormId()`) and with each item
  its answers (`ReviewFormResponseDAO::deleteByReviewFormElementId()`)
  (walked on OJS: the stored answer went from 1 row to 0). Deleting an
  item in "Edit" › "Form Items"
  (`ReviewFormElementsGridHandler::deleteReviewFormElement()`, guarded
  by `unusedReviewFormExists()`) deletes that item's answers the same
  way (code).
- Add Reviewer (`ReviewerForm::fetch()`) and a journal section's
  "Review Form" list (`SectionForm::fetch()`, OJS) also offer active
  forms only, which is right for lists that choose a form for new
  requests. Out of scope here: `SectionForm::execute()` (OJS, lines
  167 to 172) stores the posted value, so saving a section whose
  default form was deactivated silently clears that default, a
  separate fault (code).
- A preprint server has no review stage.

## Proposed fix

In `EditReviewForm::fetch()`, add the form the request carries to the
list when it is not active, so the window shows it selected and "OK"
posts it back. The save already accepts any form of the context, so
nothing else changes. The proposal is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-review-drops-deactivated-form/fix.diff):

```diff
             while ($reviewForm = $reviewFormsIterator->next()) {
                 $reviewForms[$reviewForm->getId()] = $reviewForm->getLocalizedTitle();
             }
+            // A form deactivated after it was given keeps serving this assignment
+            // (deactivation only withholds it from new ones): list it too, so the
+            // window shows it and saving the window keeps it.
+            $currentReviewFormId = $this->_reviewAssignment->getReviewFormId();
+            if ($currentReviewFormId && !isset($reviewForms[$currentReviewFormId])) {
+                $currentReviewForm = $reviewFormDao->getById($currentReviewFormId, Application::getContextAssocType(), $context->getId());
+                if ($currentReviewForm) {
+                    $reviewForms[$currentReviewFormId] = $currentReviewForm->getLocalizedTitle();
+                }
+            }
```

With a form on the request the list is never empty, so the template's
"no list" case is left only for a request with no form and no active
form, where storing `null` changes nothing. The lookup is the one
`execute()` already makes (`getById()` with the context), and it keeps
the intent of `pkp/pkp-lib#3608`: an editor can still attach, change
or remove a form while the review is open. One design point stays open
for the team: the kept form could be labelled as inactive in the list,
since moving a request off it cannot be undone from the window.

The fix was tried on `main`, OJS and OMP, and the walk showed the
Expected. To check it reaches no further, Paul Hudson's request on the
same submission, which has no form, was opened in the same window with
the fix in and out: both times it listed only "None / Free Form Review"
and "u29w3 form B", and "OK" left the request with no form.

**Alternatives**:

- Make `execute()` keep the current form when `reviewFormId` is not
  posted: it covers only the no-active-form case. With other forms
  active, the window still posts "None" and still shows the wrong
  choice.
- List every form, active or not: it offers deactivated forms for
  requests that never had them, which deactivation is meant to stop.
- A server-side guard as well, accepting in `execute()` only an active
  form or the one the request already carries: optional, since the
  window then offers nothing else. The code base has the precedent:
  `api/v1/submissions/reviewAssignments/formRequests/EditReview.php`
  (lines 80 to 83) accepts a `reviewerRecommendationId` that is active
  or the one the assignment carries.

**What goes with it**:

- Data: reviews already detached this way cannot be told apart from
  reviews that never had a form, so there is no repair. Their saved
  answers stay stored, while the form exists, and show again if the
  form is attached again.
- Backport: the same code is on 3.5, 3.4 and 3.3 (3.3's
  `EditReviewForm.inc.php`), and the diff's few lines carry over.
- Test: an e2e scenario in spec U29 (deactivate a form a request
  carries, save the reviewer's "Edit" window, check the form stays).

Small: a few lines in one method, using the lookup the save already
makes, with one test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/edit-review-drops-deactivated-form/walk.js)
  (helpers in `lib.js` beside it, and U28 A14's
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/lib.js)
  for making a form, attaching it and opening step 3). It takes the
  Steps through the screens on PKP's default test dataset;
  `MODE=delete` takes steps 1 to 7 and then the deletion steps, and
  `MODE=nb` runs the check on Paul Hudson's request alone. Run from pkp-e2e on a dataset fleet:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp shared/playwright/checks/issues/edit-review-drops-deactivated-form/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on `main` and 3.5, OJS and OMP, on PostgreSQL: the same
  Observed on all four. The window's "OK" answered 200 with "Review
  Form" posted as `0`, the request's stored form went from the form's
  ID to empty, and no request failed and no script error was logged.
  A database read beside the walk also showed the reviewer's saved
  answer still stored after the walk (OMP, `main`). The deletion steps
  were walked on OJS `main` only: a database read beside them counted
  the request's stored answers, 1 before "Delete" and 0 after.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04), OMP 3b0ecf794 (lib/pkp
  3dc90c81a6);
  3.5 OJS c1cee76b95 (lib/pkp 771474347e), OMP 9c5e24246 (lib/pkp
  cf3f984335); 3.4 OJS d68934d0d1, OMP 0aec65441, lib/pkp 767353f4fe;
  3.3 OJS ac77c9fb35, OMP 8e72fc883, lib/pkp ac3fa73402. Datasets:
  pkp/datasets 1a5552c (2026-10-04).
- Code reads: `EditReviewForm` `fetch()` and `execute()` and
  `editReviewForm.tpl` on every line: on 3.5 the same lines as `main`
  (3.5 lacks only the "Publicly Show Reviewer Comments" box); on 3.4
  (`EditReviewForm.php`) and 3.3 (`EditReviewForm.inc.php`) the same
  active-only list and the same save; `71ec2683ab` is on both branches.
  `ReviewerForm`, `SectionForm`, `PKPReviewerReviewStep3Form`,
  `ReviewFormGridHandler`, `ReviewFormElementsGridHandler`,
  `ReviewFormDAO`, `ReviewFormElementDAO` and ui-library's
  `useReviewerManagerConfig.js` on `main` for the reach.
- Introduced: `git blame` on `main` gives a PSR-12 reformat
  (`e3f570bc37`, `pkp/pkp-lib#5678`) for `fetch()` and the save, and
  `0a492918f1` (`pkp/pkp-lib#8887`) for the save's last line, which
  only moved it to `Repo::reviewAssignment()->edit()`; the file's log
  before them leads to `71ec2683ab`, which added the list and the save.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/edit-review-drops-deactivated-form/fix.diff ojs`
  (then `omp`), the walk as above, then `MODE=nb` with the fix in and
  after `node bin/try-fix.js revert … ojs` (`omp`).
- Not driven: 3.4 and 3.3 (code, as asked); the way round (activating
  the form again and attaching it again) and whether the saved answers
  then show again (code); the deletion on OMP and on 3.5 (code: the
  same pkp-lib handlers); deleting an item of the form (code); whether
  submitting the free-text review removes the stored answers.
- MySQL not checked; nothing here depends on the database.
