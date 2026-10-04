# The PDF or HTML reader opened from a new version's preview calls that version outdated

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS (code)
- **Introduced** `pkp/pdfJsViewer#49` for `pkp/pkp-lib#4870` · [fc1af3d04b](https://github.com/pkp/pdfJsViewer/commit/fc1af3d04bffe0789021a6f3ca17ca0cbc01c94e) · 2020-02-19 · Nate Wright (NateWr); the HTML reader's notice `pkp/ojs#2581` for `pkp/pkp-lib#5277` · [c8030af21d](https://github.com/pkp/ojs/commit/c8030af21d406ef680123893159da38ea87d2160) · 2020-01-07 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-04)
- **Tracked in** spec U13 [A13](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a13)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On the preview of a new, unpublished version of a published article or
a posted preprint, pressing "PDF" opens the PDF reader under "This is
an outdated version published on . Read the most recent version." That
notice is meant for an older, superseded version, but this version is
the next one. The date is blank because the new version has none.

On a journal, the version's "HTML" opens the HTML reader under the same
notice, dated today: "This is an outdated version published on October
4, 2026." In both readers, the notice's "most recent version" link goes
back to the published version's page.

The editor checking the new version is told it is outdated. Readers
never see the preview.

## Impact

- **Lost.** Nothing. The reader shows a wrong notice above the new
  version's file.
- **Who.** An editor or manager who previews a new version of a
  published article or a posted preprint and opens its PDF or HTML.
  This happens on every such preview, as long as the "PDF.JS PDF Viewer"
  or "HTML Article Galley" plugin is on (both are on by default).
- **Way round.** None needed. The notice goes once the version is
  published.

Low: a misleading line on a page that only the people preparing a new
version see, and nothing is lost.

## Steps to reproduce

Preconditions:
- PKP's default test dataset for `main`, freshly loaded. On the journal,
  submission 17, "Antimicrobial, heavy metal resistance and plasmid
  profile of coliforms isolated from nosocomial infections in a hospital
  in Isfahan, Iran", is published in one version, "Version of Record
  1.0", with a "PDF" galley. On the preprint server, submission 2, "The
  Facets Of Job Satisfaction: A Nine-Nation Comparative Study Of
  Construct Equivalence", is posted in one version, "Author Original
  1.0", with a "PDF" galley.
- A small HTML file to upload as the journal's HTML galley, here
  `u13a13-article.html`. The dataset has no HTML galley.

Journal (OJS):

1. Sign in as `dbarnes` (Journal editor).
2. Open submission 17's workflow,
   `/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`.
3. Under "Publication" in the menu, press "Create New Version". Keep
   what the "Create New Version" window offers and press "Confirm". The
   menu now lists "Version of Record 1.1", unpublished.
4. Under "Version of Record 1.1", open "Galleys" and press "Add galley".
   Type "HTML" and press "Save". Upload `u13a13-article.html` as
   "Article Text", press "Continue", "Continue", then "Complete".
5. Under "Version of Record 1.1", open "Title & Abstract" and press
   "Preview". The browser opens
   `…/en/article/view/17/version/22`, under "This is a preview and has
   not been published. View submission".
6. Press "PDF".
7. Go back to the preview and press "HTML".

Preprint server (OPS): steps 1 to 3, 5 and 6 as `dbarnes` (Preprint
Server manager) on submission 2, under "Preprint". The new version is
"Author Original 1.1", and "Preview" opens
`…/en/preprint/view/2/version/21`.

[3.5: "Create New Version" is a button above the publication's pages.
It asks "Are you sure you want to create a new version?", answered
"Yes". The menu lists one version's pages, the new one's, so "Galleys"
and "Title & Abstract" are the plain entries; "Preview" sits beside
"Publish" / "Post".]

**Expected:** each reader opens the new version's file with no notice
above it. The preview page already says the version is not published.

**Observed:** above the PDF reader, on both:

```
This is an outdated version published on . Read the most recent version.
```

Above the HTML reader (step 7):

```
This is an outdated version published on October 4, 2026. Read the most recent version.
```

2026-10-04 was the day of the walk. "most recent version" links to
`…/en/article/view/17` and `…/en/preprint/view/2`, the published
version's page.

The dataset's own unpublished version reads the same way: submission
1's "Version of Record 1.1", whose preview's "PDF Version 2" opens the
reader under "This is an outdated version published on 2026-10-04."
because the dataset stores a publication date on that unpublished
version.

## Cause

The readers decide their notice on their own, apart from the article
page, and test only whether the file's version is the submission's
current one:

- PDF reader, `pkp/pdfJsViewer` (the same plugin in OJS and OPS):
  `PdfJsViewerPlugin::submissionCallback()` assigns
  `isLatestPublication` as `currentPublicationId === $galley->getData('publicationId')`
  ([line 141](https://github.com/pkp/pdfJsViewer/blob/e69bf97c453a018277a7a87f13afae9344bb6174/PdfJsViewerPlugin.php#L141)),
  and
  [`templates/display.tpl`](https://github.com/pkp/pdfJsViewer/blob/e69bf97c453a018277a7a87f13afae9344bb6174/templates/display.tpl#L72-L79)
  shows the notice on `{if !$isLatestPublication}`.
- HTML reader, OJS `plugins/generic/htmlArticleGalley`:
  `HtmlArticleGalleyPlugin::articleViewCallback()` assigns the same
  value
  ([line 90](https://github.com/pkp/ojs/blob/ff004d097321cd5ae94ba8ce1659cc5230226720/plugins/generic/htmlArticleGalley/HtmlArticleGalleyPlugin.php#L90)),
  and
  [`templates/display.tpl`](https://github.com/pkp/ojs/blob/ff004d097321cd5ae94ba8ce1659cc5230226720/plugins/generic/htmlArticleGalley/templates/display.tpl#L33-L46)
  shows the notice under the same `{if}`.

The current publication is the last published version. The protected
`PKP\submission\Repository::getCurrentPublicationIdByPublications()`
picks it, falling back to the latest version only when none is
published. So a new, unpublished version of a published article is
never current, and its reader gets the notice meant for an older
published version. OJS's article page makes the same decision correctly
([`article_details.tpl`](https://github.com/pkp/ojs/blob/ff004d097321cd5ae94ba8ce1659cc5230226720/templates/frontend/objects/article_details.tpl#L78-L93)):
it shows the preview notice when the publication is not published, and
the outdated notice only `{elseif}` it is published and not current.

The date differs because of how each reader formats it:

- The PDF reader passes the version's empty `datePublished` straight
  into the sentence, so it prints nothing.
- The HTML reader formats it with `|date_format`.
  `PKPTemplateManager::smartyDateFormat()` builds `new Carbon($string)`,
  and `new Carbon(null)` is now, so it prints today
  ([lib/pkp](https://github.com/pkp/pkp-lib/blob/987776cd043efac8c4a1693560a6d7737d174210/classes/template/PKPTemplateManager.php#L2422-L2425)).

The notices predate the "Preview" button, and the change that added
that button never touched the readers.

Reach:

- OMP's `pdfJsViewer` and `htmlMonographFile` plugins carry the same
  test
  ([`PdfJsViewerPlugin.php` line 97](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/plugins/generic/pdfJsViewer/PdfJsViewerPlugin.php#L97),
  [`HtmlMonographFilePlugin.php` line 104](https://github.com/pkp/omp/blob/3b0ecf794cbd2dc8c0ae037929e4f79e1695e262/plugins/generic/htmlMonographFile/HtmlMonographFilePlugin.php#L104)),
  but no screen reaches them with an unpublished version.
  `CatalogBookHandler::download()` answers "404 Not Found" for any
  unpublished version's file, so a preview's "PDF" gets the 404 page
  (walked, `main` and 3.5; code on 3.4 and 3.3).
- The preview page's own outdated notice (OPS, OMP) is a separate
  fault in the apps' page templates, reported in
  [pkp-e2e#209](https://github.com/jardakotesovec/pkp-e2e/issues/209).
  Its fix does not reach the readers, and this fix does not reach the
  pages.

## Proposed fix

Recommended: show the readers' notice only for a published version that
is not the current one, the rule `article_details.tpl` already applies.
Make the change in each reader's template and keep `isLatestPublication`
as it is. The HTML reader also uses it to pick the versioned file
address (with or without the `version` part), and the fix for
[U13 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-A2-older-version-pdf-reader-empty.md)
proposes using it in the PDF reader to pick the versioned file address
too.

[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-reader-outdated/fix-ojs.diff)
(the PDF and HTML readers) and
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-reader-outdated/fix-ops.diff)
(the PDF reader). In `pkp/pdfJsViewer` `templates/display.tpl`:

```diff
-	<div id="pdfCanvasContainer" class="galley_view{if !$isLatestPublication} galley_view_with_notice{/if}">
-		{if !$isLatestPublication}
+	<div id="pdfCanvasContainer" class="galley_view{if !$isLatestPublication && $galleyPublication->getData('status') === PKP\publication\PKPPublication::STATUS_PUBLISHED} galley_view_with_notice{/if}">
+		{if !$isLatestPublication && $galleyPublication->getData('status') === PKP\publication\PKPPublication::STATUS_PUBLISHED}
```

This template is also the issue galley's reader (`issueCallback()`),
which assigns no `$galleyPublication`. The change is safe there because
that callback sets `isLatestPublication` to true, so the `&&` never
reaches `$galleyPublication` (code).

In OJS `plugins/generic/htmlArticleGalley/templates/display.tpl`, the
same test goes on the container's class. Inside the existing
`{if !$isLatestPublication}`, the notice is wrapped in
`{if $galleyPublication->getData('status') === PKP\publication\PKPPublication::STATUS_PUBLISHED}`,
and the versioned file address is left as it is.

Tried on `main` on OJS and OPS. Both readers opened from the preview
showed no notice, and so did the dataset's own submission 1 preview.
A check of the published versions' readers gave the same result with
the fix in and out: the current version's readers showed no notice, and
the older published versions' PDF and HTML readers still read "This is
an outdated version published on 2026-10-04." and "… on October 4,
2026."

**Alternatives:**

- Setting `isLatestPublication` true for an unpublished version would
  change the HTML reader's file address to the published version's.
  The name would also stop meaning what it says.
- A flag computed in PHP (an `isOutdatedPublication` assigned beside
  `isLatestPublication` in both plugins) is no better for themes that
  override a reader's `display.tpl`. Those overrides still test
  `$isLatestPublication`, so a new flag reaches them only once they
  adopt it, just as the template change does. The only value that would
  reach them unchanged is `isLatestPublication` itself, and that value
  also picks the file address (above). The template change keeps the
  fix in one visible place per reader, as `article_details.tpl` does.
- Printing nothing for an empty date would leave "published on ." on
  the preview. The notice itself is the error.
- Showing the preview notice ("This is a preview and has not been
  published.") in the readers is a product choice. The preview page
  already says it, one click back.

**What goes with it:**

- `pkp/pdfJsViewer` takes the template change, and OJS and OPS take its
  submodule update. OJS takes the HTML reader's template change itself.
- Left out: OMP's `pdfJsViewer` and `htmlMonographFile`, which carry the
  same test but cannot be reached from a preview while
  `CatalogBookHandler::download()` refuses unpublished versions.
  Whatever change lets a press preview its files should bring the same
  test.
- Backport. `PKPPublication::STATUS_PUBLISHED` does not exist on 3.5
  or 3.4: use `PKP\submission\PKPSubmission::STATUS_PUBLISHED` there
  (`main` also still has it). On 3.3 the constant is the global
  `STATUS_PUBLISHED`. The templates themselves:
  - On 3.5, both readers' templates are the same as `main`'s.
  - On 3.4 and 3.3, the HTML reader's template has the same test. The
    PDF reader's `{if !$isLatestPublication}` sits in the same
    `display.tpl`, but the sentence is built in `submissionGalley.tpl`
    through `|date_format`.
  - So 3.4's PDF reader prints today's date where `main` prints a
    blank: 3.4's `smartyDateFormat()` also formats `new Carbon(null)`
    (code).
  - 3.3 has no `smartyDateFormat()`. Smarty's own `date_format` prints
    nothing for an empty date (code).
- No stored data changes.
- The guard: the e2e scenario in U13 (its Planned item for A13). A new
  version's "PDF" opened from its preview shows no notice, and an older
  published version's reader keeps it.

Medium: the change itself is the same few lines in two templates, but
they live in two repositories (`pkp/pdfJsViewer` and `pkp/ojs`), and
OJS and OPS each need a submodule update.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/new-version-preview-reader-outdated/walk.js)
  (helpers in `lib.js`, the HTML file `u13a13-article.html` beside it)
  takes the Steps on OJS and OPS. It also takes them on OMP (submission
  14), where the preview's "PDF" answers "404 Not Found", and it reads
  OJS submission 1's preview as an extra check:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/new-version-preview-reader-outdated/walk.js`
  on an install freshly loaded from the default dataset.
  `WALK=nb` runs the check of the published versions' readers on
  `main` (OJS, OPS). On OPS, signed
  out, it opens submission 3's current and older posted versions and
  their "PDF". On OJS, `dbarnes` makes 1.1 with an HTML galley,
  publishes it, makes 1.2 and publishes it. Then, signed out, it opens
  the current version's readers, 1.1's PDF and HTML, and 1.0's PDF.
- The fix was tried with
  `node bin/try-fix.js apply …/fix-ojs.diff ojs` and
  `… apply …/fix-ops.diff ops`, then the walk and `WALK=nb`, then
  `revert`.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), on PostgreSQL.
  Nothing here depends on the database. Datasets: pkp/datasets 1a5552c
  (2026-10-04).
- Tips. `main`: OJS ff004d0973 (lib/pkp 987776cd04, pdfJsViewer
  e69bf97c45), OPS c8af945bb7 (lib/pkp 3dc90c81a6, pdfJsViewer
  e69bf97c45), OMP 3b0ecf794c (lib/pkp 3dc90c81a6). `stable-3_5_0`: OJS
  c1cee76b95 (lib/pkp 771474347e, pdfJsViewer 6d80e45), OPS 38b61882d3
  (lib/pkp cf3f984335, pdfJsViewer 6d80e45), OMP 9c5e24246 (lib/pkp
  cf3f984335). `stable-3_4_0`: OJS d68934d0d1, OPS acd8ae704b (both
  pdfJsViewer 7c80542b62), OMP 0aec65441. `stable-3_3_0`: OJS ac77c9fb35
  (pdfJsViewer 32334cb962), OPS c5532e2161, OMP 8e72fc883.
- Code reads:
  - 3.5: the pdfJsViewer and htmlArticleGalley templates are identical
    to `main`'s.
  - 3.4: pdfJsViewer 7c80542b62 has the same `{if !$isLatestPublication}`
    in `display.tpl`, with the sentence built in
    `submissionGalley.tpl` through `|date_format`. OJS
    `htmlArticleGalley` has the same test. OJS `ArticleHandler` and OPS
    `PreprintHandler` let `canPreview()` users open an unpublished
    version's galleys.
  - 3.3: pdfJsViewer 32334cb962 and OJS `htmlArticleGalley` have the
    same test. OJS `ArticleHandler::initialize()` lets
    `allowedPrePublicationAccess()` users open an unpublished version,
    and `article_details.tpl` has the preview notice. OPS
    `PreprintHandler::initialize()` answers 404 for any unpublished
    publication, so no OPS preview exists there.
  - OMP `CatalogBookHandler::download()` refuses an unpublished
    version on `main`, 3.5, 3.4 and 3.3.
- Introduced: `git blame` on the notice's `{if}` in pdfJsViewer's
  `display.tpl` gives fc1af3d04b, "pkp/pkp-lib#4870 Add notice when
  viewing outdated PDF version" (PR `pkp/pdfJsViewer#49`). In
  htmlArticleGalley's it gives c8030af21d, "pkp/pkp-lib#5277 Add notice
  to outdated galleys" (PR `pkp/ojs#2581`).
- Upstream search 2026-10-04, in pkp/pkp-lib, pkp/ojs, pkp/ops, pkp/omp
  and pkp/pdfJsViewer: "outdated version preview", "outdated version"
  galley, `isLatestPublication`, "published on" outdated pdf, preview
  pdf viewer notice version, unpublished version pdf viewer. Nothing
  about this fault; `pkp/pkp-lib#4870` and `pkp/pkp-lib#5277` are the
  issues that added the notices.
- Seen on the way, not this fault: on the preview and on an older
  version, the PDF reader's own script fails with `MissingPDFException`
  and shows no document. That is
  [U13 A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-A2-older-version-pdf-reader-empty.md).
- Not driven: the author's preview; 3.4 and 3.3 (code only). The HTML
  reader's file still loading under the fix was read from its frame
  address (unchanged, with the `version` part), not from the frame's
  content.
