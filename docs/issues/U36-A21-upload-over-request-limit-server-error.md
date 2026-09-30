# Uploads over the request limit and wrong API addresses fail with a server error and an English message

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP; OPS (code: its settings upload fields; it has neither the Files panel nor a Media page)
  - 3.4: none (code; a translated 400 for an upload, a 403 for an unknown address, no server error)
  - 3.3: none (code; the same)
- **Introduced** `pkp/pkp-lib#9176` for `pkp/pkp-lib#7698` · [71e79e31e3](https://github.com/pkp/pkp-lib/commit/71e79e31e3d5c827e4bfa2443bbe81e5ec4c1dba) · 2023-10-13 · Touhidur Rahman (touhidurabir)
- **Upstream** `pkp/pkp-lib#11730` (closed; its fix, `pkp/pkp-lib#11737`, gives a "not found" raised during authorization its own status; the failures here are raised elsewhere and still answer 500)
- **Tracked in** spec U36 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a21) (its server error), spec U47 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a4), spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18) (a picture over `post_max_size`), spec U17 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#a10) (a section asked for by a word)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

An editor adds a media file larger than PHP's `post_max_size`, the
largest request the server accepts, in a publication's "Upload Media
File" window. The app fails on the server with a 500. The card reads
"The POST data is too large." in English whatever the site's language,
and names no limit. A file too large only for `upload_max_filesize` gets
the app's own message instead ("Files larger than 2MB can not be
uploaded."). An author's upload in the submission wizard's "Files" panel
fails the same way when the panel lets such a file through, which
[a separate report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A21-files-panel-limit-ignores-request-limit.md)
covers.

The file is too large either way, and nothing is stored. 3.4 and 3.3
refused such an upload with a translated 400, "No file to be uploaded
could be found with the request.". What 3.5 changed is the server error
and the English framework message.

Every upload over `post_max_size` gets this answer: a picture in the
rich-text editor, an image in the settings pages' upload fields, an
email attachment. On OPS the screens that show it are the media window
on `main` and the settings pages' image fields on `main` and 3.5. So
does a REST API address that none of the interface's routes matches, or
a method it does not take, which no screen sends. 3.4 answered such an
address with a 403 and "The requested URL was not recognized.".

## Impact

- **Lost:** nothing is stored, but the file was too large anyway. The
  user is not told the limit, and the message is in English.
