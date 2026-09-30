# With "DOAJ Plugin" switched off, the Plugins list still offers the DOAJ tool, whose link shows raw JSON

- **Severity** low
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS
  - 3.5: none (no "DOAJ Plugin")
  - 3.4: none (code; no "DOAJ Plugin")
  - 3.3: none (code; no "DOAJ Plugin")
- **Introduced** `pkp/ojs#4985` for `pkp/pkp-lib#11589` and `pkp/pkp-lib#11593` · [b10a6cb667](https://github.com/pkp/ojs/commit/b10a6cb667fd6ee041d1393e82b9f16c479c1f43) and [34a2dc86b9](https://github.com/pkp/ojs/commit/34a2dc86b965d3c3037ceb21d1a2e2e974d5713b) · 2025-10-04 · Bozana Bokan (bozana)
- **Upstream** none found (2026-09-30)
- **Tracked in** spec U63 [OJS2](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U63-import-export.md#ojs2)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

In OJS, the "DOAJ Export Plugin" tool (Tools › "Import/Export") comes
with the generic "DOAJ Plugin": switching "DOAJ Plugin" off is how a
journal turns the DOAJ tool off. After a journal manager switches it
off, the Tools list rightly leaves "DOAJ Export Plugin" out. Settings ›
Website › "Plugins" does not: under "Import/Export Plugins" the "DOAJ
Export Plugin" row is still there.

That row's box shows ticked, so the tool reads as on, and the box cannot
be pressed. The row still offers "Import/Export Data". That link opens a
bare page of JSON text in place of the whole screen, with no heading,
side menu or link back. The JSON is the list the Tools page's
"Import/Export" tab shows: each tool's name, link and one-line
description, and no other data.

"DOAJ Plugin" is on by default, so only a journal that has switched it
off sees this. The generic "DOAJ Plugin" exists on `main` only; no
release has it yet.

## Impact

- **Lost.** Nothing. The tool is really off: it is not on the Tools list
  and deposits nothing.
- **Who.** Journal managers of a journal with "DOAJ Plugin" switched
  off, each time they open Settings › Website › "Plugins".
- **Way round.** None needed for any task. From the JSON page, the
  browser's back button returns to the Plugins list.

Low: nothing is lost and every task gets done. A tool that still worked
or deposited while its plugin is off would make it higher.

## Steps to reproduce

Preconditions: PKP's default test dataset for OJS `main`, journal
`publicknowledge`, where "DOAJ Plugin" is on. Nothing else.

1. Sign in as `rvaca` (Journal manager).
2. Side menu "Settings" › "Website", tab "Plugins". Under "Generic
   Plugins", "DOAJ Plugin" is ticked. Under "Import/Export Plugins",
   "DOAJ Export Plugin" is listed. Its box is ticked and cannot be
   pressed.
3. Untick "DOAJ Plugin". The window "Are you sure you want to disable
   this plugin?" opens; press "OK". The notice reads 'The plugin "DOAJ
   Plugin" has been disabled.'
4. Side menu "Tools". The "Import/Export" tab lists "Crossref XML Export
   Plugin", "DataCite Export/Registration Plugin", "Native XML Plugin",
   "Users XML Plugin" and "PubMed XML Export Plugin"; no "DOAJ Export
   Plugin".
5. Side menu "Settings" › "Website", tab "Plugins" again.
6. Under "Import/Export Plugins", press the arrow at the start of the
   "DOAJ Export Plugin" row, then "Import/Export Data".

**Expected.** With "DOAJ Plugin" off, the Plugins list leaves "DOAJ
Export Plugin" out, as the Tools list does, so there is no "Import/Export
Data" to press.

**Observed.** At step 5 the "DOAJ Export Plugin" row is still there, as
at step 2. At step 6 the browser opens
`/index.php/publicknowledge/en/management/importexport/plugin/DOAJExportPlugin`,
which answers HTTP 200 with `Content-Type: application/json`. The page
shows one line of text, with no heading and no menu:

```
{"status":true,"content":"<div class=\"pkp_page_content pkp_page_importexport_plugins\">\n\t<ul>\n\t\t\t\t<li><a href=\"http:\/\/…\/index.php\/publicknowledge\/en\/management\/importexport\/plugin\/CrossrefExportPlugin\">Crossref XML Export Plugin<\/a>:&nbsp;Export article metadata in Crossref XML format.<\/li>…
```

Control: tick "DOAJ Plugin" again, and Tools lists "DOAJ Export Plugin"
again. Its "Import/Export Data" on the Plugins list opens the tool's
page, headed "DOAJ Export Plugin", with the trail "Tools".

## Cause

`PubObjectsExportGenericPlugin::register()`
([classes/plugins/PubObjectsExportGenericPlugin.php, lines 37–57](https://github.com/pkp/ojs/blob/bade233f73f5a1ccfb7f29c48b8becdb278f1287/classes/plugins/PubObjectsExportGenericPlugin.php#L37-L57)),
the base class of `DOAJPlugin`, calls `$this->setExportPlugin()` on
every registration, whether or not the plugin is enabled in the
journal. `DOAJPlugin::setExportPlugin()` registers `DOAJExportPlugin` in
the `importexport` category.

Most requests never see this. `DOAJPlugin` is lazy-loaded
(`<lazy-load>1</lazy-load>` in `plugins/generic/doaj/version.xml`), and
the dispatcher loads generic plugins enabled-only
(`PluginRegistry::loadCategory('generic', true)` in `Dispatcher`). So
with the plugin off it is never registered, and neither is the tool:
Tools and the tool's own address see no DOAJ tool.

The Plugins list loads every category from disk:
`PluginGridHandler::loadCategoryData()` calls
`PluginRegistry::loadCategory($category)`, generic before importexport
(`Application::getPluginCategories()`). Registering the switched-off
`DOAJPlugin` there registers `DOAJExportPlugin` too, and the
"Import/Export Plugins" category lists it. An import/export plugin
extends `Plugin`, whose `getEnabled()` returns true, so the box shows
ticked; its `getCanDisable()` returns false, so the box is locked.
"Import/Export Data" opens `…/importexport/plugin/DOAJExportPlugin` in a
new request, where the tool is not registered.
`PKPToolsHandler::importexport()` then falls through to the Tools tab's
list as JSON, the fault of the report
[Opening the address of a tool the installation lacks shows the tool list as raw JSON](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/issues/U63-A1-tools-absent-tool-address-raw-json.md).

`pkp/ojs#4985` moved DOAJ from `plugins/importexport/doaj`, a tool that
was always on, into the generic "DOAJ Plugin" (34a2dc86b9), on the new
base class (b10a6cb667). Neither the code nor the commit messages say why
the base class registers the tool unconditionally. Our inference is that
the command line (`tools/importExport.php`) and the daily deposit task
(`DOAJInfoSender`), which run without a journal and look the tool up by
name, need it registered.

Reach:

- Every request that loads generic plugins from disk inside a journal
  with "DOAJ Plugin" off registers the tool and its schema additions
  (`PubObjectsExportPlugin::register()`): the Plugins list (on screen),
  `Locale::installLocale()`, `PKPContextService::add()` and
  `OrcidWork::getBibtexCitation()` (code). Only the Plugins list shows
  it; the others add hooks with no visible effect.
- `PluginRequiredPolicy::effect()` also loads the requested category
  from disk, for every action on the Plugins list (enable, disable,
  settings). With the fix, the request that switches "DOAJ Plugin" back
  on registers it without its tool; the tool is back on the next load of
  either list (on screen, with the fix).
- `CrossrefPlugin` and `DatacitePlugin` (OJS, and `CrossrefPlugin` in
  OPS) also register their tool unconditionally. They are not
  lazy-loaded, so their tool is on the Tools list and the Plugins list
  in every request, on or off: the two lists agree (on screen in OJS
  with both plugins off, as the dataset has them; code for on).
- `pkp/pkp-lib#13096` (closed) fixed the daily deposit task's side of
  the same registration: `DOAJInfoSender::_getJournals()` now skips a
  journal whose "DOAJ Plugin" is off.

## Proposed fix

Register nothing in a journal where the plugin is off, in
`PubObjectsExportGenericPlugin::register()`, and keep registering where
there is no journal. This follows the way `CrossrefPlugin::register()`
adds its enabled-only hooks behind `$this->getEnabled($mainContextId)`.
The diff is
[fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/fix.diff):

```diff
         if (Application::isUnderMaintenance()) {
             return true;
         }
 
+        // Switched off in this context: register nothing, so the export plugin
+        // stays off the Tools list and the Plugins list alike. Without a context
+        // (command line, scheduled tasks) it is registered as before.
+        $contextId = $mainContextId ?? Application::get()->getRequest()->getContext()?->getId();
+        if ($contextId !== null && !$this->getEnabled($contextId)) {
+            return true;
+        }
+
         $this->setExportPlugin();
```

The early return also skips the three `Publication::*` hooks. Each
handler starts with `getEnabled()`, which reads the request's journal.
The guard reads `$mainContextId` first, but no caller that loads generic
plugins passes one: `Dispatcher`, `PluginGridHandler`,
`PluginRequiredPolicy`, `PKPContextController`, `CommandLineTool`,
`DOAJInfoSender`, `OrcidWork` and `PluginRegistry::loadAllPlugins()` all
call `loadCategory()` without it (code). So the guard and the handlers
read the same journal, and a handler the guard skips would have returned
at once.

Tried on `main` (OJS): at step 5 the Plugins list no longer lists "DOAJ
Export Plugin", and the other five tools are unchanged. With the plugin
ticked again, Tools and the Plugins list list the tool, and its
"Import/Export Data" opens the tool's page. Without a journal, `php
tools/importExport.php list` still names `DOAJExportPlugin` and the
daily task `DOAJInfoSender` runs ("DONE"), with "DOAJ Plugin" off and
on, with and without the fix.

**Alternatives**

- Guard with `$this->getEnabled($mainContextId)` alone: without a
  journal it reads the site-wide setting, so the command line and the
  daily task would depend on a setting that has nothing to do with them.
- Filter the Plugins list (`PluginGridHandler`): the grid knows nothing
  of which generic plugin owns a tool, and the tool would still be
  registered in every other request that loads generic plugins from disk.
- Hide the row (`getHideManagement()` on `DOAJExportPlugin`): also hides
  it while the plugin is on, where the list rightly shows it.

**What goes with it**

- No stored data, REST endpoint or hook contract changes. Code that
  looks up `DOAJExportPlugin` in a journal where "DOAJ Plugin" is off no
  longer finds it in requests that load generic plugins from disk; the
  dispatcher's load already gave it nothing in the others.
- Test: an e2e check in U63 that the Plugins list leaves "DOAJ Export
  Plugin" out while "DOAJ Plugin" is off.

Small: one guard in one OJS class, tried, with no data or contract
change.

## Evidence

- Kept scripts:
  - [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/walk.js)
    takes the Steps and the control on a fresh load of the default
    dataset:
    `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js ojs shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/walk.js`.
  - [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/neighbour.js)
    switches "DOAJ Plugin" off and on through the screens and runs the
    two callers without a journal (`tools/importExport.php list`,
    `lib/pkp/tools/scheduler.php test --name='APP\plugins\generic\doaj\DOAJInfoSender'`).
  - The fix was tried with
    [trial.sh](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/doaj-tool-listed-when-doaj-plugin-off/trial.sh)
    (`node bin/try-fix.js apply fix.diff ojs`, the walk and the
    neighbour check, then the revert).
- Driven through the browser on PostgreSQL, on the default dataset from
  pkp/datasets 38ab955 (2026-09-30), `main` and `stable-3_5_0`. The fault
  involves no query, so it does not depend on the database.
- Tips:
  - `main`: OJS
    [bade233f73](https://github.com/pkp/ojs/commit/bade233f73f5a1ccfb7f29c48b8becdb278f1287)
    with pkp-lib
    [2e377d27fc](https://github.com/pkp/pkp-lib/commit/2e377d27fc38dc0706d0a60678cd690a295e7b12).
  - `stable-3_5_0`: OJS
    [92b9a16b48](https://github.com/pkp/ojs/commit/92b9a16b48df164b60c2311175b659dec5bddf17)
    with pkp-lib
    [a9c76aed62](https://github.com/pkp/pkp-lib/commit/a9c76aed625f8951bcf84911427195f0df0751a1).
  - `stable-3_4_0`: OJS
    [9571d8fde7](https://github.com/pkp/ojs/commit/9571d8fde7093214dd24929ea6e17546483cf833).
  - `stable-3_3_0`: OJS
    [9fdb9bcf9a](https://github.com/pkp/ojs/commit/9fdb9bcf9aa6b821ebc5226616fc083ad4738144).
- Code reads: on 3.5, 3.4 and 3.3 DOAJ is `plugins/importexport/doaj`
  only, with no `plugins/generic/doaj` and no
  `PubObjectsExportGenericPlugin`; the 3.5 walk found no "DOAJ Plugin"
  on the Plugins list.
- Introduced: `git blame` on `$this->setExportPlugin();` gives
  b10a6cb667, which added the class; the GitHub API lists `pkp/ojs#4985`
  for it and for 34a2dc86b9.
- Upstream (searched 2026-09-30 in pkp/pkp-lib, pkp/ojs and
  pkp/ui-library, by "DOAJ plugin disabled", "DOAJ export plugin list",
  "DOAJ generic plugin", and by `PubObjectsExportGenericPlugin` and
  `setExportPlugin`): nothing about the tool listed while the plugin is
  off. `pkp/pkp-lib#12939` (open) is about the tool's description on
  Tools, and `pkp/pkp-lib#13096` (closed) about the daily task.
- Upgrades: the migration `I11593_DOAJGenericPlugin` (code) switches
  "DOAJ Plugin" on in every existing journal, so an upgraded journal
  starts as the Steps' dataset does. Not walked.
- Not driven: MySQL.
