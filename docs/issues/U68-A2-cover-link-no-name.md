# Covers in book, article, preprint and issue lists are links a screen reader announces without a name

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/omp#773` for `pkp/pkp-lib#5561` · [7115fe83ac](https://github.com/pkp/omp/commit/7115fe83ac26caf391f42be88373986e0b7893c8) · 2020-02-28 · Nate Wright (NateWr) (book lists); `pkp/ojs#2361` for `pkp/pkp-lib#4557` · [c3ecd6583e](https://github.com/pkp/ojs/commit/c3ecd6583e210a8959d8f8632d334ec1c1688ae4) · 2019-04-29 · commit by thinkbulecount2, PR by E.L. Guerrero (mylonelycomputer) (article lists; OPS copied them)
- **Upstream** `pkp/pkp-lib#12668` (open, OJS's article lists), `pkp/pkp-lib#12665` (open, OMP's book lists, filed as the cover and title being two links to one page; its discussion proposes the hiding fix this report tries); this report adds OPS, journal issue lists, the detail pages' cover links and the default picture that cannot be named
- **Tracked in** spec U68 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a2)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

On a press's catalog page, a series' page, the "New Releases" page, a
category's page and the home page's lists, each book shows its cover as
a link to the book, right before its title. The title link right after
the cover opens the same page.
A screen reader announces that cover link with no name. The cover
picture is the link's only content, and its "Alternate text" is empty
unless the press typed one.

A book with no "Cover Image" shows the default picture, whose
"Alternate text" is always empty: the Catalog Entry page offers no
"Alternate text" box until an image is uploaded. On a press that has not
uploaded covers, every book in every list has a nameless link.

A journal's article and issue lists and a preprint server's lists do the
same for each article, issue or preprint whose cover has no "Alternate
text".

## Impact

- **Lost**: nothing is lost. Screen-reader users meet a link with no
  name before every title, and keyboard users an extra Tab stop on the
  picture.
- **Who**: readers using a screen reader or the keyboard, on sites with
  the default theme: on every list of books on a press, and on a
  journal's or server's lists for items with a cover but no "Alternate
  text".
- **Way round**: the title link right after the cover opens the same
  page. A press can name
  an uploaded cover by typing its "Alternate text", but cannot name the
  default picture.

Low: through the title link no reader is kept from a book. It would be medium if the cover were an item's only link.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OMP, OJS or OPS), freshly
  loaded. No book, article, preprint or issue in it has a cover image.
  The `stable-3_5_0` dataset takes the same steps with the "3.5"
  brackets.
- A picture `cover.png` on the reader's computer (the walk used a
  400 × 400 PNG).
- A screen reader, or the browser's accessibility inspector (Chrome
  DevTools › Elements › Accessibility, "Name"), to read each link's
  name.

The press, default pictures:

1. Signed out, open the press's home page and choose "Catalog" in the
   header. It lists "Bomb Canada and Other Unkind Remarks in the
   American Media" (submission 5) and "From Bricks to Brains: The
   Embodied Cognitive Science of LEGO Robots" (submission 14), each with
   the default cover picture.
2. Read the name of each cover link, the link before each title.
3. Open "From Bricks to Brains…", then "Psychology" under "Series" on
   its page. Read the name of the book's cover link on the series' page.

The press, an uploaded cover:

4. Sign in as `dbarnes` (password `dbarnesdbarnes`) and open submission
   14, "From Bricks to Brains…". Open "Catalog Entry" under
   "Publication": "Cover Image" offers "Upload File" and no "Alternate
   text" box.
5. Press "Unpublish" and confirm with "Unpublish".
6. On "Catalog Entry", upload `cover.png` under "Cover Image". An
   "Alternate text" box appears; leave it empty and press "Save".
7. Press "Publish" and confirm with "Publish".
8. Sign out, open "Catalog" and read the name of book 14's cover link.
9. Open "From Bricks to Brains…", then "Chapter 1: Mind Control—Internal
   or External?" under "Chapters", and read the name of the cover's link
   on the chapter's page.

The journal:

1. Sign in as `dbarnes` and open submission 1, "Signalling Theory
   Dividends". It opens on its version 1.1, not yet published, in "Vol.
   1 No. 2 (2014)".
2. Open "Publication Settings" under "Publication" [3.5: "Issue"],
   upload `cover.png` under "Cover Image", leave "Alternate text" empty
   and press "Save".
