# An older version's page names the current version in the browser tab, not the version it shows

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2473` and `pkp/omp#705` for `pkp/pkp-lib#4870` · [0639bdf58d](https://github.com/pkp/ojs/commit/0639bdf58d78fac60cb281f233d00e278ecc1c61), [9cc962b167](https://github.com/pkp/omp/commit/9cc962b1674c2a9602a39d9891f064f1e1368e16) · 2019-09-25 · Nate Wright (NateWr)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#a6) · spec U69 [A5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U69-monograph-landing-page.md#a5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

An older version's page is headed with that version's title, but the
browser tab, and a bookmark made from it, reads the current version's
title. This is so on an article's, a preprint's and a book's page. On a
journal, the page that shows an older version's HTML galley has the same
fault.

A reader who bookmarks the version they cite gets a bookmark named after
another version.

The fault shows only when a later version was published under a
different title.

## Impact

- **Lost** The page's name in the browser tab, in bookmarks and in the
  browser's history is another version's title.
- **Who** A reader on an older version's page of an article, preprint or
  book. Most versions keep their title, so few pages show the fault.
- **Way round** The reader renames the bookmark; the page's own heading
  and content are the older version's.

Search engines and citation indexes do not pick the wrong title up: an
older version's page asks robots not to index it, names the current
version's page as canonical, and carries no citation, Dublin Core or
sharing title tag.

