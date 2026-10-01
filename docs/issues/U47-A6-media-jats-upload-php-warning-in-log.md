# Adding a media file or uploading JATS XML writes a PHP warning to the server's error log

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS (on "JATS XML"; no "Media" page)
  - 3.4: none (code; no screen sends a plain string — an API client would)
  - 3.3: none (code; no screen sends a plain string — an API client would)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 (merged 2019-01-09) · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U47 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a6), spec U48 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a20)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Two pages write a PHP warning ("foreach() argument must be of type
array|object, string given") to the web server's error log while
showing the upload as done. On `main` they are the "Media" page of a
version on a journal, a press and a preprint server ("Upload Files"),
and the "JATS XML" page on a journal ("Upload"). The warning comes once
for every file added, so "Upload Files" with three files writes three.

The file is stored and shown as expected. Only the administrator who
reads the error log meets the warning, among the ones that matter.

The faulty code dates from 2018, but only these two newer pages reach it
from a screen. 3.5 has the "JATS XML" page and no "Media" page, so there
it shows on a journal only; 3.4 and 3.3 have neither page, so no screen
shows it there.

## Impact

- **Lost:** nothing.
- **Who:** the editors and managers who add media files or upload JATS
  XML, in ordinary use; only the administrator reading the error log
  sees the result.
- **Way round:** none needed. The warnings keep adding up as files are
  added.

Low: the task gets done, and the only trace is noise in the server's
error log.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP or OPS).
- The web server's PHP error log open (Apache's or nginx's PHP error
  log, or the terminal running `php -S`).

Adding a media file (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open the submission in Production: OJS 5, "Genetic transformation of
   forest trees"; OMP 4, "How Canadians Communicate: Contexts of
   Canadian Popular Culture"; OPS 1, "The influence of lactation on the
   quantity and quality of cashmere production".
3. In the side menu, under "Publication" (OPS: "Preprint"), choose
   "Media".
4. Press "Add Media File" and choose an image file (`figure.png`). On its
   card, under "What kind of media is this?" choose "Image", and under
   "File resolution type" choose "Web resolution".
5. Press "Upload Files".

Uploading JATS XML (OJS; on 3.5 too):

6. Still as `dbarnes`, on OJS submission 5, choose "JATS XML" in the side
   menu.
7. Press "Upload" and choose any XML file; the content is not checked
   (`article.xml` was used).

**Expected:** the "Media" list shows "figure.png", and the "JATS XML"
page shows the uploaded XML, with nothing written to the error log.

**Observed:** the screens show both files as expected: "figure.png" in
the list (Image, Web resolution), and on "JATS XML" the toast "Your file
has been uploaded." (none on 3.5), the uploaded XML and "Last
Modification at {date} by dbarnes". The error log holds one warning per
upload, each logged just before the access line of its request:

```
PHP Warning:  foreach() argument must be of type array|object, string given in /…/lib/pkp/classes/core/PKPBaseController.php on line 428
[200]: POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/mediaFiles
PHP Warning:  foreach() argument must be of type array|object, string given in /…/lib/pkp/classes/core/PKPBaseController.php on line 428
[200]: POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/jats
```

On 3.5 the warning names line 425. "Edit Metadata" on the added file,
with its name changed and saved, writes no warning.

## Cause

`PKPBaseController::convertStringsToSchema()` (lib/pkp
`classes/core/PKPBaseController.php`, line 428 on `main`) converts a
request's string values to the types an entity schema declares. For a
property the schema marks `multilingual`, it walks the value as a locale
map, `foreach ($paramValue as $localeKey => $localeValue)`, without
checking that the value is one. A plain string makes `foreach` warn and
skip, and the value passes through unchanged.

Two screens post a plain string for the submission file's `name`, which
the `submissionFile` schema declares multilingual:

- The "Upload Media File" window posts, for each card, the JSON the
  `temporaryFiles` upload returned, unchanged (ui-library
  `useFileMediaUploader.js`:
  `{...f.uploadedFile, temporaryFileId, genreId, variantType}`); its
  `name` is the file name. `AddMediaFiles::prepareForValidation()` runs
  `convertStringsToSchema()` on each entry. `MediaFilesController::add()`
  then accepts the string on purpose and wraps it into the submission's
  locale (`is_string($params['name'])`), so the name is stored right.
- The "JATS XML" page's `FileUploader` has no `filenameLocale`, so
  Dropzone posts `name` as a plain string. `PKPJatsController::add()`
  runs `convertStringsToSchema()` on the form fields;
  `Repo::jats()->addJatsFile()` then sets `name` from the uploaded file
  itself, so the posted one is never used.

The converter's own helper already guards this way:
`_convertStringsToSchema()` walks an `array` or `object` value only when
`is_array($value)`, and `PKPSchemaService::sanitize()` walks a
multilingual value as `(array) $propValue`.

Reach ("code" marks what was read in the code; the rest was reproduced
in the browser):
- "Upload Files" on "Media": one warning per file added (reproduced with
  one file; the loop runs per file, code).
- "Upload" on "JATS XML", the first upload and a later revision.
- Any REST API client or plugin that posts a plain string, or `null`,
  for a multilingual property to an endpoint that runs the converter
  (submissions, publications, contributors, announcements, contexts and
  the others) writes the same warning, on 3.4 and 3.3 too (code). No
  other screen does (code): the uploader that posts `name[<locale>]` is
  the submission wizard's file step (`SubmissionFilesListPanel`, with
  `filename-locale`); "Upload File" on the workflow's stage file lists
  opens the legacy upload wizard (`FileUploadWizardHandler`), which
  posts to its own handler and never reaches the converter; file
  attachments go to `temporaryFiles`, which runs no conversion.

