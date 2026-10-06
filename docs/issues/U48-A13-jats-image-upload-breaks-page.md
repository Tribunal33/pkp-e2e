# Uploading an image as JATS XML stores it silently, then the "JATS XML" page fails on every opening

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Crash** both
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code; no "JATS XML" page)
  - 3.3: none (code; no "JATS XML" page)
- **Introduced** `pkp/pkp-lib#9536` with `pkp/ui-library#300` for `pkp/pkp-lib#7505` · [af8ad0fe08](https://github.com/pkp/pkp-lib/commit/af8ad0fe08f436034944d324ff5905a7bb65a01c), [fa798c79](https://github.com/pkp/ui-library/commit/fa798c79fb17e2e8271b0ea975fe9c1528d2fd51) · 2023-12-18 · Dimitris Efstathiou (defstat)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U48 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a13)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

"Upload" of an image on a journal article's "JATS XML" page fails on
the server: the page shows only "Uploading 100% complete" and stays as
it was, with no message. The file is stored all the same. From then on
every opening of the page fails: a window reads "Error" / "Malformed
UTF-8 characters, possibly incorrectly encoded" / "OK", the XML area is
empty, the line reads "Last Modification at undefined by undefined",
"Download" saves "undefined.html" and "More Information" opens an error
window. "Delete" › "Delete JATS File" still works and brings back the
generated XML.

The same happens to any file that is not UTF-8 text, such as a JATS XML
file saved in ISO-8859-1 with an accented letter, and to an image
uploaded over an earlier JATS file, which it replaces. With "Make
available with publication" ticked, readers of the published article
download the image as its JATS XML.

## Impact

- **Lost**: the version's "JATS XML" page, until someone deletes the
  file. On a published article whose box is ticked, the public "JATS
  XML" link serves the image's bytes as "…-jats.xml" with
  `application/xml`, a file no reader or harvester can parse. "Delete"
  also removes any earlier uploaded JATS file with its revisions. The app
  keeps no other copy, since a JATS file is uploaded straight to this
  page rather than taken from the production files.
- **Who**: editors and production staff who upload JATS XML and choose
  the wrong file, or a JATS file saved in another encoding than UTF-8.
  When the box is ticked, every reader of that article is affected.
- **Way round**: "Delete" › "Delete JATS File" on the broken page, then
  a fresh "Upload" of the earlier UTF-8 file, from the editor's own
  copy. On `main` this works on a published version too, and the link
  then serves the generated XML. That is only because `main` offers
  "Delete" on published versions, which is itself
  [pkp-e2e#554](https://github.com/jardakotesovec/pkp-e2e/issues/554).
  3.5 offers no "Delete" there, and neither would `main` with A12
  fixed, so the version must be unpublished first (code).

Medium: one article's public JATS XML at a time is wrong. That is a
secondary output wrong for a few items. It needs an editor's wrong file,
the page shows an error on the editor's next visit, and "Delete" puts it
right. It would be high if it reached every published article or stayed
unseen.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main` (OJS), freshly loaded.
- Any PNG image (here `figure.png`), a plain-text file (here
  `notes-u48r1.txt`), and a small XML file saved as ISO-8859-1 that
  holds an accented letter (here `article-u48r1-latin1.xml`, whose
  title is "Résumé of forest genetics").

First upload of an image:

1. Sign in as `dbarnes`.
2. Open submission 5, "Genetic transformation of forest trees"
   (Production).
3. In the side menu, open "JATS XML". It sits under "Publication" and
   then the version's entry. On 3.5 it sits directly under
   "Publication", which has no version entries.
4. Press "Upload" and choose `figure.png`.
5. Open submission 5's "JATS XML" again (reload the page).
6. Press "OK" on the window that opens.
7. Press "More Information" (not on 3.5, which has no such button).
8. Press "Download".
9. Press "Delete", then "Delete JATS File".

An image over an earlier upload (skip steps 12 and 13 on 3.5, which
offers no "Upload" while a file is uploaded):

10. Open submission 6, "Investigating the Shared Background Required
    for Argument: A Critique of Fogelin's Thesis on Deep Disagreement",
    and its "JATS XML".
11. Press "Upload" and choose `notes-u48r1.txt`.
12. Press "Upload" again and choose `figure.png`.
13. Open submission 6's "JATS XML" again.

An XML file in another encoding:

14. Open submission 15, "Yam diseases and its management in Nigeria",
    and its "JATS XML".
15. Press "Upload" and choose `article-u48r1-latin1.xml`.
16. Open submission 15's "JATS XML" again.

On a published article (`main` only; 3.5 has neither the tick box nor
the article page's "JATS XML" link):

17. Open submission 17, "Antimicrobial, heavy metal resistance and
    plasmid profile of coliforms isolated from nosocomial infections in
    a hospital in Isfahan, Iran" (published), and its "JATS XML".
18. Press "Upload" and choose `figure.png`.
19. Open submission 17's "JATS XML" again and press "OK".
20. Tick "Make available with publication" and press "Confirm".
21. Sign out, open the article's page
    (`/index.php/publicknowledge/article/view/17`) and press "JATS XML".

**Expected:** at steps 4, 12, 15 and 18 the upload is refused with a
message saying the file cannot be used as JATS XML, and nothing is
stored; the page keeps what it showed.

**Observed:** at steps 4, 12, 15 and 18 the box shows "Uploading 100%
complete" and nothing else (on 3.5 the XML is replaced by a spinner
that keeps turning); no message. The upload's request fails:

```
POST /index.php/publicknowledge/api/v1/submissions/5/publications/6/jats  500
{"error":"Malformed UTF-8 characters, possibly incorrectly encoded"}
```

```
production.ERROR: Malformed UTF-8 characters, possibly incorrectly encoded {"exception":"[object] (InvalidArgumentException(code: 0): Malformed UTF-8 characters, possibly incorrectly encoded at lib/pkp/lib/vendor/laravel/framework/src/Illuminate/Http/JsonResponse.php:91)
#3 lib/pkp/api/v1/jats/PKPJatsController.php(214): Illuminate\Routing\ResponseFactory->json()
```

At steps 5, 13, 16 and 19, `GET …/publications/6/jats` answers 500 with
the same exception. A window reads "Error" / "Malformed UTF-8
characters, possibly incorrectly encoded" / "OK", and the browser's
console logs `TypeError: Cannot read properties of undefined (reading
'replace')`. After "OK" the box offers "Upload", "More Information",
"Delete", "Download" and the "Make available with publication" tick box
(on 3.5 only "Delete" and "Download"). The XML area is empty, and the
line under it reads "Last Modification at undefined by undefined".

At step 7 a window reads "Error" / "An unexpected error has occurred.
Please reload the page and try again." / "OK", after
`GET …/$$$call$$$/information-center/file-information-center/view-information-center?submissionFileId=undefined&submissionId=5&stageId=5`
answers 500 (`PHP Fatal error: Uncaught TypeError:
PKP\submissionFile\Repository::get(): Argument #1 ($id) must be of
type int, string given`). At step 8 the browser saves a file named
"undefined.html".

At step 20 the box is saved ticked (`PUT …/jats/visibility` 200). At
step 21 the article page shows "JATS XML", and its link
(`…/api/v1/submissions/17/publications/18/jats/download`) answers 200
with `Content-Type: application/xml; charset=utf-8` and `attachment;
filename="submission-17-publication-18-jats.xml"`. Its 188 bytes are
the PNG image.

Step 9 works: "Delete JATS File" answers 200 and the page shows the
generated XML with "This JATS file is generated automatically by the
submission metadata". The same holds on the published article, after
which the link serves the generated XML. The plain-text upload at step
11 is taken with "Your file has been uploaded.". Whether a non-XML file
should be taken is a separate question, spec U48
[A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U48-jats-and-body-text.md#a10).

## Cause

The "JATS XML" page and its API carry the uploaded file's content as a
string inside a JSON answer, and nothing makes sure that content is
UTF-8 text. `PKPJatsController::add()` checks only that a file arrived
(`UPLOAD_ERR_OK`). It hands the file to
`PKP\jats\Repository::addJatsFile()`, which stores it and its submission
file record.

The controller then builds its answer. `new JatsFile()` reads the stored
file whole (`Repo::submissionFile()->getSubmissionFileContent()`) into
`$jatsContent`, and `PKP\jats\Repository::summarize()` puts it in
`jatsContent`. `response()->json()` cannot encode bytes that are not
UTF-8, so Laravel's `JsonResponse::setData()` throws
`InvalidArgumentException`.

Every later `GET …/jats` takes the same path through `JatsFile` and
`summarize()` and fails the same way, so the page never learns the
file's id, date or uploader. `WorkflowPublicationJats.vue` keeps an
empty `workingJatsProps` after the failed fetch. It therefore renders
the uploaded-file buttons and the tick box with `undefined` values:
- "Download" follows an undefined `url`.
- "More Information" sends `submissionFileId=undefined`, which
  `FileInformationCenterHandler` passes to a typed `int` parameter.
- `CodeHighlighter` gets no code and throws.

The page also says nothing when an upload is refused or fails.
`FileUploader` puts the API's error on the file's `errors`, but the
panel's `newJatsFiles` watcher looks only for an item holding
`isDefaultContent`, which only a successful answer has.

Reach:

- "Create New Version" copies the stored file to the new version
  (`PKP\publication\Repository::version()` calls
  `versionSubmissionFile()`), so the new version's page breaks too
  (code).
- The public "JATS XML" link (`PKPJatsController::publicDownload()`
  through `getPublicJatsContent()`) serves the stored bytes once the box
  is ticked (on screen, `main`). 3.5's controller has no
  `publicDownload()` and its page no tick box, so 3.5 has no public link.
- `JatsFile` is the only reader of a JATS file's content in the JATS
  API, so the GET, POST and DELETE answers and the public link all pass
  through it.

## Proposed fix

Refuse an upload whose content is not UTF-8 text, with a message, and
read a file stored before that check as a loading error instead of a
crash. Three places:

- `PKPJatsController::add()` (pkp-lib), after the `UPLOAD_ERR_OK`
  check: run `mb_check_encoding()` on the uploaded file's content. When
  it fails, answer 400 with a new `api.jats.400.notUtf8` message, before
  anything is stored. This follows `PKPUploadPublicFileController`,
  which checks an upload's type in the controller and answers 400 with
  its own `api.publicFiles.400.*` message.
- `JatsFile::__construct()` (pkp-lib): when the stored file's content is
  not UTF-8, set `loadingContentError` (a new
  `publication.jats.notUtf8` message) and leave `jatsContent` empty.
  - The page already shows `loadingContentError` in place of the XML and
    hides "Download" and the tick box.
  - The answer now carries the file's id, so "More Information" opens
    and "Delete" is offered.
  - The public link answers 404 for such a file instead of serving it.
- `WorkflowPublicationJats.vue` (ui-library): in the `newJatsFiles`
  watcher, when an item carries `errors`, show them with `notify(…,
  'warning')` and stop, so a refusal (or any failed upload) is shown.

The diff, against the `main` app root:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-image-upload-breaks-page/fix.diff).

Tried on `main` (OJS):
- Steps 4, 12 and 15 now answer 400. The page shows "This file cannot be
  used as JATS XML. Upload an XML file saved as UTF-8 text.", keeps what
  it showed, and reopening raises no error.
- An image stored before the fix now opens with "This file cannot be
  shown because it is not UTF-8 text. Delete it and upload a JATS XML
  file.", "More Information" opens "Information Center: figure.png", and
  "Delete" is offered.
- The neighbour check (the behaviour the fix must not change) gave the
  same with the fix in and out. A UTF-8 JATS file with accented letters
  is taken, shown and downloaded as "article-u48r1.xml", and taken again
  as a revision. A plain-text file is still taken. "Delete JATS File"
  brings back the generated XML.

"Create New Version" still copies such a file after the fix, and that is
left as it is. The new version shows the same message and offers
"Delete", and skipping the copy would drop a file the editor uploaded
without telling them.

**Alternatives**:

- Refuse anything that is not well-formed XML (`DOMDocument::loadXML()`
  at upload). It also refuses text files and PDFs, which settles spec
  U48 A10's open question, so it is the team's call. It does not replace
  the UTF-8 check, since a well-formed ISO-8859-1 file still breaks the
  page. `pkp/pkp-lib#13228` (open) looks at validating against the JATS
  DTD on upload, which would include it.
- Encode the answer with `JSON_INVALID_UTF8_SUBSTITUTE`: the page opens,
  but shows the image as replacement characters and keeps publishing it
  as the article's JATS XML.
- Convert an ISO-8859-1 file to UTF-8 on upload: it rescues one
  encoding only, and the file would no longer be the one uploaded.

**What goes with it**:

- Files already stored this way need no data repair: the `JatsFile`
  change shows them with the message, and "Delete" removes them.
  `getPublicJatsContent()` caches the public content for 24 hours
  (`Cache::remember`, `JATS_FILE_CACHE_LIFETIME`). An image cached
  before the fix is deployed is served until that expires, or until an
  upload, a delete or a change of the box clears it. Clearing the cache
  on deploy avoids this.
- 3.5 needs its own backport, as `fix.diff` does not apply there:
  - The 3.5 watcher reads `newValue[0]` and sets `hasLoadedContent =
    false` while an upload runs. Its hunk must set `hasLoadedContent =
    true` before returning on an error, or the spinner keeps turning.
  - The 3.5 `submission.po` has no `publication.jats.makePublic` to
    anchor the new message, so it needs its own context.
  - The two pkp-lib PHP changes read the same there (read, not tried).
- The guard: an e2e scenario in spec U48 (a **Planned** item) uploading
  an image and an ISO-8859-1 XML file and expecting the refusal, and a
  unit test of `JatsFile` with a non-UTF-8 file.

Medium: two repos (pkp-lib and ui-library) and two new messages. It is
more than one upload check, because files already stored on live
installs must open again (`JatsFile`) and the page must show the
refusal (ui-library).

## Evidence

- Kept walk:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/jats-image-upload-breaks-page/walk.js),
  `node bin/probe.js ojs shared/playwright/checks/issues/jats-image-upload-breaks-page/walk.js`,
  on an install freshly loaded from the default dataset (pkp/datasets
  e8dafbc, 2026-10-02, PostgreSQL, PHP 8.3's built-in server). It takes
  steps 1 to 16 as `dbarnes` (`WALK=pub`: steps 17 to 21, then "Delete"
  and the link again), writing the three files itself. It records each
  request, the box, the windows and the server log around each upload
  and opening.
- Walked on `main` and on `stable-3_5_0` (OJS). On 3.5, steps 12 and 13
  cannot be taken and 14 to 16 were walked in a run of their own.
  Everything else matched `main`, except that 3.5 has no "More
  Information" and the box shows a spinner after the failed upload.
  Steps 17 to 21 were walked on `main` only.
- Code read on 3.5 (`stable-3_5_0`): `PKPJatsController::add()`,
  `JatsFile::__construct()` and `PKP\jats\Repository::summarize()` match
  `main`. The controller has no `publicDownload()` or `setVisibility()`.
  The panel offers "Upload" only on the generated XML and "Delete" only
  on an unpublished version, and its `newJatsFiles` watcher differs from
  `main`'s.
- 3.4 and 3.3 (code): neither pkp-lib branch has `api/v1/jats`,
  `classes/jats` or `SUBMISSION_FILE_JATS`, and neither ui-library
  branch has a JATS component; the "JATS XML" page came with
  `pkp/pkp-lib#9536`, in 3.5.
- Introduced: `git blame` on `PKPJatsController::add()`,
  `PKP\jats\Repository::summarize()` and `JatsFile::__construct()` lands
  on af8ad0fe08 (the files' first commit, `pkp/pkp-lib#9536`). The
  ui-library side of the same feature is `pkp/ui-library#300`
  (fa798c79), whose watcher already ignored a failed upload.
- Upstream: searched pkp/pkp-lib, pkp/ojs and pkp/ui-library on
  2026-10-02 for JATS upload image, file type, validation, "Malformed
  UTF-8", `PKPJatsController` and `addJatsFile`. `pkp/pkp-lib#13228`
  (open) is about DTD validation, not this failure.
- Tips: `main` OJS b84f8e2e44 (pkp-lib ddd8ab243a, ui-library
  64d67363); `stable-3_5_0` OJS 091fb65453 (pkp-lib cf3f984335,
  ui-library d4e01883); `stable-3_4_0` OJS 75cc2d488b (pkp-lib
  6f96165c90, ui-library ee684b34); `stable-3_3_0` OJS ac77c9fb35
  (pkp-lib 4156e50233, ui-library 96959f9e).
- MySQL not checked; the failure is in PHP's JSON encoding, not the
  database.
- Unverified: the 3.5 published version needing to be unpublished
  before "Delete" (code); the new messages exist in English only.