Low: a page title that misleads while the page itself is right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`: OJS, OMP or OPS. The dates in
  the version labels below ("2026-09-30") are the day the dataset was
  built, so they differ on a dataset fetched another day.
- OJS: article 1, "Signalling Theory Dividends", has a published version
  1.0 and an unpublished version 1.1 with another title ("The Signalling
  Theory Dividends Version 2"). Both versions also have the prefix "The"
  and the subtitle "A Review Of The Literature And Empirical Evidence".
  Steps 1 to 3 publish 1.1.
- OPS: preprint 3, "Computer Skill Requirements for New and Existing
  Teachers: Implications for Policy and Practice", has two posted
  versions with the same title. Steps 1 to 5 post a third under a new
  title.
- OMP: book 14, "From Bricks to Brains: The Embodied Cognitive Science
  of LEGO Robots", has one published version. Steps 1 to 5 publish a
  second under a new title.

OJS, publishing version 1.1:

1. Sign in as `dbarnes` and open submission 1. The workflow opens on
   version 1.1.
2. Press "Publish". In "Review Publishing Details" keep what is
   preselected and press "Confirm". Then press "Publish" under "Are you
   sure you want to publish this?". [3.5: "Publish", then "Publish" in
   the window.]
3. Sign out.

OPS and OMP, a new version under a new title:

1. Sign in as `dbarnes` and open submission 3 (OPS) or 14 (OMP).
2. Press "Create New Version" in the "Preprint" ("Publication") menu and
   press "Confirm" without changing anything. [3.5: the "Create New
   Version" button in the page's header, then "Yes".]
3. Open the new version's "Title & Abstract", set "Title" to "Computer
   Skill Requirements Revisited u13ir15" (OPS) or "From Bricks to Brains
   Revised u13ir15" (OMP), and press "Save".
4. OPS: press "Post", then "Post" under "Are you sure you want to post
   this?". OMP: press "Publish", then "Publish" in "Schedule For
   Publication".
5. Sign out.

All three, signed out:

6. Open the article page
   (`/index.php/publicknowledge/article/view/mwandenga`), the preprint
   page (`/index.php/publicknowledge/preprint/view/3`) or the book page
   (`/index.php/publicknowledge/catalog/book/14`).
7. Under "Versions", press the newest of the older versions: "2026-09-30
   (Version of Record 1.0)" on the journal and the press, "2026-09-30
   (Author Original 2.0)" on the server. [3.5: "2026-09-30 (1)",
   "2026-09-30 (2)" on the server.] The page shows "This is an outdated
   version published on 2026-09-30. Read the most recent version."
8. Read the page's heading and the browser tab.

**Expected.** The tab reads the full title of the version the page
shows (prefix, title and subtitle), followed by the journal's, server's
or press's name. On the journal and the server the heading shows the
prefix and title and puts the subtitle on its own line, so the tab is
compared with the heading and subtitle together:

| | Expected browser tab |
|---|---|
| OJS | The Signalling Theory Dividends: A Review Of The Literature And Empirical Evidence \| Journal of Public Knowledge |
| OPS | Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice \| Public Knowledge Preprint Server |
| OMP | From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots \| Public Knowledge Press |

**Observed.** The heading reads the older version's title and the tab
the current version's:

| | Heading | Browser tab |
|---|---|---|
| OJS | The Signalling Theory Dividends | The The Signalling Theory Dividends Version 2: A Review Of The Literature And Empirical Evidence \| Journal of Public Knowledge |
| OPS | Computer Skill Requirements for New and Existing Teachers: Implications for Policy and Practice | Computer Skill Requirements Revisited u13ir15 \| Public Knowledge Preprint Server |
| OMP | From Bricks to Brains: The Embodied Cognitive Science of LEGO Robots | From Bricks to Brains Revised u13ir15 \| Public Knowledge Press |

On the journal, version 1.0's heading is its prefix "The" and its title;
the doubled "The" in the tab is version 1.1's prefix in front of a title
that itself starts with "The".

Control: the current version's page reads its own title in both places.

The HTML galley's page of an older version (OJS, on a freshly loaded
dataset):

1. Sign in as `dbarnes` and open submission 1. Under version 1.1's
   "Galleys", press "Add galley", label it "HTML", and upload any HTML
   file as "Article Text".
2. Publish version 1.1 as in step 2 above.
3. Press "Create New Version" and "Confirm". Set the new version's
   "Title" to "Signalling Theory Dividends Revisited u13ir15", press
   "Save", and publish it the same way. Sign out.
4. Open the article page, press "2026-09-30 (Version of Record 1.1)"
   under "Versions", then press "HTML".

**Expected.** The tab reads "View of The The Signalling Theory Dividends
Version 2: A Review Of The Literature And Empirical Evidence | Journal
of Public Knowledge", and the bar at the top of the page reads "The The
Signalling Theory Dividends Version 2".

**Observed.** The tab reads "View of The Signalling Theory Dividends
Revisited u13ir15: A Review Of The Literature And Empirical Evidence |
Journal of Public Knowledge" and the bar "The Signalling Theory Dividends
Revisited u13ir15", above the notice "This is an outdated version
published on September 30, 2026. Read the most recent version."

## Cause

Each landing page's template builds the page title from the submission's
current publication, whichever publication the page shows. The handler
gives the template the shown one as `$publication`, and the heading, the
abstract and the rest of the page read that:

- OJS `templates/frontend/pages/article.tpl`, line 22:
  `pageTitleTranslated=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html')`
- OPS `templates/frontend/pages/preprint.tpl`, line 21: the same on
  `$preprint`.
- OMP `templates/frontend/pages/book.tpl`, line 20:
  `{assign var=pageTitle value=$publishedSubmission->getCurrentPublication()->getLocalizedFullTitle()}`

The line predates versions. `pkp/pkp-lib#4870` gave `ArticleHandler`
and `CatalogBookHandler` the `…/version/{id}` address and moved the
page's body to `$publication`, but left the header line on the
submission (then `$article->getLocalizedTitle()` on OJS and
`$publishedSubmission->getLocalizedFullTitle()` on OMP, both of which
answer for the current publication). OPS took the template over from OJS. Later changes
(`pkp/pkp-lib#7864`, `pkp/pkp-lib#2564`) rewrote the call and kept the
current publication.

Reach:

