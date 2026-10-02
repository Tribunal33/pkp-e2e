# The box where a manager types a category's name to delete it has no name for a screen reader

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (deleting asks a plain confirmation, with no box)
  - 3.4: none (code; a plain confirmation)
  - 3.3: none (code; a plain confirmation)
- **Introduced** `pkp/ui-library#550` for `pkp/pkp-lib#10449` · [b35c06bc8b](https://github.com/pkp/ui-library/commit/b35c06bc8b87fa5aa6845ba52432efacd46c9a4b) · 2025-05-12 · Taslan A. Graham (taslangraham); the contributor-role dialog from `pkp/ui-library#696` · [b628fd2b78](https://github.com/pkp/ui-library/commit/b628fd2b78276df37f218530419a5704e684f78d) · 2025-11-11 · jyhein
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a18)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

To delete a category, a manager types its name into a box in the
dialog "Are you absolutely sure you want to delete "{name}" category?".
The box has no label, so a screen reader announces only an edit field,
without saying what to type.

The instruction above it ("To confirm, please type the name of the
category … below to proceed") can still be read, so the delete gets
done.

The dialog for deleting a contributor role (Settings › Workflow ›
Submission › "Contributor Roles") has the same unnamed box, on the same
apps and versions.

## Impact

- **Lost**: nothing.
- **Who**: managers who use a screen reader, each time they delete a
  category or a contributor role.
- **Way round**: read the paragraph above the box, which names what to
  type.

Low: a missing label; the instruction is next to the box and the delete
works.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Its
  categories include "Applied Science", and its contributor roles
  "Author". Nothing else is needed.
- Chrome's accessibility inspector, or a screen reader.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal's (press's,
   preprint server's) manager.
2. Open "Settings" › "Journal" ("Press", "Server") and press the
   "Categories" tab.
3. On the "Applied Science" row, press "More Actions" › "Delete
   Category".
4. Inspect the box under "To confirm, please type the name of the
   category "Applied Science" below to proceed" and read its name, or
   move into it with a screen reader.
5. Press "Cancel".
6. Open "Settings" › "Workflow", the "Submission" tab, then "Contributor
   Roles".
7. On the "Author" row, press "More Actions" › "Delete Role".
8. Inspect the box under "To confirm, please type "AUTHOR" below to
   proceed" and read its name.
9. Press "Cancel" (nothing is deleted).

**Expected.** Each box has a name, such as "Name" and "Role Identifier".

**Observed.** On the three apps, both boxes have an empty name, with no
label, `aria-label` or placeholder. The category dialog's box:

```html
<input id="--control" class="pkpFormField__input pkpFormField--text__input" type="text" aria-invalid="false">
```

## Cause

`lib/ui-library/src/managers/CategoryManager/CategoryDeleteDialogBody.vue`
draws the box as `<FieldText class="mt-8" size="large" :value="inputValue"
@input="…" />`, with no `label` and no `name`. `FieldText` writes its `<label for>`
only when it gets a label (`FormFieldLabel.vue`: `<label v-if="label"
…>`), and has no other way to name the input. The instruction is part of
the message above the box (`manager.category.delete.message.body`, which
ends with the "To confirm…" paragraph), drawn as HTML with nothing
linking it to the box. Elsewhere in ui-library, the `FieldText`s without
a label sit in table cells, and a column heading tells what each holds
(`FieldAuthors.vue`, `FieldFunderGrants.vue`; not checked on screen).
These two boxes have no heading either.

With no `name` (and no form), `FieldBase::compileId()` gives the input
the id `--control`, the same in both dialogs.

`ContributorRoleDeleteDialogBody.vue` is a separate component, copied
from the category one, with the same `FieldText`. One shared component
does not draw both, so the fix makes the same change in each file.

Reach: those two dialogs are the only "type to confirm" boxes in
ui-library (a search for the pattern; both walked on the three apps).

## Proposed fix

Recommended (a proposal; the team decides): give each box a label from
an existing text, and a `name` so its id is its own
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/delete-category-box-unnamed/fix.diff),
in `lib/ui-library`):

