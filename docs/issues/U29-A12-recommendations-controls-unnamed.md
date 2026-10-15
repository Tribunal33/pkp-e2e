# On "Reviewer Recommendations", a screen reader announces the "Activate" tick boxes and the status dropdown without a name

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no reviewer recommendations settings)
  - 3.4: none (code; no reviewer recommendations settings)
  - 3.3: none (code; no reviewer recommendations settings)
- **Introduced** `pkp/ui-library#444`, `pkp/pkp-lib#10583` and `pkp/ojs#4505` for `pkp/pkp-lib#1660` · the tick box: [292333c44b](https://github.com/pkp/ui-library/commit/292333c44bd1457ae81269c9772b6f200e0f4b77); the dropdown: [d4f7d18e50](https://github.com/pkp/pkp-lib/commit/d4f7d18e50126adfccf6fb1a89cecc3585543597), moved into OJS by [b14943ce19](https://github.com/pkp/ojs/commit/b14943ce19af5ff72bf1b65a85109fb76c63bd83) · merged 2025-04-29 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-15)
- **Tracked in** spec U29 [A12](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U29-review-setup-and-review-forms.md#a12)
- **Checked** 2026-10-15, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal's "Reviewer Recommendations" settings, no row's "Activate"
tick box has a name for a screen reader, and neither has the status
dropdown of the "Add Recommendation" window, the one that offers "Active
Upon Saving" and "Deactivate". A screen reader announces each box only as
"checkbox" and its state, and the dropdown with no name at all.

A journal manager who cannot see the screen learns which recommendation a
box switches only from the row's title, read in the cell before it.
Nothing tells them what the dropdown decides. Both controls work from
the keyboard.

## Impact

- **Lost.** Nothing is saved wrong. A screen-reader user acts on a
  control without hearing what it is, and unticking a box switches that
  recommendation off for every reviewer of the journal.
- **Who.** A journal manager or site administrator who sets up the
  reviewer recommendations with a screen reader.
- **Way round.** For a tick box, the row's title one cell back. For the
  dropdown, its two choices hint at what it decides.

Low: the task gets done, and the row's title is one cell away. A
control without a name fails WCAG 4.1.2 (level A). If the team counts a
nameless control as a screen that misleads its user, this is medium,
because of the tick boxes.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`. Nothing else is needed: the
  journal holds the six reviewer recommendations of a new install
  ("Accept Submission" and the others), all active.
- A way to read a control's accessible name: a screen reader, or the
  browser's developer tools (Chrome: inspect the control, then Elements ›
  Accessibility › "Computed Properties" › "Name").

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager.
2. Open Settings › Workflow
   (`/index.php/publicknowledge/en/management/settings/workflow`), press
   the "Review" tab, then the "Reviewer Recommendations" side tab.
3. Move to the tick box in the "Activate" column of the first row
   ("Accept Submission") and read its name. Do the same on the other
   rows.
4. Press "Add Recommendation". In the window, move to the dropdown below
   "Recommendation type", the one that shows "Active Upon Saving", and
   read its name.
5. Close the window without saving.

**Expected.** Each tick box is named after the recommendation it
switches ("Accept Submission"). The dropdown has a name that says what
it decides, as the window's other two fields have ("Review
Recommendations", "Recommendation type").

**Observed.** All six tick boxes have an empty name, and so has the
dropdown. The browser's accessibility tree for the first row, and for the
dropdown:

```
- row "Accept Submission More Actions":
  - rowheader "Accept Submission"
  - cell:
    - checkbox [checked]
  - cell "More Actions":
    - button "More Actions"

combobox ""   (options "Active Upon Saving" [selected], "Deactivate")
```

Rows 2, 3 and 5 ("Revisions Required", "Resubmit for Review", "Decline
Submission") have no "More Actions" button, because reviews in the
dataset have chosen those recommendations; their tree has no last cell's
button. Control: the window's two other fields and every "More Actions"
button are named.

## Cause

The tick box, ui-library
`src/managers/ReviewerRecommendationManager/ReviewerRecommendationManager.vue`
lines 35 to 44: the `<input type="checkbox" name="recommendation_status[]">`
sits in a `<label>` that holds nothing but the box, with no
`aria-label` or `aria-labelledby`. The recommendation's title is
rendered in the row header (`localize(item.title)`, line 31), outside
that label. It has been so since the table was written for
`pkp/pkp-lib#1660`, in `ReviewerRecommendationsListPanel.vue` then; the
move to `ReviewerRecommendationManager.vue` (ff4987a12) kept it.

The dropdown, OJS
`classes/components/forms/context/ReviewerRecommendationForm.php`
lines 59 to 72: the `status` `FieldSelect` is given `options`, a `value`
and a `size`, but no `label`. ui-library's `FormFieldLabel.vue` renders
its `<label for="…">` only `v-if="label"`, so the `<select>` gets no
label at all. The form was written in pkp-lib for `pkp/pkp-lib#1660` and
moved into OJS unchanged (b14943ce19).

Reach:

- Only OJS shows the tab: pkp-lib's `templates/management/workflow.tpl`
  (line 78) renders it under `{if $hasCustomizableRecommendation}`, which
  is `Application::hasCustomizableReviewerRecommendation()`: `true` in
  OJS, `false` in OMP and OPS (code). So the ui-library change, though
  shared, reaches only OJS.
- The same dropdown is in the "Edit Recommendation" window ("More
  Actions" › "Edit"), offered only on a row whose recommendation no
  review has chosen (`item.removable`); its dropdown has no name either
  (code).
- Among the PHP form components of OJS and pkp-lib, this `status` field
  is the only control built without a name: every `new Field…(` call
  was read for a top-level `label`, and the others without one,
  `FieldHTML` (`PublishForm.php`, `OrcidSettingsForm.php`,
  `OrcidSiteSettingsForm.php`, `ChangeSubmissionLanguageMetadataForm.php`)
  and `FieldShowEnsuringLink` (`PKPReviewGuidanceForm.php`), name no
  control: `FieldHTML` has none, and the ensuring-link box is named by
  its option's label.
- In ui-library's `.vue` templates, this is the only `<label>` that
  holds an `<input>` and no text (`DateRange.vue` and `Search.vue` put a
  hidden span in theirs). The DOIs page's tick boxes, built another way,
  have a report of their own
  ([the DOIs page's controls](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U45-A8-doi-page-controls-unnamed.md)).

## Proposed fix

Recommended: name the tick box after the row's title with
`aria-labelledby`, and give the dropdown a label
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommendations-controls-unnamed/fix.diff)):

```diff
--- a/classes/components/forms/context/ReviewerRecommendationForm.php
+++ b/classes/components/forms/context/ReviewerRecommendationForm.php
@@ -57,6 +57,7 @@
                 'size' => 'normal',
             ]))
             ->addField(new FieldSelect('status', [
+                'label' => __('common.status'),
                 'options' => [
                     [
                         'label' => __('manager.reviewerRecommendations.activateUponSaving.label'),
--- a/lib/ui-library/src/managers/ReviewerRecommendationManager/ReviewerRecommendationManager.vue
+++ b/lib/ui-library/src/managers/ReviewerRecommendationManager/ReviewerRecommendationManager.vue
@@ -28,7 +28,9 @@
 			<TableBody>
 				<TableRow v-for="item in store.items" :key="item.id">
 					<TableCell :is-row-header="true">
-						<span class="text-lg-normal">{{ localize(item.title) }}</span>
+						<span :id="`${id}-title-${item.id}`" class="text-lg-normal">
+							{{ localize(item.title) }}
+						</span>
 					</TableCell>
 
 					<TableCell>
@@ -38,6 +40,7 @@
 								:name="`recommendation_status[]`"
 								:value="item.id"
 								:checked="item.status"
+								:aria-labelledby="`${id}-title-${item.id}`"
 								class="text-blue-900 bg-gray-100 border-gray-300 focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 dark:bg-gray-700 dark:border-gray-600 h-5 w-5 rounded focus:ring-2"
 								@click.prevent="(event) => handleStatusToggle(item, event)"
 							/>
```

The tick box takes its name from the title the row already shows, so the
name and the visible text cannot drift apart, and the row is read once.
A hidden `<span class="-screenReader">` with the title inside the box's
label, the way `DateRange.vue` and `Search.vue` name their inputs, also
names the box, and was tried first. But here the title is already in the
same row: the hidden copy becomes part of the cell's text too, and the
row reads "Accept Submission Accept Submission More Actions". The id
uses the component's own `id` prop and the recommendation's id, so it is
unique on the page.

The dropdown gets a `label` like the form's two other fields, so
`FormFieldLabel` renders its `<label for>`. "Status" (`common.status`)
is an existing, translated pkp-lib string, already the heading of the
DOIs page's status filter. The label is visible: the window gains
"Status" above the dropdown, a change to the screen the team should
approve. Keeping the window as it looks today needs a hidden label,
which ui-library does not offer: `FormFieldLabel` has no hidden mode,
and `FieldSelect` passes no `aria-label` to its `<select>`.

Tried on OJS `main`. Each of the six tick boxes is named after its row
("Accept Submission"), the row still reads "Accept Submission More
Actions", the new ids repeat no id on the page, and the dropdown is
named "Status". Neighbour check, the same with and without the fix:
- Space on a box opens "Deactivate Reviewer Recommendation" and then
  "Activate Reviewer Recommendation", and "Yes" switches the box each
  time.
- A recommendation saved with "Deactivate" lands unticked.
- The dropdown keeps its two choices, with "Active Upon Saving"
  preselected.
- The table's screenshot is identical byte for byte.

**Alternatives**

- The hidden span for the tick box: tried (above); it names the box but
  makes every row read its title twice.
- `aria-label="localize(item.title)"` on the box: the same name with no
  id, but a second copy of the title in the template to keep in step
  with the row header. Not tried.
- Label the dropdown "Activate" (`manager.reviewerRecommendations.list.status.title`,
  the table's column heading): matches the table, but reads oddly above
  "Active Upon Saving" and "Deactivate". Not tried.
- A hidden label for the dropdown, keeping the window unchanged: a new
  option in ui-library's `FormFieldLabel` and `FieldSelect`. Not tried.

**What goes with it**

- The ui-library change reaches OJS through its submodule bump.
- No stored data is involved, and nothing that reads the table or the
  form changes: the box keeps its `name`, `value` and click handler, and
  the dropdown its `name` and options.
- Guard: an e2e scenario on the tab that finds each row's tick box by
  role and the row's title, and the window's dropdown by role and its
  label (a Planned item in spec U29).

Medium, because the fix spans two repositories (OJS and ui-library);
each change is a line or two following an existing pattern, with no new
locale key.

This is a proposal; the team decides.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/recommendations-controls-unnamed/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps as `rvaca` on PKP's
  default dataset (pkp/datasets 7912e09, 2026-10-14) and reads each name
  from Chromium's accessibility tree (CDP
  `Accessibility.getPartialAXTree`, what DevTools shows and what a screen
  reader is given) and by a role-and-name query; no screen reader was
  run. `MODE=neighbour` runs the neighbour check. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/recommendations-controls-unnamed/walk.js`
  on a dataset fleet, with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/recommendations-controls-unnamed/fix.diff ojs`,
  the walk (`MODE=steps`, then `MODE=neighbour`), then `revert` and
  `MODE=neighbour` again. The hidden-span version was tried the same way
  before it, on the same day.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database):
  - main: OJS 378eced941, pkp-lib b17fadae59, ui-library 47b565cb.
  - 3.5: OJS ca763c91cd, pkp-lib 4045d9241e, ui-library 2576e00a. The
    "Review" tab has the side tabs "Setup", "Reviewer Guidance" and
    "Review Forms" only.
- Code reads:
  - main: `ReviewerRecommendationManager.vue` lines 29 to 56,
    `ReviewerRecommendationForm.php` lines 45 to 72, `FormFieldLabel.vue`
    (the `v-if="label"`), `FieldSelect.vue`, `TableCell.vue`; the gate,
    `templates/management/workflow.tpl` line 78 and
    `hasCustomizableReviewerRecommendation()` in each app's
    `classes/core/Application.php` (OJS `true`, OMP and OPS `false`).
  - 3.5: no `ReviewerRecommendationForm.php` in OJS and no
    `src/managers/ReviewerRecommendationManager/` in ui-library; the
    recommendations are fixed and appear only on the reviewer's form
    (`templates/reviewer/review/reviewerRecommendations.tpl`).
  - 3.4 (OJS daf0ca971d, pkp-lib 55c8e406b3, ui-library ee684b34) and
    3.3 (OJS d7d9dd14ec, pkp-lib 5e84acd11b, ui-library 96959f9e): no
    file of the feature in any of the three repositories, only the same
    reviewer template.
- Introduced: `git blame` on `ReviewerRecommendationManager.vue` lines
  35 to 44 gives ff4987a12 ("refactored to composition api"), whose
  parent holds the same empty label in `ReviewerRecommendationsListPanel.vue`,
  added by 292333c44b; `git log -S activateUponSaving` gives d4f7d18e50
  in pkp-lib and b14943ce19 in OJS, both without a `label` on the field.
  GitHub's `commits/<sha>/pulls` names `pkp/ui-library#444`,
  `pkp/pkp-lib#10583` and `pkp/ojs#4505`, all merged 2025-04-29.
- Upstream search (2026-10-15), pkp/pkp-lib, pkp/ui-library and pkp/ojs,
  issues and pull requests, open and closed: "reviewer recommendation
  checkbox label", "reviewer recommendations accessibility", "reviewer
  recommendation screen reader", `ReviewerRecommendationManager`,
  "reviewer recommendation checkbox", `ReviewerRecommendationForm`,
  "reviewer recommendation label", "Active Upon Saving", "A11Y checkbox
  label", `recommendation_status`. The hits are the feature's own issue
  and pull requests and unrelated "[A11Y]" issues.
- Not driven: a screen reader or voice control; the "Edit
  Recommendation" window (the same form, read in the code); OMP and OPS
  (the tab's gate is off there, read in the code); 3.4 and 3.3.
- Unverified: how a given screen reader words the two controls
  ("checkbox, checked" and "combobox" are the roles and states the tree
  carries).
