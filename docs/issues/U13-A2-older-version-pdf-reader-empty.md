# An older version's PDF opens a reader with no document, and its "Download" gets no file

- **Severity** high
- **Effort** small
- **Kind** regression
- **Crash** script
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pdfJsViewer#73` for `pkp/pkp-lib#10208` · [8e0a90541a](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6) · 2024-08-19 (merged 2024-12-07) · Hafsa-Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An older version's page lists that version's galleys. Its PDF link
opens the PDF reader page with the outdated-version notice, but the
viewer shows no document: an empty page reading "0 of 0", with no
message. The reader page's "Download" gets no file either, and the
browser stays on the reader page.

A reader who wants the version they cite cannot read or download its
PDF, and the page offers no other link to it. The older version's
other galleys (HTML, other files) still open. An editor who previews a
new, unpublished version gets the same empty viewer for its PDF.

It happens on every article or preprint with more than one version
while the "PDF.JS PDF Viewer" plugin is on, as it is by default. A
press's books are not affected: their PDF reader asks for the file of
the version shown.

## Impact

- **Lost.** No data. Readers lose access to older versions' PDFs. They
  are told nothing, and nobody on the journal is told either.
- **Who.** Any reader who reaches an older version from its "Versions"
  list, a citation or an index. Publishing a new version is an
  ordinary editor action on `main` and 3.5.
- **Way round.** None for a reader. A manager can switch off "PDF.JS
  PDF Viewer": the PDF link then downloads the right file, but no
  article has a PDF reader page any more.

High: a core task, reading what is published, fails for older
versions with no way round, in a setup that is ordinary but not the
default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS or OPS.
- OPS needs nothing more. Preprint 3, "Computer Skill Requirements for
  New and Existing Teachers: Implications for Policy and Practice",
  already has two posted versions, and each one has a "PDF" galley.
- OJS: article 1, "Signalling Theory Dividends", has a published
  version 1.0 and an unpublished version 1.1, and each one has a "PDF"
  galley. Steps 1 to 3 publish 1.1, which makes 1.0 an older version.

OJS only, publishing version 1.1:

1. Sign in as `dbarnes` and open submission 1, "Signalling Theory
   Dividends". The workflow opens on version 1.1.
2. Press "Publish". In "Review Publishing Details" keep what is
   preselected (Publication Stage "Version of Record (VoR)", the issue
   Vol. 1 No. 2 (2014)) and press "Confirm". Then press "Publish" under
   "Are you sure you want to publish this?". [3.5: "Publish", then
   "Publish" in the window.]
3. Sign out.

Both apps, signed out:

4. Open the article page (`/index.php/publicknowledge/article/view/mwandenga`)
   or the preprint page (`/index.php/publicknowledge/preprint/view/3`).
5. Under "Versions", press the older version: "{date} (Version of
   Record 1.0)" on the journal, "{date} (Author Original 1.0)" on the
   server ("{date} (1)" on 3.5). The page shows "This is an outdated
   version published on {date}. Read the most recent version."
6. Press "PDF".
7. Look at the viewer.
8. Press "Download" in the reader page's bar.

**Expected.** The viewer shows version 1.0's PDF ("1 of 1"), and
"Download" saves that file.

**Observed.** The PDF reader page opens with the title "The Signalling
Theory Dividends" (on the server, the preprint's title) and the
notice "This is an outdated version published on 2026-09-30. Read the
most recent version." The viewer is empty and its page box reads "0 of
0". No message is shown. The viewer's file request is forwarded to the
article's address with no galley, which answers 404:

```
GET /index.php/publicknowledge/en/article/download/mwandenga/1/12   302
GET /index.php/publicknowledge/en/article/download/mwandenga        404 Not Found
GET /index.php/publicknowledge/en/preprint/download/3/3/3           302
GET /index.php/publicknowledge/en/preprint/download/3               404 Not Found
```

The page's script then fails with an uncaught `MissingPDFException`
("Missing PDF file. … PDF.js v4.10.38"). "Download" points at the same
address: the browser starts a download, cancels it on the 404, and stays
on the reader page.

