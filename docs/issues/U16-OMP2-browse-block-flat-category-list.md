# A press's "Browse" block lists sub-categories in one alphabetical run, not under their parents

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OMP
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11243` for `pkp/pkp-lib#10404` · [198595800a](https://github.com/pkp/pkp-lib/commit/198595800a0bd40db5db4d41d1a7b34556894719) · 2025-05-12 · Taslan Graham (taslangraham)
- **Upstream** none found (2026-10-02); `pkp/pkp-lib#11443` nested the journal's and the server's block after the same change, not the press's
- **Tracked in** spec U16 [OMP2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#omp2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A journal's "Browse" block nests each sub-category under its parent. A
press's block lists every category in one alphabetical run, each
sub-category indented by the same single step. So "Anthropology" (a
sub-category of "Social Sciences") opens the list, and "Computer Vision"
sits level with "Computer Science", its parent, between it and
"Engineering".

Every category is listed and every link works, but visitors cannot
tell which category a sub-category belongs to, and may take it for part
of the category just above it. Released versions list each parent with
its sub-categories after it; the run is new on `main`.

## Impact

- **Lost**: the press's category structure in the sidebar; the links
  and pages are right.
- **Who**: visitors of a press that has sub-categories and whose
  manager has placed the block. The plugin is enabled on a new press,
  but the sidebar starts empty, so the block shows only once a manager
  adds it.
- **Way round**: none in the block. Visitors see the true structure in
  each category page's breadcrumb and "Subcategories". A press can
  untick the block's "Categories" checkbox or take the block out.

Low: a display fault on presses that place the block; a press with many
or deeply nested sub-categories, where the run grows long and
misleading, would raise it to medium.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. "Browse Block" is enabled
  there; no block is placed in the sidebar. The press has the
  categories "Applied Science" (holding "Computer Science", which holds
  "Computer Vision", and "Engineering") and "Social Sciences" (holding
  "Anthropology" and "Sociology").

1. Sign in as `rvaca`. Open Settings > Website > "Appearance" > "Setup",
   tick "Browse Block" under "Sidebar" and click "Save".
2. Sign out and open the home page.

**Expected**: under "Categories", "Applied Science" with "Computer
Science" and "Engineering" under it and "Computer Vision" under
"Computer Science", then "Social Sciences" with "Anthropology" and
"Sociology" under it, as the journal's block shows them on OJS `main`.

**Observed**: "Categories" over one list: "Anthropology", "Applied
Science", "Computer Science", "Computer Vision", "Engineering", "Social
Sciences", "Sociology". The sub-categories are all indented by the same
10 px, "Computer Vision" no deeper than "Computer Science"; the
top-level two are not. A screen reader hears one list of seven links.

On 3.5 the same steps show "Applied Science", "Computer Science",
"Engineering", "Social Sciences", "Sociology", "Anthropology": each
parent with its sub-categories after it.

## Cause

OMP's `BrowseBlockPlugin::getContents()`
(`plugins/blocks/browse/BrowseBlockPlugin.php`) asks for every category
of the press in one query, with no parent filter, and assigns the flat
array. `templates/block.tpl` prints it as one `<ul>` and gives each
category with a parent the class `is_sub`, which the default theme
indents by one step (`.block_browse .is_sub { margin-left: @base }`).
The block keeps no parent link and no depth, so the list only reads as
a tree when the query returns each parent followed by its children.

Up to 3.5 it did. `PKP\category\Collector::getQueryBuilder()` ordered
by the parent's sequence, then the category's, which puts each
sub-category straight after its parent, and the category form allowed
only two levels. Commit 198595800a (`pkp/pkp-lib#10404`, "Allow nested
categories") allowed any depth and replaced that order with the
category's title (`orderByRaw('COALESCE(category_settings.setting_value) ASC')`).
From then on the block's flat list comes out in name order, and a
third level cannot show at all.

Three weeks later `pkp/pkp-lib#11443` (`pkp/browse#14`) rewrote the
journal's and the server's block in pkp/browse to fetch the top-level
categories and nest their sub-categories. OMP's own browse plugin was
not changed.

Reach:

- The block is the same on every press page with a sidebar.
- A category page's breadcrumb and "Subcategories" are built
  separately and are right.
- 3.3 to 3.5, all three apps: the order and the two-level limit keep
  the indented list readable on screen; a screen reader still hears one
  list there, with no nesting (code, and the 3.5 walk).

## Proposed fix

Give OMP's block the nested list pkp/browse gives the journal's: fetch
the top-level categories, build each one's sub-categories recursively,
and print them with a recursive template function
([fix-omp2.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/fix-omp2.diff),
against the OMP app root). In `getContents()`:

```php
$categories = Repo::category()->getCollector()
    ->filterByContextIds([$press->getId()])
    ->filterByParentIds([null])
    ->getMany();

$this->processedCategoryIds = [];
$templateMgr->assign('browseCategories', $categories->map(fn (Category $category) => $this->formatCategoryData($category))->filter()->all());
```

A private `formatCategoryData()` returns the category's id, path,
parent id, title and `subCategories`, built by the same call one level
down. As in pkp/browse's `formatCategoryData()`, a category already
seen is not processed again, which guards against a loop in the stored
parents. Unlike pkp/browse, the list of seen categories is reset for
each render, and `->filter()` drops a repeated category instead of
printing it as an empty `<li>`.

In `block.tpl`, a `{function name=browseCategoryList}` prints one
`<ul>` per level and calls itself for each category with
sub-categories. Nested `li.is_sub` items take the theme's indent once
per level, so depth shows without a theme change.

The mark for the open category moves from `<li class="current">` to
`<a class="current">`. It is drawn by a rule in an inline `<style>` at
the end of `block.tpl`, `.block_browse a.current`, with pkp/browse's
colours, so it works in every theme. The theme's `.block_browse .current a`
would otherwise mark every link nested under a marked parent. This is
how pkp/browse marks the link, with the scope its own rule lacks (spec
U16 A20, reported separately). The "Series" list is left as it is.

Tried on `main` (OMP): with the fix in, the steps show the Expected
tree, and on "Computer Science"'s page only that link is marked, not
"Computer Vision" under it. "New Releases", the "Series" list, and the
block with "Series" unticked were the same with the fix in and out.

A proposal; the team decides.

**Alternatives**

- Restore the parent-then-children order in the category Collector:
  undoes `pkp/pkp-lib#10404`'s name order for the settings tab and the
  pickers too, and a flat list with one indent step still cannot show
  a third level.
- Change the default theme's rule to `.current > a` and keep the mark
  on the `<li>`: keeps the theme's colours, but other themes written
  for `.current a` would mark nested links.
- Print each sub-category's line of parents ("Applied Science >
  Computer Science") in the flat list, as the editors' category picker
  does: shows parentage, not a tree.

**What goes with it**

- Backport: none needed; 3.3 to 3.5 keep the parent-first order and two
  levels.
- The fix for the press's empty block (spec U16 OMP4, reported
  separately) changes the same lines of `getContents()`; if both land,
  its emptiness test reads this list of top-level categories.
- Guard: an e2e check that a press's block nests "Computer Vision"
  under "Computer Science" under "Applied Science".

Small: two files of one plugin, copying pkp/browse's code.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js
  all shared/playwright/checks/issues/browse-block-sidebar/walk.js` on an
  install reset to the default dataset (its header gives the reset and
  the 3.5 commands). It records each link's nesting depth, left edge and
  list-item classes, and the marked link on "Computer Science"'s page;
  the journal's nested list is the same walk on OJS and OPS.
- The fix was tried on `main`: the Steps and the category page, then
  the block with "Series" unticked, each on a freshly loaded dataset;
  the second check was walked again with the fix out. The diff was
  revised once (the reset and `->filter()`) and tried again; both
  versions gave the same screens.
- Walked on PostgreSQL, the default datasets from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OMP, OJS and OPS. The 3.5
  dataset has no "Computer Vision".
- Default placement: OMP's `plugins/blocks/browse/settings.xml` enables
  the plugin on each new press; `lib/pkp/schemas/context.json` gives
  `sidebar` no default and nothing writes it when a press is created.
- Tips: OMP `main` 3b0ecf794 (lib/pkp 3dc90c81a6), OJS `main` b84f8e2e44
  (plugins/blocks/browse 89a6d31), OPS `main` c8af945bb7
  (plugins/blocks/browse 89a6d31); OMP `stable-3_5_0` 9c5e24246 (lib/pkp
  cf3f984335), OJS 091fb65453 and OPS 38b61882d3 (plugins/blocks/browse
  45ec0ae, 2026-09-18, which does not contain `pkp/browse#14`); OMP
  `stable-3_4_0` 0aec65441, OJS 75cc2d488b and OPS acd8ae704b
  (plugins/blocks/browse 28a92ae); OMP `stable-3_3_0` 8e72fc883, OJS
  ac77c9fb35 and OPS c5532e2161 (plugins/blocks/browse 7e2c7f6).
- Code reads on `main`: OMP `plugins/blocks/browse/BrowseBlockPlugin.php`
  and `templates/block.tpl`; pkp/browse `BrowseBlockPlugin.php` and
  `templates/block.tpl`; the default theme's `styles/sidebar.less`
  (`.is_sub`, `.current a`); `PKP\category\Collector` (the title order).
- Code reads on the other lines: 3.5 `lib/pkp/classes/category/Collector.php`
  (line 162, the parent-then-sequence order) and the category form's
  parent list (top-level categories only, line 241); `git show
  origin/stable-3_4_0:classes/category/Collector.php` in `lib/pkp` (the
  same order); 3.3 `CategoryDAO::getByContextId()` (the same order, with
  a comment that it returns sub-categories right after their parent);
  OMP's plugin and template on each branch (one list, `is_sub`).
- Introduced: `git log -S'Order categories by title' --
  classes/category/Collector.php` in `lib/pkp` gives 198595800a, merged
  as `pkp/pkp-lib#11243` (2025-05-13). OMP's block itself has listed
  every category flat since a1b03f990b (2015).
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/omp and pkp/browse:
  "browse block categories", "browse block subcategories", "nested
  categories browse", "omp browse categories subcategories", "browse
  categories". Read: `pkp/pkp-lib#11443` (scoped to pkp/browse, links
  `pkp/browse#14`) and `pkp/pkp-lib#10404` (any nesting depth, no word
  on OMP's block).
- Not driven: 3.4 and 3.3; a press with more than three levels; themes
  other than the default one.
- Unverified: whether third-party themes style OMP's `li.current` in
  this block (the fix stops setting it on categories).
