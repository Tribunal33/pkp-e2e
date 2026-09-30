# Readers cannot open or download a book's files on a press: an empty PDF viewer or a blank page

- **Severity** critical
- **Effort** small
- **Kind** regression
- **Crash** both
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#2441` for `pkp/pkp-lib#12311` · [591d7a0e73](https://github.com/pkp/omp/commit/591d7a0e733e345f9cbbbb5403d43c2b39cf946b) · 2026-08-26 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** Monograph landing page U69 [A9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a9) · Media files U47 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U47-media-files.md#omp1) · Search engine metadata & analytics U20 [OMP6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp6) · Usage statistics U64 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U64-usage-statistics.md#omp3)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

On a press, no reader can open or save a file of a published book:
every request for a book file fails on the server with an error (500),
and the PDF viewer's script then fails on that answer. A PDF's link
opens the PDF view page, but the viewer shows a red "Unexpected server
response." bar instead of the PDF, and the page's "Download" saves
nothing. Any other file opens a blank page. A PDF also opens a blank
page while "PDF.js PDF Viewer" is off. Only an HTML file shows, and
only while "HTML Monograph File" is on.

There is no way round on screen, signed in or not; search engines get
the same error, and no file view is counted in the usage statistics.
No released version is affected; the fault is only on `main`.

## Impact

- **Lost**: the content of every book, and the count of every file
  view in the usage statistics. The reader sees an error bar or a blank
  page, and the press is not told.
- **Who**: every reader of a press running this code, on every book
  file (whole-book and chapter PDFs, supplementary files, e-books), in
  the default setup, and search engines indexing those files. Editors
  and authors downloading files in the workflow are not affected: those
  downloads go through another handler.
- **Way round**: none. No press setting gets the files served.

Critical, rating the code as it will ship: reading or downloading what
is published is a core task, and it would fail on every press with no
way round.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its published submission 14,
  "From Bricks to Brains: The Embodied Cognitive Science of LEGO
  Robots", has a format "PDF" whose files (one per chapter, two
  supplementary files) are free ("Open Access"). "PDF.js PDF Viewer" is
  on, as on every new press. Nothing is created.

Reading a PDF, signed out:

1. Open the press's "Catalog" and press "From Bricks to Brains: The
   Embodied Cognitive Science of LEGO Robots".
2. Under "Chapters", on "Chapter 1: Mind Control—Internal or External?",
   press "PDF".
3. On the page that opens, press "Download" in the top bar.
4. Open the address "Download" points to directly
   (`/index.php/publicknowledge/en/catalog/download/14/3/113?inline=1`).

A search engine's address, signed out:

5. On the book page, view the page source and open the address in its
   `citation_pdf_url` tag (`/index.php/publicknowledge/catalog/download/14/3/108`).
   That is the supplementary file listed under "Downloads" as "The
   Canadian Nutrient File: Nutrient Val.pdf".

A file no viewer takes (a PDF with the viewer off):

6. Sign in as `rvaca` (Press manager). Settings › Website › "Plugins",
   untick "PDF.js PDF Viewer" and confirm "Are you sure you want to
   disable this plugin?" with "OK". Sign out.
7. Open the book again and press Chapter 1's "PDF".

**Expected**: step 2 opens "PDF view of the file chapter1.pdf" with the
chapter's page in the viewer; steps 3 and 4 give chapter1.pdf; step 5
gives "The Canadian Nutrient File: Nutrient Val.pdf"; step 7 downloads
chapter1.pdf. Each file view adds a line to the day's usage event log
(`{files_dir}/usageStats/usageEventLogs/usage_events_YYYYMMDD.log`),
from which the usage statistics are compiled. A browser that sends Do
Not Track logs nothing, with or without the fault, so check with it off.

**Observed**: step 2 opens "PDF view of the file chapter1.pdf", but the
viewer reads "of 0" pages under a red bar "Unexpected server response.",
whose "More Information" reads:

```
PDF.js v2.6.347 (build: 3be9c65f)
Message: Unexpected server response (500) while retrieving PDF "http://…/index.php/publicknowledge/en/catalog/download/14/3/113?inline=1".
```

At step 3 the page stays as it is and the browser's download, named
"113.html", is cancelled. Steps 4, 5 (after a redirect to the `/en/`
address) and 7 answer 500 with an empty page. The server logs the same
line each time:

```
PHP Fatal error:  Uncaught Error: Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization in …/pages/catalog/CatalogBookHandler.php:533
```

The day's usage event log gains no line for any of these steps. The
book page itself opens, and its visit adds a line.

## Cause

`CatalogBookHandler::download()` (OMP `pages/catalog/CatalogBookHandler.php`)
serves every book file, and `view()` calls it too. Near its end, just
before it sends the file, it fires the file's usage event with
`publication: $this->publication` (line 533). `download()` never sets
that property. `book()` sets it, from the address's version or the
current publication, but a file request never passes through `book()`.
`download()` resolves the publication itself, into the local
`$publication`, and checks that it is published and owns the format.

The property is declared `public Publication $publication;` (typed,
since [29fa885084](https://github.com/pkp/omp/commit/29fa885084560ff55e1f7d3aabd84f37e81b1795),
2025-03-20). PHP throws when a typed property is read before it is
set, so the request dies with the fatal error above before
`app()->get('file')->download()` runs. The argument came in with
591d7a0e73, which passed the publication to every submission, chapter
and file usage event (press and series events carry none) so that
`LogUsageEvent::canHandle()` can skip views of unpublished versions
(`pkp/pkp-lib#12311`). The same change passed the property in `book()`,
where it is set, and the local `$filePublication` in
`HtmlMonographFilePlugin::downloadCallback()`.

The reach:

- Free files and files a buyer has paid for go through the same
  branch (`hasPaidPurchaseFile()`), so both reach the line (read in the
  code).
- That covers the PDF viewer's own fetch and its "Download", and a PDF
  while "PDF.js PDF Viewer" is off (seen on screen). It also covers every
  other format's link, since `view()` finds no viewer and falls through
  to the download, and an HTML file while "HTML Monograph File" is off
  (read in the code).
- Addresses of an earlier version (`…/download/{book}/version/{id}/…`)
  reach the same line (read in the code).
- The `citation_pdf_url` and `citation_fulltext_html_url` tags on book
  and chapter pages name these download addresses (seen on screen for
  `citation_pdf_url`).
- Usage statistics: PHP fails while it evaluates the event's
  constructor arguments, before any event exists, so no file view or
  download is logged (seen on screen: no log line).
- Not reached: an HTML file while "HTML Monograph File" is on, which its
  `CatalogBookHandler::download` hook serves and counts before the line;
  the images and style sheets of an HTML file and a publication's media
  files, which `download()` serves earlier; the book and chapter pages
  (read in the code, and the book page seen on screen); workflow file
  downloads, which go through `FileApiHandler::downloadFile()` (read in
  the code).
- OJS and OPS are not affected: `ArticleHandler` and `PreprintHandler`
  set `$this->publication` in `initialize()`, which every download
  passes through (read in the code).

## Proposed fix

Pass the publication `download()` has already resolved and checked
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-book-files-fail-to-open/fix.diff)):

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
             }
             $returner = true;
