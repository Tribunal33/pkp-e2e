# Screen readers announce a journal article's PDF reader arrow as "Return to Issue Details", but it opens the article

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pdfJsViewer#73` for `pkp/pkp-lib#10208` · [8e0a905](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6) · 2024-08-19 · Hafsa Naeem (Hafsa-Naeem)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs6)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

On a journal article in an issue, a screen reader announces the PDF reader's return arrow as "Return to Issue Details", but pressing it opens the article's page. The label is the wrong half: it should read "Return to Article Details", as the HTML reader's arrow does, and the destination, the article, is right.

The arrow shows only an icon and has no tooltip, so sighted readers see nothing wrong. A blind reader is told the arrow leads to the issue, and lands on the article instead.

It affects every article PDF in an issue, on every journal that uses the PDF.JS PDF Viewer, which is on by default. An article PDF outside an issue reads "Return to Article Details", as it should.

## Impact

- **Lost**: nothing stored or sent. A screen reader user hears a destination the arrow does not open, and the page gives no sign of the mismatch.
- **Who**: visitors who use a screen reader and open an article's PDF.
- **Way round**: none needed to finish the task: the arrow opens the article's page, which is where it is meant to lead.

Low: a label that misleads while the outcome is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main` (or `stable-3_5_0`).
- Submission 1, "The Signalling Theory Dividends", is published in "Vol. 1 No. 2 (2014)" with a galley "PDF". Nothing to set up.

Article reader:

1. Signed out, open the article's page, `/index.php/publicknowledge/article/view/1`. It opens at `/index.php/publicknowledge/en/article/view/mwandenga-signalling-theory`, its "Issue" line reading "Vol. 1 No. 2 (2014)".
2. Press "PDF".
3. On the PDF reader page, read the arrow at the top left with a screen reader, or check its name in the browser's accessibility inspector. It has no visible text.
4. Press the arrow.

**Expected**: the arrow is announced "Return to Article Details", and it opens the article's page.

**Observed**: the arrow is announced "Return to Issue Details". Pressing it opens the article's page, `/index.php/publicknowledge/en/article/view/mwandenga-signalling-theory` ("The Signalling Theory Dividends"), not the issue. The accessibility tree:

```
- link " Return to Issue Details":
  - /url: …/index.php/publicknowledge/en/article/view/mwandenga-signalling-theory
```

Control: the arrow on a full-issue PDF's reader, where "Return to Issue Details" is right, is announced so and opens the issue's page. To see it: as `dbarnes`, "Issues" › "Back Issues" › "Vol. 1 No. 2 (2014)" › "Issue Galleys" › "Add Galley", "Label" "PDF" with a PDF file, "Save"; then, signed out, "Archives" › "Vol. 1 No. 2 (2014)", the full issue's "PDF".

## Cause

pdfJsViewer's `templates/display.tpl` (lines 34–42) picks the arrow's screen-reader text by `{if $issue}`: `issue.return` ("Return to Issue Details") when the template has an issue, `article.return` ("Return to Article Details") otherwise. The text sits in a `pkp_screen_reader` span, and the link has no `title`. Its link is always `$parentUrl`. The template serves two pages:

- `PdfJsViewerPlugin::issueCallback()` (line 184) sets `parentUrl` to the issue's page and assigns `issue`.
- `PdfJsViewerPlugin::submissionCallback()` (line 119) sets `parentUrl` to the article's page. It still assigns `issue` (line 135): `ArticleHandler::view()` passes the article's issue to the `ArticleHandler::view::galley` hook (OJS `pages/article/ArticleHandler.php` line 429). `view()` has also assigned `issue` to the template (line 231). So `$issue` is set for every article in an issue, and the article reader's arrow is announced as leading to the issue.

The rule the template breaks is that the arrow's text names the page its link opens. `$issue` says whether the article has an issue, not where the link goes.

The regression is the 3.5 change for article PDFs in issues. In 3.4 and earlier the condition was `{if $parent instanceOf Issue}`, and no template ever assigned `$parent`, so every PDF reader announced "Return to Article Details": right for articles, wrong for the full-issue reader. [8e0a905](https://github.com/pkp/pdfJsViewer/commit/8e0a90541a1ed2ea56e189dc3626cb84d16815a6) (`pkp/pkp-lib#10208`, titles with rich formatting in the PDF viewer) moved the per-galley templates into PHP and changed the condition to `{if $issue}`. That fixed the full-issue reader and broke the article reader for every article in an issue.

Reach:

