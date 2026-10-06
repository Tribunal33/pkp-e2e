# An upload larger than the server's request limit fails with a server error instead of the size limit

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS (the exact-limit submission file: OJS, OMP)
  - 3.5: OJS, OMP, OPS (the picture; the exact-limit file: OJS, OMP; no "Media" page)
  - 3.4: none (code; refused without a server error)
  - 3.3: none (code; refused without a server error)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18); spec U17 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a10); spec U47 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a4); spec U36 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a21) (the server error; the exact-limit file passing the size check is [U36-A21-exact-limit-file-passes-size-check-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A21-exact-limit-file-passes-size-check-then-refused.md)); pictures over the per-file limit but under this one are [U09-A18-picture-over-upload-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-upload-limit-server-error.md)
- **Checked** 2026-10-01 (the picture), 2026-10-02 (the other steps), each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager uploads a picture through "Insert/edit image" in a formatted
text box. When the upload is larger than the most the server accepts
in one request (PHP's `post_max_size`, 8 MB by default), the
application fails on the server. The editor's alert over the
"Insert/Edit Image" window reads "The POST data is too large.", in
English whatever the interface language.

The manager expects to be told the size limit, as the application does
for files over the per-file limit ("Files larger than 2MB can not be
uploaded."). The message gives no limit, and it reads as a fault of the
site rather than of the picture.

Two other uploads end in the same error and message. On a publication's
"Media" page, "Upload Media File" sends any file, so a figure or video
over the request limit fails on its card. In the submission wizard's
"Upload Files", a file the size check lets through, at exactly the
per-file limit, fails in its row when the server's two limits are
equal. An API address that matches no route, such as a non-numeric
section id, answers a server error from the same code.

## Impact

- **Lost**: no content; the upload fails and nothing is stored or
  inserted. The message does not say how large a file may be.
- **Who**: managers, and editors whose role may change settings,
  wherever a formatted text box has a picture button (custom pages,
  custom blocks, static pages, announcements, the masthead,
  information, privacy and appearance texts); editors and production
  staff adding a media file over the request limit; authors and
  editors submitting a file of exactly the per-file limit on a server
  whose two limits are equal. Each such upload fails, every time.
- **Way round**: a smaller file, or the server's administrator raises
  `post_max_size` (and `upload_max_filesize`), which for a video is the
  only realistic one.

Medium: uploads the screen offers fail with a server error and a
message without the limit, including a submission file inside the
limit the screen states and media files such as videos, which often
exceed PHP's default 8 MB; the files are refused, not lost.

## Steps to reproduce

**A picture over the request limit:**

Preconditions:

- PKP's default test dataset for `main`. The steps are the same in OJS,
  OMP and OPS, and on `stable-3_5_0`.
- The web server's PHP as `php.ini-production` ships it:
  `upload_max_filesize = 2M`, `post_max_size = 8M` and
  `display_errors = Off`. On a development install, serve the app with
  `php -d upload_max_filesize=2M -d post_max_size=8M -d display_errors=Off -S …`,
  or set the three lines in php.ini.
- A PNG picture larger than 8 MB (the walk used one of 9 MB).

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Setup" › "Navigation".
3. Under "Navigation Menu Items", press "Add item".
4. In "Navigation Menu Type", choose "Custom Page".
5. In the bar of the "Content" box, press "Insert/edit image". The
   window "Insert/Edit Image" opens.
6. On its "Upload" tab, press "Browse for an image" and choose the
   picture.
7. Read the alert that opens over the window.

**Expected**: the alert reads "Files larger than 2MB can not be
uploaded.", the message the application has for a file over the
server's limits, and nothing is inserted.

**Observed**: the alert reads "The POST data is too large.". The upload
answers 500:

```
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
→ 500 {"error":"The POST data is too large."}
```

The server log reads:

```
PHP Warning:  PHP Request Startup: POST Content-Length of 9183349 bytes exceeds the limit of 8388608 bytes in Unknown on line 0
production.ERROR: The POST data is too large. {"exception":"[object] (Illuminate\\Http\\Exceptions\\PostTooLargeException(code: 0): The POST data is too large. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:24)
```

On `stable-3_5_0` the second line is PHP's own form of the same
exception:

```
Illuminate\Http\Exceptions\PostTooLargeException: The POST data is too large. in …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:24
```

A 1 KB PNG goes in as usual, and a text file named ".png" gets "The
image you uploaded is not valid.".

**A media file over the request limit** (spec U47 A4):

Preconditions:

- PKP's default test dataset for `main`; OJS, OMP and OPS (3.5 has no
  "Media" page).
- The web server's PHP as in the picture's steps: `upload_max_filesize = 2M`,
  `post_max_size = 8M`, `display_errors = Off`.
- A PNG larger than 8 MB (the walk used one of 9 MB).

Steps:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), the editor.
2. Open submission 5, "Genetic transformation of forest trees" (OMP: 4,
   "How Canadians Communicate: Contexts of Canadian Popular Culture";
   OPS: 1, "The influence of lactation on the quantity and quality of
   cashmere production").
3. In the side menu, under "Publication" ("Preprint" on OPS), open
   "Media".
4. Press "Add Media File". The window "Upload Media File" opens.
5. Press "Click to upload files" and choose the PNG.
6. Read the file's card.

**Expected**: the card reads "Files larger than 2MB can not be
uploaded.", as it does for a PNG of 3 MB.

**Observed**: the card reads "The POST data is too large.", and "Upload
Files" stays greyed out until the card is removed. The upload answers
500:

```
POST /index.php/publicknowledge/api/v1/temporaryFiles
→ 500 {"error":"The POST data is too large."}
```

The server log has the same two lines as the picture's (`POST
Content-Length of 9183467 bytes exceeds the limit of 8388608 bytes`).

**A submission file of exactly the per-file limit** (spec U36 A21; OJS
and OMP, whose wizard has the "Files" list):

Preconditions:

- PKP's default test dataset for `main` or `stable-3_5_0`.
- The web server's PHP with the two limits equal:
  `upload_max_filesize = 8M`, `post_max_size = 8M`,
  `display_errors = Off` (on a development install,
  `php -d upload_max_filesize=8M -d post_max_size=8M -d display_errors=Off -S …`).
- A file of exactly 8 MiB (8388608 bytes), named `manuscript.pdf`.

Steps:

1. Sign in as `zzedd` (password `zzeddzzedd`), an author.
2. Open `/index.php/publicknowledge/en/submission` ("Make a
   Submission"), type a title, tick the required boxes and press "Begin
   Submission". [3.5: the wizard opens on "Details"; press "Continue".]
3. On "Upload Files", press "Add File" and choose the file.
4. Read the file's row.

**Expected**: whatever the limit, a refusal carries the size message
("Files larger than 8MB can not be uploaded."), not a server error.
That the browser's check lets this file through at all, where it
refuses a file of 9 MiB ("File is too big (9MiB). Max filesize:
8MiB."), is the fault of
[U36-A21-exact-limit-file-passes-size-check-then-refused](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A21-exact-limit-file-passes-size-check-then-refused.md).

**Observed**: the row fills to "Uploading 100% complete" and then reads
"The POST data is too large."; nothing is stored. The upload answers
500 `{"error":"The POST data is too large."}` to `POST
/index.php/publicknowledge/api/v1/submissions/{id}/files`, and the
server log reads `POST Content-Length of 8389029 bytes exceeds the
limit of 8388608 bytes`, then the same `PostTooLargeException` (in
each line's form for `main` and `stable-3_5_0`, as above).

**An API address that matches no route** (spec U17 A10):

Preconditions:

- PKP's default test dataset for OJS `main`, the one app with a
  sections endpoint. Nothing else.

Steps:

1. Sign in as `admin` (password `admin`).
2. Open `/index.php/publicknowledge/api/v1/sections/abc`.

**Expected**: 404, as for a number with no section under it
(`/sections/999`).

**Observed**:

```
GET /index.php/publicknowledge/api/v1/sections/abc
→ 500 {"error":"The route publicknowledge/api/v1/sections/abc could not be found."}
```

The server log reads:

```
production.ERROR: The route publicknowledge/api/v1/sections/abc could not be found. {"exception":"[object] (Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException(code: 0): The route publicknowledge/api/v1/sections/abc could not be found. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Routing/AbstractRouteCollection.php:44)
```

## Cause

When a request is larger than `post_max_size`, PHP drops its body:
`$_POST` and `$_FILES` arrive empty, and PHP logs the start-up warning
above. Laravel's `ValidatePostSize` middleware, one of the API's global
middleware (`PKPRoutingProvider::$globalMiddleware`), compares the
request's length with that limit and throws a `PostTooLargeException`,
an `HttpException` whose status is 413.

Laravel's routing pipeline catches every exception thrown inside it
(`Pipeline::prepareDestination()` and `carry()`) and hands it to
`PKPExceptionHandler::render()` (pkp-lib
`classes/core/PKPExceptionHandler.php`, lines 69–76). `render()`
answers with the exception's message and picks the status from
`$exception->getCode()`, which is 0 here; an HTTP exception carries its
status in `getStatusCode()`. So the 413 becomes a 500, and the message
is Laravel's English text.

The middleware and the status line both came with `pkp/pkp-lib#9176`,
which moved the API to Laravel's routing; the render code was later
moved from `PKPContainer` into its own class (`pkp/pkp-lib#12841`)
unchanged. Before it, 3.4's Slim handler met the empty `$_FILES` and
answered 400 "No file to be uploaded could be found with the request.":
a wrong message, but no server error.

Reach:

- Other uploads. The submission wizard's file list, the Vue forms'
  upload fields and the email window's attachments set Dropzone's
  `maxFilesize` to `upload_max_filesize`
  (`Application::getIntMaxFileMBs()`), and the workflow's legacy file
  uploader sets plupload's `max_file_size` to the same value (read in
  the code). Each refuses a larger file in the browser before sending
  it. The picture button has no such check.
- "Upload Media File" (walked on the three apps, `main` only). Its
  `FileMediaUploader` (ui-library `useFileMediaUploader.js`,
  `dropzoneOptions`) sets no `maxFilesize`, so Dropzone's own default of
  256 MiB applies, and the window posts any file up to that size to
  `temporaryFiles`. A file over `upload_max_filesize` but under
  `post_max_size` gets the controller's own "Files larger than 2MB can
  not be uploaded." (400); a file over `post_max_size` meets this
  `render()`. The JATS file uploader (OJS) sets no size either, so a
  JATS file over the request limit would meet the same 500 (not
  driven).
- The wizard's files list (walked on OJS and OMP, `main` and
  `stable-3_5_0`). Its check lets a file of exactly
  `upload_max_filesize` through, and with `post_max_size` equal to it
  the request goes over the limit and meets this `render()`. Why the
  check lets it through is the cause of
  U36-A21-exact-limit-file-passes-size-check-then-refused.
