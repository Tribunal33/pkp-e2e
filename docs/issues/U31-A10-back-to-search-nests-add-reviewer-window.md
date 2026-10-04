# "Back to Search" in a suggested reviewer's window nests a second search whose "Add Reviewer" shows raw code

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/ui-library#426` for `pkp/pkp-lib#4787` · [1e0faa4a0d](https://github.com/pkp/ui-library/commit/1e0faa4a0d5ea1bce3ec41d58a6aa3820da7bc80) · 2025-02-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U31 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a10)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor opens Add Reviewer and presses "Select Reviewer" on an
author's suggestion. A second "Add Reviewer" window opens over the
first, on a form that would create that person's account (or give an
existing account the Reviewer role). If the editor then decides to
invite someone else, "Back to Search" is that form's only link back to
the list. Pressing it does not bring the list back:
the second window fills with a complete second copy of the Add Reviewer
search (the submission's authors, the suggestions, "Locate a
Reviewer"), while the first window stays open beneath it.

That second search does not work. The editor picks a reviewer there and
the window shows the choice, but its "Add Reviewer" takes the browser
off the workflow to a page of raw code reading
`{"status":false,"content":"","elementId":"0","events":[]}`. No review
request goes to the reviewer. Nothing was created or changed before
this: the form was only shown, so no account, role or review assignment
exists. Pressing "Select Reviewer" on the suggestion again from the
second copy stacks a third window. Each "Back to Search" also
makes the page's script fail twice, which shows only in the browser's
console.

It happens on a journal or press with "Reviewer Suggestion at
Submission" switched on, and only for a suggested person with no
account or without the Reviewer role: only those open the second
window. A person who already reviews for the journal is selected in the
first window.

## Impact

- **Lost**: the review request, with the message and dates the editor
  set in the second copy.
- **Who**: editors and section editors who open a suggestion's form and
  then go back to the list to pick someone else.
- **Way round**: close the second window with its "<" arrow and pick
  the reviewer in the first window, which still works.

Medium: a core task fails on one path, but a way round is on screen
and the failure is visible. It would be high if the nested window's
"Add Reviewer" sent a wrong request or failed with no sign.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; on OMP the same steps
  with the differences in brackets). Every reviewer suggestion in it has
  already been turned into a reviewer, so the steps make a submission
  with a new one.

Switch the feature on:

1. Sign in as `dbarnes`. Open Settings › Workflow › "Review" › "Setup",
   tick "Allow authors to suggest potential reviewers at submission
   process" under "Reviewer Suggestion at Submission", and press "Save".
   Sign out.

A submission with a suggestion:

2. Sign in as `ccorino` [OMP: `aclark`]. Press "New Submission", type
   the title "Reviewer suggestions u31q5", choose the section "Articles"
   [OMP: no section], tick the requirement boxes and press "Begin
   Submission".
3. Upload a manuscript file, type an abstract on "Details" [OMP: choose
   the series "Library & Information Studies" on "For the Editors"], and
   press "Continue" until "Reviewer Suggestions".
4. Press "Add Reviewer Suggestion", fill "Given Name" "Quinn", "Family
   Name" "u31q5", "Email" "quinn.u31q5@mailinator.com", "Affiliation"
   "u31q5 University", "Reasons for suggesting reviewer" "Knows the
   field well.", and press "Save".
5. Press "Continue", then "Submit", and confirm. Sign out.

Into review:

6. Sign in as `dbarnes` and open "Reviewer suggestions u31q5" from the
   dashboard.
7. Press "Send for Review" [OMP: "Send to External Review"], then
   "Continue" and "Record Decision". The workflow is now on "Review" ›
   "Round 1".

Back to Search:

8. In the Reviewers panel press "Add Reviewer". The window lists
   "Select a Reviewer from Reviewer Suggestions" with "Quinn u31q5"
   above "Locate a Reviewer".
9. On "Quinn u31q5" press "Select Reviewer". A second "Add Reviewer"
   window opens on "Create New Reviewer", filled in from the suggestion.
10. In that window press "Back to Search".
11. Under "Locate a Reviewer" in the window on top, type "Julie
    Janssen" [OMP: "Adela Gallego"] in the search box and press that
    reviewer's "Select Reviewer".
12. Press "Add Reviewer" at the bottom of that window.

Stacking:

13. Press the browser's Back button to leave the raw page (or open the
    submission again from the dashboard), and press "Add Reviewer" in
    the Reviewers panel.
14. On "Quinn u31q5" press "Select Reviewer", then "Back to Search" in
    the window that opens.
