# A category's "Order of articles" has no effect: its public page keeps one order whatever is chosen

- **Severity** medium
- **Effort** medium
- **Kind** regression
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: none
  - 3.4: none (code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#12199` for `pkp/pkp-lib#8920` · [ce23e18e83](https://github.com/pkp/pkp-lib/commit/ce23e18e832681aadf557dc143ef7f33a249bcbd) · 2026-01-09 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U16 [A2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U16-categories.md#a2)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

A manager sets "Order of articles" ("Order of monographs" on a press,
"Order of preprints" on a preprint server) to "Title (A-Z)", expecting
the category's page to list its articles alphabetically. The page keeps
the same order whatever the choice. Every choice is ignored, the default
"Publication date (newest first)" included: the page asks the database
for no order at all.

The saved choice stays in the category's settings and every item is
still listed, but readers see the items in an order the journal did not
choose, and the manager is not told. Where the database returns them
oldest submission first, as on the test installs, and items were
published in the order they were submitted, a category at the default
lists its oldest items first, the reverse of its setting, so sites that
never touched the setting see it too.

## Impact

- **Lost**: the chosen order on the public page. The stored setting is
  kept and no item is missing.
- **Who**: readers of every category page on a journal, press or server
  that uses categories, whatever its setting; the manager who chose the
  order.
- **Way round**: none. No setting, screen or link changes the page's
  order.

The fix is not one line: the search code the page now uses accepts one
order only and fails on PostgreSQL for the date order, so two pkp-lib
files change.

Medium: a public page shows its items in an order nobody chose on every
install that uses categories, silently, with no way round; it stays medium because the page
still lists every item and reading them works. It would be high if the
page lost items or failed to load.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), freshly
  loaded. Its top-level category "Social Sciences" (path
  `social-sciences`) arrives with "Order of articles" set to
  "Publication date (newest first)" and holds no published item.
- Three published items placed in "Social Sciences", made on screen as
  `dbarnes` (the dataset places none):
  - OJS: submissions 5 "Genetic transformation of forest trees", 6
    "Investigating the Shared Background Required for Argument…" and 9
    "Hansen & Pinto: Reason Reclaimed", all in Production. For each:
    open it, "Publication Settings", "Categories": type "Social" and
    choose "Social Sciences"; "Assign To Current/Back Issue", "Vol. 1
    No. 2 (2014)"; "Save". Then "Schedule For Publication": "Publication
    Stage" "Version of Record", "Confirm", "Publish".
  - OMP: submission 4 "How Canadians Communicate…" (Production): "Catalog
    Entry", "Categories" "Social Sciences", "Save", "Publish" and its
    confirmation. Submissions 5 "Bomb Canada and Other Unkind Remarks…"
    and 14 "From Bricks to Brains…" (published): "Unpublish", then the
    same.
  - OPS: submission 1 "The influence of lactation…" (Production):
    "Preprint entry", "Categories" "Social Sciences", "Save", "Post" and
    its confirmation. Submissions 6 "Developing efficacy beliefs in the
    classroom" and 8 "Hansen & Pinto: Reason Reclaimed" (posted):
    "Unpost", then the same.

[3.5: the dataset's categories arrive at "Title (A-Z)". On a journal,
"Categories" is on the publication's "Issue" page, and the issue is
chosen in its "Assign to Issue" window. "Categories" is a list of boxes.
On the Categories tab, the category's name opens "Edit Category". OPS
names the category "Social sciences".]

1. Sign in as `dbarnes`.
2. Settings › Journal (Press, Server) › "Categories": "Social Sciences" ›
   "More Actions" › "Edit".
3. "Order of articles" ("Order of monographs", "Order of preprints"):
   "Title (A-Z)". "Save".
4. Open the category's page,
   `/index.php/publicknowledge/en/catalog/category/social-sciences`
   (`/index.php/publicknowledge/en/preprints/category/social-sciences`
   on a preprint server). Note the order.
5. Back in "Edit": "Title (Z-A)". "Save".
6. Open the category's page again.

**Expected**

Step 4 lists the items by title, A to Z; step 6 Z to A:

- OJS: "Genetic transformation…", "Hansen & Pinto…", "Investigating the
  Shared Background…", then the reverse.
- OMP: "Bomb Canada…", "From Bricks to Brains…", "How Canadians
  Communicate…", then the reverse.
- OPS: "Developing efficacy beliefs…", "Hansen & Pinto…", "The influence
  of lactation…", then the reverse.

**Observed**

Steps 4 and 6 list the items in one fixed order, the same before and
after the change, and every save answers without an error. On these
installs it is ascending submission ID, which here is also the order
they were published in; nothing in the code fixes that order:

- OJS: "Genetic transformation of forest trees", "Investigating the
  Shared Background Required for Argument…", "Hansen & Pinto: Reason
  Reclaimed", both times.
- OMP: "How Canadians Communicate…", "Bomb Canada and Other Unkind
  Remarks…", "From Bricks to Brains…", both times.
- OPS: "The influence of lactation…", "Developing efficacy beliefs in the
  classroom", "Hansen & Pinto: Reason Reclaimed", both times.

"Edit" shows the saved choice each time ("Title (A-Z)" before step 5).
The other choices were not walked: the three items share one
publication date, so a date order over them would be a tie.

On `stable-3_5_0`, the same steps list the items A to Z at step 4 and Z
to A at step 6 on all three apps.

## Cause

`PKPCatalogHandler::category()` (lib/pkp
`pages/catalog/PKPCatalogHandler.php`, lines 72-82 on `main`) reads the
category's sort option into `$orderBy` and `$orderDir`, then never uses
them. Since the page moved onto the search framework, it builds its list
with `SubmissionSearchResult::builderFromRequest()`, which orders only by
the request's own `orderBy` and `orderDir` parameters. No link to a
category page carries them, so the only order left is OMP's
`$builder->orderBy('featured')`. On a journal and a preprint server the
query has no `ORDER BY` at all, so the order is whatever the database
returns, which SQL leaves unspecified. Every stored choice, the default
included, is dropped the same way.

The change came in `ce23e18e83` ("Convert catalog handler to search
toolset (WIP)"), which replaced the submission collector's
`->orderBy($orderBy, $orderDir)` and `orderByFeatured()` with the search
builder and left the old ordering commented out under `FIXME`.
`818aeda367` (2026-01-14) then added the featured order for OMP and
deleted the commented-out block, so the category's own order was never
put back.

The search framework's database driver would not take the category's
order as it stands, so the fix is not one line in the handler:

- `DatabaseEngine::buildQuery()` accepts a single order condition and
  throws "Only a single order condition is accepted by DatabaseEngine!"
  on a second, so OMP's featured order plus the category's order cannot
  be combined (code).
- It does not know `seriesPosition`, which a press offers as "Series
  position (lowest first)" and "(highest first)" (code).
- Its `datePublished` order (added in `d6a9c82dbf`, 2026-01-13) sorts on
  `cp.date_published` in a query grouped by `s.submission_id`. PostgreSQL
  refuses that ("column "cp.date_published" must appear in the GROUP BY
  clause or be used in an aggregate function", checked on the test
  install). No screen asks for that order today. Once the handler
  passes the category's order on, every category at the default
  "Publication date (newest first)" would ask for it.

Reach:

- The search page itself builds its order the same way and asks for none
  from any screen (code), so it is not affected.
- OMP's catalog page and series pages still use the submission collector
  with the stored sort option and `orderByFeatured()` (code), so they
  keep their order.
- 3.5, 3.4 and 3.3 build the category page with the collector and its
  `orderBy()` (code), so none shows the fault.
- A second gap from 3.5, with its own cause and not part of this fix:
  `DatabaseEngine` joins `features` on `submission_id` alone (line 203),
  so on a press a book featured in any list (the press's catalog, a
  series, another category) comes first on every category page it is
  on, and `MAX(f.seq)` mixes the positions of unrelated lists. 3.5's
  OMP `Collector::getQueryBuilder()` used the category's own featured
  list (`assoc_type` category, `assoc_id` the page's category) (code).

## Proposed fix

Hand the category's order to the search builder when the request names
none, and let `DatabaseEngine` apply several orders in turn, each over
an aggregate so that the grouped query stays valid
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-order-of-articles-ignored/fix.diff),
lib/pkp only, the same for the three apps):

