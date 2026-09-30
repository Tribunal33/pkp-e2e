# A manager cannot save "Appearance" › "Setup" after disabling the plugin of a block placed in the sidebar

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · 2018-10-23 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#11859` (open, no PR): the same fault, reported for a block plugin that was uninstalled rather than disabled
- **Tracked in** spec U09 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a15), spec U10 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a4)
- **Checked** 2026-09-30, each branch's tip (the commits in Evidence)

## Summary

A manager who disables a block's plugin while the block is placed in the
sidebar, then saves any change on Settings › Website › "Appearance" ›
"Setup" (the logo, the homepage image, the "Page Footer" or the sidebar),
is refused under "Sidebar" with "The {name} block can not be found.
Please make sure the plugin is installed and enabled.", although
"Sidebar" no longer shows that block. This holds for a custom block once
"Custom Block Manager" is disabled, and for a block plugin such as
"Language Toggle Block".

The save goes through only once the "Sidebar" list is changed, and that
save takes the disabled block out of the sidebar without a word: when
its plugin is enabled again, the block stays off the public pages until
the manager ticks it again under "Sidebar".

## Impact

- **Lost.** The manager's changes on the tab, until they change the
  sidebar; then the disabled block's entry in the sidebar, which they
  must notice and restore by hand after enabling its plugin again.
- **Who.** Journal, press and server managers who disable a block
  plugin, or "Custom Block Manager", while its block is placed.
- **Way round.** Tick or untick any block under "Sidebar" before "Save";
  this lasts, but drops the disabled block's entry. Or enable the plugin
  again, save, and disable it once more; this keeps the entry, but must
  be repeated for every later save while the plugin is off.

Medium: a settings page refuses every save in an ordinary but uncommon
state, and a way round exists on screen. It would be high if there were
no way round, or if the dropped entry could not be ticked again.

## Steps to reproduce

Preconditions:

- PKP's default test dataset, `main` (the same on `stable-3_5_0`). The
  steps are the same in OJS, OMP and OPS.
- The dataset has "Custom Block Manager" disabled, no custom block and
  no block placed in "Sidebar", so steps 3 to 5 add a custom block and
  place it. "Language Toggle Block" is enabled in the dataset and listed
  under "Sidebar", unticked.

A custom block:

1. Sign in as `rvaca` (the journal, press or server manager).
2. Open Settings › Website
   (`/index.php/publicknowledge/en/management/settings/website`), tab
   "Plugins".
3. Under "Installed Plugins", "Generic Plugins", tick "Custom Block
   Manager".
4. Press the arrow on its row, then "Manage Custom Blocks", then "Add
   Block". Type "Block Name" "Partners u09a15" and "Content" "Our
   partners.", press "Save" and close the window.
5. Open the tab "Appearance", then "Setup". Under "Sidebar", tick
   "partners-u09a15 (Custom Block)" and press "Save". The journal's home
   page now shows the block "Partners u09a15" in its sidebar.
6. Open the tab "Plugins" and untick "Custom Block Manager". A window
   "Disable" asks "Are you sure you want to disable this plugin?"; press
   "OK".
7. Reload the page and open "Appearance" › "Setup". "Sidebar" no longer
   lists "partners-u09a15 (Custom Block)".
8. In "Page Footer", type "Footer u09a15". Press "Save".

**Expected.** The footer is saved. The block keeps its place, so that
ticking "Custom Block Manager" again brings "Partners u09a15" back to
the sidebar.

**Observed.** The save is refused. Under "Sidebar", and at the foot of
the form:

```
The partners-u09a15 block can not be found. Please make sure the plugin is installed and enabled.

Please correct one error. Go to Sidebar: The partners-u09a15 block can not be found. Please make sure the plugin is installed and enabled. Jump to next error
```

The save request answers 400:

```
PUT /index.php/publicknowledge/api/v1/contexts/1   (sent as POST with X-Http-Method-Override: PUT)
400 {"sidebar":["The partners-u09a15 block can not be found. Please make sure the plugin is installed and enabled."]}
```

The footer was not stored: after a reload, "Page Footer" is empty.

The way round:

9. Reload the page and open "Appearance" › "Setup". Type "Footer u09a15"
   in "Page Footer" again, tick "Language Toggle Block" under "Sidebar"
   and press "Save". The save goes through.
10. On "Plugins", tick "Custom Block Manager" again, reload and open
    "Appearance" › "Setup". "partners-u09a15 (Custom Block)" is listed
    unticked, and the home page's sidebar shows only "Language Toggle
    Block": the block's place was dropped.

