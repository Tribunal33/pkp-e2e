# Uploading a picture larger than the server's file limit shows "Path must not be empty", not the limit

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#5237` for `pkp/pkp-lib#4890` · [a09aa46d19](https://github.com/pkp/pkp-lib/commit/a09aa46d196539078b29ae8426a1384d86147d2a) · 2019-10-31 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U09 [A18](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a18); pictures over the request limit (8 MB by default) are [U09-A18-picture-over-request-limit-server-error](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U09-A18-picture-over-request-limit-server-error.md)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A manager uploads a picture through "Insert/edit image" in a formatted
text box. When the picture is larger than the server's limit for one
uploaded file, the application fails on the server. The editor's alert
over the "Insert/Edit Image" window reads "Path must not be empty" for
a PNG, JPEG or GIF picture, or "One or more files could not be
uploaded." for a WEBP one.

The manager expects "Files larger than 2MB can not be uploaded.", the
message the application already gives for a file over that limit on
its other uploads. Neither message on screen says the picture is too
large, so the manager cannot tell that a smaller copy would go in. In
the custom page window, which has a "Path" box of its own, the first
message points at the wrong field.

The limit is the web server's PHP setting; PHP's default is 2 MB. On a
server set to a higher per-file limit, the same messages show for
pictures between that limit and the server's request limit. A picture
above the request limit gets another error, the subject of the sibling
report.

## Impact

- **Lost**: no content. The picture is neither stored nor inserted.
- **Who**: journal managers, and editors whose role may change
  settings, wherever a formatted text box has a picture button: custom
  pages, custom blocks, static pages, announcements, and the journal's
  masthead, information, privacy and appearance texts. It happens each
  time a picture is larger than the per-file limit.
- **Way round**: make the picture smaller than the limit and upload it
  again.

Medium: a settings task fails with a server error and a misleading
message, and its way round is one the manager has to guess.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. The steps are the same in OJS,
  OMP and OPS, and on `stable-3_5_0`.
- The web server's PHP at PHP's default upload limits:
  `upload_max_filesize = 2M` and `post_max_size = 8M`, the values
  `php.ini-production` and `php.ini-development` ship. On a development
  install whose php.ini raises them, serve the app with
  `php -d upload_max_filesize=2M -d post_max_size=8M -S …`, or set the
  two lines in php.ini.
- Two pictures larger than 2 MB and smaller than 8 MB: a PNG (the walk
  used one of 3 MB) and a WEBP (4 MB).

Steps:

1. Sign in as `rvaca` (password `rvacarvaca`), the journal manager
   (press manager, preprint server manager).
2. Open Settings › Website › "Setup" › "Navigation".
3. Under "Navigation Menu Items", press "Add item".
4. In "Navigation Menu Type", choose "Custom Page".
5. In the bar of the "Content" box, press "Insert/edit image". The
   window "Insert/Edit Image" opens.
6. On its "Upload" tab, press "Browse for an image" and choose the PNG.
7. Read the alert that opens over the window, and press "OK".
8. Press "Browse for an image" again, choose the WEBP, and read the
   alert.

**Expected**: both times the alert reads "Files larger than 2MB can not
be uploaded.", and nothing is inserted.

**Observed**: for the PNG the alert reads "Path must not be empty". The
upload answers 500:

```
POST /index.php/publicknowledge/api/v1/_uploadPublicFile
→ 500 {"error":"Path must not be empty"}
```

The server log reads:

```
production.ERROR: Path must not be empty {"exception":"[object] (ValueError(code: 0): Path must not be empty at …/lib/pkp/api/v1/_uploadPublicFile/PKPUploadPublicFileController.php:185)
```

For the WEBP the alert reads "One or more files could not be uploaded."
(status 400).

A 1 KB PNG goes in as usual, and a text file named ".png" gets "The
image you uploaded is not valid.".

## Cause

When a file is larger than `upload_max_filesize`, PHP still lists it in
`$_FILES`, with `error` set to `UPLOAD_ERR_INI_SIZE`, an empty
`tmp_name` and a `size` of 0. `PKPUploadPublicFileController::uploadFile()`
(pkp-lib `api/v1/_uploadPublicFile/PKPUploadPublicFileController.php`)
never reads that `error` before it uses the file.

The space check adds the `size` of 0 and passes (line 150). For a
`gif`, `jpg` or `png` name the method then calls
`getimagesize($_FILES['file']['tmp_name'])` with the empty name (line
185). Since PHP 8.0 that throws a `ValueError`, which the API answers
with status 500 and the exception's message.

A `webp` name skips that check, so `FileManager::uploadFile()` runs and
fails. The error lookup after it, meant to answer
`api.files.400.fileSize`, asks `uploadError($filename)` and
`getUploadErrorCode($filename)` with the cleaned file name
(`photo.webp`) instead of the form field `file` (line 203).
`$_FILES['photo.webp']` does not exist, so the lookup finds no error
and the generic `api.files.400.uploadFailed` answers.

So the upload's error code is never checked before its temporary file
is used. Before PHP 8.0, `getimagesize('')` returned false, so a PNG
answered "The image you uploaded is not valid."; the size message was
never reachable.

Reach:

- Every formatted text box with a picture button uploads here: the
  legacy forms' boxes through `SiteHandler.js` (a custom page walked;
  custom blocks and static pages read in the code), and the Vue forms'
  `FieldRichTextarea` (`PKPMastheadForm`, `PKPInformationForm`,
  `PKPPrivacyForm`, `PKPAppearanceSetupForm`,
  `PKPAppearanceAdvancedForm`, `PKPAnnouncementForm`; read in the
  code).
- The site's own boxes (Administration) upload to the site's address of
  the same endpoint (read in the code).
