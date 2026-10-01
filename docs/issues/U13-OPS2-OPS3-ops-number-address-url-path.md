# A preprint with a URL Path: its HTML and other non-PDF galleys answer "404 Not Found", old ID links misdirect

- **Severity** high
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OPS
  - 3.5: OPS
  - 3.4: OPS (code)
  - 3.3: OPS (code)
- **Introduced** `pkp/pkp-lib#5430` · [c38bc57418](https://github.com/pkp/ops/commit/c38bc5741808db7118b4e68db1d6e549d2190ac5) · 2020-02-13 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#5575`, `pkp/pkp-lib#5954` and `pkp/pkp-lib#7138` (closed, each fixed in OJS only; the fixes never reached OPS)
- **Tracked in** spec U13 [OPS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops2), [OPS3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops3); spec U20 [OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U20-search-engine-metadata-and-analytics.md#ops1)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

Once a preprint has a URL Path, a reader who presses the link of an
HTML galley, or of any other galley that downloads rather than opening
in a reader, gets "404 Not Found" instead of the file. A PDF still opens
in the PDF reader, and that reader's "Download" works.

The same URL Path breaks the preprint's ID addresses (those that use its
ID instead of the URL Path) when they go on to a version or a galley.
The address of version 1.0 shows the current version's page with no
"outdated version" notice, so a reader following a citation of 1.0
reads 2.0 without being told. Where the version's ID matches none of
the preprint's galley IDs, that address answers "404 Not Found"
instead. A galley's ID address opens the preprint's page.

A URL Path on a galley breaks that galley's own ID address, which
answers "404 Not Found", so a link shared before the URL Path was set
stops working.

## Impact

- **Lost.** Every download of those galleys, and a correct page for
  older links to a version or a galley: bookmarks, citations, index
  entries and Google Scholar's HTML address. Nobody on the server is
  told.
- **Who.** Readers, signed in or not, of any preprint whose current
  version has a URL Path and a galley no reader opens. That is an
  ordinary upload: an HTML file, a data set, a Word file; also a PDF
  when the "PDF.JS PDF Viewer" plugin is off. And anyone following an ID
  address made before a URL Path was set.
- **Way round.** None for readers. The server's manager or moderator
  can clear "URL Path", which gives up the address they chose. The
  broken links stay broken for as long as the URL Path is set.

High: readers cannot download a published file, with no way round, on
every server that uses URL Paths for preprints with non-PDF galleys; and
an older link can show another version silently. It would be critical
if most servers set URL Paths.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for OPS `main`, freshly loaded. Submission
  3, "Computer Skill Requirements for New and Existing Teachers:
  Implications for Policy and Practice", is posted in two versions,
  "Author Original 1.0" (version ID 3, galley "PDF" ID 3) and "Author
  Original 2.0" (version ID 4, galley "PDF" ID 4). It has no URL Path.
- Steps 2 to 5 add what the dataset lacks: a URL Path on the preprint and
  on its "PDF" galley, and a galley that is not a PDF (the dataset's
  galleys are all PDFs).

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open submission 3's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=3`.
   It opens on "Author Original 2.0".
3. Under "Preprint", open "Preprint entry", type `u13ir2-path` in "URL
   Path" and press "Save".
4. Open "Galleys". On "PDF", choose "More Actions" › "Edit", type
   `u13ir2-pdf` in "URL Path" and press "Save".
5. Press "Add galley", type `HTML` in "Galley Label" and press "Save".
   In the upload window choose "Preprint Text", upload an HTML file,
   then press "Continue", "Continue" and "Complete".
6. Sign out. Open `/index.php/publicknowledge/preprint/view/3`, the
   preprint's ID address. The browser lands on
   `…/en/preprint/view/u13ir2-path`, the preprint's page, as expected.
7. Press the galley link "HTML" (`…/en/preprint/view/u13ir2-path/21`).
8. Open `/index.php/publicknowledge/preprint/view/3/version/3`, the ID
   address of "Author Original 1.0".
9. Open `/index.php/publicknowledge/preprint/view/3/4`, the ID address
   of the "PDF" galley.
10. Open `/index.php/publicknowledge/preprint/view/u13ir2-path/4`, the
    "PDF" galley's ID after the preprint's URL Path.

**Expected:** step 7 downloads the HTML file. Step 8 lands on
`…/en/preprint/view/u13ir2-path/version/3`, "Author Original 1.0" under
"This is an outdated version …". Steps 9 and 10 land on
`…/en/preprint/view/u13ir2-path/u13ir2-pdf`, the PDF reader.

**Observed:**

- Step 7 downloads nothing; the browser lands on "404 Not Found":
  ```
  302 …/en/preprint/view/u13ir2-path/21
  302 …/en/preprint/download/3/21
  404 …/en/preprint/download/u13ir2-path
  ```
- Step 8 is forwarded to `…/en/preprint/view/u13ir2-path/3` and from
  there to `…/en/preprint/view/u13ir2-path`: the page of "Author
  Original 2.0", with no outdated-version notice.
- Step 9 lands on `…/en/preprint/view/u13ir2-path`, the preprint's page,
  not the PDF reader.
- Step 10 answers "404 Not Found" at
  `…/en/preprint/view/u13ir2-path/4`.

The "PDF" link on the page (`…/view/u13ir2-path/u13ir2-pdf`) opens the
PDF reader, and its "Download"
(`…/en/preprint/download/u13ir2-path/u13ir2-pdf/3`) downloads the PDF.
On a journal (OJS, the same dataset), submission 1 already has the URL
Path `mwandenga-signalling-theory`, and
`/index.php/publicknowledge/article/view/1/1` lands on
`…/en/article/view/mwandenga-signalling-theory/1`, the PDF reader.

## Cause

`PreprintHandler::initialize()` (ops `pages/preprint/PreprintHandler.php`)
handles every `preprint/view` and `preprint/download` address. It is
OPS's copy of OJS's `ArticleHandler::initialize()`, and three fixes OJS
made to the same address forwarding never reached it.

1. **The rest of the address is overwritten (lines 109–112).** When the
   address's first part is not the preprint's current URL Path, the
   handler forwards to `$newArgs = $args; $newArgs[0] = $currentUrlPath;`.
   `$args` has already had the ID shifted off (line 92), so
   `$newArgs[0]` is the *next* part, the galley or `version`, and the
   URL Path replaces it. `…/view/3/4` becomes `…/view/u13ir2-path`, and
   `…/view/3/version/3` becomes `…/view/u13ir2-path/3`. That address
   reads `3` as a galley: here it is also the ID of the older version's
   PDF galley, so the handler forwards to the preprint's page (lines
   149–157); a version ID that is no galley ID of the preprint answers
   404. OJS fixed this line for `pkp/pkp-lib#5954` (pkp/ojs
   [a412c7f2c1](https://github.com/pkp/ojs/commit/a412c7f2c1ad4a4480b9e34563e78e50a840093a),
   2020-06-02, now `[$currentUrlPath, ...$args]`).
2. **Every download of the current version goes through that line
   (lines 347–350).** `PreprintHandler::view()` first sends a remote
   galley to its address (lines 307–309). It then hands a galley to
   the `PreprintHandler::view::galley` hook, where a reader plugin may
   take it: "PDF.JS PDF Viewer" takes a PDF. Any galley that serves an
   uploaded file and that no reader plugin takes (an HTML file, any
   non-PDF file; a PDF too when that plugin is off) is sent to
   `download` with `$preprint->getId()` rather than `getBestId()`. So
   once the preprint has a URL Path, `…/download/3/21` is forwarded to
   `…/download/u13ir2-path`, which has no galley: 404. OJS fixed this
   for `pkp/pkp-lib#5575` (`pkp/ojs#2657`, 2020-03-02). The PDF
   reader's own "Download" is built with `getBestId()`
   (`PdfJsViewerPlugin.php` line 116) and does not pass through it.
3. **No forwarding from a galley's ID (lines 138–145).** The galley is
   looked up by `getBestGalleyId()` alone, which is its URL Path once
   one is set, so its ID matches nothing and the handler answers 404.
   OJS added the `elseif (ctype_digit($galleyId) && $galley->getId()
   == $galleyId)` redirect for `pkp/pkp-lib#7138` (pkp/ojs
   [e6cee7d19d](https://github.com/pkp/ojs/commit/e6cee7d19d6c902415ac335acdeef7e098caf3b0),
   2021-07-14).

The line in point 1 took its present shape in
[c38bc57418](https://github.com/pkp/ops/commit/c38bc5741808db7118b4e68db1d6e549d2190ac5)
(`pkp/pkp-lib#5430`, splitting the URL Path from the publisher ID). That
change made an ID address forward to the URL Path, and kept the
`$newArgs[0]` replacement OPS had copied from OJS's versioning work.

Reach:

- An older version's galley links already use `getBestId()` (view()
  lines 340–345; code).
- The Google Scholar tag `citation_fulltext_html_url`
  (`GoogleScholarPlugin.php` line 208) names `…/view/{URL Path}/{galley}`,
  the address of step 7, so it leads to the same 404 (U20 OPS1; code).
- A download ID address (`…/download/3/4/3`, what an index may hold
  from before the URL Path was set) is forwarded with the galley
  replaced by the file ID (code, not walked).
- OJS and OMP: OJS's `ArticleHandler` carries all three fixes (code;
  the control walk shows the first). OMP's `CatalogBookHandler` does not
  forward an ID address to a URL Path, so it has no such surface.

## Proposed fix

Recommended: port OJS's three fixes into `PreprintHandler`
(`pages/preprint/PreprintHandler.php`;
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-number-address-url-path/fix.diff)):