A block plugin (continuing; "Language Toggle Block" is placed since
step 9):

11. On "Plugins", under "Block Plugins", untick "Language Toggle Block"
    and confirm "OK".
12. Reload and open "Appearance" › "Setup". "Sidebar" no longer lists
    "Language Toggle Block".
13. Change "Page Footer" to "Footer u09a15 again" and press "Save".

**Expected.** The footer is saved.

**Observed.** Refused as in step 8, naming the plugin's internal name:
"The languagetoggleblockplugin block can not be found. Please make sure
the plugin is installed and enabled." (400). The footer stays "Footer
u09a15".

## Cause

`PKPAppearanceSetupForm` gives the "Sidebar" field the journal's stored
`sidebar` list as its value, while its options are only the enabled
block plugins (`PluginRegistry::loadCategory('blocks', true)`). A
disabled block's name therefore stays in the value without a box on
screen.

`FieldOptions.vue` (ui-library) keeps that name until the list changes.
For an orderable field (`isOrderable`, as "Sidebar" is), its
`selectedValue` watcher and `updateValueOrder()` then keep only the
listed options, which is where the name is dropped. So an unchanged list
is posted back with the disabled block's name in it, and a changed one
without it.

`PKPContextService::validate()` (lib/pkp
`classes/services/PKPContextService.php`, the closure after "If sidebar
blocks are passed", lines 371 to 382) refuses every name in `sidebar`
that is not an enabled block plugin, with
`manager.setup.layout.sidebar.invalidBlock`. It treats a block that is
already placed like one the manager has just ticked. Yet nothing removes
a disabled block from the stored list, and
`PKPTemplateManager::displaySidebar()` skips such a name on the public
pages and shows the block again once its plugin is enabled. So the
stored list, posted back unchanged, is refused.

The check and the form's value came together in
[5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3)
(`pkp/pkp-lib#3931`, "Add entity schema and Vue.js forms for context
and site"), which moved the placed blocks into the context's `sidebar`
setting.

Reach:

- A custom block when "Custom Block Manager" is disabled, and any block
  plugin disabled while placed (walked, three apps).
- A block plugin uninstalled while placed: the same stored name, the same
  refusal (`pkp/pkp-lib#11859`; code).
- The site's own "Sidebar" (Administration › "Site Settings" ›
  "Appearance" › "Setup"): `PKPSiteService::validate()` holds the same
  check and `PKPSiteAppearanceForm` the same value (code). The site's
  "Appearance" and "Plugins" tabs are both offered only when the site
  hosts no journal or more than one.
- Settings › Website › "Appearance" › "Theme" posts no `sidebar` and is
  not affected (code).

## Proposed fix

Recommended: in both services, accept a name that is already stored in
the list, and keep refusing a newly ticked block whose plugin is not
enabled
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/setup-save-refused-disabled-block/fix.diff)).
For a context, the stored list is read only on an edit, the way the
`urlPath` check a few lines above uses `$action` and `$props['id']`:

```diff
--- a/lib/pkp/classes/services/PKPContextService.php
+++ b/lib/pkp/classes/services/PKPContextService.php
-        $validator->after(function ($validator) use ($props) {
+        $validator->after(function ($validator) use ($action, $props) {
             if (!empty($props['sidebar']) && !$validator->errors()->get('sidebar')) {
                 $plugins = PluginRegistry::loadCategory('blocks', true);
+                $placedBlocks = [];
+                if ($action === EntityWriteInterface::VALIDATE_ACTION_EDIT && isset($props['id'])) {
+                    $placedBlocks = (array) $this->get((int) $props['id'])?->getData('sidebar');
+                }
                 foreach ($props['sidebar'] as $pluginName) {
-                    if (empty($plugins[$pluginName])) {
+                    if (empty($plugins[$pluginName]) && !in_array($pluginName, $placedBlocks, true)) {
```

`PKPSiteService::validate($props, $allowedLocales, $primaryLocale)` has
no action and no id, since the site always exists; it reads the stored
list directly:

```diff
--- a/lib/pkp/classes/services/PKPSiteService.php
+++ b/lib/pkp/classes/services/PKPSiteService.php
                 $plugins = PluginRegistry::loadCategory('blocks', true);
+                $placedBlocks = (array) Application::get()->getRequest()->getSite()->getData('sidebar');
                 foreach ($props['sidebar'] as $pluginName) {
-                    if (empty($plugins[$pluginName])) {
+                    if (empty($plugins[$pluginName]) && !in_array($pluginName, $placedBlocks, true)) {
```

