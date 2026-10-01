# A picture dropped or pasted into a text box stays in the text after the site refuses it, and is published

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5237` and `pkp/ui-library#49` for `pkp/pkp-lib#4890` · [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a), [0d4e01fc29](https://github.com/pkp/ui-library/commit/0d4e01fc29a5ccdfb1b9dba58be03e37ceb7c417) · 2019-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A17](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a17)
- **Checked** 2026-10-01

## Summary

Someone drops or pastes a picture into a formatted text box, for
example a manager into a custom block's "Content" or the website's
"Page Footer", and the site refuses the upload with "Failed to upload
image: {reason}". The picture stays in the box all the same, its data
written into the text instead of stored as a file, and "Save" publishes
it that way.

A typical case is a photo over the server's 2 MB file limit: it shows
normally on the public pages, but its data travels inside every page
that carries the box. A 2.5 MB photo in "Page Footer" made every public
page about 3.4 MB of HTML. A refused file that is not a picture shows as
a broken picture.

The way round is to delete the picture by hand before "Save", but after
the failure notice nothing tells the user that the picture still in the
box will be saved. In boxes that cannot upload pictures at all, such as
the license terms, a dropped picture is saved as an address that works
only in the browser tab it was dropped in, so it shows for no one.

## Impact

- **Lost.** Nothing the user made. The public pages carry a picture the
  site refused: several megabytes of extra HTML on every page view for
  an oversized photo, a broken picture for a file that is not one.
- **Who.** Mostly managers, in the boxes that reach public pages:
  custom blocks, static pages, custom pages, "Page Footer" and the
  other website settings, announcements. Any signed-in user can do the
  same in their profile's "Bio Statement", and a reviewer in review
  comments, which only editors and authors read.
- **Way round.** Delete the picture from the box after the notice,
  before "Save".

Medium: the refusal says the upload failed while the picture stays and
is published, and an oversized photo weighs down every public page
until someone notices; there is a way round on screen. It would be high
if the picture could not be taken out again.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), with
  PHP's shipped upload limit, `upload_max_filesize = 2M`. The steps are
  the same in OJS, OMP and OPS.
- Three files on the computer: "photo-u09a17.png" (a PNG photo of
  2.5 MB, 1100 x 800 pixels), "diagram-u09a17.bmp" (a BMP picture; the
  site takes gif, jpg, png and webp) and "notes-u09a17.png" (a text
  file named ".png"). For step 11, any PNG under 2 MB.
- The dataset leaves "Custom Block Manager" unticked, so step 2 turns it
  on.

In a custom block:

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins", and under "Generic Plugins" tick "Custom Block Manager".
3. Press the arrow on its row, then "Manage Custom Blocks", then "Add
   Block".
4. In "Block Name" type "Pictures u09a17".
5. Drag "diagram-u09a17.bmp" from the computer's file browser and drop
   it into "Content".
6. Drop "notes-u09a17.png" into "Content".
7. Press "Save".
8. Open the tab "Appearance", then "Setup". Under "Sidebar" tick
   "pictures-u09a17 (Custom Block)" and press "Save".

In "Page Footer":

9. On the same tab, drop "photo-u09a17.png" into "Page Footer" and
   press "Save".
10. Open the home page (`/index.php/publicknowledge/en`).

In a box without picture uploads:

11. Open Settings › Distribution, tab "License", drop a PNG into
    "License Terms" and press "Save".

**Expected.** Each refused file is gone from the box once its notice
shows, as when the same file is refused through "Insert/edit image" ›
"Upload". The saved block and footer hold no picture, and the home
page shows none. In "License Terms" the dropped picture is either
uploaded or not taken in.

**Observed.** Each drop in steps 5, 6 and 9 shows a notice at the top
of the box:

```
Failed to upload image: You can only upload the following types of files: gif, jpg, png, webp.   (400)
Failed to upload image: The image you uploaded is not valid.   (400)
Failed to upload image: Path cannot be empty   (500)
```

The last is the size refusal, which answers with a server error of its
own ([U09-A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-upload-limit-server-error.md)).
Every file stays in its box, and "Save" stores it inside the text,
with nothing under `public/site/images/`:

```
<p><img src="data:image/png;base64,VGhlc2UgYXJlIG5vdGVzLCBub3QgYSBwaWN0dXJlLgo="><img src="data:image/bmp;base64,Qk22cAAA…"></p>
```

The footer setting holds 3,521,725 characters. On the home page the
sidebar block "Pictures u09a17" shows a broken picture and the BMP, the
footer shows the photo, and the page's HTML is about 3.4 MB. At step 6
the BMP is sent and refused again, so both notices show.

At step 11 no upload is sent and no notice shows; "License Terms" is
saved as `<p><img src="blob:http://…/0b13d429-…"></p>`, an address that
exists only in that browser tab.

A PNG under 2 MB dropped into "Content" or "Page Footer" is stored and
keeps its stored address (`/public/site/images/rvaca/mceclip0.png`).

