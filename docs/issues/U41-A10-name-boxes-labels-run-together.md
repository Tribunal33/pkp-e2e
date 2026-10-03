# A screen reader reads a hand-entered affiliation's or funder's name boxes wrongly: both labels on the first, none on the second

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (the affiliation boxes; no Funding page)
  - 3.4: none (code; one multilingual "Affiliation" box per contributor)
  - 3.3: none (code; the same single box in the older author form)
- **Introduced** the affiliation boxes: `pkp/ui-library#507` (PR by Bozana Bokan, bozana) for `pkp/pkp-lib#7135` · [682f8e94](https://github.com/pkp/ui-library/commit/682f8e9421893f67b06576373b8d9084cb58050f) by GaziYucel and [34e219cc3](https://github.com/pkp/ui-library/commit/34e219cc3c7ceba322a83bb5f1925b01687553cb) by Jarda Kotěšovec (jardakotesovec) · 2025-02; the funder boxes: `pkp/ui-library#813` for `pkp/pkp-lib#12392` · [32636ed8c](https://github.com/pkp/ui-library/commit/32636ed8c21c4a8e066579e9dda6185b3ff960bc) · 2026-05-09 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U41 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a10) · spec U43 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U43-funding.md#a5) (its typed-name boxes only)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

An institution or a funder can be entered by hand, as typed text, instead
of being picked from the ROR registry search; such an entry then gets one
name box per language. In the Affiliations field's editor for such an
entry, a screen reader reads the primary language's box out with both
languages' labels run together, and the second language's box has no
label at all. The Funding page's boxes for a hand-entered funder carry the
same defect. A click on the second label puts the cursor in the first box,
for a sighted mouse user too.

A screen reader user who adds a French name to a hand-entered institution
or funder cannot tell from the boxes alone which one they are in. The
names are saved correctly, and the label text above each box can still be
read.

There is one box for each language the journal, press or server accepts
metadata in ("Metadata" under "Submission Languages" on Settings ›
Website › Setup › "Languages"), plus any language the submission's
metadata already uses. With two or more such languages the defect shows
wherever a contributor or a funder is edited: the publication's pages and
the submission wizard. The Funding page is part of every install on
`main`, on by default.

## Impact

- **Lost**: for a screen reader user, the second box (and any after it)
  has no name, and the first box is announced with every box's label
  instead of its own.
- **Who**: editors, and authors in the submission wizard, who give a
  hand-entered institution or funder a name in a second language. Screen
  reader users meet the wrong names; sighted mouse users meet the label
  click that lands in the first box.
- **Way round**: the boxes come in the order of the labels above them
  (the primary language first), and a screen reader reads each label as
  text just before its box; a mouse user clicks the box itself. Nobody is
  told this.

Low: the unnamed box fails WCAG 4.1.2 (level A), but the visible label
read just before each box lets a screen reader user tell the boxes apart,
and nothing is saved wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). The journal,
  press and server have two languages, English (primary) and French
  (Canada), both metadata languages. Every contributor in the dataset has
  one hand-entered affiliation (no ROR ID) with an English name only.
- A way to read a control's accessible name: a screen reader, or Chrome's
  accessibility inspector (inspect the box, then Elements › Accessibility
  › "Computed Properties" › "Name").

The submission and contributor per app: OJS submission 7, "Developing
efficacy beliefs in the classroom" (Domatilia Sokoloff, "University
College Cork"); OMP submission 1, "The ABCs of Human Survival: A Paradigm
for Global Citizenship" (Arthur Clark, "University of Calgary"); OPS
submission 1, "The influence of lactation on the quantity and quality of
cashmere production" (Carlo Corino, "University of Bologna").

