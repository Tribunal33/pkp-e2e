# Readers get "404 Not Found" for a preprint's HTML and other non-PDF files once it has a URL Path

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/ojs#2457` for `pkp/pkp-lib#2072` · [88aba9a0cb](https://github.com/pkp/ojs/commit/88aba9a0cb9a46881fdb0c2b46c3f311d98be7d5) · 2019-06-26 · Nate Wright (NateWr); OPS carried the line over from OJS, whose copy was fixed by `pkp/ojs#2786` for `pkp/pkp-lib#5954` (2020) and never ported
- **Upstream** `pkp/pkp-lib#5575` and `pkp/pkp-lib#5954` (closed, each fixed for OJS only, in `pkp/ojs#2657` and `pkp/ojs#2786`; the question on #5575 whether the fix was ported to OPS got no answer)
- **Tracked in** U13 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops2), U20 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a preprint server, once a preprint has a URL Path, a visitor who presses any of its files other than a PDF (an HTML file, a Word document, a data set) gets the "404 Not Found" page instead of the file. The PDF still opens in the PDF viewer, and the viewer's "Download" still saves it.

The file stays stored, but no link reaches it: not the preprint's page, not the address Google Scholar is given for an HTML full text, not OAI-PMH. The visitor sees the 404; the server's managers and the preprint's authors get no error or notice. Links made with the preprint's number before the URL Path was set are hurt too: a download link to a file ends on "404 Not Found", a link to the PDF viewer lands on the preprint's page, and a link to an older version lands on the current version's page or on "404 Not Found".

A URL Path is optional and set per version, on "Preprint entry", so the fault reaches only the preprints a server gives one. Files other than PDFs are an ordinary choice: "Add galley" takes any file, and its upload offers components such as "Data Set", "Multimedia" and "Image" by default.

## Impact

- **Lost**: visitors' access to the preprint's non-PDF files, and to older versions through links made before the URL Path. Nobody on the server's staff is told.
- **Who**: every visitor, signed in or not.
- **Way round**: none for the visitor. A manager can clear the URL Path: the files download again, but every link already shared with the URL Path then answers "404 Not Found", because the lookup finds no version with that path any more.

Medium: a visitor cannot get the file at all, but only on preprints given a URL Path, and a manager can restore the downloads on screen at the cost of the links made with the URL Path. It would be high on a server that gives its preprints URL Paths as a rule and posts files other than PDFs.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (or `stable-3_5_0`).
- Submission 3, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice", has two posted versions, each with a galley "PDF" and no URL Path.
- Any small HTML file on disk, here `u13ops2.html`.

Manager:

1. Sign in as `dbarnes`.
2. Open submission 3 and, in the side menu under "Preprint", the current version's "Galleys".
3. Press "Add galley", type "HTML" in "Galley Label" and press "Save". In the upload window choose "Preprint Text", upload `u13ops2.html`, press "Continue", "Continue" and "Complete". The list shows "PDF" and "HTML". The version stays posted: no "Unpost" is needed, because a manager may change the galleys and the entry of a posted version.
4. Open the same version's "Preprint entry". Under "Warning: This version has been published. Editing it may impact the published content." the form stays editable; type `u13ops2` in "URL Path" and press "Save".
5. Sign out.

Visitor (signed out):

6. Open `/index.php/publicknowledge/preprint/view/3`. The browser lands on `/index.php/publicknowledge/en/preprint/view/u13ops2`, the preprint's page.
7. Press "HTML".
8. Type the "PDF" link's address with the number in place of the URL Path: `/index.php/publicknowledge/preprint/view/3/4`.
9. Under "Versions", note the older entry's address, `…/preprint/view/u13ops2/version/3` ("{date} (Author Original 1.0)"; 3.5: "{date} (1)"), then type it with the number: `/index.php/publicknowledge/preprint/view/3/version/3`.

**Expected**: step 7 serves `u13ops2.html`. Step 8 lands on `…/preprint/view/u13ops2/4`, the PDF viewer. Step 9 lands on `…/preprint/view/u13ops2/version/3`, the older version's page.

