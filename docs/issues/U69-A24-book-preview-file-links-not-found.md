# On a press, every file link on a book's preview opens "404 Not Found"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no book preview)
- **Introduced** commit [2004cab1d5](https://github.com/pkp/omp/commit/2004cab1d5b55cb524c9236359ef7e1646a4b3c5) for `pkp/pkp-lib#5299`, pushed to pkp/omp without a PR (`pkp/omp#970`, the same change, was closed unmerged) · 2022-11-24 · Antti-Jussi Nygård (ajnyga)
- **Upstream** none found (2026-10-13)
- **Tracked in** spec U69 [A24](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a24)
- **Checked** 2026-10-13, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A preview of an unpublished book, or of a new version of a published
one, lists the version's files as the published page will. Pressing any
of them opens the "404 Not Found" page instead of the file's view page.
This happens for every file type, viewer or download, and for everyone
who may open the preview: the press's managers and editors, its series
editors and assistants, and the book's authors. On the published book's
page the same links work.

The files can still be downloaded from the book's workflow. What cannot
be checked before publishing is the file as readers will get it, in its
viewer.

## Impact

- **Lost.** No data. The preview's file links lead to a bare "404 Not
  Found" page, and nobody is told why.
- **Who.** The press's managers and editors, its series editors and
  assistants, and the book's authors, whenever they preview a book or a
  new version before publishing it.
- **Way round.** The workflow's file lists ("Publication Formats",
  Production) download each file, but they do not show it in the viewer
  readers will get.

Medium: before publishing, no one can check a book's files in the
viewer readers will get, on every press. It would be low if checking
the downloaded file were all a preview is for.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`, freshly loaded.
  - Submission 14, "From Bricks to Brains: The Embodied Cognitive
    Science of LEGO Robots", is published in one version. Its "PDF"
    format holds "Open Access" files: two whole-book files in the side
    column ("Segmentation of Vascular Ultrasound Imag.pdf", "The
    Canadian Nutrient File: Nutrient Val.pdf") and one per chapter,
    linked "PDF" in the contents. Its author account is `mdawson`.
  - Submission 4, "How Canadians Communicate: Contexts of Canadian
    Popular Culture", is in Production and was never published, with
    `dbarnes` assigned. Its only format is a remote "PDF" with no file,
    so group B adds a format with a file.
- A PDF file to upload, here `u69h13p-book.pdf`.

A. A new version of a published book:

1. Sign in as `dbarnes` (Press editor).
2. Open submission 14's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=14`.
3. Under "Publication" press "Create New Version". Keep what the window
   offers and press "Confirm". The menu lists the new version,
   unpublished.
4. Under the new version open "Title & Abstract" and press "Preview".
   The browser opens `…/catalog/book/14/version/19` under "This is a
   preview and has not been published. View submission".
5. In the side column, under "PDF", press "Segmentation of Vascular
   Ultrasound Imag.pdf".
6. Go back to the preview. In the contents, press the first chapter's
   "PDF".