- Unknown routes and wrong methods. The router's
  `NotFoundHttpException` and `MethodNotAllowedHttpException` are
  thrown inside the same pipeline and reach `render()` too: the global
  `PolicyAuthorizer` middleware looks the route up
  (`PKPBaseController::getRequestedRoute()`, `$routes->match()`) before
  `dispatch()`. An unknown API route answers 500 today with Laravel's
  English "The route … could not be found." (seen on OMP and OPS
  `main`, and on OJS `main` and `stable-3_5_0` for `sections/abc`,
  whose `{sectionId}` route takes numbers only).
- With `display_errors = On` and `display_startup_errors = On`, as
  `php.ini-development` sets them, PHP prints its start-up warning
  before the JSON, so the answer is not JSON (with
  `display_startup_errors = Off` the warning stays in the server's
  log). The media window's card and the files list's row then read
  Dropzone's "Invalid JSON response from server." (walked on OJS
  `main`), and the picture's upload handler fails on
  `reject(r.responseJSON.error)`: "Cannot read properties of undefined
  (reading 'error')" (seen on OJS `main`). The same line is in `lib/pkp/js/controllers/SiteHandler.js`
  (line 203, the legacy boxes) and in
  `lib/ui-library/src/components/Form/fields/FieldRichTextarea.vue`
  (line 260, the Vue forms).