## Proposed fix

Walk a multilingual value only when it is a locale map, and leave any
other value as sent, as the converter's helper does for arrays and
objects
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-jats-upload-php-warning-in-log/fix.diff)):

```diff
             if (!empty($schema->properties->{$paramName}->multilingual)) {
+                // Only a locale map is walked; any other value (a plain string,
+                // null) is left as sent, for the caller or the validator
+                if (!is_array($paramValue)) {
+                    continue;
+                }
                 foreach ($paramValue as $localeKey => $localeValue) {
```

The converter is the shared entry point for every API controller, and it
cannot choose what clients send; deciding whether a string is acceptable
belongs to the caller (`MediaFilesController::add()` accepts one) or to
the schema validation that follows. The output is the same as today,
since a `foreach` over a non-array already left the value untouched, so
no caller, API client or plugin sees a change beyond the missing warning.

Tried on `main` on the three apps: with the fix in, adding a media file
and uploading JATS XML wrote no warning and showed the same screens. Two
nearby actions behaved the same with the fix in and out: "Edit
Metadata" with a changed name, which posts a locale map, saved it; a
second JATS "Upload", a revision, was accepted.

**Alternatives:**
- Make each screen post a locale map: give the "JATS XML" page's
  `FileUploader` a `filenameLocale`, and have the media window post only
  `temporaryFileId`, `genreId` and `variantType`. That silences these
  two screens but leaves every API client and plugin exposed, and the
  media endpoint would still accept a string name on purpose.
- Cast with `(array) $paramValue`, as `PKPSchemaService::sanitize()`
  does. That turns a string into `[0 => 'name']`, a locale map with a
  bad key, and changes what the validator and `MediaFilesController`
  receive.

**What goes with it:**
- The fix applies as written to `stable-3_5_0`. 3.4 and 3.3 have the
  same walk in `APIHandler::convertStringsToSchema()`, reached there
  only by an API client; a backport is optional.
- A test: no test of `convertStringsToSchema()` exists. The nearest is
  lib/pkp `tests/classes/core/APIRouterTest.php`, which already builds a
  `PKPBaseController`; a new `tests/classes/core/PKPBaseControllerTest.php`
  in that setup, with a concrete anonymous subclass (the three abstract
  methods empty), calls the method on the `submissionFile` schema with
  `name` as a plain string and as `null`, and expects the value back
  unchanged with no warning (`tests/phpunit.xml` sets no
  `failOnWarning`, so the test checks for the warning itself, with
  `set_error_handler()`). An e2e check would have to read the server's error log,
  which pkp's Cypress runs do not; the unit test is the practical guard.

