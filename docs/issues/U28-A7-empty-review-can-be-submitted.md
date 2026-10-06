# Reviewer's step 3 on a journal says a review or file is required, yet an empty review is submitted

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS (OMP none: the press's step states no rule)
  - 3.5: OJS (OMP none, as on main)
  - 3.4: OJS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pkp-lib#1191` (no issue linked) · [d608dee64e](https://github.com/pkp/pkp-lib/commit/d608dee64e246788664b9ecfe5406edcb1916cce) · 2016-02-23 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#11418` (open), covering the journal's
  sentence, which its acceptance criteria settle by rewording "must"
  to "should", and also the editor confirming a review that has no
  recommendation
- **Tracked in** spec U28 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U28-reviewers-review.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal, step 3 of a review tells the reviewer "You must enter a
review or upload a file before selecting a recommendation." The step
makes no such check. A reviewer who types nothing into "For author and
editor" and "For editor", uploads no file and chooses a
"Recommendation" can press "Submit Review" and "OK", and the review is
submitted.

The reviewer's row then reads "Review Submitted" and the editors
assigned to the submission are mailed "Review complete: …"; neither
shows that the review is empty. The editor sees it on opening the
review, which has no text and no file.

This shows on a review that uses the two text boxes, which is every
review the editor has not given a review form, the default. pkp's open
issue on this has decided to keep allowing an empty review and to
reword the sentence to "should". This report adds the cause, a walk on
`main` and 3.5, and a diff that was tried.

## Impact

- **Lost**: nothing.
- **Who**: a reviewer of a journal, on a review without a review form,
  who submits with both boxes empty and no file, by mistake or on
  purpose to send only the recommendation.
- **Way round**: the reviewer is not blocked. The editor who opens the
  review sees "-" under both headings and no file, and can ask the
  reviewer for the text; the reviewer cannot add to a submitted review.

Low: the review is completed and the editor can see that it is empty;
what is wrong is a sentence that promises a check the step does not
make. A decision by the team to refuse empty reviews would make it
medium. The effort is small for what the open issue asks: the reworded
sentence and the removal of the check that does nothing. Refusing
empty reviews would be a server check on journal and press, and more
than small.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, or the one for `stable-3_5_0`
  on a 3.5 install: OJS (the context `publicknowledge`). Nothing else.
  `jjanssen` has an unanswered review request on submission 12,
  "Sodium butyrate improves growth performance of weaned piglets
  during the first period after weaning", without a review form.

Steps:

1. Sign in as `jjanssen` (password `jjanssenjjanssen`) and open the
   review (`/index.php/publicknowledge/en/reviewer/submission/12`).
2. Press "Accept Review, Continue to Step #2" (tick the privacy box
   when it shows), then "Continue to Step #3".
3. Type nothing and upload nothing. Press "Submit Review", then "OK"
   in "Are you sure you want to submit this review?". The reviewer
   stays on step 3, with "This field is required." under
   "Recommendation" and no message about the review's text.
4. Choose "Accept Submission" under "Recommendation", then press
   "Submit Review" and "OK" again.
5. Sign in as `dbarnes` (password `dbarnesdbarnes`), open the
   submission's workflow
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=12`)
   and press "Read Review" on Julie Janssen's row.

**Expected**: the sentence under "Recommendation" matches what the
step does: it advises a review or a file and does not say that one is
required, as `pkp/pkp-lib#11418` decided.

**Observed**: step 3 reads, under "Recommendation":

```
Select a recommendation and submit the review to complete the process. You must enter a review or upload a file before selecting a recommendation.
```

After step 4, "4. Completion" opens with "Review Submitted". The form
was posted with both texts empty (`comments=`, `commentsPrivate=`) and
answered `"status": true`. `dbarnes` is mailed:

```
Review complete: Julie Janssen recommends Accept Submission for #12 Christopher — "Sodium butyrate improves growth performance of weaned piglets during the first period after weaning"
```

At step 5 the row reads "Julie Janssen Review Submitted Accept
Submission", and the "Review Details" window shows:

```
Reviewer Comments
For author and editor
-
For editor
-
Reviewer Files
No Items
```

[3.5: the window is headed "Review", has no "Reviewer Comments" part
for a review without text, and its "Reviewer Files" list reads "No
Files".]

Controls, both allowed by the sentence: as `phudson` on the same
submission, a review with text in "For editor" alone is submitted; as
`amccrae` on submission 20, so is a review with a file alone.

## Cause

The only code that tries to require the text is JavaScript, and it
sets `required` on fields that jQuery Validation never looks at.
`ReviewerReviewStep3FormHandler.updateCommentsRequired_()`
(`lib/pkp/js/controllers/form/reviewer/ReviewerReviewStep3FormHandler.js`,
lines 92–109) runs when "Submit Review" is pressed. When the "Reviewer
Files" grid shows its empty row, it sets `required` on every element
whose id starts with `comments`, which is both textareas.

Both boxes are rich text (`rich=true` in
`lib/pkp/templates/reviewer/review/step3.tpl`), so TinyMCE hides the
textareas. jQuery Validation skips hidden fields by default (`ignore:
":hidden"`), and `FormHandler` sets up the validator without changing
that. The `required` attributes are never checked. In the walk a review with text in
"For editor" only was posted while both hidden textareas carried
`required` and "For author and editor" was empty.

The server never had the rule. `PKPReviewerReviewStep3Form::__construct()`
checks the review form's required questions, the POST and the CSRF
token; OJS's `ReviewerReviewStep3Form` adds the recommendation.
`execute()` then completes the review whatever the boxes hold.

The handler dates from 2014
([a4702c3efa](https://github.com/pkp/pkp-lib/commit/a4702c3efa159bcfeef52a979369cb898d895f53),
"Correct review requirements for completion"), when the step had one
plain textarea, which the validator does check. `pkp/pkp-lib#1191`
added the second box and made both rich text, and the check has been
skipped since. The sentence is OJS's own
(`reviewer.article.selectRecommendation` in `locale/en/locale.po`,
printed by OJS's `templates/reviewer/review/reviewerRecommendations.tpl`)
and dates from OJS 2 (2005).

Reach:

- OMP shares the handler, the template and the form class. On a press
  an empty review is submitted at step 3's first "Submit Review" and
  "OK" (walked on `main` and 3.5, `jjanssen` on submission 17). The
  press's step has no "Recommendation" part and no such sentence
  (walked; OMP's locale has no such string), so nothing there
  disagrees.
- A review with a review form is not affected (code): its required
  questions are checked on the server.
- The handler's selector, `[id^="comments"]`, also matches
  `commentsPrivate`. If the attributes were checked, a review without
  a file would need text in both boxes (code; the walk read `required`
  on both).
- The editor's side of `pkp/pkp-lib#11418` (confirming a review that
  has no recommendation) is another screen and is not covered here.

## Proposed fix

Follow the acceptance criteria of `pkp/pkp-lib#11418`: make the
sentence advice, and remove the handler code that tries to require
the boxes and does nothing
([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-review-can-be-submitted/fix-ojs.diff)).
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-review-can-be-submitted/fix-omp.diff)
is the same removal without the locale change, for a press checkout:
it removes ineffective code and fixes nothing on a press.

In OJS's `locale/en/locale.po`:

```diff
 msgid "reviewer.article.selectRecommendation"
-msgstr "Select a recommendation and submit the review to complete the process. You must enter a review or upload a file before selecting a recommendation."
+msgstr "Select a recommendation and submit the review to complete the process. You should enter a review or upload a file before selecting a recommendation."
```

In pkp-lib's `ReviewerReviewStep3FormHandler.js`, delete
`updateCommentsRequired_()` and the click binding that calls it. The
method runs on every "Submit Review" press and has no effect.

Tried on `main`: both parts on OJS, the removal on OMP. The journal's
step reads "… You should enter a review or upload a file before
selecting a recommendation.", and the empty review is submitted as
before. With the removal and without, on journal and press, "Save for Later"
with nothing typed saves and a review with text in "For editor" alone
or with a file alone is submitted; "Recommendation" is still required
on the journal.

**Alternatives**

- Refuse the empty review on the server: a `FormValidatorCustom` in
  `PKPReviewerReviewStep3Form::__construct()`, for an assignment
  without a review form, that passes when either box has text or the
  assignment has a file (the lookup
  `ReviewerReviewAttachmentGridDataProvider::loadData()` makes), with
  a new message. It covers journal and press and is where the rule
  would belong. Not recommended because `pkp/pkp-lib#11418` decided
  against enforcing, and it would stop a reviewer whose whole review
  is the recommendation. Not tried.
- Make the browser check the hidden boxes (an `ignore` setting on the
  validator). It changes every legacy form, and with the current
  selector it would require both boxes.

**What goes with it**

- Translations: the other locales' `reviewer.article.selectRecommendation`
  follow through Weblate.
- `js/pkp.min.js` is committed in the OJS, OMP and OPS repos, and each
  app's `registry/minifiedScripts.txt` lists the handler, so the
  pkp-lib change needs a rebuilt `pkp.min.js` committed in all three.
- Backport: the sentence is the same on 3.5 and 3.4
  (`locale/en/locale.po`) and on 3.3 (`locale/en_US/locale.po`), and
  the handler method is the same on all three. Not tried there.
- Guard: an e2e scenario in pkp-e2e that reads the journal's sentence
  on step 3 and submits a review with nothing in it.

Small: one reworded sentence in OJS's English locale, and the removal
of one method that has no effect from a pkp-lib script, with the
rebuilt `pkp.min.js`.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-review-can-be-submitted/walk.js)
  with
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-review-can-be-submitted/lib.js).
  It takes the Steps, and the same on the press's submission 17, on
  an install loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02; PostgreSQL) and records the step's texts, what
  the form posted, the answer, the editor's mail and the editor's
  window:
  `PROBE_FEATURE=issues-u28f PROBE_AGENT=u28f node bin/probe.js ojs,omp shared/playwright/checks/issues/empty-review-can-be-submitted/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` and that line's install for 3.5;
  `MODE=nb` in front runs the Controls alone, with an empty "Save for
  Later" first; on the press the file-only control is `agallego` on
  submission 18).