## Proposed fix

In `PKPExceptionHandler::render()`, answer an HTTP exception with its
own status, and answer a request over the request limit with the size
message the API already has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-request-limit-server-error/fix.diff),
which also adds the `use` lines for `PostTooLargeException` and
`HttpExceptionInterface` that this excerpt leaves out):

```diff
+            // A request over post_max_size (in practice an upload): PHP dropped its body and files
+            if ($exception instanceof PostTooLargeException) {
+                return response()->json([
+                    'error' => __('api.files.400.fileSize', ['maxSize' => Application::getReadableMaxFileSize()]),
+                ], $exception->getStatusCode());
+            }
+
             return response()->json(
                 [
                     'error' => $exception->getMessage()
                 ],
-                in_array($exception->getCode(), array_keys(Response::$statusTexts))
-                    ? $exception->getCode()
-                    : Response::HTTP_INTERNAL_SERVER_ERROR
+                $exception instanceof HttpExceptionInterface
+                    ? $exception->getStatusCode()
+                    : (in_array($exception->getCode(), array_keys(Response::$statusTexts))
+                        ? $exception->getCode()
+                        : Response::HTTP_INTERNAL_SERVER_ERROR)
             );
```

The request is still refused before any controller runs, as
`pkp/pkp-lib#9176` intended.

