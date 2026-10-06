# Role invitation wizard: a screen reader hears no field names in role rows after the first

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; no invitation wizard)
  - 3.3: none (code; no invitation wizard)
- **Introduced** `pkp/ui-library#362` for `pkp/pkp-lib#9658` · [88070798](https://github.com/pkp/ui-library/commit/88070798fdf145ca1313acc1d5b4354e385a8942) · 2024-06-13 · Ipula Indeewara (ipula)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U06 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U06-user-invitations.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

The role invitation wizard (Settings › Users & Roles › "Invite to a
role") has a roles table with one row per role. Each field of the
first row is named by its label twice over ("Start Date * Required
Start Date * Required"), so a screen reader reads the label twice.
Each field of the second and later rows has no name at all, so a screen
reader announces only the kind of field (a combo box, a text box). A
manager who presses "Add Another Role" cannot hear which field of the
new row they are in. A sighted user meets it too: a click on a label in
the second row lands in the first row's field.

A member's Edit page ("Edit" on a user's row in Users & Roles) opens the
same wizard. There a member's current roles show their role and dates
as text, and only the masthead choice is a field. That select is
unnamed on every current role after the first, and on any role row
added there.

The invitation still goes out with the right roles, and a screen reader
user can get round the missing names.

## Impact

- **Lost.** Nothing is saved wrong. A screen reader user loses the name
  of every field after the first row, and the first row's names are
  read doubled.
- **Who.** Whoever opens Users & Roles: the site administrator, and the
  Journal Manager, Editor and Production Editor while "Permit changes to
  Settings" is ticked for them (on a preprint server, the Preprint
  Server Manager). They meet it each time they invite someone to more
  than one role, or open a member's Edit page for someone who holds
  two roles or more.
- **Way round.** The label above each field, the column headings
  ("Role", "Start Date", "Journal Masthead") and the select's options
  say what a field is for. A sighted user clicks the field itself, not
  its label.

Low: the task gets done, and the table around the fields tells a
screen reader user which is which. It would be medium if the table had
no column headings.

The fix itself is a few lines in one ui-library file. Two selectors in
pkp-lib's Cypress command `inviteUser`, which builds the test dataset,
must change with it, so the change spans two repos. Those two lines are
trivial, so the effort is small.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for the version (OJS, OMP or OPS). Nothing
  else is needed.
- A screen reader, or Chrome's accessibility inspector to read a field's
  name: inspect the field, then Elements › Accessibility › "Computed
  Properties" › "Name".

Inviting someone to two roles:

1. Sign in as `rvaca` (password `rvacarvaca`), the manager.
2. Open "Settings" › "Users & Roles"
   (`/index.php/publicknowledge/en/management/settings/access`).
3. Press "Invite to a role".
4. Type `u06e.newcomer@mailinator.com` (an address with no account) in
   "Search for a user by email address, username, or ORCID iD" and press
   "Search User".
5. On "Enter details", press "Add Another Role" under the roles table.
   The table now has two rows. Each row has "Select a new role", "Start
   Date" and "Journal Masthead" ("Press Masthead" on a press, "Server
   Masthead" on a preprint server).
6. Read the name of each field in both rows.
7. Click the words "Start Date" above the second row's date box.

A member's Edit page:

8. Use the "Users & Roles" breadcrumb to go back to the users list.
   Search for "Carlo Corino" ("Arthur Clark" on a press), open the row's
   menu and choose "Edit".
9. The roles table lists his roles, "Reader" and "Author", each with a
   "Journal Masthead" select. Read the name of both selects, then click
   the words "Journal Masthead" above the second one.

**Expected.** Every field is named by the label above it, once, in every
row ("Select a new role", "Start Date", "Journal Masthead"). A click on
a label puts the cursor in the field below it.

**Observed.** The browser's accessibility tree for the two rows on a
journal (step 6; the options left out):

```
row 1:  combobox "Select a new role * Required Select a new role * Required"
        textbox  "Start Date * Required Start Date * Required"
        combobox "Journal Masthead * Required Journal Masthead * Required"
row 2:  combobox
        textbox
        combobox
```

In step 7 the cursor lands in the first row's date box. In step 9 the
"Reader" select is named "Journal Masthead * Required Journal Masthead *
Required", the "Author" select has no name, and the click on the second
label selects the first row's select.

The page holds two elements each with the ids `-userGroupId-control`,
`-dateStart-control` and `-masthead-control` (step 5) and two with
`-masthead-control` (step 9). The step's Email and name fields are
named correctly.

## Cause

`lib/ui-library/src/pages/userInvitation/UserInvitationUserGroupsTable.vue`
draws one row per role with `v-for` and puts a `FieldSelect` or
`FieldText` in each cell: `userGroupId`, `dateStart` and `masthead` on
each added row, and `masthead` on each current role's row. None of
them is given a `formId`.

`FieldBase.compileId()` (`lib/ui-library/src/components/Form/fields/FieldBase.vue`)
builds every id of a field from `[formId, name, type]`. Without a
`formId` the id is `-<name>-control`, the same in every row. The id goes
on the `<select>` or `<input>`, and on the `for` of its `<label>`
(`FormFieldLabel.vue`). A `for` points at the first element in the
document with that id. So every row's label names the first row's field,
which gets all the labels, and the fields of the other rows get none.
The error and description ids (`-<name>-error`, read through
`aria-describedby`) are shared the same way.

Inside a form, every field gets an id prefix: `Form.vue` passes
`:form-id="id"` to `FormPage`, and `FormGroup.vue` passes
`:form-id="formId"` to each field. The roles table is not a form and
drives its fields itself, so nothing gives them a prefix. The current
roles' masthead select, added in
[802b7711](https://github.com/pkp/ui-library/commit/802b7711ec0bd65a2dc645279f1cd407615cb537)
(`pkp/ui-library#870` for `pkp/pkp-lib#11800`, 2026-03-19), also has
no `formId`.

Reach:

- The send wizard. Walked for a new address. An existing account found
  by "Search User" opens the same step (code).
- A member's Edit page. Walked: the current roles' masthead selects
  share one id. In the code, a row added there with "Add Another Role"
  also gets `-masthead-control`, so its masthead label points at the
  first current role's select.
- "Edit Invitation" on a pending invitation opens the same step (code).
- The same mistake in other ui-library components, which repeat a field
  per row without a per-row id (code, not walked). They are left out of
  this fix and need their own check on their own screens:
  - `FieldCreditRoles.vue`, a contributor's credit roles: `role` and
    `degree` in every row.
  - `FieldAffiliations.vue`, the `name` boxes, one per language, in two
    places in the template.
  - `FieldFunder.vue`, the `name` boxes, one per language.
  - `FieldFunderGrants.vue`, the grant rows. Their boxes have no label
    at all, so unique ids alone would not name them: they need labels
    too.

  Each of these is itself a field inside a form and gets a `formId`
  prop, so its per-row prefix would build on it
  (`` `${formId}-${index}` ``) rather than on a fixed word as in the
  table.

## Proposed fix

Recommended: give each row's fields a `formId` of their own in
`UserInvitationUserGroupsTable.vue`, the way `FormGroup` passes its
own, so every id is unique per row
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-role-rows-unnamed/fix.diff)):