- PNG and WEBP walked; JPEG and GIF take the PNG's branch (read in the
  code).

## Proposed fix

Check the upload's error code right after the check that a file was
sent, with the helper the base controller already has, as
`PKPSubmissionFileController::add()` and `edit()` and
`PKPJatsController::add()` do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/fix.diff)):

```diff
+        // A file over upload_max_filesize arrives with an error code and no temporary file
+        if ($_FILES['file']['error'] !== UPLOAD_ERR_OK) {
+            return $this->getUploadErrorResponse($_FILES['file']['error']);
+        }
```

Then drop the error lookup after `uploadFile()`: it can no longer meet
an upload error, and it asked with the wrong key. Its fallback,
`api.files.400.uploadFailed`, stays. `getUploadErrorResponse()`
answers `UPLOAD_ERR_INI_SIZE` and `UPLOAD_ERR_FORM_SIZE` with "Files
larger than {maxSize} can not be uploaded." (400), and the other codes
with the same messages the removed switch held.

Tried on `main` on the three apps: with the fix, the PNG and the WEBP
both get "Files larger than 2MB can not be uploaded." (400), with no
server error. A 1 KB PNG is still stored, and a text file named ".png"
still gets "The image you uploaded is not valid.".

**Alternatives**

- Correct only the key in the existing lookup (`'file'` for
  `$filename`). The WEBP would get the size message, but a PNG, JPEG or
  GIF would still reach `getimagesize('')` first and fail.
- Guard `getimagesize()` alone. That removes the server error but still
  answers with the wrong message.

**What goes with it**

- The same mistake elsewhere: none. `PKPSubmissionFileController` and
  `PKPJatsController` check `$_FILES['file']['error']` first, and
  `PKPTemporaryFilesController::uploadFile()` asks for the error with
  the right field name after a failed move.
- Order: the new check runs before the `API::uploadPublicFile::permissions`
  hook, as the sibling controllers check before their own work. A user
  a plugin refuses gets the size message rather than 403 when the file
  is over the limit, and 403 as before for any other file; nothing is
  stored either way. Moving the check below the hook works as well.
- What it touches: the endpoint answers this case with 400 and the size
  message instead of 500 or the generic message. Nothing else it
  answers changes, and nothing stored needs repair.
- Backport: `stable-3_5_0` has the same file and lines; the diff
  applies as written (not tried there). On 3.4
  (`PKPUploadPublicFileHandler.php`) and 3.3
  (`PKPUploadPublicFileHandler.inc.php`) the same code sits in Slim
  handlers, where `getUploadErrorResponse()` is a private method of
  `PKPSubmissionFileHandler` and cannot be called. The backport moves
  the handler's own error switch to the top of `uploadFile()`, keyed on
  `'file'`, answering with `$response->withStatus(400)->withJsonError(…)`
  as it does now.
- Guard: a pkp-lib unit test of `uploadFile()` with
  `$_FILES['file']['error']` set to `UPLOAD_ERR_INI_SIZE`, and the e2e
  scenario for spec U09's A18 (a **Planned** item).

Small: one check in one pkp-lib file, and a test.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js),
  with its helpers in `lib.js` beside it; the control (a 1 KB PNG and a
  text file named ".png") is in the same script, walked with the fix in
  and out. On an install freshly loaded from the default dataset, from
  a pkp-e2e checkout:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/picture-over-upload-limit-server-error/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/picture-over-upload-limit-server-error/fix.diff ojs omp ops`.
- The walking machine's php.ini raises both limits to 100M, so the
  script serves the same install through a second `php -S` with
  `-d upload_max_filesize=2M -d post_max_size=8M`
  (`startDefaultLimitsServer()` in `lib.js`).
- Walked on OJS, OMP and OPS, `main` and `stable-3_5_0`, on PostgreSQL
  and PHP 8.4.11; the fault does not touch the database. PHP 8.4 words
  the `ValueError` "Path must not be empty"; an earlier probe of the
  same steps on PHP 8.3 read "Path cannot be empty". Datasets:
  pkp/datasets c657990 (2026-10-01). PHP 7 not run.
- Code reads. `main` and 3.5: `PKPUploadPublicFileController.php` lines
  108–112, 150, 185 and 203–204, the same in each app's lib/pkp. 3.4
  (`origin/stable-3_4_0`, `PKPUploadPublicFileHandler.php` lines 140,
  171 and 185–186) and 3.3 (`origin/stable-3_3_0`,
  `PKPUploadPublicFileHandler.inc.php` lines 116, 148 and 162–163): the
  same code. 3.4 runs on PHP 8.1 and 8.2, so its PNG case fails as on
  `main`; 3.3 does too on PHP 8, and on PHP 7 answers "The image you
  uploaded is not valid.". Each app mounts the endpoint on all four
  branches.
- Introduced: `git blame` on lines 185 and 203 gives e3f570bc37
  (`pkp/pkp-lib#5678`, PSR-12 formatting only); blame at its parent
  gives a09aa46d19 for both lines.
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "Path cannot
  be empty", "upload_max_filesize", `PKPUploadPublicFileController`.
  Read and not the same fault: `pkp/pkp-lib#12745` and
  `pkp/pkp-lib#10718`.
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a; OMP `main`
  3b0ecf794 and OPS `main` c8af945bb7, both with lib/pkp 3dc90c81a6.
  `stable-3_5_0` OJS 3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e
  and OPS 8eaf899468 with lib/pkp 1fb843f491. `stable-3_4_0` lib/pkp
  32b0f4b4af (OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b);
  `stable-3_3_0` lib/pkp f6ab331645 (OJS ac77c9fb35, OMP 8e72fc883, OPS
  c5532e2161).