## Cause

Both editors hand pictures to TinyMCE's `images_upload_handler`, and
both answer a refusal with the server's message alone:

- the legacy forms, `SiteHandler::initializeTinyMCE()` in
  [lib/pkp/js/controllers/SiteHandler.js](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/js/controllers/SiteHandler.js#L184-L208)
  (line 203);
- the Vue forms,
  [FieldRichTextarea.vue](https://github.com/pkp/ui-library/blob/280f98c5703024a8de7694642dfa860eaa293e1a/src/components/Form/fields/FieldRichTextarea.vue#L243-L263)
  in ui-library (line 260).

```js
error: function(r) {
	reject(r.responseJSON.error);
}
```

With `paste_data_images` on, TinyMCE puts a dropped or pasted picture
into the text at once, as a `blob:` address, and then uploads it
(`EditorUpload.uploadImages()`). On success it swaps in the stored
address. On a failure it shows "Failed to upload image: {message}" and
takes the picture out only when the rejection carries `remove: true`,
the option TinyMCE provides for this (since TinyMCE 5.5.0). Given a
plain message, it leaves the picture in the text, and `getContent()`
writes its `blob:` address out as a `data:` address, so "Save" stores
the file's data in the text. TinyMCE also sends every picture still
held as a `blob:` address with the next upload, so a refused one is
refused again each time.

Both handlers date from a09aa46d19 and 0d4e01fc29, written for TinyMCE
4, which had no such option.

The Vue field has a second gap: it sets `paste_data_images: true` and
the handler whether or not its form passes an `uploadUrl`, whereas the
legacy editor sets both only when the TinyMCE plugin gives it an upload
address. In a form without one, the handler posts with no address, so
jQuery sends the picture to the current page, which answers 200 with
HTML (seen in the server log at step 11); `resolve(r.url)` resolves
with nothing, and the picture keeps its `blob:` address, which is
saved.

Reach, in the code:

- Paste and drop share TinyMCE's `pasteImageData()`, so a pasted picture
  is kept the same way (the Steps use drop).
- Every refusal of `PKPUploadPublicFileController::uploadFile()` answers
  JSON with an `error` message (ten messages, from no file sent to the
  user's 5000 KB of stored pictures), and so do the server errors for a
  file over PHP's limits (A18, and
  [pkp-e2e#43](https://github.com/jardakotesovec/pkp-e2e/issues/43)
  over `post_max_size`). An answer that is not JSON (a proxy's 413 page,
  a dropped connection) makes the `error` callback throw on
  `r.responseJSON.error`, so the promise never settles and the picture
  stays too.
- The legacy editor gets the upload address on every back-office page,
  so every legacy box is reached: custom blocks, static pages, custom
  pages, a profile's "Bio Statement", review comments, the email and
  settings windows. The Vue editor uploads in the forms that pass an
  `uploadUrl` (masthead, information, privacy, appearance setup and
  advanced, announcements); in the others (the license terms, a
  submission's abstract, a contributor's bio, among about fifteen
  forms) a dropped picture keeps its `blob:` address instead.
- A picture refused in "Insert/edit image" › "Upload" is not reached:
  that tab inserts nothing until the upload succeeds (seen on screen).
- Stored content may hold such `data:` pictures since 2019. A manager
  can also put one there on purpose through "Source code", and the two
  cannot be told apart, so no clean-up is proposed.

## Proposed fix

In both handlers, reject with TinyMCE's error object and `remove:
true`, with a fallback message for an answer that is not JSON; and in
the Vue field, set `paste_data_images` only when the form passes an
`uploadUrl`, as the legacy editor does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dropped-picture-refused-stays-embedded/fix.diff)):

```diff
--- a/lib/pkp/js/controllers/SiteHandler.js
+++ b/lib/pkp/js/controllers/SiteHandler.js
 							error: function(r) {
-								reject(r.responseJSON.error);
+								reject({
+									message: (r.responseJSON && r.responseJSON.error) ||
+											r.status + ' ' + r.statusText,
+									remove: true
+								});
 							}
--- a/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
+++ b/lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue
-				paste_data_images: true,
+				paste_data_images: !!this.uploadUrl,
@@
 							error(r) {
-								reject(r.responseJSON.error);
+								reject({
+									message: r.responseJSON?.error || `${r.status} ${r.statusText}`,
+									remove: true,
+								});
 							},
```

With `remove: true` TinyMCE shows the same notice, takes the picture
out of the text, swaps its address in the undo history for a
transparent placeholder, and stops sending it again. Without
`paste_data_images`, a picture dropped into a box that cannot upload is
not taken in.

Tried on `main` in OJS, OMP and OPS: with the fix in, each refused file
left the box after its notice, the block and the footer were saved
without a picture, the home page showed none (8 to 19 KB of HTML), and
a PNG dropped into "License Terms" was not taken in and nothing was
saved. A PNG under
2 MB dropped into "Content" or "Page Footer" was still stored and kept,
and a text file chosen through "Upload" was still refused with nothing
inserted, as without the fix. The non-JSON fallback was not reached.

**Alternatives**

- Stripping `data:` pictures on save, on the server: also removes
  pictures put in on purpose through "Source code", and the user still
  sees a picture in the box that will not be kept.
- Turning `paste_data_images` off everywhere: dropped and pasted
  pictures would no longer be uploaded where they can be.

**What goes with it**

- Backport: on 3.5 the diff applies as it stands; its legacy editor
  runs TinyMCE 7.9.3 (composer) and the Vue one 7.7.1 (npm), both with
  the option. 3.4 (TinyMCE 5.10.9) uses the callback API,
  `failure(r.responseJSON.errorMessage)`, so the backport there is
  `failure(..., {remove: true})`. 3.3 runs TinyMCE 4.9.11, which has no
  such option; a fix there would remove the picture in the handler.
- Test: an end-to-end check that drops a refused file and expects the
  box empty after the notice.

Medium: one change in pkp-lib and one in ui-library, so each of OJS, OMP
and OPS takes both submodule updates and commits a rebuilt
`js/pkp.min.js`, plus the test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/dropped-picture-refused-stays-embedded/walk.js)
  takes the Steps on a fresh load of the default dataset and records
  each upload's status and answer, the notice, what each box holds, the
  stored content and the home page's pictures and size. A drop is the
  browser's own `drop` event with the file in its `DataTransfer`, as a
  file dragged from the computer arrives:
  `node bin/probe.js all shared/playwright/checks/issues/dropped-picture-refused-stays-embedded/walk.js [neighbour|nourl]`
  (`nourl` is step 11; `neighbour` the PNG under 2 MB and the "Upload"
  tab).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs omp ops`
  and the script, then reverted.
- Driven through the browser on PostgreSQL, PHP 8 with
  `upload_max_filesize = 2M`, on the default dataset from pkp/datasets
  38ab955 (2026-09-30), `main` and `stable-3_5_0`, OJS, OMP and OPS. An
  installer-made install has `public/site/`; the walk creates it on its
  freshly loaded dataset. The database plays no part.
- Active content: TinyMCE takes in only `image/` types on its list
  (jpeg, jpg, jpe, jfi, jif, jfif, png, gif, bmp, webp; no SVG, no
  HTML), always as `<img src>`, and a picture in `<img>` runs no script.
  What lands in the text is no more than its author could type through
  "Source code" in the same box.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2);
    pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    (OJS) and
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (OMP, OPS), the same `SiteHandler.js`; ui-library
    [280f98c570](https://github.com/pkp/ui-library/commit/280f98c5703024a8de7694642dfa860eaa293e1a);
    TinyMCE 7.9.3 in both editors.
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994);
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1);
    ui-library
    [1a7a47504c](https://github.com/pkp/ui-library/commit/1a7a47504c4f8b78f423cdfd16c55c0fcf01caca).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a);
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747);
    ui-library
    [ee684b341b](https://github.com/pkp/ui-library/commit/ee684b341bacfcdd330b95073394a1fbf34a1f4f).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09);
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072);
    ui-library
    [96959f9ed4](https://github.com/pkp/ui-library/commit/96959f9ed4e7357c0eede0179add0e9728e1f708).
- Code read on 3.4 and 3.3: `js/controllers/SiteHandler.js` (pkp-lib)
  and `src/components/Form/fields/FieldRichTextarea.vue` (ui-library)
  set `paste_data_images: true` and answer a refusal with
  `failure(r.responseJSON.errorMessage)`; the TinyMCE versions are
  pkp-lib's `composer.lock` and the apps' and ui-library's
  `package.json`.
- TinyMCE 7.9.3 read in the composer and npm copies: `pasteImageData()`,
  `EditorUpload.uploadImages()` (removal only on
  `uploadInfo.error.remove`, `replaceUrlInUndoStack()` with
  `Env.transparentSrc`), the `GetContent` step turning a cached `blob:`
  address into `data:`, and the `images_file_types` default.
- Introduced: `git blame -w` on the `reject(...)` lines leads to
  cbe444aafb (pkp-lib) and e77417b997 (ui-library), `pkp/pkp-lib#11001`
  (2025-02-28, the move to TinyMCE's promise API, keeping the
  message-only rejection); their `failure(...)` predecessors and
  `paste_data_images` come from a09aa46d19 and 0d4e01fc29.
- Upstream: searched 2026-10-01 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by the symptom's words ("Failed to upload image",
  pasted image base64, tinymce paste image, embedded image, drop image
  tinymce, data uri image) and by `images_upload_handler` and
  `paste_data_images`. Nearest, not the same fault: `pkp/pkp-lib#8062`
  (unused uploaded files left on disk) and `pkp/pkp-lib#11001` (uploads
  failing outright in 3.5).
- Not driven: pasting, the boxes other than the three walked, and 3.4
  and 3.3.