Tried on `main` on the three apps: with the fix the picture gets "Files
larger than 2MB can not be uploaded." with status 413, and no server
error. A 1 KB PNG is still stored, a text file named ".png" still gets
"The image you uploaded is not valid.", and a 3 MB PNG still fails as
U09-A18-picture-over-upload-limit-server-error describes. On OJS `main`, `sections/abc` answers 404
with Laravel's English text and no server error. The 9 MB media file's
card reads "Files larger than 2MB can not be uploaded." (413) on the
three apps, and the 8 MiB submission file's row "Files larger than 8MB
can not be uploaded." (413) on OJS and OMP. With the fix in and out, a
1 MB media file is still stored, a 3 MB one still gets the same message
with 400, a 9 MiB submission file is still refused in the browser, and
a 1 MiB one is still stored. The 8 MiB file is refused only after it
has been sent, and with a limit it does not exceed; U36-A21-exact-limit-file-passes-size-check-then-refused
fixes that.

**Alternatives**

- The `PostTooLargeException` branch alone. It fixes this case and
  leaves every other HTTP exception answering 500.
- Remove `ValidatePostSize` from the global middleware. Each controller
  would then meet empty `$_FILES` and answer "No file to be uploaded
  could be found with the request.", the 3.4 behaviour.
- Raise PHP's limits: a way round for the server's administrator, not a
  fix.

**What goes with it**

- Unknown routes: with the fix an unknown API route answers 404 (tried)
  and a wrong method 405 (read in the code), still with Laravel's English text rather than
  `api.404.endpointNotFound`. Whether `render()` should answer a
  `NotFoundHttpException` with that message, as `APIHandler::runRoutes()`
  meant to, is the team's choice; the diff does not. The 404 branch in
  `runRoutes()`' own catch is close to dead code, since router
  exceptions never leave the pipeline.
- Headers: the HTTP exception's headers (`getHeaders()`, such as
  `Allow` on a 405) can go in as the third argument of
  `response()->json()`; the diff leaves them out.
- What it touches: REST clients get the HTTP exception's own status
  (413, 404, 405) where they got 500, and plugins that throw HTTP
  exceptions in the API get the status they asked for.
- Core policies: `SubmissionRequiredPolicy` and
  `PublicationRequiredPolicy` throw `NotFoundHttpException` when they
  deny. In the API they run inside the controller's `authorize()`, which
  `PolicyAuthorizer::handle()` wraps in its own catch that already
  answers an HTTP exception with its status (lines 89–92). They answer
  404 today and the fix does not change them (read in the code).
- `display_startup_errors = On`: the fix does not guard the upload handlers'
  `r.responseJSON.error`. A fallback message there when the answer is
  not JSON belongs with those two handlers, a separate change; a
  production server, with both settings Off, does not meet it.
- `report()` still logs a refused request as an error; leaving HTTP
  exceptions below 500 out of the log is optional.
- The message names `upload_max_filesize`, which can be more than the
  request limit lets through; U36-A21-exact-limit-file-passes-size-check-then-refused
  makes `getReadableMaxFileSize()` name the smaller.
- "Upload Media File": with this fix a file over `post_max_size` is
  refused with the size message, but only once it has been sent in
  full. Passing `maxFilesize` would refuse it in the browser first, as
  the wizard's files list and `FieldUpload` do. No page config is
  needed: `useFileMediaUploader.js` spreads `props.options` into the
  Dropzone options (line 70), `MediaFileManagerAddFileModal.vue` passes
  none today, and `pkp.const.UPLOAD_MAX_FILESIZE` is on every page
  (`PKPTemplateManager.php` line 1040), as the raw `"2M"` string, which
  the modal would turn into megabytes. A small separate ui-library
  change.
- Backport: on `stable-3_5_0` the same render code is the anonymous
  exception handler in `PKPContainer::registerBaseBindings()`; the same
  change fits there (not tried).
- Guard: a pkp-lib unit test of `render()` with a
  `PostTooLargeException` and another HTTP exception.