- Walked on `main` and on `stable-3_5_0`, OJS and OMP, 2026-10-02.
- Fix trial on `main`:
  `node bin/try-fix.js apply shared/playwright/checks/issues/empty-review-can-be-submitted/fix-ojs.diff ojs`
  and `… fix-omp.diff omp`, the walk and the controls, `revert`; the
  controls also ran without the fix. The installs load the source
  scripts (`enable_minified = Off`), so no bundle was rebuilt. With the
  fix the two textareas no longer carry `required` after "Submit
  Review" is pressed; without it both do while "Reviewer Files" is
  empty.
- Branch tips the walks and code reads were made on. `main`: OJS
  b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794c (lib/pkp
  3dc90c81a6). `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246c (lib/pkp
  cf3f984335). `stable-3_4_0`: OJS 75cc2d488b, OMP 0aec65441f, lib/pkp
  6f96165c90. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc8836, lib/pkp
  4156e50233.
- Code read on `main` and 3.5: `js/pkp.min.js` tracked and the handler
  listed in `registry/minifiedScripts.txt` in OJS, OMP and OPS
  (`main`); the handler, `step3.tpl`, the two form
  classes' checks, `PKPReviewerHandler::saveStep()`, `FormHandler.js`'s
  validator set-up, and `ignore: ":hidden"` in jquery-validation 1.21.0
  (`main`). On 3.5 OJS's check is on `recommendation`; the rest is the
  same.
- Code reads on 3.4 and 3.3: the same `updateCommentsRequired_()`, the
  same two `rich=true` boxes in `step3.tpl`, and the same checks in
  `PKPReviewerReviewStep3Form` and OJS's `ReviewerReviewStep3Form`
  (none on the two texts); the sentence is in OJS's English locale on
  both. The validator file those branches load is not in their trees
  and was not read; the copy bundled when `pkp/pkp-lib#1191` merged
  was 1.11.1 with the same `ignore: ":hidden"`.
