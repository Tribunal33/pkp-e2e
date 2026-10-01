# A Layout Editor, or anyone who may not edit the version, is offered the URN's "Assign" and "Clear"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced to one change; present since at least [6b6d7ef9](https://github.com/pkp/ui-library/commit/6b6d7ef9f0d108e4406df83bf839db3b43163018) (2019-10-09)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U44 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a9)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On the article's or book's "Identifiers" page, a person who may not
edit the version (a Layout Editor, a Proofreader, or a Section Editor
whose assignment has "Permissions" unticked) sees "Save" greyed but
"Assign" enabled. Pressing "Assign" fills the box with the URN, which
cannot be saved and is gone when the page is left. Once a URN is
stored, the same person is offered "Clear", which empties the box but
cannot be saved either. Expected: "Assign" and "Clear" greyed like
"Save", which already follows the person's permission.

The URN on record never changes, and nothing tells the person that what
the box shows was not kept.

This shows only on a journal or press that has switched on the URN
plugin (off until a manager ticks it), with URNs for articles (OJS) or
monographs (OMP) and suffixes made from a pattern ("Use default
patterns." or a typed pattern). OPS has no URN plugin.

## Impact

- **Lost.** No data. A person who saw the URN fill in may pass it on
  (to an author, in a proof) as if assigned. Under a pattern it is the
  same URN the editor's own "Assign" later stores (step 6), so the
  quoted URN comes true once an editor assigns it. A person who pressed
  "Clear" may believe the URN removed while it stays on record.
- **Who.** Layout Editors and Proofreaders, who reach the page once the
  submission is in Production, and editors whose assignment has
  "Permissions" unticked.
- **Way round.** None needed: the person who may edit the version
  assigns or clears the URN and saves.

Low: nothing is stored wrong, and what a misled person might pass on is
either the URN the pattern will give or a removal that did not happen.
It would be medium if a pattern's inputs (the issue, the publisher ID)
commonly changed between the look and the editor's assignment.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS and OMP).
- The "URN" plugin switched on and set up, as `rvaca`: Settings ›
  Website › "Plugins", under "Public Identifier Plugins" tick "URN".
  Then open the row's arrow › "Settings":
  - under "Journal Content" tick "Articles" (press: "Press Content" ›
    "Monographs");
  - "URN Prefix": `urn:nbn:de:0000-`;
  - "URN Suffix": "Use default patterns.";
  - "Namespace": `urn:nbn:de`; "Resolver URL": `https://nbn-resolving.de/`;
  - "Save".

On OJS, submission 1 "Signalling Theory Dividends" has an unpublished
version 2 in Vol. 1 No. 2 (2014); `shellier` is its Layout Editor, and
`sberardo` a Section Editor whose assignment has "Permissions"
unticked. On OMP, submission 4 "How Canadians Communicate: Contexts of
Canadian Popular Culture" is in Production; `gcox` is its Layout
Editor.

A person who may not edit:

1. Sign in as `shellier` (press: `gcox`).
2. Open submission 1 (press: 4) and, in the side menu under
   "Publication", the version's "Identifiers" (OJS: under "Version of
   Record 1.1"). [3.5, OJS: the side menu lists no versions;
   "Identifiers" opens on version 2.]
3. Press "Assign".
4. In the side menu press "Metadata", then "Identifiers" again.
5. OJS only: sign out, sign in as `sberardo`, and take steps 2 to 4.

The URN on record:

6. Sign in as `dbarnes`, open the same page, press "Assign", then
   "Save". Reload.
7. Sign in as `shellier` (press: `gcox`), open the same page, press
   "Clear". Reload.

**Expected.** At step 2, "Assign" is greyed like "Save" for `shellier`,
`gcox` and `sberardo`. At step 7, "Clear" is greyed for `shellier` and
`gcox`. For `dbarnes` both buttons work, and "Save" stores the URN.

**Observed.** At step 2 the footer's "Save" is greyed and the URN box
is empty and greyed, but "Assign" is enabled. Step 3 fills the box with
`urn:nbn:de:0000-jpkjpk.v1i2.1` (press: `urn:nbn:de:0000-jpk.4`), and
"Clear" takes the place of "Assign"; "Save" stays greyed. At step 4
nothing is asked on the way out, and back on "Identifiers" the box is
empty with "Assign" enabled again. `sberardo` sees the same. At step 6
`dbarnes` sees "Saved" and, after the reload, the same URN with
"Clear". At step 7 `shellier` (`gcox`) is offered "Clear" enabled
beside a greyed "Save"; pressing it empties the box, and the reload
shows the URN again.

Control: `dbuskins`, whose assignment has "Permissions" ticked (OJS:
Section Editor on submission 1; press: Series Editor on submission 1
"The ABCs of Human Survival"), gets "Save" enabled, and his "Assign"
and "Clear" are saved.

## Cause

