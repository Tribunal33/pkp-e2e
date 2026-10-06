# "Assign" fills the URN box for a participant whose "Save" is greyed on the "Identifiers" page

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** `pkp/ui-library#43` for `pkp/pkp-lib#4867` · [6b6d7ef9](https://github.com/pkp/ui-library/commit/6b6d7ef9f0d108e4406df83bf839db3b43163018) · 2019-10-09 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U44 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U44-identifiers.md#a9)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

Some participants may open an article's or monograph's "Identifiers"
page but may not change the publication: a Layout Editor, a Copyeditor,
a Proofreader, or a section editor whose assignment does not allow
changes to the publication. For them "Save" is greyed, but the URN
field's "Assign" stays active. Pressing it fills the URN box as if the
URN had been assigned, and "Clear" takes the place of "Assign".

Nothing is sent: the box is empty again the next time the page opens.
The participant is offered a step they cannot finish, and only the
greyed "Save" hints that the URN was never assigned.

It needs the URN plugin, which is off until a manager turns it on, with
URNs for articles (monographs on a press) and the suffix left at "Use
default patterns.", the choice its settings start with. OPS has no URN
plugin. DOIs are not affected: since 3.4 they are assigned on the "DOIs"
page, which only managers open (3.3 is in the Cause).

## Impact

- **Lost**: nothing. The URN is not assigned, and an editor who may
  edit the publication assigns it as usual.
- **Who**: the participants above, each time they open "Identifiers"
  while the URN is unassigned.
- **Way round**: not needed.

Low: a misleading control.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS or OMP). The steps set up
  the URN plugin, which the dataset leaves off.
- In the dataset, `sberardo` (Section editor) is assigned to OJS
  submission 1 with "Allow this person to make changes to the
  publication…" unticked; `shellier` (OJS submission 1) and `gcox` (OMP
  submission 4) are its Layout Editors.

Setting up URNs:
1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Enabled" on the "URN" row.
3. The "URN" row's arrow › "Settings": tick "Articles" [press:
   "Monographs"]; "URN Prefix" `urn:nbn:de:0000-`; leave "Use default
   patterns."; "Namespace" `urn:nbn:de`; "Resolver URL"
   `https://nbn-resolving.de/`; "Save". Sign out.

As a participant who may not edit:
4. Sign in as `sberardo` [press: `gcox`].
5. Open submission 1, "Signalling Theory Dividends" [press: 4, "How
   Canadians Communicate: Contexts of Canadian Popular Culture"],
   Publication › "Identifiers". On OJS the workflow opens on version
   1.1, which is unpublished and in Vol. 1 No. 2.
6. Look at "Save" and at "Assign" beside the "URN" box.
7. Press "Assign".
8. Reload the page.
9. OJS: sign out and take steps 4–8 as `shellier`.

**Expected**: with "Save" greyed, "Assign" is greyed too and pressing it
does nothing, so the page offers no change it cannot keep.

**Observed**: "Save" is greyed and "Assign" is active, for `sberardo`,
`shellier` and `gcox` alike. Pressing "Assign" fills the box with
`urn:nbn:de:0000-jpkjpk.v1i2.1` [press `urn:nbn:de:0000-jpk.4`], and
"Clear" replaces "Assign"; no request is sent. After the reload the box
is empty and "Assign" is back.

Control: `dbarnes` on the same page has "Save" active; "Assign", then
"Save", shows "Saved", and the URN is there after a reload.

## Cause

On the workflow's publication pages, `canSubmit` is the only sign of
the right to change the publication that the form component receives.
`WorkflowPublicationForm.vue` (ui-library) sets
`newPublicationForm.canSubmit = props.canEdit`, where `canEdit` is the
publication's `canCurrentUserChangeMetadata`, computed on the server by
`Repo::submission()->canEditPublication()`. That is false for a
participant whose stage assignments all have `can_change_metadata`
off. `Form.vue` documents `canSubmit` as "The save button will be
disable if this is false". Its two readers are `FormPage`'s "Save" and
`Form`'s own `submit()`, which returns without a request when it is
false.

The URN field is the plugin's `FieldPubIdUrn.js`, which extends
ui-library's `FieldPubId.vue`. Under a suffix pattern its box is disabled
(`:disabled="!!pattern"`), so its two buttons are the only way to change
the value. They are shown on the pattern and the value alone:

```vue
<PkpButton v-if="pattern && canGenerateId && !currentValue" … @click="assignId">
<PkpButton v-else-if="pattern && currentValue" … @click="() => (currentValue = '')">
```

Neither knows whether the form can be saved. No version of the field
ever checked it: not `FieldDoi` in 6b6d7ef9 (DOIs in OJS 3.2), not the
rename to `FieldPubId` for URNs (dace47b6, `pkp/pkp-lib#5208`), and not
the later edits of "Clear"'s condition (on `main` its line comes from
bd2baedd6).

