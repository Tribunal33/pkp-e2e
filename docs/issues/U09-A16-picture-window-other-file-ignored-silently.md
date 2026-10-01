# An SVG, HEIC or PDF file chosen in a text box's "Insert/Edit Image" window is ignored without a message

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code; a dropped file only: a chosen one gets the site's message)
- **Introduced** not traced; present since at least [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) (2019-10-31)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a16)
- **Checked** 2026-10-01

## Summary

Someone adds a picture to a formatted text box ("Insert/edit image" ›
"Upload"), for example a custom block's "Content" or the "Page Footer",
and chooses or drops a file the text editor does not take for a picture:
an SVG drawing, a HEIC photo or a PDF. Nothing happens. The window stays
on "Upload", nothing is sent to the site, and no message says why.

The file is rightly refused, since the site takes only GIF, JPEG, PNG
and WebP pictures. But the person is not told so, unlike with a BMP,
which the text editor passes on and the site refuses with "You can only
upload the following types of files: gif, jpg, png, webp.".

Managers meet it in their settings, custom blocks, static pages and
announcements, editors in their email windows, reviewers in their review,
and every user in their profile's "Bio Statement". The fix is a message,
but in two code bases, since the older screens and the newer forms set up
the text editor separately.

## Impact

- **Lost.** Nothing: no work, and no picture that the site would have
  stored.
- **Who.** Anyone with a picture button: managers (settings, custom
  blocks, static pages, navigation menu pages, announcements), editors
  (email windows), reviewers (their review and the message declining a
  request), and any user, authors and readers included, in their
  profile's "Bio Statement". The submission form and discussions have no
  picture button. They meet it with a file whose name ends in something
  the text editor does not pass on: an SVG logo, a photo saved as HEIC
  (the format iPhone cameras save in by default), an AVIF or TIFF
  picture, a PDF. A ".bmp" is passed on, so the site refuses it with its
  message.
- **Way round.** Convert the file to PNG or JPEG and upload it again,
  once the person guesses the reason.