- The HTML galley's reader page of an older version (OJS,
  `plugins/generic/htmlArticleGalley/templates/display.tpl`, lines 14
  and 29): its tab ("View of {title}") and the title in its bar read
  `$article->getCurrentPublication()`, though the plugin assigns the
  shown version as `$galleyPublication`. Seen on screen on `main`; read
  in the code on 3.5, 3.4 and 3.3.
- Not affected, read in the code: the PDF reader (`pdfJsViewer`) and the
  Lens reader (`lensGalley`) title their pages from `$galleyPublication`;
  an OMP chapter page takes the chapter's title (seen on screen for the
  current version).
- Not the same fault: the Google Scholar and Dublin Core plugins leave an
  older version's page without their tags on purpose (the comment in
  `DublinCoreMetaPlugin` cites `pkp/pkp-lib#4870`).

## Proposed fix

Pass the shown publication's title, as the rest of each page does. One
line per template, and two in the HTML galley's:

```diff
--- a/templates/frontend/pages/article.tpl            (OJS; preprint.tpl on OPS the same)
-{include file="frontend/components/header.tpl" pageTitleTranslated=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
+{include file="frontend/components/header.tpl" pageTitleTranslated=$publication->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}
--- a/templates/frontend/pages/book.tpl               (OMP)
-	{assign var=pageTitle value=$publishedSubmission->getCurrentPublication()->getLocalizedFullTitle()}
+	{assign var=pageTitle value=$publication->getLocalizedFullTitle()}
--- a/plugins/generic/htmlArticleGalley/templates/display.tpl   (OJS, lines 14 and 29)
-{capture assign="pageTitleTranslated"}{translate key="article.pageTitle" title=$article->getCurrentPublication()->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}{/capture}
+{capture assign="pageTitleTranslated"}{translate key="article.pageTitle" title=$galleyPublication->getLocalizedFullTitle(null, 'html')|strip_unsafe_html}{/capture}
-			{$article->getCurrentPublication()->getLocalizedTitle(null, 'html')|strip_unsafe_html}
+			{$galleyPublication->getLocalizedTitle(null, 'html')|strip_unsafe_html}
```

The full diffs:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/fix-ops.diff).
This follows what the code already does: the pages' own headings read
`$publication`, and the PDF and Lens readers read `$galleyPublication`.
The current version's page is unchanged, because there `$publication` is
the current publication.

Tried on `main` on the three apps: after the steps, each older version's
tab reads the title in its heading, and the HTML galley's reader page of
an older version reads that version's title in its tab and bar. The
current version's page and the OMP chapter page read as before.

**Alternatives**

- Assign a page title in the three handlers instead: more code for the
  same result, and the HTML galley template would still need its own
  change.

**What goes with it**

- No stored data is involved, and no API or hook changes. A theme that
  overrides these templates keeps its own line.
- Backport, the landing pages: the 3.5 lines are identical. On 3.4 OJS
  and OPS are identical, and OMP's line reads
  `$publishedSubmission->getLocalizedFullTitle()`; on 3.3 all three read
  the title from the submission. `$publication` is assigned on every one
  of them.
- Backport, the HTML galley template: 3.5 is identical. On 3.4 and 3.3
  lines 12 and 28 read `$article->getLocalizedTitle(…)` (the short
  title in both places), so the change there is
  `$galleyPublication->getLocalizedTitle(…)` with the line's own
  arguments and escaping kept. On both versions the plugin's `articleViewCallback()`
  assigns `galleyPublication`, and line 47 of the same template already
  reads it.
- Guard: an e2e scenario here that reads the document title on an older
  version's page whose title differs (a Planned item in U13 and U69).

Small: a one-line change per app (three in OJS), each landing on its own
in that app's repository, with nothing that has to merge together.

## Evidence

