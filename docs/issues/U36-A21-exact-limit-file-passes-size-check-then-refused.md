# A file at the server's size limit passes the upload check, then is refused after uploading

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS (the submission wizard's files list: OJS, OMP)
  - 3.5: OJS, OMP, OPS (the files list: OJS, OMP)
  - 3.4: OJS, OMP, OPS (code; refused with "No file to be uploaded could be found with the request.")
  - 3.3: OJS, OMP, OPS (code; refused the same way)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U36 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a21); the server error the refusal ends in on `main` and 3.5 is [U09-A18-picture-over-request-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-request-limit-server-error.md)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

An author adds a file in the submission wizard's "Upload Files", or a
manager uploads a logo in the website settings. The upload checks the
file against the server's per-file limit before sending it: a larger
file is refused at once ("File is too big (9MiB). Max filesize:
8MiB."). On a server whose request limit is no larger than its
per-file limit, a file that passes this check can still be too large
for the request. It uploads to 100% and is then refused; on `main` and
3.5 the refusal is a server error, "The POST data is too large.".

Which files: those whose size plus the few hundred bytes the request
adds (421 in the walk) is over the request limit. With the two limits
equal, that is a file within a few hundred bytes of the limit, up to
exactly the limit. With the request limit set lower, it is every file
between the two limits.

## Impact

- **Lost**: no content; the file is not stored, and the whole upload
  was sent for nothing.
- **Who**: authors and editors adding submission files (journals and
  presses), and managers uploading a logo, image or file in the
  settings forms, on a server set up as above. PHP's own defaults (2M
  per file, 8M per request) are not affected; the PHP manual says the
  request limit "must be larger than upload_max_filesize" to upload
  large files. How many servers are set otherwise is not known.
- **Way round**: a slightly smaller file, or the server's
  administrator raises `post_max_size` above `upload_max_filesize`.

Medium: a task fails for a file the screen accepted, and the user
learns it only after the whole upload; it rests on a narrow input in
a setup that goes against PHP's advice, which keeps it from rising.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`.
- The web server's PHP with the two limits equal and errors kept out
  of the answer: `upload_max_filesize = 8M`, `post_max_size = 8M`,
  `display_errors = Off` (with `display_startup_errors = On` as well,
  PHP prints its warning into the answer and the row reads "Invalid
  JSON response from server." instead). In php.ini, or on a
  development install
  `php -d upload_max_filesize=8M -d post_max_size=8M -d display_errors=Off -S …`.
- A file of exactly 8 MiB (8388608 bytes), named `manuscript.pdf`, and
  one named `logo.png` (OPS has no files list; take the logo steps).

Submission file (OJS, OMP):

1. Sign in as `zzedd` (password `zzeddzzedd`), an author.
2. Open `/index.php/publicknowledge/en/submission` ("Make a
   Submission"): type a title, choose a "Submission Language" (and on
   OJS a "Section"), tick the checklist and privacy boxes, and press
   "Begin Submission". [3.5: the wizard opens on "Details"; press
   "Continue".]
3. On "Upload Files", press "Add File" and choose `manuscript.pdf`.
4. Read the file's row.

Logo (OJS, OMP, OPS):

1. Sign in as `rvaca` (password `rvacarvaca`), the manager.
2. Open Settings › Website › "Appearance" › "Setup".
3. Under "Logo", press "Upload File" and choose `logo.png`.
4. Read the box.

**Expected**: the file is refused at once, as a larger one is, naming
a limit the server can take, and nothing is sent. With the proposed
fix the row and the box read "File is too big (8MiB). Max filesize:
7MiB.".

**Observed**: the file is sent in full; the upload answers 500
`{"error":"The POST data is too large."}` (`POST
…/api/v1/submissions/{id}/files` for the row, `POST
…/api/v1/temporaryFiles` for the logo). The row fills to "Uploading
100% complete" and then reads "The POST data is too large."; the logo
box shows an error marker with no text, and the form "Please correct
one error.". Nothing is stored. The server log reads:

```
PHP Warning:  POST Content-Length of 8389029 bytes exceeds the limit of 8388608 bytes in Unknown on line 0
```

A file of 9 MiB is refused at once, and a file of 1 MiB is stored.

## Cause

The uploads give Dropzone `maxFilesize` from
`Application::getIntMaxFileMBs()`: the wizard's files list
(`pages/submission/PKPSubmissionHandler.php` line 585), the Vue forms'
`FieldUpload` (`classes/components/forms/FieldUpload.php` line 46,
the logo box) and the email window's attachments
(`classes/components/fileAttachers/Upload.php` line 54). Dropzone
refuses only a file larger than it (`file.size > maxFilesize *
1048576`).

`getIntMaxFileMBs()` (`classes/core/PKPApplication.php` lines 671–684)
converts `upload_max_filesize` alone. It does not read
`post_max_size`, and the request carries the file plus the form's
other fields and the multipart framing. `getReadableMaxFileSize()`
(line 663), which supplies the size in the API's "Files larger than …
can not be uploaded." message, reads `upload_max_filesize` the same
way.

Reach:

- The files list and the logo box walked; the other `FieldUpload`
  boxes (images, style sheets, favicon) and the email attachments take
  the same value (read in the code).
- The workflow's legacy uploader (plupload, `js/controllers/UploaderHandler.js`
  line 263) reads `$.pkp.cons.UPLOAD_MAX_FILESIZE`, the raw
  `upload_max_filesize` (read in the code).