Low: the outcome is right (the file cannot be stored) and nothing is
lost; what is missing is the message. It would be medium if people were
led to believe the picture had been added, but the window plainly stays
as it was.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`).
- The public files directory holds `public/site/`. The installer makes
  it, so an installed site has it; an install whose `public/` was emptied
  before loading the dataset does not, and refuses every upload with "The
  public files directory was not found or files can not be saved to it."
  until it is created (`mkdir public/site`). Only the control and step 12
  send a file to the site.
- Files on the computer: "drawing-u09a16.svg" (any SVG drawing),
  "photo-u09a16.heic" (any file renamed to end in ".heic" will do, since
  the text editor reads only the name), "doc-u09a16.pdf" (any PDF), and
  for the control "photo-u09a16.bmp" (a BMP picture) and
  "small-u09a16.png" (a small PNG).

In a custom block:

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Generic Plugins", tick "Custom Block Manager". "The plugin
   "Custom Block Manager" has been enabled." shows.
4. Press the arrow on its row, then "Manage Custom Blocks", then "Add
   Block".
5. In the "Content" toolbar press "Insert/edit image". In the window
   "Insert/Edit Image" open the tab "Upload".
6. Press "Browse for an image" and choose "drawing-u09a16.svg". The
   file chooser lists only pictures; if a file is not listed, switch the
   chooser's file-type filter to all files.
7. Press "Cancel" in the "Insert/Edit Image" window.
8. Repeat steps 5 to 7 with "photo-u09a16.heic", then with
   "doc-u09a16.pdf".
9. Repeat step 5, drag "doc-u09a16.pdf" onto "Drop an image here", then
   press "Cancel".

In a settings box:

10. Open Settings › Website, tab "Appearance", side tab "Setup".
11. In the "Page Footer" toolbar press "Insert/edit image", open "Upload",
    press "Browse for an image" and choose "doc-u09a16.pdf"; then
    "Cancel".
12. Repeat step 11 with "small-u09a16.png".

**Expected.** For each of the SVG, HEIC and PDF files a message over
the window says that files of its kind are not accepted, and nothing is
inserted. The PNG in step 12 is uploaded and put in "Page Footer".

**Observed.** For the SVG, HEIC and PDF files, chosen or dropped, in
either box: nothing. The window stays on "Upload" with "Drop an image
here" and "Browse for an image", no message shows, and no request is
sent.

Control: steps 5 and 6 with "photo-u09a16.bmp" send the file, which the
site refuses (`400 {"error":"You can only upload the following types of
files: gif, jpg, png, webp."}`), and a message over the window reads "You
can only upload the following types of files: gif, jpg, png, webp.",
with "OK".

## Cause

The "Upload" tab is TinyMCE's. Its file field (the `dropzone` component,
`filterByExtension()` in TinyMCE 7's `themes/silver/theme.js`) keeps only
the chosen or dropped files whose names end in one of the editor's
`images_file_types`, by default
`jpeg,jpg,jpe,jfi,jif,jfif,png,gif,bmp,webp`. When no file is left, the
image plugin's `changeFileInput()` unblocks the window and stops: no
upload, no message. TinyMCE added a message for this case in 8.4.0
(TINY-13420: "Selected images do not have allowed extensions"); pkp
ships TinyMCE 7, whose last release, 7.9.3, does not have it.

pkp's two TinyMCE configurations turn the tab on and add nothing for this case:
the legacy one in `$.pkp.controllers.SiteHandler.prototype.initializeTinyMCE()`
([SiteHandler.js](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/SiteHandler.js#L177-L208))
and the Vue one in `FieldRichTextarea.vue`'s `compiledInit()`
([FieldRichTextarea.vue](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Form/fields/FieldRichTextarea.vue#L209-L273)).
Both set `images_upload_handler` (the legacy one whenever the TinyMCE
plugin gives an upload address, which it always does on the back end;
the Vue one in every case), which makes TinyMCE show the "Upload" tab
in any box whose toolbar has the picture button, and both leave
`images_file_types` at TinyMCE's default. A file the text editor's list
takes but the site does not (".bmp", ".jpeg") reaches the
upload endpoint, `PKPUploadPublicFileController::uploadFile()`, which
answers with its own message, and that message shows; a file outside
the text editor's list never gets that far.

The site's refusal of SVG is intended: `pkp/pkp-lib#6595` asked for SVG
uploads in these boxes and was closed without them, for the scripts an
SVG can carry. So the fix is a message, not a wider list.

Reach:

- Every legacy formatted text box (all three of `SiteHandler`'s toolbars
  have `image`): custom blocks (on screen), static pages, navigation menu
  custom pages, a user's "Bio Statement" (`publicProfileForm.tpl`), a
  reviewer's comments and decline message (`reviewer/review/step3.tpl`,
  `modal/regretMessage.tpl`), the editors' and managers' email and
  settings windows (in the code).
- Every Vue box whose toolbar has `image`: the "Page Footer" (on screen),
  the masthead, information, privacy, appearance and announcement forms
  (in the code; `FieldPreparedContent` renders `FieldRichTextarea`). The
  submission form's boxes (`TitleAbstractForm`) and the discussion
  messages (`useDiscussionMessages.js`) have no `image` in their
  toolbars.
- The file chooser behind "Browse for an image" asks for pictures
  (`accept="image/*"`), so the common case is a picture of a kind the
  text editor does not list (SVG, HEIC, AVIF, TIFF); a PDF is the case
  where the person changes the chooser's filter.

## Proposed fix

Until pkp moves to TinyMCE 8.4 or later, show the message TinyMCE 8.4
shows, from pkp's own editor setup: when the "Upload" tab is given only
files whose names end in none of the editor's `images_file_types`, open
`editor.windowManager.alert('Selected images do not have allowed
extensions')`, the window TinyMCE already uses for an upload the site
refuses. The same few lines go in both configurations
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-window-other-file-ignored-silently/fix.diff)):
a new `SiteHandler.prototype.alertOnSkippedImages(editor)` called from
`triggerTinyMCESetup()`, and a method of the same name in
`FieldRichTextarea.vue`. There `compiledInit()` gains a `setup` callback
that calls the new method and then the field's own `init.setup`, if it
has one (the callback through which `FieldPreparedContent.vue` adds its
insert button). Each method listens, while one of the editor's windows is open (`OpenWindow` /
`CloseWindow`), for a file chosen or dropped in the tab's
`.tox-dropzone-container`:

```js
editor.on('OpenWindow', () => {
	if (!openWindows++) {
		document.addEventListener('change', onFiles, true);
		document.addEventListener('drop', onFiles, true);
	}
});
// onFiles: the files chosen or dropped in .tox-dropzone-container; if none
// ends in one of editor.options.get('images_file_types'):
editor.windowManager.alert('Selected images do not have allowed extensions');
```

The check is TinyMCE's own (the name's ending against the same option),
so the message shows exactly when TinyMCE drops the files.