15. In the window on top, on "Quinn u31q5" press "Select Reviewer"
    again.

**Expected.** Step 10 takes the editor back to the search they came
from, in a single "Add Reviewer" window. Step 11 shows "Selected
Reviewer Julie Janssen" with the review request form in that window,
and step 12 sends the request and closes the window, with "Julie
Janssen" listed under Reviewers. Steps 13–15 never show more than one
"Add Reviewer" window.

**Observed.** After step 10 there are two "Add Reviewer" windows. The
inner one now holds a second complete search ("Submission Author List",
"Select a Reviewer from Reviewer Suggestions", "Locate a Reviewer"),
followed by an empty "Selected Reviewer … Change" block. The browser
console logs two uncaught errors:

```
The handler "$.pkp.controllers.grid.users.reviewer.AdvancedReviewerSearchHandler" has already been bound to the selected element!
The handler "$.pkp.controllers.grid.users.reviewer.form.AddReviewerFormHandler" has already been bound to the selected element!
```

At step 11 the inner window shows "Selected Reviewer Julie Janssen —
jjanssen@mailinator.com Change" under the still-open lists. The window
underneath switches to the same reviewer with its "Review Request"
message.

At step 12 the browser leaves the workflow. It loads
`/index.php/publicknowledge/$$$call$$$/grid/users/reviewer/reviewer-grid/update-reviewer`
as a page, which reads:

```
{"status":false,"content":"","elementId":"0","events":[]}
```

No review assignment is made.

At step 15 a third "Add Reviewer" window opens on "Create New
Reviewer", on top of the two.

## Cause

Two Add Reviewer forms are put on one page, and the legacy reviewer
form is written to be the only one there.

ui-library's `SelectReviewerSuggestionListItem.vue` `select()` handles
a suggestion whose person has no account or no Reviewer role. It
opens the form in a new legacy modal
(`useLegacyGridUrl({op: 'showReviewerForm', …}).openLegacyModal()`) on
top of the Add Reviewer window it sits in. The "Create New Reviewer" and
"Enroll an Existing User as Reviewer" forms in that modal carry
`ReviewerForm::getAdvancedSearchAction()`, "Back to Search". It
reloads the modal's content with `reloadReviewerForm` and
`REVIEWER_SELECT_ADVANCED_SEARCH`, so the inner modal gets a second
`advancedSearchReviewerForm.tpl`.

That template and `advancedSearchReviewerAssignmentForm.tpl` use fixed
element ids: `#advancedReviewerSearch`, `#advancedSearchReviewerForm`,
`#regularReviewerForm`, `#searchGridAndButton`, `#reviewerId` and
`#reviewerFormFooter`. Their scripts bind
`$('#advancedReviewerSearch').pkpHandler(…)` and
`$('#advancedSearchReviewerForm').pkpHandler(…)`. These selectors find
the outer window's elements first, which already have handlers, so
`Handler.js` throws "has already been bound", and the inner copies get
no handler at all:

- `AdvancedReviewerSearchHandler.handleReviewerAssign_()` writes the
  picked reviewer with page-wide selectors (`$('#reviewerId')`,
  `$('#regularReviewerForm').show()`, `$('#reviewerFormFooter
  [name="personalMessage"]')`). These land in the outer window. Only the readouts
  `$('[id^="selectedReviewerName"]')` and
  `$('[id^="selectedReviewerEmail"]')` reach both windows, which is why
  the inner one shows the name and e-mail address.
- The inner `#advancedSearchReviewerForm` has no
  `AddReviewerFormHandler`, so its "Add Reviewer" does a native form
  post. Its `reviewerId` is empty, `AdvancedSearchReviewerForm`'s
  `FormValidator('reviewerId', 'required', …)` refuses it, and
  `PKPReviewerGridHandler::updateReviewer()` returns
  `new JSONMessage(false)`. The browser shows that JSON as the page.
- The nested search's own suggestions list is a new
  `SelectReviewerListPanel`, so its "Select Reviewer" stacks one more
  modal (step 15).

The stacking came with the component in `pkp/ui-library#426` (the
reviewer suggestions feature, `pkp/pkp-lib#4787`). The pkp-lib forms
and their "Back to Search" link predate it: they were built to switch
one window between modes in place.

Reach:

- "Create New Reviewer" (no account): walked on OJS and OMP.
  "Enroll an Existing User as Reviewer" (an account without the
  Reviewer role): by code. `EnrollExistingReviewerForm::fetch()` assigns
  the same `getAdvancedSearchAction()`, and the inner window opens from
  the same `select()`.
