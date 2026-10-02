# A typed "Archives" page number past the last page opens an empty page instead of "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** a commit with no PR: [273334899e](https://github.com/pkp/ops/commit/273334899e1743f43c58c6e2033eddf70c740b74) · 2019-09-26 · ajnyga (ajnyga)
- **Upstream** `pkp/pkp-lib#10596` (closed, fixed for OJS's issue archive only in `pkp/ojs#4514`, `pkp/ojs#4515` and `pkp/ojs#4516`; the preprint archive was not covered)
- **Tracked in** spec U17 [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#ops5)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A visitor who opens an "Archives" page past the last one of a preprint
server gets an empty page instead of "404 Not Found". It is headed
"Archives - Page 2" and shows the search box, no preprints and the page
links "Previous 26-25 of 17", a range that starts after the server's
last preprint.

The page answers "200 OK", so a search engine that holds its address
keeps an empty page in its index. A section's page past its last one,
and OJS's issue archive, answer 404; the fix gives the archive the same
answer.

The address is one that no link on the server shows: typed, bookmarked,
or left behind when the server's list got shorter or "Items per page"
grew.

## Impact

- **Lost**: nothing. The visitor finds no preprints and no message
  that the page does not exist.
- **Who**: visitors and search engines that hold such an address.
- **Way round**: "Archives" in the main menu leads to the list.

Low: a wrong, empty page met only through a stale or typed address; a
search engine indexing such pages in numbers would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OPS `main`, freshly loaded. Its server
  `publicknowledge` has 17 posted preprints and "Items per page" at 25,
  so "Archives" is one page. Nothing is created. The `stable-3_5_0`
  dataset takes the same steps.

1. Signed out, open the server's home page (`/index.php/publicknowledge`).
2. Press "Archives" in the main menu. The page lists the 17 preprints,
   with no page links.
3. Type the address of the next page,
   `/index.php/publicknowledge/en/preprints/index/2`.

**Expected:** "404 Not Found", as the server's section page past its
last one answers.

**Observed:** the page answers "200 OK", titled "Archives - Page 2 | Public
Knowledge Preprint Server", and reads below the site header:

```
Home / Archives - Page 2
Archives - Page 2
Search
Applied Science
Social Sciences
Previous
26-25 of 17
```

No preprint is listed ("Applied Science" and "Social Sciences" are the
server's category links under the search box).

The section page past its last one,
`/index.php/publicknowledge/en/preprints/section/preprints/2`, answers
"404 Not Found".

## Cause

`PreprintsHandler::index()` in OPS
([lines 55–83](https://github.com/pkp/ops/blob/c8af945bb7/pages/preprints/PreprintsHandler.php#L55-L83))
takes the page number from the address, turns it into an offset and
fetches that slice of the posted preprints, but never checks that the
slice holds anything. A page past the last one gets an empty list, and
the page links are computed from the offset alone: `showingStart` is the
offset plus one (26), `showingEnd` the smaller of the offset plus the
page size and the offset plus the empty list's count (25), and
`prevPage` is set because `showingStart` is above 1. The template then
prints "Archives - Page 2" and "Previous 26-25 of 17" over an empty
list.

The paging was copied in 2019 from OJS's `IssueHandler::archive()`
(273334899e, "preliminary work for preprints archive"; the next commit,
df0ab2a2f5, switched it from issues to preprints). OJS's handler had the
same fault until `pkp/pkp-lib#10596` (2024) added a 404 there, in OJS
only. OPS's own `SectionsHandler::section()`, beside it, has answered
404 for a page past the last one since 2020.

Reach:

- A page number of 0, a negative number or a word (`preprints/index/x`)
  is read as page 1 or less in the same handler: it shows the first page,
  and when there is a second page its "Next" leads to page 1 or 0, not 2
  (code; spec U17 records page "x" with "Next" back to page 1). The
  section page answers 404 for a word, a negative number and an explicit
  page 1 (`…/section/preprints/1`), but shows page 0 as its first page
  (code).
- OMP's catalog and series pages (`CatalogHandler::page()` and
  `series()`) have the same missing check: a page past the last one shows
  the full count over "No titles have been published yet." (code). Spec
  U68 records this as A10, an open question for the team, so this report
  does not cover it.
- OJS's issue archive answers 404 (code; `pkp/pkp-lib#10596`).

## Proposed fix

Answer 404 when the page's offset is at or past the number of posted
preprints, before the page's preprints are fetched:

```diff
--- a/pages/preprints/PreprintsHandler.php
+++ b/pages/preprints/PreprintsHandler.php
@@ -75,6 +75,12 @@
             ->filterByStatus([Submission::STATUS_PUBLISHED])
             ->orderBy(Collector::ORDERBY_DATE_PUBLISHED);
         $total = $collector->getCount();
+
+        // A page past the last one does not exist
+        if ($offset && $offset >= $total) {
+            throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+        }
+
         $publishedSubmissions = $collector->limit($count)->offset($offset)->getMany();
 
         $showingStart = $offset + 1;
```

The diff:
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-page-past-last-not-404/fix.diff).
Tried on `main`:

- The typed page 2 answered "404 Not Found".
- With "Items per page" at 10, the typed page 3 answered "404 Not
  Found"; without the fix it showed "Previous 21-20 of 17".
- The real pages were unchanged with the fix in and out: "Archives"
  (10 preprints), its page 2 (7 preprints, "Previous 11-17 of 17") and
  the typed `preprints/index/1`.

The check sits in the handler, where the page number is read. It
compares the offset with `$total`, which the handler already counts, so
it adds no query. It gives the archive the 404 that
`SectionsHandler::section()` and OJS's `IssueHandler::archive()` already
give; OJS tests `!count($issues) && $offset` on an array instead. The
first page is left alone (`$offset` is 0 there), so a server with
nothing posted still gets its "Archives" page.

The fix does not touch `preprints.tpl` or the type of
`$publishedSubmissions`. The report on the empty server's page
([U17 OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-OPS1-archives-empty-server-says-nothing.md))
changes that template's test, and the two fixes do not depend on each
other.

This is a proposal; the team decides.

**Alternatives**:

- OJS's line as written, `!count($publishedSubmissions) && $offset`
  after the fetch: it works (tried), but `$publishedSubmissions` is a
  `LazyCollection` here, so each `count()` runs the page's query again
  and builds its submissions again.
- `->toArray()` on the fetch, as OJS and `section()` do, then OJS's
  line: an array makes the template's empty branch fire (the U17 OPS1
  report tried it). Without that report's fix, the branch prints the
  undefined key `##archive.noSubmissions##` on an empty server, so the
  two fixes would have to go in together.
- Copy `section()`'s whole check: it also answers 404 for a word, a
  negative number and an explicit page 1 (`preprints/index/1`). It
  closes the word case of the Cause, not page 0, and it turns the
  working address `preprints/index/1` into a 404, which old links may
  hold.
- Show the last page instead: a typed address keeps working, but a
  wrong address still answers as a real page, unlike the section page
  and OJS's issue archive.

**What goes with it**:

- Backport: the hunk applies to `stable-3_5_0` and `stable-3_4_0` as
  written. On `stable-3_3_0` (`PreprintsHandler.inc.php`) the same check
  goes after `$total = $submissionService->getMax($params);`, with
  `$request->getDispatcher()->handle404();` as OJS's 3.3 backport and
  OPS's 3.3 `SectionsHandler` write it.
- Nothing stored changes, and no API or plugin hook is involved.
- Test: an e2e check in spec U17 (a **Planned** item): a page past the
  last one of "Archives" answers 404, and a real second page still
  lists its preprints.

Small: one check in one handler, following the section page's and
OJS's 404, and an e2e check.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-page-past-last-not-404/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/archives-page-past-last-not-404/lib.js),
  which reads the page with U17 OPS1's helper) takes the Steps signed
  out and records the archive's heading, preprint count and page links,
  then the section page past its last one as the control.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js ops shared/playwright/checks/issues/archives-page-past-last-not-404/walk.js`.
    `<fleet>` names the pkp-e2e install to drive and `<name>` the folder
    its records go to.
  - **Neighbour check:** `WALK=neighbour` in front: `rvaca` sets
    Settings › Website › "Setup" › "Lists" › "Items per page" to 10 and
    saves; signed out, "Archives", its "Next" to page 2 (a real page),
    the typed page 3 (past the last) and the typed page 1.
- Walks: OPS on `main` and `stable-3_5_0`, on PostgreSQL; datasets from
  pkp/datasets c657990 (2026-10-01). No request failed on the server and
  no page script failed. MySQL not
  checked (the fault does not depend on the database).
- The fix was tried with `node bin/try-fix.js apply shared/playwright/checks/issues/archives-page-past-last-not-404/fix.diff ops`,
  the walk and the neighbour check each on a freshly loaded dataset,
  then reverted, and the neighbour check walked again without it. OJS's
  line (`!count($publishedSubmissions) && $offset`, after the fetch) was
  tried the same way first, with the same results.
- Not driven: 3.4 and 3.3; page 0, negative and word page numbers
  (code only). Not read: the category pages, which page through another
  paginator by a query parameter.
- Tips:
  - **`main`:** OPS c8af945bb7, its pkp-lib 3dc90c81a6.
  - **`stable-3_5_0`:** OPS 38b61882d3, pkp-lib cf3f984335.
  - **`stable-3_4_0`:** OPS acd8ae704b, pkp-lib 32b0f4b4af.
  - **`stable-3_3_0`:** OPS c5532e2161, pkp-lib f6ab331645.
- Code reads:
  - `main` and 3.5: `PreprintsHandler::index()`, `preprints.tpl`,
    `SectionsHandler::section()`, pkp-lib's
    `frontend/components/pagination.tpl`; OJS's `IssueHandler::archive()`;
    OMP's `CatalogHandler::page()`, `series()` and
    `_setupPaginationTemplate()`.
  - 3.4: `PreprintsHandler::index()` has the same paging and no check.
  - 3.3: `PreprintsHandler.inc.php` the same, its list a
    `DAOResultIterator` (which is `Countable`, so `count()` works there);
    `SectionsHandler.inc.php` answers `handle404()` past the end.
  - OJS's `pkp/pkp-lib#10596` commits are on all three lines
    (`b4f2c1650a` main and 3.5, `8a92a39dcb` 3.4, `2fe5813afd` 3.3); OPS's
    and its pkp-lib's logs on every line hold no commit for it.
- The trace: the handler's paging lines blame to the PSR-12 reformat
  (ee952a951d) and later refactors (48d5e43981, 26d6667836, b89fd59f16,
  and fa646e5cf7 for the order);
  through the 2020 move (01f0aabf30, `pkp/ops#29` for
  `pkp/pkp-lib#5903`, `pages/archive/ArchiveHandler.inc.php` to
  `pages/preprints/PreprintsHandler.inc.php`) they lead to 273334899e,
  where `ArchiveHandler::archive()` first held the same offset and page
  link lines over issues, with no check. The GitHub API lists no PR for
  273334899e.
- Upstream searches (2026-10-02, pkp/pkp-lib, pkp/ops): "archive page
  does not exist", "archives page 404" (`pkp/pkp-lib#10596`, OJS's issue
  archive, fixed for OJS only; the same fault on the twin page), "ops
  archive page" (`pkp/ops#638`, the archive's page links showing page 1
  on every page, fixed; not this), "preprints archive pagination"
  (`pkp/pkp-lib#9716`, the same bug as `pkp/ops#638`), "pages that don't
  exist", "OPS archive empty page", `PreprintsHandler`. No issue about
  OPS's archive past its last page.
