# A file that is not a picture, put in any image upload box, leaves a broken preview and a request for "[object Event]"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS (not in the category window, which has an older upload box there)
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least the image upload box's first version, `pkp/ui-library#20` for `pkp/pkp-lib#3594` · [7496b3c2](https://github.com/pkp/ui-library/commit/7496b3c2c4b7872373bc2f2fef0e572bb8301059) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a17)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager puts a file that is named as a picture but holds none (a text
file renamed ".png") in an image upload box, such as a category's "Cover
Image". The box takes it as if it were a picture: it shows a broken
picture as the preview and offers "Alternate text" for it, and the
browser asks the server for a page named "[object Event]", which does
not exist. Only "Save" says the file is not a picture: "An invalid image
was uploaded. Accepted formats are .png, .gif, or .jpg."

Every image upload box of the settings and publication forms built on
the shared form library behaves the same way; Cause lists them per app.

## Impact

- **Lost**: nothing; the refused file stays only as an unsaved upload,
  which the app's clean-up of temporary files removes after a day, as it
  does any upload that is not saved.
- **Who**: a manager or editor who uploads a damaged picture or a file
  with the wrong extension. Rare in ordinary use.
- **Way round**: "Remove", then choose a real picture.

Low: the task gets done and nothing is stored wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its category "Social Sciences" (path `social-sciences`) is used
  as it is.
- The dataset's public files folder lacks the journal's own folder
  (`public/journals/1`; OMP `presses/1`, OPS `contexts/1`), which
  creating a journal on screen makes. These steps save nothing, so they
  do not need it.
- A file `not-an-image.png` on the reader's computer: a plain text file
  renamed to end in ".png".
- On `stable-3_5_0` the category window has an older upload box, so the
  steps there take the journal's "Logo" (Settings › Website, the
  "Appearance" tab, its "Setup" tab), as the "3.5" brackets say.

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Journal [OMP: Settings › Press; OPS: Settings ›
   Server] and open the "Categories" tab [3.5: the "Logo" route above].
3. On the "Social Sciences" row, open "More Actions" and choose "Edit"
   [3.5: skip].
4. Under "Cover Image" [3.5: "Logo"], press "Upload File" and choose
   `not-an-image.png`.
5. Press "Save" [3.5: skip].

**Expected:** at step 4 the window shows no preview for a file it cannot
show as a picture, and asks the server for nothing more than the upload.
Step 5 refuses the file with the message under "Cover Image".

**Observed:** at step 4 the upload is taken (`POST
…/api/v1/temporaryFiles`, 200) and the "Alternate text" box appears. The
preview beside it is a broken picture (its address is the text file read
as `data:image/png;base64,VGhpcyBpcyBh…`). The browser then asks for a
page named after a script object:

```
GET /index.php/publicknowledge/en/management/settings/[object%20Event]   404
```

Step 5 returns 400, and the window shows "An invalid image was uploaded.
Accepted formats are .png, .gif, or .jpg." under "Cover Image", "Please
correct one error." beside "Save", and the notice "The form was not saved
because 1 error(s) were encountered. Please correct these errors and try
again." [3.5: the same preview and the same 404.]

## Cause

The upload box treats every "thumbnail" event of its upload library as a
finished preview. The box (`FieldUploadImage.vue` in pkp/ui-library,
extending `FieldUpload.vue`) uses dropzone.js, which reads a dropped file
and draws it on an `<img>` to make a thumbnail. When the browser cannot
decode the file, dropzone's `createThumbnailFromUrl()` hands the image's
`error` event to the callback a finished thumbnail goes to
(`img.onerror = callback`), and that callback, in `_processThumbnailQueue()`,
emits `thumbnail` with the event in place of the data URL:

- `FieldUpload.vue` `onAddFile()` first copies the file into
  `uploadFile` when it is added, before dropzone has read it, so that
  copy has no `dataURL`. `FieldUploadImage.vue` `onThumbnail(file)` (line
  287) then takes any `thumbnail` event as success and copies the file
  again, now with a `dataURL` holding the text file's contents. The
  `thumbnail` computed property returns that `dataURL`, and the box
  draws it: the broken preview.
