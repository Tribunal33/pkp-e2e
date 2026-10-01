# A book's or an article's version address that names none of its versions shows a blank server error page instead of "404 Not Found"

- **Severity** low
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OMP, OJS
  - 3.5: OMP
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** OMP: `pkp/omp#1908` (3.5: `pkp/omp#1907`) for `pkp/pkp-lib#10671` · [29fa885084](https://github.com/pkp/omp/commit/29fa885084560ff55e1f7d3aabd84f37e81b1795) · 2025-03-20 · Kaitlin Newson (kaitlinnewson). OJS: `pkp/ojs#5308` for `pkp/pkp-lib#12245` · [17bed669e9](https://github.com/pkp/ojs/commit/17bed669e9e22c5683fc7af316318ce180ea7f84) · 2026-02-05 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U69 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a3) · spec U49 [OJS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U49-publish-schedule-and-versions.md#ojs3)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

The server fails when someone opens a published book's or article's
version address with an id that is none of its versions: a mistyped
number, another book's or article's version, or letters such as "abc".
The browser shows a blank page where the "404 Not Found" page belongs.

Such an address has no page to show, so the reader misses only the
message. The book's or article's own address still opens it.

The address of a version the book or article does have is answered as
it should be: with the page, or with "404 Not Found" for an unpublished
version to those who may not see it. A preprint server is not affected,
and a journal on 3.5 answers "404 Not Found".

## Impact

- **Lost.** Only the "404 Not Found" message: the reader gets a blank
  page with no text and no title. Each request writes a fatal error to
  the server's error log.
- **Who.** Anyone, signed in or not, who opens a version address with a
  wrong id: a reader who mistypes one, or a crawler that makes addresses
  up. An address that once worked does not become a failing one through
  the screens: an unpublished version keeps its id and answers "404 Not
  Found", and no screen deletes a version.
- **Way round.** The book's or article's own address, and its
  "Versions" list, still open every version.

Low: no page is missing, and only the "404 Not Found" message is
replaced by a blank error page. It would be medium if a link
the application itself offers led to such an address.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP and OJS.
- On the press, book 5, "Bomb Canada and Other Unkind
  Remarks in the American Media", is published in one version (id 5),
  and book 14 is published in one version (id 14). On the journal,
  article 17, "Antimicrobial, heavy metal resistance and plasmid profile
  of coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", is published in one version (id 18), and article 1
  has a version with id 1.

On the press, signed out:

1. Open "Catalog" and press "Bomb Canada and Other Unkind Remarks in
   the American Media"
   (`/index.php/publicknowledge/en/catalog/book/5`).
2. In the address bar, add `/version/999999` to the address and press
   Enter (`…/catalog/book/5/version/999999`).
3. Change the end of the address to `/version/abc`.
4. Change the end of the address to `/version/14`, the other book's
   version.
5. Sign in as `dbarnes` and open `…/catalog/book/5/version/999999`
   again.

On the journal [`main` only], signed out:

6. Open `/index.php/publicknowledge/en/article/view/17/version/999999`.
7. Change the end of the address to `/version/abc`.
8. Change the end of the address to `/version/1`, another article's
   version.

**Expected.** Steps 2 to 8 each show the "404 Not Found" page.

**Observed.** Steps 2 to 8 each show a blank page, with no text and no
tab title:

```
GET /index.php/publicknowledge/en/catalog/book/5/version/999999    500   (steps 2, 5)
GET /index.php/publicknowledge/en/catalog/book/5/version/abc       500
GET /index.php/publicknowledge/en/catalog/book/5/version/14        500
GET /index.php/publicknowledge/en/article/view/17/version/999999   500
GET /index.php/publicknowledge/en/article/view/17/version/abc      500
GET /index.php/publicknowledge/en/article/view/17/version/1        500
```

The server log, on the press and on the journal:

```
PHP Fatal error:  Uncaught Error: Typed property APP\pages\catalog\CatalogBookHandler::$publication must not be accessed before initialization in pages/catalog/CatalogBookHandler.php:122
PHP Fatal error:  Uncaught Error: Typed property APP\pages\article\ArticleHandler::$publication must not be accessed before initialization in pages/article/ArticleHandler.php:144
```

Control: `…/catalog/book/5/version/5` and `…/article/view/17/version/18`,
each naming the item's own version, show the book's and the article's
page. `…/article/view/1/version/2`, an unpublished version of article 1,
shows "404 Not Found" to a visitor.

## Cause

Both handlers look the requested version up the same way. For a
`version/{id}` address they loop over the submission's publications and
assign the one whose id matches to `$this->publication`; then they test
`!$this->publication` and throw `NotFoundHttpException` when nothing
matched:

- OMP `CatalogBookHandler::book()`, `pages/catalog/CatalogBookHandler.php`,
  lines 113–124;
- OJS `ArticleHandler::initialize()`, `pages/article/ArticleHandler.php`,
  lines 139–146.

That test was written for an untyped property, which is `null` until
assigned. Both properties have since been declared
`public Publication $publication;`, typed and without a default. Such a
property is uninitialized until assigned, and PHP throws an `Error` on
reading it. When no publication matches, nothing is assigned, so the
test itself throws before it can answer "not found".

The declarations came in with changes made for other purposes: in OMP
with 29fa885084 for `pkp/pkp-lib#10671` (pass the publication to the
PDF viewer for correct titles), which tidied the property declarations
on the way, and in OJS with 17bed669e9 for `pkp/pkp-lib#12245` (present
content by publication status), which did the same. Neither changed the
test.

Reach:

- **A book's version address, with or without a chapter** (on screen
  for the book; the chapter in the code): the version is looked up
  before `…/version/{id}/chapter/{id}` reads its chapter (the `elseif`
  at lines 154–156).
