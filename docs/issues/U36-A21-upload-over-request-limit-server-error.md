# A file over the server's request size limit fails with a server error and "The POST data is too large."

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP; OPS (code: its settings upload fields; it has neither the Files panel nor a Media page)
  - 3.4: none (code; a 400 "No file to be uploaded could be found with the request.", no server error)
  - 3.3: none (code; the same 400)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a21), spec U47 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a4), spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18) (its request-limit case: a picture over `post_max_size`)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

An author adding a file in the submission wizard's "Files" panel, or an
editor adding one in a publication's "Upload Media File" window, can
choose a file larger than PHP's `post_max_size`, the largest request the
server accepts. The app then fails on the server with a 500. The file's
row in the Files panel, or its card in the media window, reads "The
POST data is too large." in English whatever the site's language, and
nothing is stored. On the media window, a file that is only over
`upload_max_filesize` gets the app's own message with the limit instead
("Files larger than 2MB can not be uploaded.", 2 MB being PHP's shipped
`upload_max_filesize`).

The refusal itself is not new: 3.4 and 3.3 also refused such a file
without naming a limit, with "No file to be uploaded could be found
with the request." but no server error. The server error and the
framework's English message came with 3.5.

On the media window every file over `post_max_size` does this (8 MB on
PHP's shipped settings). In the submission wizard the panel refuses in
the browser any file over `upload_max_filesize`, so the fault needs an
install whose `post_max_size` is not larger than `upload_max_filesize`.
There the panel accepts files the server cannot take. When the two
limits are equal, even a file of exactly the panel's limit fails,
because the request also carries the form's fields.

## Impact

- **Lost:** nothing is stored, and the user is not told how large a
  file may be.
- **Who:** editors adding media files to a publication, on any install.
  Authors uploading submission files, on installs whose `post_max_size`
  is not larger than `upload_max_filesize`. PHP ships with
  `upload_max_filesize` 2M and `post_max_size` 8M, so an administrator
  who raises only `upload_max_filesize` past 8M, a common tuning step
  to allow larger manuscripts, lands there.
- **Way round:** a smaller file, but on those installs the Files panel
  states a limit the server does not honour: with `upload_max_filesize`
  at 100M it reads "Max filesize: 100MiB.", and every file over
  `post_max_size` fails, so an author cannot tell which size will pass.

Medium: authors on an install where only the file limit was raised are
told a size is allowed and then get a server error for every file
between the two limits, with a message that names no limit; the wider
media-window case alone, an English message for a file that was too
large anyway, would be low.

## Steps to reproduce

PHP's two limits decide which file reaches the fault: `upload_max_filesize`
(the largest file) and `post_max_size` (the largest request, the file and
the form's fields together). `php -i | grep -E 'upload_max|post_max'` on
the server shows them; PHP's shipped values are 2M and 8M.

**The media window (any install):**

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP, OPS).
- A file larger than `post_max_size` (on PHP's shipped values, a 9 MB
  file).

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees" (OMP:
   submission 4, "How Canadians Communicate: Contexts of Canadian Popular
   Culture"; OPS: submission 1, "The influence of lactation on the
   quantity and quality of cashmere production"), for example at
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=5`.
3. In the workflow's side menu, under the publication, choose "Media".
4. Press "Add Media File", then "Click to upload files".
5. Choose the file.

**The submission wizard (an install where `post_max_size` is not larger
than `upload_max_filesize`):**

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP), on a server whose PHP
  has `post_max_size` no larger than `upload_max_filesize`, set in its
  php.ini (walked with both at 4M, and with `upload_max_filesize` 8M and
  `post_max_size` 4M).
- A file of exactly `upload_max_filesize` (any size from `post_max_size`
  up to `upload_max_filesize` does the same).

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "Start A New Submission" (`/index.php/publicknowledge/en/submission`).
3. Choose "English" under "Submission Language", type the title
   "u36r6 upload limit", choose "Articles" under "Section" (OJS only),
   tick "Yes, my submission meets all of these requirements." and "Yes,
   I agree to have my data collected and stored according to the privacy
   statement.", and press "Begin Submission". The wizard opens on
   "Upload Files" [3.5: on "Details"; press "Continue"].
4. In "Files", press "Add File" and choose the file.

**Expected:** the file is refused with a message that names the limit,
and the server does not answer 500. On the media window's card, the
app's size message, as a file over `upload_max_filesize` gets it
("Files larger than 2MB can not be uploaded."). In the Files panel's
row, the refusal a file over the panel's limit gets ("File is too big
(5MiB). Max filesize: 4MiB."), or the app's size message if the file
is sent.

**Observed:** the media window's card, and the Files panel's row, read:

```
The POST data is too large.
```

The upload (`POST …/api/v1/temporaryFiles` from the media window, `POST
…/api/v1/submissions/{id}/files` from the Files panel) answers `500` with
`{"error":"The POST data is too large."}`. "Upload Files" stays greyed
out on the media window; the reopened draft has no file. The server log:

```
PHP Warning:  POST Content-Length of 4194711 bytes exceeds the limit of 4194304 bytes in Unknown on line 0
production.ERROR: The POST data is too large. {"exception":"[object] (Illuminate\\Http\\Exceptions\\PostTooLargeException(code: 0): The POST data is too large. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:24)
```

Controls: on the media window, a file over `upload_max_filesize` but
under `post_max_size` (3 MB on PHP's shipped values) is answered `400`,
"Files larger than 2MB can not be uploaded." In the Files panel, a file
1 MiB over `upload_max_filesize` is refused in its row before it is sent
("File is too big (5MiB). Max filesize: 4MiB."). On PHP's shipped values
a file of exactly `upload_max_filesize` is stored.

## Cause

A request larger than `post_max_size` reaches the app with its body
dropped by PHP. Laravel's `ValidatePostSize` middleware, one of the API's
global middleware (`PKPRoutingProvider::$globalMiddleware`), rejects it
by throwing `PostTooLargeException`. That is an HTTP exception with status
413 and Laravel's message "The POST data is too large.".

`APIHandler::runRoutes()` runs the middleware through
`Illuminate\Routing\Pipeline`, whose `handleException()` hands the
exception to the bound exception handler: `report()`, which logs the
`production.ERROR` line (`PKPExceptionHandler::shouldReport()` is true
for everything), then `render()`. That renderer,
`PKPExceptionHandler::render()`
(`lib/pkp/classes/core/PKPExceptionHandler.php`, line 73), takes the
response status from `$exception->getCode()`. An HTTP exception keeps
its status in `getStatusCode()`, and its code is 0. So the renderer
answers 500 with Laravel's English message. The rule it breaks: an HTTP
exception answers with its own status, as `PolicyAuthorizer` already
reads it (`$e instanceof HttpExceptionInterface ? $e->getStatusCode()`).
Both the middleware and this status mapping came in with 71e79e31e3,
which moved the API to Laravel's router; 3.4's API left an emptied
request to the handlers, which answered 400 "No file to be uploaded
could be found with the request.".

The size the screens advertise comes from `UPLOAD_MAX_FILESIZE`
(`lib/pkp/classes/core/PKPApplication.php`, line 764), which reads
`upload_max_filesize` alone. A file must also fit, with the form's
fields, into `post_max_size`. On PHP's shipped values that never
matters, because the file limit is the smaller one. Where `post_max_size`
is not larger, the Files panel's own check (`maxFilesize` from
`Application::getIntMaxFileMBs()`) lets through files the server cannot
take. The media window's uploader (`useFileMediaUploader.js`) passes no
`maxFilesize`, so only Dropzone's own default applies (256 MiB in the
bundled dropzone 6.0.0-beta.2, through dropzone-vue3 1.0.2), and every
file between `post_max_size` and 256 MiB reaches the server.

Reach:

- Every other upload through the API goes through the same renderer:
  the settings forms' upload fields (`FieldUpload`, through
  `temporaryFiles`: the logo and other images in Website settings,
  announcements, highlights; on OPS 3.5 these are the only such
  uploads), email attachments (`fileAttachers/Upload`), and the
  rich-text editor's picture upload (`_uploadPublicFile`). Spec U09
  [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18)
  saw this 500 on that picture upload for a picture over `post_max_size`.
  A picture over `upload_max_filesize` but under `post_max_size` fails
  for another cause, reported separately
  ([U09-A18-picture-over-upload-limit-server-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-upload-limit-server-error.md)).
- Any other HTTP exception that reaches the renderer (a wrong method, a
  missing route) answers 500 instead of its own status. Code only, not
  driven.
- The legacy uploader's `max_file_size` reads the same constant (code);
  its uploads go to page handlers, not this renderer.

## Proposed fix

Two changes in pkp-lib, tried as
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-over-request-limit-server-error/fix.diff):

1. `PKPExceptionHandler::render()` answers an HTTP exception with its own
   status, and a `PostTooLargeException` with the app's
   `api.files.400.fileSize` message and the limit, the answer every
   other refused upload gets (`PKPBaseController::getUploadErrorResponse()`,
   `PKPTemporaryFilesController::uploadFile()`).
2. `UPLOAD_MAX_FILESIZE` becomes the smaller of `upload_max_filesize` and
   `post_max_size`, so the message, the Files panel's check and the
   legacy uploader all state the size one request can carry.

```php
// PKPExceptionHandler::render()
if ($exception instanceof PostTooLargeException) {
    return response()->json([
        'error' => __('api.files.400.fileSize', ['maxSize' => Application::getReadableMaxFileSize()]),
    ], $exception->getStatusCode());
}
return response()->json(
    ['error' => $exception->getMessage()],
    $exception instanceof HttpExceptionInterface
        ? $exception->getStatusCode()
        : (in_array($exception->getCode(), array_keys(Response::$statusTexts))
            ? $exception->getCode()
            : Response::HTTP_INTERNAL_SERVER_ERROR)
);

// PKPApplication.php
define('UPLOAD_MAX_FILESIZE', (function (): string {
    $fileMax = trim(ini_get('upload_max_filesize'));
    $postMax = trim(ini_get('post_max_size'));
    return ini_parse_quantity($postMax) > 0 && ini_parse_quantity($postMax) < ini_parse_quantity($fileMax)
        ? $postMax
        : $fileMax;
})());
```

Tried on `main`, three apps. With both limits at 4M, the media window's
5 MiB file and the Files panel's 4 MiB file were answered `413` "Files
larger than 4MB can not be uploaded.", with no 500. The
`production.ERROR` line is still logged, since `shouldReport()` is true
for every exception. With `upload_max_filesize` 8M and `post_max_size`
4M, the panel refused the 8 MiB file before sending it ("File is too big
(8MiB). Max filesize: 4MiB."). On PHP's shipped values a 2 MiB file was
stored and a 3 MB media file kept its `400` message. A 9 MB media file
now reads "Files larger than 2MB can not be uploaded." with `413`.

Why here: the renderer is the one place every API route's exceptions
pass, and the constant is what every size check and size message reads.
`APIHandler::runRoutes()`'s own catch holds the same `getCode()` mapping,
but it runs only when `report()` or `render()` themselves throw, so it
is not on this path and the diff leaves it alone. The trial also changed
it; that hunk was taken out of the diff afterwards, and it changes
nothing the walks reached.
The ValidatePostSize check itself is right to keep: it stops a request
whose body PHP has already dropped.

With both limits equal, a file of exactly the limit still passes the
panel's check and is refused by the server, now with the size message.
Leaving headroom in the panel's check for the form's fields would refuse
it in the browser; that is a ui-library change, not in the diff.

**Alternatives:**

- A PKP `ValidatePostSize` middleware in place of Laravel's, answering
  413 with the app's message, as `PKP\middleware\ValidateCsrfToken`
  replaces Laravel's. It mends the uploads but leaves every other HTTP
  exception answering 500.
- The status change alone: the answer becomes 413, but still with
  Laravel's English message and no limit.
- Browser checks only (a limit on the media uploader, headroom on the
  panel): the server still answers 500 to anything that reaches it.

**What goes with it:**

- API clients get the HTTP exception's own status (413, 405, 404) where
  they got 500. No plugin hook changes and no stored data needs repair.
- The log keeps a `production.ERROR` line and PHP's own "POST
  Content-Length … exceeds the limit" warning for each such upload.
  `shouldReport()` could skip HTTP exceptions under 500 if the team
  wants a refused upload kept out of the error log; not in the diff.
- On installs where `post_max_size` is the smaller limit, the Files
  panel's "Max filesize" and the size message show the smaller figure.
- Backport to 3.5: the renderer there is the anonymous handler in
  `PKPContainer::registerBaseBindings()` (`lib/pkp/classes/core/PKPContainer.php`,
  line 112); `PKPApplication` takes the same change.
- 3.4 and 3.3 have no such renderer, but their `UPLOAD_MAX_FILESIZE`
  reads `upload_max_filesize` alone too, so the Files panel there also
  accepts files the server cannot take (answered with the 400 "No file
  to be uploaded…"). The constant change would help there as well, with
  a byte parser in place of `ini_parse_quantity()`, which needs PHP 8.2
  (3.4 supports PHP 8.0, 3.3 PHP 7.3).
- A guard: a unit test for the renderer (a `PostTooLargeException`
  answers 413 with `api.files.400.fileSize`) and for the constant with
  `post_max_size` below `upload_max_filesize`.

Medium: two changes in pkp-lib, about fifteen lines, but not a local
catch: the status change reaches every HTTP exception the API renders,
which API clients see, and the limit change moves the size every upload
screen states.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js),
  `node bin/probe.js all shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js`
  (`PART=media` or `PART=panel` for one group). It sizes the files from
  the PHP limits the server runs under. Its header gives the commands
  that start the test server with other limits (an extra ini directory
  through `PHP_INI_SCAN_DIR`), the control uploads and the fix trial.
- The walks ran in headless Chromium on PHP 8.3's built-in server, on
  PKP's default datasets from pkp/datasets 38ab955 (2026-09-30),
  PostgreSQL. Limits below are `upload_max_filesize`/`post_max_size`.
  Media: `main`, three apps, with 2M/8M and with 4M/4M. Files panel:
  `main` OJS and OMP with 2M/8M (the file stored) and 4M/4M; OJS with
  8M/4M and with 100M/100M (100 MiB and 101 MiB files, the sizes of the
  spec's first sighting); 3.5 OJS and OMP with 4M/4M.
- The spec entries record "Invalid JSON response from server." on the
  card and row (2026-09-23 and 24). No walk today showed it: every size
  and setting above, `display_errors` On included, gave "The POST data
  is too large." with the same 500. What produced the earlier wording
  is unverified.
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc); OMP 3b0ecf794 and OPS
    c8af945bb7 (pkp-lib 3dc90c81a6); ui-library 280f98c5.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd
    (pkp-lib a9c76aed62, ui-library 1a7a4750).
  - stable-3_4_0: OJS 9571d8fde7, OMP 0aec65441, OPS acd8ae704b
    (pkp-lib df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161
    (pkp-lib d446601ebe).
- Code reads:
  - main: `PKPExceptionHandler::render()`, `APIHandler::runRoutes()`,
    `PKPRoutingProvider::$globalMiddleware`, Laravel's
    `ValidatePostSize`, `PolicyAuthorizer::handle()`,
    `PKPApplication::getIntMaxFileMBs()` and `getReadableMaxFileSize()`,
    `PKPSubmissionHandler` (the panel's `maxFilesize`), ui-library
    `useFileMediaUploader.js` and `MediaFileManagerAddFileModal.vue` (no
    `maxFilesize` passed), Laravel's `Illuminate\Routing\Pipeline`, and
    the installed dropzone 6.0.0-beta.2 (`src/options.js`,
    `maxFilesize: 256`, checked as MiB).
  - 3.5: the renderer in `PKPContainer` (line 112, the same
    `getCode()` mapping), `ValidatePostSize` in the global middleware,
    `UPLOAD_MAX_FILESIZE` from `upload_max_filesize` alone; no
    `MediaFileManager` in its ui-library.
  - 3.4 and 3.3: Slim API, no Laravel router or `ValidatePostSize`;
    `PKPTemporaryFilesHandler::uploadFile()` and
    `PKPSubmissionFileHandler` answer an empty `$_FILES` with 400
    `api.files.400.noUpload`; the CSRF check reads the header, so an
    emptied body passes it. Whether the submission-files route's
    authorization, which reads the file stage from the body, answers
    first with a 4xx of its own was not traced. `UPLOAD_MAX_FILESIZE`
    reads `upload_max_filesize` alone on both; their `composer.json`
    platform PHP is 8.0.2 (3.4) and 7.3.0 (3.3).
- Introduced: `git log -S` on the `getCode()` mapping and on
  `ValidatePostSize` both lead to 71e79e31e3; the later commits on those
  lines kept the logic: 7c60718065 (a re-lint), 5b34729cfd (the
  Laravel auth integration, `pkp/pkp-lib#9596`, which only re-indented
  these lines) and 6516f3673d (the move to `PKPExceptionHandler` on
  `main`). 71e79e31e3 is on `stable-3_5_0` and not on `stable-3_4_0`.
- Upstream (2026-09-30): pkp/pkp-lib searched for "post_max_size",
  "upload_max_filesize", "POST data is too large", "Invalid JSON
  response", "PostTooLargeException", "upload limit", "too large" with
  500, and the exception handler's `getStatusCode`; pkp/ojs for
  "post_max_size"; pkp/ui-library for "maxFilesize". `pkp/pkp-lib#1114`,
  `#8541` and `#9478` were read; none is the same fault.
- Unverified: how many installs have `post_max_size` at or below
  `upload_max_filesize`; the severity rests on the reading that raising
  only the file limit is a common step.
- Not driven: OPS on 3.5 (no Files panel or Media page); 3.4 and 3.3;
  the other API uploads and HTTP exceptions in Cause's reach; MySQL.