- dropzone's own default `thumbnail` handler sets its preview template's
  `<img data-dz-thumbnail>` (`FieldUpload.vue`'s `previewTemplate`) to the
  value it was given. The event becomes the string "[object Event]", a
  relative address, so the browser requests it from the settings page's
  folder: the 404.

Reach (every box built as a `FieldUploadImage`, checked in the code;
walked: a category's "Cover Image" on `main`, "Logo" on 3.5):

- All three apps: a category's "Cover Image"; the context's "Logo",
  "Homepage Image" and "Favicon"; the site's "Logo"; a highlight's and
  an announcement's image.
- OJS: the "Journal thumbnail"; an article's "Cover Image" (the
  publication's "Issue" page).
- OMP: the "Press thumbnail"; a book's "Cover Image" (the publication's
  "Catalog Entry" page).
- OPS: the "Server thumbnail"; a preprint's "Cover Image" (its
  publication entry page).
- 3.5 has the same `onThumbnail()` and dropzone 6.0.0-beta.2 through
  `dropzone-vue3`; 3.4 and 3.3 have the same `onThumbnail()` and dropzone
  5.9.3 and 5.5.1 through `vue2-dropzone`, with the same
  `img.onerror = callback` (checked in the code).

## Proposed fix

Ignore a thumbnail that is not a data URL, both in the box's
`onThumbnail()` listener and in dropzone's `thumbnail` option. In
pkp/ui-library:

```diff
--- a/src/components/Form/fields/FieldUploadImage.vue
+++ b/src/components/Form/fields/FieldUploadImage.vue
-		onThumbnail: function (file) {
+		onThumbnail: function (file, dataUrl) {
+			if (typeof dataUrl !== 'string') {
+				return;
+			}
 			this.uploadFile = {...file};
```

With the guard, `uploadFile` keeps `onAddFile()`'s copy, which has no
`dataURL`, so the box draws no preview. In `FieldUpload.vue`'s
`dropzoneOptions`, a `thumbnail` option does what dropzone's default
does (set the preview template's image and its classes) only when it is
given a string, so no request goes out. The whole change is
[a17-fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/a17-fix.diff)
(against an app root, so its paths start with `lib/ui-library/`).
Tried on `main` on all three apps: with the fix, step 4 drew no preview
and sent no request beyond the upload, and step 5 refused the file as
before; a real PNG in the same box still showed its preview and saved,
with the fix in and out.

A proposal; the team decides.

**Alternatives**:

- Refuse the file at once with a message under the box: better for the
  user, but the box would need the server's message text on the page
  (`form.invalidImage` is not among the strings the forms load) and a
  way to drop the temporary file already uploaded. A follow-up, not a
  replacement.
- Patch dropzone to call an error instead of the thumbnail callback: the
  library is a pinned beta (6.0.0-beta.2) behind `dropzone-vue3`, so a
  fix there would not reach the apps soon.

**What goes with it**:

- Backport: the same two edits apply to 3.5's ui-library. For 3.4 and
  3.3 the `onThumbnail()` guard applies as written; whether
  `vue2-dropzone` passes a `thumbnail` option through to dropzone
  unchanged was not checked, because `vue2-dropzone` is not installed in
  those checkouts.
- Test: a ui-library story or unit test that feeds `onThumbnail()` an
  `Event`, and an e2e check in spec U16 (a **Planned** item) that a file
  that is not a picture leaves no preview and no request.

Small: two guards in one ui-library component pair, with no change to
what the server receives.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/walk.js)
  takes these Steps (and those of the sibling reports U16-A6-A7 and
  U16-OMP1):
  `PART=upload PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/category-picture/walk.js`.
  `WALK=nb-upload` in place of `PART` is the check that the fix reaches
  no further: a real PNG in "Social Sciences"' "Cover Image", saved.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02). No request failed on
  the server and no page script failed; the 404 for "[object Event]" is
  the finding. MySQL not checked (the fault does not depend on the
  database).
- Not driven: 3.4 and 3.3; the boxes other than the two walked (Reach).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
    64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5), OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335, lib/ui-library d4e01883 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib 6f96165c90, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib 4156e50233, ui-library 96959f9e.
- Code reads: on `main`, the ui-library files and dropzone 6.0.0-beta.2
  functions the Cause names, and the forms that build a
  `FieldUploadImage` (pkp-lib and each app's `classes/components/forms/`);
  pkp-lib `TemporaryFileManager` and `TemporaryFileDAO::getExpiredFiles()`
  for the unsaved upload; on 3.5, 3.4 and 3.3, ui-library
  `FieldUploadImage.vue` and `package.json`, and dropzone's
  `createThumbnailFromUrl()`. Whether dropzone's error path was the same
  when the box was written (2018) was not read, so the start is not
  traced.
