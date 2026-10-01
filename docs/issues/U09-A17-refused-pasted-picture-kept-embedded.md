# A dropped or pasted picture the site refuses stays in the text, embedded, and is saved

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** not traced; present since at least [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) (2019-10-31)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a17)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager drags a picture from their computer into a formatted text
box, or pastes one, and the site refuses it. A notice over the box
reads "Failed to upload image:" and the reason, for a BMP "You can only
upload the following types of files: gif, jpg, png, webp.". The manager
expects the picture to be gone. Instead it stays in the box, its data
written into the text itself rather than stored as a file.

"Save" keeps it that way. The public page then holds an `<img>` whose
address is the picture's own data: the browser draws a refused picture
as usual, and a refused file that is not a picture as a broken picture.
Each later picture dropped into the box sends the refused ones again
and repeats their notices. Deleting the picture by hand before saving
gets round it.

It happens in every formatted text box that takes pictures: the custom
page, custom block and static page windows, and the settings forms.

## Impact

- **Lost**: no content. The site's rules on picture types, and each
  user's allowance for uploaded pictures (5000 KB by default), do not
  hold for a picture kept this way.
- **Who**: mostly managers, whose custom pages, blocks, static pages
  and settings texts are published. The same editor serves every
  formatted text box of the back office, among them a reviewer's
  comments and every user's biography on the profile page. It happens
  each time the site refuses a dropped or pasted picture: a BMP, a file
  that is not a picture, a picture whose content does not match its
  name, or any picture once the user's allowance is used up.
- **Way round**: select the picture in the box and delete it before
  "Save"; a page already saved is edited the same way.

Low: nothing is lost, and the notice says the upload failed while the
picture stays in view, so the manager can take it out. When the
upload's answer is not JSON, no notice shows (Cause); that is rare on
a production server and would not change the level alone.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. The steps are the same in OJS,
  OMP and OPS, and on `stable-3_5_0`.
- Four files on the computer: two BMP pictures ("photo.bmp" and
  "drawing.bmp"), a text file renamed "notes.png", and a small PNG
  picture ("photo.png").

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Setup" › "Navigation".
3. Under "Navigation Menu Items", press "Add item".
4. In "Navigation Menu Type", choose "Custom Page".
5. Type "u09ir10 Pictures" in "Title" and "u09ir10-pictures" in "Path".
6. Drag "photo.bmp" from the computer and drop it into the "Content"
   box.
7. Read the notice over the box.
8. Drop "notes.png" into the box the same way, and read the notice.
9. Drop "photo.png" into the box the same way.
10. Copy "drawing.bmp" and paste it into the box (Ctrl+V or Cmd+V),
    and read the notice.
11. Press "Save".
12. Open the page at `/index.php/publicknowledge/u09ir10-pictures`.
13. Look at each picture's address (right-click › "Copy image
    address").

**Expected**: after steps 7, 8 and 10 the refused file is gone from the
box. The saved page shows only "photo.png", stored as a file under
`/public/site/images/rvaca/`.

**Observed**: the notices read "Failed to upload image: You can only
upload the following types of files: gif, jpg, png, webp." (step 7) and
"Failed to upload image: The image you uploaded is not valid." (step
8). The uploads answer:

```
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
→ 400 {"error":"You can only upload the following types of files: gif, jpg, png, webp."}
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
→ 400 {"error":"The image you uploaded is not valid."}
```

Both files stay in the box. Step 8 sends the BMP again, and step 9
sends both refused files again, each refusal repeating its notice.
The pasted "drawing.bmp" gets the same notice as the dropped BMP and
stays the same way. "Save" succeeds, and the page shows the two BMP
pictures, "photo.png" and a broken picture. The addresses read:

```
data:image/png;base64,VGhlc2Ug…   ("notes.png", drawn as a broken picture)
/public/site/images/rvaca/mceclip2.png
data:image/bmp;base64,Qk024QAA…   ("photo.bmp", 76 894 characters in the page's text)
data:image/bmp;base64,Qk1GpAAA…   ("drawing.bmp", 56 094 characters)
```

The same BMP chosen through "Insert/edit image" › "Upload" › "Browse
for an image" gets the same refusal in a small window, and nothing is
inserted.

## Cause

pkp has two TinyMCE upload handlers. `images_upload_handler` in
`lib/pkp/js/controllers/SiteHandler.js` serves every legacy formatted
text box. Its twin in ui-library, in `FieldRichTextarea.vue`'s
`compiledInit()`, serves every Vue form's rich text field. When the
site refuses a picture, both reject with the message alone, as a
string: `reject(r.responseJSON.error)` (SiteHandler.js line 203,
FieldRichTextarea.vue line 260).

