# A category path with "/" saves, but the category's links open another category's page or "404 Not Found"

- **Severity** medium
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** OMP [fdc1618f05](https://github.com/pkp/omp/commit/fdc1618f05329957f3d9af4f73e98a93e96b6f0b) (2016-10-13) replaced the category path's letters-and-digits check with a pattern that accepts "/" · Alec Smecher (asmecher). OJS and OPS have it since pkp-lib [e10eb21dfc](https://github.com/pkp/pkp-lib/commit/e10eb21dfc034e42233ef5b050106a7954c0519d) for `pkp/pkp-lib#4158` (2018); OMP's series path has the same pattern since OMP [a746a8c2d1](https://github.com/pkp/omp/commit/a746a8c2d1f08256006a9286e9ab4e95fde89417) for `pkp/pkp-lib#1334` (2017)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager adds a category with a path holding "/" ("applied-science/u16c4")
and presses "Save". The category is saved, but every link to it opens a
different page: the page of the category whose path is the part before the
"/" ("Applied Science"), or a bare "404 Not Found" when no category has
that path. The category's own page cannot be reached.

Readers who press the category in a list of sub-categories, on a book,
article or preprint page, or in a menu land on the wrong category, and
nobody is told. A press's series path with "/" breaks its links too.

## Impact

- **Lost**: the category's public page, for every reader, without a
  word to the manager who saved the path.
- **Who**: a journal, press or preprint server manager who types "/" into
  a category's "Path", for instance to mirror the tree
  ("science/physics"), and every reader who follows that category's links.
  Sites can already hold such paths: "/" has been accepted since 2016 on
  presses and since 2018 on journals and preprint servers.
- **Way round**: changing the path to one without "/"; nothing on screen
  tells the manager that this is needed.

Medium: the page is lost silently, but only for a path holding "/", and
removing the "/" restores it. It would be higher if paths with "/" were
common or could not be changed.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. It has the category "Applied Science" (path `applied-science`)
  with the sub-categories "Computer Science" and "Engineering". Nothing
  else. On `stable-3_5_0`, load that version's dataset and follow the
  "[3.5: …]" alternatives in the steps. Its preprint server has no
  "Applied Science": on OPS 3.5, "History" (path `history`) stands in for
  "Applied Science" in every step (the row at steps 3 and 5, the page and
  its address `/index.php/publicknowledge/preprints/category/history` at
  step 6), the path at step 4 is "history/u16c4", and "Cultural History"
  is the control.

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Journal [OMP: Settings › Press; OPS: Settings ›
   Server] and open the "Categories" tab.
3. On the "Applied Science" row, open "More Actions" and choose "Add"
   [3.5: press "Add Category" and choose "Applied Science" under "Parent
   category"].
4. Type "u16c4 Slashed" into "Name" and "applied-science/u16c4" into
   "Path", and press "Save" [3.5: "OK"].
5. Repeat step 3, type "u16c4 Nowhere" into "Name" and "u16c4/nowhere"
   into "Path", and press "Save" [3.5: "OK"].
6. Open the "Applied Science" page,
   `/index.php/publicknowledge/catalog/category/applied-science` [OPS:
   `/index.php/publicknowledge/preprints/category/applied-science`].
7. Under "Subcategories", press "u16c4 Slashed".
8. Go back to the "Applied Science" page and press "u16c4 Nowhere".

**Expected:** a path the category's address cannot carry is refused when
saved: steps 4 and 5 keep the window open with a message under "Path",
and nothing is added. A path that saves opens its own category's page
from every link.

**Observed:** steps 4 and 5 save ("Category saved"; 3.5 closes the window
without a notice), and "Subcategories" on the "Applied Science" page
lists "u16c4 Slashed" and "u16c4 Nowhere". Their links read:

```
…/index.php/publicknowledge/en/catalog/category/applied-science%2Fu16c4
…/index.php/publicknowledge/en/catalog/category/u16c4%2Fnowhere
```

Step 7 answers 200 with the "Applied Science" page: the page title
"Applied Science | Journal of Public Knowledge" (the press's or the
server's name on OMP and OPS), the heading "Applied Science" and the
breadcrumb "Home / Applied Science". Step 8 answers 404
with a page reading only "404 Not Found".

"Computer Science" (path `comp-sci`), pressed on the same list, opens its
own page ("Home / Applied Science / Computer Science").

## Cause

The category path check accepts "/", but a category's address holds its
path as a single part. `PKP\category\Repository::validate()` in pkp-lib
`classes/category/Repository.php` tests the path against
`CATEGORY_PATH_REGEX` (line 44):

```php
private const CATEGORY_PATH_REGEX = '/^[a-zA-Z0-9\/._-]+$/';
```

Every link escapes the "/" as "%2F", since `PKPPageRouter::url()`
`rawurlencode()`s each part of the path. PHP's built-in server decodes "%2F" back into "/" in `PATH_INFO`, as the CGI
specification has it. `Core::getArgs()` then splits `PATH_INFO` on "/".

`PKPCatalogHandler::category()` (pkp-lib
`pages/catalog/PKPCatalogHandler.php` line 62) looks the category up by
`$args[0]` alone, the part before the "/". So "applied-science/u16c4"
opens "Applied Science", and "u16c4/nowhere" finds no category and
throws `NotFoundHttpException`.

The address is built for a path of one part:

- On 3.5, 3.4 and 3.3, `category()` reads `$args[1]` as the page number
  (`catalog/category/<path>/2`), so a "/" in the path collides with it.
- On `main`, `category()` still sets `$page` from `$args[1]` but never
  uses it: paging moved to the `categoryPage` query variable in pkp-lib
  ce23e18e83 (`pkp/pkp-lib#8920`). The handler could read the whole rest
  of the address there, but Alternatives says why that is not proposed.
- OMP's `CatalogHandler::series()` still reads `$args[1]` as the page
  number on `main`.

So the check is what is wrong. Until fdc1618f05 ("Replace
FormValidatorAlphaNum with FormValidatorRegExp", OMP, 2016), OMP's
category form accepted only letters and digits with "-" or "_" between
them. That commit put in the present pattern, the one the navigation
menu items and the Static Pages plugin also use. Those two can accept
"/" because their handlers take the whole rest of the address as the
page's identifier.

Reach:

- Every link to the category: the "Subcategories" list on the parent's
  page (walked), the "Categories" list on an article, book, chapter and
  preprint page, the Browse block, the category list on a journal's or a
  preprint server's home page, a press's navigation menu item for a
  category and OMP's sitemap (each printing the path through the
  router, checked in the code).
- Adding and editing alike, from the "Categories" tab and from the
  categories API, which both go through `Repository::validate()` (checked
  in the code; adding walked).
- OMP's series path has the same fault: `SeriesForm::__construct()` (OMP
  `controllers/grid/settings/series/form/SeriesForm.php` line 62) accepts
  "/" with the same pattern, and `CatalogHandler::series()` looks the
  series up by `$args[0]`. A link opens the series whose path is the part
  before the "/"; when there is none, the reader is redirected to the
  catalog rather than shown a 404 (checked in the code; that a series
  path with "/" saves was walked).
- 3.5, 3.4 and 3.3 have the same pattern in `CategoryForm::__construct()`
  (pkp-lib `controllers/grid/settings/category/form/`) and the same
  `$args[0]` look-up (checked in the code; 3.5 walked).

## Proposed fix

Refuse "/" in a category path and in a series path, so that a path is
always one part of the address. In pkp-lib (all three apps):

```diff
--- a/lib/pkp/classes/category/Repository.php
+++ b/lib/pkp/classes/category/Repository.php
-    private const CATEGORY_PATH_REGEX = '/^[a-zA-Z0-9\/._-]+$/';
+    private const CATEGORY_PATH_REGEX = '/^[a-zA-Z0-9._-]+$/';
```

and in OMP, `SeriesForm::__construct()`, the same change to the series
path's pattern.

This is how the code base settled the same question before. When a
public URL identifier with "/" broke its article's links
(`pkp/pkp-lib#4542`, 2019), the decision was to "overtly disallow that
character". The URL paths of articles, issues and galleys refuse "/"
(`/^[a-zA-Z0-9]+([\.\-_][a-zA-Z0-9]+)*$/`, the `urlPath` rule in
`schemas/publication.json`, OJS `IssueForm`, `IssueGalleyForm` and
`ArticleGalleyForm`). The fix keeps what fdc1618f05 added on purpose:
".", "-" and "_" stay accepted, and so do the paths the default dataset
holds ("applied-science", "comp-sci").

The diffs, one per app root (the pkp-lib hunk is the same in each; OMP's
adds the series hunk):
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-path-slash-wrong-page/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-path-slash-wrong-page/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-path-slash-wrong-page/fix-ops.diff).
Tried on `main` in all three apps: steps 4 and 5 were refused (the
window stayed open, "The category path must consist of only letters and
numbers." under "Path"), and "Subcategories" listed only "Computer
Science" and "Engineering". A path with ".", "-" and "_"
("u16c4-ok_v1.2") still saved and its link opened its own page, with the
fix in and out. On OMP, a series path "history/u16c4" was refused with
"The series path must consist of only letters and numbers." with the fix
in, and saved without it.

This is a proposal; the team decides.

**Alternatives**:

- Let the category page read the whole rest of the address, as the
  Static Pages plugin does. On `main` nothing else uses that part of the
  address any more. But Apache, by default, answers its own 404 to any
  address holding "%2F" before PHP runs (`AllowEncodedSlashes Off`, per
  the discussion in `pkp/pkp-lib#4542`), so the links would still fail
  on Apache installs. On 3.5, 3.4 and 3.3, and for OMP's series on `main`,
  the next part is the page number, so "applied-science/2" would be
  ambiguous there. Refusing "/" keeps one rule on every branch.
- Print the links with a real "/" instead of "%2F" (the change
  `pkp/pkp-lib#4756` made for navigation menu custom pages): that gets
  past Apache. But on 3.5, 3.4, 3.3 and for series it still clashes with
  the page number, and on `main` it still needs the handler change
  above.

**What goes with it**:

- Paths already saved with "/": the fix refuses only new saves. A
  category or series that already has such a path keeps it. The
  manager's next "Save" in its window is refused and the window stays
  open, with the path message under "Path" (for a series, as a notice at
  the top right), because the window sends the path with every save
  (read in the code). Removing the "/" saves, and
  that also makes the page reachable. No migration or notice is
  proposed. Those pages lead nowhere useful today, so refusing them
  breaks nothing that works. A migration would have to choose a new
  public address for the manager, and rewriting "/" to "-" could collide
  with an existing path.
- The refusal message: the refused path reads "The category path must
  consist of only letters and numbers." ("The series path …"), which
  understates what a path may hold. Its rewording is
  [pkp-e2e#483](https://github.com/jardakotesovec/pkp-e2e/issues/483);
  with this fix in, its proposed sentences drop "forward slashes (/)".
- The categories API answers 400 with the path message to a client that
  sends "/", as it does today for a space.
- Backport: on 3.5 and 3.4 the pattern is in pkp-lib
  `CategoryForm::__construct()` (`CategoryForm.inc.php` on 3.3) and OMP
  `SeriesForm::__construct()` (`SeriesForm.inc.php` on 3.3); the same
  one-character change applies there.
- Test: a unit test of `Repository::validate()` with "a/b", and an e2e
  check in spec U16 (a **Planned** item) that a path with "/" is refused.

Medium: two one-line pattern edits, but in two repositories (pkp-lib
and OMP), with a unit test and no data repair.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-path-slash-wrong-page/walk.js)
  takes the Steps and records, for each "Save", the answer, whether the
  window stays open and the messages under "Path"; for each link, its
  address, the answer's status, the page title, heading and breadcrumb.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/category-path-slash-wrong-page/walk.js`.
  - **Neighbour check:** `WALK=neighbour` in front adds "u16c4 Dotted"
    under "Applied Science" with the path "u16c4-ok_v1.2" and follows its
    link; `WALK=series` (OMP) adds the series "u16c4 Slashed series" with
    the path "history/u16c4".
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02). No request failed on
  the server and no page script failed. MySQL not checked (the fault does
  not depend on the database).
- Not driven: 3.4 and 3.3; Apache (Alternatives); the links other than
  "Subcategories" (Reach); a series page's links; the next save of a
  category or series that already holds a "/" (read in the code).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794
    (lib/pkp 3dc90c81a6), OPS c8af945bb7 (lib/pkp 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441, OPS acd8ae704b,
    pkp-lib 6f96165c90.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc883, OPS c5532e2161,
    pkp-lib 4156e50233.
- Code reads:
  - `main`: `Repository::validate()` and `CATEGORY_PATH_REGEX`;
    `PKPCatalogHandler::category()` (`$page` unused since ce23e18e83);
    `PKPPageRouter::url()` and
    `getRequestedArgs()`; the templates and classes that print a
    category link (Reach); OMP `SeriesForm::__construct()` and
    `CatalogHandler::series()`; the other path checks
    (`schemas/publication.json`, `schemas/navigationMenuItem.json`, OJS `IssueForm`, `IssueGalleyForm`,
    `ArticleGalleyForm`, `StaticPagesPlugin::callbackHandleContent()`).
  - 3.5, 3.4, 3.3: pkp-lib `CategoryForm::__construct()` (the same
    pattern), `PKPCatalogHandler::category()` (`$args[0]`), the
    "Subcategories" links in each app's `catalogCategory.tpl`, the
    router's `rawurlencode()`; OMP `SeriesForm::__construct()` and
    `CatalogHandler::series()`.
- The trace: `git blame` on `CATEGORY_PATH_REGEX` names pkp-lib
  [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719)
  (2025-05-12, Taslan A. Graham, `pkp/pkp-lib#10404`), which moved the
  check from `CategoryForm` into the repository unchanged; before it,
  e10eb21dfc (2018-12-11, Alec Smecher, `pkp/pkp-lib#4158`) brought
  `CategoryForm` from OMP to pkp-lib with the pattern. OMP's series
  check: blame at 86f2daa114 (2021, `pkp/pkp-lib#6901`, which only
  namespaced the class), back to a746a8c2d1 (2017-02-15, Alec Smecher,
  "Prevent series without paths").
- Upstream searches (2026-10-02) in pkp/pkp-lib, pkp/omp, pkp/ojs,
  pkp/ops and pkp/ui-library: "category path slash", "category path /",
  "category url %2F", "category path 404", "series path slash",
  "encoded slash", `CATEGORY_PATH_REGEX`, `pathAlphaNumeric`. None is
  about this fault: `pkp/pkp-lib#4542` (an article's URL identifier with
  "/", fixed by refusing it) and `pkp/pkp-lib#4756` (a navigation menu
  custom page with "/") are the same kind of fault on other paths;
  `pkp/pkp-lib#12571`, `pkp/pkp-lib#5932` and `pkp/pkp-lib#12003` are
  other category path faults.