Control: the current version's "PDF" opens the PDF reader page on its
document ("1 of 1"), and its "Download" saves `article.pdf` (on the
server, the preprint's file).

Previewing an unpublished version (OJS, on a freshly loaded dataset,
before step 2):

1. Sign in as `dbarnes` and open submission 1. The workflow opens on
   version 1.1.
2. Press "Preview".
3. Press "PDF Version 2".

**Observed.** The same empty viewer, "0 of 0". The file request
`…/article/download/mwandenga-signalling-theory/pdf/12` answers 404 at
once, without a redirect, because the galley is not found. The PDF
reader page also shows "This is an outdated version published on
2026-09-30. Read the most recent version." That notice is a separate
fault, covered under "reach" in
[pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209), and
this fix does not touch it.

## Cause

`PdfJsViewerPlugin::submissionCallback()` (pkp/pdfJsViewer,
`PdfJsViewerPlugin.php` lines 112–117, shared by OJS and OPS) builds
the viewer's file address, and the bar's "Download" address, without a
version part, whichever version the galley belongs to:

```php
$pdfUrl = $request->url(null, $submissionNoun, 'download',
    [$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]);
```

`ArticleHandler::initialize()` (OJS) and `PreprintHandler::initialize()`
(OPS) treat an address without a version as one for the current
publication, and look the galley up only among that publication's
galleys. An older version's galley is not there. The "Redirect to the
most recent version" loop (`ArticleHandler.php` line 170,
`PreprintHandler.php` line 146) then sends the request to
`download/{article}`, which names no galley, and `download()` answers
404.