This is the recommendation because the refusal is the server's rule,
shared by the context and the site and met by every API client, and this
change alone ends it.

Tried on `main` in all three apps: with it, steps 8 and 13 saved the
footer, and ticking "Custom Block Manager" again brought "Partners
u09a15" back, ticked under "Sidebar" and on the home page. A block
ticked under "Sidebar" in a page opened before its plugin was disabled
(in another tab) was still refused, with and without the fix, so a
newly placed disabled block stays refused.

Alternatives:

- Keep unlisted values in `FieldOptions.vue` for an orderable field.
  The filter runs only when `isOrderable` is set, which is the two
  "Sidebar" fields and the masthead's role order, whose value always
  equals its options; so in practice it reaches only the sidebars. It
  would end the silent drop in steps 9 and 10, a fair change on its
  own, but not the refusal, which comes from the server. It is worth
  doing as a companion in ui-library, not instead.
- Filter the form's value to the enabled blocks in
  `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm`: every save of
  the tab would then drop a disabled block's entry silently, which
  spreads the loss to every save.
- Validate against every installed block plugin, enabled or not: custom
  blocks are registered only while "Custom Block Manager" is enabled,
  and an uninstalled plugin is not installed, so both of those cases
  would still be refused.

What goes with it:

- No stored data needs repair: the lists already stored are what the fix
  accepts.
- Without the ui-library companion, a list changed on screen still drops
  a disabled block's entry (steps 9 and 10).
- Backport: the same closures exist on `stable-3_5_0` and
  `stable-3_4_0` (the diff applies to 3.5 as it stands). `stable-3_3_0`
  has them in `PKPContextService.inc.php` and `PKPSiteService.inc.php`,
  where the context's check needs the global `VALIDATE_ACTION_EDIT`
  constant instead of `EntityWriteInterface::VALIDATE_ACTION_EDIT`, and
  a plain null check instead of the nullsafe `?->` for PHP 7.
- A test: an e2e step that saves "Setup" with a changed "Page Footer"
  while a placed block's plugin is disabled.

Small: a few lines in two methods of one repo, and one test step.

## Evidence

- Kept script:
  [`shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js`](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js),
  run on an install loaded from PKP's default test dataset:
  `node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js`
  (`neighbour` as the argument takes the other-tab check). The fix was
  tried with `node bin/try-fix.js apply shared/playwright/checks/issues/setup-save-refused-disabled-block/fix.diff ojs omp ops`,
  then reverted with `node bin/try-fix.js revert ojs omp ops`.
- Walked on `main` and `stable-3_5_0`, OJS, OMP and OPS, on PostgreSQL,
  from pkp/datasets 38ab955 (2026-09-30), with Observed as written on
  each. MySQL not checked; nothing in the fault depends on the database.
- Tips: `main` OJS bade233f73, OMP 3b0ecf794, OPS c8af945bb7, pkp-lib
  2e377d27fc (OJS) and 3dc90c81a6 (OMP, OPS), ui-library 280f98c5;
  `stable-3_5_0` OJS 92b9a16b48, OMP 3081c9b00, OPS cf4fce69bd, pkp-lib
  a9c76aed62, ui-library 1a7a4750; `stable-3_4_0` OJS 9571d8fde7, OMP
  0aec65441, OPS acd8ae704b, pkp-lib df13621c2d, ui-library ee684b34;
  `stable-3_3_0` OJS 9fdb9bcf9a, OMP 8e72fc883, OPS c5532e2161, pkp-lib
  d446601ebe, ui-library 96959f9e. On 3.4 and 3.3 each app ships
  "Custom Block Manager" and "Language Toggle Block".
- Introduced: `git blame` on the closure lands on e3f570bc37 (PSR-12
  reformat, `pkp/pkp-lib#5678`); blame at its parent lands on 5f3be929e6,
  which added the closure and the form's value together.
- Upstream: `pkp/pkp-lib#11859` is the same fault, reached by
  uninstalling a block plugin (3.3 and 3.5), with the same way round; it
  is open with no PR, and a sub-issue of `pkp/pkp-lib#11863` (custom
  blocks and the sidebar). This report adds the disabled-plugin and
  custom-block cases, the steps on the default dataset, the cause and a
  tried fix. No fix or PR found in pkp/pkp-lib, pkp/ojs, pkp/omp,
  pkp/ops or pkp/ui-library (searched 2026-09-30).
- Restoring a dropped block (the Summary's "until the manager ticks it
  again") is read in the code, not walked: after step 10 the block's box
  is listed again, and ticking it is the same save as step 5, which the
  walk showed placing the block.