TinyMCE puts a dropped or pasted picture into the text at once, under a
`blob:` address, and then calls the handler; paste and drop take the
same path (`pasteImageData()`). `Uploader.uploadBlobInfo()` turns a
string rejection into `{message}`. `EditorUpload.uploadImages()` takes
the picture out only when the failure carries `remove: true`;
otherwise it shows "Failed to upload image: {message}" and leaves it.
The editor's `GetContent` handler (`replaceBlobUris()`) writes a `blob:`
picture it still holds as `data:<type>;base64,…`, so the form posts the
picture inside the text. The failure also clears the picture's upload
state, so the next upload pass, which any later picture starts, sends
it again.

TinyMCE's way to drop a refused picture is that `remove` flag: an
option of the `failure` callback since TinyMCE 5.5.0, and a field of
the rejection since 6.0, when the handler became a Promise. The handler
came in with pasted pictures in `pkp/pkp-lib#4890` (a09aa46d19,
2019-10-31), on TinyMCE 4, whose failure callback had no such option.
`pkp/pkp-lib#11001` rewrote both handlers as Promises for TinyMCE 7
(pkp-lib
[cbe444aafb](https://github.com/pkp/pkp-lib/commit/cbe444aafb617fe709049dcbb50489a9f8bde1d5),
ui-library
[e77417b99](https://github.com/pkp/ui-library/commit/e77417b997debe71b6216f8fe6f871eb0fa2a7c0))
and kept the string.

Reach:

- Legacy boxes: the TinyMCE plugin gives every back-office page the
  upload address, so every legacy box takes dropped and pasted
  pictures: the custom page item window (walked), the custom block and
  static page windows, a reviewer's comment boxes
  (`reviewer/review/step3.tpl`) and the profile's biography
  (`user/publicProfileForm.tpl`) (code). The upload address admits
  every signed-in role.
- Vue forms: `FieldRichTextarea` in every form with an upload address.
  "Appearance" › "Setup" › "Page Footer" was walked: a dropped BMP is
  refused and stays, the same way. The masthead, information, privacy
  and announcement forms use the same field (code).
- The refusals: a type the site does not take (walked, BMP), a file
  that is not a picture (walked), a picture whose content does not
  match its name, and the user's allowance used up (code: 400 and 413
  answers with an `error` message, through the same rejection).
- An answer that is not JSON: a network failure, a proxy's or web
  server's own error page (a 413 for a large picture), or PHP warnings
  printed before the JSON. `r.responseJSON` is then undefined, and the
  `error` callback throws "Cannot read properties of undefined (reading
  'error')" before it rejects (seen on OJS `main` in the sibling report
  linked in Evidence). The page's script fails, the handler's Promise
  never settles, and the picture stays without any notice, saved
  embedded. Walked with a proxy's HTML "413 Request Entity Too Large"
  page handed to the browser as the upload's answer: no notice, that
  script error, and the box's text holds the picture as
  `data:image/png;base64,…`.
- "Insert/edit image" › "Upload" goes through the same handler, but the
  image window reads the failure's `message` itself and inserts nothing
  (walked, with and without the fix).

## Proposed fix

In both handlers, reject with TinyMCE's failure object, `remove: true`,
and a message that is there even when the answer is not JSON
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
+++ b/lib/pkp/js/controllers/SiteHandler.js
 							error: function(r) {
-								reject(r.responseJSON.error);
+								// remove: true takes the refused picture out of the text, so it
+								// is never saved embedded; an answer without JSON still settles
+								reject({
+									message: (r.responseJSON && r.responseJSON.error) ||
+											pkp.localeKeys['common.unknownError'],
+									remove: true
+								});
 							}
--- a/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
 							error(r) {
-								reject(r.responseJSON.error);
+								// remove: true takes the refused picture out of the text, so it
+								// is never saved embedded; an answer without JSON still settles
+								reject({
+									message:
+										r?.responseJSON?.error || self.t('common.unknownError'),
+									remove: true,
+								});
 							},
