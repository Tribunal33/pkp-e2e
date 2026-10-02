# A press's category page shows a broken-picture mark instead of the category's picture

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11243` and `pkp/omp#1949` for `pkp/pkp-lib#10404` · [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719), [adeb69c6b](https://github.com/pkp/omp/commit/adeb69c6b8c43fcf3a3aedabbc45c3eca0a49c9a) · 2025-05-12 · Taslan A. Graham (taslangraham)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#omp1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A press manager gives a category a "Cover Image" and saves: "Category
saved". The category's page then shows the browser's broken-picture mark,
with the category's name beside it, where the picture should be, and the
picture's own small and full-size addresses open an empty page.

After an upgrade from 3.5, every category picture a press had is hidden
the same way; the files are moved, not deleted, and show again once
fixed.

## Impact

- **Lost**: the category picture on the press's public category pages,
  the only place readers see it. The stored picture is kept, and the
  manager's preview in the category window still shows it.
- **Who**: every press that sets a category picture, and every reader of
  its category pages.
- **Way round**: none. Removing the picture removes the broken mark.

Medium: a public page shows a broken picture for every category that has
one, with no way round, while the page's books and description are
intact.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP), freshly loaded. Its
  category "Applied Science" (path `applied-science`) has no picture.
- The press's own folder in the public files folder, `public/presses/1`.
  Creating a press on screen makes it, but the dataset's files hold no
  empty folder, so on a freshly loaded dataset create it by hand. Without
  it the first picture's small copy is never written, on every app, and
  the journal and preprint server below would show a broken picture too.
- A picture `picture.png` on the reader's computer (the walk used a
  400 × 400 PNG).

1. Sign in as `rvaca` (password `rvacarvaca`), the Press manager.
2. Go to Settings › Press and open the "Categories" tab.
3. On the "Applied Science" row, open "More Actions" and choose "Edit"
   [3.5: press "Applied Science" in the list].
4. Under "Cover Image", press "Upload File" and choose `picture.png`.
   Type "u16c3 picture" into "Alternate text" [3.5: no such box].
5. Press "Save" [3.5: "OK"].
6. Open the category's page,
   `/index.php/publicknowledge/catalog/category/applied-science`. [The
   first opening of a press's category page after a settings save shows
   the browser's "sent no data" page, a fault of its own (spec U16
   OMP5); open it again.]
7. Type the small picture's address and the full-size address the page's
   markup names into the browser:
   `/index.php/publicknowledge/catalog/thumbnail?type=category&id=1` and
   `/index.php/publicknowledge/catalog/fullSize?type=category&id=1`.

