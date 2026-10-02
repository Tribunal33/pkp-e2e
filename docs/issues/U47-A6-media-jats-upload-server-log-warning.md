# Adding a media file or uploading JATS XML writes a PHP warning to the server's log

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS (JATS upload only; no Media page)
  - 3.4: none (code; no "Media" or "JATS XML" page)
  - 3.3: none (code; no "Media" or "JATS XML" page)
- **Introduced** "JATS XML": `pkp/pkp-lib#9536` with `pkp/ui-library#300` for `pkp/pkp-lib#7505` · [af8ad0fe08](https://github.com/pkp/pkp-lib/commit/af8ad0fe08f436034944d324ff5905a7bb65a01c), [fa798c79](https://github.com/pkp/ui-library/commit/fa798c79fb17e2e8271b0ea975fe9c1528d2fd51) · 2023-12-18 · Dimitris Efstathiou (defstat); "Media": `pkp/pkp-lib#12306` for `pkp/pkp-lib#12251` · [f4eccf8b9f](https://github.com/pkp/pkp-lib/commit/f4eccf8b9f18ac68efa44fd7971fedd644c3d001) · 2026-02-13 · Erik Hanson (ewhanson), with `pkp/ui-library#794` for `pkp/pkp-lib#12262` · [3f97137c](https://github.com/pkp/ui-library/commit/3f97137cef11b99042ee8bcc96ff0dfe5dcf84e4) · 2026-05-06 · Blesilda Biazon (blesildaramirez)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U47 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#a6), spec U48 [A20](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a20)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

Each file added with "Upload Files" on a publication version's "Media"
page, and each file uploaded with "Upload" on a journal article's "JATS
XML" page, writes a PHP warning ("foreach() argument must be of type
array|object, string given") to the web server's error log. Both pages
hand the file's name to the same shared step, which warns. The upload
succeeds, and with PHP's error display off, as PKP's configuration ships
it, no screen shows the warning.

Where an install displays PHP errors (a debugging setting), the warning
is printed into the upload's answer. The media file is still listed.
The "JATS XML" page, though, shows no confirmation and keeps the old XML
until it is opened again, even though the file was stored.

## Impact

- **Lost**: nothing. An administrator who reads the error log finds one
  warning per uploaded file.
- **Who**: editors and production staff adding media files on a
  journal, press or preprint server, and journal editors uploading JATS
  XML, on every upload.
- **Way round**: none needed while PHP errors are hidden. Where they are
  displayed, opening "JATS XML" again shows the uploaded file.

Low: every upload is stored and nothing is lost. The only screen effect
comes with PHP's error display on, a debugging setting PKP ships off,
and there opening the page again shows the file. It would be medium if
production installs commonly displayed PHP errors.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS, OMP, OPS), freshly loaded.
- Access to the web server's PHP error log, with warnings logged (PHP's
  default `error_reporting`).
- Any small PNG image (here `figure.png`) and any JATS XML file (here
  `article.xml`).

Adding a media file (OJS, OMP, OPS):

1. Sign in as `dbarnes`.
2. Open the submission in Production: OJS 5 "Genetic transformation of
   forest trees"; OMP 4 "How Canadians Communicate: Contexts of Canadian
   Popular Culture"; OPS 1 "The influence of lactation on the quantity
   and quality of cashmere production".
3. In the side menu, under "Publication" ("Preprint" on OPS), open the
   version's "Media".
4. Press "Add Media File".
5. In "Upload Media File", press "Click to upload files" and choose
   `figure.png`.
6. When the file's card shows the "What kind of media is this?" list,
   choose "Image".
7. Press "Upload Files".
8. Read the lines the server's error log gained during step 7.

Uploading JATS XML (OJS only):

9. On OJS submission 5, in the side menu under "Publication", open
   "JATS XML" (on 3.5 the entry sits directly under "Publication").
10. Press "Upload" and choose `article.xml`.
11. Read the lines the server's error log gained during step 10.

With PHP errors displayed (OJS):

12. In `config.inc.php`, set `display_errors = On` under `[debug]`.
13. Load the dataset again and take steps 1 to 7 and 9 to 10.
14. Open "JATS XML" again.

**Expected:** the media file is listed on "Media" ("figure.png",
"Image"); the JATS upload shows "Your file has been uploaded." and the
uploaded XML; the log holds no warning for either request, and the
answers hold only their JSON.