Medium: one file and a test, but the status change reaches every API
answer built from an HTTP exception, which REST clients see.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js),
  with its helpers in U09-A18-picture-over-upload-limit-server-error's
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/lib.js);
  the control (a 1 KB PNG, a text file named ".png" and a 3 MB PNG) is
  in the same script, walked with the fix in and out. On an install
  freshly loaded from the default dataset, from a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/picture-over-request-limit-server-error/fix.diff ojs omp ops`.
- The unknown-route steps (spec U17 A10) are step 4 of
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js)
  of U17-A10-sections-interface-site-address-server-error, walked on OJS `main`
  and `stable-3_5_0` on 2026-10-02 (OJS `main` b84f8e2e44 with lib/pkp
  ddd8ab243a, `stable-3_5_0` 091fb65453 with lib/pkp cf3f984335), and
  on `main` with this fix in:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/sections-interface-site-address-server-error/walk.js`.
- The media file and exact-limit steps (specs U47 A4, U36 A21):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-over-request-limit-server-error/lib.js),
  which serves the exact-limit part through a second `php -S` of the
  same install with both limits at 8M; its control (a 1 MB and a 3 MB
  PNG on the media window, a 9 MiB and a 1 MiB file in the files list)
  walked with the fix in and out:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. Walked
  2026-10-02 on a second machine, PHP 8.3.33 with PHP's default limits
  and `display_errors`, `display_startup_errors` Off: media on OJS, OMP
  and OPS `main` (OJS b84f8e2e44 with lib/pkp ddd8ab243a and ui-library
  64d67363; OMP 3b0ecf794 and OPS c8af945bb7 with lib/pkp 3dc90c81a6 and
  ui-library 280f98c5); the exact-limit file on OJS and OMP `main` and
  `stable-3_5_0` (OJS 091fb65453, OMP 9c5e24246, both with lib/pkp
  cf3f984335). The display check (`MODE=startup`, both settings On) on
  OJS `main`. The media window came with `pkp/pkp-lib#12262` (ui-library
  3f97137c, 2026-05-06). 3.4 (code): the Slim
  `PKPSubmissionFileHandler::add()` answers an empty `$_FILES` with 400
  `api.files.400.noUpload` (line 271), no server error.
- The picture walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on
  PostgreSQL and PHP 8.4.11, whose php.ini raises both limits to 100M
  and has `display_errors = On`; its script serves the same install
  through a second `php -S` with
  `-d upload_max_filesize=2M -d post_max_size=8M -d display_errors=Off`.
  The fault does not touch the database. Datasets: pkp/datasets c657990
  (2026-10-01).
- Unverified: with `display_errors = On`, what the picture window shows
  after the script error (one walk on OJS `main` recorded the 500 and
  the error, not the window). The 405 with the fix is read in the
  code, not tried.
- Code reads. `main`: `PKPRoutingProvider::$globalMiddleware` (line 52,
  `ValidatePostSize::class`); `APIHandler::runRoutes()` runs the global
  middleware and `app('router')->dispatch()` through
  `Illuminate\Routing\Pipeline`, whose `handleException()` calls the
  handler's `report()` and `render()`. The uploaders' limits:
  `PKPSubmissionHandler` (line 585), `FieldUpload` (line 46),
  `fileAttachers/Upload` (line 54), `UploaderHandler.js` (line 263);
  `WorkflowPublicationJats.vue` passes no options to `FileUploader`.
  3.5: the same middleware list and render code (`PKPContainer.php`
  lines 98–116). 3.4 (`origin/stable-3_4_0`) and 3.3
  (`origin/stable-3_3_0`): no `ValidatePostSize` in lib/pkp; the Slim
  `PKPUploadPublicFileHandler::uploadFile()` answers an empty `$_FILES`
  with 400 `api.files.400.noUpload` (3.4 line 105, 3.3 line 81).
- Introduced: `git log -S` for the status line and for
  `ValidatePostSize::class` gives 71e79e31e3 for both; `git blame` on
  `main` gives 6516f3673d (`pkp/pkp-lib#12841`, the move into
  `PKPExceptionHandler`).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "POST data is
  too large", `PostTooLargeException`, "post_max_size", "Invalid JSON
  response from server", "POST Content-Length", "exceeds the limit",
  `maxFilesize`, `FileMediaUploader`, "media file upload size". Read and not
  the same fault: `pkp/pkp-lib#9478`, and `pkp/pkp-lib#12262` (the media
  window's QA list, which has no size case).
- Tips of the picture walks (2026-10-01; the unknown-route walk's are in
  its bullet above): OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6.
  `stable-3_5_0` OJS 3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e
  and OPS 8eaf899468 with lib/pkp 1fb843f491. `stable-3_4_0` lib/pkp
  32b0f4b4af; `stable-3_3_0` lib/pkp f6ab331645.