- Introduced: `git log -S` for `updateCommentsRequired_` gives
  a4702c3efa (2014, the box a plain textarea); `git log -S'rich=true'`
  on `step3.tpl` gives d608dee64e, which the GitHub API names as
  `pkp/pkp-lib#1191`; the PR has no description and links no issue.
  `git log -S` for the sentence in OJS's `locale/` ends at ba4c898213
  (2005).
  Kind is "defect", not "regression": the check last worked before
  OJS 3.0, and that it worked then is read in the code, not walked.
- Upstream search, 2026-10-02: pkp/pkp-lib, pkp/ojs, pkp/omp and
  pkp/ui-library, issues and PRs, for empty or blank review submitted,
  reviewer submit review without comments or file, "enter a review or
  upload a file", reviewer comments mandatory,
  `ReviewerReviewStep3FormHandler`, `updateCommentsRequired`,
  `PKPReviewerReviewStep3Form`. `pkp/pkp-lib#11418` (opened
  2025-05-23, milestone 3.6) is the match; its acceptance criteria of
  July 2026 ask for "must" to become "should". No PR names it, and
  the sentence on `main` still reads "must".
- Not driven: a review with a review form (code); the first
  alternative; the backport on 3.5; 3.4 and 3.3; the review-complete
  mail on a press submission that has an editor assigned; "Modify
  Review" in the editor's window; OPS (no review).
- Unverified: that the reviewer cannot add to a submitted review was
  read in the code (`saveStep()` refuses a completed review), not
  walked.
