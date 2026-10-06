# After "Create New Version", a press's sitemap lists the book's chapter pages at addresses that answer "404 Not Found"

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: none (code; no chapter pages)
- **Introduced** `pkp/omp#1061` for `pkp/pkp-lib#7003` · [4cb0e2a29c](https://github.com/pkp/omp/commit/4cb0e2a29c66071ddcb87de912ea4b46920e360e) · 2022-02-06 · Dulip Withanage (withanage)
- **Upstream** none found (2026-10-03)
- **Tracked in** spec U20 [OMP4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#omp4)
- **Checked** 2026-10-03, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A press that starts a new version of a published book expects its
sitemap to go on listing the book's chapter pages at the addresses the
book's page links to. From "Create New Version" on, the sitemap lists
each chapter page at another address, which answers "404 Not Found".
The address the book's page links to still opens the chapter. It is no
longer in the sitemap.

Each version keeps its own copy of a chapter, and the sitemap writes
the copy's number, while a chapter page is addressed by the chapter's
number in the book's first version. So the listed address matches no
chapter page, before the new version is published and after.

The book's own entry and its file entries stay right.

## Impact

- **Lost**: the chapter pages' place in the list of pages the press
  gives search engines. Nobody is told.
- **Who**: presses that create new versions of published books whose
  chapters have their own page: "Show this chapter on its own page"
  ticked, or a chapter DOI, which gives the chapter a page too.
- **Way round**: none on screen. No screen deletes an unpublished
  version, and once published the entries stay wrong. Search engines
  can still reach the chapter pages through the book's page.

Medium, not low: for every chapter page of a versioned book the real
address leaves the sitemap and the listed one ends in "404 Not Found",
for good. It would be high if every press's chapter pages were
affected, versioned or not.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OMP `main`. Its published book,
  submission 14 "From Bricks to Brains: The Embodied Cognitive Science of
  LEGO Robots", has "Show this chapter on its own page" ticked for
  "Chapter 1: Mind Control—Internal or External?", so the sitemap lists
  that chapter page. Nothing else is needed.

Steps:

1. Signed out, open the press's sitemap,
   `/index.php/publicknowledge/sitemap`. It lists
   `…/catalog/book/14/chapter/54`; open that address: the chapter page
   "Chapter 1: Mind Control—Internal or External?" opens.
2. Sign in as `dbarnes` (Press editor) and open submission 14's
   workflow.
3. In the publication menu press "Create New Version", and press
   "Confirm" in the "Create New Version" window, leaving its choices as
   they are. (On 3.5: the "Create New Version" button above the
   publication, then "Yes".)
4. Sign out. Open the sitemap again, and open its entry for the
   chapter.
5. Open the book's page, `…/catalog/book/14`, and press the chapter's
   link, "Chapter 1: Mind Control—Internal or External?".
6. Sign in as `dbarnes`, open submission 14 (it shows the new version),
   press "Publish" and then "Publish" in the window that asks "Are you
   sure you want to make this catalog entry public?".
7. Sign out. Open the sitemap again, and open its entry for the
   chapter.

**Expected**: at steps 4 and 7 the sitemap lists the chapter page at
the address the book's page links to, `…/catalog/book/14/chapter/54`,
which opens the chapter page.

**Observed**: at steps 4 and 7 the sitemap lists another address for
the chapter, and no longer lists `…/chapter/54`:

```
<loc>http://{host}/index.php/publicknowledge/en/catalog/book/14</loc>
<loc>http://{host}/index.php/publicknowledge/en/catalog/book/14/chapter/72</loc>
```

Opening `…/catalog/book/14/chapter/72` answers "404 Not Found", before
and after the new version is published. At step 5 the book's page
links the chapter as `…/catalog/book/14/chapter/54`, which opens the
chapter page; after step 6 it still does, and shows the new version.

## Cause

`APP\pages\sitemap\SitemapHandler::_createContextSitemap()`
(`pages/sitemap/SitemapHandler.php`, lines 53 and 57) builds the
chapter entries from the wrong version and with the wrong number:

```php
$chapters = $submission->getLatestPublication()->getData('chapters');
…
[$submission->getBestId(), 'chapter', $chapter->getId()]
```

A chapter page's address carries the chapter's number in the book's
first version, not the number of its copy in the version shown.
`CatalogBookHandler::setChapter()` looks the number up with
`ChapterDAO::getBySourceChapterId()` and picks the copy that belongs to
the version the address asks for: the one in its `version/<id>` part,
or the book's current (published) version when it has none, as the
sitemap's addresses do. The book's page
(`templates/frontend/objects/monograph_full.tpl`), the chapter page's
own version links (`chapter.tpl`) and the Citation Style Language
plugin all write that number with `$chapter->getSourceChapterId()`;
no other writer of chapter addresses uses `getId()`.

"Create New Version" copies every chapter into the new version under a
new `chapter_id`, keeping the first version's number in
`source_chapter_id`. From then on the sitemap reads the copies of the
newest version, published or not, and writes their own `chapter_id`.
No chapter has that number as its first-version number, so
`setChapter()` finds nothing and answers 404. Before any new version a
chapter's own number and its first-version number are the same, which
is why the entries are right until then. Chapter pages already used
the first-version number when the sitemap's chapter entries were
written (`pkp/pkp-lib#7132`, 2021).

Reach:

- Every chapter entry of a book that has had a second version,
  published or not (walked). A chapter is listed when
  `Chapter::isPageEnabled()` is true: "Show this chapter on its own
  page" ticked, or a DOI on the chapter.
- While a new version is unpublished, the sitemap also follows that
  draft's chapter list and boxes, not the published book's: a chapter
  added in the draft is listed before readers can open it (read in the
  code, not driven).
- The book entry and the file entries are right: the files come from
  the current version (walked).

## Proposed fix

List the current version's chapters, under their first-version number,
in OMP's `SitemapHandler`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-new-version-chapter-pages-404/fix.diff)):

```diff
-            // Chapters
-            $chapters = $submission->getLatestPublication()->getData('chapters');
+            // Chapters: the published (current) version's chapter pages, addressed by the
+            // chapter's id in its first version, as the book page links them
+            $chapters = $submission->getCurrentPublication()->getData('chapters');
             if ($chapters && count($chapters) > 0) {
                 foreach ($chapters as $chapter) {
                     if ($chapter->isPageEnabled()) {
-                        $root->appendChild($this->_createUrlTree($doc, $request->url($press->getPath(), 'catalog', 'book', [$submission->getBestId(), 'chapter', $chapter->getId()])));
+                        $root->appendChild($this->_createUrlTree($doc, $request->url($press->getPath(), 'catalog', 'book', [$submission->getBestId(), 'chapter', $chapter->getSourceChapterId()])));
```

This follows the book page, which shows the current version's chapters
and links them with `getSourceChapterId()`, and the file entries of the
same loop, which read `getCurrentPublication()`. It keeps what
`pkp/omp#1061` wanted, every chapter page listed for search engines,
and the `isPageEnabled()` check that `pkp/pkp-lib#9210` added.

Tried on OMP `main`: the walk's sitemap listed
`…/catalog/book/14/chapter/54` at steps 1, 4 and 7, and the address
opened the chapter page each time. A control read of the sitemap on a
book that never had a second version listed the same 29 entries with
the fix in and out.

**Alternatives**

- Change only `getId()` to `getSourceChapterId()`: the addresses would
  open, but the sitemap would still follow an unpublished draft's
  chapters and boxes.
- Make `CatalogBookHandler::setChapter()` accept a copy's own number
  too: it would give each chapter page several addresses, and the
  sitemap would still follow the draft.

**What goes with it**

- No data repair and no API change: the sitemap is built on each
  request. The `SitemapHandler::createPressSitemap` hook receives the
  corrected entries.
- `pkp/pkp-lib#12670` (open) proposes rewriting this method with
  batched queries, and its chapter query copies today's
  latest-version behaviour. If that rewrite lands, it should join the
  current publication and write `source_chapter_id`, falling back to
  `chapter_id` when it is empty: `ChapterDAO::_fromRow()` does that for
  the entity, so the fallback is needed only in raw SQL.
- Backport: 3.5 and 3.4 take the diff as it stands (the same lines,
  3.4 two lines earlier). 3.3 has no chapter pages.
- A guard: an OMP Cypress test that creates a new version of a book
  with a chapter page and checks that the sitemap's chapter address
  opens, and an e2e check in pkp-e2e's U20 spec.

Small: two calls in one method, following the book page's pattern,
plus one test.

## Evidence

- A Playwright script that takes the Steps on an install loaded from
  PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-new-version-chapter-pages-404/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/sitemap-new-version-chapter-pages-404/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/sitemap-new-version-chapter-pages-404/walk.js`
  (`PKP_E2E_LINE=stable-3_5_0` in front for 3.5; `NB=1` in front runs
  the control read alone). It reads the sitemap's raw XML and follows
  each chapter entry.
- Walked 2026-10-03 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [e8dafbc](https://github.com/pkp/datasets/commit/e8dafbcf0a61c21a3653dd24d9a1282f36762d12)
  (2026-10-02):
  - main: OMP 3b0ecf794c (lib/pkp 3dc90c81a6). The new chapter copy was
    number 72.
  - stable-3_5_0: OMP 9c5e24246c (lib/pkp cf3f984335). The same steps
    (step 3 as bracketed) and the same result, number 72 again; the
    same two lines in `SitemapHandler.php`, and `setChapter()` and
    `monograph_full.tpl` use the first-version number.
- 3.4, by code: OMP `stable-3_4_0` at 0aec65441.
  `pages/sitemap/SitemapHandler.php` has the same two lines;
  `CatalogBookHandler::setChapter()` looks the number up with
  `getBySourceChapterId()` and `monograph_full.tpl` links
  `getSourceChapterId()`.
- 3.3, by code: OMP `stable-3_3_0` at 8e72fc883. The sitemap lists no
  chapter entries and `CatalogBookHandler.inc.php` serves no chapter
  pages.
- Introduced: `git blame` on lines 53 and 57 gives 4cb0e2a29c ("Add URL
  map", Dulip Withanage, committed 2022-02-06, the header's date), which
  added the chapter loop with `getLatestPublication()` and `getId()`;
  `pkp/omp#1061` ("Add Google Scholar support for chapters", for
  `pkp/pkp-lib#7003`) merged it on 2022-02-25. Line 57 was later
  wrapped in the `isPageEnabled()` check by 88ea6518a7
  (`pkp/pkp-lib#9210`), which kept `getId()`. At 4cb0e2a29c, `setChapter()` already used
  `getBySourceChapterId()` and the book page `getSourceChapterId()`
  (bfe33f3e2, `pkp/pkp-lib#7132`, 2021-10-05).
- Not driven: a chapter added or a box changed in an unpublished new
  version (read in the code); a chapter listed for its DOI
  (`Chapter::isPageEnabled()` returns true when the chapter has a DOI);
  deleting an unpublished version, which would make the latest version
  the current one again, but no screen offers it (the workflow's actions
  in `lib/ui-library` delete only a whole submission); a book with a "URL Path" (the book's part
  of the address is `getBestId()` in both the sitemap and the book
  page); a second language. MySQL not checked; the fault does not
  depend on the database.
- Upstream search 2026-10-03, pkp/pkp-lib, pkp/omp and pkp/ui-library
  issues and PRs, by the symptom's words, `SitemapHandler`,
  `getLatestPublication` and `getSourceChapterId`: `pkp/pkp-lib#9210`
  (closed) fixed chapters without their own page being listed;
  `pkp/pkp-lib#7360` (closed) fixed 404 book addresses in the same
  sitemap; `pkp/pkp-lib#12670` (open) is about the sitemap's speed, not
  its chapter addresses.