- **Who:** editors adding media files on `main`, on any install, with a
  file over `post_max_size` (8 MB on PHP's shipped settings). Managers
  uploading images and anyone attaching a file over that size. Programs
  calling the REST API with a wrong address.
- **Way round:** a smaller file.

Low: the upload would be refused anyway, and what is lost is a message
naming the limit in the user's language. It would be higher if a screen
sent a wrong API address in ordinary use, or if the server error lost
work already typed.

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

**Expected:** the card reads the app's size message, as a file over
`upload_max_filesize` gets it ("Files larger than 2MB can not be
uploaded."), and the server does not answer 500.

**Observed:** the card reads "The POST data is too large.". The upload,
`POST …/api/v1/temporaryFiles`, answers `500` with
`{"error":"The POST data is too large."}`, and "Upload Files" stays
greyed out. The server log:

```
PHP Warning:  POST Content-Length of 4194711 bytes exceeds the limit of 4194304 bytes in Unknown on line 0
production.ERROR: The POST data is too large. {"exception":"[object] (Illuminate\\Http\\Exceptions\\PostTooLargeException(code: 0): The POST data is too large. at …/lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/Middleware/ValidatePostSize.php:24)
```

Control: a file over `upload_max_filesize` but under `post_max_size`
(3 MB on PHP's shipped values) is answered `400`, "Files larger than 2MB
can not be uploaded.".

**The submission wizard (an install where `post_max_size` is no larger
than `upload_max_filesize`; why the panel lets the file through is the
other report):**

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP; the same on
  `stable-3_5_0`), on a server whose PHP has `upload_max_filesize` and
  `post_max_size` both at 4M, set in its php.ini.
- A file of exactly 4 MiB.

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "Start A New Submission" (`/index.php/publicknowledge/en/submission`).
3. Choose "English" under "Submission Language", type the title
   "u36r6 upload limit", choose "Articles" under "Section" (OJS only),
   tick "Yes, my submission meets all of these requirements." and "Yes,
   I agree to have my data collected and stored according to the privacy
   statement.", and press "Begin Submission". The wizard opens on
   "Upload Files" [3.5: on "Details"; press "Continue"].
4. In "Files", press "Add File" and choose the file.

**Expected:** the server refuses the file with the app's size message
("Files larger than 4MB can not be uploaded."), not a 500.

**Observed:** the row reads "The POST data is too large.". `POST
…/api/v1/submissions/{id}/files` answers `500` with
`{"error":"The POST data is too large."}`, and the reopened draft has no
file.

**A section asked for by a word (OJS; no screen sends it):**

Preconditions:

- PKP's default test dataset for `main` (OJS; the same on
  `stable-3_5_0`). OMP and OPS have no sections interface.

1. Sign in as `rvaca` (the Journal manager).
2. In the same browser, open `/index.php/publicknowledge/api/v1/sections/1`.
   It shows section 1, "Articles", as JSON (`200`).
3. Open `/index.php/publicknowledge/api/v1/sections/abc`.
4. Sign out, and open the same address signed out.

**Expected:** `404` `{"error":"The requested URL was not recognized."}`,
the answer `APIHandler::runRoutes()` was written to give a
`NotFoundHttpException`, and a refusal like the one `rvaca` gets for a
number the journal has no section under (`…/sections/999`, `404`).

**Observed:** steps 3 and 4 answer `500` with
`{"error":"The route publicknowledge\/api\/v1\/sections\/abc could not be found."}`,
and the server log reads `production.ERROR: The route
publicknowledge/api/v1/sections/abc could not be found.
{"exception":"[object] (Symfony\\Component\\HttpKernel\\Exception\\NotFoundHttpException(code: 0): …`.

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
reads it (`$e instanceof HttpExceptionInterface ? $e->getStatusCode()`),
and in the app's words, as the app's other refusals do.

Both the middleware and this status mapping came in with 71e79e31e3,
which moved the API to Laravel's router. 3.4's API left an emptied
request to the handlers, which answered 400 "No file to be uploaded
could be found with the request.".

Reach:

- **Other uploads.** Every other upload through the API goes through the
  same renderer: the settings forms' upload fields (`FieldUpload`,
  through `temporaryFiles`: the logo and other images in Website
  settings, announcements, highlights), email attachments
  (`fileAttachers/Upload`), and the rich-text editor's picture upload
  (`_uploadPublicFile`). Spec U09
  [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18)
  saw this 500 on that picture upload for a picture over `post_max_size`.
  A picture over `upload_max_filesize` but under `post_max_size` fails
  for another cause, reported separately
  ([U09-A18-picture-over-upload-limit-server-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-upload-limit-server-error.md)).
- **An address that none of an API's routes matches** answers 500
  instead of 404; walked on the sections interface, OJS `main` and 3.5.
  The miss is raised before any route runs. `DecodeApiTokenWithValidation`,
  the third global middleware, calls `hasRequiredMiddleware()`
  (`classes/middleware/traits/HasRequiredMiddleware.php`, line 53), which
  calls `PKPBaseController::getRequestedRoute()` and so
  `RouteCollection::match()` (`PKPBaseController.php`, line 105). That
  throws `NotFoundHttpException` ("The route … could not be found."),
  before `ValidatePostSize`, `PolicyAuthorizer` or the dispatch, and the
  pipeline hands it to the renderer. So the catch at the end of
  `runRoutes()`, which maps it to 404, never sees it, and
  `pkp/pkp-lib#11730`'s fix, which wraps only the `authorize()` call
  inside `PolicyAuthorizer::handle()`, runs too late to catch it. The
  same holds on 3.5. Every REST interface of the three apps is routed
  this way (code): for example `…/api/v1/submissions/abc`, whose route
  also takes a number only. On 3.4 and 3.3 (Slim) a route miss reached
  `ApiAuthorizationMiddleware`, which answered `403` with
  `{"error":"api.404.endpointNotFound","errorMessage":"The requested URL was not recognized."}`
  (code): a wrong status, but no server error. The sections interface
  itself only arrived in
  [41fa40ffc8](https://github.com/pkp/pkp-lib/commit/41fa40ffc87754040bb364ec18cd8164a9600f24)
  (2024-05), so on 3.4 the comparison is on another interface, such as
  submissions. `pkp/pkp-lib#13127` logs this exception for
  `invitations/null/invite`, sent by the invitation form after a race
  that issue tracks.
- **A wrong method's 405** answers 500 the same way. Code only, not
  driven.

A separate fault gives a 500 at the sections interface's site-level
address, `/index.php/index/api/v1/sections`:
[U17-A10-sections-site-address-server-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-A10-sections-site-address-server-error.md).
It is not an HTTP exception, and this fix leaves it as it is.

## Proposed fix

A proposal; the team decides. In pkp-lib's `PKPExceptionHandler::render()`,
answer HTTP exceptions in the app's terms, before the existing
`getCode()` mapping, which stays for every other error
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-over-request-limit-server-error/fix.diff)):

