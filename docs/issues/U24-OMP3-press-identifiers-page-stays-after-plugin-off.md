# On a press, disabling the URN plugin leaves URNs on public book pages and an empty "Identifiers" workflow page

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OMP
  - 3.5: OMP
  - 3.4: OMP (code)
  - 3.3: OMP (code)
- **Introduced** `pkp/omp#306` for `pkp/pkp-lib#1527` · [825986f471](https://github.com/pkp/omp/commit/825986f471eeb933c5dd3a3dfec0f773efcdecd9) · 2016-07-12 · Bozana Bokan (bozana)
- **Upstream** none found (2026-10-02)
- **Tracked in** spec U24 [OMP3](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U24-workflow-screen-and-stage-access.md#omp3)
- **Checked** 2026-10-02, each branch's tip (the commits in Evidence)

## Summary

On a press, disabling the URN plugin does not fully turn it off. A
book's workflow keeps listing the "Identifiers" page, which now opens
with nothing under its heading, and the public book page keeps showing
the URN of every publication format that was given one. On a journal,
disabling the plugin removes the "Identifiers" page.

Readers go on seeing identifiers the press has switched off, and nothing
tells the press. In the workflow no work is lost: the empty page offers
nothing to fill in.

It takes a press that used the URN plugin and then disabled it. The
workflow page stays when "Monographs" was ticked in the plugin's
settings; a URN stays on the book page when a publication format had
one stored.

## Impact

- **Lost**: the press's decision to stop showing URNs is not carried
  out on its public book pages, silently. In the workflow, editors get a
  menu entry that leads to an empty page.
- **Who**: readers of a press that stored URNs on publication formats
  and later disabled the plugin; that press's editors and managers on
  every book's workflow, when "Monographs" was ticked.
- **Way round**: none found for the book page; the plugin's "Enabled"
  box is the control for it and it has no effect there. The workflow
  entry blocks nothing.

Medium: a public page shows an identifier the press turned off, with no
message, but only in a rarely met state (a press that disables the
plugin after using it), and the URN shown is the one the press stored,
not a wrong one. An install where disabling is how presses withdraw
unregistered URNs would raise it.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for OMP `main`. Nothing else.

In the workflow:

1. Sign in as `dbarnes`.
2. Open Settings > Website > "Plugins". On the "URN" row, under "Public
   Identifier Plugins", tick "Enabled".
3. Open the row's "Settings". Tick "Monographs" under "Press Content",
   set "URN Prefix" to `urn:nbn:de:0000-`, "Namespace" to `urn:nbn:de`
   and "Resolver URL" to `https://nbn-resolving.de/`. Under "URN Suffix"
   choose "Enter an individual URN suffix for each published item.
   You'll find an additional URN input field on each item's metadata
   page." (the choice only decides what step 4's page holds; the fault
   does not depend on it). Click "Save".
4. Open book 4, "How Canadians Communicate: Contexts of Canadian Popular
   Culture"
   (`/index.php/publicknowledge/en/dashboard/editorial?workflowSubmissionId=4`).
   Under "Publication", the version lists "Identifiers" between
   "Funding" and "Catalog Entry" [3.5: between "References" and
   "Catalog Entry"]; it opens with a "URN" box.
5. Go back to Settings > Website > "Plugins", untick "Enabled" on the
   "URN" row and answer "OK" to "Are you sure you want to disable this
   plugin?". The notice reads "The plugin "URN" has been disabled."
6. Open book 4 again and read the pages listed under "Publication".
   Click "Identifiers".

**Expected**: "Identifiers" is no longer listed, as before step 2.

**Observed**: "Identifiers" is still listed. Clicking it opens
"Publication: Identifiers"; under the heading and the version's status
line the page is empty, with no "URN" box and no "Save". No request
fails.

On a journal the same steps (with "Articles" under "Journal Content",
on submission 5) end with "Identifiers" gone from the menu.

On the public book page (from a freshly loaded dataset):

1. Sign in as `dbarnes` and tick "Enabled" on the "URN" row, as above.
2. In the row's "Settings", tick "Publication Formats", set the prefix,
   namespace and resolver as above, leave "Use default patterns."
   selected, and click "Save".
3. Open book 14, "From Bricks to Brains: The Embodied Cognitive Science
   of LEGO Robots", Publication > "Publication Formats". On the "PDF"
   row, press the arrow, then "Edit".
4. On the "Identifiers" tab tick "Assign the URN to this publication
   format" and click "Save".
5. Sign out and open `/index.php/publicknowledge/catalog/book/14`. The
   format's details show `urn:nbn:de:0000-jpk.14.3`.
6. Sign in as `dbarnes`, disable the "URN" plugin as in step 5 above,
   sign out and open the book page again.

**Expected**: the book page no longer shows the URN.

**Observed**: the format's details still show
`urn:nbn:de:0000-jpk.14.3`, exactly as in step 5.

## Cause

OMP ships the URN plugin with a descriptor that says the plugin is
always loaded. `plugins/pubIds/urn/version.xml` in pkp/omp holds
`<lazy-load>0</lazy-load>`; OJS's copy of the same plugin holds
`<lazy-load>1</lazy-load>`. The installer copies that flag into the
`versions` table, and `VersionDAO::getCurrentProducts()` lists a product
as enabled when its "Enabled" setting is 1 **or** its `lazy_load` is not
1. So on a press `PluginRegistry::loadCategory('pubIds', true)`, the
"enabled only" load, registers and returns the URN plugin whether its
"Enabled" box is ticked or not.

In the workflow, that load is the one `Dispatcher::dispatch()` makes on
every request (`lib/pkp/classes/core/Dispatcher.php`, line 148).
`PKPDashboardHandler::index()` then reads the registered plugins with
`PluginRegistry::getPlugins('pubIds')` and sets
`publicationSettings.identifiersEnabled` when one of them answers true
to `isObjectTypeEnabled('Publication', …)`. The URN plugin answers from
its `enablePublicationURN` setting, which the settings form wrote and
which disabling does not clear. The flag stays true and
`useWorkflowNavigationConfigOMP.js` lists the page. The form the page
fetches is empty because the plugin adds its "URN" field in a hook it
registers only while `getEnabled()` is true.

On the book page, `CatalogBookHandler` passes the result of
`loadCategory('pubIds', true)` to `monograph_full.tpl`, which prints
each publication format's stored identifier for every plugin in that
list (lines 579 to 591).

A second detail matters for the fix. `getCurrentProducts()` finds the
"Enabled" setting by joining `plugin_settings.plugin_name` to the
lower-cased `versions.product_class_name`. The plugin's settings are
stored under `urnpubidplugin`, but since
[453ec3fb5](https://github.com/pkp/omp/commit/453ec3fb5)
(`pkp/pkp-lib#6091`, 2022-08-16) the descriptor's `<class>` is
`\APP\plugins\pubIds\urn\URNPubIdPlugin`, which that join never matches.
So on a press even an enabled URN plugin is loaded only because
`lazy_load` is 0.

Reach:

- The workflow's "Identifiers" page: seen in the browser on `main` and
  3.5 (Steps, first group).
- The public book page: seen in the browser on `main` (Steps, second
  group); 3.5 by the same handler and template in the code.
- `PKPSubmissionController::getPublicationIdentifierForm()` has the
  dashboard handler's loop, so it answers the empty form instead of its
  403 "no enabled identifiers" (in the browser, the page's requests all
  succeed).
- Every other `loadCategory('pubIds', true)` on a press also gets the
  disabled plugin: the native XML export filters, the DC metadata
  adapter, the ORCID work builder and `PKPPubIdPluginHelper` among them
  (read in the code only).
- A press that never enabled the plugin loads it too, on every request,
  but has none of its settings and no stored URN, so nothing shows (seen
  in the browser).
- 3.4 and 3.3 compute the same flag in `PKPWorkflowHandler::index()` and
  show the "Identifiers" tab on it in `templates/workflow/workflow.tpl`;
  the descriptor and the `lazy_load <> 1` condition are the same (read
  in the code only).
- OJS and OPS are not touched: OJS's URN descriptor is lazy-loaded with
  the class `URNPubIdPlugin`, and OPS ships no URN plugin.

## Proposed fix

Make OMP's descriptor say what OJS's says. The rule that a plugin with
an "Enabled" box loads only when enabled lives in the descriptor's
`lazy-load` flag, so the fix goes there and covers every reader of the
`pubIds` category at once
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/fix.diff)):

