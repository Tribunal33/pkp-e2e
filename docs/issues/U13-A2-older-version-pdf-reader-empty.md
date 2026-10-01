# Readers cannot open or download an older version's PDF: the PDF viewer stays empty at "0 of 0"

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pdfJsViewer#73` for `pkp/pkp-lib#10208` · [8e0a905](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6) · 2024-08-19 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A reader who opens an older version of an article or preprint and presses its "PDF" gets the PDF reader page with the notice "This is an outdated version published on {date}. Read the most recent version.", but the viewer under it stays empty, reading "0 of 0", with no message: the page's script fails because the file it asks for is not found. The reader's "Download" saves no file either, and the browser stays on the page.

The file itself is still stored, but no link on the reader's screens reaches it, so a reader cannot get the version they cite. The current version's PDF opens as usual.

It happens on every journal and preprint server that has published a new version of a submission. An older PDF galley escapes it only when the current version has a galley with the same URL Path that uses the very same file. Galleys have no URL Path by default, so in practice every older version's PDF is affected. A galley whose URL Path was kept but whose file in the new version is a separate upload is affected too.

## Impact

- **Lost**: readers' access to older versions' PDFs, not the files. Each file stays stored and downloads from its full address, the one with the version part, typed into the browser; no screen offers that address. Nobody is told.
- **Who**: every visitor, signed in or not, who opens an older version from the "Versions" list, or from a link or citation to that version, and presses "PDF".
- **Way round**: none for the reader. A manager can untick "PDF.JS PDF Viewer" in Settings › Website › Plugins: "PDF" then downloads the older version's file. The cost is that every PDF on the site downloads instead of opening in the page. Giving the older galley the current galley's URL Path is no remedy: it helps only while both galleys use one file.

