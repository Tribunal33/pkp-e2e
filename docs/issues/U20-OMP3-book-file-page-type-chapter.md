# A press's chapter pages tell indexes they are books, and whole-book file pages that they are chapters

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code; file pages only, no chapter pages)
- **Introduced** file pages: `pkp/omp#395` for `pkp/pkp-lib#1815` · [749f84f7db](https://github.com/pkp/omp/commit/749f84f7dbdeece4733ebf4ee58ebb406a2c6203) · 2017-02-27 (merged 2017-04-27) · Alec Smecher (asmecher); chapter pages: `pkp/omp#1061` for `pkp/pkp-lib#7003` · [ba905b0bac](https://github.com/pkp/omp/commit/ba905b0bac01c4af58b75e8d73a3492d82941589) · 2022-02-19 (merged 2022-02-25) · Dulip Withanage (withanage)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp3)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)

## Summary

On a press, the Dublin Core tag "DC.Type" does not follow what a page
describes. A chapter's own page reads "Text.Book", although its title,
author and abstract tags are the chapter's. The view page of a file for
the whole book, not assigned to a chapter, reads "Text.Chapter",
although its tags describe the book. That is the in-browser page the
book page's file link opens, not the download.

The book's page ("Text.Book") and a chapter file's view page
("Text.Chapter") are right. Readers see nothing wrong, and the press is
not told. "Dublin Core Indexing Plugin" writes these tags and is enabled
on every new press.

## Impact

- **Lost**: a correct record type on two kinds of page. The two readers
  of page tags checked, Google Scholar and Zotero, do not use these
  values (Evidence).
- **Who**: every press with the plugin enabled, on every chapter with a
  page of its own and every whole-book file; only machines read the
  tag.
- **Way round**: none on screen. Disabling the plugin removes every
  Dublin Core tag.

Low: one tag that no reader checked relies on, on pages whose title and
authors are right; it would be medium if an index were shown to type
its records from this tag.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  publishes book 14, "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots". Chapter 1 has a page of its own. The book's
  "PDF" format holds one file per chapter and two files for the whole
  book, not assigned to a chapter: "The Canadian Nutrient File:
  Nutrient Val.pdf" and "Segmentation of Vascular Ultrasound
  Imag.pdf", whatever their names suggest. "Dublin Core Indexing
  Plugin" is enabled. Nothing is created, and no sign-in is needed.

Steps:

1. Open the book's page, `/index.php/publicknowledge/catalog/book/14`,
   and view its source ("View Page Source"): find
   `<meta name="DC.Type"`.
2. Press the chapter title "Chapter 1: Mind Control—Internal or
   External?". The chapter's page opens
   (`…/catalog/book/14/chapter/54`). View its source: find
   `<meta name="DC.Type"`, and beside it "DC.Title".
3. Back on the book's page, in the side column under "PDF", press "The
   Canadian Nutrient File: Nutrient Val.pdf". The file's view page opens
   (`…/catalog/view/14/3/108`, titled "PDF view of the file The
   Canadian Nutrient File: Nutrient Val.pdf").
4. View that page's source: find `<meta name="DC.Type"`, and beside it
   "DC.Title" and "DC.Creator.PersonalName".
5. Back on the book's page, under chapter 1, press "PDF". The chapter
   file's view page opens (`…/catalog/view/14/3/113`).
6. View that page's source: find `<meta name="DC.Type"`.

**Expected**: "Text.Book" in steps 1 and 4, where the page describes
the book; "Text.Chapter" in steps 2 and 6, where it describes the
chapter.

**Observed**: steps 1 and 6 as expected. Step 2 reads:

```
<meta name="DC.Title" content="Chapter 1: Mind Control—Internal or External?"/>
<meta name="DC.Type" content="Text.Book"/>
```

Step 4 reads:

```
<meta name="DC.Creator.PersonalName" content="Michael Dawson"/>
<meta name="DC.Creator.PersonalName" content="Brian Dupuis"/>
<meta name="DC.Creator.PersonalName" content="Michael Wilson"/>
…
<meta name="DC.Title" content="From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots"/>
<meta name="DC.Type" content="Text.Chapter"/>
```

The other whole-book file, "Segmentation of Vascular Ultrasound
Imag.pdf", also gives "Text.Chapter".

## Cause

OMP's `DublinCoreMetaPlugin`
(`plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`) writes a
fixed "DC.Type" in each of its two page handlers, while the tags around
it choose between the book and the chapter.

`monographView()`, the `CatalogBookHandler::book` hook, serves the
book's page and a chapter's page. Since chapter pages got their tags
(`pkp/omp#1061`), it reads the template variable `isChapterRequest` and
takes the chapter's authors, date, abstract, DOI, other identifiers
and title. Line 176 still writes "Text.Book" for both pages.

`monographFileView()`, the `CatalogBookHandler::view` hook, serves a
file's view page. Before the hook, `CatalogBookHandler::download()`
assigns the template variable `chapter`: the file's chapter, or `null`
for a whole-book file. The method branches on `$chapter` for the tags
that differ between a book and a chapter (authors, date, abstract,
pages, DOI, title); the rest come from the publication. Line 340 writes
"Text.Chapter" for every file.

Reach:

- The book's page keeps "Text.Book" and every chapter file's view page
  "Text.Chapter" (walked, fix in and out).
- A chapter whose page is off answers 404 and carries no tags
  (walked: chapter 2 of book 14).
- An earlier version's pages carry no tags: `monographView()` returns
  early on a `version` address, and `monographFileView()` for a format
  of another publication (code).
- The publication's own "Type" field adds its own "DC.Type" lines after
  this one on every page; the fix leaves them alone (code).
- File kinds other than PDF were not opened in a browser.
- OJS writes "DC.Type" only on the article page ("Text.Serial.Journal")
  and has no file-page hook; OPS ships no Dublin Core plugin (code).

## Proposed fix

A proposal for the team: take the type from the same book-or-chapter
choice each method already makes
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-type-chapter/fix.diff)):

