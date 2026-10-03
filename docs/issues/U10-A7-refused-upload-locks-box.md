# After a settings upload box refuses a file, its "Upload File" and the tab's "Save" stay disabled

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U10 [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a7)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

A manager who picks a ".pdf" for "Logo" with "Upload File" sees "You
can't upload files of this type." in the box and expects to pick another
file. Instead the box keeps an empty frame with no visible "Remove".
Its "Upload File" is disabled, and so is the tab's "Save", and the
form's foot reads:

"Please correct one error. Go to Logo: You can't upload files of this
type. Jump to next error"

Only a file of the right type dragged onto the box turns both back on.
A manager who never drags a file has to reload the page, losing every
other unsaved change on the tab. "Favicon" and the style sheet behave
the same, as does every upload box of the settings and publication
forms when it refuses a file.

## Impact

- **Lost**: the unsaved changes of the tab or window holding the box,
  when the page is reloaded to free it. Nothing stored is changed.
- **Who**: whoever picks a file of the wrong type in one of these boxes:
  a manager on the website settings (a PDF, or a JPEG for "Favicon",
  which takes only .ico, .png and .gif, is an ordinary slip), or on a
  category's, a highlight's or an announcement's image; an editor on a
  publication's cover image. Keyboard users cannot drag a file, so for
  them the box stays locked until they reload.
- **Way round**: drag a file of the right type onto the box, or reload
  the page.

Medium: the box and "Save" lock until the page is reloaded, and nothing
on screen says that a reload or a dragged file is the only way out; it
would be high if a reload did not free the box.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its "Logo" box is empty; the steps save nothing.
- On your computer: any PDF, `u10e-logo.pdf`, and any PNG,
  `u10e-logo.png`.

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Website, open the "Appearance" tab, then its "Setup"
   tab.
3. Under "Logo", press "Upload File" and choose `u10e-logo.pdf`.
4. Press "Upload File" again, to choose `u10e-logo.png` instead.
5. Click the empty frame left in the box.

**Expected:** step 3 shows "You can't upload files of this type." under
"Logo" and sends nothing. Step 4 opens the file chooser. Choosing the
picture shows its preview and "Alternate text", the message goes, and
"Save" is enabled.

**Observed:** step 3 sends nothing and shows the message under an empty
frame where the drop area was. "Upload File" and the tab's "Save" are
disabled, and the form's foot reads:

```
Please correct one error. Go to Logo: You can't upload files of this type. Jump to next error
```

Step 4 does nothing: the button is disabled. Step 5 does nothing either.
With the pointer over the frame, the frame turns blue with the file's
name and a blank white block. That block is a "Remove file" link
written in white on white. Clicking it empties the box and enables
"Upload File", but "Save" stays disabled and the foot reads "Please
correct one error. Go to Logo: undefined Jump to next error".

Control: dragging `u10e-logo.png` onto the box uploads it, shows its
preview and "Alternate text", and enables "Save".

## Cause

The upload box marks a file as "in the box" as soon as it is added, and
never unmarks it when the file is refused. In pkp/ui-library,
`FieldUpload.vue` `onAddFile()` (line 331) copies every added file into
`uploadFile`, and "Upload File" is rendered with
`:disabled="!!uploadFile"` (line 90; `FieldUploadImage.vue` line 100).
The refusal reaches `onError()` (line 356), which only adds the message
to the field's errors. Only `clear()`, `revert()` and `onRemoveFile()`
set `uploadFile` back to null.

dropzone.js refuses the file after adding it: `addFile()` pushes it into
the list and emits `addedfile`, then `accept()` finds the wrong type
(`dictInvalidFileType`) and `_errorProcessing()` emits `error`. The
refused file stays in dropzone's list and its preview stays in the drop
area: the empty frame.

The message is the field's error, so the form's "Save" is disabled
(`FormPage.vue` line 64) until the field changes. With "Upload File"
disabled and the frame not clickable, the only change left is a dropped
file: `onAddFile()` clears the errors, and the upload's `change` event
removes the field's error from the form.

Reach (every box built on `FieldUpload`; `FieldUploadImage` extends it
and keeps its `onError()`):