Small: three lines of code in one shared method, and a unit test.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-jats-upload-php-warning-in-log/walk.js)
  takes the Steps on an install freshly reset to the default dataset and
  records, for each request, the lines the server logged:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/media-jats-upload-php-warning-in-log/walk.js`
  (3.5: `PKP_E2E_LINE=stable-3_5_0` in front, OJS). It also takes the two
  nearby actions of the Proposed fix.
- The fix check: `node bin/try-fix.js apply shared/playwright/checks/issues/media-jats-upload-php-warning-in-log/fix.diff ojs omp ops`,
  reset the dataset, run the script, then `node bin/try-fix.js revert ojs omp ops`.
- The posted media entry, read from the browser:
  `{"files":[{"id":1,"name":"figure.png","mimetype":"image/png","documentType":"image","temporaryFileId":1,"genreId":10,"variantType":"web"}]}`;
  the "Edit Metadata" save posts `name[en]=…&name[fr_CA]=`.
- No request answered an error and no page script failed, on `main` or
  on `stable-3_5_0`.
- Reproduced on PostgreSQL, the default dataset of pkp/datasets `38ab955`
  (2026-09-30). The fault does not depend on the database.
- Tips: `main` OJS `bade233f73`, OMP `3b0ecf794c` and OPS `c8af945bb7`
  (lib/pkp `2e377d27fc` on OJS, `3dc90c81a6` on OMP and OPS, the method
  identical; ui-library `280f98c570`); `stable-3_5_0` OJS `92b9a16b48`
  (lib/pkp `a9c76aed62`, ui-library `1a7a4750`); `stable-3_4_0` OJS
  `9571d8fde7` (lib/pkp `df13621c2d`, ui-library `ee684b34`);
  `stable-3_3_0` OJS `9fdb9bcf9a` (lib/pkp `d446601ebe`, ui-library
  `96959f9e`).
- 3.5, reproduced on OJS: the "JATS XML" page is under "Publication"
  without a version level, and offers only "Delete" once a file exists,
  so there is no revision. `PKPJatsController::add()` makes the same
  call, and ui-library `FileUploader` posts `name` the same way.
- 3.4 (code): lib/pkp `stable-3_4_0` `classes/handler/APIHandler.php`
  line 289 has the same walk; there is no JATS or media controller, and
  ui-library's only `FileUploader` posting to a submission-file endpoint
  (`SubmissionFilesListPanel`) sets `filenameLocale`.
- 3.3 (code): lib/pkp `stable-3_3_0`
  `classes/handler/APIHandler.inc.php` line 283, the same; no JATS or
  media page.
- Introduced: `git blame` on line 428 gives 71e79e31e3 (pkp-lib, the
  move of the API to Laravel's router), which moved the method
  unchanged; `git log -S` on the `foreach` gives 5f3be929e6, which
  added `convertStringsToSchema()` to `APIHandler` with this walk. The
  first screen to post a plain string came with the JATS upload,
  [af8ad0fe08](https://github.com/pkp/pkp-lib/commit/af8ad0fe08f436034944d324ff5905a7bb65a01c)
  (2023-12-18, `pkp/pkp-lib#7505`); the media window with
  [f4eccf8b9f](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001)
  (2026-02-13, `pkp/pkp-lib#12251`) and ui-library
  [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4)
  (2026-05-06, `pkp/pkp-lib#12262`).
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library for
  `convertStringsToSchema`, `PKPBaseController` with warning,
  "foreach() argument must be of type", JATS upload warning, media files
  warning and `AddMediaFiles`. `pkp/pkp-lib#11494` (closed) is the same
  PHP message from `category/Repository.php` when adding a category,
  another fault.
- Unverified: with `display_errors = On` in `config.inc.php` (off by
  default), whether the warning is printed into the JSON answer and
  breaks the upload on screen; not reproduced.
