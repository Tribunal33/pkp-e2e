# On a press, the Review Details windows introduce a review form with "The questions this journal asks reviewers to answer."

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#13198` for `pkp/pkp-lib#13156` · [4017a024f3](https://github.com/pkp/pkp-lib/commit/4017a024f31cbfccd8e36287a836587f8a7b5fb9) · 2026-08-27 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-03)
- **Tracked in** U27 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U27-reviewer-assignment-and-management.md#omp6)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, when a reviewer's request carries a review form, the
editor's "Review Details" window and the "Modify Review" window over it
introduce the form's questions with a line that calls the press a
journal. Only editors see these windows; the reviewer's own review
pages do not show the line.

The line shows when the review form has no description of its own,
which is how a new form is created unless the manager types one.

## Impact

- **Lost**: nothing.
- **Who**: editors of every press that uses review forms, each time they
  open a review that carries one.
- **Way round**: the press manager can give each review form a
  description (Settings › Workflow › "Review" › "Review Forms"), which
  then shows instead of the line.

Low: wording only, and the editor's work is not held up.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main` (press `publicknowledge`,
  "Public Knowledge Press").
- Created on screen in the steps: a review form "u27k7 review form"
  with one question, given to a reviewer (the dataset holds no review
  form).

Steps:

1. Sign in as `dbarnes` (Press editor).
2. Open Settings › Workflow › "Review" › "Review Forms" and press
   "Create Review Form". Type the Title "u27k7 review form", leave
   "Description" empty, press "Save".
3. On the new row press "Edit", open "Form Items", press "Create New
   Item", type the Item "u27k7 question", choose "Single line text
   box", press "Save", and close the window.
4. Tick the row's "Active" box and answer "OK".
5. Open submission 17, "Open Development: Networked Innovations in
   International Development" (Internal Review, round 1). On Julie
   Janssen's row in "Reviewers" open the menu, choose "Edit", set
   "Review Form" to "u27k7 review form" and press "OK".
6. On the same row's menu choose "Review Details".
7. Read the line under the "u27k7 review form" heading.
8. Press "Modify Review" and answer "Modify Review" in the "Modify this
   review?" dialog. Read the line under the same heading in the "Modify
   Review" window.

**Expected**: a line that fits a press, for example "The questions this
review form asks reviewers to answer."

**Observed**: in both windows,

```
u27k7 review form
The questions this journal asks reviewers to answer.
u27k7 question
```

On OJS the same steps (submission 12, Julie Janssen) show the same
line, which is right for a journal.

## Cause

ui-library's `useReviewContentFields()`
(`src/managers/ReviewerManager/useReviewContentFields.js`, line 47)
builds the review form's group for both windows. It gives the group the
form's own description, or else the text of
`editor.review.reviewerForm.description.default`. That string lives in
lib/pkp `locale/en/editor.po` (line 323) and reads "The questions this
journal asks reviewers to answer." OMP's `locale/en/editor.po` does not
define the key, so a press shows the journal wording.

The string came with the new Review Details window, whose ui-library
half is `pkp/ui-library#960`. The change's other new strings name no
journal, press or server; this one names a journal.

Reach:

- Screens: the "Review Details" window and the "Modify Review" window,
  on any request whose review form has no description, whatever the
  request's state; the group is built the same way for each. Walked on
  an unanswered request. No other component uses the key, so neither
  the reviewer's pages nor the author's show the line (checked in the
  code).
- Other apps: a preprint server has no review.
- Languages: the key exists only in English; no translation carries it
  yet (checked in the code).
- The same file: no other string in lib/pkp's English `editor.po` names
  a journal.

## Proposed fix

Word the shared English string so that it names no journal, press or
server, in lib/pkp `locale/en/editor.po`. The line is about the review form, so it
can say so:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-form-line-says-this-journal/fix.diff),
against the app root:

```diff
 msgid "editor.review.reviewerForm.description.default"
-msgstr "The questions this journal asks reviewers to answer."
+msgstr "The questions this review form asks reviewers to answer."
```

Tried on OJS and OMP `main`: both windows then read the new line on the
press and on the journal. A form given a description of its own
("u27k7 description") showed that description in both windows, with
and without the fix. This fixes every app at once, and with no
translation of the key yet, translators have nothing to redo.

**Alternatives**

- An OMP override of the key in OMP's `locale/en/editor.po` ("…this
  press asks…"), the way OMP's own English strings already override
  lib/pkp keys where a press needs other words
  (`editor.submission.decision.sendExternalReview`, for one). It keeps
  OJS's text, but leaves two strings for every translator to translate
  where one will do.
- Dropping the default line and showing no description when the form
  has none. That changes what the windows show on every app.

**What goes with it**

- Test: an e2e check that reads the line on a press.

Small: one English string in lib/pkp.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-review-form-line-says-this-journal/walk.js),
  with the helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-details-guidance-promises-upload/lib.js)
  and
  [the review-form helpers](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-form-save-for-later-required-fields/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs,omp
  shared/playwright/checks/issues/press-review-form-line-says-this-journal/walk.js`
  takes the Steps, with the journal as control. Its neighbour mode
  (`MODE=nb`, "neighbour") gives the form a description of its own.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d6736318), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, ui-library
  280f98c570); `stable-3_5_0` OJS c1cee76b95 (lib/pkp 771474347e), OMP
  9c5e24246c (lib/pkp cf3f984335), ui-library d4e0188353; `stable-3_4_0`
  OMP 0aec65441f, lib/pkp 767353f4fe; `stable-3_3_0` OMP 8e72fc8836,
  lib/pkp ac3fa73402. The OJS and OMP `main` pointers carry the same
  `editor.po` and `useReviewContentFields.js`.
- 3.5: on an unanswered request that carries the form, the older
  "Review Details" window shows no review-form block. The key does not
  exist on 3.5, so no 3.5 window can show the line. A submitted
  form-based review was not walked on 3.5; its template,
  `templates/reviewer/review/reviewFormResponse.tpl`, prints the
  questions without an introducing line.
- Code reads: the key in lib/pkp's English `editor.po` on 3.5, 3.4 and
  3.3 (absent); every lib/pkp `editor.po` on `main` (the key in English
  only); every msgstr of lib/pkp's English `editor.po` naming a journal
  (this one alone) and OMP's English `editor.po` (no override); the
  ui-library components using `useReviewContentFields()` (the two
  editor windows).
- Introduced: `git blame` on lib/pkp `locale/en/editor.po` line 323
  gives 4017a024f3, the key's first commit; `git blame` on
  `useReviewContentFields.js` line 47 gives ui-library 30beb5e3
  (`pkp/ui-library#960`), the same change's ui-library half.
- Upstream searched in pkp/pkp-lib, pkp/omp and pkp/ui-library by "asks
  reviewers to answer", `reviewerForm.description` and review form
  journal press.