**Expected:** step 6 shows a small copy of the picture (100 × 100 for a
400 × 400 picture, within the press's "Cover Image Max Width" and "Cover
Image Max Height", 106 and 100), and the two addresses at step 7 open
the small copy and the picture.

**Observed:** step 5 shows "Category saved". Step 6 shows a
broken-picture mark with "Applied Science" (the `<img>`'s alternate text)
beside it: the image has a natural size of 0 × 0. Both addresses at step
7 return status 200 with an empty body (`text/html`, 0 bytes).

On a journal and a preprint server the same steps show the picture
(100 × 100), and the same two addresses return `image/png`. On 3.5 the
press shows the picture too.

## Cause

OMP serves a category's picture from the place, and under the name,
pkp-lib stopped writing it to. `CatalogHandler::fullSize()` and
`thumbnail()` in OMP `pages/catalog/CatalogHandler.php` (lines 209 and
246) override pkp-lib's `PKPCatalogHandler`; for `type=category` they set
`$path = '/categories/'` and read
`$pressFileManager->getBasePath() . $path . $imageInfo['name']` (full
size) and `… . $imageInfo['thumbnailName']` (small copy): the press's
private files folder.

`pkp/pkp-lib#10404` (nested categories, `pkp/pkp-lib#11243`, 2025,
`main` only) moved category pictures. `CategoryCategoryController::saveCategory()`
now moves the upload into the press's public files as
`{id}-category.{ext}`, kept in `image.uploadName`, writes the small copy
there as `{id}-category-thumbnail.{ext}` (`generateThumbnail()`), and
keeps the uploader's original file name (`picture.png`) in
`image.name`. The same change made pkp-lib's `PKPCatalogHandler::fullSize()`
and `thumbnail()`, which serve OJS and OPS, read
`PublicFileManager::getContextFilesPath()` with `uploadName` and
`thumbnailName`, and its upgrade migration
`I10404_UpdateCategoryImageNameFields` moves the old pictures from
`categories/` to the public folder and swaps `name` and `uploadName`.
OMP's half of the change (`pkp/omp#1949`) left `CatalogHandler` as it
was, so it looks in the wrong folder, and its `fullSize()` also reads
the wrong key (`name`, the original file name). With no file there,
`FileManager::downloadByPath()` sends nothing, and the page draws a
broken picture.

Reach:

- New pictures (walked) and pictures carried over by the upgrade, which
  the migration moves away from `categories/` (checked in the code).
- The category page is the only page that shows a category's picture
  (checked in the code: no other OMP template or block asks for it). The
  category window's own preview reads the public files folder directly
  (`ManagementHandler` gives `CategoryForm` that folder's address), so
  it shows the picture (checked in the code).
- Series pictures are not affected: OMP's series window (`SeriesForm`)
  still stores them in the press's `series/` folder, which the same
  methods read for `type=series` (walked).
- 3.5, 3.4 and 3.3 store category pictures in `categories/` and read them
  there (pkp-lib `CategoryForm`, `PKPCatalogHandler`; walked on 3.5).

## Proposed fix

Let OMP's `CatalogHandler` hand category pictures to the shared handler,
and keep its own code for series:

```diff
--- a/pages/catalog/CatalogHandler.php
+++ b/pages/catalog/CatalogHandler.php
@@ fullSize()
             case 'category':
-                $path = '/categories/';
-                $category = Repo::category()->get((int) $id);
-                if ($category && $category->getContextId() == $press->getId()) {
-                    $imageInfo = $category->getImage();
-                }
-                break;
+                // Category pictures are public files since 3.6 (pkp/pkp-lib#10404): the shared handler serves them.
+                return parent::fullSize($args, $request);
```

and the same in `thumbnail()` with `parent::thumbnail()`. pkp-lib's
methods are the ones `pkp/pkp-lib#10404` wrote for the new storage, so
the three apps then read category pictures one way, and a later change to
the storage reaches OMP too. The diff is
[omp1-fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/omp1-fix-omp.diff).
Tried on `main`: with the fix, the press's category page shows the
picture (100 × 100) and both addresses return `image/png`; a series
picture ("History") still shows on its series page and its small copy
still loads, with the fix in and out.

A proposal; the team decides.

**Alternatives**:

- Change OMP's folder to the public one in place: it would also have to
  read `uploadName` in `fullSize()` in place of `name`, and it
  duplicates pkp-lib's code, which is how the two drifted apart.
- Drop OMP's overrides entirely: pkp-lib's methods throw for
  `type=series`, so OMP still needs its own series branch.

**What goes with it**:

- No data repair: the pictures are already where pkp-lib's handler looks
  (new ones by the save, old ones by the upgrade migration).
- No backport: the fault exists on `main` alone.
- A category with no picture: its typed picture address would then be
  served by pkp-lib's code on a press too, as on a journal and a
  preprint server today, with a PHP warning ("Trying to access array
  offset on null", `PKPCatalogHandler.php` line 121 in `fullSize()`,
  line 145 in `thumbnail()`) and a response the browser never finishes
  loading (walked on OJS and OPS; OMP returns an empty page today). No
  page links there. A guard that throws `NotFoundHttpException` when the
  category has no picture, in pkp-lib's two methods, would make all
  three apps return 404; it is a separate small change.
- Test: an e2e check in spec U16 (a **Planned** item) that a press's
  category page loads its picture, as the journal's does.

Small: the change is two cases in one OMP handler, with no change in
pkp-lib.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/walk.js)
  takes these Steps (and those of the sibling reports U16-A6-A7 and
  U16-A17), creating the context's public folder first:
  `PART=picture PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/category-picture/walk.js`.
  `WALK=nb-series` in place of `PART` is the check that the fix reaches
  no further: the series "History" with a picture, its page
  (`catalog/series/his`) and its small copy.
- Walks: OMP, with OJS and OPS as the control, on `main` and
  `stable-3_5_0`, on PostgreSQL; datasets from pkp/datasets e8dafbc
  (2026-10-02). No request failed on the server and no page script
  failed, apart from OMP5 (Steps, step 6). MySQL not checked (the fault
  does not depend on the database).
- Not driven: 3.4 and 3.3; an upgrade from 3.5 with category pictures in
  place (the migration's move was read in the code, not run); the
  category window's preview after the save; a category with no picture
  on a press with the fix in (Proposed fix).
- `pkp/pkp-lib#7327` (open PR, browsing URLs) would move these methods
  but does not touch the storage.
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
    64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5), OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335, lib/ui-library d4e01883 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib 6f96165c90, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib 4156e50233, ui-library 96959f9e.
- Code reads: on `main`, the classes the Cause names, OMP
  `SeriesForm::execute()`, `ManagementHandler` (the window's preview
  folder) and every OMP template and block for a category picture; the
  history by `git log -S"'/categories/'"` in OMP and pkp-lib; on 3.5,
  3.4 and 3.3, pkp-lib `CategoryForm` and `PKPCatalogHandler` and OMP
  `CatalogHandler` (`.inc.php` on 3.3), which all use `categories/`.