**Observed**: step 7 ends on the "404 Not Found" page. The link goes to the download address with the preprint's number, which forwards to an address with no file part:

```
GET /index.php/publicknowledge/en/preprint/view/u13ops2/21    302 → /index.php/publicknowledge/en/preprint/download/3/21
GET /index.php/publicknowledge/en/preprint/download/3/21      302 → /index.php/publicknowledge/en/preprint/download/u13ops2
GET /index.php/publicknowledge/en/preprint/download/u13ops2   404 Not Found
```

Step 8 lands on `…/preprint/view/u13ops2`, the preprint's page, not the PDF viewer. Step 9 is forwarded to `…/preprint/view/u13ops2/3`, which this dataset forwards again to `…/preprint/view/u13ops2`, the current version's page, because the older version's "PDF" galley also has the id 3; with an id no galley has, the step ends on "404 Not Found".

Control: "PDF" on the same page opens the PDF viewer at `…/preprint/view/u13ops2/4`, and its "Download" saves the file. On submission 2, which has no URL Path, `…/preprint/download/2/2` serves the PDF.

## Cause

`PreprintHandler::initialize()` (`pages/preprint/PreprintHandler.php`) takes the preprint's number or URL Path off the front of the address with `array_shift($args)`, then forwards an address that is not the preprint's current one (`getBestId()`) to it:

```php
$newArgs = $args;
$newArgs[0] = $currentUrlPath;
$request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), $newArgs);
```

Since the first part is already gone from `$args`, `$newArgs[0]` is the galley (or the word `version`), and the URL Path overwrites it instead of going in front of it. So `download/3/21` becomes `download/u13ops2`, and `view/3/version/3` becomes `view/u13ops2/3`, where the version id is read as a galley.

`PreprintHandler::view()` brings the fault to the preprint's own links. For a galley it calls the `PreprintHandler::view::galley` hook, and unless a plugin handles the hook, it redirects to `download` with `$preprint->getId()`, the number, even when the visitor's link used the URL Path. In OPS only the PDF.JS PDF Viewer plugin handles the hook, for PDFs only, and it builds its file address with `getBestId()`; every other galley goes through the broken forward. A theme or plugin that handles the hook for other files escapes the same way.

OJS fixed both lines in 2020 (Upstream); the fixes never reached `pkp/ops`.

Reach:

- The preprint page's link to every galley no plugin shows in the page: "404 Not Found" (walked, HTML). With "PDF.JS PDF Viewer" turned off, the PDFs too (code).
- OAI-PMH's `dc:relation` (`Dc11SchemaPreprintAdapter`) names `view/{URL Path}/{galley}` for every galley, so for those files it ends on the same "404 Not Found" (code). Google Scholar's `citation_fulltext_html_url` (`GoogleScholarPlugin`), written for `text/html` galleys only, does the same (code; U20 OPS1).
- Number addresses with a galley or version part (walked): a `download` address ends on "404 Not Found", a `view` address of a galley lands on the preprint's page, and a version address lands on the current version's page, on "404 Not Found", or on a galley of the current version whose id equals the version id.
- Not affected (code unless marked): the PDF viewer and its "Download" (walked); Google Scholar's `citation_pdf_url`, an older version's galley links, Crossref deposits and the "How to Cite" address, which all build the URL Path address directly; OJS, whose `ArticleHandler` has both fixes on `main`, 3.5, 3.4 and 3.3; and OMP, whose `CatalogBookHandler` does not forward a number address.

## Proposed fix

Port OJS's two fixes to `PreprintHandler` ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/url-path-preprint-downloads-not-found/fix.diff)):

```diff
         if ($currentUrlPath && $currentUrlPath != $urlPath) {
-            $newArgs = $args;
-            $newArgs[0] = $currentUrlPath;
-            $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), $newArgs);
+            $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), [$currentUrlPath, ...$args]);
         }
@@ PreprintHandler::view()
                     $redirectArgs = [
-                        $preprint->getId(),
+                        $preprint->getBestId(),
                         $this->galley->getBestGalleyId()
                     ];
```

