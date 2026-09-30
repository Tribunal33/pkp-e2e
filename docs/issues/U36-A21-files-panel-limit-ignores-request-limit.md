# The submission wizard's Files panel accepts files larger than the server can take, then fails

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP
  - 3.5: OJS, OMP
  - 3.4: OJS, OMP (code)
  - 3.3: OJS, OMP (code)
- **Introduced** not traced; present since at least [5f383f87c3](https://github.com/pkp/pkp-lib/commit/5f383f87c30496e3de612aeb1bb2f4f5f80f4629) (2020-10-19)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U36 [A21](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U36-submission-files.md#a21) (its panel limit)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

The submission wizard's "Files" panel refuses in the browser any file
over PHP's `upload_max_filesize` ("File is too big (9MiB). Max filesize:
8MiB."). The server also refuses any request over `post_max_size`, and a
request carries the file and the form's fields. On an install whose
`post_max_size` is no larger than `upload_max_filesize`, the panel
therefore lets through files the server cannot take. Every file between
the two limits fails after it is sent, and when the limits are equal,
a file of exactly the panel's limit fails too.

The author is refused with a message that names no limit: on 3.5 and
`main` a server error, "The POST data is too large." ([a separate
report](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U36-A21-upload-over-request-limit-server-error.md)),
and on 3.4 and 3.3 "No file to be uploaded could be found with the
request.". The author has been told a larger size is allowed and cannot
tell which size will pass.

PHP ships with `upload_max_filesize` 2M and `post_max_size` 8M, where
this does not happen. An install lands in it when an administrator
raises `upload_max_filesize` without raising `post_max_size` above it.

## Impact

- **Lost:** nothing is stored. The author's upload fails, and the
  limit the panel states is wrong.
- **Who:** authors adding submission files, on installs whose
  `post_max_size` is no larger than `upload_max_filesize`, for every
  file between the two limits.
- **Way round:** a smaller file, by trial, since no message gives the
  real limit. An administrator removes the fault by setting
  `post_max_size` above `upload_max_filesize`, with room for the form's
  fields.

Medium: submitting fails for a range of file sizes the panel says are
allowed, on a setup that is not the default, and a smaller file gets
round it. It would be high if the default settings reached it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP), on a server whose
  PHP has `upload_max_filesize` 8M and `post_max_size` 4M, set in its
  php.ini. `php -i | grep -E 'upload_max|post_max'` on the server shows
  them.
- Two files: one of exactly 8 MiB and one of 9 MiB.

1. Sign in as `ccorino` (OMP: `aclark`).
2. Open "Start A New Submission" (`/index.php/publicknowledge/en/submission`).
3. Choose "English" under "Submission Language", type the title
   "u36r6 upload limit", choose "Articles" under "Section" (OJS only),
   tick "Yes, my submission meets all of these requirements." and "Yes,
   I agree to have my data collected and stored according to the privacy
   statement.", and press "Begin Submission". The wizard opens on
   "Upload Files" [3.5: on "Details"; press "Continue"].
4. In "Files", press "Add File" and choose the 8 MiB file.
5. Press "Add File" again and choose the 9 MiB file.

**Expected:** the panel states the size one request can carry, 4 MiB,
and refuses both files in the browser. Step 4's row reads "File is too
big (8MiB). Max filesize: 4MiB.".

**Observed:** step 4's file is sent. Its row reads "The POST data is
too large.", and `POST …/api/v1/submissions/{id}/files` answers `500`.
Step 5's row reads "File is too big (9MiB). Max filesize: 8MiB.": the
panel states 8 MiB. The reopened draft has no file.

With both limits at the same value (walked at 4M/4M and at 100M/100M),
a file of exactly that size is sent and fails the same way (on 3.5 as
on `main`). On PHP's shipped values (2M/8M) a file of exactly 2 MiB is
stored.

## Cause