```

`$publication` is the version the address names, or the current one.
`download()` has already answered 404 unless that publication is
published and owns the format. `PdfJsViewerPlugin` gives its template
the same publication. So the change keeps the intent of 591d7a0e73: the
event carries the file's publication, and `LogUsageEvent` still skips
an unpublished one. A search of every `publication:` argument to a
usage event in OJS, OMP and OPS found no other one that reads an unset
property. No REST API, hook signature or stored data changes.

Tried on OMP `main` by taking the Steps again: the viewer showed the
chapter's page ("of 1"), "Download" saved chapter1.pdf, the typed address and the
`citation_pdf_url` address answered the PDF, the viewer-off link
downloaded chapter1.pdf, and the usage log gained one line per file
view. A check that a login-only press ("Users must be registered and
log in to view open access content.") still sends a signed-out visitor
to Login passed with and without the fix.

**Alternatives**

- Also set `$this->publication = $publication;` in `download()`. The
  `CatalogBookHandler::view` and `::download` hooks receive `&$this`,
  so a plugin that reads `$handler->publication` in a file request
  crashes today in the same way; setting the property would give it the
  file's publication, as `book()` gives its own hook. No plugin in
  OMP's tree reads it there, so the one-line argument change is enough
  for OMP itself; add the assignment if a gallery plugin turns out to
  read it.
- Resolve the publication once in an `initialize()`, as OJS's
  `ArticleHandler` and OPS's `PreprintHandler` do. That is the lasting
  shape, but it reworks `book()`'s version handling, which is more than
  this fault needs.
- Declare the property nullable (`?Publication $publication = null`).
  This stops the crash, but the event would carry null, so
  `LogUsageEvent::canHandle()` would drop every file view without a
  word.

**What goes with it**

- No data repair. Nothing was stored wrong, but the file views missed
  since 591d7a0e73 were never logged and cannot be recovered.
- A test that opens a published book file and checks that it
  downloads, which would also catch the next change to this path.

Small: one line in one handler, tried, and a test.

## Evidence

- The walk script, OMP only (no other app has book files):
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-book-files-fail-to-open/walk.js)
  takes the Steps on a fresh load of the default dataset and records
  each answer's status and headers, the server log and the day's usage
  event log. Run it with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/omp-book-files-fail-to-open/walk.js`
  after `npm run fleet-prep -- --feature <feature> --dataset 1 --reset`;
  on 3.5, put `PKP_E2E_LINE=stable-3_5_0` in front of both.
- The check that a login-only press still sends a signed-out visitor to Login:
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/omp-book-files-fail-to-open/neighbour.js),
  walked with the fix in and out (`node bin/try-fix.js apply|revert
  shared/playwright/checks/issues/omp-book-files-fail-to-open/fix.diff omp`).
  A signed-out visitor was sent to Login both times, from the link and
  from the typed download address. `aclark` (Reader), signing in from
  there, got the PDF with the fix and the error bar without it.
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6); OMP `stable-3_5_0`
  3081c9b00d (lib/pkp a9c76aed62); pkp/datasets 38ab955 (2026-09-30),
  PostgreSQL. The fault does not depend on the database.
- 3.5 was walked: every step showed the Expected. Its `download()`
  builds the event without a publication argument.
- 3.4 (code, `upstream/stable-3_4_0` 0aec65441f): `download()` builds
  the event without a publication argument, and the property is
  untyped.
- 3.3 (code, `upstream/stable-3_3_0` 8e72fc8836,
  `CatalogBookHandler.inc.php`): usage goes through the
  `CatalogBookHandler::download` hook, and `download()` does not read
  the property.
- Introduced: `git blame` on line 533 gives 591d7a0e73, merged by
  `pkp/omp#2441` (merge a1aefa3fe0); 29fa885084 was for
  `pkp/pkp-lib#10671`.
- Upstream search (2026-09-30, pkp/pkp-lib, pkp/omp, pkp/ui-library,
  issues and PRs, open and closed): "CatalogBookHandler", "must not be
  accessed before initialization", book file download 500, "usage
  event", 12311 follow-ups. The nearest, `pkp/pkp-lib#13231` (usage
  stats and publication versions), is a different problem.
- Not driven: an HTML file with "HTML Monograph File" off and an EPUB
  or other non-PDF format, since the dataset holds no such file; a file
  bought through direct sales; an earlier version's file. All reach the
  same line in the code.
- Unverified: whether any plugin in the PKP plugin gallery reads
  `$handler->publication` from the file hooks.
- Separate, not fixed here: the PDF view page's inline script (pdfJsViewer `display.tpl`) logs "PDFJS is not defined", with or without the fix, and does not stop the viewer.