Until that change, `templates/submissionGalley.tpl` built the address
and added `'version', $galleyPublication->getId()` for an older
publication. That was the fix for `pkp/pkp-lib#5560` ("Files for old
versions don't load",
[99ed217b6c](https://github.com/pkp/pdfJsViewer/commit/99ed217b6cc245872c8614722baaa90a01d99f03),
2020). For `pkp/pkp-lib#10208` (rich-formatted titles in the PDF
reader), 8e0a90541a moved that work into PHP. The notice still checks
which version the galley belongs to (`isLatestPublication`, line 141),
but the file address no longer does.

Reach:

- **An unpublished version's preview** (on screen, OJS): see the second
  group of steps. A draft's galley is in no published version, so the
  lookup finds nothing.
- **A galley whose URL Path is the same in both versions** (code, and
  the spec's walk of 2026-09-25, not repeated today): the address
  without a version finds the current version's galley. The older
  version's PDF reader page then shows the current version's file under
  the outdated notice. The two are the same file only until an editor
  replaces the current galley's file, since a new version's galley
  starts out sharing the published one's file (spec U46
  [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U46-galleys.md#a4)).
- **Other galleys and readers** (code) build an address with the
  version: OJS's HTML reader (`htmlArticleGalley/templates/display.tpl`)
  and Lens reader (`lensGalley/templates/articleGalley.tpl`), the galley
  links (`frontend/objects/galley_link.tpl`), the download redirect for
  any other file in `ArticleHandler::view()` and
  `PreprintHandler::view()`, Crossref's resource addresses, and OMP's
  file reader (`CatalogBookHandler::download()`, lines 470–476). Google
  Scholar's `citation_pdf_url` is written only on the current version's
  page. Issue galleys (`issueCallback()`) have no versions.

## Proposed fix

In `PdfJsViewerPlugin::submissionCallback()`, add the version part to
the file address when the galley's publication is not the current one,
the way the HTML and Lens readers do. Compute the check once and pass
the same value to the template
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/fix.diff),
the same for OJS and OPS):

```diff
+            $isLatestPublication = $submission->getData('currentPublicationId') === $galley->getData('publicationId');
             $pdfUrl = $request->url(
                 null,
                 $submissionNoun,
                 'download',
-                [$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]
+                $isLatestPublication
+                    ? [$submission->getBestId(), $galley->getBestGalleyId(), $galley->getFile()->getId()]
+                    : [$submission->getBestId(), 'version', $galley->getData('publicationId'), $galley->getBestGalleyId(), $galley->getFile()->getId()]
             );
…
-                'isLatestPublication' => $submission->getData('currentPublicationId') === $galley->getData('publicationId'),
+                'isLatestPublication' => $isLatestPublication,
```

The address starts with `$submission->getBestId()`, the current
version's URL Path or the number, and not the old template's `$bestId`,
the older version's URL Path. `initialize()` redirects any other first
part to `getBestId()`. On a server that redirect also drops the
`version` part (`PreprintHandler::initialize()` replaces the second
argument), so the address would land on the current version again.

The diff's paths start at the app's own folder
(`plugins/generic/pdfJsViewer/…`). For a pkp/pdfJsViewer PR, remove
that prefix (`patch -p4`).

Tried on OJS and OPS `main`:

- Steps 4 to 8 showed version 1.0's PDF ("1 of 1") from
  `…/download/mwandenga/version/1/1/12` and `…/download/3/version/3/3/3`,
  and "Download" saved it.
- The preview's PDF showed as well.
- The current version's PDF reader page kept its address and its
  document.
- No script error was recorded.

- **Alternatives.** Making the handlers search older versions for a
  galley when the address has no version would be wrong: such an
  address means the current version, and two versions can share a
  galley ID or URL Path. Restoring `submissionGalley.tpl` would bring
  back the plain-text title that `pkp/pkp-lib#10208` replaced.
- **What goes with it.** No stored data changes, and the current
  version's address stays the same. The plugin needs a release, then
  submodule bumps in OJS and OPS. The same diff applies to
  `stable-3_5_0`, where the file is identical; 3.4 and 3.3 need
  nothing. The guard is an e2e check: the older version's PDF reader
  page shows a page and its "Download" saves the file (spec U13,
  scenario 3, a **Planned** item). The same change also dropped the
  long date format from the notice ("2026-09-30" here, "September 30,
  2026" in the HTML reader). That is a separate wording fix and is not
  in this diff.

Small: a few lines in one method.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js),
  takes steps 1 to 8 and the control.
  [reach.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/reach.js)
  takes the preview steps on OJS.
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-pdf-reader-empty/lib.js)
  holds their helpers. Run each script on an install freshly loaded from
  the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-pdf-reader-empty/walk.js`
  (`ojs …/reach.js`).
- The fix was tried with `node bin/try-fix.js apply …/fix.diff ojs`
  (then `ops`) and the two scripts, then reverted. The control and the
  preview are the checks that show the fix reaches no further than it
  should.
- Walked on `main` and `stable-3_5_0`, OJS and OPS, on PostgreSQL. Nothing
  here depends on the database (MySQL not checked). Datasets: pkp/datasets
  38ab955 (2026-09-30). The 3.5 walk saw the same, apart from the
  bracketed step names. reach.js was walked on `main` only. OMP was
  read in the code only.
- Tips:

  | Line | OJS | OPS | pdfJsViewer |
  |---|---|---|---|
  | `main` | bade233f73 (lib/pkp 2e377d27fc) | c8af945bb7 (lib/pkp 3dc90c81a6) | e69bf97c45 |
  | `stable-3_5_0` | 92b9a16b48 | cf4fce69bd | 6d80e45, `PdfJsViewerPlugin.php` identical to `main`'s |
  | `stable-3_4_0` | 9571d8fde7 | acd8ae704b | 7c80542b62 |
  | `stable-3_3_0` | 9fdb9bcf9a | c5532e2161 | 32334cb962 |
- Code reads:
  - 3.4 and 3.3: the app's `plugins/generic/pdfJsViewer` pointer, then
    that commit's `PdfJsViewerPlugin.php` (`.inc.php` on 3.3) and
    `templates/submissionGalley.tpl`. Neither commit contains
    8e0a90541a, and both templates add `'version'` for an older
    publication.
  - `main` and 3.5: `ArticleHandler::initialize()`, `view()` and
    `download()`, and `PreprintHandler::initialize()` and `view()`.
  - The plugin commit is first in tag `3_5_0-0`.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/pdfJsViewer, pkp/ojs,
  pkp/ops and pkp/ui-library, by symptom ("pdf outdated version",
  "pdf viewer previous version", "Missing PDF", "galley version pdf
  404") and by the plugin's name. `pkp/pkp-lib#11368` (OPS 3.5 RC2,
  every PDF blank) is a different fault, closed in May 2025.
