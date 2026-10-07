# A book with two PDF files for the whole book announces only one of them to Google Scholar

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code; the Login case too)
  - 3.3: none (code)
- **Introduced** `pkp/omp#1061` for `pkp/pkp-lib#7003` · [6ee5ca5312](https://github.com/pkp/omp/commit/6ee5ca531272703d3153065f3c19238d5ba8326a) · 2022-01-30 (merged 2022-02-25) · Dulip Withanage (withanage)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U20 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp2)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-07.** Since `pkp/pkp-lib#13444`
([8c807c919](https://github.com/pkp/omp/commit/8c807c919bfb6ea2d0e481aa7cd312533aa71e90),
2026-10-05) the address the tag names opens its file on `main` instead
of failing, so when that file is for sale a search engine following it
is sent to the Login page. The severity is raised from low to medium.

## Summary

A book that offers two PDF files for the whole book, in one publication
format or in two, announces only one of them to Google Scholar. The
book page carries a single "citation_pdf_url" tag, for the file
uploaded first; between files with the same upload time, the database
decides which. The same holds for two HTML files, and for two files of
one kind on a chapter's page.

The page itself offers both files to readers, so only the search index
misses one. The press is not told. When the file the tag names is for
sale ("Direct Sales"), a search engine following the tag lands on the
Login page, and no tag points it to the book's free file.

It happens when the formats carry no ISBN, as in PKP's own test data.
When every such format carries an ISBN, both files are announced.

## Impact

- **Lost**: Google Scholar's pointer to every file but one. Scholar's
  inclusion guidelines ask a page to list "all full text versions" with
  `citation_pdf_url`.
- **Who**: presses that offer two PDF files for the whole book (parts
  of the book, or a free and a priced edition) when the formats have no
  ISBN. Also a chapter whose page offers two files of the same kind.
- **Way round**: an ISBN on each format gets every file announced,
  though nothing on screen points to it. The press cannot choose which
  file keeps the tag.

Medium: when the file announced is for sale, Google Scholar is told
nothing of the book's free file, silently. With only free files,
Scholar still has one full text for the book; that case alone would be
low.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`. Submission 14,
"From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots",
is published. Its "PDF" format holds two files for the whole book, "The
Canadian Nutrient File: Nutrient Val.pdf" and "Segmentation of Vascular
Ultrasound Imag.pdf", and one file per chapter, all "Open Access". The
format has no ISBN. The Google Scholar plugin is on.

Two files, both free:

1. Sign in as `dbarnes`, open submission 14, and open "Publication" ›
   "Publication Formats". "PDF" lists `chapter1.pdf` to `chapter4.pdf`
   and the two files for the whole book.
2. Sign out and open the book's page,
   `/index.php/publicknowledge/en/catalog/book/14`. The side column
   under "PDF" offers both files for the whole book.
3. View the page's source and find `citation_pdf_url`.
4. Open the tag's address in the browser, still signed out.

One file for sale:

5. Sign in as `dbarnes` and open "Publication Formats" again. Under
   "PDF", on the file the tag named ("The Canadian Nutrient File:
   Nutrient Val.pdf"), press "Open Access", choose "Direct Sales", type
   `25.00` as the price and press "Save". The file's row reads "Direct
   Sales".
6. Sign out, open the book's page again and find `citation_pdf_url` in
   its source.
7. Open the tag's address, still signed out.

**Expected**: two `citation_pdf_url` tags, one for each file for the
whole book (files 108 and 109), at step 3 and at step 6. At step 7 the
priced file's address may well ask for a login, but the free file's
tag sends a search engine to its PDF.

**Observed**: one tag at step 3, naming file 108, "The Canadian
Nutrient File: Nutrient Val.pdf":

```html
<meta name="citation_pdf_url" content="http://…/index.php/publicknowledge/catalog/download/14/3/108"/>
```

At step 4 the address downloads that PDF. At step 6 the page carries
the same single tag, now for the priced file, and at step 7 its address
answers `302` to
`/index.php/publicknowledge/en/login?source=…%2Fcatalog%2Fdownload%2F14%2F3%2F108`,
the Login page. The free file, 109, has no tag; its address,
`…/catalog/download/14/3/109`, downloads its PDF.

The dataset's two files share an upload time, so which of them keeps the
tag is the database's order: an earlier 3.5 walk of the same book named
file 109. Where the tag names file 109, step 5 prices that file instead.

## Cause

`GoogleScholarPlugin::monographView()` in OMP's
`plugins/generic/googleScholar/GoogleScholarPlugin.php` loops over the
book's files with one counter, `$i`. For each book file, it writes the
format's ISBN tags as `googleScholarIsbn{$i++}`. Then it calls
`_setFileUrl($availableFile, $templateMgr, $i, …)` (lines 165 and 168 on
`main`).

`_setFileUrl()` takes `int $i` by value (line 213). It writes
`googleScholarPdfUrl{$i++}` or `googleScholarHtmlUrl{$i++}`, but its
`$i++` changes only its own copy. The loop's counter moves only with ISBN
tags, so the next file of the same kind writes the same header key.
`PKPTemplateManager::addHeader()` (`lib/pkp/classes/template/PKPTemplateManager.php`)
keeps one entry per key, so the later file's tag replaces the earlier
one. The files are read newest first, so the file uploaded first keeps
the tag.

Before `pkp/omp#1061` the tag was written inline in the loop, and its
`$i++` moved the loop's counter. 6ee5ca5312, in that PR, added Google
Scholar tags to chapter pages. It moved the tag into a new
`setFileUrl()` that took `int $i` by value. e03ac22c4, in the same PR,
renamed it `_setFileUrl()`.

Reach:

- A priced file takes part like a free one.
  `CatalogBookHandler::book()` passes the plugin every format file with
  a sales type set ("Open Access" or "Direct Sales"), and the collision
  ignores the price, so the one tag can name a file for sale. Its
  address sends a signed-out visitor to the Login page
  (`CatalogBookHandler::download()`). Checked on screen.
- The ISBN case (an ISBN on each format keeps the keys apart, since the
  ISBN tags are written per file before the file's tag) and chapter
  pages (no ISBN is written there, so two files of one kind always
  collide): checked in the code. The case with no ISBN was checked on
  screen.
- The fault that announces an EPUB or any other file as HTML is
  separate:
  [U20-OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U20-OMP1-book-epub-announced-as-html.md).

## Proposed fix

Key each file's tag by the file's own id, and drop the counter from
`_setFileUrl()`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-announces-one-pdf/fix.diff)
for `main` and 3.5;
[fix-3_4.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-announces-one-pdf/fix-3_4.diff)
for 3.4):

```diff
-                        $this->_setFileUrl($availableFile, $templateMgr, $i, $request, $submission);
+                        $this->_setFileUrl($availableFile, $templateMgr, $request, $submission);
 …
-                            $this->_setFileUrl($availableFile, $templateMgr, $i, $request, $submission);
+                            $this->_setFileUrl($availableFile, $templateMgr, $request, $submission);
 …
-    private function _setFileUrl($availableFile, TemplateManager $templateMgr, int $i, \APP\Core\Request $request, \APP\submission\Submission $submission): void
+    private function _setFileUrl($availableFile, TemplateManager $templateMgr, \APP\Core\Request $request, \APP\submission\Submission $submission): void
 …
-                $templateMgr->addHeader('googleScholarPdfUrl' . $i++, …);
+                $templateMgr->addHeader('googleScholarPdfUrl' . $availableFile->getId(), …);
 …
-                $templateMgr->addHeader('googleScholarHtmlUrl' . $i++, …);
+                $templateMgr->addHeader('googleScholarHtmlUrl' . $availableFile->getId(), …);
```

This gives one key per file, as OJS's and OPS's twins do by keying each
galley's tag on the galley's own place in their loop. It keeps what
`pkp/omp#1061` was for: chapter pages announce their own files. Tried
on `main`: with the fix, the Steps show both `…/download/14/3/108` and
`…/download/14/3/109` at steps 3 and 6, and after step 5 the free
file's tag downloads its PDF. Control read: chapter 1's page announces
its own file alone, with the fix and without it.

**Alternatives**:

- Pass the counter by reference (`int &$i`). One character restores the
  behaviour before `pkp/omp#1061`. But file tags and ISBN tags would
  still share one counter, which is how this broke.
- Collect the addresses in an array and write the tags after the loop:
  a larger change for the same result.

**What goes with it**:

- No data repair. The tags are built each time the page is shown, so
  every book is corrected at once.
- `_setFileUrl()` is private, so no plugin or caller relies on its
  signature.
- Backport: 3.5 takes `fix.diff` as written. On 3.4 the tag lines build
  the address with `$request->url(…)`, so the same edit is in
  `fix-3_4.diff` (checked with `git apply --check`). 3.3 writes the tag
  inline and is not affected.
- Not covered by this fix: a file for sale keeps its tag, whose address
  asks a search engine to log in. OJS announces a galley behind a
  subscription the same way, so leaving priced files out of the tags is
  a product question, not part of this fix.
- Not covered either: ISBN tags are written once per file rather than
  once per format. A format with an ISBN and two files repeats its
  `citation_isbn`, which repeats a value and loses nothing.
- Guard: OMP has no unit tests for its plugins, so the guard is the e2e
  scenario here, a **Planned** item in U20: book 14's page carries one
  `citation_pdf_url` per file for the whole book.

Small: five lines in two methods (the two calls in `monographView()`,
and the signature and two keys in `_setFileUrl()`).

## Evidence

- The kept script takes the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js),
  with helpers in
  [`../book-epub-announced-as-html/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-epub-announced-as-html/lib.js)
  and
  [`../priced-file-link-price-twice-or-missing/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/priced-file-link-price-twice-or-missing/lib.js).
  Run it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `WALK=neighbour`
  for the control read). Steps 4 and 7 open each tag's address as a
  signed-out browser does and record every answer up to the file or the
  Login page. Step 5 prices the file the one tag named. The fix is
  applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/book-page-announces-one-pdf/fix.diff omp`.
- Walked 2026-10-07 on OMP `main` and `stable-3_5_0`, on PostgreSQL;
  both named file 108 at step 3. On 3.5 the address opened its file
  before `pkp/pkp-lib#13444` too, and 3.4's `CatalogBookHandler` does
  the same (code), so the Login case is not new there. Which of two
  files with the same upload
  time keeps the tag is the database's order: MySQL not checked.
  Datasets: pkp/datasets 401a013 (2026-10-06). The press had no
  currency set, so the terms window read "Price ()"; a signed-out
  visitor is sent to the Login page before the payment settings are
  read (`CatalogBookHandler::download()`), so they do not change step 7.
