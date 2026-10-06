# A visitor opening an empty category sees "0 Items" and no "Nothing has been published" message

- **Severity** low
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` with `pkp/ojs#5267`, `pkp/omp#2208` and `pkp/ops#1179`, for `pkp/pkp-lib#8920` · [606ad4ef0b](https://github.com/pkp/ojs/commit/606ad4ef0bb68542a59ce14cdb2ade033746af61), [97e86e54e3](https://github.com/pkp/omp/commit/97e86e54e3b3889f9ac430fa5c52f486e60e2d48), [ee6b8a94fd](https://github.com/pkp/ops/commit/ee6b8a94fd429844abcb497d1b5a087df56476af) · 2026-01-09 to 2026-01-12, merged 2026-01-22 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a1)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A visitor who opens a category that holds nothing yet should read
"Nothing has been published in this category yet." on a journal or a
preprint server, and "No titles have been published yet." on a press.
Instead a journal's and a preprint server's page shows "0 Items" and
"0 - 0 of 0 items", and a press's page shows "0 Titles" and the heading
"All Books" with nothing under it.

The count line still says the category is empty, so the visitor only
misses the sentence. The fault is in each app's own category page,
which the default theme uses.

## Impact

- **Lost**: nothing; a sentence is missing.
- **Who**: any visitor who opens an empty category's page, from the
  "Browse" block or a parent category's "Subcategories", on a site
  running `main` (no release has it yet) with the default theme.
- **Way round**: none needed; the count line reads "0".

Low: the page is otherwise right.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS, OMP or OPS `main`, freshly
  loaded. Its `publicknowledge` has seven categories, and none of them
  holds an item, so nothing needs creating.

1. Signed out, open the category "Anthropology" by its address:
   `/index.php/publicknowledge/catalog/category/anthropology` (on a
   preprint server `/index.php/publicknowledge/preprints/category/anthropology`).

**Expected:** on a journal and a preprint server:

```
Anthropology
0 Items
All Items
Nothing has been published in this category yet.
```

On a press: "Anthropology", "0 Titles", "All Books" and "No titles have
been published yet.".

**Observed:** below the breadcrumb, the page reads in full:

```
Anthropology
0 Items
All Items
0 - 0 of 0 items
```

On OPS the same. On OMP:

```
Anthropology
0 Titles
All Books
```

On the `stable-3_5_0` dataset the same page reads "0 Items" and
"Nothing has been published in this category yet." on OJS and OPS,
and "0 Titles", "All Books" and "No titles have been published yet." on
OMP.
[On 3.5 the preprint server's dataset has other categories: the steps
there open "Mathematics", `/index.php/publicknowledge/preprints/category/mathematics`.]

## Cause

