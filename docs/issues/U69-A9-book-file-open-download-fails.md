# On a press, a reader who opens a book's PDF gets an empty viewer, and no download saves the file

- **Severity** critical
- **Effort** small
- **Kind** regression
- **Crash** both
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2441` for `pkp/pkp-lib#12311` · [591d7a0e73](https://github.com/pkp/omp/commit/591d7a0e733e345f9cbbbb5403d43c2b39cf946b) · 2026-08-26 (merged 2026-09-02) · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a9) · spec U20 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp6) · spec U64 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#omp3) · spec U47 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#omp1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The server fails whenever a reader asks for a published book's PDF or
other downloadable file. A reader who opens a book's "PDF" link gets
the PDF view page with a red bar, "Unexpected server response.", where
the document should be. The page's "Download" and the viewer's own
download button save nothing.

A file that is served as a download (a PDF with "PDF.js PDF Viewer"
off, an EPUB, a supplementary file) opens a blank error page instead.
A file the reader has bought fails the same way as a free one. Readers
have no way round. No file view reaches the usage statistics, and a
search engine that follows the file addresses in the book page's tags
gets the same error.

Only an HTML file still opens, and only while "HTML Monograph File" is
on. Visitors and signed-in users are affected alike.

## Impact

- **Lost.** Access to what is published: no PDF, EPUB or other
  downloadable file can be read or saved. The reader sees an error bar
  or a blank page, and nobody at the press is told.
- **Who.** Every reader of a press that runs this code, on every book
  and chapter file, the first time they open one.
- **Way round.** None for a reader. The press has none either:
  switching the viewer off turns the empty viewer into a blank error
  page.

Critical: reading and downloading what is published fails for all of a
press's book files, with no way round, in the default setup.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Nothing more. Book 5, "Bomb Canada and Other Unkind Remarks in the
  American Media", is published and has one free file, "PDF"
  (`epilogue.pdf`), listed under its chapter "Epilogue". "PDF.js PDF
  Viewer" is on.

Reading the PDF, signed out:

1. Open "Catalog" and press "Bomb Canada and Other Unkind Remarks in
   the American Media"
   (`/index.php/publicknowledge/en/catalog/book/5`).
2. Press "PDF".
3. Look at the viewer.
4. Press "Download" in the bar at the top of the page.
5. Press the viewer's own download button.

Downloading the file, with the viewer off:

6. Sign in as `dbarnes`. Open Settings › Website › "Plugins", untick
   "PDF.js PDF Viewer" and answer "OK" to "Are you sure you want to
   disable this plugin?".
7. Sign out, open the book's page again and press "PDF".

**Expected.** Step 3: the viewer shows the PDF (one page). Steps 4 and
5 save `epilogue.pdf`. Step 7: the browser downloads `epilogue.pdf`.
Each opening is written to the usage log as a file view.

**Observed.** Step 2 opens the page "PDF view of the file
epilogue.pdf". Step 3: the viewer shows a red bar "Unexpected server
response." and "of 0" pages; "More Information" adds:

```
PDF.js v2.6.347 (build: 3be9c65f)
Message: Unexpected server response (500) while retrieving PDF ".../index.php/publicknowledge/en/catalog/download/5/2/41?inline=1".
```

The viewer's script fails with an uncaught
`UnexpectedResponseException`. Step 4: the page stays as it is; the
browser starts a download named `41.html` and cancels it. Step 5: a
download named `document.pdf` starts and is cancelled. Step 7: a blank
page, with no text and no title.

```
GET /index.php/publicknowledge/en/catalog/download/5/2/41?inline=1   500   (steps 3, 4, 5)
GET /index.php/publicknowledge/en/catalog/view/5/2/41                500   (step 7)
```

The server log, each time:

```
PHP Fatal error:  Uncaught Error: Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization in pages/catalog/CatalogBookHandler.php:533
```

The usage log (`usageStats/usageEventLogs/usage_events_{date}.log`
under the files directory) gets no line for the file after any of the
steps. A file line is a JSON line holding `"assocType":515` and
`"submissionFileId":41`.

Control: the book's own page (step 1) opens and writes its line to the
usage log.

## Cause

`CatalogBookHandler::download()` (OMP, `pages/catalog/CatalogBookHandler.php`,
line 533) builds the usage event for a served file with
`publication: $this->publication`. `$this->publication` is a typed
property (`public Publication $publication;`, line 53) that only
`book()` sets. A request for a file never runs `book()`: it runs
`download()`, directly or through `view()`, and neither sets the
property. So PHP throws as soon as the line reads it, before
`app()->get('file')->download()` sends the file.

`download()` already has the right publication in a local variable. It
looks up the publication the address names (lines 417–423), answers
"404 Not Found" unless it is published and the format belongs to it
(lines 425–431), and hands it to the view page's template as
`'publication' => $publication` (line 484).

The change that added the line passes the publication to every usage
event, so that the event's listener can check that the version viewed
is published. In `book()` the property is the
right value. The same change in `HtmlMonographFilePlugin::downloadCallback()`
looks the publication up itself. In `download()` the property was
used where the local variable was meant.

Reach:

- **Every free file the handler serves itself** (on screen: a PDF
  through the viewer and with the viewer off). The viewer's file
  request, both download buttons and a plain download all end on line
  533. Chapter files, an older version's files
  (`…/version/{id}/…`) and files of any other type take the same path
  (code).