The "Identifiers" page's form has one edit gate, and only "Save"
follows it. `WorkflowPublicationForm.vue` sets the form's `canSubmit`
from `canEdit` (`permissions.canEditPublication`)
([L54](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/pages/workflow/components/publication/WorkflowPublicationForm.vue#L54)),
and `FormPage.vue` disables "Save" when `canSubmit` is false
([L65](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Form/FormPage.vue#L65)).
The fields are not told.

`FieldPubId.vue`, which the URN plugin's `FieldPubIdUrn` extends, shows
"Assign" whenever there is a pattern, every part the pattern needs is
known and the box is empty, and "Clear" whenever the box holds a value
([L37-L51](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Form/fields/FieldPubId.vue#L37-L51)).
Under a pattern the box itself is greyed for everyone
(`:disabled="!!pattern"`), so these two buttons are the only way to
change it, and they stay live for a person who cannot save.

The buttons have never been gated, and the read-only states they ignore
came around them. A published version's forms already dropped "Save"
when the buttons arrived with the DOI field in 6b6d7ef9 (2019-10-09).
"Save" began to follow the edit permission a week later, in e65a9ded
(2019-10-15, PR `pkp/ui-library#50` for `pkp/pkp-lib#4877`), corrected
in 7b254625 (2019-10-25). The buttons followed neither.

The reach:

- The people: anyone who reaches the page without `canEditPublication`.
  Walked for a Layout Editor (OJS, OMP) and a Section Editor with
  "Permissions" unticked (OJS). The dataset's Proofreader assignments
  carry the same unticked permission; the Proofreader was seen in the
  spec's own earlier check, not in this walk.
- A published version: on `main` and 3.5 the version is locked only
  for authors (`Repo::submission()->canEditPublication()`), and the
  author's view has no "Identifiers" page, so no extra case arises
  (code). On 3.4 and 3.3 the old workflow sets `canSubmit` to
  `canEditPublication && status !== published` (`WorkflowPage.vue`), so
  there "Assign" and "Clear" are also offered to editors on a published
  version (code). On 3.3 the DOI plugin's field is a plain `FieldPubId`,
  so its "Assign" and "Clear" behave the same (code).
- The server is not at fault: the screen never sends the save, and
  `PublicationWritePolicy` would refuse it (code, not driven).
- Not this fault: with "Enter an individual URN suffix…" the box is
  typeable for everyone, and its "Add Check Number" is live too. That
  is the general question of read-only pages that keep their fields
  typeable, spec U40
  [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a8).

## Proposed fix

Let the form tell its fields whether it can be saved, and grey "Assign"
and "Clear" when it cannot. `Form.vue` already provides `requireWhen`
to its descendants, and `FormFieldLabel` injects it. The fix adds a
`formCanSubmit` beside it, which `FieldPubId` injects
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/fix.diff)):

```diff
--- a/lib/ui-library/src/components/Form/fields/FieldPubId.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldPubId.vue
@@ -37,6 +37,7 @@
 			<PkpButton
 				v-if="pattern && canGenerateId && !currentValue"
 				class="pkpFormField--pubid__button"
+				:is-disabled="!canChange"
 				@click="assignId"
 			>
 				{{ assignIdLabel }}
@@ -45,6 +46,7 @@
 				v-else-if="pattern && currentValue"
 				class="pkpFormField--pubid__button"
 				:is-warnable="true"
+				:is-disabled="!canChange"
 				@click="() => (currentValue = '')"
 			>
 				{{ clearIdLabel }}
@@ -84,6 +86,9 @@
 		FieldError,
 	},
 	extends: FieldBase,
+	inject: {
+		formCanSubmit: {default: null},
+	},
 	props: {
 		assignIdLabel: {
 			type: String,
@@ -179,6 +184,16 @@
 	},
 	computed: {
 		/**
+		 * May the user change the value? "Assign" and "Clear" change
+		 * what the form saves, so they follow the form's own "Save".
+		 *
+		 * @return {Boolean}
+		 */
+		canChange() {
+			return this.formCanSubmit ? this.formCanSubmit() : true;
+		},
+
+		/**
 		 * Is all required info available to generate a pub id
 		 * according to the pattern?
 		 *
--- a/lib/ui-library/src/components/Form/Form.vue
+++ b/lib/ui-library/src/components/Form/Form.vue
@@ -99,6 +99,8 @@
 	provide() {
 		return {
 			requireWhen: (isRequired) => requireWhen(isRequired, this.fields),
+			// Lets a field's own actions follow the form's edit gate (see FieldPubId)
+			formCanSubmit: () => this.canSubmit,
 		};
 	},
 	props: {
```

A form that sets no `canSubmit` gets the prop's default, `true`, so its
buttons stay live. The inject's `null` default is for a `FieldPubId`
mounted outside any form, which also keeps them live. `FieldPubIdUrn`
has no template of its own, so it inherits the change.

Tried on `main`, OJS and OMP: the Layout Editor and the Section Editor
without "Permissions" saw "Assign" and "Clear" greyed beside "Save",
and pressing them changed nothing. `dbarnes`, and `dbuskins` with
"Permissions" ticked, still assigned, saved, cleared and saved.

**Alternatives**

- Hide the buttons instead of greying them: also right, but greyed
  matches "Save" and still shows that a URN can be made here.
- Pass `canEdit` from `WorkflowPublicationForm` into the URN field's
  props. On `main` the URN plugins of OJS and OMP are the only users of
  `FieldPubId`, so it would cover them, but not a third-party pubId
  plugin's form or any other form that sets `canSubmit`.
- Render read-only publication pages with the form's existing
  `displayOnly` mode: it would also answer U40 A8, but changes every
  publication page for these people, which is a product decision first.

**What goes with it**

- No data repair: nothing wrong is stored.
- Backport: 3.5, 3.4 and 3.3 have the same two buttons, but `Form.vue`
  there has no `provide()` yet, so the backport adds one with this key.
  On 3.3 (Vue 2) the object form of `inject` with a default should work
  the same, but this was not checked.
- A guard: ui-library's `vitest` has no `@vue/test-utils` and no DOM
  environment, and its tests cover composables and stores only, so a
  mounting test would bring new test dependencies. The cheaper guard is
  an e2e scenario: the Layout Editor's "Identifiers" page with "Assign"
  greyed.

Small: two files in ui-library, following the provide and inject the
form already uses, guarded by one e2e scenario.

## Evidence

- Kept scripts, in
  [urn-assign-offered-without-edit-permission/](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/):
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/walk.js)
    takes the preconditions and steps 1–7 on a fresh load of the
    default dataset:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/walk.js`
    (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5).
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/neighbour.js)
    is the `dbuskins` control, walked with the fix in and out, each on
    a fresh load.
  - The fix was tried with `node bin/try-fix.js apply
    shared/playwright/checks/issues/urn-assign-offered-without-edit-permission/fix.diff ojs omp`,
    then `walk.js` and `neighbour.js`, then `node bin/try-fix.js revert
    ojs omp`.
- Walked through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30): `main` and `stable-3_5_0`, OJS and
  OMP, every step. The fault is in the browser's code, so the database
  plays no part.
- Introduced: `git blame` on the "Assign" condition in `FieldPubId.vue`
  leads to dace47b6 (`pkp/pkp-lib#5208`, the rename from `FieldDoi`),
  then to
  [6b6d7ef9](https://github.com/pkp/ui-library/commit/6b6d7ef9f0d108e4406df83bf839db3b43163018)
  ("Add FieldDOI for generating DOIs", PR `pkp/ui-library#43` for
  `pkp/pkp-lib#4867`, Nate Wright). At that commit
  `WorkflowContainer.vue` already removed "Save" from a published
  version's forms (3706dabc, `pkp/pkp-lib#2072`). The permission came
  after:
  [e65a9ded](https://github.com/pkp/ui-library/commit/e65a9dedac091cc4c2073f62012f4731310baaa5)
  (2019-10-15, ajnyga) added `disableSave` to the "Save" condition,
  [9bac2d95](https://github.com/pkp/ui-library/commit/9bac2d95cf6785b0471931043cfeac0c9c5b7ea6)
  renamed it `canEditPublication`, and
  [7b254625](https://github.com/pkp/ui-library/commit/7b254625ee635250119a4622992785089b1ef376)
  (2019-10-25) negated it; all three are in PR `pkp/ui-library#50`.
  6168f73a (`pkp/pkp-lib#4858`, 2020-01-09) only moved that check into
  `canSubmit`. Neither side alone made the fault: the buttons were
  added without a gate into a form that already had a read-only state,
  and a second read-only state was added later without them, so the
  header names the oldest commit that shows it.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp and pkp/ui-library
  for URN with assign, button and permission, read-only forms, and
  `FieldPubId` and `assignId`. `pkp/pkp-lib#408` (DOI and URN plugins
  allow undesirable changes, 2015) is about changing registered IDs, not
  this.
- Code reads: on `main`, `FieldPubId.vue`, `Form.vue`, `FormPage.vue`,
  `WorkflowPublicationForm.vue`, `Repo::submission()->canEditPublication()`,
  the author workflow configs (no "Identifiers"), and the URN plugin's
  `addPublicationFormFields()`, `FieldPubIdUrn.js` and `FieldTextUrn.js`
  in OJS and OMP. On 3.4 and 3.3, `PKPWorkflowHandler` (the identifiers
  form is in `publicationFormIds`) and the URN plugin in OJS and OMP.
- Tips: `main` OJS bade233f73 (pkp-lib 2e377d27fc), OMP 3b0ecf794
  (pkp-lib 3dc90c81a6), ui-library 280f98c5. `stable-3_5_0` OJS
  92b9a16b48, OMP 3081c9b00, pkp-lib a9c76aed62, ui-library 1a7a4750.
  `stable-3_4_0` OJS 9571d8fde7, OMP 0aec65441, pkp-lib df13621c2d,
  ui-library ee684b34. `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883,
  pkp-lib d446601ebe, ui-library 96959f9e.
- Not driven: the Proofreader (seen in spec U44's own check, footnote
  q1, 2026-09-24); a typed pattern ("Use the pattern entered below…"),
  which reaches the same buttons; 3.4 and 3.3.
