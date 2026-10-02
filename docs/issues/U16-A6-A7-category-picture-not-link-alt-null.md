# A category page's picture opens nothing, and a screen reader hears "null" instead of its "Alternate text"

- **Severity** low
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/ojs#2361` for `pkp/pkp-lib#4557` · [caa6c07dc7](https://github.com/pkp/ojs/commit/caa6c07dc7cb6f85dae1e309244e3e536274aeb5), [e4e5a42fda](https://github.com/pkp/ojs/commit/e4e5a42fdaadf25ab02ef5d8e534c19abf89f3cd) · 2019-04-16 · commits by thinkbulecount2, PR by mylonelycomputer (the "null"; the missing link: Cause)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A6](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a6), [A7](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a7)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager gives a category a "Cover Image" and types its "Alternate
text". On the category's page the small copy of the picture is not a
link, so readers have no way to the full-size picture. A screen reader
announces the picture as "null" on a journal and a preprint server, and
by the category's name on a press; the alternate text the manager typed
is used nowhere.

## Impact

- **Lost**: the full-size picture for every reader, and the manager's
  description of the picture for screen-reader users.
- **Who**: readers of every category page that has a picture. On a
  journal and a preprint server the "null" is there whether or not
  alternate text was typed.
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
step 4, "u16c3 picture".

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

## Cause

Two attributes of the picture's markup in each app's
`templates/frontend/pages/catalogCategory.tpl` (OJS and OPS lines 37–38,
OMP lines 39–40) are wrong.

The wrapper is a `div` carrying an `href`, which a `div` cannot use, so
the full-size address it names is dead. Until 2015 OMP wrapped the
picture in `<a class="cover" href="…fullSize…">`. OMP fbe97b889
("Implement grid-like catalog display and nav breadcrumbs", 2015-10-27,
Nate Wright (NateWr), no PR) turned the `a` into a `div` while
rearranging the page. Nothing records the link being dropped on
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
copy has named the picture by the category's title since 2015. Since
`pkp/pkp-lib#10404` (2025, `main` only) the category window has an
"Alternate text" box, which `CategoryCategoryController::saveCategory()`
stores in `image.altText`, but no template reads it.

Reach:

- The category page on all three apps (walked on `main` and 3.5); OMP's
  series page has the same `div` wrapper (`catalogSeries.tpl` line 38,
  checked in the code; a series has no alternate text box).
- The same markup is in the three apps' `stable-3_4_0` and
  `stable-3_3_0` templates (checked in the code); 3.5 and older have no
  "Alternate text" box, so there the fault is "null" alone (OJS, OPS)
  and the missing link.

## Proposed fix

Make the wrapper a link and give the picture the stored alternate text,
falling back to the category's name, in each app's
`catalogCategory.tpl` (OJS shown; OMP and OPS are the same line with
their own route):

```diff
-			<div class="cover" href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="fullSize" type="category" id=$category->getId()}">
-				<img src="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="thumbnail" type="category" id=$category->getId()}" alt="null" />
-			</div>
+			<a class="cover" href="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="fullSize" type="category" id=$category->getId()}">
+				<img src="{url router=PKP\core\PKPApplication::ROUTE_PAGE page="catalog" op="thumbnail" type="category" id=$category->getId()}" alt="{$image.altText|default:$category->getLocalizedTitle()|escape}" />
+			</a>
```

and in OMP's `catalogSeries.tpl` the same `div` to `a`. The two belong
in one change: a linked image is the link's only content, so it needs a
non-empty `alt` to give the link a name (the problem `pkp/pkp-lib#12668`
raises for article images). That is why the fallback is the category's
name, which is also what OJS had before 2019, rather than the empty
`alt` the 2020 follow-up used for pictures that are not links. The
stylesheets style `.cover` by class (`float: right; width: 20%`), so the
`a` looks as the `div` did.

On a press the link leads to OMP's own `CatalogHandler::fullSize()`,
which on `main` opens an empty page for every category picture, so the
OMP half depends on the fix in
[U16-OMP1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U16-OMP1-press-category-picture-broken.md)
and lands with it or after it.

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
- Backport: the same lines on 3.5, 3.4 and 3.3, without `$image.altText`
  (those versions store none), so the fallback alone. On those versions
  OMP's `fullSize()` serves the picture, so no dependency there.
- Test: an e2e check in spec U16 (a **Planned** item) that a category's
  picture links to its full-size version and carries its alternate text.

Medium: one line in each of three app repositories (three pull
requests, plus OMP's series page), with the OMP half waiting on the
OMP1 fix.

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
- Kind: the alt half regressed in 2019 (OJS and OPS named the picture by
  the category's title before caa6c07dc7) and the severity rests on it;
  the link half never worked on OJS and OPS.
- `pkp/pkp-lib#13242` (open, a new theme built on Blade templates) asks
  that category covers open full screen in that theme; it does not cover
  the default theme's markup.
- Not driven: 3.4 and 3.3; OMP's series page; a screen reader itself
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