```php
// initialize(), lines 109–112: keep the rest of the address
if ($currentUrlPath && $currentUrlPath != $urlPath) {
    $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), [$currentUrlPath, ...$args]);
}

// initialize(), the galley foreach: forward a galley's ID to its URL Path
foreach ($galleys as $galley) {
    if ($galley->getBestGalleyId() == $galleyId) {
        $this->galley = $galley;
        break;

        // In some cases, a URL to a galley may use the ID when it should use
        // the urlPath. Redirect to the galley's correct URL.
    } elseif (ctype_digit((string) $galleyId) && $galley->getId() == $galleyId) {
        $redirectArgs = $subPath === 'version'
            ? [$submission->getBestId(), 'version', $this->publication->getId(), $galley->getBestGalleyId()]
            : [$submission->getBestId(), $galley->getBestGalleyId()];
        $request->redirect(null, $request->getRequestedPage(), $request->getRequestedOp(), [...$redirectArgs, ...$args]);
    }
}

// view(), lines 347–350: send a download to the preprint's URL Path
$redirectArgs = [
    $preprint->getBestId(),
    $this->galley->getBestGalleyId()
];
```

Tried on `main`: the Steps' Expected held. Neighbour checks: another
preprint's galley ID after this URL Path still answers 404, and a
preprint without a URL Path still opens a galley at its ID address. On
a preprint with a URL Path, `…/view/3/nosuchgalley` now answers 404
instead of the preprint's page.