```diff
@@ monographView()
-        $templateMgr->addHeader('dublinCoreType', '<meta name="DC.Type" content="Text.Book"/>');
+        $templateMgr->addHeader('dublinCoreType', '<meta name="DC.Type" content="' . ($isChapterRequest ? 'Text.Chapter' : 'Text.Book') . '"/>');
@@ monographFileView()
-        $templateMgr->addHeader('dublinCoreType', '<meta name="DC.Type" content="Text.Chapter"/>');
+        $templateMgr->addHeader('dublinCoreType', '<meta name="DC.Type" content="' . ($chapter ? 'Text.Chapter' : 'Text.Book') . '"/>');
```

Each line keeps the value it was written for (the book's page, a
chapter's file) and gives the other case the type its title and authors
already describe. Tried on OMP `main`: the book's page read
"Text.Book", the chapter's page "Text.Chapter", the whole-book file's
view page "Text.Book" and the chapter file's "Text.Chapter". A
neighbour check (every file view page of book 14 and chapter 2's
switched-off page) gave the same results with the fix in and out,
except the two whole-book files, which turned "Text.Book".

**Alternatives**

- Fix the file page alone: the chapter's page would then read
  "Text.Book" while its own file reads "Text.Chapter".
- Read `$submissionFile->getData('chapterId')` in the plugin: the same
  answer, from a second source beside the `chapter` variable the other
  chapter-dependent tags use.
- Leave "DC.Type" out where it is wrong: drops a value the methods can
  state correctly.

**What goes with it**

- A guard: OMP's `cypress/tests/integration/Z_MonographViewDCMetadata.cy.js`
  checks the book page's tags only; add a chapter's page, a whole-book
  file's view page and a chapter file's view page. An e2e check in
  pkp-e2e's U20 spec covers the same.
- Backport: 3.5 takes the diff as it stands; 3.4 takes it with an
  offset (lines 174 and 322); 3.3 has no chapter pages and needs only
  the file-page change, in `DublinCoreMetaPlugin.inc.php` line 227.
- No data repair (the tags are built on each request), and no API or
  hook change.

Small: two lines in one plugin, each following its own method's
pattern, and one Cypress test widened.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-type-chapter/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-type-chapter/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/book-file-page-type-chapter/walk.js`;
  `WALK=neighbour` in front runs the neighbour check alone.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OMP 3b0ecf794c (lib/pkp 3dc90c81a6); the fix tried there.
  - stable-3_5_0: OMP 9c5e24246c (lib/pkp cf3f984335). The same steps
    and the same result; the same lines 176 and 340.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441. `DublinCoreMetaPlugin.php`
  writes "Text.Book" at line 174 in `monographView()`, which reads
  `isChapterRequest`, and "Text.Chapter" at line 322;
  `CatalogBookHandler.php` assigns `chapter` from the file's
  `chapterId` before `CatalogBookHandler::view`.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883.
  `DublinCoreMetaPlugin.inc.php` line 227 writes "Text.Chapter" for
  every file, and `CatalogBookHandler.inc.php` assigns
  `$chapterDao->getChapter($submissionFile->getData('chapterId'))`;
  `monographView()` has no chapter branch, as 3.3 has no chapter pages.
- Introduced: `git blame` on lines 176 and 340 gives 01088072a8 (2021,
  the PSR-12 reformatting). `git log -S'Text.Chapter'` on the plugin
  reaches only 749f84f7db, the commit that created it (`pkp/omp#395`),
  whose file-page method already chose authors and title by `$chapter`.
  `git log -S'isChapterRequest'` reaches ba905b0bac ("Add Dublincore
  metadata for chapters", `pkp/omp#1061`), which made `monographView()`
  chapter-aware and left its "Text.Book" line as it was.
- Both walks' view pages also recorded a script error ("PDFJS is not
  defined") and, on `main`, a server error on the file download; those
  are reported apart, in
  [U69-A9-book-file-open-download-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md)
  and
  [U69-A9-pdf-view-page-script-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-pdf-view-page-script-error.md),
  and do not touch the tags.
- Readers of the tag, read 2026-10-03: Google Scholar's inclusion
  guidelines (https://scholar.google.com/intl/en/scholar/inclusion.html)
  name Dublin Core tags such as "DC.title", "DC.creator", "DC.issued"
  and "DC.identifier", and no "DC.type". Zotero's Embedded Metadata
  translator hands a page's "DC." tags to its RDF translator, whose
  type detection
  ([RDF.js](https://github.com/zotero/translators/blob/master/RDF.js),
  `detectType()`) maps "Text.Serial.Journal" to a journal article and
  neither "Text.Book" nor "Text.Chapter". Unverified: any other index
  or harvester (BASE among them) reading this tag.
- Not opened in a browser: file kinds other than PDF, a file with a DOI
  or ISBN, a book with chapter publication dates; the tag does not
  depend on them (code). MySQL not checked; the fault does not touch
  the database.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/omp and pkp/ui-library
  issues and PRs, by the symptom's words, "DC.Type", "Text.Chapter",
  "Text.Book", `DublinCoreMetaPlugin` and `monographFileView`: none
  about the type. `pkp/pkp-lib#8406` (closed, "Improve
  DublinCoreMetaPlugin") listed other points of the same plugin, the
  book files' address among them, not "DC.Type".
