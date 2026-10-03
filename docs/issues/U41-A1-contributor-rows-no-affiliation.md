# Contributor lists in the workflow and the submission wizard's Review never show affiliations

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code)
  - 3.3: none (code; no contributor list or wizard of this kind)
- **Introduced** `pkp/pkp-lib#10880` (with `pkp/ui-library#507`) for `pkp/pkp-lib#7135` · [d7c67a46fe](https://github.com/pkp/pkp-lib/commit/d7c67a46fee724dfc003eb4b650021b5edb8e915) · 2025-02-06 · Bozana Bokan (bozana), commit by GaziYucel
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a1) (the workflow and wizard half; the press book page half is [its own report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A1-book-page-long-credits-dangling-comma.md))
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A submission's "Contributors" list, in the workflow and in the
submission wizard, keeps a line under each contributor's name for their
affiliation. That line is always empty, even when the contributor's
"Edit" window lists an affiliation. The wizard's "Review" step lists
each contributor by name alone, where it is built to show "name,
affiliation".

The affiliations are stored and reach the reader pages; only these two
displays miss them. An editor checking who the contributors are, and
an author checking their submission before sending it, must open each
contributor's "Edit" window to see an affiliation. The fix is a few
lines in two components.

## Impact

- **Lost**: nothing stored. The list and the Review step show no
  affiliation, and nothing on them hints that one is stored.
- **Who**: every editor, manager and author who opens a submission's
  "Contributors" list, and every author at the wizard's last step, on
  every submission with an affiliated contributor, typed or chosen
  from the registry alike.
- **Way round**: open "Edit" on each contributor and read
  "Affiliations".

Low: every task gets done; only an overview line is blank.

## Steps to reproduce

Preconditions: PKP's default test dataset for `main` (OJS, OMP or
OPS). Its contributors and its author accounts carry affiliations;
nothing else is needed.

Workflow:

1. Sign in as `dbarnes`.
2. From "Active submissions", open submission 4 "Computer Skill
   Requirements for New and Existing Teachers: Implications for Policy
   and Practice" (OJS), submission 4 "How Canadians Communicate:
   Contexts of Canadian Popular Culture" (OMP), or submission 1 "The
   influence of lactation on the quantity and quality of cashmere
   production" (OPS).
3. In the side menu, under "Publication", choose "Contributors".
4. Press "Edit" on the first contributor (OJS "Craig Montgomerie", OMP
   "Bart Beaty", OPS "Carlo Corino") and read "Affiliations". Close the
   window.

Wizard:

5. Sign in as `ccorino` (OJS, OPS) or `aclark` (OMP).
6. Start a new submission. Under "Submission Language" choose
   "English". Type the title "Affiliation check". On OJS choose the
   section "Articles" (OPS has one section and asks for none; on OMP
   keep "Submission Type" at "Monograph: …"). Tick the checklist and privacy boxes and press "Begin
   Submission".
7. Press "Continue" until "Contributors". Press "Edit" on your own row,
   read "Affiliations", close the window.
8. Press "Continue" until "Review" and read its "Contributors" section.