3. Press "Publish" and confirm with "Publish".
4. Open "Issues", the "Back Issues" tab, and "Edit" on "Vol. 1 No. 2
   (2014)". On "Issue Data", upload `cover.png` under "Cover Image" and
   press "Save" (this form shows its "Alternate text" box only once a
   cover is saved).
5. Sign out and open the journal's home page, which shows "Vol. 1 No. 2
   (2014)". Read the name of the article's cover link.
6. Choose "Archives" in the header and read the name of the issue's
   cover link.
7. Open the article "Antimicrobial, heavy metal resistance and plasmid
   profile of coliforms…" (submission 17, no cover of its own) and read
   the name of the issue cover's link on its page.

The preprint server:

1. Sign in as `dbarnes` and open submission 2, "The Facets Of Job
   Satisfaction…".
2. Press "Unpost" and confirm with "Unpost".
3. Open "Preprint Entry" under "Publication", upload `cover.png` under
   "Cover Image", leave "Alternate text" empty and press "Save".
4. Press "Post" and confirm with "Post".
5. Sign out, choose "Archives" in the header and read the name of the
   preprint's cover link (it is last in the list).

**Expected:** each cover link either has a name a screen reader can say,
or is left out of the screen reader's reading and of the Tab order, as a
repeat of the title link right after it.

**Observed:** every cover link in steps 2, 3, 8 and 9 (press), 5, 6
and 7 (journal) and 5 (server) is a link with an empty name, the same on
3.5; where a cover was uploaded, the link holds only that picture, with
`alt=""`.
The catalog's markup, step 1:

```html
<a href="…/index.php/publicknowledge/en/catalog/book/5" class="cover">
  <img src="…/templates/images/book-default_t.png" alt="">
</a>
```

The accessibility tree of the first book there:

```
- link:
  - /url: …/index.php/publicknowledge/en/catalog/book/5
- heading "Bomb Canada and Other Unkind Remarks in the American Media" [level=2]:
  - link "Bomb Canada and Other Unkind Remarks in the American Media":
    - /url: …/index.php/publicknowledge/en/catalog/book/5
```

With "Alternate text" "u68a cover" typed in step 6, book 14's cover
link is named "u68a cover".

## Cause

Each app's default-theme summary template wraps the cover in a link of
its own, separate from the title's link, and the `<img>` is that link's
only content. A link takes its name from its content, and an image's
contribution is its `alt`, so an empty `alt` leaves the link with no
name. The templates set `alt` to the stored alternate text and fall back
to an empty string:

- OMP `templates/frontend/objects/monograph_summary.tpl` lines 15–21:
  `<a … class="cover"><img src="…" alt="{$coverImage.altText|escape|default:''}"></a>`
- OJS `templates/frontend/objects/article_summary.tpl` lines 34–40 (the
  same `alt`) and `issue_summary.tpl` lines 21–23
  (`alt="{$issue->getLocalizedCoverImageAltText()|escape|default:''}"`)
- OPS `templates/frontend/objects/preprint_summary.tpl` lines 32–38 (the
  same `alt`)

This fails WCAG 2.4.4 and 4.1.2.

Until 2020 OMP named the cover "Cover Image" (`alt="{translate
key="catalog.coverImageTitle" …}"`). 7115fe83ac (`pkp/omp#773`, which
moved the catalog to the publication's cover data) replaced it with the
stored alternate text and the empty fallback. OJS named an article's
cover "Cover Image" (`article.coverPage.altText`) until `pkp/ojs#2361`
for `pkp/pkp-lib#4557` ("Images without alt text should have alt set to
null", an accessibility pass) changed the fallback to "null" in
c3ecd6583e. e609e89a36 (2020, also for `pkp/pkp-lib#4557`) then turned
"null" into an empty `alt`. OPS, forked from OJS in 2019, carries
c3ecd6583e and made the second change in its own 68e367eed5. A journal
issue's summary has never named its cover: before `pkp/ojs#2361` it
left the `alt` out when empty.

On a press every book has a picture. OMP's
`Publication::getLocalizedCoverImageUrl()` returns
`templates/images/book-default.png` when the book has no cover, and
`getLocalizedCoverImageThumbnailUrl()` derives the small copy
`book-default_t.png` from it. The Catalog Entry's "Cover Image" field (ui-library
`FieldUploadImage.vue`) shows its "Alternate text" box only once an image
is there (`v-if="currentValue"`), so the default picture can never be
named.

Reach:

- OMP's lists: the catalog, a series' page, "New Releases", a category's
  page, the home page's "Featured" and "New Releases" lists and search
  results, all through `monographList.tpl` or `search.tpl` including
  `monograph_summary.tpl` (code); the catalog and a series' page walked.
- OMP's chapter page: `chapter.tpl` lines 135–149 wrap the cover in a
  link to the book, with the same empty `alt` fallback; unnamed on the
  walk. The page's other link to the book, under "Volume", sits further
  down the side column, after the chapter's files.
- OJS's article summaries: the home page's current issue, journal issue pages,
  the home page's list of latest articles, category pages and search results (code); the home
  page walked. Journal issue summaries: "Archives", walked.
- OJS's article page: an article without a cover of its own shows the
  journal issue's cover as a link to that issue (`article_details.tpl`
  lines 319–321); unnamed on the walk. The page's other link to the
  issue, under "Issue", sits further down the side column, after the
  galleys and the "Published" item.
