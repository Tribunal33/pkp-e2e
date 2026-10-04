# A category page's picture opens nothing, and a screen reader hears "null" instead of its "Alternate text"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2361` for `pkp/pkp-lib#4557` · [caa6c07dc7](https://github.com/pkp/ojs/commit/caa6c07dc7cb6f85dae1e309244e3e536274aeb5), [e4e5a42fda](https://github.com/pkp/ojs/commit/e4e5a42fdaadf25ab02ef5d8e534c19abf89f3cd) · 2019-04-16 · commits by thinkbulecount2, PR by mylonelycomputer (these brought in the "null"; the missing link's origin is in the Cause)
- **Upstream** none found (2026-10-02; for the series page 2026-10-04)
- **Tracked in** spec U16 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a6), [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a7); spec U68 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U68-catalog-browse.md#a4)
- **Checked** 2026-10-02, each branch's tip; the series page 2026-10-04 (the commits in Evidence)

Update 2026-10-04: a press's series page has the same fault (spec U68
A4); the sections below now cover it.

## Summary

A manager gives a category a "Cover Image" and types its "Alternate
text". On the category's page the small copy of the picture is not a
link, so readers have no way to the full-size picture. A screen reader
announces the picture as "null" on a journal and a preprint server, and
by the category's name on a press; the alternate text the manager typed
is used nowhere.

A press's series page shows its picture the same way: not a link, with
nothing on the page leading to the full size.

## Impact

- **Lost**: the full-size picture for every reader, and the manager's
  description of the picture for screen-reader users.
- **Who**: readers of every category page that has a picture, and of
  every press's series page that has one. On a journal and a preprint
  server the "null" is there whether or not alternate text was typed.
- **Way round**: none.

Low: the page and its small picture are there, and a literal "null" read
aloud costs a screen-reader user no information, because the category's
name is the page's heading beside the picture.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its category "Applied Science" (path `applied-science`) has no
  picture. The `stable-3_5_0` dataset takes the same steps with the "3.5"
  brackets; its preprint server has no "Applied Science", so on OPS 3.5
  "Social sciences" (path `social-sciences`) takes its place.
- The journal's own folder in the public files folder:
  `public/journals/1` [OMP: `public/presses/1`; OPS: `public/contexts/1`].
  Creating a journal on screen makes it, but the dataset's files hold no
  empty folder, so on a freshly loaded dataset create it by hand.
  Without it the first picture's small copy is never written and shows
  broken on every app.
- A picture `picture.png` on the reader's computer (the walk used a
  400 × 400 PNG).

The category page:

1. Sign in as `rvaca` (password `rvacarvaca`), the Journal manager
   [OMP: Press manager; OPS: Preprint Server manager].
2. Go to Settings › Journal [OMP: Settings › Press; OPS: Settings ›
   Server] and open the "Categories" tab.
3. On the "Applied Science" row, open "More Actions" and choose "Edit"
   [3.5: press "Applied Science" in the list].
4. Under "Cover Image", press "Upload File" and choose `picture.png`.
   Type "u16c3 picture" into "Alternate text" [3.5: no such box].
5. Press "Save" [3.5: "OK"].
6. Open the category's page,
   `/index.php/publicknowledge/catalog/category/applied-science` [OPS:
   `/index.php/publicknowledge/preprints/category/applied-science`]. [OMP:
   the first opening of a press's category page after a settings save
   shows the browser's "sent no data" page, a fault of its own (spec U16
   OMP5); open it again.]
7. Press the picture.