- **An article's version address for any operation** (on screen for
  `view`; `download` in the code): `initialize()` runs before both.
- **Every role** (on screen for a visitor and, on the press, the Press
  editor): the lookup does not depend on the user.
- **An address that once worked** (code): an unpublished version stays
  among the submission's publications, so its address is matched and
  answered "404 Not Found" to those who may not preview it. Only a
  deleted version's address fails this way; the REST API deletes an
  unpublished version (`PKPSubmissionController::deletePublication()`),
  and ui-library has no call to it.
- **Not this fault:**
  - OPS: `PreprintHandler::$publication` is still untyped, so the same
    test answers "404 Not Found" (code).
  - `CatalogBookHandler::download()` reads the same unset property at
    line 533, on every request; that is its own fault and report
    ([U69-A9-book-file-open-download-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md)).
  - The other typed properties without a default found in the page
    handlers (`ArticleHandler::$context` and `$article`, pkp-lib
    `DecisionHandler::$decisionType` and `$submission`, pkp-lib
    `PKPDashboardHandler::$dashboardPage`, set in the constructor) are
    assigned unconditionally before they are read (code).

## Proposed fix

Test whether the property was set, in both handlers
([fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/version-address-no-version-server-error/fix-omp.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/version-address-no-version-server-error/fix-ojs.diff)):

```diff
--- a/pages/catalog/CatalogBookHandler.php
+++ b/pages/catalog/CatalogBookHandler.php
@@ -119,7 +119,7 @@
-        if (!$this->publication || ($this->publication->getData('status') !== PKPPublication::STATUS_PUBLISHED && !Repo::submission()->canPreview($user, $submission))) {
+        if (!isset($this->publication) || ($this->publication->getData('status') !== PKPPublication::STATUS_PUBLISHED && !Repo::submission()->canPreview($user, $submission))) {
             throw new NotFoundHttpException();
```

```diff
--- a/pages/article/ArticleHandler.php
+++ b/pages/article/ArticleHandler.php
@@ -141,7 +141,7 @@
-            if (!$this->publication) {
+            if (!isset($this->publication)) {
                 throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
```

`isset()` is false for an uninitialized typed property and for `null`,
and reading it throws nothing, so the existing "not found" answer is
reached. The property keeps its type, which both changes introduced on
purpose. `ArticleHandler::download()` already tests `!isset($this->galley)`
the same way.

Tried on OMP and OJS `main`: steps 2 to 8 each showed "404 Not Found"
(status 404) and the server log stayed empty. With the fix in and out,
the book's and the article's own address and own version address showed
their page, an unpublished book's address and an unpublished version's
address stayed "404 Not Found" for a visitor.

Tried on OMP `stable-3_5_0` too, with the same edit on line 120
([fix-omp-3_5.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/version-address-no-version-server-error/fix-omp-3_5.diff)):
steps 2 to 5 each showed "404 Not Found" with an empty server log, and
the three neighbour addresses were answered the same with the fix in
and out.

- **Alternatives.**
  - Declaring the property `public ?Publication $publication = null;`,
    as its neighbours `$chapter` and `$galley` are, also makes the test
    work. It changes the type that plugins and the handlers' other
    methods read. In OMP it would also make
    `CatalogBookHandler::download()` send the file with a null
    publication in its usage event, which lib/pkp's
    `LogUsageEvent::canHandle()` refuses, so the file view would
    silently never be logged
    ([U69-A9-book-file-open-download-fails.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U69-A9-book-file-open-download-fails.md)).
  - Collecting the match in a local variable and assigning the property
    after the test works too, with more lines changed for the same
    result.
