# A press's book file view page names the book's page as its address in Dublin Core tags

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** no PR, for `pkp/pkp-lib#1279` · [720d9c957f](https://github.com/pkp/omp/commit/720d9c957f31567419958bac7b18d6d02f095210) · 2016-03-18 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#8406` (closed without a fix for this point), whose PRs changed other tags of the same plugin
- **Tracked in** spec U20 [OMP5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp5)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

An index reading a book file's view page expects its "DC.Identifier.URI"
tag to give that page's own address. The tag holds an address under
"catalog/book" that opens the book's landing page, with the book's own
tags, so the file's view page is never named.

Nothing on screen shows it or changes it. It holds for every published
file a reader can open from a book's page, the whole book's and each
chapter's, while "Dublin Core Indexing Plugin" is enabled, as it is on
every new press.

## Impact

- **Lost**: a harvester that follows the tag lands on the book's
  landing page, while the press's sitemap lists the file's view page
  under its real address. Readers see nothing wrong, and the press is
  not told.
- **Who**: every press using the plugin, on every file view page; only
  machines read the tag.
- **Way round**: none on screen. Disabling the plugin removes all
  Dublin Core tags.

Low: one tag on pages only machines read, which neither Google Scholar's
guidelines nor Zotero's translators read, and the address still opens a
page of the same book; it would be medium if an index were shown to drop
or merge file pages because of it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its press `publicknowledge`
  publishes book 14, "From Bricks to Brains: The Embodied Cognitive
  Science of LEGO Robots", whose "PDF" format holds two files not
  assigned to a chapter and one file per chapter. "Dublin Core Indexing
  Plugin" is enabled. Nothing is created, and no sign-in is needed.

Steps:

1. Open the book's page, `/index.php/publicknowledge/catalog/book/14`,
   and view its source ("View Page Source"): find
   `<meta name="DC.Identifier.URI"`.
2. In the side column, under "PDF", press "The Canadian Nutrient File:
   Nutrient Val.pdf". The file's view page opens
   (`/index.php/publicknowledge/en/catalog/view/14/3/108`, titled "PDF
   view of the file The Canadian Nutrient File: Nutrient Val.pdf").
3. View that page's source: find `<meta name="DC.Identifier.URI"`.
4. Open the address step 3 read in the browser's address bar.
5. View that page's source: find "DC.Identifier.URI" and "DC.Type".
6. Back on the book's page, under the chapter "Chapter 1: Mind
   Control—Internal or External?", press "PDF". The chapter file's view
   page opens (`…/catalog/view/14/3/113`); view its source: find
   `<meta name="DC.Identifier.URI"`.

**Expected**: step 1 reads the book page's address; step 3 reads the
file's view page address, `…/index.php/publicknowledge/catalog/view/14/3/108`
(the page's path without the language segment "/en", as the book page's
tag has it), and step 4 opens that view page again; step 6 reads
`…/catalog/view/14/3/113`.

**Observed**: step 1 reads
`…/index.php/publicknowledge/catalog/book/14`, as expected. Step 3
reads:

```
<meta name="DC.Identifier" content="14/3/108"/>
<meta name="DC.Identifier.URI" content="…/index.php/publicknowledge/catalog/book/14/3/108"/>
```

Step 4 opens exactly the book's landing page, "From Bricks to Brains:
The Embodied Cognitive Science of LEGO Robots | Public Knowledge Press",
whose own tags read `DC.Identifier.URI` `…/catalog/book/14` and
`DC.Type` "Text.Book". Step 6 reads `…/catalog/book/14/3/113`.

## Cause

`DublinCoreMetaPlugin::monographFileView()`
(`plugins/generic/dublinCoreMeta/DublinCoreMetaPlugin.php`, line 298),
the plugin's handler for the `CatalogBookHandler::view` hook, builds
"DC.Identifier.URI" with the page operation `book`:
`url(…, 'catalog', 'book', [$submissionBestId, $publicationFormat->getId(), $submissionFile->getId()])`.

A file's view page is served by `CatalogBookHandler::view()`, at
`catalog/view/{book}/{format}/{file}`. `CatalogBookHandler::book()`
reads only the book from the tag's address: a second part that is
neither `version` nor `chapter` is ignored, and the rest is dropped, so
the address answers with the book's landing page. Every link to the
view page uses `view`: the book page's file links
(`templates/frontend/components/downloadLink.tpl`, with each part's
`getBestId()`) and the press's sitemap (`SitemapHandler`, line 87).

The wrong operation dates from the first Dublin Core template for file
pages (`monographFile_dublinCore.tpl`, `pkp/pkp-lib#1279`), while the
book page already linked files with `op="view"`; the 2017 move into the
plugin and the 2024 URL rewrite carried it over unchanged.

Reach:

- An earlier version's file pages carry no tags: the method returns
  early when the format belongs to another publication (code).
- The Google Scholar plugin writes no tags on a file's view page; on the
  book's page its file tags ("citation_pdf_url",
  "citation_fulltext_html_url") name `catalog/download` addresses, not
  `catalog/book`, so they do not share this fault (code).
- OJS writes "DC.Identifier.URI" only on the article page, as
  `article/view/{id}`, the page's own address; OPS ships no Dublin Core
  plugin (code).

## Proposed fix

Name the page the way its links do: the `view` operation, with each
part's best ID, in "DC.Identifier.URI" and in "DC.Identifier" beside it
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-uri-names-book-page/fix.diff)):