A hand-entered affiliation:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Open the submission from "Submissions"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`).
3. In the side menu under "Publication" ("Preprint" on OPS), choose
   "Contributors".
4. Press "Edit" on the contributor's row.
5. Under "Affiliations" the institution's row reads "1 of 2 languages
   completed". Press the row's ⋯ button (its screen-reader name is "Click
   to edit or delete") and choose "Edit institution name". (Pressing "1 of
   2 languages completed" opens the same editor.)
6. Read the names of the two boxes, "Type the institution name in
   English" and "Type the institution name in French (Canada)". Then click
   the words "Type the institution name in French (Canada)".

A hand-entered funder (OJS, OMP, OPS on `main`; 3.5 has no Funding page):

7. Close the form, and choose "Funding" in the side menu. Press "Add
   Funder".
8. Type "u41f Funder" in the Funder box and choose the typed text from
   the list under it.
9. Read the names of the boxes "Type the funder name in English" and
   "Type the funder name in French (Canada)". Then click the words "Type
   the funder name in French (Canada)".

**Expected.** Each box is named by its own label, once: "Type the
institution name in French (Canada)" for the French box. A click on a
label puts the cursor in the box under it.

**Observed.** The same on the three apps, and for the affiliation on 3.5:

```
step 6:  textbox "Type the institution name in English* Required Type the institution name in French (Canada)"
         textbox ""
step 9:  textbox "Type the funder name in English* Required Type the funder name in French (Canada)"
         textbox ""
```

Both clicks put the cursor in the English box. The two boxes carry the
same id, `-name-control`; the label above each points at that id.

## Cause

`FieldAffiliations.vue` and `FieldFunder.vue`
(`lib/ui-library/src/components/Form/fields/`) draw one `FieldText` per
language for a hand-entered name, each with `name="name"` and no `formId`.

`FieldBase.compileId()` builds a field's ids from `[formId, name, type]`.
Without a `formId` every box gets the id `-name-control`, and its label
(`FormFieldLabel.vue`) gets `for="-name-control"`. A `for` points at the
first element in the page with that id, so every label names the first
box and the others have none. In `FieldAffiliations`, which passes each
box its errors, the error ids (`-name-error`, read through
`aria-describedby`) are shared the same way; `FieldFunder`'s boxes draw
no error element.

Inside a form, `FormGroup.vue` passes `:form-id="formId"` to each field,
which is how the contributor form's own boxes get ids like
`contributor-givenName-control-en`. The two fields are themselves fields
of a form and receive that `formId` prop, but do not pass it on to the
boxes they draw. 34e219cc3 replaced the row editor's plain inputs, which
had ids of their own, with `FieldText`.

Reach:

- The contributor form, from the publication's Contributors page
  (walked) and from the submission wizard's contributors step (code, the
  same `ContributorForm`).
- `FieldAffiliations`, a new hand-entered institution: with two
  languages it shows only its French box, which is named correctly as
  long as no other name box is open. With an existing row's editor open
  at the same time, the three boxes share the id and the first takes all
  three labels (walked).
- The Add Funder form, from the publication's Funding page (walked) and
  the wizard's Details step "Funders" (code, the same `FunderEditForm`).
- The same mistake elsewhere in ui-library, left out of this fix:
  - `FieldCreditRoles.vue`, a contributor's CRediT roles: every row's
    role select gets `-role-control` and every row's degree select
    `-degree-control` (code, not walked).
  - `FieldFunderGrants.vue` and `FieldAuthors.vue` (grant rows, data
    citation authors): their boxes repeat per row too, but have no
    label at all, so unique ids alone would not name them.
  - `UserInvitationUserGroupsTable.vue`, the role invitation's roles
    table: reported on its own
    ([U06-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A8-invitation-role-rows-unnamed.md)),
    with a per-row `formId` fix.

## Proposed fix

Recommended (a proposal; the team decides): give each name box a `formId`
built from the field's own `formId` and name, as `FormGroup` does for a
form's fields, so every id is unique
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/name-boxes-labels-run-together/fix.diff),
in `lib/ui-library`):

```diff
 											<FieldText
+												:form-id="`${props.formId}-${props.name}-${affiliationIndex}-${affiliationNameLocale}`"
 												:label="getTextFieldLabel(affiliationNameLocale)"
…
 												<FieldText
+													:form-id="`${props.formId}-${props.name}-new-${newAffiliationNameLocale}`"
 													:label="getTextFieldLabel(newAffiliationNameLocale)"
…
 						<FieldText
+							:form-id="`${props.formId}-${props.name}-${locale}`"
 							:label="getTextFieldLabel(locale)"