- **What goes with it.** No stored data is involved. The OMP diff for
  `main` does not apply to `stable-3_5_0`, where the same line (120)
  reads `PKPSubmission::STATUS_PUBLISHED`; `fix-omp-3_5.diff` is the
  same edit for that branch. OJS needs no backport. The guard is an e2e check that a version address with an
  unknown id answers "404 Not Found" (specs U69 and U49, a **Planned**
  item each).

Small: one line in each of the two handlers, following a test the code
already uses.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/version-address-no-version-server-error/walk.js),
  takes steps 1 to 8 and reads the server log after them. Run it on
  installs freshly loaded from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/version-address-no-version-server-error/walk.js`.
  `WALK=neighbour` in front takes the neighbour check: on OMP
  `catalog/book/5`, `catalog/book/5/version/5` and `catalog/book/1`
  (an unpublished book); on OJS `article/view/17`,
  `article/view/17/version/18` and `article/view/1/version/2` (an
  unpublished version).
- The fix was tried with `node bin/try-fix.js apply …/fix-omp.diff omp`
  and `… apply …/fix-ojs.diff ojs`, the script in both modes, then
  reverted; on 3.5 with
  `PKP_E2E_LINE=stable-3_5_0 node bin/try-fix.js apply …/fix-omp-3_5.diff omp`,
  the script on OMP in both modes, then reverted.
- Walked on OMP and OJS, `main` and `stable-3_5_0`, on PostgreSQL;
  nothing here depends on the database (MySQL not checked). Datasets:
  pkp/datasets 92050d9 (2026-10-01). On 3.5 the OMP steps showed the
  same blank page (status 500, the same log line at
  `CatalogBookHandler.php:120`), and the OJS steps 6 to 8 showed "404
  Not Found" with an empty log.
- Tips:

  | Line | OMP | its lib/pkp | OJS | its lib/pkp |
  |---|---|---|---|---|
  | `main` | 3b0ecf794 | 3dc90c81a6 | 4408b94def | f5bd392a69 |
  | `stable-3_5_0` | b24879c3d | 1fb843f491 | 18d097d94e | 1fb843f491 |
  | `stable-3_4_0` | 0aec65441 | not read | 9571d8fde7 | not read |
  | `stable-3_3_0` | 8e72fc883 | not read | 9fdb9bcf9a | not read |
- Code reads:
  - `main`: `CatalogBookHandler::book()` and `setChapter()`;
    `ArticleHandler::initialize()`, its property declarations and its
    `download()`; OPS `PreprintHandler::initialize()` and its untyped
    `public $publication;`; a search of the three apps' `pages/` and
    pkp-lib's `pages/` for typed properties without a default, and
    where each is assigned; pkp-lib
    `PKPSubmissionController::deletePublication()` (refuses a published
    version), and a search of ui-library's `src/` for a call that
    deletes a publication (none).
  - 3.5: OMP has the typed property (line 52) and the same test (line
    120), from 9ed69bfc3, the backport of 29fa885084 in `pkp/omp#1907`.
    OJS and OPS declare `public $publication;` untyped.
  - 3.4 and 3.3: OMP and OJS declare the property untyped
    (`public $publication;`, `var $publication;`), and the same test
    answers with `$request->getDispatcher()->handle404()`.
- Introduced: `git blame` on the declarations (OMP line 53, OJS line 61)
  names 29fa885084 and 17bed669e9, each of which replaced the untyped
  `public $publication;`. The tests are older and read the property
  the same way before the declarations changed: OJS line 144 dates from
  2021 (665ed1f925); OMP line 122 blames to 4d5a8c67da (2025-08-24) on
  `main` and line 120 to 2004cab1d5 (2022-11-24) on 3.5, both of which
  changed only the status half of the condition.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/omp, pkp/ojs and
  pkp/ui-library, by symptom ("version url 500 not found publication",
  "nonexistent version article page 404 error", "version 404 book page
  error") and by the class and message (`CatalogBookHandler`,
  `ArticleHandler`, "must not be accessed before initialization").
  Nothing matched; `pkp/pkp-lib#8123`, the one hit on the message, is
  another property (OMP's usage event, 2022, closed). pkp/omp's and
  pkp/ojs's `main` on GitHub still have both lines.
- Not driven: a Reader, the Press manager and the Site Administrator;
  a signed-in user on OJS; a deleted version's address; a chapter address under an unknown
  version and an article's `download` address under one, both read in
  the code as the same line.
