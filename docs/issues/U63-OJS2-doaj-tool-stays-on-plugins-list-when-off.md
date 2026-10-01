# With "DOAJ Plugin" switched off, the Plugins list still shows its export tool as on

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "DOAJ Plugin"; the DOAJ tool is an ordinary import/export tool there)
  - 3.4: none (code; no "DOAJ Plugin")
  - 3.3: none (code; no "DOAJ Plugin")
- **Introduced** `pkp/ojs#4985` for `pkp/pkp-lib#11589` and `pkp/pkp-lib#11593` · [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667fd6ee041d1393e82b9f16c479c1f43) · 2025-06-30 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-01)
- **Tracked in** spec U63 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs2)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)

## Summary

A journal manager switches off "DOAJ Plugin" on Settings › Website ›
"Plugins". The Tools list drops "DOAJ Export Plugin", but the Plugins
list keeps it under "Import/Export Plugins", ticked and greyed out, so
DOAJ still looks active there. The row's "Import/Export Data" link opens
a page with no heading and no menu that shows the Tools page's list of
tools as one line of code, `{"status":true,"content":"…"}`.

DOAJ deposits do stop, so nothing is lost. "DOAJ Plugin" is on for
every new journal, so only journals whose manager has switched it off
see the stray row. The switch came with a 2025 change that is not yet
in any release.

## Impact

- **Lost.** Nothing: DOAJ is off, as the manager asked.
- **Who.** A journal manager on Settings › Website › "Plugins", on a
  journal that does not use DOAJ.
- **Way round.** The "DOAJ Plugin" box under "Generic Plugins" shows the
  real state.

Low: a listing that misleads while the outcome is right. It would be
higher if deposits went on while the plugin was off.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`, OJS, journal `publicknowledge`.
  "DOAJ Plugin" is on there, as on every new journal.

Steps:

1. Sign in as `dbarnes`.
2. Open Settings › Website, tab "Plugins". Under "Generic Plugins",
   "DOAJ Plugin" is ticked. Under "Import/Export Plugins", "DOAJ Export
   Plugin" is listed, ticked, its box not pressable.
3. Untick "DOAJ Plugin" and answer "OK" to "Are you sure you want to
   disable this plugin?". The notice reads 'The plugin "DOAJ Plugin" has
   been disabled.'
4. Reload the page and open the "Plugins" tab again. Look at
   "Import/Export Plugins".
5. In the side menu, open "Tools". Its "Import/Export" list has no "DOAJ
   Export Plugin".
6. Back on Settings › Website › "Plugins", press the arrow beside "DOAJ
   Export Plugin", then "Import/Export Data".

**Expected.** From step 4, "Import/Export Plugins" no longer lists "DOAJ
Export Plugin", just as the Tools list in step 5 does not, so step 6 has
nothing to press. Ticking "DOAJ Plugin" again brings the row back.

**Observed.** Step 4 still lists "DOAJ Export Plugin" ("Export Journal
for DOAJ."), ticked, its box not pressable, between "Crossref XML
Export Plugin" and "DataCite Export/Registration Plugin". Step 5 lists
"Crossref XML Export Plugin", "DataCite Export/Registration Plugin",
"Native XML Plugin", "Users XML Plugin" and "PubMed XML Export Plugin",
without DOAJ. Step 6 opens
`/index.php/publicknowledge/en/management/importexport/plugin/DOAJExportPlugin`,
which answers 200 `application/json`. The browser shows one line of raw
code text, with no heading and no menu:

```
{"status":true,"content":"<div class=\"pkp_page_content pkp_page_importexport_plugins\">\n\t<ul>\n\t\t\t\t<li><a href=\"http:\/\/…\/index.php\/publicknowledge\/en\/management\/importexport\/plugin\/CrossrefExportPlugin\">Crossref XML Export Plugin<\/a>:&nbsp;Export article metadata in C…
```

With "DOAJ Plugin" on, the same link opens the tool's page, headed
"DOAJ Export Plugin".

## Cause

`PubObjectsExportGenericPlugin::register()`
(`classes/plugins/PubObjectsExportGenericPlugin.php`, lines 37–57)
calls `$this->setExportPlugin()` (line 47) whether or not the plugin is
enabled. For `DOAJPlugin`, its one subclass, that registers
`DOAJExportPlugin` in the `importexport` category.

"DOAJ Plugin" is lazy-loaded (`<lazy-load>1</lazy-load>` in its
`version.xml`). On an ordinary request, `Dispatcher` loads generic
plugins enabled-only (`PluginRegistry::loadCategory('generic', true)`),
so a switched-off DOAJ plugin is never registered. That is why the
Tools list leaves the tool out.

The Plugins list loads every category from disk instead
(`PluginGridHandler::loadCategoryData()` calls
`PluginRegistry::loadCategory($category)` without `$enabledOnly`). That
registers the switched-off DOAJ plugin, and its `register()` then adds
`DOAJExportPlugin` to the "Import/Export Plugins" category. Import/export
tools cannot be switched off, so the row shows ticked and greyed out.
Its "Import/Export Data" (`ImportExportPlugin::getActions()`) points at
`management/importexport/plugin/DOAJExportPlugin`. On that request the
tool is not registered, so `PKPToolsHandler::importexport()` falls
through to the Tools tab's JSON fragment.

The lazy-loaded generic plugins that register other plugins all check
`getEnabled($mainContextId)` first: `WebFeedPlugin`,
`AnnouncementFeedPlugin` and `CustomBlockManagerPlugin`. The base class
added in b10a6cb667 (`pkp/pkp-lib#11589`) does not. 34a2dc86b9
(`pkp/pkp-lib#11593`, the same PR) then turned DOAJ from an import/export
tool into this generic plugin, which is when the switch and the stray
row appeared.

Reach:

- The same request also adds the plugin's `Publication::publish`,
  `Publication::unpublish` and `Publication::version` hooks. Each
  handler returns at once while the plugin is off, so nothing is
  deposited or marked. Checked in the code.
- Other from-disk loads register the tool the same way, with nothing
  shown: `CommandLineTool` (the command-line tools) and
  `DOAJInfoSender::_getJournals()`. `OrcidWork` loads generic plugins
  from disk too. Checked in the code.
- Administration › Site Settings › "Plugins" builds its list the same
  way (`AdminPluginGridHandler` extends `PluginGridHandler`), with no
  journal, so it lists "DOAJ Export Plugin" whatever the site-wide
  "DOAJ Plugin" box says. That box is on after install and upgrade (see
  "What goes with it"), so the stray row shows there only after an
  administrator unticks it. Checked in the code, not driven.
- "Crossref XML Export Plugin" and "DataCite Export/Registration Plugin"
  stay on both lists while their manager plugins are off. That is not
  this fault: those plugins are not lazy-loaded, so they load on every
  request and register their tools by design. Checked on screen and in
  the code.

## Proposed fix

Register the tool and its hooks only while the plugin is enabled, in
the shared base class (tried,
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/fix.diff)):

