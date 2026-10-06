# In Add Reviewer's suggestions list, screen readers hear every "Select Reviewer" button as "Select undefined"

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
- **Tracked in** spec U31 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a8)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

In "Select a Reviewer from Reviewer Suggestions" every "Select
Reviewer" button carries the hidden name "Select undefined", where the
same button in "Locate a Reviewer" reads "Select {name}". That hidden
name is what a screen reader reads out for the button, so a
screen-reader user cannot tell the entries' buttons apart; sighted use
is unaffected.

The list is in the Add Reviewer window of a submission's review round,
on a journal or press that has switched on "Reviewer Suggestion at
Submission" and whose author suggested reviewers.

## Impact

- **Lost**: each button's spoken name no longer says which suggested
  person it selects.
- **Who**: editors who assign reviewers with a screen reader. Editors
  who use voice control, and press a button by saying its name, cannot
  say "Select Nova Newcomer" for these buttons; the visible "Select
  Reviewer" is in neither list's button names, so they press by number
  or grid as they already must in "Locate a Reviewer".
- **Way round**: a screen reader reads each entry's name, affiliation
  and reason right before its button, so the user can work out which
  person a button belongs to. Pressing the wrong one opens a window
  that names the person before anything is sent.

Low: the task gets done and nothing is saved wrong. It would be medium
if a wrong press assigned the reviewer at once.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS; on OMP the same steps
  with the differences in brackets). Every reviewer suggestion in it has
  already been turned into a reviewer, so the steps make a submission
  with new ones.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

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
    and press the Reviewers panel's "Add Reviewer".
11. In "Select a Reviewer from Reviewer Suggestions", read the name of
    the "Select Reviewer" button on Nova Newcomer's and on Kim Keeper's
    entry. Then read the name of the first "Select Reviewer" button under
    "Locate a Reviewer".

**Expected.** "Select Nova Newcomer" and "Select Kim Keeper", as
"Locate a Reviewer" names its buttons.

**Observed.** Both buttons are named "Select undefined":

```
- heading "Select a Reviewer from Reviewer Suggestions" [level=2]
- list:
  - listitem: Nova Newcomer · Newcomer University · Works on this topic.
    - button "Select undefined"
  - listitem: Kim Keeper · Keeper Institute · Knows the method.
    - button "Select undefined"
```

The first entry under "Locate a Reviewer" is a button named "Select
Julie Janssen".

## Cause

Each entry of the list is ui-library's
`src/components/ListPanel/users/SelectReviewerSuggestionListItem.vue`.
Its button holds the visible label in an `aria-hidden` span and the
accessible text in a `-screenReader` span:

```vue
<span class="-screenReader">
	{{ t('common.selectWithName', {name: fullName}) }}
</span>
```

The component has no `fullName` (no prop, data or computed of that
name), so the template reads `undefined`, and `t()` writes it into
"Select {$name}" as the word "undefined". The person's name is
`item.fullName`, a multilingual value that the same template shows as
`localize(item.fullName)` in the entry's title and that `select()`
localizes too. The line came with the component in `pkp/ui-library#426`
(the reviewer suggestions feature) and has not changed since.

Reach:

- Every entry of the suggestions list. The list appears in the Add
  Reviewer window of OJS's review stage and of OMP's internal and
  external review stages. OJS review and OMP external review were
  walked; OMP internal review was read in the code (the same
  component).
- "Locate a Reviewer"'s own entries are `SelectReviewerListItem.vue`,
  which passes `item.fullName` (a plain string there): unaffected,
  walked.
- Every `t()`, `__()` and `this.t()` call in `lib/ui-library/src`
  (stories and tests left out) that passes a bare name or `this.x` as
  a parameter, and every `.replace('{$x}', …)` label substitution, was
  checked in the code: each other value is a prop, data, computed,
  setup constant or function parameter of its file. This line is the
  only one reading a name its component does not define.
