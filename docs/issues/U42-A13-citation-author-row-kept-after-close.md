# "Edit citation" keeps an author row added or deleted before "Close", and the next "Save" stores it

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; references are one free-text box, no data citations, no Funding page)
  - 3.4: none (code; the same free-text box)
  - 3.3: none (code; the same free-text box)
- **Introduced** PR `pkp/ui-library#629`, with the companion PR `pkp/pkp-lib#11427` (no issue linked) · [01208ab2](https://github.com/pkp/ui-library/commit/01208ab2d902a5275913f4f527e33017a174e661) · 2025-06-25 · GaziYucel (GaziYucel); the grant rows from `pkp/ui-library#813` for `pkp/pkp-lib#12392` · [32636ed8c](https://github.com/pkp/ui-library/commit/32636ed8c21c4a8e066579e9dda6185b3ff960bc) · 2026-05-09 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U42 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U42-citations-and-references.md#a13) · spec U43 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a15)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

In "Edit citation" (the References page with metadata lookup on), an
editor presses "Add" under "Author Information", types a name, and
leaves with "Close", expecting nothing kept, as happens to every other
box of the panel. On the next "Edit" the panel shows an author row with
empty boxes, and "Save" for any other change stores an author with no
name. A reference with an identifier and a title then counts as
structured: its row shows the title and an expander, and its menu loses
"Reprocess", so the lookup can no longer be rerun for that reference
alone.

Deleting a row and leaving with "Close" works the same way: the row is
missing from the next "Edit" and is deleted for good by the next
"Save". The same happens to a data citation's "Creators" in "Edit Data
Citation" and to a funder's grants in "Edit Funder" on the Funding
page.

The reference case needs metadata lookup on, and the creators case
needs data citations on; both are off in a new install. The grants case
needs only the Funding page, which a new install shows. In every case
the change comes back only if the item is edited again before the page
reloads or saves anything else.

## Impact

- **Lost**: an abandoned change is saved without a word: an author with
  no name, or an author, creator or grant deleted. On a journal, the
  article's JATS XML (the JATS template plugin) then gives such a
  reference as a structured citation with an empty author group instead
  of its text, and leaves a deleted author out.
- **Who**: editors, and authors allowed to edit the publication, on the
  workflow's Publication › "References", "Data" and "Funding" pages.
  Submitting authors also meet the creators and grants cases in the
  submission wizard, whose Details step holds the same data citation
  and funder panels.
- **Way round**: the reopened panel shows the rows as they will be
  saved, so a blank row can be deleted, or a deleted entry typed again,
  before "Save".

Medium: an abandoned change is saved silently into stored authors,
creators or grants, with a way round on screen for a user who notices;
it would be high if the panel did not show the rows before the save.

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

The submission per app: OJS 4, "Computer Skill Requirements for New and
Existing Teachers: Implications for Policy and Practice"; OMP 3, "The
Political Economy of Workplace Injury in Canada"; OPS 1, "The influence
of lactation on the quantity and quality of cashmere production". The
names typed below carry `u42r4` only as a name.

A reference's author, added and abandoned:

1. As `dbarnes`, open the submission
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
2. In the side menu under "Publication" ("Preprint" on OPS), choose
   "References".
3. Type `Lovelace A. u42r4 Notes on the analytical engine. 1843.` in
   "References" and press "Add". (On an install that reaches Crossref,
   wait for the lookup to settle; if it added authors, delete them in
   step 4.)
4. On the new row, press "More Actions" and choose "Edit". Type
   `10.1234/u42r4` in "DOI" and `u42r4 Notes on the analytical engine`
   in "Title", and press "Save". The row still shows its text, and its
   menu offers "Edit", "Delete" and "Reprocess".
5. Choose "Edit" again. Under "Author Information" press "Add", type
   `Ada` in the new row's first box, and press "Close" (the arrow at the
   top left of the panel).
6. Choose "Edit" again and look at "Author Information".
7. Type `12` in "Volume" and press "Save".
8. Reload the page, open "References" again and open the row's "More
   Actions"; then choose "Edit".

A reference's author, deleted and abandoned (from a freshly loaded
dataset, steps 1 to 3 first):

9. On the new row, choose "Edit". Type `10.1234/u42r4` in "DOI"; under
   "Author Information" press "Add", type `Ada` and `Lovelace` in the
   first two boxes, and press "Save".
10. Choose "Edit", press "Delete" on the author's row, and press
    "Close".
11. Choose "Edit" again, type `7` in "Volume", and press "Save".

A data citation's creator, added and abandoned:

12. Choose "Data" in the side menu and press "Add Data Citation". Type
    `u42r4 Dataset` in "Title", choose "Supporting data without
    specifying whether they were generated or analyzed (supporting)."
    in "Relationship type", and press "Save".
13. On its row, press "More Actions" and choose "Edit". Under
    "Creators" press "Add", type `Ada`, and press "Close".
14. Choose "Edit" again, type `u42r4 repo` in "Repository", and press
    "Save".

A funder's grant, deleted and abandoned:

