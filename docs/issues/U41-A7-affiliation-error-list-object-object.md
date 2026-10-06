# A refused affiliation reads "Go to Affiliations: [object Object]" to screen-reader users of the contributor form

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; one "Affiliation" box per language)
  - 3.3: none (code; one "Affiliation" box per language)
- **Introduced** `pkp/pkp-lib#10880` for `pkp/pkp-lib#7135` · [c680b5a27d](https://github.com/pkp/pkp-lib/commit/c680b5a27d86fd9e9f7d6a9603d1ae6a52eb088e) · 2025-02-03 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a contributor's "Save" is refused because an institution entered
by hand has no name in the submission's language, the error list a
screen reader reads at the form's foot says "Go to Affiliations:
[object Object]" instead of the reason. Every other field's entry reads
its message ("Go to Given Name: This field is required.").

Sighted users are not affected: the foot shows "Please correct one
error." and the reason is printed under the field.

## Impact

- **Lost**: no data or work. The list's entry does not say why the
  save was refused.
- **Who**: screen-reader users who clear the name of an institution
  entered by hand (not picked from the registry) in the submission's
  language and save, when adding or editing a contributor in the
  workflow or in the submission wizard. The contributor form is the
  only form with an "Affiliations" field, and this is the only
  affiliation refusal it can reach.
- **Way round**: the message under the "Affiliations" field gives the
  reason. Pressing "Go to Affiliations" scrolls the field into view but
  leaves focus where it was, as every entry of the list does, so a
  screen-reader user has to move to the field to hear it.

Low: nothing is lost and the reason is on the form.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (`publicknowledge`). Each app
  has a submission whose contributor holds one institution entered by
  hand (not from the registry), named in English only:
  - OJS: submission 7, "Developing efficacy beliefs in the classroom",
    contributor "Domatilia Sokoloff", "University College Cork".
  - OMP: submission 1, "The ABCs of Human Survival: A Paradigm for
    Global Citizenship", contributor "Arthur Clark", "University of
    Calgary".
  - OPS: submission 1, "The influence of lactation on the quantity and
    quality of cashmere production", contributor "Carlo Corino",
    "University of Bologna".

Steps:

1. Sign in as `dbarnes`.
2. Open the submission's workflow.
3. In the side menu, open "Publication" › "Contributors" ("Preprint" ›
   "Contributors" on OPS).
4. On the contributor's row, press "Edit".
5. Under "Affiliations", on the institution's row, press the "⋯"
   button (a screen reader names it "Click to edit or delete"), then
   "Edit institution name".
6. Clear the box "Type the institution name in English".
7. Press "Save".

The error list is not drawn on screen: hear it with a screen reader, or
read it in the browser's accessibility tree (developer tools), under
"Please correct one error." at the form's foot.

**Expected**: the save is refused, and the error list reads "Go to
Affiliations: Please provide affiliation name in the submission primary
locale."

**Observed**: the save is refused and the form stays open. Under the
field: "Please provide affiliation name in the submission primary
locale.". The foot shows "Please correct one error." and "Jump to next
error"; the error list holds one button:

```
- text: Please correct one error.
- list:
  - listitem:
    - button "Go to Affiliations: [object Object]"
- button "Jump to next error"
```

The request answers 400 with:

```json
{"affiliations":[{"name":{"en":["Please provide affiliation name in the submission primary locale."]}}]}
```

On the same form, clearing the English "Given Name" and the "Country"
instead lists "Go to Given Name: This field is required." and "Go to
Country: This field is required.".

## Cause

The list is ui-library's `FormErrors.vue`, `errorList()`. For each
field it fills "Go to {$fieldLabel}: {$errorMessage}" (`form.errorA11y`)
with a message it reads one level deep. When the field's errors are an
object, and a JavaScript list is one too, it takes the value under the
first key: the first message of a list (`["This field is required."]`),
or the first language's messages of a multilingual field
(`{"en": ["…"]}`). Only a bare string reaches the other branch.

Since multiple affiliations came in (`pkp/pkp-lib#7135`, PR
`pkp/pkp-lib#10880`), the contributor endpoints
(`PKPSubmissionController::addContributor()` and `editContributor()`)
return each affiliation's errors under its place in the list,
`$newAffiliationErrors['affiliations'][$position]`, so that
`FieldAffiliations.vue` can show the message on the right row
(`errors?.[affiliationIndex]?.name`). One level deep, `errorList()`
gets the first row's whole error object (`{"name": {"en": […]}}`), and
`t('form.errorA11y', …)` turns that object into the text "[object
Object]". No other field of the contributor form nests its errors
deeper than a language.

