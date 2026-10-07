# After a refused logo, removing it with the hidden "Remove file" still leaves the tab's "Save" disabled

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U10 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a15)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On Settings › Website › "Appearance" › "Setup", "Logo" refuses a ".pdf"
picked with "Upload File" and leaves the refused file's preview in its
drop area. That preview holds a "Remove file" link written white on
white, which shows only while the pointer is over it. A manager who
finds it and presses it expects the box and the tab back as they were.

The drop area empties and "Upload File" works again, but the tab's
"Save" stays disabled, and the form's foot reads "Please correct one
error. Go to Logo: undefined Jump to next error", naming no error the
box shows. "Save" comes back once a picture is chosen for the box, or
after a reload.

This is a second fault beside
[pkp-e2e#772](https://github.com/jardakotesovec/pkp-e2e/issues/772),
where the refusal itself disables "Upload File" and "Save". Fixing that
one removes the refused preview and its link, so this exact path goes,
but not the cause: the same "Go to Logo: undefined" then shows while
the next file uploads. Every upload box that takes a separate file per
language behaves the same, and on a form showing two languages the
fault also works the other way: removing one language's refused file
clears the other language's message too and enables "Save".

## Impact

- **Lost**: the tab's other unsaved changes, if the manager reloads to
  get "Save" back.
- **Who**: whoever refuses a file in one of these boxes and then
  removes it with "Remove file": a manager on "Logo", "Homepage Image"
  and the journal, press or server thumbnail (Website › "Appearance" ›
  "Setup"), "Favicon" ("Appearance" › "Advanced"), or the site logo
  (Administration › Site Settings › "Appearance", on an install with
  more than one journal, press or server); an editor on a publication's
  cover image (the workflow's Publication pages).
- **Way round**: choose any picture with "Upload File", then press the
  "Remove" button the uploaded picture shows; or reload the page.

Low: "Save" can be brought back on screen without losing anything; it
would be medium if only a reload freed it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its "Logo" box is empty; the steps save nothing.
- On your computer: any PDF, `u10r9-logo.pdf`.

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Website, open the "Appearance" tab, then its
   "Setup" tab.
3. Under "Logo", press "Upload File" and choose `u10r9-logo.pdf`.
4. Move the pointer over the file's preview left in the "Logo" drop
   area.
5. Click the "Remove file" link that shows on the preview.

**Expected:** step 5 empties the drop area, the message under "Logo"
goes, "Upload File" is enabled, and the tab's "Save" is enabled with no
error line at the form's foot.

**Observed:** step 3 sends nothing and shows "You can't upload files of
this type." under "Logo"; "Upload File" and "Save" are disabled, and
the form's foot reads:

```
Please correct one error. Go to Logo: You can't upload files of this type. Jump to next error
```

In step 4 the preview turns blue with the file's name, and a "REMOVE
FILE" link appears in white on a white block. Step 5 empties the drop
area, removes the message and enables "Upload File", but "Save" stays
disabled and the foot's message turns to `undefined`:

```
Please correct one error. Go to Logo: undefined Jump to next error
```

Control: the same refusal and "Remove file" on "Appearance" ›
"Advanced" › "Journal style sheet" [OMP: "Press style sheet"; OPS:
"Server style sheet"], a box holding one file shared by all languages,
enables "Save" again with no error line.

## Cause

pkp/ui-library `FormGroup.vue` `setFieldErrors()`
([lines 324-330](https://github.com/pkp/ui-library/blob/a36dc7fe787a8b62421ebc737cf27b5750bdc47a/src/components/Form/FormGroup.vue#L324-L330))
clears one language's errors of a multilingual field by deleting that
language's entry, but leaves the field's now empty object in the
form's errors:

```js
if (localeKey && newErrors[name] && newErrors[name][localeKey]) {
	delete newErrors[name][localeKey];   // {pageHeaderLogoImage: {}} remains
} else if (newErrors[name]) {
	delete newErrors[name];
}
```

The readers count fields, not messages. `FormPage.vue` disables "Save"
on the form's last page (`isLastPage`, which these one-page forms
always are) while `Object.keys(errors).length` is not zero, and
`FormErrors.vue` builds "Go to {label}: {message}" from each field's
first language, which for an empty object is `undefined`. `Form.vue`
`removeError()`
([lines 629-647](https://github.com/pkp/ui-library/blob/a36dc7fe787a8b62421ebc737cf27b5750bdc47a/src/components/Form/Form.vue#L629-L647)),
the other place that removes one language's error, deletes the field
once no language is left; `setFieldErrors()` misses that step.

"Remove file" fires dropzone's `removedfile`, which `FieldUpload.vue`
`onRemoveFile()` answers with `setErrors([])` alone: `set-errors` with
the box's language reaches `setFieldErrors()`, and no `change` event
follows, so `removeError()` never runs. A style sheet box is not
multilingual, so its call takes the `else` branch and deletes the
field: hence the control. Choosing a picture afterwards calls
`onAddFile()`, whose `setErrors([])` finds no entry for the language
and also takes the `else` branch: hence the way round.

The `else` branch has the opposite fault. When a language that holds
no error clears its errors, `newErrors[name][localeKey]` is empty, so
the branch deletes the whole field, every other language's errors
included. On a form showing two languages, adding a file to the French
"Logo" (`onAddFile()`) removes the English refusal's message, and
"Remove file" in English then removes the French one and enables
"Save" while the French drop area still holds its refused file. The
way round above works through this branch.

Reach:

- Walked: "Logo" on `main` and 3.5.
- Read in the code, the same component and path: "Homepage Image", the
  journal, press or server thumbnail, "Favicon", the site logo and a
  publication's cover image are all multilingual upload boxes. The
  category, highlight and announcement images and the style sheets are
  not, and are not affected.
- Read in the code: `onAddFile()` after a refusal also leaves the empty
  object while the new file uploads, until the upload's `change` event
  runs `removeError()`. Today a refused box takes a new file only by
  dragging; once
  [pkp-e2e#772](https://github.com/jardakotesovec/pkp-e2e/issues/772)
  is fixed, a file chosen with "Upload File" after a refusal does the
  same.
- Read in the code: `FieldBase.vue` `beforeUnmount()`, which clears the
  errors of a field that a `showWhen` hides, calls `setFieldErrors()`
  once per language. On a form with one language that call leaves the
  same empty object; with two, the second language's call takes the
  `else` branch and deletes the field. Not walked: no screen was found
  that puts an error on such a field.

## Proposed fix

Make a language's clear touch only that language, and delete the field
once no language is left, as `Form.vue` `removeError()` does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-file-remove-keeps-save-disabled/fix.diff),
against an app root):

```diff
--- a/lib/ui-library/src/components/Form/FormGroup.vue
+++ b/lib/ui-library/src/components/Form/FormGroup.vue
@@ -322,8 +322,17 @@
 
 			let newErrors = this.errors;
 			if (!errors || !errors.length) {
-				if (localeKey && newErrors[name] && newErrors[name][localeKey]) {
+				if (
+					localeKey &&
+					newErrors[name] &&
+					typeof newErrors[name] === 'object' &&
+					!Array.isArray(newErrors[name])
+				) {
+					// Clear this language only, and the field once no language is left
 					delete newErrors[name][localeKey];
+					if (!Object.keys(newErrors[name]).length) {
+						delete newErrors[name];
+					}
 				} else if (newErrors[name]) {
 					delete newErrors[name];
 				}
```

Every field's `set-errors` arrives in `FormGroup`, so the one change
covers every upload box and the unmount path. Errors not split by
language (an array) are still cleared whole.

Tried on `main` on all three apps. With the fix, step 5 left "Save"
enabled with no error line, and the style sheet and the way round
behaved as before. On a form showing English and French, each
language's refusal message now stayed until that language's own
"Remove file", and "Save" came back only after the second; without
the fix, the French refusal removed the English message and the
English "Remove file" enabled "Save".

**Alternatives**:

- Emit `change` from `FieldUpload.vue` `onRemoveFile()` so that
  `Form.vue` `removeError()` runs: it reports a change of value where
  none happened, and leaves the unmount path as it is.
- Make `FormPage.vue` and `FormErrors.vue` skip empty objects: two
  readers patched instead of the one writer, and the stray entry stays
  in the state.
- The "remove-error" event the comment inside `setFieldErrors()`
  proposes would replace the in-place edit altogether: a larger change
  than this fault needs.

**What goes with it**:

- No data repair, no API or plugin hook change.
- Backport: `setFieldErrors()` is the same on 3.5; on 3.4 and 3.3 it
  works on a shallow copy (`{...this.errors}`) with the same branches,
  so the same lines apply.
- Test: a ui-library unit test of `setFieldErrors()` clearing the last
  language of a field, and of a language with no error leaving the other languages'
  errors in place.

Small: one ui-library method, following `Form.vue` `removeError()`, with a
unit test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-file-remove-keeps-save-disabled/walk.js)
  takes these Steps and the control:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/refused-file-remove-keeps-save-disabled/walk.js`.
  `WALK=nb` is the neighbour check: on the same tab, "French" pressed
  at the top of the form to show the French fields, "Logo" refuses the
  PDF in English, then in French; "Remove file" is pressed in English,
  then in French.
- Walked on OJS, OMP and OPS, `main` (Steps, control and neighbour
  check, with the fix in and out) and
  `stable-3_5_0`, on PostgreSQL, from pkp/datasets 401a013
  (2026-10-06). No request failed on the server and no page script
  failed.
- Traced in the browser on OJS `main`, with logging added for the
  length of one walk to `setFieldErrors()`, `FieldUpload.vue`'s
  handlers and `FieldBase.vue` `beforeUnmount()`: the French file's
  `onAddFile()` called `setFieldErrors(name, [], 'fr_CA')` while only
  `en` held an error, which deleted the field; the English "Remove
  file" then did the same to the French error. In the Steps, one call
  deleted `en` and left `{}`.
- Not driven: 3.4 and 3.3; the boxes the Reach reads in the code; the
  unmount path.
- Tips:
  - **`main`:** OJS 92bc2bb467 (lib/pkp e60013c77f), OMP a0e6d0a8b,
    OPS 7e34fdd57e (lib/pkp 5a5ab2d6c7), lib/ui-library a36dc7fe in
    each.
  - **`stable-3_5_0`:** OJS b8f5e9a951, OMP 7d6b00060, OPS acc0de0586,
    lib/pkp 6d7f1540b6 and lib/ui-library 98ac8986 in each.
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads: the methods the Cause names, on `main`, 3.5, 3.4 and 3.3,
  and the forms that build the upload boxes.
- Introduced: `git blame` puts the `if`/`delete` lines on 5cf37c98
  (2020, `pkp/pkp-lib#6057`, a signature change that kept the logic);
  its parent has the same branches from 7496b3c2, the forms' first
  version.
- Upstream: the one hit on `setFieldErrors`, `pkp/pkp-lib#5791` (a
  TypeError on a missing errors list, closed), is another fault.