**Observed:** both uploads succeed (the list row reads
`figure.png Image 188 B 2026-10-02`; the toast reads "Your file has been
uploaded." and the line under the XML "Last Modification at … by
dbarnes"), and each request writes one warning right before its request
line (OJS shown; OMP and OPS log the same for step 7):

```
PHP Warning:  foreach() argument must be of type array|object, string given in …/lib/pkp/classes/core/PKPBaseController.php on line 428
[200]: POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/mediaFiles
PHP Warning:  foreach() argument must be of type array|object, string given in …/lib/pkp/classes/core/PKPBaseController.php on line 428
[200]: POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/jats
```

Several files in one "Upload Files" write one warning per file.

With PHP errors displayed, both answers (200) start with the warning
before their JSON:

```
<br />
<b>Warning</b>:  foreach() argument must be of type array|object, string given in <b>…/lib/pkp/classes/core/PKPBaseController.php</b> on line <b>428</b><br />
{"_href":"…/api/v1/submissions/5/files/47", …
```

The media upload window closes and the file is listed. After the JATS
"Upload" the page shows no toast, no "Last Modification" line and no
"Delete", and it keeps the generated XML. At step 14 the page shows the
uploaded file, "Last Modification at … by dbarnes" and "Delete".

## Cause

`PKPBaseController::convertStringsToSchema()`
(`lib/pkp/classes/core/PKPBaseController.php`, line 428 on `main`, 425
on 3.5) turns the strings of a request into the schema's types before
validation. For a property the schema marks `multilingual`, it runs
`foreach ($paramValue as $localeKey => $localeValue)` without checking
that the value is a locale map. The private method it calls for each
value, `_convertStringsToSchema()`, does check: an `array` or `object`
property that arrives as anything else is returned unchanged. A
multilingual property that arrives as a plain string therefore makes
PHP warn, and the string goes on unchanged.

Both screens send the submission file's `name` (multilingual in
`schemas/submissionFile.json`) as a plain string:

- "Upload Files" posts each card's answer from the temporary files API
  as it came back (`useFileMediaUploader.js`: `{...f.uploadedFile,
  temporaryFileId, genreId, variantType}`), whose `name` is the
  original file name. `AddMediaFiles::prepareForValidation()` runs
  `convertStringsToSchema()` on each entry. `MediaFilesController::add()`
  then wraps a string name into the submission's locale on purpose
  (`elseif (is_string($params['name']))`), so the endpoint is meant to
  accept a plain name.
- The "JATS XML" page's `FileUploader` sets no `filenameLocale`, so
  Dropzone posts `name=<file name>` beside the file. When the page was
  added, its `filenameLocale` was bound to a `primaryLocale` the
  component never defined. `PKPJatsController::add()` runs
  `convertStringsToSchema()` on the form fields, and
  `Repository::addJatsFile()` then sets `name` itself from the uploaded
  file's name, ignoring the posted one.

With PHP's `display_errors` on, PHP prints the warning into the output
ahead of the JSON. The media window still closes and lists the file.
For the JATS upload, Dropzone cannot parse the answer as JSON and
reports an upload error, which the "JATS XML" page does not display.

Reach:

- Other screens (code): the only other `FileUploader` that posts to an
  endpoint running `convertStringsToSchema()` is the submission files
  list (`SubmissionFilesListPanel.vue`). It passes `filenameLocale` and
  sends `name[<locale>]`. "Edit Metadata" on a media file sends the name
  as a locale map. `FileAttacherUpload` posts to the temporary files
  endpoint, which does not convert.
- The REST API (code): a client that posts a plain string for a
  multilingual property to any endpoint that runs
  `convertStringsToSchema()` (41 calls in 20 of pkp-lib's API
  controllers) writes the same warning before the validator refuses the
  value with a 400.
- OMP and OPS (code): the JATS route is registered only in OJS's
  `api/v1/submissions/index.php`. OMP and OPS have no JATS endpoint,
  so no screen or API client reaches `PKPJatsController` there.

## Proposed fix

In `convertStringsToSchema()`, leave a multilingual value that is not a
locale map for the validator, the way `_convertStringsToSchema()`
already leaves an `array` or `object` property that arrives as a scalar
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-jats-upload-server-log-warning/fix.diff)):

```diff
             if (!empty($schema->properties->{$paramName}->multilingual)) {
+                // A multilingual value that is not a locale map is left for
+                // the validator, as _convertStringsToSchema() leaves an
+                // array or object property that arrives as a scalar
+                if (!is_array($paramValue)) {
+                    continue;
+                }
                 foreach ($paramValue as $localeKey => $localeValue) {
```

`convertStringsToSchema()` is the shared method every API controller
calls, so the guard covers both screens and any API client. What
reaches the controllers does not change. Today PHP warns and skips the
loop, leaving the string as it was; with the guard the string is left
as it was, with no warning. `MediaFilesController::add()` keeps
wrapping the plain name, and `addJatsFile()` keeps setting its own. A
plain string sent for any other multilingual property is still refused:
`ValidatorFactory::allowedLocales()` adds `validator.localeExpected` for
a non-array multilingual value.

