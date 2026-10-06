# A manager cannot save "Appearance" › "Setup" while a sidebar block's plugin is turned off

- **Severity** medium
- **Effort** small
- **Kind** defect
- **Affects**
  - main: OJS, OMP, OPS
  - 3.5: OJS, OMP, OPS
  - 3.4: OJS, OMP, OPS (code)
  - 3.3: OJS, OMP, OPS (code)
- **Introduced** `pkp/pkp-lib#3931` for `pkp/pkp-lib#3594` · [5f3be929e6](https://github.com/pkp/pkp-lib/commit/5f3be929e69f428774dfd0237f666c356859e2b3) · committed 2018-10-23, merged 2019-01-09 · Nate Wright (NateWr)
- **Upstream** `pkp/pkp-lib#11859` (open), covering a block plugin that was uninstalled rather than turned off; it is a sub-issue of `pkp/pkp-lib#11863`
- **Tracked in** spec U09 [A15](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U09-custom-pages-and-blocks.md#a15) · spec U10 [A4](https://github.com/jardakotesovec/pkp-e2e/blob/main/docs/specs/U10-appearance-and-theming.md#a4)
- **Checked** 2026-10-01, each branch's tip (the commits in Evidence)
- **Model** claude-opus-5-5

## Summary

A manager turns off the plugin of a block that is placed in the
sidebar: "Custom Block Manager" for a custom block, or a block plugin
such as "Language Toggle Block". From then on, every save on Settings ›
Website › "Appearance" › "Setup" (a new "Page Footer", say) is refused
under "Sidebar" with "The {name} block can not be found. Please make
sure the plugin is installed and enabled.", although "Sidebar" no
longer lists that block. Nothing on the tab is saved.

The save goes through once the "Sidebar" list is changed: a box ticked
or unticked, or a block moved. That save also takes the turned-off
block out of the stored sidebar, without a word. When its plugin is
turned on again, the block comes back unticked and stays out of the
sidebar until the manager ticks it again.

## Impact

- **Lost**: no saved work, but no change on the tab can be saved, and
  the message names a block the list does not show. The way round
  also removes the turned-off block's place, and nothing tells the
  manager to tick it again later. The proposed fix keeps that last
  loss (see Proposed fix).
- **Who**: whoever manages the journal's (press's, server's) settings,
  once a block placed in the sidebar has its plugin turned off. A new
  journal places no block; the manager places them on this tab.
  `pkp/pkp-lib#11859` is the same fault with the same fix, reported for
  an uninstalled block plugin. This report adds the turned-off case,
  custom blocks, and a tried fix: one filter in each of two pkp-lib
  form classes.
- **Way round**: change the "Sidebar" list together with the change
  being saved. Ticking and unticking any listed block, or pressing any
  block's arrow, is enough. That needs at least one block in the list;
  a journal (press, server) has several block plugins on by default.
  With every block plugin off, the list is empty, and the only way
  round is to turn the plugin back on.

Medium, because changing the list gets round the refusal. It would be
higher if that way round were often missing, which happens only with
every block plugin off.

## Steps to reproduce

Preconditions:

- PKP's default test dataset for `main`. It places no block under
  "Sidebar"; "Language Toggle Block" is on and "Custom Block Manager"
  is off.

A custom block:

1. Sign in as `dbarnes` (password `dbarnesdbarnes`), the journal editor
   (press editor, preprint server manager).
2. Open Settings › Website › "Plugins" › "Installed Plugins". Under
   "Generic Plugins", tick "Custom Block Manager".
3. Press the row's arrow, then "Manage Custom Blocks", then "Add
   Block". Type "u09ir5 Our Partners" in the English "Block Name" box
   and "Partner list" in the English "Content" box, and press "Save".
   Close the window.
4. Open "Appearance" › "Setup". Under "Sidebar", tick
   "u09ir5-our-partners (Custom Block)" and press "Save".
5. Open "Plugins" › "Installed Plugins" and untick "Custom Block
   Manager". The window "Disable" asks "Are you sure you want to
   disable this plugin?"; press "OK".
6. Reload the page and open "Appearance" › "Setup". "Sidebar" no
   longer lists the block.
7. Type "u09ir5 footer" in the English "Page Footer" box and press
   "Save".

A block plugin, on the same journal:

8. Reload the page and open "Appearance" › "Setup". Under "Sidebar",
   tick "Language Toggle Block" and press "Save".
9. Open "Plugins" › "Installed Plugins", untick "Language Toggle
   Block" and press "OK".
10. Reload the page, open "Appearance" › "Setup", type "again" in the
    English "Page Footer" box and press "Save".

Turning the plugin back on:

11. Open "Plugins" › "Installed Plugins" and tick "Custom Block
    Manager". Reload the page and open "Appearance" › "Setup".

**Expected**: steps 7 and 10 show "Saved" and keep the footer. At step
11, "u09ir5-our-partners (Custom Block)" is listed again, unticked. A
save made while the block's plugin is off does not keep the block's
place, so the manager ticks it again (see Proposed fix).

**Observed**: step 7 is refused. Under "Sidebar", and at the form's
foot:

```
The u09ir5-our-partners block can not be found. Please make sure the plugin is installed and enabled.
Please correct one error.
Go to Sidebar: The u09ir5-our-partners block can not be found. Please make sure the plugin is installed and enabled.
```

The save (`PUT /api/v1/contexts/1`) answers 400 with
`{"sidebar":["The u09ir5-our-partners block can not be found. Please make sure the plugin is installed and enabled."]}`,
and after a reload "Page Footer" is empty. Step 8, which changes the
list, shows "Saved". Step 10 is refused the same way with "The
languagetoggleblockplugin block can not be found. Please make sure the
plugin is installed and enabled.". At step 11 the custom block is
listed unticked. Without the fix, step 8's save removed it, because it
changed the list. With the fix, step 7's save removes it.

## Cause

`PKPAppearanceSetupForm::__construct()`
(`lib/pkp/classes/components/forms/context/PKPAppearanceSetupForm.php`)
builds the "Sidebar" field. Its options are
`PluginRegistry::loadCategory('blocks', true)`, the enabled block
plugins only. A custom block is a block plugin that "Custom Block
Manager" registers, so all custom blocks drop out of the options when
that plugin is off.

The field's value, however, is the stored `sidebar` setting as it
stands (line 48, `$currentBlocks = (array) $context->getData('sidebar');`,
passed at line 90). So the field holds a name it offers no box for.
The page shows nothing for it, and the form posts the value back as it
was given.

`PKPContextService::validate()` (lines 371–382) refuses every posted
`sidebar` name that is not an enabled block, with
`manager.setup.layout.sidebar.invalidBlock`. That rule is right: it
stops a client from placing a block that does not exist.

A save gets past the check only when the list was changed. ui-library
`FieldOptions.vue` keeps only the listed options in the value when the
ticked boxes or their order change (the `selectedValue` watcher, and
`updateValueOrder()` behind the arrows). That is why a changed list
saves, and why that save removes the block's place.

The form and the check came together in 5f3be929e6, which moved the
sidebar from plugin hooks to the stored list for 3.2. f1c8bcaa38
(`pkp/pkp-lib#6683`, the options ordered by the stored list) and
6882fa48c8 (`pkp/pkp-lib#10529`, that ordering moved into
`FieldOptions.vue`) changed the options but not the value.

Reach:

- Any block plugin: custom blocks and "Language Toggle Block" walked;
  the other block plugins read in the code.
- An uninstalled block plugin: the same (read in the code; the case
  `pkp/pkp-lib#11859` reports).
- The site's own sidebar, Administration › "Site Settings" ›
  "Appearance" › "Setup": `PKPSiteAppearanceForm` passes
  `(array) $site->getData('sidebar')` the same way, and
  `PKPSiteService::validate()` refuses it the same way (read in the
  code, not driven).
- Reader pages. `PKPTemplateManager::displaySidebar()` prints only the
  enabled blocks, but `PKPTemplateManager` sets `hasSidebar` whenever
  the stored list is non-empty. So while the list holds only
  turned-off blocks, `header.tpl` gives the content area the
  `has_sidebar` class, although `footer.tpl` prints no sidebar. The
  default theme uses that class only for the home page highlights'
  top margin on wide screens; a theme that sizes its columns by it
  would show an empty column. Read in the code, not driven; other
  themes not read.

## Proposed fix

Give the "Sidebar" field only the placed blocks whose plugin is
enabled, in `PKPAppearanceSetupForm` and `PKPSiteAppearanceForm`
([fix.diff](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/setup-save-refused-disabled-block/fix.diff),
paths relative to the app root):

```diff
-        $currentBlocks = (array) $context->getData('sidebar');
-
         $plugins = PluginRegistry::loadCategory('blocks', true);
 
+        // The placed blocks whose plugin is enabled. A disabled or removed
+        // block's name stays stored, but the field offers no option for it,
+        // and posting it back would fail PKPContextService::validate().
+        $currentBlocks = array_values(array_filter(
+            (array) $context->getData('sidebar'),
+            fn ($blockName) => isset($plugins[$blockName])
+        ));
```

and in `PKPSiteAppearanceForm`, the same filter on
`(array) $site->getData('sidebar')`.

The form then posts only what it shows, and the check stays as it is.
`displaySidebar()` already filters the stored list against the same
plugin registry when it prints the sidebar.

The fix keeps one loss: the next save of the tab drops a turned-off
block's place, and the manager ticks the block again once its plugin
is back on. The current code loses no less. The place goes at the
first save that passes, and only a save that changed the list passes.

Keeping the place would need the server to tell a turned-off block
from one that is gone. While "Custom Block Manager" is off its blocks
are not loaded at all, so their names look like those of an
uninstalled plugin, and `pkp/pkp-lib#11859` shows those should not
linger. Keeping the place would also change what a `PUT` of `sidebar`
stores. The filter needs neither.

Tried on `main` on the three apps: with the fix, steps 7 and 10 showed
"Saved" and the footer was kept. A neighbour check placed both blocks
with their plugins on and saved a "Page Footer". Both blocks stayed
ticked and in order, with the fix in and out.

**Alternatives**

- Merge the stored names the form does not offer back into the posted
  list on the server (in `PKPContextController::edit()` before
  `validate()`, or in the service's `edit()`), so the block returns to
  its place. A `PUT` would then store more than it sent, and no client
  could take a turned-off block out of the sidebar. Names of
  uninstalled plugins would stay for good and keep `hasSidebar` on,
  unless each name is looked up first (for custom blocks, in "Custom
  Block Manager"'s `blocks` setting). That is a REST API contract
  change.
- Let the check accept the names of installed block plugins that are
  turned off (`loadCategory('blocks', false)`). Custom blocks are not
  loaded while "Custom Block Manager" is off, so the custom-block case
  would still be refused. `FieldOptions.vue` would still drop the
  names on any list change, so the place would survive only saves that
  leave the list alone.
- Drop unlisted names in `FieldOptions.vue` when it mounts. That
  changes a shared component for every form, in a second repository,
  to cover a value the server form should not hand out.
- Remove a block from every sidebar when its plugin is turned off.
  That misses uninstalled plugins and names stored before the fix, and
  needs a hook into every way a plugin is turned off.

**What goes with it**

- Other places with the same fault: the two forms above are the only
  ones that build the `sidebar` field. The "Theme" field
  (`PKPThemeForm`) has the same shape: enabled themes as options, the
  stored theme as value, refused with `manager.setup.theme.notFound`.
  Whether the active theme can be turned off was not checked, so it is
  left out.
- Stored data: no repair is needed for the save. Names already stored
  stay until the next save of the tab, and keep `hasSidebar` on until
  then (Reach). An upgrade step could clear them at once (not written).
- Backport: on `stable-3_5_0` the diff applies with a one-line offset
  (checked with `git apply --check`). `stable-3_4_0` and
  `stable-3_3_0` carry the backports of `pkp/pkp-lib#10529`
  (bf4ee40bcd, 633c254ba3), so they build the field as `main` does and
  take the same change. 3.3 supports PHP 7.3, so it needs
  `function ($blockName) use ($plugins)` instead of `fn`. Not tried on
  any of the three.
- Guard: an e2e scenario that turns off a placed block's plugin and
  saves "Page Footer" (a **Planned** item in specs U09 and U10).

Small: one filter in each of two form classes, no data repair.

## Evidence

- The kept script walks the Steps:
  [walk.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js),
  with its helpers in `lib.js` beside it;
  [neighbour.js](https://github.com/jardakotesovec/pkp-e2e/blob/main/shared/playwright/checks/issues/setup-save-refused-disabled-block/neighbour.js)
  is the neighbour check, run with the fix in and out. On an install
  freshly loaded from the default dataset, from a pkp-e2e checkout
  (`<feature>` names the set of test installs, `<id>` the output
  folder):
  `PROBE_FEATURE=<feature> PROBE_AGENT=<id> node bin/probe.js all shared/playwright/checks/issues/setup-save-refused-disabled-block/walk.js`,
  with `PKP_E2E_LINE=stable-3_5_0` in front for 3.5. The fix:
  `node bin/try-fix.js apply shared/playwright/checks/issues/setup-save-refused-disabled-block/fix.diff ojs omp ops`.
- The walks ran on PostgreSQL; nothing here depends on the database.
  Datasets: pkp/datasets c657990 (2026-10-01). The script types the
  step 10 footer as " again", added to the empty box.
- Not driven: the site's sidebar; an uninstalled block plugin; block
  plugins other than "Language Toggle Block"; the way round by an arrow
  or by ticking and unticking a box; an empty "Sidebar" list; the
  reader pages with only turned-off blocks stored; the fix on 3.5, 3.4
  and 3.3.
- Code reads. `main` and 3.5: `PKPAppearanceSetupForm::__construct()`,
  `PKPSiteAppearanceForm::__construct()`, the `sidebar` checks in
  `PKPContextService::validate()` and `PKPSiteService::validate()`,
  `PKPTemplateManager` (`hasSidebar`, `displaySidebar()`), lib/pkp
  `templates/frontend/components/header.tpl` and `footer.tpl`, the
  default theme's styles (`has_sidebar` only in
  `styles/components/swiper.less`), `PKPThemeForm` and the
  `themePluginPath` check, and ui-library `FieldOptions.vue` (the
  `selectedValue` watcher, `updateValueOrder()`, `mounted()`).
  `stable-3_4_0` and `stable-3_3_0` (`git show origin/<branch>:` in
  lib/pkp and lib/ui-library): `PKPAppearanceSetupForm` reads
  `$currentBlocks`, builds the options from `loadCategory()` in
  registry order and passes `$currentBlocks` unfiltered as the value.
  `PKPSiteAppearanceForm` passes `(array) $site->getData('sidebar')`.
  Both services carry the same `invalidBlock` check, and
  `FieldOptions.vue` filters the value only in the `selectedValue`
  watcher. `git merge-base --is-ancestor` puts bf4ee40bcd on
  `stable-3_4_0` and 633c254ba3 on `stable-3_3_0`.
- Introduced: `git blame` on the value line gives f1c8bcaa38, which
  only renamed `(array) $context->getData('sidebar')` to
  `$currentBlocks`. The check's lines blame to e3f570bc37, a PSR-12
  reformat. `git log -S` on the check gives 5f3be929e6, which added the
  form with `'value' => (array) $context->getData('sidebar')` and the
  check together (first tagged in `3_2_0-0`).
- Upstream search (pkp/pkp-lib, pkp/ojs, pkp/ui-library): "block can
  not be found", sidebar block disabled plugin, `invalidBlock`, sidebar
  appearance save block plugin enabled, `PKPAppearanceSetupForm`
  sidebar, `FieldOptions` orderable value. Read and not the same fault:
  `pkp/pkp-lib#4318` (closed; turned-off blocks still offered, 3.1),
  `pkp/pkp-lib#6683` and `pkp/pkp-lib#10529` (closed; the order of the
  blocks).
- Tips: OJS `main` 68615b5a32 with lib/pkp 25562b0e1a and ui-library
  64d67363; OMP `main` 3b0ecf794 and OPS `main` c8af945bb7, both with
  lib/pkp 3dc90c81a6 and ui-library 280f98c5. `stable-3_5_0`: OJS
  3517e640f2 with lib/pkp b1981810da; OMP c7b45f88e and OPS 8eaf899468
  with lib/pkp 1fb843f491; ui-library d4e01883. `stable-3_4_0`: OJS
  75cc2d488b, OMP 0aec65441, OPS acd8ae704b, lib/pkp 32b0f4b4af,
  ui-library ee684b34. `stable-3_3_0`: OJS ac77c9fb35, OMP 8e72fc883,
  OPS c5532e2161, lib/pkp f6ab331645, ui-library 96959f9e.