```diff
 					<FieldSelect
 						v-else
+						:form-id="`currentUserGroups-${index}`"
 						name="masthead"
…
 						<FieldSelect
+							:form-id="`userGroupsToAdd-${index}`"
 							name="userGroupId"
```

The same attribute goes on the added row's `dateStart` and `masthead`
fields. The ids become `userGroupsToAdd-0-dateStart-control`, the same
path the server uses for the row's errors (`userGroupsToAdd.0.dateStart`).
The current roles and the added rows get different prefixes, so an
added row's masthead no longer collides with a current role's.

pkp-lib's Cypress command `inviteUser`
(`lib/pkp/cypress/support/commands.js`) selects the first row by
`#-dateStart-control` and `#-masthead-control`. The diff changes both to
`#userGroupsToAdd-0-…`. No other test uses these ids.

Tried on `main` on the three apps. Every field in both rows and both
current-role selects got its one label as its name, and a click on the
second row's label selected the second row's field. An invitation to two
roles, sent through the wizard, went out the same way with and without
the fix: "Invitation Sent", and both roles listed in the Invitations
table. The search box kept its id (`-search-control`) and its name, and
the step's Email and name fields kept theirs.

**Alternatives**

- Make `FieldBase.compileId()` fall back to a per-instance id
  (`useId()`, as `Dropdown.vue` does) when no `formId` is given. It
  would cover the sibling components too. But it changes the id of every
  field used outside a form, such as the search box (`#-search-control`)
  and the accept wizard's username and password boxes, which pkp's
  Cypress commands select by id. That is a wider change than this
  finding needs, and the team may prefer it as its own decision.
- Name the fields with `aria-label` instead. The label's `for` would
  still point at the first row, so a click on a label would still land
  there.

**What goes with it**

- A guard: a ui-library unit test that mounts the table with two rows
  and expects no repeated ids, or an end-to-end check of the field names
  in the second row.
- 3.5 has the same table file, so the diff applies there as it stands
  (the Cypress hunk with a line offset).

Small: six lines across one ui-library file and one pkp-lib test
command, following the prefix pattern `FormGroup` already uses.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/invitation-role-rows-unnamed/walk.js)
  (helpers in `lib.js` beside it). It takes the steps on each app, reads
  each field's id, the labels the browser ties to it and its name in the
  accessibility tree, and clicks the second row's label. With `neighbour`
  as argument it sends an invitation to two roles instead. On a freshly
  loaded default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/invitation-role-rows-unnamed/walk.js [neighbour]`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
- Walked on 2026-10-02 on PKP's default test dataset (pkp/datasets
  3788b55, 2026-10-02), PostgreSQL, the same result on the three apps of
  both lines. Tips:
  - `main`: OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library 64d67363); OMP
    3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6, ui-library
    280f98c5).
  - `stable-3_5_0`: OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3
    (pkp-lib cf3f984335, ui-library d4e01883).
  - 3.4 and 3.3 read in the code: ui-library ee684b34 and 96959f9e,
    pkp-lib 32b0f4b4af and f6ab331645.
- Upstream: pkp/pkp-lib and pkp/ui-library searched for the symptom
  and for `UserInvitationUserGroupsTable` and `compileId`. Two issues
  cover other faults of the same table: `pkp/pkp-lib#11017` (the same
  role could be chosen in two rows) and `pkp/pkp-lib#11020` (the first
  row had no "Remove Role" button, among other layout faults).
- Not driven: an existing account through "Search User", a row added on
  a member's Edit page, "Edit Invitation", and the sibling components
  (code only). No real screen reader was used: the names were read from
  Chrome's accessibility tree, which is what a screen reader is given.
