# A picture over the server's file size limit, uploaded in a text editor, fails with "Path cannot be empty"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (read in the code)
  - 3.3: OJS, OMP, OPS (read in the code; on PHP 7 the message is "The image you uploaded is not valid." instead of the server error)
- **Introduced** `pkp/pkp-lib#5237` for `pkp/pkp-lib#4890` · [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) · 2019-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18)
- **Checked** 2026-09-30

## Summary

Someone uploads a picture into a formatted text box ("Insert/edit
image" › "Upload"), for example a custom block's "Content", and the
picture is larger than the server accepts for one file. That limit is
2 MB on PHP's shipped settings, less than many phone photos. The app
fails on the server, and the error message over the "Insert/Edit Image"
window reads "Path cannot be empty" for a PNG, JPEG or GIF, or "One or
more files could not be uploaded." for a WebP. The app's own message
for this case, "Files larger than 2MB can not be uploaded." (naming the
server's actual limit), never shows.

The picture is refused either way, and rightly so: the fix changes only
the message, so that the uploader learns the picture is too large and
what the limit is. Today the way round, shrinking the picture, has to be
guessed.

Every formatted text box with a picture button uploads this way: a
manager's custom blocks, static pages, navigation menu custom pages,
settings forms and announcements, any user's "Bio Statement" on their
profile, and a reviewer's review comments.

## Impact

- **Lost.** Nothing: no work, and no picture that would otherwise have
  been stored. The server logs an error.
- **Who.** Anyone uploading a picture over the limit into one of those
  boxes, on a server that keeps PHP's shipped 2 MB `upload_max_filesize`
  (PHP's own default and the value in the `php.ini` files PHP ships;
  PKP's installer only reports it, "Your server currently allows a
  maximum file upload size of: …", and asks nobody to raise it). Hosts
  that raise it see the same at their own limit.
- **Way round.** Shrink the picture and upload it again.

Low: the outcome is right (a picture over the limit cannot be stored)
and nothing is lost; what is wrong is the message, behind a server
error. It would be medium if the uploader had no way to find the reason,
but a smaller picture goes through.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`), with
  PHP's shipped upload limits: `upload_max_filesize = 2M`,
  `post_max_size = 8M`. The steps are the same in OJS, OMP and OPS.
- The public files directory holds a `site/` folder (`public/site/`),
  which the installer makes. The dataset's `public/` holds only
  `index.html`, so an install whose `public/` was emptied before loading
  it (pkp/datasets' `wipe.sh`, then `loadfiles.sh`) lacks the folder:
  create it (`mkdir public/site`). Without it every picture upload
  answers "The public files directory was not found or files can not be
  saved to it.".
- Two pictures larger than 2 MB and smaller than 8 MB:
  "photo-u09a18.png" (a PNG of 2.5 MB) and "photo-u09a18.webp" (a WebP
  of 3.5 MB).
- The dataset leaves "Custom Block Manager" unticked, so step 3 turns it
  on. Any other formatted text box with a picture button would serve
  instead of steps 2 to 4.

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
6. Press "Browse for an image" and choose "photo-u09a18.png".
7. Press "OK" on the error message, then "Cancel" in the "Insert/Edit
   Image" window.
8. Repeat steps 5 to 7 with "photo-u09a18.webp".

**Expected.** For each picture the error message reads "Files larger
than 2MB can not be uploaded." and nothing is inserted.

**Observed.** For the PNG the error message reads "Path cannot be
empty". The upload answers HTTP 500:

```
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
500 {"error":"Path cannot be empty"}
```

The server log:

```
production.ERROR: Path cannot be empty {"exception":"[object] (ValueError(code: 0): Path cannot be empty at …/lib/pkp/api/v1/_uploadPublicFile/PKPUploadPublicFileController.php:185)
#0 …/lib/pkp/api/v1/_uploadPublicFile/PKPUploadPublicFileController.php(185): getimagesize()
```

For the WebP the error message reads "One or more files could not be
uploaded."; the upload answers 400 with that message. Nothing is
inserted in either case.

A picture under 2 MB is uploaded and put into "Content", and a text
file named ".png" is refused with "The image you uploaded is not
valid.".

## Cause

`PKPUploadPublicFileController::uploadFile()`
([PKPUploadPublicFileController.php](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/api/v1/_uploadPublicFile/PKPUploadPublicFileController.php#L104-L238))
never reads the upload's error code before using the file. When a file
is over `upload_max_filesize`, PHP still fills `$_FILES['file']`, with
the file's name, the error `UPLOAD_ERR_INI_SIZE`, a size of 0 and an
empty temporary name. The method goes on as if the file had arrived:
the check against the user's public directory quota passes (size 0),
the file extension check passes, and for a GIF, JPEG or PNG it calls
`getimagesize($_FILES['file']['tmp_name'])` (line 185) with an empty
string. PHP 8 throws `ValueError` "Path cannot be empty" there, and the
API's exception handler answers 500 with that message.

A WebP skips the picture checks and reaches `uploadFile('file', …)`,
which fails because there is no temporary file. The error branch then
asks `uploadError($filename)` and `getUploadErrorCode($filename)`
(lines 203-204) about the cleaned file name ("photo-u09a18.webp")
instead of the form field `file`, which is what
`FileManager::uploadError()` expects. `$_FILES` has no such key, so the
switch holding `api.files.400.fileSize` is skipped and the generic
`api.files.400.uploadFailed` answers.

Both came with the endpoint in a09aa46d19, which added picture uploads
to the rich text fields: its error switch was meant for this case but
could never be reached. Under PHP 7, `getimagesize('')` returned false
with a warning, so a GIF, JPEG or PNG got "The image you uploaded is not
valid."; since PHP 8 it is the server error.

The size the message names follows the server: `api.files.400.fileSize`
is "Files larger than {$maxSize} can not be uploaded.", filled from
`Application::getReadableMaxFileSize()`, which reads
`ini_get('upload_max_filesize')` (`UPLOAD_MAX_FILESIZE`).

A picture over `post_max_size` (8 MB on PHP's shipped settings) fails
before this method runs, with a 500 and "The POST data is too large.";
that case has its own cause, reported in
[pkp-e2e#43](https://github.com/jardakotesovec/pkp-e2e/issues/43).

Reach, read in the code:

- The legacy editor (`lib/pkp/js/controllers/SiteHandler.js`) puts
  `image` in all three of its toolbars and sends pictures to this
  endpoint whenever the TinyMCE plugin gives it an `uploadUrl`, which it
  always does. So every legacy rich text box has the picture button:
  custom blocks, static pages, navigation menu custom pages, a user's
  "Bio Statement" on the profile page (`publicProfileForm.tpl`), a
  reviewer's comments (`reviewer/review/step3.tpl`) and the editors'
  and managers' email and settings windows. The endpoint admits every
  role, reader and author included.
- The Vue editor (`FieldRichTextarea.vue` in ui-library) posts to the
  same endpoint in the forms that give it an `uploadUrl`, all of them
  managers' (masthead, information, privacy, appearance, announcements).
- The site's own boxes post to `/index.php/index/api/v1/_uploadPublicFile`,
  the same code.
- The other upload endpoints are not affected:
  `PKPSubmissionFileController::add()` and `PKPJatsController` read
  `$_FILES['file']['error']` first, and `PKPTemporaryFilesController`
  asks `uploadError()` with the right field name
  (`getFirstUploadedPostName()`). No other caller of `uploadError()` or
  `getUploadErrorCode()` exists in the three apps or pkp-lib, and the
  other `getimagesize()` calls read files already stored.

## Proposed fix

Read the upload's error code right after the check that a file was
sent, and answer with the shared helper, as
`PKPSubmissionFileController::add()` and `PKPJatsController` do on
`main`; the switch after `uploadFile()`, which can no longer be reached,
is removed
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/fix.diff)):

```diff
@@ public function uploadFile(Request $illuminateRequest): JsonResponse
             ], Response::HTTP_BAD_REQUEST);
         }
 
+        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
+            return $this->getUploadErrorResponse($_FILES['file']['error']);
+        }
+
         $siteDir = Core::getBaseDir() . '/' . Config::getVar('files', 'public_files_dir') . '/site';