```

The fallback follows ui-library's `ajaxError` mixin, which falls back to
`common.unknownError` ("An unexpected error has occurred. Please reload
the page and try again.") when an answer carries no message; the key is
among the back office's `pkp.localeKeys`. TinyMCE reads `message` from
the object, so the notice text is unchanged for a refusal.

Tried on `main` on the three apps. With the fix, the two BMPs and
"notes.png" get the same notices, leave nothing in the box and are not
sent again, and the saved page holds only "photo.png". A BMP dropped
into "Page Footer" is gone after its notice too. The upload answered
with the HTML 413 page now shows "Failed to upload image: An unexpected
error has occurred. Please reload the page and try again.", the picture
is removed, and the page's script no longer fails. The picture window's
refusal still reads "You can only upload the following types of files:
gif, jpg, png, webp." and inserts nothing, and "photo.png" is stored
and kept.

**Alternatives**

- Remove the picture only on a refusal (an answer with a JSON message)
  and keep it on any other failure, so that TinyMCE's next pass retries
  it. A picture kept is saved embedded when the manager saves before a
  retry succeeds, which is this fault again.
- Limit `images_file_types` to the types the site takes. TinyMCE would
  ignore a dropped BMP without a word, and the other refusals would
  stay as they are.
- Strip `data:` pictures from texts when they are saved. That decides
  what a manager may put in on purpose through "Source code", a product
  question, and the box would still show a picture that vanishes on
  save.

**What goes with it**

- Every instance: these are the only two `images_upload_handler`s in
  pkp-lib, ui-library and the three apps.
- What it touches: only a failed upload. A plugin that sets its own
  handler through the TinyMCE plugin's `tinymceParams` keeps it. No
  repair of stored texts: an embedded picture is visible and can be
  deleted, and nothing tells a refused one from one put in on purpose.
- Backport: `stable-3_5_0` has the same lines (SiteHandler.js line 197,
  FieldRichTextarea.vue line 248), and the diff applies as written (not
  tried there). 3.4 runs TinyMCE 5, whose `failure` callback takes the
  flag as its second argument:
  `failure((r.responseJSON && r.responseJSON.errorMessage) || …, {remove: true})`.
  3.3 runs TinyMCE 4.9, whose `failure` takes the message only, so a
  backport there would have to delete the picture from the editor
  itself.
- Guard: the e2e scenario for spec U09's A17 (a **Planned** item): a
  BMP dropped into a "Content" box leaves the box empty after its
  notice.

Medium: a few lines, but in two repositories, pkp-lib and ui-library.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/walk.js),
  with its helpers in `lib.js` beside it. The same script holds the
  neighbour checks ("Insert/edit image" › "Upload" with the BMP, a BMP
  dropped into "Appearance" › "Setup" › "Page Footer", and an upload
  answered with a proxy's HTML 413 page), walked with the fix in and
  out. On an install freshly loaded from the default dataset, from a
  pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/refused-pasted-picture-kept-embedded/fix.diff ojs omp ops`.
- The drag and the paste are fired as the browser's own events: the
  script dispatches `dragenter`, `dragover` and `drop`, or `paste`, on
  the box with the file in the event's `DataTransfer`, as a drag from
  the file manager or a pasted copied file does. Whether a given
  system's file manager puts a copied file on the clipboard in a form
  the browser pastes as a file was not checked; TinyMCE takes paste and
  drop through the same `pasteImageData()`. The 413 answer in the
  neighbour check is handed to the browser by the script for that one
  upload; the server is not asked.
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL
  in Chromium; the fault is in the browser and does not touch the
  database. Datasets: pkp/datasets c657990 (2026-10-01).
- Code reads. `main` and 3.5: the two handlers; TinyMCE 7.9.3 as each
  app ships it (`lib/pkp/lib/vendor/tinymce/tinymce` for the legacy
  boxes, `tinymce` in ui-library's build): `Uploader.uploadBlobInfo()`,
  `EditorUpload.uploadImages()`, `replaceBlobUris()`, the paste and drop
  handlers and the image window's `uploadImage()`;
  `PKPUploadPublicFileController::uploadFile()` for the refusals and
  their answers; `TinyMCEPlugin::registerJS()` for the upload address;
  `registry/uiLocaleKeysBackend.json` for `common.unknownError`. 3.4
  (`origin/stable-3_4_0`): SiteHandler.js line 187 and
  FieldRichTextarea.vue line 234, `failure(r.responseJSON.errorMessage)`
  with no options, on TinyMCE `^5.7` (pkp-lib) and `^5.10.0`
  (ui-library); TinyMCE 5.10.9's source (unpkg) reads
  `failure(error, options)` and removes the picture on
  `uploadInfo.error.options.remove`. 3.3 (`origin/stable-3_3_0`): the
  same lines 187 and 228, on TinyMCE 4; 4.9.11's source has
  `failure(error)` only and writes a kept picture as `data:` on save.
- Introduced: `git blame` on SiteHandler.js line 203 gives cbe444aafb;
  the line before it came from a09aa46d19, through 63a9dbe103 (lint
  only). ui-library's line comes from e77417b99 over 0d4e01fc2
  (`pkp/pkp-lib#4890`).
- The sibling report on an answer that is not JSON:
  [U09-A18-picture-over-request-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-request-limit-server-error.md).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "Failed to
  upload image", pasted image base64, `images_upload_handler`,
  `uploadPublicFile` tinymce, tinymce image upload error. Read and not
  the same fault: `pkp/pkp-lib#11001` (uploads failing outright on
  TinyMCE 7), `pkp/pkp-lib#10578` (no upload at site level),
  `pkp/pkp-lib#6824` (overwritten public pictures).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a and ui-library
  64d67363; OMP `main` 3b0ecf794 and OPS `main` c8af945bb7, both with
  lib/pkp 3dc90c81a6 and ui-library 280f98c5. `stable-3_5_0` OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e and OPS 8eaf899468
  with lib/pkp 1fb843f491; ui-library d4e01883 in all three.
  `stable-3_4_0` lib/pkp 32b0f4b4af, ui-library ee684b34 (OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b); `stable-3_3_0` lib/pkp
  f6ab331645, ui-library 96959f9e (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161).