```diff
-        $templateMgr->addHeader('dublinCoreIdentifier', '<meta name="DC.Identifier" content="' . htmlspecialchars($submissionBestId . '/' . $publicationFormat->getId() . '/' . $submissionFile->getId()) . '"/>');
+        $templateMgr->addHeader('dublinCoreIdentifier', '<meta name="DC.Identifier" content="' . htmlspecialchars($submissionBestId . '/' . $publicationFormat->getBestId() . '/' . $submissionFile->getBestId()) . '"/>');
…
-        $templateMgr->addHeader('dublinCoreUri', '<meta name="DC.Identifier.URI" content="' . $request->getDispatcher()->url($request, Application::ROUTE_PAGE, null, 'catalog', 'book', [$submissionBestId, $publicationFormat->getId(), $submissionFile->getId()], urlLocaleForPage: '') . '"/>');
+        $templateMgr->addHeader('dublinCoreUri', '<meta name="DC.Identifier.URI" content="' . $request->getDispatcher()->url($request, Application::ROUTE_PAGE, null, 'catalog', 'view', [$submissionBestId, $publicationFormat->getBestId(), $submissionFile->getBestId()], urlLocaleForPage: '') . '"/>');
```

A proposal for the team. The tag keeps what the line was for, an
address without the language segment. It now has the same path as the
book page's link and the sitemap's entry, minus that segment, also for
a format with a URL path or a file with a publisher ID. "DC.Identifier"
moves with it so that it stays the tail of the address, as on the
book's page, where both carry the book's best ID.

Tried on OMP `main`: steps 3 and 6 read `…/catalog/view/14/3/108` and
`…/catalog/view/14/3/113`, and step 4 opened the view page. A neighbour
check (the book's page, chapter 1's page and every file page of book
14) showed the same tags with the fix in and out, except
"DC.Identifier.URI" on the six file pages, which turned to each page's
own address; "DC.Identifier" read the same, since no format or file in
the dataset has a URL path or publisher ID.

**Alternatives**

- Change only `book` to `view`, keeping the plain IDs: the address
  opens the page too, but differs from the page's links and the sitemap
  when a format has a URL path.
- Drop "DC.Identifier.URI" on file pages: loses a value the method can
  state correctly.

**What goes with it**

- Not covered by this fix: a chapter's page gives the book's address in
  "DC.Identifier.URI" (`monographView()`, line 138), as it gives the
  book's "DC.Identifier". pkp-e2e's U20 spec records that as the chapter
  page's behaviour; whether a chapter page should name itself is a
  separate question.
- A guard: OMP's `cypress/tests/integration/Z_MonographViewDCMetadata.cy.js`
  visits only the book page, so it first needs the format and file IDs.
  It can take them from the book page's file link
  (`a.cmp_download_link[href*="/catalog/view/"]`), visit that link, and
  check that "DC.Identifier.URI" equals the link's address without the
  language segment. The e2e guard is a check in pkp-e2e's U20 spec.