15. Choose "Funding" in the side menu and press "Add Funder". Type
    `u42r4 Funder` in "Funder" and choose the typed name from the list.
    Under "Funder Grants" press "Add", type `u42r4-1` in "Grant
    Number", and press "Save".
16. On the funder's row, press "More Actions" and choose "Edit". Press
    "Delete" on the grant's row, and press "Close".
17. Choose "Edit" again and press "Save".

**Expected.** "Close" drops what was changed, as it drops a typed DOI.
At step 6 "Author Information" holds no row, and after steps 7 and 8
the reference has its volume and no author, its row unchanged (text,
"Reprocess" in the menu). Step 11 keeps Ada Lovelace, step 14 stores no
creator, and step 17 keeps the grant.

**Observed.** The same on the three apps:

- Step 6: the author row is back, with three empty boxes. Step 7 stores
  it as `authors` `[[]]`, an author with no fields. After the reload
  the row reads "10.1234/u42r4 u42r4 Notes on the analytical engine"
  with an expander, its menu holds "Edit" and "Delete" only, the box
  "Processing references - 0/1" shows above the table, and "Edit" still
  shows the empty row.
- Step 11: "Edit" opens with no author, and the save stores `authors`
  `[]`.
- Step 14: "Edit" opens with an empty creator row, and the save stores
  `authors` `[[]]` on the data citation.
- Step 17: "Edit" opens with no grant row, and the save stores `grants`
  `[]`.

## Cause

`FieldAuthors.vue` (`lib/ui-library/src/components/Form/fields/`) adds
and deletes a row by changing the array it was given, in place:

```js
const currentValue = computed({
	get: () => props.value,
	set: (newVal) => emit('change', props.name, 'value', newVal),
});

function deleteRow(index) {
	currentValue.value.splice(index, 1);
}

function addRow() {
	currentValue.value.push(rowDataModel());
}
```

`push` and `splice` change `props.value` itself and never call the
setter, so no `change` is emitted. That array is not a copy:
`citationEditCitation()` (`useCitationManagerActions.js`) fills the
form with `setValues(citation)`, and `useForm.setValue()` stores the
reference's own `authors` array, the one the page holds in
`publication.citations`, as the field's value. So an added or deleted
row is made in the page's copy of the reference.

"Close" only closes the panel. `citationEditCitation()` reuses the same
form object for every "Edit" without cloning it, and the next "Edit"
fills it again from the page's copy, which now holds the change. The
data citation and funder panels clone their form, but fill it the same
way, from the stored `authors` and `grants` arrays.

Typing works differently. `updateRow()` builds a new array and assigns
it, which emits `change`; the new array goes to the closed form only.
That is why the added row comes back without the typed "Ada".

The page's copy is replaced when the page fetches the publication
again: on a reload, after every save, delete, reprocess or add on the
page, and every seven seconds while a structured reference waits for
its lookup. An "Edit" of the same item before any of those shows the
change, and its "Save" sends it. On the server,
`PKPCitationController::edit()` stores the blank row as sent, and
`Citation::isStructured()` counts a reference as structured when its
`authors` list is not empty, whatever the authors hold.

Reach:

- "Edit citation", adding a row and deleting one (walked on the three
  apps).
- "Edit Data Citation", "Creators" (`dataCitationEditDataCitation()`):
  adding a row (walked on the three apps); deleting one (code). "Add
  Data Citation" starts from an empty form and is not affected (code).
- "Edit Funder", "Funder Grants" (`FieldFunderGrants.vue`, the same two
  functions, filled by `useFunderManagerActions.js` from the funder's
  `grants`): a grant deleted and abandoned is deleted by the next save
  (walked on the three apps); a grant row added and abandoned comes back
  empty (walked on the three apps), and a blank grant row is dropped
  when saved (spec U43, Fields).
- The submission wizard's Details step holds the same data citation and
  funder panels (`templates/submission/wizard.tpl`), so the creators and
  grants cases reach submitting authors (code).
- What a stored change does downstream (code): OJS's JATS template
  plugin (`ArticleBack.php`) writes a structured reference as
  `<element-citation>` with an empty `<person-group>` instead of its
  text, and a data citation's creators as an empty `<person-group>`;
  the Crossref deposit's citation list
  (`ArticleCrossrefXmlFilter::appendStructuredCitationElements()`) reads
  `$authors[0]['givenName']` without `??`, which logs a PHP warning for
  a blank author.
- Not affected (code): `FieldCreditRoles.vue` and
  `FieldAffiliations.vue` also change their arrays in place, but the
  contributor form fetches the contributor afresh for every "Edit"
  (`ContributorsListPanel.vue`).

## Proposed fix

Recommended (a proposal; the team decides): in `FieldAuthors.vue` and
`FieldFunderGrants.vue`, make `addRow()` and `deleteRow()` assign a new
array, as `updateRow()` in the same files already does and as
`FieldAffiliations.vue` deletes a row. The change then goes through
`change` into the form's own value, and the page's copy is never
touched
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-author-row-kept-after-close/fix.diff),
in `lib/ui-library`):

