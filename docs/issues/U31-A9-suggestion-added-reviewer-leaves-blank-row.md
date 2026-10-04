# After an editor adds a suggested reviewer in the Add Reviewer window, the suggestions list keeps an empty row

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: none (code; no reviewer suggestions)
  - 3.3: none (code; no reviewer suggestions)
- **Introduced** `pkp/ui-library#426` for `pkp/pkp-lib#4787` · [1e0faa4a0d](https://github.com/pkp/ui-library/commit/1e0faa4a0d5ea1bce3ec41d58a6aa3820da7bc80) · 2025-02-27 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U31 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a9)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

An editor turns a reviewer suggestion into a reviewer from the Add
Reviewer window's "Select a Reviewer from Reviewer Suggestions" list:
"Select Reviewer" on the entry opens a second "Add Reviewer" window on
top. After pressing "Add Reviewer" in that second window, the entry's
text leaves the list but its row stays behind as blank space, with
nothing in it to click. Closing the window and opening it again clears
the gap.

Nothing is lost: the reviewer is added, and the remaining entries work.
It happens for a suggested person who has no account or no Reviewer
role; one who already holds the Reviewer role is selected in the same
window and is unaffected. The list needs "Reviewer Suggestion at
Submission", which is off by default.

## Impact

- **Lost**: nothing; only the list's layout.
- **Who**: every editor who adds a suggestion this way, each time.
- **Way round**: none needed.

Low: the task gets done and nothing is saved wrong; only the list's
layout is off until the window is reopened.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; on OMP the same steps
  with the differences in brackets). Every reviewer suggestion in it has
  already been turned into a reviewer, so the steps make a submission
  with new ones.

Switch the feature on:

1. Sign in as `rvaca` (password `rvacarvaca`).
2. Open Settings › Workflow › "Review" › "Setup", tick "Allow authors to
   suggest potential reviewers at submission process" under "Reviewer
   Suggestion at Submission", and press "Save".

A submission with two suggestions:

3. Sign in as `ccorino` [OMP: `aclark`]. Press "New Submission", choose
   "English", type the title "Reviewer suggestions u31q4", choose the
   section "Articles" [OMP: no section], tick the requirement boxes and
   press "Begin Submission".
4. Upload a manuscript file, type an abstract on "Details" and press
   "Continue" until "Reviewer Suggestions".
5. Press "Add Reviewer Suggestion", fill "Given Name" "Nova", "Family
   Name" "Newcomer", "Email" "nova.u31q4@mailinator.com", "Affiliation"
   "Newcomer University", "Reasons for suggesting reviewer" "Works on
   this topic.", and press "Save".
6. Add a second one the same way: "Kim", "Keeper",
   "kim.u31q4@mailinator.com", "Keeper Institute", "Knows the method.".
7. Press "Continue", then "Submit", and confirm.

Into review:

8. Sign in as `dbarnes`. On the dashboard's "Assigned to me" [OMP:
   "Active submissions"], open "Reviewer suggestions u31q4".
9. Press "Send for Review" [OMP: "Send to External Review"], press
   "Continue" and "Record Decision".
