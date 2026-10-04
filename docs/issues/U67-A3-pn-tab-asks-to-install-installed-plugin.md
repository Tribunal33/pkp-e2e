# Archiving settings tell managers to install the PKP|PN plugin when it is already installed

- **Severity** medium
- **Effort** small
- **Kind** regression
- **Affects**
  - main: OJS
  - 3.5: OJS
  - 3.4: OJS (code)
  - 3.3: OJS (code): the disabled plugin only; the 3.3 plugin's name matches
- **Introduced** `pkp/ojs#2548` for `pkp/pkp-lib#5329` · [5a8d1fc8f5](https://github.com/pkp/ojs/commit/5a8d1fc8f5db39a3be44b5e1edbd91a2b422736b) · 2019-12-11 · Nate Wright (NateWr); before it the box showed for any installed plugin. The enabled plugin's box came back before 3.2.0 shipped and was lost again with `pkp/pln#84` for `pkp/pln#57` · [12a26eb993](https://github.com/pkp/pln/commit/12a26eb993bf37c20e831e4a3af7b21ac47131b2) · merged 2024-04-07, first released in pln 3.0.0.0 · Jonas Raoni Soares da Silva (jonasraoni)
- **Upstream** `pkp/pln#116` (closed without a fix, in favour of `pkp/pln#117`, which did not change the plugin's name), covering the enabled plugin only
- **Tracked in** spec U67 [A3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U67-archiving-preservation.md#a3)
- **Checked** 2026-10-04, each branch's tip (the commits in Evidence)

## Summary

A site administrator installs the PKP|PN plugin, and the Journal Manager
opens Settings › Distribution › "Archiving" › "PKP Preservation Network
(PN)". The tab still says "To archive your journal in the PN, ask your
administrator to install the PKP|PN Plugin from the Plugin Gallery." It
shows no "Enable the PKP PN plugin" box, whether the plugin is enabled in
the journal or not.

So the tab never offers what it was built for: the switch for the plugin
and the link to accept the network's terms of use.

Both states fail with every release of the plugin that the Plugin
Gallery offers for OJS 3.4 and 3.5. With the 3.3 release, only the
disabled plugin reads as not installed.

## Impact

- **Lost**: no data; the manager may ask the administrator for an
  install that has already happened, or give up on the network.
- **Who**: a Journal Manager, or anyone else who opens the Settings pages,
  on a journal whose site has the PKP|PN plugin installed.
- **Way round**: Settings › Website › "Plugins" › "Installed Plugins":
  the plugin's "Enable" box, then its "Settings" link to accept the terms.
  The fix is in OJS alone; no new plugin release is needed.

Medium: the tab fails and gives wrong information, but the Plugins tab
does the same job. It would be high if the plugin could not be reached
from any other screen.

## Steps to reproduce

Preconditions:

- The default dataset, OJS `main`.
- The site administrator (`admin`) has installed "PKP|PN (PKP
  Preservation Network) Plugin" 4.0.1.0. On 3.5, an install that reaches
  the internet offers it under Settings › Website › "Plugins" › "Plugin
  Gallery". On `main`, which the gallery does not list this release for,
  use "Upload A New Plugin" with
  [pln-v4_0_1-0.tar.gz](https://github.com/pkp/pln/releases/download/v4_0_1-0/pln-v4_0_1-0.tar.gz).
  Neither route was walked: the walk installed the release's code with
  OJS's own `lib/pkp/tools/installPluginVersion.php` (Evidence). A newly
  installed plugin starts disabled in "Journal of Public Knowledge".

The plugin disabled:

1. Sign in as `rvaca` (Journal manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". "PKP|PN
   (PKP Preservation Network) Plugin" is listed under "Generic Plugins"
   with its "Enable" box unticked. [Not seen in the walk; steps 2 and 4
   are read from the code.]
3. Open Settings › Distribution › "Archiving" › "PKP Preservation Network
   (PN)".

The plugin enabled:

4. On Settings › Website › "Plugins", tick the plugin's "Enable" box.
5. Open Settings › Distribution › "Archiving" › "PKP Preservation Network
   (PN)" again.

**Expected**: at step 3, "The PKP Preservation Network (PN) provides free
preservation services for any OJS journal that meets a few basic
criteria." followed by an unticked box, "Enable the PKP PN plugin". At
step 5, the same text, then "View the plugin settings to accept the terms
of use for the PKP PN.", then the box, ticked.

**Observed**: at steps 3 and 5, the tab shows only its heading and this
text, with no box, button or link:

```
The PKP Preservation Network (PN) provides free preservation services for any OJS journal that meets a few basic criteria. To archive your journal in the PN, ask your administrator to install the PKP|PN Plugin from the Plugin Gallery.
```

On an install without the plugin, the tab shows the same text, which is
correct there.

## Cause

`APP\pages\management\SettingsHandler::distribution()`
(`pages/management/SettingsHandler.php`, line 142) chooses between the box
(`FieldArchivingPn`) and the "ask your administrator to install" text
(`FieldHTML`) with `PluginRegistry::getPlugin('generic', 'plnplugin')`.
The registry only finds a plugin that has been loaded in this request
*and* is registered under exactly that name. The question the tab needs
answered is whether the plugin is installed. Elsewhere the code answers
that with the plugin's `versions` row (`PluginGridHandler`,
`Plugin::getCurrentVersion()`), not with a registry entry.

The disabled plugin is not loaded. `Dispatcher::dispatch()` loads generic
plugins with `PluginRegistry::loadCategory('generic', true)`, and
`VersionDAO::getCurrentProducts()` returns a lazy-load plugin only while
its `enabled` setting is 1 for the context. So a disabled PN plugin is
never registered, and the lookup returns null.

The enabled plugin is registered under another name.
`PluginRegistry::register()` keys each plugin by its `getName()`, and
`getPlugin()` looks that key up exactly as given, so case matters. The
name `plnplugin` comes from `LazyLoadPlugin::getName()`, which lowercases
the class name. That is how the 3.3 plugin, `PLNPlugin` 2.0.4.x, is
named. Since the port to 3.4 (pkp/pln 12a26eb993, first released as
3.0.0.0), `PlnPlugin::getName()` returns the class name as written, so
the plugin is registered as `PlnPlugin` and the lookup returns null in
this case too.

Two more lines in the same branch depend on that lookup:

- The box's value is `(bool) $plnPlugin`, which is always true whenever
  the branch runs, so the box could never show a disabled plugin.
- The enable, disable and settings addresses carry
  `plugin => 'plnplugin'`. `PluginRequiredPolicy` compares that with
  `getName() == $pluginName`, so with releases 3.0.0.0 and later it
  would refuse them.

This worked once. The 2018 version of this code (43b3907299) checked the
install with `VersionDAO::getCurrentVersion('plugins.generic', 'pln',
true)`, so it showed the box for any installed plugin, ticked when the
plugin was enabled. 5a8d1fc8f5 (`pkp/ojs#2548`, a fix for a fatal error
on the tab) replaced that check with `getPlugin('plugins.generic',
'pln')`, which matched no plugin in either state. ffed306788
(`pkp/pkp-lib#4842`, 2020-01-23, also before 3.2.0 shipped) corrected it
to today's `'generic', 'plnplugin'`, which brought back the enabled
plugin's box only. From 3.2.0 on, the disabled plugin read as not
installed, and with pln 3.0.0.0 the enabled one did too.

Reach:

- Only this tab. Every other hard-coded `PluginRegistry::getPlugin()`
  lookup in OJS and lib/pkp on `main` wants its plugin only while it is
  enabled, and uses the name that plugin gives itself: `OrcidWork`, the
  bundled DOAJ, Crossref, JATS template and `pflPlugin` plugins, and
  `PKPStatsPublicationService` (checked in the code).
- OMP and OPS have no PN tab (checked in the code).
- No stored data is wrong. `PluginSettingsDAO` lowercases plugin names,
  so the plugin's settings sit under `plnplugin` whatever `getName()`
  returns. Once enabled, the plugin loads and registers (checked in the
  code and in the walk's registry read).

## Proposed fix

Find the plugin through its install record, create it without
registering it, and take the box's state and the plugin's name from the
plugin itself. This is one method in OJS, plus its import
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/fix.diff)):

```diff
+use PKP\db\DAORegistry;
 …
-        $plnPlugin = PluginRegistry::getPlugin('generic', 'plnplugin');
+        $versionDao = DAORegistry::getDAO('VersionDAO'); /** @var \PKP\site\VersionDAO $versionDao */
+        $plnVersion = $versionDao->getCurrentVersion('plugins.generic', 'pln');
+        $plnClass = $plnVersion ? '\\APP\\plugins\\generic\\pln\\' . $plnVersion->getProductClassName() : null;
+        $plnPlugin = $plnClass && class_exists($plnClass) ? new $plnClass() : null;
 …
         if ($plnPlugin) {
-            $plnPlugin = PluginRegistry::getPlugin('generic', 'plnplugin');
-            … ['plugin' => 'plnplugin', 'category' => 'generic']);   (×3)
+            $plnPluginName = $plnPlugin->getName();
+            … ['plugin' => $plnPluginName, 'category' => 'generic']); (×3)
 …
-                'value' => (bool) $plnPlugin,
+                'value' => (bool) $plnPlugin->getEnabled(),
```

The `versions` row is how the installer, the Plugins grid and
`Plugin::getCurrentVersion()` decide that a plugin is installed. The
class name comes from that row, as `installPluginVersion.php` builds it. The plugin's own `getName()` and
`getEnabled()` then match whatever the plugin calls itself. The fix keeps
the intent of 5a8d1fc8f5, whose fatal-error fix was the field's
namespace (`\APP\components\forms\FieldArchivingPn`), which stays.

The plugin is created, not registered, on purpose. Registering a disabled
PN plugin (`PluginRegistry::loadPlugin()`) adds no PN hooks, because
`PlnPlugin::register()` returns early while disabled. But it would leave
the plugin in the registry for the rest of the request. When the web
task runner is due at the end of that request, it calls
`registerSchedules()` on every registered plugin, so the disabled
plugin's deposit task would be scheduled.
`class_exists()` also makes a `versions` row left behind by a deleted
folder show the "install" text, not an error.

Tried on `main` with release 4.0.1.0 installed: steps 3 and 5 matched
Expected, and with no plugin installed the tab read the same with the fix
in and out.

**Alternatives:**

- Have the plugin return `plnplugin` from `getName()`, as `pkp/pln#116`
  proposed. This fixes only the enabled plugin, since a disabled one
  still reads as not installed. It is also a fix in a separately
  released plugin, and it keeps OJS tied to a name the plugin chooses.
- `PluginRegistry::loadPlugin('generic', 'pln')` behind the same
  `versions` check: this also shows the box (tried first, with the same
  result), but it registers the disabled plugin for the scheduler, as
  above.
- Load the whole generic category from disk
  (`PluginRegistry::loadCategory('generic')`) and pick the plugin from
  it, as `PluginRequiredPolicy` does. That creates every generic plugin
  on each visit to the Distribution page, for a single lookup.
- Restore only the 2018 `versions` check. The box would show, but its
  value and its addresses would still come from the registry and the
  fixed name. With releases 3.0.0.0 and later the box would read
  unticked while the plugin is enabled, and its requests would be
  refused.

**What goes with it:**

- No data repair.
- The fix applies to `stable-3_5_0` and `stable-3_4_0`, with the
  `use` line placed by hand, because the imports there differ.
  `stable-3_3_0` has the same lines in `SettingsHandler.inc.php`; its
  plugin is not namespaced, so a backport there creates it through the
  plugin's `index.php`.
- The guard is an e2e check that the tab offers the box for an installed
  plugin, in both states. It needs a PN plugin on the test install, which
  the test installs do not have today.

This is a proposal; the team decides.

Small: four edits in one OJS file (the import, the lookup, the three
addresses' plugin name, the box's value), each following a pattern the
code already uses, and tried.

## Evidence

- Kept script: [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/walk.js)
  with its [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/lib.js)
  and [rig/](https://github.com/jardakotesovec/pkp-e2e/tree/main/shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/rig),
  run on an install freshly loaded from the default dataset:
  `node bin/probe.js ojs shared/playwright/checks/issues/pn-tab-asks-to-install-installed-plugin/walk.js`.
  `WALK_MODE=nb` runs the neighbour check (no plugin).
- How the walk differs from the Steps. The plugin's code (pkp/pln tag
  `v4_0_1-0`, 82e7b9c) is kept outside the app folder, and the server
  loads it through an autoloader prepended with `PHP_INI_SCAN_DIR`
  (`rig/prepend.php`). The install is the installer's own
  `lib/pkp/tools/installPluginVersion.php`, which writes the `versions`
  row and runs the install migration. Steps 2 and 4 were not taken on
  screen, because the Plugins grid lists only folders under
  `plugins/generic`. Instead, `rig/state.php` writes what
  `LazyLoadPlugin::setEnabled()` writes for the journal
  (`PluginSettingsDAO::updateSetting(1, 'PlnPlugin', 'enabled', true,
  'bool')`).
- The registry read after each state (`rig/state.php`, same config):
  - Installed: version 4.0.1.0.
  - Disabled: not loaded at dispatch, nothing registered.
  - Enabled: loaded and registered as `PlnPlugin`;
    `getPlugin('generic', 'plnplugin')` returned null.
- Upload on `main`: read in the code, not walked.
  `PluginHelper::installPlugin()` has no check on the release's
  compatibility.
- Walked on `main` and `stable-3_5_0`, on PostgreSQL with the default
  dataset from pkp/datasets 1a5552c (2026-10-04). The 3.5 walk showed the
  same text at steps 3 and 5. No request failed and no page script failed
  on either line.
- Fix trial: `fix.diff` applied to `main` with `bin/try-fix.js`, then
  the walk and the neighbour check; a first version using `loadPlugin()`
  gave the same screens. Pressing the box with the fix in was
  not tried: its request goes through `PluginRequiredPolicy`, which loads
  plugins from `plugins/generic` on disk, where this walk's plugin is
  not. Unverified: that the box's enable, disable and settings requests
  succeed with the plugin's own name. By the code, the policy matches
  `PlnPlugin`.
- Tips: OJS `main` ff004d0973 (lib/pkp 987776cd04, ui-library 64d67363),
  `stable-3_5_0` c1cee76b95 (lib/pkp 771474347e), `stable-3_4_0`
  d68934d0d1 (lib/pkp 767353f4fe), `stable-3_3_0` ac77c9fb35 (lib/pkp
  ac3fa73402). pkp/pln `main` 82e7b9c.
- Code reads:
  - `SettingsHandler::distribution()` on all four lines: each has the
    same lookup, value and addresses.
  - In lib/pkp on each line: `PluginRegistry::getPlugin()`, `register()`
    and `loadCategory()`; `Dispatcher::dispatch()`;
    `VersionDAO::getCurrentProducts()` (3.3: the same `lazy_load` and
    `enabled` join); `PluginRequiredPolicy::effect()`;
    `LazyLoadPlugin::getName()`.
  - `PlnPlugin::getName()` in pkp/pln at tags `v3_0_0-0`, `v3_0_0-1`,
    `v4_0_0-0` and `v4_0_1-0` (the class name). On `stable-3_3_0`,
    `PLNPlugin.inc.php` has no override.
  - The Plugin Gallery's `plugins.xml` (pkp/plugin-gallery `main`, and
    `https://pkp.sfu.ca/ojs/xml/plugins.xml`, which 3.5's
    `PluginGalleryDAO` reads) lists `pln` 2.0.4.x for 3.3, 3.0.0.x for
    3.4 and 4.0.x for 3.5 (`~3.5.0.0`, which 3.5.0.5 matches by
    `Version::isCompatible()`).
  - The scheduler: `ScheduleServiceProvider::runWebBasedScheduleTaskRunnerOnShutdown()`
    calls `PKPScheduler::registerPluginSchedules()`, whose
    `loadAllPlugins(true)` returns every registered plugin of each
    category; `PlnPlugin::register()` and `registerSchedules()` at
    `v4_0_1-0`.
- The trace:
  - 5a8d1fc8f5 was merged through `pkp/ojs#2548` on 2019-12-12; the
    first tag that holds it is `3_2_0-0`.
  - 12a26eb993 was merged through `pkp/pln#84` on 2024-04-07 and first
    released in pln 3.0.0.0 (2024-04-09).
  - ffed306788 is in the first 3.2.0 tag, `3_2_0-0`, as 5a8d1fc8f5 is.
  - `pkp/pln#116` named the enabled-state symptom; it was closed on
    2026-03-23.
- Upstream searched on 2026-10-04 in pkp/pkp-lib, pkp/ojs,
  pkp/ui-library and pkp/pln.