The category page's template tests the wrong thing for "empty". Each
app's `templates/frontend/pages/catalogCategory.tpl` chooses its empty
branch with `{if empty($results)}`
([OJS line 68](https://github.com/pkp/ojs/blob/b84f8e2e44/templates/frontend/pages/catalogCategory.tpl#L68),
[OMP line 66](https://github.com/pkp/omp/blob/3b0ecf794c/templates/frontend/pages/catalogCategory.tpl#L66),
[OPS line 68](https://github.com/pkp/ops/blob/c8af945bb7/templates/frontend/pages/catalogCategory.tpl#L68)).
`$results` is what pkp-lib's `PKPCatalogHandler::category()`
([line 82](https://github.com/pkp/pkp-lib/blob/3dc90c81a6/pages/catalog/PKPCatalogHandler.php#L82))
assigns: `$builder->paginate(…)` on a Laravel Scout builder, which
returns a `LengthAwarePaginator` object. PHP's `empty()` is never true
for an object, so the template always takes the list branch. On OJS
and OPS that branch prints an empty list and `{page_info}`, which on an
empty paginator reads "0 - 0 of 0 items"; on OMP it prints the "All
Books" list with nothing in it.

Before the change in Introduced, the handler assigned
`publishedSubmissions` as a PHP array (`$submissions->toArray()`), and
`{if empty($publishedSubmissions)}` worked. That change moved the
catalog pages onto the new Laravel Scout search: the handler now passes
the paginator, and the templates' variable was renamed to `$results`
with the `empty()` test kept. The OJS and OPS docblocks still say
"`@uses $results array`".

Reach:

- The same template's count line already reads `$results->total()`, so
  only the empty branch is affected (code).
- OPS's "Archives" page has the same mistake on a `LazyCollection`
  (`empty($publishedSubmissions)` in `preprints.tpl`), with another
  cause and fix: pkp-e2e's issue report
  [U17-OPS1](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U17-OPS1-archives-empty-server-says-nothing.md)
  (code).
- The other frontend pages that test `empty()` (OJS's issue archive,
  OMP's catalog, series, new releases and home lists) are handed arrays
  and work (code).
- Themes: each app ships only the default theme, which uses the app's
  template. PKP's separately distributed themes Classic, Health
  Sciences, Immersion and Pragma override `catalogCategory.tpl`; on
  their `main` branches they still read `$publishedSubmissions` and
  `$total`, which `main`'s handler no longer assigns, so they do not
  meet this fault but are out of step with the new handler in their
  own way (code; not walked).

## Proposed fix

Test the paginator's total in the three templates, as their count line
already does:

```diff
--- a/templates/frontend/pages/catalogCategory.tpl
+++ b/templates/frontend/pages/catalogCategory.tpl
@@ -65,7 +65,7 @@
 	</h2>
 
 	{* No published titles in this category *}
-	{if empty($results)}
+	{if !$results->total()}
 		<p>{translate key="catalog.category.noItems"}</p>
 	{else}
 		<ul class="cmp_article_list articles">
```

The diffs, one per app:
[fix-ojs.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-category-no-message/fix-ojs.diff),
[fix-omp.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-category-no-message/fix-omp.diff),
[fix-ops.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-category-no-message/fix-ops.diff).
Tried on `main`, all three apps: the page then matched the Expected.
With one item placed in the category, its page listed the item and no
message. Its page 2, past the last one, showed no message either, with
the fix in or out.

`total()` counts every published item in the category, so the branch
means what its comment says ("No published titles in this category").
OJS's search results page, which gets the same kind of paginator,
also tests it in the template (`$results->count()` in `search.tpl`), and
`pkp/pkp-lib#10716` fixed the same `empty()` mistake on the editorial
masthead in the template.

A proposal; the team decides.

**Alternatives**:

- `{if $results->isEmpty()}`: it tests only the items on the page
  shown. It is the same on an empty category, but on a category that
  has items, a page past the last one would then say "Nothing has been
  published in this category yet.".
- Hand the template an array again from `PKPCatalogHandler::category()`:
  loses the paginator the page links need.

**What goes with it**:

- No new text: `catalog.category.noItems` and OMP's `catalog.noTitles`
  exist and are translated.
- The docblock line "`@uses $results array`" in the OJS and OPS
  templates can be corrected in the same change (not in the diffs).
- A theme that overrides `catalogCategory.tpl` carries its own copy of
  the check and needs the same change.
- Test: an e2e check that an empty category shows the message.

Small: one line in each app's copy of the template, and a test.

## Evidence

- The kept script
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/empty-category-no-message/walk.js)
  takes the Steps signed out and records what stands under the
  category's heading.
  - **Run:** on an install freshly loaded from the default dataset,
    `PROBE_FEATURE=<fleet> PROBE_AGENT=<name> node bin/probe.js all shared/playwright/checks/issues/empty-category-no-message/walk.js`.
  - **Category with one item:** `WALK=neighbour` in front places a
    published item in the category through the screens (as `dbarnes`:
    "Unpublish", "Categories", "Publish" again; helpers in
    [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/one-item-reads-1-items/lib.js))
    and reads the category page and its page 2, to show the fix leaves
    a category with items as it was.
- Walks: OJS, OMP and OPS on `main` and `stable-3_5_0`, on PostgreSQL;
  datasets from pkp/datasets e8dafbc (2026-10-02).
- Not driven: 3.4 and 3.3. A theme other than the default.
- The branch tips the walks and code reads used:
  - **`main`:** OJS b84f8e2e44 (pkp-lib ddd8ab243a), OMP 3b0ecf794c and
    OPS c8af945bb7 (pkp-lib 3dc90c81a6).
  - **`stable-3_5_0`:** OJS 091fb65453, OMP 9c5e24246, OPS 38b61882d3,
    pkp-lib cf3f984335.
  - **`stable-3_4_0`** (code): OJS 75cc2d488b, OMP 0aec65441, OPS
    acd8ae704b, pkp-lib 6f96165c90.
  - **`stable-3_3_0`** (code): OJS ac77c9fb35, OMP 8e72fc883, OPS
    c5532e2161, pkp-lib 4156e50233.
- Code reads:
  - `main`: `PKPCatalogHandler::category()`, `SubmissionSearchResult::builderFromRequest()`,
    the three `catalogCategory.tpl`, `PKPTemplateManager::smartyPageInfo()`;
    a search for `empty(` in the frontend page templates of the three
    apps and pkp-lib, with each handler's type; `catalogCategory.tpl` on
    the `main` branch of pkp/classic, pkp/healthSciences, pkp/immersion
    and pkp/pragma.
  - 3.5 and 3.4: `PKPCatalogHandler::category()` assigns
    `'publishedSubmissions' => $submissions->toArray()`, and the three
    templates test `empty($publishedSubmissions)`.
  - 3.3: `PKPCatalogHandler.inc.php` assigns
    `iterator_to_array($submissionsIterator)`; the same templates.
- The trace: `git blame` on each template's `{if empty($results)}`,
  and `git log -L` on the handler's `paginate()` line (pkp-lib
  ce23e18e83, "pkp/pkp-lib#8920 Convert catalog handler to search
  toolset (WIP)"); the PRs from the API's `commits/<sha>/pulls`.
- Upstream (searched 2026-10-02): the closest hit, `pkp/pkp-lib#9722`
  (OMP's empty category showing a missing key on 3.3 and 3.4, fixed),
  shows the empty branch was reached before this change.