- A suggestion whose person holds the Reviewer role is selected in the
  same window (`pkp.eventBus.$emit('selected:reviewer')`). It opens no
  second window and is unaffected (walked).
- The "Reviewers Suggested by Author" panel's row › "Add Reviewer"
  (`useReviewerSuggestionManagerActions.js`) opens a single window, and
  its "Back to Search" turns that window into the search as designed.
  It is unaffected (walked).
- `showReviewerForm` is opened from three places in ui-library:
  this component, the Reviewers panel's "Add Reviewer"
  (`useReviewerManagerActions.js`) and the panel row above. Only this
  one opens it from inside another reviewer form (searched).
- OMP's Internal Review stage shows the same list in its Add Reviewer
  window (spec U31 OMP1). It runs the same code, read in the code and
  not walked.
- OPS has no review stage and no reviewer suggestions.

## Proposed fix

Recommended (a proposal; the team decides): let a suggestion's "Select
Reviewer" switch the window it sits in to the suggestion's form,
instead of stacking a new window. The window's own "Create New
Reviewer" and "Enroll Existing User" links already work this way:
`reloadReviewerForm` answers with a `refreshForm` event, and the
window's `AdvancedReviewerSearchHandler` replaces its content with
the form. "Back to Search" then brings the search back in that same
window
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/fix.diff),
in `lib/ui-library`):

```diff
-			const {openLegacyModal} = useLegacyGridUrl({
+			const {url} = useLegacyGridUrl({
 				component: 'grid.users.reviewer.ReviewerGridHandler',
-				op: 'showReviewerForm',
+				op: 'reloadReviewerForm',
 				params: { …the same params, reviewerSuggestionId included… },
 			});
-			openLegacyModal({title: t('editor.submission.addReviewer')}, () =>
-				this.$emit('update:suggestions', this.item.id),
-			);
+			$.ajax({
+				url: url.value,
+				type: 'POST',
+				data: {csrfToken: pkp.currentUser.csrfToken},
+				dataType: 'json',
+				context: this,
+				error: this.ajaxErrorCallback,
+				success(r) {
+					(r.events || []).forEach((e) =>
+						$(this.$el).trigger(e.name, [e.data ?? null]),
+					);
+				},
+			});
```

Handing a legacy JSON event to the jQuery handler around a Vue
component follows `FileMetadataForm.vue`
(`r.events.forEach((e) => $(rootEl.value).trigger(e.name, e.data ??
null))`). `reloadReviewerForm` already reads `reviewerSuggestionId`,
so the form is prefilled and the suggestion is retired on "Add
Reviewer", as on the panel row's path. The diff also drops the dead
`REVIEWER_SELECT_ADVANCED_SEARCH` branch: that case returns earlier.

Tried on `main`, OJS and OMP:

- The steps now keep one "Add Reviewer" window throughout, and the
  console shows no error.
- Step 9 shows "Create New Reviewer" in place, and step 10 brings back
  the search with the suggestions list.
- Step 11 selects "Julie Janssen" [OMP: "Adela Gallego"], and step 12
  sends the request (`update-reviewer`, answered in the page) and closes
  the window.

A neighbour check gave the same result with the fix in and out:

- A suggestion of a person with the Reviewer role ("Paul Hudson"
  [OMP: "Gonzalo Favio"]) is still selected in the same window.
- The panel row's "Add Reviewer" › "Back to Search" still turns its one
  window into the search.
- Adding the no-account suggestion from the list (username "qu31q5")
  still creates the reviewer: "Quinn u31q5 / Request Sent" under
  Reviewers, and the suggestion is gone from "Reviewers Suggested by
  Author".

The one difference: with the fix, the window closes after that add;
without it, the first window stays open behind the closed inner one.

**Alternatives**

- Keep the stacked window and give the legacy reviewer forms unique
  ids, with every selector in `AdvancedReviewerSearchHandler.js` scoped
  to its container. That is several templates and the handler, plus
  the never-removed `pkp.eventBus.$on('selected:reviewer')` subscription
  that every open window would answer. The editor would still meet a
  search nested inside a search.
- Hide "Back to Search" when the form was opened from the list. This
  needs a new request parameter from ui-library to pkp-lib, and it
  leaves the two windows and the shared ids in place.

**What goes with it**

- The editor's flow changes: after adding a suggested person from the
  list, the Add Reviewer window closes, as it does after any other add,
  instead of staying open on the list. The list panel's
  `updateReviewerSuggestionList()` (`SelectReviewerListPanel.vue`) and
  the `update:suggestions` emit lose their only caller and can go. That
  is also the path where spec U31's
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a9)
  leaves its blank row.