@@
         if ($success === false) {
-            if ($fileManager->uploadError($filename)) {
-                switch ($fileManager->getUploadErrorCode($filename)) {
-                    … four branches covering seven UPLOAD_ERR_* constants …
-                }
-            }
-
             return response()->json([
                 'error' => __('api.files.400.uploadFailed'),
             ], Response::HTTP_BAD_REQUEST);
```

`PKPBaseController::getUploadErrorResponse()` holds the same switch:
four branches over seven `UPLOAD_ERR_*` constants, with
`api.files.400.fileSize` for `UPLOAD_ERR_INI_SIZE` and
`UPLOAD_ERR_FORM_SIZE`. So every refused upload gets the message the
original switch meant, before any check that needs the file.

Tried on `main` in OJS, OMP and OPS: with the fix in, both pictures got
"Files larger than 2MB can not be uploaded." (400) and nothing was
inserted. The small PNG and the text file named ".png" in Observed gave
the same results with the fix in as without it.

**Alternatives**

- Passing `'file'` to `uploadError()` and `getUploadErrorCode()` alone:
  fixes the WebP but leaves `getimagesize('')` failing for the other
  pictures.
- A size check in the two editors' upload handlers (legacy JavaScript
  and ui-library): two more places, and the API still fails for any
  other client.

**What goes with it**

- No stored data needs repair. API clients get 400 with the size
  message instead of 500; nothing else changes.
- Backport to 3.5: the diff applies to `stable-3_5_0` as it stands, but
  there `getUploadErrorResponse()` is still private to
  `PKPSubmissionFileController`. `PKPJatsController` (line 158) already
  calls it on 3.5, which fails the same way, and 03d30a627b
  (`pkp/pkp-lib#10405`, on `main` only) fixed that by moving it to
  `PKPBaseController`. Backport 03d30a627b whole, then this diff. 3.4
  and 3.3 have the same code in the Slim handler
  `PKPUploadPublicFileHandler`; a backport there writes the same early
  check in that handler's response style.
- Test: an e2e check in pkp-e2e's U09 that uploads a picture over
  `upload_max_filesize` and expects the size message.

Small: a few lines in one controller, following its sibling
controllers.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js)
  takes the Steps on a fresh load of the default dataset (creating
  `public/site/` as in the Preconditions, and making the picture files
  itself) and records each upload's status and answer, the error
  message and the server log; `neighbour` as its argument uploads the
  small PNG and the text file named ".png" instead:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js [neighbour]`
  (with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5). It also uploads a
  9 MB PNG, over `post_max_size`, not in the Steps (pkp-e2e#43's case).
- The fix was tried with `node bin/try-fix.js apply fix.diff ojs omp ops`,
  the script with and without `neighbour`, then
  `node bin/try-fix.js revert ojs omp ops`.
- Driven through the browser on PostgreSQL, PHP 8 with
  `upload_max_filesize = 2M` and `post_max_size = 8M`, on the default
  dataset from pkp/datasets 38ab955 (2026-09-30), `main` and
  `stable-3_5_0`, OJS, OMP and OPS. The database plays no part.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287),
    OMP [3b0ecf794c](https://github.com/pkp/omp/commit/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262),
    OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb747336cd2669dea9cc0ab8a0dbf70a2);
    pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12)
    (OJS) and
    [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a638238c2241f5d3086f93865cb943b8)
    (OMP, OPS), the same controller.
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17),
    OMP [3081c9b00d](https://github.com/pkp/omp/commit/3081c9b00ddde6f893df9995d455ed26c3e66eeb),
    OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd1b020b73ff061dbde9cea586207994);
    pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833),
    OMP [0aec65441f](https://github.com/pkp/omp/commit/0aec65441fcd8f283846f9e43a0c4afffa23cece),
    OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b26a97e5a32147e151ca339699cf96a);
    pkp-lib
    [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d147afc0d3b52c55b8cfb3857ed4747).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144),
    OMP [8e72fc8836](https://github.com/pkp/omp/commit/8e72fc88363e8fd997f830a75209718d62a8d9a2),
    OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161952b912635d2920d6b63f0cffeaf09);
    pkp-lib
    [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe764bffdbab8efe8d7aeb1e82db6072).
- Code read on 3.5: `uploadFile()` is the same as on `main`. On 3.4
  (`api/v1/_uploadPublicFile/PKPUploadPublicFileHandler.php`) and 3.3
  (`PKPUploadPublicFileHandler.inc.php`): the same order,
  `getimagesize()` on the temporary name before any error check, and
  `uploadError($filename)`; each app on both branches mounts the
  endpoint (`api/v1/_uploadPublicFile/index.php`). 3.4 runs on PHP 8
  only (composer platform 8.0.2); 3.3 also on PHP 7 (7.3.0), where
  `getimagesize('')` returns false.
- `public/site/`: pkp/datasets' `loadfiles.sh` copies the dataset's
  `public/*` over the install's `public/` without emptying it, so an
  existing install keeps the folder; `wipe.sh` empties `public/`.
  The installer makes it in `PKPInstall::createDirectories()`
  (`getCreateDirectories()`).
- Introduced: `git blame -w -M -C` on lines 185 and 203-204 leads
  through the Laravel move (71e79e31e3) to a09aa46d19, the endpoint's
  first version; the GitHub API lists `pkp/pkp-lib#5237` (merged
  2019-10-31) for it.
- Upstream: searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by the symptom's words ("Path cannot be empty", image
  upload size, "Files larger than", "Insert/edit image") and by
  `uploadPublicFile`, `PKPUploadPublicFileController`, `uploadError`,
  `UPLOAD_ERR_INI_SIZE` and `getimagesize`.
- Not driven: the Vue editor's boxes, static pages, navigation menu
  custom pages, the profile's "Bio Statement", a reviewer's comments
  and the site's boxes (read in the code); PHP 7; 3.4 and 3.3 (read in
  the code).