- The same component's `canSelect` reads `this.approvedAt`, which it
  does not define either; it is always `undefined` there, so the check
  never hides a button. It has no effect today because the list hides
  an approved entry itself; it is left to the report on the spec's
  [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U31-reviewer-suggestions.md#a9),
  which changes how approved entries are left out.

## Proposed fix

Recommended (a proposal; the team decides): pass the localized name
the entry already shows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/fix.diff),
paths from the app root, `a/lib/ui-library/…`; `-p3` in a ui-library
clone):

```diff
 					<span class="-screenReader">
-						{{ t('common.selectWithName', {name: fullName}) }}
+						{{ t('common.selectWithName', {name: localize(item.fullName)}) }}
 					</span>
```

It follows the entry's own title line, which shows
`localize(item.fullName)`. `t()` would localize the object itself
(`replaceLocaleParams()` in `src/utils/i18n.js` localizes an object
parameter), so `{name: item.fullName}` works too; `localize()` is kept
for clarity, so the template says once, the same way in both places,
that the name is a multilingual value.

Tried on `main`, OJS and OMP: the two buttons are now named "Select
Nova Newcomer" and "Select Kim Keeper", and their visible label stays
"Select Reviewer". With the fix in and out alike, "Locate a Reviewer"
keeps "Select Julie Janssen", "Select Paul Hudson" and the rest, and the
workflow's "Reviewers Suggested by Author" rows keep their "{name} More
Actions" menus.

**Alternatives**

- A computed `fullName` returning `this.localize(this.item.fullName)`,
  used by the title, the button and `select()`: tidier, but three
  changes for one wrong reference.
- Drop the hidden span and let the button read "Select Reviewer": every
  button would have the same name, which is what this fault already
  does.

**What goes with it**

- 3.5's file has the same line, so the diff applies there as written.
  3.4 and 3.3 have no reviewer suggestions.
- No data or API change.
- Guard: an end-to-end check that opens Add Reviewer on a submission
  with suggestions and reads each entry's button name (a **Planned**
  item in the spec).

Small: one line in one ui-library component.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/lib.js).
  It takes the Steps on PKP's default dataset (pkp/datasets 566bb1f,
  2026-10-03; PostgreSQL), opening the workflow at step 8 by its
  address (`dashboard/editorial?workflowSubmissionId=…`) rather than
  from the dashboard list, and reads each button's name from Chromium's
  accessibility tree (Playwright's `ariaSnapshot()`). No screen reader
  was run. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,omp node bin/probe.js all shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/walk.js`;
  `WALK_MODE=nb` in front runs the neighbour check alone, on the
  submission a walk left.
- Tips walked:
  - main: OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library 64d67363);
    OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5).
  - 3.5: OJS c1cee76b95 (lib/pkp 771474347e, lib/ui-library d4e01883);
    OMP 9c5e24246 (lib/pkp cf3f984335, lib/ui-library d4e01883). The
    component's template is the same as main's (only `select()` differs:
    main also passes the email, `pkp/ui-library#963`).
- Code reads:
  - main: blame on the `-screenReader` line lands on 1e0faa4a0d, the
    squash of `pkp/ui-library#426` for
    `pkp/pkp-lib#4787`; later commits to the file (797d1925, 659b110c,
    f00671c1) did not touch it.
  - 3.4 (OJS d68934d0d1, OMP 0aec65441; lib/pkp 767353f4fe;
    lib/ui-library ee684b34) and 3.3 (OJS ac77c9fb35, OMP 8e72fc883;
    lib/pkp ac3fa73402; lib/ui-library 96959f9e): no reviewer
    suggestion code in lib/pkp and no suggestion list component in
    lib/ui-library.
- OPS: a preprint server has no review stage and no "Reviewer
  Suggestion at Submission" setting.
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/suggestion-select-reviewer-named-undefined/fix.diff ojs omp`
  (rebuilds ui-library), a fresh dataset, the script, then
  `WALK_MODE=nb` on the submission it left; `WALK_MODE=nb` again after
  `revert`.
- Searched: pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library for
  reviewer suggestion with "undefined", screen reader, accessibility and
  "Select Reviewer", and for `SelectReviewerSuggestionListItem` and
  `selectWithName`: nothing on this fault.
- Not driven: a real screen reader or voice-control software (the
  voice-control line in Impact is read from the button names); OMP's Internal Review window (the
  same component, code).
