# An older version's browser tab and bookmark carry the current version's title, on articles, books and preprints

- **Severity** low
- **Effort** medium
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2473` and `pkp/omp#705` for `pkp/pkp-lib#4870` · [0639bdf58d](https://github.com/pkp/ojs/commit/0639bdf58d78fac60cb281f233d00e278ecc1c61), [9cc962b16](https://github.com/pkp/omp/commit/9cc962b1674c2a9602a39d9891f064f1e1368e16) · 2019-09-25 · Nate Wright (NateWr); OPS carried the OJS change over
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a6), U69 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A visitor who opens an older version of an article, book or preprint from the "Versions" list gets the right page, headed with that version's own title. The browser tab, though, shows the current version's title, and so does a bookmark or history entry made from the page. On a journal, the full-page viewer for an older version's HTML file shows the current version's title too, in the tab and in the title link at the top of the viewer.

The page's content is right, and the citation tags that Google Scholar and reference managers read are not wrong: an older version's page carries none. A reader who bookmarks the version they cite gets a bookmark named after another version, and nothing tells them.

It shows only when the title or subtitle changed between versions.

## Impact

- **Lost**: nothing stored and nothing on the page; the version's name in the tab, bookmarks and history is wrong.
- **Who**: any visitor, signed in or not, who opens an older version of an item that was retitled.
- **Way round**: the page's heading names the right version; a reader can rename the bookmark by hand.

Low: only the page title is wrong. The machine-read metadata is not affected, because an older version's page carries no citation tags, asks search engines not to index it, and names the current version as the canonical page.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (or `stable-3_5_0`), OJS, OMP and OPS, journal, press and server `publicknowledge`.
- OJS: submission 1, "Signalling Theory Dividends", has a published version 1 and an unpublished version 2 with another title, "The Signalling Theory Dividends Version 2". To confirm, open submission 1 as `dbarnes`: under "Publication" the side menu lists "Version of Record 1.0" and "Version of Record 1.1", and the latter's "Title & Abstract" reads "Status: Unpublished". The steps publish version 2.
- OMP: submission 14, "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots", and OPS: submission 11, "Learning Sustainable Design through Service", each have one published version. The steps make a second version with a changed title, since the dataset has no retitled version there.
- OJS, the HTML viewer only: the dataset has no HTML file on an older version, so steps 1 to 4 add one to version 1. These four steps were taken on `main` only; on 3.5 the viewer was read in the code.

OJS:

1. Sign in as `dbarnes`. Open submission 1 and, in the side menu under "Publication", open "Version of Record 1.0" › "Galleys".
2. Press "Unpublish", and "Unpublish" in the question.
3. Press "Add galley", type the label "HTML", press "Save", and upload any HTML file as "Article Text" ("Continue", "Continue", "Complete").
4. Press "Schedule For Publication". In "Review Publishing Details" keep what is filled in ("Assign To Current/Back Issue", "Vol. 1 No. 2 (2014)"), press "Confirm", then "Publish" in the question.
5. In the side menu open "Version of Record 1.1" (3.5: the "Publication" entry, which shows version 2). Press "Publish", keep what "Review Publishing Details" fills in, press "Confirm" (3.5: no such window opens), then "Publish" in the question.
6. Sign out. Open the article's page, `/index.php/publicknowledge/article/view/1`.
7. Under "Versions", press the older entry, "{date} (Version of Record 1.0)" (3.5: "{date} (1)").
8. On the older version's page, press "HTML".

OMP:

1. Sign in as `dbarnes`. Open submission 14 and its "Title & Abstract".
2. Press "Create New Version". Keep the window's choices and press "Confirm" (3.5: press "Yes").
3. On the new version's "Title & Abstract", add " (u13a6 revision)" at the end of "Title" and press "Save".
4. Press "Publish", then "Publish" in the question. Sign out.
5. Open the book's page, `/index.php/publicknowledge/catalog/book/14`.
6. Under "Versions", press the older entry, "{date} (Version of Record 1.0)" (3.5: "{date} (1)").

OPS:

1. Sign in as `dbarnes`. Open submission 11 and its "Title & Abstract".
2. Press "Create New Version". Keep the window's choices and press "Confirm" (3.5: press "Yes").
3. Add " (u13a6 revision)" at the end of "Title" and press "Save".
4. Press "Post", then "Post" in the question. Sign out.
5. Open the preprint's page, `/index.php/publicknowledge/preprint/view/11`.
6. Under "Versions", press the older entry, "{date} (Author Original 1.0)" (3.5: "{date} (1)").