- OPS's preprint summaries: "Archives", the home page, section,
  category and search pages (code); "Archives" walked.
- Not covered here: the site's list of journals, presses or servers
  (`indexSite.tpl`, all three apps) links each context's thumbnail
  beside its name, and the thumbnail has no `alt` attribute when none
  was typed. It is shown only on a site that hosts several contexts;
  not walked.
- Not the same fault: a click on the middle of an OPS or OJS cover that
  opens nothing ([U13-OPS9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U13-OPS9-preprint-summary-cover-middle-dead.md)),
  and a category's picture that is not a link
  ([U16-A6-A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-A6-A7-category-picture-not-link-alt-null.md)).

## Proposed fix

In the lists, take each cover link out of the accessibility tree and the
Tab order, since the title link right after it goes to the same page and
carries the name: add `aria-hidden="true" tabindex="-1"` to the cover's
`<a>` in `monograph_summary.tpl`, `article_summary.tpl`,
`issue_summary.tpl` and `preprint_summary.tpl`. OMP's summary:

```diff
-		<a {if $press}href="…"{else}href="…"{/if} class="cover">
+		<a {if $press}href="…"{else}href="…"{/if} class="cover" aria-hidden="true" tabindex="-1">
```

On the two detail pages the other link to the same page is far down the
side column, so hiding the cover would leave nothing near it. There the
fix names the link instead, falling back from the typed "Alternate text":
OMP's `chapter.tpl` to the book's full title, and OJS's
`article_details.tpl` to "View {issue}" (`issue.viewIssueIdentification`),
the fallback OJS's `issue_toc.tpl` already uses for the same picture:

```diff
 				{assign var="coverImage" value=$publication->getLocalizedData('coverImage')}
+				{assign var="bookTitle" value=$publication->getLocalizedFullTitle()}
 				<img
 					src="…"
-					alt="{$coverImage.altText|escape|default:''}"
+					alt="{$coverImage.altText|default:$bookTitle|escape}"
 				>
```

The diffs: [fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cover-link-no-name/fix-omp.diff),
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cover-link-no-name/fix-ojs.diff)
and [fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cover-link-no-name/fix-ops.diff).

Hiding is the pattern proposed in the discussion of `pkp/pkp-lib#12665`
for the list links. It removes both the unnamed stop and the duplicate
stop that `pkp/pkp-lib#12665` and `pkp/pkp-lib#12668` ask to remove, and
mouse and touch users keep the cover as a click target. It keeps the
intent of `pkp/pkp-lib#4557`: a screen reader skips a picture that adds
nothing.

The fix was tried on `main` on all three apps. In the lists every cover
link was left out of the accessibility tree and the Tab order, and every
title link kept its name and its Tab stop. The chapter page's cover link
was named "From Bricks to Brains: The Embodied Cognitive Science of LEGO
Robots", and the article page's issue cover link "View Vol. 1 No. 2
(2014)". With "Alternate text" "u68a cover" typed, the chapter page's
cover link took that name, and book 14's own page named its cover "u68a
cover" with the fix in and out.

**Alternatives:**

- In the lists too, fall back to the item's title as the `alt`, as the
  detail pages do (OMP had "Cover Image" before 2020). This names the
  link, but leaves two Tab stops per item with the same name.