Tried on `main` on OJS, OMP and OPS: with the guard in, steps 7 and 10
logged only their request lines, and the uploads went through as
before. As a neighbour check, a media file was renamed through "Edit
Metadata". The name went as a locale map with an empty French entry,
which `_convertStringsToSchema()` turns into null. The save and the
listed name came out the same with the guard in and out.

**Alternatives:**
- Send `name` as a locale map from both screens: two ui-library changes
  that leave `convertStringsToSchema()` warning for any API client, and
  the media endpoint already accepts a plain name by design.
- Drop `name` before the conversion in `AddMediaFiles` and
  `PKPJatsController`: two workarounds at the callers, with the same gap
  left elsewhere.

**What goes with it:**
- A unit test of `convertStringsToSchema()`. None exists today; only
  `tests/classes/core/APIRouterTest.php` touches `PKPBaseController`.
  The class is abstract, so the test needs an anonymous subclass and
  the schema service from the container. It needs to assert that no
  warning is raised (a `set_error_handler`, or PHPUnit's
  `failOnWarning`) and that a plain string for `name` comes back
  unchanged. The e2e walk linked in Evidence also checks the log.
- Optional, beside the guard and not instead of it: the media uploader
  need not post the whole temporary-file answer (`id`, `mimetype`,
  `documentType`, `name`), since `MediaFilesController::add()` falls
  back to the original file name when `name` is empty.
- No data repair. The guard applies as written to 3.5; 3.4 and 3.3 have
  the same loop in `APIHandler::convertStringsToSchema()`, but no screen
  reaches it with a plain string.

Small: one guard in one method, and a unit test.

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/media-jats-upload-server-log-warning/walk.js),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all shared/playwright/checks/issues/media-jats-upload-server-log-warning/walk.js`
  on an install freshly loaded from the default dataset (pkp/datasets
  c657990, 2026-10-01, PostgreSQL, PHP 8.3's built-in server). It takes
  steps 1 to 11 as `dbarnes`, reads the server log from just before each
  upload's request, and records the request, its answer's first bytes,
  the list and the notices. `WALK=nb` runs the neighbour check alone.
- Walked on `main`: OJS (media and JATS), OMP and OPS (media); the fix
  trial and the neighbour check on all three. Walked on `stable-3_5_0`:
  OJS's JATS "Upload" logs the same warning (line 425); no app lists
  "Media" there, and OMP and OPS list no "JATS XML".
- Steps 12 to 14 were walked on OJS `main` only. The same server ran
  with a copy of the install's config with `display_errors = On`, and
  with `output_buffering = 4096`, the value of PHP's shipped `php.ini`
  files for web servers. Opening the page again was a one-off read
  outside the kept walk. With output buffering off, the answer's headers
  would go out before the JSON's; that was not walked.
- The posted bodies: "Upload Files" sent
  `{"files":[{"id":1,"name":"figure.png","mimetype":"image/png","documentType":"image","temporaryFileId":1,"genreId":10,"variantType":"web"}]}`;
  "Edit Metadata" sent `name[en]=…&name[fr_CA]=&…`. The JATS form
  fields (`fileStage`, `name`) are read from `FileUploader.vue`'s
  Dropzone `params`, not recorded.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library
  64d67363), OMP 3b0ecf794 and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5); `stable-3_5_0` OJS 091fb65453 (pkp-lib
  cf3f984335, ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b
  (pkp-lib 32b0f4b4af, ui-library ee684b34); `stable-3_3_0` OJS
  ac77c9fb35 (pkp-lib f6ab331645, ui-library 96959f9e).
- 3.4 and 3.3 (code): `classes/handler/APIHandler.php` (`.inc.php` on
  3.3) and the branches' `api/v1` and ui-library `src/` for a JATS or
  media endpoint and page (none), and every `FileUploader` use
  (`SubmissionFilesListPanel.vue` passes `filenameLocale`).
- Introduced: `git blame` on line 428 gives 71e79e31e3, which moved the
  method from `APIHandler` (where the loop dates from 5f3be929e6, 2018,
  written for the Vue forms' locale maps). The JATS conversion call and
  uploader came with af8ad0fe08 and fa798c79. The uploader's
  `filenameLocale="primaryLocale"` named nothing the component defined,
  and ui-library b28d5dab (2025) removed the dead binding. The media
  conversion call came with f4eccf8b9f, and the uploader that posts the
  temporary-file answer with 3f97137c.
- Upstream: the hits with the same warning text (`pkp/pkp-lib#11494`,
  `#11030`, `#8868`, `#10366`) are other loops in other classes.
- Unverified: whether an install that turns PHP warnings into
  exceptions (none of PKP's own configurations does) would fail the
  upload.