```diff
--- a/classes/plugins/PubObjectsExportGenericPlugin.php
+++ b/classes/plugins/PubObjectsExportGenericPlugin.php
@@ -40,7 +40,9 @@
             return false;
         }
 
-        if (Application::isUnderMaintenance()) {
+        // A plugin read from disk (the Plugins list, the command line) is
+        // registered even while switched off: keep its tool and hooks out then.
+        if (Application::isUnderMaintenance() || !$this->getEnabled($mainContextId)) {
             return true;
         }
```

This is the check `WebFeedPlugin::register()` and its siblings make,
and it covers every subclass, not only DOAJ. Only the loads from disk
change. Where plugins are loaded only when enabled (every ordinary
request, the scheduled tasks), the new check always passes. The query
that loads them, `VersionDAO::getCurrentProducts()`, already keeps only
plugins whose `enabled` setting is on for the same journal (or for the
site, when there is no journal). That is the setting `getEnabled()`
reads.

Tried on OJS `main`: the walk showed the Expected. With "DOAJ Plugin" on,
and again after it was switched off and back on, both lists offered the
tool and its "Import/Export Data" opened the "DOAJ Export Plugin" page,
the same as without the fix.

**Alternatives**

- Hide the row in `PluginGridHandler`, or through
  `DOAJExportPlugin::getHideManagement()`. That fixes this one list
  only: the command line and the other loads from disk would still
  register a tool that is switched off.
- Stop lazy-loading "DOAJ Plugin", as Crossref and DataCite do. That
  loads it on every request just to keep a tool listed that is off.

**What goes with it**

- The command line, accepted. `CommandLineTool` loads generic plugins
  from disk in its constructor, before `tools/importExport.php` reads the
  journal from its arguments. So `getEnabled()` reads the site-wide
  `enabled` row, not the journal's. With the fix,
  `tools/importExport.php DOAJExportPlugin …` needs that row on. Today it
  runs whatever either row says.