```diff
--- a/plugins/pubIds/urn/version.xml
+++ b/plugins/pubIds/urn/version.xml
@@ -15,6 +15,6 @@
 	<type>plugins.pubIds</type>
 	<release>1.0.0.0</release>
 	<date>2016-07-12</date>
-	<lazy-load>0</lazy-load>
-	<class>\APP\plugins\pubIds\urn\URNPubIdPlugin</class>
+	<lazy-load>1</lazy-load>
+	<class>URNPubIdPlugin</class>
 </version>
```

Both lines are needed. With `lazy-load` 1 alone, the namespaced class
name would never match the stored "Enabled" setting and the plugin could
not be enabled at all. The bare class name is what OJS's URN descriptor
and OMP's fifteen lazy-loaded generic and block plugins use.
`PluginRegistry::instantiatePlugin()` accepts it: the plugin object
comes from the plugin's `index.php`, and a bare class name is completed
with that object's namespace before the type check (lines 238 to 240).

Existing installs need no migration: every upgrade ends with
`Installer::addPluginVersions()`, which rewrites the `versions` row from
the descriptor (`VersionDAO::insertVersion()` updates `lazy_load` and
`product_class_name` when the version number is unchanged).

Tried on `main` (OMP), with the `versions` row rewritten by
`lib/pkp/tools/installPluginVersion.php`, which makes the same
`insertVersion()` call. With the fix in, both groups of steps end as
Expected: "Identifiers" is gone from the workflow and the URN is gone
from the book page once the plugin is disabled. The cases that must not
change were walked with the fix in and out and gave the same result
both ways: no "Identifiers" page before the plugin is enabled, the page
with its "URN" box once it is enabled and set up, and again after a
disable and a second enable; and the URN on the book page while the
plugin is enabled.