**Expected**: the older version's page is headed with its own title, and the browser tab carries that title:

```
The Signalling Theory Dividends: A Review Of The Literature And Empirical Evidence | Journal of Public Knowledge
From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots | Public Knowledge Press
Learning Sustainable Design through Service | Public Knowledge Preprint Server
```

On the journal, the older version's HTML viewer names the older version in its tab and its title link.

**Observed**: each older page opens with "This is an outdated version published on {date}. Read the most recent version." and is headed with the older title ("The Signalling Theory Dividends", "From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots", "Learning Sustainable Design through Service"). Its tab carries the current version's title, the same as the current page's tab:

```
The The Signalling Theory Dividends Version 2: A Review Of The Literature And Empirical Evidence | Journal of Public Knowledge
From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots (u13a6 revision) | Public Knowledge Press
Learning Sustainable Design through Service (u13a6 revision) | Public Knowledge Preprint Server
```

The journal's older HTML viewer (step 8) shows the outdated-version notice under a title link reading "The The Signalling Theory Dividends Version 2", and its tab reads "View of The The Signalling Theory Dividends Version 2: A Review Of The Literature And Empirical Evidence | Journal of Public Knowledge". (The doubled "The" is the dataset's: version 2 has the prefix "The" and a title that begins with "The".)

Control: the older version's "PDF" viewer on the journal names the older version in its tab, "View of The Signalling Theory Dividends".

## Cause

The landing page's template builds the page title from the submission's current publication, not from the version the page shows. OJS `templates/frontend/pages/article.tpl` line 22:

```smarty
{include file="frontend/components/header.tpl" pageTitleTranslated=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
```

`ArticleHandler::view()` assigns the shown version as `$publication`, and `article_details.tpl` heads the page with `$publication->getLocalizedTitle()`. OPS `templates/frontend/pages/preprint.tpl` line 21 is the same line, and `PreprintHandler::view()` assigns `$publication` the same way. OMP `templates/frontend/pages/book.tpl` line 20 sets `$pageTitle` from `$publishedSubmission->getCurrentPublication()->getLocalizedFullTitle()`, while `CatalogBookHandler::book()` assigns the shown version as `$publication` and `monograph_full.tpl` heads the page with it.

The title line dates from 2015, as `$article->getLocalizedTitle()`, when an article had one version. `pkp/pkp-lib#4870` made older versions readable at `…/version/{id}` (`pkp/ojs#2473`, `pkp/omp#705`, 2019). That change moved the page body to `$publication` but left the page title on the submission's title methods. From 3.2, `Submission::getLocalizedTitle()` and `getLocalizedFullTitle()` were deprecated and returned the current publication's title.

Reach:

- OJS's HTML viewer, `plugins/generic/htmlArticleGalley/templates/display.tpl` lines 14 (the tab) and 29 (the title link): both read `$article->getCurrentPublication()`, though `HtmlArticleGalleyPlugin::articleViewCallback()` assigns the galley's version as `$galleyPublication` (checked on screen). OPS has no HTML viewer: it does not ship that plugin, and its HTML galleys download (checked in the code).
- Not affected: the PDF viewer (`pdfJsViewer`, all three apps) titles its page from the galley's or file's own version (checked on screen on OJS). OMP's HTML viewer titles its tab from the format and file name, and its title link from `$filePublication` (checked in the code).
- Not affected: OMP's chapter pages. Their title comes from `$chapter`, which `CatalogBookHandler::setChapter()` looks up within the shown version (checked in the code; an older version's chapter page could not be opened, because it answers a server error, U69 [A19](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a19)).
- Not affected on `main`, 3.5 and 3.4: the citation tags. `GoogleScholarPlugin` and `DublinCoreMetaPlugin` return before adding any tag when the address has a `version` part (the `pkp/pkp-lib#4870` discussion). The handlers add `<meta name="robots" content="noindex">` and a canonical link to the current version. Seen in the page source of OPS submission 3's older version: no `citation_title`, only those two; its current page carries `citation_title`. On 3.3 OMP's two plugins have no such check and print the current version's title as `citation_title` and `DC.Title` on an older version's page too (code only). That is in other files, and this fix does not cover it.
- Not instances: the lists (issue table of contents, catalog, preprint lists) show the current version on purpose and link to it.
- PKP's themes outside the apps (their `main` branches): Classic's `article.tpl` already titles the page from `$publication`. Health Sciences' `article.tpl` has this same line. Immersion and Pragma title it from `$article->getLocalizedData('title')`, a different line not looked into further. Manuscript has no copy. None of them ships `preprint.tpl` or `book.tpl`.