- Walked on all three apps, `main` and 3.5: "Logo" (a PDF) on Settings
  › Website › "Appearance" › "Setup"; "Favicon" (a JPEG) and the style
  sheet (a PDF) on its "Advanced" tab.
- Checked in the code: the context's "Homepage Image" and thumbnail;
  the site's logo and style sheet; a category's, a highlight's and an
  announcement's image; a publication's cover image. Each refuses a file
  that is not a picture (`acceptedFiles`, `image/*` by default in
  pkp-lib `FieldUploadImage.php`).
- Checked in the code: a file the API refuses after the upload (for
  example "The POST data is too large.") also arrives in `onError()`,
  so it locks the box the same way.
- Not covered here: the "undefined" in the foot after "Remove file" is
  a separate fault. pkp/ui-library `FormGroup.vue` `setFieldErrors()`
  deletes a multilingual field's locale entry but leaves an empty object
  under the field's name, which the form still counts as an error. The
  fix below removes the refused file and its hidden link, but on a
  multilingual box the next file added after a refusal still clears the
  error through `setFieldErrors()` (`onAddFile()`), so the empty entry
  and "Go to Logo: undefined" stay while that file uploads, until its
  upload's `change` event removes them (read in the code).

## Proposed fix

Take a refused file out of the box in `FieldUpload.vue` `onError()`, and
keep `FieldUploadImage.vue` `onThumbnail()` from putting it back. In
pkp/ui-library:

```diff
--- a/src/components/Form/fields/FieldUpload.vue
+++ b/src/components/Form/fields/FieldUpload.vue
 		onError: function (file, message) {
-			let errors = this.errors.slice();
-			if (typeof message === 'string') {
-				errors.push(message);
+			this.$refs.dropzone.dropzone.removeFile(file);
+			if (typeof message === 'string') {
+				this.setErrors([message]);
 			} else if (typeof message === 'object') {
-				errors.push(message.errorMessage);
+				this.setErrors([message.errorMessage]);
 			}
-			this.setErrors(errors);
 		},
--- a/src/components/Form/fields/FieldUploadImage.vue
+++ b/src/components/Form/fields/FieldUploadImage.vue
 		onThumbnail: function (file) {
+			if (file.status === 'error') {
+				return;
+			}
 			this.uploadFile = {...file};
```

`removeFile()` is dropzone's own call. `FileUploader.vue`
`cancelUpload()` reaches it through the dropzone-vue3 wrapper
(`$refs.dropzone.removeFile()`, which only calls
`this.dropzone.removeFile()`); the diff calls dropzone directly, as
`FieldUpload.vue` already does in `clear()` (`removeAllFiles()`), with
the same effect. It removes the frame and fires `removedfile`, which the
box already handles in `onRemoveFile()`: `uploadFile` goes back to null
and the field's errors are cleared, so the message is set after
`removeFile()`. dropzone draws a picture's thumbnail after the refusal
(a JPEG for "Favicon"), and the guard keeps `onThumbnail()` from
locking the button again.

A file the API refuses takes the same path (read in the code): dropzone
sets its status to `error` and emits `error` with the API's answer, so
the file is removed, "Upload File" comes back, and the answer's
`errorMessage` is shown. An answer that carries `error` instead of
`errorMessage` still shows an empty message, as today; that is a
separate fault this fix does not touch. The whole
change is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-upload-locks-box/fix.diff)
(against an app root, so its paths start with `lib/ui-library/`).

Tried on `main` on all three apps. With the fix, step 3 left an empty
drop area with the message and "Upload File" enabled. Step 4 opened the
chooser and the picture uploaded, with its preview, and "Save" was
enabled. The style sheet (a PDF, then a .css) and "Favicon" (a JPEG,
then a PNG) behaved the same way. The neighbour check, a PNG uploaded to
"Logo" with its alternate text and saved, then a .css saved as the style
sheet, gave "Saved" and the saved logo on reload, with the fix in and
out.

**Alternatives**:

- Clear `uploadFile` in `onError()` and leave the file in dropzone:
  "Upload File" comes back, but the refused file's frame stays in the
  box, with its white-on-white "Remove file".