High: the reader page loses what it is for and says nothing. The only way round costs the whole site its PDF viewer, and only a journal that knows of the fault would take it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`), OJS and OPS.
- OJS: submission 1, "Signalling Theory Dividends", has a published version 1 with a galley "PDF" (no URL Path) and an unpublished version 2 with a galley "PDF Version 2". The steps publish version 2.
- OPS: submission 3, "Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice", has two published versions, each with a galley "PDF" (no URL Path). Nothing to set up.

OJS:

1. Sign in as `dbarnes`.
2. Open submission 1, "Signalling Theory Dividends", and in the side menu under "Publication" open "Version of Record 1.1" (3.5: the "Publication" entry, which shows "Version: 2").
3. Press "Publish". In "Review Publishing Details" keep what is filled in ("Version of Record (VoR)", "Minor Revision", "Assign To Current/Back Issue", "Vol. 1 No. 2 (2014)") and press "Confirm" (3.5: no such window opens). In "Are you sure you want to publish this?" press "Publish".
4. Sign out.
5. Open the article's page, `/index.php/publicknowledge/article/view/1`.
6. Under "Versions", press the older entry, "{date} (Version of Record 1.0)" (3.5: "{date} (1)").
7. On the older version's page, press "PDF".
8. On the PDF reader page, press "Download".

OPS:

1. Signed out, open the preprint's page, `/index.php/publicknowledge/preprint/view/3`.
2. Under "Versions", press the older entry, "{date} (Author Original 1.0)" (3.5: "{date} (1)").
3. On the older version's page, press "PDF".
4. On the PDF reader page, press "Download".

**Expected**: the PDF reader page shows the notice "This is an outdated version published on {date}. Read the most recent version." over the older version's PDF, the viewer reading "1 of 1"; "Download" saves the PDF.

**Observed**: step 5 lands on `/index.php/publicknowledge/en/article/view/mwandenga`: once version 2 is published, its URL Path "mwandenga" becomes the article's address, and the site adds the language part. On the older version's reader the notice shows, and the viewer under it stays empty, its page box reading "0" and "of 0", with no message. The viewer's request for the file is redirected to an address without the galley and answers "404 Not Found" (OJS shown; OPS the same with `preprint/download/3/3/3`):

```
GET /index.php/publicknowledge/en/article/download/mwandenga/1/12   302 → /index.php/publicknowledge/en/article/download/mwandenga
GET /index.php/publicknowledge/en/article/download/mwandenga        404 Not Found
```

The page's console:

```
Failed to load resource: the server responded with a status of 404 (Not Found)
Missing PDF file. PDF.js v4.10.38 (build: f9bea397f) Message: Missing PDF "http://…/index.php/publicknowledge/en/article/download/mwandenga/1/12".
```

and an uncaught page error, `MissingPDFException`.

"Download" points at the same address: no file is saved and the browser stays on the reader page.

Control: the current version's "PDF", pressed on the article's own page, shows the document ("1 of 1"), and its "Download" saves it.

## Cause

`ArticleHandler::initialize()` (OJS `pages/article/ArticleHandler.php`, from line 110; the publication and galley lookup at lines 136–183) and `PreprintHandler::initialize()` (OPS) look a galley up only in the requested publication. An address without a version part requests the current publication. So an older version's galley needs the versioned address, `…/download/<article>/version/<publicationId>/<galley>/<file>`. Every other builder of a galley address follows that rule: the galley links (`templates/frontend/objects/galley_link.tpl`, versioned when the publication is not the current one), the HTML and eLife Lens readers, and OMP's `CatalogBookHandler::view()` for its own PDF reader.

`PdfJsViewerPlugin::submissionCallback()` (pkp/pdfJsViewer, `PdfJsViewerPlugin.php` lines 112–117) does not. It builds the viewer's file address as `[$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]` for every galley, with no version part. For an older version's galley, `initialize()` finds no galley of that ID in the current publication, finds it among the published versions' galleys, and redirects to `download/<article>` with no galley (line 178), which `download()` answers with `NotFoundHttpException` (line 515). pdf.js reports the 404 as an uncaught `MissingPDFException`. The reader's "Download" link (`templates/display.tpl`, line 52) carries the same address.

This worked before. In 2020 `pkp/pkp-lib#5560` ("Files for old versions don't load") added the version part to the plugin's `templates/submissionGalley.tpl` ([99ed217](https://github.com/pkp/pdfJsViewer/commit/99ed217b6cc245872c8614722baaa90a01d99f03)), under `{if $isLatestPublication}…{else}…{/if}`. [8e0a905](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6), for `pkp/pkp-lib#10208` (titles with rich formatting in the PDF viewer), moved the address building from that template into PHP and kept only the current-version branch. The plugin still computes `isLatestPublication`, but only for the notice.

Reach:

- An older galley whose URL Path the current version's galley also carries: the address finds the current galley, but it still names the older galley's file. `download()` (lines 531–555) answers 404 for a file that is neither the galley's own file nor a dependent or media file of it. So the older reader shows the right file while both galleys use one file, and stays empty once the current galley has a file of its own. It never shows the current version's file (code).
- The galley's address without a version part (what the reader's "Download" holds): redirected and 404 as above, walked. The versioned address downloads the file, walked.
- Issue galleys (`issueCallback()`): issues have no versions, not affected (code).
- OMP: its own PdfJsViewerPlugin, whose address `CatalogBookHandler::view()` builds with the version part (lines 470–474), not affected (code).
- Google Scholar's `citation_pdf_url` is left out on older versions, and the Crossref deposit uses the versioned address when DOI versioning is on (code).

## Proposed fix

Restore the version part in `PdfJsViewerPlugin::submissionCallback()` for a galley outside the current publication. Use the same condition as the old template and the galley links, the galley's publication not being the current one ([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/fix.diff); its paths start at the app root, so in the pdfJsViewer repository apply it with `git apply -p4`):

```php
$isLatestPublication = $submission->getData('currentPublicationId') === $galley->getData('publicationId');
$pdfUrl = $request->url(
    null,
    $submissionNoun,
    'download',
    $isLatestPublication
        ? [$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]
        : [$submission->getBestId(), 'version', $galley->getData('publicationId'), $galley->getBestGalleyId(), $galley->getFile()->getId()]
);
```