**Expected**: each row shows the contributor's affiliation on the line
under the name: OJS "University of Alberta" and "University of
Victoria"; OMP "University of British Columbia", "University of
Alberta", "Athabasca University", "University of Calgary"; OPS
"University of Bologna". These are the institutions the "Edit" windows
list. At step 7 the row shows "University of Bologna" (OMP "University
of Calgary"), and Review lists "Carlo Corino, University of Bologna"
(OMP "Arthur Clark, University of Calgary").

**Observed**: the line under every name is empty, in the workflow and
in the wizard, while each "Edit" window lists the affiliation. Review
lists "Carlo Corino" (OMP "Arthur Clark") with no affiliation.

## Cause

The contributor objects the browser receives no longer have an
`affiliation` property. `pkp/pkp-lib#7135` (multiple affiliations with
ROR) replaced the multilingual string `affiliation` in
`lib/pkp/schemas/author.json` with a read-only array `affiliations`.
Each item's `name` is multilingual and already holds the registry's
names for a ROR pick (`PKP\affiliation\maps\Schema::mapByProperties()`),
so the browser needs no lookup of its own.

Two readers in ui-library were left on the old property:

- `src/components/ListPanel/contributors/ContributorsListPanel.vue`,
  the `#item-subtitle` slot: `{{ localize(item.affiliation) }}`.
- `src/components/Container/SubmissionWizardPage.vue`
  `getAuthorName()`: `this.localize(author.affiliation)`, which
  `lib/pkp/templates/submission/review-contributors.tpl` calls for each
  name on the Review step.

`localize()` of `undefined` returns `''` (`src/utils/i18n.js`), so
both fail silently. The same PR changed, in this panel, only the code
that loads `affiliations` into the edit form (ui-library 682f8e94).
The mocks still use the old shape (`src/mocks/authors.js`,
`src/mocks/contributor.js`, and the `ContributorsListPanel.stories.js`
items), so the Storybook story shows the line filled.

Reach:

- No other reader: a search of ui-library, lib/pkp's and the apps'
  templates for `author.affiliation`, `item.affiliation` and
  `contributor.affiliation` finds only these two. The other
  `.affiliation` reads in ui-library are on users, reviewers and
  reviewer suggestions, which still have that property.
- The stored affiliations and the reader pages are not affected.

## Proposed fix

Read `affiliations` in both places and join the localized names.

- The list row follows the reader pages, which loop over
  `getAffiliations()` and put `common.commaListSeparator` between the
  names (OJS `article_details.tpl`, OMP `frontend/components/authors.tpl`):
  "University of Bologna, Second Institute".
- The Review step puts the name and the affiliations on one line, so a
  comma between the affiliations would read as one more affiliation
  ("Carlo Corino, University of Bologna, Second Institute"). It keeps
  the comma after the name, which it has today, and puts
  `common.semicolonListSeparator` between the affiliations: "Carlo
  Corino, University of Bologna; Second Institute".
- Both files read the separators through `this.t()`, which the build
  extracts for the page. The wizard's existing
  `pkp.localeKeys['common.commaListSeparator']` read becomes `this.t()`
  as well.

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contributor-rows-no-affiliation/fix.diff):

```diff
--- a/lib/ui-library/src/components/ListPanel/contributors/ContributorsListPanel.vue
+++ b/lib/ui-library/src/components/ListPanel/contributors/ContributorsListPanel.vue
@@ -58,7 +58,7 @@
 				</template>
 				<template #item-subtitle="{item}">
 					<div class="whitespace-normal text-justify">
-						{{ localize(item.affiliation) }}
+						{{ getAffiliationNames(item) }}
 					</div>
 				</template>
 				<template v-if="canEditPublication" #item-actions="{item}">
@@ -215,6 +215,20 @@
 		},
 	},
 	methods: {
+		/**
+		 * Get a contributor's affiliation names, separated by commas
+		 * as on the reader pages
+		 *
+		 * @param {Object} contributor A contributor object
+		 * @return {String}
+		 */
+		getAffiliationNames(contributor) {
+			return (contributor.affiliations || [])
+				.map((affiliation) => this.localize(affiliation.name))
+				.filter((name) => name)
+				.join(this.t('common.commaListSeparator'));
+		},
+
 		/**
 		 * Helper method to access a global constant in the template
 		 *
--- a/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
+++ b/lib/ui-library/src/components/Container/SubmissionWizardPage.vue
@@ -398,10 +398,15 @@
 		 * @return {String}
 		 */
 		getAuthorName(author) {
-			let affiliation = this.localize(author.affiliation);
+			// Semicolons between affiliations, so that the comma after the
+			// name is not read as one more affiliation
+			let affiliation = (author.affiliations || [])
+				.map((affiliation) => this.localize(affiliation.name))
+				.filter((name) => name)
+				.join(this.t('common.semicolonListSeparator'));
 			if (affiliation) {
 				return [author.fullName, affiliation].join(
-					pkp.localeKeys['common.commaListSeparator'],
+					this.t('common.commaListSeparator'),
 				);
 			}
 			return author.fullName;
```