```

The ids become `contributor-affiliations-0-fr_CA-name-control` and
`funder-funder-fr_CA-name-control`. The row index keeps two rows' editors
apart, and `new` keeps the new entry's boxes apart from a row's.

Tried on `main` on the three apps: each box is named by its own label
once, and a click on the French label puts the cursor in the French box.
Run with and without the fix, two checks gave the same result: the
contributor's "Given Name" boxes keep their ids and names, and a French
name entered in a row's editor, for a new hand-entered institution and
for a hand-entered funder is saved and stored as entered.

**Alternatives**

- Make `FieldBase.compileId()` fall back to a per-instance id (`useId()`,
  as `Dropdown.vue` does) when no `formId` is given. It would cover
  `FieldCreditRoles` and the invitation table too, but changes the id of
  every field used outside a form, some of which pkp's Cypress commands
  select by id (`#-username-control`).
- Name the boxes with `aria-label`: the labels' `for` would still point at
  the first box, so a click on a label would still land there.

**What goes with it**

- 3.5 has the same `FieldAffiliations.vue`, so its two lines apply there
  as written; 3.5 has no `FieldFunder.vue`.
- `FieldCreditRoles.vue` needs the same per-row `formId` on its two
  selects, with a walk of its own.
- Guard: an end-to-end check that opens a hand-entered affiliation's
  editor and a hand-entered funder and reads each box's name, or a
  ui-library unit test that mounts each field with two
  languages and expects no repeated id.

Small: three attributes in two ui-library files, tried, with no data or
API change.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/name-boxes-labels-run-together/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps as `dbarnes` on PKP's
  default dataset (pkp/datasets 566bb1f, 2026-10-03) and reads each box's
  id, the labels the browser ties to it, its name in Chromium's
  accessibility tree (CDP `Accessibility.getPartialAXTree`) and where a
  click on its label puts the cursor. Saves nothing. The Funder box's
  registry search (api.ror.org) is answered with an empty list, so the box
  offers only the typed name, as when the registry knows no such funder.
  With `nb` as argument it instead checks what the fix must leave alone:
  it saves French names and reads them back from the database. Run on a freshly
  loaded dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/name-boxes-labels-run-together/walk.js [steps|nb]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Fix trial: `node bin/try-fix.js apply shared/playwright/checks/issues/name-boxes-labels-run-together/fix.diff ojs omp ops`
  (rebuilds ui-library), a fresh dataset, the script, then `nb`; `nb`
  again on a fresh dataset without the fix.
- Tips walked, on PostgreSQL (the fault does not depend on the database):
  - main: OJS ff004d0973 (pkp-lib 987776cd04, ui-library 64d67363); OMP
    3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5). The two `.vue` files are identical in both ui-library
    commits.
  - 3.5: OJS c1cee76b95 (pkp-lib 771474347e), OMP 9c5e24246c, OPS
    38b61882d3 (pkp-lib cf3f984335); ui-library d4e01883. Steps 1-6 walked;
    the side menu has no "Funding".
- Code reads:
  - main: blame on `FieldAffiliations.vue`'s two `FieldText`s lands on
    682f8e94 (the new-entry boxes, in the file's first version) and
    34e219cc3 (the row editor's boxes), both reaching main through
    `pkp/ui-library#507`'s merge (b5532e76); `FieldFunder.vue` on 32636ed8c.
    `FieldBase.compileId()` is unchanged since 2018-2022.
  - 3.5: `FieldAffiliations.vue` identical to main; `FieldFunder.vue` and
    `FunderEditForm.php` absent.
  - 3.4 (ui-library ee684b34, pkp-lib 767353f4fe): no `FieldAffiliations`
    or `FieldFunder`; `ContributorForm.php` has one `FieldText`
    `affiliation`, multilingual, inside the form (ids per language). 3.3
    (ui-library 96959f9e, pkp-lib ac3fa73402): the author form's
    `affiliation` is one multilingual `fbvElement`.
- Upstream: pkp/pkp-lib, pkp/ui-library and pkp/ojs searched for the
  symptom (affiliation, funder, label, screen reader, accessibility,
  duplicate id) and for `FieldAffiliations`, `FieldFunder` and
  `compileId`.
- Not driven: a real screen reader (names read from Chrome's
  accessibility tree, which is what a screen reader is given); the
  submission wizard's contributors step and Funders section (code only);
  `FieldCreditRoles` (code only); 3.4 and 3.3.
