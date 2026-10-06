# A book with two PDF files for the whole book announces only one of them to Google Scholar

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code)
- **Introduced** `pkp/omp#1061` for `pkp/pkp-lib#7003` · [6ee5ca5312](https://github.com/pkp/omp/commit/6ee5ca531272703d3153065f3c19238d5ba8326a) · 2022-01-30 (merged 2022-02-25) · Dulip Withanage (withanage)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp2)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A book that offers two PDF files for the whole book, in one publication
format or in two, announces only one of them to Google Scholar. The
book page carries a single "citation_pdf_url" tag, for the file
uploaded first. The same holds for two HTML files, and for two files of
one kind on a chapter's page.

The page itself offers both files to readers, so only the search index
misses one. The press is not told.

It happens when the formats carry no ISBN, as in PKP's own test data.
When every such format carries an ISBN, both files are announced.

## Impact

- **Lost**: Google Scholar's pointer to the second file. Scholar's
  inclusion guidelines ask a page to list "all full text versions" with
  `citation_pdf_url`; this page lists one. Scholar still has one full
  text for the book.
- **Who**: presses that split a book into several files with no
  chapters, or offer two PDF editions, when the formats have no ISBN.
  Also a chapter whose page offers two files of the same kind.
- **Way round**: an ISBN on each format gets both files announced,
  though nothing on screen points to it.

Low: the guidelines treat several PDF tags as versions of one work, and
the book stays indexed through the one announced. For a book split into
parts, the guidelines do not say whether Scholar would read more than
one part. It would rise if Scholar were shown to index the text of each
file it is given.

## Steps to reproduce

Preconditions: PKP's default test dataset, OMP `main`. Nothing to
create. Submission 14, "From Bricks to Brains: The Embodied Cognitive
Science of LEGO Robots", is published. Its "PDF" format holds two files
for the whole book, "The Canadian Nutrient File: Nutrient Val.pdf" and
"Segmentation of Vascular Ultrasound Imag.pdf", and one file per
chapter. The format has no ISBN. The Google Scholar plugin is on.

1. Sign in as `dbarnes`, open submission 14, and open "Publication" ›
   "Publication Formats". "PDF" lists `chapter1.pdf` to `chapter4.pdf`
   and the two files for the whole book.
2. Sign out and open the book's page,
   `/index.php/publicknowledge/en/catalog/book/14`. The side column
   under "PDF" offers both files for the whole book.
3. View the page's source and find `citation_pdf_url`.

**Expected**: two `citation_pdf_url` tags, one for each file for the
whole book (files 108 and 109).

**Observed**: one tag, naming file 108, "The Canadian Nutrient File:
Nutrient Val.pdf":

```html
<meta name="citation_pdf_url" content="http://…/index.php/publicknowledge/catalog/download/14/3/108"/>
```

The dataset's two files share an upload time, so which of them keeps the
tag is the database's order: another 3.5 walk of the same book named
file 109.

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
`pkp/omp#1061` was for: chapter pages announce their own files. With
the fix, the Steps show both `…/download/14/3/109` and
`…/download/14/3/108`. Control read: chapter 1's page announces its own
file alone, with the fix and without it.

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
- Not covered by this fix: ISBN tags are written once per file rather
  than once per format. A format with an ISBN and two files repeats its
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
  [`../book-epub-announced-as-html/lib.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-epub-announced-as-html/lib.js).
  Run it on an install freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/book-page-announces-one-pdf/walk.js`
  (put `PKP_E2E_LINE=stable-3_5_0` in front for 3.5, and `WALK=neighbour`
  for the control read). The fix is applied with
  `node bin/try-fix.js apply shared/playwright/checks/issues/book-page-announces-one-pdf/fix.diff omp`.
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL. Which of two
  files with the same upload time keeps the tag is the database's order:
  MySQL not checked. Datasets: pkp/datasets e8dafbc (2026-10-02).
- Tips: OMP `main` 3b0ecf794c, `stable-3_5_0` 9c5e24246c,
  `stable-3_4_0` 0aec65441, `stable-3_3_0` 8e72fc883.
- Code reads:
  - `monographView()` and `_setFileUrl()` on `main`, 3.5 and 3.4;
    `monographView()` on `stable-3_3_0` (lines 120 to 127).
  - `git blame` on the call and the signature, then the diffs of
    6ee5ca5312 and e03ac22c4.
  - `PKPTemplateManager::addHeader()`, and `CatalogBookHandler::book()`
    with the submission file `Collector` for the order of the files.
  - Google Scholar's inclusion guidelines
    (https://scholar.google.com/intl/en/scholar/inclusion.html).
- Unverified: whether Google Scholar indexes the text of more than one
  `citation_pdf_url` on a page. The guidelines ask for every version's
  tag but do not say how several are used.
- Tracker search (2026-10-03), pkp/pkp-lib, pkp/omp and pkp/ui-library:
  Google Scholar with OMP, PDF, monograph and chapter files, and "only
  one file", plus `citation_pdf_url` and `_setFileUrl`. Nothing found.
- Not driven: 3.4 and 3.3 (code only), the ISBN case and a chapter with
  two files (code only).