- The kept script,
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/walk.js),
  takes the steps on the three apps and reads the current page again as
  a control.
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/neighbour.js)
  reads the pages the fix must leave alone (the current version's page,
  the OMP chapter page), on the state walk.js leaves.
  [reach-html.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/reach-html.js)
  (OJS) adds an "HTML" galley to version 1.1, publishes it, publishes a
  retitled version 1.2 and opens 1.1's HTML reader page.
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/older-version-tab-current-title/lib.js)
  holds their helpers; the OJS publish step and the galley upload come
  from the `older-version-pdf-reader-empty` and `lens-formulas-not-typeset`
  folders beside it. reach-html.js takes the HTML galley steps. Run each on an install freshly loaded from the
  default dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/older-version-tab-current-title/walk.js`
  (`ojs …/reach-html.js`).
- The fix was tried with `node bin/try-fix.js apply …/fix-<app>.diff <app>`
  on the three apps, then the three scripts, then reverted.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL.
  Nothing here depends on the database (MySQL not checked). Datasets:
  pkp/datasets 38ab955 (2026-09-30). The 3.5 walk saw the same tabs and
  headings, apart from the bracketed step names and version labels.
  neighbour.js and reach-html.js were walked on `main` only.
- The steps set "Title" through the editor's own content call rather
  than by typing; the save is the form's "Save".
- Tips:

  | Line | OJS | OMP | OPS |
  |---|---|---|---|
  | `main` | bade233f73 (lib/pkp 2e377d27fc) | 3b0ecf794c (lib/pkp 3dc90c81a6) | c8af945bb7 (lib/pkp 3dc90c81a6) |
  | `stable-3_5_0` | 92b9a16b48 | 3081c9b00d | cf4fce69bd |
  | `stable-3_4_0` | 9571d8fde7 | 0aec65441f | acd8ae704b |
  | `stable-3_3_0` | 9fdb9bcf9a | 8e72fc8836 | c5532e2161 |
- Code reads:
  - Every line: the header line of `article.tpl`, `preprint.tpl` and
    `book.tpl`; the `'version'` branch and the `'publication'`
    assignment in `ArticleHandler`, `PreprintHandler` and
    `CatalogBookHandler`; the heading in `article_details.tpl`,
    `preprint_details.tpl` and `monograph_full.tpl`; the HTML galley
    plugin's `display.tpl` and its `galleyPublication` assignment.
  - 3.4 and 3.3: `PKPSubmission::getLocalizedFullTitle()` returns the
    current publication's title, so the templates that call it on the
    submission have the same fault.
  - `main`: every `getCurrentPublication()` in the three apps' templates
    and plugin templates. The others are lists, feeds and editorial
    screens, which show the current version by design.
- Trace: `git log -L` on `article.tpl` line 22 shows the call reworded
  by 8933558c42 (`pkp/pkp-lib#7864`), ea10661a46 and facd659a62
  (`pkp/pkp-lib#2564`), each still on the current publication. The line
  became wrong with 0639bdf58d (OJS) and 9cc962b167 (OMP), which added
  the version addresses without touching it. `preprint.tpl` has carried
  the line since OPS was split from OJS.
- Tracker search (2026-10-01): pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops
  and pkp/ui-library, by symptom ("version page title", "older version
  title", "outdated version title", "browser tab title version",
  "previous version title landing") and by `pageTitleTranslated
  getCurrentPublication`. `pkp/pkp-lib#13222` (a versioned preprint
  page without citation tags) and `pkp/pkp-lib#7527` (the issue an
  article's metadata names) are other faults.
- Indexing: `ArticleHandler::view()`, `PreprintHandler::view()` and
  `CatalogBookHandler::book()` add `<meta name="robots"
  content="noindex">` and a `canonical` link to the current page on an
  older version's page; `GoogleScholarPlugin` and `DublinCoreMetaPlugin`
  return before writing any tag on a `version` address; no template or
  plugin in the three apps writes an `og:title`. Read in the code on
  `main`; the pages' tags were also seen on screen for spec U20 (its
  note q15, 2026-09-26).
- Seen on the way and not part of this report: on OMP the older
  version's chapter link answers a server error (U69 A19).
