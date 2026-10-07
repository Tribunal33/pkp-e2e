# The picture address of a category with no picture never finishes loading on a journal or preprint server

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** server
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/pkp-lib#4369` for `pkp/pkp-lib#4158` · [75f76c503a](https://github.com/pkp/pkp-lib/commit/75f76c503a603a0a0b4d1edda5a31ab82fb233e8) · 2018-12-17 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-07)
- **Tracked in** spec U16 [A22](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a22)
- **Checked** 2026-10-07, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a journal or a preprint server, a category's picture address
(`…/catalog/thumbnail?type=category&id=2` for its small copy, `…/fullSize?…`
for the full size; `…/preprints/…` on a preprint server), opened for a
category that has no "Cover Image", should answer the bare "404 Not
Found" page. Instead the browser never finishes loading it: the server
answers "200 OK" with headers promising 4096 bytes, fails to read the
file, and closes the connection without sending any of them. The
server is not kept busy; only the visitor's browser waits.

No page links to these addresses: they are reached only by typing or
bookmarking one, or by keeping the address of a picture the manager
has since removed. A press is not affected, because its own handler
checks for a picture first and answers an empty page.

## Impact

- **Lost**: nothing stored. A visitor, a search engine or a link checker
  that opens the address waits on a page that never completes instead
  of being told the picture does not exist, and the server logs a PHP
  warning and notice each time.
- **Who**: whoever keeps such an address. The likeliest way in is the
  old address of a picture removed in the category window (read in the
  code, not walked).
- **Way round**: none on screen, and none needed: a manager has no
  setting or record to correct.

Low: only a kept or typed address fails, and the journal's own pages
are untouched; it would rise if a page linked a picture address for a
category without a picture.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS or OPS), freshly loaded.
  Its categories "Applied Science" and "Computer Science" have no
  picture. [3.5 OPS: the dataset has no "Applied Science" or "Computer
  Science"; the steps use "Social sciences" and "History" instead.]
- A picture `picture.png` on the reader's computer (the walk used a
  400 × 400 PNG).