```php
use Illuminate\Http\Exceptions\PostTooLargeException;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
…
if ($exception instanceof PostTooLargeException) {
    return response()->json([
        'error' => __('api.files.400.fileSize', ['maxSize' => Application::getReadableMaxFileSize()]),
    ], $exception->getStatusCode());
}
if ($exception instanceof NotFoundHttpException) {
    return response()->json([
        'error' => __('api.404.endpointNotFound'),
    ], Response::HTTP_NOT_FOUND);
}
if ($exception instanceof HttpExceptionInterface) {
    return response()->json(
        ['error' => $exception->getMessage()],
        $exception->getStatusCode(),
        $exception->getHeaders()
    );
}
```

- **An oversized request** gets the app's `api.files.400.fileSize`
  message with the limit, with status 413. That is the answer every
  other refused upload gets (`PKPBaseController::getUploadErrorResponse()`,
  `PKPTemporaryFilesController::uploadFile()`).
- **A route miss** gets `api.404.endpointNotFound`, as `runRoutes()`'s
  catch and `APIRouter::route()` answer an unknown address.
- **Any other HTTP exception** keeps its own status and headers, so a
  405 keeps its `Allow` header.

The renderer is the one place every API request's exceptions pass, the
interfaces that plugins add included. `runRoutes()`'s own catch holds
the same `getCode()` mapping, but it runs only when `report()` or
`render()` themselves throw, so the diff leaves it alone.
`ValidatePostSize` is right to keep: it stops a request whose body PHP
has already dropped.

**Tried** on `main` together with the other report's fix (see
Evidence). The oversized uploads were answered `413` "Files larger than
4MB can not be uploaded." at 4M/4M, and a 9 MB media file `413` "Files
larger than 2MB can not be uploaded." on PHP's shipped values, with no
500. `…/sections/abc` answered `404` "The requested URL was not
recognized." to `rvaca` and signed out. The controls kept their answers:
a 3 MB media file its `400`, section 1 its `200` and `…/sections/999`
its `404`. The site-level sections address, a server error that is not
an HTTP exception, kept its `500`.

**Alternatives:**

- **A PKP `ValidatePostSize` middleware** in place of Laravel's,
  answering 413 with the app's message, as
  `PKP\middleware\ValidateCsrfToken` replaces Laravel's. It mends the
  uploads but leaves every other HTTP exception answering 500.
- **The status change alone.** The answers become 413 and 404, but still
  with Laravel's English messages and no limit.

**What goes with it:**

- **API clients** get the HTTP exception's own status (413, 405, 404)
  where they got 500. No plugin hook changes and no stored data needs
  repair.
- **The size figure.** The oversized-request message names
  `Application::getReadableMaxFileSize()`, which reads
  `upload_max_filesize` alone. Where `post_max_size` is the smaller
  limit, it names a size the server does not take until the other
  report's fix is in.
- **The log** keeps a `production.ERROR` line and PHP's own "POST
  Content-Length … exceeds the limit" warning for each such upload.
  `shouldReport()` could skip HTTP exceptions under 500 if the team
  wants a refused upload kept out of the error log; not in the diff.
- **Backport to 3.5.** The renderer there is the anonymous handler in
  `PKPContainer::registerBaseBindings()`
  (`lib/pkp/classes/core/PKPContainer.php`, line 112).
- **A guard.** Unit tests for the renderer: a `PostTooLargeException`
  answers 413 with `api.files.400.fileSize`, a `NotFoundHttpException`
  404 with `api.404.endpointNotFound`, and a
  `MethodNotAllowedHttpException` 405 with its `Allow` header.

Small: one method in pkp-lib, following the status read
`PolicyAuthorizer` already uses, and a unit test. The statuses API
clients see change from 500 to the right ones.

## Evidence

- Kept scripts:
  - Uploads:
    [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js),
    `node bin/probe.js all shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js`
    (`PART=media` or `PART=panel` for one group). It sizes the files from
    the PHP limits the server runs under. Its header gives the commands
    that start the test server with other limits (an extra ini directory
    through `PHP_INI_SCAN_DIR`), the control uploads and the fix trial.
  - The route case:
    [sections-word-id-server-error/walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sections-word-id-server-error/walk.js),
    `node bin/probe.js ojs shared/playwright/checks/issues/sections-word-id-server-error/walk.js`.
    It also opens the site-level sections address as `admin`, to check
    that a server error that is not an HTTP exception stays a 500.
  - The fix trial applied this report's fix.diff and the other report's
    as one diff: `cat shared/playwright/checks/issues/{upload-over-request-limit-server-error,files-panel-limit-ignores-request-limit}/fix.diff > /tmp/a21-both.diff`,
    `node bin/try-fix.js apply /tmp/a21-both.diff <apps>`, the walks,
    then `node bin/try-fix.js revert <apps>`.
