# A logo or image the server refuses leaves its upload box with a warning sign and no message

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; the refusal's message shows)
  - 3.3: none (code; the refusal's message shows)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U10 [A16](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a16)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager uploads a picture as the "Logo" in the website settings, and
the upload's request answers with a server error that carries a
message. The box shows none of it: the picture stays in the box with a
red warning sign under it and no text, and the form's foot reads
"Please correct one error." without saying what the error is.

Every upload box built the same way drops the message of every refusal
the server sends back: the context's logo, thumbnail, homepage image,
favicon and style sheet, the site's logo and style sheet, the images of
announcements, categories and highlights, and a publication's cover
image. A file of the wrong type is refused in the browser before it is
sent, and its message shows.

The refusal walked here takes a server whose PHP limits
`upload_max_filesize` and `post_max_size` are equal, and a picture of
exactly that size: the box's own size check lets it through and PHP
refuses the request.

## Impact

- **Lost**: nothing; the picture is not stored. "Upload File" and
  "Save" stay disabled afterwards (that part is
  [U10-A7-refused-upload-locks-box](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A7-refused-upload-locks-box.md)).
- **Who**: managers, in the boxes above, and editors setting a
  publication's cover image. The refusals that reach these boxes are a
  file over a PHP limit the box does not check, a request from a
  manager whose session has ended ("You are not authorized to access
  the requested resource."), a server that cannot store the file, and
  any server error (read in the code; only the first walked). Each is
  uncommon.
- **Way round**: a smaller picture goes in, but nothing on screen says
  that size is the problem; a manager whose session ended has to
  reload the page to find out.

"Crash server" here means the upload request answers 500 with a JSON
message ("The POST data is too large."); the box receives the message
and drops it. Effort small: one line in the upload box component that
every box above shares.

Low: nothing is lost, the failure itself shows (the warning sign, the
form's error), only its reason is missing, and the refusals that reach
the boxes are uncommon. A refusal most managers meet in ordinary use
would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- PHP with the two limits equal and errors kept out of the answer:
  `upload_max_filesize = 8M`, `post_max_size = 8M`,
  `display_errors = Off`. The walk used PHP's built-in server:
  `php -d upload_max_filesize=8M -d post_max_size=8M -d display_errors=Off -S …`.
  Behind nginx or Apache, that server's own request-body limit must be
  above 8M too (nginx's `client_max_body_size` is 1 MB by default).
  Otherwise it refuses the picture first with an error page that is
  not JSON, and the box shows that page's text instead.
- A PNG picture of exactly 8 MiB (8388608 bytes), named `logo.png`.

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the manager.
2. Open Settings › Website › "Appearance" › "Setup".
3. Under "Logo", press "Upload File" and choose `logo.png`.
4. Read the box and the form's foot.

**Expected**: the box says why the picture was not taken, in the
server's words, under the box; screen readers hear the same after "Go
to Logo:".

**Observed**: the picture is sent in full and the upload answers 500:

```
POST /index.php/publicknowledge/api/v1/temporaryFiles
→ 500 {"error":"The POST data is too large."}
```

The picture stays in the box's frame with a red warning sign under it
and no text. The form's foot reads "Please correct one error. Jump to
next error", and its line for screen readers reads "Go to Logo:" with
nothing after it. "Upload File" and "Save" are disabled. Nothing is
stored. The server log reads:

```
PHP Warning:  POST Content-Length of 8388801 bytes exceeds the limit of 8388608 bytes in Unknown on line 0
production.ERROR: The POST data is too large. {"exception":"[object] (Illuminate\\Http\\Exceptions\\PostTooLargeException(code: 0): The POST data is too large. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:24)
```

A ".pdf" chosen for "Logo" is refused in the box with its message,
"You can't upload files of this type.", since that refusal comes from
the browser, not the server.

## Cause

The upload boxes of the Vue forms read the server's message from a
property the REST API no longer sends.

pkp/ui-library `src/components/Form/fields/FieldUpload.vue`,
`onError()` (line 356), takes the message of a failed upload from
dropzone.js. A refusal made in the browser arrives as a string; an
answer from the API arrives as its parsed JSON, of which `onError()`
reads `message.errorMessage` alone (line 361). The API's answers carry
the message in `error`: `PKPTemporaryFilesController::uploadFile()`
(pkp-lib `api/v1/temporaryFiles/PKPTemporaryFilesController.php`, lines
97–134) answers `{"error": "<translated message>"}` for each of its
refusals, and `PKPExceptionHandler::render()` (pkp-lib
`classes/core/PKPExceptionHandler.php`, line 71) does the same for an
exception, here `{"error":"The POST data is too large."}`. So the field's
error list gets `undefined`, which `FieldError.vue` renders as its
warning icon with an empty line, and `FormErrors.vue` as "Go to Logo:"
with nothing after it.

Up to 3.4 the Slim handler answered through `APIResponse::withJsonError()`,
which sent both `error` (the locale key) and `errorMessage` (the
translated text), and the box showed the text (read in the code).
`pkp/pkp-lib#9176` moved
the API to Laravel's routing and rewrote the handler as
`PKPTemporaryFilesController`, answering `error` alone with the
translated text. The other readers of API errors in ui-library follow
the new shape (`Form.vue` line 492 and the `ajaxError` mixin read
`errorMessage || error`; `FileUploader.vue` and the media uploader use
`parseDropzoneError()`, which takes any property); `FieldUpload.vue`'s
`onError()`, unchanged since 2018 apart from its name (it was
`error()`), does not.

Reach:

- "Logo" walked on the three apps, `main` and `stable-3_5_0`.
- Checked in the code: `FieldUploadImage` extends `FieldUpload` and
  keeps its `onError()`, so every box built on either drops the
  message: the context's "Homepage Image", thumbnail (`journalThumbnail`,
  `pressThumbnail`, `serverThumbnail`), "Favicon" and style sheet; the
  site's logo and style sheet; a category's, a highlight's and an
  announcement's image; a publication's cover image (`IssueEntryForm`
  on OJS and OPS, `CatalogEntryForm` on OMP). An issue's own cover is
  set in the older issue form, which does not use `FieldUpload`.
- Checked in the code: every refusal of the temporary files endpoint
  reaches `onError()` as `{"error": …}`: its own ("Files larger than …
  can not be uploaded.", "One or more files could not be uploaded.",
  "No file to be uploaded could be found with the request.", "File
  could not be uploaded because of a server configuration error…"), the
  `has.user` middleware's 401 for a signed-out user, and a server
  error from `render()`. A wrong file type is refused by dropzone.js
  in the browser, as a string, and shows. A file that is not a real
  image is not checked at upload; it is stored on "Save".
- Not covered here: the box keeping the picture and disabling its
  "Upload File" and the tab's "Save" is
  [U10-A7-refused-upload-locks-box](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A7-refused-upload-locks-box.md);
  the request answering a server error rather than a refusal is
  [U09-A18-picture-over-request-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-request-limit-server-error.md);
  the box's size check letting this picture through is
  [U36-A21-exact-limit-file-passes-size-check-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A21-exact-limit-file-passes-size-check-then-refused.md).
  Fixing U09-A18 turns the 500 into a 413 that still carries its
  message in `error`, so the box still drops it; fixing U36-A21 moves
  this picture's refusal into the browser, but the other refusals above
  still reach the box.

## Proposed fix

In `FieldUpload.vue`, read the API's message with the helper the other
uploaders already share, `parseDropzoneError()` in
`src/composables/useDropzoneDragDrop.js`, which takes a string, an
`errorMessage`, or any other property of the answer
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-box-server-refusal-no-message/fix.diff)):

```diff
+import {parseDropzoneError} from '@/composables/useDropzoneDragDrop';
…
 		onError: function (file, message) {
-			let errors = this.errors.slice();
-			if (typeof message === 'string') {
-				errors.push(message);
-			} else if (typeof message === 'object') {
-				errors.push(message.errorMessage);
-			}
-			this.setErrors(errors);
+			this.setErrors([...this.errors, ...parseDropzoneError(message)]);
 		},
```

The fix belongs in the reader, since the API's `error` shape is the
one REST clients and the rest of ui-library now use.

Tried on `main` on the three apps: with the fix, the 8 MiB picture's
box reads "The POST data is too large." under the warning sign, and
screen readers get "Go to Logo: The POST data is too large.". With the
fix in and out, a ".pdf" chosen for "Logo" still reads "You can't
upload files of this type." and sends nothing, and a 1 MiB PNG still
uploads with no error and "Save" enabled.

**Alternatives**

- Send `errorMessage` again from the API: it would cover this box and
  break the API's single shape, which REST clients and the other
  readers now use.
- `message.errorMessage ?? message.error` in place: the same result
  here, but a second copy of the logic the shared helper holds.

**What goes with it**

- An answer of `{}` would leave the field with no error at all, where
  today it shows the empty warning line: `parseDropzoneError()`
  returns `[]` for it. No API path answering `{}` was found (the
  temporary files controller, the middleware and `render()` always set
  `error`), and an empty or non-JSON body reaches `onError()` as a
  string from dropzone.js. A fallback in the helper (dropzone's
  `dictResponseError`, or `common.unknownError`) when it finds no
  message would cover its three users; the helper's doc comment should
  also name the `{error}` shape, which today works only through its
  "any property" branch. Neither is in the diff.
- [U10-A7-refused-upload-locks-box](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U10-A7-refused-upload-locks-box.md)'s
  fix rewrites the same method. It replaces the field's errors with the
  refusal's message rather than adding to them, and still reads
  `message.errorMessage`. Merged with this one, its message line
  becomes `this.setErrors(parseDropzoneError(message));`.
- Backport: `stable-3_5_0`'s ui-library has the same `onError()` but no
  `parseDropzoneError()` (it came with `pkp/ui-library#794`, the media
  files work); there `message.errorMessage ?? message.error` is the
  change.
- Guard: a ui-library unit test of `onError()` with a string, an
  `{errorMessage}` and an `{error}` answer; or the e2e scenario of a
  refused upload in U10 (a **Planned** item).

Small: one line in one ui-library method, tried.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-box-server-refusal-no-message/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-box-server-refusal-no-message/lib.js)
  takes these Steps through a second `php -S` of the same install with
  both limits at 8M and `display_errors` Off:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/upload-box-server-refusal-no-message/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. `MODE=nb` is the
  neighbour check (a ".pdf" and a 1 MiB PNG chosen for "Logo"), walked
  with the fix in and out.
- Walked 2026-10-07 on OJS, OMP and OPS, `main` and `stable-3_5_0`,
  each on its default dataset (pkp/datasets 401a013, 2026-10-06), on
  PostgreSQL and PHP's built-in server; the fault does not touch the
  database. The same 500, empty warning line and screen-reader "Go to
  Logo:" on all six.
- Code reads. 3.5 has the Cause's code at the same lines, with
  `render()` as the anonymous handler in
  `PKPContainer::registerBaseBindings()`, and no `parseDropzoneError()`.
  For the Reach's refusals: the `HasUser` middleware, and
  `PKPContextService::_saveFileParam()` (no image check at upload). 3.4
  (`origin/stable-3_4_0`): the box's handler is `error()` (line 306)
  with the same `message.errorMessage`, and
  `PKPTemporaryFilesHandler::uploadFile()` (line 97) answers each
  refusal through `APIResponse::withJsonError()` (line 62), which sends
  `errorMessage`; with both limits at 8M, PHP drops the body and the
  handler answers 400 "No file to be uploaded could be found with the
  request.", which the box shows. 3.3 (`origin/stable-3_3_0`): the same
  (`FieldUpload.vue` line 314, `PKPTemporaryFilesHandler.inc.php` line
  78, `APIResponse.inc.php` line 25). Not walked on 3.4 and 3.3.
- Introduced: `git blame` puts `errors.push(message.errorMessage)` on
  7496b3c2 (2018); `git log --follow` and `git blame` on the
  controller's answers give 71e79e31e3.
- Upstream: pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library
  searched by the symptom's words and by `FieldUpload`,
  `parseDropzoneError` and `errorMessage`; `pkp/pkp-lib#5650` read, not
  the same fault (OPS 3.2, the logo upload never finishing).
- Not driven: the other boxes and refusals the Reach lists (code only),
  the `{}` answer, and a front web server (nginx, Apache).
- Tips:
  - **`main`:** OJS 92bc2bb467 (lib/pkp e60013c77f), OMP a0e6d0a8bc
    and OPS 7e34fdd57e (lib/pkp 5a5ab2d6c7); lib/ui-library a36dc7fe in
    each.
  - **`stable-3_5_0`:** OJS b8f5e9a951, OMP 7d6b00060a, OPS acc0de0586,
    lib/pkp 6d7f1540b6 and lib/ui-library 98ac8986 in each.
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 767353f4fe, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib ac3fa73402, ui-library 96959f9e.