Reach:
- "Assign" on the "Identifiers" page, under a suffix pattern: walked,
  OJS (a section editor without the permission, a Layout Editor) and OMP
  (a Layout Editor).
- "Clear", when a URN is already saved: its own condition ignores
  `canSubmit` too, so it empties the box for these participants and the
  change cannot be saved. Code.
- With "Enter an individual URN suffix…" the field is `FieldTextUrn.js`,
  a typeable box with "Add Check Number". It stays editable for these
  participants, like every other text box on these pages. That is a
  separate, open question
  ([U40 A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U40-publication-metadata.md#a8))
  and left out here. Code.
- DOIs on `main`, 3.5 and 3.4: nothing uses `FieldPubId`. A DOI is
  assigned on the "DOIs" page (`PKPDoisHandler`, managers and site
  administrators only), not on the workflow's publication pages. On 3.3
  the DOI plugin's publication field is a `FieldPubId`, so its "Assign"
  acts the same way. Code.
- On 3.4 and 3.3, `WorkflowPage.vue` sets
  `form.canSubmit = this.canEditPublication && publication.status !== STATUS_PUBLISHED`,
  so there the active "Assign" also shows to editors on a published
  version that has no URN. Code.

## Proposed fix

Proposal: let the field's own buttons follow the form's "Save". `Form.vue`
already gives its fields `requireWhen` through `provide()` (which
`FormFieldLabel` injects), so the form can hand out `canSubmit` the same
way. `FieldPubId` then greys "Assign" and "Clear" when the form cannot
be saved, and the plugin's `FieldPubIdUrn` inherits this through
`extends`. The diff, [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/fix.diff):

```diff
--- a/lib/ui-library/src/components/Form/Form.vue
+++ b/lib/ui-library/src/components/Form/Form.vue
 			requireWhen: (isRequired) => requireWhen(isRequired, this.fields),
+			// Lets a field's own actions follow the save button (e.g. FieldPubId's Assign)
+			formCanSubmit: () => this.canSubmit,
--- a/lib/ui-library/src/components/Form/fields/FieldPubId.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldPubId.vue
 				v-if="pattern && canGenerateId && !currentValue"
 				class="pkpFormField--pubid__button"
+				:is-disabled="!formCanSubmit()"
 				@click="assignId"
 …
 				v-else-if="pattern && currentValue"
 				class="pkpFormField--pubid__button"
+				:is-disabled="!formCanSubmit()"
 …
 	extends: FieldBase,
+	inject: {
+		/** Whether the form holding this field can be saved. Assign and Clear are disabled when it cannot. */
+		formCanSubmit: {default: () => () => true},
+	},
```

The injected default keeps the field as it is in any form that does not
provide the value. Tried on OJS and OMP `main`: for `sberardo`,
`shellier` and `gcox`, "Assign" is greyed beside the greyed "Save" and
the box stays empty. With and without the fix, `dbarnes` keeps an
active "Assign" and "Clear" and saves the URN.

**Alternatives**:
- Hide "Assign" and "Clear" instead of greying them: "Save" stays on
  screen greyed, so greyed buttons beside it read the same way and keep
  the page's layout.
- Pass `canSubmit` to every field as a prop from `FormGroup`: every
  field would receive a prop it does not declare. `provide` is how
  `Form` already shares form-wide state with its fields.
- Show the publication pages display-only for these participants
  (`Form`'s `displayOnly`, used by the review and discussion windows):
  it would also cover the typeable boxes, but it changes what authors and
  assistants see on every publication page, which is a product decision.

**What goes with it**:
- No stored data, REST API or plugin hook changes.
- Backport: on 3.5, 3.4 and 3.3 `Form.vue` has no `provide()` yet, so it
  gains one with this single entry. 3.4 and 3.3 run Vue 2
  (`"vue": "^2.6.12"`), where the same object-syntax `inject` with a
  function `default` works unchanged. There "Save" is also greyed on
  every published version, so the fix greys "Assign" there for editors
  too; that is intended. On 3.3 the DOI field gets the fix through the
  same `FieldPubId`.
- Guard: ui-library's vitest has no `@vue/test-utils` or DOM, so a
  mounted-component test needs a new dependency. The realistic guards
  are a Storybook `play` test on a `FieldPubId` story inside a `Form`
  with `canSubmit: false` (21 stories already carry `play` tests), or an
  e2e check of a Layout Editor's "Identifiers" page.

Small: a few lines in two ui-library files and a Storybook `play` test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/walk.js)
  (helpers in `lib.js` beside it). It takes steps 1–9 and the control
  on a freshly loaded default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/walk.js`.
  `WALK=neighbour` takes steps 1–3 and the control alone (with the fix
  applied and without). The fix was applied with `node bin/try-fix.js
  apply shared/playwright/checks/issues/urn-assign-offered-without-edit-rights/fix.diff ojs omp`
  and reverted after.
- Walked: OJS and OMP on `main` and on `stable-3_5_0`, each on its
  branch's default dataset (pkp/datasets c657990, 2026-10-01,
  PostgreSQL), with the same outcome on both. On 3.5 the "Identifiers"
  page is reached from the side menu of the version the workflow opens
  on. OPS has no URN plugin. The behaviour is in the browser only, so
  the database plays no part.
- Which participants may not edit: `stage_assignments.can_change_metadata`
  is 0 in the dataset for `sberardo` on OJS submission 1 and for every
  Layout Editor, Copyeditor and Proofreader assignment read on OJS
  submissions 1, 5, 6, 9 and 15 and OMP submission 4. Copyeditors and
  Proofreaders were not walked; they get the same `canEditPublication()`
  answer.
- "Clear" for these participants was not walked (it needs a URN saved
  first).
- Code reads: `lib/ui-library` `src/components/Form/fields/FieldPubId.vue`,
  `src/components/Form/Form.vue`, `src/components/Form/FormPage.vue`,
  `src/pages/workflow/components/publication/WorkflowPublicationForm.vue`
  and `src/pages/workflow/composables/useWorkflowPermissions.js`;
  `lib/pkp` `classes/submission/Repository.php` `canEditPublication()`
  and `classes/publication/maps/Schema.php`; the app's
  `plugins/pubIds/urn/js/FieldPubIdUrn.js` and `FieldTextUrn.js`. On 3.5
  the same files are unchanged on these points (`Form.vue` has no
  `provide()`). On 3.4 and 3.3: ui-library `FieldPubId.vue` (the same
  two conditions) and `src/components/Container/WorkflowPage.vue`
  (`canSubmit` from `canEditPublication` and the published status). The
  app's `plugins/pubIds/urn` adds `FieldPubIdUrn` on both, and on 3.3
  `plugins/pubIds/doi/DOIPubIdPlugin.inc.php` adds a `FieldPubId`; on
  3.4 nothing but the URN plugin does. `lib/pkp`
  `pages/dois/PKPDoisHandler.php` on `main` and 3.4 (managers and site
  administrators). ui-library `package.json` on 3.4 and 3.3:
  `"vue": "^2.6.12"`.
- Introduced: `git blame` gives "Assign"'s condition to dace47b6
  (`pkp/ui-library#48`, the rename to `FieldPubId`) and "Clear"'s to
  bd2baedd6. "Clear"'s condition changed on the way (6b6d7ef9
  `pattern && canGenerateDoi`, dace47b6 `pattern`, bd2baedd6
  `pattern && currentValue`); "Assign"'s is 6b6d7ef9's renamed. None of
  them reads whether the form can be saved, so the fault dates from
  6b6d7ef9, whose PR GitHub names as `pkp/ui-library#43`.
- Branch tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
  64d67363); OMP `main` 3b0ecf794 (3dc90c81a6, 280f98c5); OJS
  `stable-3_5_0` 091fb65453 and OMP 9c5e24246 (both cf3f984335,
  d4e01883); `stable-3_4_0` OJS 75cc2d488b, OMP 0aec65441, pkp-lib
  32b0f4b4af, ui-library ee684b34; `stable-3_3_0` OJS ac77c9fb35, OMP
  8e72fc883, pkp-lib f6ab331645, ui-library 96959f9e.
- Not driven: 3.4 and 3.3, including the 3.3 DOI field (code only).
