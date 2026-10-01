# Uploading a picture larger than the server's request limit fails with a server error, not the limit

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: none (code; refused without a server error)
  - 3.3: none (code; refused without a server error)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18); pictures over the per-file limit but under this one (2 to 8 MB by default) are [U09-A18-picture-over-upload-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-upload-limit-server-error.md)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager uploads a picture through "Insert/edit image" in a formatted
text box. When the picture is larger than the most the server accepts
in one request (PHP's `post_max_size`, 8 MB by default), the
application fails on the server. The editor's alert over the
"Insert/Edit Image" window reads "The POST data is too large.", in
English whatever the interface language.

The manager expects to be told the size limit, as the application does
for files over the per-file limit ("Files larger than 2MB can not be
uploaded."). The message gives no limit, and it reads as a fault of the
site rather than of the picture.

The file uploads of the submission, the forms and the email windows
refuse such a file in the browser before sending it, so the picture
button is where users meet this.

## Impact

- **Lost**: no content. The picture is neither stored nor inserted.
- **Who**: journal managers, and editors whose role may change
  settings, wherever a formatted text box has a picture button: custom
  pages, custom blocks, static pages, announcements, and the journal's
  masthead, information, privacy and appearance texts. It happens each
  time a picture is larger than the server's request limit.
- **Way round**: make the picture smaller and upload it again.

Medium: a settings task fails with a server error on a narrow input
(pictures over 8 MB by default); the message points at the size, and a
smaller picture goes in.

## Steps to reproduce

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

A 1 KB PNG goes in as usual, and a text file named ".png" gets "The
image you uploaded is not valid.".

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

- Other uploads (read in the code). The submission wizard's file list,
  the Vue forms' upload fields and the email window's attachments set
  Dropzone's `maxFilesize` to `upload_max_filesize`
  (`Application::getIntMaxFileMBs()`), and the workflow's legacy file
  uploader sets plupload's `max_file_size` to the same value. Each
  refuses a larger file in the browser before sending it (the Dropzone
  ones with "File is too big ({filesize}mb). Files larger than
  {maxFilesize}mb can not be uploaded."). With `post_max_size` at or above
  `upload_max_filesize`, as PHP's defaults have it, none of them sends a
  request over the request limit. The picture button has no such check.
  The JATS file uploader (OJS) sets no size, so a JATS file over the
  request limit would meet the same 500 (not driven).
- Unknown routes and wrong methods. The router's
  `NotFoundHttpException` and `MethodNotAllowedHttpException` are
  thrown inside the same pipeline and reach `render()` too. An unknown
  API route answers 500 today with Laravel's English "The route … could
  not be found." (seen on OMP and OPS `main`).
- With `display_errors = On` (`php.ini-development`), PHP prints its
  start-up warning before the JSON, so the answer is not JSON. The
  upload handler then fails on `reject(r.responseJSON.error)`:
  "Cannot read properties of undefined (reading 'error')" (seen on OJS
  `main`). The same line is in `lib/pkp/js/controllers/SiteHandler.js`
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
the sibling report describes.

**Alternatives**

- The `PostTooLargeException` branch alone. It fixes this case and
  leaves every other HTTP exception answering 500.
- Remove `ValidatePostSize` from the global middleware. Each controller
  would then meet empty `$_FILES` and answer "No file to be uploaded
  could be found with the request.", the 3.4 behaviour.
- Raise PHP's limits: a way round for the server's administrator, not a
  fix.

**What goes with it**

- Unknown routes: with the fix an unknown API route answers 404 and a
  wrong method 405, still with Laravel's English text rather than
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
- `display_errors = On`: the fix does not guard the upload handlers'
  `r.responseJSON.error`. A fallback message there when the answer is
  not JSON belongs with those two handlers, a separate change; a
  production server, with `display_errors = Off`, does not meet it.
- `report()` still logs a refused request as an error; leaving HTTP
  exceptions below 500 out of the log is optional.
- The message names `upload_max_filesize`. On a server whose
  `post_max_size` is set below it, the number shown is too high.
- Backport: on `stable-3_5_0` the same render code is the anonymous
  exception handler in `PKPContainer::registerBaseBindings()`; the same
  change fits there (not tried).
- Guard: a pkp-lib unit test of `render()` with a
  `PostTooLargeException` and another HTTP exception, and the e2e
  scenario for spec U09's A18 (a **Planned** item).

Medium: one file and a test, but the status change reaches every API
answer built from an HTTP exception, which REST clients see.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js),
  with its helpers in the sibling report's
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/lib.js);
  the control (a 1 KB PNG, a text file named ".png" and a 3 MB PNG) is
  in the same script, walked with the fix in and out. On an install
  freshly loaded from the default dataset, from a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-over-request-limit-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/picture-over-request-limit-server-error/fix.diff ojs omp ops`.
- The walking machine's php.ini raises both limits to 100M and has
  `display_errors = On`, so the script serves the same install through
  a second `php -S` with
  `-d upload_max_filesize=2M -d post_max_size=8M -d display_errors=Off`
  (`startDefaultLimitsServer()` in `lib.js`).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL
  and PHP 8.4.11; the fault does not touch the database. Datasets:
  pkp/datasets c657990 (2026-10-01).
- Unverified: with `display_errors = On`, what the picture window shows
  after the script error (one walk on OJS `main` recorded the 500 and
  the error, not the window). The unknown-route 500 is from another
  walk on OMP and OPS `main`; the 404 and 405 with the fix are read in
  the code, not tried.
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
  too large", `PostTooLargeException`, "post_max_size". Read and not
  the same fault: `pkp/pkp-lib#9478`.
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6.
  `stable-3_5_0` OJS 3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e
  and OPS 8eaf899468 with lib/pkp 1fb843f491. `stable-3_4_0` lib/pkp
  32b0f4b4af; `stable-3_3_0` lib/pkp f6ab331645.