- Tips: OMP `main` a0e6d0a8bc (pkp-lib 5a5ab2d6c7), `stable-3_5_0`
  7d6b00060 (pkp-lib 6d7f1540b6), `stable-3_4_0` 0aec65441,
  `stable-3_3_0` 8e72fc883. Since the 2026-10-03 walk, `monographView()`
  changed only in its publisher tag (ec027e661); `_setFileUrl()` is
  unchanged.
- Code reads:
  - `monographView()` and `_setFileUrl()` on `main`, 3.5 and 3.4;
    `monographView()` on `stable-3_3_0` (lines 120 to 127).
  - `CatalogBookHandler::book()` (the `availableFiles` it passes, priced
    files included) and `CatalogBookHandler::download()` (the redirect
    to Login for a priced file and a signed-out visitor) on `main`, and
    the same on 3.4 and 3.3.
  - OJS's `GoogleScholarPlugin::submissionView()`: a tag for every
    galley, whatever its access.
  - `git blame` on the call and the signature, then the diffs of
    6ee5ca5312 and e03ac22c4.
  - `PKPTemplateManager::addHeader()`, and the submission file
    `Collector` for the order of the files.
  - Google Scholar's inclusion guidelines
    (https://scholar.google.com/intl/en/scholar/inclusion.html).
- Unverified: whether Google Scholar indexes the text of more than one
  `citation_pdf_url` on a page, and what it does with a book whose one
  tag leads to a Login page. The guidelines ask for every version's tag
  but do not say how several are used.
- Tracker search (2026-10-07), pkp/pkp-lib, pkp/omp and pkp/ui-library:
  Google Scholar with OMP, PDF, monograph, chapter files and direct
  sales, and "only one file", plus `citation_pdf_url` and `_setFileUrl`.
  Nothing found; `pkp/pkp-lib#13444` is the download fix named above.
- Not driven: 3.4 and 3.3 (code only), the ISBN case and a chapter with
  two files (code only).
