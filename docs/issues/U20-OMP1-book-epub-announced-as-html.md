# A book page tells Google Scholar its EPUB, or any file that is not a PDF, is HTML full text

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; the EPUB is announced too, but no HTML file is left out)
- **Introduced** `pkp/omp#916` for `pkp/pkp-lib#5686` · [c6bcea27d8](https://github.com/pkp/omp/commit/c6bcea27d85e2e4789f53892324758b358c83df8) · 2021-01-25 · Dulip Withanage (withanage)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp1)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press offers a book as an EPUB, or as any other file that is neither a
PDF nor HTML. Its book page then tells Google Scholar that this file is
the book's full text in HTML: the "citation_fulltext_html_url" tag names
the EPUB's download address. A chapter's page does the same with the
chapter's files.

When the book also has a real HTML file, only one of the two gets the
tag: the file uploaded first. If the press uploaded the EPUB first, its
HTML full text is left out. Nothing on screen shows this. The only way
round is to make the EPUB format "Not Available", which also takes the
EPUB away from readers.

It applies to any format marked "Available" whose file has its terms
set, on any press where the Google Scholar plugin is on, as it is by
default.

## Impact

- **Lost**: a correct full-text pointer for Google Scholar. Scholar is
  sent to an EPUB (or an audio file, a ZIP, a Word file) as if it were
  an HTML page, and a real HTML file can go unannounced.
- **Who**: every press that offers a book or chapter as EPUB or another
  format that is not PDF or HTML. EPUB beside PDF is a common way to
  sell a book.
- **Way round**: none that keeps the EPUB on offer (see the Summary).

Google Scholar's inclusion guidelines accept only HTML and PDF files.
So a book sold as EPUB alone gains nothing usable from the wrong tag,
but loses nothing either: without the fault it would have no full-text
tag at all. The worst case is a book offered as HTML and EPUB, with no
PDF, and the EPUB uploaded first. Scholar is then left with no usable
full text, where the HTML file would have given it one.

Medium: a tag that Google Scholar reads is wrong, silently, on every
book that offers such a file. It is not higher because a book with a
PDF keeps its PDF tag, and only a book offered as HTML and another
non-PDF format, with no PDF, loses its only usable full text.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Submission 14, "From Bricks to
  Brains: The Embodied Cognitive Science of LEGO Robots", is published.
  Its "PDF" format holds two files for the whole book and one per
  chapter. The Google Scholar plugin is on.
- Two files on your computer: an EPUB, `u20b-book.epub`, and an HTML
  page, `u20b-book.html`. The HTML page must be a full HTML document
  (`<!DOCTYPE html><html>…`). The upload detects a file's type from its
  content, and a bare fragment is stored as `text/plain`.

Steps:

1. Sign in as `dbarnes` and open submission 14.
2. Open "Publication" › "Publication Formats".
3. Press "Add publication format", type the Name "EPUB" and press "OK".
4. In the "EPUB" row, press "Change File". Choose the component "Book
   Manuscript", upload `u20b-book.epub`, then press "Continue",
   "Continue" and "Complete".
5. In the file's row, press "Set Terms", choose "Open Access" and press
   "Save".
6. In the "EPUB" row, press "Not Available", then "OK". The row reads
   "Available".
7. Repeat steps 3 to 6 for a format named "HTML", with
   `u20b-book.html`.
8. Sign out and open the book's page,
   `/index.php/publicknowledge/en/catalog/book/14`. The side column
   offers "EPUB" and "HTML" beside the two PDF files.
9. View the page's source and find `citation_fulltext_html_url`.

**Expected**: one `citation_fulltext_html_url` tag, naming the HTML
file's download address. The EPUB gets no tag.

**Observed**: one `citation_fulltext_html_url` tag, naming the EPUB.
The EPUB was file 145 in the "EPUB" format (format 4), stored with the
type `application/epub+zip`. The HTML file, 146 in format 5, gets no
tag. (The single PDF tag for two PDF files is the separate fault in
[U20-OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U20-OMP2-book-page-announces-one-pdf.md).)

```html
<meta name="citation_pdf_url" content="http://…/index.php/publicknowledge/catalog/download/14/3/108"/>
<meta name="citation_fulltext_html_url" content="http://…/index.php/publicknowledge/catalog/download/14/4/145"/>
```

## Cause

`GoogleScholarPlugin::_setFileUrl()` in OMP's
`plugins/generic/googleScholar/GoogleScholarPlugin.php` (line 219 on
`main`) picks the tag by the file's type:

```php
switch ($availableFile->getData('mimetype')) {
    case 'application/pdf':
        // citation_pdf_url
        break;
    case 'text/xml' or 'text/html':
        // citation_fulltext_html_url
        break;
}
```

PHP reads `'text/xml' or 'text/html'` as one expression, whose value is
`true`. A `switch` compares loosely, and any non-empty string equals
`true`. So every type except `application/pdf` takes the HTML branch:
EPUB, MOBI, MP3, ZIP, Word, Markdown, plain text. The author meant two
case labels, one for XML and one for HTML.

The HTML file loses its tag to the EPUB because of a second fault in the
same method:
[U20-OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U20-OMP2-book-page-announces-one-pdf.md).
`_setFileUrl()` takes `int $i` by value, so the counter in the tag's key
moves only with ISBN tags, and a later tag of the same kind replaces an
earlier one. The files are read newest first, so the file uploaded first
keeps the tag. Once the EPUB no longer takes the HTML branch, the HTML
file keeps its tag.

Reach:

- Chapter pages call `_setFileUrl()` for the chapter's files, the same
  as the book page (checked in the code; the book page on screen).
- OJS's and OPS's twins of this plugin compare the type against
  `application/pdf` and `text/html` one at a time, so they are not
  affected. No other `case 'a' or 'b':` exists in OJS, OMP, OPS or
  pkp-lib (both checked in the code).

## Proposed fix

Announce `text/html` files alone as HTML full text, as OJS and OPS do
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-epub-announced-as-html/fix.diff)
for `main` and 3.5;
[fix-3_4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-epub-announced-as-html/fix-3_4.diff)
for 3.4):