**Expected:** the picture is a link to its full-size version, so step 7
opens it, and a screen reader names it by the alternate text typed at
step 4, "u16c3 picture". [3.5: no "Alternate text" box, so the name is
the category's, "Applied Science" (OPS: "Social sciences").]

**Observed:** step 6 shows the small copy (100 × 100) in this markup
(OJS):

```html
<div class="cover" href="…/index.php/publicknowledge/en/catalog/fullSize?type=category&amp;id=1">
  <img src="…/index.php/publicknowledge/en/catalog/thumbnail?type=category&amp;id=1" alt="null">
</div>
```

The accessibility tree reads `img "null"` [OMP: `img "Applied
Science"`]. Step 7 changes nothing: the browser stays on the category's
page. Typed into the browser, the address in the `div`'s `href` opens
the full-size picture on a journal and a preprint server; on a press it
opens an empty page. [OMP: the page shows a broken picture in place of
the small copy; both are spec U16 OMP1, a fault of its own. 3.5: the
same markup on all three apps; OMP shows its small copy there.]

The series page (OMP only), on a freshly loaded dataset, with the same
`picture.png` (no folder needed: a series picture is kept in the press's
files folder). The dataset's series "History" (path `his`) has no
picture.

1. Sign in as `rvaca` (password `rvacarvaca`), the Press manager.
2. Go to Settings › Press and open the "Series" tab.
3. On the "History" row, open its arrow and choose "Edit".
4. Under "Cover Image", upload `picture.png`, then press "Save".
5. Open the series' page, `/index.php/publicknowledge/catalog/series/his`.
6. Press the picture.

**Expected:** the picture is a link to its full-size version, so step 6
opens it.

**Observed:** step 5 shows the small copy (100 × 100) in this markup:

```html
<div class="cover" href="…/index.php/publicknowledge/en/catalog/fullSize?type=series&amp;id=3">
  <img src="…/index.php/publicknowledge/en/catalog/thumbnail?type=series&amp;id=3" alt=" ">
</div>
```

Step 6 changes nothing: the browser stays on the series' page. Typed
into the browser, the address in the `div`'s `href` opens the full-size
picture (`image/png`, 400 × 400). [3.5: the same markup with
`alt=" History"`. On `main` the `alt` and the page's heading are blank,
a separate fault of the series page, spec U17 [OMP9](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U17-sections.md#omp9).]

## Cause

Two attributes of the picture's markup in each app's
`templates/frontend/pages/catalogCategory.tpl` (OJS and OPS lines 37–38,
OMP lines 39–40) are wrong.

The wrapper is a `div` carrying an `href`, which a `div` cannot use, so
the full-size address it names is dead. Until 2015 OMP wrapped the
picture in `<a class="cover" href="…fullSize…">`. OMP fbe97b889
("Implement grid-like catalog display and nav breadcrumbs", 2015-10-27,
Nate Wright (NateWr), no PR) turned the `a` into a `div` while
rearranging the page, and made the same change on the series page
(`catalogSeries.tpl`). Nothing records the link being dropped on
purpose: the commit names no issue, its message speaks only of the grid
layout, and it kept both the address on the `div` and the `fullSize`
handler that serves it, which nothing else links to. OJS took the markup
in ea9c1cefd4 when categories came to OJS (`pkp/pkp-lib#4158`, 2018),
and OPS inherited it from OJS. So the link half never worked on OJS and
OPS, and has not worked on OMP since 2015.

The `alt` ignores the alternate text the category stores. OJS's 2018
markup named the picture by the category's title, escaped.
`pkp/ojs#2361` (`pkp/pkp-lib#4557`, an accessibility pass, 2019) changed
it in caa6c07dc7 to `{$category->getLocalizedTitle()|default:'null'}`
and in e4e5a42fda to the literal `alt="null"`; OPS carries the same
commits. The 2020 follow-up for the same issue, "Use empty alt
attribute instead of 'null' text" (OJS e609e89a36, OMP 37dd55e41),
replaced "null" in the other OJS templates but missed this one. OMP's
copy has named the picture by the category's title since 2015; OMP
37dd55e41, part of that follow-up, changed its fallback in this template
from `|default:'null'` to `|default:''`. Since
`pkp/pkp-lib#10404` (2025, `main` only) the category window has an
"Alternate text" box, which `CategoryCategoryController::saveCategory()`
stores in `image.altText`, but no template reads it.

Reach:

- The category page on all three apps, and OMP's series page
  (`catalogSeries.tpl` line 38), both walked on `main` and 3.5. A
  series has no "Alternate text" box.
- No other template in the three apps or pkp-lib wraps a picture in a
  `div` with an `href` (checked in the code).
- The same markup is in the three apps' `stable-3_4_0` and
  `stable-3_3_0` templates (checked in the code); 3.5 and older have no
  "Alternate text" box, so there the fault is "null" alone (OJS, OPS)
  and the missing link.

## Proposed fix

Make the wrapper a link and give the picture the stored alternate text,
falling back to the category's name, in each app's
`catalogCategory.tpl` (OJS shown). OMP's line has the same
`page="catalog"` route; only its current `alt` differs
(`|default:''`, not "null"). OPS's line has its own route,
`page="preprints"`:

```diff
-			<div class="cover" href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="fullSize" type="category" id=$category->getId()}">
-				<img src="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="thumbnail" type="category" id=$category->getId()}" alt="null" />
-			</div>
+			<a class="cover" href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="fullSize" type="category" id=$category->getId()}">
+				<img src="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="thumbnail" type="category" id=$category->getId()}" alt="{$image.altText|default:$category->getLocalizedTitle()|escape}" />
+			</a>
```

and in OMP's `catalogSeries.tpl` the same `div` to `a`, with the
picture's `alt` trimmed:

```diff
-				<img src="…" alt="{$series->getLocalizedTitle()|escape|default: 'null'}" />
+				<img src="…" alt="{$series->getLocalizedTitle()|trim|escape}" />
```

OMP's `Section::getLocalizedTitle()` always returns the prefix, a space
and the title, so the value is never empty and the `'null'` fallback can
never apply. The same join gives `alt=" History"` on 3.5 (a series with
no prefix) and `alt=" "` on `main`. `trim` is a modifier pkp-lib's
`PKPTemplateManager` registers, on `main` and back to 3.3.

On the category page the link and the `alt` belong in one change: a
linked image is the link's only content, so it needs a non-empty `alt`
to give the link a name (the problem `pkp/pkp-lib#12668`
raises for article images). That is why the fallback is the category's
name, which is also what OJS had before 2019, rather than the empty
`alt` the 2020 follow-up used for pictures that are not links. The
stylesheets style `.cover` by class (`float: right; width: 20%`), so the
`a` looks as the `div` did.

On a press the link leads to OMP's own `CatalogHandler::fullSize()`,
which on `main` opens an empty page for every category picture, so the
OMP category half depends on the fix in
[U16-OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-OMP1-press-category-picture-broken.md)
and lands with it or after it. The series half has no such
dependency: `fullSize()` serves a series picture on `main`.

The diffs, one per app root:
[a6a7-fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/a6a7-fix-ojs.diff),
[a6a7-fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/a6a7-fix-omp.diff),
[a6a7-fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/a6a7-fix-ops.diff).
Tried on `main` on all three apps. With the fix, step 6's picture is a
link named "u16c3 picture" in the accessibility tree. On a journal and a
preprint server the link opens the full-size picture; on a press it
opened an empty page, since the OMP1 fix was not in. A picture saved
with "Alternate text" left empty is named by its category ("Social
Sciences"), and a category with no picture still shows no picture block.
On OMP's series page (the series steps) the picture became a link and
step 6 opened the full-size picture, with `alt=""` on `main` (re-tried
with the trimmed line); a series with no picture ("Psychology") still
shows no picture block, and the catalog page's book covers are links as
before. The series link should ship regardless: it opens the full
picture now, and gets its name, the series' title, once the series
page's blank title is fixed.

A proposal; the team decides.

**Alternatives**:

- Keep the picture unlinked and drop the dead `href` (and the `fullSize`
  handlers nothing else uses), if the team prefers no link. The `alt`
  part of the fix stands either way, with an empty fallback then, since
  an unlinked picture beside the category's heading is decorative.
- `alt="{$image.altText|escape|default:''}"`, the 2020 pattern: right
  for an unlinked picture, but leaves the link nameless when the box is
  empty.

**What goes with it**:

- No data repair: the alternate text is already stored.
- A question for the team, not part of the fix: `image.altText` is one
  string (`schemas/category.json`, `"type": "string"`), while the
  fallback, the category's name, follows the reader's language. On a
  multilingual journal every language gets the one alternate text
  typed.
- Backport: the same lines on 3.5, 3.4 and 3.3, without `$image.altText`
  (those versions store none), so the fallback alone. On those versions
  OMP's `fullSize()` serves the picture, so no dependency there.
- Test: an e2e check in spec U16 (a **Planned** item) that a category's
  picture links to its full-size version and carries its alternate text,
  and one in spec U68 that a series' picture links to its full size.

Medium: one line in each of three app repositories (three pull
requests, plus OMP's series page), with the OMP category half waiting
on the OMP1 fix.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/walk.js)
  takes these Steps (and those of the sibling reports U16-OMP1 and
  U16-A17), creating the context's public folder first:
  `PART=picture PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/category-picture/walk.js`.
  `WALK=nb-template` in place of `PART` is the check that the fix reaches
  no further: "Social Sciences" with a picture and empty alternate text,
  and "Computer Science" with no picture.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02). No request failed on
  the server and no page script failed, apart from OMP5 (Steps, step 6).
  MySQL not checked (the fault does not depend on the database).
- Kind: the label is the "null" half's (2019); the link half never
  worked on OJS and OPS and was lost on OMP in 2015.
- `pkp/pkp-lib#13242` (open, a new theme built on Blade templates) asks
  that category covers open full screen in that theme; it does not cover
  the default theme's markup.
- The kept script
  [series.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-picture/series.js)
  takes the series steps (OMP only):
  `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js omp shared/playwright/checks/issues/category-picture/series.js`;
  `WALK=nb` is the check that the fix reaches no further ("Psychology",
  no picture, and the catalog page's book covers). Walked on `main` and
  `stable-3_5_0` on 2026-10-04, datasets from pkp/datasets 566bb1f
  (2026-10-03), the fix tried with `a6a7-fix-omp.diff` (its series line
  re-tried on `main` after the `|trim` change). No request failed on the
  server and no page script failed.
- Series page code reads: `catalogSeries.tpl` and
  `CatalogHandler::fullSize()` on `main`; the template on 3.5, 3.4 and
  3.3 (`git show`), the same `div` wrapper on each; its history by
  `git blame` and `git show fbe97b889`, whose parent has
  `<a class="cover" …>` on the series page.
- Not driven: 3.4 and 3.3; a screen reader itself
  (the accessibility tree Chromium builds was read instead).
- Tips:
  - **`main`:** OJS b84f8e2e44 (lib/pkp ddd8ab243a, lib/ui-library
    64d67363), OMP 3b0ecf794 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5), OPS c8af945bb7 (lib/pkp 3dc90c81a6, lib/ui-library
    280f98c5).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246c, OPS 38b61882d3
    (lib/pkp cf3f984335, lib/ui-library d4e01883 in each).
  - **`stable-3_4_0`:** OJS 75cc2d488b, OMP 0aec65441f, OPS acd8ae704b,
    pkp-lib 6f96165c90, ui-library ee684b34.
  - **`stable-3_3_0`:** OJS ac77c9fb35, OMP 8e72fc8836, OPS c5532e2161,
    pkp-lib 4156e50233, ui-library 96959f9e.
- Code reads: on `main`, the templates, stylesheets and classes the
  Cause names, and every template and theme for `altText` and
  `getImage()`; the history by `git log -L` on the image lines in each
  app; on 3.5, 3.4 and 3.3 the same templates (`git show`).