Tried on OJS, OMP and OPS `main`: every row showed its affiliation, and
Review listed "Carlo Corino, University of Bologna" (OMP "Arthur Clark,
University of Calgary"). With a second affiliation, "Second Institute",
added in the "Edit" window (type the name, choose the typed text,
"Add", "Save"), the row read "University of Bologna, Second Institute"
and Review "Carlo Corino, University of Bologna; Second Institute". On
lists that mix contributors with and without an affiliation (OJS
submission 1, OMP 2, OPS 2), the rows without one stayed blank.

**Alternatives**:

- Add a computed `affiliation` string back to the author's API output.
  This would restore a field the schema deliberately dropped, and the
  REST API would carry the same fact twice.
- Show only the first affiliation. Shorter, but it hides the multiple
  affiliations `#7135` was built to support.
- One shared helper for the join in both components. The two joins
  differ in their separator, so the gain is small.

**What goes with it**:

- Update `src/mocks/authors.js`, `src/mocks/contributor.js` and the
  items in `ContributorsListPanel.stories.js` to the `affiliations`
  shape, so the stories show what the app sends.
- No data repair and no API change.
- Backport: the same diff applies to `stable-3_5_0`'s ui-library
  unchanged (checked with a dry run). 3.4 needs nothing.
- Guard: a check that a contributor row shows the affiliation its
  "Edit" window lists.

Small: two short joins in two ui-library components.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/contributor-rows-no-affiliation/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps and reads each
  contributor's stored affiliations (`author_affiliations`), which
  match the "Edit" windows. `MODE=two` adds the second affiliation in
  steps 4 and 7; `MODE=neighbour` reads the mixed lists.
  The walks gave the new submission another title; the title plays no
  part.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  with pkp/datasets 566bb1f (2026-10-03). 3.5's ui-library d4e01883 has
  the same two reads (`ContributorsListPanel.vue` line 58,
  `SubmissionWizardPage.vue` line 380), and 3.5's `author.json` has
  only `affiliations`.
- Tips: `main` OJS ff004d0973 (lib/pkp 987776cd04, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (lib/pkp 3dc90c81a6,
  ui-library 280f98c5; both ui-library commits hold the two files
  byte for byte the same); `stable-3_5_0` OJS c1cee76b95 (lib/pkp
  771474347e), OMP 9c5e24246c and OPS 38b61882d3 (lib/pkp cf3f984335),
  ui-library d4e01883 in all three.
- 3.4 (code): lib/pkp `stable-3_4_0` 767353f4fe still defines
  `affiliation` in `schemas/author.json`, and ui-library `stable-3_4_0`
  ee684b34 reads it in the same two places, so the line is filled
  there. 3.3 (code): lib/pkp `stable-3_3_0` ac3fa73402 also defines
  `affiliation`, and ui-library `stable-3_3_0` 96959f9e has neither
  `ContributorsListPanel.vue` nor `SubmissionWizardPage.vue`
  (contributors are a legacy grid there).
- Introduced: `git log -S` on `schemas/author.json` gives d7c67a46fe,
  authored by GaziYucel on 2025-01-31, which replaced `affiliation`
  with `affiliations`. Its PR is `pkp/pkp-lib#10880`, opened by
  bozana and merged 2025-02-06 together with `pkp/ui-library#507`
  (682f8e94) and `pkp/omp#1819`. `git blame` on the two reads gives
  older commits (`pkp/pkp-lib#6850` and `#7191`, 2021 and 2022),
  written when the property existed.
- Upstream: `pkp/pkp-lib#10451` (closed) is about long affiliations
  overflowing this same line in 3.4, where it was still filled: a
  different fault, and a sign the line worked before `#7135`.
- Not driven: an affiliation chosen from the registry (ROR); its
  `name` comes from the same map as a typed one (code).