```diff
--- a/plugins/generic/googleScholar/GoogleScholarPlugin.php
+++ b/plugins/generic/googleScholar/GoogleScholarPlugin.php
@@ -216,7 +216,7 @@
             case 'application/pdf':
                 $templateMgr->addHeader('googleScholarPdfUrl' . $i++, …);
                 break;
-            case 'text/xml' or 'text/html':
+            case 'text/html':
                 $templateMgr->addHeader('googleScholarHtmlUrl' . $i++, …);
                 break;
         }
```

`pkp/omp#916` meant to announce XML files as well, but an uploaded XML
book file is stored as `text/xml`. The upload's type detection reads the
content, and the extension map turns only `.html` and `.xhtml` files
read as `text/xml` into `text/html`. A `text/xml` case would send
Scholar to an XML download under a tag meant for an HTML page, a format
Scholar's guidelines do not accept. With the fix, the Steps show the HTML
file's address (`…/download/14/5/146`) and no tag for the EPUB. Control
read: the book's PDF tag and chapter 1's page are the same with the fix
and without it.

**Alternatives**:

- Two case labels, `case 'text/xml': case 'text/html':`, as the author
  wrote. That keeps an XML file announced as HTML full text, for the
  reason above.
- `in_array()` or a `match` on the type: the same result with a larger
  change.

**What goes with it**:

- No data repair. The tags are built each time the page is shown, so
  every book is corrected at once, and Google Scholar picks the change
  up on its next crawl.
- Backport: 3.5 takes `fix.diff` as written. On 3.4 the tag lines build
  the address with `$request->url(…)`, so the same one-line edit is in
  `fix-3_4.diff` (checked with `git apply --check`). 3.3 has the same
  case in `GoogleScholarPlugin.inc.php`'s `monographView()`, which
  takes the same edit by hand.
- Guard: OMP has no unit tests for its plugins, so the guard is the e2e
  scenario here, a **Planned** item in U20: a book with an EPUB and an
  HTML format, and the book page's tags.

Small: one case label in one method.

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-epub-announced-as-html/walk.js),
  with its helpers in `lib.js` beside it. It writes the two uploaded
  files itself: a minimal EPUB and a full HTML document. Run it on an
  install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-epub-announced-as-html/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `WALK=neighbour`
  for the control read). The fix is applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/book-epub-announced-as-html/fix.diff omp`.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL. Files with the
  same upload time come back in the database's order: MySQL not checked.
  Datasets: pkp/datasets e8dafbc (2026-10-02).
- Tips: OMP `main` 3b0ecf794c, `stable-3_5_0` 9c5e24246c,
  `stable-3_4_0` 0aec65441, `stable-3_3_0` 8e72fc883.
- Code reads:
  - `_setFileUrl()` on `main`, 3.5 and 3.4, and `monographView()` on
    `stable-3_3_0` (line 124).
  - `git log -S` for the `case` line.
  - `PKPFileService::add()` with Flysystem's `FinfoMimeTypeDetector`
    and `PKPString::getAmbiguousExtensionsMap()`, for the stored type.
    finfo on this machine reads an XML file as `text/xml` and an HTML
    fragment as `text/plain`.
  - `CatalogBookHandler::book()` and the submission file `Collector`,
    for which files reach the plugin and in what order.
  - Google Scholar's inclusion guidelines
    (https://scholar.google.com/intl/en/scholar/inclusion.html), for the
    accepted formats.
- Tracker search (2026-10-03), pkp/pkp-lib, pkp/omp and pkp/ui-library:
  Google Scholar with OMP, EPUB, HTML and full text,
  `citation_fulltext_html_url` and `_setFileUrl`. Nothing found.
- Not driven: 3.4 and 3.3 (code only), and file types other than EPUB,
  HTML and PDF.