10. Open the round ("Review" › "Round 1" in the workflow's side menu)
    and press the Reviewers panel's "Add Reviewer". "Select a Reviewer
    from Reviewer Suggestions" lists Nova Newcomer and Kim Keeper.

Add Nova from the list:

11. Press "Select Reviewer" on Nova Newcomer's entry. A second "Add
    Reviewer" window opens on "Create New Reviewer", with "Given Name",
    "Family Name", "Email" and "Affiliation" filled in.
12. Type "u31q4nova" in "Username" and press "Add Reviewer".
13. Look at "Select a Reviewer from Reviewer Suggestions" in the window
    that stays open.
14. The control: press the window's "<" ("Close") arrow, press "Add
    Reviewer" again and look at the list.

**Expected.** At step 13 the list holds Kim Keeper's entry alone, as it
does when the window is opened again.

**Observed.** The second window closes and Nova Newcomer is added (the
Reviewers panel lists "Nova Newcomer Request Sent"). At step 13 the list
has two rows: the first is blank space (24 px high, no text, no control)
where Nova's entry was, then Kim Keeper's entry. At step 14 the reopened
list holds Kim Keeper's entry alone.

## Cause

The list is the first `ListPanel` in ui-library's
`src/components/ListPanel/users/SelectReviewerListPanel.vue`. It is
given every suggestion the window opened with, `:items="suggestions"`,
and `ListPanel.vue` renders one `<li class="listPanel__item">` per
item. The panel's item slot hides an approved entry inside that `li`:

```vue
<template #item="{item}">
	<SelectReviewerSuggestionListItem
		v-if="!item.approvedAt"
```

When the inner window closes, `updateReviewerSuggestionList()` re-reads
the suggestion (`GET …/reviewers/suggestions/{id}?include_reviewer_data=true`,
200) and, since it is now approved, sets `approvedAt` on the entry in
`suggestions` and adds the new reviewer to "Locate a Reviewer". The
item's `v-if` then empties the entry, but the list still holds it, so
its `li` stays with nothing in it, keeping its padding as a 24 px gap.
On a fresh opening the server sends only pending suggestions
(`PKPSelectReviewerListPanel::getReviewerSuggestions()`, called from
`getConfig()`, reads them `withApproved(false)`), so the gap goes. The filter belongs on the
list's items, not inside the row. The code came with the component in
`pkp/ui-library#426` (the reviewer suggestions feature) and has not
changed since.

Reach:

- Every entry turned into a reviewer through the inner window: a person
  with no account ("Create New Reviewer", walked) or an account without
  a Reviewer role ("Enroll an Existing User as Reviewer", code: the same
  close callback).
- A person with a Reviewer role is selected in the same window, whose
  "Add Reviewer" closes the whole window, so no gap shows (code).
- The panel's `v-if="suggestions.length > 0"` counts approved entries
  too: when the last pending suggestion is added this way, the heading
  "Select a Reviewer from Reviewer Suggestions" stays over a list of
  empty rows until the window is reopened (code).
- The same pattern (a `v-if` on the slot content of a `ListPanel` item)
  appears nowhere else in ui-library's list panels (searched).
- `SelectReviewerSuggestionListItem.vue`'s `canSelect` reads
  `this.approvedAt`, which the component does not define, so that check
  never applies (code); the fix leaves it as it is.

## Proposed fix

Recommended (a proposal; the team decides): give the list only the
pending suggestions, and show it only while there is one
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-added-reviewer-leaves-blank-row/fix.diff),
paths from the app root, `a/lib/ui-library/…`; `-p3` in a ui-library
clone):

```diff
 			<ListPanel
-				v-if="suggestions.length > 0"
+				v-if="pendingSuggestions.length > 0"
 				class="listPanel--selectReviewer reviewer-sugestions-list"
-				:items="suggestions"
+				:items="pendingSuggestions"
 			>
 ...
 					<SelectReviewerSuggestionListItem
-						v-if="!item.approvedAt"
 						:key="item.id"
 ...
+		pendingSuggestions() {
+			return this.suggestions.filter((suggestion) => !suggestion.approvedAt);
+		},
```

It follows the component's own `currentReviewers`, a computed list fed
to the second `ListPanel`, and matches what the server sends on a fresh
opening (pending suggestions only). `updateReviewerSuggestionList()`
keeps setting `approvedAt` as it does now, so the computed list drops
the entry and the `li` with it; when the last pending one goes, the
list and its heading go too, as on a fresh opening.