```diff
 function deleteRow(index) {
-	currentValue.value.splice(index, 1);
+	currentValue.value = currentValue.value.filter((_, i) => i !== index);
 }
 
 function addRow() {
-	currentValue.value.push(rowDataModel());
+	currentValue.value = [...currentValue.value, rowDataModel()];
 }
```

The same two lines in each file. A field component should not write
into its props: `FieldBase` assigns `currentValue` for the same reason,
so that the change event is emitted. Fixing the field covers every
panel that uses it. No caller relies on the in-place change: each panel
saves the form's value and then fetches the publication again.

Tried on `main`: on the three apps with `FieldAuthors.vue` alone, then
on OMP with both files. With the fix, steps 5 to 8 leave the reference
without an author and unstructured, with "Reprocess" in its menu, and
step 17 keeps the grant. With and without the fix, the other checks
gave the same result: two authors added and saved are stored, one of
them deleted and saved is removed, a data citation added with a named
creator keeps it, and a funder saved with two grants keeps one after
the other is deleted and saved.

**Alternatives**

- Clone the stored item before `setValues()` in the three edit
  actions: it covers these callers only, and any other form that passes
  a stored array into these fields would still be changed.
- Refuse or drop a nameless author on the server, or have
  `isStructured()` ignore one: a useful guard (below), but the panels
  would still bring back an abandoned row and still save a deletion.

**What goes with it**

- A row added on purpose and saved empty is still stored as an author
  with no name. `Citation::isStructured()` could ignore authors without
  a given or family name, as the JATS writer already skips them.
- References and data citations already saved with a blank author keep
  it until someone deletes the row and saves. No data repair is
  proposed; a migration could remove `authors` entries with no name.
- Guard: a ui-library unit test that mounts each field and checks that
  "Add" and "Delete" emit `change` and leave the `value` prop untouched,
  or the e2e check in Evidence.

Small: the same two lines in two ui-library files, following the files'
own `updateRow()`, tried, with no API or data change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/citation-author-row-kept-after-close/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps as `dbarnes` on
  PKP's default dataset (pkp/datasets 566bb1f, 2026-10-03) and reads the
  stored values from the database after each save. Its argument picks
  the part: `steps` (steps 1–8), `reach` (steps 9–14), `funding` (steps
  15–17, and a grant row added and abandoned), and `nb` and `nbf`, the
  checks run with and without the fix. The Funder box's registry search
  is answered with no match, so the typed name is the only choice, as
  for a funder the registry does not know. Each part starts from a
  freshly loaded dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/citation-author-row-kept-after-close/walk.js [steps|reach|funding|nb|nbf]`.
- The dataset runs its job runner, so the lookup of step 3 started; it
  found no identifier in the text and could not reach Crossref, and the
  reference stayed unstructured until step 7's save.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database):
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). `FieldAuthors.vue` and `FieldFunderGrants.vue` are
    identical in both ui-library commits.
- Code reads:
  - main: `FieldAuthors.vue`, `FieldFunderGrants.vue`, `FieldBase.vue`,
    `useForm.js` (`setValues`, `setValue`),
    `useCitationManagerActions.js`, `citationManagerStore.js`,
    `useDataCitationManagerActions.js`, `useFunderManagerActions.js`,
    `ContributorsListPanel.vue`, `FieldCreditRoles.vue`,
    `FieldAffiliations.vue`; pkp-lib `Citation.php`,
    `PKPCitationController::edit()`, `citation.json`,
    `dataCitation.json`, `templates/submission/wizard.tpl`; OJS
    `ArticleBack.php`, `ArticleCrossrefXmlFilter.php`.
  - Introduced: `git log` on `FieldAuthors.vue` gives 01208ab2 (the
    file's first version, with `addRow()` and `deleteRow()` as they
    are), then c2f8e07d and 00fc98d6 (`pkp/pkp-lib#10692`, which put the
    field in "Edit citation" and left both functions unchanged).
    `commits/01208ab2/pulls` names `pkp/ui-library#629`, whose
    description holds no issue; the pkp-lib side (`FieldAuthors.php`)
    is `pkp/pkp-lib#11427`. `FieldFunderGrants.vue` came with
    32636ed8c. The `isStructured()` rule counting `authors` came with
    4730f6707e (`pkp/pkp-lib#10692`, 2025-09-16).
  - 3.5 (OJS c1cee76b95, pkp-lib 771474347e; OMP 9c5e24246, OPS
    38b61882d3, pkp-lib cf3f984335; ui-library d4e01883), 3.4 (pkp-lib
    767353f4fe, ui-library ee684b34) and 3.3 (pkp-lib ac3fa73402,
    ui-library 96959f9e): no `FieldAuthors`, `FieldFunderGrants`,
    `CitationManager` or data citations; `PKPCitationsForm` is one
    `FieldTextarea` `citationsRaw`.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/ui-library and
  pkp/ojs, issues and pull requests, open and closed.
- Not driven: the JATS and Crossref output (the test installs make no
  deposit).