- The walks ran in headless Chromium on PHP 8.3's built-in server, on
  PKP's default datasets from pkp/datasets 38ab955 (2026-09-30),
  PostgreSQL. Limits below are `upload_max_filesize`/`post_max_size`.
  Media: `main`, three apps, with 2M/8M and with 4M/4M. Files panel:
  `main` OJS and OMP with 4M/4M; 3.5 OJS and OMP with 4M/4M. The route
  case: OJS `main` and 3.5.
- Fix trials, both halves in each time:
  - The first renderer version (status only, no `NotFoundHttpException`
    branch, no headers) on `main`, three apps, at 4M/4M, 8M/4M and
    2M/8M. The current diff on OJS `main`: the media window and the
    Files panel at 4M/4M, and the route case on PHP's shipped limits.
  - Which half each observation belongs to: the 413 answers and their
    message are this report's fix. At 4M/4M and at 2M/8M the other
    half leaves the size figure unchanged, since it changes the figure
    only where `post_max_size` is the smaller limit, so these readings
    are this half's alone. The route answers are this half's. The 8M/4M
    reading (the panel refusing the file before sending it) belongs to
    the other report.
- Unverified: this half alone at 8M/4M, where its message would name
  8 MB (read in the code, not walked). OMP and OPS were not walked again
  with the current diff; the renderer change since the first version
  touches only exceptions other than `PostTooLargeException`.
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
    `PKPRoutingProvider::$globalMiddleware`,
    `DecodeApiTokenWithValidation::handle()`, `HasRequiredMiddleware`,
    `PKPBaseController::getRequestedRoute()`, Laravel's
    `ValidatePostSize`, `PolicyAuthorizer::handle()`,
    `Application::getReadableMaxFileSize()`, and Laravel's
    `Illuminate\Routing\Pipeline`.
  - 3.5: the renderer in `PKPContainer` (line 112, the same `getCode()`
    mapping), `ValidatePostSize` in the global middleware,
    `DecodeApiTokenWithValidation::handle()` calling
    `hasRequiredMiddleware()` (line 64).
  - 3.4 and 3.3: Slim API (3.12.5 on 3.4), no Laravel router or
    `ValidatePostSize`. A route miss leaves the Slim request without a
    route, and `ApiAuthorizationMiddleware::_authorize()` answers it
    through `APIRouter::handleAuthorizationFailure()` (`403`,
    `api.404.endpointNotFound`); the submissions routes take
    `{submissionId:\d+}`. `PKPTemporaryFilesHandler::uploadFile()` and
    `PKPSubmissionFileHandler` answer an empty `$_FILES` with 400
    `api.files.400.noUpload`; the CSRF check reads the header, so an
    emptied body passes it. Whether the submission-files route's
    authorization, which reads the file stage from the body, answers
    first with a 4xx of its own was not traced.
- Introduced: `git log -S` on the `getCode()` mapping and on
  `ValidatePostSize` both lead to 71e79e31e3; the later commits on those
  lines kept the logic: 7c60718065 (a re-lint), 5b34729cfd (the
  Laravel auth integration, `pkp/pkp-lib#9596`, which only re-indented
  these lines) and 6516f3673d (the move to `PKPExceptionHandler` on
  `main`). 71e79e31e3 is on `stable-3_5_0` and not on `stable-3_4_0`.
  The route lookup in `DecodeApiTokenWithValidation` came with
  97aa9f2eb2 (`pkp/pkp-lib#10342`, 2024-08); before it the miss was
  raised at the dispatch, inside the same pipeline.
  `pkp/pkp-lib#11730`'s fix is 27f5f18108.
- Upstream (2026-09-30): pkp/pkp-lib searched for "POST data is too
  large", "Invalid JSON response", "PostTooLargeException", "too large"
  with 500, and the exception handler's `getStatusCode`; for the route
  case, pkp/pkp-lib, pkp/ojs and pkp/ui-library for "could not be found"
  with route, `NotFoundHttpException`, "method not allowed" and
  `PKPExceptionHandler`. `pkp/pkp-lib#1114`, `#8541` and `#9478` were
  read; none is the same fault.
- Not driven: OPS on 3.5 (no Files panel or Media page); 3.4 and 3.3;
  the other API uploads, the other interfaces' route misses and the
  wrong-method case in Cause's reach; MySQL.