Steps 1 to 5 only create the folder category pictures are kept in, which
any journal running in production already has. A journal created on
screen gets its public files folder (`public/journals/1/`, OPS
`public/contexts/1/`) at once; the dataset dump leaves it out, and
saving the first category picture creates it. [3.5: the pictures are
kept in the journal's private `categories/` files folder, which the
first category picture creates.]

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   (Preprint Server manager).
2. Go to Settings › Journal (Server) and open the "Categories" tab.
3. On the "Applied Science" row, open "More Actions" and choose "Edit"
   [3.5: press "Applied Science" in the list; 3.5 OPS: press "Social
   sciences"].
4. Under "Cover Image", press "Upload File" and choose `picture.png`.
5. Press "Save" [3.5: "OK"].
6. Type the small picture's address of "Computer Science", which has no
   picture, into the browser:
   `/index.php/publicknowledge/catalog/thumbnail?type=category&id=2`
   (OPS: `/index.php/publicknowledge/preprints/thumbnail?type=category&id=5`;
   3.5 OPS: "History",
   `/index.php/publicknowledge/preprints/thumbnail?type=category&id=1`).
7. Type its full-size address:
   `/index.php/publicknowledge/catalog/fullSize?type=category&id=2`
   (OPS: `…/preprints/fullSize?type=category&id=5`; 3.5 OPS:
   `…/preprints/fullSize?type=category&id=1`).

**Expected:** both addresses answer the bare "404 Not Found" page, as an
unknown category does (`…/catalog/thumbnail?type=category&id=999`).

**Observed:** at steps 6 and 7 the browser keeps loading and never shows
a page (the walk gave up after 20 seconds). The server logs, for step 6
(step 7 gives line 121 in place of 145):

```
PHP Warning:  Trying to access array offset on null in …/lib/pkp/pages/catalog/PKPCatalogHandler.php on line 145
PHP Notice:  fread(): Read of 8192 bytes failed with errno=21 Is a directory in …/lib/pkp/classes/file/FileManager.php on line 325
```

and answers with headers built from the journal's public files folder
(its type "directory", its size, its name "1"), then closes the
connection in the same second without sending a byte of body:

```
HTTP/1.1 200 OK
Content-Type: directory
Content-Length: 4096
Content-Disposition: inline; filename="1"
```

The unknown id (999) answers "404 Not Found". Before step 5, on the
freshly loaded dataset with no public files folder, the same address
answers an empty page (status 200, no content), with the same warning.

## Cause

`PKPCatalogHandler::thumbnail()` and `fullSize()` in
`lib/pkp/pages/catalog/PKPCatalogHandler.php` (lines 143–145 and
119–121 on `main`) serve a category's picture without checking that
the category has one. They answer 404 for an unknown or another
journal's category, then read `$imageInfo = $category->getImage()`,
which is `null` for a category with no picture, and pass
`getContextFilesPath($contextId) . '/' . $imageInfo['thumbnailName']`
(`['uploadName']` in `fullSize()`) to `downloadByPath()`.

With the name `null`, the path is the context's public files folder
itself (`public/journals/1/`, OPS `public/contexts/1/`).
`FileManager::downloadByPath()` only asks `is_readable()`, which a
folder passes, so it sends a `200` with `Content-Type: directory` and
the folder's size as `Content-Length`. `readFileFromPath()` then opens
the folder (`fopen()` succeeds), `fread()` fails once with EISDIR, which
makes `feof()` true, and the method returns `true` having sent nothing.
The PHP process ends normally and the server closes the connection with
the body cut short, so no worker or connection is held; it is the
browser that keeps waiting. When the folder does not exist,
`downloadByPath()` returns `false`, which the handler ignores, and the
answer is an empty page.

The methods came to pkp-lib when the catalog handler was shared with
OJS (`pkp/pkp-lib#4158`, 2018), without the `if ($imageInfo)` check
that OMP's own handler for the same addresses has. On 3.5 and older the path is the journal's private
`categories/` files folder, with the same result once any category of
the journal has had a picture.

Reach:

- OJS and OPS on every version: OPS routes `preprints/thumbnail` and
  `preprints/fullSize` to the same class (walked on `main` and 3.5; read
  in the code on 3.4 and 3.3).
- OMP: its own `CatalogHandler` keeps the `if ($imageInfo)` check, so
  the same addresses answer an empty page (status 200, no content), as
  does an unknown id: no failure, but no 404 either (walked).
  `pkp/pkp-lib#10404` "Allow nested categories" moved category pictures
  to the public files folder and left OMP reading the old one, a
  separate fault reported in
  [U16-OMP1-press-category-picture-broken.md](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-OMP1-press-category-picture-broken.md).
  Its proposed fix hands OMP's category pictures to these pkp-lib
  methods, so it would bring this fault to OMP unless this fix lands
  first.
- A category whose picture was removed in the category window
  (`CategoryCategoryController` stores `image` as `null`) is in the same
  state, so its once-working addresses fail the same way (code).
- A category whose picture file is missing on disk (the small copy is
  not written when the public files folder is missing at the first
  upload) answers an empty page, since the handler ignores
  `downloadByPath()`'s `false` (code; seen in the walk's server log as
  `imagepng(…-category-thumbnail.png): Failed to open stream`).
- The category's page prints the picture only `{if $image}`, and the
  "Browse" block prints no picture (code), so no page links these
  addresses.

## Proposed fix

In both methods of `PKPCatalogHandler`, answer 404 when the category has
no picture (the `empty(...)` check, which alone fixes this report), and
when the picture file cannot be sent (the `!downloadByPath(...)` check,
which covers only a missing picture file: for a folder
`downloadByPath()` returns `true`):

```diff
                 $imageInfo = $category->getImage();
+                if (empty($imageInfo['thumbnailName'])) {
+                    // No picture: there is nothing to serve at this address.
+                    throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+                }
                 $publicFileManager = new PublicFileManager();
-                $publicFileManager->downloadByPath($publicFileManager->getContextFilesPath($category->getContextId()) . '/' . $imageInfo['thumbnailName'], null, true);
+                if (!$publicFileManager->downloadByPath($publicFileManager->getContextFilesPath($category->getContextId()) . '/' . $imageInfo['thumbnailName'], null, true)) {
+                    throw new \Symfony\Component\HttpKernel\Exception\NotFoundHttpException();
+                }
```