- An OJS article in no issue: `ArticleHandler` passes a null issue, so the arrow reads "Return to Article Details" (code).
- An earlier publication version of an article (its PDF reader at `…/article/view/<id>/version/<publicationId>/…`): `submissionCallback()` serves it with the same template and condition, so it has the same fault when the article is in an issue (code).
- OPS: `submissionCallback()` sets `$issue = null`, so the arrow takes `article.return`, which OPS's locale lacks, and reads "##article.return##" (walked). That is a separate fault with a separate fix, tracked in U13 [OPS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops5).
- OMP: its own PdfJsViewerPlugin template, whose arrow reads `catalog.viewableFile.return` (code).
- The HTML reader (`htmlArticleGalley`'s `display.tpl`): always `article.return` (code). No other template uses `issue.return` (searched in OJS's plugins and templates and in pkp-lib's templates).

## Proposed fix

Let each callback say which page the arrow leads to, and let the template pick the text from that, not from `$issue`. Each callback already passes its own flags to the shared template (`isTitleHtml`, `isLatestPublication`), and this adds one more, `isIssueGalley`: `false` in `submissionCallback()`, `true` in `issueCallback()`, and `{if $isIssueGalley}` in place of `{if $issue}` in `display.tpl`. The whole change is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-arrow-names-issue/fix.diff); its paths start at the app root, so in the pdfJsViewer repository apply it with `git apply -p4`.

`issue` stays assigned to the article reader, because a `Templates::Common::Footer::PageFooter` hook or a theme may read it.

Tried on `main`, OJS and OPS: with the fix the article reader's arrow is announced "Return to Article Details" and still opens the article's page; the full-issue reader's arrow (the control) and the OPS reader are unchanged with the fix in and out.

**Alternatives**:

- Stop assigning `issue` in `submissionCallback()`: does not work on its own, because `ArticleHandler::view()` has already assigned `issue` to the same template. It would also take a variable away from footer hooks.
- Point the arrow at the issue: a product change. The title link beside it and the HTML reader's arrow both open the article.
- Restore `$parent instanceOf Issue` with a `parent` variable: Smarty would need the namespaced class name (`APP\issue\Issue`), and a boolean is how the template's other per-page choices are made.

**What goes with it**:

- The fix lands in pkp/pdfJsViewer. OJS (and OPS, where it changes nothing) take it with a submodule bump on `main` and `stable-3_5_0`. The diff applies to 3.5's plugin as written (dry-run). 3.4 and 3.3 do not need it.
- Guard: the plugin has no unit tests. An end-to-end check (a **Planned** item in U13) can open an article's PDF reader and a full-issue PDF reader and check the arrow's accessible name on each.

Small: one flag in each of two callbacks and one condition in the template, tried.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pdf-reader-arrow-names-issue/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> ONLY=ojs,ops node bin/probe.js all shared/playwright/checks/issues/pdf-reader-arrow-names-issue/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front; `neighbour` after the script walks the full-issue control alone). It creates the full-issue galley with the fixture `apps/ojs/playwright/fixtures/files/article.pdf` and reads the arrow's name from the accessibility tree (Playwright's `ariaSnapshot()`).
- Fix tried: `node bin/try-fix.js apply shared/playwright/checks/issues/pdf-reader-arrow-names-issue/fix.diff ojs ops`, then the walk with the fix in, `revert`, and the walk's `neighbour` again without it.
- Tips walked or read: OJS `main` [bade233f73](https://github.com/pkp/ojs/commit/bade233f73) (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc), pdfJsViewer [e69bf97c45](https://github.com/pkp/pdfJsViewer/commit/e69bf97c45)); OPS `main` [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6), pdfJsViewer e69bf97c45); 3.5: OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pdfJsViewer [6d80e45119](https://github.com/pkp/pdfJsViewer/commit/6d80e45119), which contains 8e0a905); 3.4: OJS [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7) (pdfJsViewer [7c80542b62](https://github.com/pkp/pdfJsViewer/commit/7c80542b62)); 3.3: OJS [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a) (pdfJsViewer [32334cb962](https://github.com/pkp/pdfJsViewer/commit/32334cb962)). The 3.4 and 3.3 reads looked at `display.tpl`, `submissionGalley.tpl` and `issueGalley.tpl` at those pointers. Dataset: pkp/datasets 38ab955 (2026-09-30), PostgreSQL; the fault does not depend on the database.
- Introduced: `git blame` on `templates/display.tpl` line 36 gives 8e0a905; the rest of the block is b09b243 (2015, Alec Smecher), which wrote `{if $parent instanceOf Issue}`. `git log -S'$parent'` finds no commit that ever assigned `parent`. 8e0a905 was merged through `pkp/pdfJsViewer#73` (merge c30dcab, 2024-12-07).
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/ui-library and pkp/pdfJsViewer, issues and PRs, by "Return to Issue Details", "issue.return" and the PDF viewer's return link. `pkp/pkp-lib#2372` (the HTML reader's return link) and `pkp/pdfJsViewer#75` (a missing locale key on 3.3 issue galleys) are other faults.
