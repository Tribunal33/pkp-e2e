# A journal's "Browse" block with no category shows "Categories" over an empty list

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OPS
  - 3.5: OJS, OPS
  - 3.4: OJS, OPS (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#6093` · [7e038550e5](https://github.com/pkp/browse/commit/7e038550e5167501e0b25c4133029827b7d6bbf8) (pkp/browse) · 2021-12-07 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02); `pkp/pkp-lib#924` (closed 2015) fixed the same line on a press's block
- **Tracked in** spec U16 [A10](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a10)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

When a journal or preprint server has no category and its manager
places the "Browse" block in the sidebar, the block still shows its
heading and the line "Categories", with no link under it. On a press
the line is left out.

Visitors see a heading and a label that lead nowhere; the manager can
take the block out of the sidebar until there is a category.

## Impact

- **Lost**: nothing; visitors see a "Browse" box whose only content is
  the label "Categories".
- **Who**: every visitor of a journal or preprint server that has no
  category and has placed the block. No new journal or server has the
  block: "Browse Block" is disabled and the sidebar is empty until a
  manager enables and places it. So this reaches a journal that places
  the block before it adds categories, or deletes its last one.
- **Way round**: take the block out of the sidebar until a category
  exists.

Low: a label over an empty list, and only on a journal that chose to
show the block without categories.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main` (OPS the same). "Browse
  Block" is disabled there and no block is placed in the sidebar; the
  journal has the categories "Applied Science" and "Social Sciences",
  each with sub-categories.

1. Sign in as `rvaca`. Open Settings > Website > "Plugins" and tick
   "Browse Block".
2. Open Settings > Website > "Appearance" > "Setup", tick "Browse Block"
   under "Sidebar" and click "Save".
3. Sign out and open the home page. The block reads "Browse",
   "Categories", then the two categories with their sub-categories
   nested under them.
4. Sign in as `rvaca`. Open Settings > Journal > "Categories". On
   "Applied Science", open "More Actions" > "Delete Category", type
   `Applied Science` in the box, click "I understand the consequences,
   delete this category", then "Back to Categories". Do the same for
   "Social Sciences". The table reads "No Items". [3.5: the "Categories"
   tab is a list where a category with sub-categories has no "Remove";
   remove each sub-category first (its "Settings" arrow > "Remove" >
   "OK"), then the category ("OK" to "Are you sure you wish to delete
   this item?"). OPS 3.5's dataset holds the categories "Biology",
   "History" (with "Cultural History"), "Mathematics" and "Social
   sciences".]
5. Sign out and open the home page.

**Expected**: no "Browse" block, since there is nothing to browse; at
the least no "Categories" line, as on a press.

**Observed**: the block still shows, 139 px tall: the heading "Browse"
and the line "Categories" over an empty list. A screen reader reads the
heading "Browse", a navigation "Browse", and a list item "Categories"
holding an empty list.

## Cause

`BrowseBlockPlugin::getContents()` in pkp/browse (the plugin OJS and
OPS ship as the `plugins/blocks/browse` submodule) hands the template a
collection object, and the template tests it as if it were an array.
Line 73:

```php
$processedCategories = $categories->map(fn($category) => $this->formatCategoryData($category));
```

`getMany()` returns a `LazyCollection`, and its `map()` another one.
`templates/block.tpl` line 39 guards the line with
`{if $browseCategories}`. An object always passes that test, empty or
not, so the line and its empty `<ul>` are printed. Nothing else in
`getContents()` asks whether there is anything to list, so the block
itself is always drawn.

The guard was written for an array. Up to 3.3 the plugin assigned
`$categoryDao->getByContextId(...)->toArray()`, which is empty when
there is no category, and the line was left out. Commit 7e038550e5
("Adapt to categories toolset", `pkp/pkp-lib#6093`) moved the plugin to
`Repo::category()` and assigned the collection itself, which every
version since keeps. OMP's own browse plugin still turns the collection
into an array (`iterator_to_array()`); `pkp/pkp-lib#924` had removed the
same empty line from it in 2015 (`pkp/omp#178`).

Reach:

- Every public page with a sidebar shows the same block.
- `getSubCategories()` already returns arrays (`->all()`), so the
  nested lists are not affected.

## Proposed fix

In pkp/browse, turn the collection into an array, as
`getSubCategories()` beside it already does, and draw no block when
there is no category
([fix-a10.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/fix-a10.diff),
written against the OJS and OPS app roots, where the plugin sits):

```diff
--- a/plugins/blocks/browse/BrowseBlockPlugin.php
+++ b/plugins/blocks/browse/BrowseBlockPlugin.php
@@ -70,7 +70,13 @@
             ->getMany();
 
         // Process each root category
-        $processedCategories = $categories->map(fn($category) => $this->formatCategoryData($category));
+        $processedCategories = $categories->map(fn($category) => $this->formatCategoryData($category))->all();
+
+        // No category to browse: draw no block
+        if (empty($processedCategories)) {
+            return '';
+        }
+
         $templateMgr->assign([
             'browseBlockSelectedCategory' => $requestedCategoryPath,
             'browseCategories' => $processedCategories,
```

With an array, the template's `{if $browseCategories}` really tests for
emptiness again. The early return is needed as well: the journal's
block lists nothing but categories, so without it the block would still
show "Browse" over nothing. A block that returns an empty string is
left out of the sidebar, as this plugin already does when there is no
context.

The conversion must come first. A `LazyCollection` runs `map()` again
on every pass, and `formatCategoryData()` returns an empty array for a
category it has already seen. An emptiness test on the lazy collection
would therefore use up the first category, and the template would then
print it blank.

Tried on `main` (OJS, OPS): with the fix in, step 5's home page has no
"Browse" block. With the dataset's categories the block was the same
with the fix in and out: all seven links at the same depths, and the
open category's link marked on its page.

The change goes to pkp/browse: a pull request on `main`, then a
submodule bump in pkp/ojs and pkp/ops. A proposal; the team decides.

**Alternatives**

- `{if $browseCategories->isNotEmpty()}` in the template: removes the
  line, keeps an empty "Browse" box, and runs the lazy `map()` twice
  (the trap above).
- Keep the block with a message such as "No categories yet": a product
  choice; no other block does this.

**What goes with it**

- Backport to pkp/browse `stable-3_5_0` and `stable-3_4_0`, then
  submodule bumps in the apps' matching branches. This diff does not
  apply there, since those branches assign `getMany()` with no `map()`.
  The same idea does: convert first (`->toArray()`), then return early
  when the array is empty. An `->isEmpty()` test on the lazy collection
  would run the category query twice, once for the test and once for
  the template.
- Guard: an e2e check that a journal with no category shows no "Browse"
  block once it is placed.

Small: one conversion and a five-line early return in one method,
following the sibling method.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/browse-block-sidebar/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js
  all shared/playwright/checks/issues/browse-block-sidebar/walk.js` on an
  install reset to the default dataset (its header gives the reset and
  the 3.5 commands). It also carries the other "Browse" block reports'
  steps.
- The fix was tried on `main` with the fix applied to both apps: the
  Steps, then the block with the dataset's categories and a category
  page, each on a freshly loaded dataset; the second check was walked
  again with the fix out.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02), on `main` and `stable-3_5_0`, OJS and OPS.
- Default placement: `lib/pkp/schemas/context.json` gives `sidebar` no
  default, and nothing writes it when a context is created; OJS and OPS
  `plugins/blocks/browse` ship no per-context settings file, so the
  plugin starts disabled.
- Tips: OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a, plugins/blocks/browse
  89a6d31), OPS `main` c8af945bb7 (lib/pkp 3dc90c81a6,
  plugins/blocks/browse 89a6d31); OJS `stable-3_5_0` 091fb65453 (lib/pkp
  cf3f984335, plugins/blocks/browse 45ec0ae), OPS `stable-3_5_0`
  38b61882d3 (plugins/blocks/browse 45ec0ae); OJS `stable-3_4_0`
  75cc2d488b and OPS acd8ae704b (plugins/blocks/browse 28a92ae); OJS
  `stable-3_3_0` ac77c9fb35 and OPS c5532e2161 (plugins/blocks/browse
  7e2c7f6).
- Code reads on the other lines: the pkp/browse commit each app branch
  records, read with `git show` in the plugin's checkout: 3.5 (45ec0ae)
  and 3.4 (28a92ae) assign `Repo::category()->getCollector()…->getMany()`
  to the same `{if $browseCategories}`; 3.3 (7e2c7f6,
  `BrowseBlockPlugin.inc.php`) assigns `getByContextId()->toArray()`.
- Introduced: `git blame` on 3.4's assignment, then the plugin's log
  between 3.3 and 3.4: 7e038550e5 replaced `->toArray()` with
  `Repo::category()->getMany(…)`; b299b8d (2022) only reshaped the
  collector call. The commit was pushed without a pull request
  (`commits/<sha>/pulls` answers none).
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/browse, pkp/ojs and
  pkp/ops: "browse block categories", "browse block empty", "browse
  block nothing to show", "browse categories". Read: `pkp/pkp-lib#924`
  ("Browse block plugin always displays labels", the press's block,
  closed 2015) and `pkp/browse#8` (hiding categories with no preprints,
  a feature request, not this fault).
- Not driven: 3.4 and 3.3; a journal created with no category (the walk
  deletes the dataset's).