- Let a refusal made in the browser not disable "Save", since nothing
  was sent and the field's value did not change: a manager who gives up
  on the logo could then save the rest of the tab without uploading.
  The message is shown through the form's errors today, so this needs a
  way to show a field message that is not a form error. That is a wider
  change, and a product question first. With the fix, a manager can
  already get "Save" back without keeping a file: choose a valid file,
  then press "Remove", which clears the message.

**What goes with it**:

- The U16 A17 report
  ([U16-A17-not-a-picture-broken-preview](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A17-not-a-picture-broken-preview.md))
  proposes another guard at the top of the same `onThumbnail()`. The two
  combine as they stand.
- Backport: both files are the same on 3.5, so the diff applies there.
  On 3.4 and 3.3 the method is still named `error` (on vue2-dropzone and
  dropzone 5), and `this.$refs.dropzone.dropzone.removeFile(file)` is
  available there too, so the same edits apply to that method.
- Test: a ui-library story or unit test that adds a refused file and
  checks that "Upload File" is enabled again, and an e2e check in spec
  U10 (a **Planned** item) that walks these Steps.

Small, as a proposal for the team to decide: a few lines in one
ui-library component pair, following dropzone's own removal path the
box already handles, with no change to what the server receives.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-upload-locks-box/walk.js)
  takes these Steps, then the style sheet:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/refused-upload-locks-box/walk.js`.
  `WALK=remove` is the pointer over the frame and the "Remove file"
  link, `WALK=css` the style sheet alone, `WALK=favicon` "Favicon" with
  a JPEG, and `WALK=nb` the check that the fix reaches no further (a
  PNG saved as "Logo", a .css saved as the style sheet).
- Walks: OJS, OMP and OPS on `main` (Steps, `remove`, `css`, `favicon`,
  the trial and the neighbour) and `stable-3_5_0` (Steps, `css`,
  `favicon`), on PostgreSQL. The datasets were pkp/datasets 566bb1f
  (2026-10-03). No request failed on the server and no page script
  failed.
- Not driven: 3.4 and 3.3; `WALK=remove` on 3.5; the boxes the Reach
  marks as checked in the code; a refusal by the API.
- Tips:
  - **`main`:** OJS ff004d0973 (lib/pkp 987776cd04, lib/ui-library
    64d67363), OMP 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5), OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5). `FieldUpload.vue` and `FieldUploadImage.vue` are the same
    in both ui-library commits.
  - **`stable-3_5_0`:** OJS c1cee76b95 (lib/pkp 771474347e), OMP
    9c5e24246c, OPS 38b61882d3 (lib/pkp cf3f984335), lib/ui-library
    d4e01883 in each.
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib ac3fa73402, ui-library 96959f9e.
- Code reads: on `main`, ui-library `FieldUpload.vue`,
  `FieldUploadImage.vue`, `FormGroup.vue` `setFieldErrors()`,
  `FormPage.vue`, `FileUploader.vue`, and dropzone 6.0.0-beta.2
  (`addFile()`, `accept()`, `_errorProcessing()`, `removeFile()`, the
  default `error` and `removedfile` handlers); pkp-lib
  `PKPAppearanceSetupForm`, `PKPAppearanceAdvancedForm` and
  `FieldUploadImage.php`. On 3.5, the two ui-library files (the same as
  `main`). On 3.4 and 3.3, ui-library `FieldUpload.vue` (`onAddFile()`,
  `error()`, the button's `:disabled="!!uploadFile"`) and `package.json`
  (vue2-dropzone 3.6), and pkp-lib's appearance forms and
  `FieldUploadImage`, which build the same boxes with the same accepted
  types.
- Introduced: `git blame` puts the `:disabled="!!uploadFile"` binding,
  the copy in `onAddFile()` and the body of `onError()` on 7496b3c2, the
  forms' first version. `onError()` was named `error()` until
  b28d5dab (2025-03-20, a rename only).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for the
  message's words, "upload … disabled", "logo upload", "favicon
  upload", "FieldUpload", "dropzone" and "uploadFile onError". The
  nearest hits (`pkp/pkp-lib#3226`, a favicon in .ico format refused;
  `pkp/pkp-lib#5423`, a CSS upload error on save) are other faults.