- Backport: 3.5 takes the diff as it stands. 3.4 needs the same changes
  at lines 261 and 279, where the address is built with
  `$request->url(null, 'catalog', 'book', …)`; 3.3 at lines 174 and 186
  of `DublinCoreMetaPlugin.inc.php`. Both versions have `getBestId()` on
  the format and the file.
- No data repair (the tags are built on each request), and no API or
  hook change.

Small: two lines in one method, following the app's own links, and one
Cypress check.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-uri-names-book-page/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/book-file-page-uri-names-book-page/lib.js)),
  run with
  `PROBE_FEATURE=issues PROBE_AGENT=walk node bin/probe.js omp shared/playwright/checks/issues/book-file-page-uri-names-book-page/walk.js`;
  `WALK=neighbour` in front runs the neighbour check alone. The fix was
  tried 2026-10-03 on the `main` tip below.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12) (2026-10-02):
  - main: OMP 3b0ecf794c (lib/pkp 3dc90c81a6).
  - stable-3_5_0: OMP 9c5e24246c (lib/pkp cf3f984335). The same steps
    and the same result; the same line 298, and `CatalogBookHandler::book()`
    reads the address the same way.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441.
  `DublinCoreMetaPlugin.php` line 279 builds the address with
  `'catalog', 'book'`; `CatalogBookHandler::book()` ignores a second
  part other than `version` or `chapter`; `downloadLink.tpl` links the
  file page with `op="view"`.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883.
  `DublinCoreMetaPlugin.inc.php` line 186 the same. `book()` has no
  chapter branch there: it takes the book's ID, reads a second part
  only when it is `version`, and ignores the rest, so the address opens
  the book's page as well. `downloadLink.tpl` links with `op="view"`.
- Introduced: `git blame` on line 298 gives a4aefe2aa5 (2024, "Show
  locale in url in multilingual contexts", which changed the URL call
  only); `git log -S'DC.Identifier.URI'` reaches 749f84f7db (2017,
  `pkp/omp#395`, the move into the plugin, which carried the address
  over from the template) and, before it, 720d9c957f, which created
  `templates/frontend/objects/monographFile_dublinCore.tpl` with
  `{url page="catalog" op="book" path=…}` while the book page linked
  files with `op="view"`. `commits/<sha>/pulls` names no PR for it.
- The walks' file pages also recorded the PDF viewer's script error
  and, on `main`, a server error on the file download; those are
  reported apart
  ([U69-A9-pdf-view-page-script-error.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-pdf-view-page-script-error.md),
  [U69-A9-book-file-open-download-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md))
  and do not touch the tags.
- Who reads the tag, checked 2026-10-03 in public sources: Google
  Scholar's inclusion guidelines name Dublin Core tags as a last resort
  and read "DC.identifier" for a full-text file's address, with no
  mention of "DC.Identifier.URI"; Zotero's Embedded Metadata translator
  turns the tag into the property `dc:identifier.URI`, which its RDF
  import never reads (it reads `dc:identifier` for ISBN, ISSN and DOI,
  and takes the item's URL from other tags or the page's own address).
  Unverified: whether any other index reads the tag, and whether one
  merges or drops a file page because of it.
- Not driven: a format with a URL path or a file with a publisher ID,
  where the fix's `getBestId()` differs from the plain ID (code); file
  kinds other than PDF, which the tag does not depend on (code). MySQL
  not checked; the fault does not touch the database.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/omp and pkp/ui-library
  issues and PRs, by the symptom's words, "DC.Identifier.URI",
  `DublinCoreMetaPlugin` and `monographFileView`: `pkp/pkp-lib#8406`
  ("Improve DublinCoreMetaPlugin", closed 2023-02-09 as completed) lists
  "the URL for book files is wrong" among its points; its author's
  comment of 2023-02-06 says "For the representation i.e. submission
  file view pages I left everything as it was". Its OMP PR
  `pkp/omp#1322` replaced deprecated methods, fixed the sponsor tag,
  dropped empty tags and added chapter values and file DOIs, and left
  this line as it is. No other match.
