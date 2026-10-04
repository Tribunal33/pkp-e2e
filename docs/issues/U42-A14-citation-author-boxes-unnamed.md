# A screen reader hears no name for the author boxes in "Edit citation" and the data citation panel

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; references are one free-text box, no data citations)
  - 3.4: none (code; the same free-text box)
  - 3.3: none (code; the same free-text box)
- **Introduced** PR `pkp/ui-library#629`, with the companion PR `pkp/pkp-lib#11427` (no issue linked) · [01208ab2](https://github.com/pkp/ui-library/commit/01208ab2d902a5275913f4f527e33017a174e661) · 2025-06-25 · GaziYucel (GaziYucel)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A14](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a14)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

In "Edit citation" (the References page with metadata lookup on), each
row under "Author Information" has three boxes: given name, family name
and ORCID iD. None of them has a name, so a screen reader announces
a text box without saying which of the three it is. The column names
are shown only in the table's header row.

The "Creators" rows of the data citation panel ("Add Data Citation",
"Edit Data Citation") are drawn by the same component and have the
same unnamed boxes. Nothing is saved wrongly.

The author boxes show only when the journal, press or server has
"Enable references structuring and metadata lookup" turned on, and the
Creators boxes only when it has data citations turned on. Both are off
in a new install.

## Impact

- **Lost**: the name of each box, for a screen reader user.
- **Who**: screen reader users among the editors, and the authors
  allowed to edit the publication, on the workflow's Publication ›
  "References" and "Data" pages. Authors also meet the "Creators"
  boxes while submitting, in the wizard's "Data" section, when the
  journal asks for data citations. The wizard's references are one
  plain box, without "Edit citation".
- **Way round**: the header cells are real column headers (`<th
  scope="col">` in a `<table>`), so a screen reader that reads table
  headers announces the column when it moves into a cell. One that does
  not leaves the user to read the header row and count the boxes, which
  follow the column order.

Low: the boxes fail WCAG 4.1.2 (level A), but the column headers stay
readable.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS).
- Metadata lookup and data citations on (both off in the dataset):
  sign in as `dbarnes` (password `dbarnesdbarnes`), go to Settings ›
  Workflow › "Submission" › "Metadata". Under "References", tick
  "Enable references structuring and metadata lookup". Under "Data
  Citations", tick "Enable data citation metadata" and choose "Do not
  request data citation metadata from the author during submission.".
  Press "Save".
- A way to read a control's accessible name: a screen reader, or
  Chrome's accessibility inspector (inspect the box, then Elements ›
  Accessibility › "Computed Properties" › "Name").

The submission per app: OJS 4, "Computer Skill Requirements for New and
Existing Teachers: Implications for Policy and Practice"; OMP 3, "The
Political Economy of Workplace Injury in Canada"; OPS 1, "The influence
of lactation on the quantity and quality of cashmere production".

"Edit citation":

1. As `dbarnes`, open the submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
2. In the side menu under "Publication" ("Preprint" on OPS), choose
   "References".
3. Type `Lovelace A. u42r4 Notes on the analytical engine. 1843.` in
   "References" and press "Add" (`u42r4` is only a name; any reference
   text will do).
4. On the new row, press "More Actions" and choose "Edit".
5. Under "Author Information", press "Add" twice.
6. Read the names of the six boxes.

The data citation panel:

7. Close the panel. In the side menu under "Publication" ("Preprint" on
   OPS), choose "Data".
8. Press "Add Data Citation".
9. Under "Creators", press "Add".
10. Read the names of the three boxes.

**Expected.** Each box is named after its column: "Given Name",
"Family Name", "ORCID iD".

**Observed.** Every box has an empty name. The table at step 6 as
Chrome's accessibility tree gives it to a screen reader:

```
table "Author Information":
  row "Given Name Family Name ORCID iD": columnheader "Given Name", columnheader "Family Name", columnheader "ORCID iD", columnheader
  row "Delete": cell: textbox, cell: textbox, cell: textbox, cell "Delete": button "Delete"
  row "Delete": cell: textbox, cell: textbox, cell: textbox, cell "Delete": button "Delete"
button "Add"
```

The boxes have no `<label>`, and the two rows' boxes share three ids
(`-givenName-control`, `-familyName-control`, `-orcid-control`). At step
10 the three "Creators" boxes have empty names too.

## Cause

`FieldAuthors.vue` (`lib/ui-library/src/components/Form/fields/`) draws
each row as three `FieldText`s given only a `name` and a `value`:

```vue
<FieldText
	:name="'givenName'"
	:value="row.givenName"
	…
```

`FieldText` draws its `<label for>` only when it receives a `label`
(`FormFieldLabel.vue`: `<label v-if="label" …>`), so the input has no
name. The column names are `<th scope="col">` cells (`TableColumn.vue`),
which give a cell its header in table reading but never name a control.

The ids repeat for the reason
[U41-A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A10-name-boxes-labels-run-together.md)
and
[U06-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A8-invitation-role-rows-unnamed.md)
found for other fields: `FieldBase.compileId()` builds an id from
`[formId, name, type]`, and the boxes get no `formId`, so every row's
given name box is `-givenName-control`. A label added without a per-row
id would point at the first row's box from every row.

Reach:

