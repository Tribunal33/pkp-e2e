# A report address with an unknown or missing report name lands on "404 Not Found", not on "Reports"

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#6403` for `pkp/pkp-lib#6145` · [3559550](https://github.com/pkp/pkp-lib/commit/35595503c9c115a2acebe6664d1011395526aae6) · 2020-11-30 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** U65 [A8](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U65-editorial-statistics.md#a8)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager or editor who opens a report's download address with a report name the
install does not have, such as
`…/publicknowledge/en/stats/reports/report?pluginName=reviewreportplugin`
(the right name in lower case), lands on a bare "404 Not Found" page at
`…/publicknowledge/en/stats/stats/reports`. The same happens when the
name is empty or left out.

The doubled "stats/stats" is the bug. The app means to send the person
back to Statistics › "Reports", but its redirect puts the page name
where the operation's name belongs. A report cannot be turned off, so
only a name the install has no report for counts as unknown.

## Impact

- **Lost**: nothing. The person sees a dead end instead of the list of
  reports.
- **Who**: managers and editors of a journal, press or preprint server,
  and the site administrator, when they open a report from a saved or
  typed address instead of from the "Reports" page. One such address is
  an OJS 3.3 bookmark of "View Report", a report that 3.4 no longer has.
  It would land here after an upgrade; this was read in the code, not
  tried.
- **Way round**: Statistics › "Reports" in the side menu.

Low: only the page the person lands on is wrong.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main` (OJS, OMP or OPS), loaded as is.
  Nothing to create.

Steps:

1. Sign in as `dbarnes` (Journal editor; Press editor; Preprint Server
   manager).
2. In the side menu, open "Statistics" › "Reports". The "Reports" page
   opens at `/index.php/publicknowledge/en/stats/reports`. On OJS it
   lists "COUNTER Reports", "Review Report", "Articles Report" and
   "Subscriptions Report". On OMP it lists "Monograph Report" and
   "Review Report". On OPS it shows only the description line.
3. (OJS, OMP) Note the address of "Review Report":
   `/index.php/publicknowledge/en/stats/reports/report?pluginName=ReviewReportPlugin`.
4. In the browser's address bar, open the same address with a report
   name the install does not have:
   `/index.php/publicknowledge/en/stats/reports/report?pluginName=NoSuchReport`.
5. Open it with an empty name: `…/stats/reports/report?pluginName=`.
6. Open it with no name: `…/stats/reports/report`.
7. Open it with the right name in lower case:
   `…/stats/reports/report?pluginName=reviewreportplugin`.

**Expected**: steps 4 to 7 each land on the "Reports" page
(`…/publicknowledge/en/stats/reports`).

**Observed**: steps 4 to 7 each end at
`/index.php/publicknowledge/en/stats/stats/reports`, which answers 404
with a bare page that has no title and no app menus:

```
404 Not Found
```

The address from step 3, with the right name, downloads
`reviews-<date>.csv` as it should.

## Cause

`PKPStatsHandler::report()` (lib/pkp `pages/stats/PKPStatsHandler.php`)
redirects when `pluginName` is empty or is not a key of
`PluginRegistry::loadCategory('reports')`:

```php
$request->redirect(null, null, 'stats', ['reports']);
```

`PKPRequest::redirect()` takes `($context, $page, $op, $path, …)`. The
call leaves the page empty, so the current page (`stats`) is used, and
it puts `stats` in the op slot and `reports` in the path. The address
built is `…/stats/stats/reports`. `PKPStatsHandler` has no `stats` op,
so the router answers 404. The intended target is the `reports` op of
the `stats` page. The side menu builds it as
`$router->url($request, null, 'stats', 'reports')` in
`PKPTemplateManager`, and OJS's `CounterReportPlugin` builds the same
breadcrumb link.

The line was written this way when `pkp/pkp-lib#6145` moved
`report()` from `PKPToolsHandler` (page `management`, op `tools`) to
the stats page. The `report()` it replaced already had the same
mistake: `redirect(null, null, 'management', 'statistics')` built
`…/management/management/statistics`.

Reach:

- All three apps share the handler. OPS has no report plugins, so every
  name is unknown there (seen on screen).
- The report name is matched case-sensitively (`isset()` on the plugin
  names), so a name in the wrong case is treated as unknown (seen on
  screen). With the fix it lands on "Reports" as well.
- `PluginRegistry::loadCategory('reports')` reads every report plugin on
  disk, and `ReportPlugin` is always enabled (`getEnabled()` true,
  `getCanDisable()` false). So no manager setting makes an installed
  report's name unknown (read in the code).
- No other page redirect in pkp-lib, OJS, OMP or OPS puts a page name in
  the op slot. Every other `redirect(<context>, null, '<op>'…)` names an
  op of its own page (read in the code).
- 3.3 has a second instance: `generateReport()`, the report generator's
  redirect when no report fits the metric type, has the same line.
  `pkp/pkp-lib#6145` wrote that one too. Before it, the method
  redirected correctly with `redirect(null, null, 'tools',
  'statistics')`. 3.4 removed the report generator
  (`pkp/pkp-lib#6782`) (read in the code).
- A neighbouring case with a different cause: an unknown path after
  `reports` (`…/stats/reports/nosuch`) falls to `default: assert(false)`
  in `PKPStatsHandler::reports()` and answers 200 with an empty page
  (seen on screen, with and without the fix).

## Proposed fix

Name the page and the op, as the side menu does
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/report-address-unknown-name-404/fix.diff)):

```diff
         if ($pluginName == '' || !isset($reportPlugins[$pluginName])) {
-            $request->redirect(null, null, 'stats', ['reports']);
+            $request->redirect(null, 'stats', 'reports');
         }
```