```diff
         if (Application::get()->getName() == 'omp') {
             // Featured items are only in OMP at this time
             $builder->orderBy('featured');
         }
+        if (!$request->getUserVar('orderBy')) {
+            // The category's own "Order of articles", unless the request names an order
+            $builder->orderBy($orderBy, $orderDir);
+        }
```

In `DatabaseEngine::buildQuery()`, the single-order `switch` becomes a
loop that collects every condition (`datePublished`, `title`, and the
OMP-only `featured` and `seriesPosition`). The code then adds one
`orderBy` per condition, in the order the builder holds them, after the
`groupBy('s.submission_id')` call: `MAX(cp.date_published)`,
`MAX(cp.series_position)`, the existing `COALESCE(MAX(f.seq), 999999)`
for featured items and the existing `MIN(title_current.setting_value)`
for the title. The title order already used an aggregate; the date
order is brought in line with it.

Three more things the diff does or leaves:

- **A request's own order.** `builderFromRequest()` adds a request's
  `orderBy` before the handler adds `featured`. With the fix, on a press
  `?orderBy=title` sorts by title first and featured second, and without
  the parameter it is featured first, then the category's order. Today
  that address throws "Only a single order condition is accepted by
  DatabaseEngine!" on a press (code; no screen sends the parameter). If
  featured should win there too, the handler adds `featured` ahead of
  the request's order.
- **Line 107.** The diff also corrects the operator precedence in
  `if ($applicationName = Application::get()->getName() != 'omp')`,
  which assigns a boolean, so the exception's message named no app; it
  now reads `if (($applicationName = Application::get()->getName()) !=
  'omp')`.
- **Series position** was not tried. `publications.series_position` is
  a string column, so `MAX(cp.series_position)` sorts "10" before "2",
  as 3.5's collector did; the diff does not cast it.

Tried on `main` on all three apps: with the fix in, the Steps list the
items A to Z after step 3 and Z to A after step 5. Two side checks, with
the fix in and out:

- "Social Sciences" holding the three items at its arrival order,
  "Publication date (newest first)", and the search page for "Reason"
  load and list the same items. With the fix in, that category page runs
  the corrected date order on PostgreSQL without an error; the items
  share one date, so this shows the query runs, not which way it sorts.
- On a press, "How Canadians Communicate…" marked "Featured" in the
  Catalog's press-wide list ("All Monographs", no filter) comes first
  under "Title (A-Z)", the other two following by title. The fix keeps
  main's featured order as it stands, including the wider scope named in
  the Cause.

- **Where the rule lives**: the handler is where the category's own
  order is known, as before `ce23e18e83`; the engine is where an order
  becomes SQL, and every caller of the builder gets several orders and
  a valid date order from it.
- **How the code base does it**: OMP's `CatalogHandler` catalog and
  series pages pass the stored option as `orderBy($orderBy, $orderDir)`
  with featured items first; the fix gives the category page the same
  behaviour through the search builder. The aggregate follows the
  engine's own title order.
- **Every instance**: the handler is the only caller that drops a stored
  order.
- **The introducing change's intent** (`pkp/pkp-lib#12199`, "Homogenize
  browse and search interfaces": the browse pages built by the same
  search framework as the search page) is kept: no return to the
  collector.

**Alternatives**

- Go back to the submission collector for the category page, as 3.5 did
  and OMP's series pages still do: it works on its own, but undoes the
  move onto the search framework for this page.
- Only the handler line: every category at its default order would then
  fail on PostgreSQL, and every press category would fail on the second
  order condition.

**What goes with it**

- `OpenSearchEngine` supports `datePublished` and `title` only. With the
  fix, a journal's or server's category on OpenSearch takes its order;
  OMP's category page already asks it for `featured`, which it rejects
  ("Unsupported order-by"), and `seriesPosition` would be rejected the
  same way. That needs its own change in the OpenSearch mapping and is
  left out here (code; OpenSearch not run).