7. Sign out. Sign in as `mdawson` (the book's author), open the preview
   address of step 4 and press "Segmentation of Vascular Ultrasound
   Imag.pdf".

B. A book never published:

1. Sign in as `dbarnes` and open submission 4's workflow.
2. Under "Publication" open "Publication Formats". Press "Add publication
   format", type "u69h13p PDF" and press "OK".
3. On the format's row press "Change File". Choose "Book Manuscript",
   upload `u69h13p-book.pdf`, then press "Continue", "Continue" and
   "Complete".
4. On the file's row press "Set Terms", choose "Open Access" and press
   "Save".
5. On the format's row press "Not Available" and then "OK". The format
   reads "Available".
6. Open "Title & Abstract" and press "Preview". The preview's side
   column lists "u69h13p PDF".
7. Press "u69h13p PDF" (a format holding one file is linked by the
   format's name).

[3.5: "Create New Version" is a button above the publication's pages,
answered "Yes". "Preview" sits beside "Publish". Group B's preview opens
at `…/catalog/book/4`.]

**Expected:** each link opens the file's view page, the PDF viewer under
the file's name, as the published book's page does.

**Observed:** every link answers `404` and shows a page reading only

```
404 Not Found
```

- A5 and A7: `…/catalog/view/14/version/19/4/149` (the whole-book file)
- A6: `…/catalog/view/14/version/19/4/145` (the first chapter's file)
- B7: `…/catalog/view/4/5/151`

Control: signed out, the published book's page `…/catalog/book/14` and
the same "Segmentation of Vascular Ultrasound Imag.pdf" open "PDF view of
the file Segmentation of Vascular Ultrasound Imag.pdf", whose file
request answers 200.

## Cause

`CatalogBookHandler::download()` (omp `pages/catalog/CatalogBookHandler.php`,
[lines 425–431](https://github.com/pkp/omp/blob/eb938131477847c7ca422cf0f963b8b11234c1d1/pages/catalog/CatalogBookHandler.php#L425-L431))
serves a format's file, and `view()` calls it for the view page. It
answers "not found" for any publication that is not published, whoever
asks:

```php
if (
    empty($publication) ||
    $publication->getData('status') !== PKPPublication::STATUS_PUBLISHED ||
    $publicationFormat->getData('publicationId') !== $publication->getId()
) {
    throw new NotFoundHttpException();
}
```

The check came in with `pkp/pkp-lib#5636` ("Prevent public access to
unpublished versions and publication formats",
[b39a5d7520](https://github.com/pkp/omp/commit/b39a5d7520a986bee66c74514177393b293beb6d),
2020), when no one could open an unpublished book's page.

The preview came later. For `pkp/pkp-lib#5299` ("Make a preview link in
OMP"), 2004cab1d5 made two changes. It let `book()` show an unpublished
publication to whoever `Repo::submission()->canPreview()` allows
([line 122](https://github.com/pkp/omp/blob/eb938131477847c7ca422cf0f963b8b11234c1d1/pages/catalog/CatalogBookHandler.php#L122)).
It also dropped the published-status test from
`OmpPublishedSubmissionRequiredPolicy::dataObjectEffect()`, so a book
never published (group B) reaches the handler at all. A new version of
a published book (group A) always did. It left `download()` alone.

OJS and OPS already let the same people through for files:
`ArticleHandler::initialize()` and `PreprintHandler::initialize()` refuse
an unpublished publication only when the user cannot preview it, and
OJS's `userCanViewGalley()` lets a `canPreview()` user through first.

Reach:

- Every file of a preview, on a new version and on a book never
  published (walked: PDF files, both kinds of preview). Every file link
  on a book page goes to `view`, and `download()` refuses before any
  viewer plugin is asked, so an HTML file, an EPUB and a download-only
  file get the same 404 (code). So do the chapter pages' file links
  (code).
- Every role `canPreview()` allows. `_roleCanPreview()` lets in the
  press's managers, series editors and assistants, reading only the
  roles a user holds in this press. It also names the subscription
  manager, a role OMP's role groups do not have. The book's authors get
  in through their author assignment. `download()` refuses before it
  asks who the user is, so no role gets through (walked: `dbarnes`,
  `mdawson`; code for the rest). The Site Administrator gets in because
  the dataset's `admin` is also the press's Press manager.
- Not this fault: the preview page of a new version also says "This is
  an outdated version published on {today}", which is
  [pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209).

## Proposed fix

Recommended: let `download()` ask the same question `book()` asks. An
unpublished publication's file is refused only when the user cannot
preview the submission. The viewers' notice then needs the same
condition (below).

[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-file-links-not-found/fix.diff),
in pkp/omp alone. In `CatalogBookHandler::download()`:

```diff
+        // Serve 404 unless the publication is published, or the user may
+        // preview it (as book() allows for the publication's page)
         if (
             empty($publication) ||
-            $publication->getData('status') !== PKPPublication::STATUS_PUBLISHED ||
+            ($publication->getData('status') !== PKPPublication::STATUS_PUBLISHED && !Repo::submission()->canPreview($request->getUser(), $submission)) ||
             $publicationFormat->getData('publicationId') !== $publication->getId()
         ) {
```

In `plugins/generic/pdfJsViewer/templates/display.tpl` and
`plugins/generic/htmlMonographFile/templates/display.tpl`, both tests in
each template (the frame's `class` attribute and the notice block), four
in all, change from `{if !$isLatestPublication}` to
`{if !$isLatestPublication && $filePublication->getData('status') === PKP\publication\PKPPublication::STATUS_PUBLISHED}`.
`isLatestPublication` is false for a new version that is not yet
published. Without this change, the viewer would show "This is an
outdated version published on …" above the new version's file. This is
the rule [pkp-e2e#920](https://github.com/jardakotesovec/pkp-e2e/issues/920)
proposes for the OJS and OPS readers.

Tried on `main`. Every link of the Steps opened its PDF view page, with
no notice above the viewer, and the file request answered 200. The new
version's file addresses were also opened signed out and as `aclark` (an
author of another book). They stayed "404 Not Found" with the fix in and
out, and the published book's file opened the same either way.

**Alternatives:**

- The check could move into `OmpPublishedSubmissionRequiredPolicy`, to
  cover `book()` and `download()` together. The policy would then have
  to carry both of `book()`'s checks (the submission's status, then the
  publication's) and `book()` would lose them. That is a larger change
  with no gain for this fault.
- Hiding the file links on a preview would turn the 404 off. But the
  preview would then not show what the published page will, and
  previewing is what it is for.

**What goes with it:**

- No stored data changes.
- Usage statistics: a preview's file now fires the usage event, but
  `LogUsageEvent::canHandle()` drops events for unpublished
  publications (code), so previews are not counted.
- A "Direct Sales" file on a preview goes on to the purchase step for
  the previewer, as on the published page. Whether previewers should get
  priced files free is a product question, left out here (not walked).
- Backport. 3.5 and 3.4 have the same check in `download()`, under
  `PKPSubmission::STATUS_PUBLISHED`, and the same viewer templates. Use
  that constant there, since `PKPPublication::STATUS_PUBLISHED` exists
  only on `main` (code).

Small: one condition in one handler and one condition in two templates,
all in pkp/omp, following the check `book()` already makes.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preview-file-links-not-found/walk.js)
  (helpers in `lib.js` beside it) takes groups A and B of the Steps on
  OMP:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/preview-file-links-not-found/walk.js`
  on an install freshly loaded from the default dataset. `GROUP=A` or
  `GROUP=B` takes one group alone. `WALK=nb` is the neighbour check of
  the fix.
- Walked on PostgreSQL; nothing here depends on the database.
  Datasets: pkp/datasets 384e28b (2026-10-12).
- Tips: `main` OMP eb93813147 (lib/pkp f4c2578c94); `stable-3_5_0` OMP
  486cbf9eb0 (lib/pkp 8094f06bf5); `stable-3_4_0` OMP 0aec65441 (lib/pkp
  55c8e406b3); `stable-3_3_0` OMP 8e72fc883 (lib/pkp 5e84acd11b).
- Code reads: `download()`'s check is at 3.5 line 376 and 3.4 line 365;
  3.4's `book()` lets `canPreview()` users through (lines 100, 119). On
  3.3 `book()` refuses any unpublished publication (line 83) and the
  workflow has no "Preview"; its `download()` has the same check (line
  256). The first tags holding 2004cab1d5 are `3_4_0rc1` to `3_4_0rc3`.
- Introduced: `git blame` on the status line in `download()` passes
  through 4d5a8c67da (the constant renamed), 29fa885084 (reformatted)
  and 5834e78500 (namespacing) to b39a5d7520. `pkp/pkp-lib#5299` closes
  with "All merged" (asmecher, 2022-12-13).
- Upstream search 2026-10-13 in pkp/pkp-lib, pkp/omp and pkp/ui-library:
  "preview file 404", "preview download unpublished", "preview
  monograph file 404", "preview publication format download",
  `CatalogBookHandler download canPreview`, `CatalogBookHandler
  download`, "preview version files", "new version preview files not
  found", "unpublished publication format file view".
- Seen on the way, not this fault: every PDF view page, published or
  (with the fix) previewed, logs "PDFJS is not defined", which is
  [U69 A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a23).
- Not driven: an HTML, EPUB or download-only file on a preview (code
  read); 3.4 and 3.3 (code only). The template change was tried only
  together with the handler change. That the viewer would show the
  outdated notice without the template change was read in the code, not
  walked.