The size every upload screen states comes from the constant
`UPLOAD_MAX_FILESIZE`, defined from `upload_max_filesize` alone
([`PKPApplication.php` line 764](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/classes/core/PKPApplication.php#L764)).
`Application::getIntMaxFileMBs()` turns it into megabytes, and
`PKPSubmissionHandler` passes that to the Files panel as `maxFilesize`
([line 585](https://github.com/pkp/pkp-lib/blob/2e377d27fc38dc0706d0a60678cd690a295e7b12/pages/submission/PKPSubmissionHandler.php#L585)),
which the panel's Dropzone checks and names in its refusal.

A file must also fit, with the form's fields, into `post_max_size`, and
PHP drops the body of a larger request. So the largest file one request
can carry is the smaller of the two limits, less the form's fields. The
constant ignores `post_max_size`. That is where it goes wrong: the
figure the app states and checks is not the figure the server enforces.
On PHP's shipped values it never shows, because the file limit is the
smaller one.

The constant has read `upload_max_filesize` alone as far back as the
history shows, and the Files panel took its limit from it when it was
introduced in 5f383f87c3 (`pkp/pkp-lib#6057`, 3.3).

Reach (code):

- **Other screens that state the same figure:** the settings pages'
  upload fields (`FieldUpload`), email attachments
  (`fileAttachers/Upload`), the size message the API gives a refused
  upload (`PKPBaseController`, `getReadableMaxFileSize()`), and the
  legacy uploader, which reads `UPLOAD_MAX_FILESIZE` through
  `PKPTemplateManager`. Each accepts, or names, sizes the server cannot
  take on such an install.
- **The media window** passes no `maxFilesize` at all, so any file up
  to Dropzone's own 256 MiB reaches the server. That is covered by the
  other report's server answer.
- **OPS** has no Files panel: its wizard adds preprint files as
  galleys.

## Proposed fix

A proposal; the team decides. Define `UPLOAD_MAX_FILESIZE` as the
smaller of `upload_max_filesize` and `post_max_size`, so every screen
states and checks the size one request can carry
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/files-panel-limit-ignores-request-limit/fix.diff)):

```diff
-define('UPLOAD_MAX_FILESIZE', trim(ini_get('upload_max_filesize')));
+// The largest file one upload request can carry: PHP's upload_max_filesize,
+// or post_max_size when that is smaller (the request also carries the form)
+define('UPLOAD_MAX_FILESIZE', (function (): string {
+    $fileMax = trim(ini_get('upload_max_filesize'));
+    $postMax = trim(ini_get('post_max_size'));
+    return ini_parse_quantity($postMax) > 0 && ini_parse_quantity($postMax) < ini_parse_quantity($fileMax)
+        ? $postMax
+        : $fileMax;
+})());
```

The constant is what every size check and message reads, so one
definition covers them all. A `post_max_size` of 0 means no limit, and
the definition then keeps `upload_max_filesize`. `ini_parse_quantity()`
needs PHP 8.2, which `main` and 3.5 require.

**Tried** on OJS `main` with `upload_max_filesize` 8M and
`post_max_size` 4M, together with the other report's fix (see
Evidence). The panel refused the 8 MiB file in the browser, "File is
too big (8MiB). Max filesize: 4MiB.", and sent nothing. On PHP's shipped
values a 2 MiB file was stored as before.

**Alternatives:**

- **Headroom in the panel's check** for the form's fields, in
  ui-library. It would refuse a file of exactly the limit when both
  limits are equal, but leaves the stated figure wrong wherever
  `post_max_size` is the smaller one.
- **A note for administrators** to keep `post_max_size` above
  `upload_max_filesize`. It helps installs that read it; the app would
  still state a size it cannot take.

**What goes with it:**

- **The equal case.** With both limits equal the constant is unchanged,
  so a file of exactly the limit still passes the panel and is refused
  by the server. Headroom for the form's fields in the panel's check (a
  ui-library change) would close it; not in the diff.
- **What changes for others.** On installs where `post_max_size` is the
  smaller limit, every upload screen's figure drops to it, and so does
  the size in the API's refusal message. Plugins that read the constant
  get the smaller figure too.
- **Backport.** 3.5 takes the same change. 3.4 and 3.3 need a byte
  parser in place of `ini_parse_quantity()` (3.4 supports PHP 8.0, 3.3
  PHP 7.3).
- **A guard.** A unit test for the constant with `post_max_size` below
  `upload_max_filesize`.

Small: one definition in pkp-lib, and a unit test.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js),
  shared with the other report, run with `PART=panel`:
  `PHP_INI_SCAN_DIR=:<dir with a .ini setting the limits> PART=panel node bin/probe.js ojs shared/playwright/checks/issues/upload-over-request-limit-server-error/walk.js`.
  It sizes its files from the limits the server runs under: one of
  exactly `upload_max_filesize` and one 1 MiB larger. Its header gives
  the commands that restart the test server with other limits.