with `'isLatestPublication' => $isLatestPublication` in the template's variables. The current version's reader keeps its address without a version part. People bookmark that address, and EZproxy-style proxies rewrite it (`display.tpl`, line 64).

Tried on `main`, OJS and OPS: with the fix the older version's reader shows the document ("1 of 1") and "Download" saves the PDF; the current version's reader keeps its unversioned address and shows its document with the fix in and out.

**Alternatives**:

- Always add the version part, as the HTML and Lens readers do: works, but changes the current version's reader and download address for no gain.
- Let `ArticleHandler::initialize()` and `PreprintHandler::initialize()` serve an older galley found by ID instead of redirecting: changes the public address rules in two apps, and an address without a version is ambiguous once a URL Path repeats across versions.

**What goes with it**:

- No stored data to repair.
- The fix lands in pkp/pdfJsViewer; OJS and OPS take it with a submodule bump on `main` and `stable-3_5_0`, where the file is identical, so the backport applies as written. 3.4 and 3.3 still carry the 2020 template.
- Guard: the plugin has no unit tests; an end-to-end check that opens an older version's PDF reader and expects a page count above zero.

Small: a few lines in one method, with no data repair.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front). `PHASE=neighbour` in front runs only the current-version control. `PHASE=wayround` runs the way-round checks in Impact: the typed versioned address, then the viewer turned off.
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/older-version-pdf-reader-empty/fix.diff ojs ops`, then the walk and `PHASE=neighbour` with the fix in, and `PHASE=neighbour` again after `revert`.
- Tips walked or read: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73) (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc), pdfJsViewer [e69bf97c45](https://github.com/pkp/pdfJsViewer/commit/e69bf97c45)); OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6), pdfJsViewer e69bf97c45); 3.5: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62), pdfJsViewer [6d80e45119](https://github.com/pkp/pdfJsViewer/commit/6d80e45119)); 3.4: OJS [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b) (pdfJsViewer [7c80542b62](https://github.com/pkp/pdfJsViewer/commit/7c80542b62)); 3.3: OJS [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a), OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161) (pdfJsViewer [32334cb962](https://github.com/pkp/pdfJsViewer/commit/32334cb962)). Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL; the fault does not depend on the database.
- Introduced: `git blame` on `PdfJsViewerPlugin.php` lines 112–117 gives 8e0a905 (2024-08-19, merged 2024-12-07 through `pkp/pdfJsViewer#73`) and, for line 114, 5be5373 (2025-05-07, "pkp/pkp-lib#10208 Fix OJS-specific coding": `'article'` to `$submissionNoun`, without touching the version part). `git log -S` on the removed template line finds 99ed217 (2020-02-27, Nate Wright, `pkp/pkp-lib#5560`) adding it and 8e0a905 removing it.
- 3.5 (walked, and code): the plugin pointer 6d80e45 contains 8e0a905.
- 3.4 and 3.3 (code): the plugin at the pointer each app branch records (7c80542 and 32334cb, neither containing 8e0a905) builds `pdfUrl` in `templates/submissionGalley.tpl` with the `'version'` branch when `isLatestPublication` is false, and `PdfJsViewerPlugin.php` / `PdfJsViewerPlugin.inc.php` assign `isLatestPublication`; the apps' `ArticleHandler` and `PreprintHandler` accept the `version` part there.
- OMP: not walked (code read only, on `main` and 3.5).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/ui-library and pkp/pdfJsViewer, issues and PRs, by the symptom's words and by the class and method names. `pkp/pkp-lib#5560` is the 2020 report of this symptom, closed with the fix 8e0a905 later removed; `pkp/pkp-lib#11368` was the current-version reader on OPS, a different cause.
- Not walked: the URL Path case in the reach (code read only). Unrelated to this fault: on the test installs, the Plugins page's "Plugin Gallery" list answers 500 because pkp.sfu.ca is unreachable from them.
