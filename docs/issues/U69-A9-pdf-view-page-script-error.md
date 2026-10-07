# A press's PDF view page logs a script error, "PDFJS is not defined", every time it opens

- **Severity** low
- **Effort** small
- **Kind** defect
- **Crash** script
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** commit for `pkp/pkp-lib#4749` · [02393cf8bf](https://github.com/pkp/omp/commit/02393cf8bff54d166d9447492601986ee0fc3eb0) · 2019-05-13 · Alec Smecher (asmecher)
- **Upstream** `pkp/pkp-lib#6425` (closed after the fix for its own fault, another one; its comments note this error, which was left)
- **Tracked in** spec U69 [A23](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a23)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

**Update 2026-10-07.** The book file download that failed on `main`
beside this error was fixed by `pkp/pkp-lib#13444` (2026-10-05); this
error is not touched by it. Observed, the fix's trial and Evidence now
say so, and the kept walk is the one of that fault's closed report.

## Summary

The page's own script fails each time a reader opens a book's PDF on a
press: the browser console shows "PDFJS is not defined". The reader
sees nothing of it. The viewer on the page is a separate frame and
shows the PDF, and "Download" saves it.

The page also loads and runs the PDF library's two scripts
(`build/pdf.js`, 385 KB, and `web/viewer.js`, 361 KB) outside the
viewer's frame, where nothing uses them. The error adds noise for
anyone watching a press's pages for script failures.

It happens on every PDF view page while "PDF.js PDF Viewer" is on, as
it is by default.

## Impact

- **Lost.** Nothing a reader notices. The two scripts named above are
  parsed and run a second time on the outer page; they have the same
  addresses as the ones the viewer's frame loads, so the browser can
  reuse its copy.
- **Who.** Every reader who opens a book's PDF; a developer or a
  monitoring tool reading the console.
- **Way round.** None needed.

Low: nothing is lost and the PDF is shown and downloaded.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OMP.
- Book 5, "Bomb Canada and Other Unkind Remarks in the American
  Media", has a free "PDF" file under its chapter "Epilogue".

Signed out:

1. Open the browser's console.
2. Open "Catalog" and press "Bomb Canada and Other Unkind Remarks in
   the American Media"
   (`/index.php/publicknowledge/en/catalog/book/5`).
3. Under "Chapters", press "PDF" in the "Epilogue" row.

**Expected.** The page "PDF view of the file epilogue.pdf" opens with
no script error.

**Observed.** The page opens, and the console shows an uncaught error
from the page's inline script:

```
Uncaught ReferenceError: PDFJS is not defined
```

On 3.5 this is the only error: the viewer below shows the PDF ("of 1")
and "Download" saves `epilogue.pdf`. On `main` the walk also saw the
file request answer 500 and the viewer stay empty, a separate fault
since fixed by `pkp/pkp-lib#13444`. With that one-line fix in, `main`
behaved as 3.5 does and the console error stayed.

## Cause

OMP's own copy of the viewer plugin
(`plugins/generic/pdfJsViewer/templates/display.tpl`, lines 51–75)
loads `pdf.js/build/pdf.js` into the view page and runs an inline
script that calls `PDFJS.workerSrc = …` and `PDFJS.getDocument(…)` to
draw the first page on a canvas with the id `pdfCanvas`. Then it loads
`pdf.js/web/viewer.js`.

The PDF.js library has defined no `PDFJS` global since its version 2.
02393cf8bf updated the plugin's library to v2.0.943 and left the inline
script, so the script has thrown this error at its first line since
then.

The block never worked. The commit that wrote the plugin's template
([749f84f7db](https://github.com/pkp/omp/commit/749f84f7dbdeece4733ebf4ee58ebb406a2c6203),
2017) already had the block and no `pdfCanvas` element, and no later
version has one. While the library still had `PDFJS`, the block would
have failed on the missing canvas instead. Introduced names where
today's message began.

What shows the PDF is the frame, whose address is
`pdf.js/web/viewer.html?file=…` (written in the template itself in
2017, set by the template's last script today). That page loads the
library and the viewer for itself.

Reach:

- **Every PDF view page of a press** (on screen, `main` and 3.5; code,
  3.4 and 3.3, where the same two lines call `PDFJS`). The library is
  v2.6.347 on all four.
- **OJS and OPS** (code): their viewer plugin is the shared
  pkp/pdfJsViewer, whose `display.tpl` has only the frame script.

## Proposed fix

Remove the unused block from OMP's `display.tpl`: the `build/pdf.js`
include, the inline `PDFJS` script and the `viewer.js` include. The
frame script stays, which is all that OJS's and OPS's template has
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-view-page-script-error/fix.diff)):

```diff
--- a/plugins/generic/pdfJsViewer/templates/display.tpl
+++ b/plugins/generic/pdfJsViewer/templates/display.tpl
@@ -48,31 +48,6 @@
 	</header>
 
-	<script type="text/javascript" src="{$pluginUrl}/pdf.js/build/pdf.js"></script>
-	<script type="text/javascript">
-		{literal}
-			$(document).ready(function() {
-				PDFJS.workerSrc='…';
-				PDFJS.getDocument('…').then(function(pdf) {
…
-	</script>
-	<script type="text/javascript" src="{$pluginUrl}/pdf.js/web/viewer.js"></script>
 	<script type="text/javascript">
 		// Creating iframe's src in JS instead of Smarty so that EZProxy-using sites can find our domain in $pdfUrl and do their rewrites on it.
```

Nothing on the outer page uses the removed scripts: its only other
script sets the frame's address with jQuery.

Tried alone on OMP `stable-3_5_0`: the view page logged no script
error, the viewer showed the PDF ("of 1"), and the page's "Download",
the viewer's own download button and the link with the viewer off each
saved `epilogue.pdf`. On OMP `main` it was tried together with the
one-line download fix that `pkp/pkp-lib#13444` has since made, so that
the file request answers, and showed the same.

- **Alternatives.** Rewriting the inline script for the library's
  current name (`pdfjsLib`) would draw a page nobody sees: there is no
  canvas for it, and the frame's viewer already shows the document.
  Replacing OMP's copy of the plugin with the shared pkp/pdfJsViewer
  would remove the duplicate for good, but that is a larger change and
  a decision for the team.
- **What goes with it.** No data is involved. The same lines are in
  3.5, 3.4 and 3.3 (two lines higher on 3.4 and 3.3), so the diff's
  content applies there if the team wants it. The guard is an e2e check
  that the PDF view page opens with no script error (spec U69, a
  **Planned** item).

Small: one block removed from one template.

## Evidence

- The kept script is
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-view-page-script-error/walk.js),
  the walk of the download fault's closed report
  ([pkp-e2e#282](https://github.com/jardakotesovec/pkp-e2e/issues/282))
  kept here: its steps 1 to 3 are the steps here, and it records the
  page's script errors after them. Run it on an install freshly loaded
  from the default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js omp shared/playwright/checks/issues/pdf-view-page-script-error/walk.js`.
- The fix was tried with
  `PKP_E2E_LINE=stable-3_5_0 node bin/try-fix.js apply shared/playwright/checks/issues/pdf-view-page-script-error/fix.diff omp`
  and the walk, then reverted. On `main` it was applied joined in one
  file with the one-line download fix (the change `pkp/pkp-lib#13444`
  has since made). With that fix alone, the walk on `main` still
  recorded "PDFJS is not defined".
- Walked on OMP `main` and `stable-3_5_0`, on PostgreSQL; nothing here
  depends on the database. Datasets: pkp/datasets 92050d9 (2026-10-01).
- Tips: OMP `main` 3b0ecf794, `stable-3_5_0` b24879c3d, `stable-3_4_0`
  0aec65441, `stable-3_3_0` 8e72fc883.
- Code reads:
  - Each branch's `plugins/generic/pdfJsViewer/templates/display.tpl`
    for the two `PDFJS.` lines, and `pdf.js/build/pdf.js` for a
    `PDFJS` global (none; the version constant reads 2.6.347 on 3.4 and
    3.3).
  - `pdf.js/build/pdf.js` at 02393cf8bf's parent names `PDFJS` on 92
    lines. At 02393cf8bf and today the file names it once, in an
    element id (`PDFJS_FONT_STYLE_TAG_`): no `PDFJS` global.
  - The frame's `pdf.js/web/viewer.html` loads `../build/pdf.js` and
    `viewer.js`, the same two addresses the outer page loads. The
    walk's record does not hold these requests, so the reuse of the
    browser's copy was not observed.
  - OJS's `plugins/generic/pdfJsViewer/templates/display.tpl`.
- Tracker search (2026-10-01): the pkp organisation for "PDFJS is not
  defined". `pkp/pkp-lib#6425` ("Displaying the catalog's file fails",
  OMP 3.3, opened 2020-12, closed) fixed backslashes in the plugin's address on
  Windows; two of its comments say this console error remains "with no
  obvious consequences".