Reach:

- The workflow's "Edit" (walked) and "Add Contributor" and the
  submission wizard's contributor form (code): all one
  `ContributorForm`, the only form with an "Affiliations" field.
- `Affiliation\Repository::validate()` has two other refusals, which
  the form does not reach (code). "Please provide a ROR affiliation or
  at least one affiliation name." needs a request with no name at all,
  and the form always sends a name for each of its languages, empty or
  not (`getNewAffiliationTemplate()`, `updateAffiliationName()`), so a
  cleared name is refused under its language as in the Steps. "This
  language is not accepted." needs a name in a language the submission
  does not accept, and the name boxes follow the form's languages.
- A funder's "Funder Grants" (`FunderEditForm`): for a funder on
  `funder/Repository::AWARD_FUNDERS` (the Research Council of Finland,
  the European Commission and others), a grant number zenodo.org does
  not know is refused under `grants.{n}.grantNumber`, so its entry
  would read "Go to Funder Grants: [object Object]" (code). When
  zenodo.org does not answer, the check is skipped and nothing is
  refused.
- `FormErrors.vue`, `showError()`, makes the same guess: for an error
  object (`constructor === Object`) it asks the form to show the first
  key as a language. A refused first row makes `affiliations` a JSON
  array, which this test skips, as in the Steps. Only when the first
  row is valid and a later one is refused does the object arrive as
  `{"1": …}` and "1" go to the form as a language (code; not walked,
  and left out of the fix below).

## Proposed fix

