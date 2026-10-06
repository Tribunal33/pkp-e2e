# Dashboard reviewer popovers blame the reviewer for an editor's cancellation and call an overdue review a response

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no reviewer popovers on the submissions list)
  - 3.3: none (code; no reviewer popovers on the submissions list)
- **Introduced** PR `pkp/pkp-lib#9815` for `pkp/pkp-lib#7495` · [c867c8cc00](https://github.com/pkp/pkp-lib/commit/c867c8cc00069301ac1c8fae25bd57a084a62210) · 2024-04-02 · Jarda Kotěšovec (jardakotesovec)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U23 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a4), [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U23-submissions-dashboard.md#a6)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On the editorial Submissions dashboard, each reviewer of a submission in
review has a status icon in the submission's row ("Editorial Activity"
column); clicking it opens a short note on where that review stands. Two
of these notes describe the state wrongly. After an editor cancels a
review request with "Cancel Reviewer", the note reads "Reviewer
cancelled review request" and "Reviewer has cancelled the review request
on {date}.", although the reviewer did nothing. After an accepted review
runs past its deadline, it reads "This reviewer has not completed their
review. A response was due on {date}.": the date shown is the review
deadline, but the sentence calls it the date the reviewer's response
(accepting or declining the request) was due.

Each status already picks its own text; the English wording of these two
is what is wrong. Nothing is lost and every button works, but an editor
reading the list can take an editorial cancellation for the reviewer
withdrawing, or think the reviewer never answered the request. The way
round is to open each submission's workflow, whose Reviewers panel words
both states correctly ("Request Cancelled"; "Overdue", "Review due:
{date}").

Journals and presses only: a preprint server has no review stage. Most
of the 28 translations of these texts repeat the wrong meaning.

## Impact

- **Lost.** Nothing stored; an editor reading the dashboard gets the
  wrong account of a reviewer's state.
- **Who.** Editors and managers on the editorial dashboard, on any
  submission in review with a cancelled request or an accepted review
  past its due date, in English and in most of the 28 languages that
  translate these texts.
- **Way round.** Open the submission's workflow and read its Reviewers
  panel, one submission at a time.

Low: wording only, every action works and the right state is one click
away; it would rise if an editor's misreading led to a wrong action,
which nothing here shows.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS or OMP `main`, context
  `publicknowledge`. On OJS, submission 12 "Sodium butyrate improves
  growth performance of weaned piglets during the first period after
  weaning" is in Review round 1 with Julie Janssen and Paul Hudson, who
  have not answered. On OMP, submission 2 "The West and Beyond: New
  Perspectives on an Imagined Region" is in Review round 1 with Al
  Zacharia and Gonzalo Favio, who have not answered. Below, reviewer A
  is Julie Janssen (OMP: Al Zacharia), reviewer B Paul Hudson (OMP:
  Gonzalo Favio).

1. Sign in as `dbarnes`, choose "Active submissions" and press "View"
   on the submission's row; its workflow opens on the "Review" stage
   (OMP: "External Review"), Round 1.
2. In "Reviewers", on reviewer A's row, "More Actions" > "Log
   Response", choose "Reviewer has accepted the invitation to review",
   "Log Response".
3. On reviewer A's row, "More Actions" > "Edit": pick a "Response Due
   Date" two weeks before today and a "Review Due Date" one week before
   today, "OK". The row reads "Overdue", "Review due: {review due
   date}".
4. On reviewer B's row, "Log Response" as in step 2. Only an accepted
   request can be cancelled: before acceptance the row offers "Unassign
   Reviewer", which removes the reviewer instead.
5. On reviewer B's row, "More Actions" > "Cancel Reviewer", then
   "Cancel Reviewer" in the window. The row reads "Request Cancelled".
6. Close the workflow. On the dashboard, "Active submissions", click
   reviewer A's status icon in the submission's "Editorial Activity"
   cell.
7. Click reviewer B's status icon.