The rule lives in the handler that owns these addresses, and the fix
follows its OJS twin line for line, except that the galley redirect
keeps a `version/{id}` part and a trailing file ID.

Left out: an older version's galley that has a URL Path of its own,
opened by its galley ID without the version part. The ID redirect looks
only at the shown version's galleys, and the outdated-galley loop
matches URL Paths, so that address still answers 404 (code, not
walked).

**Alternatives:**

- Changing only `view()` (point 2) fixes the download links but leaves
  every older ID address broken.
- Moving the forwarding into a shared pkp-lib class for both apps is the
  lasting cure for copies that drift apart, but it is a refactor of two
  handlers that differ elsewhere (issues, preview rules). It suits
  `pkp/pkp-lib#5932`'s alignment of the apps' addresses better than a
  bug fix.

**What goes with it:**

- No stored data changes; only redirects.
- A backport applies as written to 3.5 and 3.4. 3.3 has the same lines
  in `PreprintHandler.inc.php` but supports PHP 7.3, which lacks `...`
  in array literals: use `array_merge()` there, as OJS 3.3 does.
- The guard: an e2e scenario in U13: a preprint with a URL Path, its
  non-PDF galley link, and its ID addresses with a galley and a version
  part.

Small: a few lines in one OPS handler, copying a pattern OJS already
uses, with no data repair.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/ops-number-address-url-path/walk.js)
  takes the Steps on OPS (with the PDF reader's "Download") and the OJS
  control, on an install freshly loaded from the default dataset, then
  three neighbour checks:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/ops-number-address-url-path/walk.js`.
  The fix was tried with `node bin/try-fix.js apply …/fix.diff ops`, the
  same script, then `revert`.
- Walked on `main` and `stable-3_5_0` (OJS and OPS), PostgreSQL;
  nothing here depends on the database. Datasets: pkp/datasets fetched
  at 38ab955 (2026-09-30), which is also the last commit to change
  `ops/main/pgsql` and `ops/stable-3_5_0/pgsql`. The PDF reader's
  "Download" was walked on `main` only; 3.5's `PdfJsViewerPlugin` builds
  it the same way (line 116).
- Tips: OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6), OJS `main`
  bade233f73 (lib/pkp 2e377d27fc); OPS `stable-3_5_0` cf4fce69bd
  (lib/pkp a9c76aed62), OJS `stable-3_5_0` 92b9a16b48; OPS
  `stable-3_4_0` acd8ae704b; OPS `stable-3_3_0` c5532e2161.
- Code reads: `PreprintHandler::initialize()` and `view()` on each
  line. 3.5 and 3.4 (`PreprintHandler.php`) and 3.3
  (`PreprintHandler.inc.php`) have the `$newArgs[0] = $currentUrlPath`
  replacement, no galley-ID redirect and the `getId()` download
  redirect. OJS's `ArticleHandler` on `main` for the three fixes; OMP's
  `CatalogBookHandler::initialize()` for the absence of forwarding.
- Introduced: `git log -S'$newArgs[0] = $currentUrlPath'` in ops points
  at c38bc57418, which has no PR on GitHub (commit author named). The
  replacement pattern itself came from OJS's versioning prototype
  (`pkp/pkp-lib#2072`, pkp/ojs 88aba9a0cb, 2019-06-26), and every OPS
  release contains c38bc57418 (first tag `3_2_0-1`), hence "defect".
  OJS's own copy of that change (pkp/ojs 1ce90f959d, `pkp/ojs#2626`)
  was corrected by a412c7f2c1.
- Upstream search 2026-10-01, pkp/pkp-lib, pkp/ops and pkp/ui-library,
  by "preprint url path redirect", "galley 404", "urlPath",
  "PreprintHandler": `pkp/pkp-lib#5575` (OJS's download redirect; a
  maintainer asked in it whether it had been ported to OPS, unanswered),
  `#5954` and `#7138` are the OJS fixes named in the Cause.
  `pkp/pkp-lib#7234` (an OPS download 404) is about a deleted galley,
  not this fault.
- Unverified (OJS, code, not walked): OJS's galley-ID redirect
  (`ArticleHandler.php` line 167) drops a `version/{id}` part, so an
  older version's galley reached by its ID lands on the current version.
- Not driven: the `citation_fulltext_html_url` tag and a download ID
  address with a file ID (code, Cause); a PDF with the PDF viewer plugin
  off (code); OMP (no surface); 3.4 and 3.3.