Read the first message at any depth in `FormErrors.vue`, so the list
works for every field whose errors are keyed by language, by entry, or
both
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliation-error-list-object-object/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Form/FormErrors.vue
+++ b/lib/ui-library/src/components/Form/FormErrors.vue
@@ -59,22 +59,33 @@
 			return Object.keys(this.errors).map((fieldName) => {
 				const field = this.fields.find((field) => field.name === fieldName);
 				const label = field ? field.label : fieldName;
-				let errorMessage;
-				if (
-					this.errors[fieldName] !== null &&
-					typeof this.errors[fieldName] === 'object'
-				) {
-					errorMessage =
-						this.errors[fieldName][Object.keys(this.errors[fieldName])[0]];
-				} else {
-					errorMessage = this.errors[fieldName];
-				}
-				return {fieldName: fieldName, label: label, message: errorMessage};
+				return {
+					fieldName: fieldName,
+					label: label,
+					message: this.firstMessage(this.errors[fieldName]),
+				};
 			});
 		},
 	},
 	methods: {
 		/**
+		 * Get the first message of a field's errors
+		 *
+		 * A field's errors are a list of messages. They are keyed by locale for a
+		 * multilingual field, and by entry for a field that holds a list of
+		 * entries, such as a contributor's affiliations.
+		 *
+		 * @param {Array|Object|String} error
+		 * @return {String}
+		 */
+		firstMessage(error) {
+			if (error !== null && typeof error === 'object') {
+				return this.firstMessage(Object.values(error)[0]);
+			}
+			return error;
+		},
+
+		/**
 		 * Emit an event to display the next error in the list
 		 */
 		showNextError() {
```

Tried on OJS, OMP and OPS `main` with the Steps: the list read "Go to
Affiliations: Please provide affiliation name in the submission primary
locale.". With and without the fix, "Go to Given Name: This field is
required." and "Go to Country: This field is required." read the same.

**Alternatives**

- Flatten the affiliation errors on the server: `FieldAffiliations.vue`
  needs the position to put the message on its row, and the REST API's
  error shape would change for its clients.
- Handle "affiliations" by name in `FormErrors.vue`: leaves "Funder
  Grants" and any later list field with the same fault.

**What goes with it**

- One change of behaviour: a multilingual field with two messages in
  its first language read both, joined by a comma; it now reads the
  first, as a field without languages already did.
- Backport: the diff applies to `stable-3_5_0` as written.
- Guard: an end-to-end check that takes the Steps and reads the list's
  entry.

Small: one method in one ui-library component, and an end-to-end
check.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/affiliation-error-list-object-object/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on each app and
  records the save's answer, the foot's error box (its text, the
  screen-reader list's buttons, whether each is drawn, its aria
  snapshot) and the field's text; `nb` mode clears Given Name and
  Country instead (the control), `goto` presses the list's button and
  records focus and scroll. On an install freshly loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/affiliation-error-list-object-object/walk.js [steps|goto|nb]`.
  The fix was tried with `steps`, and with `nb` with the fix in and
  out.
- Dataset: pkp/datasets 566bb1f (2026-10-03), PostgreSQL. Not heard
  with a screen reader: the list was read from the accessibility tree.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS: the same
  request, answer and list on both. `goto` on `main`, all three apps:
  after the press the "Affiliations" field was in view and focus had not
  moved; `Form.vue`'s `showField()`, which every entry calls, only
  scrolls (code).
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04, lib/ui-library
  64d67363), OMP `main` 3b0ecf794c and OPS `main` c8af945bb7 (lib/pkp
  3dc90c81a6, lib/ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95
  (lib/pkp 771474347e), OMP 9c5e24246c, OPS 38b61882d3 (lib/pkp
  cf3f984335), lib/ui-library d4e01883 on all three; `stable-3_4_0` OJS
  d68934d0d1 (pkp-lib 767353f4fe, ui-library ee684b34); `stable-3_3_0`
  OJS ac77c9fb35 (pkp-lib ac3fa73402, ui-library 96959f9e).
- Code reads: on `stable-3_5_0`, `FormErrors.vue` matches `main` and `PKPSubmissionController` nests affiliation errors the
  same way (c680b5a27d is on the branch). On `stable-3_4_0`,
  `ContributorForm` has one multilingual `FieldText('affiliation')`,
  whose errors are a language map the list reads, and pkp-lib adds no
  error nested by entry. On `stable-3_3_0`, contributors are edited in
  the older `PKPAuthorForm` (`authorForm.tpl`, one "Affiliation" box
  per language), which has no `FormErrors`.
- Introduced: `git blame` on the two `$newAffiliationErrors['affiliations'][$position]`
  lines in `PKPSubmissionController` gives c680b5a27d (Bozana Bokan,
  "Multiple author affiliations (Ror) - changes and fixes"); the
  feature's first commit, d7c67a46fe (GaziYucel), returned an
  affiliation's errors unnested. Both are in PR `pkp/pkp-lib#10880`
  (bozana, merged 2025-02-06). `errorList()`'s message read dates from
  ui-library 7496b3c2 (2018-10-23, Nate Wright), the first forms.
- Upstream search (2026-10-03): pkp/pkp-lib, pkp/ui-library, pkp/ojs,
  pkp/omp and pkp/ops for "object Object", "Go to Affiliations", "Jump
  to next error", `FormErrors`, `errorList`, `errorA11y` and the
  affiliation message. Open PR `pkp/ui-library#934` ("Improve form
  validation accessibility") moves focus to the error box and leaves
  `errorList()` as it is.