Tried on `main` on all three apps. With the fix, steps 4 to 7 land on
the "Reports" page. These did the same with the fix in and out:

- As `dbarnes`, pressing "Review Report" on "Reports" (OJS, OMP)
  downloads its file. Typing its address with the right name
  (`?pluginName=ReviewReportPlugin`) downloads it too.
- As `dbarnes`, `…/stats/reports/nosuch` gives an empty page (Cause,
  last bullet).
- As an Author (`ccorino`; on OMP `aclark`), the step 4 address gives
  "The current role does not have access to this operation."

**Alternatives**:

- `redirect(null, null, 'reports')`, which leaves the page empty so the
  current page is used, works the same. Naming `stats` matches how the
  menu and the COUNTER plugin build this address.
- Answering 404 for an unknown name is honest, but it throws away the
  original intent and leaves the person at a dead end.
- Matching the name case-insensitively is not needed. The page's own
  links always use the exact name.

**What goes with it**:

- No stored data and no API change. The diff applies to `stable-3_5_0`
  as written. On 3.4 and 3.3, the line it removes passes `'reports'` as
  a plain string rather than `['reports']`, so the diff has to be cut
  again there. The new line is the same. 3.3 needs it in
  `generateReport()` as well.
- Left out: the empty page for an unknown path after `reports` (Cause,
  last bullet). A `default:` that calls `displayReports()`, or that
  throws `NotFoundHttpException` as `displayReports()` does without a
  context, would close it. That is a separate choice for the team.
- Guard: an e2e check that opens a report address with an unknown
  report name and expects the "Reports" page, not a 404.

Small: the redirect is already there; only its target changes.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/report-address-unknown-name-404/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/report-address-unknown-name-404/lib.js),
  on an install freshly loaded from PKP's default test dataset
  (pkp/datasets e8dafbc, 2026-10-02, PostgreSQL):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all
  shared/playwright/checks/issues/report-address-unknown-name-404/walk.js`
  (the Steps and the control). Adding `neighbour` runs the fix's
  neighbour check: "Review Report" pressed, `…/stats/reports/nosuch`,
  and the Author's refusal.
- Walked on OJS, OMP and OPS, on `main` and `stable-3_5_0`, on
  2026-10-02, with the same results on both. No server error and no
  script error was recorded.
- Fix trial: `node bin/try-fix.js apply
  shared/playwright/checks/issues/report-address-unknown-name-404/fix.diff
  ojs omp ops`, then the Steps and the neighbour check on all three
  apps, then the neighbour check again after `revert`.
- Tips: `main` OJS b84f8e2e44 (lib/pkp ddd8ab243a), OMP 3b0ecf794 and
  OPS c8af945bb7 (lib/pkp 3dc90c81a6; `PKPStatsHandler.php` is
  byte-identical in both pkp-lib commits); `stable-3_5_0` OJS
  091fb65453, OMP 9c5e24246, OPS 38b61882d3 (lib/pkp cf3f984335);
  `stable-3_4_0` pkp-lib 9e41f10273 (OJS c1827e3527, OMP 0aec65441, OPS
  acd8ae704b); `stable-3_3_0` pkp-lib ac3fa73402 (OJS ac77c9fb35, OMP
  8e72fc883, OPS c5532e2161).
- Code reads:
  - `PKPStatsHandler::reports()` and `report()` on `main` and 3.5.
  - The same handler on 3.4 (`redirect(null, null, 'stats', 'reports')`,
    line 585).
  - `PKPStatsHandler.inc.php` on 3.3 (the same line in `report()`, line
    448, and in `generateReport()`, line 509).
  - `PKPRequest::redirect()` on `main`, 3.4 and 3.3: the same parameter
    order; untyped on 3.4 and 3.3, so the string path builds the same
    address.
  - The statistics submenu in `PKPTemplateManager`; `ReportPlugin` and
    `Plugin::getEnabled()` / `getCanDisable()`;
    `PluginRegistry::loadCategory()`.
  - Each app's `pages/stats` on 3.4 and 3.3 (present on all three apps).
  - The report plugins on each line: OJS `articles`, `counter`,
    `reviewReport`, `subscriptions` on main, 3.5 and 3.4, plus `views`
    on 3.3. OMP has `monographReport` and `reviewReport`; OPS has none.
  - A search of pkp-lib, OJS, OMP and OPS on `main` for every
    `redirect(…, null, '<literal>'…)`.
- Introduced: `git blame` on the redirect line gives 388c69c960
  (`pkp/pkp-lib#10828`, 2025-01-22), which only turned the path into an
  array. `git log -S "'stats', 'reports'"` gives 35595503c9, merged in
  `pkp/pkp-lib#6403` (2020-12-02). It wrote both stats-page lines: the
  one in `report()`, and the one in `generateReport()`, which replaced
  the correct `redirect(null, null, 'tools', 'statistics')`. The
  mistake in `PKPToolsHandler::report()` dates from a7b42559cd
  (2014-02-24, Bruno Beghelli, "*8521* Introduce interface to retrieve
  reports").
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/omp, pkp/ops,
  pkp/ui-library; issues and PRs) by "stats/stats/reports", "report
  pluginName 404", "reports page 404 not found statistics", "report
  plugin redirect wrong url", `PKPStatsHandler` with `report redirect`,
  and `displayReports`. Nothing matched this fault. The nearest,
  `pkp/pkp-lib#11485`, is about role access to the statistics pages.
- Not walked: 3.4 and 3.3.
- MySQL not checked. The fault is in how the address is built, not in a
  query.
