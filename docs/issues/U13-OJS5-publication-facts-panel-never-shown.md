# With the Publication Facts Label plugin on, no article page shows the "Publication Facts" panel

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: none
  - 3.4: none (code; the plugin is not bundled)
  - 3.3: none (code; the plugin is not bundled)
- **Introduced** `pkp/pkp-lib#11601` · [1810f38f34](https://github.com/pkp/pkp-lib/commit/1810f38f34c3fc0fb22640ac9fbc4e303fc6b942) · 2025-07-07 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01); `pkp/pkp-lib#13098` (open), about another symptom, quotes this failure in its server log
- **Tracked in** spec U13 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

With "Publication Facts Label plugin" on, no article page shows the
Publication Facts panel, in any language. The page opens normally
without it: the plugin fails on the server on every article page, and
the page is served without its output.

A journal that switches the plugin on and fills in its settings shows
readers nothing, and nobody is told. The authors' competing-interests
statements, which the plugin adds under their names, are missing too,
also on the articles meant to go without the panel (in a section marked
"Will not be peer-reviewed", or submitted before the plugin's "Start
Date").

## Impact

- **Lost.** The panel that tells readers how the article was reviewed
  and how the journal compares (reviewers, data availability, funding,
  competing interests, acceptance rate, days to publication, indexes),
  and the authors' competing-interests statements, which no other part
  of the article page shows.
- **Who.** Every visitor, signed in or not, on every article page of a
  journal with the plugin on.
- **Way round.** None. No setting of the plugin brings the panel back.

Medium: an optional panel is missing from every article page it should
show on, silently, while the article itself is complete. It would be
high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, OJS `main`: journal `publicknowledge`.
  Its published articles 1, "Signalling Theory Dividends", and 17,
  "Antimicrobial, heavy metal resistance and plasmid profile of
  coliforms isolated from nosocomial infections in a hospital in
  Isfahan, Iran", are in the section "Articles", whose "Will not be
  peer-reviewed" is unticked. The "Publication Facts Label plugin" is
  off.
- The install can reach `https://pkp.sfu.ca`, where the plugin fetches
  its figures for other journals.

Steps:

1. Sign in as `rvaca` (Journal manager).
2. Settings › Website › "Plugins": tick "Enabled" on "Publication Facts
   Label plugin".
3. Sign out.
4. Open article 1's page (`/index.php/publicknowledge/article/view/1`).
5. Open article 17's page (`/index.php/publicknowledge/article/view/17`).

**Expected.** Each page's side column ends with a box titled
"Publication Facts", under "Section". Expanded, it lists "Peer reviewers",
"Data availability", "External funding", "Competing interests",
"Articles accepted", "Days to publication", "Indexed in", "Editorial
team list", "Society" and "Publisher". The page loads the plugin's
script (`pfl/js/pfl.js`) and its English labels (`pfl/locale/en.json`).

**Observed.** Both pages answer 200 and show the article in full. The
side column ends with "Section" and "Articles", with no "Publication
Facts" box, and the page loads none of the plugin's files. The server logs,
for each of the two pages:

```
Plugin APP\plugins\generic\pflPlugin\PflPlugin failed to handle the hook TemplateManager::display
Error: Undefined constant "APP\plugins\generic\pflPlugin\STYLE_SEQUENCE_LAST" in …/plugins/generic/pflPlugin/PflPlugin.php:452
Plugin APP\plugins\generic\pflPlugin\PflPlugin failed to handle the hook Templates::Article::Details
Error: Undefined constant "APP\plugins\generic\pflPlugin\STATUS_PUBLISHED" in …/plugins/generic/pflPlugin/PflPlugin.php:75
```

The same steps on 3.5 show the "Publication Facts" box on both pages.

## Cause

`PflPlugin` (pkp/pflPlugin, bundled with OJS as
`plugins/generic/pflPlugin`) is a namespaced class that names two
pkp-lib constants by their bare global names:

- `STATUS_PUBLISHED` in `getPublishedReviewableSubmissionCount()` (line
  75). `displayArticlePfl()` handles `Templates::Article::Details` and
  writes the panel. It first returns early for an article meant to go
  without the panel (a section marked "Will not be peer-reviewed", or
  submitted before the plugin's "Start Date"); for every other article,
  this count is the first figure it computes.
- `STYLE_SEQUENCE_LAST` in `addPflJsAndCss()` (lines 452 and 499).
  `handleTemplateDisplay()`, the handler of `TemplateManager::display`,
  calls it to add the panel's script and styles to the article page.

PHP resolves such a name to the global constant, and pkp-lib `main`
defines neither any more. `pkp/pkp-lib#11601` ("Remove class and
constant aliases") deleted the loops in `PKPSubmission.php` and
`PKPTemplateManager.php` that defined `STATUS_PUBLISHED` and
`STYLE_SEQUENCE_LAST` globally while `strict` was off in
`config.inc.php` (the default). Each handler now throws "Undefined
constant". `Hook::run()` catches the error, logs it through
`PluginFailureHandler::logIfPluginFailure()` and goes on, so the page
is served without the panel and without the plugin's script.

The plugin's lines date from June 2025, when the aliases still existed,
and the same class already writes `PKPSubmission::STATUS_PUBLISHED` four
times. OJS `main` took the plugin in as a submodule in October 2025
([fb4966dfc8](https://github.com/pkp/ojs/commit/fb4966dfc82c95f22f6ee14877c5a6b250456825)),
after the aliases were gone, without these three lines changed.

Reach:

- Articles meant to get the panel, in any language: both hooks fail
  (walked, articles 1 and 17).
- Articles meant to go without it (a section marked "Will not be
  peer-reviewed", or submitted before "Start Date"):
  `displayArticlePfl()` returns before line 75, so only the
  `TemplateManager::display` failure is logged, and they lose the
  competing-interests statements below (code).
- Authors' competing-interests statements, on every article page:
  `handleTemplateDisplay()` registers `authorCiFilter()`, which adds
  each author's statement under their name, only after
  `addPflJsAndCss()`, so the filter is never registered. No template of
  the article page shows these statements otherwise (code).
- The plugin's settings window is not affected (code). Its
  `templates/settings.tpl` reads `$smarty.const.ROUTE_COMPONENT`, also
  gone, but Smarty gives null there and `url()` then uses the request's
  own router, which is the component router, so the form still posts to
  the right address.
- No other plugin bundled with OJS, OMP or OPS on `main` names a pkp-lib
  or app class constant by its bare name (code).
- Once the panel shows, a French (Canada) page will show it without
  labels: the plugin ships `fr.json`, not `fr_CA.json`. Its French
  (Canada) labels are a separate finding.
- 3.5 still defines both constants globally while `strict` is off. A 3.5
  install with `strict = On` would fail the same way (code).

## Proposed fix

Name the two constants through their classes, as the rest of the plugin
and the other plugins already do (`URNPubIdPlugin` writes
`TemplateManager::STYLE_SEQUENCE_LAST`). Both classes are already
imported in the file: `PKP\submission\PKPSubmission` and
`APP\template\TemplateManager`, which inherits the constant from
`PKPTemplateManager`. The change goes in pkp/pflPlugin, followed by a
submodule bump in OJS
([`fix.diff`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/fix.diff)):

```diff
--- a/plugins/generic/pflPlugin/PflPlugin.php
+++ b/plugins/generic/pflPlugin/PflPlugin.php
@@ -72,7 +72,7 @@
             ->join('sections AS sec', 'p.section_id', '=', 'sec.section_id')
             ->where('s.context_id', $journalId)
             ->where('sec.meta_reviewed', 1)
-            ->where('s.status', STATUS_PUBLISHED)
+            ->where('s.status', PKPSubmission::STATUS_PUBLISHED)
             ->when($dateStart, fn($q) => $q->where('s.date_submitted', '>=', strtotime($dateStart)))
             ->get()->first();
         return $row->submission_count;
@@ -449,7 +449,7 @@
             [
                 'inline' => false,
                 'contexts' => ['frontend'],
-                'priority' => STYLE_SEQUENCE_LAST
+                'priority' => TemplateManager::STYLE_SEQUENCE_LAST
             ]
         );
 
@@ -496,7 +496,7 @@
             [
                 'contexts' => 'frontend',
                 'inline' => true,
-                'priority' => STYLE_SEQUENCE_LAST,
+                'priority' => TemplateManager::STYLE_SEQUENCE_LAST,
             ]
         );
     }
```

Tried on `main`. With the fix, neither hook fails on the constants, and
both article pages load the plugin's script and labels and show the
"Publication Facts" box, which, expanded, lists the rows the Expected
names (the test install cannot reach `pkp.sfu.ca`, so the figures for
other journals were written into the plugin's cache; Evidence). The
journal's home page stays without the plugin's files, with the fix in
and out.

**Alternatives**

- Restore the global aliases in pkp-lib. That undoes `pkp/pkp-lib#11601`
  for one plugin, and every other caller has already moved to class
  constants.
- Write `\PKP\submission\PKPSubmission::STATUS_PUBLISHED` in full. It
  works as well, but the file already imports both classes.

**What goes with it**

- An OJS `main` commit moving `plugins/generic/pflPlugin` to the fixed
  plugin commit.
- Optional, in the same change: `templates/settings.tpl` can write
  `router=\PKP\core\PKPApplication::ROUTE_COMPONENT`, as
  `lib/pkp/templates/admin/settings.tpl` does, in place of
  `$smarty.const.ROUTE_COMPONENT`. It has no effect today (Reach).
- The plugin's `stable-3_5_0` commit needs no change (Reach).
- Test: an e2e scenario in U13, an article page with the plugin on that
  loads the plugin's script and logs no plugin failure.

A proposal. Small: three lines in one plugin file and a submodule bump,
tried.

## Evidence

- Kept script, which takes the Steps through the screens on an install
  freshly loaded from PKP's default test dataset (pkp/datasets 38ab955,
  the `main` and `stable-3_5_0` PostgreSQL dumps, no upgrade needed):
  [`shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js),
  with its helpers in `lib.js` beside it, run with
  `PROBE_FEATURE=issues-ir6 PROBE_AGENT=ir6 node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js`.
  It records, for articles 1 and 17 and for the journal's home page,
  the status, the panel's `section.pflPlugin`, the plugin's script and
  label preload, the plugin files the browser fetched, and the plugin's
  failures the server logged during the walk.
- The figures for other journals. `PflPlugin::getStatistics()` fetches
  `https://pkp.sfu.ca/ojs/pflStatistics.json` and keeps the answer as
  `Cache::remember('pflStats-<journal id>', 86400, …)`. The test
  install cannot reach outside servers, so once the constants are fixed
  (and on 3.5) the panel's handler fails there with "cURL error 7:
  Failed to connect to pkp.sfu.ca port 443". With `stats` as its
  argument the script reads the pages a second time through a second
  PHP server on the same code and database, whose file cache holds a
  `pflStats-<journal id>` entry with the answer pkp.sfu.ca gave on
  2026-10-01 (`startStatsStandIn()` in `lib.js`). On an expanded box it
  records the rows. The Steps did not need it
  on `main` without the fix, where both failures come before the fetch.
- The fix: `node bin/try-fix.js apply shared/playwright/checks/issues/publication-facts-panel-never-shown/fix.diff ojs`,
  then `walk.js stats` on a freshly loaded install, then
  `node bin/try-fix.js revert` with the same diff.
- Tips: OJS `main` bade233f73 (2026-09-30) with pkp-lib 2e377d27fc and
  pflPlugin 622c85dcb1 (pkp/pflPlugin `main`'s tip on 2026-10-01);
  OJS `stable-3_5_0` 92b9a16b48 (2026-09-30) with pkp-lib a9c76aed62
  and pflPlugin 95f7a35886 (1.2.1.4); `stable-3_4_0` 9571d8fde7 with
  pkp-lib df13621c2d; `stable-3_3_0` 9fdb9bcf9a with pkp-lib d446601ebe.
- 3.5 (walked, and read): the same script on the `stable-3_5_0`
  install. Without the cache entry, the pages loaded the plugin's script
  and labels, and the panel's handler stopped at the pkp.sfu.ca fetch;
  with it (`walk.js stats-only` on the same install), both article pages
  showed the "Publication Facts" box and nothing was logged. The read:
  `lib/pkp/classes/submission/PKPSubmission.php` and
  `lib/pkp/classes/template/PKPTemplateManager.php`, their
  `if (!PKP_STRICT_MODE)` loops.
- 3.4 and 3.3 (code): `upstream/stable-3_4_0` and `upstream/stable-3_3_0`
  of OJS have no `plugins/generic/pflPlugin` and no such entry in
  `.gitmodules`. Their pkp-lib (`origin/stable-3_4_0`'s
  `if (!PKP_STRICT_MODE)` loops, `origin/stable-3_3_0`'s `define()` in
  `PKPSubmission.inc.php` and `PKPTemplateManager.inc.php`) keeps both
  global constants, so a copy of the plugin from the gallery would not
  meet this fault there.
- Introduced: `git blame` on lines 75, 452 and 499 of `PflPlugin.php`
  (pkp/pflPlugin 6aa5700 and 8fac5555); `git log -S` on the alias loops
  in pkp-lib, which names 1810f38f34, whose `commits/<sha>/pulls` gives
  `pkp/pkp-lib#11601` with no linked issue; `git log` of the OJS
  submodule path (fb4966dfc8, no pull request).
- Every instance: a search of `plugins/` in the OJS, OMP and OPS `main`
  checkouts for every constant declared in their `lib/pkp/classes` and
  `classes`, used without a class; only these three lines in
  `PflPlugin.php` remain. pkp-lib `main` has no global constant loop
  left.
- Upstream search (2026-10-01), issues and pull requests, open and
  closed, in pkp/pkp-lib, pkp/ojs, pkp/ui-library and pkp/pflPlugin, for
  "Publication Facts", "pflPlugin", "Undefined constant",
  `STATUS_PUBLISHED` and `STYLE_SEQUENCE_LAST`. `pkp/pkp-lib#13098`
  (open, "conflict with the PFL and Credit Roles plugin", filed for
  3.5.0-5) reports CRedit roles missing on the article page; its log,
  from an install under `ojs/main`, carries this failure
  (`PflPlugin.php:75`), but the issue is about the roles. No other
  candidate.
- Not driven: MySQL (the fault does not depend on the database);
  French pages, and the "Start Date" and "Will not be peer-reviewed"
  cases, which are read in the code.