The first change alone fixes every symptom; the second saves a redirect and makes the download address the one the preprint's links use, as in OJS since `pkp/ojs#2657`. The diff differs from OJS `main`'s `ArticleHandler` in two places: it keeps OPS's `$currentUrlPath &&` guard, which OJS dropped, and it leaves out OJS's extra branch that redirects a galley given by its number to the galley's URL Path, a separate fault. A search of OPS, OJS, OMP and pkp-lib for the overwrite (`Args[0] = `) finds no other instance.

Tried on `main` (OPS): with the fix, steps 7–9 give the Expected results. The neighbour check gives the same answers with the fix in and out: a preprint without a URL Path, its PDF viewer and download addresses, an unknown galley and an unknown version ("404 Not Found"), and the older version's PDF viewer and download.

**Alternatives**:

- Changing only `view()` to `getBestId()` fixes the page's links but leaves every number address with a galley or version part broken.
- Moving the forward into a shared pkp-lib handler would keep OJS and OPS from drifting apart again, but OMP routes its book pages differently, so it is a larger change than this fault needs.

**What goes with it**:

- No stored data changes, and nothing an API client or plugin relies on: the forward's target changes only where it was wrong.
- The diff applies as written to `stable-3_5_0` and `stable-3_4_0`. On `stable-3_3_0` (`PreprintHandler.inc.php`), write the forward as `array_merge([$currentUrlPath], $args)`: 3.3 still runs on PHP 7.3, which has no `...` inside an array literal (PHP 7.4).
- The guard: an e2e scenario in U13 (a preprint with a URL Path and an HTML galley, its link and its number addresses), or a handler test over `initialize()`'s forward.

Small: two lines in one file, tried.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/url-path-preprint-downloads-not-found/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ops shared/playwright/checks/issues/url-path-preprint-downloads-not-found/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front; `PHASE=neighbour` in front runs the neighbour check alone).
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/url-path-preprint-downloads-not-found/fix.diff ops`, then the walk and `PHASE=neighbour` with the fix in, and `PHASE=neighbour` again after `revert`.
- Tips walked or read: OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)); OPS 3.5 [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)); OPS 3.4 [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b); OPS 3.3 [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161); OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73), 3.5 [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), 3.4 [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), 3.3 [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a). Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL; the fault does not depend on the database.
- 3.5 (walked, and code): `PreprintHandler::initialize()` is identical to `main`'s, and the posted version takes the URL Path and the new galley without unposting there too.
- 3.4 and 3.3 (code): `PreprintHandler.php` (3.4) and `PreprintHandler.inc.php` (3.3) on `upstream/stable-3_4_0` and `upstream/stable-3_3_0` hold the same two lines. 3.3's PHP floor: `PHP_REQUIRED_VERSION` `7.3.0` in pkp-lib `stable-3_3_0`'s `PKPApplication.inc.php`.
- Introduced: the forward reached OPS through the merge 1c17cc2407 (`pkp/ojs#2457`), which both apps' histories hold; c38bc57418 (`pkp/pkp-lib#5430`, 2020) only renamed its variable. The `download` redirect with the number predates 8daac7a55a (`pkp/pkp-lib#5560`, 2020), which split it into the current and older-version cases. The OJS fixes are a412c7f2c1 (`pkp/ojs#2786`) and 783a8f75fb (`pkp/ojs#2657`); neither issue number appears in the OPS history.
- Way round (code): `getIdByUrlPath()` in pkp-lib's submission `DAO` matches `publications.url_path` only, so a cleared path matches nothing and `initialize()` answers "404 Not Found".
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ops and pkp/ui-library, issues and PRs, by the symptom's words ("urlPath redirect", "preprint download 404", "galley download redirect") and by `PreprintHandler`. `pkp/pkp-lib#7234` ("[OPS] Google Scholar indexing error") shows a `download/{number}/{galley}` address cut to `download/{number}` on a live server; the thread put it down to a deleted galley, a different path in `initialize()`, so it is not counted as this fault.
- Not walked: the version address whose id matches no galley (spec probe of 2026-09-25, not repeated today), and the Google Scholar and OAI-PMH addresses (code).