- "Upload Media File" and the picture button set no size at all
  (U09-A18-picture-over-request-limit-server-error).

## Proposed fix

Have `PKPApplication` compute the largest file one request can carry,
the smaller of `upload_max_filesize` and `post_max_size` less a
margin, and derive `getIntMaxFileMBs()` and `getReadableMaxFileSize()`
from it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/exact-limit-file-passes-size-check-then-refused/fix.diff)):

```diff
+    public const UPLOAD_REQUEST_MARGIN = 65536;
+
+    public static function getMaxFileBytes(): int
+    {
+        $fileLimit = ini_parse_quantity(UPLOAD_MAX_FILESIZE);
+        $requestLimit = ini_parse_quantity((string) ini_get('post_max_size'));
+        // post_max_size 0 means no request limit
+        if ($requestLimit > 0) {
+            $fileLimit = min($fileLimit, $requestLimit - self::UPLOAD_REQUEST_MARGIN);
+        }
+        return max($fileLimit, 0);
+    }
```

```diff
     public static function getIntMaxFileMBs(): int
     {
-        …
+        $bytes = static::getMaxFileBytes();
+        // Never 0 while there is a limit: Dropzone reads a maxFilesize of 0 as "no size check"
+        return $bytes > 0 ? max(1, intdiv($bytes, 1048576)) : 0;
     }
```

The margin, 64 KiB, leaves room for the form's other fields and the
multipart framing (421 bytes in the walk), with headroom for long file
names and other forms' fields. Since the result is floored to whole
MiB, with both limits at 8M the check becomes 7 MiB: that is where
"Max filesize: 7MiB." comes from. The floor of 1 keeps the browser's
check on when `post_max_size` is under 1 MiB plus the margin.
`getReadableMaxFileSize()` keeps `upload_max_filesize` as written
when the request limit leaves room for it, and otherwise names the
computed megabytes. `ini_parse_quantity()` replaces the method's own
unit parsing (pkp-lib requires PHP 8.2). Every caller uses the value
as the largest file the server takes, so the fix belongs in this one
class.

Tried on `main`: with both limits at 8M, the 8 MiB file is refused at
once with "File is too big (8MiB). Max filesize: 7MiB." in the files
list (OJS, OMP) and the logo box (OJS, OMP, OPS), and nothing is sent.
The control, with the fix in and out: on PHP's default limits a 3 MB
file is still refused in the browser against 2 MiB, a 1 MiB file is
still stored, and the media window still answers a 3 MB file with
"Files larger than 2MB can not be uploaded."; with both limits at 8M
a 1 MiB file and a 1 MiB logo are still stored. With
`upload_max_filesize = 2M` and `post_max_size = 1M`, a 0.5 MiB file is
stored either way, and a 1.5 MiB file is refused in the browser
("Max filesize: 1MiB.") with the fix, where without it it is sent and
fails.

**Alternatives**

- Compare with `>=` in the browser: it catches a file of exactly the
  limit, not one a few bytes under it, nor the files between the two
  limits when `post_max_size` is the smaller.
- A fractional limit (in MiB) so the margin costs less than a
  megabyte: `getIntMaxFileMBs()` is typed `int` and its callers pass it
  on as is; worth it only if the lost fraction matters.

