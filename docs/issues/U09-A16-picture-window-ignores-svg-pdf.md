# An SVG, a PDF or any file but a JPEG, PNG, GIF, BMP or WEBP is ignored in "Insert/Edit Image", with no message

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; "Drop an image here" only)
- **Introduced** not traced: no single change. "Drop an image here" has been silent since [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) (2019-10-31), and "Browse for an image" since [b0f4b908d2](https://github.com/pkp/pkp-lib/commit/b0f4b908d240aa24d2b977a9e62f170b4d97a7aa) (2021-03-04, the move to TinyMCE 5)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U09 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a16)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager opens "Insert/edit image" in a formatted text box, goes to
"Upload" and chooses an SVG drawing or a PDF through "Browse for an
image", or drops one onto "Drop an image here". They expect the picture,
or a refusal that says why. Nothing happens: the window stays on
"Upload", nothing is sent to the site, and no message shows. Any file
other than a JPEG, PNG, GIF, BMP or WEBP is ignored the same way, an
AVIF, HEIC or TIFF picture included.

The site refuses these files anyway, so nothing is lost. But a BMP
chosen in the same window gets "You can only upload the following types
of files: gif, jpg, png, webp.", and these files get no reason at all.
Saving the picture as PNG gets round it.

It happens in every formatted text box with "Insert/edit image": the
custom page, custom block and static page windows, the settings forms
(masthead, information, privacy, appearance and announcements), and
also a reviewer's comment boxes and every user's profile biography.

## Impact

- **Lost**: only the reason for the refusal.
- **Who**: mostly managers, in the boxes above. SVG is the likely case:
  the browser's file dialog offers SVG drawings among the pictures, and
  logos often come as SVG. A PDF has to be dropped on the window, or
  chosen with the dialog set to show all files.
- **Way round**: save the picture as PNG, JPG, GIF or WEBP and choose
  that file.

Low: the outcome, a refusal, is the intended one; the window only fails
to say so. A plugin that lets SVG pictures in would raise it, since its
users could not add one through this window at all (Cause).

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. The steps are the same in OJS,
  OMP and OPS, and on `stable-3_5_0`.
- Three files on the computer: an SVG drawing "drawing.svg", a PDF
  "doc.pdf", and a BMP picture "photo.bmp".

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Setup" › "Navigation".
3. Under "Navigation Menu Items", press "Add item".
4. In "Navigation Menu Type", choose "Custom Page".
5. In the "Content" box's toolbar, press "Insert/edit image". The
   window "Insert/Edit Image" opens.
6. Open its "Upload" tab ("Drop an image here", "Browse for an image").
7. Press "Browse for an image" and choose "drawing.svg".
8. Press "Browse for an image" and choose "doc.pdf" (the file dialog
   shows pictures only at first; set it to show all files).
9. Drag "doc.pdf" from the computer onto "Drop an image here", then
   "drawing.svg".
10. Press "Browse for an image" and choose "photo.bmp".

**Expected**: after steps 7, 8 and 9, a small window over the picture
window says the file is refused, as it does for the BMP in step 10.

**Observed**: after steps 7, 8 and 9 nothing happens. No upload is
sent, no message shows, and the window stays on "Upload" with "Drop an
image here" and "Browse for an image". Step 10 sends the upload, which
answers:

```
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
→ 400 {"error":"You can only upload the following types of files: gif, jpg, png, webp."}
```

and a small window reads "You can only upload the following types of
files: gif, jpg, png, webp." with "OK".

The same SVG or PDF dropped into the "Content" box itself, with the
picture window closed, gets the editor's notice "Dropped file type is
not supported" (TinyMCE's `blockUnsupportedFileDrop()`). The picture
window of "Appearance" › "Setup" › "Page Footer" ignores the SVG and the
PDF the same way.

## Cause

TinyMCE's picture window filters the files it is given before its image
plugin sees them. On the "Upload" tab, both "Browse for an image" and a
drop on "Drop an image here" go through the drop zone's
`handleFiles()`, which keeps only the files whose names end in one of
the editor's `images_file_types` (`filterByExtension()` in
`themes/silver/theme.js`). The default list is
`jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp`. A file not listed is
dropped, and the image plugin's `changeFileInput()` finds no file and
unblocks the window without a word.