- That row is on after a fresh install and after an upgrade.
  `Plugin::register()` hooks `installSiteSettings()` on
  `Installer::postInstall`, which an upgrade runs too (`Upgrade` extends
  `Installer`). `PluginSettingsDAO::installSettings()` then writes
  `settings.xml`'s `enabled` = true wherever the row is missing. The 3.6
  upgrade `I11593_DOAJGenericPlugin` adds only the journals' rows.
- So the command line changes only where an administrator has switched
  "DOAJ Plugin" off on Administration › Site Settings › "Plugins", and
  it then follows that choice. A run of the scheduled tasks from the
  command line already depends on the same row. Reading the journal's
  own setting is not possible at that point, because the journal is not
  yet known. Checked in the code; the command line was not run.
- No stored data to repair, no API or hook contract changed.
- No backport: 3.5 and older have no "DOAJ Plugin".
- Guard: in the spec's "'DOAJ Plugin' unticked" scenario, a check that
  the Plugins list's "Import/Export Plugins" leaves out "DOAJ Export
  Plugin" (a **Planned** item).

Small: one condition in one shared class, tried on screen. A proposal;
the team decides.

## Evidence

- Kept script that takes the Steps through the screens on an install
  loaded from PKP's default test dataset:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/walk.js)
  (helpers in
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/lib.js)),
  run with
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/walk.js`
  after `npm run fleet-prep -- --feature <feature> --dataset <n> --reset`
  (`PKP_E2E_LINE=stable-3_5_0` in front of both for 3.5).
- The fix, tried 2026-10-01 on the `main` tip below:
  `node bin/try-fix.js apply shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/fix.diff ojs`,
  then walk.js and
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-stays-on-plugins-list-when-off/neighbour.js)
  (each after a reset), then `node bin/try-fix.js revert …` the same
  way. neighbour.js was also run without the fix. The only difference
  between the two runs: with "DOAJ Plugin" off, the Plugins list lost
  `DOAJExportPlugin` with the fix in.
- Walked 2026-10-01 on PostgreSQL, each install freshly loaded from
  pkp/datasets
  [38ab955](https://github.com/pkp/datasets/commit/38ab95511dd060c2ea185cb11eb5eedfb2a99e40)
  (2026-09-30). Nothing here depends on the database.
- Tips: `main` ojs
  [bade233f73](https://github.com/pkp/ojs/commit/bade233f73), lib/pkp
  [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc);
  `stable-3_5_0` ojs
  [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48), lib/pkp
  [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed62);
  `stable-3_4_0` ojs
  [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7), lib/pkp
  [df13621c2d](https://github.com/pkp/pkp-lib/commit/df13621c2d);
  `stable-3_3_0` ojs
  [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9a), lib/pkp
  [d446601ebe](https://github.com/pkp/pkp-lib/commit/d446601ebe).
- 3.5, walked and read: `plugins/importexport/doaj`, no
  `plugins/generic/doaj` and no `classes/plugins/PubObjectsExportGenericPlugin.php`.
- 3.4 and 3.3, code: `git ls-tree upstream/stable-3_4_0` and
  `upstream/stable-3_3_0` in the app checkout show `plugins/importexport/doaj`
  and no generic DOAJ plugin or `PubObjectsExportGenericPlugin`.
- Introduced: `git blame` on line 47 of
  `classes/plugins/PubObjectsExportGenericPlugin.php` gives
  b10a6cb667 (the file's creation). The only subclass, `DOAJPlugin`,
  was created in
  [34a2dc86b9](https://github.com/pkp/ojs/commit/34a2dc86b965d3c3037ceb21d1a2e2e974d5713b)
  (2025-06-30, `pkp/pkp-lib#11593`). GitHub's `commits/<sha>/pulls`
  names `pkp/ojs#4985` for both commits (merged 2025-10-04 into `main`).
- Upstream search 2026-10-01: pkp/pkp-lib, pkp/ojs and pkp/ui-library,
  for "DOAJ plugin disabled", "DOAJ export plugin list", "DOAJ generic
  plugin", "disabled plugin still listed import/export" and
  `PubObjectsExportGenericPlugin`. Read and not the same fault:
  `pkp/pkp-lib#12939` (the tool's description wording),
  `pkp/pkp-lib#13096` (the daily deposit's journal check). Not searched:
  "DOAJ Import/Export Data".
- Release: pkp/ojs has no `3_6_*` tag (the latest release tag is
  `3_5_0-5`, read with `git ls-remote --tags` on 2026-10-01), and the
  `stable-3_5_0` tip has no generic DOAJ plugin, so the change is on
  `main` only.
- Not driven: the command line and the site-wide Plugins list
  (Administration › Site Settings › "Plugins"); both are read in the
  code only.