**Alternatives**

- Have `PKPDashboardHandler::index()` and
  `getPublicationIdentifierForm()` also ask `$pubIdPlugin->getEnabled()`.
  It turns the workflow symptom off at two readers and leaves the
  disabled plugin loaded for the book page and every other one; a
  workaround.
- Clear the plugin's object settings when it is disabled. It loses the
  press's settings for a later re-enable, which OJS keeps, and does not
  touch the book page.

**What goes with it**

- Release note: after the upgrade, a press whose URN plugin is disabled
  stops showing stored URNs on its book pages. The URNs stay stored and
  show again when the plugin is enabled.
- Backport: the same two lines apply on 3.5 and 3.4. On 3.3 the class is
  already `URNPubIdPlugin`, so only the `lazy-load` line changes.
- Left out: three descriptors of plugins with an "Enabled" box have no
  `lazy-load` element at all, which `VersionCheck::parseVersionXML()`
  reads as 0 (OJS `generic/datacite` and `generic/crossref`, OPS
  `generic/crossref`). What a disabled one of those still does was not
  examined.
- Precedent: `pkp/pkp-lib#5617` fixed the same wrong flag on theme
  plugins.
- Guard: an e2e scenario on a press that enables the URN plugin,
  disables it and reads the version's pages and the book page.

Small: two lines in one descriptor, picked up by the upgrade, and one
scenario.

## Evidence

- Kept script:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/walk.js)
  with its
  [lib.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/lib.js),
  run with `PROBE_FEATURE=<feature> PROBE_AGENT=<agent> node bin/probe.js all
  shared/playwright/checks/issues/press-identifiers-page-stays-after-plugin-off/walk.js`
  on an install reset to the default dataset (its header gives the reset
  and the 3.5 commands). It takes the first group of Steps on OMP and
  the journal control on OJS (submission 5); OPS is skipped.
  `WALK=book` in front takes the second group (OMP only).
  `WALK=neighbour` reads book 4 before the plugin is enabled, after
  steps 2 and 3, and after a disable and a second enable.
- The fix was tried with `node bin/try-fix.js apply …/fix.diff omp`,
  then, on the freshly loaded dataset, `php
  lib/pkp/tools/installPluginVersion.php plugins/pubIds/urn/version.xml`
  under the install's config (the `versions` row read `1|URNPubIdPlugin`
  after it, `0|\APP\plugins\pubIds\urn\URNPubIdPlugin` before); the
  steps, `WALK=book` and `WALK=neighbour` were walked with the fix in,
  the neighbour again with it out, then the fix was reverted. A full
  `tools/upgrade.php upgrade` was not run; that it rewrites the row is
  read from `dbscripts/xml/upgrade.xml` (`addPluginVersions`, its last
  step) and `VersionDAO::insertVersion()`.