**What goes with it**

- What it touches: on servers whose `post_max_size` does not leave
  room for `upload_max_filesize`, every upload's check and the API's
  size message state the smaller limit, and plugins calling either
  method get it too. A file within the margin of the old limit is
  refused in the browser where some would have gone through. A limit
  under 1 MiB (`upload_max_filesize = 512K`) now gets a 1 MiB check
  where today there is none. On PHP's defaults nothing changes.
- The legacy uploader: passing `Application::getMaxFileBytes()` to the
  page as plupload's limit (it takes bytes) would cover it; the diff
  leaves the `UPLOAD_MAX_FILESIZE` page constant alone, since plugins
  may read it.
- The server error itself is U09-A18-picture-over-request-limit-server-error's
  to fix.
- Backport: `stable-3_5_0` has the same method and needs PHP 8.2, so
  the diff fits; 3.4 and 3.3 support older PHP, without
  `ini_parse_quantity()`, so the existing parsing stays there.
- Guard: a pkp-lib unit test of both methods with the two settings
  equal, `post_max_size` below `upload_max_filesize`, under 1 MiB, and
  0.

Small: one class in pkp-lib and a unit test, tried.

## Evidence

- The kept script, shared with U09-A18-picture-over-request-limit-server-error:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/file-over-request-limit-server-error/lib.js).
  Its `MODE=exact` takes these Steps through a second `php -S` of the
  same install with both limits at 8M, and `MODE=nbexact` the control,
  walked with the fix in and out:
  `MODE=exact PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/file-over-request-limit-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5.
- Walked 2026-10-02 on PostgreSQL and PHP 8.3.33; the fault does not
  touch the database. The files list on OJS and OMP, the logo on OJS,
  OMP and OPS, `main` and `stable-3_5_0`. Datasets: pkp/datasets
  c657990 (2026-10-01).
- Code reads. `main` and 3.5: the method and callers named in Cause;
  `UPLOAD_MAX_FILESIZE` from `ini_get('upload_max_filesize')` (main
  `PKPApplication.php` line 764); Dropzone's check in the built
  `js/build.js`. 3.4 (`origin/stable-3_4_0`): the same method (line
  708) feeds the files list (`PKPSubmissionHandler` line 444),
  `FieldUpload` (line 40) and the attachments; with an empty `$_FILES`
  the Slim handlers answer 400 `api.files.400.noUpload`
  (`PKPSubmissionFileHandler::add()` line 271,
  `PKPTemporaryFilesHandler::uploadFile()` line 101). 3.3
  (`origin/stable-3_3_0`): the same method (line 859) feeds the files
  list of the wizard's step 2 on OJS and OMP
  (`PKPSubmissionSubmitStep2Form` line 103) and `FieldUpload` (line
  33); the handlers answer the same way (`add()` line 250,
  `uploadFile()` line 81).
- How common the setup is: PHP's `php.ini-production` and built-in
  defaults are 2M and 8M; the PHP manual's `post_max_size` entry: "To
  upload large files, this value must be larger than
  upload_max_filesize." No source for hosting presets was checked.
- Introduced: `git log -S getIntMaxFileMBs` gives 5f3be929e6 as the
  commit that added the method, reading `upload_max_filesize` alone;
  `git blame` on `main` gives fd9c2aa1a6 (`pkp/pkp-lib#8548`, its unit
  parsing) and e3f570bc37 (formatting).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library):
  "post_max_size", "upload_max_filesize dropzone", "Max filesize",
  "File is too big", `getIntMaxFileMBs`, `getReadableMaxFileSize`.
  Read and not the same fault: `pkp/pkp-lib#8541` (unit parsing),
  `pkp/pkp-lib#1114`.
- Tips: OJS `main` b84f8e2e44 with lib/pkp ddd8ab243a; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7 with lib/pkp 3dc90c81a6.
  `stable-3_5_0` OJS 091fb65453, OMP 9c5e24246 and OPS 38b61882d3, with
  lib/pkp cf3f984335. `stable-3_4_0` lib/pkp 32b0f4b4af (OJS 75cc2d488b,
  OMP 0aec65441, OPS acd8ae704b); `stable-3_3_0` lib/pkp f6ab331645
  (OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161).
