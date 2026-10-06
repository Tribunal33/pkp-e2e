# A click on a cover beside its summary text opens nothing, in a journal's issue page and a server's lists

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: OJS, OPS (code)
- **Introduced** `pkp/ojs#940` for `pkp/pkp-lib#1390` · [dba7c4b5a2](https://github.com/pkp/ojs/commit/dba7c4b5a27a4cef47c433addcd0444ff73d52ab) · 2016-07-22 · Nate Wright (NateWr) (the issue page); `pkp/ojs#1127` for `pkp/pkp-lib#2069` · [325957baf4](https://github.com/pkp/ojs/commit/325957baf4b48a0fc598a8d0da70a94a23eb8d3b) · 2016-12-07 · Nate Wright (NateWr) (every other list, OPS's included)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U13 [OPS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ops9) (the journal side was found while writing this report; U13 has no entry for it)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

On a preprint server's lists ("Archives", the home page's "Latest
preprints", section, category and search pages), a preprint's cover
image sits to the right of its author line, keywords and "Downloads …
Posted" line. On a screen 768 px wide or wider, a click or tap on the
cover beside those lines does nothing. The dead band runs from just
under the title to just under the "Downloads" line; on a square cover
that is about the middle half. Above and below the band the cover opens
the preprint.

A journal's issue page and its other article lists do the same in the
row of the author line, about an eighth of a square cover's height.

The title and the rest of the cover still open the page, so readers get
there with a second click.

## Impact

- **Lost.** Nothing. A click in the band leaves the list as it is, with
  no message.
- **Who.** Every visitor on a screen 768 px wide or wider, on a server
  or journal using the default theme, for every preprint or article
  that has a cover image.
- **Way round.** Click the title, or the cover above or below the text.

Low: the reader still reaches the page from the same summary. It would
be higher only if the cover were the summary's only link.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OPS `main` (`publicknowledge`, "Public
  Knowledge Preprint Server") for the server; OJS `main` for the
  journal. No preprint or article in the dataset has a cover image, so
  the steps upload one.
- A square picture for the cover (the walk used a 400 × 400 px PNG). At
  25 % of the column's width it shows 200 px tall, taller than the text
  beside it. A wide, short picture can sit entirely beside the text.
- A browser window 768 px wide or wider (the walk used 1280 × 900).
  Below that width the cover sits above the text instead of beside it.

Preprint server (OPS):

1. Sign in as `dbarnes` (Preprint Server manager).
2. Open preprint 2, "The Facets Of Job Satisfaction: A Nine-Nation
   Comparative Study Of Construct Equivalence", from the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=2`).
   It is posted and has the keywords "employees" and "survey".
3. In the left menu under "Preprint", click "Preprint entry". Under
   "Cover Image" upload the picture, and click "Save".
4. Open the server's home page (`/index.php/publicknowledge/en`) and
   click "Archives" in its main menu
   (`/index.php/publicknowledge/en/preprints`).
5. In the summary of "The Facets Of Job Satisfaction…", click the
   middle of the cover image, level with the keywords.
6. Go back, and click the cover near its top edge, then near its bottom
   edge.

**Expected.** Each click opens the preprint's page,
`/index.php/publicknowledge/en/preprint/view/2`, as the title does.

**Observed.** The click in step 5 does nothing; the page stays on
"Archives". The element under the pointer there is the keyword list
(`ul.keyword_links`), not the cover's link. Down the cover's middle,
only the top 40 px and the bottom 62 px of the 200 px cover open the
preprint. Every point between them, beside the author line, the
keywords and "Downloads: 0 - Submitted … - Posted …", is part of the
text block. Both clicks in step 6 open the preprint.

Journal (OJS):

1. Sign in as `dbarnes` (Journal editor).
2. Open submission 17, "Antimicrobial, heavy metal resistance and
   plasmid profile of coliforms isolated from nosocomial infections in a
   hospital in Isfahan, Iran", from the dashboard
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=17`).
   It is published in Vol. 1 No. 2 (2014), the current issue.
3. Under "Publication", click "Publication Settings" ("Issue" on 3.5).
   Under "Cover Image" upload the picture, and click "Save".
4. Open "Current" in the journal's main menu
   (`/index.php/publicknowledge/en/issue/current`).
5. In the article's summary, click the cover level with the author line
   (the line of names just under the title, about 50 px below the
   cover's top).
6. Go back, and click the middle of the cover.

**Expected.** Both clicks open the article's page,
`/index.php/publicknowledge/en/article/view/17`.

**Observed.** The click in step 5 does nothing; the element under the
pointer is the author line (`div.authors`). The author line's row, 25
px of the 200 px cover, is dead. The click in step 6 opens the article.

A press's catalog (OMP) has no dead area: a click anywhere on a book's
cover opens the book.

## Cause

Both default themes float the summary's cover beside a text block,
`.meta`, that has `position: relative`. A block beside a float still
spans the float's area; only its lines of text move aside. A positioned
box is painted above floats, so the `.meta` box lies on top of the
cover in every row it fills and takes the click. The cover is a link,
but `.meta` is not.

- OPS `plugins/themes/default/styles/objects/preprint_summary.less`:
  `.obj_preprint_summary .meta { position: relative; }` (line 53) and,
  from tablet width, `.cover { float: right; width: 25%; }` (lines
  117–123). `templates/frontend/objects/preprint_summary.tpl` puts the
  author line, the DOI line, the keywords and the details line in
  `.meta`. On the walk that box was 98 px tall beside a 200 px cover.
  Nothing inside OPS's `.meta` is positioned, so the declaration does
  nothing useful on OPS.
- OJS `plugins/themes/default/styles/objects/article_summary.less`: the
  same `.meta { position: relative; }` (line 47) beside
  `.cover { float: left; }`. Here it anchors the page numbers,
  `.pages { position: absolute; top: 0; right: 0; }`. On the issue page
  `issue_toc.less` floats the same cover a second time, because its
  `.obj_issue_toc .cover { float: left; width: 25%; }` (lines 94–100)
  matches every cover inside the table of contents. OJS's `.meta` holds
  the author line, the pages and, on search results, the date, so the
  band is one or two text rows.

History: the positioned `.meta` dates from the first default theme
(a1a28884210, 2015). dba7c4b5a2 ("Add cover image to issue archive and
toc pages", `pkp/pkp-lib#1390`) floated covers on the issue page,
article covers included. 325957baf4 ("Improve layout of article cover
images in article summary when image is taller than wide",
`pkp/pkp-lib#2069`) floated them in every summary. OPS took the
stylesheet over from OJS with both rules. In OPS, 7a99d23d47 ("Revise
front page css", ajnyga, 2020-02-28, no PR) floated the cover right and
added the DOI and keyword blocks to `.meta`. 9ec2611a9b
(`pkp/pkp-lib#5610`, 2020-05-18) turned the dates line already inside
`.meta` into today's details line. Together these widened the band to
the cover's middle.

Reach:

- OPS: every list that includes `preprint_summary.tpl`: the home page
  (`indexServer.tpl`), "Archives" (`preprints.tpl`), `sections.tpl`,
  `catalogCategory.tpl` and `search.tpl`. Checked on screen for
  "Archives"; the others in the code, which shows the same template and
  stylesheet.
- OJS: every list that includes `article_summary.tpl`: `issue_toc.tpl`
  (the issue page and the home page's "Current Issue"),
  `latest_article.tpl`, `catalogCategory.tpl` and `search.tpl`. Checked
  on screen for the issue page; the others in the code.
- OMP: `monograph_summary.less` floats the cover too, but nothing beside
  it is positioned, and a left margin moves the text aside. Checked on
  screen: no dead area.
- The issue's own cover on the issue page and in the archive
  (`issue_toc.less` `.heading`, `issue_summary.less`) floats beside text
  that is not positioned. Checked in the code: not affected.
- Right-to-left interfaces: `rtl.less` floats the OJS article cover to
  the right, under the page numbers. Today the page numbers are drawn on
  top of the cover there. Checked by switching the page to right-to-left
  in the browser. OPS's cover floats right in both directions and has no
  page numbers.

## Proposed fix

Lift the floated cover above the text block in both themes, in the
rule that floats it. On OJS, also move the page numbers to the left in
right-to-left layouts, so the lifted cover does not hide them. This is
a proposal; the team decides.

```diff
--- a/plugins/themes/default/styles/objects/preprint_summary.less
+++ b/plugins/themes/default/styles/objects/preprint_summary.less
@@ -114,7 +114,11 @@
 			padding-right: 5em;
 		}
 
+		// Above .meta, whose position: relative would otherwise draw the
+		// text block's box over the floated cover and swallow presses on it.
 		.cover {
+			position: relative;
+			z-index: 1;
 			float: right;
 			width: 25%;
 			height: auto;
```

OJS takes the same two lines in `article_summary.less`, plus this in
`rtl.less`, which already mirrors the summary's padding to the left
side:

```diff
--- a/plugins/themes/default/styles/rtl.less
+++ b/plugins/themes/default/styles/rtl.less
@@ -159,6 +159,12 @@
 		@media(min-width: @screen-tablet) {
 			padding-right: 0;
 			padding-left: 5em;
+
+			// The cover floats right here: keep the page numbers clear of it
+			.pages {
+				right: auto;
+				left: 0;
+			}
 		}
 	}
```

Diffs:
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-cover-middle-dead/fix-ops.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-cover-middle-dead/fix-ojs.diff).
A positioned cover with a z-index is painted above `.meta`, whose
z-index is `auto`. The text lines already avoid the float, so the
cover's link works over its whole area, and OJS keeps the positioning
context its page numbers need. The `rtl.less` lines mirror the page
numbers' place, as that file mirrors the other positioned parts.

Tried on OJS and OPS `main`. With the fix, every point down the cover's
middle is part of the cover's link. Clicks at the middle, top, bottom
and the text block's row open the preprint and the article. The
summaries' boxes measured the same with and without the fix. A click on
a keyword beside the cover still opens nothing, and the title still
opens the page. With the page switched to right-to-left, the page
numbers sit at the left, clear of the cover.

**Alternatives**

- Delete `position: relative` from OPS's `.meta`. That fixes OPS, where
  nothing in `.meta` is positioned. It does not fix OJS, which needs the
  rule for the page numbers.
- Make `.meta` a block formatting context (`display: flow-root` or
  `overflow: hidden`). That keeps the whole text block beside the cover,
  even below it, which changes the layout when the text runs longer than
  the cover.
- Give `.meta` `pointer-events: none`. That would also turn off the DOI
  link inside it.

**What goes with it**

- No stored data and no template change. Child themes that copy these
  stylesheets are not covered. Bootstrap3, Health Sciences and the other
  community themes were not checked.
- Backport: both diffs apply as they stand to `stable-3_5_0` and
  `stable-3_4_0`, and the OJS diff to `stable-3_3_0`. OPS 3.3 needs its
  own diff: the rules there are in `article_summary.less`, under the
  class `.obj_article_summary`.
- Guard: an e2e check on the server's "Archives" and the journal's issue
  page that the element at the cover's centre, and at the author line's
  row, is inside the cover's link (a **Planned** item in U13).

Small: two lines in each app's own theme stylesheet, plus a four-line rule in
OJS's `rtl.less`. The two apps' changes do not depend on each other and
can land separately. No data, API or plugin hook is touched.

## Evidence

- Kept scripts:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-cover-middle-dead/walk.js)
  takes the Steps on OPS and OJS on an install freshly loaded from the
  default dataset, and on OMP it clicks a book's cover in the catalog. It
  records the element under the pointer at eleven points down each
  cover's middle (`document.elementFromPoint`), clicks the middle, top,
  bottom and the text block's row, and reads three checks beside the
  cover: the title click, a click on the keyword "employees", and the
  layout of preprint 15 "Yam diseases and its management in Nigeria",
  which has no cover.
  [rtl-check.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/preprint-summary-cover-middle-dead/rtl-check.js)
  gives OJS submission 17 a cover and the pages "71-98", sets
  `body[dir="rtl"]` in the browser (the dataset has no right-to-left
  language), and reads the page numbers' box against the cover's. Run
  either with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/preprint-summary-cover-middle-dead/<script>`.
  The fix was tried by applying `fix-ops.diff` and `fix-ojs.diff` and
  running the same scripts.
- On 3.5 the OJS author-line band was read with `elementFromPoint` and
  not clicked: the text-row click was added to the script after the 3.5
  walk. On `main` it was clicked.
- Home page: the dataset's ten "Latest preprints" share one posting day,
  so which ten show is not fixed, and preprint 2 was not among them on
  any walk. The home page uses the same template and stylesheet.
- Walked on `main` and `stable-3_5_0` (OJS, OMP, OPS), PostgreSQL, at
  1280 × 900 in Chromium. Nothing here depends on the database. Other
  browsers, other widths of 768 px or more, and touch input were not
  checked. Datasets: pkp/datasets fetched at 38ab955 (2026-09-30).
- Tips: OPS `main` c8af945bb7, OJS `main` bade233f73, OMP `main`
  3b0ecf794c; OPS `stable-3_5_0` cf4fce69bd, OJS 92b9a16b48, OMP
  3081c9b00; OPS `stable-3_4_0` acd8ae704b, OJS 9571d8fde7; OPS
  `stable-3_3_0` c5532e2161, OJS 9fdb9bcf9a.
- Code reads: `preprint_summary.less` and `preprint_summary.tpl` (OPS),
  and `article_summary.less`, `article_summary.tpl` and `rtl.less`
  (OJS), on each line. 3.5 and 3.4 have `.meta { position: relative; }`
  beside the floated cover, and on OPS the keywords and details are
  inside `.meta`. OPS 3.3 has the same rules and `.meta` content in
  `article_summary.less` (`.obj_article_summary`). OJS 3.3 matches
  `main`. The diffs were dry-run with `patch` against each line's files.
  Also read on `main`: OMP `monograph_summary.less`, OJS
  `issue_toc.less` and `issue_summary.less`, and OPS `rtl.less`.
- Introduced: `git blame` on OPS `preprint_summary.less` line 53
  (`position: relative`) gives a1a28884210 (Nate Wright, 2015-11-03).
  Blame on OJS `issue_toc.less` lines 94–100 gives 2019 moves
  (fb66ded3779, 8da4c723cbf); the float there is from dba7c4b5a2. The
  GitHub API maps dba7c4b5a2 to `pkp/ojs#940` and 325957baf4 to
  `pkp/ojs#1127`, both by NateWr. Blame on OPS's `float: right` and on
  the DOI and keyword blocks gives 7a99d23d47, for which the API names
  no pull request. The `.details` block blames to 9ec2611a9b.
- Tracker search, 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ops issues and
  PRs for "cover image click", "cover image link", "cover image not
  clickable", "cover image summary link", "cover keywords",
  "preprint_summary cover", "article_summary cover", "obj_preprint_summary"
  and "cover z-index". The nearest results were `pkp/ojs#1371` (the
  title link's address) and `pkp/ojs#3485` (removing the issue cover's
  link on the home page); neither is this fault.
