# A refused task or discussion window tells screen-reader users "Go to undefined" for the empty message box

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none (code; the older discussion window labels its message box)
  - 3.4: none (code; the older discussion window labels its message box)
  - 3.3: none (code; the older discussion window labels its message box)
- **Introduced** `pkp/ui-library#655` for `pkp/pkp-lib#11291` · [bc9a03b9fc](https://github.com/pkp/ui-library/commit/bc9a03b9fc1aaa8bcba51879e10b5d487d2f4c2d) · 2025-07-30 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U37 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U37-tasks-and-discussions.md#a21)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

When "Save" is refused because the message box of a task or discussion
is empty, the error list a screen reader reads beside the buttons names
every other field ("Go to Name: This field is required.") but calls the
message box "Go to undefined: This field is required.". This happens in
the "Add" and "Edit" windows of a submission's tasks and discussions and
in the task template window in Settings.

The box has no label on screen either: unlike "Name", nothing above it
says what it is or that it is required. "Jump to next error" still takes
the user to the box.

## Impact

- **Lost**: nothing; the user must find the field without its name.
- **Who**: screen-reader users who press "Save" before writing the
  message; and every sighted user of these windows, who sees a box with
  no label and no required mark.
- **Way round**: "Jump to next error", or the field's own "This field is
  required." under the box.

Low: a missing label, and the save goes through once the box is filled.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, freshly loaded. Journal:
  submission 5, "Genetic transformation of forest trees", in Production.
  [Press: submission 4, "How Canadians Communicate: Contexts of Canadian
  Popular Culture". Preprint server: submission 1, "The influence of
  lactation on the quantity and quality of cashmere production".]
- A screen reader, or the browser's accessibility tree, to read the
  error list (it is visually hidden).

Adding:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   5 at its "Production" stage
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5&workflowMenuKey=workflow_5`)
   [press: submission 4, `…?workflowSubmissionId=4&workflowMenuKey=workflow_5`;
   preprint server: submission 1, `…?workflowSubmissionId=1&workflowMenuKey=workflow_5`].
2. Under "Production Tasks & Discussions" press "Add".
3. Press "Save" without filling anything in, and read the error list
   beside "Cancel" and "Save".
4. Type `u37r9 discussion` in "Name", press "Save" again and read the
   list.

Editing:

5. Tick "David Buskins (dbuskins)" under "Participants" [press: "Graham
   Cox (gcox)"; preprint server: "David Buskins (dbuskins)" too], type `u37r9 message` in the message box and press
   "Save".
6. On the row "u37r9 discussion" press "More Actions", then "Edit".
7. Empty the message box, press "Save" and read the list.

Template window:

8. Sign out, sign in as `rvaca` (password `rvacarvaca`) and open
   Settings › Workflow › "Tasks and Discussions".
9. On "Production Stage" press "Add template", press "Save" without
   filling anything in, and read the list.

**Expected:** the list names the message box as it names "Name", for
example "Go to Message: This field is required.".

**Observed:** steps 3 and 9 read:

```
Please correct 2 errors.
  button "Go to Name: This field is required."
  button "Go to undefined: This field is required."
button "Jump to next error"
```

Steps 4 and 7 read "Please correct one error." with the one button "Go
to undefined: This field is required.". The message box has no label in
any of the three windows, while "Name" shows "Name *" in all three.

## Cause

The error list is ui-library's `FormErrors.vue`. For each error it looks
up the field and reads its label (`const label = field ? field.label :
fieldName`), then fills "Go to {$fieldLabel}: {$errorMessage}"
(`form.errorA11y`). The message box is a field with no `label`, so the
lookup finds the field and reads `undefined`.

The field is added without a label in two places:

- The "Add" and "Edit" windows: `useDiscussionManagerForm.js` adds the
  box with `addFieldRichTextArea('description', {...messageFieldOptions,
  …})`, and `messageFieldOptions` (`useDiscussionMessages.js`) carries no
  label. The same options are bound to the "Add New Message" box of a
  discussion's own window (`DiscussionMessages.vue`), which is unlabelled
  too; its empty-box error is a `FieldError` under the box and does not
  go through the list. The field has never had a label: it came in
  without one in bc9a03b9fc (`pkp/ui-library#655`). It has appeared in
  the list since 56c9af1132 (`pkp/ui-library#709`, 2025-10-07) made it
  required.
- The template window: `useTaskTemplateManagerForm.js` adds the box with
  `addFieldPreparedContent('description', …)`, without a label since
  111b9aa781 (`pkp/ui-library#703`, 2025-10-17). It has been required
  since c5201f4af (`pkp/ui-library#731`).

Both rely on the group heading ("Discussion") and its hint to name the
box. The form components expect a label on every field (`FieldBase`'s
`label` prop: "All form fields should have an accessible label"), and
without one `FormFieldLabel` renders no `<label>` at all, so the box
also has no visible label and no required mark.

Reach: no other form field in ui-library or pkp-lib is both required
and unlabelled. A search of every `addField…()` call in ui-library and
every `new Field…()` in pkp-lib, OJS, OMP and OPS found these two only.

## Proposed fix

Label the message boxes "Message" (`stageParticipants.notify.message`),
as the older discussion window did and as ui-library's
`UserInvitationEmailComposerStep.vue` and
`RequestReviewRoundAuthorResponse.vue` label their message bodies. One
line in the shared `messageFieldOptions` labels both discussion boxes
("Add"/"Edit" and "Add New Message"); the template form takes the same
line
([fix-a21.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/fix-a21.diff)):

```diff
--- a/lib/ui-library/src/managers/DiscussionManager/useDiscussionMessages.js
+++ b/lib/ui-library/src/managers/DiscussionManager/useDiscussionMessages.js
@@ -11,6 +11,7 @@
 	// Only the headnote's files can be populated to selectedFiles
 	const selectedFiles = ref(headnoteFiles);
 	const messageFieldOptions = {
+		label: t('stageParticipants.notify.message'),
 		toolbar: 'bold italic underline bullist | pkpAttachFiles',
 		plugins: ['lists'],
 		size: 'large',
--- a/lib/ui-library/src/managers/TaskTemplateManager/useTaskTemplateManagerForm.js
+++ b/lib/ui-library/src/managers/TaskTemplateManager/useTaskTemplateManagerForm.js
@@ -260,6 +260,7 @@
 
 	addFieldPreparedContent('description', {
 		groupId: 'discussion',
+		label: t('stageParticipants.notify.message'),
 		toolbar: 'bold italic underline bullist | pkpInsert',
 		plugins: ['lists'],
 		size: 'large',
```

Tried on OJS, OMP and OPS `main` with the Steps: each list read "Go to
Message: This field is required.", the "Add"/"Edit" and template boxes
showed "Message *", the "Add New Message" box showed "Message", and "Go
to Name: …" was unchanged.

**Alternatives**

- Make `FormErrors.vue` fall back to the field name when the label is
  missing (`field?.label || fieldName`): the list would then read "Go to
  description", still not a name a user knows, and the box stays
  unlabelled.
- A visually hidden label: the form components offer none, and the
  older window showed "Message" on screen.

**What goes with it**

- Guard: a ui-library test that every field `useDiscussionManagerForm`
  and `useTaskTemplateManagerForm` add has a `label`, or an e2e check
  that a refused "Save" lists "Go to Message: This field is required.".

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/walk.js)
  (helpers in `lib.js` beside it) takes the Steps on each app and records
  each list's buttons by accessible name, the list's accessibility tree,
  the message box's `<label>` and the "Add New Message" box's. On an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/discussion-window-placeholder-and-unnamed-message/walk.js`.
- Dataset: pkp/datasets c657990 (2026-10-01). Not heard with a screen
  reader: the list was read from the accessibility tree.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library 64d67363), OMP `main` 3b0ecf794 and OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library 280f98c5); `stable-3_5_0` OJS c346ee00a5, OMP c7b45f88e, OPS 8eaf899468 (lib/ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (pkp-lib 32b0f4b4af, ui-library ee684b34); `stable-3_3_0` OJS ac77c9fb35 (pkp-lib f6ab331645, ui-library 96959f9e).
- Code reads of the older versions: on `stable-3_5_0`, ui-library's
  `DiscussionManager.vue` wraps the older discussions grid, and its
  window (`templates/controllers/grid/queries/form/queryForm.tpl`)
  labels the box "Message" (`stageParticipants.notify.message`,
  required); there is no `TaskTemplateManager`. On `stable-3_4_0` and
  `stable-3_3_0`: the same `queryForm.tpl` label in pkp-lib and no
  `DiscussionManager` in ui-library.
