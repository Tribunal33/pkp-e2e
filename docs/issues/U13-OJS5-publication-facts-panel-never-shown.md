# Readers never see the "Publication Facts" panel beside an article, though the plugin is on

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Crash** server
- **Affects**
  - main: OJS
  - 3.5: OJS (with `strict = On`; code)
  - 3.4: OJS (with `strict = On`, the plugin installed from the Plugin Gallery; code)
  - 3.3: none (code)
- **Introduced** `pkp/pkp-lib#11601` · [1810f38f34](https://github.com/pkp/pkp-lib/commit/1810f38f34c3fc0fb22640ac9fbc4e303fc6b942) · 2025-07-07 · Alec Smecher (asmecher)
- **Upstream** none found (2026-10-01)
- **Tracked in** U13 [OJS5](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U13-article-landing-page-and-reading.md#ojs5)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal turns on "Publication Facts Label plugin". Readers then see no "Publication Facts" panel on any article page, in any language, including the articles the plugin is meant to show it on.

On every article page the plugin's code fails on the server. The app catches the error, so the page itself loads, but the panel is missing. Nobody is told: the plugin's settings window saves normally, and the article page shows no message.

There is no way round, and the next release would ship this.

## Impact

- **Lost:** the panel that tells readers how the article was reviewed and published (peer reviewers, data availability, funding, competing interests, acceptance rate, days to publication, indexes). Each article view also writes two errors with stack traces to the server's error log.
- **Who:** every reader of a journal that has turned the plugin on, on every article page. The plugin is bundled with OJS `main` and off by default.
- **Way round:** none.

Medium: an optional reader feature would stop working, silently, for every journal that uses it once the next release ships, while the article page itself works. It would be high if the plugin were on by default.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OJS `main`. The "Publication Facts Label plugin" is installed but off in the dataset, so step 2 turns it on. Both sections ("Articles", "Reviews") are peer-reviewed, and the plugin needs no setting to show its panel.
- Seeing the fault needs nothing more. Seeing the panel once the fault is fixed needs an install that can reach `https://pkp.sfu.ca`, where the plugin fetches the figures for other journals.

As the editor:

1. Sign in as `dbarnes`.
2. Settings › Website › "Plugins": tick "Publication Facts Label plugin". The notice reads "The plugin "Publication Facts Label plugin" has been enabled."
3. Sign out.

As a reader:

4. Open the article page of submission 1, "Signalling Theory Dividends" (`/index.php/publicknowledge/article/view/1`).
5. Open the article page of submission 17, "Antimicrobial, heavy metal resistance and plasmid profile of coliforms isolated from nosocomial infections in a hospital in Isfahan, Iran" (`/index.php/publicknowledge/article/view/17`). This is the dataset's other published article. It shows that the panel is missing from every article, not from one.

Both articles are in "Vol. 1 No. 2 (2014)", section "Articles".

**Expected:** at the end of each article's side column (after the license block, when the article has one), a closed "Publication Facts" panel. Its arrow opens the rows "Peer reviewers", "Data availability", "External funding", "Competing interests", "Articles accepted", "Days to publication", "Indexed in", "Editorial team list", "Society" and "Publisher". The page loads the plugin's `pfl/js/pfl.js` and `pfl/locale/en.json`.

**Observed:** both pages answer 200 and look as they did before the plugin was on. There is no panel, and neither file is requested. On each page view the server logs:

```
Plugin APP\plugins\generic\pflPlugin\PflPlugin failed to handle the hook TemplateManager::display
Error: Undefined constant "APP\plugins\generic\pflPlugin\STYLE_SEQUENCE_LAST" in …/plugins/generic/pflPlugin/PflPlugin.php:452
Plugin APP\plugins\generic\pflPlugin\PflPlugin failed to handle the hook Templates::Article::Details
Error: Undefined constant "APP\plugins\generic\pflPlugin\STATUS_PUBLISHED" in …/plugins/generic/pflPlugin/PflPlugin.php:75
```

With the plugin off (before step 2), the same page logs nothing.

## Cause

`plugins/generic/pflPlugin/PflPlugin.php` (the `pkp/pflPlugin` submodule, namespace `APP\plugins\generic\pflPlugin`) uses three constants without their class:

- `STATUS_PUBLISHED` in `getPublishedReviewableSubmissionCount()` (line 75);
- `STYLE_SEQUENCE_LAST` twice in `addPflJsAndCss()` (lines 452 and 499).

They resolved to global aliases that pkp-lib defined (`define('STATUS_PUBLISHED', …)` in `PKPSubmission`, `define('STYLE_SEQUENCE_LAST', …)` in `PKPTemplateManager`) until `pkp/pkp-lib#11601` ("Remove class and constant aliases") deleted them on `main`. Since then each of these uses throws an `Error`.

Both of the plugin's hooks reach one of them on every article page:

- `handleTemplateDisplay()` (`TemplateManager::display`) calls `addPflJsAndCss()`, which throws before it adds `pfl.js`, the `pfl_locale` preload of the label file and the styles. The throw also stops `handleTemplateDisplay()` before it registers the `authorCiFilter()` output filter.
- `displayArticlePfl()` (`Templates::Article::Details`) calls `getPublishedReviewableSubmissionCount()` at line 243, before it renders `pfl.tpl`.

`Hook::run()` catches errors thrown in plugin code and logs them through `PluginFailureHandler::logIfPluginFailure()`. That is the server crash in the header: each hook fails, the error is caught and logged, and the page renders without the plugin's output.

Ahead of #11601, pflPlugin `db029f5` qualified the one bare constant in the plugin's settings form (`NOTIFICATION_TYPE_SUCCESS`, now `Notification::NOTIFICATION_TYPE_SUCCESS`). That pass missed these three in `PflPlugin.php`. OJS bundled the plugin as a submodule after #11601 (`fb4966dfc8`, 2025-10-21), so on `main` the panel has never shown.

Reach:

- The competing-interests statements that `authorCiFilter()` adds under each author never appear, because the filter is never registered. This was checked in the code. On screen, the author list never gets the plugin's `author-list` id until the fix is in; the dataset's authors hold no statement to show.
- An article the plugin excludes (in a section marked "Will not be peer-reviewed", or submitted before "Start Date") returns from `displayArticlePfl()` before the call at line 243. The `TemplateManager::display` failure is still logged on its page (checked on screen with "Start Date" 2099-01-01).
- The settings window is not affected: it saves, with "Your changes have been saved." (checked on screen). Its form address uses `$smarty.const.ROUTE_COMPONENT`, another alias #11601 removed. The constant now resolves to nothing, and `PKPTemplateManager::smartyUrl()` falls back to the request's own router, which is the component router there. So the address is unchanged (checked on screen: the same address with and without the fix).
- No other PHP file in OJS, OMP or OPS, their `lib/pkp` or their bundled plugins uses an alias #11601 removed (checked in the code). Among templates, only pkp-lib's `templates/user/userPasswordReset.tpl` still has `$smarty.const.ROUTE_PAGE`, which falls back the same way on a page request (checked in the code; outside this fix).
- 3.5 bundles the plugin (pflPlugin `stable-3_5_0`) with the same three bare constants, and so does the plugin's `stable-3_4_0` branch (OJS 3.4 does not bundle it). There, pkp-lib still defines the aliases, but only while `strict = Off` in `config.inc.php` (the shipped default). With `strict = On` the same two errors follow (checked in the code).
- No stored data is affected.

## Proposed fix

Qualify the three constants in `PflPlugin.php` with their classes. The other `STATUS_PUBLISHED` uses in the same file already read `PKPSubmission::STATUS_PUBLISHED`, and the bundled plugins write `TemplateManager::STYLE_SEQUENCE_LAST` (`CitationStyleLanguagePlugin`, `CrossrefPlugin`, `URNPubIdPlugin`). Give the settings form the router constant the way pkp-lib's templates write it. Both classes are already imported, and no global alias is needed.

The diff is [fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/fix.diff). Its paths are relative to the OJS root. In a `pkp/pflPlugin` checkout, apply it with `git apply -p4`.

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
--- a/plugins/generic/pflPlugin/templates/settings.tpl
+++ b/plugins/generic/pflPlugin/templates/settings.tpl
@@ -15,7 +15,7 @@
 	{rdelim});
 </script>
 
-<form class="pkp_form" id="pflPluginSettingsForm" method="post" action="{url router=$smarty.const.ROUTE_COMPONENT op="manage" category="generic" plugin=$pluginName verb="settings" save=true}">
+<form class="pkp_form" id="pflPluginSettingsForm" method="post" action="{url router=PKP\core\PKPApplication::ROUTE_COMPONENT op="manage" category="generic" plugin=$pluginName verb="settings" save=true}">
 	{csrf}
 	{include file="controllers/notification/inPlaceNotification.tpl" notificationId="pflPluginSettingsFormNotification"}
 
```

The fix was tried on OJS `main`. With the fix in, the two errors were gone, `pfl.js` and the label file loaded, and the author list carried the plugin's id. The test install cannot reach `pkp.sfu.ca`, so the plugin's next step, the statistics request, failed there. For the trial only, `getStatistics()` was patched to return a saved copy of that service's answer instead of making the request. With that patch, steps 4 and 5 showed the closed "Publication Facts" panel on both pages, and the server logged nothing.

**Alternatives:**

- Restore the global aliases in pkp-lib. That undoes #11601 for one plugin's sake.
- Add `use const` imports in the plugin. That would work, but nothing else in the code base uses them.

**What goes with it:**

- The fix lands in `pkp/pflPlugin` (`main`), then reaches OJS through a submodule pointer bump.
- Backport: the same change, on pflPlugin's `stable-3_5_0` (bundled with OJS 3.5) and `stable-3_4_0` (the branch for 3.4), fixes installs that run with `strict = On`. It applies there as written, with line offsets of up to 16. The settings form's router constant there is `PKP\core\PKPApplication::ROUTE_COMPONENT`, which 3.5's and 3.4's pkp-lib templates already use.
- The guard: an OJS e2e or Cypress check that enables the plugin and reads the panel on a published article's page. A static check in the plugin's CI (PHPStan reports undefined constants) would have caught it when #11601 merged. Neither exists today.

Small: four lines in one plugin, and a check.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js) takes Steps 1 to 5 through the screens on an install freshly loaded from the default dataset (pkp/datasets 38ab955, 2026-09-30), with a control read of article 1 before step 2. It records each screen, the panel element, the plugin's requests and the server log lines for each article page. Run: `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/publication-facts-panel-never-shown/walk.js`.
- Fix trial: [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/trial.sh) applies fix.diff with `node bin/try-fix.js apply` and walks the Steps and [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/neighbour.js). The neighbour saves the settings window with a society, an address and "Start Date" 2099-01-01, reopens it, then reads article 1. The trial then applies [trial-stats-stand-in.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/publication-facts-panel-never-shown/trial-stats-stand-in.diff) (fix.diff, plus `getStatistics()` returning the JSON `https://pkp.sfu.ca/ojs/pflStatistics.json` answered on 2026-10-01) and walks the Steps again. Last, it reverts and walks neighbour.js without the fix. With the fix in and out, the neighbour's window saved and reloaded its values, and article 1 showed no panel.
- `main` walked at OJS bade233f73 (2026-09-30), pkp-lib 2e377d27fc (2026-09-29), pflPlugin 622c85d (2026-08-27, its `main` tip), on PostgreSQL. The walk saw the Observed above on both article pages.
- 3.5 walked (`strict = Off`, the dataset's setting) at OJS 92b9a16b48 (2026-09-30), pkp-lib a9c76aed62 (2026-09-29), pflPlugin 95f7a35 (2026-04-07). The constants resolved: `pfl.js` and the label file loaded, the author list carried the plugin's id, and `displayArticlePfl()` ran past line 243. It then failed on the statistics request ("cURL error 7: Failed to connect to pkp.sfu.ca port 443"), so the panel itself was not seen on 3.5. Code read: the same three bare constants. pkp-lib's `PKPSubmission.php` and `PKPTemplateManager.php` define the global aliases only while `PKP_STRICT_MODE` (`[general] strict`) is false. #11601 is not on the branch. `strict = On` was not walked.
- 3.4 read in the code at OJS `stable-3_4_0` 9571d8fde7 (2026-09-25), pkp-lib df13621c2d, pflPlugin `stable-3_4_0` 97cf5da. OJS does not bundle the plugin there. The plugin has the same three bare constants, and pkp-lib defines the aliases under `!PKP_STRICT_MODE`. 3.3 read at OJS `stable-3_3_0` 9fdb9bcf9a (2026-09-18), pkp-lib d446601ebe, pflPlugin `stable-3_3_0` 7a91388. The plugin is not namespaced there, and pkp-lib defines both constants globally, unconditionally (`PKPSubmission.inc.php`, `PKPTemplateManager.inc.php`).
- Introduced: `git blame` on `PflPlugin.php` gives pflPlugin 6aa5700 (2025-06-23, "Adapt DB calls for Laravel") for line 75 and 8fac555 (2025-06-23) for lines 452 and 499. Both were right then, while the aliases existed. pkp-lib 1810f38f34 (`pkp/pkp-lib#11601`, merged 2025-07-07) removed `STATUS_PUBLISHED` and `STYLE_SEQUENCE_LAST` from the alias lists. The PR links no issue.
- Every-instance search: the constant names removed in 1810f38f34's diff, searched across the PHP files and templates of OJS, OMP and OPS `main`, their `lib/pkp` and their bundled plugins, leaving out comments, class-qualified uses and strings.
- Upstream (2026-10-01): pkp/pflPlugin, pkp/pkp-lib, pkp/ojs and pkp/ui-library searched for the plugin's name, the panel and the two constants. `pkp/pkp-lib#13098` (open) quotes the `STATUS_PUBLISHED` error in its log, from a `main` install, but reports a different fault: CRediT roles missing beside the panel on 3.5.
- Not driven: the French page and a section marked "Will not be peer-reviewed" (the register entry's other cases), because both hooks fail before anything that depends on them. OMP and OPS do not have the plugin.
- Unverified: the open panel's rows with the fix in (the trial read the closed panel's heading only), and the fix on an install with outbound access (the trial stood in for the statistics request).