## Proposed fix

Title the page from the version the page shows, which the handlers already pass: `$publication` on the three landing pages, and `$galleyPublication` in OJS's HTML viewer. The closest precedent is in the same file: the HTML viewer's iframe, `display.tpl` line 48, already reads `$galleyPublication->getLocalizedFullTitle(null)`. The Classic theme's `article.tpl` titles the landing page from `$publication`. The diffs ([fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-ojs.diff), [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-omp.diff), [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-ops.diff)):

```diff
--- a/templates/frontend/pages/article.tpl          (OJS; OPS preprint.tpl the same with $preprint)
-{include file="frontend/components/header.tpl" pageTitleTranslated=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
+{include file="frontend/components/header.tpl" pageTitleTranslated=$publication->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
--- a/templates/frontend/pages/book.tpl             (OMP)
-	{assign var=pageTitle value=$publishedSubmission->getCurrentPublication()->getLocalizedFullTitle()}
+	{assign var=pageTitle value=$publication->getLocalizedFullTitle()}
--- a/plugins/generic/htmlArticleGalley/templates/display.tpl   (OJS, lines 14 and 29)
-... title=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html') ...
+... title=$galleyPublication->getLocalizedFullTitle(null, 'html') ...
-			{$article->getCurrentPublication()->getLocalizedTitle(null, 'html')|strip_unsafe_html}
+			{$galleyPublication->getLocalizedTitle(null, 'html')|strip_unsafe_html}
```

Tried on `main` with the three apps' diffs in: each older version's tab then carried its own title ("The Signalling Theory Dividends: A Review Of The Literature And Empirical Evidence | Journal of Public Knowledge", and the same for the book and the preprint). The older HTML viewer's title link read "The Signalling Theory Dividends", and its tab "View of The Signalling Theory Dividends: …". The current pages' tabs and the older PDF viewer's tab read the same with the fix in and out.

**Alternatives**:

- Setting the page title in the handlers: the templates own the title on every other front-end page, and themes override these templates, so the fix belongs there.

**What goes with it**:

- Nothing stored is wrong, so no repair. On the current version's page `$publication` is the current publication, so nothing changes there. A theme with its own copy of these templates keeps the fault until it makes the same change. Of PKP's themes that is Health Sciences (one line in its `article.tpl`). The variables the templates receive do not change.
- Backport, 3.5: the same lines as `main`.
- Backport, 3.4: `article.tpl` line 20 and `preprint.tpl` line 19 take the same change. The HTML viewer's lines 12 and 28 read `$article->getLocalizedTitle(null, 'html')`; they become `$galleyPublication->getLocalizedFullTitle(null, 'html')` (the tab, as on `main`) and `$galleyPublication->getLocalizedTitle(null, 'html')` (the title link). OMP's `book.tpl` line 18, `{$pageTitle = $publishedSubmission->getLocalizedFullTitle()}`, becomes `{$pageTitle = $publication->getLocalizedFullTitle()}`.
- Backport, 3.3: `article.tpl` line 20 and `preprint.tpl` line 19 read `$article->getLocalizedFullTitle()|escape` and `$preprint->getLocalizedFullTitle()|escape`; they become `$publication->getLocalizedFullTitle()|escape`. OMP's `book.tpl` line 15 passes `pageTitleTranslated=$publishedSubmission->getLocalizedFullTitle()` straight to the header include, with no `|escape` and no `$pageTitle` step; it becomes `$publication->getLocalizedFullTitle()`. The HTML viewer's lines 12 and 28, `$article->getLocalizedTitle()|escape`, become `$galleyPublication->getLocalizedTitle()|escape`. The 3.4 and 3.3 handlers assign `publication` and `galleyPublication` too.
- The guard: an e2e check in U13 and U69.