- Walked on PostgreSQL, the default dataset from pkp/datasets e8dafbc
  (2026-10-02): the first group on `main` and `stable-3_5_0`, OMP and
  OJS; the second group on OMP `main` only. After the disable both apps
  stored `enabled = 0` and `enablePublicationURN = 1` for
  `urnpubidplugin`; OJS's `versions` row reads `1|URNPubIdPlugin`. The
  fault does not depend on the database.
- On the book page the URN's row is labelled `other::urn`; that label is
  another report's subject (spec U44 OMP2), whose walk also saw the row
  stay with the plugin off.
- Tips: OMP `main` 3b0ecf794c (lib/pkp 3dc90c81a6, lib/ui-library
  280f98c5), OJS `main` b84f8e2e44 (lib/pkp ddd8ab243a); OMP
  `stable-3_5_0` 9c5e24246c (lib/pkp cf3f984335), OJS `stable-3_5_0`
  091fb65453; OMP `stable-3_4_0` 0aec65441 (lib/pkp 6f96165c90); OMP
  `stable-3_3_0` 8e72fc883 (lib/pkp 4156e50233).
- Code reads on `main`: OMP and OJS `plugins/pubIds/urn/version.xml` and
  `URNPubIdPlugin::isObjectTypeEnabled()` and `register()`;
  `VersionDAO::getCurrentProducts()` and `insertVersion()`;
  `VersionCheck::parseVersionXML()` (a missing `lazy-load` becomes 0,
  line 94) and the three descriptors named under "Left out";
  `PKPApplication::getEnabledProducts()`; `Dispatcher::dispatch()`;
  `PluginRegistry::loadCategory()`, `loadFromDatabase()` and
  `instantiatePlugin()`; `PKPDashboardHandler::index()`;
  `PKPSubmissionController::getPublicationIdentifierForm()`;
  `useWorkflowNavigationConfigOMP.js`; `CatalogBookHandler` and
  `templates/frontend/objects/monograph_full.tpl`;
  `Installer::addPluginVersions()`.
- Code reads on the other lines: 3.5 in its own checkout, the same
  descriptor, `getCurrentProducts()` and `PKPDashboardHandler::index()`.
  3.4 and 3.3 with `git show`: in pkp/omp, `stable-3_4_0` and
  `stable-3_3_0`, `plugins/pubIds/urn/version.xml` (`lazy-load` 0; the
  class namespaced on 3.4, bare on 3.3) and
  `templates/workflow/workflow.tpl` (`{if $identifiersEnabled}`); in
  pkp/pkp-lib, `git show origin/stable-3_4_0:classes/site/VersionDAO.php`
  and `origin/stable-3_3_0:classes/site/VersionDAO.inc.php`
  (`getCurrentProducts()`: `ps.setting_value = '1' OR v.lazy_load <> 1`)
  and `origin/stable-3_4_0:pages/workflow/PKPWorkflowHandler.php` and
  `origin/stable-3_3_0:pages/workflow/PKPWorkflowHandler.inc.php` (the
  `$identifiersEnabled` loop over `PluginRegistry::getPlugins('pubIds')`).
- Introduced: `git log --follow` on OMP's descriptor; the file was
  created with `<lazy-load>0</lazy-load>` in 825986f471 and only its
  copyright lines and, in 453ec3fb5, its `<class>` changed since. The
  kind is defect, not regression: disabling has never unloaded the
  plugin on a press.
- Upstream search (2026-10-02), pkp/pkp-lib, pkp/omp and pkp/ui-library:
  "Identifiers URN plugin disabled", "URN lazy-load",
  "identifiersEnabled", "pubIds plugin disabled still", "identifiers tab
  empty disabled plugin", "getCurrentProducts lazy_load", "lazy-load".
  `pkp/pkp-lib#10821` (the redesigned Identifiers page) and
  `pkp/omp#790` (the theme fix) were read; neither is this fault.
- Not driven: the book page on 3.5; 3.4 and 3.3; the exports and other
  readers of the `pubIds` list; the three descriptors with no
  `lazy-load` element.
- Unverified: whether a press can clear the workflow entry by enabling
  the plugin, unticking "Monographs" and disabling it again; whether
  `lazy-load` 0 was a choice in 2016 (no comment in the commit or the PR
  says so, and OJS's copy of the plugin, two months older, has 1).