**Expected.** Step 6 speaks of the review and its deadline ("This
reviewer has not completed their review. The review was due on
{review due date}."). Step 7 says the editor cancelled the request, as
the Reviewers panel does ("Request Cancelled"; its tooltip text is "The
editor cancelled this review request.").

**Observed.** Walked on 2026-10-04 (review due date 2026-09-27); the
same on both applications. Step 6:

```
Review overdue by 7 days
Julie Janssen
This reviewer has not completed their review. A response was due on 2026-09-27.
Edit Due Date · View details · Cancel Reviewer
```

Step 7:

```
Reviewer cancelled review request
Paul Hudson
Reviewer has cancelled the review request on 2026-10-04.
Resend Review Request · View details
```

The icon's accessible name repeats the headline ("Reviewer
cancelled review request"). No request failed and no script error
showed. Control: the popovers of an unanswered request past its response
date ("This reviewer has not responded to the review request. A response
was due on {date}") and of a declined request ("Reviewer declined the
review request on {date}") are right.

## Cause

Each status picks the right keys in ui-library's
`useDashboardConfigReviewActivity.js` (`ConfigPerStatus`). The cancelled
status takes `dashboard.reviewAssignment.statusCancelled.title` and
`.description` with `dateCancelled`; the entry is commented "editor
cancelled review request". The review-overdue status takes its own
description key, `dashboard.reviewAssignment.statusReviewOverdue.description`,
not the response-overdue one, with `dateDue`. The fault is in the
English texts of those three keys in `lib/pkp/locale/en/submission.po`:

```
msgid "dashboard.reviewAssignment.statusReviewOverdue.description"
msgstr "This reviewer has not completed their review. A response was due on <b>{$date}.</b>"

msgid "dashboard.reviewAssignment.statusCancelled.title"
msgstr "Reviewer cancelled review request"

msgid "dashboard.reviewAssignment.statusCancelled.description"
msgstr "Reviewer has cancelled the review request on <b>{$date}</b>."
```

`ReviewAssignment::getStatus()` returns `REVIEW_ASSIGNMENT_STATUS_CANCELLED`
only when the assignment's `cancelled` flag is set. Only an editor sets
it: `ClearReviewForm::execute()`, the parent of `CancelReviewForm`
("Cancel Reviewer") and `UnassignReviewerForm` ("Unassign Reviewer"),
flags an accepted assignment cancelled and deletes one not yet accepted.
A reviewer can only decline, which is the separate declined status. The
review-overdue sentence reuses the response-overdue sentence's second
half, while the date shown is the review due date.

The texts follow the popover mockups of `pkp/pkp-lib#8881`, which carry
the same wording. The mockup's cancelled case is labelled "reviewer
cancelled review request". That is the comment on
`ReviewAssignment::REVIEW_ASSIGNMENT_STATUS_CANCELLED`, there since at
least 2019.

Reach:

- Nowhere else: the three keys are read only by `ConfigPerStatus`, which
  feeds the dashboard's status icons (code, `main`).
- Other languages (code, `main` and `stable-3_5_0`): 28 of pkp-lib's 70
  other languages translate each of the three texts.
  - Cancelled title and description: 27 blame the reviewer, 22 saying
    the reviewer cancelled (Spanish "El revisor canceló la solicitud de
    revisión", German "Gutachter/in hat die Gutachtenanfrage storniert")
    and 5 that the reviewer declined (Danish, Marathi, Norwegian Bokmål,
    Slovenian, Turkish). Arabic's already says the editor cancelled.
  - Review-overdue description: 23 repeat "a response was due" (French
    (Canada) "Une réponse était attendue le …", Portuguese (Brazil) "A
    resposta estava prevista para …"); Finnish, French, Marathi,
    Slovenian and Turkish speak of the review's deadline.

## Proposed fix

Correct the three English texts in pkp-lib's
`locale/en/submission.po` and the constant's comment the cancelled
wording came from, and mark every translation of the three keys
`#, fuzzy` in the same commit. The English part is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/fix.diff):

```diff
 msgid "dashboard.reviewAssignment.statusReviewOverdue.description"
-msgstr "This reviewer has not completed their review. A response was due on <b>{$date}.</b>"
+msgstr "This reviewer has not completed their review. The review was due on <b>{$date}</b>."
 ...
 msgid "dashboard.reviewAssignment.statusCancelled.title"
-msgstr "Reviewer cancelled review request"
+msgstr "Review request cancelled by editor"
 
 msgid "dashboard.reviewAssignment.statusCancelled.description"
-msgstr "Reviewer has cancelled the review request on <b>{$date}</b>."
+msgstr "The editor cancelled this review request on <b>{$date}</b>."
```

```diff
-    public const REVIEW_ASSIGNMENT_STATUS_CANCELLED = 10; // reviewer cancelled review request
+    public const REVIEW_ASSIGNMENT_STATUS_CANCELLED = 10; // editor cancelled review request
```

The fuzzy marking is done by pkp-lib's own tool, run from the
application's root once per key:

```
php lib/pkp/tools/markLocaleKeyFuzzy.php dashboard.reviewAssignment.statusCancelled.title
php lib/pkp/tools/markLocaleKeyFuzzy.php dashboard.reviewAssignment.statusCancelled.description
php lib/pkp/tools/markLocaleKeyFuzzy.php dashboard.reviewAssignment.statusReviewOverdue.description
```

This is PKP's practice when an English text changes meaning: keep the
key, flag its translations (5cc1683e43 for `pkp/pkp-lib#13059`,
4017a024f3 for `pkp/pkp-lib#13156`). A fuzzy entry still shows on
screen, so each language keeps its current wording until a translator
updates it, and Weblate lists it as needing editing.

The wording follows the same table's "Review was confirmed by editor"
and the Reviewers panel's tooltip, "The editor cancelled this review
request." This is a proposal; the team decides.

Tried on `main`, OJS and OMP, with the diff applied: the popovers read
"This reviewer has not completed their review. The review was due on
2026-09-27." and "Review request cancelled by editor" / "The editor
cancelled this review request on 2026-10-04.". The response-overdue and
declined popovers read the same with the diff in and out.

**Alternatives**

- New keys for the corrected texts, so the wrong translations stop
  showing: PKP does not fall back to English for a missing text, so 28
  languages would show a raw `##key##` until translated.
- Point the popover at the existing texts ("Request Cancelled", "The
  reviewer has missed the review due date."): a ui-library change as
  well, and it drops the dates the popover shows.

**What goes with it**

- Translations: the fuzzy flags above, so translators of the 28
  languages see the three texts as needing editing on Weblate
  (translate.pkp.sfu.ca).
- Backport: `stable-3_5_0` has the same three texts and the same tool.
  `fix.diff`'s `.po` part applies there at an offset, but its
  `ReviewAssignment.php` hunk fails `git apply` (the context differs);
  [fix-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/fix-3_5.diff)
  is the same change made against `stable-3_5_0`. Run the tool there too.
- Also worth correcting: the same "reviewer cancelled review request"
  label in ui-library's `src/pages/dashboard/DashboardPage.stories.js`
  and `src/managers/ReviewerManager/ReviewerManager.stories.js` (line
  35), which document the statuses.
- The guard: a U23 dashboard scenario reading the cancelled and
  overdue popovers (a Planned item in the spec).

Small: three English texts, one comment and a tool run in pkp-lib, no
code.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/walk.js)
  with its
  [`lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/lib.js):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js ojs shared/playwright/checks/issues/review-popover-cancelled-overdue-wording/walk.js`
  (then `omp` on a freshly loaded dataset; `PKP_E2E_LINE=stable-3_5_0`
  in front for 3.5). `MODE=nb` in front reads only the control states
  the fix must leave alone: reviewer A left unanswered with a past
  response due date, reviewer B logged as declined. The fix was tried with
  `node bin/try-fix.js apply …/fix.diff ojs` (then `omp`), the script
  and `MODE=nb` run on a freshly loaded dataset, `revert`, and
  `MODE=nb` again.
- Walked on PostgreSQL from pkp/datasets 1a5552c (2026-10-04). On 3.5
  "Cancel Reviewer" opens a shorter window (no message template), with
  the same result.
- Tips: `main`: OJS ff004d0973 (`lib/pkp` 987776cd04, `lib/ui-library`
  64d6736318), OMP 3b0ecf794c (`lib/pkp` 3dc90c81a6, `lib/ui-library`
  280f98c570). `stable-3_5_0`: OJS c1cee76b95 (`lib/pkp` 771474347e),
  OMP 9c5e24246c (`lib/pkp` cf3f984335), `lib/ui-library` d4e0188353.
  `stable-3_4_0`: OJS d68934d0d1, `lib/pkp` 767353f4fe, `lib/ui-library`
  ee684b341b. `stable-3_3_0`: OJS ac77c9fb35, `lib/pkp` ac3fa73402,
  `lib/ui-library` 96959f9e.
- Code reads: on `main` and 3.5, ui-library's
  `useDashboardConfigReviewActivity.js` and pkp-lib's
  `locale/en/submission.po`, `locale/en/editor.po`
  (`editor.review.requestCancelled` and its tooltip),
  `ReviewAssignment::getStatus()` and `getStatusKey()`, and the cancel
  path (`CancelReviewForm`, `UnassignReviewerForm`, `ClearReviewForm`);
  every `locale/*/submission.po` of pkp-lib on `main` and 3.5 for the
  translation counts (multi-line `msgstr` entries joined; an empty one
  counts as missing), each translation read for its meaning;
  `tools/markLocaleKeyFuzzy.php` (on both lines) and the 5cc1683e43 and
  4017a024f3 precedents; on `main`, `LocaleFile::loadArray()` and
  gettext's `ArrayGenerator::generateArray()`, which skip only empty and
  disabled entries, so a fuzzy one is still served. 3.4 and 3.3: no text of the three in pkp-lib's
  English locale (`locale/en`, `locale/en_US`); the submissions list
  there is ui-library's `SubmissionsListItem.vue`, which shows a count
  of completed reviews and no per-reviewer popover.
- Introduced: `git blame` on the three lines (8055521da5, a move from
  `dashboard.po`), then `git log -S` on the texts: 5c392d00ef renamed
  the keys, c867c8cc00 (PR `pkp/pkp-lib#9815`) wrote them. The mockups
  in `pkp/pkp-lib#8881` ("E" and "I") carry the same wording.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library searched
  for "Reviewer cancelled review request", "A response was due on",
  `statusCancelled`, `statusReviewOverdue`, `ConfigPerStatus` and the
  symptom's words; `pkp/pkp-lib#12964` (resending a cancelled request)
  and `pkp/pkp-lib#8881` (the design) are not this fault.
- Not driven: 3.4 and 3.3 (code only); the popovers in a language other
  than English (code only).
- The 3.5 diff was checked with `git apply --check` against
  `stable-3_5_0`'s pkp-lib, not walked.
