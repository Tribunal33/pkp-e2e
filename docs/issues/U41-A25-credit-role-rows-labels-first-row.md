# A contributor's later CRediT rows have unnamed drop-downs, and a click on their labels edits the first row

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; no CRediT roles)
  - 3.4: none (code; no CRediT roles)
  - 3.3: none (code; no CRediT roles)
- **Introduced** `pkp/ui-library#661` (PR by Bozana Bokan, bozana) for `pkp/pkp-lib#857` · [5b237adf](https://github.com/pkp/ui-library/commit/5b237adfb145dfa4ec0991bab83ddca01977d22e), committed by jyhein · 2025-07-07
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U41 [A25](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U41-contributors-and-affiliations.md#a25)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A contributor's "CRediT roles and the degrees of contribution" table
has one row per role, each with its own "Select a new role (required)"
and "Degree" labels. But every row's labels belong to the first row's
two drop-downs. So once there are two or more rows, a click on a later
row's label puts the cursor in the first row. A choice then made with
the keyboard changes the first row, and the row whose label was clicked
stays as it was. This holds for both labels, the role's and the
degree's.

A screen reader is given the first row's drop-downs with their label
repeated once per row ("Degree Degree" with two rows, "Degree Degree
Degree" with three), and every later row's with no name at all.

The table is part of the contributor form on every install, with no
setting to turn it on. It shows wherever a contributor is edited: "Add
Contributor" and "Edit" on the publication's Contributors page, and the
submission wizard's "Add Contributor".

## Impact

- **Lost**: a screen reader user cannot tell which drop-down they are
  in after the first row. A user who clicks a later row's label and
  then chooses with the keyboard changes the first row instead; the
  change shows on screen, but nothing says the label led elsewhere.
- **Who**: editors, and authors in the submission wizard, who give a
  contributor two or more CRediT roles.
- **Way round**: click the drop-down itself, not its label; a screen
  reader user can go by the table's "Role" and "Degree" column headers.

Low: the unnamed drop-downs fail WCAG 4.1.2 (level A) and a label click
lands in the wrong row, but every row shows its own value and saves
what it shows.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS). Nothing to
  create.
- Chrome on Linux or Windows (on macOS see step 8).
- A way to read a control's accessible name: a screen reader, or
  Chrome's accessibility inspector (inspect the drop-down, then
  Elements › Accessibility › "Computed Properties" › "Name").

The submission and contributor per app (neither has CRediT roles yet):
OJS submission 7, "Developing efficacy beliefs in the classroom"
(Domatilia Sokoloff); OMP submission 1, "The ABCs of Human Survival: A
Paradigm for Global Citizenship" (Arthur Clark); OPS submission 1, "The
influence of lactation on the quantity and quality of cashmere
production" (Carlo Corino).

1. Sign in as `dbarnes` (password `dbarnesdbarnes`).
2. Under "Submissions", choose "Active submissions" (the OMP and OPS
   submissions are not in "Assigned to me") and open the submission, or
   go to
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=<id>`.
3. In the side menu under "Publication" ("Preprint" on OPS), choose
   "Contributors".
4. Press "Edit" on the contributor's row.
5. Under "CRediT roles and the degrees of contribution", press "Add
   Another Role" twice. Two rows show, both on "Conceptualization".
6. In the second row, choose "Investigation" under "Select a new role
   (required)" and "Supporting" under "Degree".
7. Read the names of the four drop-downs.
8. Click the words "Select a new role (required)" in the second row,
   then press the Down arrow key. (On macOS, where the Down arrow opens
   the list, type the letter "m" instead: it picks "Methodology".)
9. Close the window with the X in its corner (its screen-reader name is
   "Close"). Nothing is saved.

**Expected.** Each drop-down is named by its own label, once: "Select a
new role (required)" or "Degree". The click in step 8 puts the cursor
in the second row's role drop-down, and the Down arrow changes the
second row's role.

**Observed.** The same on the three apps:

```
step 7:  row 1  combobox "Select a new role (required) Required Select a new role (required) Required"
                combobox "Degree Degree"
         row 2  combobox ""
                combobox ""
step 8:  the cursor lands in row 1's role drop-down; the Down arrow turns
         row 1 from "Conceptualization" into "Data Curation", and row 2
         stays "Investigation" / "Supporting"
```

On OJS, with a third row added, the first row's names held each label
three times and the third row's drop-downs had none. A click on the
second row's "Degree" label put the cursor in the first row's "Degree",
and the Down arrow set the first row's degree to "Lead". After a click
on the second row's role label, the letter "m" turned the first row
into "Methodology".

## Cause

`FieldCreditRoles.vue` (`lib/ui-library/src/components/Form/fields/`)
draws one row per CRediT role and, in each, two `FieldSelect`s with
`name="role"` and `name="degree"` and a label, but passes them no
`formId`.

`FieldBase.compileId()` builds a field's ids from `[formId, name,
type]`. Without a `formId`, every row's role drop-down gets the id
`-role-control` and its label (`FormFieldLabel.vue`)
`for="-role-control"`, and the same for "Degree". A `for` points at the
first element in the page with that id. So every row's labels name the
first row's drop-downs, which therefore carry one copy of the label per
row, and the later rows' drop-downs have none. A click on a label
focuses the element it points at, which is why the cursor lands in the
first row.

Inside a form, `FormGroup.vue` passes `:form-id="formId"` to each field,
which is how the contributor form's own fields get ids like
`contributor-country-control`. `FieldCreditRoles` receives that
`formId` prop (it builds its own wrapper's id, `contributor-creditRoles`,
from it) but does not pass it on to the drop-downs it draws.

Reach:

- The contributor form (`ContributorForm`, form id `contributor`, which
  adds the field for every context):
  - in the workflow, built by `PKPDashboardHandler`
    (`pages/dashboard/PKPDashboardHandler.php`) and shown through
    `ContributorManager`: "Edit" seen in the browser, "Add Contributor"
    read in the code;
  - in the submission wizard, built by
    `PKPSubmissionHandler::getContributorsListPanel()` through
    `ContributorsListPanel`: read in the code.
- The same mistake elsewhere in ui-library, each left out of this fix:
  - `FieldAffiliations.vue` and `FieldFunder.vue`, a hand-entered
    institution's or funder's name boxes: reported on their own
    ([U41-A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U41-A10-name-boxes-labels-run-together.md)),
    with the same per-field `formId` fix.
  - `UserInvitationUserGroupsTable.vue`, the role invitation's roles
    table: reported on its own
    ([U06-A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U06-A8-invitation-role-rows-unnamed.md)).
  - `FieldFunderGrants.vue` and `FieldAuthors.vue` (grant rows, data
    citation authors): their boxes repeat per row but have no label, so
    unique ids alone would not name them.

## Proposed fix

A proposal: give each row's two drop-downs a `formId` built from the
field's own `formId`, its name and the row's index, as `FormGroup` does
for a form's fields, so every id is unique
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/credit-role-rows-labels-first-row/fix.diff);
its paths start at the app checkout, `a/lib/ui-library/src/…`, so in a
ui-library clone apply it with `git apply -p3`):

```diff
 							<FieldSelect
+								:form-id="`${props.formId}-${props.name}-${creditRoleIndex}`"
 								name="role"
…
 							<FieldSelect
+								:form-id="`${props.formId}-${props.name}-${creditRoleIndex}`"
 								name="degree"
```

The ids become `contributor-creditRoles-0-role-control`,
`contributor-creditRoles-1-degree-control` and so on.

Tried on `main` on the three apps: each drop-down is named by its own
label once, and the click in step 8 puts the cursor in the second row's
role drop-down, where the Down arrow changes the second row. A check of
what the fix must leave alone, run with and without it, gave the same
result both times: the form's "Country" and "Given Name" keep their ids
and names, and two rows saved as "Conceptualization" / "Lead" and
"Investigation" / "Supporting" are stored and shown again as saved.

**Alternatives**

- Make `FieldBase.compileId()` fall back to a per-instance id (`useId()`,
  as `FieldCreditRoles` already does for its table's label) when no
  `formId` is given. It would cover every field drawn outside a form at
  once, but changes the id of each such field, some of which pkp's
  Cypress commands select by id (`#-username-control`).
- Name the drop-downs with `aria-label`: the labels' `for` would still
  point at the first row, so a click on a label would still land there.

**What goes with it**

- No stored data or API change: the ids live only in the page.
- Guard: a ui-library unit test that mounts `FieldCreditRoles` with two
  rows and expects no repeated id, or an end-to-end check that adds two
  rows and reads each drop-down's name.

Small: one component, following the pattern `FormGroup` already uses,
plus its test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/credit-role-rows-labels-first-row/walk.js)
  (helpers in `lib.js` beside it), run on a freshly loaded dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/credit-role-rows-labels-first-row/walk.js [steps|untouched|more]`.
  `steps` takes the Steps as `dbarnes` on PKP's default dataset
  (pkp/datasets 384e28b, 2026-10-12) and saves nothing; it reads each
  drop-down's id, the labels the browser ties to it, its name in
  Chromium's accessibility tree (CDP `Accessibility.getPartialAXTree`)
  and where the cursor lands. `untouched` is the check of what the fix
  must leave alone (other fields' ids, two rows saved, read back from the
  database and from a reopened "Edit"). `more` is the three-row,
  "Degree" label and typed-letter read, run on OJS only.
- Tips walked, on PostgreSQL (the fault does not depend on the
  database): main OJS 7c6fba2064, OMP eb9381314, OPS 1bc3f78888
  (pkp-lib f4c2578c94, ui-library c9889f00 in all three), headless
  Chromium on Linux.
- Code reads:
  - main: blame on the two `FieldSelect`s' `name` and `:label` lines
    lands on the Introduced commit, the file's first, which reached
    main in the PR's merge (72f17998, 2025-07-16); the file's two later
    commits (fc572c85 table layout, 4d8268f3 disabled roles) did not
    touch them. `ContributorForm::__construct()` adds
    `FieldCreditRoles` unconditionally.
  - 3.5 (OJS 5fc74d6213, OMP 486cbf9eb, OPS 399c4ebca3; pkp-lib
    f4f8fcdbc0 / 8094f06bf5; ui-library 2576e00a): no
    `FieldCreditRoles.vue`, and `ContributorForm.php` has no CRediT
    field. Not walked, since the table does not exist there.
  - 3.4 (OJS daf0ca971d, OMP 0aec65441, OPS acd8ae704b; pkp-lib
    55c8e406b3, ui-library ee684b34) and 3.3 (OJS d7d9dd14ec, OMP
    8e72fc883, OPS c5532e2161; pkp-lib 5e84acd11b, ui-library
    96959f9e): no `FieldCreditRoles.vue` and no CRediT field in the
    contributor or author form.
- Upstream: pkp/pkp-lib, pkp/ui-library and pkp/ojs searched for the
  symptom (credit roles, CRediT, label, screen reader, accessibility,
  duplicate id) and for `FieldCreditRoles`; the hits were the feature's
  own PRs (`pkp/ui-library#644`, `#661`, `#677`, `pkp/ojs#4991`) and
  unrelated CRediT issues.
- Not driven: a real screen reader (names read from Chrome's
  accessibility tree, which is what a screen reader is given); macOS
  (the typed letter was walked on Linux; that it changes the value
  there without opening the list is unverified); "Add Contributor"
  and the submission wizard's step (read in the code only); 3.4 and
  3.3.