- **A file a reader has paid for** (code): the same branch, line 493.
- **An HTML file** (code): with "HTML Monograph File" on, the plugin
  answers the `CatalogBookHandler::download` hook with the file before
  line 533 is reached, so the file shows. With the plugin off, the
  only listener left on the hook is
  `PdfJsViewerPlugin::downloadCallback()`, which sets `$inline` for a
  PDF and returns false. The request goes on to line 533 and fails
  like any other file's.
- **Usage statistics** (on screen): the failed requests write no file
  line to the usage log, so file views are not counted.
- **The file addresses in the book page's tags** (code):
  `GoogleScholarPlugin` writes `citation_pdf_url` and
  `citation_fulltext_html_url` as `catalog/download/{book}/{format}/{file}`,
  the address that fails.
- **Not this fault:** dependent files of an HTML file and a
  publication's media files are sent before the usage event (lines 457
  and 465). OJS's `ArticleHandler` and OPS's `PreprintHandler` set
  their `$this->publication` in `initialize()`, which runs for every
  operation. The view page's console error "PDFJS is not defined" has
  its own cause and report
  ([U69-A9-pdf-view-page-script-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-pdf-view-page-script-error.md)).
  `book()` reading the same unset property for a version address that
  names no version (spec U69
  [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a3))
  is a different line (122), and this fix does not cover it.

## Proposed fix

Pass the publication `download()` has already looked up and checked
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-open-download-fails/fix.diff)):

```diff
--- a/pages/catalog/CatalogBookHandler.php
+++ b/pages/catalog/CatalogBookHandler.php
@@ -530,7 +530,7 @@
                     publicationFormat: $publicationFormat,
                     submissionFile: $submissionFile,
                     chapter: $chapter,
-                    publication: $this->publication,
+                    publication: $publication,
                 ));
```

This keeps what `pkp/pkp-lib#12311` wanted: the event carries the
version the file belongs to, which `download()` has already confirmed
is published. It is what the same method gives the template, and what
the HTML plugin's callback passes.

Tried on OMP `main`: the viewer showed the PDF ("of 1"), both download
buttons saved `epilogue.pdf` (14,572 bytes), and with the viewer off
the link downloaded the file. Each opening wrote a file line (type 515)
to the usage log, and no request answered an error. With the fix in and
out, the book's page opened and wrote its usage line, and a file
address naming another book's file or no file stayed "404 Not Found".

- **Alternatives.** Setting `$this->publication = $publication` in
  `download()` also works, but the handler's other methods read the
  property as "the version `book()` is showing", and nothing in
  `download()` needs it. Making the property nullable would send the
  file but lose its count without a word: lib/pkp's
  `LogUsageEvent::canHandle()` returns false for a file event whose
  publication is null, so the view would never be logged.
- **What goes with it.** No stored data is wrong, and there is
  nothing to backport. The guard is an e2e check
  that a reader opens a book's free PDF in the viewer and downloads it
  (spec U69, a **Planned** item).

Small: one line in one method.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-open-download-fails/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-open-download-fails/lib.js)),
  takes steps 1 to 7 and reads the usage log and the server log after
  them. Run it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-file-open-download-fails/walk.js`.
  `WALK=neighbour` in front takes the neighbour check (the book's page;
  `catalog/view/5/2/1`, a file of another book; and
  `catalog/download/5/2/999999`, no file).
- The fix was tried with `node bin/try-fix.js apply …/fix.diff omp`, the
  script in both modes, then reverted.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database (MySQL not checked). Datasets: pkp/datasets
  92050d9 (2026-10-01). On 3.5 the same steps showed the PDF ("of 1"),
  saved `epilogue.pdf` at steps 4, 5 and 7 and wrote three file lines
  to the usage log.
- Tips:

  | Line | OMP | lib/pkp |
  |---|---|---|
  | `main` | 3b0ecf794 | 3dc90c81a6 |
  | `stable-3_5_0` | b24879c3d | 1fb843f491 |
  | `stable-3_4_0` | 0aec65441 | not read |
  | `stable-3_3_0` | 8e72fc883 | not read |
- Code reads:
  - `main`: `CatalogBookHandler::book()`, `view()`, `download()` and
    `setChapter()`; `HtmlMonographFilePlugin::downloadCallback()`;
    `GoogleScholarPlugin`'s two file tags; OJS `ArticleHandler` and OPS
    `PreprintHandler` for where they set the property; lib/pkp
    `UsageEvent`'s constructor and `LogUsageEvent::canHandle()`;
    OMP's `PdfJsViewerPlugin::downloadCallback()`. pkp/omp's `main` on GitHub still has
    line 533 as walked (read 2026-10-01).
  - 3.5 and 3.4: `download()` builds the event the old way,
    `new UsageEvent($assocType, $request->getContext(), $submission, $publicationFormat, $submissionFile, $chapter)`
    (lines 467 and 451), without the property. 591d7a0e73 is on no
    branch but `main`.
  - 3.3: `CatalogBookHandler.inc.php` builds no usage event, and its
    `download()` does not read `$this->publication`.
- Introduced: `git blame` on line 533 names 591d7a0e73, which wrote the
  line; the commit belongs to `pkp/omp#2441`, listed on
  `pkp/pkp-lib#12311` ("JATS usage tracking and stats compilation").
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/omp and pkp/ui-library,
  by symptom ("OMP download file 500 usage event", "publication format
  file download error 500", "pdf viewer Unexpected server response")
  and by the class and message (`CatalogBookHandler` "must not be
  accessed before initialization"). Nothing matched.
- Not driven: an HTML file with "HTML Monograph File" on and off, an
  EPUB or supplementary file, a chapter page's file link, an older
  version's file and a paid file. The default dataset holds none of the
  first three; all are read in the code as the same line. The tags'
  addresses were read in the code, not followed from a page.