Tried on `main` in OJS, OMP and OPS: with the fix in, the PDF, SVG and
HEIC files, chosen or dropped, in the custom block and in "Page Footer",
each got a message over the window reading "Selected images do not have
allowed extensions", with "OK", and sent nothing. With and without it, a
small PNG was uploaded and inserted, the BMP got the site's message
alone, and a PDF dropped together with the PNG uploaded the PNG with no
message. The proposed text names the reason (the file's kind), not the
accepted kinds; see the last alternative.

**Alternatives**

- Upgrading TinyMCE to 8.4 or later: the root fix, with the same message
  and no pkp code. It is a major-version upgrade in pkp-lib (composer),
  ui-library and the three apps' JavaScript builds, with its own
  breaking changes, and 3.5 stays on 7.x. When pkp makes it, the new
  methods go.
- Setting `images_file_types` to the site's list (`gif,jpg,png,webp`):
  the editor would then drop ".bmp" and ".jpeg" files silently too, so
  more files without a message.
- pkp's own message naming the site's types
  (`api.publicFiles.400.extensionNotSupported`), to match the BMP
  refusal: the list can be changed by plugins on the server
  (`API::uploadPublicFile::permissions`), which the page does not know,
  and the string has to be sent to the page for both editors.

**What goes with it**

- Language: the text goes through TinyMCE's translation, not a pkp
  locale key. The TinyMCE language files pkp ships are in the pkp/tinymce
  plugin (`plugins/generic/tinymce/langs` in each app), copied from the
  7.x packs, which lack the string; until it is added there, other
  languages show it in English.
- Each app commits its minified legacy script (`js/pkp.min.js`), so each
  app's repo takes a rebuilt one, as well as the JavaScript build that
  carries ui-library. No stored data, API or plugin hook changes.
- Backport: the diff applies to `stable-3_5_0` as it stands (TinyMCE 7).
  On 3.4 (TinyMCE 5) the option is read with
  `editor.getParam('images_file_types', …)`; 3.3 (TinyMCE 4) has a
  different component and drops only dropped files.
- The fix for a refused pasted or dropped picture kept in the text
  ([U09-A17-dropped-picture-refused-stays-embedded.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A17-dropped-picture-refused-stays-embedded.md))
  changes the same two files; the two diffs apply together.
- Test: an e2e check in U09.

Medium: one message, but in two repos (about forty lines in pkp-lib's
`SiteHandler.js` and the same in ui-library's `FieldRichTextarea.vue`),
with each app's rebuilt `js/pkp.min.js` and JavaScript build, and the
translations in pkp/tinymce if they are wanted before the TinyMCE
upgrade.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-window-other-file-ignored-silently/walk.js)
  takes steps 1 to 9 and the control (`settings` as its argument: steps
  10 to 12; `neighbour`: the cases the fix must leave alone, the small
  PNG, the BMP and a PDF dropped together with the PNG):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-window-other-file-ignored-silently/walk.js [settings|neighbour]`.
  The HEIC file it makes holds only a HEIC header.
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs omp ops`
  and taken out with `node bin/try-fix.js revert ojs omp ops`.
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`, OJS, OMP
  and OPS: steps 1 to 9, the control and steps 10 to 12 on both. The
  database plays no part. TinyMCE in the page: 7.9.3 on `main`, 7.7.1 on
  3.5, `images_file_types` at the default.
- Commits tested:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2);
    pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    (OJS) and
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (OMP, OPS), the same `SiteHandler.js`; ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994);
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
    ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - 3.4 and 3.3 were read at the tips of pkp's `stable-3_4_0` and
    `stable-3_3_0` branches (2026-10-01).
- TinyMCE read: pkp-lib's composer copy
  (`lib/vendor/tinymce/tinymce`: `themes/silver/theme.js`
  `renderDropZone()` and `filterByExtension()`, `plugins/image/plugin.js`
  `changeFileInput()`); TinyMCE's `main` (`Dropzone.ts` calls
  `onInvalidFiles()` when no file is left, `plugins/image/.../Dialog.ts`
  passes the alert) and its CHANGELOG (8.4.0, 2026-03-31, TINY-13420);
  the npm registry, for the last 7.x release.
- Code read on 3.5: the same two configurations and the same filter. On
  3.4: TinyMCE 5.10.9 (composer) and 5.10.7 (apps' builds), whose
  `filterByExtension()` drops the files the same way, and the same two
  configurations with `images_upload_handler`. On 3.3: TinyMCE 4.9.11.
  Its "Browse for an image" opens a chooser listing only ".jpg", ".jpeg",
  ".png" and ".gif" files and sends any file picked, so a PDF or SVG
  picked after switching the chooser's filter gets the site's "You can
  only upload the following types of files: gif, jpg, png, webp." (the
  same four types in `PKPUploadPublicFileHandler`); its `DropZone` drops
  a file outside that list with no message.
- Introduced: uploads in these boxes came with a09aa46d19
  (`pkp/pkp-lib#4890`), on TinyMCE 4, where only a dropped file was
  ignored; a chosen file too since TinyMCE 5 (b0f4b908d2,
  `pkp/pkp-lib#6826`, 2021-03-04, in the legacy editor).
- Upstream: searched 2026-10-01 in pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by the symptom's words ("Browse for an image",
  image upload nothing happens, SVG, HEIC, image file type, dropzone) and
  by `images_file_types`, TinyMCE 8 and the TinyMCE upgrade PRs.
  `pkp/pkp-lib#6595` (allow SVG uploads, closed) is about accepting SVG,
  not about the missing message; no pkp issue or PR moves to TinyMCE 8.
- Not driven: the other legacy and Vue boxes (read in the code); the
  site's own boxes; a real HEIC photo (the text editor reads only the
  name);
  3.4 and 3.3 (read in the code).