Tried on `main`, OJS and OMP: after the inner "Add Reviewer" the list
holds Kim Keeper's entry alone, with no empty row, and Nova Newcomer is
added as before. With the fix in and out alike, the reopened list holds
Kim Keeper's entry with its button, "Locate a Reviewer" shows Nova
Newcomer with "This reviewer has already been assigned to this review
round." and no button, and the Reviewers panel lists her.

**Alternatives**

- Remove the entry from `suggestions` in `updateReviewerSuggestionList()`:
  works too, but it puts the "pending only" rule in the request's
  success callback, while a computed list next to the template keeps it
  in one declarative place, as `currentReviewers` does for the other
  list.
- Hide the emptied row with CSS: it hides the symptom only, and the
  heading would still stand over an empty list once the last pending
  suggestion is added.

**What goes with it**

- 3.5's file is the same, so the diff applies there as written. 3.4 and
  3.3 have no reviewer suggestions.
- Overlap with the spec's
  [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a10)
  (`jardakotesovec/pkp-e2e#841`), whose proposed fix loads the Create
  or Enroll form in the same window instead of a second one. With that
  fix in, the whole window closes after "Add Reviewer", so the blank
  row cannot appear. This fix's filter then repeats what the server
  already does (`withApproved(false)`), which is harmless. The team may
  instead drop `updateReviewerSuggestionList()` and the item's
  `update:suggestions` emit. The A8, A9 and A10 diffs apply together,
  in any order.
- No data or API change.
- Guard: an end-to-end check that adds a suggested person through the
  inner window and counts the list's rows (a **Planned** item in the
  spec).

Small: a computed list and two attributes in one ui-library component.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-added-reviewer-leaves-blank-row/walk.js),
  with the helpers of the A8 walk,
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/lib.js).
  It takes the Steps on PKP's default dataset (pkp/datasets 566bb1f,
  2026-10-03; PostgreSQL), opening the workflow at step 8 by its
  address (`dashboard/editorial?workflowSubmissionId=…`) rather than
  from the dashboard list, and reads each row of the list (its text,
  height and buttons) before the add, after it and after reopening. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/suggestion-added-reviewer-leaves-blank-row/walk.js`;
  `WALK_MODE=nb` in front runs the neighbour check alone, on the
  submission a walk left.
- Tips walked:
  - main: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library 64d67363);
    OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - 3.5: OJS c1cee76b95 (lib/pkp 771474347e, lib/ui-library d4e01883);
    OMP 9c5e24246 (lib/pkp cf3f984335, lib/ui-library d4e01883).
    `SelectReviewerListPanel.vue` is the same as main's.
- Code reads:
  - main: blame on `:items="suggestions"`, `v-if="!item.approvedAt"`,
    `v-if="suggestions.length > 0"` and the `approvedAt` assignment in
    `updateReviewerSuggestionList()` lands on 1e0faa4a0d, the squash of
    `pkp/ui-library#426` for `pkp/pkp-lib#4787`.
  - 3.4 (OJS d68934d0d1, OMP 0aec65441; lib/pkp 767353f4fe;
    lib/ui-library ee684b34) and 3.3 (OJS ac77c9fb35, OMP 8e72fc883;
    lib/pkp ac3fa73402; lib/ui-library 96959f9e): no reviewer
    suggestion code in lib/pkp and no suggestion list component in
    lib/ui-library.
- OPS: a preprint server has no review stage and no "Reviewer
  Suggestion at Submission" setting.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/suggestion-added-reviewer-leaves-blank-row/fix.diff ojs omp`
  (rebuilds ui-library), a fresh dataset, the script, then
  `WALK_MODE=nb` on the submission it left; `WALK_MODE=nb` again after
  `revert`.
- Searched: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library for
  reviewer suggestion with empty row, blank and list, "Select a Reviewer
  from Reviewer Suggestions", and `updateReviewerSuggestionList`:
  nothing on this fault.
- Not driven: the "Enroll an Existing User as Reviewer" path and the
  last pending suggestion added this way (both code); OMP's Internal
  Review window (the same component, code).