- The walks ran in headless Chromium on PHP 8.3's built-in server, on
  PKP's default datasets from pkp/datasets 38ab955 (2026-09-30),
  PostgreSQL. Limits are `upload_max_filesize`/`post_max_size`. `main`:
  OJS at 8M/4M; OJS and OMP at 4M/4M and at 2M/8M; OJS at 100M/100M
  (100 MiB and 101 MiB files, the sizes of the spec's first sighting).
  3.5: OJS and OMP at 4M/4M.
- The fix trial applied this report's fix.diff and the other report's
  as one diff:
  `cat shared/playwright/checks/issues/{upload-over-request-limit-server-error,files-panel-limit-ignores-request-limit}/fix.diff > /tmp/a21-both.diff`,
  `node bin/try-fix.js apply /tmp/a21-both.diff ojs`, the walk at 8M/4M
  and at 2M/8M, then `node bin/try-fix.js revert ojs`. The 8M/4M
  reading (the panel refusing the 8 MiB file with "Max filesize: 4MiB")
  is this half's: the other half changes only the server's answer, and
  nothing was sent. The 2M/8M reading is a control for both.
- Branch tips:
  - main: OJS bade233f73 (pkp-lib 2e377d27fc); OMP 3b0ecf794 (pkp-lib
    3dc90c81a6); ui-library 280f98c5.
  - stable-3_5_0: OJS 92b9a16b48, OMP 3081c9b00 (pkp-lib a9c76aed62).
  - stable-3_4_0: OJS 9571d8fde7, OMP 0aec65441 (pkp-lib df13621c2d).
  - stable-3_3_0: OJS 9fdb9bcf9a, OMP 8e72fc883 (pkp-lib d446601ebe).
- Code reads:
  - main and 3.5: `UPLOAD_MAX_FILESIZE` (`PKPApplication.php`, line 764
    on `main`, 812 on 3.5), `getIntMaxFileMBs()`,
    `getReadableMaxFileSize()`, `PKPSubmissionHandler` (the panel's
    `maxFilesize`), `FieldUpload`, `fileAttachers/Upload`,
    `PKPTemplateManager`; OPS's `SubmissionHandler` (galleys, no Files
    panel).
  - 3.4: `PKPSubmissionHandler` passes `maxFilesize` from
    `getIntMaxFileMBs()`, which reads `UPLOAD_MAX_FILESIZE`, defined
    from `upload_max_filesize` alone. The upload handlers answer an
    emptied request with 400 `api.files.400.noUpload`.
  - 3.3: `PKPSubmissionSubmitStep2Form` passes `maxFilesize` the same
    way, and the constant is the same.
- Introduced: `git log -S` on `getIntMaxFileMBs` in pkp-lib's
  `stable-3_3_0` gives 5f3be929e6 (2018, the settings upload field) and
  5f383f87c3 (2020, the submission files panel);
  677f7a0d2e (2019) changed the constant's `define_exposed()` to
  `define()`; the older form already read `upload_max_filesize` alone,
  and its first commit was not traced.
- Upstream (2026-09-30): pkp/pkp-lib searched for "post_max_size",
  "upload_max_filesize" and "upload limit"; pkp/ojs for
  "post_max_size"; pkp/ui-library for "maxFilesize". `pkp/pkp-lib#1114`,
  `#8541` and `#9478` were read; none is the same fault.
- Unverified: 3.4 and 3.3 were read in the code, not walked, and what
  their panel's row showed for the 400 was not seen. How many installs
  have `post_max_size` at or below `upload_max_filesize` is not known.
- Not driven: the other screens in Cause's reach; MySQL (the fault does
  not touch the database).