pkp never sets `images_file_types` in its two TinyMCE configurations:
`initializeTinyMCE()` in `lib/pkp/js/controllers/SiteHandler.js` (line
180, beside `paste_data_images`) for the legacy boxes, and
`compiledInit()` in ui-library's
`src/components/Form/fields/FieldRichTextarea.vue` (line 227) for the
Vue forms. So the browser keeps a second list of picture types,
TinyMCE's, that disagrees with the site's.

The site's list lives in `PKPUploadPublicFileController::uploadFile()`:
gif, jpg, png and webp, which plugins may change through the
`API::uploadPublicFile::permissions` hook. A file of another type gets
"You can only upload the following types of files: …", unless an
earlier check refuses it first (the hook's 403 for a user it does not
allow, or the 413 for a full picture allowance). A BMP passes TinyMCE's
list and gets that message; an SVG, a PDF, or an AVIF, HEIC or TIFF
picture never reaches the site.

TinyMCE added this filter in 5.6.0 (TINY-6224 in its changelog). Alec
Smecher (asmecher) moved the legacy boxes to TinyMCE 5 in
`pkp/pkp-lib#6827` for `pkp/pkp-lib#6826` (b0f4b908d2). Nate Wright
(NateWr) moved the Vue forms in `pkp/ui-library#164` for
`pkp/pkp-lib#6578`
([6e7ac76a](https://github.com/pkp/ui-library/commit/6e7ac76a358fb127ff5940ad9090d698425b847a),
2021-07-19). Neither set the option. Before that, on TinyMCE 4.9, the
window's drop zone already filtered dropped files silently against its
own fixed list (".jpg,.jpeg,.png,.gif"), while "Browse for an image"
uploaded whatever was chosen and showed the site's answer. That drop
zone came with picture uploads in `pkp/pkp-lib#4890` (a09aa46d19, Nate
Wright). Refusing SVG is intended: `pkp/pkp-lib#9315` disallowed SVG in
core.

Reach:

- Legacy boxes: every box whose toolbar has "Insert/edit image". The
  custom page item window was walked. The custom block and static page
  windows, a reviewer's comment boxes (`reviewer/review/step3.tpl`) and
  the profile's biography (`user/publicProfileForm.tpl`) use the same
  configuration (code).
- Vue forms: `FieldRichTextarea`, and `FieldRichText`, which builds on
  its `compiledInit()`. "Appearance" › "Setup" › "Page Footer" was
  walked: the SVG and the PDF are ignored, the BMP refused with the
  message. `FieldPreparedContent` builds its own configuration without
  an upload handler, so it has no "Upload" tab (code).
- Files: SVG and PDF (walked); any file whose name ends in a type
  outside TinyMCE's list (code).
- A plugin that adds a type through the hook, SVG for instance, cannot
  get such a file in through this window (code).

## Proposed fix

In both configurations, set `images_file_types` to TinyMCE's list plus
the picture types a browser's picture dialog offers that TinyMCE leaves
out. Every picture a user can choose then reaches the site, which owns
the list of types and already explains its refusal
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-window-ignores-svg-pdf/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
+++ b/lib/pkp/js/controllers/SiteHandler.js
 				tinymceParamDefaults.paste_data_images = true;
+				// TinyMCE's picture window silently discards a file whose extension
+				// is not in this list. List every picture type (TinyMCE's default
+				// plus svg, avif, heic, heif, tif, tiff) so that the file reaches the
+				// server, which decides which types it takes
+				// (API::uploadPublicFile::permissions) and says why it refuses one.
+				tinymceParamDefaults.images_file_types = 'jpeg,jpg,jpe,jfi,jif,jfif,' +
+						'png,gif,bmp,webp,svg,avif,heic,heif,tif,tiff';
--- a/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
 				paste_data_images: true,
+				// TinyMCE's picture window silently discards a file whose extension
+				// is not in this list. List every picture type (TinyMCE's default
+				// plus svg, avif, heic, heif, tif, tiff) so that the file reaches the
+				// server, which decides which types it takes and says why it
+				// refuses one.
+				images_file_types:
+					'jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp,svg,avif,heic,heif,tif,tiff',
```

This gives an SVG, AVIF, HEIC or TIFF picture the site's message. **A
PDF stays silent in the window.** TinyMCE also reads this list to turn
a pasted web address into a picture (`isImageUrl()`), so "pdf" in it
would turn a pasted link to a PDF into a broken picture. For the PDF the
team can ask TinyMCE for a message (the first alternative), or replace
the "Upload" tab (the third).

Tried on `main` on the three apps. With the fix, "drawing.svg" chosen
through "Browse for an image" or dropped on "Drop an image here" gets
"You can only upload the following types of files: gif, jpg, png,
webp." in the custom page window and in "Page Footer". "photo.bmp" gets
the same message as before, a PNG is stored as before, and "doc.pdf" is
still ignored in the window. The diff's code comment was reworded after
the trial; the code is unchanged, so the trial stands.

**Alternatives**

- Ask TinyMCE (tinymce/tinymce) for a message when the window's drop
  zone drops a file, as the editor's own drop handler does. That is
  where the silence lives and it would cover the PDF too, but pkp would
  wait for a release. Worth filing beside this fix.
- Send the site's own list to the browser and set `images_file_types`
  to it. The two lists would agree, but a BMP or a ".jpeg" would then be
  ignored silently too, which is worse.
- Replace the "Upload" tab with pkp's own `file_picker_callback`, which
  sends any file and shows the site's answer. It covers the PDF, but it
  is a new pattern, loses the drop zone, and needs a product call.

**What goes with it**

- Every instance: these two configurations are the only ones with
  picture uploads; `FieldRichText` inherits the second.
- Overrides: a plugin that sets its own `images_file_types` keeps it,
  through the TinyMCE plugin's `tinymceParams` for the legacy boxes and
  through the PHP field's `init` for a Vue form (`compiledInit()` spreads
  it last and reads `tinymceParams` only for the language).
- Dropped or pasted into the box itself: an SVG, AVIF, HEIC or TIFF
  picture is now sent to the site and refused with "Failed to upload
  image: You can only upload the following types of files: gif, jpg,
  png, webp." (walked with the fix), where today it gets "Dropped file
  type is not supported". The refused picture is then kept in the text,
  written into it as data, as a refused BMP already is
  ([U09-A17-refused-pasted-picture-kept-embedded](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A17-refused-pasted-picture-kept-embedded.md)).
  So this fix should land with or after that report's fix, which takes
  a refused picture out. The two were not tried together.
- To decide: whether a pasted web address ending in ".svg", ".avif",
  ".heic", ".heif", ".tif" or ".tiff" may become a picture instead of a
  link (`isImageUrl()`); TIFF and HEIC are drawn by Safari only.
- To keep up: the list copies TinyMCE's default by hand, so it drifts
  when TinyMCE changes that default; the comment names the additions.
- "tif" and "tiff": in the window both match by file name. In the box
  itself TinyMCE compares the file's type with "image/" plus the
  extension (`isImage()`), so only "tiff" matches a TIFF's
  `image/tiff`; "tif" is there for the window and pasted addresses.
- Backport: `stable-3_5_0` has the same lines (SiteHandler.js line 174,
  FieldRichTextarea.vue line 215), and the diff applies as written (not
  tried there). 3.4 runs TinyMCE 5.10, which reads the same option, at
  SiteHandler.js line 164 and FieldRichTextarea.vue line 206. 3.3 runs
  TinyMCE 4.9, whose list is fixed inside its image plugin with no
  option, so its drop zone stays as it is.
- Guard: the e2e scenario for spec U09's A16 (a **Planned** item): an
  SVG chosen through "Browse for an image" gets the types message.

Medium: a few lines, but in two repositories, pkp-lib and ui-library
(REPORT.md's scale puts two repositories at medium), and best landed
with the fix for A17.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-window-ignores-svg-pdf/walk.js),
  with its helpers in `lib.js` beside it. The same script holds the
  neighbour checks (a PNG stored through "Browse for an image"; an SVG
  and a PDF dropped into the "Content" box itself; "Appearance" ›
  "Setup" › "Page Footer" with the SVG, the PDF and the BMP), walked
  with the fix in and out. On an install freshly loaded from the
  default dataset, from a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-window-ignores-svg-pdf/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/picture-window-ignores-svg-pdf/fix.diff ojs omp ops`.
- The script chooses the files through the window's own file input,
  which skips the file dialog and its "image/*" filter; a person
  choosing the PDF has to set the dialog to show all files. The drops
  are fired as the browser's own `dragenter`, `dragover` and `drop`
  events, with the file in the event's `DataTransfer`.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL
  in Chromium; the fault is in the browser and does not touch the
  database. Datasets: pkp/datasets c657990 (2026-10-01).
- Code reads. `main` and 3.5: the two configurations; TinyMCE 7.9.3 in
  both copies the apps ship: `lib/pkp/lib/vendor/tinymce/tinymce` for
  the legacy boxes, and ui-library's own npm `tinymce` (7.9.3 in its
  package-lock), which `FieldRichTextarea.vue` imports with the silver
  theme and the image plugin and bundles into the build.
  In them: `filterByExtension()` and `renderDropZone()` in
  `themes/silver/theme.js`, `changeFileInput()` in
  `plugins/image/plugin.js`, the `images_file_types` default,
  `isImage()`, `getImageMimeType()`, `isImageUrl()` and
  `blockUnsupportedFileDrop()` in `tinymce.js`;
  `PKPUploadPublicFileController::uploadFile()` for the site's list,
  its earlier checks and its message. 3.4 (`origin/stable-3_4_0`): both
  configurations without `images_file_types`, on TinyMCE `^5.7` (5.10.9
  in pkp-lib's lock) and `^5.10.0` (ui-library); TinyMCE 5.10.9's
  source (unpkg) has the same `filterByExtension()` with the same
  default. 3.3 (`origin/stable-3_3_0`): TinyMCE 4.* (4.9.11); its
  image plugin sets `acceptExts = '.jpg,.jpeg,.png,.gif'` on both the
  browse button and the drop zone, the drop zone drops other names
  without a word, and the browse button uploads whatever is chosen.
- Introduced: the Cause's fault is a missing option, so there is no
  line to blame; the history is the Cause's.
- Upstream: pkp/pkp-lib, pkp/ojs and pkp/ui-library searched by symptom
  and by `images_file_types`. Read and not the same fault:
  `pkp/pkp-lib#6595` (allow SVG in TinyMCE uploads, closed in favour of
  `pkp/pkp-lib#9315`, which disallows SVG in core), `pkp/pkp-lib#5261`
  and `pkp/pkp-lib#7400` (SVG and WEBP cover images).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a and ui-library
  64d67363; OMP `main` 3b0ecf794 and OPS `main` c8af945bb7, both with
  lib/pkp 3dc90c81a6 and ui-library 280f98c5. `stable-3_5_0` OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e and OPS 8eaf899468
  with lib/pkp 1fb843f491; ui-library d4e01883 in all three.
  `stable-3_4_0` lib/pkp 32b0f4b4af, ui-library ee684b34 (OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b); `stable-3_3_0` lib/pkp
  f6ab331645, ui-library 96959f9e (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161).