- "Edit citation", "Author Information" (walked on the three apps).
- "Add Data Citation", "Creators" (walked on the three apps); "Edit
  Data Citation" draws the same field (code), and so does the submission
  wizard's "Data" section, which mounts the same data citation table
  and panels (code). "View Data Citation" shows the creators as a list
  of names (`FieldAuthorsDisplay.vue`), with no boxes.
- The same mistake elsewhere, left out of this fix:
  `FieldFunderGrants.vue`, the grant rows of the Funding page's funder
  panel, draws its three boxes the same way, unlabelled and without a
  per-row id (code, not walked).

## Proposed fix

Recommended (a proposal; the team decides): give each box the visible
label of its column and a per-row `formId`, as the U41-A10 fix does for
`FieldAffiliations` and the U06-A8 fix for the invitation's role rows
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-author-boxes-unnamed/fix.diff),
in `lib/ui-library`):

```diff
 						<FieldText
+							:form-id="`${props.formId}-${props.name}-${index}`"
+							:label="t('user.givenName')"
 							:name="'givenName'"
```

and the same two lines on the family name (`user.familyName`) and ORCID
iD (`user.orcid`) boxes. The labels are the keys the header already
uses, so they are translated. The ids become
`citation_structured-authors-0-givenName-control` (`data_citation-…`
in the data citation panel), one per row, and follow the row's position
when a row is added or deleted. Each row's error message gets a unique
id too, since `describedByErrorId` also goes through
`compileId('error')`. Each label shows above its box, in every row,
under the header row, which stays.

Tried on `main` on the three apps: every box is named after its column
in "Edit citation" and in "Add Data Citation", each id is used once, and
a click on the second row's "Given Name" label puts the cursor in that
row's box. With and without the fix, two other checks gave the same
result: names typed into two rows are saved and stored in order, and a
bare ORCID iD in a creator's second row is refused with the message
under that row.

**Alternatives**

- Visually hidden labels, keeping the table's look: `FieldText` has no
  prop to hide its label, so this needs a new prop on a shared field (a
  new pattern) for a small gain; a visible label also gives a mouse
  user a larger target.
- `aria-labelledby` pointing at the column header: `FieldText` has no
  prop for it, and an attribute set on it lands on its outer `div`, not
  the input.
- Labels without the per-row `formId`: every label would point at the
  first row's box. `FieldCreditRoles.vue` has this trap today (labelled
  row selects, no per-row `formId`); it is a separate component, left
  out here.

**What goes with it**

- `FieldFunderGrants.vue` needs the same change (labels from its own
  column keys, `submission.funders.funder.grant.*`), with a walk on the
  Funding page.
- Guard: a ui-library unit test that mounts `FieldAuthors` with two rows
  and expects every input to have a label and a unique id, or the e2e
  check in Evidence.

Small: six attributes in one ui-library file, tried, with no data or API
change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-author-boxes-unnamed/walk.js)
  (helpers in `../citation-author-row-kept-after-close/lib.js` and
  `../name-boxes-labels-run-together/lib.js`). It takes the Steps as
  `dbarnes` on PKP's default dataset (pkp/datasets 566bb1f, 2026-10-03)
  and reads each box's id, the labels the browser ties to it and its
  name in Chromium's accessibility tree (CDP
  `Accessibility.getPartialAXTree`). With `nb` as its argument it runs
  the two checks of the fix trial instead (names saved from two rows; a
  refused ORCID iD's message). Each run starts from a freshly loaded
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/citation-author-boxes-unnamed/walk.js [steps|nb]`.
  The fix was applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/citation-author-boxes-unnamed/fix.diff <app>`.
- Tips walked, on PostgreSQL:
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). `FieldAuthors.vue` is identical in both ui-library
    commits.
- Code reads:
  - main: `FieldAuthors.vue`, `FieldText.vue`, `FieldBase.vue`
    (`compileId()`), `FormFieldLabel.vue`, `TableColumn.vue`,
    `TableCell.vue`, `FieldAffiliations.vue`, `FieldCreditRoles.vue`,
    `FieldFunderGrants.vue`, `DataCitationViewModal.vue`,
    `FieldAuthorsDisplay.vue`, `SubmissionWizardPage.vue`; pkp-lib
    `CitationStructuredEditForm.php` (form id `citation_structured`) and
    `DataCitationEditForm.php` (`data_citation`).
  - Introduced: blame on the three `FieldText`s lands on 01208ab2, the
    file's first version; `commits/01208ab2/pulls` names
    `pkp/ui-library#629`, whose description holds no issue; the pkp-lib
    side (`FieldAuthors.php`) is `pkp/pkp-lib#11427`.
  - 3.5 (OJS c1cee76b95, pkp-lib 771474347e; OMP 9c5e24246, OPS
    38b61882d3, pkp-lib cf3f984335; ui-library d4e01883), 3.4 (pkp-lib
    767353f4fe, ui-library ee684b34) and 3.3 (pkp-lib ac3fa73402,
    ui-library 96959f9e): no `FieldAuthors`, no data citations;
    `PKPCitationsForm` is one labelled `FieldTextarea` `citationsRaw`.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/ui-library and
  pkp/ojs, issues and pull requests, open and closed.
- Not driven: a real screen reader (names read from Chrome's
  accessibility tree, which is what a screen reader is given; whether a
  given screen reader announces the column header when a box takes the
  focus is unverified); "Edit Data Citation" and the wizard's "Data"
  section (code); the Funding page's grant rows (code).