- 3.5's file already has the `hasExistingReviewerRole` rename
  (backport 47cdd9ee); it differs only by the `email:` line that
  `pkp/dev-team#178` (f00671c1) added on `main`. The diff applies to
  3.5 as it stands (`git apply --check -p3` in 3.5's `lib/ui-library`,
  OJS and OMP: hunk 2 at an offset of -1 line). 3.4 and 3.3 have no
  reviewer suggestions.
- No data, API or hook change.
- Guard: an end-to-end check that opens Add Reviewer on a submission
  with a no-account suggestion, presses "Select Reviewer" and "Back to
  Search", and asserts one window with the list (a **Planned** item in
  the spec).

Small: one ui-library component, following a pattern the code base
already uses, tried on both apps. It would be medium if the team wants
the window to stay open after an add from the list.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/lib.js).
  It takes the Steps on PKP's default dataset (pkp/datasets 566bb1f,
  2026-10-03; PostgreSQL) and records the open "Add Reviewer"
  windows, their headings, the "Selected Reviewer" readouts and the
  console at each step. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/walk.js`
  (OPS is skipped). With `WALK_MODE=nb` in front it runs the neighbour
  check alone, on a freshly loaded dataset.
- The fix was tried with
  `node bin/try-fix.js apply shared/playwright/checks/issues/back-to-search-nests-add-reviewer-window/fix.diff ojs omp`
  (which rebuilds ui-library), the walk and the neighbour check, then
  `revert`, and the neighbour check again.
- The walk differs from the text in one way: it reaches the workflow
  by its address (`dashboard/editorial?workflowSubmissionId=<id>`)
  instead of the dashboard list.
- Walked on OJS and OMP `main`: OJS ff004d0973, lib/pkp 987776cd04,
  lib/ui-library 64d67363; OMP 3b0ecf794, lib/pkp 3dc90c81a6,
  lib/ui-library 280f98c5. That
  `SelectReviewerSuggestionListItem.vue` is the same in both
  ui-library checkouts.
- 3.5 walked on OJS and OMP `stable-3_5_0`: OJS c1cee76b95, lib/pkp
  771474347e, lib/ui-library d4e01883; OMP 9c5e24246, lib/pkp
  cf3f984335. That walk took steps 1–11 and 15. Steps 10 and 15 showed
  the nested search, the two console errors and a third window, the
  same as on `main`. Step 12 (the nested "Add Reviewer") was read in
  the code there: `AdvancedReviewerSearchHandler.js`,
  `advancedSearchReviewerAssignmentForm.tpl` and `updateReviewer()`
  match `main`, apart from the e-mail readout added on `main`.
  ui-library on 3.5 holds 1e0faa4a.
- 3.4 and 3.3 were read in the code: `git show` of `origin/stable-3_4_0`
  (lib/ui-library ee684b34, lib/pkp 767353f4fe; OJS d68934d0d1, OMP
  0aec65441) and `origin/stable-3_3_0` (lib/ui-library 96959f9e, lib/pkp
  ac3fa73402; OJS ac77c9fb35, OMP 8e72fc883). No
  `SelectReviewerSuggestionListItem.vue`, no `showReviewerForm` call in
  ui-library's `src`, and no `reviewerSuggestion` in pkp-lib's
  controllers, classes or templates. Their Add Reviewer window switches
  modes in place only.
- Introduced: `git blame` on `select()` in
  `SelectReviewerSuggestionListItem.vue` gives 1e0faa4a for the
  `openLegacyModal` call, which came with the file. The only later
  changes in those lines are 659b110c (the `hasExistingReviewerRole`
  rename, `pkp/pkp-lib#12031`) and f00671c1 (the `email:` in the
  `selected:reviewer` event, `pkp/dev-team#178`); neither touches the
  `openLegacyModal` call. GitHub's `commits/<sha>/pulls` names
  `pkp/ui-library#426`.
- Upstream: searched pkp/pkp-lib, pkp/ui-library, pkp/ojs and pkp/omp
  ("Back to Search" reviewer, reviewer suggestion add reviewer modal,
  "already been bound", `AdvancedReviewerSearchHandler`,
  `SelectReviewerSuggestionListItem`, `reviewerSuggestionId`). The
  "Back to Search" hits (`pkp/pkp-lib#2614`, `#6317`, `#983`) predate
  reviewer suggestions and describe other faults.
- Not driven: the "Enroll an Existing User as Reviewer" inner window,
  and OMP's Internal Review stage (both by code). MySQL was not
  checked; nothing here depends on the database.
- Unverified: the fix was not tried on the Enroll path, nor on 3.5.