```diff
 		<FieldText
 			class="mt-8"
+			:label="t('grid.category.name')"
+			name="confirmCategoryName"
 			size="large"
```

in `CategoryDeleteDialogBody.vue`. `grid.category.name` is "Name", the
label of the "Name" field in the "Add Category" and "Edit Category"
window, and is already translated. `ContributorRoleDeleteDialogBody.vue`
gets `:label="t('manager.contributorRoles.identifier')"` ("Role
Identifier", like the role's own form; a 3.6 text not yet translated)
and `name="confirmContributorRoleIdentifier"`. This is how the form
fields name a `FieldText`. The label shows above the box, in bold.

Tried on `main` on the three apps: the boxes are named "Name" and "Role
Identifier", each label points at its own input
(`-confirmCategoryName-control`, `-confirmContributorRoleIdentifier-control`),
and the delete button's rule is unchanged.

**Alternatives**

- Move the "To confirm…" sentence out of the message and make it the
  box's label: the best wording, but the sentence is part of
  `manager.category.delete.message.body` in every language, so each
  translation would have to be split.
- An `aria-label` on the input: `FieldText` does not pass one through,
  so it needs a change to the shared field.

**What goes with it**

- Guard: an end-to-end check that finds the box by its name (a Planned
  item in spec U16; the suite's page object finds it as the dialog's
  only input).

Small: two lines in each of two ui-library files, with existing texts.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js),
  part C and the contributor-role dialog (it walks the U16 A11 and A12
  reports' steps too). It signs in as `rvaca` on PKP's default dataset
  (pkp/datasets e8dafbc, 2026-10-02), reads the box's name from
  Chromium's accessibility tree (CDP `Accessibility.getPartialAXTree`)
  and cancels every dialog. Run:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/category-arrows-keyboard-and-names/walk.js`
  (`nb` as its argument runs the unchanged checks). `PROBE_FEATURE`
  names an install loaded from the default dataset. Put
  `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Fix trial:
  `node bin/try-fix.js apply shared/playwright/checks/issues/delete-category-box-unnamed/fix.diff ojs omp ops`
  (it rebuilds the JavaScript), the walk, then `revert`. The labels were
  first tried without the `name`s, with the `nb` checks in and out;
  the diff as it stands was then walked once more.
- Tips walked, on PostgreSQL:
  - main: OJS b84f8e2e44, OMP 3b0ecf794, OPS c8af945bb7; ui-library
    64d67363 (OJS) and 280f98c5 (OMP, OPS), the same files in both.
  - 3.5: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3. The tab is the
    older list (`CategoryCategoryGridHandler`) and Settings › Workflow
    has no "Contributor Roles" tab; the script found neither.
- Code reads:
  - main: the two dialog files, `FieldText.vue`, `FormFieldLabel.vue`,
    every `<FieldText` in ui-library's `src`.
  - 3.5, 3.4, 3.3: ui-library `stable-3_5_0` (d4e01883),
    `stable-3_4_0` (ee684b34) and `stable-3_3_0` (96959f9e) have no
    `CategoryManager` or `ContributorRoleManager`; pkp-lib `stable-3_4_0` (6f96165c90) and
    `stable-3_3_0` (4156e50233) delete through
    `CategoryCategoryGridHandler::deleteCategory()`, behind the grid's
    confirmation.
- Introduced: `git log` on `CategoryDeleteDialogBody.vue` gives
  b35c06bc8b alone, on `ContributorRoleDeleteDialogBody.vue` b628fd2b78
  alone.
- Upstream search (2026-10-02), pkp/pkp-lib and pkp/ui-library, issues
  and pull requests, open and closed: "delete category confirm label",
  "type the name of the category", `CategoryDeleteDialogBody`,
  "accessibility label dialog input", "A11Y screen reader label delete".
  `pkp/pkp-lib#10404` and `#11411` quote the dialog's wording without
  mentioning the box's label.
- Not driven: a real screen reader; 3.4 and 3.3.