and the same in `fullSize()` with `uploadName`. It throws the same
exception the two methods already throw for an unknown category, a few
lines up. The whole diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-no-picture-address-never-loads/fix.diff).
Tried on `main`, OJS and OPS: with the fix, both addresses of "Computer
Science" answer "404 Not Found", and a category with a picture still
gets its small copy and full-size picture, with the fix in and out.

**Alternatives**:

- Make `FileManager::downloadByPath()` refuse a folder (`is_file()` in
  place of `is_readable()`): it would stop the broken answer for every
  caller given an empty name (the administrator's scheduled task log
  download takes the name from the request), but the category addresses
  would still answer an empty page instead of 404. Worth doing as well,
  not instead.
- The first check alone, without the `downloadByPath()` one: fixes this
  report, but a picture whose file is missing would keep answering an
  empty page.

**What goes with it**:

- No data repair and no API change. A plugin that serves files through
  the `FileManager::downloadFile` hook and leaves its `$result` falsy
  would now get a 404 after its own output; the core code sets nothing
  there.
- Backport: the same two checks apply on 3.5, 3.4 and 3.3, where the
  methods read the private `categories/` folder through
  `ContextFileManager` (`name` in place of `uploadName`; 3.3 calls
  `handle404()` in place of the exception).
- Test: an e2e check that the small picture's address of a category
  with no picture answers 404.

Small: one pkp-lib file, no data repair and no change to the API or to
what OMP and plugins rely on.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-no-picture-address-never-loads/walk.js)
  takes these Steps on all three apps (OMP as the control), on an
  install loaded from the default dataset:
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/category-no-picture-address-never-loads/walk.js`.
  With `WALK=nb` it checks that categories with a picture still serve
  it: "Applied Science" and then "Social Sciences" get a picture, and
  Social Sciences' small and full-size addresses and Applied Science's
  full-size address answered `image/png` with the fix in and out, and
  id 999 the 404.
- Walks on PostgreSQL, datasets from pkp/datasets 401a013 (2026-10-06).
  On 3.5 the walk saw the same as on `main` on OJS and OPS (the
  warnings at `PKPCatalogHandler.php` lines 157 and 133) and the same
  empty pages on OMP.
  The headers in Observed are the same request sent with `curl -D -`
  after the walk (curl ended "partial file", exit 18); the server log
  shows each such request accepted, answered and closed within one
  second. Why Chromium keeps the cut-short page loading rather than
  showing an error is not established (unverified).
- Not driven: 3.4 and 3.3 (code only); removing a picture in the
  category window and opening its old address; a missing picture file
  with the folder present.
- `pkp/pkp-lib#7327` (open PR, browsing URLs) would move these methods
  but keeps their body.
- Introduced: blame on the lines gives `198595800a` and `e3f570bc37`
  (moves and reformatting); `git log -S` on the old
  `'/categories/' . $imageInfo['thumbnailName']` line leads to
  `75f76c503a`.
- Tips:
  - **`main`:** OJS 92bc2bb467 (lib/pkp e60013c77f), OMP a0e6d0a8bc
    (lib/pkp 5a5ab2d6c7), OPS 7e34fdd57e (lib/pkp 5a5ab2d6c7).
  - **`stable-3_5_0`:** OJS b8f5e9a951, OMP 7d6b00060a, OPS acc0de0586
    (lib/pkp 6d7f1540b6 in each).
  - **`stable-3_4_0`:** OJS d68934d0d1, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib 767353f4fe.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib ac3fa73402.
- Code reads: on `main`, `PKPCatalogHandler`, `FileManager::downloadByPath()`
  and `readFileFromPath()`, `CategoryCategoryController::saveCategory()`
  (a removed picture stored as `null`), OMP `CatalogHandler`, the
  category templates of OJS and OPS, and every `downloadByPath()` caller;
  on 3.5, 3.4 and 3.3, pkp-lib `PKPCatalogHandler` (`.inc.php` on 3.3)
  and `FileManager`, OPS `pages/preprints/index.php` (routes
  `thumbnail` and `fullSize` to `PKPCatalogHandler`) and OMP
  `CatalogHandler` (its `if ($imageInfo)` check on each).