- No stored data changes; the stored sort options are what 3.5 used.
- The guard: an e2e scenario in U16 for Rule 10 (three items, "Title
  (A-Z)" then "Title (Z-A)", the page's order after each), and a unit
  test of `DatabaseEngine` with two order conditions and a date order on
  PostgreSQL.

A proposal; the team decides.

Medium: two files in pkp-lib, the handler line and the engine's order
handling (several orders, and a date order the grouped query accepts),
which changes for every caller of the search builder.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-order-of-articles-ignored/walk.js)
  with its helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-order-of-articles-ignored/lib.js),
  on an install freshly loaded from PKP's default test dataset (pkp/datasets
  `e8dafbc`, 2026-10-02, the PostgreSQL dumps): `PROBE_FEATURE=<dataset
  fleet> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/category-order-of-articles-ignored/walk.js`.
  It takes the Steps through the screens and records each category
  page's titles in order. It opens step 4's address without the `/en`
  segment, which redirects to the address in the Steps.
- The fix tried:
  [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/category-order-of-articles-ignored/fix.diff),
  applied to the three apps, the install reloaded, the walk run, then
  reverted.
- Tips walked or read: `main` OJS `b84f8e2e44` (lib/pkp `ddd8ab243a`), OMP
  `3b0ecf794` and OPS `c8af945bb7` (lib/pkp `3dc90c81a6`; the handler and
  the engine are identical in both lib/pkp commits); `stable-3_5_0` OJS
  `091fb65453`, OMP `9c5e24246`, OPS `38b61882d3` (lib/pkp `cf3f984335`);
  `stable-3_4_0` lib/pkp `6f96165c90`; `stable-3_3_0` lib/pkp
  `4156e50233`.
- 3.5: its `PKPCatalogHandler::category()` passes the
  sort option to `Repo::submission()->getCollector()->orderBy($orderBy,
  $orderDir)`, with `orderByFeatured(true)` on a press.
- 3.4 (code): `pages/catalog/PKPCatalogHandler.php` on `stable-3_4_0` does
  the same with the collector. 3.3 (code):
  `pages/catalog/PKPCatalogHandler.inc.php` on `stable-3_3_0` passes
  `orderBy` and `orderDirection` from the sort option to
  `Services::get('submission')->getMany()`. None of `ce23e18e83`,
  `d6a9c82dbf`, `818aeda367` or `pkp/pkp-lib#8920`'s other commits is on
  the three stable branches.
- Introduced: `git log -L` on the handler's category method on `main`
  gives `ce23e18e83` (2026-01-09, the collector and its order replaced by
  the search builder, the order commented out under `FIXME`),
  `d6a9c82dbf` (2026-01-13, request-driven sorting added to the builder
  and the engine, including the ungrouped `cp.date_published` order) and
  `818aeda367` (2026-01-14, OMP's featured order, the commented-out block
  deleted). All three belong to `pkp/pkp-lib#12199` ("pkp/pkp-lib#8920
  Homogenize browse and search interfaces", merged 2026-01-22), per the
  GitHub API's `commits/<sha>/pulls`.
- The date order's PostgreSQL error was read with the engine's query
  shape run in `psql` on the test install; no screen on `main` sends a
  date order to the engine today. MySQL not checked (the unordered rows'
  order and the date order under `ONLY_FULL_GROUP_BY` both depend on the
  database).
- On the press, the first category page opened after a settings save
  sometimes ended with no answer at all and loaded when opened again.
- Upstream: searched pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops and
  pkp/ui-library for the category's sort or order, "order of articles",
  "order of monographs", `PKPCatalogHandler`, `getSortOption`,
  `DatabaseEngine` order and the engine's messages (2026-10-02).
  `pkp/pkp-lib#12133` (a 3.3 upgrade's stored sort value) and
  `pkp/pkp-lib#12136` (an issue's table of contents order) are other
  faults.
- Not driven: OpenSearch (the reach note in the fix is from the code); a
  second language (the title order reads the current interface
  language's title, as before).