- One link around both the cover and the title. This gives one stop, but
  changes the summaries' markup and the default theme's floated layout,
  where the click area is already uneven (U13-OPS9).
- Drop the cover's link. This loses the larger click target.

**What goes with it:**

- A typed "Alternate text" is no longer read in the lists. It is still
  read on the item's own page and the chapter page. If the team wants it
  read in lists too, that is the first alternative, at the cost of the
  duplicate stop.
- No stored data, REST API or plugin hook changes. Themes that copy these
  templates (child themes, third-party themes) need the same change.
- Backport: the three diffs apply as they stand to `stable-3_5_0`.
  `stable-3_4_0` and `stable-3_3_0` have the same markup (OMP 3.3 has no
  chapter page).
- Guard: an e2e check in U68 that a book summary's cover link is out of
  the accessibility tree and its title link is named (a **Planned** item
  in the spec).

This is a proposal; the team decides between hiding the duplicate and
naming it.

Medium: a few lines in six templates, but across three app
repositories.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/cover-link-no-name/walk.js)
  (helpers in `lib.js` beside it). It takes the Steps on all three apps
  and reads each cover and title link's role and name from Chrome's own
  accessibility tree (DevTools Protocol `Accessibility.getPartialAXTree`,
  what a screen reader is given). On an install loaded from the default
  dataset:
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/cover-link-no-name/walk.js`;
  `WALK=nb` runs the neighbour check (OMP, "Alternate text" typed).
- The fix trial: the three diffs applied with `node bin/try-fix.js apply
  …/fix-<app>.diff <app>`, the dataset reloaded, the walk run on all three
  apps and the neighbour check run with the fix in and out, then
  reverted; after the detail pages' change, OMP and OJS were tried again
  the same way. The walk opens the chapter page of step 9 by its
  address.
- Tips walked: `main` OJS ff004d0973 (pkp-lib 987776cd04, ui-library
  64d67363), OMP 3b0ecf794c and OPS c8af945bb7 (pkp-lib 3dc90c81a6,
  ui-library 280f98c5); `stable-3_5_0` OJS c1cee76b95 (pkp-lib
  771474347e), OMP 9c5e24246c, OPS 38b61882d3 (pkp-lib cf3f984335);
  pkp/datasets 566bb1f (2026-10-03), PostgreSQL.
- 3.4 and 3.3 (code): `git show upstream/stable-3_4_0:` and
  `upstream/stable-3_3_0:` of `templates/frontend/objects/monograph_summary.tpl`,
  `chapter.tpl` (3.4; none on 3.3), `article_summary.tpl`,
  `issue_summary.tpl`, `article_details.tpl` and `preprint_summary.tpl`.
  These hold the same cover link with the empty `alt` fallback, and
  OMP's `classes/publication/Publication(.inc).php` returns the
  default picture there too. Tips: OJS d68934d0d1 / ac77c9fb35, OMP
  0aec65441 / 8e72fc883, OPS acd8ae704b / c5532e2161 (3.4 / 3.3).
- Introduced: `git blame` of `monograph_summary.tpl` line 19 gives
  0028b7d8c2 (`pkp/omp#795`, re-indentation only); `git log -S altText`
  on that file gives 7115fe83ac. On OJS, `git log -S altText` and `-S
  "default:'null'"` on `article_summary.tpl` give c3ecd6583e and
  e609e89a36. The PRs were read from GitHub's `commits/<sha>/pulls`.
- Upstream search (2026-10-04): pkp/pkp-lib, pkp/omp, pkp/ojs, pkp/ops
  and pkp/ui-library, by phrases such as "cover image link accessible name" and "redundant
  link cover image", and by `monograph_summary` and `article_summary`. Only
  `pkp/pkp-lib#12665` and `#12668` match; no PR references either.
  `pkp/pkp-lib#9417` (make the issue cover's alternate text required) is
  related, not the same.
- Not driven: the "New Releases" page, category pages, the home page's
  "Featured" and "New Releases" lists and search results (code only);
  the site's list of contexts; a real screen reader. What each screen
  reader says for a nameless link (nothing, "link", the address or the
  file name) is unverified.
- The walk creates the context's public folder first, which the
  dataset lacks; the Steps do not need it, since the cover's copy
  (`FileManager::copyFile()`, through `PKPPublicFileManager::copyContextFile()`)
  creates a missing folder.