Medium: three app repositories, one line each (two in OJS's HTML viewer), each following the line beside it.

## Evidence

- Kept walk: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/walk.js), on an install freshly loaded from the default dataset: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-tab-current-title/walk.js` (3.5: `PKP_E2E_LINE=stable-3_5_0 PROBE_RUN=r35` in front).
- Fix tried: `node bin/try-fix.js apply <fix-<app>.diff> <app>` for each app, then the walk.
- Dataset: the walks loaded pkp/datasets 38ab955 (2026-09-30), PostgreSQL. `docs/process/dataset.md`'s tables were generated from c0f9f10 (also 2026-09-30); in 38ab955, submission 1's version 2 was unpublished, as its workflow page showed (see Preconditions). The fault does not depend on the database.
- Tips walked or read: `main` OJS [bade233f73](https://github.com/pkp/ojs/commit/bade233f73) (pkp-lib [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc)), OMP [3b0ecf794](https://github.com/pkp/omp/commit/3b0ecf794) and OPS [c8af945bb7](https://github.com/pkp/ops/commit/c8af945bb7) (pkp-lib [3dc90c81a6](https://github.com/pkp/pkp-lib/commit/3dc90c81a6)); 3.5 OJS [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), OMP [3081c9b00](https://github.com/pkp/omp/commit/3081c9b00), OPS [cf4fce69bd](https://github.com/pkp/ops/commit/cf4fce69bd) (pkp-lib [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62)); 3.4 OJS [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), OMP [0aec65441](https://github.com/pkp/omp/commit/0aec65441), OPS [acd8ae704b](https://github.com/pkp/ops/commit/acd8ae704b); 3.3 OJS [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a), OMP [8e72fc883](https://github.com/pkp/omp/commit/8e72fc883), OPS [c5532e2161](https://github.com/pkp/ops/commit/c5532e2161).
- 3.5 (walked, and code): the same lines in `article.tpl`, `preprint.tpl`, `book.tpl` and the HTML viewer's `display.tpl`.
- 3.4 and 3.3 (code): the lines quoted under the backport, on each app's `stable-3_4_0` and `stable-3_3_0`. `PKPSubmission::getLocalizedTitle()` and `getLocalizedFullTitle()` were read in pkp-lib `stable-3_3_0`. The `version` check was read in `GoogleScholarPlugin` and `DublinCoreMetaPlugin` on each line (OJS and OPS 3.4 and 3.3 at the googleScholar pointers 37a78c2 and 648b0a6).
- Themes: `templates/frontend/pages/` on the `main` branches of pkp/classic, pkp/healthSciences, pkp/immersion, pkp/pragma and pkp/manuscript, read 2026-10-01.
- Introduced: `git log -L` on `article.tpl` line 22 gives facd659 (2023, `pkp/pkp-lib#2564`), ea10661 (2023), 8933558 (2022, `pkp/pkp-lib#7864`) and the 2015 origin `$article->getLocalizedTitle()` (7b726d8, bf520c2). These changes kept the behavior, spelling it out as `getCurrentPublication()`. 0639bdf58d (`pkp/ojs#2473`) added the `version` address and `$publication` without touching that line. OPS has the same change as 4b3f98dad1 in its history (forked from OJS), with the later title edits b47aab0 and 9fda9f8. OMP: 9cc962b16 (`pkp/omp#705`), then bfe33f3 (2021, `pkp/pkp-lib#7132`, chapter pages) and 04de3da (2024, deprecated functions). The HTML viewer's lines blame to a200614 (2024-02-02, "Remove deprecated functions"), which replaced `$article->getLocalizedTitle()` with its current-publication spelling.
- Upstream search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and pkp/ui-library, issues and PRs, by the symptom's words (version, page title, browser tab, older, outdated) and by `getCurrentPublication`, `pageTitleTranslated` and `htmlArticleGalley`. Nearest, but not the same fault: `pkp/pkp-lib#13222` (an OPS version page without `citation_*` tags) and `pkp/pkp-lib#7527` (article metadata reflecting the issue at publication time).
- Unverified: what a reference manager records when saving an older version's page, which carries no citation tags. It may fall back to the page title, which would carry this fault into the reference; not checked.
- The OJS PDF viewer control logs `MissingPDFException` in the browser; that is U13 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a2), a separate fault.
